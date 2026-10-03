// 파일 용도: size-bounded little-endian cache와 전체 SHA256의 원자 게시/복구.
#include "recording/visual_index_store.h"
#include <array>
#include <algorithm>
#include <cerrno>
#include <cstring>
#include <cstdlib>
#include <fcntl.h>
#include <limits>
#include <stdexcept>
#include <sys/stat.h>
#include <sys/file.h>
#include <csignal>
#include <unistd.h>
#if MEDIA_SERVER_USE_SIGLIP2
#include <glib.h>
#endif

namespace recording {
namespace {
bool Fail(std::string* error, const char* code) { if(error)*error=code;return false; }
#if MEDIA_SERVER_USE_SIGLIP2
constexpr std::uint64_t kMaxFile = 96ULL*1024*1024;
struct Fd { int value{-1}; ~Fd(){if(value>=0)::close(value);} };
struct Digest {
    GChecksum* value{g_checksum_new(G_CHECKSUM_SHA256)};
    Digest(){if(!value)throw std::bad_alloc();}
    ~Digest(){g_checksum_free(value);}
    void Add(const void* p,std::size_t n){g_checksum_update(value,static_cast<const guchar*>(p),n);}
    std::array<unsigned char,32> Finish(){std::array<unsigned char,32>b{};gsize n=b.size();g_checksum_get_digest(value,b.data(),&n);return b;}
};
std::string Name(const VisualEmbeddingContract& c) {
    Digest d;d.Add(c.space_id.data(),c.space_id.size());const auto hash=d.Finish();
    constexpr char hex[]="0123456789abcdef";std::string s="visual-";
    for(auto b:hash){s+=hex[b>>4];s+=hex[b&15];}return s+".v1";
}
int Directory(const std::filesystem::path& p) {
    if(p.empty())return -1;
    for(const auto& part:p)if(part==".."||part.string().find('\0')!=std::string::npos)return -1;
    std::error_code error;auto path=std::filesystem::absolute(p,error).lexically_normal();if(error)return -1;
#ifdef __APPLE__
    const auto text=path.string();
    if(text=="/tmp"||text.rfind("/tmp/",0)==0||text=="/var"||text.rfind("/var/",0)==0)path="/private"+text;
#endif
    int fd=::open("/",O_RDONLY|O_DIRECTORY|O_CLOEXEC);
    if(fd<0)return -1;
    for(const auto& part:path.relative_path()){
        if(part.empty()||part==".")continue;
        const int next=::openat(fd,part.c_str(),O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
        ::close(fd);fd=next;if(fd<0)return -1;
    }
    struct stat st{};
    if(::fstat(fd,&st)!=0||st.st_uid!=::geteuid()||(st.st_mode&0022)){::close(fd);return -1;}
    return fd;
}
struct Stream {
    int fd;bool writing;std::uint64_t remaining;Digest digest;
    void Bytes(void* p,std::size_t n,bool hashed=true){
        if(n>remaining)throw std::runtime_error("visual-cache-invalid");
        std::size_t offset=0;
        while(offset<n){const auto done=writing?::write(fd,static_cast<char*>(p)+offset,n-offset): ::read(fd,static_cast<char*>(p)+offset,n-offset);
            if(done<0&&errno==EINTR)continue;
            if(done<=0)throw std::runtime_error(writing?"visual-cache-write-failed":"visual-cache-invalid");offset+=std::size_t(done);}
        remaining-=n;if(hashed)digest.Add(p,n);
    }
    void U64(std::uint64_t& v){std::array<unsigned char,8>b{};
        if(writing)for(unsigned i=0;i<8;++i)b[i]=static_cast<unsigned char>(v>>(8*i));
        Bytes(b.data(),b.size());if(!writing){v=0;for(unsigned i=0;i<8;++i)v|=std::uint64_t(b[i])<<(8*i);}}
    void I64(std::int64_t& v){std::uint64_t bits;std::memcpy(&bits,&v,8);U64(bits);if(!writing)std::memcpy(&v,&bits,8);}
    void Text(std::string& s){std::uint64_t n=s.size();U64(n);if(n>1024||n>remaining)throw std::runtime_error("visual-cache-invalid");
        if(!writing)s.resize(std::size_t(n));Bytes(s.data(),s.size());}
    void Vector(std::vector<float>& v){static_assert(sizeof(float)==4&&std::numeric_limits<float>::is_iec559,"FP32 required");
        std::uint64_t n=v.size();U64(n);if(n!=768||n>remaining/4)throw std::runtime_error("visual-cache-invalid");
        if(!writing)v.resize(std::size_t(n));
        std::array<unsigned char,768*4> packed{};
        if(writing)for(std::size_t j=0;j<v.size();++j){std::uint32_t bits;std::memcpy(&bits,&v[j],4);
            for(unsigned i=0;i<4;++i)packed[j*4+i]=static_cast<unsigned char>(bits>>(8*i));}
        Bytes(packed.data(),packed.size());
        if(!writing)for(std::size_t j=0;j<v.size();++j){std::uint32_t bits=0;
            for(unsigned i=0;i<4;++i)bits|=std::uint32_t(packed[j*4+i])<<(8*i);std::memcpy(&v[j],&bits,4);}
    }
    void Contract(VisualEmbeddingContract& c){Text(c.image_id);Text(c.text_id);Text(c.space_id);std::uint64_t n=c.dimensions;U64(n);
        if(n!=768)throw std::runtime_error("visual-contract-mismatch");c.dimensions=std::size_t(n);}
    void Document(VisualSearchDocument& d){
        for(auto* s:{&d.id,&d.channel_id,&d.segment_id,&d.event_id,&d.media_sha256,&d.frame_sha256})Text(*s);
        I64(d.media_pts);std::uint64_t num=d.time_base_num,den=d.time_base_den;U64(num);U64(den);
        if(!num||!den||num>INT32_MAX||den>INT32_MAX)throw std::runtime_error("visual-cache-invalid");
        d.time_base_num=std::int32_t(num);d.time_base_den=std::int32_t(den);
        std::uint64_t has=d.utc_ns.has_value();U64(has);if(has>1)throw std::runtime_error("visual-cache-invalid");
        std::int64_t utc=d.utc_ns.value_or(0);I64(utc);if(has)d.utc_ns=utc;else{if(utc)throw std::runtime_error("visual-cache-invalid");d.utc_ns.reset();}Vector(d.embedding);
    }
};
#endif
} // namespace
bool VisualIndexStore::Save(const VisualSearchIndex& index,std::string* error) const {
#if MEDIA_SERVER_USE_SIGLIP2
    Fd directory{Directory(directory_)};if(directory.value<0)return Fail(error,"visual-cache-directory");
    // 한 cache directory의 writer를 process 간에도 직렬화한다. 고정 scratch 한 개만 남길 수 있다.
    Fd lock{::openat(directory.value,".visual-writer.lock",O_RDWR|O_CREAT|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK,0600)};
    struct stat lock_stat{};
    if(lock.value<0||::fstat(lock.value,&lock_stat)!=0||!S_ISREG(lock_stat.st_mode)||lock_stat.st_uid!=::geteuid()||
        lock_stat.st_nlink!=1||(lock_stat.st_mode&0077)||::flock(lock.value,LOCK_EX|LOCK_NB)!=0)
        return Fail(error,"visual-cache-writer-unavailable");
    std::string temporary;
    try {
        constexpr const char* scratch=".visual-pending.v1";
        Fd file{::openat(directory.value,scratch,O_RDWR|O_CREAT|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK,0600)};
        struct stat st{};
        if(file.value<0||::fstat(file.value,&st)!=0||!S_ISREG(st.st_mode)||st.st_uid!=::geteuid()||st.st_nlink!=1||
            (st.st_mode&0077)||st.st_size<0||st.st_size>std::int64_t(kMaxFile))return Fail(error,"visual-cache-invalid-pending");
        // 중단된 전용 형식만 회수한다. 임의 파일/링크를 지우거나 덮지 않는다.
        const std::array<unsigned char,8> magic_bytes{0x4d,0x53,0x4d,0x56,0x58,0x49,0x31,0};
        std::array<unsigned char,8> prior{};const auto count=std::min<std::int64_t>(st.st_size,8);
        if(::pread(file.value,prior.data(),count,0)!=count||!std::equal(prior.begin(),prior.begin()+count,magic_bytes.begin()))
            return Fail(error,"visual-cache-invalid-pending");
        temporary=scratch;
        if(::ftruncate(file.value,0)!=0)throw std::runtime_error("visual-cache-write-failed");
        Stream s{file.value,true,kMaxFile,{}};std::uint64_t magic=0x314958564d534dULL;s.U64(magic);
        auto contract=index.contract();s.Contract(contract);std::uint64_t n=index.documents().size();s.U64(n);
        // 단일 행만 복사한다. 전체 벡터 게시본 복제는 하지 않는다.
        for(const auto& original:index.documents()){auto row=original;s.Document(row);}
        auto digest=s.digest.Finish();s.Bytes(digest.data(),digest.size(),false);
        if(::fsync(file.value)!=0)throw std::runtime_error("visual-cache-write-failed");
#ifdef MEDIA_SERVER_VISUAL_STORE_TEST
        if(std::getenv("V430_VISUAL_STORE_STOP_BEFORE_RENAME"))::raise(SIGSTOP);
        if(std::getenv("V430_VISUAL_STORE_FAIL_BEFORE_RENAME"))throw std::runtime_error("visual-cache-write-failed");
#endif
        const auto name=Name(contract);
        if(::renameat(directory.value,temporary.c_str(),directory.value,name.c_str())!=0)throw std::runtime_error("visual-cache-write-failed");
        temporary.clear();
        if(::fsync(directory.value)!=0)return Fail(error,"visual-cache-durability-unconfirmed");
        if(error)error->clear();return true;
    }catch(const std::exception&){
        if(!temporary.empty()&&::unlinkat(directory.value,temporary.c_str(),0)!=0)return Fail(error,"visual-cache-cleanup-failed");
        return Fail(error,"visual-cache-write-failed");
    }
#else
    (void)index;return Fail(error,"visual-disabled");
#endif
}
bool VisualIndexStore::Load(const VisualEmbeddingContract& contract,std::shared_ptr<const VisualSearchIndex>* output,
    std::string* error,VisualIndexLimits limits) const {
#if MEDIA_SERVER_USE_SIGLIP2
    if(!output||!(contract==VisualEmbeddingContract::Siglip2()))return Fail(error,"visual-contract-mismatch");
    Fd directory{Directory(directory_)};if(directory.value<0)return Fail(error,"visual-cache-directory");
    try {
        Fd file{::openat(directory.value,Name(contract).c_str(),O_RDONLY|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK)};
        if(file.value<0)return Fail(error,errno==ENOENT?"visual-cache-missing":"visual-cache-invalid");
        struct stat st{};if(::fstat(file.value,&st)!=0||!S_ISREG(st.st_mode)||st.st_size<32||st.st_size>std::int64_t(kMaxFile)||st.st_uid!=::geteuid()||(st.st_mode&0022))
            return Fail(error,"visual-cache-invalid");
        Stream s{file.value,false,std::uint64_t(st.st_size),{}};std::uint64_t magic=0;s.U64(magic);
        if(magic!=0x314958564d534dULL)return Fail(error,"visual-cache-invalid");
        VisualEmbeddingContract stored;s.Contract(stored);if(!(stored==contract))return Fail(error,"visual-contract-mismatch");
        std::uint64_t n=0;s.U64(n);if(n>limits.max_documents||n>20000||n>s.remaining/(768*4)||n>limits.max_bytes/sizeof(VisualSearchDocument))return Fail(error,"visual-index-capacity");
        std::vector<VisualSearchDocument> docs;docs.reserve(std::size_t(n));
        for(std::uint64_t i=0;i<n;++i){VisualSearchDocument row;s.Document(row);docs.push_back(std::move(row));}
        const auto expected=s.digest.Finish();std::array<unsigned char,32> actual{};s.Bytes(actual.data(),actual.size(),false);
        char extra;if(s.remaining||actual!=expected||::read(file.value,&extra,1)!=0)return Fail(error,"visual-cache-invalid");
        return VisualSearchIndex::Build(contract,std::move(docs),output,error,limits);
    }catch(const std::exception&){return Fail(error,"visual-cache-invalid");}
#else
    (void)contract;(void)output;(void)limits;return Fail(error,"visual-disabled");
#endif
}
} // namespace recording
