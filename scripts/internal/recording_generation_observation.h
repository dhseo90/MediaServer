// 파일 용도: 녹화 세대 파일의 검증 전용 read-only 관측 helper를 선언한다.
#pragma once
// 검증 전용 읽기 관측. 제품 lease/복구 권위가 아니며 파일을 생성·수정하지 않는다.
#include "domain/strict_json.h"
#include "recording/recording_catalog_snapshot.h"
#include <openssl/evp.h>
#include <algorithm>
#include <cerrno>
#include <fcntl.h>
#include <iomanip>
#include <sstream>
#include <stdexcept>
#include <sys/stat.h>
#include <unistd.h>
#include <array>
#include <functional>
#include <unordered_set>

namespace generation_observation {
using namespace recording;
constexpr std::uint64_t kBytes=32ULL*1024*1024;
inline void Need(bool ok){if(!ok)throw std::runtime_error("observer-generation-invalid");}
struct Fd {int n;explicit Fd(int value):n(value){Need(n>=0);}~Fd(){::close(n);}Fd(const Fd&)=delete;};
inline bool Same(const struct stat& a,const struct stat& b){return a.st_dev==b.st_dev&&a.st_ino==b.st_ino;}
inline bool Times(const struct stat& a,const struct stat& b){
#if defined(__APPLE__)
    return a.st_mtimespec.tv_sec==b.st_mtimespec.tv_sec&&a.st_mtimespec.tv_nsec==b.st_mtimespec.tv_nsec&&a.st_ctimespec.tv_sec==b.st_ctimespec.tv_sec&&a.st_ctimespec.tv_nsec==b.st_ctimespec.tv_nsec;
#else
    return a.st_mtim.tv_sec==b.st_mtim.tv_sec&&a.st_mtim.tv_nsec==b.st_mtim.tv_nsec&&a.st_ctim.tv_sec==b.st_ctim.tv_sec&&a.st_ctim.tv_nsec==b.st_ctim.tv_nsec;
#endif
}
struct Busy {};
inline std::string Digest(const std::string& bytes){unsigned char d[32];unsigned n=0;Need(EVP_Digest(bytes.data(),bytes.size(),d,&n,EVP_sha256(),nullptr)==1&&n==32);const char* hex="0123456789abcdef";std::string out;for(const auto c:d){out+=hex[c>>4];out+=hex[c&15];}return out;}
inline std::string Q(const std::string& value){std::ostringstream out;out<<std::quoted(value);return out.str();}
struct Reader {
    std::filesystem::path path;Fd root;std::uint64_t bytes{0};
    explicit Reader(const std::filesystem::path& p):path(p),root(Open(p)){}
    static int Open(const std::filesystem::path& p){
        Need(p.is_absolute()&&p!=p.root_path());int fd=::open("/",O_RDONLY|O_DIRECTORY|O_CLOEXEC);
        for(const auto& part:p.relative_path()){if(part=="."||part==".."){if(fd>=0)::close(fd);Need(false);}if(fd<0)return fd;const int next=::openat(fd,part.c_str(),O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);::close(fd);fd=next;}return fd;
    }
    bool Pending(){struct stat s{};for(const auto* n:{".recording-generation-transaction.json",".recording-generation-transaction.stage"}){if(::fstatat(root.n,n,&s,AT_SYMLINK_NOFOLLOW)==0)return true;Need(errno==ENOENT);}return false;}
    std::string Read(const std::string& name,std::uint64_t cap,bool growing=false){
        Need(!name.empty()&&name.find('/')==std::string::npos&&name!="."&&name!="..");
        Fd fd(::openat(root.n,name.c_str(),O_RDONLY|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK));struct stat a{},b{},named{};
        Need(::fstat(fd.n,&a)==0&&S_ISREG(a.st_mode)&&a.st_nlink==1&&a.st_size>=0&&std::uint64_t(a.st_size)<=cap&&std::uint64_t(a.st_size)<=kBytes-bytes);
        std::string value(static_cast<std::size_t>(a.st_size),'\0');std::size_t offset=0;
        while(offset<value.size()){auto n=::pread(fd.n,value.data()+offset,std::min<std::size_t>(65536,value.size()-offset),static_cast<off_t>(offset));if(n<0&&errno==EINTR)continue;Need(n>0);offset+=n;}
        Need(::fstat(fd.n,&b)==0&&::fstatat(root.n,name.c_str(),&named,AT_SYMLINK_NOFOLLOW)==0&&Same(a,b)&&Same(b,named)&&S_ISREG(named.st_mode)&&b.st_nlink==1&&named.st_nlink==1&&
            (growing?b.st_size>=a.st_size:b.st_size==a.st_size)&&named.st_size==b.st_size);
        if(growing&&b.st_size>a.st_size)throw Busy{};
        Need(Times(a,b)&&Times(b,named));bytes+=value.size();return value;
    }
    std::string Verified(const RecordingGenerationFile& file){const auto value=Read(file.name,kBytes);Need(value.size()==file.size&&Digest(value)==file.sha256);return value;}
    void Bound(){Fd now(Open(path));struct stat a{},b{};Need(::fstat(root.n,&a)==0&&::fstat(now.n,&b)==0&&Same(a,b));}
};
inline std::string Identity(const RecordingMutationV1& m){
    if(m.mutation_type!=RecordingMutationType::EventLinkReceipt)return Digest(SerializeRecordingMutationV1(m));
    ingress::StrictJsonObjectDocument d;Need(ingress::ParseStrictJsonObjectDocument(m.payload_json,&d,nullptr));return ingress::StrictJsonStringField(d,"originalSha256").value_or("");
}
inline std::string Token(const RecordingIdentityRow& r){const auto type=r.type==RecordingMutationType::EventLinkReceipt?"event_link_created":RecordingMutationTypeName(r.type);return "["+Q(r.mutation_id)+","+Q(r.entity_id)+","+Q(type)+","+Q(r.identity)+","+Q(std::to_string(r.occurred_at_ms))+"]";}
inline std::string Observe(const std::filesystem::path& root,std::size_t seen,
    const std::function<std::string(const std::string&)>& normalize,
    const std::function<void()>& after_manifest={}){
    Reader files(root);if(files.Pending())return "{\"busy\":true}";
    const auto marker=files.Read(".recording-store-format",65536),manifest_bytes=files.Read("recording-generation.json",65536);
    // 검증 전용 경계: 이전 manifest를 잡은 reader와 checkpoint 게시를 결정적으로 교차시킨다.
    if(after_manifest)after_manifest();
    try {
        ingress::StrictJsonObjectDocument mark;RecordingGenerationManifest manifest;std::string error;
        Need(ingress::ParseStrictJsonObjectDocument(marker,&mark,nullptr)&&mark.members.size()==3&&ingress::StrictJsonStringField(mark,"format")=="media-server.managed-recording-store.v2"&&
            ingress::StrictJsonStringField(mark,"manifest")=="recording-generation.json"&&ParseRecordingGenerationManifest(manifest_bytes,&manifest,&error)&&ingress::StrictJsonStringField(mark,"storeId")==manifest.store_id);
        RecordingCatalogSnapshot snapshot;Need(ParseRecordingCatalogSnapshot(files.Verified(manifest.snapshot),kBytes,&snapshot,&error)&&ValidateRecordingCatalogSnapshotManifest(snapshot,manifest,&error));
        auto active=files.Read(manifest.active.name,kBytes,true);Need(active.size()>=manifest.active.size&&Digest(active.substr(0,manifest.active.size))==manifest.active.sha256);
        const auto lf=active.rfind('\n'),complete=lf==std::string::npos?0:lf+1,partial=active.size()-complete;Need(manifest.active.size<=complete&&(!manifest.active.size||active[manifest.active.size-1]=='\n'));
        active.resize(complete);RecordingIdentityShard tail;
        Need(ParseRecordingIdentityShard(files.Verified(snapshot.identity_head),&tail,&error)&&tail.store_id==manifest.store_id&&tail.generation==manifest.generation);
        for(const auto& row:tail.rows)Need(row.global_ordinal<manifest.cut_ordinal);
        const auto historical_rows=tail.rows.size(),active_slot=tail.archives.size();
        tail.archives.push_back({manifest.active.name,active.size(),Digest(active)});
        std::size_t off=0;while(off<active.size()){
            const auto end=active.find('\n',off);Need(end!=std::string::npos&&end>off&&end-off<16*1024*1024);
            const auto text=active.substr(off,end-off);RecordingMutationV1 m;Need(ParseRecordingMutationV1(text,&m,&error)&&SerializeRecordingMutationV1(m)==text);
            Need(tail.rows.size()-historical_rows<UINT64_MAX-manifest.cut_ordinal);RecordingIdentityRow r;r.mutation_id=m.mutation_id;r.type=m.mutation_type;r.entity_id=m.entity_id;r.occurred_at_ms=m.occurred_at_ms;
            r.global_ordinal=manifest.cut_ordinal+tail.rows.size()-historical_rows;r.identity=Identity(m);r.archive_slot=active_slot;r.offset=off;r.length=end-off+1;r.raw_sha256=Digest(active.substr(off,r.length));
            if(m.mutation_type==RecordingMutationType::RecordingOrderReserved){RecordingOrderReservationV1 order;Need(ParseRecordingOrderReservationV1(m.payload_json,&order,&error));r.reservation=order;}
            tail.rows.push_back(std::move(r));off=end+1;
        }
        // 같은 제품 codec의 값 검증을 사용한다. 추가 shard는 메모리에서만 만들고 저장하지 않는다.
        std::string tail_bytes;Need(SerializeRecordingIdentityShard(tail,&tail_bytes,&error));const RecordingGenerationFile head{snapshot.identity_head.name,tail_bytes.size(),Digest(tail_bytes)};
        RecordingIdentityChainResult chain;const auto loader=[&](const RecordingGenerationFile& d,std::uint64_t limit,std::string* out,std::string*){Need(d.size<=limit);if(d.name==head.name){*out=tail_bytes;return true;}*out=files.Verified(d);RecordingIdentityShard historical;Need(ParseRecordingIdentityShard(*out,&historical,&error));for(const auto& row:historical.rows)Need(row.global_ordinal<manifest.cut_ordinal);return true;};
        Need(ValidateRecordingIdentityShardChain(head,loader,{kBytes,100000,100000},&chain,&error));
        auto& all=chain.first_acceptances;std::sort(all.begin(),all.end(),[](const auto& a,const auto& b){return a.first_global_ordinal<b.first_global_ordinal;});Need(seen<=all.size());
        const auto end=std::min(all.size(),seen+128);std::ostringstream out;out<<"{\"busy\":false,\"storeHash\":"<<Q(Digest(manifest.store_id))<<",\"generation\":"<<Q(std::to_string(manifest.generation))<<",\"prefix\":[";
        for(std::size_t i=0;i<end;++i){if(i)out<<',';out<<Q(Token(all[i].first_row));}out<<"],\"rows\":[";
        std::string archive_name,archive;for(std::size_t i=seen;i<end;++i){const auto& a=all[i];const auto& r=a.first_row;
            if(archive_name!=a.first_archive.name){archive_name=a.first_archive.name;archive=archive_name==manifest.active.name?active:files.Verified(a.first_archive);}
            Need(r.offset<=archive.size()&&r.length<=archive.size()-r.offset&&r.length&&r.length<=16*1024*1024+1);
            const auto raw=archive.substr(r.offset,r.length);Need(raw.back()=='\n'&&raw.find('\n')==raw.size()-1&&Digest(raw)==r.raw_sha256);RecordingMutationV1 m;
            Need(ParseRecordingMutationV1(raw.substr(0,raw.size()-1),&m,&error)&&m.mutation_id==r.mutation_id&&m.entity_id==r.entity_id&&m.mutation_type==r.type&&m.occurred_at_ms==r.occurred_at_ms&&Identity(m)==r.identity);
            Need((m.physical_json.empty()?SerializeRecordingMutationV1(m):m.physical_json)==raw.substr(0,raw.size()-1));
            if(i!=seen)out<<',';out<<normalize(raw.substr(0,raw.size()-1));
        }
        out<<"],\"backlog\":"<<(end<all.size()?"true":"false")<<",\"partialBytes\":"<<partial<<",\"consumedOffset\":"<<complete<<",\"readBytes\":"<<files.bytes<<'}';
        files.Bound();if(files.Pending()||files.Read("recording-generation.json",65536)!=manifest_bytes)return "{\"busy\":true}";
        Need(files.Read(".recording-store-format",65536)==marker);const auto result=out.str();Need(result.size()<=kBytes);return result;
    }catch(const Busy&){return "{\"busy\":true}";}
    catch(...){if(files.Pending()||files.Read("recording-generation.json",65536)!=manifest_bytes)return "{\"busy\":true}";throw;}
}
}
