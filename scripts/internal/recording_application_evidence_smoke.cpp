// application 분석 결과 왕복의 동일 녹화 증거를 검사한다.
#include "analysis/decoded_interval_evidence.h"
#include "analysis_session_application_mapping.h"
#include "ingress/event_rule_application_service.h"
#include "ingress/analysis_rule_application_service.h"
#include "ingress/event_storage_application_service.h"
#include "analysis/event_storage.h"
#include <iostream>
#include <mutex>
#include <thread>
namespace ingress::webrtc_http_server_detail {
std::string AnalysisResultJson(const analysis::AnalysisResult&);
std::string AnalysisResultJson(const AnalysisSessionApplicationResult&);
EventStorageApplicationDispatchRequest ProjectEventStorageDispatchRequest(const analysis::AnalysisResult&, const std::vector<analysis::AnalysisEvent>&);
EventStorageApplicationDispatchRequest ProjectEventStorageDispatchRequest(const AnalysisSessionApplicationResult&, const std::vector<EventRuleApplicationEvent>&);
}
struct BridgeSpy final : analysis::EventRecordingBridge {
    const std::thread::id dispatch_thread=std::this_thread::get_id();
    std::mutex mutex;
    analysis::AnalysisResult observed;
    unsigned calls{0};
    analysis::EventRecordingBridgeResult TryResolve(const analysis::AnalysisResult& result,
        const analysis::EventRecord&,const analysis::EventMediaHookOptions&) override {
        std::lock_guard<std::mutex> lock(mutex);
        if(std::this_thread::get_id()==dispatch_thread){observed=result;++calls;}
        analysis::EventRecordingBridgeResult reply;reply.handled=true;reply.derived_job_managed=true;return reply;
    }
    void RecordFallback(const analysis::EventRecord&,const analysis::EventRecordingBridgeResult&) override {}
};
int main(){
    analysis::AnalysisResult original;original.source_key="fixture-source";original.pts=1000;original.frame_id=7;
    original.observation_context.source_id="1";original.observation_context.channel_id="1";original.observation_namespace="fixture-namespace";
    original.observation_context.stream_epoch_id="fixture-epoch";original.observation_context.locator_reason="confirmed";
    original.source_association.quality=analysis::SourceAssociationQuality::TimestampMatch;
    original.source_association.original=analysis::OriginalSampleIdentity{"fixture-generation",2,3,"video",1000};
    auto snapshot=std::make_shared<analysis::DecodedIntervalSnapshot>();snapshot->analysis_namespace=original.observation_namespace;original.decoded_intervals=snapshot;
    const auto dto=ingress::analysis_session_application_mapping::FromCanonicalResult(original);
    const auto restored=ingress::analysis_session_application_mapping::ToCanonicalResult(dto);
    const bool ok=restored.observation_namespace==original.observation_namespace&&restored.observation_context.channel_id=="1"&&restored.decoded_intervals==snapshot;
    std::cout<<(ok?"[pass] ":"[fail] ")<<"EV01 canonical application 왕복 같은 녹화 증거\n";
    int passed=ok?1:0,failed=ok?0:1;
    auto check=[&](bool value,const char* title){value?++passed:++failed;std::cout<<(value?"[pass] ":"[fail] ")<<title<<'\n';};
    check(restored.observation_context.source_id=="1"&&restored.observation_context.stream_epoch_id=="fixture-epoch"&&restored.observation_context.locator_reason=="confirmed"&&
          restored.source_association.quality==analysis::SourceAssociationQuality::TimestampMatch&&restored.source_association.original&&
          restored.source_association.original->source_generation=="fixture-generation"&&restored.source_association.original->generation_order==2&&
          restored.source_association.original->ordinal==3&&restored.source_association.original->track_id=="video"&&restored.source_association.original->pts_ns==1000,
          "EV01 전체 관측 context 및 원본 timestamp 연관 literal 보존");
    ingress::AnalysisRuleApplicationCallbacks callbacks;
    callbacks.profile_documents_snapshot=+[](){return std::vector<std::string>{};};
    callbacks.rule_documents_snapshot=callbacks.profile_documents_snapshot;
    callbacks.video_analysis_rule_documents_snapshot=callbacks.profile_documents_snapshot;
    callbacks.apply_video_analysis_rule_to_query=+[](std::unordered_map<std::string,std::string>*,std::string*){return true;};
    std::string setup_error;
    if(!ingress::ConfigureAnalysisRuleApplicationService(callbacks,&setup_error)){std::cerr<<"fixture rule setup failed\n";return 2;}
    auto runtime=ingress::CreateEphemeralEventRuleApplicationRuntime();
    auto evaluation=ingress::EvaluateEventRulesForApplication(dto,runtime);
    check(evaluation.AnnotatedResult().decoded_intervals==snapshot &&
          evaluation.AnnotatedResult().observation_namespace=="fixture-namespace",
          "EV02 실제 rule 평가 왕복 증거 보존");
    check(ingress::analysis_session_application_mapping::ToCanonicalResult(evaluation.ApplicationAnnotatedResult()).decoded_intervals==snapshot,
          "EV02 평가 application annotated 결과 재복원 증거");
    auto spy=std::make_shared<BridgeSpy>();analysis::SetEventRecordingBridge(spy);
    analysis::AnalysisEvent event;event.event_id="fixture-one";event.rule_id="fixture-rule";
    event.event_type="presence";event.status="active";event.track_id=1;event.start_time_ms=1;event.update_time_ms=1;
    auto request=ingress::webrtc_http_server_detail::ProjectEventStorageDispatchRequest(original,{event});
    unsigned before=spy->calls;
    ingress::DispatchEventRecordsForApplication(request);
    {std::lock_guard<std::mutex> lock(spy->mutex);check(spy->calls==before+1&&spy->observed.source_key=="fixture-source"&&spy->observed.pts==1000&&spy->observed.decoded_intervals==snapshot&&spy->observed.frame_id==7,
         "EV03 canonical projection 실제 storage bridge 입력 증거");}
    ingress::EventRuleApplicationEvent app_event;app_event.event_id="fixture-two";app_event.rule_id="fixture-rule";
    app_event.event_type="presence";app_event.status="active";app_event.track_id=2;app_event.start_time_ms=1;app_event.update_time_ms=1;
    before=spy->calls;
    ingress::DispatchEventRecordsForApplication(ingress::webrtc_http_server_detail::ProjectEventStorageDispatchRequest(dto,{app_event}));
    {std::lock_guard<std::mutex> lock(spy->mutex);check(spy->calls==before+1&&spy->observed.source_key=="fixture-source"&&spy->observed.pts==1000&&spy->observed.frame_id==7&&spy->observed.decoded_intervals==snapshot&&spy->observed.observation_namespace=="fixture-namespace",
         "EV03 application projection 실제 storage bridge 입력 증거");}
    request.source.frame_id=8;request.events.front().event_id="fixture-conflict";request.events.front().track_id=3;
    before=spy->calls;
    ingress::DispatchEventRecordsForApplication(request);
    {std::lock_guard<std::mutex> lock(spy->mutex);check(spy->calls==before+1&&spy->observed.source_key=="fixture-source"&&spy->observed.pts==1000&&spy->observed.frame_id==8&&!spy->observed.decoded_intervals&&spy->observed.observation_namespace.empty(),
         "EV04 dispatch frame 충돌 증거 복원 거부");}
    analysis::StopEventStorage();analysis::SetEventRecordingBridge({});
    for(int mutation=0;mutation<3;++mutation){
        auto conflict=dto;
        if(mutation==0)conflict.source_key="other-source";
        if(mutation==1)++conflict.pts;
        if(mutation==2)++conflict.frame_id;
        auto value=ingress::analysis_session_application_mapping::ToCanonicalResult(conflict);
        check(!value.decoded_intervals&&value.observation_namespace.empty(),mutation==0?
              "EV04 source 충돌 거부":mutation==1?"EV04 PTS 충돌 거부":"EV04 frame 충돌 거부");
    }
    auto missing=dto;missing.recording_evidence.reset();
    check(!ingress::analysis_session_application_mapping::ToCanonicalResult(missing).decoded_intervals,
          "EV04 증거 부재 발명 금지");
    auto history=original;history.decoded_intervals.reset();
    check(!ingress::analysis_session_application_mapping::ToCanonicalResult(
              ingress::analysis_session_application_mapping::FromCanonicalResult(history)).decoded_intervals,
          "EV05 history snapshot null 보존");
    {
        auto owned=std::make_shared<analysis::DecodedIntervalSnapshot>();owned->frames.resize(4096);
        std::weak_ptr<const analysis::DecodedIntervalSnapshot> weak=owned;
        analysis::AnalysisResult input;input.source_key="lifetime";input.decoded_intervals=owned;
        auto carried=ingress::analysis_session_application_mapping::FromCanonicalResult(input);
        input.decoded_intervals.reset();owned.reset();
        check(!weak.expired()&&ingress::analysis_session_application_mapping::ToCanonicalResult(carried).decoded_intervals==weak.lock()&&weak.lock()->frames.size()==4096,
              "EV05 원본 해제 뒤 동일 4096 snapshot 수명 유지");
        carried.recording_evidence.reset();check(weak.expired(),"EV05 마지막 carrier 해제 뒤 snapshot 해제");
    }
    auto public_only=original;public_only.observation_context={};public_only.observation_namespace.clear();public_only.source_association={};public_only.decoded_intervals.reset();
    check(ingress::webrtc_http_server_detail::AnalysisResultJson(original)==ingress::webrtc_http_server_detail::AnalysisResultJson(public_only)&&
          ingress::webrtc_http_server_detail::AnalysisResultJson(dto)==ingress::webrtc_http_server_detail::AnalysisResultJson(original),
          "EV06 실제 공개 result serializer 내부 증거 비노출 불변");
    std::cout<<"[summary] pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;
}
