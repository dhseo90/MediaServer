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
    GstElement* webrtcbin() const { return webrtcbin_; }
#endif

private:
#if MEDIA_SERVER_USE_GSTREAMER
    bool ConfigureAppSrcCaps(const media::StreamDescriptor& descriptor, std::string* error_message);
#endif

    std::string session_id_;
    std::string video_track_id_;
    std::string audio_track_id_;
    mutable std::mutex pending_mu_;
    std::deque<media::Packet> pending_packets_;

    mutable std::mutex signal_mu_;
    std::condition_variable signal_cv_;
    std::optional<std::string> local_offer_;
    std::vector<WebRtcIceCandidate> pending_local_ice_candidates_;
    std::string negotiation_error_;
    bool started_{false};

#if MEDIA_SERVER_USE_GSTREAMER
    GstElement* pipeline_{nullptr};
    GstElement* video_appsrc_{nullptr};
    GstElement* audio_appsrc_{nullptr};
    GstElement* webrtcbin_{nullptr};
    unsigned int bus_watch_id_{0};
    std::size_t traced_video_samples_{0};
    std::size_t traced_audio_samples_{0};
    std::size_t traced_video_rtp_{0};
    std::size_t traced_audio_rtp_{0};
    std::size_t traced_pad_buffers_{0};
#endif
};

}  // namespace ingress
