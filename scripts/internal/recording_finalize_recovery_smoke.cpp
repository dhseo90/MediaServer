// 파일 용도: 실제 ready 상태와 catalog recovery 경로를 검사하는 focused fixture.
#include "recording/recording_finalize_recovery.h"
#include "recording/recording_catalog.h"
#include "recording/recording_media_inspector.h"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <iterator>
#include <stdexcept>
#include <functional>
#include <sys/stat.h>
#include <unistd.h>
#include <gst/gst.h>
namespace {
namespace fs = std::filesystem;
using namespace recording;
const std::string partial_name="ready-segment.mp4.partial.123e4567-e89b-42d3-a456-426614174000";
const std::string final_name="ready-segment.mp4";
const std::string ready_name=final_name+".finalize-ready";
const std::string marker_name=final_name+".cleanup-pending";
std::string ReadBytes(const fs::path& path) {
    std::ifstream input(path,std::ios::binary);
    if(!input.good())throw std::runtime_error("fixture read 실패");
    return {std::istreambuf_iterator<char>(input),{}};
}
void WriteBytes(const fs::path& path,const std::string& bytes) {
    std::ofstream output(path,std::ios::binary|std::ios::trunc);
    output.write(bytes.data(),static_cast<std::streamsize>(bytes.size()));output.close();
    if(output.fail())throw std::runtime_error("fixture write 실패");
}
std::string TicketBytes(const RecordingSegmentV1& segment) {
    return "{\"version\":1,\"segment\":"+SerializeRecordingSegmentV1(segment)+
        ",\"partial\":\""+partial_name+"\",\"final\":\""+final_name+"\",\"eventLink\":null}";
}
void Seed(const fs::path& root,const std::string& bytes,const RecordingSegmentV1& segment) {
    fs::create_directories(root);WriteBytes(root/partial_name,bytes);
    WriteBytes(root/ready_name,TicketBytes(segment));
    WriteBytes(root/marker_name,"recording-cleanup-pending-v2\npartial="+partial_name+"\n");
}
struct Context {
    fs::path root;RecordingJournal journal;RecordingCatalog catalog;std::string error;
    explicit Context(fs::path path):root(std::move(path)),journal(root/"journal.jsonl"),
        catalog(journal,{root/"catalog.db",root,false}) {
        fs::create_directories(root);
        if(!journal.Open(&error)||!catalog.Open(&error))throw std::runtime_error("Open 실패: "+error);
    }
    bool Recover(FinalizeRecoveryReport* report){return RecoverFinalizeReadyTickets(catalog,root,report,&error);}
};
// 회귀 표적: 소유 partial 삭제, publish 덮어쓰기, ID 재발급, 삭제 ID 부활,
// 손상 파일 정상 등록, provenance 없는 orphan 추론, 외부 파일 unlink.
bool V2Cases(const fs::path& root,const std::string& bytes,const RecordingSegmentV1& physical) {
    int passed=0,failed=0;
    const auto check=[&](bool ok,const std::string& label){std::cout<<(ok?"[pass] ":"[fail] ")<<label<<'\n';ok?++passed:++failed;};
    RecordingSegmentV2 v;v.segment_id="ready-segment";v.source_id="source-one";v.channel_id="channel-one";
    v.store_id="store-one";v.order_request_id="request-one";v.media_epoch_id="media-one";v.order_sequence=1;
    v.media_start_pts=9007199254740993LL;v.media_end_pts=std::nullopt;
    v.container=physical.container;v.video_codecs=physical.video_codecs;v.size_bytes=physical.size_bytes;
    v.checksum_sha256=physical.checksum_sha256;v.audio_omitted_reason="source-no-audio";v.created_at_ms=1000;v.finalized_at_ms=2000;
    v.mappings={{"media-server.recording-utc-mapping.v1","map-one",9007199254740993LL,9007199254741003LL,"source-capture",100,110,1,""},
        {"media-server.recording-utc-mapping.v1","map-unknown",9007199254741003LL,std::nullopt,"unknown",std::nullopt,std::nullopt,std::nullopt,"duration-unavailable"}};
    FinalizeReadyTicket ticket;ticket.segment_v2=v;ticket.partial_relative=partial_name;ticket.final_relative=final_name;
    const auto literal="{\"version\":2,\"segment\":"+SerializeRecordingSegmentV2(v)+",\"partial\":\""+partial_name+"\",\"final\":\""+final_name+"\",\"eventLink\":null}";
    for(const std::string state:{"partial","two-links","final","committed"}) {
        const auto dir=root/("v2-"+state);fs::create_directories(dir);
        RecordingJournal journal(dir/"journal.jsonl");RecordingCatalog::Options options(dir/"catalog.db",dir,false);options.enable_v2_storage=true;
        RecordingCatalog catalog(journal,options);std::string error;RecordingOrderReservationV1 order;
        const bool setup=journal.Open(&error)&&catalog.Open(&error)&&journal.ReserveRecordingOrder(v.store_id,v.order_request_id,v.segment_id,v.channel_id,&order,&error);
        WriteBytes(dir/partial_name,bytes);WriteBytes(dir/ready_name,literal);
        if(state=="two-links")fs::create_hard_link(dir/partial_name,dir/final_name);
        if(state=="final"||state=="committed")fs::rename(dir/partial_name,dir/final_name);
        const bool commit=state!="committed"||catalog.FinalizeSegmentV2(v,(dir/final_name).string(),&error);
        const auto marker="recording-cleanup-pending-v2\npartial="+partial_name+"\n";
        WriteBytes(dir/marker_name,marker);
        const auto before=ReadBytes(dir/"journal.jsonl");
        RecordingCatalog restarted(journal,options);const bool restart_open=restarted.Open(&error);
        const bool has_partial=state=="partial"||state=="two-links";
        check(restart_open&&ReadBytes(dir/ready_name)==literal&&ReadBytes(dir/marker_name)==marker&&
            fs::exists(dir/partial_name)==has_partial&&(!has_partial||ReadBytes(dir/partial_name)==bytes)&&ReadBytes(dir/"journal.jsonl")==before,
            "S10-M08 catalog startup preserves V2 ready and cleanup marker "+state);
        FinalizeRecoveryReport report;const bool recovered=restart_open&&RecoverFinalizeReadyTickets(restarted,dir,&report,&error);
        const auto found=restarted.FindSegmentV2ById(v.segment_id);
        check(setup&&commit&&recovered&&found&&found->media_start_pts==9007199254740993LL&&!found->media_end_pts&&
            found->mappings.size()==2&&!found->mappings[1].utc_start_ns&&found->mappings[1].reason=="duration-unavailable"&&
            SerializeRecordingSegmentV2(*found)==SerializeRecordingSegmentV2(v)&&ReadBytes(dir/final_name)==bytes&&!fs::exists(dir/ready_name)&&!fs::exists(dir/marker_name)&&!fs::exists(dir/partial_name)&&
            (state=="committed"?report.already_committed==1:report.recovered==1),"S10-M08 V2 ready recovers exact metadata "+state);
        RecordingCatalog reopened(journal,options);const bool opened=reopened.Open(&error);const auto replayed=reopened.FindSegmentV2ById(v.segment_id);
        const auto committed=ReadBytes(dir/"journal.jsonl");FinalizeRecoveryReport again;
        check(opened&&replayed&&SerializeRecordingSegmentV2(*replayed)==SerializeRecordingSegmentV2(v)&&
            (state!="committed"||before==committed)&&RecoverFinalizeReadyTickets(reopened,dir,&again,&error)&&
            again.recovered==0&&again.already_committed==0&&ReadBytes(dir/"journal.jsonl")==committed,
            "S10-M08 V2 journal restart and repeated recovery "+state);
    }
    const auto dir=root/"v2-write";fs::create_directories(dir);std::string error;
    check(WriteFinalizeReadyTicket(dir,ticket,&error)&&ReadBytes(dir/ready_name)==literal,"S10-M08 V2 ready writer preserves versioned envelope");
    for(const std::string kind:{"missing-order","wrong-tuple","optout","deleted","mapping","path","version","event","corrupt-pair","foreign-link"}) {
        const auto base=root/("v2-denied-"+kind);fs::create_directories(base);RecordingJournal journal(base/"journal.jsonl");
        RecordingCatalog::Options options(base/"catalog.db",base,false);options.enable_v2_storage=kind!="optout";
        RecordingCatalog catalog(journal,options);RecordingOrderReservationV1 order;
        bool setup=journal.Open(&error)&&catalog.Open(&error);
        if(kind!="missing-order")setup=setup&&journal.ReserveRecordingOrder(v.store_id,v.order_request_id,v.segment_id,v.channel_id,&order,&error);
        auto input=v;
        if(kind=="wrong-tuple")input.order_sequence=2;
        if(kind=="event")input.retention_class=RecordingRetentionClass::Event;
        if(kind=="mapping"||kind=="path") {
            WriteBytes(base/final_name,bytes);
            setup=setup&&catalog.FinalizeSegmentV2(v,(base/final_name).string(),&error);
            if(kind=="mapping")input.mappings[0].utc_start_ns=99;
        }
        if(kind=="deleted") {
            RecordingTombstoneV1 t;t.tombstone_id="deleted-ready";t.segment_id=v.segment_id;t.source_id=v.source_id;t.channel_id=v.channel_id;
            t.recorded_range={100,110};t.checksum_sha256=v.checksum_sha256;t.retention_class=v.retention_class;t.deletion_reason="quota";t.deleted_at_ms=3000;
            setup=setup&&catalog.CompleteDeletion(t,&error);
        }
        auto input_ticket=ticket;input_ticket.segment_v2=input;
        if(kind=="path") {fs::create_directories(base/"other");input_ticket.partial_relative=fs::path("other")/partial_name;input_ticket.final_relative=fs::path("other")/final_name;}
        auto raw="{\"version\":"+std::string(kind=="version"?"3":"2")+",\"segment\":"+SerializeRecordingSegmentV2(input)+",\"partial\":\""+input_ticket.partial_relative.generic_string()+"\",\"final\":\""+input_ticket.final_relative.generic_string()+"\",\"eventLink\":null}";
        const auto ready=base/(input_ticket.final_relative.string()+".finalize-ready");
        auto media=bytes;if(kind=="corrupt-pair")media[media.size()/2]^=1;
        WriteBytes(base/input_ticket.partial_relative,media);WriteBytes(ready,raw);
        if(kind=="corrupt-pair")fs::create_hard_link(base/input_ticket.partial_relative,base/input_ticket.final_relative);
        if(kind=="foreign-link")fs::create_hard_link(base/input_ticket.partial_relative,base/"foreign.mp4");
        const auto before=ReadBytes(base/"journal.jsonl");FinalizeRecoveryReport report;
        const bool ok=RecoverFinalizeReadyTickets(catalog,base,&report,&error);
        bool preserved=ReadBytes(ready)==raw&&ReadBytes(base/input_ticket.partial_relative)==media&&ReadBytes(base/"journal.jsonl")==before;
        if(kind=="corrupt-pair") {struct stat a{},b{};preserved=preserved&&::lstat((base/partial_name).c_str(),&a)==0&&::lstat((base/final_name).c_str(),&b)==0&&a.st_ino==b.st_ino&&a.st_nlink==2&&b.st_nlink==2;}
        check(setup&&!ok&&report.errors==1&&preserved,"S10-M09 V2 ready refusal preserves originals "+kind);
    }
    for(const std::string kind:{"mixed-id","mixed-size","mixed-source","mixed-time","event","oversize"}) {
        auto invalid=ticket;
        if(kind=="mixed-id")invalid.segment.segment_id="legacy";
        if(kind=="mixed-size")invalid.segment.size_bytes=1;
        if(kind=="mixed-source")invalid.segment.source_id="legacy";
        if(kind=="mixed-time")invalid.segment.created_at_ms=1;
        if(kind=="event")invalid.segment_v2->retention_class=RecordingRetentionClass::Event;
        if(kind=="oversize") {
            const auto base_size=SerializeRecordingSegmentV2(*invalid.segment_v2).size();
            invalid.segment_v2->audio_omitted_reason+=std::string(1024*1024-base_size-10,'x');
        }
        const auto base=root/("v2-write-denied-"+kind);fs::create_directories(base);
        check((kind!="oversize"||ValidateRecordingSegmentV2(*invalid.segment_v2,&error))&&
            !WriteFinalizeReadyTicket(base,invalid,&error)&&!fs::exists(base/ready_name),"S10-M09 V2 ready writer rejects "+kind);
    }
    const auto direct=root/"v2-direct";fs::create_directories(direct);WriteBytes(direct/partial_name,bytes);
    check(!PublishFinalizeReady(direct,ticket,&error)&&ReadBytes(direct/partial_name)==bytes&&!fs::exists(direct/final_name),"S10-M09 V2 direct publish requires catalog");
    fs::create_hard_link(direct/partial_name,direct/final_name);
    check(InspectRecordingMedia(direct,partial_name,physical).state==MediaInspectionState::Unavailable,"S10-M09 V1 inspector still rejects two links");
    WriteBytes(direct/ready_name,literal);const auto marker="recording-cleanup-pending-v2\npartial="+partial_name+"\n";WriteBytes(direct/marker_name,marker);
    check(!ClearFinalizeReady(direct,ticket,&error)&&ReadBytes(direct/ready_name)==literal&&ReadBytes(direct/marker_name)==marker,
        "S10-M09 V2 direct clear preserves uncommitted ticket and marker");
    for (const std::string mode : {"valid", "changed-ticket", "missing-order"}) {
        const auto active = root / ("active-" + mode);
        fs::create_directories(active);
        RecordingJournal journal(active / "journal.jsonl");
        RecordingCatalog::Options options(active / "catalog.db", active, false);
        options.enable_v2_storage = true;
        RecordingCatalog catalog(journal, options);
        RecordingOrderReservationV1 order;
        bool setup = journal.Open(&error) && catalog.Open(&error);
        if (mode != "missing-order") {
            setup = setup && journal.ReserveRecordingOrder(v.store_id, v.order_request_id,
                v.segment_id, v.channel_id, &order, &error);
        }
        WriteBytes(active / partial_name, bytes);
        setup = setup && WriteFinalizeReadyTicket(active, ticket, &error);
        WriteBytes(active / marker_name, marker);
        auto requested = ticket;
        if (mode == "changed-ticket") requested.segment_v2->mappings[0].uncertainty_ns = 2;
        const bool committed = CommitFinalizeReadyV2(catalog, active, requested, &error);
        const auto found = catalog.FindSegmentV2ById(v.segment_id);
        if (mode == "valid") {
            check(setup && committed && found && SerializeRecordingSegmentV2(*found) == SerializeRecordingSegmentV2(v)
                && ReadBytes(active / final_name) == bytes && !fs::exists(active / partial_name)
                && !fs::exists(active / ready_name) && !fs::exists(active / marker_name),
                "S10-WR09 active ready validates publishes commits and clears exact ticket");
        } else {
            check(setup && !committed && !found && !fs::exists(active / final_name)
                && ReadBytes(active / partial_name) == bytes && ReadBytes(active / ready_name) == literal,
                "S10-WR09 active ready refusal preserves originals " + mode);
        }
    }
    std::cout<<"[v2-summary] pass="<<passed<<" fail="<<failed<<'\n';return failed==0;
}
bool BoundaryCases(const fs::path& root,const std::string& bytes,const RecordingSegmentV1& segment) {
    int passed=0,failed=0;
    const auto check=[&](bool ok,const std::string& label){std::cout<<(ok?"[pass] ":"[fail] ")<<label<<'\n';ok?++passed:++failed;};
    const auto run=[&](const std::string& name,const std::function<void()>& action){
        try{action();}catch(const std::exception& e){check(false,name+" fixture/실행 오류: "+e.what());}};
    for(const bool two_names:{false,true})run("FR02",[&]{
        const auto dir=root/(two_names?"owned-two-links":"final-only");Seed(dir,bytes,segment);
        if(two_names)fs::create_hard_link(dir/partial_name,dir/final_name);
        else fs::rename(dir/partial_name,dir/final_name);
        Context c(dir);FinalizeRecoveryReport report;const bool ok=c.Recover(&report);struct stat st{};
        check(ok&&report.recovered==1&&::stat((dir/final_name).c_str(),&st)==0&&st.st_nlink==1&&
            ReadBytes(dir/final_name)==bytes&&!fs::exists(dir/partial_name),
            std::string("FR02 interrupted publish converges: ")+(two_names?"owned two links":"final only"));
        const auto before=ReadBytes(dir/"journal.jsonl");
        check(c.Recover(&report)&&report.recovered==0&&ReadBytes(dir/"journal.jsonl")==before,"FR02 repeated recovery no duplicate mutation");
    });
    run("FR03",[&]{
        const auto dir=root/"committed";Context c(dir);Seed(dir,bytes,segment);fs::rename(dir/partial_name,dir/final_name);
        if(!c.catalog.FinalizeSegment(segment,(dir/final_name).string(),&c.error))throw std::runtime_error(c.error);
        const auto before=ReadBytes(dir/"journal.jsonl");FinalizeRecoveryReport report;
        check(c.Recover(&report)&&report.already_committed==1&&report.recovered==0&&
            ReadBytes(dir/"journal.jsonl")==before&&ReadBytes(dir/final_name)==bytes&&!fs::exists(dir/ready_name),
            "FR03 catalog commit before cleanup does not append or replace");
    });
    for(const std::string kind:{"version","duplicate","nonce","escape","identity"})run("FR04 "+kind,[&]{
        const auto dir=root/("invalid-"+kind);Context c(dir);Seed(dir,bytes,segment);auto ticket=TicketBytes(segment);
        if(kind=="version")ticket.replace(ticket.find("\"version\":1"),11,"\"version\":2");
        if(kind=="duplicate")ticket.insert(1,"\"version\":1,");
        if(kind=="nonce")ticket.replace(ticket.find("42d3"),4,"12d3");
        if(kind=="escape")ticket.insert(ticket.find(partial_name),"../");
        if(kind=="identity"){auto wrong=segment;wrong.segment_id="other-segment";ticket=TicketBytes(wrong);}
        WriteBytes(dir/ready_name,ticket);FinalizeRecoveryReport report;const auto before=ReadBytes(dir/"journal.jsonl");
        check(!c.Recover(&report)&&!c.catalog.FindSegmentById("ready-segment")&&ReadBytes(dir/ready_name)==ticket&&
            ReadBytes(dir/partial_name)==bytes&&!fs::exists(dir/final_name)&&ReadBytes(dir/"journal.jsonl")==before,
            "FR04 invalid "+kind+" preserves original without publication");
    });
    run("FR05 symlink",[&]{
        const auto dir=root/"ticket-symlink";Context c(dir);Seed(dir,bytes,segment);
        const auto outside=root/"external-ticket";const auto ticket=TicketBytes(segment);WriteBytes(outside,ticket);
        fs::remove(dir/ready_name);fs::create_symlink(outside,dir/ready_name);FinalizeRecoveryReport report;
        check(!c.Recover(&report)&&ReadBytes(outside)==ticket&&ReadBytes(dir/partial_name)==bytes&&!fs::exists(dir/final_name),
            "FR05 symlink ticket rejected and external target untouched");
    });
    run("FR05 hardlink",[&]{
        const auto dir=root/"foreign-hardlink";Context c(dir);Seed(dir,bytes,segment);
        const auto outside=root/"external-media";fs::create_hard_link(dir/partial_name,outside);FinalizeRecoveryReport report;
        check(!c.Recover(&report)&&ReadBytes(outside)==bytes&&ReadBytes(dir/partial_name)==bytes&&!fs::exists(dir/final_name),
            "FR05 foreign hardlink rejected without unlink");
    });
    run("FR05 permission",[&]{
        const auto dir=root/"unreadable";Context c(dir);Seed(dir,bytes,segment);
        if(::chmod((dir/ready_name).c_str(),0)!=0)throw std::runtime_error("chmod 실패");
        FinalizeRecoveryReport report;const bool ok=c.Recover(&report);
        if(::chmod((dir/ready_name).c_str(),0600)!=0)throw std::runtime_error("chmod 복원 실패");
        check(::geteuid()!=0&&!ok&&ReadBytes(dir/partial_name)==bytes&&!fs::exists(dir/final_name),
            "FR05 actual unreadable ticket preserves media");
    });
    run("FR06",[&]{
        const auto dir=root/"checksum-corrupt";Context c(dir);Seed(dir,bytes,segment);
        auto damaged=bytes;damaged[damaged.size()/2]^=1;WriteBytes(dir/partial_name,damaged);
        const auto before=ReadBytes(dir/"journal.jsonl");FinalizeRecoveryReport report;
        check(c.Recover(&report)&&report.quarantined==1&&!c.catalog.FindSegmentById("ready-segment")&&
            ReadBytes(dir/partial_name)==damaged&&fs::exists(dir/ready_name)&&fs::exists(dir/marker_name)&&
            ReadBytes(dir/"journal.jsonl")==before,"FR06 corrupt unknown isolated in place without finalized mutation");
        check(c.Recover(&report)&&report.quarantined==1&&!c.catalog.FindSegmentById("ready-segment")&&
            ReadBytes(dir/partial_name)==damaged&&ReadBytes(dir/"journal.jsonl")==before,
            "FR06 repeated corruption recovery converges without resurrection");
    });
    for(const std::string state:{"pending","deleted","conflict"})run("FR07 "+state,[&]{
        const auto dir=root/("priority-"+state);Context c(dir);Seed(dir,bytes,segment);auto existing=segment;
        if(state=="conflict")existing.channel_id="different-channel";
        WriteBytes(dir/final_name,bytes);
        if(!c.catalog.FinalizeSegment(existing,(dir/final_name).string(),&c.error))throw std::runtime_error(c.error);
        if(state!="conflict"&&!c.catalog.RequestDeletion("ready-segment","quota",&c.error))throw std::runtime_error(c.error);
        if(state=="deleted"){
            RecordingTombstoneV1 t;t.tombstone_id="deleted-one";t.segment_id="ready-segment";
            t.source_id="source-one";t.channel_id="channel-one";t.recorded_range={1000,2000};
            t.checksum_sha256=segment.checksum_sha256;t.retention_class=segment.retention_class;t.deletion_reason="quota";t.deleted_at_ms=4000;
            if(!c.catalog.CompleteDeletion(t,&c.error))throw std::runtime_error(c.error);
        }
        // 원래 catalog가 정상 파일을 등록한 뒤 final이 사라지고 stale ready만 남은 상태.
        // pending/deleted/conflicting identity를 partial publish로 덮어쓰면 실패해야 한다.
        fs::remove(dir/final_name);
        const auto before=ReadBytes(dir/"journal.jsonl");FinalizeRecoveryReport report;
        check(!c.Recover(&report)&&ReadBytes(dir/"journal.jsonl")==before&&ReadBytes(dir/partial_name)==bytes&&
            !fs::exists(dir/final_name),"FR07 "+state+" takes precedence over ready publication");
    });
    run("FR08",[&]{
        const auto dir=root/"no-ticket";fs::create_directories(dir);WriteBytes(dir/final_name,bytes);WriteBytes(dir/partial_name,bytes);
        WriteBytes(dir/marker_name,"recording-cleanup-pending-v2\npartial="+partial_name+"\n");Context c(dir);FinalizeRecoveryReport report;
        check(c.Recover(&report)&&report.recovered==0&&!c.catalog.FindSegmentById("ready-segment")&&
            ReadBytes(dir/final_name)==bytes&&!fs::exists(dir/partial_name),"FR08 orphan not inferred and legacy owned partial cleaned");
    });
    std::cout<<"[boundary-summary] pass="<<passed<<" fail="<<failed<<'\n';return failed==0;
}
}
int main(int argc,char** argv) {
    if(argc!=2)return 2;
    const std::filesystem::path root(argv[1]);std::string error;
    const auto partial=root/"ready-segment.mp4.partial.123e4567-e89b-42d3-a456-426614174000";
    gst_init(nullptr,nullptr);GError* gst_error=nullptr;
    const auto launch="videotestsrc num-buffers=12 ! video/x-raw,width=160,height=90,framerate=12/1 ! x264enc tune=zerolatency speed-preset=ultrafast ! h264parse ! mp4mux ! filesink location="+partial.string();
    GstElement* pipeline=gst_parse_launch(launch.c_str(),&gst_error);
    if(!pipeline||gst_error){if(gst_error){std::cerr<<gst_error->message;g_error_free(gst_error);}if(pipeline)gst_object_unref(pipeline);return 2;}
    gst_element_set_state(pipeline,GST_STATE_PLAYING);GstBus* bus=gst_element_get_bus(pipeline);
    GstMessage* message=gst_bus_timed_pop_filtered(bus,10*GST_SECOND,static_cast<GstMessageType>(GST_MESSAGE_EOS|GST_MESSAGE_ERROR));
    const bool eos=message&&GST_MESSAGE_TYPE(message)==GST_MESSAGE_EOS;
    if(message)gst_message_unref(message);
    gst_element_set_state(pipeline,GST_STATE_NULL);gst_object_unref(bus);gst_object_unref(pipeline);
    if(!eos){std::cerr<<"real fixture EOS failed";return 2;}
    std::ifstream in(partial,std::ios::binary);const std::string bytes{std::istreambuf_iterator<char>(in),{}};
    gchar* hash=g_compute_checksum_for_data(G_CHECKSUM_SHA256,reinterpret_cast<const guchar*>(bytes.data()),bytes.size());
    recording::RecordingSegmentV1 segment;segment.segment_id="ready-segment";segment.source_id="source-one";segment.channel_id="channel-one";segment.stream_epoch_id="epoch-one";
    segment.start={1000,0,1,1000000000};segment.end={2000,1000000000,1,1000000000};segment.container="mp4";segment.video_codecs={"h264"};segment.audio_omitted_reason="source-no-audio";
    segment.size_bytes=bytes.size();segment.checksum_sha256=hash?hash:"";g_free(hash);segment.lifecycle=recording::RecordingLifecycle::Finalized;segment.created_at_ms=1000;segment.finalized_at_ms=2000;
    {std::ofstream ticket(root/"ready-segment.mp4.finalize-ready");ticket<<"{\"version\":1,\"segment\":"<<recording::SerializeRecordingSegmentV1(segment)<<",\"partial\":\""<<partial.filename().string()<<"\",\"final\":\"ready-segment.mp4\",\"eventLink\":null}";}
    {std::ofstream marker(root/"ready-segment.mp4.cleanup-pending");marker<<"recording-cleanup-pending-v2\npartial="<<partial.filename().string()<<"\n";}
    recording::RecordingJournal journal(root/"journal.jsonl");
    if(!journal.Open(&error)){std::cerr<<error;return 2;}
    recording::RecordingCatalog catalog(journal,{root/"catalog.db",root,false});
    if(!catalog.Open(&error)){std::cerr<<error;return 2;}
    recording::FinalizeRecoveryReport report;
    const bool ok=recording::RecoverFinalizeReadyTickets(catalog,root,&report,&error);
    const auto recovered=catalog.FindSegmentById("ready-segment");
    const bool registered=ok&&report.recovered==1&&recovered&&
        recovered->source_id=="source-one"&&recovered->channel_id=="channel-one"&&
        recovered->stream_epoch_id=="epoch-one"&&recovered->start.utc_ms==1000&&recovered->end.utc_ms==2000&&
        recovered->checksum_sha256==segment.checksum_sha256&&ReadBytes(root/final_name)==bytes&&
        !fs::exists(root/ready_name)&&!fs::exists(root/marker_name)&&!fs::exists(partial);
    std::cout<<(registered?"[pass] ":"[fail] ")<<"ready partial recovers original segment ID"<<'\n';
    const bool boundaries=BoundaryCases(root,bytes,segment);
    const bool v2=V2Cases(root,bytes,segment);
    return registered&&boundaries&&v2?0:1;
}
