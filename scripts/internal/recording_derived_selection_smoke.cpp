// 파일 용도: 직접 시간 대응/선택의 실제 구현을 정수 literal fixture로 검사한다.
#include "recording/recording_derived_selection.h"
#include "analysis/frame_source_association.h"
#include <iostream>
#include <limits>
using namespace recording;
using namespace analysis;
namespace {
int passed=0, failed=0;
void Check(bool ok, const char* name) { std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++passed:++failed; }
DecodedIntervalEvidence Frame(std::int64_t pts, std::uint64_t ordinal) {
    DecodedIntervalEvidence f;f.analysis_pts_ns=pts;f.duration_ns=10000000;
    f.association={SourceAssociationQuality::TimestampMatch,OriginalSampleIdentity{"gen",1,ordinal,"video/0",static_cast<std::uint64_t>(pts)}};
    return f;
}
RecordingConsumerReferenceV1 Reference() {
    RecordingConsumerReferenceV1 r;r.reference_id="request";r.kind="event";r.owner_id="event";
    r.source_id="source";r.channel_id="channel";r.analysis_namespace="tap-r0";r.analysis_track_id="track-1";
    r.association_quality="timestamp-match";r.original=RecordingConsumerOriginalV1{"gen",1,1,"video/0",0};
    r.request=RecordingConsumerRequestV1{"media-pts-ms",0,20,0,0};return r;
}
DerivedSourceEvidence Source(const std::string& id="segment") {
    DerivedSourceEvidence x;auto& s=x.segment;s.segment_id=id;s.source_id="source";s.channel_id="channel";
    s.store_id="store";s.order_request_id="order-"+id;s.order_sequence=1;s.media_epoch_id="epoch";
    s.media_end_pts=20000000;s.container="mp4";s.video_codecs={"h264"};s.audio_omitted_reason="source-no-audio";
    s.size_bytes=12;s.checksum_sha256=std::string(64,'a');s.created_at_ms=1;s.finalized_at_ms=2;
    s.mappings={{"media-server.recording-utc-mapping.v1","map",0,20000000,"server-observation",100000000,120000000,1,"observed"}};
    RecordingSourceBindingV1 b;b.segment_id=id;b.source_id=s.source_id;b.channel_id=s.channel_id;b.store_id=s.store_id;
    b.media_epoch_id=s.media_epoch_id;b.source_generation="gen";b.generation_order=1;b.track_id="video/0";
    b.samples={{1,0},{2,10000000}};b.last_accepted_ordinal=2;x.binding=b;return x;
}
}
int main() {
    DecodedIntervalCollector collector;collector.Append(Frame(0,1));auto first=collector.Snapshot("tap-r0");
    collector.Append(Frame(10000000,2));auto snap=*collector.Snapshot("tap-r0");
    Check(first->frames.size()==1&&snap.frames.size()==2&&snap.frames[0].direct&&snap.analysis_namespace=="tap-r0","D01 callback 누적·불변 snapshot");
    DecodedIntervalCollector invalid;
    auto fallback=Frame(0,1);fallback.analysis_pts_ns=1;invalid.Append(fallback);
    auto missing=Frame(0,1);missing.duration_ns.reset();invalid.Append(missing);
    auto nearest=Frame(0,1);nearest.association.quality=SourceAssociationQuality::Nearest;invalid.Append(nearest);
    auto absent=Frame(0,1);absent.association.original.reset();invalid.Append(absent);
    const auto bad=invalid.Snapshot("tap-r0");bool rejected=bad->frames.size()==4;
    for(const auto& f:bad->frames)rejected=rejected&&!f.direct&&!f.reason.empty();
    Check(rejected&&snap.frames.size()==2&&snap.frames[0].direct,"D02 유효0·fallback·duration/원본부재");
    auto reference=Reference();auto source=Source();DerivedRecordingSelection out;std::string error;
    const auto select=[&](const auto& r,const auto& e,const auto& sources,const RecordingRangeResult* utc=nullptr) {
        return SelectDerivedRecording(r,e,sources,utc,&out,&error);
    };
    const std::vector<DerivedSourceEvidence> sources{source};
    const auto select_native=[&](const auto& r,const auto& e,const auto& s) {
        return SelectDerivedRecording(r,e,s,nullptr,&out,&error,true);
    };
    auto native=source;native.segment.media_end_pts=100000000;native.segment.mappings[0].end_pts=100000000;native.segment.mappings[0].utc_end_ns=200000000;
    native.binding->samples.clear();native.binding->last_accepted_ordinal=3;
    RecordingFileEvidenceV1 proof;proof.file_size_bytes=native.segment.size_bytes;proof.file_sha256=native.segment.checksum_sha256;proof.timescale=3000;proof.movie_timescale=3000;proof.edit_duration=300;
    DecodedIntervalSnapshot observed;observed.analysis_namespace=reference.analysis_namespace;
    for(int i=0;i<3;++i){const std::int64_t pts=static_cast<std::int64_t>(i)*1000000000/30;native.binding->samples.push_back({static_cast<std::uint64_t>(i+1),static_cast<std::uint64_t>(pts)});auto f=Frame(pts,i+1);f.duration_ns=33333333;observed.frames.push_back(f);RecordingFileSampleEvidenceV1 sample;sample.ordinal=i+1;sample.original_pts_ns=sample.original_dts_ns=sample.mux_pts_ns=sample.mux_dts_ns=pts;sample.original_duration_ns=sample.mux_duration_ns=33333333;sample.native_pts=sample.native_dts=i*100;sample.native_duration=100;sample.vcl_sha256=std::string(64,'b'+i);sample.sample_sha256=std::string(64,'c'+i);proof.samples.push_back(sample);}
    native.binding->file_evidence=proof;auto nr=reference;nr.request->end_ms=100;
    Check(ValidateRecordingSourceBindingForSegment(*native.binding,native.segment,&error),"LP09-S01 native fixture strict binding precondition");
    Check(select_native(nr,observed,std::vector<DerivedSourceEvidence>{native})&&out.native_file_intervals&&out.complete&&out.slices.size()==3&&out.slices[0].presentation&&out.slices[0].presentation->end.numerator==1,"LP09-S01 observed native intervals close only quantization gaps");
    auto no_duration=observed;for(auto& f:no_duration.frames)f.duration_ns.reset();
    Check(select_native(nr,no_duration,std::vector<DerivedSourceEvidence>{native})&&out.native_file_intervals&&out.complete,"LP09-S01 observed identity is separate from input duration");
    auto missing_native=observed;missing_native.frames.erase(missing_native.frames.begin()+1);
    Check(select_native(nr,missing_native,std::vector<DerivedSourceEvidence>{native})&&!out.complete,"LP09-S02 file existence does not invent unobserved identity");
    auto legacy_native=native;legacy_native.binding->file_evidence.reset();
    Check(select_native(nr,observed,std::vector<DerivedSourceEvidence>{legacy_native})&&!out.native_file_intervals&&!out.complete,"LP09-S02 legacy timestamp-only remains partial");
    Check(select(nr,observed,std::vector<DerivedSourceEvidence>{native})&&!out.native_file_intervals&&!out.complete,"LP09-S02 native proof alone never enables legacy callers");
    for(const std::string mode:{"duplicate","namespace","generation","track","ordinal","pts","nearest","proof","deleted","unavailable","source","channel"}) {
        auto e=observed;auto s=native;
        if(mode=="duplicate")e.frames.push_back(e.frames[0]);
        if(mode=="namespace")e.analysis_namespace="other";
        if(mode=="generation")e.frames[1].association.original->source_generation="other";
        if(mode=="track")e.frames[1].association.original->track_id="other";
        if(mode=="ordinal")e.frames[1].association.original->ordinal=99;
        if(mode=="pts")e.frames[1].association.original->pts_ns++;
        if(mode=="nearest")e.frames[1].association.quality=SourceAssociationQuality::Nearest;
        if(mode=="proof")s.binding->file_evidence->samples[1].native_duration++;
        if(mode=="deleted")s.deleted=true;
        if(mode=="unavailable")s.available_for_selection=false;
        if(mode=="source")s.segment.source_id="other";
        if(mode=="channel")s.segment.channel_id="other";
        const bool ok=select_native(nr,e,std::vector<DerivedSourceEvidence>{s});
        Check(ok&&!out.complete,("LP09-S02 native rejects "+mode).c_str());
    }
    auto other_native=native;other_native.segment.segment_id="second";other_native.binding->segment_id="second";
    Check(select_native(nr,observed,std::vector<DerivedSourceEvidence>{native,other_native})&&!out.complete,"LP09-S02 one observed identity cannot bind two files");
    Check(select_native(nr,observed,std::vector<DerivedSourceEvidence>{native,legacy_native})&&!out.native_file_intervals&&!out.complete,"LP09-S02 mixed proof presence falls back to legacy");
    auto overlap=native;auto overlap_frames=observed;auto overlap_request=nr;overlap_request.request->end_ms=30;
    overlap.binding->samples[1].pts_ns=0;overlap_frames.frames[1]=Frame(0,2);
    auto& overlap_sample=overlap.binding->file_evidence->samples[1];overlap_sample.original_pts_ns=0;overlap_sample.mux_pts_ns=0;overlap_sample.native_pts=0;
    Check(ValidateRecordingSourceBindingForSegment(*overlap.binding,overlap.segment,&error),"LP09-S01 distinct AU overlap strict fixture");
    Check(select_native(overlap_request,overlap_frames,std::vector<DerivedSourceEvidence>{overlap})&&out.native_file_intervals&&out.complete&&out.slices.size()==1&&out.slices[0].candidates.size()==1&&out.slices[0].candidates[0].original->ordinal==1,"LP09-S01 distinct observed overlapping AUs select deterministic ordinal");
    const auto single=[&](const std::string& id,std::int64_t origin,std::uint64_t ordinal) {
        auto s=native;s.segment.segment_id=id;s.segment.order_request_id=id;s.segment.order_sequence=ordinal;
        s.segment.media_start_pts=origin;s.segment.media_end_pts=origin+33333333;
        s.segment.mappings[0].start_pts=origin;s.segment.mappings[0].end_pts=origin+33333333;
        s.segment.mappings[0].utc_start_ns=origin+100000000;s.segment.mappings[0].utc_end_ns=origin+133333333;
        auto& b=*s.binding;b.segment_id=id;b.samples={{ordinal,static_cast<std::uint64_t>(origin)}};b.last_accepted_ordinal=ordinal;
        auto& p=*b.file_evidence;p.writer_origin_ns=origin;p.edit_duration=100;p.samples.resize(1);
        p.samples[0].ordinal=ordinal;p.samples[0].original_pts_ns=p.samples[0].original_dts_ns=origin;
        return s;
    };
    const auto left=single("left",0,1);auto right=single("right",33333334,2);
    auto cross_request=nr;cross_request.request->end_ms=60;
    auto cross_frames=observed;cross_frames.frames={Frame(0,1),Frame(33333334,2)};
    Check(ValidateRecordingSourceBindingForSegment(*left.binding,left.segment,&error)&&ValidateRecordingSourceBindingForSegment(*right.binding,right.segment,&error),"LP09-S02 cross-file fractional gap strict fixtures");
    bool exact_gap=false;
    if(select_native(cross_request,cross_frames,std::vector<DerivedSourceEvidence>{left,right}))for(const auto& s:out.slices)
        if(s.state==DerivedSliceState::Unknown&&s.presentation&&s.presentation->start.ns==33333333&&s.presentation->start.numerator==1&&s.presentation->start.denominator==3&&s.presentation->end.ns==33333334&&s.presentation->end.numerator==0)exact_gap=true;
    Check(!out.complete&&exact_gap,"LP09-S02 actual two-thirds ns gap stays missing before display rounding");
    right=single("right",33333333,2);cross_frames.frames[1]=Frame(33333333,2);
    Check(select_native(cross_request,cross_frames,std::vector<DerivedSourceEvidence>{right,left})&&out.complete&&out.native_file_intervals&&out.slices.size()==3&&out.slices[1].candidates[0].original->ordinal==1,"LP09-S01 one-third ns overlap uses durable order independent of input order");
    auto ntsc=native;auto ntsc_frames=observed;auto& ntsc_proof=*ntsc.binding->file_evidence;
    ntsc.segment.media_end_pts=100100000;ntsc.segment.mappings[0].end_pts=100100000;ntsc.segment.mappings[0].utc_end_ns=200100000;
    ntsc_proof.timescale=ntsc_proof.movie_timescale=30000;ntsc_proof.edit_duration=3003;
    for(int i=0;i<3;++i){const auto pts=static_cast<std::int64_t>(i)*1001000000/30;ntsc.binding->samples[i].pts_ns=pts;ntsc_frames.frames[i]=Frame(pts,i+1);ntsc_frames.frames[i].duration_ns=33366666;auto& s=ntsc_proof.samples[i];s.original_pts_ns=s.original_dts_ns=s.mux_pts_ns=s.mux_dts_ns=pts;s.original_duration_ns=s.mux_duration_ns=33366666;s.native_pts=s.native_dts=i*1001;s.native_duration=1001;}
    Check(ValidateRecordingSourceBindingForSegment(*ntsc.binding,ntsc.segment,&error)&&select_native(nr,ntsc_frames,std::vector<DerivedSourceEvidence>{ntsc})&&out.complete&&out.slices[0].presentation->end.ns==33366666&&out.slices[0].presentation->end.numerator==2&&out.slices[0].presentation->end.denominator==3,"LP09-S01 30000-over-1001 exact observed interval union");
    auto no_last=native;no_last.binding->file_evidence->samples.back().native_duration=0;
    Check(select_native(nr,observed,std::vector<DerivedSourceEvidence>{no_last})&&!out.complete,"LP09-S02 missing last native duration never extrapolates");
    auto too_many=observed;too_many.frames.resize(4097,observed.frames[0]);
    Check(!select_native(nr,too_many,std::vector<DerivedSourceEvidence>{native})&&error=="derived-selection-input-cap","LP09-S02 native frame cap 4097 rejects without truncation");
    Check(!select_native(nr,observed,std::vector<DerivedSourceEvidence>(257,native))&&error=="derived-selection-input-cap","LP09-S02 native source cap 257 rejects without truncation");
    auto atoms=native;atoms.segment.media_end_pts=4096000000LL;atoms.segment.mappings[0].end_pts=4096000000LL;atoms.segment.mappings[0].utc_end_ns=4196000000LL;
    atoms.binding->samples.clear();atoms.binding->last_accepted_ordinal=4096;
    auto& atoms_proof=*atoms.binding->file_evidence;atoms_proof.timescale=atoms_proof.movie_timescale=1000000000;atoms_proof.edit_duration=4096000000LL;atoms_proof.samples.clear();
    auto atoms_frames=observed;atoms_frames.frames.clear();
    for(std::uint64_t i=0;i<4096;++i){const std::int64_t pts=static_cast<std::int64_t>(i)*1000000;atoms.binding->samples.push_back({i+1,static_cast<std::uint64_t>(pts)});auto sample=proof.samples.front();sample.ordinal=i+1;sample.original_pts_ns=sample.original_dts_ns=sample.mux_pts_ns=sample.mux_dts_ns=sample.native_pts=sample.native_dts=pts;sample.original_duration_ns=sample.mux_duration_ns=sample.native_duration=1000000;const auto digits=std::to_string(i);sample.vcl_sha256=sample.sample_sha256=std::string(64-digits.size(),'0')+digits;atoms_proof.samples.push_back(sample);if(i%2==0)atoms_frames.frames.push_back(Frame(pts,i+1));}
    auto atoms_request=nr;atoms_request.request->end_ms=4096;atoms_request.request->pre_ms=1;
    Check(ValidateRecordingSourceBindingForSegment(*atoms.binding,atoms.segment,&error),"LP09-S02 4097 output atoms strict bounded-input fixture");
    Check(!select_native(atoms_request,atoms_frames,std::vector<DerivedSourceEvidence>{atoms})&&error=="derived-selection-work-or-output-cap"&&out.slices.empty(),"LP09-S02 4097 output slices reject atomically without truncation");
    for(const std::string mode:{"ordinal","nearest","absent"}) {
        auto prefix_frames=observed;
        if(mode=="ordinal")prefix_frames.frames[1].association.original->ordinal=99;
        if(mode=="nearest")prefix_frames.frames[1].association.quality=SourceAssociationQuality::Nearest;
        if(mode=="absent")prefix_frames.frames[1].association.original.reset();
        bool prefix=false,no_suffix=true;
        if(select_native(nr,prefix_frames,std::vector<DerivedSourceEvidence>{native}))for(const auto& s:out.slices){
            if(s.state==DerivedSliceState::Confirmed&&s.presentation&&s.presentation->start.ns==0&&s.presentation->end.ns==33333333&&s.presentation->end.numerator==0)prefix=true;
            if(s.state==DerivedSliceState::Confirmed&&s.start_ns>=33333333)no_suffix=false;
        }
        Check(!out.complete&&prefix&&no_suffix,("LP09-S02 prefix preserved before uncertain "+mode+" without suffix invention").c_str());
    }
    auto unsafe_position=observed;auto unsafe=Frame(0,99);unsafe.analysis_pts_ns=-1;unsafe_position.frames.push_back(unsafe);
    Check(select_native(nr,unsafe_position,std::vector<DerivedSourceEvidence>{native})&&!out.complete&&std::none_of(out.slices.begin(),out.slices.end(),[](const auto& s){return s.state==DerivedSliceState::Confirmed;}),"LP09-S02 prefix unknown position rejects global completeness");
    auto outside_position=observed;outside_position.frames.push_back(Frame(200000000,99));
    Check(select_native(nr,outside_position,std::vector<DerivedSourceEvidence>{native})&&out.complete,"LP09-S02 prefix later outside-request unmatched observation remains irrelevant");
    Check(select(reference,snap,sources)&&out.complete&&out.slices.size()==2&&out.expanded_start_ns==0&&out.expanded_end_ns==20000000&&
        out.slices[0].candidates.size()==1&&out.slices[0].candidates[0].segment.checksum_sha256==std::string(64,'a'),"D04 exact union 정상 선택·파일식별");
    auto padded=reference;padded.request=RecordingConsumerRequestV1{"media-pts-ms",5,15,10,5};
    Check(select(padded,snap,sources)&&!out.complete&&out.expanded_start_ns==-5000000&&out.expanded_end_ns==20000000&&
        out.reference.request->pre_ms==10&&out.reference.request->start_ms==5,"D03 pre/post·음수요청 보존");
    auto overflow=reference;overflow.request->end_ms=std::numeric_limits<std::int64_t>::max();
    Check(!select(overflow,snap,sources)&&!error.empty(),"D03 ns 변환 overflow 거부");
    Check(select(reference,*first,sources)&&!out.complete&&out.slices.back().state==DerivedSliceState::Unknown,"D05 한점 외삽 금지");
    auto mismatch=snap;mismatch.analysis_namespace="other";
    Check(select(reference,mismatch,sources)&&!out.complete,"D06 namespace 격리");
    mismatch=snap;if(!mismatch.frames.empty())mismatch.frames.back().association.original->source_generation="next";
    Check(select(reference,mismatch,sources)&&!out.complete,"D06 generation 합성 금지");
    mismatch=snap;if(!mismatch.frames.empty())mismatch.frames.back().association.original->track_id="other";
    Check(select(reference,mismatch,sources)&&!out.complete,"D06 track 합성 금지");
    auto duplicate=snap;if(!duplicate.frames.empty()){auto f=duplicate.frames.front();f.association.original->ordinal=3;duplicate.frames.push_back(f);}
    auto duplicate_source=source;duplicate_source.binding->samples.push_back({3,0});duplicate_source.binding->last_accepted_ordinal=3;
    Check(select(reference,duplicate,std::vector<DerivedSourceEvidence>{duplicate_source})&&!out.complete&&
        !out.slices.empty()&&out.slices[0].state==DerivedSliceState::Ambiguous,"D07 중복 PTS 모호성");
    Check(select(reference,snap,std::vector<DerivedSourceEvidence>{source,Source("other")})&&!out.complete&&
        !out.slices.empty()&&out.slices[0].candidates.size()==2&&out.slices[0].state==DerivedSliceState::Ambiguous,"D07 복수 원본 후보 보존");
    DecodedIntervalCollector capped;for(int i=0;i<4100;++i)capped.Append(Frame(i*10000000LL,i+1));
    auto cap=*capped.Snapshot("tap-r0");
    Check(cap.frames.size()==4096&&cap.incomplete&&!cap.incomplete_reason.empty()&&select(reference,cap,sources)&&!out.complete,"D08 cap 초과범위 미확인");
    auto deleted=source;deleted.deleted=true;
    Check(select(reference,snap,std::vector<DerivedSourceEvidence>{deleted})&&!out.complete&&out.slices[0].state==DerivedSliceState::Deleted,"D09 삭제 원본 구분");
    auto gap=source;gap.segment.mappings[0].end_pts=10000000;gap.segment.mappings[0].utc_end_ns=110000000;
    Check(select(reference,snap,std::vector<DerivedSourceEvidence>{gap})&&!out.complete&&out.slices.back().state==DerivedSliceState::Unknown,"D09 불완전 mapping을 영상공백으로 승격 금지");
    auto epoch=source;epoch.segment.media_epoch_id="other-epoch";epoch.binding->media_epoch_id="other-epoch";
    Check(select(reference,snap,std::vector<DerivedSourceEvidence>{epoch})&&out.complete&&out.slices[0].candidates[0].segment.media_epoch_id=="other-epoch","D09 epoch identity 유지");
    auto rational=source;rational.segment.time_base_den=3;rational.segment.media_end_pts=1;
    rational.segment.mappings[0].end_pts=1;
    Check(select(reference,snap,std::vector<DerivedSourceEvidence>{rational})&&!out.complete,"D11 비표현 유리수 잔차 거부");
    auto future=reference;future.request->post_ms=10;
    Check(select(future,snap,sources)&&!out.complete&&out.slices.back().state==DerivedSliceState::Unknown,"D12 watermark 없는 postroll 미확인");
    auto cross=source;cross.segment.source_id="different";
    Check(select(reference,snap,std::vector<DerivedSourceEvidence>{cross})&&!out.complete,"D13 source/channel 결박");
    auto nohash=source;nohash.segment.checksum_sha256.clear();
    Check(select(reference,snap,std::vector<DerivedSourceEvidence>{nohash})&&!out.complete,"D13 checksum 없는 원본 거부");
    auto utc_ref=reference;utc_ref.request=RecordingConsumerRequestV1{"utc-ms",100,120,0,0};
    RecordingRangeCandidate c;c.store_id="store";c.segment_id="segment";c.media_epoch_id="epoch";c.order_sequence=1;
    c.mapping=source.segment.mappings[0];c.media_start_pts=0;c.media_end_pts=20000000;
    RecordingRangeResult utc;utc.slices={{100000000,120000000,RecordingRangeCoverage::Confirmed,{c}}};
    Check(select(utc_ref,snap,sources,&utc)&&out.complete&&out.slices[0].candidates[0].utc_mapping->uncertainty_ns==1,"D10 UTC 품질·불확실성 유지");
    utc.slices[0].candidates.push_back(c);
    Check(select(utc_ref,snap,sources,&utc)&&!out.complete&&out.slices[0].state==DerivedSliceState::Ambiguous&&out.slices[0].candidates.size()==2,"D10 UTC 역행 복수후보 보존");
    utc.slices[0].candidates.pop_back();utc.unplaced.push_back(c);
    Check(select(utc_ref,snap,sources,&utc)&&!out.complete&&out.unplaced.size()==1,"D10 UTC unplaced 차단");
    auto corrupted=source;corrupted.binding->segment_id="wrong";
    Check(select(reference,snap,std::vector<DerivedSourceEvidence>{source,corrupted})&&!out.complete,"D14 정상후보가 손상후보를 숨기지 않음");
    const auto bounded=collector.Snapshot("tap-r0",1,1);
    Check(bounded->frames.size()==1&&bounded->frames.front().analysis_pts_ns==0,"D15 queued sequence 미래제외");
    capped.Append(Frame(0,1));const auto reset=capped.Snapshot("tap-r1",4101,4101);
    Check(reset->frames.size()==1&&reset->frames.front().analysis_pts_ns==0&&!reset->incomplete,"D16 namespace reset 과거eviction 격리");
    TimestampAssociationHistory history;media::Packet p;p.track_id="video/0";media::SampleObservation o;
    o.source_generation="gen";o.generation_order=1;o.ordinal=1;o.pts_ns=0;o.duration_ns=10000000;p.observation=o;
    history.Append(0,0,p);
    Check(history.ResolveDuration(0)==10000000&&!history.ResolveDuration(1)&&!history.ResolveDuration(std::nullopt),"D17 decoder exact duration·fallback 격리");
    DecodedIntervalCollector multiple_epochs;
    for(int i=0;i<4100;++i)multiple_epochs.Append(Frame(1000000000000LL+i*10000000LL,i+1));
    multiple_epochs.BeginNamespace(4101);
    for(int i=0;i<4100;++i)multiple_epochs.Append(Frame(i*10000000LL,i+1));
    const auto new_epoch=multiple_epochs.Snapshot("tap-r1",4101,8200);
    auto recent_ref=reference;recent_ref.analysis_namespace="tap-r1";recent_ref.request->start_ms=100;recent_ref.request->end_ms=120;
    recent_ref.original->ordinal=11;recent_ref.original->pts_ns=100000000;
    auto recent_source=source;recent_source.segment.media_start_pts=100000000;recent_source.segment.media_end_pts=120000000;
    recent_source.segment.mappings[0].start_pts=100000000;recent_source.segment.mappings[0].end_pts=120000000;
    recent_source.binding->samples={{11,100000000},{12,110000000}};recent_source.binding->last_accepted_ordinal=12;
    Check(new_epoch->incomplete&&new_epoch->discarded_end_ns==40000000LL&&
        select(recent_ref,*new_epoch,std::vector<DerivedSourceEvidence>{recent_source})&&out.complete,
        "D21 namespace reset 이후 재eviction 최근작은구간 선택");
    std::cout<<"[summary] pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;
}
