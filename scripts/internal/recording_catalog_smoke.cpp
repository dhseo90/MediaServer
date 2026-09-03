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

#if MEDIA_SERVER_USE_SQLITE3
#include <sqlite3.h>
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
        invalid_link.time_basis = "utc-ms";
        invalid_link.status = recording::EventRecordingLinkStatus::Pending;
        invalid_link.created_at_ms = 1000;
        invalid_link.updated_at_ms = 1000;
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
    const auto known_cleanup_marker =
        std::filesystem::path(known_media.string() + ".cleanup-pending");
    const auto known_cleanup_partial = media_root / "channel-1" /
        "seg-alpha.mp4.partial.123e4567-e89b-42d3-a456-426614174003";
    const auto orphan_cleanup_media =
        media_root / "channel-1" / "seg-writer-orphan.mp4";
    const auto orphan_cleanup_marker =
        std::filesystem::path(orphan_cleanup_media.string() + ".cleanup-pending");
    const auto owned_event_final = media_root / "channel-1" / "event-owned.ts";
    const auto owned_event_partial =
        media_root / "channel-1" /
        "event-owned.ts.partial.123e4567-e89b-42d3-a456-426614174000";
    const auto foreign_event_partial =
        media_root / "channel-1" / "event-owned.ts.partial";
    const auto owned_event_marker =
        std::filesystem::path(owned_event_final.string() + ".cleanup-pending");
    WriteMp4Header(orphan_cleanup_media);
    {
        std::ofstream owned_partial_output(owned_event_partial, std::ios::binary);
        owned_partial_output << "owned-crash-partial";
        std::ofstream foreign_partial_output(foreign_event_partial, std::ios::binary);
        foreign_partial_output << "foreign-partial";
    }
    {
        std::ofstream known_marker_output(known_cleanup_marker);
        known_marker_output << "recording-cleanup-pending-v2\npartial="
                            << known_cleanup_partial.filename().string() << "\n";
        std::ofstream orphan_marker_output(orphan_cleanup_marker);
        orphan_marker_output << "recording-cleanup-pending-v1\n";
        std::ofstream owned_event_marker_output(owned_event_marker);
        owned_event_marker_output << "recording-cleanup-pending-v2\n"
                                  << "partial=" << owned_event_partial.filename().string()
                                  << "\n";
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
        Expect(report.writer_cleanup_recovered_count == 3 &&
                   report.writer_cleanup_error_count == 0 &&
                   std::filesystem::exists(known_media) &&
                   !std::filesystem::exists(known_cleanup_marker) &&
                   std::filesystem::exists(orphan_cleanup_media) &&
                   !std::filesystem::exists(orphan_cleanup_marker) &&
                   !std::filesystem::exists(owned_event_partial) &&
                   std::filesystem::exists(foreign_event_partial) &&
                   !std::filesystem::exists(owned_event_marker),
               "재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존");
        const auto query = fallback_replay.QuerySegments("channel-1", 500, 2500);
        for (const auto& item : query) fallback_ids.push_back(item.segment_id);
        Expect(fallback_ids.size() == 1, "중복 replay row/합계 불증가");
    }

    {
        {
            std::ofstream known_partial_output(known_cleanup_partial, std::ios::binary);
            known_partial_output << "tracked-owned-partial";
            std::ofstream known_marker_output(known_cleanup_marker, std::ios::binary);
            known_marker_output << "recording-cleanup-pending-v2\npartial="
                                << known_cleanup_partial.filename().string() << "\n";
        }
        recording::RecordingCatalog tracked_partial_replay(
            journal, {root / "tracked-partial.sqlite3", media_root, false});
        Expect(tracked_partial_replay.Open(&error) &&
                   std::filesystem::exists(known_media) &&
                   !std::filesystem::exists(known_cleanup_partial) &&
                   !std::filesystem::exists(known_cleanup_marker),
               "추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구: " + error);
    }

    const auto cleanup_failure_root = root / "cleanup-failure-media";
    const auto cleanup_failure_channel = cleanup_failure_root / "channel-1";
    std::filesystem::create_directories(cleanup_failure_channel);
    const auto cleanup_failure_target = root / "cleanup-failure-target.txt";
    {
        std::ofstream output(cleanup_failure_target, std::ios::binary | std::ios::trunc);
        output << "외부-보존-내용";
    }
    const auto cleanup_failure_marker =
        cleanup_failure_channel / "seg-untracked.mp4.cleanup-pending";
    std::error_code cleanup_fixture_error;
    std::filesystem::create_symlink(
        cleanup_failure_target, cleanup_failure_marker, cleanup_fixture_error);
    recording::RecordingCatalog cleanup_failure_catalog(
        journal, {root / "cleanup-failure.sqlite3", cleanup_failure_root, false});
    Expect(!cleanup_fixture_error && !cleanup_failure_catalog.Open(&error) &&
               std::filesystem::exists(cleanup_failure_target),
           "writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed");

    const auto hardlink_cleanup_root = root / "hardlink-cleanup-media";
    const auto hardlink_cleanup_channel = hardlink_cleanup_root / "channel-1";
    std::filesystem::create_directories(hardlink_cleanup_channel);
    const auto hardlink_partial = hardlink_cleanup_channel /
        "event-hardlink.ts.partial.123e4567-e89b-42d3-a456-426614174002";
    const auto hardlink_alias = root / "event-hardlink-alias.bin";
    const auto hardlink_marker =
        hardlink_cleanup_channel / "event-hardlink.ts.cleanup-pending";
    {
        std::ofstream output(hardlink_partial, std::ios::binary | std::ios::trunc);
        output << "shared-partial";
        std::ofstream marker_output(hardlink_marker, std::ios::binary | std::ios::trunc);
        marker_output << "recording-cleanup-pending-v2\npartial="
                      << hardlink_partial.filename().string() << "\n";
    }
    std::error_code hardlink_error;
    std::filesystem::create_hard_link(hardlink_partial, hardlink_alias, hardlink_error);
    recording::RecordingCatalog hardlink_cleanup_catalog(
        journal, {root / "hardlink-cleanup.sqlite3", hardlink_cleanup_root, false});
    Expect(!hardlink_error && !hardlink_cleanup_catalog.Open(&error) &&
               std::filesystem::exists(hardlink_partial) &&
               std::filesystem::exists(hardlink_alias) &&
               std::filesystem::exists(hardlink_marker),
           "v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed");

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
        Expect(orphan.normal_orphan_count == 2,
               "journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분");
        Expect(orphan.corrupt_orphan_count == 1, "journal 없는 손상 media orphan 구분");
    }

    const auto projection_root = root / "projection-failover";
    const auto projection_media_root = projection_root / "media";
    const auto projection_media =
        projection_media_root / "channel-1" / "seg-projection-fallback.mp4";
    WriteMp4Header(projection_media);
    recording::RecordingJournal projection_journal(projection_root / "recording.jsonl");
    Expect(projection_journal.Open(&error), "projection failover journal open: " + error);
    {
        recording::RecordingCatalog::Options projection_options;
        projection_options.sqlite_path = projection_root / "recording.sqlite3";
        projection_options.media_root = projection_media_root;
        projection_options.prefer_sqlite = true;
        recording::RecordingCatalog projection_catalog(
            projection_journal, std::move(projection_options));
        Expect(projection_catalog.Open(&error), "projection failover catalog open: " + error);
#if MEDIA_SERVER_USE_SQLITE3
        sqlite3* fault_db = nullptr;
        const auto projection_sqlite_path = projection_root / "recording.sqlite3";
        bool trigger_ready =
            sqlite3_open(projection_sqlite_path.string().c_str(), &fault_db) == SQLITE_OK;
        if (trigger_ready) {
            trigger_ready = sqlite3_exec(
                                fault_db,
                                "CREATE TRIGGER fail_recording_projection "
                                "BEFORE INSERT ON recording_mutations "
                                "BEGIN SELECT RAISE(ABORT,'injected projection failure'); END;",
                                nullptr, nullptr, nullptr) == SQLITE_OK;
        }
        if (fault_db != nullptr) sqlite3_close(fault_db);
        Expect(trigger_ready, "실제 SQLite INSERT 실패 trigger 설치");
#endif
        Expect(projection_catalog.FinalizeSegment(
                   Segment("seg-projection-fallback"), projection_media.string(), &error),
               "SQLite 투영 실패 뒤 journal+memory finalize 유지: " + error);
#if MEDIA_SERVER_USE_SQLITE3
        Expect(projection_catalog.catalog_mode() == "jsonl-fallback" &&
                   projection_catalog.recovery_report().projection_error_count == 1,
               "SQLite 투영 실패 즉시 JSONL fallback 전환");
        sqlite3* cleanup_db = nullptr;
        bool trigger_removed =
            sqlite3_open(projection_sqlite_path.string().c_str(), &cleanup_db) == SQLITE_OK;
        if (trigger_removed) {
            trigger_removed = sqlite3_exec(
                                  cleanup_db,
                                  "DROP TRIGGER fail_recording_projection",
                                  nullptr, nullptr, nullptr) == SQLITE_OK;
        }
        if (cleanup_db != nullptr) sqlite3_close(cleanup_db);
        Expect(trigger_removed, "재시작 rebuild 전 실패 trigger 제거");
#else
        Expect(projection_catalog.catalog_mode() == "jsonl-fallback",
               "SQLite 미빌드 projection test fallback 유지");
#endif
        Expect(projection_catalog.QuerySegments("channel-1", 500, 2500).size() == 1,
               "투영 실패 직후 in-memory query 정합성 유지");
    }
    {
        recording::RecordingCatalog projection_reopen(
            projection_journal,
            {projection_root / "recording.sqlite3", projection_media_root, true});
        Expect(projection_reopen.Open(&error),
               "projection failover 재시작 journal rebuild: " + error);
        Expect(projection_reopen.QuerySegments("channel-1", 500, 2500).size() == 1,
               "재시작 후 journal에서 누락 SQLite projection 복구");
#if MEDIA_SERVER_USE_SQLITE3
        Expect(projection_reopen.catalog_mode() == "sqlite-primary",
               "재시작 후 SQLite primary 복귀");
        sqlite3* verify_db = nullptr;
        sqlite3_stmt* count_statement = nullptr;
        int rebuilt_rows = -1;
        if (sqlite3_open((projection_root / "recording.sqlite3").string().c_str(),
                         &verify_db) == SQLITE_OK &&
            sqlite3_prepare_v2(
                verify_db,
                "SELECT COUNT(*) FROM recording_segments "
                "WHERE segment_id='seg-projection-fallback'",
                -1, &count_statement, nullptr) == SQLITE_OK &&
            sqlite3_step(count_statement) == SQLITE_ROW) {
            rebuilt_rows = sqlite3_column_int(count_statement, 0);
        }
        if (count_statement != nullptr) sqlite3_finalize(count_statement);
        if (verify_db != nullptr) sqlite3_close(verify_db);
        Expect(rebuilt_rows == 1, "재시작 journal rebuild가 실제 SQLite row 복원");
#endif
    }

    const auto tombstone_root = root / "tombstone-id-reuse";
    const auto tombstone_media_root = tombstone_root / "media";
    const auto tombstone_media = tombstone_media_root / "channel-1" / "seg-tombstoned.mp4";
    WriteMp4Header(tombstone_media);
    recording::RecordingJournal tombstone_journal(tombstone_root / "recording.jsonl");
    Expect(tombstone_journal.Open(&error), "tombstone journal open: " + error);
    recording::RecordingCatalog tombstone_catalog(
        tombstone_journal, {tombstone_root / "recording.sqlite3", tombstone_media_root, false});
    Expect(tombstone_catalog.Open(&error), "tombstone catalog open: " + error);
    auto tombstoned_segment = Segment("seg-tombstoned");
    Expect(tombstone_catalog.FinalizeSegment(tombstoned_segment, tombstone_media.string(), &error),
           "tombstone 대상 segment finalize: " + error);
    Expect(tombstone_catalog.RequestDeletion("seg-tombstoned", "event-retention", &error),
           "tombstone 대상 deletion request: " + error);
    recording::RecordingTombstoneV1 tombstone;
    tombstone.tombstone_id = "tombstone-seg-tombstoned";
    tombstone.segment_id = tombstoned_segment.segment_id;
    tombstone.source_id = tombstoned_segment.source_id;
    tombstone.channel_id = tombstoned_segment.channel_id;
    tombstone.recorded_range = {tombstoned_segment.start.utc_ms,
                                tombstoned_segment.end.utc_ms};
    tombstone.checksum_sha256 = tombstoned_segment.checksum_sha256;
    tombstone.retention_class = tombstoned_segment.retention_class;
    tombstone.deletion_reason = "event-retention";
    tombstone.deleted_at_ms = 3000;
    Expect(tombstone_catalog.CompleteDeletion(tombstone, &error),
           "tombstone 완료 기록: " + error);
    WriteMp4Header(tombstone_media);
    Expect(!tombstone_catalog.FinalizeSegment(
               tombstoned_segment, tombstone_media.string(), &error) &&
               error.find("tombstone") != std::string::npos,
           "catalog finalize가 tombstone segment ID 재사용을 거부해야 함");

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
