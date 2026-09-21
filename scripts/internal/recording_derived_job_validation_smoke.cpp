// 파일 용도: 합성 metadata의 canonical 검증 비용과 거부 계약만 측정한다. 실제 media 검증이 아니다.
#include "recording/recording_derived_job.h"
#include "recording/recording_derived_selection.h"
#include "recording/recording_native_coverage.h"
#include <openssl/sha.h>
#include <chrono>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <algorithm>
#include <vector>

namespace {
void Need(bool ok) { if (!ok) throw std::runtime_error("fixture-setup"); }
std::string Hash(const std::string& value) {
    unsigned char digest[SHA256_DIGEST_LENGTH];
    SHA256(reinterpret_cast<const unsigned char*>(value.data()), value.size(), digest);
    std::ostringstream out;
    for (auto c : digest) out << std::hex << std::setw(2) << std::setfill('0') << static_cast<unsigned>(c);
    return out.str();
}
template<class F> std::int64_t Measure(const char* name, F work) {
    std::vector<std::int64_t> times;
    for (int i=0;i<3;++i) {
        const auto begin=std::chrono::steady_clock::now(); work();
        const auto us=std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now()-begin).count();
        times.push_back(us);
        std::cout << "[measure] operation=" << name << " iteration=" << i+1 << " microseconds=" << us << '\n';
    }
    std::sort(times.begin(),times.end());return times[1];
}
}
int main(int argc,char** argv) {
    const bool performance=argc==2&&std::string(argv[1])=="--performance-budget";
    if(argc>1&&!performance)return 2;
    using namespace recording;
    try {
        DerivedSourceEvidence source; auto& s=source.segment;
        s.segment_id="segment";s.source_id="source";s.channel_id="channel";s.store_id="store";
        s.order_request_id="order";s.order_sequence=1;s.media_epoch_id="epoch";s.media_end_pts=10000000000LL;
        s.container="mp4";s.video_codecs={"h264"};s.audio_omitted_reason="source-no-audio";
        s.size_bytes=12;s.checksum_sha256=std::string(64,'a');s.created_at_ms=1;s.finalized_at_ms=2;
        RecordingSourceBindingV1 b;b.segment_id=s.segment_id;b.source_id=s.source_id;b.channel_id=s.channel_id;
        b.store_id=s.store_id;b.media_epoch_id=s.media_epoch_id;b.source_generation="gen";
        b.generation_order=1;b.track_id="video/0";b.last_accepted_ordinal=250;
        analysis::DecodedIntervalCollector collector;
        for(int i=0;i<250;++i) {
            const std::int64_t pts=static_cast<std::int64_t>(i)*40000000;
            s.mappings.push_back({"media-server.recording-utc-mapping.v1","map-"+std::to_string(i),pts,pts+40000000,"server-observation",pts+100000000,pts+140000000,1,"observed"});
            b.samples.push_back({static_cast<std::uint64_t>(i+1),static_cast<std::uint64_t>(pts)});
            analysis::DecodedIntervalEvidence e;e.analysis_pts_ns=pts;e.duration_ns=40000000;
            e.association={analysis::SourceAssociationQuality::TimestampMatch,analysis::OriginalSampleIdentity{"gen",1,static_cast<std::uint64_t>(i+1),"video/0",static_cast<std::uint64_t>(pts)}};
            collector.Append(e);
        }
        source.binding=b;
        RecordingConsumerReferenceV1 ref;ref.reference_id="request";ref.kind="event";ref.owner_id="event";
        ref.source_id=s.source_id;ref.channel_id=s.channel_id;ref.analysis_namespace="tap-r0";
        ref.analysis_track_id="track-1";ref.association_quality="timestamp-match";
        ref.original=RecordingConsumerOriginalV1{"gen",1,76,"video/0",3000000000ULL};
        ref.request=RecordingConsumerRequestV1{"media-pts-ms",3000,4800,0,0};
        DerivedRecordingSelection selection;DerivedJobIntentV1 job;std::string error;
        Need(SelectDerivedRecording(ref,*collector.Snapshot("tap-r0"),{source},nullptr,&selection,&error));
        Need(BuildDerivedJobIntent(selection,{source},4096,10,&job,&error));
        int pass=0,fail=0;
        auto check=[&](bool ok,const char* label){(ok?pass:fail)++;std::cout<<(ok?"[pass] ":"[fail] ")<<label<<'\n';};
        check(selection.complete&&selection.slices.size()==45&&job.sources.size()==1&&job.sources[0].binding.samples.size()==250,"P0-PERF01 literal source1 sample250 slice45 complete");
        const auto intent=SerializeDerivedJobIntent(job);Need(!intent.empty());
        DerivedJobRecordV1 record;record.intent=job;
        const auto canonical=SerializeDerivedJobRecord(record);Need(!canonical.empty());
        std::cout<<"[fixture] sources=1 samples=250 slices="<<selection.slices.size()<<" selection_bytes="<<job.selection_json.size()<<" intent_bytes="<<intent.size()<<" record_bytes="<<canonical.size()<<" sha256="<<Hash(canonical)<<'\n';
        Measure("serialize-intent",[&]{Need(SerializeDerivedJobIntent(job)==intent);});
        const auto record_median=Measure("serialize-record",[&]{Need(SerializeDerivedJobRecord(record)==canonical);});
        Measure("parse-record",[&]{DerivedJobRecordV1 out;Need(ParseDerivedJobRecord(canonical,&out,&error));});
        Measure("restore-selection",[&]{DerivedRecordingSelection out;Need(RestoreDerivedJobSelection(job,&out,&error));Need(out.complete&&out.slices.size()==45);});
        DerivedJobRecordV1 parsed;
        check(ParseDerivedJobRecord(canonical,&parsed,&error)&&SerializeDerivedJobRecord(parsed)==canonical,"P0-PERF01 canonical record roundtrip unchanged");
        check(Hash(canonical)=="529aff50132395c790a05ad68d735381b174966dc3099f00ba022a8ead494d5b","P0-PERF02 baseline canonical hash literal unchanged");
        if(performance)check(record_median<=60000,"P0-PERF02 host-scoped serialize-record median <=60000us");
        auto bad=job;bad.sources[0].segment.mappings[0].utc_start_ns=100000001;
        check(SerializeDerivedJobIntent(bad).empty(),"P0-PERF01 source mapping conflict rejected");
        bad=job;const auto segment=SerializeRecordingSegmentV2(s);auto changed=s;changed.mappings[0].utc_start_ns=100000001;
        const auto pos=bad.selection_json.find(segment);Need(pos!=std::string::npos);
        bad.selection_json.replace(pos,segment.size(),SerializeRecordingSegmentV2(changed));
        check(SerializeDerivedJobIntent(bad).empty(),"P0-PERF01 selection table mapping conflict rejected");
        bad=job;bad.job_id="forged-job";
        check(SerializeDerivedJobIntent(bad).empty(),"P0-PERF01 job identity forgery rejected");
        // 독립 literal 30fps: 정수 envelope와 native 정확 경계를 일부러 다르게 둔다.
        auto ns=source;ns.segment.media_end_pts=100000000;ns.segment.mappings.clear();
        ns.segment.mappings.push_back({"media-server.recording-utc-mapping.v1","native-map",0,100000000,"server-observation",100000000,200000000,1,"observed"});
        ns.binding->samples.clear();ns.binding->last_accepted_ordinal=3;
        RecordingFileEvidenceV1 proof;proof.file_size_bytes=ns.segment.size_bytes;proof.file_sha256=ns.segment.checksum_sha256;
        proof.timescale=proof.movie_timescale=3000;proof.edit_duration=300;
        for(int i=0;i<3;++i){const auto pts=static_cast<std::int64_t>(i)*1000000000/30;ns.binding->samples.push_back({static_cast<std::uint64_t>(i+1),static_cast<std::uint64_t>(pts)});RecordingFileSampleEvidenceV1 sample;sample.ordinal=i+1;sample.original_pts_ns=sample.original_dts_ns=sample.mux_pts_ns=sample.mux_dts_ns=pts;sample.original_duration_ns=sample.mux_duration_ns=33333333;sample.native_pts=sample.native_dts=i*100;sample.native_duration=100;sample.vcl_sha256=std::string(64,'b'+i);sample.sample_sha256=std::string(64,'c'+i);proof.samples.push_back(sample);}
        ns.binding->file_evidence=proof;Need(ValidateRecordingSourceBindingForSegment(*ns.binding,ns.segment,&error));
        DerivedRecordingSelection native;native.reference=ref;native.reference.original=RecordingConsumerOriginalV1{"gen",1,1,"video/0",0};native.reference.request=RecordingConsumerRequestV1{"media-pts-ms",0,100,0,0};native.expanded_end_ns=100000000;native.complete=true;native.native_file_intervals=true;native.reason="time-selection-only-not-playability";
        const PresentationTime endpoints[]={{0},{33333333,1,3},{66666666,2,3},{100000000}};
        for(int i=0;i<3;++i){DerivedSelectionSlice sl;sl.presentation=PresentationInterval{endpoints[i],endpoints[i+1]};sl.start_ns=endpoints[i].ns;sl.end_ns=endpoints[i+1].ns+(endpoints[i+1].numerator?1:0);sl.state=DerivedSliceState::Confirmed;sl.reason="observed-native-file-interval";DerivedSelectionCandidate c;c.segment=ns.segment;c.media_start_pts=sl.start_ns;c.media_end_pts=sl.end_ns;c.original=RecordingConsumerOriginalV1{"gen",1,static_cast<std::uint64_t>(i+1),"video/0",ns.binding->samples[i].pts_ns};sl.candidates.push_back(c);native.slices.push_back(sl);}
        DerivedJobIntentV1 nj;const bool built=BuildDerivedJobIntent(native,{ns},4096,10,&nj,&error);
        DerivedRecordingSelection restored;
        check(built&&nj.profile=="h264-mp4-native-to-mpegts-video-only-v1"&&nj.sources[0].binding.file_evidence&&RestoreDerivedJobSelection(nj,&restored,&error)&&restored.native_file_intervals&&restored.complete&&restored.slices[0].presentation&&restored.slices[0].presentation->end.numerator==1,"LP09-S03a native exact selection and proof survive job roundtrip");
        auto corrupt_native=native;corrupt_native.slices[0].presentation->end.numerator=2;
        check(!BuildDerivedJobIntent(corrupt_native,{ns},4096,10,&nj,&error),"LP09-S03a noncontiguous exact slices rejected");
        corrupt_native=native;corrupt_native.slices[1].candidates[0].original->ordinal=1;
        check(!BuildDerivedJobIntent(corrupt_native,{ns},4096,10,&nj,&error),"LP09-S03a observed identity and native interval mismatch rejected");
        auto no_proof=ns;no_proof.binding->file_evidence.reset();
        check(!BuildDerivedJobIntent(native,{no_proof},4096,10,&nj,&error),"LP09-S03a native profile cannot drop file evidence");
        auto overlap=ns;auto& second=overlap.binding->file_evidence->samples[1];second.original_pts_ns=second.mux_pts_ns=second.native_pts=0;overlap.binding->samples[1].pts_ns=0;
        Need(ValidateRecordingSourceBindingForSegment(*overlap.binding,overlap.segment,&error));
        auto selected=native;selected.slices.resize(1);selected.slices[0].presentation->end={33000000};selected.slices[0].end_ns=selected.slices[0].candidates[0].media_end_pts=33000000;
        DerivedRemuxOutput substitute;DerivedRemuxAu au;au.ordinal=2;au.original_pts_ns=0;au.file_pts_ns=0;au.file_dts_ns=33333333;au.source_vcl_sha256=au.output_vcl_sha256=second.vcl_sha256;substitute.access_units.push_back(au);NativeCoverageResult coverage;
        check(!EvaluateNativeOutputCoverage(selected,overlap.segment,*overlap.binding,substitute,&coverage),"LP09-S03a overlapping substitute AU cannot replace selected identity");
        std::cout<<"[summary] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
    } catch (...) {std::cout<<"[setup-fail] fixture-or-operation-rejected\n";return 2;}
}
