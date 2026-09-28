// 파일 용도: S06 실제 catalog를 이용한 조회 투영 회귀. 미디어 재생 검증과 구분한다.
#include "recording/recording_read_service.h"
#include "ingress/recording_application_service.h"
#include "ingress/recording_request_gate.h"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <limits>
#include <unistd.h>
#include <future>
#include <chrono>
#include <fcntl.h>
#include <cerrno>
#include <cstdlib>
#if RECORDING_HTTP_SEED
#include <openssl/evp.h>
#include <array>
#include <iomanip>
#include <sstream>
#endif

namespace {
#if RECORDING_HTTP_SEED
// HTTP 실미디어 fixture만 실제 바이트 SHA256을 사용한다. 합성 read-model 계약은 유지한다.
std::string FixtureSha256(const std::filesystem::path& file) {
    std::ifstream input(file, std::ios::binary);
    EVP_MD_CTX* context = EVP_MD_CTX_new();
    if (!input || !context) { EVP_MD_CTX_free(context); return {}; }
    bool ok = EVP_DigestInit_ex(context, EVP_sha256(), nullptr) == 1;
    std::array<char, 65536> chunk{};
    while (ok && input) {
        input.read(chunk.data(), chunk.size());
        if (input.gcount() > 0)
            ok = EVP_DigestUpdate(context, chunk.data(), static_cast<std::size_t>(input.gcount())) == 1;
    }
    unsigned char digest[EVP_MAX_MD_SIZE]{};
    unsigned int length = 0;
    ok = ok && input.eof() && EVP_DigestFinal_ex(context, digest, &length) == 1 && length == 32;
    EVP_MD_CTX_free(context);
    if (!ok) return {};
    std::ostringstream result;
    for (unsigned int i = 0; i < length; ++i)
        result << std::hex << std::setfill('0') << std::setw(2) << static_cast<unsigned int>(digest[i]);
    return result.str();
}
// 실제 HTTP Range byte 대조용: 제품 journal API로 생성하며 원본 sample을 복사한다.
int SeedHttp(const std::filesystem::path& root, const std::filesystem::path& input, bool ui = false) {
    std::int64_t anchor = 0;
    if (ui) {
        if (const char* raw = std::getenv("MEDIA_SERVER_VERIFY_RECORDING_UI_ANCHOR_UTC_MS")) {
            const std::string value(raw);
            if (value.empty() || value.find_first_not_of("0123456789") != std::string::npos) return 2;
            try { anchor = std::stoll(value); } catch (...) { return 2; }
            if (anchor < 946684800000LL || anchor > 4102444800000LL) return 2;
        }
    }
    std::filesystem::path event_input = input;
    if (ui && anchor != 0) {
        if (const char* raw = std::getenv("MEDIA_SERVER_VERIFY_RECORDING_UI_EVENT_MEDIA")) {
            const std::filesystem::path candidate(raw);
            const auto expected = std::filesystem::weakly_canonical(root.parent_path()) / "input/seek-event.mp4";
            if (candidate != expected || std::filesystem::is_symlink(candidate) ||
                !std::filesystem::is_regular_file(candidate) || std::filesystem::canonical(candidate) != expected ||
                std::filesystem::file_size(candidate) == 0 || std::filesystem::file_size(candidate) > 16 * 1024 * 1024) return 2;
            event_input = candidate;
        }
    }
    std::filesystem::create_directories(root / "channel-1");
    recording::RecordingJournal journal(root / "recording-mutations.jsonl");
    recording::RecordingCatalog catalog(journal, {root / "recording-catalog.sqlite3", root, true});
    std::string error;
    if (!journal.Open(&error) || !catalog.Open(&error)) return 2;
    for (const auto& id : {"http-continuous", "http-event"}) {
        const auto file = root / "channel-1" / (std::string(id) + ".mp4");
        std::filesystem::copy_file(std::string(id) == "http-event" ? event_input : input, file);
        recording::RecordingSegmentV1 segment;
        segment.segment_id = id; segment.source_id = "1"; segment.channel_id = "1";
        segment.stream_epoch_id = "http-epoch";
        segment.start = {anchor + 1000, 0, 1, 1000000000}; segment.end = {anchor + 10000, 9000000000, 1, 1000000000};
        segment.container = "mp4"; segment.video_codecs = {"h264"};
        segment.audio_omitted_reason = "source-no-audio";
        segment.size_bytes = std::filesystem::file_size(file);
        segment.checksum_sha256 = FixtureSha256(file);
        if (segment.checksum_sha256.empty()) return 2;
        segment.retention_class = std::string(id) == "http-event" ? recording::RecordingRetentionClass::Event : recording::RecordingRetentionClass::Continuous;
        segment.lifecycle = recording::RecordingLifecycle::Finalized;
        segment.created_at_ms = anchor + 1000; segment.finalized_at_ms = anchor + 10000;
        if (!catalog.FinalizeSegment(segment, file.string(), &error)) return 2;
    }
    recording::EventRecordingLinkV1 link;
    link.link_id = "http-link"; link.event_id = "http-event-id";
    link.source_id = "1"; link.channel_id = "1"; link.stream_epoch_id = "http-epoch";
    link.time_basis = "utc-ms"; link.requested_range = recording::UtcRangeV1{anchor + 2000, anchor + 8000};
    link.derived_actual_range = recording::UtcRangeV1{anchor + 1000, anchor + 10000};
    link.ordered_overlaps = {{"http-continuous", {anchor + 2000, anchor + 8000}}}; link.derived_segment_id = "http-event";
    link.status = recording::EventRecordingLinkStatus::Complete;
    link.created_at_ms = anchor + 10000; link.updated_at_ms = anchor + 10000;
    if (!catalog.PutEventLink(link, &error)) return 2;
    if (ui) {
        const auto baseline = catalog.FindSegmentById("http-continuous");
        if (!baseline) return 2;
        for (int index = 0; index < 101; ++index) {
            auto extra = *baseline;
            extra.segment_id = index == 0 ? "ui-partial" : index == 1 ? "ui-short-source" : "ui-page-" + std::to_string(index);
            extra.retention_class = index == 0 ? recording::RecordingRetentionClass::Event : recording::RecordingRetentionClass::Continuous;
            if (index == 1) extra.end = {anchor + 4000, 3000000000, 1, 1000000000};
            const auto target = root / "channel-1" / (extra.segment_id + ".mp4");
            std::filesystem::copy_file(input, target);
            if (!catalog.FinalizeSegment(extra, target.string(), &error)) {
                std::cerr << "UI segment fixture 실패: " << error << '\n'; return 2;
            }
        }
        auto partial = link;
        partial.link_id = "ui-partial-link"; partial.event_id = "ui-partial-event";
        partial.derived_segment_id = "ui-partial";
        partial.status = recording::EventRecordingLinkStatus::Partial;
        partial.ordered_overlaps = {{"ui-short-source", {anchor + 2000, anchor + 4000}}};
        partial.missing_ranges = {{anchor + 4000, anchor + 8000}};
        if (!catalog.PutEventLink(partial, &error)) {
            std::cerr << "UI partial fixture 실패: " << error << '\n'; return 2;
        }
        recording::EventRecordingLinkV1 missing;
        missing.link_id = "ui-missing-link"; missing.event_id = "ui-missing-event";
        missing.source_id = "1"; missing.channel_id = "1";
        missing.requested_range = recording::UtcRangeV1{anchor + 2000, anchor + 8000};
        missing.time_basis = "utc-ms"; missing.status = recording::EventRecordingLinkStatus::Failed;
        missing.fallback_evidence_id = "ui-missing";
        missing.fallback_media_locator = (root.parent_path() / "events/clips/ui-missing.json").string();
        missing.created_at_ms = anchor + 10000; missing.updated_at_ms = anchor + 10000;
        if (!catalog.PutEventLink(missing, &error)) {
            std::cerr << "UI missing fixture 실패: " << error << '\n'; return 2;
        }
        if (anchor != 0) {
            const auto fail_seed = [](const char* stage) {
                std::cerr << "[seed-failure] " << stage << '\n'; return 2;
            };
            for (const std::string id : {"ui-corrupt", "ui-deleted"}) {
                auto segment = *baseline;
                segment.segment_id = id;
                segment.retention_class = recording::RecordingRetentionClass::Event;
                const auto media = root / "channel-1" / (id + ".mp4");
                std::filesystem::copy_file(input, media);
                if (!catalog.FinalizeSegment(segment, media.string(), &error)) return fail_seed("finalize");
                auto event = link;
                event.link_id = id + "-link"; event.event_id = id + "-event";
                event.derived_segment_id = id;
                if (id == "ui-deleted") {
                    event.fallback_evidence_id = id;
                    event.fallback_media_locator = (root.parent_path() / "events/clips/ui-deleted.json").string();
                }
                if (!catalog.PutEventLink(event, &error)) {
                    std::cerr << "[seed-failure] anchored-event-link\n"; return 2;
                }
                if (id == "ui-corrupt") {
                    std::ofstream damaged(media, std::ios::binary | std::ios::app);
                    damaged.put('\0'); damaged.close();
                    if (!damaged) return fail_seed("damage-media");
                    if (!catalog.MarkSegmentCorrupt(id, "checksum-mismatch", &error)) return fail_seed("mark-corrupt");
                } else {
                    recording::RecordingTombstoneV1 tombstone;
                    tombstone.tombstone_id = "ui-deleted-tombstone";
                    tombstone.segment_id = id; tombstone.source_id = "1"; tombstone.channel_id = "1";
                    tombstone.recorded_range = {segment.start.utc_ms, segment.end.utc_ms};
                    tombstone.checksum_sha256 = segment.checksum_sha256;
                    tombstone.retention_class = segment.retention_class;
                    tombstone.deletion_reason = "ui-fixture-delete";
                    tombstone.deleted_at_ms = anchor + 11000;
                    if (!catalog.RequestDeletion(id, tombstone.deletion_reason, &error)) return fail_seed("request-delete");
                    if (!std::filesystem::remove(media)) return fail_seed("remove-deleted-media");
                    if (!catalog.CompleteDeletion(tombstone, &error)) return fail_seed("complete-delete");
                }
            }
            auto pending = missing;
            pending.link_id = "ui-incomplete-link"; pending.event_id = "ui-incomplete-event";
            pending.status = recording::EventRecordingLinkStatus::Pending;
            pending.fallback_evidence_id = "ui-incomplete";
            pending.fallback_media_locator = (root.parent_path() / "events/clips/ui-incomplete.json").string();
            if (!catalog.PutEventLink(pending, &error)) return fail_seed("pending-link");
            recording::RecordingReadService reader(catalog, root.parent_path() / "events/clips");
            recording::RecordingTimelineResult timeline;
            if (!reader.QueryTimeline({"1", anchor + 1000, anchor + 10000, 0, 1000}, &timeline, &error)) return fail_seed("timeline-query");
            for (const std::string id : {"ui-corrupt", "ui-deleted"}) {
                bool found = false;
                for (const auto& item : timeline.items) {
                    if (item.event_id == id + "-event") {
                        found = true;
                        if (item.playable) return fail_seed("unexpected-playable");
                    }
                }
                if (!found) return fail_seed(id == "ui-corrupt" ? "missing-corrupt-event" : "missing-deleted-event");
                if (reader.ResolveMedia("1", id)) return fail_seed("unexpected-media");
            }
            std::cout << "[seed-check] anchored corrupt/deleted media blocked; incomplete event retained\n";
        }
    }
    return 0;
}
#endif
}  // namespace

int main(int argc, char** argv) {
#if RECORDING_HTTP_SEED
    if (argc == 4 && (std::string(argv[2]) == "--seed-http" || std::string(argv[2]) == "--seed-ui"))
        return SeedHttp(argv[1], argv[3], std::string(argv[2]) == "--seed-ui");
#endif
    if (argc != 2 && argc != 3) return 2;
    const bool sqlite = argc == 3 && std::string(argv[2]) == "--sqlite";
    const std::filesystem::path root(argv[1]);
    std::filesystem::create_directories(root / "media");
    const auto media = root / "media" / "segment.mp4";
    { std::ofstream out(media, std::ios::binary); out << "0000ftypisom"; }
    recording::RecordingJournal journal(root / "journal.jsonl");
    recording::RecordingCatalog catalog(journal, {root / "catalog.db", root / "media", sqlite});
    std::string error;
    if (!journal.Open(&error) || !catalog.Open(&error)) {
        std::cerr << "환경 초기화 실패: " << error << '\n'; return 2;
    }
    if (catalog.catalog_mode() != (sqlite ? "sqlite-primary" : "jsonl-fallback")) {
        std::cerr << "fixture catalog mode 불일치\n"; return 2;
    }
    recording::RecordingSegmentV1 segment;
    segment.segment_id = "seg-one";
    segment.source_id = "source-one";
    segment.channel_id = "channel-one";
    segment.stream_epoch_id = "epoch-one";
    segment.start = {1000, 0, 1, 1000000000};
    segment.end = {2000, 1000000000, 1, 1000000000};
    segment.container = "mp4";
    segment.video_codecs = {"h264"};
    segment.audio_omitted_reason = "source-no-audio";
    segment.size_bytes = 12;
    segment.checksum_sha256 = std::string(64, 'a');
    segment.lifecycle = recording::RecordingLifecycle::Finalized;
    segment.created_at_ms = 1000;
    segment.finalized_at_ms = 2000;
    if (!catalog.FinalizeSegment(segment, media.string(), &error)) {
        std::cerr << "fixture 실패: " << error << '\n'; return 2;
    }
    recording::RecordingReadService reader(catalog, root / "events");
    recording::RecordingTimelineResult result;
    const bool ok = reader.QueryTimeline({"channel-one", 1000, 2000, 0, 100}, &result, &error);
    if (!ok || result.items.size() != 1 || result.items[0].segment_id != "seg-one") {
        std::cerr << "[fail] V410-S06-I03 event/continuous timeline item을 구성하지 못함\n";
        return 1;
    }
    std::cout << "[pass] V410-S06-I03 catalog timeline item 반환\n";
    if (!result.items[0].playable) {
        std::cerr << "[fail] V410-S06-I09 finalized regular media가 재생 불가\n";
        return 1;
    }
    int failures = 0;
    auto expect = [&](bool condition, const char* label) {
        std::cout << (condition ? "[pass] " : "[fail] ") << label << '\n';
        if (!condition) ++failures;
    };
    expect(result.items[0].playback_url == "/ops/api/recordings/media/seg-one", "I09 opaque 재생 URL");
    expect(reader.QueryTimeline({"channel-one", 2000, 3000}, &result, &error) && result.total == 0,
           "I03 끝 경계 인접 제외");
    expect(reader.QueryTimeline({"channel-two", 1000, 2000}, &result, &error) && result.total == 0,
           "I03 다른 채널 제외");
    expect(!reader.QueryTimeline({"channel-one", -1, 2000}, &result, &error), "I04 음수 시간 거부");
    expect(!reader.QueryTimeline({"channel-one", 2000, 1000}, &result, &error), "I04 역전 시간 거부");
    expect(!reader.QueryTimeline({"channel-one", 1000, 2000, 0, 0}, &result, &error), "I04 빈 페이지 제한 거부");
    expect(!reader.QueryTimeline({"channel-one", 1000, 2000, 0, 1001}, &result, &error), "I04 과대 페이지 거부");
    expect(reader.QueryTimeline({"channel-one", 1000, 2000, std::numeric_limits<std::size_t>::max(), 100}, &result, &error)
           && result.total == 1 && result.items.empty(), "I05 큰 offset overflow 없이 빈 페이지");
    expect(!reader.ResolveMedia("channel-two", "seg-one"), "I16 다른 채널 media 거부");
    expect(!reader.ResolveMedia("channel-one", "../seg-one"), "I17 경로형 ID 거부");
    auto lease = reader.ResolveMedia("channel-one", "seg-one");
    expect(lease && lease->size_bytes() == 12 && lease->content_type() == "video/mp4", "I09 fd 크기 MIME 확인");
    expect(!catalog.RequestDeletion("seg-one", "quota", &error), "I25 재생 hold 중 삭제 거부");
    std::filesystem::rename(media, root / "original.mp4");
    { std::ofstream out(media); out << "replacement!"; }
    char bytes[12]{};
    expect(lease && ::pread(lease->fd(), bytes, 12, 0) == 12 && std::string(bytes, 12) == "0000ftypisom",
           "I19 경로 교체 뒤 열린 fd 기존 byte 유지");
    lease.reset();
    std::filesystem::remove(media);
    std::filesystem::create_symlink(root / "original.mp4", media);
    expect(!reader.ResolveMedia("channel-one", "seg-one"), "I18 leaf symlink 거부");
    std::filesystem::remove(media);
    expect(!reader.ResolveMedia("channel-one", "seg-one"), "I09 누락 파일 거부");
    { std::ofstream out(media); out << "short"; }
    expect(!reader.ResolveMedia("channel-one", "seg-one"), "I09 크기 불일치 거부");
    std::filesystem::remove(media);
    std::filesystem::create_directory(media);
    expect(!reader.ResolveMedia("channel-one", "seg-one"), "I09 비일반 파일 거부");
    std::filesystem::remove(media);
    std::filesystem::rename(root / "original.mp4", media);
    auto event_segment = segment;
    event_segment.segment_id = "event-seg";
    event_segment.retention_class = recording::RecordingRetentionClass::Event;
    const auto event_media = root / "media" / "event.mp4";
    std::filesystem::copy_file(media, event_media);
    if (!catalog.FinalizeSegment(event_segment, event_media.string(), &error)) {
        std::cerr << "fixture 실패: " << error << '\n'; return 2;
    }
    recording::EventRecordingLinkV1 link;
    link.link_id = "link-one";
    link.event_id = "event-one";
    link.source_id = "source-one";
    link.channel_id = "channel-one";
    link.stream_epoch_id = "epoch-one";
    link.requested_range = recording::UtcRangeV1{1100, 1900};
    link.derived_actual_range = recording::UtcRangeV1{1000, 2000};
    link.derived_segment_id = "event-seg";
    link.ordered_overlaps = {{"seg-one", {1100, 1900}}};
    link.time_basis = "utc-ms";
    link.status = recording::EventRecordingLinkStatus::Complete;
    link.created_at_ms = 2000;
    link.updated_at_ms = 2000;
    if (!catalog.PutEventLink(link, &error)) {
        std::cerr << "fixture 실패: " << error << '\n'; return 2;
    }
    reader.QueryTimeline({"channel-one", 1000, 2000}, &result, &error);
    expect(result.items.size() == 2 && result.items[0].segment_id == "event-seg" &&
           result.items[0].display_priority == 200 && result.items[1].display_priority == 100,
           "I06 같은 시간 event 우선");
    const bool linked = result.items.size() == 2 && result.items[0].event_id == "event-one" &&
        result.items[1].superseded_by_event_ids == std::vector<std::string>{"event-one"};
    expect(linked, "I07 정확한 이벤트 ID 연결");
    expect(result.items.size() == 2 && result.items[0].requested_range &&
           result.items[0].requested_range->start_ms == 1100 && result.items[0].start_ms == 1000,
           "I10 실제 범위와 요청 범위 분리");
    if (!linked) return 1;
    reader.QueryTimeline({"channel-one", 1000, 2000, 1, 1}, &result, &error);
    expect(result.total == 2 && result.items.size() == 1 && result.items[0].segment_id == "seg-one",
           "I05 정렬 뒤 페이지 적용");
    expect(catalog.RequestDeletion("seg-one", "quota", &error), "I25 모든 실패 경로 hold 반환 후 삭제 허용");
    expect(!reader.ResolveMedia("channel-one", "seg-one"), "I08 deletion pending 거부");
    expect(reader.QueryTimeline({"channel-one", 1000, 2000}, &result, &error) &&
           result.total == 2 && !result.items[1].playable, "I08 pending timeline 재생 불가");
    std::filesystem::create_directories(root / "events");
    const auto fallback_path = root / "events" / "fallback.json";
    const auto fallback_video = root / "events" / "fallback.webm";
    { std::ofstream out(fallback_video); out << "webm-fixture"; }
    { std::ofstream out(fallback_path);
      out << "{\"schema\":\"media-server.va.event-clip-hook.v1\",\"eventId\":\"event-fallback\","
          << "\"streamId\":\"source-one\",\"channelId\":\"channel-one\",\"encodedClip\":{"
          << "\"schema\":\"media-server.encoded-event-clip-contract.v1\",\"status\":\"completed\","
          << "\"format\":\"webm\",\"codec\":\"vp8\",\"contentType\":\"video/webm\",\"byteSize\":12,"
          << "\"mediaPath\":\"" << fallback_video.string() << "\"}}"; }
    recording::EventRecordingLinkV1 fallback;
    fallback.link_id = "link-fallback";
    fallback.event_id = "event-fallback";
    fallback.source_id = "source-one";
    fallback.channel_id = "channel-one";
    fallback.requested_range = recording::UtcRangeV1{1100, 1900};
    fallback.time_basis = "utc-ms";
    fallback.status = recording::EventRecordingLinkStatus::Failed;
    fallback.fallback_evidence_id = "fallback-one";
    fallback.fallback_media_locator = fallback_path.string();
    fallback.created_at_ms = 2000;
    fallback.updated_at_ms = 2000;
    if (!catalog.PutEventLink(fallback, &error)) {
        std::cerr << "fixture 실패: " << error << '\n'; return 2;
    }
    auto fallback_fd = reader.ResolveMedia("channel-one", "fallback-one");
    expect(fallback_fd && fallback_fd->content_type() == "video/webm", "I11 검증한 fallback 영상 fd 제공");
    expect(fallback_fd && ::pread(fallback_fd->fd(), bytes, 12, 0) == 12 &&
           std::string(bytes, 12) == "webm-fixture", "I11 JSON이 아닌 실제 media byte 반환");
    reader.QueryTimeline({"channel-one", 1000, 2000}, &result, &error);
    expect(result.total == 3 && result.items[0].segment_id == "fallback-one" &&
           result.items[0].playable && result.items[0].completeness == "partial" &&
           !result.items[0].actual_range && result.items[0].range_basis == "requested-fallback",
           "I11 fallback timeline을 complete로 과장하지 않음");
    std::ifstream manifest_input(fallback_path);
    const std::string manifest_json((std::istreambuf_iterator<char>(manifest_input)), {});
    manifest_input.close();
    auto write_manifest = [&](const std::string& text) { std::ofstream out(fallback_path); out << text; };
    auto modified = manifest_json;
    modified.insert(1, "\"eventId\":\"event-fallback\",");
    write_manifest(modified);
    expect(!reader.ResolveMedia("channel-one", "fallback-one"), "I11 중복 key manifest 거부");
    modified = manifest_json;
    modified.replace(modified.find("event-fallback"), 14, "event-mismatch");
    write_manifest(modified);
    expect(!reader.ResolveMedia("channel-one", "fallback-one"), "I11 event 바인딩 불일치 거부");
    modified = manifest_json;
    modified.replace(modified.find("\"byteSize\":12"), 13, "\"byteSize\":\"12\"");
    write_manifest(modified);
    expect(!reader.ResolveMedia("channel-one", "fallback-one"), "I11 byteSize 문자열 타입 거부");
    write_manifest(std::string(65537, ' '));
    expect(!reader.ResolveMedia("channel-one", "fallback-one"), "I11 64KiB 초과 manifest 거부");
    write_manifest(manifest_json);
    std::filesystem::rename(fallback_video, root / "fallback-original.webm");
    std::filesystem::create_symlink(root / "fallback-original.webm", fallback_video);
    expect(!reader.ResolveMedia("channel-one", "fallback-one"), "I18 fallback media symlink 거부");
    std::filesystem::remove(fallback_video);
    { std::ofstream out(fallback_video); out << "short"; }
    expect(!reader.ResolveMedia("channel-one", "fallback-one"), "I09 fallback media 크기 불일치 거부");
    expect(fallback_fd && ::pread(fallback_fd->fd(), bytes, 12, 0) == 12 &&
           std::string(bytes, 12) == "webm-fixture", "I19 fallback 교체 뒤 기존 fd byte 유지");
    fallback_fd.reset();
    auto collision = segment;
    collision.segment_id = "fallback-one";
    collision.channel_id = "1";
    const auto collision_path = root / "media" / "collision.mp4";
    std::filesystem::copy_file(media, collision_path);
    if (!catalog.FinalizeSegment(collision, collision_path.string(), &error)) {
        std::cerr << "fixture 실패: " << error << '\n'; return 2;
    }
    expect(!reader.ResolveMedia("1", "fallback-one"), "I17 다른 채널 fallback ID 충돌도 거부");
    expect(reader.QueryTimeline({"1", 1000, 2000}, &result, &error) && result.total == 1,
           "I03 기존 숫자형 channel ID 유지");
    recording::RecordingTombstoneV1 tombstone;
    tombstone.tombstone_id = "collision-tombstone";
    tombstone.segment_id = collision.segment_id;
    tombstone.source_id = collision.source_id;
    tombstone.channel_id = collision.channel_id;
    tombstone.recorded_range = {collision.start.utc_ms, collision.end.utc_ms};
    tombstone.checksum_sha256 = collision.checksum_sha256;
    tombstone.retention_class = collision.retention_class;
    tombstone.deletion_reason = "quota";
    tombstone.deleted_at_ms = 3000;
    if (!catalog.RequestDeletion(collision.segment_id, "quota", &error) ||
        !catalog.CompleteDeletion(tombstone, &error)) {
        std::cerr << "fixture 실패: " << error << '\n'; return 2;
    }
    { std::ofstream out(fallback_video); out << "webm-fixture"; }
    expect(!reader.ResolveMedia("channel-one", "fallback-one"),
           "I08/I17 삭제 완료 ID의 fallback 재사용 거부");
    const auto range = ingress::ParseRecordingByteRange("bytes=2-5", 12);
    expect(range && range->partial && range->first == 2 && range->length == 4,
           "I20 closed Range 시작과 길이");
    auto gate = std::make_shared<ingress::RecordingRequestGate>();
    auto flight = gate->Begin(-1);
    expect(static_cast<bool>(flight), "I26 열린 gate 신규 요청 admission");
    gate->Close();
    expect(gate->Cancelled() && !gate->Begin(-1), "I26 닫힌 gate 신규 요청 거부");
    auto drained = std::async(std::launch::async, [&] { gate->Drain(); });
    expect(drained.wait_for(std::chrono::milliseconds(20)) == std::future_status::timeout,
           "I26 active flight 이전 drain 완료 금지");
    flight.reset();
    expect(drained.wait_for(std::chrono::seconds(1)) == std::future_status::ready,
           "I26 마지막 flight 해제 뒤 drain 완료");
    int sockets[2] = {-1, -1};
    if (::socketpair(AF_UNIX, SOCK_STREAM, 0, sockets) != 0) return 2;
    auto socket_gate = std::make_shared<ingress::RecordingRequestGate>();
    auto socket_flight = socket_gate->Begin(sockets[0]);
    socket_gate->Close();
    expect(::recv(sockets[1], bytes, 1, MSG_DONTWAIT) == 0, "I26 활성 socket shutdown 확인");
    socket_flight.reset();
    socket_gate->Drain();
    ::close(sockets[0]); ::close(sockets[1]);
    for (int attempt = 0; attempt < 16; ++attempt) {
        auto raced = segment;
        raced.segment_id = "race-" + std::to_string(attempt);
        const auto raced_path = root / "media" / (raced.segment_id + ".mp4");
        { std::ofstream out(raced_path); out << "0000ftypisom"; }
        if (!catalog.FinalizeSegment(raced, raced_path.string(), &error)) return 2;
        std::promise<void> ready;
        const auto start = ready.get_future().share();
        auto acquire = std::async(std::launch::async, [&] {
            start.wait(); return reader.ResolveMedia("channel-one", raced.segment_id);
        });
        auto erase = std::async(std::launch::async, [&] {
            start.wait(); return catalog.RequestDeletion(raced.segment_id, "quota", nullptr);
        });
        ready.set_value();
        auto held = acquire.get();
        const bool deleted = erase.get();
        const auto race_label = "I25 동시 삭제 경쟁 " + std::to_string(attempt);
        expect(static_cast<bool>(held) != deleted, race_label.c_str());
        bool closed = !held;
        if (held) {
            const int opened_fd = held->fd();
            const bool was_open = ::fcntl(opened_fd, F_GETFD) >= 0;
            held.reset();
            errno = 0;
            closed = was_open && ::fcntl(opened_fd, F_GETFD) < 0 && errno == EBADF;
        }
        const auto fd_label = "I26 경쟁 뒤 fd 반환 " + std::to_string(attempt);
        expect(closed, fd_label.c_str());
    }
    // 실제 미완결 segment는 catalog에 등록하지 않으며 파일 존재만으로 재생하지 않는다.
    auto writing = segment;
    writing.segment_id = "writing-safety";
    writing.channel_id = "channel-safety";
    writing.lifecycle = recording::RecordingLifecycle::Writing;
    const auto writing_path = root / "media" / "writing-safety.mp4";
    { std::ofstream out(writing_path); out << "0000ftypisom"; }
    expect(!recording::IsPlayable(writing.lifecycle), "I08 Writing lifecycle 재생 불가");
    expect(!catalog.FinalizeSegment(writing, writing_path.string(), &error), "I08 Writing finalize 등록 거부");
    expect(std::filesystem::is_regular_file(writing_path) && !reader.ResolveMedia("channel-safety", writing.segment_id),
           "I08 Writing 실제 파일 존재해도 media 거부");
    recording::RecordingTimelineResult safety_timeline;
    expect(reader.QueryTimeline({"channel-safety", 1000, 2000}, &safety_timeline, &error) && safety_timeline.items.empty(),
           "I08 Writing timeline 재생 노출 없음");
    auto corrupt = segment;
    corrupt.segment_id = "corrupt-safety";
    corrupt.channel_id = "channel-safety";
    const auto corrupt_path = root / "media" / "corrupt-safety.mp4";
    { std::ofstream out(corrupt_path); out << "0000ftypisom"; }
    if (!catalog.FinalizeSegment(corrupt, corrupt_path.string(), &error)) return 2;
    { std::fstream out(corrupt_path, std::ios::binary | std::ios::in | std::ios::out); out.put('x'); }
    expect(catalog.MarkSegmentCorrupt(corrupt.segment_id, "checksum-mismatch", &error), "I08 Corrupt 실제 catalog 전이");
    expect(std::filesystem::is_regular_file(corrupt_path) && !reader.ResolveMedia("channel-safety", corrupt.segment_id),
           "I08 Corrupt 실제 파일 존재해도 media 거부");
    expect(reader.QueryTimeline({"channel-safety", 1000, 2000}, &safety_timeline, &error) &&
           safety_timeline.items.size() == 1 && safety_timeline.items[0].segment_id == corrupt.segment_id &&
           !safety_timeline.items[0].playable && safety_timeline.items[0].completeness == "missing" &&
           safety_timeline.items[0].playback_url.empty(), "I08 Corrupt timeline 불가 상태");
    return failures == 0 ? 0 : 1;
}
