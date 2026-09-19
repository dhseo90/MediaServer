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
#include "recording_checkpoint_validation.h"

#ifndef MEDIA_SERVER_USE_OPENSSL
#define MEDIA_SERVER_USE_OPENSSL 0
#endif
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#endif

#if !defined(_WIN32)
#include <fcntl.h>
#include <dirent.h>
#include <sys/file.h>
#include <sys/random.h>
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
constexpr const char* kManagedLease=".recording-store-lease";
constexpr const char* kManagedInit=".recording-store-init";
constexpr const char* kManagedFormat=".recording-store-format";
constexpr const char* kManagedJournal="recording-v2-mutations.jsonl";
constexpr const char* kLegacyBarrier="recording-mutations.jsonl";
std::string ManagedFormat(const std::string& id) {
    return "{\"format\":\"media-server.managed-recording-store.v1\",\"storeId\":\""+Escape(id)+
        "\",\"journal\":\"recording-v2-mutations.jsonl\"}\n";
}
bool Present(int parent,const char* name) {
    struct stat s{};return ::fstatat(parent,name,&s,AT_SYMLINK_NOFOLLOW)==0||errno!=ENOENT;
}
bool ExactFile(int parent,const char* name,const std::string& bytes,struct stat* bound=nullptr) {
    OwnedFd fd(::openat(parent,name,O_RDONLY|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK));struct stat s{};
    if(fd.value<0||!Regular(fd.value,&s)||s.st_size!=static_cast<off_t>(bytes.size()))return false;
    std::string read(bytes.size(),'\0');
    if(!ReadAt(fd.value,0,&read)||read!=bytes||!Same(parent,name,fd.value,s))return false;
    if(bound)*bound=s;return true;
}
bool ReadManagedStoreId(int parent,const char* name,std::string* id) {
    OwnedFd fd(::openat(parent,name,O_RDONLY|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK));
    struct stat bound{};
    if(fd.value<0||!Regular(fd.value,&bound)||bound.st_size<=0||bound.st_size>512)return false;
    std::string bytes(static_cast<std::size_t>(bound.st_size),'\0');
    if(!ReadAt(fd.value,0,&bytes)||!Same(parent,name,fd.value,bound))return false;
    ingress::StrictJsonObjectDocument document;
    if(!ingress::ParseStrictJsonObjectDocument(bytes,&document,nullptr))return false;
    const auto value=ingress::StrictJsonStringField(document,"storeId");
    if(!value||!ValidateOpaqueId(*value,nullptr)||bytes!=ManagedFormat(*value))return false;
    *id=*value;
    return true;
}
bool NewManagedStoreId(std::string* id) {
    unsigned char bytes[16];
    // managed store와 OS 난수는 optional OpenSSL의 receipt/checkpoint 지원과 독립적이다.
    if(::getentropy(bytes,sizeof(bytes))!=0)return false;
    static constexpr char hex[]="0123456789abcdef";
    *id="store-";
    for(const auto byte:bytes){id->push_back(hex[byte>>4]);id->push_back(hex[byte&15]);}
    return true;
}
bool InitNamesOnly(int root) {
    const int copy=::openat(root,".",O_RDONLY|O_DIRECTORY|O_CLOEXEC);if(copy<0)return false;DIR* dir=::fdopendir(copy);
    if(!dir){::close(copy);return false;}bool ok=true;errno=0;
    while(const auto* entry=::readdir(dir)) {
        const std::string name=entry->d_name;
        if(name!="."&&name!=".."&&name!=kManagedLease&&name!=kManagedInit&&name!=kManagedJournal&&name!=kLegacyBarrier){ok=false;break;}
        errno=0;
    }
    if(errno!=0)ok=false;::closedir(dir);return ok;
}
bool EmptyDirectory(int root) {
    const int copy=::openat(root,".",O_RDONLY|O_DIRECTORY|O_CLOEXEC);if(copy<0)return false;DIR* dir=::fdopendir(copy);
    if(!dir){::close(copy);return false;}bool empty=true;errno=0;
    while(const auto* entry=::readdir(dir)){const std::string n=entry->d_name;if(n!="."&&n!=".."){empty=false;break;}errno=0;}
    if(errno!=0)empty=false;::closedir(dir);return empty;
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
        case RecordingMutationType::SegmentV2BoundFinalized: return "segment_v2_bound_finalized";
        case RecordingMutationType::ConsumerReferencePut: return "consumer_reference_put";
        case RecordingMutationType::DerivedReferenceAccepted: return "derived_reference_accepted";
        case RecordingMutationType::ReferencedObservationPut: return "referenced_observation_put";
        case RecordingMutationType::DerivedJobIntent: return "derived_job_intent";
        case RecordingMutationType::DerivedJobFiles: return "derived_job_files";
        case RecordingMutationType::DerivedJobReady: return "derived_job_ready";
        case RecordingMutationType::DerivedJobCommitted: return "derived_job_committed";
        case RecordingMutationType::DerivedJobComplete: return "derived_job_complete";
        case RecordingMutationType::DerivedJobFailed: return "derived_job_failed";
        case RecordingMutationType::SegmentV2State: return "segment_v2_state";
        case RecordingMutationType::SegmentV2Deleted: return "segment_v2_deleted";
        case RecordingMutationType::EventLinkReceipt: return "event_link_receipt";
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
    if (value == "segment_v2_state") return RecordingMutationType::SegmentV2State;
    if (value == "segment_v2_deleted") return RecordingMutationType::SegmentV2Deleted;
    if (value == "event_link_receipt") return RecordingMutationType::EventLinkReceipt;
    if (value == "segment_v2_bound_finalized") return RecordingMutationType::SegmentV2BoundFinalized;
    if (value == "consumer_reference_put") return RecordingMutationType::ConsumerReferencePut;
    if (value == "derived_reference_accepted") return RecordingMutationType::DerivedReferenceAccepted;
    if (value == "referenced_observation_put") return RecordingMutationType::ReferencedObservationPut;
    if (value == "derived_job_intent") return RecordingMutationType::DerivedJobIntent;
    if (value == "derived_job_files") return RecordingMutationType::DerivedJobFiles;
    if (value == "derived_job_ready") return RecordingMutationType::DerivedJobReady;
    if (value == "derived_job_committed") return RecordingMutationType::DerivedJobCommitted;
    if (value == "derived_job_complete") return RecordingMutationType::DerivedJobComplete;
    if (value == "derived_job_failed") return RecordingMutationType::DerivedJobFailed;
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
    if(parsed_type==RecordingMutationType::SegmentV2State) {
        RecordingSegmentStateV2 state;
        if(!ParseRecordingSegmentStateV2(*payload,&state,error)) return false;
        if(state.segment_id!=*entity_id) return Fail(error,"V2 state entity 결박 불일치");
    }
    if(parsed_type==RecordingMutationType::SegmentV2Deleted) {
        RecordingTombstoneV2 tombstone;
        if(!ParseRecordingTombstoneV2(*payload,&tombstone,error)) return false;
        if(tombstone.segment.segment_id!=*entity_id) return Fail(error,"V2 tombstone entity 결박 불일치");
    }
    if(parsed_type==RecordingMutationType::EventLinkReceipt) {
        ingress::StrictJsonObjectDocument receipt;
        if(!ingress::ParseStrictJsonObjectDocument(*payload,&receipt,error)||receipt.members.size()!=3||
           ingress::StrictJsonStringField(receipt,"schema")!="media-server.recording-receipt.v1"||
           ingress::StrictJsonStringField(receipt,"originalType")!="event_link_created")return Fail(error,"receipt 형식 오류");
        const auto digest=ingress::StrictJsonStringField(receipt,"originalSha256");
        if(!digest||digest->size()!=64||!std::all_of(digest->begin(),digest->end(),[](char c){return (c>='0'&&c<='9')||(c>='a'&&c<='f');}))
            return Fail(error,"receipt digest 오류");
    }
    *value = RecordingMutationV1{*schema, *mutation_id, parsed_type, *occurred_at_ms, *entity_id, *payload};
    if (error != nullptr) error->clear();
    return true;
}

namespace {
// 예약 발급과 catalog 검증의 순서/ID 규칙을 함께 유지한다.
bool DerivedCommittedSegments(const std::string& json,std::vector<RecordingSegmentV2>* segments,std::string* error) {
    ingress::StrictJsonObjectDocument record,ready;
    if(json.size()>4*1024*1024||!ingress::ParseStrictJsonObjectDocument(json,&record,error)||
       ingress::StrictJsonStringField(record,"state")!="committed")return Fail(error,"derived commit order envelope 거부");
    const auto body=ingress::StrictJsonObjectField(record,"ready");
    if(!body||!ingress::ParseStrictJsonObjectDocument(*body,&ready,error))return false;
    const auto* outputs=ready.Find("outputs");
    if(!outputs||outputs->type!=ingress::StrictJsonType::Array)return Fail(error,"derived commit outputs 없음");
    const auto& raw=outputs->raw;std::size_t start=1;int depth=0;bool quote=false,escape=false;
    const auto append=[&](const std::string& item) {
        ingress::StrictJsonObjectDocument d;RecordingSegmentV2 s;
        if(!ingress::ParseStrictJsonObjectDocument(item,&d,error))return false;
        const auto value=ingress::StrictJsonObjectField(d,"segment");
        if(!value||!ParseRecordingSegmentV2(*value,&s,error))return false;
        segments->push_back(std::move(s));return segments->size()<=8;
    };
    for(std::size_t i=1;i+1<raw.size();++i) {
        const char c=raw[i];if(quote){if(escape)escape=false;else if(c=='\\')escape=true;else if(c=='"')quote=false;continue;}
        if(c=='"')quote=true;else if(c=='{'||c=='[')++depth;else if(c=='}'||c==']')--depth;
        else if(c==','&&!depth){if(!append(raw.substr(start,i-start)))return false;start=i+1;}
    }
    return append(raw.substr(start,raw.size()-start-1))&&!segments->empty();
}
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
            if(mutation.mutation_type==RecordingMutationType::DerivedJobCommitted) {
                std::vector<RecordingSegmentV2> outputs;
                if(!DerivedCommittedSegments(mutation.payload_json,&outputs,error))return false;
                std::unordered_set<std::string> output_ids;
                for(const auto& s:outputs) {
                    const auto order=requests.find(s.order_request_id);
                    if(!output_ids.insert(s.segment_id).second||order==requests.end()||order->second.segment_id!=s.segment_id||
                       order->second.store_id!=s.store_id||order->second.channel_id!=s.channel_id||order->second.sequence!=s.order_sequence)
                        return Fail(error,"derived 중첩 output 예약 결박 거부");
                }
            }
            if ((mutation.mutation_type == RecordingMutationType::SegmentFinalized ||
                 mutation.mutation_type == RecordingMutationType::SegmentV2Finalized ||
                 mutation.mutation_type == RecordingMutationType::SegmentV2BoundFinalized ||
                 mutation.mutation_type == RecordingMutationType::SegmentV2State ||
                 mutation.mutation_type == RecordingMutationType::SegmentV2Deleted ||
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

struct ManagedJournalState {
    OrderHistoryIndex order;
    RecordingMutationHandles records;
    std::unordered_map<std::string,std::string> identities;
    std::uint64_t bytes{0};
    bool checkpoint_pending{false};
};

namespace {
std::string EnvelopeIdentity(const RecordingMutationV1& mutation) {
    if(mutation.mutation_type==RecordingMutationType::EventLinkReceipt) {
        ingress::StrictJsonObjectDocument d;std::string error;
        if(!ingress::ParseStrictJsonObjectDocument(mutation.payload_json,&d,&error))return {};
        return ingress::StrictJsonStringField(d,"originalSha256").value_or("");
    }
    const auto text=SerializeRecordingMutationV1(mutation);
#if MEDIA_SERVER_USE_OPENSSL
    unsigned char bytes[EVP_MAX_MD_SIZE];unsigned int length=0;
    if(EVP_Digest(text.data(),text.size(),bytes,&length,EVP_sha256(),nullptr)!=1||length!=32)return {};
    constexpr char hex[]="0123456789abcdef";std::string result;result.reserve(64);
    for(unsigned int i=0;i<length;++i){result.push_back(hex[bytes[i]>>4]);result.push_back(hex[bytes[i]&15]);}
    return result;
#else
    return text;
#endif
}
bool IndexRecord(ManagedJournalState* state,const RecordingMutationV1& mutation,std::string* error,
                 RecordingMutationHandle owned) {
#if !MEDIA_SERVER_USE_OPENSSL
    if(mutation.mutation_type==RecordingMutationType::EventLinkReceipt)return Fail(error,"managed receipt crypto 미지원");
#endif
    const auto digest=EnvelopeIdentity(mutation);if(digest.empty())return Fail(error,"envelope digest 실패");
    const auto identity=std::to_string(mutation.entity_id.size())+":"+mutation.entity_id+":"+std::to_string(mutation.occurred_at_ms)+":"+digest;
    const auto old=state->identities.find(mutation.mutation_id);
    if(old!=state->identities.end()&&old->second!=identity)return Fail(error,"managed mutation ID 충돌");
    if(!owned)owned=std::make_shared<const RecordingMutationV1>(mutation);
    if(!state->order.Consume(mutation,error))return false;
    state->identities.emplace(mutation.mutation_id,identity);state->records.push_back(std::move(owned));return true;
}
bool CompactRecords(const RecordingMutationHandles& original,RecordingMutationHandles* result,std::string* error) {
#if !MEDIA_SERVER_USE_OPENSSL
    (void)original;(void)result;return Fail(error,"managed checkpoint crypto 미지원");
#else
    std::unordered_set<std::string> seen,receipts;std::unordered_map<std::string,std::string> latest;
    if(!result)return Fail(error,"checkpoint 후보 output 없음");
    for(const auto& handle:original) {
        if(!handle)return Fail(error,"checkpoint null 기록 거부");
        const auto& m=*handle;if(seen.insert(m.mutation_id).second) {
        if(m.mutation_type==RecordingMutationType::EventLinkCreated)latest[m.entity_id]=m.mutation_id;
        if(m.mutation_type==RecordingMutationType::EventLinkReceipt)receipts.insert(m.mutation_id);
        }
    }
    *result=original;
    for(auto& handle:*result)if(handle->mutation_type==RecordingMutationType::EventLinkCreated&&
        (receipts.count(handle->mutation_id)||latest.at(handle->entity_id)!=handle->mutation_id)){
        const auto digest=EnvelopeIdentity(*handle);if(digest.empty())return Fail(error,"checkpoint digest 실패");
        auto receipt=*handle;receipt.mutation_type=RecordingMutationType::EventLinkReceipt;
        receipt.payload_json="{\"schema\":\"media-server.recording-receipt.v1\",\"originalType\":\"event_link_created\",\"originalSha256\":\""+digest+"\"}";
        handle=std::make_shared<const RecordingMutationV1>(std::move(receipt));
    }
    return true;
#endif
}
std::string JournalBytes(const RecordingMutationHandles& records) {
    std::string bytes;for(const auto& m:records){if(!m)return {};bytes+=SerializeRecordingMutationV1(*m)+"\n";}return bytes;
}
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
RecordingJournal::RecordingJournal(ManagedOptions options)
    : managed_(true),managed_root_(std::move(options.root)),managed_store_id_(std::move(options.store_id)),
      path_(managed_root_/"recording-v2-mutations.jsonl") {}
RecordingJournal::~RecordingJournal() {
#if !defined(_WIN32)
    if(managed_fd_>=0)::close(managed_fd_);
    if(lease_fd_>=0)::close(lease_fd_);
#endif
}
bool RecordingJournal::LoadManagedStateLocked(std::string* error) {
#if !defined(_WIN32)
    auto state=std::make_unique<ManagedJournalState>();struct stat status{};
    if(!Regular(managed_fd_,&status)||status.st_size<0)return Fail(error,"managed index fd 오류");
    char block[65536];std::string line;off_t offset=0;
    while(offset<status.st_size){
        const auto wanted=static_cast<std::size_t>(std::min<off_t>(sizeof(block),status.st_size-offset));
        ssize_t count;do{count=::pread(managed_fd_,block,wanted,offset);}while(count<0&&errno==EINTR);
        if(count<=0)return Fail(error,"managed index read 실패");offset+=count;
        for(ssize_t i=0;i<count;++i){
            if(block[i]=='\n'){
                if(!line.empty()){RecordingMutationV1 m;if(!ParseRecordingMutationV1(line,&m,error)||!IndexRecord(state.get(),m,error,{}))return false;}
                line.clear();
            }else{if(line.size()>=16*1024*1024)return Fail(error,"managed record 상한");line.push_back(block[i]);}
        }
    }
    if(!line.empty())return Fail(error,"managed 미완결 원장");
    if(!state->order.bound_store.empty()&&state->order.bound_store!=managed_store_id_)return Fail(error,"managed index store 불일치");
    OwnedFd parent(OpenParent(io_path_,false));struct stat after{};
    if(parent.value<0||!Regular(managed_fd_,&after)||after.st_size!=status.st_size||!ManagedBindingLocked())return Fail(error,"managed index 생성 중 변경");
    state->checkpoint_pending=Present(parent.value,".recording-checkpoint.tmp");
    state->bytes=static_cast<std::uint64_t>(status.st_size);managed_state_=std::move(state);poisoned_=false;
    checkpoint_checked_bytes_=managed_state_->bytes;return true;
#else
    return Fail(error,"managed index unsupported");
#endif
}
bool RecordingJournal::CheckManagedStateLocked(std::string* error) const {
    if(!managed_)return true;
#if !defined(_WIN32)
    struct stat status{};
    if(poisoned_||!managed_state_||!ManagedBindingLocked()||::fstat(managed_fd_,&status)!=0||status.st_size<0||
       static_cast<std::uint64_t>(status.st_size)!=managed_state_->bytes){poisoned_=true;return Fail(error,"managed 원장 변경/불확실 상태: 재open 필요");}
    return true;
#else
    return Fail(error,"managed state unsupported");
#endif
}
bool RecordingJournal::ManagedOrderMatches(const RecordingOrderReservationV1& order,std::string* error) const {
#if !defined(_WIN32)
    if(managed_&&owner_pid_!=::getpid())return Fail(error,"managed fork 거부");
#endif
    std::lock_guard lock(mu_);if(!CheckManagedStateLocked(error)||!managed_||managed_state_->checkpoint_pending)return false;
    const auto found=managed_state_->order.requests.find(order.request_id);
    if(found==managed_state_->order.requests.end())return Fail(error,"managed 예약 없음");
    const auto& old=found->second;
    return (old.store_id==order.store_id&&old.segment_id==order.segment_id&&old.channel_id==order.channel_id&&old.sequence==order.sequence)||Fail(error,"managed 예약 tuple 불일치");
}
bool RecordingJournal::HasManagedLease() const {
#if !defined(_WIN32)
    if(!managed_||owner_pid_!=::getpid())return false;
    std::lock_guard lock(mu_);return ManagedBindingLocked();
#else
    return false;
#endif
}
std::string RecordingJournal::ManagedStoreId() const {
#if !defined(_WIN32)
    if(!managed_||owner_pid_!=::getpid())return {};
#endif
    std::lock_guard lock(mu_);
    return managed_&&opened_&&ManagedBindingLocked()?managed_store_id_:std::string{};
}
bool RecordingJournal::ManagedBindingLocked() const {
#if !defined(_WIN32)
    if(!opened_||owner_pid_!=::getpid()||managed_fd_<0||lease_fd_<0)return false;
    OwnedFd parent(OpenParent(io_path_,false));struct stat p{},j{},l{},m{},b{};
    if(parent.value<0||::fstat(parent.value,&p)!=0||static_cast<std::uint64_t>(p.st_dev)!=parent_device_||p.st_ino!=parent_inode_||
       !Regular(managed_fd_,&j)||static_cast<std::uint64_t>(j.st_dev)!=device_||j.st_ino!=inode_||!Same(parent.value,kManagedJournal,managed_fd_,j)||
       !Regular(lease_fd_,&l)||l.st_ino!=lease_inode_||static_cast<std::uint64_t>(l.st_dev)!=parent_device_||!Same(parent.value,kManagedLease,lease_fd_,l)||
       !ExactFile(parent.value,kManagedFormat,ManagedFormat(managed_store_id_),&m)||m.st_ino!=marker_inode_||
       ::fstatat(parent.value,kLegacyBarrier,&b,AT_SYMLINK_NOFOLLOW)!=0||!S_ISDIR(b.st_mode)||b.st_ino!=barrier_inode_||static_cast<std::uint64_t>(b.st_dev)!=parent_device_)
        return false;
    return true;
#else
    return false;
#endif
}
bool RecordingJournal::OpenManagedLocked(std::string* error) {
#if !defined(_WIN32)
    if(opened_)return CheckManagedStateLocked(error);
    if(managed_root_.empty()||(!managed_store_id_.empty()&&!ValidateOpaqueId(managed_store_id_,error))||!SafePath(path_,&io_path_))return Fail(error,"managed root/store ID 거부");
    OwnedFd parent(OpenParent(io_path_,true));struct stat p{};
    if(parent.value<0||::fstat(parent.value,&p)!=0)return Fail(error,"managed root 열기 실패");
    const bool committed=Present(parent.value,kManagedFormat);
    const bool pending=Present(parent.value,kManagedInit);
    if(committed) {
        if(pending)return Fail(error,"managed format/store 충돌");
    } else {
        if(!InitNamesOnly(parent.value))return Fail(error,"managed 기존 데이터 변환 거부");
        if(!pending&&(Present(parent.value,kManagedJournal)||Present(parent.value,kLegacyBarrier)))return Fail(error,"managed 소유권 없는 초기 파일 거부");
    }
    OwnedFd lease(::openat(parent.value,kManagedLease,O_RDWR|O_CREAT|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK,0600));struct stat l{};
    if(lease.value<0||!Regular(lease.value,&l)||l.st_size!=0||!Lock(lease.value,LOCK_EX|LOCK_NB)||!Same(parent.value,kManagedLease,lease.value,l))
        return Fail(error,"managed store 다른 소유자/lease 거부");
    if(!Sync(lease.value)||!Sync(parent.value))return Fail(error,"managed lease fsync 실패");
    if(Present(parent.value,kManagedFormat)!=committed||Present(parent.value,kManagedInit)!=pending)
        return Fail(error,"managed 초기 상태 변경: 재시도 필요");
    // ID 조회/생성은 lease 획득 뒤다. marker 이름 존재만으로 값을 신뢰하지 않는다.
    if(committed||pending) {
        std::string persisted;
        if(!ReadManagedStoreId(parent.value,committed?kManagedFormat:kManagedInit,&persisted)||
           (!managed_store_id_.empty()&&persisted!=managed_store_id_))
            return Fail(error,"managed format/store 충돌");
        managed_store_id_=std::move(persisted);
    } else if(managed_store_id_.empty()&&!NewManagedStoreId(&managed_store_id_)) {
        return Fail(error,"managed store 난수 생성 불가");
    }
    const auto format=ManagedFormat(managed_store_id_);
    if(!committed&&!pending) {
        OwnedFd init(::openat(parent.value,kManagedInit,O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC,0600));
        if(init.value<0||!WriteAll(init.value,format)||!Sync(init.value)||!Sync(parent.value))return Fail(error,"managed init 기록 실패: 보존");
    }
    if(!committed) {
        if(!ExactFile(parent.value,kManagedInit,format)||!InitNamesOnly(parent.value))return Fail(error,"managed init 재검증 실패");
        if(::mkdirat(parent.value,kLegacyBarrier,0750)!=0&&errno!=EEXIST)return Fail(error,"managed barrier 생성 실패");
    }
    OwnedFd barrier(::openat(parent.value,kLegacyBarrier,O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC));struct stat b{};
    if(barrier.value<0||::fstat(barrier.value,&b)!=0||!EmptyDirectory(barrier.value)||!Sync(barrier.value))return Fail(error,"managed barrier 거부");
    OwnedFd journal(::openat(parent.value,kManagedJournal,O_RDWR|O_APPEND|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK|(committed?0:O_CREAT),0640));struct stat j{};
    if(journal.value<0||!Regular(journal.value,&j)||!Lock(journal.value,LOCK_EX|LOCK_NB)||(!committed&&j.st_size!=0)||
       !Same(parent.value,kManagedJournal,journal.value,j))return Fail(error,"managed journal unsafe/초기 데이터 거부");
    if(!Sync(journal.value)||!Sync(parent.value))return Fail(error,"managed journal fsync 실패");
    if(!committed) {
        if(Present(parent.value,kManagedFormat)||::renameat(parent.value,kManagedInit,parent.value,kManagedFormat)!=0||!Sync(parent.value))
            return Fail(error,"managed format 원자확정 실패: 보존");
    }
    struct stat m{};
    if(!ExactFile(parent.value,kManagedFormat,format,&m))return Fail(error,"managed format 확정 검증 실패");
    managed_fd_=journal.value;journal.value=-1;lease_fd_=lease.value;lease.value=-1;
    owner_pid_=::getpid();device_=j.st_dev;inode_=j.st_ino;parent_device_=p.st_dev;parent_inode_=p.st_ino;
    lease_inode_=l.st_ino;marker_inode_=m.st_ino;barrier_inode_=b.st_ino;opened_=true;
    if(!LoadManagedStateLocked(error)){
        ::close(managed_fd_);::close(lease_fd_);managed_fd_=lease_fd_=-1;opened_=false;return false;
    }
    if(error)error->clear();return true;
#else
    return Fail(error,"managed lease 지원하지 않는 OS");
#endif
}

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
        !ValidateOpaqueId(*segment, error) || !ValidateRecordingReferenceId(*channel, error)) return false;
    *value = RecordingOrderReservationV1{*schema, *store, *request, *segment, *channel, *sequence};
    if (error != nullptr) error->clear();
    return true;
}
bool RecordingJournal::ReserveRecordingOrder(const std::string& store_id, const std::string& request_id,
    const std::string& segment_id, const std::string& channel_id,
    RecordingOrderReservationV1* result, std::string* error) {
#if !defined(_WIN32)
    if(managed_&&owner_pid_!=::getpid())return Fail(error,"managed fork/미open 사용 거부");
#endif
    std::lock_guard lock(mu_);
    if (!opened_ || result == nullptr) return Fail(error, "recording order 시작 조건 불충족");
    if(managed_&&(!CheckManagedStateLocked(error)||store_id!=managed_store_id_))return Fail(error,"managed store/lease 불일치");
    if(managed_&&managed_state_->checkpoint_pending)return Fail(error,"checkpoint 복구 선행 필요");
    if (!ValidateOpaqueId(store_id, error) || !ValidateOpaqueId(request_id, error) ||
        !ValidateOpaqueId(segment_id, error) || !ValidateRecordingReferenceId(channel_id, error)) return false;
#if !defined(_WIN32)
    OwnedFd parent(OpenParent(io_path_, false));
    struct stat directory {};
    if (parent.value < 0 || ::fstat(parent.value, &directory) != 0 ||
        parent_device_ != static_cast<std::uint64_t>(directory.st_dev) || parent_inode_ != directory.st_ino)
        return Fail(error, "recording order parent 교체 거부");
    const std::string name = io_path_.filename().string();
    OwnedFd fd(managed_ ? ::fcntl(managed_fd_, F_DUPFD_CLOEXEC, 0) : ::openat(parent.value, name.c_str(), O_RDWR | O_APPEND | O_NOFOLLOW | O_CLOEXEC | O_NONBLOCK));
    struct stat bound {};
    if (fd.value < 0 || (!managed_&&!Lock(fd.value, LOCK_EX)) || !Regular(fd.value, &bound) || bound.st_size < 0 ||
        device_ != static_cast<std::uint64_t>(bound.st_dev) || inode_ != bound.st_ino ||
        !Same(parent.value, name, fd.value, bound)) return Fail(error, "recording order unsafe inode 거부");

    // 예약은 전체 완결 원장을 검증한다. 일반 Append의 복구/비용 계약은 바꾸지 않는다.
    OrderHistoryIndex raw_index;
    auto& index=managed_?managed_state_->order:raw_index;
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
    while (!managed_ && offset < bound.st_size) {
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
        if (!Sync(fd.value)) {if(managed_)poisoned_=true;return Fail(error, "recording order 재시도 fsync 실패");}
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
        const auto durable=SerializeRecordingMutationV1(mutation)+"\n";
        if (!WriteAll(fd.value,durable) || !Sync(fd.value)) {
            if(managed_)poisoned_=true;return Fail(error, "recording order write/fsync 실패");
        }
        if(managed_){
            if(!IndexRecord(managed_state_.get(),mutation,error,{})){poisoned_=true;return false;}
            managed_state_->bytes+=durable.size();
        }
        *result = std::move(order);
    }
    if (error != nullptr) error->clear();
    return true;
#else
    return Fail(error, "recording order 배타 잠금 미지원");
#endif
}

bool RecordingJournal::Open(std::string* error) {
#if !defined(_WIN32)
    if(managed_&&owner_pid_!=0&&owner_pid_!=::getpid())return Fail(error,"managed fork 사용 거부");
#endif
    std::lock_guard lock(mu_);
    if(managed_)return OpenManagedLocked(error);
#if !defined(_WIN32)
    if (!SafePath(path_, &io_path_)) return Fail(error, "journal path 거부");
    OwnedFd parent(OpenParent(io_path_, !opened_));
    if (parent.value < 0) return Fail(error, "journal parent 안전 open 실패");
    if(Present(parent.value,kManagedLease)||Present(parent.value,kManagedInit)||Present(parent.value,kManagedFormat))
        return Fail(error,"raw journal의 managed root 접근 거부");
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
    return AppendOwned(mutation, nullptr, error);
}

bool RecordingJournal::ReadCheckpointRecords(const void* owner,RecordingMutationHandles* records,std::string* error) const {
#if !defined(_WIN32)
    if(managed_&&owner_pid_!=::getpid())return Fail(error,"managed fork 거부");
#endif
    std::lock_guard lock(mu_);
    if(!managed_||!owner||owner!=catalog_owner_||!records||!CheckManagedStateLocked(error))return Fail(error,"checkpoint owner/state 거부");
#if !defined(_WIN32)
    // Replay의 안전한 parent/FD/inode 재확인을 유지한다. 반환 vector는 소유 핸들의 독립 사본이다.
    OwnedFd parent(OpenParent(io_path_,false));struct stat directory{},status{};
    if(!opened_||parent.value<0||::fstat(parent.value,&directory)!=0||
       parent_device_!=static_cast<std::uint64_t>(directory.st_dev)||parent_inode_!=directory.st_ino)return Fail(error,"checkpoint parent 거부");
    OwnedFd fd(::fcntl(managed_fd_,F_DUPFD_CLOEXEC,0));
    if(fd.value<0||!Regular(fd.value,&status)||device_!=static_cast<std::uint64_t>(status.st_dev)||inode_!=status.st_ino||
       !Same(parent.value,io_path_.filename().string(),fd.value,status))return Fail(error,"checkpoint FD 결박 거부");
    for(const auto& handle:managed_state_->records)if(!handle)return Fail(error,"checkpoint null 기록 거부");
    *records=managed_state_->records;return true;
#else
    return Fail(error,"checkpoint unsupported");
#endif
}
bool RecordingJournal::PrepareCheckpoint(const void* owner,RecordingMutationHandles* candidate,std::string* error) const {
#if !defined(_WIN32)
    if(managed_&&owner_pid_!=::getpid())return Fail(error,"managed fork 거부");
#endif
    std::lock_guard lock(mu_);
    if(!managed_||!owner||owner!=catalog_owner_||!candidate||!CheckManagedStateLocked(error))return Fail(error,"checkpoint owner/state 거부");
    return CompactRecords(managed_state_->records,candidate,error);
}
bool RecordingJournal::CheckpointDue(const void* owner) const {
#if !defined(_WIN32)
    if(managed_&&owner_pid_!=::getpid())return false;
#endif
    std::lock_guard lock(mu_);
    return managed_&&owner==catalog_owner_&&managed_state_&&managed_state_->bytes>=checkpoint_checked_bytes_&&
        managed_state_->bytes-checkpoint_checked_bytes_>=1024*1024;
}
bool RecordingJournal::CheckpointPending() const {
#if !defined(_WIN32)
    if(!managed_||owner_pid_!=::getpid())return false;
    std::lock_guard lock(mu_);OwnedFd parent(OpenParent(io_path_,false));
    return parent.value>=0&&Present(parent.value,".recording-checkpoint.tmp");
#else
    return false;
#endif
}
bool RecordingJournal::CommitCheckpoint(const void* owner,const RecordingMutationHandles& candidate,bool recover_only,std::string* error) {
#if !defined(_WIN32)
    if(managed_&&owner_pid_!=::getpid())return Fail(error,"managed fork 거부");
#endif
    std::lock_guard lock(mu_);
    if(!managed_||!owner||owner!=catalog_owner_||!CheckManagedStateLocked(error))return Fail(error,"checkpoint 소유권 거부");
#if !defined(_WIN32)
    OwnedFd parent(OpenParent(io_path_,false));constexpr const char* temporary=".recording-checkpoint.tmp";
    if(parent.value<0)return Fail(error,"checkpoint parent 오류");
    const bool pending=Present(parent.value,temporary);
    if(recover_only&&!pending)return true;
    RecordingMutationHandles expected;
    if(!CompactRecords(managed_state_->records,&expected,error))return false;
    if(expected.size()!=candidate.size()||!detail::SameCheckpointPrefix(expected,candidate))return Fail(error,"checkpoint 후보 필드 불일치");
    const auto bytes=JournalBytes(expected);
    if(bytes!=JournalBytes(candidate))return Fail(error,"checkpoint 후보 불일치");
    // 성공한 rename/fsync 뒤 할당하지 않고, 검증한 candidate와 같은 immutable envelope를 게시한다.
    RecordingMutationHandles published=candidate;
    if(pending){
        OwnedFd stage(::openat(parent.value,temporary,O_RDONLY|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK));struct stat status{};
        if(stage.value<0||!Regular(stage.value,&status)||status.st_size<0||static_cast<std::uint64_t>(status.st_size)>bytes.size()){poisoned_=true;return Fail(error,"checkpoint 잔여 원본 보존");}
        std::string prefix(static_cast<std::size_t>(status.st_size),'\0');
        if(!ReadAt(stage.value,0,&prefix)||bytes.compare(0,prefix.size(),prefix)!=0||!Same(parent.value,temporary,stage.value,status)){poisoned_=true;return Fail(error,"checkpoint 잔여 불일치 보존");}
        if(::unlinkat(parent.value,temporary,0)!=0||!Sync(parent.value)){poisoned_=true;return Fail(error,"checkpoint 잔여 정리 불확실");}
    }
    managed_state_->checkpoint_pending=false;
    if(recover_only)return true;
    checkpoint_checked_bytes_=managed_state_->bytes;
    if(bytes.size()>=managed_state_->bytes)return true;
    OwnedFd stage(::openat(parent.value,temporary,O_RDWR|O_APPEND|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC,0640));
    if(stage.value<0||!Lock(stage.value,LOCK_EX|LOCK_NB)||!WriteAll(stage.value,bytes)||!Sync(stage.value)){
        poisoned_=true;return Fail(error,"checkpoint 준비 실패: 원본 보존");
    }
    struct stat staged{};
    if(!Regular(stage.value,&staged)||!Same(parent.value,temporary,stage.value,staged)||!CheckManagedStateLocked(error)){poisoned_=true;return Fail(error,"checkpoint 준비 결박 실패");}
    if(::renameat(parent.value,temporary,parent.value,io_path_.filename().c_str())!=0){poisoned_=true;return Fail(error,"checkpoint rename 실패");}
    if(!Sync(parent.value)){poisoned_=true;return Fail(error,"checkpoint directory fsync 불확실");}
    ::close(managed_fd_);managed_fd_=stage.value;stage.value=-1;device_=static_cast<std::uint64_t>(staged.st_dev);inode_=staged.st_ino;
    managed_state_->records=std::move(published);managed_state_->bytes=bytes.size();checkpoint_checked_bytes_=bytes.size();return true;
#else
    (void)candidate;(void)recover_only;return Fail(error,"checkpoint unsupported");
#endif
}

bool RecordingJournal::AttachCatalog(const void* owner, const std::filesystem::path& media,
                                     const std::filesystem::path& sqlite, bool enable_v2, std::string* error) {
    if (!managed_) return true;
#if !defined(_WIN32)
    if (owner_pid_ != ::getpid()) return Fail(error,"managed catalog fork 거부");
    std::lock_guard lock(mu_);
    std::filesystem::path media_absolute,sqlite_absolute;
    if (!owner || catalog_owner_ || !enable_v2 || !ManagedBindingLocked() || !SafePath(media,&media_absolute) || !SafePath(sqlite,&sqlite_absolute))
        return Fail(error,"managed catalog 소유권/옵션 거부");
    if(media_absolute != io_path_.parent_path()) return Fail(error,"managed media root 불일치");
    if(sqlite_absolute != io_path_.parent_path()/"recording-catalog.sqlite3") return Fail(error,"managed sqlite 경로 불일치");
    OwnedFd parent(OpenParent(io_path_,false));struct stat status {};
    if(parent.value<0)return Fail(error,"managed catalog parent 거부");
    for(const char* name:{"recording-catalog.sqlite3","recording-catalog.sqlite3-wal",
                         "recording-catalog.sqlite3-shm","recording-catalog.sqlite3-journal"}) {
        if(::fstatat(parent.value,name,&status,AT_SYMLINK_NOFOLLOW)==0){
            if(!S_ISREG(status.st_mode)||status.st_nlink!=1)return Fail(error,"managed sqlite unsafe file");
        } else if(errno!=ENOENT)return Fail(error,"managed sqlite stat 실패");
    }
    catalog_owner_=owner;return true;
#else
    (void)owner;(void)media;(void)sqlite;(void)enable_v2;
    return Fail(error,"managed catalog unsupported");
#endif
}
void RecordingJournal::DetachCatalog(const void* owner) {
    if (!managed_) return;
#if !defined(_WIN32)
    if(owner_pid_!=::getpid())return;
#endif
    std::lock_guard lock(mu_);if(catalog_owner_==owner)catalog_owner_=nullptr;
}
bool RecordingJournal::OwnsCatalog(const void* owner) const {
    if(!managed_)return true;
#if !defined(_WIN32)
    if(owner_pid_!=::getpid())return false;
#endif
    std::lock_guard lock(mu_);return owner&&catalog_owner_==owner&&CheckManagedStateLocked(nullptr);
}
bool RecordingJournal::AppendOwned(const RecordingMutationV1& mutation, const void* owner, std::string* error,
                                   RecordingMutationHandle* appended) {
    // 입력이 *appended를 빌린 경우에도 결과 초기화가 입력의 마지막 소유자를 제거하지 않는다.
    const RecordingMutationHandle input_lifetime=appended?*appended:RecordingMutationHandle{};
    if(appended)appended->reset();
#if !defined(_WIN32)
    if(managed_&&owner_pid_!=::getpid())return Fail(error,"managed fork/미open 사용 거부");
#endif
    std::lock_guard lock(mu_);
    if (!opened_) return Fail(error, "journal이 열리지 않음");
    if(managed_&&((owner&&catalog_owner_!=owner)||(!owner&&catalog_owner_)))return Fail(error,"managed catalog append 소유권 거부");
    if(managed_&&!CheckManagedStateLocked(error))return false;
    if(managed_&&managed_state_->checkpoint_pending)return Fail(error,"checkpoint 복구 선행 필요");
    if(mutation.mutation_type==RecordingMutationType::EventLinkReceipt)return Fail(error,"receipt checkpoint 전용");
    if (mutation.mutation_type == RecordingMutationType::RecordingOrderReserved)
        return Fail(error, "recording order 전용 예약 API 필요");
    RecordingMutationV1 parsed;
    const std::string line = SerializeRecordingMutationV1(mutation);
    if (!ParseRecordingMutationV1(line, &parsed, error)) return false;
    const std::string durable = line + "\n";
    // 내구 쓰기 전에 envelope를 준비한다. retry는 compact receipt가 아니라 원래 입력을 반환한다.
    const auto owned=(managed_||appended)?std::make_shared<const RecordingMutationV1>(parsed):RecordingMutationHandle{};
    if(managed_) {
        const auto digest=EnvelopeIdentity(parsed);const auto old=managed_state_->identities.find(parsed.mutation_id);
        if(digest.empty())return Fail(error,"managed digest 실패");
        const auto identity=std::to_string(parsed.entity_id.size())+":"+parsed.entity_id+":"+std::to_string(parsed.occurred_at_ms)+":"+digest;
        if(old!=managed_state_->identities.end()){
            if(old->second!=identity)return Fail(error,"managed mutation ID 충돌");
            if(!Sync(managed_fd_)){poisoned_=true;return Fail(error,"managed 재시도 fsync 실패");}
            if(appended)*appended=owned;
            return true;
        }
        if(managed_state_->order.requests.count(parsed.mutation_id))return Fail(error,"managed 예약 ID 충돌");
    }
#if !defined(_WIN32)
    OwnedFd parent(OpenParent(io_path_, false));
    struct stat directory {};
    if (parent.value < 0 || ::fstat(parent.value, &directory) != 0 ||
        parent_device_ != static_cast<std::uint64_t>(directory.st_dev) || parent_inode_ != directory.st_ino)
        return Fail(error, "journal parent 교체 거부");
    const std::string name = io_path_.filename().string();
    OwnedFd fd(managed_ ? ::fcntl(managed_fd_, F_DUPFD_CLOEXEC, 0) : ::openat(parent.value, name.c_str(), O_RDWR | O_APPEND | O_NOFOLLOW | O_CLOEXEC | O_NONBLOCK));
    struct stat status {};
    if (fd.value < 0 || (!managed_&&!Lock(fd.value, LOCK_EX)) || !Regular(fd.value, &status) ||
        device_ != static_cast<std::uint64_t>(status.st_dev) || inode_ != status.st_ino)
        return Fail(error, "journal inode 교체/unsafe fd 거부");
    if (managed_) {
        std::string last(1, '\0');
        if (status.st_size > 0 && (!ReadAt(fd.value, status.st_size - 1, &last) || last[0] != '\n'))
            return Fail(error, "managed journal 미완결 tail 거부");
    } else if (!RepairTail(parent.value, name, fd.value, status)) return Fail(error, "journal tail 내구격리/복구 실패");
    if (!Same(parent.value, name, fd.value, status)) return Fail(error, "journal append inode 재대조 실패");
    if (!WriteAll(fd.value, durable) || !Sync(fd.value)) {if(managed_)poisoned_=true;return Fail(error, "journal write/fsync 실패");}
    if(managed_){if(!IndexRecord(managed_state_.get(),parsed,error,owned)){poisoned_=true;return false;}managed_state_->bytes+=durable.size();}
#else
    std::ofstream output(path_, std::ios::binary | std::ios::app);
    output << durable;
    output.flush();
    if (!output) return Fail(error, "journal write/flush 실패");
#endif
    if (error != nullptr) error->clear();
    if(appended)*appended=owned;
    return true;
}

RecordingJournalReplayResult RecordingJournal::Replay() const {
#if !defined(_WIN32)
    if(managed_&&owner_pid_!=::getpid()){RecordingJournalReplayResult denied;++denied.io_error_count;return denied;}
#endif
    std::lock_guard lock(mu_);
    RecordingJournalReplayResult result;
    if(managed_&&!CheckManagedStateLocked(nullptr)){++result.io_error_count;return result;}
#if !defined(_WIN32)
    if (!opened_) { ++result.io_error_count; return result; }
    OwnedFd parent(OpenParent(io_path_, false));
    struct stat directory {};
    if (parent.value < 0 || ::fstat(parent.value, &directory) != 0 ||
        parent_device_ != static_cast<std::uint64_t>(directory.st_dev) || parent_inode_ != directory.st_ino) {
        ++result.io_error_count; return result;
    }
    const std::string name = io_path_.filename().string();
    OwnedFd fd(managed_ ? ::fcntl(managed_fd_, F_DUPFD_CLOEXEC, 0) : ::openat(parent.value, name.c_str(), O_RDONLY | O_NOFOLLOW | O_CLOEXEC | O_NONBLOCK));
    struct stat status {};
    if (fd.value < 0 || (!managed_&&!Lock(fd.value, LOCK_SH)) || !Regular(fd.value, &status) ||
        device_ != static_cast<std::uint64_t>(status.st_dev) || inode_ != status.st_ino ||
        !Same(parent.value, name, fd.value, status)) { ++result.io_error_count; return result; }
    if(managed_){result.mutations.reserve(managed_state_->records.size());for(const auto& handle:managed_state_->records){if(!handle){result.mutations.clear();++result.io_error_count;return result;}result.mutations.push_back(*handle);}return result;}
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
