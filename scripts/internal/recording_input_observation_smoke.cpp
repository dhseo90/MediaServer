// 파일 용도: 실제 Gst pad와 appsink를 통한 입력 관측 및 cache 복사 계약을 검사한다.
#include "media/gstreamer_sample_observation.h"
#include "core/shared_stream.h"
#include <gst/app/gstappsink.h>
#include <chrono>
#include <condition_variable>
#include <iostream>
#include <limits>
#include <mutex>
#include <stdexcept>

namespace {
int passed = 0, failed = 0;
void Check(bool ok, const char* title) {
    std::cout << (ok ? "[PASS] " : "[FAIL] ") << title << '\n';
    ok ? ++passed : ++failed;
}
struct Fixture {
    GstElement* sink = gst_element_factory_make("appsink", nullptr);
    GstPad* source = gst_pad_new("source", GST_PAD_SRC);
    explicit Fixture(bool install = true) {
        if (!sink || !source) throw std::runtime_error("fixture-elements");
        if (install) media::InstallGstreamerSampleObservation(sink);
        g_object_set(sink, "sync", FALSE, "async", FALSE, nullptr);
        GstPad* input = gst_element_get_static_pad(sink, "sink");
        if (gst_pad_link(source, input) != GST_PAD_LINK_OK) throw std::runtime_error("fixture-link");
        gst_object_unref(input);
        gst_pad_set_active(source, TRUE);
        gst_element_set_state(sink, GST_STATE_PLAYING);
        gst_pad_push_event(source, gst_event_new_stream_start("fixture-stream"));
        GstCaps* caps = gst_caps_new_empty_simple("application/octet-stream");
        gst_pad_push_event(source, gst_event_new_caps(caps));
        gst_caps_unref(caps);
        Segment(100);
    }
    void Segment(guint32 seq) {
        GstSegment segment;
        gst_segment_init(&segment, GST_FORMAT_TIME);
        GstEvent* event = gst_event_new_segment(&segment);
        gst_event_set_seqnum(event, seq);
        if (!gst_pad_push_event(source, event)) throw std::runtime_error("fixture-segment");
    }
    GstSample* Push(guint64 pts, guint64 dts, guint64 duration, bool discont = false) {
        GstBuffer* buffer = gst_buffer_new_allocate(nullptr, 3, nullptr);
        const unsigned char bytes[] = {1, 2, 3};
        gst_buffer_fill(buffer, 0, bytes, sizeof(bytes));
        GST_BUFFER_PTS(buffer) = pts;
        GST_BUFFER_DTS(buffer) = dts;
        GST_BUFFER_DURATION(buffer) = duration;
        if (discont) GST_BUFFER_FLAG_SET(buffer, GST_BUFFER_FLAG_DISCONT);
        if (gst_pad_push(source, buffer) != GST_FLOW_OK) throw std::runtime_error("fixture-push");
        GstSample* sample = gst_app_sink_try_pull_sample(GST_APP_SINK(sink), GST_SECOND);
        if (!sample) throw std::runtime_error("fixture-pull");
        return sample;
    }
    ~Fixture() {
        gst_element_set_state(sink, GST_STATE_NULL);
        gst_pad_set_active(source, FALSE);
        gst_object_unref(source);
        gst_object_unref(sink);
    }
};
auto Read(Fixture& f, guint64 pts = 0, guint64 dts = 0, guint64 duration = 10, bool discont = false) {
    GstSample* s = f.Push(pts, dts, duration, discont);
    auto result = media::ReadGstreamerSampleObservation(s);
    gst_sample_unref(s);
    return result;
}
bool Same(const media::SampleObservation& a, const media::SampleObservation& b) {
    return a.source_generation == b.source_generation && a.generation_order == b.generation_order && a.ordinal == b.ordinal &&
        a.clock_process_id == b.clock_process_id && a.mono_before_ns == b.mono_before_ns &&
        a.observed_utc_ns == b.observed_utc_ns && a.mono_after_ns == b.mono_after_ns &&
        a.pts_ns == b.pts_ns && a.dts_ns == b.dts_ns && a.duration_ns == b.duration_ns && a.discont == b.discont;
}
}
int main() {
    gst_init(nullptr, nullptr);
    try {
        Fixture f;
        auto absent = Read(f, GST_CLOCK_TIME_NONE, GST_CLOCK_TIME_NONE, GST_CLOCK_TIME_NONE);
        auto zero = Read(f, 0, 0, 0);
        const guint64 large = std::numeric_limits<guint64>::max() - 1;
        auto wide = Read(f, large, large, large);
        Check(absent && !absent->pts_ns && !absent->dts_ns && !absent->duration_ns &&
              zero && zero->pts_ns == 0 && zero->dts_ns == 0 && zero->duration_ns == 0 &&
              wide && wide->pts_ns == large && wide->dts_ns == large && wide->duration_ns == large,
              "INPUT01 original missing zero and uint64 timestamps remain distinct");
        auto before = Read(f);
        f.Segment(101);
        auto after = Read(f);
        Check(before && after && before->source_generation != after->source_generation && after->ordinal == 1,
              "INPUT02 serialized segment changes generation before next buffer");
        auto discont = Read(f, 10, 10, 10, true);
        Check(after && discont && after->source_generation == discont->source_generation &&
              discont->ordinal == 2 && discont->discont,
              "INPUT03 DISCONT alone preserves source generation");
        Fixture other;
        auto fresh = Read(other);
        Check(fresh && after && fresh->source_generation != after->source_generation && fresh->ordinal == 1,
              "INPUT04 new sink lifetime has a distinct generation");
        Check(before && after && fresh && before->generation_order>0 && after->generation_order>before->generation_order &&
              fresh->generation_order>after->generation_order,
              "INPUT02 process-local generation order advances across segments and sinks");
        auto stream = std::make_shared<core::SharedStream>(media::SourceSpec{media::SourceSpec::Kind::File, "fixture"});
        media::Packet packet;
        packet.is_key_frame = true;
        packet.observation = discont;
        stream->FanOut(packet);
        std::mutex mutex;
        std::condition_variable cv;
        std::optional<media::SampleObservation> replay;
        stream->AddRecordingSubscriber("fixture-recorder", [&](const media::Packet& p) {
            std::lock_guard lock(mutex); replay = p.observation; cv.notify_all();
        });
        {
            std::unique_lock lock(mutex);
            cv.wait_for(lock, std::chrono::milliseconds(100), [&] { return replay.has_value(); });
        }
        stream->RemoveSubscriber("fixture-recorder");
        Check(discont && replay && Same(*discont, *replay), "INPUT05 actual GOP cache replay preserves complete observation");
        GstSample* s = f.Push(5, 20, 10);
        auto reordered = media::ReadGstreamerSampleObservation(s);
        GstBuffer* b = gst_sample_get_buffer(s);
        unsigned char bytes[3]{};
        gst_buffer_extract(b, 0, bytes, 3);
        Check(reordered && discont && reordered->source_generation == discont->source_generation &&
              reordered->pts_ns == 5 && reordered->dts_ns == 20 && GST_BUFFER_PTS(b) == 5 &&
              GST_BUFFER_DTS(b) == 20 && bytes[0] == 1 && bytes[1] == 2 && bytes[2] == 3,
              "INPUT06 reordered PTS preserves generation original values and payload");
        gst_sample_unref(s);
        Check(reordered && fresh && !reordered->clock_process_id.empty() &&
              reordered->clock_process_id == fresh->clock_process_id &&
              reordered->mono_before_ns <= reordered->mono_after_ns && reordered->observed_utc_ns > 0,
              "INPUT07 clock observation brackets UTC with a process identity");
        f.Segment(101);
        media::InstallGstreamerSampleObservation(f.sink);
        auto same = Read(f);
        Check(reordered && same && reordered->source_generation == same->source_generation &&
              same->ordinal == reordered->ordinal + 1,
              "INPUT08 repeated segment seqnum and duplicate installation do not reissue identity");
        GstBufferList* list = gst_buffer_list_new();
        for (int i = 0; i < 2; ++i) {
            GstBuffer* item = gst_buffer_new_allocate(nullptr, 1, nullptr);
            GST_BUFFER_PTS(item) = static_cast<guint64>(30 + i);
            gst_buffer_list_add(list, item);
        }
        if (gst_pad_push_list(f.source, list) != GST_FLOW_OK) throw std::runtime_error("fixture-list");
        GstSample* l1 = gst_app_sink_try_pull_sample(GST_APP_SINK(f.sink), GST_SECOND);
        GstSample* l2 = gst_app_sink_try_pull_sample(GST_APP_SINK(f.sink), GST_SECOND);
        auto o1 = media::ReadGstreamerSampleObservation(l1);
        auto o2 = media::ReadGstreamerSampleObservation(l2);
        Check(same && o1 && o2 && o1->ordinal == same->ordinal + 1 && o2->ordinal == o1->ordinal + 1 &&
              o1->pts_ns == 30 && o2->pts_ns == 31,
              "INPUT09 buffer list receives one observation per original buffer");
        if (l1) gst_sample_unref(l1);
        if (l2) gst_sample_unref(l2);
        GstSample* original = f.Push(40, 40, 10);
        GstBuffer* shared = gst_sample_get_buffer(original);
        auto original_observation = media::ReadGstreamerSampleObservation(original);
        other.Segment(102);
        if (gst_pad_push(other.source, gst_buffer_ref(shared)) != GST_FLOW_OK) throw std::runtime_error("fixture-shared");
        GstSample* copy = gst_app_sink_try_pull_sample(GST_APP_SINK(other.sink), GST_SECOND);
        auto copy_observation = media::ReadGstreamerSampleObservation(copy);
        Check(original_observation && copy_observation && Same(*original_observation, *copy_observation),
              "INPUT10 same buffer across pads and new segment retains first immutable observation");
        if (copy) gst_sample_unref(copy);
        gst_sample_unref(original);
        Fixture late(false);
        auto not_installed = Read(late);
        media::InstallGstreamerSampleObservation(late.sink);
        auto no_signal = Read(late);
        Check(!not_installed && !no_signal, "INPUT01 missing installation or stream signal remains unobserved");
        auto pre_flush = Read(f);
        gst_pad_push_event(f.source, gst_event_new_flush_start());
        gst_pad_push_event(f.source, gst_event_new_flush_stop(TRUE));
        f.Segment(101);
        auto post_flush = Read(f);
        Check(pre_flush && post_flush && pre_flush->source_generation != post_flush->source_generation &&
              post_flush->ordinal == 1,
              "INPUT02 flush followed by same sequence segment starts a new generation");
        GstBuffer* concurrent = gst_buffer_new_allocate(nullptr, 1, nullptr);
        GST_BUFFER_PTS(concurrent) = 50;
        GstFlowReturn flow1 = GST_FLOW_ERROR, flow2 = GST_FLOW_ERROR;
        std::thread first([&] { flow1 = gst_pad_push(f.source, gst_buffer_ref(concurrent)); });
        std::thread second([&] { flow2 = gst_pad_push(other.source, gst_buffer_ref(concurrent)); });
        first.join(); second.join();
        GstSample* c1 = gst_app_sink_try_pull_sample(GST_APP_SINK(f.sink), GST_SECOND);
        GstSample* c2 = gst_app_sink_try_pull_sample(GST_APP_SINK(other.sink), GST_SECOND);
        auto co1 = media::ReadGstreamerSampleObservation(c1);
        auto co2 = media::ReadGstreamerSampleObservation(c2);
        Check(flow1 == GST_FLOW_OK && flow2 == GST_FLOW_OK && co1 && co2 && Same(*co1, *co2),
              "INPUT10 concurrent pads bind one immutable observation");
        if (c1) gst_sample_unref(c1);
        if (c2) gst_sample_unref(c2);
        gst_buffer_unref(concurrent);
    } catch (const std::exception& e) {
        std::cout << "[FAIL] fixture setup/execution: " << e.what() << '\n'; ++failed;
    }
    std::cout << "[SUMMARY] pass=" << passed << " fail=" << failed << '\n';
    return failed ? 1 : 0;
}
