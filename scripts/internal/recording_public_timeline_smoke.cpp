// 파일 용도: actual V2 원본과 파생 출력의 공개 timeline 투영을 서버 없이 검사한다.
#include "recording_media_test_fixture.h"
#include "ingress/recording_application_service.h"
#include <iostream>
#include <fstream>
#include "recording/recording_derived_job_service.h"
#include "recording/recording_derived_selection.h"
#include <limits>
#include "domain/strict_json.h"
using JsonObject=ingress::StrictJsonObjectDocument;
JsonObject Json(const std::string& text){
    JsonObject result;std::string error;
    if(!ingress::ParseStrictJsonObjectDocument(text,&result,&error))throw std::runtime_error("fixture-json:"+error);
    return result;
}
std::string Field(const JsonObject& value,const std::string& key){
    const auto* field=value.Find(key);return field?(field->type==ingress::StrictJsonType::String?field->string_value:field->raw):"";
}
std::vector<JsonObject> Objects(const JsonObject& value,const std::string& key){
    const auto* field=value.Find(key);std::vector<JsonObject> result;
    if(!field||field->type!=ingress::StrictJsonType::Array)return result;
    bool quoted=false,escape=false;int depth=0;std::size_t begin=0;
    for(std::size_t i=0;i<field->raw.size();++i){const char c=field->raw[i];
        if(quoted){if(escape)escape=false;else if(c=='\\')escape=true;else if(c=='"')quoted=false;continue;}
        if(c=='"'){quoted=true;continue;}if(c=='{'){if(depth++==0)begin=i;}
        if(c=='}'&&--depth==0)result.push_back(Json(field->raw.substr(begin,i-begin+1)));
    }
    return result;
}
std::string OpaqueKey(const std::string& value){return std::to_string(value.size())+":"+value;}
recording::RecordingSegmentV2 MappedSource(Store& store, recording::RecordingSegmentV2 source,
    const std::string& id, int count, std::optional<std::int64_t> utc, bool same_time=false,bool alternating_unknown=false,
    const std::string& unknown_reason="fixture-unplaced",bool open_tail=false) {
    const auto old=store.catalog.FindSegmentMediaLocation(source.segment_id);
    source.segment_id=id; source.order_request_id=id+"-order"; source.media_epoch_id=id+"-epoch";
    recording::RecordingOrderReservationV1 order; std::string error;
    if(!old||!store.journal.ReserveRecordingOrder("probe-store",source.order_request_id,id,source.channel_id,&order,&error))throw std::runtime_error(error);
    source.order_sequence=order.sequence; source.time_base_num=1; source.time_base_den=1000000000;
    source.media_start_pts=0; source.media_end_pts=count; source.mappings.clear();
    for(int i=0;i<count;++i){
        const bool known=utc&&!(alternating_unknown&&i%2==0);
        const auto a=known?std::optional<std::int64_t>(*utc+(same_time?0:i)):std::nullopt;
        const auto b=a?std::optional<std::int64_t>(*a+1):std::nullopt;
        source.mappings.push_back({"media-server.recording-utc-mapping.v1",id+"-map-"+std::to_string(i),i,i+1,
            known?"source-capture":"unknown",a,b,known?std::optional<std::int64_t>(0):std::nullopt,known?"":unknown_reason});
    }
    if(open_tail){source.media_end_pts.reset();source.mappings.back().end_pts.reset();}
    const auto path=store.root/(source.channel_id+"/"+id+".mp4"); std::filesystem::copy_file(old->first/old->second,path);
    if(!store.catalog.FinalizeSegmentV2(source,path.string(),&error))throw std::runtime_error(error);
    return source;
}
recording::RecordingSegmentV2 CloneSource(Store& store,recording::RecordingSegmentV2 source,const std::string& id,bool fractional){
    const auto old=store.catalog.FindSegmentMediaLocation(source.segment_id);if(!old)throw std::runtime_error("source location");
    source.segment_id=id;source.order_request_id=id+"-order";source.media_epoch_id=id+"-epoch";
    recording::RecordingOrderReservationV1 order;std::string error;
    if(!store.journal.ReserveRecordingOrder("probe-store",source.order_request_id,id,source.channel_id,&order,&error))throw std::runtime_error(error);
    source.order_sequence=order.sequence;
    if(fractional){source.time_base_num=1;source.time_base_den=3;source.media_start_pts=1;source.media_end_pts=2;}
    source.mappings={{"media-server.recording-utc-mapping.v1",id+"-mapping",source.media_start_pts,source.media_end_pts,
        "source-capture",1789200000000000000LL,1789200000100000000LL,0,""}};
    const auto path=store.root/(source.channel_id+"/"+id+".mp4");std::filesystem::copy_file(old->first/old->second,path);
    if(!store.catalog.FinalizeSegmentV2(source,path.string(),&error))throw std::runtime_error(error);return source;
}
recording::DerivedJobIntentV1 PrepareMedia(Store& store,bool partial,int mapping_mode=0) {
    auto input=Encode(30,false,false);Shift(input,7000000000ULL);
    std::unique_ptr<Store> staging;
    if(mapping_mode)staging=std::make_unique<Store>(store.root.parent_path()/(store.root.filename().string()+"-writer"));
    auto& written=staging?*staging:store;
    recording::GStreamerSegmentWriter::Options options(written.root,1000);
    options.managed_journal=&written.journal;options.managed_catalog=&written.catalog;options.managed_store_id="probe-store";
    recording::GStreamerSegmentWriter writer(options);std::string error;
    if(!writer.Start("probe-channel","unused",input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error(error);
    for(const auto& packet:input.packets)writer.Push(packet,0);writer.Stop();
    if(mapping_mode)for(auto source:written.Segments()){
        const auto binding=*written.catalog.FindSourceBinding(source.segment_id);
        const auto location=*written.catalog.FindSegmentMediaLocation(source.segment_id);
        for(auto& mapping:source.mappings)if(mapping.utc_start_ns)mapping.utc_end_ns=*mapping.utc_start_ns+1;
        recording::RecordingOrderReservationV1 order;
        if(!store.journal.ReserveRecordingOrder(source.store_id,source.order_request_id,source.segment_id,source.channel_id,&order,&error))throw std::runtime_error(error);
        source.order_sequence=order.sequence;
        const auto path=store.root/source.channel_id/(source.segment_id+".mp4");std::filesystem::create_directories(path.parent_path());
        std::filesystem::copy_file(location.first/location.second,path);
        if(!store.catalog.FinalizeBoundSegmentV2(source,binding,path.string(),&error))throw std::runtime_error(error);
    }
    std::vector<recording::DerivedSourceEvidence> sources;
    for(const auto& segment:store.Segments())sources.push_back({segment,store.catalog.FindSourceBinding(segment.segment_id),false});
    analysis::DecodedIntervalCollector collector;
    for(const auto& p:input.packets){analysis::DecodedIntervalEvidence e;e.analysis_pts_ns=p.pts;e.duration_ns=p.observation->duration_ns;
        e.association={analysis::SourceAssociationQuality::TimestampMatch,analysis::OriginalSampleIdentity{p.observation->source_generation,p.observation->generation_order,p.observation->ordinal,p.track_id,*p.observation->pts_ns}};collector.Append(std::move(e));}
    recording::RecordingConsumerReferenceV1 ref;ref.reference_id="public-media-ref";ref.kind="event";ref.owner_id="public-media-event";
    ref.source_id="probe-channel";ref.channel_id="probe-channel";ref.analysis_namespace="public-media-ns";ref.analysis_track_id="track-1";
    ref.association_quality="timestamp-match";ref.original=recording::RecordingConsumerOriginalV1{"probe-generation-a",1,1,"video-0",7000000000ULL};
    ref.request=recording::RecordingConsumerRequestV1{"media-pts-ms",partial?6500:7000,8500,0,0};
    recording::DerivedRecordingSelection selection;recording::DerivedJobIntentV1 intent;
    if(!recording::SelectDerivedRecording(ref,*collector.Snapshot(ref.analysis_namespace),sources,nullptr,&selection,&error)||
       !recording::BuildDerivedJobIntent(selection,sources,8*1024*1024,10,&intent,&error))throw std::runtime_error(error);
    recording::RetentionCoordinator retention(store.catalog,[&]{return store.catalog.RetentionSnapshot();},[](auto* bytes,auto*){*bytes=1024ULL*1024*1024;return true;},[](const auto&,auto*){return false;},{0,1,store.root});
    if(!retention.UpdateChannelPolicy("probe-channel",{1024ULL*1024*1024,0,1024ULL*1024*1024,0},&error)||!retention.AdmitDerivedJob(store.catalog,intent,10).accepted)throw std::runtime_error("intent admission");
    return intent;
}

int main(int argc,char** argv){
    if(argc!=2)return 2;gst_init(nullptr,nullptr);Store store(std::filesystem::path(argv[1])/"store");
    auto input=Encode(18,false,false);Shift(input,0);
    recording::GStreamerSegmentWriter::Options options(store.root,1000);
    options.managed_journal=&store.journal;options.managed_catalog=&store.catalog;options.managed_store_id="probe-store";
    recording::GStreamerSegmentWriter writer(options);std::string error;
    if(!writer.Start("probe-channel","unused",input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error(error);
    for(const auto& packet:input.packets)writer.Push(packet,0);writer.Stop();
    recording::RecordingReadService reader(store.catalog);
    ingress::RecordingApplicationService app(reader,store.catalog,true,{});
    const auto response=app.Timeline({{"channelId","probe-channel"},{"startTimeMs","1789200000000"},{"endTimeMs","1789200002000"}},[](const auto&){return true;});
    const bool ok=response.status==200&&response.body.find("\"total\":2")!=std::string::npos&&
        response.body.find("\"startTimeMs\":\"1789200000000\"")!=std::string::npos&&response.body.find("\"unplacedItems\":[]")!=std::string::npos;
    int pass=0,fail=0;auto check=[&](bool value,const char* title){std::cout<<(value?"[pass] ":"[fail] ")<<title<<'\n';value?++pass:++fail;};
    check(ok,"D3B-01 actual V2 원본·문자열 UTC·독립 unplaced 응답");
    const auto original=store.Segments().front();
    for(bool fractional:{false,true}){
        const auto source=CloneSource(store,original,fractional?"nonintegral-source":"span-mismatch-source",fractional);
        recording::RecordingTimelineResult timeline;
        const bool queried=reader.QueryTimeline({"probe-channel",1789200000000LL,1789200002000LL,0,100},&timeline,&error);
        const auto row=std::find_if(timeline.unplaced_items.begin(),timeline.unplaced_items.end(),[&](const auto& x){return x.segment_id==source.segment_id;});
        check(queried&&row!=timeline.unplaced_items.end()&&!row->utc_start_ns&&!row->hide_by_event,"D3B-14 mismatch/nonintegral mapping은 unplaced");
    }
    const auto query=std::unordered_map<std::string,std::string>{{"channelId","probe-channel"},{"startTimeMs","1789200000000"},{"endTimeMs","1789200003000"}};
    for(const auto& change:std::vector<std::pair<std::string,std::string>>{{"channelId",std::string(257,'a')},{"channelId",std::string("bad\0id",6)},
        {"startTimeMs","-1"},{"endTimeMs","0"},{"limit","0"},{"limit","1001"}}){
        auto invalid=query;invalid[change.first]=change.second;
        check(app.Timeline(invalid,[](const auto&){return true;}).status==400,"D3B-02 문법/범위 오류400");
    }
    check(app.Timeline(query,[](const auto&){return false;}).status==403,"D3B-02 권한 거부403");
    {
        auto explicit_mapping=query;explicit_mapping["unplacedUnit"]="mapping";
        check(app.Timeline(explicit_mapping,[](const auto&){return true;}).body==app.Timeline(query,[](const auto&){return true;}).body,
            "LP25-T01 omitted/mapping exact JSON identity");
        for(const auto& value:{"","files","FILE"}){
            auto invalid=query;invalid["unplacedUnit"]=value;
            check(app.Timeline(invalid,[](const auto&){return true;}).status==400,"LP25-T06 invalid unplacedUnit 400");
            check(app.Timeline(invalid,[](const auto&){return false;}).status==403,"LP25-T06 authorize before invalid unit");
        }
    }
    {
        Store jobs(std::filesystem::path(argv[1])/"jobs");const auto intent=PrepareMedia(jobs,false);
        recording::RecordingReadService job_reader(jobs.catalog);ingress::RecordingApplicationService job_app(job_reader,jobs.catalog,true,{});
        recording::RecordingTimelineQuery q{"probe-channel",1789200000000LL,1789200003000LL,0,100};
        recording::RecordingTimelineResult timeline;
        auto run=[&]{if(!job_reader.QueryTimeline(q,&timeline,&error))throw std::runtime_error(error);};run();
        check(timeline.unplaced_total==1&&timeline.unplaced_items.front().segment_id.empty()&&timeline.unplaced_items.front().job_state=="intent","D3B-13 Intent placeholder no file/null time");
        auto reference=intent.reference;reference.reference_id="accepted-only";reference.owner_id="accepted-only-event";
        if(!jobs.catalog.PutConsumerReference(reference,&error)||!jobs.catalog.AcceptDerivedReference(reference,&error))throw std::runtime_error(error);
        run();check(timeline.unplaced_total==2,"D3B-13 accepted/no-job 상태 보존");
        recording::DerivedJobService service(jobs.catalog,jobs.journal,{jobs.root,30000,[&](auto stage,std::size_t){
            if(stage==recording::DerivedJobProgress::ReadyDurable||stage==recording::DerivedJobProgress::CommittedDurable){
                run();const std::string state=stage==recording::DerivedJobProgress::ReadyDurable?"ready":"committed";
                check(std::count_if(timeline.items.begin(),timeline.items.end(),[&](const auto& row){return row.kind=="event"&&row.job_state==state&&!row.playable;})==2,
                    stage==recording::DerivedJobProgress::ReadyDurable?"D3B-05 Ready 출력 시간과 재생불가 분리":"D3B-05 Committed 출력 시간과 재생불가 분리");
            }
        }});
        if(!service.Run(intent.job_id).complete)throw std::runtime_error("service complete");run();
        std::vector<recording::RecordingTimelineItem> events;
        for(const auto& row:timeline.items)if(row.kind=="event")events.push_back(row);
        check(events.size()==2&&events[0].segment_id!=events[1].segment_id&&events[0].playable&&events[1].playable,"D3B-05 실제 검증된 파생2출력 시간/파일 독립");
        const auto foreign=MappedSource(jobs,intent.sources.front().segment,"other-lineage",1,1789200000000000000LL);
        run();
        const auto unrelated=std::find_if(timeline.items.begin(),timeline.items.end(),[&](const auto& item){return item.segment_id==foreign.segment_id;});
        check(unrelated!=timeline.items.end()&&!unrelated->hide_by_event&&unrelated->event_overlaps.empty(),"D3B-07 같은 UTC 다른 segment/epoch는 원본 숨김 없음");
        check(timeline.unplaced_total==1&&std::none_of(timeline.unplaced_items.begin(),timeline.unplaced_items.end(),[&](const auto& row){return row.job_id==intent.job_id;}),"D3B-13 출력 생성 뒤 job placeholder 없음");
        const auto all=timeline.items;bool full=false,partial_overlap=false,page_stable=false;
        for(std::size_t i=0;i<all.size();++i)if(all[i].kind=="continuous"){
            if(all[i].hide_by_event){full=true;q.offset=i;q.limit=1;run();page_stable=timeline.items.size()==1&&timeline.items[0].item_id==all[i].item_id&&timeline.items[0].hide_by_event;}
            if(!all[i].hide_by_event&&!all[i].event_overlaps.empty())partial_overlap=true;
        }
        check(full&&page_stable,"D3B-07 page 밖 이벤트도 원본 전체 충족 판정");
        check(partial_overlap,"D3B-06 일부 중첩 원본은 보존");
        q.offset=0;q.limit=100;run();check(timeline.items.size()==all.size()&&timeline.items.front().item_id==all.front().item_id,"D3B-04 재조회 stable itemId/order");
        const auto json=job_app.Timeline(query,[](const auto&){return true;});
        check(json.status==200&&json.body.find("\"timeBasis\":\"media-pts-ms\"")!=std::string::npos&&
            json.body.find("\"preMs\":\"0\"")!=std::string::npos&&json.body.find("source-utc-mapping")!=std::string::npos&&
            json.body.find("checksum")==std::string::npos&&json.body.find("access_units")==std::string::npos&&json.body.find(jobs.root.string())==std::string::npos,"D3B-12 요청축/문자열/공개 whitelist");
        const auto output=intent.outputs.front();
        {std::fstream file(jobs.root/output.final_relpath,std::ios::in|std::ios::out|std::ios::binary);
            char byte=0;file.read(&byte,1);const char changed=byte^1;file.seekp(0);file.write(&changed,1);file.flush();run();
            const auto corrupt=std::find_if(timeline.items.begin(),timeline.items.end(),[&](const auto& item){return item.segment_id==output.output_id;});
            check(corrupt!=timeline.items.end()&&!corrupt->playable&&!corrupt->playback_url.size(),"D3B-08 동일 size 변조 출력은 비재생");
            file.seekp(0);file.write(&byte,1);file.flush();}
        std::filesystem::remove(jobs.root/output.final_relpath);run();
        const auto missing=std::find_if(timeline.items.begin(),timeline.items.end(),[&](const auto& row){return row.segment_id==output.output_id;});
        check(missing!=timeline.items.end()&&missing->job_state=="complete"&&!missing->playable&&
            std::none_of(timeline.items.begin(),timeline.items.end(),[](const auto& row){return row.hide_by_event;}),"D3B-08 파일 누락 Complete와 재생불가/숨김 분리");
        std::optional<recording::DerivedJobRecordV1> job;jobs.catalog.FindDerivedJob(intent.job_id,&job,&error);
        const auto deleted=job->ready->outputs.back().segment;recording::RecordingTombstoneV2 tomb;
        tomb.tombstone_id="output-deleted";tomb.segment=deleted;tomb.deletion_reason="event-capacity";tomb.deleted_at_ms=20;
        if(!jobs.catalog.RequestDeletion(deleted.segment_id,tomb.deletion_reason,&error)||!std::filesystem::remove(jobs.root/intent.outputs.back().final_relpath)||!jobs.catalog.CompleteDeletionV2(tomb,&error))throw std::runtime_error(error);run();
        const auto row=std::find_if(timeline.items.begin(),timeline.items.end(),[&](const auto& item){return item.segment_id==deleted.segment_id;});
        check(row!=timeline.items.end()&&row->job_state=="complete"&&row->catalog_state=="deleted"&&!row->playable,"D3B-08 실제 tombstone 출력 deleted 보존");
        for(const auto& source:intent.sources){const auto location=jobs.catalog.FindSegmentMediaLocation(source.segment.segment_id);
            tomb.tombstone_id="source-deleted-"+source.segment.segment_id;tomb.segment=source.segment;tomb.deletion_reason="continuous-capacity";
            if(!location||!jobs.catalog.RequestDeletion(source.segment.segment_id,tomb.deletion_reason,&error)||!std::filesystem::remove(location->first/location->second)||!jobs.catalog.CompleteDeletionV2(tomb,&error))throw std::runtime_error(error);}
        run();check(std::count_if(timeline.items.begin(),timeline.items.end(),[](const auto& item){return item.kind=="event"&&item.utc_start_ns&&item.range_basis=="source-utc-mapping";})==2,"D3B-09 source tombstone 뒤 durable UTC 투영");
    }
    {
        Store malformed(std::filesystem::path(argv[1])/"mapped-output");const auto intent=PrepareMedia(malformed,true,1);
        recording::DerivedJobService service(malformed.catalog,malformed.journal,{malformed.root,30000,{}});
        check(service.Run(intent.job_id).complete,"D3B-05 partial 요청 실제 출력 jobComplete");
        recording::RecordingReadService read(malformed.catalog);recording::RecordingTimelineResult t;
        const bool queried=read.QueryTimeline({"probe-channel",1789200000000LL,1789200003000LL,0,100},&t,&error);
        check(queried&&t.items.empty()&&std::count_if(t.unplaced_items.begin(),t.unplaced_items.end(),[](const auto& row){
            return row.kind=="event"&&row.completeness=="partial"&&row.playable&&!row.utc_start_ns&&!row.hide_by_event;
        })==2,"D3B-14 actual 출력 mismatch mapping은 unplaced·partial 파일 제공 분리");
    }
    {
        Store failed(std::filesystem::path(argv[1])/"failed-job");const auto intent=PrepareMedia(failed,false);
        if(!failed.catalog.FailDerivedJobAfterCleanup(intent.job_id,intent.attempt_id,"fixture-cleanup",20,&error))throw std::runtime_error(error);
        recording::RecordingReadService read(failed.catalog);recording::RecordingTimelineResult t;
        check(read.QueryTimeline({"probe-channel",0,1,0,100},&t,&error)&&t.unplaced_total==1&&
            t.unplaced_items[0].job_state=="failed"&&!t.unplaced_items[0].playable&&t.unplaced_items[0].segment_id.empty(),"D3B-13 Failed placeholder no file/null time");
        ingress::RecordingApplicationService failed_app(read,failed.catalog,true,{});auto grouped=query;grouped["unplacedUnit"]="file";
        check(failed_app.Timeline(grouped,[](const auto&){return true;}).body==failed_app.Timeline(query,[](const auto&){return true;}).body,
            "LP25-T04 failed placeholder unchanged without group members");
    }
    {
        MappedSource(store,original,"utc-zero",2,0,true);
        MappedSource(store,original,"utc-high",1,std::numeric_limits<std::int64_t>::max()-1);
        recording::RecordingTimelineResult t;
        const bool zero=reader.QueryTimeline({"probe-channel",0,1,0,100},&t,&error);
        check(zero&&t.items.size()==2&&t.items[0].utc_start_ns==0&&t.items[0].item_id!=t.items[1].item_id&&
            t.items[0].segment_id==t.items[1].segment_id,"D3B-03/04 UTC0와 same-file 다중 mapping 독립 ID");
        auto high=query;high["startTimeMs"]="9223372036854";high["endTimeMs"]="9223372036855";
        const auto json=app.Timeline(high,[](const auto&){return true;});
        check(json.status==200&&json.body.find("\"startNs\":\"9223372036854775806\"")!=std::string::npos&&
            json.body.find("\"endNs\":\"9223372036854775807\"")!=std::string::npos,"D3B-03 int64 최대 UTC ns 문자열 정밀도");
        for(int i=0;i<17;++i)MappedSource(store,original,"history-"+std::to_string(i),256,1000000000LL);
        check(reader.QueryTimeline({"probe-channel",0,1,0,100},&t,&error)&&t.total==2,"D3B-11 관련 없는 known4352 누적은 짧은 질의 허용");
        check(!reader.QueryTimeline({"probe-channel",1000,1001,0,100},&t,&error)&&t.items.empty(),"D3B-11 실제 관련4352 상한 명시 실패");
        auto cap=query;cap["startTimeMs"]="1000";cap["endTimeMs"]="1001";
        check(app.Timeline(cap,[](const auto&){return true;}).status==503,"D3B-02/11 관련 상한503");
        for(int i=0;i<17;++i)MappedSource(store,original,"unknown-"+std::to_string(i),256,std::nullopt);
        check(reader.QueryTimeline({"probe-channel",0,1,0,1},&t,&error)&&t.total==2&&t.items.size()==1&&
            t.unplaced_total==4354&&t.unplaced_items.size()==1&&!t.unplaced_items[0].utc_start_ns,"D3B-10/11 unknown4354 count와 bounded 첫 페이지");
        const auto first=t.unplaced_items[0].item_id;
        check(reader.QueryTimeline({"probe-channel",0,1,1,1},&t,&error)&&t.items.size()==1&&t.unplaced_items.size()==1&&
            t.unplaced_items[0].item_id>first&&t.unplaced_total==4354,"D3B-10 known/unplaced 독립 동일 offset 페이지");
        auto grouped=query;grouped["startTimeMs"]="0";grouped["endTimeMs"]="1";grouped["unplacedUnit"]="file";grouped["limit"]="1000";
        const auto grouped_response=app.Timeline(grouped,[](const auto&){return true;});const auto grouped_json=Json(grouped_response.body);
        const auto groups=Objects(grouped_json,"unplacedItems");
        check(grouped_response.status==200&&Field(grouped_json,"total")=="2"&&Field(grouped_json,"unplacedTotal")=="19"&&groups.size()==19,
            "LP25-T08 4352 unknown mappings become 17 files plus 2 invalid files");
        bool members_ok=groups.size()==19,invalid_preserved=false;std::size_t member_count=0;
        for(const auto& group:groups){const auto members=Objects(group,"members");const auto id=Field(group,"segmentId");member_count+=members.size();
            members_ok=members_ok&&Field(group,"itemId")=="v2-file-group:"+OpaqueKey(id)+OpaqueKey("")&&
                Field(group,"rangeBasis")=="file-group"&&Field(group,"utcRange")=="null"&&Field(group,"startTimeMs")=="null"&&Field(group,"endTimeMs")=="null"&&Field(group,"hideByEvent")=="false";
            for(const auto& member:members){const auto mapping=Field(member,"mappingId");
                members_ok=members_ok&&Field(member,"itemId")=="v2-source:"+OpaqueKey(id)+OpaqueKey(mapping)&&Field(member,"sourceSegmentId")==id&&
                    Field(member,"sourceMappingRange")==Field(member,"mediaRange")&&!Field(member,"unavailableReason").empty()&&
                    (Field(member,"mappingProvenance")!="unknown"||Field(member,"reason")=="unclassified");
                if(id=="nonintegral-source")invalid_preserved=Field(member,"mappingProvenance")=="source-capture"&&Field(member,"uncertaintyNs")=="0"&&
                    Field(Json(Field(member,"sourceMappingRange")),"timeBaseDen")=="3";
            }
        }
        check(members_ok&&member_count==4354,"LP25-T02 file group stable opaque IDs null UTC and all member identities");
        check(invalid_preserved,"LP25-T03 invalid fractional mapping provenance uncertainty and source PTS retained");
        grouped["limit"]="1";std::vector<std::string> paged_ids;bool pages_ok=true;
        for(std::size_t i=0;i<groups.size()+1;++i){grouped["offset"]=std::to_string(i);const auto p=Json(app.Timeline(grouped,[](const auto&){return true;}).body);const auto rows=Objects(p,"unplacedItems");
            pages_ok=pages_ok&&Field(p,"unplacedTotal")=="19"&&rows.size()==(i<groups.size()?1:0);
            if(!rows.empty())paged_ids.push_back(Field(rows.front(),"itemId"));}
        std::vector<std::string> full_ids;for(const auto& group:groups)full_ids.push_back(Field(group,"itemId"));
        check(pages_ok&&paged_ids==full_ids,"LP25-T08 file-unit page boundaries exact and stable including empty last page");
        grouped["startTimeMs"]="1000";grouped["endTimeMs"]="1001";grouped["offset"]="0";
        check(app.Timeline(grouped,[](const auto&){return true;}).status==503,"LP25-T08 known 4096 cap unchanged in file mode");
        check(!reader.QueryTimeline({"probe-channel",0,1,std::numeric_limits<std::size_t>::max(),1},&t,&error),"D3B-11 offset+limit overflow 명시 실패");
        for(int i=0;i<120;++i)MappedSource(store,original,"deep-"+std::string(85,'x')+"-"+std::to_string(i),256,std::nullopt);
        check(reader.QueryTimeline({"probe-channel",0,1,0,1},&t,&error)&&t.unplaced_total==35074&&t.unplaced_items.size()==1,
            "D3B-11 전체 unknown deep-copy 없이35074 첫 페이지 허용");
        check(!reader.QueryTimeline({"probe-channel",0,1,40000,1},&t,&error)&&t.items.empty()&&t.unplaced_items.empty(),
            "D3B-11 deep offset64MiB workspace 초과는 결과 없이 명시 실패");
    }
    {
        const std::string private_reason="rtsp://fixture-user:fixture-secret@private-source.invalid/stream";
        const auto mixed=MappedSource(store,original,"mixed-file",4,0,false,true,private_reason);
        const auto open=MappedSource(store,original,"open-tail",2,std::nullopt,false,false,"end-duration-unavailable",true);
        auto q=query;q["startTimeMs"]="0";q["endTimeMs"]="1";q["limit"]="1000";
        const auto baseline=Json(app.Timeline(q,[](const auto&){return true;}).body);q["unplacedUnit"]="file";
        const auto response=app.Timeline(q,[](const auto&){return true;});const auto grouped=Json(response.body);const auto rows=Objects(grouped,"unplacedItems");
        const auto found=std::find_if(rows.begin(),rows.end(),[&](const auto& row){return Field(row,"segmentId")==mixed.segment_id;});
        bool separate=false;
        if(found!=rows.end()){const auto members=Objects(*found,"members");
            separate=members.size()==2&&Field(members[0],"mappingId")=="mixed-file-map-0"&&Field(members[1],"mappingId")=="mixed-file-map-2"&&
                Field(members[0],"reason")=="unclassified"&&Field(members[1],"reason")=="unclassified"&&
                Field(Json(Field(members[0],"mediaRange")),"endPts")=="1"&&Field(Json(Field(members[1],"mediaRange")),"startPts")=="2"&&
                Field(Json(Field(*found,"mediaRange")),"startPts")=="0"&&Field(Json(Field(*found,"mediaRange")),"endPts")=="4";
        }
        check(response.status==200&&separate,"LP25-T03 nonadjacent unknown members preserve gap and outer file range");
        const auto open_group=std::find_if(rows.begin(),rows.end(),[&](const auto& row){return Field(row,"segmentId")==open.segment_id;});
        bool nullable=false;
        if(open_group!=rows.end()){const auto members=Objects(*open_group,"members");
            nullable=members.size()==2&&Field(Json(Field(*open_group,"mediaRange")),"endPts")=="null"&&
                Field(Json(Field(members.back(),"mediaRange")),"endPts")=="null"&&Field(Json(Field(members.back(),"sourceMappingRange")),"endPts")=="null"&&
                Field(members.back(),"reason")=="end-duration-unavailable";
        }
        check(nullable,"LP25-T03 null end PTS remains null and fixed writer reason is preserved");
        check(Field(baseline,"items")==Field(grouped,"items")&&Field(baseline,"total")==Field(grouped,"total"),
            "LP25-T04 mixed known rows exact and distinct files never coalesce");
        check(response.body.find("probe-store")==std::string::npos&&response.body.find("mixed-file-epoch")==std::string::npos&&
            response.body.find("source_id")==std::string::npos&&response.body.find(store.root.string())==std::string::npos&&response.body.find(private_reason)==std::string::npos&&
            response.body.find("fixture-secret")==std::string::npos&&store.catalog.FindSegmentV2ById(mixed.segment_id)->mappings.front().reason==private_reason,
            "LP25-T03 group public whitelist excludes raw source store epoch and paths");
    }
    for(const bool partial:{false,true}){
        const auto root=std::filesystem::path(argv[1])/(partial?"lp25-partial":"lp25-full");std::string retained_json;
        auto q=query;q["unplacedUnit"]="file";q["limit"]="1000";
        {
            Store fixture(root);const auto intent=PrepareMedia(fixture,partial,1);
            recording::RecordingReadService read(fixture.catalog);ingress::RecordingApplicationService application(read,fixture.catalog,true,{});
            auto baseline_query=q;baseline_query.erase("unplacedUnit");
            const auto before=Json(application.Timeline(q,[](const auto&){return true;}).body);
            const auto pending=Objects(before,"unplacedItems");
            check(std::count_if(pending.begin(),pending.end(),[](const auto& row){return Field(row,"jobState")=="intent"&&Field(row,"segmentId")=="null"&&!row.Find("members");})==1,
                "LP25-T04 intent placeholder unchanged alongside file groups");
            recording::DerivedJobService service(fixture.catalog,fixture.journal,{fixture.root,30000,{}});
            if(!service.Run(intent.job_id).complete)throw std::runtime_error("lp25-job-complete");
            const auto old=Json(application.Timeline(baseline_query,[](const auto&){return true;}).body);const auto legacy=Objects(old,"unplacedItems");
            const auto grouped=Json(application.Timeline(q,[](const auto&){return true;}).body);const auto rows=Objects(grouped,"unplacedItems");
            bool outputs_ok=true;std::size_t output_count=0;
            for(const auto& row:rows){if(Field(row,"kind")!="event")continue;++output_count;
                const auto id=Field(row,"segmentId");const auto members=Objects(row,"members");
                std::vector<JsonObject> previous;for(const auto& r:legacy)if(Field(r,"segmentId")==id)previous.push_back(r);
                outputs_ok=outputs_ok&&!members.empty()&&members.size()==previous.size()&&Field(row,"jobId")==intent.job_id&&
                    Field(row,"referenceId")==intent.reference.reference_id&&Field(row,"completeness")== (partial?"partial":"complete")&&
                    Field(row,"itemId")=="v2-file-group:"+OpaqueKey(id)+OpaqueKey(intent.job_id)&&Field(row,"playable")=="true";
                for(const auto& member:members){const auto match=std::find_if(previous.begin(),previous.end(),[&](const auto& p){return Field(p,"itemId")==Field(member,"itemId");});
                    outputs_ok=outputs_ok&&match!=previous.end()&&Field(*match,"mediaRange")==Field(member,"mediaRange")&&
                        Field(row,"playbackUrl")==Field(*match,"playbackUrl")&&!Field(member,"mappingId").empty()&&!Field(member,"sourceSegmentId").empty()&&member.Find("sourceMappingRange");
                }
            }
            check(outputs_ok&&output_count==2,partial?"LP25-T05 partial two output file groups preserve request playback and members":"LP25-T05 full two output file groups preserve request playback and members");
            const auto output=intent.outputs.front();
            {std::fstream file(fixture.root/output.final_relpath,std::ios::in|std::ios::out|std::ios::binary);char byte=0;file.read(&byte,1);const char changed=byte^1;file.seekp(0);file.write(&changed,1);file.flush();
                const auto corrupt=Objects(Json(application.Timeline(q,[](const auto&){return true;}).body),"unplacedItems");
                check(std::count_if(corrupt.begin(),corrupt.end(),[&](const auto& row){return Field(row,"segmentId")==output.output_id&&Field(row,"playable")=="false"&&Field(row,"playbackUrl").empty()&&!Objects(row,"members").empty();})==1,
                    "LP25-T07 corrupt output remains grouped and not playable");
                file.seekp(0);file.write(&byte,1);file.flush();}
            std::optional<recording::DerivedJobRecordV1> job;fixture.catalog.FindDerivedJob(intent.job_id,&job,&error);
            recording::RecordingTombstoneV2 tomb;tomb.tombstone_id="lp25-delete";tomb.segment=job->ready->outputs.front().segment;tomb.deletion_reason="event-capacity";tomb.deleted_at_ms=30;
            if(!fixture.catalog.RequestDeletion(output.output_id,tomb.deletion_reason,&error)||!std::filesystem::remove(fixture.root/output.final_relpath)||!fixture.catalog.CompleteDeletionV2(tomb,&error))throw std::runtime_error(error);
            retained_json=application.Timeline(q,[](const auto&){return true;}).body;
            const auto deleted=Objects(Json(retained_json),"unplacedItems");
            check(std::count_if(deleted.begin(),deleted.end(),[&](const auto& row){return Field(row,"segmentId")==output.output_id&&Field(row,"catalogState")=="deleted"&&Field(row,"playable")=="false"&&!Objects(row,"members").empty();})==1,
                "LP25-T07 tombstone output preserves group provenance and cannot play");
        }
        Store reopened(root);recording::RecordingReadService read(reopened.catalog);ingress::RecordingApplicationService application(read,reopened.catalog,true,{});
        check(application.Timeline(q,[](const auto&){return true;}).body==retained_json,"LP25-T07 reopen exact group IDs member provenance and deleted state");
    }
    {
        // 기존 120 deep 파일 + 64 파일의 compact member 누적만으로 64MiB를 넘긴다.
        // 마지막에 배치하여 앞선 정상 조회/상태 회귀 fixture를 변경하지 않는다.
        for(int i=0;i<64;++i)MappedSource(store,original,"cap-deep-"+std::string(85,'x')+"-"+std::to_string(i),256,std::nullopt);
        recording::RecordingTimelineQuery cap{"probe-channel",0,1,60000,1};cap.unplaced_file_units=true;
        recording::RecordingTimelineResult result;
        const bool rejected=!reader.QueryTimeline(cap,&result,&error)&&result.items.empty()&&result.unplaced_items.empty()&&result.total==0&&result.unplaced_total==0;
        auto q=query;q["startTimeMs"]="0";q["endTimeMs"]="1";q["offset"]="60000";q["limit"]="1";q["unplacedUnit"]="file";
        const auto response=app.Timeline(q,[](const auto&){return true;});
        check(rejected&&response.status==503&&response.body=="{\"error\":\"recording timeline unavailable\"}",
            "LP25-T08 file-unit accumulated workspace cap rejects without partial response");
    }
    std::cout<<"[summary] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
}
