// 파일 용도: v4.1.0 S05 이벤트 녹화 연결·파생·fallback·quota 경계를 검증한다.
#include "analysis/event_storage.h"
#include "recording/event_clip_deriver.h"
#include "recording/event_recording_bridge.h"
#include "recording/recording_catalog.h"
#include "recording/recording_journal.h"
#include "recording/retention_coordinator.h"

#include <filesystem>
#include <fstream>
#include <functional>
#include <future>
#include <atomic>
#include <chrono>
#include <iostream>
#include <iomanip>
#include <mutex>
#include <limits>
#include <stdexcept>
#include <string>
#include <thread>
#include <vector>

#ifndef MEDIA_SERVER_USE_GSTREAMER
#define MEDIA_SERVER_USE_GSTREAMER 0
#endif

#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/gst.h>
#endif

namespace {

using analysis::EventMediaHookOptions;
using analysis::EventRecord;
using recording::EventClipDeriveRequest;
using recording::EventClipDeriveResult;
using recording::EventClipDeriver;
using recording::EventRecordingLinkStatus;
using recording::RecordingCatalog;
using recording::RecordingJournal;
using recording::RecordingLifecycle;
using recording::RecordingRetentionClass;
using recording::RecordingSegmentV1;
using recording::RetentionCoordinator;
using recording::RetentionPolicy;
using recording::RetentionSnapshot;

int g_pass = 0;
std::mutex g_result_mutex;

void Expect(bool condition, const std::string& message) {
    if (!condition) throw std::runtime_error(message);
    std::lock_guard<std::mutex> lock(g_result_mutex);
    ++g_pass;
    std::cout << "[s05-assert] " << std::quoted(message) << '\n';
}

void WriteBytes(const std::filesystem::path& path, std::size_t count, char value = 'x') {
    std::filesystem::create_directories(path.parent_path());
    std::ofstream output(path, std::ios::binary | std::ios::trunc);
    if (!output) throw std::runtime_error("test media 생성 실패: " + path.string());
    for (std::size_t i = 0; i < count; ++i) output.put(value);
}

RecordingSegmentV1 MakeSegment(const std::string& id,
                               const std::string& channel,
                               std::int64_t start_utc_ms,
                               std::int64_t end_utc_ms,
                               std::int64_t start_pts_ms,
                               std::int64_t end_pts_ms,
                               RecordingRetentionClass retention_class,
                               std::uint64_t size_bytes) {
    RecordingSegmentV1 segment;
    segment.segment_id = id;
    segment.source_id = channel;
    segment.channel_id = channel;
    segment.stream_epoch_id = "epoch-" + channel;
    segment.start.utc_ms = start_utc_ms;
    segment.start.pts = start_pts_ms * 1000000LL;
    segment.end.utc_ms = end_utc_ms;
    segment.end.pts = end_pts_ms * 1000000LL;
    segment.container = "mp4";
    segment.video_codecs = {"h264"};
    segment.audio_omitted_reason = "source-no-audio";
    segment.size_bytes = size_bytes;
    segment.checksum_sha256 = std::string(64, 'a');
    segment.retention_class = retention_class;
    segment.lifecycle = RecordingLifecycle::Finalized;
    segment.created_at_ms = start_utc_ms;
    segment.finalized_at_ms = end_utc_ms;
    return segment;
}

void StoreSegment(RecordingCatalog* catalog,
                  const std::filesystem::path& root,
                  const RecordingSegmentV1& segment) {
    const auto path = root / segment.channel_id / (segment.segment_id + ".mp4");
    WriteBytes(path, static_cast<std::size_t>(std::max<std::uint64_t>(1, segment.size_bytes)));
    std::string error;
    Expect(catalog->FinalizeSegment(segment, path.string(), &error),
           "segment finalize 실패: " + error);
}

class FakeDeriver final : public EventClipDeriver {
public:
    explicit FakeDeriver(std::function<void(const EventClipDeriveRequest&)> inspect)
        : inspect_(std::move(inspect)) {}

    EventClipDeriveResult Derive(const EventClipDeriveRequest& request) override {
        ++calls;
        last_request = request;
        if (inspect_) inspect_(request);
        EventClipDeriveResult result;
        result.ok = true;
        result.actual_range.start_ms = request.sources.front().segment.start.utc_ms;
        result.actual_range.end_ms = request.sources.back().overlap.end_ms;
        result.container = "mp4";
        result.video_codecs = {"h264"};
        result.audio_omitted_reason = "source-no-audio";
        result.media_path = request.output_root / request.channel_id /
                            (request.output_segment_id + ".mp4");
        WriteBytes(result.media_path, 23, 'd');
        result.size_bytes = 23;
        result.checksum_sha256 = std::string(64, 'd');
        return result;
    }

    int calls{0};
    EventClipDeriveRequest last_request;

private:
    std::function<void(const EventClipDeriveRequest&)> inspect_;
};

class CleanupFailDeriver final : public EventClipDeriver {
public:
    EventClipDeriveResult Derive(const EventClipDeriveRequest&) override {
        EventClipDeriveResult result;
        result.error = "injected-cleanup-failure";
        result.cleanup_complete = false;
        return result;
    }
};

class RemuxFailDeriver final : public EventClipDeriver {
public:
    EventClipDeriveResult Derive(const EventClipDeriveRequest&) override {
        ++calls;
        EventClipDeriveResult result;
        result.error = "injected-remux-failure";
        result.cleanup_complete = true;
        return result;
    }
    std::atomic<int> calls{0};
};

class MarkerCleanupDeriver final : public EventClipDeriver {
public:
    EventClipDeriveResult Derive(const EventClipDeriveRequest& request) override {
        EventClipDeriveResult result;
        result.ok = true;
        result.actual_range = request.requested_range;
        result.container = "mp4";
        result.video_codecs = {"h264"};
        result.audio_omitted_reason = "source-no-audio";
        result.media_path = request.output_root / "marker-cleanup" /
                            (request.output_segment_id + ".mp4");
        result.cleanup_marker_path =
            std::filesystem::path(result.media_path.string() + ".cleanup-pending");
        WriteBytes(result.media_path, 23, 'm');
        WriteBytes(result.cleanup_marker_path, 23, 'k');
        result.size_bytes = 23;
        result.checksum_sha256 = std::string(64, 'e');
        result.cleanup_complete = false;
        return result;
    }
};

class BlockingDeriver final : public EventClipDeriver {
public:
    EventClipDeriveResult Derive(const EventClipDeriveRequest& request) override {
        {
            std::unique_lock lock(mu_);
            entered_ = true;
            cv_.notify_all();
            cv_.wait(lock, [this] { return released_; });
        }
        EventClipDeriveResult result;
        result.ok = true;
        result.actual_range = request.requested_range;
        result.container = "mp4";
        result.video_codecs = {"h264"};
        result.audio_omitted_reason = "source-no-audio";
        result.media_path = request.output_root / "blocking" /
                            (request.output_segment_id + ".mp4");
        WriteBytes(result.media_path, 23, 'b');
        result.size_bytes = 23;
        result.checksum_sha256 = std::string(64, 'b');
        return result;
    }

    void WaitForEntry() {
        std::unique_lock lock(mu_);
        cv_.wait(lock, [this] { return entered_; });
    }

    void Release() {
        std::lock_guard lock(mu_);
        released_ = true;
        cv_.notify_all();
    }

private:
    std::mutex mu_;
    std::condition_variable cv_;
    bool entered_{false};
    bool released_{false};
};

EventRecord MakePtsEvent(const std::string& event_id, const std::string& channel) {
    EventRecord record;
    record.event_id = event_id;
    record.event_type = "loitering";
    record.stream_id = channel;
    record.channel_id = channel;
    record.start_time_ms = 1300;
    record.update_time_ms = 1500;
    record.end_time_ms = 2300;
    record.time_basis = "media-pts-ms";
    record.time_anchor_utc_ms = 10000;
    record.time_anchor_pts_ms = 0;
    record.stream_epoch_id = "epoch-" + channel;
    return record;
}

template <typename Predicate>
void WaitUntil(Predicate predicate, const std::string& message) {
    for (int attempt = 0; attempt < 600; ++attempt) {
        if (predicate()) return;
        std::this_thread::sleep_for(std::chrono::milliseconds(5));
    }
    throw std::runtime_error(message);
}

bool SnapshotHasHold(const RetentionSnapshot& snapshot,
                     const std::string& segment_id) {
    for (const auto& candidate : snapshot.candidates) {
        if (candidate.segment.segment_id == segment_id) return candidate.hold_count > 0;
    }
    return false;
}

#if MEDIA_SERVER_USE_GSTREAMER
bool RunPipelineToEos(const std::string& launch, std::string* error) {
    gst_init(nullptr, nullptr);
    GError* parse_error = nullptr;
    GstElement* pipeline = gst_parse_launch(launch.c_str(), &parse_error);
    if (pipeline == nullptr || parse_error != nullptr) {
        if (error != nullptr) *error = parse_error == nullptr ? "pipeline-null" : parse_error->message;
        if (parse_error != nullptr) g_error_free(parse_error);
        if (pipeline != nullptr) gst_object_unref(pipeline);
        return false;
    }
    bool ok = gst_element_set_state(pipeline, GST_STATE_PLAYING) != GST_STATE_CHANGE_FAILURE;
    GstBus* bus = gst_element_get_bus(pipeline);
    GstMessage* message = ok ? gst_bus_timed_pop_filtered(
        bus, 20 * GST_SECOND,
        static_cast<GstMessageType>(GST_MESSAGE_EOS | GST_MESSAGE_ERROR)) : nullptr;
    ok = message != nullptr && GST_MESSAGE_TYPE(message) == GST_MESSAGE_EOS;
    if (!ok && message != nullptr && GST_MESSAGE_TYPE(message) == GST_MESSAGE_ERROR &&
        error != nullptr) {
        GError* gst_error = nullptr;
        gchar* debug = nullptr;
        gst_message_parse_error(message, &gst_error, &debug);
        *error = gst_error == nullptr ? "gst-error" : gst_error->message;
        if (gst_error != nullptr) g_error_free(gst_error);
        g_free(debug);
    }
    if (message != nullptr) gst_message_unref(message);
    gst_object_unref(bus);
    gst_element_set_state(pipeline, GST_STATE_NULL);
    gst_object_unref(pipeline);
    return ok;
}
#endif

void VerifyLinkContractInvariants() {
    recording::EventRecordingLinkV1 link;
    link.link_id = "link-contract";
    link.event_id = "event-contract";
    link.source_id = "source-contract";
    link.channel_id = "channel-contract";
    link.requested_range = recording::UtcRangeV1{1000, 2000};
    link.time_basis = "utc-ms";
    link.status = EventRecordingLinkStatus::Pending;
    link.created_at_ms = 1000;
    link.updated_at_ms = 1000;
    std::string error;
    Expect(recording::ValidateEventRecordingLinkV1(link, &error),
           "기본 pending event link가 유효해야 함: " + error);
    auto deferred = link;
    deferred.deferred_requested_range = recording::UtcRangeV1{900, 2100};
    recording::EventRecordingLinkV1 deferred_roundtrip;
    Expect(recording::ParseEventRecordingLinkV1(
               recording::SerializeEventRecordingLinkV1(deferred), &deferred_roundtrip, &error) &&
               deferred_roundtrip.deferred_requested_range.has_value() &&
               deferred_roundtrip.deferred_requested_range->end_ms == 2100,
           "terminal 대기 UTC 확장 요청은 additive 계약으로 round-trip해야 함");
    deferred.deferred_requested_range = recording::UtcRangeV1{1100, 1900};
    Expect(!recording::ValidateEventRecordingLinkV1(deferred, &error),
           "terminal 대기 요청이 현재 범위를 축소하면 거부해야 함");
    auto deferred_pts = link;
    deferred_pts.time_basis = "media-pts-ms";
    deferred_pts.deferred_media_pts_range_ms = recording::UtcRangeV1{300, 3000};
    Expect(recording::ParseEventRecordingLinkV1(
               recording::SerializeEventRecordingLinkV1(deferred_pts), &deferred_roundtrip, &error) &&
               deferred_roundtrip.deferred_media_pts_range_ms &&
               deferred_roundtrip.deferred_media_pts_range_ms->end_ms == 3000,
           "미해석 후속 PTS는 기존 UTC 범위와 별도 field로 round-trip해야 함");
    deferred_pts.status = EventRecordingLinkStatus::Failed;
    Expect(!recording::ValidateEventRecordingLinkV1(deferred_pts, &error),
           "미해석 후속 PTS를 소비하지 않은 terminal 상태를 거부해야 함");
    auto overlapping = link;
    overlapping.status = EventRecordingLinkStatus::Failed;
    overlapping.ordered_overlaps = {{"segment-a", {1000, 1600}},
                                    {"segment-b", {1500, 2000}}};
    Expect(!recording::ValidateEventRecordingLinkV1(overlapping, &error),
           "서로 겹치는 ordered overlap을 거부해야 함");
    auto incomplete = link;
    incomplete.status = EventRecordingLinkStatus::Partial;
    incomplete.ordered_overlaps = {{"segment-a", {1000, 1400}}};
    incomplete.missing_ranges = {{1500, 2000}};
    Expect(!recording::ValidateEventRecordingLinkV1(incomplete, &error),
           "overlap/missing이 requested range를 정확히 분할하지 않으면 거부해야 함");
    auto unknown = link;
    unknown.status = EventRecordingLinkStatus::Unknown;
    Expect(!recording::ValidateEventRecordingLinkV1(unknown, &error),
           "unknown link status를 영속 계약으로 허용하면 안 됨");
    auto dangling_fallback = link;
    dangling_fallback.fallback_evidence_id = "fallback-only";
    Expect(!recording::ValidateEventRecordingLinkV1(dangling_fallback, &error),
           "locator 없는 fallback evidence를 거부해야 함");
}

void VerifyEventLinking(const std::filesystem::path& root) {
    RecordingJournal journal(root / "recording-mutations.jsonl");
    std::string error;
    Expect(journal.Open(&error), "journal open 실패: " + error);
    RecordingCatalog catalog(journal, {root / "catalog.sqlite3", root, true});
    Expect(catalog.Open(&error), "catalog open 실패: " + error);
    Expect(catalog.catalog_mode() == "sqlite-primary",
           "event link 갱신은 SQLite primary projection에서 검증해야 함");

    StoreSegment(&catalog, root, MakeSegment("touch-left", "cam-a", 9000, 10300, -1000, 300,
                                             RecordingRetentionClass::Continuous, 11));
    StoreSegment(&catalog, root, MakeSegment("seg-a1", "cam-a", 10000, 11000, 0, 1000,
                                             RecordingRetentionClass::Continuous, 12));
    StoreSegment(&catalog, root, MakeSegment("seg-a2", "cam-a", 11000, 12000, 1000, 2000,
                                             RecordingRetentionClass::Continuous, 13));
    StoreSegment(&catalog, root, MakeSegment("seg-a3", "cam-a", 12000, 12500, 2000, 2500,
                                             RecordingRetentionClass::Continuous, 14));
    StoreSegment(&catalog, root, MakeSegment("touch-right", "cam-a", 12500, 13000, 2500, 3000,
                                             RecordingRetentionClass::Continuous, 15));

    RetentionCoordinator::Options retention_options;
    retention_options.reserved_free_bytes = 1024;
    retention_options.default_expected_segment_bytes = 1;
    retention_options.media_root = root;
    RetentionCoordinator retention(
        catalog,
        [&catalog] { return catalog.RetentionSnapshot(); },
        [](std::uint64_t* free_bytes, std::string* error_message) {
            *free_bytes = 1024ULL * 1024ULL * 1024ULL;
            if (error_message != nullptr) error_message->clear();
            return true;
        },
        [&root](const std::filesystem::path& path, std::string* error_message) {
            std::string detail;
            const bool removed = recording::RemoveContainedMediaFile(root, path, &detail);
            if (!removed && error_message != nullptr) {
                *error_message = detail + " root=" + root.string() + " path=" + path.string();
            }
            return removed;
        },
        retention_options);
    RetentionPolicy policy;
    policy.continuous_max_bytes = 1024ULL * 1024ULL;
    policy.continuous_max_age_ms = 24LL * 60LL * 60LL * 1000LL;
    policy.event_max_bytes = 1024ULL * 1024ULL;
    policy.event_max_age_ms = 24LL * 60LL * 60LL * 1000LL;
    Expect(retention.UpdateChannelPolicy("cam-a", policy, &error), "retention policy 실패: " + error);

    FakeDeriver deriver([&catalog](const EventClipDeriveRequest& request) {
        const RetentionSnapshot snapshot = catalog.RetentionSnapshot();
        for (const auto& source : request.sources) {
            bool held = false;
            for (const auto& candidate : snapshot.candidates) {
                if (candidate.segment.segment_id == source.segment.segment_id) {
                    held = candidate.hold_count == 1;
                    break;
                }
            }
            Expect(held, "파생 중 원본 segment hold가 유지되어야 함");
        }
    });
    recording::CatalogEventRecordingBridge::Options bridge_options;
    bridge_options.output_root = root;
    bridge_options.now_ms = [] {
        return std::chrono::duration_cast<std::chrono::milliseconds>(
                   std::chrono::system_clock::now().time_since_epoch())
            .count();
    };
    bridge_options.mapping_retry_ms = 25;
    recording::CatalogEventRecordingBridge bridge(
        catalog, retention, deriver, std::move(bridge_options));

    EventMediaHookOptions options;
    options.enabled = true;
    options.pre_event_ms = 1000;
    options.post_event_ms = 200;
    EventRecord event = MakePtsEvent("evt-a", "cam-a");
    analysis::AnalysisResult analysis_result;
    analysis_result.source_key = "cam-a";
    const auto first = bridge.TryResolve(analysis_result, event, options);
    Expect(first.handled && !first.derived_clip_ready && first.completeness == "pending",
           "이벤트 저장 worker를 막지 않고 파생 job을 pending으로 enqueue해야 함");
    try {
        WaitUntil([&] {
            const auto link = catalog.FindEventLinkByEventId("evt-a");
            return link.has_value() && link->status == EventRecordingLinkStatus::Complete;
        }, "event clip 비동기 파생 timeout");
    } catch (const std::exception&) {
        const auto link = catalog.FindEventLinkByEventId("evt-a");
        throw std::runtime_error(
            "event clip 비동기 파생 timeout: status=" +
            std::to_string(link.has_value() ? static_cast<int>(link->status) : -1) +
            " reason=" + (link.has_value() ? link->completeness_reason : "missing"));
    }
    const auto ready = bridge.TryResolve(analysis_result, event, options);
    Expect(ready.handled && ready.derived_clip_ready && ready.completeness == "complete",
           "완전한 archive 파생 완료 뒤 ready clip을 반환해야 함");
    Expect(ready.link_id.rfind("event-link-sha256-", 0) == 0 && !ready.clip_path.empty(),
           "event link ID와 derived clip path가 반환되어야 함");
    Expect(deriver.calls == 1 && deriver.last_request.sources.size() == 3,
           "반개구간 overlap은 맞닿기만 한 segment를 제외해야 함");
    Expect(deriver.last_request.requested_range.start_ms == 10300 &&
               deriver.last_request.requested_range.end_ms == 12500,
           "media PTS event 범위가 segment epoch 기준 UTC로 변환되어야 함");
    Expect(deriver.last_request.sources[0].segment.segment_id == "seg-a1" &&
               deriver.last_request.sources[1].segment.segment_id == "seg-a2" &&
               deriver.last_request.sources[2].segment.segment_id == "seg-a3",
           "overlap segment가 UTC 순서로 전달되어야 함");

    const auto stored_link = catalog.FindEventLinkByEventId("evt-a");
    Expect(stored_link.has_value() && stored_link->status == EventRecordingLinkStatus::Complete &&
               stored_link->derived_segment_id.has_value(),
           "파생 성공 link가 catalog complete로 저장되어야 함");
    for (const auto& candidate : catalog.RetentionSnapshot().candidates) {
        if (candidate.segment.segment_id == "seg-a1" || candidate.segment.segment_id == "seg-a2" ||
            candidate.segment.segment_id == "seg-a3") {
            Expect(candidate.hold_count == 0, "파생 완료 뒤 원본 hold가 해제되어야 함");
        }
    }

    const auto repeated = bridge.TryResolve(analysis_result, event, options);
    Expect(repeated.derived_clip_ready && repeated.link_id == ready.link_id && deriver.calls == 1,
           "같은 event update는 파생 clip을 중복 생성하지 않아야 함");

    EventRecord expanded = event;
    expanded.end_time_ms = 2500;
    bridge.TryResolve(analysis_result, expanded, options);
    try {
        WaitUntil([&] {
            const auto link = catalog.FindEventLinkByEventId(expanded.event_id);
            return link.has_value() && link->status == EventRecordingLinkStatus::Complete &&
                   link->requested_range.has_value() &&
                   link->requested_range->start_ms == 10300 &&
                   link->requested_range->end_ms == 12700;
        }, "완료 뒤 확장된 동일 event 범위 재파생 timeout");
    } catch (const std::exception&) {
        const auto link = catalog.FindEventLinkByEventId(expanded.event_id);
        throw std::runtime_error(
            "완료 뒤 확장된 동일 event 범위 재파생 timeout: status=" +
            std::to_string(link.has_value() ? static_cast<int>(link->status) : -1) +
            " reason=" + (link.has_value() ? link->completeness_reason : "missing") +
            " range=" + (link.has_value() && link->requested_range.has_value()
                              ? std::to_string(link->requested_range->start_ms) + "-" +
                                    std::to_string(link->requested_range->end_ms)
                              : "missing"));
    }
    const auto expanded_link = catalog.FindEventLinkByEventId(expanded.event_id);
    Expect(deriver.calls == 2 && expanded_link.has_value() &&
               expanded_link->derived_segment_id.has_value() &&
               expanded_link->derived_segment_id != stored_link->derived_segment_id,
           "완료 event의 더 넓은 update는 range별 결정 ID로 다시 파생해야 함");

    StoreSegment(&catalog, root, MakeSegment("seg-b1", "cam-b", 10000, 11000, 0, 1000,
                                             RecordingRetentionClass::Continuous, 10));
    StoreSegment(&catalog, root, MakeSegment("seg-b3", "cam-b", 12000, 12500, 2000, 2500,
                                             RecordingRetentionClass::Continuous, 10));
    Expect(retention.UpdateChannelPolicy("cam-b", policy, &error), "cam-b policy 실패: " + error);
    EventRecord gap_event = MakePtsEvent("evt-gap", "cam-b");
    analysis_result.source_key = "cam-b";
    bridge.TryResolve(analysis_result, gap_event, options);
    WaitUntil([&] {
        const auto link = catalog.FindEventLinkByEventId("evt-gap");
        return link.has_value() && link->status == EventRecordingLinkStatus::Partial;
    }, "gap link 판정 timeout");
    bridge.TryResolve(analysis_result, gap_event, options);
    WaitUntil([&] {
        const auto link = catalog.FindEventLinkByEventId("evt-gap");
        return link.has_value() && link->status == EventRecordingLinkStatus::Partial;
    }, "gap link 재평가 timeout");
    const auto gap_link_result = catalog.FindEventLinkByEventId("evt-gap");
    const auto gap = gap_link_result.has_value()
                         ? analysis::EventRecordingBridgeResult{
                               true, false, {}, gap_link_result->link_id, "partial",
                               gap_link_result->completeness_reason}
                         : analysis::EventRecordingBridgeResult{};
    Expect(gap.handled && !gap.derived_clip_ready && gap.completeness == "partial",
           "archive gap이 있으면 complete로 표시하면 안 됨");
    const auto gap_link = catalog.FindEventLinkByEventId("evt-gap");
    Expect(gap_link.has_value() && gap_link->missing_ranges.size() == 1 &&
               gap_link->missing_ranges[0].start_ms == 11000 &&
               gap_link->missing_ranges[0].end_ms == 12000,
           "link가 정확한 missing UTC range를 보존해야 함");
    gap_event.clip_path = (root / "fallback" / "evt-gap" / "manifest.json").string();
    WriteBytes(gap_event.clip_path, 8, 'f');
    bridge.RecordFallback(gap_event, gap);
    const auto fallback_link = catalog.FindEventLinkByEventId("evt-gap");
    Expect(fallback_link.has_value() && fallback_link->fallback_evidence_id.has_value() &&
               fallback_link->fallback_media_locator ==
                   std::optional<std::string>(std::filesystem::absolute(gap_event.clip_path)
                                                  .lexically_normal().string()) &&
               fallback_link->status == EventRecordingLinkStatus::Partial,
           "frame-buffer fallback 뒤 같은 link가 fallback evidence로 갱신되어야 함");
    Expect(catalog.catalog_mode() == "sqlite-primary",
           "같은 event link의 overlap/fallback 갱신 뒤에도 SQLite projection을 유지해야 함");

    EventRecord late_segment = MakePtsEvent("evt-late-segment-map", "cam-late");
    late_segment.time_anchor_utc_ms = 0;
    late_segment.stream_epoch_id.clear();
    analysis_result.source_key = "cam-late";
    bridge.TryResolve(analysis_result, late_segment, options);
    WaitUntil([&] {
        const auto link = catalog.FindEventLinkByEventId(late_segment.event_id);
        return link.has_value() &&
               link->completeness_reason == "time-basis-awaiting-segment-map";
    }, "anchor 없는 event의 1차 segment mapping 대기 timeout");
    Expect(retention.UpdateChannelPolicy("cam-late", policy, &error),
           "cam-late policy 실패: " + error);
    StoreSegment(&catalog, root,
                 MakeSegment("seg-late", "cam-late", 10000, 13000, 0, 3000,
                             RecordingRetentionClass::Continuous, 30));
    try {
        WaitUntil([&] {
            const auto link = catalog.FindEventLinkByEventId(late_segment.event_id);
            return link.has_value() && link->status == EventRecordingLinkStatus::Complete;
        }, "anchor 없는 event가 같은 프로세스의 후행 segment finalize를 재시도하지 않음");
    } catch (const std::exception&) {
        const auto link = catalog.FindEventLinkByEventId(late_segment.event_id);
        throw std::runtime_error(
            "anchor 없는 event 후행 segment 복구 timeout: status=" +
            std::to_string(link.has_value() ? static_cast<int>(link->status) : -1) +
            " reason=" + (link.has_value() ? link->completeness_reason : "missing"));
    }

    EventRecord mapped = MakePtsEvent("evt-mapped-without-anchor", "cam-a");
    mapped.time_anchor_utc_ms = 0;
    analysis_result.source_key = "cam-a";
    bridge.TryResolve(analysis_result, mapped, options);
    WaitUntil([&] {
        const auto link = catalog.FindEventLinkByEventId(mapped.event_id);
        return link.has_value() && link->status == EventRecordingLinkStatus::Complete;
    }, "anchor 없는 PTS의 segment mapping 복구 timeout");
    const auto mapped_link = catalog.FindEventLinkByEventId(mapped.event_id);
    Expect(mapped_link.has_value() && mapped_link->requested_range.has_value() &&
               !mapped_link->media_pts_range_ms.has_value() &&
               mapped_link->requested_range->start_ms == 10300 &&
               mapped_link->requested_range->end_ms == 12500,
           "anchor 없는 PTS를 finalized segment의 실제 PTS/UTC mapping으로 복구해야 함");

    EventRecord ambiguous = MakePtsEvent("evt-ambiguous", "cam-missing");
    ambiguous.time_anchor_utc_ms = 0;
    ambiguous.stream_epoch_id.clear();
    analysis_result.source_key = "cam-missing";
    const auto ambiguous_result = bridge.TryResolve(analysis_result, ambiguous, options);
    Expect(ambiguous_result.handled && !ambiguous_result.derived_clip_ready &&
               ambiguous_result.completeness == "time-basis-ambiguous" && deriver.calls == 4,
           "PTS epoch anchor가 없으면 임의 UTC 연결이나 파생을 하면 안 됨");
    const auto ambiguous_link = catalog.FindEventLinkByEventId("evt-ambiguous");
    Expect(ambiguous_link.has_value() && !ambiguous_link->requested_range.has_value() &&
               ambiguous_link->media_pts_range_ms.has_value() &&
               ambiguous_link->status == EventRecordingLinkStatus::Pending,
           "anchor 없는 PTS는 UTC field가 아니라 재해석 가능한 PTS range로 보존해야 함");

    const std::string shared_prefix(110, 'x');
    EventRecord long_a = MakePtsEvent(shared_prefix + "-a", "cam-a");
    EventRecord long_b = MakePtsEvent(shared_prefix + "-b", "cam-a");
    const auto long_a_result = bridge.TryResolve(analysis_result, long_a, options);
    const auto long_b_result = bridge.TryResolve(analysis_result, long_b, options);
    Expect(long_a_result.handled && long_b_result.handled &&
               long_a_result.link_id != long_b_result.link_id &&
               long_a_result.link_id.size() < 256 && long_b_result.link_id.size() < 256,
           "같은 긴 prefix의 event ID도 SHA-256 기반 결정 ID가 충돌하면 안 됨");
}

void VerifyDeferredFailureAndPtsUpdates(const std::filesystem::path& root) {
    std::string error;
    RecordingJournal journal(root / "mutations.jsonl");
    Expect(journal.Open(&error), "확장 회귀 journal open 실패: " + error);
    {
        RecordingCatalog initial(journal, {root / "catalog.sqlite3", root, false});
        Expect(initial.Open(&error), "확장 회귀 initial catalog open 실패: " + error);
        StoreSegment(&initial, root, MakeSegment("pts-source", "cam-pts", 10000, 13000,
                     0, 3000, RecordingRetentionClass::Continuous, 100));
        for (const auto& channel : {"cam-missing", "cam-pts"}) {
            recording::EventRecordingLinkV1 link;
            link.link_id = std::string("cleanup-link-") + channel;
            link.event_id = std::string("cleanup-event-") + channel;
            link.source_id = channel;
            link.channel_id = channel;
            link.stream_epoch_id = std::string("epoch-") + channel;
            link.time_basis = "utc-ms";
            link.requested_range = recording::UtcRangeV1{10300, 12000};
            link.deferred_requested_range = recording::UtcRangeV1{10300, 12500};
            link.status = EventRecordingLinkStatus::Pending;
            link.completeness_reason = "event-cleanup-recovery-pending";
            link.created_at_ms = 14000;
            link.updated_at_ms = 14000;
            Expect(initial.PutEventLink(link, &error), "cleanup 확장 fixture 저장 실패: " + error);
        }
    }
    RecordingCatalog catalog(journal, {root / "catalog.sqlite3", root, false});
    Expect(catalog.Open(&error), "확장 회귀 restart catalog open 실패: " + error);
    RetentionCoordinator::Options retention_options;
    retention_options.reserved_free_bytes = 1;
    retention_options.media_root = root;
    RetentionCoordinator retention(catalog, [&catalog] { return catalog.RetentionSnapshot(); },
        [](std::uint64_t* bytes, std::string*) { *bytes = 1000000; return true; },
        [&root](const std::filesystem::path& path, std::string* detail) {
            return recording::RemoveContainedMediaFile(root, path, detail);
        }, retention_options);
    RetentionPolicy policy;
    policy.continuous_max_bytes = 100000;
    policy.event_max_bytes = 100000;
    policy.continuous_max_age_ms = 100000;
    policy.event_max_age_ms = 100000;
    Expect(retention.UpdateChannelPolicy("cam-pts", policy, &error), "확장 policy 실패");
    recording::CatalogEventRecordingBridge::Options bridge_options;
    bridge_options.output_root = root;
    bridge_options.now_ms = [] { return 20000; };
    bridge_options.finalization_grace_ms = 0;
    bridge_options.mapping_retry_ms = 1;
    RemuxFailDeriver failing;
    {
        recording::CatalogEventRecordingBridge bridge(catalog, retention, failing, bridge_options);
        WaitUntil([&] {
            const auto missing = catalog.FindEventLinkByEventId("cleanup-event-cam-missing");
            const auto failed = catalog.FindEventLinkByEventId("cleanup-event-cam-pts");
            return missing && failed && missing->status == EventRecordingLinkStatus::Partial &&
                   failed->status == EventRecordingLinkStatus::Failed;
        }, "cleanup 확장 재시작이 Partial/Failed 대신 Pending 무한 재처리에 남음");
        bridge.StopAndDrain();
    }
    Expect(failing.calls == 1, "cleanup 확장 remux 실패는 한 번만 실행되어야 함");
    for (const auto& id : {"cleanup-event-cam-missing", "cleanup-event-cam-pts"}) {
        const auto link = catalog.FindEventLinkByEventId(id);
        Expect(link && !link->deferred_requested_range && link->requested_range->end_ms == 12500,
               "실패/Partial도 보류 확장 요청을 현재 범위로 소비해 보존해야 함");
    }
    FakeDeriver deriver(nullptr);
    EventMediaHookOptions options;
    options.pre_event_ms = 0;
    options.post_event_ms = 0;
    analysis::AnalysisResult result;
    auto event = MakePtsEvent("pts-followup", "cam-pts");
    event.time_anchor_utc_ms = 0;
    event.end_time_ms = 2300;
    {
        recording::CatalogEventRecordingBridge bridge(catalog, retention, deriver, bridge_options);
        bridge.TryResolve(result, event, options);
        WaitUntil([&] {
            const auto link = catalog.FindEventLinkByEventId(event.event_id);
            return link && link->status == EventRecordingLinkStatus::Complete;
        }, "PTS 최초 complete timeout");
        const auto first = catalog.FindEventLinkByEventId(event.event_id);
        event.end_time_ms = 2600;
        bridge.TryResolve(result, event, options);
        WaitUntil([&] {
            const auto link = catalog.FindEventLinkByEventId(event.event_id);
            return link && link->status == EventRecordingLinkStatus::Complete &&
                   link->requested_range->end_ms == 12600;
        }, "anchor 없는 PTS 후속 확장이 기존 clip에 유실됨");
        Expect(catalog.FindEventLinkByEventId(event.event_id)->derived_segment_id !=
                   first->derived_segment_id, "PTS 확장은 다른 범위 ID를 사용해야 함");
        event.end_time_ms = 3500;
        const auto waiting = bridge.TryResolve(result, event, options);
        Expect(waiting.handled && !waiting.derived_clip_ready,
               "미해석 PTS 확장을 이전 complete clip으로 응답하면 안 됨");
        bridge.StopAndDrain();
    }
    StoreSegment(&catalog, root, MakeSegment("pts-source-late", "cam-pts", 13000, 14000,
                 3000, 4000, RecordingRetentionClass::Continuous, 100));
    {
        recording::CatalogEventRecordingBridge bridge(catalog, retention, deriver, bridge_options);
        WaitUntil([&] {
            const auto link = catalog.FindEventLinkByEventId(event.event_id);
            return link && link->status == EventRecordingLinkStatus::Complete &&
                   link->requested_range->end_ms == 13500;
        }, "후행 segment map/worker 재시작 뒤 PTS 확장 복구 실패");
        bridge.StopAndDrain();
    }
    Expect(deriver.calls == 3, "PTS 확장 2회는 최초 포함 총 3회 파생해야 함");
}

void VerifyEventQuotaIsolation(const std::filesystem::path& root) {
    RecordingJournal journal(root / "quota-mutations.jsonl");
    std::string error;
    Expect(journal.Open(&error), "quota journal open 실패: " + error);
    RecordingCatalog catalog(journal, {root / "quota.sqlite3", root, false});
    Expect(catalog.Open(&error), "quota catalog open 실패: " + error);
    StoreSegment(&catalog, root, MakeSegment("continuous-keep", "cam-q", 1000, 2000, 0, 1000,
                                             RecordingRetentionClass::Continuous, 80));
    StoreSegment(&catalog, root, MakeSegment("event-oldest", "cam-q", 2000, 3000, 1000, 2000,
                                             RecordingRetentionClass::Event, 80));

    RetentionCoordinator::Options retention_options;
    retention_options.reserved_free_bytes = 1;
    retention_options.default_expected_segment_bytes = 1;
    retention_options.media_root = root;
    RetentionCoordinator retention(
        catalog,
        [&catalog] { return catalog.RetentionSnapshot(); },
        [](std::uint64_t* free_bytes, std::string*) {
            *free_bytes = 1024ULL * 1024ULL;
            return true;
        },
        [&root](const std::filesystem::path& path, std::string* error_message) {
            std::string detail;
            const bool removed = recording::RemoveContainedMediaFile(root, path, &detail);
            if (!removed && error_message != nullptr) {
                *error_message = detail + " root=" + root.string() + " path=" + path.string();
            }
            return removed;
        },
        retention_options);
    RetentionPolicy policy;
    policy.continuous_max_bytes = 100;
    policy.continuous_max_age_ms = 100000;
    policy.event_max_bytes = 100;
    policy.event_max_age_ms = 100000;
    Expect(retention.UpdateChannelPolicy("cam-q", policy, &error), "quota policy 실패: " + error);
    const auto admitted = retention.AdmitEventWrite("cam-q", "event-reservation", 60, 4000);
    Expect(admitted.allowed,
           "event quota는 oldest event를 정리해 새 event write를 허용해야 함: " +
               admitted.message);
    const auto continuous = catalog.QuerySegments("cam-q", 1000, 2000);
    const auto old_event = catalog.QuerySegments("cam-q", 2000, 3000);
    Expect(continuous.size() == 1 && continuous[0].segment_id == "continuous-keep",
           "event quota 충족을 위해 continuous를 삭제하면 안 됨");
    Expect(old_event.empty(), "event quota는 oldest eligible event를 삭제해야 함");
    retention.RemoveChannelPolicy("cam-q");
    Expect(retention.UpdateChannelPolicy("cam-q", policy, &error),
           "policy 재등록 실패: " + error);
    const auto duplicate = retention.AdmitEventWrite("cam-q", "event-reservation", 1, 4001);
    Expect(!duplicate.allowed && duplicate.message.find("이미 존재") != std::string::npos,
           "policy 제거가 진행 중 event reservation을 지우면 안 됨");
    retention.CompleteEventWrite("event-reservation", 60);
    const auto reused = retention.AdmitEventWrite("cam-q", "event-reservation", 1, 4002);
    Expect(reused.allowed, "명시적 complete 뒤 event reservation ID를 재사용할 수 있어야 함");
    retention.CompleteEventWrite("event-reservation", 1);
}

void VerifyQueueRefillAndCleanupHold(const std::filesystem::path& root) {
    RecordingJournal journal(root / "queue-mutations.jsonl");
    std::string error;
    Expect(journal.Open(&error), "queue journal open 실패: " + error);
    RecordingCatalog catalog(journal, {root / "queue.sqlite3", root, false});
    Expect(catalog.Open(&error), "queue catalog open 실패: " + error);
    StoreSegment(&catalog, root, MakeSegment("queue-source", "cam-queue", 10000, 13000,
                                             0, 3000,
                                             RecordingRetentionClass::Continuous, 200));
    RetentionCoordinator::Options retention_options;
    retention_options.reserved_free_bytes = 1;
    retention_options.default_expected_segment_bytes = 1;
    retention_options.media_root = root;
    RetentionCoordinator retention(
        catalog,
        [&catalog] { return catalog.RetentionSnapshot(); },
        [](std::uint64_t* free_bytes, std::string*) {
            *free_bytes = 1024ULL * 1024ULL;
            return true;
        },
        [&root](const std::filesystem::path& path, std::string* detail) {
            return recording::RemoveContainedMediaFile(root, path, detail);
        },
        retention_options);
    RetentionPolicy policy;
    policy.continuous_max_bytes = 1024ULL * 1024ULL;
    policy.continuous_max_age_ms = 100000;
    policy.event_max_bytes = 1024ULL * 1024ULL;
    policy.event_max_age_ms = 100000;
    Expect(retention.UpdateChannelPolicy("cam-queue", policy, &error),
           "queue policy 실패: " + error);
    FakeDeriver slow_deriver([](const EventClipDeriveRequest&) {
        std::this_thread::sleep_for(std::chrono::milliseconds(80));
    });
    recording::CatalogEventRecordingBridge::Options bridge_options;
    bridge_options.output_root = root;
    bridge_options.now_ms = [] { return 20000LL; };
    bridge_options.max_pending_jobs = 1;
    recording::CatalogEventRecordingBridge bridge(
        catalog, retention, slow_deriver, bridge_options);
    EventMediaHookOptions hook_options;
    EventRecord first = MakePtsEvent("evt-queue-1", "cam-queue");
    EventRecord second = MakePtsEvent("evt-queue-2", "cam-queue");
    EventRecord third = MakePtsEvent("evt-queue-3", "cam-queue");
    analysis::AnalysisResult result;
    result.source_key = "cam-queue";
    bridge.TryResolve(result, first, hook_options);
    bridge.TryResolve(result, second, hook_options);
    bridge.TryResolve(result, third, hook_options);
    WaitUntil([&] {
        for (const auto& id : {first.event_id, second.event_id, third.event_id}) {
            const auto link = catalog.FindEventLinkByEventId(id);
            if (!link.has_value() || link->status != EventRecordingLinkStatus::Complete) return false;
        }
        return true;
    }, "queue 포화 뒤 durable pending refill timeout");
    Expect(slow_deriver.calls == 3,
           "bounded queue 밖 durable pending도 완료 뒤 다시 흡수해야 함");
    bridge.StopAndDrain();

    BlockingDeriver blocking_deriver;
    recording::CatalogEventRecordingBridge blocking_bridge(
        catalog, retention, blocking_deriver, bridge_options);
    EventRecord blocking_first = MakePtsEvent("evt-blocking-1", "cam-queue");
    EventRecord blocking_second = MakePtsEvent("evt-blocking-2", "cam-queue");
    blocking_bridge.TryResolve(result, blocking_first, hook_options);
    blocking_deriver.WaitForEntry();
    auto second_resolution = std::async(std::launch::async, [&] {
        return blocking_bridge.TryResolve(result, blocking_second, hook_options);
    });
    const bool second_prompt = second_resolution.wait_for(std::chrono::milliseconds(100)) ==
                               std::future_status::ready;
    blocking_deriver.Release();
    const auto second_result = second_resolution.get();
    Expect(second_prompt && second_result.handled,
           "긴 event remux가 다른 이벤트의 durable link admission을 동기 차단하면 안 됨");
    WaitUntil([&] {
        const auto first_link = catalog.FindEventLinkByEventId(blocking_first.event_id);
        const auto second_link = catalog.FindEventLinkByEventId(blocking_second.event_id);
        return first_link.has_value() && second_link.has_value() &&
               first_link->status == EventRecordingLinkStatus::Complete &&
               second_link->status == EventRecordingLinkStatus::Complete;
    }, "비동기 remux 뒤 두 event link 완료 timeout");
    blocking_bridge.StopAndDrain();

    CleanupFailDeriver cleanup_fail;
    recording::CatalogEventRecordingBridge failing_bridge(
        catalog, retention, cleanup_fail, bridge_options);
    EventRecord cleanup_event = MakePtsEvent("evt-cleanup-fail", "cam-queue");
    failing_bridge.TryResolve(result, cleanup_event, hook_options);
    WaitUntil([&] {
        const auto link = catalog.FindEventLinkByEventId(cleanup_event.event_id);
        return link.has_value() &&
               link->completeness_reason == "event-cleanup-recovery-pending";
    }, "cleanup 실패 pending 판정 timeout");
    const auto snapshot = catalog.RetentionSnapshot();
    bool source_held = false;
    for (const auto& candidate : snapshot.candidates) {
        if (candidate.segment.segment_id == "queue-source") {
            source_held = candidate.hold_count == 1;
        }
    }
    Expect(source_held,
           "cleanup 실패 시 source hold와 event reservation을 성공처럼 해제하면 안 됨");
    failing_bridge.StopAndDrain();

    MarkerCleanupDeriver marker_deriver;
    auto marker_options = bridge_options;
    marker_options.remove_media_file =
        [](const std::filesystem::path& media_root,
                const std::filesystem::path& path,
                std::string* detail) {
            if (path.extension() == ".cleanup-pending") {
                if (detail != nullptr) *detail = "injected-marker-unlink-failure";
                return false;
            }
            return recording::RemoveContainedMediaFile(media_root, path, detail);
        };
    recording::CatalogEventRecordingBridge marker_bridge(
        catalog, retention, marker_deriver, marker_options);
    EventRecord marker_event = MakePtsEvent("evt-marker-cleanup-fail", "cam-queue");
    marker_event.time_basis = "utc-ms";
    marker_event.time_anchor_utc_ms = 0;
    marker_event.time_anchor_pts_ms = 0;
    marker_event.stream_epoch_id.clear();
    marker_event.start_time_ms = 10300;
    marker_event.update_time_ms = 11000;
    marker_event.end_time_ms = 12000;
    marker_bridge.TryResolve(result, marker_event, hook_options);
    WaitUntil([&] {
        const auto link = catalog.FindEventLinkByEventId(marker_event.event_id);
        return link.has_value() && link->status == EventRecordingLinkStatus::Pending &&
               link->completeness_reason == "event-marker-cleanup-recovery-pending" &&
               link->derived_segment_id.has_value();
    }, "terminal marker unlink 실패가 recovery-pending으로 남지 않음");
    const auto marker_link = catalog.FindEventLinkByEventId(marker_event.event_id);
    const auto marker_snapshot = catalog.RetentionSnapshot();
    Expect(marker_link.has_value() && marker_link->derived_segment_id.has_value() &&
               SnapshotHasHold(marker_snapshot, "queue-source") &&
               SnapshotHasHold(marker_snapshot, *marker_link->derived_segment_id),
           "terminal marker unlink 실패 시 source/output hold를 유지해야 함");
    const std::string reservation_id =
        "event-reservation-sha256-" +
        marker_link->link_id.substr(std::string("event-link-sha256-").size());
    const auto duplicate_reservation = retention.AdmitEventWrite(
        "cam-queue", reservation_id, 1, 20001);
    Expect(!duplicate_reservation.allowed &&
               duplicate_reservation.message.find("이미 존재") != std::string::npos,
           "terminal marker unlink 실패 시 event reservation을 유지해야 함");
    auto marker_update = marker_event;
    marker_update.end_time_ms = 12500;
    marker_update.clip_path = (root / "marker-fallback.mp4").string();
    WriteBytes(marker_update.clip_path, 17, 'f');
    const auto marker_update_result =
        marker_bridge.TryResolve(result, marker_update, hook_options);
    marker_bridge.RecordFallback(marker_update, marker_update_result);
    const auto protected_marker = catalog.FindEventLinkByEventId(marker_event.event_id);
    Expect(protected_marker.has_value() &&
               protected_marker->derived_segment_id == marker_link->derived_segment_id &&
               protected_marker->completeness_reason == "event-marker-cleanup-recovery-pending" &&
               protected_marker->requested_range->end_ms == 12000 &&
               recording::SerializeEventRecordingLinkV1(*protected_marker).find(
                   "\"deferred_requested_range\"") != std::string::npos,
           "marker 복구 중 event/fallback 갱신은 자원·단계를 보존하고 확장 요청을 내구 대기해야 함");
    marker_bridge.StopAndDrain();

    std::atomic<bool> terminal_release_allowed{false};
    std::atomic<std::int64_t> terminal_retry_now{20000};
    auto recovery_options = bridge_options;
    recovery_options.now_ms = [&terminal_retry_now] { return terminal_retry_now.load(); };
    recovery_options.terminal_release_guard =
        [&terminal_release_allowed](std::string* detail) {
            if (!terminal_release_allowed.load()) {
                if (detail != nullptr) *detail = "injected-terminal-release-failure";
                return false;
            }
            return true;
        };
    recording::CatalogEventRecordingBridge marker_recovery_bridge(
        catalog, retention, marker_deriver, recovery_options);
    WaitUntil([&] {
        const auto link = catalog.FindEventLinkByEventId(marker_event.event_id);
        return link.has_value() && link->status == EventRecordingLinkStatus::Pending &&
               link->completeness_reason == "event-terminal-output-release-pending";
    }, "terminal hold 해제 실패가 recovery-pending으로 남지 않음");
    const auto terminal_pending =
        catalog.FindEventLinkByEventId(marker_event.event_id);
    const auto terminal_snapshot = catalog.RetentionSnapshot();
    Expect(terminal_pending.has_value() && terminal_pending->derived_segment_id.has_value() &&
               SnapshotHasHold(terminal_snapshot, "queue-source") &&
               SnapshotHasHold(terminal_snapshot, *terminal_pending->derived_segment_id),
           "terminal hold 해제 실패를 Complete로 기록하면 안 됨");
    const auto terminal_update_result =
        marker_recovery_bridge.TryResolve(result, marker_update, hook_options);
    marker_recovery_bridge.RecordFallback(marker_update, terminal_update_result);
    const auto protected_terminal = catalog.FindEventLinkByEventId(marker_event.event_id);
    Expect(protected_terminal.has_value() &&
               protected_terminal->derived_segment_id == terminal_pending->derived_segment_id &&
               protected_terminal->completeness_reason == "event-terminal-output-release-pending",
           "terminal 복구 중 event/fallback 갱신이 release 단계를 덮어쓰면 안 됨");
    terminal_release_allowed.store(true);
    terminal_retry_now.store(21000);
    WaitUntil([&] {
        const auto link = catalog.FindEventLinkByEventId(marker_event.event_id);
        return link.has_value() && link->status == EventRecordingLinkStatus::Complete;
    }, "빈 epoch 추론 뒤 marker recovery가 동일 event segment를 복구하지 못함");
    const auto recovered_marker_link =
        catalog.FindEventLinkByEventId(marker_event.event_id);
    Expect(recovered_marker_link.has_value() &&
               recovered_marker_link->stream_epoch_id == "epoch-cam-queue" &&
               recovered_marker_link->requested_range->end_ms == 12500 &&
               recovered_marker_link->derived_segment_id != marker_link->derived_segment_id,
           "복구 완료 뒤 내구 대기한 범위 확장은 같은 source epoch의 새 segment로 파생해야 함");
    marker_recovery_bridge.StopAndDrain();

    auto complete_commit_retry = *recovered_marker_link;
    complete_commit_retry.status = EventRecordingLinkStatus::Pending;
    complete_commit_retry.completeness_reason =
        "event-terminal-complete-commit-pending";
    complete_commit_retry.updated_at_ms = 22000;
    Expect(catalog.PutEventLink(complete_commit_retry, &error),
           "terminal complete commit retry fixture 저장 실패: " + error);
    {
        recording::CatalogEventRecordingBridge complete_commit_bridge(
            catalog, retention, marker_deriver, bridge_options);
        WaitUntil([&] {
            const auto link = catalog.FindEventLinkByEventId(marker_event.event_id);
            return link.has_value() && link->status == EventRecordingLinkStatus::Complete;
        }, "terminal complete commit retry timeout");
        complete_commit_bridge.StopAndDrain();
    }
    Expect(SnapshotHasHold(catalog.RetentionSnapshot(), "queue-source"),
           "complete commit 재시도는 다른 pending event의 source hold를 해제하면 안 됨");

    std::uint64_t queue_source_hold = 0;
    for (const auto& candidate : catalog.RetentionSnapshot().candidates) {
        if (candidate.segment.segment_id == "queue-source") {
            queue_source_hold = candidate.hold_count;
        }
    }
    Expect(queue_source_hold <=
               static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max()),
           "overflow fixture 이전 hold_count가 저장 범위를 넘으면 안 됨");
    const auto overflow_delta = std::numeric_limits<std::int64_t>::max() -
        static_cast<std::int64_t>(queue_source_hold);
    Expect(catalog.AdjustHoldCount("queue-source", overflow_delta, &error),
           "hold overflow fixture 준비 실패: " + error);
    recording::EventSourceLease overflow_lease;
    Expect(!catalog.AcquireEventSourceLease("cam-queue", "epoch-cam-queue",
                                            {"queue-source"}, &overflow_lease, &error) &&
               error.find("저장 범위") != std::string::npos,
           "event source lease hold_count overflow를 사전에 거부해야 함");
}

void VerifyPendingDerivedHoldRecovery(const std::filesystem::path& root) {
    const std::string digest =
        "f298b9e7bbe4570995e9b4f213ba2568400fd7b4b7584b3d3490c2f1f0f9f855";
    const std::string epoch_digest =
        "ac40171c586a351e88961559469e47ac2db14b757e6704d0cad259c11b35a54a";
    const auto journal_path = root / "hold-mutations.jsonl";
    {
        RecordingJournal journal(journal_path);
        std::string error;
        Expect(journal.Open(&error), "hold fixture journal open 실패: " + error);
        RecordingCatalog catalog(journal, {root / "hold-first.sqlite3", root, false});
        Expect(catalog.Open(&error), "hold fixture catalog open 실패: " + error);
        StoreSegment(&catalog, root, MakeSegment("hold-source", "cam-hold", 10000, 13000,
                                                 0, 3000,
                                                 RecordingRetentionClass::Continuous, 20));
        auto event_segment = MakeSegment("event-seg-sha256-" + digest, "cam-hold",
                                         10300, 12500, 0, 2200,
                                         RecordingRetentionClass::Event, 20);
        event_segment.stream_epoch_id = "event-epoch-sha256-" + epoch_digest;
        StoreSegment(&catalog, root, event_segment);
        recording::EventRecordingLinkV1 pending;
        pending.link_id = "event-link-sha256-" + digest;
        pending.event_id = "evt-hold-recovery";
        pending.source_id = "cam-hold";
        pending.channel_id = "cam-hold";
        pending.stream_epoch_id = "epoch-cam-hold";
        pending.requested_range = {10300, 12500};
        pending.ordered_overlaps = {{"hold-source", {10300, 12500}}};
        pending.derived_segment_id = event_segment.segment_id;
        pending.time_basis = "media-pts-ms";
        pending.status = EventRecordingLinkStatus::Pending;
        pending.completeness_reason = "event-catalog-finalize-recovery-pending";
        pending.created_at_ms = 20000;
        pending.updated_at_ms = 20000;
        Expect(catalog.PutEventLink(pending, &error),
               "hold pending link 저장 실패: " + error);
    }
    RecordingJournal replay_journal(journal_path);
    std::string error;
    Expect(replay_journal.Open(&error), "hold replay journal open 실패: " + error);
    RecordingCatalog replay_catalog(
        replay_journal, {root / "hold-replay.sqlite3", root, false});
    Expect(replay_catalog.Open(&error), "hold replay catalog open 실패: " + error);
    const auto replay_snapshot = replay_catalog.RetentionSnapshot();
    Expect(SnapshotHasHold(replay_snapshot, "event-seg-sha256-" + digest) &&
               SnapshotHasHold(replay_snapshot, "hold-source"),
           "재시작 replay가 terminal 전 output/source hold를 함께 복원해야 함");
    const auto replay_link =
        replay_catalog.FindEventLinkByEventId("evt-hold-recovery");
    Expect(replay_link.has_value(), "terminal stage fixture event link 조회");
    auto terminal_committed = *replay_link;
    terminal_committed.completeness_reason =
        "event-terminal-complete-commit-pending";
    terminal_committed.updated_at_ms = 21000;
    Expect(replay_catalog.PutEventLink(terminal_committed, &error),
           "terminal stage fixture 저장 실패: " + error);
    RecordingJournal terminal_journal(journal_path);
    Expect(terminal_journal.Open(&error), "terminal stage replay journal open: " + error);
    RecordingCatalog terminal_catalog(
        terminal_journal, {root / "hold-terminal.sqlite3", root, false});
    Expect(terminal_catalog.Open(&error), "terminal stage catalog open: " + error);
    const auto terminal_snapshot = terminal_catalog.RetentionSnapshot();
    Expect(!SnapshotHasHold(terminal_snapshot, "event-seg-sha256-" + digest) &&
               !SnapshotHasHold(terminal_snapshot, "hold-source"),
           "complete commit 단계 재시작은 이미 해제된 output/source hold를 복원하면 안 됨");
    Expect(!terminal_catalog.RequestDeletion("hold-source", "test-retention-race", &error),
           "terminal Complete 기록 전 source 삭제 요청을 차단해야 함");
    Expect(!terminal_catalog.RequestDeletion(
               "event-seg-sha256-" + digest, "test-retention-race", &error),
           "terminal Complete 기록 전 output 삭제 요청을 차단해야 함");
}

void VerifyRestartRecoveryAndIdConflict(const std::filesystem::path& root) {
    RecordingJournal journal(root / "restart-mutations.jsonl");
    std::string error;
    Expect(journal.Open(&error), "restart journal open 실패: " + error);
    RecordingCatalog catalog(journal, {root / "restart.sqlite3", root, true});
    Expect(catalog.Open(&error), "restart catalog open 실패: " + error);

    const std::string restart_digest =
        "2197dde8e65af4710a8e7b81d87c2f1b4b432d732a8d755fb6348710bb492aaf";
    const std::string restart_output_digest =
        "03c6004365766c1eb89a70b1389c54ff0cc44dc1a464439fe1c1cca29b2b7eed";
    const std::string restart_epoch_digest =
        "b786f5a34fa4739dff28c1a7afbc36cd16f8e4bb3f3dfce42f83f892e0896573";
    StoreSegment(&catalog, root, MakeSegment(
        "restart-source", "cam-r", 10000, 12500, 0, 2500,
        RecordingRetentionClass::Continuous, 23));
    auto recovered_segment = MakeSegment(
        "event-seg-sha256-" + restart_output_digest, "cam-r", 10000, 12500, 0, 2500,
        RecordingRetentionClass::Event, 23);
    recovered_segment.stream_epoch_id = "event-epoch-sha256-" + restart_epoch_digest;
    StoreSegment(&catalog, root, recovered_segment);
    recording::EventRecordingLinkV1 pending;
    pending.link_id = "event-link-sha256-" + restart_digest;
    pending.event_id = "evt-restart";
    pending.source_id = "cam-r";
    pending.channel_id = "cam-r";
    pending.requested_range = {10300, 12500};
    pending.ordered_overlaps = {{"restart-source", {10300, 12500}}};
    pending.derived_segment_id = recovered_segment.segment_id;
    pending.time_basis = "media-pts-ms";
    pending.stream_epoch_id = "epoch-cam-r";
    pending.status = EventRecordingLinkStatus::Pending;
    pending.completeness_reason = "event-catalog-finalize-recovery-pending";
    pending.created_at_ms = 20000;
    pending.updated_at_ms = 20000;
    Expect(catalog.PutEventLink(pending, &error), "restart pending link 저장 실패: " + error);

    RetentionCoordinator::Options retention_options;
    retention_options.reserved_free_bytes = 1;
    retention_options.default_expected_segment_bytes = 1;
    retention_options.media_root = root;
    RetentionCoordinator retention(
        catalog,
        [&catalog] { return catalog.RetentionSnapshot(); },
        [](std::uint64_t* free_bytes, std::string*) {
            *free_bytes = 1024ULL * 1024ULL;
            return true;
        },
        [&root](const std::filesystem::path& path, std::string* error_message) {
            return recording::RemoveContainedMediaFile(root, path, error_message);
        },
        retention_options);
    FakeDeriver deriver(nullptr);
    recording::CatalogEventRecordingBridge::Options options;
    options.output_root = root;
    options.now_ms = [] { return 21000LL; };
    {
        recording::CatalogEventRecordingBridge bridge(
            catalog, retention, deriver, options);
        WaitUntil([&] {
            const auto link = catalog.FindEventLinkByEventId("evt-restart");
            return link.has_value() && link->status == EventRecordingLinkStatus::Complete;
        }, "restart pending link 복구 timeout");
        const auto recovered = catalog.FindEventLinkByEventId("evt-restart");
        Expect(recovered.has_value() && recovered->derived_segment_id ==
                                              std::optional<std::string>(recovered_segment.segment_id) &&
                   recovered->derived_actual_range.has_value(),
               "재시작은 이미 finalized된 결정적 event segment를 재파생 없이 연결해야 함");
        bridge.StopAndDrain();
    }
    Expect(deriver.calls == 0, "재시작 복구에서 event clip을 중복 파생하면 안 됨");

    const std::string conflict_digest =
        "ac61328ce5a21110734802260d67314e05587e9ec64f1ef7587ae9cc1a48cca4";
    const std::string conflict_output_digest =
        "a6d93cdcdb7d5b6ee0e353fbb17b6fc36b38c0b448aeae83e463714a6453f051";
    auto conflicting_segment = MakeSegment(
        "event-seg-sha256-" + conflict_output_digest, "other-channel", 10000, 12500, 0, 2500,
        RecordingRetentionClass::Continuous, 23);
    StoreSegment(&catalog, root, conflicting_segment);
    recording::EventRecordingLinkV1 conflict = pending;
    conflict.link_id = "event-link-sha256-" + conflict_digest;
    conflict.event_id = "evt-conflict";
    conflict.ordered_overlaps.clear();
    conflict.derived_segment_id.reset();
    conflict.completeness_reason = "pending-finalized-segments";
    Expect(catalog.PutEventLink(conflict, &error), "conflict pending link 저장 실패: " + error);
    {
        recording::CatalogEventRecordingBridge bridge(
            catalog, retention, deriver, options);
        WaitUntil([&] {
            const auto link = catalog.FindEventLinkByEventId("evt-conflict");
            return link.has_value() && link->status == EventRecordingLinkStatus::Failed;
        }, "deterministic segment ID conflict 판정 timeout");
        const auto conflict_link = catalog.FindEventLinkByEventId("evt-conflict");
        Expect(conflict_link.has_value() &&
                   conflict_link->completeness_reason == "event-segment-id-conflict" &&
                   !conflict_link->derived_segment_id.has_value(),
               "다른 channel/class의 동일 segment ID를 event 결과로 오인하면 안 됨");
        bridge.StopAndDrain();
    }
    Expect(deriver.calls == 0, "segment ID conflict에서 파생을 실행하면 안 됨");
}

void VerifyRealRemux(const std::filesystem::path& root,
                     const std::filesystem::path& sample_path) {
    std::filesystem::create_directories(root / "cam-remux");
    const auto first_path = root / "cam-remux" / "source-1.mp4";
    const auto second_path = root / "cam-remux" / "source-2.mp4";
    std::filesystem::copy_file(sample_path, first_path,
                               std::filesystem::copy_options::overwrite_existing);
    std::filesystem::copy_file(sample_path, second_path,
                               std::filesystem::copy_options::overwrite_existing);
    recording::EventClipDeriveRequest request;
    request.event_id = "evt-real-remux";
    request.link_id = "event-link-evt-real-remux";
    request.output_segment_id = "event-seg-evt-real-remux";
    request.source_id = "cam-remux";
    request.channel_id = "cam-remux";
    request.requested_range = {1200, 2800};
    request.output_root = root;
    auto first = MakeSegment("source-1", "cam-remux", 1000, 2000, 0, 1000,
                             RecordingRetentionClass::Continuous,
                             std::filesystem::file_size(first_path));
    auto second = MakeSegment("source-2", "cam-remux", 2000, 3000, 1000, 2000,
                              RecordingRetentionClass::Continuous,
                              std::filesystem::file_size(second_path));
    request.sources.push_back({first, first_path, {1200, 2000}});
    request.sources.push_back({second, second_path, {2000, 2800}});
    recording::GStreamerEventClipDeriver deriver;
    const auto result = deriver.Derive(request);
    Expect(result.ok, "실제 H264/MP4 source를 video 재인코딩 없이 remux해야 함: " +
                          result.error);
    if (result.ok) {
        Expect(std::filesystem::is_regular_file(result.media_path) &&
                   result.size_bytes == std::filesystem::file_size(result.media_path),
               "remux 결과 파일과 size가 일치해야 함");
        Expect(result.actual_range.start_ms <= request.requested_range.start_ms &&
                   result.actual_range.end_ms >= request.requested_range.end_ms &&
                   result.actual_range.start_ms < request.requested_range.start_ms,
               "event clip actual range는 keyframe 확대를 측정해 requested range와 분리해야 함");
        Expect(result.size_bytes < std::filesystem::file_size(first_path) * 2,
               "event clip이 source segment 전체 단순 연결보다 작아야 함");
        Expect(result.checksum_sha256.size() == 64 &&
                   std::filesystem::is_regular_file(result.cleanup_marker_path),
               "remux 결과 checksum과 crash cleanup marker를 남겨야 함");
        const auto original_size = std::filesystem::file_size(result.media_path);
        const auto duplicate = deriver.Derive(request);
        Expect(!duplicate.ok && duplicate.cleanup_complete &&
                   std::filesystem::is_regular_file(result.media_path) &&
                   std::filesystem::file_size(result.media_path) == original_size,
               "동일 final은 소유 artifact가 없는 terminal 충돌로 거부하고 기존 clip을 보존해야 함");
#if MEDIA_SERVER_USE_GSTREAMER
        std::string playback_error;
        Expect(RunPipelineToEos(
                   "filesrc location=\"" + result.media_path.string() +
                   "\" ! tsdemux ! h264parse ! fakesink sync=false",
                   &playback_error),
               "파생 H264/MP4 clip이 끝까지 demux/parse 가능해야 함: " + playback_error);
#endif
        const auto foreign_partial =
            std::filesystem::path(result.media_path.string() + ".partial");
        const auto foreign_size = std::filesystem::file_size(result.media_path);
        recording::RemoveContainedMediaFile(root, result.cleanup_marker_path, nullptr);
        std::filesystem::rename(result.media_path, foreign_partial);
        const auto partial_collision = deriver.Derive(request);
        Expect(partial_collision.ok &&
                   std::filesystem::is_regular_file(foreign_partial) &&
                   std::filesystem::file_size(foreign_partial) == foreign_size &&
                   std::filesystem::is_regular_file(partial_collision.media_path),
               "nonce partial은 foreign 고정 partial을 보존하면서 독립 파생되어야 함");
        recording::RemoveContainedMediaFile(root, partial_collision.cleanup_marker_path, nullptr);
        recording::RemoveContainedMediaFile(root, partial_collision.media_path, nullptr);
        recording::RemoveContainedMediaFile(root, foreign_partial, nullptr);

        auto crash_request = request;
        crash_request.event_id = "evt-real-remux-crash";
        crash_request.link_id = "event-link-evt-real-remux-crash";
        crash_request.output_segment_id = "event-seg-evt-real-remux-crash";
        const auto crash_final = result.media_path.parent_path() /
                                 (crash_request.output_segment_id + ".ts");
        const auto crash_partial = result.media_path.parent_path() /
            (crash_request.output_segment_id +
             ".ts.partial.123e4567-e89b-42d3-a456-426614174001");
        const auto crash_marker = std::filesystem::path(
            crash_final.string() + ".cleanup-pending");
        WriteBytes(crash_partial, 17, 'c');
        {
            std::ofstream marker_output(crash_marker, std::ios::binary | std::ios::trunc);
            marker_output << "recording-cleanup-pending-v2\npartial="
                          << crash_partial.filename().string() << "\n";
        }
        RecordingJournal recovery_journal(root / "event-remux-recovery.jsonl");
        std::string recovery_error;
        Expect(recovery_journal.Open(&recovery_error),
               "event remux recovery journal open 실패: " + recovery_error);
        RecordingCatalog recovery_catalog(
            recovery_journal, {root / "event-remux-recovery.sqlite3", root, false});
        Expect(recovery_catalog.Open(&recovery_error) &&
                   !std::filesystem::exists(crash_partial) &&
                   !std::filesystem::exists(crash_marker),
               "재시작은 marker nonce와 일치하는 owned crash partial만 정리해야 함: " +
                   recovery_error);
        const auto recovered = deriver.Derive(crash_request);
        Expect(recovered.ok && std::filesystem::is_regular_file(recovered.media_path),
               "owned crash partial 복구 뒤 동일 event clip 재파생이 성공해야 함: " +
                   recovered.error);
        recording::RemoveContainedMediaFile(root, recovered.cleanup_marker_path, nullptr);
        recording::RemoveContainedMediaFile(root, recovered.media_path, nullptr);
    }
}

void VerifyRealVp8Remux(const std::filesystem::path& root) {
#if MEDIA_SERVER_USE_GSTREAMER
    std::filesystem::create_directories(root / "cam-vp8");
    const auto source_path = root / "cam-vp8" / "source.webm";
    std::string pipeline_error;
    Expect(RunPipelineToEos(
               "videotestsrc num-buffers=60 ! video/x-raw,framerate=30/1 ! "
               "vp8enc deadline=1 keyframe-max-dist=10 ! webmmux ! filesink location=\"" +
                   source_path.string() + "\"",
               &pipeline_error),
           "VP8/WebM test source 생성 실패: " + pipeline_error);
    Expect(RunPipelineToEos(
               "filesrc location=\"" + source_path.string() +
                   "\" ! matroskademux name=d d.video_0 ! fakesink sync=false",
               &pipeline_error),
           "VP8/WebM test source demux 실패: " + pipeline_error);
    auto segment = MakeSegment("vp8-source", "cam-vp8", 1000, 3000, 0, 2000,
                               RecordingRetentionClass::Continuous,
                               std::filesystem::file_size(source_path));
    segment.container = "webm";
    segment.video_codecs = {"vp8"};
    recording::EventClipDeriveRequest request;
    request.event_id = "evt-vp8";
    request.link_id = "event-link-vp8";
    request.output_segment_id = "event-seg-vp8";
    request.source_id = "cam-vp8";
    request.channel_id = "cam-vp8";
    request.requested_range = {1300, 2400};
    request.sources.push_back({segment, source_path, {1300, 2400}});
    request.output_root = root;
    recording::GStreamerEventClipDeriver deriver;
    const auto result = deriver.Derive(request);
    Expect(!result.ok && result.cleanup_complete &&
               result.error.find("H264/MP4") != std::string::npos &&
               result.media_path.empty(),
           "검증되지 않은 VP8/WebM event remux는 산출물 없이 fail-closed해야 함");
#else
    (void)root;
#endif
}

}  // namespace

int main(int argc, char** argv) {
    try {
        if (argc != 3) {
            throw std::runtime_error(
                "사용법: event_recording_link_smoke <build-dir> <h264-video-only-sample>");
        }
        const std::filesystem::path root = std::filesystem::path(argv[1]) / "recordings";
        std::filesystem::remove_all(root);
        std::filesystem::create_directories(root);
        VerifyLinkContractInvariants();
        VerifyEventLinking(root / "linking");
        VerifyDeferredFailureAndPtsUpdates(root / "deferred-updates");
        VerifyEventQuotaIsolation(root / "quota");
        VerifyQueueRefillAndCleanupHold(root / "queue-cleanup");
        VerifyPendingDerivedHoldRecovery(root / "derived-hold-recovery");
        VerifyRestartRecoveryAndIdConflict(root / "restart");
        VerifyRealRemux(root / "remux", argv[2]);
        VerifyRealVp8Remux(root / "remux-vp8");
        std::cout << "[verify-v410-event-recording] pass=" << g_pass << " fail=0\n";
        return 0;
    } catch (const std::exception& ex) {
        std::cerr << "[fail] " << ex.what() << "\n";
        std::cerr << "[verify-v410-event-recording] pass=" << g_pass << " fail=1\n";
        return 1;
    }
}
