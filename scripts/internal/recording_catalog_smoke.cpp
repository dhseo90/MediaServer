// 파일 용도: v4.1.0 S03 journal/catalog 복구 계약을 실제 C++로 검증한다.
// 동작 요약: 중복·truncate·corrupt replay, SQLite parity/FK, orphan와 DB 격리를 확인한다.
#include "recording/recording_catalog.h"
#include "recording/recording_journal.h"

#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>

#ifndef MEDIA_SERVER_USE_SQLITE3
#define MEDIA_SERVER_USE_SQLITE3 0
#endif

namespace {
int passes = 0;
int failures = 0;

void Expect(bool condition, const std::string& label) {
    if (condition) ++passes;
    else { ++failures; std::cerr << "[fail] " << label << '\n'; }
}

void WriteMp4Header(const std::filesystem::path& path) {
    std::filesystem::create_directories(path.parent_path());
    const unsigned char bytes[] = {0,0,0,12,'f','t','y','p','i','s','o','m'};
    std::ofstream output(path, std::ios::binary | std::ios::trunc);
    output.write(reinterpret_cast<const char*>(bytes), sizeof(bytes));
}

recording::RecordingSegmentV1 Segment(const std::string& id) {
    recording::RecordingSegmentV1 segment;
    segment.segment_id = id;
    segment.source_id = "source-1";
    segment.channel_id = "channel-1";
    segment.stream_epoch_id = "epoch-1";
    segment.start = {1000, 0, 1, 1000000000};
    segment.end = {2000, 1000000000, 1, 1000000000};
    segment.container = "mp4";
    segment.video_codecs = {"h264"};
    segment.audio_omitted_reason = "source-no-audio";
    segment.size_bytes = 12;
    segment.checksum_sha256 = std::string(64, 'a');
    segment.retention_class = recording::RecordingRetentionClass::Continuous;
    segment.lifecycle = recording::RecordingLifecycle::Finalized;
    segment.created_at_ms = 1000;
    segment.finalized_at_ms = 2000;
    return segment;
}
}  // namespace

int main(int argc, char** argv) {
    if (argc != 2) return 2;
    const std::filesystem::path root(argv[1]);
    const auto media_root = root / "media";
    const auto journal_path = root / "recording.jsonl";
    const auto sqlite_path = root / "recording.sqlite3";
    const auto known_media = media_root / "channel-1" / "seg-alpha.mp4";
    WriteMp4Header(known_media);

    recording::RecordingJournal journal(journal_path);
    std::string error;
    Expect(journal.Open(&error), "journal open: " + error);
    {
        recording::RecordingCatalog fallback(journal, {sqlite_path, media_root, false});
        Expect(fallback.Open(&error), "fallback catalog open: " + error);
        Expect(fallback.catalog_mode() == "jsonl-fallback", "SQLite off mode 표시");
        Expect(fallback.FinalizeSegment(Segment("seg-alpha"), known_media.string(), &error),
               "segment finalize journal+projection: " + error);
        const auto query = fallback.QuerySegments("channel-1", 500, 2500);
        Expect(query.size() == 1 && query.front().segment_id == "seg-alpha", "fallback range query");

        recording::EventRecordingLinkV1 invalid_link;
        invalid_link.link_id = "link-invalid";
        invalid_link.event_id = "event-invalid";
        invalid_link.source_id = "source-1";
        invalid_link.channel_id = "channel-1";
        invalid_link.requested_range = {1000, 2000};
        invalid_link.ordered_overlaps.push_back({"seg-missing", {1000, 2000}});
        const auto before = journal.Replay().mutations.size();
        Expect(!fallback.PutEventLink(invalid_link, &error), "event link FK 위반 거부");
        Expect(journal.Replay().mutations.size() == before, "FK 위반 transaction/journal 전체 rollback");
    }

    auto replay = journal.Replay();
    Expect(replay.mutations.size() == 1, "최초 durable mutation 1개");
    if (!replay.mutations.empty()) {
        Expect(journal.Append(replay.mutations.front(), &error), "동일 mutation 중복 append");
    }
    {
        std::ofstream output(journal_path, std::ios::binary | std::ios::app);
        output << "{bad-json}\n";
        output << "{\"schema\":\"truncated";
    }
    replay = journal.Replay();
    Expect(replay.mutations.size() == 2, "손상 사이 정상 durable mutation 보존");
    Expect(replay.corrupt_line_count == 1, "중간 corrupt line count");
    Expect(replay.truncated_tail_count == 1, "마지막 truncated line skip");

    std::vector<std::string> fallback_ids;
    {
        recording::RecordingCatalog fallback_replay(journal, {root / "off.sqlite3", media_root, false});
        Expect(fallback_replay.Open(&error), "fallback replay open");
        const auto report = fallback_replay.recovery_report();
        Expect(report.duplicate_mutation_count == 1, "같은 mutation idempotent replay");
        const auto query = fallback_replay.QuerySegments("channel-1", 500, 2500);
        for (const auto& item : query) fallback_ids.push_back(item.segment_id);
        Expect(fallback_ids.size() == 1, "중복 replay row/합계 불증가");
    }

    std::vector<std::string> sqlite_ids;
    {
        recording::RecordingCatalog sqlite_catalog(journal, {sqlite_path, media_root, true});
        Expect(sqlite_catalog.Open(&error), "SQLite catalog open/rebuild: " + error);
#if MEDIA_SERVER_USE_SQLITE3
        Expect(sqlite_catalog.catalog_mode() == "sqlite-primary", "SQLite primary mode 표시");
#else
        Expect(sqlite_catalog.catalog_mode() == "jsonl-fallback", "SQLite 미빌드 fallback 표시");
#endif
        const auto query = sqlite_catalog.QuerySegments("channel-1", 500, 2500);
        for (const auto& item : query) sqlite_ids.push_back(item.segment_id);
        Expect(sqlite_ids == fallback_ids, "SQLite on/off range query ID·순서 parity");

        WriteMp4Header(media_root / "orphan-normal.mp4");
        { std::ofstream bad(media_root / "orphan-corrupt.webm", std::ios::binary); bad << "broken"; }
        const auto orphan = sqlite_catalog.InspectOrphans();
        Expect(orphan.normal_orphan_count == 1, "journal 없는 정상 media orphan 구분");
        Expect(orphan.corrupt_orphan_count == 1, "journal 없는 손상 media orphan 구분");
    }

#if MEDIA_SERVER_USE_SQLITE3
    { std::ofstream corrupt(sqlite_path, std::ios::binary | std::ios::trunc); corrupt << "not-a-sqlite-database"; }
    {
        recording::RecordingCatalog recovered(journal, {sqlite_path, media_root, true});
        Expect(recovered.Open(&error), "손상 SQLite 격리 후 journal rebuild: " + error);
        const auto report = recovered.recovery_report();
        Expect(report.sqlite_quarantined, "손상 SQLite 원본 격리");
        Expect(std::filesystem::exists(report.sqlite_quarantine_path), "격리 SQLite 파일 보존");
        Expect(recovered.QuerySegments("channel-1", 500, 2500).size() == 1, "격리 후 journal rebuild 결과");
    }
#endif

    std::cout << "[verify-v410-recording-catalog] pass=" << passes << " fail=" << failures << '\n';
    return failures == 0 ? 0 : 1;
}
