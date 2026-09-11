// 파일 요약: append-only 녹화 mutation JSONL 원장을 구현한다.
// 동작 요약: 한 줄 append 후 fsync하고 마지막 truncate와 중간 손상을 분리해 replay한다.
#include "recording/recording_journal.h"

#include <cerrno>
#include <algorithm>
#include <cstring>
#include <fstream>
#include <sstream>
#include <chrono>
#include <limits>
#include <unordered_map>
#include <unordered_set>
#include <sys/stat.h>

#include "domain/strict_json.h"
#include "recording/recording_contracts.h"

#if !defined(_WIN32)
#include <fcntl.h>
#include <sys/file.h>
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

#if !defined(_WIN32)
struct OwnedFd {
    int value;
    explicit OwnedFd(int fd) : value(fd) {}
    ~OwnedFd() { if (value >= 0) ::close(value); }
    OwnedFd(const OwnedFd&) = delete;
    OwnedFd& operator=(const OwnedFd&) = delete;
};
bool Sync(int fd) {
    int result;
    do { result = ::fsync(fd); } while (result < 0 && errno == EINTR);
    return result == 0;
}
bool WriteAll(int fd, const std::string& bytes) {
    std::size_t offset = 0;
    while (offset < bytes.size()) {
        const auto count = ::write(fd, bytes.data() + offset, bytes.size() - offset);
        if (count < 0 && errno == EINTR) continue;
        if (count <= 0) return false;
        offset += static_cast<std::size_t>(count);
    }
    return true;
}
bool ReadAt(int fd, off_t start, std::string* bytes) {
    std::size_t offset = 0;
    while (offset < bytes->size()) {
        const auto count = ::pread(fd, bytes->data() + offset, bytes->size() - offset,
                                   start + static_cast<off_t>(offset));
        if (count < 0 && errno == EINTR) continue;
        if (count <= 0) return false;
        offset += static_cast<std::size_t>(count);
    }
    return true;
}
bool SafePath(const std::filesystem::path& input, std::filesystem::path* output) {
    // 사용자 ..와 임의 symlink canonicalization을 허용하지 않는다.
    for (const auto& part : input) if (part == "..") return false;
    std::error_code error;
    *output = std::filesystem::absolute(input, error).lexically_normal();
    if (error || output->filename().empty()) return false;
#if defined(__APPLE__)
    // macOS root-owned OS aliases만 고정 치환한다. 그 아래는 nofollow walk.
    const std::string path = output->string();
    if (path.rfind("/tmp/", 0) == 0 || path.rfind("/var/", 0) == 0) {
        *output = std::filesystem::path("/private" + path);
    }
#endif
    return true;
}
int OpenParent(const std::filesystem::path& path, bool create) {
    int fd = ::open("/", O_RDONLY | O_DIRECTORY | O_CLOEXEC);
    if (fd < 0) return -1;
    for (const auto& component : path.parent_path().relative_path()) {
        if (component == ".") continue;
        int next = ::openat(fd, component.c_str(), O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC);
        if (next < 0 && errno == ENOENT && create) {
            if (::mkdirat(fd, component.c_str(), 0750) != 0 && errno != EEXIST) { ::close(fd); return -1; }
            if (!Sync(fd)) { ::close(fd); return -1; }
            next = ::openat(fd, component.c_str(), O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC);
        }
        ::close(fd); fd = next;
        if (fd < 0) return -1;
    }
    return fd;
}
bool Regular(int fd, struct stat* status) {
    return ::fstat(fd, status) == 0 && S_ISREG(status->st_mode) && status->st_nlink == 1;
}
bool Same(int parent, const std::string& name, int fd, const struct stat& bound) {
    struct stat current {}, named {};
    return Regular(fd, &current) && ::fstatat(parent, name.c_str(), &named, AT_SYMLINK_NOFOLLOW) == 0 &&
        S_ISREG(named.st_mode) && named.st_nlink == 1 && current.st_dev == bound.st_dev &&
        current.st_ino == bound.st_ino && named.st_dev == current.st_dev && named.st_ino == current.st_ino;
}
bool Lock(int fd, int operation) {
    int result;
    do { result = ::flock(fd, operation); } while (result < 0 && errno == EINTR);
    return result == 0;
}
bool PreserveTail(int parent, const std::string& name, off_t prefix, const std::string& tail) {
    // slot 충돌은 원본 byte 비교로 재사용하며 crash 중 partial격리본은 덮어쓰지 않는다.
    for (unsigned slot = 0; slot < 1024; ++slot) {
        const std::string archive = name + ".tail-" + std::to_string(prefix) + "-" +
            std::to_string(tail.size()) + "-" + std::to_string(slot);
        int fd = ::openat(parent, archive.c_str(), O_RDWR | O_CREAT | O_EXCL | O_NOFOLLOW | O_CLOEXEC, 0600);
        const bool fresh = fd >= 0;
        if (!fresh) {
            if (errno != EEXIST) return false;
            fd = ::openat(parent, archive.c_str(), O_RDWR | O_NOFOLLOW | O_CLOEXEC | O_NONBLOCK);
        }
        OwnedFd owned(fd); struct stat status {};
        if (fd < 0 || !Regular(fd, &status)) return false;
        if (fresh) {
            if (!WriteAll(fd, tail)) return false;
        } else {
            if (status.st_size != static_cast<off_t>(tail.size())) continue;
            std::string existing(tail.size(), '\0');
            if (!ReadAt(fd, 0, &existing)) return false;
            if (existing != tail) continue;
        }
        return Sync(fd) && Same(parent, archive, fd, status) && Sync(parent);
    }
    return false;
}
bool RepairTail(int parent, const std::string& name, int fd, const struct stat& status) {
    if (status.st_size == 0) return Same(parent, name, fd, status);
    std::string last(1, '\0');
    if (!ReadAt(fd, status.st_size - 1, &last)) return false;
    if (last[0] == '\n') return Same(parent, name, fd, status);
    constexpr off_t max_tail = 16 * 1024 * 1024;
    off_t prefix = status.st_size;
    std::string block;
    while (prefix > 0) {
        const off_t begin = prefix > 4096 ? prefix - 4096 : 0;
        block.assign(static_cast<std::size_t>(prefix - begin), '\0');
        if (!ReadAt(fd, begin, &block)) return false;
        const auto lf = block.rfind('\n');
        if (lf != std::string::npos) { prefix = begin + static_cast<off_t>(lf) + 1; break; }
        prefix = begin;
        if (status.st_size - prefix > max_tail) return false;
    }
    if (prefix == status.st_size) return Same(parent, name, fd, status);
    if (status.st_size - prefix > max_tail) return false;
    std::string tail(static_cast<std::size_t>(status.st_size - prefix), '\0');
    if (!ReadAt(fd, prefix, &tail) || !PreserveTail(parent, name, prefix, tail)) return false;
    struct stat current {};
    if (!Same(parent, name, fd, status) || ::fstat(fd, &current) != 0 || current.st_size != status.st_size) return false;
    int result;
    do { result = ::ftruncate(fd, prefix); } while (result < 0 && errno == EINTR);
    return result == 0 && Sync(fd);
}
#endif

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

bool IsUnsupportedRecord(const std::string& json) {
    ingress::StrictJsonObjectDocument document;
    std::string error;
    if (!ingress::ParseStrictJsonObjectDocument(json, &document, &error)) return false;
    const auto schema = ingress::StrictJsonStringField(document, "schema");
    if (!schema) return false;
    // 미래 schema의 payload 모양은 현재 V1 규칙으로 손상 판정하지 않는다.
    if (*schema != "media-server.recording-mutation.v1") return true;
    const auto mutation_id = ingress::StrictJsonStringField(document, "mutationId");
    const auto type = ingress::StrictJsonStringField(document, "mutationType");
    const auto entity_id = ingress::StrictJsonStringField(document, "entityId");
    if (!mutation_id || !type || !entity_id || !Int64Field(document, "occurredAtMs") ||
        !ingress::StrictJsonObjectField(document, "payload") ||
        !ValidateOpaqueId(*mutation_id, &error) || !ValidateOpaqueId(*entity_id, &error)) return false;
    return ParseRecordingMutationType(*type) == RecordingMutationType::Unknown;
}

}  // namespace

std::string RecordingMutationTypeName(RecordingMutationType type) {
    switch (type) {
        case RecordingMutationType::SegmentFinalized: return "segment_finalized";
        case RecordingMutationType::EventLinkCreated: return "event_link_created";
        case RecordingMutationType::ObservationPut: return "observation_put";
        case RecordingMutationType::ObservationV2Put: return "observation_v2_put";
        case RecordingMutationType::DeletionRequested: return "deletion_requested";
        case RecordingMutationType::DeletionCompleted: return "deletion_completed";
        case RecordingMutationType::CorruptionDetected: return "corruption_detected";
        case RecordingMutationType::RecordingOrderReserved: return "recording_order_reserved";
        case RecordingMutationType::SegmentV2Finalized: return "segment_v2_finalized";
        case RecordingMutationType::Unknown: return "unknown";
    }
    return "unknown";
}

RecordingMutationType ParseRecordingMutationType(const std::string& value) {
    if (value == "segment_finalized") return RecordingMutationType::SegmentFinalized;
    if (value == "event_link_created") return RecordingMutationType::EventLinkCreated;
    if (value == "observation_put") return RecordingMutationType::ObservationPut;
    if (value == "observation_v2_put") return RecordingMutationType::ObservationV2Put;
    if (value == "deletion_requested") return RecordingMutationType::DeletionRequested;
    if (value == "deletion_completed") return RecordingMutationType::DeletionCompleted;
    if (value == "corruption_detected") return RecordingMutationType::CorruptionDetected;
    if (value == "recording_order_reserved") return RecordingMutationType::RecordingOrderReserved;
    if (value == "segment_v2_finalized") return RecordingMutationType::SegmentV2Finalized;
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
    if (parsed_type == RecordingMutationType::RecordingOrderReserved) {
        RecordingOrderReservationV1 reservation;
        if (!ParseRecordingOrderReservationV1(*payload, &reservation, error)) return false;
        if (reservation.request_id != *mutation_id || reservation.segment_id != *entity_id)
            return Fail(error, "recording order envelope 결박 불일치");
    }
    *value = RecordingMutationV1{*schema, *mutation_id, parsed_type, *occurred_at_ms, *entity_id, *payload};
    if (error != nullptr) error->clear();
    return true;
}

namespace {
// 예약 발급과 catalog 검증의 순서/ID 규칙을 함께 유지한다.
struct OrderHistoryIndex {
    std::unordered_map<std::string, RecordingOrderReservationV1> requests;
    std::unordered_map<std::string, std::int64_t> request_times;
    std::unordered_set<std::string> segments, ordinary_ids, legacy_segments;
    std::string bound_store;
    std::int64_t maximum = 0;
    bool Consume(const RecordingMutationV1& mutation, std::string* error) {
        if (mutation.mutation_type != RecordingMutationType::RecordingOrderReserved) {
            if (requests.count(mutation.mutation_id)) return Fail(error, "recording order mutation ID 충돌");
            ordinary_ids.insert(mutation.mutation_id);
            if ((mutation.mutation_type == RecordingMutationType::SegmentFinalized ||
                 mutation.mutation_type == RecordingMutationType::SegmentV2Finalized ||
                 mutation.mutation_type == RecordingMutationType::CorruptionDetected ||
                 mutation.mutation_type == RecordingMutationType::DeletionRequested ||
                 mutation.mutation_type == RecordingMutationType::DeletionCompleted) &&
                !segments.count(mutation.entity_id)) legacy_segments.insert(mutation.entity_id);
            return true;
        }
        RecordingOrderReservationV1 order;
        if (!ParseRecordingOrderReservationV1(mutation.payload_json, &order, error)) return false;
        if (ordinary_ids.count(order.request_id) || legacy_segments.count(order.segment_id))
            return Fail(error, "recording order 기존 ID 소급/재사용 거부");
        if (!bound_store.empty() && bound_store != order.store_id)
            return Fail(error, "recording order store 충돌");
        bound_store = order.store_id;
        const auto previous = requests.find(order.request_id);
        if (previous != requests.end()) {
            const auto& old = previous->second;
            if (old.store_id != order.store_id || old.segment_id != order.segment_id ||
                old.channel_id != order.channel_id || old.sequence != order.sequence ||
                request_times.at(order.request_id) != mutation.occurred_at_ms)
                return Fail(error, "recording order 동일 요청 기록 충돌");
            return true;
        }
        if (segments.count(order.segment_id) || order.sequence <= maximum)
            return Fail(error, "recording order segment/발급 순서 충돌");
        maximum = order.sequence;
        segments.insert(order.segment_id);
        request_times.emplace(order.request_id, mutation.occurred_at_ms);
        const auto order_request_id = order.request_id;
        requests.emplace(order_request_id, std::move(order));
        return true;
    }
};
}

bool ValidateRecordingOrderHistory(const std::vector<RecordingMutationV1>& mutations,
    std::vector<RecordingOrderReservationV1>* orders, std::string* error) {
    if (!orders) return Fail(error,"예약 history output 없음");
    OrderHistoryIndex index;
    for (const auto& mutation:mutations) if (!index.Consume(mutation,error)) return false;
    std::vector<RecordingOrderReservationV1> found;
    for (const auto& entry:index.requests) found.push_back(entry.second);
    *orders=std::move(found); if (error) error->clear(); return true;
}

RecordingJournal::RecordingJournal(std::filesystem::path path) : path_(std::move(path)) {}

bool ParseRecordingOrderReservationV1(const std::string& json, RecordingOrderReservationV1* value, std::string* error) {
    if (value == nullptr) return Fail(error, "recording order output이 없음");
    ingress::StrictJsonObjectDocument document;
    if (!ingress::ParseStrictJsonObjectDocument(json, &document, error)) return false;
    const auto schema = ingress::StrictJsonStringField(document, "schema");
    const auto store = ingress::StrictJsonStringField(document, "storeId");
    const auto request = ingress::StrictJsonStringField(document, "requestId");
    const auto segment = ingress::StrictJsonStringField(document, "segmentId");
    const auto channel = ingress::StrictJsonStringField(document, "channelId");
    const auto sequence = Int64Field(document, "sequence");
    if (document.members.size() != 6 || schema != "media-server.recording-order.v1" ||
        !store || !request || !segment || !channel || !sequence || *sequence <= 0)
        return Fail(error, "recording order payload field가 잘못됨");
    if (!ValidateOpaqueId(*store, error) || !ValidateOpaqueId(*request, error) ||
        !ValidateOpaqueId(*segment, error) || !ValidateOpaqueId(*channel, error)) return false;
    *value = RecordingOrderReservationV1{*schema, *store, *request, *segment, *channel, *sequence};
    if (error != nullptr) error->clear();
    return true;
}
bool RecordingJournal::ReserveRecordingOrder(const std::string& store_id, const std::string& request_id,
    const std::string& segment_id, const std::string& channel_id,
    RecordingOrderReservationV1* result, std::string* error) {
    std::lock_guard lock(mu_);
    if (!opened_ || result == nullptr) return Fail(error, "recording order 시작 조건 불충족");
    if (!ValidateOpaqueId(store_id, error) || !ValidateOpaqueId(request_id, error) ||
        !ValidateOpaqueId(segment_id, error) || !ValidateOpaqueId(channel_id, error)) return false;
#if !defined(_WIN32)
    OwnedFd parent(OpenParent(io_path_, false));
    struct stat directory {};
    if (parent.value < 0 || ::fstat(parent.value, &directory) != 0 ||
        parent_device_ != static_cast<std::uint64_t>(directory.st_dev) || parent_inode_ != directory.st_ino)
        return Fail(error, "recording order parent 교체 거부");
    const std::string name = io_path_.filename().string();
    OwnedFd fd(::openat(parent.value, name.c_str(), O_RDWR | O_APPEND | O_NOFOLLOW | O_CLOEXEC | O_NONBLOCK));
    struct stat bound {};
    if (fd.value < 0 || !Lock(fd.value, LOCK_EX) || !Regular(fd.value, &bound) || bound.st_size < 0 ||
        device_ != static_cast<std::uint64_t>(bound.st_dev) || inode_ != bound.st_ino ||
        !Same(parent.value, name, fd.value, bound)) return Fail(error, "recording order unsafe inode 거부");

    // 예약은 전체 완결 원장을 검증한다. 일반 Append의 복구/비용 계약은 바꾸지 않는다.
    OrderHistoryIndex index;
    const auto& requests=index.requests;
    const auto& segments=index.segments;
    const auto& ordinary_ids=index.ordinary_ids;
    const auto& legacy_segments=index.legacy_segments;
    const auto& bound_store=index.bound_store;
    const auto& maximum=index.maximum;
    const auto consume=[&](const std::string& line) {
        if (line.empty()) return true;
        RecordingMutationV1 mutation;
        return ParseRecordingMutationV1(line,&mutation,error) && index.Consume(mutation,error);
    };
    constexpr std::size_t kChunkBytes = 64 * 1024, kMaxRecordBytes = 16 * 1024 * 1024;
    char chunk[kChunkBytes];
    std::string line;
    off_t offset = 0;
    while (offset < bound.st_size) {
        const auto wanted = static_cast<std::size_t>(std::min<off_t>(bound.st_size - offset, kChunkBytes));
        ssize_t count;
        do { count = ::pread(fd.value, chunk, wanted, offset); } while (count < 0 && errno == EINTR);
        if (count <= 0) return Fail(error, "recording order 원장 읽기 실패");
        offset += count;
        for (ssize_t i = 0; i < count; ++i) {
            if (chunk[i] == '\n') {
                if (!consume(line)) return false;
                line.clear();
            } else {
                if (line.size() == kMaxRecordBytes) return Fail(error, "recording order record 상한 초과");
                line.push_back(chunk[i]);
            }
        }
    }
    if (!line.empty()) return Fail(error, "recording order 미완결 tail 거부");
    struct stat after {};
    if (!Regular(fd.value, &after) || after.st_size != bound.st_size || !Same(parent.value, name, fd.value, bound))
        return Fail(error, "recording order 원장 변경 거부");
    if ((!bound_store.empty() && bound_store != store_id) || ordinary_ids.count(request_id))
        return Fail(error, "recording order store/request 충돌");
    const auto previous = requests.find(request_id);
    if (previous != requests.end()) {
        const auto& old = previous->second;
        if (old.segment_id != segment_id || old.channel_id != channel_id)
            return Fail(error, "recording order 재시도 ID 충돌");
        if (!Sync(fd.value)) return Fail(error, "recording order 재시도 fsync 실패");
        *result = old;
    } else {
        if (segments.count(segment_id) || legacy_segments.count(segment_id))
            return Fail(error, "recording order segment 재사용 거부");
        if (maximum == std::numeric_limits<std::int64_t>::max()) return Fail(error, "recording order 번호 고갈");
        RecordingOrderReservationV1 order{"media-server.recording-order.v1", store_id, request_id, segment_id, channel_id, maximum + 1};
        RecordingMutationV1 mutation;
        mutation.mutation_id = request_id;
        mutation.entity_id = segment_id;
        mutation.mutation_type = RecordingMutationType::RecordingOrderReserved;
        mutation.occurred_at_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()).count();
        mutation.payload_json = "{\"schema\":\"media-server.recording-order.v1\",\"storeId\":\"" + Escape(store_id) +
            "\",\"requestId\":\"" + Escape(request_id) + "\",\"segmentId\":\"" + Escape(segment_id) +
            "\",\"channelId\":\"" + Escape(channel_id) + "\",\"sequence\":" + std::to_string(order.sequence) + "}";
        if (!WriteAll(fd.value, SerializeRecordingMutationV1(mutation) + "\n") || !Sync(fd.value))
            return Fail(error, "recording order write/fsync 실패");
        *result = std::move(order);
    }
    if (error != nullptr) error->clear();
    return true;
#else
    return Fail(error, "recording order 배타 잠금 미지원");
#endif
}

bool RecordingJournal::Open(std::string* error) {
    std::lock_guard lock(mu_);
#if !defined(_WIN32)
    if (!SafePath(path_, &io_path_)) return Fail(error, "journal path 거부");
    OwnedFd parent(OpenParent(io_path_, !opened_));
    if (parent.value < 0) return Fail(error, "journal parent 안전 open 실패");
    OwnedFd fd(::openat(parent.value, io_path_.filename().c_str(),
                       O_RDWR | O_APPEND | (opened_ ? 0 : O_CREAT) | O_NOFOLLOW | O_CLOEXEC | O_NONBLOCK, 0640));
    struct stat status {}, directory {};
    if (fd.value < 0 || !Regular(fd.value, &status) || ::fstat(parent.value, &directory) != 0 ||
        !Same(parent.value, io_path_.filename().string(), fd.value, status)) return Fail(error, "journal regular inode 확인 실패");
    if (opened_ && (device_ != static_cast<std::uint64_t>(status.st_dev) || inode_ != status.st_ino ||
        parent_device_ != static_cast<std::uint64_t>(directory.st_dev) || parent_inode_ != directory.st_ino))
        return Fail(error, "journal inode 교체 거부");
    if (!Sync(fd.value) || !Sync(parent.value)) return Fail(error, "journal open fsync 실패");
    device_ = status.st_dev; inode_ = status.st_ino;
    parent_device_ = directory.st_dev; parent_inode_ = directory.st_ino;
#else
    std::error_code fs_error;
    if (!path_.parent_path().empty()) std::filesystem::create_directories(path_.parent_path(), fs_error);
    if (fs_error) return Fail(error, "journal directory 생성 실패: " + fs_error.message());
    std::ofstream probe(path_, std::ios::binary | std::ios::app);
    if (!probe) return Fail(error, "journal open 실패");
    probe.close();
#endif
    opened_ = true;
    if (error != nullptr) error->clear();
    return true;
}

bool RecordingJournal::Append(const RecordingMutationV1& mutation, std::string* error) {
    std::lock_guard lock(mu_);
    if (!opened_) return Fail(error, "journal이 열리지 않음");
    if (mutation.mutation_type == RecordingMutationType::RecordingOrderReserved)
        return Fail(error, "recording order 전용 예약 API 필요");
    RecordingMutationV1 parsed;
    const std::string line = SerializeRecordingMutationV1(mutation);
    if (!ParseRecordingMutationV1(line, &parsed, error)) return false;
    const std::string durable = line + "\n";
#if !defined(_WIN32)
    OwnedFd parent(OpenParent(io_path_, false));
    struct stat directory {};
    if (parent.value < 0 || ::fstat(parent.value, &directory) != 0 ||
        parent_device_ != static_cast<std::uint64_t>(directory.st_dev) || parent_inode_ != directory.st_ino)
        return Fail(error, "journal parent 교체 거부");
    const std::string name = io_path_.filename().string();
    OwnedFd fd(::openat(parent.value, name.c_str(), O_RDWR | O_APPEND | O_NOFOLLOW | O_CLOEXEC | O_NONBLOCK));
    struct stat status {};
    if (fd.value < 0 || !Lock(fd.value, LOCK_EX) || !Regular(fd.value, &status) ||
        device_ != static_cast<std::uint64_t>(status.st_dev) || inode_ != status.st_ino)
        return Fail(error, "journal inode 교체/unsafe fd 거부");
    if (!RepairTail(parent.value, name, fd.value, status)) return Fail(error, "journal tail 내구격리/복구 실패");
    if (!Same(parent.value, name, fd.value, status)) return Fail(error, "journal append inode 재대조 실패");
    if (!WriteAll(fd.value, durable) || !Sync(fd.value)) return Fail(error, "journal write/fsync 실패");
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
#if !defined(_WIN32)
    if (!opened_) { ++result.io_error_count; return result; }
    OwnedFd parent(OpenParent(io_path_, false));
    struct stat directory {};
    if (parent.value < 0 || ::fstat(parent.value, &directory) != 0 ||
        parent_device_ != static_cast<std::uint64_t>(directory.st_dev) || parent_inode_ != directory.st_ino) {
        ++result.io_error_count; return result;
    }
    const std::string name = io_path_.filename().string();
    OwnedFd fd(::openat(parent.value, name.c_str(), O_RDONLY | O_NOFOLLOW | O_CLOEXEC | O_NONBLOCK));
    struct stat status {};
    if (fd.value < 0 || !Lock(fd.value, LOCK_SH) || !Regular(fd.value, &status) ||
        device_ != static_cast<std::uint64_t>(status.st_dev) || inode_ != status.st_ino ||
        !Same(parent.value, name, fd.value, status)) { ++result.io_error_count; return result; }
    std::string bytes(static_cast<std::size_t>(status.st_size), '\0');
    if (!ReadAt(fd.value, 0, &bytes)) { ++result.io_error_count; return result; }
#else
    std::ifstream input(path_, std::ios::binary);
    if (!input) return result;
    std::ostringstream buffer;
    buffer << input.rdbuf();
    const std::string bytes = buffer.str();
#endif
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
            if (IsUnsupportedRecord(line)) ++result.unsupported_record_count;
            else ++result.corrupt_line_count;
            continue;
        }
        result.mutations.push_back(std::move(mutation));
    }
    return result;
}

const std::filesystem::path& RecordingJournal::path() const { return path_; }

}  // namespace recording
