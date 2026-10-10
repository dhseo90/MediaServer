// 파일 용도: owner/nofollow/용량/원자성 경계 안에서 검토 결과를 보존한다.
#include "recording/va_review_store.h"
#include "recording/va_review_confirmed_record.h"
#include "domain/strict_json.h"
#include <algorithm>
#include <cerrno>
#include <dirent.h>
#include <fcntl.h>
#include <sys/file.h>
#include <sys/stat.h>
#include <sys/statvfs.h>
#include <unistd.h>
#include <limits>

namespace recording {
namespace {
constexpr const char* magic="MSVAR01\n";
constexpr const char* magic2="MSVAR02\n";
constexpr const char* magic3="MSVAR03\n";
constexpr const char* pending=".pending-review-v1";
struct Fd {int n{-1};~Fd(){if(n>=0)::close(n);}};
bool Fail(std::string* e,const char* s){if(e)*e=s;return false;}
std::size_t Charge(std::size_t bytes,std::size_t factor,std::size_t fixed=0) {
    if(bytes>(std::numeric_limits<std::size_t>::max()-fixed)/factor)throw RecordingResourceUnavailable();
    return fixed+factor*bytes;
}
std::size_t ParseWorkspace(const std::string& bytes) try {
    // v3 -> v2 -> evidence -> snapshot -> referenced observation, plus v1 input/
    // output or v2 evaluator replay. Fourteen owning raw/serialization layers;
    // record validators retain a second typed replay while comparing decisions.
    const auto element=std::max({sizeof(ReferencedObservationV1),sizeof(ReviewClaimSpec),
        sizeof(VaReviewClaim),sizeof(EvidenceFrameV1),sizeof(EvidenceObservationSnapshotV2)});
    const auto one=ingress::StrictJsonWorkspaceBytes(std::string_view(bytes).substr(8),14,element,true);
    if(one>std::numeric_limits<std::size_t>::max()/2)throw RecordingResourceUnavailable();
    return one*2;
} catch(const std::overflow_error&) {throw RecordingResourceUnavailable();}
struct OwnedCost {
    std::size_t bytes;
    void Add(std::size_t amount){if(amount>std::numeric_limits<std::size_t>::max()-bytes)throw RecordingResourceUnavailable();bytes+=amount;}
    void String(const std::string& value){Add(Charge(value.capacity(),1,65));}
    template<class T> void Vector(const std::vector<T>& value){Add(Charge(value.capacity(),sizeof(T),64));}
};
void BindRecord(VaReviewRecord& value,SearchModelResidency::Reservation& work) {
    OwnedCost own{sizeof(VaReviewRecord)-sizeof(VaReviewInput)};
    for(const auto* text:{&value.revision_id,&value.provider,&value.model,&value.model_revision,&value.prompt_sha256,&value.adapter_version})own.String(*text);
    for(const auto* claims:{&value.output.supports,&value.output.questions,&value.output.contradictions,&value.output.unclear}){
        own.Vector(*claims);for(const auto& claim:*claims){own.String(claim.text);own.Vector(claim.frame_indices);}}
    value.memory=work.Split(own.bytes);
    auto& input=value.input;OwnedCost input_cost{sizeof(VaReviewInput)-sizeof(EvidencePackageV1)};
    for(const auto* text:{&input.package_id,&input.manifest_sha256,&input.question})input_cost.String(*text);
    input_cost.Vector(input.asset_indices);input_cost.Vector(input.pngs);
    for(const auto& png:input.pngs)input_cost.Vector(png);
    input.memory=work.Split(input_cost.bytes);
    BindEvidencePackageMemory(input.manifest,work,0);
}
void BindRecord(VaReviewRecordV2& value,SearchModelResidency::Reservation& work) {
    OwnedCost own{sizeof(VaReviewRecordV2)-sizeof(EvidencePackageV1)};
    auto& binding=value.binding;
    for(const auto* text:{&binding.target_id,&binding.package_id,&binding.manifest_sha256,&binding.analysis_namespace,&binding.analysis_track_id,
                         &value.spec_sha256,&value.observation_sha256,&value.policy_sha256})own.String(*text);
    own.Vector(binding.engine_episodes);own.Vector(value.claims);own.Vector(value.decisions);
    for(const auto& claim:value.claims){
        for(const auto* text:{&claim.id,&claim.target_id,&claim.target_description,&claim.comparison_target_id,&claim.coordinates})own.String(*text);
        own.Vector(claim.scope);
    }
    for(const auto& decision:value.decisions){
        own.String(decision.claim_id);own.Vector(decision.evidence_frames);own.Vector(decision.gaps);
        for(const auto& gap:decision.gaps){own.String(gap.target_id);own.Vector(gap.frames);}
    }
    value.memory=work.Split(own.bytes);
    BindEvidencePackageMemory(value.evidence,work,0);
}
void BindRecord(VaReviewRecordV3& value,SearchModelResidency::Reservation& work) {
    OwnedCost own{sizeof(VaReviewRecordV3)-sizeof(VaReviewRecordV2)};
    for(const auto* text:{&value.confirmation.principal,&value.confirmation.question,&value.confirmation.revision,&value.confirmation.spec_sha256,&value.confirmation_sha256})own.String(*text);
    value.memory=work.Split(own.bytes);BindRecord(value.analysis,work);
}
bool SameRead(const struct stat& before,const struct stat& after){
    if(before.st_dev!=after.st_dev||before.st_ino!=after.st_ino||before.st_size!=after.st_size||before.st_nlink!=after.st_nlink)return false;
#ifdef __APPLE__
    return before.st_mtimespec.tv_sec==after.st_mtimespec.tv_sec&&before.st_mtimespec.tv_nsec==after.st_mtimespec.tv_nsec&&
        before.st_ctimespec.tv_sec==after.st_ctimespec.tv_sec&&before.st_ctimespec.tv_nsec==after.st_ctimespec.tv_nsec;
#else
    return before.st_mtim.tv_sec==after.st_mtim.tv_sec&&before.st_mtim.tv_nsec==after.st_mtim.tv_nsec&&
        before.st_ctim.tv_sec==after.st_ctim.tv_sec&&before.st_ctim.tv_nsec==after.st_ctim.tv_nsec;
#endif
}
bool Safe(int fd,struct stat* result,bool one_link=true) {
    struct stat st{};
    if(fd<0||::fstat(fd,&st)||!S_ISREG(st.st_mode)||st.st_uid!=::geteuid()||(st.st_mode&0077)||
       st.st_size<0||(one_link&&st.st_nlink!=1))return false;
    if(result)*result=st;return true;
}
int Directory(std::filesystem::path path,bool create) {
    if(path.empty())return -1;
    for(const auto& p:path)if(p==".."||p.string().find('\0')!=std::string::npos)return -1;
    std::error_code ec;path=std::filesystem::absolute(path,ec).lexically_normal();if(ec)return -1;
#ifdef __APPLE__
    const auto text=path.string();
    if(text=="/tmp"||text.rfind("/tmp/",0)==0||text=="/var"||text.rfind("/var/",0)==0)path="/private"+text;
#endif
    Fd fd{::open("/",O_RDONLY|O_DIRECTORY|O_CLOEXEC)};if(fd.n<0)return -1;
    const auto relative=path.relative_path();
    for(auto it=relative.begin();it!=relative.end();++it) {
        if(*it=="."||it->empty())continue;auto last=it;++last;
        int next=::openat(fd.n,it->c_str(),O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
        if(next<0&&errno==ENOENT&&create&&last==relative.end()) {
            if(::mkdirat(fd.n,it->c_str(),0700)&&errno!=EEXIST)return -1;
            if(::fsync(fd.n))return -1;
            next=::openat(fd.n,it->c_str(),O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
        }
        if(next<0)return -1;::close(fd.n);fd.n=next;
    }
    struct stat st{};if(::fstat(fd.n,&st)||st.st_uid!=::geteuid()||(st.st_mode&0077))return -1;
    int result=fd.n;fd.n=-1;return result;
}
bool Contents(int fd,std::size_t cap,std::string* output,const std::shared_ptr<SearchModelResidency>& memory,
    SearchModelResidency::Reservation* ownership,bool one_link=true) {
    struct stat st{};if(!Safe(fd,&st,one_link)||std::uint64_t(st.st_size)>cap)return false;
    if(!memory)throw RecordingResourceUnavailable();
    auto charge=memory->ReserveOwned(Charge(static_cast<std::size_t>(st.st_size),2,512));
    if(!charge)throw RecordingResourceUnavailable();
    std::string bytes(std::size_t(st.st_size),'\0');std::size_t done=0;
    while(done<bytes.size()) {
        const auto n=::pread(fd,bytes.data()+done,bytes.size()-done,static_cast<off_t>(done));
        if(n<0&&errno==EINTR)continue;if(n<=0)return false;done+=std::size_t(n);
    }
    struct stat after{};if(!Safe(fd,&after,one_link)||!SameRead(st,after))return false;
    *ownership=std::move(*charge);*output=std::move(bytes);return true;
}
bool Inventory(int dir,const VaReviewStore::Limits& limits,std::vector<std::string>* out,std::uint64_t* bytes) {
    if(limits.record_bytes>SIZE_MAX-8)return false;
    Fd copy{::openat(dir,".",O_RDONLY|O_DIRECTORY|O_CLOEXEC)};if(copy.n<0)return false;
    DIR* entries=::fdopendir(copy.n);if(!entries)return false;copy.n=-1;
    bool ok=true;std::vector<std::string> ids;std::uint64_t total=0;errno=0;
    while(const auto* e=::readdir(entries)) {
        const std::string name=e->d_name;
        if(name=="."||name==".."||name==pending||name==".writer-lock-v1")continue;
        struct stat st{};
        if(name.size()!=74||name.substr(67)!=".review"||!VaReviewStore::ValidId(name.substr(0,67))||
           ::fstatat(dir,name.c_str(),&st,AT_SYMLINK_NOFOLLOW)||!S_ISREG(st.st_mode)||st.st_uid!=::geteuid()||
           (st.st_mode&0077)||st.st_nlink!=1||st.st_size<8||std::uint64_t(st.st_size)>limits.record_bytes+8||
           ids.size()>=limits.records||std::uint64_t(st.st_size)>limits.bytes-total){ok=false;break;}
        total+=std::uint64_t(st.st_size);ids.push_back(name.substr(0,67));errno=0;
    }
    if(errno)ok=false;::closedir(entries);if(!ok)return false;
    std::sort(ids.begin(),ids.end());*out=std::move(ids);*bytes=total;return true;
}
bool RecoverPending(int dir,const VaReviewStore::Limits& limits,const std::shared_ptr<SearchModelResidency>& memory,std::string* error) {
    Fd fd{::openat(dir,pending,O_RDONLY|O_NONBLOCK|O_NOFOLLOW|O_CLOEXEC)};
    if(fd.n<0)return errno==ENOENT?true:Fail(error,"review-pending-invalid");
    SearchModelResidency::Reservation work;struct stat st{};std::string bytes;
    if(limits.record_bytes>SIZE_MAX-8)throw RecordingResourceUnavailable();
    if(!Safe(fd.n,&st,false)||(st.st_nlink!=1&&st.st_nlink!=2)||!Contents(fd.n,limits.record_bytes+8,&bytes,memory,&work,false)||
       (bytes.substr(0,std::min<std::size_t>(8,bytes.size()))!=std::string(magic).substr(0,std::min<std::size_t>(8,bytes.size()))&&
        bytes.substr(0,std::min<std::size_t>(8,bytes.size()))!=std::string(magic2).substr(0,std::min<std::size_t>(8,bytes.size()))&&
        bytes.substr(0,std::min<std::size_t>(8,bytes.size()))!=std::string(magic3).substr(0,std::min<std::size_t>(8,bytes.size()))))
        return Fail(error,"review-pending-invalid");
    if(st.st_nlink==2) {
        const auto name="vr-"+EvidenceSha256(bytes.data(),bytes.size())+".review";struct stat target{};
        if(::fstatat(dir,name.c_str(),&target,AT_SYMLINK_NOFOLLOW)||!S_ISREG(target.st_mode)||
           target.st_dev!=st.st_dev||target.st_ino!=st.st_ino)return Fail(error,"review-pending-invalid");
    }
    if(::unlinkat(dir,pending,0)||::fsync(dir))return Fail(error,"review-cleanup-failed");return true;
}
int Lock(int dir) {
    const int fd=::openat(dir,".writer-lock-v1",O_RDWR|O_CREAT|O_NOFOLLOW|O_NONBLOCK|O_CLOEXEC,0600);
    if(!Safe(fd,nullptr)||::flock(fd,LOCK_EX|LOCK_NB)){if(fd>=0)::close(fd);return -1;}return fd;
}
// mode=0은 복구/목록의 모든 지원 버전 검증, 1/2/3은 해당 typed reader만 허용한다.
bool ReadAt(int dir,const std::string& id,const VaReviewStore::Limits& limits,int mode,
    VaReviewRecord* out,VaReviewRecordV2* out2,VaReviewRecordV3* out3,int* version,
    const std::shared_ptr<SearchModelResidency>& memory,std::string* error) {
    SearchModelResidency::Reservation raw_work;
    Fd fd{::openat(dir,(id+".review").c_str(),O_RDONLY|O_NONBLOCK|O_NOFOLLOW|O_CLOEXEC)};std::string bytes;
    if(limits.record_bytes>SIZE_MAX-8)throw RecordingResourceUnavailable();
    if(!Contents(fd.n,limits.record_bytes+8,&bytes,memory,&raw_work)||bytes.size()<8||
       "vr-"+EvidenceSha256(bytes.data(),bytes.size())!=id)return Fail(error,"review-record-unavailable");
    const int found=bytes.substr(0,8)==magic?1:bytes.substr(0,8)==magic2?2:bytes.substr(0,8)==magic3?3:0;
    if(!found||(mode&&mode!=found))return Fail(error,"review-record-unavailable");
    auto work=memory->ReserveOwned(ParseWorkspace(bytes));if(!work)throw RecordingResourceUnavailable();
    VaReviewRecord v1;VaReviewRecordV2 v2;VaReviewRecordV3 v3;
    if(found==1?!ParseVaReviewRecord(bytes.substr(8),&v1,error):found==2?!ParseVaReviewRecordV2(bytes.substr(8),&v2,error):!ParseVaReviewRecordV3(bytes.substr(8),&v3,error))return false;
    if(out)BindRecord(v1,*work);if(out2)BindRecord(v2,*work);if(out3)BindRecord(v3,*work);
    if(version)*version=found;if(out)*out=std::move(v1);if(out2)*out2=std::move(v2);if(out3)*out3=std::move(v3);return true;
}
}
bool VaReviewStore::ValidId(const std::string& id){return id.size()==67&&id.rfind("vr-",0)==0&&EvidenceIsSha256(id.substr(3));}
bool VaReviewStore::Recover(std::string* error) const try {
    Fd dir{Directory(directory_,true)};if(dir.n<0)return Fail(error,"review-store-unavailable");
    Fd lock{Lock(dir.n)};if(lock.n<0)return Fail(error,"review-store-busy");
    if(!RecoverPending(dir.n,limits_,memory_,error))return false;
    std::vector<std::string> ids;std::uint64_t bytes=0;
    if(!Inventory(dir.n,limits_,&ids,&bytes))return Fail(error,"review-store-invalid");
    for(const auto& id:ids)if(!ReadAt(dir.n,id,limits_,0,nullptr,nullptr,nullptr,nullptr,memory_,error))return false;
    if(error)error->clear();return true;
} catch(const RecordingResourceUnavailable&) { return Fail(error,"review-capacity"); }
catch(const std::bad_alloc&) { return Fail(error,"review-capacity"); }
bool VaReviewStore::Read(const std::string& id,VaReviewRecord* out,std::string* error) const try {
    if(!out||!ValidId(id))return Fail(error,"review-invalid-id");
    Fd dir{Directory(directory_,false)};if(dir.n<0)return Fail(error,"review-store-unavailable");
    return ReadAt(dir.n,id,limits_,1,out,nullptr,nullptr,nullptr,memory_,error);
} catch(const RecordingResourceUnavailable&) { return Fail(error,"review-capacity"); }
catch(const std::bad_alloc&) { return Fail(error,"review-capacity"); }
bool VaReviewStore::List(std::vector<std::string>* out,std::string* error) const try {
    if(!out)return Fail(error,"review-invalid-query");
    Fd dir{Directory(directory_,false)};std::uint64_t bytes=0;
    std::vector<std::string> ids,visible;
    if(dir.n<0||!Inventory(dir.n,limits_,&ids,&bytes))return Fail(error,"review-store-unavailable");
    for(const auto& id:ids){int version=0;
        if(!ReadAt(dir.n,id,limits_,0,nullptr,nullptr,nullptr,&version,memory_,error))return false;
        if(version==1)visible.push_back(id);}
    *out=std::move(visible);if(error)error->clear();return true;
} catch(const RecordingResourceUnavailable&) { return Fail(error,"review-capacity"); }
catch(const std::bad_alloc&) { return Fail(error,"review-capacity"); }
bool VaReviewStore::ReadV2(const std::string& id,VaReviewRecordV2* out,std::string* error) const try {
    if(!out||!ValidId(id))return Fail(error,"review-invalid-id");
    Fd dir{Directory(directory_,false)};if(dir.n<0)return Fail(error,"review-store-unavailable");
    return ReadAt(dir.n,id,limits_,2,nullptr,out,nullptr,nullptr,memory_,error);
} catch(const RecordingResourceUnavailable&) { return Fail(error,"review-capacity"); }
catch(const std::bad_alloc&) { return Fail(error,"review-capacity"); }
bool VaReviewStore::PublishV2(const VaReviewRecordV2& record,std::string* id,std::string* error,
    const std::function<bool()>& cancelled) const try {
    if(!id||!ValidateVaReviewRecordV2(record,error))return false;
    return PublishBytes(SerializeVaReviewRecordV2(record),2,id,error,cancelled);
} catch(const RecordingResourceUnavailable&) { return Fail(error,"review-capacity"); }
catch(const std::bad_alloc&) { return Fail(error,"review-capacity"); }
bool VaReviewStore::Publish(const VaReviewRecord& record,std::string* id,std::string* error,
    const std::function<bool()>& cancelled) const try {
    if(!id||!ValidateVaReviewRecord(record,error))return false;
    return PublishBytes(SerializeVaReviewRecord(record),1,id,error,cancelled);
} catch(const RecordingResourceUnavailable&) { return Fail(error,"review-capacity"); }
catch(const std::bad_alloc&) { return Fail(error,"review-capacity"); }
bool VaReviewStore::ReadV3(const std::string& id,VaReviewRecordV3* out,std::string* error) const try {
    if(!out||!ValidId(id))return Fail(error,"review-invalid-id");
    Fd dir{Directory(directory_,false)};if(dir.n<0)return Fail(error,"review-store-unavailable");
    return ReadAt(dir.n,id,limits_,3,nullptr,nullptr,out,nullptr,memory_,error);
} catch(const RecordingResourceUnavailable&) { return Fail(error,"review-capacity"); }
catch(const std::bad_alloc&) { return Fail(error,"review-capacity"); }
bool VaReviewStore::ListConfirmed(std::vector<std::string>* out,std::string* error) const try {
    if(!out)return Fail(error,"review-invalid-query");Fd dir{Directory(directory_,false)};
    std::vector<std::string> ids,result;std::uint64_t bytes=0;
    if(dir.n<0||!Inventory(dir.n,limits_,&ids,&bytes))return Fail(error,"review-store-unavailable");
    for(const auto& id:ids){int version=0;if(!ReadAt(dir.n,id,limits_,0,nullptr,nullptr,nullptr,&version,memory_,error))return false;
        if(version==3)result.push_back(id);}
    *out=std::move(result);if(error)error->clear();return true;
} catch(const RecordingResourceUnavailable&) { return Fail(error,"review-capacity"); }
catch(const std::bad_alloc&) { return Fail(error,"review-capacity"); }
bool VaReviewStore::PublishV3(const VaReviewRecordV3& v,std::string* id,std::string* error,const std::function<bool()>& cancelled) const try {
    if(!id||!ValidateVaReviewRecordV3(v,error))return false;return PublishBytes(SerializeVaReviewRecordV3(v),3,id,error,cancelled);
} catch(const RecordingResourceUnavailable&) { return Fail(error,"review-capacity"); }
catch(const std::bad_alloc&) { return Fail(error,"review-capacity"); }
bool VaReviewStore::PublishBytes(const std::string& json,int version,std::string* id,std::string* error,
    const std::function<bool()>& cancelled) const try {
    if(cancelled&&cancelled())return Fail(error,"review-cancelled");
    if(json.size()>limits_.record_bytes)return Fail(error,"review-record-too-large");
    const std::string bytes=std::string(version==3?magic3:version==2?magic2:magic)+json;
    const auto digest=EvidenceSha256(bytes.data(),bytes.size());
    if(!EvidenceIsSha256(digest))return Fail(error,"review-crypto-unavailable");
    const auto result="vr-"+digest;
    Fd dir{Directory(directory_,true)};if(dir.n<0)return Fail(error,"review-store-unavailable");
    Fd lock{Lock(dir.n)};if(lock.n<0)return Fail(error,"review-store-busy");
    if(!RecoverPending(dir.n,limits_,memory_,error))return false;
    std::vector<std::string> ids;std::uint64_t total=0;
    if(!Inventory(dir.n,limits_,&ids,&total))return Fail(error,"review-store-invalid");
    if(std::find(ids.begin(),ids.end(),result)!=ids.end()) {
        if(!ReadAt(dir.n,result,limits_,0,nullptr,nullptr,nullptr,nullptr,memory_,error))return false;
        *id=result;if(error)error->clear();return true;
    }
    if(ids.size()>=limits_.records||total>limits_.bytes||bytes.size()>limits_.bytes-total)
        return Fail(error,"review-capacity");
    struct statvfs space{};
    if(::fstatvfs(dir.n,&space)||static_cast<__uint128_t>(space.f_bavail)*space.f_frsize<
        static_cast<__uint128_t>(limits_.reserve_bytes)+bytes.size())return Fail(error,"review-disk-reserve");
    if(cancelled&&cancelled())return Fail(error,"review-cancelled");
    Fd file{::openat(dir.n,pending,O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC,0600)};
    if(file.n<0)return Fail(error,"review-write-failed");
    bool ok=true;std::size_t done=0;
    while(done<bytes.size()) {
        if(cancelled&&cancelled()){ok=false;break;}
        const auto n=::write(file.n,bytes.data()+done,std::min<std::size_t>(65536,bytes.size()-done));
        if(n<0&&errno==EINTR)continue;if(n<=0){ok=false;break;}done+=std::size_t(n);
    }
    if(ok&&::fsync(file.n))ok=false;
    if(cancelled&&cancelled())ok=false;
    if(!ok) {
        if(::unlinkat(dir.n,pending,0)||::fsync(dir.n))return Fail(error,"review-cleanup-failed");
        return Fail(error,cancelled&&cancelled()?"review-cancelled":"review-write-failed");
    }
    if(::linkat(dir.n,pending,dir.n,(result+".review").c_str(),0)) {
        if(::unlinkat(dir.n,pending,0)||::fsync(dir.n))return Fail(error,"review-cleanup-failed");
        return Fail(error,"review-write-failed");
    }
    if(::fsync(dir.n)||::unlinkat(dir.n,pending,0)||::fsync(dir.n))return Fail(error,"review-publication-uncertain");
    *id=result;if(error)error->clear();return true;
} catch(const RecordingResourceUnavailable&) { return Fail(error,"review-capacity"); }
catch(const std::bad_alloc&) { return Fail(error,"review-capacity"); }
} // namespace recording
