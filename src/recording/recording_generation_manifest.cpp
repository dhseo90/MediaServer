#include "recording/recording_generation_manifest.h"
#include "domain/strict_json.h"
#include <algorithm>
#include <array>
#include <cerrno>
#include <charconv>
#include <limits>
#include <memory>
#ifndef MEDIA_SERVER_USE_OPENSSL
#define MEDIA_SERVER_USE_OPENSSL 0
#endif
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#endif
#if !defined(_WIN32)
#include <fcntl.h>
#include <sys/file.h>
#include <sys/stat.h>
#include <unistd.h>
#endif

namespace recording {
namespace {
constexpr std::size_t kManifestLimit=65536, kEvidenceLimit=64;
constexpr std::uint64_t kFileLimit=1024ULL*1024*1024;
#if !defined(_WIN32) && MEDIA_SERVER_USE_OPENSSL
constexpr const char* kManifest="recording-generation.json";
constexpr const char* kStage=".recording-generation.stage";
#endif
bool Fail(std::string* error,const char* message) {
    if(error)*error=message;
    return false;
}
bool Supported(std::string* error){
#if !defined(_WIN32) && MEDIA_SERVER_USE_OPENSSL
    (void)error;return true;
#else
    return Fail(error,"generation manifest unsupported: POSIX/OpenSSL 필요");
#endif
}
bool Token(const std::string& s) {
    // 기존 저장소의 opaque ID 허용 문자를 유지한다. 구성 파일명 검사는 별도다.
    return !s.empty()&&s.size()<=128&&s!="."&&s.find("..") == std::string::npos&&
        std::all_of(s.begin(),s.end(),[](unsigned char c) {
        return (c>='a'&&c<='z')||(c>='A'&&c<='Z')||(c>='0'&&c<='9')||
            c=='-'||c=='_'||c=='.'||c==':';
    });
}
bool Hex(const std::string& s) {
    return s.size()==64&&std::all_of(s.begin(),s.end(),[](char c) {
        return (c>='0'&&c<='9')||(c>='a'&&c<='f');
    });
}
bool FileValid(const RecordingGenerationFile& f,const std::string& name) {
    return f.name==name&&f.size<=kFileLimit&&Hex(f.sha256);
}
bool Valid(const RecordingGenerationManifest& m){
    if(!Token(m.store_id)||!m.generation||m.evidence.size()>kEvidenceLimit)return false;
    const auto g=std::to_string(m.generation);
    if(!FileValid(m.snapshot,"snapshot-"+g+".jsonl")||!FileValid(m.active,"active-"+g+".jsonl"))return false;
    for(std::size_t i=0;i<m.evidence.size();++i) {
        if(!FileValid(m.evidence[i],"evidence-"+g+"-"+std::to_string(i)+".jsonl"))return false;
    }
    return true;
}
std::string FileJson(const RecordingGenerationFile& f) {
    return "{\"name\":\""+f.name+"\",\"size\":"+std::to_string(f.size)+
        ",\"sha256\":\""+f.sha256+"\"}";
}
bool Number(const ingress::StrictJsonObjectDocument& d,const char* key,std::uint64_t* n) {
    const auto* m=d.Find(key);
    if(!m||m->type!=ingress::StrictJsonType::Number||m->raw.empty())return false;
    const auto r=std::from_chars(m->raw.data(),m->raw.data()+m->raw.size(),*n);
    return r.ec==std::errc{}&&r.ptr==m->raw.data()+m->raw.size();
}
bool ParseFile(const std::string& raw,RecordingGenerationFile* f,std::string* error) {
    ingress::StrictJsonObjectDocument d;
    if(!ingress::ParseStrictJsonObjectDocument(raw,&d,error)||d.members.size()!=3)return false;
    const auto name=ingress::StrictJsonStringField(d,"name");
    const auto hash=ingress::StrictJsonStringField(d,"sha256");
    if(!name||!hash||!Number(d,"size",&f->size))return false;
    f->name=*name;
    f->sha256=*hash;
    return true;
}
#if !defined(_WIN32) && MEDIA_SERVER_USE_OPENSSL
bool CanonicalUnsigned(const std::string& text,bool positive) {
    std::uint64_t value=0;
    const auto parsed=std::from_chars(text.data(),text.data()+text.size(),value);
    return parsed.ec==std::errc{}&&parsed.ptr==text.data()+text.size()&&
        (!positive||value>0)&&text==std::to_string(value);
}
bool ImmutableName(const std::string& name) {
    if(name.size()<7||name.compare(name.size()-6,6,".jsonl")!=0)return false;
    for(const std::string prefix:{"snapshot-","identity-"}) {
        if(name.rfind(prefix,0)==0)
            return CanonicalUnsigned(name.substr(prefix.size(),name.size()-prefix.size()-6),true);
    }
    if(name.rfind("evidence-",0)!=0)return false;
    const auto separator=name.find('-',9);
    return separator!=std::string::npos&&separator<name.size()-6&&
        CanonicalUnsigned(name.substr(9,separator-9),true)&&
        CanonicalUnsigned(name.substr(separator+1,name.size()-separator-7),false);
}
bool SealedActiveName(const std::string& name,std::uint64_t current_generation) {
    constexpr std::size_t prefix=7,suffix=6;
    if(!current_generation||name.rfind("active-",0)!=0||name.size()<=prefix+suffix||
       name.compare(name.size()-suffix,suffix,".jsonl")!=0)return false;
    const auto digits=name.substr(prefix,name.size()-prefix-suffix);
    std::uint64_t generation=0;
    const auto parsed=std::from_chars(digits.data(),digits.data()+digits.size(),generation);
    return parsed.ec==std::errc{}&&parsed.ptr==digits.data()+digits.size()&&
        generation>0&&generation<current_generation&&digits==std::to_string(generation);
}
struct Fd {
    int n{-1};
    explicit Fd(int value=-1):n(value){}
    ~Fd(){if(n>=0)::close(n);}
    Fd(const Fd&)=delete;
    Fd& operator=(const Fd&)=delete;
};
bool Sync(int fd) {
    int r;
    do { r=::fsync(fd); } while(r<0&&errno==EINTR);
    return r==0;
}
int Root(const std::filesystem::path& root){
    if(!root.is_absolute()||root==root.root_path())return -1;
    for(const auto& c:root)if(c==".."||c==".")return -1;
    int fd=::open("/",O_RDONLY|O_DIRECTORY|O_CLOEXEC);
    for(const auto& c:root.relative_path()) {
        if(fd<0)return -1;
        const int next=::openat(fd,c.c_str(),O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
        ::close(fd);
        fd=next;
    }
    return fd;
}
bool Regular(int fd,struct stat* s) {
    return ::fstat(fd,s)==0&&S_ISREG(s->st_mode)&&s->st_nlink==1&&s->st_size>=0;
}
bool Same(int root,const char* name,int fd,const struct stat& initial) {
    struct stat a{},b{};
    return Regular(fd,&a)&&::fstatat(root,name,&b,AT_SYMLINK_NOFOLLOW)==0&&
        S_ISREG(b.st_mode)&&b.st_nlink==1&&a.st_dev==initial.st_dev&&
        a.st_ino==initial.st_ino&&a.st_size==initial.st_size&&
        b.st_dev==a.st_dev&&b.st_ino==a.st_ino&&b.st_size==a.st_size;
}
bool RootSame(const std::filesystem::path& path,int fd) {
    Fd fresh(Root(path));
    struct stat a{},b{};
    return fresh.n>=0&&::fstat(fd,&a)==0&&::fstat(fresh.n,&b)==0&&
        a.st_dev==b.st_dev&&a.st_ino==b.st_ino;
}
bool Lock(int root,Fd& lock) {
    lock.n=::openat(root,".recording-generation.lock",
        O_RDWR|O_CREAT|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK,0600);
    struct stat s{};
    return lock.n>=0&&Regular(lock.n,&s)&&s.st_size==0&&
        ::flock(lock.n,LOCK_EX|LOCK_NB)==0&&Same(root,".recording-generation.lock",lock.n,s);
}
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
thread_local std::uint64_t archive_reads=0;
#endif
bool Verify(int root,const RecordingGenerationFile& f,bool durable,bool prefix=false,std::uint64_t* tail=nullptr){
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
    if(f.name.rfind("evidence-",0)==0)++archive_reads;
#endif
    Fd fd(::openat(root,f.name.c_str(),O_RDONLY|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK));struct stat s{};
    if(fd.n<0||!Regular(fd.n,&s))return false;
    const auto actual=static_cast<std::uint64_t>(s.st_size);
    if(prefix?actual<f.size:actual!=f.size)return false;
    std::unique_ptr<EVP_MD_CTX,decltype(&EVP_MD_CTX_free)> ctx(EVP_MD_CTX_new(),EVP_MD_CTX_free);
    if(!ctx||EVP_DigestInit_ex(ctx.get(),EVP_sha256(),nullptr)!=1)return false;
    std::array<char,65536> block{};
    std::uint64_t pos=0;
    while(pos<f.size) {
        ssize_t n;
        const auto wanted=static_cast<std::size_t>(std::min<std::uint64_t>(block.size(),f.size-pos));
        do { n=::pread(fd.n,block.data(),wanted,static_cast<off_t>(pos)); } while(n<0&&errno==EINTR);
        if(n<=0||EVP_DigestUpdate(ctx.get(),block.data(),static_cast<std::size_t>(n))!=1)return false;
        pos+=static_cast<std::uint64_t>(n);
    }
    unsigned char digest[32];
    unsigned len=0;
    if(EVP_DigestFinal_ex(ctx.get(),digest,&len)!=1||len!=32)return false;
    std::string hash;
    constexpr char hex[]="0123456789abcdef";
    for(auto c:digest) { hash+=hex[c>>4]; hash+=hex[c&15]; }
    if(hash!=f.sha256||(durable&&!Sync(fd.n))||!Same(root,f.name.c_str(),fd.n,s))return false;
    if(tail)*tail=actual-f.size;
    return true;
}
bool VerifyComponents(int root,const RecordingGenerationManifest& m,bool durable,
    bool verify_evidence,std::uint64_t* tail=nullptr) {
    if(!Verify(root,m.snapshot,durable)||!Verify(root,m.active,durable,true,tail))return false;
    if(verify_evidence)
        for(const auto& f:m.evidence)if(!Verify(root,f,durable))return false;
    return true;
}
bool VerifyAll(int root,const RecordingGenerationManifest& m,bool durable=false,std::uint64_t* tail=nullptr) {
    return VerifyComponents(root,m,durable,true,tail);
}
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
thread_local bool fail_directory_sync=false;
thread_local void (*immutable_before_binding)()=nullptr;
thread_local void (*checkpoint_before_binding)()=nullptr;
#endif
bool SyncPublishedDirectory(int fd){
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
    if(fail_directory_sync) {
        fail_directory_sync=false;
        errno=EIO;
        return false;
    }
#endif
    return Sync(fd);
}
bool ReadAtRoot(int root,RecordingGenerationManifest* out,std::string* error,
    std::uint64_t* tail=nullptr,bool verify_evidence=true){
    Fd fd(::openat(root,kManifest,O_RDONLY|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK));struct stat s{};
    if(fd.n<0||!Regular(fd.n,&s)||s.st_size<=0||static_cast<std::uint64_t>(s.st_size)>kManifestLimit)return Fail(error,"manifest read unsafe/size");
    std::string raw(static_cast<std::size_t>(s.st_size),'\0');
    std::size_t pos=0;
    while(pos<raw.size()) {
        ssize_t n;
        do { n=::pread(fd.n,raw.data()+pos,raw.size()-pos,static_cast<off_t>(pos)); } while(n<0&&errno==EINTR);
        if(n<=0)return Fail(error,"manifest read incomplete");
        pos+=static_cast<std::size_t>(n);
    }
    RecordingGenerationManifest m;
    if(!Same(root,kManifest,fd.n,s)||!ParseRecordingGenerationManifest(raw,&m,error)||
       !VerifyComponents(root,m,false,verify_evidence,tail))return Fail(error,"manifest/content validation failed");
    *out=std::move(m);return true;
}
#endif
} // namespace
bool SerializeRecordingGenerationManifest(const RecordingGenerationManifest& m,std::string* out,std::string* error){
    if(!Supported(error))return false;
    if(!out||!Valid(m))return Fail(error,"manifest field/name/size invalid");
    std::string s="{\"schema\":\"media-server.recording-generation.v1\",\"storeId\":\""+
        m.store_id+"\",\"generation\":"+std::to_string(m.generation)+
        ",\"cutOrdinal\":"+std::to_string(m.cut_ordinal)+",\"snapshot\":"+FileJson(m.snapshot)+
        ",\"active\":"+FileJson(m.active)+",\"evidence\":[";
    for(std::size_t i=0;i<m.evidence.size();++i) {
        if(i)s+=',';
        s+=FileJson(m.evidence[i]);
    }
    s+="]}\n";
    if(s.size()>kManifestLimit)return Fail(error,"manifest size limit");
    *out=std::move(s);
    if(error)error->clear();
    return true;
}
bool ParseRecordingGenerationManifest(const std::string& raw,RecordingGenerationManifest* out,std::string* error){
    if(!Supported(error))return false;
    if(!out||raw.size()>kManifestLimit)return Fail(error,"manifest output/size invalid");
    ingress::StrictJsonObjectDocument d;
    RecordingGenerationManifest m;
    if(!ingress::ParseStrictJsonObjectDocument(raw,&d,error)||d.members.size()!=7||
       ingress::StrictJsonStringField(d,"schema")!="media-server.recording-generation.v1")
        return Fail(error,"manifest schema invalid");
    const auto id=ingress::StrictJsonStringField(d,"storeId");
    const auto snapshot=ingress::StrictJsonObjectField(d,"snapshot");
    const auto active=ingress::StrictJsonObjectField(d,"active");
    const auto* list=d.Find("evidence");
    if(!id||!snapshot||!active||!list||list->type!=ingress::StrictJsonType::Array||
       !Number(d,"generation",&m.generation)||!Number(d,"cutOrdinal",&m.cut_ordinal)||
       !ParseFile(*snapshot,&m.snapshot,error)||!ParseFile(*active,&m.active,error))
        return Fail(error,"manifest fields invalid");
    m.store_id=*id;
    const auto& a=list->raw;
    std::size_t start=1;
    int depth=0;
    bool quote=false,escape=false;
    const auto append=[&](std::size_t end) {
        RecordingGenerationFile f;
        if(m.evidence.size()>=kEvidenceLimit||!ParseFile(a.substr(start,end-start),&f,error))
            return Fail(error,"manifest evidence invalid");
        m.evidence.push_back(std::move(f));
        return true;
    };
    for(std::size_t i=1;i+1<a.size();++i) {
        const char c=a[i];
        if(quote) {
            if(escape)escape=false;
            else if(c=='\\')escape=true;
            else if(c=='"')quote=false;
        } else if(c=='"')quote=true;
        else if(c=='{')++depth;
        else if(c=='}')--depth;
        else if(c==','&&depth==0) {
            if(!append(i))return false;
            start=i+1;
        }
    }
    if(a.size()>2&&!append(a.size()-1))return false;
    std::string canonical;
    if(!SerializeRecordingGenerationManifest(m,&canonical,error)||canonical!=raw)
        return Fail(error,"manifest noncanonical/invalid");
    *out=std::move(m);
    return true;
}
static RecordingGenerationPublishResult PublishManifest(const std::filesystem::path& root,const RecordingGenerationManifest& m,std::string* error,
    const std::string* predecessor=nullptr,const RecordingGenerationFile* identity=nullptr,std::uint64_t device=0,std::uint64_t inode=0,
    std::uint64_t* stage_device=nullptr,std::uint64_t* stage_inode=nullptr){
    using Result=RecordingGenerationPublishResult;
    std::string bytes;
    if(!SerializeRecordingGenerationManifest(m,&bytes,error))return Result::NotPublished;
#if !defined(_WIN32) && MEDIA_SERVER_USE_OPENSSL
    const auto reject=[&](const char* reason) {
        Fail(error,reason);
        return Result::NotPublished;
    };
    Fd dir(Root(root)),lock;
    if(dir.n<0||!Lock(dir.n,lock))return reject("manifest root/lock unsafe");
    struct stat root_status{};
    if(predecessor&&(::fstat(dir.n,&root_status)!=0||static_cast<std::uint64_t>(root_status.st_dev)!=device||root_status.st_ino!=inode))return reject("checkpoint root authority mismatch");
    const auto prior_exact=[&]() {
        if(!predecessor)return true;
        Fd file(::openat(dir.n,kManifest,O_RDONLY|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK));struct stat status{};
        if(file.n<0||!Regular(file.n,&status)||static_cast<std::uint64_t>(status.st_size)!=predecessor->size())return false;
        std::string raw(predecessor->size(),'\0');std::size_t pos=0;
        while(pos<raw.size()){ssize_t n;do{n=::pread(file.n,raw.data()+pos,raw.size()-pos,pos);}while(n<0&&errno==EINTR);if(n<=0)return false;pos+=n;}
        return raw==*predecessor&&Same(dir.n,kManifest,file.n,status);
    };
    struct stat existing{};
    const int exists=::fstatat(dir.n,kManifest,&existing,AT_SYMLINK_NOFOLLOW);
    if(exists==0) {
        RecordingGenerationManifest previous;
        if(!(predecessor?(prior_exact()&&ParseRecordingGenerationManifest(*predecessor,&previous,error)):ReadAtRoot(dir.n,&previous,error))||previous.store_id!=m.store_id||
           previous.generation>=m.generation||previous.cut_ordinal>m.cut_ordinal)
            return reject("manifest prior generation/store/cut invalid");
    } else if(predecessor||errno!=ENOENT)return reject("manifest prior stat failed");
    if(identity&&(!m.evidence.empty()||identity->name!="identity-"+std::to_string(m.generation)+".jsonl"||!Verify(dir.n,*identity,true)))return reject("checkpoint new identity invalid");
    if(!VerifyAll(dir.n,m,true)||!RootSame(root,dir.n))return reject("manifest components invalid");
    Fd stage(::openat(dir.n,kStage,O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC,0600));
    if(stage.n<0)return reject("manifest pending stage preserved");
    struct stat staged{};
    if(!Regular(stage.n,&staged))return reject("manifest stage invalid; preserved");
    if(stage_device)*stage_device=staged.st_dev;
    if(stage_inode)*stage_inode=staged.st_ino;
    std::size_t pos=0;
    while(pos<bytes.size()) {
        ssize_t n;
        do { n=::write(stage.n,bytes.data()+pos,bytes.size()-pos); } while(n<0&&errno==EINTR);
        if(n<=0)return reject("manifest stage write failed; preserved");
        pos+=static_cast<std::size_t>(n);
    }
    if(!Sync(stage.n))return reject("manifest stage fsync failed; preserved");
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
    if(predecessor){const auto hook=checkpoint_before_binding;checkpoint_before_binding=nullptr;if(hook)hook();}
#endif
    if(!Regular(stage.n,&staged)||!Same(dir.n,kStage,stage.n,staged)||
       !VerifyAll(dir.n,m,true)||(identity&&!Verify(dir.n,*identity,true))||!RootSame(root,dir.n))
        return reject("manifest stage validation/fsync failed; preserved");
    struct stat current{};
    const int now=::fstatat(dir.n,kManifest,&current,AT_SYMLINK_NOFOLLOW);
    const bool prior_changed=exists==0&&
        (now!=0||current.st_dev!=existing.st_dev||current.st_ino!=existing.st_ino||
         current.st_size!=existing.st_size);
    if(prior_changed||!prior_exact()||(exists!=0&&(now==0||errno!=ENOENT)))
        return reject("manifest prior changed; stage preserved");
    if(::renameat(dir.n,kStage,dir.n,kManifest)!=0)return reject("manifest rename failed; stage preserved");
    if(!SyncPublishedDirectory(dir.n)||!RootSame(root,dir.n)||!Same(dir.n,kManifest,stage.n,staged)) {
        Fail(error,"manifest durability uncertain: stop writes and reopen");
        return Result::DurabilityUncertain;
    }
    if(error)error->clear();
    return Result::Published;
#else
    (void)root;(void)predecessor;(void)identity;(void)device;(void)inode;(void)stage_device;(void)stage_inode;return Result::NotPublished;
#endif
}
RecordingGenerationPublishResult PublishRecordingGenerationManifest(const std::filesystem::path& root,const RecordingGenerationManifest& m,std::string* error) {
    return PublishManifest(root,m,error);
}
RecordingGenerationPublishResult PublishRecordingGenerationCheckpoint(const std::filesystem::path& root,
    const RecordingGenerationManifest& m,RecordingGenerationPublication& authority,std::string* error) {
    if(authority.consumed){Fail(error,"checkpoint publication already consumed");return RecordingGenerationPublishResult::NotPublished;}
    authority.consumed=true;
    return PublishManifest(root,m,error,&authority.predecessor,&authority.identity,authority.root_device,authority.root_inode,
        &authority.stage_device,&authority.stage_inode);
}
bool ReadRecordingGenerationManifest(const std::filesystem::path& root,RecordingGenerationReadResult* out,std::string* error){
    if(!Supported(error)||!out)return false;
#if !defined(_WIN32) && MEDIA_SERVER_USE_OPENSSL
    Fd dir(Root(root)),lock;
    RecordingGenerationReadResult result;
    if(dir.n<0||!Lock(dir.n,lock)||!ReadAtRoot(dir.n,&result.manifest,error,&result.active_tail_bytes)||
       !RootSame(root,dir.n))return Fail(error,"manifest read/binding failed");
    *out=std::move(result);
    return true;
#else
    (void)root;return false;
#endif
}
bool ReadRecordingGenerationManifestForOpen(const std::filesystem::path& root,
    RecordingGenerationReadResult* out,std::string* error) {
    if(!Supported(error)||!out)return false;
#if !defined(_WIN32) && MEDIA_SERVER_USE_OPENSSL
    Fd dir(Root(root)),lock;
    RecordingGenerationReadResult result;
    result.validation=RecordingGenerationValidation::OpenComponentsOnly;
    if(dir.n<0||!Lock(dir.n,lock)||
       !ReadAtRoot(dir.n,&result.manifest,error,&result.active_tail_bytes,false)||
       !RootSame(root,dir.n))return Fail(error,"manifest open components/binding failed");
    *out=std::move(result);
    return true;
#else
    (void)root;return false;
#endif
}
bool ReadVerifiedRecordingGenerationImmutable(const std::filesystem::path& root,
    const RecordingGenerationFile& descriptor,std::uint64_t byte_admission,std::string* output,std::string* error) {
    if(!Supported(error))return false;
    if(!byte_admission)return Fail(error,"immutable descriptor/admission invalid");
    return ReadVerifiedRecordingGenerationImmutableRange(root,descriptor,0,descriptor.size,byte_admission,output,error);
}
static bool ReadVerifiedGenerationRange(const std::filesystem::path& root,
    const RecordingGenerationFile& descriptor,std::uint64_t offset,std::uint64_t length,
    std::uint64_t result_admission,bool sealed_active,std::uint64_t current_generation,
    std::string* output,std::string* error) {
    if(!Supported(error))return false;
#if !defined(_WIN32) && MEDIA_SERVER_USE_OPENSSL
 #if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
    if(sealed_active||descriptor.name.rfind("evidence-",0)==0)++archive_reads;
 #endif
    if(!output||length>result_admission||descriptor.size>kFileLimit||offset>descriptor.size||
       length>descriptor.size-offset||length>std::numeric_limits<std::size_t>::max()||
       descriptor.size>static_cast<std::uint64_t>(std::numeric_limits<off_t>::max())||
       !Hex(descriptor.sha256)||(sealed_active ?
           !SealedActiveName(descriptor.name,current_generation) : !ImmutableName(descriptor.name)))
        return Fail(error,"immutable descriptor/admission invalid");
    try {
        Fd dir(Root(root));
        if(dir.n<0)return Fail(error,"immutable root unsafe");
        Fd file(::openat(dir.n,descriptor.name.c_str(),O_RDONLY|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK));
        struct stat before{};
        if(file.n<0||!Regular(file.n,&before)||static_cast<std::uint64_t>(before.st_size)!=descriptor.size||
           !Same(dir.n,descriptor.name.c_str(),file.n,before)||!RootSame(root,dir.n))
            return Fail(error,"immutable file binding/size invalid");
        std::string bytes(static_cast<std::size_t>(length),'\0');
        std::array<char,65536> block{};
        std::unique_ptr<EVP_MD_CTX,decltype(&EVP_MD_CTX_free)> digest(EVP_MD_CTX_new(),EVP_MD_CTX_free);
        if(!digest||EVP_DigestInit_ex(digest.get(),EVP_sha256(),nullptr)!=1)return Fail(error,"immutable digest initialization failed");
        std::uint64_t position=0;
        const auto end=offset+length; // 범위 검사 후이므로 overflow가 없다.
        while(position<descriptor.size) {
            const auto wanted=static_cast<std::size_t>(std::min<std::uint64_t>(block.size(),descriptor.size-position));
            ssize_t count;
            do { count=::pread(file.n,block.data(),wanted,static_cast<off_t>(position)); } while(count<0&&errno==EINTR);
            if(count<=0||EVP_DigestUpdate(digest.get(),block.data(),static_cast<std::size_t>(count))!=1)
                return Fail(error,"immutable read/digest failed");
            const auto next=position+static_cast<std::uint64_t>(count);
            const auto first=std::max(position,offset),last=std::min(next,end);
            if(first<last)std::copy_n(block.data()+static_cast<std::size_t>(first-position),
                static_cast<std::size_t>(last-first),bytes.data()+static_cast<std::size_t>(first-offset));
            position=next;
        }
        unsigned char hash_bytes[32];unsigned digest_length=0;
        if(EVP_DigestFinal_ex(digest.get(),hash_bytes,&digest_length)!=1||digest_length!=32)return Fail(error,"immutable digest final failed");
        constexpr char hex[]="0123456789abcdef";
        std::string hash;
        for(auto c:hash_bytes){hash+=hex[c>>4];hash+=hex[c&15];}
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
        const auto hook=immutable_before_binding;immutable_before_binding=nullptr;
        if(hook)hook();
#endif
        struct stat after{};
        if(hash!=descriptor.sha256||!Regular(file.n,&after)||
           !Same(dir.n,descriptor.name.c_str(),file.n,before)||!RootSame(root,dir.n))
            return Fail(error,"immutable hash/final binding mismatch");
#if defined(__APPLE__)
        const bool unchanged=before.st_mtimespec.tv_sec==after.st_mtimespec.tv_sec&&before.st_mtimespec.tv_nsec==after.st_mtimespec.tv_nsec&&
            before.st_ctimespec.tv_sec==after.st_ctimespec.tv_sec&&before.st_ctimespec.tv_nsec==after.st_ctimespec.tv_nsec;
#else
        const bool unchanged=before.st_mtim.tv_sec==after.st_mtim.tv_sec&&before.st_mtim.tv_nsec==after.st_mtim.tv_nsec&&
            before.st_ctim.tv_sec==after.st_ctim.tv_sec&&before.st_ctim.tv_nsec==after.st_ctim.tv_nsec;
#endif
        if(!unchanged)return Fail(error,"immutable content changed during read");
        *output=std::move(bytes);
        if(error)error->clear();
        return true;
    } catch(...) {return Fail(error,"immutable read resource failure");}
#else
    (void)root;(void)descriptor;(void)offset;(void)length;(void)result_admission;
    (void)sealed_active;(void)current_generation;(void)output;
    return false;
#endif
}
bool ReadVerifiedRecordingGenerationImmutableRange(const std::filesystem::path& root,
    const RecordingGenerationFile& descriptor,std::uint64_t offset,std::uint64_t length,
    std::uint64_t result_admission,std::string* output,std::string* error) {
    return ReadVerifiedGenerationRange(root,descriptor,offset,length,result_admission,false,0,output,error);
}
bool ReadVerifiedRecordingGenerationSealedActiveRange(const std::filesystem::path& root,
    const RecordingGenerationFile& descriptor,std::uint64_t current_generation,
    std::uint64_t offset,std::uint64_t length,std::uint64_t result_admission,
    std::string* output,std::string* error) {
    return ReadVerifiedGenerationRange(root,descriptor,offset,length,result_admission,true,
        current_generation,output,error);
}
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
void RecordingGenerationCheckpointBeforeBindingForTest(void (*hook)()){
#if !defined(_WIN32) && MEDIA_SERVER_USE_OPENSSL
    checkpoint_before_binding=hook;
#else
    (void)hook;
#endif
}
std::uint64_t RecordingGenerationArchiveReadsForTest(bool reset){
#if !defined(_WIN32) && MEDIA_SERVER_USE_OPENSSL
    const auto value=archive_reads;if(reset)archive_reads=0;return value;
#else
    (void)reset;return 0;
#endif
}
void RecordingGenerationImmutableBeforeBindingForTest(void (*hook)()){
#if !defined(_WIN32) && MEDIA_SERVER_USE_OPENSSL
    immutable_before_binding=hook;
#else
    (void)hook;
#endif
}
void RecordingGenerationFailNextDirectorySyncForTest(){
#if !defined(_WIN32) && MEDIA_SERVER_USE_OPENSSL
    fail_directory_sync=true;
#endif
}
#endif
} // namespace recording
