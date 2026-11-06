// 파일 용도: 실제 writer/model/worker를 통과한 정제 API·권한·현재 seek의 단기 검사.
#include "recording_media_test_fixture.h"
#include "recording_writer_test_isolation.h"
#include "recording/recording_runtime_composition.h"
#include "ingress/visual_search_application_service.h"
#include "domain/strict_json.h"
#include <iostream>
#include <future>
#include <fstream>
#include <set>
#include <thread>
#include <sys/resource.h>
#ifdef RECORDING_SEARCH_TESTING
#include "ingress/recording_application_service.h"
#include "recording/recording_resource_trace.h"
#define RECORDING_METRICS_NO_MAIN
#include "recording_process_metrics.cpp"
namespace recording {struct RecordingSearchRetryTestProbe {
    static std::unique_lock<std::mutex> CatalogLock(RecordingCatalog& c){return std::unique_lock<std::mutex>(c.mu_);}
};}
namespace ingress {
extern std::atomic<void(*)()> visual_image_prepare_test_hook,visual_image_ready_test_hook;
struct VisualSearchPublicationTestProbe {
    static void Rebuild(VisualSearchApplicationService& s){s.worker_->RequestRebuild();}
    static std::uint64_t Generation(VisualSearchApplicationService& s){return s.worker_->Status().generation;}
    static std::unique_lock<std::timed_mutex> LockInference(VisualSearchApplicationService& s){return std::unique_lock<std::timed_mutex>(s.inference_);}
    static bool Stopping(VisualSearchApplicationService& s){return s.stopped_.load();}
    static bool InferenceAvailable(VisualSearchApplicationService& s){if(!s.inference_.try_lock())return false;s.inference_.unlock();return true;}
};
}
#endif
namespace {
int checks=0;void Check(bool v,const std::string& name){++checks;if(!v)throw std::runtime_error(name);}
// 짧은 질의 전용 분기도 기존 프로세스 RSS 상한을 확인한다.
std::uint64_t PeakRss(){
    struct rusage usage{};Check(getrusage(RUSAGE_SELF,&usage)==0,"RSS observation");
    std::uint64_t bytes=usage.ru_maxrss;
#ifndef __APPLE__
    bytes*=1024;
#endif
    Check(bytes<=4ULL*1024*1024*1024,"model plus product RSS");return bytes;
}
using Service=ingress::VisualSearchApplicationService;
void Json(const std::string& body){ingress::StrictJsonObjectDocument doc;std::string error;Check(ingress::ParseStrictJsonObjectDocument(body,&doc,&error),"valid public JSON");}
void Ready(Service& service,const Service::Authorize& authorize,unsigned seconds=15){
    const auto end=std::chrono::steady_clock::now()+std::chrono::seconds(seconds);
    while(std::chrono::steady_clock::now()<end){const auto status=service.Status(authorize);if(status.status==200&&status.body.find("\"state\":\"ready\"")!=std::string::npos)return;std::this_thread::sleep_for(std::chrono::milliseconds(20));}
    throw std::runtime_error("index ready deadline: "+service.Status(authorize).body);
}
#ifdef RECORDING_SEARCH_TESTING
using Clock=std::chrono::steady_clock;
struct PrepareGate {
    std::mutex mutex;std::condition_variable cv;bool entered=false,released=false;
    void Wait(){std::unique_lock<std::mutex> lock(mutex);if(entered)return;entered=true;cv.notify_all();
        if(!cv.wait_for(lock,std::chrono::seconds(6),[&]{return released;}))throw std::runtime_error("native preparation rendezvous expired");}
    void Release(){std::lock_guard<std::mutex> lock(mutex);released=true;cv.notify_all();}
    ~PrepareGate(){Release();}
};
PrepareGate* prepare_gate=nullptr; // installed before RequestRebuild; removed only after completion/Stop.
void PausePreparation(){prepare_gate->Wait();}
void FailPreparedAllocation(){throw std::bad_alloc();}
void StopBoundaries(recording::RecordingRuntimeStorage& runtime,recording::RecordingReadService& reader,
    Service::Options options,const Service::Channels& channels,const Service::Authorize& authorize,const Encoded& input){
    options.scan_seconds=3600;
    for(unsigned stage=0;stage<4;++stage){
        Service service(runtime.catalog(),reader,options,channels);Ready(service,authorize);
        const auto generation=ingress::VisualSearchPublicationTestProbe::Generation(service);
        std::string error;recording::GStreamerSegmentWriter writer(runtime.WriterOptions(1000));
        Check(writer.Start("hidden","unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"EP1 stop fixture writer");
        for(const auto& packet:input.packets)writer.Push(packet,0);writer.Stop();
        PrepareGate gate;prepare_gate=&gate;
        auto& hook=stage==0?ingress::visual_image_prepare_test_hook:ingress::visual_image_ready_test_hook;
        struct Cleanup {PrepareGate& gate;Service& service;~Cleanup(){gate.Release();service.Stop();ingress::visual_image_prepare_test_hook=nullptr;ingress::visual_image_ready_test_hook=nullptr;}} cleanup{gate,service};
        if(stage==3){
            hook=FailPreparedAllocation;ingress::VisualSearchPublicationTestProbe::Rebuild(service);
            const auto deadline=Clock::now()+std::chrono::seconds(5);bool failed=false;
            while(Clock::now()<deadline){if(service.Status(authorize).body.find("\"state\":\"degraded\"")!=std::string::npos){failed=true;break;}std::this_thread::sleep_for(std::chrono::milliseconds(5));}
            Check(failed&&ingress::VisualSearchPublicationTestProbe::Generation(service)==generation,"EP1 bad_alloc discards RGB and preserves published generation");
            hook=nullptr;ingress::VisualSearchPublicationTestProbe::Rebuild(service);Ready(service,authorize);
            Check(ingress::VisualSearchPublicationTestProbe::Generation(service)>generation,"EP1 normal rebuild succeeds after handoff exception");
            continue;
        }
        hook=PausePreparation;ingress::VisualSearchPublicationTestProbe::Rebuild(service);
        {std::unique_lock<std::mutex> lock(gate.mutex);Check(gate.cv.wait_for(lock,std::chrono::seconds(5),[&]{return gate.entered;}),"EP1 reached stop boundary");}
        std::unique_lock<std::timed_mutex> held;
        if(stage==2)held=ingress::VisualSearchPublicationTestProbe::LockInference(service);
        auto stopping=std::async(std::launch::async,[&]{service.Stop();});
        const auto deadline=Clock::now()+std::chrono::seconds(5);
        while(!ingress::VisualSearchPublicationTestProbe::Stopping(service)&&Clock::now()<deadline)std::this_thread::yield();
        gate.Release();
        Check(stopping.wait_for(std::chrono::seconds(5))==std::future_status::ready,"EP1 Stop joins with inference held by other caller");stopping.get();
        Check(ingress::VisualSearchPublicationTestProbe::Generation(service)==generation,"EP1 Stop never publishes prepared result");
        if(held.owns_lock())held.unlock();
        hook=nullptr;
    }
    Check(runtime.Finish(nullptr),"EP1 stopped runtime Finish");
    Check(runtime.catalog().ScratchResidency()->usage().disk_bytes==0&&runtime.catalog().ScratchResidency()->usage().file_descriptors==0,"EP1 stopped handoffs return Scratch and FD");
    std::cout<<"PASS EP1 stop boundaries checks="<<checks<<std::endl;
}
void InferenceScope(recording::RecordingRuntimeStorage& runtime,recording::RecordingReadService& reader,
    Service::Options options,const Service::Channels& channels,const Service::Authorize& authorize,
    const Service::Query& query,const Encoded& input,const std::filesystem::path& root,recording::RecordingResourceTrace& trace){
    options.scan_seconds=3600;
    const auto memory=runtime.catalog().SearchResidency();const auto scratch=runtime.catalog().ScratchResidency();
    Check(trace.Bind(memory,scratch),"scope trace binding");
    const auto observe=[&](const char* phase){
        const auto p=recording_metrics::Collect(getpid());std::uint64_t named=0;
        bool storage_complete=true;
        for(const auto& entry:std::filesystem::recursive_directory_iterator(root)){
            std::error_code ec;const auto regular=entry.is_regular_file(ec);
            if(ec){if(ec==std::errc::no_such_file_or_directory){storage_complete=false;continue;}throw std::system_error(ec);}
            if(regular){const auto size=entry.file_size(ec);if(ec){if(ec==std::errc::no_such_file_or_directory){storage_complete=false;continue;}throw std::system_error(ec);}named+=size;}
        }
        std::cout<<"[scope-resource] {\"phase\":\""<<phase<<"\",\"rss\":"<<p.rss<<",\"fd\":"<<p.fds
            <<",\"anonymous\":"<<p.anonymousAllocated<<",\"named\":"<<named<<",\"variable\":"<<named+p.anonymousAllocated<<",\"storageComplete\":"<<(storage_complete?"true":"false")<<"}"<<std::endl;
        Check(p.anonymousMeasured,"anonymous measurement present");
        if(storage_complete)Check(named+p.anonymousAllocated<448ULL*1024*1024,"complete sampled variable remains under unchanged 448MiB");
        Check(trace.Emit(phase),"scope resource sample");
    };
    const auto started=Clock::now();
    {
        Service service(runtime.catalog(),reader,options,channels);Ready(service,authorize);
        std::cout<<"[scope-initial-ready-ms] "<<std::chrono::duration<double,std::milli>(Clock::now()-started).count()<<std::endl;
        observe("ready");
        ingress::RecordingApplicationService structured(reader,runtime.catalog(),true,{});
        const Service::Query sq{{"channelIds","visible"},{"startTimeMs","1789199999000"},{"endTimeMs","1789201000000"},{"includeUnplaced","true"},{"limit","20"}};
        const auto write=[&](){const auto begin=Clock::now();std::string error;
            recording::GStreamerSegmentWriter writer(runtime.WriterOptions(1000));
            if(!writer.Start("hidden","unused",input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error("scope writer start:"+error);
            for(const auto& p:input.packets)writer.Push(p,0);writer.Stop();
            return std::chrono::duration<double,std::milli>(Clock::now()-begin).count();};
        for(unsigned round=0;round<5;++round){
            // 0·1은 scope 경계를 분리하고 2·3에는 지연을 주입하지 않는다.
            // 4는 Catalog를 보유하여 역순 획득 없이 완료되는지 확인한다.
            PrepareGate gate;prepare_gate=&gate;
            struct Release {PrepareGate& gate;Service& service;bool completed=false;~Release(){gate.Release();if(!completed)service.Stop();ingress::visual_image_prepare_test_hook=nullptr;}} release{gate,service};
            const auto generation=ingress::VisualSearchPublicationTestProbe::Generation(service);
            const double writer_ms=write();
            const bool controlled=round<2||round==4;
            if(!controlled)gate.Release();
            ingress::visual_image_prepare_test_hook=PausePreparation;
            ingress::VisualSearchPublicationTestProbe::Rebuild(service);
            {std::unique_lock<std::mutex> lock(gate.mutex);
                Check(gate.cv.wait_for(lock,std::chrono::seconds(5),[&]{return gate.entered;}),"background reached preparation rendezvous");
                if(controlled){
#ifdef VISUAL_INFERENCE_SCOPE_BASELINE
                Check(!ingress::VisualSearchPublicationTestProbe::InferenceAvailable(service),"baseline owns inference during media preparation");
#else
                Check(ingress::VisualSearchPublicationTestProbe::InferenceAvailable(service),"candidate media preparation does not own inference");
#endif
                }
            }
            std::unique_lock<std::mutex> catalog_lock;
            if(round==4){catalog_lock=recording::RecordingSearchRetryTestProbe::CatalogLock(runtime.catalog());gate.Release();}
            const auto batch=Clock::now();
            const auto visual=[&](){const auto at=Clock::now();const auto result=service.Search(query,authorize);
                if(result.status!=200)throw std::runtime_error("scope visual:"+result.body);
                return std::chrono::duration<double,std::milli>(Clock::now()-at).count();};
            auto a=std::async(std::launch::async,visual),b=std::async(std::launch::async,visual);
            auto s=std::async(std::launch::async,[&](){const auto at=Clock::now();const auto result=structured.Search(sq,"scope","visible",authorize);
                if(result.status!=200)throw std::runtime_error("scope structured:"+result.body);
                return std::chrono::duration<double,std::milli>(Clock::now()-at).count();});
            auto w=std::async(std::launch::async,write);
            if(controlled){std::unique_lock<std::mutex> lock(gate.mutex);gate.cv.wait_until(lock,batch+std::chrono::milliseconds(300),[]{return false;});lock.unlock();gate.Release();if(catalog_lock.owns_lock())catalog_lock.unlock();}
            const auto ams=a.get(),bms=b.get(),sms=s.get(),concurrent_writer_ms=w.get();
            const double request_batch_ms=std::chrono::duration<double,std::milli>(Clock::now()-batch).count();
            const auto end=Clock::now()+std::chrono::seconds(15);
            while(ingress::VisualSearchPublicationTestProbe::Generation(service)==generation&&Clock::now()<end){observe("indexing");std::this_thread::sleep_for(std::chrono::milliseconds(20));}
            Check(ingress::VisualSearchPublicationTestProbe::Generation(service)>generation,"background index publication completed");
            ingress::visual_image_prepare_test_hook=nullptr;
            std::cout<<"[scope-round] {\"round\":"<<round<<",\"controlled\":"<<(controlled?"true":"false")<<",\"catalogHeld\":"<<(round==4?"true":"false")<<",\"visualMs\":["<<ams<<","<<bms
                <<"],\"structuredMs\":"<<sms<<",\"writerMs\":"<<writer_ms<<",\"concurrentWriterMs\":"<<concurrent_writer_ms<<",\"requestBatchMs\":"<<request_batch_ms<<",\"readyMs\":"<<std::chrono::duration<double,std::milli>(Clock::now()-batch).count()<<"}"<<std::endl;
            observe("published");
            // background callback이 반환한 뒤에만 비상 Stop을 해제한다.
            release.completed=true;
        }
        service.Stop();Check(service.Search(query,authorize).status==503,"scope stopped service rejects request");
    }
    Check(runtime.Finish(nullptr),"scope storage Finish");
    Check(scratch->usage().disk_bytes==0&&scratch->usage().file_descriptors==0&&scratch->ReaderCleanupHealthy(),"scope Finish returns Scratch/FD");
    // 여기서는 Catalog가 제한된 metadata를 계속 소유한다. 기존 trace는 main에서 runtime보다
    // 먼저 소유하며 마지막 record가 소멸 뒤 RAM을 검증한다.
    Check(trace.Emit("finished-live-catalog"),"scope final resource trace");
    struct rusage cpu{};Check(getrusage(RUSAGE_SELF,&cpu)==0,"scope CPU observation");
    std::cout<<"[scope-cpu-ms] "<<(cpu.ru_utime.tv_sec+cpu.ru_stime.tv_sec)*1000.0+(cpu.ru_utime.tv_usec+cpu.ru_stime.tv_usec)/1000.0<<std::endl;
    std::cout<<"PASS visual inference scope checks="<<checks<<" peakRssBytes="<<PeakRss()<<std::endl;
}
#endif
}
int main(int argc,char** argv){try{
    if(argc!=3&&!(argc==4&&(std::string(argv[3])=="--query-only"||std::string(argv[3])=="--scope-only"||std::string(argv[3])=="--inference-scope"||std::string(argv[3])=="--ep1-lifetime")))return 2;
#ifndef RECORDING_SEARCH_TESTING
    if(argc==4&&(std::string(argv[3])=="--inference-scope"||std::string(argv[3])=="--ep1-lifetime"))return 2;
#endif
    const auto root=std::filesystem::path(argv[1]);if(!RecordingWriterTestIsolation(root))return 2;
    gst_init(nullptr,nullptr);
#ifdef RECORDING_SEARCH_TESTING
    recording::RecordingResourceTrace final_trace("1");
#endif
    recording::RecordingRuntimeStorage runtime(root/"store");std::string error;Check(runtime.Open(&error),"storage open");
    const bool scope_only=argc==4&&std::string(argv[3])=="--scope-only";
    auto input=Encode(90,false,false,160,90,30,30);Shift(input,7000000000ULL);
    // 이 분기에서만 clock 근거를 명시적으로 제거한다. 기존 fixture는 UTC를 제공한다.
    if(scope_only)for(auto& packet:input.packets)packet.observation->clock_process_id.clear();
    for(const auto& channel:{"visible","hidden"}){
        recording::GStreamerSegmentWriter writer(runtime.WriterOptions(1000));
        Check(writer.Start(channel,"unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"writer start");
        for(const auto& p:input.packets)writer.Push(p,0);
        writer.Stop();
    }
    recording::RecordingReadService reader(runtime.catalog());
    const Service::Authorize authorized=[](const auto& channel){return channel=="visible";};
    std::atomic<bool> visible{true};const Service::Channels channels=[&](auto* out){*out={"hidden"};if(visible)out->push_back("visible");return true;};
    Service::Options options;Service disabled(runtime.catalog(),reader,options,channels);
    const Service::Query q{{"channelIds","visible"},{"text","red scene"},{"limit","3"}};
    Check(disabled.Status(authorized).body.find("\"enabled\":false")!=std::string::npos,"disabled status");
    Check(disabled.Search(q,authorized).status==503,"disabled search");
    options.enabled=true;options.model_directory=argv[2];options.cache_directory=(root/"visual-cache").string();options.scan_seconds=1;options.sample_seconds=1;
#ifdef RECORDING_SEARCH_TESTING
    if(argc==4&&std::string(argv[3])=="--ep1-lifetime"){
        Check(final_trace.Bind(runtime.catalog().SearchResidency(),runtime.catalog().ScratchResidency()),"EP1 lifetime resource trace");
        StopBoundaries(runtime,reader,options,channels,authorized,input);return 0;}
    if(argc==4&&std::string(argv[3])=="--inference-scope"){InferenceScope(runtime,reader,options,channels,authorized,q,input,root,final_trace);return 0;}
#endif
    {Service service(runtime.catalog(),reader,options,channels);Ready(service,authorized);
    auto status=service.Status(authorized);Json(status.body);Check(status.body.find("hidden")==std::string::npos,"status contains authorized channel only");
    std::cout<<"[actual-index] "<<status.body<<'\n';
    Check(status.body.find("\"indexedFrames\":3")!=std::string::npos,"three representative frames");
    if(scope_only)Check(status.body.find("\"unknownTimeFrames\":3")!=std::string::npos&&status.body.find("\"firstSampleTimeNs\":null")!=std::string::npos,"UTC missing remains unknown");
    const auto restricted=service.Status([](const auto&){return false;});
    Check(restricted.body.find("\"index\":null")!=std::string::npos&&restricted.body.find("\"refresh\":null")!=std::string::npos&&restricted.body.find("hidden")==std::string::npos,"no authorized channels: no publication or worker statistics");
    auto denied=q;denied["channelIds"]="visible,hidden";Check(service.Search(denied,authorized).status==403,"mixed forbidden before inference");
    Check(service.Search(q,[](const auto&){return false;}).status==403,"denied principal");
    auto invalid=q;invalid["threshold"]="nan";Check(service.Search(invalid,authorized).status==400,"nonfinite threshold");
    invalid=q;invalid["limit"]="201";Check(service.Search(invalid,authorized).status==400,"limit boundary");
    invalid=q;invalid["startTimeMs"]="1";Check(service.Search(invalid,authorized).status==400,"partial time range");
    invalid=q;invalid["channelIds"]="visible,visible";Check(service.Search(invalid,authorized).status==400,"duplicate channel");
    invalid=q;invalid["text"]=std::string(16385,'x');Check(service.Search(invalid,authorized).status==400,"raw text boundary");
    invalid=q;invalid["text"]="　 \t";Ready(service,authorized);Check(service.Search(invalid,authorized).status==400,"unicode blank text");
    std::vector<recording::VisualSearchDocument> docs;std::map<std::string,recording::VisualSourceCoverage> coverage;
    recording::RecordingVisualSource source(runtime.catalog(),reader);Check(source.Collect({"visible"},1,&docs,&coverage,&error)&&docs.size()==3,"independent expected original references");
    for(const auto& text:{"red scene","붉은 장면"}){
        auto query=q;query["text"]=text;Ready(service,authorized);const auto result=service.Search(query,authorized);
        Check(result.status==200,"real text search: "+result.body);Json(result.body);
        Check(result.body.find("\"index\":{")!=std::string::npos&&result.body.find("\"generation\":")!=std::string::npos&&(!scope_only||result.body.find("\"unknownTimeFrames\":3")!=std::string::npos)&&result.body.find("\"coverage\":\"unknown\"")!=std::string::npos,"search publication and honest sample statistics");
        Check(result.body.find("similarity-not-evidence")!=std::string::npos,"score meaning");
        for(const auto& doc:docs)Check(result.body.find(doc.id)!=std::string::npos,"all allowed current references");
        for(const auto& secret:{"hidden","sha256","embedding","model_directory","sourceUrl"})Check(result.body.find(secret)==std::string::npos,"sanitized response");
        Check(result.body.find(root.string())==std::string::npos,"no local path");
    }
    if(argc==4){
        // 평가 빌드는 검색 함수의 세 호출점에만 counter를 삽입한다. 제품 실행에는 삽입하지 않는다.
#ifdef VISUAL_QUERY_PROBE
        extern thread_local unsigned query_encode_calls,query_snapshot_calls,query_search_calls;
        const auto reset=[](){query_encode_calls=query_snapshot_calls=query_search_calls=0;};
#endif
        std::string over;for(unsigned i=0;i<64;++i){if(i)over+=" ";over+="red";}
        for(const auto& entry:std::vector<std::pair<std::string,std::string>>{{over,"visual-text-token-limit"},{"","visual-text-empty"},{"　 \t","visual-text-empty"},{"\xff","visual-text-invalid-utf8"}}){
#ifdef VISUAL_QUERY_PROBE
            reset();
#endif
            auto invalid=q;invalid["text"]=entry.first;const auto result=service.Search(invalid,authorized);
            Check(result.status==400&&result.body.find(entry.second)!=std::string::npos,"distinct text input error");
#ifdef VISUAL_QUERY_PROBE
            Check(query_encode_calls==0&&query_snapshot_calls==0&&query_search_calls==0,"rejected input: no encode/snapshot/search calls");
#endif
        }
        for(unsigned n:{62U,63U}){
            auto boundary=q;boundary["text"]="";for(unsigned i=0;i<n;++i){if(i)boundary["text"]+=" ";boundary["text"]+="red";}
#ifdef VISUAL_QUERY_PROBE
            reset();
#endif
            const auto r=service.Search(boundary,authorized);Check(r.status==200,"accepted token boundary");
            Check(r.body.find("\"bodyTokens\":"+std::to_string(n))!=std::string::npos,"server reports exact tokens");
#ifdef VISUAL_QUERY_PROBE
            Check(query_encode_calls==1&&query_snapshot_calls==1&&query_search_calls==1,"accepted input exercises counter control");
#endif
        }
        auto defaults=q;defaults.erase("limit");defaults["text"]="RED scene";
        const auto applied=service.Search(defaults,authorized);Check(applied.status==200,"uppercase/default search");
        for(const auto* fragment:{"\"text\":\"RED scene\"","\"encoderText\":\"red scene\"","\"limit\":20","\"threshold\":-1","\"startTimeMs\":null","\"channelIds\":[\"visible\"]"})
            Check(applied.body.find(fragment)!=std::string::npos,"effective query fields");
        if(!scope_only){service.Stop();const auto peak=PeakRss();std::cout<<"PASS visual query-only checks="<<checks<<" peakRssBytes="<<peak<<"\n";return 0;}
        auto top=q;top["limit"]="1";const auto one=service.Search(top,authorized);Check(one.status==200&&one.body.find("\"returnedItems\":1")!=std::string::npos&&one.body.find("\"indexedFrames\":3")!=std::string::npos,"top-k count separate from all channel samples");
        top["startTimeMs"]="1";top["endTimeMs"]="2";const auto timed=service.Search(top,authorized);Check(timed.status==200&&timed.body.find("\"returnedItems\":0")!=std::string::npos&&timed.body.find("\"indexedFrames\":3")!=std::string::npos,"time filter excludes unknown UTC without changing publication totals");
    }
    Ready(service,authorized);
    // 캐시 쓰기 실패는 새 게시를 막지만 현재 완성본의 실제 검색을 막지 않는다.
    const auto cache=std::filesystem::path(options.cache_directory),saved_cache=root/"visual-cache-owned-backup";
    std::filesystem::rename(cache,saved_cache);
    {std::ofstream blocked(cache);blocked<<"owned failure fixture";Check(bool(blocked),"cache failure fixture");}
    const auto failure_deadline=std::chrono::steady_clock::now()+std::chrono::seconds(5);bool failed_refresh=false;
    while(std::chrono::steady_clock::now()<failure_deadline){
        const auto failed=service.Status(authorized);
        if(failed.body.find("\"error\":\"visual-index-build-failed\"")!=std::string::npos){
            Check(failed.body.find("\"searchAvailable\":true")!=std::string::npos,"previous complete index remains available");failed_refresh=true;break;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(20));
    }
    Check(failed_refresh,"cache rebuild failure is observable");
    const auto fallback=service.Search(q,authorized);Check(fallback.status==200,"real search through previous complete index after rebuild failure");
    for(const auto& doc:docs)Check(fallback.body.find(doc.id)!=std::string::npos,"fallback retains exact current references");
    Check(std::filesystem::remove(cache),"remove owned cache blocker");std::filesystem::rename(saved_cache,cache);
    if(!scope_only){
    std::atomic<unsigned> prepared{0};std::atomic<bool> start{false};
    std::vector<std::future<std::vector<double>>> searches;
    for(unsigned n=0;n<4;++n)searches.push_back(std::async(std::launch::async,[&]{
        ++prepared;while(!start)std::this_thread::yield();std::vector<double> latencies;
        for(unsigned i=0;i<6;++i){const auto begin=std::chrono::steady_clock::now();const auto response=service.Search(q,authorized);
            if(response.status!=200)throw std::runtime_error("concurrent response: "+response.body);
            latencies.push_back(std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-begin).count());}
        return latencies;
    }));
    while(prepared!=4)std::this_thread::yield();
    start=true;std::vector<double> latencies;
    for(auto& task:searches){auto samples=task.get();latencies.insert(latencies.end(),samples.begin(),samples.end());}
    std::sort(latencies.begin(),latencies.end());Check(latencies.size()==24&&latencies[22]<=2000&&latencies.back()<=5000,"four concurrent search latency budget");
    std::cout<<"[four-searches] successes="<<latencies.size()<<" p95Ms="<<latencies[22]<<" maxMs="<<latencies.back()<<"\n";
    }
    Check(fallback.body.find("\"state\":\"degraded\"")!=std::string::npos&&fallback.body.find("\"usingPreviousPublication\":true")!=std::string::npos,"failed refresh distinct from usable old result");
    const auto& doc=docs.front();const Service::Query seek{{"channelId","visible"},{"hitId",doc.id}};
    const auto located=service.Seek(seek,authorized);Check(located.status==200,"selected current seek");Json(located.body);
    Check(located.body.find("verified-native-file-presentation")!=std::string::npos&&located.body.find(doc.segment_id)!=std::string::npos,"exact existing playback contract");
    Check(service.Seek(seek,[](const auto&){return false;}).status==403,"scope revoked at selection");
    auto wrong=seek;wrong["hitId"]="unknown";Check(service.Seek(wrong,authorized).status==410,"unknown hit");
    visible=false;Check(service.Seek(seek,authorized).status==410&&service.Search(q,authorized).status==410,"removed current channel");visible=true;
    Check(runtime.catalog().MarkSegmentCorrupt(doc.segment_id,"container-invalid",&error),"current corruption");
    Check(service.Seek(seek,authorized).status==410,"old index cannot play corruption");
    // 현재 게시본의 검증 실패는503, 다음 전체 재색인에서 corrupt 후보가 제외된 뒤200이다.
    const auto rebuilt_deadline=std::chrono::steady_clock::now()+std::chrono::seconds(15);bool rebuilt=false;
    while(std::chrono::steady_clock::now()<rebuilt_deadline){
        const auto after=service.Search(q,authorized);
        Check(after.status==503||(after.status==200&&after.body.find(doc.id)==std::string::npos),"corrupt never returned as healthy search result");
        if(after.status==200){rebuilt=true;break;}std::this_thread::sleep_for(std::chrono::milliseconds(20));
    }
    Check(rebuilt,"complete rebuild excludes corrupt candidate");
    service.Stop();Check(service.Search(q,authorized).status==503,"stop rejects search");
    if(scope_only){std::cout<<"PASS visual scope checks="<<checks<<" peakRssBytes="<<PeakRss()<<"\n";return 0;}}
    {
        // 기존 증명 지원 형식인 30fps 두 파일에서 1초당 210개 후보를 얻고 상한 200개를 조회한다.
        recording::RecordingRuntimeStorage large(root/"large");Check(large.Open(&error),"large search storage");
        auto input200=Encode(6300,false,false,160,90,30,30);Shift(input200,7000000000ULL);
        recording::GStreamerSegmentWriter long_writer(large.WriterOptions(105000));
        Check(long_writer.Start("visible","unused",input200.descriptor,[](auto,auto,auto*){return false;},&error),"large original writer");
        for(const auto& packet:input200.packets)long_writer.Push(packet,0);
        long_writer.Stop();
        recording::RecordingReadService large_reader(large.catalog());recording::RecordingVisualSource large_source(large.catalog(),large_reader);
        std::vector<recording::VisualSearchDocument> expected;std::map<std::string,recording::VisualSourceCoverage> coverage;
        Check(large_source.Collect({"visible"},1,&expected,&coverage,&error)&&expected.size()==210,"independent 210 original frame candidates");
        std::set<std::string> segments;for(const auto& d:expected)segments.insert(d.segment_id);
        Check(segments.size()==2,"all 210 candidates use two verified exact segments");
        auto large_options=options;large_options.cache_directory=(root/"large-cache").string();large_options.scan_seconds=3600;
        Service large_service(large.catalog(),large_reader,large_options,[](auto* out){*out={"visible"};return true;});
        const auto ready_started=std::chrono::steady_clock::now();Ready(large_service,authorized,45);
        std::cout<<"[index-ready] candidates=210 elapsedMs="<<std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-ready_started).count()<<"\n";
        auto top=q;top["limit"]="200";
        for(unsigned attempt=0;attempt<3;++attempt){
            const auto start=std::chrono::steady_clock::now();const auto response=large_service.Search(top,authorized);
            const auto elapsed=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-start).count();
            Check(response.status==200,"maximum allowed query returns real results: "+response.body);Json(response.body);
            std::size_t count=0,at=0;const std::string marker="\"playbackUrl\":";
            while((at=response.body.find(marker,at))!=std::string::npos){++count;at+=marker.size();}
            Check(count==200&&elapsed<=5000,"200 results preserve the five-second request bound");
            std::cout<<"[limit-200] attempt="<<attempt<<" candidates=210 results="<<count<<" elapsedMs="<<elapsed<<"\n";
        }
        large_service.Stop();
    }
    const auto peak=PeakRss();
    std::cout<<"PASS visual application checks="<<checks<<" peakRssBytes="<<peak<<"\n";return 0;
}catch(const std::exception& e){std::cerr<<"FAIL "<<e.what()<<" checks="<<checks<<"\n";return 1;}}
