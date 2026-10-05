// 파일 용도: 소유권/크기/링크를 확인한 단일 파일 패키지 저장과 streaming hash 검증.
#include "recording/evidence_package_store.h"
#include <algorithm>
#include <array>
#include <cerrno>
#include <cstring>
#include <dirent.h>
#include <fcntl.h>
#include <stdexcept>
#include <sys/file.h>
#include <sys/stat.h>
#include <sys/statvfs.h>
#include <unistd.h>
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#endif

namespace recording {
namespace {
constexpr std::array<unsigned char,8> magic{{'M','S','E','V','P','0','1','\n'}};
constexpr const char* pending = ".pending-evp-v1";
bool Fail(std::string* error, const char* code) { if (error) *error = code; return false; }
struct Fd { int value{-1}; ~Fd() { if (value >= 0) ::close(value); } };
bool SafeFile(int fd, struct stat* output, bool single_link = true) {
    struct stat st{};
    if (fd < 0 || ::fstat(fd,&st) || !S_ISREG(st.st_mode) || st.st_uid != ::geteuid() ||
        (st.st_mode & 0077) || st.st_size < 0 || (single_link && st.st_nlink != 1)) return false;
    if (output) *output = st; return true;
}
bool SameTimes(const struct stat& a,const struct stat& b) {
#ifdef __APPLE__
    return a.st_mtimespec.tv_sec==b.st_mtimespec.tv_sec && a.st_mtimespec.tv_nsec==b.st_mtimespec.tv_nsec &&
        a.st_ctimespec.tv_sec==b.st_ctimespec.tv_sec && a.st_ctimespec.tv_nsec==b.st_ctimespec.tv_nsec;
#else
    return a.st_mtim.tv_sec==b.st_mtim.tv_sec && a.st_mtim.tv_nsec==b.st_mtim.tv_nsec &&
        a.st_ctim.tv_sec==b.st_ctim.tv_sec && a.st_ctim.tv_nsec==b.st_ctim.tv_nsec;
#endif
}
int Directory(const std::filesystem::path& input, bool create) {
    if (input.empty()) return -1;
    for (const auto& part : input) if (part == ".." || part.string().find('\0') != std::string::npos) return -1;
    std::error_code error; auto path = std::filesystem::absolute(input,error).lexically_normal(); if (error) return -1;
#ifdef __APPLE__
    const auto text = path.string();
    if (text == "/tmp" || text.rfind("/tmp/",0) == 0 || text == "/var" || text.rfind("/var/",0) == 0) path = "/private" + text;
#endif
    Fd current{::open("/",O_RDONLY|O_DIRECTORY|O_CLOEXEC)};
    if (current.value < 0) return -1;
    const auto relative = path.relative_path();
    for (auto it = relative.begin(); it != relative.end(); ++it) {
        if (it->empty() || *it == ".") continue;
        auto next_it = it; ++next_it;
        int next = ::openat(current.value,it->c_str(),O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);
        if (next < 0 && errno == ENOENT && create && next_it == relative.end()) {
            if (::mkdirat(current.value,it->c_str(),0700) && errno != EEXIST) return -1;
            if (::fsync(current.value)) return -1;
            next = ::openat(current.value,it->c_str(),O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW);
        }
        if (next < 0) return -1; ::close(current.value); current.value = next;
    }
    struct stat st{};
    if (::fstat(current.value,&st) || st.st_uid != ::geteuid() || (st.st_mode & 0077)) { errno=EPERM; return -1; }
    const int result = current.value; current.value = -1; return result;
}
bool Transfer(int fd, void* bytes, std::size_t count, std::uint64_t offset, bool writing,
    const std::function<bool()>& cancelled) {
    auto* data = static_cast<unsigned char*>(bytes);
    while (count) {
        if (cancelled && cancelled()) return false;
        const auto step = std::min<std::size_t>(count,65536);
        const auto n = writing ? ::pwrite(fd,data,step,static_cast<off_t>(offset)) : ::pread(fd,data,step,static_cast<off_t>(offset));
        if (n < 0 && errno == EINTR) continue;
        if (n <= 0) return false; data += n; count -= std::size_t(n); offset += std::uint64_t(n);
    }
    return true;
}
std::array<unsigned char,8> Length(std::uint64_t n) {
    std::array<unsigned char,8> b{}; for (unsigned i=0;i<8;++i) b[i]=static_cast<unsigned char>(n>>(8*i)); return b;
}
std::uint64_t Length(const unsigned char* b) {
    std::uint64_t n=0; for (unsigned i=0;i<8;++i) n |= std::uint64_t(b[i])<<(8*i); return n;
}
bool Inventory(int directory, std::vector<std::string>* ids, std::uint64_t* bytes, std::size_t cap) {
    Fd copy{::openat(directory,".",O_RDONLY|O_DIRECTORY|O_CLOEXEC)};
    if (copy.value < 0) return false;
    DIR* stream = ::fdopendir(copy.value); if (!stream) return false; copy.value = -1;
    bool ok=true; std::vector<std::string> found; std::uint64_t total=0;
    errno=0;
    while (const auto* entry = ::readdir(stream)) {
        const std::string name=entry->d_name;
        if (name=="." || name==".." || name==".writer-lock-v1" || name==pending) continue;
        if (name.size()!=71 || name.substr(name.size()-4)!=".evp" || !EvidencePackageStore::ValidId(name.substr(0,67))) { ok=false; break; }
        struct stat st{};
        if (::fstatat(directory,name.c_str(),&st,AT_SYMLINK_NOFOLLOW) || !S_ISREG(st.st_mode) || st.st_uid!=::geteuid() ||
            (st.st_mode&0077) || st.st_size<16 || st.st_nlink!=1 || found.size()>=cap || std::uint64_t(st.st_size)>UINT64_MAX-total) { ok=false; break; }
        total += std::uint64_t(st.st_size); found.push_back(name.substr(0,67)); errno=0;
    }
    if (errno) ok=false; ::closedir(stream);
    if (!ok) return false;
    std::sort(found.begin(),found.end()); if (ids) *ids=std::move(found); if (bytes) *bytes=total; return true;
}
#if MEDIA_SERVER_USE_OPENSSL
struct Hash {
    EVP_MD_CTX* value{EVP_MD_CTX_new()};
    Hash() { if (!value || !EVP_DigestInit_ex(value,EVP_sha256(),nullptr)) { if(value)EVP_MD_CTX_free(value); throw std::runtime_error("crypto"); } }
    ~Hash() { EVP_MD_CTX_free(value); }
    bool Add(const void* p,std::size_t n) { return EVP_DigestUpdate(value,p,n)==1; }
    std::string Finish() {
        unsigned char digest[32]; unsigned n=0; if (!EVP_DigestFinal_ex(value,digest,&n) || n!=32) return {};
        constexpr char hex[]="0123456789abcdef"; std::string s;
        for(auto c:digest){s+=hex[c>>4];s+=hex[c&15];} return s;
    }
};
bool HashRange(int fd,std::uint64_t offset,std::uint64_t size,std::string* digest,
    const std::function<bool()>& cancelled) {
    Hash hash; std::array<unsigned char,65536> buffer{};
    while (size) {
        const auto n=std::size_t(std::min<std::uint64_t>(size,buffer.size()));
        if (!Transfer(fd,buffer.data(),n,offset,false,cancelled) || !hash.Add(buffer.data(),n)) return false;
        offset+=n; size-=n;
    }
    *digest=hash.Finish(); return EvidenceIsSha256(*digest);
}
bool RecoverPending(int directory,std::uint64_t limit,std::string* error,const std::function<bool()>& cancelled){
    Fd prior{::openat(directory,pending,O_RDONLY|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK)};
    if(prior.value<0)return errno==ENOENT?true:Fail(error,"evidence-pending-invalid");
    struct stat st{};std::array<unsigned char,8> bytes{};
    if(!SafeFile(prior.value,&st,false)||(st.st_nlink!=1&&st.st_nlink!=2)||std::uint64_t(st.st_size)>limit)
        return Fail(error,"evidence-pending-invalid");
    if(st.st_nlink==2){
        std::string digest;struct stat published_stat{};
        if(!HashRange(prior.value,0,std::uint64_t(st.st_size),&digest,cancelled)||
            ::fstatat(directory,("ep-"+digest+".evp").c_str(),&published_stat,AT_SYMLINK_NOFOLLOW)||
            !S_ISREG(published_stat.st_mode)||published_stat.st_dev!=st.st_dev||published_stat.st_ino!=st.st_ino)
            return Fail(error,"evidence-pending-invalid");
    }
    const auto n=std::size_t(std::min<std::int64_t>(st.st_size,8));
    if(!Transfer(prior.value,bytes.data(),n,0,false,{})||!std::equal(bytes.begin(),bytes.begin()+n,magic.begin())||
        ::unlinkat(directory,pending,0)||::fsync(directory))return Fail(error,"evidence-pending-invalid");
    return true;
}
#endif
} // namespace
EvidencePackageFile::~EvidencePackageFile() { if (fd_>=0) ::close(fd_); }
std::uint64_t EvidencePackageFile::AssetOffset(std::size_t index) const {
    std::uint64_t offset=payload_offset_;
    for (std::size_t i=0;i<index && i<manifest_.assets.size();++i) offset+=manifest_.assets[i].size_bytes;
    return offset;
}
bool EvidencePackageStore::ValidId(const std::string& id) { return id.size()==67 && id.rfind("ep-",0)==0 && EvidenceIsSha256(id.substr(3)); }
bool EvidencePackageStore::Recover(std::string* error) const {
#if MEDIA_SERVER_USE_OPENSSL
    try{
        Fd directory{Directory(directory_,true)};if(directory.value<0)return Fail(error,"evidence-store-unavailable");
        Fd lock{::openat(directory.value,".writer-lock-v1",O_RDWR|O_CREAT|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK,0600)};
        if(!SafeFile(lock.value,nullptr)||::flock(lock.value,LOCK_EX|LOCK_NB))return Fail(error,"evidence-store-busy");
        const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(5);
        if(!RecoverPending(directory.value,limits_.package_bytes,error,[&]{return std::chrono::steady_clock::now()>=deadline;}))return false;
        if(error)error->clear();return true;
    }catch(...){return Fail(error,"evidence-store-unavailable");}
#else
    return Fail(error,"evidence-crypto-unavailable");
#endif
}
bool EvidencePackageStore::ListIds(std::vector<std::string>* ids,std::string* error) const {
    if (!ids) return Fail(error,"evidence-invalid-request");
    Fd directory{Directory(directory_,false)};
    if (directory.value<0) {
        if (errno==ENOENT) { ids->clear(); if(error)error->clear(); return true; }
        return Fail(error,"evidence-store-unavailable");
    }
    if (!Inventory(directory.value,ids,nullptr,limits_.max_packages)) return Fail(error,"evidence-store-invalid");
    if(error)error->clear(); return true;
}
std::shared_ptr<EvidencePackageFile> EvidencePackageStore::Open(const std::string& id,std::string* error,
    const std::function<bool()>& cancelled) const {
#if MEDIA_SERVER_USE_OPENSSL
    try {
        if (!ValidId(id)) { Fail(error,"evidence-invalid-id"); return {}; }
        Fd directory{Directory(directory_,false)};
        if (directory.value<0) { Fail(error,"evidence-store-unavailable"); return {}; }
        Fd file{::openat(directory.value,(id+".evp").c_str(),O_RDONLY|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK)};
        if (file.value<0 && errno==ENOENT) { Fail(error,"evidence-not-found"); return {}; }
        struct stat before{};
        if (!SafeFile(file.value,&before) || before.st_size<16 || std::uint64_t(before.st_size)>limits_.package_bytes) { Fail(error,"evidence-file-unavailable"); return {}; }
        std::array<unsigned char,16> header{};
        if (!Transfer(file.value,header.data(),header.size(),0,false,cancelled) || !std::equal(magic.begin(),magic.end(),header.begin())) { Fail(error,"evidence-file-invalid"); return {}; }
        const auto length=Length(header.data()+8);
        if (!length || length>1024*1024 || length>std::uint64_t(before.st_size)-16) { Fail(error,"evidence-file-invalid"); return {}; }
        std::string text(std::size_t(length),'\0'); EvidencePackageV1 manifest;
        if (!Transfer(file.value,text.data(),text.size(),16,false,cancelled) || !ParseEvidencePackage(text,&manifest,error)) return {};
        std::uint64_t offset=16+length;
        for (const auto& asset:manifest.assets) {
            if (asset.size_bytes>std::uint64_t(before.st_size)-offset) { Fail(error,"evidence-file-invalid"); return {}; }
            std::string actual;
            if (!HashRange(file.value,offset,asset.size_bytes,&actual,cancelled) || actual!=asset.sha256) { Fail(error,"evidence-checksum-mismatch"); return {}; }
            offset+=asset.size_bytes;
        }
        std::string actual;
        if (offset!=std::uint64_t(before.st_size) || !HashRange(file.value,0,offset,&actual,cancelled) || id!="ep-"+actual) { Fail(error,"evidence-checksum-mismatch"); return {}; }
        struct stat after{};
        if (!SafeFile(file.value,&after) || before.st_size!=after.st_size || !SameTimes(before,after)) { Fail(error,"evidence-file-changed"); return {}; }
        auto result=std::shared_ptr<EvidencePackageFile>(new EvidencePackageFile);
        result->fd_=file.value; file.value=-1; result->payload_offset_=16+length; result->manifest_=std::move(manifest);
        if(error)error->clear(); return result;
    } catch (...) { Fail(error,"evidence-store-unavailable"); return {}; }
#else
    (void)id; (void)cancelled; Fail(error,"evidence-crypto-unavailable"); return {};
#endif
}
bool EvidencePackageStore::Publish(const EvidencePackageV1& manifest,const std::vector<EvidencePayload>& payloads,
    std::string* id,std::string* error,const std::function<bool()>& cancelled) const {
#if MEDIA_SERVER_USE_OPENSSL
    if (!id || !ValidateEvidencePackage(manifest,error) || payloads.size()!=manifest.assets.size()) return Fail(error,"evidence-invalid-manifest");
    Fd directory{Directory(directory_,true)}; if(directory.value<0)return Fail(error,"evidence-store-unavailable");
    Fd lock{::openat(directory.value,".writer-lock-v1",O_RDWR|O_CREAT|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK,0600)};
    if(!SafeFile(lock.value,nullptr)||::flock(lock.value,LOCK_EX|LOCK_NB))return Fail(error,"evidence-store-busy");
    bool owned=false, linked=false; std::string published;
    try {
        if(!RecoverPending(directory.value,limits_.package_bytes,error,cancelled))return false;
        const auto text=SerializeEvidencePackage(manifest); if(text.size()>1024*1024)return Fail(error,"evidence-capacity");
        std::uint64_t size=16+text.size();if(size>limits_.package_bytes)return Fail(error,"evidence-capacity");
        for(std::size_t i=0;i<payloads.size();++i){
            const auto& p=payloads[i]; const auto bytes=p.media?p.media->size_bytes():p.bytes.size();
            if((p.media&&!p.bytes.empty())||bytes!=manifest.assets[i].size_bytes||size>limits_.package_bytes||bytes>limits_.package_bytes-size)return Fail(error,"evidence-capacity");size+=bytes;
        }
        std::vector<std::string> existing; std::uint64_t used=0;
        if(!Inventory(directory.value,&existing,&used,limits_.max_packages))return Fail(error,"evidence-store-invalid");
        if(existing.size()>=limits_.max_packages||used>limits_.store_bytes||size>limits_.store_bytes-used)return Fail(error,"evidence-capacity");
        struct statvfs space{};
        if(::fstatvfs(directory.value,&space))return Fail(error,"evidence-store-unavailable");
        const __int128 free=static_cast<__int128>(space.f_bavail)*space.f_frsize;
        if(free<static_cast<__int128>(size)+limits_.reserved_free_bytes)return Fail(error,"evidence-disk-reserve");
        Fd file{::openat(directory.value,pending,O_RDWR|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC,0600)};
        if(!SafeFile(file.value,nullptr))return Fail(error,"evidence-write-failed"); owned=true;
        Hash hash; std::uint64_t offset=0;
        const auto write=[&](const void* p,std::size_t n){
            if(!Transfer(file.value,const_cast<void*>(p),n,offset,true,cancelled)||!hash.Add(p,n))throw std::runtime_error("write");offset+=n;
        };
        write(magic.data(),magic.size());const auto length=Length(text.size());write(length.data(),length.size());write(text.data(),text.size());
        std::array<unsigned char,65536> buffer{};
        for(std::size_t i=0;i<payloads.size();++i){
            Hash payload_hash;const auto& p=payloads[i];std::uint64_t pos=0,left=manifest.assets[i].size_bytes;
            while(left){const auto n=std::size_t(std::min<std::uint64_t>(left,buffer.size()));const unsigned char* data;
                if(p.media){if(!Transfer(p.media->fd(),buffer.data(),n,pos,false,cancelled))throw std::runtime_error("read");data=buffer.data();}
                else data=p.bytes.data()+pos;
                if(!payload_hash.Add(data,n))throw std::runtime_error("hash");write(data,n);pos+=n;left-=n;
            }
            if(payload_hash.Finish()!=manifest.assets[i].sha256)throw std::runtime_error("payload-changed");
        }
        published="ep-"+hash.Finish();
        if(!ValidId(published)||offset!=size||(cancelled&&cancelled())||::fsync(file.value))throw std::runtime_error("sync");
        if(::linkat(directory.value,pending,directory.value,(published+".evp").c_str(),0)) {
            if(errno!=EEXIST)throw std::runtime_error("publish");
            const auto existing_file=Open(published,error,cancelled);
            if(!existing_file)throw std::runtime_error("collision");
        } else linked=true;
        if(::unlinkat(directory.value,pending,0))throw std::runtime_error("cleanup");owned=false;
        if(::fsync(directory.value))throw std::runtime_error("sync");
        *id=published;if(error)error->clear();return true;
    } catch (...) {
        // 게시 이후에는 증거를 되돌려 삭제하지 않는다. ID로 결과 확인이 가능하다.
        if(owned && ::unlinkat(directory.value,pending,0))return Fail(error,"evidence-cleanup-failed");
        if(linked){*id=published;return Fail(error,"evidence-publication-uncertain");}
        return Fail(error,cancelled&&cancelled()?"evidence-timeout":"evidence-write-failed");
    }
#else
    (void)manifest;(void)payloads;(void)id;(void)cancelled;return Fail(error,"evidence-crypto-unavailable");
#endif
}
} // namespace recording
