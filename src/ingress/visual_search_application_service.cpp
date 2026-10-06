// 파일 용도: 현재 channel 권한·원본 검증 뒤 local text→video 검색과 재생을 연결한다.
#include "ingress/visual_search_application_service.h"
#include "ingress/evidence_application_service.h"
#include "analysis/event_storage.h"
#include <algorithm>
#include <charconv>
#include <cmath>
#include <iomanip>
#include <limits>
#include <set>
#include <sstream>
#include <sys/stat.h>
namespace ingress {
namespace {
using Query=VisualSearchApplicationService::Query;
std::string Quote(const std::string& value){
    constexpr char hex[]="0123456789abcdef";std::string s="\"";
    for(unsigned char c:value){if(c=='"'||c=='\\'){s+='\\';s+=char(c);}else if(c<32){s+="\\u00";s+=hex[c>>4];s+=hex[c&15];}else s+=char(c);}return s+'"';
}
std::string Get(const Query& q,const char* key){const auto it=q.find(key);return it==q.end()?"":it->second;}
ApplicationServiceResult Error(int status,const char* reason){return {status,status==400?"Bad Request":status==403?"Forbidden":status==410?"Gone":"Service Unavailable","{\"error\":"+Quote(reason)+"}"};}
bool Integer(const std::string& s,std::int64_t* value){if(s.empty())return false;const auto p=std::from_chars(s.data(),s.data()+s.size(),*value);return p.ec==std::errc{}&&p.ptr==s.data()+s.size()&&*value>=0;}
bool Parse(const Query& raw,recording::VisualSearchQuery* q){
    const std::set<std::string> keys{"text","channelIds","limit","threshold","startTimeMs","endTimeMs"};
    for(const auto& entry:raw)if(!keys.count(entry.first))return false;
    if(!raw.count("text")||Get(raw,"text").size()>analysis::Siglip2Encoder::kMaxTextBytes)return false;
    const auto ids=Get(raw,"channelIds");if(ids.empty()||ids.size()>32*1025)return false;
    std::size_t begin=0;std::set<std::string> unique;
    while(begin<=ids.size()){const auto end=ids.find(',',begin);const auto id=ids.substr(begin,end==std::string::npos?end:end-begin);
        if(!recording::ValidateRecordingReferenceId(id,nullptr)||!unique.insert(id).second||unique.size()>32)return false;
        q->channels.push_back(id);if(end==std::string::npos)break;begin=end+1;}
    if(raw.count("limit")){std::int64_t n;if(!Integer(Get(raw,"limit"),&n)||n<1||n>200)return false;q->top_k=std::size_t(n);}
    q->threshold=-1;
    if(raw.count("threshold")){const auto value=Get(raw,"threshold");std::istringstream in(value);in.imbue(std::locale::classic());
        in>>std::noskipws>>q->threshold;if(!in||in.peek()!=std::char_traits<char>::eof()||!std::isfinite(q->threshold)||q->threshold< -1||q->threshold>1)return false;}
    if(raw.count("startTimeMs")!=raw.count("endTimeMs"))return false;
    if(raw.count("startTimeMs")){std::int64_t a,b;const auto max=std::numeric_limits<std::int64_t>::max()/1000000;
        if(!Integer(Get(raw,"startTimeMs"),&a)||!Integer(Get(raw,"endTimeMs"),&b)||a>=b||b>max)return false;
        q->start_utc_ns=a*1000000;q->end_utc_ns=b*1000000;}
    q->contract=recording::VisualEmbeddingContract::Siglip2();return true;
}
struct Flight {
    std::atomic<unsigned>& count;bool admitted{false};
    explicit Flight(std::atomic<unsigned>& c):count(c){auto n=count.load();while(n<4){if(count.compare_exchange_weak(n,n+1)){admitted=true;break;}}}
    ~Flight(){if(admitted)--count;}
};
// 한 요청 안에서만 재사용한다. 교체된 cache의 FD도 최종 선택 결과가 보유하면 응답까지 유지한다.
class RequestMedia {
    using Prepared=recording::RecordingVisualSource::PreparedSource;
    using Key=std::pair<std::string,std::string>;
    struct Entry {std::unique_ptr<Prepared> proof;std::size_t bytes;std::uint64_t used;};
    const recording::RecordingVisualSource& source_;
    std::function<bool()> cancelled_;
    std::chrono::steady_clock::time_point deadline_;
    std::map<Key,Entry> entries_;
    std::size_t bytes_{0},peak_bytes_{0};std::uint64_t sequence_{0},prepared_{0},reused_{0};
    const std::uint64_t started_{recording::RecordingReadService::TracePreparationStarted()};
    const char* trace_reference_;
public:
    RequestMedia(const recording::RecordingVisualSource& source,std::function<bool()> cancelled,
        std::chrono::steady_clock::time_point deadline,const char* trace_reference="visual-search-request")
        :source_(source),cancelled_(std::move(cancelled)),deadline_(deadline),trace_reference_(trace_reference){}
    ~RequestMedia(){recording::RecordingReadService::TracePreparationCompleted(
        trace_reference_,started_,prepared_,reused_,peak_bytes_);}
private:
    Prepared* Acquire(const recording::VisualSearchDocument& doc,std::unique_ptr<Prepared>& temporary,std::string* error){
        constexpr std::size_t capacity=8*1024*1024,fd_capacity=200;
        const Key key{doc.channel_id,doc.segment_id};auto found=entries_.find(key);
        Prepared* proof=nullptr;
        if(found!=entries_.end()){found->second.used=++sequence_;proof=found->second.proof.get();++reused_;}
        else {
            temporary=source_.Prepare(doc,error,cancelled_,deadline_);if(!temporary)return nullptr;++prepared_;
            const auto cost=temporary->retained_bytes();
            if(cost<=capacity){
                while(!entries_.empty()&&(entries_.size()>=fd_capacity||bytes_>capacity-cost)){
                    const auto oldest=std::min_element(entries_.begin(),entries_.end(),[](const auto& a,const auto& b){return a.second.used<b.second.used;});
                    bytes_-=oldest->second.bytes;entries_.erase(oldest);
                }
                bytes_+=cost;peak_bytes_=std::max(peak_bytes_,bytes_);
                found=entries_.emplace(key,Entry{std::move(temporary),cost,++sequence_}).first;proof=found->second.proof.get();
            } else proof=temporary.get(); // 단일 큰 증명도 기존 지원 범위에서 검증하며 cache에 쌓지 않는다.
        }
        return proof;
    }
public:
    bool Resolve(const recording::VisualSearchDocument& doc,recording::SearchSeekTarget* target,
        std::shared_ptr<const recording::ResolvedRecordingMedia>* hold,std::string* error){
        std::unique_ptr<Prepared> temporary;const auto* proof=Acquire(doc,temporary,error);if(!proof)return false;
        if(!source_.ResolvePrepared(doc,*proof,target,error,cancelled_,deadline_))return false;
        if(hold)*hold=proof->Hold();return true;
    }
    bool Encode(recording::VisualSearchDocument* doc,analysis::Siglip2Encoder& encoder,std::string* error){
        if(!doc->event_id.empty())return source_.Encode(doc,encoder,error,cancelled_);
        std::unique_ptr<Prepared> temporary;const auto* proof=Acquire(*doc,temporary,error);if(!proof)return false;
        return source_.Encode(doc,encoder,error,cancelled_,proof);
    }
};
bool EventFacts(bool enabled,const std::vector<std::string>& channels,
    std::vector<recording::VisualSnapshotEvent>* facts,const std::function<bool()>& cancelled){
    facts->clear();if(cancelled&&cancelled())return false;if(!enabled)return true;
    analysis::EventRecordQueryOptions options;options.search_facts_only=true;options.include_archives=true;options.evidence="snapshot";options.cancelled=cancelled;
    constexpr std::size_t capacity=20000;
    std::size_t returned=0,bytes=0;
    std::map<std::pair<std::string,std::string>,std::string> epochs;
    // 타 채널의 이력은 이 요청의 한도에 포함하지 않는다. 요청 채널 전체의 기존 한도는 유지한다.
    for(const auto& channel:std::set<std::string>(channels.begin(),channels.end())){
        if(cancelled&&cancelled())return false;
        options.channel_id=channel;options.limit=std::max<std::size_t>(1,capacity-returned);
        analysis::EventRecordQueryResult result;std::string error;
        if(!analysis::QueryEventRecords(options,&result,&error)||result.truncated||result.has_more||result.skipped_corrupt_lines||result.partial_line_count||
            result.search_facts.size()>capacity-returned||result.search_fact_bytes>8*1024*1024-bytes)return false;
        returned+=result.search_facts.size();bytes+=result.search_fact_bytes;
        for(const auto& fact:result.search_facts){
            if((cancelled&&cancelled())||fact.channel_id!=channel)return false;
            const auto inserted=epochs.emplace(std::make_pair(fact.event_id,fact.channel_id),fact.stream_epoch_id);
            if(!inserted.second&&inserted.first->second!=fact.stream_epoch_id)return false;
        }
    }
    for(const auto& entry:epochs)facts->push_back({entry.first.first,entry.first.second,entry.second});return true;
}
bool CurrentEvent(const recording::VisualSearchDocument& doc,const std::vector<recording::VisualSnapshotEvent>& events,
    const recording::RecordingVisualSource& source){
    if(doc.event_id.empty())return true;
    const auto key=std::make_pair(doc.event_id,doc.channel_id);
    const auto it=std::lower_bound(events.begin(),events.end(),key,[](const auto& event,const auto& value){
        return std::make_pair(event.event_id,event.channel_id)<value;});
    if(it==events.end()||it->event_id!=doc.event_id||it->channel_id!=doc.channel_id)return false;
    std::string error;const bool current=source.SnapshotMatchesEvent(doc,it->stream_epoch_id,&error);
    if(!error.empty())throw std::runtime_error("visual-snapshot-unavailable");return current;
}
std::string Playback(const recording::VisualSearchDocument& doc,const recording::SearchSeekTarget& seek){
    std::ostringstream out;out.imbue(std::locale::classic());out<<std::setprecision(17)
        <<"\"playbackUrl\":"<<Quote("/ops/api/recordings/media/"+doc.segment_id)
        <<",\"playable\":true,\"seekAvailable\":true,\"targetSeconds\":"<<seek.seconds
        <<",\"frameDurationSeconds\":"<<seek.frame_duration_seconds<<",\"timeBasis\":"<<Quote(seek.basis);return out.str();
}
}
VisualSearchApplicationService::VisualSearchApplicationService(recording::RecordingCatalog& catalog,
    recording::RecordingReadService& reader,Options options,Channels channels)
    :options_(std::move(options)),channels_(std::move(channels)),source_(catalog,reader,options_.snapshot_directory){
    if(!options_.enabled)return;
    if(!channels_||options_.model_directory.empty()||options_.cache_directory.empty()||options_.scan_seconds<1||options_.scan_seconds>3600||options_.sample_seconds<1||options_.sample_seconds>3600)
        throw std::invalid_argument("visual-invalid-config");
    try {
    // 기존 directory의 권한을 임의로 바꾸지 않는다. Store가 owner/symlink 경계를 재검사한다.
    if(::mkdir(options_.cache_directory.c_str(),0700)!=0&&errno!=EEXIST)throw std::runtime_error("visual-cache-unavailable");
    encoder_=std::make_unique<analysis::Siglip2Encoder>(options_.model_directory);
    worker_=std::make_unique<recording::VisualIndexWorker>(recording::VisualIndexStore(options_.cache_directory),
        [this](auto* docs,const auto& cancelled,std::string* error){
            std::vector<std::string> channels;if(!channels_(&channels)){*error="visual-source-unavailable";return false;}
            std::map<std::string,recording::VisualSourceCoverage> counts;
            if(channels.empty())docs->clear();else if(!source_.Collect(channels,options_.sample_seconds,docs,&counts,error,cancelled))return false;
            std::vector<recording::VisualSnapshotEvent> events;
            if(!EventFacts(!options_.snapshot_directory.empty(),channels,&events,cancelled)){*error="visual-source-unavailable";return false;}
            if(!source_.CollectSnapshots(events,docs,&counts,error,cancelled))return false;
            std::lock_guard lock(coverage_mutex_);coverage_=std::move(counts);return true;
        },recording::VisualIndexWorker::EncodeFactory([this]{
            auto media=std::make_shared<RequestMedia>(source_,[this]{return stopped_.load();},std::chrono::steady_clock::time_point::max(),"visual-index-build");
            return [this,media](auto* doc,const auto& cancelled,std::string* error){
                std::unique_lock<std::timed_mutex> lock(inference_,std::defer_lock);
                while(!lock.try_lock_for(std::chrono::milliseconds(25)))if(cancelled())return false;
                if(cancelled())return false;return media->Encode(doc,*encoder_,error);
            };
        }),std::chrono::seconds(options_.scan_seconds));
    worker_->Start();
    } catch(const std::exception&) { worker_.reset(); encoder_.reset(); }
}
VisualSearchApplicationService::~VisualSearchApplicationService(){Stop();}
void VisualSearchApplicationService::Stop(){stopped_=true;if(worker_)worker_->Stop();}
ApplicationServiceResult VisualSearchApplicationService::Status(const Authorize& authorize)const{
    if(!options_.enabled)return {200,"OK","{\"enabled\":false,\"state\":\"disabled\",\"channels\":[]}"};
    if(!worker_)return Error(503,"visual-search-unavailable");
    try{
        std::vector<std::string> channels;if(!channels_(&channels))return Error(503,"visual-search-unavailable");
        const auto status=worker_->Status();const auto index=worker_->Snapshot();
        std::ostringstream out;out<<"{\"enabled\":true,\"state\":"<<Quote(status.state)<<",\"error\":"<<Quote(status.error)
            <<",\"searchAvailable\":"<<((index&&(status.state=="ready"||status.state=="indexing")&&!stopped_)?"true":"false")
            <<",\"sampleSeconds\":"<<options_.sample_seconds<<",\"scanSeconds\":"<<options_.scan_seconds
            <<",\"eventSnapshots\":"<<Quote(options_.snapshot_directory.empty()?"disabled":"verified-original-pixels")<<",\"channels\":[";
        bool comma=false;std::lock_guard lock(coverage_mutex_);
        for(const auto& channel:channels){if(!authorize||!authorize(channel))continue;if(comma)out<<',';comma=true;
            const auto found=coverage_.find(channel);auto c=found==coverage_.end()?recording::VisualSourceCoverage{}:found->second;
            if(const auto it=status.unsupported_segments.find(channel);it!=status.unsupported_segments.end())c.unsupported_segments+=it->second;
            if(const auto it=status.unsupported_snapshots.find(channel);it!=status.unsupported_snapshots.end())c.unsupported_snapshots+=it->second;
            std::size_t count=0;if(index)for(const auto& row:index->documents())if(row.channel_id==channel)++count;
            out<<"{\"channelId\":"<<Quote(channel)<<",\"indexedFrames\":"<<count<<",\"examinedSegments\":"<<c.examined_segments<<",\"unsupportedSegments\":"<<c.unsupported_segments
                <<",\"examinedSnapshots\":"<<c.examined_snapshots<<",\"unsupportedSnapshots\":"<<c.unsupported_snapshots<<'}';}
        out<<"]}";return {200,"OK",out.str()};
    }catch(const std::exception&){return Error(503,"visual-search-unavailable");}
}
ApplicationServiceResult VisualSearchApplicationService::Search(const Query& raw,const Authorize& authorize){
    try{
        recording::VisualSearchQuery query;if(!Parse(raw,&query))return Error(400,"visual-invalid-query");
        for(const auto& channel:query.channels)if(!authorize||!authorize(channel))return Error(403,"recording-channel-forbidden");
        if(!worker_||stopped_)return Error(503,"visual-search-unavailable");
        Flight flight(requests_);if(!flight.admitted)return Error(503,"visual-search-busy");
        std::vector<std::string> current;if(!channels_(&current))return Error(503,"visual-search-unavailable");
        for(const auto& channel:query.channels)if(std::find(current.begin(),current.end(),channel)==current.end())return Error(410,"visual-channel-unavailable");
        const auto index_state=worker_->Status().state;
        if(index_state!="ready"&&index_state!="indexing")return Error(503,"visual-index-not-ready");
        const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(5);
        const auto expired=[&]{return stopped_||std::chrono::steady_clock::now()>=deadline;};
        analysis::Siglip2Encoder::TextInputInfo text;
        {std::unique_lock<std::timed_mutex> lock(inference_,std::defer_lock);
            if(!lock.try_lock_until(std::min(deadline,std::chrono::steady_clock::now()+std::chrono::seconds(2))))return Error(503,"visual-search-busy");
            try{
                text=encoder_->InspectText(Get(raw,"text"));
                if(!text.within_limit)return Error(400,"visual-text-token-limit");
                query.embedding=encoder_->EncodeText(text.original_text);
            }catch(const analysis::Siglip2Encoder::TextInputError& e){return Error(400,e.code());}}
        const auto index=worker_->Snapshot();if(!index)return Error(503,"visual-index-not-ready");
        std::vector<recording::VisualSnapshotEvent> events;
        if(!EventFacts(!options_.snapshot_directory.empty(),query.channels,&events,expired))return Error(503,"visual-source-unavailable");
        std::vector<recording::VisualSearchHit> hits;std::string error;
        RequestMedia media_cache(source_,expired,deadline);
        const auto eligible=[&](const auto& doc){
            if(stopped_||std::chrono::steady_clock::now()>=deadline)throw std::runtime_error("budget");
            if(!authorize(doc.channel_id)||!CurrentEvent(doc,events,source_))return false;
            recording::SearchSeekTarget seek;
            if(source_.IsDeleted(doc))return false;
            if(!media_cache.Resolve(doc,&seek,nullptr,&error)){
                if(!expired()&&source_.IsDeleted(doc))return false;
                throw std::runtime_error("visual-source-unavailable");
            }
            if(expired())throw std::runtime_error("budget");return true;
        };
        if(!index->Search(query,eligible,&hits,&error))return Error(503,"visual-search-unavailable");
        if(expired())return Error(503,"visual-search-busy");
        std::ostringstream out;out.imbue(std::locale::classic());out<<std::setprecision(17)<<"{\"kind\":\"visual-frame\",\"scoreMeaning\":\"similarity-not-evidence\",\"appliedQuery\":{\"text\":"
            <<Quote(text.original_text)<<",\"encoderText\":"<<Quote(text.encoder_text)<<",\"bodyTokens\":"<<text.body_tokens
            <<",\"maxBodyTokens\":"<<analysis::Siglip2Encoder::kTextLength-1<<",\"channelIds\":[";
        for(std::size_t i=0;i<query.channels.size();++i){if(i)out<<',';out<<Quote(query.channels[i]);}
        out<<"],\"startTimeMs\":"<<(query.start_utc_ns?std::to_string(*query.start_utc_ns/1000000):"null")
            <<",\"endTimeMs\":"<<(query.end_utc_ns?std::to_string(*query.end_utc_ns/1000000):"null")
            <<",\"threshold\":"<<query.threshold<<",\"limit\":"<<query.top_k<<"},\"items\":[";
        std::vector<std::shared_ptr<const recording::ResolvedRecordingMedia>> response_holds;response_holds.reserve(hits.size());
        bool comma=false;for(const auto& hit:hits){const auto& d=index->documents()[hit.document_index];
            if(stopped_||std::chrono::steady_clock::now()>=deadline)return Error(503,"visual-search-busy");
            recording::SearchSeekTarget seek;std::shared_ptr<const recording::ResolvedRecordingMedia> media;
            if(!authorize(d.channel_id)||!media_cache.Resolve(d,&seek,&media,&error))return Error(503,"visual-source-changed");
            response_holds.push_back(std::move(media));
            if(comma)out<<',';comma=true;out<<"{\"id\":"<<Quote(d.id)<<",\"kind\":"<<Quote(d.event_id.empty()?"representative-frame":"event-snapshot")<<",\"channelId\":"<<Quote(d.channel_id)<<",\"score\":"<<hit.score<<",\"timeNs\":"<<(d.utc_ns?Quote(std::to_string(*d.utc_ns)):"null")<<','<<Playback(d,seek)<<'}';}
        if(expired())return Error(503,"visual-search-busy");
        out<<"]}";return {200,"OK",out.str()};
    }catch(const std::exception&){return Error(503,"visual-search-unavailable");}
}
ApplicationServiceResult VisualSearchApplicationService::Seek(const Query& raw,const Authorize& authorize){
    try{
        const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(5);
        const auto expired=[&]{return stopped_||std::chrono::steady_clock::now()>=deadline;};
        if(raw.size()!=2||!raw.count("hitId")||!raw.count("channelId")||Get(raw,"hitId").empty()||Get(raw,"hitId").size()>1024||!recording::ValidateRecordingReferenceId(Get(raw,"channelId"),nullptr))return Error(400,"visual-invalid-query");
        const auto channel=Get(raw,"channelId");if(!authorize||!authorize(channel))return Error(403,"recording-channel-forbidden");
        if(!worker_||stopped_)return Error(503,"visual-search-unavailable");
        Flight flight(requests_);if(!flight.admitted)return Error(503,"visual-search-busy");
        std::vector<std::string> current;if(!channels_(&current))return Error(503,"visual-search-unavailable");
        if(std::find(current.begin(),current.end(),channel)==current.end())return Error(410,"visual-channel-unavailable");
        const auto index=worker_->Snapshot();if(!index)return Error(503,"visual-index-not-ready");
        const auto id=Get(raw,"hitId");const auto& docs=index->documents();const auto it=std::lower_bound(docs.begin(),docs.end(),id,[](const auto& d,const auto& key){return d.id<key;});
        if(it==docs.end()||it->id!=id||it->channel_id!=channel)return Error(410,"visual-hit-unavailable");
        if(!it->event_id.empty()){
            std::vector<recording::VisualSnapshotEvent> events;
            if(!EventFacts(!options_.snapshot_directory.empty(),{channel},&events,expired))return Error(503,"visual-source-unavailable");
            if(!CurrentEvent(*it,events,source_))return Error(410,"visual-hit-unavailable");
        }
        recording::SearchSeekTarget seek;std::unique_ptr<recording::ResolvedRecordingMedia> media;std::string error;
        const auto resolved=source_.Resolve(*it,&seek,&media,&error,expired,deadline);
        if(expired())return Error(503,"visual-search-busy");
        if(!resolved)return Error(410,"visual-hit-unavailable");
        return {200,"OK","{\"hitId\":"+Quote(it->id)+","+Playback(*it,seek)+"}"};
    }catch(const std::exception&){return Error(503,"visual-search-unavailable");}
}
ApplicationServiceResult VisualSearchApplicationService::Evidence(const Query& raw,const Authorize& authorize,
    EvidenceApplicationService& evidence){
    try{
        if(raw.size()!=2||!raw.count("hitId")||!raw.count("channelId")||Get(raw,"hitId").empty()||Get(raw,"hitId").size()>1024||
            !recording::ValidateRecordingReferenceId(Get(raw,"channelId"),nullptr))return Error(400,"visual-invalid-query");
        const auto channel=Get(raw,"channelId");if(!authorize||!authorize(channel))return Error(403,"recording-channel-forbidden");
        if(!worker_||stopped_)return Error(503,"visual-search-unavailable");
        Flight flight(requests_);if(!flight.admitted)return Error(503,"visual-search-busy");
        std::vector<std::string> current;if(!channels_(&current))return Error(503,"visual-search-unavailable");
        if(std::find(current.begin(),current.end(),channel)==current.end())return Error(410,"visual-channel-unavailable");
        const auto index=worker_->Snapshot();if(!index)return Error(503,"visual-index-not-ready");
        const auto id=Get(raw,"hitId");const auto& docs=index->documents();
        const auto it=std::lower_bound(docs.begin(),docs.end(),id,[](const auto& d,const auto& key){return d.id<key;});
        if(it==docs.end()||it->id!=id||it->channel_id!=channel)return Error(410,"visual-hit-unavailable");
        const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(5);
        const auto expired=[&]{return stopped_||std::chrono::steady_clock::now()>=deadline;};
        if(!it->event_id.empty()){
            std::vector<recording::VisualSnapshotEvent> events;
            if(!EventFacts(!options_.snapshot_directory.empty(),{channel},&events,expired))return Error(503,"visual-source-unavailable");
            if(!CurrentEvent(*it,events,source_))return Error(410,"visual-hit-unavailable");
        }
        recording::SearchSeekTarget seek;std::unique_ptr<recording::ResolvedRecordingMedia> media;std::string error;
        if(!source_.Resolve(*it,&seek,&media,&error,expired,deadline))return Error(410,"visual-hit-unavailable");
        recording::SearchDocument hit;hit.id=it->id;hit.channel_id=it->channel_id;hit.segment_id=it->segment_id;
        hit.media_pts=it->media_pts;hit.time_base_num=it->time_base_num;hit.time_base_den=it->time_base_den;
        if(it->utc_ns&&*it->utc_ns<INT64_MAX){hit.start_ns=it->utc_ns;hit.end_ns=*it->utc_ns+1;}
        hit.time_provenance="visual-source-mapping";
        if(!it->event_id.empty())hit.event_ids.push_back(it->event_id);
        return evidence.Create(hit,"visual",it->media_sha256,authorize);
    }catch(...){return Error(503,"evidence-create-failed");}
}
} // namespace ingress
