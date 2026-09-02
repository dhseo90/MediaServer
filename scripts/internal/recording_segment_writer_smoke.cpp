// 파일 용도: v4.1.0 S02 Recorder subscriber와 segment writer의 핵심 계약을 검증한다.
// 동작 요약: opt-in 설정, 독립 queue, keyframe 경계, epoch 전환, atomic finalize를 확인한다.
#include "core/recording_runtime_config_data.h"
#include "core/shared_stream.h"
#include "recording/gstreamer_segment_writer.h"
#include "ingress/source_view_application_service.h"
#include "ingress/source_view_registry.h"

#include <atomic>
#include <algorithm>
#include <chrono>
#include <filesystem>
#include <iostream>
#include <string>
#include <thread>
#include <vector>

#ifndef MEDIA_SERVER_USE_GSTREAMER
#define MEDIA_SERVER_USE_GSTREAMER 0
#endif

#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/app/gstappsink.h>
#include <gst/gst.h>
#endif

namespace {
int failures = 0;
int passes = 0;

void Expect(bool condition, const std::string& label) {
    if (condition) ++passes;
    else { ++failures; std::cerr << "[fail] " << label << '\n'; }
}

std::size_t CountSuffix(const std::filesystem::path& root, const std::string& suffix) {
    std::size_t count = 0;
    std::error_code error;
    if (!std::filesystem::exists(root, error)) return 0;
    for (const auto& entry : std::filesystem::recursive_directory_iterator(root, error)) {
        if (error) break;
        const std::string path = entry.path().string();
        if (entry.is_regular_file() && path.size() >= suffix.size() &&
            path.compare(path.size() - suffix.size(), suffix.size(), suffix) == 0) ++count;
    }
    return count;
}

#if MEDIA_SERVER_USE_GSTREAMER
std::vector<media::Packet> EncodeFixture(media::CodecId codec, media::StreamDescriptor* descriptor) {
    const char* launch = codec == media::CodecId::H264
        ? "videotestsrc num-buffers=30 pattern=ball ! video/x-raw,width=160,height=90,framerate=2/1 ! x264enc tune=zerolatency speed-preset=ultrafast key-int-max=2 ! video/x-h264,stream-format=byte-stream,alignment=au ! appsink name=sink sync=false"
        : "videotestsrc num-buffers=30 pattern=ball ! video/x-raw,width=160,height=90,framerate=2/1 ! vp8enc deadline=1 keyframe-max-dist=2 ! video/x-vp8 ! appsink name=sink sync=false";
    GError* parse_error = nullptr;
    GstElement* pipeline = gst_parse_launch(launch, &parse_error);
    if (pipeline == nullptr) {
        if (parse_error != nullptr) g_error_free(parse_error);
        return {};
    }
    GstElement* sink = gst_bin_get_by_name(GST_BIN(pipeline), "sink");
    gst_element_set_state(pipeline, GST_STATE_PLAYING);
    std::vector<media::Packet> packets;
    while (true) {
        GstSample* sample = gst_app_sink_try_pull_sample(GST_APP_SINK(sink), 5 * GST_SECOND);
        if (sample == nullptr) break;
        GstBuffer* buffer = gst_sample_get_buffer(sample);
        GstMapInfo map{};
        if (gst_buffer_map(buffer, &map, GST_MAP_READ)) {
            media::Packet packet;
            packet.kind = media::MediaKind::Video;
            packet.codec = codec;
            packet.track_id = "video-0";
            packet.is_key_frame = !GST_BUFFER_FLAG_IS_SET(buffer, GST_BUFFER_FLAG_DELTA_UNIT);
            packet.pts = GST_BUFFER_PTS_IS_VALID(buffer) ? static_cast<std::int64_t>(GST_BUFFER_PTS(buffer)) : 0;
            packet.dts = GST_BUFFER_DTS_IS_VALID(buffer) ? static_cast<std::int64_t>(GST_BUFFER_DTS(buffer)) : packet.pts;
            packet.payload.assign(map.data, map.data + map.size);
            packets.push_back(std::move(packet));
            gst_buffer_unmap(buffer, &map);
        }
        if (descriptor != nullptr && descriptor->tracks.empty()) {
            GstCaps* caps = gst_sample_get_caps(sample);
            gchar* caps_text = caps != nullptr ? gst_caps_to_string(caps) : nullptr;
            descriptor->tracks.push_back({"video-0", media::MediaKind::Video, codec,
                                          media::ToString(codec), caps_text != nullptr ? caps_text : "", 0, 0});
            if (caps_text != nullptr) g_free(caps_text);
        }
        gst_sample_unref(sample);
    }
    gst_element_set_state(pipeline, GST_STATE_NULL);
    gst_object_unref(sink);
    gst_object_unref(pipeline);
    return packets;
}
#endif
}  // namespace

int main(int argc, char** argv) {
    if (argc != 2) return 2;
    const std::filesystem::path root(argv[1]);
    core::RecordingRuntimeConfigData config;
    std::string error;
    Expect(core::ValidateRecordingRuntimeConfig(config, &error), "기본 녹화 설정 유효");
    config.recording_enabled = true;
    config.recording_default_channel_quota_bytes = 0;
    Expect(!core::ValidateRecordingRuntimeConfig(config, &error), "활성화+quota 0 거부");
    Expect(!core::ValidateRecordingStorageLayout(root / "same", root / "same", &error), "녹화/media root 중복 거부");
    Expect(!core::ShouldStartRecording(false, true, true) && !core::ShouldStartRecording(true, false, true) &&
               !core::ShouldStartRecording(true, true, false) && core::ShouldStartRecording(true, true, true),
           "global/source/channel opt-in 삼중 경계");

    core::SharedStream stream({media::SourceSpec::Kind::File, "fixture"});
    Expect(stream.AddRecordingSubscriber("recorder-1", [](const media::Packet&) {}), "Recorder subscriber 추가");
    Expect(stream.RefCount() == 0 && stream.AnalysisSubscriberCount() == 0 &&
               stream.RecordingSubscriberCount() == 1 && stream.TotalSubscriberCount() == 1,
           "역할별 subscriber 계수 분리");
    stream.RemoveSubscriber("recorder-1");

    core::SharedStream isolation({media::SourceSpec::Kind::File, "fixture-overflow"});
    std::atomic<int> fast_count{0};
    Expect(isolation.AddSubscriber("fast", [&](const media::Packet&) { ++fast_count; }), "client 추가");
    Expect(isolation.AddRecordingSubscriber("slow", [](const media::Packet&) {
        std::this_thread::sleep_for(std::chrono::milliseconds(4));
    }), "느린 recorder 추가");
    media::Packet queue_packet;
    queue_packet.kind = media::MediaKind::Video;
    queue_packet.codec = media::CodecId::H264;
    for (int i = 0; i < 200; ++i) isolation.FanOut(queue_packet);
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    Expect(fast_count.load() > 0, "recorder overflow가 client queue를 차단하지 않음");
    isolation.StopAllSubscribers();

    int reconcile_count = 0;
    auto& source_registry = ingress::SourceViewRegistry::Instance();
    source_registry.SetSourceMutationCallback([&](const auto&) { ++reconcile_count; });
    const std::string policy_body =
        R"({"sourceId":"91","displayName":"Recording Policy","kind":"file","file":"recording-policy-fixture.mp4","enabled":true,"recording":{"enabled":true,"quotaBytes":1048576,"retentionDays":3,"storagePath":"site-a/channel-91","revision":7}})";
    const auto created = source_registry.CreateSource(policy_body);
    Expect(created.status == 201 && reconcile_count == 1, "source policy 저장 성공 뒤 reconcile callback");
    std::vector<ingress::SourceViewRegistry::SourceRecord> domain_sources;
    Expect(source_registry.Snapshot(&domain_sources, nullptr, &error), "source policy snapshot");
    const auto policy_it = std::find_if(domain_sources.begin(), domain_sources.end(), [](const auto& source) {
        return source.source_id == "91";
    });
    Expect(policy_it != domain_sources.end() && policy_it->recording.enabled &&
               policy_it->recording.quota_bytes == 1048576 &&
               policy_it->recording.retention_days == 3 &&
               policy_it->recording.storage_path == "site-a/channel-91" &&
               policy_it->recording.revision == 7,
           "source policy create/save/load/snapshot round-trip");
    const auto invalid = source_registry.CreateSource(
        R"({"sourceId":"92","displayName":"Invalid Recording","kind":"file","file":"invalid-recording.mp4","enabled":true,"recording":{"enabled":true,"quotaBytes":0,"retentionDays":3,"revision":1}})");
    Expect(invalid.status == 400 && reconcile_count == 1, "저장 실패 시 reconcile callback 미호출");
    const auto client_views = source_registry.ClientViewsJson([](const std::string&, const std::string&) { return true; });
    Expect(client_views.body.find("quotaBytes") == std::string::npos &&
               client_views.body.find("storagePath") == std::string::npos,
           "viewer-safe client view에 quota/storage path 비노출");
    std::vector<ingress::SourceViewApplicationService::SourceRecord> application_sources;
    Expect(ingress::SourceViewApplicationService::Instance().Snapshot(
               &application_sources, nullptr, &error),
           "application DTO snapshot");
    const auto application_policy = std::find_if(
        application_sources.begin(), application_sources.end(), [](const auto& source) {
            return source.source_id == "91";
        });
    Expect(application_policy != application_sources.end() &&
               application_policy->recording.revision == 7,
           "application DTO recording policy 보존");
    source_registry.SetSourceMutationCallback({});

#if MEDIA_SERVER_USE_GSTREAMER
    gst_init(nullptr, nullptr);
    for (const auto codec : {media::CodecId::H264, media::CodecId::VP8}) {
        media::StreamDescriptor descriptor;
        descriptor.is_live = true;
        auto packets = EncodeFixture(codec, &descriptor);
        const std::string codec_name = media::ToString(codec);
        Expect(!packets.empty(), codec_name + " fixture encode");
        if (packets.empty()) continue;
        const auto codec_root = root / codec_name;
        std::vector<recording::RecordingSegmentV1> finalized;
        recording::GStreamerSegmentWriter writer({codec_root, 10000});
        Expect(writer.Start("channel-1", "epoch-1", descriptor,
                            [&](recording::RecordingSegmentV1 segment, std::string path) {
                                const std::filesystem::path final_path(path);
                                Expect(std::filesystem::exists(final_path), "callback 시 final 파일 존재");
                                Expect(!std::filesystem::exists(final_path.string() + ".partial"), "callback 시 partial 제거");
                                finalized.push_back(std::move(segment));
                            }, &error), codec_name + " writer 시작: " + error);
        auto delta = packets.front();
        delta.is_key_frame = false;
        writer.Push(delta, 1000);
        Expect(CountSuffix(codec_root, ".partial") == 0, codec_name + " delta-start 차단");
        const auto base_pts = packets.front().pts;
        for (const auto& packet : packets) writer.Push(packet, 1000 + (packet.pts - base_pts) / 1000000);
        Expect(CountSuffix(codec_root, ".partial") == 1, codec_name + " 열린 segment는 partial 한 개");
        writer.Stop();
        const std::string extension = codec == media::CodecId::H264 ? ".mp4" : ".webm";
        Expect(CountSuffix(codec_root, extension) >= 2, codec_name + " 10초 뒤 다음 keyframe 분할");
        Expect(finalized.size() >= 2, codec_name + " finalized callback");
        if (codec == media::CodecId::H264) {
            recording::GStreamerSegmentWriter rollback_writer({root / "rollback", 60000});
            std::vector<std::string> epochs;
            Expect(rollback_writer.Start("channel-2", "epoch-base", descriptor,
                                         [&](recording::RecordingSegmentV1 segment, std::string) { epochs.push_back(segment.stream_epoch_id); },
                                         &error), "rollback writer 시작");
            for (const auto& packet : packets) rollback_writer.Push(packet, 1000 + (packet.pts - base_pts) / 1000000);
            auto rollback_key = packets.front();
            rollback_key.pts = 0;
            rollback_key.dts = 0;
            rollback_key.is_key_frame = true;
            rollback_writer.Push(rollback_key, 20000);
            rollback_writer.Stop();
            Expect(epochs.size() >= 2 && epochs.back().find("-r1") != std::string::npos,
                   "PTS rollback 시 새 stream epoch");
        }
    }
#else
    media::StreamDescriptor descriptor;
    descriptor.tracks.push_back({"video-0", media::MediaKind::Video, media::CodecId::H264,
                                 "h264", "video/x-h264", 90000, 0});
    recording::GStreamerSegmentWriter writer({root, 10000});
    Expect(!writer.Start("channel-1", "epoch-1", descriptor, {}, &error), "GStreamer 미포함 fail-closed");
#endif
    std::cout << "[verify-v410-recording-recorder] pass=" << passes << " fail=" << failures << '\n';
    return failures == 0 ? 0 : 1;
}
