// 파일 용도: 서버 소유 hit의 증거 패키지 생성과 현재 scope를 재검사하는 조회.
#include "ingress/evidence_application_service.h"
#include <algorithm>

namespace ingress {
namespace {
using recording::EvidenceJsonQuote;
ApplicationServiceResult Error(int status,const char* code){
    return {status,status==400?"Bad Request":status==403?"Forbidden":status==404?"Not Found":"Service Unavailable",
        "{\"error\":"+EvidenceJsonQuote(code)+"}"};
}
std::string Value(const EvidenceApplicationService::Query& query,const char* key){
    const auto it=query.find(key);return it==query.end()?"":it->second;
}
struct Reading {
    std::atomic<unsigned>& count;bool admitted;
    explicit Reading(std::atomic<unsigned>& c):count(c),admitted(c.fetch_add(1)<4){}
    ~Reading(){count.fetch_sub(1);}
};
recording::EvidencePackageStore::Limits Limits(std::uint64_t reserve){
    recording::EvidencePackageStore::Limits limits;
    limits.reserved_free_bytes=std::max(limits.reserved_free_bytes,reserve);return limits;
}
std::string Summary(const std::string& id,const recording::EvidencePackageV1& v){
    return "{\"id\":"+EvidenceJsonQuote(id)+",\"channelId\":"+EvidenceJsonQuote(v.channel_id)+
        ",\"status\":"+EvidenceJsonQuote(v.status)+",\"createdAtMs\":"+std::to_string(v.created_at_ms)+
        ",\"frames\":"+std::to_string(v.frames.size())+",\"assets\":"+std::to_string(v.assets.size())+"}";
}
}
EvidenceApplicationService::EvidenceApplicationService(recording::RecordingCatalog& catalog,
    recording::RecordingReadService& reader,bool enabled,const std::filesystem::path& directory,std::uint64_t reserve)
    :enabled_(enabled),catalog_(catalog),store_(directory,Limits(reserve)),builder_(catalog,reader,store_){
    if(enabled_){std::string error;ready_=store_.Recover(&error);}
}
ApplicationServiceResult EvidenceApplicationService::Create(const recording::SearchDocument& hit,
    const std::string& kind,const std::string& expected,const Authorize& authorize,bool observations){
    if(!authorize||!authorize(hit.channel_id))return Error(403,"recording-channel-forbidden");
    if(!enabled_||stopped_)return Error(503,"evidence-disabled");
    if(!ready_)return Error(503,"evidence-store-unavailable");
    if(creating_.exchange(true))return Error(503,"evidence-busy");
    struct Release{std::atomic<bool>& flag;~Release(){flag=false;}}release{creating_};
    recording::EvidenceFailure diagnostic;
    try{
        const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(30);
        const auto cancelled=[&]{return stopped_||!authorize(hit.channel_id)||std::chrono::steady_clock::now()>=deadline;};
        recording::EvidencePackageV1 manifest;std::string id,error;
        if(!(observations?builder_.CreateWithObservations(hit,kind,expected,&id,&manifest,&error,deadline,cancelled,&diagnostic):
            builder_.Create(hit,kind,expected,&id,&manifest,&error,deadline,cancelled,&diagnostic))){
            if(error=="evidence-publication-uncertain"&&recording::EvidencePackageStore::ValidId(id)){
                recording::TraceEvidenceFailure(diagnostic,"evidence-publication-uncertain");
                return {503,"Service Unavailable","{\"error\":\"evidence-publication-uncertain\",\"id\":"+EvidenceJsonQuote(id)+"}"};}
            // 내부 parser/media 오류에는 경로가 포함될 수 있어 허용한 값만 공개한다.
            const char* code=error=="evidence-capacity"?"evidence-capacity":error=="evidence-disk-reserve"?"evidence-disk-reserve":
                error=="evidence-timeout"?"evidence-timeout":error=="evidence-store-busy"?"evidence-busy":"evidence-create-failed";
            recording::TraceEvidenceFailure(diagnostic,code);
            return Error(503,code);
        }
        if(!authorize(hit.channel_id))return Error(403,"recording-channel-forbidden");
        return {201,"Created",Summary(id,manifest)};
    }catch(...){diagnostic.Note("application","evidence-exception",true);recording::TraceEvidenceFailure(diagnostic,"evidence-create-failed");return Error(503,"evidence-create-failed");}
}
ApplicationServiceResult EvidenceApplicationService::List(const Query& query,const Authorize& authorize){
    if((query.size()!=1&&query.size()!=2)||!query.count("channelId")||(query.size()==2&&!query.count("after"))||
        !recording::ValidateRecordingReferenceId(Value(query,"channelId"),nullptr)||
        (query.count("after")&&!recording::EvidencePackageStore::ValidId(Value(query,"after"))))return Error(400,"evidence-invalid-query");
    const auto channel=Value(query,"channelId");
    if(!authorize||!authorize(channel))return Error(403,"recording-channel-forbidden");
    if(!enabled_||stopped_)return Error(503,"evidence-disabled");
    if(!ready_)return Error(503,"evidence-store-unavailable");
    Reading flight(reading_);if(!flight.admitted)return Error(503,"evidence-busy");
    try{
        const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(5);
        const auto cancelled=[&]{return stopped_||std::chrono::steady_clock::now()>=deadline;};
        std::vector<std::string> ids;std::string error;
        if(!store_.ListIds(&ids,&error))return Error(503,"evidence-store-unavailable");
        std::string json="{\"items\":[",last;unsigned count=0;bool more=false;
        for(const auto& id:ids){
            if(id<=Value(query,"after"))continue;
            const auto file=store_.Open(id,&error,cancelled);
            if(!file)return Error(503,"evidence-store-unavailable");
            if(file->manifest().schema!="media-server.evidence-package.v1"||file->manifest().channel_id!=channel)continue;
            if(count==20){more=true;break;}
            if(count++)json+=',';json+=Summary(id,file->manifest());last=id;
        }
        if(cancelled())return Error(503,"evidence-busy");
        json+="],\"nextAfter\":"+(more?EvidenceJsonQuote(last):"null")+"}";
        return {200,"OK",std::move(json)};
    }catch(...){return Error(503,"evidence-store-unavailable");}
}
ApplicationServiceResult EvidenceApplicationService::Get(const std::string& id,const Authorize& authorize) try {
    if(!recording::EvidencePackageStore::ValidId(id))return Error(400,"evidence-invalid-id");
    if(!enabled_||stopped_)return Error(503,"evidence-disabled");
    if(!ready_)return Error(503,"evidence-store-unavailable");
    Reading flight(reading_);if(!flight.admitted)return Error(503,"evidence-busy");
    const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(5);
    std::string error;const auto file=store_.Open(id,&error,[&]{return stopped_||std::chrono::steady_clock::now()>=deadline;});
    if(!file)return Error(error=="evidence-not-found"?404:503,"evidence-unavailable");
    const auto& manifest=file->manifest();
    if(!authorize||!authorize(manifest.channel_id))return Error(403,"recording-channel-forbidden");
    if(manifest.schema!="media-server.evidence-package.v1")return Error(404,"evidence-unavailable");
    std::string current="[";bool comma=false;
    for(const auto& r:manifest.references)if(r.kind=="recording"||r.kind=="clip"){
        if(r.state=="not-applicable")continue;
        const bool deleted=catalog_.IsDeletedSegmentId(r.id);
        const auto v2=catalog_.FindSegmentV2ById(r.id);const auto v1=catalog_.FindSegmentById(r.id);
        const std::string state=deleted?"deleted":v2||v1?"catalogued-not-revalidated":"missing";
        if(comma)current+=',';comma=true;
        current+="{\"kind\":"+EvidenceJsonQuote(r.kind)+",\"id\":"+EvidenceJsonQuote(r.id)+",\"state\":"+EvidenceJsonQuote(state)+"}";
    }
    current+=']';
    return {200,"OK","{\"id\":"+EvidenceJsonQuote(id)+",\"manifest\":"+recording::SerializeEvidencePackage(manifest)+",\"currentSources\":"+current+"}"};
} catch(const recording::RecordingRetainedReadError&) {
    return Error(503,"evidence-unavailable");
}
std::shared_ptr<recording::EvidencePackageFile> EvidenceApplicationService::Asset(const std::string& id,
    std::size_t index,const Authorize& authorize,int* status,bool observations){
    if(status)*status=503;
    if(!enabled_||!ready_||stopped_||!authorize)return {};
    Reading flight(reading_);if(!flight.admitted)return {};
    const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(5);
    std::string error;auto file=store_.Open(id,&error,[&]{return stopped_||std::chrono::steady_clock::now()>=deadline;});
    if(!file){if(status)*status=error=="evidence-not-found"?404:503;return {};}
    if(!authorize(file->manifest().channel_id)){if(status)*status=403;return {};}
    if(file->manifest().schema!=(observations?"media-server.evidence-package.v2":"media-server.evidence-package.v1")){if(status)*status=404;return {};}
    if(index>=file->manifest().assets.size()){if(status)*status=404;return {};}
    if(status)*status=200;
    return file;
}
} // namespace ingress
