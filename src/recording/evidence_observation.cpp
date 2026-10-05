// 파일 용도: 선택 sample의 A 출처 사본 결속·검증·독립 readback. 영상 사실/모델 품질 검사가 아니다.
#include "recording/evidence_observation.h"
#include <algorithm>
#include <set>

namespace recording {
namespace {
bool Fail(std::string* e,const char* message){if(e)*e=message;return false;}
bool Exact(const ReferencedObservationV1& p,const EvidenceFrameV1& f) {
    const auto& r=p.reference;
    if(r.association_quality!="timestamp-match"||!r.original||p.observation.pts!=f.pts_ns)return false;
    const auto& x=*r.original;
    return x.source_generation==f.source_generation&&x.generation_order==f.generation_order&&x.track_id==f.track_id&&
        x.ordinal==f.sample_ordinal&&x.pts_ns==std::uint64_t(f.pts_ns);
}
bool Coordinates(const ReferencedObservationV1& p,const EvidenceFrameV1& f) {
    const auto& c=p.observation.coordinates;
    return c&&analysis::ValidateObservationCoordinates(*c)&&c->value_kind=="processed-track"&&
        c->frame_width==f.width&&c->frame_height==f.height&&p.observation.bbox.width>0&&p.observation.bbox.height>0;
}
std::pair<std::string,std::string> State(const EvidenceObservationSnapshotV2& s,const EvidenceFrameV1& f,bool reused) {
    if(s.candidates.empty())return {"missing","no-selected-sample-observation"};
    if(s.candidates.size()!=1)return {"unverified","ambiguous-observation"};
    const auto& p=s.candidates.front();
    if(!Exact(p,f))return {"unverified","sample-association-unverified"};
    if(!Coordinates(p,f))return {"unverified","coordinate-provenance-unverified"};
    if(reused)return {"unverified","engine-track-reused"};
    return {"matched","exact-engine-record"};
}
bool Reused(const EvidencePackageV1& p) {
    std::set<std::int64_t> starts;
    std::set<std::pair<std::string,std::uint64_t>> generations;
    for(const auto& s:p.observation_snapshots)for(const auto& c:s.candidates)
        if(Exact(c,p.frames[s.frame_index])) {
            if(c.observation.engine_first_seen_pts)starts.insert(*c.observation.engine_first_seen_pts);
            generations.emplace(c.reference.original->source_generation,c.reference.original->generation_order);
        }
    return starts.size()>1||generations.size()>1;
}
} // namespace
bool PopulateEvidenceObservations(EvidencePackageV1* p,const std::vector<ReferencedObservationV1>& rows,std::string* error) {
    if(!p||p->schema!="media-server.evidence-package.v2"||rows.size()>256)return Fail(error,"evidence-observation-input");
    auto next=*p;next.observation_snapshots.clear();
    for(std::size_t i=0;i<next.frames.size();++i) {
        EvidenceObservationSnapshotV2 s;s.frame_index=i;s.png_sha256=next.frames[i].png_sha256;
        for(const auto& row:rows) {
            if(!ValidateReferencedObservationV1(row,nullptr))return Fail(error,"evidence-observation-corrupt");
            const auto& o=row.observation;const auto& r=row.reference;const auto pts=next.frames[i].pts_ns;
            if(o.channel_id!=next.channel_id||o.source_id!=next.observation_source_id||
               o.analysis_namespace!=next.analysis_namespace||o.track_id!=next.track_id)continue;
            if(o.pts!=pts&&(!r.original||r.original->pts_ns!=std::uint64_t(pts)))continue;
            if(s.candidates.size()>=4)return Fail(error,"evidence-observation-candidate-limit");
            s.candidates.push_back(row);
        }
        std::sort(s.candidates.begin(),s.candidates.end(),[](const auto& a,const auto& b){return a.observation.observation_id<b.observation.observation_id;});
        next.observation_snapshots.push_back(std::move(s));
    }
    const bool reused=Reused(next);
    for(auto& s:next.observation_snapshots) {
        const auto state=State(s,next.frames[s.frame_index],reused);s.state=state.first;s.reason=state.second;
    }
    if(!ValidateEvidenceObservations(next,error))return false;
    *p=std::move(next);return true;
}
bool ValidateEvidenceObservations(const EvidencePackageV1& p,std::string* error) {
    if(p.schema=="media-server.evidence-package.v1") {
        if(!p.observation_source_id.empty()||!p.observation_snapshots.empty())return Fail(error,"evidence-unversioned-observations");
        return true;
    }
    if(p.schema!="media-server.evidence-package.v2"||!ValidateRecordingReferenceId(p.observation_source_id,nullptr)||
       !ValidateOpaqueId(p.analysis_namespace,nullptr)||!ValidateOpaqueId(p.track_id,nullptr)||
       !ValidateOpaqueId(p.store_id,nullptr)||!ValidateOpaqueId(p.media_epoch_id,nullptr)||
       p.frames.size()>8||p.observation_snapshots.size()!=p.frames.size())return Fail(error,"evidence-observation-version");
    std::size_t bytes=0;
    for(std::size_t i=0;i<p.frames.size();++i) {
        const auto& s=p.observation_snapshots[i];const auto& f=p.frames[i];
        if(s.frame_index!=i||s.png_sha256!=f.png_sha256||f.media_epoch_id!=p.media_epoch_id||s.candidates.size()>4)
            return Fail(error,"evidence-observation-frame");
        std::set<std::string> ids;
        for(const auto& row:s.candidates) {
            const auto& o=row.observation;
            if(!ValidateReferencedObservationV1(row,nullptr)||o.channel_id!=p.channel_id||o.source_id!=p.observation_source_id||
               o.analysis_namespace!=p.analysis_namespace||o.track_id!=p.track_id||!ids.insert(o.observation_id).second||
               (o.pts!=f.pts_ns&&(!row.reference.original||row.reference.original->pts_ns!=std::uint64_t(f.pts_ns))))
                return Fail(error,"evidence-observation-reference");
            bytes+=SerializeReferencedObservationV1(row).size();
            if(bytes>64*1024)return Fail(error,"evidence-observation-byte-limit");
        }
    }
    const bool reused=Reused(p);
    for(const auto& s:p.observation_snapshots) {
        const auto state=State(s,p.frames[s.frame_index],reused);
        if(s.state!=state.first||s.reason!=state.second)return Fail(error,"evidence-observation-state");
    }
    if(error)error->clear();return true;
}
bool ReadAnalysisRecordReview(const EvidencePackageStore& store,const std::string& id,
    const std::vector<ReviewClaimSpec>& claims,AnalysisRecordReview* output,std::string* error) {
    if(!output||claims.empty())return Fail(error,"record-review-input");
    const auto file=store.Open(id,error);if(!file)return false;
    return EvaluateAnalysisRecordSnapshot(file->manifest(),claims,output,error);
}
bool EvaluateAnalysisRecordSnapshot(const EvidencePackageV1& snapshot,const std::vector<ReviewClaimSpec>& claims,
    AnalysisRecordReview* output,std::string* error) {
    if(!output||claims.empty())return Fail(error,"record-review-input");
    AnalysisRecordReview v;v.package=snapshot;
    if(v.package.schema!="media-server.evidence-package.v2"||!ValidateEvidenceObservations(v.package,error))
        return Fail(error,"record-review-provenance-unavailable");
    const auto& target=claims.front().target_id;
    for(const auto& c:claims)if(c.target_id!=target||c.comparison_target_id!=target)return Fail(error,"record-review-target");
    for(const auto& f:v.package.frames)v.frames.push_back({f.pts_ns,f.width,f.height,f.png_sha256});
    std::optional<std::size_t> anchor;
    for(const auto& s:v.package.observation_snapshots) {
        ReviewObservation o;o.target_id=target;o.frame=s.frame_index;
        o.pts_ns=v.frames[o.frame].pts_ns;o.evidence_sha256=v.frames[o.frame].evidence_sha256;
        if(s.state=="matched") {
            const auto& b=s.candidates.front().observation.bbox;const auto& f=v.frames[o.frame];
            o.visibility=ReviewVisibility::Visible;
            o.position=ReviewPoint{(b.x+b.width/2)*f.width,(b.y+b.height/2)*f.height};
            if(!anchor)anchor=o.frame;
            o.identity=ReviewIdentity::Same;o.identity_anchor=anchor;
            o.identity_evidence="A:engine-track; namespace/track/episode in package snapshot";
        }
        // missing/unverified는 대상 부재가 아니다. color와 숨겨진 구간 움직임도 발명하지 않는다.
        v.observations.push_back(std::move(o));
    }
    if(!EvaluateReviewClaims(claims,v.frames,v.observations,&v.decisions,error))return false;
    *output=std::move(v);return true;
}
} // namespace recording
