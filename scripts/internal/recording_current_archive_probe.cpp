// 검증 소유 종료 archive 복제본을 Catalog로 연다. 복제본에는 복구 쓰기가 발생할 수 있다.
#include "recording/recording_catalog.h"
#include "recording/recording_derived_selection.h"
#include "recording/recording_derived_remux.h"
#include "recording/recording_read_service.h"
#include <gst/gst.h>
#include <fcntl.h>
#include <array>
#include <algorithm>
#include <sstream>
#include <filesystem>
#include <iostream>
#include <set>
#include <stdexcept>
#include <sys/stat.h>
#include <unistd.h>
namespace fs=std::filesystem;
static void Require(bool value,const char* reason){if(!value)throw std::runtime_error(reason);}
static std::string Quote(const std::string& value){
    std::string out="\"";
    for(unsigned char c:value){Require(c>=32,"control-character");if(c=='"'||c=='\\')out+='\\';out+=c;}
    return out+'"';
}
// 실패 원문을 정제해서 출력하지 않는다. 소스에서 확인한 정확한 상수만 통과시킨다.
static const char* FailureCode(const std::string& reason){
    for(const char* known:{"job-remux: file-original-timestamp-mismatch",
                           "job-remux: source-binding-incomplete",
                           "job-source-unavailable"})if(reason==known)return known;
    return "unknown";
}
static std::string Sha(const std::string& value){
    gchar* digest=g_compute_checksum_for_data(G_CHECKSUM_SHA256,reinterpret_cast<const guchar*>(value.data()),value.size());Require(digest,"digest");std::string result(digest);g_free(digest);return result;
}
static std::string FdSha(int fd){
    struct stat before{},after{};Require(fstat(fd,&before)==0&&S_ISREG(before.st_mode)&&before.st_size>=0&&before.st_size<=512LL*1024*1024,"source-stat");
    std::unique_ptr<GChecksum,decltype(&g_checksum_free)> sum(g_checksum_new(G_CHECKSUM_SHA256),g_checksum_free);Require(bool(sum),"checksum");std::array<guchar,65536> bytes{};off_t position=0;
    while(position<before.st_size){const auto count=pread(fd,bytes.data(),std::min<off_t>(bytes.size(),before.st_size-position),position);if(count<0&&errno==EINTR)continue;Require(count>0,"source-read");g_checksum_update(sum.get(),bytes.data(),count);position+=count;}
    Require(fstat(fd,&after)==0&&before.st_dev==after.st_dev&&before.st_ino==after.st_ino&&before.st_size==after.st_size,"source-stable");return g_checksum_get_string(sum.get());
}
struct ReplayFiles {
    fs::path path;int directory{-1};std::vector<int> files;
    explicit ReplayFiles(const fs::path& root):path(root/"archive-replay"){
        Require(mkdir(path.c_str(),0700)==0,"replay-directory");directory=open(path.c_str(),O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
        if(directory<0){rmdir(path.c_str());throw std::runtime_error("replay-directory-open");}
    }
    int Add(){const auto name=std::to_string(files.size())+".ts";const int fd=openat(directory,name.c_str(),O_CREAT|O_EXCL|O_RDWR|O_NOFOLLOW|O_CLOEXEC,0600);Require(fd>=0,"replay-output");try{files.push_back(fd);}catch(...){close(fd);unlinkat(directory,name.c_str(),0);throw;}return fd;}
    bool Clear() noexcept {bool ok=true;for(std::size_t i=0;i<files.size();++i){if(close(files[i])!=0)ok=false;const auto name=std::to_string(i)+".ts";if(unlinkat(directory,name.c_str(),0)!=0)ok=false;}files.clear();if(directory>=0){if(close(directory)!=0)ok=false;directory=-1;if(rmdir(path.c_str())!=0)ok=false;}return ok;}
    ~ReplayFiles(){Clear();}
};
struct QuietStderr {
    int saved{-1};
    QuietStderr(){saved=dup(STDERR_FILENO);const int quiet=open("/dev/null",O_WRONLY|O_CLOEXEC);if(saved<0||quiet<0){if(saved>=0)close(saved);if(quiet>=0)close(quiet);throw std::runtime_error("diagnostic-stderr");}const bool ok=dup2(quiet,STDERR_FILENO)>=0;close(quiet);if(!ok){close(saved);throw std::runtime_error("diagnostic-stderr");}}
    ~QuietStderr(){if(saved>=0){dup2(saved,STDERR_FILENO);close(saved);}}
};
static std::string Replay(recording::RecordingCatalog& catalog,const fs::path& root,const recording::DerivedJobRecordV1& record){
    QuietStderr quiet;gst_init(nullptr,nullptr);
    const auto captured=recording::SerializeDerivedJobRecord(record);const auto& intent=record.intent;std::string error;
    std::vector<recording::RecordingDerivedSourceSnapshotEntry> snapshot;Require(catalog.SnapshotDerivedSources(intent.reference,&snapshot,&error),"source-snapshot");
    std::sort(snapshot.begin(),snapshot.end(),[](const auto& a,const auto& b){return a.segment.segment_id<b.segment.segment_id;});
    std::set<std::string> selected;for(const auto& source:intent.sources)selected.insert(source.segment.segment_id);
    std::ostringstream evidence;evidence<<'[';bool comma=false;
    for(const auto& source:snapshot){if(comma)evidence<<',';comma=true;const auto& s=source.segment;
        evidence<<"{\"segmentIdSha256\":"<<Quote(Sha(s.segment_id))<<",\"epochSha256\":"<<Quote(Sha(s.media_epoch_id))
            <<",\"generationSha256\":"<<(source.binding?Quote(Sha(source.binding->source_generation)):"null")
            <<",\"generationOrder\":"<<(source.binding?Quote(std::to_string(source.binding->generation_order)):"null")
            <<",\"trackSha256\":"<<(source.binding?Quote(Sha(source.binding->track_id)):"null")
            <<",\"startPts\":"<<Quote(std::to_string(s.media_start_pts))<<",\"endPts\":"<<(s.media_end_pts?Quote(std::to_string(*s.media_end_pts)):"null")
            <<",\"timeBaseNum\":"<<s.time_base_num<<",\"timeBaseDen\":"<<s.time_base_den<<",\"lifecycle\":"<<static_cast<int>(source.lifecycle)
            <<",\"deleted\":"<<(source.deleted?"true":"false")<<",\"selected\":"<<(selected.count(s.segment_id)?"true":"false")<<'}';
    }evidence<<']';
    recording::DerivedRemuxRequest request;Require(recording::RestoreDerivedJobSelection(intent,&request.selection,&error),"stored-selection");request.max_work_ms=30000;request.max_output_bytes=intent.reserved_bytes;
    recording::RecordingReadService read(catalog);std::vector<std::unique_ptr<recording::ResolvedRecordingMedia>> inputs;ReplayFiles outputs(root);std::ostringstream hashes;hashes<<'[';comma=false;bool available=true;
    for(const auto& source:intent.sources){auto media=read.ResolveMedia(source.segment.channel_id,source.segment.segment_id);if(!media){available=false;break;}const auto actual=FdSha(media->fd());const auto& expected=source.segment.checksum_sha256;
        Require(expected.size()==64&&std::all_of(expected.begin(),expected.end(),[](char c){return(c>='0'&&c<='9')||(c>='a'&&c<='f');}),"expected-hash");
        if(comma)hashes<<',';comma=true;hashes<<"{\"segmentIdSha256\":"<<Quote(Sha(source.segment.segment_id))<<",\"expected\":"<<Quote(expected)<<",\"actual\":"<<Quote(actual)<<",\"matches\":"<<(actual==expected?"true":"false")<<'}';
        request.sources.push_back({source.segment,source.binding,media->fd(),outputs.Add()});inputs.push_back(std::move(media));
    }hashes<<']';
    recording::DerivedRemuxResult result;
    if(available)result=recording::DeriveRecordingH264Remux(request);
    const std::string replay=available?(result.verified_output?"none":FailureCode("job-remux: "+result.error)):"job-source-unavailable";
    inputs.clear();Require(outputs.Clear(),"replay-cleanup");
    std::optional<recording::DerivedJobRecordV1> after;Require(catalog.FindDerivedJob(intent.job_id,&after,&error)&&after&&recording::SerializeDerivedJobRecord(*after)==captured,"stored-record-unchanged");
    const std::string persisted=FailureCode(record.failure_reason);const bool same=!result.verified_output&&persisted!="unknown"&&persisted==replay;
    std::ostringstream out;out<<"{\"persistedFailure\":"<<Quote(persisted)<<",\"replayFailure\":"<<Quote(replay)<<",\"verifiedOutput\":"<<(result.verified_output?"true":"false")
        <<",\"sameFailure\":"<<(same?"true":"false")<<",\"persistedRecordUnchanged\":true,\"capturedIntentSha256\":"<<Quote(Sha(recording::SerializeDerivedJobIntent(intent)))
        <<",\"snapshotBasis\":\"offline-copy-at-query\",\"maxWorkMs\":30000,\"serviceRemainingBudgetEquivalent\":false,\"sourceEvidence\":"<<evidence.str()<<",\"sourceFileHashes\":"<<hashes.str()<<'}';return out.str();
}
int main(int argc,char** argv){
    const bool diagnostic=argc==5;
    try{
        const bool replay=diagnostic&&std::string(argv[4])=="--replay-failed";
        Require(argc==4||(diagnostic&&(std::string(argv[4])=="--diagnose-failed"||replay)),"arguments");
        const fs::path root=argv[1];const std::string index=argv[2],reference=argv[3];
        Require(index=="1"||index=="2","copy-index");
        struct stat st{};Require(lstat(root.c_str(),&st)==0&&S_ISDIR(st.st_mode)&&st.st_uid==getuid()&&(st.st_mode&0777)==0700,"owned-root");
        Require(root.filename().string().rfind("media-server-current-integration-",0)==0&&fs::canonical(root)==root,"root-containment");
        const auto copy=root/("projection-copy-"+index)/"recordings";
        for(const auto& p:{root/("projection-copy-"+index),copy})Require(!fs::is_symlink(fs::symlink_status(p))&&fs::is_directory(p),"copy-containment");
        Require(fs::canonical(copy)==copy&&copy!=root/"recordings","copy-only");
        std::uint64_t bytes=0;std::size_t entries=0;
        for(const auto& entry:fs::recursive_directory_iterator(copy)){
            struct stat current{},original_stat{};Require(lstat(entry.path().c_str(),&current)==0,"copy-stat");
            Require(++entries<=4096&&!S_ISLNK(current.st_mode),"copy-entry-bound");
            if(S_ISDIR(current.st_mode))continue;
            Require(S_ISREG(current.st_mode)&&current.st_nlink==1,"copy-regular-single-link");
            const auto original_path=root/"recordings"/fs::relative(entry.path(),copy);
            if(lstat(original_path.c_str(),&original_stat)==0)Require(current.st_dev!=original_stat.st_dev||current.st_ino!=original_stat.st_ino,"copy-alias-original");
            bytes+=static_cast<std::uint64_t>(current.st_size);Require(bytes<=512ULL*1024*1024,"copy-byte-bound");
        }
        recording::RecordingJournal journal(recording::RecordingJournal::ManagedOptions{copy,{}});
        std::string error;Require(journal.Open(&error),"copy-journal-open");
        recording::RecordingCatalog::Options options(copy/"recording-catalog.sqlite3",copy,true);options.enable_v2_storage=true;
        recording::RecordingCatalog catalog(journal,options);
        Require(catalog.Open(&error),"copy-catalog-open");
        recording::RecordingDerivedReferenceResult result;
        Require(catalog.QueryDerivedReferenceResult(reference,&result,&error)&&!result.truncated&&result.managed&&result.jobs.size()==1,"reference-job");
        const auto& record=result.jobs.front().job;const auto& intent=record.intent;
        if(diagnostic){
            Require(record.state==recording::DerivedJobState::Failed,"failed-job");
            if(replay){std::cout<<Replay(catalog,root,record)<<'\n';return 0;}
            std::cout<<"{\"state\":\"failed\",\"failureReason\":"<<Quote(FailureCode(record.failure_reason))
                <<",\"sourceCount\":"<<intent.sources.size()
                <<",\"outputCount\":"<<result.jobs.front().outputs.size()
                <<",\"plannedOutputCount\":"<<intent.outputs.size()
                <<",\"fileReceiptCount\":"<<record.files.size()
                <<",\"copyCatalogOpened\":true}\n";
            return 0;
        }
        Require(record.state==recording::DerivedJobState::Complete&&record.ready&&record.ready->verified_output&&record.ready->request_fully_satisfied,"complete-job");
        Require(intent.reference.request&&intent.reference.original&&intent.reference.request->time_basis=="media-pts-ms","reference-axis");
        Require(intent.sources.size()==2&&intent.outputs.size()==2&&record.ready->outputs.size()==2,"literal-two-sources-outputs");
        recording::DerivedRecordingSelection selection;
        Require(recording::RestoreDerivedJobSelection(intent,&selection,&error)&&selection.complete,"selection");
        const auto& original=*intent.reference.original;std::set<std::string> source_ids;std::string epoch;
        for(const auto& source:intent.sources){
            Require(recording::ValidateRecordingSourceBindingForSegment(source.binding,source.segment,&error),"binding");
            Require(source.binding.source_generation==original.source_generation&&source.binding.generation_order==original.generation_order&&source.binding.track_id==original.track_id,"source-axis");
            if(epoch.empty())epoch=source.segment.media_epoch_id;
            Require(epoch==source.segment.media_epoch_id,"source-epoch");
            Require(source.segment.time_base_num==1&&source.segment.time_base_den==1000000000,"fixture-timebase");
            Require(source.segment.media_end_pts&&source.segment.media_start_pts<selection.expanded_end_ns&&*source.segment.media_end_pts>selection.expanded_start_ns,"request-source-overlap");
            source_ids.insert(source.segment.segment_id);
        }
        Require(source_ids.size()==2,"distinct-sources");
        for(const auto& slice:selection.slices){
            Require(slice.state==recording::DerivedSliceState::Confirmed&&slice.candidates.size()==1,"confirmed-selection");
            Require(source_ids.count(slice.candidates.front().segment.segment_id)==1,"selected-source");
        }
        std::cout<<"{\"referenceId\":"<<Quote(reference)<<",\"eventId\":"<<Quote(intent.reference.owner_id)<<",\"jobId\":"<<Quote(intent.job_id)
            <<",\"timeBasis\":\"media-pts-ms\",\"expandedStartNs\":"<<Quote(std::to_string(selection.expanded_start_ns))<<",\"expandedEndNs\":"<<Quote(std::to_string(selection.expanded_end_ns))
            <<",\"epoch\":"<<Quote(epoch)<<",\"generation\":"<<Quote(original.source_generation)<<",\"generationOrder\":"<<Quote(std::to_string(original.generation_order))<<",\"track\":"<<Quote(original.track_id)<<",\"sources\":[";
        bool comma=false;for(const auto& source:intent.sources){if(comma)std::cout<<',';comma=true;
            std::cout<<"{\"id\":"<<Quote(source.segment.segment_id)<<",\"startPts\":"<<Quote(std::to_string(source.segment.media_start_pts))<<",\"endPts\":"<<Quote(std::to_string(*source.segment.media_end_pts))<<",\"order\":"<<Quote(std::to_string(source.segment.order_sequence))<<'}';}
        std::cout<<"],\"outputs\":[";comma=false;for(const auto& output:record.ready->outputs){
            const recording::DerivedJobOutputPlanV1* plan=nullptr;
            for(const auto& candidate:intent.outputs)if(candidate.output_id==output.segment.segment_id){Require(plan==nullptr,"duplicate-output-plan");plan=&candidate;}
            Require(plan!=nullptr&&plan->source_index==output.source_index,"output-plan");
            if(comma)std::cout<<',';comma=true;
            std::cout<<"{\"id\":"<<Quote(output.segment.segment_id)<<",\"relativePath\":"<<Quote(plan->final_relpath)<<",\"hash\":"<<Quote(output.segment.checksum_sha256)<<",\"bytes\":"<<Quote(std::to_string(output.segment.size_bytes))<<'}';}
        std::cout<<"],\"copyCatalogOpened\":true}\n";return 0;
    }catch(const std::exception& e){
        // filesystem 예외도 경로를 포함할 수 있으므로 진단 mode에는 원문을 내보내지 않는다.
        if(diagnostic)std::cerr<<"{\"diagnosticError\":\"archive-probe-failed\"}\n";
        else std::cerr<<"[fail] archive-probe "<<e.what()<<'\n';
        return 1;
    }
}
