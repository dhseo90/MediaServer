// S06 실제 catalog를 이용한 조회 투영 회귀. 미디어 재생 검증과 구분한다.
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

namespace {
// 실제 HTTP Range byte 대조용: 제품 journal API로 생성하며 원본 sample을 복사한다.
int SeedHttp(const std::filesystem::path& root, const std::filesystem::path& input, bool ui = false) {
    std::filesystem::create_directories(root / "channel-1");
    recording::RecordingJournal journal(root / "recording-mutations.jsonl");
    recording::RecordingCatalog catalog(journal, {root / "recording-catalog.sqlite3", root, true});
    std::string error;
    if (!journal.Open(&error) || !catalog.Open(&error)) return 2;
    for (const auto& id : {"http-continuous", "http-event"}) {
        const auto file = root / "channel-1" / (std::string(id) + ".mp4");
        std::filesystem::copy_file(input, file);
        recording::RecordingSegmentV1 segment;
        segment.segment_id = id; segment.source_id = "1"; segment.channel_id = "1";
        segment.stream_epoch_id = "http-epoch";
        segment.start = {1000, 0, 1, 1000000000}; segment.end = {10000, 9000000000, 1, 1000000000};
        segment.container = "mp4"; segment.video_codecs = {"h264"};
        segment.audio_omitted_reason = "source-no-audio";
        segment.size_bytes = std::filesystem::file_size(file);
        segment.checksum_sha256 = std::string(64, 'a');
        segment.retention_class = std::string(id) == "http-event" ? recording::RecordingRetentionClass::Event : recording::RecordingRetentionClass::Continuous;
        segment.lifecycle = recording::RecordingLifecycle::Finalized;
        segment.created_at_ms = 1000; segment.finalized_at_ms = 10000;
        if (!catalog.FinalizeSegment(segment, file.string(), &error)) return 2;
    }
    recording::EventRecordingLinkV1 link;
    link.link_id = "http-link"; link.event_id = "http-event-id";
    link.source_id = "1"; link.channel_id = "1"; link.stream_epoch_id = "http-epoch";
    link.time_basis = "utc-ms"; link.requested_range = recording::UtcRangeV1{2000, 8000};
    link.derived_actual_range = recording::UtcRangeV1{1000, 10000};
    link.ordered_overlaps = {{"http-continuous", {2000, 8000}}}; link.derived_segment_id = "http-event";
    link.status = recording::EventRecordingLinkStatus::Complete;
    link.created_at_ms = 10000; link.updated_at_ms = 10000;
    if (!catalog.PutEventLink(link, &error)) return 2;
    if (ui) {
        const auto baseline = catalog.FindSegmentById("http-continuous");
        if (!baseline) return 2;
        for (int index = 0; index < 101; ++index) {
            auto extra = *baseline;
            extra.segment_id = index == 0 ? "ui-partial" : index == 1 ? "ui-short-source" : "ui-page-" + std::to_string(index);
            extra.retention_class = index == 0 ? recording::RecordingRetentionClass::Event : recording::RecordingRetentionClass::Continuous;
            if (index == 1) extra.end = {4000, 3000000000, 1, 1000000000};
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
        partial.ordered_overlaps = {{"ui-short-source", {2000, 4000}}};
        partial.missing_ranges = {{4000, 8000}};
        if (!catalog.PutEventLink(partial, &error)) {
            std::cerr << "UI partial fixture 실패: " << error << '\n'; return 2;
        }
        recording::EventRecordingLinkV1 missing;
        missing.link_id = "ui-missing-link"; missing.event_id = "ui-missing-event";
        missing.source_id = "1"; missing.channel_id = "1";
        missing.requested_range = recording::UtcRangeV1{2000, 8000};
        missing.time_basis = "utc-ms"; missing.status = recording::EventRecordingLinkStatus::Failed;
        missing.fallback_evidence_id = "ui-missing";
        missing.fallback_media_locator = (root.parent_path() / "events/clips/ui-missing.json").string();
        missing.created_at_ms = 10000; missing.updated_at_ms = 10000;
        if (!catalog.PutEventLink(missing, &error)) {
            std::cerr << "UI missing fixture 실패: " << error << '\n'; return 2;
        }
    }
    return 0;
}
}  // namespace

int main(int argc, char** argv) {
    if (argc == 4 && (std::string(argv[2]) == "--seed-http" || std::string(argv[2]) == "--seed-ui"))
        return SeedHttp(argv[1], argv[3], std::string(argv[2]) == "--seed-ui");
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
    return failures == 0 ? 0 : 1;
}
