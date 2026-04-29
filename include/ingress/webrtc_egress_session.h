// 파일 요약: SharedStream을 WebRTC peer로 송출하는 egress session을 선언한다.
// 동작 요약: offer/answer, ICE, state snapshot, session stop API를 제공한다.
// 동작 요약: HTTP signaling handler가 GStreamer WebRTC 구현을 제어하는 계약이다.
#pragma once

#include <deque>
#include <optional>
#include <string>
#include <vector>

#include "core/egress_session.h"
#include "ingress/analysis_overlay_probe.h"
#include "media_types.h"

#if MEDIA_SERVER_USE_GSTREAMER
struct _GstElement;
using GstElement = _GstElement;
struct _GstWebRTCRTPTransceiver;
using GstWebRTCRTPTransceiver = _GstWebRTCRTPTransceiver;
struct _GstWebRTCDataChannel;
using GstWebRTCDataChannel = _GstWebRTCDataChannel;
#endif

namespace ingress {

struct WebRtcIceCandidate {
    std::uint32_t sdp_mline_index{0};
    std::string candidate;
};

struct WebRtcMetadataChannelConfig {
    bool enabled{false};
    std::string label{"va-metadata"};
    int interval_ms{500};
    std::size_t max_message_bytes{65536};
    std::size_t max_buffered_bytes{262144};
};

class WebRtcEgressSession final : public core::EgressSession {
public:
    WebRtcEgressSession();
    ~WebRtcEgressSession() override;

    bool Start(const std::string& session_id,
               const std::shared_ptr<core::SharedStream>& stream,
               std::string* error_message) override;
    void Stop() override;

    void HandleSample(const media::Packet& packet);
    void SetAnalysisOverlay(AnalysisOverlayConfig config);
    void SetMetadataChannelConfig(WebRtcMetadataChannelConfig config);
    bool PublishAnalysisMetadata(const std::string& message);
    std::int64_t ResolveOverlaySourcePts(std::int64_t normalized_pts) const;

    bool CreateOffer(std::string* sdp_offer, std::string* error_message);
    bool CreateAnswer(std::string* sdp_answer, std::string* error_message);
    bool SetRemoteOffer(const std::string& sdp_offer, std::string* error_message);
    bool SetRemoteAnswer(const std::string& sdp_answer, std::string* error_message);
    void AddRemoteIceCandidate(std::uint32_t sdp_mline_index, const std::string& candidate);

    std::optional<std::string> local_offer() const;
    std::vector<WebRtcIceCandidate> TakePendingLocalIceCandidates();

#if MEDIA_SERVER_USE_GSTREAMER
    void HandleLocalIceCandidate(std::uint32_t sdp_mline_index, const std::string& candidate);
    void HandleOfferCreated(const std::string& sdp_offer, const std::string& error_message);
    void HandleIceConnectionStateChanged();
    void HandleMetadataChannelOpen();
    void HandleMetadataChannelClose();
    void HandleMetadataChannelError(const std::string& message);
    void TraceRtpOut(const char* kind, std::size_t bytes);
    void TracePadBuffer(const std::string& label, std::size_t bytes);
    void TraceSdpSummary(const char* label, const std::string& sdp_text) const;
    void TraceTransceivers(const char* label) const;
    void TraceTransceiver(const char* label, GstWebRTCRTPTransceiver* transceiver) const;
    void RecalculateLatency();
    GstElement* webrtcbin() const { return webrtcbin_; }
#endif

private:
    struct TimestampMapping {
        std::int64_t normalized_pts{0};
        std::int64_t source_pts{0};
    };

    // WebRTC negotiation/transport 준비 전 들어온 패킷을 보관하고 RTP timeline에 맞게 재정렬한다.
    void QueuePendingPacket(const media::Packet& packet);
#if MEDIA_SERVER_USE_GSTREAMER
    bool ConfigureAppSrcCaps(const media::StreamDescriptor& descriptor, std::string* error_message);
    bool EnsureTransportPadsLinked(bool answerer_mode, std::string* error_message);
    void ConfigureRtcpFeedbackRetention();
    media::Packet NormalizeTimestamps(const media::Packet& packet);
    media::Packet NormalizeReplayVideoKeyframe(const media::Packet& packet);
    void DropPendingVideoThroughKeyframe(const media::Packet& keyframe);
    void ApplyNegotiatedPayloadTypes(const std::string& sdp_text);
    void MarkNegotiationReady(const char* reason);
    void StartMediaOutputIfReady(const char* reason);
    void ReplayCachedVideoKeyframe();
    void FlushPendingPackets();
    bool EnsureMetadataDataChannel();
#endif

    std::string session_id_;
    std::string video_track_id_;
    std::string audio_track_id_;
    int remote_video_mline_index_{-1};
    int remote_audio_mline_index_{-1};
    int remote_video_payload_type_{-1};
    int remote_audio_payload_type_{-1};
    std::optional<std::int64_t> video_base_pts_;
    std::optional<std::int64_t> audio_base_pts_;
    std::optional<std::int64_t> last_video_pts_;
    std::optional<std::int64_t> last_video_dts_;
    std::int64_t last_video_frame_duration_ns_{0};
    std::deque<TimestampMapping> video_timestamp_mappings_;
    std::optional<std::int64_t> last_audio_pts_;
    std::int64_t last_audio_frame_duration_ns_{0};
    mutable std::mutex pending_mu_;
    std::deque<media::Packet> pending_packets_;
    std::optional<media::Packet> last_video_keyframe_;

    mutable std::mutex signal_mu_;
    std::condition_variable signal_cv_;
    std::optional<std::string> local_offer_;
    std::vector<WebRtcIceCandidate> pending_local_ice_candidates_;
    std::string negotiation_error_;
    bool started_{false};
    bool negotiation_ready_{false};
    bool ice_connected_{false};
    bool media_output_ready_{false};
    AnalysisOverlayConfig analysis_overlay_;
    WebRtcMetadataChannelConfig metadata_channel_config_;
    mutable std::mutex metadata_mu_;
    std::int64_t last_metadata_sent_at_ms_{0};
    std::uint64_t metadata_messages_sent_{0};
    std::uint64_t metadata_messages_dropped_{0};
    std::uint64_t metadata_send_failures_{0};
    bool metadata_channel_open_{false};

#if MEDIA_SERVER_USE_GSTREAMER
    GstElement* pipeline_{nullptr};
    GstElement* video_appsrc_{nullptr};
    GstElement* audio_appsrc_{nullptr};
    GstElement* webrtcbin_{nullptr};
    GstWebRTCDataChannel* metadata_data_channel_{nullptr};
    unsigned int bus_watch_id_{0};
    bool transport_pads_linked_{false};
    std::size_t traced_video_samples_{0};
    std::size_t traced_audio_samples_{0};
    std::size_t traced_video_rtp_{0};
    std::size_t traced_audio_rtp_{0};
    std::size_t traced_pad_buffers_{0};
    std::size_t traced_video_parse_src_{0};
    std::size_t traced_video_pay_sink_{0};
    std::size_t traced_video_pay_src_{0};
    std::size_t traced_video_rtp_src_{0};
    std::size_t traced_video_branch_buffers_{0};
    std::size_t traced_rtcp_retention_{0};
#endif
};

}  // namespace ingress
