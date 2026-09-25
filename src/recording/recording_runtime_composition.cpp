// 파일 용도: 녹화 런타임의 관리 원장·카탈로그·작성기 옵션과 시작 복구 구성을 연결한다.
#include "recording/recording_runtime_composition.h"
#include "recording/recording_derived_job_service.h"
#include "recording/recording_cutover_candidate.h"
#include <limits>
namespace recording {
namespace {
// 형식/행의 수용값이다. 캐시 크기나 제품 RSS/전체 수명 상한으로 사용하지 않는다.
constexpr std::uint64_t kComponentBytes=1024ULL*1024*1024;
constexpr std::uint64_t kPhysicalRowBytes=16ULL*1024*1024+1;
constexpr auto kCountRange=std::numeric_limits<std::size_t>::max();
RecordingJournal::GenerationReadLimits RuntimeLimits(){
    return {kComponentBytes,kComponentBytes,kComponentBytes,kPhysicalRowBytes,kCountRange,kCountRange};
}
RecordingCatalog::Options RuntimeCatalogOptions(const std::filesystem::path& root){
    RecordingCatalog::Options options{root/"recording-catalog.sqlite3",root,true};
    options.enable_v2_storage=true;
#if MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND && MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    options.enable_generation_writes=true;
#endif
    return options;
}
}
RecordingRuntimeStorage::RecordingRuntimeStorage(std::filesystem::path root)
    :root_(std::move(root)) {
    ResetOwner();
}
void RecordingRuntimeStorage::ResetOwner(){
    // Catalog destructor가 Journal attachment를 해제한 다음에만 Journal lease를 닫는다.
    catalog_.reset();journal_.reset();
    journal_=std::make_unique<RecordingJournal>(RecordingJournal::ManagedOptions{root_,{},RuntimeLimits()});
    catalog_=std::make_unique<RecordingCatalog>(*journal_,RuntimeCatalogOptions(root_));
}
bool RecordingRuntimeStorage::Open(std::string* error){
    // 시작 구성 전용이다. 실패한/복구한 owner를 외부 생산자에 재사용하지 않는다.
    if(open_attempted_){
        if(opened_)return journal_->Open(error)&&catalog_->Open(error);
        if(error)*error="recording runtime Open failed: fresh storage owner required";
        return false;
    }
    open_attempted_=true;
#if MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND && MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    RecordingCutoverCandidateLimits limits;
    limits.chain={kComponentBytes,kCountRange,kCountRange};
    limits.snapshot_bytes=kComponentBytes;limits.cold_row_bytes=kPhysicalRowBytes;
    bool pending=false;
    if(!journal_->ProbeManagedRuntime(&pending,error))return false;
    if(pending){
        if(!catalog_->RecoverManagedCutover(limits,kComponentBytes,error))return false;
        ResetOwner();
    }
    if(!journal_->Open(error))return false;
    if(!journal_->generation_state_){
        if(!catalog_->PublishManagedCutover(limits,error))return false;
        ResetOwner();
        if(!journal_->Open(error))return false;
    }
    // managed Open이 검증한 같은 root의 정규 표현을 내부 소비자에도 사용한다.
    // 임의 canonical/symlink 변환을 추가하지 않고 기존 SafePath/nofollow 결과만 취한다.
    root_=journal_->managed_root_;
    catalog_.reset();catalog_=std::make_unique<RecordingCatalog>(*journal_,RuntimeCatalogOptions(root_));
    if(!catalog_->Open(error))return false;
#else
    // 기존 비지원 빌드의 V1 의미는 유지한다. B marker는 Journal에서 계속 거부한다.
    if(!journal_->Open(error)||!catalog_->Open(error))return false;
#endif
    opened_=true;if(error)error->clear();return true;
}
GStreamerSegmentWriter::Options RecordingRuntimeStorage::WriterOptions(std::int64_t segment_ms) {
    GStreamerSegmentWriter::Options options{root_,segment_ms};
    options.managed_journal=journal_.get();options.managed_catalog=catalog_.get();
    options.managed_store_id=journal_->ManagedStoreId();
    return options;
}
bool RecoverRuntimeRecordingAtStartup(RecordingCatalog& catalog,RetentionCoordinator& retention,DerivedJobService* service,
    const std::filesystem::path& root,std::int64_t now,RecordingStartupRecoveryReport* report,std::string* error) {
    if(!RecoverRecordingMetadataAtStartup(catalog,retention,root,now,report,error))return false;
    if(service) {
        for(const auto& result:service->Reconcile())if(result.blocked) {
            if(report)report->failed_stage="derived-reconcile";
            if(error)*error=result.reason;return false;
        }
    }
    std::vector<DerivedJobRecordV1> active;
    bool more=false;
    if(!catalog.SnapshotActiveDerivedJobs(1,&active,&more,error)||!active.empty()||more) {
        if(report)report->failed_stage="derived-active-remains";
        if(error&&error->empty())*error="derived-active-remains";
        return false;
    }
    return InspectFinalizedRecordingAtStartup(catalog,report,error);
}
}
