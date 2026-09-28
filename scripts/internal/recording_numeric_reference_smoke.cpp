// 파일 용도: 숫자 source/channel 참조를 재명명 없이 실제 writer와 내구 조회까지 대조한다.
#include "recording_media_test_fixture.h"
#include "recording/recording_read_service.h"
#include <iostream>

int main(int argc,char** argv) {
    if(argc!=2)return 2;
    gst_init(nullptr,nullptr);
    using namespace recording;
    int passed=0,failed=0;
    const auto check=[&](bool ok,const char* label) {
        std::cout<<(ok?"[pass] ":"[fail] ")<<label<<'\n';
        ok?++passed:++failed;
    };
    const std::filesystem::path root=std::filesystem::path(argv[1])/"store";
    std::string error,segment_id;
    RecordingConsumerReferenceV1 reference;
    reference.reference_id="numeric-reference";reference.kind="observation";
    reference.owner_id="numeric-owner";reference.source_id="007";reference.channel_id="007";
    reference.analysis_namespace="numeric-analysis";reference.analysis_track_id="video-0";
    reference.association_quality="unavailable";
    RecordingConsumerReferenceV1 copy;
    check(ParseRecordingConsumerReferenceV1(SerializeRecordingConsumerReferenceV1(reference),&copy,&error)&&
          copy.source_id=="007"&&copy.channel_id=="007","D01-01 consumer 숫자 참조 원문 왕복");
    bool invalid=true;
    for(const auto& id:std::vector<std::string>{"","../escape","a/b","a\\b"}) {
        auto bad=reference;bad.source_id=id;
        invalid=!ValidateRecordingConsumerReferenceV1(bad,&error)&&invalid;
        bad=reference;bad.channel_id=id;
        invalid=!ValidateRecordingConsumerReferenceV1(bad,&error)&&invalid;
    }
    check(invalid,"D01-02 빈 참조·경로 이탈 거부");
    bool bounded=ValidateRecordingReferenceId(std::string(128,'7'),&error);
    for(const auto& id:std::vector<std::string>{std::string(129,'7'),"a b","a\nb","a..b",std::string("a\0b",3)})
        bounded=!ValidateRecordingReferenceId(id,&error)&&bounded;
    check(bounded,"D01-10 숫자 참조 길이128/129·금지 문자·중간 경로 표현");
    bool opaque=!ValidateOpaqueId("007",&error);
    for(int field=0;field<3;++field) {
        auto bad=reference;
        if(field==0)bad.reference_id="007";
        if(field==1)bad.owner_id="007";
        if(field==2)bad.analysis_namespace="007";
        opaque=!ValidateRecordingConsumerReferenceV1(bad,&error)&&opaque;
    }
    check(opaque,"D01-03 생성 reference/owner/namespace 숫자-only 거부 유지");
    {
        Store store(root);
        RecordingOrderReservationV1 order;
        const bool reserved=store.journal.ReserveRecordingOrder("probe-store","numeric-request","numeric-segment","007",&order,&error);
        RecordingOrderReservationV1 parsed;
        const auto order_json=std::string("{\"schema\":\"media-server.recording-order.v1\",\"storeId\":\"probe-store\",\"requestId\":\"numeric-request\",\"segmentId\":\"numeric-segment\",\"channelId\":\"007\",\"sequence\":")+std::to_string(order.sequence)+"}";
        check(reserved&&ParseRecordingOrderReservationV1(order_json,&parsed,&error)&&
              parsed.channel_id=="007","D01-04 journal order 숫자 channel 왕복");
        check(!store.journal.ReserveRecordingOrder("probe-store","008","numeric-other","007",&order,&error)&&
              !store.journal.ReserveRecordingOrder("probe-store","numeric-other-request","008","007",&order,&error),
              "D01-05 order request/segment 숫자-only 거부 유지");
        auto input=Encode(12,false,false);
        Shift(input,1000000000ULL);
        GStreamerSegmentWriter::Options options(root,1000);
        options.managed_journal=&store.journal;options.managed_catalog=&store.catalog;options.managed_store_id="probe-store";
        GStreamerSegmentWriter writer(options);
        const bool started=writer.Start("007","unused",input.descriptor,[](auto,auto,auto*){return false;},&error);
        if(started)for(const auto& packet:input.packets)writer.Push(packet,0);
        writer.Stop();
        const auto segments=store.Segments();
        bool bound=started&&!segments.empty();
        for(const auto& segment:segments) {
            const auto binding=store.catalog.FindSourceBinding(segment.segment_id);
            bound=bound&&segment.source_id=="007"&&segment.channel_id=="007"&&binding&&
                binding->source_id=="007"&&binding->channel_id=="007"&&ValidateRecordingSourceBindingForSegment(*binding,segment,&error);
        }
        check(bound,"D01-06 실제 H264 writer→finalized segment/binding 숫자 원문 보존");
        bool generated=bound;
        if(bound) {
            const auto original=segments.front();
            for(int field=0;field<4;++field) {
                auto bad=original;
                if(field==0)bad.segment_id="007";
                if(field==1)bad.store_id="007";
                if(field==2)bad.media_epoch_id="007";
                if(field==3)bad.order_request_id="007";
                generated=!ValidateRecordingSegmentV2(bad,&error)&&generated;
            }
            auto bad=*store.catalog.FindSourceBinding(original.segment_id);
            bad.source_generation="007";
            generated=!ValidateRecordingSourceBindingV1(bad,&error)&&generated;
        }
        check(generated,"D01-11 segment/store/epoch/order/generation 생성 ID 숫자-only 거부");
        if(!segments.empty())segment_id=segments.front().segment_id;
        check(store.catalog.PutConsumerReference(reference,&error)&&
              store.catalog.QueryConsumerReferences("007","observation","numeric-owner").size()==1,
              "D01-07 catalog consumer 숫자 채널 저장·조회");
        RecordingReadService read(store.catalog);
        RecordingRangeResult range;RecordingLocationResult location;
        check(!segment_id.empty()&&read.ResolveMediaRange("007",segment_id,0,1,&range,&error)&&
              read.ResolveMediaLocation("007",segment_id,0,&location,&error)&&
              read.ResolveUtcRange("007",0,1,&range,&error)&&read.ResolveUtcLocations("007",0,&location,&error),
              "D01-08 숫자 채널 media/UTC range·location 입력 허용");
    }
    {
        Store reopened(root);
        const auto refs=reopened.catalog.QueryConsumerReferences("007","observation","numeric-owner");
        const auto segment=reopened.catalog.FindSegmentV2ById(segment_id);
        check(refs.size()==1&&refs.front().source_id=="007"&&refs.front().channel_id=="007"&&
              segment&&segment->source_id=="007"&&segment->channel_id=="007",
              "D01-09 새 catalog/journal 재개방 숫자 참조 유지");
    }
    std::cout<<"[summary] pass="<<passed<<" fail="<<failed<<'\n';
    return failed?1:0;
}
