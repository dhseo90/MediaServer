// 파일 용도: caller 소유 cutover stage에 후보 파일을 작성하는 writer를 구현한다.
#include "recording/recording_cutover_stage_writer.h"
#include "domain/strict_json.h"
#include <algorithm>
#include <cerrno>
#include <limits>
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
#include <openssl/evp.h>
#include <fcntl.h>
#include <dirent.h>
#include <sys/stat.h>
#include <unistd.h>
#endif
namespace recording {
#if MEDIA_SERVER_RECORDING_GENERATION_TESTING
thread_local int RecordingCutoverStageWriter::fault=0;
#endif
namespace {
bool Fail(std::string* e,const char* message){if(e)*e=message;return false;}
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
struct Fd {int value=-1;~Fd(){if(value>=0)::close(value);}};
std::string Hash(const std::string& bytes){unsigned char digest[32];unsigned length=0;
    if(EVP_Digest(bytes.data(),bytes.size(),digest,&length,EVP_sha256(),nullptr)!=1||length!=32)return {};
    std::string result;const char* hex="0123456789abcdef";for(auto c:digest){result+=hex[c>>4];result+=hex[c&15];}return result;}
int OpenDirectory(const std::filesystem::path& path){
    if(!path.is_absolute()||path!=path.lexically_normal())return -1;
    Fd current;current.value=::open("/",O_RDONLY|O_DIRECTORY|O_CLOEXEC);
    if(current.value<0)return -1;
    for(const auto& part:path.relative_path()){
        const auto name=part.string();if(name.empty()||name=="."||name=="..")return -1;
        const int next=::openat(current.value,name.c_str(),O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
        if(next<0)return -1;::close(current.value);current.value=next;
    }
    const int result=current.value;current.value=-1;return result;
}
bool Empty(int fd){Fd copy;copy.value=::dup(fd);if(copy.value<0)return false;DIR* directory=::fdopendir(copy.value);if(!directory)return false;copy.value=-1;
    bool empty=true;errno=0;while(const auto* entry=::readdir(directory)){const std::string name=entry->d_name;if(name!="."&&name!=".."){empty=false;break;}}
    if(errno)empty=false;::closedir(directory);return empty;
}
bool Write(int fd,const std::string& bytes){
#if MEDIA_SERVER_RECORDING_GENERATION_TESTING
    if(RecordingCutoverStageWriter::fault==1){RecordingCutoverStageWriter::fault=0;return false;}
#endif
    std::size_t done=0;while(done<bytes.size()){const auto n=::write(fd,bytes.data()+done,bytes.size()-done);if(n<0&&errno==EINTR)continue;if(n<=0)return false;done+=static_cast<std::size_t>(n);}return true;
}
bool Sync(int fd){
#if MEDIA_SERVER_RECORDING_GENERATION_TESTING
    if(RecordingCutoverStageWriter::fault==2){RecordingCutoverStageWriter::fault=0;return false;}
#endif
    return ::fsync(fd)==0;
}
#endif
}
struct RecordingCutoverStageWriter::State {
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    Fd root,archive;RecordingCutoverFreshStage stage;RecordingCutoverCandidateLimits limits;
    RecordingCutoverCreatedFiles* report=nullptr;std::string store;
    std::uint64_t generation=1,ordinal=0,archive_bytes=0;std::size_t archive_report=0;
    RecordingIdentityShard shard;std::optional<RecordingGenerationFile> previous;
    std::vector<RecordingGenerationFile> completed;
    bool finished=false;
    std::unique_ptr<EVP_MD_CTX,decltype(&EVP_MD_CTX_free)> archive_hash{nullptr,EVP_MD_CTX_free};
    bool Bound(std::string* error){Fd now;now.value=OpenDirectory(stage.path);struct stat a{},b{};
        return (now.value>=0&&::fstat(now.value,&a)==0&&::fstat(root.value,&b)==0&&S_ISDIR(a.st_mode)&&
            a.st_uid==::geteuid()&&static_cast<std::uint64_t>(a.st_dev)==stage.device&&static_cast<std::uint64_t>(a.st_ino)==stage.inode&&a.st_dev==b.st_dev&&a.st_ino==b.st_ino)||Fail(error,"stage directory binding changed");}
    void ObserveSize(int fd,std::size_t index){struct stat st{};auto& made=report->files[index];
        if(::fstat(fd,&st)==0&&st.st_size>=0&&static_cast<std::uint64_t>(st.st_dev)==made.device&&static_cast<std::uint64_t>(st.st_ino)==made.inode)made.size=static_cast<std::uint64_t>(st.st_size);}
    bool Create(const std::string& name,int* out,std::size_t* index,std::string* error){
        if(!Bound(error))return false;
        report->files.push_back({name,false,false,0,0,0});*index=report->files.size()-1;
        const int fd=::openat(root.value,name.c_str(),O_RDWR|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC,0600);
        if(fd<0)return Fail(error,"stage O_EXCL create failed");
        auto& made=report->files[*index];made.created=true;struct stat st{};
        if(::fstat(fd,&st)!=0||!S_ISREG(st.st_mode)||st.st_nlink!=1){::close(fd);return Fail(error,"stage created file stat failed");}
        made.device=st.st_dev;made.inode=st.st_ino;*out=fd;return true;
    }
    bool Complete(int fd,std::size_t index,std::uint64_t size,const std::string& digest,RecordingGenerationFile* out,std::string* error){
        auto& made=report->files[index];struct stat st{},named{};
        if(!Sync(fd)||!Bound(error)||::fstat(fd,&st)!=0||::fstatat(root.value,made.name.c_str(),&named,AT_SYMLINK_NOFOLLOW)!=0||
           !S_ISREG(st.st_mode)||st.st_nlink!=1||st.st_size<0||static_cast<std::uint64_t>(st.st_size)!=size||
           st.st_dev!=named.st_dev||st.st_ino!=named.st_ino||made.device!=static_cast<std::uint64_t>(st.st_dev)||made.inode!=static_cast<std::uint64_t>(st.st_ino)||digest.empty()||!Sync(root.value))
            return Fail(error,"stage file fsync/binding failed");
        made.size=size;made.complete=true;*out={made.name,size,digest};completed.push_back(*out);return true;
    }
    bool File(const std::string& name,const std::string& bytes,RecordingGenerationFile* out,std::string* error){
        Fd fd;std::size_t index=0;if(!Create(name,&fd.value,&index,error))return false;
        const bool wrote=Write(fd.value,bytes);ObserveSize(fd.value,index);
        if(!wrote)return Fail(error,"stage write failed");
        return Complete(fd.value,index,bytes.size(),Hash(bytes),out,error);
    }
    bool Seal(std::string* error){
        shard.store_id=store;shard.generation=generation;shard.previous=previous;
        if(archive.value>=0){
            // 한 archive FD를 스트리밍 SHA로 봉인한다. 전체 bytes 버퍼는 만들지 않는다.
            std::unique_ptr<EVP_MD_CTX,decltype(&EVP_MD_CTX_free)> hash(EVP_MD_CTX_new(),EVP_MD_CTX_free);
            if(!hash||EVP_DigestInit_ex(hash.get(),EVP_sha256(),nullptr)!=1)return Fail(error,"stage hash init failed");
            char buffer[65536];std::uint64_t pos=0;
            while(pos<archive_bytes){const auto n=::pread(archive.value,buffer,std::min<std::uint64_t>(sizeof(buffer),archive_bytes-pos),static_cast<off_t>(pos));
                if(n<0&&errno==EINTR)continue;if(n<=0||EVP_DigestUpdate(hash.get(),buffer,static_cast<std::size_t>(n))!=1)return Fail(error,"stage hash read failed");pos+=static_cast<std::uint64_t>(n);}
            unsigned char digest[32];unsigned length=0;if(EVP_DigestFinal_ex(hash.get(),digest,&length)!=1||length!=32)return Fail(error,"stage hash final failed");
            std::string hex;const char* digits="0123456789abcdef";for(auto c:digest){hex+=digits[c>>4];hex+=digits[c&15];}
            unsigned char intended[32];unsigned intended_size=0;
            if(!archive_hash||EVP_DigestFinal_ex(archive_hash.get(),intended,&intended_size)!=1||intended_size!=32||
                !std::equal(std::begin(digest),std::end(digest),std::begin(intended)))return Fail(error,"stage archive differs from written rows");
            RecordingGenerationFile descriptor;if(!Complete(archive.value,archive_report,archive_bytes,hex,&descriptor,error))return false;
            shard.archives={descriptor};::close(archive.value);archive.value=-1;
        }
        std::string bytes;if(!SerializeRecordingIdentityShard(shard,&bytes,error)||bytes.size()>limits.chain.max_shard_bytes)return Fail(error,"identity shard admission");
        RecordingGenerationFile descriptor;if(!File("identity-"+std::to_string(generation)+".jsonl",bytes,&descriptor,error))return false;
        previous=descriptor;return true;
    }
#endif
};
RecordingCutoverStageWriter::RecordingCutoverStageWriter():state_(new State){}
RecordingCutoverStageWriter::~RecordingCutoverStageWriter()=default;
bool RecordingCutoverStageWriter::Open(const RecordingCutoverFreshStage& stage,const std::string& store,
    const RecordingCutoverCandidateLimits& limits,RecordingCutoverCreatedFiles* report,std::string* error){
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    auto& s=*state_;if(s.root.value>=0||!report||!report->files.empty()||!limits.archive_target_bytes||!limits.archive_target_rows||
        limits.archive_target_bytes>8U*1024U*1024U||limits.archive_target_rows>4096||!limits.chain.max_shard_bytes||!limits.chain.max_unique_ids||!limits.chain.max_archives||!limits.snapshot_bytes||!limits.cold_row_bytes)
        return Fail(error,"stage options/report invalid");
    s.stage=stage;s.store=store;s.limits=limits;s.report=report;s.root.value=OpenDirectory(stage.path);
    if(s.root.value<0||!s.Bound(error)||!Empty(s.root.value))return Fail(error,"stage must be fresh bound directory");return true;
#else
    (void)stage;(void)store;(void)limits;(void)report;return Fail(error,"stage crypto/POSIX unsupported");
#endif
}
bool RecordingCutoverStageWriter::Append(const RecordingCutoverInputRow& row,std::string* error){
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    auto& s=*state_;if(s.root.value<0||s.finished||row.ordinal!=s.ordinal||row.canonical_bytes.empty()||row.canonical_bytes.back()!='\n'||row.canonical_bytes.size()>s.limits.cold_row_bytes||row.canonical_bytes.size()>1024ULL*1024*1024)
        return Fail(error,"stage row order/admission invalid");
    if(!s.shard.rows.empty()&&(s.shard.rows.size()>=s.limits.archive_target_rows||row.canonical_bytes.size()>s.limits.archive_target_bytes-std::min(s.archive_bytes,s.limits.archive_target_bytes))){
        if(!s.Seal(error)||s.generation==std::numeric_limits<std::uint64_t>::max())return false;
        ++s.generation;s.shard={};s.archive_bytes=0;
    }
    if(s.archive.value<0){
        s.archive_hash.reset(EVP_MD_CTX_new());
        if(!s.archive_hash||EVP_DigestInit_ex(s.archive_hash.get(),EVP_sha256(),nullptr)!=1||
            !s.Create("evidence-"+std::to_string(s.generation)+"-0.jsonl",&s.archive.value,&s.archive_report,error))return false;
    }
    RecordingIdentityRow identity;identity.mutation_id=row.mutation.mutation_id;identity.type=row.mutation.mutation_type;identity.entity_id=row.mutation.entity_id;
    identity.occurred_at_ms=row.mutation.occurred_at_ms;identity.global_ordinal=row.ordinal;identity.offset=s.archive_bytes;identity.length=row.canonical_bytes.size();identity.raw_sha256=Hash(row.canonical_bytes);
    identity.identity=Hash(SerializeRecordingMutationV1(row.mutation));
    if(identity.type==RecordingMutationType::EventLinkReceipt){ingress::StrictJsonObjectDocument payload;
        if(!ingress::ParseStrictJsonObjectDocument(row.mutation.payload_json,&payload,error))return false;
        const auto digest=ingress::StrictJsonStringField(payload,"originalSha256");if(!digest)return false;identity.identity=*digest;}
    if(identity.type==RecordingMutationType::RecordingOrderReserved){RecordingOrderReservationV1 tuple;if(!ParseRecordingOrderReservationV1(row.mutation.payload_json,&tuple,error))return false;identity.reservation=std::move(tuple);}
    s.shard.rows.push_back(std::move(identity));
    if(!s.Bound(error))return false;
    const bool wrote=Write(s.archive.value,row.canonical_bytes);s.ObserveSize(s.archive.value,s.archive_report);
    if(!wrote)return Fail(error,"stage archive append failed");
    if(EVP_DigestUpdate(s.archive_hash.get(),row.canonical_bytes.data(),row.canonical_bytes.size())!=1)return Fail(error,"stage archive hash update failed");
    s.archive_bytes+=row.canonical_bytes.size();if(s.ordinal==std::numeric_limits<std::uint64_t>::max())return Fail(error,"stage ordinal overflow");++s.ordinal;return true;
#else
    (void)row;return Fail(error,"stage unsupported");
#endif
}
bool RecordingCutoverStageWriter::Finish(RecordingIdentityChainResult* chain,RecordingGenerationManifest* manifest,std::string* error){
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    auto& s=*state_;if(!chain||!manifest||s.root.value<0||s.finished||!s.Seal(error))return false;s.finished=true;
    if(!ValidateRecordingIdentityShardChain(*s.previous,[&](const RecordingGenerationFile& descriptor,std::uint64_t admission,std::string* out,std::string* e){return s.Bound(e)&&ReadVerifiedRecordingGenerationImmutable(s.stage.path,descriptor,admission,out,e);},s.limits.chain,chain,error))return false;
    manifest->store_id=s.store;manifest->generation=s.generation;manifest->cut_ordinal=s.ordinal;manifest->evidence=s.shard.archives;return true;
#else
    (void)chain;(void)manifest;return Fail(error,"stage unsupported");
#endif
}
bool RecordingCutoverStageWriter::Snapshot(const RecordingCatalogSnapshot& snapshot,RecordingGenerationManifest* manifest,std::string* error){
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    auto& s=*state_;std::string bytes;if(!manifest||!s.finished||!SerializeRecordingCatalogSnapshot(snapshot,&bytes,error)||bytes.size()>s.limits.snapshot_bytes||bytes.size()>1024ULL*1024*1024)return Fail(error,"stage snapshot admission");
    return s.File("snapshot-"+std::to_string(s.generation)+".jsonl",bytes,&manifest->snapshot,error)&&s.File("active-"+std::to_string(s.generation)+".jsonl","",&manifest->active,error)&&Revalidate(error);
#else
    (void)snapshot;(void)manifest;return Fail(error,"stage unsupported");
#endif
}
bool RecordingCutoverStageWriter::Revalidate(std::string* error){
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    auto& s=*state_;if(!s.Bound(error))return false;
    for(const auto& file:s.completed){
        const auto made=std::find_if(s.report->files.begin(),s.report->files.end(),[&](const auto& v){return v.name==file.name;});
        if(made==s.report->files.end()||!made->created||!made->complete||made->size!=file.size)
            return Fail(error,"stage creation report mismatch");
        const auto same_created=[&](){
            struct stat st{};
            return ::fstatat(s.root.value,file.name.c_str(),&st,AT_SYMLINK_NOFOLLOW)==0&&
                S_ISREG(st.st_mode)&&st.st_nlink==1&&st.st_size>=0&&static_cast<std::uint64_t>(st.st_size)==file.size&&
                static_cast<std::uint64_t>(st.st_dev)==made->device&&static_cast<std::uint64_t>(st.st_ino)==made->inode;
        };
        if(!same_created())return Fail(error,"stage created inode changed");
        if(file.name.rfind("active-",0)!=0){
            std::string ignored;
            if(!ReadVerifiedRecordingGenerationImmutableRange(s.stage.path,file,0,0,0,&ignored,error))return false;
        }else if(file.size!=0)return Fail(error,"stage active is not empty");
        if(!same_created())return Fail(error,"stage created inode changed during verification");
    }
    return s.Bound(error);
#else
    return Fail(error,"stage unsupported");
#endif
}
}
