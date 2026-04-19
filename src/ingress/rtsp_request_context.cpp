#include "ingress/rtsp_request_context.h"

#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/rtsp-server/rtsp-server.h>
#endif

namespace ingress {

const char* CodecName(VideoCodec codec) {
    return codec == VideoCodec::H265 ? "h265" : "h264";
}

VideoCodec CodecFromPath(const std::string& path, const std::string& route) {
    const std::string h265_path = "/" + route + "/h265";
    if (path.rfind(h265_path, 0) == 0) {
        return VideoCodec::H265;
    }
    return VideoCodec::H264;
}

media::CodecId AudioCodecFromPath(const std::string& path, const std::string& route) {
    const std::string prefix = "/" + route;
    if (path.rfind(prefix, 0) != 0) {
        return media::CodecId::AAC;
    }

    if (path.find("/opus", prefix.size()) != std::string::npos) {
        return media::CodecId::Opus;
    }
    if (path.find("/pcmu", prefix.size()) != std::string::npos) {
        return media::CodecId::PCMU;
    }
    if (path.find("/pcma", prefix.size()) != std::string::npos) {
        return media::CodecId::PCMALaw;
    }
    return media::CodecId::AAC;
}

std::unordered_map<std::string, std::string> ParseRtspQuery(const char* query_raw) {
    std::unordered_map<std::string, std::string> out;
    if (query_raw == nullptr) {
        return out;
    }

    std::string query(query_raw);
    std::size_t from = 0;
    while (from < query.size()) {
        const std::size_t amp = query.find('&', from);
        const std::string pair = query.substr(from, amp == std::string::npos ? std::string::npos : amp - from);
        if (!pair.empty()) {
            const std::size_t eq = pair.find('=');
            const std::string key = pair.substr(0, eq);
            const std::string value = eq == std::string::npos ? std::string() : pair.substr(eq + 1);
#if MEDIA_SERVER_USE_GSTREAMER
            gchar* decoded = g_uri_unescape_string(value.c_str(), nullptr);
            if (decoded != nullptr) {
                out[key] = decoded;
                g_free(decoded);
            } else {
                out[key] = value;
            }
#else
            out[key] = value;
#endif
        }
        if (amp == std::string::npos) {
            break;
        }
        from = amp + 1;
    }
    return out;
}

#if MEDIA_SERVER_USE_GSTREAMER
std::optional<media::IngressRequest> BuildRequestFromRtspUrl(const GstRTSPUrl* uri, const std::string& route) {
    if (uri == nullptr) {
        return std::nullopt;
    }

    media::IngressRequest request;
    request.protocol = "rtsp";
    request.path = uri->abspath != nullptr ? uri->abspath : ("/" + route);
    request.query = ParseRtspQuery(uri->query);
    return request;
}
#endif

}  // namespace ingress
