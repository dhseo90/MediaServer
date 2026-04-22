#include "ingress/rtsp_egress_session.h"

#include <algorithm>

#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/app/gstappsrc.h>
#include <gst/gst.h>
#endif

#include "core/shared_stream.h"

namespace ingress {

namespace {

constexpr std::size_t kMaxPendingPackets = 512;
constexpr std::int64_t kVideoFrameDurationNs = 33333333;

}  // namespace

#if MEDIA_SERVER_USE_GSTREAMER
namespace {

const media::TrackInfo* FindTrack(const media::StreamDescriptor& descriptor, media::MediaKind kind) {
    for (const auto& track : descriptor.tracks) {
        if (track.kind == kind) {
            return &track;
        }
    }
    return nullptr;
}

GstCaps* BuildCapsFromTrack(const media::TrackInfo& track) {
    if (!track.caps_string.empty()) {
        GstCaps* caps = gst_caps_from_string(track.caps_string.c_str());
        if (caps != nullptr) {
            return caps;
        }
    }

    switch (track.kind) {
        case media::MediaKind::Video:
            if (track.codec == media::CodecId::VP8) {
                return gst_caps_from_string("video/x-vp8");
            }
            if (track.codec == media::CodecId::H265) {
                return gst_caps_from_string("video/x-h265,stream-format=hvc1,alignment=au");
            }
            return gst_caps_from_string("video/x-h264,stream-format=avc,alignment=au");
        case media::MediaKind::Audio:
            switch (track.codec) {
                case media::CodecId::AAC:
                    return gst_caps_new_simple("audio/mpeg",
                                               "mpegversion",
                                               G_TYPE_INT,
                                               4,
                                               "stream-format",
                                               G_TYPE_STRING,
                                               "raw",
                                               "rate",
                                               G_TYPE_INT,
                                               track.clock_rate > 0 ? track.clock_rate : 48000,
                                               "channels",
                                               G_TYPE_INT,
                                               track.channels > 0 ? track.channels : 1,
                                               nullptr);
                case media::CodecId::Opus:
                    return gst_caps_new_simple("audio/x-opus",
                                               "channel-mapping-family",
                                               G_TYPE_INT,
                                               0,
                                               "rate",
                                               G_TYPE_INT,
                                               track.clock_rate > 0 ? track.clock_rate : 48000,
                                               "channels",
                                               G_TYPE_INT,
                                               track.channels > 0 ? track.channels : 2,
                                               nullptr);
                case media::CodecId::PCMU:
                    return gst_caps_new_simple("audio/x-mulaw",
                                               "rate",
                                               G_TYPE_INT,
                                               track.clock_rate > 0 ? track.clock_rate : 8000,
                                               "channels",
                                               G_TYPE_INT,
                                               track.channels > 0 ? track.channels : 1,
                                               nullptr);
                case media::CodecId::PCMALaw:
                    return gst_caps_new_simple("audio/x-alaw",
                                               "rate",
                                               G_TYPE_INT,
                                               track.clock_rate > 0 ? track.clock_rate : 8000,
                                               "channels",
                                               G_TYPE_INT,
                                               track.channels > 0 ? track.channels : 1,
                                               nullptr);
                case media::CodecId::Unknown:
                case media::CodecId::VP8:
                case media::CodecId::H264:
                case media::CodecId::H265:
                    return nullptr;
            }
        case media::MediaKind::Data:
            return nullptr;
    }
    return nullptr;
}

bool PushToAppSrc(GstElement* element, const media::Packet& packet) {
    if (element == nullptr || packet.payload.empty()) {
        return false;
    }

    GstBuffer* buffer = gst_buffer_new_allocate(nullptr, packet.payload.size(), nullptr);
    if (buffer == nullptr) {
        return false;
    }

    gst_buffer_fill(buffer, 0, packet.payload.data(), packet.payload.size());
    GST_BUFFER_PTS(buffer) = packet.pts >= 0 ? static_cast<GstClockTime>(packet.pts) : GST_CLOCK_TIME_NONE;
    GST_BUFFER_DTS(buffer) = packet.dts >= 0 ? static_cast<GstClockTime>(packet.dts) : GST_CLOCK_TIME_NONE;
    if (!packet.is_key_frame) {
        GST_BUFFER_FLAG_SET(buffer, GST_BUFFER_FLAG_DELTA_UNIT);
    }

    const GstFlowReturn flow = gst_app_src_push_buffer(GST_APP_SRC(element), buffer);
    return flow == GST_FLOW_OK;
}

}  // namespace
#endif

#if MEDIA_SERVER_USE_GSTREAMER
RtspEgressSession::RtspEgressSession(GstElement* media_element, VideoCodec video_codec, media::CodecId audio_codec)
    : video_codec_(video_codec), audio_codec_(audio_codec), media_element_(media_element) {
    if (media_element_ != nullptr) {
        gst_object_ref(media_element_);
    }
}
#else
RtspEgressSession::RtspEgressSession(void* /*media_element*/, VideoCodec video_codec, media::CodecId audio_codec)
    : video_codec_(video_codec), audio_codec_(audio_codec) {}
#endif

RtspEgressSession::~RtspEgressSession() {
    Stop();
}

void RtspEgressSession::QueuePendingPacket(const media::Packet& packet) {
    std::lock_guard lock(pending_mu_);
    if (packet.kind == media::MediaKind::Video && packet.is_key_frame) {
        // Keep audio priming data, but start the video branch from the freshest keyframe.
        pending_packets_.erase(
            std::remove_if(
                pending_packets_.begin(),
                pending_packets_.end(),
                [](const media::Packet& item) { return item.kind == media::MediaKind::Video; }),
            pending_packets_.end());
    }
    pending_packets_.push_back(packet);
    while (pending_packets_.size() > kMaxPendingPackets) {
        pending_packets_.pop_front();
    }
}

void RtspEgressSession::FlushPendingPackets() {
    if (!started_) {
        return;
    }

    std::deque<media::Packet> pending;
    {
        std::lock_guard lock(pending_mu_);
        pending.swap(pending_packets_);
    }

    for (const auto& packet : pending) {
        HandleSample(packet);
    }
}

media::Packet RtspEgressSession::NormalizeTimestamps(const media::Packet& packet) {
    media::Packet normalized = packet;
    if (packet.kind == media::MediaKind::Data) {
        return normalized;
    }

    std::lock_guard lock(pending_mu_);
    auto& base_pts = packet.kind == media::MediaKind::Video ? video_base_pts_ : audio_base_pts_;
    const std::int64_t source_reference = packet.pts >= 0 ? packet.pts : packet.dts;
    if (!base_pts.has_value()) {
        base_pts = source_reference >= 0 ? source_reference : 0;
    }

    const auto normalize = [&base_pts](std::int64_t value) {
        if (value < 0) {
            return std::int64_t{0};
        }
        return std::max<std::int64_t>(0, value - *base_pts);
    };

    normalized.pts = packet.pts >= 0 ? normalize(packet.pts) : normalize(packet.dts);
    normalized.dts = packet.dts >= 0 ? normalize(packet.dts) : normalized.pts;

    if (packet.kind == media::MediaKind::Video) {
        if (last_video_pts_.has_value() && normalized.pts <= *last_video_pts_) {
            normalized.pts = *last_video_pts_ + kVideoFrameDurationNs;
            if (normalized.dts < normalized.pts) {
                normalized.dts = normalized.pts;
            }
        }
        last_video_pts_ = normalized.pts;
    }

    return normalized;
}

bool RtspEgressSession::Start(const std::string& session_id,
                              const std::shared_ptr<core::SharedStream>& stream,
                              std::string* error_message) {
    session_id_ = session_id;

#if MEDIA_SERVER_USE_GSTREAMER
    if (media_element_ == nullptr) {
        if (error_message != nullptr) {
            *error_message = "missing media element";
        }
        return false;
    }

    video_appsrc_ = gst_bin_get_by_name_recurse_up(GST_BIN(media_element_), "video_src");
    audio_appsrc_ = gst_bin_get_by_name_recurse_up(GST_BIN(media_element_), "audio_src");
    if (video_appsrc_ == nullptr) {
        if (error_message != nullptr) {
            *error_message = "missing video appsrc";
        }
        return false;
    }

    g_object_set(video_appsrc_, "is-live", TRUE, "format", GST_FORMAT_TIME, "block", FALSE, nullptr);
    if (audio_appsrc_ != nullptr) {
        g_object_set(audio_appsrc_, "is-live", TRUE, "format", GST_FORMAT_TIME, "block", FALSE, nullptr);
    }

    const auto descriptor = stream->descriptor();
    if (!descriptor.has_value()) {
        if (error_message != nullptr) {
            *error_message = "stream descriptor not available";
        }
        return false;
    }

    if (!ConfigureAppSrcCaps(*descriptor, error_message)) {
        return false;
    }
#else
    (void)stream;
    (void)error_message;
#endif

    started_ = true;
    FlushPendingPackets();
    return true;
}

void RtspEgressSession::Stop() {
    started_ = false;
    {
        std::lock_guard lock(pending_mu_);
        pending_packets_.clear();
        video_base_pts_.reset();
        audio_base_pts_.reset();
        last_video_pts_.reset();
    }

#if MEDIA_SERVER_USE_GSTREAMER
    if (video_appsrc_ != nullptr) {
        gst_app_src_end_of_stream(GST_APP_SRC(video_appsrc_));
        gst_object_unref(video_appsrc_);
        video_appsrc_ = nullptr;
    }
    if (audio_appsrc_ != nullptr) {
        gst_app_src_end_of_stream(GST_APP_SRC(audio_appsrc_));
        gst_object_unref(audio_appsrc_);
        audio_appsrc_ = nullptr;
    }
    if (media_element_ != nullptr) {
        gst_object_unref(media_element_);
        media_element_ = nullptr;
    }
#endif
}

void RtspEgressSession::HandleSample(const media::Packet& packet) {
    if (!started_) {
        QueuePendingPacket(packet);
        return;
    }

#if MEDIA_SERVER_USE_GSTREAMER
    const media::Packet normalized = NormalizeTimestamps(packet);
    switch (packet.kind) {
        case media::MediaKind::Video:
            if (video_track_id_.empty() || normalized.track_id == video_track_id_) {
                (void)PushToAppSrc(video_appsrc_, normalized);
            }
            break;
        case media::MediaKind::Audio:
            if (!audio_track_id_.empty() && normalized.track_id == audio_track_id_) {
                (void)PushToAppSrc(audio_appsrc_, normalized);
            }
            break;
        case media::MediaKind::Data:
            break;
    }
#else
    (void)packet;
#endif
}

#if MEDIA_SERVER_USE_GSTREAMER
bool RtspEgressSession::ConfigureAppSrcCaps(const media::StreamDescriptor& descriptor, std::string* error_message) {
    const media::TrackInfo* video_track = FindTrack(descriptor, media::MediaKind::Video);
    if (video_track == nullptr) {
        if (error_message != nullptr) {
            *error_message = "descriptor does not contain video track";
        }
        return false;
    }
    video_track_id_ = video_track->track_id;

    GstCaps* video_caps = BuildCapsFromTrack(*video_track);
    if (video_caps == nullptr) {
        if (error_message != nullptr) {
            *error_message = "failed to build video caps for RTSP egress";
        }
        return false;
    }
    gst_app_src_set_caps(GST_APP_SRC(video_appsrc_), video_caps);
    gst_caps_unref(video_caps);

    if (audio_appsrc_ != nullptr) {
        const media::TrackInfo* audio_track = FindTrack(descriptor, media::MediaKind::Audio);
        if (audio_track == nullptr) {
            audio_track_id_.clear();
            return true;
        }
        audio_track_id_ = audio_track->track_id;
        GstCaps* audio_caps = BuildCapsFromTrack(*audio_track);
        if (audio_caps != nullptr) {
            gst_app_src_set_caps(GST_APP_SRC(audio_appsrc_), audio_caps);
            gst_caps_unref(audio_caps);
        } else {
            if (error_message != nullptr) {
                *error_message = "failed to build audio caps for RTSP egress";
            }
            return false;
        }
    }
    return true;
}
#endif

}  // namespace ingress
