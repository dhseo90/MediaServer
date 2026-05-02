// 파일 요약: 런타임 안정화 진단용 최소 debug counter를 제공한다.
// 동작 요약: RTSP/GStreamer egress, fanout, metadata JSON 계측 값을 atomic으로 누적한다.
#pragma once

#include <atomic>
#include <cstdlib>
#include <cstdint>
#include <iostream>
#include <mutex>
#include <sstream>
#include <string>

namespace core::runtime_debug {

enum class RtspAppsrcFlowPhase : int {
    NotStarted = 0,
    Active = 1,
    Stopping = 2,
    Stopped = 3,
};

enum class RtspAppsrcFlowReturnKind : int {
    Ok = 0,
    Flushing = 1,
    Eos = 2,
    Error = 3,
    NotLinked = 4,
    NotNegotiated = 5,
    OtherError = 6,
};

struct CountersSnapshot {
    std::uint64_t rtsp_media_configured_count{0};
    std::uint64_t rtsp_media_unprepared_count{0};
    std::uint64_t rtsp_egress_session_created_count{0};
    std::uint64_t rtsp_egress_session_started_count{0};
    std::uint64_t rtsp_egress_session_stopped_count{0};
    std::uint64_t rtsp_egress_session_destroyed_count{0};
    std::uint64_t rtsp_appsrc_push_ok_count{0};
    std::uint64_t rtsp_appsrc_push_fail_count{0};
    std::uint64_t rtsp_appsrc_flow_error_count{0};
    std::uint64_t rtsp_appsrc_flow_flushing_count{0};
    std::uint64_t rtsp_appsrc_flow_eos_count{0};
    std::uint64_t rtsp_appsrc_flow_error_return_count{0};
    std::uint64_t rtsp_appsrc_flow_not_linked_count{0};
    std::uint64_t rtsp_appsrc_flow_not_negotiated_count{0};
    std::uint64_t rtsp_appsrc_flow_other_error_count{0};
    std::uint64_t rtsp_appsrc_flow_error_after_stop_count{0};
    std::uint64_t rtsp_appsrc_flow_error_during_active_count{0};
    std::uint64_t rtsp_appsrc_flow_error_during_stopping_count{0};
    int rtsp_appsrc_last_flow_return{0};
    int rtsp_appsrc_last_flow_return_phase{0};
    std::uint64_t rtsp_pending_queue_peak{0};
    std::uint64_t rtsp_pending_queue_size_at_stop{0};
    std::uint64_t rtsp_pending_queue_size_at_destroy{0};
    std::uint64_t rtsp_pending_queue_flushed_count{0};
    std::uint64_t rtsp_pending_queue_dropped_count{0};
    std::uint64_t appsrc_push_after_stop_count{0};
    std::uint64_t rtsp_pipeline_null_transition_count{0};
    std::uint64_t bus_watch_created_count{0};
    std::uint64_t bus_watch_destroyed_count{0};
    std::uint64_t appsrc_eos_sent_count{0};
    std::uint64_t appsrc_cleared_count{0};
    std::uint64_t overlay_probe_attached_count{0};
    std::uint64_t overlay_probe_removed_count{0};
    std::uint64_t shared_stream_subscriber_added_count{0};
    std::uint64_t shared_stream_subscriber_removed_count{0};
    std::uint64_t analysis_tap_attached_count{0};
    std::uint64_t analysis_tap_detached_count{0};
    std::uint64_t metadata_json_build_count{0};
    std::uint64_t metadata_json_bytes_total{0};
    std::uint64_t metadata_json_bytes_max{0};
};

inline std::atomic<std::uint64_t> g_rtsp_media_configured_count{0};
inline std::atomic<std::uint64_t> g_rtsp_media_unprepared_count{0};
inline std::atomic<std::uint64_t> g_rtsp_egress_session_created_count{0};
inline std::atomic<std::uint64_t> g_rtsp_egress_session_started_count{0};
inline std::atomic<std::uint64_t> g_rtsp_egress_session_stopped_count{0};
inline std::atomic<std::uint64_t> g_rtsp_egress_session_destroyed_count{0};
inline std::atomic<std::uint64_t> g_rtsp_appsrc_push_ok_count{0};
inline std::atomic<std::uint64_t> g_rtsp_appsrc_push_fail_count{0};
inline std::atomic<std::uint64_t> g_rtsp_appsrc_flow_error_count{0};
inline std::atomic<std::uint64_t> g_rtsp_appsrc_flow_flushing_count{0};
inline std::atomic<std::uint64_t> g_rtsp_appsrc_flow_eos_count{0};
inline std::atomic<std::uint64_t> g_rtsp_appsrc_flow_error_return_count{0};
inline std::atomic<std::uint64_t> g_rtsp_appsrc_flow_not_linked_count{0};
inline std::atomic<std::uint64_t> g_rtsp_appsrc_flow_not_negotiated_count{0};
inline std::atomic<std::uint64_t> g_rtsp_appsrc_flow_other_error_count{0};
inline std::atomic<std::uint64_t> g_rtsp_appsrc_flow_error_after_stop_count{0};
inline std::atomic<std::uint64_t> g_rtsp_appsrc_flow_error_during_active_count{0};
inline std::atomic<std::uint64_t> g_rtsp_appsrc_flow_error_during_stopping_count{0};
inline std::atomic<int> g_rtsp_appsrc_last_flow_return{0};
inline std::atomic<int> g_rtsp_appsrc_last_flow_return_phase{0};
inline std::atomic<std::uint64_t> g_rtsp_pending_queue_peak{0};
inline std::atomic<std::uint64_t> g_rtsp_pending_queue_size_at_stop{0};
inline std::atomic<std::uint64_t> g_rtsp_pending_queue_size_at_destroy{0};
inline std::atomic<std::uint64_t> g_rtsp_pending_queue_flushed_count{0};
inline std::atomic<std::uint64_t> g_rtsp_pending_queue_dropped_count{0};
inline std::atomic<std::uint64_t> g_appsrc_push_after_stop_count{0};
inline std::atomic<std::uint64_t> g_rtsp_pipeline_null_transition_count{0};
inline std::atomic<std::uint64_t> g_bus_watch_created_count{0};
inline std::atomic<std::uint64_t> g_bus_watch_destroyed_count{0};
inline std::atomic<std::uint64_t> g_appsrc_eos_sent_count{0};
inline std::atomic<std::uint64_t> g_appsrc_cleared_count{0};
inline std::atomic<std::uint64_t> g_overlay_probe_attached_count{0};
inline std::atomic<std::uint64_t> g_overlay_probe_removed_count{0};
inline std::atomic<std::uint64_t> g_shared_stream_subscriber_added_count{0};
inline std::atomic<std::uint64_t> g_shared_stream_subscriber_removed_count{0};
inline std::atomic<std::uint64_t> g_analysis_tap_attached_count{0};
inline std::atomic<std::uint64_t> g_analysis_tap_detached_count{0};
inline std::atomic<std::uint64_t> g_metadata_json_build_count{0};
inline std::atomic<std::uint64_t> g_metadata_json_bytes_total{0};
inline std::atomic<std::uint64_t> g_metadata_json_bytes_max{0};

inline void Increment(std::atomic<std::uint64_t>& counter, std::uint64_t amount = 1) {
    counter.fetch_add(amount, std::memory_order_relaxed);
}

inline void UpdateMax(std::atomic<std::uint64_t>& counter, std::uint64_t value) {
    std::uint64_t current = counter.load(std::memory_order_relaxed);
    while (current < value &&
           !counter.compare_exchange_weak(current, value, std::memory_order_relaxed, std::memory_order_relaxed)) {
    }
}

inline bool TraceEnabled() {
    static const bool enabled = [] {
        const char* value = std::getenv("MEDIA_SERVER_RUNTIME_DEBUG_COUNTER_TRACE");
        if (value == nullptr) {
            return false;
        }
        const std::string text(value);
        return !text.empty() && text != "0" && text != "false" && text != "FALSE";
    }();
    return enabled;
}

inline void TraceLifecycle(const std::string& event) {
    if (!TraceEnabled()) {
        return;
    }
    static std::mutex trace_mu;
    std::lock_guard lock(trace_mu);
    std::cerr << "[runtime-debug-counter] " << event << "\n";
}

inline void RecordRtspMediaConfigured(const std::string& session_id) {
    Increment(g_rtsp_media_configured_count);
    TraceLifecycle("rtsp.media.configured session=" + session_id);
}

inline void RecordRtspMediaUnprepared(const std::string& session_id) {
    Increment(g_rtsp_media_unprepared_count);
    TraceLifecycle("rtsp.media.unprepared session=" + session_id);
}

inline void RecordRtspEgressSessionCreated() {
    Increment(g_rtsp_egress_session_created_count);
    TraceLifecycle("rtsp.egress.created");
}

inline void RecordRtspEgressSessionStarted(const std::string& session_id) {
    Increment(g_rtsp_egress_session_started_count);
    TraceLifecycle("rtsp.egress.started session=" + session_id);
}

inline void RecordRtspEgressSessionStopped(const std::string& session_id) {
    Increment(g_rtsp_egress_session_stopped_count);
    TraceLifecycle("rtsp.egress.stopped session=" + session_id);
}

inline void RecordRtspEgressSessionDestroyed(const std::string& session_id) {
    Increment(g_rtsp_egress_session_destroyed_count);
    TraceLifecycle("rtsp.egress.destroyed session=" + session_id);
}

inline void RecordRtspAppsrcPush(bool ok) {
    Increment(ok ? g_rtsp_appsrc_push_ok_count : g_rtsp_appsrc_push_fail_count);
}

inline void RecordRtspAppsrcFlowReturn(int flow_return,
                                       RtspAppsrcFlowPhase phase,
                                       RtspAppsrcFlowReturnKind kind) {
    g_rtsp_appsrc_last_flow_return.store(flow_return, std::memory_order_relaxed);
    g_rtsp_appsrc_last_flow_return_phase.store(static_cast<int>(phase), std::memory_order_relaxed);
    if (kind == RtspAppsrcFlowReturnKind::Ok) {
        return;
    }

    Increment(g_rtsp_appsrc_flow_error_count);
    switch (kind) {
        case RtspAppsrcFlowReturnKind::Flushing:
            Increment(g_rtsp_appsrc_flow_flushing_count);
            break;
        case RtspAppsrcFlowReturnKind::Eos:
            Increment(g_rtsp_appsrc_flow_eos_count);
            break;
        case RtspAppsrcFlowReturnKind::Error:
            Increment(g_rtsp_appsrc_flow_error_return_count);
            break;
        case RtspAppsrcFlowReturnKind::NotLinked:
            Increment(g_rtsp_appsrc_flow_not_linked_count);
            break;
        case RtspAppsrcFlowReturnKind::NotNegotiated:
            Increment(g_rtsp_appsrc_flow_not_negotiated_count);
            break;
        case RtspAppsrcFlowReturnKind::OtherError:
            Increment(g_rtsp_appsrc_flow_other_error_count);
            break;
        case RtspAppsrcFlowReturnKind::Ok:
            break;
    }

    switch (phase) {
        case RtspAppsrcFlowPhase::Active:
            Increment(g_rtsp_appsrc_flow_error_during_active_count);
            break;
        case RtspAppsrcFlowPhase::Stopping:
            Increment(g_rtsp_appsrc_flow_error_during_stopping_count);
            break;
        case RtspAppsrcFlowPhase::Stopped:
            Increment(g_rtsp_appsrc_flow_error_after_stop_count);
            break;
        case RtspAppsrcFlowPhase::NotStarted:
            break;
    }
}

inline void RecordRtspAppsrcFlowError() {
    RecordRtspAppsrcFlowReturn(-1, RtspAppsrcFlowPhase::NotStarted, RtspAppsrcFlowReturnKind::OtherError);
}

inline void RecordRtspPendingQueueSize(std::uint64_t size) {
    UpdateMax(g_rtsp_pending_queue_peak, size);
}

inline void RecordRtspPendingQueueSizeAtStop(std::uint64_t size) {
    UpdateMax(g_rtsp_pending_queue_size_at_stop, size);
    if (size > 0) {
        TraceLifecycle("rtsp.pending.stop-size size=" + std::to_string(size));
    }
}

inline void RecordRtspPendingQueueSizeAtDestroy(std::uint64_t size) {
    UpdateMax(g_rtsp_pending_queue_size_at_destroy, size);
    if (size > 0) {
        TraceLifecycle("rtsp.pending.destroy-size size=" + std::to_string(size));
    }
}

inline void RecordRtspPendingQueueFlushed(std::uint64_t count) {
    Increment(g_rtsp_pending_queue_flushed_count, count);
}

inline void RecordRtspPendingQueueDrop() {
    Increment(g_rtsp_pending_queue_dropped_count);
}

inline void RecordAppsrcPushAfterStop() {
    Increment(g_appsrc_push_after_stop_count);
    Increment(g_rtsp_appsrc_flow_error_after_stop_count);
}

inline void RecordRtspPipelineNullTransition() {
    Increment(g_rtsp_pipeline_null_transition_count);
    TraceLifecycle("rtsp.pipeline.null");
}

inline void RecordBusWatchCreated() {
    Increment(g_bus_watch_created_count);
    TraceLifecycle("rtsp.bus-watch.created");
}

inline void RecordBusWatchDestroyed() {
    Increment(g_bus_watch_destroyed_count);
    TraceLifecycle("rtsp.bus-watch.destroyed");
}

inline void RecordAppsrcEosSent() {
    Increment(g_appsrc_eos_sent_count);
}

inline void RecordAppsrcCleared() {
    Increment(g_appsrc_cleared_count);
}

inline void RecordOverlayProbeAttached() {
    Increment(g_overlay_probe_attached_count);
    TraceLifecycle("rtsp.overlay-probe.attached");
}

inline void RecordOverlayProbeRemoved() {
    Increment(g_overlay_probe_removed_count);
    TraceLifecycle("rtsp.overlay-probe.removed");
}

inline void RecordSharedStreamSubscriberAdded(const char* role) {
    Increment(g_shared_stream_subscriber_added_count);
    TraceLifecycle(std::string("shared.subscriber.added role=") + (role != nullptr ? role : ""));
}

inline void RecordSharedStreamSubscriberRemoved(const char* role) {
    Increment(g_shared_stream_subscriber_removed_count);
    TraceLifecycle(std::string("shared.subscriber.removed role=") + (role != nullptr ? role : ""));
}

inline void RecordAnalysisTapAttached(const std::string& tap_id) {
    Increment(g_analysis_tap_attached_count);
    TraceLifecycle("analysis.tap.attached tap=" + tap_id);
}

inline void RecordAnalysisTapDetached(const std::string& tap_id) {
    Increment(g_analysis_tap_detached_count);
    TraceLifecycle("analysis.tap.detached tap=" + tap_id);
}

inline void RecordMetadataJsonBuild() {
    Increment(g_metadata_json_build_count);
}

inline void RecordMetadataJsonBytes(std::uint64_t bytes) {
    Increment(g_metadata_json_bytes_total, bytes);
    UpdateMax(g_metadata_json_bytes_max, bytes);
}

inline CountersSnapshot Snapshot() {
    return CountersSnapshot{
        .rtsp_media_configured_count = g_rtsp_media_configured_count.load(std::memory_order_relaxed),
        .rtsp_media_unprepared_count = g_rtsp_media_unprepared_count.load(std::memory_order_relaxed),
        .rtsp_egress_session_created_count =
            g_rtsp_egress_session_created_count.load(std::memory_order_relaxed),
        .rtsp_egress_session_started_count =
            g_rtsp_egress_session_started_count.load(std::memory_order_relaxed),
        .rtsp_egress_session_stopped_count =
            g_rtsp_egress_session_stopped_count.load(std::memory_order_relaxed),
        .rtsp_egress_session_destroyed_count =
            g_rtsp_egress_session_destroyed_count.load(std::memory_order_relaxed),
        .rtsp_appsrc_push_ok_count = g_rtsp_appsrc_push_ok_count.load(std::memory_order_relaxed),
        .rtsp_appsrc_push_fail_count = g_rtsp_appsrc_push_fail_count.load(std::memory_order_relaxed),
        .rtsp_appsrc_flow_error_count = g_rtsp_appsrc_flow_error_count.load(std::memory_order_relaxed),
        .rtsp_appsrc_flow_flushing_count = g_rtsp_appsrc_flow_flushing_count.load(std::memory_order_relaxed),
        .rtsp_appsrc_flow_eos_count = g_rtsp_appsrc_flow_eos_count.load(std::memory_order_relaxed),
        .rtsp_appsrc_flow_error_return_count =
            g_rtsp_appsrc_flow_error_return_count.load(std::memory_order_relaxed),
        .rtsp_appsrc_flow_not_linked_count =
            g_rtsp_appsrc_flow_not_linked_count.load(std::memory_order_relaxed),
        .rtsp_appsrc_flow_not_negotiated_count =
            g_rtsp_appsrc_flow_not_negotiated_count.load(std::memory_order_relaxed),
        .rtsp_appsrc_flow_other_error_count =
            g_rtsp_appsrc_flow_other_error_count.load(std::memory_order_relaxed),
        .rtsp_appsrc_flow_error_after_stop_count =
            g_rtsp_appsrc_flow_error_after_stop_count.load(std::memory_order_relaxed),
        .rtsp_appsrc_flow_error_during_active_count =
            g_rtsp_appsrc_flow_error_during_active_count.load(std::memory_order_relaxed),
        .rtsp_appsrc_flow_error_during_stopping_count =
            g_rtsp_appsrc_flow_error_during_stopping_count.load(std::memory_order_relaxed),
        .rtsp_appsrc_last_flow_return = g_rtsp_appsrc_last_flow_return.load(std::memory_order_relaxed),
        .rtsp_appsrc_last_flow_return_phase =
            g_rtsp_appsrc_last_flow_return_phase.load(std::memory_order_relaxed),
        .rtsp_pending_queue_peak = g_rtsp_pending_queue_peak.load(std::memory_order_relaxed),
        .rtsp_pending_queue_size_at_stop =
            g_rtsp_pending_queue_size_at_stop.load(std::memory_order_relaxed),
        .rtsp_pending_queue_size_at_destroy =
            g_rtsp_pending_queue_size_at_destroy.load(std::memory_order_relaxed),
        .rtsp_pending_queue_flushed_count =
            g_rtsp_pending_queue_flushed_count.load(std::memory_order_relaxed),
        .rtsp_pending_queue_dropped_count =
            g_rtsp_pending_queue_dropped_count.load(std::memory_order_relaxed),
        .appsrc_push_after_stop_count = g_appsrc_push_after_stop_count.load(std::memory_order_relaxed),
        .rtsp_pipeline_null_transition_count =
            g_rtsp_pipeline_null_transition_count.load(std::memory_order_relaxed),
        .bus_watch_created_count = g_bus_watch_created_count.load(std::memory_order_relaxed),
        .bus_watch_destroyed_count = g_bus_watch_destroyed_count.load(std::memory_order_relaxed),
        .appsrc_eos_sent_count = g_appsrc_eos_sent_count.load(std::memory_order_relaxed),
        .appsrc_cleared_count = g_appsrc_cleared_count.load(std::memory_order_relaxed),
        .overlay_probe_attached_count = g_overlay_probe_attached_count.load(std::memory_order_relaxed),
        .overlay_probe_removed_count = g_overlay_probe_removed_count.load(std::memory_order_relaxed),
        .shared_stream_subscriber_added_count =
            g_shared_stream_subscriber_added_count.load(std::memory_order_relaxed),
        .shared_stream_subscriber_removed_count =
            g_shared_stream_subscriber_removed_count.load(std::memory_order_relaxed),
        .analysis_tap_attached_count = g_analysis_tap_attached_count.load(std::memory_order_relaxed),
        .analysis_tap_detached_count = g_analysis_tap_detached_count.load(std::memory_order_relaxed),
        .metadata_json_build_count = g_metadata_json_build_count.load(std::memory_order_relaxed),
        .metadata_json_bytes_total = g_metadata_json_bytes_total.load(std::memory_order_relaxed),
        .metadata_json_bytes_max = g_metadata_json_bytes_max.load(std::memory_order_relaxed),
    };
}

inline std::string SnapshotJson() {
    const auto snapshot = Snapshot();
    std::ostringstream out;
    out << "{"
        << "\"rtspMediaConfiguredCount\":" << snapshot.rtsp_media_configured_count << ","
        << "\"rtspMediaUnpreparedCount\":" << snapshot.rtsp_media_unprepared_count << ","
        << "\"rtspEgressSessionCreatedCount\":" << snapshot.rtsp_egress_session_created_count << ","
        << "\"rtspEgressSessionStartedCount\":" << snapshot.rtsp_egress_session_started_count << ","
        << "\"rtspEgressSessionStoppedCount\":" << snapshot.rtsp_egress_session_stopped_count << ","
        << "\"rtspEgressSessionDestroyedCount\":" << snapshot.rtsp_egress_session_destroyed_count << ","
        << "\"rtspAppsrcPushOkCount\":" << snapshot.rtsp_appsrc_push_ok_count << ","
        << "\"rtspAppsrcPushFailCount\":" << snapshot.rtsp_appsrc_push_fail_count << ","
        << "\"rtspAppsrcFlowErrorCount\":" << snapshot.rtsp_appsrc_flow_error_count << ","
        << "\"rtspAppsrcFlowFlushingCount\":" << snapshot.rtsp_appsrc_flow_flushing_count << ","
        << "\"rtspAppsrcFlowEosCount\":" << snapshot.rtsp_appsrc_flow_eos_count << ","
        << "\"rtspAppsrcFlowErrorReturnCount\":" << snapshot.rtsp_appsrc_flow_error_return_count << ","
        << "\"rtspAppsrcFlowNotLinkedCount\":" << snapshot.rtsp_appsrc_flow_not_linked_count << ","
        << "\"rtspAppsrcFlowNotNegotiatedCount\":"
        << snapshot.rtsp_appsrc_flow_not_negotiated_count << ","
        << "\"rtspAppsrcFlowOtherErrorCount\":" << snapshot.rtsp_appsrc_flow_other_error_count << ","
        << "\"rtspAppsrcFlowErrorAfterStopCount\":"
        << snapshot.rtsp_appsrc_flow_error_after_stop_count << ","
        << "\"rtspAppsrcFlowErrorDuringActiveCount\":"
        << snapshot.rtsp_appsrc_flow_error_during_active_count << ","
        << "\"rtspAppsrcFlowErrorDuringStoppingCount\":"
        << snapshot.rtsp_appsrc_flow_error_during_stopping_count << ","
        << "\"rtspAppsrcLastFlowReturn\":" << snapshot.rtsp_appsrc_last_flow_return << ","
        << "\"rtspAppsrcLastFlowReturnPhase\":" << snapshot.rtsp_appsrc_last_flow_return_phase << ","
        << "\"rtspPendingQueuePeak\":" << snapshot.rtsp_pending_queue_peak << ","
        << "\"rtspPendingQueueSizeAtStop\":" << snapshot.rtsp_pending_queue_size_at_stop << ","
        << "\"rtspPendingQueueSizeAtDestroy\":" << snapshot.rtsp_pending_queue_size_at_destroy << ","
        << "\"rtspPendingQueueFlushedCount\":" << snapshot.rtsp_pending_queue_flushed_count << ","
        << "\"rtspPendingQueueDroppedCount\":" << snapshot.rtsp_pending_queue_dropped_count << ","
        << "\"appsrcPushAfterStopCount\":" << snapshot.appsrc_push_after_stop_count << ","
        << "\"rtspPipelineNullTransitionCount\":" << snapshot.rtsp_pipeline_null_transition_count << ","
        << "\"busWatchCreatedCount\":" << snapshot.bus_watch_created_count << ","
        << "\"busWatchDestroyedCount\":" << snapshot.bus_watch_destroyed_count << ","
        << "\"appsrcEosSentCount\":" << snapshot.appsrc_eos_sent_count << ","
        << "\"appsrcClearedCount\":" << snapshot.appsrc_cleared_count << ","
        << "\"overlayProbeAttachedCount\":" << snapshot.overlay_probe_attached_count << ","
        << "\"overlayProbeRemovedCount\":" << snapshot.overlay_probe_removed_count << ","
        << "\"sharedStreamSubscriberAddedCount\":" << snapshot.shared_stream_subscriber_added_count << ","
        << "\"sharedStreamSubscriberRemovedCount\":" << snapshot.shared_stream_subscriber_removed_count << ","
        << "\"analysisTapAttachedCount\":" << snapshot.analysis_tap_attached_count << ","
        << "\"analysisTapDetachedCount\":" << snapshot.analysis_tap_detached_count << ","
        << "\"metadataJsonBuildCount\":" << snapshot.metadata_json_build_count << ","
        << "\"metadataJsonBytesTotal\":" << snapshot.metadata_json_bytes_total << ","
        << "\"metadataJsonBytesMax\":" << snapshot.metadata_json_bytes_max
        << "}";
    return out.str();
}

}  // namespace core::runtime_debug
