// 파일 요약: finalized 상시녹화 파일을 video 재인코딩 없이 이벤트 clip으로 remux한다.
// 동작 요약: fd-bound source/output, overlap seek, cleanup marker와 no-replace publish를 사용한다.
#include "recording/event_clip_deriver.h"

#include <algorithm>
#include <cerrno>
#include <cstring>
#include <limits>
#include <mutex>
#include <sstream>

#ifndef MEDIA_SERVER_USE_GSTREAMER
#define MEDIA_SERVER_USE_GSTREAMER 0
#endif

#if MEDIA_SERVER_USE_GSTREAMER
#include <fcntl.h>
#include <glib.h>
#include <gst/gst.h>
#include <sys/stat.h>
#include <unistd.h>
#endif

namespace recording {
namespace {

#if MEDIA_SERVER_USE_GSTREAMER
struct ScopedFd {
    int value{-1};
    ScopedFd() = default;
    explicit ScopedFd(int fd) : value(fd) {}
    ~ScopedFd() { if (value >= 0) ::close(value); }
    ScopedFd(const ScopedFd&) = delete;
    ScopedFd& operator=(const ScopedFd&) = delete;
    ScopedFd(ScopedFd&& other) noexcept : value(other.value) { other.value = -1; }
    ScopedFd& operator=(ScopedFd&& other) noexcept {
        if (this != &other) {
            if (value >= 0) ::close(value);
            value = other.value;
            other.value = -1;
        }
        return *this;
    }
};

std::string Sha256Token(const std::string& value) {
    GChecksum* checksum = g_checksum_new(G_CHECKSUM_SHA256);
    if (checksum == nullptr) return {};
    g_checksum_update(checksum,
                      reinterpret_cast<const guchar*>(value.data()),
                      static_cast<gssize>(value.size()));
    const char* digest = g_checksum_get_string(checksum);
    const std::string result = digest == nullptr ? std::string() : digest;
    g_checksum_free(checksum);
    return result;
}

bool WriteAll(int fd, const char* data, std::size_t size) {
    std::size_t offset = 0;
    while (offset < size) {
        const ssize_t written = ::write(fd, data + offset, size - offset);
        if (written < 0 && errno == EINTR) continue;
        if (written <= 0) return false;
        offset += static_cast<std::size_t>(written);
    }
    return true;
}

bool EnsureDirectoryAt(int parent_fd, const std::string& name, ScopedFd* directory) {
    if (directory == nullptr || name.empty() || name.find('/') != std::string::npos) return false;
    if (::mkdirat(parent_fd, name.c_str(), 0700) != 0 && errno != EEXIST) return false;
    const int fd = ::openat(parent_fd, name.c_str(),
                            O_RDONLY | O_DIRECTORY | O_CLOEXEC | O_NOFOLLOW);
    if (fd < 0) return false;
    struct stat status {};
    if (::fstat(fd, &status) != 0 || !S_ISDIR(status.st_mode) ||
        ::fchmod(fd, 0700) != 0) {
        ::close(fd);
        return false;
    }
    *directory = ScopedFd(fd);
    return true;
}

bool RemoveAtIfPresent(int directory_fd, const std::string& name) {
    if (::unlinkat(directory_fd, name.c_str(), 0) == 0) return true;
    return errno == ENOENT;
}

bool CleanupFailedOutput(int directory_fd,
                         const std::string& final_name,
                         const std::string& partial_name,
                         const std::string& marker_name) {
    const bool final_removed = RemoveAtIfPresent(directory_fd, final_name);
    const bool partial_removed = RemoveAtIfPresent(directory_fd, partial_name);
    if (!final_removed || !partial_removed || ::fsync(directory_fd) != 0) return false;
    const bool marker_removed = RemoveAtIfPresent(directory_fd, marker_name);
    return marker_removed && ::fsync(directory_fd) == 0;
}

bool CleanupUnpublishedOutput(int directory_fd,
                              const std::string& partial_name,
                              const std::string& marker_name) {
    const bool partial_removed = RemoveAtIfPresent(directory_fd, partial_name);
    if (!partial_removed || ::fsync(directory_fd) != 0) return false;
    const bool marker_removed = RemoveAtIfPresent(directory_fd, marker_name);
    return marker_removed && ::fsync(directory_fd) == 0;
}

struct TimelineProbe {
    std::mutex mu;
    bool selected_phase{false};
    bool origin_seen{false};
    bool selected_seen{false};
    GstClockTime origin_pts{GST_CLOCK_TIME_NONE};
    GstClockTime selected_start_pts{GST_CLOCK_TIME_NONE};
    GstClockTime selected_end_pts{GST_CLOCK_TIME_NONE};
};

GstPadProbeReturn ObserveTimeline(GstPad*, GstPadProbeInfo* info, gpointer user_data) {
    auto* timeline = static_cast<TimelineProbe*>(user_data);
    GstBuffer* buffer = GST_PAD_PROBE_INFO_BUFFER(info);
    if (timeline == nullptr || buffer == nullptr ||
        !GST_CLOCK_TIME_IS_VALID(GST_BUFFER_PTS(buffer))) {
        return GST_PAD_PROBE_OK;
    }
    const GstClockTime pts = GST_BUFFER_PTS(buffer);
    const GstClockTime duration = GST_CLOCK_TIME_IS_VALID(GST_BUFFER_DURATION(buffer))
                                      ? GST_BUFFER_DURATION(buffer)
                                      : 0;
    const GstClockTime end = pts > GST_CLOCK_TIME_NONE - duration
                                 ? GST_CLOCK_TIME_NONE
                                 : pts + duration;
    std::lock_guard lock(timeline->mu);
    if (!timeline->selected_phase) {
        if (!timeline->origin_seen || pts < timeline->origin_pts) {
            timeline->origin_pts = pts;
        }
        timeline->origin_seen = true;
        return GST_PAD_PROBE_OK;
    }
    if (!timeline->selected_seen || pts < timeline->selected_start_pts) {
        timeline->selected_start_pts = pts;
    }
    if (!timeline->selected_seen || end > timeline->selected_end_pts) {
        timeline->selected_end_pts = end;
    }
    timeline->selected_seen = true;
    return GST_PAD_PROBE_OK;
}

bool ProbeH264OriginPts(int source_fd, GstClockTime* origin_pts) {
    if (source_fd < 0 || origin_pts == nullptr) return false;
    const std::string launch =
        "filesrc location=\"/dev/fd/" + std::to_string(source_fd) +
        "\" ! qtdemux ! queue ! h264parse ! identity name=origin_probe ! "
        "fakesink sync=false";
    GError* parse_error = nullptr;
    GstElement* pipeline = gst_parse_launch(launch.c_str(), &parse_error);
    if (pipeline == nullptr || parse_error != nullptr) {
        if (parse_error != nullptr) g_error_free(parse_error);
        if (pipeline != nullptr) gst_object_unref(pipeline);
        return false;
    }
    TimelineProbe timeline;
    GstElement* identity = gst_bin_get_by_name(GST_BIN(pipeline), "origin_probe");
    GstPad* pad = identity == nullptr ? nullptr : gst_element_get_static_pad(identity, "src");
    if (identity != nullptr) gst_object_unref(identity);
    const bool probe_added = pad != nullptr &&
        gst_pad_add_probe(pad, GST_PAD_PROBE_TYPE_BUFFER,
                          ObserveTimeline, &timeline, nullptr) != 0;
    bool ok = probe_added &&
              gst_element_set_state(pipeline, GST_STATE_PAUSED) != GST_STATE_CHANGE_FAILURE;
    if (ok) {
        GstState state = GST_STATE_NULL;
        GstState pending = GST_STATE_NULL;
        ok = gst_element_get_state(pipeline, &state, &pending, 10 * GST_SECOND) !=
             GST_STATE_CHANGE_FAILURE;
    }
    {
        std::lock_guard lock(timeline.mu);
        ok = ok && timeline.origin_seen;
        if (ok) *origin_pts = timeline.origin_pts;
    }
    gst_element_set_state(pipeline, GST_STATE_NULL);
    gst_object_unref(pipeline);
    if (pad != nullptr) gst_object_unref(pad);
    ::lseek(source_fd, 0, SEEK_SET);
    return ok;
}

std::int64_t FloorMilliseconds(GstClockTime value) {
    return static_cast<std::int64_t>(value / GST_MSECOND);
}

std::int64_t CeilMilliseconds(GstClockTime value) {
    return static_cast<std::int64_t>((value + GST_MSECOND - 1) / GST_MSECOND);
}

std::int64_t ClampInt64(__int128 value) {
    if (value > std::numeric_limits<std::int64_t>::max()) {
        return std::numeric_limits<std::int64_t>::max();
    }
    if (value < std::numeric_limits<std::int64_t>::min()) {
        return std::numeric_limits<std::int64_t>::min();
    }
    return static_cast<std::int64_t>(value);
}

std::string FileSha256(int fd) {
    if (::lseek(fd, 0, SEEK_SET) < 0) return {};
    GChecksum* checksum = g_checksum_new(G_CHECKSUM_SHA256);
    if (checksum == nullptr) return {};
    char buffer[64 * 1024];
    while (true) {
        const ssize_t count = ::read(fd, buffer, sizeof(buffer));
        if (count < 0 && errno == EINTR) continue;
        if (count < 0) {
            g_checksum_free(checksum);
            return {};
        }
        if (count == 0) break;
        g_checksum_update(checksum, reinterpret_cast<const guchar*>(buffer), count);
    }
    const char* digest = g_checksum_get_string(checksum);
    const std::string result = digest == nullptr ? std::string() : digest;
    g_checksum_free(checksum);
    return result;
}

bool ValidateSource(const EventClipSource& source,
                    const RecordingSegmentV1& first) {
    return source.segment.container == first.container &&
           source.segment.video_codecs == first.video_codecs &&
           source.segment.audio_codecs == first.audio_codecs &&
           source.overlap.start_ms >= source.segment.start.utc_ms &&
           source.overlap.end_ms <= source.segment.end.utc_ms &&
           source.overlap.start_ms < source.overlap.end_ms;
}
#endif

}  // namespace

EventClipDeriveResult GStreamerEventClipDeriver::Derive(
    const EventClipDeriveRequest& request) {
    EventClipDeriveResult result;
    if (request.sources.empty() || request.output_root.empty() ||
        request.channel_id.empty() || request.output_segment_id.empty() ||
        request.requested_range.start_ms >= request.requested_range.end_ms) {
        result.error = "event remux 요청이 비어 있음";
        result.cleanup_complete = true;
        return result;
    }
#if !MEDIA_SERVER_USE_GSTREAMER
    result.error = "GStreamer 이벤트 remux 지원이 빌드되지 않음";
    result.cleanup_complete = true;
    return result;
#else
    static std::once_flag gst_once;
    std::call_once(gst_once, [] { gst_init(nullptr, nullptr); });
    const auto& first = request.sources.front().segment;
    const bool h264_mp4 = first.container == "mp4" &&
                          first.video_codecs == std::vector<std::string>{"h264"};
    if (!h264_mp4 || !first.audio_codecs.empty()) {
        result.error = "S05 event remux는 검증된 video-only H264/MP4만 지원함";
        result.cleanup_complete = true;
        return result;
    }
    for (const auto& source : request.sources) {
        if (!ValidateSource(source, first)) {
            result.error = "event remux source codec 또는 overlap이 호환되지 않음";
            result.cleanup_complete = true;
            return result;
        }
    }

    std::error_code fs_error;
    std::filesystem::create_directories(request.output_root, fs_error);
    if (fs_error) {
        result.error = "event remux root 생성 실패: " + fs_error.message();
        return result;
    }
    std::filesystem::permissions(request.output_root, std::filesystem::perms::owner_all,
                                 std::filesystem::perm_options::replace, fs_error);
    if (fs_error) {
        result.error = "event remux root 권한 고정 실패: " + fs_error.message();
        return result;
    }
    ScopedFd root_fd(::open(request.output_root.c_str(),
                            O_RDONLY | O_DIRECTORY | O_CLOEXEC | O_NOFOLLOW));
    const std::string channel_name = "channel-sha256-" + Sha256Token(request.channel_id);
    ScopedFd channel_fd;
    ScopedFd event_fd;
    if (root_fd.value < 0 || channel_name.size() <= 15 ||
        !EnsureDirectoryAt(root_fd.value, channel_name, &channel_fd) ||
        !EnsureDirectoryAt(channel_fd.value, "events", &event_fd)) {
        result.error = "event remux 출력 디렉터리 fd 고정 실패";
        return result;
    }
    const std::string extension = h264_mp4 ? ".ts" : ".webm";
    const std::string final_name = request.output_segment_id + extension;
    gchar* partial_nonce_raw = g_uuid_string_random();
    const std::string partial_nonce =
        partial_nonce_raw == nullptr ? std::string() : partial_nonce_raw;
    g_free(partial_nonce_raw);
    if (partial_nonce.empty()) {
        result.error = "event remux partial 소유 nonce 생성 실패";
        result.cleanup_complete = true;
        return result;
    }
    const std::string partial_name = final_name + ".partial." + partial_nonce;
    const std::string marker_name = final_name + ".cleanup-pending";
    if (final_name.size() > 220 || final_name.find('/') != std::string::npos) {
        result.error = "event remux 출력 파일명이 유효하지 않음";
        return result;
    }
    const std::filesystem::path directory =
        request.output_root / channel_name / "events";
    result.media_path = directory / final_name;
    result.partial_path = directory / partial_name;
    result.cleanup_marker_path = directory / marker_name;

    struct stat existing_status {};
    if (::fstatat(event_fd.value, final_name.c_str(), &existing_status,
                  AT_SYMLINK_NOFOLLOW) == 0 || errno != ENOENT) {
        result.error = "event remux final 경로가 이미 존재하거나 확인할 수 없음";
        result.cleanup_complete = true;
        return result;
    }

    ScopedFd marker_fd(::openat(event_fd.value, marker_name.c_str(),
                                O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC | O_NOFOLLOW, 0600));
    const std::string marker_contents =
        "recording-cleanup-pending-v2\npartial=" + partial_name + "\n";
    if (marker_fd.value < 0) {
        result.error = "event remux cleanup marker가 이미 존재하거나 생성할 수 없음";
        result.cleanup_complete = false;
        return result;
    }
    if (!WriteAll(marker_fd.value, marker_contents.data(), marker_contents.size()) ||
        ::fsync(marker_fd.value) != 0 || ::fsync(event_fd.value) != 0) {
        result.error = "event remux cleanup marker 생성 실패: " + std::string(std::strerror(errno));
        result.cleanup_complete = CleanupUnpublishedOutput(
            event_fd.value, partial_name, marker_name);
        return result;
    }
    ScopedFd output_fd(::openat(event_fd.value, partial_name.c_str(),
                                O_RDWR | O_CREAT | O_EXCL | O_CLOEXEC | O_NOFOLLOW, 0600));
    if (output_fd.value < 0) {
        result.error = "event remux partial 생성 실패: " + std::string(std::strerror(errno));
        // nonce partial의 O_EXCL 충돌은 이 호출의 소유가 아니다. 이 호출이 만든
        // marker만 제거해 recovery가 foreign 파일을 소유 파일로 오인하지 않게 한다.
        result.cleanup_complete = RemoveAtIfPresent(event_fd.value, marker_name) &&
                                  ::fsync(event_fd.value) == 0;
        return result;
    }

    std::vector<ScopedFd> source_fds;
    source_fds.reserve(request.sources.size());
    for (const auto& source : request.sources) {
        ScopedFd source_fd(::open(source.media_path.c_str(), O_RDONLY | O_CLOEXEC | O_NOFOLLOW));
        struct stat status {};
        if (source_fd.value < 0 || ::fstat(source_fd.value, &status) != 0 ||
            !S_ISREG(status.st_mode) || status.st_size <= 0) {
            result.error = "event remux source fd 고정 실패";
            result.cleanup_complete = CleanupUnpublishedOutput(
                event_fd.value, partial_name, marker_name);
            return result;
        }
        source_fds.push_back(std::move(source_fd));
    }
    ScopedFd sink_fd(::dup(output_fd.value));
    if (sink_fd.value < 0) {
        result.error = "event remux output fd 복제 실패";
        result.cleanup_complete = CleanupUnpublishedOutput(
            event_fd.value, partial_name, marker_name);
        return result;
    }
    std::vector<GstClockTime> source_origins(source_fds.size(), GST_CLOCK_TIME_NONE);
    for (std::size_t index = 0; index < source_fds.size(); ++index) {
        if (!ProbeH264OriginPts(source_fds[index].value, &source_origins[index])) {
            result.error = "event remux source timeline origin 측정 실패";
            result.cleanup_complete = CleanupUnpublishedOutput(
                event_fd.value, partial_name, marker_name);
            return result;
        }
    }

    std::ostringstream launch;
    auto append_mux_and_sink = [&] {
        if (h264_mp4) launch << "mpegtsmux alignment=7 ! ";
        else launch << "webmmux ! ";
        // MPEG-TS는 downstream seek가 필요 없어 pre-opened regular-file fd에
        // 직접 쓸 수 있다. 경로를 다시 여는 filesink는 사용하지 않는다.
        launch << "fdsink fd=" << sink_fd.value << " sync=false ";
    };
    if (source_fds.size() == 1) {
        launch << "filesrc location=\"/dev/fd/" << source_fds[0].value << "\" ! "
               << (h264_mp4 ? "qtdemux" : "matroskademux")
               << " name=event_demux_0 ! queue ! ";
        if (h264_mp4) launch << "h264parse config-interval=-1 ! ";
        launch << "identity name=event_probe_0 ! ";
        append_mux_and_sink();
    } else {
        launch << "concat name=event_concat ! queue ! h264parse config-interval=-1 ! ";
        append_mux_and_sink();
    }
    for (std::size_t index = source_fds.size() == 1 ? 1 : 0;
         index < source_fds.size(); ++index) {
        launch << "filesrc location=\"/dev/fd/" << source_fds[index].value << "\" ! "
               << (h264_mp4 ? "qtdemux" : "matroskademux")
               << " name=event_demux_" << index << " ! queue ! ";
        if (h264_mp4) launch << "h264parse ! ";
        launch << "identity name=event_probe_" << index << " ! event_concat. ";
    }
    GError* parse_error = nullptr;
    GstElement* pipeline = gst_parse_launch(launch.str().c_str(), &parse_error);
    if (pipeline == nullptr || parse_error != nullptr) {
        result.error = parse_error == nullptr ? "event remux pipeline 생성 실패"
                                              : parse_error->message;
        if (parse_error != nullptr) g_error_free(parse_error);
        if (pipeline != nullptr) gst_object_unref(pipeline);
        result.cleanup_complete = CleanupUnpublishedOutput(
            event_fd.value, partial_name, marker_name);
        return result;
    }

    std::vector<TimelineProbe> timelines(request.sources.size());
    std::vector<GstPad*> timeline_pads;
    timeline_pads.reserve(request.sources.size());
    bool probes_ready = true;
    for (std::size_t index = 0; index < request.sources.size(); ++index) {
        const std::string name = "event_probe_" + std::to_string(index);
        GstElement* identity = gst_bin_get_by_name(GST_BIN(pipeline), name.c_str());
        GstPad* pad = identity == nullptr ? nullptr : gst_element_get_static_pad(identity, "src");
        if (identity != nullptr) gst_object_unref(identity);
        if (pad == nullptr || gst_pad_add_probe(
                                  pad, GST_PAD_PROBE_TYPE_BUFFER,
                                  ObserveTimeline, &timelines[index], nullptr) == 0) {
            probes_ready = false;
        }
        timeline_pads.push_back(pad);
    }

    bool ok = probes_ready &&
              gst_element_set_state(pipeline, GST_STATE_PAUSED) != GST_STATE_CHANGE_FAILURE;
    if (!ok) result.error = "event remux PAUSED 전환 실패";
    if (ok) {
        GstState state = GST_STATE_NULL;
        GstState pending = GST_STATE_NULL;
        ok = gst_element_get_state(pipeline, &state, &pending, 10 * GST_SECOND) !=
             GST_STATE_CHANGE_FAILURE;
    }
    if (ok) {
        for (std::size_t index = 0; index < timelines.size(); ++index) {
            auto& timeline = timelines[index];
            std::lock_guard lock(timeline.mu);
            timeline.origin_seen = true;
            timeline.origin_pts = source_origins[index];
            timeline.selected_phase = true;
            timeline.selected_seen = false;
            timeline.selected_start_pts = GST_CLOCK_TIME_NONE;
            timeline.selected_end_pts = GST_CLOCK_TIME_NONE;
        }
    }
    for (std::size_t index = 0; ok && index < request.sources.size(); ++index) {
        const std::string name = "event_demux_" + std::to_string(index);
        GstElement* demux = gst_bin_get_by_name(GST_BIN(pipeline), name.c_str());
        const auto& source = request.sources[index];
        const gint64 start = std::max<std::int64_t>(
            0, source.overlap.start_ms - source.segment.start.utc_ms) * GST_MSECOND;
        const gint64 stop = std::max<std::int64_t>(
            1, source.overlap.end_ms - source.segment.start.utc_ms) * GST_MSECOND;
        const GstSeekFlags seek_flags = h264_mp4
            ? static_cast<GstSeekFlags>(GST_SEEK_FLAG_FLUSH | GST_SEEK_FLAG_ACCURATE |
                                        GST_SEEK_FLAG_KEY_UNIT)
            : static_cast<GstSeekFlags>(GST_SEEK_FLAG_FLUSH | GST_SEEK_FLAG_ACCURATE);
        ok = demux != nullptr && gst_element_seek(
            demux, 1.0, GST_FORMAT_TIME,
            seek_flags,
            GST_SEEK_TYPE_SET, start, GST_SEEK_TYPE_SET, stop);
        if (!ok) result.error = "event remux source " + std::to_string(index) + " seek 실패";
        if (demux != nullptr) gst_object_unref(demux);
    }
    if (ok) {
        ok = gst_element_set_state(pipeline, GST_STATE_PLAYING) != GST_STATE_CHANGE_FAILURE;
        if (!ok) result.error = "event remux PLAYING 전환 실패";
    }
    GstMessage* message = nullptr;
    if (ok) {
        GstBus* bus = gst_element_get_bus(pipeline);
        message = gst_bus_timed_pop_filtered(
            bus, 30 * GST_SECOND,
            static_cast<GstMessageType>(GST_MESSAGE_EOS | GST_MESSAGE_ERROR));
        ok = message != nullptr && GST_MESSAGE_TYPE(message) == GST_MESSAGE_EOS;
        if (!ok && message != nullptr && GST_MESSAGE_TYPE(message) == GST_MESSAGE_ERROR) {
            GError* gst_error = nullptr;
            gchar* debug = nullptr;
            gst_message_parse_error(message, &gst_error, &debug);
            if (gst_error != nullptr) result.error = gst_error->message;
            if (debug != nullptr && *debug != '\0') result.error += ": " + std::string(debug);
            if (gst_error != nullptr) g_error_free(gst_error);
            g_free(debug);
        }
        gst_object_unref(bus);
    }
    if (message != nullptr) gst_message_unref(message);
    gst_element_set_state(pipeline, GST_STATE_NULL);
    gst_object_unref(pipeline);
    for (GstPad* pad : timeline_pads) {
        if (pad != nullptr) gst_object_unref(pad);
    }

    struct stat output_status {};
    struct stat output_path_status {};
    if (!ok || ::fsync(output_fd.value) != 0 ||
        ::fstat(output_fd.value, &output_status) != 0 || output_status.st_size <= 0) {
        if (result.error.empty()) result.error = "event remux seek/EOS/fsync 실패";
        result.cleanup_complete = CleanupUnpublishedOutput(
            event_fd.value, partial_name, marker_name);
        return result;
    }
    if (::lstat(result.partial_path.c_str(), &output_path_status) != 0 ||
        !S_ISREG(output_path_status.st_mode) ||
        output_status.st_dev != output_path_status.st_dev ||
        output_status.st_ino != output_path_status.st_ino) {
        result.error = "event remux output inode binding 검증 실패";
        result.cleanup_complete = CleanupUnpublishedOutput(
            event_fd.value, partial_name, marker_name);
        return result;
    }
    std::int64_t measured_start = std::numeric_limits<std::int64_t>::max();
    std::int64_t measured_end = std::numeric_limits<std::int64_t>::min();
    for (std::size_t index = 0; index < timelines.size(); ++index) {
        std::lock_guard lock(timelines[index].mu);
        const auto& timeline = timelines[index];
        if (!timeline.origin_seen || !timeline.selected_seen ||
            timeline.selected_start_pts < timeline.origin_pts ||
            timeline.selected_end_pts <= timeline.selected_start_pts) {
            result.error = "event remux 실제 packet timeline 측정 실패";
            result.cleanup_complete = CleanupUnpublishedOutput(
                event_fd.value, partial_name, marker_name);
            return result;
        }
        const GstClockTime start_offset = timeline.selected_start_pts - timeline.origin_pts;
        const GstClockTime end_offset = timeline.selected_end_pts - timeline.origin_pts;
        measured_start = std::min(measured_start, ClampInt64(
            static_cast<__int128>(request.sources[index].segment.start.utc_ms) +
            FloorMilliseconds(start_offset)));
        measured_end = std::max(measured_end, ClampInt64(
            static_cast<__int128>(request.sources[index].segment.start.utc_ms) +
            CeilMilliseconds(end_offset)));
    }
    if (measured_start > request.requested_range.start_ms ||
        measured_end < request.requested_range.end_ms || measured_start >= measured_end) {
        result.error = "event remux 실제 범위가 요청 범위를 포함하지 않음";
        result.cleanup_complete = CleanupUnpublishedOutput(
            event_fd.value, partial_name, marker_name);
        return result;
    }
    result.checksum_sha256 = FileSha256(output_fd.value);
    if (result.checksum_sha256.size() != 64) {
        result.error = "event remux 결과 checksum 확인 실패";
        result.cleanup_complete = CleanupUnpublishedOutput(
            event_fd.value, partial_name, marker_name);
        return result;
    }
    if (::linkat(event_fd.value, partial_name.c_str(),
                 event_fd.value, final_name.c_str(), 0) != 0) {
        // EEXIST 등 no-replace 실패 시 기존 final은 이 호출 소유가 아니므로 삭제하지 않는다.
        result.error = "event remux final no-replace publish 실패";
        result.cleanup_complete = CleanupUnpublishedOutput(
            event_fd.value, partial_name, marker_name);
        return result;
    }
    if (::fsync(event_fd.value) != 0 ||
        ::unlinkat(event_fd.value, partial_name.c_str(), 0) != 0 ||
        ::fsync(event_fd.value) != 0) {
        result.error = "event remux publish fsync 또는 partial 정리 실패";
        result.cleanup_complete = CleanupFailedOutput(
            event_fd.value, final_name, partial_name, marker_name);
        return result;
    }
    result.partial_path.clear();
    result.size_bytes = static_cast<std::uint64_t>(output_status.st_size);
    result.actual_range = {measured_start, measured_end};
    result.container = "mpegts";
    result.video_codecs = first.video_codecs;
    result.audio_codecs = first.audio_codecs;
    result.audio_omitted_reason = first.audio_omitted_reason;
    result.cleanup_complete = false;  // 성공 marker는 catalog terminal commit 뒤 bridge가 제거한다.
    result.ok = true;
    return result;
#endif
}

}  // namespace recording
