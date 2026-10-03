// 파일 용도: V420-F01~10의 독립 기대값. 관측 간 태그 합산과 UTC 경계 오인을 검출한다.
#include "recording/recording_search_model.h"
#include <iostream>
#include <limits>
using namespace recording;
namespace {
int pass=0,fail=0;
void Check(bool ok,const char* name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++pass:++fail;}
SearchDocument Doc(const std::string& id,const std::string& channel,std::int64_t time,bool observation=true){
    SearchDocument d;d.id=id;d.channel_id=channel;d.segment_id="segment-"+id;
    d.kind=observation?SearchDocumentKind::Observation:SearchDocumentKind::Recording;
    if(observation)d.observation_id=id;
    d.start_ns=time*1000000;d.end_ns=*d.start_ns+(observation?1:1000000000);return d;
}
}
int main(){
    auto a=Doc("a","one",1000);a.object="person";a.track_id="7";a.analysis_namespace="tap-one";
    a.zone_ids={"yard"};a.rule_ids={"rule-a"};a.event_ids={"e1","e2"};
    a.event_facts={{"e1","Intrusion",""},{"e2","LineCrossing","Arrival"}};
    auto b=Doc("b","one",1500);b.object="car";b.track_id="7";b.analysis_namespace="tap-two";
    b.zone_ids={"door"};b.rule_ids={"rule-b"};b.event_ids={"e3"};
    auto c=Doc("c","two",1000);c.object="person";c.track_id="7";c.zone_ids={"yard"};
    auto unknown=Doc("unknown","one",0);unknown.start_ns.reset();unknown.end_ns.reset();unknown.object="person";
    auto left=Doc("left","one",999);left.object="person";
    auto right=Doc("right","one",2000);right.object="person";
    auto record=Doc("record","one",900,false);auto empty=Doc("empty","two",1000,false);
    std::shared_ptr<const RecordingSearchModel> model;std::string error;
    Check(RecordingSearchModel::Build({a,b,c,unknown,left,right,record,empty},"source",1,&model,&error),"fixture-build");
    if(!model)return 1;
    RecordingSearchQuery q;q.channels={"one"};q.start_time_ms=1000;q.end_time_ms=2000;
    const auto Expect=[&](const RecordingSearchQuery& query,std::vector<std::string> ids,const char* name){
        RecordingSearchMatches result;bool ok=model->Query(query,&result,&error);std::vector<std::string> actual;
        for(auto index:result.positions)actual.push_back(model->documents()[index].id);
        Check(ok&&actual==ids,name);
    };
    Expect(q,{"record"},"F01 camera-time returns intervals without analysis");
    auto both=q;both.channels={"two","one","one"};Expect(both,{"empty","record"},"F01 channel OR global stable order duplicate normalized");
    q.objects={"person"};Expect(q,{"a"},"F02 F03 half-open UTC sampled person only");
    auto x=q;x.objects={"person","car"};Expect(x,{"b","a"},"F03 object OR");
    x=q;x.objects={"Person"};Expect(x,{},"F03 exact case no synonym");
    x=q;x.tracks={"7"};x.zones={"door"};Expect(x,{},"F04 F06 same-track observations never combine tags");
    x=q;x.objects.clear();x.tracks={"7"};Expect(x,{"b","a"},"F04 namespaces remain distinct hits");
    x=q;x.zones={"yard","door"};x.rules={"rule-a"};Expect(x,{"a"},"F06 F07 field AND list OR");
    x=q;x.events={"e2"};Expect(x,{"a"},"F05 stored event reference exact");
    x=q;x.behaviours={"event:Intrusion"};Expect(x,{"a"},"F08 event behaviour confirmed fact");
    x=q;x.behaviours={"scenario:Arrival"};Expect(x,{"a"},"F09 named scenario fact");
    x=q;x.behaviours={"scenario:rule-a"};Expect(x,{},"F09 rule ID is not scenario name");
    x=q;x.events={"e1"};x.behaviours={"event:LineCrossing"};Expect(x,{},"F10 event behaviour require same event");
    x=q;x.events={"e1","e2"};x.behaviours={"event:LineCrossing"};Expect(x,{"a"},"F10 shared matching event");
    x=q;x.objects={"car"};x.behaviours={"event:Intrusion"};RecordingSearchMatches missing;Check(!model->Query(x,&missing,&error)&&error=="search-event-evidence-incomplete","F08 missing event facts are incomplete");
    x=q;x.include_unplaced=true;Expect(x,{"a","unknown"},"F02 unknown separate after known");
    RecordingSearchMatches counts;Check(model->Query(x,&counts,&error)&&counts.known_count==1&&counts.unplaced_count==1,"F02 separate counts");
    for(int mode=0;mode<9;++mode){
        x=q;if(mode==0)x.channels.clear();if(mode==1)x.end_time_ms=x.start_time_ms;
        if(mode==2)x.start_time_ms=-1;if(mode==3)x.end_time_ms=std::numeric_limits<std::int64_t>::max();
        if(mode==4)x.end_time_ms=x.start_time_ms+31LL*86400000+1;if(mode==5)x.objects.resize(33,"person");
        if(mode==6)x.behaviours={"Intrusion"};if(mode==7)x.behaviours={"event:"};if(mode==8)x.rules={""};
        counts.positions={999};Check(!model->Query(x,&counts,&error)&&counts.positions==std::vector<std::size_t>{999},"invalid query rejects atomically");
    }
    std::cout<<"[search-filter] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
}
