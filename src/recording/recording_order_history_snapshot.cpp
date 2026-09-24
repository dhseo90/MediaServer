#include "recording/recording_order_history_snapshot.h"
#include "recording/recording_contracts.h"
#include "domain/strict_json.h"
#include <algorithm>
#include <charconv>
#include <string_view>
#include <unordered_set>

namespace recording {
namespace {
constexpr const char* kSchema = "media-server.recording-order-history.v1";
bool Fail(std::string* error, const char* message) {
    if (error) *error = message;
    return false;
}
// 기존 journal Escape와 같은 문자열 처리다. 허용 ID 자체에는 escape 문자가 없다.
std::string Quote(const std::string& value) {
    std::string result = "\"";
    for (const char c : value) {
        switch (c) {
            case '\\': result += "\\\\"; break;
            case '"': result += "\\\""; break;
            case '\n': result += "\\n"; break;
            case '\r': result += "\\r"; break;
            case '\t': result += "\\t"; break;
            default: result += c; break;
        }
    }
    return result + '"';
}
bool Number(const ingress::StrictJsonObjectDocument& object, const char* key, std::int64_t* value) {
    const auto* member = object.Find(key);
    if (!member || member->type != ingress::StrictJsonType::Number) return false;
    const auto& raw = member->raw;
    const auto parsed = std::from_chars(raw.data(), raw.data() + raw.size(), *value);
    return parsed.ec == std::errc{} && parsed.ptr == raw.data() + raw.size();
}
bool Validate(const RecordingOrderHistorySnapshot& snapshot, std::string* error) {
    if (snapshot.reservations.empty()) {
        if (!snapshot.bound_store.empty() || snapshot.maximum != 0)
            return Fail(error, "empty order history store/maximum mismatch");
    } else if (!ValidateOpaqueId(snapshot.bound_store, error)) return false;
    std::unordered_set<std::string> requests, segments, ordinary, legacy;
    std::unordered_set<std::int64_t> sequences;
    std::int64_t maximum = 0;
    for (const auto& entry : snapshot.reservations) {
        const auto& order = entry.order;
        // ParseRecordingOrderReservationV1의 6필드 schema/ID/양수 sequence 의미를 유지한다.
        if (order.schema != "media-server.recording-order.v1" ||
            !ValidateOpaqueId(order.store_id, error) || !ValidateOpaqueId(order.request_id, error) ||
            !ValidateOpaqueId(order.segment_id, error) || !ValidateRecordingReferenceId(order.channel_id, error) ||
            order.store_id != snapshot.bound_store || order.sequence <= 0)
            return Fail(error, "order history reservation fields invalid");
        if (!requests.insert(order.request_id).second || !segments.insert(order.segment_id).second ||
            !sequences.insert(order.sequence).second)
            return Fail(error, "order history duplicate request/segment/sequence");
        maximum = std::max(maximum, order.sequence);
    }
    if (snapshot.maximum != maximum) return Fail(error, "order history maximum mismatch");
    for (const auto& id : snapshot.ordinary_ids) {
        if (!ValidateOpaqueId(id, error) || !ordinary.insert(id).second || requests.count(id))
            return Fail(error, "order history ordinary ID invalid/duplicate/request collision");
    }
    for (const auto& id : snapshot.legacy_segments) {
        if (!ValidateOpaqueId(id, error) || !legacy.insert(id).second || segments.count(id))
            return Fail(error, "order history legacy ID invalid/duplicate/reserved collision");
    }
    // request/segment, ordinary/legacy 등 별도 이름 공간에는 새 교차 제한을 추가하지 않는다.
    return true;
}
std::string OrderJson(const RecordingOrderReservationV1& order) {
    return "{\"schema\":" + Quote(order.schema) + ",\"storeId\":" + Quote(order.store_id) +
        ",\"requestId\":" + Quote(order.request_id) + ",\"segmentId\":" + Quote(order.segment_id) +
        ",\"channelId\":" + Quote(order.channel_id) + ",\"sequence\":" + std::to_string(order.sequence) + "}";
}
std::string IdsJson(std::vector<std::string> ids) {
    std::sort(ids.begin(), ids.end());
    std::string result = "[";
    for (std::size_t i = 0; i < ids.size(); ++i) {
        if (i) result += ',';
        result += Quote(ids[i]);
    }
    return result + ']';
}
// strict parser가 배열 전체 JSON과 중첩 중복 키를 먼저 검증한다.
// 아래는 검증된 배열의 최상위 원소 경계만 분리한다. 쉼표/escape를 내용으로 보존한다.
bool ArrayItems(const ingress::StrictJsonObjectDocument& object, const char* key,
                std::vector<std::string>* items) {
    const auto* member = object.Find(key);
    if (!member || member->type != ingress::StrictJsonType::Array) return false;
    const auto& raw = member->raw;
    std::size_t start = 1;
    int depth = 0;
    bool quoted = false, escaped = false;
    const auto append = [&](std::size_t end) {
        const auto part = std::string_view(raw).substr(start, end - start);
        if (part.find_first_not_of(" \t\r\n") != std::string_view::npos) items->emplace_back(part);
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
bool ParseOrder(const std::string& raw, RecordingOrderHistoryReservation* entry, std::string* error) {
    ingress::StrictJsonObjectDocument outer, order;
    if (!ingress::ParseStrictJsonObjectDocument(raw, &outer, error) || outer.members.size() != 2 ||
        !Number(outer, "occurredAtMs", &entry->occurred_at_ms)) return false;
    const auto body = ingress::StrictJsonObjectField(outer, "reservation");
    if (!body || !ingress::ParseStrictJsonObjectDocument(*body, &order, error) || order.members.size() != 6)
        return false;
    const auto schema = ingress::StrictJsonStringField(order, "schema");
    const auto store = ingress::StrictJsonStringField(order, "storeId");
    const auto request = ingress::StrictJsonStringField(order, "requestId");
    const auto segment = ingress::StrictJsonStringField(order, "segmentId");
    const auto channel = ingress::StrictJsonStringField(order, "channelId");
    if (!schema || !store || !request || !segment || !channel ||
        !Number(order, "sequence", &entry->order.sequence)) return false;
    entry->order.schema = *schema;
    entry->order.store_id = *store;
    entry->order.request_id = *request;
    entry->order.segment_id = *segment;
    entry->order.channel_id = *channel;
    return true;
}
bool ParseIds(const std::vector<std::string>& items, std::vector<std::string>* ids, std::string* error) {
    for (const auto& item : items) {
        ingress::StrictJsonObjectDocument wrapper;
        if (!ingress::ParseStrictJsonObjectDocument("{\"value\":" + item + "}", &wrapper, error)) return false;
        const auto value = ingress::StrictJsonStringField(wrapper, "value");
        if (!value) return false;
        ids->push_back(*value);
    }
    return true;
}
} // namespace

bool SerializeRecordingOrderHistorySnapshot(const RecordingOrderHistorySnapshot& snapshot,
    std::string* output, std::string* error) {
    if (!output || !Validate(snapshot, error)) return Fail(error, "order history output/fields invalid");
    auto reservations = snapshot.reservations;
    std::sort(reservations.begin(), reservations.end(), [](const auto& a, const auto& b) {
        return a.order.sequence < b.order.sequence;
    });
    std::string raw = "{\"schema\":" + Quote(kSchema) + ",\"boundStore\":" + Quote(snapshot.bound_store) +
        ",\"maximum\":" + std::to_string(snapshot.maximum) + ",\"reservations\":[";
    for (std::size_t i = 0; i < reservations.size(); ++i) {
        if (i) raw += ',';
        raw += "{\"reservation\":" + OrderJson(reservations[i].order) +
            ",\"occurredAtMs\":" + std::to_string(reservations[i].occurred_at_ms) + "}";
    }
    raw += "],\"ordinaryIds\":" + IdsJson(snapshot.ordinary_ids) +
        ",\"legacySegments\":" + IdsJson(snapshot.legacy_segments) + "}\n";
    *output = std::move(raw);
    if (error) error->clear();
    return true;
}
bool ParseRecordingOrderHistorySnapshot(const std::string& raw,
    RecordingOrderHistorySnapshot* output, std::string* error) {
    if (!output) return Fail(error, "order history output missing");
    ingress::StrictJsonObjectDocument document;
    RecordingOrderHistorySnapshot snapshot;
    if (!ingress::ParseStrictJsonObjectDocument(raw, &document, error) || document.members.size() != 6 ||
        ingress::StrictJsonStringField(document, "schema") != kSchema ||
        !Number(document, "maximum", &snapshot.maximum)) return Fail(error, "order history schema/fields invalid");
    const auto store = ingress::StrictJsonStringField(document, "boundStore");
    std::vector<std::string> reservations, ordinary, legacy;
    if (!store || !ArrayItems(document, "reservations", &reservations) ||
        !ArrayItems(document, "ordinaryIds", &ordinary) || !ArrayItems(document, "legacySegments", &legacy))
        return Fail(error, "order history array/store type invalid");
    snapshot.bound_store = *store;
    for (const auto& raw_entry : reservations) {
        RecordingOrderHistoryReservation entry;
        if (!ParseOrder(raw_entry, &entry, error)) return Fail(error, "order history reservation malformed");
        snapshot.reservations.push_back(std::move(entry));
    }
    if (!ParseIds(ordinary, &snapshot.ordinary_ids, error) || !ParseIds(legacy, &snapshot.legacy_segments, error))
        return Fail(error, "order history ID array type invalid");
    std::string canonical;
    if (!SerializeRecordingOrderHistorySnapshot(snapshot, &canonical, error) || canonical != raw)
        return Fail(error, "order history invalid/noncanonical");
    *output = std::move(snapshot);
    if (error) error->clear();
    return true;
}
bool RecordingOrderHistorySegments(const RecordingOrderHistorySnapshot& snapshot,
    std::vector<std::string>* output, std::string* error) {
    if (!output || !Validate(snapshot, error)) return Fail(error, "order history segment output/fields invalid");
    std::vector<std::string> segments;
    segments.reserve(snapshot.reservations.size());
    for (const auto& entry : snapshot.reservations) segments.push_back(entry.order.segment_id);
    std::sort(segments.begin(), segments.end());
    *output = std::move(segments);
    if (error) error->clear();
    return true;
}
} // namespace recording
