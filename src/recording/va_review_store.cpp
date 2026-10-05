// 파일 용도: owner/nofollow/용량/원자성 경계 안에서 검토 결과를 보존한다.
#include "recording/va_review_store.h"
#include <algorithm>
#include <cerrno>
#include <dirent.h>
#include <fcntl.h>
#include <sys/file.h>
#include <sys/stat.h>
#include <sys/statvfs.h>
#include <unistd.h>

namespace recording {
namespace {
constexpr const char* magic="MSVAR01\n";
constexpr const char* pending=".pending-review-v1";
struct Fd {int n{-1};~Fd(){if(n>=0)::close(n);}};
bool Fail(std::string* e,const char* s){if(e)*e=s;return false;}
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
bool Contents(int fd,std::size_t cap,std::string* output,bool one_link=true) {
    struct stat st{};if(!Safe(fd,&st,one_link)||std::uint64_t(st.st_size)>cap)return false;
    std::string bytes(std::size_t(st.st_size),'\0');std::size_t done=0;
    while(done<bytes.size()) {
        const auto n=::pread(fd,bytes.data()+done,bytes.size()-done,static_cast<off_t>(done));
        if(n<0&&errno==EINTR)continue;if(n<=0)return false;done+=std::size_t(n);
    }
    struct stat after{};if(!Safe(fd,&after,one_link)||st.st_size!=after.st_size)return false;
    *output=std::move(bytes);return true;
}
bool Inventory(int dir,const VaReviewStore::Limits& limits,std::vector<std::string>* out,std::uint64_t* bytes) {
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
bool RecoverPending(int dir,const VaReviewStore::Limits& limits,std::string* error) {
    Fd fd{::openat(dir,pending,O_RDONLY|O_NONBLOCK|O_NOFOLLOW|O_CLOEXEC)};
    if(fd.n<0)return errno==ENOENT?true:Fail(error,"review-pending-invalid");
    struct stat st{};std::string bytes;
    if(!Safe(fd.n,&st,false)||(st.st_nlink!=1&&st.st_nlink!=2)||!Contents(fd.n,limits.record_bytes+8,&bytes,false)||
       bytes.substr(0,std::min<std::size_t>(8,bytes.size()))!=std::string(magic).substr(0,std::min<std::size_t>(8,bytes.size())))
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
bool ReadAt(int dir,const std::string& id,const VaReviewStore::Limits& limits,VaReviewRecord* out,std::string* error) {
    Fd fd{::openat(dir,(id+".review").c_str(),O_RDONLY|O_NONBLOCK|O_NOFOLLOW|O_CLOEXEC)};std::string bytes;
    if(!Contents(fd.n,limits.record_bytes+8,&bytes)||bytes.size()<8||bytes.substr(0,8)!=magic||
       "vr-"+EvidenceSha256(bytes.data(),bytes.size())!=id)return Fail(error,"review-record-unavailable");
    return ParseVaReviewRecord(bytes.substr(8),out,error);
}
}
bool VaReviewStore::ValidId(const std::string& id){return id.size()==67&&id.rfind("vr-",0)==0&&EvidenceIsSha256(id.substr(3));}
bool VaReviewStore::Recover(std::string* error) const {
    Fd dir{Directory(directory_,true)};if(dir.n<0)return Fail(error,"review-store-unavailable");
    Fd lock{Lock(dir.n)};if(lock.n<0)return Fail(error,"review-store-busy");
    if(!RecoverPending(dir.n,limits_,error))return false;
    std::vector<std::string> ids;std::uint64_t bytes=0;
    if(!Inventory(dir.n,limits_,&ids,&bytes))return Fail(error,"review-store-invalid");
    for(const auto& id:ids){VaReviewRecord record;if(!ReadAt(dir.n,id,limits_,&record,error))return false;}
    if(error)error->clear();return true;
}
bool VaReviewStore::Read(const std::string& id,VaReviewRecord* out,std::string* error) const {
    if(!out||!ValidId(id))return Fail(error,"review-invalid-id");
    Fd dir{Directory(directory_,false)};if(dir.n<0)return Fail(error,"review-store-unavailable");
    return ReadAt(dir.n,id,limits_,out,error);
}
bool VaReviewStore::List(std::vector<std::string>* out,std::string* error) const {
    if(!out)return Fail(error,"review-invalid-query");
    Fd dir{Directory(directory_,false)};std::uint64_t bytes=0;
    if(dir.n<0||!Inventory(dir.n,limits_,out,&bytes))return Fail(error,"review-store-unavailable");
    if(error)error->clear();return true;
}
bool VaReviewStore::Publish(const VaReviewRecord& record,std::string* id,std::string* error,
    const std::function<bool()>& cancelled) const {
    if(!id||!ValidateVaReviewRecord(record,error))return false;
    const auto json=SerializeVaReviewRecord(record);
    if(json.size()>limits_.record_bytes)return Fail(error,"review-record-too-large");
    const std::string bytes=std::string(magic)+json;
    const auto digest=EvidenceSha256(bytes.data(),bytes.size());
    if(!EvidenceIsSha256(digest))return Fail(error,"review-crypto-unavailable");
    const auto result="vr-"+digest;
    Fd dir{Directory(directory_,true)};if(dir.n<0)return Fail(error,"review-store-unavailable");
    Fd lock{Lock(dir.n)};if(lock.n<0)return Fail(error,"review-store-busy");
    if(!RecoverPending(dir.n,limits_,error))return false;
    std::vector<std::string> ids;std::uint64_t total=0;
    if(!Inventory(dir.n,limits_,&ids,&total))return Fail(error,"review-store-invalid");
    if(std::find(ids.begin(),ids.end(),result)!=ids.end()) {
        VaReviewRecord prior;if(!ReadAt(dir.n,result,limits_,&prior,error))return false;
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
}
} // namespace recording
