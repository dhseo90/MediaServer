// 파일 용도: 기존 실제 H264 writer fixture를 내구 job 서비스의 끝까지 연결한다.
#include "recording_media_test_fixture.h"
#include "recording/recording_derived_job_service.h"
#include "recording/recording_derived_selection.h"
#include "recording/recording_derived_remux.h"
#include <fcntl.h>
#include <unistd.h>
#include <set>
#include <iostream>
#include <spawn.h>
#include <sys/wait.h>
#include <sys/stat.h>
#include <sqlite3.h>
extern char** environ;
std::string FileDigest(const std::filesystem::path& path){
    const int fd=::open(path.c_str(),O_RDONLY|O_NONBLOCK|O_NOFOLLOW|O_CLOEXEC);struct stat s{};
    if(fd<0||::fstat(fd,&s)<0||!S_ISREG(s.st_mode)||s.st_size>256*1024*1024)throw std::runtime_error("oracle regular file");
    auto* sum=g_checksum_new(G_CHECKSUM_SHA256);std::array<unsigned char,65536> bytes{};
    for(;;){const auto n=::read(fd,bytes.data(),bytes.size());if(n==0)break;if(n<0)throw std::runtime_error("oracle hash read");g_checksum_update(sum,bytes.data(),n);}
    const std::string hash=g_checksum_get_string(sum);g_checksum_free(sum);::close(fd);return hash;
}
bool DecodeFile(const std::filesystem::path& path){
    const int fd=::open(path.c_str(),O_RDONLY|O_NOFOLLOW|O_CLOEXEC);if(fd<0)return false;
    GError* error=nullptr;
    const auto demux=path.extension()==".mp4"?"qtdemux":"tsdemux";
    auto* pipeline=gst_parse_launch(("fdsrc fd="+std::to_string(fd)+" ! "+demux+" ! h264parse ! avdec_h264 ! appsink name=sink sync=false").c_str(),&error);
    if(!pipeline||error){if(error)g_error_free(error);if(pipeline)gst_object_unref(pipeline);::close(fd);return false;}
    auto* sink=GST_APP_SINK(gst_bin_get_by_name(GST_BIN(pipeline),"sink"));auto* bus=gst_element_get_bus(pipeline);
    gst_element_set_state(pipeline,GST_STATE_PLAYING);int count=0;bool ok=true,eos=false;
    const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(5);
    while(std::chrono::steady_clock::now()<deadline){
        if(auto* sample=gst_app_sink_try_pull_sample(sink,20*GST_MSECOND)){++count;gst_sample_unref(sample);}
        if(auto* message=gst_bus_pop_filtered(bus,static_cast<GstMessageType>(GST_MESSAGE_ERROR|GST_MESSAGE_EOS))){
            ok=GST_MESSAGE_TYPE(message)!=GST_MESSAGE_ERROR;eos=GST_MESSAGE_TYPE(message)==GST_MESSAGE_EOS;gst_message_unref(message);if(!ok||eos)break;
        }
    }
    gst_element_set_state(pipeline,GST_STATE_NULL);gst_object_unref(bus);gst_object_unref(sink);gst_object_unref(pipeline);::close(fd);
    std::cout<<"[decode] frames="<<count<<" eos="<<eos<<" error_free="<<ok<<'\n';return ok&&eos&&count>0;
}
bool CompletedOracle(Store& store,const recording::DerivedJobRecordV1& job,bool decode){
    if(job.state!=recording::DerivedJobState::Complete||!job.ready||job.ready->outputs.size()!=2)return false;
    const auto snapshot=store.catalog.RetentionSnapshot();if(!snapshot.authoritative||!snapshot.durable_reservations.empty())return false;
    std::set<std::string> released;for(const auto& source:job.intent.sources)released.insert(source.segment.segment_id);
    int commits=0;bool payload=false;
    for(const auto& mutation:store.journal.Replay().mutations)if(mutation.mutation_type==recording::RecordingMutationType::DerivedJobCommitted&&mutation.entity_id==job.intent.job_id){
        ++commits;recording::DerivedJobRecordV1 record;std::string error;
        payload=recording::ParseDerivedJobRecord(mutation.payload_json,&record,&error)&&record.ready&&recording::SerializeDerivedJobReady(*record.ready)==recording::SerializeDerivedJobReady(*job.ready);
    }
    if(commits!=1||!payload)return false;
    for(std::size_t i=0;i<job.ready->outputs.size();++i){
        const auto& output=job.ready->outputs[i];const auto& plan=job.intent.outputs[i];
        const auto catalog=store.catalog.FindSegmentV2ById(plan.output_id);
        if(!catalog||recording::SerializeRecordingSegmentV2(*catalog)!=recording::SerializeRecordingSegmentV2(output.segment))return false;
        const auto path=store.root/plan.final_relpath;struct stat s{};
        if(::lstat(path.c_str(),&s)<0||!S_ISREG(s.st_mode)||s.st_nlink!=1||static_cast<std::uint64_t>(s.st_dev)!=job.files[i].device||static_cast<std::uint64_t>(s.st_ino)!=job.files[i].inode||static_cast<std::uint64_t>(s.st_size)!=output.segment.size_bytes||FileDigest(path)!=output.segment.checksum_sha256||std::filesystem::exists(store.root/plan.temporary_relpath))return false;
        if(decode&&!DecodeFile(path))return false;
        released.insert(plan.output_id);
    }
    for(const auto& candidate:snapshot.candidates)if(candidate.segment_v2&&released.count(candidate.segment_v2->segment_id)){
        if(candidate.hold_count||candidate.media_path!=store.root/(candidate.segment_v2->channel_id+"/"+candidate.segment_v2->segment_id+(candidate.segment_v2->container=="mpegts"?".ts":".mp4")))return false;
        released.erase(candidate.segment_v2->segment_id);
    }
    std::cout<<"[oracle] committed_mutations="<<commits<<" outputs="<<job.ready->outputs.size()<<" metadata_file_hash_inode_checked=true\n";
    return released.empty()&&!std::filesystem::exists(store.root/".derived-jobs"/job.intent.job_id);
}
std::string OwnedPathsFingerprint(const std::filesystem::path& root,const recording::DerivedJobRecordV1& job){
    std::set<std::filesystem::path> paths;
    for(const auto& output:job.intent.outputs){
        paths.insert(root/output.temporary_relpath);paths.insert(root/output.final_relpath);
        const auto p=std::filesystem::path(output.temporary_relpath);
        paths.insert(root/(p.parent_path().string()+".moved")/p.filename());
    }
    paths.insert(root/"foreign-hardlink");std::string result;
    for(const auto& path:paths){
        struct stat s{};result+=path.string()+":";
        if(::lstat(path.c_str(),&s)<0){if(errno!=ENOENT)throw std::runtime_error("oracle path stat");result+="missing;";continue;}
        result+=std::to_string(s.st_dev)+":"+std::to_string(s.st_ino)+":"+std::to_string(s.st_mode)+":"+std::to_string(s.st_nlink)+":"+std::to_string(s.st_size);
        if(S_ISREG(s.st_mode))result+=FileDigest(path);result+=';';
    }
    return result;
}
recording::DerivedJobIntentV1 Prepare(Store& store,const Encoded& input,std::uint64_t reserved=8*1024*1024) {
        recording::GStreamerSegmentWriter::Options options(store.root,1000);
        options.managed_journal=&store.journal;options.managed_catalog=&store.catalog;options.managed_store_id="probe-store";
        recording::GStreamerSegmentWriter writer(options);std::string error;
        if(!writer.Start("probe-channel","unused",input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error(error);
        for(const auto& packet:input.packets)writer.Push(packet,0);writer.Stop();
        std::vector<recording::DerivedSourceEvidence> sources;
        for(const auto& segment:store.Segments())sources.push_back({segment,store.catalog.FindSourceBinding(segment.segment_id),false});
        analysis::DecodedIntervalCollector collector;
        for(const auto& p:input.packets){analysis::DecodedIntervalEvidence e;e.analysis_pts_ns=p.pts;e.duration_ns=p.observation->duration_ns;
            e.association={analysis::SourceAssociationQuality::TimestampMatch,analysis::OriginalSampleIdentity{p.observation->source_generation,p.observation->generation_order,p.observation->ordinal,p.track_id,*p.observation->pts_ns}};collector.Append(std::move(e));}
        recording::RecordingConsumerReferenceV1 ref;ref.reference_id="job-service-ref";ref.kind="event";ref.owner_id="job-service-event";
        ref.source_id="probe-channel";ref.channel_id="probe-channel";ref.analysis_namespace="job-service-r0";ref.analysis_track_id="track-1";
        ref.association_quality="timestamp-match";ref.original=recording::RecordingConsumerOriginalV1{"probe-generation-a",1,1,"video-0",7000000000ULL};
        ref.request=recording::RecordingConsumerRequestV1{"media-pts-ms",7000,8500,0,0};
        recording::DerivedRecordingSelection selection;recording::DerivedJobIntentV1 intent;
        if(!recording::SelectDerivedRecording(ref,*collector.Snapshot(ref.analysis_namespace),sources,nullptr,&selection,&error)||
           !recording::BuildDerivedJobIntent(selection,sources,reserved,10,&intent,&error))throw std::runtime_error(error);
        recording::RetentionCoordinator retention(store.catalog,[&]{return store.catalog.RetentionSnapshot();},[](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,store.root});
        if(!retention.UpdateChannelPolicy("probe-channel",{1024ULL*1024*1024,0,1024ULL*1024*1024,0},&error)||
           !retention.AdmitDerivedJob(store.catalog,intent,10).accepted)throw std::runtime_error("fixture intent admission");
    return intent;
}
int Child(int argc,char** argv){
    if(argc!=7)return 2;
    Store store(argv[2]);std::string error;std::vector<recording::DerivedJobRecordV1> jobs;
    if(!store.catalog.SnapshotDerivedJobs(&jobs,&error))throw std::runtime_error(error);
    const std::string mode=argv[3];
    if(jobs.empty()){
        if(mode=="recover")throw std::runtime_error("child missing intent");
        auto input=Encode(30,false,false);Shift(input,7000000000ULL);Prepare(store,input,mode=="small"?32:8*1024*1024);
        if(!store.catalog.SnapshotDerivedJobs(&jobs,&error))throw std::runtime_error(error);
    }
    if(jobs.size()!=1)throw std::runtime_error("child job count");
    const int target=std::stoi(argv[4]),index=std::stoi(argv[5]);
    const auto before=store.catalog.RetentionSnapshot();
    const auto paths_before=OwnedPathsFingerprint(store.root,jobs.front());
    const bool active=recording::DerivedJobActive(jobs.front());
    if(!before.authoritative||(active&&before.durable_reservations.size()!=1))throw std::runtime_error("startup reservation ordering");
    if(active){
        std::vector<std::pair<std::string,std::string>> protected_ids;
        for(const auto& source:jobs.front().intent.sources)protected_ids.push_back({source.segment.segment_id,"continuous-capacity"});
        if(jobs.front().state==recording::DerivedJobState::Committed)for(const auto& output:jobs.front().intent.outputs)protected_ids.push_back({output.output_id,"event-capacity"});
        for(const auto& pair:protected_ids){
            const auto& id=pair.first;const auto& reason=pair.second;
            const auto found=std::find_if(before.candidates.begin(),before.candidates.end(),[&](const auto& candidate){return candidate.Id()==id;});
            if(found==before.candidates.end()||found->hold_count==0||store.catalog.RequestDeletion(id,reason,&error))throw std::runtime_error("startup protected source/output");
        }
    }
    bool cancel=false;
    recording::DerivedJobService service(store.catalog,store.journal,{store.root,mode=="deadline"?1U:30000U,[&](auto stage,std::size_t actual){
        if(mode=="cancel-before-create"&&stage==recording::DerivedJobProgress::BeforeCreate)cancel=true;
        if(mode=="cancel"&&stage==recording::DerivedJobProgress::ReceiptDurable)cancel=true;
        if(static_cast<int>(stage)==target&&static_cast<int>(actual)==index){std::cout<<"[fault] stage="<<target<<" index="<<index<<" durable_state_before_exit=true"<<std::endl;::_exit(73);}
    }});
    recording::DerivedJobRunResult result;
    if(mode!="recover")result=service.Run(jobs.front().intent.job_id,[&]{return cancel;});
    else{
        const auto values=service.Reconcile();
        if(values.empty()){
            std::optional<recording::DerivedJobRecordV1> current;
            if(!store.catalog.FindDerivedJob(jobs.front().intent.job_id,&current,&error))throw std::runtime_error(error);
            result={current&&current->state==recording::DerivedJobState::Complete,false,"",current};
        }else result=values.front();
    }
    const std::string expected=argv[6];
    const bool ok=expected=="complete"?(result.complete&&!result.blocked):expected=="failed"?(!result.blocked&&result.job&&result.job->state==recording::DerivedJobState::Failed):result.blocked;
    const auto after=store.catalog.RetentionSnapshot();
    bool resources=after.authoritative;
    if(expected=="blocked")resources=resources&&after.durable_reservations.size()==1;
    else resources=resources&&after.durable_reservations.empty();
    if(expected=="blocked"){
        resources=resources&&paths_before==OwnedPathsFingerprint(store.root,jobs.front());
        for(const auto& source:jobs.front().intent.sources){
            const auto found=std::find_if(after.candidates.begin(),after.candidates.end(),[&](const auto& c){return c.Id()==source.segment.segment_id;});
            resources=resources&&found!=after.candidates.end()&&found->hold_count>0&&!store.catalog.RequestDeletion(source.segment.segment_id,"continuous-capacity",&error);
        }
    }
    if(expected=="failed"){
        for(const auto& source:jobs.front().intent.sources){
            const auto found=std::find_if(after.candidates.begin(),after.candidates.end(),[&](const auto& c){return c.Id()==source.segment.segment_id;});
            resources=resources&&found!=after.candidates.end()&&found->hold_count==0;
        }
        for(const auto& output:jobs.front().intent.outputs)resources=resources&&!std::filesystem::exists(store.root/output.temporary_relpath)&&!std::filesystem::exists(store.root/output.final_relpath)&&!store.catalog.FindSegmentV2ById(output.output_id);
        resources=resources&&!std::filesystem::exists(store.root/".derived-jobs"/jobs.front().intent.job_id);
        for(const auto& mutation:store.journal.Replay().mutations)if(mutation.entity_id==jobs.front().intent.job_id&&mutation.mutation_type==recording::RecordingMutationType::DerivedJobCommitted)resources=false;
    }
    if(expected=="complete"&&result.job)resources=resources&&CompletedOracle(store,*result.job,store.root.filename()=="fault-3");
    std::cout<<"[child] mode="<<mode<<" expected="<<expected<<" observed_complete="<<result.complete<<" blocked="<<result.blocked<<" resources_and_files="<<resources<<" reason="<<result.reason<<std::endl;
    return ok&&resources?0:1;
}
void Tamper(const std::filesystem::path& root,const std::string& kind){
    Store store(root);std::string error;std::vector<recording::DerivedJobRecordV1> jobs;
    if(!store.catalog.SnapshotDerivedJobs(&jobs,&error)||jobs.size()!=1)throw std::runtime_error("tamper job");
    const auto path=root/jobs.front().intent.outputs.front().temporary_relpath;
    if(kind=="hash"){
        const int fd=::open(path.c_str(),O_RDWR|O_NOFOLLOW);unsigned char byte=0;
        if(fd<0||::pread(fd,&byte,1,0)!=1)throw std::runtime_error("tamper hash read");byte^=1;
        if(::pwrite(fd,&byte,1,0)!=1)throw std::runtime_error("tamper hash write");::close(fd);
    }else if(kind=="hardlink"){
        if(::link(path.c_str(),(root/"foreign-hardlink").c_str())<0)throw std::runtime_error("tamper link");
    }else if(kind=="parent"){
        const auto parent=path.parent_path();std::filesystem::rename(parent,parent.string()+".moved");std::filesystem::create_directory(parent);
    }else{
        if(::unlink(path.c_str())<0)throw std::runtime_error("tamper unlink");
        if(kind=="foreign"){
            const int fd=::open(path.c_str(),O_RDWR|O_CREAT|O_EXCL,0600);if(fd<0)throw std::runtime_error("tamper foreign");::close(fd);
        }else if(kind=="symlink"){
            if(::symlink("foreign-target",path.c_str())<0)throw std::runtime_error("tamper symlink");
        }else if(kind=="fifo"){
            if(::mkfifo(path.c_str(),0600)<0)throw std::runtime_error("tamper fifo");
        }else if(kind!="missing")throw std::runtime_error("tamper kind");
    }
}
int Spawn(const char* executable,const std::filesystem::path& root,const char* mode,int stage,int index,const char* expected){
    std::vector<std::string> values{executable,"child",root.string(),mode,std::to_string(stage),std::to_string(index),expected};
    std::vector<char*> args;for(auto& value:values)args.push_back(value.data());args.push_back(nullptr);
    pid_t pid=0;if(::posix_spawn(&pid,executable,nullptr,nullptr,args.data(),environ)!=0)throw std::runtime_error("spawn");
    int status=0;while(::waitpid(pid,&status,0)<0){if(errno!=EINTR)throw std::runtime_error("waitpid");}
    return WIFEXITED(status)?WEXITSTATUS(status):128+WTERMSIG(status);
}
std::string ReopenState(const std::filesystem::path& root,bool sqlite,bool checkpoint){
    recording::RecordingJournal journal(recording::RecordingJournal::ManagedOptions{root,"probe-store"});
    auto options=Store::Options(root);options.prefer_sqlite=sqlite;
    recording::RecordingCatalog catalog(journal,options);std::string error;
    if(!journal.Open(&error)||!catalog.Open(&error))throw std::runtime_error("reopen: "+error);
    std::vector<recording::DerivedJobRecordV1> jobs;
    if(!catalog.SnapshotDerivedJobs(&jobs,&error)||jobs.size()!=1)throw std::runtime_error("reopen jobs");
    if(checkpoint&&!catalog.Checkpoint(&error))throw std::runtime_error("checkpoint: "+error);
    const auto canonical=recording::SerializeDerivedJobRecord(jobs.front());
    if(sqlite){
        sqlite3* db=nullptr;sqlite3_stmt* statement=nullptr;
        if(sqlite3_open_v2((root/"recording-catalog.sqlite3").c_str(),&db,SQLITE_OPEN_READONLY,nullptr)!=SQLITE_OK)throw std::runtime_error("projection open");
        if(sqlite3_prepare_v2(db,"SELECT payload_json FROM recording_derived_jobs",-1,&statement,nullptr)!=SQLITE_OK||sqlite3_step(statement)!=SQLITE_ROW)throw std::runtime_error("projection job");
        const auto* value=sqlite3_column_text(statement,0);const std::string projected=value?reinterpret_cast<const char*>(value):"";
        sqlite3_finalize(statement);sqlite3_close(db);if(projected!=canonical)throw std::runtime_error("projection mismatch");
    }
    for(const auto& output:jobs.front().ready->outputs){
        const auto current=catalog.FindSegmentV2ById(output.segment.segment_id);
        if(!current||recording::SerializeRecordingSegmentV2(*current)!=recording::SerializeRecordingSegmentV2(output.segment))throw std::runtime_error("projection output mismatch");
    }
    return canonical;
}
recording::DerivedJobRecordV1 OnlyJob(Store& store){
    std::vector<recording::DerivedJobRecordV1> jobs;std::string error;
    if(!store.catalog.SnapshotDerivedJobs(&jobs,&error)||jobs.size()!=1)throw std::runtime_error("one job oracle");return jobs.front();
}
int Closing(const char* executable,const std::filesystem::path& root){
    int pass=0,fail=0;std::string error;
    const auto check=[&](bool ok,const char* name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++pass:++fail;};
    using Stage=recording::DerivedJobProgress;
    const auto ready_root=root/"closing-ready";
    if(Spawn(executable,ready_root,"render",static_cast<int>(Stage::ReadyDurable),0,"complete")!=73)throw std::runtime_error("closing Ready");
    std::string root_before,root_paths;bool root_blocked=false;
    {
        Store store(ready_root);const auto job=OnlyJob(store);root_before=recording::SerializeDerivedJobRecord(job);root_paths=OwnedPathsFingerprint(ready_root,job);
        recording::DerivedJobService service(store.catalog,store.journal,{ready_root,30000,{}});
        const auto moved=ready_root.string()+".moved";std::filesystem::rename(ready_root,moved);std::filesystem::create_directory(ready_root);
        const auto result=service.Reconcile();
        // 이 격리 fixture가 방금 만든 빈 root만 제거하고 원래 소유 root를 되돌린다.
        if(!std::filesystem::remove(ready_root))throw std::runtime_error("oracle root restore");std::filesystem::rename(moved,ready_root);
        root_blocked=!result.empty()&&result.front().blocked;
    }
    {Store reopened(ready_root);const auto job=OnlyJob(reopened);check(root_blocked&&recording::SerializeDerivedJobRecord(job)==root_before&&OwnedPathsFingerprint(ready_root,job)==root_paths,"F11 anchored root 교체 거부·새 catalog에서 파일/원장 무변경");}
    const auto first_root=root/"closing-first",second_root=root/"closing-second";
    if(Spawn(executable,first_root,"render",static_cast<int>(Stage::BeforeCreate),0,"complete")!=73)throw std::runtime_error("closing Intent");
    {
        Store first(first_root),second(second_root);auto input=Encode(30,false,false);Shift(input,7000000000ULL);Prepare(second,input);
        const auto a=recording::SerializeDerivedJobRecord(OnlyJob(first)),b=recording::SerializeDerivedJobRecord(OnlyJob(second));
        bool unchanged=true;
        {recording::DerivedJobService service(first.catalog,second.journal,{first_root,30000,{}});const auto r=service.Reconcile();unchanged=unchanged&&!r.empty()&&r.front().blocked;}
        {recording::DerivedJobService service(first.catalog,first.journal,{second_root,30000,{}});const auto r=service.Reconcile();unchanged=unchanged&&!r.empty()&&r.front().blocked;}
        {recording::DerivedJobService service(second.catalog,first.journal,{first_root,30000,{}});const auto r=service.Run(OnlyJob(second).intent.job_id);unchanged=unchanged&&r.blocked;}
        check(unchanged&&recording::SerializeDerivedJobRecord(OnlyJob(first))==a&&recording::SerializeDerivedJobRecord(OnlyJob(second))==b&&!std::filesystem::exists(first_root/".derived-jobs")&&!std::filesystem::exists(second_root/".derived-jobs"),"F16 다른 journal/root/catalog의 Run·Reconcile 무변경 거부");
    }
    const auto valid_root=root/"closing-valid";
    if(Spawn(executable,valid_root,"render",-1,0,"complete")!=0)throw std::runtime_error("closing Complete");
    {
        Store store(valid_root);const auto job=OnlyJob(store);auto history=store.journal.Replay().mutations;
        std::vector<recording::RecordingOrderReservationV1> orders;
        const bool original=recording::ValidateRecordingOrderHistory(history,&orders,&error);
        for(auto& mutation:history)if(mutation.mutation_type==recording::RecordingMutationType::DerivedJobCommitted){
            const auto original_segment=recording::SerializeRecordingSegmentV2(job.ready->outputs.front().segment);
            auto forged=job.ready->outputs.front().segment;forged.order_sequence+=100000;
            const auto position=mutation.payload_json.find(original_segment);if(position==std::string::npos)throw std::runtime_error("nested order fixture");
            mutation.payload_json.replace(position,original_segment.size(),recording::SerializeRecordingSegmentV2(forged));
        }
        check(original&&!recording::ValidateRecordingOrderHistory(history,&orders,&error),"F12 실제 committed 중첩 output의 미예약 order 위조 거부");
        recording::DerivedRecordingSelection selection;recording::RestoreDerivedJobSelection(job.intent,&selection,&error);
        std::vector<recording::DerivedSourceEvidence> sources;for(const auto& source:job.intent.sources)sources.push_back({source.segment,source.binding,false});
        recording::RetentionCoordinator retention(store.catalog,[&]{return store.catalog.RetentionSnapshot();},[](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,store.root});
        if(!retention.UpdateChannelPolicy("probe-channel",{1024ULL*1024*1024,0,1024ULL*1024*1024,0},&error))throw std::runtime_error(error);
        for(int i=0;i<9;++i){auto changed=selection;changed.reference.reference_id+="-snapshot-"+std::to_string(i);recording::DerivedJobIntentV1 intent;
            if(!recording::BuildDerivedJobIntent(changed,sources,1024,40,&intent,&error)||!retention.AdmitDerivedJob(store.catalog,intent,40).accepted)throw std::runtime_error("snapshot setup: "+error);
        }
        std::vector<recording::DerivedJobRecordV1> active;bool more=false;
        const bool bounded=store.catalog.SnapshotActiveDerivedJobs(8,&active,&more,&error)&&active.size()==8&&more;
        recording::DerivedJobService service(store.catalog,store.journal,{valid_root,30000,{}});
        const auto first=service.Reconcile();const auto remaining=store.catalog.RetentionSnapshot().durable_reservations.size();const auto second=service.Reconcile();
        check(bounded&&first.size()==9&&first.back().blocked&&first.back().reason=="job-reconcile-snapshot-cap"&&remaining==1&&second.size()==1&&!second.front().blocked&&store.catalog.RetentionSnapshot().durable_reservations.empty(),"F15 active snapshot 8개 상한·초과 명시·다음 호출 수렴");
    }
    const auto replay_root=root/"closing-illegal-replay";
    if(Spawn(executable,replay_root,"render",static_cast<int>(Stage::ReadyDurable),0,"complete")!=73)throw std::runtime_error("illegal Ready setup");
    recording::DerivedJobRecordV1 illegal;{Store store(replay_root);illegal=OnlyJob(store);}
    illegal.state=recording::DerivedJobState::Complete;illegal.cleaned_at_ms=50;
    {
        recording::RecordingJournal journal(recording::RecordingJournal::ManagedOptions{replay_root,"probe-store"});
        recording::RecordingMutationV1 mutation;mutation.mutation_id="illegal-ready-complete";mutation.entity_id=illegal.intent.job_id;mutation.occurred_at_ms=50;mutation.mutation_type=recording::RecordingMutationType::DerivedJobComplete;mutation.payload_json=recording::SerializeDerivedJobRecord(illegal);
        if(!journal.Open(&error)||!journal.Append(mutation,&error))throw std::runtime_error("illegal replay injection: "+error);
    }
    bool rejected=false;try{Store store(replay_root);}catch(const std::exception&){rejected=true;}
    check(rejected,"F12 journal Ready→Complete 불법 전이 replay 거부");
    const auto committed_root=root/"closing-committed-holds";
    const int stopped=Spawn(executable,committed_root,"render",static_cast<int>(Stage::CommittedDurable),0,"complete");
    check(stopped==73&&Spawn(executable,committed_root,"recover",-1,0,"complete")==0,"F09 재개 전 source/output holds·정상 삭제사유 거부와 cleanup 후 해제");
    std::cout<<"[summary] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
}
int main(int argc,char** argv) {
    if(argc!=2&&argc!=7)return 2;
    gst_init(nullptr,nullptr);
    try {
        if(argc==7)return Child(argc,argv);
        if(const auto* group=std::getenv("MEDIA_SERVER_DERIVED_JOB_GROUP");group&&std::string(group)=="closing")return Closing(argv[0],argv[1]);
        if(const auto* group=std::getenv("MEDIA_SERVER_DERIVED_JOB_GROUP");group&&std::string(group)=="budget"){
            int pass=0,fail=0;
            for(const auto& mode:{"cancel-before-create","cancel","small","deadline"}){
                const int code=Spawn(argv[0],std::filesystem::path(argv[1])/mode,mode,-1,0,"failed");
                std::cout<<(code==0?"[pass] ":"[fail] ")<<"F14 "<<mode<<" 생성 중단·cleanup·예약 해제\n";code==0?++pass:++fail;
            }
            std::cout<<"[summary] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
        }
        auto input=Encode(30,false,false);Shift(input,7000000000ULL);
        Store store(std::filesystem::path(argv[1])/"normal");
        auto intent=Prepare(store,input);std::string error;
        recording::DerivedRecordingSelection selection;
        if(!recording::RestoreDerivedJobSelection(intent,&selection,&error))throw std::runtime_error(error);
        recording::DerivedRemuxRequest request;request.selection=selection;request.max_output_bytes=intent.reserved_bytes;
        for(std::size_t i=0;i<intent.sources.size();++i) {
            const auto& source=intent.sources[i];
            const int input_fd=::open((store.root/"probe-channel"/(source.segment.segment_id+".mp4")).c_str(),O_RDONLY|O_NOFOLLOW|O_CLOEXEC);
            const int output_fd=::open((store.root/("contract-"+std::to_string(i)+".mp4")).c_str(),O_RDWR|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC,0600);
            if(input_fd<0||output_fd<0)throw std::runtime_error("contract fd fixture");
            request.sources.push_back({source.segment,source.binding,input_fd,output_fd});
        }
        const auto actual=recording::DeriveRecordingH264Remux(request);
        for(const auto& source:request.sources){::close(source.source_fd);::close(source.output_fd);}
        if(!actual.verified_output)throw std::runtime_error("contract remux: "+actual.error);
        recording::DerivedJobRecordV1 capture;capture.intent=intent;
        // 계약 negative 전용 receipt 값이다. 이 검사는 파일 소유권 증명이 아니며 service fault 검사가 실제 inode를 다룬다.
        for(std::size_t i=0;i<intent.outputs.size();++i) {
            recording::DerivedJobFileV1 file;file.output_index=i;file.device=1;file.inode=100+i;
            file.initial_sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
            std::set<std::string> parents{""};
            for(const auto& path:{intent.outputs[i].temporary_relpath,intent.outputs[i].final_relpath}) {
                auto parent=std::filesystem::path(path).parent_path();while(!parent.empty()){parents.insert(parent.generic_string());parent=parent.parent_path();}
            }
            std::uint64_t inode=1;for(const auto& parent:parents)file.directories.push_back({parent,1,inode++});capture.files.push_back(std::move(file));
        }
        std::vector<std::int64_t> orders;for(std::size_t i=0;i<intent.outputs.size();++i)orders.push_back(100+i);
        recording::DerivedJobRecordV1 ready;
        if(!recording::BuildDerivedJobReady(capture,actual,orders,20,&ready,&error))throw std::runtime_error("contract ready: "+error);
        int pass=0,fail=0;const auto check=[&](bool ok,const char* name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++pass:++fail;};
        auto wrong=actual;wrong.selection.reference.request->start_ms++;
        check(!recording::BuildDerivedJobReady(capture,wrong,orders,20,&ready,&error),"F12 실제 remux의 다른 selection 결박 거부");
        wrong=actual;wrong.outputs[0].requested_media_start_ns++;
        check(!recording::BuildDerivedJobReady(capture,wrong,orders,20,&ready,&error),"F12 실제 remux provenance의 요청 범위 위조 거부");
        wrong=actual;wrong.unfulfilled.push_back({"foreign-source","request-ns","invented",0,1});wrong.request_fully_satisfied=false;
        check(!recording::BuildDerivedJobReady(capture,wrong,orders,20,&ready,&error),"F12 실제 remux의 foreign unfulfilled 범위 거부");
        recording::DerivedJobService* running=nullptr;bool external_release_rejected=false,busy_rejected=false,delete_positive=false,delete_protected=false;
        recording::DerivedJobService service(store.catalog,store.journal,{store.root,30000,[&](auto stage,std::size_t){
            if(stage==recording::DerivedJobProgress::BeforeCreate){
                external_release_rejected=!store.catalog.FailDerivedJobAfterCleanup(intent.job_id,intent.attempt_id,"foreign-cleanup",30,&error);
                busy_rejected=running&&running->Run(intent.job_id).reason=="job-service-busy";
                delete_protected=!store.catalog.RequestDeletion(intent.sources.front().segment.segment_id,"continuous-capacity",&error);
                for(const auto& source:store.Segments())if(std::none_of(intent.sources.begin(),intent.sources.end(),[&](const auto& selected){return selected.segment.segment_id==source.segment_id;})){
                    delete_positive=store.catalog.RequestDeletion(source.segment_id,"continuous-capacity",&error);break;
                }
            }
        }});running=&service;
        bool owner_rejected=false;try{recording::DerivedJobService duplicate(store.catalog,store.journal,{store.root,30000,{}});}catch(const std::exception&){owner_rejected=true;}
        const auto result=service.Run(intent.job_id);
        const bool complete=result.complete&&!result.blocked&&result.job&&result.job->state==recording::DerivedJobState::Complete;
        check(complete,"F01 실제 writer→선택→Intent→파생 파일→게시→Complete");
        check(complete&&CompletedOracle(store,*result.job,true),"F01 실제 catalog/file/hash/단일 commit/hold 해제/cleanup 및 직접 decode");
        check(owner_rejected&&busy_rejected&&external_release_rejected,"F15 단일 service·동시 Run·외부 terminal release 거부");
        check(delete_positive&&delete_protected,"F16 active source 삭제 거부·동일 사유 비보호 원본 삭제 positive control");
        bool independent=complete&&result.job->ready->outputs.size()==2;
        if(independent)for(std::size_t i=0;i<result.job->ready->outputs.size();++i){
            const auto& output=result.job->ready->outputs[i];
            independent=independent&&output.segment.media_epoch_id!=intent.sources[i].segment.media_epoch_id&&output.segment.time_base_num==1&&output.segment.time_base_den==1000000000&&output.segment.retention_class==recording::RecordingRetentionClass::Event&&output.segment.mappings.size()==1&&output.segment.mappings.front().provenance=="unknown"&&!output.segment.mappings.front().utc_start_ns&&output.provenance.source_decoded_sha256==output.provenance.output_decoded_sha256&&output.provenance.access_units.size()==actual.outputs[i].access_units.size();
        }
        check(independent,"F02 두 출력 독립 epoch·unknown UTC·실제 AU/visible 출처 보존");
        recording::DerivedJobRecordV1 parsed;
        const auto canonical=recording::SerializeDerivedJobRecord(*result.job);
        check(recording::ParseDerivedJobRecord(canonical,&parsed,&error)&&recording::SerializeDerivedJobRecord(parsed)==canonical,"F12 Complete 출처 전수 canonical roundtrip");
        auto invalid=*result.job;invalid.state=recording::DerivedJobState::Intent;
        check(recording::SerializeDerivedJobRecord(invalid).empty(),"F12 Ready 포함 Intent 잘못된 상태 거부");
        check(!recording::ParseDerivedJobRecord(canonical.substr(0,canonical.size()-1)+",\"unknown\":true}",&parsed,&error),"F12 미지원 필드 엄격 거부");
        auto oversized=*result.job->ready;oversized.unfulfilled.assign(4096,{"","request-ns",std::string(1024,'x'),0,1});
        check(recording::SerializeDerivedJobReady(oversized).empty(),"F14 Ready JSON 4MiB 명시 상한 거부");
        invalid=*result.job;invalid.files[1].device=invalid.files[0].device;invalid.files[1].inode=invalid.files[0].inode;
        check(recording::SerializeDerivedJobRecord(invalid).empty(),"F12 출력 receipt inode 별칭 거부");
        std::cout<<"[detail] reason="<<result.reason<<" outputs="<<intent.outputs.size()<<'\n';
        using Stage=recording::DerivedJobProgress;
        struct Fault {Stage stage;int index;const char* name;const char* expected;};
        const std::vector<Fault> faults{
            {Stage::BeforeCreate,0,"F03 Intent 생성 전 프로세스 중단","failed"},
            {Stage::CreatedBeforeReceipt,0,"F04 receipt 전 실물의 소유권 미확인 보호 유지","blocked"},
            {Stage::ReceiptDurable,0,"F05 receipt 이후 Intent 중단 소유물 정리","failed"},
            {Stage::ReadyDurable,0,"F06 Ready 중단 뒤 재렌더 없이 완료","complete"},
            {Stage::PublishedLink,0,"F07 첫 출력 link 중단 쌍 복구","complete"},
            {Stage::PublishedLink,1,"F07 두 번째 출력 link 중단 쌍 복구","complete"},
            {Stage::PublishedDurable,1,"F08 전체 publish 후 commit 전 중단","complete"},
            {Stage::CommittedDurable,0,"F09 원자 commit 후 cleanup 전 중단","complete"},
            {Stage::TemporaryRemoved,0,"F10 첫 temp 삭제 중단","complete"},
            {Stage::TemporaryRemoved,1,"F10 두 번째 temp 삭제 중단","complete"},
            {Stage::DirectoryRemoved,0,"F10 attempt 디렉터리 삭제 중단","complete"},
            {Stage::DirectoryRemoved,1,"F10 job 디렉터리 삭제 중단","complete"},
            {Stage::BeforeTerminal,0,"F10 Complete mutation 직전 중단","complete"}
        };
        int case_index=0;
        for(const auto& fault:faults){
            const auto root=std::filesystem::path(argv[1])/("fault-"+std::to_string(case_index++));
            const int stopped=Spawn(argv[0],root,"render",static_cast<int>(fault.stage),fault.index,"complete");
            const int resumed=stopped==73?Spawn(argv[0],root,"recover",-1,0,fault.expected):-1;
            check(stopped==73&&resumed==0,fault.name);
        }
        for(const auto& fault:std::vector<Fault>{{Stage::DirectoryRemoved,0,"F10 Failed cleanup attempt 삭제 중단","failed"},{Stage::DirectoryRemoved,1,"F10 Failed cleanup job 삭제 중단","failed"},{Stage::BeforeTerminal,0,"F10 Failed mutation 직전 중단","failed"}}){
            const auto root=std::filesystem::path(argv[1])/("fault-"+std::to_string(case_index++));
            const int stopped=Spawn(argv[0],root,"render",static_cast<int>(Stage::ReceiptDurable),0,"complete");
            const int cleanup=stopped==73?Spawn(argv[0],root,"recover",static_cast<int>(fault.stage),fault.index,"failed"):-1;
            const int resumed=cleanup==73?Spawn(argv[0],root,"recover",-1,0,"failed"):-1;
            check(stopped==73&&cleanup==73&&resumed==0,fault.name);
        }
        for(const auto& kind:std::vector<std::string>{"hash","missing","foreign","symlink","fifo","hardlink","parent"}){
            const auto root=std::filesystem::path(argv[1])/("tamper-"+kind);
            const int stopped=Spawn(argv[0],root,"render",static_cast<int>(Stage::ReadyDurable),0,"complete");
            if(stopped!=73)throw std::runtime_error("tamper Ready preparation");
            Tamper(root,kind);
            const int resumed=Spawn(argv[0],root,"recover",-1,0,"blocked");
            const auto name="F11 "+kind+" 오류 거부·보호/예약 유지";check(resumed==0,name.c_str());
        }
        for(const auto& mode:{"cancel-before-create","cancel","small","deadline"}){
            const auto root=std::filesystem::path(argv[1])/("budget-"+std::string(mode));
            const int code=Spawn(argv[0],root,mode,-1,0,"failed");
            const auto name="F14 "+std::string(mode)+" 생성 중단·소유 cleanup·예약 해제";check(code==0,name.c_str());
        }
        const auto projection_root=std::filesystem::path(argv[1])/"fault-3";
        const auto sqlite_state=ReopenState(projection_root,true,false);
        check(ReopenState(projection_root,false,false)==sqlite_state,"F12 SQLite projection·journal fallback job/output 일치");
        std::filesystem::remove(projection_root/"recording-catalog.sqlite3");
        check(ReopenState(projection_root,true,true)==sqlite_state&&ReopenState(projection_root,true,false)==sqlite_state,"F12 SQLite rebuild·checkpoint 재개방 job/output 일치");
        {
            Store tombstones(projection_root);std::vector<recording::DerivedJobRecordV1> jobs;tombstones.catalog.SnapshotDerivedJobs(&jobs,&error);
            const auto job=jobs.front();const auto output=job.ready->outputs.front().segment;
            recording::RecordingTombstoneV2 tombstone;tombstone.tombstone_id="derived-output-terminal-tombstone";tombstone.segment=output;tombstone.deletion_reason="event-capacity";tombstone.deleted_at_ms=std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
            bool deleted=tombstones.catalog.RequestDeletion(output.segment_id,"event-capacity",&error);
            if(deleted)deleted=::unlink((projection_root/job.intent.outputs.front().final_relpath).c_str())==0&&tombstones.catalog.CompleteDeletionV2(tombstone,&error);
            recording::DerivedJobService recovery(tombstones.catalog,tombstones.journal,{projection_root,30000,{}});
            const auto recovered=recovery.Reconcile();
            check(deleted&&recovered.empty()&&!std::filesystem::exists(projection_root/job.intent.outputs.front().final_relpath),"F13 Complete output tombstone 뒤 재생성 없음");
        }
        std::cout<<"[summary] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
    }catch(const std::exception& e){std::cerr<<"[setup-fail] "<<e.what()<<'\n';return 2;}
}
