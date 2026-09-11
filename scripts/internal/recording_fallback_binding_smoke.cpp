// 파일 용도: 내부 identity 계약 시험. 합성 payload bytes는 demux 검증이 아니다.
#include "recording/event_recording_bridge.h"
#include "recording/recording_read_service.h"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <array>
#include <functional>
#include <sstream>

namespace {
int passed = 0;
void Check(bool ok, const std::string& text) {
    std::cout << (ok ? "[pass] " : "[fail] ") << text << std::endl;
    if (!ok) throw std::runtime_error(text);
    ++passed;
}
class UnusedDeriver final : public recording::EventClipDeriver {
    recording::EventClipDeriveResult Derive(const recording::EventClipDeriveRequest&) override {
        throw std::runtime_error("unexpected deriver call");
    }
};
std::string Read(const std::filesystem::path& file) {
    std::ifstream input(file);
    return {std::istreambuf_iterator<char>(input), std::istreambuf_iterator<char>()};
}
void Write(const std::filesystem::path& file, const std::string& value) {
    std::ofstream output(file); output << value;
    if (!output) throw std::runtime_error("fixture write failed");
}
std::string Replace(std::string text, const std::string& from, const std::string& to) {
    const auto at = text.find(from);
    if (at == std::string::npos) throw std::runtime_error("fixture replacement absent");
    text.replace(at, from.size(), to);
    return text;
}
bool StoredRead(const std::filesystem::path& root, const std::filesystem::path& event_root,
                const recording::EventRecordingLinkV1& link, bool duplicate = false) {
    std::filesystem::create_directories(root / "media");
    recording::RecordingJournal journal(root / "journal.jsonl");
    std::string error;
    if (!journal.Open(&error)) throw std::runtime_error(error);
    recording::RecordingCatalog catalog(journal, {root / "index.sqlite", root / "media", false});
    if (!catalog.Open(&error) || !catalog.PutEventLink(link, &error)) throw std::runtime_error(error);
    if (duplicate) {
        auto second = link; second.link_id += "-second"; second.event_id += "-second";
        if (!catalog.PutEventLink(second, &error)) throw std::runtime_error(error);
    }
    recording::RecordingReadService reader(catalog, event_root);
    return static_cast<bool>(reader.ResolveMedia(link.channel_id, *link.fallback_evidence_id));
}
void Run(const std::filesystem::path& root, bool basic) {
    std::filesystem::create_directories(root / "media");
    std::filesystem::create_directories(root / "events");
    const auto manifest = root / "events/manifest.json";
    const auto media = root / "events/media.webm";
    { std::ofstream out(media); out << "0123456789"; }
    { std::ofstream out(manifest);
      out << "{\"schema\":\"media-server.va.event-clip-hook.v1\",\"eventId\":\"event-one\","
          << "\"streamId\":\"raw-stream\",\"channelId\":\"raw-channel\",\"encodedClip\":{"
          << "\"schema\":\"media-server.encoded-event-clip-contract.v1\",\"status\":\"completed\","
          << "\"format\":\"webm\",\"contentType\":\"video/webm\",\"codec\":\"vp8\",\"byteSize\":10,"
          << "\"mediaPath\":\"" << media.string() << "\"}}"; }
    recording::RecordingJournal journal(root / "journal.jsonl");
    std::string error;
    Check(journal.Open(&error), "BF01 journal open");
    recording::RecordingCatalog catalog(journal, {root / "index.sqlite", root / "media", false});
    Check(catalog.Open(&error), "BF01 catalog open");
    recording::RetentionCoordinator::Options retention_options;
    retention_options.media_root = root / "media";
    recording::RetentionCoordinator retention(catalog, [&] { return catalog.RetentionSnapshot(); },
        [](std::uint64_t* free, std::string*) { *free = 1000000; return true; },
        [](const std::filesystem::path&, std::string*) { return false; }, retention_options);
    UnusedDeriver deriver;
    recording::CatalogEventRecordingBridge::Options options;
    options.output_root = root / "media";
    options.now_ms = [] { return 1000; };
    std::optional<std::string> mapping = "9101";
    std::string resolver_key;
    options.resolve_recording_channel = [&](const std::string& key) -> std::optional<std::string> {
        resolver_key = key;
        return mapping;
    };
    recording::CatalogEventRecordingBridge bridge(catalog, retention, deriver, options);
    analysis::EventRecord record;
    record.event_id = "event-one";
    record.stream_id = "raw-stream";
    record.channel_id = "raw-channel";
    record.time_basis = "utc-ms";
    record.start_time_ms = 100000;
    record.update_time_ms = 101000;
    record.clip_path = manifest.string();
    const auto previous = bridge.TryResolve({}, record, {});
    Check(previous.handled, "BF01 actual bridge resolves numeric catalog link");
    bridge.RecordFallback(record, previous);
    bridge.StopAndDrain();
    const auto link = catalog.FindEventLinkByEventId(record.event_id);
    Check(link && link->fallback_evidence_id, "BF01 actual fallback durable");
    recording::RecordingReadService reader(catalog, root / "events");
    Check(static_cast<bool>(reader.ResolveMedia("9101", *link->fallback_evidence_id)),
          "BF01 mapped bridge catalog reader playable");
    if (basic) return;
    const auto original_manifest = Read(manifest);
    const auto original_link = *link;
    const auto id = *link->fallback_evidence_id;
    Check(id.rfind("fallback-bound-v1-", 0) == 0 && id.size() == 82 && recording::ValidateOpaqueId(id, nullptr), "BF02 opaque bound prefix length alphabet");
    Check(recording::BoundRecordingFallbackId("evt-test", "link-test", "9101", "9101", "file::sample.mp4", "file::sample.mp4") ==
        "fallback-bound-v1-2aa12ad414db07ecd365fde2c23009bf177ab73787732e7581568d36df6d77ff", "BF02 independent fixed Node vector");
    Check(recording::BoundRecordingFallbackId("evt", "link", "src", "ch", "ab", "c") !=
          recording::BoundRecordingFallbackId("evt", "link", "src", "ch", "a", "bc"), "BF02 length prefix split ambiguity rejected");
    Check(recording::BoundRecordingFallbackId("evt", "link", "src", "ch", u8"영상", "channel") ==
          "fallback-bound-v1-0d487cb09635e14becbca30e34c873503843419d255c8b46f9fdc3ca5e42738d",
          "BF09 independent UTF8 byte-length fixed vector");
    const std::array<std::pair<std::string, std::string>, 3> raw_changes{{
        {"event-one", "event-other"}, {"raw-stream", "other-stream"}, {"raw-channel", "other-channel"}}};
    for (const auto& change : raw_changes) {
        Write(manifest, Replace(original_manifest, change.first, change.second));
        Check(!reader.ResolveMedia("9101", id), "BF03 manifest field rejects " + change.first);
    }
    Write(manifest, original_manifest);
    const std::array<std::string, 4> fields{"source", "channel", "link", "hash"};
    for (const auto& field : fields) {
        auto changed = original_link;
        if (field == "source") changed.source_id = "source-other";
        if (field == "channel") changed.channel_id = "channel-other";
        if (field == "link") changed.link_id = "link-other";
        if (field == "hash") changed.fallback_evidence_id->back() = id.back() == '0' ? '1' : '0';
        Check(!StoredRead(root / field, root / "events", changed), "BF03 stored field rejects " + field);
    }
    for (const auto& malformed : {std::string("fallback-bound-"), std::string("fallback-bound-v1-abc"),
         std::string("fallback-bound-v2-") + std::string(64, 'a'), std::string("fallback-bound-v1-") + std::string(64, 'A')}) {
        auto changed = original_link; changed.source_id = "raw-stream"; changed.channel_id = "raw-channel";
        changed.fallback_evidence_id = malformed;
        Check(!StoredRead(root / ("malformed-" + std::to_string(passed)), root / "events", changed), "BF04 malformed reserved namespace no legacy downgrade " + malformed);
    }
    Check(!reader.ResolveMedia("other-channel", id), "BF08 wrong caller channel denied");
    Check(!StoredRead(root / "duplicate", root / "events", original_link, true), "BF08 duplicate fallback identity denied");
    for (const auto& change : std::array<std::pair<std::string, std::string>, 3>{{
        {"\"streamId\":\"raw-stream\"", "\"streamId\":42"},
        {"\"channelId\":\"raw-channel\"", "\"channelId\":null"},
        {"\"byteSize\":10", "\"byteSize\":11"}}}) {
        Write(manifest, Replace(original_manifest, change.first, change.second));
        Check(!reader.ResolveMedia("9101", id), "BF08 manifest type or actual size denied " + change.first);
    }
    Write(manifest, std::string(65537, 'x'));
    Check(!reader.ResolveMedia("9101", id), "BF08 oversized manifest denied");
    Write(manifest, original_manifest);
    std::filesystem::rename(media, root / "events/actual.webm");
    std::filesystem::create_symlink(root / "events/actual.webm", media);
    Check(!reader.ResolveMedia("9101", id), "BF08 symlink media denied");
    std::filesystem::remove(media);
    std::filesystem::rename(root / "events/actual.webm", media);
    const auto journal_before = Read(root / "journal.jsonl");
    mapping.reset();
    bridge.RecordFallback(record, previous);
    Check(Read(root / "journal.jsonl") == journal_before, "BF05 resolver unavailable no append ID locator preserved");
    mapping = "9201";
    bridge.RecordFallback(record, previous);
    Check(Read(root / "journal.jsonl") == journal_before, "BF05 resolver changed channel no append ID locator preserved");
    mapping = "9101";
    auto other = record; other.channel_id = "other-raw-channel";
    bridge.RecordFallback(other, previous);
    Check(Read(root / "journal.jsonl") == journal_before, "BF05 bound identity replacement denied no append");
    bridge.RecordFallback(record, previous);
    const auto repeated = catalog.FindEventLinkByEventId(record.event_id);
    Check(repeated && repeated->fallback_evidence_id == link->fallback_evidence_id && repeated->fallback_media_locator == link->fallback_media_locator,
          "BF06 repeated RecordFallback stable ID locator");
    auto malformed_bound = original_link; malformed_bound.fallback_evidence_id = "fallback-bound-v2-abc";
    Check(catalog.PutEventLink(malformed_bound, &error), "BF04 malformed reserved fixture stored");
    const auto malformed_bytes = Read(root / "journal.jsonl");
    bridge.RecordFallback(record, previous);
    Check(Read(root / "journal.jsonl") == malformed_bytes, "BF04 malformed bound writer cannot downgrade or overwrite");
    auto other_source = original_link; other_source.source_id = "source-other";
    Check(catalog.PutEventLink(other_source, &error), "BF05 source mismatch fixture stored");
    const auto other_source_bytes = Read(root / "journal.jsonl");
    bridge.RecordFallback(record, previous);
    Check(Read(root / "journal.jsonl") == other_source_bytes, "BF05 resolver catalog source mismatch no append");
    Check(catalog.PutEventLink(original_link, &error), "BF05 original mapping restored");
    auto legacy = original_link; legacy.fallback_evidence_id = "legacy-fallback";
    Check(!StoredRead(root / "legacy-mismatch", root / "events", legacy), "BF07 legacy raw numeric mismatch denied");
    legacy.source_id = "raw-stream"; legacy.channel_id = "raw-channel";
    Check(StoredRead(root / "legacy-exact", root / "events", legacy), "BF07 legacy exact identity playable");
    auto old = original_link; old.fallback_evidence_id = "legacy-existing";
    Check(catalog.PutEventLink(old, &error), "BF06 legacy fixture stored");
    const auto old_bytes = Read(root / "journal.jsonl");
    bridge.RecordFallback(record, previous);
    Check(Read(root / "journal.jsonl") == old_bytes, "BF06 existing legacy not auto promoted");
    Check(catalog.PutEventLink(original_link, &error), "BF01 restore bound link for reopen");
    recording::RecordingJournal reopened_journal(root / "journal.jsonl");
    Check(reopened_journal.Open(&error), "BF01 reopen journal");
    recording::RecordingCatalog reopened(reopened_journal, {root / "reopen.sqlite", root / "media", false});
    Check(reopened.Open(&error), "BF01 reopen catalog");
    recording::RecordingReadService reopened_reader(reopened, root / "events");
    Check(static_cast<bool>(reopened_reader.ResolveMedia("9101", id)), "BF01 reopened bound playable without active resolver");
    auto empty_stream = record; empty_stream.event_id = "empty-stream-event"; empty_stream.stream_id.clear();
    const auto empty_previous = bridge.TryResolve({}, empty_stream, {});
    Check(empty_previous.handled, "BF09 empty raw stream mapped via raw channel");
    bridge.RecordFallback(empty_stream, empty_previous);
    const auto empty_link = catalog.FindEventLinkByEventId(empty_stream.event_id);
    Check(resolver_key == "raw-channel" && empty_link && empty_link->fallback_evidence_id &&
          recording::IsBoundRecordingFallbackNamespace(*empty_link->fallback_evidence_id), "BF09 actual issuer raw-channel resolver key");
    Write(manifest, Replace(Replace(original_manifest, "event-one", "empty-stream-event"), "\"streamId\":\"raw-stream\"", "\"streamId\":\"\""));
    Check(static_cast<bool>(reader.ResolveMedia("9101", *empty_link->fallback_evidence_id)), "BF09 empty raw stream bound reader positive");
    Write(manifest, original_manifest);
    auto exact_options = options;
    exact_options.resolve_recording_channel = {};
    recording::CatalogEventRecordingBridge exact_bridge(catalog, retention, deriver, exact_options);
    auto exact_record = record; exact_record.event_id = "exact-event";
    const auto exact_previous = exact_bridge.TryResolve({}, exact_record, {});
    Check(exact_previous.handled, "BF07 resolver absent exact link created");
    exact_bridge.RecordFallback(exact_record, exact_previous);
    exact_bridge.StopAndDrain();
    const auto exact = catalog.FindEventLinkByEventId(exact_record.event_id);
    Check(exact && exact->fallback_evidence_id && !recording::IsBoundRecordingFallbackNamespace(*exact->fallback_evidence_id),
          "BF07 resolver absent issues only legacy exact ID");
    Write(manifest, Replace(original_manifest, "event-one", "exact-event"));
    Check(static_cast<bool>(reader.ResolveMedia("raw-channel", *exact->fallback_evidence_id)), "BF07 resolver absent legacy exact reader positive");
    const auto exact_before = Read(root / "journal.jsonl");
    auto wrong_exact = exact_record; wrong_exact.stream_id = "different-stream";
    exact_bridge.RecordFallback(wrong_exact, exact_previous);
    Check(Read(root / "journal.jsonl") == exact_before, "BF07 resolver absent mismatched update preserves journal");
    Write(manifest, original_manifest);
    Check(!recording::BoundRecordingFallbackId("evt", "link", "src", "ch", "", "raw-channel").empty(), "BF09 empty raw stream allowed");
    for (std::size_t i : {0U, 1U, 2U, 3U, 5U}) {
        std::array<std::string, 6> values{"evt", "link", "src", "ch", "raw-stream", "raw-channel"};
        values[i].clear();
        Check(recording::BoundRecordingFallbackId(values[0], values[1], values[2], values[3], values[4], values[5]).empty(), "BF09 required empty field denied " + std::to_string(i));
    }
}
void NoSsl(const std::filesystem::path& root) {
    std::filesystem::create_directories(root / "events");
    const auto media = root / "events/media.webm", manifest = root / "events/manifest.json";
    Write(media, "0123456789");
    Write(manifest, "{\"schema\":\"media-server.va.event-clip-hook.v1\",\"eventId\":\"evt-test\","
        "\"streamId\":\"file::sample.mp4\",\"channelId\":\"file::sample.mp4\",\"encodedClip\":{"
        "\"schema\":\"media-server.encoded-event-clip-contract.v1\",\"status\":\"completed\","
        "\"format\":\"webm\",\"contentType\":\"video/webm\",\"codec\":\"vp8\",\"byteSize\":10,"
        "\"mediaPath\":\"" + media.string() + "\"}}");
    recording::EventRecordingLinkV1 link;
    link.event_id = "evt-test"; link.link_id = "link-test";
    link.source_id = "9101"; link.channel_id = "9101";
    link.time_basis = "utc-ms"; link.requested_range = recording::UtcRangeV1{1000, 2000};
    link.created_at_ms = 1000; link.updated_at_ms = 1000;
    link.status = recording::EventRecordingLinkStatus::Pending;
    link.fallback_media_locator = manifest.string();
    link.fallback_evidence_id = "fallback-bound-v1-2aa12ad414db07ecd365fde2c23009bf177ab73787732e7581568d36df6d77ff";
    Check(recording::BoundRecordingFallbackId("evt-test", "link-test", "9101", "9101", "file::sample.mp4", "file::sample.mp4").empty(), "BF04 noSSL helper unavailable");
    Check(!StoredRead(root / "bound", root / "events", link), "BF04 noSSL independently valid bound ID denied");
    link.source_id = "raw-stream"; link.channel_id = "raw-channel"; link.fallback_evidence_id = "legacy-no-ssl";
    Write(manifest, Replace(Replace(Read(manifest), "\"streamId\":\"file::sample.mp4\"", "\"streamId\":\"raw-stream\""),
        "\"channelId\":\"file::sample.mp4\"", "\"channelId\":\"raw-channel\""));
    Check(StoredRead(root / "legacy", root / "events", link), "BF07 noSSL legacy exact reader preserved");
}
}
int main(int argc, char** argv) {
    try {
        if (argc != 3) throw std::runtime_error("root and mode required");
        if (std::string(argv[2]) == "--nossl") NoSsl(argv[1]);
        else Run(argv[1], std::string(argv[2]) == "--red");
        std::cout << "[summary] pass=" << passed << " fail=0\n";
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "[summary] pass=" << passed << " fail=1 error=" << e.what() << '\n';
        return 1;
    }
}
