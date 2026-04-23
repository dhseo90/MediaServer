// 파일 용도: File, RTSP pull, WebRTC, HTTP/HLS URI, YouTube resolver 위임 source worker와 codec/descriptor 변환 로직을 구현한다.
#include "core/source_factory.h"

#include <algorithm>
#include <atomic>
#include <chrono>
#include <condition_variable>
#include <cstring>
#include <filesystem>
#include <iostream>
#include <mutex>
#include <sstream>
#include <thread>
#include <utility>
#include <vector>

#include <fcntl.h>
#include <netdb.h>
#include <poll.h>
#include <sys/socket.h>
#include <unistd.h>

#include "app_config.h"
#include "core/shared_stream.h"
#include "core/youtube_resolver.h"
#include "ingress/webrtc_source_registry.h"

#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/app/gstappsink.h>
#include <gst/gst.h>
#include <gst/pbutils/pbutils.h>
#include <gst/rtsp/gstrtsptransport.h>
#endif

namespace {

using media::CodecId;
using media::MediaKind;
using media::MediaSample;
using media::SourceSpec;
using media::StreamDescriptor;
using media::TrackInfo;

bool DescriptorHasKind(const StreamDescriptor& descriptor, MediaKind kind) {
    for (const auto& track : descriptor.tracks) {
        if (track.kind == kind) {
            return true;
        }
    }
    return false;
}

CodecId CodecFromCapsName(const std::string& caps_name) {
    if (caps_name == "video/x-vp8") {
        return CodecId::VP8;
    }
    if (caps_name == "video/x-h264") {
        return CodecId::H264;
    }
    if (caps_name == "video/x-h265") {
        return CodecId::H265;
    }
    if (caps_name == "audio/mpeg") {
        return CodecId::AAC;
    }
    if (caps_name == "audio/x-opus") {
        return CodecId::Opus;
    }
    if (caps_name == "audio/x-mulaw") {
        return CodecId::PCMU;
    }
    if (caps_name == "audio/x-alaw") {
        return CodecId::PCMALaw;
    }
    return CodecId::Unknown;
}

#if MEDIA_SERVER_USE_GSTREAMER
CodecId CodecFromRtpEncoding(const std::string& encoding_name) {
    if (encoding_name == "VP8") {
        return CodecId::VP8;
    }
    if (encoding_name == "H264") {
        return CodecId::H264;
    }
    if (encoding_name == "H265" || encoding_name == "HEVC") {
        return CodecId::H265;
    }
    if (encoding_name == "MPEG4-GENERIC") {
        return CodecId::AAC;
    }
    if (encoding_name == "OPUS") {
        return CodecId::Opus;
    }
    if (encoding_name == "PCMU") {
        return CodecId::PCMU;
    }
    if (encoding_name == "PCMA") {
        return CodecId::PCMALaw;
    }
    return CodecId::Unknown;
}

std::string EscapeForLaunch(const std::string& value) {
    std::string out;
    out.reserve(value.size() + 8);
    for (const char ch : value) {
        if (ch == '\\' || ch == '"') {
            out.push_back('\\');
        }
        out.push_back(ch);
    }
    return out;
}

StreamDescriptor DiscoverFileDescriptor(const std::string& file_path, std::string* error_message) {
    GError* error = nullptr;
    GstDiscoverer* discoverer = gst_discoverer_new(2 * GST_SECOND, &error);
    if (discoverer == nullptr) {
        if (error_message != nullptr) {
            *error_message = error != nullptr ? error->message : "failed to create discoverer";
        }
        if (error != nullptr) {
            g_error_free(error);
        }
        return {};
    }

    const std::string uri = "file://" + std::filesystem::absolute(file_path).string();
    GstDiscovererInfo* info = gst_discoverer_discover_uri(discoverer, uri.c_str(), &error);
    if (info == nullptr) {
        if (error_message != nullptr) {
            *error_message = error != nullptr ? error->message : "failed to inspect file source";
        }
        if (error != nullptr) {
            g_error_free(error);
        }
        g_object_unref(discoverer);
        return {};
    }

    StreamDescriptor descriptor;
    descriptor.is_live = false;

    GList* video_streams = gst_discoverer_info_get_video_streams(info);
    for (GList* it = video_streams; it != nullptr; it = it->next) {
        auto* stream_info = GST_DISCOVERER_STREAM_INFO(it->data);
        GstCaps* caps = gst_discoverer_stream_info_get_caps(stream_info);
        const GstStructure* structure = caps != nullptr ? gst_caps_get_structure(caps, 0) : nullptr;

        TrackInfo track;
        track.track_id = gst_discoverer_stream_info_get_stream_id(stream_info);
        track.kind = MediaKind::Video;
        if (structure != nullptr) {
            const char* caps_name = gst_structure_get_name(structure);
            track.codec_name = caps_name != nullptr ? caps_name : "";
            track.codec = CodecFromCapsName(track.codec_name);
            track.clock_rate = 90000;
            gchar* caps_text = gst_caps_to_string(caps);
            if (caps_text != nullptr) {
                track.caps_string = caps_text;
                g_free(caps_text);
            }
        }
        descriptor.tracks.push_back(std::move(track));
        if (caps != nullptr) {
            gst_caps_unref(caps);
        }
    }
    gst_discoverer_stream_info_list_free(video_streams);

    GList* audio_streams = gst_discoverer_info_get_audio_streams(info);
    for (GList* it = audio_streams; it != nullptr; it = it->next) {
        auto* stream_info = GST_DISCOVERER_STREAM_INFO(it->data);
        GstCaps* caps = gst_discoverer_stream_info_get_caps(stream_info);
        const GstStructure* structure = caps != nullptr ? gst_caps_get_structure(caps, 0) : nullptr;

        TrackInfo track;
        track.track_id = gst_discoverer_stream_info_get_stream_id(stream_info);
        track.kind = MediaKind::Audio;
        if (structure != nullptr) {
            const char* caps_name = gst_structure_get_name(structure);
            track.codec_name = caps_name != nullptr ? caps_name : "";
            track.codec = CodecFromCapsName(track.codec_name);
            gst_structure_get_int(structure, "rate", &track.clock_rate);
            gst_structure_get_int(structure, "channels", &track.channels);
            gchar* caps_text = gst_caps_to_string(caps);
            if (caps_text != nullptr) {
                track.caps_string = caps_text;
                g_free(caps_text);
            }
        }
        descriptor.tracks.push_back(std::move(track));
        if (caps != nullptr) {
            gst_caps_unref(caps);
        }
    }
    gst_discoverer_stream_info_list_free(audio_streams);

    g_object_unref(info);
    g_object_unref(discoverer);
    return descriptor;
}

std::string BuildVideoBranch(const TrackInfo& track) {
    switch (track.codec) {
        case CodecId::H264:
            return "h264parse config-interval=-1 ! ";
        case CodecId::H265:
            return "h265parse config-interval=-1 ! ";
        default:
            return {};
    }
}

std::string BuildAudioBranch(const TrackInfo& track) {
    switch (track.codec) {
        case CodecId::AAC:
            return "aacparse ! ";
        case CodecId::Opus:
            return "opusparse ! ";
        case CodecId::PCMU:
        case CodecId::PCMALaw:
        case CodecId::Unknown:
        case CodecId::H264:
        case CodecId::H265:
        case CodecId::VP8:
            return {};
    }
    return {};
}

std::string BuildFilePipelineLaunch(const std::string& file_path, const StreamDescriptor& descriptor) {
    std::ostringstream launch;
    launch << "filesrc location=\"" << EscapeForLaunch(file_path) << "\" ! qtdemux name=demux ";

    bool has_branch = false;
    for (const auto& track : descriptor.tracks) {
        if (track.kind == MediaKind::Video) {
            const std::string branch = BuildVideoBranch(track);
            if (branch.empty()) {
                continue;
            }
            launch << "demux.video_0 ! queue ! " << branch
                   << "appsink name=video_sink emit-signals=false sync=false max-buffers=8 drop=true ";
            has_branch = true;
            break;
        }
    }

    for (const auto& track : descriptor.tracks) {
        if (track.kind == MediaKind::Audio) {
            const std::string branch = BuildAudioBranch(track);
            if (branch.empty()) {
                continue;
            }
            launch << "demux.audio_0 ! queue ! " << branch
                   << "appsink name=audio_sink emit-signals=false sync=false max-buffers=16 drop=true ";
            has_branch = true;
            break;
        }
    }

    return has_branch ? launch.str() : std::string();
}

const TrackInfo* FindTrack(const StreamDescriptor& descriptor, MediaKind kind) {
    for (const auto& track : descriptor.tracks) {
        if (track.kind == kind) {
            return &track;
        }
    }
    return nullptr;
}

MediaSample BuildSampleFromGst(const GstSample* sample, const TrackInfo& track) {
    MediaSample out;
    out.kind = track.kind;
    out.codec = track.codec;
    out.track_id = track.track_id;

    GstBuffer* buffer = gst_sample_get_buffer(const_cast<GstSample*>(sample));
    if (buffer == nullptr) {
        return out;
    }

    out.pts = GST_BUFFER_PTS_IS_VALID(buffer) ? static_cast<std::int64_t>(GST_BUFFER_PTS(buffer)) : 0;
    out.dts = GST_BUFFER_DTS_IS_VALID(buffer) ? static_cast<std::int64_t>(GST_BUFFER_DTS(buffer)) : out.pts;
    out.is_key_frame = track.kind != MediaKind::Video || !GST_BUFFER_FLAG_IS_SET(buffer, GST_BUFFER_FLAG_DELTA_UNIT);

    GstMapInfo map;
    if (gst_buffer_map(buffer, &map, GST_MAP_READ) == TRUE) {
        out.payload.assign(map.data, map.data + map.size);
        if (track.kind == MediaKind::Video) {
            // H264는 avc length-prefix NAL을 직접 훑어 IDR/SPS/PPS가 있으면 keyframe으로 보정한다.
            if (track.codec == CodecId::H264 && map.size >= 5) {
                std::size_t offset = 0;
                while (offset + 5 <= map.size) {
                    const std::uint32_t nal_size =
                        (static_cast<std::uint32_t>(map.data[offset]) << 24) |
                        (static_cast<std::uint32_t>(map.data[offset + 1]) << 16) |
                        (static_cast<std::uint32_t>(map.data[offset + 2]) << 8) |
                        static_cast<std::uint32_t>(map.data[offset + 3]);
                    offset += 4;
                    if (nal_size == 0 || offset + nal_size > map.size) {
                        break;
                    }
                    const unsigned char nal_type = map.data[offset] & 0x1f;
                    if (nal_type == 5 || nal_type == 7 || nal_type == 8) {
                        out.is_key_frame = true;
                        break;
                    }
                    offset += nal_size;
                }
            } else if (track.codec == CodecId::VP8 && map.size > 0) {
                // VP8 payload descriptor의 하위 bit로 keyframe 여부를 빠르게 판별한다.
                out.is_key_frame = (map.data[0] & 0x01) == 0;
            }
        }
        gst_buffer_unmap(buffer, &map);
    }
    return out;
}

std::string DefaultCapsStringForTrack(const TrackInfo& track) {
    switch (track.codec) {
        case CodecId::VP8:
            return "video/x-vp8";
        case CodecId::H264:
            return "video/x-h264,stream-format=avc,alignment=au";
        case CodecId::H265:
            return "video/x-h265,stream-format=hvc1,alignment=au";
        case CodecId::AAC:
            return "audio/mpeg,mpegversion=4,stream-format=raw,channels=1,rate=48000";
        case CodecId::Opus:
            return "audio/x-opus";
        case CodecId::PCMU:
            return "audio/x-mulaw,rate=8000,channels=1";
        case CodecId::PCMALaw:
            return "audio/x-alaw,rate=8000,channels=1";
        case CodecId::Unknown:
            return {};
    }
    return {};
}

struct RtspAuthority {
    std::string host;
    int port{554};
};

bool TryParseRtspAuthority(const std::string& uri, RtspAuthority* authority, std::string* error_message) {
    if (authority == nullptr) {
        return false;
    }

    const std::string scheme_separator = "://";
    const std::size_t scheme_pos = uri.find(scheme_separator);
    if (scheme_pos == std::string::npos) {
        if (error_message != nullptr) {
            *error_message = "invalid RTSP URI (missing scheme): " + uri;
        }
        return false;
    }

    std::size_t authority_begin = scheme_pos + scheme_separator.size();
    std::size_t authority_end = uri.find('/', authority_begin);
    if (authority_end == std::string::npos) {
        authority_end = uri.find('?', authority_begin);
    }
    if (authority_end == std::string::npos) {
        authority_end = uri.size();
    }

    std::string authority_text = uri.substr(authority_begin, authority_end - authority_begin);
    if (authority_text.empty()) {
        if (error_message != nullptr) {
            *error_message = "invalid RTSP URI (missing authority): " + uri;
        }
        return false;
    }

    const std::size_t at_pos = authority_text.rfind('@');
    if (at_pos != std::string::npos) {
        authority_text.erase(0, at_pos + 1);
    }

    RtspAuthority parsed;
    if (!authority_text.empty() && authority_text.front() == '[') {
        const std::size_t close_pos = authority_text.find(']');
        if (close_pos == std::string::npos) {
            if (error_message != nullptr) {
                *error_message = "invalid RTSP URI (unterminated IPv6 host): " + uri;
            }
            return false;
        }
        parsed.host = authority_text.substr(1, close_pos - 1);
        if (close_pos + 1 < authority_text.size()) {
            if (authority_text[close_pos + 1] != ':') {
                if (error_message != nullptr) {
                    *error_message = "invalid RTSP URI (unexpected IPv6 authority suffix): " + uri;
                }
                return false;
            }
            try {
                parsed.port = std::stoi(authority_text.substr(close_pos + 2));
            } catch (...) {
                if (error_message != nullptr) {
                    *error_message = "invalid RTSP URI port: " + uri;
                }
                return false;
            }
        }
    } else {
        const std::size_t colon_pos = authority_text.rfind(':');
        if (colon_pos != std::string::npos && authority_text.find(':') == colon_pos) {
            parsed.host = authority_text.substr(0, colon_pos);
            try {
                parsed.port = std::stoi(authority_text.substr(colon_pos + 1));
            } catch (...) {
                if (error_message != nullptr) {
                    *error_message = "invalid RTSP URI port: " + uri;
                }
                return false;
            }
        } else {
            parsed.host = authority_text;
        }
    }

    if (parsed.host.empty() || parsed.port <= 0 || parsed.port > 65535) {
        if (error_message != nullptr) {
            *error_message = "invalid RTSP URI authority: " + uri;
        }
        return false;
    }

    *authority = std::move(parsed);
    return true;
}

bool TryConnectWithTimeout(const struct addrinfo* address, int timeout_ms, std::string* error_message) {
    if (address == nullptr) {
        if (error_message != nullptr) {
            *error_message = "missing socket address";
        }
        return false;
    }

    const int fd = ::socket(address->ai_family, address->ai_socktype, address->ai_protocol);
    if (fd < 0) {
        if (error_message != nullptr) {
            *error_message = "socket() failed: " + std::string(std::strerror(errno));
        }
        return false;
    }

    const int original_flags = fcntl(fd, F_GETFL, 0);
    if (original_flags < 0 || fcntl(fd, F_SETFL, original_flags | O_NONBLOCK) < 0) {
        if (error_message != nullptr) {
            *error_message = "failed to configure non-blocking socket: " + std::string(std::strerror(errno));
        }
        ::close(fd);
        return false;
    }

    if (::connect(fd, address->ai_addr, address->ai_addrlen) == 0) {
        ::close(fd);
        return true;
    }

    if (errno != EINPROGRESS) {
        if (error_message != nullptr) {
            *error_message = "connect() failed: " + std::string(std::strerror(errno));
        }
        ::close(fd);
        return false;
    }

    struct pollfd pfd {
        fd, POLLOUT, 0
    };
    const int poll_result = ::poll(&pfd, 1, timeout_ms);
    if (poll_result == 0) {
        if (error_message != nullptr) {
            *error_message = "connection timed out";
        }
        ::close(fd);
        return false;
    }
    if (poll_result < 0) {
        if (error_message != nullptr) {
            *error_message = "poll() failed: " + std::string(std::strerror(errno));
        }
        ::close(fd);
        return false;
    }

    int socket_error = 0;
    socklen_t socket_error_len = sizeof(socket_error);
    if (::getsockopt(fd, SOL_SOCKET, SO_ERROR, &socket_error, &socket_error_len) != 0) {
        if (error_message != nullptr) {
            *error_message = "getsockopt(SO_ERROR) failed: " + std::string(std::strerror(errno));
        }
        ::close(fd);
        return false;
    }

    ::close(fd);
    if (socket_error != 0) {
        if (error_message != nullptr) {
            *error_message = std::strerror(socket_error);
        }
        return false;
    }
    return true;
}

bool PreflightRtspSource(const std::string& uri, std::string* error_message) {
    const int timeout_ms = app::GetAppConfig().rtsp_source_preflight_timeout_ms;
    if (timeout_ms <= 0) {
        return true;
    }

    RtspAuthority authority;
    std::string parse_error;
    if (!TryParseRtspAuthority(uri, &authority, &parse_error)) {
        if (error_message != nullptr) {
            *error_message = parse_error;
        }
        return false;
    }

    struct addrinfo hints {};
    hints.ai_socktype = SOCK_STREAM;
    hints.ai_family = AF_UNSPEC;

    struct addrinfo* results = nullptr;
    const std::string port_string = std::to_string(authority.port);
    const int lookup = ::getaddrinfo(authority.host.c_str(), port_string.c_str(), &hints, &results);
    if (lookup != 0) {
        if (error_message != nullptr) {
            *error_message = "failed to resolve RTSP host '" + authority.host + "': " + gai_strerror(lookup);
        }
        return false;
    }

    std::string last_error;
    bool connected = false;
    for (const struct addrinfo* it = results; it != nullptr; it = it->ai_next) {
        std::string connect_error;
        if (TryConnectWithTimeout(it, timeout_ms, &connect_error)) {
            connected = true;
            break;
        }
        last_error = std::move(connect_error);
    }

    ::freeaddrinfo(results);
    if (connected) {
        return true;
    }

    if (error_message != nullptr) {
        *error_message = "RTSP preflight failed for " + authority.host + ":" + std::to_string(authority.port) +
                         " within " + std::to_string(timeout_ms) + "ms" +
                         (last_error.empty() ? std::string() : " (" + last_error + ")");
    }
    return false;
}
#endif

class BasicSourceWorker : public core::SourceWorker {
public:
    explicit BasicSourceWorker(SourceSpec source_spec) : source_spec_(std::move(source_spec)) {}

    const SourceSpec& source_spec() const override {
        return source_spec_;
    }

    bool IsRunning() const override {
        return running_.load();
    }

    void Stop() override {
        running_ = false;
    }

protected:
    SourceSpec source_spec_;
    std::atomic<bool> running_{false};
};

class FileSourceWorker final : public BasicSourceWorker {
public:
    explicit FileSourceWorker(SourceSpec source_spec) : BasicSourceWorker(std::move(source_spec)) {}

    bool Start(const std::shared_ptr<core::SharedStream>& stream, std::string* error_message) override {
        if (!std::filesystem::exists(source_spec_.uri)) {
            if (error_message != nullptr) {
                *error_message = "file source does not exist: " + source_spec_.uri;
            }
            return false;
        }

        StreamDescriptor descriptor;
        descriptor.is_live = false;

#if MEDIA_SERVER_USE_GSTREAMER
        gst_init(nullptr, nullptr);
        // file source는 먼저 discoverer로 실제 트랙/코덱을 확인한 뒤 appsink pipeline을 만든다.
        descriptor = DiscoverFileDescriptor(source_spec_.uri, error_message);
        if (descriptor.tracks.empty()) {
            if (error_message != nullptr && error_message->empty()) {
                *error_message = "failed to discover file tracks";
            }
            return false;
        }

        const std::string launch = BuildFilePipelineLaunch(source_spec_.uri, descriptor);
        if (launch.empty()) {
            if (error_message != nullptr) {
                *error_message = "unsupported file track layout for worker pipeline";
            }
            return false;
        }

        GError* pipeline_error = nullptr;
        pipeline_ = gst_parse_launch(launch.c_str(), &pipeline_error);
        if (pipeline_ == nullptr) {
            if (error_message != nullptr) {
                *error_message = pipeline_error != nullptr ? pipeline_error->message : "failed to create file source pipeline";
            }
            if (pipeline_error != nullptr) {
                g_error_free(pipeline_error);
            }
            return false;
        }

        video_sink_ = gst_bin_get_by_name(GST_BIN(pipeline_), "video_sink");
        audio_sink_ = gst_bin_get_by_name(GST_BIN(pipeline_), "audio_sink");
        if (video_sink_ == nullptr && audio_sink_ == nullptr) {
            if (error_message != nullptr) {
                *error_message = "file source pipeline has no appsink";
            }
            gst_object_unref(pipeline_);
            pipeline_ = nullptr;
            return false;
        }

        descriptor_ = descriptor;
        weak_stream_ = stream;
#else
        TrackInfo track;
        track.track_id = "video-0";
        track.kind = MediaKind::Video;
        descriptor.tracks.push_back(track);
#endif

        stream->SetDescriptor(std::move(descriptor));
        running_.store(true);

#if MEDIA_SERVER_USE_GSTREAMER
        if (gst_element_set_state(pipeline_, GST_STATE_PLAYING) == GST_STATE_CHANGE_FAILURE) {
            if (error_message != nullptr) {
                *error_message = "failed to start file source pipeline";
            }
            Stop();
            return false;
        }

        video_thread_ = std::thread([this] { SampleLoop(video_sink_, MediaKind::Video); });
        audio_thread_ = std::thread([this] { SampleLoop(audio_sink_, MediaKind::Audio); });
        bus_thread_ = std::thread([this] { BusLoop(); });
#endif
        return true;
    }

    void Stop() override {
        running_.store(false);
#if MEDIA_SERVER_USE_GSTREAMER
        if (pipeline_ != nullptr) {
            gst_element_send_event(pipeline_, gst_event_new_eos());
            gst_element_set_state(pipeline_, GST_STATE_NULL);
        }

        JoinThread(video_thread_);
        JoinThread(audio_thread_);
        JoinThread(bus_thread_);

        if (video_sink_ != nullptr) {
            gst_object_unref(video_sink_);
            video_sink_ = nullptr;
        }
        if (audio_sink_ != nullptr) {
            gst_object_unref(audio_sink_);
            audio_sink_ = nullptr;
        }
        if (pipeline_ != nullptr) {
            gst_object_unref(pipeline_);
            pipeline_ = nullptr;
        }
#endif
    }

private:
#if MEDIA_SERVER_USE_GSTREAMER
    void JoinThread(std::thread& thread) {
        if (thread.joinable()) {
            thread.join();
        }
    }

    void SampleLoop(GstElement* sink, MediaKind kind) {
        if (sink == nullptr) {
            return;
        }

        const TrackInfo* track = FindTrack(descriptor_, kind);
        if (track == nullptr) {
            return;
        }

        auto* appsink = GST_APP_SINK(sink);
        while (running_.load()) {
            GstSample* sample = gst_app_sink_try_pull_sample(appsink, 200 * GST_MSECOND);
            if (sample == nullptr) {
                continue;
            }

            auto stream = weak_stream_.lock();
            if (stream != nullptr) {
                stream->FanOut(BuildSampleFromGst(sample, *track));
            }
            gst_sample_unref(sample);
        }
    }

    void BusLoop() {
        if (pipeline_ == nullptr) {
            return;
        }

        GstBus* bus = gst_element_get_bus(pipeline_);
        if (bus == nullptr) {
            return;
        }

        while (running_.load()) {
            GstMessage* message = gst_bus_timed_pop_filtered(
                bus,
                200 * GST_MSECOND,
                static_cast<GstMessageType>(GST_MESSAGE_ERROR | GST_MESSAGE_EOS));
            if (message == nullptr) {
                continue;
            }

            switch (GST_MESSAGE_TYPE(message)) {
                case GST_MESSAGE_EOS:
                    // 파일 source는 VOD loop 재생을 기본 동작으로 삼아 RTSP 클라이언트가 끝에서 끊기지 않게 한다.
                    gst_element_seek_simple(
                        pipeline_,
                        GST_FORMAT_TIME,
                        static_cast<GstSeekFlags>(GST_SEEK_FLAG_FLUSH | GST_SEEK_FLAG_KEY_UNIT),
                        0);
                    break;
                case GST_MESSAGE_ERROR: {
                    GError* err = nullptr;
                    gchar* dbg = nullptr;
                    gst_message_parse_error(message, &err, &dbg);
                    if (err != nullptr) {
                        g_error_free(err);
                    }
                    if (dbg != nullptr) {
                        g_free(dbg);
                    }
                    running_.store(false);
                    break;
                }
                default:
                    break;
            }
            gst_message_unref(message);
        }

        gst_object_unref(bus);
    }

    std::weak_ptr<core::SharedStream> weak_stream_;
    StreamDescriptor descriptor_;
    GstElement* pipeline_{nullptr};
    GstElement* video_sink_{nullptr};
    GstElement* audio_sink_{nullptr};
    std::thread video_thread_;
    std::thread audio_thread_;
    std::thread bus_thread_;
#endif
};

class RtspSourceWorker final : public BasicSourceWorker {
public:
    explicit RtspSourceWorker(SourceSpec source_spec) : BasicSourceWorker(std::move(source_spec)) {}

#if MEDIA_SERVER_USE_GSTREAMER
    ~RtspSourceWorker() override {
        Stop();
    }
#endif

    bool Start(const std::shared_ptr<core::SharedStream>& stream, std::string* error_message) override {
#if MEDIA_SERVER_USE_GSTREAMER
        gst_init(nullptr, nullptr);

        // 외부 RTSP는 source pipeline 시작 전에 host:port 도달성을 먼저 확인해 원인 분리를 쉽게 한다.
        if (!PreflightRtspSource(source_spec_.uri, error_message)) {
            return false;
        }

        pipeline_ = gst_pipeline_new(nullptr);
        source_ = gst_element_factory_make("rtspsrc", "rtsp_source");
        if (pipeline_ == nullptr || source_ == nullptr) {
            if (error_message != nullptr) {
                *error_message = "failed to create RTSP source pipeline";
            }
            Stop();
            return false;
        }

        weak_stream_ = stream;
        descriptor_.tracks.clear();
        descriptor_.is_live = true;
        source_error_.clear();

        gst_bin_add(GST_BIN(pipeline_), source_);
        g_object_set(source_, "location", source_spec_.uri.c_str(), "latency", 100, nullptr);
        if (app::GetAppConfig().force_rtsp_tcp) {
            g_object_set(source_, "protocols", GST_RTSP_LOWER_TRANS_TCP, nullptr);
        }
        g_signal_connect(source_, "pad-added", G_CALLBACK(&RtspSourceWorker::OnPadAdded), this);

        running_.store(true);
        bus_thread_ = std::thread([this] { BusLoop(); });

        if (gst_element_set_state(pipeline_, GST_STATE_PLAYING) == GST_STATE_CHANGE_FAILURE) {
            if (error_message != nullptr) {
                *error_message = "failed to start RTSP source pipeline";
            }
            Stop();
            return false;
        }

        std::unique_lock lock(mu_);
        // SDP pad 생성만으로는 부족하고, 실제 첫 sample까지 확인해야 downstream descriptor가 신뢰 가능하다.
        const bool ready = cv_.wait_for(
            lock,
            std::chrono::milliseconds(app::GetAppConfig().rtsp_source_start_timeout_ms),
            [this] {
            return !running_.load() || ready_sample_count_ > 0 || !source_error_.empty();
        });
        if (!ready || descriptor_.tracks.empty() || ready_sample_count_ == 0) {
            if (error_message != nullptr) {
                *error_message = source_error_.empty() ? "timed out waiting for RTSP source samples" : source_error_;
            }
            lock.unlock();
            Stop();
            return false;
        }

        const auto settle_started_at = std::chrono::steady_clock::now();
        const auto settle_limit =
            settle_started_at + std::chrono::milliseconds(app::GetAppConfig().rtsp_track_settle_max_ms);
        // video가 먼저 오고 audio가 늦게 붙는 RTSP source를 위해 짧은 track settle 시간을 둔다.
        while (running_.load() && source_error_.empty()) {
            const bool have_video = DescriptorHasKind(descriptor_, MediaKind::Video);
            const bool have_audio = DescriptorHasKind(descriptor_, MediaKind::Audio);
            const bool have_av = have_video && have_audio;
            const auto quiet_deadline =
                last_discovery_at_ + std::chrono::milliseconds(app::GetAppConfig().rtsp_track_settle_quiet_period_ms);
            const auto wait_deadline = have_av ? std::min(quiet_deadline, settle_limit) : settle_limit;
            if (cv_.wait_until(lock, wait_deadline, [this] { return !running_.load() || !source_error_.empty(); })) {
                break;
            }
            const auto now = std::chrono::steady_clock::now();
            if ((have_av && now >= quiet_deadline) || now >= settle_limit) {
                break;
            }
        }

        std::cerr << "[rtsp-source] source ready uri=" << source_spec_.uri
                  << " tracks=" << descriptor_.tracks.size() << "\n";
        stream->SetDescriptor(descriptor_);
        return true;
#else
        StreamDescriptor descriptor;
        descriptor.is_live = true;
        stream->SetDescriptor(std::move(descriptor));
        running_.store(true);
        (void)error_message;
        return true;
#endif
    }

    void Stop() override {
        running_.store(false);

#if MEDIA_SERVER_USE_GSTREAMER
        {
            std::lock_guard lock(mu_);
            cv_.notify_all();
        }

        if (pipeline_ != nullptr) {
            gst_element_set_state(pipeline_, GST_STATE_NULL);
        }

        for (auto& branch : branches_) {
            if (branch->sample_thread.joinable()) {
                branch->sample_thread.join();
            }
        }
        if (bus_thread_.joinable()) {
            bus_thread_.join();
        }

        branches_.clear();
        if (pipeline_ != nullptr) {
            gst_object_unref(pipeline_);
            pipeline_ = nullptr;
        }
        source_ = nullptr;
#endif
    }

private:
#if MEDIA_SERVER_USE_GSTREAMER
    struct SinkBranch {
        TrackInfo track;
        GstElement* queue{nullptr};
        GstElement* depay{nullptr};
        GstElement* parser{nullptr};
        GstElement* sink{nullptr};
        bool announced_ready{false};
        std::thread sample_thread;
    };

    static void OnPadAdded(GstElement* /*src*/, GstPad* pad, gpointer user_data) {
        static_cast<RtspSourceWorker*>(user_data)->HandlePadAdded(pad);
    }

    void HandlePadAdded(GstPad* pad) {
        // rtspsrc의 동적 RTP pad마다 depay/parser/appsink branch를 만들어 내부 패킷으로 변환한다.
        GstCaps* caps = gst_pad_get_current_caps(pad);
        if (caps == nullptr) {
            caps = gst_pad_query_caps(pad, nullptr);
        }
        if (caps == nullptr) {
            return;
        }

        const GstStructure* structure = gst_caps_get_structure(caps, 0);
        const char* caps_name = structure != nullptr ? gst_structure_get_name(structure) : nullptr;
        if (caps_name == nullptr || std::string(caps_name) != "application/x-rtp") {
            gst_caps_unref(caps);
            return;
        }

        const char* media_name = gst_structure_get_string(structure, "media");
        const char* encoding_name = gst_structure_get_string(structure, "encoding-name");
        if (media_name == nullptr || encoding_name == nullptr) {
            gst_caps_unref(caps);
            return;
        }

        TrackInfo track;
        track.kind = std::string(media_name) == "audio" ? MediaKind::Audio : MediaKind::Video;
        track.codec = CodecFromRtpEncoding(encoding_name);
        track.codec_name = encoding_name;
        track.track_id = track.kind == MediaKind::Audio ? "audio-0" : "video-0";
        gst_structure_get_int(structure, "clock-rate", &track.clock_rate);
        gst_structure_get_int(structure, "channels", &track.channels);
        track.caps_string = DefaultCapsStringForTrack(track);

        auto branch = CreateBranch(track);
        if (branch == nullptr) {
            std::cerr << "[rtsp-source] unsupported RTP track encoding=" << encoding_name << "\n";
            gst_caps_unref(caps);
            return;
        }

        gst_bin_add(GST_BIN(pipeline_), branch->queue);
        gst_bin_add(GST_BIN(pipeline_), branch->depay);
        if (branch->parser != nullptr) {
            gst_bin_add(GST_BIN(pipeline_), branch->parser);
        }
        gst_bin_add(GST_BIN(pipeline_), branch->sink);

        bool linked = gst_element_link(branch->queue, branch->depay);
        if (linked && branch->parser != nullptr) {
            linked = gst_element_link(branch->depay, branch->parser) && gst_element_link(branch->parser, branch->sink);
        } else if (linked) {
            linked = gst_element_link(branch->depay, branch->sink);
        }

        GstPad* queue_sink_pad = gst_element_get_static_pad(branch->queue, "sink");
        if (!linked || queue_sink_pad == nullptr || gst_pad_link(pad, queue_sink_pad) != GST_PAD_LINK_OK) {
            if (queue_sink_pad != nullptr) {
                gst_object_unref(queue_sink_pad);
            }
            if (branch->sink != nullptr) {
                gst_bin_remove(GST_BIN(pipeline_), branch->sink);
            }
            if (branch->parser != nullptr) {
                gst_bin_remove(GST_BIN(pipeline_), branch->parser);
            }
            if (branch->depay != nullptr) {
                gst_bin_remove(GST_BIN(pipeline_), branch->depay);
            }
            if (branch->queue != nullptr) {
                gst_bin_remove(GST_BIN(pipeline_), branch->queue);
            }
            std::cerr << "[rtsp-source] failed to link track kind=" << media::ToString(track.kind)
                      << " codec=" << media::ToString(track.codec) << "\n";
            gst_caps_unref(caps);
            return;
        }
        gst_object_unref(queue_sink_pad);

        gst_element_sync_state_with_parent(branch->queue);
        gst_element_sync_state_with_parent(branch->depay);
        if (branch->parser != nullptr) {
            gst_element_sync_state_with_parent(branch->parser);
        }
        gst_element_sync_state_with_parent(branch->sink);

        branch->sample_thread = std::thread([this, branch_ptr = branch.get()] { SampleLoop(branch_ptr); });

        {
            std::lock_guard lock(mu_);
            descriptor_.tracks.push_back(branch->track);
            last_discovery_at_ = std::chrono::steady_clock::now();
            auto stream = weak_stream_.lock();
            if (stream != nullptr) {
                stream->SetDescriptor(descriptor_);
            }
            std::cerr << "[rtsp-source] track ready kind=" << media::ToString(branch->track.kind)
                      << " codec=" << media::ToString(branch->track.codec)
                      << " caps=" << branch->track.caps_string << "\n";
            ++descriptor_version_;
            branches_.push_back(std::move(branch));
            cv_.notify_all();
        }

        gst_caps_unref(caps);
    }

    std::unique_ptr<SinkBranch> CreateBranch(const TrackInfo& track) {
        auto branch = std::make_unique<SinkBranch>();
        branch->track = track;
        branch->queue = gst_element_factory_make("queue", nullptr);

        switch (track.codec) {
            case CodecId::VP8:
                branch->depay = gst_element_factory_make("rtpvp8depay", nullptr);
                break;
            case CodecId::H264:
                branch->depay = gst_element_factory_make("rtph264depay", nullptr);
                branch->parser = gst_element_factory_make("h264parse", nullptr);
                break;
            case CodecId::H265:
                branch->depay = gst_element_factory_make("rtph265depay", nullptr);
                branch->parser = gst_element_factory_make("h265parse", nullptr);
                break;
            case CodecId::AAC:
                branch->depay = gst_element_factory_make("rtpmp4gdepay", nullptr);
                branch->parser = gst_element_factory_make("aacparse", nullptr);
                break;
            case CodecId::Opus:
                branch->depay = gst_element_factory_make("rtpopusdepay", nullptr);
                branch->parser = gst_element_factory_make("opusparse", nullptr);
                break;
            case CodecId::PCMU:
                branch->depay = gst_element_factory_make("rtppcmudepay", nullptr);
                branch->parser = nullptr;
                break;
            case CodecId::PCMALaw:
                branch->depay = gst_element_factory_make("rtppcmadepay", nullptr);
                branch->parser = nullptr;
                break;
            case CodecId::Unknown:
                return nullptr;
        }

        branch->sink = gst_element_factory_make("appsink", nullptr);
        if (branch->queue == nullptr || branch->depay == nullptr || branch->sink == nullptr ||
            ((branch->track.codec != CodecId::VP8 && branch->track.codec != CodecId::PCMU && branch->track.codec != CodecId::PCMALaw) &&
             branch->parser == nullptr)) {
            return nullptr;
        }

        // Pace URI/VOD sources like a stream so subscribers do not attach after the file was already consumed.
        g_object_set(branch->sink, "emit-signals", FALSE, "sync", TRUE, "max-buffers", 16, "drop", TRUE, nullptr);
        return branch;
    }

    void SampleLoop(SinkBranch* branch) {
        if (branch == nullptr || branch->sink == nullptr) {
            return;
        }

        auto* appsink = GST_APP_SINK(branch->sink);
        while (running_.load()) {
            GstSample* sample = gst_app_sink_try_pull_sample(appsink, 200 * GST_MSECOND);
            if (sample == nullptr) {
                continue;
            }

            if (!branch->announced_ready) {
                // 첫 sample의 caps가 가장 정확하므로 descriptor를 한 번 더 갱신하고 ready 대기를 깨운다.
                GstCaps* sample_caps = gst_sample_get_caps(sample);
                if (sample_caps != nullptr) {
                    gchar* caps_text = gst_caps_to_string(sample_caps);
                    if (caps_text != nullptr) {
                        branch->track.caps_string = caps_text;
                        g_free(caps_text);
                    }
                }

                {
                    std::lock_guard lock(mu_);
                    for (auto& track : descriptor_.tracks) {
                        if (track.track_id == branch->track.track_id) {
                            track.caps_string = branch->track.caps_string;
                            track.clock_rate = branch->track.clock_rate;
                            track.channels = branch->track.channels;
                            break;
                        }
                    }
                    last_discovery_at_ = std::chrono::steady_clock::now();
                    ++ready_sample_count_;
                    ++descriptor_version_;
                    auto stream = weak_stream_.lock();
                    if (stream != nullptr) {
                        stream->SetDescriptor(descriptor_);
                    }
                    cv_.notify_all();
                }

                branch->announced_ready = true;
                std::cerr << "[rtsp-source] sample ready kind=" << media::ToString(branch->track.kind)
                          << " codec=" << media::ToString(branch->track.codec)
                          << " caps=" << branch->track.caps_string << "\n";
            }

            auto stream = weak_stream_.lock();
            if (stream != nullptr) {
                stream->FanOut(BuildSampleFromGst(sample, branch->track));
            }
            gst_sample_unref(sample);
        }
    }

    void BusLoop() {
        GstBus* bus = pipeline_ != nullptr ? gst_element_get_bus(pipeline_) : nullptr;
        if (bus == nullptr) {
            return;
        }

        while (running_.load()) {
            GstMessage* message = gst_bus_timed_pop_filtered(
                bus,
                200 * GST_MSECOND,
                static_cast<GstMessageType>(GST_MESSAGE_ERROR | GST_MESSAGE_EOS));
            if (message == nullptr) {
                continue;
            }

            if (GST_MESSAGE_TYPE(message) == GST_MESSAGE_ERROR) {
                GError* err = nullptr;
                gchar* dbg = nullptr;
                gst_message_parse_error(message, &err, &dbg);
                {
                    std::lock_guard lock(mu_);
                    source_error_ = err != nullptr ? err->message : "RTSP source pipeline error";
                    cv_.notify_all();
                }
                std::cerr << "[rtsp-source] pipeline error: " << source_error_ << "\n";
                if (err != nullptr) {
                    g_error_free(err);
                }
                if (dbg != nullptr) {
                    g_free(dbg);
                }
                running_.store(false);
            }
            gst_message_unref(message);
        }

        gst_object_unref(bus);
    }

    std::weak_ptr<core::SharedStream> weak_stream_;
    StreamDescriptor descriptor_;
    GstElement* pipeline_{nullptr};
    GstElement* source_{nullptr};
    std::thread bus_thread_;
    std::mutex mu_;
    std::condition_variable cv_;
    std::size_t descriptor_version_{0};
    std::size_t ready_sample_count_{0};
    std::chrono::steady_clock::time_point last_discovery_at_{};
    std::string source_error_;
    std::vector<std::unique_ptr<SinkBranch>> branches_;
#endif
};

class UriSourceWorker final : public BasicSourceWorker {
public:
    explicit UriSourceWorker(SourceSpec source_spec) : BasicSourceWorker(std::move(source_spec)) {}

#if MEDIA_SERVER_USE_GSTREAMER
    ~UriSourceWorker() override {
        Stop();
    }
#endif

    bool Start(const std::shared_ptr<core::SharedStream>& stream, std::string* error_message) override {
#if MEDIA_SERVER_USE_GSTREAMER
        gst_init(nullptr, nullptr);

        if (source_spec_.uri.empty()) {
            if (error_message != nullptr) {
                *error_message = "empty URI source";
            }
            return false;
        }

        pipeline_ = gst_pipeline_new(nullptr);
        source_ = gst_element_factory_make("uridecodebin", "uri_source");
        if (pipeline_ == nullptr || source_ == nullptr) {
            if (error_message != nullptr) {
                *error_message = "failed to create URI source pipeline";
            }
            Stop();
            return false;
        }

        weak_stream_ = stream;
        descriptor_.tracks.clear();
        descriptor_.is_live = source_spec_.kind == SourceSpec::Kind::Hls;
        source_error_.clear();

        // HTTP/HLS playable URI는 uridecodebin으로 raw pad를 얻고, 내부 표준 H264/AAC 패킷으로 재인코딩한다.
        gst_bin_add(GST_BIN(pipeline_), source_);
        g_object_set(source_, "uri", source_spec_.uri.c_str(), nullptr);
        g_signal_connect(source_, "pad-added", G_CALLBACK(&UriSourceWorker::OnPadAdded), this);

        running_.store(true);
        bus_thread_ = std::thread([this] { BusLoop(); });

        if (gst_element_set_state(pipeline_, GST_STATE_PLAYING) == GST_STATE_CHANGE_FAILURE) {
            if (error_message != nullptr) {
                *error_message = "failed to start URI source pipeline";
            }
            Stop();
            return false;
        }

        const int configured_timeout_ms = app::GetAppConfig().rtsp_source_start_timeout_ms;
        const int start_timeout_ms =
            source_spec_.kind == SourceSpec::Kind::Hls ? std::max(configured_timeout_ms, 8000) : configured_timeout_ms;
        std::unique_lock lock(mu_);
        // URI source도 실제 인코딩 sample이 나올 때까지 기다려 egress가 빈 descriptor로 시작하지 않게 한다.
        const bool ready = cv_.wait_for(
            lock,
            std::chrono::milliseconds(start_timeout_ms),
            [this] { return !running_.load() || ready_sample_count_ > 0 || !source_error_.empty(); });
        if (!ready || descriptor_.tracks.empty() || ready_sample_count_ == 0) {
            if (error_message != nullptr) {
                *error_message = source_error_.empty() ? "timed out waiting for URI source samples" : source_error_;
            }
            lock.unlock();
            Stop();
            return false;
        }

        const auto settle_started_at = std::chrono::steady_clock::now();
        const auto settle_limit =
            settle_started_at + std::chrono::milliseconds(app::GetAppConfig().rtsp_track_settle_max_ms);
        // HLS/HTTP 입력은 audio/video pad 발견 순서가 일정하지 않으므로 RTSP source와 같은 settle 로직을 쓴다.
        while (running_.load() && source_error_.empty()) {
            const bool have_video = DescriptorHasKind(descriptor_, MediaKind::Video);
            const bool have_audio = DescriptorHasKind(descriptor_, MediaKind::Audio);
            const bool have_av = have_video && have_audio;
            const auto quiet_deadline =
                last_discovery_at_ + std::chrono::milliseconds(app::GetAppConfig().rtsp_track_settle_quiet_period_ms);
            const auto wait_deadline = have_av ? std::min(quiet_deadline, settle_limit) : settle_limit;
            if (cv_.wait_until(lock, wait_deadline, [this] { return !running_.load() || !source_error_.empty(); })) {
                break;
            }
            const auto now = std::chrono::steady_clock::now();
            if ((have_av && now >= quiet_deadline) || now >= settle_limit) {
                break;
            }
        }

        std::cerr << "[uri-source] source ready kind=" << media::ToString(source_spec_.kind)
                  << " uri=" << source_spec_.uri
                  << " tracks=" << descriptor_.tracks.size() << "\n";
        stream->SetDescriptor(descriptor_);
        return true;
#else
        StreamDescriptor descriptor;
        descriptor.is_live = source_spec_.kind == SourceSpec::Kind::Hls;
        stream->SetDescriptor(std::move(descriptor));
        running_.store(true);
        (void)error_message;
        return true;
#endif
    }

    void Stop() override {
        running_.store(false);

#if MEDIA_SERVER_USE_GSTREAMER
        {
            std::lock_guard lock(mu_);
            cv_.notify_all();
        }

        if (pipeline_ != nullptr) {
            gst_element_set_state(pipeline_, GST_STATE_NULL);
        }

        for (auto& branch : branches_) {
            if (branch->sample_thread.joinable()) {
                branch->sample_thread.join();
            }
        }
        if (bus_thread_.joinable()) {
            bus_thread_.join();
        }

        branches_.clear();
        if (pipeline_ != nullptr) {
            gst_object_unref(pipeline_);
            pipeline_ = nullptr;
        }
        source_ = nullptr;
#endif
    }

private:
#if MEDIA_SERVER_USE_GSTREAMER
    struct EncodeBranch {
        TrackInfo track;
        GstElement* queue{nullptr};
        GstElement* convert{nullptr};
        GstElement* rate_or_resample{nullptr};
        GstElement* capsfilter{nullptr};
        GstElement* encoder{nullptr};
        GstElement* parser{nullptr};
        GstElement* sink{nullptr};
        bool announced_ready{false};
        std::thread sample_thread;
    };

    static void OnPadAdded(GstElement* /*src*/, GstPad* pad, gpointer user_data) {
        static_cast<UriSourceWorker*>(user_data)->HandlePadAdded(pad);
    }

    bool HasBranchKind(MediaKind kind) const {
        for (const auto& branch : branches_) {
            if (branch->track.kind == kind) {
                return true;
            }
        }
        return false;
    }

    void HandlePadAdded(GstPad* pad) {
        // decodebin이 내는 raw audio/video pad를 종류별로 하나씩만 내부 표준 branch에 연결한다.
        GstCaps* caps = gst_pad_get_current_caps(pad);
        if (caps == nullptr) {
            caps = gst_pad_query_caps(pad, nullptr);
        }
        if (caps == nullptr) {
            return;
        }

        const GstStructure* structure = gst_caps_get_structure(caps, 0);
        const char* caps_name = structure != nullptr ? gst_structure_get_name(structure) : nullptr;
        if (caps_name == nullptr) {
            gst_caps_unref(caps);
            return;
        }

        MediaKind kind = MediaKind::Data;
        if (g_str_has_prefix(caps_name, "video/")) {
            kind = MediaKind::Video;
        } else if (g_str_has_prefix(caps_name, "audio/")) {
            kind = MediaKind::Audio;
        } else {
            gst_caps_unref(caps);
            return;
        }

        {
            std::lock_guard lock(mu_);
            if (HasBranchKind(kind)) {
                gst_caps_unref(caps);
                return;
            }
        }

        TrackInfo track;
        track.kind = kind;
        track.track_id = kind == MediaKind::Audio ? "audio-0" : "video-0";
        if (kind == MediaKind::Video) {
            track.codec = CodecId::H264;
            track.codec_name = "video/x-h264";
            track.clock_rate = 90000;
        } else {
            track.codec = CodecId::AAC;
            track.codec_name = "audio/mpeg";
            track.clock_rate = 48000;
            track.channels = 2;
        }
        track.caps_string = DefaultCapsStringForTrack(track);

        auto branch = CreateBranch(track);
        if (branch == nullptr) {
            std::cerr << "[uri-source] failed to create branch kind=" << media::ToString(kind) << "\n";
            gst_caps_unref(caps);
            return;
        }

        gst_bin_add(GST_BIN(pipeline_), branch->queue);
        gst_bin_add(GST_BIN(pipeline_), branch->convert);
        gst_bin_add(GST_BIN(pipeline_), branch->rate_or_resample);
        gst_bin_add(GST_BIN(pipeline_), branch->capsfilter);
        gst_bin_add(GST_BIN(pipeline_), branch->encoder);
        if (branch->parser != nullptr) {
            gst_bin_add(GST_BIN(pipeline_), branch->parser);
        }
        gst_bin_add(GST_BIN(pipeline_), branch->sink);

        bool linked = false;
        if (branch->parser != nullptr) {
            linked = gst_element_link_many(branch->queue,
                                           branch->convert,
                                           branch->rate_or_resample,
                                           branch->capsfilter,
                                           branch->encoder,
                                           branch->parser,
                                           branch->sink,
                                           nullptr);
        } else {
            linked = gst_element_link_many(branch->queue,
                                           branch->convert,
                                           branch->rate_or_resample,
                                           branch->capsfilter,
                                           branch->encoder,
                                           branch->sink,
                                           nullptr);
        }

        GstPad* queue_sink_pad = gst_element_get_static_pad(branch->queue, "sink");
        if (!linked || queue_sink_pad == nullptr || gst_pad_link(pad, queue_sink_pad) != GST_PAD_LINK_OK) {
            if (queue_sink_pad != nullptr) {
                gst_object_unref(queue_sink_pad);
            }
            RemoveBranchElements(branch.get());
            std::cerr << "[uri-source] failed to link branch kind=" << media::ToString(kind)
                      << " input_caps=" << caps_name << "\n";
            gst_caps_unref(caps);
            return;
        }
        gst_object_unref(queue_sink_pad);

        gst_element_sync_state_with_parent(branch->queue);
        gst_element_sync_state_with_parent(branch->convert);
        gst_element_sync_state_with_parent(branch->rate_or_resample);
        gst_element_sync_state_with_parent(branch->capsfilter);
        gst_element_sync_state_with_parent(branch->encoder);
        if (branch->parser != nullptr) {
            gst_element_sync_state_with_parent(branch->parser);
        }
        gst_element_sync_state_with_parent(branch->sink);

        branch->sample_thread = std::thread([this, branch_ptr = branch.get()] { SampleLoop(branch_ptr); });

        {
            std::lock_guard lock(mu_);
            descriptor_.tracks.push_back(branch->track);
            last_discovery_at_ = std::chrono::steady_clock::now();
            auto stream = weak_stream_.lock();
            if (stream != nullptr) {
                stream->SetDescriptor(descriptor_);
            }
            ++descriptor_version_;
            branches_.push_back(std::move(branch));
            cv_.notify_all();
        }

        gst_caps_unref(caps);
    }

    std::unique_ptr<EncodeBranch> CreateBranch(const TrackInfo& track) {
        auto branch = std::make_unique<EncodeBranch>();
        branch->track = track;
        branch->queue = gst_element_factory_make("queue", nullptr);
        branch->capsfilter = gst_element_factory_make("capsfilter", nullptr);
        branch->sink = gst_element_factory_make("appsink", nullptr);
        if (branch->queue == nullptr || branch->capsfilter == nullptr || branch->sink == nullptr) {
            return nullptr;
        }

        if (track.kind == MediaKind::Video) {
            branch->convert = gst_element_factory_make("videoconvert", nullptr);
            branch->rate_or_resample = gst_element_factory_make("videorate", nullptr);
            branch->encoder = gst_element_factory_make("x264enc", nullptr);
            branch->parser = gst_element_factory_make("h264parse", nullptr);
            if (branch->convert == nullptr || branch->rate_or_resample == nullptr ||
                branch->encoder == nullptr || branch->parser == nullptr) {
                return nullptr;
            }
            GstCaps* raw_caps = gst_caps_from_string("video/x-raw,format=I420,framerate=30/1");
            g_object_set(branch->capsfilter, "caps", raw_caps, nullptr);
            if (raw_caps != nullptr) {
                gst_caps_unref(raw_caps);
            }
            g_object_set(branch->encoder,
                         "bitrate",
                         2048,
                         "key-int-max",
                         30,
                         "bframes",
                         0,
                         "byte-stream",
                         FALSE,
                         nullptr);
            // URI/VOD source는 첫 프레임 지연이 RTSP DESCRIBE 503으로 이어질 수 있어 저지연 인코딩을 강제한다.
            gst_util_set_object_arg(G_OBJECT(branch->encoder), "tune", "zerolatency");
            gst_util_set_object_arg(G_OBJECT(branch->encoder), "speed-preset", "ultrafast");
            g_object_set(branch->parser, "config-interval", -1, nullptr);
        } else if (track.kind == MediaKind::Audio) {
            branch->convert = gst_element_factory_make("audioconvert", nullptr);
            branch->rate_or_resample = gst_element_factory_make("audioresample", nullptr);
            branch->encoder = gst_element_factory_make("avenc_aac", nullptr);
            branch->parser = gst_element_factory_make("aacparse", nullptr);
            if (branch->convert == nullptr || branch->rate_or_resample == nullptr ||
                branch->encoder == nullptr || branch->parser == nullptr) {
                return nullptr;
            }
            GstCaps* raw_caps = gst_caps_from_string("audio/x-raw,rate=48000,channels=2");
            g_object_set(branch->capsfilter, "caps", raw_caps, nullptr);
            if (raw_caps != nullptr) {
                gst_caps_unref(raw_caps);
            }
            g_object_set(branch->encoder, "bitrate", 128000, nullptr);
        } else {
            return nullptr;
        }

        g_object_set(branch->sink, "emit-signals", FALSE, "sync", FALSE, "max-buffers", 16, "drop", TRUE, nullptr);
        return branch;
    }

    void RemoveBranchElements(EncodeBranch* branch) {
        if (branch == nullptr || pipeline_ == nullptr) {
            return;
        }
        if (branch->sink != nullptr) {
            gst_bin_remove(GST_BIN(pipeline_), branch->sink);
        }
        if (branch->parser != nullptr) {
            gst_bin_remove(GST_BIN(pipeline_), branch->parser);
        }
        if (branch->encoder != nullptr) {
            gst_bin_remove(GST_BIN(pipeline_), branch->encoder);
        }
        if (branch->capsfilter != nullptr) {
            gst_bin_remove(GST_BIN(pipeline_), branch->capsfilter);
        }
        if (branch->rate_or_resample != nullptr) {
            gst_bin_remove(GST_BIN(pipeline_), branch->rate_or_resample);
        }
        if (branch->convert != nullptr) {
            gst_bin_remove(GST_BIN(pipeline_), branch->convert);
        }
        if (branch->queue != nullptr) {
            gst_bin_remove(GST_BIN(pipeline_), branch->queue);
        }
    }

    void SampleLoop(EncodeBranch* branch) {
        if (branch == nullptr || branch->sink == nullptr) {
            return;
        }

        auto* appsink = GST_APP_SINK(branch->sink);
        while (running_.load()) {
            GstSample* sample = gst_app_sink_try_pull_sample(appsink, 200 * GST_MSECOND);
            if (sample == nullptr) {
                continue;
            }

            if (!branch->announced_ready) {
                GstCaps* sample_caps = gst_sample_get_caps(sample);
                if (sample_caps != nullptr) {
                    gchar* caps_text = gst_caps_to_string(sample_caps);
                    if (caps_text != nullptr) {
                        branch->track.caps_string = caps_text;
                        g_free(caps_text);
                    }
                }

                {
                    std::lock_guard lock(mu_);
                    for (auto& track : descriptor_.tracks) {
                        if (track.track_id == branch->track.track_id) {
                            track.caps_string = branch->track.caps_string;
                            track.clock_rate = branch->track.clock_rate;
                            track.channels = branch->track.channels;
                            break;
                        }
                    }
                    last_discovery_at_ = std::chrono::steady_clock::now();
                    ++ready_sample_count_;
                    ++descriptor_version_;
                    auto stream = weak_stream_.lock();
                    if (stream != nullptr) {
                        stream->SetDescriptor(descriptor_);
                    }
                    cv_.notify_all();
                }

                branch->announced_ready = true;
                std::cerr << "[uri-source] sample ready kind=" << media::ToString(branch->track.kind)
                          << " codec=" << media::ToString(branch->track.codec)
                          << " caps=" << branch->track.caps_string << "\n";
            }

            auto stream = weak_stream_.lock();
            if (stream != nullptr) {
                stream->FanOut(BuildSampleFromGst(sample, branch->track));
            }
            gst_sample_unref(sample);
        }
    }

    void BusLoop() {
        GstBus* bus = pipeline_ != nullptr ? gst_element_get_bus(pipeline_) : nullptr;
        if (bus == nullptr) {
            return;
        }

        while (running_.load()) {
            GstMessage* message = gst_bus_timed_pop_filtered(
                bus,
                200 * GST_MSECOND,
                static_cast<GstMessageType>(GST_MESSAGE_ERROR | GST_MESSAGE_EOS));
            if (message == nullptr) {
                continue;
            }

            if (GST_MESSAGE_TYPE(message) == GST_MESSAGE_ERROR) {
                GError* err = nullptr;
                gchar* dbg = nullptr;
                gst_message_parse_error(message, &err, &dbg);
                {
                    std::lock_guard lock(mu_);
                    source_error_ = err != nullptr ? err->message : "URI source pipeline error";
                    cv_.notify_all();
                }
                std::cerr << "[uri-source] pipeline error: " << source_error_ << "\n";
                if (err != nullptr) {
                    g_error_free(err);
                }
                if (dbg != nullptr) {
                    g_free(dbg);
                }
                running_.store(false);
            } else if (GST_MESSAGE_TYPE(message) == GST_MESSAGE_EOS) {
                if (source_spec_.kind == SourceSpec::Kind::Http) {
                    // HTTP MP4 같은 VOD URI는 EOF 이후 처음으로 되감아 지속 스트림처럼 제공한다.
                    gst_element_seek_simple(
                        pipeline_,
                        GST_FORMAT_TIME,
                        static_cast<GstSeekFlags>(GST_SEEK_FLAG_FLUSH | GST_SEEK_FLAG_KEY_UNIT),
                        0);
                    gst_message_unref(message);
                    continue;
                }
                {
                    std::lock_guard lock(mu_);
                    if (ready_sample_count_ == 0) {
                        source_error_ = "URI source reached EOS before samples";
                    }
                    cv_.notify_all();
                }
                running_.store(false);
            }
            gst_message_unref(message);
        }

        gst_object_unref(bus);
    }

    std::weak_ptr<core::SharedStream> weak_stream_;
    StreamDescriptor descriptor_;
    GstElement* pipeline_{nullptr};
    GstElement* source_{nullptr};
    std::thread bus_thread_;
    std::mutex mu_;
    std::condition_variable cv_;
    std::size_t descriptor_version_{0};
    std::size_t ready_sample_count_{0};
    std::chrono::steady_clock::time_point last_discovery_at_{};
    std::string source_error_;
    std::vector<std::unique_ptr<EncodeBranch>> branches_;
#endif
};

class YouTubeSourceWorker final : public BasicSourceWorker {
public:
    explicit YouTubeSourceWorker(SourceSpec source_spec) : BasicSourceWorker(std::move(source_spec)) {}

    ~YouTubeSourceWorker() override {
        Stop();
    }

    bool Start(const std::shared_ptr<core::SharedStream>& stream, std::string* error_message) override {
        weak_stream_ = stream;
        running_.store(true);

        if (!StartDelegate(stream, error_message)) {
            running_.store(false);
            return false;
        }

        monitor_thread_ = std::thread([this] { MonitorLoop(); });
        return true;
    }

    bool IsRunning() const override {
        // delegate가 HLS URL 만료 등으로 잠깐 죽어도 monitor가 재해석/재시작을 시도하는 동안은 active로 본다.
        return running_.load();
    }

    void Stop() override {
        running_.store(false);
        stop_cv_.notify_all();

        std::shared_ptr<UriSourceWorker> delegate;
        {
            std::lock_guard lock(delegate_mu_);
            delegate = delegate_;
            delegate_.reset();
        }
        if (delegate != nullptr) {
            delegate->Stop();
        }

        if (monitor_thread_.joinable() && monitor_thread_.get_id() != std::this_thread::get_id()) {
            monitor_thread_.join();
        }
    }

private:
    bool StartDelegate(const std::shared_ptr<core::SharedStream>& stream, std::string* error_message) {
        // YouTube watch/live URL은 직접 decode하지 않고 resolver가 돌려준 HLS/HTTP URL을 기존 URI worker에 위임한다.
        SourceSpec resolved_source;
        if (!core::ResolveYouTubeSource(source_spec_, &resolved_source, error_message)) {
            return false;
        }

        if (!running_.load()) {
            if (error_message != nullptr) {
                *error_message = "YouTube source stopped";
            }
            return false;
        }

        auto next_delegate = std::make_shared<UriSourceWorker>(std::move(resolved_source));
        {
            std::lock_guard lock(delegate_mu_);
            delegate_ = next_delegate;
        }

        const bool started = next_delegate->Start(stream, error_message);
        if (!started) {
            std::lock_guard lock(delegate_mu_);
            if (delegate_ == next_delegate) {
                delegate_.reset();
            }
            return false;
        }

        if (!running_.load()) {
            next_delegate->Stop();
            if (error_message != nullptr) {
                *error_message = "YouTube source stopped";
            }
            return false;
        }
        return true;
    }

    void MonitorLoop() {
        while (running_.load()) {
            {
                std::unique_lock lock(stop_mu_);
                stop_cv_.wait_for(lock,
                                  std::chrono::milliseconds(app::GetAppConfig().youtube_reconnect_delay_ms),
                                  [this] { return !running_.load(); });
            }
            if (!running_.load()) {
                break;
            }

            std::shared_ptr<UriSourceWorker> current_delegate;
            {
                std::lock_guard lock(delegate_mu_);
                current_delegate = delegate_;
            }
            if (current_delegate != nullptr && current_delegate->IsRunning()) {
                continue;
            }

            if (current_delegate != nullptr) {
                current_delegate->Stop();
                std::lock_guard lock(delegate_mu_);
                if (delegate_ == current_delegate) {
                    delegate_.reset();
                }
            }

            auto stream = weak_stream_.lock();
            if (stream == nullptr) {
                running_.store(false);
                break;
            }

            std::cerr << "[youtube-source] delegate stopped; resolving again input=" << source_spec_.uri << "\n";
            std::string restart_error;
            if (!StartDelegate(stream, &restart_error)) {
                if (!running_.load()) {
                    break;
                }
                std::cerr << "[youtube-source] reconnect failed input=" << source_spec_.uri
                          << " error=" << restart_error << "\n";
                continue;
            }
            std::cerr << "[youtube-source] reconnected input=" << source_spec_.uri << "\n";
        }
    }

    std::weak_ptr<core::SharedStream> weak_stream_;
    mutable std::mutex delegate_mu_;
    std::shared_ptr<UriSourceWorker> delegate_;
    std::mutex stop_mu_;
    std::condition_variable stop_cv_;
    std::thread monitor_thread_;
};

class WebRtcSourceWorker final : public BasicSourceWorker {
public:
    explicit WebRtcSourceWorker(SourceSpec source_spec) : BasicSourceWorker(std::move(source_spec)) {}

    bool Start(const std::shared_ptr<core::SharedStream>& stream, std::string* error_message) override {
        // WHIP publish로 등록된 sourceId를 찾아 SharedStream source worker처럼 구독한다.
        published_source_ = ingress::WebRtcSourceRegistry::Instance().Find(source_spec_.uri);
        if (published_source_ == nullptr) {
            if (error_message != nullptr) {
                *error_message = "unknown WebRTC source: " + source_spec_.uri;
            }
            return false;
        }

        subscriber_id_ =
            "webrtc-source-worker-" + source_spec_.uri + "-" + std::to_string(reinterpret_cast<std::uintptr_t>(this));
        if (!published_source_->AddSubscriber(
                subscriber_id_, [weak_stream = std::weak_ptr<core::SharedStream>(stream)](const media::Packet& packet) {
                    if (auto strong_stream = weak_stream.lock(); strong_stream != nullptr) {
                        strong_stream->FanOut(packet);
                    }
                })) {
            if (error_message != nullptr) {
                *error_message = "duplicate WebRTC source subscription: " + source_spec_.uri;
            }
            published_source_.reset();
            return false;
        }

        StreamDescriptor descriptor;
        const auto ready_timeout = std::chrono::milliseconds(app::GetAppConfig().webrtc_source_ready_timeout_ms);
        // consumer egress가 caps를 만들 수 있도록 publisher의 audio/video track 준비를 기다린다.
        if (!published_source_->WaitForTracks(ready_timeout, true, true, &descriptor)) {
            published_source_->RemoveSubscriber(subscriber_id_);
            published_source_.reset();
            if (error_message != nullptr) {
                *error_message = "timed out waiting for published WebRTC source audio/video readiness";
            }
            return false;
        }

        descriptor.is_live = true;
        stream->SetDescriptor(std::move(descriptor));
        running_ = true;
        return true;
    }

    bool IsRunning() const override {
        return running_.load() && published_source_ != nullptr && published_source_->IsActive();
    }

    void Stop() override {
        running_.store(false);
        if (published_source_ != nullptr && !subscriber_id_.empty()) {
            published_source_->RemoveSubscriber(subscriber_id_);
        }
        published_source_.reset();
        subscriber_id_.clear();
    }

private:
    std::shared_ptr<ingress::PublishedWebRtcSource> published_source_;
    std::string subscriber_id_;
};

}  // namespace

namespace core {

std::unique_ptr<SourceWorker> CreateSourceWorker(const media::SourceSpec& source_spec) {
    // SourceSpec::Kind는 MediaServer -> Original Source 구간의 실제 수집 방식을 결정한다.
    switch (source_spec.kind) {
        case media::SourceSpec::Kind::File:
            return std::make_unique<FileSourceWorker>(source_spec);
        case media::SourceSpec::Kind::Rtsp:
            return std::make_unique<RtspSourceWorker>(source_spec);
        case media::SourceSpec::Kind::WebRtc:
            return std::make_unique<WebRtcSourceWorker>(source_spec);
        case media::SourceSpec::Kind::Hls:
        case media::SourceSpec::Kind::Http:
            return std::make_unique<UriSourceWorker>(source_spec);
        case media::SourceSpec::Kind::Youtube:
            return std::make_unique<YouTubeSourceWorker>(source_spec);
    }
    return nullptr;
}

}  // namespace core
