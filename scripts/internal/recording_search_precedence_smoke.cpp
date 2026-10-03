// 파일 용도: V420-E01/E02 동일 원본·부분 coverage·안정 선택의 독립 기대값.
#include "recording/recording_search_precedence.h"
#include <algorithm>
#include <iostream>
using namespace recording;
namespace {int pass=0,fail=0;void Check(bool ok,const char* name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++pass:++fail;}}
int main(){
    ConfirmedMediaInterval original{"source","store","epoch","original",1,1000,0,100};
    auto interval=original;interval.start_pts=20;interval.end_pts=60;
    SearchPlaybackCandidate event{interval,"event-b","clip-b",true,true};
    std::vector<SearchPlaybackSlice> result;std::string error;
    Check(SelectSearchPlayback(original,{event},&result,&error)&&result.size()==3&&
        result[0].original.start_pts==0&&result[0].original.end_pts==20&&result[0].playback_segment_id=="original"&&
        result[1].original.start_pts==20&&result[1].original.end_pts==60&&result[1].playback_segment_id=="clip-b"&&
        result[2].original.start_pts==60&&result[2].original.end_pts==100&&result[2].playback_segment_id=="original","partial event preserves both uncovered original ranges");
    auto other=event;other.event_id="event-a";other.output_segment_id="clip-a";other.original.start_pts=40;other.original.end_pts=80;
    Check(SelectSearchPlayback(original,{event,other},&result,&error)&&result.size()==4&&result[1].event_id=="event-b"&&
        result[1].original.end_pts==40&&result[2].event_id=="event-a"&&result[2].original.start_pts==40&&result[2].original.end_pts==80,"overlapping events stable ID priority");
    const auto expected=result;
    Check(SelectSearchPlayback(original,{other,event,event},&result,&error)&&result.size()==expected.size()&&
        result[1].event_id==expected[1].event_id&&result[2].event_id==expected[2].event_id,"candidate order and duplicate invariant");
    for(int mode=0;mode<8;++mode){auto rejected=event;if(mode==0)rejected.original.source_id="other";if(mode==1)rejected.original.store_id="other";
        if(mode==2)rejected.original.media_epoch_id="other";if(mode==3)rejected.original.segment_id="other";
        if(mode==4)rejected.original.time_base_den=90000;if(mode==5)rejected.playable=false;
        if(mode==6)rejected.provenance_verified=false;if(mode==7)rejected.original.store_id.clear();
        Check(SelectSearchPlayback(original,{rejected},&result,&error)&&result.size()==1&&result[0].playback_segment_id=="original","unproven foreign unhealthy event cannot replace original");}
    auto point=original;point.start_pts=59;point.end_pts=60;
    Check(SelectSearchPlayback(point,{event},&result,&error)&&result.size()==1&&result[0].event_id=="event-b","observation point inside event");
    point.start_pts=60;point.end_pts=61;
    Check(SelectSearchPlayback(point,{event},&result,&error)&&result.size()==1&&result[0].event_id.empty(),"exclusive event end keeps original");
    auto full=event;full.original.start_pts=-10;full.original.end_pts=110;
    Check(SelectSearchPlayback(original,{full},&result,&error)&&result.size()==1&&result[0].original.start_pts==0&&result[0].original.end_pts==100&&result[0].event_id=="event-b","full event clipped to original");
    auto legacy=original;legacy.store_id.clear();
    Check(SelectSearchPlayback(legacy,{event},&result,&error)&&result.size()==1&&result[0].event_id.empty(),"missing original identity never inferred");
    const auto held=result;auto invalid=event;invalid.original.end_pts=invalid.original.start_pts;
    Check(!SelectSearchPlayback(original,{invalid},&result,&error)&&result.size()==held.size()&&result[0].event_id==held[0].event_id,"invalid candidate rejects atomically");
    Check(!SelectSearchPlayback(original,std::vector<SearchPlaybackCandidate>(4097,event),&result,&error),"candidate cap explicit failure");
    std::cout<<"[search-precedence] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
}
