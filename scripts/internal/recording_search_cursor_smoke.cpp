// 파일 용도: V420-C01~03 불변 페이지, 질의/권한 결박, 만료·축출·재시작 경계.
#include "recording/recording_search_snapshots.h"
#include <iostream>
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
    Check(!pool.Resume(tampered,q,"alice","scope-1",&page,&error,now),"tampered MAC rejected");
    Check(!pool.Resume("v2."+cursor.substr(3),q,"alice","scope-1",&page,&error,now),"schema mismatch rejected");
    RecordingSearchSnapshots restarted;
    Check(!restarted.Resume(cursor,q,"alice","scope-1",&page,&error,now),"restart rejects prior server cursor");
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
    std::shared_ptr<const RecordingSearchModel> large;RecordingSearchModel::Build({big},"catalog",3,&large,&error);
    Check(!byte_pool.Begin(large,q,"alice","scope-1",&page,&error,now)&&
        byte_pool.Resume(current_cursor,q,"alice","scope-1",&page,&error,now),"failed admission preserves existing snapshot");
    RecordingSearchSnapshots tiny({8,1,std::chrono::minutes(5)});page=held;
    Check(!tiny.Begin(model,q,"alice","scope-1",&page,&error,now)&&page.snapshot_id==held.snapshot_id&&error=="search-snapshot-capacity","byte limit failure output unchanged");
    RecordingSearchQuery empty=q;empty.channels={"absent"};
    Check(pool.Begin(model,empty,"alice","scope-1",&page,&error,now)&&page.positions.empty()&&page.next_cursor.empty()&&page.known_count==0,"empty successful page");
    Check(!pool.Begin(model,q,"alice","scope-1",&page,&error,RecordingSearchSnapshots::Clock::time_point::max()),"expiry arithmetic overflow rejected");
#endif
    std::cout<<"[search-cursor] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
}
