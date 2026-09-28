// 파일 용도: 실제 file source, recorder, decoder/tracker, production projector의 통합 oracle.
// 시험 전용 계측이며 공개 schema나 제품 hook을 추가하지 않는다.
#include "analysis/analysis_session_service.h"
#include "analysis/event_storage.h"
#include "app_config.h"
#include "ingress/analysis_rule_application_service.h"
#include "ingress/webrtc_http_analysis_rule_declarations.h"
#include "recording/analysis_observation_projector.h"
#include "recording/gstreamer_segment_writer.h"
#include "recording/recording_supervisor.h"
#include <gst/gst.h>
#include <openssl/evp.h>
#include <algorithm>
#include <chrono>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <limits>
#include <sstream>
#include <thread>
#ifdef __APPLE__
#include <mach/mach.h>
#else
#include <unistd.h>
#endif

namespace fs = std::filesystem;
using namespace recording;
namespace {
int failures = 0, checks = 0;
void Check(bool ok, const std::string& name) {
    ++checks;
    if (!ok) ++failures;
    std::cout << (ok ? "[pass] " : "[fail] ") << name << std::endl;
}
bool Single(std::size_t streams, std::size_t workers, std::size_t recorders,
            std::size_t subscribers) {
    return streams == 1 && workers == 1 && recorders == 1 && subscribers == 1;
}
bool Empty(std::size_t streams, std::size_t workers, std::size_t recorders,
           std::size_t subscribers) {
    return streams == 0 && workers == 0 && recorders == 0 && subscribers == 0;
}
bool Locator(const AnalysisObservationV2& o, const RecordingSegmentV1& s) {
    return o.frame_locator && o.frame_locator->segment_id == s.segment_id &&
        o.source_id == s.source_id && o.channel_id == s.channel_id &&
        o.stream_epoch_id == s.stream_epoch_id && o.pts >= s.start.pts && o.pts < s.end.pts &&
        o.frame_locator->frame.pts == o.pts &&
        o.frame_locator->frame.utc_ms == s.start.utc_ms + (o.pts - s.start.pts) / 1000000;
}
void Negative() {
    Check(Single(1, 1, 1, 1), "RT08 normal single oracle");
    Check(!Single(2, 2, 1, 1), "RT08 duplicate worker rejected");
    Check(!Single(1, 1, 2, 2), "RT08 duplicate recorder rejected");
    Check(Empty(0, 0, 0, 0), "RT08 normal empty oracle");
    Check(!Empty(0, 0, 0, 1), "RT08 remaining subscriber rejected");
    RecordingSegmentV1 s;
    s.segment_id = "segment-literal"; s.source_id = "source-literal";
    s.channel_id = "channel-literal"; s.stream_epoch_id = "epoch-literal";
    s.start = {1000, 0, 1, 1000000000}; s.end = {2000, 1000000000, 1, 1000000000};
    AnalysisObservationV2 o;
    o.source_id = "source-literal"; o.channel_id = "channel-literal";
    o.stream_epoch_id = "epoch-literal"; o.pts = 500000000;
    FrameLocatorV1 f; f.segment_id = "segment-literal";
    f.frame = {1500, 500000000, 1, 1000000000}; o.frame_locator = f;
    Check(Locator(o, s), "RT08 literal PTS500ms UTC1500 accepted");
    auto changed = o; changed.stream_epoch_id = "wrong-epoch";
    Check(!Locator(changed, s), "RT08 wrong epoch rejected");
    changed = o; changed.pts = 1000000000; changed.frame_locator->frame = s.end;
    Check(!Locator(changed, s), "RT08 half-open end rejected");
    changed = o; changed.frame_locator->frame.utc_ms = 1501;
    Check(!Locator(changed, s), "RT08 wrong UTC rejected");
}
std::string Sha(const fs::path& path) {
    std::ifstream input(path, std::ios::binary);
    auto* context = EVP_MD_CTX_new();
    if (!input || !context) { if (context) EVP_MD_CTX_free(context); return {}; }
    bool ok = EVP_DigestInit_ex(context, EVP_sha256(), nullptr) == 1;
    char bytes[65536];
    while (input && ok) {
        input.read(bytes, sizeof(bytes));
        if (input.gcount()) ok = EVP_DigestUpdate(context, bytes, input.gcount()) == 1;
    }
    unsigned char digest[EVP_MAX_MD_SIZE]; unsigned int size = 0;
    ok = ok && input.eof() && EVP_DigestFinal_ex(context, digest, &size) == 1;
    EVP_MD_CTX_free(context);
    if (!ok) return {};
    std::ostringstream out;
    for (unsigned int i = 0; i < size; ++i)
        out << std::hex << std::setfill('0') << std::setw(2) << static_cast<unsigned>(digest[i]);
    return out.str();
}
struct Metrics { long threads{-1}, fds{-1}; std::uint64_t rss{0}; };
Metrics Measure() {
    Metrics m;
#ifdef __APPLE__
    thread_act_array_t threads = nullptr; mach_msg_type_number_t count = 0;
    if (task_threads(mach_task_self(), &threads, &count) == KERN_SUCCESS) {
        m.threads = count;
        for (mach_msg_type_number_t i = 0; i < count; ++i)
            mach_port_deallocate(mach_task_self(), threads[i]);
        vm_deallocate(mach_task_self(), reinterpret_cast<vm_address_t>(threads), count * sizeof(thread_t));
    }
    mach_task_basic_info_data_t info{}; count = MACH_TASK_BASIC_INFO_COUNT;
    if (task_info(mach_task_self(), MACH_TASK_BASIC_INFO, reinterpret_cast<task_info_t>(&info), &count) == KERN_SUCCESS)
        m.rss = info.resident_size;
    const fs::path fd_path = "/dev/fd";
#else
    m.threads = std::distance(fs::directory_iterator("/proc/self/task"), fs::directory_iterator());
    std::ifstream statm("/proc/self/statm"); std::uint64_t total = 0, resident = 0;
    if (statm >> total >> resident) m.rss = resident * sysconf(_SC_PAGESIZE);
    statm.close();
    const fs::path fd_path = "/proc/self/fd";
#endif
    // directory iterator 자체의 FD 한 개를 제외한 현재 프로세스 값.
    m.fds = std::distance(fs::directory_iterator(fd_path), fs::directory_iterator()) - 1;
    return m;
}
void PrintMetrics(const std::string& phase, const Metrics& m) {
    std::cout << "[measure] " << phase << " threads=" << m.threads << " fd=" << m.fds
              << " rss_bytes=" << m.rss << " rss_verdict=not-assessed" << std::endl;
}
template<class F> bool Wait(F predicate) {
    const auto end = std::chrono::steady_clock::now() + std::chrono::seconds(20);
    do {
        if (predicate()) return true;
        std::this_thread::sleep_for(std::chrono::milliseconds(50));
    } while (std::chrono::steady_clock::now() < end);
    return false;
}
struct ScopeCleanup {
    std::function<void()> action;
    ~ScopeCleanup() noexcept {
        try { action(); }
        catch (...) {
            std::cerr << "[fail] RT09 cleanup exception; process failclosed" << std::endl;
            std::_Exit(1);
        }
    }
};
void Run(int iteration, const fs::path& root, const fs::path& repo, bool fail_after_source) {
    const auto label = "cycle" + std::to_string(iteration) + " ";
    const auto media_root = root / ("archive-" + std::to_string(iteration));
    fs::create_directories(media_root);
    RecordingJournal journal(media_root / "mutations.jsonl"); std::string error;
    const auto journal_ok = journal.Open(&error);
    Check(journal_ok, label + "journal open");
    if (!journal_ok) { std::cout << "[not-run] remaining cycle: journal prerequisite\n"; return; }
    RecordingCatalog catalog(journal, {media_root / "catalog.sqlite3", media_root, true});
    const auto catalog_ok = catalog.Open(&error);
    Check(catalog_ok, label + "catalog open");
    if (!catalog_ok) { std::cout << "[not-run] remaining cycle: catalog prerequisite\n"; return; }
    core::StreamRegistry registry; core::ResourceGuard guard(8, 8);
    core::SessionManager manager(registry, guard);
    RetentionCoordinator::Options retention_options; retention_options.media_root = media_root;
    RetentionCoordinator retention(catalog, [&] { return catalog.RetentionSnapshot(); },
        [&](std::uint64_t* bytes, std::string*) { *bytes = fs::space(media_root).available; return true; },
        [&](const fs::path& p, std::string* e) { return RemoveContainedMediaFile(media_root, p, e); },
        retention_options);
    RecordingSessionService sessions(manager, catalog, [&] {
        GStreamerSegmentWriter::Options options(media_root, 1000);
        options.admit_segment = [&](const auto& channel, auto minimum) {
            const auto now = std::chrono::duration_cast<std::chrono::milliseconds>(
                std::chrono::system_clock::now().time_since_epoch()).count();
            const auto a = retention.AdmitContinuousWrite(channel, minimum, now);
            return SegmentAdmissionDecision{a.allowed, a.start_new_epoch, a.reserved_bytes};
        };
        options.report_segment_progress = [&](const auto& channel, auto bytes) {
            retention.UpdateContinuousWriteProgress(channel, bytes);
        };
        options.complete_segment = [&](const auto& channel, auto bytes) { retention.CompleteContinuousWrite(channel, bytes); };
        return std::make_unique<GStreamerSegmentWriter>(options);
    });
    AnalysisObservationProjector::Options projector_options; projector_options.interval_ms = 250;
    projector_options.resolve_context = [&](const std::string& key, std::int64_t pts) {
        analysis::AnalysisObservationContext c;
        if (const auto mapping = sessions.ResolveRecordingTime(key, pts)) {
            c.source_id = mapping->channel_id; c.channel_id = mapping->channel_id;
            c.stream_epoch_id = mapping->stream_epoch_id; c.locator_reason = "pending";
        } else if (const auto channel = sessions.ResolveRecordingChannel(key)) {
            c.source_id = *channel; c.channel_id = *channel;
        }
        return c;
    };
    auto projector = std::make_shared<AnalysisObservationProjector>(catalog, projector_options);
    sessions.SetFinalizedObserver([weak = std::weak_ptr<AnalysisObservationProjector>(projector)] {
        if (auto p = weak.lock()) p->NotifyFinalized();
    });
    analysis::AnalysisSessionService analysis_sessions(manager, projector);
    manager.SetAuxiliaryStreamRuntimeProvider([&] { return analysis_sessions.AuxiliaryStreamRuntimeSnapshot(); });
    auto& sources = ingress::SourceViewApplicationService::Instance();
    const auto created = sources.UpsertSource("9101", R"({"sourceId":"9101","displayName":"Foundation local","kind":"file","file":"identity.mp4","enabled":true,"recording":{"enabled":true,"continuousMaxBytes":268435456,"continuousMaxAgeMs":3600000,"eventMaxBytes":268435456,"eventMaxAgeMs":3600000,"revision":1}})");
    Check(created.status >= 200 && created.status < 300, label + "RT01 source opt-in persisted");
    if (created.status < 200 || created.status >= 300) {
        std::cout << "[not-run] remaining cycle: source prerequisite status=" << created.status << '\n';
        return;
    }
    core::RecordingRuntimeConfigData config; config.recording_enabled = true;
    config.recording_retention_interval_ms = 10000;
    RecordingSupervisor supervisor(config, sources, sessions, retention);
    std::vector<std::pair<core::StreamKey, std::shared_ptr<core::SharedStream>>> streams;
    bool cleaned = false;
    const auto cleanup = [&] {
        if (cleaned) return;
        supervisor.Stop();
        analysis_sessions.Shutdown();
        sessions.SetFinalizedObserver({});
        projector->StopAndDrain();
        // 마지막 File lease가 예약한 detached cleanup의 마지막 owner 접근까지 기다린다.
        if (!Wait([&] { return registry.ActiveStreamCount() == 0 && guard.ActiveStreams() == 0; })) {
            std::cerr << "[fail] " << label << "RT09 idle cleanup timeout; process failclosed" << std::endl;
            std::_Exit(1);
        }
        std::size_t workers = 0, subscribers = 0;
        for (const auto& item : streams) {
            workers += item.second->IsSourceRunning();
            subscribers += item.second->TotalSubscriberCount();
        }
        Check(Empty(registry.ActiveStreamCount(), workers, sessions.ActiveChannelCount(), subscribers) &&
            guard.ActiveStreams() == 0 && analysis_sessions.ActiveAnalysisTapCount() == 0,
            label + "RT09 common cleanup all owners zero");
        std::cout << "[cleanup-owners] " << label << "registry=" << registry.ActiveStreamCount()
            << " resource=" << guard.ActiveStreams() << " workers=" << workers
            << " recorder=" << sessions.ActiveChannelCount() << " subscribers=" << subscribers
            << " analysis=" << analysis_sessions.ActiveAnalysisTapCount() << std::endl;
        cleaned = true;
    };
    ScopeCleanup cleanup_guard{cleanup};
    const bool started = supervisor.Start(&error);
    Check(started, label + "RT01 supervisor start");
    if (!started) { std::cout << "[not-run] remaining cycle: supervisor prerequisite\n"; return; }
    streams = registry.Snapshot();
    const auto workers = std::count_if(streams.begin(), streams.end(), [](const auto& item) { return item.second->IsSourceRunning(); });
    const auto count = manager.GetRuntimeStateSnapshot();
    const auto egress = manager.SourceEgressStatsSnapshot();
    Check(Single(count.registry_active_streams, workers, sessions.ActiveChannelCount(),
        egress.size() == 1 ? egress.front().recording_subscriber_count : 99) &&
        count.resource_active_streams == 1 && count.active_recording_channels == 1,
        label + "RT01 exact one source worker stream recorder subscriber");
    if (streams.size() != 1 || workers != 1 || sessions.ActiveChannelCount() != 1) {
        std::cout << "[not-run] remaining cycle: single source prerequisite\n"; return;
    }
    if (fail_after_source) {
        Check(false, label + "RT09 intentional failure after actual source start");
        std::cout << "[not-run] analysis/locator/repeats: intentional early return" << std::endl;
        return;
    }
    for (int i = 0; i < 3; ++i) supervisor.ReconcileNow();
    media::IngressRequest request; request.protocol = "http";
    request.path = "/" + app::GetAppConfig().stream_route; request.query["file"] = "identity.mp4";
    analysis::AnalysisProfile profile; profile.detector_type = "yolo";
    profile.model_path = (repo / "models/yolo11n.onnx").string();
    profile.labels_path = (repo / "models/coco.names").string();
    profile.enable_tracking = true; profile.target_fps = 8; profile.confidence_threshold = .25;
    profile.max_frame_age_ms = 5000; profile.adaptive_tuning_enabled = false;
    const auto attached = analysis_sessions.AttachAnalysisTap(request, profile);
    Check(attached.ok, label + "RT04 actual decoder detector tracker attached");
    if (!attached.ok) {
        std::cout << "[not-run] remaining cycle: analysis prerequisite " << attached.message << '\n';
        return;
    }
    const auto together = manager.GetRuntimeStateSnapshot();
    const auto joined = manager.SourceEgressStatsSnapshot();
    Check(together.registry_active_streams == 1 && together.resource_active_streams == 1 &&
        together.active_recording_channels == 1 && together.active_analysis_taps == 1 &&
        sessions.ActiveChannelCount() == 1 && joined.size() == 1 &&
        joined.front().recording_subscriber_count == 1 && joined.front().analysis_tap_count == 1 &&
        registry.Snapshot().size() == 1 && registry.Snapshot().front().second == streams.front().second,
        label + "RT02 reconcile and analysis share original worker");
    bool seen_detections = false, seen_tracks = false, seen_context = false;
    const bool observed = Wait([&] {
        if (const auto latest = analysis_sessions.AnalysisLatestFrameAndResult(attached.tap_id)) {
            if (latest->result) {
                const auto& r = *latest->result;
                seen_detections |= !r.detections.empty();
                seen_tracks |= !r.tracks.empty();
                seen_context |= r.observation_context.source_id == "9101" &&
                    r.observation_context.channel_id == "9101" && !r.observation_context.stream_epoch_id.empty();
            }
        }
        const auto observations = catalog.QueryObservationsV2("9101");
        return seen_detections && seen_tracks && seen_context &&
            std::any_of(observations.begin(), observations.end(), [](const auto& o) { return o.frame_locator.has_value(); });
    });
    std::cout << "[diagnostic] " << label << "seenPositiveDetections=" << seen_detections
        << " seenPositiveTracks=" << seen_tracks << " seenValidContext=" << seen_context << std::endl;
    Check(observed, label + "RT04 production projector durable locator exists");
    if (const auto tap = analysis_sessions.AnalysisTapSnapshot(attached.tap_id)) {
        std::cout << "[diagnostic] " << label << "detector=" << tap->detector_type
            << " tracking=" << tap->tracking_enabled << " packets=" << tap->received_video_packets
            << " decoded=" << tap->decoded_frames << " analyzed=" << tap->analyzed_packets
            << " decoder_errors=" << tap->decoder_errors << std::endl;
    }
    if (const auto latest = analysis_sessions.AnalysisLatestFrameAndResult(attached.tap_id)) {
        std::cout << "[diagnostic] " << label << "latest result=" << latest->result.has_value() << std::endl;
        if (latest->result) {
            const auto& r = *latest->result;
            std::cout << "[diagnostic] " << label << "detections=" << r.detections.size()
                << " tracks=" << r.tracks.size() << " source=" << r.observation_context.source_id
                << " channel=" << r.observation_context.channel_id << " epoch=" << r.observation_context.stream_epoch_id
                << " namespace=" << r.observation_namespace << " reason=" << r.observation_context.locator_reason
                << " pts=" << r.pts << std::endl;
        }
    }
    const auto before_stop = projector->GetStatus();
    std::cout << "[diagnostic] " << label << "projector stored=" << before_stop.stored
        << " queued=" << before_stop.queued << " tracks=" << before_stop.tracks
        << " pending=" << before_stop.pending << " errors=" << before_stop.storage_errors
        << " rejected=" << before_stop.critical_rejected << std::endl;
    for (const auto& o : catalog.QueryObservationsV2("9101")) {
        std::cout << "[diagnostic] " << label << "observation=" << o.observation_id
            << " reason=" << o.locator_reason << " epoch=" << o.stream_epoch_id << " pts=" << o.pts << std::endl;
    }
    cleanup();
    Check(cleaned, label + "RT06 file idle grace cleanup finished");
    const auto observations = catalog.QueryObservationsV2("9101");
    const auto segments = catalog.QuerySegments("9101", 0, std::numeric_limits<std::int64_t>::max());
    Check(!segments.empty(), label + "RT03 actual source finalized segment exists");
    std::size_t valid_segments = 0;
    for (const auto& s : segments) {
        const auto path = catalog.FindSegmentMediaPath(s.segment_id);
        const bool valid = ValidateRecordingSegmentV1(s, &error) && s.source_id == "9101" &&
            s.channel_id == "9101" && !s.stream_epoch_id.empty() && s.start.utc_ms > 0 &&
            s.end.utc_ms > s.start.utc_ms && s.end.pts > s.start.pts && path &&
            fs::file_size(*path) == s.size_bytes && Sha(*path) == s.checksum_sha256;
        Check(valid, label + "RT03 bytes SHA UTC PTS " + s.segment_id);
        if (valid) ++valid_segments;
    }
    std::size_t located = 0;
    for (const auto& o : observations) {
        if (!o.frame_locator) continue;
        const auto s = std::find_if(segments.begin(), segments.end(), [&](const auto& segment) {
            return segment.segment_id == o.frame_locator->segment_id;
        });
        Check(s != segments.end() && Locator(o, *s), label + "RT05 identity half-open UTC " + o.observation_id);
        ++located;
    }
    Check(located > 0 && valid_segments > 0, label + "RT04 nonempty real tracks and media");
    const auto stopped = manager.GetRuntimeStateSnapshot();
    std::size_t live_workers = 0, subscribers = 0;
    for (const auto& item : streams) {
        live_workers += item.second->IsSourceRunning(); subscribers += item.second->TotalSubscriberCount();
    }
    Check(Empty(stopped.registry_active_streams, live_workers, sessions.ActiveChannelCount(), subscribers) &&
        stopped.resource_active_streams == 0 && stopped.active_recording_channels == 0 &&
        stopped.active_analysis_taps == 0 && analysis_sessions.ActiveAnalysisTapCount() == 0,
        label + "RT06 all runtime owners and held stream stopped");
    const auto status = projector->GetStatus();
    Check(status.queued == 0 && status.storage_errors == 0 && status.critical_rejected == 0,
        label + "RT06 projector drained without storage rejection");
    std::size_t leftovers = 0;
    for (const auto& item : fs::recursive_directory_iterator(media_root)) {
        const auto name = item.path().filename().string();
        if (name.find(".partial") != std::string::npos || name.find(".ready") != std::string::npos ||
            name.find("cleanup") != std::string::npos) ++leftovers;
    }
    Check(leftovers == 0, label + "RT06 no partial ready cleanup marker");
}
}  // namespace
int main(int argc, char** argv) {
    if (argc == 2 && std::string(argv[1]) == "--oracle-negative") {
        Negative();
    } else if (argc == 3 || (argc == 4 && std::string(argv[3]) == "--fail-after-source")) {
        const fs::path root = fs::canonical(argv[1]), repo = fs::canonical(argv[2]);
        gst_init(nullptr, nullptr);
        // 실제 HTTP composition과 동일한 backend를 결속하지만 HTTP 서버는 시작하지 않는다.
        std::string error;
        const bool bound = ingress::ConfigureAnalysisRuleApplicationService({
            &ingress::WebRtcHttpAnalysisProfileDocumentsSnapshotBackend,
            &ingress::WebRtcHttpAnalysisRuleDocumentsSnapshotBackend,
            &ingress::WebRtcHttpVideoAnalysisRuleDocumentsSnapshotBackend,
            &ingress::ApplyWebRtcHttpVideoAnalysisRuleToQueryBackend}, &error);
        Check(bound, "RT04 production analysis registry binding");
        if (!bound) return 1;
        PrintMetrics("before-warmup", Measure());
        for (int i = 0; i < 4; ++i) {
            const int before = failures;
            try {
                Run(i, root, repo, argc == 4);
            } catch (const std::exception& e) {
                Check(false, std::string("RT09 runtime exception after scope cleanup: ") + e.what());
            }
            const auto m = Measure(); PrintMetrics(i == 0 ? "warmup-stop" : "repeat-stop-" + std::to_string(i), m);
            Check(m.threads > 0 && m.fds >= 0 && m.rss > 0, "RT07 supported process measurements " + std::to_string(i));
            if (failures != before) break;
        }
        analysis::StopEventStorage();
    } else {
        std::cerr << "usage: runtime --oracle-negative | ROOT REPO [--fail-after-source]\n"; return 2;
    }
    std::cout << "S09 runtime checks=" << checks << " failures=" << failures << std::endl;
    return failures ? 1 : 0;
}
