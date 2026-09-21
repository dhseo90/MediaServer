#pragma once
// 파일 용도: 확인된 applemedia/H264 조합에만 적용하는 객체별 자동 디코더 선택 호환 경계.
#include <string_view>

struct _GstElement;
namespace core {
bool ShouldSkipAppleH264Decoder(bool macos, bool fixed_caps,
    std::string_view media_type, std::string_view factory,
    std::string_view plugin, std::string_view version) noexcept;

// root가 NULL 상태일 때 설치한다. 전역 rank/설정 및 callback 외부 상태를 보유하지 않는다.
// false는 신호 계약/순회 오류이며 호출자는 준비 실패로 취급한다.
bool InstallDecodeCompatibility(_GstElement* root) noexcept;
} // namespace core
