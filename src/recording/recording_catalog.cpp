// 파일 요약: 녹화 JSONL mutation을 memory/SQLite projection에 적용한다.
// 동작 요약: idempotent replay, FK 검증, 손상 DB 격리와 range query parity를 구현한다.
#include "recording/recording_catalog.h"

#include <algorithm>
#include <atomic>
#include <chrono>
#include <fstream>
#include <limits>
#include <sstream>

#include "domain/strict_json.h"

#ifndef MEDIA_SERVER_USE_SQLITE3
#define MEDIA_SERVER_USE_SQLITE3 0
#endif

#if MEDIA_SERVER_USE_SQLITE3
#include <sqlite3.h>
#endif

namespace recording {
namespace {

std::int64_t NowMs() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
               std::chrono::system_clock::now().time_since_epoch())
        .count();
}

bool Fail(std::string* error, const std::string& message) {
    if (error != nullptr) *error = message;
    return false;
}

std::string Escape(const std::string& value) {
    std::string out;
    for (const char ch : value) {
        if (ch == '\\') out += "\\\\";
        else if (ch == '"') out += "\\\"";
        else if (ch == '\n') out += "\\n";
        else out.push_back(ch);
    }
    return out;
}

std::string NextMutationId() {
    static std::atomic<std::uint64_t> sequence{0};
    return "mut-" + std::to_string(NowMs()) + "-" + std::to_string(++sequence);
}

std::optional<std::string> ObjectField(const std::string& json, const std::string& key) {
    ingress::StrictJsonObjectDocument document;
    std::string error;
    if (!ingress::ParseStrictJsonObjectDocument(json, &document, &error)) return std::nullopt;
    return ingress::StrictJsonObjectField(document, key);
}

std::optional<std::string> StringField(const std::string& json, const std::string& key) {
    ingress::StrictJsonObjectDocument document;
    std::string error;
    if (!ingress::ParseStrictJsonObjectDocument(json, &document, &error)) return std::nullopt;
    return ingress::StrictJsonStringField(document, key);
}

bool IsRecognizedMedia(const std::filesystem::path& path) {
    std::ifstream input(path, std::ios::binary);
    unsigned char bytes[12]{};
    input.read(reinterpret_cast<char*>(bytes), sizeof(bytes));
    const auto count = input.gcount();
    const bool mp4 = count >= 8 && bytes[4] == 'f' && bytes[5] == 't' && bytes[6] == 'y' && bytes[7] == 'p';
    const bool webm = count >= 4 && bytes[0] == 0x1a && bytes[1] == 0x45 && bytes[2] == 0xdf && bytes[3] == 0xa3;
    return mp4 || webm;
}

bool IsSafeMediaRelpath(const std::string& value) {
    if (value.empty()) return false;
    const std::filesystem::path path(value);
    if (path.is_absolute()) return false;
    const auto normalized = path.lexically_normal();
    if (normalized.empty() || normalized == ".") return false;
    for (const auto& part : normalized) {
        if (part == "..") return false;
    }
    return true;
}

bool ResolveContainedMediaPath(const std::filesystem::path& root,
                               const std::filesystem::path& relative,
                               std::filesystem::path* resolved) {
    if (resolved == nullptr || !IsSafeMediaRelpath(relative.generic_string())) return false;
    std::error_code root_error;
    std::error_code media_error;
    const auto canonical_root = std::filesystem::weakly_canonical(root, root_error);
    const auto canonical_media = std::filesystem::weakly_canonical(root / relative, media_error);
    if (root_error || media_error) return false;
    const auto containment = canonical_media.lexically_relative(canonical_root);
    if (containment.empty() || containment.is_absolute()) return false;
    for (const auto& part : containment) {
        if (part == "..") return false;
    }
    *resolved = canonical_media;
    return true;
}

std::string LifecycleName(RecordingLifecycle value) {
    switch (value) {
        case RecordingLifecycle::Writing: return "writing";
        case RecordingLifecycle::Finalized: return "finalized";
        case RecordingLifecycle::DeletionPending: return "deletion_pending";
        case RecordingLifecycle::Deleted: return "deleted";
        case RecordingLifecycle::Corrupt: return "corrupt";
        case RecordingLifecycle::Unknown: return "unknown";
    }
    return "unknown";
}

std::string RetentionName(RecordingRetentionClass value) {
    switch (value) {
        case RecordingRetentionClass::Continuous: return "continuous";
        case RecordingRetentionClass::Event: return "event";
        case RecordingRetentionClass::Unknown: return "unknown";
    }
    return "unknown";
}

std::string EventStatusName(EventRecordingLinkStatus value) {
    switch (value) {
        case EventRecordingLinkStatus::Pending: return "pending";
        case EventRecordingLinkStatus::Complete: return "complete";
        case EventRecordingLinkStatus::Partial: return "partial";
        case EventRecordingLinkStatus::Failed: return "failed";
        case EventRecordingLinkStatus::Unknown: return "unknown";
    }
    return "unknown";
}

#if MEDIA_SERVER_USE_SQLITE3
bool Exec(sqlite3* db, const std::string& sql, std::string* error) {
    char* raw_error = nullptr;
    const int rc = sqlite3_exec(db, sql.c_str(), nullptr, nullptr, &raw_error);
    if (rc == SQLITE_OK) return true;
    const std::string message = raw_error != nullptr ? raw_error : sqlite3_errmsg(db);
    sqlite3_free(raw_error);
    return Fail(error, message);
}

void BindText(sqlite3_stmt* statement, int index, const std::string& value) {
    sqlite3_bind_text(statement, index, value.c_str(), -1, SQLITE_TRANSIENT);
}
#endif

}  // namespace

RecordingCatalog::RecordingCatalog(RecordingJournal& journal, Options options)
    : journal_(journal), options_(std::move(options)) {}

RecordingCatalog::~RecordingCatalog() {
    std::lock_guard lock(mu_);
    CloseSqliteLocked();
}

bool RecordingCatalog::Open(std::string* error) {
    std::lock_guard lock(mu_);
    if (opened_) return true;
    const auto replay = journal_.Replay();
    recovery_report_.corrupt_line_count = replay.corrupt_line_count;
    recovery_report_.truncated_tail_count = replay.truncated_tail_count;
    for (const auto& mutation : replay.mutations) {
        std::string apply_error;
        if (!ApplyMutationLocked(mutation, true, &apply_error)) ++recovery_report_.projection_error_count;
        else ++recovery_report_.replayed_mutation_count;
    }
    if (options_.prefer_sqlite && OpenSqliteLocked(error)) {
        catalog_mode_ = "sqlite-primary";
        if (!RebuildSqliteLocked(error)) return false;
    } else {
        CloseSqliteLocked();
        catalog_mode_ = "jsonl-fallback";
        if (error != nullptr) error->clear();
    }
    if (!RecoverWriterCleanupMarkersLocked(error)) return false;
    opened_ = true;
    return true;
}

std::string RecordingCatalog::catalog_mode() const {
    std::lock_guard lock(mu_);
    return catalog_mode_;
}

RecordingCatalogRecoveryReport RecordingCatalog::recovery_report() const {
    std::lock_guard lock(mu_);
    return recovery_report_;
}

bool RecordingCatalog::RecoverWriterCleanupMarkersLocked(std::string* error) {
    constexpr const char* kCleanupSuffix = ".cleanup-pending";
    std::vector<std::filesystem::path> markers;
    std::error_code scan_error;
    if (!std::filesystem::exists(options_.media_root, scan_error)) {
        if (scan_error) return Fail(error, "writer cleanup marker root 확인 실패");
        return true;
    }
    for (std::filesystem::recursive_directory_iterator iterator(
             options_.media_root, scan_error), end;
         !scan_error && iterator != end;
         iterator.increment(scan_error)) {
        const auto& entry = *iterator;
        const std::string path = entry.path().string();
        if (entry.is_regular_file(scan_error) && !scan_error &&
            path.size() > std::char_traits<char>::length(kCleanupSuffix) &&
            path.compare(path.size() - std::char_traits<char>::length(kCleanupSuffix),
                         std::char_traits<char>::length(kCleanupSuffix),
                         kCleanupSuffix) == 0) {
            markers.push_back(entry.path());
        }
    }
    if (scan_error) return Fail(error, "writer cleanup marker 순회 실패");

    for (const auto& marker : markers) {
        std::filesystem::path final_path = marker;
        std::string final_text = final_path.string();
        final_text.resize(final_text.size() - std::char_traits<char>::length(kCleanupSuffix));
        final_path = final_text;
        if (final_path.extension() != ".mp4" && final_path.extension() != ".webm") {
            ++recovery_report_.writer_cleanup_error_count;
            return Fail(error, "writer cleanup marker 대상 확장자가 유효하지 않음");
        }
        const std::string segment_id = final_path.stem().string();
        const auto known = segments_.find(segment_id);
        const auto known_path = media_relpaths_.find(segment_id);
        const auto relative_final = final_path.lexically_relative(options_.media_root);
        const bool tracked_final =
            known != segments_.end() && known_path != media_relpaths_.end() &&
            known_path->second == relative_final.generic_string() &&
            (known->second.lifecycle == RecordingLifecycle::Finalized ||
             known->second.lifecycle == RecordingLifecycle::DeletionPending);
        std::string cleanup_error;
        if (!tracked_final) {
            auto partial_path = final_path;
            partial_path += ".partial";
            if (!RemoveContainedMediaFile(
                    options_.media_root, final_path, &cleanup_error) ||
                !RemoveContainedMediaFile(
                    options_.media_root, partial_path, &cleanup_error)) {
                ++recovery_report_.writer_cleanup_error_count;
                return Fail(error, cleanup_error.empty()
                                       ? "미추적 writer media 복구 삭제 실패"
                                       : cleanup_error);
            }
        }
        if (!RemoveContainedMediaFile(options_.media_root, marker, &cleanup_error)) {
            ++recovery_report_.writer_cleanup_error_count;
            return Fail(error, cleanup_error.empty()
                                   ? "writer cleanup marker 제거 실패"
                                   : cleanup_error);
        }
        ++recovery_report_.writer_cleanup_recovered_count;
    }
    if (error != nullptr) error->clear();
    return true;
}

bool RecordingCatalog::ApplyMutationLocked(const RecordingMutationV1& mutation,
                                           bool count_duplicate,
                                           std::string* error) {
    if (!mutation_ids_.insert(mutation.mutation_id).second) {
        if (count_duplicate) ++recovery_report_.duplicate_mutation_count;
        if (error != nullptr) error->clear();
        return true;
    }
    bool ok = true;
    switch (mutation.mutation_type) {
        case RecordingMutationType::SegmentFinalized: {
            const auto segment_json = ObjectField(mutation.payload_json, "segment");
            const auto relpath = StringField(mutation.payload_json, "mediaRelpath");
            RecordingSegmentV1 segment;
            ok = segment_json && relpath && IsSafeMediaRelpath(*relpath) &&
                 ParseRecordingSegmentV1(*segment_json, &segment, error);
            if (!ok && error != nullptr && error->empty()) {
                *error = "recording mediaRelpath가 안전한 상대 경로가 아님";
            }
            if (ok) { segments_[segment.segment_id] = segment; media_relpaths_[segment.segment_id] = *relpath; }
            break;
        }
        case RecordingMutationType::EventLinkCreated: {
            const auto link_json = ObjectField(mutation.payload_json, "link");
            EventRecordingLinkV1 link;
            ok = link_json && ParseEventRecordingLinkV1(*link_json, &link, error);
            if (ok) {
                for (const auto& overlap : link.ordered_overlaps) {
                    if (segments_.find(overlap.segment_id) == segments_.end()) {
                        ok = Fail(error, "event link segment foreign key 위반");
                        break;
                    }
                }
            }
            if (ok) event_links_[link.link_id] = link;
            break;
        }
        case RecordingMutationType::ObservationPut: {
            const auto observation_json = ObjectField(mutation.payload_json, "observation");
            AnalysisObservationV1 observation;
            ok = observation_json && ParseAnalysisObservationV1(*observation_json, &observation, error);
            if (ok && segments_.find(observation.frame_locator.segment_id) == segments_.end()) {
                ok = Fail(error, "observation segment foreign key 위반");
            }
            if (ok) observations_[observation.observation_id] = observation;
            break;
        }
        case RecordingMutationType::DeletionRequested: {
            const auto it = segments_.find(mutation.entity_id);
            const auto reason = StringField(mutation.payload_json, "reason");
            ok = it != segments_.end();
            if (ok) {
                it->second.lifecycle = RecordingLifecycle::DeletionPending;
                deletion_reasons_[mutation.entity_id] =
                    reason.value_or("manual-corrupt-cleanup");
            }
            else Fail(error, "삭제 요청 segment가 없음");
            break;
        }
        case RecordingMutationType::DeletionCompleted: {
            const auto tombstone_json = ObjectField(mutation.payload_json, "tombstone");
            RecordingTombstoneV1 tombstone;
            ok = tombstone_json && ParseRecordingTombstoneV1(*tombstone_json, &tombstone, error);
            if (ok) {
                tombstones_[tombstone.segment_id] = tombstone;
                const auto it = segments_.find(tombstone.segment_id);
                if (it != segments_.end()) it->second.lifecycle = RecordingLifecycle::Deleted;
                media_relpaths_.erase(tombstone.segment_id);
                hold_counts_.erase(tombstone.segment_id);
                deletion_reasons_.erase(tombstone.segment_id);
            }
            break;
        }
        case RecordingMutationType::CorruptionDetected:
            ok = true;
            break;
        case RecordingMutationType::Unknown:
            ok = Fail(error, "unknown mutation");
            break;
    }
    if (!ok) mutation_ids_.erase(mutation.mutation_id);
    return ok;
}

bool RecordingCatalog::AppendAndApplyLocked(RecordingMutationV1 mutation, std::string* error) {
    mutation.mutation_id = mutation.mutation_id.empty() ? NextMutationId() : mutation.mutation_id;
    mutation.occurred_at_ms = mutation.occurred_at_ms == 0 ? NowMs() : mutation.occurred_at_ms;
    if (!journal_.Append(mutation, error)) return false;
    if (!ApplyMutationLocked(mutation, false, error)) return false;
    if (sqlite_db_ != nullptr) {
        std::string projection_error;
        if (!ProjectMutationSqliteLocked(mutation, &projection_error)) {
            ++recovery_report_.projection_error_count;
            CloseSqliteLocked();
            catalog_mode_ = "jsonl-fallback";
            if (error != nullptr) error->clear();
        }
    }
    return true;
}

bool RecordingCatalog::FinalizeSegment(const RecordingSegmentV1& segment,
                                       const std::string& media_path,
                                       std::string* error) {
    std::lock_guard lock(mu_);
    if (!opened_) return Fail(error, "catalog가 열리지 않음");
    if (!ValidateRecordingSegmentV1(segment, error) || segment.lifecycle != RecordingLifecycle::Finalized) return false;
    std::error_code fs_error;
    const auto root = std::filesystem::weakly_canonical(options_.media_root, fs_error);
    if (fs_error) return Fail(error, "recording root canonicalize 실패");
    const auto media = std::filesystem::weakly_canonical(media_path, fs_error);
    if (fs_error) return Fail(error, "recording media canonicalize 실패");
    const auto relative = media.lexically_relative(root);
    std::filesystem::path contained_media;
    if (!ResolveContainedMediaPath(root, relative, &contained_media) ||
        contained_media != media || !std::filesystem::is_regular_file(media)) {
        return Fail(error, "media path가 recording root 밖이거나 파일이 없음");
    }
    RecordingMutationV1 mutation;
    mutation.mutation_type = RecordingMutationType::SegmentFinalized;
    mutation.entity_id = segment.segment_id;
    mutation.payload_json = "{\"segment\":" + SerializeRecordingSegmentV1(segment) +
                            ",\"mediaRelpath\":\"" + Escape(relative.generic_string()) + "\"}";
    return AppendAndApplyLocked(std::move(mutation), error);
}

bool RecordingCatalog::PutEventLink(const EventRecordingLinkV1& link, std::string* error) {
    std::lock_guard lock(mu_);
    for (const auto& overlap : link.ordered_overlaps) {
        if (segments_.find(overlap.segment_id) == segments_.end()) return Fail(error, "event link segment foreign key 위반");
    }
    RecordingMutationV1 mutation;
    mutation.mutation_type = RecordingMutationType::EventLinkCreated;
    mutation.entity_id = link.link_id;
    mutation.payload_json = "{\"link\":" + SerializeEventRecordingLinkV1(link) + "}";
    return AppendAndApplyLocked(std::move(mutation), error);
}

bool RecordingCatalog::PutObservation(const AnalysisObservationV1& observation, std::string* error) {
    std::lock_guard lock(mu_);
    if (segments_.find(observation.frame_locator.segment_id) == segments_.end()) return Fail(error, "observation segment foreign key 위반");
    RecordingMutationV1 mutation;
    mutation.mutation_type = RecordingMutationType::ObservationPut;
    mutation.entity_id = observation.observation_id;
    mutation.payload_json = "{\"observation\":" + SerializeAnalysisObservationV1(observation) + "}";
    return AppendAndApplyLocked(std::move(mutation), error);
}

bool RecordingCatalog::RequestDeletion(const std::string& segment_id,
                                       const std::string& reason,
                                       std::string* error) {
    std::lock_guard lock(mu_);
    const auto segment = segments_.find(segment_id);
    if (segment == segments_.end() ||
        segment->second.lifecycle != RecordingLifecycle::Finalized) {
        return Fail(error, "삭제 요청 가능한 finalized segment가 없음");
    }
    const auto hold = hold_counts_.find(segment_id);
    if (segment->second.pinned || (hold != hold_counts_.end() && hold->second > 0)) {
        return Fail(error, "pin 또는 hold가 있는 segment는 삭제 요청할 수 없음");
    }
    RecordingMutationV1 mutation;
    mutation.mutation_type = RecordingMutationType::DeletionRequested;
    mutation.entity_id = segment_id;
    mutation.payload_json = "{\"reason\":\"" + Escape(reason) + "\"}";
    return AppendAndApplyLocked(std::move(mutation), error);
}

bool RecordingCatalog::CompleteDeletion(const RecordingTombstoneV1& tombstone, std::string* error) {
    std::lock_guard lock(mu_);
    RecordingMutationV1 mutation;
    mutation.mutation_type = RecordingMutationType::DeletionCompleted;
    mutation.entity_id = tombstone.segment_id;
    mutation.payload_json = "{\"tombstone\":" + SerializeRecordingTombstoneV1(tombstone) + "}";
    return AppendAndApplyLocked(std::move(mutation), error);
}

std::vector<RecordingSegmentV1> RecordingCatalog::QuerySegments(const std::string& channel_id,
                                                                std::int64_t start_ms,
                                                                std::int64_t end_ms) const {
    std::lock_guard lock(mu_);
    std::vector<RecordingSegmentV1> result;
    for (const auto& [_, segment] : segments_) {
        if (segment.channel_id == channel_id && segment.lifecycle != RecordingLifecycle::Deleted &&
            HalfOpenRangesOverlap(segment.start.utc_ms, segment.end.utc_ms, start_ms, end_ms)) result.push_back(segment);
    }
    std::sort(result.begin(), result.end(), [](const auto& lhs, const auto& rhs) {
        if (lhs.start.utc_ms != rhs.start.utc_ms) return lhs.start.utc_ms < rhs.start.utc_ms;
        return lhs.segment_id < rhs.segment_id;
    });
    return result;
}

RetentionSnapshot RecordingCatalog::RetentionSnapshot() const {
    std::lock_guard lock(mu_);
    struct RetentionSnapshot snapshot;
    for (const auto& [segment_id, segment] : segments_) {
        if (segment.lifecycle != RecordingLifecycle::Finalized &&
            segment.lifecycle != RecordingLifecycle::DeletionPending) {
            continue;
        }
        const auto path = media_relpaths_.find(segment_id);
        if (path == media_relpaths_.end()) continue;
        std::filesystem::path contained_media;
        if (!ResolveContainedMediaPath(options_.media_root, path->second, &contained_media)) {
            if (segment.lifecycle == RecordingLifecycle::DeletionPending) {
                RetentionCandidate pending;
                pending.segment = segment;
                pending.media_path = options_.media_root / path->second;
                const auto reason = deletion_reasons_.find(segment_id);
                if (reason != deletion_reasons_.end()) {
                    pending.deletion_reason = reason->second;
                }
                snapshot.candidates.push_back(std::move(pending));
            }
            continue;
        }
        RetentionCandidate candidate;
        candidate.segment = segment;
        candidate.media_path = std::move(contained_media);
        const auto hold = hold_counts_.find(segment_id);
        candidate.hold_count = hold == hold_counts_.end() ? 0 : hold->second;
        const auto reason = deletion_reasons_.find(segment_id);
        if (reason != deletion_reasons_.end()) candidate.deletion_reason = reason->second;
        snapshot.candidates.push_back(std::move(candidate));
    }
    return snapshot;
}

bool RecordingCatalog::AdjustHoldCount(const std::string& segment_id,
                                       std::int64_t delta,
                                       std::string* error) {
    std::lock_guard lock(mu_);
    const auto segment = segments_.find(segment_id);
    if (segment == segments_.end() || segment->second.lifecycle != RecordingLifecycle::Finalized) {
        return Fail(error, "hold 대상 finalized segment가 없음");
    }
    const std::uint64_t current = hold_counts_[segment_id];
    const std::uint64_t magnitude = delta < 0
                                        ? static_cast<std::uint64_t>(-(delta + 1)) + 1
                                        : static_cast<std::uint64_t>(delta);
    if (delta < 0 && magnitude > current) {
        return Fail(error, "hold_count는 음수가 될 수 없음");
    }
    constexpr auto kMaxPersistentHoldCount =
        static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max());
    if (delta >= 0 && magnitude > kMaxPersistentHoldCount - current) {
        return Fail(error, "hold_count가 int64 저장 범위를 넘음");
    }
    const std::uint64_t next = delta >= 0 ? current + magnitude : current - magnitude;
#if MEDIA_SERVER_USE_SQLITE3
    if (sqlite_db_ != nullptr) {
        sqlite3_stmt* statement = nullptr;
        if (sqlite3_prepare_v2(sqlite_db_,
                               "UPDATE recording_segments SET hold_count=? WHERE segment_id=?",
                               -1, &statement, nullptr) != SQLITE_OK) {
            return Fail(error, sqlite3_errmsg(sqlite_db_));
        }
        sqlite3_bind_int64(statement, 1, static_cast<sqlite3_int64>(next));
        BindText(statement, 2, segment_id);
        const bool ok = sqlite3_step(statement) == SQLITE_DONE &&
                        sqlite3_changes(sqlite_db_) == 1;
        if (!ok) {
            const std::string message = sqlite3_errmsg(sqlite_db_);
            sqlite3_finalize(statement);
            return Fail(error, message);
        }
        sqlite3_finalize(statement);
    }
#endif
    if (next == 0) hold_counts_.erase(segment_id);
    else hold_counts_[segment_id] = next;
    if (error != nullptr) error->clear();
    return true;
}

RecordingOrphanReport RecordingCatalog::InspectOrphans() const {
    std::lock_guard lock(mu_);
    RecordingOrphanReport report;
    std::error_code error;
    if (!std::filesystem::exists(options_.media_root, error)) return report;
    for (const auto& entry : std::filesystem::recursive_directory_iterator(options_.media_root, error)) {
        if (error || !entry.is_regular_file()) continue;
        if (entry.path().extension() != ".mp4" && entry.path().extension() != ".webm") continue;
        bool known = false;
        const auto relative = entry.path().lexically_relative(options_.media_root).generic_string();
        for (const auto& [_, path] : media_relpaths_) if (path == relative) { known = true; break; }
        if (known) continue;
        if (IsRecognizedMedia(entry.path())) { ++report.normal_orphan_count; report.normal_orphans.push_back(entry.path()); }
        else { ++report.corrupt_orphan_count; report.corrupt_orphans.push_back(entry.path()); }
    }
    return report;
}

bool RecordingCatalog::OpenSqliteLocked(std::string* error) {
#if !MEDIA_SERVER_USE_SQLITE3
    (void)error;
    return false;
#else
    std::error_code fs_error;
    if (!options_.sqlite_path.parent_path().empty()) std::filesystem::create_directories(options_.sqlite_path.parent_path(), fs_error);
    if (fs_error) return false;
    const bool existed = std::filesystem::exists(options_.sqlite_path);
    if (sqlite3_open(options_.sqlite_path.string().c_str(), &sqlite_db_) != SQLITE_OK) {
        CloseSqliteLocked();
    } else {
        sqlite3_stmt* statement = nullptr;
        bool healthy = sqlite3_prepare_v2(sqlite_db_, "PRAGMA quick_check", -1, &statement, nullptr) == SQLITE_OK;
        if (healthy && sqlite3_step(statement) == SQLITE_ROW) {
            const auto* text = sqlite3_column_text(statement, 0);
            healthy = text != nullptr && std::string(reinterpret_cast<const char*>(text)) == "ok";
        } else healthy = false;
        if (statement != nullptr) sqlite3_finalize(statement);
        if (healthy) return InitializeSqliteSchemaLocked(error);
        CloseSqliteLocked();
    }
    if (existed) {
        const auto quarantine = options_.sqlite_path.string() + ".corrupt-" + std::to_string(NowMs());
        std::filesystem::rename(options_.sqlite_path, quarantine, fs_error);
        if (fs_error) return false;
        recovery_report_.sqlite_quarantined = true;
        recovery_report_.sqlite_quarantine_path = quarantine;
    }
    if (sqlite3_open(options_.sqlite_path.string().c_str(), &sqlite_db_) != SQLITE_OK) { CloseSqliteLocked(); return false; }
    return InitializeSqliteSchemaLocked(error);
#endif
}

bool RecordingCatalog::InitializeSqliteSchemaLocked(std::string* error) {
#if !MEDIA_SERVER_USE_SQLITE3
    (void)error; return false;
#else
    const char* schema = R"SQL(
PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS recording_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS recording_mutations(mutation_id TEXT PRIMARY KEY, type TEXT NOT NULL, occurred_at_ms INTEGER NOT NULL, entity_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS recording_segments(segment_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, channel_id TEXT NOT NULL, stream_epoch_id TEXT NOT NULL, start_utc_ms INTEGER NOT NULL, end_utc_ms INTEGER NOT NULL, start_pts INTEGER NOT NULL, end_pts INTEGER NOT NULL, time_base_num INTEGER NOT NULL, time_base_den INTEGER NOT NULL, container TEXT NOT NULL, codecs_json TEXT NOT NULL, size_bytes INTEGER NOT NULL, checksum_sha256 TEXT NOT NULL, retention_class TEXT NOT NULL, lifecycle TEXT NOT NULL, pinned INTEGER NOT NULL, hold_count INTEGER NOT NULL DEFAULT 0, media_relpath TEXT NOT NULL, created_at_ms INTEGER NOT NULL, finalized_at_ms INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS recording_event_links(link_id TEXT PRIMARY KEY, event_id TEXT UNIQUE NOT NULL, channel_id TEXT NOT NULL, requested_start_ms INTEGER NOT NULL, requested_end_ms INTEGER NOT NULL, derived_segment_id TEXT, fallback_ref TEXT, completeness TEXT NOT NULL, missing_ranges_json TEXT NOT NULL, display_priority INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS recording_event_link_segments(link_id TEXT NOT NULL REFERENCES recording_event_links(link_id) ON DELETE CASCADE, segment_id TEXT NOT NULL REFERENCES recording_segments(segment_id), overlap_start_ms INTEGER NOT NULL, overlap_end_ms INTEGER NOT NULL, PRIMARY KEY(link_id, segment_id));
CREATE TABLE IF NOT EXISTS recording_observations(observation_id TEXT PRIMARY KEY, channel_id TEXT NOT NULL, segment_id TEXT NOT NULL REFERENCES recording_segments(segment_id), utc_ms INTEGER NOT NULL, pts INTEGER NOT NULL, track_id TEXT, class_id TEXT, class_name TEXT, confidence REAL, bbox_json TEXT, event_id TEXT, selection_reason TEXT, payload_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS recording_tombstones(entity_id TEXT PRIMARY KEY, entity_kind TEXT NOT NULL, channel_id TEXT, start_utc_ms INTEGER, end_utc_ms INTEGER, deleted_at_ms INTEGER, reason TEXT, retention_class TEXT, checksum_sha256 TEXT);
CREATE INDEX IF NOT EXISTS idx_recording_segments_channel_range ON recording_segments(channel_id,start_utc_ms,end_utc_ms);
CREATE INDEX IF NOT EXISTS idx_recording_segments_retention_end ON recording_segments(retention_class,end_utc_ms);
CREATE INDEX IF NOT EXISTS idx_recording_observations_channel_time_track ON recording_observations(channel_id,utc_ms,track_id);
CREATE INDEX IF NOT EXISTS idx_recording_event_links_event ON recording_event_links(event_id);
INSERT OR REPLACE INTO recording_meta(key,value) VALUES('schema_version','1');
)SQL";
    return Exec(sqlite_db_, schema, error);
#endif
}

bool RecordingCatalog::RebuildSqliteLocked(std::string* error) {
#if !MEDIA_SERVER_USE_SQLITE3
    (void)error; return true;
#else
    if (!Exec(sqlite_db_, "BEGIN; DELETE FROM recording_event_link_segments; DELETE FROM recording_event_links; DELETE FROM recording_observations; DELETE FROM recording_segments; DELETE FROM recording_tombstones; DELETE FROM recording_mutations; COMMIT;", error)) return false;
    const auto replay = journal_.Replay();
    for (const auto& mutation : replay.mutations) if (!ProjectMutationSqliteLocked(mutation, error)) return false;
    return true;
#endif
}

bool RecordingCatalog::ProjectMutationSqliteLocked(const RecordingMutationV1& mutation, std::string* error) {
#if !MEDIA_SERVER_USE_SQLITE3
    (void)mutation; (void)error; return true;
#else
    if (!Exec(sqlite_db_, "BEGIN", error)) return false;
    sqlite3_stmt* statement = nullptr;
    if (sqlite3_prepare_v2(sqlite_db_, "INSERT OR IGNORE INTO recording_mutations VALUES(?,?,?,?)", -1, &statement, nullptr) != SQLITE_OK) { Exec(sqlite_db_, "ROLLBACK", nullptr); return Fail(error, sqlite3_errmsg(sqlite_db_)); }
    BindText(statement, 1, mutation.mutation_id); BindText(statement, 2, RecordingMutationTypeName(mutation.mutation_type));
    sqlite3_bind_int64(statement, 3, mutation.occurred_at_ms); BindText(statement, 4, mutation.entity_id);
    const int mutation_step = sqlite3_step(statement);
    const bool inserted = mutation_step == SQLITE_DONE && sqlite3_changes(sqlite_db_) > 0;
    const std::string mutation_error =
        mutation_step == SQLITE_DONE ? std::string() : sqlite3_errmsg(sqlite_db_);
    sqlite3_finalize(statement);
    if (mutation_step != SQLITE_DONE) {
        Exec(sqlite_db_, "ROLLBACK", nullptr);
        return Fail(error, mutation_error);
    }
    if (!inserted) return Exec(sqlite_db_, "COMMIT", error);
    if (mutation.mutation_type == RecordingMutationType::SegmentFinalized) {
        const auto segment_json = ObjectField(mutation.payload_json, "segment");
        const auto relpath = StringField(mutation.payload_json, "mediaRelpath");
        RecordingSegmentV1 s;
        if (!segment_json || !relpath || !ParseRecordingSegmentV1(*segment_json, &s, error)) { Exec(sqlite_db_, "ROLLBACK", nullptr); return false; }
        const char* sql = "INSERT OR REPLACE INTO recording_segments VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?)";
        if (sqlite3_prepare_v2(sqlite_db_, sql, -1, &statement, nullptr) != SQLITE_OK) { Exec(sqlite_db_, "ROLLBACK", nullptr); return Fail(error, sqlite3_errmsg(sqlite_db_)); }
        int i=1; BindText(statement,i++,s.segment_id); BindText(statement,i++,s.source_id); BindText(statement,i++,s.channel_id); BindText(statement,i++,s.stream_epoch_id);
        sqlite3_bind_int64(statement,i++,s.start.utc_ms); sqlite3_bind_int64(statement,i++,s.end.utc_ms); sqlite3_bind_int64(statement,i++,s.start.pts); sqlite3_bind_int64(statement,i++,s.end.pts); sqlite3_bind_int(statement,i++,s.start.time_base_num); sqlite3_bind_int(statement,i++,s.start.time_base_den);
        BindText(statement,i++,s.container); BindText(statement,i++,SerializeRecordingSegmentV1(s)); sqlite3_bind_int64(statement,i++,static_cast<sqlite3_int64>(s.size_bytes)); BindText(statement,i++,s.checksum_sha256); BindText(statement,i++,RetentionName(s.retention_class)); BindText(statement,i++,LifecycleName(s.lifecycle)); sqlite3_bind_int(statement,i++,s.pinned?1:0); BindText(statement,i++,*relpath); sqlite3_bind_int64(statement,i++,s.created_at_ms); sqlite3_bind_int64(statement,i++,s.finalized_at_ms);
        if (sqlite3_step(statement) != SQLITE_DONE) { const std::string message=sqlite3_errmsg(sqlite_db_); sqlite3_finalize(statement); Exec(sqlite_db_, "ROLLBACK", nullptr); return Fail(error,message); }
        sqlite3_finalize(statement);
    } else if (mutation.mutation_type == RecordingMutationType::EventLinkCreated) {
        const auto link_json=ObjectField(mutation.payload_json,"link"); EventRecordingLinkV1 link;
        if(!link_json||!ParseEventRecordingLinkV1(*link_json,&link,error)){Exec(sqlite_db_,"ROLLBACK",nullptr);return false;}
        const char* sql="INSERT OR REPLACE INTO recording_event_links VALUES(?,?,?,?,?,?,?,?,?,0)";
        sqlite3_prepare_v2(sqlite_db_,sql,-1,&statement,nullptr); int i=1; BindText(statement,i++,link.link_id); BindText(statement,i++,link.event_id); BindText(statement,i++,link.channel_id); sqlite3_bind_int64(statement,i++,link.requested_range.start_ms); sqlite3_bind_int64(statement,i++,link.requested_range.end_ms); BindText(statement,i++,link.derived_segment_id.value_or("")); BindText(statement,i++,link.fallback_evidence_id.value_or("")); BindText(statement,i++,EventStatusName(link.status)); BindText(statement,i++,SerializeEventRecordingLinkV1(link));
        if(sqlite3_step(statement)!=SQLITE_DONE){const std::string message=sqlite3_errmsg(sqlite_db_);sqlite3_finalize(statement);Exec(sqlite_db_,"ROLLBACK",nullptr);return Fail(error,message);} sqlite3_finalize(statement);
        for(const auto& overlap:link.ordered_overlaps){sqlite3_prepare_v2(sqlite_db_,"INSERT INTO recording_event_link_segments VALUES(?,?,?,?)",-1,&statement,nullptr);BindText(statement,1,link.link_id);BindText(statement,2,overlap.segment_id);sqlite3_bind_int64(statement,3,overlap.range.start_ms);sqlite3_bind_int64(statement,4,overlap.range.end_ms);if(sqlite3_step(statement)!=SQLITE_DONE){const std::string message=sqlite3_errmsg(sqlite_db_);sqlite3_finalize(statement);Exec(sqlite_db_,"ROLLBACK",nullptr);return Fail(error,message);}sqlite3_finalize(statement);}
    } else if (mutation.mutation_type == RecordingMutationType::ObservationPut) {
        const auto observation_json = ObjectField(mutation.payload_json, "observation");
        AnalysisObservationV1 observation;
        if (!observation_json || !ParseAnalysisObservationV1(*observation_json, &observation, error)) {
            Exec(sqlite_db_, "ROLLBACK", nullptr); return false;
        }
        const char* sql = "INSERT OR REPLACE INTO recording_observations VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)";
        if (sqlite3_prepare_v2(sqlite_db_, sql, -1, &statement, nullptr) != SQLITE_OK) {
            Exec(sqlite_db_, "ROLLBACK", nullptr); return Fail(error, sqlite3_errmsg(sqlite_db_));
        }
        int i = 1;
        BindText(statement, i++, observation.observation_id);
        BindText(statement, i++, observation.channel_id);
        BindText(statement, i++, observation.frame_locator.segment_id);
        sqlite3_bind_int64(statement, i++, observation.frame_locator.frame.utc_ms);
        sqlite3_bind_int64(statement, i++, observation.frame_locator.frame.pts);
        BindText(statement, i++, observation.track_id);
        BindText(statement, i++, observation.class_label);
        BindText(statement, i++, observation.class_label);
        sqlite3_bind_double(statement, i++, observation.confidence);
        std::ostringstream bbox;
        bbox << "{\"x\":" << observation.bbox.x << ",\"y\":" << observation.bbox.y
             << ",\"width\":" << observation.bbox.width << ",\"height\":"
             << observation.bbox.height << "}";
        BindText(statement, i++, bbox.str());
        BindText(statement, i++, observation.event_ids.empty() ? "" : observation.event_ids.front());
        BindText(statement, i++, observation.selection_reason);
        BindText(statement, i++, *observation_json);
        if (sqlite3_step(statement) != SQLITE_DONE) {
            const std::string message = sqlite3_errmsg(sqlite_db_);
            sqlite3_finalize(statement); Exec(sqlite_db_, "ROLLBACK", nullptr); return Fail(error, message);
        }
        sqlite3_finalize(statement);
    } else if (mutation.mutation_type == RecordingMutationType::DeletionRequested) {
        if (sqlite3_prepare_v2(sqlite_db_,
                               "UPDATE recording_segments SET lifecycle='deletion_pending' WHERE segment_id=?",
                               -1, &statement, nullptr) != SQLITE_OK) {
            Exec(sqlite_db_, "ROLLBACK", nullptr); return Fail(error, sqlite3_errmsg(sqlite_db_));
        }
        BindText(statement, 1, mutation.entity_id);
        if (sqlite3_step(statement) != SQLITE_DONE || sqlite3_changes(sqlite_db_) != 1) {
            sqlite3_finalize(statement); Exec(sqlite_db_, "ROLLBACK", nullptr);
            return Fail(error, "SQLite 삭제 요청 대상 segment가 없음");
        }
        sqlite3_finalize(statement);
    } else if (mutation.mutation_type == RecordingMutationType::DeletionCompleted) {
        const auto tombstone_json = ObjectField(mutation.payload_json, "tombstone");
        RecordingTombstoneV1 tombstone;
        if (!tombstone_json || !ParseRecordingTombstoneV1(*tombstone_json, &tombstone, error)) {
            Exec(sqlite_db_, "ROLLBACK", nullptr); return false;
        }
        const char* sql = "INSERT OR REPLACE INTO recording_tombstones VALUES(?,?,?,?,?,?,?,?,?)";
        if (sqlite3_prepare_v2(sqlite_db_, sql, -1, &statement, nullptr) != SQLITE_OK) {
            Exec(sqlite_db_, "ROLLBACK", nullptr); return Fail(error, sqlite3_errmsg(sqlite_db_));
        }
        BindText(statement, 1, tombstone.segment_id);
        BindText(statement, 2, "segment");
        BindText(statement, 3, tombstone.channel_id);
        sqlite3_bind_int64(statement, 4, tombstone.recorded_range.start_ms);
        sqlite3_bind_int64(statement, 5, tombstone.recorded_range.end_ms);
        sqlite3_bind_int64(statement, 6, tombstone.deleted_at_ms);
        BindText(statement, 7, tombstone.deletion_reason);
        BindText(statement, 8, RetentionName(tombstone.retention_class));
        BindText(statement, 9, tombstone.checksum_sha256);
        if (sqlite3_step(statement) != SQLITE_DONE) {
            const std::string message = sqlite3_errmsg(sqlite_db_);
            sqlite3_finalize(statement); Exec(sqlite_db_, "ROLLBACK", nullptr); return Fail(error, message);
        }
        sqlite3_finalize(statement);
        sqlite3_prepare_v2(sqlite_db_,
                           "UPDATE recording_segments SET lifecycle='deleted', media_relpath='' WHERE segment_id=?",
                           -1, &statement, nullptr);
        BindText(statement, 1, tombstone.segment_id);
        if (sqlite3_step(statement) != SQLITE_DONE) {
            const std::string message = sqlite3_errmsg(sqlite_db_);
            sqlite3_finalize(statement); Exec(sqlite_db_, "ROLLBACK", nullptr); return Fail(error, message);
        }
        sqlite3_finalize(statement);
    }
    return Exec(sqlite_db_, "COMMIT", error);
#endif
}

void RecordingCatalog::CloseSqliteLocked() {
#if MEDIA_SERVER_USE_SQLITE3
    if (sqlite_db_ != nullptr) sqlite3_close(sqlite_db_);
#endif
    sqlite_db_ = nullptr;
}

}  // namespace recording
