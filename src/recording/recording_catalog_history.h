// 파일 용도: 검증된 Catalog 완료 행의 비영속·비상주 값 조회를 제공한다.
#pragma once
#include "recording_history_index.h"
#include "recording/recording_retained_rows.h"
#include "recording/recording_catalog_snapshot.h"
#include <charconv>
#include <mutex>
#include <exception>

namespace recording {
// 원본 권위가 아니다. 검증 중인 projection/현재 Catalog만 소유하고 Journal이 명시적으로 마감한다.
// 고정 슬롯은 한 key의 최대 표현을 재사용한다. 과거 이력 개수에 비례하는 RAM cache는 없다.
class RecordingCatalogHistoryRows : public RecordingRetainedRowStore {
public:
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
    inline static thread_local bool probe_throw_after_chunk=false;
#endif
    using Visitor=std::function<bool(const std::string&,const std::string&,std::string*)>;
    bool Create(std::string* error,std::uint64_t slot_limit=UINT64_MAX) {
        std::lock_guard<std::recursive_mutex> lock(mu_);
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
        slot_limit_=slot_limit;
        return index_.Create(std::filesystem::canonical(std::filesystem::temp_directory_path()).string(),
            RecordingHistoryIndex::BytesForRows(0),error);
#else
        (void)slot_limit;return Fail(error,"catalog history unsupported");
#endif
    }
    bool CloneFrom(RecordingCatalogHistoryRows& source,std::string* error) {
        std::scoped_lock lock(mu_,source.mu_);
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
        if(!source.healthy_||!index_.Create(std::filesystem::canonical(std::filesystem::temp_directory_path()).string(),
            RecordingHistoryIndex::BytesForRows(source.index_.usage().rows),error)||!index_.CopyFrom(source.index_,error))return false;
        counts_=source.counts_;retired_continuous_only_=source.retired_continuous_only_;slot_limit_=source.slot_limit_;return true;
#else
        (void)error;return false;
#endif
    }
    bool Get(const std::string& kind,const std::string& id,std::string* value,bool* found,std::string* error) override {
        std::lock_guard<std::recursive_mutex> lock(mu_);
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
        if(!healthy_||!value||!found)return Fail(error,"catalog history unavailable");
        // An external ID outside the original grammar cannot name a stored row.
        // This is input rejection, not a corruption of the authenticated index.
        if(Kind(kind)&&!ValidateOpaqueId(id,nullptr)){*found=false;value->clear();if(error)error->clear();return true;}
        std::uint64_t bytes=0,capacity=0;bool exists=false;
        if(!Meta(kind,id,&bytes,&capacity,&exists,error))return false;
        return ReadValue(kind,id,bytes,exists,value,found,error);
#else
        (void)kind;(void)id;(void)value;(void)found;return Fail(error,"catalog history unsupported");
#endif
    }
    bool Next(const std::string& kind,const std::string& after,std::string* id,std::string* value,bool* found,std::string* error) override {
        std::lock_guard<std::recursive_mutex> lock(mu_);
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
        if(!healthy_||!Kind(kind)||!id||!value||!found)return Fail(error,"catalog history cursor invalid");
        *found=false;const auto prefix=kind+"/";
        const auto lower=after.empty()?prefix:prefix+after+"/m"+std::string(1,'\0');
        bool stopped=false;
        const bool ok=index_.VisitRange(lower,kind+"0",[&](const std::string& key,const std::string&,std::string* detail){
            if(key.size()<prefix.size()+2||key.compare(key.size()-2,2,"/m")!=0)return true;
            const auto candidate=key.substr(prefix.size(),key.size()-prefix.size()-2);
            if(!Get(kind,candidate,value,found,detail))return false;
            if(!*found)return true;
            *id=candidate;stopped=true;return false;
        },error);
        if(!ok&&!stopped)return false;
        if(error)error->clear();
        return true;
#else
        (void)kind;(void)after;(void)id;(void)value;(void)found;return Fail(error,"catalog history unsupported");
#endif
    }
    bool Put(const std::string& kind,const std::string& id,const std::string& value,std::string* error) override {
        std::lock_guard<std::recursive_mutex> lock(mu_);
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
        try {
        if(!healthy_||!Kind(kind)||!ValidateOpaqueId(id,error)||value.size()>kRecordingCatalogSnapshotMaxBytes)
            return Fail(error,"catalog history row invalid");
        // A process-owned exclusion proof, not an ID cache: only rows admitted through Put
        // contribute. Deletion never restores the proof; uncertain input stays conservative.
        if(kind=="retired-v2"&&!value.empty()) {
            RecordingRetiredV2Receipt receipt;std::string detail;
            if(!ParseRecordingRetiredV2Receipt(value,&receipt,&detail)||receipt.segment_id!=id||
               receipt.retention_class!=RecordingRetentionClass::Continuous)retired_continuous_only_=false;
        }
        std::uint64_t old_bytes=0,capacity=0;bool exists=false;
        if(!Meta(kind,id,&old_bytes,&capacity,&exists,error))return false;
        const auto chunks=value.size()/RecordingHistoryIndex::kValueBytes+(value.size()%RecordingHistoryIndex::kValueBytes!=0);
        const auto added=(exists?0:1)+(chunks>capacity?chunks-capacity:0);
        if(added>UINT64_MAX-index_.usage().rows||index_.usage().rows+added>slot_limit_||!index_.ReserveRows(index_.usage().rows+added,error))return Fail(error,"catalog history capacity failed");
        for(std::size_t offset=0,part=0;offset<value.size();offset+=RecordingHistoryIndex::kValueBytes,++part) {
            if(!index_.Put(Key(kind,id,"v",part),value.substr(offset,RecordingHistoryIndex::kValueBytes),true,error))return Fail(error,"catalog history value write failed");
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
            if(probe_throw_after_chunk)throw std::bad_alloc();
#endif
        }
        capacity=std::max<std::uint64_t>(capacity,chunks);
        if(!index_.Put(Key(kind,id,"m",0),std::to_string(value.size())+"/"+std::to_string(capacity),true,error))return Fail(error,"catalog history metadata write failed");
        std::string observed;bool found=false;
        if(!Get(kind,id,&observed,&found,error)||found!=!value.empty()||observed!=value)return Fail(error,"catalog history write readback mismatch");
        auto& count=counts_[Kind(kind)-1];if(!old_bytes&&!value.empty())++count;else if(old_bytes&&value.empty())--count;
        return true;
        } catch (...) { healthy_=false; if(error&&error->empty()) { try { *error="catalog history mutation exception"; } catch (...) {} } return false; }
#else
        (void)kind;(void)id;(void)value;return Fail(error,"catalog history unsupported");
#endif
    }
    bool Visit(const std::string& kind,const Visitor& visitor,std::string* error) override {
        std::unique_lock<std::recursive_mutex> lock(mu_);
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
        if(!healthy_||!Kind(kind)||!visitor)return Fail(error,"catalog history visitor invalid");
        const auto prefix=kind+"/";std::uint64_t seen=0;std::exception_ptr consumer_exception;
        std::string current,value;std::uint64_t bytes=0,capacity=0,parts=0;bool have_meta=false;
        // The authenticated in-order cursor delivers metadata before its chunk keys.
        // Consume those same verified chunks instead of re-seeking every chunk from root.
        // Decimal chunk keys need not sort numerically: unique canonical keys plus exact
        // count/range/length prove coverage, and offsets restore the original byte order.
        const auto flush=[&](std::string* detail) {
            if(!have_meta)return true;
            const auto required=bytes/RecordingHistoryIndex::kValueBytes+(bytes%RecordingHistoryIndex::kValueBytes!=0);
            if(parts!=required)return Fail(detail,"catalog history streaming chunk coverage invalid");
            if(!bytes)return true;
            ++seen;lock.unlock();bool accepted=false;
            try { accepted=visitor(current,value,detail); } catch (...) { consumer_exception=std::current_exception(); }
            lock.lock();return healthy_&&accepted;
        };
        const bool ok=index_.VisitRange(prefix,kind+"0",[&](const std::string& key,const std::string& chunk,std::string* detail){
            const auto split=key.rfind('/');
            if(split==std::string::npos||split<prefix.size())return Fail(detail,"catalog history streaming key invalid");
            const auto id=key.substr(prefix.size(),split-prefix.size());const auto suffix=key.substr(split+1);
            if(!ValidateOpaqueId(id,nullptr))return Fail(detail,"catalog history streaming identity invalid");
            if(suffix=="m") {
                if(!flush(detail))return false;
                if(!ParseMeta(chunk,&bytes,&capacity,detail))return false;
                current=id;parts=0;have_meta=true;value.assign(static_cast<std::size_t>(bytes),'\0');return true;
            }
            if(!have_meta||current!=id||suffix.size()<2||suffix[0]!='v')return Fail(detail,"catalog history streaming metadata missing");
            std::uint64_t part=0;const auto parsed=std::from_chars(suffix.data()+1,suffix.data()+suffix.size(),part);
            if(parsed.ec!=std::errc{}||parsed.ptr!=suffix.data()+suffix.size()||suffix.substr(1)!=std::to_string(part)||part>=capacity)
                return Fail(detail,"catalog history streaming part invalid");
            const auto required=bytes/RecordingHistoryIndex::kValueBytes+(bytes%RecordingHistoryIndex::kValueBytes!=0);
            if(part>=required)return true; // reserved overwritten tail is not current row content
            const auto offset=part*RecordingHistoryIndex::kValueBytes,wanted=std::min<std::uint64_t>(RecordingHistoryIndex::kValueBytes,bytes-offset);
            if(chunk.size()!=wanted)return Fail(detail,"catalog history streaming chunk length invalid");
            value.replace(static_cast<std::size_t>(offset),chunk.size(),chunk);++parts;return true;
        },error);
        const bool completed=ok&&flush(error);
        if(consumer_exception)std::rethrow_exception(consumer_exception);
        if(!completed)return false; // consumer refusal is not evidence of index corruption
        return (healthy_&&seen==counts_[Kind(kind)-1])||Fail(error,"catalog history visitor/coverage failed");
#else
        (void)kind;(void)visitor;return Fail(error,"catalog history unsupported");
#endif
    }
    bool VisitRetired(const Visitor& visitor,bool event_candidates_only,std::string* error) {
        {std::lock_guard<std::recursive_mutex> lock(mu_);
         if(event_candidates_only&&retired_continuous_only_)return Healthy(error);}
        return Visit("retired-v2",visitor,error);
    }
    std::uint64_t Count(const std::string& kind)const override{std::lock_guard<std::recursive_mutex> lock(mu_);return Kind(kind)?counts_[Kind(kind)-1]:0;}
    std::uint64_t Bytes(bool allocated=false)const {
        std::lock_guard<std::recursive_mutex> lock(mu_);
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
        const auto value=index_.usage();return allocated?value.allocated_bytes:value.file_bytes;
#else
        (void)allocated;return 0;
#endif
    }
    bool Healthy(std::string* error){
        std::lock_guard<std::recursive_mutex> lock(mu_);
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
        return (healthy_&&index_.Healthy(error))||Fail(error,"catalog history unhealthy");
#else
        return Fail(error,"catalog history unsupported");
#endif
    }
    bool Finish(std::string* error){
        std::lock_guard<std::recursive_mutex> lock(mu_);
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
        healthy_=false;return index_.Close(error);
#else
        (void)error;return true;
#endif
    }
private:
    static unsigned Kind(const std::string& kind){return kind=="retired-v2"?1:kind=="source-binding"?2:kind=="derived-job"?3:kind=="job-output"?4:kind=="job-reference"?5:kind=="segment-v2"?6:kind=="state-v2"?7:kind=="tombstone-v2"?8:kind=="media-path"?9:kind=="deletion-reason"?10:kind=="observation-v1"?11:kind=="observation-v2"?12:kind=="consumer-reference"?13:kind=="referenced-observation"?14:kind=="event-link"?15:kind=="derived-reference-accepted"?16:kind=="segment-v1"?17:kind=="tombstone-v1"?18:0;}
    bool Fail(std::string* error,const char* message){healthy_=false;if(error&&error->empty())*error=message;return false;}
    mutable std::recursive_mutex mu_;
    bool healthy_{true},retired_continuous_only_{true};std::array<std::uint64_t,18> counts_{};
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    RecordingHistoryIndex index_;
    std::uint64_t slot_limit_{UINT64_MAX};
    static std::string Key(const std::string& kind,const std::string& id,const char* category,std::uint64_t part){
        return kind+"/"+id+"/"+category+(category[0]=='v'?std::to_string(part):std::string{});
    }
    bool Meta(const std::string& kind,const std::string& id,std::uint64_t* bytes,std::uint64_t* capacity,bool* exists,std::string* error){
        if(!Kind(kind)||!ValidateOpaqueId(id,error))return Fail(error,"catalog history key invalid");
        std::string text;const auto status=index_.Get(Key(kind,id,"m",0),&text,error);
        if(status==RecordingHistoryIndex::Lookup::Error)return Fail(error,"catalog history metadata lookup failed");
        *exists=status==RecordingHistoryIndex::Lookup::Found;if(!*exists)return true;
        return ParseMeta(text,bytes,capacity,error);
    }
    bool ReadValue(const std::string& kind,const std::string& id,std::uint64_t bytes,bool exists,
        std::string* value,bool* found,std::string* error) {
        *found=exists&&bytes!=0;value->clear();if(!*found)return true;
        std::string result;result.reserve(static_cast<std::size_t>(bytes));
        for(std::uint64_t part=0;result.size()<bytes;++part){
            std::string block;const auto wanted=std::min<std::uint64_t>(RecordingHistoryIndex::kValueBytes,bytes-result.size());
            if(index_.Get(Key(kind,id,"v",part),&block,error)!=RecordingHistoryIndex::Lookup::Found||block.size()!=wanted)
                return Fail(error,"catalog history chunk/coverage invalid");
            result+=block;
        }
        *value=std::move(result);return true;
    }
    bool ParseMeta(const std::string& text,std::uint64_t* bytes,std::uint64_t* capacity,std::string* error) {
        const auto slash=text.find('/');if(slash==std::string::npos)return Fail(error,"catalog history metadata invalid");
        const auto a=std::from_chars(text.data(),text.data()+slash,*bytes),b=std::from_chars(text.data()+slash+1,text.data()+text.size(),*capacity);
        if(a.ec!=std::errc{}||a.ptr!=text.data()+slash||b.ec!=std::errc{}||b.ptr!=text.data()+text.size()||
           *bytes>kRecordingCatalogSnapshotMaxBytes||*capacity>kRecordingCatalogSnapshotMaxBytes/RecordingHistoryIndex::kValueBytes+1||
           *capacity<*bytes/RecordingHistoryIndex::kValueBytes+(*bytes%RecordingHistoryIndex::kValueBytes!=0))return Fail(error,"catalog history metadata bounds invalid");
        return true;
    }
#endif
};
}
