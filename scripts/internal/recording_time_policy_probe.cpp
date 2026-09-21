// 파일 용도: 실제 mux/파일/복구를 모사하지 않는 S10-2 판정 모델의 결정적 검증.
#include "recording_time_policy_probe.h"
#include <iostream>

using namespace recording_time_probe;
int main() {
    int passed = 0, failed = 0;
    const auto check = [&](bool ok, const char* id) {
        std::cout << (ok ? "PASS " : "FAIL ") << id << '\n';
        ok ? ++passed : ++failed;
    };
    const Clock anchor{1, 0, 10000000000LL, 0};
    check(Compare(anchor, {1, 1000000000, 11000000000LL, 1000000000}) == ClockDecision::Stable, "P01 정상 clock");
    check(Compare(anchor, {1, 1000000000, 6966000000LL, 1000000000}) == ClockDecision::StepBack, "P02 UTC만 4034ms 후퇴");
    check(Compare(anchor, {1, 1000000000, 15034000000LL, 1000000000}) == ClockDecision::StepForward, "P03 UTC만 4034ms 전진");
    check(Compare(anchor, {1, 1000000000, 11052000000LL, 1000000000}) == ClockDecision::Stable, "P04 오차예산 경계 포함");
    check(Compare(anchor, {1, 1000000000, 11052000001LL, 1000000000}) == ClockDecision::Remap, "P05 누적오차 예산 초과");
    check(Compare(anchor, {1, 200000000000LL, 210080000000LL, 200000000000LL}) == ClockDecision::Remap, "P06 400ppm 누적 drift는 step 아님");
    check(Compare(anchor, {1, 1000000000, 11000000000LL, 1010000000}) == ClockDecision::Unknown, "P07 지연된 clock 읽기");
    check(Compare(anchor, {2, 1000000000, 11000000000LL, 1000000000}) == ClockDecision::Unknown, "P08 다른 프로세스 clock");
    check(Compare(anchor, {1, 1000000000, 11000000000LL, 999999999}) == ClockDecision::Unknown, "P09 역전된 측정 구간");
    const Sample original{1, 10, 100, 80, 20};
    check(Classify(original, {1, 11, 120, 100, 20}) == Continuity::Same, "P10 정상 decode 순서");
    check(Classify(original, {1, 11, 90, 100, 20}) == Continuity::Reordered, "P11 PTS 재정렬");
    check(Classify(original, {1, 11, 100, 100, 20}) == Continuity::Reordered, "P12 중복 PTS는 고유 프레임 아님");
    check(Classify(original, original) == Continuity::Replay, "P13 동일 관측 재전달");
    check(Classify(original, {2, 0, 0, 0, 20}) == Continuity::NewEpoch, "P14 명시적 입력 세대 변경");
    check(Classify(original, {1, 11, 0, std::nullopt, 20}) == Continuity::Unknown, "P15 DTS 부재로 재시작 추정 금지");
    check(Classify(original, {1, 11, 0, 0, 20}) == Continuity::Unknown, "P16 DTS 후퇴만으로 재시작 추정 금지");
    check(KnownEnd(original) == 120, "P17 마지막 프레임 알려진 끝");
    check(!KnownEnd({1, 1, 0, 0, std::nullopt}), "P18 duration 부재는 unknown");
    check(KnownEnd({1, 1, 0, 0, 20}) == 20, "P19 실제 PTS 0 유효");
    check(!KnownEnd({1, 1, std::nullopt, 0, 20}), "P20 PTS 부재는 0 아님");
    check(!KnownEnd({1, 1, INT64_MAX, 0, 1}), "P21 끝 overflow 거부");
    check(!KnownEnd({1, 1, 0, 0, 0}), "P22 빈 duration 거부");
    check(CanAppendMapping(255) && !CanAppendMapping(256), "P23 매핑 관측 개수 상한");
    std::cout << "SUMMARY pass=" << passed << " fail=" << failed << " productIntegration=false\n";
    return failed ? 1 : 0;
}
