#include "recording/recording_runtime_composition.h"
#include "recording/recording_search_reader.h"
#include "recording/recording_visual_source.h"
#include <iostream>
#include <chrono>
using Clock=std::chrono::steady_clock;
template<class F> bool Time(const char* name,F f){const auto a=Clock::now();const bool ok=f();std::cout<<name<<" ok="<<ok<<" ms="<<std::chrono::duration<double,std::milli>(Clock::now()-a).count()<<std::endl;return ok;}
int main(int argc,char** argv){if(argc!=2)return 2;std::string error;recording::RecordingRuntimeStorage runtime(argv[1]);if(!Time("open",[&]{return runtime.Open(&error);}))return 1;recording::RecordingReadService reader(runtime.catalog());recording::RecordingSearchReader search(runtime.catalog(),reader);recording::RecordingVisualSource source(runtime.catalog(),reader);recording::RecordingSearchQuery query;query.channels={"9101"};query.start_time_ms=1791120000000;query.end_time_ms=1791140000000;query.include_unplaced=true;query.limit=20;for(int i=0;i<3;++i){std::cout<<"iteration="<<i<<std::endl;std::shared_ptr<const recording::RecordingSearchModel> model,playback;recording::RecordingTimelineResult timeline;std::vector<recording::VisualSearchDocument> docs;std::map<std::string,recording::VisualSourceCoverage> coverage;
if(!Time("refresh",[&]{return search.Refresh(query.channels,{},&model,&error);})||!Time("timeline",[&]{return reader.QuerySearchTimeline("9101",query.start_time_ms,query.end_time_ms,&timeline,&error);})||!Time("playback",[&]{return search.WithPlayback(*model,query,&playback,&error);})||!Time("visual-collect",[&]{return source.Collect({"9101","9201"},1,&docs,&coverage,&error);})) {std::cerr<<error;return 1;}
std::cout<<"counts search="<<model->documents().size()<<" timeline="<<timeline.items.size()+timeline.unplaced_items.size()<<" visual="<<docs.size()<<std::endl;
if(!docs.empty()){std::unique_ptr<recording::RecordingVisualSource::PreparedSource> proof;recording::SearchSeekTarget seek;if(!Time("visual-prepare",[&]{proof=source.Prepare(docs.front(),&error,{},Clock::now()+std::chrono::seconds(5));return bool(proof);})||!Time("visual-reuse",[&]{return source.ResolvePrepared(docs.front(),*proof,&seek,&error,{},Clock::now()+std::chrono::seconds(5));})){std::cerr<<error;return 1;}}
}return 0;}
