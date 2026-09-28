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
#include <chrono>
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
inline bool Exact(const struct stat& a,const struct stat& b){return Same(a,b)&&a.st_mode==b.st_mode&&a.st_nlink==b.st_nlink&&a.st_size==b.st_size&&Times(a,b);}
struct Busy {};
inline std::string Digest(const std::string& bytes){unsigned char d[32];unsigned n=0;Need(EVP_Digest(bytes.data(),bytes.size(),d,&n,EVP_sha256(),nullptr)==1&&n==32);const char* hex="0123456789abcdef";std::string out;for(const auto c:d){out+=hex[c>>4];out+=hex[c&15];}return out;}
inline std::string Q(const std::string& value){std::ostringstream out;out<<std::quoted(value);return out.str();}
class SessionCache {
    using Binding=std::pair<std::string,struct stat>;
    std::optional<struct stat> root_;
    std::unordered_map<std::string,struct stat> files_;
    std::size_t file_bytes_{0},snapshot_bytes_{0};
    std::string manifest_,snapshot_hash_;
    RecordingGenerationFile snapshot_file_,identity_head_;
    struct stat snapshot_stat_{};
    bool snapshot_proof_{false};
    RecordingIdentityChainResult chain_;
    std::vector<Binding> chain_bindings_;
    std::size_t chain_bytes_{0};
    bool chain_proof_{false};
    bool SnapshotMatches(const std::string& manifest_bytes,const RecordingGenerationManifest& manifest)const{
        return snapshot_proof_&&manifest_==manifest_bytes&&snapshot_hash_==manifest.snapshot.sha256&&
            snapshot_file_.name==manifest.snapshot.name&&snapshot_file_.size==manifest.snapshot.size&&snapshot_file_.sha256==manifest.snapshot.sha256;
    }
    void ClearProof(){snapshot_bytes_=0;manifest_.clear();snapshot_hash_.clear();snapshot_file_={};identity_head_={};snapshot_stat_={};snapshot_proof_=false;}
    void ClearChain(){chain_={};chain_bindings_.clear();chain_bytes_=0;chain_proof_=false;}
    static bool SameFile(const RecordingGenerationFile& a,const RecordingGenerationFile& b){return a.name==b.name&&a.size==b.size&&a.sha256==b.sha256;}
    static std::size_t ChainCharge(const RecordingIdentityChainResult& value,const std::vector<Binding>& bindings){
        constexpr std::size_t cap=24U*1024*1024;std::size_t bytes=0;bool exceeded=false;
        const auto charge=[&](std::size_t count){if(exceeded||count>cap||bytes>cap-count){exceeded=true;return;}bytes+=count;};
        const auto add=[&](const std::string& text){charge(text.size());};
        charge(sizeof(value));if(bindings.size()>cap/sizeof(Binding))exceeded=true;else charge(bindings.size()*sizeof(Binding));
        add(value.store_id);add(value.head.name);add(value.head.sha256);
        for(const auto& file:value.archive_files){add(file.name);add(file.sha256);charge(sizeof(file));}
        for(const auto& accepted:value.first_acceptances){charge(sizeof(accepted));add(accepted.mutation_id);add(accepted.first_row.mutation_id);add(accepted.first_row.entity_id);add(accepted.first_row.identity);add(accepted.first_row.raw_sha256);add(accepted.first_archive.name);add(accepted.first_archive.sha256);
            if(accepted.first_row.reservation){const auto& order=*accepted.first_row.reservation;add(order.schema);add(order.store_id);add(order.request_id);add(order.segment_id);add(order.channel_id);}}
        add(value.order_history.bound_store);for(const auto& entry:value.order_history.reservations){charge(sizeof(entry));add(entry.order.schema);add(entry.order.store_id);add(entry.order.request_id);add(entry.order.segment_id);add(entry.order.channel_id);}
        for(const auto& id:value.order_history.ordinary_ids)add(id);for(const auto& id:value.order_history.legacy_segments)add(id);
        for(const auto& binding:bindings)add(binding.first);return exceeded?cap+1:bytes;
    }
public:
    // 현재 shard parse 4MiB와 검증된 chain proof 최대24MiB를 분리한다. inode/snapshot은 실제 이름·binding만 계상한다.
    // 전체는 logical_bytes로 관측하며 예산 초과 chain은 캐시하지 않고 엄격 전체 검증으로 복귀한다.
    RecordingIdentityShardParseCache identities{4U*1024*1024};
    std::size_t snapshot_hits{0},snapshot_misses{0},chain_hits{0},chain_misses{0},chain_extensions{0};
    std::size_t logical_bytes()const{return file_bytes_+snapshot_bytes_+chain_bytes_+identities.logical_bytes();}
    void Bind(int fd){struct stat s{};Need(::fstat(fd,&s)==0);if(root_)Need(Same(*root_,s));else root_=s;}
    void File(const std::string& name,const struct stat& s){
        const auto found=files_.find(name);if(found!=files_.end()){Need(Exact(found->second,s));return;}
        const auto charge=name.size()+sizeof(struct stat)+128;
        if(charge>8U*1024*1024-file_bytes_){files_.clear();file_bytes_=0;identities.Clear();ClearProof();}
        files_.emplace(name,s);file_bytes_+=charge;
    }
    std::optional<RecordingGenerationFile> ReuseSnapshot(int root,const std::string& manifest_bytes,
        const RecordingGenerationManifest& manifest){
        if(!SnapshotMatches(manifest_bytes,manifest))return std::nullopt;
        struct stat current{};Need(::fstatat(root,manifest.snapshot.name.c_str(),&current,AT_SYMLINK_NOFOLLOW)==0&&S_ISREG(current.st_mode)&&current.st_nlink==1&&Exact(snapshot_stat_,current));
        ++snapshot_hits;return identity_head_;
    }
    void VerifySnapshot(int root,const std::string& manifest_bytes,const RecordingGenerationManifest& manifest)const{
        Need(SnapshotMatches(manifest_bytes,manifest));struct stat current{};
        Need(::fstatat(root,manifest.snapshot.name.c_str(),&current,AT_SYMLINK_NOFOLLOW)==0&&S_ISREG(current.st_mode)&&current.st_nlink==1&&Exact(snapshot_stat_,current));
    }
    RecordingGenerationFile Snapshot(const std::string& raw,const std::string& manifest_bytes,
        const RecordingGenerationManifest& manifest,const struct stat& status){
        ++snapshot_misses;RecordingCatalogSnapshot parsed;std::string error;
        Need(ParseRecordingCatalogSnapshot(raw,kBytes,&parsed,&error)&&ValidateRecordingCatalogSnapshotManifest(parsed,manifest,&error));
        manifest_=manifest_bytes;snapshot_hash_=manifest.snapshot.sha256;snapshot_file_=manifest.snapshot;identity_head_=parsed.identity_head;snapshot_stat_=status;snapshot_proof_=true;
        snapshot_bytes_=manifest_bytes.size()+snapshot_file_.name.size()+snapshot_file_.sha256.size()+identity_head_.name.size()+identity_head_.sha256.size()+sizeof(struct stat)+256;
        return identity_head_;
    }
    const RecordingIdentityChainResult* VerifiedChain(int root){
        if(!chain_proof_){++chain_misses;return nullptr;}
        for(const auto& binding:chain_bindings_){struct stat current{};Need(::fstatat(root,binding.first.c_str(),&current,AT_SYMLINK_NOFOLLOW)==0&&S_ISREG(current.st_mode)&&current.st_nlink==1&&Exact(binding.second,current));}
        return &chain_;
    }
    bool ChainHeadMatches(const RecordingGenerationFile& head)const{return chain_proof_&&SameFile(chain_.head,head);}
    const RecordingIdentityChainResult* StoreChain(const RecordingIdentityChainResult& value,std::vector<Binding> bindings){
        const auto charge=ChainCharge(value,bindings);if(charge>24U*1024*1024){ClearChain();return nullptr;}
        chain_=value;chain_bindings_=std::move(bindings);chain_bytes_=charge;chain_proof_=true;identities.Clear();return &chain_;
    }
    const RecordingIdentityChainResult* StoreExtendedChain(const RecordingIdentityChainResult& value,const std::string& name,const struct stat& status){
        auto bindings=chain_bindings_;bindings.emplace_back(name,status);++chain_extensions;return StoreChain(value,std::move(bindings));
    }
    std::size_t chain_bytes()const{return chain_bytes_;}
    void NoteChainHit(){++chain_hits;}
};
struct Reader {
    std::filesystem::path path;Fd root;std::uint64_t bytes{0};SessionCache* cache;
    explicit Reader(const std::filesystem::path& p,SessionCache* c=nullptr):path(p),root(Open(p)),cache(c){if(cache)cache->Bind(root.n);}
    static int Open(const std::filesystem::path& p){
        Need(p.is_absolute()&&p!=p.root_path());int fd=::open("/",O_RDONLY|O_DIRECTORY|O_CLOEXEC);
        for(const auto& part:p.relative_path()){if(part=="."||part==".."){if(fd>=0)::close(fd);Need(false);}if(fd<0)return fd;const int next=::openat(fd,part.c_str(),O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);::close(fd);fd=next;}return fd;
    }
    bool Pending(){struct stat s{};for(const auto* n:{".recording-generation-transaction.json",".recording-generation-transaction.stage"}){if(::fstatat(root.n,n,&s,AT_SYMLINK_NOFOLLOW)==0)return true;Need(errno==ENOENT);}return false;}
    std::string Read(const std::string& name,std::uint64_t cap,bool growing=false,bool immutable=false,struct stat* bound=nullptr){
        Need(!name.empty()&&name.find('/')==std::string::npos&&name!="."&&name!="..");
        Fd fd(::openat(root.n,name.c_str(),O_RDONLY|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK));struct stat a{},b{},named{};
        Need(::fstat(fd.n,&a)==0&&S_ISREG(a.st_mode)&&a.st_nlink==1&&a.st_size>=0&&std::uint64_t(a.st_size)<=cap&&std::uint64_t(a.st_size)<=kBytes-bytes);
        std::string value(static_cast<std::size_t>(a.st_size),'\0');std::size_t offset=0;
        while(offset<value.size()){auto n=::pread(fd.n,value.data()+offset,std::min<std::size_t>(65536,value.size()-offset),static_cast<off_t>(offset));if(n<0&&errno==EINTR)continue;Need(n>0);offset+=n;}
        Need(::fstat(fd.n,&b)==0&&::fstatat(root.n,name.c_str(),&named,AT_SYMLINK_NOFOLLOW)==0&&Same(a,b)&&Same(b,named)&&S_ISREG(named.st_mode)&&b.st_nlink==1&&named.st_nlink==1&&
            (growing?b.st_size>=a.st_size:b.st_size==a.st_size)&&named.st_size==b.st_size);
        if(growing&&b.st_size>a.st_size)throw Busy{};
        Need(Times(a,b)&&Times(b,named));if(immutable&&cache)cache->File(name,b);if(bound)*bound=b;bytes+=value.size();return value;
    }
    std::string Verified(const RecordingGenerationFile& file,struct stat* bound=nullptr){const auto value=Read(file.name,kBytes,false,true,bound);Need(value.size()==file.size&&Digest(value)==file.sha256);return value;}
    void Bound(){Fd now(Open(path));struct stat a{},b{};Need(::fstat(root.n,&a)==0&&::fstat(now.n,&b)==0&&Same(a,b));}
};
inline std::string Identity(const RecordingMutationV1& m){
    if(m.mutation_type!=RecordingMutationType::EventLinkReceipt)return Digest(SerializeRecordingMutationV1(m));
    ingress::StrictJsonObjectDocument d;Need(ingress::ParseStrictJsonObjectDocument(m.payload_json,&d,nullptr));return ingress::StrictJsonStringField(d,"originalSha256").value_or("");
}
inline std::string Token(const RecordingIdentityRow& r){const auto type=r.type==RecordingMutationType::EventLinkReceipt?"event_link_created":RecordingMutationTypeName(r.type);return "["+Q(r.mutation_id)+","+Q(r.entity_id)+","+Q(type)+","+Q(r.identity)+","+Q(std::to_string(r.occurred_at_ms))+"]";}
inline std::string PrefixDigest(const std::vector<RecordingIdentityFirstAcceptance>& rows,std::size_t count){
    EVP_MD_CTX* raw=EVP_MD_CTX_new();Need(raw);std::unique_ptr<EVP_MD_CTX,decltype(&EVP_MD_CTX_free)> context(raw,EVP_MD_CTX_free);Need(EVP_DigestInit_ex(context.get(),EVP_sha256(),nullptr)==1);
    for(std::size_t i=0;i<count;++i){const auto token=Token(rows[i].first_row);std::array<unsigned char,8> size{};auto n=std::uint64_t(token.size());for(std::size_t j=0;j<size.size();++j){size[size.size()-1-j]=static_cast<unsigned char>(n&0xff);n>>=8;}Need(EVP_DigestUpdate(context.get(),size.data(),size.size())==1&&EVP_DigestUpdate(context.get(),token.data(),token.size())==1);}
    unsigned char digest[32];unsigned size=0;Need(EVP_DigestFinal_ex(context.get(),digest,&size)==1&&size==32);const char* hex="0123456789abcdef";std::string out;out.reserve(64);for(const auto c:digest){out+=hex[c>>4];out+=hex[c&15];}return out;
}
inline std::string Observe(const std::filesystem::path& root,std::size_t seen,
    const std::function<std::string(const std::string&)>& normalize,
    const std::function<void()>& after_manifest={},SessionCache* cache=nullptr,bool delta_prefix=false){
    const auto started=std::chrono::steady_clock::now();
    Reader files(root,cache);if(files.Pending())return "{\"busy\":true}";
    const auto marker=files.Read(".recording-store-format",65536),manifest_bytes=files.Read("recording-generation.json",65536);
    // 검증 전용 경계: 이전 manifest를 잡은 reader와 checkpoint 게시를 결정적으로 교차시킨다.
    if(after_manifest)after_manifest();
    try {
        ingress::StrictJsonObjectDocument mark;RecordingGenerationManifest manifest;std::string error;
        Need(ingress::ParseStrictJsonObjectDocument(marker,&mark,nullptr)&&mark.members.size()==3&&ingress::StrictJsonStringField(mark,"format")=="media-server.managed-recording-store.v2"&&
            ingress::StrictJsonStringField(mark,"manifest")=="recording-generation.json"&&ParseRecordingGenerationManifest(manifest_bytes,&manifest,&error)&&ingress::StrictJsonStringField(mark,"storeId")==manifest.store_id);
        RecordingGenerationFile identity_head;const auto reused=cache?cache->ReuseSnapshot(files.root.n,manifest_bytes,manifest):std::nullopt;
        if(reused)identity_head=*reused;
        else {struct stat snapshot_stat{};const auto snapshot_bytes=files.Verified(manifest.snapshot,&snapshot_stat);RecordingCatalogSnapshot parsed_snapshot;
            if(cache)identity_head=cache->Snapshot(snapshot_bytes,manifest_bytes,manifest,snapshot_stat);
            else {Need(ParseRecordingCatalogSnapshot(snapshot_bytes,kBytes,&parsed_snapshot,&error)&&ValidateRecordingCatalogSnapshotManifest(parsed_snapshot,manifest,&error));identity_head=parsed_snapshot.identity_head;}}
        const auto snapshot_done=std::chrono::steady_clock::now();
        auto active=files.Read(manifest.active.name,kBytes,true);Need(active.size()>=manifest.active.size&&Digest(active.substr(0,manifest.active.size))==manifest.active.sha256);
        const auto lf=active.rfind('\n'),complete=lf==std::string::npos?0:lf+1,partial=active.size()-complete;Need(manifest.active.size<=complete&&(!manifest.active.size||active[manifest.active.size-1]=='\n'));
        active.resize(complete);RecordingIdentityShard immutable_head;struct stat head_stat{};
        const auto head_bytes=files.Verified(identity_head,&head_stat);
        if(cache){std::shared_ptr<const RecordingIdentityShard> head_value;Need(cache->identities.Parse(head_bytes,&head_value,&error));immutable_head=*head_value;}
        else Need(ParseRecordingIdentityShard(head_bytes,&immutable_head,&error));
        Need(immutable_head.store_id==manifest.store_id&&immutable_head.generation==manifest.generation);
        for(const auto& row:immutable_head.rows)Need(row.global_ordinal<manifest.cut_ordinal);
        std::vector<RecordingIdentityRow> active_rows;
        std::size_t off=0;while(off<active.size()){
            const auto end=active.find('\n',off);Need(end!=std::string::npos&&end>off&&end-off<16*1024*1024);
            const auto text=active.substr(off,end-off);RecordingMutationV1 m;Need(ParseRecordingMutationV1(text,&m,&error)&&
                (m.physical_json.empty()?SerializeRecordingMutationV1(m):m.physical_json)==text);
            Need(active_rows.size()<UINT64_MAX-manifest.cut_ordinal);RecordingIdentityRow r;r.mutation_id=m.mutation_id;r.type=m.mutation_type;r.entity_id=m.entity_id;r.occurred_at_ms=m.occurred_at_ms;
            r.global_ordinal=manifest.cut_ordinal+active_rows.size();r.identity=Identity(m);r.archive_slot=0;r.offset=off;r.length=end-off+1;r.raw_sha256=Digest(active.substr(off,r.length));
            if(m.mutation_type==RecordingMutationType::RecordingOrderReserved){RecordingOrderReservationV1 order;Need(ParseRecordingOrderReservationV1(m.payload_json,&order,&error));r.reservation=order;}
            active_rows.push_back(std::move(r));off=end+1;
        }
        const auto active_done=std::chrono::steady_clock::now();
        const RecordingIdentityChainLimits limits{kBytes,100000,100000};RecordingIdentityChainResult immutable_chain,chain;
        const RecordingIdentityChainResult* base=nullptr;const auto cached=cache?cache->VerifiedChain(files.root.n):nullptr;
        if(cached&&cache->ChainHeadMatches(identity_head)){cache->NoteChainHit();base=cached;}
        else if(cached&&immutable_head.previous&&immutable_head.previous->name==cached->head.name&&immutable_head.previous->size==cached->head.size&&immutable_head.previous->sha256==cached->head.sha256&&
                ValidateRecordingIdentityShardChainExtension(*cached,identity_head,immutable_head,limits,&immutable_chain,&error)){
            const auto stored=cache->StoreExtendedChain(immutable_chain,identity_head.name,head_stat);base=stored?stored:&immutable_chain;
        }
        if(!base){
            error.clear();immutable_chain={};
            std::vector<std::pair<std::string,struct stat>> bindings;
            const auto loader=[&](const RecordingGenerationFile& d,std::uint64_t limit,std::string* out,std::string*){Need(d.size<=limit);struct stat bound{};
                if(d.name==identity_head.name){Need(d.size==identity_head.size&&d.sha256==identity_head.sha256);*out=head_bytes;bound=head_stat;}
                else *out=files.Verified(d,&bound);bindings.emplace_back(d.name,bound);return true;};
            Need(ValidateRecordingIdentityShardChain(identity_head,loader,limits,&immutable_chain,&error,cache?&cache->identities:nullptr));
            const auto stored=cache?cache->StoreChain(immutable_chain,std::move(bindings)):nullptr;base=stored?stored:&immutable_chain;
        }
        const RecordingGenerationFile active_file{manifest.active.name,active.size(),Digest(active)};
        Need(ValidateRecordingIdentityActiveExtension(*base,active_file,active_rows,limits,&chain,&error));
        const auto chain_done=std::chrono::steady_clock::now();
        auto& all=chain.first_acceptances;std::sort(all.begin(),all.end(),[](const auto& a,const auto& b){return a.first_global_ordinal<b.first_global_ordinal;});Need(seen<=all.size());
        const auto end=std::min(all.size(),seen+128);std::ostringstream out;out<<"{\"busy\":false,\"storeHash\":"<<Q(Digest(manifest.store_id))<<",\"generation\":"<<Q(std::to_string(manifest.generation));
        if(delta_prefix)out<<",\"prefixStart\":"<<seen<<",\"prefixHash\":"<<Q(PrefixDigest(all,seen))<<",\"prefixEndHash\":"<<Q(PrefixDigest(all,end));
        out<<",\"prefix\":[";const auto prefix_start=delta_prefix?seen:0;
        for(std::size_t i=prefix_start;i<end;++i){if(i!=prefix_start)out<<',';out<<Q(Token(all[i].first_row));}out<<"],\"rows\":[";
        std::string archive_name,archive;for(std::size_t i=seen;i<end;++i){const auto& a=all[i];const auto& r=a.first_row;
            if(archive_name!=a.first_archive.name){archive_name=a.first_archive.name;archive=archive_name==manifest.active.name?active:files.Verified(a.first_archive);}
            Need(r.offset<=archive.size()&&r.length<=archive.size()-r.offset&&r.length&&r.length<=16*1024*1024+1);
            const auto raw=archive.substr(r.offset,r.length);Need(raw.back()=='\n'&&raw.find('\n')==raw.size()-1&&Digest(raw)==r.raw_sha256);RecordingMutationV1 m;
            Need(ParseRecordingMutationV1(raw.substr(0,raw.size()-1),&m,&error)&&m.mutation_id==r.mutation_id&&m.entity_id==r.entity_id&&m.mutation_type==r.type&&m.occurred_at_ms==r.occurred_at_ms&&Identity(m)==r.identity);
            Need((m.physical_json.empty()?SerializeRecordingMutationV1(m):m.physical_json)==raw.substr(0,raw.size()-1));
            if(i!=seen)out<<',';out<<normalize(raw.substr(0,raw.size()-1));
        }
        out<<"],\"backlog\":"<<(end<all.size()?"true":"false")<<",\"partialBytes\":"<<partial<<",\"consumedOffset\":"<<complete<<",\"readBytes\":"<<files.bytes;
        if(cache){const auto micros=[](auto from,auto to){return std::chrono::duration_cast<std::chrono::microseconds>(to-from).count();};
            out<<",\"parseCache\":{\"snapshotHits\":"<<cache->snapshot_hits<<",\"snapshotMisses\":"<<cache->snapshot_misses<<",\"identityHits\":"<<cache->identities.hits()<<",\"identityMisses\":"<<cache->identities.misses()<<",\"logicalBytes\":"<<cache->logical_bytes()
               <<",\"chainHits\":"<<cache->chain_hits<<",\"chainMisses\":"<<cache->chain_misses<<",\"chainExtensions\":"<<cache->chain_extensions<<",\"chainBytes\":"<<cache->chain_bytes()
               <<",\"snapshotMicros\":"<<micros(started,snapshot_done)<<",\"activeMicros\":"<<micros(snapshot_done,active_done)<<",\"chainMicros\":"<<micros(active_done,chain_done)<<",\"outputMicros\":"<<micros(chain_done,std::chrono::steady_clock::now())<<'}';}
        out<<'}';
        files.Bound();if(files.Pending()||files.Read("recording-generation.json",65536)!=manifest_bytes)return "{\"busy\":true}";
        if(cache)cache->VerifySnapshot(files.root.n,manifest_bytes,manifest);
        Need(files.Read(".recording-store-format",65536)==marker);const auto result=out.str();Need(result.size()<=kBytes);return result;
    }catch(const Busy&){return "{\"busy\":true}";}
    catch(...){if(files.Pending()||files.Read("recording-generation.json",65536)!=manifest_bytes)return "{\"busy\":true}";throw;}
}
}
