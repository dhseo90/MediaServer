// 파일 용도: FR09~16: 실제 writer/remux/bridge와 SQLite·fallback 재시작 경계를 검사한다.
#include "recording/gstreamer_segment_writer.h"
#include "recording/event_recording_bridge.h"
#include "recording/recording_media_inspector.h"
#include <gst/app/gstappsink.h>
#include <gst/gst.h>
#include <atomic>
#include <chrono>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <thread>
#include <sqlite3.h>

namespace {
using namespace recording;
namespace fs=std::filesystem;
int passes=0;
void Check(bool ok,const std::string& label) {
    std::cout<<(ok?"[pass] ":"[fail] ")<<label<<'\n';
    if(!ok)throw std::runtime_error(label);
    ++passes;
}
std::string Read(const fs::path& path) {
    std::ifstream input(path,std::ios::binary);
    return {std::istreambuf_iterator<char>(input),{}};
}
std::string Sha(const std::string& text) {
    gchar* raw=g_compute_checksum_for_data(G_CHECKSUM_SHA256,reinterpret_cast<const guchar*>(text.data()),text.size());
    std::string out=raw?raw:"";g_free(raw);return out;
}
std::size_t Count(const fs::path& root,const std::string& suffix) {
    std::size_t count=0;
    if(fs::exists(root))for(const auto& entry:fs::recursive_directory_iterator(root))
        if(entry.path().extension()==suffix)++count;
    return count;
}
std::uint64_t Hold(RecordingCatalog& c,const std::string& id) {
    for(const auto& row:c.RetentionSnapshot().candidates)if(row.segment.segment_id==id)return row.hold_count;
    return 0;
}
std::vector<media::Packet> Packets(media::StreamDescriptor* descriptor) {
    GError* error=nullptr;
    GstElement* pipeline=gst_parse_launch("videotestsrc num-buffers=30 ! video/x-raw,width=160,height=90,framerate=10/1 ! x264enc tune=zerolatency speed-preset=ultrafast key-int-max=5 ! video/x-h264,stream-format=byte-stream,alignment=au ! appsink name=sink sync=false",&error);
    if(!pipeline||error)throw std::runtime_error("fixture pipeline 생성 실패");
    auto* sink=gst_bin_get_by_name(GST_BIN(pipeline),"sink");
    gst_element_set_state(pipeline,GST_STATE_PLAYING);
    std::vector<media::Packet> packets;
    while(auto* sample=gst_app_sink_try_pull_sample(GST_APP_SINK(sink),5*GST_SECOND)) {
        auto* buffer=gst_sample_get_buffer(sample);GstMapInfo map{};
        if(gst_buffer_map(buffer,&map,GST_MAP_READ)) {
            media::Packet p;p.kind=media::MediaKind::Video;p.codec=media::CodecId::H264;p.track_id="video-0";
            p.is_key_frame=!GST_BUFFER_FLAG_IS_SET(buffer,GST_BUFFER_FLAG_DELTA_UNIT);
            p.pts=GST_BUFFER_PTS(buffer);p.dts=GST_BUFFER_DTS(buffer);p.payload.assign(map.data,map.data+map.size);
            packets.push_back(std::move(p));gst_buffer_unmap(buffer,&map);
        }
        if(descriptor->tracks.empty()) {
            auto* text=gst_caps_to_string(gst_sample_get_caps(sample));
            descriptor->tracks.push_back({"video-0",media::MediaKind::Video,media::CodecId::H264,"h264",text,0,0});g_free(text);
        }
        gst_sample_unref(sample);
    }
    gst_element_set_state(pipeline,GST_STATE_NULL);gst_object_unref(sink);gst_object_unref(pipeline);
    return packets;
}
struct Written { RecordingSegmentV1 segment;fs::path path; };
Written Writer(const fs::path& root,const media::StreamDescriptor& descriptor,const std::vector<media::Packet>& packets,bool fail) {
    Written result;std::string error;int callbacks=0,admissions=0,completions=0;
    GStreamerSegmentWriter::Options options(root,fail?500:60000);
    options.admit_segment=[&](const std::string&,std::uint64_t minimum){++admissions;return SegmentAdmissionDecision{true,false,std::max<std::uint64_t>(minimum,16*1024*1024)};};
    options.complete_segment=[&](const std::string&,std::uint64_t bytes){Check(bytes>0,"FR09 completion actual bytes");++completions;};
    GStreamerSegmentWriter writer(options);
    Check(writer.Start("channel-one","epoch-one",descriptor,[&](RecordingSegmentV1 s,std::string path,std::string*) {
        ++callbacks;result={s,path};
        Check(fs::exists(path+".finalize-ready"),"FR09 callback observes durable ready");
        Check(fs::exists(path+".cleanup-pending"),"FR09 callback observes owned marker");
        Check(Sha(Read(path))==s.checksum_sha256&&fs::file_size(path)==s.size_bytes,"FR09 exact final bytes metadata");
        return !fail;
    },&error),"FR09 writer start");
    for(const auto& p:packets)writer.Push(p,1000+(p.pts-packets.front().pts)/1000000);
    if(fail) {
        Check(callbacks==1&&admissions==1,"FR10 failure occurs during Push and blocks later packet admission before Stop");
        for(const auto& p:packets)writer.Push(p,9000+(p.pts-packets.front().pts)/1000000);
        Check(callbacks==1&&admissions==1&&completions==0,"FR10 repeated Push while started cannot bypass recovery pending");
    }
    writer.Stop();
    Check(callbacks==1,"FR09 exactly one finalized callback");
    if(fail) {
        const auto before=Read(result.path);
        for(const auto& p:packets)writer.Push(p,9000+(p.pts-packets.front().pts)/1000000);
        writer.Stop();
        Check(callbacks==1&&admissions==1&&completions==0,"FR10 failure blocks repeat admission and reservation release");
        Check(Read(result.path)==before&&Count(root,".finalize-ready")==1&&Count(root,".cleanup-pending")==1,"FR10 Stop preserves media ready marker");
        RecordingJournal j(root/"journal.jsonl");Check(j.Open(&error),"FR10 recovery journal");
        RecordingCatalog c(j,{root/"catalog.db",root,false});Check(c.Open(&error),"FR10 recovery Open preserves ready");
        FinalizeRecoveryReport r;Check(RecoverFinalizeReadyTickets(c,root,&r,&error)&&r.recovered==1,"FR10 restart recovers callback failure original ID");
    } else Check(completions==1&&Count(root,".finalize-ready")==0&&Count(root,".cleanup-pending")==0,"FR09 successful cleanup and reservation completion");
    return result;
}
EventClipDeriveRequest Request(const Written& source,const fs::path& root,const std::string& event) {
    EventClipDeriveRequest r;r.event_id=event;r.link_id="link-"+event;r.source_id=source.segment.source_id;r.channel_id=source.segment.channel_id;
    r.requested_range={1500,2500};r.sources={{source.segment,source.path,r.requested_range}};r.output_root=root;r.created_at_ms=4000;
    r.output_epoch_id="event-epoch-sha256-"+Sha(source.segment.stream_epoch_id);
    r.output_segment_id="event-seg-sha256-"+Sha(event+"\n1500\n2500\n"+source.segment.stream_epoch_id);r.max_output_bytes=16*1024*1024;
    EventRecordingLinkV1 l;l.link_id=r.link_id;l.event_id=event;l.source_id=r.source_id;l.channel_id=r.channel_id;l.stream_epoch_id=source.segment.stream_epoch_id;
    l.requested_range=r.requested_range;l.ordered_overlaps={{source.segment.segment_id,r.requested_range}};l.derived_segment_id=r.output_segment_id;
    l.time_basis="utc-ms";l.completeness_reason="event-catalog-finalize-recovery-pending";l.created_at_ms=4000;l.updated_at_ms=4000;r.ready_link=l;return r;
}
class ObservedDeriver final:public EventClipDeriver {
public:
    EventClipDeriveResult Derive(const EventClipDeriveRequest& r) override {
        saw_ready=r.ready_link.has_value()&&!r.output_epoch_id.empty()&&r.created_at_ms>0&&r.max_output_bytes>0;
        ++calls;return actual.Derive(r);
    }
    std::atomic<int> calls{0};std::atomic<bool> saw_ready{false};GStreamerEventClipDeriver actual;
};
void LogicalQuarantine(const fs::path& root,const Written& original) {
    fs::create_directories(root);std::string error;
    const auto final=fs::path(original.segment.segment_id+".mp4");
    const auto partial=fs::path(final.string()+".partial.123e4567-e89b-42d3-a456-426614174000");
    fs::copy_file(original.path,root/final);
    FinalizeReadyTicket ticket{original.segment,partial,final,std::nullopt};
    {
        RecordingJournal j(root/"journal.jsonl");Check(j.Open(&error),"FR06 known journal");
        RecordingCatalog c(j,{root/"catalog.db",root,true});Check(c.Open(&error),"FR06 known catalog");
        Check(c.FinalizeSegment(original.segment,(root/final).string(),&error),"FR06 known original metadata");
        Check(WriteFinalizeReadyTicket(root,ticket,&error),"FR06 known ready");
        auto bytes=Read(root/final);bytes[bytes.size()/2]^=1;{std::ofstream out(root/final,std::ios::binary);out<<bytes;}
        Check(c.AdjustHoldCount(original.segment.segment_id,1,&error),"FR06 temporary hold fixture");
        FinalizeRecoveryReport report;const auto journal=Read(root/"journal.jsonl");
        Check(!RecoverFinalizeReadyTickets(c,root,&report,&error)&&fs::exists(root/(final.string()+".finalize-ready.corrupt-info"))&&Read(root/"journal.jsonl")==journal,"FR06 durable diagnostic before rejected Mark preserves journal");
        Check(c.AdjustHoldCount(original.segment.segment_id,-1,&error),"FR06 release fixture hold");
    }
    {
        RecordingJournal j(root/"journal.jsonl");Check(j.Open(&error),"FR06 before Mark restart journal");
        RecordingCatalog c(j,{root/"catalog.db",root,true});Check(c.Open(&error),"FR06 before Mark restart catalog");
        FinalizeRecoveryReport report;
        Check(RecoverFinalizeReadyTickets(c,root,&report,&error)&&report.quarantined==1&&c.FindSegmentById(original.segment.segment_id)->lifecycle==RecordingLifecycle::Corrupt,"FR06 diagnostic before Mark crash converges to Corrupt");
    }
    {
        RecordingJournal j(root/"journal.jsonl");Check(j.Open(&error),"FR06 after Mark restart journal");
        RecordingCatalog c(j,{root/"catalog.db",root,true});Check(c.Open(&error),"FR06 after Mark restart catalog");
        FinalizeRecoveryReport report;const auto journal=Read(root/"journal.jsonl");
        Check(RecoverFinalizeReadyTickets(c,root,&report,&error)&&report.quarantined==1&&Read(root/"journal.jsonl")==journal,"FR06 after Mark crash repeat no append");
        const auto diagnostic=root/(final.string()+".finalize-ready.corrupt-info");
        {std::ofstream out(diagnostic,std::ios::trunc);out<<"conflicting diagnostic";}
        Check(!RecoverFinalizeReadyTickets(c,root,&report,&error)&&Read(diagnostic)=="conflicting diagnostic"&&Read(root/"journal.jsonl")==journal&&fs::exists(root/final),"FR06 diagnostic conflict preserves original and journal");
    }
}
void Event(const fs::path& root,const Written& original,bool sqlite) {
    fs::create_directories(root);Written source=original;source.path=root/"source.mp4";fs::copy_file(original.path,source.path);
    std::string error;auto req=Request(source,root,"event-one");EventClipDeriveResult derived;
    {
        RecordingJournal j(root/"journal.jsonl");Check(j.Open(&error),"FR16 event journal open");
        RecordingCatalog c(j,{root/"catalog.db",root,sqlite});Check(c.Open(&error),"FR16 event catalog open");
        Check(c.catalog_mode()==(sqlite?"sqlite-primary":"jsonl-fallback"),"FR16 actual catalog mode");
        Check(c.FinalizeSegment(source.segment,source.path.string(),&error),"FR12 original source registered");
        Check(c.PutEventLink(*req.ready_link,&error),"FR12 durable Pending precedes remux");
        GStreamerEventClipDeriver d;derived=d.Derive(req);
        Check(derived.ok&&derived.ready_ticket.has_value(),"FR11 actual MPEGTS remux ready");
        Check(InspectRecordingMedia(root,derived.media_path.lexically_relative(root),derived.ready_ticket->segment).state==MediaInspectionState::Healthy,"FR11 actual tsdemux healthy");
        const auto ready_path=fs::path(derived.media_path.string()+".finalize-ready");
        const auto valid_ready=Read(ready_path);auto invalid_ready=valid_ready;
        const auto epoch_pos=invalid_ready.find(req.output_epoch_id);
        Check(epoch_pos!=std::string::npos,"FR12 ready contains derived epoch fixture");
        invalid_ready.replace(epoch_pos,req.output_epoch_id.size(),"wrong-epoch");
        {std::ofstream out(ready_path);out<<invalid_ready;}
        FinalizeRecoveryReport invalid_report;
        Check(!RecoverFinalizeReadyTickets(c,root,&invalid_report,&error)&&Read(ready_path)==invalid_ready&&!c.FindSegmentById(req.output_segment_id),"FR12 raw mismatched event epoch recovery rejects without registration");
        {std::ofstream out(ready_path);out<<valid_ready;}
        FinalizeRecoveryReport report;
        Check(RecoverFinalizeReadyTickets(c,root,&report,&error)&&report.recovered==1,"FR13 new event output recovered");
        Check(Hold(c,source.segment.segment_id)==1&&Hold(c,req.output_segment_id)==1,"FR13 source and new output holds exactly once");
        Check(c.QuerySegments(req.channel_id,1500,2500).size()==2,"FR16 query contains source and recovered output");
        if(sqlite) {
            sqlite3* db=nullptr;sqlite3_stmt* stmt=nullptr;
            Check(sqlite3_open_v2((root/"catalog.db").c_str(),&db,SQLITE_OPEN_READONLY,nullptr)==SQLITE_OK,"FR16 direct SQLite open");
            const char* sql="SELECT lifecycle,codecs_json FROM recording_segments WHERE segment_id=?";
            Check(sqlite3_prepare_v2(db,sql,-1,&stmt,nullptr)==SQLITE_OK,"FR16 direct SQLite prepare");
            sqlite3_bind_text(stmt,1,req.output_segment_id.c_str(),-1,SQLITE_TRANSIENT);
            const bool row=sqlite3_step(stmt)==SQLITE_ROW;
            const std::string state=row?reinterpret_cast<const char*>(sqlite3_column_text(stmt,0)):"";
            const std::string raw=row?reinterpret_cast<const char*>(sqlite3_column_text(stmt,1)):"";
            RecordingSegmentV1 projected;const bool exact=ParseRecordingSegmentV1(raw,&projected,&error)&&SerializeRecordingSegmentV1(projected)==SerializeRecordingSegmentV1(derived.ready_ticket->segment);
            sqlite3_finalize(stmt);sqlite3_close(db);
            Check(row&&state=="finalized"&&exact,"FR16 actual SQL lifecycle and exact codec metadata projection");
        }
        Check(WriteFinalizeReadyTicket(root,*derived.ready_ticket,&error),"FR14 recreate exact postcommit stale ready");
    }
    {
        RecordingJournal j(root/"journal.jsonl");Check(j.Open(&error),"FR14 restart journal");
        RecordingCatalog c(j,{root/"catalog.db",root,sqlite});Check(c.Open(&error),"FR14 restart catalog");
        Check(Hold(c,source.segment.segment_id)==1&&Hold(c,req.output_segment_id)==1,"FR14 Open restores source output holds");
        const auto before=Read(root/"journal.jsonl");FinalizeRecoveryReport report;
        Check(RecoverFinalizeReadyTickets(c,root,&report,&error)&&report.already_committed==1&&Read(root/"journal.jsonl")==before,"FR14 committed replay no journal append");
        Check(Hold(c,source.segment.segment_id)==1&&Hold(c,req.output_segment_id)==1,"FR14 committed recovery no duplicate holds");
        RetentionCoordinator::Options ro;ro.media_root=root;ro.reserved_free_bytes=0;ro.default_expected_segment_bytes=1;
        RetentionCoordinator retention(c,[&]{return c.RetentionSnapshot();},[](std::uint64_t* f,std::string*){*f=1024ULL*1024*1024;return true;},[&](const fs::path& p,std::string* e){return RemoveContainedMediaFile(root,p,e);},ro);
        RetentionPolicy policy;policy.continuous_max_bytes=64*1024*1024;policy.event_max_bytes=64*1024*1024;policy.continuous_max_age_ms=100000000;policy.event_max_age_ms=100000000;
        Check(retention.UpdateChannelPolicy(req.channel_id,policy,&error),"FR15 bridge quota policy");
        ObservedDeriver d;CatalogEventRecordingBridge::Options bo;bo.output_root=root;bo.now_ms=[] {return 5000;};bo.mapping_retry_ms=5;
        CatalogEventRecordingBridge bridge(c,retention,d,bo);
        for(int i=0;i<1000;++i){auto l=c.FindEventLinkByEventId(req.event_id);if(l&&l->status==EventRecordingLinkStatus::Complete)break;std::this_thread::sleep_for(std::chrono::milliseconds(5));}
        auto completed=c.FindEventLinkByEventId(req.event_id);
        Check(completed&&completed->status==EventRecordingLinkStatus::Complete&&d.calls==0,"FR14 existing output terminal recovery no remux");
        Check(Hold(c,source.segment.segment_id)==0&&Hold(c,req.output_segment_id)==0,"FR14 existing terminal releases all restored holds");
        analysis::EventRecord event;event.event_id="production-event";event.event_type="loitering";event.stream_id=req.source_id;event.channel_id=req.channel_id;
        event.start_time_ms=1500;event.end_time_ms=2500;event.update_time_ms=2500;event.time_basis="utc-ms";event.stream_epoch_id=source.segment.stream_epoch_id;
        analysis::AnalysisResult ar;ar.source_key=req.source_id;analysis::EventMediaHookOptions opts;opts.enabled=true;opts.pre_event_ms=0;opts.post_event_ms=0;
        Check(bridge.TryResolve(ar,event,opts).handled,"FR15 production bridge accepts event");
        for(int i=0;i<1000;++i){auto l=c.FindEventLinkByEventId(event.event_id);if(l&&l->status!=EventRecordingLinkStatus::Pending)break;std::this_thread::sleep_for(std::chrono::milliseconds(5));}
        auto done=c.FindEventLinkByEventId(event.event_id);bridge.StopAndDrain();
        Check(d.calls==1&&d.saw_ready,"FR15 every actual bridge request carries ready metadata and reservation");
        Check(done&&done->status==EventRecordingLinkStatus::Complete,"FR15 actual production bridge remux completes");
        Check(Count(root,".finalize-ready")==0&&Count(root,".cleanup-pending")==0,"FR15 production bridge clears ready before terminal");
    }
    auto oversized=Request(source,root,"oversized");oversized.max_output_bytes=1;GStreamerEventClipDeriver d;
    const auto failed=d.Derive(oversized);
    Check(!failed.ok&&failed.error=="event-reservation-exceeded"&&failed.cleanup_complete&&!failed.ready_ticket,"FR15 reservation exceed before ready emission");
    Check(!fs::exists(failed.media_path)&&!fs::exists(failed.partial_path)&&!fs::exists(failed.cleanup_marker_path),"FR15 reservation exceed cleans owned output only");
}
void PendingFailure(const fs::path& root,const Written& original) {
    fs::create_directories(root);Written source=original;source.path=root/"source.mp4";fs::copy_file(original.path,source.path);
    std::string error;const auto journal=root/"journal.jsonl";RecordingJournal j(journal);Check(j.Open(&error),"FR15 failure journal");
    RecordingCatalog c(j,{root/"catalog.db",root,false});Check(c.Open(&error),"FR15 failure catalog");
    Check(c.FinalizeSegment(source.segment,source.path.string(),&error),"FR15 failure source");
    std::atomic<bool> replaced{false};std::string original_journal;
    RetentionCoordinator::Options ro;ro.media_root=root;ro.reserved_free_bytes=0;ro.default_expected_segment_bytes=1;
    RetentionCoordinator retention(c,[&]{return c.RetentionSnapshot();},[&](std::uint64_t* free,std::string*) {
        if(!replaced.exchange(true)) { original_journal=Read(journal);fs::rename(journal,root/"journal.original");std::ofstream out(journal);out<<"replacement sentinel"; }
        *free=1024ULL*1024*1024;return true;
    },[](const fs::path&,std::string*){return false;},ro);
    RetentionPolicy policy;policy.continuous_max_bytes=64*1024*1024;policy.event_max_bytes=64*1024*1024;
    Check(retention.UpdateChannelPolicy(source.segment.channel_id,policy,&error),"FR15 failure quota policy");
    ObservedDeriver d;CatalogEventRecordingBridge::Options bo;bo.output_root=root;bo.now_ms=[] {return 5000;};bo.mapping_retry_ms=5;
    CatalogEventRecordingBridge bridge(c,retention,d,bo);
    analysis::EventRecord e;e.event_id="pending-write-failure";e.event_type="loitering";e.stream_id=source.segment.source_id;e.channel_id=source.segment.channel_id;
    e.start_time_ms=1500;e.end_time_ms=2500;e.update_time_ms=2500;e.time_basis="utc-ms";e.stream_epoch_id=source.segment.stream_epoch_id;
    analysis::AnalysisResult ar;ar.source_key=e.stream_id;analysis::EventMediaHookOptions opts;opts.enabled=true;opts.pre_event_ms=0;opts.post_event_ms=0;
    Check(bridge.TryResolve(ar,e,opts).handled,"FR15 failure request accepted");
    for(int i=0;i<1000;++i) {if(replaced&&Hold(c,source.segment.segment_id)==0)break;std::this_thread::sleep_for(std::chrono::milliseconds(5));}
    bridge.StopAndDrain();
    Check(replaced&&d.calls==0&&Hold(c,source.segment.segment_id)==0,"FR15 failed Pending append prevents remux and releases source lease");
    Check(Read(root/"journal.original")==original_journal&&Read(journal)=="replacement sentinel","FR15 failed Pending append leaves original and replacement journal unchanged");
    Check(Count(root,".finalize-ready")==0,"FR15 failed Pending append creates no ready");
    const auto reservation="event-reservation-sha256-"+Sha(e.event_id);
    const auto retry=retention.AdmitEventWrite(e.channel_id,reservation,source.segment.size_bytes,5000);
    Check(retry.allowed,"FR15 failed Pending append released exact reservation for readmission");
    retention.CompleteEventWrite(reservation,0);
}
void RemainingBoundaries(const fs::path& root,const Written& original) {
    for(const std::string kind:{"size","container","two-links"}) {
        const auto dir=root/kind;fs::create_directories(dir);std::string error;
        const auto final=fs::path(original.segment.segment_id+".mp4");
        const auto partial=fs::path(final.string()+".partial.123e4567-e89b-42d3-a456-426614174000");
        auto segment=original.segment;std::string bytes=Read(original.path);
        if(kind=="size")bytes+="extra";
        else if(kind=="container") {bytes=std::string(2048,'x');segment.size_bytes=bytes.size();segment.checksum_sha256=Sha(bytes);}
        else bytes[bytes.size()/2]^=1;
        {std::ofstream out(dir/partial,std::ios::binary);out<<bytes;}
        if(kind=="two-links")fs::create_hard_link(dir/partial,dir/final);
        FinalizeReadyTicket ticket{segment,partial,final,std::nullopt};
        Check(WriteFinalizeReadyTicket(dir,ticket,&error),"FR06 "+kind+" ready fixture");
        RecordingJournal j(dir/"journal.jsonl");Check(j.Open(&error),"FR06 "+kind+" journal fixture");
        RecordingCatalog c(j,{dir/"catalog.db",dir,false});Check(c.Open(&error),"FR06 "+kind+" catalog fixture");
        FinalizeRecoveryReport report;const auto journal=Read(dir/"journal.jsonl");
        Check(RecoverFinalizeReadyTickets(c,dir,&report,&error)&&report.quarantined==1&&!c.FindSegmentById(segment.segment_id)&&Read(dir/"journal.jsonl")==journal,"FR06 "+kind+" definite corruption never finalized");
        const auto kept=kind=="two-links"?final:partial;
        Check(Read(dir/kept)==bytes&&fs::exists(dir/(final.string()+".finalize-ready")),"FR06 "+kind+" corrupt original and ticket retained");
        Check(RecoverFinalizeReadyTickets(c,dir,&report,&error)&&report.quarantined==1,"FR06 "+kind+" repeat logical quarantine converges");
    }
    const auto dir=root/"missing-link";fs::create_directories(dir);Written source=original;source.path=dir/"source.mp4";fs::copy_file(original.path,source.path);
    std::string error;RecordingJournal j(dir/"journal.jsonl");Check(j.Open(&error),"FR12 missing link journal");
    RecordingCatalog c(j,{dir/"catalog.db",dir,false});Check(c.Open(&error),"FR12 missing link catalog");
    Check(c.FinalizeSegment(source.segment,source.path.string(),&error),"FR12 missing link source");
    auto req=Request(source,dir,"missing-link");GStreamerEventClipDeriver d;auto output=d.Derive(req);
    Check(output.ok&&output.ready_ticket.has_value(),"FR12 missing durable link actual remux fixture");
    const auto journal=Read(dir/"journal.jsonl");FinalizeRecoveryReport report;
    Check(!RecoverFinalizeReadyTickets(c,dir,&report,&error)&&!c.FindSegmentById(req.output_segment_id)&&Read(dir/"journal.jsonl")==journal&&fs::exists(output.media_path),"FR12 missing durable Pending prevents inferred event registration");
    auto mismatch=*req.ready_link;mismatch.event_id="different-event";
    Check(c.PutEventLink(mismatch,&error),"FR12 mismatched durable event fixture");
    const auto mismatch_journal=Read(dir/"journal.jsonl");
    Check(!RecoverFinalizeReadyTickets(c,dir,&report,&error)&&Read(dir/"journal.jsonl")==mismatch_journal&&fs::exists(output.media_path),"FR12 mismatched durable event preserves output and journal");
    auto invalid=output.ready_ticket->segment;invalid.video_codecs={"vp8"};
    Check(InspectRecordingMedia(dir,output.media_path.lexically_relative(dir),invalid).state==MediaInspectionState::Unavailable,"FR11 unsupported MPEGTS codec metadata unavailable");
    auto changed_ts=Read(output.media_path);changed_ts[changed_ts.size()/2]^=1;
    {std::ofstream out(output.media_path,std::ios::binary);out<<changed_ts;}
    const auto checksum_result=InspectRecordingMedia(dir,output.media_path.lexically_relative(dir),output.ready_ticket->segment);
    Check(checksum_result.state==MediaInspectionState::Corrupt&&checksum_result.detail=="checksum-mismatch","FR11 actual MPEGTS changed bytes definitely corrupt");
    const std::string malformed(2048,'x');{std::ofstream out(output.media_path,std::ios::binary);out<<malformed;}
    invalid=output.ready_ticket->segment;invalid.size_bytes=malformed.size();invalid.checksum_sha256=Sha(malformed);
    const auto malformed_result=InspectRecordingMedia(dir,output.media_path.lexically_relative(dir),invalid);
    std::cout<<"[diagnostic] malformed MPEGTS state="<<static_cast<int>(malformed_result.state)<<" detail="<<malformed_result.detail<<'\n';
    Check(malformed_result.state==MediaInspectionState::Unavailable&&malformed_result.detail=="demux-error-unclassified"&&
          Read(output.media_path)==malformed&&Read(dir/"journal.jsonl")==mismatch_journal,
          "FR11 unclassified MPEGTS error unavailable preserves bytes and journal");
}
void CorruptPath(const fs::path& root,const Written& original) {
    fs::create_directories(root/"other");std::string error;
    const auto final=fs::path(original.segment.segment_id+".mp4");fs::copy_file(original.path,root/final);
    RecordingJournal j(root/"journal.jsonl");Check(j.Open(&error),"FR06 path journal");
    RecordingCatalog c(j,{root/"catalog.db",root,false});Check(c.Open(&error),"FR06 path catalog");
    Check(c.FinalizeSegment(original.segment,(root/final).string(),&error)&&c.MarkSegmentCorrupt(original.segment.segment_id,"checksum-mismatch",&error),"FR06 path known corrupt fixture");
    const auto other=fs::path("other")/final;auto bytes=Read(original.path);bytes[bytes.size()/2]^=1;
    {std::ofstream out(root/other,std::ios::binary);out<<bytes;}
    const auto partial=fs::path(other.string()+".partial.123e4567-e89b-42d3-a456-426614174000");
    FinalizeReadyTicket ticket{original.segment,partial,other,std::nullopt};
    Check(WriteFinalizeReadyTicket(root,ticket,&error),"FR06 path foreign relative ready fixture");
    const auto before=Read(root/"journal.jsonl");FinalizeRecoveryReport report;
    Check(!RecoverFinalizeReadyTickets(c,root,&report,&error)&&Read(root/"journal.jsonl")==before&&
          !fs::exists(root/(other.string()+".finalize-ready.corrupt-info"))&&Read(root/other)==bytes,
          "FR06 known Corrupt same metadata different stored path rejected");
}
void SinglePacket(const fs::path& root,const media::StreamDescriptor& descriptor,const std::vector<media::Packet>& packets) {
    std::string error;int callbacks=0,completions=0;GStreamerSegmentWriter::Options options(root,60000);
    options.admit_segment=[](const std::string&,std::uint64_t minimum){return SegmentAdmissionDecision{true,false,std::max<std::uint64_t>(minimum,16*1024*1024)};};
    options.complete_segment=[&](const std::string&,std::uint64_t bytes){Check(bytes>0,"FR09 single packet cleanup returns actual bytes");++completions;};
    GStreamerSegmentWriter writer(options);
    const auto callback=[&](RecordingSegmentV1 segment,std::string path,std::string*) {
        Check(ValidateRecordingSegmentV1(segment,&error)&&fs::file_size(path)==segment.size_bytes,"FR09 recovered positive interval callback valid V1");++callbacks;return true;
    };
    Check(writer.Start("single-channel","single-epoch",descriptor,callback,&error),"FR09 single packet writer start");
    writer.Push(packets.front(),1000);writer.Stop();
    Check(callbacks==0&&completions==1&&Count(root,".finalize-ready")==0&&Count(root,".cleanup-pending")==0&&Count(root,".mp4")==0,
          "FR09 single packet invalid interval cleans before ready without callback");
    Check(writer.Start("single-channel","next-epoch",descriptor,callback,&error),"FR09 restart after incomplete single packet");
    writer.Push(packets[0],2000);writer.Push(packets[1],2100);writer.Stop();
    Check(callbacks==1&&completions==2&&Count(root,".finalize-ready")==0,"FR09 positive interval after incomplete packet finalizes normally");
}
}
int main(int argc,char** argv) {
    if(argc!=2&&!(argc==3&&(std::string(argv[2])=="--ts-probe"||std::string(argv[2])=="--path-only"||std::string(argv[2])=="--single-only"||std::string(argv[2])=="--root-only")))return 2;
    gst_init(nullptr,nullptr);
    if(argc==3&&std::string(argv[2])=="--root-only") {
        try {
            const fs::path root(argv[1]);const auto target=root/"real-root";fs::create_directories(target);
            fs::create_directory_symlink(target,root/"alias-root");std::string error;
            RecordingJournal j(root/"journal.jsonl");Check(j.Open(&error),"FR05 empty root journal");
            RecordingCatalog c(j,{root/"catalog.db",target,false});Check(c.Open(&error),"FR05 empty real root catalog");
            FinalizeRecoveryReport report;const auto before=Read(root/"journal.jsonl");
            Check(!RecoverFinalizeReadyTickets(c,root/"alias-root",&report,&error)&&fs::is_empty(target)&&Read(root/"journal.jsonl")==before,
                  "FR05 empty symlink root rejected without external mutation");
            Check(!RecoverFinalizeReadyTickets(c,{},&report,&error),"FR05 empty normalized root rejected");
            Check(RecoverFinalizeReadyTickets(c,target,&report,&error)&&report.recovered==0,"FR05 actual empty directory accepted");
            std::cout<<"[summary] pass="<<passes<<" fail=0\n";return 0;
        }catch(const std::exception& e){std::cerr<<"[summary] pass="<<passes<<" fail=1 detail="<<e.what()<<'\n';return 1;}
    }
    if(argc==3&&std::string(argv[2])=="--ts-probe") {
        const auto file=fs::path(argv[1])/"malformed.ts";{std::ofstream out(file);out<<std::string(2048,'x');}
        GError* parse_error=nullptr;const auto launch="filesrc location="+file.string()+" ! tsdemux ! fakesink";
        auto* pipeline=gst_parse_launch(launch.c_str(),&parse_error);
        if(!pipeline||parse_error)return 2;
        gst_element_set_state(pipeline,GST_STATE_PLAYING);auto* bus=gst_element_get_bus(pipeline);
        auto* message=gst_bus_timed_pop_filtered(bus,5*GST_SECOND,static_cast<GstMessageType>(GST_MESSAGE_ERROR|GST_MESSAGE_EOS));
        if(message&&GST_MESSAGE_TYPE(message)==GST_MESSAGE_ERROR) {
            GError* e=nullptr;gchar* debug=nullptr;gst_message_parse_error(message,&e,&debug);
            std::cout<<"[diagnostic] actual tsdemux domain="<<g_quark_to_string(e->domain)<<" code="<<e->code<<" message="<<e->message<<'\n';
            g_error_free(e);g_free(debug);
        } else std::cout<<"[diagnostic] no error message\n";
        if(message)gst_message_unref(message);
        gst_element_set_state(pipeline,GST_STATE_NULL);gst_object_unref(bus);gst_object_unref(pipeline);return 0;
    }
    try {
        const fs::path root(argv[1]);media::StreamDescriptor descriptor;auto packets=Packets(&descriptor);
        Check(packets.size()==30,"FR09 actual H264 packet fixture");
        const auto source=Writer(root/"writer",descriptor,packets,false);
        if(argc==3) {
            if(std::string(argv[2])=="--path-only")CorruptPath(root/"corrupt-path",source);
            else SinglePacket(root/"single-packet",descriptor,packets);
            std::cout<<"[summary] pass="<<passes<<" fail=0\n";return 0;
        }
        Writer(root/"writer-failed",descriptor,packets,true);
        LogicalQuarantine(root/"logical-quarantine",source);
        Event(root/"fallback",source,false);Event(root/"sqlite",source,true);
        PendingFailure(root/"pending-failure",source);
        RemainingBoundaries(root/"boundaries",source);
        CorruptPath(root/"corrupt-path",source);
        SinglePacket(root/"single-packet",descriptor,packets);
        std::cout<<"[summary] pass="<<passes<<" fail=0\n";return 0;
    }catch(const std::exception& e){std::cerr<<"[summary] pass="<<passes<<" fail=1 detail="<<e.what()<<'\n';return 1;}
}
