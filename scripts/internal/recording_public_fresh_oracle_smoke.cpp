#include "recording_public_fresh_oracle.h"
#include <iostream>
using recording::VisualSearchDocument;
using recording_public_fresh_oracle::Select;
VisualSearchDocument Doc(std::string id,std::string segment,std::optional<std::int64_t> utc){VisualSearchDocument d;d.id=id;d.segment_id=segment;d.channel_id="9101";d.utc_ns=utc;return d;}
int main(){unsigned pass=0;auto check=[&](bool ok,const char* s){if(!ok)throw std::runtime_error(s);++pass;std::cout<<"[pass] "<<s<<'\n';};auto yes=[](const auto&){return true;};std::set<std::string> old{"old"};
 auto rejects=[&](auto f){try{f();return false;}catch(const std::runtime_error&){return true;}};
 // Independent synthetic dot-score/order oracle; selection does not call Search.
 auto top=[&](const auto& docs){std::vector<std::pair<float,std::string>> scores;for(const auto& d:docs)scores.emplace_back(d.embedding[0],d.id);std::sort(scores.begin(),scores.end(),[](const auto& a,const auto& b){return a.first!=b.first?a.first>b.first:a.second<b.second;});scores.resize(std::min<std::size_t>(200,scores.size()));return scores;};
 std::vector<VisualSearchDocument> d;recording_public_fresh_oracle::Target t{};
 for(int scenario=0;scenario<3;++scenario){d.clear();for(unsigned i=0;i<200;++i){auto x=Doc("a"+std::to_string(i),"old",2000000);x.embedding={.8f};d.push_back(x);}auto x=Doc("z-fresh","new",3000000);x.embedding={scenario==0?.9f:scenario==1?.1f:.8f};d.push_back(x);auto ranked=top(d);const bool included=std::any_of(ranked.begin(),ranked.end(),[](const auto& x){return x.second=="z-fresh";});t=Select(d,old,yes);check(included==(scenario==0)&&t.index==200&&t.bucket_count==1,scenario==0?"fresh top200":scenario==1?"low score outside200 still selectable":"ID tie outside200 still selectable");}
 d.clear();for(unsigned i=0;i<200;++i){auto x=Doc("a"+std::to_string(i),"old",2000000);x.embedding={.8f};d.push_back(x);}for(unsigned i=0;i<48;++i){auto x=Doc("z"+std::to_string(i),"new",3000000+i);x.embedding={.8f};d.push_back(x);}auto ranked=top(d);t=Select(d,old,yes);check(std::none_of(ranked.begin(),ranked.end(),[](const auto& x){return x.second[0]=='z';})&&t.bucket_count==48&&t.fresh_count==48,"fresh48 broad0 independent bucket");
 d={Doc("unknown","new",{}),Doc("known","new",1234567)};t=Select(d,old,yes);check(t.index==1&&t.start_ms==1&&t.end_ms==2,"known target excludes unknown UTC");
 d={Doc("b","new",1000002),Doc("a","new",1000001),Doc("end","old",2000000)};t=Select(d,old,yes);check(t.index==1&&t.bucket_count==2,"deterministic UTC and half-open multiple bucket");
 d.clear();for(unsigned i=0;i<200;++i)d.push_back(Doc(std::to_string(i),"new",1000000));check(Select(d,old,yes).bucket_count==200,"exact200");d.push_back(Doc("201","old",1000000));d.push_back(Doc("next","new",2000000));check(Select(d,old,yes).index==201,"over200 skips deterministically");
 for(auto why:{"deleted binding","mutated binding"})check(rejects([&]{Select(d,old,[](const auto& x){return x.id!="next";});}),why);
 d={Doc("unknown","new",{})};check(rejects([&]{Select(d,old,yes);}),"no selectable fresh");d[0].utc_ns=1000000;d[0].event_id="event";check(rejects([&]{Select(d,old,yes);}),"non-representative not selectable");
 struct Sample {std::int64_t original_pts_ns=0,native_pts=0,native_duration=100;std::string sample_sha256="frame";};
 struct Evidence {std::string file_sha256="file";std::uint32_t timescale=3000;std::int64_t edit_media_time=0;std::vector<Sample> samples{Sample{}};};
 struct Binding {std::string channel_id="9101",segment_id="new";std::optional<Evidence> file_evidence=Evidence{};} binding;
 auto frame=Doc("frame","new",1000000);frame.media_sha256="file";frame.frame_sha256="frame";
 using recording_public_fresh_oracle::ExpectedSeek;
 auto seek=ExpectedSeek(frame,binding);check(seek&&seek->ticks==0&&seek->timescale==3000&&seek->duration==100,"independent exact sample seek");
 frame.media_pts=1;check(!ExpectedSeek(frame,binding),"stale fresh PTS rejected");frame.media_pts=0;frame.frame_sha256="changed";check(!ExpectedSeek(frame,binding),"stale fresh AU hash rejected");frame.frame_sha256="frame";binding.file_evidence->samples.push_back(Sample{});check(!ExpectedSeek(frame,binding),"ambiguous sample rejected");binding.file_evidence.reset();check(!ExpectedSeek(frame,binding),"missing evidence rejected");
 using recording_public_fresh_oracle::SelectExact;
 d={Doc("z","new",{})};check(SelectExact(d,old,yes).index==0,"unknown single exact selectable");
 d={Doc("z","new",{}),Doc("a","new",{}),Doc("0","new",{})};d[2].channel_id="9201";
 check(SelectExact(d,old,yes).index==1,"unknown multiple channel ID first");d[0].utc_ns=1;check(SelectExact(d,old,yes).index==1,"known unknown same exact rule");
 d[0].embedding={1};d[1].embedding={-1};check(SelectExact(d,old,yes).index==1,"broad score result cannot select exact target");
 check(rejects([&]{SelectExact(d,old,[](const auto& x){return x.id!="z";});}),"nonselected invalid binding fails exact selection");
 d={Doc("a","old",{})};check(rejects([&]{SelectExact(d,old,yes);}),"fresh0 exact fails");
 d={Doc("","new",{})};check(rejects([&]{SelectExact(d,old,yes);}),"empty exact ID fails");d[0].id="a";d[0].channel_id.clear();check(rejects([&]{SelectExact(d,old,yes);}),"empty exact channel fails");
 check(recording_public_fresh_oracle::QueryEscape("frame:36:a&b") == "frame%3A36%3Aa%26b","exact query escaped");
 std::cout<<"pass="<<pass<<" fail=0\n";
}
