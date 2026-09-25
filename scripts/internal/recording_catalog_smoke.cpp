// 파일 용도: v4.1.0 S03 journal/catalog 복구 계약을 실제 C++로 검증한다.
// 동작 요약: 중복·truncate·corrupt replay, SQLite parity/FK, orphan와 DB 격리를 확인한다.
#include "recording/recording_catalog.h"
#include "recording/recording_journal.h"
#include "recording/recording_catalog_snapshot.h"
#include "recording/recording_derived_selection.h"
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#endif

#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>
#include <set>
#include <limits>
#include <sys/wait.h>
#include <unistd.h>
#include <signal.h>
#include <fcntl.h>
#include <cerrno>
#include <sys/stat.h>

namespace {
std::string probe_executable;
bool probe_active = false, probe_flags = true, probe_exec = true;
dev_t probe_device = 0;
ino_t probe_inode = 0;
int probe_count = 0;
std::string fault_operation;
bool fault_hit=false;
bool read_probe_active = false;
std::uint64_t read_probe_bytes = 0, read_probe_calls = 0;
}
void S10ObserveRead(int fd, ssize_t count) {
    const int saved_errno=errno;struct stat status {};
    if(read_probe_active&&::fstat(fd,&status)==0&&status.st_dev==probe_device&&status.st_ino==probe_inode){
        ++read_probe_calls;if(count>0)read_probe_bytes+=static_cast<std::uint64_t>(count);
    }
    errno=saved_errno;
}
bool S10FailJournalCall(const char* operation,int fd) {
    if(fault_operation.empty()||fault_hit)return false;
    struct stat status{};if(::fstat(fd,&status)!=0)return false;
    const std::string actual=std::string(operation)=="fsync"?(S_ISDIR(status.st_mode)?"dir-fsync":"file-fsync"):operation;
    if(actual!=fault_operation)return false;
    fault_hit=true;return true;
}

void S10ObserveDuplicate(int source, int duplicated) {
    const int saved_errno = errno;
    struct stat status {};
    if (probe_active && ::fstat(source, &status) == 0 && status.st_dev == probe_device && status.st_ino == probe_inode) {
        ++probe_count;
        const int flags = ::fcntl(duplicated, F_GETFD);
        probe_flags = probe_flags && flags >= 0 && (flags & FD_CLOEXEC) != 0;
        const auto fd_text = std::to_string(duplicated);
        const auto dev_text = std::to_string(static_cast<std::uint64_t>(probe_device));
        const auto ino_text = std::to_string(probe_inode);
        const pid_t child = ::fork();
        if (child == 0) {
            ::alarm(3);
            ::execl(probe_executable.c_str(), probe_executable.c_str(), "--fd-probe", fd_text.c_str(), dev_text.c_str(), ino_text.c_str(), nullptr);
            _exit(2);
        }
        int result = 0;
        const bool waited = child > 0 && ::waitpid(child, &result, 0) == child;
        probe_exec = probe_exec && waited && WIFEXITED(result) && WEXITSTATUS(result) == 0;
    }
    errno = saved_errno;
}

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

#if MEDIA_SERVER_USE_SQLITE3
std::optional<std::string> ReadSqlText(const std::filesystem::path& path,const char* sql) {
    sqlite3* db=nullptr;sqlite3_stmt* statement=nullptr;std::optional<std::string> result;
    if(sqlite3_open_v2(path.c_str(),&db,SQLITE_OPEN_READONLY,nullptr)==SQLITE_OK&&
       sqlite3_prepare_v2(db,sql,-1,&statement,nullptr)==SQLITE_OK&&sqlite3_step(statement)==SQLITE_ROW) {
        const auto* text=sqlite3_column_text(statement,0);
        if(text)result=std::string(reinterpret_cast<const char*>(text));
        if(sqlite3_step(statement)!=SQLITE_DONE)result.reset();
    }
    if(statement)sqlite3_finalize(statement);if(db)sqlite3_close(db);return result;
}
#endif

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
recording::RecordingSegmentV2 SegmentV2() {
    recording::RecordingSegmentV2 v;
    v.segment_id="v2-segment";v.source_id="source-1";v.channel_id="channel-1";v.store_id="store-1";
    v.order_request_id="v2-request";v.media_epoch_id="media-epoch";v.order_sequence=1;
    v.media_start_pts=0;v.media_end_pts=20;v.container="mp4";v.video_codecs={"h264"};
    v.audio_omitted_reason="none";v.size_bytes=12;v.checksum_sha256=std::string(64,'a');v.created_at_ms=1;v.finalized_at_ms=2;
    v.mappings={{"media-server.recording-utc-mapping.v1","map-a",0,10,"source-capture",100,110,0,""},
                {"media-server.recording-utc-mapping.v1","map-b",10,20,"server-observation",90,100,1,""}};
    return v;
}
std::string V2Line(const recording::RecordingSegmentV2& v,const std::string& id="v2-final",const std::string& path="segment.mp4") {
    recording::RecordingMutationV1 m;m.mutation_type=recording::RecordingMutationType::SegmentV2Finalized;
    m.mutation_id=id;m.entity_id=v.segment_id;m.occurred_at_ms=3;
    m.payload_json="{\"segment\":"+recording::SerializeRecordingSegmentV2(v)+",\"mediaRelpath\":\""+path+"\"}";
    return recording::SerializeRecordingMutationV1(m)+"\n";
}
void V2CatalogCases(const std::filesystem::path& root) {
    using namespace recording;
    const auto media=root/"media";WriteMp4Header(media/"segment.mp4");
    RecordingJournal journal(root/"journal.jsonl");std::string error;
    RecordingCatalog::Options options(root/"index.sqlite3",media,true);options.enable_v2_storage=true;
    RecordingCatalog c(journal,options);const bool opened=journal.Open(&error)&&c.Open(&error);
    auto v=SegmentV2();RecordingOrderReservationV1 order;
    const bool reserved=journal.ReserveRecordingOrder(v.store_id,v.order_request_id,v.segment_id,v.channel_id,&order,&error);
    Expect(opened&&reserved&&c.FinalizeSegmentV2(v,(media/"segment.mp4").string(),&error),"S10-M06 opened catalog accepts fresh exact reservation V2 finalize");
    auto found=c.FindSegmentV2ById(v.segment_id);
    Expect(found&&SerializeRecordingSegmentV2(*found)==SerializeRecordingSegmentV2(v),"S10-M07 V2 find preserves complete metadata");
    bool inserted=true;const auto before=ReadBytes(journal.path());
    Expect(c.ValidateFinalizeRecoveryV2(v,(media/"segment.mp4").string(),&error)&&
        c.RecoverFinalizedSegmentV2(v,(media/"segment.mp4").string(),&inserted,&error)&&!inserted&&ReadBytes(journal.path())==before,
        "S10-M07 identical V2 recovery is idempotent");
    Expect(c.QuerySegments("channel-1",0,1000).empty(),"S10-M07 V2 is absent from V1 range query");
    Expect(c.InspectOrphans().normal_orphan_count==0,"S10-M07 V2 registered path is not orphan");
#if MEDIA_SERVER_USE_SQLITE3
    sqlite3* db=nullptr;sqlite3_stmt* stmt=nullptr;bool sql=false;
    if(sqlite3_open(options.sqlite_path.c_str(),&db)==SQLITE_OK &&
       sqlite3_prepare_v2(db,"SELECT payload_json,media_relpath FROM recording_segments_v2 WHERE segment_id='v2-segment'",-1,&stmt,nullptr)==SQLITE_OK && sqlite3_step(stmt)==SQLITE_ROW)
        sql=std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt,0)))==SerializeRecordingSegmentV2(v)&&
            std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt,1)))=="segment.mp4";
    if(stmt)sqlite3_finalize(stmt);if(db)sqlite3_close(db);
    Expect(sql,"S10-M07 SQLite exact V2 JSON and path match");
#endif
    auto fallback_options=options;fallback_options.prefer_sqlite=false;
    RecordingCatalog fallback(journal,fallback_options);const bool fallback_open=fallback.Open(&error);
    const auto again=fallback.FindSegmentV2ById(v.segment_id);
    Expect(fallback_open&&again&&SerializeRecordingSegmentV2(*again)==SerializeRecordingSegmentV2(v),"S10-M07 JSONL restart preserves V2 exact payload");
    for(const auto& field:{"store","request","segment","channel","sequence"}) {
        auto changed=v;const std::string key(field);
        if(key=="store")changed.store_id="other";else if(key=="request")changed.order_request_id="other";
        else if(key=="segment")changed.segment_id="other";else if(key=="channel")changed.channel_id="other";else changed.order_sequence=2;
        Expect(!c.FinalizeSegmentV2(changed,(media/"segment.mp4").string(),&error)&&ReadBytes(journal.path())==before,
            "S10-M06 wrong reservation tuple rejected "+key);
    }
    auto changed=v;changed.mappings[1].utc_start_ns=80;
    Expect(!c.RecoverFinalizedSegmentV2(changed,(media/"segment.mp4").string(),&inserted,&error)&&ReadBytes(journal.path())==before,
        "S10-M09 immutable V2 mapping mismatch rejected");
    const auto reserved_line=OrderLine("v2-request","v2-segment","1");
    const auto good=reserved_line+V2Line(v);
    for(const auto& item:std::vector<std::pair<std::string,std::string>>{
        {"bad-payload",reserved_line+"{\"schema\":\"media-server.recording-mutation.v1\",\"mutationId\":\"bad\",\"mutationType\":\"segment_v2_finalized\",\"occurredAtMs\":1,\"entityId\":\"v2-segment\",\"payload\":{}}\n"},
        {"missing-order",V2Line(v)}, {"bad-order",OrderLine("v2-request","v2-segment","0")+V2Line(v)},
        {"conflicting-order",reserved_line+OrderLine("other-r","other-s","1")+V2Line(v)},
        {"tail",good+"{"}, {"corrupt",good+"{bad}\n"}, {"unsafe-path",reserved_line+V2Line(v,"v2-final","../escape")}}) {
        const auto dir=root/item.first;WriteMp4Header(dir/"media"/"segment.mp4");
        const auto p=dir/"journal.jsonl";{std::ofstream out(p);out<<item.second;}
        const auto sql_path=dir/"index.sqlite3";{std::ofstream out(sql_path);out<<"sqlite-sentinel";}
        RecordingJournal j(p);const bool jo=j.Open(&error);auto o=options;o.media_root=dir/"media";o.sqlite_path=sql_path;RecordingCatalog bad(j,o);
        Expect(jo&&!bad.Open(&error)&&!bad.Open(&error)&&ReadBytes(p)==item.second&&ReadBytes(sql_path)=="sqlite-sentinel"&&!bad.FindSegmentV2ById(v.segment_id),
            "S10-M09 bad V2 startup retry preserves original state "+item.first);
    }
    const auto off_dir=root/"off";WriteMp4Header(off_dir/"media"/"segment.mp4");
    {std::ofstream out(off_dir/"journal.jsonl");out<<good;}
    {std::ofstream out(off_dir/"index.sqlite3");out<<"sqlite-sentinel";}
    RecordingJournal off_j(off_dir/"journal.jsonl");const bool off_open=off_j.Open(&error);
    RecordingCatalog off(off_j,{off_dir/"index.sqlite3",off_dir/"media",true});
    Expect(off_open&&!off.Open(&error)&&ReadBytes(off_dir/"journal.jsonl")==good&&ReadBytes(off_dir/"index.sqlite3")=="sqlite-sentinel",
        "S10-M09 default off rejects V2 before SQLite changes");
    RecordingMutationV1 legacy;legacy.mutation_type=RecordingMutationType::SegmentFinalized;legacy.mutation_id="legacy-final";legacy.entity_id=v.segment_id;legacy.occurred_at_ms=3;
    legacy.payload_json="{\"segment\":"+SerializeRecordingSegmentV1(Segment(v.segment_id))+",\"mediaRelpath\":\"segment.mp4\"}";
    const auto legacy_line=SerializeRecordingMutationV1(legacy)+"\n";
    RecordingTombstoneV1 tomb;tomb.tombstone_id="v2-deleted";tomb.segment_id=v.segment_id;tomb.source_id=v.source_id;tomb.channel_id=v.channel_id;
    tomb.recorded_range={100,110};tomb.checksum_sha256=v.checksum_sha256;tomb.retention_class=v.retention_class;tomb.deletion_reason="event-retention";tomb.deleted_at_ms=4;
    RecordingMutationV1 deletion;deletion.mutation_type=RecordingMutationType::DeletionCompleted;deletion.mutation_id="delete-v2";deletion.entity_id=v.segment_id;deletion.occurred_at_ms=4;
    deletion.payload_json="{\"tombstone\":"+SerializeRecordingTombstoneV1(tomb)+"}";
    const auto deleted_line=SerializeRecordingMutationV1(deletion)+"\n";
    for(const auto& item:std::vector<std::pair<std::string,std::string>>{
        {"duplicate",good+V2Line(v)}, {"deleted",good+deleted_line},
        {"v1-before",reserved_line+legacy_line+V2Line(v)}, {"v1-after",good+legacy_line},
        {"deleted-before",reserved_line+deleted_line+V2Line(v)}, {"resurrection",good+deleted_line+V2Line(v,"revive")},
        {"mutation-collision",reserved_line+legacy_line+V2Line(v,"legacy-final")}}) {
        const auto dir=root/("replay-"+item.first);WriteMp4Header(dir/"media"/"segment.mp4");
        const auto p=dir/"journal.jsonl";{std::ofstream out(p);out<<item.second;}
        RecordingJournal j(p);auto o=options;o.media_root=dir/"media";o.sqlite_path=dir/"index.sqlite3";
        RecordingCatalog replayed(j,o);const bool jo=j.Open(&error);const bool ok=jo&&replayed.Open(&error);
        const bool accepted=item.first=="duplicate"||item.first=="deleted";
        bool sql_ok=true;
#if MEDIA_SERVER_USE_SQLITE3
        if(accepted&&ok) {
            sqlite3* db2=nullptr;sqlite3_stmt* st=nullptr;sql_ok=false;
            if(sqlite3_open(o.sqlite_path.c_str(),&db2)==SQLITE_OK&&sqlite3_prepare_v2(db2,"SELECT COUNT(*) FROM recording_segments_v2",-1,&st,nullptr)==SQLITE_OK&&sqlite3_step(st)==SQLITE_ROW)
                sql_ok=sqlite3_column_int(st,0)==(item.first=="deleted"?0:1);
            if(st)sqlite3_finalize(st);if(db2)sqlite3_close(db2);
        }
#endif
        const auto f=replayed.FindSegmentV2ById(v.segment_id);
        Expect(jo&&ok==accepted&&ReadBytes(p)==item.second&&sql_ok&&bool(f)==(item.first=="duplicate"),"S10-M09 V2 replay namespace and deletion "+item.first);
    }
    for(const std::string kind:{"missing","directory","mapping","path","tombstone"}) {
        const auto dir=root/("fresh-"+kind);WriteMp4Header(dir/"media"/"segment.mp4");
        RecordingJournal j(dir/"journal.jsonl");auto o=options;o.media_root=dir/"media";o.sqlite_path=dir/"index.sqlite3";
        RecordingCatalog stale(j,o);RecordingOrderReservationV1 r;
        const bool setup=j.Open(&error)&&stale.Open(&error)&&j.ReserveRecordingOrder(v.store_id,v.order_request_id,v.segment_id,v.channel_id,&r,&error);
        auto target=dir/"media"/"segment.mp4";
        if(kind=="missing")target=dir/"media"/"missing.mp4";
        else if(kind=="directory")target=dir/"media";
        else {
            auto newer=v;if(kind=="mapping")newer.mappings[1].utc_start_ns=80;
            std::ofstream out(j.path(),std::ios::app);out<<V2Line(newer,"external-final",kind=="path"?"other.mp4":"segment.mp4");
            if(kind=="tombstone") {
                RecordingTombstoneV1 t;t.tombstone_id="deleted-v2";t.segment_id=v.segment_id;t.source_id=v.source_id;t.channel_id=v.channel_id;
                t.recorded_range={100,110};t.checksum_sha256=v.checksum_sha256;t.retention_class=v.retention_class;t.deletion_reason="event-retention";t.deleted_at_ms=4;
                RecordingMutationV1 m;m.mutation_type=RecordingMutationType::DeletionCompleted;m.mutation_id="external-delete";m.entity_id=v.segment_id;m.occurred_at_ms=4;
                m.payload_json="{\"tombstone\":"+SerializeRecordingTombstoneV1(t)+"}";out<<SerializeRecordingMutationV1(m)<<'\n';
            }
        }
        const auto original=ReadBytes(j.path());
        if(kind=="missing"||kind=="directory")
            Expect(setup&&!stale.FinalizeSegmentV2(v,target.string(),&error)&&ReadBytes(j.path())==original,"S10-M09 V2 finalize rejects "+kind+" media");
        else {
            const bool validation=stale.ValidateFinalizeRecoveryV2(v,target.string(),&error);
            const bool finalized=stale.FinalizeSegmentV2(v,target.string(),&error);
            Expect(setup&&!validation&&!finalized&&ReadBytes(j.path())==original,"S10-M09 fresh candidate rejects "+kind);
        }
    }
}
#if MEDIA_SERVER_USE_OPENSSL
std::string SnapshotHash(const std::string& bytes) {
    unsigned char digest[EVP_MAX_MD_SIZE]; unsigned length=0;
    if(EVP_Digest(bytes.data(),bytes.size(),digest,&length,EVP_sha256(),nullptr)!=1||length!=32)return {};
    const char* hex="0123456789abcdef";std::string result;
    for(unsigned i=0;i<length;++i){result+=hex[digest[i]>>4];result+=hex[digest[i]&15];}
    return result;
}
bool SnapshotChain(recording::RecordingJournal& journal,recording::RecordingIdentityChainResult* result,std::string* error) {
    using namespace recording;
    RecordingIdentityShard shard;shard.store_id=journal.ManagedStoreId();shard.generation=1;
    std::string archive;
    const auto replay=journal.Replay();
    if(replay.io_error_count||replay.corrupt_line_count||replay.truncated_tail_count||replay.unsupported_record_count)
        return false;
    for(const auto& mutation:replay.mutations) {
        const auto canonical=SerializeRecordingMutationV1(mutation);const auto raw=canonical+"\n";
        RecordingIdentityRow row;row.mutation_id=mutation.mutation_id;row.type=mutation.mutation_type;
        row.entity_id=mutation.entity_id;row.occurred_at_ms=mutation.occurred_at_ms;
        row.global_ordinal=shard.rows.size();row.identity=SnapshotHash(canonical);
        row.offset=archive.size();row.length=raw.size();row.raw_sha256=SnapshotHash(raw);
        if(row.type==RecordingMutationType::RecordingOrderReserved) {
            RecordingOrderReservationV1 order;
            if(!ParseRecordingOrderReservationV1(mutation.payload_json,&order,error))return false;
            row.reservation=order;
        }
        shard.rows.push_back(row);archive+=raw;
    }
    // 이 fixture는 checkpoint 이전 v1 원문만 사용한다. 합성 locator를 실제 원장 byte와 대조한다.
    if(ReadBytes(journal.path())!=archive){if(error)*error="fixture 원문/locator 불일치";return false;}
    shard.archives.push_back({"active-1.jsonl",archive.size(),SnapshotHash(archive)});
    std::string bytes;if(!SerializeRecordingIdentityShard(shard,&bytes,error))return false;
    RecordingGenerationFile head{"identity-1.jsonl",bytes.size(),SnapshotHash(bytes)};
    return ValidateRecordingIdentityShardChain(head,[&](const auto& file,std::uint64_t limit,std::string* out,std::string*) {
        if(file.name!=head.name||bytes.size()>limit)return false;*out=bytes;return true;
    },{1024*1024,100,10},result,error);
}
void GenerationSnapshotExportCases(const std::filesystem::path& root) {
    using namespace recording;
    bool good=true;std::string error;
    const auto check=[&](bool value,const char* detail){if(!value)std::cerr<<"B02-P02 assertion: "<<detail<<" "<<error<<'\n';good=value&&good;};
    std::filesystem::create_directories(root);
    const auto managed_root=std::filesystem::canonical(root);
    RecordingJournal journal(RecordingJournal::ManagedOptions{managed_root,"store-1"});
    RecordingCatalog::Options options(managed_root/"recording-catalog.sqlite3",managed_root,false);options.enable_v2_storage=true;
    RecordingCatalog catalog(journal,options);
    if(!journal.Open(&error)||!catalog.Open(&error)){check(false,"managed fixture setup");Expect(false,"B02-P02 setup");return;}
    WriteMp4Header(managed_root/"legacy.mp4");
    check(catalog.FinalizeSegment(Segment("legacy"),(managed_root/"legacy.mp4").string(),&error),"legacy current projection");
    auto segment=SegmentV2();
    segment.media_end_pts=20000000;
    segment.mappings={{"media-server.recording-utc-mapping.v1","map",0,20000000,
        "server-observation",100000000,120000000,1,"observed"}};
    RecordingOrderReservationV1 order;
    check(journal.ReserveRecordingOrder("store-1",segment.order_request_id,segment.segment_id,segment.channel_id,&order,&error),"live reservation");
    RecordingSourceBindingV1 binding;binding.segment_id=segment.segment_id;binding.source_id=segment.source_id;
    binding.channel_id=segment.channel_id;binding.store_id=segment.store_id;binding.media_epoch_id=segment.media_epoch_id;
    binding.source_generation="generation";binding.generation_order=1;binding.track_id="video/0";
    binding.samples={{1,0},{2,10000000}};binding.last_accepted_ordinal=2;
    WriteMp4Header(managed_root/"bound.mp4");
    check(catalog.FinalizeBoundSegmentV2(segment,binding,(managed_root/"bound.mp4").string(),&error),"bound current projection");
    RecordingConsumerReferenceV1 reference;reference.reference_id="request";reference.kind="event";
    reference.owner_id="event";reference.source_id=segment.source_id;reference.channel_id=segment.channel_id;
    reference.analysis_namespace="tap-r0";reference.analysis_track_id="track-1";
    reference.association_quality="timestamp-match";
    reference.original=RecordingConsumerOriginalV1{"generation",1,1,"video/0",0};
    reference.request=RecordingConsumerRequestV1{"media-pts-ms",0,20,0,0};
    analysis::DecodedIntervalCollector collector;
    for(int i=0;i<2;++i){analysis::DecodedIntervalEvidence frame;frame.analysis_pts_ns=i*10000000;
        frame.duration_ns=10000000;
        frame.association={analysis::SourceAssociationQuality::TimestampMatch,
            analysis::OriginalSampleIdentity{"generation",1,static_cast<std::uint64_t>(i+1),"video/0",
                static_cast<std::uint64_t>(i*10000000)}};collector.Append(frame);}
    DerivedSourceEvidence source{segment,binding,false};DerivedRecordingSelection selection;
    DerivedJobIntentV1 intent;
    RetentionCoordinator retention(catalog,[&]{return catalog.RetentionSnapshot();},
        [](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},
        [](const auto&,auto*){return false;},{0,1,managed_root});
    check(SelectDerivedRecording(reference,*collector.Snapshot("tap-r0"),{source},nullptr,&selection,&error)&&
        BuildDerivedJobIntent(selection,{source},4096,10,&intent,&error)&&
        retention.UpdateChannelPolicy(segment.channel_id,{1024ULL*1024*1024,0,1024ULL*1024*1024,0},&error)&&
        retention.AdmitDerivedJob(catalog,intent,10).accepted,"active job current projection");
    RecordingIdentityChainResult chain;
    check(SnapshotChain(journal,&chain,&error),"identity chain and actual journal bytes");
    if(!good){Expect(false,"B02-P02 export");return;}
    const auto cut=chain.maximum_global_ordinal.value_or(0)+1;
    const auto before=ReadBytes(journal.path());
    RecordingCatalogSnapshot snapshot;std::string canonical;
    check(catalog.ExportGenerationSnapshot(chain,1,cut,&snapshot,&error),"live export including reservation absent from catalog ID set");
    check(SerializeRecordingCatalogSnapshot(snapshot,&canonical,&error),"canonical value output");
    bool source_row=false,job_row=false,legacy=false,v2=false,accepted=false;
    for(const auto& row:snapshot.rows) {
        if(row.kind=="source-binding") {RecordingCatalogSourceSummary summary;
            check(ParseRecordingCatalogSourceSummary(row.value_json,&summary,&error)&&summary.id==segment.segment_id&&
                summary.channel==binding.channel_id&&summary.source==binding.source_id&&
                summary.generation==binding.source_generation&&summary.track==binding.track_id&&
                summary.order==binding.generation_order&&summary.sample_count==binding.samples.size()&&
                !summary.latest_mutation_id.empty(),"thin source namespace and provenance");source_row=true;}
        if(row.kind=="derived-job") {RecordingCatalogJobSummary summary;
            check(ParseRecordingCatalogJobSummary(row.value_json,&summary,&error)&&summary.id==intent.job_id&&
                summary.channel==reference.channel_id&&summary.state==DerivedJobState::Intent&&
                summary.reference==reference.reference_id&&summary.files==0&&
                summary.reserved_bytes==intent.reserved_bytes&&summary.output_ids.size()==intent.outputs.size()&&
                summary.source_ids==std::vector<std::string>{segment.segment_id}&&
                !summary.latest_mutation_id.empty(),"thin active job and provenance");job_row=true;}
        legacy=legacy||row.kind=="segment-v1";v2=v2||row.kind=="segment-v2";accepted=accepted||row.kind=="accepted-state";
        check(row.kind!="hold"&&row.kind!="fd"&&row.kind!="cache","transient state excluded");
    }
    check(source_row&&job_row&&legacy&&v2&&accepted,"current map rows present");
    const auto reject=[&](const RecordingIdentityChainResult& bad,std::uint64_t gen,std::uint64_t boundary,const char* label) {
        auto output=snapshot;std::string after;
        const bool rejected=!catalog.ExportGenerationSnapshot(bad,gen,boundary,&output,&error);
        const bool unchanged=SerializeRecordingCatalogSnapshot(output,&after,&error)&&after==canonical;
        check(rejected&&unchanged,label);
    };
    auto bad=chain;bad.store_id="other-store";reject(bad,1,cut,"store mismatch preserves output");
    reject(chain,2,cut,"head generation mismatch preserves output");
    reject(chain,1,*chain.maximum_global_ordinal,"exclusive cut rejects equality");
    bad=chain;bad.first_acceptances.pop_back();reject(bad,1,cut,"missing current identity");
    bad=chain;bad.first_acceptances.push_back(bad.first_acceptances.front());reject(bad,1,cut,"duplicate identity");
    bad=chain;bad.order_history.reservations.front().order.channel_id="other-channel";reject(bad,1,cut,"reservation tuple mismatch");
    bad=chain;bad.order_history.reservations.front().occurred_at_ms++;reject(bad,1,cut,"reservation time mismatch");
    bad=chain;
    for(auto& first:bad.first_acceptances)if(first.first_row.type==RecordingMutationType::SegmentV2BoundFinalized)
        first.first_row.entity_id=segment.source_id;
    reject(bad,1,cut,"source namespace cannot replace segment identity");
    bad=chain;
    for(auto& first:bad.first_acceptances)if(first.first_row.type==RecordingMutationType::SegmentV2BoundFinalized)
        first.first_row.type=RecordingMutationType::SegmentV2Finalized;
    reject(bad,1,cut,"source latest mutation type mismatch");
    check(ReadBytes(journal.path())==before&&!std::filesystem::exists(managed_root/"recording-generation.json"),"no journal mutation or publication");
    Expect(good,"B02-P02 current Catalog export and independent rejection; not cutover/import/raw locator validation");
}
#endif
void GenerationFallbackGuardCases(const std::filesystem::path& root) {
    using recording::RecordingJournal;
    std::string error;
    // 저장 계약 spec의 미래 v2 marker literal이다. 이 fixture는 제품 v2 Open을 허용하지 않는다.
    const std::string v2_marker="{\"format\":\"media-server.managed-recording-store.v2\",\"storeId\":\"guard-store\",\"manifest\":\"recording-generation.json\"}\n";
    const auto seed=[](RecordingJournal& journal,std::string* message) {
        recording::RecordingMutationV1 mutation;
        mutation.mutation_id="guard-original";mutation.entity_id="guard-entity";
        mutation.mutation_type=recording::RecordingMutationType::EventLinkCreated;
        mutation.occurred_at_ms=1;mutation.payload_json="{}";
        return journal.Open(message)&&journal.Append(mutation,message);
    };
    bool initial=true;
    for(const std::string mode:{"valid-shaped","malformed","empty","directory","dangling-symlink","marker-v2"}) {
        const auto dir=root/mode;
        const auto options=RecordingJournal::ManagedOptions{dir,"guard-store"};
        bool ready=false;
        {RecordingJournal journal(options);ready=seed(journal,&error);}
        const auto path=dir/"recording-v2-mutations.jsonl", marker=dir/".recording-store-format";
        const auto before=ReadBytes(path);
        auto format=ReadBytes(marker);
        {RecordingJournal normal(options);ready=normal.Open(&error)&&ready;}
        const auto manifest=dir/"recording-generation.json";
        std::error_code ec;
        if(mode=="marker-v2") {
            std::ofstream out(marker,std::ios::binary|std::ios::trunc);out<<v2_marker;out.close();
            ready=static_cast<bool>(out)&&!std::filesystem::exists(manifest)&&ready;
            format=v2_marker;
        } else if(mode=="directory")std::filesystem::create_directory(manifest,ec);
        else if(mode=="dangling-symlink")std::filesystem::create_symlink("missing-target",manifest,ec);
        else {
            std::ofstream out(manifest);
            if(mode=="malformed")out<<"{broken";
            if(mode=="valid-shaped")out<<"{\"schema\":\"media-server.recording-generation.v1\",\"storeId\":\"guard-store\",\"generation\":1,\"cutOrdinal\":1,\"snapshot\":{\"name\":\"snapshot-1.jsonl\",\"size\":0,\"sha256\":\""<<std::string(64,'a')<<"\"},\"active\":{\"name\":\"active-1.jsonl\",\"size\":0,\"sha256\":\""<<std::string(64,'a')<<"\"},\"evidence\":[]}\n";
            ready=static_cast<bool>(out)&&ready;
        }
        RecordingJournal denied(options);
        const bool ok=ready&&!ec&&!denied.Open(&error)&&ReadBytes(path)==before&&ReadBytes(marker)==format;
        if(!ok)std::cerr<<"B02-G01 assertion: "<<mode<<'\n';
        initial=ok&&initial;
    }
    Expect(initial,"B02-G01 manifest presence or exact v2 marker rejects v1 fallback and preserves bytes; normal v1 reopen retained");
    bool live=true;
    for(const std::string replacement:{"manifest","marker-v2"}) {
    for(const std::string operation:{"append","reserve","replay","lease","reopen"}) {
        const auto dir=root/("live-"+replacement+"-"+operation);
        RecordingJournal journal(RecordingJournal::ManagedOptions{dir,"guard-store"});
        bool ready=seed(journal,&error);
        const auto before=ReadBytes(journal.path());
        auto format=ReadBytes(dir/".recording-store-format");
        if(replacement=="marker-v2") {
            std::ofstream out(dir/".recording-store-format",std::ios::binary|std::ios::trunc);
            out<<v2_marker;out.close();ready=static_cast<bool>(out)&&ready;format=v2_marker;
            ready=!std::filesystem::exists(dir/"recording-generation.json")&&ready;
        } else {
            std::ofstream out(dir/"recording-generation.json");out<<"{broken";out.close();
            ready=static_cast<bool>(out)&&ready;
        }
        bool denied=false;
        if(operation=="append") {
            recording::RecordingMutationV1 mutation;mutation.mutation_id="guard-new";mutation.entity_id="guard-entity";
            mutation.mutation_type=recording::RecordingMutationType::EventLinkCreated;mutation.payload_json="{}";
            denied=!journal.Append(mutation,&error);
        } else if(operation=="reserve") {
            recording::RecordingOrderReservationV1 reservation;
            denied=!journal.ReserveRecordingOrder("guard-store","guard-request","guard-segment","channel",&reservation,&error);
        } else if(operation=="replay")denied=journal.Replay().io_error_count!=0;
        else if(operation=="lease")denied=!journal.HasManagedLease()&&journal.ManagedStoreId().empty();
        else denied=!journal.Open(&error);
        const bool ok=ready&&denied&&ReadBytes(journal.path())==before&&ReadBytes(dir/".recording-store-format")==format;
        if(!ok)std::cerr<<"B02-G02 assertion: "<<replacement<<'/'<<operation<<'\n';
        live=ok&&live;
    }
    }
    Expect(live,"B02-G02 live v1 read/write/binding reject manifest appearance or exact v2 marker replacement without byte changes");
}

void ManagedStoreCases(const std::filesystem::path& root) {
    using recording::RecordingJournal;using recording::RecordingOrderReservationV1;
    std::string error;const auto dir=root/"owned";
    const auto mutation=[](const std::string& id){recording::RecordingMutationV1 m;m.mutation_id=id;m.entity_id="managed-legacy";
        m.mutation_type=recording::RecordingMutationType::SegmentFinalized;m.occurred_at_ms=2000;
        m.payload_json="{\"segment\":"+recording::SerializeRecordingSegmentV1(Segment("managed-legacy"))+",\"mediaRelpath\":\"legacy.mp4\"}";return m;};
    const auto options=RecordingJournal::ManagedOptions{dir,"managed-store"};
    {
        RecordingJournal owner(options);
        Expect(owner.Open(&error)&&owner.HasManagedLease(),"S10-SW01 managed empty root opens with lifetime lease");
        RecordingJournal other(options);
        Expect(!other.Open(&error)&&owner.HasManagedLease(),"S10-SW02 same process second managed owner denied");
        std::cout.flush();std::cerr.flush();const pid_t pid=::fork();
        if(pid==0){::alarm(3);RecordingJournal second(options);RecordingOrderReservationV1 value;
            const bool denied=!owner.HasManagedLease()&&!owner.Open(&error)&&!owner.ReserveRecordingOrder("managed-store","fork-r","fork-s","c",&value,&error)&&owner.Replay().io_error_count==1&&!second.Open(&error);
            _exit(denied?0:1);}
        int status=0;const bool waited=pid>0&&::waitpid(pid,&status,0)==pid;
        Expect(waited&&WIFEXITED(status)&&WEXITSTATUS(status)==0&&owner.HasManagedLease(),"S10-SW03 different process owner and inherited use denied");
        RecordingOrderReservationV1 reservation;
        auto ordinary=mutation("managed-event");
        struct stat owned_status {};const bool probe_ready=::stat(owner.path().c_str(),&owned_status)==0;
        probe_device=owned_status.st_dev;probe_inode=owned_status.st_ino;probe_active=probe_ready;
        const bool reserved=owner.ReserveRecordingOrder("managed-store","managed-r","managed-s","channel-1",&reservation,&error);
        const bool appended=owner.Append(ordinary,&error);const auto replay=owner.Replay();
        probe_active=false;
        Expect(probe_ready&&probe_count==3&&probe_flags&&probe_exec,"S10-SW12 managed duplicate descriptors are close-on-exec");
        Expect(reserved&&reservation.sequence==1&&appended&&replay.mutations.size()==2&&replay.io_error_count==0&&replay.corrupt_line_count==0,
            "S10-SW05 managed reserve append replay use owned descriptor");
        RecordingJournal raw(owner.path());RecordingJournal legacy(dir/"recording-mutations.jsonl");
        errno=0;const int old_fd=::open((dir/"recording-mutations.jsonl").c_str(),O_RDWR|O_APPEND|O_CREAT|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK,0640);
        const int old_error=errno;if(old_fd>=0)::close(old_fd);
        Expect(!raw.Open(&error)&&!legacy.Open(&error)&&old_fd<0&&old_error==EISDIR,"S10-SW06 raw managed access and legacy default path denied");
        const auto before=ReadBytes(owner.path());
        Expect(!owner.ReserveRecordingOrder("other-store","other-r","other-s","channel-1",&reservation,&error)&&ReadBytes(owner.path())==before,
            "S10-SW01 managed Reserve rejects different store identity");
        recording::RecordingCatalog::Options catalog_options{dir/"recording-catalog.sqlite3",dir,false};catalog_options.enable_v2_storage=true;
        recording::RecordingCatalog catalog(owner,catalog_options);
        Expect(owner.HasManagedLease()&&catalog.Open(&error)&&owner.HasManagedLease(),"S10-SW10 catalog connection can inspect managed lease");
    }
    RecordingJournal reopened(options);
    Expect(reopened.Open(&error)&&reopened.HasManagedLease()&&reopened.Replay().mutations.size()==2,"S10-SW04 owner destruction releases lease");
    RecordingJournal wrong(RecordingJournal::ManagedOptions{dir,"other-store"});
    Expect(!wrong.Open(&error),"S10-SW01 managed reopen rejects different store identity");
    const auto tail_root=root/"managed-tail";
    RecordingJournal tail(RecordingJournal::ManagedOptions{tail_root,"managed-store"});const bool tail_open=tail.Open(&error);
    {std::ofstream out(tail.path(),std::ios::app);out<<"{incomplete";}
    const auto tail_before=ReadBytes(tail.path());
    Expect(tail_open&&!tail.Append(mutation("after-tail"),&error)&&ReadBytes(tail.path())==tail_before&&
        !std::filesystem::exists(tail.path().string()+".tail-0-11-0"),"S10-SW11 managed incomplete tail rejects append without changing bytes");
    const auto legacy=root/"legacy";std::filesystem::create_directories(legacy);{std::ofstream out(legacy/"recording-mutations.jsonl");out<<"legacy-original";}
    RecordingJournal refuse(RecordingJournal::ManagedOptions{legacy,"managed-store"});
    Expect(!refuse.Open(&error)&&ReadBytes(legacy/"recording-mutations.jsonl")=="legacy-original"&& !std::filesystem::exists(legacy/".recording-store-lease"),
        "S10-SW07 legacy nonempty root preserved without conversion");
    const std::string format="{\"format\":\"media-server.managed-recording-store.v1\",\"storeId\":\"managed-store\",\"journal\":\"recording-v2-mutations.jsonl\"}\n";
    for(const std::string stage:{"lease","init","barrier","journal","incomplete","unknown"}) {
        const auto partial=root/("partial-"+stage);std::filesystem::create_directories(partial);
        {std::ofstream out(partial/".recording-store-lease");}
        if(stage!="lease"){std::ofstream out(partial/".recording-store-init");out<<(stage=="incomplete"?"{":format);}
        if(stage=="barrier"||stage=="journal")std::filesystem::create_directory(partial/"recording-mutations.jsonl");
        if(stage=="journal"){std::ofstream out(partial/"recording-v2-mutations.jsonl");}
        if(stage=="unknown"){std::ofstream out(partial/"foreign");out<<"keep";}
        RecordingJournal retry(RecordingJournal::ManagedOptions{partial,"managed-store"});const bool success=retry.Open(&error);
        const bool valid=stage!="incomplete"&&stage!="unknown";
        const bool bytes=valid?(ReadBytes(partial/".recording-store-format")==format&&!std::filesystem::exists(partial/".recording-store-init")):
            ReadBytes(partial/".recording-store-init")== (stage=="incomplete"?"{":format);
        Expect(success==valid&&bytes,"S10-SW08 partial initialization retry validates exact state "+stage);
    }
    for(const std::string kind:{"journal","marker","barrier","root-symlink"}) {
        const auto bound=root/("binding-"+kind);RecordingJournal managed(RecordingJournal::ManagedOptions{bound,"managed-store"});
        const bool opened=managed.Open(&error);
        if(kind=="journal"){std::filesystem::rename(managed.path(),bound/"old-journal");std::ofstream out(managed.path());out<<"replacement";}
        if(kind=="marker"){std::ofstream out(bound/".recording-store-format");out<<"wrong";}
        if(kind=="barrier"){std::filesystem::rename(bound/"recording-mutations.jsonl",bound/"old-barrier");std::filesystem::create_directory(bound/"recording-mutations.jsonl");}
        bool rejected=false;
        if(kind=="root-symlink") {const auto link=root/"linked-root";std::filesystem::create_directory_symlink(bound,link);RecordingJournal via(RecordingJournal::ManagedOptions{link,"managed-store"});rejected=!via.Open(&error)&&managed.HasManagedLease();}
        else rejected=!managed.HasManagedLease()&&managed.Replay().io_error_count==1&&!managed.Append(mutation("denied"),&error);
        Expect(opened&&rejected,"S10-SW09 symlink inode and malformed marker rejected "+kind);
    }
}
}  // namespace

void ManagedCatalogCases(const std::filesystem::path& root) {
    using recording::RecordingJournal;using recording::RecordingCatalog;
    std::string error;
    const auto options=[](const std::filesystem::path& dir){RecordingCatalog::Options o{dir/"recording-catalog.sqlite3",dir,false};o.enable_v2_storage=true;return o;};
    const auto dir=root/"owner";RecordingJournal journal(RecordingJournal::ManagedOptions{dir,"store"});
    const bool opened=journal.Open(&error);
    auto segment=Segment("owner-segment");const auto media=dir/"owner.mp4";WriteMp4Header(media);
    {
        RecordingCatalog owner(journal,options(dir));const bool ready=opened&&owner.Open(&error)&&owner.FinalizeSegment(segment,media.string(),&error);
        RecordingCatalog second(journal,options(dir));
        Expect(ready&&!second.Open(&error),"S10-SB01 second managed catalog is denied");
        const auto before=ReadBytes(journal.path());auto other=Segment("failed-owner");
        recording::EventSourceLease lease;
        Expect(!second.FinalizeSegment(other,media.string(),&error)&&!second.AdjustHoldCount(segment.segment_id,1,&error)&&
            !second.AcquireEventSourceLease(segment.channel_id,segment.stream_epoch_id,{segment.segment_id},&lease,&error)&&ReadBytes(journal.path())==before,
            "S10-SB02 failed catalog cannot mutate journal or holds");
        recording::RecordingMutationV1 m;m.mutation_id="unowned";m.entity_id=segment.segment_id;m.occurred_at_ms=2000;
        m.mutation_type=recording::RecordingMutationType::SegmentFinalized;
        m.payload_json="{\"segment\":"+recording::SerializeRecordingSegmentV1(segment)+",\"mediaRelpath\":\"owner.mp4\"}";
        const bool denied=!journal.Append(m,&error)&&ReadBytes(journal.path())==before;
        recording::RecordingOrderReservationV1 order;
        Expect(denied&&journal.ReserveRecordingOrder("store","reserve","new-segment","channel-1",&order,&error),"S10-SB03 attached catalog blocks unowned append but permits reservation");
    }
    RecordingCatalog next(journal,options(dir));Expect(next.Open(&error),"S10-SB04 catalog destruction releases attachment");
    for(const std::string mode:{"outside","dotdot","media-symlink","sqlite-symlink","sqlite-hardlink","disabled"}) {
        const auto r=root/mode;RecordingJournal j(RecordingJournal::ManagedOptions{r,"store"});const bool ok=j.Open(&error);auto o=options(r);
        const auto outside=root/(mode+"-outside");std::filesystem::create_directories(outside);
        if(mode=="outside")o.sqlite_path=outside/"catalog.sqlite3";
        if(mode=="dotdot")o.media_root=r/".."/mode;
        if(mode=="media-symlink"){std::filesystem::create_directory_symlink(r,outside/"link");o.media_root=outside/"link";}
        if(mode=="sqlite-symlink"||mode=="sqlite-hardlink"){
            std::ofstream(outside/"original")<<"original";
            if(mode=="sqlite-symlink")std::filesystem::create_symlink(outside/"original",o.sqlite_path);
            else std::filesystem::create_hard_link(outside/"original",o.sqlite_path);
        }
        if(mode=="disabled")o.enable_v2_storage=false;
        const auto before=ReadBytes(j.path());RecordingCatalog bad(j,o);
        Expect(ok&&!bad.Open(&error)&&ReadBytes(j.path())==before&&
            (!std::filesystem::exists(outside/"original")||ReadBytes(outside/"original")=="original"),"S10-SB05 managed catalog rejects unsafe options "+mode);
    }
    const auto failroot=root/"open-failure";bool rejected=false;
    {
        RecordingJournal failed(RecordingJournal::ManagedOptions{failroot,"store"});const bool ready=failed.Open(&error);
        {std::ofstream(failed.path(),std::ios::app)<<"{\"schema\":\"future\"}\n";}
        RecordingCatalog bad(failed,options(failroot));rejected=ready&&!bad.Open(&error);
        // poison 객체는 재사용하지 않고 fixture 원문 복구 후 수명을 종료한다.
        std::ofstream(failed.path(),std::ios::trunc).close();
    }
    RecordingJournal renewed(RecordingJournal::ManagedOptions{failroot,"store"});
    const bool reopened=renewed.Open(&error);RecordingCatalog recovered(renewed,options(failroot));
    Expect(rejected&&reopened&&recovered.Open(&error),"S10-SB06 failed open releases catalog attachment");
    for(const std::string suffix:{"-wal","-shm","-journal"})for(const std::string kind:{"symlink","hardlink"}) {
        const auto r=root/("sidecar"+suffix+kind);RecordingJournal j(RecordingJournal::ManagedOptions{r,"store"});const bool ok=j.Open(&error);
        auto o=options(r);o.prefer_sqlite=true;const auto original=root/("original"+suffix+kind);
        std::ofstream(original)<<"preserved-sidecar";const auto sidecar=std::filesystem::path(o.sqlite_path.string()+suffix);
        if(kind=="symlink")std::filesystem::create_symlink(original,sidecar);else std::filesystem::create_hard_link(original,sidecar);
        const auto before=ReadBytes(j.path());RecordingCatalog bad(j,o);
        Expect(ok&&!bad.Open(&error)&&ReadBytes(j.path())==before&&ReadBytes(original)=="preserved-sidecar"&&!std::filesystem::exists(o.sqlite_path),
            "S10-SB07 managed SQLite sidecar rejected "+suffix+" "+kind);
    }
}

void ManagedGrowthCases(const std::filesystem::path& root) {
    using namespace recording;std::string error;
    std::string expected_link,expected_v2,checkpoint_bytes;RecordingMutationV1 original_retry;
    {
    RecordingJournal j(RecordingJournal::ManagedOptions{root,"store-1"});const bool opened=j.Open(&error);
    RecordingCatalog::Options o{root/"recording-catalog.sqlite3",root,true};o.enable_v2_storage=true;
    RecordingCatalog c(j,o);const bool ready=opened&&c.Open(&error);
    EventRecordingLinkV1 link;link.link_id="growth-link";link.event_id="growth-event";link.source_id="source-1";link.channel_id="channel-1";
    link.time_basis="utc-ms";link.status=EventRecordingLinkStatus::Pending;link.created_at_ms=1000;link.updated_at_ms=1000;link.requested_range={1000,2000};
    bool writes=ready;for(int i=0;i<12;++i){link.updated_at_ms=1000+i;link.completeness_reason=std::string(200,'x');writes=c.PutEventLink(link,&error)&&writes;}
    Expect(writes,"S10-SC01 managed repeated event fixture is valid");
    const auto before=j.Replay();
    struct stat st{};::stat(j.path().c_str(),&st);probe_device=st.st_dev;probe_inode=st.st_ino;read_probe_bytes=read_probe_calls=0;read_probe_active=true;
    RecordingOrderReservationV1 order;bool reserved=true;
    for(int i=0;i<8;++i)reserved=j.ReserveRecordingOrder("store-1","growth-r"+std::to_string(i),"growth-s"+std::to_string(i),"channel-1",&order,&error)&&reserved;
    read_probe_active=false;
    Expect(reserved&&read_probe_bytes<1024&&read_probe_calls<32,"S10-SC02 managed reservations avoid history reads");
    auto v=SegmentV2();v.order_request_id="growth-v2";v.segment_id="growth-v2-segment";v.order_sequence=9;
    WriteMp4Header(root/"v2.mp4");const bool vr=j.ReserveRecordingOrder("store-1",v.order_request_id,v.segment_id,v.channel_id,&order,&error);
    read_probe_bytes=read_probe_calls=0;read_probe_active=true;const bool vf=c.FinalizeSegmentV2(v,(root/"v2.mp4").string(),&error);read_probe_active=false;
    Expect(vr&&vf&&read_probe_bytes<1024,"S10-SC03 managed V2 finalize avoids full replay");
    const auto original=ReadBytes(j.path());const bool compacted=c.Checkpoint(&error);const auto after=j.Replay();
    Expect(compacted&&ReadBytes(j.path()).size()<original.size(),"S10-SC04 checkpoint reduces superseded event payload bytes");
    const auto found=c.FindEventLinkByEventId(link.event_id);
    Expect(compacted&&found&&SerializeEventRecordingLinkV1(*found)==SerializeEventRecordingLinkV1(link)&&after.mutations.size()==before.mutations.size()+10,
        "S10-SC05 checkpoint preserves latest event and all record identities");
    Expect(compacted&&c.FindSegmentV2ById(v.segment_id)&&c.Checkpoint(&error),"S10-SC06 checkpoint is idempotent and preserves V2");
    original_retry=before.mutations.front();expected_link=SerializeEventRecordingLinkV1(link);expected_v2=SerializeRecordingSegmentV2(v);
    checkpoint_bytes=ReadBytes(j.path());
    bool receipt_ok=after.mutations.size()==22;
    for(std::size_t i=0;i<11&&i<after.mutations.size();++i)receipt_ok=receipt_ok&&
        after.mutations[i].mutation_type==RecordingMutationType::EventLinkReceipt&&
        after.mutations[i].mutation_id==before.mutations[i].mutation_id&&after.mutations[i].entity_id==before.mutations[i].entity_id&&
        after.mutations[i].occurred_at_ms==before.mutations[i].occurred_at_ms;
    Expect(receipt_ok&&!j.Append(after.mutations.front(),&error)&&ReadBytes(j.path())==checkpoint_bytes,
        "S10-SC08 receipt preserves retry identity and rejects direct append");
    }
    for(const bool sqlite:{true,false}) {
        RecordingJournal reopened(RecordingJournal::ManagedOptions{root,"store-1"});const bool jo=reopened.Open(&error);
        const auto saved=ReadBytes(reopened.path());auto conflict=original_retry;conflict.occurred_at_ms++;
        const bool retry=jo&&reopened.Append(original_retry,&error)&&!reopened.Append(conflict,&error)&&ReadBytes(reopened.path())==saved;
        RecordingCatalog::Options options{root/"recording-catalog.sqlite3",root,sqlite};options.enable_v2_storage=true;
        RecordingCatalog again(reopened,options);const bool co=again.Open(&error);const auto l=again.FindEventLinkByEventId("growth-event");
        const auto segment=again.FindSegmentV2ById("growth-v2-segment");
        Expect(retry&&co&&l&&segment&&SerializeEventRecordingLinkV1(*l)==expected_link&&SerializeRecordingSegmentV2(*segment)==expected_v2,
            std::string("S10-SC09 checkpoint restart preserves SQLite and JSONL state ")+(sqlite?"sqlite":"jsonl"));
#if MEDIA_SERVER_USE_SQLITE3
        if(sqlite)Expect(co&&ReadSqlText(options.sqlite_path,"SELECT payload_json FROM recording_segments_v2 WHERE segment_id='growth-v2-segment'")==expected_v2&&
            ReadSqlText(options.sqlite_path,"SELECT media_relpath FROM recording_segments_v2 WHERE segment_id='growth-v2-segment'")=="v2.mp4",
            "S10-SC09 managed checkpoint SQL V2 payload and path");
#endif
    }
    for(const std::string mode:{"prefix","mismatch"}) {
        const auto stage=root/".recording-checkpoint.tmp";const std::string staged=mode=="prefix"?checkpoint_bytes.substr(0,checkpoint_bytes.size()/2):"not-the-candidate";
        {std::ofstream out(stage);out<<staged;}
        RecordingJournal reopened(RecordingJournal::ManagedOptions{root,"store-1"});const bool jo=reopened.Open(&error);RecordingOrderReservationV1 order;
        const bool blocked=jo&&!reopened.ReserveRecordingOrder("store-1","pending-r","pending-s","channel-1",&order,&error);
        RecordingCatalog::Options options{root/"recording-catalog.sqlite3",root,false};options.enable_v2_storage=true;
        RecordingCatalog again(reopened,options);const bool co=again.Open(&error);
        if(mode=="prefix")Expect(blocked&&co&&!std::filesystem::exists(stage)&&ReadBytes(reopened.path())==checkpoint_bytes,
            "S10-SC10 checkpoint prefix recovers before writes");
        else {
            const bool preserved=ReadBytes(stage)==staged&&ReadBytes(reopened.path())==checkpoint_bytes;
            std::filesystem::remove(stage);
            Expect(blocked&&!co&&preserved&&!reopened.Append(original_retry,&error),
                "S10-SC11 checkpoint mismatch preserves bytes and poisons owner");
        }
    }
    {
        // 뒤에 나타난 동일 원문은 첫 receipt의 재시도이며 최신 link를 되돌리지 않는다.
        {std::ofstream out(root/"recording-v2-mutations.jsonl",std::ios::app);out<<SerializeRecordingMutationV1(original_retry)<<'\n';}
        RecordingJournal reopened(RecordingJournal::ManagedOptions{root,"store-1"});const bool jo=reopened.Open(&error);
        RecordingCatalog::Options options{root/"recording-catalog.sqlite3",root,false};options.enable_v2_storage=true;RecordingCatalog again(reopened,options);
        const bool ok=jo&&again.Open(&error)&&again.Checkpoint(&error);const auto l=again.FindEventLinkByEventId("growth-event");
        Expect(ok&&l&&SerializeEventRecordingLinkV1(*l)==expected_link,"S10-SC12 first accepted mutation controls latest event");
        bool writes=ok;
        if(l)for(int i=0;i<2300;++i){auto update=*l;update.updated_at_ms+=i+1;update.completeness_reason=std::string(200,'y');writes=again.PutEventLink(update,&error)&&writes;}
        const auto records=reopened.Replay();std::size_t receipts=0;for(const auto& m:records.mutations)if(m.mutation_type==RecordingMutationType::EventLinkReceipt)++receipts;
        Expect(writes&&receipts>12,"S10-SC16 automatic checkpoint uses accumulated growth");
    }
    const auto raw_root=root.parent_path()/"raw-checkpoint-only";
    RecordingJournal raw(raw_root/"journal.jsonl");const bool ro=raw.Open(&error);
    if(!ro)std::cerr<<"[diagnostic] SC07 stage=journal-open error="<<error<<'\n';
    RecordingCatalog rc(raw,{raw_root/"raw.sqlite",raw_root,false});const bool co=ro&&rc.Open(&error);
    if(ro&&!co)std::cerr<<"[diagnostic] SC07 stage=catalog-open error="<<error<<'\n';
    Expect(ro&&co&&!rc.Checkpoint(&error),"S10-SC07 raw checkpoint is rejected");
}

void CryptoOffCases(const std::filesystem::path& root) {
    using namespace recording;std::string error;std::filesystem::create_directories(root);
    RecordingJournal raw(root/"raw.jsonl");RecordingMutationV1 m;m.mutation_id="raw-id";m.entity_id="raw-entity";m.mutation_type=RecordingMutationType::EventLinkCreated;m.payload_json="{}";
    Expect(raw.Open(&error)&&raw.Append(m,&error)&&raw.Replay().mutations.size()==1,"S10-SC13 crypto off raw remains usable");
    const auto managed=root/"managed";std::filesystem::path path;
    {
        RecordingJournal j(RecordingJournal::ManagedOptions{managed,"store"});const bool opened=j.Open(&error);path=j.path();
        RecordingCatalog::Options o{managed/"recording-catalog.sqlite3",managed,false};o.enable_v2_storage=true;RecordingCatalog c(j,o);
        Expect(opened&&c.Open(&error)&&!c.Checkpoint(&error),"S10-SC14 crypto off checkpoint is rejected");
    }
    m.mutation_type=RecordingMutationType::EventLinkReceipt;m.payload_json="{\"schema\":\"media-server.recording-receipt.v1\",\"originalType\":\"event_link_created\",\"originalSha256\":\""+std::string(64,'a')+"\"}";
    {std::ofstream out(path,std::ios::app);out<<SerializeRecordingMutationV1(m)<<'\n';}
    const auto original=ReadBytes(path);RecordingJournal j(RecordingJournal::ManagedOptions{managed,"store"});
    Expect(!j.Open(&error)&&ReadBytes(path)==original,"S10-SC15 crypto off receipt reopen is rejected");
}

void CheckpointSafetyCases(const std::filesystem::path& root) {
    using namespace recording;std::string error;
    const auto options=[](const std::filesystem::path& r){RecordingCatalog::Options o{r/"recording-catalog.sqlite3",r,true};o.enable_v2_storage=true;return o;};
    const auto link=[](){EventRecordingLinkV1 v;v.link_id="safety-link";v.event_id="safety-event";v.source_id="source-1";v.channel_id="channel-1";
        v.time_basis="utc-ms";v.status=EventRecordingLinkStatus::Pending;v.created_at_ms=1000;v.updated_at_ms=1000;v.requested_range={1000,2000};v.completeness_reason=std::string(200,'z');return v;};
    for(const std::string mode:{"write","file-fsync","rename","dir-fsync"}) {
        const auto r=root/mode;bool rejected=false,hold_denied=false;std::string expected;
        {
            RecordingJournal j(RecordingJournal::ManagedOptions{r,"store"});bool ok=j.Open(&error);RecordingCatalog c(j,options(r));ok=c.Open(&error)&&ok;
            WriteMp4Header(r/"held.mp4");ok=c.FinalizeSegment(Segment("held"),(r/"held.mp4").string(),&error)&&ok;
            ok=c.AdjustHoldCount("held",1,&error)&&ok;auto v=link();ok=c.PutEventLink(v,&error)&&ok;v.updated_at_ms++;ok=c.PutEventLink(v,&error)&&ok;expected=SerializeEventRecordingLinkV1(v);
            fault_hit=false;fault_operation=mode;const bool checkpoint=c.Checkpoint(&error);fault_operation.clear();
            RecordingOrderReservationV1 order;rejected=ok&&fault_hit&&!checkpoint&&!j.ReserveRecordingOrder("store","poison-r","poison-s","channel-1",&order,&error);
            hold_denied=!c.AdjustHoldCount("held",1,&error);
        }
        RecordingJournal reopened(RecordingJournal::ManagedOptions{r,"store"});const bool jo=reopened.Open(&error);RecordingCatalog recovered(reopened,options(r));const bool co=recovered.Open(&error);
        const auto found=recovered.FindEventLinkByEventId("safety-event");
        Expect(rejected&&jo&&co&&found&&SerializeEventRecordingLinkV1(*found)==expected&&!std::filesystem::exists(r/".recording-checkpoint.tmp"),
            "S10-SC18 checkpoint syscall failure poisons and reopens "+mode);
        Expect(hold_denied,"S10-SC21 poison rejects hold mutation "+mode);
    }
    const auto state_root=root/"state";std::vector<std::string> preserved;std::string observation_json;
    {
        RecordingJournal j(RecordingJournal::ManagedOptions{state_root,"store"});bool ok=j.Open(&error);RecordingCatalog c(j,options(state_root));ok=c.Open(&error)&&ok;
        WriteMp4Header(state_root/"held.mp4");WriteMp4Header(state_root/"deleted.mp4");
        ok=c.FinalizeSegment(Segment("held"),(state_root/"held.mp4").string(),&error)&&ok;
        ok=c.FinalizeSegment(Segment("deleted"),(state_root/"deleted.mp4").string(),&error)&&ok;
        AnalysisObservationV1 observation;observation.observation_id="obs";observation.source_id="source-1";observation.channel_id="channel-1";
        observation.frame_locator.segment_id="held";observation.frame_locator.frame={1500,500000000,1,1000000000};
        observation.track_id="track";observation.class_label="person";observation.confidence=0.8;observation.bbox={0.1,0.1,0.2,0.3};observation.selection_reason="event";observation.created_at_ms=1500;
        ok=c.PutObservation(observation,&error)&&ok;
        observation_json=SerializeAnalysisObservationV1(observation);
        RecordingTombstoneV1 t;t.tombstone_id="tomb";t.segment_id="deleted";t.source_id="source-1";t.channel_id="channel-1";
        t.recorded_range={1000,2000};t.checksum_sha256=std::string(64,'a');t.retention_class=RecordingRetentionClass::Continuous;t.deletion_reason="event-retention";t.deleted_at_ms=3000;
        ok=c.RequestDeletion("deleted","event-retention",&error)&&ok;ok=c.CompleteDeletion(t,&error)&&ok;
        ok=c.AdjustHoldCount("held",2,&error)&&ok;auto v=link();ok=c.PutEventLink(v,&error)&&ok;v.updated_at_ms++;ok=c.PutEventLink(v,&error)&&ok;
        const auto before=j.Replay();for(const auto& m:before.mutations)if(m.mutation_type!=RecordingMutationType::EventLinkCreated)preserved.push_back(SerializeRecordingMutationV1(m));
        ok=c.Checkpoint(&error)&&ok;std::uint64_t hold=0;for(const auto& item:c.RetentionSnapshot().candidates)if(item.segment.segment_id=="held")hold=item.hold_count;
        std::vector<std::string> after;for(const auto& m:j.Replay().mutations)if(m.mutation_type!=RecordingMutationType::EventLinkCreated&&m.mutation_type!=RecordingMutationType::EventLinkReceipt)after.push_back(SerializeRecordingMutationV1(m));
        Expect(ok&&hold==2&&after==preserved&&c.IsDeletedSegmentId("deleted"),"S10-SC17 checkpoint preserves holds observations and deletion");
#if MEDIA_SERVER_USE_SQLITE3
        Expect(ok&&ReadSqlText(options(state_root).sqlite_path,"SELECT hold_count FROM recording_segments WHERE segment_id='held'")=="2"&&
            ReadSqlText(options(state_root).sqlite_path,"SELECT payload_json FROM recording_observations WHERE observation_id='obs'")==observation_json&&
            ReadSqlText(options(state_root).sqlite_path,"SELECT entity_id FROM recording_tombstones WHERE entity_id='deleted'")=="deleted",
            "S10-SC17 checkpoint SQL hold observation tombstone");
#endif
    }
    for(const bool sqlite:{true,false}) {
        RecordingJournal j(RecordingJournal::ManagedOptions{state_root,"store"});bool ok=j.Open(&error);auto o=options(state_root);o.prefer_sqlite=sqlite;RecordingCatalog c(j,o);ok=c.Open(&error)&&ok;
        std::vector<std::string> after;for(const auto& m:j.Replay().mutations)if(m.mutation_type!=RecordingMutationType::EventLinkCreated&&m.mutation_type!=RecordingMutationType::EventLinkReceipt)after.push_back(SerializeRecordingMutationV1(m));
        Expect(ok&&after==preserved&&c.IsDeletedSegmentId("deleted")&&!c.FinalizeSegment(Segment("deleted"),(state_root/"deleted.mp4").string(),&error),
            std::string("S10-SC17 checkpoint preserves holds observations and deletion restart ")+(sqlite?"sqlite":"jsonl"));
#if MEDIA_SERVER_USE_SQLITE3
        if(sqlite)Expect(ok&&ReadSqlText(o.sqlite_path,"SELECT payload_json FROM recording_observations WHERE observation_id='obs'")==observation_json&&
            ReadSqlText(o.sqlite_path,"SELECT entity_id FROM recording_tombstones WHERE entity_id='deleted'")=="deleted",
            "S10-SC17 checkpoint SQL restart observation tombstone");
#endif
    }
    for(const std::string mode:{"malformed","unsupported","conflict"}) {
        const auto r=root/mode;std::filesystem::path path;
        {RecordingJournal j(RecordingJournal::ManagedOptions{r,"store"});j.Open(&error);path=j.path();}
        {std::ofstream out(path,std::ios::app);if(mode=="malformed")out<<"broken\n";else if(mode=="unsupported")out<<"{\"schema\":\"future\"}\n";
         else {RecordingMutationV1 m;m.mutation_id="same";m.entity_id="entity";m.mutation_type=RecordingMutationType::EventLinkCreated;m.payload_json="{}";out<<SerializeRecordingMutationV1(m)<<'\n';m.occurred_at_ms++;out<<SerializeRecordingMutationV1(m)<<'\n';}}
        const auto saved=ReadBytes(path);RecordingJournal j(RecordingJournal::ManagedOptions{r,"store"});
        Expect(!j.Open(&error)&&ReadBytes(path)==saved,"S10-SC19 invalid managed history remains unchanged "+mode);
    }
    const auto raw_root=root/"raw-receipt";std::filesystem::create_directories(raw_root);const auto db=raw_root/"index.sqlite";
    {std::ofstream out(db);out<<"sqlite-original";}
    {RecordingJournal source(RecordingJournal::ManagedOptions{state_root,"store"});source.Open(&error);
     std::ofstream out(raw_root/"journal.jsonl");for(const auto& m:source.Replay().mutations)out<<SerializeRecordingMutationV1(m)<<'\n';}
    RecordingJournal raw(raw_root/"journal.jsonl");const bool opened=raw.Open(&error);RecordingCatalog c(raw,{db,raw_root,true});
    Expect(opened&&!c.Open(&error)&&ReadBytes(db)=="sqlite-original","S10-SC20 raw catalog rejects receipt before side effects");
}

int main(int argc, char** argv) {
    if(argc==3&&std::string(argv[1])=="--crypto-off") {CryptoOffCases(argv[2]);return failures==0?0:1;}
    if (argc == 5 && std::string(argv[1]) == "--fd-probe") {
        struct stat status {};
        if (::fstat(std::stoi(argv[2]), &status) != 0) return errno == EBADF ? 0 : 2;
        return static_cast<std::uint64_t>(status.st_dev) == std::stoull(argv[3]) && status.st_ino == std::stoull(argv[4]) ? 1 : 0;
    }
    if (argc != 2) return 2;
    probe_executable=std::filesystem::absolute(argv[0]).string();
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
    V2CatalogCases(root / "v2-catalog");
    ManagedStoreCases(root/"managed");
    GenerationFallbackGuardCases(root/"generation-guard");
#if MEDIA_SERVER_USE_OPENSSL
    GenerationSnapshotExportCases(root/"generation-export");
#endif
    ManagedCatalogCases(root/"managed-catalog");
    ManagedGrowthCases(root/"managed-growth");
    CheckpointSafetyCases(root/"checkpoint-safety");
    std::cout << "[verify-v410-recording-catalog] pass=" << passes << " fail=" << failures << '\n';
    return failures == 0 ? 0 : 1;
}
