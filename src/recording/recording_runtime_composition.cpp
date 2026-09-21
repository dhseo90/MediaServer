// 파일 용도: 녹화 런타임의 관리 원장·카탈로그·작성기 옵션과 시작 복구 구성을 연결한다.
#include "recording/recording_runtime_composition.h"
#include "recording/recording_derived_job_service.h"
namespace recording {
RecordingRuntimeStorage::RecordingRuntimeStorage(std::filesystem::path root)
    :root_(std::move(root)) {
    journal_=std::make_unique<RecordingJournal>(RecordingJournal::ManagedOptions{root_,{}});
    RecordingCatalog::Options options{root_/"recording-catalog.sqlite3",root_,true};
    options.enable_v2_storage=true;
    catalog_=std::make_unique<RecordingCatalog>(*journal_,options);
}
bool RecordingRuntimeStorage::Open(std::string* error){return journal_->Open(error)&&catalog_->Open(error);}
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
