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
#include <string_view>
#include <stdexcept>
#include <unordered_map>
#include <unordered_set>
#include <sys/stat.h>
#include <zlib.h>

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
constexpr const char* kGenerationManifest="recording-generation.json";
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

namespace {
constexpr std::size_t kArchiveLogicalLimit=16U*1024*1024;
constexpr char kArchiveSchema[]="media-server.recording-compressed-mutation.v1";
constexpr char kBase64[]="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

std::string Base64Encode(std::string_view source) {
    std::string result;result.reserve(((source.size()+2)/3)*4);
    for(std::size_t i=0;i<source.size();i+=3){
        const auto a=static_cast<unsigned char>(source[i]);
        const auto b=i+1<source.size()?static_cast<unsigned char>(source[i+1]):0;
        const auto c=i+2<source.size()?static_cast<unsigned char>(source[i+2]):0;
        result.push_back(kBase64[a>>2]);result.push_back(kBase64[((a&3)<<4)|(b>>4)]);
        result.push_back(i+1<source.size()?kBase64[((b&15)<<2)|(c>>6)]:'=');
        result.push_back(i+2<source.size()?kBase64[c&63]:'=');
    }
    return result;
}
bool Base64Decode(std::string_view source,std::string* result) {
    if(!result||source.empty()||source.size()%4)return false;
    std::string decoded;decoded.reserve(source.size()/4*3);
    const auto value=[](char c)->int {
        if(c>='A'&&c<='Z')return c-'A';if(c>='a'&&c<='z')return c-'a'+26;
        if(c>='0'&&c<='9')return c-'0'+52;if(c=='+')return 62;if(c=='/')return 63;return -1;
    };
    for(std::size_t i=0;i<source.size();i+=4){
        const int a=value(source[i]),b=value(source[i+1]);
        const bool last=i+4==source.size(),pad2=source[i+2]=='=',pad3=source[i+3]=='=';
        if(a<0||b<0||(!last&&(pad2||pad3))||(pad2&&!pad3))return false;
        const int c=pad2?0:value(source[i+2]),d=pad3?0:value(source[i+3]);
        if(c<0||d<0)return false;
        decoded.push_back(static_cast<char>((a<<2)|(b>>4)));
        if(!pad2)decoded.push_back(static_cast<char>(((b&15)<<4)|(c>>2)));
        if(!pad3)decoded.push_back(static_cast<char>(((c&3)<<6)|d));
    }
    if(Base64Encode(decoded)!=source)return false;
    *result=std::move(decoded);return true;
}
std::string ArchiveWrapper(std::size_t size,uLong checksum,std::string_view base64) {
    return std::string("{\"schema\":\"")+kArchiveSchema+"\",\"codec\":\"zlib-base64\",\"length\":"+
        std::to_string(size)+",\"crc32\":"+std::to_string(checksum)+",\"data\":\""+std::string(base64)+"\"}";
}
[[maybe_unused]] std::string CompressArchive(std::string_view logical) {
    if(logical.size()<512||logical.size()>kArchiveLogicalLimit)return {};
    std::string compressed(compressBound(static_cast<uLong>(logical.size())),'\0');
    uLongf size=compressed.size();
    if(compress2(reinterpret_cast<Bytef*>(compressed.data()),&size,
        reinterpret_cast<const Bytef*>(logical.data()),static_cast<uLong>(logical.size()),Z_DEFAULT_COMPRESSION)!=Z_OK)return {};
    compressed.resize(size);
    const auto checksum=crc32(crc32(0,Z_NULL,0),reinterpret_cast<const Bytef*>(logical.data()),static_cast<uInt>(logical.size()));
    auto wrapper=ArchiveWrapper(logical.size(),checksum,Base64Encode(compressed));
    return wrapper.size()<logical.size()?wrapper:std::string{};
}
bool ExpandArchive(const std::string& json,const ingress::StrictJsonObjectDocument& document,
                   RecordingMutationV1* value,std::string* error) {
    const auto codec=ingress::StrictJsonStringField(document,"codec");
    const auto length=Int64Field(document,"length"),checksum=Int64Field(document,"crc32");
    const auto data=ingress::StrictJsonStringField(document,"data");
    if(document.members.size()!=5||codec!="zlib-base64"||!length||*length<=0||
       *length>static_cast<std::int64_t>(kArchiveLogicalLimit)||!checksum||*checksum<0||
       *checksum>std::numeric_limits<std::uint32_t>::max()||!data||data->size()>kArchiveLogicalLimit)
        return Fail(error,"압축 원장 형식/상한 오류");
    auto physical=json;if(!physical.empty()&&physical.back()=='\n')physical.pop_back();
    if(physical!=ArchiveWrapper(static_cast<std::size_t>(*length),static_cast<uLong>(*checksum),*data))
        return Fail(error,"압축 원장 비정규 형식");
    std::string bytes;if(!Base64Decode(*data,&bytes))return Fail(error,"압축 원장 base64 오류");
    std::string logical(static_cast<std::size_t>(*length),'\0');uLongf output=logical.size();
    if(uncompress(reinterpret_cast<Bytef*>(logical.data()),&output,
        reinterpret_cast<const Bytef*>(bytes.data()),bytes.size())!=Z_OK||output!=logical.size())
        return Fail(error,"압축 원장 복원 오류");
    const auto actual=crc32(crc32(0,Z_NULL,0),reinterpret_cast<const Bytef*>(logical.data()),static_cast<uInt>(logical.size()));
    if(actual!=static_cast<uLong>(*checksum))return Fail(error,"압축 원장 무결성 오류");
    ingress::StrictJsonObjectDocument inner;
    if(!ingress::ParseStrictJsonObjectDocument(logical,&inner,error)||
       ingress::StrictJsonStringField(inner,"schema")!="media-server.recording-mutation.v1")
        return Fail(error,"압축 원장 중첩/스키마 오류");
    RecordingMutationV1 expanded;
    if(!ParseRecordingMutationV1(logical,&expanded,error)||!expanded.physical_json.empty()||
       (expanded.mutation_type!=RecordingMutationType::SegmentV2BoundFinalized&&
        expanded.mutation_type!=RecordingMutationType::SegmentV2Deleted)||
       SerializeRecordingMutationV1(expanded)!=logical)return Fail(error,"압축 원장 논리 행 오류");
    expanded.physical_json=std::move(physical);*value=std::move(expanded);
    if(error)error->clear();return true;
}
std::string PhysicalRecordingMutation(const RecordingMutationV1& value) {
    return value.physical_json.empty()?SerializeRecordingMutationV1(value):value.physical_json;
}
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
    if(schema==kArchiveSchema)return ExpandArchive(json,document,value,error);
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
    *value = RecordingMutationV1{*schema, *mutation_id, parsed_type, *occurred_at_ms, *entity_id, *payload, {}};
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

// 외부에 정의를 공개하지 않는다. 토큰은 특정 journal 파일 세대의 물리 행 하나를 가리킨다.
struct RecordingJournalRecordLocation {
    std::shared_ptr<const char> generation;
    std::size_t ordinal{0};
    std::uint64_t offset{0},length{0};
    std::size_t logical_charge{0};
    std::string raw_sha256,record_identity,schema,mutation_id,entity_id;
    RecordingMutationType type{RecordingMutationType::Unknown};
    std::int64_t occurred_at_ms{0};
    RecordingMutationHandle resident_fallback;
    bool canonical_raw{false};
    bool compressed_storage{false};
};
// dense_slot만 메모리 vector의 인덱스다. global_ordinal은 영속 논리 좌표이며
// gap/uint64 경계를 가질 수 있어 인덱스로 사용하지 않는다. v1 생성 시 둘은 동일하다.
class RecordingJournalRecordRef {
    friend class RecordingJournal;
    friend struct ManagedJournalState;
    RecordingJournalRecordRef()=default;
    std::shared_ptr<const char> lineage;
    std::size_t dense_slot{0};
    std::uint64_t global_ordinal{0};
public:
    ~RecordingJournalRecordRef()=default;
};
// 같은 잠금 안에서 얻은 값·논리 참조·현재 attachment를 결박하는 호출-local 증거다.
class RecordingJournalOwnedView {
    friend class RecordingJournal;
    RecordingJournalOwnedView()=default;
    const RecordingJournal* journal{nullptr};
    RecordingMutationHandle record;
    RecordingJournalRecordRefHandle ref;
    std::shared_ptr<const char> authority;
public:
    ~RecordingJournalOwnedView()=default;
};
struct ManagedJournalState {
    OrderHistoryIndex order;
    RecordingMutationHandles records;
    std::size_t resident_checked{0};
    std::shared_ptr<const char> generation{std::make_shared<const char>(0)};
    RecordingJournalRecordLocations locations;
    std::shared_ptr<const char> lineage{std::make_shared<const char>(0)};
    RecordingJournalRecordRefs refs;
    std::unordered_map<std::string,std::string> identities;
    std::uint64_t bytes{0};
    std::uint64_t revision{0};
    bool checkpoint_pending{false};
    bool automatic_noop_disabled{false};
    static RecordingJournalRecordRefHandle MakeRef(const std::shared_ptr<const char>& lineage,std::size_t slot,std::uint64_t global) {
        auto ref=std::shared_ptr<RecordingJournalRecordRef>(new RecordingJournalRecordRef);
        ref->lineage=lineage;ref->dense_slot=slot;ref->global_ordinal=global;return ref;
    }
};
// journal만 mint한다. 외부에는 const opaque handle만 공개하며 어느 소유자도 저장하지 않는다.
class RecordingCheckpointReadSnapshot {
    friend class RecordingJournal;
    RecordingCheckpointReadSnapshot()=default;
    const RecordingJournal* journal{nullptr};
    const void* owner{nullptr};
    std::int64_t pid{0};
    std::shared_ptr<const char> attachment,generation;
    std::uint64_t bytes{0},revision{0};
    RecordingMutationHandles records;
public:
    ~RecordingCheckpointReadSnapshot()=default;
};

namespace {
std::string RawHash(std::string_view text) {
#if MEDIA_SERVER_USE_OPENSSL
    unsigned char bytes[EVP_MAX_MD_SIZE];unsigned int length=0;
    if(EVP_Digest(text.data(),text.size(),bytes,&length,EVP_sha256(),nullptr)!=1||length!=32)return {};
    constexpr char hex[]="0123456789abcdef";std::string result;result.reserve(64);
    for(unsigned int i=0;i<length;++i){result.push_back(hex[bytes[i]>>4]);result.push_back(hex[bytes[i]&15]);}
    return result;
#else
    (void)text;return {};
#endif
}
std::string EnvelopeIdentity(const RecordingMutationV1& mutation) {
    if(mutation.mutation_type==RecordingMutationType::EventLinkReceipt) {
        ingress::StrictJsonObjectDocument d;std::string error;
        if(!ingress::ParseStrictJsonObjectDocument(mutation.payload_json,&d,&error))return {};
        return ingress::StrictJsonStringField(d,"originalSha256").value_or("");
    }
    const auto text=SerializeRecordingMutationV1(mutation);
#if MEDIA_SERVER_USE_OPENSSL
    return RawHash(text);
#else
    return text;
#endif
}
RecordingJournalRecordLocationHandle MakeLocation(const std::shared_ptr<const char>& generation,
    std::size_t ordinal,std::uint64_t offset,std::string_view raw,const RecordingMutationHandle& record,
    const std::string& identity,bool canonical_raw=false) {
    try {
    if(!record||raw.empty()||raw.back()!='\n')return {};
    auto location=std::make_shared<RecordingJournalRecordLocation>();
    location->generation=generation;location->ordinal=ordinal;location->offset=offset;location->length=raw.size();
    location->schema=record->schema;location->mutation_id=record->mutation_id;location->entity_id=record->entity_id;
    location->type=record->mutation_type;location->occurred_at_ms=record->occurred_at_ms;
    location->canonical_raw=canonical_raw;
    location->compressed_storage=!record->physical_json.empty();
    location->logical_charge=sizeof(RecordingMutationV1)+record->schema.size()+record->mutation_id.size()+record->entity_id.size()+record->payload_json.size();
    // 기존 Append에는 16MiB 제한이 없다. 기존 수용 입력/crypto-off를 새로 거부하지 않는다.
    if(!MEDIA_SERVER_USE_OPENSSL||raw.size()>16*1024*1024+1)location->resident_fallback=record;
    else {
        location->raw_sha256=RawHash(raw);location->record_identity=identity;
        if(location->raw_sha256.empty()||identity.empty())return {};
    }
    return location;
    }catch(...){return {};}
}
bool LocationMetadataMatches(const RecordingJournalRecordLocation& location,const RecordingMutationV1& record) {
    return location.schema==record.schema&&location.mutation_id==record.mutation_id&&location.entity_id==record.entity_id&&
        location.type==record.mutation_type&&location.occurred_at_ms==record.occurred_at_ms;
}
bool IndexRecord(ManagedJournalState* state,const RecordingMutationV1& mutation,std::string* error,
                 RecordingMutationHandle owned,std::string_view raw,std::uint64_t offset) {
    try {
#if !MEDIA_SERVER_USE_OPENSSL
    if(mutation.mutation_type==RecordingMutationType::EventLinkReceipt)return Fail(error,"managed receipt crypto 미지원");
#endif
    // 최초 엄격 수용 때의 formatter 결과를 identity와 raw 적격 판정에 함께 쓴다.
    const auto canonical=SerializeRecordingMutationV1(mutation);
    const auto digest=mutation.mutation_type==RecordingMutationType::EventLinkReceipt?EnvelopeIdentity(mutation):
        (MEDIA_SERVER_USE_OPENSSL?RawHash(canonical):canonical);
    if(digest.empty())return Fail(error,"envelope digest 실패");
    const auto identity=std::to_string(mutation.entity_id.size())+":"+mutation.entity_id+":"+std::to_string(mutation.occurred_at_ms)+":"+digest;
    const auto old=state->identities.find(mutation.mutation_id);
    if(old!=state->identities.end()&&old->second!=identity)return Fail(error,"managed mutation ID 충돌");
    if(!owned)owned=std::make_shared<const RecordingMutationV1>(mutation);
    const auto physical=PhysicalRecordingMutation(mutation);
    const bool canonical_raw=raw.size()==physical.size()+1&&raw.back()=='\n'&&raw.substr(0,physical.size())==physical;
    const auto location=MakeLocation(state->generation,state->records.size(),offset,raw,owned,digest,canonical_raw);
    if(!location)return Fail(error,"managed 위치 생성 실패");
    const auto ref=ManagedJournalState::MakeRef(state->lineage,state->records.size(),state->records.size());
    if(state->revision==std::numeric_limits<std::uint64_t>::max())return Fail(error,"managed revision 상한");
    if(!state->order.Consume(mutation,error))return false;
    state->identities.emplace(mutation.mutation_id,identity);state->records.push_back(std::move(owned));
    state->locations.push_back(location);state->refs.push_back(ref);++state->revision;return true;
    }catch(...){return Fail(error,"managed index 준비 실패");}
}
bool CompactRecords(const RecordingMutationHandles& original,RecordingMutationHandles* result,std::string* error) {
#if !MEDIA_SERVER_USE_OPENSSL
    (void)original;(void)result;return Fail(error,"managed checkpoint crypto 미지원");
#else
    std::unordered_set<std::string> seen,receipts,deleted;std::unordered_map<std::string,std::string> latest;
    if(!result)return Fail(error,"checkpoint 후보 output 없음");
    for(const auto& handle:original) {
        if(!handle)return Fail(error,"checkpoint null 기록 거부");
        const auto& m=*handle;if(seen.insert(m.mutation_id).second) {
        if(m.mutation_type==RecordingMutationType::EventLinkCreated)latest[m.entity_id]=m.mutation_id;
        if(m.mutation_type==RecordingMutationType::EventLinkReceipt)receipts.insert(m.mutation_id);
        if(m.mutation_type==RecordingMutationType::SegmentV2Deleted)deleted.insert(m.entity_id);
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
    for(auto& handle:*result)if((handle->mutation_type==RecordingMutationType::SegmentV2BoundFinalized||
        handle->mutation_type==RecordingMutationType::SegmentV2Deleted)&&
        deleted.count(handle->entity_id)&&handle->physical_json.empty()){
        auto copy=*handle;copy.physical_json=CompressArchive(SerializeRecordingMutationV1(copy));
        if(!copy.physical_json.empty())handle=std::make_shared<const RecordingMutationV1>(std::move(copy));
    }
    return true;
#endif
}
std::string JournalBytes(const RecordingMutationHandles& records,std::vector<std::pair<std::size_t,std::size_t>>* spans=nullptr) {
    if(spans){spans->clear();spans->reserve(records.size());}
    std::string bytes;for(const auto& m:records){if(!m)return {};const auto offset=bytes.size();
        bytes+=PhysicalRecordingMutation(*m)+"\n";if(spans)spans->emplace_back(offset,bytes.size()-offset);}
    return bytes;
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
    char block[65536];std::string line;off_t offset=0;std::uint64_t line_start=0;
    while(offset<status.st_size){
        const auto wanted=static_cast<std::size_t>(std::min<off_t>(sizeof(block),status.st_size-offset));
        ssize_t count;do{count=::pread(managed_fd_,block,wanted,offset);}while(count<0&&errno==EINTR);
        if(count<=0)return Fail(error,"managed index read 실패");const auto block_start=offset;offset+=count;
        for(ssize_t i=0;i<count;++i){
            if(block[i]=='\n'){
                if(!line.empty()){RecordingMutationV1 m;if(!ParseRecordingMutationV1(line,&m,error))return false;
                    line.push_back('\n');if(!IndexRecord(state.get(),m,error,{},line,line_start))return false;}
                line.clear();line_start=static_cast<std::uint64_t>(block_start+i+1);
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
    if(!ManagedBindingLocked()){poisoned_=true;return Fail(error,"managed 원장 변경/불확실 상태: 재open 필요");}
    return CheckManagedFdStateLocked(error);
#else
    return Fail(error,"managed state unsupported");
#endif
}
bool RecordingJournal::CheckManagedFdStateLocked(std::string* error) const {
    if(!managed_)return true;
#if !defined(_WIN32)
    struct stat status{};
    OwnedFd parent(OpenParent(io_path_,false));
    if(parent.value<0||Present(parent.value,kGenerationManifest)||
       poisoned_||!managed_state_||managed_fd_<0||::fstat(managed_fd_,&status)!=0||!S_ISREG(status.st_mode)||status.st_nlink!=1||
       static_cast<std::uint64_t>(status.st_dev)!=device_||status.st_ino!=inode_||status.st_size<0||
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
    if(parent.value<0||Present(parent.value,kGenerationManifest)||
       ::fstat(parent.value,&p)!=0||static_cast<std::uint64_t>(p.st_dev)!=parent_device_||p.st_ino!=parent_inode_||
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
    // B manifest의 유효성 판단은 B backend 책임이다. v1은 존재/조회 불확실만으로 거부한다.
    if(Present(parent.value,kGenerationManifest))return Fail(error,"generation manifest 존재: v1 fallback 거부");
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
    if(Present(parent.value,kGenerationManifest)||Present(parent.value,kManagedFormat)!=committed||Present(parent.value,kManagedInit)!=pending)
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
    if(Present(parent.value,kGenerationManifest)||!ExactFile(parent.value,kManagedFormat,format,&m))return Fail(error,"managed format 확정 검증 실패");
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
            if(!IndexRecord(managed_state_.get(),mutation,error,{},durable,managed_state_->bytes)){poisoned_=true;return false;}
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

bool RecordingJournal::ReadCheckpointRecords(const void* owner,RecordingMutationHandles* records,std::string* error,
    RecordingCheckpointReadSnapshotHandle* snapshot,RecordingJournalOwnedViews* views) const {
    if(records)records->clear();if(snapshot)snapshot->reset();if(views)views->clear();
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
    if(!AcquireCheckpointRecordsLocked(records,error,true))return false;
    if(snapshot||views){
        try {
            RecordingJournalOwnedViews prepared_views;
            if(views){
                if(managed_state_->refs.size()!=records->size()){records->clear();poisoned_=true;return Fail(error,"owned view 순서 불일치");}
                prepared_views.reserve(records->size());
                for(std::size_t i=0;i<records->size();++i){
                    auto view=std::shared_ptr<RecordingJournalOwnedView>(new RecordingJournalOwnedView);
                    view->journal=this;view->record=(*records)[i];view->ref=managed_state_->refs[i];view->authority=catalog_attachment_;
                    prepared_views.push_back(std::move(view));
                }
            }
            if(snapshot){
            auto value=std::shared_ptr<RecordingCheckpointReadSnapshot>(new RecordingCheckpointReadSnapshot);
            value->journal=this;value->owner=owner;value->pid=owner_pid_;value->attachment=catalog_attachment_;
            value->generation=managed_state_->generation;value->bytes=managed_state_->bytes;value->revision=managed_state_->revision;
            value->records=*records;
            if(!CheckManagedStateLocked(error)){records->clear();return false;}
            *snapshot=std::move(value);
            }
            if(views)*views=std::move(prepared_views);
        }catch(...){records->clear();if(snapshot)snapshot->reset();if(views)views->clear();return Fail(error,"checkpoint snapshot 자원 실패");}
    }
    return true;
#else
    return Fail(error,"checkpoint unsupported");
#endif
}
bool RecordingJournal::OwnedViewMatchesLocked(const RecordingJournalOwnedViewHandle& view) const {
    return view&&view->journal==this&&view->record&&view->ref&&catalog_attachment_&&
        view->authority==catalog_attachment_&&managed_state_&&view->ref->lineage==managed_state_->lineage&&
        view->ref->dense_slot<managed_state_->refs.size()&&managed_state_->refs[view->ref->dense_slot]==view->ref;
}
namespace {
bool SameOwnedEnvelope(const RecordingMutationV1& a,const RecordingMutationV1& b) {
    return a.schema==b.schema&&a.mutation_id==b.mutation_id&&a.mutation_type==b.mutation_type&&
        a.entity_id==b.entity_id&&a.occurred_at_ms==b.occurred_at_ms&&a.payload_json==b.payload_json;
}
}
bool RecordingJournal::MakeMutationLink(const RecordingJournalOwnedViewHandle& view,const RecordingMutationV1& mutation,
    RecordingMutationHandle fallback,RecordingMutationLink* link,std::string* error) const {
    if(link)*link={};
    if(!link)return Fail(error,"mutation link output 없음");
    if(fallback&&!SameOwnedEnvelope(*fallback,mutation))return Fail(error,"mutation link 값 불일치");
    RecordingMutationLink result;
    if(view){
#if !defined(_WIN32)
        if(managed_&&owner_pid_!=::getpid())return Fail(error,"managed fork 거부");
#endif
        std::lock_guard lock(mu_);
        if(!CheckManagedStateLocked(error)||!OwnedViewMatchesLocked(view)||!SameOwnedEnvelope(*view->record,mutation))
            return Fail(error,"mutation link 출처 불일치");
        result.ref_=view->ref;result.authority_=view->authority;result.weak_=view->record;
    }else{
        try{result.resident_=fallback?std::move(fallback):std::make_shared<const RecordingMutationV1>(mutation);}
        catch(...){return Fail(error,"mutation link 자원 실패");}
    }
    result.logical_charge_=sizeof(mutation)+mutation.schema.size()+mutation.mutation_id.size()+mutation.entity_id.size()+mutation.payload_json.size();
    *link=std::move(result);if(error)error->clear();return true;
}
bool RecordingJournal::AcquireMutationLink(const RecordingMutationLink& link,RecordingMutationHandle* record,std::string* error) const {
    if(record)record->reset();if(!record)return Fail(error,"mutation link output 없음");
    if(!link.ref_){if(!link.resident_)return Fail(error,"mutation link 값 없음");*record=link.resident_;if(error)error->clear();return true;}
#if !defined(_WIN32)
    if(managed_&&owner_pid_!=::getpid())return Fail(error,"managed fork 거부");
#endif
    std::lock_guard lock(mu_);
    if(!CheckManagedStateLocked(error))return false;
    const auto& ref=link.ref_;
    if(!catalog_attachment_||link.authority_!=catalog_attachment_||ref->lineage!=managed_state_->lineage||
       ref->dense_slot>=managed_state_->refs.size()||managed_state_->refs[ref->dense_slot]!=ref)return Fail(error,"mutation link 권한/계보 거부");
    if(ref->dense_slot>=managed_state_->locations.size()){poisoned_=true;return Fail(error,"mutation link 위치 불일치");}
    return AcquireLocatedRecordLocked(managed_state_->locations[ref->dense_slot],record,error);
}
bool RecordingJournal::MatchMutationLinkView(const RecordingMutationLink& link,const RecordingJournalOwnedViewHandle& view,
    bool* matches,std::string* error) const {
    if(matches)*matches=false;if(!matches)return Fail(error,"mutation link 비교 output 없음");
#if !defined(_WIN32)
    if(managed_&&owner_pid_!=::getpid())return Fail(error,"managed fork 거부");
#endif
    std::lock_guard lock(mu_);
    if(!CheckManagedStateLocked(error))return false;
    // 이전 cache의 권한/계보 불일치는 현재 읽기의 전체 replay로 복구한다.
    if(!OwnedViewMatchesLocked(view))return true;
    if(link.ref_)*matches=link.authority_==view->authority&&link.ref_==view->ref;
    else *matches=link.resident_&&SameOwnedEnvelope(*link.resident_,*view->record);
    return true;
}
bool RecordingJournal::CanReleaseMutationLink(const RecordingMutationLink& link) const {
#if !defined(_WIN32)
    if(managed_&&owner_pid_!=::getpid())return false;
#endif
    std::lock_guard lock(mu_);
    const auto& ref=link.ref_;
    return ref&&CheckManagedStateLocked(nullptr)&&catalog_attachment_&&link.authority_==catalog_attachment_&&
        ref->lineage==managed_state_->lineage&&ref->dense_slot<managed_state_->refs.size()&&managed_state_->refs[ref->dense_slot]==ref&&
        ref->dense_slot<managed_state_->locations.size()&&managed_state_->locations[ref->dense_slot]&&
        !managed_state_->locations[ref->dense_slot]->resident_fallback;
}
bool RecordingJournal::MutationLinkOwns(const RecordingMutationLink& link,const RecordingMutationHandle& record) const {
    if(!record)return false;
    if(!link.ref_)return link.resident_==record;
#if !defined(_WIN32)
    if(managed_&&owner_pid_!=::getpid())return false;
#endif
    std::lock_guard lock(mu_);
    return CheckManagedStateLocked(nullptr)&&catalog_attachment_&&link.authority_==catalog_attachment_&&
        link.ref_->lineage==managed_state_->lineage&&link.ref_->dense_slot<managed_state_->refs.size()&&
        managed_state_->refs[link.ref_->dense_slot]==link.ref_&&link.weak_.lock()==record;
}
bool RecordingJournal::ReadRecordLocations(const void* owner,RecordingJournalRecordLocations* records,std::string* error) const {
    if(records)records->clear();
#if !defined(_WIN32)
    if(managed_&&owner_pid_!=::getpid())return Fail(error,"managed fork 거부");
#endif
    std::lock_guard lock(mu_);
    if(!records||!managed_||!owner||owner!=catalog_owner_)return Fail(error,"located owner/output 거부");
    if(!CheckManagedStateLocked(error))return false;
    if(managed_state_->records.size()!=managed_state_->locations.size()){poisoned_=true;return Fail(error,"located index 불일치");}
    try{*records=managed_state_->locations;}catch(...){records->clear();return Fail(error,"located 목록 자원 부족");}
    if(error)error->clear();return true;
}
bool RecordingJournal::ReadRecordRefs(const void* owner,RecordingJournalRecordRefs* refs,std::string* error) const {
    if(refs)refs->clear();
#if !defined(_WIN32)
    if(managed_&&owner_pid_!=::getpid())return Fail(error,"managed fork 거부");
#endif
    std::lock_guard lock(mu_);
    if(!refs||!managed_||!owner||owner!=catalog_owner_)return Fail(error,"logical ref owner/output 거부");
    if(!CheckManagedStateLocked(error))return false;
    if(managed_state_->refs.size()!=managed_state_->records.size()||managed_state_->refs.size()!=managed_state_->locations.size()){
        poisoned_=true;return Fail(error,"logical ref index 불일치");
    }
    try{*refs=managed_state_->refs;}catch(...){refs->clear();return Fail(error,"logical ref 목록 자원 실패");}
    if(error)error->clear();return true;
}
bool RecordingJournal::AcquireRecordRef(const void* owner,const RecordingJournalRecordRefHandle& ref,
    RecordingMutationHandle* record,std::string* error) const {
    if(record)record->reset();
#if !defined(_WIN32)
    if(managed_&&owner_pid_!=::getpid())return Fail(error,"managed fork 거부");
#endif
    std::lock_guard lock(mu_);
    if(!record||!managed_||!owner||owner!=catalog_owner_)return Fail(error,"logical ref owner/output 거부");
    if(!CheckManagedStateLocked(error))return false;
    if(!ref||ref->lineage!=managed_state_->lineage||ref->dense_slot>=managed_state_->refs.size()||
       managed_state_->refs[ref->dense_slot]!=ref)return Fail(error,"logical ref stale/foreign 거부");
    if(ref->dense_slot>=managed_state_->locations.size()){poisoned_=true;return Fail(error,"logical ref 위치 불일치");}
    // 객체 일치는 mint 계보만 확인한다. 실제 내용은 현재 물리 위치에서 매번 엄격 재검증한다.
    return AcquireLocatedRecordLocked(managed_state_->locations[ref->dense_slot],record,error);
}
bool RecordingJournal::AcquireLocatedRecord(const void* owner,const RecordingJournalRecordLocationHandle& location,
    RecordingMutationHandle* record,std::string* error) const {
    if(record)record->reset();
#if !defined(_WIN32)
    if(managed_&&owner_pid_!=::getpid())return Fail(error,"managed fork 거부");
#endif
    std::lock_guard lock(mu_);
    if(!record||!managed_||!owner||owner!=catalog_owner_)return Fail(error,"located owner/output 거부");
    return AcquireLocatedRecordLocked(location,record,error);
}
bool RecordingJournal::AcquireLocatedRecordLocked(const RecordingJournalRecordLocationHandle& location,
    RecordingMutationHandle* record,std::string* error,bool checkpoint_binding_checked) const {
    if(record)record->reset();
    if(!record||!managed_)return Fail(error,"located output/state 거부");
    const auto check_state=[&]{return checkpoint_binding_checked?CheckManagedFdStateLocked(error):CheckManagedStateLocked(error);};
    if(!check_state())return false;
    if(!location||location->generation!=managed_state_->generation||location->ordinal>=managed_state_->locations.size()||
       managed_state_->locations[location->ordinal]!=location)return Fail(error,"located 다른 세대/토큰 거부");
#if !defined(_WIN32)
    const auto corrupt=[&](){poisoned_=true;return Fail(error,"located 기록 손상/읽기 불확실: 재open 필요");};
    try {
    if(location->length==0||location->offset>managed_state_->bytes||location->length>managed_state_->bytes-location->offset||
       location->offset>static_cast<std::uint64_t>(std::numeric_limits<off_t>::max())||
       location->length>static_cast<std::uint64_t>(std::numeric_limits<off_t>::max())-location->offset||
       location->ordinal>=managed_state_->records.size())return corrupt();
    const auto current=managed_state_->records[location->ordinal];
    if(current&&!LocationMetadataMatches(*location,*current))return corrupt();
    if(location->resident_fallback){
        if(!current||location->resident_fallback!=current||!check_state())return corrupt();
        *record=current;if(error)error->clear();return true;
    }
    if(location->length>16*1024*1024+1)return corrupt();
    std::string raw(static_cast<std::size_t>(location->length),'\0');
    if(!ReadAt(managed_fd_,static_cast<off_t>(location->offset),&raw)||raw.back()!='\n'||
       RawHash(raw)!=location->raw_sha256)return corrupt();
    RecordingMutationV1 parsed;
    if(!ParseRecordingMutationV1(raw,&parsed,nullptr)||!LocationMetadataMatches(*location,parsed)||
       EnvelopeIdentity(parsed)!=location->record_identity||(current&&parsed.payload_json!=current->payload_json)||
       !check_state())return corrupt();
    // 재획득은 호출자의 owned 수명에만 둔다. journal resident를 다시 채우지 않는다.
    auto acquired=current?current:std::make_shared<const RecordingMutationV1>(std::move(parsed));
    if(!check_state())return corrupt();
    *record=std::move(acquired);if(error)error->clear();return true;
    }catch(...){return corrupt();}
#else
    return Fail(error,"located unsupported");
#endif
}
bool RecordingJournal::ReleaseRecordResidents(const void* owner,std::string* error) {
#if !defined(_WIN32)
    if(managed_&&owner_pid_!=::getpid())return Fail(error,"managed fork 거부");
#endif
    std::lock_guard lock(mu_);
    if(!managed_||!owner||owner!=catalog_owner_)return Fail(error,"resident release owner 거부");
    if(!CheckManagedStateLocked(error))return false;
    if(managed_state_->records.size()!=managed_state_->locations.size()){poisoned_=true;return Fail(error,"resident index 불일치");}
    // 같은 세대에서 이미 확인한 행은 재방문하지 않는다. 새 suffix를 전부 확인한 뒤 해제한다.
    if(managed_state_->resident_checked>managed_state_->locations.size()){poisoned_=true;return Fail(error,"resident cursor 불일치");}
    for(std::size_t i=managed_state_->resident_checked;i<managed_state_->locations.size();++i){
        const auto& location=managed_state_->locations[i];
        if(!location||location->generation!=managed_state_->generation||location->ordinal!=i||
           (!location->resident_fallback&&(location->raw_sha256.empty()||location->record_identity.empty()))){
            poisoned_=true;return Fail(error,"resident 위치 불일치");
        }
    }
    for(std::size_t i=managed_state_->resident_checked;i<managed_state_->records.size();++i)
        if(!managed_state_->locations[i]->resident_fallback)managed_state_->records[i].reset();
    managed_state_->resident_checked=managed_state_->records.size();
    if(error)error->clear();return true;
}
bool RecordingJournal::AcquireCheckpointRecordsLocked(RecordingMutationHandles* records,std::string* error,
    bool checkpoint_binding_checked) const {
    if(!records)return Fail(error,"checkpoint output 없음");
    records->clear();
    try {
        if(!checkpoint_binding_checked&&!CheckManagedStateLocked(error))return false;
        if(managed_state_->records.size()!=managed_state_->locations.size()){poisoned_=true;return Fail(error,"checkpoint 위치 불일치");}
        records->reserve(managed_state_->records.size());
        for(std::size_t i=0;i<managed_state_->records.size();++i){
            auto value=managed_state_->records[i];
            if(!value&&!AcquireLocatedRecordLocked(managed_state_->locations[i],&value,error,true)){records->clear();return false;}
            records->push_back(std::move(value));
        }
        if(!CheckManagedStateLocked(error)){records->clear();return false;}
        return true;
    }catch(...){records->clear();poisoned_=true;return Fail(error,"checkpoint cold 자원 실패");}
}
bool RecordingJournal::CheckpointSnapshotMatchesLocked(const void* owner,const RecordingCheckpointReadSnapshotHandle& snapshot) const {
    return snapshot&&snapshot->journal==this&&snapshot->owner==owner&&owner==catalog_owner_&&
        catalog_attachment_&&snapshot->attachment==catalog_attachment_&&snapshot->pid==owner_pid_&&
        snapshot->generation==managed_state_->generation&&snapshot->bytes==managed_state_->bytes&&
        snapshot->revision==managed_state_->revision&&snapshot->records.size()==managed_state_->records.size();
}
bool RecordingJournal::PrepareCheckpoint(const void* owner,RecordingMutationHandles* candidate,std::string* error,
    const RecordingCheckpointReadSnapshotHandle& snapshot) const {
#if !defined(_WIN32)
    if(managed_&&owner_pid_!=::getpid())return Fail(error,"managed fork 거부");
#endif
    std::lock_guard lock(mu_);
    if(!managed_||!owner||owner!=catalog_owner_||!candidate||!CheckManagedStateLocked(error))return Fail(error,"checkpoint owner/state 거부");
    if(CheckpointSnapshotMatchesLocked(owner,snapshot))return CompactRecords(snapshot->records,candidate,error);
    RecordingMutationHandles original;
    if(!AcquireCheckpointRecordsLocked(&original,error,true))return false;
    return CompactRecords(original,candidate,error);
}
void RecordingJournal::InvalidateAutomaticCheckpointNoop(const void* owner) {
#if !defined(_WIN32)
    if(managed_&&owner_pid_!=::getpid())return;
#endif
    std::lock_guard lock(mu_);
    if(managed_&&managed_state_&&owner&&owner==catalog_owner_)managed_state_->automatic_noop_disabled=true;
}
bool RecordingJournal::TryAutomaticCheckpointNoop(const void* owner,
    const std::unordered_set<std::string>& accepted,bool* handled,std::string* error) {
    if(handled)*handled=false;
#if !defined(_WIN32)
    if(managed_&&owner_pid_!=::getpid())return Fail(error,"managed fork 거부");
#endif
    std::lock_guard lock(mu_);
    if(!handled||!managed_||!owner||owner!=catalog_owner_||!catalog_attachment_||!CheckManagedStateLocked(error))
        return Fail(error,"automatic checkpoint owner/state 거부");
#if !defined(_WIN32) && MEDIA_SERVER_USE_OPENSSL
    auto& state=*managed_state_;
    if(state.automatic_noop_disabled)return true;
    OwnedFd parent(OpenParent(io_path_,false));
    if(parent.value<0)return Fail(error,"automatic checkpoint parent 오류");
    // pending은 메모리 표시뿐 아니라 실제 파일도 확인하고 기존 복구 경로로 보낸다.
    if(state.checkpoint_pending||Present(parent.value,".recording-checkpoint.tmp"))return true;
    try {
        if(state.locations.size()!=state.records.size()||state.refs.size()!=state.records.size()){
            poisoned_=true;return Fail(error,"automatic checkpoint index 불일치");
        }
        std::unordered_set<std::string> seen,receipts,deleted;
        std::unordered_map<std::string,std::string> latest;
        std::uint64_t offset=0;
        for(std::size_t i=0;i<state.locations.size();++i){
            const auto& row=state.locations[i];const auto& ref=state.refs[i];
            if(!row||!ref||row->generation!=state.generation||row->ordinal!=i||
               ref->lineage!=state.lineage||ref->dense_slot!=i){poisoned_=true;return Fail(error,"automatic checkpoint 위치 불일치");}
            // 이 표시는 최초 strict 입력과 formatter 전체 바이트 대조로만 생성된다.
            // 빈줄/비정규 envelope/큰 행은 여기서 최적화하지 않는다.
            if(!row->canonical_raw||row->resident_fallback||row->raw_sha256.empty()||row->record_identity.empty()||
               row->offset!=offset||row->length==0||offset>state.bytes||row->length>state.bytes-offset)return true;
            offset+=row->length;
            if(row->type!=RecordingMutationType::RecordingOrderReserved&&!accepted.count(row->mutation_id))return true;
            // CompactRecords의 첫 ID/latest/receipt 규칙을 얇은 불변 메타데이터로 그대로 대조한다.
            if(seen.insert(row->mutation_id).second){
                if(row->type==RecordingMutationType::EventLinkCreated)latest[row->entity_id]=row->mutation_id;
                if(row->type==RecordingMutationType::EventLinkReceipt)receipts.insert(row->mutation_id);
                if(row->type==RecordingMutationType::SegmentV2Deleted)deleted.insert(row->entity_id);
            }
        }
        if(offset!=state.bytes)return true;
        for(const auto& row:state.locations)
            if(row->type==RecordingMutationType::EventLinkCreated&&
               (receipts.count(row->mutation_id)||latest.at(row->entity_id)!=row->mutation_id))return true;
        for(const auto& row:state.locations)
            if((row->type==RecordingMutationType::SegmentV2BoundFinalized||
                row->type==RecordingMutationType::SegmentV2Deleted)&&deleted.count(row->entity_id)&&
               !row->compressed_storage)return true;
        // 같은 잠금/attachment/세대 안에서 원문 전체를 다시 읽는다. hash만 받은 외부
        // 입력을 신뢰하는 API가 아니며, 새 입력·복구의 strict Parse는 생략하지 않는다.
        for(const auto& row:state.locations){
            std::string raw(static_cast<std::size_t>(row->length),'\0');
            if(!ReadAt(managed_fd_,static_cast<off_t>(row->offset),&raw)||raw.back()!='\n'||RawHash(raw)!=row->raw_sha256){
                poisoned_=true;return Fail(error,"automatic checkpoint 원문 손상/읽기 실패");
            }
        }
        if(!CheckManagedStateLocked(error))return false;
        if(Present(parent.value,".recording-checkpoint.tmp"))return true;
        checkpoint_checked_bytes_=state.bytes;*handled=true;if(error)error->clear();return true;
    }catch(...){return Fail(error,"automatic checkpoint 증명 자원 실패");}
#else
    (void)accepted;return true;
#endif
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
bool RecordingJournal::CommitCheckpoint(const void* owner,const RecordingMutationHandles& candidate,bool recover_only,std::string* error,
    const RecordingCheckpointReadSnapshotHandle& snapshot) {
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
    RecordingMutationHandles expected,original;
    const bool snapshot_matches=CheckpointSnapshotMatchesLocked(owner,snapshot);
    if(snapshot_matches){
        if(!CompactRecords(snapshot->records,&expected,error))return false;
    }else{
        if(!AcquireCheckpointRecordsLocked(&original,error,true)||!CompactRecords(original,&expected,error))return false;
    }
    if(expected.size()!=candidate.size()||!detail::SameCheckpointPrefix(expected,candidate))return Fail(error,"checkpoint 후보 필드 불일치");
    for(std::size_t i=0;i<expected.size();++i)
        if(expected[i]->physical_json!=candidate[i]->physical_json)return Fail(error,"checkpoint 물리 행 후보 불일치");
    // 현재 원장으로 재구성한 expected와 후보의 모든 필드가 같다. 같은 serializer의
    // 결과를 다시 만들지 않고 이 bytes를 pending 검증·축소 판단·원자 쓰기에 함께 쓴다.
    std::vector<std::pair<std::size_t,std::size_t>> spans;
    const auto bytes=JournalBytes(expected,&spans);
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
    // 동일 직렬화의 span을 사용한다. 파일 교체 성공 뒤 새로운 할당/세대 혼합을 하지 않는다.
    std::shared_ptr<const char> generation;RecordingJournalRecordLocations locations;RecordingJournalRecordRefs refs;
    try {
    const auto& source_records=snapshot_matches?snapshot->records:original;
    if(source_records.size()!=published.size()||managed_state_->refs.size()!=published.size())return Fail(error,"checkpoint logical ref 순서 불일치");
    generation=std::make_shared<const char>(0);
    locations.reserve(published.size());refs.reserve(published.size());
    for(std::size_t i=0;i<published.size();++i){
        const auto raw=std::string_view(bytes).substr(spans[i].first,spans[i].second);
        const auto identity=EnvelopeIdentity(*published[i]);
        const auto location=MakeLocation(generation,i,spans[i].first,raw,published[i],identity,true);
        if(!location)return Fail(error,"checkpoint 위치 준비 실패");
        locations.push_back(location);
        const auto& old=source_records[i];const auto& next=published[i];const auto& current_ref=managed_state_->refs[i];
        if(!old||!next||!current_ref||current_ref->lineage!=managed_state_->lineage||current_ref->dense_slot!=i)return Fail(error,"checkpoint logical ref 결박 오류");
        const bool same=old->schema==next->schema&&old->mutation_type==next->mutation_type&&old->mutation_id==next->mutation_id&&
            old->entity_id==next->entity_id&&old->occurred_at_ms==next->occurred_at_ms&&old->payload_json==next->payload_json;
        refs.push_back(same?current_ref:ManagedJournalState::MakeRef(managed_state_->lineage,i,current_ref->global_ordinal));
    }
    }catch(...){return Fail(error,"checkpoint 위치 자원 준비 실패");}
    OwnedFd stage(::openat(parent.value,temporary,O_RDWR|O_APPEND|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC,0640));
    if(stage.value<0||!Lock(stage.value,LOCK_EX|LOCK_NB)||!WriteAll(stage.value,bytes)||!Sync(stage.value)){
        poisoned_=true;return Fail(error,"checkpoint 준비 실패: 원본 보존");
    }
    struct stat staged{};
    if(!Regular(stage.value,&staged)||!Same(parent.value,temporary,stage.value,staged)||!CheckManagedStateLocked(error)){poisoned_=true;return Fail(error,"checkpoint 준비 결박 실패");}
    if(::renameat(parent.value,temporary,parent.value,io_path_.filename().c_str())!=0){poisoned_=true;return Fail(error,"checkpoint rename 실패");}
    if(!Sync(parent.value)){poisoned_=true;return Fail(error,"checkpoint directory fsync 불확실");}
    ::close(managed_fd_);managed_fd_=stage.value;stage.value=-1;device_=static_cast<std::uint64_t>(staged.st_dev);inode_=staged.st_ino;
    managed_state_->records=std::move(published);managed_state_->locations=std::move(locations);managed_state_->generation=generation;managed_state_->resident_checked=0;
    managed_state_->refs=std::move(refs);
    managed_state_->bytes=bytes.size();checkpoint_checked_bytes_=bytes.size();return true;
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
    try{catalog_attachment_=std::make_shared<const char>(0);}catch(...){return Fail(error,"managed catalog attachment 자원 실패");}
    managed_state_->automatic_noop_disabled=false;
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
    std::lock_guard lock(mu_);if(catalog_owner_==owner){catalog_owner_=nullptr;catalog_attachment_.reset();}
}
bool RecordingJournal::OwnsCatalog(const void* owner) const {
    if(!managed_)return true;
#if !defined(_WIN32)
    if(owner_pid_!=::getpid())return false;
#endif
    std::lock_guard lock(mu_);return owner&&catalog_owner_==owner&&CheckManagedStateLocked(nullptr);
}
bool RecordingJournal::AppendOwned(const RecordingMutationV1& mutation, const void* owner, std::string* error,
                                   RecordingMutationHandle* appended,RecordingJournalOwnedViewHandle* view) {
    // 입력이 *appended를 빌린 경우에도 결과 초기화가 입력의 마지막 소유자를 제거하지 않는다.
    const RecordingMutationHandle input_lifetime=appended?*appended:RecordingMutationHandle{};
    if(appended)appended->reset();if(view)view->reset();
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
    std::shared_ptr<RecordingJournalOwnedView> prepared_view;
    if(view&&managed_&&owner){
        try{prepared_view=std::shared_ptr<RecordingJournalOwnedView>(new RecordingJournalOwnedView);
            prepared_view->journal=this;prepared_view->record=owned;prepared_view->authority=catalog_attachment_;
        }catch(...){return Fail(error,"append owned view 자원 실패");}
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
    if(managed_){if(!IndexRecord(managed_state_.get(),parsed,error,owned,durable,managed_state_->bytes)){poisoned_=true;return false;}managed_state_->bytes+=durable.size();}
#else
    std::ofstream output(path_, std::ios::binary | std::ios::app);
    output << durable;
    output.flush();
    if (!output) return Fail(error, "journal write/flush 실패");
#endif
    if (error != nullptr) error->clear();
    if(appended)*appended=owned;
    if(prepared_view){prepared_view->ref=managed_state_->refs.back();*view=std::move(prepared_view);}
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
    if(managed_){
        try{
            result.mutations.reserve(managed_state_->records.size());
            for(std::size_t i=0;i<managed_state_->records.size();++i){
                auto value=managed_state_->records[i];
                if(!value&&(i>=managed_state_->locations.size()||!AcquireLocatedRecordLocked(managed_state_->locations[i],&value,nullptr))){result.mutations.clear();++result.io_error_count;return result;}
                result.mutations.push_back(*value);
            }
        }catch(...){result.mutations.clear();++result.io_error_count;poisoned_=true;}
        return result;
    }
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
