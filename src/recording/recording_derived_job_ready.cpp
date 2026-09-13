// 파일 용도: job 소유 receipt·실제 출처·Ready/종료의 단일 엄격 내구 shape.
#include "recording/recording_derived_job.h"
#include "recording/recording_derived_remux.h"
#include "domain/strict_json.h"
#include <algorithm>
#include <array>
#include <charconv>
#include <filesystem>
#include <iomanip>
#include <limits>
#include <map>
#include <set>
#include <sstream>
#include <stdexcept>
#include <tuple>
#ifndef MEDIA_SERVER_USE_OPENSSL
#define MEDIA_SERVER_USE_OPENSSL 0
#endif
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#endif

namespace recording {
namespace {
constexpr std::size_t kCap=4*1024*1024;
constexpr const char* kEmptySha="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
using Doc=ingress::StrictJsonObjectDocument;
using Type=ingress::StrictJsonType;
void Need(bool ok,const char* reason) {if(!ok)throw std::runtime_error(reason);}
std::string Q(const std::string& s) {
    std::ostringstream out;out<<'"';
    for(unsigned char c:s) {
        if(c=='"'||c=='\\')out<<'\\'<<c;
        else if(c<32)out<<"\\u"<<std::hex<<std::setw(4)<<std::setfill('0')<<static_cast<int>(c)<<std::dec;
        else out<<c;
    }
    out<<'"';return out.str();
}
std::string J(std::initializer_list<std::pair<const char*,std::string>> fields) {
    std::string s="{";
    for(const auto& f:fields){if(s.size()>1)s+=",";s+=Q(f.first)+":"+f.second;Need(s.size()<=kCap,"job-json-cap");}
    return s+"}";
}
std::string A(const std::vector<std::string>& items) {
    std::string s="[";for(const auto& item:items){if(s.size()>1)s+=",";s+=item;Need(s.size()<=kCap,"job-json-cap");}return s+"]";
}
Doc O(const std::string& s,std::initializer_list<const char*> keys) {
    Doc d;Need(s.size()<=kCap&&ingress::ParseStrictJsonObjectDocument(s,&d,nullptr)&&d.members.size()==keys.size(),"job-json-fields");
    for(auto key:keys)Need(d.Find(key),"job-json-field-missing");return d;
}
const ingress::StrictJsonMember& F(const Doc& d,const char* key,Type type) {
    const auto* f=d.Find(key);Need(f&&f->type==type,"job-json-type");return *f;
}
std::string S(const Doc& d,const char* k){return F(d,k,Type::String).string_value;}
std::string Raw(const Doc& d,const char* k){return F(d,k,Type::Object).raw;}
bool B(const Doc& d,const char* k){return F(d,k,Type::Bool).bool_value;}
std::string Bool(bool v){return v?"true":"false";}
template<class T=std::int64_t>T N(const Doc& d,const char* k) {
    const auto& raw=F(d,k,Type::Number).raw;T value{};auto r=std::from_chars(raw.data(),raw.data()+raw.size(),value);
    Need(r.ec==std::errc{}&&r.ptr==raw.data()+raw.size(),"job-integer");return value;
}
std::optional<std::int64_t> ON(const Doc& d,const char* key) {
    const auto* f=d.Find(key);Need(f,"job-nullable-field");return f->type==Type::Null?std::nullopt:std::optional<std::int64_t>(N(d,key));
}
std::string Num(std::optional<std::int64_t> value){return value?std::to_string(*value):"null";}
std::vector<std::string> Rows(const Doc& d,const char* key,std::size_t cap) {
    const auto& raw=F(d,key,Type::Array).raw;std::vector<std::string> result;std::size_t start=1;int depth=0;bool quoted=false,escape=false;
    for(std::size_t i=1;i+1<raw.size();++i) {
        const char c=raw[i];
        if(quoted){if(escape)escape=false;else if(c=='\\')escape=true;else if(c=='"')quoted=false;continue;}
        if(c=='"')quoted=true;else if(c=='{'||c=='[')++depth;else if(c=='}'||c==']')--depth;
        else if(c==','&&!depth){result.push_back(raw.substr(start,i-start));start=i+1;Need(result.size()<=cap,"job-array-cap");}
    }
    const auto tail=raw.substr(start,raw.size()-start-1);if(tail.find_first_not_of(" \r\n\t")!=std::string::npos)result.push_back(tail);
    Need(result.size()<=cap,"job-array-cap");return result;
}
bool Sha(const std::string& s) {return s.size()==64&&std::all_of(s.begin(),s.end(),[](char c){return (c>='0'&&c<='9')||(c>='a'&&c<='f');});}
std::string Hash(const std::string& s) {
#if MEDIA_SERVER_USE_OPENSSL
    std::array<unsigned char,EVP_MAX_MD_SIZE> digest{};unsigned int size=0;
    Need(EVP_Digest(s.data(),s.size(),digest.data(),&size,EVP_sha256(),nullptr)==1&&size==32,"job-sha256");
    std::ostringstream out;out<<std::hex<<std::setfill('0');for(unsigned int i=0;i<size;++i)out<<std::setw(2)<<static_cast<int>(digest[i]);return out.str();
#else
    (void)s;throw std::runtime_error("job-crypto-unavailable");
#endif
}
std::string Hashes(const std::vector<std::string>& hashes) {
    Need(!hashes.empty()&&hashes.size()<=4096,"job-decoded-cap");std::vector<std::string> values;
    for(const auto& h:hashes){Need(Sha(h),"job-decoded-hash");values.push_back(Q(h));}return A(values);
}
std::vector<std::string> Hashes(const Doc& d,const char* key) {
    std::vector<std::string> result;for(const auto& raw:Rows(d,key,4096))result.push_back(S(O("{\"v\":"+raw+"}",{"v"}),"v"));return result;
}
std::string Au(const DerivedRemuxAu& a) {
    Need(a.ordinal>0&&a.original_pts_ns>=0&&a.file_pts_ns>=0&&a.output_pts_ns>=0&&a.file_duration_ns>0&&a.output_duration_ns>0&&Sha(a.source_vcl_sha256)&&a.source_vcl_sha256==a.output_vcl_sha256,"job-au-evidence");
    Need(a.output_pts_90k.has_value()==a.output_pts_residual_numerator.has_value(),"job-au-tick-nullability");
    if(a.output_pts_90k)Need(static_cast<__int128>(*a.output_pts_90k)*1000000000-static_cast<__int128>(a.output_pts_ns)*90000==*a.output_pts_residual_numerator,"job-au-tick-residual");
    return J({{"ordinal",std::to_string(a.ordinal)},{"original_pts_ns",std::to_string(a.original_pts_ns)},
        {"file_pts_ns",std::to_string(a.file_pts_ns)},{"file_dts_ns",Num(a.file_dts_ns)},{"file_duration_ns",std::to_string(a.file_duration_ns)},
        {"file_stream_time_ns",std::to_string(a.file_stream_time_ns)},{"output_pts_ns",std::to_string(a.output_pts_ns)},
        {"output_dts_ns",Num(a.output_dts_ns)},{"output_duration_ns",std::to_string(a.output_duration_ns)},
        {"source_vcl_sha256",Q(a.source_vcl_sha256)},{"output_vcl_sha256",Q(a.output_vcl_sha256)},
        {"output_pts_90k",Num(a.output_pts_90k)},{"output_pts_residual_numerator",Num(a.output_pts_residual_numerator)}});
}
DerivedRemuxAu Au(const std::string& json) {
    const auto d=O(json,{"ordinal","original_pts_ns","file_pts_ns","file_dts_ns","file_duration_ns","file_stream_time_ns","output_pts_ns","output_dts_ns","output_duration_ns","source_vcl_sha256","output_vcl_sha256","output_pts_90k","output_pts_residual_numerator"});
    DerivedRemuxAu a;a.ordinal=N<std::uint64_t>(d,"ordinal");a.original_pts_ns=N(d,"original_pts_ns");a.file_pts_ns=N(d,"file_pts_ns");a.file_dts_ns=ON(d,"file_dts_ns");
    a.file_duration_ns=N(d,"file_duration_ns");a.file_stream_time_ns=N(d,"file_stream_time_ns");a.output_pts_ns=N(d,"output_pts_ns");a.output_dts_ns=ON(d,"output_dts_ns");a.output_duration_ns=N(d,"output_duration_ns");
    a.source_vcl_sha256=S(d,"source_vcl_sha256");a.output_vcl_sha256=S(d,"output_vcl_sha256");a.output_pts_90k=ON(d,"output_pts_90k");a.output_pts_residual_numerator=ON(d,"output_pts_residual_numerator");Need(Au(a)==json,"job-au-canonical");return a;
}
std::string Provenance(const DerivedRemuxOutput& p) {
    Need(p.verified_output&&p.output_modified&&p.caller_cleanup_required&&p.error.empty()&&p.size_bytes>0&&Sha(p.checksum_sha256)&&Sha(p.codec_sha256),"job-output-unverified");
    Need(p.audio_omitted_reason=="derived-profile-video-only"&&p.actual_range_basis=="file-duration-on-source-pts-axis"&&p.original_association_quality=="complete-file-pts-to-binding-timestamp-match"&&p.output_payload_quality=="source-file-vcl-and-visible-decoded-pixels","job-output-quality");
    Need(!p.access_units.empty()&&p.access_units.size()<=4096&&p.source_decoded_sha256==p.output_decoded_sha256,"job-output-evidence-cap");
    std::vector<std::string> aus;for(const auto& a:p.access_units)aus.push_back(Au(a));
    return J({{"segment_id",Q(p.segment_id)},{"store_id",Q(p.store_id)},{"source_id",Q(p.source_id)},{"media_epoch_id",Q(p.media_epoch_id)},
        {"verified_output",Bool(p.verified_output)},{"request_fully_satisfied",Bool(p.request_fully_satisfied)},
        {"output_modified",Bool(p.output_modified)},{"caller_cleanup_required",Bool(p.caller_cleanup_required)},
        {"size_bytes",std::to_string(p.size_bytes)},{"checksum_sha256",Q(p.checksum_sha256)},{"codec_sha256",Q(p.codec_sha256)},{"error",Q(p.error)},
        {"audio_omitted_reason",Q(p.audio_omitted_reason)},{"actual_range_basis",Q(p.actual_range_basis)},
        {"original_association_quality",Q(p.original_association_quality)},{"output_payload_quality",Q(p.output_payload_quality)},
        {"source_origin_ns",std::to_string(p.source_origin_ns)},{"seek_stream_time_ns",std::to_string(p.seek_stream_time_ns)},
        {"actual_original_start_ns",std::to_string(p.actual_original_start_ns)},{"actual_original_end_ns",std::to_string(p.actual_original_end_ns)},
        {"requested_media_start_ns",std::to_string(p.requested_media_start_ns)},{"requested_media_end_ns",std::to_string(p.requested_media_end_ns)},
        {"access_units",A(aus)},{"source_decoded_sha256",Hashes(p.source_decoded_sha256)},{"output_decoded_sha256",Hashes(p.output_decoded_sha256)}});
}
DerivedRemuxOutput Provenance(const std::string& json) {
    const auto d=O(json,{"segment_id","store_id","source_id","media_epoch_id","verified_output","request_fully_satisfied","output_modified","caller_cleanup_required","size_bytes","checksum_sha256","codec_sha256","error","audio_omitted_reason","actual_range_basis","original_association_quality","output_payload_quality","source_origin_ns","seek_stream_time_ns","actual_original_start_ns","actual_original_end_ns","requested_media_start_ns","requested_media_end_ns","access_units","source_decoded_sha256","output_decoded_sha256"});
    DerivedRemuxOutput p;
    p.segment_id=S(d,"segment_id");p.store_id=S(d,"store_id");p.source_id=S(d,"source_id");p.media_epoch_id=S(d,"media_epoch_id");
    p.verified_output=B(d,"verified_output");p.request_fully_satisfied=B(d,"request_fully_satisfied");p.output_modified=B(d,"output_modified");p.caller_cleanup_required=B(d,"caller_cleanup_required");p.size_bytes=N<std::uint64_t>(d,"size_bytes");
    p.checksum_sha256=S(d,"checksum_sha256");p.codec_sha256=S(d,"codec_sha256");p.error=S(d,"error");p.audio_omitted_reason=S(d,"audio_omitted_reason");p.actual_range_basis=S(d,"actual_range_basis");p.original_association_quality=S(d,"original_association_quality");p.output_payload_quality=S(d,"output_payload_quality");
    p.source_origin_ns=N(d,"source_origin_ns");p.seek_stream_time_ns=N(d,"seek_stream_time_ns");p.actual_original_start_ns=N(d,"actual_original_start_ns");p.actual_original_end_ns=N(d,"actual_original_end_ns");p.requested_media_start_ns=N(d,"requested_media_start_ns");p.requested_media_end_ns=N(d,"requested_media_end_ns");
    for(const auto& raw:Rows(d,"access_units",4096))p.access_units.push_back(Au(raw));
    p.source_decoded_sha256=Hashes(d,"source_decoded_sha256");p.output_decoded_sha256=Hashes(d,"output_decoded_sha256");Need(Provenance(p)==json,"job-provenance-canonical");return p;
}
std::string File(const DerivedJobFileV1& f) {
    Need(f.output_index<8&&f.inode>0&&f.initial_size==0&&f.initial_sha256==kEmptySha&&!f.directories.empty()&&f.directories.size()<=32,"job-file-receipt");
    std::vector<std::string> dirs;std::string previous;
    for(std::size_t i=0;i<f.directories.size();++i) {
        const auto& d=f.directories[i];Need(d.inode>0&&((i==0&&d.relative_path.empty())||(i>0&&d.relative_path>previous)),"job-directory-order");previous=d.relative_path;
        dirs.push_back(J({{"path",Q(d.relative_path)},{"device",std::to_string(d.device)},{"inode",std::to_string(d.inode)}}));
    }
    return J({{"output_index",std::to_string(f.output_index)},{"device",std::to_string(f.device)},{"inode",std::to_string(f.inode)},
        {"directories",A(dirs)},{"initial_size",std::to_string(f.initial_size)},{"initial_sha256",Q(f.initial_sha256)}});
}
DerivedJobFileV1 File(const std::string& json) {
    const auto d=O(json,{"output_index","device","inode","directories","initial_size","initial_sha256"});DerivedJobFileV1 f;
    f.output_index=N<std::uint32_t>(d,"output_index");f.device=N<std::uint64_t>(d,"device");f.inode=N<std::uint64_t>(d,"inode");f.initial_size=N<std::uint64_t>(d,"initial_size");f.initial_sha256=S(d,"initial_sha256");
    for(const auto& raw:Rows(d,"directories",32)){const auto dir=O(raw,{"path","device","inode"});f.directories.push_back({S(dir,"path"),N<std::uint64_t>(dir,"device"),N<std::uint64_t>(dir,"inode")});}
    Need(File(f)==json,"job-receipt-canonical");return f;
}
std::string Ready(const DerivedJobReadyV1& ready) {
    Need(ready.verified_output&&ready.ready_at_ms>0&&!ready.outputs.empty()&&ready.outputs.size()<=8&&ready.unfulfilled.size()<=4096,"job-ready-shape");
    std::vector<std::string> outputs,unfulfilled;
    for(const auto& o:ready.outputs){const auto segment=SerializeRecordingSegmentV2(o.segment);Need(!segment.empty(),"job-output-segment");outputs.push_back(J({{"source_index",std::to_string(o.source_index)},{"segment",segment},{"provenance",Provenance(o.provenance)}}));}
    for(const auto& u:ready.unfulfilled){Need(u.start<u.end&&u.reason.size()<=1024&&(u.axis=="original-pts-ns"||u.axis=="request-ns"),"job-unfulfilled");unfulfilled.push_back(J({{"segment_id",Q(u.segment_id)},{"axis",Q(u.axis)},{"reason",Q(u.reason)},{"start",std::to_string(u.start)},{"end",std::to_string(u.end)}}));}
    return J({{"outputs",A(outputs)},{"unfulfilled",A(unfulfilled)},{"verified_output",Bool(ready.verified_output)},
        {"request_fully_satisfied",Bool(ready.request_fully_satisfied)},{"ready_at_ms",std::to_string(ready.ready_at_ms)}, {"manifest_sha256",Q(ready.manifest_sha256)}});
}
DerivedJobReadyV1 Ready(const std::string& json) {
    const auto d=O(json,{"outputs","unfulfilled","verified_output","request_fully_satisfied","ready_at_ms","manifest_sha256"});DerivedJobReadyV1 ready;
    ready.verified_output=B(d,"verified_output");ready.request_fully_satisfied=B(d,"request_fully_satisfied");ready.ready_at_ms=N(d,"ready_at_ms");ready.manifest_sha256=S(d,"manifest_sha256");
    for(const auto& raw:Rows(d,"outputs",8)){const auto o=O(raw,{"source_index","segment","provenance"});DerivedJobReadyOutputV1 value;value.source_index=N<std::uint32_t>(o,"source_index");Need(ParseRecordingSegmentV2(Raw(o,"segment"),&value.segment,nullptr),"job-output-segment-parse");value.provenance=Provenance(Raw(o,"provenance"));ready.outputs.push_back(std::move(value));}
    for(const auto& raw:Rows(d,"unfulfilled",4096)){const auto u=O(raw,{"segment_id","axis","reason","start","end"});ready.unfulfilled.push_back({S(u,"segment_id"),S(u,"axis"),S(u,"reason"),N(u,"start"),N(u,"end")});}
    Need(Ready(ready)==json,"job-ready-canonical");return ready;
}
std::string Files(const DerivedJobRecordV1& record){std::vector<std::string> files;for(const auto& f:record.files)files.push_back(File(f));return A(files);}
std::string Manifest(const DerivedJobRecordV1& record) {
    auto ready=*record.ready;ready.manifest_sha256.clear();return Hash(SerializeDerivedJobIntent(record.intent)+Files(record)+Ready(ready));
}
std::string State(DerivedJobState state) {
    switch(state){case DerivedJobState::Intent:return "intent";case DerivedJobState::Ready:return "ready";case DerivedJobState::Committed:return "committed";case DerivedJobState::Complete:return "complete";case DerivedJobState::Failed:return "failed";}throw std::runtime_error("job-state");
}
DerivedJobState State(const std::string& s){for(auto state:{DerivedJobState::Intent,DerivedJobState::Ready,DerivedJobState::Committed,DerivedJobState::Complete,DerivedJobState::Failed})if(State(state)==s)return state;throw std::runtime_error("job-state");}
std::int64_t End(std::int64_t start,std::int64_t duration) {
    const auto end=static_cast<__int128>(start)+duration;Need(duration>0&&end<=std::numeric_limits<std::int64_t>::max(),"job-duration-overflow");return static_cast<std::int64_t>(end);
}
std::int64_t MediaNs(std::int64_t pts,const RecordingSegmentV2& segment) {
    const auto value=static_cast<__int128>(pts)*segment.time_base_num*1000000000/segment.time_base_den;
    Need(value>=0&&value<=std::numeric_limits<std::int64_t>::max(),"job-media-time-overflow");
    return static_cast<std::int64_t>(value);
}
using MissingKey=std::tuple<std::string,std::string,std::string,std::int64_t,std::int64_t>;
MissingKey Missing(const DerivedRemuxUnfulfilled& value) {
    return {value.segment_id,value.axis,value.reason,value.start,value.end};
}
void Validate(const DerivedJobRecordV1& record) {
    Need(ValidateDerivedJobIntent(record.intent,nullptr)&&record.files.size()<=record.intent.outputs.size(),"job-record-intent");
    std::set<std::pair<std::uint64_t,std::uint64_t>> file_identities;
    for(std::size_t i=0;i<record.files.size();++i) {
        const auto& f=record.files[i];Need(f.output_index==i,"job-receipt-prefix");File(f);
        Need(file_identities.emplace(f.device,f.inode).second,"job-receipt-file-alias");
        std::set<std::string> expected{""};
        for(const auto& path:{record.intent.outputs[i].temporary_relpath,record.intent.outputs[i].final_relpath}) {
            auto parent=std::filesystem::path(path).parent_path();while(!parent.empty()){expected.insert(parent.generic_string());parent=parent.parent_path();}
        }
        std::set<std::string> actual;for(const auto& d:f.directories)actual.insert(d.relative_path);Need(actual==expected,"job-receipt-parent-binding");
        if(i>0)for(const auto& d:f.directories){const auto& old=record.files[0].directories;const auto found=std::find_if(old.begin(),old.end(),[&](const auto& x){return x.relative_path==d.relative_path;});Need(found!=old.end()&&found->device==d.device&&found->inode==d.inode,"job-receipt-directory-conflict");}
    }
    const bool terminal=record.state==DerivedJobState::Complete||record.state==DerivedJobState::Failed;
    Need(terminal?record.cleaned_at_ms>0:record.cleaned_at_ms==0,"job-cleanup-state");
    Need(record.state==DerivedJobState::Failed?(!record.failure_reason.empty()&&record.failure_reason.size()<=1024):record.failure_reason.empty(),"job-failure-state");
    if(record.state==DerivedJobState::Intent||record.state==DerivedJobState::Failed){Need(!record.ready,"job-premature-ready");return;}
    Need(record.ready&&record.files.size()==record.intent.outputs.size()&&record.ready->outputs.size()==record.intent.outputs.size(),"job-ready-source-closure");
    const auto& ready=*record.ready;Ready(ready);Need(Sha(ready.manifest_sha256)&&Manifest(record)==ready.manifest_sha256,"job-ready-manifest");
    std::uint64_t total=0;std::int64_t previous_order=0;
    DerivedRecordingSelection selection;Need(RestoreDerivedJobSelection(record.intent,&selection,nullptr),"job-ready-selection");
    std::multiset<MissingKey> expected_missing,actual_missing;
    for(const auto& slice:selection.slices)if(slice.state!=DerivedSliceState::Confirmed)
        expected_missing.emplace("","request-ns",slice.reason,slice.start_ns,slice.end_ns);
    for(const auto& value:ready.unfulfilled)actual_missing.insert(Missing(value));
    bool fully=selection.complete&&ready.unfulfilled.empty();
    for(std::size_t i=0;i<ready.outputs.size();++i) {
        const auto& output=ready.outputs[i];const auto& s=output.segment;const auto& p=output.provenance;const auto& source=record.intent.sources[i];const auto& plan=record.intent.outputs[i];
        Need(output.source_index==i&&s.segment_id==plan.output_id&&s.order_request_id==plan.order_request_id&&s.order_sequence>previous_order&&s.store_id==source.segment.store_id&&s.source_id==source.segment.source_id&&s.channel_id==source.segment.channel_id,"job-output-identity");previous_order=s.order_sequence;
        Need(s.media_epoch_id==plan.output_id+"-epoch"&&s.media_epoch_id!=source.segment.media_epoch_id&&s.time_base_num==1&&s.time_base_den==1000000000&&s.retention_class==RecordingRetentionClass::Event&&s.container=="mpegts"&&s.video_codecs==std::vector<std::string>{"h264"}&&s.audio_codecs.empty()&&!s.pinned&&s.audio_omitted_reason==p.audio_omitted_reason&&s.size_bytes==p.size_bytes&&s.checksum_sha256==p.checksum_sha256,"job-output-independent-media");
        Need(p.segment_id==source.segment.segment_id&&p.store_id==source.segment.store_id&&p.source_id==source.segment.source_id&&p.media_epoch_id==source.segment.media_epoch_id,"job-provenance-source");
        std::vector<std::pair<std::int64_t,std::int64_t>> requested,actual;
        for(const auto& slice:selection.slices)if(slice.state==DerivedSliceState::Confirmed){
            const auto& candidate=slice.candidates.front();
            if(candidate.segment.segment_id==source.segment.segment_id)
                requested.emplace_back(MediaNs(candidate.media_start_pts,candidate.segment),MediaNs(candidate.media_end_pts,candidate.segment));
        }
        std::sort(requested.begin(),requested.end());
        Need(!requested.empty()&&p.requested_media_start_ns==requested.front().first&&p.requested_media_end_ns==requested.back().second,"job-provenance-request-range");
        Need(p.source_origin_ns==MediaNs(source.segment.media_start_pts,source.segment),"job-source-origin");
        std::int64_t start=std::numeric_limits<std::int64_t>::max(),end=0,original_start=start,original_end=0;std::set<std::uint64_t> ordinals;
        for(const auto& au:p.access_units) {
            const auto sample=std::find_if(source.binding.samples.begin(),source.binding.samples.end(),[&](const auto& x){return x.ordinal==au.ordinal&&x.pts_ns==static_cast<std::uint64_t>(au.original_pts_ns);});
            Need(sample!=source.binding.samples.end()&&ordinals.insert(au.ordinal).second&&static_cast<__int128>(au.file_pts_ns)+p.source_origin_ns==au.original_pts_ns,"job-au-original-binding");
            start=std::min(start,au.output_pts_ns);end=std::max(end,End(au.output_pts_ns,au.output_duration_ns));original_start=std::min(original_start,au.original_pts_ns);original_end=std::max(original_end,End(au.original_pts_ns,au.file_duration_ns));
            actual.emplace_back(au.original_pts_ns,End(au.original_pts_ns,au.file_duration_ns));
        }
        std::sort(actual.begin(),actual.end());
        bool source_fully=true;
        for(const auto& range:requested){
            auto cursor=range.first;
            for(const auto& interval:actual){
                if(interval.second<=cursor||interval.first>=range.second)continue;
                if(interval.first>cursor){
                    expected_missing.emplace(p.segment_id,"original-pts-ns","file-duration-uncovered",cursor,std::min(interval.first,range.second));
                    source_fully=false;
                }
                cursor=std::max(cursor,std::min(interval.second,range.second));
            }
            if(cursor<range.second){
                expected_missing.emplace(p.segment_id,"original-pts-ns","file-duration-uncovered",cursor,range.second);
                source_fully=false;
            }
        }
        Need(p.request_fully_satisfied==source_fully,"job-output-coverage-claim");
        Need(s.media_start_pts==start&&s.media_end_pts==end&&p.actual_original_start_ns==original_start&&p.actual_original_end_ns==original_end,"job-output-actual-range");
        Need(s.mappings.size()==1&&s.mappings[0].mapping_id==plan.output_id+"-utc-unavailable"&&s.mappings[0].start_pts==start&&s.mappings[0].end_pts==end&&s.mappings[0].provenance=="unknown"&&!s.mappings[0].utc_start_ns&&!s.mappings[0].utc_end_ns&&!s.mappings[0].uncertainty_ns&&s.mappings[0].reason=="derived-output-utc-unavailable","job-output-no-guessed-utc");
        Need(p.size_bytes<=record.intent.reserved_bytes-total,"job-ready-byte-cap");total+=p.size_bytes;fully=fully&&p.request_fully_satisfied;
    }
    Need(ready.request_fully_satisfied==fully,"job-ready-fully-satisfied");
    Need(expected_missing==actual_missing,"job-unfulfilled-selection-binding");
}
std::string Record(const DerivedJobRecordV1& record) {
    Validate(record);const auto json=J({{"schema",Q("media-server.derived-job-record.v1")},{"intent",SerializeDerivedJobIntent(record.intent)},
        {"state",Q(State(record.state))},{"reason",Q(record.failure_reason)},{"cleaned_at_ms",std::to_string(record.cleaned_at_ms)},
        {"files",Files(record)},{"ready",record.ready?Ready(*record.ready):"null"}});
    Need(json.size()<=kCap,"job-record-envelope-cap");return json;
}
} // namespace

std::string SerializeDerivedJobFile(const DerivedJobFileV1& f){try{return File(f);}catch(...){return {};}}
std::string SerializeDerivedJobReady(const DerivedJobReadyV1& r){try{return Ready(r);}catch(...){return {};}}
std::string SerializeDerivedJobRecord(const DerivedJobRecordV1& record){try{return Record(record);}catch(...){return {};}}
bool ParseDerivedJobRecord(const std::string& json,DerivedJobRecordV1* out,std::string* error) {
    if(out)*out={};
    try {
        Need(out,"job-record-output");const auto d=O(json,{"schema","intent","state","reason","cleaned_at_ms","files","ready"});
        Need(S(d,"schema")=="media-server.derived-job-record.v1","job-record-schema");DerivedJobRecordV1 record;
        Need(ParseDerivedJobIntent(Raw(d,"intent"),&record.intent,error),"job-record-intent");record.state=State(S(d,"state"));record.failure_reason=S(d,"reason");record.cleaned_at_ms=N(d,"cleaned_at_ms");
        for(const auto& raw:Rows(d,"files",8))record.files.push_back(File(raw));
        if(d.Find("ready")->type!=Type::Null)record.ready=Ready(Raw(d,"ready"));
        Need(Record(record)==json,"job-record-canonical");*out=std::move(record);if(error)error->clear();return true;
    }catch(const std::exception& e){if(error)*error=e.what();return false;}
}
bool BuildDerivedJobReady(const DerivedJobRecordV1& input,const DerivedRemuxResult& remux,
    const std::vector<std::int64_t>& orders,std::int64_t now,DerivedJobRecordV1* out,std::string* error) {
    if(out)*out={};
    try {
        Need(out&&input.state==DerivedJobState::Intent&&remux.verified_output&&remux.error.empty()&&orders.size()==input.intent.outputs.size()&&remux.outputs.size()==orders.size(),"job-ready-input");
        Need(MatchesDerivedJobSelection(input.intent,remux.selection,nullptr),"job-ready-selection-conflict");
        DerivedJobRecordV1 record=input;record.state=DerivedJobState::Ready;DerivedJobReadyV1 ready;
        ready.verified_output=remux.verified_output;ready.request_fully_satisfied=remux.request_fully_satisfied;ready.unfulfilled=remux.unfulfilled;ready.ready_at_ms=now;
        for(std::size_t i=0;i<orders.size();++i) {
            DerivedJobReadyOutputV1 output;output.source_index=i;output.provenance=remux.outputs[i];const auto& p=output.provenance;const auto& source=input.intent.sources[i].segment;const auto& plan=input.intent.outputs[i];auto& s=output.segment;
            s.segment_id=plan.output_id;s.order_request_id=plan.order_request_id;s.order_sequence=orders[i];s.source_id=source.source_id;s.channel_id=source.channel_id;s.store_id=source.store_id;s.media_epoch_id=plan.output_id+"-epoch";
            s.media_start_pts=std::numeric_limits<std::int64_t>::max();std::int64_t end=0;
            for(const auto& au:p.access_units){s.media_start_pts=std::min(s.media_start_pts,au.output_pts_ns);end=std::max(end,End(au.output_pts_ns,au.output_duration_ns));}s.media_end_pts=end;
            s.container="mpegts";s.video_codecs={"h264"};s.audio_omitted_reason=p.audio_omitted_reason;s.size_bytes=p.size_bytes;s.checksum_sha256=p.checksum_sha256;s.retention_class=RecordingRetentionClass::Event;s.created_at_ms=now;s.finalized_at_ms=now;
            s.mappings={{"media-server.recording-utc-mapping.v1",plan.output_id+"-utc-unavailable",s.media_start_pts,s.media_end_pts,"unknown",std::nullopt,std::nullopt,std::nullopt,"derived-output-utc-unavailable"}};
            ready.outputs.push_back(std::move(output));
        }
        record.ready=std::move(ready);record.ready->manifest_sha256=Manifest(record);Validate(record);Need(!Record(record).empty(),"job-ready-cap");*out=std::move(record);if(error)error->clear();return true;
    }catch(const std::exception& e){if(error)*error=e.what();return false;}
}
} // namespace recording
