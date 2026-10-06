// 파일 용도: 과거 v1/v2 원문을 바꾸지 않는 명시 확인 envelope. 인증 비밀은 저장하지 않는다.
#include "recording/va_review_confirmed_record.h"
#include "va_review_json.h"
namespace recording {
namespace {
bool Fail(std::string* e){if(e)*e="review-invalid-confirmation";return false;}
std::string Confirmation(const ReviewConfirmationV3& c){const auto q=EvidenceJsonQuote;
    return "{\"principal\":"+q(c.principal)+",\"question\":"+q(c.question)+",\"revision\":"+q(c.revision)+
        ",\"specSha256\":"+q(c.spec_sha256)+",\"confirmedAtMs\":"+std::to_string(c.confirmed_at_ms)+
        ",\"expiresAtMs\":"+std::to_string(c.expires_at_ms)+"}";}
}
std::int64_t ReviewWallTimeMs(){return std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();}
std::string ReviewConfirmationDigest(const ReviewConfirmationV3& c){auto s=Confirmation(c);return EvidenceSha256(s.data(),s.size());}
bool ValidateReviewConfirmation(const ReviewConfirmationV3& c,std::string* e){
    if(!VaReviewText(c.principal,256)||!VaReviewText(c.question)||!EvidenceIsSha256(c.revision)||!EvidenceIsSha256(c.spec_sha256)||
        c.confirmed_at_ms<=0||c.expires_at_ms<=c.confirmed_at_ms||c.expires_at_ms-c.confirmed_at_ms>300000)return Fail(e);
    if(e)e->clear();return true;
}
bool ValidateVaReviewRecordV3(const VaReviewRecordV3& v,std::string* e){
    if(!ValidateVaReviewRecordV2(v.analysis,e)||!ValidateReviewConfirmation(v.confirmation,e))return false;
    if(v.confirmation.spec_sha256!=v.analysis.spec_sha256||v.confirmation_sha256!=ReviewConfirmationDigest(v.confirmation)||
        v.analysis.created_at_ms<v.confirmation.confirmed_at_ms||v.analysis.created_at_ms>v.confirmation.expires_at_ms)return Fail(e);
    if(SerializeVaReviewRecordV3(v).size()>kVaReviewRecordV2Bytes){if(e)*e="review-record-too-large";return false;}
    if(e)e->clear();return true;
}
std::string SerializeVaReviewRecordV3(const VaReviewRecordV3& v){return
    "{\"schema\":\"media-server.va-review-record.v3\",\"intentOrigin\":\"user-confirmed\",\"analysis\":"+
    SerializeVaReviewRecordV2(v.analysis)+",\"confirmation\":"+Confirmation(v.confirmation)+
    ",\"confirmationSha256\":"+EvidenceJsonQuote(v.confirmation_sha256)+"}";}
bool ParseVaReviewRecordV3(const std::string& s,VaReviewRecordV3* out,std::string* e){using namespace review_json;
    Doc d,c;VaReviewRecordV3 v;
    if(!out||s.size()>kVaReviewRecordV2Bytes||!Parse(s,&d)||d.members.size()!=5||
        ingress::StrictJsonStringField(d,"schema")!="media-server.va-review-record.v3"||
        ingress::StrictJsonStringField(d,"intentOrigin")!="user-confirmed")return Fail(e);
    const auto a=ingress::StrictJsonObjectField(d,"analysis"),confirmation=ingress::StrictJsonObjectField(d,"confirmation");
    if(!a||!confirmation||!ParseVaReviewRecordV2(*a,&v.analysis,e)||!Parse(*confirmation,&c)||c.members.size()!=6||
        !Text(c,"principal",&v.confirmation.principal)||!Text(c,"question",&v.confirmation.question)||
        !Text(c,"revision",&v.confirmation.revision)||!Text(c,"specSha256",&v.confirmation.spec_sha256)||
        !Number(c,"confirmedAtMs",&v.confirmation.confirmed_at_ms)||!Number(c,"expiresAtMs",&v.confirmation.expires_at_ms)||
        !Text(d,"confirmationSha256",&v.confirmation_sha256)||!ValidateVaReviewRecordV3(v,e))return Fail(e);
    *out=std::move(v);if(e)e->clear();return true;
}
} // namespace recording
