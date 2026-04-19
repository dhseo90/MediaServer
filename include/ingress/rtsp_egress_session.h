#pragma once

#include <memory>
#include <string>

#include "core/egress_session.h"
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

private:
#if MEDIA_SERVER_USE_GSTREAMER
    bool ConfigureAppSrcCaps(const media::StreamDescriptor& descriptor, std::string* error_message);
#endif

    std::string session_id_;
    std::string video_track_id_;
    std::string audio_track_id_;
    VideoCodec video_codec_;
    media::CodecId audio_codec_;
    bool started_{false};

#if MEDIA_SERVER_USE_GSTREAMER
    GstElement* media_element_{nullptr};
    GstElement* video_appsrc_{nullptr};
    GstElement* audio_appsrc_{nullptr};
#endif
};

}  // namespace ingress
