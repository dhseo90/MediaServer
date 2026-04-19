#pragma once

#include <chrono>
#include <condition_variable>
#include <mutex>
#include <memory>
#include <optional>
#include <string>
#include <thread>
#include <vector>

#include "ingress/webrtc_egress_session.h"
#include "ingress/webrtc_source_registry.h"

#if MEDIA_SERVER_USE_GSTREAMER
struct _GstElement;
using GstElement = _GstElement;
struct _GstPad;
using GstPad = _GstPad;
#endif

namespace ingress {

class WebRtcSourceSession {
public:
    WebRtcSourceSession();
    ~WebRtcSourceSession();

    bool Start(const std::string& session_id, const std::string& source_id, std::string* error_message);
    void Stop();

    bool SetRemoteOffer(const std::string& sdp_offer, std::string* error_message);
    bool CreateAnswer(std::string* sdp_answer, std::string* error_message);
    void AddRemoteIceCandidate(std::uint32_t sdp_mline_index, const std::string& candidate);
    std::vector<WebRtcIceCandidate> TakePendingLocalIceCandidates();

    const std::string& source_id() const;

#if MEDIA_SERVER_USE_GSTREAMER
    void HandleLocalIceCandidate(std::uint32_t sdp_mline_index, const std::string& candidate);
    void HandleAnswerCreated(const std::string& sdp_answer, const std::string& error_message);
    void HandlePadAdded(GstPad* pad);
    GstElement* webrtcbin() const { return webrtcbin_; }
#endif

private:
#if MEDIA_SERVER_USE_GSTREAMER
    struct SinkBranch;

    void SampleLoop(SinkBranch* branch);
    void BusLoop();
    std::unique_ptr<SinkBranch> CreateBranch(const media::TrackInfo& track);
#endif

    std::string session_id_;
    std::string source_id_;
    std::shared_ptr<PublishedWebRtcSource> published_source_;

    mutable std::mutex signal_mu_;
    std::condition_variable signal_cv_;
    std::optional<std::string> local_answer_;
    std::vector<WebRtcIceCandidate> pending_local_ice_candidates_;
    std::string negotiation_error_;
    bool started_{false};

#if MEDIA_SERVER_USE_GSTREAMER
    GstElement* pipeline_{nullptr};
    GstElement* webrtcbin_{nullptr};
    std::thread bus_thread_;
    std::mutex source_mu_;
    media::StreamDescriptor descriptor_;
    std::size_t ready_sample_count_{0};
    std::vector<std::unique_ptr<SinkBranch>> branches_;
#endif
};

}  // namespace ingress
