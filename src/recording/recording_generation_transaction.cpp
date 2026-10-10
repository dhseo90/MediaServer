// 파일 용도: 녹화 세대 transaction의 stage 생성·상태 전이 로직을 구현한다.
#include "recording/recording_generation_transaction.h"
#include "recording/recording_scratch_reservation.h"
#include <algorithm>
#include <cerrno>
#include <set>
#include <list>
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
#include <openssl/evp.h>
#include <openssl/rand.h>
#include <fcntl.h>
#include <dirent.h>
#include <sys/stat.h>
#include <unistd.h>
#endif

namespace recording {
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
thread_local void (*RecordingGenerationTransaction::fault_hook_)(const char*)=nullptr;
#endif
namespace {
bool Fail(std::string* error,const char* text){if(error)*error=text;return false;}
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
constexpr const char* kReceipt=".recording-generation-transaction.json";
constexpr const char* kTemp=".recording-generation-transaction.stage";
constexpr const char* kMarker=".recording-store-format";
constexpr const char* kBackup=".recording-marker-v1";
struct Fd {int n=-1;~Fd(){if(n>=0)::close(n);}};
bool Name(const std::string& s){return !s.empty()&&s!="."&&s!=".."&&s.find('/')==std::string::npos&&s.find('\0')==std::string::npos;}
int Directory(const std::filesystem::path& path){
    if(!path.is_absolute()||path!=path.lexically_normal())return -1;
    Fd fd;fd.n=::open("/",O_RDONLY|O_DIRECTORY|O_CLOEXEC);
    if(fd.n<0)return -1;
    for(const auto& part:path.relative_path()){
        const auto name=part.string();if(!Name(name))return -1;
        const int next=::openat(fd.n,name.c_str(),O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
        if(next<0)return -1;
        ::close(fd.n);fd.n=next;
    }
    const int result=fd.n;fd.n=-1;return result;
}
bool Same(const struct stat& a,const struct stat& b){
    if(a.st_dev!=b.st_dev||a.st_ino!=b.st_ino||a.st_size!=b.st_size||a.st_nlink!=b.st_nlink)return false;
#if defined(__APPLE__)
    return a.st_mtimespec.tv_sec==b.st_mtimespec.tv_sec&&a.st_mtimespec.tv_nsec==b.st_mtimespec.tv_nsec&&a.st_ctimespec.tv_sec==b.st_ctimespec.tv_sec&&a.st_ctimespec.tv_nsec==b.st_ctimespec.tv_nsec;
#else
    return a.st_mtim.tv_sec==b.st_mtim.tv_sec&&a.st_mtim.tv_nsec==b.st_mtim.tv_nsec&&a.st_ctim.tv_sec==b.st_ctim.tv_sec&&a.st_ctim.tv_nsec==b.st_ctim.tv_nsec;
#endif
}
std::string Hex(const unsigned char* bytes,std::size_t size){std::string text;constexpr char digits[]="0123456789abcdef";for(std::size_t i=0;i<size;++i){text+=digits[bytes[i]>>4];text+=digits[bytes[i]&15];}return text;}
bool Read(int dir,const std::string& name,RecordingGenerationOwnedFile* out,unsigned links=1,std::string* bytes=nullptr,std::uint64_t admission=0,SearchModelResidency::Reservation* raw_charge=nullptr){
    if(!Name(name))return false;
    Fd fd;fd.n=::openat(dir,name.c_str(),O_RDONLY|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK);struct stat before{},after{},named{};
    if(fd.n<0||::fstat(fd.n,&before)!=0||!S_ISREG(before.st_mode)||before.st_nlink!=links||before.st_size<0||(bytes&&static_cast<std::uint64_t>(before.st_size)>admission))return false;
    std::unique_ptr<EVP_MD_CTX,decltype(&EVP_MD_CTX_free)> hash(EVP_MD_CTX_new(),EVP_MD_CTX_free);
    if(!hash||EVP_DigestInit_ex(hash.get(),EVP_sha256(),nullptr)!=1)return false;
    SearchModelResidency::Reservation ticket;
    if(bytes){
        const auto& owner=RecordingScratchResidency::Current();
        if(!owner||!raw_charge||static_cast<std::uint64_t>(before.st_size)>SIZE_MAX-65)return false;
        auto reserved=owner->memory()->ReserveOwned(static_cast<std::size_t>(before.st_size)+65);
        if(!reserved)throw RecordingResourceUnavailable();
        ticket=std::move(*reserved);
    }
    char block[65536];std::uint64_t offset=0;std::string value;
    if(bytes)value.reserve(static_cast<std::size_t>(before.st_size));
    while(offset<static_cast<std::uint64_t>(before.st_size)){
        ssize_t n;do{n=::pread(fd.n,block,std::min<std::uint64_t>(sizeof(block),before.st_size-offset),static_cast<off_t>(offset));}while(n<0&&errno==EINTR);
        if(n<=0||EVP_DigestUpdate(hash.get(),block,static_cast<std::size_t>(n))!=1)return false;
        if(bytes)value.append(block,static_cast<std::size_t>(n));
        offset+=static_cast<std::uint64_t>(n);
    }
    unsigned char digest[32];unsigned size=0;
    if(EVP_DigestFinal_ex(hash.get(),digest,&size)!=1||size!=32||::fstat(fd.n,&after)!=0||!Same(before,after)||::fstatat(dir,name.c_str(),&named,AT_SYMLINK_NOFOLLOW)!=0||!S_ISREG(named.st_mode)||!Same(after,named))return false;
    if(out)*out={{name,static_cast<std::uint64_t>(before.st_size),Hex(digest,size)},static_cast<std::uint64_t>(before.st_dev),static_cast<std::uint64_t>(before.st_ino)};
    if(bytes){*bytes=std::move(value);*raw_charge=std::move(ticket);}
    return true;
}
bool Verify(int dir,const RecordingGenerationOwnedFile& expected,unsigned links=1,const char* alias=nullptr){
    RecordingGenerationOwnedFile actual;
    return Read(dir,alias?alias:expected.file.name,&actual,links)&&actual.device==expected.device&&actual.inode==expected.inode&&actual.file.size==expected.file.size&&actual.file.sha256==expected.file.sha256;
}
bool Missing(int dir,const char* name){struct stat status{};return ::fstatat(dir,name,&status,AT_SYMLINK_NOFOLLOW)!=0&&errno==ENOENT;}
bool Write(int fd,std::string_view bytes){std::size_t offset=0;while(offset<bytes.size()){ssize_t n;do{n=::write(fd,bytes.data()+offset,bytes.size()-offset);}while(n<0&&errno==EINTR);if(n<=0)return false;offset+=static_cast<std::size_t>(n);}return true;}
bool Empty(int fd){Fd copy;copy.n=::dup(fd);if(copy.n<0)return false;DIR* dir=::fdopendir(copy.n);if(!dir)return false;copy.n=-1;bool empty=true;errno=0;while(const auto* e=::readdir(dir)){const std::string name=e->d_name;if(name!="."&&name!=".."){empty=false;break;}}if(errno)empty=false;::closedir(dir);return empty;}
#endif
}
struct RecordingGenerationTransaction::State {
    std::filesystem::path root_path,stage_path;RecordingGenerationReceipt receipt;
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    std::shared_ptr<RecordingScratchResidency> resources;
    std::size_t disk_domain{0};
    RecordingScratchResidency::Reservation working,stage_disk,receipt_disk,receipt_temp_disk;
    struct PendingDisk { RecordingScratchResidency::Reservation reservation; };
    std::list<PendingDisk> pending_disk;
    bool cleaned=false;
    Fd root,stage;struct stat root_stat{},stage_stat{};RecordingGenerationOwnedFile receipt_file;bool prepared=false,loaded=false;unsigned receipt_links=1;
    std::vector<RecordingGenerationOwnedFile> live_files;
    bool stage_created=false;
    ~State(){
        if(!cleaned){if(stage_created)stage_disk.PreserveDisk();receipt_disk.PreserveDisk();receipt_temp_disk.PreserveDisk();for(auto& item:pending_disk)item.reservation.PreserveDisk();}
        // Fd members are destroyed before their earlier-declared working ticket.
    }
    bool BindResources(const std::filesystem::path& path,std::string* error){
        if(resources)return true;
        auto owner=RecordingScratchResidency::Current();
        if(!owner)owner=RecordingScratchResidency::Default(std::filesystem::canonical(std::filesystem::temp_directory_path()).string());
        const auto domain=owner->DomainForDirectory(path.string());
        // Two persistent directory FDs, bounded Directory traversal (two), writer
        // and validation reader. Read hashes a single 64KiB block at a time.
        auto ticket=owner->Reserve({0,6,2*65536+sizeof(State)},domain);
        if(!ticket)return Fail(error,"recording-resource-unavailable");
        working=std::move(*ticket);resources=std::move(owner);disk_domain=domain;return true;
    }
    void Hit(const char* point) const{
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
        if(RecordingGenerationTransaction::fault_hook_)RecordingGenerationTransaction::fault_hook_(point);
#else
        (void)point;
#endif
    }
    bool Bound() const{
        Fd now;now.n=Directory(root_path);struct stat r{},s{},named{};
        return now.n>=0&&::fstat(now.n,&r)==0&&r.st_dev==root_stat.st_dev&&r.st_ino==root_stat.st_ino&&::fstat(root.n,&r)==0&&r.st_dev==root_stat.st_dev&&r.st_ino==root_stat.st_ino&&
            ::fstat(stage.n,&s)==0&&S_ISDIR(s.st_mode)&&s.st_uid==::geteuid()&&(s.st_mode&0777)==0700&&s.st_dev==stage_stat.st_dev&&s.st_ino==stage_stat.st_ino&&
            ::fstatat(root.n,stage_path.filename().c_str(),&named,AT_SYMLINK_NOFOLLOW)==0&&S_ISDIR(named.st_mode)&&named.st_dev==s.st_dev&&named.st_ino==s.st_ino;
    }
    bool ReceiptBound() const{return prepared&&Bound()&&Verify(root.n,receipt_file,receipt_links)&&
        (receipt_links==1||Verify(root.n,receipt_file,2,kTemp));}
    bool NormalizeReceipt(std::string* error){
        if(!ReceiptBound())return Fail(error,"transaction receipt alias authority changed");
        if(receipt_links==1)return true;
        if(::fsync(root.n)!=0||!ReceiptBound()||::unlinkat(root.n,kTemp,0)!=0||::fsync(root.n)!=0)return Fail(error,"transaction receipt alias normalization uncertain");
        receipt_links=1;return ReceiptBound()||Fail(error,"transaction receipt normalized binding changed");
    }
    bool Save(const RecordingGenerationReceipt& value,bool initial,std::string* error){
        RecordingScratchResidency::Scope scope(resources);
        const auto bound=RecordingGenerationReceiptSerializationBytes(value);
        if(bound>(SIZE_MAX-65536)/4)return Fail(error,"recording-resource-unavailable");
        // Four output capacities cover growth/concatenation plus the target and
        // predecessor codec strings; inode validation nodes are bounded bycreated.
        auto encoded=resources->Reserve({0,0,4*bound+65536},disk_domain);
        if(!encoded)return Fail(error,"recording-resource-unavailable");
        SearchModelResidency::Reservation copy_charge;
        if(!value.memory.bytes()){
            auto ticket=resources->memory()->ReserveOwned(RecordingGenerationReceiptMemoryBytes(value));
            if(!ticket)return Fail(error,"recording-resource-unavailable");
            copy_charge=std::move(*ticket);
        }
        RecordingGenerationReceipt next_value=value;
        if(copy_charge.bytes())next_value.memory=std::move(copy_charge);
        std::string bytes;if(!SerializeRecordingGenerationReceipt(value,&bytes,error)||!Bound()||(initial?!Missing(root.n,kReceipt):!ReceiptBound()))return Fail(error,"transaction receipt binding/collision rejected");
        auto next=resources->Reserve({resources->DiskCharge(bytes.size(),disk_domain),0,0},disk_domain);
        if(!next)return Fail(error,"recording-resource-unavailable");
        Fd fd;fd.n=::openat(root.n,kTemp,O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC,0600);if(fd.n<0)return Fail(error,"transaction receipt temp collision");
        receipt_temp_disk=std::move(*next);Hit("receipt-created");
        if(!Write(fd.n,bytes))return Fail(error,"transaction receipt write failed");
        Hit("receipt-written");
        if(::fsync(fd.n)!=0)return Fail(error,"transaction receipt file fsync failed");
        Hit("receipt-file-synced");
        struct stat a{},b{};
        if(!Bound()||::fstat(fd.n,&a)!=0||a.st_nlink!=1||::fstatat(root.n,kTemp,&b,AT_SYMLINK_NOFOLLOW)!=0||!Same(a,b)||(initial?!Missing(root.n,kReceipt):!ReceiptBound()))return Fail(error,"transaction receipt final binding rejected");
        if(initial){
            if(::linkat(root.n,kTemp,root.n,kReceipt,0)!=0)return Fail(error,"transaction receipt no-overwrite failed");
            Hit("receipt-linked");
            if(::fsync(root.n)!=0||::unlinkat(root.n,kTemp,0)!=0)return Fail(error,"transaction receipt link durability uncertain");
        }else if(::renameat(root.n,kTemp,root.n,kReceipt)!=0)return Fail(error,"transaction receipt phase rename failed");
        Hit("receipt-renamed");if(::fsync(root.n)!=0)return Fail(error,"transaction receipt directory durability uncertain");Hit("receipt-directory-synced");
        RecordingGenerationOwnedFile saved;
        if(!Bound()||!Read(root.n,kReceipt,&saved)||saved.device!=static_cast<std::uint64_t>(a.st_dev)||saved.inode!=static_cast<std::uint64_t>(a.st_ino))return Fail(error,"transaction receipt postpublish binding rejected");
        receipt=std::move(next_value);receipt_file=std::move(saved);prepared=true;receipt_links=1;receipt_disk=std::move(receipt_temp_disk);return true;
    }
#endif
};
RecordingGenerationTransaction::RecordingGenerationTransaction():state_(new State){}
RecordingGenerationTransaction::~RecordingGenerationTransaction()=default;
void RecordingGenerationTransaction::FaultPoint(const char* point) const{
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    state_->Hit(point);
#else
    (void)point;
#endif
}
const std::filesystem::path& RecordingGenerationTransaction::StagePath() const{return state_->stage_path;}
const RecordingGenerationReceipt& RecordingGenerationTransaction::Receipt() const{return state_->receipt;}
bool RecordingGenerationTransaction::Create(const std::filesystem::path& root,std::string* error)try{
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    auto& s=*state_;if(s.root.n>=0)return Fail(error,"transaction already initialized");
    if(!s.BindResources(root,error))return false;
    auto directory=s.resources->Reserve({s.resources->DiskCharge(1,s.disk_domain),0,0},s.disk_domain);
    if(!directory)return Fail(error,"recording-resource-unavailable");
    s.stage_disk=std::move(*directory);s.root_path=root;s.root.n=Directory(root);
    if(s.root.n<0||::fstat(s.root.n,&s.root_stat)!=0||!Missing(s.root.n,kReceipt)||!Missing(s.root.n,kTemp))return Fail(error,"transaction root/receipt unavailable");
    unsigned char nonce[16];if(RAND_bytes(nonce,sizeof(nonce))!=1)return Fail(error,"transaction nonce unavailable");
    const auto name=".recording-generation-prepare-"+Hex(nonce,sizeof(nonce));s.stage_path=root/name;
    if(::mkdirat(s.root.n,name.c_str(),0700)!=0)return Fail(error,"transaction stage create failed");
    s.stage_created=true;s.Hit("stage-created");
    s.stage.n=::openat(s.root.n,name.c_str(),O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
    if(s.stage.n<0||::fstat(s.stage.n,&s.stage_stat)!=0||!s.Bound()||::fsync(s.stage.n)!=0||::fsync(s.root.n)!=0)return Fail(error,"transaction stage binding/fsync failed; preserved");
    if(error)error->clear();
    return true;
#else
    (void)root;return Fail(error,"transaction crypto/POSIX unsupported");
#endif
}catch(const RecordingResourceUnavailable& e){return Fail(error,e.what());}
bool RecordingGenerationTransaction::Load(const std::filesystem::path& root,std::uint64_t admission,std::string* error)try{
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    auto& s=*state_;if(s.root.n>=0||!admission)return Fail(error,"transaction load state/admission invalid");
    if(!s.BindResources(root,error))return false;
    RecordingScratchResidency::Scope scope(s.resources);
    SearchModelResidency::Reservation raw_charge;
    s.root_path=root;s.root.n=Directory(root);std::string bytes;
    if(s.root.n<0||::fstat(s.root.n,&s.root_stat)!=0)return Fail(error,"transaction receipt root rejected");
    if(!Read(s.root.n,kReceipt,&s.receipt_file,1,&bytes,admission,&raw_charge)){
        if(!Read(s.root.n,kReceipt,&s.receipt_file,2,&bytes,admission,&raw_charge)||!Verify(s.root.n,s.receipt_file,2,kTemp))return Fail(error,"transaction receipt alias rejected");
        s.receipt_links=2;
    }
    if(!ParseRecordingGenerationReceipt(bytes,admission,&s.receipt,error))return false;
    if(s.receipt_links==2&&s.receipt.phase!=RecordingGenerationPhase::Prepared)return Fail(error,"transaction receipt alias phase rejected");
    s.stage_path=root/s.receipt.stage_name;s.stage.n=::openat(s.root.n,s.receipt.stage_name.c_str(),O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
    if(s.stage.n<0||::fstat(s.stage.n,&s.stage_stat)!=0||static_cast<std::uint64_t>(s.root_stat.st_dev)!=s.receipt.root_device||static_cast<std::uint64_t>(s.root_stat.st_ino)!=s.receipt.root_inode||static_cast<std::uint64_t>(s.stage_stat.st_dev)!=s.receipt.stage_device||static_cast<std::uint64_t>(s.stage_stat.st_ino)!=s.receipt.stage_inode||!s.Bound())return Fail(error,"transaction recovery root/stage rejected");
    s.prepared=true;s.loaded=true;if(error)error->clear();return true;
#else
    (void)root;(void)admission;return Fail(error,"transaction crypto/POSIX unsupported");
#endif
}catch(const RecordingResourceUnavailable& e){return Fail(error,e.what());}
bool RecordingGenerationTransaction::Describe(bool staged,const std::string& name,RecordingGenerationOwnedFile* output,std::string* error) const{
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    if(!output||!state_->Bound()||!Read(staged?state_->stage.n:state_->root.n,name,output))return Fail(error,"transaction descriptor read rejected");
    if(error)error->clear();
    return true;
#else
    (void)staged;(void)name;(void)output;return Fail(error,"transaction crypto/POSIX unsupported");
#endif
}
bool RecordingGenerationTransaction::WriteReplacementMarker(const std::string& bytes,RecordingGenerationOwnedFile* output,std::string* error){
    if(bytes.empty()||bytes.size()>512)return Fail(error,"replacement marker size invalid");
    return WriteComponent(".recording-marker-v2",bytes,output,error);
}
bool RecordingGenerationTransaction::WriteComponent(const std::string& name,const std::string& bytes,RecordingGenerationOwnedFile* output,std::string* error){
    return WriteComponentStream(name,1024ULL*1024*1024,[&](const RecordingGenerationByteSink& sink,std::string* detail){return sink(bytes,detail);},output,error);
}
bool RecordingGenerationTransaction::WriteComponentStream(const std::string& name,std::uint64_t admission,
    const RecordingGenerationByteProducer& produce,RecordingGenerationOwnedFile* output,std::string* error)try{
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    auto& s=*state_;
    if(!output||!produce||!admission||s.prepared||!s.Bound()||!Name(name))return Fail(error,"transaction component preparation invalid");
    admission=std::min<std::uint64_t>(admission,1024ULL*1024*1024);
    auto disk=s.resources->Reserve({0,0,4*sizeof(RecordingGenerationOwnedFile)+4*name.size()+sizeof(State::PendingDisk)},s.disk_domain);
    if(!disk)return Fail(error,"recording-resource-unavailable");
    s.pending_disk.push_back({std::move(*disk)});auto& charge=s.pending_disk.back().reservation;
    std::unique_ptr<EVP_MD_CTX,decltype(&EVP_MD_CTX_free)> hash(EVP_MD_CTX_new(),EVP_MD_CTX_free);
    if(!hash||EVP_DigestInit_ex(hash.get(),EVP_sha256(),nullptr)!=1)return Fail(error,"transaction component digest failed");
    Fd fd;fd.n=::openat(s.stage.n,name.c_str(),O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC,0600);struct stat created{};
    if(fd.n<0||::fstat(fd.n,&created)!=0||!S_ISREG(created.st_mode)||created.st_nlink!=1)return Fail(error,"transaction component create failed; preserved");
    std::uint64_t total=0;bool failed=false,uncertain_write=false;
    const RecordingGenerationByteSink sink=[&](std::string_view bytes,std::string* detail){
        if(failed||bytes.size()>admission-total){failed=true;return Fail(detail,"transaction component stream admission exceeded");}
        if(!charge.GrowDisk(s.resources->DiskCharge(total+bytes.size(),s.disk_domain))){failed=true;return Fail(detail,"recording-resource-unavailable");}
        if(!Write(fd.n,bytes)||EVP_DigestUpdate(hash.get(),bytes.data(),bytes.size())!=1){
            failed=true;uncertain_write=true;return Fail(detail,"transaction component stream write/hash failed; preserved");
        }
        total+=bytes.size();return true;
    };
    bool produced=false;
    try{produced=produce(sink,error);}catch(...){Fail(error,"transaction component producer exception");}
    const std::string first=error?*error:std::string{};
    unsigned char digest[32];unsigned size=0;
    if(uncertain_write||EVP_DigestFinal_ex(hash.get(),digest,&size)!=1||size!=32)return false;
    RecordingGenerationOwnedFile actual;
    std::string observed;
    if(!Describe(true,name,&actual,&observed)||actual.device!=static_cast<std::uint64_t>(created.st_dev)||
       actual.inode!=static_cast<std::uint64_t>(created.st_ino)||actual.file.size!=total||actual.file.sha256!=Hex(digest,size)){
        if(error)*error=(first.empty()?"transaction created component changed":first)+"; partial preparation binding uncertain";
        return false;
    }
    // A failed producer may have emitted a verified prefix (including zero bytes). Register only
    // that exact prefix for the existing identity/hash checked cleanup; unknown partial writes stay preserved.
    s.live_files.push_back(actual);
    if(!produced||failed){if(error)*error=first.empty()?"transaction component producer failed":first;return false;}
    if(::fsync(fd.n)!=0||::fsync(s.stage.n)!=0)return Fail(error,"transaction component write/fsync failed; preserved");
    *output=std::move(actual);s.Hit("component-prepared");return true;
#else
    (void)name;(void)admission;(void)produce;(void)output;return Fail(error,"transaction crypto/POSIX unsupported");
#endif
}catch(const RecordingResourceUnavailable& e){return Fail(error,e.what());}
bool RecordingGenerationTransaction::CleanupUnprepared(std::string* error){
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    auto& s=*state_;
    // 재기동 Load에는 live_files가 없다. 오직 이 프로세스가 완결 생성한 파일만
    // 전수 대조한 뒤 회수하며, 영수증/부분 파일/낯선 항목이 있으면 보존한다.
    if(s.stage.n<0)return !s.stage_created||Fail(error,"transaction created stage binding unavailable; preserved");
    if(s.prepared||!s.Bound()||!Missing(s.root.n,kReceipt)||!Missing(s.root.n,kTemp))return Fail(error,"transaction unprepared cleanup authority rejected");
    std::set<std::string> names;
    for(const auto& file:s.live_files)if(!names.insert(file.file.name).second||!Verify(s.stage.n,file))return Fail(error,"transaction live preparation changed");
    Fd copy;copy.n=::dup(s.stage.n);if(copy.n<0)return Fail(error,"transaction cleanup directory duplication failed");
    DIR* dir=::fdopendir(copy.n);if(!dir)return Fail(error,"transaction cleanup directory read failed");copy.n=-1;
    bool known=true;errno=0;
    while(const auto* entry=::readdir(dir)){const std::string name=entry->d_name;if(name!="."&&name!=".."&&!names.erase(name)){known=false;break;}}
    if(errno||!names.empty())known=false;
    ::closedir(dir);
    if(!known)return Fail(error,"transaction unknown live preparation preserved");
    for(const auto& file:s.live_files){
        struct stat before{},after{};
        if(!s.Bound()||::fstatat(s.stage.n,file.file.name.c_str(),&before,AT_SYMLINK_NOFOLLOW)!=0||!Verify(s.stage.n,file))return Fail(error,"transaction live cleanup bytes changed");
        s.Hit("unprepared-before-unlink");
        if(!s.Bound()||::fstatat(s.stage.n,file.file.name.c_str(),&after,AT_SYMLINK_NOFOLLOW)!=0||!Same(before,after)||::unlinkat(s.stage.n,file.file.name.c_str(),0)!=0)return Fail(error,"transaction live cleanup final binding changed");
    }
    if(::fsync(s.stage.n)!=0||!Empty(s.stage.n)||!s.Bound()||::unlinkat(s.root.n,s.stage_path.filename().c_str(),AT_REMOVEDIR)!=0||::fsync(s.root.n)!=0)return Fail(error,"transaction live cleanup durability uncertain");
    for(auto& item:s.pending_disk)item.reservation.ReleaseDisk();
    // Metadata tickets remain beside the still-owned live_files/receipt values.
    s.cleaned=true;s.stage_disk={};s.receipt_disk={};s.receipt_temp_disk={};
    if(error)error->clear();
    return true;
#else
    return Fail(error,"transaction crypto/POSIX unsupported");
#endif
}
bool RecordingGenerationTransaction::Prepare(const RecordingGenerationReceipt& value,std::string* error)try{
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    auto& s=*state_;if(s.prepared||!s.Bound()||value.phase!=RecordingGenerationPhase::Prepared||value.stage_name!=s.stage_path.filename()||value.root_device!=static_cast<std::uint64_t>(s.root_stat.st_dev)||value.root_inode!=static_cast<std::uint64_t>(s.root_stat.st_ino)||value.stage_device!=static_cast<std::uint64_t>(s.stage_stat.st_dev)||value.stage_inode!=static_cast<std::uint64_t>(s.stage_stat.st_ino)||!Verify(s.root.n,value.marker)||!Verify(s.root.n,value.source))return Fail(error,"transaction original/stage proof mismatch");
    if(value.replacement_marker&&!Verify(s.stage.n,*value.replacement_marker))return Fail(error,"transaction replacement marker mismatch");
    if(value.predecessor_file&&!Verify(s.root.n,*value.predecessor_file))return Fail(error,"transaction predecessor mismatch");
    if(value.predecessor_snapshot&&!Verify(s.root.n,*value.predecessor_snapshot))return Fail(error,"transaction predecessor snapshot mismatch");
    for(const auto& file:value.created)if(!Verify(s.stage.n,file)||!Missing(s.root.n,file.file.name.c_str()))return Fail(error,"transaction component/collision rejected");
    return s.Save(value,true,error);
#else
    (void)value;return Fail(error,"transaction crypto/POSIX unsupported");
#endif
}catch(const RecordingResourceUnavailable& e){return Fail(error,e.what());}
bool RecordingGenerationTransaction::Promote(std::string* error){
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    auto& s=*state_;if(!s.ReceiptBound()||s.receipt.phase!=RecordingGenerationPhase::Prepared||!s.NormalizeReceipt(error))return Fail(error,"transaction promotion authority rejected");
    for(const auto& file:s.receipt.created){
        const char* name=file.file.name.c_str();struct stat a{},b{};const bool from=::fstatat(s.stage.n,name,&a,AT_SYMLINK_NOFOLLOW)==0;if(!from&&errno!=ENOENT)return Fail(error,"transaction stage stat failed");
        const bool to=::fstatat(s.root.n,name,&b,AT_SYMLINK_NOFOLLOW)==0;if(!to&&errno!=ENOENT)return Fail(error,"transaction root stat failed");
        if(!s.ReceiptBound())return Fail(error,"transaction promotion binding changed");
        if(!from){if(!to||!Verify(s.root.n,file))return Fail(error,"transaction promoted file missing/foreign");continue;}
        if(to){if(a.st_dev!=b.st_dev||a.st_ino!=b.st_ino||!Verify(s.stage.n,file,2)||!Verify(s.root.n,file,2))return Fail(error,"transaction two-link ownership rejected");}
        else {if(!Verify(s.stage.n,file)||::linkat(s.stage.n,name,s.root.n,name,0)!=0)return Fail(error,"transaction no-overwrite promotion rejected");s.Hit("component-linked");}
        if(::fsync(s.root.n)!=0)return Fail(error,"transaction promoted root fsync failed");
        s.Hit("component-root-synced");
        if(!s.ReceiptBound()||!Verify(s.stage.n,file,2)||!Verify(s.root.n,file,2)||::unlinkat(s.stage.n,name,0)!=0)return Fail(error,"transaction stage unlink rejected");
        s.Hit("component-unlinked");
        if(::fsync(s.stage.n)!=0)return Fail(error,"transaction stage directory fsync failed");
        s.Hit("component-stage-synced");if(!Verify(s.root.n,file))return Fail(error,"transaction final component binding rejected");
    }if(error)error->clear();return true;
#else
    return Fail(error,"transaction crypto/POSIX unsupported");
#endif
}
bool RecordingGenerationTransaction::ReplaceMarker(std::string* error){
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    auto& s=*state_;if(!s.ReceiptBound()||s.receipt.phase!=RecordingGenerationPhase::Prepared||!s.receipt.replacement_marker||!Verify(s.root.n,s.receipt.marker)||!Verify(s.stage.n,*s.receipt.replacement_marker))return Fail(error,"transaction marker predecessor rejected");
    if(::linkat(s.root.n,kMarker,s.stage.n,kBackup,0)!=0)return Fail(error,"transaction original marker backup collision");
    s.Hit("marker-backup-linked");
    if(::fsync(s.root.n)!=0||::fsync(s.stage.n)!=0||!Verify(s.root.n,s.receipt.marker,2)||!Verify(s.stage.n,s.receipt.marker,2,kBackup))return Fail(error,"transaction original marker backup uncertain");
    s.Hit("marker-backup-synced");
    if(!s.ReceiptBound()||!Verify(s.stage.n,*s.receipt.replacement_marker)||::renameat(s.stage.n,s.receipt.replacement_marker->file.name.c_str(),s.root.n,kMarker)!=0)return Fail(error,"transaction marker rename failed");
    s.Hit("marker-renamed");
    if(::fsync(s.root.n)!=0||::fsync(s.stage.n)!=0||!Verify(s.root.n,*s.receipt.replacement_marker,1,kMarker))return Fail(error,"transaction marker durability uncertain");
    s.Hit("marker-synced");return true;
#else
    return Fail(error,"transaction crypto/POSIX unsupported");
#endif
}
bool RecordingGenerationTransaction::PublishIntent(std::string* error)try{
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    auto next=state_->receipt;if(!Revalidate(error)||next.phase!=RecordingGenerationPhase::Prepared)return false;next.phase=RecordingGenerationPhase::PublishIntent;return state_->Save(next,false,error);
#else
    return Fail(error,"transaction crypto/POSIX unsupported");
#endif
}catch(const RecordingResourceUnavailable& e){return Fail(error,e.what());}
bool RecordingGenerationTransaction::Revalidate(std::string* error) const{
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    const auto& s=*state_;if(!s.ReceiptBound())return Fail(error,"transaction receipt authority changed");
    for(const auto& file:s.receipt.created)if(!Verify(s.root.n,file))return Fail(error,"transaction published component changed");
    const auto& marker=s.receipt.replacement_marker?*s.receipt.replacement_marker:s.receipt.marker;
    if(!Verify(s.root.n,marker,1,kMarker))return Fail(error,"transaction published marker changed");
    if(error)error->clear();
    return true;
#else
    return Fail(error,"transaction crypto/POSIX unsupported");
#endif
}
bool RecordingGenerationTransaction::RestoreMarker(std::string* error){
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    auto& s=*state_;if(!s.ReceiptBound()||s.receipt.operation!=RecordingGenerationOperation::Cutover||s.receipt.phase!=RecordingGenerationPhase::Prepared||!Missing(s.root.n,"recording-generation.json")||!Verify(s.root.n,s.receipt.source))return Fail(error,"transaction rollback authority rejected");
    if(Verify(s.root.n,s.receipt.marker)){
        if(!Missing(s.stage.n,kBackup))return Fail(error,"transaction original marker has foreign backup");
    }else if(Verify(s.root.n,s.receipt.marker,2)&&Verify(s.stage.n,s.receipt.marker,2,kBackup)){
        if(::unlinkat(s.stage.n,kBackup,0)!=0)return Fail(error,"transaction original marker alias unlink failed");
    }else {
        if(!s.receipt.replacement_marker||!Verify(s.root.n,*s.receipt.replacement_marker,1,kMarker)||!Verify(s.stage.n,s.receipt.marker,1,kBackup)||!s.ReceiptBound()||::renameat(s.stage.n,kBackup,s.root.n,kMarker)!=0)return Fail(error,"transaction marker rollback ownership rejected");
    }
    s.Hit("marker-restored");
    if(::fsync(s.root.n)!=0||::fsync(s.stage.n)!=0||!Verify(s.root.n,s.receipt.marker))return Fail(error,"transaction rollback marker durability uncertain");
    s.Hit("marker-restore-synced");return true;
#else
    return Fail(error,"transaction crypto/POSIX unsupported");
#endif
}
bool RecordingGenerationTransaction::ValidateRecoveryOriginal(std::string* error,bool* complete) const{
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    const auto& s=*state_;
    if(!s.ReceiptBound()||s.receipt.phase!=RecordingGenerationPhase::Prepared||!Verify(s.root.n,s.receipt.source))return Fail(error,"transaction recovery original/phase rejected");
    const bool checkpoint=s.receipt.operation==RecordingGenerationOperation::Checkpoint;
    if(checkpoint){if(!s.receipt.predecessor_file||!Verify(s.root.n,*s.receipt.predecessor_file))return Fail(error,"transaction checkpoint predecessor rejected");}
    else if(!Missing(s.root.n,"recording-generation.json"))return Fail(error,"transaction cutover manifest not absent");
    const bool original=Verify(s.root.n,s.receipt.marker)&&Missing(s.stage.n,kBackup);
    const bool two=!checkpoint&&Verify(s.root.n,s.receipt.marker,2)&&Verify(s.stage.n,s.receipt.marker,2,kBackup);
    const bool replaced=!checkpoint&&s.receipt.replacement_marker&&Verify(s.root.n,*s.receipt.replacement_marker,1,kMarker)&&Verify(s.stage.n,s.receipt.marker,1,kBackup);
    if(!original&&!two&&!replaced)return Fail(error,"transaction recovery marker ownership rejected");
    bool all=true;
    // 원래 marker inode가 이미 복원된 경우에만 부재를 rollback-only 멱등 상태로 본다.
    for(const auto& file:s.receipt.created){
        const char* name=file.file.name.c_str();
        const bool staged=Verify(s.stage.n,file)&&Missing(s.root.n,name);
        const bool linked=Verify(s.stage.n,file,2)&&Verify(s.root.n,file,2);
        const bool promoted=Missing(s.stage.n,name)&&Verify(s.root.n,file);
        if(original&&Missing(s.stage.n,name)&&Missing(s.root.n,name)){all=false;continue;}
        if(!staged&&!linked&&!promoted)return Fail(error,"transaction recovery component ownership rejected");
    }
    if(complete)*complete=all;
    if(error)error->clear();
    return true;
#else
    (void)complete;
    return Fail(error,"transaction crypto/POSIX unsupported");
#endif
}
bool RecordingGenerationTransaction::Cleanup(bool committed,std::string* error)try{
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    auto& s=*state_;if(!s.ReceiptBound()||!Verify(s.root.n,s.receipt.source))return Fail(error,"transaction cleanup receipt/source changed");
    if(committed){
        RecordingScratchResidency::Scope scope(s.resources);
        const auto bound=RecordingGenerationReceiptSerializationBytes(s.receipt);
        if(bound>(SIZE_MAX-65536)/4)return Fail(error,"recording-resource-unavailable");
        auto encoded=s.resources->memory()->ReserveOwned(4*bound+65536);
        if(!encoded)return Fail(error,"recording-resource-unavailable");
        SearchModelResidency::Reservation raw_charge;
        std::string expected,actual;RecordingGenerationOwnedFile manifest;
        if(!SerializeRecordingGenerationManifest(s.receipt.target,&expected,error)||!Read(s.root.n,"recording-generation.json",&manifest,1,&actual,65536,&raw_charge)||actual!=expected||!Revalidate(error))return Fail(error,"transaction committed cleanup authority rejected");
        if(s.receipt.predecessor_snapshot){
            const auto& file=*s.receipt.predecessor_snapshot;
            const auto* name=file.file.name.c_str();
            // 재기동 Load에서만 exact ENOENT를 멱등 완료로 본다. live 게시 후 부재는 손상이다.
            s.Hit("predecessor-snapshot-before-check");
            const bool missing=Missing(s.root.n,name);
            if(missing&&!s.loaded)return Fail(error,"transaction live predecessor snapshot missing");
            if(!missing){
                struct stat before{},after{};
                if(::fstatat(s.root.n,name,&before,AT_SYMLINK_NOFOLLOW)!=0||!Verify(s.root.n,file))
                    return Fail(error,"transaction predecessor snapshot ownership changed");
                s.Hit("predecessor-snapshot-before-unlink");
                if(!s.ReceiptBound()||::fstatat(s.root.n,name,&after,AT_SYMLINK_NOFOLLOW)!=0||!Same(before,after)||::unlinkat(s.root.n,name,0)!=0)
                    return Fail(error,"transaction predecessor snapshot final binding changed");
                s.Hit("predecessor-snapshot-unlinked");
            }
            if(::fsync(s.root.n)!=0)return Fail(error,"transaction predecessor snapshot cleanup durability uncertain");
            s.Hit("predecessor-snapshot-synced");
        }
    }else {
        if(s.receipt.phase!=RecordingGenerationPhase::Prepared||!Verify(s.root.n,s.receipt.marker)||!Verify(s.root.n,s.receipt.source))return Fail(error,"transaction rollback cleanup authority rejected");
        if(s.receipt.operation==RecordingGenerationOperation::Cutover){if(!Missing(s.root.n,"recording-generation.json"))return Fail(error,"transaction rollback manifest present");}
        else if(!s.receipt.predecessor_file||!Verify(s.root.n,*s.receipt.predecessor_file))return Fail(error,"transaction rollback predecessor changed");
        for(const auto& file:s.receipt.created){
            const auto* name=file.file.name.c_str();
            if(!Missing(s.stage.n,name)){
                const bool linked=!Missing(s.root.n,name);
                if(!Verify(s.stage.n,file,linked?2:1)||(linked&&!Verify(s.root.n,file,2))||::unlinkat(s.stage.n,name,0)!=0||::fsync(s.stage.n)!=0)return Fail(error,"transaction owned staged cleanup rejected");
            }
            if(!Missing(s.root.n,file.file.name.c_str())&&(!Verify(s.root.n,file)||::unlinkat(s.root.n,file.file.name.c_str(),0)!=0))return Fail(error,"transaction owned component cleanup rejected");
            s.Hit("component-cleaned");
        }
        if(::fsync(s.root.n)!=0)return Fail(error,"transaction component cleanup durability uncertain");
    }
    if(!Missing(s.stage.n,kBackup)&&(!Verify(s.stage.n,s.receipt.marker,1,kBackup)||::unlinkat(s.stage.n,kBackup,0)!=0))return Fail(error,"transaction backup cleanup rejected");
    if(s.receipt.replacement_marker&&!Missing(s.stage.n,s.receipt.replacement_marker->file.name.c_str())&&
       (!Verify(s.stage.n,*s.receipt.replacement_marker)||::unlinkat(s.stage.n,s.receipt.replacement_marker->file.name.c_str(),0)!=0))return Fail(error,"transaction replacement cleanup rejected");
    if(::fsync(s.stage.n)!=0||!Empty(s.stage.n)||!Missing(s.root.n,kTemp)||!s.ReceiptBound())return Fail(error,"transaction cleanup stage not proven empty");
    // 영수증이 없는 빈 stage 잔여물은 소유 추정으로 다음 실행에서 지우지 않는다.
    if(::unlinkat(s.root.n,kReceipt,0)!=0||::fsync(s.root.n)!=0)return Fail(error,"transaction receipt cleanup durability uncertain");
    s.Hit("receipt-cleaned");
    if(!s.Bound()||::unlinkat(s.root.n,s.stage_path.filename().c_str(),AT_REMOVEDIR)!=0||::fsync(s.root.n)!=0)return Fail(error,"transaction empty stage cleanup uncertain");
    if(committed)for(auto& item:s.pending_disk)item.reservation.PromoteToOriginal();
    else for(auto& item:s.pending_disk)item.reservation.ReleaseDisk();
    s.cleaned=true;s.stage_disk={};s.receipt_disk={};s.receipt_temp_disk={};
    s.prepared=false;if(error)error->clear();return true;
#else
    (void)committed;return Fail(error,"transaction crypto/POSIX unsupported");
#endif
}catch(const RecordingResourceUnavailable& e){return Fail(error,e.what());}
} // namespace recording
