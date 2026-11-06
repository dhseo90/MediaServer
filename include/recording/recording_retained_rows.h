// 파일 용도: 검증된 비영속 Catalog 행을 한 값씩 읽는 내부 보존 자료 소유 경계.
#pragma once
#include <map>
#include <algorithm>
#include <vector>
#include <list>
#include <iterator>
#include <functional>
#include <cstdint>
#include <memory>
#include <stdexcept>
#include <string>
#include <utility>
#include "domain/strict_json.h"
#include "recording/recording_memory_reservation.h"
#include "recording/recording_contracts.h"
#include <limits>
#include <mutex>
#include <array>
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#endif
#include "recording/recording_latency_trace.h"

namespace recording {
// raw·parser·canonical 작업 공간은 Decode가 끝날 때까지 유지한다. typed 결과는
// 공개 전에 자체 몫을 확보하며 결과 사본은 별도 ticket을 획득한다.
struct RecordingColdRow {
    SearchModelResidency::Reservation memory;
    std::string bytes;
    std::shared_ptr<const RecordingTextSource> event_reason{};
};
inline std::size_t RecordingColdWorkspaceBytes(std::size_t bytes,const std::string& ={}) {
    // 인증된 raw 읽기와 고정 index·형태 작업의 예약이다. parser·DTO 허용 검사는
    // 할당 없는 집계 뒤 parsing 전에 별도로 수행한다.
    constexpr std::size_t fixed=64*1024;
    if(bytes>std::numeric_limits<std::size_t>::max()-fixed-1)throw RecordingResourceUnavailable();
    return fixed+bytes+1;
}
template<class T> std::size_t RecordingColdDecodeWorkspaceBytes(const std::string& json) {
    if constexpr(std::is_same_v<T,EventRecordingLinkV1>)return RecordingEventLinkWorkspaceBytes(json);
    std::size_t element=0,raw_copies=0;
    // 실제 parser 호출 그래프에서 동시에 소유하는 JSON document·하위 객체 문자열의 최댓값이다.
    // SplitArray slot과 typed slot은 별도로 센다.
    if constexpr(std::is_same_v<T,EventRecordingLinkV1>)return RecordingEventLinkWorkspaceBytes(json);
    else if constexpr(std::is_same_v<T,bool>)return 64*1024;
    else if constexpr(std::is_same_v<T,std::string>){raw_copies=2;}
    else if constexpr(std::is_same_v<T,RecordingSegmentStateV2>||std::is_same_v<T,RecordingTombstoneV1>){raw_copies=2;}
    else if constexpr(std::is_same_v<T,RecordingSegmentV1>){raw_copies=4;element=sizeof(std::string);}
    else if constexpr(std::is_same_v<T,RecordingSegmentV2>){raw_copies=4;element=sizeof(RecordingUtcMappingV1);}
    else if constexpr(std::is_same_v<T,RecordingConsumerReferenceV1>){raw_copies=4;}
    else if constexpr(std::is_same_v<T,AnalysisObservationV1>||std::is_same_v<T,AnalysisObservationV2>){raw_copies=6;element=sizeof(std::string);}
    else if constexpr(std::is_same_v<T,RecordingTombstoneV2>){raw_copies=6;element=sizeof(RecordingUtcMappingV1);}
    else if constexpr(std::is_same_v<T,ReferencedObservationV1>){raw_copies=8;element=sizeof(std::string);}
    else {static_assert(!std::is_same_v<T,T>,"cold DTO requires an explicit parser storage model");}
    // canonical 소유자 셋은 stream 확장 buffer, 이전 확장 buffer, 반환값이다.
    return sizeof(T)+ingress::StrictJsonWorkspaceBytes(json,raw_copies+3,element,false);
}
template<class T,bool(*Parse)(const std::string&,T*,std::string*),std::string(*Serialize)(const T&)>
class RecordingRetainedRows;
class RecordingRetainedRowStore {
    template<class T,bool(*Parse)(const std::string&,T*,std::string*),std::string(*Serialize)(const T&)>
    friend class RecordingRetainedRows;
    // parsing한 segment-v2 값만 memo에 보관하며 매 조회마다 현재 raw row를 읽고
    // 인증한다. 이 memo는 구성원 여부나 cut의 권위 근거가 될 수 없다.
    struct DecodedSegment {
        SearchModelResidency::Reservation memory;
        std::array<unsigned char,32> digest{};
        std::size_t raw_bytes=0;
        std::shared_ptr<const void> row;
        std::size_t charged=0;
        std::list<std::string>::iterator recent;
    };
    struct SegmentClass {
        SearchModelResidency::Reservation memory;
        std::array<unsigned char,32> digest{};
        std::string channel;
        RecordingRetentionClass retention{RecordingRetentionClass::Unknown};
        std::size_t raw_bytes=0,charged=0;
    };
    std::map<std::string,SegmentClass> segment_classes_;
    static bool RawDigest(const std::string& raw,std::array<unsigned char,32>* digest) noexcept {
#if MEDIA_SERVER_USE_OPENSSL
        unsigned size=0;return EVP_Digest(raw.data(),raw.size(),digest->data(),&size,EVP_sha256(),nullptr)==1&&size==digest->size();
#else
        (void)raw;(void)digest;return false;
#endif
    }
    // Decode만 cache 작업 사이에서 이 증명을 공유할 수 있으며 호출 전체 동안
    // 인증된 raw를 소유한다. 어떤 request·revision도 이 수명을 넘겨 보유하지 않는다.
    // 실패한 digest 시도는 memo에 보관하지 않아 선택적 cache의 fallback을 유지한다.
    class DecodeDigest {
        const std::string& raw_;
        std::array<unsigned char,32> digest_{};
        bool ready_=false;
    public:
        explicit DecodeDigest(const std::string& raw):raw_(raw){}
        DecodeDigest(const DecodeDigest&)=delete;
        DecodeDigest& operator=(const DecodeDigest&)=delete;
        const std::string& Raw()const{return raw_;}
        bool Get(std::array<unsigned char,32>* digest) {
            if(!ready_)ready_=RawDigest(raw_,&digest_);
            if(ready_)*digest=digest_;
            return ready_;
        }
    };
    void EvictDecodedOne() {
        if(!decoded_segments_.empty()){const auto old=decoded_segments_.find(decoded_recency_.front());EraseDecoded(old);}
        else if(!segment_classes_.empty()){const auto old=segment_classes_.begin();decoded_bytes_-=old->second.charged;segment_classes_.erase(old);}
    }
    mutable std::mutex decoded_mu_;
    std::map<std::string,DecodedSegment> decoded_segments_;
    std::list<std::string> decoded_recency_;
    void EraseDecoded(std::map<std::string,DecodedSegment>::iterator it) {
        decoded_bytes_-=it->second.charged;decoded_recency_.erase(it->second.recent);decoded_segments_.erase(it);
    }
    std::size_t decoded_limit_=0,decoded_bytes_=0;
    bool decoded_closed_=false;
public:
    virtual ~RecordingRetainedRowStore()=default;
    virtual bool Get(const std::string&,const std::string&,std::string*,bool*,std::string*)=0;
    virtual bool GetOwned(const std::string&,const std::string&,RecordingColdRow*,bool*,std::string*)=0;
    virtual bool NextOwned(const std::string&,const std::string&,std::string*,RecordingColdRow*,bool*,std::string*)=0;
    virtual std::shared_ptr<SearchModelResidency> MemoryOwner()const=0;
    virtual bool Put(const std::string&,const std::string&,const std::string&,std::string*)=0;
    virtual bool PutEventLink(const std::string&,const EventRecordingLinkV1&,std::string*)=0;
    virtual bool Next(const std::string&,const std::string&,std::string*,std::string*,bool*,std::string*)=0;
    virtual bool VisitOwned(const std::string&,const std::function<bool(const std::string&,RecordingColdRow&,std::string*)>&,std::string*)=0;
    virtual bool Visit(const std::string&,const std::function<bool(const std::string&,const std::string&,std::string*)>&,std::string*)=0;
    virtual std::uint64_t Count(const std::string&)const=0;
    void EnableVerifiedSegmentDecodeCache() {
        std::lock_guard lock(decoded_mu_);if(!decoded_closed_)decoded_limit_=16*1024*1024;
    }
    void ClearVerifiedSegmentDecodeCache() {
        std::lock_guard lock(decoded_mu_);decoded_recency_.clear();decoded_segments_.clear();segment_classes_.clear();decoded_bytes_=0;
    }
    void CloseVerifiedSegmentDecodeCache() {
        std::lock_guard lock(decoded_mu_);decoded_closed_=true;decoded_limit_=0;
        decoded_recency_.clear();decoded_segments_.clear();segment_classes_.clear();decoded_bytes_=0;
    }
    std::shared_ptr<const void> VerifiedSegmentDecode(const std::string& id,const std::string& raw) {
        DecodeDigest digest(raw);return VerifiedSegmentDecodeWithDigest(id,digest);
    }
private:
    std::shared_ptr<const void> VerifiedSegmentDecodeWithDigest(const std::string& id,DecodeDigest& proof) {
        const auto& raw=proof.Raw();
        // 호출자가 방금 현재 raw row 전체를 인증했다. parsing한 값 옆에는
        // 별도 소유 JSON 문자열 대신 해당 row의 SHA-256 identity를 보관한다.
        // revision·ID·열린 FD는 이 읽기를 대체할 수 없다.
        std::array<unsigned char,32> digest{};if(!proof.Get(&digest))return {};
        std::lock_guard lock(decoded_mu_);const auto it=decoded_segments_.find(id);
        if(it==decoded_segments_.end())return {};
        if(it->second.raw_bytes==raw.size()&&it->second.digest==digest){decoded_recency_.splice(decoded_recency_.end(),decoded_recency_,it->second.recent);return it->second.row;}
        EraseDecoded(it);return {};
    }
public:
    // 동일한 인증 raw를 제외 목적으로만 분류한다. 이 분류로는 구성원 여부·부재·
    // 현재 lifecycle·선택한 event payload를 증명할 수 없다.
    template<class F> std::optional<bool> VerifiedSegmentClassMatches(const std::string& id,const std::string& raw,F&& matches) {
        std::array<unsigned char,32> digest{};if(!RawDigest(raw,&digest))return {};
        std::lock_guard lock(decoded_mu_);const auto it=segment_classes_.find(id);
        if(it==segment_classes_.end())return {};
        if(it->second.raw_bytes!=raw.size()||it->second.digest!=digest){
            decoded_bytes_-=it->second.charged;segment_classes_.erase(it);return {};
        }
        return matches(it->second.channel,it->second.retention);
    }
    std::optional<bool> VerifiedSegmentSelection(const std::string& id,const std::string& raw,const std::string& channel) {
        return VerifiedSegmentClassMatches(id,raw,[&](const auto& current,auto retention){
            return current==channel&&retention!=RecordingRetentionClass::Continuous;
        });
    }
    std::optional<bool> VerifiedSegmentChannelSelection(const std::string& id,const std::string& raw,const std::vector<std::string>& channels) {
        return VerifiedSegmentClassMatches(id,raw,[&](const auto& current,auto){
            return std::find(channels.begin(),channels.end(),current)!=channels.end();
        });
    }
    void RememberVerifiedSegmentClass(const std::string& id,const std::string& raw,const RecordingSegmentV2& segment) {
        DecodeDigest digest(raw);RememberVerifiedSegmentClassWithDigest(id,digest,segment);
    }
private:
    void RememberVerifiedSegmentClassWithDigest(const std::string& id,DecodeDigest& proof,const RecordingSegmentV2& segment) {
        const auto& raw=proof.Raw();
        std::array<unsigned char,32> digest{};if(!proof.Get(&digest))return;
        const auto owner=MemoryOwner();
        std::lock_guard lock(decoded_mu_);if(decoded_closed_)return;
        const auto charge=sizeof(SegmentClass)+128+2*(id.size()+1)+segment.channel_id.size()+1;
        if(charge>decoded_limit_)return;
        if(const auto prior=segment_classes_.find(id);prior!=segment_classes_.end()){
            if(prior->second.raw_bytes==raw.size()&&prior->second.digest==digest)return;
            decoded_bytes_-=prior->second.charged;segment_classes_.erase(prior);
        }
        while(decoded_bytes_>decoded_limit_-charge)EvictDecodedOne();
        if(owner->used()>owner->limit()||charge>owner->limit()-owner->used())return;
        auto ticket=owner->ReserveOwned(charge,SearchModelResidency::Category::RetainedRaw);if(!ticket)return;
        try {segment_classes_.emplace(id,SegmentClass{std::move(*ticket),digest,segment.channel_id,segment.retention_class,raw.size(),charge});decoded_bytes_+=charge;}
        catch(const std::bad_alloc&) {} // optional scalar memo never replaces strict reading
    }
public:
    void ForgetVerifiedSegmentDecode(const std::string& id) {
        std::lock_guard lock(decoded_mu_);const auto it=decoded_segments_.find(id);
        if(it!=decoded_segments_.end())EraseDecoded(it);
        const auto summary=segment_classes_.find(id);if(summary!=segment_classes_.end()){decoded_bytes_-=summary->second.charged;segment_classes_.erase(summary);}
    }
    void RememberVerifiedSegmentDecode(const std::string& id,const std::string& raw,
        std::shared_ptr<const void> row,std::size_t row_bytes) {
        DecodeDigest digest(raw);RememberVerifiedSegmentDecodeWithDigest(id,digest,std::move(row),row_bytes);
    }
private:
    void RememberVerifiedSegmentDecodeWithDigest(const std::string& id,DecodeDigest& proof,
        std::shared_ptr<const void> row,std::size_t row_bytes) {
        const auto& raw=proof.Raw();
        // cache mutex보다 먼저 owner를 획득한다. Finish는 store mutex를 잡고
        // 이 cache를 비우므로 반대 잠금 순서는 금지한다.
        std::array<unsigned char,32> digest{};if(!proof.Get(&digest))return;
        const auto owner=MemoryOwner();
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
        if(probe_before_remember){auto hook=probe_before_remember;hook();}
#endif
        std::lock_guard lock(decoded_mu_);
        if(decoded_closed_)return;
        // LRU node와 별도로 할당한 ID도 같은 한도에 포함한다.
        const auto extra=sizeof(DecodedSegment)+256+4*(id.size()+1);
        if(row_bytes>decoded_limit_||extra>decoded_limit_-row_bytes)return;
        const auto charged=extra+row_bytes;
        if(const auto old=decoded_segments_.find(id);old!=decoded_segments_.end()){
            EraseDecoded(old);
        }
        while(decoded_bytes_>decoded_limit_-charged)EvictDecodedOne();
        // 선택적 memo는 기존 owner 한도를 공유하여 남은 여유를 줄일 수 있지만
        // 해당 한도나 cold row 판정 기준을 변경하지 않는다.
        const auto used=owner->used();if(used>owner->limit()||extra>owner->limit()-used)return;
        auto memory=owner->ReserveOwned(extra,SearchModelResidency::Category::RetainedRaw);if(!memory)return;
        try {
            decoded_recency_.push_back(id);
            try {
                // map 생성 성공 전까지 추가 ticket을 지역 변수로 유지한다.
                // emplace 예외는 이 catch에 도달하기 전에 인자를 소멸시킨다.
                DecodedSegment entry{{},digest,raw.size(),std::move(row),charged,std::prev(decoded_recency_.end())};
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
                if(probe_throw_after_recency)throw std::bad_alloc();
#endif
                const auto inserted=decoded_segments_.emplace(id,std::move(entry));
                inserted.first->second.memory=std::move(*memory);
            } catch (...) {decoded_recency_.pop_back();throw;}
            decoded_bytes_+=charged;
        } catch(const std::bad_alloc&) {} // the already verified caller row remains valid
    }
public:
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
    inline static thread_local std::function<void()> probe_before_remember;
    inline static thread_local bool probe_throw_after_recency=false;
    void ProbeDecodedLimit(std::size_t limit){ClearVerifiedSegmentDecodeCache();std::lock_guard lock(decoded_mu_);decoded_limit_=limit;}
    std::size_t ProbeDecodedBytes(){std::lock_guard lock(decoded_mu_);return decoded_bytes_;}
#endif
};
class RecordingRetainedReadError : public std::runtime_error {
public:using std::runtime_error::runtime_error;
};
// RAM fallback은 기존 non-generation backend에만 해당한다. 결속된 store는 cold 오류 뒤
// fallback하지 않는다. iterator는 ID 목록 대신 불변 row 하나를 소유한다.
template<class T,bool(*Parse)(const std::string&,T*,std::string*),std::string(*Serialize)(const T&)>
class RecordingRetainedRows {
    using Pair=std::pair<const std::string,T>;
    using Map=std::map<std::string,T>;
public:
    class const_iterator {
        friend class RecordingRetainedRows;
        const RecordingRetainedRows* owner_{nullptr};
        std::shared_ptr<const Pair> row_;
        typename Map::const_iterator ram_;
        const_iterator(const RecordingRetainedRows* owner,typename Map::const_iterator it):owner_(owner),ram_(it){}
        const_iterator(const RecordingRetainedRows* owner,std::shared_ptr<const Pair> row):owner_(owner),row_(std::move(row)){}
    public:
        using iterator_category=std::input_iterator_tag;
        using value_type=Pair;using difference_type=std::ptrdiff_t;using pointer=const Pair*;using reference=const Pair&;
        const Pair& operator*()const{return owner_->store_?*row_:*ram_;}
        const Pair* operator->()const{return &**this;}
        const_iterator& operator++(){if(owner_->store_)*this=owner_->Next(row_->first);else ++ram_;return *this;}
        bool operator==(const const_iterator& rhs)const {
            if(owner_!=rhs.owner_)return false;
            if(!owner_->store_)return ram_==rhs.ram_;
            return (!row_&&!rhs.row_)||(row_&&rhs.row_&&row_->first==rhs.row_->first);
        }
        bool operator!=(const const_iterator& rhs)const{return !(*this==rhs);}
    };
    using iterator=const_iterator;
    using value_type=Pair;
    void Bind(std::shared_ptr<RecordingRetainedRowStore> store,std::string kind,
              std::shared_ptr<RecordingRetainedRowStore> decoded_store={}) {
        if(!ram_.empty()||store_)throw std::logic_error("retained row binding must precede input");
        if(decoded_store&&(!store||kind!="segment-v2"||decoded_store->MemoryOwner()!=store->MemoryOwner()))
            throw std::logic_error("retained decode reuse requires same charged owner");
        store_=std::move(store);kind_=std::move(kind);decoded_store_=std::move(decoded_store);
    }
    bool cold()const{return bool(store_);}
    std::size_t resident_size()const{return ram_.size();}
    std::size_t size()const{return store_?store_->Count(kind_):ram_.size();}
    bool empty()const{return size()==0;}
    const_iterator begin()const{return store_?Next({}):const_iterator(this,ram_.begin());}
    const_iterator end()const{return store_?const_iterator(this,std::shared_ptr<const Pair>{}):const_iterator(this,ram_.end());}
    const_iterator find(const std::string& id)const {
        if(!store_)return const_iterator(this,ram_.find(id));
        RecordingColdRow value;std::string error;bool found=false;
        if(!store_->GetOwned(kind_,id,&value,&found,&error))throw RecordingRetainedReadError(error);
        return found?Decode(id,std::move(value)):end();
    }
    // 인증된 cursor 하나를 사용하며 반환 row는 각각 계속 과금한다.
    // NextOwned를 반복하는 경우와 달리 삭제된 metadata·chunk를 재조회하지 않는다.
    template<class F> bool ForEachEntry(F&& visitor)const {
        if(!store_){for(const auto& row:ram_)if(!visitor(row.first,row.second))return false;return true;}
        bool refused=false;std::string error;
        const bool ok=store_->VisitOwned(kind_,[&](const auto& id,RecordingColdRow& bytes,std::string*){
            const auto row=Decode(id,std::move(bytes));
            if(!visitor(row->first,row->second)){refused=true;return false;}return true;
        },&error);
        if(!ok&&!refused)throw RecordingRetainedReadError(error);
        return ok;
    }
    // 실제 structured-search event 소비자는 현재 raw row 전부와 namespace 전체 범위를
    // 인증한다. 다만 완전히 검증된 scalar 분류를 재사용할 수 있는 제외 대상은
    // 해당 DTO를 생성하지 않는다.
    template<class F> bool ForEachEventCandidate(const std::string& channel,F&& visitor,
                                                std::uint64_t* visited=nullptr,std::uint64_t* memo_excluded=nullptr)const {
        static_assert(std::is_same_v<T,RecordingSegmentV2>);
        if(!store_)return ForEachEntry([&](const auto& id,const auto& value){
            if(visited)++*visited;
            return value.channel_id!=channel||value.retention_class==RecordingRetentionClass::Continuous||visitor(id,value);
        });
        bool refused=false;std::string error;
        const auto& decoded=decoded_store_?decoded_store_:store_;
        const bool ok=store_->VisitOwned(kind_,[&](const auto& id,RecordingColdRow& bytes,std::string*){
            if(visited)++*visited;
            if(kind_=="segment-v2"){
                const auto selection=decoded->VerifiedSegmentSelection(id,bytes.bytes,channel);
                if(selection&&!*selection){if(memo_excluded)++*memo_excluded;return true;}
            }
            const auto row=Decode(id,std::move(bytes));const auto& value=row->second;
            if(value.channel_id!=channel||value.retention_class==RecordingRetentionClass::Continuous)return true;
            if(!visitor(row->first,value)){refused=true;return false;}return true;
        },&error);
        if(!ok&&!refused)throw RecordingRetainedReadError(error);
        return ok;
    }
    // cold 전용 view는 store·cache handle을 소유하며 live container iterator를
    // 소유하지 않는다. 호출자는 자신의 권위 잠금 안에서 과금된 raw row를 capture한다.
    RecordingRetainedRows ColdReadView() const {
        if(!store_)throw std::logic_error("cold read view requires retained rows");
        RecordingRetainedRows view;view.Bind(store_,kind_,decoded_store_);return view;
    }
    template<class F> bool VisitRawOwned(F&& visitor) const {
        if(!store_)throw std::logic_error("raw read requires retained rows");
        bool refused=false;std::string error;
        const bool ok=store_->VisitOwned(kind_,[&](const auto& id,RecordingColdRow& row,std::string*){
            if(!visitor(id,row)){refused=true;return false;}return true;
        },&error);
        if(!ok&&!refused)throw RecordingRetainedReadError(error);
        return ok;
    }
    // 선택적 할당 힌트일 뿐이며 선택 여부가 불명확하면 row를 제외해서는 안 된다.
    // ConsumeOwnedChannelEntry는 여전히 정상 인증·parsing을 수행한다.
    std::optional<bool> RawChannelSelection(const std::string& id,const std::string& raw,
        const std::vector<std::string>& channels)const {
        static_assert(std::is_same_v<T,RecordingSegmentV2>);
        const auto& decoded=decoded_store_?decoded_store_:store_;
        return decoded->VerifiedSegmentChannelSelection(id,raw,channels);
    }
    template<class F,class E,class R> bool ConsumeOwnedChannelEntry(const std::string& id,RecordingColdRow row,
        const std::vector<std::string>& channels,F&& visitor,E&& excluded,std::uint64_t* memo_excluded,R&& raw_consumer)const {
        static_assert(std::is_same_v<T,RecordingSegmentV2>);
        const auto& decoded=decoded_store_?decoded_store_:store_;
        const auto selection=decoded->VerifiedSegmentChannelSelection(id,row.bytes,channels);
        if(selection&&!*selection){if(memo_excluded)++*memo_excluded;return excluded(id);}
        if(const auto used=raw_consumer(id,row.bytes))return *used;
        const auto value=Decode(id,std::move(row));
        return std::find(channels.begin(),channels.end(),value->second.channel_id)!=channels.end()
            ?visitor(value->first,value->second):excluded(id);
    }
    // ForEachEntry와 동일한 인증 namespace 및 호출자가 보유한 cut을 사용한다.
    // 정확한 raw에 근거한 제외는 typed DTO 생성만 생략하며 호출자는 excluded(id)에서
    // 기존 lifecycle·retirement 검사를 계속 수행해야 한다.
    template<class F,class E> bool ForEachChannelEntry(const std::vector<std::string>& channels,F&& visitor,E&& excluded,
                                                     std::uint64_t* memo_excluded=nullptr)const {
        return ForEachChannelEntry(channels,std::forward<F>(visitor),std::forward<E>(excluded),memo_excluded,
            [](const std::string&,const std::string&)->std::optional<bool>{return {};});
    }
    // 비공개 소비자는 현재 raw namespace를 읽은 뒤에만 파생 row를 재사용할 수 있다.
    // nullopt는 기존 strict typed decode 경로를 요청한다.
    template<class F,class E,class R> bool ForEachChannelEntry(const std::vector<std::string>& channels,F&& visitor,E&& excluded,
                                                     std::uint64_t* memo_excluded,R&& raw_consumer)const {
        static_assert(std::is_same_v<T,RecordingSegmentV2>);
        const auto consume=[&](const auto& id,const auto& value){
            return std::find(channels.begin(),channels.end(),value.channel_id)!=channels.end()
                ?visitor(id,value):excluded(id);
        };
        if(!store_)return ForEachEntry(consume);
        bool refused=false;std::string error;
        const auto& decoded=decoded_store_?decoded_store_:store_;
        const bool ok=store_->VisitOwned(kind_,[&](const auto& id,RecordingColdRow& bytes,std::string*){
            if(kind_=="segment-v2"){
                const auto selection=decoded->VerifiedSegmentChannelSelection(id,bytes.bytes,channels);
                if(selection&&!*selection){
                    if(memo_excluded)++*memo_excluded;
                    if(!excluded(id)){refused=true;return false;}return true;
                }
            }
            if(const auto used=raw_consumer(id,bytes.bytes)){
                if(!*used)refused=true;
                return *used;
            }
            const auto row=Decode(id,std::move(bytes));
            if(!consume(row->first,row->second)){refused=true;return false;}return true;
        },&error);
        if(!ok&&!refused)throw RecordingRetainedReadError(error);
        return ok;
    }
    template<class F> bool ForEach(F&& visitor)const {
        return ForEachEntry([&](const auto&,const auto& value){return visitor(value);});
    }
    std::size_t count(const std::string& id)const{return find(id)!=end();}
    std::pair<const_iterator,bool> emplace(const std::string& id,T value) {
        const auto previous=find(id);if(previous!=end())return {previous,false};
        Set(id,std::move(value));return {find(id),true};
    }
    void Set(const std::string& id,T value) {
        if(!store_){ram_[id]=std::move(value);return;}
        std::string error;bool ok=false;
        if constexpr(std::is_same_v<T,EventRecordingLinkV1>)ok=store_->PutEventLink(id,value,&error);
        else ok=store_->Put(kind_,id,Serialize(value),&error);
        if(!ok)throw RecordingRetainedReadError(error);
        if constexpr(std::is_same_v<T,RecordingSegmentV2>)if(kind_=="segment-v2")store_->ForgetVerifiedSegmentDecode(id);
    }
    T at(const std::string& id)const {static_assert(!std::is_same_v<T,std::string>,"retain the text iterator while comparing or transferring its storage");const auto row=find(id);if(row==end())throw std::out_of_range("retained row absent");return row->second;}
    std::size_t erase(const std::string& id) {
        if(!store_)return ram_.erase(id);
        if(!count(id))return 0;
        std::string error;if(!store_->Put(kind_,id,{},&error))throw RecordingRetainedReadError(error);
        if constexpr(std::is_same_v<T,RecordingSegmentV2>)if(kind_=="segment-v2")store_->ForgetVerifiedSegmentDecode(id);
        return 1;
    }
    void clear(){ram_.clear();store_.reset();decoded_store_.reset();kind_.clear();}
    void swap(RecordingRetainedRows& other)noexcept{ram_.swap(other.ram_);store_.swap(other.store_);decoded_store_.swap(other.decoded_store_);kind_.swap(other.kind_);}
private:
    const_iterator Decode(const std::string& id,RecordingColdRow value)const {
        // 불변 cut이 인증된 바이트와 구성원 목록을 제공한다. live sibling은 기존
        // cache mutex·16MiB 예산 안에서 현재 raw의 SHA-256에 결속된 parsed memo만
        // 제공한다. 공유 row ticket의 수명은 cache 퇴출 이후에도 유지된다.
        const auto& decoded=decoded_store_?decoded_store_:store_;
        RecordingRetainedRowStore::DecodeDigest digest(value.bytes);
        if constexpr(std::is_same_v<T,RecordingSegmentV2>){
            if(kind_=="segment-v2"){
                if(latency::DecodeCostEnabled())++latency::segment_decode_cost[0];
                if(auto prior=decoded->VerifiedSegmentDecodeWithDigest(id,digest)){
                    if(latency::DecodeCostEnabled())++latency::segment_decode_cost[1];
                    return const_iterator(this,std::static_pointer_cast<const Pair>(std::move(prior)));
                }
            }
        }
        const auto bytes=RecordingColdDecodeWorkspaceBytes<T>(value.bytes);
        auto ticket=store_->MemoryOwner()->ReserveOwned(bytes,SearchModelResidency::Category::RetainedRaw);
        if(!ticket)throw RecordingResourceUnavailable();
        auto shaped=std::move(*ticket);auto* work=&shaped;
        T parsed;std::string error;
        const bool trace_decode=std::is_same_v<T,RecordingSegmentV2>&&latency::DecodeCostEnabled();
        const auto parse_begin=trace_decode?latency::Now():0;
        std::string canonical_bytes;
        const bool parsed_ok=[&] {
            if constexpr(std::is_same_v<T,RecordingSegmentV2>)
                return ParseRecordingSegmentV2Canonical(value.bytes,&parsed,&canonical_bytes,&error);
            else return Parse(value.bytes,&parsed,&error);
        }();
        if(trace_decode)latency::segment_decode_cost[2]+=latency::Now()-parse_begin;
        if(!parsed_ok)throw RecordingRetainedReadError("retained row canonical/domain mismatch: "+error);
        const auto canonical_begin=trace_decode?latency::Now():0;
        const bool canonical=[&] {
            if constexpr(std::is_same_v<T,RecordingSegmentV2>)return canonical_bytes==value.bytes;
            else return Serialize(parsed)==value.bytes;
        }();
        if(trace_decode)latency::segment_decode_cost[3]+=latency::Now()-canonical_begin;
        if(!canonical)throw RecordingRetainedReadError("retained row canonical/domain mismatch: "+error);
        if constexpr(std::is_same_v<T,EventRecordingLinkV1>){if(value.event_reason)parsed.completeness_reason.Bind(std::move(value.event_reason));}
        // pair 할당·key는 공유 row와 함께 유지한다. deep copy 가능한 DTO는 별도 과금을
        // 보유하여 at()과 하위 결과 사본에도 과금 소유권이 유지된다.
        std::size_t row_bytes=0;
        if constexpr(std::is_same_v<T,std::string>)row_bytes=parsed.capacity()+1+32;
        BindRecordingRowMemory(parsed,*work,value.bytes.size());
        struct OwnedPair { SearchModelResidency::Reservation memory;Pair row;
            OwnedPair(SearchModelResidency::Reservation charge,const std::string& key,T result)
                :memory(std::move(charge)),row(key,std::move(result)){} };
        const auto pair_bytes=sizeof(OwnedPair)+id.size()+1+(std::is_base_of_v<RecordingMemoryCharge,T>?0:row_bytes);
        auto owner=std::make_shared<OwnedPair>(work->Split(pair_bytes),id,std::move(parsed));
        const Pair* row=&owner->row;
        auto shared=std::shared_ptr<const Pair>(std::move(owner),row);
        if constexpr(std::is_same_v<T,RecordingSegmentV2>){
            if(kind_=="segment-v2"){
                decoded->RememberVerifiedSegmentClassWithDigest(id,digest,shared->second);
                decoded->RememberVerifiedSegmentDecodeWithDigest(id,digest,shared,pair_bytes+shared->second.memory.bytes());
            }
        }
        return const_iterator(this,std::move(shared));
    }
    const_iterator Next(const std::string& after)const {
        std::string id,error;RecordingColdRow value;bool found=false;
        if(!store_->NextOwned(kind_,after,&id,&value,&found,&error))throw RecordingRetainedReadError(error);
        return found?Decode(id,std::move(value)):end();
    }
    Map ram_;
    std::shared_ptr<RecordingRetainedRowStore> store_,decoded_store_;
    std::string kind_;
};
inline bool ParseRetainedText(const std::string& bytes,std::string* value,std::string* error) {
    ingress::StrictJsonObjectDocument object;
    if(!ingress::ParseStrictJsonObjectDocument("{\"value\":"+bytes+"}",&object,error))return false;
    const auto parsed=ingress::StrictJsonStringField(object,"value");if(!parsed)return false;*value=*parsed;return true;
}
inline std::string SerializeRetainedText(const std::string& text) {
    std::string result="\"";const char* hex="0123456789abcdef";
    for(unsigned char c:text){switch(c){case '"':result+="\\\"";break;case '\\':result+="\\\\";break;
        case '\n':result+="\\n";break;case '\r':result+="\\r";break;case '\t':result+="\\t";break;
        default:if(c<32){result+="\\u00";result+=hex[c>>4];result+=hex[c&15];}else result+=static_cast<char>(c);}}
    return result+'"';
}
using RecordingRetainedTextRows=RecordingRetainedRows<std::string,ParseRetainedText,SerializeRetainedText>;
inline bool ParseRetainedAcceptance(const std::string& bytes,bool* value,std::string*) {
    if(bytes!="true")return false;
    *value=true;return true;
}
inline std::string SerializeRetainedAcceptance(const bool& value){return value?"true":"false";}
class RecordingRetainedAcceptedSet {
    using Rows=RecordingRetainedRows<bool,ParseRetainedAcceptance,SerializeRetainedAcceptance>;
    Rows rows_;
public:
    class const_iterator {
        Rows::const_iterator it_;
    public:
        using iterator_category=std::input_iterator_tag;using value_type=std::string;
        using difference_type=std::ptrdiff_t;using pointer=const std::string*;using reference=const std::string&;
        explicit const_iterator(Rows::const_iterator it):it_(std::move(it)){}
        reference operator*()const{return it_->first;}pointer operator->()const{return &it_->first;}
        const_iterator& operator++(){++it_;return *this;}
        bool operator==(const const_iterator& rhs)const{return it_==rhs.it_;}
        bool operator!=(const const_iterator& rhs)const{return !(*this==rhs);}
    };
    void Bind(std::shared_ptr<RecordingRetainedRowStore> store){rows_.Bind(std::move(store),"derived-reference-accepted");}
    bool cold()const{return rows_.cold();}std::size_t resident_size()const{return rows_.resident_size();}
    std::size_t size()const{return rows_.size();}bool empty()const{return rows_.empty();}
    std::size_t count(const std::string& id)const{return rows_.count(id);}
    void insert(const std::string& id){rows_.Set(id,true);}
    void clear(){rows_.clear();}void swap(RecordingRetainedAcceptedSet& rhs)noexcept{rows_.swap(rhs.rows_);}
    const_iterator begin()const{return const_iterator(rows_.begin());}const_iterator end()const{return const_iterator(rows_.end());}
};
}
