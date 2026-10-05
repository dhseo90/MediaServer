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
#include <stdexcept>
#include <sys/stat.h>
#include <sys/resource.h>
#include <sys/wait.h>
#include <unistd.h>
#include <zlib.h>
#include <openssl/evp.h>
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
    bad_record=record;bad_record.adapter_version="gemini-generate-content-v1";
    Check(!recording::ValidateVaReviewRecord(bad_record,&error),"V450-C01 provider provenance mismatch");
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
void ProviderChecks(const std::filesystem::path& root,const std::string& endpoint) {
    using namespace recording;using namespace review_json;
    Check(std::filesystem::create_directory(root/"provider"),"V450-L01 owned protocol fixture parent");
    const auto input=Record(root/"provider").input;
    VaReviewProviderOptions options;options.enabled=true;options.local_endpoint=endpoint;
    unsigned calls=0;int mode=0;std::string error;VaReviewInference out;
    const auto transport=[&](const VaReviewHttpRequest& request,auto,const auto&,std::string* response,std::string*) {
        ++calls;
        if(request.url==endpoint+"/api/tags") {
            *response="{\"models\":[{\"name\":"+EvidenceJsonQuote(mode==1?"missing":options.local_model)+
                ",\"digest\":"+EvidenceJsonQuote(std::string(64,mode==7&&calls==3?'e':'d'))+"}]}";return true;
        }
        Check(request.url==endpoint+"/api/chat","V450-L01 exact local chat path");
        Doc body,user,system,format,metadata;std::vector<std::string> messages,images;
        Check(Parse(request.body,&body)&&Array(body,"messages",&messages)&&messages.size()==2&&Parse(messages[0],&system)&&
            Parse(messages[1],&user)&&Array(user,"images",&images)&&images.size()==2,
            "V450-L01 ordered two-image protocol envelope");
        Check(ingress::StrictJsonBoolField(body,"stream")==false&&body.Find("keep_alive")->raw=="0"&&
            Parse(body.Find("format")->raw,&format),"V450-L01 nonstream schema and model unload");
        std::string content;std::vector<std::string> frames;
        Check(Text(user,"content",&content)&&content.find("Metadata: ")!=std::string::npos&&
            Parse(content.substr(content.find("Metadata: ")+10,content.find('\n')-content.find("Metadata: ")-10),&metadata)&&Array(metadata,"frames",&frames)&&frames.size()==2&&
            content.find("\"ptsNs\":1000000")!=std::string::npos&&content.find(input.question)!=std::string::npos&&
            content.find("camera-1")==std::string::npos&&images[0]!=images[1],"V450-L01 exact frame timing and minimal metadata");
        auto text=mode==3?"{}":std::string(R"({"schema":"media-server.va-review-provider.v1","observations":"Visible evidence supports the claim.","assessment":)")+
            EvidenceJsonQuote(mode==8?"unknown":mode==11||mode==12?"insufficient":"supported")+
            ",\"confidence\":"+(mode==12?"null":"0.5")+",\"frameIndices\":"+(mode==4?"[2]":mode==13?"[]":"[0,1]")+"}";
        if(mode==9)text.insert(text.size()-1,",\"assessment\":\"supported\"");
        if(mode==10)text.insert(text.size()-1,",\"extra\":1");
        *response="{\"model\":"+EvidenceJsonQuote(mode==5?"unexpected":options.local_model)+
            ",\"done\":true,\"done_reason\":"+EvidenceJsonQuote(mode==6?"length":"stop")+
            ",\"message\":{\"role\":\"assistant\",\"content\":"+EvidenceJsonQuote(text)+"}}";
        if(mode==2)*response="{invalid";return true;
    };
    const auto run=[&]{return MakeVaReviewProvider(options,transport)(input,"ollama",VaReviewService::Clock::now()+std::chrono::seconds(5),[]{return false;},&out,&error);};
    Check(run()&&calls==3&&out.model_revision==std::string(64,'d')&&EvidenceIsSha256(out.prompt_sha256),"V450-L01 checked model digest before and after inference");
    for(mode=1;mode<=13;++mode){if(mode==12)continue;calls=0;out.model="unchanged";Check(!run()&&out.model=="unchanged","V450-L01 rejects provider fault "+std::to_string(mode));}
    mode=12;calls=0;Check(run()&&out.output.supports.empty()&&out.output.contradictions.empty()&&out.output.unclear.size()==1&&!out.output.confidence,
        "V450-L01 insufficient assessment maps to uncertainty without inventing confidence");
    mode=0;calls=0;options.enabled=false;Check(!run()&&calls==0,"V450-L01 off never sends");options.enabled=true;
    for(const auto* bad:{"http://localhost:1","http://127.0.0.1:0","http://127.0.0.1:65536","https://example.com","http://127.0.0.1:1/path"}) {
        options.local_endpoint=bad;Check(!run()&&calls==0,"V450-L01 forbidden endpoint rejected before transport");
    }
    options.local_endpoint=endpoint;
    Check(!MakeVaReviewProvider(options,transport)(input,"ollama",VaReviewService::Clock::now()+std::chrono::seconds(5),[]{return true;},&out,&error)&&calls==0,
        "V450-L01 cancelled before first transmission");
    auto invalid=input;invalid.pngs[0][0]=0;
    Check(!MakeVaReviewProvider(options,transport)(invalid,"ollama",VaReviewService::Clock::now()+std::chrono::seconds(5),[]{return false;},&out,&error)&&calls==0,
        "V450-L01 mutated image rejected before transmission");
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
void ExternalChecks(const std::filesystem::path& root) {
    using namespace recording;using namespace review_json;
    Check(std::filesystem::create_directory(root/"external"),"V450-P01 isolated protocol fixture");
    const auto input=Record(root/"external").input;
    VaReviewProviderOptions options;options.enabled=true;
    options.external_enabled=true;options.external_transfer_approved=true;
    options.gemini_model="gemini-fixture-model";options.gemini_api_key="synthetic-key-not-a-credential";
    unsigned calls=0;int mode=0;VaReviewInference out;std::string error;
    const auto transport=[&](const VaReviewHttpRequest& request,auto,const auto&,std::string* response,std::string* failure){
        ++calls;
        Check(request.url=="https://generativelanguage.googleapis.com/v1beta/models/gemini-fixture-model:generateContent"&&
            request.headers==std::vector<std::string>{"x-goog-api-key: synthetic-key-not-a-credential"},"V450-P01 fixed HTTPS endpoint and memory-only credential header");
        Check(request.body.find(options.gemini_api_key)==std::string::npos&&request.body.find("camera-1")==std::string::npos,
            "V450-P01 body excludes credential and channel identity");
        Doc body,content,part,image,metadata,config;std::vector<std::string> contents,parts;
        Check(Parse(request.body,&body)&&Array(body,"contents",&contents)&&contents.size()==1&&Parse(contents[0],&content)&&
            Array(content,"parts",&parts)&&parts.size()==6,"V450-P01 interleaved frame metadata and images");
        Check(Parse(parts[0],&part)&&part.Find("text")&&Parse(part.Find("text")->string_value.substr(10),&metadata)&&
            ingress::StrictJsonStringField(metadata,"claim")==input.question,"V450-P01 question is data");
        for(std::size_t i=0;i<2;++i){
            Check(Parse(parts[1+i*2],&part)&&ingress::StrictJsonStringField(part,"text")=="Frame "+std::to_string(i),"V450-P01 ordered index");
            Check(Parse(parts[2+i*2],&part)&&Parse(part.Find("inlineData")->raw,&image)&&
                ingress::StrictJsonStringField(image,"mimeType")=="image/png","V450-P01 inline PNG only");
            const auto encoded=*ingress::StrictJsonStringField(image,"data");std::vector<unsigned char> decoded(encoded.size());
            const auto n=EVP_DecodeBlock(decoded.data(),reinterpret_cast<const unsigned char*>(encoded.data()),int(encoded.size()));
            Check(n>=0,"V450-P01 independent base64 decoder");std::size_t padding=0;
            for(std::size_t at=encoded.size();at&&encoded[at-1]=='=';--at)++padding;
            decoded.resize(std::size_t(n)-padding);Check(decoded==input.pngs[i],"V450-P01 exact original PNG bytes");
        }
        Check(Parse(body.Find("generationConfig")->raw,&config)&&config.Find("maxOutputTokens")->raw=="1024"&&
            ingress::StrictJsonStringField(config,"responseMimeType")=="application/json"&&config.Find("responseJsonSchema"),"V450-P01 schema and bounded generation");
        if(mode>=10){*failure=mode==10?"review-provider-auth":mode==11?"review-provider-rate-limit":mode==12?"review-timeout":"review-response-too-large";return false;}
        const auto output=std::string(R"({"schema":"media-server.va-review-provider.v1","observations":"Synthetic red square visible.","assessment":"supported","frameIndices":)")+
            (mode==6?"[9]":"[0,1]")+",\"confidence\":0.8}";
        *response="{\"modelVersion\":\"fixture-revision\",\"candidates\":[{\"finishReason\":"+EvidenceJsonQuote(mode==1?"MAX_TOKENS":"STOP")+
            ",\"content\":{\"role\":\"model\",\"parts\":[{\"text\":"+EvidenceJsonQuote(output)+"}]}}]}";
        if(mode==2)*response="{\"modelVersion\":\"fixture-revision\",\"candidates\":[]}";
        if(mode==3)response->insert(response->size()-1,",\"promptFeedback\":{\"blockReason\":\"SAFETY\"}");
        if(mode==4)response->insert(response->size()-1,",\"modelVersion\":\"duplicate\"");
        if(mode==5)*response="{}";
        if(mode==7)*response=std::string(65537,'x');
        return true;
    };
    const auto run=[&]{return MakeVaReviewProvider(options,transport)(input,"gemini",VaReviewService::Clock::now()+std::chrono::seconds(5),[]{return false;},&out,&error);};
    Check(run()&&calls==1&&out.provider=="gemini"&&out.model==options.gemini_model&&out.model_revision=="fixture-revision"&&
        out.adapter_version=="gemini-generate-content-v1"&&EvidenceIsSha256(out.prompt_sha256),"V450-P01 normalized external result and provenance");
    for(mode=1;mode<=13;++mode){if(mode==8||mode==9)continue;calls=0;out.model="unchanged";
        Check(!run()&&calls==1&&out.model=="unchanged","V450-P01 error has no fallback or result mutation "+std::to_string(mode));}
    mode=0;const auto valid=options;
    for(unsigned guard=0;guard<7;++guard){options=valid;calls=0;
        if(guard==0)options.enabled=false;if(guard==1)options.external_enabled=false;if(guard==2)options.external_transfer_approved=false;
        if(guard==3)options.gemini_model.clear();if(guard==4)options.gemini_api_key.clear();
        if(guard==5)options.gemini_api_key="key\nHost: invalid";if(guard==6)options.gemini_model="../invalid";
        Check(!run()&&calls==0&&!VaReviewExternalReady(options),"V450-P01 every opt-in guard before transmission "+std::to_string(guard));
    }
    options=valid;calls=0;
    Check(!MakeVaReviewProvider(options,transport)(input,"gemini",VaReviewService::Clock::now()+std::chrono::seconds(5),[]{return true;},&out,&error)&&calls==0,
        "V450-P01 cancellation before external transmission");
    const std::string url="https://generativelanguage.googleapis.com/v1beta/models/gemini-fixture-model:generateContent";
    std::string response="unchanged";
    Check(!VaReviewCurl({url,"{}",{"x-goog-api-key: synthetic-key"}},VaReviewService::Clock::now()+std::chrono::seconds(1),[]{return true;},&response,&error)&&error=="review-cancelled",
        "V450-P01 allowed target still respects cancel without network");
    for(const auto& bad:std::vector<std::string>{"http://generativelanguage.googleapis.com/v1beta/models/x:generateContent",
        "https://generativelanguage.googleapis.com.evil.invalid/v1beta/models/x:generateContent",
        "https://generativelanguage.googleapis.com@evil.invalid/v1beta/models/x:generateContent",url+"?key=bad",
        "https://generativelanguage.googleapis.com/v1beta/models/../x:generateContent","https://127.0.0.1/v1beta/models/x:generateContent"})
        Check(!VaReviewCurl({bad,"{}",{"x-goog-api-key: synthetic-key"}},VaReviewService::Clock::now()+std::chrono::seconds(1),[]{return true;},&response,&error)&&error=="review-invalid-input",
            "V450-P01 destination escape rejected before network");
    for(const auto& headers:std::vector<std::vector<std::string>>{{},{"Host: evil.invalid"},{"x-goog-api-key: key\r\nHost: evil.invalid"},
        {"x-goog-api-key: synthetic-key","Host: evil.invalid"}})
        Check(!VaReviewCurl({url,"{}",headers},VaReviewService::Clock::now()+std::chrono::seconds(1),[]{return true;},&response,&error)&&error=="review-invalid-input",
            "V450-P01 header override rejected before network");
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
void QualityChecks(const std::filesystem::path& root,const std::string& endpoint) {
    using namespace recording;
    EvidencePackageStore evidence(root/"quality-evidence",{});VaReviewStore records(root/"quality-records",{});
    std::string error;Check(evidence.Recover(&error),"V450-L01 quality evidence ready");
    VaReviewProviderOptions provider;provider.enabled=true;provider.local_endpoint=endpoint;
    VaReviewService::Options options;options.enabled=true;
    const auto observed=[](const VaReviewHttpRequest& request,auto deadline,const auto& cancelled,std::string* response,std::string* error) {
        const bool ok=VaReviewCurl(request,deadline,cancelled,response,error);
        if(ok&&request.url.find("/api/chat")!=std::string::npos) {
            using namespace review_json;Doc d,m,c;std::string model,reason,role,content;
            const bool parsed=Parse(*response,&d);if(parsed){Text(d,"model",&model);Text(d,"done_reason",&reason);
                const auto message=ingress::StrictJsonObjectField(d,"message");if(message&&Parse(*message,&m)){Text(m,"role",&role);Text(m,"content",&content);}}
            VaReviewOutput result;const bool valid=ParseVaReviewOutput(content,8,&result,nullptr);
            std::cout<<"[provider-shape] json="<<parsed<<" done="<<(ingress::StrictJsonBoolField(d,"done")==true)
                <<" model="<<EvidenceJsonQuote(model)<<" reason="<<EvidenceJsonQuote(reason)<<" role="<<EvidenceJsonQuote(role)
                <<" contentBytes="<<content.size()<<" outputValidAt8="<<valid<<" fields=";
            if(Parse(content,&c)) {
                for(const auto& field:c.members)std::cout<<EvidenceJsonQuote(field.key)<<',';
                for(const char* key:{"supports","questions","contradictions","unclear"}) {
                    std::vector<std::string> items;std::cout<<' '<<key<<"Count="<<(Array(c,key,&items)?int(items.size()):-1);
                }
                const auto* confidence=c.Find("confidence");
                if(confidence&&(confidence->type==Type::Null||confidence->type==Type::Number))std::cout<<" confidence="<<confidence->raw;
            }
            std::cout<<std::endl;
            if(valid)std::cout<<"[synthetic-output] "<<SerializeVaReviewOutput(result)<<std::endl;
        }
        return ok;
    };
    VaReviewService service(evidence,records,options,MakeVaReviewProvider(provider,observed));
    Check(service.ready(),"V450-L01 quality worker ready");unsigned semantic=0,uncertain=0,schemas=0;
    for(const auto& test:VaQualityCases()) {
        std::vector<EvidencePayload> payloads;auto manifest=Manifest(test.x.size(),&payloads);
        for(std::size_t i=0;i<test.x.size();++i) {
            auto png=QualityPng(test.x[i]);const auto sha=EvidenceSha256(png.data(),png.size());
            payloads[i].bytes=png;auto& f=manifest.frames[i];f.width=512;f.height=288;f.png_sha256=sha;
            f.pts_ns=std::int64_t(i)*1000000000;f.presentation_ns=f.pts_ns;
            manifest.assets[i].sha256=sha;manifest.assets[i].size_bytes=png.size();
            auto& ref=manifest.references[i+2];ref.id=f.segment_id+":"+std::to_string(f.pts_ns);ref.sha256=sha;
        }
        std::string id;Check(evidence.Publish(manifest,payloads,&id,&error),std::string("V450-L01 fixture ")+test.id);
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
        if(correct)++semantic;if(expected=="unclear"&&unknown)++uncertain;
        std::cout<<"[quality] {\"case\":"<<EvidenceJsonQuote(test.id)<<",\"expected\":"<<EvidenceJsonQuote(expected)
            <<",\"schemaValid\":"<<(valid?"true":"false")<<",\"categoryPass\":"<<(correct?"true":"false")
            <<",\"elapsedMs\":"<<std::chrono::duration_cast<std::chrono::milliseconds>(VaReviewService::Clock::now()-start).count()
            <<",\"error\":"<<EvidenceJsonQuote(job.error)<<",\"modelDigest\":"<<EvidenceJsonQuote(record.model_revision)
            <<",\"output\":"<<(valid?SerializeVaReviewOutput(record.output):"null")<<"}"<<std::endl;
        // schema/실행 실패는 선행 조건 실패다. 다음 사례를 실행하지 않는다.
        Check(valid,std::string("V450-L01 real model schema ")+test.id+" "+job.error);
    }
    service.Stop();
    std::cout<<"[quality-summary] schema="<<schemas<<"/12 category="<<semantic<<"/12 uncertainty="<<uncertain<<"/4 semanticTextReviewRequired=true"<<std::endl;
    rusage usage{};Check(::getrusage(RUSAGE_SELF,&usage)==0,"V450-L01 peak RSS observation");
#ifdef __APPLE__
    const auto rss=usage.ru_maxrss;
#else
    const auto rss=usage.ru_maxrss*1024;
#endif
    std::cout<<"[resource] nativePeakRssBytes="<<rss<<std::endl;
    Check(schemas==12&&semantic>=10&&uncertain==4,"V450-L01 predefined quality gates");
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
        else if(std::string(argv[2])=="--local-lifecycle")LocalLifecycleChecks(argv[1],argv[3]);
        else if(std::string(argv[2])=="--local")QualityChecks(argv[1],argv[3]);else {
        InputChecks(argv[1]);
        RecordChecks(argv[1]);
        QueueChecks(argv[1]);
        ProviderChecks(argv[1],argv[3]);
        ExternalChecks(argv[1]);
        }
        std::cout<<"[summary] pass="<<checks<<" fail=0\n";return 0;
    } catch(const std::exception& e) {std::cerr<<"[fail] "<<e.what()<<'\n';return 1;}
}
