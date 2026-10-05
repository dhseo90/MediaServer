// 파일 용도: VLM 원문을 받는 경계에서 구조·근거·수치·출처를 검증한다.
#include "recording/va_review_record.h"
#include "va_review_json.h"
#include <algorithm>
#include <cmath>
#include <iomanip>
#include <locale>
#include <set>
#include <sstream>

namespace recording {
namespace {
using namespace review_json;
bool Fail(std::string* error){if(error)*error="review-invalid-output";return false;}
bool Claims(const Doc& d,const char* key,std::vector<VaReviewClaim>* out) {
    std::vector<std::string> items;if(!Array(d,key,&items)||items.size()>16)return false;
    for(const auto& item:items) {
        Doc claim;VaReviewClaim value;std::vector<std::string> indices;
        if(!Parse(item,&claim)||claim.members.size()!=2||!Text(claim,"text",&value.text)||
            !Array(claim,"frameIndices",&indices)||indices.size()>8)return false;
        for(const auto& text:indices) {
            Doc index;std::size_t n=0;
            if(!Parse("{\"n\":"+text+"}",&index)||!Number(index,"n",&n))return false;
            value.frame_indices.push_back(n);
        }
        out->push_back(std::move(value));
    }
    return true;
}
std::string Claims(const std::vector<VaReviewClaim>& values) {
    std::string json="[";bool first=true;
    for(const auto& v:values) {
        if(!first)json+=',';first=false;
        json+="{\"text\":"+EvidenceJsonQuote(v.text)+",\"frameIndices\":[";
        for(std::size_t i=0;i<v.frame_indices.size();++i){if(i)json+=',';json+=std::to_string(v.frame_indices[i]);}
        json+="]}";
    }
    return json+"]";
}
bool Token(const std::string& s) {
    return !s.empty()&&s.size()<=128&&std::all_of(s.begin(),s.end(),[](unsigned char c){
        return (c>='a'&&c<='z')||(c>='A'&&c<='Z')||(c>='0'&&c<='9')||c=='-'||c=='_'||c=='.'||c==':'||c=='/';});
}
}
bool ValidateVaReviewOutput(const VaReviewOutput& v,std::size_t frames,std::string* error) {
    if(!frames||frames>8 || (v.confidence&&(!std::isfinite(*v.confidence)||*v.confidence<0||*v.confidence>1)) ||
        (v.supports.empty()&&v.contradictions.empty()&&v.confidence) ||
        (v.supports.empty()&&v.questions.empty()&&v.contradictions.empty()&&v.unclear.empty()))return Fail(error);
    for(const auto* values:{&v.supports,&v.questions,&v.contradictions,&v.unclear}) {
        if(values->size()>16)return Fail(error);
        for(const auto& claim:*values) {
            if(!VaReviewText(claim.text)||claim.frame_indices.size()>frames ||
               ((values==&v.supports||values==&v.contradictions)&&claim.frame_indices.empty()))return Fail(error);
            std::set<std::size_t> indices;
            for(const auto i:claim.frame_indices)if(i>=frames||!indices.insert(i).second)return Fail(error);
        }
    }
    if(error)error->clear();return true;
}
bool ParseVaReviewOutput(const std::string& json,std::size_t frames,VaReviewOutput* output,std::string* error) {
    Doc d;VaReviewOutput v;
    if(!output||json.size()>40*1024||!Parse(json,&d)||d.members.size()!=6||
       ingress::StrictJsonStringField(d,"schema")!="media-server.va-review-output.v1"||
       !Claims(d,"supports",&v.supports)||!Claims(d,"questions",&v.questions)||
       !Claims(d,"contradictions",&v.contradictions)||!Claims(d,"unclear",&v.unclear))return Fail(error);
    const auto* confidence=d.Find("confidence");if(!confidence)return Fail(error);
    if(confidence->type!=Type::Null) {
        if(confidence->type!=Type::Number)return Fail(error);
        std::istringstream stream(confidence->raw);stream.imbue(std::locale::classic());double value=0;
        if(!(stream>>value)||!stream.eof())return Fail(error);v.confidence=value;
    }
    if(!ValidateVaReviewOutput(v,frames,error))return false;
    *output=std::move(v);if(error)error->clear();return true;
}
std::string SerializeVaReviewOutput(const VaReviewOutput& v) {
    std::ostringstream confidence;confidence.imbue(std::locale::classic());
    if(v.confidence)confidence<<std::setprecision(17)<<*v.confidence;else confidence<<"null";
    return "{\"schema\":\"media-server.va-review-output.v1\",\"supports\":"+Claims(v.supports)+
        ",\"questions\":"+Claims(v.questions)+",\"contradictions\":"+Claims(v.contradictions)+
        ",\"unclear\":"+Claims(v.unclear)+",\"confidence\":"+confidence.str()+"}";
}
bool ValidateVaReviewRecord(const VaReviewRecord& v,std::string* error) {
    VaReviewInput input;
    if(!ParseVaReviewInput(SerializeVaReviewInput(v.input),&input,error)||
        !ValidateVaReviewOutput(v.output,input.manifest.frames.size(),error))return false;
    if(!Token(v.revision_id)||!Token(v.model)||!Token(v.model_revision)||!EvidenceIsSha256(v.prompt_sha256)||
       v.created_at_ms<=0||v.latency_ms<0||v.latency_ms>60000||
       v.provider!="ollama"||
       v.adapter_version!="ollama-chat-v1"||
       !EvidenceIsSha256(v.model_revision))return Fail(error);
    if(error)error->clear();return true;
}
std::string SerializeVaReviewRecord(const VaReviewRecord& v) {
    const auto q=EvidenceJsonQuote;
    return "{\"schema\":\"media-server.va-review-record.v1\",\"input\":"+SerializeVaReviewInput(v.input)+
        ",\"output\":"+SerializeVaReviewOutput(v.output)+",\"revisionId\":"+q(v.revision_id)+
        ",\"provider\":"+q(v.provider)+",\"model\":"+q(v.model)+",\"modelRevision\":"+q(v.model_revision)+
        ",\"promptSha256\":"+q(v.prompt_sha256)+",\"adapterVersion\":"+q(v.adapter_version)+
        ",\"createdAtMs\":"+std::to_string(v.created_at_ms)+",\"latencyMs\":"+std::to_string(v.latency_ms)+"}";
}
bool ParseVaReviewRecord(const std::string& json,VaReviewRecord* output,std::string* error) {
    Doc d;VaReviewRecord v;
    if(!output||json.size()>128*1024||!Parse(json,&d)||d.members.size()!=11||
       ingress::StrictJsonStringField(d,"schema")!="media-server.va-review-record.v1")return Fail(error);
    const auto input=ingress::StrictJsonObjectField(d,"input"),result=ingress::StrictJsonObjectField(d,"output");
    if(!input||!result||!ParseVaReviewInput(*input,&v.input,error)||
       !ParseVaReviewOutput(*result,v.input.manifest.frames.size(),&v.output,error)||
       !Text(d,"revisionId",&v.revision_id)||!Text(d,"provider",&v.provider)||!Text(d,"model",&v.model)||
       !Text(d,"modelRevision",&v.model_revision)||!Text(d,"promptSha256",&v.prompt_sha256)||
       !Text(d,"adapterVersion",&v.adapter_version)||!Number(d,"createdAtMs",&v.created_at_ms)||
       !Number(d,"latencyMs",&v.latency_ms)||!ValidateVaReviewRecord(v,error))return Fail(error);
    *output=std::move(v);if(error)error->clear();return true;
}
} // namespace recording
