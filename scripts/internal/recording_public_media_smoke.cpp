// 파일 용도: 실제 파생 파일의 public media 권한·보호 경계를 서버 없이 검사한다.
#include "recording_media_test_fixture.h"
#include "recording/recording_derived_job_service.h"
#include "recording/recording_derived_selection.h"
#include "ingress/recording_application_service.h"
#include <iostream>
#include <fstream>
#include <unistd.h>

recording::DerivedJobIntentV1 PrepareMedia(Store& store,bool partial) {
    auto input=Encode(30,false,false);Shift(input,7000000000ULL);
    recording::GStreamerSegmentWriter::Options options(store.root,1000);
    options.managed_journal=&store.journal;options.managed_catalog=&store.catalog;options.managed_store_id="probe-store";
    recording::GStreamerSegmentWriter writer(options);std::string error;
    if(!writer.Start("probe-channel","unused",input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error(error);
    for(const auto& packet:input.packets)writer.Push(packet,0);writer.Stop();
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
std::uint64_t Holds(recording::RecordingCatalog& catalog,const std::string& id){
    for(const auto& candidate:catalog.RetentionSnapshot().candidates)if(candidate.segment_v2&&candidate.segment_v2->segment_id==id)return candidate.hold_count;
    return 0;
}
int main(int argc,char** argv){
    if(argc!=2)return 2;gst_init(nullptr,nullptr);int pass=0,fail=0;
    auto check=[&](bool ok,const std::string& title){std::cout<<(ok?"[pass] ":"[fail] ")<<title<<'\n';ok?++pass:++fail;};
    for(bool partial:{false,true}){
        Store store(std::filesystem::path(argv[1])/(partial?"partial":"full"));auto intent=PrepareMedia(store,partial);
        recording::RecordingReadService reader(store.catalog);
        ingress::RecordingApplicationService application(reader,store.catalog,true,{});
        recording::DerivedJobService::Options options{store.root,30000,{}};
        options.progress=[&](auto point,std::size_t){
            if(point==recording::DerivedJobProgress::ReadyDurable||point==recording::DerivedJobProgress::CommittedDurable)
                for(const auto& output:intent.outputs)check(!reader.ResolveMedia("probe-channel",output.output_id),"D3A-05 미완료 출력 거부");
        };
        recording::DerivedJobService service(store.catalog,store.journal,options);const auto result=service.Run(intent.job_id);
        if(!result.complete)throw std::runtime_error(result.reason);
        std::optional<recording::DerivedJobRecordV1> job;std::string error;store.catalog.FindDerivedJob(intent.job_id,&job,&error);
        check(job&&job->ready&&job->ready->request_fully_satisfied!=partial,"D3A-02 요청 충족 상태 구분");
        for(const auto& output:job->ready->outputs){
            const auto& id=output.segment.segment_id;auto media=reader.ResolveMedia("probe-channel",id);
            unsigned char sync=0;
            check(media&&::pread(media->fd(),&sync,1,0)==1&&sync==0x47&&media->size_bytes()==output.segment.size_bytes&&media->content_type()=="video/mp2t",partial?"D3A-02 partial 출력 제공":"D3A-01 실제 검증된 Event 출력 제공");
            check(!application.Media(id,[](const auto&){return false;})&&!reader.ResolveMedia("other-channel",id),"D3A-03 권한/다른 채널 거부");
            auto public_media=application.Media(id,[](const auto& channel){return channel=="probe-channel";});
            check(bool(public_media),"D3A-01 application V2 채널 권한 후 제공");
            check(media&&!store.catalog.RequestDeletion(id,"event-capacity",&error),"D3A-06 제공 중 삭제 거부");
            media.reset();public_media.reset();check(Holds(store.catalog,id)==0,"D3A-06 fd 해제 후 hold0");
        }
        const auto first=job->ready->outputs.front().segment;
        const auto second=job->ready->outputs.back().segment;
        const auto first_path=store.root/intent.outputs.front().final_relpath;
        auto manual=first;manual.segment_id="manual-event";manual.order_request_id="manual-event-order";
        recording::RecordingOrderReservationV1 order;
        if(!store.journal.ReserveRecordingOrder("probe-store",manual.order_request_id,manual.segment_id,"probe-channel",&order,&error))throw std::runtime_error(error);
        manual.order_sequence=order.sequence;
        const auto manual_path=store.root/"probe-channel/manual-event.ts";
        std::filesystem::copy_file(first_path,manual_path);
        check(store.catalog.FinalizeSegmentV2(manual,manual_path.string(),&error)&&!reader.ResolveMedia("probe-channel",manual.segment_id)&&Holds(store.catalog,manual.segment_id)==0,"D3A-04 실제 파일 있는 manual Event 거부");
        auto changed=first;changed.checksum_sha256=std::string(64,'a');
        check(!store.catalog.FinalizeSegmentV2(changed,first_path.string(),&error)&&
            !store.catalog.ValidateMediaV2(changed,{store.root,intent.outputs.front().final_relpath}),"D3A-07 immutable metadata 다른 결박 거부");
        for(const auto& source:intent.sources){
            const auto location=store.catalog.FindSegmentMediaLocation(source.segment.segment_id);
            recording::RecordingTombstoneV2 tomb;tomb.tombstone_id="deleted-"+source.segment.segment_id;
            tomb.segment=source.segment;tomb.deletion_reason="continuous-capacity";tomb.deleted_at_ms=20;
            const bool removed=location&&store.catalog.RequestDeletion(source.segment.segment_id,tomb.deletion_reason,&error)&&
                std::filesystem::remove(location->first/location->second)&&store.catalog.CompleteDeletionV2(tomb,&error);
            check(removed,"D3A-08 원본 보존 삭제 완료");
        }
        check(bool(reader.ResolveMedia("probe-channel",first.segment_id)),"D3A-08 원본 삭제 뒤 검증된 출력 제공");
        {std::ofstream corrupt(first_path,std::ios::binary|std::ios::app);corrupt.put('x');}
        check(!reader.ResolveMedia("probe-channel",first.segment_id)&&Holds(store.catalog,first.segment_id)==0,"D3A-07 실제 파일 크기 변조 거부·hold0");
        {std::fstream corrupt(store.root/intent.outputs.back().final_relpath,std::ios::binary|std::ios::in|std::ios::out);corrupt.put('x');}
        check(!reader.ResolveMedia("probe-channel",second.segment_id)&&Holds(store.catalog,second.segment_id)==0,"D3A-07 동일 크기 파일 내용 변조 거부·hold0");
        check(store.catalog.RequestDeletion(second.segment_id,"event-capacity",&error)&&!reader.ResolveMedia("probe-channel",second.segment_id)&&Holds(store.catalog,second.segment_id)==0,"D3A-06 hold 해제 후 삭제 전이·새 제공 거부");
    }
    std::cout<<"[summary] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
}
