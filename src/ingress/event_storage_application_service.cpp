// 파일 요약: dependency-free EventRecord 저장소 DTO와 canonical analysis 계약을 상호 투영한다.
#include "ingress/event_storage_application_service.h"

#include <utility>

#include "analysis/event_storage.h"

namespace ingress {
namespace {

analysis::EventRecordQueryOptions ToCanonical(const EventStorageApplicationQueryOptions& input) {
    analysis::EventRecordQueryOptions output;
    output.event_id = input.event_id;
    output.event_type = input.event_type;
    output.stream_id = input.stream_id;
    output.channel_id = input.channel_id;
    output.has_track_id = input.has_track_id;
    output.track_id = input.track_id;
    output.status = input.status;
    output.zone_id = input.zone_id;
    output.line_id = input.line_id;
    output.scenario_name = input.scenario_name;
    output.scenario_phase = input.scenario_phase;
    output.evidence = input.evidence;
    output.has_start_time_ms = input.has_start_time_ms;
    output.start_time_ms = input.start_time_ms;
    output.has_end_time_ms = input.has_end_time_ms;
    output.end_time_ms = input.end_time_ms;
    output.offset = input.offset;
    output.limit = input.limit;
    output.include_archives = input.include_archives;
    return output;
}

EventStorageApplicationSnapshot FromCanonical(const analysis::EventStorageSnapshot& input) {
    EventStorageApplicationSnapshot output;
    output.enabled = input.enabled;
    output.path = input.path;
    output.active_path = input.active_path;
    output.active_file_size_bytes = input.active_file_size_bytes;
    output.archived_file_count = input.archived_file_count;
    output.total_archive_bytes = input.total_archive_bytes;
    output.queue_size = input.queue_size;
    output.max_queue_size = input.max_queue_size;
    output.enqueued_count = input.enqueued_count;
    output.stored_count = input.stored_count;
    output.failed_count = input.failed_count;
    output.write_failed_count = input.write_failed_count;
    output.dropped_count = input.dropped_count;
    output.skipped_corrupt_lines = input.skipped_corrupt_lines;
    output.partial_line_count = input.partial_line_count;
    output.last_recovery_time_ms = input.last_recovery_time_ms;
    output.last_recovery_status = input.last_recovery_status;
    output.rotated_count = input.rotated_count;
    output.rotation_failed_count = input.rotation_failed_count;
    output.retention_deleted_count = input.retention_deleted_count;
    output.retention_deleted_bytes = input.retention_deleted_bytes;
    output.retention_failed_count = input.retention_failed_count;
    output.snapshot_hook_enabled = input.snapshot_hook_enabled;
    output.clip_hook_enabled = input.clip_hook_enabled;
    output.snapshot_dir = input.snapshot_dir;
    output.clip_dir = input.clip_dir;
    output.pre_event_ms = input.pre_event_ms;
    output.post_event_ms = input.post_event_ms;
    output.clip_buffer_ms = input.clip_buffer_ms;
    output.snapshot_hook_failed_count = input.snapshot_hook_failed_count;
    output.clip_hook_failed_count = input.clip_hook_failed_count;
    output.last_snapshot_error = input.last_snapshot_error;
    output.last_clip_error = input.last_clip_error;
    output.last_error = input.last_error;
    return output;
}

EventStorageApplicationCompactedFileInfo FromCanonical(
    const analysis::EventRecordCompactedFileInfo& input) {
    EventStorageApplicationCompactedFileInfo output;
    output.file_name = input.file_name;
    output.path = input.path;
    output.size_bytes = input.size_bytes;
    output.modified_time_ms = input.modified_time_ms;
    return output;
}

}  // namespace

void DispatchEventRecordsForApplication(const EventStorageApplicationDispatchRequest& request) {
    analysis::AnalysisResult result;
    result.source_key = request.source.source_key;
    result.profile_key = request.source.profile_key;
    result.context.source_kind = request.source.source_kind;
    result.context.route = request.source.route;
    result.context.client_id = request.source.client_id;
    result.pts = request.source.pts;

    std::vector<analysis::AnalysisEvent> events;
    events.reserve(request.events.size());
    for (const auto& input : request.events) {
        analysis::AnalysisEvent event;
        event.event_id = input.event_id;
        event.rule_id = input.rule_id;
        event.event_type = input.event_type;
        event.track_id = input.track_id;
        event.class_id = input.class_id;
        event.label = input.label;
        event.score = input.score;
        event.box.x = input.box.x;
        event.box.y = input.box.y;
        event.box.width = input.box.width;
        event.box.height = input.box.height;
        event.highlight_color = input.highlight_color;
        event.highlight_duration_ms = input.highlight_duration_ms;
        event.highlight_enabled = input.highlight_enabled;
        event.post_enabled = input.post_enabled;
        event.post_url = input.post_url;
        event.status = input.status;
        event.start_time_ms = input.start_time_ms;
        event.update_time_ms = input.update_time_ms;
        event.end_time_ms = input.end_time_ms;
        event.zone_id = input.zone_id;
        event.line_id = input.line_id;
        event.scenario_name = input.scenario_name;
        event.scenario_phase = input.scenario_phase;
        event.metadata_json = input.metadata_json;
        events.push_back(std::move(event));
    }
    analysis::DispatchEventRecords(result, events);
}

EventStorageApplicationSnapshot ObserveEventStorageForApplication() {
    return FromCanonical(analysis::GetEventStorageSnapshot());
}

bool QueryEventRecordsForApplication(const EventStorageApplicationQueryOptions& options,
                                     EventStorageApplicationQueryResult* result,
                                     std::string* error_message) {
    if (result == nullptr) {
        if (error_message != nullptr) {
            *error_message = "result is required";
        }
        return false;
    }
    analysis::EventRecordQueryResult canonical;
    const bool succeeded =
        analysis::QueryEventRecords(ToCanonical(options), &canonical, error_message);
    result->storage = FromCanonical(canonical.storage);
    result->file_exists = canonical.file_exists;
    result->records_json = std::move(canonical.records_json);
    result->offset = canonical.offset;
    result->limit = canonical.limit;
    result->next_offset = canonical.next_offset;
    result->has_more = canonical.has_more;
    result->truncated = canonical.truncated;
    result->skipped_corrupt_lines = canonical.skipped_corrupt_lines;
    result->partial_line_count = canonical.partial_line_count;
    result->archive_files_scanned = canonical.archive_files_scanned;
    result->archive_records_scanned = canonical.archive_records_scanned;
    result->matched_records = canonical.matched_records;
    return succeeded;
}

bool CompactEventRecordsForApplication(const EventStorageApplicationQueryOptions& options,
                                       EventStorageApplicationCompactionResult* result,
                                       std::string* error_message) {
    if (result == nullptr) {
        if (error_message != nullptr) {
            *error_message = "result is required";
        }
        return false;
    }
    analysis::EventRecordCompactionResult canonical;
    const bool succeeded =
        analysis::CompactEventRecords(ToCanonical(options), &canonical, error_message);
    result->storage = FromCanonical(canonical.storage);
    result->active_file_exists = canonical.active_file_exists;
    result->compacted_path = canonical.compacted_path;
    result->active_records_scanned = canonical.active_records_scanned;
    result->archive_files_scanned = canonical.archive_files_scanned;
    result->archive_records_scanned = canonical.archive_records_scanned;
    result->retained_records = canonical.retained_records;
    result->skipped_corrupt_lines = canonical.skipped_corrupt_lines;
    result->partial_line_count = canonical.partial_line_count;
    return succeeded;
}

bool ListCompactedEventRecordFilesForApplication(
    EventStorageApplicationCompactedFileListResult* result,
    std::string* error_message) {
    if (result == nullptr) {
        if (error_message != nullptr) {
            *error_message = "result is required";
        }
        return false;
    }
    analysis::EventRecordCompactedFileListResult canonical;
    const bool succeeded =
        analysis::ListCompactedEventRecordFiles(&canonical, error_message);
    result->storage = FromCanonical(canonical.storage);
    result->files.clear();
    result->files.reserve(canonical.files.size());
    for (const auto& file : canonical.files) {
        result->files.push_back(FromCanonical(file));
    }
    return succeeded;
}

bool ResolveCompactedEventRecordFileForApplication(
    const std::string& file_name,
    EventStorageApplicationCompactedFileInfo* result,
    std::string* error_message) {
    if (result == nullptr) {
        if (error_message != nullptr) {
            *error_message = "result is required";
        }
        return false;
    }
    analysis::EventRecordCompactedFileInfo canonical;
    if (!analysis::ResolveCompactedEventRecordFile(file_name, &canonical, error_message)) {
        return false;
    }
    *result = FromCanonical(canonical);
    return true;
}

bool DeleteCompactedEventRecordFileForApplication(
    const std::string& file_name,
    EventStorageApplicationCompactedFileInfo* result,
    std::string* error_message) {
    analysis::EventRecordCompactedFileInfo canonical;
    if (!analysis::DeleteCompactedEventRecordFile(
            file_name, result != nullptr ? &canonical : nullptr, error_message)) {
        return false;
    }
    if (result != nullptr) {
        *result = FromCanonical(canonical);
    }
    return true;
}

bool CleanupCompactedEventRecordFilesForApplication(
    std::size_t keep_newest,
    EventStorageApplicationCompactedFileCleanupResult* result,
    std::string* error_message) {
    if (result == nullptr) {
        if (error_message != nullptr) {
            *error_message = "result is required";
        }
        return false;
    }
    analysis::EventRecordCompactedFileCleanupResult canonical;
    const bool succeeded =
        analysis::CleanupCompactedEventRecordFiles(keep_newest, &canonical, error_message);
    result->storage = FromCanonical(canonical.storage);
    result->deleted_count = canonical.deleted_count;
    result->deleted_bytes = canonical.deleted_bytes;
    result->kept_count = canonical.kept_count;
    return succeeded;
}

}  // namespace ingress
