#pragma once
// 파일 용도: WebRTC media/session/source application service의 opaque 계약을 선언한다.
#include <cstddef>
#include <cstdint>
#include <functional>
#include <memory>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

namespace ingress {

struct AnalysisSessionApplicationResult;
using WebRtcMediaApplicationAnalysisResultProvider =
    std::function<bool(std::int64_t, AnalysisSessionApplicationResult*)>;

struct WebRtcMediaApplicationRequest {
    std::string protocol;
    std::string path;
    std::unordered_map<std::string, std::string> query;
    std::string client_id;
};

enum class WebRtcMediaApplicationSourceKind {
    Rtsp,
    File,
    WebRtc,
    Whep,
    Hls,
    Http,
    Youtube,
};

struct WebRtcMediaApplicationIceCandidate {
    std::uint32_t sdp_mline_index{0};
    std::string candidate;
};

struct WebRtcMediaApplicationMetadataChannelConfig {
    bool enabled{false};
    std::string label{"va-metadata"};
    int interval_ms{500};
    std::size_t max_message_bytes{65536};
    std::size_t max_buffered_bytes{262144};
};

struct WebRtcMediaApplicationMetadataChannelStats {
    std::string session_id;
    bool enabled{false};
    bool open{false};
    std::string label{"va-metadata"};
    int interval_ms{500};
    std::size_t max_message_bytes{65536};
    std::size_t max_buffered_bytes{262144};
    std::uint64_t sent_count{0};
    std::uint64_t dropped_count{0};
    std::uint64_t skipped_count{0};
    std::uint64_t interval_skipped_count{0};
    std::uint64_t oversized_drop_count{0};
    std::uint64_t buffered_drop_count{0};
    std::uint64_t send_failure_count{0};
    std::uint64_t last_buffered_amount{0};
    std::uint64_t max_buffered_amount{0};
    std::uint64_t last_message_bytes{0};
    std::uint64_t max_message_bytes_observed{0};
};

struct WebRtcMediaApplicationRuntimeStateSnapshot {
    std::size_t active_sessions{0};
    std::size_t resource_active_sessions{0};
    std::size_t resource_active_streams{0};
    std::size_t registry_active_streams{0};
    std::size_t active_analysis_taps{0};
};

struct WebRtcMediaApplicationSourceReconnectStats {
    std::string stream_key;
    int reconnect_count{0};
    std::int64_t last_reconnect_at_ms{0};
};

struct WebRtcMediaApplicationSourceDescriptorSnapshot {
    std::string stream_key;
    struct Track {
        std::string track_id;
        std::string kind;
        std::string codec;
        std::string codec_name;
        std::string caps_string;
        int clock_rate{0};
        int channels{0};
    };
    struct Descriptor {
        std::vector<Track> tracks;
        bool is_live{false};
    } descriptor;
};

struct WebRtcMediaApplicationSourceEgressStats {
    std::string stream_key;
    std::size_t session_count{0};
    std::size_t analysis_tap_count{0};
};

struct WebRtcMediaApplicationPublishedSourceSnapshot {
    std::string source_id;
    bool active{false};
    bool has_descriptor{false};
    bool has_video{false};
    bool has_audio{false};
    std::size_t subscriber_count{0};
    std::optional<WebRtcMediaApplicationSourceDescriptorSnapshot::Descriptor> descriptor;
};

struct WebRtcMediaApplicationEgressStartResult {
    bool ok{false};
    bool session_created{false};
    std::string message;
};

class WebRtcMediaApplicationEgressSession {
public:
    virtual ~WebRtcMediaApplicationEgressSession() = default;

    virtual WebRtcMediaApplicationEgressStartResult Start(
        const std::string& session_id,
        const WebRtcMediaApplicationRequest& request) = 0;
    virtual void Stop() = 0;
    virtual void ConfigureAnalysisOverlay(
        const std::unordered_map<std::string, std::string>& query,
        bool render_video_overlay,
        WebRtcMediaApplicationAnalysisResultProvider result_provider) = 0;
    virtual void SetMetadataChannelConfig(WebRtcMediaApplicationMetadataChannelConfig config) = 0;
    virtual bool MetadataChannelReady() const = 0;
    virtual WebRtcMediaApplicationMetadataChannelStats MetadataChannelStatsSnapshot() const = 0;
    virtual bool PublishAnalysisMetadata(const std::string& message) = 0;
    virtual std::int64_t ResolveOverlaySourcePts(std::int64_t normalized_pts) const = 0;
    virtual bool CreateOffer(std::string* sdp_offer, std::string* error_message) = 0;
    virtual bool CreateAnswer(std::string* sdp_answer, std::string* error_message) = 0;
    virtual bool SetRemoteOffer(const std::string& sdp_offer, std::string* error_message) = 0;
    virtual bool SetRemoteAnswer(const std::string& sdp_answer, std::string* error_message) = 0;
    virtual void AddRemoteIceCandidate(
        std::uint32_t sdp_mline_index,
        const std::string& candidate) = 0;
    virtual std::vector<WebRtcMediaApplicationIceCandidate> TakePendingLocalIceCandidates() = 0;
};

class WebRtcMediaApplicationSourceSession {
public:
    virtual ~WebRtcMediaApplicationSourceSession() = default;

    virtual bool Start(
        const std::string& session_id,
        const std::string& source_id,
        std::string* error_message) = 0;
    virtual void Stop() = 0;
    virtual bool SetRemoteOffer(const std::string& sdp_offer, std::string* error_message) = 0;
    virtual bool CreateAnswer(std::string* sdp_answer, std::string* error_message) = 0;
    virtual void AddRemoteIceCandidate(
        std::uint32_t sdp_mline_index,
        const std::string& candidate) = 0;
    virtual std::vector<WebRtcMediaApplicationIceCandidate> TakePendingLocalIceCandidates() = 0;
};

class WebRtcMediaApplicationService {
public:
    virtual ~WebRtcMediaApplicationService() = default;

    virtual std::shared_ptr<WebRtcMediaApplicationEgressSession> CreateEgressSession() = 0;
    virtual std::shared_ptr<WebRtcMediaApplicationSourceSession> CreateSourceSession() = 0;
    virtual bool CloseSession(const std::string& session_id) = 0;
    virtual WebRtcMediaApplicationRuntimeStateSnapshot RuntimeStateSnapshot() const = 0;
    virtual std::vector<WebRtcMediaApplicationSourceReconnectStats>
    SourceReconnectStatsSnapshot() const = 0;
    virtual std::vector<WebRtcMediaApplicationSourceDescriptorSnapshot>
    SourceDescriptorSnapshots() const = 0;
    virtual std::vector<WebRtcMediaApplicationSourceEgressStats>
    SourceEgressStatsSnapshot() const = 0;
    virtual std::vector<WebRtcMediaApplicationPublishedSourceSnapshot>
    PublishedSourceSnapshots() const = 0;
};

}  // namespace ingress
