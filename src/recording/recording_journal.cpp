// 파일 요약: append-only 녹화 mutation JSONL 원장을 구현한다.
// 동작 요약: 한 줄 append 후 fsync하고 마지막 truncate와 중간 손상을 분리해 replay한다.
#include "recording/recording_journal.h"

#include <cerrno>
#include <cstring>
#include <fstream>
#include <sstream>

#include "domain/strict_json.h"
#include "recording/recording_contracts.h"

#if !defined(_WIN32)
#include <fcntl.h>
#include <unistd.h>
#endif

namespace recording {
namespace {

std::string Escape(const std::string& value) {
    std::string out;
    for (const char ch : value) {
        switch (ch) {
            case '\\': out += "\\\\"; break;
            case '"': out += "\\\""; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            default: out.push_back(ch); break;
        }
    }
    return out;
}

bool Fail(std::string* error, const std::string& message) {
    if (error != nullptr) *error = message;
    return false;
}

std::optional<std::int64_t> Int64Field(const ingress::StrictJsonObjectDocument& document,
                                       const std::string& key) {
    const auto* member = document.Find(key);
    if (member == nullptr || member->type != ingress::StrictJsonType::Number) return std::nullopt;
    try {
        std::size_t used = 0;
        const auto value = std::stoll(member->raw, &used);
        if (used != member->raw.size()) return std::nullopt;
        return value;
    } catch (...) {
        return std::nullopt;
    }
}

}  // namespace

std::string RecordingMutationTypeName(RecordingMutationType type) {
    switch (type) {
        case RecordingMutationType::SegmentFinalized: return "segment_finalized";
        case RecordingMutationType::EventLinkCreated: return "event_link_created";
        case RecordingMutationType::ObservationPut: return "observation_put";
        case RecordingMutationType::DeletionRequested: return "deletion_requested";
        case RecordingMutationType::DeletionCompleted: return "deletion_completed";
        case RecordingMutationType::CorruptionDetected: return "corruption_detected";
        case RecordingMutationType::Unknown: return "unknown";
    }
    return "unknown";
}

RecordingMutationType ParseRecordingMutationType(const std::string& value) {
    if (value == "segment_finalized") return RecordingMutationType::SegmentFinalized;
    if (value == "event_link_created") return RecordingMutationType::EventLinkCreated;
    if (value == "observation_put") return RecordingMutationType::ObservationPut;
    if (value == "deletion_requested") return RecordingMutationType::DeletionRequested;
    if (value == "deletion_completed") return RecordingMutationType::DeletionCompleted;
    if (value == "corruption_detected") return RecordingMutationType::CorruptionDetected;
    return RecordingMutationType::Unknown;
}

std::string SerializeRecordingMutationV1(const RecordingMutationV1& value) {
    std::ostringstream out;
    out << "{\"schema\":\"media-server.recording-mutation.v1\","
        << "\"mutationId\":\"" << Escape(value.mutation_id) << "\","
        << "\"mutationType\":\"" << RecordingMutationTypeName(value.mutation_type) << "\","
        << "\"occurredAtMs\":" << value.occurred_at_ms << ","
        << "\"entityId\":\"" << Escape(value.entity_id) << "\","
        << "\"payload\":" << value.payload_json << "}";
    return out.str();
}

bool ParseRecordingMutationV1(const std::string& json,
                              RecordingMutationV1* value,
                              std::string* error) {
    if (value == nullptr) return Fail(error, "mutation output이 없음");
    ingress::StrictJsonObjectDocument document;
    if (!ingress::ParseStrictJsonObjectDocument(json, &document, error)) return false;
    const auto schema = ingress::StrictJsonStringField(document, "schema");
    const auto mutation_id = ingress::StrictJsonStringField(document, "mutationId");
    const auto mutation_type = ingress::StrictJsonStringField(document, "mutationType");
    const auto occurred_at_ms = Int64Field(document, "occurredAtMs");
    const auto entity_id = ingress::StrictJsonStringField(document, "entityId");
    const auto payload = ingress::StrictJsonObjectField(document, "payload");
    if (schema != "media-server.recording-mutation.v1" || !mutation_id || !mutation_type ||
        !occurred_at_ms || !entity_id || !payload) return Fail(error, "mutation envelope field가 잘못됨");
    std::string id_error;
    if (!ValidateOpaqueId(*mutation_id, &id_error) || !ValidateOpaqueId(*entity_id, &id_error)) {
        return Fail(error, id_error);
    }
    const auto parsed_type = ParseRecordingMutationType(*mutation_type);
    if (parsed_type == RecordingMutationType::Unknown) return Fail(error, "지원하지 않는 mutation type");
    *value = RecordingMutationV1{*schema, *mutation_id, parsed_type, *occurred_at_ms, *entity_id, *payload};
    if (error != nullptr) error->clear();
    return true;
}

RecordingJournal::RecordingJournal(std::filesystem::path path) : path_(std::move(path)) {}

bool RecordingJournal::Open(std::string* error) {
    std::lock_guard lock(mu_);
    std::error_code fs_error;
    if (!path_.parent_path().empty()) std::filesystem::create_directories(path_.parent_path(), fs_error);
    if (fs_error) return Fail(error, "journal directory 생성 실패: " + fs_error.message());
    std::ofstream probe(path_, std::ios::binary | std::ios::app);
    if (!probe) return Fail(error, "journal open 실패");
    probe.close();
    opened_ = true;
    if (error != nullptr) error->clear();
    return true;
}

bool RecordingJournal::Append(const RecordingMutationV1& mutation, std::string* error) {
    std::lock_guard lock(mu_);
    if (!opened_) return Fail(error, "journal이 열리지 않음");
    RecordingMutationV1 parsed;
    const std::string line = SerializeRecordingMutationV1(mutation);
    if (!ParseRecordingMutationV1(line, &parsed, error)) return false;
    const std::string durable = line + "\n";
#if !defined(_WIN32)
    const int fd = ::open(path_.c_str(), O_WRONLY | O_APPEND | O_CREAT, 0640);
    if (fd < 0) return Fail(error, "journal fd open 실패: " + std::string(std::strerror(errno)));
    std::size_t offset = 0;
    while (offset < durable.size()) {
        const auto written = ::write(fd, durable.data() + offset, durable.size() - offset);
        if (written <= 0) {
            const std::string message = std::strerror(errno);
            ::close(fd);
            return Fail(error, "journal write 실패: " + message);
        }
        offset += static_cast<std::size_t>(written);
    }
    if (::fsync(fd) != 0) {
        const std::string message = std::strerror(errno);
        ::close(fd);
        return Fail(error, "journal fsync 실패: " + message);
    }
    ::close(fd);
#else
    std::ofstream output(path_, std::ios::binary | std::ios::app);
    output << durable;
    output.flush();
    if (!output) return Fail(error, "journal write/flush 실패");
#endif
    if (error != nullptr) error->clear();
    return true;
}

RecordingJournalReplayResult RecordingJournal::Replay() const {
    std::lock_guard lock(mu_);
    RecordingJournalReplayResult result;
    std::ifstream input(path_, std::ios::binary);
    if (!input) return result;
    std::ostringstream buffer;
    buffer << input.rdbuf();
    const std::string bytes = buffer.str();
    std::size_t start = 0;
    while (start < bytes.size()) {
        const auto newline = bytes.find('\n', start);
        if (newline == std::string::npos) {
            ++result.truncated_tail_count;
            break;
        }
        const std::string line = bytes.substr(start, newline - start);
        start = newline + 1;
        if (line.empty()) continue;
        RecordingMutationV1 mutation;
        std::string error;
        if (!ParseRecordingMutationV1(line, &mutation, &error)) {
            ++result.corrupt_line_count;
            continue;
        }
        result.mutations.push_back(std::move(mutation));
    }
    return result;
}

const std::filesystem::path& RecordingJournal::path() const { return path_; }

}  // namespace recording
