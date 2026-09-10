#include "recording/recording_media_inspector.h"
#include "recording/recording_catalog.h"
#include <algorithm>
#include <array>
#include <atomic>
#include <cerrno>
#include <mutex>
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>
#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/app/gstappsrc.h>
#include <gst/gst.h>
#endif
namespace recording {
namespace {
MediaInspectionResult Unavailable(const std::string& detail) {
    return {MediaInspectionState::Unavailable,detail,"",false,""};
}
#if MEDIA_SERVER_USE_GSTREAMER
using Clock = std::chrono::steady_clock;
struct Fd {
    int value{-1};
    explicit Fd(int fd = -1) : value(fd) {}
    ~Fd() { if (value >= 0) ::close(value); }
    Fd(const Fd&) = delete;
    Fd& operator=(const Fd&) = delete;
    Fd(Fd&& other) noexcept : value(other.value) { other.value = -1; }
    Fd& operator=(Fd&& other) noexcept {
        if (value >= 0) ::close(value);
        value = other.value; other.value = -1; return *this;
    }
};
bool Identity(const struct stat& a, const struct stat& b) {
    return a.st_dev == b.st_dev && a.st_ino == b.st_ino;
}
bool Stable(const struct stat& a, const struct stat& b) {
#ifdef __APPLE__
    const auto am = a.st_mtimespec, bm = b.st_mtimespec;
    const auto ac = a.st_ctimespec, bc = b.st_ctimespec;
#else
    const auto am = a.st_mtim, bm = b.st_mtim;
    const auto ac = a.st_ctim, bc = b.st_ctim;
#endif
    return Identity(a,b) && a.st_size == b.st_size && a.st_nlink == b.st_nlink &&
        am.tv_sec == bm.tv_sec && am.tv_nsec == bm.tv_nsec &&
        ac.tv_sec == bc.tv_sec && ac.tv_nsec == bc.tv_nsec;
}
bool Components(const std::filesystem::path& path) {
    for (const auto& item : path) {
        if (item == ".." || item.string().find('\0') != std::string::npos) return false;
    }
    return true;
}
std::filesystem::path AbsoluteRoot(const std::filesystem::path& input) {
    if (!Components(input) || input.empty()) return {};
    std::error_code error;
    auto root = std::filesystem::absolute(input,error).lexically_normal();
    if (error) return {};
#ifdef __APPLE__
    // macOS의 고정 시스템 alias만 허용한다. 하위 사용자 symlink는 따라가지 않는다.
    const auto text = root.string();
    if (text == "/tmp" || text.rfind("/tmp/",0) == 0 ||
        text == "/var" || text.rfind("/var/",0) == 0) root = "/private" + text;
#endif
    return root;
}
Fd OpenDirectory(const std::filesystem::path& path) {
    Fd directory(::open("/",O_RDONLY|O_DIRECTORY|O_CLOEXEC));
    for (const auto& part : path.relative_path()) {
        if (part == "." || part.empty()) continue;
        Fd next(::openat(directory.value,part.c_str(),O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC));
        if (next.value < 0) return Fd();
        directory = std::move(next);
    }
    return directory;
}
struct Binding {
    std::filesystem::path root, relative;
    Fd root_fd, parent_fd, file_fd;
    struct stat root_stat{}, parent_stat{}, file_stat{};
    bool missing{false};
    bool Open(const std::filesystem::path& input_root, const std::filesystem::path& input_relative) {
        root = AbsoluteRoot(input_root); relative = input_relative;
        if (root.empty() || relative.empty() || relative.is_absolute() || !Components(relative) ||
            relative.filename().empty() || relative.filename() == ".") return false;
        root_fd = OpenDirectory(root);
        if (root_fd.value < 0 || ::fstat(root_fd.value,&root_stat) != 0) return false;
        parent_fd = Fd(::dup(root_fd.value));
        for (const auto& part : relative.parent_path()) {
            if (part == "." || part.empty()) continue;
            Fd next(::openat(parent_fd.value,part.c_str(),O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC));
            if (next.value < 0) return false;
            parent_fd = std::move(next);
        }
        if (parent_fd.value < 0 || ::fstat(parent_fd.value,&parent_stat) != 0) return false;
        file_fd = Fd(::openat(parent_fd.value,relative.filename().c_str(),O_RDONLY|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK));
        if (file_fd.value < 0) { missing = errno == ENOENT; return missing; }
        return ::fstat(file_fd.value,&file_stat) == 0 && S_ISREG(file_stat.st_mode) &&
            file_stat.st_nlink == 1 && file_stat.st_size >= 0;
    }
    bool Unchanged() const {
        Binding current;
        if (!current.Open(root,relative) || !Identity(root_stat,current.root_stat) ||
            !Identity(parent_stat,current.parent_stat) || missing != current.missing) return false;
        if (missing) return true;
        struct stat now{};
        return ::fstat(file_fd.value,&now) == 0 && Stable(file_stat,now) && Stable(file_stat,current.file_stat);
    }
};
MediaInspectionResult Corrupt(const std::string& detail, const std::string& reason) {
    return {MediaInspectionState::Corrupt,detail,reason,false,""};
}
bool MetadataSupported(const RecordingSegmentV1& segment) {
    if (segment.checksum_sha256.size() != 64 ||
        !std::all_of(segment.checksum_sha256.begin(),segment.checksum_sha256.end(),[](unsigned char c) {
            return (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
        })) return false;
    return segment.video_codecs.size() == 1 &&
        (((segment.container == "mp4" || segment.container == "mpegts") && segment.video_codecs.front() == "h264") ||
         (segment.container == "webm" && segment.video_codecs.front() == "vp8"));
}
struct DemuxContext {
    int fd;
    guint64 size;
    guint64 offset{0};
    Clock::time_point deadline;
    GstElement* pipeline;
    const char* expected_caps;
    std::mutex offset_mutex;
    std::atomic<bool> io_error{false}, expired{false}, setup_error{false}, video_seen{false}, mismatch{false}, request_limit{false};
    std::atomic<unsigned> buffers{0};
};
void NeedData(GstAppSrc* source, guint length, gpointer user) {
    auto& c = *static_cast<DemuxContext*>(user);
    std::unique_lock<std::mutex> lock(c.offset_mutex);
    if (Clock::now() >= c.deadline) { c.expired = true; gst_app_src_end_of_stream(source); return; }
    if (c.offset >= c.size) { gst_app_src_end_of_stream(source); return; }
    if (length > 16*1024*1024 || length == 0) { c.request_limit = true; gst_app_src_end_of_stream(source); return; }
    const auto amount = static_cast<gsize>(std::min<guint64>(c.size-c.offset,length));
    GstBuffer* buffer = gst_buffer_new_allocate(nullptr,amount,nullptr);
    GstMapInfo map{};
    if (!buffer || !gst_buffer_map(buffer,&map,GST_MAP_WRITE)) {
        if (buffer) gst_buffer_unref(buffer);
        c.io_error = true; gst_app_src_end_of_stream(source); return;
    }
    gsize read_size = 0;
    while (read_size < amount && Clock::now() < c.deadline) {
        const auto got = ::pread(c.fd,map.data+read_size,std::min<gsize>(amount-read_size,65536),static_cast<off_t>(c.offset+read_size));
        if (got < 0 && errno == EINTR) continue;
        if (got <= 0) break;
        read_size += static_cast<gsize>(got);
    }
    gst_buffer_unmap(buffer,&map);
    if (read_size != amount) { gst_buffer_unref(buffer); c.io_error = true; gst_app_src_end_of_stream(source); return; }
    GST_BUFFER_OFFSET(buffer) = c.offset;
    c.offset += amount;
    GST_BUFFER_OFFSET_END(buffer) = c.offset;
    lock.unlock();
    const auto flow = gst_app_src_push_buffer(source,buffer);
    if (flow != GST_FLOW_OK && flow != GST_FLOW_FLUSHING) c.io_error = true;
}
gboolean SeekData(GstAppSrc*, guint64 offset, gpointer user) {
    auto& c = *static_cast<DemuxContext*>(user);
    std::lock_guard<std::mutex> lock(c.offset_mutex);
    if (offset > c.size) return FALSE;
    c.offset = offset; return TRUE;
}
GstPadProbeReturn VideoBuffer(GstPad*, GstPadProbeInfo* info, gpointer user) {
    auto& c = *static_cast<DemuxContext*>(user);
    if (GST_PAD_PROBE_INFO_TYPE(info) & GST_PAD_PROBE_TYPE_BUFFER) ++c.buffers;
    return GST_PAD_PROBE_OK;
}
void PadAdded(GstElement*, GstPad* pad, gpointer user) {
    auto& c = *static_cast<DemuxContext*>(user);
    GstCaps* caps = gst_pad_get_current_caps(pad);
    if (!caps) caps = gst_pad_query_caps(pad,nullptr);
    const char* name = caps && gst_caps_get_size(caps) ? gst_structure_get_name(gst_caps_get_structure(caps,0)) : "";
    const bool video = g_str_has_prefix(name,"video/");
    if (video) {
        if (g_strcmp0(name,c.expected_caps) != 0) c.mismatch = true;
        else { c.video_seen = true; gst_pad_add_probe(pad,GST_PAD_PROBE_TYPE_BUFFER,VideoBuffer,&c,nullptr); }
    }
    if (caps) gst_caps_unref(caps);
    GstElement* sink = gst_element_factory_make("fakesink",nullptr);
    if (!sink) { c.setup_error = true; return; }
    g_object_set(sink,"sync",FALSE,"async",FALSE,nullptr);
    if (!gst_bin_add(GST_BIN(c.pipeline),sink)) { gst_object_unref(sink); c.setup_error = true; return; }
    GstPad* target = gst_element_get_static_pad(sink,"sink");
    if (!target || gst_pad_link(pad,target) != GST_PAD_LINK_OK || !gst_element_sync_state_with_parent(sink)) c.setup_error = true;
    if (target) gst_object_unref(target);
}
MediaInspectionResult Demux(Binding& binding, const RecordingSegmentV1& segment, Clock::time_point deadline) {
    GError* init_error = nullptr;
    if (!gst_init_check(nullptr,nullptr,&init_error)) { if (init_error) g_error_free(init_error); return Unavailable("gstreamer-init"); }
    GstElement* pipeline = gst_pipeline_new(nullptr);
    GstElement* source = gst_element_factory_make("appsrc",nullptr);
    GstElement* demux = gst_element_factory_make(segment.container == "mpegts" ? "tsdemux" :
        (segment.container == "mp4" ? "qtdemux" : "matroskademux"),nullptr);
    if (!pipeline || !source || !demux) {
        if (pipeline) gst_object_unref(pipeline);
        if (source) gst_object_unref(source);
        if (demux) gst_object_unref(demux);
        return Unavailable("plugin-unavailable");
    }
    DemuxContext context{binding.file_fd.value,static_cast<guint64>(binding.file_stat.st_size),0,deadline,pipeline,
        segment.container == "webm" ? "video/x-vp8" : "video/x-h264",{}};
    GstAppSrcCallbacks callbacks{}; callbacks.need_data = NeedData; callbacks.seek_data = SeekData;
    gst_app_src_set_callbacks(GST_APP_SRC(source),&callbacks,&context,nullptr);
    gst_app_src_set_stream_type(GST_APP_SRC(source),GST_APP_STREAM_TYPE_RANDOM_ACCESS);
    gst_app_src_set_size(GST_APP_SRC(source),binding.file_stat.st_size);
    g_object_set(source,"format",GST_FORMAT_BYTES,"block",FALSE,nullptr);
    gst_bin_add_many(GST_BIN(pipeline),source,demux,nullptr);
    g_signal_connect(demux,"pad-added",G_CALLBACK(PadAdded),&context);
    auto result = Unavailable("pipeline-setup");
    if (gst_element_link(source,demux) && gst_element_set_state(pipeline,GST_STATE_PLAYING) != GST_STATE_CHANGE_FAILURE) {
        GstBus* bus = gst_element_get_bus(pipeline);
        const auto remaining = deadline-Clock::now();
        GstMessage* message = remaining > Clock::duration::zero() ? gst_bus_timed_pop_filtered(bus,
            std::chrono::duration_cast<std::chrono::nanoseconds>(remaining).count(),
            static_cast<GstMessageType>(GST_MESSAGE_EOS|GST_MESSAGE_ERROR)) : nullptr;
        if (!message) result = Unavailable("timeout");
        else if (GST_MESSAGE_TYPE(message) == GST_MESSAGE_ERROR) {
            GError* error = nullptr; gchar* debug = nullptr; gst_message_parse_error(message,&error,&debug);
            if (error && error->domain == GST_STREAM_ERROR &&
                (error->code == GST_STREAM_ERROR_DEMUX || error->code == GST_STREAM_ERROR_FORMAT)) result = Corrupt("container-invalid","container-invalid");
            else result = Unavailable("demux-error-unclassified");
            if (error) g_error_free(error);
            g_free(debug);
        } else if (context.video_seen && context.buffers > 0 && !context.mismatch) {
            result = {MediaInspectionState::Healthy,"verified-hash-and-demux","",false,""};
        } else result = Corrupt("expected-video-missing-or-mismatched","container-invalid");
        if (message) gst_message_unref(message);
        gst_object_unref(bus);
    }
    // NULL로 callback 종료 후 stack context/FD를 해제한다. OS I/O 정체의 절대시간 상한은 보장하지 않는다.
    gst_element_set_state(pipeline,GST_STATE_NULL);
    if (context.io_error) result = Unavailable("read-error");
    if (context.setup_error) result = Unavailable("pipeline-setup");
    if (context.request_limit) result = Unavailable("request-limit");
    if (context.expired || Clock::now() >= deadline) result = Unavailable("timeout");
    gst_object_unref(pipeline);
    return result;
}
MediaInspectionResult Inspect(Binding& binding, const RecordingSegmentV1& segment, Clock::time_point deadline) {
    if (Clock::now() >= deadline) return Unavailable("timeout");
    if (!MetadataSupported(segment)) return Unavailable("unsupported-metadata");
    if (binding.missing) return Corrupt("missing-media",segment.retention_class == RecordingRetentionClass::Event ? "derived-media-missing" : "missing-media");
    if (static_cast<std::uint64_t>(binding.file_stat.st_size) != segment.size_bytes) return Corrupt("size-mismatch","checksum-mismatch");
    GChecksum* checksum = g_checksum_new(G_CHECKSUM_SHA256);
    if (!checksum) return Unavailable("checksum-unavailable");
    std::array<unsigned char,65536> bytes{};
    off_t offset = 0;
    while (offset < binding.file_stat.st_size) {
        if (Clock::now() >= deadline) { g_checksum_free(checksum); return Unavailable("timeout"); }
        ssize_t got = ::pread(binding.file_fd.value,bytes.data(),std::min<off_t>(bytes.size(),binding.file_stat.st_size-offset),offset);
        if (got < 0 && errno == EINTR) continue;
        if (got <= 0) { g_checksum_free(checksum); return Unavailable("read-error"); }
        g_checksum_update(checksum,bytes.data(),got); offset += got;
    }
    const bool matched = g_ascii_strcasecmp(g_checksum_get_string(checksum),segment.checksum_sha256.c_str()) == 0;
    g_checksum_free(checksum);
    if (Clock::now() >= deadline) return Unavailable("timeout");
    if (!matched) return Corrupt("checksum-mismatch","checksum-mismatch");
    return Demux(binding,segment,deadline);
}
#endif
} // namespace
MediaInspectionResult InspectRecordingMedia(const std::filesystem::path& root,
    const std::filesystem::path& relative, const RecordingSegmentV1& segment, MediaInspectionOptions options) {
#if MEDIA_SERVER_USE_GSTREAMER
    if (options.budget.count() <= 0 || options.budget > std::chrono::minutes(1)) return Unavailable("timeout");
    const auto deadline = Clock::now()+options.budget;
    Binding binding;
    if (!binding.Open(root,relative)) return Unavailable("unsafe-or-unavailable-path");
    auto result = Inspect(binding,segment,deadline);
    if (!binding.Unchanged()) return Unavailable("file-changed");
    if (Clock::now() >= deadline) return Unavailable("timeout");
    return result;
#else
    (void)root; (void)relative; (void)segment; (void)options;
    return Unavailable("gstreamer-unavailable");
#endif
}
MediaInspectionResult InspectAndMarkRecordingMedia(RecordingCatalog& catalog,
    const std::string& segment_id, MediaInspectionOptions options) {
#if MEDIA_SERVER_USE_GSTREAMER
    if (options.budget.count() <= 0 || options.budget > std::chrono::minutes(1)) return Unavailable("timeout");
    const auto deadline = Clock::now()+options.budget;
    const auto segment = catalog.FindSegmentById(segment_id);
    const auto location = catalog.FindSegmentMediaLocation(segment_id);
    if (!segment || !location || segment->lifecycle != RecordingLifecycle::Finalized) return Unavailable("catalog-not-finalized");
    Binding binding;
    if (!binding.Open(location->first,location->second)) return Unavailable("unsafe-or-unavailable-path");
    auto result = Inspect(binding,*segment,deadline);
    if (!binding.Unchanged()) return Unavailable("file-changed");
    if (Clock::now() >= deadline) return Unavailable("timeout");
    if (result.state != MediaInspectionState::Corrupt) return result;
    const auto current = catalog.FindSegmentById(segment_id);
    const auto current_location = catalog.FindSegmentMediaLocation(segment_id);
    if (!current || !current_location || SerializeRecordingSegmentV1(*current) != SerializeRecordingSegmentV1(*segment) ||
        *current_location != *location) return Unavailable("catalog-binding-changed");
    if (!binding.Unchanged()) return Unavailable("file-changed");
    if (Clock::now() >= deadline) return Unavailable("timeout");
    // 불변 metadata/path와 Mark의 잠금 내 state/hold/Pending 보호를 조합하며 장기 catalog 잠금은 없다.
    // 이 확인 이후 같은권한 비협력 외부 writer 변경을 원자적으로 막는다고 보장하지 않는다.
    result.applied = catalog.MarkSegmentCorrupt(segment_id,result.corruption_reason,&result.apply_error);
    return result;
#else
    (void)catalog; (void)segment_id; (void)options;
    return Unavailable("gstreamer-unavailable");
#endif
}
} // namespace recording
