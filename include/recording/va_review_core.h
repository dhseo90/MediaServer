// 파일 용도: 사용자 확인 의도에 적용할 제한된 판정 핵심. 공개 요청/저장과 아직 연결하지 않는다.
#pragma once
#include "recording/va_review_record.h"

namespace recording {
enum class ReviewRelation { ColorAt, VisibilityAt, EndpointRight, EndpointLeft, EndpointSame,
    EndpointDifferent, AllColor, AllVisible, AllSamePosition, ContinuousMotion };
enum class ReviewVisibility { Unknown, Visible, NotVisible };
enum class ReviewIdentity { Unknown, Same, Different };
enum class ReviewColor { Red, Blue, Green, Yellow, Black, White, Gray };
enum class ReviewVerdict { Supported, Contradicted, Insufficient, Unsupported };
enum class ReviewGapKind { Identity, Position, Color, Visibility, OrderedTime };
struct ReviewPoint { double x{},y{}; };
struct ReviewFrame {
    std::int64_t pts_ns{};
    int width{},height{};
    std::string evidence_sha256;
};
struct ReviewClaimSpec {
    std::string id,target_id,target_description;
    ReviewRelation relation{ReviewRelation::ColorAt};
    // 시간 비교는 같은 target의 scope 첫/마지막을 비교한다. 별도 대상 비교는 아직 지원하지 않는다.
    std::string comparison_target_id;
    std::vector<std::size_t> scope;
    ReviewColor required_color{ReviewColor::Red};
    bool required_visible{true};
    std::string coordinates{"image-center-pixels"}; // 원본 전체 프레임, 좌상단 원점, 오른쪽/아래 양수
    bool full_frame{true};
    unsigned spec_version{1},policy_version{1};
};
struct ReviewObservation {
    std::string target_id;
    std::size_t frame{};
    std::int64_t pts_ns{};
    std::string evidence_sha256;
    ReviewVisibility visibility{ReviewVisibility::Unknown};
    ReviewIdentity identity{ReviewIdentity::Unknown};
    std::optional<std::size_t> identity_anchor;
    std::string identity_evidence; // 모델의 근거 주장. 영상 진실을 인증하지 않음.
    std::optional<ReviewPoint> position;
    std::optional<ReviewColor> color;
};
struct ReviewGap {
    ReviewGapKind kind;
    std::string target_id;
    std::vector<std::size_t> frames;
    std::int64_t begin_pts_ns{},end_pts_ns{};
};
struct ReviewDecision {
    std::string claim_id;
    ReviewVerdict verdict{ReviewVerdict::Insufficient};
    std::vector<std::size_t> evidence_frames;
    std::vector<ReviewGap> gaps;
};
// 1px 중심 좌표 양자화/반올림 차이를 동일 위치로 취급하는 정책 v1. 추론 결과에 따라 변경하지 않는다.
constexpr double kReviewPositionTolerancePixels=1.0;
bool ValidateReviewCoreInput(const std::vector<ReviewClaimSpec>&,const std::vector<ReviewFrame>&,
    const std::vector<ReviewObservation>&,std::string* error);
bool EvaluateReviewClaims(const std::vector<ReviewClaimSpec>&,const std::vector<ReviewFrame>&,
    const std::vector<ReviewObservation>&,std::vector<ReviewDecision>*,std::string* error);
const char* ReviewVerdictName(ReviewVerdict);
const char* ReviewGapName(ReviewGapKind);
// 호출자가 제공한 실제 표현 전체를 검사한다. 질문 생성/게시/절단/상한 확대는 하지 않는다.
struct ReviewExpression { std::string summary; std::vector<std::string> missing,questions; };
struct ReviewProjectionBudget { std::size_t claims{},supports{},contradictions{},unclear{},questions{},bytes{}; };
bool CheckReviewProjectionBudget(const std::vector<ReviewDecision>&,const std::vector<ReviewExpression>&,
    std::size_t frames,ReviewProjectionBudget*,std::string* error);
} // namespace recording

namespace recording {
// C 전용 계약: v1/A의 enum, 저장 재생과 동일성 의미를 변경하지 않는다.
enum class ReviewSampleChange { None, Color, Visibility };
enum class ReviewTargetMatch { Unknown, Matched, Ambiguous };
enum class ReviewSearchability { Unknown, Complete, Obstructed };
enum class ReviewVisualLink { Unknown, FrameLocal, VisualCue };
struct ReviewVisualClaim {
    ReviewClaimSpec claim; // spec_version/policy_version=2, coordinates="none"
    ReviewSampleChange change{ReviewSampleChange::None};
    bool required_changed{true}; // change 사용 시 claim.relation은 해당 AllColor/AllVisible이다.
};
struct ReviewVisualObservation {
    std::string source{"C"},target_id;
    std::size_t frame{};
    std::int64_t pts_ns{};
    std::string evidence_sha256;
    ReviewTargetMatch target_match{ReviewTargetMatch::Unknown};
    ReviewSearchability searchability{ReviewSearchability::Unknown};
    ReviewVisibility visibility{ReviewVisibility::Unknown};
    std::optional<ReviewColor> color;
    ReviewVisualLink link{ReviewVisualLink::Unknown};
    std::optional<std::size_t> anchor_frame;
    std::string cue_kind{"none"},cue_text;
    std::vector<std::size_t> cue_frames;
};
struct ReviewVisualDecision {
    std::string source{"C"},level{"model-visual-observation"};
    unsigned policy_version{2};
    ReviewDecision decision;
    std::vector<ReviewVisualObservation> observations; // 사용한 관측 및 부족 판정의 부분 관측 사본
};
bool ValidateReviewVisualInput(const std::vector<ReviewVisualClaim>&,const std::vector<ReviewFrame>&,
    const std::vector<ReviewVisualObservation>&,std::string* error);
bool EvaluateReviewVisualClaims(const std::vector<ReviewVisualClaim>&,const std::vector<ReviewFrame>&,
    const std::vector<ReviewVisualObservation>&,std::vector<ReviewVisualDecision>*,std::string* error);
} // namespace recording
