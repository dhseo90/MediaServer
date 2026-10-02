// 파일 용도: V420 행동 근거를 실제 EventRecord 읽기 경계와 연결하는 focused 검사.
#include "recording/recording_search_reader.h"
#include "ingress/event_storage_application_service.h"
#include "analysis/event_storage.h"
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iostream>
using namespace recording;
namespace {
int passed=0,failed=0;
void Check(bool ok,const char* name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++passed:++failed;}
std::string Row(const std::string& id,const std::string& channel="one",int track=7,const std::string& epoch="epoch") {
    return "{\"schema\":\"media-server.va.event-record.v1\",\"eventId\":\""+id+"\",\"channelId\":\""+channel+
        "\",\"trackId\":"+std::to_string(track)+",\"eventType\":\"Intrusion\",\"scenarioName\":\"Arrival\",\"streamEpochId\":\""+epoch+
        "\",\"startTime\":1000,\"updateTime\":1000,\"endTime\":2000,\"metadata\":{\"private\":\"not-a-fact\"}}\n";
}
void Write(const std::filesystem::path& path,const std::string& text){std::ofstream out(path);out<<text;}
}
int main(int argc,char**argv){
    if(argc!=2)return 2;
    const auto root=std::filesystem::weakly_canonical(argv[1]);std::filesystem::create_directories(root);
    const auto path=root/"events.jsonl";
    setenv("MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED","true",1);
    setenv("MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH",path.c_str(),1);
    Write(path,Row("match")+Row("wrong-channel","two")+Row("wrong-track","one",8)+Row("wrong-epoch","one",7,"other"));
    std::string error;std::vector<ingress::EventSearchApplicationFact> facts;
    Check(ingress::ReadEventSearchFactsForApplication("one",&facts,&error)&&facts.size()==3&&
        facts[0].event_id=="match"&&facts[0].scenario_name=="Arrival"&&facts[0].stream_epoch_id=="epoch","typed real event storage facts");
    analysis::EventRecordQueryOptions legacy;legacy.channel_id="one";analysis::EventRecordQueryResult legacy_result;
    Check(analysis::QueryEventRecords(legacy,&legacy_result,&error)&&legacy_result.records_json.size()==3&&
        legacy_result.search_facts.empty()&&legacy_result.records_json[0].find("not-a-fact")!=std::string::npos,"legacy JSON query unchanged");
    SearchDocument d;d.id="hit";d.observation_id="obs";d.kind=SearchDocumentKind::Observation;d.channel_id="one";
    d.track_id="7";d.stream_epoch_id="epoch";d.start_ns=1000000000;d.end_ns=1000000001;
    d.event_ids={"match","wrong-channel","wrong-track","wrong-epoch","missing"};
    std::shared_ptr<const RecordingSearchModel> source,model;
    Check(RecordingSearchModel::Build({d},"catalog",1,&source,&error),"event source model");
    Check(source&&RecordingSearchReader::WithEventFacts(*source,&model,&error)&&
        model->documents()[0].event_facts.size()==1&&model->documents()[0].event_facts[0].event_id=="match",
        "join requires linked id channel track epoch");
    if(!model)return 1;
    RecordingSearchQuery query;query.channels={"one"};query.start_time_ms=1000;query.end_time_ms=2000;
    query.behaviours={"scenario:Arrival"};RecordingSearchMatches matches;
    Check(model->Query(query,&matches,&error)&&matches.positions.size()==1,"stored scenario reaches behaviour filter");
    auto held=model;Write(path,Row("missing"));
    Check(RecordingSearchReader::WithEventFacts(*source,&model,&error)&&model->documents()[0].event_facts.size()==1&&
        model->documents()[0].event_facts[0].event_id=="missing"&&held->documents()[0].event_facts[0].event_id=="match",
        "new search refreshes events without catalog revision change");
    Write(path,Row("match")+Row("match"));
    Check(RecordingSearchReader::WithEventFacts(*source,&model,&error)&&model->documents()[0].event_facts.size()==1,"identical event rows deduplicated");
    held=model;Write(path,Row("match")+Row("match","one",8));
    Check(!RecordingSearchReader::WithEventFacts(*source,&model,&error)&&model==held&&error=="search-event-evidence-conflict","conflicting event identity rejected atomically");
    Write(path,Row("match")+"{broken\n");
    Check(!RecordingSearchReader::WithEventFacts(*source,&model,&error)&&model==held&&error=="search-event-evidence-incomplete","corrupt scan is not successful empty");
    Write(path,Row("match")+"{\"schema\":");
    Check(!RecordingSearchReader::WithEventFacts(*source,&model,&error)&&model==held,"partial scan rejected atomically");
    Write(path,"");
    Check(RecordingSearchReader::WithEventFacts(*source,&model,&error)&&model->documents()[0].event_facts.empty(),"empty event store clears facts no inference");
    std::string many;for(int i=0;i<10001;++i)many+=Row("id-"+std::to_string(i));Write(path,many);held=model;
    Check(!RecordingSearchReader::WithEventFacts(*source,&model,&error)&&model==held&&error=="search-event-evidence-incomplete","event row cap rejects partial facts");
    auto large=Row("large");large.replace(large.find("Arrival"),7,std::string(4096,'a'));
    many.clear();for(int i=0;i<1100;++i)many+=large;Write(path,many);
    Check(!RecordingSearchReader::WithEventFacts(*source,&model,&error)&&model==held&&error=="search-event-evidence-incomplete",
        "event byte cap rejects before row cap");
    analysis::StopEventStorage();
    std::cout<<"[search-events] pass="<<passed<<" fail="<<failed<<" error="<<error<<'\n';return failed?1:0;
}
