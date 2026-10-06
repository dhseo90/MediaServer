// 파일 용도: 인증 이후 녹화 검색·스냅샷 재생 요청의 값 파싱과 공개 응답.
#include "ingress/recording_application_service.h"
#include "recording/recording_search_reader.h"
#include "recording/recording_search_snapshots.h"
#include <algorithm>
#include <charconv>
#include <iomanip>
#include <limits>
#include <map>
#include <set>
#include <sstream>
namespace ingress {
struct RecordingApplicationService::SearchState {
    std::shared_ptr<const recording::RecordingSearchModel> source;
    recording::RecordingSearchSnapshots snapshots{{},true};
};
namespace {
using Query=std::unordered_map<std::string,std::string>;
std::string Get(const Query& q,const char* key){const auto it=q.find(key);return it==q.end()?"":it->second;}
std::string Quote(const std::string& value){
    static constexpr char hex[]="0123456789abcdef";std::string out="\"";
    for(unsigned char c:value){if(c=='"'||c=='\\'){out+='\\';out+=static_cast<char>(c);}else if(c<32){out+="\\u00";out+=hex[c>>4];out+=hex[c&15];}else out+=static_cast<char>(c);}return out+'"';
}
ApplicationServiceResult Error(int status,const std::string& reason){
    return {status,status==400?"Bad Request":status==403?"Forbidden":status==410?"Gone":"Service Unavailable","{\"error\":"+Quote(reason)+"}"};
}
ApplicationServiceResult Failure(const std::string& error){
    if(error=="search-snapshot-expired"||error=="search-hit-unavailable")return Error(410,error);
    if(error=="search-cursor-binding-mismatch")return Error(403,error);
    if(error=="search-invalid-cursor"||error=="search-invalid-query"||error=="search-invalid-behaviour")return Error(400,error);
    if(error=="search-capacity-exceeded"||error=="search-snapshot-capacity")return Error(503,"search-capacity-exceeded");
    if(error=="search-event-evidence-incomplete")return Error(503,error);
    return Error(503,"recording-search-unavailable");
}
bool Parse(const Query& raw,bool seek,recording::RecordingSearchQuery* out){
    static const std::set<std::string> keys{"channelIds","startTimeMs","endTimeMs","object","track","event","zone","rule","behaviour","includeUnplaced","limit"};
    for(const auto& entry:raw)if(!keys.count(entry.first)&&!(seek?(entry.first=="snapshotId"||entry.first=="hitId"):entry.first=="cursor"))return false;
    recording::RecordingSearchQuery q;
    const auto list=[&](const char* key,std::vector<std::string>* values){
        const auto it=raw.find(key);if(it==raw.end())return true;if(it->second.empty()||it->second.size()>32*4097)return false;
        std::size_t begin=0;while(begin<=it->second.size()) {const auto end=it->second.find(',',begin);
            values->push_back(it->second.substr(begin,end==std::string::npos?end:end-begin));
            if(values->back().empty()||values->size()>32)return false;if(end==std::string::npos)break;begin=end+1;}return true;
    };
    if(!list("channelIds",&q.channels)||!list("object",&q.objects)||!list("track",&q.tracks)||!list("event",&q.events)||
        !list("zone",&q.zones)||!list("rule",&q.rules)||!list("behaviour",&q.behaviours))return false;
    const auto number=[&](const char* name,std::int64_t* value){const auto text=Get(raw,name);if(text.empty())return false;
        const auto parsed=std::from_chars(text.data(),text.data()+text.size(),*value);return parsed.ec==std::errc{}&&parsed.ptr==text.data()+text.size()&&*value>=0;};
    if(!number("startTimeMs",&q.start_time_ms)||!number("endTimeMs",&q.end_time_ms))return false;
    if(raw.count("limit")){std::int64_t limit=0;if(!number("limit",&limit)||limit>200)return false;q.limit=static_cast<std::size_t>(limit);}
    if(raw.count("includeUnplaced")){const auto value=Get(raw,"includeUnplaced");if(value!="true"&&value!="false")return false;q.include_unplaced=value=="true";}
    if(!seek&&raw.count("cursor")&&Get(raw,"cursor").empty())return false;
    if(seek&&(Get(raw,"snapshotId").empty()||Get(raw,"hitId").empty()))return false;
    return recording::NormalizeSearchQuery(q,out,nullptr);
}
bool Authorized(const recording::RecordingSearchQuery& q,const RecordingApplicationService::ChannelAuthorizer& authorize){
    return authorize&&std::all_of(q.channels.begin(),q.channels.end(),[&](const auto& c){return authorize(c);});
}
std::string Decimal(const std::optional<std::int64_t>& value){return value?Quote(std::to_string(*value)):"null";}
std::string List(const std::vector<std::string>& values){std::string out="[";for(const auto& value:values){if(out.size()>1)out+=',';out+=Quote(value);}return out+']';}
void Add(std::string& out,const std::string& value){constexpr std::size_t cap=4*1024*1024;if(value.size()>cap||out.size()>cap-value.size())throw std::length_error("search-response-limit");out+=value;}
std::string Url(const std::string& id){return recording::ValidateOpaqueId(id,nullptr)?"/ops/api/recordings/media/"+id:"";}
}
ApplicationServiceResult RecordingApplicationService::Search(const Query& raw,const std::string& principal,
    const std::string& scope,const ChannelAuthorizer& authorize) const {
    try {
        recording::RecordingSearchQuery query;if(!Parse(raw,false,&query))return Error(400,"invalid-recording-search-query");
        if(principal.empty()||scope.empty()||!Authorized(query,authorize))return Error(403,"recording-channel-forbidden");
        if(!enabled_)return Error(503,"recording-search-unavailable");
        std::shared_ptr<SearchState> state;
        {
            std::lock_guard<std::mutex> lock(search_mutex_);
            if(!search_state_)search_state_=std::make_shared<SearchState>();
            state=search_state_;
        }
        recording::RecordingSearchPage page;std::string error;const auto cursor=Get(raw,"cursor");
        if(!cursor.empty()) {if(!state->snapshots.Resume(cursor,query,principal,scope,&page,&error))return Failure(error);}
        else {
            std::lock_guard<std::mutex> lock(search_mutex_);recording::RecordingSearchReader search(catalog_,reader_);
            // 여러 채널의 확정이 준비 구간과 겹칠 수 있다. 원본 변경만 유한하게 재시도하며
            // 각 시도의 동일한 revision/재생 검증을 통과한 모델만 한 번 게시한다.
            bool prepared=false;
            for(unsigned attempt=0;attempt<3;++attempt){
                if(!search.Refresh(query.channels,state->source,&state->source,&error)){
                    if(error=="search-source-changed")continue;
                    return Failure(error);
                }
                auto model=state->source;
                if(!query.behaviours.empty()&&!recording::RecordingSearchReader::WithEventFacts(*model,&model,&error,{},&query))return Failure(error);
                if(!search.WithPlayback(*model,query,&model,&error)){
                    if(error=="search-source-changed")continue;
                    return Failure(error);
                }
                if(!state->snapshots.Begin(model,query,principal,scope,&page,&error))return Failure(error);
                prepared=true;break;
            }
            if(!prepared)return Failure(error);
        }
        std::map<std::string,bool> availability;
        const auto available=[&](const std::string& channel,const std::string& id){
            if(id.empty()||Url(id).empty())return false;const auto key=std::to_string(channel.size())+":"+channel+id;
            auto it=availability.find(key);if(it!=availability.end())return it->second;
            const bool ok=bool(reader_.ResolveMedia(channel,id));availability.emplace(key,ok);return ok;
        };
        std::string json="{\"schema\":\"media-server.recording-search.v1\",\"snapshotId\":"+Quote(page.snapshot_id)+
            ",\"nextCursor\":"+(page.next_cursor.empty()?"null":Quote(page.next_cursor))+",\"knownCount\":"+std::to_string(page.known_count)+
            ",\"unplacedCount\":"+std::to_string(page.unplaced_count)+",\"items\":[";
        bool first=true;
        for(const auto position:page.positions){const auto& d=page.model->documents()[position];
            std::string target=d.playback_segment_id.empty()?d.segment_id:d.playback_segment_id;
            bool playable=available(d.channel_id,target);const bool preferred=target!=d.segment_id;
            if(!playable&&preferred&&available(d.channel_id,d.segment_id)){target=d.segment_id;playable=true;}
            const bool event=target!=d.segment_id;
            if(!first)Add(json,",");first=false;
            Add(json,"{\"id\":"+Quote(d.id)+",\"channelId\":"+Quote(d.channel_id)+",\"kind\":"+Quote(d.kind==recording::SearchDocumentKind::Observation?"observation":"recording")+
                ",\"segmentId\":"+Quote(d.segment_id)+",\"observationId\":"+Quote(d.observation_id)+",\"startTimeNs\":"+Decimal(d.start_ns)+",\"endTimeNs\":"+Decimal(d.end_ns)+
                ",\"timeProvenance\":"+Quote(d.time_provenance)+",\"uncertaintyNs\":"+Decimal(d.uncertainty_ns)+",\"object\":"+Quote(d.object)+",\"track\":"+Quote(d.track_id)+
                ",\"eventIds\":"+List(d.event_ids)+",\"zoneIds\":"+List(d.zone_ids)+",\"ruleIds\":"+List(d.rule_ids)+",\"playable\":"+(playable?"true":"false")+
                ",\"playbackUrl\":"+Quote(playable?Url(target):"")+",\"preferredEventId\":"+Quote(event?d.playback_event_id:"")+
                ",\"selectionReason\":"+Quote(event?"event-priority":preferred?"original-fallback":"original")+
                ",\"unavailableReason\":"+Quote(playable?"":target.empty()?"unresolved-original":catalog_.IsDeletedSegmentId(target)?"deleted":"media-unavailable")+"}");
        }
        Add(json,"]}");return {200,"OK",std::move(json)};
    }catch(const std::exception&){return Error(503,"recording-search-unavailable");}
}
ApplicationServiceResult RecordingApplicationService::SearchSeek(const Query& raw,const std::string& principal,
    const std::string& scope,const ChannelAuthorizer& authorize) const {
    try {
        recording::RecordingSearchQuery query;if(!Parse(raw,true,&query))return Error(400,"invalid-recording-search-query");
        if(principal.empty()||scope.empty()||!Authorized(query,authorize))return Error(403,"recording-channel-forbidden");
        if(!enabled_)return Error(503,"recording-search-unavailable");
        std::shared_ptr<SearchState> state;
        {
            std::lock_guard<std::mutex> lock(search_mutex_);
            if(!search_state_)search_state_=std::make_shared<SearchState>();
            state=search_state_;
        }
        std::shared_ptr<const recording::RecordingSearchModel> model;std::size_t position=0;std::string error;
        if(!state->snapshots.ResolveHit(Get(raw,"snapshotId"),Get(raw,"hitId"),query,principal,scope,&model,&position,&error))return Failure(error);
        const auto& d=model->documents()[position];std::string target=d.playback_segment_id.empty()?d.segment_id:d.playback_segment_id;
        auto media=reader_.ResolveMedia(d.channel_id,target);
        if(!media&&target!=d.segment_id){target=d.segment_id;media=reader_.ResolveMedia(d.channel_id,target);}
        recording::SearchSeekTarget seek;bool located=false;recording::RecordingSearchReader search(catalog_,reader_);
        if(media&&d.media_pts){
            if(target==d.segment_id)located=search.SourceSeek(d.channel_id,d.segment_id,*d.media_pts,d.time_base_num,d.time_base_den,&seek,&error);
            else if(!d.playback_job_id.empty()){
                const __int128 ns=static_cast<__int128>(*d.media_pts)*d.time_base_num*1000000000;
                if(d.time_base_den>0&&ns%d.time_base_den==0&&ns/d.time_base_den>=0&&ns/d.time_base_den<=std::numeric_limits<std::int64_t>::max())
                    located=search.DerivedSeek(d.channel_id,d.playback_job_id,d.segment_id,target,static_cast<std::int64_t>(ns/d.time_base_den),&seek,&error);
            }
        }
        std::ostringstream out;out<<std::setprecision(17)<<"{\"hitId\":"<<Quote(d.id)<<",\"playable\":"<<(media?"true":"false")
            <<",\"playbackUrl\":"<<Quote(media?Url(target):"")<<",\"seekAvailable\":"<<(located?"true":"false")<<",\"targetSeconds\":";
        if(located)out<<seek.seconds;else out<<"null";
        out<<",\"frameDurationSeconds\":";if(located)out<<seek.frame_duration_seconds;else out<<"null";
        out<<",\"reason\":"<<Quote(located?"":!media?"media-unavailable":"seek-unavailable")<<",\"timeBasis\":"<<Quote(located?seek.basis:"")<<'}';
        return {200,"OK",out.str()};
    }catch(const std::exception&){return Error(503,"recording-search-unavailable");}
}
ApplicationServiceResult RecordingApplicationService::SearchEvidence(const Query& raw,const std::string& principal,
    const std::string& scope,const ChannelAuthorizer& authorize,bool observations) const {
    try {
        recording::RecordingSearchQuery query;
        if(!Parse(raw,true,&query))return Error(400,"invalid-recording-search-query");
        if(principal.empty()||scope.empty()||!Authorized(query,authorize))return Error(403,"recording-channel-forbidden");
        if(!enabled_||!evidence_)return EvidenceUnavailable();
        std::shared_ptr<SearchState> state;
        {std::lock_guard<std::mutex> lock(search_mutex_);state=search_state_;}
        if(!state)return Error(410,"search-snapshot-expired");
        std::shared_ptr<const recording::RecordingSearchModel> model;std::size_t position=0;std::string error;
        if(!state->snapshots.ResolveHit(Get(raw,"snapshotId"),Get(raw,"hitId"),query,principal,scope,&model,&position,&error))
            return error=="search-invalid-snapshot"?Error(400,error):Failure(error);
        const auto& hit=model->documents()[position];
        if(observations&&(hit.analysis_namespace.empty()||hit.track_id.empty()))return Error(400,"review-analysis-target-required");
        return evidence_->Create(hit,"structured","",authorize,observations);
    }catch(...){return Error(503,"evidence-create-failed");}
}
} // namespace ingress
