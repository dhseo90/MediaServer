// 파일 용도: 검증 소유 종료 archive 복제본을 Catalog로 연다. 복제본에는 복구 쓰기가 발생할 수 있다.
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
                           "job-source-unavailable", "job-cancelled-or-deadline",
                           "job-attempt-create", "job-output-create",
                           "job-remux: media-budget-exceeded", "job-remux: work-cancelled",
                           "job-remux: output-byte-budget-exceeded"})if(reason==known)return known;
    return "unknown";
}
static std::string Sha(const std::string& value){
    gchar* digest=g_compute_checksum_for_data(G_CHECKSUM_SHA256,reinterpret_cast<const guchar*>(value.data()),value.size());Require(digest,"digest");std::string result(digest);g_free(digest);return result;
}
static std::string SafeHash(const std::string& value){
    Require(value.size()==64&&std::all_of(value.begin(),value.end(),[](char c){return(c>='0'&&c<='9')||(c>='a'&&c<='f');}),"safe-hash");return Quote(value);
}
static const char* CompletenessReason(const std::string& value){
    for(const char* reason:{"multiple-time-or-recording-candidates","unconfirmed-interval-no-trusted-watermark","original-deleted","original-coverage-unconfirmed","direct-time-interval-only","multiple-utc-candidates","unconfirmed-utc-mapping","piecewise-utc-time-only","missing-original-identity","time-selection-only-not-playability","interval-evidence-incomplete","file-duration-uncovered"})if(value==reason)return reason;
    return "unknown";
}
static const char* SliceState(recording::DerivedSliceState state){
    switch(state){case recording::DerivedSliceState::Confirmed:return "confirmed";case recording::DerivedSliceState::Unknown:return "unknown";case recording::DerivedSliceState::Gap:return "gap";case recording::DerivedSliceState::Deleted:return "deleted";case recording::DerivedSliceState::Ambiguous:return "ambiguous";case recording::DerivedSliceState::AwaitingPostRoll:return "awaiting-post-roll";}return "unknown";
}
static std::string Completeness(const recording::DerivedJobRecordV1& record){
    Require(record.state==recording::DerivedJobState::Complete&&record.ready&&record.ready->verified_output,"complete-ready");
    const auto& intent=record.intent;const auto& ready=*record.ready;recording::DerivedRecordingSelection selection;std::string error;
    Require(recording::RestoreDerivedJobSelection(intent,&selection,&error),"stored-selection");
    std::ostringstream out;out<<std::boolalpha;
    out<<"{\"state\":\"complete\",\"snapshotBasis\":\"offline-copy-at-query\",\"evidenceBasis\":\"persisted-job-intent-and-ready\",\"reproducibleBundle\":false,\"remuxPerformed\":false,\"capturedIntentSha256\":"<<Quote(Sha(recording::SerializeDerivedJobIntent(intent)))
        <<",\"readySha256\":"<<Quote(Sha(recording::SerializeDerivedJobReady(ready)))<<",\"verifiedOutput\":"<<ready.verified_output<<",\"requestFullySatisfied\":"<<ready.request_fully_satisfied
        <<",\"selection\":{\"complete\":"<<selection.complete<<",\"reason\":"<<Quote(CompletenessReason(selection.reason))<<",\"expandedStartNs\":"<<Quote(std::to_string(selection.expanded_start_ns))<<",\"expandedEndNs\":"<<Quote(std::to_string(selection.expanded_end_ns))<<",\"slices\":[";
    bool comma=false;for(const auto& s:selection.slices){if(comma)out<<',';comma=true;out<<"{\"startNs\":"<<Quote(std::to_string(s.start_ns))<<",\"endNs\":"<<Quote(std::to_string(s.end_ns))<<",\"state\":"<<Quote(SliceState(s.state))<<",\"reason\":"<<Quote(CompletenessReason(s.reason))<<",\"candidateSegmentIdSha256\":[";bool candidateComma=false;for(const auto& c:s.candidates){if(candidateComma)out<<',';candidateComma=true;out<<Quote(Sha(c.segment.segment_id));}out<<"]}";}
    out<<"]},\"sources\":[";comma=false;for(const auto& source:intent.sources){if(comma)out<<',';comma=true;const auto& s=source.segment;const auto& b=source.binding;
        out<<"{\"segmentIdSha256\":"<<Quote(Sha(s.segment_id))<<",\"epochSha256\":"<<Quote(Sha(s.media_epoch_id))<<",\"generationSha256\":"<<Quote(Sha(b.source_generation))<<",\"trackSha256\":"<<Quote(Sha(b.track_id))<<",\"bindingSha256\":"<<Quote(Sha(recording::SerializeRecordingSourceBindingV1(b)))
            <<",\"generationOrder\":"<<Quote(std::to_string(b.generation_order))<<",\"startPts\":"<<Quote(std::to_string(s.media_start_pts))<<",\"endPts\":"<<(s.media_end_pts?Quote(std::to_string(*s.media_end_pts)):"null")<<",\"timeBaseNum\":"<<s.time_base_num<<",\"timeBaseDen\":"<<s.time_base_den<<",\"sampleCount\":"<<b.samples.size()<<",\"indexComplete\":"<<b.index_complete<<",\"fileEvidencePresent\":"<<bool(b.file_evidence)<<'}';}
    out<<"],\"unfulfilled\":[";comma=false;for(const auto& u:ready.unfulfilled){if(comma)out<<',';comma=true;out<<"{\"segmentIdSha256\":"<<(u.segment_id.empty()?"null":Quote(Sha(u.segment_id)))<<",\"axis\":"<<Quote(u.axis=="request-ns"?"request-ns":u.axis=="original-pts-ns"?"original-pts-ns":"unknown")<<",\"reason\":"<<Quote(CompletenessReason(u.reason))<<",\"start\":"<<Quote(std::to_string(u.start))<<",\"end\":"<<Quote(std::to_string(u.end))<<'}';}
    out<<"],\"outputs\":[";comma=false;for(const auto& output:ready.outputs){if(comma)out<<',';comma=true;Require(output.source_index<intent.sources.size(),"source-index");const auto& p=output.provenance;
        out<<"{\"outputIdSha256\":"<<Quote(Sha(output.segment.segment_id))<<",\"sourceIndex\":"<<output.source_index<<",\"sourceSegmentIdSha256\":"<<Quote(Sha(intent.sources[output.source_index].segment.segment_id))<<",\"verifiedOutput\":"<<p.verified_output<<",\"requestFullySatisfied\":"<<p.request_fully_satisfied<<",\"sizeBytes\":"<<Quote(std::to_string(p.size_bytes))<<",\"checksumSha256\":"<<SafeHash(p.checksum_sha256)
            <<",\"sourceOriginNs\":"<<Quote(std::to_string(p.source_origin_ns))<<",\"requestedStartNs\":"<<Quote(std::to_string(p.requested_media_start_ns))<<",\"requestedEndNs\":"<<Quote(std::to_string(p.requested_media_end_ns))<<",\"actualStartNs\":"<<Quote(std::to_string(p.actual_original_start_ns))<<",\"actualEndNs\":"<<Quote(std::to_string(p.actual_original_end_ns))
            <<",\"accessUnitCount\":"<<p.access_units.size()<<",\"decodedSourceCount\":"<<p.source_decoded_sha256.size()<<",\"decodedOutputCount\":"<<p.output_decoded_sha256.size()<<",\"decodedHashesMatch\":"<<(!p.source_decoded_sha256.empty()&&p.source_decoded_sha256==p.output_decoded_sha256)
            <<",\"actualRangeBasis\":"<<Quote(p.actual_range_basis=="file-duration-on-source-pts-axis"?"file-duration-on-source-pts-axis":"unknown")<<",\"associationQuality\":"<<Quote(p.original_association_quality=="complete-file-pts-to-binding-timestamp-match"?"complete-file-pts-to-binding-timestamp-match":"unknown")<<",\"payloadQuality\":"<<Quote(p.output_payload_quality=="source-file-vcl-and-visible-decoded-pixels"?"source-file-vcl-and-visible-decoded-pixels":"unknown")<<",\"accessUnits\":[";
        bool auComma=false;for(const auto& a:p.access_units){if(auComma)out<<',';auComma=true;out<<"{\"ordinal\":"<<Quote(std::to_string(a.ordinal))<<",\"originalPtsNs\":"<<Quote(std::to_string(a.original_pts_ns))<<",\"filePtsNs\":"<<Quote(std::to_string(a.file_pts_ns))<<",\"fileDurationNs\":"<<Quote(std::to_string(a.file_duration_ns))<<",\"outputPtsNs\":"<<Quote(std::to_string(a.output_pts_ns))<<",\"outputDurationNs\":"<<Quote(std::to_string(a.output_duration_ns))<<",\"sourceVclSha256\":"<<SafeHash(a.source_vcl_sha256)<<",\"outputVclSha256\":"<<SafeHash(a.output_vcl_sha256)<<'}';}out<<"]}";
    }out<<"]}";auto result=out.str();Require(result.size()<1024*1024,"completeness-output-cap");return result;
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
static std::string CatalogProofFields(const std::string& id,const std::optional<recording::RecordingSegmentV2>& segment,
    const std::optional<recording::RecordingSourceBindingV1>& binding){
    const bool valid=segment&&binding&&recording::ValidateRecordingSourceBindingForSegment(*binding,*segment,nullptr);
    const bool proof=binding&&binding->file_evidence;
    const auto serialized=binding?recording::SerializeRecordingSourceBindingV1(*binding):std::string{};
    std::ostringstream out;out<<std::boolalpha<<"\"segmentIdSha256\":"<<Quote(Sha(id))<<",\"segmentPresent\":"<<bool(segment)
        <<",\"bindingPresent\":"<<bool(binding)<<",\"bindingValid\":"<<(segment&&binding?(valid?"true":"false"):"null")
        <<",\"fileEvidencePresent\":"<<proof<<",\"fileEvidenceValid\":"<<(proof?(recording::ValidateRecordingFileEvidence(*binding,nullptr)?"true":"false"):"null")
        <<",\"bindingSha256\":"<<(serialized.empty()?"null":Quote(Sha(serialized)));return out.str();
}
static std::string CatalogEvidence(recording::RecordingCatalog& catalog,const recording::DerivedJobIntentV1& intent){
    std::ostringstream selected,candidates;selected<<'[';bool comma=false;std::set<std::string> ids;
    for(const auto& source:intent.sources){ids.insert(source.segment.segment_id);const auto segment=catalog.FindSegmentV2ById(source.segment.segment_id);const auto binding=catalog.FindSourceBinding(source.segment.segment_id);
        bool equal=false;if(binding){auto a=*binding,b=source.binding;a.file_evidence.reset();b.file_evidence.reset();const auto raw=recording::SerializeRecordingSourceBindingV1(a);equal=!raw.empty()&&raw==recording::SerializeRecordingSourceBindingV1(b);}
        if(comma)selected<<',';comma=true;selected<<'{'<<CatalogProofFields(source.segment.segment_id,segment,binding)
            <<",\"segmentMatchesIntent\":"<<(segment?(recording::SerializeRecordingSegmentV2(*segment)==recording::SerializeRecordingSegmentV2(source.segment)?"true":"false"):"null")
            <<",\"bindingMatchesIntentWithoutFileEvidence\":"<<(binding?(equal?"true":"false"):"null")<<'}';}
    selected<<']';std::vector<recording::RecordingDerivedSourceSnapshotEntry> snapshot;std::string error;
    const bool success=catalog.SnapshotDerivedSources(intent.reference,&snapshot,&error);
    const bool truncated=!success&&error=="derived source relevant snapshot cap exceeded";
    candidates<<"{\"status\":"<<Quote(success?"complete":truncated?"cap-exceeded":"unavailable")<<",\"count\":"<<(success?std::to_string(snapshot.size()):"null")<<",\"truncated\":"<<(truncated?"true":"false")<<",\"items\":[";comma=false;
    if(success)for(const auto& entry:snapshot){const auto& s=entry.segment;const bool valid=entry.binding&&recording::ValidateRecordingSourceBindingForSegment(*entry.binding,s,nullptr);
        const bool available=(entry.lifecycle==recording::RecordingLifecycle::Finalized||entry.deleted)&&valid;
        const bool eligible=available&&s.source_id==intent.reference.source_id&&s.channel_id==intent.reference.channel_id&&recording::ValidateRecordingSegmentV2(s,nullptr);
        if(comma)candidates<<',';comma=true;candidates<<std::boolalpha<<'{'<<CatalogProofFields(s.segment_id,s,entry.binding)<<",\"selected\":"<<(ids.count(s.segment_id)!=0)
            <<",\"lifecycle\":"<<static_cast<int>(entry.lifecycle)<<",\"deleted\":"<<entry.deleted<<",\"eligible\":"<<eligible
            <<",\"startPts\":"<<Quote(std::to_string(s.media_start_pts))<<",\"endPts\":"<<(s.media_end_pts?Quote(std::to_string(*s.media_end_pts)):"null")<<",\"timeBaseNum\":"<<s.time_base_num<<",\"timeBaseDen\":"<<s.time_base_den<<'}';}
    candidates<<"]}";const auto& p=intent.profile;
    return ",\"intentProfile\":"+Quote(p=="h264-mp4-to-mpegts-video-only-v1"||p=="h264-mp4-native-to-mpegts-video-only-v1"||p=="h264-mp4-to-fmp4-video-only-v1"||p=="h264-mp4-native-to-fmp4-video-only-v1"?p:"unknown")+
        ",\"catalogEvidenceBasis\":\"offline-copy-catalog\",\"failureTimeEquivalent\":false,\"proofValidationBasis\":\"strict-structure-only\",\"catalogSourceEvidence\":"+selected.str()+
        ",\"catalogCandidateScope\":\"request-related-snapshot\",\"catalogCandidates\":"+candidates.str();
}
// 저장된 intent와 사후 관련 후보를 구분한다. remux/원문/임의 오류/경로는 출력하지 않는다.
static std::string DiagnoseEvidence(recording::RecordingCatalog& catalog,const recording::DerivedJobRecordV1& record){
    QuietStderr quiet;gst_init(nullptr,nullptr);
    const auto captured=recording::SerializeDerivedJobRecord(record);
    recording::RecordingReadService read(catalog);std::ostringstream sources,hashes;sources<<'[';hashes<<'[';bool comma=false;
    for(const auto& source:record.intent.sources){
        const auto& s=source.segment;const auto& b=source.binding;
        Require(s.checksum_sha256.size()==64&&std::all_of(s.checksum_sha256.begin(),s.checksum_sha256.end(),[](char c){return(c>='0'&&c<='9')||(c>='a'&&c<='f');}),"stored-file-hash");
        if(comma){sources<<',';hashes<<',';}comma=true;
        sources<<"{\"segmentIdSha256\":"<<Quote(Sha(s.segment_id))<<",\"epochSha256\":"<<Quote(Sha(s.media_epoch_id))
            <<",\"generationSha256\":"<<Quote(Sha(b.source_generation))<<",\"trackSha256\":"<<Quote(Sha(b.track_id))
            <<",\"bindingSha256\":"<<Quote(Sha(recording::SerializeRecordingSourceBindingV1(b)))
            <<",\"generationOrder\":"<<Quote(std::to_string(b.generation_order))<<",\"startPts\":"<<Quote(std::to_string(s.media_start_pts))
            <<",\"endPts\":"<<(s.media_end_pts?Quote(std::to_string(*s.media_end_pts)):"null")
            <<",\"timeBaseNum\":"<<s.time_base_num<<",\"timeBaseDen\":"<<s.time_base_den<<",\"sampleCount\":"<<b.samples.size()
            <<",\"lastAcceptedOrdinal\":"<<Quote(std::to_string(b.last_accepted_ordinal))<<",\"indexComplete\":"<<(b.index_complete?"true":"false")
            <<",\"fileEvidencePresent\":"<<(b.file_evidence?"true":"false")<<'}';
        std::string actual;const char* status="unavailable";
        try{auto media=read.ResolveMedia(s.channel_id,s.segment_id);if(media){status="hash-error";actual=FdSha(media->fd());status=actual==s.checksum_sha256?"matched":"mismatched";}}
        catch(...){status="hash-error";actual.clear();}
        hashes<<"{\"segmentIdSha256\":"<<Quote(Sha(s.segment_id))<<",\"expected\":"<<Quote(s.checksum_sha256)
            <<",\"actual\":"<<(actual.empty()?"null":Quote(actual))<<",\"actualHashAvailable\":"<<(actual.empty()?"false":"true")
            <<",\"matches\":"<<(actual.empty()?"null":actual==s.checksum_sha256?"true":"false")<<",\"status\":"<<Quote(status)<<'}';
    }
    sources<<']';hashes<<']';std::string error;std::optional<recording::DerivedJobRecordV1> after;
    Require(catalog.FindDerivedJob(record.intent.job_id,&after,&error)&&after&&recording::SerializeDerivedJobRecord(*after)==captured,"diagnostic-record-unchanged");
    return ",\"capturedIntentSha256\":"+Quote(Sha(recording::SerializeDerivedJobIntent(record.intent)))+
        ",\"snapshotBasis\":\"offline-copy-at-query\",\"evidenceBasis\":\"persisted-job-intent\",\"fileHashBasis\":\"resolve-media-validated-fd\",\"reproducibleBundle\":false,\"remuxPerformed\":false,\"sourceEvidence\":"+sources.str()+",\"sourceFileHashes\":"+hashes.str()+CatalogEvidence(catalog,record.intent);
}
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
    request.output_container=intent.profile.find("-to-mpegts-")!=std::string::npos?"mpegts":"mp4";
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
        const bool basic=diagnostic&&std::string(argv[4])=="--diagnose-basic";
        const bool completeness=diagnostic&&std::string(argv[4])=="--diagnose-completeness";
        const bool state=diagnostic&&std::string(argv[4])=="--diagnose-state";
        Require(argc==4||(diagnostic&&(std::string(argv[4])=="--diagnose-failed"||replay||basic||completeness||state)),"arguments");
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
        Require(catalog.QueryDerivedReferenceResult(reference,&result,&error)&&!result.truncated&&result.jobs.size()<=1,"reference-query");
        if(state){
            std::string name="absent",intent_hash="null";std::size_t sources=0,outputs=0,planned=0,files=0;
            if(!result.jobs.empty()){
                const auto& item=result.jobs.front();const auto& job=item.job;
                switch(job.state){
                    case recording::DerivedJobState::Intent:name="intent";break;
                    case recording::DerivedJobState::Ready:name="ready";break;
                    case recording::DerivedJobState::Committed:name="committed";break;
                    case recording::DerivedJobState::Complete:name="complete";break;
                    case recording::DerivedJobState::Failed:name="failed";break;
                    default:throw std::runtime_error("state-enum");
                }
                intent_hash=Quote(Sha(recording::SerializeDerivedJobIntent(job.intent)));sources=job.intent.sources.size();outputs=item.outputs.size();planned=job.intent.outputs.size();files=job.files.size();
            }
            Require(sources<=8&&outputs<=8&&planned<=8&&files<=4096,"state-count-bound");
            std::cout<<"{\"state\":"<<Quote(name)<<",\"managed\":"<<(result.managed?"true":"false")<<",\"jobCount\":"<<result.jobs.size()
                <<",\"referenceSha256\":"<<Quote(Sha(reference))<<",\"capturedIntentSha256\":"<<intent_hash<<",\"sourceCount\":"<<sources<<",\"outputCount\":"<<outputs
                <<",\"plannedOutputCount\":"<<planned<<",\"fileReceiptCount\":"<<files<<",\"copyCatalogOpened\":true,\"snapshotBasis\":\"offline-copy-at-query\",\"failureTimeEquivalent\":false,\"remuxPerformed\":false}\n";
            return 0;
        }
        Require(result.managed&&result.jobs.size()==1,"reference-job");
        const auto& record=result.jobs.front().job;const auto& intent=record.intent;
        if(diagnostic){
            if(completeness){std::cout<<Completeness(record)<<'\n';return 0;}
            Require(record.state==recording::DerivedJobState::Failed,"failed-job");
            if(replay){std::cout<<Replay(catalog,root,record)<<'\n';return 0;}
            // 기본 캡처는 모든 GStreamer·미디어 검사나 재생보다 먼저 수행해야 한다.
            const auto evidence=basic?",\"capturedIntentSha256\":"+Quote(Sha(recording::SerializeDerivedJobIntent(intent))):DiagnoseEvidence(catalog,record);
            std::cout<<"{\"state\":\"failed\",\"failureReason\":"<<Quote(FailureCode(record.failure_reason))
                <<",\"sourceCount\":"<<intent.sources.size()
                <<",\"outputCount\":"<<result.jobs.front().outputs.size()
                <<",\"plannedOutputCount\":"<<intent.outputs.size()
                <<",\"fileReceiptCount\":"<<record.files.size()
                <<",\"copyCatalogOpened\":true"<<evidence<<"}\n";
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
