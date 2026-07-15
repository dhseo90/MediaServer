#include "ingress/webrtc_media_application_adapter.h"

#include <utility>

#include "core/session_manager.h"
#include "core/webrtc_source_registry.h"
#include "ingress/analysis_frame_application_service.h"
#include "analysis_session_application_mapping.h"
#include "ingress/webrtc_egress_session.h"
#include "ingress/webrtc_source_session.h"

namespace ingress {
namespace {

media::IngressRequest ToCanonicalRequest(const WebRtcMediaApplicationRequest& input) {
    media::IngressRequest output;
    output.protocol = input.protocol;
    output.path = input.path;
    output.query = input.query;
    output.client_id = input.client_id;
    return output;
}

WebRtcMediaApplicationIceCandidate ProjectIceCandidate(const WebRtcIceCandidate& input) {
    WebRtcMediaApplicationIceCandidate output;
    output.sdp_mline_index = input.sdp_mline_index;
    output.candidate = input.candidate;
    return output;
}

WebRtcMediaApplicationMetadataChannelStats ProjectMetadataStats(
    const WebRtcMetadataChannelStats& input) {
    WebRtcMediaApplicationMetadataChannelStats output;
    output.session_id = input.session_id;
    output.enabled = input.enabled;
    output.open = input.open;
    output.label = input.label;
    output.interval_ms = input.interval_ms;
    output.max_message_bytes = input.max_message_bytes;
    output.max_buffered_bytes = input.max_buffered_bytes;
    output.sent_count = input.sent_count;
    output.dropped_count = input.dropped_count;
    output.skipped_count = input.skipped_count;
    output.interval_skipped_count = input.interval_skipped_count;
    output.oversized_drop_count = input.oversized_drop_count;
    output.buffered_drop_count = input.buffered_drop_count;
    output.send_failure_count = input.send_failure_count;
    output.last_buffered_amount = input.last_buffered_amount;
    output.max_buffered_amount = input.max_buffered_amount;
    output.last_message_bytes = input.last_message_bytes;
    output.max_message_bytes_observed = input.max_message_bytes_observed;
    return output;
}

WebRtcMediaApplicationSourceDescriptorSnapshot::Track ProjectTrack(
    const media::TrackInfo& input) {
    WebRtcMediaApplicationSourceDescriptorSnapshot::Track output;
    output.track_id = input.track_id;
    output.kind = media::ToString(input.kind);
    output.codec = media::ToString(input.codec);
    output.codec_name = input.codec_name;
    output.caps_string = input.caps_string;
    output.clock_rate = input.clock_rate;
    output.channels = input.channels;
    return output;
}

WebRtcMediaApplicationSourceDescriptorSnapshot::Descriptor ProjectDescriptor(
    const media::StreamDescriptor& input) {
    WebRtcMediaApplicationSourceDescriptorSnapshot::Descriptor output;
    output.tracks.reserve(input.tracks.size());
    for (const auto& track : input.tracks) {
        output.tracks.push_back(ProjectTrack(track));
    }
    output.is_live = input.is_live;
    return output;
}

class CanonicalWebRtcMediaApplicationEgressSession final
    : public WebRtcMediaApplicationEgressSession {
public:
    CanonicalWebRtcMediaApplicationEgressSession(
        core::SessionManager& session_manager,
        std::shared_ptr<WebRtcEgressSession> session)
        : session_manager_(session_manager), session_(std::move(session)) {}

    WebRtcMediaApplicationEgressStartResult Start(
        const std::string& session_id,
        const WebRtcMediaApplicationRequest& request) override {
        const auto canonical_request = ToCanonicalRequest(request);
        const auto create_result = session_manager_.CreateSession(
            canonical_request,
            [session = session_](const media::Packet& packet) { session->HandleSample(packet); });
        if (!create_result.ok) {
            WebRtcMediaApplicationEgressStartResult output;
            output.ok = false;
            output.session_created = false;
            output.message = create_result.message;
            return output;
        }
        std::string error_message;
        if (!session_->Start(session_id, create_result.stream, &error_message)) {
            WebRtcMediaApplicationEgressStartResult output;
            output.ok = false;
            output.session_created = true;
            output.message = std::move(error_message);
            return output;
        }
        WebRtcMediaApplicationEgressStartResult output;
        output.ok = true;
        output.session_created = true;
        return output;
    }

    void Stop() override { session_->Stop(); }

    void ConfigureAnalysisOverlay(
        const std::unordered_map<std::string, std::string>& query,
        bool render_video_overlay,
        WebRtcMediaApplicationAnalysisResultProvider result_provider) override {
        AnalysisResultProviderForApplication canonical_provider =
            [result_provider = std::move(result_provider)](
                std::int64_t pts,
                analysis::AnalysisResult* output) mutable {
                if (output == nullptr) {
                    return false;
                }
                AnalysisSessionApplicationResult projected;
                if (!result_provider(pts, &projected)) {
                    return false;
                }
                *output = analysis_session_application_mapping::ToCanonicalResult(projected);
                return true;
            };
        session_->SetPipelineAttachment(MakeAnalysisOverlayAttachmentForApplication(
            query, render_video_overlay, std::move(canonical_provider)));
    }

    void SetMetadataChannelConfig(WebRtcMediaApplicationMetadataChannelConfig config) override {
        WebRtcMetadataChannelConfig canonical;
        canonical.enabled = config.enabled;
        canonical.label = std::move(config.label);
        canonical.interval_ms = config.interval_ms;
        canonical.max_message_bytes = config.max_message_bytes;
        canonical.max_buffered_bytes = config.max_buffered_bytes;
        session_->SetMetadataChannelConfig(std::move(canonical));
    }

    bool MetadataChannelReady() const override { return session_->MetadataChannelReady(); }

    WebRtcMediaApplicationMetadataChannelStats MetadataChannelStatsSnapshot() const override {
        return ProjectMetadataStats(session_->MetadataChannelStatsSnapshot());
    }

    bool PublishAnalysisMetadata(const std::string& message) override {
        return session_->PublishAnalysisMetadata(message);
    }

    std::int64_t ResolveOverlaySourcePts(std::int64_t normalized_pts) const override {
        return session_->ResolveOverlaySourcePts(normalized_pts);
    }

    bool CreateOffer(std::string* sdp_offer, std::string* error_message) override {
        return session_->CreateOffer(sdp_offer, error_message);
    }

    bool CreateAnswer(std::string* sdp_answer, std::string* error_message) override {
        return session_->CreateAnswer(sdp_answer, error_message);
    }

    bool SetRemoteOffer(const std::string& sdp_offer, std::string* error_message) override {
        return session_->SetRemoteOffer(sdp_offer, error_message);
    }

    bool SetRemoteAnswer(const std::string& sdp_answer, std::string* error_message) override {
        return session_->SetRemoteAnswer(sdp_answer, error_message);
    }

    void AddRemoteIceCandidate(
        std::uint32_t sdp_mline_index,
        const std::string& candidate) override {
        session_->AddRemoteIceCandidate(sdp_mline_index, candidate);
    }

    std::vector<WebRtcMediaApplicationIceCandidate> TakePendingLocalIceCandidates() override {
        std::vector<WebRtcMediaApplicationIceCandidate> output;
        const auto canonical = session_->TakePendingLocalIceCandidates();
        output.reserve(canonical.size());
        for (const auto& candidate : canonical) {
            output.push_back(ProjectIceCandidate(candidate));
        }
        return output;
    }

private:
    core::SessionManager& session_manager_;
    std::shared_ptr<WebRtcEgressSession> session_;
};

class CanonicalWebRtcMediaApplicationSourceSession final
    : public WebRtcMediaApplicationSourceSession {
public:
    explicit CanonicalWebRtcMediaApplicationSourceSession(
        std::shared_ptr<WebRtcSourceSession> session)
        : session_(std::move(session)) {}

    bool Start(
        const std::string& session_id,
        const std::string& source_id,
        std::string* error_message) override {
        return session_->Start(session_id, source_id, error_message);
    }

    void Stop() override { session_->Stop(); }

    bool SetRemoteOffer(const std::string& sdp_offer, std::string* error_message) override {
        return session_->SetRemoteOffer(sdp_offer, error_message);
    }

    bool CreateAnswer(std::string* sdp_answer, std::string* error_message) override {
        return session_->CreateAnswer(sdp_answer, error_message);
    }

    void AddRemoteIceCandidate(
        std::uint32_t sdp_mline_index,
        const std::string& candidate) override {
        session_->AddRemoteIceCandidate(sdp_mline_index, candidate);
    }

    std::vector<WebRtcMediaApplicationIceCandidate> TakePendingLocalIceCandidates() override {
        std::vector<WebRtcMediaApplicationIceCandidate> output;
        const auto canonical = session_->TakePendingLocalIceCandidates();
        output.reserve(canonical.size());
        for (const auto& candidate : canonical) {
            output.push_back(ProjectIceCandidate(candidate));
        }
        return output;
    }

private:
    std::shared_ptr<WebRtcSourceSession> session_;
};

class CanonicalWebRtcMediaApplicationService final : public WebRtcMediaApplicationService {
public:
    explicit CanonicalWebRtcMediaApplicationService(core::SessionManager& session_manager)
        : session_manager_(session_manager) {}

    std::shared_ptr<WebRtcMediaApplicationEgressSession> CreateEgressSession() override {
        return std::make_shared<CanonicalWebRtcMediaApplicationEgressSession>(
            session_manager_, std::make_shared<WebRtcEgressSession>());
    }

    std::shared_ptr<WebRtcMediaApplicationSourceSession> CreateSourceSession() override {
        return std::make_shared<CanonicalWebRtcMediaApplicationSourceSession>(
            std::make_shared<WebRtcSourceSession>());
    }

    bool CloseSession(const std::string& session_id) override {
        return session_manager_.CloseSession(session_id);
    }

    WebRtcMediaApplicationRuntimeStateSnapshot RuntimeStateSnapshot() const override {
        const auto input = session_manager_.GetRuntimeStateSnapshot();
        WebRtcMediaApplicationRuntimeStateSnapshot output;
        output.active_sessions = input.active_sessions;
        output.resource_active_sessions = input.resource_active_sessions;
        output.resource_active_streams = input.resource_active_streams;
        output.registry_active_streams = input.registry_active_streams;
        output.active_analysis_taps = input.active_analysis_taps;
        return output;
    }

    std::vector<WebRtcMediaApplicationSourceReconnectStats>
    SourceReconnectStatsSnapshot() const override {
        std::vector<WebRtcMediaApplicationSourceReconnectStats> output;
        const auto input = session_manager_.SourceReconnectStatsSnapshot();
        output.reserve(input.size());
        for (const auto& item : input) {
            WebRtcMediaApplicationSourceReconnectStats projected;
            projected.stream_key = item.stream_key;
            projected.reconnect_count = item.reconnect_count;
            projected.last_reconnect_at_ms = item.last_reconnect_at_ms;
            output.push_back(std::move(projected));
        }
        return output;
    }

    std::vector<WebRtcMediaApplicationSourceDescriptorSnapshot>
    SourceDescriptorSnapshots() const override {
        std::vector<WebRtcMediaApplicationSourceDescriptorSnapshot> output;
        const auto input = session_manager_.SourceDescriptorSnapshots();
        output.reserve(input.size());
        for (const auto& item : input) {
            WebRtcMediaApplicationSourceDescriptorSnapshot projected;
            projected.stream_key = item.stream_key;
            projected.descriptor = ProjectDescriptor(item.descriptor);
            output.push_back(std::move(projected));
        }
        return output;
    }

    std::vector<WebRtcMediaApplicationSourceEgressStats>
    SourceEgressStatsSnapshot() const override {
        std::vector<WebRtcMediaApplicationSourceEgressStats> output;
        const auto input = session_manager_.SourceEgressStatsSnapshot();
        output.reserve(input.size());
        for (const auto& item : input) {
            WebRtcMediaApplicationSourceEgressStats projected;
            projected.stream_key = item.stream_key;
            projected.session_count = item.session_count;
            projected.analysis_tap_count = item.analysis_tap_count;
            output.push_back(std::move(projected));
        }
        return output;
    }

    std::vector<WebRtcMediaApplicationPublishedSourceSnapshot>
    PublishedSourceSnapshots() const override {
        std::vector<WebRtcMediaApplicationPublishedSourceSnapshot> output;
        const auto input = WebRtcSourceRegistry::Instance().Snapshots();
        output.reserve(input.size());
        for (const auto& item : input) {
            WebRtcMediaApplicationPublishedSourceSnapshot projected;
            projected.source_id = item.source_id;
            projected.active = item.active;
            projected.has_descriptor = item.has_descriptor;
            projected.has_video = item.has_video;
            projected.has_audio = item.has_audio;
            projected.subscriber_count = item.subscriber_count;
            if (item.descriptor.has_value()) {
                projected.descriptor = ProjectDescriptor(*item.descriptor);
            }
            output.push_back(std::move(projected));
        }
        return output;
    }

private:
    core::SessionManager& session_manager_;
};

}  // namespace

std::unique_ptr<WebRtcMediaApplicationService>
MakeWebRtcMediaApplicationAdapter(core::SessionManager& session_manager) {
    return std::make_unique<CanonicalWebRtcMediaApplicationService>(session_manager);
}

}  // namespace ingress
