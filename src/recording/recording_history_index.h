// 파일 용도: 원본에서 재구축하는 비영속 녹화 이력 조회의 유한 디스크 인덱스다.
#pragma once
#include <algorithm>
#include <cerrno>
#include <array>
#include <atomic>
#include <cstring>
#include <cstdint>
#include <cstdlib>
#include <filesystem>
#include <functional>
#include <limits>
#include <stdexcept>
#include <string>
#include <utility>
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
#include <fcntl.h>
#include <sys/stat.h>
#include <sys/statvfs.h>
#include <unistd.h>
#include <openssl/evp.h>

namespace recording {
// 공개 저장 형식/원본 권위가 아니다. caller는 원본 검증 완료 전 이 객체를 게시하지 않는다.
// caller가 동기화한다. callback은 재진입/수정을 금지한다. 값은 호출자가 소유하며 캐시는 없다.
// 프로세스 root hash가 빈 child까지 결박한다. 파일만 복사/재개방해 신뢰를 복원하지 않는다.
// 실패한 쓰기는 객체를 poison한다. 원본 append 후 실패라면 caller owner도 poison해야 한다.
class RecordingHistoryIndex final {
public:
    static constexpr std::size_t kKeyBytes=256, kNodeBytes=512, kDepth=96;
    static constexpr std::size_t kValueBytes=2048; // maximum canonical first-acceptance DTO; never a cold payload
    static constexpr std::uint64_t BytesForRows(std::uint64_t rows) {
        return rows>(INT64_MAX-kNodeBytes)/(kNodeBytes+kValueBytes)?0:kNodeBytes+rows*(kNodeBytes+kValueBytes);
    }
    struct Usage { std::uint64_t rows, file_bytes, node_reads, node_writes; std::size_t cache_bytes; std::uint64_t allocated_bytes; };
    enum class Lookup { Found, Absent, Error };
    using Visitor=std::function<bool(const std::string&,const std::string&,std::string*)>;
    RecordingHistoryIndex(const RecordingHistoryIndex&)=delete;
    RecordingHistoryIndex& operator=(const RecordingHistoryIndex&)=delete;
    RecordingHistoryIndex()=default;
    ~RecordingHistoryIndex(){try{Close(nullptr);}catch(...){}}
    bool Create(const std::string& directory,std::uint64_t disk_budget,std::string* error) {
        try {
            if(fd_>=0||directory_fd_>=0||disk_budget<kNodeBytes||disk_budget>static_cast<std::uint64_t>(INT64_MAX))
                throw Failure("history index create/budget invalid");
            directory_fd_=open(directory.c_str(),O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
            struct stat dir{};
            if(directory_fd_<0||fstat(directory_fd_,&dir)||!S_ISDIR(dir.st_mode)||
               !((dir.st_uid==getuid()&&(dir.st_mode&0022)==0)||(dir.st_uid==0&&(dir.st_mode&S_ISVTX))))
                throw Failure("history scratch directory capability invalid");
            struct statvfs space{};
            if(fstatvfs(directory_fd_,&space)||!space.f_frsize||
               disk_budget/space.f_frsize+(disk_budget%space.f_frsize!=0)>space.f_bavail)
                throw Failure("history scratch available space insufficient (not reserved)");
            static std::atomic<std::uint64_t> serial{0};
            for(unsigned attempt=0;attempt<128;++attempt) {
                name_=".recording-history-"+std::to_string(getpid())+"-"+std::to_string(++serial);
                fd_=openat(directory_fd_,name_.c_str(),O_RDWR|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC,0600);
                if(fd_>=0)break;
                if(errno!=EEXIST)throw Failure("history index create failed");
            }
            if(fd_<0||fstat(fd_,&binding_)||!S_ISREG(binding_.st_mode)||binding_.st_nlink!=1||binding_.st_uid!=getuid())
                throw Failure("history index file ownership");
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
            if(probe_fault==1)throw Failure("injected post-open failure");
            if(probe_fault==2)throw Failure("injected unlink failure before unlink");
#endif
            pid_=getpid();
            struct stat named{};
            if(fstatat(directory_fd_,name_.c_str(),&named,AT_SYMLINK_NOFOLLOW)||
               named.st_dev!=binding_.st_dev||named.st_ino!=binding_.st_ino||unlinkat(directory_fd_,name_.c_str(),0))
                throw Failure("history scratch unlink failure");
            anonymous_=true;
            const int directory_fd=directory_fd_;directory_fd_=-1;
            bool directory_closed=close(directory_fd)==0;
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
            if(probe_fault==5)directory_closed=false; // actual FD released; preserve uncertain close receipt
#endif
            if(!directory_closed){close_failed_=true;throw Failure("history scratch directory close failure");}
            budget_=disk_budget;size_=0;poisoned_=false;
            std::array<unsigned char,kNodeBytes> header{};
            std::memcpy(header.data(),"recording-history-scratch-v1",28);
            Append(header.data(),header.size());
            if(error)error->clear();
            return true;
        } catch(const std::exception& e){
            const std::string first=e.what();std::string cleanup;
            const bool closed=Close(&cleanup);return Fail(error,first+(closed?"":"; cleanup: "+cleanup));
        }
    }
    // Caller serializes source mutation. The process trust root is copied, never read from the header.
    bool CopyFrom(RecordingHistoryIndex& source,std::string* error) {
        try {
            Check();if(this==&source||rows_||root_.offset||size_!=kNodeBytes)
                throw Failure("history clone destination not empty");
            if(!source.Healthy(error))return false;
            if(source.size_>budget_)throw Failure("history clone capacity insufficient");
            std::array<unsigned char,65536> block{};
            for(std::uint64_t offset=0;offset<source.size_;){
                const auto count=static_cast<std::size_t>(std::min<std::uint64_t>(block.size(),source.size_-offset));
                try{source.ReadBytes(offset,block.data(),count);}catch(const std::exception& e){source.Fail(error,e.what());throw;}
                WriteBytes(offset,block.data(),count);offset+=count;
            }
            if(!source.Healthy(error))return false;
            size_=source.size_;rows_=source.rows_;root_=source.root_;
            // Descendant paths/values remain authenticated by Get/Visit; fstat is not a content proof.
            return Healthy(error);
        }catch(const std::exception& e){return Fail(error,e.what());}
    }
    Lookup Get(const std::string& key,std::string* output,std::string* error) {
        try {
            Check();Key(key);if(!output)throw Failure("history index output missing");
            Ref ref=root_;std::string lower,upper;
            for(std::size_t depth=0;ref.offset;++depth) {
                if(depth>=kDepth)throw Failure("history index depth invalid");
                const auto node=Read(ref);Order(node.key,lower,upper);
                if(key==node.key){auto value=Value(node);*output=std::move(value);if(error)error->clear();return Lookup::Found;}
                if(key<node.key){upper=node.key;ref=node.left;}else{lower=node.key;ref=node.right;}
            }
            if(error)error->clear();
            return Lookup::Absent;
        }catch(const std::exception& e){Fail(error,e.what());return Lookup::Error;}
    }
    // overwrite=falseは同じkeyも拒否。retry同等性は上位の原本契約で判定する。
    bool Put(const std::string& key,const std::string& value,bool overwrite,std::string* error) {
        try {
            Check();if(visiting_)throw Failure("history mutation during visit");Key(key);if(value.size()>kValueBytes)throw Failure("history index row admission");
            bool inserted=false;
            root_=Insert(root_,key,value,overwrite,0,{}, {},&inserted);
            if(inserted)++rows_;
            if(error)error->clear();
            return true;
        }catch(const std::exception& e){return Fail(error,e.what());}
    }
    bool Visit(const Visitor& visitor,std::string* error) {
        try {
            Check();if(!visitor)throw Failure("history index visitor missing");
            struct VisitGuard { bool& flag; ~VisitGuard(){flag=false;} } guard{visiting_};
            if(visiting_)throw Failure("history recursive visit");
            visiting_=true;
            std::uint64_t seen=0;
            if(!Walk(root_,{}, {},0,visitor,&seen,error))return false;
            if(seen!=rows_)throw Failure("history index traversal count mismatch");
            if(error)error->clear();
            return true;
        }catch(const std::exception& e){return Fail(error,e.what());}
    }
    bool Healthy(std::string* error) {
        try{Check();if(root_.offset)(void)Read(root_);return true;}
        catch(const std::exception& e){return Fail(error,e.what());}
    }
    Usage usage()const{struct stat st{};const bool valid=fd_>=0&&!fstat(fd_,&st);return {rows_,size_,reads_,writes_,0,valid?static_cast<std::uint64_t>(st.st_blocks)*512:0};}
    const std::string& owned_name()const{return name_;}
    bool Close(std::string* error) {
        bool ok=true;
        if(fd_>=0) {
            if(!anonymous_) {
                struct stat actual{},opened{};
                if(directory_fd_>=0&&!fstat(fd_,&opened)&&
                   !fstatat(directory_fd_,name_.c_str(),&actual,AT_SYMLINK_NOFOLLOW)&&
                   actual.st_dev==opened.st_dev&&actual.st_ino==opened.st_ino&&
                   S_ISREG(actual.st_mode)&&actual.st_uid==getuid()&&actual.st_nlink==1) {
                    if(unlinkat(directory_fd_,name_.c_str(),0))ok=false;
                }else ok=false;
            }
            // close EINTR may already have released the descriptor. Never retry its number.
            const int fd=fd_;fd_=-1;if(close(fd))ok=false;
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
            if(probe_fault==4)ok=false; // descriptor was released; report uncertainty, never retry its number
#endif
        }
        if(directory_fd_>=0){const int fd=directory_fd_;directory_fd_=-1;if(close(fd))ok=false;}
        poisoned_=true;
        if(!ok)close_failed_=true;
        if(close_failed_&&error)*error="history scratch cleanup ownership/unlink/close failure";
        if(!close_failed_&&error)error->clear();
        return !close_failed_;
    }
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
    int ProbeFd()const{return fd_;}
    inline static thread_local int probe_fault=0;
#endif
private:
    using Hash=std::array<unsigned char,32>;
    struct Ref {std::uint64_t offset{0};Hash hash{};};
    struct Node {Ref left,right;std::uint64_t value_offset{0},value_size{0},height{1};Hash value_hash{};std::string key;};
    struct Failure:std::runtime_error{using std::runtime_error::runtime_error;};
    int fd_{-1},directory_fd_{-1};pid_t pid_{0};struct stat binding_{};std::string name_;
    std::uint64_t budget_{0},size_{0},rows_{0},reads_{0},writes_{0};Ref root_;bool poisoned_{true},anonymous_{false},visiting_{false},close_failed_{false};
    static Hash Digest(const void* data,std::size_t bytes) {
        Hash hash{};unsigned count=0;
        if(EVP_Digest(data,bytes,hash.data(),&count,EVP_sha256(),nullptr)!=1||count!=hash.size())
            throw Failure("history index hash failure");
        return hash;
    }
    static void Key(const std::string& key){if(key.empty()||key.size()>kKeyBytes)throw Failure("history index key admission");}
    static void Order(const std::string& key,const std::string& lower,const std::string& upper) {
        if((!lower.empty()&&key<=lower)||(!upper.empty()&&key>=upper))throw Failure("history index order invalid");
    }
    bool Fail(std::string* error,const std::string& message){poisoned_=true;if(error)*error=message;return false;}
    void Check()const {
        struct stat state{};
        if(poisoned_||fd_<0||pid_!=getpid()||fstat(fd_,&state)||state.st_dev!=binding_.st_dev||
           state.st_ino!=binding_.st_ino||state.st_nlink!=0||state.st_size<0||static_cast<std::uint64_t>(state.st_size)!=size_)
            throw Failure("history index unavailable/binding changed");
    }
    static void Set(unsigned char* p,std::uint64_t value){for(unsigned i=0;i<8;++i){p[i]=value&255;value>>=8;}}
    static std::uint64_t Number(const unsigned char* p){std::uint64_t n=0;for(unsigned i=0;i<8;++i)n|=std::uint64_t(p[i])<<(8*i);return n;}
    void ReadBytes(std::uint64_t offset,void* bytes,std::size_t count)const {
        if(offset>size_||count>size_-offset)throw Failure("history index read bounds");
        auto* p=static_cast<unsigned char*>(bytes);
        for(std::size_t done=0;done<count;){const auto n=pread(fd_,p+done,count-done,static_cast<off_t>(offset+done));
            if(n<0&&errno==EINTR)continue;
            if(n<=0)throw Failure("history index short read");
            done+=static_cast<std::size_t>(n);}
    }
    void WriteBytes(std::uint64_t offset,const void* bytes,std::size_t count) {
        if(offset>budget_||count>budget_-offset)throw Failure("history index disk admission");
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
        if(probe_fault==3){if(count)::pwrite(fd_,bytes,1,static_cast<off_t>(offset));throw Failure("injected partial write failure");}
#endif
        const auto* p=static_cast<const unsigned char*>(bytes);
        for(std::size_t done=0;done<count;){const auto n=pwrite(fd_,p+done,count-done,static_cast<off_t>(offset+done));
            if(n<0&&errno==EINTR)continue;
            if(n<=0)throw Failure("history index short write");
            done+=static_cast<std::size_t>(n);}
    }
    std::uint64_t Append(const void* bytes,std::size_t count){const auto offset=size_;WriteBytes(offset,bytes,count);size_+=count;return offset;}
    Node Read(const Ref& ref) {
        if(!ref.offset||ref.offset<kNodeBytes)throw Failure("history index node offset");
        std::array<unsigned char,kNodeBytes> bytes{};ReadBytes(ref.offset,bytes.data(),bytes.size());++reads_;
        if(Digest(bytes.data(),bytes.size())!=ref.hash)throw Failure("history index node hash mismatch");
        Node n;n.left.offset=Number(bytes.data());n.right.offset=Number(bytes.data()+8);
        n.value_offset=Number(bytes.data()+16);n.value_size=Number(bytes.data()+24);n.height=Number(bytes.data()+32);
        const auto key_size=Number(bytes.data()+40);
        if(!key_size||key_size>kKeyBytes||!n.height||n.height>kDepth||n.value_size>kValueBytes||
           n.value_offset<kNodeBytes||n.value_offset>size_||n.value_size>size_-n.value_offset)
            throw Failure("history index node fields");
        std::copy_n(bytes.data()+48,32,n.left.hash.begin());std::copy_n(bytes.data()+80,32,n.right.hash.begin());
        std::copy_n(bytes.data()+112,32,n.value_hash.begin());
        if((!n.left.offset&&n.left.hash!=Hash{})||(!n.right.offset&&n.right.hash!=Hash{}))throw Failure("history index null proof");
        n.key.assign(reinterpret_cast<const char*>(bytes.data()+144),static_cast<std::size_t>(key_size));return n;
    }
    Ref Save(const Node& n,std::uint64_t offset) {
        std::array<unsigned char,kNodeBytes> bytes{};
        Set(bytes.data(),n.left.offset);Set(bytes.data()+8,n.right.offset);Set(bytes.data()+16,n.value_offset);
        Set(bytes.data()+24,n.value_size);Set(bytes.data()+32,n.height);Set(bytes.data()+40,n.key.size());
        std::copy(n.left.hash.begin(),n.left.hash.end(),bytes.data()+48);std::copy(n.right.hash.begin(),n.right.hash.end(),bytes.data()+80);
        std::copy(n.value_hash.begin(),n.value_hash.end(),bytes.data()+112);std::copy(n.key.begin(),n.key.end(),bytes.data()+144);
        if(offset)WriteBytes(offset,bytes.data(),bytes.size());else offset=Append(bytes.data(),bytes.size());
        ++writes_;return {offset,Digest(bytes.data(),bytes.size())};
    }
    std::string Value(const Node& n)const {
        std::string value(static_cast<std::size_t>(n.value_size),'\0');ReadBytes(n.value_offset,value.data(),value.size());
        if(Digest(value.data(),value.size())!=n.value_hash)throw Failure("history index value hash mismatch");
        return value;
    }
    std::uint64_t Height(const Ref& ref){return ref.offset?Read(ref).height:0;}
    void Height(Node* node){node->height=1+std::max(Height(node->left),Height(node->right));}
    Ref Left(Node x,std::uint64_t offset) {
        auto y=Read(x.right);const auto next=x.right.offset;x.right=y.left;Height(&x);y.left=Save(x,offset);Height(&y);return Save(y,next);
    }
    Ref Right(Node y,std::uint64_t offset) {
        auto x=Read(y.left);const auto next=y.left.offset;y.left=x.right;Height(&y);x.right=Save(y,offset);Height(&x);return Save(x,next);
    }
    Ref Insert(Ref ref,const std::string& key,const std::string& value,bool overwrite,std::size_t depth,
               const std::string& lower,const std::string& upper,bool* inserted) {
        if(depth>=kDepth)throw Failure("history index depth admission");
        Node n;
        if(ref.offset){n=Read(ref);Order(n.key,lower,upper);}
        else {n.key=key;*inserted=true;}
        if(key==n.key) {
            if(ref.offset&&!overwrite)throw Failure("history index duplicate key");
            if(!ref.offset){std::array<unsigned char,kValueBytes> slot{};n.value_offset=Append(slot.data(),slot.size());}
            WriteBytes(n.value_offset,value.data(),value.size());n.value_size=value.size();n.value_hash=Digest(value.data(),value.size());
        }else if(key<n.key)n.left=Insert(n.left,key,value,overwrite,depth+1,lower,n.key,inserted);
        else n.right=Insert(n.right,key,value,overwrite,depth+1,n.key,upper,inserted);
        Height(&n);const auto balance=static_cast<int>(Height(n.left))-static_cast<int>(Height(n.right));
        if(balance>1){auto child=Read(n.left);if(Height(child.left)<Height(child.right))n.left=Left(child,n.left.offset);return Right(n,ref.offset);}
        if(balance< -1){auto child=Read(n.right);if(Height(child.right)<Height(child.left))n.right=Right(child,n.right.offset);return Left(n,ref.offset);}
        return Save(n,ref.offset);
    }
    bool Walk(Ref ref,const std::string& lower,const std::string& upper,std::size_t depth,const Visitor& visitor,
              std::uint64_t* seen,std::string* error) {
        if(!ref.offset)return true;
        if(depth>=kDepth)throw Failure("history index traversal depth");
        auto node=Read(ref);Order(node.key,lower,upper);
        if(!Walk(node.left,lower,node.key,depth+1,visitor,seen,error))return false;
        { const auto value=Value(node);if(!visitor(node.key,value,error))return false; }
        ++*seen;
        return Walk(node.right,node.key,upper,depth+1,visitor,seen,error);
    }
};
} // namespace recording
#endif
