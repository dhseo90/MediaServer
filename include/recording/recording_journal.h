// 파일 요약: 녹화 상태 변경의 append-only JSONL 원장 계약을 선언한다.
// 동작 요약: mutation envelope 직렬화, fsync append, 손상 허용 replay 결과를 제공한다.
#pragma once

#include <cstdint>
#include <filesystem>
#include <mutex>
#include <string>
#include <vector>

namespace recording {

enum class RecordingMutationType {
    SegmentFinalized,
    EventLinkCreated,
    ObservationPut,
    DeletionRequested,
    DeletionCompleted,
    CorruptionDetected,
    Unknown,
};

struct RecordingMutationV1 {
    std::string schema{"media-server.recording-mutation.v1"};
    std::string mutation_id;
    RecordingMutationType mutation_type{RecordingMutationType::Unknown};
    std::int64_t occurred_at_ms{0};
    std::string entity_id;
    std::string payload_json{"{}"};
};

struct RecordingJournalReplayResult {
    std::vector<RecordingMutationV1> mutations;
    std::size_t corrupt_line_count{0};
    std::size_t truncated_tail_count{0};
};

std::string RecordingMutationTypeName(RecordingMutationType type);
RecordingMutationType ParseRecordingMutationType(const std::string& value);
std::string SerializeRecordingMutationV1(const RecordingMutationV1& value);
bool ParseRecordingMutationV1(const std::string& json,
                              RecordingMutationV1* value,
                              std::string* error);

class RecordingJournal {
public:
    explicit RecordingJournal(std::filesystem::path path);
    bool Open(std::string* error);
    bool Append(const RecordingMutationV1& mutation, std::string* error);
    RecordingJournalReplayResult Replay() const;
    const std::filesystem::path& path() const;

private:
    std::filesystem::path path_;
    mutable std::mutex mu_;
    bool opened_{false};
};

}  // namespace recording
