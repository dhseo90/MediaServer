// PREP 복합 경계의 격리 native 검사. 네트워크/모델 추론/앱 재기동 검사가 아니다.
#include "recording_media_test_fixture.h"
#include "core/shared_stream.h"
#include <sqlite3.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <atomic>
#include <cerrno>
#include <condition_variable>
#include <fstream>
#include <tuple>

namespace {
namespace fs=std::filesystem;
unsigned passed=0,failed=0;
const char* stage="root";
void Need(bool ok){if(!ok)throw std::runtime_error("preparation");}
void Check(bool ok,const char* id){std::cout<<(ok?"[pass] ":"[fail] ")<<id<<'\n';ok?++passed:++failed;if(!ok)throw std::runtime_error("assertion");}
std::string Bytes(const fs::path& path){std::ifstream in(path,std::ios::binary);Need(static_cast<bool>(in));return {std::istreambuf_iterator<char>(in),{}};}
bool Same(const media::Packet& a,const media::Packet& b){
    if(a.kind!=b.kind||a.codec!=b.codec||a.track_id!=b.track_id||a.is_key_frame!=b.is_key_frame||a.pts!=b.pts||a.dts!=b.dts||a.payload!=b.payload||!a.observation||!b.observation)return false;
    const auto& x=*a.observation;const auto& y=*b.observation;
    return std::tie(x.source_generation,x.generation_order,x.ordinal,x.pts_ns,x.dts_ns,x.duration_ns,x.clock_process_id,x.mono_before_ns,x.observed_utc_ns,x.mono_after_ns,x.discont)==
           std::tie(y.source_generation,y.generation_order,y.ordinal,y.pts_ns,y.dts_ns,y.duration_ns,y.clock_process_id,y.mono_before_ns,y.observed_utc_ns,y.mono_after_ns,y.discont);
}
struct Received {
    std::mutex mutex;std::condition_variable cv;std::vector<media::Packet> rows;bool overflow=false;
    Received(){rows.reserve(128);}
    void Add(const media::Packet& p){std::lock_guard lock(mutex);if(rows.size()==128)overflow=true;else rows.push_back(p);cv.notify_all();}
    bool Wait(std::size_t count){std::unique_lock lock(mutex);return cv.wait_for(lock,std::chrono::seconds(3),[&]{return rows.size()>=count||overflow;});}
    bool Equal(const std::vector<media::Packet>& expected,std::size_t begin=0){
        std::lock_guard lock(mutex);if(overflow||rows.size()!=expected.size()-begin)return false;
        for(std::size_t i=0;i<rows.size();++i)if(!Same(rows[i],expected[begin+i]))return false;
        return true;
    }
};
struct RestorePermissions {
    fs::path path;
    ~RestorePermissions(){if(chmod(path.c_str(),0700)!=0){std::fputs("[failure] permission-restore\n",stderr);std::_Exit(2);}}
};
void Unwritable(const fs::path& root){
    stage="unwritable";const auto path=root/"unwritable";Need(fs::create_directory(path));Need(chmod(path.c_str(),0700)==0);
    RestorePermissions restore{path};struct stat before{};Need(lstat(path.c_str(),&before)==0&&before.st_uid==geteuid());
    Need(chmod(path.c_str(),0500)==0);errno=0;const int fd=open((path/"write-probe").c_str(),O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW,0600);const int issue=errno;
    if(fd>=0)close(fd);
    std::cout<<"[permission] nonroot="<<(geteuid()!=0)<<" denied_errno="<<issue<<'\n';
    Check(geteuid()!=0&&fd<0&&(issue==EACCES||issue==EPERM)&&fs::is_empty(path),"PREP-C01 owned root really denies writes");
    bool opened=false;{recording::RecordingJournal journal(recording::RecordingJournal::ManagedOptions{path,"probe-store"});std::string error;opened=journal.Open(&error);}
    const bool empty=fs::is_empty(path);Need(chmod(path.c_str(),0700)==0);struct stat after{};Need(stat(path.c_str(),&after)==0);
    Check(!opened&&empty&&(after.st_mode&0777)==0700,"PREP-C02 managed Open fails without artifacts and permissions restored");
}
void Cached(const Encoded& input){
    stage="cached-gop";Received got;core::SharedStream stream({media::SourceSpec::Kind::File,"owned-fixture"});
    std::size_t last=0,keys=0;for(std::size_t i=0;i<input.packets.size();++i){if(input.packets[i].is_key_frame){last=i;++keys;}stream.FanOut(input.packets[i]);}
    Need(keys>=2&&last>0);Need(stream.AddRecordingSubscriber("owned-recorder",[&](const auto& p){got.Add(p);}));
    const bool delivered=got.Wait(input.packets.size()-last);stream.StopAllSubscribers();
    std::cout<<"[gop] input="<<input.packets.size()<<" keyframes="<<keys<<" expected_first_ordinal="<<input.packets[last].observation->ordinal<<" expected_count="<<input.packets.size()-last<<'\n';
    Check(delivered&&got.Equal(input.packets,last),"PREP-C03 recorder gets only latest GOP exact packets and observations");
}
void Blocked(const fs::path& root,const Encoded& input){
    stage="blocked-fanout";Store store(root/"blocked");Received client,analysis,recorder;std::atomic<unsigned> admissions{0},finalized{0};
    recording::GStreamerSegmentWriter::Options options(store.root,10000);options.managed_journal=&store.journal;options.managed_catalog=&store.catalog;options.managed_store_id="probe-store";
    options.admit_segment=[&](const auto&,auto){++admissions;recording::SegmentAdmissionDecision decision;decision.allowed=false;return decision;};
    recording::GStreamerSegmentWriter writer(options);std::string error;
    Need(writer.Start("channel-1","epoch-blocked",input.descriptor,[&](auto,auto,auto*){++finalized;return true;},&error));
    core::SharedStream stream({media::SourceSpec::Kind::File,"owned-fixture"});stream.SetDescriptor(input.descriptor);
    const bool c=stream.AddSubscriber("client",[&](const auto& p){client.Add(p);});
    const bool a=stream.AddAnalysisSubscriber("analysis",[&](const auto& p){analysis.Add(p);});
    const bool r=stream.AddRecordingSubscriber("recorder",[&](const auto& p){writer.Push(p,1789200000000LL+p.pts/1000000);recorder.Add(p);});
    Check(c&&a&&r&&stream.RefCount()==1&&stream.AnalysisSubscriberCount()==1&&stream.RecordingSubscriberCount()==1&&stream.TotalSubscriberCount()==3,
          "PREP-C04 actual Client Analysis Recorder roles on one SharedStream");
    for(const auto& p:input.packets)stream.FanOut(p);
    const bool delivered=client.Wait(input.packets.size())&&analysis.Wait(input.packets.size())&&recorder.Wait(input.packets.size());
    const auto dropped=stream.TotalDroppedPacketCount();stream.StopAllSubscribers();writer.Stop();
    std::size_t media=0;for(const auto& entry:fs::recursive_directory_iterator(store.root))if(entry.is_regular_file()){
        const auto name=entry.path().filename().string();if(name.find(".mp4")!=std::string::npos||name.find(".webm")!=std::string::npos||name.find(".partial")!=std::string::npos)++media;
    }
    std::cout<<"[blocked] admissions="<<admissions.load()<<" finalized="<<finalized.load()<<" media_files="<<media<<" dropped="<<dropped<<" input="<<input.packets.size()<<" modelInferencePass=0\n";
    Check(admissions.load()>0&&finalized.load()==0&&media==0&&store.Segments().empty(),"PREP-C05 actual writer admission denied and finalized media zero");
    Check(delivered&&dropped==0&&client.Equal(input.packets)&&analysis.Equal(input.packets)&&recorder.Equal(input.packets),
          "PREP-C06 blocked recording leaves exact Client Analysis delivery progressing");
}
bool SqlExec(const fs::path& path,const char* sql){sqlite3* db=nullptr;bool ok=sqlite3_open_v2(path.c_str(),&db,SQLITE_OPEN_READWRITE,nullptr)==SQLITE_OK;if(ok)ok=sqlite3_exec(db,sql,nullptr,nullptr,nullptr)==SQLITE_OK;if(db)sqlite3_close(db);return ok;}
std::string SqlValue(const fs::path& path,const char* sql){
    sqlite3* db=nullptr;sqlite3_stmt* stmt=nullptr;std::string value;
    if(sqlite3_open_v2(path.c_str(),&db,SQLITE_OPEN_READONLY,nullptr)==SQLITE_OK&&sqlite3_prepare_v2(db,sql,-1,&stmt,nullptr)==SQLITE_OK&&sqlite3_step(stmt)==SQLITE_ROW){const auto* text=sqlite3_column_text(stmt,0);if(text)value=reinterpret_cast<const char*>(text);}
    if(stmt)sqlite3_finalize(stmt);
    if(db)sqlite3_close(db);
    return value;
}
void Failover(const fs::path& root,const Encoded& input){
    stage="managed-failover";Store fixture(root/"fixture");
    recording::GStreamerSegmentWriter::Options options(fixture.root,10000);options.managed_journal=&fixture.journal;options.managed_catalog=&fixture.catalog;options.managed_store_id="probe-store";
    recording::GStreamerSegmentWriter writer(options);std::string error;Need(writer.Start("channel-1","epoch-fixture",input.descriptor,[](auto,auto,auto*){return true;},&error));
    for(const auto& p:input.packets)writer.Push(p,1789200000000LL+p.pts/1000000);
    writer.Stop();const auto segments=fixture.Segments();Need(segments.size()==1);
    const auto original=fixture.root/"channel-1"/(segments[0].segment_id+".mp4");const auto original_bytes=Bytes(original);
    auto segment=segments[0];segment.segment_id="fault-segment";segment.order_request_id="fault-order";
    const auto archive=root/"failover";std::string expected,journal_before;fs::path journal_path;
    {
        Store store(archive);Need(store.catalog.catalog_mode()=="sqlite-primary");recording::RecordingOrderReservationV1 order;
        Need(store.journal.ReserveRecordingOrder("probe-store",segment.order_request_id,segment.segment_id,segment.channel_id,&order,&error));segment.order_sequence=order.sequence;
        const auto file=archive/"fault.mp4";Need(fs::copy_file(original,file));expected=recording::SerializeRecordingSegmentV2(segment);Need(!expected.empty());
        const auto db=archive/"recording-catalog.sqlite3";
        Need(SqlExec(db,"CREATE TRIGGER prep_fail_insert BEFORE INSERT ON recording_segments_v2 BEGIN SELECT RAISE(ABORT,'owned-preparation-fault'); END"));
        const auto count_before=store.journal.Replay().mutations.size();const bool finalized=store.catalog.FinalizeSegmentV2(segment,file.string(),&error);
        const auto found=store.catalog.FindSegmentV2ById(segment.segment_id);journal_path=store.journal.path();journal_before=Bytes(journal_path);
        const bool fallback=store.catalog.catalog_mode()=="jsonl-fallback";
        Check(finalized&&fallback&&found&&recording::SerializeRecordingSegmentV2(*found)==expected&&store.journal.Replay().mutations.size()>count_before&&
              store.catalog.recovery_report().projection_error_count>0&&Bytes(file)==original_bytes,
              "PREP-C07 managed SQLite INSERT fault preserves journal memory and fallback");
        Need(SqlExec(db,"DROP TRIGGER prep_fail_insert"));
    }
    stage="managed-reopen";
    {
        Store reopened(archive);const auto found=reopened.catalog.FindSegmentV2ById(segment.segment_id);const auto db=archive/"recording-catalog.sqlite3";
        std::size_t finalizations=0;for(const auto& m:reopened.journal.Replay().mutations)if(m.entity_id==segment.segment_id&&
            (m.mutation_type==recording::RecordingMutationType::SegmentV2Finalized||m.mutation_type==recording::RecordingMutationType::SegmentV2BoundFinalized))++finalizations;
        Check(reopened.catalog.catalog_mode()=="sqlite-primary"&&found&&recording::SerializeRecordingSegmentV2(*found)==expected&&
              SqlValue(db,"SELECT payload_json FROM recording_segments_v2 WHERE segment_id='fault-segment'")==expected&&
              SqlValue(db,"SELECT COUNT(*) FROM recording_segments_v2 WHERE segment_id='fault-segment'")=="1"&&finalizations==1&&
              Bytes(journal_path)==journal_before&&Bytes(archive/"fault.mp4")==original_bytes&&Bytes(original)==original_bytes,
              "PREP-C08 same managed archive exact payload SQL rebuild and no duplicate");
    }
}
}
int main(int argc,char** argv){
    if(argc!=2)return 2;
    try{
        const fs::path root=argv[1];const auto name=root.filename().string();const std::string prefix="media-server-preparation.";
        Need(name.size()==prefix.size()+6&&name.compare(0,prefix.size(),prefix)==0);
        for(std::size_t i=prefix.size();i<name.size();++i)Need(g_ascii_isalnum(static_cast<guchar>(name[i])));
        struct stat info{};Need(root.is_absolute()&&fs::canonical(root)==root&&lstat(root.c_str(),&info)==0&&S_ISDIR(info.st_mode)&&(info.st_mode&0777)==0700&&info.st_uid==geteuid());
        Unwritable(root);gst_init(nullptr,nullptr);auto input=Encode(20,false,false);Shift(input,0);
        Cached(input);Blocked(root,input);Failover(root,input);
        std::cout<<"[summary] pass="<<passed<<" fail="<<failed<<" scope=preparation-contracts network=0 modelInferencePass=0 applicationRestartPass=0\n";return failed?1:0;
    }catch(...){std::cout<<"[failure] stage="<<stage<<" reason="<<(failed?"assertion-failed":"preparation-failed")<<" rawPublished=0\n[summary] pass="<<passed<<" fail="<<failed<<'\n';return failed?1:2;}
}
