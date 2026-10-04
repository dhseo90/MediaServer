// 파일 용도: 실제 writer/model/worker를 통과한 정제 API·권한·현재 seek의 단기 검사.
#include "recording_media_test_fixture.h"
#include "recording/recording_runtime_composition.h"
#include "ingress/visual_search_application_service.h"
#include "domain/strict_json.h"
#include <iostream>
#include <future>
#include <thread>
#include <sys/resource.h>
namespace {
int checks=0;void Check(bool v,const std::string& name){++checks;if(!v)throw std::runtime_error(name);}
using Service=ingress::VisualSearchApplicationService;
void Json(const std::string& body){ingress::StrictJsonObjectDocument doc;std::string error;Check(ingress::ParseStrictJsonObjectDocument(body,&doc,&error),"valid public JSON");}
void Ready(Service& service,const Service::Authorize& authorize){
    const auto end=std::chrono::steady_clock::now()+std::chrono::seconds(15);
    while(std::chrono::steady_clock::now()<end){const auto status=service.Status(authorize);if(status.status==200&&status.body.find("\"state\":\"ready\"")!=std::string::npos)return;std::this_thread::sleep_for(std::chrono::milliseconds(20));}
    throw std::runtime_error("index ready deadline: "+service.Status(authorize).body);
}
}
int main(int argc,char** argv){try{
    if(argc!=3)return 2;gst_init(nullptr,nullptr);const auto root=std::filesystem::weakly_canonical(argv[1]);
    recording::RecordingRuntimeStorage runtime(root);std::string error;Check(runtime.Open(&error),"storage open");
    auto input=Encode(90,false,false,160,90,30,30);Shift(input,7000000000ULL);
    for(const auto& channel:{"visible","hidden"}){
        recording::GStreamerSegmentWriter writer(runtime.WriterOptions(1000));
        Check(writer.Start(channel,"unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"writer start");
        for(const auto& p:input.packets)writer.Push(p,0);writer.Stop();
    }
    recording::RecordingReadService reader(runtime.catalog());
    const Service::Authorize authorized=[](const auto& channel){return channel=="visible";};
    std::atomic<bool> visible{true};const Service::Channels channels=[&](auto* out){*out={"hidden"};if(visible)out->push_back("visible");return true;};
    Service::Options options;Service disabled(runtime.catalog(),reader,options,channels);
    const Service::Query q{{"channelIds","visible"},{"text","red scene"},{"limit","3"}};
    Check(disabled.Status(authorized).body.find("\"enabled\":false")!=std::string::npos,"disabled status");
    Check(disabled.Search(q,authorized).status==503,"disabled search");
    options.enabled=true;options.model_directory=argv[2];options.cache_directory=(root/"visual-cache").string();options.scan_seconds=1;options.sample_seconds=1;
    Service service(runtime.catalog(),reader,options,channels);Ready(service,authorized);
    auto status=service.Status(authorized);Json(status.body);Check(status.body.find("hidden")==std::string::npos,"status contains authorized channel only");
    Check(status.body.find("\"indexedFrames\":3")!=std::string::npos,"three representative frames");
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
        Check(result.body.find("similarity-not-evidence")!=std::string::npos,"score meaning");
        for(const auto& doc:docs)Check(result.body.find(doc.id)!=std::string::npos,"all allowed current references");
        for(const auto& secret:{"hidden","sha256","embedding","model_directory","sourceUrl"})Check(result.body.find(secret)==std::string::npos,"sanitized response");
        Check(result.body.find(root.string())==std::string::npos,"no local path");
    }
    Ready(service,authorized);
    std::atomic<unsigned> prepared{0};std::atomic<bool> start{false};
    std::vector<std::future<std::vector<double>>> searches;
    for(unsigned n=0;n<4;++n)searches.push_back(std::async(std::launch::async,[&]{
        ++prepared;while(!start)std::this_thread::yield();std::vector<double> latencies;
        for(unsigned i=0;i<6;++i){const auto begin=std::chrono::steady_clock::now();const auto response=service.Search(q,authorized);
            if(response.status!=200)throw std::runtime_error("concurrent response: "+response.body);
            latencies.push_back(std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-begin).count());}
        return latencies;
    }));
    while(prepared!=4)std::this_thread::yield();start=true;std::vector<double> latencies;
    for(auto& task:searches){auto samples=task.get();latencies.insert(latencies.end(),samples.begin(),samples.end());}
    std::sort(latencies.begin(),latencies.end());Check(latencies.size()==24&&latencies[22]<=2000&&latencies.back()<=5000,"four concurrent search latency budget");
    std::cout<<"[four-searches] successes="<<latencies.size()<<" p95Ms="<<latencies[22]<<" maxMs="<<latencies.back()<<"\n";
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
    struct rusage usage{};Check(getrusage(RUSAGE_SELF,&usage)==0,"RSS observation");std::uint64_t peak=usage.ru_maxrss;
#ifndef __APPLE__
    peak*=1024;
#endif
    Check(peak<=4ULL*1024*1024*1024,"model plus product RSS");
    std::cout<<"PASS visual application checks="<<checks<<" peakRssBytes="<<peak<<"\n";return 0;
}catch(const std::exception& e){std::cerr<<"FAIL "<<e.what()<<" checks="<<checks<<"\n";return 1;}}
