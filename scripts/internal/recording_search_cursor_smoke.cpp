// 파일 용도: V420-C01~03 불변 페이지, 질의/권한 결박, 만료·축출·재시작 경계.
#include "recording/recording_search_snapshots.h"
#include <iostream>
#include <thread>
using namespace recording;
namespace {
int pass=0,fail=0;
void Check(bool ok,const char* name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++pass:++fail;}
SearchDocument Doc(std::string id,std::string channel,int ms){SearchDocument d;d.id=id;d.channel_id=channel;d.segment_id=id;
    d.start_ns=ms*1000000LL;d.end_ns=*d.start_ns+1000000;return d;}
[[maybe_unused]] std::vector<std::string> Ids(const RecordingSearchPage& p){std::vector<std::string> r;for(auto i:p.positions)r.push_back(p.model->documents()[i].id);return r;}
}
int main(){
    std::string error;std::shared_ptr<const RecordingSearchModel> model;
    auto u=Doc("unknown","one",0);u.start_ns.reset();u.end_ns.reset();
    Check(RecordingSearchModel::Build({Doc("b","one",1000),Doc("a","one",1000),Doc("c","two",1000),
        Doc("d","one",1500),u},"catalog",1,&model,&error),"fixture");
    RecordingSearchQuery q;q.channels={"two","one"};q.start_time_ms=1000;q.end_time_ms=2000;q.include_unplaced=true;q.limit=2;
    const auto now=RecordingSearchSnapshots::Clock::time_point(std::chrono::seconds(100));
    RecordingSearchSnapshots pool;RecordingSearchPage first,page;
#if !MEDIA_SERVER_USE_OPENSSL
    Check(!pool.Begin(model,q,"alice","scope-1",&page,&error,now)&&error=="search-crypto-unavailable","missing crypto fails closed");
#else
    Check(pool.Begin(model,q,"alice","scope-1",&first,&error,now)&&Ids(first)==std::vector<std::string>{"d","a"}&&
        first.known_count==4&&first.unplaced_count==1&&!first.next_cursor.empty(),"first page stable ties and full counts");
    auto missing=Doc("missing","one",1000);missing.kind=SearchDocumentKind::Observation;missing.observation_id="obs";missing.event_ids={"absent"};
    std::shared_ptr<const RecordingSearchModel> incomplete;
    Check(RecordingSearchModel::Build({missing},"catalog",2,&incomplete,&error),"incomplete fixture");
    auto behaviour=q;behaviour.behaviours={"event:Intrusion"};auto unchanged=first;
    Check(!pool.Begin(incomplete,behaviour,"alice","scope-1",&unchanged,&error,now)&&
        error=="search-event-evidence-incomplete"&&unchanged.snapshot_id==first.snapshot_id,
        "incomplete first search publishes no snapshot");
    Check(pool.Resume(first.next_cursor,q,"alice","scope-1",&page,&error,now)&&page.snapshot_id==first.snapshot_id,
        "incomplete attempt does not replace existing cursor snapshot");
    std::shared_ptr<const RecordingSearchModel> resolved;std::size_t position=999;
    Check(pool.ResolveHit(first.snapshot_id,"b",q,"alice","scope-1",&resolved,&position,&error,now)&&resolved->documents()[position].id=="b","member on later page resolves");
    const auto saved=resolved;const auto saved_position=position;
    Check(!pool.ResolveHit(first.snapshot_id,"b",q,"bob","scope-1",&resolved,&position,&error,now)&&resolved==saved&&position==saved_position,"hit other principal rejects atomically");
    Check(!pool.ResolveHit(first.snapshot_id,"b",q,"alice","scope-2",&resolved,&position,&error,now),"hit changed scope rejected");
    auto restricted=q;restricted.channels={"one"};RecordingSearchPage restricted_page;
    Check(pool.Begin(model,restricted,"alice","scope-1",&restricted_page,&error,now)&&
        !pool.ResolveHit(restricted_page.snapshot_id,"c",restricted,"alice","scope-1",&resolved,&position,&error,now)&&error=="search-hit-unavailable","model member outside query cannot seek");
    Check(pool.ResolveHit(first.snapshot_id,"b",q,"alice","scope-1",&resolved,&position,&error,now+std::chrono::seconds(299))&&
        !pool.ResolveHit(first.snapshot_id,"b",q,"alice","scope-1",&resolved,&position,&error,now+std::chrono::seconds(300)),"hit exact expiry boundary");
    // 별도 pool로 후속 cursor 검사의 기준 시각을 유지한다.
    Check(pool.Begin(model,q,"alice","scope-1",&first,&error,now),"cursor fixture renewed after hit expiry");
    const auto cursor=first.next_cursor;
    auto normalized=q;normalized.channels={"one","two","one"};
    Check(pool.Resume(cursor,normalized,"alice","scope-1",&page,&error,now)&&Ids(page)==std::vector<std::string>{"b","c"},"normalized equivalent query resumes");
    const auto second=page;
    Check(pool.Resume(cursor,q,"alice","scope-1",&page,&error,now)&&page.next_cursor==second.next_cursor&&Ids(page)==Ids(second),"cursor replay idempotent");
    Check(pool.Resume(second.next_cursor,q,"alice","scope-1",&page,&error,now)&&Ids(page)==std::vector<std::string>{"unknown"}&&page.next_cursor.empty(),"unknown last final page no cursor");
    const auto held=page;
    Check(!pool.Resume(cursor,q,"bob","scope-1",&page,&error,now)&&page.snapshot_id==held.snapshot_id,"other principal rejected atomically");
    Check(!pool.Resume(cursor,q,"alice","scope-2",&page,&error,now),"scope change rejected");
    for(int mode=0;mode<4;++mode){auto changed=q;if(mode==0)changed.limit=1;if(mode==1)changed.end_time_ms=2001;
        if(mode==2)changed.include_unplaced=false;if(mode==3)changed.objects={"person"};
        Check(!pool.Resume(cursor,changed,"alice","scope-1",&page,&error,now),"query change rejected");}
    auto tampered=cursor;tampered.back()=tampered.back()=='a'?'b':'a';
    Check(!pool.Resume(tampered,q,"alice","scope-1",&page,&error,now)&&error=="search-invalid-cursor","tampered MAC rejected");
    Check(!pool.Resume("v2."+cursor.substr(3),q,"alice","scope-1",&page,&error,now),"schema mismatch rejected");
    RecordingSearchSnapshots restarted;
    Check(!restarted.Resume(cursor,q,"alice","scope-1",&page,&error,now)&&error=="search-invalid-cursor","restart rejects prior server cursor");
    std::shared_ptr<const RecordingSearchModel> newer;
    Check(RecordingSearchModel::Build({Doc("new","one",1700)},"catalog",2,&newer,&error),"changed source fixture");
    Check(pool.Begin(newer,q,"alice","scope-1",&page,&error,now)&&Ids(page)==std::vector<std::string>{"new"}&&
        pool.Resume(cursor,q,"alice","scope-1",&page,&error,now)&&Ids(page)==std::vector<std::string>{"b","c"},"new observation and removal do not mutate old membership");
    Check(pool.Resume(cursor,q,"alice","scope-1",&page,&error,now+std::chrono::seconds(299)),"before expiry accepted");
    Check(!pool.Resume(cursor,q,"alice","scope-1",&page,&error,now+std::chrono::seconds(300))&&error=="search-snapshot-expired","exact expiry rejected");
    RecordingSearchSnapshots small({1,128*1024*1024,std::chrono::minutes(5)});
    Check(small.Begin(model,q,"alice","scope-1",&first,&error,now)&&small.Begin(newer,q,"alice","scope-1",&page,&error,now)&&
        !small.Resume(first.next_cursor,q,"alice","scope-1",&page,&error,now)&&error=="search-snapshot-expired","snapshot count evicts oldest");
    RecordingSearchSnapshots byte_pool({8,model->accounted_bytes()*3/2,std::chrono::minutes(5)});
    Check(byte_pool.Begin(model,q,"alice","scope-1",&first,&error,now)&&byte_pool.Begin(model,q,"alice","scope-1",&page,&error,now)&&
        !byte_pool.Resume(first.next_cursor,q,"alice","scope-1",&page,&error,now)&&error=="search-snapshot-expired","aggregate byte budget evicts oldest");
    const auto current_cursor=page.next_cursor;
    auto big=Doc("big","one",1700);big.object=std::string(4096,'x');
    big.zone_ids={std::string(4096,'z'),std::string(4096,'y'),std::string(4096,'w')};
    std::shared_ptr<const RecordingSearchModel> large;RecordingSearchModel::Build({big},"catalog",3,&large,&error);
    Check(large&&large->accounted_bytes()>model->accounted_bytes()*3/2,"oversized fixture exceeds unchanged pool budget");
    Check(!byte_pool.Begin(large,q,"alice","scope-1",&page,&error,now)&&
        byte_pool.Resume(current_cursor,q,"alice","scope-1",&page,&error,now),"failed admission preserves existing snapshot");
    RecordingSearchSnapshots tiny({8,1,std::chrono::minutes(5)});page=held;
    Check(!tiny.Begin(model,q,"alice","scope-1",&page,&error,now)&&page.snapshot_id==held.snapshot_id&&error=="search-snapshot-capacity","byte limit failure output unchanged");
    RecordingSearchQuery empty=q;empty.channels={"absent"};
    Check(pool.Begin(model,empty,"alice","scope-1",&page,&error,now)&&page.positions.empty()&&page.next_cursor.empty()&&page.known_count==0,"empty successful page");
    Check(!pool.Begin(model,q,"alice","scope-1",&page,&error,RecordingSearchSnapshots::Clock::time_point::max()),"expiry arithmetic overflow rejected");
    // 실제 시계에서 후속 조회 없이 pool 소유만 해제한다. 외부 page의 shared 소유는 보존한다.
    const auto wait_released=[](const auto& weak){
        const auto deadline=RecordingSearchSnapshots::Clock::now()+std::chrono::seconds(2);
        while(!weak.expired()&&RecordingSearchSnapshots::Clock::now()<deadline)
            std::this_thread::sleep_for(std::chrono::milliseconds(5));
        return weak.expired();
    };
    {
        RecordingSearchSnapshots idle({8,128*1024*1024,std::chrono::milliseconds(20)},true);
        std::shared_ptr<const RecordingSearchModel> owned;
        Check(RecordingSearchModel::Build({Doc("idle","one",1500)},"idle",1,&owned,&error),"R03 idle fixture");
        std::weak_ptr<const RecordingSearchModel> weak=owned;RecordingSearchPage held_page;
        Check(idle.Begin(owned,q,"alice","scope-1",&held_page,&error),"R03 idle snapshot begin");
        owned.reset();held_page={};
        Check(wait_released(weak),"R03 idle expiration releases model without another request");
    }
    {
        RecordingSearchSnapshots idle({8,128*1024*1024,std::chrono::milliseconds(20)},true);
        std::shared_ptr<const RecordingSearchModel> owned;
        Check(RecordingSearchModel::Build({Doc("held","one",1500)},"held",1,&owned,&error),"R03 held fixture");
        std::weak_ptr<const RecordingSearchModel> weak=owned;RecordingSearchPage held_page;
        Check(idle.Begin(owned,q,"alice","scope-1",&held_page,&error),"R03 held snapshot begin");
        owned.reset();std::this_thread::sleep_for(std::chrono::milliseconds(40));
        Check(!weak.expired()&&Ids(held_page)==std::vector<std::string>{"held"},"R03 expiry preserves caller-owned immutable page");
        held_page={};Check(wait_released(weak),"R03 last external owner release frees expired model");
    }
    const auto shutdown=RecordingSearchSnapshots::Clock::now();
    {RecordingSearchSnapshots idle({},true);RecordingSearchPage held_page;
        Check(idle.Begin(model,q,"alice","scope-1",&held_page,&error),"R03 shutdown fixture with future expiry");}
    Check(RecordingSearchSnapshots::Clock::now()-shutdown<std::chrono::seconds(1),"R03 destructor joins without waiting for five-minute deadline");
#endif
    std::cout<<"[search-cursor] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
}
