// 검증 소유 종료 archive 복제본을 Catalog로 연다. 복제본에는 복구 쓰기가 발생할 수 있다.
#include "recording/recording_catalog.h"
#include "recording/recording_derived_selection.h"
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
int main(int argc,char** argv){
    const bool diagnostic=argc==5;
    try{
        Require(argc==4||(diagnostic&&std::string(argv[4])=="--diagnose-failed"),"arguments");
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
        recording::RecordingCatalog::Options options(copy/"projection.sqlite",copy,true);options.enable_v2_storage=true;
        recording::RecordingCatalog catalog(journal,options);std::string error;
        Require(catalog.Open(&error),"copy-catalog-open");
        recording::RecordingDerivedReferenceResult result;
        Require(catalog.QueryDerivedReferenceResult(reference,&result,&error)&&!result.truncated&&result.managed&&result.jobs.size()==1,"reference-job");
        const auto& record=result.jobs.front().job;const auto& intent=record.intent;
        if(diagnostic){
            Require(record.state==recording::DerivedJobState::Failed,"failed-job");
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
