// 파일 용도: S07 실제 관측 영속 경계의 독립 focused smoke.
#include "recording/recording_catalog.h"
#include "recording/analysis_observation_projector.h"
#include "analysis/object_tracker.h"
#include "core/recording_runtime_config_data.h"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <thread>
#include <chrono>
#if MEDIA_SERVER_USE_SQLITE3
#include <sqlite3.h>
#endif
using namespace recording;
static int failures = 0;
static void Check(bool ok, const char* name) {
    std::cout << (ok ? "[pass] " : "[fail] ") << name << '\n';
    if (!ok) ++failures;
}
static AnalysisObservationV2 Observation() {
    AnalysisObservationV2 v;
    v.observation_id="obs-one"; v.source_id="channel-one"; v.channel_id="channel-one";
    v.analysis_namespace="tap-one"; v.stream_epoch_id="epoch-one";
    v.pts=1500000000; v.track_id="track-one"; v.class_label="person";
    v.confidence=.8; v.bbox={.1,.2,.3,.4}; v.selection_reasons={"track-start"};
    v.first_seen_pts=v.pts; v.last_seen_pts=v.pts; v.created_at_ms=1500;
    v.zone_ids={"zone-one"}; v.line_ids={"line-one"}; v.rule_ids={"rule-one"}; v.scenario_ids={"scenario-one"};
    return v;
}
static RecordingSegmentV1 Segment(const std::string& id) {
    RecordingSegmentV1 s;
    s.segment_id=id; s.source_id="channel-one"; s.channel_id="channel-one";
    s.stream_epoch_id="epoch-one"; s.start={1000,1000000000,1,1000000000};
    s.end={2000,2000000000,1,1000000000}; s.container="mp4"; s.video_codecs={"h264"};
    s.audio_omitted_reason="source-no-audio"; s.size_bytes=12; s.checksum_sha256=std::string(64,'a');
    s.lifecycle=RecordingLifecycle::Finalized; s.created_at_ms=1000; s.finalized_at_ms=2000;
    return s;
}
int main(int argc, char** argv) {
    if(argc!=2) return 2;
    Check(ParseRecordingMutationType("observation_v2_put")!=RecordingMutationType::Unknown,"mutation-v2");
    std::string error;
    auto v=Observation(); AnalysisObservationV2 parsed;
    Check(ParseAnalysisObservationV2(SerializeAnalysisObservationV2(v),&parsed,&error) &&
          !parsed.frame_locator && parsed.pts==1500000000,"null-roundtrip");
    Check(parsed.zone_ids==std::vector<std::string>{"zone-one"} && parsed.line_ids==std::vector<std::string>{"line-one"} &&
          parsed.rule_ids==std::vector<std::string>{"rule-one"} && parsed.scenario_ids==std::vector<std::string>{"scenario-one"},"reference-roundtrip");
    auto invalid=v; invalid.created_at_ms=-1;
    Check(!ParseAnalysisObservationV2(SerializeAnalysisObservationV2(invalid),&parsed,&error),"negative-created-time");
    invalid=v; invalid.selection_reasons={"bogus"};
    Check(!ParseAnalysisObservationV2(SerializeAnalysisObservationV2(invalid),&parsed,&error),"negative-reason");
    invalid=v; invalid.selection_reasons={"track-end"}; invalid.duration_ns=1; invalid.ended_reason="tracker-terminated";
    Check(!ParseAnalysisObservationV2(SerializeAnalysisObservationV2(invalid),&parsed,&error),"negative-summary");
    invalid=v; invalid.pts=v.last_seen_pts+1;
    Check(!ParseAnalysisObservationV2(SerializeAnalysisObservationV2(invalid),&parsed,&error),"negative-observation-range");
    invalid=v; invalid.bbox.width=1;
    Check(!ParseAnalysisObservationV2(SerializeAnalysisObservationV2(invalid),&parsed,&error),"negative-bbox");
    const std::filesystem::path root(argv[1]);
    std::filesystem::create_directories(root/"media");
    const auto path=root/"media"/"one.mp4";
    { std::ofstream out(path,std::ios::binary); const char bytes[12]={0,0,0,12,'f','t','y','p','i','s','o','m'}; out.write(bytes,12); }
    RecordingJournal journal(root/"journal.jsonl"); Check(journal.Open(&error),"journal-open");
    {
        RecordingCatalog catalog(journal,{root/"catalog.sqlite3",root/"media",true});
        Check(catalog.Open(&error),"catalog-open");
        Check(catalog.PutObservationV2(v,&error),"null-put");
        Check(catalog.ResolveObservationV2(v).locator_reason=="gap","gap-null");
        auto missing=v; missing.stream_epoch_id.clear();
        Check(catalog.ResolveObservationV2(missing).locator_reason=="missing-provenance","missing-provenance-null");
        Check(catalog.FinalizeSegment(Segment("segment-one"),path.string(),&error),"segment-finalize");
        v=catalog.ResolveObservationV2(v);
        const bool located=v.frame_locator && v.frame_locator->frame.utc_ms==1500 &&
            v.frame_locator->keyframe_pts==1000000000 && !v.frame_locator->frame_index;
        Check(located,"pending-resolve");
        if(located) {
            Check(ParseAnalysisObservationV2(SerializeAnalysisObservationV2(v),&parsed,&error) && parsed.frame_locator &&
                  parsed.frame_locator->segment_id=="segment-one","located-roundtrip");
            invalid=v; invalid.frame_locator->frame.pts=1500000001;
            Check(!ParseAnalysisObservationV2(SerializeAnalysisObservationV2(invalid),&parsed,&error),"negative-locator-pts");
            invalid=v; invalid.frame_locator->frame.utc_ms=1600;
            Check(!catalog.PutObservationV2(invalid,&error),"locator-put-reject");
            Check(catalog.PutObservationV2(v,&error),"located-put");
            invalid=v; invalid.track_id="other-track";
            Check(!catalog.PutObservationV2(invalid,&error),"identity-put-reject");
            Check(catalog.PutObservationV2(v,&error),"identity-restore");
            auto event=v; event.selection_reasons={"event"}; event.event_ids={"event-one"};
            Check(catalog.PutObservationV2(event,&error),"event-put");
            const auto merged=catalog.QueryObservationsV2("channel-one");
            Check(merged.size()==1 && merged[0].selection_reasons.size()==2 && merged[0].event_ids.size()==1,"reasons-merge");
            std::filesystem::rename(path,root/"media"/"held.mp4");
            Check(!catalog.ResolveObservationV2(v).frame_locator,"missing-media-null");
            std::filesystem::rename(root/"media"/"held.mp4",path);
            AnalysisObservationV1 old;
            old.observation_id="old-one"; old.source_id=v.source_id; old.channel_id=v.channel_id;
            old.frame_locator=*v.frame_locator; old.track_id=v.track_id; old.class_label="person";
            old.confidence=.8; old.bbox=v.bbox; old.selection_reason="interval"; old.created_at_ms=1500;
            AnalysisObservationV1 old_parsed;
            const auto old_json=SerializeAnalysisObservationV1(old);
            Check(ParseAnalysisObservationV1(old_json,&old_parsed,&error) &&
                  SerializeAnalysisObservationV1(old_parsed)==old_json && catalog.PutObservation(old,&error),"v1-roundtrip");
        }
        Check(catalog.RequestDeletion("segment-one","test",&error),"deletion-request");
        auto rows=catalog.QueryObservationsV2("channel-one");
        Check(rows.size()==1 && !rows[0].frame_locator && rows[0].locator_reason=="deleted","deleted-null");
    }
    {
        RecordingCatalog rebuilt(journal,{root/"catalog.sqlite3",root/"media",true});
        Check(rebuilt.Open(&error),"sqlite-reopen");
        RecordingCatalog reopened(journal,{root/"unused.sqlite3",root/"media",false});
        Check(reopened.Open(&error),"journal-replay");
        const auto rows=reopened.QueryObservationsV2("channel-one");
        Check(rows.size()==1 && rows[0].pts==1500000000 && rows[0].locator_reason=="deleted","jsonl-parity");
    }
#if MEDIA_SERVER_USE_SQLITE3
    sqlite3* db=nullptr; sqlite3_stmt* stmt=nullptr;
    const bool sqlite_ok=sqlite3_open((root/"catalog.sqlite3").c_str(),&db)==SQLITE_OK &&
        sqlite3_prepare_v2(db,"SELECT pts,payload_json FROM recording_observations_v2",-1,&stmt,nullptr)==SQLITE_OK &&
        sqlite3_step(stmt)==SQLITE_ROW && sqlite3_column_int64(stmt,0)==1500000000;
    Check(sqlite_ok,"sqlite-projection");
    bool payload_ok=false;
    if(sqlite_ok) {
        const auto* raw=reinterpret_cast<const char*>(sqlite3_column_text(stmt,1));
        AnalysisObservationV2 db_observation;
        payload_ok=raw && ParseAnalysisObservationV2(raw,&db_observation,&error) &&
            db_observation.source_id=="channel-one" && db_observation.channel_id=="channel-one" &&
            db_observation.analysis_namespace=="tap-one" && db_observation.stream_epoch_id=="epoch-one" &&
            db_observation.track_id=="track-one" && db_observation.class_label=="person" &&
            db_observation.confidence==.8 && db_observation.bbox.x==.1 && db_observation.bbox.y==.2 &&
            db_observation.bbox.width==.3 && db_observation.bbox.height==.4 &&
            db_observation.selection_reasons==std::vector<std::string>{"track-start","event"} &&
            db_observation.event_ids==std::vector<std::string>{"event-one"} &&
            db_observation.zone_ids==std::vector<std::string>{"zone-one"} &&
            db_observation.line_ids==std::vector<std::string>{"line-one"} &&
            db_observation.rule_ids==std::vector<std::string>{"rule-one"} &&
            db_observation.scenario_ids==std::vector<std::string>{"scenario-one"} &&
            db_observation.first_seen_pts==1500000000 && db_observation.last_seen_pts==1500000000 &&
            !db_observation.duration_ns && db_observation.ended_reason.empty() && db_observation.created_at_ms==1500;
    }
    Check(payload_ok,"sqlite-payload-parity");
    if(stmt) sqlite3_finalize(stmt);
    if(db) sqlite3_close(db);
#else
    std::cout << "[not-run] sqlite-projection: SQLite unavailable; JSONL fallback exercised\n";
#endif
    {
        RecordingJournal sampled_journal(root/"sampled.jsonl");
        Check(sampled_journal.Open(&error),"sampling-journal-open");
        RecordingCatalog catalog(sampled_journal,{root/"sampled.sqlite3",root/"media",false});
        Check(catalog.Open(&error),"sampling-catalog-open");
        AnalysisObservationProjector projector(catalog,{1000,256,8,128});
        for(int i=0;i<1800;++i) {
            auto frame=Observation(); frame.pts=static_cast<std::int64_t>(i)*1000000000/30;
            frame.first_seen_pts=0; frame.last_seen_pts=frame.pts; frame.selection_reasons.clear();
            projector.Submit(frame);
        }
        projector.StopNamespace("tap-one");
        projector.StopNamespace("tap-one");
        projector.StopAndDrain();
        const auto rows=catalog.QueryObservationsV2("channel-one");
        std::size_t starts=0,intervals=0,ends=0;
        for(const auto& row:rows) for(const auto& reason:row.selection_reasons) {
            if(reason=="track-start") ++starts;
            if(reason=="interval") ++intervals;
            if(reason=="track-end") { ++ends; Check(row.duration_ns==59966666666,"stop-duration"); }
        }
        Check(starts==1,"sampling-start");
        Check(intervals>0 && intervals<=60 && rows.size()<=62,"sampling-60s-bound");
        Check(ends==1,"stop-once");
        Check(projector.GetStatus().queued==0 && projector.GetStatus().pending==0,"drain-bounded");
    }
    {
        RecordingJournal jobs(root/"jobs.jsonl"); Check(jobs.Open(&error),"jobs-journal-open");
        RecordingCatalog catalog(jobs,{root/"jobs.sqlite3",root/"media",false});
        Check(catalog.Open(&error),"jobs-catalog-open");
        AnalysisObservationProjector projector(catalog,{1000,32,2,16});
        bool accepted=true;
        for(int i=0;i<5;++i) {
            auto end=Observation(); end.track_id="track-"+std::to_string(i);
            end.selection_reasons={"track-end"};
            accepted=projector.Submit(end) && accepted;
        }
        Check(accepted,"ended-state-reuse");
        for(int i=0;i<100 && projector.GetStatus().stored<2;++i)
            std::this_thread::sleep_for(std::chrono::milliseconds(2));
        const auto before=projector.GetStatus().stored;
        projector.NotifyFinalized();
        for(int i=0;i<100 && projector.GetStatus().stored<=before;++i)
            std::this_thread::sleep_for(std::chrono::milliseconds(2));
        Check(projector.GetStatus().pending>0,"pending-unrelated-finalize");
        projector.StopAndDrain();
    }
    {
        analysis::ObjectTrackerOptions options;
        options.max_missed_frames=1;
        analysis::ObjectTracker tracker(options);
        analysis::AnalysisResult first;
        first.pts=1000000000;
        analysis::Detection detection;
        detection.class_id=0; detection.label="person"; detection.score=.9;
        detection.box={.1F,.1F,.2F,.2F}; first.detections.push_back(detection);
        tracker.Update(&first);
        Check(first.tracks.size()==1,"tracker-start");
        RecordingJournal runtime_journal(root/"runtime.jsonl"); Check(runtime_journal.Open(&error),"runtime-journal-open");
        RecordingCatalog runtime_catalog(runtime_journal,{root/"runtime.sqlite3",root/"media",false});
        Check(runtime_catalog.Open(&error),"runtime-catalog-open");
        AnalysisObservationProjector observer(runtime_catalog,{1000,32,16,16});
        first.observation_context={"channel-one","channel-one","epoch-one","pending"};
        first.observation_namespace="runtime-one";
        observer.OnResult(first);
        observer.OnEvent(first,"event-runtime",first.tracks[0].track_id,"zone-runtime","line-runtime","rule-runtime","scenario-runtime");
        analysis::AnalysisResult missed; missed.pts=2000000000; tracker.Update(&missed);
        analysis::AnalysisResult ended; ended.pts=3000000000; tracker.Update(&ended);
        Check(ended.terminated_tracks.size()==1 && ended.terminated_tracks[0].first_seen_pts==1000000000 &&
              ended.terminated_tracks[0].last_seen_pts==1000000000,"tracker-terminated-copy");
        analysis::AnalysisResult again; again.pts=4000000000; tracker.Update(&again);
        Check(again.terminated_tracks.empty(),"tracker-terminated-once");
        ended.observation_context=first.observation_context;
        ended.observation_namespace=first.observation_namespace;
        observer.OnResult(ended);
        observer.StopAndDrain();
        const auto runtime=runtime_catalog.QueryObservationsV2("channel-one");
        Check(runtime.size()==1 && runtime[0].selection_reasons.size()==3 && runtime[0].duration_ns==0,"observer-tracker-start-event-end");
        Check(runtime.size()==1 && runtime[0].event_ids==std::vector<std::string>{"event-runtime"} &&
              runtime[0].zone_ids==std::vector<std::string>{"zone-runtime"} &&
              runtime[0].line_ids==std::vector<std::string>{"line-runtime"} &&
              runtime[0].rule_ids==std::vector<std::string>{"rule-runtime"} &&
              runtime[0].scenario_ids==std::vector<std::string>{"scenario-runtime"},"observer-event-provenance");
    }
    {
        RecordingJournal late_journal(root/"late.jsonl"); Check(late_journal.Open(&error),"late-journal-open");
        RecordingCatalog catalog(late_journal,{root/"late.sqlite3",root/"media",false});
        Check(catalog.Open(&error),"late-catalog-open");
        AnalysisObservationProjector projector(catalog,{1000,64,8,32});
        auto first=Observation(); first.selection_reasons.clear(); projector.Submit(first);
        auto last=first; last.pts+=1000000000; last.last_seen_pts=last.pts; projector.Submit(last);
        auto event=first; event.selection_reasons={"event"}; event.event_ids={"late-before"}; projector.Submit(event);
        last.selection_reasons={"track-end"}; projector.Submit(last);
        event.event_ids={"late-after"}; projector.Submit(event);
        projector.StopAndDrain();
        bool before=false,after=false;
        for(const auto& row:catalog.QueryObservationsV2("channel-one"))for(const auto& id:row.event_ids) {
            if(id=="late-before")before=true;
            if(id=="late-after")after=true;
        }
        Check(before,"delayed-event-before-latest"); Check(after,"delayed-event-after-end");
    }
    {
        core::RecordingRuntimeConfigData config; config.recording_observation_interval_ms=0;
        Check(!core::ValidateRecordingRuntimeConfig(config,&error),"config-zero-reject");
        config.recording_observation_interval_ms=250;
        Check(core::ValidateRecordingRuntimeConfig(config,&error),"config-positive");
        RecordingJournal overload_journal(root/"overload.jsonl"); overload_journal.Open(&error);
        RecordingCatalog catalog(overload_journal,{root/"overload.sqlite3",root/"media",false}); catalog.Open(&error);
        AnalysisObservationProjector projector(catalog,{1000,1,8,8});
        for(int i=0;i<1000;++i) {
            auto event=Observation(); event.pts+=i; event.last_seen_pts=event.pts;
            event.selection_reasons={"event"}; event.event_ids={"overload-"+std::to_string(i)};
            projector.Submit(event);
        }
        Check(projector.GetStatus().critical_rejected>0,"critical-overload-visible");
        Check(projector.GetStatus().queued<=1 && projector.GetStatus().pending<=8 && projector.GetStatus().tracks<=8,"queue-cap");
        std::thread one([&]{projector.StopAndDrain();});
        std::thread two([&]{projector.StopAndDrain();}); one.join();two.join();
        Check(projector.GetStatus().queued==0 && projector.GetStatus().tracks==0,"concurrent-stop");
    }
    {
        RecordingJournal isolated(root/"isolated.jsonl");isolated.Open(&error);
        RecordingCatalog catalog(isolated,{root/"isolated.sqlite3",root/"media",false});catalog.Open(&error);
        AnalysisObservationProjector projector(catalog,{1000,32,16,32});
        auto first=Observation();first.analysis_namespace=std::string(128,'n');
        auto second=first;second.analysis_namespace=std::string(128,'m');
        first.selection_reasons={"track-end"};second.selection_reasons={"track-end"};
        projector.Submit(first);projector.Submit(second);projector.StopAndDrain();
        const auto rows=catalog.QueryObservationsV2("channel-one");
        Check(rows.size()==2 && rows[0].analysis_namespace!=rows[1].analysis_namespace,"multi-namespace");
        Check(rows.size()==2 && rows[0].observation_id.size()<=128 && rows[1].observation_id.size()<=128 &&
              rows[0].observation_id!=rows[1].observation_id,"bounded-id");
    }
    {
        RecordingJournal unopened(root/"unopened.jsonl");
        RecordingCatalog unavailable(unopened,{root/"unopened.sqlite3",root/"media",false});
        AnalysisObservationProjector projector(unavailable,{1000,8,8,8});
        projector.Submit(Observation());projector.StopAndDrain();
        Check(projector.GetStatus().storage_errors>0 && projector.GetStatus().last_error=="observation-storage-failed","storage-failure-counter");
    }
    {
        RecordingJournal pending_journal(root/"pending.jsonl");pending_journal.Open(&error);
        RecordingCatalog catalog(pending_journal,{root/"pending.sqlite3",root/"media",false});catalog.Open(&error);
        AnalysisObservationProjector projector(catalog,{1000,16,8,8});
        projector.Submit(Observation());
        for(int i=0;i<100 && projector.GetStatus().pending==0;++i)std::this_thread::sleep_for(std::chrono::milliseconds(2));
        Check(catalog.FinalizeSegment(Segment("pending-one"),path.string(),&error),"pending-segment-finalize");
        projector.NotifyFinalized();
        bool located=false;
        for(int i=0;i<100 && !located;++i) {
            const auto rows=catalog.QueryObservationsV2("channel-one");located=rows.size()==1 && rows[0].frame_locator.has_value();
            if(!located)std::this_thread::sleep_for(std::chrono::milliseconds(2));
        }
        Check(located,"pending-finalize-automatic");projector.StopAndDrain();
        std::filesystem::copy_file(path,root/"media"/"two.mp4");
        Check(catalog.FinalizeSegment(Segment("pending-two"),(root/"media"/"two.mp4").string(),&error),"ambiguous-segment-finalize");
        Check(catalog.ResolveObservationV2(Observation()).locator_reason=="ambiguous-epoch","ambiguous-null");
    }
    {
        RecordingJournal corrupt_journal(root/"corrupt.jsonl");corrupt_journal.Open(&error);
        {
            RecordingCatalog catalog(corrupt_journal,{root/"corrupt.sqlite3",root/"media",false});catalog.Open(&error);
            catalog.FinalizeSegment(Segment("corrupt-one"),path.string(),&error);
        }
        { std::ofstream damaged(path,std::ios::binary|std::ios::trunc); const char bad[12]={}; damaged.write(bad,12); }
        RecordingCatalog reopened(corrupt_journal,{root/"corrupt.sqlite3",root/"media",false});reopened.Open(&error);
        Check(reopened.ResolveObservationV2(Observation()).locator_reason=="corrupt","corrupt-null");
    }
    {
        RecordingJournal refs_journal(root/"refs.jsonl");refs_journal.Open(&error);
        RecordingCatalog catalog(refs_journal,{root/"refs.sqlite3",root/"media",false});catalog.Open(&error);
        AnalysisObservationProjector projector(catalog,{1000,32,8,8});
        auto event=Observation();event.selection_reasons={"event"};
        for(int i=0;i<64;++i)event.event_ids.push_back("event-"+std::to_string(i));
        projector.Submit(event);event.event_ids={"event-extra"};projector.Submit(event);projector.StopAndDrain();
        const auto status=projector.GetStatus();
        Check(status.critical_rejected+status.storage_errors>0,"reference-overflow-visible");
    }
    {
        RecordingJournal adversarial(root/"adversarial.jsonl");adversarial.Open(&error);
        {
            RecordingCatalog catalog(adversarial,{root/"adversarial.sqlite3",root/"media",true});catalog.Open(&error);
            catalog.PutObservationV2(Observation(),&error);
        }
        auto invalid_identity=Observation();invalid_identity.track_id="attacker-track";
        RecordingMutationV1 mutation;mutation.mutation_id="adversarial-mutation";mutation.entity_id=invalid_identity.observation_id;
        mutation.mutation_type=RecordingMutationType::ObservationV2Put;mutation.occurred_at_ms=2000;
        mutation.payload_json="{\"observation\":"+SerializeAnalysisObservationV2(invalid_identity)+"}";
        adversarial.Append(mutation,&error);
        {
            RecordingCatalog reopened(adversarial,{root/"adversarial.sqlite3",root/"media",true});
            Check(reopened.Open(&error),"replay-identity-open");
            const auto rows=reopened.QueryObservationsV2("channel-one");
            Check(rows.size()==1 && rows[0].track_id=="track-one" && reopened.recovery_report().projection_error_count==1,"replay-identity-memory");
        }
#if MEDIA_SERVER_USE_SQLITE3
        sqlite3* db=nullptr;sqlite3_stmt* statement=nullptr;
        bool ok=sqlite3_open((root/"adversarial.sqlite3").c_str(),&db)==SQLITE_OK &&
            sqlite3_prepare_v2(db,"SELECT payload_json FROM recording_observations_v2",-1,&statement,nullptr)==SQLITE_OK &&
            sqlite3_step(statement)==SQLITE_ROW;
        AnalysisObservationV2 restored;
        if(ok) {
            const auto* raw=reinterpret_cast<const char*>(sqlite3_column_text(statement,0));
            ok=raw && ParseAnalysisObservationV2(raw,&restored,&error) && restored.track_id=="track-one";
        }
        Check(ok,"replay-identity-sqlite");
        if(statement)sqlite3_finalize(statement);
        if(db)sqlite3_close(db);
#endif
    }
    std::cout << "S07 core failures=" << failures << '\n';
    return failures ? 1 : 0;
}
