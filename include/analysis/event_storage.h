// 파일 요약: VA 이벤트를 조회/clip 연결용 EventRecord로 저장하는 최소 저장소 계약을 선언한다.
// 동작 요약: 외부 이벤트 출력 형식은 바꾸지 않고 내부 기록만 JSON Lines로 비동기 저장한다.
// 동작 요약: DB 의존성 없이 파일 저장소와 bounded queue 기반 dispatcher를 제공한다.
#pragma once

#include <cstddef>
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

#include "analysis/event_rule_engine.h"

namespace analysis {

struct EventRecord {
    std::string event_id;
    std::string event_type;
    std::string stream_id;
    std::string channel_id;
    std::uint64_t track_id{0};
    int class_id{-1};
    std::string class_name;
    std::int64_t start_time_ms{0};
    std::int64_t update_time_ms{0};
    std::int64_t end_time_ms{0};
    std::string status;
    std::string zone_id;
    std::string line_id;
    std::string scenario_name;
    std::string scenario_phase;
    float confidence{0.0F};
    bool bbox_available{false};
    RectF bbox;
    std::string snapshot_path;
    std::string bbox_crop_path;
    std::string clip_path;
    int pre_event_ms{0};
    int post_event_ms{0};
    std::string time_basis;
    std::int64_t time_anchor_utc_ms{0};
    std::int64_t time_anchor_pts_ms{0};
    std::string stream_epoch_id;
    std::string recording_link_id;
    std::string recording_completeness;
    std::string metadata_json{"{}"};
};

struct EventMediaHookOptions {
    bool enabled{false};
    std::string directory;
    int pre_event_ms{0};
    int post_event_ms{0};
    int clip_buffer_ms{0};
};

class EventSnapshotHook {
public:
    virtual ~EventSnapshotHook() = default;
    virtual bool CaptureSnapshot(const EventRecord& record,
                                 const EventMediaHookOptions& options,
                                 std::string* snapshot_path,
                                 std::string* error_message) = 0;
};

class EventClipHook {
public:
    virtual ~EventClipHook() = default;
    virtual bool CaptureClip(const EventRecord& record,
                             const EventMediaHookOptions& options,
                             std::string* clip_path,
                             std::string* error_message) = 0;
};

struct EventRecordingBridgeResult {
    bool handled{false};
    bool derived_clip_ready{false};
    std::string clip_path;
    std::string link_id;
    std::string completeness;
    std::string error;
};

class EventRecordingBridge {
public:
    virtual ~EventRecordingBridge() = default;
    virtual EventRecordingBridgeResult TryResolve(
        const AnalysisResult& result,
        const EventRecord& record,
        const EventMediaHookOptions& options) = 0;
    virtual void RecordFallback(const EventRecord& record,
                                const EventRecordingBridgeResult& previous) = 0;
};

class NoOpEventSnapshotHook final : public EventSnapshotHook {
public:
    bool CaptureSnapshot(const EventRecord& record,
                         const EventMediaHookOptions& options,
                         std::string* snapshot_path,
                         std::string* error_message) override;
};

class NoOpEventClipHook final : public EventClipHook {
public:
    bool CaptureClip(const EventRecord& record,
                     const EventMediaHookOptions& options,
                     std::string* clip_path,
                     std::string* error_message) override;
};

class EventStorage {
public:
    virtual ~EventStorage() = default;
    virtual bool Store(const EventRecord& record, std::string* error_message) = 0;
};

class FileEventStorage final : public EventStorage {
public:
    explicit FileEventStorage(std::string path);
    bool Store(const EventRecord& record, std::string* error_message) override;

private:
    std::string path_;
};

struct EventStorageSnapshot {
    bool enabled{false};
    std::string path;
    std::string active_path;
    std::uint64_t active_file_size_bytes{0};
    std::uint64_t archived_file_count{0};
    std::uint64_t total_archive_bytes{0};
    std::size_t queue_size{0};
    std::size_t max_queue_size{0};
    std::uint64_t enqueued_count{0};
    std::uint64_t stored_count{0};
    std::uint64_t failed_count{0};
    std::uint64_t write_failed_count{0};
    std::uint64_t dropped_count{0};
    std::uint64_t skipped_corrupt_lines{0};
    std::uint64_t partial_line_count{0};
    std::uint64_t last_recovery_time_ms{0};
    std::string last_recovery_status{"not-run"};
    std::uint64_t rotated_count{0};
    std::uint64_t rotation_failed_count{0};
    std::uint64_t retention_deleted_count{0};
    std::uint64_t retention_deleted_bytes{0};
    std::uint64_t retention_failed_count{0};
    bool snapshot_hook_enabled{false};
    bool clip_hook_enabled{false};
    std::string snapshot_dir;
    std::string clip_dir;
    int pre_event_ms{0};
    int post_event_ms{0};
    int clip_buffer_ms{0};
    std::uint64_t snapshot_hook_failed_count{0};
    std::uint64_t clip_hook_failed_count{0};
    std::string last_snapshot_error;
    std::string last_clip_error;
    std::string last_error;
};

struct EventRecordQueryOptions {
    std::string event_id;
    std::string event_type;
    std::string stream_id;
    std::string channel_id;
    bool has_track_id{false};
    std::uint64_t track_id{0};
    std::string status;
    std::string zone_id;
    std::string line_id;
    std::string scenario_name;
    std::string scenario_phase;
    std::string evidence;
    bool has_start_time_ms{false};
    std::int64_t start_time_ms{0};
    bool has_end_time_ms{false};
    std::int64_t end_time_ms{0};
    std::size_t offset{0};
    std::size_t limit{100};
    bool include_archives{false};
};

struct EventRecordQueryResult {
    EventStorageSnapshot storage;
    bool file_exists{false};
    std::vector<std::string> records_json;
    std::size_t offset{0};
    std::size_t limit{100};
    std::size_t next_offset{0};
    bool has_more{false};
    bool truncated{false};
    std::uint64_t skipped_corrupt_lines{0};
    std::uint64_t partial_line_count{0};
    std::uint64_t archive_files_scanned{0};
    std::uint64_t archive_records_scanned{0};
    std::uint64_t matched_records{0};
};

struct EventRecordCompactionResult {
    EventStorageSnapshot storage;
    bool active_file_exists{false};
    std::string compacted_path;
    std::uint64_t active_records_scanned{0};
    std::uint64_t archive_files_scanned{0};
    std::uint64_t archive_records_scanned{0};
    std::uint64_t retained_records{0};
    std::uint64_t skipped_corrupt_lines{0};
    std::uint64_t partial_line_count{0};
};

struct EventRecordCompactedFileInfo {
    std::string file_name;
    std::string path;
    std::uint64_t size_bytes{0};
    std::int64_t modified_time_ms{0};
};

struct EventRecordCompactedFileListResult {
    EventStorageSnapshot storage;
    std::vector<EventRecordCompactedFileInfo> files;
};

struct EventRecordCompactedFileCleanupResult {
    EventStorageSnapshot storage;
    std::uint64_t deleted_count{0};
    std::uint64_t deleted_bytes{0};
    std::uint64_t kept_count{0};
};

void DispatchEventRecords(const AnalysisResult& result, const std::vector<AnalysisEvent>& events);
EventStorageSnapshot GetEventStorageSnapshot();
bool QueryEventRecords(const EventRecordQueryOptions& options,
                       EventRecordQueryResult* result,
                       std::string* error_message);
bool CompactEventRecords(const EventRecordQueryOptions& options,
                         EventRecordCompactionResult* result,
                         std::string* error_message);
bool ListCompactedEventRecordFiles(EventRecordCompactedFileListResult* result,
                                   std::string* error_message);
bool ResolveCompactedEventRecordFile(const std::string& file_name,
                                     EventRecordCompactedFileInfo* result,
                                     std::string* error_message);
bool DeleteCompactedEventRecordFile(const std::string& file_name,
                                    EventRecordCompactedFileInfo* result,
                                    std::string* error_message);
bool CleanupCompactedEventRecordFiles(std::size_t keep_newest,
                                      EventRecordCompactedFileCleanupResult* result,
                                      std::string* error_message);
void RecordEventFrame(const std::string& stream_id,
                      const std::string& channel_id,
                      const RawVideoFrame& frame);
void SetEventRecordingBridge(std::shared_ptr<EventRecordingBridge> bridge);
void StopEventStorage();

}  // namespace analysis
