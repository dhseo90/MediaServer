// 파일 용도: 격리 패키지를 사용한 VA 검토 계약·저장·수명 직접 검사.
#include "recording/va_review_input.h"
#include "recording/va_review_store.h"
#include "recording/va_review_service.h"
#include "recording/va_review_provider.h"
#include "va_review_quality_fixture.h"
#include "../../src/recording/va_review_json.h"
#include "recording_media_test_fixture.h"
#include "recording/recording_runtime_composition.h"
#include "recording/recording_search_reader.h"
#include "analysis/event_storage.h"
#include <fcntl.h>
#include <fstream>
#include <iostream>
#include <limits>
#include <map>
#include <stdexcept>
#include <sys/stat.h>
#include <sys/resource.h>
#include <sys/wait.h>
#include <unistd.h>
#include <zlib.h>
#ifdef __APPLE__
#include <libproc.h>
#endif

namespace {
unsigned checks=0;
void Check(bool ok,const std::string& name) {
    if(!ok) throw std::runtime_error(name);
    ++checks; std::cout<<"[pass] "<<name<<std::endl;
}
void Be(std::vector<std::uint8_t>& bytes,std::uint32_t n) {
    for(int shift=24;shift>=0;shift-=8) bytes.push_back(std::uint8_t(n>>shift));
}
void Chunk(std::vector<std::uint8_t>& png,const std::string& type,const std::vector<std::uint8_t>& value) {
    Be(png,value.size()); const auto start=png.size();
    png.insert(png.end(),type.begin(),type.end()); png.insert(png.end(),value.begin(),value.end());
    Be(png,crc32(0,png.data()+start,type.size()+value.size()));
}
std::vector<std::uint8_t> Png(unsigned color) {
    std::vector<std::uint8_t> png{137,80,78,71,13,10,26,10}, header;
    Be(header,1);Be(header,1);header.insert(header.end(),{8,2,0,0,0});Chunk(png,"IHDR",header);
    const std::vector<std::uint8_t> raw{0,std::uint8_t(color),0,0};
    uLongf size=compressBound(raw.size());std::vector<std::uint8_t> compressed(size);
    if(compress(compressed.data(),&size,raw.data(),raw.size())!=Z_OK)throw std::runtime_error("fixture-png");
    compressed.resize(size);Chunk(png,"IDAT",compressed);Chunk(png,"IEND",{});return png;
}
recording::EvidencePackageV1 Manifest(std::size_t count,std::vector<recording::EvidencePayload>* payloads) {
    recording::EvidencePackageV1 v;
    v.channel_id="camera-1";v.hit_id="hit-1";v.query_kind="structured";v.created_at_ms=1;
    v.status="complete";v.time_provenance="unknown";v.store_id="store-1";v.media_epoch_id="epoch-1";
    v.references.push_back({"recording","segment-1","referenced","","",std::nullopt,{}});
    v.references.push_back({"clip","none","not-applicable","no-event-clip","",std::nullopt,{}});
    for(std::size_t i=0;i<count;++i) {
        auto png=Png(unsigned(i+1)); const auto hash=recording::EvidenceSha256(png.data(),png.size());
        recording::EvidenceFrameV1 f;
        f.segment_id="segment-1";f.media_sha256=std::string(64,'a');f.sample_sha256=std::string(64,'b');
        f.rgb_sha256=std::string(64,'c');f.png_sha256=hash;f.source_generation="generation-1";
        f.media_epoch_id="epoch-1";f.track_id="track-1";f.generation_order=1;f.sample_ordinal=i+1;
        f.pts_ns=1000000*std::int64_t(i);f.presentation_ns=f.pts_ns;f.time_provenance="unknown";
        f.width=1;f.height=1;
        v.frames.push_back(f);v.assets.push_back({"asset-"+std::to_string(i),"image/png",hash,png.size()});
        v.references.push_back({"frame",f.segment_id+":"+std::to_string(f.pts_ns),"preserved","",hash,i,{}});
        payloads->push_back({std::move(png),{}});
    }
    return v;
}
void InputChecks(const std::filesystem::path& root) {
    const auto permit=[](const std::string& c){return c=="camera-1";};
    recording::EvidencePackageStore store(root/"evidence",{});std::string error;
    Check(store.Recover(&error),"V450-I01 isolated store recovery");
    std::string id;
    recording::VaReviewInput input;
    for(auto n:{1U,8U}) {
        std::vector<recording::EvidencePayload> payloads;auto manifest=Manifest(n,&payloads);
        Check(store.Publish(manifest,payloads,&id,&error),"V450-I01 publish "+std::to_string(n)+" frames: "+error);
        Check(recording::LoadVaReviewInput(store,id,"사람의 이동을 뒷받침하는 근거가 있습니까?",permit,&input,&error),
            "V450-I01 load "+std::to_string(n)+" frames: "+error);
        Check(input.pngs.size()==n && input.asset_indices.size()==n,"V450-I01 exact frame count");
        for(std::size_t i=0;i<n;++i) Check(input.pngs[i]==Png(unsigned(i+1)) && input.asset_indices[i]==i &&
            input.manifest.frames[i].pts_ns==std::int64_t(i)*1000000 && !input.manifest.frames[i].utc_ns,
            "V450-I01 independent sequence bytes/PTS/unknown UTC "+std::to_string(i));
    }
    const auto json=recording::SerializeVaReviewInput(input);recording::VaReviewInput decoded;
    Check(recording::ParseVaReviewInput(json,&decoded,&error) && recording::SerializeVaReviewInput(decoded)==json &&
        decoded.pngs.empty(),"V450-I01 metadata replay excludes raw pixels");
    const auto rejects=[&](const std::string& bad,const std::string& label){
        decoded=input;Check(!recording::ParseVaReviewInput(bad,&decoded,&error) &&
            recording::SerializeVaReviewInput(decoded)==json,"V450-I01 "+label+" output unchanged");
    };
    rejects(json.substr(0,json.size()-1)+",\"extra\":1}","extra field");
    rejects(json.substr(0,json.size()-1)+",\"question\":\"duplicate\"}","duplicate field");
    auto bad=input;bad.manifest_sha256=std::string(64,'f');rejects(recording::SerializeVaReviewInput(bad),"manifest hash");
    bad=input;bad.manifest.frames[1].pts_ns=0;rejects(recording::SerializeVaReviewInput(bad),"frame order");
    bad=input;bad.question="https://source.invalid/private";rejects(recording::SerializeVaReviewInput(bad),"source locator");
    bad=input;bad.manifest.frames[1].source_generation="another-generation";
    auto manifest_json=recording::SerializeEvidencePackage(bad.manifest);
    bad.manifest_sha256=recording::EvidenceSha256(manifest_json.data(),manifest_json.size());
    rejects(recording::SerializeVaReviewInput(bad),"mixed source generations");
    bad=input;bad.manifest.assets[0].size_bytes=recording::kVaReviewInputBytes+1;
    manifest_json=recording::SerializeEvidencePackage(bad.manifest);
    bad.manifest_sha256=recording::EvidenceSha256(manifest_json.data(),manifest_json.size());
    rejects(recording::SerializeVaReviewInput(bad),"input byte cap");
    decoded=input;
    Check(!recording::LoadVaReviewInput(store,id,"review",[](const auto&){return false;},&decoded,&error) &&
        error=="review-forbidden" && recording::SerializeVaReviewInput(decoded)==json,"V450-I01 unauthorized no publish");
    Check(!recording::LoadVaReviewInput(store,id,"review",permit,&decoded,&error,[]{return true;}) &&
        error=="review-cancelled","V450-I01 cancelled before I/O");
    Check(!recording::LoadVaReviewInput(store,"../bad","review",permit,&decoded,&error),"V450-I01 path ID rejected");
    std::vector<recording::EvidencePayload> payloads;auto empty=Manifest(0,&payloads);
    empty.status="partial";empty.references.push_back({"frame","absent","missing","no-frame","",std::nullopt,{}});
    std::string empty_id;Check(store.Publish(empty,payloads,&empty_id,&error),"V450-I01 valid empty partial fixture");
    Check(!recording::LoadVaReviewInput(store,empty_id,"review",permit,&decoded,&error) &&
        error=="review-no-frames","V450-I01 empty partial distinguished");
    // 원본 카탈로그/미디어 없이도 보존 패키지만으로 위 입력을 만들었다. 새 owner에서도 같은 byte를 대조한다.
    recording::EvidencePackageStore reopened(root/"evidence",{});
    Check(recording::LoadVaReviewInput(reopened,id,input.question,permit,&decoded,&error) &&
        recording::SerializeVaReviewInput(decoded)==json && decoded.pngs==input.pngs,
        "V450-I01 reopen independent of original media");
    const int fd=::open((root/"evidence"/(id+".evp")).c_str(),O_WRONLY|O_CLOEXEC|O_NOFOLLOW);
    Check(fd>=0,"V450-I01 own corruption fixture opened");const char corrupt='!';
    const auto wrote=::pwrite(fd,&corrupt,1,0);::close(fd);
    Check(wrote==1 && !recording::LoadVaReviewInput(store,id,"review",permit,&decoded,&error),
        "V450-I01 corrupted package rejected");
}
recording::VaReviewRecord Record(const std::filesystem::path& root) {
    recording::EvidencePackageStore evidence(root/"record-input",{});std::string error,id;
    std::vector<recording::EvidencePayload> payloads;const auto manifest=Manifest(2,&payloads);
    Check(evidence.Recover(&error)&&evidence.Publish(manifest,payloads,&id,&error),"V450-C01 evidence setup");
    recording::VaReviewRecord v;
    Check(recording::LoadVaReviewInput(evidence,id,"움직임을 확인할 수 있습니까?",[](const auto&){return true;},
        &v.input,&error),"V450-C01 input setup");
    v.output.supports.push_back({"두 프레임에서 밝기가 다릅니다.",{0,1}});
    v.output.unclear.push_back({"이 프레임만으로 사람의 이동 여부를 알 수 없습니다.",{}});
    v.output.confidence=0.5;v.revision_id="revision-1";v.provider="ollama";
    v.model="qwen3-vl:8b-instruct-q4_K_M";v.model_revision=std::string(64,'d');
    v.prompt_sha256=std::string(64,'e');v.adapter_version="ollama-chat-v1";
    v.created_at_ms=1700000000000;v.latency_ms=123;return v;
}
void RecordChecks(const std::filesystem::path& root) {
    auto record=Record(root);std::string error;
    for(unsigned version=1;version<=11;++version){auto historical=record;historical.adapter_version="ollama-chat-v"+std::to_string(version);
        recording::VaReviewRecord decoded;const auto bytes=recording::SerializeVaReviewRecord(historical);
        Check(recording::ParseVaReviewRecord(bytes,&decoded,&error)&&recording::SerializeVaReviewRecord(decoded)==bytes,
            "V450-C01 adapter provenance preserved without historical rewriting "+std::to_string(version));}
    const auto json=recording::SerializeVaReviewOutput(record.output);
    recording::VaReviewOutput output;
    Check(recording::ParseVaReviewOutput(json,2,&output,&error)&&recording::SerializeVaReviewOutput(output)==json,
        "V450-C01 grounded claims/uncertainty roundtrip");
    const auto rejects=[&](const std::string& bad,const char* label){
        output=record.output;
        Check(!recording::ParseVaReviewOutput(bad,2,&output,&error)&&recording::SerializeVaReviewOutput(output)==json,
            std::string("V450-C01 rejected ")+label+" unchanged");
    };
    rejects(json.substr(0,json.size()-1)+",\"extra\":false}","extra key");
    rejects(json.substr(0,json.size()-1)+",\"confidence\":0}","duplicate key");
    auto invalid=record.output;invalid.supports[0].frame_indices={2};rejects(recording::SerializeVaReviewOutput(invalid),"unknown frame");
    invalid=record.output;invalid.supports[0].frame_indices={0,0};rejects(recording::SerializeVaReviewOutput(invalid),"duplicate frame");
    invalid=record.output;invalid.supports[0].frame_indices.clear();rejects(recording::SerializeVaReviewOutput(invalid),"ungrounded support");
    invalid=record.output;invalid.supports[0].text=std::string(513,'x');rejects(recording::SerializeVaReviewOutput(invalid),"overlong text");
    invalid=record.output;invalid.confidence=1.0001;rejects(recording::SerializeVaReviewOutput(invalid),"confidence above one");
    invalid.confidence=-0.1;rejects(recording::SerializeVaReviewOutput(invalid),"negative confidence");
    invalid.confidence=std::numeric_limits<double>::infinity();rejects(recording::SerializeVaReviewOutput(invalid),"infinity");
    invalid=record.output;invalid.supports.clear();rejects(recording::SerializeVaReviewOutput(invalid),"confidence without evidence");
    invalid.confidence.reset();
    Check(recording::ParseVaReviewOutput(recording::SerializeVaReviewOutput(invalid),2,&output,&error)&&!output.confidence,
        "V450-C01 unknown confidence and ungrounded uncertainty accepted");
    invalid=record.output;invalid.supports.resize(17,invalid.supports.front());rejects(recording::SerializeVaReviewOutput(invalid),"claim count");
    const auto record_json=recording::SerializeVaReviewRecord(record);recording::VaReviewRecord decoded;
    Check(recording::ParseVaReviewRecord(record_json,&decoded,&error)&&
        recording::SerializeVaReviewRecord(decoded)==record_json&&decoded.input.pngs.empty(),"V450-C01 record provenance replay");
    auto bad_record=record;bad_record.model_revision="unverified";
    Check(!recording::ValidateVaReviewRecord(bad_record,&error),"V450-C01 local model digest required");
    bad_record=record;bad_record.adapter_version="unsupported-adapter-v1";
    Check(!recording::ValidateVaReviewRecord(bad_record,&error),"V450-C01 provider provenance mismatch");
    bad_record=record;bad_record.provider="gemini";
    Check(!recording::ValidateVaReviewRecord(bad_record,&error),"V450-G01 removed provider record rejected");
    recording::VaReviewStore::Limits limits;limits.records=2;
    recording::VaReviewStore store(root/"reviews",limits);
    Check(store.Recover(&error),"V450-S01 store startup");
    std::string id,second;
    Check(store.Publish(record,&id,&error)&&store.Read(id,&decoded,&error)&&
        recording::SerializeVaReviewRecord(decoded)==record_json,"V450-S01 durable readback");
    Check(store.Publish(record,&second,&error)&&second==id,"V450-S01 same record idempotent publication");
    record.revision_id="revision-2";
    Check(store.Publish(record,&second,&error)&&second!=id,"V450-S01 new revision never overwrites");
    record.revision_id="revision-3";std::string untouched="unchanged";
    Check(!store.Publish(record,&untouched,&error)&&error=="review-capacity"&&untouched=="unchanged",
        "V450-S01 configured count boundary fails closed");
    recording::VaReviewStore reopened(root/"reviews",limits);std::vector<std::string> ids;
    Check(reopened.Recover(&error)&&reopened.List(&ids,&error)&&ids.size()==2&&reopened.Read(id,&decoded,&error)&&
        recording::SerializeVaReviewRecord(decoded)==record_json,"V450-S01 restart original revision preserved");
    auto tiny=limits;tiny.record_bytes=record_json.size()-1;
    recording::VaReviewStore oversized(root/"too-large",tiny);
    record.revision_id="revision-1";
    Check(!oversized.Publish(record,&untouched,&error)&&error=="review-record-too-large","V450-S01 record byte cap");
    tiny=limits;tiny.bytes=record_json.size()+7;
    recording::VaReviewStore capacity(root/"capacity",tiny);
    Check(!capacity.Publish(record,&untouched,&error)&&error=="review-capacity","V450-S01 store byte cap includes header");
    tiny=limits;tiny.reserve_bytes=std::numeric_limits<std::uint64_t>::max();
    recording::VaReviewStore reserve(root/"reserve",tiny);
    Check(!reserve.Publish(record,&untouched,&error)&&error=="review-disk-reserve","V450-S01 disk reserve");
    recording::VaReviewStore cancelled(root/"cancelled",limits);unsigned cancel_checks=0;
    Check(!cancelled.Publish(record,&untouched,&error,[&]{return ++cancel_checks>=3;})&&error=="review-cancelled"&&
        !std::filesystem::exists(root/"cancelled/.pending-review-v1")&&cancelled.List(&ids,&error)&&ids.empty(),
        "V450-S01 cancellation after write cleans pending/no publication");
    const auto pending_path=root/"reviews/.pending-review-v1";
    {std::ofstream f(pending_path);f<<"MSVA";}::chmod(pending_path.c_str(),0600);
    Check(reopened.Recover(&error)&&!std::filesystem::exists(pending_path),"V450-S01 interrupted partial header recovered");
    Check(::link((root/"reviews"/(id+".review")).c_str(),pending_path.c_str())==0,"V450-S01 published pending fixture");
    Check(reopened.Recover(&error)&&reopened.Read(id,&decoded,&error),"V450-S01 crash after atomic link keeps result");
    const auto hardlink=root/"owned-hardlink";
    Check(::link((root/"reviews"/(id+".review")).c_str(),hardlink.c_str())==0&&!reopened.Read(id,&decoded,&error),
        "V450-S01 unexpected hardlink rejected");
    Check(::unlink(hardlink.c_str())==0,"V450-S01 own hardlink removed");
    std::filesystem::create_directory_symlink(root/"reviews",root/"review-link");
    recording::VaReviewStore linked(root/"review-link",limits);
    Check(!linked.Read(id,&decoded,&error),"V450-S01 symlink directory rejected");
    Check(!store.Read("../record",&decoded,&error),"V450-S01 path ID rejected");
    recording::VaReviewStore unwritable(root/"unwritable",limits);
    Check(unwritable.Recover(&error)&&::chmod((root/"unwritable").c_str(),0500)==0,"V450-S01 write-failure setup");
    Check(!unwritable.Publish(record,&untouched,&error)&&error=="review-write-failed","V450-S01 failed write not published");
    Check(::chmod((root/"unwritable").c_str(),0700)==0,"V450-S01 own permissions restored");
    const int fd=::open((root/"reviews"/(id+".review")).c_str(),O_WRONLY|O_CLOEXEC|O_NOFOLLOW);
    Check(fd>=0,"V450-S01 corruption fixture opened");const char corrupt='x';
    const auto wrote=::pwrite(fd,&corrupt,1,9);::close(fd);
    Check(wrote==1&&!reopened.Read(id,&decoded,&error)&&!reopened.Recover(&error),"V450-S01 corrupt read/startup rejected");
}
template<class Predicate> void Until(Predicate predicate) {
    const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(5);
    while(!predicate()) {
        if(std::chrono::steady_clock::now()>=deadline)throw std::runtime_error("queue observation deadline");
        std::this_thread::sleep_for(std::chrono::milliseconds(2));
    }
}
recording::VaReviewJob Done(recording::VaReviewService& service,const std::string& id) {
    recording::VaReviewJob job;std::string error;
    Until([&]{if(!service.Get(id,[](const auto&){return true;},&job,&error))throw std::runtime_error(error);
        return job.state!="queued"&&job.state!="running";});return job;
}
std::size_t Fds() {
    return std::distance(std::filesystem::directory_iterator("/dev/fd"),std::filesystem::directory_iterator{});
}
std::size_t Threads() {
#ifdef __APPLE__
    proc_taskinfo info{};
    if(proc_pidinfo(::getpid(),PROC_PIDTASKINFO,0,&info,sizeof(info))!=sizeof(info))throw std::runtime_error("thread-count-read");
    return info.pti_threadnum;
#else
    return std::distance(std::filesystem::directory_iterator("/proc/self/task"),std::filesystem::directory_iterator{});
#endif
}
void QueueChecks(const std::filesystem::path& root) {
    const auto prototype=Record(root);const auto package=prototype.input.package_id;
    recording::EvidencePackageStore evidence(root/"record-input",{});
    recording::VaReviewStore store(root/"queue-reviews",{});
    const auto permit=[](const std::string& c){return c=="camera-1";};
    std::atomic<unsigned> called{0};std::atomic<int> mode{0};std::atomic<bool> release{false};
    auto fake=[&](const auto& input,const std::string& provider,auto,const auto& cancelled,
        recording::VaReviewInference* output,std::string* error) {
        ++called;
        while(mode==1&&!release&&!cancelled())std::this_thread::sleep_for(std::chrono::milliseconds(2));
        if(cancelled()){*error="review-cancelled";return false;}
        if(mode==3){*error="review-missing-model";return false;}
        if(mode==4)throw std::runtime_error("private-provider-detail");
        if(input.pngs.size()!=2)throw std::runtime_error("missing input bytes");
        *output={prototype.output,provider,prototype.model,prototype.model_revision,prototype.prompt_sha256,prototype.adapter_version};
        if(mode==2)output->output.supports.front().frame_indices={99};
        return true;
    };
    recording::VaReviewService::Options options;options.enabled=true;
    const auto baseline_fds=Fds(),baseline_threads=Threads();
    recording::VaReviewService service(evidence,store,options,fake);
    Check(service.ready(),"V450-Q01 worker ready");
    Check(Threads()==baseline_threads+1,"V450-Q01 exactly one worker thread");
    recording::VaReviewJob first,duplicate;std::string error;mode=1;
    Check(service.Submit(package,"first","ollama","alice",permit,&first,&error),"V450-Q01 accepted asynchronously");
    Until([&]{return called.load()==1;});
    Check(service.Submit(package,"first","ollama","alice",permit,&duplicate,&error)&&duplicate.id==first.id,
        "V450-Q01 active duplicate shares job");
    std::vector<recording::VaReviewJob> queued(4);
    for(unsigned i=0;i<4;++i)Check(service.Submit(package,"queued-"+std::to_string(i),"ollama","alice",permit,&queued[i],&error),
        "V450-Q01 queue slot "+std::to_string(i));
    Check(!service.Submit(package,"overflow","ollama","alice",permit,&duplicate,&error)&&error=="review-queue-full",
        "V450-Q01 queue four boundary");
    Check(!service.Cancel(queued[0].id,"bob",false,permit,&error)&&error=="review-forbidden","V450-Q01 other owner cannot cancel");
    Check(service.Cancel(queued[0].id,"admin",true,permit,&error)&&Done(service,queued[0].id).state=="cancelled",
        "V450-Q01 admin queued cancellation");
    Check(service.Cancel(first.id,"alice",false,permit,&error)&&Done(service,first.id).state=="cancelled",
        "V450-Q01 active cancellation");
    release=true;mode=0;
    for(unsigned i=1;i<4;++i)Check(Done(service,queued[i].id).state=="completed","V450-Q01 queue continues after cancellation");
    std::vector<std::string> ids;Check(store.List(&ids,&error)&&ids.size()==3,"V450-Q01 cancelled jobs never persist");
    for(int kind:{2,3,4}) {
        mode=kind;recording::VaReviewJob job;
        Check(service.Submit(package,"failure-"+std::to_string(kind),"ollama","alice",permit,&job,&error),"V450-Q01 failure task admitted");
        const auto done=Done(service,job.id);
        Check(done.state=="failed"&&done.error==(kind==2?"review-invalid-output":kind==3?"review-missing-model":"review-failed"),
            "V450-Q01 isolated failure "+std::to_string(kind));
    }
    Check(store.List(&ids,&error)&&ids.size()==3,"V450-Q01 invalid/missing/exception no result writes");
    std::atomic<bool> allowed{true};mode=1;release=false;const auto before=called.load();
    recording::VaReviewJob revoked;
    Check(service.Submit(package,"revoke","ollama","alice",[&](const auto&){return allowed.load();},&revoked,&error),
        "V450-Q01 revocation task admitted");
    Until([&]{return called.load()>before;});allowed=false;
    Check(Done(service,revoked.id).error=="review-forbidden"&&store.List(&ids,&error)&&ids.size()==3,
        "V450-Q01 current permission revocation aborts/no write");
    Check(!service.Get(first.id,[](const auto&){return false;},&duplicate,&error)&&error=="review-forbidden",
        "V450-Q01 status rechecks current channel scope");
    mode=0;recording::VaReviewJob good;
    Check(service.Submit(package,"recovery","ollama","alice",permit,&good,&error)&&Done(service,good.id).state=="completed",
        "V450-Q01 worker usable after failures");
    service.Stop();
    Check(Fds()==baseline_fds&&Threads()==baseline_threads,"V450-Q01 FD/thread counts return after failure workload and join");
    Check(!service.Submit(package,"stopped","ollama","alice",permit,&duplicate,&error)&&error=="review-disabled",
        "V450-Q01 shutdown stops admission");
    recording::VaReviewService restarted(evidence,store,options,fake);
    Check(restarted.ready()&&!restarted.Get(good.id,permit,&duplicate,&error)&&error=="review-job-expired",
        "V450-Q01 restart expires process jobs without replay");
    restarted.Stop();
    recording::VaReviewStore short_store(root/"short-queue",{});
    options.execution_time=std::chrono::milliseconds(80);options.queue_wait=std::chrono::milliseconds(30);
    mode=1;release=false;
    recording::VaReviewService short_queue(evidence,short_store,options,fake);recording::VaReviewJob active,waiting;
    const auto short_before=called.load();
    Check(short_queue.Submit(package,"timeout","ollama","alice",permit,&active,&error),"V450-Q01 actual deadline task");
    Until([&]{return called.load()>short_before;});
    Check(short_queue.Submit(package,"queue-timeout","ollama","alice",permit,&waiting,&error),"V450-Q01 queue deadline task");
    Check(Done(short_queue,active.id).error=="review-timeout"&&Done(short_queue,waiting.id).error=="review-queue-timeout"&&
        called.load()==short_before+1,"V450-Q01 execution and waiting deadlines differ; expired queue not called");
    short_queue.Stop();
    options.execution_time=std::chrono::seconds(60);options.queue_wait=std::chrono::seconds(30);options.remembered_jobs=5;
    recording::VaReviewStore bounded_store(root/"bounded-jobs",{});
    recording::VaReviewService bounded(evidence,bounded_store,options,fake);mode=0;std::string oldest;
    for(unsigned i=0;i<8;++i) {
        recording::VaReviewJob job;
        Check(bounded.Submit(package,"history-"+std::to_string(i),"ollama","alice",permit,&job,&error)&&Done(bounded,job.id).state=="completed",
            "V450-Q01 finite terminal history "+std::to_string(i));if(i==0)oldest=job.id;
    }
    Check(!bounded.Get(oldest,permit,&duplicate,&error)&&error=="review-job-unavailable","V450-Q01 old terminal metadata evicted");
    mode=1;release=false;const auto mixed_before=called.load();
    Check(bounded.Submit(package,"mixed","ollama","alice",permit,&active,&error),"V450-Q01 blocking provider admitted");
    Until([&]{return called.load()>mixed_before;});
    recording::RecordingRuntimeStorage runtime(root/"mixed-recordings");
    Check(runtime.Open(&error),"V450-Q01 media storage opens during provider wait");
    auto video=Encode(30,false,false,160,90,30,30);Shift(video,7000000000ULL);
    recording::GStreamerSegmentWriter writer(runtime.WriterOptions(1000));
    Check(writer.Start("camera-1","unused",video.descriptor,[](auto,auto,auto*){return false;},&error),"V450-Q01 actual writer starts");
    for(const auto& packet:video.packets)writer.Push(packet,0);writer.Stop();
    Check(runtime.catalog().FinalizedSegmentIdsForStartup().size()==1,"V450-Q01 actual recording finalized while provider waits");
    recording::RecordingReadService reader(runtime.catalog());recording::RecordingSearchReader search(runtime.catalog(),reader);
    std::shared_ptr<const recording::RecordingSearchModel> model;
    Check(search.Refresh({"camera-1"},{},&model,&error)&&!model->documents().empty(),"V450-Q01 actual search refresh proceeds");
    recording::RecordingSearchQuery query;query.channels={"camera-1"};query.start_time_ms=1789200000000;
    query.end_time_ms=1789200100000;recording::RecordingSearchMatches matches;
    Check(model->Query(query,&matches,&error)&&matches.positions.size()==1,"V450-Q01 independent time query returns recorded segment");
    analysis::FileEventStorage events((root/"events.jsonl").string());analysis::EventRecord event;
    event.event_id="va-review-isolation-event";event.channel_id="camera-1";event.event_type="Intrusion";event.status="closed";
    Check(events.Store(event,&error)&&std::filesystem::file_size(root/"events.jsonl")>0,"V450-Q01 actual event append proceeds");
    Check(bounded.Get(active.id,permit,&duplicate,&error)&&duplicate.state=="running","V450-Q01 provider still pending during media/event/search progress");
    const auto stopped_at=std::chrono::steady_clock::now();bounded.Stop();
    Check(std::chrono::steady_clock::now()-stopped_at<std::chrono::milliseconds(500)&&Done(bounded,active.id).state=="cancelled",
        "V450-Q01 cooperative cancellation joins worker within 500ms");
    recording::VaReviewService::Options disabled;
    recording::VaReviewService off(evidence,store,disabled,fake);const auto off_before=called.load();
    Check(!off.Submit(package,"off","ollama","alice",permit,&duplicate,&error)&&error=="review-disabled"&&called.load()==off_before,
        "V450-Q01 disabled never invokes provider");
}
// Provider wire fixtures are explicit model responses, never generated expectations.
std::string WireObservation(const std::string& value="위치 x=64",const std::string& visibility="visible",const std::string& identity="same") {
    using recording::EvidenceJsonQuote;
    return "{\"identity\":"+EvidenceJsonQuote(identity)+",\"visibility\":"+EvidenceJsonQuote(visibility)+",\"value\":"+(value.empty()?"null":EvidenceJsonQuote(value))+"}";
}
std::string WireGap(const std::string& kind="unobserved-property",
    const std::string& question="가려진 구간에서 물체의 전후 위치를 비교할 수 있는 영상이 있나요?",const std::string& refs="[1]") {
    using recording::EvidenceJsonQuote;
    return EvidenceJsonQuote(kind)+":{\"frameIndices\":"+refs+",\"missing\":\"가려진 구간의 위치를 볼 수 없습니다.\",\"question\":"+EvidenceJsonQuote(question)+"}";
}
std::string WireClaim(const std::string& claim,const std::string& verdict="supported",const std::string& observations="",
    const std::string& gaps="",const std::string& basis="visible-property",const std::string& property="position") {
    using recording::EvidenceJsonQuote;
    return "{\"claim\":"+EvidenceJsonQuote(claim)+",\"target\":\"물체\",\"property\":"+EvidenceJsonQuote(property)+
        ",\"observations\":{"+(observations.empty()?"\"f0\":"+WireObservation():observations)+
        "},\"summary\":\"첫 프레임에서 물체가 보입니다.\",\"decision\":{\"verdict\":"+EvidenceJsonQuote(verdict)+
        (verdict=="insufficient"?",\"gaps\":{"+gaps+"}":",\"basis\":"+EvidenceJsonQuote(basis)+(gaps.empty()?"":",\"gaps\":{"+gaps+"}"))+"}}";
}
std::string WireResult(const std::string& slots,const std::string& confidence="0.5") {
    return "{\"schema\":\"media-server.va-review-provider.v10\",\"claims\":{"+slots+"},\"confidence\":"+confidence+"}";
}
void ProviderChecks(const std::filesystem::path& root,const std::string& endpoint) {
    using namespace recording;using namespace review_json;
    Check(std::filesystem::create_directory(root/"provider"),"V450-L01 owned protocol fixture parent");
    auto input=Record(root/"provider").input;input.question="물체가 움직인다.";
    const auto original=input.question;
    const auto visible="\"f0\":"+WireObservation()+",\"f1\":"+WireObservation("위치 x=400");
    const auto hidden="\"f0\":"+WireObservation()+",\"f1\":"+WireObservation("","not-visible");
    const auto known=WireClaim(original,"supported",visible,"","ordered-endpoints");
    const auto partial=WireClaim(original,"insufficient",hidden,WireGap(),"");
    const auto valid=WireResult("\"c0\":"+known);
    VaReviewOutput decoded;std::string reason;
    const auto accepts=[&](const std::string& text,const std::string& name){
        const bool ok=DecodeVaReviewProviderOutput(text,input,&decoded,&reason);
        Check(ok,"V450-K03 "+name+" reason="+reason);
    };
    const auto rejects=[&](const std::string& text,const std::string& name,const std::string& expected=""){
        const auto before=SerializeVaReviewOutput(decoded);
        const bool ok=DecodeVaReviewProviderOutput(text,input,&decoded,&reason);
        Check(!ok&&SerializeVaReviewOutput(decoded)==before&&(expected.empty()||reason==expected),
            "V450-K03 "+name+" reason="+reason);
    };
    const auto changed=[](std::string text,const std::string& from,const std::string& to){
        const auto at=text.find(from);if(at==std::string::npos)throw std::runtime_error("missing counterexample mutation");
        text.replace(at,from.size(),to);return text;
    };
    accepts(valid,"same-target ordered endpoint observations");
    accepts(WireResult("\"c0\":"+partial,"null"),"partial observation plus insufficient and actual question");
    Check(decoded.supports.empty()&&decoded.contradictions.empty()&&decoded.unclear.size()==2&&decoded.questions.size()==1&&!decoded.confidence,
        "V450-K03 normal empty groups and null confidence preserved");
    // A: preserve the duplicate claim from run 33 as two explicit slots; do not deduplicate.
    rejects(WireResult("\"c0\":"+partial+",\"c1\":"+partial,"null"),"A duplicate claim coverage","claim-coverage");
    rejects(WireResult("\"c0\":"+partial+",\"c0\":"+partial,"null"),"A duplicate claim ID");
    rejects(WireResult("\"c0\":"+known+",\"c1\":"+WireClaim("물체의 위치가 변한다.")),"A paraphrased duplicate","claim-coverage");
    rejects(WireResult("\"c1\":"+known),"missing first claim ID","claim-id");
    rejects(WireResult("\"c0\":"+known+",\"c16\":"+known),"unknown claim ID","claim-id");
    rejects(WireResult(""),"empty claim set");
    input.question="물체가 보인다. 물체가 움직인다.";
    rejects(WireResult("\"c0\":"+WireClaim("물체가 보인다.")),"omitted original claim","claim-coverage");
    accepts(WireResult("\"c0\":"+WireClaim("물체가 보인다.")+",\"c1\":"+known),"distinct claims with same verdict");
    accepts(WireResult("\"c0\":"+WireClaim("물체가 보인다.")+",\"c1\":"+partial),"compound supported and insufficient");
    accepts(WireResult("\"c0\":"+WireClaim("물체가 보인다.","contradicted")+",\"c1\":"+partial),"compound contradicted and insufficient");
    input.question="물체가 움직인다. 물체가 움직인다.";
    accepts(WireResult("\"c0\":"+known+",\"c1\":"+known),"identical text at two distinct original spans is not global deduplication");
    {
        std::string slots;input.question.clear();
        for(unsigned i=0;i<16;++i){if(i){slots+=',';input.question+=' ';}
            input.question+=original;slots+=EvidenceJsonQuote("c"+std::to_string(i))+":"+known;}
        accepts(WireResult(slots),"sixteen distinct original occurrences fit bounded slots and public group");
        rejects(WireResult(slots+",\"c16\":"+known),"seventeenth claim slot rejected");
        input.question=original;
    }
    input.question="  "+original+"  ";accepts(valid,"allowed surrounding spaces");input.question=original;
    // B: not-visible citations remain usable for a gap, never as an observed position.
    rejects(WireResult("\"c0\":"+WireClaim(original,"supported",hidden,"","ordered-endpoints")),"B invisible endpoint cannot support movement","insufficient-observations");
    rejects(changed(valid,"\"visibility\":\"visible\"","\"visibility\":\"not-visible\""),"B hidden frame with position value","unobservable-property");
    rejects(WireResult("\"c0\":"+WireClaim(original,"supported","\"f0\":"+WireObservation(),"","ordered-endpoints")),"single-frame movement","insufficient-observations");
    auto same_time=input;input.manifest.frames[1].pts_ns=input.manifest.frames[0].pts_ns;
    rejects(valid,"same timestamp is not temporal evidence","insufficient-observations");input=same_time;
    rejects(changed(valid,"\"identity\":\"same\"","\"identity\":\"other\""),"different target observations cannot combine","insufficient-observations");
    rejects(changed(valid,"\"identity\":\"same\"","\"identity\":\"uncertain\""),"uncertain target match cannot combine","insufficient-observations");
    accepts(WireResult("\"c0\":"+WireClaim(original,"insufficient",visible,WireGap("unobserved-interval"),""),"null"),"visible endpoints do not establish hidden interval");
    input.question="물체가 보인다.";
    accepts(WireResult("\"c0\":"+WireClaim(input.question,"contradicted","\"f0\":"+WireObservation("보이지 않음","not-visible"),"","visible-property","visibility")),
        "visible absence can contradict a visibility claim");
    accepts(WireResult("\"c0\":"+WireClaim(input.question,"supported","\"f0\":"+WireObservation("빨간색"),"","visible-property","color")),"single-frame color does not need two frames");
    input.question=original;
    // C: gaps inherit target/property; adding an independently conflicting field is rejected.
    for(const auto* extra:{"\"target\":\"다른 물체\",","\"property\":\"color\","})
        rejects(changed(WireResult("\"c0\":"+partial,"null"),"\"missing\":",std::string(extra)+"\"missing\":"),
            "C gap cannot override inherited target/property","gap-link");
    rejects(WireResult("\"c0\":"+WireClaim(original,"insufficient",hidden,WireGap()+","+WireGap(),""),"null"),"duplicate gap ID");
    rejects(WireResult("\"c0\":"+WireClaim(original,"insufficient",hidden,WireGap()+","+WireGap("unobserved-interval"),""),"null"),"duplicate question across gap kinds","duplicate-question");
    rejects(WireResult("\"c0\":"+WireClaim(original,"supported",visible,WireGap(),"ordered-endpoints")),"unneeded question on decisive claim","claim-shape");
    rejects(WireResult("\"c0\":"+WireClaim(original,"insufficient",hidden,"",""),"null"),"insufficient without actual gap","missing-gap");
    rejects(WireResult("\"c0\":"+partial,"0.5"),"confidence without decisive evidence","uncertain-confidence");
    rejects(WireResult("\"c0\":"+WireClaim(original,"insufficient",visible,WireGap("additional-frame"),"ordered-endpoints"),"null"),"gap contradicts two usable endpoint observations","gap-requirement");
    for(const auto& change:std::vector<std::pair<std::string,std::string>>{
        {"\"schema\":\"media-server.va-review-provider.v10\"","\"schema\":\"unknown\""},
        {"\"basis\":\"ordered-endpoints\"","\"basis\":\"unknown\""},
        {"\"verdict\":\"supported\"","\"verdict\":\"unknown\""},
        {"\"f1\"","\"f2\""},{"\"summary\":","\"extra\":1,\"summary\":"},
        {"첫 프레임에서 물체가 보입니다.","English only."},{"\"confidence\":0.5","\"confidence\":1.1"},
        {"\"identity\":\"same\"","\"identity\":true"},{"\"value\":\"위치 x=64\"","\"value\":true"}})
        rejects(changed(valid,change.first,change.second),"strict fields/types/index/language counterexample");
    const auto uncertain=WireResult("\"c0\":"+partial,"null");
    for(const auto& change:std::vector<std::pair<std::string,std::string>>{
        {"[1]","[2]"},{"[1]","[1,1]"},{"[1]","true"},
        {"가려진 구간에서 물체의 전후 위치를 비교할 수 있는 영상이 있나요?","전후 영상을 제공해 주세요?"},
        {"가려진 구간에서 물체의 전후 위치를 비교할 수 있는 영상이 있나요?","전후 영상을 확인합니다."},
        {"\"question\":","\"unexpected\":1,\"question\":"},
        {"\"unobserved-property\":","\"unsupported-gap\":"}})
        rejects(changed(uncertain,change.first,change.second),"strict gap/question counterexample");
    rejects(valid.substr(0,valid.size()-1),"partial JSON is not recovered");
    rejects(valid+valid,"multiple JSON roots are not truncated");
    rejects(changed(valid,"\"confidence\":0.5","\"confidence\":0.5,\"confidence\":0.5"),"duplicate root key");
    rejects(changed(valid,"\"confidence\":0.5","\"confidence\":0.5,\"extra\":1"),"extra root key");
    rejects(std::string(40*1024+1,'x'),"wire byte ceiling");
    // Grammar/shape cannot establish the truth of free Korean text; no blacklist masquerades as an oracle.
    accepts(changed(uncertain,"가려진 구간에서 물체의 전후 위치를 비교할 수 있는 영상이 있나요?","물체가 가려져 있는지 확인할 수 있나요?"),
        "C legacy wrong-purpose text is structurally admissible and remains a semantic FAIL oracle");

    // Run 35: missing property and target identity are independent, not mutually exclusive.
    const auto unseen="\"f0\":"+WireObservation("","not-visible","uncertain")+",\"f1\":"+WireObservation("","not-visible","uncertain");
    const auto both_gaps=WireGap()+","+WireGap("identity","같은 물체인지 확인할 수 있는 가림 없는 영상이 있나요?");
    accepts(WireResult("\"c0\":"+WireClaim(original,"insufficient",unseen,both_gaps),"null"),"invisible property and unknown identity coexist");
    Check(decoded.questions.size()==2,"V450-K03 both independent deficits retained");
    accepts(WireResult("\"c0\":"+WireClaim(original,"insufficient","\"f0\":"+WireObservation(),
        WireGap("additional-frame","물체의 위치를 비교할 수 있는 다른 시각과 촬영 순서가 표시된 영상이 있나요?","[0]")),"null"),
        "one observed position allows additional-frame gap without decisive basis");
    rejects(changed(uncertain,"\"decision\":{","\"decision\":{\"basis\":\"visible-property\","),"insufficient cannot carry redundant basis","claim-shape");
    rejects(changed(valid,"\"property\":\"position\"","\"property\":\"unspecified\""),"decisive needs specified property","ambiguous-decision");
    rejects(changed(uncertain,"[1]","[]"),"gap needs existing evidence context","gap-link");
    rejects(WireResult("\"c0\":"+WireClaim(original,"insufficient",visible,WireGap("unobserved-property")),"null"),"visible known property is not missing","gap-requirement");
    rejects(WireResult("\"c0\":"+WireClaim(original,"insufficient",hidden,WireGap("identity")),"null"),"known same identity is not missing","gap-requirement");
    accepts(WireResult("\"c0\":"+WireClaim(original,"insufficient","\"f1\":"+WireObservation("위치 x=400","visible","other"),WireGap("identity")),"null"),
        "definitely other target is distinct from unknown identity and cannot supply target evidence");
    accepts(WireResult("\"c0\":"+WireClaim(original,"contradicted",visible,"","ordered-endpoints")),"temporal contradiction with sufficient observations");
    rejects(changed(valid,"\"basis\":\"ordered-endpoints\"","\"basis\":\"hidden-interval\""),"no sufficient hidden path basis","decision-basis");
    {
        std::ifstream file(root/"contract-replay.json");std::string data((std::istreambuf_iterator<char>(file)),{});Doc replay;
        std::vector<std::string> examples;
        Check(Parse(data,&replay)&&Array(replay,"cases",&examples)&&examples.size()==10,"V450-K03 ten explicitly synthetic legacy transformations");
        const auto saved=input;
        for(const auto& raw:examples){
            Doc item;std::string id,claim,source_hash;std::size_t frames=0;
            Check(Parse(raw,&item)&&Text(item,"id",&id)&&Text(item,"claim",&claim)&&Number(item,"frames",&frames)&&frames>=1&&frames<=8&&
                Text(item,"originalContentSha256",&source_hash)&&EvidenceIsSha256(source_hash)&&item.Find("syntheticWire"),"V450-K03 replay provenance and shape");
            input.question=claim;input.manifest.frames.resize(frames);
            for(std::size_t i=0;i<frames;++i)input.manifest.frames[i].pts_ns=std::int64_t(i)*1000000000;
            accepts(item.Find("syntheticWire")->raw,"run34 transformed "+id+"; receiver only, original question meaning not promoted");
        }
        input=saved;
    }

    VaReviewProviderOptions options;options.enabled=true;options.local_endpoint=endpoint;
    unsigned calls=0;int mode=0;std::string error;VaReviewInference out;
    const auto transport=[&](const VaReviewHttpRequest& request,auto,const auto&,std::string* response,std::string*) {
        ++calls;
        if(request.url==endpoint+"/api/tags"){
            *response="{\"models\":[{\"name\":"+EvidenceJsonQuote(mode==1?"missing":options.local_model)+",\"digest\":"+
                EvidenceJsonQuote(std::string(64,mode==7&&calls==3?'e':'d'))+"}]}";return true;
        }
        Check(request.url==endpoint+"/api/chat","V450-L01 exact local chat path");
        Doc body,system,user,format,properties,slots,slot_properties,definitions,claim_fields,claim_definition,obs_schema,obs_keys;
        std::vector<std::string> messages,images;std::string instructions,content;
        Check(Parse(request.body,&body)&&Array(body,"messages",&messages)&&messages.size()==4&&Parse(messages.front(),&system)&&
            Parse(messages.back(),&user),"V450-L01 labeled image protocol");
        for(std::size_t i=0;i<2;++i){Doc frame;std::vector<std::string> one;std::string label;
            Check(Parse(messages[i+1],&frame)&&Text(frame,"content",&label)&&label=="Evidence frame index: "+std::to_string(i)&&
                Array(frame,"images",&one)&&one.size()==1,"V450-L01 frame index bound to one original image");images.push_back(one.front());}
        const auto object=[](const Doc& parent,const char* key,Doc* output){const auto value=ingress::StrictJsonObjectField(parent,key);return value&&Parse(*value,output);};
        Check(ingress::StrictJsonBoolField(body,"stream")==false&&body.Find("keep_alive")->raw=="0"&&
            object(body,"format",&format)&&Text(system,"content",&instructions)&&instructions.find(body.Find("format")->raw)!=std::string::npos,
            "V450-K03 identical bounded schema in format and system prompt; not decoder enforcement evidence");
        Check(object(format,"properties",&properties)&&object(properties,"claims",&slots)&&object(slots,"properties",&slot_properties)&&
            slot_properties.members.size()==16&&slot_properties.Find("c0")&&slot_properties.Find("c15")&&!slot_properties.Find("c16")&&
            ingress::StrictJsonBoolField(slots,"additionalProperties")==false,
            "V450-K03 generation schema contains only c0..c15 object keys");
        Check(object(format,"$defs",&definitions)&&object(definitions,"claim",&claim_definition)&&object(claim_definition,"properties",&claim_fields)&&
            object(claim_fields,"observations",&obs_schema)&&object(obs_schema,"properties",&obs_keys)&&
            obs_keys.members.size()==2&&obs_keys.Find("f0")&&obs_keys.Find("f1")&&!obs_keys.Find("f2"),
            "V450-K03 frame keys bounded to actual input");
        Doc decision_schema,gap_definition,gap_fields;std::vector<std::string> alternatives;
        Check(!claim_fields.Find("scope")&&object(claim_fields,"decision",&decision_schema)&&Array(decision_schema,"anyOf",&alternatives)&&alternatives.size()==2&&
            object(definitions,"gap",&gap_definition)&&object(gap_definition,"properties",&gap_fields)&&gap_fields.members.size()==3&&
            !gap_fields.Find("target")&&!gap_fields.Find("property"),"V450-K03 schema removes scope and duplicate target/property");
        for(std::size_t i=0;i<alternatives.size();++i){Doc branch,fields;std::vector<std::string> required;
            Check(Parse(alternatives[i],&branch)&&object(branch,"properties",&fields)&&Array(branch,"required",&required)&&required.size()==2&&fields.members.size()==2&&
                fields.Find("verdict")&&fields.Find(i==0?"basis":"gaps")&&!fields.Find(i==0?"gaps":"basis")&&
                ingress::StrictJsonBoolField(branch,"additionalProperties")==false,"V450-K03 decisive basis and insufficient gaps are disjoint schema branches");
        }
        Doc metadata;std::vector<std::string> frames;
        Check(Text(user,"content",&content)&&content.find("Metadata: ")!=std::string::npos&&
            Parse(content.substr(content.find("Metadata: ")+10,content.find('\n')-content.find("Metadata: ")-10),&metadata)&&Array(metadata,"frames",&frames)&&frames.size()==2&&
            content.find("\"ptsNs\":1000000")!=std::string::npos&&content.find(input.question)!=std::string::npos&&
            content.find("camera-1")==std::string::npos&&images[0]!=images[1],"V450-L01 exact timing/order without source metadata");
        const auto payload=mode==3?"{}":mode==4?WireResult("\"c0\":"+partial+",\"c1\":"+partial,"null"):valid;
        *response="{\"model\":"+EvidenceJsonQuote(mode==5?"unexpected":options.local_model)+",\"done\":"+(mode==8?"false":"true")+
            ",\"done_reason\":"+EvidenceJsonQuote(mode==6?"length":"stop")+",\"message\":{\"role\":\"assistant\",\"content\":"+EvidenceJsonQuote(payload)+"}}";
        if(mode==2)*response="{invalid";return true;
    };
    const auto run=[&]{return MakeVaReviewProvider(options,transport)(input,"ollama",VaReviewService::Clock::now()+std::chrono::seconds(5),[]{return false;},&out,&error);};
    Check(run()&&calls==3&&out.model_revision==std::string(64,'d')&&EvidenceIsSha256(out.prompt_sha256)&&out.adapter_version=="ollama-chat-v11",
        "V450-L01 model digest before/after and actual adapter/prompt provenance");
    for(mode=1;mode<=8;++mode){calls=0;out.model="unchanged";const auto before=SerializeVaReviewOutput(out.output);
        Check(!run()&&out.model=="unchanged"&&SerializeVaReviewOutput(out.output)==before,"V450-L01 invalid envelope/wire/length/digest does not mutate output "+std::to_string(mode));}
    mode=0;calls=0;options.enabled=false;Check(!run()&&calls==0,"V450-L01 off never sends");options.enabled=true;
    for(const auto* bad:{"http://127.0.0.1:0","http://127.0.0.1:65536","http://user@localhost","http://127.0.0.1:1/path","http://localhost//"}){
        options.local_endpoint=bad;Check(!run()&&calls==0,"V450-L01 malformed endpoint before transport");}
    options.local_endpoint=endpoint;
    for(const auto* unsupported:{"gemini","unknown"}){
        Check(!MakeVaReviewProvider(options,transport)(input,unsupported,VaReviewService::Clock::now()+std::chrono::seconds(5),[]{return false;},&out,&error)&&calls==0,
            "V450-G01 unsupported provider never transmits");}
    Check(!MakeVaReviewProvider(options,transport)(input,"ollama",VaReviewService::Clock::now()+std::chrono::seconds(5),[]{return true;},&out,&error)&&calls==0,
        "V450-L01 cancelled before first transmission");
    Check(!MakeVaReviewProvider(options,transport)(input,"ollama",VaReviewService::Clock::now(),[]{return false;},&out,&error)&&error=="review-timeout"&&calls==0,
        "V450-L01 expired deadline before first transmission");
    auto invalid=input;invalid.pngs[0][0]=0;
    Check(!MakeVaReviewProvider(options,transport)(invalid,"ollama",VaReviewService::Clock::now()+std::chrono::seconds(5),[]{return false;},&out,&error)&&calls==0,
        "V450-L01 mutated PNG rejected before transmission");
    {
        EvidencePackageStore evidence(root/"provider/record-input",{});VaReviewStore store(root/"invalid-wire-records",{});
        VaReviewService::Options service_options;service_options.enabled=true;mode=4;calls=0;
        VaReviewService service(evidence,store,service_options,MakeVaReviewProvider(options,transport));
        VaReviewJob job;Check(service.Submit(input.package_id,input.question,"ollama","owner",[](const auto&){return true;},&job,&error),
            "V450-K03 invalid wire job accepted for processing");
        const auto done=Done(service,job.id);std::vector<std::string> ids;
        Check(done.state=="failed"&&done.error=="review-invalid-output"&&done.review_id.empty()&&store.List(&ids,&error)&&ids.empty(),
            "V450-K03 invalid duplicate model response never stored");service.Stop();
    }
    const auto fds=Fds();std::string response;
    const auto wire=[&](const std::string& body,std::chrono::milliseconds timeout=std::chrono::seconds(3)){
        response="unchanged";return VaReviewCurl({endpoint+"/api/chat",body,{}},VaReviewService::Clock::now()+timeout,[]{return false;},&response,&error);
    };
    Check(wire("{\"mode\":\"ok\"}")&&response=="{\"ok\":true}","V450-L01 actual curl stdin/stdout HTTP transport");
    for(const auto& pair:std::vector<std::pair<std::string,std::string>>{{"401","review-provider-auth"},{"429","review-provider-rate-limit"},
        {"404","review-missing-model"},{"500","review-provider-unavailable"},{"redirect","review-provider-unavailable"},{"large","review-response-too-large"}}) {
        Check(!wire("{\"mode\":\""+pair.first+"\"}")&&error==pair.second&&response=="unchanged","V450-L01 actual HTTP "+pair.first+" stable failure");
    }
    Check(!wire("{\"mode\":\"slow\"}",std::chrono::milliseconds(80))&&error=="review-timeout","V450-L01 actual transport deadline");
    const auto started=VaReviewService::Clock::now();
    Check(!VaReviewCurl({endpoint+"/api/chat","{\"mode\":\"slow\"}",{}},started+std::chrono::seconds(3),
        [&]{return VaReviewService::Clock::now()-started>std::chrono::milliseconds(50);},&response,&error)&&error=="review-cancelled",
        "V450-L01 actual transport cancellation");
    Check(Fds()==fds,"V450-L01 transport FD recovery after failures");
    int status=0;errno=0;Check(::waitpid(-1,&status,WNOHANG)==-1&&errno==ECHILD,"V450-L01 no unreaped curl child");
}
// 로컬 TLS 서버만 연결한다. 원격 주소는 parser와 합성 provider 단계에서만 대조한다.
void ConnectionChecks(const std::filesystem::path& root) {
    using namespace recording;
    const auto ca=(root/"tls-cert.pem").string();
    for(const auto* endpoint:{"http://localhost","http://ollama:11434","https://gpu.internal:443",
        "http://192.168.1.50:11434","http://[::1]:11434","https://[2001:db8::1]","https://localhost/"})
        Check(ValidateVaReviewConnection(endpoint,"",""),"V450-N01 supported configured authority");
    for(const auto& endpoint:std::vector<std::string>{"","ftp://localhost","http://host/path","http://host//",
        "http://a@localhost","http://host?x","http://host#x","http://host\\path","http://127.1",
        "http://256.1.1.1","http://host:0","http://host:65536","http://host:","http://host:1:2",
        "http://[::1]tail","http://[bad]","http://a..b","http://-host","http://host-","http://host\n",
        std::string("http://[::1\0evil]",18)})
        Check(!ValidateVaReviewConnection(endpoint,"",""),"V450-N01 malformed authority rejected");
    Check(!ValidateVaReviewConnection("http://localhost","synthetic-token",""),"V450-N02 plaintext token rejected");
    Check(!ValidateVaReviewConnection("http://localhost","",ca),"V450-N02 CA on plaintext rejected");
    Check(!ValidateVaReviewConnection("https://localhost","",(root/"missing-ca.pem").string()),"V450-N02 missing CA rejected");
    Check(!ValidateVaReviewConnection("https://localhost","",root.string()),"V450-N02 CA directory rejected");
    for(const auto& token:std::vector<std::string>{"bad token","bad\r\nHost: other","=onlypadding","a=b",std::string(4097,'a')})
        Check(!ValidateVaReviewConnection("https://localhost",token,ca),"V450-N02 invalid credential rejected");
    Check(ValidateVaReviewConnection("https://localhost","aB09-._~+/==",ca),"V450-N02 bearer alphabet and padding accepted");
    Check(std::filesystem::create_directory(root/"remote-provider"),"V450-N01 isolated provider fixture");
    const auto input=Record(root/"remote-provider").input;VaReviewProviderOptions options;options.enabled=true;
    options.local_endpoint="https://gpu.internal:11434/";options.bearer_token="synthetic-token";options.ca_file=ca;
    unsigned calls=0;VaReviewInference inference;std::string error;
    const auto fake=[&](const VaReviewHttpRequest& request,auto,const auto&,std::string* response,std::string*){
        ++calls;Check(request.headers==std::vector<std::string>{"Authorization: Bearer synthetic-token"}&&request.ca_file==ca,
            "V450-N02 model discovery and chat receive same credentials and CA");
        if(request.url=="https://gpu.internal:11434/api/tags"){
            *response="{\"models\":[{\"name\":\""+options.local_model+"\",\"digest\":\""+std::string(64,'c')+"\"}]}";return true;
        }
        Check(request.url=="https://gpu.internal:11434/api/chat"&&request.body.find(options.bearer_token)==std::string::npos,
            "V450-N01 canonical chat path without credential in body");
        VaReviewOutput visible;visible.supports.push_back({"빨간 사각형이 보입니다.",{0}});
        const auto content=WireResult("\"c0\":"+WireClaim(input.question));
        *response="{\"model\":\""+options.local_model+"\",\"done\":true,\"done_reason\":\"stop\",\"message\":{\"role\":\"assistant\",\"content\":"+EvidenceJsonQuote(content)+"}}";
        return true;
    };
    const auto run=[&]{return MakeVaReviewProvider(options,fake)(input,"ollama",VaReviewService::Clock::now()+std::chrono::seconds(5),[]{return false;},&inference,&error);};
    Check(run()&&calls==3,"V450-N01 remote configuration routes through synthetic transport only");
    calls=0;options.local_endpoint="http://localhost:11434";
    Check(!run()&&calls==0,"V450-N02 HTTP bearer rejected before first provider call");
    options.local_endpoint="https://localhost//";
    Check(!run()&&calls==0,"V450-N01 malformed endpoint not repaired into accepted URL");
    unsigned port=0,expired_port=0;std::ifstream(root/"tls-ports.txt")>>port>>expired_port;
    Check(port>0&&expired_port>0,"V450-N02 local TLS fixture ports");
    const auto base="https://localhost:"+std::to_string(port);const auto fds=Fds();std::string response;
    const auto wire=[&](const std::string& url,const std::string& certificate,const std::string& token,const std::string& mode,
        std::chrono::milliseconds timeout=std::chrono::seconds(3)){
        response="unchanged";std::vector<std::string> headers;if(!token.empty())headers.push_back("Authorization: Bearer "+token);
        return VaReviewCurl({url,"{\"mode\":\""+mode+"\"}",headers,certificate},VaReviewService::Clock::now()+timeout,[]{return false;},&response,&error);
    };
    Check(wire(base+"/api/chat",ca,"synthetic-token","auth")&&response=="{\"ok\":true}","V450-N02 actual trusted TLS and bearer");
    Check(wire(base+"/api/chat",ca,"","ok"),"V450-N02 actual TLS without auth");
    Check(!wire(base+"/api/chat",ca,"wrong","auth")&&error=="review-provider-auth"&&response=="unchanged","V450-N02 wrong bearer has no retry");
    Check(!wire(base+"/api/chat",ca,"","auth")&&error=="review-provider-auth","V450-N02 missing bearer rejected by gateway");
    for(const auto& status:std::vector<std::pair<std::string,std::string>>{{"403","review-provider-auth"},{"429","review-provider-rate-limit"}})
        Check(!wire(base+"/api/chat",ca,"synthetic-token",status.first)&&error==status.second&&response=="unchanged","V450-N02 TLS gateway error without output mutation");
    {std::ofstream invalid(root/"invalid-ca.pem");invalid<<"not a certificate";}
    Check(!wire(base+"/api/chat",(root/"invalid-ca.pem").string(),"","ok")&&error=="review-tls-failed","V450-N02 malformed CA fails closed");
    Check(!wire(base+"/api/chat","","synthetic-token","auth")&&error=="review-tls-failed","V450-N02 untrusted certificate fails");
    Check(!wire("https://127.0.0.1:"+std::to_string(port)+"/api/chat",ca,"","ok")&&error=="review-tls-failed","V450-N02 certificate hostname mismatch fails");
    Check(!wire("https://localhost:"+std::to_string(expired_port)+"/api/chat",(root/"tls-expired.pem").string(),"","ok")&&error=="review-tls-failed","V450-N02 expired certificate fails");
    Check(!wire(base+"/api/chat",ca,"synthetic-token","redirect")&&error=="review-provider-unavailable","V450-N01 TLS redirect not followed");
    Check(!wire(base+"/api/chat",ca,"","slow",std::chrono::milliseconds(100))&&error=="review-timeout","V450-N03 TLS deadline aborts");
    auto began=VaReviewService::Clock::now();
    Check(!VaReviewCurl({base+"/api/chat","{\"mode\":\"slow\"}",{},ca},began+std::chrono::seconds(3),
        [&]{return VaReviewService::Clock::now()-began>std::chrono::milliseconds(100);},&response,&error)&&error=="review-cancelled","V450-N03 actual TLS cancellation");
    for(const auto& headers:std::vector<std::vector<std::string>>{{"Host: other"},{"Authorization: Bearer x\r\nHost: other"},
        {"Authorization: Bearer x","Authorization: Bearer y"}})
        Check(!VaReviewCurl({base+"/api/chat","{}",headers,ca},VaReviewService::Clock::now()+std::chrono::seconds(1),[]{return false;},&response,&error)&&error=="review-invalid-input","V450-N02 header injection refused");
    Check(Fds()==fds,"V450-N03 TLS FD baseline restored");
    int status=0;errno=0;Check(::waitpid(-1,&status,WNOHANG)==-1&&errno==ECHILD,"V450-N03 TLS children reaped");
}
std::vector<std::uint8_t> QualityPng(int x) {
    const unsigned width=512,height=288;std::vector<std::uint8_t> png{137,80,78,71,13,10,26,10},header;
    Be(header,width);Be(header,height);header.insert(header.end(),{8,2,0,0,0});Chunk(png,"IHDR",header);
    std::vector<std::uint8_t> raw;raw.reserve(height*(width*3+1));
    for(unsigned y=0;y<height;++y){raw.push_back(0);for(unsigned col=0;col<width;++col) {
        const bool square=x>=0&&int(col)>=x&&int(col)<x+48&&y>=120&&y<168;
        const std::uint8_t background=x<0?128:240;
        raw.push_back(square?230:background);raw.push_back(square?20:background);raw.push_back(square?20:background);
    }}
    uLongf size=compressBound(raw.size());std::vector<std::uint8_t> compressed(size);
    if(compress(compressed.data(),&size,raw.data(),raw.size())!=Z_OK)throw std::runtime_error("quality-png");
    compressed.resize(size);Chunk(png,"IDAT",compressed);Chunk(png,"IEND",{});return png;
}
void QualityChecks(const std::filesystem::path& root,const std::string& endpoint,const std::string& diagnostic="") {
    using namespace recording;
    const bool text_mode=diagnostic=="text"||diagnostic=="text-uncertain"||diagnostic=="text-decisive";
    const bool pair_mode=!diagnostic.empty()&&diagnostic!="text-uncertain";
    EvidencePackageStore evidence(root/"quality-evidence",{});VaReviewStore records(root/"quality-records",{});
    std::string error;Check(evidence.Recover(&error),"V450-L01 quality evidence ready");
    VaReviewProviderOptions provider;provider.enabled=true;provider.local_endpoint=endpoint;
    VaReviewService::Options options;options.enabled=true;
    std::string known_observations;VaReviewInput evaluation_input;
    const auto observed=[&](const VaReviewHttpRequest& request,auto deadline,const auto& cancelled,std::string* response,std::string* error) {
        auto transmitted=request;
        if(text_mode&&request.url.find("/api/chat")!=std::string::npos){
            using namespace review_json;Doc body,user;std::vector<std::string> messages;
            if(!Parse(request.body,&body)||!Array(body,"messages",&messages)||messages.size()<3||!Parse(messages.back(),&user))
                throw std::runtime_error("diagnostic-request-shape");
            std::string content;if(!Text(user,"content",&content))throw std::runtime_error("diagnostic-request-content");
            // Preserve labeled message boundaries, replace only visual inputs with independent facts.
            std::string replacement="["+messages.front();
            for(std::size_t i=1;i+1<messages.size();++i){
                Doc frame;std::string label;if(!Parse(messages[i],&frame)||!Text(frame,"content",&label))throw std::runtime_error("diagnostic-frame-shape");
                replacement+=",{\"role\":\"user\",\"content\":"+EvidenceJsonQuote(label)+"}";
            }
            replacement+=",{\"role\":\"user\",\"content\":"+EvidenceJsonQuote(content+
                "\nDiagnostic only: no images are attached. Use these supplied visible facts as the complete observations: "+known_observations)+"}]";
            const auto original=body.Find("messages")->raw;const auto start=transmitted.body.find(original);
            if(start==std::string::npos)throw std::runtime_error("diagnostic-request-replacement");
            transmitted.body.replace(start,original.size(),replacement);
        }
        if(request.url.find("/api/chat")!=std::string::npos){
            using namespace review_json;Doc body,system;std::vector<std::string> messages;std::string instructions;
            if(!Parse(transmitted.body,&body)||!Array(body,"messages",&messages)||!Parse(messages.front(),&system)||!Text(system,"content",&instructions))
                throw std::runtime_error("quality-provenance-shape");
            const auto format=body.Find("format")->raw;
            std::cout<<"[wire-provenance] requestSha256="<<EvidenceSha256(transmitted.body.data(),transmitted.body.size())
                <<" schemaSha256="<<EvidenceSha256(format.data(),format.size())<<" systemPromptSha256="<<EvidenceSha256(instructions.data(),instructions.size())
                <<" options="<<body.Find("options")->raw<<" stream=false keep_alive=0"<<std::endl;
        }
        const bool ok=VaReviewCurl(transmitted,deadline,cancelled,response,error);
        if(ok&&request.url.find("/api/chat")!=std::string::npos){
            // Only this isolated synthetic evaluator retains raw responses; product logging is unchanged.
            std::cout<<"[synthetic-raw-response] "<<EvidenceJsonQuote(*response)<<std::endl;
            using namespace review_json;Doc envelope,message;std::string content,reason;VaReviewOutput decoded;
            const bool parsed=Parse(*response,&envelope);
            const auto raw=ingress::StrictJsonObjectField(envelope,"message");
            const bool has_content=raw&&Parse(*raw,&message)&&Text(message,"content",&content);
            const bool valid=has_content&&DecodeVaReviewProviderOutput(content,evaluation_input,&decoded,&reason);
            std::cout<<"[wire-validation] json="<<parsed<<" done="<<(ingress::StrictJsonBoolField(envelope,"done")==true)
                <<" shapeAndLinks="<<valid<<" rejection="<<EvidenceJsonQuote(reason)<<" semanticQuality=requires-manual-review"<<std::endl;
        }
        return ok;
    };
    VaReviewService service(evidence,records,options,MakeVaReviewProvider(provider,observed));
    Check(service.ready(),"V450-L01 quality worker ready");unsigned categories=0,uncertain=0,schemas=0,questions=0,coverage=0,pairs=0,case_index=0;
    bool preceding_correct=false;std::string preceding_package;
    auto cases=diagnostic.empty()?VaQualityCases():VaClaimPairs();
    if(diagnostic=="text-uncertain")cases.clear();
    if(diagnostic=="text"||diagnostic=="text-uncertain")for(const auto& test:VaQualityCases())if(std::string(test.expected)=="unclear")cases.push_back(test);
    for(const auto& test:cases) {
        known_observations.clear();
        for(std::size_t i=0;i<test.x.size();++i)
            known_observations+="프레임 "+std::to_string(i)+(test.x[i]<0?": 회색 화면만 보이고 빨간 사각형은 보이지 않는다. ":
                ": 빨간 사각형의 왼쪽 변 x="+std::to_string(test.x[i])+", y=120, 크기 48×48. ");
        if(!diagnostic.empty())std::cout<<"[diagnostic-input] mode="<<diagnostic<<" case="<<test.id
            <<" claim="<<EvidenceJsonQuote(test.claim)<<" suppliedObservations="<<(text_mode?EvidenceJsonQuote(known_observations):"null")<<std::endl;
        std::vector<EvidencePayload> payloads;auto manifest=Manifest(test.x.size(),&payloads);
        for(std::size_t i=0;i<test.x.size();++i) {
            auto png=QualityPng(test.x[i]);const auto sha=EvidenceSha256(png.data(),png.size());
            payloads[i].bytes=png;auto& f=manifest.frames[i];f.width=512;f.height=288;f.png_sha256=sha;
            f.pts_ns=std::int64_t(i)*1000000000;f.presentation_ns=f.pts_ns;
            manifest.assets[i].sha256=sha;manifest.assets[i].size_bytes=png.size();
            auto& ref=manifest.references[i+2];ref.id=f.segment_id+":"+std::to_string(f.pts_ns);ref.sha256=sha;
        }
        std::string id;Check(evidence.Publish(manifest,payloads,&id,&error),std::string("V450-L01 fixture ")+test.id);
        if(pair_mode&&case_index<6&&case_index%2==1)
            Check(id==preceding_package&&test.x==cases[case_index-1].x&&std::string(test.claim)!=cases[case_index-1].claim,
                "V450-K02 inversion pair preserves identical evidence package");
        preceding_package=id;
        Check(LoadVaReviewInput(evidence,id,test.claim,[](const auto&){return true;},&evaluation_input,&error),
            "V450-K03 same input for diagnostic receiver reason");
        VaReviewJob job;const auto start=VaReviewService::Clock::now();
        Check(service.Submit(id,test.claim,"ollama","quality",[](const auto&){return true;},&job,&error),std::string("V450-L01 submit ")+test.id);
        do {
            std::this_thread::sleep_for(std::chrono::milliseconds(50));
            if(!service.Get(job.id,[](const auto&){return true;},&job,&error))throw std::runtime_error("quality-job-get");
        }while((job.state=="queued"||job.state=="running")&&VaReviewService::Clock::now()-start<std::chrono::seconds(65));
        VaReviewRecord record;const bool valid=job.state=="completed"&&records.Read(job.review_id,&record,&error);
        if(valid)++schemas;
        const std::string expected=test.expected;
        const bool unknown=valid&&record.output.supports.empty()&&record.output.contradictions.empty()&&!record.output.unclear.empty()&&!record.output.confidence;
        const bool correct=valid&&(expected=="unclear"?unknown:expected=="supports"?
            !record.output.supports.empty()&&record.output.contradictions.empty():!record.output.contradictions.empty()&&record.output.supports.empty());
        if(correct)++categories;if(expected=="unclear"&&unknown)++uncertain;
        if(pair_mode&&case_index<6&&case_index%2==1&&preceding_correct&&correct)++pairs;
        preceding_correct=correct;++case_index;
        std::vector<bool> cited(test.x.size());
        if(valid)for(const auto* group:{&record.output.supports,&record.output.contradictions,&record.output.unclear})
            for(const auto& item:*group)for(auto index:item.frame_indices)if(index<cited.size())cited[index]=true;
        const bool all_frames=std::string(test.id)=="eight-static";
        const bool covered=valid&&(expected=="unclear"|| (all_frames?std::all_of(cited.begin(),cited.end(),[](bool b){return b;}):cited.front()&&cited.back()));
        if(covered)++coverage;
        if(expected=="unclear"&&valid&&!record.output.questions.empty())++questions;
        std::cout<<"[quality] {\"case\":"<<EvidenceJsonQuote(test.id)<<",\"expected\":"<<EvidenceJsonQuote(expected)
            <<",\"schemaValid\":"<<(valid?"true":"false")<<",\"categoryPass\":"<<(correct?"true":"false")
            <<",\"referenceCoveragePass\":"<<(covered?"true":"false")<<",\"elapsedMs\":"<<std::chrono::duration_cast<std::chrono::milliseconds>(VaReviewService::Clock::now()-start).count()
            <<",\"error\":"<<EvidenceJsonQuote(job.error)<<",\"modelDigest\":"<<EvidenceJsonQuote(record.model_revision)
            <<",\"output\":"<<(valid?SerializeVaReviewOutput(record.output):"null")<<"}"<<std::endl;
        // schema/실행 실패는 선행 조건 실패다. 다음 사례를 실행하지 않는다.
        if(diagnostic.empty()||(!valid&&job.error!="review-invalid-output"))
            Check(valid,std::string("V450-L01 real model schema ")+test.id+" "+job.error);
    }
    service.Stop();
    std::cout<<(diagnostic.empty()?"[quality-summary]":"[diagnostic-summary]")<<" mode="<<diagnostic<<" schema="<<schemas<<'/'<<cases.size()
        <<" category="<<categories<<'/'<<cases.size()<<" referenceCoverage="<<coverage<<'/'<<cases.size()
        <<(diagnostic.empty()||diagnostic=="text"||diagnostic=="text-uncertain"?" uncertainty="+std::to_string(uncertain)+"/4 questionPresence="+std::to_string(questions)+"/4":
            " categoryPairPass="+std::to_string(pairs)+"/3")<<" semanticTextReviewRequired=true qualityStatus=pending-manual-review"<<std::endl;
    rusage usage{};Check(::getrusage(RUSAGE_SELF,&usage)==0,"V450-L01 peak RSS observation");
#ifdef __APPLE__
    const auto rss=usage.ru_maxrss;
#else
    const auto rss=usage.ru_maxrss*1024;
#endif
    std::cout<<"[resource] nativePeakRssBytes="<<rss<<std::endl;
    if(diagnostic.empty())Check(schemas==12&&categories>=10&&uncertain==4&&questions==4,"V450-L01 automated prerequisites; manual meaning and questions still required");
    if(diagnostic=="text")Check(schemas==10&&categories==10&&uncertain==4&&questions==4&&pairs==3,
        "V450-K02 text diagnostic covers decisive and insufficient claims; manual review required");
    if(diagnostic=="text-uncertain")Check(schemas==4&&categories==4&&uncertain==4&&questions==4,
        "V450-K03 four uncertain text prerequisites; manual questions still required");
    if(diagnostic=="text-decisive"||diagnostic=="inversion")Check(schemas==6&&categories==6&&pairs==3,
        "V450-K02 all three claim inversion pairs; manual meaning still required");
    Check(rss<=4LL*1024*1024*1024,"V450-L01 native process 4GiB budget");
}
void LocalLifecycleChecks(const std::filesystem::path& root,const std::string& endpoint) {
    using namespace recording;
    const auto started=VaReviewService::Clock::now();std::string error;
    EvidencePackageStore evidence(root/"lifecycle-evidence",{});VaReviewStore records(root/"lifecycle-records",{});
    Check(evidence.Recover(&error)&&records.Recover(&error),"V450-L01 lifecycle isolated stores ready");
    std::vector<EvidencePayload> payloads;auto manifest=Manifest(8,&payloads);
    for(std::size_t i=0;i<8;++i){
        auto png=QualityPng(64+int(i)*48);const auto hash=EvidenceSha256(png.data(),png.size());
        payloads[i].bytes=png;manifest.assets[i].sha256=hash;manifest.assets[i].size_bytes=png.size();
        auto& frame=manifest.frames[i];frame.width=512;frame.height=288;frame.png_sha256=hash;manifest.references[i+2].sha256=hash;
    }
    std::string package;Check(evidence.Publish(manifest,payloads,&package,&error),"V450-L01 lifecycle eight actual PNG frames");
    const auto waitSignal=[&](const std::string& name,std::chrono::seconds budget){
        const auto deadline=VaReviewService::Clock::now()+budget;
        while(!std::filesystem::exists(root/name)){
            if(std::filesystem::exists(root/"lifecycle-error"))throw std::runtime_error("lifecycle-monitor-failed");
            if(VaReviewService::Clock::now()>=deadline)throw std::runtime_error("lifecycle-monitor-signal-timeout");
            std::this_thread::sleep_for(std::chrono::milliseconds(25));
        }
    };
    for(unsigned trial=1;trial<=2;++trial){
        const auto fds=Fds(),threads=Threads();VaReviewProviderOptions provider;provider.enabled=true;provider.local_endpoint=endpoint;
        VaReviewService::Options options;options.enabled=true;
        VaReviewService service(evidence,records,options,MakeVaReviewProvider(provider));
        Check(service.ready(),"V450-L01 lifecycle worker ready");VaReviewJob job;
        Check(service.Submit(package,"Compare the first and last visible positions of the red square.","ollama","lifecycle",[](const auto&){return true;},&job,&error),"V450-L01 lifecycle submit");
        const auto prefix="lifecycle-"+std::to_string(trial);
        {std::ofstream signal(root/(prefix+"-request"));signal<<"submitted";}
        waitSignal(prefix+"-loaded",std::chrono::seconds(20));
        Check(service.Get(job.id,[](const auto&){return true;},&job,&error)&&job.state=="running","V450-L01 actual loaded model while worker running");
        {std::ofstream signal(root/(prefix+"-action"));signal<<(trial==1?"cancel":"stop");}
        if(trial==1){Check(service.Cancel(job.id,"lifecycle",false,[](const auto&){return true;},&error),"V450-L01 cancel actual loaded model");
            job=Done(service,job.id);Check(job.state=="cancelled","V450-L01 cancel finishes before worker Stop");}
        service.Stop();
        Check(service.Get(job.id,[](const auto&){return true;},&job,&error)&&job.state=="cancelled"&&job.error=="review-cancelled"&&job.review_id.empty(),"V450-L01 lifecycle cancelled without review ID");
        std::vector<std::string> ids;Check(records.List(&ids,&error)&&ids.empty(),"V450-L01 lifecycle no published record");
        Check(Fds()==fds&&Threads()==threads,"V450-L01 actual curl FD and worker thread recovery");
        int status=0;errno=0;Check(::waitpid(-1,&status,WNOHANG)==-1&&errno==ECHILD,"V450-L01 actual curl child reaped");
        {std::ofstream signal(root/(prefix+"-done"));signal<<(trial==1?"cancel":"stop");}
        waitSignal(prefix+"-empty",std::chrono::seconds(6));
        Check(true,"V450-L01 monitor observed model unloaded within five seconds");
        std::cout<<"[lifecycle] trial="<<trial<<" action="<<(trial==1?"cancel":"stop")<<" state="<<job.state<<" records=0 fds="<<fds<<" threads="<<threads<<std::endl;
    }
    Check(VaReviewService::Clock::now()-started<std::chrono::seconds(60),"V450-L01 lifecycle total focused budget sixty seconds");
}
void SeedHttp(const std::filesystem::path& root) {
    using namespace recording;
    std::string error;RecordingRuntimeStorage runtime(root/"recordings");
    Check(runtime.Open(&error),"V450-A01 managed recording root initialized");
    EvidencePackageStore store(root/"recordings/evidence-packages",{});
    Check(store.Recover(&error),"V450-A01 seed recovery");
    std::string json="{\"packages\":[";
    for(const auto* channel:{"1","2"}) {
        std::vector<EvidencePayload> payloads;auto manifest=Manifest(1,&payloads);manifest.channel_id=channel;
        auto png=QualityPng(208);const auto hash=EvidenceSha256(png.data(),png.size());
        payloads[0].bytes=png;manifest.assets[0].sha256=hash;manifest.assets[0].size_bytes=png.size();
        manifest.frames[0].width=512;manifest.frames[0].height=288;manifest.frames[0].png_sha256=hash;
        manifest.references[2].sha256=hash;
        std::string id;Check(store.Publish(manifest,payloads,&id,&error),"V450-A01 seed publish");
        if(channel[0]=='2')json+=',';json+=EvidenceJsonQuote(id);
    }
    std::ofstream(root/"seed.json")<<json+"]}";
    Check(runtime.catalog().Checkpoint(&error),"V450-A01 seed checkpoint");
}
}
int main(int argc,char** argv) {
    try {
        if(argc!=4)throw std::runtime_error("owned fixture root, mode, endpoint required");
        gst_init(nullptr,nullptr);
        if(std::string(argv[2])=="--seed")SeedHttp(argv[1]);
        else if(std::string(argv[2])=="--contract-only")ProviderChecks(argv[1],argv[3]);
        else if(std::string(argv[2])=="--local-lifecycle")LocalLifecycleChecks(argv[1],argv[3]);
        else if(std::string(argv[2])=="--diagnostic-text-uncertain")QualityChecks(argv[1],argv[3],"text-uncertain");
        else if(std::string(argv[2])=="--diagnostic-text-decisive")QualityChecks(argv[1],argv[3],"text-decisive");
        else if(std::string(argv[2])=="--diagnostic-text")QualityChecks(argv[1],argv[3],"text");
        else if(std::string(argv[2])=="--diagnostic-inversion")QualityChecks(argv[1],argv[3],"inversion");
        else if(std::string(argv[2])=="--local")QualityChecks(argv[1],argv[3]);else {
        InputChecks(argv[1]);
        RecordChecks(argv[1]);
        QueueChecks(argv[1]);
        ProviderChecks(argv[1],argv[3]);
        ConnectionChecks(argv[1]);
        }
        std::cout<<"[summary] pass="<<checks<<" fail=0\n";return 0;
    } catch(const std::exception& e) {std::cerr<<"[fail] "<<e.what()<<'\n';return 1;}
}
