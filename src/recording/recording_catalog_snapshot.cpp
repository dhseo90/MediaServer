// 파일 용도: 녹화 카탈로그 snapshot의 생성·검증·복원 로직을 구현한다.
#include "recording/recording_catalog_snapshot.h"
#include "recording/recording_contracts.h"
#include "domain/strict_json.h"
#include <algorithm>
#include <charconv>
#include <map>
#include <tuple>
#include <unordered_set>

namespace recording {
namespace {
using Document = ingress::StrictJsonObjectDocument;
constexpr const char* kSchema = "media-server.recording-catalog-snapshot.v1";
constexpr const char* kSourceSchema = "media-server.recording-catalog-source-summary.v1";
constexpr const char* kJobSchema = "media-server.recording-catalog-job-summary.v1";
bool Fail(std::string* error, const char* reason) {
    if (error) *error = reason;
    return false;
}
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
bool Number(const Document& document, const char* name, std::uint64_t* value) {
    const auto* member = document.Find(name);
    if (!member || member->type != ingress::StrictJsonType::Number) return false;
    const auto& raw = member->raw;
    const auto parsed = std::from_chars(raw.data(), raw.data() + raw.size(), *value);
    return parsed.ec == std::errc{} && parsed.ptr == raw.data() + raw.size();
}
bool Hash(const std::string& value) {
    return value.size() == 64 && std::all_of(value.begin(), value.end(), [](char c) {
        return (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f');
    });
}
bool SameFile(const RecordingGenerationFile& a, const RecordingGenerationFile& b) {
    return a.name == b.name && a.size == b.size && a.sha256 == b.sha256;
}
bool FileFields(const RecordingGenerationFile& file) {
    return file.size > 0 && file.size <= kRecordingCatalogSnapshotMaxBytes && Hash(file.sha256);
}
std::string FileJson(const RecordingGenerationFile& file) {
    return "{\"name\":" + Quote(file.name) + ",\"size\":" + std::to_string(file.size) +
        ",\"sha256\":" + Quote(file.sha256) + "}";
}
bool HeaderValid(const RecordingCatalogSnapshot& value, std::string* error) {
    return ValidateOpaqueId(value.store_id, error) && value.generation > 0 && FileFields(value.identity_head) &&
        value.identity_head.name == "identity-" + std::to_string(value.generation) + ".jsonl";
}
std::string HeaderJson(const RecordingCatalogSnapshot& value) {
    return "{\"schema\":" + Quote(kSchema) + ",\"storeId\":" + Quote(value.store_id) +
        ",\"generation\":" + std::to_string(value.generation) + ",\"cutOrdinal\":" +
        std::to_string(value.cut_ordinal) + ",\"identityHead\":" + FileJson(value.identity_head) + "}\n";
}
bool KindType(const std::string& kind, ingress::StrictJsonType* type) {
    if (kind == "media-path" || kind == "deletion-reason") {
        *type = ingress::StrictJsonType::String;
        return true;
    }
    if (kind == "derived-reference-accepted") {
        *type = ingress::StrictJsonType::Bool;
        return true;
    }
    static const char* objects[] = {"segment-v1", "segment-v2", "state-v2", "tombstone-v1",
        "tombstone-v2", "event-link", "observation-v1", "observation-v2", "consumer-reference",
        "referenced-observation", "source-binding", "derived-job", "accepted-state"};
    for (const auto* name : objects) {
        if (kind == name) { *type = ingress::StrictJsonType::Object; return true; }
    }
    return false;
}
bool RowValid(const RecordingCatalogSnapshotRow& row, std::string* error) {
    ingress::StrictJsonType type;
    if (!KindType(row.kind, &type) || !ValidateOpaqueId(row.key, error) ||
        row.value_json.size() > kRecordingCatalogSnapshotMaxBytes ||
        row.value_json.find_first_of("\r\n") != std::string::npos)
        return Fail(error, "snapshot row kind/key/JSONL value invalid");
    Document document;
    if (!ingress::ParseStrictJsonObjectDocument("{\"value\":" + row.value_json + "}", &document, error) ||
        document.members.size() != 1) return Fail(error, "snapshot payload strict JSON invalid");
    const auto* value = document.Find("value");
    if (!value || value->type != type || value->raw != row.value_json ||
        (type == ingress::StrictJsonType::Bool && !value->bool_value))
        return Fail(error, "snapshot payload type/boundary invalid");
    return true;
}
std::string RowJson(const RecordingCatalogSnapshotRow& row) {
    return "{\"kind\":" + Quote(row.kind) + ",\"key\":" + Quote(row.key) +
        ",\"value\":" + row.value_json + "}\n";
}
bool ParseHeader(const std::string& raw, RecordingCatalogSnapshot* value, std::string* error) {
    Document document, file;
    if (!ingress::ParseStrictJsonObjectDocument(raw, &document, error) || document.members.size() != 5 ||
        ingress::StrictJsonStringField(document, "schema") != kSchema ||
        !Number(document, "generation", &value->generation) || !Number(document, "cutOrdinal", &value->cut_ordinal))
        return Fail(error, "snapshot header schema/fields invalid");
    const auto store = ingress::StrictJsonStringField(document, "storeId");
    const auto head = ingress::StrictJsonObjectField(document, "identityHead");
    if (!store || !head || !ingress::ParseStrictJsonObjectDocument(*head, &file, error) || file.members.size() != 3)
        return Fail(error, "snapshot head fields invalid");
    const auto name = ingress::StrictJsonStringField(file, "name");
    const auto hash = ingress::StrictJsonStringField(file, "sha256");
    if (!name || !hash || !Number(file, "size", &value->identity_head.size))
        return Fail(error, "snapshot head descriptor invalid");
    value->store_id = *store;
    value->identity_head.name = *name;
    value->identity_head.sha256 = *hash;
    return HeaderValid(*value, error) && HeaderJson(*value) == raw;
}
bool ParseRow(const std::string& raw, RecordingCatalogSnapshotRow* row, std::string* error) {
    Document document;
    if (!ingress::ParseStrictJsonObjectDocument(raw, &document, error) || document.members.size() != 3)
        return Fail(error, "snapshot row fields invalid");
    const auto kind = ingress::StrictJsonStringField(document, "kind");
    const auto key = ingress::StrictJsonStringField(document, "key");
    const auto* value = document.Find("value");
    if (!kind || !key || !value) return Fail(error, "snapshot row fields missing");
    row->kind = *kind;
    row->key = *key;
    row->value_json = value->raw;
    return RowValid(*row, error) && RowJson(*row) == raw;
}
bool Less(const RecordingCatalogSnapshotRow& a, const RecordingCatalogSnapshotRow& b) {
    return std::tie(a.kind, a.key) < std::tie(b.kind, b.key);
}
bool RequiresAcceptedState(RecordingMutationType type) {
    // RecordingCatalog::ApplyMutationLocked의 segment_state 분류와 일치해야 한다.
    switch (type) {
        case RecordingMutationType::ReferencedObservationPut:
        case RecordingMutationType::DerivedReferenceAccepted:
        case RecordingMutationType::ConsumerReferencePut:
        case RecordingMutationType::DerivedJobIntent:
        case RecordingMutationType::DerivedJobFiles:
        case RecordingMutationType::DerivedJobReady:
        case RecordingMutationType::DerivedJobCommitted:
        case RecordingMutationType::DerivedJobComplete:
        case RecordingMutationType::DerivedJobFailed:
        case RecordingMutationType::SegmentFinalized:
        case RecordingMutationType::SegmentV2State:
        case RecordingMutationType::SegmentV2Deleted:
        case RecordingMutationType::SegmentV2Finalized:
        case RecordingMutationType::SegmentV2BoundFinalized:
        case RecordingMutationType::CorruptionDetected: return true;
        default: return false;
    }
}
bool Text(const Document& document,const char* key,std::string* value) {
    const auto text=ingress::StrictJsonStringField(document,key);
    if(!text)return false;
    *value=*text;return true;
}
const char* JobState(DerivedJobState state) {
    switch(state) {
        case DerivedJobState::Intent:return "intent";
        case DerivedJobState::Ready:return "ready";
        case DerivedJobState::Committed:return "committed";
        case DerivedJobState::Complete:return "complete";
        case DerivedJobState::Failed:return "failed";
    }
    return nullptr;
}
bool SourceSummaryValid(const RecordingCatalogSourceSummary& value,std::string* error) {
    return ValidateOpaqueId(value.id,error)&&ValidateRecordingReferenceId(value.channel,error)&&
        ValidateRecordingReferenceId(value.source,error)&&ValidateOpaqueId(value.generation,error)&&
        ValidateOpaqueId(value.latest_mutation_id,error)&&value.order>0&&value.sample_count>0&&value.sample_count<=4096&&
        !value.track.empty()&&value.track.size()<=1024&&
        std::none_of(value.track.begin(),value.track.end(),[](unsigned char c){return c<32||c==127;});
}
bool UniqueIds(const std::vector<std::string>& ids,std::string* error) {
    std::unordered_set<std::string> seen;
    for(const auto& id:ids)if(!ValidateOpaqueId(id,error)||!seen.insert(id).second)return false;
    return true;
}
bool JobSummaryValid(const RecordingCatalogJobSummary& value,std::string* error) {
    if(!ValidateOpaqueId(value.id,error)||!ValidateRecordingReferenceId(value.channel,error)||
       !ValidateOpaqueId(value.reference,error)||!ValidateOpaqueId(value.latest_mutation_id,error)||!JobState(value.state)||
       value.source_ids.empty()||value.source_ids.size()>8||value.output_ids.size()!=value.source_ids.size()||
       !value.reserved_bytes||value.reserved_bytes>256ULL*1024*1024||value.files>value.output_ids.size()||
       !UniqueIds(value.output_ids,error)||!UniqueIds(value.source_ids,error))return false;
    return value.state==DerivedJobState::Intent||value.state==DerivedJobState::Failed||value.files==value.output_ids.size();
}
std::string IdsJson(const std::vector<std::string>& ids) {
    std::string bytes="[";
    for(std::size_t i=0;i<ids.size();++i){if(i)bytes+=',';bytes+=Quote(ids[i]);}
    return bytes+"]";
}
bool Ids(const Document& document,const char* key,std::vector<std::string>* ids,std::string* error) {
    const auto* member=document.Find(key);
    if(!member||member->type!=ingress::StrictJsonType::Array)return false;
    const auto& raw=member->raw;
    if(raw=="[]")return true;
    bool quoted=false,escaped=false;
    std::size_t start=1;
    const auto append=[&](std::size_t end) {
        Document item;std::string value;
        if(ids->size()>=8||!ingress::ParseStrictJsonObjectDocument("{\"v\":"+raw.substr(start,end-start)+"}",&item,error)||
            item.members.size()!=1||!Text(item,"v",&value))return false;
        ids->push_back(std::move(value));return true;
    };
    for(std::size_t i=1;i+1<raw.size();++i) {
        const char c=raw[i];
        if(quoted){if(escaped)escaped=false;else if(c=='\\')escaped=true;else if(c=='"')quoted=false;}
        else if(c=='"')quoted=true;
        else if(c==','){if(!append(i))return false;start=i+1;}
    }
    return append(raw.size()-1);
}
} // namespace

bool SerializeRecordingCatalogSourceSummary(const RecordingCatalogSourceSummary& value,std::string* output,std::string* error) {
    if(!output||!SourceSummaryValid(value,error))return Fail(error,"source summary value invalid");
    std::string bytes="{\"schema\":"+Quote(kSourceSchema)+",\"id\":"+Quote(value.id)+",\"channel\":"+Quote(value.channel)+
        ",\"source\":"+Quote(value.source)+",\"generation\":"+Quote(value.generation)+",\"track\":"+Quote(value.track)+
        ",\"order\":"+std::to_string(value.order)+",\"sampleCount\":"+std::to_string(value.sample_count)+
        ",\"latestMutationId\":"+Quote(value.latest_mutation_id)+"}";
    *output=std::move(bytes);if(error)error->clear();return true;
}
bool ParseRecordingCatalogSourceSummary(const std::string& bytes,RecordingCatalogSourceSummary* output,std::string* error) {
    Document document;RecordingCatalogSourceSummary value;
    if(!output||!ingress::ParseStrictJsonObjectDocument(bytes,&document,error)||document.members.size()!=9||
       ingress::StrictJsonStringField(document,"schema")!=kSourceSchema||!Text(document,"id",&value.id)||
       !Text(document,"channel",&value.channel)||!Text(document,"source",&value.source)||
       !Text(document,"generation",&value.generation)||!Text(document,"track",&value.track)||
       !Text(document,"latestMutationId",&value.latest_mutation_id)||!Number(document,"order",&value.order)||
       !Number(document,"sampleCount",&value.sample_count))return Fail(error,"source summary fields invalid");
    std::string canonical;
    if(!SerializeRecordingCatalogSourceSummary(value,&canonical,error)||canonical!=bytes)return Fail(error,"source summary noncanonical");
    *output=std::move(value);if(error)error->clear();return true;
}
bool SerializeRecordingCatalogJobSummary(const RecordingCatalogJobSummary& value,std::string* output,std::string* error) {
    if(!output||!JobSummaryValid(value,error))return Fail(error,"job summary value invalid");
    std::string bytes="{\"schema\":"+Quote(kJobSchema)+",\"id\":"+Quote(value.id)+",\"channel\":"+Quote(value.channel)+
        ",\"reference\":"+Quote(value.reference)+",\"state\":"+Quote(JobState(value.state))+",\"files\":"+std::to_string(value.files)+
        ",\"reservedBytes\":"+std::to_string(value.reserved_bytes)+",\"outputIds\":"+IdsJson(value.output_ids)+
        ",\"sourceIds\":"+IdsJson(value.source_ids)+",\"latestMutationId\":"+Quote(value.latest_mutation_id)+"}";
    *output=std::move(bytes);if(error)error->clear();return true;
}
bool ParseRecordingCatalogJobSummary(const std::string& bytes,RecordingCatalogJobSummary* output,std::string* error) {
    Document document;RecordingCatalogJobSummary value;std::string state;
    if(!output||!ingress::ParseStrictJsonObjectDocument(bytes,&document,error)||document.members.size()!=10||
       ingress::StrictJsonStringField(document,"schema")!=kJobSchema||!Text(document,"id",&value.id)||
       !Text(document,"channel",&value.channel)||!Text(document,"reference",&value.reference)||!Text(document,"state",&state)||
       !Number(document,"files",&value.files)||!Number(document,"reservedBytes",&value.reserved_bytes)||
       !Ids(document,"outputIds",&value.output_ids,error)||!Ids(document,"sourceIds",&value.source_ids,error)||
       !Text(document,"latestMutationId",&value.latest_mutation_id))return Fail(error,"job summary fields invalid");
    bool found=false;
    for(auto candidate:{DerivedJobState::Intent,DerivedJobState::Ready,DerivedJobState::Committed,DerivedJobState::Complete,DerivedJobState::Failed})
        if(state==JobState(candidate)){value.state=candidate;found=true;break;}
    std::string canonical;
    if(!found||!SerializeRecordingCatalogJobSummary(value,&canonical,error)||canonical!=bytes)return Fail(error,"job summary noncanonical/state invalid");
    *output=std::move(value);if(error)error->clear();return true;
}

bool SerializeRecordingCatalogSnapshot(const RecordingCatalogSnapshot& value, std::string* output, std::string* error) {
    if (!output || !HeaderValid(value, error)) return Fail(error, "snapshot output/header invalid");
    std::string bytes = HeaderJson(value);
    for (std::size_t i = 0; i < value.rows.size(); ++i) {
        if ((i && !Less(value.rows[i - 1], value.rows[i])) || !RowValid(value.rows[i], error))
            return Fail(error, "snapshot row invalid/duplicate/unsorted");
        const auto row = RowJson(value.rows[i]);
        if (row.size() > kRecordingCatalogSnapshotMaxBytes - bytes.size())
            return Fail(error, "snapshot immutable file exceeds 1GiB");
        bytes += row;
    }
    *output = std::move(bytes);
    if (error) error->clear();
    return true;
}
bool ParseRecordingCatalogSnapshot(const std::string& bytes, std::uint64_t byte_admission,
    RecordingCatalogSnapshot* output, std::string* error) {
    if (!output || bytes.empty() || !byte_admission || bytes.size() > byte_admission ||
        bytes.size() > kRecordingCatalogSnapshotMaxBytes || bytes.back() != '\n')
        return Fail(error, "snapshot bytes/admission/LF invalid");
    RecordingCatalogSnapshot value;
    auto end = bytes.find('\n');
    if (!ParseHeader(bytes.substr(0, end + 1), &value, error)) return Fail(error, "snapshot header noncanonical");
    std::size_t start = end + 1;
    while (start < bytes.size()) {
        end = bytes.find('\n', start);
        if (end == std::string::npos) return Fail(error, "snapshot unterminated row");
        RecordingCatalogSnapshotRow row;
        if (!ParseRow(bytes.substr(start, end - start + 1), &row, error) ||
            (!value.rows.empty() && !Less(value.rows.back(), row)))
            return Fail(error, "snapshot row noncanonical/duplicate/unsorted");
        value.rows.push_back(std::move(row));
        start = end + 1;
    }
    *output = std::move(value);
    if (error) error->clear();
    return true;
}
bool ValidateRecordingCatalogSnapshotManifest(const RecordingCatalogSnapshot& value,
    const RecordingGenerationManifest& manifest, std::string* error) {
    std::string bytes;
    if (!SerializeRecordingCatalogSnapshot(value, &bytes, error) ||
        value.store_id != manifest.store_id || value.generation != manifest.generation ||
        value.cut_ordinal != manifest.cut_ordinal || !FileFields(manifest.snapshot) ||
        manifest.snapshot.name != "snapshot-" + std::to_string(value.generation) + ".jsonl" ||
        manifest.snapshot.size != bytes.size()) return Fail(error, "snapshot/manifest structural binding mismatch");
    if (error) error->clear();
    return true;
}
bool ValidateRecordingCatalogSnapshotAcceptedStates(const RecordingCatalogSnapshot& value,
    const RecordingIdentityChainResult& chain, std::string* error) {
    std::string bytes;
    if (!SerializeRecordingCatalogSnapshot(value, &bytes, error) || !SameFile(value.identity_head, chain.head))
        return Fail(error, "snapshot/verified chain head mismatch");
    if ((chain.physical_rows == 0) != !chain.maximum_global_ordinal.has_value() ||
        (chain.maximum_global_ordinal && *chain.maximum_global_ordinal >= value.cut_ordinal))
        return Fail(error, "snapshot identity physical ordinal/cut mismatch");
    std::map<std::string, const RecordingIdentityFirstAcceptance*> first;
    std::size_t required = 0;
    for (const auto& entry : chain.first_acceptances) {
        if (!first.emplace(entry.mutation_id, &entry).second) return Fail(error, "chain first ID duplicate");
        if (RequiresAcceptedState(entry.first_row.type)) ++required;
    }
    for (const auto& row : value.rows) {
        if (row.kind != "accepted-state") continue;
        Document document;
        std::uint64_t ordinal = 0;
        if (!ingress::ParseStrictJsonObjectDocument(row.value_json, &document, error) || document.members.size() != 3 ||
            !Number(document, "globalOrdinal", &ordinal)) return Fail(error, "accepted-state fields invalid");
        const auto id = ingress::StrictJsonStringField(document, "mutationId");
        const auto type = ingress::StrictJsonStringField(document, "type");
        const auto found = first.find(row.key);
        if (!id || !type || *id != row.key || found == first.end() || ordinal >= value.cut_ordinal)
            return Fail(error, "accepted-state ID/cut mismatch");
        const auto& entry = *found->second;
        if (!RequiresAcceptedState(entry.first_row.type) ||
            entry.mutation_id != entry.first_row.mutation_id || !entry.occurrences ||
            ordinal != entry.first_global_ordinal || ordinal != entry.first_row.global_ordinal ||
            *type != RecordingMutationTypeName(entry.first_row.type) || entry.first_row.type == RecordingMutationType::Unknown)
            return Fail(error, "accepted-state first identity/type/ordinal mismatch");
        --required; // snapshot의 (kind,key) 유일성이 앞에서 확인되어 ID당 한 번만 감소한다.
    }
    if (required != 0) return Fail(error, "snapshot accepted-state first identity missing");
    if (error) error->clear();
    return true;
}
} // namespace recording
