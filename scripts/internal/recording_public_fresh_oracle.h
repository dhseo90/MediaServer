#pragma once
// Test-only publication oracle. Never calls VisualSearchIndex::Search or changes ranking.
#include "recording/visual_search_index.h"
#include <algorithm>
#include <limits>
#include <set>
#include <stdexcept>
#include <tuple>
namespace recording_public_fresh_oracle {
struct Target {std::size_t index, bucket_count, fresh_count;std::int64_t start_ms,end_ms;};
// Only exact sample/file evidence, independently of the public Resolve path.
struct Seek {std::int64_t ticks,duration;std::uint32_t timescale;};
template<class Binding>
std::optional<Seek> ExpectedSeek(
 const recording::VisualSearchDocument& d,const Binding& b) {
 if(b.channel_id!=d.channel_id||b.segment_id!=d.segment_id||!b.file_evidence||
    d.time_base_num!=1||d.time_base_den!=1000000000)return {};
 const auto& e=*b.file_evidence;if(e.file_sha256!=d.media_sha256||!e.timescale)return {};
 std::size_t count=0;std::int64_t ticks=0,duration=0;
 for(const auto& x:e.samples)if(x.original_pts_ns==d.media_pts){
  ++count;const __int128 delta=static_cast<__int128>(x.native_pts)-e.edit_media_time;
  if(x.sample_sha256!=d.frame_sha256||delta<0||delta>std::numeric_limits<std::int64_t>::max())return {};
  ticks=static_cast<std::int64_t>(delta);duration=x.native_duration;if(duration<=0)return {};
 }
 if(count!=1)return {};return Seek{ticks,duration,e.timescale};
}
// Exact public accessibility is independent of UTC and text ranking.
struct ExactTarget {std::size_t index,fresh_count;};
template<class CurrentBinding>
ExactTarget SelectExact(const std::vector<recording::VisualSearchDocument>& docs,
 const std::set<std::string>& original,CurrentBinding current_binding) {
 std::optional<std::size_t> first;std::size_t fresh=0;
 for(std::size_t i=0;i<docs.size();++i){const auto& d=docs[i];if(original.count(d.segment_id))continue;
  ++fresh;if(!current_binding(d))throw std::runtime_error("public-fresh current binding");
  if(!d.event_id.empty()||d.channel_id.empty()||d.id.empty())continue;
  if(!first||std::tie(d.channel_id,d.id)<std::tie(docs[*first].channel_id,docs[*first].id))first=i;
 }
 if(!fresh)throw std::runtime_error("public-fresh publication empty");
 if(!first)throw std::runtime_error("public-fresh exact target not constructible");
 return {*first,fresh};
}
inline std::string QueryEscape(const std::string& value){
 const char* hex="0123456789ABCDEF";std::string out;
 for(unsigned char c:value){if((c>='a'&&c<='z')||(c>='A'&&c<='Z')||(c>='0'&&c<='9')||c=='-'||c=='_'||c=='.'||c=='~')out+=char(c);else{out+='%';out+=hex[c>>4];out+=hex[c&15];}}return out;
}
template<class CurrentBinding>
Target Select(const std::vector<recording::VisualSearchDocument>& docs,
              const std::set<std::string>& original,CurrentBinding current_binding) {
 std::vector<std::size_t> candidates;std::size_t fresh=0;
 for(std::size_t i=0;i<docs.size();++i){const auto& d=docs[i];if(original.count(d.segment_id))continue;
  ++fresh;if(!current_binding(d))throw std::runtime_error("public-fresh current binding");
  if(d.event_id.empty()&&d.utc_ns&&*d.utc_ns>=0)candidates.push_back(i);
 }
 std::sort(candidates.begin(),candidates.end(),[&](auto a,auto b){const auto& x=docs[a];const auto& y=docs[b];return std::tie(x.channel_id,*x.utc_ns,x.id)<std::tie(y.channel_id,*y.utc_ns,y.id);});
 for(auto i:candidates){const auto& d=docs[i];const auto ms=*d.utc_ns/1000000;
  if(ms>=std::numeric_limits<std::int64_t>::max()/1000000)continue;
  const auto start=ms*1000000,end=(ms+1)*1000000;std::size_t count=0;
  for(const auto& x:docs)if(x.channel_id==d.channel_id&&x.utc_ns&&*x.utc_ns>=start&&*x.utc_ns<end)++count;
  if(count>=1&&count<=200)return {i,count,fresh,ms,ms+1};
 }
 throw std::runtime_error("public-fresh oracle not constructible");
}
}
