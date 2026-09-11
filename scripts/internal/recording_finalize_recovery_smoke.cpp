// 파일 용도: 실제 ready 상태와 catalog recovery 경로를 검사하는 focused fixture.
#include "recording/recording_finalize_recovery.h"
#include "recording/recording_catalog.h"
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
    return registered&&boundaries?0:1;
}
