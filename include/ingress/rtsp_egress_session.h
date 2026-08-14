// 파일 요약: SharedStream을 RTSP appsrc로 보내는 egress session을 선언한다.
// 동작 요약: media 준비, packet queue, timestamp 보정, source subscription lifecycle을 관리한다.
// 동작 요약: GStreamer RTSP media와 core stream 사이의 bridge 계약이다.
#pragma once

#include <deque>
#include <memory>
#include <mutex>
#include <optional>
#include <string>

#include "core/egress_session.h"
#include "core/media_analysis_port.h"
#include "ingress/rtsp_request_context.h"

#if MEDIA_SERVER_USE_GSTREAMER
struct _GstElement;
using GstElement = _GstElement;
#endif

namespace ingress {

class RtspEgressSession final : public core::EgressSession {
public:
#if MEDIA_SERVER_USE_GSTREAMER
    RtspEgressSession(GstElement* media_element, VideoCodec video_codec, media::CodecId audio_codec);
#else
    RtspEgressSession(void* media_element, VideoCodec video_codec, media::CodecId audio_codec);
#endif
    ~RtspEgressSession() override;

    bool Start(const std::string& session_id,
               const std::shared_ptr<core::SharedStream>& stream,
               std::string* error_message) override;
    void Stop() override;

    void HandleSample(const media::Packet& packet);
    void SetPipelineAttachment(core::MediaPipelineAttachment attachment);
    std::int64_t ResolveOverlaySourcePts(std::int64_t normalized_pts) const;

private:
    struct TimestampMapping {
        std::int64_t normalized_pts{0};
        std::int64_t source_pts{0};
    };

    // RTSP media prepare 이전에 들어온 초기 샘플을 보관하고 세션 시작 기준 timestamp로 재작성한다.
    void QueuePendingPacket(const media::Packet& packet);
    void FlushPendingPackets();
    media::Packet NormalizeTimestamps(const media::Packet& packet);

#if MEDIA_SERVER_USE_GSTREAMER
    bool ConfigureAppSrcCaps(const media::StreamDescriptor& descriptor, std::string* error_message);
    void PushSilentAudioPriming();
#endif

    std::string session_id_;
    std::string video_track_id_;
    std::string audio_track_id_;
    VideoCodec video_codec_;
    media::CodecId audio_codec_;
    mutable std::mutex pending_mu_;
    std::deque<media::Packet> pending_packets_;
    std::optional<std::int64_t> video_base_pts_;
    std::optional<std::int64_t> audio_base_pts_;
    std::optional<std::int64_t> last_video_pts_;
    std::optional<std::int64_t> last_video_dts_;
    std::int64_t last_video_frame_duration_ns_{0};
    std::deque<TimestampMapping> video_timestamp_mappings_;
    std::optional<std::int64_t> last_audio_pts_;
    std::int64_t last_audio_frame_duration_ns_{0};
    bool synthesize_silent_audio_{false};
    core::MediaPipelineAttachment pipeline_attachment_;
    bool started_{false};
    bool stop_recorded_{false};

#if MEDIA_SERVER_USE_GSTREAMER
    GstElement* media_element_{nullptr};
    GstElement* video_appsrc_{nullptr};
    GstElement* audio_appsrc_{nullptr};
#endif
};

}  // namespace ingress
