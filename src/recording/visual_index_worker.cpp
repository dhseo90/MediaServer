// 파일 용도: 준비 실패에서 이전 완성 색인을 보존하고 한 개 작업만 재개하는 worker.
#include "recording/visual_index_worker.h"
#include <algorithm>
#include <stdexcept>
#include <unordered_map>
namespace recording {
namespace {
bool Same(const VisualSearchDocument& a,const VisualSearchDocument& b) {
    return a.id==b.id&&a.channel_id==b.channel_id&&a.segment_id==b.segment_id&&a.event_id==b.event_id&&
        a.media_sha256==b.media_sha256&&a.frame_sha256==b.frame_sha256&&a.media_pts==b.media_pts&&
        a.time_base_num==b.time_base_num&&a.time_base_den==b.time_base_den&&a.utc_ns==b.utc_ns;
}
bool Fail(std::string* error,const char* code){if(error)*error=code;return false;}
}
VisualIndexWorker::VisualIndexWorker(VisualIndexStore store,Source source,Encode encode,
    std::chrono::milliseconds interval,VisualIndexLimits limits)
    :store_(std::move(store)),source_(std::move(source)),encode_(std::move(encode)),interval_(interval),limits_(limits) {
    if(!source_||!encode_||interval_.count()<=0||!limits_.max_documents||limits_.max_documents>20000||
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
}
void VisualIndexWorker::RequestRebuild(){std::lock_guard lock(mutex_);requested_=true;changed_.notify_all();}
std::shared_ptr<const VisualSearchIndex> VisualIndexWorker::Snapshot()const{std::lock_guard lock(mutex_);return current_;}
VisualIndexWorkerStatus VisualIndexWorker::Status()const{std::lock_guard lock(mutex_);return status_;}
bool VisualIndexWorker::Rebuild(const Cancelled& cancelled,std::string* error){
    std::shared_ptr<const VisualSearchIndex> base;
    {std::unique_lock lock(mutex_);
        // 오래된 질의가 이전 세대를 보유하면 세 번째 색인 할당을 시작하지 않는다.
        while(!retired_.expired()&&!stopping_)changed_.wait_for(lock,std::chrono::milliseconds(25));
        if(stopping_)return Fail(error,"visual-cancelled");base=current_;status_.state="indexing";}
    std::vector<VisualSearchDocument> docs;
    if(!source_(&docs,cancelled,error))return false;
    if(cancelled())return Fail(error,"visual-cancelled");
    if(docs.size()>limits_.max_documents)return Fail(error,"visual-index-capacity");
    // metadata admission을 실제 embedding 추론 전에 검사한다. 임시 768-vector는 행별로 채운다.
    std::size_t bytes=sizeof(VisualSearchIndex)+docs.capacity()*sizeof(VisualSearchDocument)+4096;
    if(bytes>limits_.max_bytes)return Fail(error,"visual-index-capacity");
    for(const auto& row:docs){
        std::size_t cost=768*sizeof(float)+256;
        for(const auto* s:{&row.id,&row.channel_id,&row.segment_id,&row.event_id,&row.media_sha256,&row.frame_sha256}){
            if(s->size()>1024||s->capacity()>limits_.max_bytes/4)return Fail(error,"visual-index-capacity");cost+=4*(s->capacity()+1);}
        if(cost>limits_.max_bytes-bytes)return Fail(error,"visual-index-capacity");bytes+=cost;
    }
    std::unordered_map<std::string,const VisualSearchDocument*> prior;
    if(base)for(const auto& row:base->documents())prior.emplace(row.id,&row);
    for(auto& row:docs){
        if(cancelled())return Fail(error,"visual-cancelled");
        const auto found=prior.find(row.id);
        if(found!=prior.end()&&Same(row,*found->second))row.embedding=found->second->embedding;
        else if(!encode_(&row,cancelled,error))return false;
    }
    std::shared_ptr<const VisualSearchIndex> complete;
    if(!VisualSearchIndex::Build(VisualEmbeddingContract::Siglip2(),std::move(docs),&complete,error,limits_))return false;
    if(cancelled())return Fail(error,"visual-cancelled");
    if(!store_.Save(*complete,error))return false;
    // Stop 뒤 cache는 완성본일 수 있지만 종료 중 새 메모리 게시를 하지 않는다.
    if(cancelled())return Fail(error,"visual-cancelled");
    {std::lock_guard lock(mutex_);retired_=current_;current_=std::move(complete);++status_.generation;
        status_.documents=current_->documents().size();status_.state="ready";status_.error.clear();}
    return true;
}
void VisualIndexWorker::Run(){
    const Cancelled cancelled=[this]{return stopping_.load();};
    std::shared_ptr<const VisualSearchIndex> loaded;std::string error;
    if(store_.Load(VisualEmbeddingContract::Siglip2(),&loaded,&error,limits_)){
        std::lock_guard lock(mutex_);if(!current_){current_=std::move(loaded);status_.documents=current_->documents().size();}}
    loaded.reset();
    while(!cancelled()){
        {std::unique_lock lock(mutex_);changed_.wait_for(lock,interval_,[this]{return stopping_||requested_;});
            if(stopping_)break;requested_=false;}
        bool ok=false;
        try{ok=Rebuild(cancelled,&error);}catch(const std::exception&){error="visual-index-build-failed";}
        if(!ok&&!cancelled()){std::lock_guard lock(mutex_);status_.state="unavailable";
            // callback이 경로나 입력 내용을 반환해도 제품 상태로 내보내지 않는다.
            status_.error=error=="visual-index-capacity"?error:"visual-index-build-failed";}
    }
}
} // namespace recording
