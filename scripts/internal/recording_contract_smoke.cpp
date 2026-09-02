// 파일 용도: v4.1.0 녹화 v1 계약과 golden JSONL fixture의 실제 C++ round-trip을 검증한다.
// 동작 요약: ID, 시간, lifecycle, 직렬화 호환성과 tombstone 재사용 차단을 fail-closed로 확인한다.
#include "recording/recording_contracts.h"
#include "recording/recording_store_port.h"

#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

namespace {

int failures = 0;
int passes = 0;

void Expect(bool condition, const std::string& label) {
    if (condition) {
        ++passes;
        return;
    }
    ++failures;
    std::cerr << "[fail] " << label << '\n';
}

std::vector<std::string> ReadJsonLines(const std::filesystem::path& path) {
    std::ifstream input(path);
    std::vector<std::string> lines;
    std::string line;
    while (std::getline(input, line)) {
        if (!line.empty()) {
            lines.push_back(line);
        }
    }
    Expect(input.eof(), "fixture를 끝까지 읽음: " + path.string());
    Expect(!lines.empty(), "fixture가 비어 있지 않음: " + path.string());
    return lines;
}

template <typename T, typename Parser, typename Serializer>
void ExpectCanonicalRoundTrip(const std::filesystem::path& path,
                              Parser parser,
                              Serializer serializer) {
    const auto lines = ReadJsonLines(path);
    for (std::size_t index = 0; index < lines.size(); ++index) {
        T first;
        std::string error;
        const bool parsed = parser(lines[index], &first, &error);
        Expect(parsed, path.filename().string() + " parse[" + std::to_string(index) + "]: " + error);
        if (!parsed) {
            continue;
        }
        const std::string canonical = serializer(first);
        T second;
        error.clear();
        const bool reparsed = parser(canonical, &second, &error);
        Expect(reparsed, path.filename().string() + " canonical parse[" +
                             std::to_string(index) + "]: " + error);
        if (reparsed) {
            Expect(serializer(second) == canonical,
                   path.filename().string() + " canonical parity[" + std::to_string(index) + "]");
        }
    }
}

}  // namespace

int main(int argc, char** argv) {
    if (argc != 2) {
        std::cerr << "usage: recording_contract_smoke <fixture-root>\n";
        return 2;
    }
    const std::filesystem::path root(argv[1]);
    std::string error;

    Expect(recording::ValidateOpaqueId("segment-01", &error), "opaque ID 허용");
    Expect(!recording::ValidateOpaqueId("", &error), "빈 opaque ID 거부");
    Expect(!recording::ValidateOpaqueId("../segments/1", &error), "path opaque ID 거부");
    Expect(!recording::ValidateOpaqueId("42", &error), "SQLite rowid 형태 opaque ID 거부");

    Expect(recording::HalfOpenRangesOverlap(1000, 2000, 1999, 3000), "반개구간 겹침");
    Expect(!recording::HalfOpenRangesOverlap(1000, 2000, 2000, 3000), "맞닿은 반개구간 비겹침");
    Expect(!recording::HalfOpenRangesOverlap(1000, 1000, 1000, 2000), "빈 반개구간 거부");

    const auto segment_lines = ReadJsonLines(root / "segments.jsonl");
    if (!segment_lines.empty()) {
        recording::RecordingSegmentV1 segment;
        const bool parsed = recording::ParseRecordingSegmentV1(segment_lines.front(), &segment, &error);
        Expect(parsed, "unknown optional field를 포함한 segment parse: " + error);
        if (parsed) {
            Expect(segment.segment_id == "seg-alpha-0001", "unknown optional field 뒤 known ID 보존");
            Expect(segment.start.pts == 90000 && segment.start.time_base_num == 1 &&
                       segment.start.time_base_den == 90000,
                   "PTS/timebase exact 보존");
            recording::RecordingSegmentV1 reparsed;
            const std::string serialized = recording::SerializeRecordingSegmentV1(segment);
            Expect(serialized.find("media_path") == std::string::npos,
                   "public JSON에 filesystem path 비노출");
            Expect(recording::ParseRecordingSegmentV1(serialized, &reparsed, &error),
                   "segment canonical 재parse");
            Expect(reparsed.start.pts == segment.start.pts &&
                       reparsed.start.time_base_num == segment.start.time_base_num &&
                       reparsed.start.time_base_den == segment.start.time_base_den,
                   "PTS/timebase round-trip");
        }
    }

    const std::string unknown_lifecycle =
        R"({"schema":"media-server.recording-segment.v1","segment_id":"seg-unknown-0001","source_id":"source-1","channel_id":"channel-1","stream_epoch_id":"epoch-1","start":{"utc_ms":1000,"pts":0,"time_base_num":1,"time_base_den":90000},"end":{"utc_ms":2000,"pts":90000,"time_base_num":1,"time_base_den":90000},"container":"mp4","video_codecs":["h264"],"audio_codecs":[],"audio_omitted_reason":"source-no-audio","size_bytes":1,"checksum_sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","retention_class":"continuous","lifecycle":"future-state","pinned":false,"created_at_ms":1000,"finalized_at_ms":0})";
    recording::RecordingSegmentV1 unknown;
    Expect(recording::ParseRecordingSegmentV1(unknown_lifecycle, &unknown, &error),
           "unknown lifecycle를 호환 parse");
    Expect(unknown.lifecycle == recording::RecordingLifecycle::Unknown,
           "unknown lifecycle를 Unknown으로 보존");
    Expect(!recording::IsPlayable(unknown.lifecycle), "unknown lifecycle 비재생");

    ExpectCanonicalRoundTrip<recording::RecordingSegmentV1>(
        root / "segments.jsonl", recording::ParseRecordingSegmentV1,
        recording::SerializeRecordingSegmentV1);
    ExpectCanonicalRoundTrip<recording::EventRecordingLinkV1>(
        root / "event-links.jsonl", recording::ParseEventRecordingLinkV1,
        recording::SerializeEventRecordingLinkV1);
    ExpectCanonicalRoundTrip<recording::AnalysisObservationV1>(
        root / "observations.jsonl", recording::ParseAnalysisObservationV1,
        recording::SerializeAnalysisObservationV1);
    ExpectCanonicalRoundTrip<recording::RecordingTombstoneV1>(
        root / "tombstones.jsonl", recording::ParseRecordingTombstoneV1,
        recording::SerializeRecordingTombstoneV1);

    recording::RecordingTombstoneV1 tombstone;
    const auto tombstone_lines = ReadJsonLines(root / "tombstones.jsonl");
    if (!tombstone_lines.empty() &&
        recording::ParseRecordingTombstoneV1(tombstone_lines.front(), &tombstone, &error)) {
        Expect(!recording::CanCreateSegmentId(tombstone.segment_id, {tombstone}, &error),
               "tombstone segment ID 재사용 거부");
        Expect(recording::CanCreateSegmentId("seg-new-0002", {tombstone}, &error),
               "새 segment ID 허용");
    }

    std::cout << "[verify-v410-recording-contracts] pass=" << passes
              << " fail=" << failures << '\n';
    return failures == 0 ? 0 : 1;
}
