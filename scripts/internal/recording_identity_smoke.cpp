// 파일 용도: S05 exact ID와 분리해 실제 stream key→녹화 channel 내구 접수 경계를 검증한다.
// 기존 fixture의 catalog/retention helper만 재사용하며 기존 main은 실행하지 않는다.
#define main ExistingS05Main
#include "event_recording_link_smoke.cpp"
#undef main
#include "recording/recording_session_service.h"
#include "app_config.h"

namespace identity_test {
std::mutex source_mu;
std::condition_variable source_cv;
bool source_entered = false;
bool source_released = false;
std::mutex writer_mu;
std::condition_variable writer_cv;
bool writer_entered = false;
bool writer_released = false;

class ControlledSource final : public core::SourceWorker {
public:
    explicit ControlledSource(media::SourceSpec spec) : spec_(std::move(spec)) {}
    const media::SourceSpec& source_spec() const override { return spec_; }
    bool Start(const std::shared_ptr<core::SharedStream>& stream, std::string* error) override {
        if (spec_.uri == "rtsp://127.0.0.1/fail") {
            if (error) *error = "시험 입력 시작 실패";
            return false;
        }
        if (spec_.uri == "rtsp://127.0.0.1/blocked") {
            std::unique_lock lock(source_mu);
            source_entered = true;
            source_cv.notify_all();
            if (!source_cv.wait_for(lock, std::chrono::seconds(2), [] { return source_released; })) {
                if (error) *error = "시험 입력 대기 제한 초과";
                return false;
            }
        }
        stream->SetDescriptor(media::StreamDescriptor{});
        running_ = true;
        return true;
    }
    bool IsRunning() const override { return running_; }
    void Stop() override { running_ = false; }
private:
    media::SourceSpec spec_;
    std::atomic<bool> running_{false};
};

// writer 미디어 파생은 기존 S05와 실제 서버에서 검증한다. 여기서는 시작 실패 경계만 통제한다.
class ControlledWriter final : public recording::SegmentWriter {
public:
    explicit ControlledWriter(bool fail, bool block = false) : fail_(fail), block_(block) {}
    bool Start(const std::string&, const std::string&, const media::StreamDescriptor&,
               FinalizedCallback, std::string*) override { return !fail_; }
    void Push(const media::Packet&, std::int64_t) override {
        if (!block_) return;
        std::unique_lock lock(writer_mu);
        writer_entered = true;
        writer_cv.notify_all();
        writer_cv.wait_for(lock, std::chrono::seconds(2), [] { return writer_released; });
    }
    void Stop() override {}
private:
    bool fail_;
    bool block_;
};

media::IngressRequest Request(const std::string& suffix) {
    media::IngressRequest request;
    request.path = "/" + app::GetAppConfig().stream_route;
    request.query = {{"source", "rtsp"}, {"url", "rtsp://127.0.0.1/" + suffix}};
    return request;
}

void Check(bool value, const std::string& id) {
    if (!value) throw std::runtime_error(id);
    std::cout << "[identity-pass] " << id << '\n';
}

void VerifySessions(recording::RecordingCatalog& catalog) {
    core::StreamRegistry registry;
    core::ResourceGuard guard(10, 10);
    core::SessionManager manager(registry, guard);
    recording::RecordingSessionService sessions(manager, catalog, [] {
        return std::make_unique<ControlledWriter>(false);
    });
    const std::string key = "rtsp::rtsp://127.0.0.1/identity";
    auto start = sessions.StartChannel("9101", "epoch-original", Request("identity"), true);
    Check(start.ok && sessions.ResolveRecordingChannel(key) == std::optional<std::string>("9101"),
          "V410-IDMAP-I08");
    start = sessions.StartChannel("9102", "epoch-other", Request("identity"), true);
    const bool ambiguous = !sessions.ResolveRecordingChannel(key).has_value();
    const bool stopped = sessions.StopChannel("9102");
    Check(start.ok && ambiguous && stopped &&
          sessions.ResolveRecordingChannel(key) == std::optional<std::string>("9101"),
          "V410-IDMAP-I09");

    auto pending = std::async(std::launch::async, [&] {
        return sessions.StartChannel("9103", "epoch-blocked", Request("blocked"), true);
    });
    bool entered;
    {
        std::unique_lock lock(source_mu);
        entered = source_cv.wait_for(lock, std::chrono::seconds(1), [] { return source_entered; });
    }
    const bool unpublished = !sessions.ResolveRecordingChannel("rtsp::rtsp://127.0.0.1/blocked");
    {
        std::lock_guard lock(source_mu);
        source_released = true;
        source_cv.notify_all();
    }
    const auto completed = pending.get();
    Check(entered && unpublished && completed.ok &&
          sessions.ResolveRecordingChannel("rtsp::rtsp://127.0.0.1/blocked") ==
              std::optional<std::string>("9103"), "V410-IDMAP-I10");
    const auto failed = sessions.StartChannel("9104", "epoch-fail", Request("fail"), true);
    const bool failed_absent = !sessions.ResolveRecordingChannel("rtsp::rtsp://127.0.0.1/fail");
    recording::RecordingSessionService failing_writer(manager, catalog, [] {
        return std::make_unique<ControlledWriter>(true);
    });
    const auto writer_start = failing_writer.StartChannel("9105", "epoch-writer", Request("writer"), true);
    auto handle = manager.AcquireAuxiliaryStream(Request("writer"));
    if (!handle.ok) throw std::runtime_error("writer 시험 stream 획득 실패");
    media::Packet packet;
    packet.kind = media::MediaKind::Video;
    packet.is_key_frame = true;
    handle.stream->FanOut(packet);
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(1);
    while (failing_writer.ResolveRecordingChannel("rtsp::rtsp://127.0.0.1/writer") &&
           std::chrono::steady_clock::now() < deadline) std::this_thread::yield();
    const bool writer_absent = !failing_writer.ResolveRecordingChannel("rtsp::rtsp://127.0.0.1/writer");
    manager.DiscardAuxiliaryStream(handle);
    failing_writer.StopAll();
    Check(!failed.ok && failed_absent && writer_start.ok && writer_absent, "V410-IDMAP-I11");
    const bool removed = sessions.StopChannel("9101");
    const bool absent = !sessions.ResolveRecordingChannel(key);
    sessions.StopAll();
    Check(removed && absent && !sessions.ResolveRecordingChannel("rtsp::rtsp://127.0.0.1/blocked") &&
          !sessions.StartChannel("9106", "later", Request("later"), true).ok,
          "V410-IDMAP-I12");

    recording::RecordingSessionService blocked_writer(manager, catalog, [] {
        return std::make_unique<ControlledWriter>(false, true);
    });
    const auto blocked_start = blocked_writer.StartChannel("9110", "epoch-io", Request("io"), true);
    auto io_handle = manager.AcquireAuxiliaryStream(Request("io"));
    if (!blocked_start.ok || !io_handle.ok) throw std::runtime_error("I13 입력 준비 실패");
    io_handle.stream->FanOut(packet);
    bool push_entered;
    {
        std::unique_lock lock(writer_mu);
        push_entered = writer_cv.wait_for(lock, std::chrono::seconds(1), [] { return writer_entered; });
    }
    auto lookup = std::async(std::launch::async, [&] {
        return blocked_writer.ResolveRecordingChannel("rtsp::rtsp://127.0.0.1/io");
    });
    const bool nonblocking = lookup.wait_for(std::chrono::milliseconds(100)) == std::future_status::ready;
    {
        std::lock_guard lock(writer_mu);
        writer_released = true;
        writer_cv.notify_all();
    }
    const auto mapped = lookup.get();
    manager.DiscardAuxiliaryStream(io_handle);
    blocked_writer.StopAll();
    Check(push_entered && nonblocking && mapped == std::optional<std::string>("9110"),
          "V410-IDMAP-I13");
}
}  // namespace identity_test

namespace core {
std::unique_ptr<SourceWorker> CreateSourceWorker(const media::SourceSpec& spec) {
    return std::make_unique<identity_test::ControlledSource>(spec);
}
}  // namespace core

int main(int argc, char** argv) {
    if (argc != 2) return 2;
    try {
        const std::filesystem::path root = argv[1];
        RecordingJournal journal(root / "identity.jsonl");
        std::string error;
        if (!journal.Open(&error)) throw std::runtime_error(error);
        RecordingCatalog catalog(journal, {root / "identity.sqlite3", root, true});
        if (!catalog.Open(&error)) throw std::runtime_error(error);
        RetentionCoordinator::Options retention_options;
        retention_options.media_root = root;
        RetentionCoordinator retention(catalog, [&] { return catalog.RetentionSnapshot(); },
            [](std::uint64_t* bytes, std::string*) { *bytes = 1ULL << 30; return true; },
            [&](const std::filesystem::path& p, std::string* e) {
                return recording::RemoveContainedMediaFile(root, p, e);
            }, retention_options);
        FakeDeriver deriver(nullptr);
        recording::CatalogEventRecordingBridge::Options options;
        options.output_root = root;
        options.now_ms = [] { return 10000; };
        std::optional<std::string> active_channel = "9101";
        std::string seen_key;
        options.resolve_recording_channel = [&](const std::string& key) {
            seen_key = key;
            return active_channel;
        };
        recording::CatalogEventRecordingBridge bridge(catalog, retention, deriver, options);
        auto event = MakePtsEvent("identity-event", "file::/isolated/input.mp4");
        event.time_anchor_utc_ms = 0;
        event.time_anchor_pts_ms = 0;
        event.stream_epoch_id = "";
        analysis::AnalysisResult result;
        result.source_key = "file::/isolated/input.mp4";
        analysis::EventMediaHookOptions media_options;
        const auto resolved = bridge.TryResolve(result, event, media_options);
        const auto link = catalog.FindEventLinkByEventId("identity-event");
        if (!link || link->source_id != "9101" || link->channel_id != "9101") {
            throw std::runtime_error("V410-IDMAP-I01: 숫자 channel의 신규 내구 link 없음: " + resolved.error);
        }
        identity_test::Check(resolved.handled, "V410-IDMAP-I01");
        identity_test::Check(event.stream_id == "file::/isolated/input.mp4" &&
            event.channel_id == "file::/isolated/input.mp4" && event.stream_epoch_id.empty() &&
            link->stream_epoch_id.empty(), "V410-IDMAP-I02");
        active_channel.reset();
        auto missing = event;
        missing.event_id = "identity-missing";
        const auto rejected = bridge.TryResolve(result, missing, media_options);
        active_channel = "";
        const auto empty_rejected = bridge.TryResolve(result, missing, media_options);
        identity_test::Check(!rejected.handled && !empty_rejected.handled &&
            !catalog.FindEventLinkByEventId(missing.event_id), "V410-IDMAP-I03");
        active_channel = "9101";
        auto preferred = event;
        preferred.event_id = "identity-record-key";
        result.source_key = "rtsp::rtsp://127.0.0.1/not-preferred";
        bool priority = bridge.TryResolve(result, preferred, media_options).handled &&
            seen_key == "file::/isolated/input.mp4";
        auto fallback = event;
        fallback.stream_id.clear();
        fallback.event_id = "identity-result-key";
        result.source_key = "rtsp::rtsp://127.0.0.1/result";
        priority = bridge.TryResolve(result, fallback, media_options).handled && priority &&
            seen_key == "rtsp::rtsp://127.0.0.1/result";
        fallback.event_id = "identity-channel-key";
        result.source_key.clear();
        priority = bridge.TryResolve(result, fallback, media_options).handled && priority &&
            seen_key == "file::/isolated/input.mp4";
        identity_test::Check(priority, "V410-IDMAP-I04");
        active_channel.reset();
        event.end_time_ms = 3300;
        const auto retry = bridge.TryResolve(result, event, media_options);
        const auto updated = catalog.FindEventLinkByEventId(event.event_id);
        identity_test::Check(retry.handled && updated && updated->channel_id == "9101" &&
            updated->media_pts_range_ms && updated->media_pts_range_ms->end_ms == 3300,
            "V410-IDMAP-I05");
        bridge.StopAndDrain();
        {
            recording::CatalogEventRecordingBridge restarted(catalog, retention, deriver, options);
            const auto recovered = restarted.TryResolve(result, event, media_options);
            identity_test::Check(recovered.handled && recovered.link_id == resolved.link_id,
                "V410-IDMAP-I06");
        }
        options.resolve_recording_channel = {};
        {
            recording::CatalogEventRecordingBridge legacy(catalog, retention, deriver, options);
            const auto numeric = MakePtsEvent("identity-legacy", "9101");
            identity_test::Check(legacy.TryResolve(result, numeric, media_options).handled,
                "V410-IDMAP-I07");
        }
        identity_test::VerifySessions(catalog);
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "[identity-fail] " << error.what() << '\n';
        return 1;
    }
}
