// 파일 용도: 기본 application과 격리 fixture가 같은 관리 저장소/복구 구성을 사용한다.
#pragma once
#include "recording/recording_catalog.h"
#include "recording/gstreamer_segment_writer.h"
#include "recording/recording_startup_recovery.h"
#include <memory>
namespace recording {
class DerivedJobService;
class RecordingRuntimeStorage {
public:
    explicit RecordingRuntimeStorage(std::filesystem::path root);
    bool Open(std::string* error);
    RecordingJournal& journal(){return *journal_;}
    RecordingCatalog& catalog(){return *catalog_;}
    GStreamerSegmentWriter::Options WriterOptions(std::int64_t segment_ms);
private:
    std::filesystem::path root_;
    std::unique_ptr<RecordingJournal> journal_;
    std::unique_ptr<RecordingCatalog> catalog_;
};
bool RecoverRuntimeRecordingAtStartup(RecordingCatalog&,RetentionCoordinator&,DerivedJobService*,
    const std::filesystem::path&,std::int64_t,RecordingStartupRecoveryReport*,std::string*);
}
