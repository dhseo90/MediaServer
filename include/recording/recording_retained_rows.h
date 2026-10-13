// 파일 용도: 검증된 비영속 Catalog 행을 한 값씩 읽는 내부 보존 자료 소유 경계.
#pragma once
#include <map>
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
// Raw/parser/canonical workspace is held until Decode finishes. The typed result
// takes its own portion before publication; its copies acquire another ticket.
struct RecordingColdRow {
    SearchModelResidency::Reservation memory;
    std::string bytes;
    std::shared_ptr<const RecordingTextSource> event_reason{};
};
inline std::size_t RecordingColdWorkspaceBytes(std::size_t bytes,const std::string& ={}) {
    // Authenticated raw read and fixed index/shape work. Parser/DTO admission is
    // separate and happens after the allocation-free census, before parsing.
    constexpr std::size_t fixed=64*1024;
    if(bytes>std::numeric_limits<std::size_t>::max()-fixed-1)throw RecordingResourceUnavailable();
    return fixed+bytes+1;
}
template<class T> std::size_t RecordingColdDecodeWorkspaceBytes(const std::string& json) {
    if constexpr(std::is_same_v<T,EventRecordingLinkV1>)return RecordingEventLinkWorkspaceBytes(json);
    std::size_t element=0,raw_copies=0;
    // Maximum simultaneous owning JSON documents/subobject strings in the actual
    // parser call graph. SplitArray slots and typed slots are counted separately.
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
    // Three canonical owners: stream growth buffer, old growth buffer and return.
    return sizeof(T)+ingress::StrictJsonWorkspaceBytes(json,raw_copies+3,element,false);
}
class RecordingRetainedRowStore {
    // Only parsed segment-v2 values are memoized. Every lookup still reads and
    // authenticates the current raw row; this is never membership/cut authority.
    struct DecodedSegment {
        SearchModelResidency::Reservation memory;
        std::string bytes;
        std::shared_ptr<const void> row;
        std::size_t charged=0;
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
    void EvictDecodedOne() {
        if(!decoded_segments_.empty()){const auto old=decoded_segments_.begin();decoded_bytes_-=old->second.charged;decoded_segments_.erase(old);}
        else if(!segment_classes_.empty()){const auto old=segment_classes_.begin();decoded_bytes_-=old->second.charged;segment_classes_.erase(old);}
    }
    mutable std::mutex decoded_mu_;
    std::map<std::string,DecodedSegment> decoded_segments_;
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
        std::lock_guard lock(decoded_mu_);decoded_segments_.clear();segment_classes_.clear();decoded_bytes_=0;
    }
    void CloseVerifiedSegmentDecodeCache() {
        std::lock_guard lock(decoded_mu_);decoded_closed_=true;decoded_limit_=0;
        decoded_segments_.clear();segment_classes_.clear();decoded_bytes_=0;
    }
    std::shared_ptr<const void> VerifiedSegmentDecode(const std::string& id,const std::string& raw) {
        std::lock_guard lock(decoded_mu_);const auto it=decoded_segments_.find(id);
        if(it==decoded_segments_.end())return {};
        if(it->second.bytes==raw)return it->second.row;
        decoded_bytes_-=it->second.charged;decoded_segments_.erase(it);return {};
    }
    // Exclusion-only classification of the same authenticated raw. This cannot
    // prove membership, absence, current lifecycle or the selected event payload.
    std::optional<bool> VerifiedSegmentSelection(const std::string& id,const std::string& raw,const std::string& channel) {
        std::array<unsigned char,32> digest{};if(!RawDigest(raw,&digest))return {};
        std::lock_guard lock(decoded_mu_);const auto it=segment_classes_.find(id);
        if(it==segment_classes_.end())return {};
        if(it->second.raw_bytes!=raw.size()||it->second.digest!=digest){
            decoded_bytes_-=it->second.charged;segment_classes_.erase(it);return {};
        }
        return it->second.channel==channel&&it->second.retention!=RecordingRetentionClass::Continuous;
    }
    void RememberVerifiedSegmentClass(const std::string& id,const std::string& raw,const RecordingSegmentV2& segment) {
        std::array<unsigned char,32> digest{};if(!RawDigest(raw,&digest))return;
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
        auto ticket=owner->ReserveOwned(charge);if(!ticket)return;
        try {segment_classes_.emplace(id,SegmentClass{std::move(*ticket),digest,segment.channel_id,segment.retention_class,raw.size(),charge});decoded_bytes_+=charge;}
        catch(const std::bad_alloc&) {} // optional scalar memo never replaces strict reading
    }
    void ForgetVerifiedSegmentDecode(const std::string& id) {
        std::lock_guard lock(decoded_mu_);const auto it=decoded_segments_.find(id);
        if(it!=decoded_segments_.end()){decoded_bytes_-=it->second.charged;decoded_segments_.erase(it);}
        const auto summary=segment_classes_.find(id);if(summary!=segment_classes_.end()){decoded_bytes_-=summary->second.charged;segment_classes_.erase(summary);}
    }
    void RememberVerifiedSegmentDecode(const std::string& id,std::string raw,
        std::shared_ptr<const void> row,std::size_t row_bytes) {
        // Obtain the owner before the cache mutex: Finish holds the store mutex
        // while clearing this cache, so the opposite lock order is forbidden.
        const auto owner=MemoryOwner();
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
        if(probe_before_remember){auto hook=probe_before_remember;hook();}
#endif
        std::lock_guard lock(decoded_mu_);
        if(decoded_closed_)return;
        const auto extra=sizeof(DecodedSegment)+128+2*(id.size()+1)+raw.capacity()+1;
        if(row_bytes>decoded_limit_||extra>decoded_limit_-row_bytes)return;
        const auto charged=extra+row_bytes;
        if(const auto old=decoded_segments_.find(id);old!=decoded_segments_.end()){
            decoded_bytes_-=old->second.charged;decoded_segments_.erase(old);
        }
        while(decoded_bytes_>decoded_limit_-charged)EvictDecodedOne();
        // Optional memoization shares the existing owner cap; it may reduce the
        // remaining headroom, but never changes that cap or the cold row oracle.
        const auto used=owner->used();if(used>owner->limit()||extra>owner->limit()-used)return;
        auto memory=owner->ReserveOwned(extra);if(!memory)return;
        try {
            decoded_segments_.emplace(id,DecodedSegment{std::move(*memory),std::move(raw),std::move(row),charged});
            decoded_bytes_+=charged;
        } catch(const std::bad_alloc&) {} // the already verified caller row remains valid
    }
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
    inline static thread_local std::function<void()> probe_before_remember;
    void ProbeDecodedLimit(std::size_t limit){ClearVerifiedSegmentDecodeCache();std::lock_guard lock(decoded_mu_);decoded_limit_=limit;}
    std::size_t ProbeDecodedBytes(){std::lock_guard lock(decoded_mu_);return decoded_bytes_;}
#endif
};
class RecordingRetainedReadError : public std::runtime_error {
public:using std::runtime_error::runtime_error;
};
// RAM fallback is only the pre-existing non-generation backend. A bound store never
// falls back after a cold error. Iterators own one immutable row, not an ID list.
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
    // A single authenticated cursor; returned rows stay individually charged.
    // Unlike repeated NextOwned, deleted metadata/chunks are not re-looked-up.
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
    // Actual structured-search event consumer: authenticate every current raw
    // row and complete namespace coverage, but avoid constructing an excluded
    // DTO when its fully validated scalar classification can be reused.
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
        // The immutable cut supplies authenticated bytes and membership. A live
        // sibling supplies only exact-byte parsed memoization, under its existing
        // cache mutex/16MiB budget. Shared row tickets outlive cache eviction.
        const auto& decoded=decoded_store_?decoded_store_:store_;
        if constexpr(std::is_same_v<T,RecordingSegmentV2>){
            if(kind_=="segment-v2"){
                if(latency::HolderEnabled())++latency::segment_decode_cost[0];
                if(auto prior=decoded->VerifiedSegmentDecode(id,value.bytes)){
                    if(latency::HolderEnabled())++latency::segment_decode_cost[1];
                    return const_iterator(this,std::static_pointer_cast<const Pair>(std::move(prior)));
                }
            }
        }
        const auto bytes=RecordingColdDecodeWorkspaceBytes<T>(value.bytes);
        auto ticket=store_->MemoryOwner()->ReserveOwned(bytes);
        if(!ticket)throw RecordingResourceUnavailable();
        auto shaped=std::move(*ticket);auto* work=&shaped;
        T parsed;std::string error;
        const bool trace_decode=std::is_same_v<T,RecordingSegmentV2>&&latency::HolderEnabled();
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
        // The pair allocation/key is retained with the shared row. Deep-copyable DTOs
        // carry a separate charge so at() and downstream result copies retain it.
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
                decoded->RememberVerifiedSegmentClass(id,value.bytes,shared->second);
                decoded->RememberVerifiedSegmentDecode(id,std::move(value.bytes),shared,pair_bytes+shared->second.memory.bytes());
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
