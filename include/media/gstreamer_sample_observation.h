// 파일 용도: appsink 큐 이전의 원본 시간 관측을 buffer 수명에 결박한다.
#pragma once
#include "media_types.h"
#include <gst/gst.h>
#include <chrono>
#include <limits>
#include <memory>
#include <mutex>
#include <unistd.h>

namespace media {
namespace sample_observation_detail {
// payload/timestamp를 건드리지 않는 짧은 메모리 결박 잠금이다. BLOCK probe나 I/O 대기는 없다.
inline std::mutex& BindingMutex() { static std::mutex mutex; return mutex; }
inline GQuark ObservationKey() { return g_quark_from_static_string("media-server-sample-observation-v1"); }
inline GQuark InstallationKey() { return g_quark_from_static_string("media-server-sample-observation-probe-v1"); }
inline std::string Uuid() {
    gchar* value = g_uuid_string_random();
    if (!value) return {};
    std::string result(value);
    g_free(value);
    return result;
}
inline std::string ProcessIdLocked() {
    static pid_t pid = 0;
    static std::string identity;
    if (pid != getpid()) { identity = Uuid(); pid = getpid(); }
    return identity;
}
struct State {
    std::string generation;
    std::uint64_t generation_order{0};
    guint32 segment_seq{GST_SEQNUM_INVALID};
    guint32 stream_seq{GST_SEQNUM_INVALID};
    std::uint64_t ordinal{0};
    bool has_stream{false};
    bool has_segment{false};
};
inline std::uint64_t NextGenerationLocked() {
    static pid_t pid=0;
    static std::uint64_t counter=0;
    if(pid!=getpid()){pid=getpid();counter=0;}
    if(counter==std::numeric_limits<std::uint64_t>::max())return 0;
    return ++counter;
}
inline std::int64_t MonoNow() {
    return std::chrono::duration_cast<std::chrono::nanoseconds>(
        std::chrono::steady_clock::now().time_since_epoch()).count();
}
inline void BindLocked(State& state, GstBuffer* buffer) {
    if (!buffer || gst_mini_object_get_qdata(GST_MINI_OBJECT(buffer), ObservationKey())) return;
    if (!state.has_stream || !state.has_segment || state.generation.empty() || state.generation_order==0 ||
        state.ordinal == std::numeric_limits<std::uint64_t>::max()) return;
    auto observation = std::make_unique<SampleObservation>();
    observation->source_generation = state.generation;
    observation->generation_order = state.generation_order;
    observation->clock_process_id = ProcessIdLocked();
    if (observation->clock_process_id.empty()) return;
    observation->ordinal = state.ordinal + 1;
    if (GST_BUFFER_PTS_IS_VALID(buffer)) observation->pts_ns = GST_BUFFER_PTS(buffer);
    if (GST_BUFFER_DTS_IS_VALID(buffer)) observation->dts_ns = GST_BUFFER_DTS(buffer);
    if (GST_BUFFER_DURATION_IS_VALID(buffer)) observation->duration_ns = GST_BUFFER_DURATION(buffer);
    observation->discont = GST_BUFFER_FLAG_IS_SET(buffer, GST_BUFFER_FLAG_DISCONT);
    observation->mono_before_ns = MonoNow();
    observation->observed_utc_ns = std::chrono::duration_cast<std::chrono::nanoseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
    observation->mono_after_ns = MonoNow();
    gst_mini_object_set_qdata(GST_MINI_OBJECT(buffer), ObservationKey(), observation.release(),
        [](gpointer data) { delete static_cast<SampleObservation*>(data); });
    ++state.ordinal;
}
inline GstPadProbeReturn Probe(GstPad*, GstPadProbeInfo* info, gpointer data) noexcept {
    try {
        std::lock_guard lock(BindingMutex());
        auto& state = *static_cast<State*>(data);
        if (GST_PAD_PROBE_INFO_TYPE(info) & GST_PAD_PROBE_TYPE_EVENT_DOWNSTREAM) {
            GstEvent* event = GST_PAD_PROBE_INFO_EVENT(info);
            if (GST_EVENT_TYPE(event) == GST_EVENT_STREAM_START) {
                const auto seq = gst_event_get_seqnum(event);
                if (!state.has_stream || seq != state.stream_seq) {
                    state.has_stream = true;
                    state.has_segment = false;
                    state.stream_seq = seq;
                }
            } else if (GST_EVENT_TYPE(event) == GST_EVENT_SEGMENT) {
                const auto seq = gst_event_get_seqnum(event);
                if (!state.has_segment || seq != state.segment_seq) {
                    state.has_segment = false;
                    state.generation = Uuid();
                    state.generation_order = NextGenerationLocked();
                    state.ordinal = 0;
                    state.segment_seq = seq;
                    state.has_segment = true;
                }
            } else if (GST_EVENT_TYPE(event) == GST_EVENT_FLUSH_START || GST_EVENT_TYPE(event) == GST_EVENT_FLUSH_STOP) {
                state.has_segment = false;
            }
        } else if (GST_PAD_PROBE_INFO_TYPE(info) & GST_PAD_PROBE_TYPE_BUFFER) {
            BindLocked(state, GST_PAD_PROBE_INFO_BUFFER(info));
        } else if (GST_PAD_PROBE_INFO_TYPE(info) & GST_PAD_PROBE_TYPE_BUFFER_LIST) {
            GstBufferList* list = GST_PAD_PROBE_INFO_BUFFER_LIST(info);
            for (guint i = 0; i < gst_buffer_list_length(list); ++i) BindLocked(state, gst_buffer_list_get(list, i));
        }
    } catch (...) {
        // 관측 실패는 관측 부재이며 기존 미디어 흐름의 실패로 전파하지 않는다.
    }
    return GST_PAD_PROBE_OK;
}
}  // namespace sample_observation_detail

inline bool InstallGstreamerSampleObservation(GstElement* sink) noexcept {
    if (!sink) return false;
    GstPad* pad = gst_element_get_static_pad(sink, "sink");
    if (!pad) return false;
    bool installed = false;
    try {
        std::lock_guard lock(sample_observation_detail::BindingMutex());
        if (g_object_get_qdata(G_OBJECT(pad), sample_observation_detail::InstallationKey())) {
            installed = true;
        } else {
            auto state = std::make_unique<sample_observation_detail::State>();
            const auto id = gst_pad_add_probe(pad, static_cast<GstPadProbeType>(
                GST_PAD_PROBE_TYPE_BUFFER | GST_PAD_PROBE_TYPE_BUFFER_LIST |
                GST_PAD_PROBE_TYPE_EVENT_DOWNSTREAM | GST_PAD_PROBE_TYPE_EVENT_FLUSH),
                sample_observation_detail::Probe, state.get(),
                [](gpointer data) { delete static_cast<sample_observation_detail::State*>(data); });
            if (id != 0) {
                state.release();
                g_object_set_qdata(G_OBJECT(pad), sample_observation_detail::InstallationKey(), GINT_TO_POINTER(1));
                installed = true;
            }
        }
    } catch (...) {}
    gst_object_unref(pad);
    return installed;
}
inline std::optional<SampleObservation> ReadGstreamerSampleObservation(const GstSample* sample) noexcept {
    try {
        if (!sample) return std::nullopt;
        GstBuffer* buffer = gst_sample_get_buffer(const_cast<GstSample*>(sample));
        if (!buffer) return std::nullopt;
        std::lock_guard lock(sample_observation_detail::BindingMutex());
        auto* observation = static_cast<SampleObservation*>(
            gst_mini_object_get_qdata(GST_MINI_OBJECT(buffer), sample_observation_detail::ObservationKey()));
        if (observation) return *observation;
    } catch (...) {}
    return std::nullopt;
}
}  // namespace media
