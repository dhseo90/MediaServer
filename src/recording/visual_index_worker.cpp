// 파일 용도: 준비 실패에서 이전 완성 색인을 보존하고 한 개 작업만 재개하는 worker.
#include "recording/visual_index_worker.h"
#include <algorithm>
#include <stdexcept>
#include <unordered_map>
#include <set>
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/rand.h>
#endif
namespace recording {
namespace {
std::int64_t NowMs(){return std::chrono::duration_cast<std::chrono::milliseconds>(
    std::chrono::system_clock::now().time_since_epoch()).count();}
std::string InstanceId(){
#if MEDIA_SERVER_USE_OPENSSL
    unsigned char bytes[16];if(RAND_bytes(bytes,sizeof(bytes))!=1)throw std::runtime_error("visual-worker-identity");
    constexpr char hex[]="0123456789abcdef";std::string id;
    for(auto c:bytes){id+=hex[c>>4];id+=hex[c&15];}return id;
#else
    throw std::runtime_error("visual-worker-identity-unavailable");
#endif
}
bool Same(const VisualSearchDocument& a,const VisualSearchDocument& b) {
    return a.id==b.id&&a.channel_id==b.channel_id&&a.segment_id==b.segment_id&&a.event_id==b.event_id&&
        a.media_sha256==b.media_sha256&&a.frame_sha256==b.frame_sha256&&a.media_pts==b.media_pts&&
        a.time_base_num==b.time_base_num&&a.time_base_den==b.time_base_den&&a.utc_ns==b.utc_ns;
}
bool Fail(std::string* error,const char* code){if(error)*error=code;return false;}
}
VisualIndexWorker::VisualIndexWorker(VisualIndexStore store,Source source,Encode encode,
    std::chrono::milliseconds interval,VisualIndexLimits limits)
    :VisualIndexWorker(std::move(store),std::move(source),EncodeFactory([encode]{return encode;}),interval,limits) {
    if(!encode)throw std::invalid_argument("visual-worker-invalid-config");
}
VisualIndexWorker::VisualIndexWorker(VisualIndexStore store,Source source,EncodeFactory encode_factory,
    std::chrono::milliseconds interval,VisualIndexLimits limits)
    :VisualIndexWorker(std::move(store),SourceWithCoverage([source](auto* docs,auto*,const auto& cancelled,auto* error){
        return source&&source(docs,cancelled,error);
    }),std::move(encode_factory),interval,limits) {
    if(!source)throw std::invalid_argument("visual-worker-invalid-config");
}
VisualIndexWorker::VisualIndexWorker(VisualIndexStore store,SourceWithCoverage source,EncodeFactory encode_factory,
    std::chrono::milliseconds interval,VisualIndexLimits limits)
    :store_(std::move(store)),source_(std::move(source)),encode_factory_(std::move(encode_factory)),interval_(interval),limits_(limits),instance_id_(InstanceId()) {
    if(!source_||!encode_factory_||interval_.count()<=0||!limits_.max_documents||limits_.max_documents>20000||
        !limits_.max_bytes||limits_.max_bytes>96ULL*1024*1024)throw std::invalid_argument("visual-worker-invalid-config");
}
VisualIndexWorker::~VisualIndexWorker(){Stop();}
bool VisualIndexWorker::Start(){
    std::lock_guard lock(mutex_);if(worker_.joinable())return false;
    stopping_=false;requested_=true;status_.state="starting";status_.error.clear();
    worker_=std::thread(&VisualIndexWorker::Run,this);return true;
}
void VisualIndexWorker::Stop(){
    {std::lock_guard lock(mutex_);stopping_=true;changed_.notify_all();}
    if(worker_.joinable())worker_.join();
    std::lock_guard lock(mutex_);status_.state="stopped";
    if(status_.attempt_state=="running"){status_.attempt_state="cancelled";status_.attempt_finished_ms=NowMs();}
}
void VisualIndexWorker::RequestRebuild(){std::lock_guard lock(mutex_);requested_=true;changed_.notify_all();}
std::shared_ptr<const VisualSearchIndex> VisualIndexWorker::Snapshot()const{std::lock_guard lock(mutex_);return current_;}
VisualIndexWorkerStatus VisualIndexWorker::Status()const{std::lock_guard lock(mutex_);return status_;}
VisualIndexReadView VisualIndexWorker::ReadView()const{
    std::lock_guard lock(mutex_);return {current_,publication_,status_};
}
bool VisualIndexWorker::Rebuild(const Cancelled& cancelled,std::string* error){
    std::shared_ptr<const VisualSearchIndex> base;
    {std::unique_lock lock(mutex_);
        // 오래된 질의가 이전 세대를 보유하면 세 번째 색인 할당을 시작하지 않는다.
        while(!retired_.expired()&&!stopping_)changed_.wait_for(lock,std::chrono::milliseconds(25));
        if(stopping_)return Fail(error,"visual-cancelled");base=current_;status_.state="indexing";
        status_.attempt_state="running";status_.attempt_started_ms=NowMs();status_.attempt_finished_ms.reset();status_.error.clear();}
    std::vector<VisualSearchDocument> docs;
    std::optional<std::map<std::string,VisualSourceCoverage>> coverage;
    if(!source_(&docs,&coverage,cancelled,error))return false;
    if(coverage&&coverage->size()>32)return Fail(error,"visual-index-capacity");
    if(coverage)for(const auto& entry:*coverage)if(entry.first.empty()||entry.first.size()>1024)return Fail(error,"visual-index-capacity");
    if(cancelled())return Fail(error,"visual-cancelled");
    if(docs.size()>limits_.max_documents)return Fail(error,"visual-index-capacity");
    // metadata admission을 실제 embedding 추론 전에 검사한다. 임시 768-vector는 행별로 채운다.
    std::size_t bytes=sizeof(VisualSearchIndex)+docs.capacity()*sizeof(VisualSearchDocument)+4096;
    // 게시 metadata도 기존 admission 예산에 포함한다. cache 형식과 문서 한도는 유지한다.
    if(coverage)for(const auto& entry:*coverage)bytes+=sizeof(entry)+entry.first.capacity()+128;
    if(bytes>limits_.max_bytes)return Fail(error,"visual-index-capacity");
    for(const auto& row:docs){
        std::size_t cost=768*sizeof(float)+256;
        for(const auto* s:{&row.id,&row.channel_id,&row.segment_id,&row.event_id,&row.media_sha256,&row.frame_sha256}){
            if(s->size()>1024||s->capacity()>limits_.max_bytes/4)return Fail(error,"visual-index-capacity");cost+=4*(s->capacity()+1);}
        if(cost>limits_.max_bytes-bytes)return Fail(error,"visual-index-capacity");bytes+=cost;
    }
    std::unordered_map<std::string,const VisualSearchDocument*> prior;
    if(base)for(const auto& row:base->documents())prior.emplace(row.id,&row);
    auto encode=encode_factory_();if(!encode)return Fail(error,"visual-index-build-failed");
    std::set<std::pair<std::string,std::string>> unsupported_segments,unsupported_snapshots;
    for(auto& row:docs){
        if(row.event_id.empty()&&unsupported_segments.count({row.channel_id,row.segment_id}))continue;
        if(cancelled())return Fail(error,"visual-cancelled");
        const auto found=prior.find(row.id);
        if(found!=prior.end()&&Same(row,*found->second))row.embedding=found->second->embedding;
        else if(!encode(&row,cancelled,error)){
            if(cancelled())return Fail(error,"visual-cancelled");
            if(!error||*error!="visual-frame-unsupported")return false;
            if(row.event_id.empty())unsupported_segments.emplace(row.channel_id,row.segment_id);
            else unsupported_snapshots.emplace(row.channel_id,row.id);
            error->clear();
        }
    }
    docs.erase(std::remove_if(docs.begin(),docs.end(),[&](const auto& row){
        return row.event_id.empty()?unsupported_segments.count({row.channel_id,row.segment_id})!=0:
            unsupported_snapshots.count({row.channel_id,row.id})!=0;
    }),docs.end());
    std::shared_ptr<const VisualSearchIndex> complete;
    if(!VisualSearchIndex::Build(VisualEmbeddingContract::Siglip2(),std::move(docs),&complete,error,limits_))return false;
    if(cancelled())return Fail(error,"visual-cancelled");
    if(!store_.Save(*complete,error))return false;
    // Stop 뒤 cache는 완성본일 수 있지만 종료 중 새 메모리 게시를 하지 않는다.
    if(cancelled())return Fail(error,"visual-cancelled");
    auto publication=std::make_shared<VisualIndexPublication>();publication->instance_id=instance_id_;publication->origin="rebuild";
    publication->coverage=std::move(coverage);
    if(publication->coverage){
        for(const auto& entry:unsupported_segments)++publication->coverage->at(entry.first).unsupported_segments;
        for(const auto& entry:unsupported_snapshots)++publication->coverage->at(entry.first).unsupported_snapshots;
    }
    {std::lock_guard lock(mutex_);retired_=current_;current_=std::move(complete);++status_.generation;
        publication->generation=status_.generation;publication->published_at_ms=NowMs();publication_=std::move(publication);
        status_.last_success_ms=publication_->published_at_ms;status_.attempt_finished_ms=status_.last_success_ms;status_.attempt_state="succeeded";
        status_.documents=current_->documents().size();status_.state="ready";status_.error.clear();
        status_.unsupported_segments.clear();status_.unsupported_snapshots.clear();
        for(const auto& entry:unsupported_segments)++status_.unsupported_segments[entry.first];
        for(const auto& entry:unsupported_snapshots)++status_.unsupported_snapshots[entry.first];}
    return true;
}
void VisualIndexWorker::Run(){
    const Cancelled cancelled=[this]{return stopping_.load();};
    std::shared_ptr<const VisualSearchIndex> loaded;std::string error;
    if(store_.Load(VisualEmbeddingContract::Siglip2(),&loaded,&error,limits_)){
        std::lock_guard lock(mutex_);if(!current_){current_=std::move(loaded);status_.documents=current_->documents().size();
            auto publication=std::make_shared<VisualIndexPublication>();publication->instance_id=instance_id_;publication->origin="cache";
            publication_=std::move(publication);}}
    loaded.reset();
    while(!cancelled()){
        {std::unique_lock lock(mutex_);changed_.wait_for(lock,interval_,[this]{return stopping_||requested_;});
            if(stopping_)break;requested_=false;}
        bool ok=false;
        try{ok=Rebuild(cancelled,&error);}catch(const std::exception&){error="visual-index-build-failed";}
        if(!ok&&!cancelled()){std::lock_guard lock(mutex_);
            // 갱신 오류와 완성 색인의 사용 가능 여부를 분리한다. 각 조회는 현재 원본을 다시 확인한다.
            status_.state=current_?"degraded":"unavailable";
            status_.attempt_state="failed";status_.attempt_finished_ms=NowMs();
            // callback이 경로나 입력 내용을 반환해도 제품 상태로 내보내지 않는다.
            status_.error=error=="visual-index-capacity"?error:"visual-index-build-failed";}
    }
}
} // namespace recording
