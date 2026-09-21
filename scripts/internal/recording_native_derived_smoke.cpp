// 파일 용도: LP09-S03b/c: 실제 파일 증거와 새 파생 profile의 생성·저장·재개방 계약.
#include "recording_media_test_fixture.h"
#include "recording/recording_derived_selection.h"
#include "recording/recording_derived_job_service.h"
#include "recording/recording_derived_remux.h"
#include "recording/recording_derived_event_worker.h"
#include "recording/retention_coordinator.h"
#include <fstream>
#include <set>
#include <spawn.h>
#include <sys/wait.h>
#include <unistd.h>
#include <signal.h>
#include <thread>
extern char** environ;
using namespace recording;
int passed=0,failed=0;
void Check(bool ok,const std::string& label){std::cout<<(ok?"[pass] ":"[fail] ")<<label<<'\n';ok?++passed:++failed;}
void Need(bool ok,const std::string& label){if(!ok)throw std::runtime_error(label);}
std::string Digest(const std::filesystem::path& file){std::ifstream in(file,std::ios::binary);std::string bytes{std::istreambuf_iterator<char>(in),{}};Need(!bytes.empty(),"output-empty");auto* h=g_compute_checksum_for_data(G_CHECKSUM_SHA256,reinterpret_cast<const guchar*>(bytes.data()),bytes.size());std::string result=h;g_free(h);return result;}
void Run(const std::filesystem::path& root,int which,bool crash=false) {
    const std::string name="LP09-S03 case"+std::to_string(which);std::string canonical,job_id,reference_id,error;
    {
        auto input=which==0?Encode(501,false,false,160,90,30,250):Encode(which==3?12:30,which==2,which==1,160,90,30,250);
        Shift(input,0);if(which==0)input.packets.resize(300);
        if(which==3){std::int64_t t=0;for(std::size_t i=0;i<input.packets.size();++i){auto& p=input.packets[i];p.pts=p.dts=t;p.observation->pts_ns=t;p.observation->dts_ns=t;p.observation->duration_ns=i+1==input.packets.size()?70000000:(i%2?50000000:20000000);t+=*p.observation->duration_ns;}}
        Store store(root);GStreamerSegmentWriter::Options wo(root,which==0?2000:10000);wo.managed_journal=&store.journal;wo.managed_catalog=&store.catalog;wo.managed_store_id="probe-store";
        GStreamerSegmentWriter writer(wo);Need(writer.Start("probe-channel","unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"writer-start");for(const auto& p:input.packets)writer.Push(p,0);writer.Stop();
        auto segments=store.Segments();Need(segments.size()==(which==0?2U:1U),"source-count");std::vector<DerivedSourceEvidence> sources;
        for(const auto& s:segments){auto b=store.catalog.FindSourceBinding(s.segment_id);Need(b&&b->file_evidence,"file-proof-required");sources.push_back({s,b,false});}
        analysis::DecodedIntervalSnapshot evidence;evidence.analysis_namespace="native-fixture";
        for(const auto& p:input.packets){if(which==4&&p.observation->ordinal==13)continue;analysis::DecodedIntervalEvidence f;f.analysis_pts_ns=p.pts;f.duration_ns=p.observation->duration_ns;f.association={analysis::SourceAssociationQuality::TimestampMatch,analysis::OriginalSampleIdentity{p.observation->source_generation,p.observation->generation_order,p.observation->ordinal,p.track_id,*p.observation->pts_ns}};evidence.frames.push_back(f);}
        RecordingConsumerReferenceV1 ref;ref.reference_id="native-ref";ref.kind="event";ref.owner_id="native-event";ref.source_id=ref.channel_id="probe-channel";ref.analysis_namespace=evidence.analysis_namespace;ref.analysis_track_id="native-track";ref.association_quality="timestamp-match";ref.original=RecordingConsumerOriginalV1{"probe-generation-a",1,1,"video-0",*input.packets[0].observation->pts_ns};ref.request=RecordingConsumerRequestV1{"media-pts-ms",which==0?8000:(which==3?20:200),which==0?9000:(which==3?300:800),0,0};
        DerivedRecordingSelection selection;Need(SelectDerivedRecording(ref,evidence,sources,nullptr,&selection,&error,true),"native-select");
        Check(selection.native_file_intervals&&selection.complete==(which!=4&&which!=5),name+" observed native selection preserves complete/partial");
        DerivedJobIntentV1 intent;Need(BuildDerivedJobIntent(selection,sources,32U*1024*1024,100,&intent,&error),"native-intent:"+error);job_id=intent.job_id;reference_id=ref.reference_id;
        Need(store.catalog.PutConsumerReference(ref,&error),"put-ref");RetentionCoordinator retention(store.catalog,[&]{return store.catalog.RetentionSnapshot();},[](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,root});Need(retention.UpdateChannelPolicy(ref.channel_id,{1024ULL*1024*1024,0,1024ULL*1024*1024,0},&error),"policy");
        DerivedJobService service(store.catalog,store.journal,{root,30000,[&](auto stage,auto){if(crash&&stage==DerivedJobProgress::ReadyDurable){std::cout.flush();::_exit(23);}}});DerivedJobRunResult run;
        if(which==0&&!crash){DerivedEventWorkerOptions options;options.wait_ms=0;options.max_attempts=1;options.reserved_bytes=32U*1024*1024;options.now_ms=[]{return 100;};DerivedEventWorker worker(store.catalog,retention,service,options);Need(worker.Submit(ref,std::make_shared<const analysis::DecodedIntervalSnapshot>(evidence),&error),"native-worker-submit");RecordingDerivedReferenceResult result;const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(15);do{result=worker.Query(ref.reference_id);if(result.state!="pending")break;std::this_thread::sleep_for(std::chrono::milliseconds(10));}while(std::chrono::steady_clock::now()<deadline);worker.StopAndDrain();if(result.jobs.size()==1)run.job=result.jobs[0].job;run.complete=run.job&&run.job->state==DerivedJobState::Complete&&run.job->intent.job_id==intent.job_id;run.reason=result.reason;Check(run.job&&run.job->intent.profile==intent.profile,name+" worker uses new native profile without changing wait budget");}
        else{Need(retention.AdmitDerivedJob(store.catalog,intent,100).accepted,"admission");run=service.Run(job_id);}
        Check(run.complete&&run.job&&run.job->ready,name+" actual native remux Ready Complete");
        if(!run.complete||!run.job||!run.job->ready){std::cout<<"[diagnostic] reason="<<run.reason<<'\n';return;}
        const auto& job=*run.job;Check(job.ready->request_fully_satisfied==(which!=4&&which!=5)&&job.ready->outputs.size()==(which==0?2U:1U),name+" full request and literal output count");
        bool bytes=true;for(std::size_t i=0;i<job.ready->outputs.size();++i){const auto& p=job.ready->outputs[i].provenance;bytes&=Digest(root/intent.outputs[i].final_relpath)==p.checksum_sha256&&p.source_decoded_sha256==p.output_decoded_sha256&&!p.access_units.empty();}
        Check(bytes,name+" physical file and decoded hashes");canonical=SerializeDerivedJobRecord(job);Need(!canonical.empty(),"native-record");
        // manifest를 새로 만들어도 native ordinal/time/VCL 거짓 주장을 수락하면 안 된다.
        DerivedJobRecordV1 draft=job;draft.state=DerivedJobState::Intent;draft.ready.reset();draft.cleaned_at_ms=0;
        DerivedRemuxResult remux;remux.selection=selection;remux.verified_output=true;remux.request_fully_satisfied=job.ready->request_fully_satisfied;remux.unfulfilled=job.ready->unfulfilled;std::vector<std::int64_t> orders;
        for(const auto& o:job.ready->outputs){remux.outputs.push_back(o.provenance);orders.push_back(o.segment.order_sequence);}
        auto altered=remux;++altered.outputs[0].access_units[0].file_pts_ns;DerivedJobRecordV1 rejected;
        Check(!BuildDerivedJobReady(draft,altered,orders,200,&rejected,&error),name+" Ready rejects altered file timestamp with regenerated manifest");
        Need(store.catalog.Checkpoint(&error),"checkpoint");
    }
    if(canonical.empty())return;
    for(bool sql:{false,true}){RecordingJournal journal(RecordingJournal::ManagedOptions{root,"probe-store"});Need(journal.Open(&error),"reopen-journal");auto opts=Store::Options(root);opts.prefer_sqlite=sql;RecordingCatalog catalog(journal,opts);Need(catalog.Open(&error),"reopen-catalog");std::optional<DerivedJobRecordV1> job;Need(catalog.FindDerivedJob(job_id,&job,&error),"find-job");Check(job&&SerializeDerivedJobRecord(*job)==canonical,name+" exact recovery sql"+std::to_string(sql));RecordingDerivedReferenceResult result;Need(catalog.QueryDerivedReferenceResult(reference_id,&result,&error),"reference-query");Check(result.jobs.size()==1&&result.jobs[0].job.ready&&result.jobs[0].job.ready->request_fully_satisfied==(which!=4&&which!=5),name+" recovered reference completeness sql"+std::to_string(sql));
        RecordingTimelineResult timeline;Need(catalog.SnapshotTimelineV2({"probe-channel",1789199999000LL,1789200030000LL,0,4096},&timeline,&error),"timeline");std::set<std::pair<std::string,std::string>> ids;bool consistent=true;std::size_t count=0;
        for(const auto& row:timeline.items)if(row.job_id==job_id){++count;consistent&=row.completeness==(which==4?"partial":"complete")&&ids.emplace(row.segment_id,row.mapping_id).second;}
        // B-frame 관측 역행/VFR의 수정된 PTS는 이 fixture에서 UTC를 입증하지 않는다.
        // 실제 native media complete와 UTC 배치 가능성은 별개의 계약이다.
        std::size_t unplaced=0;for(const auto& row:timeline.unplaced_items)if(row.job_id==job_id){++unplaced;++count;consistent&=row.completeness==(which==4?"partial":"complete")&&!row.utc_start_ns&&!row.utc_end_ns&&row.unplaced;}
        if(which==2||which==3)consistent&=unplaced>0;
        if(!consistent||!count){std::cout<<"[timeline-diagnostic] case="<<which<<" sql="<<sql<<" count="<<count<<" consistent="<<consistent<<'\n';for(const auto& row:timeline.items)if(row.job_id==job_id)std::cout<<"[timeline-row] map="<<row.mapping_id<<" utc="<<row.utc_start_ns.value_or(-1)<<":"<<row.utc_end_ns.value_or(-1)<<" completeness="<<row.completeness<<'\n';if(job)for(const auto& source:job->intent.sources){const auto& proof=*source.binding.file_evidence;std::cout<<"[native-table] origin="<<proof.writer_origin_ns<<" scale="<<proof.timescale<<'\n';for(const auto& sample:proof.samples)std::cout<<"[native-sample] ordinal="<<sample.ordinal<<" pts="<<sample.native_pts<<" duration="<<sample.native_duration<<'\n';}}
        Check(count>0&&consistent,name+" timeline native interval and independent UTC placement sql"+std::to_string(sql));
    }
}
void Recover(const char* executable,const std::filesystem::path& root) {
    std::string path=root.string(),flag="--crash";char* args[]={const_cast<char*>(executable),path.data(),flag.data(),nullptr};pid_t pid=0;
    Need(posix_spawn(&pid,executable,nullptr,nullptr,args,environ)==0,"native-crash-spawn");int status=0;bool done=false;
    const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(45);
    while(std::chrono::steady_clock::now()<deadline){const auto got=waitpid(pid,&status,WNOHANG);if(got==pid){done=true;break;}if(got<0)throw std::runtime_error("native-crash-wait");std::this_thread::sleep_for(std::chrono::milliseconds(10));}
    if(!done){kill(pid,SIGKILL);waitpid(pid,&status,0);throw std::runtime_error("native-crash-timeout-cleaned");}
    Check(WIFEXITED(status)&&WEXITSTATUS(status)==23,"LP09-S03c native Ready child exit23 expected");Need(WIFEXITED(status)&&WEXITSTATUS(status)==23,"native-crash-phase");
    Store store(root);std::string error;std::vector<DerivedJobRecordV1> jobs;Need(store.catalog.SnapshotDerivedJobs(&jobs,&error)&&jobs.size()==1&&jobs[0].state==DerivedJobState::Ready,"native-ready-retained");const auto identity=jobs[0].intent.job_id;
    DerivedJobService service(store.catalog,store.journal,{root,30000,{}});const auto recovered=service.Reconcile();std::optional<DerivedJobRecordV1> job;Need(store.catalog.FindDerivedJob(identity,&job,&error),"native-recovered-query");
    Check(!recovered.empty()&&job&&job->state==DerivedJobState::Complete&&job->ready&&job->ready->request_fully_satisfied&&job->ready->outputs.size()==2,"LP09-S03c native Ready recovery same ID complete2");
    bool verified=job&&job->ready;if(verified)for(std::size_t i=0;i<job->ready->outputs.size();++i)verified&=Digest(root/job->intent.outputs[i].final_relpath)==job->ready->outputs[i].segment.checksum_sha256&&!std::filesystem::exists(root/job->intent.outputs[i].temporary_relpath);
    Check(verified&&store.catalog.RetentionSnapshot().durable_reservations.empty()&&!std::filesystem::exists(root/".derived-jobs"/identity),"LP09-S03c native recovery file hashes and resource cleanup");
}
int main(int argc,char** argv){if(argc!=2&&argc!=3)return 2;gst_init(nullptr,nullptr);try{if(argc==3&&std::string(argv[2])=="--crash"){Run(argv[1],0,true);return 2;}if(argc==3){Need(std::string(argv[2])=="--worker","native-mode");Run(std::filesystem::path(argv[1])/"worker",0);}else{for(int i=0;i<5;++i)Run(std::filesystem::path(argv[1])/std::to_string(i),i);if(!failed)Recover(argv[0],std::filesystem::path(argv[1])/"ready-crash");}}catch(const std::exception& e){Check(false,std::string("native fixture: ")+e.what());}std::cout<<"[summary] pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;}
