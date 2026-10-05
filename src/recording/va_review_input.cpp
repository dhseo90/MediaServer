// 파일 용도: 순서·원본·시간·checksum을 보존하고 입력 실패 시 출력 객체를 유지한다.
#include "recording/va_review_input.h"
#include "domain/strict_json.h"
#include <algorithm>
#include <cerrno>
#include <unistd.h>

namespace recording {
namespace {
bool Fail(std::string* error, const char* code) { if (error) *error=code; return false; }
bool Prepare(VaReviewInput* input, std::string* error) {
    if (!EvidencePackageStore::ValidId(input->package_id) || !VaReviewText(input->question) ||
        !ValidateEvidencePackage(input->manifest,nullptr) ||
        input->manifest_sha256 != EvidenceSha256(SerializeEvidencePackage(input->manifest).data(),
                                                  SerializeEvidencePackage(input->manifest).size()))
        return Fail(error,"review-invalid-input");
    const auto& frames=input->manifest.frames;
    if (frames.empty()) return Fail(error,"review-no-frames");
    std::size_t total=0;
    input->asset_indices.clear();
    for (const auto& frame:frames) {
        const auto& first=frames.front();
        if (frame.segment_id!=first.segment_id || frame.source_generation!=first.source_generation ||
            frame.generation_order!=first.generation_order || frame.media_epoch_id!=first.media_epoch_id ||
            frame.media_epoch_id!=input->manifest.media_epoch_id || frame.track_id!=first.track_id ||
            frame.media_sha256!=first.media_sha256)
            return Fail(error,"review-mixed-source");
        const auto found=std::find_if(input->manifest.references.begin(),input->manifest.references.end(),
            [&](const auto& r){return r.kind=="frame" && r.state=="preserved" &&
                r.id==frame.segment_id+":"+std::to_string(frame.pts_ns);});
        if(found==input->manifest.references.end() || !found->asset_index)
            return Fail(error,"review-invalid-input");
        const auto index=std::size_t(*found->asset_index);
        const auto size=input->manifest.assets[index].size_bytes;
        if(size>kVaReviewInputBytes-total) return Fail(error,"review-input-too-large");
        total+=std::size_t(size);
        input->asset_indices.push_back(index);
    }
    return true;
}
}
bool VaReviewText(const std::string& text, std::size_t limit) {
    if(text.empty() || text.size()>limit || text.find_first_not_of(' ')==std::string::npos ||
       std::any_of(text.begin(),text.end(),[](unsigned char c){return c<32 || c==127;})) return false;
    // 알려진 locator/credential 표현을 거부한다. 임의 비밀 탐지 보장은 아니다.
    for(const auto* marker:{"://","/Users/","/home/","Bearer ","api_key=","apiKey=","password="})
        if(text.find(marker)!=std::string::npos) return false;
    return true;
}
std::string SerializeVaReviewInput(const VaReviewInput& value) {
    return "{\"schema\":\"media-server.va-review-input.v1\",\"packageId\":"+EvidenceJsonQuote(value.package_id)+
        ",\"manifestSha256\":"+EvidenceJsonQuote(value.manifest_sha256)+",\"question\":"+
        EvidenceJsonQuote(value.question)+",\"manifest\":"+SerializeEvidencePackage(value.manifest)+"}";
}
bool ParseVaReviewInput(const std::string& json, VaReviewInput* output, std::string* error) {
    ingress::StrictJsonObjectDocument d; VaReviewInput value;
    if(!output || json.size()>96*1024 || !ingress::ParseStrictJsonObjectDocument(json,&d,nullptr) ||
       d.members.size()!=5 || ingress::StrictJsonStringField(d,"schema")!="media-server.va-review-input.v1")
        return Fail(error,"review-invalid-input");
    const auto id=ingress::StrictJsonStringField(d,"packageId");
    const auto digest=ingress::StrictJsonStringField(d,"manifestSha256");
    const auto question=ingress::StrictJsonStringField(d,"question");
    const auto manifest=ingress::StrictJsonObjectField(d,"manifest");
    if(!id || !digest || !question || !manifest || !ParseEvidencePackage(*manifest,&value.manifest,nullptr))
        return Fail(error,"review-invalid-input");
    value.package_id=*id; value.manifest_sha256=*digest; value.question=*question;
    if(!Prepare(&value,error)) return false;
    *output=std::move(value); if(error)error->clear(); return true;
}
bool LoadVaReviewInput(const EvidencePackageStore& store, const std::string& id, const std::string& question,
    const std::function<bool(const std::string&)>& authorize, VaReviewInput* output,
    std::string* error, const std::function<bool()>& cancelled) {
    if(!output || !EvidencePackageStore::ValidId(id) || !VaReviewText(question))
        return Fail(error,"review-invalid-input");
    if(cancelled && cancelled()) return Fail(error,"review-cancelled");
    const auto file=store.Open(id,error,cancelled);
    if(!file) return false;
    VaReviewInput value; value.package_id=id; value.question=question; value.manifest=file->manifest();
    if(!authorize || !authorize(value.manifest.channel_id)) return Fail(error,"review-forbidden");
    const auto json=SerializeEvidencePackage(value.manifest);
    value.manifest_sha256=EvidenceSha256(json.data(),json.size());
    if(!Prepare(&value,error)) return false;
    for(const auto index:value.asset_indices) {
        const auto& asset=value.manifest.assets[index];
        std::vector<std::uint8_t> png(std::size_t(asset.size_bytes)); std::size_t done=0;
        while(done<png.size()) {
            if(cancelled && cancelled()) return Fail(error,"review-cancelled");
            if(!authorize(value.manifest.channel_id)) return Fail(error,"review-forbidden");
            const auto n=::pread(file->fd(),png.data()+done,std::min<std::size_t>(65536,png.size()-done),
                static_cast<off_t>(file->AssetOffset(index)+done));
            if(n<0 && errno==EINTR) continue;
            if(n<=0) return Fail(error,"review-input-read-failed");
            done+=std::size_t(n);
        }
        if(EvidenceSha256(png.data(),png.size())!=asset.sha256) return Fail(error,"review-input-corrupt");
        value.pngs.push_back(std::move(png));
    }
    if(cancelled && cancelled()) return Fail(error,"review-cancelled");
    if(!authorize(value.manifest.channel_id)) return Fail(error,"review-forbidden");
    if(SerializeVaReviewInput(value).size()>96*1024) return Fail(error,"review-input-too-large");
    *output=std::move(value); if(error)error->clear(); return true;
}
} // namespace recording
