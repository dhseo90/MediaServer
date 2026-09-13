// 파일 요약: v4.1.0 녹화 v1 JSON 계약의 검증, 파싱, 정규 직렬화를 구현한다.
// 동작 요약: strict JSON을 사용해 unknown optional field는 무시하고 known field를 보존한다.
#include "recording/recording_contracts.h"

#include "domain/strict_json.h"

#include <algorithm>
#include <array>
#include <charconv>
#include <cmath>
#include <cstdlib>
#include <iomanip>
#include <limits>
#include <sstream>
#include <string_view>
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

bool ValidateReferencedObservationV1(const ReferencedObservationV1& value, std::string* error) {
    const auto& o = value.observation;
    const auto& r = value.reference;
    AnalysisObservationV2 checked;
    if(value.schema!="media-server.referenced-observation.v1"||
       !ParseAnalysisObservationV2(SerializeAnalysisObservationV2(o),&checked,error)||
       !ValidateRecordingConsumerReferenceV1(r,error)||r.kind!="observation"||r.owner_id!=o.observation_id||
       r.source_id!=o.source_id||r.channel_id!=o.channel_id||r.analysis_namespace!=o.analysis_namespace||
       r.analysis_track_id!=o.track_id||r.analysis_pts!=o.pts||o.frame_locator||!o.stream_epoch_id.empty()||o.locator_reason!="unresolved")
        return Fail(error,"referenced observation identity/metadata 오류");
    ClearError(error);
    return true;
}
std::string SerializeReferencedObservationV1(const ReferencedObservationV1& value) {
    if (!ValidateReferencedObservationV1(value, nullptr)) return {};
    return "{\"schema\":"+Quote(value.schema)+",\"observation\":"+SerializeAnalysisObservationV2(value.observation)+
        ",\"reference\":"+SerializeRecordingConsumerReferenceV1(value.reference)+"}";
}
bool ParseReferencedObservationV1(const std::string& json, ReferencedObservationV1* output, std::string* error) {
    if (!output || json.size() > 2 * 1024 * 1024)
        return Fail(error, "referenced observation JSON 상한/output 오류");
    Document d;
    ReferencedObservationV1 value;
    std::string observation, reference;
    if(!ParseDocument(json,&d,error)||d.members.size()!=3||!RequiredString(d,"schema",&value.schema,error)||
       !RequiredObject(d,"observation",&observation,error)||!RequiredObject(d,"reference",&reference,error)||
       observation.size()>1024*1024||!ParseAnalysisObservationV2(observation,&value.observation,error)||
       !ParseRecordingConsumerReferenceV1(reference,&value.reference,error)||!ValidateReferencedObservationV1(value,error))return false;
    *output = std::move(value);
    ClearError(error);
    return true;
}

bool ValidateRecordingConsumerReferenceV1(const RecordingConsumerReferenceV1& v, std::string* error) {
    const auto track=[](const std::string& s) {
        return !s.empty()&&s.size()<=1024&&std::none_of(s.begin(),s.end(),[](unsigned char c){return c<32||c==127;});
    };
    if(v.schema!="media-server.recording-consumer-reference.v1"||
       (v.kind!="observation"&&v.kind!="event")||v.analysis_pts<0||v.created_at_ms<0||!track(v.analysis_track_id))
        return Fail(error,"consumer reference schema/kind/analysis 오류");
    if(!ValidateRecordingReferenceId(v.source_id,error)||!ValidateRecordingReferenceId(v.channel_id,error))return false;
    for(const auto* id:{&v.reference_id,&v.owner_id,&v.analysis_namespace})
        if(!ValidateOpaqueId(*id,error))return false;
    const bool associated=v.association_quality=="timestamp-match"||v.association_quality=="nearest";
    if((!associated&&v.association_quality!="ambiguous"&&v.association_quality!="unavailable")||
       (v.association_quality=="timestamp-match"&&!v.original)||(!associated&&v.original))
        return Fail(error,"consumer reference quality/original 오류");
    if(v.original) {
        const auto& o=*v.original;
        if(!ValidateOpaqueId(o.source_generation,error)||!o.generation_order||!o.ordinal||!track(o.track_id)||
           o.pts_ns>static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max()))
            return Fail(error,"consumer reference original 오류");
    }
    if((v.kind=="event")!=v.request.has_value())return Fail(error,"consumer reference request 종류 오류");
    if(v.request) {
        const auto& r=*v.request;
        // pre-roll은 요청 사실이다. start-pre가 음수여도 원문을 보존하며
        // 실제 영상의 존재 범위나 coverage를 여기서 추론하지 않는다.
        if((r.time_basis!="utc-ms"&&r.time_basis!="media-pts-ms")||r.start_ms<0||r.end_ms<r.start_ms||r.pre_ms<0||r.post_ms<0||
           static_cast<__int128>(r.end_ms)+r.post_ms>std::numeric_limits<std::int64_t>::max())
            return Fail(error,"consumer reference request 범위 오류");
    }
    ClearError(error);return true;
}
std::string SerializeRecordingConsumerReferenceV1(const RecordingConsumerReferenceV1& v) {
    if(!ValidateRecordingConsumerReferenceV1(v,nullptr))return {};
    std::ostringstream out;
    out<<"{\"schema\":"<<Quote(v.schema)<<",\"reference_id\":"<<Quote(v.reference_id)<<",\"kind\":"<<Quote(v.kind)
       <<",\"owner_id\":"<<Quote(v.owner_id)<<",\"source_id\":"<<Quote(v.source_id)<<",\"channel_id\":"<<Quote(v.channel_id)
       <<",\"analysis_namespace\":"<<Quote(v.analysis_namespace)<<",\"analysis_track_id\":"<<Quote(v.analysis_track_id)
       <<",\"analysis_pts\":"<<v.analysis_pts<<",\"association_quality\":"<<Quote(v.association_quality)<<",\"original\":";
    if(v.original) {
        const auto& o=*v.original;
        out<<"{\"source_generation\":"<<Quote(o.source_generation)<<",\"generation_order\":"<<o.generation_order
           <<",\"ordinal\":"<<o.ordinal<<",\"track_id\":"<<Quote(o.track_id)<<",\"pts_ns\":"<<o.pts_ns<<'}';
    } else out<<"null";
    out<<",\"request\":";
    if(v.request) {
        const auto& r=*v.request;
        out<<"{\"time_basis\":"<<Quote(r.time_basis)<<",\"start_ms\":"<<r.start_ms<<",\"end_ms\":"<<r.end_ms
           <<",\"pre_ms\":"<<r.pre_ms<<",\"post_ms\":"<<r.post_ms<<'}';
    } else out<<"null";
    out<<",\"created_at_ms\":"<<v.created_at_ms<<'}';return out.str();
}
bool ParseRecordingConsumerReferenceV1(const std::string& json, RecordingConsumerReferenceV1* output, std::string* error) {
    if(!output||json.size()>1024*1024)return Fail(error,"consumer reference JSON 상한/output 오류");
    Document d;RecordingConsumerReferenceV1 v;
    if(!ParseDocument(json,&d,error)||d.members.size()!=13)return Fail(error,"consumer reference field 집합 오류");
    if(!RequiredString(d,"schema",&v.schema,error)||!RequiredString(d,"reference_id",&v.reference_id,error)||
       !RequiredString(d,"kind",&v.kind,error)||!RequiredString(d,"owner_id",&v.owner_id,error)||
       !RequiredString(d,"source_id",&v.source_id,error)||!RequiredString(d,"channel_id",&v.channel_id,error)||
       !RequiredString(d,"analysis_namespace",&v.analysis_namespace,error)||!RequiredString(d,"analysis_track_id",&v.analysis_track_id,error)||
       !RequiredInteger(d,"analysis_pts",&v.analysis_pts,error)||!RequiredString(d,"association_quality",&v.association_quality,error)||
       !RequiredInteger(d,"created_at_ms",&v.created_at_ms,error)||!d.Find("original")||!d.Find("request"))return false;
    if(d.Find("original")->type!=Type::Null) {
        const auto* field=RequiredMember(d,"original",Type::Object,error);Document item;RecordingConsumerOriginalV1 o;
        if(!field||!ParseDocument(field->raw,&item,error)||item.members.size()!=5||
           !RequiredString(item,"source_generation",&o.source_generation,error)||!RequiredInteger(item,"generation_order",&o.generation_order,error)||
           !RequiredInteger(item,"ordinal",&o.ordinal,error)||!RequiredString(item,"track_id",&o.track_id,error)||!RequiredInteger(item,"pts_ns",&o.pts_ns,error))return false;
        v.original=std::move(o);
    }
    if(d.Find("request")->type!=Type::Null) {
        const auto* field=RequiredMember(d,"request",Type::Object,error);Document item;RecordingConsumerRequestV1 r;
        if(!field||!ParseDocument(field->raw,&item,error)||item.members.size()!=5||!RequiredString(item,"time_basis",&r.time_basis,error)||
           !RequiredInteger(item,"start_ms",&r.start_ms,error)||!RequiredInteger(item,"end_ms",&r.end_ms,error)||
           !RequiredInteger(item,"pre_ms",&r.pre_ms,error)||!RequiredInteger(item,"post_ms",&r.post_ms,error))return false;
        v.request=std::move(r);
    }
    if(!ValidateRecordingConsumerReferenceV1(v,error))return false;
    *output=std::move(v);ClearError(error);return true;
}

bool ValidateRecordingSourceBindingV1(const RecordingSourceBindingV1& b, std::string* error) {
    if(b.schema!="media-server.recording-source-binding.v1" || b.samples.empty() || b.samples.size()>4096 ||
       b.generation_order==0 || b.track_id.empty() || b.track_id.size()>1024 ||
       std::any_of(b.track_id.begin(),b.track_id.end(),[](unsigned char c){return c<32||c==127;}))
        return Fail(error,"source binding schema/track/상한 오류");
    if(!ValidateRecordingReferenceId(b.source_id,error)||!ValidateRecordingReferenceId(b.channel_id,error))return false;
    for(const auto* id:{&b.segment_id,&b.store_id,&b.media_epoch_id,&b.source_generation})
        if(!ValidateOpaqueId(*id,error))return false;
    std::uint64_t prior=0;
    for(const auto& sample:b.samples) {
        if(sample.ordinal<=prior || sample.pts_ns>static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max()))
            return Fail(error,"source binding ordinal/PTS 오류");
        prior=sample.ordinal;
    }
    if(b.index_complete ? (b.last_accepted_ordinal!=prior||!b.incomplete_reason.empty()) :
       (b.samples.size()!=4096||b.last_accepted_ordinal<=prior||b.incomplete_reason!="sample-index-cap"))
        return Fail(error,"source binding completeness 오류");
    // 모든 문자열·tuple 상한의 직렬화 최대 합은 512KiB 미만이다.
    ClearError(error);return true;
}
bool ValidateRecordingSourceBindingForSegment(const RecordingSourceBindingV1& b,const RecordingSegmentV2& s,std::string* error) {
    if(!ValidateRecordingSourceBindingV1(b,error)||!ValidateRecordingSegmentV2(s,error))return false;
    if(b.segment_id!=s.segment_id||b.source_id!=s.source_id||b.channel_id!=s.channel_id||
       b.store_id!=s.store_id||b.media_epoch_id!=s.media_epoch_id)return Fail(error,"source binding segment identity 불일치");
    const __int128 denominator=static_cast<__int128>(1000000000)*s.time_base_num;
    for(const auto& sample:b.samples) {
        const __int128 numerator=static_cast<__int128>(sample.pts_ns)*s.time_base_den;
        if(numerator%denominator)return Fail(error,"source binding 비정수 media PTS");
        const __int128 pts=numerator/denominator;
        if(pts>std::numeric_limits<std::int64_t>::max()||pts<s.media_start_pts||
           (s.media_end_pts&&pts>=*s.media_end_pts))return Fail(error,"source binding media 범위 오류");
    }
    ClearError(error);return true;
}
std::string SerializeRecordingSourceBindingV1(const RecordingSourceBindingV1& b) {
    if(!ValidateRecordingSourceBindingV1(b,nullptr))return {};
    std::ostringstream out;
    out<<"{\"schema\":"<<Quote(b.schema)<<",\"segment_id\":"<<Quote(b.segment_id)<<",\"source_id\":"<<Quote(b.source_id)
       <<",\"channel_id\":"<<Quote(b.channel_id)<<",\"store_id\":"<<Quote(b.store_id)<<",\"media_epoch_id\":"<<Quote(b.media_epoch_id)
       <<",\"source_generation\":"<<Quote(b.source_generation)<<",\"generation_order\":"<<b.generation_order
       <<",\"track_id\":"<<Quote(b.track_id)<<",\"samples\":[";
    for(std::size_t i=0;i<b.samples.size();++i){if(i)out<<',';out<<"{\"ordinal\":"<<b.samples[i].ordinal<<",\"pts_ns\":"<<b.samples[i].pts_ns<<'}';}
    out<<"],\"index_complete\":"<<(b.index_complete?"true":"false")<<",\"last_accepted_ordinal\":"<<b.last_accepted_ordinal
       <<",\"incomplete_reason\":"<<Quote(b.incomplete_reason)<<'}';
    auto text=out.str();return text.size()<=512*1024?text:std::string{};
}
bool ParseRecordingSourceBindingV1(const std::string& json,RecordingSourceBindingV1* output,std::string* error) {
    if(!output||json.size()>512*1024)return Fail(error,"source binding JSON 상한/output 오류");
    Document d;RecordingSourceBindingV1 b;
    if(!ParseDocument(json,&d,error)||d.members.size()!=13)return Fail(error,"source binding field 집합 오류");
    if(!RequiredString(d,"schema",&b.schema,error)||!RequiredString(d,"segment_id",&b.segment_id,error)||
       !RequiredString(d,"source_id",&b.source_id,error)||!RequiredString(d,"channel_id",&b.channel_id,error)||
       !RequiredString(d,"store_id",&b.store_id,error)||!RequiredString(d,"media_epoch_id",&b.media_epoch_id,error)||
       !RequiredString(d,"source_generation",&b.source_generation,error)||!RequiredInteger(d,"generation_order",&b.generation_order,error)||
       !RequiredString(d,"track_id",&b.track_id,error)||!RequiredBool(d,"index_complete",&b.index_complete,error)||
       !RequiredInteger(d,"last_accepted_ordinal",&b.last_accepted_ordinal,error)||!RequiredString(d,"incomplete_reason",&b.incomplete_reason,error))return false;
    const auto* array=RequiredMember(d,"samples",Type::Array,error);std::vector<std::string> items;
    if(!array||!SplitArray(array->raw,&items,error)||items.empty()||items.size()>4096)return Fail(error,"source binding samples 오류");
    for(const auto& text:items){Document item;RecordingSourceSampleV1 sample;
        if(!ParseDocument(text,&item,error)||item.members.size()!=2||!RequiredInteger(item,"ordinal",&sample.ordinal,error)||
           !RequiredInteger(item,"pts_ns",&sample.pts_ns,error))return false;
        b.samples.push_back(sample);
    }
    if(!ValidateRecordingSourceBindingV1(b,error))return false;
    *output=std::move(b);ClearError(error);return true;
}

bool ValidateRecordingReferenceId(const std::string& value, std::string* error) {
    if (value.empty() || value.size() > 128) return Fail(error, "opaque ID 길이 오류");
    if (value.find('/') != std::string::npos || value.find('\\') != std::string::npos ||
        value == "." || value == ".." || value.find("..") != std::string::npos) {
        return Fail(error, "opaque ID에 path 표현이 있음");
    }
    for (const unsigned char ch : value) {
        const bool allowed = std::isalnum(ch) != 0 || ch == '-' || ch == '_' || ch == '.' || ch == ':';
        if (!allowed) return Fail(error, "opaque ID 문자가 허용되지 않음");
    }
    ClearError(error);
    return true;
}

bool ValidateOpaqueId(const std::string& value, std::string* error) {
    if (!ValidateRecordingReferenceId(value,error)) return false;
    const bool all_digits=std::all_of(value.begin(),value.end(),[](unsigned char ch){return std::isdigit(ch)!=0;});
    if (all_digits) return Fail(error, "opaque ID는 SQLite rowid 형태일 수 없음");
    ClearError(error);
    return true;
}

bool IsBoundRecordingFallbackNamespace(const std::string& value) {
    return value.rfind("fallback-bound-", 0) == 0;
}

std::string BoundRecordingFallbackId(const std::string& event_id,
                                     const std::string& link_id,
                                     const std::string& source_id,
                                     const std::string& channel_id,
                                     const std::string& raw_stream_id,
                                     const std::string& raw_channel_id) {
    if (event_id.empty() || link_id.empty() || source_id.empty() || channel_id.empty() ||
        raw_channel_id.empty()) return {};
#if !MEDIA_SERVER_USE_OPENSSL
    (void)raw_stream_id;
    return {};
#else
    const std::array<std::string_view, 7> fields{
        "media-server.recording-fallback-binding.v1", event_id, link_id, source_id,
        channel_id, raw_stream_id, raw_channel_id};
    EVP_MD_CTX* context = EVP_MD_CTX_new();
    if (context == nullptr) return {};
    bool ok = EVP_DigestInit_ex(context, EVP_sha256(), nullptr) == 1;
    for (const auto field : fields) {
        const auto prefix = std::to_string(field.size()) + ":";
        ok = ok && EVP_DigestUpdate(context, prefix.data(), prefix.size()) == 1 &&
             EVP_DigestUpdate(context, field.data(), field.size()) == 1;
    }
    std::array<unsigned char, EVP_MAX_MD_SIZE> digest{};
    unsigned int size = 0;
    ok = ok && EVP_DigestFinal_ex(context, digest.data(), &size) == 1;
    EVP_MD_CTX_free(context);
    if (!ok || size != 32) return {};
    std::ostringstream output;
    output << "fallback-bound-v1-" << std::hex << std::setfill('0');
    for (unsigned int i = 0; i < size; ++i) output << std::setw(2) << static_cast<int>(digest[i]);
    return output.str();
#endif
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

namespace {
constexpr std::size_t kSegmentV2JsonLimit = 1024 * 1024;
std::string NullableInteger(const std::optional<std::int64_t>& value) {
    return value ? std::to_string(*value) : "null";
}
bool RequiredNullableInteger(const Document& d, const std::string& key,
                             std::optional<std::int64_t>* value, std::string* error) {
    const auto* member = d.Find(key);
    if (!member) return Fail(error, "V2 nullable field 누락");
    if (member->type == Type::Null) { value->reset(); return true; }
    std::int64_t integer;
    if (member->type != Type::Number || !ParseIntegerRaw(member->raw, &integer))
        return Fail(error, "V2 nullable 정수 오류");
    *value = integer;
    return true;
}
}

std::string SerializeRecordingSegmentV2(const RecordingSegmentV2& v) {
    std::ostringstream out;
    out << "{\"schema\":" << Quote(v.schema) << ",\"segment_id\":" << Quote(v.segment_id)
        << ",\"source_id\":" << Quote(v.source_id) << ",\"channel_id\":" << Quote(v.channel_id)
        << ",\"store_id\":" << Quote(v.store_id) << ",\"order_request_id\":" << Quote(v.order_request_id)
        << ",\"media_epoch_id\":" << Quote(v.media_epoch_id) << ",\"order_sequence\":" << v.order_sequence
        << ",\"media_start_pts\":" << v.media_start_pts << ",\"media_end_pts\":" << NullableInteger(v.media_end_pts)
        << ",\"time_base_num\":" << v.time_base_num << ",\"time_base_den\":" << v.time_base_den
        << ",\"container\":" << Quote(v.container) << ",\"video_codecs\":" << SerializeStringArray(v.video_codecs)
        << ",\"audio_codecs\":" << SerializeStringArray(v.audio_codecs)
        << ",\"audio_omitted_reason\":" << Quote(v.audio_omitted_reason) << ",\"size_bytes\":" << v.size_bytes
        << ",\"checksum_sha256\":" << Quote(v.checksum_sha256) << ",\"retention_class\":" << Quote(RetentionString(v.retention_class))
        << ",\"lifecycle\":" << Quote(LifecycleString(v.lifecycle)) << ",\"pinned\":" << (v.pinned ? "true" : "false")
        << ",\"created_at_ms\":" << v.created_at_ms << ",\"finalized_at_ms\":" << v.finalized_at_ms << ",\"mappings\":[";
    for (std::size_t i=0; i<v.mappings.size(); ++i) {
        if (i) out << ',';
        const auto& m=v.mappings[i];
        out << "{\"schema\":" << Quote(m.schema) << ",\"mapping_id\":" << Quote(m.mapping_id)
            << ",\"start_pts\":" << m.start_pts << ",\"end_pts\":" << NullableInteger(m.end_pts)
            << ",\"provenance\":" << Quote(m.provenance) << ",\"utc_start_ns\":" << NullableInteger(m.utc_start_ns)
            << ",\"utc_end_ns\":" << NullableInteger(m.utc_end_ns) << ",\"uncertainty_ns\":" << NullableInteger(m.uncertainty_ns)
            << ",\"reason\":" << Quote(m.reason) << '}';
        if (out.tellp() > static_cast<std::streamoff>(kSegmentV2JsonLimit)) return {};
    }
    out << "]}";
    auto json=out.str();
    return json.size() <= kSegmentV2JsonLimit ? json : std::string{};
}

namespace {
bool V2DeletionReason(const std::string& reason) {
    return reason=="continuous-capacity" || reason=="continuous-age" ||
           reason=="event-capacity" || reason=="event-age" ||
           reason=="reserved-free-space" || reason=="manual-corrupt-cleanup";
}
bool V2CorruptionReason(const std::string& reason) {
    return reason=="missing-media" || reason=="checksum-mismatch" ||
           reason=="container-invalid" || reason=="derived-media-missing";
}
}

std::string SerializeRecordingTombstoneV2(const RecordingTombstoneV2& v) {
    if (v.schema!="media-server.recording-tombstone.v2" ||
        !ValidateOpaqueId(v.tombstone_id,nullptr) || !V2DeletionReason(v.deletion_reason) ||
        v.deleted_at_ms<0) return {};
    const auto segment=SerializeRecordingSegmentV2(v.segment);
    if (segment.empty()) return {};
    const auto json="{\"schema\":"+Quote(v.schema)+",\"tombstone_id\":"+Quote(v.tombstone_id)+
        ",\"segment\":"+segment+",\"deletion_reason\":"+Quote(v.deletion_reason)+
        ",\"deleted_at_ms\":"+std::to_string(v.deleted_at_ms)+"}";
    return json.size()<=kSegmentV2JsonLimit ? json : std::string{};
}

bool ParseRecordingTombstoneV2(const std::string& json,RecordingTombstoneV2* out,std::string* error) {
    if (!out || json.size()>kSegmentV2JsonLimit) return Fail(error,"V2 tombstone 입력 오류");
    RecordingTombstoneV2 v; Document d; std::string segment;
    if (!ParseDocument(json,&d,error) || d.members.size()!=5 ||
        !RequiredString(d,"schema",&v.schema,error) ||
        !RequiredString(d,"tombstone_id",&v.tombstone_id,error) ||
        !RequiredObject(d,"segment",&segment,error) ||
        !RequiredString(d,"deletion_reason",&v.deletion_reason,error) ||
        !RequiredInteger(d,"deleted_at_ms",&v.deleted_at_ms,error) ||
        !ParseRecordingSegmentV2(segment,&v.segment,error) ||
        SerializeRecordingTombstoneV2(v).empty()) return Fail(error,"V2 tombstone 형식 오류");
    *out=std::move(v); ClearError(error); return true;
}

std::string SerializeRecordingSegmentStateV2(const RecordingSegmentStateV2& v) {
    if (v.schema!="media-server.recording-segment-state.v2" || !ValidateOpaqueId(v.segment_id,nullptr) ||
        !((v.lifecycle==RecordingLifecycle::DeletionPending && V2DeletionReason(v.reason)) ||
          (v.lifecycle==RecordingLifecycle::Corrupt && V2CorruptionReason(v.reason)))) return {};
    return "{\"schema\":"+Quote(v.schema)+",\"segment_id\":"+Quote(v.segment_id)+
        ",\"lifecycle\":"+Quote(LifecycleString(v.lifecycle))+",\"reason\":"+Quote(v.reason)+"}";
}

bool ParseRecordingSegmentStateV2(const std::string& json,RecordingSegmentStateV2* out,std::string* error) {
    if (!out || json.size()>kSegmentV2JsonLimit) return Fail(error,"V2 state 입력 오류");
    RecordingSegmentStateV2 v; Document d; std::string lifecycle;
    if (!ParseDocument(json,&d,error) || d.members.size()!=4 ||
        !RequiredString(d,"schema",&v.schema,error) || !RequiredString(d,"segment_id",&v.segment_id,error) ||
        !RequiredString(d,"lifecycle",&lifecycle,error) || !RequiredString(d,"reason",&v.reason,error)) return false;
    v.lifecycle=ParseLifecycle(lifecycle);
    if (SerializeRecordingSegmentStateV2(v).empty()) return Fail(error,"V2 state 형식 오류");
    *out=std::move(v); ClearError(error); return true;
}

bool ValidateRecordingSegmentV2(const RecordingSegmentV2& v, std::string* error) {
    if (v.schema != "media-server.recording-segment.v2") return Fail(error, "V2 segment schema 오류");
    if (v.retention_class!=RecordingRetentionClass::Continuous && v.retention_class!=RecordingRetentionClass::Event)
        return Fail(error,"V2 retention 분류 오류");
    if(!ValidateRecordingReferenceId(v.source_id,error)||!ValidateRecordingReferenceId(v.channel_id,error))return false;
    for (const auto* id : {&v.segment_id,&v.store_id,&v.order_request_id,&v.media_epoch_id})
        if (!ValidateOpaqueId(*id,error)) return false;
    if (v.order_sequence<=0 || v.time_base_num<=0 || v.time_base_den<=0 ||
        (v.media_end_pts && *v.media_end_pts<=v.media_start_pts)) return Fail(error,"V2 media/순서 범위 오류");
    if (v.container.empty() || v.video_codecs.empty() || (v.audio_codecs.empty() && v.audio_omitted_reason.empty()) ||
        v.lifecycle!=RecordingLifecycle::Finalized || v.size_bytes==0 || !IsSha256(v.checksum_sha256) || v.finalized_at_ms<=0)
        return Fail(error,"V2 물리 finalized 계약 오류");
    if (v.mappings.empty() || v.mappings.size()>256) return Fail(error,"V2 mapping 개수 오류");
    std::unordered_set<std::string> ids;
    std::int64_t next=v.media_start_pts;
    for (std::size_t i=0;i<v.mappings.size();++i) {
        const auto& m=v.mappings[i];
        if (m.schema!="media-server.recording-utc-mapping.v1" || !ValidateOpaqueId(m.mapping_id,error) ||
            !ids.insert(m.mapping_id).second || m.reason.size()>256 || m.start_pts!=next ||
            (m.end_pts && *m.end_pts<=m.start_pts)) return Fail(error,"V2 mapping identity/media 범위 오류");
        const bool unknown=m.provenance=="unknown";
        if (unknown) {
            if (m.utc_start_ns || m.utc_end_ns || m.uncertainty_ns || m.reason.empty())
                return Fail(error,"V2 unknown nullable/reason 오류");
        } else {
            if ((m.provenance!="source-capture" && m.provenance!="server-observation" && m.provenance!="estimated") ||
                !m.end_pts || !m.utc_start_ns || !m.utc_end_ns || *m.utc_start_ns>=*m.utc_end_ns ||
                !m.uncertainty_ns || *m.uncertainty_ns<0 || (m.provenance=="estimated" && m.reason.empty()))
                return Fail(error,"V2 known UTC/provenance 오류");
        }
        if (!m.end_pts) {
            if (!unknown || i+1!=v.mappings.size() || v.media_end_pts)
                return Fail(error,"V2 미확정 끝 위치 오류");
        } else next=*m.end_pts;
    }
    if (v.mappings.back().end_pts!=v.media_end_pts) return Fail(error,"V2 mapping 전체 cover 오류");
    if (SerializeRecordingSegmentV2(v).empty()) return Fail(error,"V2 JSON 상한 초과");
    ClearError(error);return true;
}

bool ParseRecordingSegmentV2(const std::string& json, RecordingSegmentV2* value, std::string* error) {
    if (!value || json.size()>kSegmentV2JsonLimit) return Fail(error,"V2 output/JSON 상한 오류");
    Document d; RecordingSegmentV2 v; std::string retention,lifecycle;
    if (!ParseDocument(json,&d,error)) return false;
    if (d.members.size()!=24) return Fail(error,"V2 정확한 field 집합 오류");
    if (!RequiredString(d,"schema",&v.schema,error) || !RequiredString(d,"segment_id",&v.segment_id,error) ||
        !RequiredString(d,"source_id",&v.source_id,error) || !RequiredString(d,"channel_id",&v.channel_id,error) ||
        !RequiredString(d,"store_id",&v.store_id,error) || !RequiredString(d,"order_request_id",&v.order_request_id,error) ||
        !RequiredString(d,"media_epoch_id",&v.media_epoch_id,error) || !RequiredInteger(d,"order_sequence",&v.order_sequence,error) ||
        !RequiredInteger(d,"media_start_pts",&v.media_start_pts,error) || !RequiredNullableInteger(d,"media_end_pts",&v.media_end_pts,error) ||
        !RequiredInteger(d,"time_base_num",&v.time_base_num,error) || !RequiredInteger(d,"time_base_den",&v.time_base_den,error) ||
        !RequiredString(d,"container",&v.container,error) || !ParseStringArray(d,"video_codecs",&v.video_codecs,error) ||
        !ParseStringArray(d,"audio_codecs",&v.audio_codecs,error) || !RequiredString(d,"audio_omitted_reason",&v.audio_omitted_reason,error) ||
        !RequiredInteger(d,"size_bytes",&v.size_bytes,error) || !RequiredString(d,"checksum_sha256",&v.checksum_sha256,error) ||
        !RequiredString(d,"retention_class",&retention,error) || !RequiredString(d,"lifecycle",&lifecycle,error) ||
        !RequiredBool(d,"pinned",&v.pinned,error) || !RequiredInteger(d,"created_at_ms",&v.created_at_ms,error) ||
        !RequiredInteger(d,"finalized_at_ms",&v.finalized_at_ms,error)) return false;
    v.retention_class=ParseRetention(retention);v.lifecycle=ParseLifecycle(lifecycle);
    if (RetentionString(v.retention_class)!=retention || lifecycle!="finalized") return Fail(error,"V2 enum 오류");
    const auto* mappings=RequiredMember(d,"mappings",Type::Array,error);
    std::vector<std::string> entries;
    if (!mappings || !SplitArray(mappings->raw,&entries,error)) return false;
    if (entries.empty() || entries.size()>256) return Fail(error,"V2 mapping 개수 오류");
    for (const auto& entry:entries) {
        Document md;RecordingUtcMappingV1 m;
        if (!ParseDocument(entry,&md,error)) return false;
        if (md.members.size()!=9) return Fail(error,"V2 mapping 정확한 field 집합 오류");
        if (!RequiredString(md,"schema",&m.schema,error) || !RequiredString(md,"mapping_id",&m.mapping_id,error) ||
            !RequiredInteger(md,"start_pts",&m.start_pts,error) || !RequiredNullableInteger(md,"end_pts",&m.end_pts,error) ||
            !RequiredString(md,"provenance",&m.provenance,error) || !RequiredNullableInteger(md,"utc_start_ns",&m.utc_start_ns,error) ||
            !RequiredNullableInteger(md,"utc_end_ns",&m.utc_end_ns,error) || !RequiredNullableInteger(md,"uncertainty_ns",&m.uncertainty_ns,error) ||
            !RequiredString(md,"reason",&m.reason,error)) return false;
        v.mappings.push_back(std::move(m));
    }
    if (!ValidateRecordingSegmentV2(v,error)) return false;
    *value=std::move(v);ClearError(error);return true;
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

bool ValidateEventRecordingLinkV1(const EventRecordingLinkV1& value,
                                  std::string* error) {
    if (!ValidateOpaqueId(value.link_id, error) ||
        !ValidateOpaqueId(value.event_id, error) ||
        !ValidateReferenceId(value.source_id, "source_id", error) ||
        !ValidateReferenceId(value.channel_id, "channel_id", error) ||
        value.status == EventRecordingLinkStatus::Unknown ||
        value.created_at_ms <= 0 || value.updated_at_ms < value.created_at_ms) {
        return Fail(error, "event recording link 기본 field가 유효하지 않음");
    }
    if (value.time_basis != "utc-ms" && value.time_basis != "media-pts-ms") {
        return Fail(error, "event recording time basis가 유효하지 않음");
    }
    if (value.requested_range.has_value() &&
        value.requested_range->start_ms >= value.requested_range->end_ms) {
        return Fail(error, "event recording requested UTC range가 유효하지 않음");
    }
    if (value.media_pts_range_ms.has_value() &&
        value.media_pts_range_ms->start_ms >= value.media_pts_range_ms->end_ms) {
        return Fail(error, "event recording media PTS range가 유효하지 않음");
    }
    if (!value.requested_range.has_value() &&
        (!value.media_pts_range_ms.has_value() || value.time_basis != "media-pts-ms" ||
         value.status != EventRecordingLinkStatus::Pending)) {
        return Fail(error, "미해석 media PTS link 불변식 위반");
    }
    if (value.requested_range.has_value() && value.media_pts_range_ms.has_value()) {
        return Fail(error, "UTC range와 미해석 media PTS range를 동시에 저장할 수 없음");
    }
    if (value.deferred_requested_range.has_value() &&
        (!value.requested_range.has_value() ||
         value.status != EventRecordingLinkStatus::Pending ||
         value.deferred_requested_range->start_ms >= value.deferred_requested_range->end_ms ||
         value.deferred_requested_range->start_ms > value.requested_range->start_ms ||
         value.deferred_requested_range->end_ms < value.requested_range->end_ms)) {
        return Fail(error, "deferred requested range가 현재 pending UTC 범위를 포함하지 않음");
    }
    if (value.deferred_media_pts_range_ms.has_value() &&
        (!value.requested_range.has_value() || value.time_basis != "media-pts-ms" ||
         value.status != EventRecordingLinkStatus::Pending ||
         value.deferred_media_pts_range_ms->start_ms >= value.deferred_media_pts_range_ms->end_ms)) {
        return Fail(error, "미해석 후속 PTS는 기존 UTC 요청이 있는 pending link에만 허용함");
    }
    const UtcRangeV1 requested = value.requested_range.value_or(UtcRangeV1{});
    std::int64_t previous_end = requested.start_ms;
    std::unordered_set<std::string> segment_ids;
    for (const auto& overlap : value.ordered_overlaps) {
        if (!value.requested_range.has_value() ||
            !ValidateOpaqueId(overlap.segment_id, error) ||
            !segment_ids.insert(overlap.segment_id).second ||
            overlap.range.start_ms < requested.start_ms ||
            overlap.range.end_ms > requested.end_ms ||
            overlap.range.start_ms >= overlap.range.end_ms ||
            overlap.range.start_ms < previous_end) {
            return Fail(error, "event recording overlap 범위 또는 순서가 유효하지 않음");
        }
        previous_end = overlap.range.end_ms;
    }
    previous_end = requested.start_ms;
    for (const auto& range : value.missing_ranges) {
        if (!value.requested_range.has_value() ||
            range.start_ms < requested.start_ms ||
            range.end_ms > requested.end_ms ||
            range.start_ms >= range.end_ms || range.start_ms < previous_end) {
            return Fail(error, "event recording missing range가 유효하지 않음");
        }
        previous_end = range.end_ms;
    }
    if (value.derived_segment_id.has_value() &&
        !ValidateOpaqueId(*value.derived_segment_id, error)) return false;
    if (value.fallback_evidence_id.has_value() &&
        !ValidateOpaqueId(*value.fallback_evidence_id, error)) return false;
    if (value.fallback_media_locator.has_value() &&
        (value.fallback_media_locator->empty() ||
         value.fallback_media_locator->size() > 4096 ||
         value.fallback_media_locator->find('\0') != std::string::npos)) {
        return Fail(error, "fallback media locator가 유효하지 않음");
    }
    if (value.fallback_evidence_id.has_value() !=
        value.fallback_media_locator.has_value()) {
        return Fail(error, "fallback evidence ID와 locator는 함께 저장해야 함");
    }
    if (!value.stream_epoch_id.empty() &&
        !ValidateOpaqueId(value.stream_epoch_id, error)) return false;
    if (value.derived_actual_range.has_value() &&
        (!value.requested_range.has_value() ||
         value.derived_actual_range->start_ms >= value.derived_actual_range->end_ms ||
         value.derived_actual_range->start_ms > requested.start_ms ||
         value.derived_actual_range->end_ms < requested.end_ms)) {
        return Fail(error, "derived actual range가 requested range를 포함하지 않음");
    }
    if (value.status == EventRecordingLinkStatus::Complete &&
        (!value.requested_range.has_value() || !value.derived_segment_id.has_value() ||
         !value.derived_actual_range.has_value() || !value.missing_ranges.empty())) {
        return Fail(error, "complete event recording link 불변식 위반");
    }
    if (value.status == EventRecordingLinkStatus::Partial &&
        (!value.requested_range.has_value() || value.missing_ranges.empty())) {
        return Fail(error, "partial event recording link 불변식 위반");
    }
    if (value.requested_range.has_value() &&
        (value.status == EventRecordingLinkStatus::Complete ||
         value.status == EventRecordingLinkStatus::Partial)) {
        std::vector<UtcRangeV1> coverage;
        coverage.reserve(value.ordered_overlaps.size() + value.missing_ranges.size());
        for (const auto& overlap : value.ordered_overlaps) coverage.push_back(overlap.range);
        coverage.insert(coverage.end(), value.missing_ranges.begin(), value.missing_ranges.end());
        std::sort(coverage.begin(), coverage.end(), [](const auto& lhs, const auto& rhs) {
            if (lhs.start_ms != rhs.start_ms) return lhs.start_ms < rhs.start_ms;
            return lhs.end_ms < rhs.end_ms;
        });
        std::int64_t cursor = requested.start_ms;
        for (const auto& range : coverage) {
            if (range.start_ms != cursor) {
                return Fail(error, "overlap/missing range가 requested range의 정확한 분할이 아님");
            }
            cursor = range.end_ms;
        }
        if (cursor != requested.end_ms) {
            return Fail(error, "overlap/missing range가 requested range를 완전히 덮지 않음");
        }
    }
    ClearError(error);
    return true;
}

std::string SerializeEventRecordingLinkV1(const EventRecordingLinkV1& value) {
    std::ostringstream output;
    output << "{\"schema\":" << Quote(value.schema)
           << ",\"link_id\":" << Quote(value.link_id)
           << ",\"event_id\":" << Quote(value.event_id)
           << ",\"source_id\":" << Quote(value.source_id)
           << ",\"channel_id\":" << Quote(value.channel_id)
           << ",\"requested_range\":"
           << (value.requested_range.has_value() ? SerializeRange(*value.requested_range)
                                                 : "null");
    if (value.media_pts_range_ms.has_value()) {
        output << ",\"media_pts_range_ms\":" << SerializeRange(*value.media_pts_range_ms);
    }
    if (value.deferred_requested_range.has_value()) {
        output << ",\"deferred_requested_range\":"
               << SerializeRange(*value.deferred_requested_range);
    }
    if (value.deferred_media_pts_range_ms.has_value()) {
        output << ",\"deferred_media_pts_range_ms\":"
               << SerializeRange(*value.deferred_media_pts_range_ms);
    }
    output << ",\"ordered_overlaps\":[";
    for (std::size_t index = 0; index < value.ordered_overlaps.size(); ++index) {
        if (index != 0) output << ',';
        output << "{\"segment_id\":" << Quote(value.ordered_overlaps[index].segment_id)
               << ",\"range\":" << SerializeRange(value.ordered_overlaps[index].range) << '}';
    }
    output << "]" << ",\"derived_segment_id\":" << SerializeOptionalString(value.derived_segment_id)
           << ",\"fallback_evidence_id\":" << SerializeOptionalString(value.fallback_evidence_id)
           << ",\"fallback_media_locator\":" << SerializeOptionalString(value.fallback_media_locator)
           << ",\"missing_ranges\":[";
    for (std::size_t index = 0; index < value.missing_ranges.size(); ++index) {
        if (index != 0) output << ',';
        output << SerializeRange(value.missing_ranges[index]);
    }
    output << "]";
    if (value.derived_actual_range.has_value()) {
        output << ",\"derived_actual_range\":" << SerializeRange(*value.derived_actual_range);
    }
    if (!value.derivation_mode.empty()) {
        output << ",\"derivation_mode\":" << Quote(value.derivation_mode);
    }
    if (!value.time_basis.empty()) {
        output << ",\"time_basis\":" << Quote(value.time_basis);
    }
    if (!value.stream_epoch_id.empty()) {
        output << ",\"stream_epoch_id\":" << Quote(value.stream_epoch_id);
    }
    if (!value.completeness_reason.empty()) {
        output << ",\"completeness_reason\":" << Quote(value.completeness_reason);
    }
    output << ",\"status\":" << Quote(LinkStatusString(value.status))
           << ",\"created_at_ms\":" << value.created_at_ms
           << ",\"updated_at_ms\":" << value.updated_at_ms << '}';
    return output.str();
}

bool ParseEventRecordingLinkV1(const std::string& json,
                               EventRecordingLinkV1* value,
                               std::string* error) {
    if (value == nullptr) return Fail(error, "event link output이 null");
    Document document;
    std::string status;
    if (!ParseDocument(json, &document, error) ||
        !RequiredString(document, "schema", &value->schema, error) ||
        !RequiredString(document, "link_id", &value->link_id, error) ||
        !RequiredString(document, "event_id", &value->event_id, error) ||
        !RequiredString(document, "source_id", &value->source_id, error) ||
        !RequiredString(document, "channel_id", &value->channel_id, error) ||
        !OptionalString(document, "derived_segment_id", &value->derived_segment_id, error) ||
        !OptionalString(document, "fallback_evidence_id", &value->fallback_evidence_id, error) ||
        !OptionalString(document, "fallback_media_locator", &value->fallback_media_locator, error) ||
        !RequiredString(document, "status", &status, error) ||
        !RequiredInteger(document, "created_at_ms", &value->created_at_ms, error) ||
        !RequiredInteger(document, "updated_at_ms", &value->updated_at_ms, error)) return false;

    value->requested_range.reset();
    const Member* requested_range = document.Find("requested_range");
    if (requested_range == nullptr) return Fail(error, "필수 field 누락: requested_range");
    if (requested_range->type != Type::Null) {
        if (requested_range->type != Type::Object) {
            return Fail(error, "requested_range field type 불일치");
        }
        UtcRangeV1 parsed_range;
        if (!ParseRange(requested_range->raw, &parsed_range, error)) return false;
        value->requested_range = parsed_range;
    }
    value->deferred_requested_range.reset();
    const Member* deferred_range = document.Find("deferred_requested_range");
    if (deferred_range != nullptr) {
        if (deferred_range->type != Type::Object) {
            return Fail(error, "deferred_requested_range field type 불일치");
        }
        UtcRangeV1 parsed_range;
        if (!ParseRange(deferred_range->raw, &parsed_range, error)) return false;
        value->deferred_requested_range = parsed_range;
    }
    value->media_pts_range_ms.reset();
    value->deferred_media_pts_range_ms.reset();
    const Member* deferred_pts = document.Find("deferred_media_pts_range_ms");
    if (deferred_pts != nullptr) {
        if (deferred_pts->type != Type::Object) {
            return Fail(error, "deferred_media_pts_range_ms field type 불일치");
        }
        UtcRangeV1 parsed_range;
        if (!ParseRange(deferred_pts->raw, &parsed_range, error)) return false;
        value->deferred_media_pts_range_ms = parsed_range;
    }
    const Member* media_pts_range = document.Find("media_pts_range_ms");
    if (media_pts_range != nullptr) {
        if (media_pts_range->type != Type::Object) {
            return Fail(error, "media_pts_range_ms field type 불일치");
        }
        UtcRangeV1 parsed_range;
        if (!ParseRange(media_pts_range->raw, &parsed_range, error)) return false;
        value->media_pts_range_ms = parsed_range;
    }

    const Member* actual_range = document.Find("derived_actual_range");
    value->derived_actual_range.reset();
    if (actual_range != nullptr) {
        if (actual_range->type != Type::Object) {
            return Fail(error, "derived_actual_range field type 불일치");
        }
        UtcRangeV1 parsed_actual_range;
        if (!ParseRange(actual_range->raw, &parsed_actual_range, error)) return false;
        value->derived_actual_range = parsed_actual_range;
    }
    value->derivation_mode.clear();
    const Member* derivation_mode = document.Find("derivation_mode");
    if (derivation_mode != nullptr) {
        if (derivation_mode->type != Type::String) {
            return Fail(error, "derivation_mode field type 불일치");
        }
        value->derivation_mode = derivation_mode->string_value;
    }
    value->time_basis = "utc-ms";
    const Member* time_basis = document.Find("time_basis");
    if (time_basis != nullptr) {
        if (time_basis->type != Type::String) {
            return Fail(error, "time_basis field type 불일치");
        }
        value->time_basis = time_basis->string_value;
    }
    value->stream_epoch_id.clear();
    const Member* stream_epoch_id = document.Find("stream_epoch_id");
    if (stream_epoch_id != nullptr) {
        if (stream_epoch_id->type != Type::String) {
            return Fail(error, "stream_epoch_id field type 불일치");
        }
        value->stream_epoch_id = stream_epoch_id->string_value;
        if (!ValidateOpaqueId(value->stream_epoch_id, error)) return false;
    }
    value->completeness_reason.clear();
    const Member* completeness_reason = document.Find("completeness_reason");
    if (completeness_reason != nullptr) {
        if (completeness_reason->type != Type::String) {
            return Fail(error, "completeness_reason field type 불일치");
        }
        value->completeness_reason = completeness_reason->string_value;
    }

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
    if (value->schema != "media-server.event-recording-link.v1") {
        return Fail(error, "event recording link schema 불일치");
    }
    return ValidateEventRecordingLinkV1(*value, error);
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
           << ",\"retention_class\":" << Quote(RetentionString(value.retention_class))
           << ",\"deletion_reason\":" << Quote(value.deletion_reason)
           << ",\"deleted_at_ms\":" << value.deleted_at_ms << '}';
    return output.str();
}

std::string SerializeAnalysisObservationV2(const AnalysisObservationV2& v) {
    std::ostringstream out;
    out << "{\"schema\":" << Quote(v.schema)
        << ",\"observation_id\":" << Quote(v.observation_id)
        << ",\"source_id\":" << Quote(v.source_id)
        << ",\"channel_id\":" << Quote(v.channel_id)
        << ",\"analysis_namespace\":" << Quote(v.analysis_namespace)
        << ",\"stream_epoch_id\":" << Quote(v.stream_epoch_id)
        << ",\"pts\":" << v.pts
        << ",\"frame_locator\":" << (v.frame_locator ? SerializeFrameLocatorV1(*v.frame_locator) : "null")
        << ",\"locator_reason\":" << Quote(v.locator_reason)
        << ",\"track_id\":" << Quote(v.track_id)
        << ",\"class_label\":" << Quote(v.class_label)
        << ",\"confidence\":" << SerializeDouble(v.confidence)
        << ",\"bbox\":{\"x\":" << SerializeDouble(v.bbox.x)
        << ",\"y\":" << SerializeDouble(v.bbox.y)
        << ",\"width\":" << SerializeDouble(v.bbox.width)
        << ",\"height\":" << SerializeDouble(v.bbox.height) << '}'
        << ",\"selection_reasons\":" << SerializeStringArray(v.selection_reasons)
        << ",\"event_ids\":" << SerializeStringArray(v.event_ids)
        << ",\"zone_ids\":" << SerializeStringArray(v.zone_ids)
        << ",\"line_ids\":" << SerializeStringArray(v.line_ids)
        << ",\"rule_ids\":" << SerializeStringArray(v.rule_ids)
        << ",\"scenario_ids\":" << SerializeStringArray(v.scenario_ids)
        << ",\"first_seen_pts\":" << v.first_seen_pts
        << ",\"last_seen_pts\":" << v.last_seen_pts
        << ",\"duration_ns\":" << (v.duration_ns ? std::to_string(*v.duration_ns) : "null")
        << ",\"ended_reason\":" << Quote(v.ended_reason)
        << ",\"created_at_ms\":" << v.created_at_ms << '}';
    return out.str();
}

bool ParseAnalysisObservationV2(const std::string& json, AnalysisObservationV2* value,
                                std::string* error) {
    if (!value) return Fail(error, "observation-v2-output-null");
    AnalysisObservationV2 v;
    Document doc, box;
    std::string box_json;
    if (!ParseDocument(json, &doc, error) ||
        !RequiredString(doc, "schema", &v.schema, error) ||
        !RequiredString(doc, "observation_id", &v.observation_id, error) ||
        !RequiredString(doc, "source_id", &v.source_id, error) ||
        !RequiredString(doc, "channel_id", &v.channel_id, error) ||
        !RequiredString(doc, "analysis_namespace", &v.analysis_namespace, error) ||
        !RequiredString(doc, "stream_epoch_id", &v.stream_epoch_id, error) ||
        !RequiredInteger(doc, "pts", &v.pts, error) ||
        !RequiredString(doc, "locator_reason", &v.locator_reason, error) ||
        !RequiredString(doc, "track_id", &v.track_id, error) ||
        !RequiredString(doc, "class_label", &v.class_label, error) ||
        !RequiredDouble(doc, "confidence", &v.confidence, error) ||
        !RequiredObject(doc, "bbox", &box_json, error) ||
        !ParseDocument(box_json, &box, error) ||
        !RequiredDouble(box, "x", &v.bbox.x, error) ||
        !RequiredDouble(box, "y", &v.bbox.y, error) ||
        !RequiredDouble(box, "width", &v.bbox.width, error) ||
        !RequiredDouble(box, "height", &v.bbox.height, error) ||
        !ParseStringArray(doc, "selection_reasons", &v.selection_reasons, error) ||
        !ParseStringArray(doc, "event_ids", &v.event_ids, error) ||
        !ParseStringArray(doc, "zone_ids", &v.zone_ids, error) ||
        !ParseStringArray(doc, "line_ids", &v.line_ids, error) ||
        !ParseStringArray(doc, "rule_ids", &v.rule_ids, error) ||
        !ParseStringArray(doc, "scenario_ids", &v.scenario_ids, error) ||
        !RequiredInteger(doc, "first_seen_pts", &v.first_seen_pts, error) ||
        !RequiredInteger(doc, "last_seen_pts", &v.last_seen_pts, error) ||
        !RequiredString(doc, "ended_reason", &v.ended_reason, error) ||
        !RequiredInteger(doc, "created_at_ms", &v.created_at_ms, error)) return false;
    const auto* locator = doc.Find("frame_locator");
    const auto* duration = doc.Find("duration_ns");
    if (!locator || !duration) return Fail(error, "observation-v2-missing-nullable");
    if (locator->type != Type::Null) {
        FrameLocatorV1 parsed;
        if (locator->type != Type::Object || !ParseFrameLocatorV1(locator->raw, &parsed, error)) return false;
        v.frame_locator = std::move(parsed);
    }
    if (duration->type != Type::Null) {
        std::int64_t parsed;
        if (duration->type != Type::Number || !ParseIntegerRaw(duration->raw, &parsed))
            return Fail(error, "observation-v2-duration");
        v.duration_ns = parsed;
    }
    if (v.schema != "media-server.analysis-observation.v2" ||
        !ValidateOpaqueId(v.observation_id, error) ||
        !ValidateReferenceId(v.source_id, "source_id", error) ||
        !ValidateReferenceId(v.channel_id, "channel_id", error) ||
        !ValidateOpaqueId(v.analysis_namespace, error) || !ValidateOpaqueId(v.track_id, error) ||
        (!v.stream_epoch_id.empty() && !ValidateOpaqueId(v.stream_epoch_id, error))) return false;
    if (v.created_at_ms < 0 || v.pts < 0 || v.first_seen_pts < 0 || v.last_seen_pts < v.first_seen_pts ||
        v.pts < v.first_seen_pts || v.pts > v.last_seen_pts ||
        v.class_label.empty() || v.class_label.size() > 128 || v.confidence < 0 || v.confidence > 1 ||
        v.bbox.x < 0 || v.bbox.y < 0 || v.bbox.width < 0 || v.bbox.height < 0 ||
        v.bbox.x + v.bbox.width > 1 || v.bbox.y + v.bbox.height > 1 ||
        v.selection_reasons.empty() || v.selection_reasons.size() > 4 || v.event_ids.size() > 64)
        return Fail(error, "observation-v2-invalid-fields");
    std::unordered_set<std::string> seen;
    for (const auto& reason : v.selection_reasons) {
        if ((reason != "track-start" && reason != "interval" && reason != "event" && reason != "track-end") ||
            !seen.insert(reason).second) return Fail(error, "observation-v2-selection");
    }
    for (const auto& id : v.event_ids) if (!ValidateOpaqueId(id, error)) return false;
    for (const auto* refs : {&v.zone_ids, &v.line_ids, &v.rule_ids, &v.scenario_ids}) {
        if (refs->size() > 64) return Fail(error, "observation-v2-reference-limit");
        for (const auto& id : *refs) if (!ValidateReferenceId(id, "reference", error)) return false;
    }
    const bool ended = seen.count("track-end") != 0;
    if (ended != v.duration_ns.has_value() || (ended &&
        (*v.duration_ns != v.last_seen_pts - v.first_seen_pts ||
         (v.ended_reason != "tracker-terminated" && v.ended_reason != "stream-stopped" &&
          v.ended_reason != "pts-rollback"))) || (!ended && !v.ended_reason.empty()))
        return Fail(error, "observation-v2-summary");
    const std::unordered_set<std::string> reasons{"unresolved", "pending", "gap", "deleted", "corrupt",
        "ambiguous-epoch", "missing-provenance", "out-of-range", "stream-stopped", "missing-media"};
    if (v.frame_locator) {
        if (!v.locator_reason.empty() || v.stream_epoch_id.empty() ||
            v.frame_locator->frame.pts != v.pts || v.frame_locator->frame_index ||
            !v.frame_locator->keyframe_pts || v.frame_locator->frame.time_base_num != 1 ||
            v.frame_locator->frame.time_base_den != 1000000000)
            return Fail(error, "observation-v2-locator");
    } else if (!reasons.count(v.locator_reason)) return Fail(error, "observation-v2-null-reason");
    *value = std::move(v);
    ClearError(error);
    return true;
}

bool ParseRecordingTombstoneV1(const std::string& json,
                               RecordingTombstoneV1* value,
                               std::string* error) {
    if (value == nullptr) return Fail(error, "tombstone output이 null");
    Document document;
    std::string range_json;
    std::optional<std::string> retention_class;
    if (!ParseDocument(json, &document, error) ||
        !RequiredString(document, "schema", &value->schema, error) ||
        !RequiredString(document, "tombstone_id", &value->tombstone_id, error) ||
        !RequiredString(document, "segment_id", &value->segment_id, error) ||
        !RequiredString(document, "source_id", &value->source_id, error) ||
        !RequiredString(document, "channel_id", &value->channel_id, error) ||
        !RequiredObject(document, "recorded_range", &range_json, error) ||
        !RequiredString(document, "checksum_sha256", &value->checksum_sha256, error) ||
        !OptionalString(document, "retention_class", &retention_class, error) ||
        !RequiredString(document, "deletion_reason", &value->deletion_reason, error) ||
        !RequiredInteger(document, "deleted_at_ms", &value->deleted_at_ms, error) ||
        !ParseRange(range_json, &value->recorded_range, error)) return false;
    value->retention_class = retention_class.has_value()
                                 ? ParseRetention(*retention_class)
                                 : RecordingRetentionClass::Unknown;
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
