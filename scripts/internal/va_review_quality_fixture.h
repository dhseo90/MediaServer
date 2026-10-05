// 파일 용도: 실제 모델 호출 전에 고정한 독립 시퀀스 oracle. x=-1은 보이지 않는 회색 화면.
#pragma once
#include <string>
#include <vector>
struct VaQualityCase {const char* id;std::vector<int> x;const char* claim;const char* expected;};
inline std::vector<VaQualityCase> VaQualityCases() {
    return {
        {"two-right",{64,400},"마지막 프레임의 빨간 사각형은 첫 프레임의 위치보다 오른쪽에 있다.","supports"},
        {"two-left",{400,64},"마지막 프레임의 빨간 사각형은 첫 프레임의 위치보다 오른쪽에 있다.","contradictions"},
        {"eight-right",{64,112,160,208,256,304,352,400},"마지막 프레임의 빨간 사각형은 첫 프레임의 위치보다 오른쪽에 있다.","supports"},
        {"eight-left",{400,352,304,256,208,160,112,64},"마지막 프레임의 빨간 사각형은 첫 프레임의 위치보다 오른쪽에 있다.","contradictions"},
        {"two-static",{208,208},"빨간 사각형의 첫 프레임과 마지막 프레임 위치가 서로 다르다.","contradictions"},
        {"one-red",{208},"빨간 사각형이 보인다.","supports"},
        {"one-blue",{208},"파란 사각형이 보인다.","contradictions"},
        {"one-motion",{208},"빨간 사각형이 움직이고 있다.","unclear"},
        {"one-direction",{208},"빨간 사각형이 오른쪽으로 움직이고 있다.","unclear"},
        {"blank-hidden",{-1,-1},"회색 화면 뒤에 가려진 빨간 사각형이 오른쪽으로 움직이고 있다.","unclear"},
        {"eight-static",{208,208,208,208,208,208,208,208},"빨간 사각형은 모든 프레임에서 같은 위치에 있다.","supports"},
        {"occluded-final",{64,-1},"마지막 프레임에서 빨간 사각형이 회색 화면 뒤로 가려진 채 오른쪽으로 이동했다.","unclear"}
    };
}
// 원래 12사례와 분리한 원인 분리용 세 쌍. 영상 바이트를 유지하고 주장만 뒤집는다.
inline std::vector<VaQualityCase> VaClaimPairs() {
    return {
        {"two-left-right",{400,64},"마지막 프레임의 빨간 사각형은 첫 프레임의 위치보다 오른쪽에 있다.","contradictions"},
        {"two-left-left",{400,64},"마지막 프레임의 빨간 사각형은 첫 프레임의 위치보다 왼쪽에 있다.","supports"},
        {"eight-left-right",{400,352,304,256,208,160,112,64},"마지막 프레임의 빨간 사각형은 첫 프레임의 위치보다 오른쪽에 있다.","contradictions"},
        {"eight-left-left",{400,352,304,256,208,160,112,64},"마지막 프레임의 빨간 사각형은 첫 프레임의 위치보다 왼쪽에 있다.","supports"},
        {"static-different",{208,208},"빨간 사각형의 첫 프레임과 마지막 프레임 위치가 서로 다르다.","contradictions"},
        {"static-same",{208,208},"빨간 사각형의 첫 프레임과 마지막 프레임 위치가 서로 같다.","supports"}
    };
}
