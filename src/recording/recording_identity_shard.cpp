#include "recording/recording_identity_shard.h"
#include "recording/recording_contracts.h"
#include "domain/strict_json.h"
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
bool ValidateRecordingIdentityShardChain(const RecordingGenerationFile& head,
    const RecordingIdentityShardLoader& loader, const RecordingIdentityChainLimits& limits,
    RecordingIdentityChainResult* output, std::string* error) {
#if !MEDIA_SERVER_USE_OPENSSL
    (void)head; (void)loader; (void)limits; (void)output;
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
        RecordingIdentityShard shard;
        if (!ParseRecordingIdentityShard(bytes, &shard, error) || shard.generation != generation ||
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
    std::vector<const RecordingIdentityRow*> ordered;
    ordered.reserve(first.size());
    for (const auto& item : first) ordered.push_back(&item.second.row);
    if (!OrderedReservations(ordered, error, &result)) return false;
    for (const auto& item : first)
        result.first_acceptances.push_back({item.first, item.second.row.global_ordinal,
            item.second.occurrences, item.second.row, item.second.archive});
    std::sort(result.first_acceptances.begin(), result.first_acceptances.end(), [](const auto& a, const auto& b) {
        return a.first_global_ordinal < b.first_global_ordinal;
    });
    *output = std::move(result);
    if (error) error->clear();
    return true;
#endif
}
} // namespace recording
