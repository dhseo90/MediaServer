// 파일 용도: 검증된 Catalog 완료 행의 비영속·비상주 값 조회를 제공한다.
#pragma once
#include "recording_history_index.h"
#include "recording/recording_catalog_snapshot.h"
#include <charconv>
#include <mutex>
#include <exception>

namespace recording {
// 원본 권위가 아니다. 검증 중인 projection/현재 Catalog만 소유하고 Journal이 명시적으로 마감한다.
// 고정 슬롯은 한 key의 최대 표현을 재사용한다. 과거 이력 개수에 비례하는 RAM cache는 없다.
class RecordingCatalogHistoryRows {
public:
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
    inline static thread_local bool probe_throw_after_chunk=false;
#endif
    using Visitor=std::function<bool(const std::string&,const std::string&,std::string*)>;
    bool Create(std::string* error) {
        std::lock_guard<std::recursive_mutex> lock(mu_);
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
        return index_.Create(std::filesystem::canonical(std::filesystem::temp_directory_path()).string(),
            RecordingHistoryIndex::BytesForRows(0),error);
#else
        return Fail(error,"catalog history unsupported");
#endif
    }
    bool Get(const std::string& kind,const std::string& id,std::string* value,bool* found,std::string* error) {
        std::lock_guard<std::recursive_mutex> lock(mu_);
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
        if(!healthy_||!value||!found)return Fail(error,"catalog history unavailable");
        // An external ID outside the original grammar cannot name a stored row.
        // This is input rejection, not a corruption of the authenticated index.
        if(Kind(kind)&&!ValidateOpaqueId(id,nullptr)){*found=false;value->clear();if(error)error->clear();return true;}
        std::uint64_t bytes=0,capacity=0;bool exists=false;
        if(!Meta(kind,id,&bytes,&capacity,&exists,error))return false;
        *found=exists&&bytes!=0;value->clear();if(!*found)return true;
        std::string result;result.reserve(static_cast<std::size_t>(bytes));
        for(std::uint64_t part=0;result.size()<bytes;++part){
            std::string block;const auto wanted=std::min<std::uint64_t>(RecordingHistoryIndex::kValueBytes,bytes-result.size());
            if(index_.Get(Key(kind,id,"v",part),&block,error)!=RecordingHistoryIndex::Lookup::Found||block.size()!=wanted)
                return Fail(error,"catalog history chunk/coverage invalid");
            result+=block;
        }
        *value=std::move(result);return true;
#else
        (void)kind;(void)id;(void)value;(void)found;return Fail(error,"catalog history unsupported");
#endif
    }
    bool Put(const std::string& kind,const std::string& id,const std::string& value,std::string* error) {
        std::lock_guard<std::recursive_mutex> lock(mu_);
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
        try {
        if(!healthy_||!Kind(kind)||!ValidateOpaqueId(id,error)||value.size()>kRecordingCatalogSnapshotMaxBytes)
            return Fail(error,"catalog history row invalid");
        std::uint64_t old_bytes=0,capacity=0;bool exists=false;
        if(!Meta(kind,id,&old_bytes,&capacity,&exists,error))return false;
        const auto chunks=value.size()/RecordingHistoryIndex::kValueBytes+(value.size()%RecordingHistoryIndex::kValueBytes!=0);
        const auto added=(exists?0:1)+(chunks>capacity?chunks-capacity:0);
        if(added>UINT64_MAX-index_.usage().rows||!index_.ReserveRows(index_.usage().rows+added,error))return Fail(error,"catalog history capacity failed");
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
    bool Visit(const std::string& kind,const Visitor& visitor,std::string* error) {
        std::unique_lock<std::recursive_mutex> lock(mu_);
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
        if(!healthy_||!Kind(kind)||!visitor)return Fail(error,"catalog history visitor invalid");
        const auto prefix=kind+"/";std::uint64_t seen=0;std::exception_ptr consumer_exception;
        const bool ok=index_.Visit([&](const std::string& key,const std::string&,std::string* detail){
            if(key.rfind(prefix,0)!=0||key.size()<prefix.size()+2||key.compare(key.size()-2,2,"/m")!=0)return true;
            const auto id=key.substr(prefix.size(),key.size()-prefix.size()-2);std::string value;bool found=false;
            if(!Get(kind,id,&value,&found,detail))return false;
            if(!found)return true;
            ++seen;
            // Never hold history mutex across a Catalog callback that can acquire Journal authority.
            lock.unlock();bool accepted=false;
            try { accepted=visitor(id,value,detail); } catch (...) { consumer_exception=std::current_exception(); }
            lock.lock();return healthy_&&accepted;
        },error);
        if(consumer_exception)std::rethrow_exception(consumer_exception);
        if(!ok)return false; // consumer refusal is not evidence of index corruption
        return (healthy_&&seen==counts_[Kind(kind)-1])||Fail(error,"catalog history visitor/coverage failed");
#else
        (void)kind;(void)visitor;return Fail(error,"catalog history unsupported");
#endif
    }
    std::uint64_t Count(const std::string& kind)const{std::lock_guard<std::recursive_mutex> lock(mu_);return Kind(kind)?counts_[Kind(kind)-1]:0;}
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
    static unsigned Kind(const std::string& kind){return kind=="retired-v2"?1:kind=="source-binding"?2:kind=="derived-job"?3:0;}
    bool Fail(std::string* error,const char* message){healthy_=false;if(error&&error->empty())*error=message;return false;}
    mutable std::recursive_mutex mu_;
    bool healthy_{true};std::array<std::uint64_t,3> counts_{};
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    RecordingHistoryIndex index_;
    static std::string Key(const std::string& kind,const std::string& id,const char* category,std::uint64_t part){
        return kind+"/"+id+"/"+category+(category[0]=='v'?std::to_string(part):std::string{});
    }
    bool Meta(const std::string& kind,const std::string& id,std::uint64_t* bytes,std::uint64_t* capacity,bool* exists,std::string* error){
        if(!Kind(kind)||!ValidateOpaqueId(id,error))return Fail(error,"catalog history key invalid");
        std::string text;const auto status=index_.Get(Key(kind,id,"m",0),&text,error);
        if(status==RecordingHistoryIndex::Lookup::Error)return Fail(error,"catalog history metadata lookup failed");
        *exists=status==RecordingHistoryIndex::Lookup::Found;if(!*exists)return true;
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
