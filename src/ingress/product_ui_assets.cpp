// 파일 용도: 제품 UI가 사용하는 테마 전환 버튼, 네비게이션 아이콘, 계정 아바타 SVG를 문자열로 생성한다.
#include "ingress/product_ui_assets.h"

namespace ingress {

// 주요 동작: 라이트/다크 모드 전환 버튼의 접근성 라벨과 두 상태 아이콘을 함께 제공한다.
std::string ProductThemeToggleButtonHtml() {
    return R"(<button id="themeToggleBtn" class="theme-toggle" type="button" aria-label="다크 모드로 전환" title="다크 모드로 전환"><svg class="theme-icon-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M21 14.5A7.8 7.8 0 0 1 9.5 3a8.8 8.8 0 1 0 11.5 11.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg><svg class="theme-icon-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.8v2.3M12 18.9v2.3M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.8 12h2.3M18.9 12h2.3M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>)";
}

// 주요 동작: 제품 UI 언어를 한국어/영어 중 선택하고 브라우저에 저장할 select를 제공한다.
std::string ProductLanguageSelectHtml() {
    return R"(<label class="language-control"><span>언어</span><select class="language-select" aria-label="언어 선택" title="언어 선택"><option value="ko">한국어</option><option value="en">English</option></select></label>)";
}

// 주요 동작: 제품 헤더에서 쓰는 정식 브랜드 마크 SVG를 제공한다.
std::string ProductBrandMarkSvg() {
    return R"(<svg class="brand-mark" viewBox="0 0 48 48" role="img" aria-hidden="true" focusable="false"><rect x="7" y="10" width="34" height="24" rx="7" fill="none" stroke="currentColor" stroke-width="3"/><path d="M21 17.5 31 24 21 30.5V17.5Z" fill="currentColor"/><path d="M18 39h12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>)";
}

// 주요 동작: 네비게이션 key에 맞는 inline SVG를 반환하고, 알 수 없는 key는 기본 아이콘으로 대체한다.
std::string ProductNavIconSvg(const std::string& key) {
    if (key == "home") {
        return R"(<svg viewBox="0 0 48 48" role="img" aria-hidden="true" focusable="false"><path d="M8 23 24 10l16 13v16a3 3 0 0 1-3 3h-8V29H19v13h-8a3 3 0 0 1-3-3V23Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>)";
    }
    if (key == "dashboard") {
        return R"(<svg viewBox="0 0 48 48" role="img" aria-hidden="true" focusable="false"><path d="M9 32a15 15 0 1 1 30 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M24 31 33 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M14 36h20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>)";
    }
    if (key == "channels") {
        return R"(<svg viewBox="0 0 48 48" role="img" aria-hidden="true" focusable="false"><rect x="8" y="12" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="3"/><rect x="26" y="12" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="3"/><rect x="8" y="28" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="3"/><rect x="26" y="28" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="3"/></svg>)";
    }
    if (key == "rules") {
        return R"(<svg viewBox="0 0 48 48" role="img" aria-hidden="true" focusable="false"><path d="M13 14h22M13 24h22M13 34h22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="18" cy="14" r="4" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="30" cy="24" r="4" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="23" cy="34" r="4" fill="none" stroke="currentColor" stroke-width="3"/></svg>)";
    }
    if (key == "events") {
        return R"(<svg viewBox="0 0 48 48" role="img" aria-hidden="true" focusable="false"><path d="M24 8 11 30h11l-2 10 17-24H26l-2-8Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>)";
    }
    if (key == "client") {
        return R"(<svg viewBox="0 0 48 48" role="img" aria-hidden="true" focusable="false"><rect x="8" y="11" width="32" height="22" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><path d="M19 40h10M24 33v7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>)";
    }
    if (key == "users") {
        return R"(<svg viewBox="0 0 48 48" role="img" aria-hidden="true" focusable="false"><circle cx="19" cy="18" r="7" fill="none" stroke="currentColor" stroke-width="3"/><path d="M8 39c2-8 7-12 11-12s9 4 11 12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="33" cy="20" r="5" fill="none" stroke="currentColor" stroke-width="3"/><path d="M30 30c5 1 8 4 10 9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>)";
    }
    if (key == "live") {
        return R"(<svg viewBox="0 0 48 48" role="img" aria-hidden="true" focusable="false"><rect x="8" y="11" width="32" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="3"/><path d="m21 18 11 6-11 6V18Z" fill="currentColor"/></svg>)";
    }
    return R"(<svg viewBox="0 0 48 48" role="img" aria-hidden="true" focusable="false"><circle cx="24" cy="24" r="15" fill="none" stroke="currentColor" stroke-width="3"/><path d="M17 25h14M24 18v14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>)";
}

// 주요 동작: 계정 메뉴에서 재사용하는 원형 아바타 SVG를 반환한다.
std::string ProductAccountAvatarSvg() {
    return R"(<svg class="account-avatar" viewBox="0 0 48 48" role="img" aria-label="Account"><circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="24" cy="19" r="7" fill="none" stroke="currentColor" stroke-width="3"/><path d="M12 38c3-8 8-12 12-12s9 4 12 12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>)";
}

}  // namespace ingress
