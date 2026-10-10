// 파일 용도: 실제 녹화 파일을 통해 검색 application의 페이지·권한·재생 결박을 검사한다.
#define main SearchApplicationFixtureMain
#include "recording_public_timeline_smoke.cpp"
#undef main
#include <set>
int main(int argc,char** argv){
    if(argc!=2)return 2;
    gst_init(nullptr,nullptr);
    int pass=0,fail=0;auto check=[&](bool ok,const char* name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++pass:++fail;};
    try {
        Store store(std::filesystem::weakly_canonical(argv[1])/"store");
        const auto intent=PrepareMedia(store,true);
        recording::DerivedJobService jobs(store.catalog,store.journal,{store.root,30000,{}});
        const auto done=jobs.Run(intent.job_id);if(!done.complete)throw std::runtime_error(done.reason);
        recording::RecordingReadService reader(store.catalog);
        ingress::RecordingApplicationService app(reader,store.catalog,true,{});
        using Query=std::unordered_map<std::string,std::string>;
        const Query base{{"channelIds","probe-channel"},{"startTimeMs","1789200000000"},{"endTimeMs","1789200003000"},{"limit","1"}};
        auto auth=[](const std::string& c){return c=="probe-channel";};
        auto request=[&](const Query& q){return app.Search(q,"operator-a","scope-a",auth);};
        auto first=request(base);if(first.status!=200)throw std::runtime_error(first.body);
        check(first.body.find("\"appliedQuery\":{")!=std::string::npos&&first.body.find("\"statisticsScope\":\"query-matches\"")!=std::string::npos&&first.body.find("\"startTimeMs\":1789200000000")!=std::string::npos,"additive applied query and snapshot statistics scope");
        {
            const auto owner=store.catalog.SearchResidency();
            check(first.memory.bytes()>0,"MEM84 application response retains actual shared owner");
            std::vector<ingress::ApplicationServiceResult> held;
            const auto response_bytes=first.memory.bytes();
            while(held.size()<64&&owner->limit()-owner->used()>=response_bytes)held.push_back(first);
            const auto saturated=owner->used();bool rejected_copy=false;
            try {auto extra=first;(void)extra;}catch(const recording::RecordingResourceUnavailable&){rejected_copy=true;}
            check(rejected_copy&&owner->used()==saturated,"MEM84 response deep copy refuses before bytes and rolls back");
            const auto denied=request(base);
            check(denied.status==503&&owner->used()==saturated,"MEM84 actual search refuses while response consumers hold shared budget");
            check(app.Search(base,"operator-a","scope-a",[](const auto&){return false;}).status==403,
                "MEM84 budget saturation does not change authorization refusal");
            held.clear();
            check(owner->used()<saturated&&request(base).status==200,"MEM84 final response consumers release and actual search resumes");
            std::cout<<"[search-owner] saturated="<<saturated<<" responseBytes="<<response_bytes<<" resumed="<<owner->used()<<std::endl;
        }
        auto json=Json(first.body);const auto snapshot=Field(json,"snapshotId");
        std::set<std::string> ids;std::vector<JsonObject> all;Query page=base;std::string cursor;
        for(int n=0;n<20;++n){auto response=request(page);if(response.status!=200)throw std::runtime_error(response.body);
            auto body=Json(response.body);auto items=Objects(body,"items");for(const auto& item:items){ids.insert(Field(item,"id"));all.push_back(item);}
            cursor=Field(body,"nextCursor");if(cursor=="null")break;page["cursor"]=cursor;}
        check(!all.empty()&&ids.size()==all.size()&&all.size()==std::stoull(Field(json,"knownCount")),"pages preserve exact unique membership and count");
        auto next=base;next["cursor"]=Field(json,"nextCursor");
        check(app.Search(next,"operator-b","scope-a",auth).status==403,"cursor rejects other principal");
        check(app.Search(next,"operator-a","scope-b",auth).status==403,"cursor rejects changed scope");
        next["limit"]="2";check(request(next).status==403,"cursor rejects changed query");
        auto invalid=base;invalid["cursor"]="";check(request(invalid).status==400,"empty explicit cursor rejected");
        invalid=base;invalid["unknown"]="1";check(request(invalid).status==400,"unknown field rejected");
        invalid=base;invalid["channelIds"]="probe-channel,forbidden";check(request(invalid).status==403,"mixed unauthorized channels rejected");
        invalid=base;invalid["limit"]="0";check(request(invalid).status==400,"zero page limit rejected");
        Query seek=base;seek["snapshotId"]=snapshot;seek["hitId"]="not-a-member";
        check(app.SearchSeek(seek,"operator-a","scope-a",auth).status==410,"nonmember hit rejected");
        bool event=false,original=false,seek_ok=false,fallback=false,redacted=true;
        // 각 hit 선택은 동일한 전체 페이지 snapshot을 사용한다.
        auto whole=base;whole["limit"]="200";auto full=request(whole);auto full_json=Json(full.body);
        for(const auto& item:Objects(full_json,"items")){
            const bool preferred=Field(item,"selectionReason")=="event-priority";event|=preferred;original|=!preferred;
            redacted &= full.body.find(store.root.string())==std::string::npos&&full.body.find("playback_job_id")==std::string::npos&&full.body.find("storeId")==std::string::npos;
            if(!preferred)continue;
            auto selected=whole;selected["snapshotId"]=Field(full_json,"snapshotId");selected["hitId"]=Field(item,"id");
            auto located=app.SearchSeek(selected,"operator-a","scope-a",auth);auto target=Json(located.body);
            seek_ok|=located.status==200&&Field(target,"seekAvailable")=="true"&&Field(target,"playbackUrl")==Field(item,"playbackUrl");
            const auto url=Field(item,"playbackUrl");const auto id=url.substr(url.find_last_of('/')+1);
            const auto location=store.catalog.FindSegmentMediaLocation(id);if(!location)throw std::runtime_error("missing location");
            const auto path=location->first/location->second;const auto hidden=path.string()+".held";
            std::filesystem::rename(path,hidden);
            auto result=app.SearchSeek(selected,"operator-a","scope-a",auth);auto body=Json(result.body);
            fallback|=result.status==200&&Field(body,"playable")=="true"&&Field(body,"playbackUrl")=="/ops/api/recordings/media/"+Field(item,"segmentId");
            std::filesystem::rename(hidden,path);
        }
        check(event&&original,"partial event preserves uncovered original results");
        check(seek_ok,"preferred event resolves current file presentation target");
        check(fallback,"missing event file falls back to healthy original");
        check(redacted,"public result excludes internal paths and storage identity");
    }catch(const std::exception& e){std::cerr<<e.what()<<'\n';++fail;}
    std::cout<<"[search-application] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
}
