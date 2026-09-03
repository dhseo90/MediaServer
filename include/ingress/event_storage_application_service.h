// 파일 요약: EventRecord 저장소 입출력을 dependency-free application DTO로 선언한다.
#pragma once

#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

namespace ingress {

struct EventStorageApplicationBox {
    float x{0.0F};
    float y{0.0F};
    float width{0.0F};
    float height{0.0F};
};

struct EventStorageApplicationDispatchSource {
    std::string source_key;
    std::string profile_key;
    std::string source_kind{"*"};
    std::string route{"*"};
    std::string client_id;
    std::int64_t pts{0};
    std::string time_basis;
    std::int64_t time_anchor_utc_ms{0};
    std::int64_t time_anchor_pts_ms{0};
    std::string stream_epoch_id;
};

struct EventStorageApplicationDispatchEvent {
    std::string event_id;
    std::string rule_id;
    std::string event_type;
    std::uint64_t track_id{0};
    int class_id{-1};
    std::string label;
    float score{0.0F};
    EventStorageApplicationBox box;
    std::string highlight_color{"#ff0000"};
    int highlight_duration_ms{1200};
    bool highlight_enabled{true};
    bool post_enabled{false};
    std::string post_url;
    std::string status;
    std::int64_t start_time_ms{0};
    std::int64_t update_time_ms{0};
    std::int64_t end_time_ms{0};
    std::string zone_id;
    std::string line_id;
    std::string scenario_name;
    std::string scenario_phase;
    std::string metadata_json;
};

struct EventStorageApplicationDispatchRequest {
    EventStorageApplicationDispatchSource source;
    std::vector<EventStorageApplicationDispatchEvent> events;
};

struct EventStorageApplicationSnapshot {
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

struct EventStorageApplicationQueryOptions {
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

struct EventStorageApplicationQueryResult {
    EventStorageApplicationSnapshot storage;
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

struct EventStorageApplicationCompactionResult {
    EventStorageApplicationSnapshot storage;
    bool active_file_exists{false};
    std::string compacted_path;
    std::uint64_t active_records_scanned{0};
    std::uint64_t archive_files_scanned{0};
    std::uint64_t archive_records_scanned{0};
    std::uint64_t retained_records{0};
    std::uint64_t skipped_corrupt_lines{0};
    std::uint64_t partial_line_count{0};
};

struct EventStorageApplicationCompactedFileInfo {
    std::string file_name;
    std::string path;
    std::uint64_t size_bytes{0};
    std::int64_t modified_time_ms{0};
};

struct EventStorageApplicationCompactedFileListResult {
    EventStorageApplicationSnapshot storage;
    std::vector<EventStorageApplicationCompactedFileInfo> files;
};

struct EventStorageApplicationCompactedFileCleanupResult {
    EventStorageApplicationSnapshot storage;
    std::uint64_t deleted_count{0};
    std::uint64_t deleted_bytes{0};
    std::uint64_t kept_count{0};
};

void DispatchEventRecordsForApplication(const EventStorageApplicationDispatchRequest& request);
EventStorageApplicationSnapshot ObserveEventStorageForApplication();
bool QueryEventRecordsForApplication(const EventStorageApplicationQueryOptions& options,
                                     EventStorageApplicationQueryResult* result,
                                     std::string* error_message);
bool CompactEventRecordsForApplication(const EventStorageApplicationQueryOptions& options,
                                       EventStorageApplicationCompactionResult* result,
                                       std::string* error_message);
bool ListCompactedEventRecordFilesForApplication(
    EventStorageApplicationCompactedFileListResult* result,
    std::string* error_message);
bool ResolveCompactedEventRecordFileForApplication(
    const std::string& file_name,
    EventStorageApplicationCompactedFileInfo* result,
    std::string* error_message);
bool DeleteCompactedEventRecordFileForApplication(
    const std::string& file_name,
    EventStorageApplicationCompactedFileInfo* result,
    std::string* error_message);
bool CleanupCompactedEventRecordFilesForApplication(
    std::size_t keep_newest,
    EventStorageApplicationCompactedFileCleanupResult* result,
    std::string* error_message);
}  // namespace ingress
