// 검증된 chain 결과의 값 fixture다. 실제 B Open/SQLite/게시를 실행하지 않는다.
#include "recording/recording_catalog_generation_projection.h"
#include "recording/recording_derived_selection.h"
#include "recording/recording_derived_remux.h"
#include <algorithm>
#include <array>
#include <fstream>
#include <iostream>
#include <stdexcept>
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#endif
using namespace recording;
namespace {
std::array<bool,4> good{{true,true,true,true}};
std::string error;
void Check(unsigned n,bool value,const char* label) {
    std::cout<<"B02-X0"<<n<<' '<<(value?"PASS ":"FAIL ")<<label<<'\n';
    if(!value){good[n-1]=false;std::cerr<<"B02-X0"<<n<<" assertion: "<<label<<" error="<<error<<'\n';}
}
#if MEDIA_SERVER_USE_OPENSSL
void Need(bool value){if(!value)throw std::runtime_error("fixture: "+error);}
std::string Hash(const std::string& bytes) {
    unsigned char digest[32];unsigned size=0;
    Need(EVP_Digest(bytes.data(),bytes.size(),digest,&size,EVP_sha256(),nullptr)==1&&size==32);
    std::string result;const char* hex="0123456789abcdef";
    for(auto c:digest){result+=hex[c>>4];result+=hex[c&15];}return result;
}
void Write(const std::filesystem::path& path,const std::string& bytes){std::ofstream out(path,std::ios::binary);out<<bytes;Need(bool(out));}
std::string Read(const std::filesystem::path& path){std::ifstream in(path,std::ios::binary);Need(bool(in));return {std::istreambuf_iterator<char>(in),{}};}
struct Fixture {
    RecordingCatalogSnapshot snapshot;
    RecordingGenerationManifest manifest;
    RecordingIdentityChainResult chain;
    std::string archive;
    Fixture() {
        snapshot.store_id="store";snapshot.generation=2;snapshot.cut_ordinal=100;
        snapshot.identity_head={"identity-2.jsonl",1,Hash("x")};
        chain.store_id="store";chain.shards=1;chain.head=snapshot.identity_head;
        manifest.store_id="store";manifest.generation=2;manifest.cut_ordinal=100;
        manifest.active={"active-2.jsonl",0,Hash("")};
    }
    void Row(const std::string& kind,const std::string& key,const std::string& value){Need(!value.empty());snapshot.rows.push_back({kind,key,value});}
    void Add(RecordingMutationType type,const std::string& id,const std::string& entity,const std::string& payload,
             const std::optional<RecordingOrderReservationV1>& reservation={}) {
        RecordingMutationV1 mutation;mutation.mutation_type=type;mutation.mutation_id=id;mutation.entity_id=entity;
        mutation.occurred_at_ms=1;mutation.payload_json=payload;
        const auto bytes=SerializeRecordingMutationV1(mutation)+"\n";
        RecordingIdentityFirstAcceptance first;first.mutation_id=id;first.occurrences=1;first.first_global_ordinal=chain.physical_rows;
        auto& r=first.first_row;r.mutation_id=id;r.type=type;r.entity_id=entity;r.occurred_at_ms=1;
        r.global_ordinal=chain.physical_rows;r.identity=Hash(SerializeRecordingMutationV1(mutation));
        r.offset=archive.size();r.length=bytes.size();r.raw_sha256=Hash(bytes);r.reservation=reservation;
        archive+=bytes;chain.maximum_global_ordinal=chain.physical_rows++;chain.first_acceptances.push_back(first);
        if(reservation){chain.order_history.bound_store="store";chain.order_history.maximum=std::max(chain.order_history.maximum,reservation->sequence);chain.order_history.reservations.push_back({*reservation,1});}
        else {chain.order_history.ordinary_ids.push_back(id);
            Row("accepted-state",id,"{\"mutationId\":\""+id+"\",\"globalOrdinal\":"+std::to_string(first.first_global_ordinal)+",\"type\":\""+RecordingMutationTypeName(type)+"\"}");}
    }
    void Order(const std::string& request,const std::string& segment,std::int64_t sequence) {
        RecordingOrderReservationV1 order;order.store_id="store";order.request_id=request;order.segment_id=segment;order.channel_id="channel";order.sequence=sequence;
        Add(RecordingMutationType::RecordingOrderReserved,request,segment,
            "{\"schema\":\"media-server.recording-order.v1\",\"storeId\":\"store\",\"requestId\":\""+request+
            "\",\"segmentId\":\""+segment+"\",\"channelId\":\"channel\",\"sequence\":"+std::to_string(sequence)+"}",order);
    }
    void Seal(const std::filesystem::path& root) {
        std::sort(snapshot.rows.begin(),snapshot.rows.end(),[](const auto& a,const auto& b){return std::tie(a.kind,a.key)<std::tie(b.kind,b.key);});
        std::sort(chain.order_history.ordinary_ids.begin(),chain.order_history.ordinary_ids.end());
        const RecordingGenerationFile file{"evidence-1-0.jsonl",archive.size(),Hash(archive)};
        for(auto& first:chain.first_acceptances)first.first_archive=file;
        std::string bytes;Need(SerializeRecordingCatalogSnapshot(snapshot,&bytes,&error));
        manifest.snapshot={"snapshot-2.jsonl",bytes.size(),Hash(bytes)};
        if(!root.empty()){std::filesystem::create_directories(root);Write(root/file.name,archive);}
    }
    bool Build(const std::filesystem::path& root,RecordingCatalogGenerationProjection* out,std::uint64_t admission=1024*1024) const {
        return BuildRecordingCatalogGenerationProjection(root,manifest,chain,snapshot,admission,out,&error);
    }
};
RecordingSegmentV1 V1() {
    RecordingSegmentV1 s;s.segment_id="legacy";s.source_id="source";s.channel_id="channel";s.stream_epoch_id="epoch";
    s.start={1000,0,1,1000000000};s.end={2000,1000000000,1,1000000000};s.container="mp4";s.video_codecs={"h264"};
    s.audio_omitted_reason="source-no-audio";s.size_bytes=12;s.checksum_sha256=std::string(64,'a');
    s.lifecycle=RecordingLifecycle::Finalized;s.created_at_ms=1000;s.finalized_at_ms=2000;return s;
}
struct Input {DerivedSourceEvidence source;DerivedJobRecordV1 job;};
Input InputValue() {
    Input f;auto& s=f.source.segment;s.segment_id="segment";s.source_id="source";s.channel_id="channel";s.store_id="store";
    s.order_request_id="order";s.order_sequence=1;s.media_epoch_id="epoch";s.media_end_pts=20000000;s.container="mp4";
    s.video_codecs={"h264"};s.audio_omitted_reason="source-no-audio";s.size_bytes=12;s.checksum_sha256=std::string(64,'a');
    s.created_at_ms=1;s.finalized_at_ms=2;s.mappings={{"media-server.recording-utc-mapping.v1","map",0,20000000,"server-observation",100000000,120000000,1,"observed"}};
    RecordingSourceBindingV1 b;b.segment_id=s.segment_id;b.source_id=s.source_id;b.channel_id=s.channel_id;b.store_id=s.store_id;
    b.media_epoch_id=s.media_epoch_id;b.source_generation="gen";b.generation_order=1;b.track_id="video/0";b.samples={{1,0},{2,10000000}};b.last_accepted_ordinal=2;f.source.binding=b;
    RecordingConsumerReferenceV1 ref;ref.reference_id="reference";ref.kind="event";ref.owner_id="event";ref.source_id="source";ref.channel_id="channel";
    ref.analysis_namespace="tap";ref.analysis_track_id="track";ref.association_quality="timestamp-match";
    ref.original=RecordingConsumerOriginalV1{"gen",1,1,"video/0",0};ref.request=RecordingConsumerRequestV1{"media-pts-ms",0,20,0,0};
    analysis::DecodedIntervalCollector collector;
    for(int i=0;i<2;++i){analysis::DecodedIntervalEvidence e;e.analysis_pts_ns=i*10000000;e.duration_ns=10000000;
        e.association={analysis::SourceAssociationQuality::TimestampMatch,analysis::OriginalSampleIdentity{"gen",1,static_cast<std::uint64_t>(i+1),"video/0",static_cast<std::uint64_t>(i*10000000)}};collector.Append(e);}
    DerivedRecordingSelection selection;Need(SelectDerivedRecording(ref,*collector.Snapshot("tap"),{f.source},nullptr,&selection,&error));
    Need(BuildDerivedJobIntent(selection,{f.source},4096,10,&f.job.intent,&error));return f;
}
Fixture Active(const Input& input) {
    Fixture f;const auto& s=input.source.segment;const auto& b=*input.source.binding;
    f.Order("order","segment",1);
    f.Add(RecordingMutationType::SegmentV2BoundFinalized,"bound","segment","{\"segment\":"+SerializeRecordingSegmentV2(s)+",\"mediaRelpath\":\"channel/source.mp4\",\"sourceBinding\":"+SerializeRecordingSourceBindingV1(b)+"}");
    f.Row("segment-v2","segment",SerializeRecordingSegmentV2(s));f.Row("media-path","segment","\"channel/source.mp4\"");
    std::string value;Need(SerializeRecordingCatalogSourceSummary({"segment","channel","source","gen","video/0",1,2,"bound"},&value,&error));f.Row("source-binding","segment",value);
    if(input.job.ready)for(const auto& o:input.job.ready->outputs)f.Order(o.segment.order_request_id,o.segment.segment_id,o.segment.order_sequence);
    const auto type=input.job.state==DerivedJobState::Ready?RecordingMutationType::DerivedJobReady:
        input.job.state==DerivedJobState::Committed?RecordingMutationType::DerivedJobCommitted:RecordingMutationType::DerivedJobIntent;
    f.Add(type,"job-mutation",input.job.intent.job_id,SerializeDerivedJobRecord(input.job));
    RecordingCatalogJobSummary summary{input.job.intent.job_id,"channel","reference",input.job.state,input.job.files.size(),4096,{}, {"segment"},"job-mutation"};
    for(const auto& output:input.job.intent.outputs)summary.output_ids.push_back(output.output_id);
    Need(SerializeRecordingCatalogJobSummary(summary,&value,&error));f.Row("derived-job",summary.id,value);
    f.Row("consumer-reference","reference",SerializeRecordingConsumerReferenceV1(input.job.intent.reference));
    f.Row("derived-reference-accepted","reference","true");return f;
}
Input ReadyInput() {
    auto f=InputValue();DerivedJobFileV1 file;file.device=1;file.inode=100;file.initial_sha256=Hash("");
    std::set<std::string> dirs{""};
    for(const auto& path:{f.job.intent.outputs[0].temporary_relpath,f.job.intent.outputs[0].final_relpath}) {
        auto parent=std::filesystem::path(path).parent_path();
        while(!parent.empty()){dirs.insert(parent.generic_string());parent=parent.parent_path();}
    }
    std::uint64_t inode=200;for(const auto& path:dirs)file.directories.push_back({path,1,inode++});f.job.files.push_back(file);
    DerivedRemuxResult remux;Need(RestoreDerivedJobSelection(f.job.intent,&remux.selection,&error));
    remux.verified_output=true;remux.request_fully_satisfied=true;
    DerivedRemuxOutput p;p.segment_id="segment";p.store_id="store";p.source_id="source";p.media_epoch_id="epoch";
    p.verified_output=true;p.request_fully_satisfied=true;p.output_modified=true;p.caller_cleanup_required=true;
    p.size_bytes=12;p.checksum_sha256=Hash("media");p.codec_sha256=Hash("codec");
    p.actual_original_end_ns=20000000;p.requested_media_end_ns=20000000;
    for(int i=0;i<2;++i){DerivedRemuxAu au;au.ordinal=i+1;au.original_pts_ns=i*10000000;au.file_pts_ns=au.original_pts_ns;
        au.file_stream_time_ns=au.original_pts_ns;au.output_pts_ns=au.original_pts_ns;au.file_duration_ns=10000000;au.output_duration_ns=10000000;
        au.source_vcl_sha256=Hash("au"+std::to_string(i));au.output_vcl_sha256=au.source_vcl_sha256;p.access_units.push_back(au);
        p.source_decoded_sha256.push_back(Hash("pixels"+std::to_string(i)));}
    p.output_decoded_sha256=p.source_decoded_sha256;remux.outputs.push_back(p);
    DerivedJobRecordV1 ready;Need(BuildDerivedJobReady(f.job,remux,{2},20,&ready,&error));f.job=std::move(ready);return f;
}
bool Rejected(const Fixture& f,const std::filesystem::path& root,std::uint64_t admission=1024*1024) {
    RecordingCatalogGenerationProjection output;output.manifest.store_id="sentinel";output.mutation_ids.insert("unchanged");
    return !f.Build(root,&output,admission)&&output.manifest.store_id=="sentinel"&&output.mutation_ids==std::set<std::string>{"unchanged"};
}
#endif
}
int main(int argc,char** argv) {
    if(argc!=2)return 2;
    try {
        const std::filesystem::path root(argv[1]);
#if MEDIA_SERVER_USE_OPENSSL
        const auto input=InputValue();auto f=Active(input);f.Seal(root);RecordingCatalogGenerationProjection output;
        Check(1,f.Build(root,&output)&&output.active_jobs.size()==1&&output.active_source_bindings.size()==1&&
            output.orders.size()==1&&output.mutation_ids.size()==2&&output.accepted_states.size()==2,"active typed maps and reservation/ordinary ID separation");
        const auto original=Read(root/"evidence-1-0.jsonl");
        auto bad=f;bad.manifest.snapshot.sha256=std::string(64,'0');Check(2,Rejected(bad,root),"snapshot digest mismatch unchanged");
        bad=f;bad.chain.store_id="other";Check(2,Rejected(bad,root),"chain store mismatch unchanged");
        bad=f;bad.chain.maximum_global_ordinal=100;Check(2,Rejected(bad,root),"exclusive cut unchanged");
        bad=f;bad.chain.order_history.reservations[0].order.segment_id="other";Check(2,Rejected(bad,root),"reservation tuple mismatch");
        bad=f;for(auto& row:bad.snapshot.rows)if(row.kind=="segment-v2")row.key="wrong";bad.Seal({});Check(2,Rejected(bad,root),"domain internal key mismatch");
        bad=f;for(auto& row:bad.snapshot.rows)if(row.kind=="source-binding"){RecordingCatalogSourceSummary s;Need(ParseRecordingCatalogSourceSummary(row.value_json,&s,&error));s.latest_mutation_id="job-mutation";Need(SerializeRecordingCatalogSourceSummary(s,&row.value_json,&error));}bad.Seal({});Check(2,Rejected(bad,root),"thin latest type/entity mismatch");
        bad=f;bad.Row("media-path","orphan","\"safe/file.mp4\"");bad.Seal({});Check(2,Rejected(bad,root),"orphan media path");
        bad=f;bad.snapshot.rows.erase(std::remove_if(bad.snapshot.rows.begin(),bad.snapshot.rows.end(),[](const auto& row){return row.kind=="media-path"&&row.key=="segment";}),bad.snapshot.rows.end());
        bad.Seal({});Check(2,Rejected(bad,root),"V2 missing media path without V1 tombstone remains rejected");
        bad=f;auto present=input.source.segment;present.segment_id=input.job.intent.outputs[0].output_id;present.order_request_id=input.job.intent.outputs[0].order_request_id;present.order_sequence=2;
        bad.Order(present.order_request_id,present.segment_id,2);bad.Row("segment-v2",present.segment_id,SerializeRecordingSegmentV2(present));bad.Row("media-path",present.segment_id,"\"independent/file.mp4\"");bad.Seal(root);
        Check(2,bad.Build(root,&output)&&output.active_jobs.size()==1&&output.segments_v2.count(present.segment_id),"Intent independently finalized output stays valid/protected");
        f.Seal(root);Check(3,Rejected(f,root,1),"active cold admission");
        Write(root/"evidence-1-0.jsonl","corrupted");Check(3,Rejected(f,root),"active archive corruption unchanged");
        auto inactive=f;
        for(auto& first:inactive.chain.first_acceptances)if(first.mutation_id=="job-mutation")first.first_row.type=RecordingMutationType::DerivedJobFailed;
        for(auto& row:inactive.snapshot.rows){if(row.kind=="derived-job"){RecordingCatalogJobSummary s;Need(ParseRecordingCatalogJobSummary(row.value_json,&s,&error));s.state=DerivedJobState::Failed;Need(SerializeRecordingCatalogJobSummary(s,&row.value_json,&error));}
            if(row.kind=="accepted-state"&&row.key=="job-mutation")row.value_json="{\"mutationId\":\"job-mutation\",\"globalOrdinal\":2,\"type\":\"derived_job_failed\"}";}
        inactive.Seal({});Check(3,inactive.Build(root,&output)&&output.active_jobs.empty()&&output.active_source_bindings.empty(),"inactive archive detail is delayed, not validated");
        Check(3,Read(root/"evidence-1-0.jsonl")=="corrupted","candidate never rewrites archive");Write(root/"evidence-1-0.jsonl",original);
        Fixture legacy;auto s=V1();legacy.Row("segment-v1",s.segment_id,SerializeRecordingSegmentV1(s));legacy.Row("media-path",s.segment_id,"\"legacy/file.mp4\"");
        AnalysisObservationV1 o;o.observation_id="obs";o.source_id="different-source";o.channel_id="different-channel";o.frame_locator.segment_id=s.segment_id;
        o.frame_locator.frame={1500,500000000,1,1000000000};o.track_id="track";o.class_label="person";o.confidence=.8;o.bbox={.1,.1,.2,.3};o.selection_reason="event";o.created_at_ms=1500;
        legacy.Row("observation-v1","obs",SerializeAnalysisObservationV1(o));
        AnalysisObservationV2 v;v.observation_id="obs-v2";v.source_id="source";v.channel_id="channel";v.analysis_namespace="tap";v.stream_epoch_id="epoch";
        v.pts=1500000000;v.track_id="track";v.class_label="person";v.confidence=.8;v.bbox={.1,.2,.3,.4};v.selection_reasons={"track-start"};v.first_seen_pts=v.pts;v.last_seen_pts=v.pts;v.created_at_ms=1500;
        v.frame_locator=o.frame_locator;v.frame_locator->segment_id="historical-missing";v.frame_locator->frame.pts=v.pts;v.frame_locator->keyframe_pts=0;v.locator_reason.clear();
        legacy.Row("observation-v2",v.observation_id,SerializeAnalysisObservationV2(v));legacy.Seal({});
        Check(1,legacy.Build(root,&output)&&output.observations.size()==1&&output.observations_v2.size()==1,"historical source/channel and V2 missing locator FK accepted");
        // 16종 모두 실제 domain 값을 사용한다. chain 자체는 선행 검증 결과 fixture다.
        auto all=f;all.snapshot.rows.insert(all.snapshot.rows.end(),legacy.snapshot.rows.begin(),legacy.snapshot.rows.end());
        auto removed=input.source.segment;removed.segment_id="removed-v2";removed.order_request_id="removed-order";removed.order_sequence=3;
        all.Order(removed.order_request_id,removed.segment_id,3);all.Row("segment-v2",removed.segment_id,SerializeRecordingSegmentV2(removed));
        all.Row("media-path",removed.segment_id,"\"removed/file.mp4\"");
        RecordingSegmentStateV2 state;state.segment_id=removed.segment_id;state.lifecycle=RecordingLifecycle::DeletionPending;state.reason="continuous-capacity";
        all.Row("state-v2",state.segment_id,SerializeRecordingSegmentStateV2(state));all.Row("deletion-reason",state.segment_id,"\"continuous-capacity\"");
        RecordingTombstoneV2 tomb2;tomb2.tombstone_id="tomb-two";tomb2.segment=removed;tomb2.deletion_reason=state.reason;tomb2.deleted_at_ms=30;
        all.Row("tombstone-v2",removed.segment_id,SerializeRecordingTombstoneV2(tomb2));
        RecordingTombstoneV1 tomb;tomb.tombstone_id="tomb-one";tomb.segment_id="standalone";tomb.source_id="source";tomb.channel_id="channel";
        tomb.recorded_range={1000,2000};tomb.checksum_sha256=std::string(64,'a');tomb.retention_class=RecordingRetentionClass::Continuous;
        tomb.deletion_reason="continuous-age";tomb.deleted_at_ms=3000;all.Row("tombstone-v1",tomb.segment_id,SerializeRecordingTombstoneV1(tomb));
        ReferencedObservationV1 referenced;referenced.observation=v;referenced.observation.observation_id="referenced";
        referenced.observation.frame_locator.reset();referenced.observation.stream_epoch_id.clear();referenced.observation.locator_reason="unresolved";
        referenced.reference=input.job.intent.reference;auto& ref=referenced.reference;ref.reference_id="observation-reference";ref.kind="observation";
        ref.owner_id="referenced";ref.analysis_pts=v.pts;ref.request.reset();
        all.Row("referenced-observation","referenced",SerializeReferencedObservationV1(referenced));
        auto derived=V1();derived.segment_id="derived-legacy";derived.retention_class=RecordingRetentionClass::Event;
        all.Row("segment-v1",derived.segment_id,SerializeRecordingSegmentV1(derived));all.Row("media-path",derived.segment_id,"\"derived/file.mp4\"");
        EventRecordingLinkV1 link;link.link_id="link";link.event_id="event";link.source_id="different-source";link.channel_id="channel";link.stream_epoch_id="epoch";
        link.requested_range=UtcRangeV1{1000,2000};link.ordered_overlaps={{"legacy",{1000,2000}}};link.derived_segment_id=derived.segment_id;
        link.time_basis="utc-ms";link.created_at_ms=1000;link.updated_at_ms=2000;link.completeness_reason="event-terminal-release-recovery-pending";
        all.Row("event-link",link.link_id,SerializeEventRecordingLinkV1(link));all.Seal(root);
        std::set<std::string> kinds;for(const auto& row:all.snapshot.rows)kinds.insert(row.kind);
        Check(1,kinds.size()==16&&all.Build(root,&output)&&output.tombstones.size()==1&&output.tombstones_v2.size()==1&&
            output.referenced_observations.size()==1&&output.states_v2.size()==1,"all sixteen typed domain row kinds and standalone tombstone");
        Check(2,output.pending_hold_counts["legacy"]==1&&output.pending_hold_counts[derived.segment_id]==1,"pending terminal source/output hold reconstructed");
        bad=all;for(auto& row:bad.snapshot.rows)if(row.kind=="state-v2")row.value_json=SerializeRecordingSegmentStateV2({"media-server.recording-segment-state.v2",removed.segment_id,RecordingLifecycle::Corrupt,"checksum-mismatch"});
        bad.Seal({});Check(2,Rejected(bad,root),"tombstone requires matching deletion transition");
        bad=all;for(auto& row:bad.snapshot.rows)if(row.kind=="segment-v1"&&row.key=="legacy"){auto changed=s;changed.lifecycle=RecordingLifecycle::Corrupt;row.value_json=SerializeRecordingSegmentV1(changed);}
        bad.Seal({});Check(2,Rejected(bad,root),"pending hold rejects nonfinal source");
        bad=all;for(auto& row:bad.snapshot.rows)if(row.kind=="event-link"){auto changed=link;changed.channel_id="wrong-channel";row.value_json=SerializeEventRecordingLinkV1(changed);}
        bad.Seal({});Check(2,Rejected(bad,root),"event overlap channel mismatch");
        bad=all;for(auto& row:bad.snapshot.rows)if(row.kind=="event-link"){auto changed=link;changed.status=EventRecordingLinkStatus::Complete;
            changed.source_id="source";changed.derived_actual_range=UtcRangeV1{1000,2000};changed.completeness_reason.clear();row.value_json=SerializeEventRecordingLinkV1(changed);}
        auto deleted_derived=derived;deleted_derived.lifecycle=RecordingLifecycle::Deleted;
        for(auto& row:bad.snapshot.rows)if(row.kind=="segment-v1"&&row.key==derived.segment_id)row.value_json=SerializeRecordingSegmentV1(deleted_derived);
        bad.snapshot.rows.erase(std::remove_if(bad.snapshot.rows.begin(),bad.snapshot.rows.end(),[&](const auto& row){return row.kind=="media-path"&&row.key==derived.segment_id;}),bad.snapshot.rows.end());
        auto derived_tomb=tomb;derived_tomb.tombstone_id="derived-tomb";derived_tomb.segment_id=derived.segment_id;derived_tomb.retention_class=RecordingRetentionClass::Event;derived_tomb.deletion_reason="event-retention";
        bad.Row("tombstone-v1",derived.segment_id,SerializeRecordingTombstoneV1(derived_tomb));bad.Seal(root);
        Check(2,bad.Build(root,&output)&&output.pending_hold_counts.empty(),"complete historical derived may later be deleted");
        const auto ready_input=ReadyInput();auto ready=Active(ready_input);ready.Seal(root);
        Check(1,ready.Build(root,&output)&&output.active_jobs.begin()->second.state==DerivedJobState::Ready,"Ready full canonical cold detail");
        const auto& ready_segment=ready_input.job.ready->outputs[0].segment;
        ready.Row("segment-v2",ready_segment.segment_id,SerializeRecordingSegmentV2(ready_segment));
        ready.Row("media-path",ready_segment.segment_id,"\"independently/finalized.mp4\"");ready.Seal(root);
        Check(2,ready.Build(root,&output)&&output.active_jobs.size()==1,"Ready independently finalized output accepted");
        auto committed_input=ready_input;committed_input.job.state=DerivedJobState::Committed;auto committed=Active(committed_input);
        committed.Row("segment-v2",ready_segment.segment_id,SerializeRecordingSegmentV2(ready_segment));
        committed.Row("media-path",ready_segment.segment_id,"\""+committed_input.job.intent.outputs[0].final_relpath+"\"");committed.Seal(root);
        Check(1,committed.Build(root,&output)&&output.active_jobs.begin()->second.state==DerivedJobState::Committed,"Committed ready output and path closure");
        bad=committed;for(auto& row:bad.snapshot.rows)if(row.kind=="media-path"&&row.key==ready_segment.segment_id)row.value_json="\"different/file.mp4\"";
        bad.Seal({});Check(2,Rejected(bad,root),"Committed output path mismatch");
        bad=committed;bad.chain.head.name="identity-1.jsonl";Check(3,Rejected(bad,root),"identity head generation mismatch");
        bad=committed;bad.snapshot.rows.erase(std::remove_if(bad.snapshot.rows.begin(),bad.snapshot.rows.end(),[](const auto& row){return row.kind=="accepted-state"&&row.key=="bound";}),bad.snapshot.rows.end());
        bad.Seal({});Check(3,Rejected(bad,root),"accepted state omission");
        bad=committed;for(auto& row:bad.snapshot.rows)if(row.kind=="segment-v2"&&row.key=="segment")row.value_json="{}";
        bad.Seal({});Check(3,Rejected(bad,root),"structural object is not domain segment");
        const auto sealed_bytes=Read(root/"evidence-1-0.jsonl");
        for(auto& first:committed.chain.first_acceptances)if(first.mutation_id=="job-mutation")first.first_row.raw_sha256=std::string(64,'0');
        Check(3,Rejected(committed,root)&&Read(root/"evidence-1-0.jsonl")==sealed_bytes,"cold raw row corruption preserves original");
#else
        RecordingCatalogGenerationProjection out;out.manifest.store_id="sentinel";
        Check(4,!BuildRecordingCatalogGenerationProjection(root,{},{},{},0,&out,&error)&&out.manifest.store_id=="sentinel"&&error.find("unsupported")!=std::string::npos,"crypto-off fail closed unchanged");
#endif
    }catch(const std::exception& e){std::cerr<<"fixture failure: "<<e.what()<<'\n';return 2;}
    return std::all_of(good.begin(),good.end(),[](bool value){return value;})?0:1;
}
