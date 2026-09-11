// 파일 용도: v4.1.0 S03 journal/catalog 복구 계약을 실제 C++로 검증한다.
// 동작 요약: 중복·truncate·corrupt replay, SQLite parity/FK, orphan와 DB 격리를 확인한다.
#include "recording/recording_catalog.h"
#include "recording/recording_journal.h"

#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>
#include <set>
#include <limits>
#include <sys/wait.h>
#include <unistd.h>
#include <signal.h>

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
    if (condition) { ++passes; std::cout << "[pass] " << label << '\n'; }
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

std::string ReadBytes(const std::filesystem::path& path) {
    std::ifstream input(path, std::ios::binary);
    return {std::istreambuf_iterator<char>(input), std::istreambuf_iterator<char>()};
}

void UnsupportedJournalCases(const std::filesystem::path& root) {
    const std::vector<std::pair<std::string, std::string>> cases = {
        {"future-schema", R"({"schema":"media-server.recording-mutation.v2","futurePayload":[]})"},
        {"arbitrary-schema", R"({"schema":"unrecognized-format"})"},
        {"empty-schema", R"({"schema":""})"},
        {"future-type", R"({"schema":"media-server.recording-mutation.v1","mutationId":"future-1","mutationType":"future_put","occurredAtMs":1000,"entityId":"entity-1","payload":{}})"},
    };
    for (const auto& item : cases) {
        const auto directory = root / item.first;
        const auto media = directory / "media";
        const auto path = directory / "journal.jsonl";
        const auto sqlite = directory / "index.sqlite3";
        const auto marker = media / "orphan.mp4.cleanup-pending";
        WriteMp4Header(media / "orphan.mp4");
        { std::ofstream output(path); output << item.second << '\n'; }
        { std::ofstream output(sqlite); output << "existing-sqlite-sentinel"; }
        { std::ofstream output(marker); output << "recording-cleanup-pending-v1\n"; }
        const auto journal_before = ReadBytes(path), sqlite_before = ReadBytes(sqlite);
        const auto marker_before = ReadBytes(marker);
        recording::RecordingJournal journal(path);
        std::string error;
        Expect(journal.Open(&error), "S10-3A " + item.first + " journal read open");
        const auto replay = journal.Replay();
        Expect(replay.unsupported_record_count == 1 && replay.corrupt_line_count == 0 &&
                   replay.mutations.empty(), "S10-3A " + item.first + " unsupported classification");
        recording::RecordingCatalog catalog(journal, {sqlite, media, true});
        Expect(!catalog.Open(&error), "S10-3A " + item.first + " catalog open denied");
        Expect(!catalog.Open(&error), "S10-3A " + item.first + " catalog retry denied");
        Expect(ReadBytes(path) == journal_before, "S10-3A " + item.first + " journal bytes preserved");
        Expect(ReadBytes(sqlite) == sqlite_before, "S10-3A " + item.first + " SQLite bytes preserved");
        Expect(ReadBytes(marker) == marker_before, "S10-3A " + item.first + " writer cleanup untouched");
    }
    const auto malformed = root / "malformed.jsonl";
    {
        std::ofstream output(malformed);
        output << "{bad-json}\n{}\n{\"schema\":42}\n"
               << R"({"schema":"media-server.recording-mutation.v1","mutationType":42})" << '\n'
               << R"({"schema":"media-server.recording-mutation.v1","mutationId":"m","mutationType":"future_put","occurredAtMs":1,"entityId":"e","payload":[]})" << '\n';
    }
    recording::RecordingJournal journal(malformed);
    std::string error;
    Expect(journal.Open(&error), "S10-3A malformed journal open");
    const auto replay = journal.Replay();
    Expect(replay.corrupt_line_count == 5 && replay.unsupported_record_count == 0,
           "S10-3A malformed JSON missing fields and wrong types remain corrupt");
}

std::string OrderLine(const std::string& request, const std::string& segment,
                      const std::string& sequence, const std::string& store = "store-1") {
    return "{\"schema\":\"media-server.recording-mutation.v1\",\"mutationId\":\"" + request +
        "\",\"mutationType\":\"recording_order_reserved\",\"occurredAtMs\":0,\"entityId\":\"" + segment +
        "\",\"payload\":{\"schema\":\"media-server.recording-order.v1\",\"storeId\":\"" + store +
        "\",\"requestId\":\"" + request + "\",\"segmentId\":\"" + segment +
        "\",\"channelId\":\"channel-1\",\"sequence\":" + sequence + "}}\n";
}
bool WaitChild(pid_t child) {
    if (child < 0) return false;
    int status = 0;
    for (int n = 0; n < 200; ++n) {
        const auto result = waitpid(child, &status, WNOHANG);
        if (result == child) return WIFEXITED(status) && WEXITSTATUS(status) == 0;
        if (result < 0) return false;
        usleep(10000);
    }
    kill(child, SIGKILL); waitpid(child, &status, 0); return false;
}

void OrderReservationCases(const std::filesystem::path& root) {
    std::filesystem::create_directories(root);
    const auto path = root / "orders.jsonl";
    recording::RecordingJournal journal(path);
    std::string error;
    recording::RecordingOrderReservationV1 result;
    Expect(journal.Open(&error), "S10-O01 reservation journal open");
    Expect(journal.ReserveRecordingOrder("store-1", "request-1", "segment-1", "channel-1", &result, &error) &&
        result.sequence == 1 && result.store_id == "store-1" && result.request_id == "request-1" &&
        result.segment_id == "segment-1" && result.channel_id == "channel-1",
        "S10-O01 first reservation returns four IDs and sequence one");
    const auto first = ReadBytes(path);
    auto replay = journal.Replay();
    recording::RecordingOrderReservationV1 parsed;
    Expect(replay.mutations.size() == 1 && recording::ParseRecordingOrderReservationV1(
        replay.mutations.front().payload_json, &parsed, &error) && parsed.sequence == 1,
        "S10-O01 versioned reservation payload replays");
    Expect(replay.mutations.size()==1 && replay.mutations.front().occurred_at_ms>0,
        "S10-O01 new reservation records actual occurred time");
    Expect(journal.ReserveRecordingOrder("store-1", "request-1", "segment-1", "channel-1", &result, &error) &&
        result.sequence == 1 && ReadBytes(path) == first, "S10-O02 identical retry preserves sequence and bytes");
    recording::RecordingJournal reopened(path);
    Expect(reopened.Open(&error) && reopened.ReserveRecordingOrder("store-1", "request-2", "segment-2",
        "channel-1", &result, &error) && result.sequence == 2, "S10-O03 reopened instance allocates next sequence");
    std::cout.flush(); std::cerr.flush();
    const pid_t restart = fork();
    if (restart == 0) {
        recording::RecordingJournal child(path); recording::RecordingOrderReservationV1 value;
        const bool ok = child.Open(&error) && child.ReserveRecordingOrder("store-1", "request-3", "segment-3",
            "channel-1", &value, &error) && value.sequence == 3;
        _exit(ok ? 0 : 1);
    }
    Expect(WaitChild(restart), "S10-O03 new process resumes durable sequence");
    const auto before_conflict = ReadBytes(path);
    Expect(!journal.ReserveRecordingOrder("store-2", "request-4", "segment-4", "channel-1", &result, &error), "S10-O04 different store rejected");
    Expect(!journal.ReserveRecordingOrder("store-1", "request-1", "other-segment", "channel-1", &result, &error), "S10-O04 reused request with different segment rejected");
    Expect(!journal.ReserveRecordingOrder("store-1", "request-1", "segment-1", "other-channel", &result, &error), "S10-O04 reused request with different channel rejected");
    Expect(!journal.ReserveRecordingOrder("store-1", "other-request", "segment-1", "channel-1", &result, &error), "S10-O04 reused segment with different request rejected");
    Expect(ReadBytes(path) == before_conflict, "S10-O04 conflicts preserve original bytes");

    const std::string ordinary = R"({"schema":"media-server.recording-mutation.v1","mutationId":"request-1","mutationType":"corruption_detected","occurredAtMs":1,"entityId":"legacy-segment","payload":{}})" "\n";
    const std::vector<std::pair<std::string,std::string>> invalid = {
        {"corrupt", "{broken}\n"},
        {"unsupported-schema", "{\"schema\":\"future\"}\n"},
        {"unsupported-type", R"({"schema":"media-server.recording-mutation.v1","mutationId":"m","mutationType":"future","occurredAtMs":1,"entityId":"e","payload":{}})" "\n"},
        {"tail", OrderLine("request-1","segment-1","1") + "{}"},
        {"payload-zero", OrderLine("request-1","segment-1","0")},
        {"payload-negative", OrderLine("request-1","segment-1","-1")},
        {"payload-fraction", OrderLine("request-1","segment-1","1.5")},
        {"payload-overflow", OrderLine("request-1","segment-1","9223372036854775808")},
        {"duplicate-sequence", OrderLine("request-1","segment-1","1")+OrderLine("request-2","segment-2","1")},
        {"decreasing-sequence", OrderLine("request-1","segment-1","2")+OrderLine("request-2","segment-2","1")},
        {"duplicate-request", OrderLine("request-1","segment-1","1")+OrderLine("request-1","segment-2","2")},
        {"duplicate-segment", OrderLine("request-1","segment-1","1")+OrderLine("request-2","segment-1","2")},
        {"store-conflict", OrderLine("request-1","segment-1","1")+OrderLine("request-2","segment-2","2","store-2")},
        {"ordinary-before", ordinary+OrderLine("request-1","segment-1","1")},
        {"ordinary-after", OrderLine("request-1","segment-1","1")+ordinary},
        {"line-cap", std::string(16 * 1024 * 1024 + 1, ' ') + "{}\n"},
    };
    for (const auto& item : invalid) {
        const auto invalid_path = root / (item.first + ".jsonl");
        { std::ofstream out(invalid_path); out << item.second; }
        recording::RecordingJournal bad(invalid_path);
        const bool opened = bad.Open(&error);
        Expect(opened && !bad.ReserveRecordingOrder("store-1","new-request","new-segment","channel-1",&result,&error)
            && ReadBytes(invalid_path)==item.second, "S10-O05/O06 reject and preserve " + item.first);
    }
    auto binding = OrderLine("request-1","segment-1","1");
    binding.replace(binding.find("\"entityId\":\"segment-1\""), std::string("\"entityId\":\"segment-1\"").size(), "\"entityId\":\"other\"");
    recording::RecordingMutationV1 mutation;
    Expect(!recording::ParseRecordingMutationV1(binding,&mutation,&error), "S10-O05 reservation entity envelope binding rejects mismatch");
    binding=OrderLine("request-1","segment-1","1");
    binding.replace(binding.find("\"mutationId\":\"request-1\""), std::string("\"mutationId\":\"request-1\"").size(), "\"mutationId\":\"other\"");
    Expect(!recording::ParseRecordingMutationV1(binding,&mutation,&error), "S10-O05 reservation request envelope binding rejects mismatch");
    const std::string valid_payload=R"({"schema":"media-server.recording-order.v1","storeId":"store-1","requestId":"r","segmentId":"s","channelId":"c","sequence":1})";
    Expect(recording::ParseRecordingOrderReservationV1(valid_payload,&parsed,&error) && parsed.sequence==1,
        "S10-O01 strict reservation parser accepts versioned literal");
    for (const auto& invalid_payload : {
        std::string(R"({"schema":"future","storeId":"store-1","requestId":"r","segmentId":"s","channelId":"c","sequence":1})"),
        std::string(R"({"schema":"media-server.recording-order.v1","storeId":"store-1","requestId":"r","segmentId":"s","sequence":1})"),
        valid_payload.substr(0,valid_payload.size()-1)+",\"extra\":1}",
        valid_payload.substr(0,valid_payload.size()-1)+",\"sequence\":1}"}) {
        Expect(!recording::ParseRecordingOrderReservationV1(invalid_payload,&parsed,&error),
            "S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys");
    }
    const auto maximum = root / "maximum.jsonl";
    { std::ofstream out(maximum); out << OrderLine("request-max","segment-max","9223372036854775807"); }
    recording::RecordingJournal max_journal(maximum);
    const auto max_before=ReadBytes(maximum);
    Expect(max_journal.Open(&error) && max_journal.ReserveRecordingOrder("store-1","request-max","segment-max","channel-1",&result,&error)
        && result.sequence==std::numeric_limits<std::int64_t>::max(), "S10-O06 INT64_MAX identical retry remains valid");
    Expect(!max_journal.ReserveRecordingOrder("store-1","new-request","new-segment","channel-1",&result,&error)
        && ReadBytes(maximum)==max_before, "S10-O06 sequence overflow rejected without write");
    const auto duplicates=root/"identical.jsonl";
    const auto identical=OrderLine("same-r","same-s","1")+OrderLine("same-r","same-s","1");
    { std::ofstream out(duplicates); out<<identical; }
    recording::RecordingJournal duplicate_journal(duplicates);
    Expect(duplicate_journal.Open(&error) && duplicate_journal.ReserveRecordingOrder("store-1","same-r","same-s","channel-1",&result,&error) &&
        result.sequence==1 && ReadBytes(duplicates)==identical, "S10-O02 identical durable reservation duplicates remain idempotent");
    const auto gaps=root/"gaps.jsonl";
    { std::ofstream out(gaps); out<<OrderLine("gap-r1","gap-s1","2")<<OrderLine("gap-r2","gap-s2","4"); }
    recording::RecordingJournal gap_journal(gaps);
    Expect(gap_journal.Open(&error) && gap_journal.ReserveRecordingOrder("store-1","gap-r3","gap-s3","channel-1",&result,&error) &&
        result.sequence==5, "S10-O06 sequence gaps remain valid and allocate above maximum");

    const auto parallel = root / "parallel.jsonl";
    recording::RecordingJournal parallel_journal(parallel);
    const bool parallel_open=parallel_journal.Open(&error);
    int barrier[2]; const bool pipe_ok=pipe(barrier)==0;
    std::vector<pid_t> children;
    std::cout.flush(); std::cerr.flush();
    if (pipe_ok) {
        for (int i=0;i<4;++i) {
            const pid_t pid=fork();
            if (pid==0) {
                close(barrier[1]); char token; if(read(barrier[0],&token,1)!=1) _exit(2); close(barrier[0]);
                recording::RecordingJournal child(parallel); recording::RecordingOrderReservationV1 value;
                const auto id=std::to_string(i);
                _exit(child.Open(&error) && child.ReserveRecordingOrder("store-1","parallel-r"+id,"parallel-s"+id,"channel-1",&value,&error) ? 0 : 1);
            }
            children.push_back(pid);
        }
        close(barrier[0]); const auto written=write(barrier[1],"1234",4); (void)written; close(barrier[1]);
    }
    bool children_ok=parallel_open && pipe_ok && children.size()==4;
    for (auto child:children) if(!WaitChild(child)) children_ok=false;
    Expect(children_ok, "S10-O07 four simultaneous processes finish reservations");
    std::set<std::int64_t> sequences;
    const auto parallel_replay = parallel_journal.Replay();
    for(const auto& entry:parallel_replay.mutations) if(recording::ParseRecordingOrderReservationV1(entry.payload_json,&parsed,&error)) sequences.insert(parsed.sequence);
    Expect(sequences==std::set<std::int64_t>({1,2,3,4}) && parallel_replay.mutations.size()==4 &&
        parallel_replay.corrupt_line_count==0 && parallel_replay.unsupported_record_count==0 &&
        parallel_replay.truncated_tail_count==0 && parallel_replay.io_error_count==0,
        "S10-O07 concurrent sequences are unique and complete");
    Expect(parallel_journal.ReserveRecordingOrder("store-1","parallel-next","parallel-next","channel-1",&result,&error) && result.sequence==5,
        "S10-O07 next sequence follows concurrent reservations");
    recording::RecordingMutationV1 bypass;
    bypass.mutation_id="bypass"; bypass.entity_id="bypass"; bypass.mutation_type=recording::RecordingMutationType::RecordingOrderReserved;
    bypass.payload_json=R"({"schema":"media-server.recording-order.v1","storeId":"store-1","requestId":"bypass","segmentId":"bypass","channelId":"channel-1","sequence":4})";
    Expect(!journal.Append(bypass,&error), "S10-O08 ordinary Append cannot reserve orders");
    recording::RecordingJournal unopened(root / "unopened.jsonl");
    Expect(!unopened.ReserveRecordingOrder("store-1","r","s","c",&result,&error), "S10-O08 unopened journal rejected");
    Expect(!journal.ReserveRecordingOrder("store-1","r","s","c",nullptr,&error), "S10-O08 null result rejected");
    Expect(!journal.ReserveRecordingOrder("../bad","r","s","c",&result,&error), "S10-O08 invalid opaque ID rejected");
    result.sequence=777;
    Expect(!journal.ReserveRecordingOrder("store-1","r","../bad","c",&result,&error) && result.sequence==777,
        "S10-O08 failed reservation does not expose tentative result");

    for(const auto& kind : {"inode","parent","symlink","hardlink"}) {
        const auto directory=root / (std::string("guard-")+kind); std::filesystem::create_directories(directory);
        const auto guarded=directory / "journal.jsonl";
        recording::RecordingJournal guarded_journal(guarded); bool opened=guarded_journal.Open(&error);
        const auto original=ReadBytes(guarded);
        std::filesystem::path saved=directory / "original";
        if(std::string(kind)=="parent") { saved=root / "saved-parent"; std::filesystem::rename(directory,saved); std::filesystem::create_directories(directory); }
        else if(std::string(kind)=="hardlink") std::filesystem::create_hard_link(guarded,saved);
        else { std::filesystem::rename(guarded,saved); if(std::string(kind)=="symlink") std::filesystem::create_symlink(saved,guarded); else {std::ofstream out(guarded);out<<"replacement";} }
        Expect(opened && !guarded_journal.ReserveRecordingOrder("store-1","r","s","c",&result,&error) &&
            ReadBytes(std::string(kind)=="parent"?saved/"journal.jsonl":saved)==original,
            "S10-O09 unsafe file binding rejected and original preserved " + std::string(kind));
    }
    const auto compat=root / "compat"; const auto media=compat / "media"; WriteMp4Header(media/"seg.mp4");
    recording::RecordingJournal compatible(compat / "journal.jsonl");
    bool compatible_open=compatible.Open(&error);
    bool reserved=compatible.ReserveRecordingOrder("store-1","compat-r","seg-compatible","channel-1",&result,&error);
    recording::RecordingCatalog catalog(compatible,{compat/"index.sqlite3",media,true});
    Expect(compatible_open && reserved && catalog.Open(&error) && catalog.FinalizeSegment(Segment("seg-compatible"),(media/"seg.mp4").string(),&error),
        "S10-O10 reservation and normal segment coexist in catalog");
    Expect(compatible.ReserveRecordingOrder("store-1","compat-r","seg-compatible","channel-1",&result,&error) && result.sequence==1,
        "S10-O04 reserve then finalize permits identical retry");
    recording::RecordingCatalog rebuilt(compatible,{compat/"second.sqlite3",media,true});
    Expect(rebuilt.Open(&error) && rebuilt.QuerySegments("channel-1",500,2500).size()==1,
        "S10-O10 reservation survives catalog rebuild without changing segment query");
    const auto legacy_dir=root / "legacy";
    const auto legacy=legacy_dir / "journal.jsonl";
    WriteMp4Header(legacy_dir / "media" / "legacy.mp4");
    recording::RecordingJournal legacy_journal(legacy);
    const bool legacy_open=legacy_journal.Open(&error);
    recording::RecordingCatalog legacy_catalog(legacy_journal,{legacy_dir/"index.sqlite3",legacy_dir/"media",true});
    const bool legacy_finalized=legacy_open && legacy_catalog.Open(&error) &&
        legacy_catalog.FinalizeSegment(Segment("legacy-segment"),(legacy_dir/"media"/"legacy.mp4").string(),&error);
    const auto legacy_before=ReadBytes(legacy);
    Expect(legacy_finalized && !legacy_journal.ReserveRecordingOrder("store-1","fresh-r","legacy-segment","channel-1",&result,&error) && ReadBytes(legacy)==legacy_before,
        "S10-O04 legacy segment cannot acquire retroactive reservation");
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

    UnsupportedJournalCases(root / "unsupported");
    OrderReservationCases(root / "order-reservations");
    std::cout << "[verify-v410-recording-catalog] pass=" << passes << " fail=" << failures << '\n';
    return failures == 0 ? 0 : 1;
}
