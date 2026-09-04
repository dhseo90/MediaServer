// 파일 요약: EventStorage 이벤트를 상시녹화 segment와 안전하게 연결한다.
// 동작 요약: 추정 없는 시간축 변환, keyed 비동기 job, source/output hold와 quota를 조정한다.
#include "recording/event_recording_bridge.h"

#include <algorithm>
#include <array>
#include <chrono>
#include <iomanip>
#include <limits>
#include <set>
#include <sstream>
#include <thread>

#ifndef MEDIA_SERVER_USE_OPENSSL
#define MEDIA_SERVER_USE_OPENSSL 0
#endif

#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#endif

namespace recording {
namespace {

std::int64_t SystemNowMs() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
               std::chrono::system_clock::now().time_since_epoch())
        .count();
}

std::string StableToken(const std::string& value) {
#if !MEDIA_SERVER_USE_OPENSSL
    (void)value;
    return {};
#else
    EVP_MD_CTX* context = EVP_MD_CTX_new();
    if (context == nullptr) return {};
    std::array<unsigned char, EVP_MAX_MD_SIZE> digest{};
    unsigned int digest_size = 0;
    const bool ok = EVP_DigestInit_ex(context, EVP_sha256(), nullptr) == 1 &&
                    EVP_DigestUpdate(context, value.data(), value.size()) == 1 &&
                    EVP_DigestFinal_ex(context, digest.data(), &digest_size) == 1;
    EVP_MD_CTX_free(context);
    if (!ok || digest_size != 32) return {};
    std::ostringstream output;
    output << std::hex << std::setfill('0');
    for (unsigned int index = 0; index < digest_size; ++index) {
        output << std::setw(2) << static_cast<unsigned int>(digest[index]);
    }
    return output.str();
#endif
}

std::int64_t ClampInt64(__int128 value) {
    if (value > static_cast<__int128>(std::numeric_limits<std::int64_t>::max())) {
        return std::numeric_limits<std::int64_t>::max();
    }
    if (value < static_cast<__int128>(std::numeric_limits<std::int64_t>::min())) {
        return std::numeric_limits<std::int64_t>::min();
    }
    return static_cast<std::int64_t>(value);
}

std::int64_t SaturatingAdd(std::int64_t value, std::int64_t delta) {
    return ClampInt64(static_cast<__int128>(value) + static_cast<__int128>(delta));
}

std::int64_t SaturatingOffset(std::int64_t anchor,
                              std::int64_t value,
                              std::int64_t reference) {
    return ClampInt64(static_cast<__int128>(anchor) + value - reference);
}

std::uint64_t SaturatingAddBytes(std::uint64_t lhs, std::uint64_t rhs) {
    if (rhs > std::numeric_limits<std::uint64_t>::max() - lhs) {
        return std::numeric_limits<std::uint64_t>::max();
    }
    return lhs + rhs;
}

bool BuildRequestedRanges(const analysis::EventRecord& record,
                          const analysis::EventMediaHookOptions& options,
                          std::optional<UtcRangeV1>* utc_range,
                          std::optional<UtcRangeV1>* media_pts_range,
                          std::string* reason) {
    if (utc_range == nullptr || media_pts_range == nullptr) return false;
    utc_range->reset();
    media_pts_range->reset();
    const std::int64_t event_start = record.start_time_ms > 0
                                         ? record.start_time_ms
                                         : record.update_time_ms;
    const std::int64_t event_end = record.end_time_ms > event_start
                                       ? record.end_time_ms
                                       : record.update_time_ms;
    if (event_start < 0 || event_end < event_start) {
        if (reason != nullptr) *reason = "event-time-invalid";
        return false;
    }
    const std::int64_t padded_start =
        SaturatingAdd(event_start, -std::max(0, options.pre_event_ms));
    const std::int64_t padded_end =
        SaturatingAdd(event_end, std::max(0, options.post_event_ms));
    if (padded_start >= padded_end) {
        if (reason != nullptr) *reason = "event-range-invalid";
        return false;
    }
    if (record.time_basis == "utc-ms") {
        if (padded_start <= 0) {
            if (reason != nullptr) *reason = "event-time-invalid";
            return false;
        }
        *utc_range = UtcRangeV1{padded_start, padded_end};
    } else if (record.time_basis == "media-pts-ms") {
        if (record.time_anchor_utc_ms > 0) {
            const std::int64_t start = SaturatingOffset(
                record.time_anchor_utc_ms, padded_start, record.time_anchor_pts_ms);
            const std::int64_t end = SaturatingOffset(
                record.time_anchor_utc_ms, padded_end, record.time_anchor_pts_ms);
            if (start <= 0 || start >= end) {
                if (reason != nullptr) *reason = "event-range-invalid";
                return false;
            }
            *utc_range = UtcRangeV1{start, end};
        } else {
            *media_pts_range = UtcRangeV1{padded_start, padded_end};
        }
    } else {
        if (reason != nullptr) *reason = "time-basis-unsupported";
        return false;
    }
    if (reason != nullptr) reason->clear();
    return true;
}

bool MediaTimeToMilliseconds(const MediaTimeV1& value, std::int64_t* output) {
    if (output == nullptr || value.time_base_num <= 0 || value.time_base_den <= 0) return false;
    const __int128 numerator = static_cast<__int128>(value.pts) * value.time_base_num * 1000;
    const __int128 milliseconds = numerator / value.time_base_den;
    if (milliseconds > std::numeric_limits<std::int64_t>::max() ||
        milliseconds < std::numeric_limits<std::int64_t>::min()) return false;
    *output = static_cast<std::int64_t>(milliseconds);
    return true;
}

bool MapPtsBoundary(const RecordingSegmentV1& segment,
                    std::int64_t target_pts_ms,
                    bool end_boundary,
                    std::int64_t* utc_ms) {
    std::int64_t start_pts_ms = 0;
    std::int64_t end_pts_ms = 0;
    if (!MediaTimeToMilliseconds(segment.start, &start_pts_ms) ||
        !MediaTimeToMilliseconds(segment.end, &end_pts_ms) ||
        start_pts_ms >= end_pts_ms) return false;
    const bool contained = end_boundary
                               ? target_pts_ms > start_pts_ms && target_pts_ms <= end_pts_ms
                               : target_pts_ms >= start_pts_ms && target_pts_ms < end_pts_ms;
    if (!contained) return false;
    *utc_ms = SaturatingOffset(segment.start.utc_ms, target_pts_ms, start_pts_ms);
    return true;
}

bool ResolveMediaPtsFromSegments(const RetentionSnapshot& snapshot,
                                 const std::string& channel_id,
                                 const std::string& preferred_epoch,
                                 const UtcRangeV1& media_pts_range,
                                 UtcRangeV1* requested_range,
                                 std::string* resolved_epoch) {
    if (requested_range == nullptr || resolved_epoch == nullptr) return false;
    std::set<std::string> epochs;
    for (const auto& candidate : snapshot.candidates) {
        const auto& segment = candidate.segment;
        if (segment.channel_id == channel_id &&
            segment.lifecycle == RecordingLifecycle::Finalized &&
            segment.retention_class == RecordingRetentionClass::Continuous &&
            (preferred_epoch.empty() || segment.stream_epoch_id == preferred_epoch)) {
            epochs.insert(segment.stream_epoch_id);
        }
    }
    std::optional<std::pair<UtcRangeV1, std::string>> resolved;
    for (const auto& epoch : epochs) {
        std::optional<std::int64_t> start_utc;
        std::optional<std::int64_t> end_utc;
        for (const auto& candidate : snapshot.candidates) {
            const auto& segment = candidate.segment;
            if (segment.channel_id != channel_id || segment.stream_epoch_id != epoch ||
                segment.lifecycle != RecordingLifecycle::Finalized ||
                segment.retention_class != RecordingRetentionClass::Continuous) continue;
            std::int64_t mapped = 0;
            if (!start_utc.has_value() &&
                MapPtsBoundary(segment, media_pts_range.start_ms, false, &mapped)) start_utc = mapped;
            if (!end_utc.has_value() &&
                MapPtsBoundary(segment, media_pts_range.end_ms, true, &mapped)) end_utc = mapped;
        }
        if (!start_utc.has_value() || !end_utc.has_value() || *start_utc >= *end_utc) continue;
        if (resolved.has_value()) return false;
        resolved = std::make_pair(UtcRangeV1{*start_utc, *end_utc}, epoch);
    }
    if (!resolved.has_value()) return false;
    *requested_range = resolved->first;
    *resolved_epoch = resolved->second;
    return true;
}

std::vector<UtcRangeV1> MissingRanges(
    const UtcRangeV1& requested,
    const std::vector<SegmentOverlapV1>& overlaps) {
    std::vector<UtcRangeV1> missing;
    std::int64_t cursor = requested.start_ms;
    for (const auto& overlap : overlaps) {
        if (overlap.range.end_ms <= cursor) continue;
        if (overlap.range.start_ms > cursor) missing.push_back({cursor, overlap.range.start_ms});
        cursor = std::max(cursor, overlap.range.end_ms);
        if (cursor >= requested.end_ms) break;
    }
    if (cursor < requested.end_ms) missing.push_back({cursor, requested.end_ms});
    return missing;
}

analysis::EventRecordingBridgeResult ToResult(const EventRecordingLinkV1& link,
                                               const std::string& clip_path = {}) {
    analysis::EventRecordingBridgeResult result;
    result.handled = true;
    result.link_id = link.link_id;
    result.clip_path = clip_path;
    result.error = link.completeness_reason;
    result.derived_clip_ready = link.status == EventRecordingLinkStatus::Complete &&
                                !clip_path.empty();
    if (!link.requested_range.has_value() && link.media_pts_range_ms.has_value()) {
        result.completeness = "time-basis-ambiguous";
    } else if (link.status == EventRecordingLinkStatus::Complete) result.completeness = "complete";
    else if (link.status == EventRecordingLinkStatus::Partial) result.completeness = "partial";
    else if (link.status == EventRecordingLinkStatus::Failed) result.completeness = "failed";
    else result.completeness = "pending";
    return result;
}

bool HasPositiveHold(const RetentionSnapshot& snapshot, const std::string& segment_id) {
    for (const auto& candidate : snapshot.candidates) {
        if (candidate.segment.segment_id == segment_id) return candidate.hold_count > 0;
    }
    return false;
}

EventSourceLease HeldSourceLeaseForLink(const RetentionSnapshot& snapshot,
                                        const EventRecordingLinkV1& link) {
    EventSourceLease lease;
    std::unordered_set<std::string> required;
    for (const auto& overlap : link.ordered_overlaps) required.insert(overlap.segment_id);
    for (const auto& candidate : snapshot.candidates) {
        if (required.find(candidate.segment.segment_id) != required.end() &&
            candidate.hold_count > 0) {
            lease.sources.push_back(candidate);
        }
    }
    return lease;
}

bool IsTerminalReleaseStage(const std::string& reason) {
    return reason == "event-terminal-release-recovery-pending" ||
           reason == "event-terminal-output-release-pending" ||
           reason == "event-terminal-source-release-pending" ||
           reason == "event-terminal-reservation-release-pending" ||
           reason == "event-terminal-complete-commit-pending";
}

bool IsResourceRecoveryStage(const std::string& reason) {
    return IsTerminalReleaseStage(reason) ||
           reason == "event-catalog-finalize-recovery-pending" ||
           reason == "event-marker-cleanup-recovery-pending" ||
           reason == "event-cleanup-recovery-pending";
}

void MergeRange(std::optional<UtcRangeV1>* target, const UtcRangeV1& added) {
    if (!target->has_value()) *target = added;
    else {
        (*target)->start_ms = std::min((*target)->start_ms, added.start_ms);
        (*target)->end_ms = std::max((*target)->end_ms, added.end_ms);
    }
}

}  // namespace

struct CatalogEventRecordingBridge::PendingJob {
    std::string event_id;
    std::int64_t ready_at_ms{0};
};

CatalogEventRecordingBridge::CatalogEventRecordingBridge(
    RecordingCatalog& catalog,
    RetentionCoordinator& retention,
    EventClipDeriver& deriver,
    Options options)
    : catalog_(catalog), retention_(retention), deriver_(deriver), options_(std::move(options)) {
    if (!options_.now_ms) options_.now_ms = SystemNowMs;
    if (!options_.remove_media_file) {
        options_.remove_media_file = [](const std::filesystem::path& root,
                                        const std::filesystem::path& path,
                                        std::string* error) {
            return RemoveContainedMediaFile(root, path, error);
        };
    }
    if (!options_.terminal_release_guard) {
        options_.terminal_release_guard = [](std::string*) { return true; };
    }
    options_.mapping_retry_ms = std::max<std::int64_t>(1, options_.mapping_retry_ms);
    options_.max_pending_jobs = std::max<std::size_t>(1, options_.max_pending_jobs);
    RefillPendingJobs();
    worker_ = std::thread([this] { WorkerLoop(); });
}

CatalogEventRecordingBridge::~CatalogEventRecordingBridge() { StopAndDrain(); }

analysis::EventRecordingBridgeResult CatalogEventRecordingBridge::TryResolve(
    const analysis::AnalysisResult& result,
    const analysis::EventRecord& record,
    const analysis::EventMediaHookOptions& options) {
    std::lock_guard resolution_lock(resolution_mu_);
    if (record.event_id.empty() || record.channel_id.empty()) {
        return {false, false, {}, {}, {}, "event/channel ID가 비어 있음"};
    }
    analysis::EventRecord effective = record;
    if (effective.time_basis.empty()) effective.time_basis = result.context.event_time_basis;
    if (effective.time_anchor_utc_ms <= 0 && result.context.event_anchor_utc_ms > 0) {
        effective.time_anchor_utc_ms = result.context.event_anchor_utc_ms;
        effective.time_anchor_pts_ms = result.context.event_anchor_pts_ms;
    }
    if (effective.stream_epoch_id.empty()) effective.stream_epoch_id = result.context.event_stream_epoch_id;
    const std::string token = StableToken(effective.event_id);
    if (token.empty()) return {false, false, {}, {}, {}, "SHA-256 event ID 생성기를 사용할 수 없음"};
    const std::string link_id = "event-link-sha256-" + token;
    std::optional<UtcRangeV1> latest_utc;
    std::optional<UtcRangeV1> latest_pts;
    std::string range_reason;
    const bool range_valid = BuildRequestedRanges(
        effective, options, &latest_utc, &latest_pts, &range_reason);
    const auto existing = catalog_.FindEventLinkByEventId(effective.event_id);
    if (existing.has_value()) {
        if (latest_pts.has_value()) {
            UtcRangeV1 mapped;
            std::string epoch;
            const auto& preferred_epoch = existing->stream_epoch_id.empty()
                                              ? effective.stream_epoch_id : existing->stream_epoch_id;
            if (ResolveMediaPtsFromSegments(catalog_.RetentionSnapshot(), existing->channel_id,
                                             preferred_epoch, *latest_pts, &mapped, &epoch)) {
                latest_utc = mapped;
                latest_pts.reset();
                effective.stream_epoch_id = epoch;
            }
        }
        if (existing->status == EventRecordingLinkStatus::Pending &&
            IsResourceRecoveryStage(existing->completeness_reason)) {
            auto updated = *existing;
            if (range_valid && latest_utc.has_value() && updated.requested_range.has_value()) {
                auto deferred = updated.deferred_requested_range.value_or(*updated.requested_range);
                deferred.start_ms = std::min(deferred.start_ms, latest_utc->start_ms);
                deferred.end_ms = std::max(deferred.end_ms, latest_utc->end_ms);
                if (deferred.start_ms < updated.requested_range->start_ms ||
                    deferred.end_ms > updated.requested_range->end_ms) {
                    updated.deferred_requested_range = deferred;
                    updated.updated_at_ms = options_.now_ms();
                    if (catalog_.PutEventLink(updated, nullptr)) return ToResult(updated);
                }
            }
            if (latest_pts.has_value() && updated.requested_range.has_value()) {
                MergeRange(&updated.deferred_media_pts_range_ms, *latest_pts);
                updated.updated_at_ms = options_.now_ms();
                if (catalog_.PutEventLink(updated, nullptr)) return ToResult(updated);
            }
            return ToResult(*existing);
        }
        if (existing->status == EventRecordingLinkStatus::Complete &&
            existing->derived_segment_id.has_value()) {
            const bool extends_existing = latest_pts.has_value() || (latest_utc.has_value() &&
                existing->requested_range.has_value() &&
                (latest_utc->start_ms < existing->requested_range->start_ms ||
                 latest_utc->end_ms > existing->requested_range->end_ms));
            if (!extends_existing) {
                const auto path = catalog_.FindSegmentMediaPath(*existing->derived_segment_id);
                if (path.has_value()) return ToResult(*existing, path->string());
            }
        }
        if (!range_valid) return ToResult(*existing);
        auto updated = *existing;
        if (latest_utc.has_value()) {
            if (updated.requested_range.has_value()) {
                updated.requested_range->start_ms =
                    std::min(updated.requested_range->start_ms, latest_utc->start_ms);
                updated.requested_range->end_ms =
                    std::max(updated.requested_range->end_ms, latest_utc->end_ms);
            } else updated.requested_range = latest_utc;
            updated.media_pts_range_ms.reset();
        } else if (updated.requested_range.has_value() && latest_pts.has_value()) {
            MergeRange(&updated.deferred_media_pts_range_ms, *latest_pts);
        } else if (!updated.requested_range.has_value()) {
            if (updated.media_pts_range_ms.has_value()) {
                updated.media_pts_range_ms->start_ms =
                    std::min(updated.media_pts_range_ms->start_ms, latest_pts->start_ms);
                updated.media_pts_range_ms->end_ms =
                    std::max(updated.media_pts_range_ms->end_ms, latest_pts->end_ms);
            } else updated.media_pts_range_ms = latest_pts;
        }
        if (!effective.stream_epoch_id.empty()) updated.stream_epoch_id = effective.stream_epoch_id;
        updated.ordered_overlaps.clear();
        updated.missing_ranges.clear();
        updated.derived_segment_id.reset();
        updated.derived_actual_range.reset();
        updated.derivation_mode.clear();
        updated.status = EventRecordingLinkStatus::Pending;
        updated.completeness_reason = updated.requested_range.has_value()
                                          ? "pending-finalized-segments"
                                          : "time-basis-awaiting-segment-map";
        updated.updated_at_ms = options_.now_ms();
        std::string update_error;
        if (catalog_.PutEventLink(updated, &update_error)) {
            {
                std::lock_guard lock(mu_);
                deferred_until_restart_.erase(effective.event_id);
            }
            const std::int64_t ready_at = updated.requested_range.has_value()
                                              ? std::max(options_.now_ms(), SaturatingAdd(
                                                    updated.requested_range->end_ms,
                                                    options_.finalization_grace_ms))
                                              : options_.now_ms();
            Enqueue({effective.event_id, ready_at});
            return ToResult(updated);
        }
        return ToResult(*existing);
    }
    if (!range_valid) return {false, false, {}, {}, {}, range_reason};
    if (options_.resolve_recording_channel) {
        const auto& stream_key = !effective.stream_id.empty() ? effective.stream_id
            : (!result.source_key.empty() ? result.source_key : effective.channel_id);
        const auto channel = options_.resolve_recording_channel(stream_key);
        if (!channel.has_value() || channel->empty()) {
            return {false, false, {}, {}, {}, "활성 녹화 채널 매핑이 없거나 모호함"};
        }
        // 원본 EventRecord와 shared stream 정체성은 보존하고 catalog용 복사본만 변환한다.
        effective.channel_id = *channel;
        effective.stream_id = *channel;
    }
    EventRecordingLinkV1 link;
    link.link_id = link_id;
    link.event_id = effective.event_id;
    link.source_id = effective.stream_id.empty() ? effective.channel_id : effective.stream_id;
    link.channel_id = effective.channel_id;
    link.stream_epoch_id = effective.stream_epoch_id;
    link.time_basis = effective.time_basis;
    link.requested_range = latest_utc;
    link.media_pts_range_ms = latest_pts;
    link.status = EventRecordingLinkStatus::Pending;
    link.completeness_reason = link.requested_range.has_value()
                                   ? "pending-finalized-segments"
                                   : "time-basis-awaiting-segment-map";
    link.created_at_ms = options_.now_ms();
    link.updated_at_ms = link.created_at_ms;
    std::string error;
    if (!catalog_.PutEventLink(link, &error)) return {false, false, {}, {}, {}, error};
    const std::int64_t ready_at = link.requested_range.has_value()
                                      ? std::max(options_.now_ms(), SaturatingAdd(
                                            link.requested_range->end_ms,
                                            options_.finalization_grace_ms))
                                      : options_.now_ms();
    Enqueue({effective.event_id, ready_at});
    return ToResult(link);
}

void CatalogEventRecordingBridge::RecordFallback(
    const analysis::EventRecord& record,
    const analysis::EventRecordingBridgeResult& previous) {
    std::lock_guard resolution_lock(resolution_mu_);
    if (!previous.handled || previous.link_id.empty() || record.clip_path.empty()) return;
    const auto existing = catalog_.FindEventLinkByEventId(record.event_id);
    if (!existing.has_value() || existing->link_id != previous.link_id ||
        existing->status == EventRecordingLinkStatus::Complete) return;
    const std::string token = StableToken(record.event_id);
    if (token.empty()) return;
    std::error_code path_error;
    const auto locator = std::filesystem::absolute(record.clip_path, path_error).lexically_normal();
    if (path_error || locator.empty() || !std::filesystem::is_regular_file(locator, path_error) ||
        path_error) return;
    auto link = *existing;
    link.fallback_evidence_id = "fallback-sha256-" + token;
    link.fallback_media_locator = locator.string();
    if (link.status == EventRecordingLinkStatus::Pending &&
        !IsResourceRecoveryStage(link.completeness_reason)) {
        link.completeness_reason = "pending-with-provisional-frame-buffer-fallback";
    } else if (link.status == EventRecordingLinkStatus::Partial) {
        link.completeness_reason = "partial-with-frame-buffer-fallback";
    } else if (link.status == EventRecordingLinkStatus::Failed) {
        link.completeness_reason = "failed-with-frame-buffer-fallback";
    }
    link.updated_at_ms = options_.now_ms();
    catalog_.PutEventLink(link, nullptr);
}

void CatalogEventRecordingBridge::Enqueue(PendingJob job,
                                          bool preserve_existing_schedule) {
    std::lock_guard lock(mu_);
    if (stopping_ || job.event_id.empty() ||
        deferred_until_restart_.find(job.event_id) != deferred_until_restart_.end()) return;
    const auto existing = jobs_.find(job.event_id);
    if (existing != jobs_.end()) {
        if (!preserve_existing_schedule) {
            existing->second->ready_at_ms =
                std::max(existing->second->ready_at_ms, job.ready_at_ms);
        }
        cv_.notify_all();
        return;
    }
    if (jobs_.size() >= options_.max_pending_jobs) return;
    jobs_[job.event_id] = std::make_shared<PendingJob>(std::move(job));
    cv_.notify_one();
}

void CatalogEventRecordingBridge::RefillPendingJobs() {
    const auto pending = catalog_.ListEventLinks(EventRecordingLinkStatus::Pending);
    for (const auto& link : pending) {
        std::int64_t ready_at = options_.now_ms();
        if (link.requested_range.has_value() &&
            link.completeness_reason != "event-catalog-finalize-recovery-pending") {
            ready_at = std::max(ready_at, SaturatingAdd(
                link.requested_range->end_ms, options_.finalization_grace_ms));
        }
        Enqueue({link.event_id, ready_at}, true);
    }
}

bool CatalogEventRecordingBridge::ReleaseTerminalResources(
    EventRecordingLinkV1* link,
    const std::string& output_segment_id,
    std::uint64_t actual_size_bytes,
    std::string* error) {
    if (link == nullptr) {
        if (error != nullptr) *error = "terminal link가 비어 있음";
        return false;
    }
    if (!options_.terminal_release_guard(error)) return false;
    if (link->completeness_reason == "event-terminal-release-recovery-pending") {
        link->completeness_reason = "event-terminal-output-release-pending";
    }
    if (link->completeness_reason == "event-terminal-output-release-pending") {
        auto next = *link;
        next.completeness_reason = "event-terminal-source-release-pending";
        next.updated_at_ms = options_.now_ms();
        if (!catalog_.PutEventLink(next, error)) return false;
        const auto snapshot = catalog_.RetentionSnapshot();
        if (HasPositiveHold(snapshot, output_segment_id) &&
            !catalog_.AdjustHoldCount(output_segment_id, -1, error)) {
            if (!catalog_.PutEventLink(*link, nullptr)) {
                std::lock_guard lock(mu_);
                deferred_until_restart_.insert(link->event_id);
            }
            return false;
        }
        *link = std::move(next);
    }
    if (link->completeness_reason == "event-terminal-source-release-pending") {
        auto next = *link;
        next.completeness_reason = "event-terminal-reservation-release-pending";
        next.updated_at_ms = options_.now_ms();
        if (!catalog_.PutEventLink(next, error)) return false;
        const auto source_lease = HeldSourceLeaseForLink(
            catalog_.RetentionSnapshot(), *link);
        if (!source_lease.sources.empty() &&
            !catalog_.ReleaseEventSourceLease(source_lease, error)) {
            if (!catalog_.PutEventLink(*link, nullptr)) {
                std::lock_guard lock(mu_);
                deferred_until_restart_.insert(link->event_id);
            }
            return false;
        }
        *link = std::move(next);
    }
    if (link->completeness_reason == "event-terminal-reservation-release-pending") {
        const std::string token = StableToken(link->event_id);
        if (token.empty()) {
            if (error != nullptr) *error = "event reservation ID 생성 실패";
            return false;
        }
        auto next = *link;
        next.completeness_reason = "event-terminal-complete-commit-pending";
        next.updated_at_ms = options_.now_ms();
        if (!catalog_.PutEventLink(next, error)) return false;
        retention_.CompleteEventWrite("event-reservation-sha256-" + token,
                                      actual_size_bytes);
        *link = std::move(next);
    }
    if (link->completeness_reason != "event-terminal-complete-commit-pending") {
        if (error != nullptr) *error = "terminal release 단계가 유효하지 않음";
        return false;
    }
    if (error != nullptr) error->clear();
    return true;
}

bool CatalogEventRecordingBridge::CommitTerminalOrAdvance(
    EventRecordingLinkV1 link, std::string* error) {
    if (link.deferred_requested_range.has_value() || link.deferred_media_pts_range_ms.has_value()) {
        if (link.deferred_requested_range.has_value()) link.requested_range = link.deferred_requested_range;
        link.deferred_requested_range.reset();
        link.ordered_overlaps.clear();
        link.missing_ranges.clear();
        link.derived_segment_id.reset();
        link.derived_actual_range.reset();
        link.derivation_mode.clear();
        link.status = EventRecordingLinkStatus::Pending;
        link.completeness_reason = "pending-finalized-segments";
    } else {
        link.status = EventRecordingLinkStatus::Complete;
        link.completeness_reason = "complete";
    }
    link.updated_at_ms = options_.now_ms();
    if (!catalog_.PutEventLink(link, error)) return false;
    if (link.status == EventRecordingLinkStatus::Pending) {
        Enqueue({link.event_id, std::max(options_.now_ms(), SaturatingAdd(
            link.requested_range->end_ms, options_.finalization_grace_ms))});
    }
    return true;
}

void CatalogEventRecordingBridge::WorkerLoop() {
    while (true) {
        std::shared_ptr<PendingJob> job;
        {
            std::unique_lock lock(mu_);
            cv_.wait(lock, [this] { return stopping_ || !jobs_.empty(); });
            if (stopping_ && jobs_.empty()) return;
            auto earlier = [](const auto& lhs, const auto& rhs) {
                if (lhs.second->ready_at_ms != rhs.second->ready_at_ms) {
                    return lhs.second->ready_at_ms < rhs.second->ready_at_ms;
                }
                return lhs.first < rhs.first;
            };
            auto selected = std::min_element(jobs_.begin(), jobs_.end(), earlier);
            while (!stopping_ && options_.now_ms() < selected->second->ready_at_ms) {
                cv_.wait_for(lock, std::chrono::milliseconds(std::max<std::int64_t>(
                    1, selected->second->ready_at_ms - options_.now_ms())));
                selected = std::min_element(jobs_.begin(), jobs_.end(), earlier);
            }
            job = selected->second;
            jobs_.erase(selected);
        }
        Process(*job);
        RefillPendingJobs();
    }
}

void CatalogEventRecordingBridge::Process(PendingJob job) {
    std::unique_lock resolution_lock(resolution_mu_);
    auto existing = catalog_.FindEventLinkByEventId(job.event_id);
    if (!existing.has_value() || existing->status != EventRecordingLinkStatus::Pending) return;
    auto link = *existing;
    if (link.deferred_requested_range.has_value() || link.deferred_media_pts_range_ms.has_value()) {
        const auto output = link.derived_segment_id.has_value()
                                ? catalog_.FindSegmentById(*link.derived_segment_id)
                                : std::optional<RecordingSegmentV1>{};
        // 복구할 finalized output이 없으면 기존 자원 완료 전이가 필요하지 않다.
        // 재파생 전에 보류 요청을 소비해야 Partial/Failed도 계약에 맞게 저장된다.
        if (!output.has_value() || output->lifecycle != RecordingLifecycle::Finalized) {
            if (link.deferred_media_pts_range_ms.has_value()) {
                UtcRangeV1 mapped;
                std::string epoch;
                if (!ResolveMediaPtsFromSegments(catalog_.RetentionSnapshot(), link.channel_id,
                        link.stream_epoch_id, *link.deferred_media_pts_range_ms, &mapped, &epoch)) {
                    link.completeness_reason = "time-basis-awaiting-segment-map";
                    link.updated_at_ms = options_.now_ms();
                    catalog_.PutEventLink(link, nullptr);
                    Enqueue({link.event_id, SaturatingAdd(options_.now_ms(), options_.mapping_retry_ms)});
                    return;
                }
                if (!link.deferred_requested_range) link.deferred_requested_range = link.requested_range;
                MergeRange(&link.deferred_requested_range, mapped);
                link.deferred_media_pts_range_ms.reset();
                link.stream_epoch_id = epoch;
            }
            if (link.deferred_requested_range) link.requested_range = link.deferred_requested_range;
            link.deferred_requested_range.reset();
            link.ordered_overlaps.clear();
            link.missing_ranges.clear();
            link.derived_segment_id.reset();
            link.derived_actual_range.reset();
            link.derivation_mode.clear();
            link.completeness_reason = "pending-finalized-segments";
            link.updated_at_ms = options_.now_ms();
            if (!catalog_.PutEventLink(link, nullptr)) return;
            const auto ready_at = SaturatingAdd(link.requested_range->end_ms, options_.finalization_grace_ms);
            if (options_.now_ms() < ready_at) {
                Enqueue({link.event_id, ready_at});
                return;
            }
        }
    }
    if (!link.requested_range.has_value()) {
        UtcRangeV1 mapped;
        std::string epoch;
        if (!link.media_pts_range_ms.has_value() ||
            !ResolveMediaPtsFromSegments(catalog_.RetentionSnapshot(), link.channel_id,
                                         link.stream_epoch_id, *link.media_pts_range_ms,
                                         &mapped, &epoch)) {
            link.completeness_reason = "time-basis-awaiting-segment-map";
            link.updated_at_ms = options_.now_ms();
            catalog_.PutEventLink(link, nullptr);
            Enqueue({link.event_id, SaturatingAdd(
                                      options_.now_ms(), options_.mapping_retry_ms)});
            return;
        }
        link.requested_range = mapped;
        link.media_pts_range_ms.reset();
        link.stream_epoch_id = epoch;
        link.completeness_reason = "pending-finalized-segments";
        link.updated_at_ms = options_.now_ms();
        if (!catalog_.PutEventLink(link, nullptr)) return;
    }
    const UtcRangeV1 requested = *link.requested_range;
    const auto snapshot = catalog_.RetentionSnapshot();
    std::vector<RetentionCandidate> candidates;
    std::set<std::string> epochs;
    for (const auto& candidate : snapshot.candidates) {
        const auto& segment = candidate.segment;
        if (segment.channel_id != link.channel_id ||
            segment.lifecycle != RecordingLifecycle::Finalized ||
            segment.retention_class != RecordingRetentionClass::Continuous ||
            !HalfOpenRangesOverlap(segment.start.utc_ms, segment.end.utc_ms,
                                   requested.start_ms, requested.end_ms)) continue;
        if (!link.stream_epoch_id.empty() && segment.stream_epoch_id != link.stream_epoch_id) continue;
        candidates.push_back(candidate);
        epochs.insert(segment.stream_epoch_id);
    }
    std::sort(candidates.begin(), candidates.end(), [](const auto& lhs, const auto& rhs) {
        if (lhs.segment.start.utc_ms != rhs.segment.start.utc_ms) {
            return lhs.segment.start.utc_ms < rhs.segment.start.utc_ms;
        }
        return lhs.segment.segment_id < rhs.segment.segment_id;
    });
    if (link.stream_epoch_id.empty() && epochs.size() == 1) link.stream_epoch_id = *epochs.begin();
    if (epochs.size() > 1) {
        link.status = EventRecordingLinkStatus::Failed;
        link.ordered_overlaps.clear();
        link.missing_ranges = {requested};
        link.completeness_reason = "cross-epoch-not-remuxed";
        link.updated_at_ms = options_.now_ms();
        catalog_.PutEventLink(link, nullptr);
        return;
    }
    const std::string token = StableToken(link.event_id);
    const std::string epoch_token = StableToken(link.stream_epoch_id);
    if (token.empty() || (!link.stream_epoch_id.empty() && epoch_token.empty())) return;
    const std::string range_token = StableToken(
        link.event_id + "\n" + std::to_string(requested.start_ms) + "\n" +
        std::to_string(requested.end_ms) + "\n" + link.stream_epoch_id);
    if (range_token.empty()) return;
    const std::string output_segment_id = "event-seg-sha256-" + range_token;
    if (const auto already = catalog_.FindSegmentById(output_segment_id);
        already.has_value() && already->lifecycle == RecordingLifecycle::Finalized) {
        const std::string expected_epoch = link.stream_epoch_id.empty()
                                               ? std::string()
                                               : "event-epoch-sha256-" + epoch_token;
        const bool compatible = already->retention_class == RecordingRetentionClass::Event &&
            already->source_id == link.source_id && already->channel_id == link.channel_id &&
            already->start.utc_ms <= requested.start_ms && already->end.utc_ms >= requested.end_ms &&
            (expected_epoch.empty() || already->stream_epoch_id == expected_epoch);
        if (!compatible) {
            link.status = EventRecordingLinkStatus::Failed;
            link.ordered_overlaps.clear();
            link.missing_ranges = {requested};
            link.completeness_reason = "event-segment-id-conflict";
            link.updated_at_ms = options_.now_ms();
            catalog_.PutEventLink(link, nullptr);
            return;
        }
        link.derived_segment_id = output_segment_id;
        link.derived_actual_range = UtcRangeV1{already->start.utc_ms, already->end.utc_ms};
        link.derivation_mode = "remux-no-video-reencode";
        link.missing_ranges.clear();
        const auto media_path = catalog_.FindSegmentMediaPath(output_segment_id);
        if (link.completeness_reason == "event-marker-cleanup-recovery-pending" &&
            media_path.has_value()) {
            const auto marker = std::filesystem::path(media_path->string() + ".cleanup-pending");
            if (!options_.remove_media_file(options_.output_root, marker, nullptr)) {
                std::lock_guard lock(mu_);
                deferred_until_restart_.insert(link.event_id);
                return;
            }
        }
        link.status = EventRecordingLinkStatus::Pending;
        if (!IsTerminalReleaseStage(link.completeness_reason)) {
            link.completeness_reason = "event-terminal-output-release-pending";
        }
        link.updated_at_ms = options_.now_ms();
        std::string release_error;
        if (!catalog_.PutEventLink(link, &release_error) ||
            !ReleaseTerminalResources(&link, output_segment_id,
                                      already->size_bytes, &release_error)) {
            Enqueue({link.event_id, SaturatingAdd(
                                      options_.now_ms(), options_.mapping_retry_ms)});
            return;
        }
        if (!CommitTerminalOrAdvance(link, &release_error)) {
            Enqueue({link.event_id, SaturatingAdd(
                                      options_.now_ms(), options_.mapping_retry_ms)});
        }
        return;
    }

    link.ordered_overlaps.clear();
    std::int64_t previous_end = requested.start_ms;
    for (const auto& candidate : candidates) {
        const UtcRangeV1 overlap{std::max(candidate.segment.start.utc_ms, requested.start_ms),
                                 std::min(candidate.segment.end.utc_ms, requested.end_ms)};
        if (overlap.start_ms < previous_end) {
            link.status = EventRecordingLinkStatus::Failed;
            link.ordered_overlaps.clear();
            link.missing_ranges = {requested};
            link.completeness_reason = "overlapping-source-segments";
            link.updated_at_ms = options_.now_ms();
            catalog_.PutEventLink(link, nullptr);
            return;
        }
        link.ordered_overlaps.push_back({candidate.segment.segment_id, overlap});
        previous_end = overlap.end_ms;
    }
    link.missing_ranges = MissingRanges(requested, link.ordered_overlaps);
    if (link.stream_epoch_id.empty() || !link.missing_ranges.empty() || candidates.empty()) {
        link.status = EventRecordingLinkStatus::Partial;
        link.completeness_reason = "partial-missing-continuous-range";
        link.updated_at_ms = options_.now_ms();
        catalog_.PutEventLink(link, nullptr);
        return;
    }
    const auto& first = candidates.front().segment;
    for (const auto& candidate : candidates) {
        if (candidate.segment.container != first.container ||
            candidate.segment.video_codecs != first.video_codecs ||
            candidate.segment.audio_codecs != first.audio_codecs) {
            link.status = EventRecordingLinkStatus::Failed;
            link.completeness_reason = "mixed-codec-not-remuxed";
            link.updated_at_ms = options_.now_ms();
            catalog_.PutEventLink(link, nullptr);
            return;
        }
    }

    std::vector<std::string> segment_ids;
    for (const auto& candidate : candidates) segment_ids.push_back(candidate.segment.segment_id);
    EventSourceLease lease;
    std::string error;
    if (!catalog_.AcquireEventSourceLease(link.channel_id, link.stream_epoch_id,
                                          segment_ids, &lease, &error)) {
        link.status = EventRecordingLinkStatus::Partial;
        link.ordered_overlaps.clear();
        link.missing_ranges = {requested};
        link.completeness_reason = "source-lease-failed";
        link.updated_at_ms = options_.now_ms();
        catalog_.PutEventLink(link, nullptr);
        return;
    }
    std::uint64_t expected_bytes = 0;
    EventClipDeriveRequest request;
    request.event_id = link.event_id;
    request.link_id = link.link_id;
    request.output_segment_id = output_segment_id;
    request.source_id = link.source_id;
    request.channel_id = link.channel_id;
    request.requested_range = requested;
    request.output_root = options_.output_root;
    for (std::size_t index = 0; index < lease.sources.size(); ++index) {
        EventClipSource source;
        source.segment = lease.sources[index].segment;
        source.media_path = lease.sources[index].media_path;
        source.overlap = link.ordered_overlaps[index].range;
        expected_bytes = SaturatingAddBytes(expected_bytes, source.segment.size_bytes);
        request.sources.push_back(std::move(source));
    }
    expected_bytes = std::max<std::uint64_t>(1, expected_bytes);
    const std::string reservation_id = "event-reservation-sha256-" + token;
    const auto admission = retention_.AdmitEventWrite(
        link.channel_id, reservation_id, expected_bytes, options_.now_ms());
    if (!admission.allowed) {
        link.status = EventRecordingLinkStatus::Failed;
        link.completeness_reason = "event-quota-admission-failed";
        link.updated_at_ms = options_.now_ms();
        catalog_.PutEventLink(link, &error);
        catalog_.ReleaseEventSourceLease(lease, nullptr);
        return;
    }

    // 실제 remux는 오래 걸릴 수 있으므로 다른 event의 선행 durable link admission을
    // 막지 않는다. 완료 뒤 같은 event range가 바뀌었는지 다시 확인한다.
    resolution_lock.unlock();
    const auto derived = deriver_.Derive(request);
    resolution_lock.lock();
    const auto latest = catalog_.FindEventLinkByEventId(link.event_id);
    const bool same_request = latest.has_value() &&
        latest->status == EventRecordingLinkStatus::Pending &&
        latest->requested_range.has_value() &&
        latest->requested_range->start_ms == requested.start_ms &&
        latest->requested_range->end_ms == requested.end_ms &&
        (latest->stream_epoch_id.empty() || latest->stream_epoch_id == link.stream_epoch_id);
    if (!same_request) {
        bool cleanup_ok = derived.cleanup_complete;
        if (derived.ok) {
            cleanup_ok = true;
            if (!derived.media_path.empty()) cleanup_ok = options_.remove_media_file(
                options_.output_root, derived.media_path, nullptr) && cleanup_ok;
            if (!derived.partial_path.empty()) cleanup_ok = options_.remove_media_file(
                options_.output_root, derived.partial_path, nullptr) && cleanup_ok;
            if (!derived.cleanup_marker_path.empty()) cleanup_ok = options_.remove_media_file(
                options_.output_root, derived.cleanup_marker_path, nullptr) && cleanup_ok;
        }
        if (cleanup_ok && catalog_.ReleaseEventSourceLease(lease, nullptr)) {
            retention_.CompleteEventWrite(reservation_id, 0);
        } else {
            if (latest.has_value() && latest->status == EventRecordingLinkStatus::Pending) {
                auto recovery = *latest;
                recovery.completeness_reason = "event-cleanup-recovery-pending";
                recovery.updated_at_ms = options_.now_ms();
                catalog_.PutEventLink(recovery, nullptr);
            }
            std::lock_guard lock(mu_);
            deferred_until_restart_.insert(link.event_id);
        }
        return;
    }
    link.fallback_evidence_id = latest->fallback_evidence_id;
    link.fallback_media_locator = latest->fallback_media_locator;
    if (!derived.ok || derived.size_bytes == 0 ||
        derived.size_bytes > admission.reserved_bytes) {
        bool cleanup_ok = derived.cleanup_complete;
        if (derived.ok && derived.size_bytes > admission.reserved_bytes) {
            cleanup_ok = true;
            if (!derived.media_path.empty()) cleanup_ok = options_.remove_media_file(
                options_.output_root, derived.media_path, nullptr) && cleanup_ok;
            if (!derived.partial_path.empty()) cleanup_ok = options_.remove_media_file(
                options_.output_root, derived.partial_path, nullptr) && cleanup_ok;
            if (!derived.cleanup_marker_path.empty()) cleanup_ok = options_.remove_media_file(
                options_.output_root, derived.cleanup_marker_path, nullptr) && cleanup_ok;
        }
        link.status = cleanup_ok ? EventRecordingLinkStatus::Failed
                                 : EventRecordingLinkStatus::Pending;
        link.completeness_reason = !cleanup_ok
                                       ? "event-cleanup-recovery-pending"
                                       : (derived.size_bytes > admission.reserved_bytes
                                              ? "event-reservation-exceeded"
                                              : "event-remux-failed");
        link.updated_at_ms = options_.now_ms();
        catalog_.PutEventLink(link, &error);
        if (cleanup_ok) {
            retention_.CompleteEventWrite(reservation_id, 0);
            catalog_.ReleaseEventSourceLease(lease, nullptr);
        } else if (!cleanup_ok) {
            std::lock_guard lock(mu_);
            deferred_until_restart_.insert(link.event_id);
        }
        return;
    }
    retention_.UpdateEventWriteProgress(reservation_id, derived.size_bytes);
    link.derived_segment_id = output_segment_id;
    link.completeness_reason = "event-catalog-finalize-recovery-pending";
    link.updated_at_ms = options_.now_ms();
    if (!catalog_.PutEventLink(link, &error)) {
        bool cleanup_ok = true;
        if (!derived.media_path.empty()) cleanup_ok = options_.remove_media_file(
            options_.output_root, derived.media_path, nullptr) && cleanup_ok;
        if (!derived.partial_path.empty()) cleanup_ok = options_.remove_media_file(
            options_.output_root, derived.partial_path, nullptr) && cleanup_ok;
        if (!derived.cleanup_marker_path.empty()) cleanup_ok = options_.remove_media_file(
            options_.output_root, derived.cleanup_marker_path, nullptr) && cleanup_ok;
        if (cleanup_ok) {
            retention_.CompleteEventWrite(reservation_id, 0);
            catalog_.ReleaseEventSourceLease(lease, nullptr);
        } else {
            std::lock_guard lock(mu_);
            deferred_until_restart_.insert(link.event_id);
        }
        return;
    }

    RecordingSegmentV1 segment;
    segment.segment_id = output_segment_id;
    segment.source_id = link.source_id;
    segment.channel_id = link.channel_id;
    segment.stream_epoch_id = "event-epoch-sha256-" + epoch_token;
    segment.start.utc_ms = derived.actual_range.start_ms;
    segment.start.pts = 0;
    segment.end.utc_ms = derived.actual_range.end_ms;
    segment.end.pts = std::max<std::int64_t>(1, ClampInt64(
        static_cast<__int128>(derived.actual_range.end_ms - derived.actual_range.start_ms) * 1000000));
    segment.container = derived.container;
    segment.video_codecs = derived.video_codecs;
    segment.audio_codecs = derived.audio_codecs;
    segment.audio_omitted_reason = derived.audio_omitted_reason;
    segment.size_bytes = derived.size_bytes;
    segment.checksum_sha256 = derived.checksum_sha256;
    segment.retention_class = RecordingRetentionClass::Event;
    segment.lifecycle = RecordingLifecycle::Finalized;
    segment.created_at_ms = options_.now_ms();
    segment.finalized_at_ms = segment.created_at_ms;
    if (!catalog_.FinalizeSegmentWithHold(segment, derived.media_path.string(), &error)) {
        bool cleanup_ok = options_.remove_media_file(
            options_.output_root, derived.media_path, nullptr);
        if (!derived.cleanup_marker_path.empty()) cleanup_ok = options_.remove_media_file(
            options_.output_root, derived.cleanup_marker_path, nullptr) && cleanup_ok;
        link.derived_segment_id.reset();
        link.status = cleanup_ok ? EventRecordingLinkStatus::Failed
                                 : EventRecordingLinkStatus::Pending;
        link.completeness_reason = cleanup_ok ? "event-catalog-finalize-failed"
                                               : "event-cleanup-recovery-pending";
        link.updated_at_ms = options_.now_ms();
        catalog_.PutEventLink(link, nullptr);
        if (cleanup_ok) {
            retention_.CompleteEventWrite(reservation_id, 0);
            catalog_.ReleaseEventSourceLease(lease, nullptr);
        } else {
            std::lock_guard lock(mu_);
            deferred_until_restart_.insert(link.event_id);
        }
        return;
    }
    link.derived_actual_range = derived.actual_range;
    link.derivation_mode = "remux-no-video-reencode";
    link.status = EventRecordingLinkStatus::Pending;
    link.completeness_reason = "event-marker-cleanup-recovery-pending";
    link.updated_at_ms = options_.now_ms();
    if (!catalog_.PutEventLink(link, &error)) {
        std::lock_guard lock(mu_);
        deferred_until_restart_.insert(link.event_id);
        return;
    }
    if (!derived.cleanup_marker_path.empty()) {
        if (!options_.remove_media_file(
                options_.output_root, derived.cleanup_marker_path, nullptr)) {
            std::lock_guard lock(mu_);
            deferred_until_restart_.insert(link.event_id);
            return;
        }
    }
    link.status = EventRecordingLinkStatus::Pending;
    link.completeness_reason = "event-terminal-output-release-pending";
    link.updated_at_ms = options_.now_ms();
    if (!catalog_.PutEventLink(link, &error)) {
        Enqueue({link.event_id, SaturatingAdd(
                                  options_.now_ms(), options_.mapping_retry_ms)});
        return;
    }
    if (!ReleaseTerminalResources(&link, output_segment_id,
                                  derived.size_bytes, &error)) {
        Enqueue({link.event_id, SaturatingAdd(
                                  options_.now_ms(), options_.mapping_retry_ms)});
        return;
    }
    if (!CommitTerminalOrAdvance(link, &error)) {
        Enqueue({link.event_id, SaturatingAdd(
                                  options_.now_ms(), options_.mapping_retry_ms)});
    }
}

void CatalogEventRecordingBridge::StopAndDrain() {
    {
        std::lock_guard lock(mu_);
        if (stopping_ && !worker_.joinable()) return;
        stopping_ = true;
        cv_.notify_all();
    }
    if (worker_.joinable()) worker_.join();
}

}  // namespace recording
