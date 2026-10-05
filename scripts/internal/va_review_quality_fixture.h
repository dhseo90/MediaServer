// 파일 용도: 실제 모델 호출 전에 고정한 독립 시퀀스 oracle. x=-1은 보이지 않는 회색 화면.
#pragma once
#include <string>
#include <vector>
struct VaQualityCase {const char* id;std::vector<int> x;const char* claim;const char* expected;};
inline std::vector<VaQualityCase> VaQualityCases() {
    return {
        {"two-right",{64,400},"The red square in the last frame is to the right of its position in the first frame.","supports"},
        {"two-left",{400,64},"The red square in the last frame is to the right of its position in the first frame.","contradictions"},
        {"eight-right",{64,112,160,208,256,304,352,400},"The red square in the last frame is to the right of its position in the first frame.","supports"},
        {"eight-left",{400,352,304,256,208,160,112,64},"The red square in the last frame is to the right of its position in the first frame.","contradictions"},
        {"two-static",{208,208},"The red square has different positions in the first and last frames.","contradictions"},
        {"one-red",{208},"A red square is visible.","supports"},
        {"one-blue",{208},"A blue square is visible.","contradictions"},
        {"one-motion",{208},"The red square is moving.","unclear"},
        {"one-direction",{208},"The red square is moving to the right.","unclear"},
        {"blank-hidden",{-1,-1},"A hidden red square is moving to the right behind the gray screen.","unclear"},
        {"eight-static",{208,208,208,208,208,208,208,208},"The visible red square occupies the same position in all frames.","supports"},
        {"occluded-final",{64,-1},"The red square has moved to the right behind the gray screen in the final frame.","unclear"}
    };
}
