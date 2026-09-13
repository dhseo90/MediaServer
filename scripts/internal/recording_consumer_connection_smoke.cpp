// 파일 용도: 실제 catalog와 opt-in 소비자의 저장 및 해석을 격리 검증한다.
#include "recording/recording_catalog.h"
#include "recording/analysis_observation_projector.h"
#include "recording/recording_read_service.h"
#include "recording/event_recording_bridge.h"
#include "analysis/frame_source_association.h"
#include <sqlite3.h>
#include <fstream>
#include <iostream>
#include <stdexcept>
using namespace recording;
namespace {
int passed = 0, failed = 0;
void Check(bool ok, const char* title) {
    std::cout << (ok ? "[pass] " : "[fail] ") << title << '\n';
    ok ? ++passed : ++failed;
}
void Require(bool ok, const std::string& error) {
    if (!ok) throw std::runtime_error(error);
}
std::string Bytes(const std::filesystem::path& path) {
    std::ifstream in(path, std::ios::binary);
    return {std::istreambuf_iterator<char>(in), {}};
}
bool Has(const std::vector<std::string>& values, const std::string& value) {
    return std::find(values.begin(), values.end(), value) != values.end();
}
struct Fixture {
    std::filesystem::path root;
    std::unique_ptr<RecordingJournal> journal;
    std::unique_ptr<RecordingCatalog> catalog;
    std::string error;
    explicit Fixture(std::filesystem::path value) : root(std::move(value)) { Open(true); }
    void Open(bool sql) {
        journal = std::make_unique<RecordingJournal>(RecordingJournal::ManagedOptions{root, "store-one"});
        Require(journal->Open(&error), error);
        RecordingCatalog::Options options(root / "recording-catalog.sqlite3", root, sql);
        options.enable_v2_storage = true;
        catalog = std::make_unique<RecordingCatalog>(*journal, options);
        Require(catalog->Open(&error), error);
    }
    void Reopen(bool sql) { catalog.reset(); journal.reset(); Open(sql); }
};
RecordingConsumerReferenceV1 Reference() {
    RecordingConsumerReferenceV1 r;
    r.reference_id = "reference-one"; r.owner_id = "owner-one"; r.kind = "observation";
    r.source_id = "source-one"; r.channel_id = "channel-one"; r.analysis_namespace = "namespace-one";
    r.analysis_track_id = "track-1"; r.association_quality = "timestamp-match";
    r.original = RecordingConsumerOriginalV1{"generation-one", 1, 5000, "video/0", 1000000000};
    r.created_at_ms = 5;
    return r;
}
AnalysisObservationV2 Observation(const RecordingConsumerReferenceV1& r) {
    AnalysisObservationV2 o;
    o.observation_id = r.owner_id; o.source_id = r.source_id; o.channel_id = r.channel_id;
    o.analysis_namespace = r.analysis_namespace; o.track_id = r.analysis_track_id; o.pts = r.analysis_pts;
    o.locator_reason = "unresolved"; o.class_label = "person"; o.confidence = 0.8;
    o.bbox = {0, 0, 0.5, 0.5}; o.selection_reasons = {"track-start"}; o.created_at_ms = 5;
    return o;
}
std::string SqlPair(const std::filesystem::path& path, const std::string& id) {
    sqlite3* db = nullptr; sqlite3_stmt* statement = nullptr; std::string result;
    if (sqlite3_open_v2(path.c_str(), &db, SQLITE_OPEN_READONLY, nullptr) == SQLITE_OK &&
        sqlite3_prepare_v2(db, "SELECT payload_json FROM recording_referenced_observations WHERE observation_id=?",
                          -1, &statement, nullptr) == SQLITE_OK) {
        sqlite3_bind_text(statement, 1, id.c_str(), -1, SQLITE_TRANSIENT);
        if (sqlite3_step(statement) == SQLITE_ROW)
            result = reinterpret_cast<const char*>(sqlite3_column_text(statement, 0));
    }
    sqlite3_finalize(statement); if (db) sqlite3_close(db);
    return result;
}
analysis::AnalysisResult Result(const std::string& ns, std::uint64_t ordinal = 1, std::int64_t pts = 10) {
    analysis::AnalysisResult r;
    r.pts = pts; r.observation_namespace = ns;
    r.observation_context.source_id = "source-one"; r.observation_context.channel_id = "channel-one";
    media::Packet packet; packet.track_id = "video/0";
    media::SampleObservation o;
    o.source_generation = "generation-one"; o.generation_order = 1; o.ordinal = ordinal; o.pts_ns = 0;
    packet.observation = o;
    analysis::TimestampAssociationHistory history; history.Append(pts, pts, packet);
    r.source_association = history.Resolve(pts);
    analysis::Track t; t.track_id = 1; t.first_seen_pts = 10; t.last_seen_pts = pts;
    t.detection.label = "person"; t.detection.score = 0.8; t.detection.box = {0, 0, 0.5, 0.5}; r.tracks = {t};
    return r;
}
std::vector<ReferencedObservationV1> InNamespace(Fixture& f, const std::string& ns) {
    auto rows = f.catalog->QueryReferencedObservations("channel-one");
    rows.erase(std::remove_if(rows.begin(), rows.end(), [&](const auto& p) {
        return p.observation.analysis_namespace != ns;
    }), rows.end());
    return rows;
}
void ProjectorCases(Fixture& f) {
    AnalysisObservationProjector::Options po; po.use_consumer_references = true;
    {
        AnalysisObservationProjector p(*f.catalog, po);
        p.OnEvent(Result("different", 1), "event-a", 1, "", "", "", "");
        p.OnEvent(Result("different", 2), "event-b", 1, "", "", "", ""); p.StopAndDrain();
    }
    auto rows = InNamespace(f, "different");
    Check(rows.size() == 2 && rows[0].observation.observation_id != rows[1].observation.observation_id &&
          rows[0].reference.original->ordinal != rows[1].reference.original->ordinal,
          "C404 다른 원본 동일PTS 구분");
    { AnalysisObservationProjector p(*f.catalog, po); p.OnResult(Result("producer")); p.StopAndDrain(); }
    rows = InNamespace(f, "producer");
    Check(rows.size() == 1 && rows[0].reference.original && rows[0].reference.original->ordinal == 1,
          "C406 실제 OnResult 원본 참조 저장");
    {
        AnalysisObservationProjector p(*f.catalog, po); p.OnResult(Result("forced", 1));
        p.OnEvent(Result("forced", 2, 11), "forced-event", 1, "zone-one", "", "rule-one", "scenario-one"); p.StopAndDrain();
    }
    rows = InNamespace(f, "forced");
    Check(rows.size() == 2 && std::any_of(rows.begin(), rows.end(), [](const auto& p) {
        return p.observation.pts == 11 && Has(p.observation.event_ids, "forced-event") && p.reference.original->ordinal == 2;
    }), "C407 OnEvent 강제 표본");
    {
        AnalysisObservationProjector p(*f.catalog, po); auto result = Result("ended", 1); p.OnResult(result);
        auto end = Result("ended", 99, 100); end.terminated_tracks = result.tracks; end.tracks.clear(); p.OnResult(end); p.StopAndDrain();
    }
    rows = InNamespace(f, "ended");
    Check(rows.size() == 1 && rows[0].reference.original->ordinal == 1 && rows[0].observation.pts == 10 &&
          Has(rows[0].observation.selection_reasons, "track-end"), "C408 종료track 과거참조 보존");
    {
        AnalysisObservationProjector p(*f.catalog, po); auto end = Result("missing", 99, 100);
        end.terminated_tracks = end.tracks; end.tracks.clear(); p.OnResult(end); p.StopAndDrain();
    }
    rows = InNamespace(f, "missing");
    Check(rows.size() == 1 && !rows[0].reference.original && rows[0].reference.association_quality == "unavailable",
          "C409 종료track 참조부재 unknown");
    po.max_queue = 2; po.max_tracks = 1;
    AnalysisObservationProjector sampling(*f.catalog, po); sampling.OnResult(Result("sampling", 1));
    auto conflicting = Result("sampling", 1);
    conflicting.tracks[0].detection.box.width = 0.25;
    sampling.OnEvent(conflicting, "conflicting-event", 1, "", "", "", "");
    sampling.OnResult(Result("sampling", 2, 11)); sampling.OnResult(Result("other-track", 1));
    sampling.StopAndDrain(); sampling.OnResult(Result("sampling", 3, 12));
    const auto status = sampling.GetStatus(); rows = InNamespace(f, "sampling");
    Check(rows.size() == 2 && status.queued == 0 && status.tracks == 0 && status.storage_errors == 0 &&
          status.critical_rejected >= 3 && InNamespace(f, "other-track").empty() &&
          std::none_of(rows.begin(), rows.end(), [](const auto& p) {
              return Has(p.observation.event_ids, "conflicting-event") || p.observation.bbox.width != 0.5;
          }), "C410 sampling·queue·StopAndDrain 회귀");
}
RecordingSegmentV2 AddBound(Fixture& f, const std::string& id, bool capped = false, bool non_ns = false) {
    RecordingSegmentV2 s;
    s.segment_id = id; s.source_id = "source-one"; s.channel_id = "channel-one";
    s.store_id = "store-one"; s.order_request_id = "order-" + id; s.media_epoch_id = "epoch-one";
    s.media_end_pts = non_ns ? 100 : 10000000000LL;
    if (non_ns) s.time_base_den = 10;
    s.container = "mp4"; s.video_codecs = {"h264"}; s.audio_omitted_reason = "source-no-audio";
    s.size_bytes = 12; s.checksum_sha256 = std::string(64, 'a'); s.created_at_ms = 1; s.finalized_at_ms = 2;
    s.mappings = {{"media-server.recording-utc-mapping.v1", "mapping-" + id, 0,
        s.media_end_pts, "unknown", {}, {}, {}, "clock-unavailable"}};
    RecordingOrderReservationV1 order;
    Require(f.journal->ReserveRecordingOrder(s.store_id, s.order_request_id, id, s.channel_id, &order, &f.error), f.error);
    s.order_sequence = order.sequence;
    RecordingSourceBindingV1 b;
    b.segment_id = id; b.source_id = s.source_id; b.channel_id = s.channel_id;
    b.store_id = s.store_id; b.media_epoch_id = s.media_epoch_id;
    b.source_generation = "generation-one"; b.generation_order = 1; b.track_id = "video/0";
    b.samples = {{5000, 1000000000}}; b.last_accepted_ordinal = 5000;
    if (capped) {
        b.samples.clear();
        for (std::uint64_t i = 1; i <= 4096; ++i) b.samples.push_back({i, i});
        b.index_complete = false; b.incomplete_reason = "sample-index-cap";
    }
    const auto path = f.root / (id + ".mp4");
    { std::ofstream out(path, std::ios::binary); out.write("\0\0\0\x0c" "ftypisom", 12); }
    Require(f.catalog->FinalizeBoundSegmentV2(s, b, path.string(), &f.error), f.error);
    return s; // 미디어 메타데이터 fixture: 디코딩/재생 가능성 검사가 아니다.
}
void ReadCases(Fixture& f) {
    AddBound(f, "one"); AddBound(f, "two", false, true); AddBound(f, "capped", true);
    const auto r = Reference(); std::string error;
    RecordingReadService read(*f.catalog); ConsumerReferenceResolution resolution;
    Require(read.ResolveConsumerReference(r, &resolution, &error), error);
    Check(resolution.exact.size() == 2 && resolution.unindexed.size() == 1 &&
          resolution.exact[0].location.candidates.size() == 1 && resolution.exact[1].location.candidates.size() == 1 &&
          resolution.exact[0].location.candidates[0].media_pts == 1000000000 &&
          resolution.exact[1].location.candidates[0].media_pts == 10,
          "C411 exact·미색인 복수 후보 보존");
    media::Packet packet; packet.track_id = "video/0"; media::SampleObservation observation;
    observation.source_generation = "generation-one"; observation.generation_order = 1; observation.ordinal = 1; observation.pts_ns = 0;
    packet.observation = observation; analysis::TimestampAssociationHistory history; history.Append(0, 0, packet);
    const auto nearest = history.Resolve(1);
    bool qualities = nearest.quality == analysis::SourceAssociationQuality::Nearest && !nearest.original;
    for (const std::string quality : {"nearest", "ambiguous", "unavailable"}) {
        auto unresolved = r; unresolved.association_quality = quality; unresolved.original.reset();
        RecordingConsumerReferenceV1 decoded;
        qualities = ParseRecordingConsumerReferenceV1(SerializeRecordingConsumerReferenceV1(unresolved), &decoded, &error) &&
            read.ResolveConsumerReference(decoded, &resolution, &error) && resolution.exact.empty() && resolution.unindexed.empty() &&
            resolution.reason == quality && qualities;
    }
    auto near_original = r; near_original.association_quality = "nearest";
    Check(qualities && read.ResolveConsumerReference(near_original, &resolution, &error) && resolution.exact.empty(),
          "C412 nearest/ambiguous/unavailable 미승격");
    Require(read.ResolveConsumerReference(r, &resolution, &error), error);
    const bool unknown = resolution.exact.size() == 2 && resolution.exact[0].location.has_unknown;
    Require(f.catalog->RequestDeletion("one", "continuous-capacity", &error), error);
    Require(f.catalog->MarkSegmentCorrupt("two", "checksum-mismatch", &error), error);
    Check(unknown && read.ResolveConsumerReference(r, &resolution, &error) && resolution.exact.empty() && resolution.unindexed.size() == 1,
          "C413 UTC unknown·삭제 상태 재판정");
}
struct NoDerive final : EventClipDeriver {
    int calls = 0;
    EventClipDeriveResult Derive(const EventClipDeriveRequest&) override { ++calls; return {}; }
};
std::string SqlReference(const std::filesystem::path& path, const std::string& id) {
    sqlite3* db = nullptr;
    sqlite3_stmt* statement = nullptr;
    std::string value;
    if (sqlite3_open_v2(path.c_str(), &db, SQLITE_OPEN_READONLY, nullptr) == SQLITE_OK &&
        sqlite3_prepare_v2(db, "SELECT payload_json FROM recording_consumer_references WHERE reference_id=?",
                          -1, &statement, nullptr) == SQLITE_OK) {
        sqlite3_bind_text(statement, 1, id.c_str(), -1, SQLITE_TRANSIENT);
        if (sqlite3_step(statement) == SQLITE_ROW)
            value = reinterpret_cast<const char*>(sqlite3_column_text(statement, 0));
    }
    sqlite3_finalize(statement);
    if (db) sqlite3_close(db);
    return value;
}
void EarlyRequestCases(Fixture& f) {
    NoDerive deriver;
    CatalogEventRecordingBridge::Options options;
    options.output_root = f.root / "early-clips";
    options.now_ms = [] { return 100; };
    options.use_consumer_references = true;
    options.resolve_recording_channel = [](const std::string&) {
        return std::optional<std::string>("channel-one");
    };
    std::vector<RecordingConsumerReferenceV1> expected;
    bool admitted = false, updates = false;
    {
        RetentionCoordinator retention(*f.catalog, [&] { return f.catalog->RetentionSnapshot(); },
            [](std::uint64_t* bytes, std::string*) { *bytes = 1000000; return true; }, {}, {});
        CatalogEventRecordingBridge bridge(*f.catalog, retention, deriver, options);
        auto result = Result("early-event-producer");
        analysis::EventRecord event;
        event.event_id = "early-event"; event.stream_id = "source-one";
        event.channel_id = "channel-one"; event.track_id = 1;
        event.time_basis = "media-pts-ms"; event.start_time_ms = 100; event.update_time_ms = 200;
        analysis::EventMediaHookOptions hook;
        hook.pre_event_ms = 5000; hook.post_event_ms = 3000;
        const auto response = bridge.TryResolve(result, event, hook);
        auto rows = f.catalog->QueryConsumerReferences("channel-one", "event", event.event_id);
        admitted = response.handled && response.error=="derived-service-not-configured" && response.completeness == "pending" &&
            !response.derived_clip_ready && response.clip_path.empty() && !response.derived_job_managed &&
            rows.size() == 1 && response.link_id==rows[0].reference_id && rows[0].request && rows[0].request->start_ms == 100 &&
            rows[0].request->end_ms == 200 && rows[0].request->pre_ms == 5000 &&
            rows[0].request->post_ms == 3000 && rows[0].request->time_basis == "media-pts-ms";
        const auto before_retry = Bytes(f.journal->path());
        const auto retry = bridge.TryResolve(result, event, hook);
        updates = admitted && retry.error=="derived-service-not-configured" && !retry.derived_job_managed && Bytes(f.journal->path()) == before_retry;
        event.update_time_ms = 300;
        const auto extended = bridge.TryResolve(result, event, hook);
        result.source_association.original->source_generation = "early-generation-two";
        result.source_association.original->generation_order = 2;
        result.source_association.original->pts_ns = 0;
        const auto reset = bridge.TryResolve(result, event, hook);
        expected = f.catalog->QueryConsumerReferences("channel-one", "event", event.event_id);
        bool first = false, extension = false, generation = false;
        for (const auto& row : expected) {
            if (!row.original || !row.request) continue;
            const bool request = row.request->start_ms == 100 && row.request->pre_ms == 5000 &&
                row.request->post_ms == 3000 && row.request->time_basis == "media-pts-ms";
            const bool identity = row.original->pts_ns == 0 && row.original->ordinal == 1 &&
                row.original->track_id == "video/0";
            first = first || (request && identity && row.original->source_generation == "generation-one" &&
                row.original->generation_order == 1 && row.request->end_ms == 200);
            extension = extension || (request && identity && row.original->source_generation == "generation-one" &&
                row.original->generation_order == 1 && row.request->end_ms == 300);
            generation = generation || (request && identity && row.original->source_generation == "early-generation-two" &&
                row.original->generation_order == 2 && row.request->end_ms == 300);
        }
        updates = updates && extended.error=="derived-service-not-configured" && reset.error=="derived-service-not-configured" &&
            !extended.derived_job_managed && !reset.derived_job_managed &&
            expected.size() == 3 && first && extension && generation;
        bridge.RecordFallback(event, response);
        bridge.StopAndDrain();
    }
    Check(admitted && deriver.calls == 0 && !std::filesystem::exists(options.output_root) &&
          f.catalog->ListEventLinks(EventRecordingLinkStatus::Pending).empty(),
          "C422 실제 bridge 초기 pre-roll 수락·pending 유지");
    Check(updates, "C423 초기 요청 멱등·갱신·generation 분리");
    const auto same = [&] {
        const auto actual = f.catalog->QueryConsumerReferences("channel-one", "event", "early-event");
        if (expected.size() != 3 || actual.size() != expected.size()) return false;
        for (const auto& row : expected) {
            const auto found = std::find_if(actual.begin(), actual.end(), [&](const auto& value) {
                return value.reference_id == row.reference_id;
            });
            if (found == actual.end() || SerializeRecordingConsumerReferenceV1(*found) !=
                SerializeRecordingConsumerReferenceV1(row)) return false;
        }
        return true;
    };
    const auto sql_same = [&] {
        if (expected.size() != 3) return false;
        for (const auto& row : expected)
            if (SqlReference(f.root / "recording-catalog.sqlite3", row.reference_id) !=
                SerializeRecordingConsumerReferenceV1(row)) return false;
        return true;
    };
    bool restored = sql_same();
    f.Reopen(false); restored = same() && restored;
    f.Reopen(true); restored = same() && sql_same() && restored;
    Check(restored, "C424 초기 요청 SQL·JSONL 복구");
    bool checkpoint = f.catalog->Checkpoint(&f.error);
    f.Reopen(false); checkpoint = same() && checkpoint;
    f.Reopen(true); checkpoint = same() && sql_same() && checkpoint;
    Check(checkpoint, "C425 초기 요청 checkpoint 복구");
}
void BridgeCases(Fixture& f) {
    RetentionCoordinator retention(*f.catalog, [&] { return f.catalog->RetentionSnapshot(); },
        [](std::uint64_t* bytes, std::string*) { *bytes = 1000000; return true; }, {}, {});
    NoDerive deriver; CatalogEventRecordingBridge::Options bo; bo.output_root = f.root / "clips";
    bo.now_ms = [] { return 100; }; bo.use_consumer_references = true;
    bo.resolve_recording_channel = [](const std::string& source) -> std::optional<std::string> {
        return source == "source-one" ? std::optional<std::string>("channel-one") : std::nullopt;
    };
    CatalogEventRecordingBridge bridge(*f.catalog, retention, deriver, bo);
    auto result = Result("event-producer"); analysis::EventRecord event;
    event.event_id = "event-owner"; event.stream_id = "source-one"; event.channel_id = "channel-one"; event.track_id = 1;
    event.time_basis = "media-pts-ms"; event.start_time_ms = 100; event.update_time_ms = 200;
    analysis::EventMediaHookOptions hook; hook.pre_event_ms = 10; hook.post_event_ms = 20;
    const auto response = bridge.TryResolve(result, event, hook);
    auto references = f.catalog->QueryConsumerReferences("channel-one", "event", event.event_id);
    Check(response.handled && response.error=="derived-service-not-configured" && !response.derived_job_managed &&
          references.size() == 1 && references[0].request && response.link_id==references[0].reference_id &&
          references[0].request->start_ms == 100 && references[0].request->end_ms == 200 &&
          references[0].request->pre_ms == 10 && references[0].request->post_ms == 20,
          "C414 실제 TryResolve 요청참조 저장");
    const auto event_bytes = Bytes(f.journal->path()); bridge.TryResolve(result, event, hook);
    bool updates = Bytes(f.journal->path()) == event_bytes;
    event.update_time_ms = 300; bridge.TryResolve(result, event, hook);
    result.source_association.original->source_generation = "generation-two"; bridge.TryResolve(result, event, hook);
    references = f.catalog->QueryConsumerReferences("channel-one", "event", event.event_id);
    Check(updates && references.size() == 3, "C415 event 재전달·확장·세대 구분");
    const auto safe_bytes = Bytes(f.journal->path()); auto bad_event = event; bad_event.channel_id = "other";
    bool scope = !bridge.TryResolve(result, bad_event, hook).error.empty(); bad_event = event; bad_event.stream_id = "other";
    scope = !bridge.TryResolve(result, bad_event, hook).error.empty() && scope;
    auto bad_result = result; bad_result.observation_context.source_id.clear();
    Check(scope && !bridge.TryResolve(bad_result, event, hook).error.empty() && Bytes(f.journal->path()) == safe_bytes,
          "C416 source/channel 충돌 거부");
    ConfirmedMediaInterval a{"source-one", "store-one", "epoch-one", "one", 1, 1000000000, 10, 30};
    auto b = a; b.start_pts = 20; b.end_pts = 40;
    auto intersection = IntersectConfirmedMediaIntervals(a, b);
    bool overlap = intersection && intersection->start_pts == 20 && intersection->end_pts == 30;
    for (int mode = 0; mode < 6; ++mode) {
        auto other = b;
        if (mode == 0) other.source_id = "other";
        if (mode == 1) other.store_id = "other";
        if (mode == 2) other.media_epoch_id = "other";
        if (mode == 3) other.segment_id = "other";
        if (mode == 4) other.time_base_den = 10;
        if (mode == 5) other.start_pts = other.end_pts;
        overlap = !IntersectConfirmedMediaIntervals(a, other) && overlap;
    }
    Check(overlap, "C417 같은 원본 미디어 교집합 우선");
    bridge.RecordFallback(event, response); bridge.StopAndDrain();
    Check(!response.derived_clip_ready && response.clip_path.empty() && !response.link_id.empty() && !response.derived_job_managed && response.completeness == "pending" &&
          deriver.calls == 0 && Bytes(f.journal->path()) == safe_bytes &&
          f.catalog->ListEventLinks(EventRecordingLinkStatus::Pending).empty(),
          "C418 공개 결과·구형 fallback 불변");
}
void StorageCases(Fixture& f) {
    auto r = Reference(); auto o = Observation(r); std::string error;
    const auto before = f.journal->Replay().mutations.size();
    Require(f.catalog->PutReferencedObservation(o, r, &error), error);
    Check(f.journal->Replay().mutations.size() == before + 1 &&
          f.catalog->QueryReferencedObservations(r.channel_id).size() == 1 &&
          f.catalog->QueryObservationsV2(r.channel_id).empty() &&
          f.catalog->QueryConsumerReferences(r.channel_id, "observation", r.owner_id).empty(),
          "C401 관측·참조 원자 저장");
    const auto original_bytes = Bytes(f.journal->path()); bool invalid = true;
    for (int mode = 0; mode < 8; ++mode) {
        auto wrong = r; auto metadata = o;
        if (mode == 0) wrong.owner_id = "other";
        if (mode == 1) wrong.source_id = "other";
        if (mode == 2) wrong.channel_id = "other";
        if (mode == 3) wrong.analysis_namespace = "other";
        if (mode == 4) wrong.analysis_track_id = "other";
        if (mode == 5) wrong.analysis_pts = 1;
        if (mode == 6) metadata.stream_epoch_id = "wrong-epoch";
        if (mode == 7) metadata.locator_reason = "gap";
        invalid = !f.catalog->PutReferencedObservation(metadata, wrong, &error) && invalid;
    }
    ReferencedObservationV1 parsed;
    const auto json = SerializeReferencedObservationV1({"media-server.referenced-observation.v1", o, r});
    invalid = invalid && !json.empty() &&
        !ParseReferencedObservationV1(std::string(2 * 1024 * 1024 + 1, ' '), &parsed, &error) &&
        !ParseReferencedObservationV1(json.substr(0, json.size() - 1) + ",\"extra\":0}", &parsed, &error) &&
        !ParseReferencedObservationV1(json.substr(0, json.size() - 1) + ",\"schema\":0}", &parsed, &error);
    const auto oversized_observation = "{" + std::string(1024 * 1024, ' ') +
        SerializeAnalysisObservationV2(o).substr(1);
    const auto oversized_reference = "{" + std::string(1024 * 1024, ' ') +
        SerializeRecordingConsumerReferenceV1(r).substr(1);
    const std::string prefix = "{\"schema\":\"media-server.referenced-observation.v1\",\"observation\":";
    invalid = !ParseReferencedObservationV1(prefix + oversized_observation + ",\"reference\":" +
        SerializeRecordingConsumerReferenceV1(r) + "}", &parsed, &error) && invalid;
    invalid = !ParseReferencedObservationV1(prefix + SerializeAnalysisObservationV2(o) + ",\"reference\":" +
        oversized_reference + "}", &parsed, &error) && invalid;
    Check(invalid && Bytes(f.journal->path()) == original_bytes, "C402 쌍 identity 불일치 거부");
    Require(f.catalog->PutReferencedObservation(o, r, &error), error);
    bool merged = Bytes(f.journal->path()) == original_bytes;
    auto update = o; update.selection_reasons = {"event"}; update.event_ids = {"event-one"}; update.created_at_ms = 9;
    auto retry = r; retry.created_at_ms = 9;
    Require(f.catalog->PutReferencedObservation(update, retry, &error), error);
    auto rows = f.catalog->QueryReferencedObservations(r.channel_id);
    merged = merged && rows.size() == 1 && rows[0].reference.created_at_ms == 5 &&
        rows[0].observation.created_at_ms == 5 && Has(rows[0].observation.event_ids, "event-one") &&
        Has(rows[0].observation.selection_reasons, "track-start");
    auto conflict = r; conflict.original->ordinal = 5001;
    const auto merged_bytes = Bytes(f.journal->path());
    Check(merged && !f.catalog->PutReferencedObservation(o, conflict, &error) &&
          Bytes(f.journal->path()) == merged_bytes, "C403 동일 원본 재전달·event 병합");
    // 정상 pair 다음 부분 update의 replay는 이전 event/selection/created_at을 보존해야 한다.
    f.catalog.reset();
    RecordingMutationV1 partial; partial.mutation_type = RecordingMutationType::ReferencedObservationPut;
    partial.mutation_id = "partial-observation-update";
    partial.entity_id = o.observation_id; update.event_ids = {"event-two"};
    partial.payload_json = SerializeReferencedObservationV1({"media-server.referenced-observation.v1", update, retry});
    Require(f.journal->Append(partial, &error), error);
    f.journal.reset(); f.Open(true);
    rows = f.catalog->QueryReferencedObservations(r.channel_id);
    Require(rows.size() == 1, "replay pair missing");
    const auto signature = SerializeReferencedObservationV1(rows[0]);
    bool parity = Has(rows[0].observation.event_ids, "event-one") && Has(rows[0].observation.event_ids, "event-two") &&
        rows[0].reference.created_at_ms == 5 && rows[0].observation.created_at_ms == 5 &&
        SqlPair(f.root / "recording-catalog.sqlite3", o.observation_id) == signature;
    Require(f.catalog->Checkpoint(&error), error); f.Reopen(false);
    rows = f.catalog->QueryReferencedObservations(r.channel_id);
    parity = parity && rows.size() == 1 && SerializeReferencedObservationV1(rows[0]) == signature;
    f.Reopen(true);
    Check(parity && SqlPair(f.root / "recording-catalog.sqlite3", o.observation_id) == signature,
          "C405 SQL·JSONL·checkpoint 쌍 복구");
}
}
int main(int argc, char** argv) {
    if (argc != 2) return 2;
    try {
        Fixture f(std::filesystem::path(argv[1]) / "store");
        StorageCases(f);
        ProjectorCases(f);
        ReadCases(f);
        BridgeCases(f);
        EarlyRequestCases(f);
    } catch (const std::exception& error) {
        std::cerr << "[setup-fail] " << error.what() << '\n'; return 2;
    }
    std::cout << "[summary] pass=" << passed << " fail=" << failed << '\n';
    return failed ? 1 : 0;
}
