// 파일 용도: 녹화 세대 identity shard와 chain 무결성 계산을 구현한다.
#include "recording/recording_identity_shard.h"
#include "recording/recording_contracts.h"
#include "domain/strict_json.h"
#include "recording_history_index.h"
#include <algorithm>
#include <charconv>
#include <limits>
#include <unordered_map>
#include <unordered_set>
#ifndef MEDIA_SERVER_USE_OPENSSL
#define MEDIA_SERVER_USE_OPENSSL 0
#endif
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#endif

namespace recording {
namespace {
using Document = ingress::StrictJsonObjectDocument;
constexpr const char* kSchema = "media-server.recording-identity-shard.v1";
bool Fail(std::string* error, const char* reason) { if (error) *error = reason; return false; }
std::string Quote(const std::string& input) {
    std::string output = "\"";
    for (char c : input) {
        switch (c) {
            case '\\': output += "\\\\"; break;
            case '"': output += "\\\""; break;
            case '\n': output += "\\n"; break;
            case '\r': output += "\\r"; break;
            case '\t': output += "\\t"; break;
            default: output += c; break;
        }
    }
    return output + '"';
}
bool Hex(const std::string& value) {
    return value.size() == 64 && std::all_of(value.begin(), value.end(), [](char c) {
        return (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f');
    });
}
template<class T> bool Integer(const std::string& raw, T* output) {
    const auto parsed = std::from_chars(raw.data(), raw.data() + raw.size(), *output);
    return parsed.ec == std::errc{} && parsed.ptr == raw.data() + raw.size();
}
template<class T> bool Number(const Document& object, const char* name, T* output) {
    const auto* member = object.Find(name);
    return member && member->type == ingress::StrictJsonType::Number && Integer(member->raw, output);
}
bool NamedGeneration(const std::string& name, const std::string& prefix, std::uint64_t* generation) {
    constexpr const char* suffix = ".jsonl";
    if (name.rfind(prefix, 0) != 0 || name.size() <= prefix.size() + 6 ||
        name.compare(name.size() - 6, 6, suffix) != 0) return false;
    const auto digits = name.substr(prefix.size(), name.size() - prefix.size() - 6);
    return Integer(digits, generation) && *generation > 0 && digits == std::to_string(*generation);
}
bool ArchiveGeneration(const std::string& name, std::uint64_t* generation) {
    if (NamedGeneration(name, "active-", generation)) return true;
    if (name.rfind("evidence-", 0) != 0 || name.size() < 18 ||
        name.compare(name.size() - 6, 6, ".jsonl") != 0) return false;
    const auto separator = name.find('-', 9);
    if (separator == std::string::npos) return false;
    const auto generation_text = name.substr(9, separator - 9);
    const auto slot_text = name.substr(separator + 1, name.size() - separator - 7);
    std::uint64_t slot = 0;
    return Integer(generation_text, generation) && *generation > 0 && Integer(slot_text, &slot) &&
        generation_text == std::to_string(*generation) && slot_text == std::to_string(slot);
}
bool Descriptor(const RecordingGenerationFile& value) { return Hex(value.sha256); }
std::string FileJson(const RecordingGenerationFile& value) {
    return "{\"name\":" + Quote(value.name) + ",\"size\":" + std::to_string(value.size) +
        ",\"sha256\":" + Quote(value.sha256) + "}";
}
bool ParseFile(const std::string& raw, RecordingGenerationFile* value, std::string* error) {
    Document object;
    if (!ingress::ParseStrictJsonObjectDocument(raw, &object, error) || object.members.size() != 3) return false;
    const auto name = ingress::StrictJsonStringField(object, "name");
    const auto hash = ingress::StrictJsonStringField(object, "sha256");
    if (!name || !hash || !Number(object, "size", &value->size)) return false;
    value->name = *name; value->sha256 = *hash;
    return Descriptor(*value);
}
std::string OrderJson(const RecordingOrderReservationV1& value) {
    return "{\"schema\":" + Quote(value.schema) + ",\"storeId\":" + Quote(value.store_id) +
        ",\"requestId\":" + Quote(value.request_id) + ",\"segmentId\":" + Quote(value.segment_id) +
        ",\"channelId\":" + Quote(value.channel_id) + ",\"sequence\":" + std::to_string(value.sequence) + "}";
}
bool SameType(RecordingMutationType a, RecordingMutationType b) {
    const auto event = [](RecordingMutationType t) {
        return t == RecordingMutationType::EventLinkCreated || t == RecordingMutationType::EventLinkReceipt;
    };
    return a == b || (event(a) && event(b));
}
bool SameIdentity(const RecordingIdentityRow& a, const RecordingIdentityRow& b) {
    // entity/time/digest는 기존 IndexRecord composite의 동일성을 정확히 보존한다.
    if (a.entity_id != b.entity_id || a.occurred_at_ms != b.occurred_at_ms || a.identity != b.identity ||
        !SameType(a.type, b.type) || a.reservation.has_value() != b.reservation.has_value()) return false;
    return !a.reservation || OrderJson(*a.reservation) == OrderJson(*b.reservation);
}
bool SegmentEffect(RecordingMutationType type) {
    switch (type) {
        case RecordingMutationType::SegmentFinalized:
        case RecordingMutationType::SegmentV2Finalized:
        case RecordingMutationType::SegmentV2BoundFinalized:
        case RecordingMutationType::SegmentV2State:
        case RecordingMutationType::SegmentV2Deleted:
        case RecordingMutationType::CorruptionDetected:
        case RecordingMutationType::DeletionRequested:
        case RecordingMutationType::DeletionCompleted: return true;
        default: return false;
    }
}
bool OrderedReservations(std::vector<const RecordingIdentityRow*> rows, std::string* error,
                         RecordingIdentityChainResult* output = nullptr) {
    std::sort(rows.begin(), rows.end(), [](auto a, auto b) { return a->global_ordinal < b->global_ordinal; });
    std::unordered_set<std::string> requests, reserved, ordinary, legacy;
    std::int64_t maximum = 0;
    for (const auto* row : rows) {
        if (row->reservation) {
            const auto& order = *row->reservation;
            if (ordinary.count(row->mutation_id) || legacy.count(row->entity_id) ||
                !reserved.insert(row->entity_id).second || order.sequence <= maximum)
                return Fail(error, "identity reservation sequence/segment/history collision");
            requests.insert(row->mutation_id);
            maximum = order.sequence;
            if (output) {
                output->order_history.bound_store = order.store_id;
                output->order_history.reservations.push_back({order, row->occurred_at_ms});
            }
        } else {
            if (requests.count(row->mutation_id)) return Fail(error, "identity ordinary/request collision");
            ordinary.insert(row->mutation_id);
            if (SegmentEffect(row->type) && !reserved.count(row->entity_id)) legacy.insert(row->entity_id);
        }
    }
    if (output) {
        auto& history = output->order_history;
        history.maximum = maximum;
        history.ordinary_ids.assign(ordinary.begin(), ordinary.end());
        history.legacy_segments.assign(legacy.begin(), legacy.end());
        std::sort(history.ordinary_ids.begin(), history.ordinary_ids.end());
        std::sort(history.legacy_segments.begin(), history.legacy_segments.end());
    }
    return true;
}
bool Validate(const RecordingIdentityShard& shard, std::string* error) {
    if (!ValidateOpaqueId(shard.store_id, error) || !shard.generation)
        return Fail(error, "identity shard store/generation invalid");
    if (shard.previous) {
        std::uint64_t previous = 0;
        if (!Descriptor(*shard.previous) || !shard.previous->size ||
            !NamedGeneration(shard.previous->name, "identity-", &previous) || previous >= shard.generation)
            return Fail(error, "identity previous descriptor invalid");
    }
    std::unordered_set<std::string> names;
    for (const auto& archive : shard.archives) {
        std::uint64_t generation = 0;
        if (!Descriptor(archive) || !ArchiveGeneration(archive.name, &generation) ||
            generation > shard.generation || !names.insert(archive.name).second)
            return Fail(error, "identity archive name/generation/duplicate invalid");
    }
    std::vector<std::uint64_t> ends(shard.archives.size(), 0);
    std::unordered_map<std::string, const RecordingIdentityRow*> first;
    std::unordered_map<std::string, std::string> reserved_segments;
    std::unordered_map<std::int64_t, std::string> reserved_sequences;
    std::optional<std::uint64_t> ordinal;
    for (const auto& row : shard.rows) {
        if (!ValidateOpaqueId(row.mutation_id, error) || !ValidateOpaqueId(row.entity_id, error) ||
            RecordingMutationTypeName(row.type) == "unknown" || !Hex(row.identity) || !Hex(row.raw_sha256) ||
            row.archive_slot >= shard.archives.size() || !row.length ||
            (ordinal && row.global_ordinal <= *ordinal)) return Fail(error, "identity row fields/order invalid");
        const auto& archive = shard.archives[static_cast<std::size_t>(row.archive_slot)];
        if (row.offset > archive.size || row.length > archive.size - row.offset ||
            row.offset < ends[static_cast<std::size_t>(row.archive_slot)])
            return Fail(error, "identity row locator bound/overlap invalid");
        ends[static_cast<std::size_t>(row.archive_slot)] = row.offset + row.length;
        ordinal = row.global_ordinal;
        if (row.type == RecordingMutationType::RecordingOrderReserved) {
            if (!row.reservation) return Fail(error, "identity reservation missing");
            RecordingOrderReservationV1 parsed;
            if (!ParseRecordingOrderReservationV1(OrderJson(*row.reservation), &parsed, error) ||
                parsed.store_id != shard.store_id || parsed.request_id != row.mutation_id ||
                parsed.segment_id != row.entity_id) return Fail(error, "identity reservation binding invalid");
            const auto segment = reserved_segments.emplace(parsed.segment_id, parsed.request_id);
            const auto sequence = reserved_sequences.emplace(parsed.sequence, parsed.request_id);
            if ((!segment.second && segment.first->second != parsed.request_id) ||
                (!sequence.second && sequence.first->second != parsed.request_id))
                return Fail(error, "identity reservation segment/sequence reused");
        } else if (row.reservation) return Fail(error, "identity nonreservation has tuple");
        const auto inserted = first.emplace(row.mutation_id, &row);
        if (!inserted.second && !SameIdentity(*inserted.first->second, row))
            return Fail(error, "identity repeated ID conflict");
    }
    // root shard는 전체 최초 순서가 보인다. 후속 shard에는 이전 예약의 재시도가 있을 수 있다.
    if (!shard.previous) {
        std::vector<const RecordingIdentityRow*> ordered;
        for (const auto& entry : first) ordered.push_back(entry.second);
        if (!OrderedReservations(std::move(ordered), error)) return false;
    }
    return true;
}
std::string RowJson(const RecordingIdentityRow& row) {
    return "{\"mutationId\":" + Quote(row.mutation_id) + ",\"type\":" + Quote(RecordingMutationTypeName(row.type)) +
        ",\"entityId\":" + Quote(row.entity_id) + ",\"occurredAtMs\":" + std::to_string(row.occurred_at_ms) +
        ",\"globalOrdinal\":" + std::to_string(row.global_ordinal) + ",\"identity\":" + Quote(row.identity) +
        ",\"archiveSlot\":" + std::to_string(row.archive_slot) + ",\"offset\":" + std::to_string(row.offset) +
        ",\"length\":" + std::to_string(row.length) + ",\"rawSha256\":" + Quote(row.raw_sha256) +
        ",\"reservation\":" + (row.reservation ? OrderJson(*row.reservation) : "null") + "}";
}
bool Array(const Document& object, const char* key, std::vector<std::string>* items) {
    const auto* member = object.Find(key);
    if (!member || member->type != ingress::StrictJsonType::Array) return false;
    const auto& raw = member->raw;
    std::size_t start = 1;
    int depth = 0;
    bool quoted = false, escaped = false;
    const auto append = [&](std::size_t end) {
        auto part = raw.substr(start, end - start);
        if (part.find_first_not_of(" \n\t\r") != std::string::npos) items->push_back(std::move(part));
    };
    for (std::size_t i = 1; i + 1 < raw.size(); ++i) {
        const char c = raw[i];
        if (quoted) {
            if (escaped) escaped = false;
            else if (c == '\\') escaped = true;
            else if (c == '"') quoted = false;
        } else if (c == '"') quoted = true;
        else if (c == '{' || c == '[') ++depth;
        else if (c == '}' || c == ']') --depth;
        else if (c == ',' && depth == 0) { append(i); start = i + 1; }
    }
    append(raw.size() - 1);
    return true;
}
bool ParseRow(const std::string& raw, RecordingIdentityRow* row, std::string* error) {
    Document object;
    if (!ingress::ParseStrictJsonObjectDocument(raw, &object, error) || object.members.size() != 11) return false;
    const auto id = ingress::StrictJsonStringField(object, "mutationId");
    const auto type = ingress::StrictJsonStringField(object, "type");
    const auto entity = ingress::StrictJsonStringField(object, "entityId");
    const auto identity = ingress::StrictJsonStringField(object, "identity");
    const auto hash = ingress::StrictJsonStringField(object, "rawSha256");
    if (!id || !type || !entity || !identity || !hash || !Number(object, "occurredAtMs", &row->occurred_at_ms) ||
        !Number(object, "globalOrdinal", &row->global_ordinal) || !Number(object, "archiveSlot", &row->archive_slot) ||
        !Number(object, "offset", &row->offset) || !Number(object, "length", &row->length)) return false;
    row->mutation_id = *id; row->type = ParseRecordingMutationType(*type); row->entity_id = *entity;
    row->identity = *identity; row->raw_sha256 = *hash;
    if (!ingress::StrictJsonFieldIsNull(object, "reservation")) {
        const auto reservation = ingress::StrictJsonObjectField(object, "reservation");
        RecordingOrderReservationV1 value;
        if (!reservation || !ParseRecordingOrderReservationV1(*reservation, &value, error)) return false;
        row->reservation = std::move(value);
    }
    return true;
}
#if MEDIA_SERVER_USE_OPENSSL
bool DigestMatches(const std::string& raw, const RecordingGenerationFile& descriptor) {
    if (raw.size() != descriptor.size) return false;
    unsigned char digest[32]; unsigned count = 0;
    if (EVP_Digest(raw.data(), raw.size(), digest, &count, EVP_sha256(), nullptr) != 1 || count != 32) return false;
    constexpr char hex[] = "0123456789abcdef";
    std::string hash;
    for (auto c : digest) { hash += hex[c >> 4]; hash += hex[c & 15]; }
    return hash == descriptor.sha256;
}
bool SameFile(const RecordingGenerationFile& a, const RecordingGenerationFile& b) {
    return a.name == b.name && a.size == b.size && a.sha256 == b.sha256;
}
bool MergeValidatedExtension(const RecordingIdentityChainResult& base,
    const std::vector<RecordingGenerationFile>& archives, const std::vector<RecordingIdentityRow>& rows,
    const RecordingIdentityChainLimits& limits, RecordingIdentityChainResult* output, std::string* error) {
    if (!output || !limits.max_shard_bytes || !limits.max_unique_ids || !limits.max_archives ||
        base.store_id.empty() || !base.shards || base.first_acceptances.size() > limits.max_unique_ids ||
        base.archive_files.size() > limits.max_archives)
        return Fail(error, "identity extension base/output/admission invalid");
    RecordingIdentityChainResult result = base;
    std::unordered_map<std::string, std::size_t> first;
    for (std::size_t i = 0; i < result.first_acceptances.size(); ++i) {
        const auto& accepted = result.first_acceptances[i];
        if (accepted.mutation_id != accepted.first_row.mutation_id ||
            accepted.first_global_ordinal != accepted.first_row.global_ordinal || !accepted.occurrences ||
            !first.emplace(accepted.mutation_id, i).second)
            return Fail(error, "identity extension base acceptance invalid");
    }
    std::unordered_map<std::string, RecordingGenerationFile> known_archives;
    for (const auto& file : result.archive_files) {
        std::uint64_t generation = 0;
        if (!Descriptor(file) || !ArchiveGeneration(file.name, &generation) ||
            !known_archives.emplace(file.name, file).second)
            return Fail(error, "identity extension base archive invalid");
    }
    for (const auto& file : archives) {
        std::uint64_t generation = 0;
        if (!Descriptor(file) || !ArchiveGeneration(file.name, &generation) || known_archives.count(file.name) ||
            result.archive_files.size() >= limits.max_archives)
            return Fail(error, "identity extension archive conflict/admission invalid");
        known_archives.emplace(file.name, file); result.archive_files.push_back(file);
    }
    auto ordinal = base.maximum_global_ordinal;
    if (rows.size() > std::numeric_limits<std::uint64_t>::max() - result.physical_rows)
        return Fail(error, "identity extension physical count overflow");
    for (const auto& row : rows) {
        if (row.archive_slot >= archives.size() || (ordinal && row.global_ordinal <= *ordinal))
            return Fail(error, "identity extension row archive/order invalid");
        ordinal = row.global_ordinal;
        const auto found = first.find(row.mutation_id);
        if (found == first.end()) {
            if (result.first_acceptances.size() >= limits.max_unique_ids)
                return Fail(error, "identity extension ID admission exceeded");
            first.emplace(row.mutation_id, result.first_acceptances.size());
            result.first_acceptances.push_back({row.mutation_id, row.global_ordinal, 1, row,
                archives[static_cast<std::size_t>(row.archive_slot)]});
        } else {
            auto& accepted = result.first_acceptances[found->second];
            if (!SameIdentity(accepted.first_row, row) || accepted.occurrences == std::numeric_limits<std::uint64_t>::max())
                return Fail(error, "identity extension repeated ID conflict/overflow");
            ++accepted.occurrences;
        }
    }
    result.physical_rows += rows.size(); result.maximum_global_ordinal = ordinal;
    std::vector<const RecordingIdentityRow*> ordered; ordered.reserve(result.first_acceptances.size());
    for (const auto& accepted : result.first_acceptances) ordered.push_back(&accepted.first_row);
    result.order_history = {};
    if (!OrderedReservations(std::move(ordered), error, &result)) return false;
    std::sort(result.first_acceptances.begin(), result.first_acceptances.end(), [](const auto& a, const auto& b) {
        return a.first_global_ordinal < b.first_global_ordinal;
    });
    std::sort(result.archive_files.begin(), result.archive_files.end(), [](const auto& a, const auto& b) {
        return a.name < b.name;
    });
    *output = std::move(result); if (error) error->clear(); return true;
}
#endif
} // namespace

bool SerializeRecordingIdentityShard(const RecordingIdentityShard& shard, std::string* output, std::string* error) {
    if (!output || !Validate(shard, error)) return Fail(error, "identity shard output/value invalid");
    std::string raw = "{\"schema\":" + Quote(kSchema) + ",\"storeId\":" + Quote(shard.store_id) +
        ",\"generation\":" + std::to_string(shard.generation) + ",\"previous\":" +
        (shard.previous ? FileJson(*shard.previous) : "null") + ",\"archives\":[";
    for (std::size_t i = 0; i < shard.archives.size(); ++i) { if (i) raw += ','; raw += FileJson(shard.archives[i]); }
    raw += "],\"rows\":[";
    for (std::size_t i = 0; i < shard.rows.size(); ++i) { if (i) raw += ','; raw += RowJson(shard.rows[i]); }
    raw += "]}\n";
    *output = std::move(raw);
    if (error) error->clear();
    return true;
}
bool ParseRecordingIdentityShard(const std::string& raw, RecordingIdentityShard* output, std::string* error) {
    if (!output) return Fail(error, "identity shard output missing");
    Document document;
    RecordingIdentityShard shard;
    if (!ingress::ParseStrictJsonObjectDocument(raw, &document, error) || document.members.size() != 6 ||
        ingress::StrictJsonStringField(document, "schema") != kSchema ||
        !Number(document, "generation", &shard.generation)) return Fail(error, "identity shard schema/fields invalid");
    const auto store = ingress::StrictJsonStringField(document, "storeId");
    if (!store) return Fail(error, "identity shard store missing");
    shard.store_id = *store;
    if (!ingress::StrictJsonFieldIsNull(document, "previous")) {
        const auto raw_previous = ingress::StrictJsonObjectField(document, "previous");
        RecordingGenerationFile previous;
        if (!raw_previous || !ParseFile(*raw_previous, &previous, error)) return Fail(error, "identity previous malformed");
        shard.previous = std::move(previous);
    }
    std::vector<std::string> archives, rows;
    if (!Array(document, "archives", &archives) || !Array(document, "rows", &rows)) return Fail(error, "identity arrays malformed");
    for (const auto& item : archives) {
        RecordingGenerationFile value;
        if (!ParseFile(item, &value, error)) return Fail(error, "identity archive malformed");
        shard.archives.push_back(std::move(value));
    }
    for (const auto& item : rows) {
        RecordingIdentityRow value;
        if (!ParseRow(item, &value, error)) return Fail(error, "identity row malformed");
        shard.rows.push_back(std::move(value));
    }
    std::string canonical;
    if (!SerializeRecordingIdentityShard(shard, &canonical, error) || canonical != raw)
        return Fail(error, "identity shard invalid/noncanonical");
    *output = std::move(shard);
    if (error) error->clear();
    return true;
}
bool RecordingIdentityShardParseCache::Parse(const std::string& bytes,
    std::shared_ptr<const RecordingIdentityShard>* output, std::string* error) {
    if (!output) return Fail(error, "identity cache output missing");
    std::string key;
#if MEDIA_SERVER_USE_OPENSSL
    unsigned char digest[32]; unsigned length = 0;
    if (EVP_Digest(bytes.data(), bytes.size(), digest, &length, EVP_sha256(), nullptr) != 1 || length != 32)
        return Fail(error, "identity cache digest failed");
    constexpr char hex[] = "0123456789abcdef";
    for (auto byte : digest) { key += hex[byte >> 4]; key += hex[byte & 15]; }
    const auto found = entries_.find(key);
    if (found != entries_.end() && found->second.raw_bytes == bytes.size()) {
        ++hits_; *output = found->second.value; if (error) error->clear(); return true;
    }
#endif
    ++misses_;
    auto parsed = std::make_shared<RecordingIdentityShard>();
    if (!ParseRecordingIdentityShard(bytes, parsed.get(), error)) return false;
    // JSON 원문 배수와 고정 DTO 비용을 합친 논리 보관 예산이다. RSS 상한은 아니다.
    // 개수·길이는 parser 입력 bytes에 제한되며 덧셈/곱셈 전 admission을 확인한다.
    if (!key.empty() && bytes.size() <= max_bytes_ / 4 &&
        parsed->rows.size() <= max_bytes_ / sizeof(RecordingIdentityRow) &&
        parsed->archives.size() <= max_bytes_ / sizeof(RecordingGenerationFile)) {
        const auto charge = bytes.size() * 4 + parsed->rows.size() * sizeof(RecordingIdentityRow) +
            parsed->archives.size() * sizeof(RecordingGenerationFile) + sizeof(Entry) + sizeof(RecordingIdentityShard) + 64;
        if (charge <= max_bytes_) {
            if (bytes_ > max_bytes_ - charge) { entries_.clear(); bytes_ = 0; }
            entries_.emplace(key, Entry{parsed, bytes.size()}); bytes_ += charge;
        }
    }
    *output = std::move(parsed); return true;
}
bool ValidateRecordingIdentityShardChain(const RecordingGenerationFile& head,
    const RecordingIdentityShardLoader& loader, const RecordingIdentityChainLimits& limits,
    RecordingIdentityChainResult* output, std::string* error, RecordingIdentityShardParseCache* cache) {
#if !MEDIA_SERVER_USE_OPENSSL
    (void)head; (void)loader; (void)limits; (void)output; (void)cache;
    return Fail(error, "identity chain unsupported without OpenSSL");
#else
    if (!output || !loader || !limits.max_shard_bytes || !limits.max_unique_ids || !limits.max_archives)
        return Fail(error, "identity chain output/loader/resource admission missing");
    struct Acceptance { RecordingIdentityRow row; RecordingGenerationFile archive; std::uint64_t occurrences{0}; };
    struct Archive { RecordingGenerationFile file; std::optional<std::uint64_t> earliest_offset; };
    std::unordered_map<std::string, Acceptance> first;
    std::unordered_map<std::string, Archive> archives;
    RecordingIdentityChainResult result;
    result.head = head;
    RecordingGenerationFile descriptor = head;
    std::optional<std::uint64_t> newer_generation, newer_first;
    std::string store;
    for (;;) {
        std::uint64_t generation = 0;
        if (!Descriptor(descriptor) || !NamedGeneration(descriptor.name, "identity-", &generation) ||
            !descriptor.size || descriptor.size > limits.max_shard_bytes ||
            (newer_generation && generation >= *newer_generation)) return Fail(error, "identity chain descriptor/order/admission invalid");
        std::string bytes;
        if (!loader(descriptor, limits.max_shard_bytes, &bytes, error) || !DigestMatches(bytes, descriptor))
            return Fail(error, "identity chain bytes/hash mismatch");
        RecordingIdentityShard parsed;
        std::shared_ptr<const RecordingIdentityShard> reused;
        if (cache ? !cache->Parse(bytes, &reused, error) : !ParseRecordingIdentityShard(bytes, &parsed, error)) return false;
        const auto& shard = cache ? *reused : parsed;
        if (shard.generation != generation ||
            (!store.empty() && store != shard.store_id)) return Fail(error, "identity chain generation/store mismatch");
        store = shard.store_id;
        if (!shard.rows.empty()) {
            if (newer_first && shard.rows.back().global_ordinal >= *newer_first)
                return Fail(error, "identity chain ordinal overlap/order invalid");
            newer_first = shard.rows.front().global_ordinal;
        }
        for (const auto& file : shard.archives) {
            auto found = archives.find(file.name);
            if (found == archives.end()) {
                if (archives.size() >= limits.max_archives) return Fail(error, "identity chain archive admission exceeded");
                archives.emplace(file.name, Archive{file, {}});
            } else if (found->second.file.size != file.size || found->second.file.sha256 != file.sha256)
                return Fail(error, "identity chain archive descriptor conflict");
        }
        for (auto i = shard.rows.rbegin(); i != shard.rows.rend(); ++i) {
            const auto& row = *i;
            auto& archive = archives.at(shard.archives[static_cast<std::size_t>(row.archive_slot)].name);
            if (archive.earliest_offset && row.offset + row.length > *archive.earliest_offset)
                return Fail(error, "identity chain archive rows overlap/reverse");
            archive.earliest_offset = row.offset;
            auto found = first.find(row.mutation_id);
            if (found == first.end()) {
                if (first.size() >= limits.max_unique_ids) return Fail(error, "identity chain ID admission exceeded");
                first.emplace(row.mutation_id, Acceptance{row, archive.file, 1});
            } else {
                if (!SameIdentity(found->second.row, row) || found->second.occurrences == std::numeric_limits<std::uint64_t>::max())
                    return Fail(error, "identity chain repeated ID conflict/overflow");
                found->second.row = row;
                found->second.archive = archive.file;
                ++found->second.occurrences;
            }
            if (result.physical_rows == std::numeric_limits<std::uint64_t>::max()) return Fail(error, "identity row count overflow");
            ++result.physical_rows;
            if (!result.maximum_global_ordinal || row.global_ordinal > *result.maximum_global_ordinal)
                result.maximum_global_ordinal = row.global_ordinal;
        }
        if (result.shards == std::numeric_limits<std::uint64_t>::max()) return Fail(error, "identity shard count overflow");
        ++result.shards;
        if (!shard.previous) break;
        newer_generation = generation;
        descriptor = *shard.previous;
    }
    result.store_id = store;
    std::vector<const RecordingIdentityRow*> ordered;
    ordered.reserve(first.size());
    for (const auto& item : first) ordered.push_back(&item.second.row);
    if (!OrderedReservations(ordered, error, &result)) return false;
    for (const auto& item : first)
        result.first_acceptances.push_back({item.first, item.second.row.global_ordinal,
            item.second.occurrences, item.second.row, item.second.archive});
    for (const auto& item : archives) result.archive_files.push_back(item.second.file);
    std::sort(result.first_acceptances.begin(), result.first_acceptances.end(), [](const auto& a, const auto& b) {
        return a.first_global_ordinal < b.first_global_ordinal;
    });
    std::sort(result.archive_files.begin(), result.archive_files.end(), [](const auto& a, const auto& b) {
        return a.name < b.name;
    });
    *output = std::move(result);
    if (error) error->clear();
    return true;
#endif
}
bool ValidateRecordingIdentityShardChainExtension(const RecordingIdentityChainResult& base,
    const RecordingGenerationFile& head, const RecordingIdentityShard& extension,
    const RecordingIdentityChainLimits& limits, RecordingIdentityChainResult* output, std::string* error) {
#if !MEDIA_SERVER_USE_OPENSSL
    (void)base; (void)head; (void)extension; (void)limits; (void)output;
    return Fail(error, "identity extension unsupported without OpenSSL");
#else
    std::uint64_t generation = 0; std::string bytes;
    if (!extension.previous || !SameFile(*extension.previous, base.head) ||
        !NamedGeneration(head.name, "identity-", &generation) || generation != extension.generation ||
        extension.store_id != base.store_id || !SerializeRecordingIdentityShard(extension, &bytes, error) ||
        !DigestMatches(bytes, head)) return Fail(error, "identity published extension binding invalid");
    RecordingIdentityChainResult result;
    if (!MergeValidatedExtension(base, extension.archives, extension.rows, limits, &result, error)) return false;
    if (result.shards == std::numeric_limits<std::uint64_t>::max())
        return Fail(error, "identity extension shard count overflow");
    ++result.shards; result.head = head; *output = std::move(result);
    if (error) error->clear();
    return true;
#endif
}
bool ValidateRecordingIdentityActiveExtension(const RecordingIdentityChainResult& base,
    const RecordingGenerationFile& active, const std::vector<RecordingIdentityRow>& rows,
    const RecordingIdentityChainLimits& limits, RecordingIdentityChainResult* output, std::string* error) {
#if !MEDIA_SERVER_USE_OPENSSL
    (void)base; (void)active; (void)rows; (void)limits; (void)output;
    return Fail(error, "identity active extension unsupported without OpenSSL");
#else
    std::uint64_t generation = 0;
    if (!NamedGeneration(base.head.name, "identity-", &generation) || generation == std::numeric_limits<std::uint64_t>::max())
        return Fail(error, "identity active extension generation invalid");
    RecordingIdentityShard validation; validation.store_id = base.store_id; validation.generation = generation + 1;
    validation.previous = base.head; validation.archives = {active}; validation.rows = rows;
    std::string bytes;
    if (!SerializeRecordingIdentityShard(validation, &bytes, error))
        return Fail(error, "identity active extension rows invalid");
    return MergeValidatedExtension(base, validation.archives, validation.rows, limits, output, error);
#endif
}

#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
namespace {thread_local int history_build_fault=0;}
void ProbeRecordingIdentityHistoryFault(int fault){history_build_fault=fault;}
#endif
class RecordingIdentityHistory {
public:
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    RecordingHistoryIndex index;
#endif
    std::size_t count{0};
    std::uint64_t physical{0};
    bool complete{false};
};
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
namespace {
std::string FirstBytes(const RecordingIdentityFirstAcceptance& first) {
    return "{\"occurrences\":"+std::to_string(first.occurrences)+",\"row\":"+RowJson(first.first_row)+
        ",\"archive\":"+FileJson(first.first_archive)+"}";
}
bool FirstValue(const std::string& bytes,RecordingIdentityFirstAcceptance* output,std::string* error) {
    Document doc;RecordingIdentityFirstAcceptance first;
    if(!ingress::ParseStrictJsonObjectDocument(bytes,&doc,error)||doc.members.size()!=3||
       !Number(doc,"occurrences",&first.occurrences)||!first.occurrences)return Fail(error,"history first fields");
    const auto row=ingress::StrictJsonObjectField(doc,"row"),archive=ingress::StrictJsonObjectField(doc,"archive");
    if(!row||!archive||!ParseRow(*row,&first.first_row,error)||!ParseFile(*archive,&first.first_archive,error))return false;
    first.mutation_id=first.first_row.mutation_id;first.first_global_ordinal=first.first_row.global_ordinal;
    if(FirstBytes(first)!=bytes)return Fail(error,"history first noncanonical");
    *output=std::move(first);return true;
}
std::string OrdinalKey(std::uint64_t ordinal) {
    const auto digits=std::to_string(ordinal);return "o/"+std::string(20-digits.size(),'0')+digits;
}
bool PutFirst(RecordingIdentityHistory& history,const RecordingIdentityFirstAcceptance& first,bool overwrite,std::string* error) {
    if(first.mutation_id!=first.first_row.mutation_id||first.first_global_ordinal!=first.first_row.global_ordinal||!first.occurrences)
        return Fail(error,"history first identity invalid");
    if(!history.index.Put("i/"+first.mutation_id,FirstBytes(first),overwrite,error))return false;
    if(!overwrite){if(!history.index.Put(OrdinalKey(first.first_global_ordinal),first.mutation_id,false,error))return false;++history.count;}
    return true;
}
bool CheckFirst(RecordingIdentityHistory& history,const RecordingIdentityFirstAcceptance& first,std::string* error) {
    std::string value,id;
    if(history.index.Get("i/"+first.mutation_id,&value,error)!=RecordingHistoryIndex::Lookup::Found||
       value!=FirstBytes(first)||
       history.index.Get(OrdinalKey(first.first_global_ordinal),&id,error)!=RecordingHistoryIndex::Lookup::Found||id!=first.mutation_id)
        return Fail(error,"history incomplete identity/ordinal coverage");
    return true;
}
std::string ScratchDirectory() {
    // This is a separate capability. Create validates the opened directory; source root is never used.
    return std::filesystem::canonical(std::filesystem::temp_directory_path()).string();
}
bool FinishFailure(const RecordingIdentityHistoryHandle& history,std::string* error,RecordingIdentityHistoryHandle* receipt) {
    std::string cleanup;
    if(history&&!history->index.Close(&cleanup)){if(receipt)*receipt=history;if(error)*error+="; cleanup: "+cleanup;}
    return false;
}
}
#endif
bool BuildRecordingIdentityHistory(const std::filesystem::path& root,const std::vector<RecordingIdentityFirstAcceptance>& first,
    std::uint64_t budget,RecordingIdentityHistoryHandle* output,std::string* error) {
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    if(!output)return Fail(error,"history output missing");
    (void)root;
    auto history=std::make_shared<RecordingIdentityHistory>();
    try {
        if(budget>UINT64_MAX-first.size())return Fail(error,"history row capacity overflow");
        const auto count=static_cast<std::uint64_t>(first.size())+budget;
        if(count>UINT64_MAX/2)return Fail(error,"history row capacity overflow");
        const auto bytes=RecordingHistoryIndex::BytesForRows(2*count);
        if(!bytes)return Fail(error,"history scratch size overflow");
        if(!history->index.Create(ScratchDirectory(),bytes,error))return FinishFailure(history,error,output);
        for(const auto& entry:first){
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
            if(history_build_fault==1&&&entry==&first.back())continue;
#endif
            if(!PutFirst(*history,entry,false,error))return FinishFailure(history,error,output);
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
            if(history_build_fault==2&&!history->index.Put(OrdinalKey(entry.first_global_ordinal),"wrong-first-id",true,error))return FinishFailure(history,error,output);
#endif
        }
        // Both namespaces are compared to the already validated original, before negative lookup publication.
        for(const auto& entry:first){
            if(!CheckFirst(*history,entry,error)||entry.occurrences>UINT64_MAX-history->physical)
                return FinishFailure(history,error,output);
            history->physical+=entry.occurrences;
        }
        if(history->index.usage().rows!=2*first.size())return FinishFailure(history,error,output);
        history->complete=true;*output=std::move(history);if(error)error->clear();return true;
    }catch(...){Fail(error,"history construction resource failure");return FinishFailure(history,error,output);}
#else
    (void)root;(void)first;(void)budget;(void)output;return Fail(error,"history unsupported");
#endif
}
bool FindRecordingIdentityHistory(const RecordingIdentityHistoryHandle& history,const std::string& id,
    std::optional<RecordingIdentityFirstAcceptance>* output,std::string* error) {
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    if(!history||!history->complete||!output)return Fail(error,"history lookup incomplete/missing");
    std::string bytes;const auto found=history->index.Get("i/"+id,&bytes,error);
    if(found==RecordingHistoryIndex::Lookup::Error)return false;
    if(found==RecordingHistoryIndex::Lookup::Absent){output->reset();return true;}
    RecordingIdentityFirstAcceptance first;
    if(!FirstValue(bytes,&first,error)||first.mutation_id!=id)return Fail(error,"history lookup identity mismatch");
    *output=std::move(first);return true;
#else
    (void)history;(void)id;(void)output;return Fail(error,"history unsupported");
#endif
}
bool VisitRecordingIdentityHistory(const RecordingIdentityHistoryHandle& history,const RecordingIdentityFirstVisitor& visitor,std::string* error) {
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    if(!history||!history->complete||!visitor)return Fail(error,"history visitor incomplete/missing");
    std::size_t count=0;
    const bool ok=history->index.Visit([&](const auto& key,const auto& value,std::string* err){
        if(key.rfind("o/",0)!=0)return true;
        std::optional<RecordingIdentityFirstAcceptance> first;
        if(!FindRecordingIdentityHistory(history,value,&first,err)||!first||OrdinalKey(first->first_global_ordinal)!=key)
            return Fail(err,"history ordinal identity mismatch");
        ++count;return visitor(*first,err);
    },error);
    if(!ok)return false;
    if(count!=history->count)return Fail(error,"history traversal coverage mismatch");
    return true;
#else
    (void)history;(void)visitor;return Fail(error,"history unsupported");
#endif
}
bool CloneRecordingIdentityHistory(const RecordingIdentityHistoryHandle& source,const std::filesystem::path& root,
    std::uint64_t budget,RecordingIdentityHistoryHandle* output,std::string* error) {
    if(!output)return Fail(error,"history clone output missing");
    RecordingIdentityHistoryHandle target;
    if(!source||budget>UINT64_MAX-source->count)return Fail(error,"history clone capacity overflow");
    if(!BuildRecordingIdentityHistory(root,{},budget+source->count,&target,error)){*output=std::move(target);return false;}
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    if(!RecordingIdentityHistoryHealthy(source,error)||!target->index.CopyFrom(source->index,error))return FinishFailure(target,error,output);
    target->count=source->count;target->physical=source->physical;target->complete=source->complete;
    *output=std::move(target);return true;
#else
    (void)source;(void)output;return false;
#endif
}
bool AppendRecordingIdentityHistory(const RecordingIdentityHistoryHandle& history,const RecordingIdentityRow& row,
    const RecordingGenerationFile& archive,std::string* error) {
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    std::optional<RecordingIdentityFirstAcceptance> first;
    if(!FindRecordingIdentityHistory(history,row.mutation_id,&first,error))return false;
    if(first){if(!SameIdentity(first->first_row,row)||first->occurrences==UINT64_MAX)return Fail(error,"history repeated identity conflict");
        ++first->occurrences;
    }else first=RecordingIdentityFirstAcceptance{row.mutation_id,row.global_ordinal,1,row,archive};
    history->complete=false;
    if(history->physical==UINT64_MAX||!PutFirst(*history,*first,first->occurrences>1,error)||!CheckFirst(*history,*first,error))return false;
    ++history->physical;history->complete=true;return true;
#else
    (void)history;(void)row;(void)archive;return Fail(error,"history unsupported");
#endif
}
bool RecordingIdentityHistoryHealthy(const RecordingIdentityHistoryHandle& history,std::string* error) {
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    return history&&history->complete&&history->index.Healthy(error)&&history->index.usage().rows==2*history->count;
#else
    (void)history;return Fail(error,"history unsupported");
#endif
}
bool CloseRecordingIdentityHistory(const RecordingIdentityHistoryHandle& history,std::string* error) {
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    if(!history)return true;
    history->complete=false;return history->index.Close(error);
#else
    (void)history;(void)error;return true;
#endif
}
bool ValidateRecordingIdentityHistoryCoverage(const RecordingIdentityHistoryHandle& history,std::uint64_t physical,std::string* error) {
    if(!RecordingIdentityHistoryHealthy(history,error)||history->physical!=physical)return Fail(error,"history original coverage mismatch");
    return true;
}
std::uint64_t RecordingIdentityHistoryBytes(const RecordingIdentityHistoryHandle& history,bool allocated) {
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    if(!history)return 0;
    const auto usage=history->index.usage();return allocated?usage.allocated_bytes:usage.file_bytes;
#else
    (void)history;(void)allocated;return 0;
#endif
}
std::size_t RecordingIdentityHistorySize(const RecordingIdentityHistoryHandle& history){return history?history->count:0;}
} // namespace recording
