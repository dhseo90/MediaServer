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
#include <fstream>
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

std::string ReadText(const std::filesystem::path& path) {
    std::ifstream input(path, std::ios::binary);
    return std::string(std::istreambuf_iterator<char>(input),
                       std::istreambuf_iterator<char>());
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
    Expect(config.recording_reserved_free_bytes == 1073741824ULL &&
               config.recording_retention_interval_ms == 5000,
           "disk reserve와 retention 주기 기본값");
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
        R"({"sourceId":"91","displayName":"Recording Policy","kind":"file","file":"recording-policy-fixture.mp4","enabled":true,"recording":{"enabled":true,"continuousMaxBytes":1048576,"continuousMaxAgeMs":259200000,"eventMaxBytes":2097152,"eventMaxAgeMs":604800000,"storagePath":"site-a/channel-91","revision":7}})";
    const auto created = source_registry.CreateSource(policy_body);
    Expect(created.status == 201 && reconcile_count == 1, "source policy 저장 성공 뒤 reconcile callback");
    std::vector<ingress::SourceViewRegistry::SourceRecord> domain_sources;
    Expect(source_registry.Snapshot(&domain_sources, nullptr, &error), "source policy snapshot");
    const auto policy_it = std::find_if(domain_sources.begin(), domain_sources.end(), [](const auto& source) {
        return source.source_id == "91";
    });
    Expect(policy_it != domain_sources.end() && policy_it->recording.enabled &&
               policy_it->recording.continuous_max_bytes == 1048576 &&
               policy_it->recording.continuous_max_age_ms == 259200000 &&
               policy_it->recording.event_max_bytes == 2097152 &&
               policy_it->recording.event_max_age_ms == 604800000 &&
               policy_it->recording.storage_path == "site-a/channel-91" &&
               policy_it->recording.revision == 7,
           "source policy create/save/load/snapshot round-trip");
    const auto legacy = source_registry.CreateSource(
        R"({"sourceId":"93","displayName":"Legacy Recording","kind":"file","file":"legacy-recording.mp4","enabled":true,"recording":{"enabled":true,"quotaBytes":4096,"retentionDays":2,"revision":3}})");
    Expect(legacy.status == 201 && reconcile_count == 2, "legacy source policy 호환 저장");
    domain_sources.clear();
    Expect(source_registry.Snapshot(&domain_sources, nullptr, &error), "legacy source policy snapshot");
    const auto legacy_it = std::find_if(domain_sources.begin(), domain_sources.end(), [](const auto& source) {
        return source.source_id == "93";
    });
    Expect(legacy_it != domain_sources.end() &&
               legacy_it->recording.continuous_max_bytes == 4096 &&
               legacy_it->recording.event_max_bytes == 4096 &&
               legacy_it->recording.continuous_max_age_ms == 172800000 &&
               legacy_it->recording.event_max_age_ms == 172800000,
           "legacy quotaBytes/retentionDays를 분리 정책으로 이행");
    const auto invalid = source_registry.CreateSource(
        R"({"sourceId":"92","displayName":"Invalid Recording","kind":"file","file":"invalid-recording.mp4","enabled":true,"recording":{"enabled":true,"continuousMaxBytes":1024,"continuousMaxAgeMs":0,"eventMaxBytes":0,"eventMaxAgeMs":0,"revision":1}})");
    Expect(invalid.status == 400 && reconcile_count == 2, "eventMaxBytes 0 저장 실패 시 callback 미호출");
    const auto negative_age = source_registry.CreateSource(
        R"({"sourceId":"94","displayName":"Negative Age","kind":"file","file":"negative-age.mp4","enabled":true,"recording":{"enabled":true,"continuousMaxBytes":1024,"continuousMaxAgeMs":-1,"eventMaxBytes":1024,"eventMaxAgeMs":0,"revision":1}})");
    Expect(negative_age.status == 400 && reconcile_count == 2,
           "음수 continuousMaxAgeMs 저장 거부");
    const auto negative_quota = source_registry.CreateSource(
        R"({"sourceId":"95","displayName":"Negative Quota","kind":"file","file":"negative-quota.mp4","enabled":true,"recording":{"enabled":true,"continuousMaxBytes":-1,"continuousMaxAgeMs":0,"eventMaxBytes":1024,"eventMaxAgeMs":0,"revision":1}})");
    Expect(negative_quota.status == 400 && reconcile_count == 2,
           "음수 continuousMaxBytes 명시 입력을 default로 대체하지 않고 거부");
    const auto malformed_quota = source_registry.CreateSource(
        R"({"sourceId":"96","displayName":"Malformed Quota","kind":"file","file":"malformed-quota.mp4","enabled":true,"recording":{"enabled":true,"continuousMaxBytes":12x,"continuousMaxAgeMs":0,"eventMaxBytes":1024,"eventMaxAgeMs":0,"revision":1}})");
    Expect(malformed_quota.status == 400 && reconcile_count == 2,
           "형식이 잘못된 continuousMaxBytes 명시 입력 거부");
    const auto malformed_age = source_registry.CreateSource(
        R"({"sourceId":"97","displayName":"Malformed Age","kind":"file","file":"malformed-age.mp4","enabled":true,"recording":{"enabled":true,"continuousMaxBytes":1024,"continuousMaxAgeMs":12x,"eventMaxBytes":1024,"eventMaxAgeMs":0,"revision":1}})");
    Expect(malformed_age.status == 400 && reconcile_count == 2,
           "형식이 잘못된 continuousMaxAgeMs 명시 입력 거부");
    const auto negative_legacy_quota = source_registry.CreateSource(
        R"({"sourceId":"98","displayName":"Negative Legacy Quota","kind":"file","file":"negative-legacy-quota.mp4","enabled":true,"recording":{"enabled":true,"quotaBytes":-1,"retentionDays":1,"revision":1}})");
    Expect(negative_legacy_quota.status == 400 && reconcile_count == 2,
           "음수 legacy quotaBytes 명시 입력 거부");
    const auto client_views = source_registry.ClientViewsJson([](const std::string&, const std::string&) { return true; });
    Expect(client_views.body.find("continuousMaxBytes") == std::string::npos &&
               client_views.body.find("eventMaxBytes") == std::string::npos &&
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
               application_policy->recording.event_max_bytes == 2097152 &&
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
                            [&](recording::RecordingSegmentV1 segment,
                                std::string path,
                                std::string*) {
                                const std::filesystem::path final_path(path);
                                Expect(std::filesystem::exists(final_path), "callback 시 final 파일 존재");
                                Expect(!std::filesystem::exists(final_path.string() + ".partial"), "callback 시 partial 제거");
                                finalized.push_back(std::move(segment));
                                return true;
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
                                         [&](recording::RecordingSegmentV1 segment,
                                             std::string,
                                             std::string*) {
                                             epochs.push_back(segment.stream_epoch_id);
                                             return true;
                                         },
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

            recording::GStreamerSegmentWriter::Options admission_options;
            admission_options.storage_root = root / "admission";
            admission_options.segment_duration_ms = 60000;
            int admission_calls = 0;
            int admission_completions = 0;
            int admission_progress_calls = 0;
            std::uint64_t latest_progress_bytes = 0;
            std::uint64_t completed_segment_bytes = 0;
            admission_options.admit_segment = [&](const std::string&,
                                                    std::uint64_t minimum_bytes) {
                ++admission_calls;
                return recording::SegmentAdmissionDecision{
                    admission_calls > 1,
                    admission_calls > 1,
                    admission_calls > 1
                        ? std::max<std::uint64_t>(minimum_bytes, 16ULL * 1024ULL * 1024ULL)
                        : 0,
                };
            };
            admission_options.report_segment_progress =
                [&](const std::string& progress_channel_id, std::uint64_t written_bytes) {
                    if (progress_channel_id == "channel-admission") {
                        ++admission_progress_calls;
                        latest_progress_bytes = std::max(latest_progress_bytes, written_bytes);
                    }
                };
            admission_options.complete_segment =
                [&](const std::string& completed_channel_id, std::uint64_t actual_bytes) {
                    if (completed_channel_id == "channel-admission") {
                        ++admission_completions;
                        completed_segment_bytes = actual_bytes;
                    }
                };
            recording::GStreamerSegmentWriter admission_writer(admission_options);
            std::vector<std::string> admission_epochs;
            Expect(admission_writer.Start(
                       "channel-admission", "epoch-admission", descriptor,
                       [&](recording::RecordingSegmentV1 segment,
                           std::string,
                           std::string*) {
                           admission_epochs.push_back(segment.stream_epoch_id);
                           return true;
                       }, &error),
                   "writer admission 시작");
            for (const auto& packet : packets) {
                admission_writer.Push(packet, 30000 + (packet.pts - base_pts) / 1000000);
            }
            admission_writer.Stop();
            Expect(admission_calls >= 2 && !admission_epochs.empty() &&
                       admission_epochs.front().find("-r1") != std::string::npos,
                   "storage-blocked 뒤 다음 keyframe에서 새 epoch로 재개");
            Expect(admission_completions == 1 && completed_segment_bytes > 0,
                   "admission reserve를 segment finalize 실제 용량으로 반환");
            Expect(admission_progress_calls >= 1 &&
                       latest_progress_bytes == completed_segment_bytes,
                   "partial/finalized 실제 파일 크기를 admission 진행량으로 보고");

            recording::GStreamerSegmentWriter::Options oversize_options;
            const auto oversize_root = root / "oversize-admission";
            oversize_options.storage_root = oversize_root;
            oversize_options.segment_duration_ms = 60000;
            oversize_options.container_overhead_reservation_bytes = 0;
            std::vector<std::uint64_t> oversize_reservations;
            std::vector<std::uint64_t> oversize_completions;
            oversize_options.admit_segment =
                [&](const std::string&, std::uint64_t minimum_bytes) {
                    const std::uint64_t reserved = oversize_reservations.empty()
                                                       ? minimum_bytes
                                                       : std::max<std::uint64_t>(
                                                             minimum_bytes,
                                                             16ULL * 1024ULL * 1024ULL);
                    oversize_reservations.push_back(reserved);
                    return recording::SegmentAdmissionDecision{true, false, reserved};
                };
            oversize_options.complete_segment =
                [&](const std::string&, std::uint64_t actual_bytes) {
                    oversize_completions.push_back(actual_bytes);
                };
            recording::GStreamerSegmentWriter oversize_writer(oversize_options);
            std::vector<std::string> oversize_finalized_epochs;
            Expect(oversize_writer.Start(
                       "channel-oversize", "epoch-oversize", descriptor,
                       [&](recording::RecordingSegmentV1 segment,
                           std::string,
                           std::string*) {
                           oversize_finalized_epochs.push_back(segment.stream_epoch_id);
                           return true;
                       }, &error),
                   "실제 파일 예약 초과 writer 시작");
            for (const auto& packet : packets) {
                oversize_writer.Push(
                    packet, 35000 + (packet.pts - base_pts) / 1000000);
            }
            oversize_writer.Stop();
            Expect(oversize_reservations.size() >= 2 &&
                       oversize_completions.size() == oversize_reservations.size() &&
                       oversize_completions.front() > oversize_reservations.front() &&
                       !oversize_finalized_epochs.empty() &&
                       oversize_finalized_epochs.front().find("-r1") != std::string::npos &&
                       CountSuffix(oversize_root, ".mp4") == oversize_finalized_epochs.size() &&
                       CountSuffix(oversize_root, ".partial") == 0 &&
                       CountSuffix(oversize_root, ".cleanup-pending") == 0,
                   "실제 파일 예약 초과는 catalog callback 전 제거·high-water 반환 후 새 epoch 재개");

            recording::GStreamerSegmentWriter::Options bounded_options;
            bounded_options.storage_root = root / "bounded-admission";
            bounded_options.segment_duration_ms = 60000;
            std::vector<std::uint64_t> bounded_reservations;
            std::vector<std::uint64_t> bounded_actual_bytes;
            std::size_t bounded_finalized_count = 0;
            bounded_options.admit_segment =
                [&](const std::string&, std::uint64_t minimum_bytes) {
                    bounded_reservations.push_back(minimum_bytes);
                    return recording::SegmentAdmissionDecision{true, false, minimum_bytes};
                };
            bounded_options.complete_segment =
                [&](const std::string&, std::uint64_t actual_bytes) {
                    bounded_actual_bytes.push_back(actual_bytes);
                };
            recording::GStreamerSegmentWriter bounded_writer(bounded_options);
            Expect(bounded_writer.Start(
                       "channel-bounded", "epoch-bounded", descriptor,
                       [&](recording::RecordingSegmentV1,
                           std::string,
                           std::string*) {
                           ++bounded_finalized_count;
                           return true;
                       }, &error),
                   "writer 예약 hard bound 시작");
            for (const auto& packet : packets) {
                bounded_writer.Push(packet, 40000 + (packet.pts - base_pts) / 1000000);
            }
            bounded_writer.Stop();
            bool bounded_actual = !bounded_actual_bytes.empty() &&
                                  bounded_actual_bytes.size() == bounded_reservations.size() &&
                                  bounded_finalized_count == bounded_actual_bytes.size();
            for (std::size_t i = 0; bounded_actual && i < bounded_actual_bytes.size(); ++i) {
                bounded_actual = bounded_actual_bytes[i] > 0 &&
                                 bounded_actual_bytes[i] <= bounded_reservations[i];
            }
            Expect(bounded_reservations.size() >= 2 && bounded_actual,
                   "예약 payload 상한 도달 시 keyframe 경계 재개와 실제 파일 크기 상한 유지");

            recording::GStreamerSegmentWriter::Options catalog_failure_options;
            const auto catalog_failure_root = root / "catalog-finalize-failure";
            catalog_failure_options.storage_root = catalog_failure_root;
            catalog_failure_options.segment_duration_ms = 60000;
            catalog_failure_options.admit_segment =
                [](const std::string&, std::uint64_t minimum_bytes) {
                    return recording::SegmentAdmissionDecision{
                        true, false,
                        std::max<std::uint64_t>(minimum_bytes, 16ULL * 1024ULL * 1024ULL)};
                };
            int catalog_failure_completions = 0;
            std::uint64_t catalog_failure_actual_bytes = 0;
            catalog_failure_options.complete_segment =
                [&](const std::string&, std::uint64_t actual_bytes) {
                    ++catalog_failure_completions;
                    catalog_failure_actual_bytes = actual_bytes;
                };
            recording::GStreamerSegmentWriter catalog_failure_writer(
                catalog_failure_options);
            int catalog_failure_callbacks = 0;
            Expect(catalog_failure_writer.Start(
                       "channel-catalog-failure", "epoch-catalog-failure", descriptor,
                       [&](recording::RecordingSegmentV1,
                           std::string,
                           std::string* callback_error) {
                           ++catalog_failure_callbacks;
                           if (callback_error != nullptr) {
                               *callback_error = "injected journal failure";
                           }
                           return false;
                       }, &error),
                   "catalog finalize 실패 writer 시작");
            for (const auto& packet : packets) {
                catalog_failure_writer.Push(
                    packet, 50000 + (packet.pts - base_pts) / 1000000);
            }
            catalog_failure_writer.Stop();
            Expect(catalog_failure_callbacks == 1 &&
                       catalog_failure_completions == 1 &&
                       catalog_failure_actual_bytes > 0 &&
                       CountSuffix(catalog_failure_root, ".mp4") == 0 &&
                       CountSuffix(catalog_failure_root, ".partial") == 0,
                   "catalog journal/finalize 실패 파일을 제거하고 실제 크기로 예약 반환");

            for (const bool use_symlink : {true, false}) {
                const std::string attack_kind = use_symlink ? "symlink" : "hardlink";
                const auto marker_attack_root = root / ("marker-" + attack_kind);
                const std::string attack_channel = "channel-marker-" + attack_kind;
                recording::GStreamerSegmentWriter::Options marker_attack_options;
                marker_attack_options.storage_root = marker_attack_root;
                marker_attack_options.segment_duration_ms = 60000;
                marker_attack_options.admit_segment =
                    [](const std::string&, std::uint64_t minimum_bytes) {
                        return recording::SegmentAdmissionDecision{
                            true, false,
                            std::max<std::uint64_t>(minimum_bytes, 16ULL * 1024ULL * 1024ULL)};
                    };
                int marker_attack_callbacks = 0;
                recording::GStreamerSegmentWriter marker_attack_writer(
                    marker_attack_options);
                Expect(marker_attack_writer.Start(
                           attack_channel, "epoch-marker-attack", descriptor,
                           [&](recording::RecordingSegmentV1,
                               std::string,
                               std::string*) {
                               ++marker_attack_callbacks;
                               return true;
                           }, &error),
                       "cleanup marker " + attack_kind + " 선점 공격 writer 시작");
                const auto external_target = root / ("marker-" + attack_kind + "-target.txt");
                {
                    std::ofstream output(external_target, std::ios::binary | std::ios::trunc);
                    output << "외부-보존-내용";
                }
                const auto marker_path = marker_attack_root / attack_channel /
                    ("seg-" + attack_channel + "-55000-1.mp4.cleanup-pending");
                std::error_code link_error;
                if (use_symlink) {
                    std::filesystem::create_symlink(external_target, marker_path, link_error);
                } else {
                    std::filesystem::create_hard_link(external_target, marker_path, link_error);
                }
                Expect(!link_error, "cleanup marker " + attack_kind + " 선점 fixture 생성");
                marker_attack_writer.Push(packets.front(), 55000);
                marker_attack_writer.Stop();
                Expect(marker_attack_callbacks == 0 &&
                           ReadText(external_target) == "외부-보존-내용",
                       "cleanup marker " + attack_kind +
                           " 선점 시 root 밖/공유 inode 내용을 truncate하지 않음");
                std::filesystem::remove_all(marker_attack_root, link_error);
                std::filesystem::remove(external_target, link_error);
            }

            recording::GStreamerSegmentWriter::Options marker_remove_failure_options;
            const auto marker_remove_failure_root = root / "marker-remove-failure";
            marker_remove_failure_options.storage_root = marker_remove_failure_root;
            marker_remove_failure_options.segment_duration_ms = 60000;
            marker_remove_failure_options.admit_segment =
                [](const std::string&, std::uint64_t minimum_bytes) {
                    return recording::SegmentAdmissionDecision{
                        true, false,
                        std::max<std::uint64_t>(minimum_bytes, 16ULL * 1024ULL * 1024ULL)};
                };
            int marker_remove_failure_completions = 0;
            marker_remove_failure_options.complete_segment =
                [&](const std::string&, std::uint64_t) {
                    ++marker_remove_failure_completions;
                };
            recording::GStreamerSegmentWriter marker_remove_failure_writer(
                marker_remove_failure_options);
            bool marker_remove_permission_changed = false;
            Expect(marker_remove_failure_writer.Start(
                       "channel-marker-remove", "epoch-marker-remove", descriptor,
                       [&](recording::RecordingSegmentV1,
                           std::string media_path,
                           std::string*) {
                           std::error_code permission_error;
                           std::filesystem::permissions(
                               std::filesystem::path(media_path).parent_path(),
                               std::filesystem::perms::owner_read |
                                   std::filesystem::perms::owner_exec,
                               std::filesystem::perm_options::replace,
                               permission_error);
                           marker_remove_permission_changed = !permission_error;
                           return true;
                       }, &error),
                   "catalog 성공 뒤 marker 제거 실패 writer 시작");
            for (const auto& packet : packets) {
                marker_remove_failure_writer.Push(
                    packet, 58000 + (packet.pts - base_pts) / 1000000);
            }
            marker_remove_failure_writer.Stop();
            Expect(marker_remove_permission_changed &&
                       marker_remove_failure_completions == 0 &&
                       CountSuffix(marker_remove_failure_root, ".mp4") == 1 &&
                       CountSuffix(marker_remove_failure_root, ".cleanup-pending") == 1,
                   "catalog 성공 뒤 marker 제거 실패 시 예약과 marker를 유지");
            std::error_code marker_remove_cleanup_error;
            std::filesystem::permissions(
                marker_remove_failure_root / "channel-marker-remove",
                std::filesystem::perms::owner_all,
                std::filesystem::perm_options::replace,
                marker_remove_cleanup_error);
            std::filesystem::remove_all(
                marker_remove_failure_root, marker_remove_cleanup_error);

            recording::GStreamerSegmentWriter::Options cleanup_failure_options;
            const auto cleanup_failure_root = root / "finalize-cleanup-failure";
            cleanup_failure_options.storage_root = cleanup_failure_root;
            cleanup_failure_options.segment_duration_ms = 60000;
            cleanup_failure_options.admit_segment =
                [](const std::string&, std::uint64_t minimum_bytes) {
                    return recording::SegmentAdmissionDecision{
                        true, false,
                        std::max<std::uint64_t>(minimum_bytes, 16ULL * 1024ULL * 1024ULL)};
                };
            int cleanup_failure_completions = 0;
            cleanup_failure_options.complete_segment =
                [&](const std::string&, std::uint64_t) {
                    ++cleanup_failure_completions;
                };
            recording::GStreamerSegmentWriter cleanup_failure_writer(
                cleanup_failure_options);
            bool cleanup_permission_changed = false;
            Expect(cleanup_failure_writer.Start(
                       "channel-cleanup-failure", "epoch-cleanup-failure", descriptor,
                       [&](recording::RecordingSegmentV1,
                           std::string media_path,
                           std::string*) {
                           std::error_code permission_error;
                           std::filesystem::permissions(
                               media_path,
                               std::filesystem::perms::owner_read,
                               std::filesystem::perm_options::replace,
                               permission_error);
                           cleanup_permission_changed = !permission_error;
                           std::filesystem::permissions(
                               std::filesystem::path(media_path).parent_path(),
                               std::filesystem::perms::owner_read |
                                   std::filesystem::perms::owner_exec,
                               std::filesystem::perm_options::replace,
                               permission_error);
                           cleanup_permission_changed =
                               cleanup_permission_changed && !permission_error;
                           return false;
                       }, &error),
                   "final media cleanup 실패 writer 시작");
            for (const auto& packet : packets) {
                cleanup_failure_writer.Push(
                    packet, 60000 + (packet.pts - base_pts) / 1000000);
            }
            cleanup_failure_writer.Stop();
            Expect(cleanup_permission_changed && cleanup_failure_completions == 0 &&
                       CountSuffix(cleanup_failure_root, ".mp4") == 1 &&
                       CountSuffix(cleanup_failure_root, ".cleanup-pending") == 1,
                   "final media 제거 실패 시 durable marker를 남기고 예약을 반환하지 않음");
            std::error_code cleanup_permission_error;
            std::filesystem::permissions(
                cleanup_failure_root / "channel-cleanup-failure",
                std::filesystem::perms::owner_all,
                std::filesystem::perm_options::replace,
                cleanup_permission_error);
            for (const auto& entry : std::filesystem::directory_iterator(
                     cleanup_failure_root / "channel-cleanup-failure",
                     cleanup_permission_error)) {
                std::filesystem::permissions(
                    entry.path(), std::filesystem::perms::owner_all,
                    std::filesystem::perm_options::replace,
                    cleanup_permission_error);
            }
            std::filesystem::remove_all(cleanup_failure_root, cleanup_permission_error);
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
