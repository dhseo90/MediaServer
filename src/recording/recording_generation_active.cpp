// 파일 용도: 현재 녹화 세대 active 행의 읽기와 무결성 검증을 구현한다.
#include "recording/recording_generation_active.h"
#include <algorithm>
#include <array>
#include <cerrno>
#include <limits>
#include <memory>
#ifndef MEDIA_SERVER_USE_OPENSSL
#define MEDIA_SERVER_USE_OPENSSL 0
#endif
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
#include <openssl/evp.h>
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>
#endif

namespace recording {
namespace {
bool Fail(std::string* error,const char* message) {
    if(error)*error=message;
    return false;
}
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
struct Fd {
    int value{-1};
    explicit Fd(int fd):value(fd){}
    ~Fd(){if(value>=0)::close(value);}
    Fd(const Fd&)=delete;
    Fd& operator=(const Fd&)=delete;
};
int OpenRoot(const std::filesystem::path& root) {
    if(!root.is_absolute()||root==root.root_path())return -1;
    for(const auto& part:root)if(part=="."||part=="..")return -1;
    int fd=::open("/",O_RDONLY|O_DIRECTORY|O_CLOEXEC);
    for(const auto& part:root.relative_path()) {
        if(fd<0)return -1;
        const int next=::openat(fd,part.c_str(),O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
        ::close(fd);fd=next;
    }
    return fd;
}
bool Regular(int fd,struct stat* result) {
    return ::fstat(fd,result)==0&&S_ISREG(result->st_mode)&&result->st_nlink==1&&result->st_size>=0;
}
bool SameStat(const struct stat& a,const struct stat& b) {
    if(a.st_dev!=b.st_dev||a.st_ino!=b.st_ino||a.st_size!=b.st_size||a.st_nlink!=b.st_nlink)return false;
#if defined(__APPLE__)
    return a.st_mtimespec.tv_sec==b.st_mtimespec.tv_sec&&a.st_mtimespec.tv_nsec==b.st_mtimespec.tv_nsec&&
        a.st_ctimespec.tv_sec==b.st_ctimespec.tv_sec&&a.st_ctimespec.tv_nsec==b.st_ctimespec.tv_nsec;
#else
    return a.st_mtim.tv_sec==b.st_mtim.tv_sec&&a.st_mtim.tv_nsec==b.st_mtim.tv_nsec&&
        a.st_ctim.tv_sec==b.st_ctim.tv_sec&&a.st_ctim.tv_nsec==b.st_ctim.tv_nsec;
#endif
}
bool Bound(int root,const std::string& name,int fd,const struct stat& original) {
    struct stat current{},named{};
    return Regular(fd,&current)&&::fstatat(root,name.c_str(),&named,AT_SYMLINK_NOFOLLOW)==0&&
        S_ISREG(named.st_mode)&&named.st_nlink==1&&SameStat(original,current)&&SameStat(current,named);
}
bool RootBound(const std::filesystem::path& root,int fd) {
    Fd fresh(OpenRoot(root));struct stat a{},b{};
    return fresh.value>=0&&::fstat(fd,&a)==0&&::fstat(fresh.value,&b)==0&&a.st_dev==b.st_dev&&a.st_ino==b.st_ino;
}
bool ReadBytes(int fd,std::uint64_t length,std::string* bytes) {
    bytes->resize(static_cast<std::size_t>(length));std::uint64_t offset=0;
    while(offset<length) {
        const auto wanted=static_cast<std::size_t>(std::min<std::uint64_t>(65536,length-offset));
        ssize_t count;
        do {count=::pread(fd,bytes->data()+offset,wanted,static_cast<off_t>(offset));}while(count<0&&errno==EINTR);
        if(count<=0)return false;
        offset+=static_cast<std::uint64_t>(count);
    }
    return true;
}
std::string Hash(const char* bytes,std::size_t length) {
    unsigned char digest[32];unsigned size=0;
    if(EVP_Digest(bytes,length,digest,&size,EVP_sha256(),nullptr)!=1||size!=32)return {};
    constexpr char hex[]="0123456789abcdef";std::string result;
    for(const auto c:digest){result+=hex[c>>4];result+=hex[c&15];}
    return result;
}
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
thread_local void (*before_binding)()=nullptr;
#endif
#endif
}
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
void RecordingGenerationActiveBeforeBindingForTest(void (*hook)()) {
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    before_binding=hook;
#else
    (void)hook;
#endif
}
#endif

bool ReadRecordingGenerationActive(const std::filesystem::path& root,std::uint64_t admission,
    RecordingGenerationActiveReadResult* output,std::string* error) {
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    try {
        if(!output)return Fail(error,"active output missing");
        Fd directory(OpenRoot(root));
        if(directory.value<0)return Fail(error,"active root unsafe");
        Fd manifest_fd(::openat(directory.value,"recording-generation.json",O_RDONLY|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK));
        struct stat manifest_stat{};
        if(manifest_fd.value<0||!Regular(manifest_fd.value,&manifest_stat)||manifest_stat.st_size>65536)
            return Fail(error,"active manifest binding invalid");
        std::string manifest_bytes,canonical;
        RecordingGenerationManifest manifest;
        if(!ReadBytes(manifest_fd.value,static_cast<std::uint64_t>(manifest_stat.st_size),&manifest_bytes)||
            !ParseRecordingGenerationManifest(manifest_bytes,&manifest,error))
            return Fail(error,"active manifest changed");
        Fd active(::openat(directory.value,manifest.active.name.c_str(),O_RDONLY|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK));
        struct stat initial{};
        if(active.value<0||!Regular(active.value,&initial))return Fail(error,"active file unsafe");
        const auto size=static_cast<std::uint64_t>(initial.st_size);
        if(size<manifest.active.size||size>admission||size>std::numeric_limits<std::size_t>::max())
            return Fail(error,"active size/admission exceeded");
        // admission 거부 전에는 active prefix조차 읽지 않는다. Open용 검증은 evidence를 열지 않는다.
        RecordingGenerationReadResult verified;
        if(!ReadRecordingGenerationManifestForOpen(root,&verified,error)||
            !SerializeRecordingGenerationManifest(verified.manifest,&canonical,error)||canonical!=manifest_bytes)
            return Fail(error,"active verified manifest changed");
        RecordingGenerationActiveReadResult result;result.manifest=manifest;
        using Digest=std::unique_ptr<EVP_MD_CTX,decltype(&EVP_MD_CTX_free)>;
        Digest whole(EVP_MD_CTX_new(),EVP_MD_CTX_free),prefix(EVP_MD_CTX_new(),EVP_MD_CTX_free);
        if(!whole||!prefix||EVP_DigestInit_ex(whole.get(),EVP_sha256(),nullptr)!=1||
           EVP_DigestInit_ex(prefix.get(),EVP_sha256(),nullptr)!=1)return Fail(error,"active digest initialization failure");
        const auto finish=[](EVP_MD_CTX* ctx){
            unsigned char digest[32];unsigned length=0;std::string value;
            if(EVP_DigestFinal_ex(ctx,digest,&length)!=1||length!=32)return value;
            constexpr char hex[]="0123456789abcdef";
            for(const auto byte:digest){value+=hex[byte>>4];value+=hex[byte&15];}return value;
        };
        std::array<char,65536> buffer{};std::string line;std::uint64_t offset=0,row_offset=0;
        bool prefix_boundary=manifest.active.size==0;
        while(offset<size){
            const auto wanted=static_cast<std::size_t>(std::min<std::uint64_t>(buffer.size(),size-offset));
            ssize_t received;do{received=::pread(active.value,buffer.data(),wanted,static_cast<off_t>(offset));}while(received<0&&errno==EINTR);
            if(received<=0)return Fail(error,"active short read");
            const auto count=static_cast<std::size_t>(received);
            if(EVP_DigestUpdate(whole.get(),buffer.data(),count)!=1)return Fail(error,"active digest update failure");
            if(offset<manifest.active.size){const auto n=static_cast<std::size_t>(std::min<std::uint64_t>(count,manifest.active.size-offset));
                if(EVP_DigestUpdate(prefix.get(),buffer.data(),n)!=1)return Fail(error,"active prefix digest update failure");
                if(offset+n==manifest.active.size)prefix_boundary=buffer[n-1]=='\n';}
            for(std::size_t i=0;i<count;++i){
                line+=buffer[i];if(buffer[i]!='\n')continue;
                if(line.size()==1)return Fail(error,"active incomplete/empty row");
                RecordingGenerationActiveRow row;row.offset=row_offset;row.length=line.size();row.raw_sha256=Hash(line.data(),line.size());
                line.pop_back();
                if(row.raw_sha256.empty()||!ParseRecordingMutationV1(line,&row.mutation,error)||
                   (row.mutation.physical_json.empty()?SerializeRecordingMutationV1(row.mutation):row.mutation.physical_json)!=line)
                    return Fail(error,"active noncanonical/invalid envelope");
                if(result.rows.size()>std::numeric_limits<std::uint64_t>::max()-manifest.cut_ordinal)return Fail(error,"active ordinal overflow");
                row.global_ordinal=manifest.cut_ordinal+result.rows.size();row_offset+=row.length;
                result.rows.push_back(std::move(row));line.clear();
            }
            offset+=count;
        }
        if(!line.empty())return Fail(error,"active incomplete/empty row");
        if(!prefix_boundary)return Fail(error,"active prefix is not a complete row boundary");
        if(finish(prefix.get())!=manifest.active.sha256)return Fail(error,"active read/prefix hash mismatch");
        result.active_file={manifest.active.name,size,finish(whole.get())};
        if(result.active_file.sha256.empty())return Fail(error,"active digest failure");
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
        const auto hook=before_binding;before_binding=nullptr;if(hook)hook();
#endif
        if(!Bound(directory.value,manifest.active.name,active.value,initial)||
            !Bound(directory.value,"recording-generation.json",manifest_fd.value,manifest_stat)||!RootBound(root,directory.value))
            return Fail(error,"active file/manifest/root changed");
        *output=std::move(result);if(error)error->clear();return true;
    }catch(...){return Fail(error,"active allocation/read failure");}
#else
    (void)root;(void)admission;(void)output;
    return Fail(error,"generation active unsupported: POSIX/OpenSSL required");
#endif
}
} // namespace recording
