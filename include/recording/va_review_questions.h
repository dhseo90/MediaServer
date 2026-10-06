// 파일 용도: 확정된 core gap의 한국어 자료 요청 표현. 공개 경로/저장/판정 변경 없음.
#pragma once
#include "recording/va_review_confirmed_record.h"
#include "recording/va_review_provider.h"

namespace recording {
struct ReviewMaterialRequests;
struct ReviewQuestionSlot {
    std::string key;
    std::vector<std::string> claim_ids;
    ReviewGap gap;
};
// 생성 helper만 내용을 설정한다. 모델은 슬롯의 종류·대상·범위를 선택할 수 없다.
class ReviewQuestionInput {
public:
    const std::vector<ReviewQuestionSlot>& slots() const { return slots_; }
    const std::string& context() const { return context_; }
    bool is_material_rephrase() const { return material_rephrase_; }
    const std::string& skip_state() const { return skip_state_; }
    const std::vector<std::vector<std::string>>& locked_frames() const { return locked_frames_; }
private:
    std::vector<ReviewQuestionSlot> slots_;
    std::string context_;
    bool material_rephrase_{};
    std::string skip_state_{"not-needed"};
    std::vector<std::vector<std::string>> locked_frames_;
    friend bool BuildReviewQuestionInput(const std::vector<ReviewClaimSpec>&,const std::vector<ReviewFrame>&,
        const std::vector<ReviewObservation>&,const std::vector<ReviewDecision>&,const std::string&,
        ReviewQuestionInput*,std::string*);
    friend bool BuildConfirmedReviewQuestionInput(const VaReviewRecordV3&,ReviewQuestionInput*,std::string*);
    friend bool BuildReviewRephraseInput(const ReviewMaterialRequests&,ReviewQuestionInput*,std::string*);
};
struct ReviewQuestionOutput {
    std::string state; // not-needed/미지원/한도 또는 generated-format-valid/rephrased-format-valid. 의미 PASS가 아님.
    std::vector<std::pair<std::string,std::string>> questions;
};
// 내부 명시 입력용. 실제 core 재생과 대조하며 사용자 확인/독립 관측을 만들어내지 않는다.
bool BuildReviewQuestionInput(const std::vector<ReviewClaimSpec>&,const std::vector<ReviewFrame>&,
    const std::vector<ReviewObservation>&,const std::vector<ReviewDecision>&,const std::string& original_question,
    ReviewQuestionInput*,std::string*);
// 실제 v3의 확인·A 사본 검증 후 같은 helper를 사용한다. 확인자 정보는 모델에 보내지 않는다.
bool BuildConfirmedReviewQuestionInput(const VaReviewRecordV3&,ReviewQuestionInput*,std::string*);
// 이미 완성된 서버 초안의 편집 전용. 원 질문·관측 목록·의미 정답표를 받지 않는다.
bool BuildReviewRephraseInput(const ReviewMaterialRequests&,ReviewQuestionInput*,std::string*);
bool BuildReviewQuestionRequest(const ReviewQuestionInput&,const std::string& model,std::string*,std::string*);
bool DecodeReviewQuestions(const std::string&,const ReviewQuestionInput&,ReviewQuestionOutput*,std::string*);
bool GenerateReviewQuestions(const ReviewQuestionInput&,const VaReviewProviderOptions&,const std::string& digest,
    VaReviewService::Clock::time_point,const std::function<bool()>&,ReviewQuestionOutput*,std::string*,
    VaReviewTransport=VaReviewCurl);
} // namespace recording
