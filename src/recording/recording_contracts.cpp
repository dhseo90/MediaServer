// 파일 요약: v4.1.0 녹화 v1 JSON 계약의 검증, 파싱, 정규 직렬화를 구현한다.
// 동작 요약: strict JSON을 사용해 unknown optional field는 무시하고 known field를 보존한다.
#include "recording/recording_contracts.h"

#include "domain/strict_json.h"

#include <algorithm>
#include <charconv>
#include <cmath>
#include <cstdlib>
#include <iomanip>
#include <limits>
#include <sstream>
#include <string_view>

namespace recording {
namespace {

using Document = ingress::StrictJsonObjectDocument;
using Member = ingress::StrictJsonMember;
using Type = ingress::StrictJsonType;

bool Fail(std::string* error, const std::string& reason) {
    if (error != nullptr) {
        *error = reason;
    }
    return false;
}

void ClearError(std::string* error) {
    if (error != nullptr) {
        error->clear();
    }
}

std::string Escape(const std::string& value) {
    std::ostringstream output;
    for (const unsigned char ch : value) {
        switch (ch) {
            case '"': output << "\\\""; break;
            case '\\': output << "\\\\"; break;
            case '\b': output << "\\b"; break;
            case '\f': output << "\\f"; break;
            case '\n': output << "\\n"; break;
            case '\r': output << "\\r"; break;
            case '\t': output << "\\t"; break;
            default:
                if (ch < 0x20) {
                    output << "\\u" << std::hex << std::setw(4) << std::setfill('0')
                           << static_cast<int>(ch) << std::dec;
                } else {
                    output << static_cast<char>(ch);
                }
        }
    }
    return output.str();
}

std::string Quote(const std::string& value) {
    return "\"" + Escape(value) + "\"";
}

bool ParseDocument(const std::string& json, Document* document, std::string* error) {
    std::string detail;
    if (!ingress::ParseStrictJsonObjectDocument(json, document, &detail)) {
        return Fail(error, "JSON object 오류: " + detail);
    }
    return true;
}

const Member* RequiredMember(const Document& document,
                             const std::string& key,
                             Type type,
                             std::string* error) {
    const Member* member = document.Find(key);
    if (member == nullptr) {
        Fail(error, "필수 field 누락: " + key);
        return nullptr;
    }
    if (member->type != type) {
        Fail(error, "field type 불일치: " + key);
        return nullptr;
    }
    return member;
}

bool RequiredString(const Document& document,
                    const std::string& key,
                    std::string* output,
                    std::string* error) {
    const Member* member = RequiredMember(document, key, Type::String, error);
    if (member == nullptr || output == nullptr) return false;
    *output = member->string_value;
    return true;
}

bool RequiredBool(const Document& document,
                  const std::string& key,
                  bool* output,
                  std::string* error) {
    const Member* member = RequiredMember(document, key, Type::Bool, error);
    if (member == nullptr || output == nullptr) return false;
    *output = member->bool_value;
    return true;
}

template <typename Integer>
bool ParseIntegerRaw(const std::string& raw, Integer* output) {
    if (output == nullptr || raw.empty()) return false;
    Integer parsed{};
    const char* begin = raw.data();
    const char* end = begin + raw.size();
    const auto result = std::from_chars(begin, end, parsed);
    if (result.ec != std::errc{} || result.ptr != end) return false;
    *output = parsed;
    return true;
}

template <typename Integer>
bool RequiredInteger(const Document& document,
                     const std::string& key,
                     Integer* output,
                     std::string* error) {
    const Member* member = RequiredMember(document, key, Type::Number, error);
    if (member == nullptr) return false;
    if (!ParseIntegerRaw(member->raw, output)) {
        return Fail(error, "정수 field 오류: " + key);
    }
    return true;
}

bool RequiredDouble(const Document& document,
                    const std::string& key,
                    double* output,
                    std::string* error) {
    const Member* member = RequiredMember(document, key, Type::Number, error);
    if (member == nullptr || output == nullptr) return false;
    char* end = nullptr;
    const double parsed = std::strtod(member->raw.c_str(), &end);
    if (end != member->raw.c_str() + member->raw.size() || !std::isfinite(parsed)) {
        return Fail(error, "실수 field 오류: " + key);
    }
    *output = parsed;
    return true;
}

bool OptionalString(const Document& document,
                    const std::string& key,
                    std::optional<std::string>* output,
                    std::string* error) {
    if (output == nullptr) return false;
    const Member* member = document.Find(key);
    if (member == nullptr || member->type == Type::Null) {
        output->reset();
        return true;
    }
    if (member->type != Type::String) return Fail(error, "optional string type 불일치: " + key);
    *output = member->string_value;
    return true;
}

template <typename Integer>
bool OptionalInteger(const Document& document,
                     const std::string& key,
                     std::optional<Integer>* output,
                     std::string* error) {
    if (output == nullptr) return false;
    const Member* member = document.Find(key);
    if (member == nullptr || member->type == Type::Null) {
        output->reset();
        return true;
    }
    if (member->type != Type::Number) return Fail(error, "optional integer type 불일치: " + key);
    Integer parsed{};
    if (!ParseIntegerRaw(member->raw, &parsed)) return Fail(error, "optional integer 오류: " + key);
    *output = parsed;
    return true;
}

bool SplitArray(const std::string& raw, std::vector<std::string>* items, std::string* error) {
    if (items == nullptr || raw.size() < 2 || raw.front() != '[' || raw.back() != ']') {
        return Fail(error, "array 형식 오류");
    }
    items->clear();
    std::size_t start = 1;
    int object_depth = 0;
    int array_depth = 0;
    bool in_string = false;
    bool escaped = false;
    for (std::size_t pos = 1; pos + 1 < raw.size(); ++pos) {
        const char ch = raw[pos];
        if (in_string) {
            if (escaped) escaped = false;
            else if (ch == '\\') escaped = true;
            else if (ch == '"') in_string = false;
            continue;
        }
        if (ch == '"') in_string = true;
        else if (ch == '{') ++object_depth;
        else if (ch == '}') --object_depth;
        else if (ch == '[') ++array_depth;
        else if (ch == ']') --array_depth;
        else if (ch == ',' && object_depth == 0 && array_depth == 0) {
            items->push_back(raw.substr(start, pos - start));
            start = pos + 1;
        }
    }
    const std::string tail = raw.substr(start, raw.size() - start - 1);
    if (tail.find_first_not_of(" \t\r\n") != std::string::npos) items->push_back(tail);
    return true;
}

bool ParseStringArray(const Document& document,
                      const std::string& key,
                      std::vector<std::string>* output,
                      std::string* error) {
    const Member* member = RequiredMember(document, key, Type::Array, error);
    if (member == nullptr || output == nullptr) return false;
    std::vector<std::string> items;
    if (!SplitArray(member->raw, &items, error)) return false;
    output->clear();
    for (const auto& item : items) {
        Document wrapper;
        if (!ParseDocument("{\"value\":" + item + "}", &wrapper, error)) return false;
        std::string value;
        if (!RequiredString(wrapper, "value", &value, error)) return false;
        output->push_back(std::move(value));
    }
    return true;
}

std::string SerializeStringArray(const std::vector<std::string>& values) {
    std::ostringstream output;
    output << '[';
    for (std::size_t index = 0; index < values.size(); ++index) {
        if (index != 0) output << ',';
        output << Quote(values[index]);
    }
    output << ']';
    return output.str();
}

std::string SerializeMediaTime(const MediaTimeV1& value) {
    std::ostringstream output;
    output << "{\"utc_ms\":" << value.utc_ms << ",\"pts\":" << value.pts
           << ",\"time_base_num\":" << value.time_base_num
           << ",\"time_base_den\":" << value.time_base_den << '}';
    return output.str();
}

bool ParseMediaTime(const std::string& json, MediaTimeV1* value, std::string* error) {
    if (value == nullptr) return Fail(error, "MediaTime output이 null");
    Document document;
    if (!ParseDocument(json, &document, error)) return false;
    if (!RequiredInteger(document, "utc_ms", &value->utc_ms, error) ||
        !RequiredInteger(document, "pts", &value->pts, error) ||
        !RequiredInteger(document, "time_base_num", &value->time_base_num, error) ||
        !RequiredInteger(document, "time_base_den", &value->time_base_den, error)) return false;
    return ValidateMediaTime(*value, error);
}

std::string SerializeRange(const UtcRangeV1& value) {
    return "{\"start_ms\":" + std::to_string(value.start_ms) +
           ",\"end_ms\":" + std::to_string(value.end_ms) + "}";
}

bool ParseRange(const std::string& json, UtcRangeV1* value, std::string* error) {
    if (value == nullptr) return Fail(error, "range output이 null");
    Document document;
    if (!ParseDocument(json, &document, error) ||
        !RequiredInteger(document, "start_ms", &value->start_ms, error) ||
        !RequiredInteger(document, "end_ms", &value->end_ms, error)) return false;
    if (value->start_ms >= value->end_ms) return Fail(error, "UTC 반개구간이 비어 있음");
    return true;
}

bool RequiredObject(const Document& document,
                    const std::string& key,
                    std::string* output,
                    std::string* error) {
    const Member* member = RequiredMember(document, key, Type::Object, error);
    if (member == nullptr || output == nullptr) return false;
    *output = member->raw;
    return true;
}

std::string RetentionString(RecordingRetentionClass value) {
    switch (value) {
        case RecordingRetentionClass::Continuous: return "continuous";
        case RecordingRetentionClass::Event: return "event";
        case RecordingRetentionClass::Unknown: return "unknown";
    }
    return "unknown";
}

RecordingRetentionClass ParseRetention(const std::string& value) {
    if (value == "continuous") return RecordingRetentionClass::Continuous;
    if (value == "event") return RecordingRetentionClass::Event;
    return RecordingRetentionClass::Unknown;
}

std::string LifecycleString(RecordingLifecycle value) {
    switch (value) {
        case RecordingLifecycle::Writing: return "writing";
        case RecordingLifecycle::Finalized: return "finalized";
        case RecordingLifecycle::DeletionPending: return "deletion-pending";
        case RecordingLifecycle::Deleted: return "deleted";
        case RecordingLifecycle::Corrupt: return "corrupt";
        case RecordingLifecycle::Unknown: return "unknown";
    }
    return "unknown";
}

RecordingLifecycle ParseLifecycle(const std::string& value) {
    if (value == "writing") return RecordingLifecycle::Writing;
    if (value == "finalized") return RecordingLifecycle::Finalized;
    if (value == "deletion-pending") return RecordingLifecycle::DeletionPending;
    if (value == "deleted") return RecordingLifecycle::Deleted;
    if (value == "corrupt") return RecordingLifecycle::Corrupt;
    return RecordingLifecycle::Unknown;
}

std::string LinkStatusString(EventRecordingLinkStatus value) {
    switch (value) {
        case EventRecordingLinkStatus::Pending: return "pending";
        case EventRecordingLinkStatus::Complete: return "complete";
        case EventRecordingLinkStatus::Partial: return "partial";
        case EventRecordingLinkStatus::Failed: return "failed";
        case EventRecordingLinkStatus::Unknown: return "unknown";
    }
    return "unknown";
}

EventRecordingLinkStatus ParseLinkStatus(const std::string& value) {
    if (value == "pending") return EventRecordingLinkStatus::Pending;
    if (value == "complete") return EventRecordingLinkStatus::Complete;
    if (value == "partial") return EventRecordingLinkStatus::Partial;
    if (value == "failed") return EventRecordingLinkStatus::Failed;
    return EventRecordingLinkStatus::Unknown;
}

bool ValidateReferenceId(const std::string& value, const std::string& field, std::string* error) {
    if (value.empty() || value.size() > 256 || value.find('/') != std::string::npos ||
        value.find('\\') != std::string::npos || value == "." || value == "..") {
        return Fail(error, field + " reference ID 오류");
    }
    return true;
}

bool IsSha256(const std::string& value) {
    return value.size() == 64 && std::all_of(value.begin(), value.end(), [](unsigned char ch) {
        return (ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f');
    });
}

std::string SerializeOptionalString(const std::optional<std::string>& value) {
    return value.has_value() ? Quote(*value) : "null";
}

std::string SerializeDouble(double value) {
    std::ostringstream output;
    output << std::setprecision(std::numeric_limits<double>::max_digits10) << value;
    return output.str();
}

}  // namespace

bool ValidateOpaqueId(const std::string& value, std::string* error) {
    if (value.empty() || value.size() > 128) return Fail(error, "opaque ID 길이 오류");
    if (value.find('/') != std::string::npos || value.find('\\') != std::string::npos ||
        value == "." || value == ".." || value.find("..") != std::string::npos) {
        return Fail(error, "opaque ID에 path 표현이 있음");
    }
    bool all_digits = true;
    for (const unsigned char ch : value) {
        const bool allowed = std::isalnum(ch) != 0 || ch == '-' || ch == '_' || ch == '.' || ch == ':';
        if (!allowed) return Fail(error, "opaque ID 문자가 허용되지 않음");
        if (std::isdigit(ch) == 0) all_digits = false;
    }
    if (all_digits) return Fail(error, "opaque ID는 SQLite rowid 형태일 수 없음");
    ClearError(error);
    return true;
}

bool ValidateMediaTime(const MediaTimeV1& value, std::string* error) {
    if (value.time_base_num <= 0 || value.time_base_den <= 0) {
        return Fail(error, "timebase는 양수여야 함");
    }
    ClearError(error);
    return true;
}

bool ValidateRecordingSegmentV1(const RecordingSegmentV1& value, std::string* error) {
    if (value.schema != "media-server.recording-segment.v1") return Fail(error, "segment schema 불일치");
    if (!ValidateOpaqueId(value.segment_id, error) ||
        !ValidateReferenceId(value.source_id, "source_id", error) ||
        !ValidateReferenceId(value.channel_id, "channel_id", error) ||
        !ValidateOpaqueId(value.stream_epoch_id, error) ||
        !ValidateMediaTime(value.start, error) || !ValidateMediaTime(value.end, error)) return false;
    if (value.start.utc_ms >= value.end.utc_ms) return Fail(error, "segment UTC 반개구간 오류");
    if (value.start.time_base_num != value.end.time_base_num ||
        value.start.time_base_den != value.end.time_base_den || value.start.pts >= value.end.pts) {
        return Fail(error, "segment PTS/timebase 범위 오류");
    }
    if (value.container.empty() || value.video_codecs.empty()) return Fail(error, "media format 누락");
    if (value.audio_codecs.empty() && value.audio_omitted_reason.empty()) {
        return Fail(error, "audio 생략 사유 누락");
    }
    if (value.lifecycle == RecordingLifecycle::Finalized &&
        (value.size_bytes == 0 || !IsSha256(value.checksum_sha256) || value.finalized_at_ms <= 0)) {
        return Fail(error, "finalized segment 무결성 field 누락");
    }
    ClearError(error);
    return true;
}

bool IsPlayable(RecordingLifecycle lifecycle) {
    return lifecycle == RecordingLifecycle::Finalized;
}

bool HalfOpenRangesOverlap(std::int64_t first_start_ms,
                           std::int64_t first_end_ms,
                           std::int64_t second_start_ms,
                           std::int64_t second_end_ms) {
    return first_start_ms < first_end_ms && second_start_ms < second_end_ms &&
           first_start_ms < second_end_ms && second_start_ms < first_end_ms;
}

bool CanCreateSegmentId(const std::string& segment_id,
                        const std::vector<RecordingTombstoneV1>& tombstones,
                        std::string* error) {
    if (!ValidateOpaqueId(segment_id, error)) return false;
    const auto found = std::find_if(tombstones.begin(), tombstones.end(), [&](const auto& tombstone) {
        return tombstone.segment_id == segment_id;
    });
    if (found != tombstones.end()) return Fail(error, "tombstone segment ID 재사용 금지");
    ClearError(error);
    return true;
}

std::string SerializeRecordingSegmentV1(const RecordingSegmentV1& value) {
    std::ostringstream output;
    output << "{\"schema\":" << Quote(value.schema)
           << ",\"segment_id\":" << Quote(value.segment_id)
           << ",\"source_id\":" << Quote(value.source_id)
           << ",\"channel_id\":" << Quote(value.channel_id)
           << ",\"stream_epoch_id\":" << Quote(value.stream_epoch_id)
           << ",\"start\":" << SerializeMediaTime(value.start)
           << ",\"end\":" << SerializeMediaTime(value.end)
           << ",\"container\":" << Quote(value.container)
           << ",\"video_codecs\":" << SerializeStringArray(value.video_codecs)
           << ",\"audio_codecs\":" << SerializeStringArray(value.audio_codecs)
           << ",\"audio_omitted_reason\":" << Quote(value.audio_omitted_reason)
           << ",\"size_bytes\":" << value.size_bytes
           << ",\"checksum_sha256\":" << Quote(value.checksum_sha256)
           << ",\"retention_class\":" << Quote(RetentionString(value.retention_class))
           << ",\"lifecycle\":" << Quote(LifecycleString(value.lifecycle))
           << ",\"pinned\":" << (value.pinned ? "true" : "false")
           << ",\"created_at_ms\":" << value.created_at_ms
           << ",\"finalized_at_ms\":" << value.finalized_at_ms << '}';
    return output.str();
}

bool ParseRecordingSegmentV1(const std::string& json,
                             RecordingSegmentV1* value,
                             std::string* error) {
    if (value == nullptr) return Fail(error, "segment output이 null");
    Document document;
    std::string start_json;
    std::string end_json;
    std::string retention;
    std::string lifecycle;
    if (!ParseDocument(json, &document, error) ||
        !RequiredString(document, "schema", &value->schema, error) ||
        !RequiredString(document, "segment_id", &value->segment_id, error) ||
        !RequiredString(document, "source_id", &value->source_id, error) ||
        !RequiredString(document, "channel_id", &value->channel_id, error) ||
        !RequiredString(document, "stream_epoch_id", &value->stream_epoch_id, error) ||
        !RequiredObject(document, "start", &start_json, error) ||
        !RequiredObject(document, "end", &end_json, error) ||
        !RequiredString(document, "container", &value->container, error) ||
        !ParseStringArray(document, "video_codecs", &value->video_codecs, error) ||
        !ParseStringArray(document, "audio_codecs", &value->audio_codecs, error) ||
        !RequiredString(document, "audio_omitted_reason", &value->audio_omitted_reason, error) ||
        !RequiredInteger(document, "size_bytes", &value->size_bytes, error) ||
        !RequiredString(document, "checksum_sha256", &value->checksum_sha256, error) ||
        !RequiredString(document, "retention_class", &retention, error) ||
        !RequiredString(document, "lifecycle", &lifecycle, error) ||
        !RequiredBool(document, "pinned", &value->pinned, error) ||
        !RequiredInteger(document, "created_at_ms", &value->created_at_ms, error) ||
        !RequiredInteger(document, "finalized_at_ms", &value->finalized_at_ms, error) ||
        !ParseMediaTime(start_json, &value->start, error) ||
        !ParseMediaTime(end_json, &value->end, error)) return false;
    value->retention_class = ParseRetention(retention);
    value->lifecycle = ParseLifecycle(lifecycle);
    return ValidateRecordingSegmentV1(*value, error);
}

std::string SerializeFrameLocatorV1(const FrameLocatorV1& value) {
    std::ostringstream output;
    output << "{\"schema\":" << Quote(value.schema)
           << ",\"segment_id\":" << Quote(value.segment_id)
           << ",\"frame\":" << SerializeMediaTime(value.frame)
           << ",\"frame_index\":";
    if (value.frame_index.has_value()) output << *value.frame_index;
    else output << "null";
    output << ",\"keyframe_pts\":";
    if (value.keyframe_pts.has_value()) output << *value.keyframe_pts;
    else output << "null";
    output << '}';
    return output.str();
}

bool ParseFrameLocatorV1(const std::string& json, FrameLocatorV1* value, std::string* error) {
    if (value == nullptr) return Fail(error, "frame locator output이 null");
    Document document;
    std::string frame_json;
    if (!ParseDocument(json, &document, error) ||
        !RequiredString(document, "schema", &value->schema, error) ||
        !RequiredString(document, "segment_id", &value->segment_id, error) ||
        !RequiredObject(document, "frame", &frame_json, error) ||
        !OptionalInteger(document, "frame_index", &value->frame_index, error) ||
        !OptionalInteger(document, "keyframe_pts", &value->keyframe_pts, error) ||
        !ParseMediaTime(frame_json, &value->frame, error)) return false;
    if (value->schema != "media-server.frame-locator.v1") return Fail(error, "frame locator schema 불일치");
    return ValidateOpaqueId(value->segment_id, error);
}

std::string SerializeEventRecordingLinkV1(const EventRecordingLinkV1& value) {
    std::ostringstream output;
    output << "{\"schema\":" << Quote(value.schema)
           << ",\"link_id\":" << Quote(value.link_id)
           << ",\"event_id\":" << Quote(value.event_id)
           << ",\"source_id\":" << Quote(value.source_id)
           << ",\"channel_id\":" << Quote(value.channel_id)
           << ",\"requested_range\":" << SerializeRange(value.requested_range)
           << ",\"ordered_overlaps\":[";
    for (std::size_t index = 0; index < value.ordered_overlaps.size(); ++index) {
        if (index != 0) output << ',';
        output << "{\"segment_id\":" << Quote(value.ordered_overlaps[index].segment_id)
               << ",\"range\":" << SerializeRange(value.ordered_overlaps[index].range) << '}';
    }
    output << "]" << ",\"derived_segment_id\":" << SerializeOptionalString(value.derived_segment_id)
           << ",\"fallback_evidence_id\":" << SerializeOptionalString(value.fallback_evidence_id)
           << ",\"missing_ranges\":[";
    for (std::size_t index = 0; index < value.missing_ranges.size(); ++index) {
        if (index != 0) output << ',';
        output << SerializeRange(value.missing_ranges[index]);
    }
    output << "]" << ",\"status\":" << Quote(LinkStatusString(value.status))
           << ",\"created_at_ms\":" << value.created_at_ms
           << ",\"updated_at_ms\":" << value.updated_at_ms << '}';
    return output.str();
}

bool ParseEventRecordingLinkV1(const std::string& json,
                               EventRecordingLinkV1* value,
                               std::string* error) {
    if (value == nullptr) return Fail(error, "event link output이 null");
    Document document;
    std::string range_json;
    std::string status;
    if (!ParseDocument(json, &document, error) ||
        !RequiredString(document, "schema", &value->schema, error) ||
        !RequiredString(document, "link_id", &value->link_id, error) ||
        !RequiredString(document, "event_id", &value->event_id, error) ||
        !RequiredString(document, "source_id", &value->source_id, error) ||
        !RequiredString(document, "channel_id", &value->channel_id, error) ||
        !RequiredObject(document, "requested_range", &range_json, error) ||
        !OptionalString(document, "derived_segment_id", &value->derived_segment_id, error) ||
        !OptionalString(document, "fallback_evidence_id", &value->fallback_evidence_id, error) ||
        !RequiredString(document, "status", &status, error) ||
        !RequiredInteger(document, "created_at_ms", &value->created_at_ms, error) ||
        !RequiredInteger(document, "updated_at_ms", &value->updated_at_ms, error) ||
        !ParseRange(range_json, &value->requested_range, error)) return false;

    const Member* overlaps = RequiredMember(document, "ordered_overlaps", Type::Array, error);
    const Member* missing = RequiredMember(document, "missing_ranges", Type::Array, error);
    if (overlaps == nullptr || missing == nullptr) return false;
    std::vector<std::string> items;
    if (!SplitArray(overlaps->raw, &items, error)) return false;
    value->ordered_overlaps.clear();
    std::int64_t previous_start = std::numeric_limits<std::int64_t>::min();
    for (const auto& item : items) {
        Document overlap_document;
        SegmentOverlapV1 overlap;
        std::string overlap_range;
        if (!ParseDocument(item, &overlap_document, error) ||
            !RequiredString(overlap_document, "segment_id", &overlap.segment_id, error) ||
            !RequiredObject(overlap_document, "range", &overlap_range, error) ||
            !ValidateOpaqueId(overlap.segment_id, error) ||
            !ParseRange(overlap_range, &overlap.range, error)) return false;
        if (overlap.range.start_ms < previous_start) return Fail(error, "ordered overlap 순서 오류");
        previous_start = overlap.range.start_ms;
        value->ordered_overlaps.push_back(std::move(overlap));
    }
    if (!SplitArray(missing->raw, &items, error)) return false;
    value->missing_ranges.clear();
    for (const auto& item : items) {
        UtcRangeV1 range;
        if (!ParseRange(item, &range, error)) return false;
        value->missing_ranges.push_back(range);
    }
    value->status = ParseLinkStatus(status);
    if (value->schema != "media-server.event-recording-link.v1" ||
        !ValidateOpaqueId(value->link_id, error) || !ValidateOpaqueId(value->event_id, error) ||
        !ValidateReferenceId(value->source_id, "source_id", error) ||
        !ValidateReferenceId(value->channel_id, "channel_id", error)) return false;
    if (value->derived_segment_id.has_value() && !ValidateOpaqueId(*value->derived_segment_id, error)) return false;
    if (value->fallback_evidence_id.has_value() && !ValidateOpaqueId(*value->fallback_evidence_id, error)) return false;
    ClearError(error);
    return true;
}

std::string SerializeAnalysisObservationV1(const AnalysisObservationV1& value) {
    std::ostringstream output;
    output << "{\"schema\":" << Quote(value.schema)
           << ",\"observation_id\":" << Quote(value.observation_id)
           << ",\"source_id\":" << Quote(value.source_id)
           << ",\"channel_id\":" << Quote(value.channel_id)
           << ",\"frame_locator\":" << SerializeFrameLocatorV1(value.frame_locator)
           << ",\"track_id\":" << Quote(value.track_id)
           << ",\"class_label\":" << Quote(value.class_label)
           << ",\"confidence\":" << SerializeDouble(value.confidence)
           << ",\"bbox\":{\"x\":" << SerializeDouble(value.bbox.x)
           << ",\"y\":" << SerializeDouble(value.bbox.y)
           << ",\"width\":" << SerializeDouble(value.bbox.width)
           << ",\"height\":" << SerializeDouble(value.bbox.height) << '}'
           << ",\"zone_ids\":" << SerializeStringArray(value.zone_ids)
           << ",\"line_ids\":" << SerializeStringArray(value.line_ids)
           << ",\"rule_ids\":" << SerializeStringArray(value.rule_ids)
           << ",\"scenario_ids\":" << SerializeStringArray(value.scenario_ids)
           << ",\"event_ids\":" << SerializeStringArray(value.event_ids)
           << ",\"selection_reason\":" << Quote(value.selection_reason)
           << ",\"created_at_ms\":" << value.created_at_ms << '}';
    return output.str();
}

bool ParseAnalysisObservationV1(const std::string& json,
                                AnalysisObservationV1* value,
                                std::string* error) {
    if (value == nullptr) return Fail(error, "observation output이 null");
    Document document;
    std::string locator_json;
    std::string bbox_json;
    if (!ParseDocument(json, &document, error) ||
        !RequiredString(document, "schema", &value->schema, error) ||
        !RequiredString(document, "observation_id", &value->observation_id, error) ||
        !RequiredString(document, "source_id", &value->source_id, error) ||
        !RequiredString(document, "channel_id", &value->channel_id, error) ||
        !RequiredObject(document, "frame_locator", &locator_json, error) ||
        !RequiredString(document, "track_id", &value->track_id, error) ||
        !RequiredString(document, "class_label", &value->class_label, error) ||
        !RequiredDouble(document, "confidence", &value->confidence, error) ||
        !RequiredObject(document, "bbox", &bbox_json, error) ||
        !ParseStringArray(document, "zone_ids", &value->zone_ids, error) ||
        !ParseStringArray(document, "line_ids", &value->line_ids, error) ||
        !ParseStringArray(document, "rule_ids", &value->rule_ids, error) ||
        !ParseStringArray(document, "scenario_ids", &value->scenario_ids, error) ||
        !ParseStringArray(document, "event_ids", &value->event_ids, error) ||
        !RequiredString(document, "selection_reason", &value->selection_reason, error) ||
        !RequiredInteger(document, "created_at_ms", &value->created_at_ms, error) ||
        !ParseFrameLocatorV1(locator_json, &value->frame_locator, error)) return false;
    Document bbox;
    if (!ParseDocument(bbox_json, &bbox, error) ||
        !RequiredDouble(bbox, "x", &value->bbox.x, error) ||
        !RequiredDouble(bbox, "y", &value->bbox.y, error) ||
        !RequiredDouble(bbox, "width", &value->bbox.width, error) ||
        !RequiredDouble(bbox, "height", &value->bbox.height, error)) return false;
    if (value->schema != "media-server.analysis-observation.v1" ||
        !ValidateOpaqueId(value->observation_id, error) ||
        !ValidateReferenceId(value->source_id, "source_id", error) ||
        !ValidateReferenceId(value->channel_id, "channel_id", error) ||
        !ValidateOpaqueId(value->track_id, error)) return false;
    if (value->class_label.empty() || value->selection_reason.empty() ||
        value->confidence < 0.0 || value->confidence > 1.0 || value->bbox.x < 0.0 ||
        value->bbox.y < 0.0 || value->bbox.width < 0.0 || value->bbox.height < 0.0 ||
        value->bbox.x + value->bbox.width > 1.0 || value->bbox.y + value->bbox.height > 1.0) {
        return Fail(error, "observation confidence/bbox/selection 오류");
    }
    ClearError(error);
    return true;
}

std::string SerializeRecordingTombstoneV1(const RecordingTombstoneV1& value) {
    std::ostringstream output;
    output << "{\"schema\":" << Quote(value.schema)
           << ",\"tombstone_id\":" << Quote(value.tombstone_id)
           << ",\"segment_id\":" << Quote(value.segment_id)
           << ",\"source_id\":" << Quote(value.source_id)
           << ",\"channel_id\":" << Quote(value.channel_id)
           << ",\"recorded_range\":" << SerializeRange(value.recorded_range)
           << ",\"checksum_sha256\":" << Quote(value.checksum_sha256)
           << ",\"deletion_reason\":" << Quote(value.deletion_reason)
           << ",\"deleted_at_ms\":" << value.deleted_at_ms << '}';
    return output.str();
}

bool ParseRecordingTombstoneV1(const std::string& json,
                               RecordingTombstoneV1* value,
                               std::string* error) {
    if (value == nullptr) return Fail(error, "tombstone output이 null");
    Document document;
    std::string range_json;
    if (!ParseDocument(json, &document, error) ||
        !RequiredString(document, "schema", &value->schema, error) ||
        !RequiredString(document, "tombstone_id", &value->tombstone_id, error) ||
        !RequiredString(document, "segment_id", &value->segment_id, error) ||
        !RequiredString(document, "source_id", &value->source_id, error) ||
        !RequiredString(document, "channel_id", &value->channel_id, error) ||
        !RequiredObject(document, "recorded_range", &range_json, error) ||
        !RequiredString(document, "checksum_sha256", &value->checksum_sha256, error) ||
        !RequiredString(document, "deletion_reason", &value->deletion_reason, error) ||
        !RequiredInteger(document, "deleted_at_ms", &value->deleted_at_ms, error) ||
        !ParseRange(range_json, &value->recorded_range, error)) return false;
    if (value->schema != "media-server.recording-tombstone.v1" ||
        !ValidateOpaqueId(value->tombstone_id, error) ||
        !ValidateOpaqueId(value->segment_id, error) ||
        !ValidateReferenceId(value->source_id, "source_id", error) ||
        !ValidateReferenceId(value->channel_id, "channel_id", error) ||
        !IsSha256(value->checksum_sha256) || value->deletion_reason.empty() ||
        value->deleted_at_ms <= 0) return Fail(error, "tombstone field 오류");
    ClearError(error);
    return true;
}

}  // namespace recording
