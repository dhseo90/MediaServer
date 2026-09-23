// 파일 용도: 파생 녹화 작업의 소유 저장소·원본 보호·파일 생성·상태 전이와 복구를 조정한다.
#include "recording/recording_derived_job_service.h"
#include "recording/recording_catalog.h"
#include "recording/recording_derived_remux.h"
#include "recording/recording_journal.h"
#include <array>
#include <atomic>
#include <chrono>
#include <fcntl.h>
#include <map>
#include <mutex>
#include <set>
#include <stdexcept>
#include <sys/stat.h>
#include <unistd.h>
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#endif
namespace recording {
namespace {
using Clock=std::chrono::steady_clock;
void Require(bool value,const std::string& reason){if(!value)throw std::runtime_error(reason);}
struct Fd {
    int value{-1};
    explicit Fd(int fd=-1):value(fd){}
    ~Fd(){if(value>=0)::close(value);}
    Fd(Fd&& other)noexcept:value(other.value){other.value=-1;}
    Fd& operator=(Fd&& other)noexcept{if(value>=0)::close(value);value=other.value;other.value=-1;return *this;}
    Fd(const Fd&)=delete;Fd& operator=(const Fd&)=delete;
};
struct stat Stat(int fd){struct stat value{};Require(fd>=0&&::fstat(fd,&value)==0,"job-stat");return value;}
bool Same(const struct stat& a,const struct stat& b){return a.st_dev==b.st_dev&&a.st_ino==b.st_ino;}
std::int64_t Now(){return std::max<std::int64_t>(1,std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count());}
struct Budget {
    Clock::time_point deadline;
    std::function<bool()> callback;
    std::atomic<bool> stopped{false};
    bool Stop(){if(stopped.load())return true;if(Clock::now()>=deadline||(callback&&callback()))stopped.store(true);return stopped.load();}
    void Check(){Require(!Stop(),"job-cancelled-or-deadline");}
};
std::string Hash(int fd,std::uint64_t size,Budget* budget) {
#if MEDIA_SERVER_USE_OPENSSL
    auto* context=EVP_MD_CTX_new();Require(context,"job-hash-context");
    std::unique_ptr<EVP_MD_CTX,decltype(&EVP_MD_CTX_free)> guard(context,EVP_MD_CTX_free);
    Require(EVP_DigestInit_ex(context,EVP_sha256(),nullptr)==1,"job-hash-init");
    std::array<unsigned char,65536> buffer{};
    for(std::uint64_t offset=0;offset<size;){
        if(budget)budget->Check();
        auto count=::pread(fd,buffer.data(),std::min<std::uint64_t>(buffer.size(),size-offset),offset);
        if(count<0&&errno==EINTR)continue;
        Require(count>0,"job-hash-read");Require(EVP_DigestUpdate(context,buffer.data(),count)==1,"job-hash-update");offset+=count;
    }
    std::array<unsigned char,32> digest{};unsigned int count=0;
    Require(EVP_DigestFinal_ex(context,digest.data(),&count)==1&&count==32,"job-hash-final");
    const char* hex="0123456789abcdef";std::string result;
    for(auto byte:digest){result+=hex[byte>>4];result+=hex[byte&15];}return result;
#else
    (void)fd;(void)size;(void)budget;throw std::runtime_error("job-crypto-unavailable");
#endif
}
std::filesystem::path RootPath(std::filesystem::path path){
    path=std::filesystem::absolute(path).lexically_normal();
#ifdef __APPLE__
    const auto raw=path.generic_string();
    if(raw=="/tmp"||raw.rfind("/tmp/",0)==0)path="/private"+raw;
    else if(raw=="/var"||raw.rfind("/var/",0)==0)path="/private"+raw;
#endif
    return path;
}
Fd Walk(int root,const std::filesystem::path& relative,bool create=false){
    Fd current(::dup(root));Require(current.value>=0,"job-directory-dup");
    for(const auto& component:relative){
        const auto name=component.string();Require(!name.empty()&&name!="."&&name!=".."&&name!="/","job-directory-component");
        if(create&&::mkdirat(current.value,name.c_str(),0700)<0)Require(errno==EEXIST,"job-directory-create");
        Fd next(::openat(current.value,name.c_str(),O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC));
        Require(next.value>=0,"job-directory-open");
        if(create)Require(::fsync(current.value)==0,"job-directory-parent-sync");
        current=std::move(next);
    }
    return current;
}
Fd OpenRoot(const std::filesystem::path& path){
    Fd slash(::open("/",O_RDONLY|O_DIRECTORY|O_CLOEXEC));Require(slash.value>=0,"job-root-open");
    return Walk(slash.value,path.relative_path());
}
}
struct DerivedJobService::Impl {
    RecordingCatalog& catalog;RecordingJournal& journal;Options options;const void* owner;
    Fd root;struct stat root_identity{};std::mutex mutex;
    std::map<std::string,struct stat> live_directories;
    bool live_unreceipted_file{false};
    Impl(RecordingCatalog& c,RecordingJournal& j,Options o,const void* token)
        :catalog(c),journal(j),options(std::move(o)),owner(token){
        Require(options.max_work_ms>0&&options.max_work_ms<=30000,"job-work-budget");
        options.root=RootPath(options.root);root=OpenRoot(options.root);root_identity=Stat(root.value);
    }
    void Progress(DerivedJobProgress progress,std::size_t index=0){if(options.progress)options.progress(progress,index);}
    void RootCheck(){auto current=OpenRoot(options.root);Require(Same(Stat(current.value),root_identity),"job-root-replaced");}
    void Save(DerivedJobRecordV1& record){std::string error;Require(catalog.UpdateDerivedJob(owner,record,&error),"job-journal: "+error);}
    std::optional<DerivedJobRecordV1> Find(const std::string& id){
        std::optional<DerivedJobRecordV1> record;std::string error;
        Require(catalog.FindDerivedJob(id,&record,&error),"job-find: "+error);return record;
    }
    Fd CheckedDirectory(const DerivedJobRecordV1& record,const std::filesystem::path& path,bool allow_missing){
        RootCheck();const auto& proofs=record.files.front().directories;
        Fd current(::dup(root.value));Require(current.value>=0,"job-directory-dup");
        std::filesystem::path prefix;
        for(const auto& component:path){
            prefix/=component;const auto raw=prefix.generic_string();
            Fd next(::openat(current.value,component.c_str(),O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC));
            if(next.value<0){
                const bool private_parent=raw==".derived-jobs/"+record.intent.job_id||raw==".derived-jobs/"+record.intent.job_id+"/"+record.intent.attempt_id;
                if(allow_missing&&private_parent&&errno==ENOENT)return Fd{};
                throw std::runtime_error("job-parent-open");
            }
            const auto found=std::find_if(proofs.begin(),proofs.end(),[&](const auto& proof){return proof.relative_path==raw;});
            const auto s=Stat(next.value);
            Require(found!=proofs.end()&&static_cast<std::uint64_t>(s.st_dev)==found->device&&static_cast<std::uint64_t>(s.st_ino)==found->inode,"job-parent-replaced");
            current=std::move(next);
        }
        return current;
    }
    void Directories(const DerivedJobRecordV1& record,bool allow_missing){
        RootCheck();
        for(const auto& identity:record.files.front().directories){
            auto dir=CheckedDirectory(record,identity.relative_path,allow_missing);if(dir.value<0)continue;
            const auto s=Stat(dir.value);
            Require(static_cast<std::uint64_t>(s.st_dev)==identity.device&&static_cast<std::uint64_t>(s.st_ino)==identity.inode,"job-parent-replaced");
        }
    }
    bool Exists(const std::string& path){
        RootCheck();const auto p=std::filesystem::path(path);Fd parent;
        try{parent=Walk(root.value,p.parent_path());}catch(...){
            // 부모 확인 실패를 파일 부재로 낮추지 않는다.
            throw;
        }
        struct stat s{};if(::fstatat(parent.value,p.filename().c_str(),&s,AT_SYMLINK_NOFOLLOW)==0)return true;
        Require(errno==ENOENT,"job-path-stat");return false;
    }
    Fd Owned(const DerivedJobRecordV1& record,std::size_t index,bool final,bool verified,Budget* budget){
        const auto& receipt=record.files.at(index);
        const bool cleanup=record.state==DerivedJobState::Committed||record.state==DerivedJobState::Intent;
        Directories(record,cleanup);
        const auto path=std::filesystem::path(final?record.intent.outputs[index].final_relpath:record.intent.outputs[index].temporary_relpath);
        auto parent=CheckedDirectory(record,path.parent_path(),cleanup&&!final);if(parent.value<0)return Fd{};
        Fd fd(::openat(parent.value,path.filename().c_str(),O_RDONLY|O_NONBLOCK|O_NOFOLLOW|O_CLOEXEC));
        if(fd.value<0){Require(errno==ENOENT,"job-owned-open");return fd;}
        const auto before=Stat(fd.value);
        Require(S_ISREG(before.st_mode)&&static_cast<std::uint64_t>(before.st_dev)==receipt.device&&static_cast<std::uint64_t>(before.st_ino)==receipt.inode&&before.st_size>=0&&static_cast<std::uint64_t>(before.st_size)<=record.intent.reserved_bytes,"job-file-ownership");
        if(verified){
            const auto& p=record.ready->outputs[index].provenance;
            Require(static_cast<std::uint64_t>(before.st_size)==p.size_bytes&&Hash(fd.value,p.size_bytes,budget)==p.checksum_sha256,"job-file-integrity");
        }
        const auto after=Stat(fd.value);struct stat named{};
        Require(Same(before,after)&&before.st_size==after.st_size&&before.st_nlink==after.st_nlink&&::fstatat(parent.value,path.filename().c_str(),&named,AT_SYMLINK_NOFOLLOW)==0&&Same(after,named),"job-file-changed");
        return fd;
    }
    Fd MutationParent(const DerivedJobRecordV1& record,const std::filesystem::path& path,int fd){
        Directories(record,record.state==DerivedJobState::Committed||record.state==DerivedJobState::Intent);
        auto parent=CheckedDirectory(record,path.parent_path(),false);struct stat named{};
        Require(::fstatat(parent.value,path.filename().c_str(),&named,AT_SYMLINK_NOFOLLOW)==0&&S_ISREG(named.st_mode)&&Same(named,Stat(fd)),"job-mutation-path-changed");
        return parent;
    }
    DerivedJobFileV1 Receipt(const DerivedJobRecordV1& record,std::size_t index,int fd){
        DerivedJobFileV1 receipt;receipt.output_index=index;const auto s=Stat(fd);
        Require(S_ISREG(s.st_mode)&&s.st_size==0&&s.st_nlink==1,"job-new-file-shape");
        receipt.device=s.st_dev;receipt.inode=s.st_ino;receipt.initial_sha256=Hash(fd,0,nullptr);
        std::set<std::string> paths{""};
        for(const auto& raw:{record.intent.outputs[index].temporary_relpath,record.intent.outputs[index].final_relpath}){
            auto p=std::filesystem::path(raw).parent_path();while(!p.empty()){paths.insert(p.generic_string());p=p.parent_path();}
        }
        for(const auto& path:paths){auto dir=Walk(root.value,path);const auto identity=Stat(dir.value);receipt.directories.push_back({path,static_cast<std::uint64_t>(identity.st_dev),static_cast<std::uint64_t>(identity.st_ino)});}
        return receipt;
    }
    void RemoveDirectories(const DerivedJobRecordV1& record){
        if(record.files.empty())return;
        const auto attempt=std::filesystem::path(record.intent.outputs.front().temporary_relpath).parent_path();
        std::size_t index=0;
        for(auto path:{attempt,attempt.parent_path()}){
            RootCheck();auto parent=CheckedDirectory(record,path.parent_path(),true);if(parent.value<0){++index;continue;}struct stat named{};
            if(::fstatat(parent.value,path.filename().c_str(),&named,AT_SYMLINK_NOFOLLOW)<0){Require(errno==ENOENT,"job-cleanup-directory-stat");continue;}
            const auto& proof=record.files.front().directories;
            const auto found=std::find_if(proof.begin(),proof.end(),[&](const auto& d){return d.relative_path==path.generic_string();});
            Require(found!=proof.end()&&S_ISDIR(named.st_mode)&&static_cast<std::uint64_t>(named.st_dev)==found->device&&static_cast<std::uint64_t>(named.st_ino)==found->inode,"job-cleanup-directory-owner");
            Require(::unlinkat(parent.value,path.filename().c_str(),AT_REMOVEDIR)==0&&::fsync(parent.value)==0,"job-cleanup-directory");
            Progress(DerivedJobProgress::DirectoryRemoved,index++);
        }
    }
    void FailIntent(DerivedJobRecordV1& record,const std::string& reason){
        RootCheck();
        if(record.files.empty()){
            // 살아 있는 이번 실행에서만 확보한 생성 inode다. 재시작에는 이 정보가 없으므로 F04는 계속 blocker다.
            if(!live_unreceipted_file)for(auto it=live_directories.rbegin();it!=live_directories.rend();++it){
                const auto path=std::filesystem::path(it->first);RootCheck();auto parent=Walk(root.value,path.parent_path());struct stat named{};
                Require(::fstatat(parent.value,path.filename().c_str(),&named,AT_SYMLINK_NOFOLLOW)==0&&S_ISDIR(named.st_mode)&&Same(named,it->second),"job-live-directory-owner");
                Require(::unlinkat(parent.value,path.filename().c_str(),AT_REMOVEDIR)==0&&::fsync(parent.value)==0,"job-live-directory-cleanup");
            }
            live_directories.clear();
            struct stat s{};
            if(::fstatat(root.value,".derived-jobs",&s,AT_SYMLINK_NOFOLLOW)==0){
                auto shared=Walk(root.value,".derived-jobs");
                Require(::fstatat(shared.value,record.intent.job_id.c_str(),&s,AT_SYMLINK_NOFOLLOW)<0&&errno==ENOENT,"job-unreceipted-ownership-unknown");
            }else Require(errno==ENOENT,"job-private-root-stat");
        }else{
            // receipt 없는 뒤쪽 파일/경로는 이름만으로 삭제할 수 없다.
            for(std::size_t i=record.files.size();i<record.intent.outputs.size();++i){
                const auto path=std::filesystem::path(record.intent.outputs[i].temporary_relpath);
                auto parent=CheckedDirectory(record,path.parent_path(),true);struct stat named{};
                Require((parent.value<0||(::fstatat(parent.value,path.filename().c_str(),&named,AT_SYMLINK_NOFOLLOW)<0&&errno==ENOENT))&&!Exists(record.intent.outputs[i].final_relpath),"job-unreceipted-ownership-unknown");
            }
            for(std::size_t i=0;i<record.files.size();++i){
                Require(!Exists(record.intent.outputs[i].final_relpath),"job-intent-final-unknown");
                auto fd=Owned(record,i,false,false,nullptr);if(fd.value<0)continue;
                Require(Stat(fd.value).st_nlink==1,"job-partial-hardlink");
                const auto path=std::filesystem::path(record.intent.outputs[i].temporary_relpath);auto parent=MutationParent(record,path,fd.value);
                Require(::unlinkat(parent.value,path.filename().c_str(),0)==0&&::fsync(parent.value)==0,"job-partial-cleanup");
            }
            RemoveDirectories(record);
        }
        Progress(DerivedJobProgress::BeforeTerminal);
        record.state=DerivedJobState::Failed;record.failure_reason=reason.substr(0,1024);record.cleaned_at_ms=Now();Save(record);
    }
    void Render(DerivedJobRecordV1& record,Budget& budget){
        std::string error;Require(catalog.ValidateManagedWriterBinding(journal,options.root,record.intent.sources.front().segment.store_id,&error),"job-store-binding: "+error);
        RecordingReadService read(catalog);std::vector<std::unique_ptr<ResolvedRecordingMedia>> inputs;std::vector<Fd> outputs;
        DerivedRemuxRequest request;Require(RestoreDerivedJobSelection(record.intent,&request.selection,&error),error);
        request.output_container=record.intent.profile.find("-to-mpegts-")!=std::string::npos?"mpegts":"mp4";
        for(const auto& source:record.intent.sources){budget.Check();auto media=read.ResolveMedia(source.segment.channel_id,source.segment.segment_id);Require(media!=nullptr,"job-source-unavailable");inputs.push_back(std::move(media));}
        budget.Check();RootCheck();Progress(DerivedJobProgress::BeforeCreate);budget.Check();
        auto shared=Walk(root.value,".derived-jobs",true);
        Require(::mkdirat(shared.value,record.intent.job_id.c_str(),0700)==0,"job-private-directory-exists");
        Require(::fsync(shared.value)==0,"job-private-parent-sync");
        auto jobdir=Walk(shared.value,record.intent.job_id);
        live_directories.emplace(".derived-jobs/"+record.intent.job_id,Stat(jobdir.value));
        Require(::mkdirat(jobdir.value,record.intent.attempt_id.c_str(),0700)==0&&::fsync(jobdir.value)==0,"job-attempt-create");
        auto attempt=Walk(jobdir.value,record.intent.attempt_id);
        live_directories.emplace(".derived-jobs/"+record.intent.job_id+"/"+record.intent.attempt_id,Stat(attempt.value));
        for(std::size_t i=0;i<record.intent.outputs.size();++i){
            budget.Check();RootCheck();const auto path=std::filesystem::path(record.intent.outputs[i].temporary_relpath);
            auto parent=Walk(root.value,path.parent_path());
            Require(!Exists(record.intent.outputs[i].final_relpath),"job-final-already-exists");
            Fd fd(::openat(parent.value,path.filename().c_str(),O_CREAT|O_EXCL|O_RDWR|O_NOFOLLOW|O_CLOEXEC,0600));
            Require(fd.value>=0&&::fsync(parent.value)==0,"job-output-create");
            live_unreceipted_file=true;
            Progress(DerivedJobProgress::CreatedBeforeReceipt,i);
            record.files.push_back(Receipt(record,i,fd.value));Save(record);
            live_unreceipted_file=false;
            Progress(DerivedJobProgress::ReceiptDurable,i);
            outputs.push_back(std::move(fd));
        }
        for(std::size_t i=0;i<inputs.size();++i)request.sources.push_back({record.intent.sources[i].segment,record.intent.sources[i].binding,inputs[i]->fd(),outputs[i].value});
        budget.Check();request.max_output_bytes=record.intent.reserved_bytes;
        request.max_work_ms=std::max<std::int64_t>(1,std::chrono::duration_cast<std::chrono::milliseconds>(budget.deadline-Clock::now()).count());
        request.cancelled=[&]{return budget.Stop();};
        auto remux=DeriveRecordingH264Remux(request);Require(remux.verified_output,"job-remux: "+remux.error);
        std::vector<std::int64_t> orders;
        for(std::size_t i=0;i<outputs.size();++i){
            budget.Check();Require(::fsync(outputs[i].value)==0,"job-output-sync");
            auto fd=Owned(record,i,false,false,&budget);Require(fd.value>=0&&Stat(fd.value).st_nlink==1,"job-output-link-count");
            const auto& p=remux.outputs[i];Require(static_cast<std::uint64_t>(Stat(fd.value).st_size)==p.size_bytes&&Hash(fd.value,p.size_bytes,&budget)==p.checksum_sha256,"job-output-post-remux-integrity");
            RecordingOrderReservationV1 order;const auto& source=record.intent.sources[i].segment;const auto& plan=record.intent.outputs[i];
            Require(journal.ReserveRecordingOrder(source.store_id,plan.order_request_id,plan.output_id,source.channel_id,&order,&error),"job-output-order: "+error);orders.push_back(order.sequence);
        }
        DerivedJobRecordV1 ready;Require(BuildDerivedJobReady(record,remux,orders,Now(),&ready,&error),"job-ready: "+error);
        Save(ready);record=std::move(ready);Progress(DerivedJobProgress::ReadyDurable);
    }
    void Finish(DerivedJobRecordV1& record,Budget& budget){
        if(record.state==DerivedJobState::Ready){
            for(std::size_t i=0;i<record.files.size();++i){
                budget.Check();auto temporary=Owned(record,i,false,true,&budget);auto final=Owned(record,i,true,true,&budget);
                Require(temporary.value>=0||final.value>=0,"job-ready-file-missing");
                const auto tp=std::filesystem::path(record.intent.outputs[i].temporary_relpath),fp=std::filesystem::path(record.intent.outputs[i].final_relpath);
                auto td=CheckedDirectory(record,tp.parent_path(),false),fd=CheckedDirectory(record,fp.parent_path(),false);
                if(final.value<0){
                    Require(Stat(temporary.value).st_nlink==1,"job-ready-extra-hardlink");
                    td=MutationParent(record,tp,temporary.value);fd=CheckedDirectory(record,fp.parent_path(),false);
                    Require(::linkat(td.value,tp.filename().c_str(),fd.value,fp.filename().c_str(),0)==0,"job-publish-no-replace");
                    final=Owned(record,i,true,true,&budget);Progress(DerivedJobProgress::PublishedLink,i);
                }
                if(temporary.value>=0)Require(Same(Stat(temporary.value),Stat(final.value))&&Stat(final.value).st_nlink==2,"job-publish-pair");
                else Require(Stat(final.value).st_nlink==1,"job-publish-final-links");
                Require(::fsync(td.value)==0&&::fsync(fd.value)==0,"job-publish-parent-sync");Progress(DerivedJobProgress::PublishedDurable,i);
            }
            budget.Check();auto committed=record;committed.state=DerivedJobState::Committed;Save(committed);record=std::move(committed);Progress(DerivedJobProgress::CommittedDurable);
        }
        for(std::size_t i=0;i<record.files.size();++i){
            budget.Check();auto temporary=Owned(record,i,false,true,&budget);auto final=Owned(record,i,true,true,&budget);
            Require(final.value>=0,"job-committed-final-missing");
            if(temporary.value>=0){
                Require(Same(Stat(temporary.value),Stat(final.value))&&Stat(final.value).st_nlink==2,"job-cleanup-pair");
                const auto path=std::filesystem::path(record.intent.outputs[i].temporary_relpath);auto parent=MutationParent(record,path,temporary.value);
                Require(::unlinkat(parent.value,path.filename().c_str(),0)==0&&::fsync(parent.value)==0,"job-temporary-cleanup");
            }
            Require(Stat(final.value).st_nlink==1,"job-final-extra-hardlink");Progress(DerivedJobProgress::TemporaryRemoved,i);
        }
        RemoveDirectories(record);Progress(DerivedJobProgress::BeforeTerminal);record.state=DerivedJobState::Complete;record.cleaned_at_ms=Now();Save(record);Progress(DerivedJobProgress::CompleteDurable);
    }
    DerivedJobRunResult Execute(const std::string& id,bool recovering,Budget& budget){
        std::optional<DerivedJobRecordV1> record;
        live_directories.clear();live_unreceipted_file=false;
        bool binding_valid=false;
        try{
            record=Find(id);Require(record.has_value(),"job-not-found");
            std::string binding_error;
            Require(catalog.ValidateManagedWriterBinding(journal,options.root,record->intent.sources.front().segment.store_id,&binding_error),"job-store-binding: "+binding_error);
            binding_valid=true;
            if(!DerivedJobActive(*record))return {record->state==DerivedJobState::Complete,false,record->failure_reason,record};
            if(record->state==DerivedJobState::Intent){
                if(recovering||!record->files.empty())FailIntent(*record,"interrupted-intent-no-retry");
                else Render(*record,budget);
            }
            if(record->state==DerivedJobState::Ready||record->state==DerivedJobState::Committed)Finish(*record,budget);
            return {record->state==DerivedJobState::Complete,false,record->failure_reason,record};
        }catch(const std::exception& e){
            const std::string reason=e.what();
            try{
                record=Find(id);
                if(binding_valid&&record&&record->state==DerivedJobState::Intent){FailIntent(*record,reason);return {false,false,reason,record};}
            }catch(const std::exception& cleanup){return {false,true,reason+"; cleanup: "+cleanup.what(),record};}
            return {false,true,reason,record};
        }
    }
};
DerivedJobService::DerivedJobService(RecordingCatalog& c,RecordingJournal& j,Options options){
    Require(c.BindDerivedService(this),"job-service-owner-conflict");
    try{impl_=std::make_unique<Impl>(c,j,std::move(options),this);}catch(...){c.UnbindDerivedService(this);throw;}
}
DerivedJobService::~DerivedJobService(){if(impl_)impl_->catalog.UnbindDerivedService(this);}
DerivedJobRunResult DerivedJobService::Run(const std::string& id,std::function<bool()> cancelled) {
    std::unique_lock<std::mutex> lock(impl_->mutex,std::try_to_lock);
    if(!lock.owns_lock())return {false,true,"job-service-busy",std::nullopt};
    Budget budget{Clock::now()+std::chrono::milliseconds(impl_->options.max_work_ms),std::move(cancelled)};
    return impl_->Execute(id,false,budget);
}
std::vector<DerivedJobRunResult> DerivedJobService::Reconcile(std::function<bool()> cancelled) {
    std::unique_lock<std::mutex> lock(impl_->mutex,std::try_to_lock);
    if(!lock.owns_lock())return {{false,true,"job-service-busy",std::nullopt}};
    Budget budget{Clock::now()+std::chrono::milliseconds(impl_->options.max_work_ms),std::move(cancelled)};
    std::vector<DerivedJobRecordV1> jobs;std::string error;bool more=false;
    if(!impl_->catalog.SnapshotActiveDerivedJobs(8,&jobs,&more,&error))return {{false,true,error,std::nullopt}};
    std::vector<DerivedJobRunResult> results;
    for(const auto& job:jobs){
        if(!DerivedJobActive(job))continue;
        if(budget.Stop()){results.push_back({false,true,"job-reconcile-budget",job});break;}
        results.push_back(impl_->Execute(job.intent.job_id,true,budget));
    }
    if(more)results.push_back({false,true,"job-reconcile-snapshot-cap",std::nullopt});
    return results;
}
}
