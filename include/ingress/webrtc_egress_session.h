// 파일 용도: SharedStream을 WebRTC peer connection으로 송출하는 egress 세션을 선언한다.
#pragma once

#include <deque>
#include <optional>
#include <string>
#include <vector>

#include "core/egress_session.h"
#include "media_types.h"

#if MEDIA_SERVER_USE_GSTREAMER
struct _GstElement;
using GstElement = _GstElement;
struct _GstWebRTCRTPTransceiver;
using GstWebRTCRTPTransceiver = _GstWebRTCRTPTransceiver;
#endif

namespace ingress {

struct WebRtcIceCandidate {
    std::uint32_t sdp_mline_index{0};
    std::string candidate;
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
    void TraceRtpOut(const char* kind, std::size_t bytes);
    void TracePadBuffer(const std::string& label, std::size_t bytes);
    void TraceSdpSummary(const char* label, const std::string& sdp_text) const;
    void TraceTransceivers(const char* label) const;
    void TraceTransceiver(const char* label, GstWebRTCRTPTransceiver* transceiver) const;
    void RecalculateLatency();
    GstElement* webrtcbin() const { return webrtcbin_; }
#endif

private:
    // WebRTC negotiation/transport 준비 전 들어온 패킷을 보관하고 RTP timeline에 맞게 재정렬한다.
    void QueuePendingPacket(const media::Packet& packet);
#if MEDIA_SERVER_USE_GSTREAMER
    bool ConfigureAppSrcCaps(const media::StreamDescriptor& descriptor, std::string* error_message);
    bool EnsureTransportPadsLinked(bool answerer_mode, std::string* error_message);
    void ConfigureRtcpFeedbackRetention();
    media::Packet NormalizeTimestamps(const media::Packet& packet);
    media::Packet NormalizeReplayVideoKeyframe(const media::Packet& packet);
    void ApplyNegotiatedPayloadTypes(const std::string& sdp_text);
    void ReplayCachedVideoKeyframe();
    void FlushPendingPackets();
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
    mutable std::mutex pending_mu_;
    std::deque<media::Packet> pending_packets_;
    std::optional<media::Packet> last_video_keyframe_;

    mutable std::mutex signal_mu_;
    std::condition_variable signal_cv_;
    std::optional<std::string> local_offer_;
    std::vector<WebRtcIceCandidate> pending_local_ice_candidates_;
    std::string negotiation_error_;
    bool started_{false};
    bool media_output_ready_{false};

#if MEDIA_SERVER_USE_GSTREAMER
    GstElement* pipeline_{nullptr};
    GstElement* video_appsrc_{nullptr};
    GstElement* audio_appsrc_{nullptr};
    GstElement* webrtcbin_{nullptr};
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
