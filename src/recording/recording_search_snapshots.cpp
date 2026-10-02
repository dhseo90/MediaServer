// 파일 용도: snapshot pool과 SHA-256 질의 결박, HMAC 인증 불투명 cursor.
#include "recording/recording_search_snapshots.h"
#include <algorithm>
#include <charconv>
#include <limits>
#include <stdexcept>
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/crypto.h>
#include <openssl/evp.h>
#include <openssl/hmac.h>
#include <openssl/rand.h>
#endif
namespace recording {
namespace {
bool Fail(std::string* error,const char* reason){if(error)*error=reason;return false;}
std::string Hex(const unsigned char* data,std::size_t size){
    static constexpr char digits[]="0123456789abcdef";std::string out;out.reserve(size*2);
    for(std::size_t i=0;i<size;++i){out+=digits[data[i]>>4];out+=digits[data[i]&15];}return out;
}
bool Identity(const std::string& s){return !s.empty()&&s.size()<=4096&&
    std::none_of(s.begin(),s.end(),[](unsigned char c){return c<32||c==127;});}
bool QueryHash(const RecordingSearchQuery& q,std::string* result){
    std::string value="recording-search-query-v1:";
    const auto append=[&](const std::string& s){value+=std::to_string(s.size())+":"+s;};
    append(std::to_string(q.start_time_ms));append(std::to_string(q.end_time_ms));
    append(q.include_unplaced?"1":"0");append(std::to_string(q.limit));
    for(const auto* list:{&q.channels,&q.objects,&q.tracks,&q.events,&q.zones,&q.rules,&q.behaviours}){
        append(std::to_string(list->size()));for(const auto& s:*list)append(s);
    }
#if MEDIA_SERVER_USE_OPENSSL
    unsigned char digest[32];unsigned length=0;
    if(EVP_Digest(value.data(),value.size(),digest,&length,EVP_sha256(),nullptr)!=1||length!=32)return false;
    *result=Hex(digest,32);return true;
#else
    (void)result;return false;
#endif
}
}
RecordingSearchSnapshots::RecordingSearchSnapshots(SearchSnapshotLimits limits):limits_(limits){
#if MEDIA_SERVER_USE_OPENSSL
    ready_=RAND_bytes(secret_.data(),secret_.size())==1;
#else
    (void)secret_;
#endif
}
bool RecordingSearchSnapshots::Mac(const std::string& value,std::string* result) const {
#if MEDIA_SERVER_USE_OPENSSL
    unsigned char digest[32];unsigned length=0;
    if(!ready_||!HMAC(EVP_sha256(),secret_.data(),secret_.size(),
        reinterpret_cast<const unsigned char*>(value.data()),value.size(),digest,&length)||length!=32)return false;
    *result=Hex(digest,32);return true;
#else
    (void)value;(void)result;return false;
#endif
}
void RecordingSearchSnapshots::Expire(Clock::time_point now){
    for(auto it=entries_.begin();it!=entries_.end();) {
        if(now>=it->expires){bytes_-=it->bytes;it=entries_.erase(it);}else ++it;
    }
}
bool RecordingSearchSnapshots::Page(const Entry& entry,std::size_t offset,RecordingSearchPage* output,std::string* error) const {
    RecordingSearchPage page;page.model=entry.model;page.snapshot_id=entry.id;
    page.known_count=entry.matches.known_count;page.unplaced_count=entry.matches.unplaced_count;
    const auto end=offset+std::min(entry.limit,entry.matches.positions.size()-offset);
    page.positions.assign(entry.matches.positions.begin()+offset,entry.matches.positions.begin()+end);
    if(end<entry.matches.positions.size()){
        const auto body="v1."+entry.id+"."+std::to_string(end);std::string mac;
        if(!Mac(body,&mac))return Fail(error,"search-crypto-unavailable");page.next_cursor=body+"."+mac;
    }
    *output=std::move(page);if(error)error->clear();return true;
}
bool RecordingSearchSnapshots::Begin(std::shared_ptr<const RecordingSearchModel> model,const RecordingSearchQuery& input,
    const std::string& principal,const std::string& scope,RecordingSearchPage* output,std::string* error,Clock::time_point now){
    if(!output||!model||!Identity(principal)||!Identity(scope))return Fail(error,"search-invalid-snapshot");
    if(!ready_)return Fail(error,"search-crypto-unavailable");
    try {
        RecordingSearchQuery query;if(!NormalizeSearchQuery(input,&query,error))return false;
        Entry entry;entry.model=std::move(model);entry.principal=principal;entry.scope=scope;entry.limit=query.limit;
        if(!entry.model->Query(query,&entry.matches,error))return false;
        if(!QueryHash(query,&entry.query_hash))return Fail(error,"search-crypto-unavailable");
        unsigned char id[16];
#if MEDIA_SERVER_USE_OPENSSL
        if(RAND_bytes(id,sizeof(id))!=1)return Fail(error,"search-crypto-unavailable");
#else
        return Fail(error,"search-crypto-unavailable");
#endif
        entry.id=Hex(id,sizeof(id));
        if(!limits_.max_snapshots||limits_.lifetime.count()<=0||limits_.lifetime>std::chrono::minutes(5))return Fail(error,"search-snapshot-capacity");
        entry.bytes=sizeof(Entry)+entry.principal.capacity()+entry.scope.capacity()+entry.id.capacity()+entry.query_hash.capacity();
        const auto add=[&](std::size_t n){if(entry.bytes>limits_.max_bytes||n>limits_.max_bytes-entry.bytes)return false;entry.bytes+=n;return true;};
        if(entry.matches.positions.capacity()>limits_.max_bytes/sizeof(std::size_t)||
            !add(entry.matches.positions.capacity()*sizeof(std::size_t))||!add(entry.model->accounted_bytes()))
            return Fail(error,"search-snapshot-capacity");
        const auto lifetime=std::chrono::duration_cast<Clock::duration>(limits_.lifetime);
        if(now>Clock::time_point::max()-lifetime)return Fail(error,"search-invalid-snapshot-time");
        entry.expires=now+lifetime;
        RecordingSearchPage page;if(!Page(entry,0,&page,error))return false;
        std::lock_guard<std::mutex> lock(mutex_);Expire(now);
        // 삽입이 성공한 뒤에만 기존 snapshot을 축출한다.
        entries_.push_back(std::move(entry));
        while(entries_.size()>limits_.max_snapshots || bytes_>limits_.max_bytes-entries_.back().bytes){
            bytes_-=entries_.front().bytes;entries_.pop_front();
        }
        bytes_+=entries_.back().bytes;
        *output=std::move(page);if(error)error->clear();return true;
    }catch(const std::bad_alloc&){return Fail(error,"search-snapshot-capacity");}
     catch(const std::length_error&){return Fail(error,"search-snapshot-capacity");}
}
bool RecordingSearchSnapshots::Resume(const std::string& cursor,const RecordingSearchQuery& input,
    const std::string& principal,const std::string& scope,RecordingSearchPage* output,std::string* error,Clock::time_point now){
    if(!output||!Identity(principal)||!Identity(scope))return Fail(error,"search-invalid-snapshot");
    if(cursor.size()>128||cursor.compare(0,3,"v1.")!=0)return Fail(error,"search-invalid-cursor");
    try {
        const auto split=cursor.rfind('.');
        if(split==std::string::npos||split<=36||cursor[35]!='.'||cursor.size()-split-1!=64)return Fail(error,"search-invalid-cursor");
        std::string mac;if(!Mac(cursor.substr(0,split),&mac))return Fail(error,"search-crypto-unavailable");
#if MEDIA_SERVER_USE_OPENSSL
        if(CRYPTO_memcmp(mac.data(),cursor.data()+split+1,64)!=0)return Fail(error,"search-invalid-cursor");
#endif
        std::size_t offset=0;const auto parsed=std::from_chars(cursor.data()+36,cursor.data()+split,offset);
        if(parsed.ec!=std::errc{}||parsed.ptr!=cursor.data()+split)return Fail(error,"search-invalid-cursor");
        RecordingSearchQuery query;if(!NormalizeSearchQuery(input,&query,error))return false;
        std::string hash;if(!QueryHash(query,&hash))return Fail(error,"search-crypto-unavailable");
        std::lock_guard<std::mutex> lock(mutex_);Expire(now);
        const auto id=cursor.substr(3,32);const auto it=std::find_if(entries_.begin(),entries_.end(),[&](const auto& e){return e.id==id;});
        if(it==entries_.end())return Fail(error,"search-snapshot-expired");
        if(it->query_hash!=hash||it->principal!=principal||it->scope!=scope)return Fail(error,"search-cursor-binding-mismatch");
        if(!offset||offset>=it->matches.positions.size()||offset%it->limit)return Fail(error,"search-invalid-cursor");
        return Page(*it,offset,output,error);
    }catch(const std::bad_alloc&){return Fail(error,"search-snapshot-capacity");}
     catch(const std::length_error&){return Fail(error,"search-snapshot-capacity");}
}
bool RecordingSearchSnapshots::ResolveHit(const std::string& id,const std::string& hit,
    const RecordingSearchQuery& input,const std::string& principal,const std::string& scope,
    std::shared_ptr<const RecordingSearchModel>* output,std::size_t* position,std::string* error,Clock::time_point now){
    if(!output||!position||id.size()!=32||!Identity(principal)||!Identity(scope))return Fail(error,"search-invalid-snapshot");
    try {
        RecordingSearchQuery query;if(!NormalizeSearchQuery(input,&query,error))return false;
        std::string hash;if(!QueryHash(query,&hash))return Fail(error,"search-crypto-unavailable");
        std::lock_guard<std::mutex> lock(mutex_);Expire(now);
        const auto it=std::find_if(entries_.begin(),entries_.end(),[&](const auto& entry){return entry.id==id;});
        if(it==entries_.end())return Fail(error,"search-snapshot-expired");
        if(it->query_hash!=hash||it->principal!=principal||it->scope!=scope)return Fail(error,"search-cursor-binding-mismatch");
        const auto* document=it->model->Find(hit);
        if(!document)return Fail(error,"search-hit-unavailable");
        const auto index=static_cast<std::size_t>(document-it->model->documents().data());
        if(!std::binary_search(it->matches.positions.begin(),it->matches.positions.end(),index))return Fail(error,"search-hit-unavailable");
        *output=it->model;*position=index;if(error)error->clear();return true;
    }catch(const std::bad_alloc&){return Fail(error,"search-snapshot-capacity");}
     catch(const std::length_error&){return Fail(error,"search-snapshot-capacity");}
}
} // namespace recording
