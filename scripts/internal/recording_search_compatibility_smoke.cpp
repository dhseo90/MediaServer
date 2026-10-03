// 파일 용도: 변경하지 않은 v410 golden을 현행 catalog/search reader에 입력하여 질의 의미를 검사한다.
#include "recording/recording_search_reader.h"
#include <filesystem>
#include <fstream>
#include <iostream>
int main(int argc,char** argv){
    if(argc!=3)return 2;int pass=0,fail=0;auto check=[&](bool ok,const char* name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++pass:++fail;};
    try {
        const auto root=std::filesystem::weakly_canonical(argv[1]);std::filesystem::create_directories(root);
        recording::RecordingJournal journal(root/"journal.jsonl");std::string error;if(!journal.Open(&error))throw std::runtime_error(error);
        recording::RecordingCatalog catalog(journal,{root/"catalog.sqlite3",root,true});if(!catalog.Open(&error))throw std::runtime_error(error);
        std::ifstream segments(std::filesystem::path(argv[2])/"segments.jsonl");std::string line;
        while(std::getline(segments,line)){
            recording::RecordingSegmentV1 segment;if(!recording::ParseRecordingSegmentV1(line,&segment,&error))throw std::runtime_error(error);
            // Metadata-only golden: an empty owned placeholder satisfies path admission, never media validity.
            {std::ofstream placeholder(root/(segment.segment_id+".mp4"),std::ios::binary);}
            if(!catalog.FinalizeSegment(segment,(root/(segment.segment_id+".mp4")).string(),&error))throw std::runtime_error(error);
        }
        std::ifstream observations(std::filesystem::path(argv[2])/"observations.jsonl");
        while(std::getline(observations,line)){recording::AnalysisObservationV1 observation;
            if(!recording::ParseAnalysisObservationV1(line,&observation,&error)||!catalog.PutObservation(observation,&error))throw std::runtime_error(error);}
        recording::RecordingReadService read(catalog);recording::RecordingSearchReader search(catalog,read);
        std::shared_ptr<const recording::RecordingSearchModel> model;
        if(!search.Refresh({"channel-1"},{},&model,&error))throw std::runtime_error(error);
        recording::RecordingSearchQuery query;query.channels={"channel-1"};query.start_time_ms=1767225600000;query.end_time_ms=1767225605000;
        recording::RecordingSearchMatches matches;
        check(model->Query(query,&matches,&error)&&matches.known_count==2,"golden two recording intervals preserved");
        query.objects={"person"};query.tracks={"track-0001"};query.events={"event-0001"};query.zones={"zone-entrance"};query.rules={"rule-loitering"};
        check(model->Query(query,&matches,&error)&&matches.known_count==1,"golden same-observation filter conjunction");
        if(matches.positions.size()!=1)throw std::runtime_error("golden expected one observation");const auto& hit=model->documents()[matches.positions[0]];
        check(hit.observation_id=="observation-0001"&&hit.segment_id=="seg-alpha-0001"&&hit.start_ns==1767225602500000000LL&&hit.media_pts==315000&&hit.time_base_den==90000,"golden exact identity UTC PTS and timebase");
        query.end_time_ms=1767225602500;check(model->Query(query,&matches,&error)&&matches.known_count==0,"golden observation excludes exact query end");
        check(!read.ResolveMedia("channel-1","seg-alpha-0001"),"metadata fixture never invents physical playback");
    }catch(const std::exception& e){std::cerr<<e.what()<<'\n';++fail;}
    std::cout<<"[search-compatibility] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
}
