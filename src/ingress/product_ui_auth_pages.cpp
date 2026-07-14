// 파일 용도: /setup, /login, /invite/setup, /client/request-access 인증 route HTML을 렌더링한다.
#include "ingress/product_ui_auth_pages.h"

#include <sstream>
#include <string>

#include "ingress/product_ui_assets.h"
#include "ingress/product_ui_components.h"
#include "ingress/product_ui_css.h"
#include "ingress/product_ui_js.h"
#include "ingress/product_ui_page_scripts.h"

namespace ingress {

namespace {

std::string HtmlEscape(const std::string& value) {
    std::string escaped;
    escaped.reserve(value.size());
    for (const char ch : value) {
        switch (ch) {
            case '&':
                escaped += "&amp;";
                break;
            case '<':
                escaped += "&lt;";
                break;
            case '>':
                escaped += "&gt;";
                break;
            case '"':
                escaped += "&quot;";
                break;
            case '\'':
                escaped += "&#39;";
                break;
            default:
                escaped += ch;
                break;
        }
    }
    return escaped;
}

}  // namespace

namespace {

void AppendAuthShellStart(std::ostringstream& out,
                          const std::string& title,
                          const std::string& eyebrow,
                          const std::string& card_extra_class = "") {
    out << R"(<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>)" << HtmlEscape(title) << R"(</title>
)" << ProductThemeBootScript() << ProductUiCss() << ProductSharedUiScript() << R"(
</head>
<body class="auth-shell auth-responsive-shell" data-auth-shell="responsive-form">
  <div class="auth-theme-control auth-responsive-control">)" << ProductThemeToggleButtonHtml() << ProductLanguageSelectHtml() << R"(</div>
  <main class="auth-card auth-responsive-card)" << (card_extra_class.empty() ? "" : " " + HtmlEscape(card_extra_class)) << R"(">
    <div class="auth-actions">
      <p class="eyebrow">)" << HtmlEscape(eyebrow) << R"(</p>
    </div>
)";
}

void AppendAuthShellEnd(std::ostringstream& out) {
    AppendProductThemeScript(out);
    out << R"(
  </main>
</body>
</html>)";
}

std::string AuthMessageHtml(const std::string& message, bool failed) {
    if (message.empty()) {
        return std::string();
    }
    return "<div class=\"message auth-message" + std::string(failed ? " error" : "") +
           "\" data-testid=\"auth-message\">" + HtmlEscape(message) + "</div>\n";
}


}  // namespace

std::string LoginPageHtml(const std::string& message, bool failed) {
    std::ostringstream out;
    AppendAuthShellStart(out, "MediaServer Login", "MediaServer");
    out << R"(    <form class="auth-form auth-form-grid" method="post" action="/login" data-testid="auth-login-form">
      <h1>로그인</h1>
)";
    out << AuthMessageHtml(message, failed);
    out << "      " << ProductUiFormRowHtml("계정명",
                                             R"(<input name="username" autocomplete="username" required />)")
        << "\n";
    out << "      " << ProductUiFormRowHtml("비밀번호",
                                             R"(<input name="password" type="password" autocomplete="current-password" required />)")
        << "\n";
    out << R"(
      <button class="primary" type="submit">로그인</button>
    </form>
)";
    AppendAuthShellEnd(out);
    return out.str();
}

std::string PasswordPolicyHintHtml() {
    return R"(<div class="auth-helper-panel auth-policy-hint" data-testid="auth-password-policy"><p class="hint">기본 kr-privacy 정책: 대문자/소문자/숫자/특수문자 중 3종류 이상이면 최소 8자, 2종류 조합이면 최소 10자입니다. username, 반복 문자, 연속 숫자, 키보드 배열, 흔한 비밀번호, 이전 비밀번호 재사용은 허용하지 않습니다.</p></div>)";
}

std::string SetupPageHtml(const std::string& message, bool failed) {
    std::ostringstream out;
    AppendAuthShellStart(out, "MediaServer Setup", "Initial Setup");
    out << R"(    <form class="auth-form auth-form-grid" method="post" action="/setup" data-testid="auth-setup-form">
      <h1>관리자 설정</h1>
      <p>기본 admin 계정에 강한 비밀번호를 설정한 뒤 제품 화면으로 이동합니다.</p>
)";
    out << AuthMessageHtml(message, failed);
    out << "      " << ProductUiFormRowHtml("계정명",
                                             R"(<input name="username" value="admin" readonly />)")
        << "\n";
    out << "      " << ProductUiFormRowHtml("비밀번호",
                                             R"(<input name="password" type="password" autocomplete="new-password" required />)")
        << "\n";
    out << "      " << ProductUiFormRowHtml("비밀번호 확인",
                                             R"(<input name="confirm" type="password" autocomplete="new-password" required />)")
        << "\n";
    out << "      " << PasswordPolicyHintHtml() << R"(
      <button class="primary" type="submit">관리자 비밀번호 설정</button>
    </form>
)";
    AppendAuthShellEnd(out);
    return out.str();
}

std::string InviteSetupPageHtml(const std::string& token,
                                const std::string& message,
                                bool failed) {
    std::ostringstream out;
    AppendAuthShellStart(out, "초대 설정", "Invite Setup");
    out << R"(    <form class="auth-form auth-form-grid" method="post" action="/invite/setup" data-testid="auth-invite-setup-form" data-access-route="invite-setup">
      <h1>초대 계정 설정</h1>
      <p>관리자가 발급한 초대 토큰으로 비밀번호를 설정합니다.</p>
)";
    out << AuthMessageHtml(message, failed);
    out << "      " << ProductUiFormRowHtml("초대 토큰",
                                             std::string(R"(<input name="token" value=")") +
                                                 HtmlEscape(token) +
                                                 R"(" autocomplete="off" required />)")
        << "\n";
    out << "      " << ProductUiFormRowHtml("비밀번호",
                                             R"(<input name="password" type="password" autocomplete="new-password" required />)")
        << "\n";
    out << "      " << ProductUiFormRowHtml("비밀번호 확인",
                                             R"(<input name="confirm" type="password" autocomplete="new-password" required />)")
        << "\n";
    out << "      " << PasswordPolicyHintHtml() << R"(
      <button class="primary" type="submit">비밀번호 설정</button>
    </form>
)";
    AppendAuthShellEnd(out);
    return out.str();
}

std::string ClientAccessRequestPageHtml() {
    std::ostringstream out;
    AppendAuthShellStart(out, "시청 권한 요청", "Client Access", "auth-card-wide");
    out << R"(    <form id="request-form" class="auth-form auth-form-grid" data-testid="auth-access-request-form" data-access-route="request-access">
      <h1>시청 권한 요청</h1>
      <p>요청은 승인 대기 상태로 저장되며 관리자 승인 전에는 로그인이나 채널 접근이 허용되지 않습니다.</p>
      <div id="message" class="message auth-message" data-testid="auth-message" hidden></div>
      )" << ProductUiFormRowHtml("계정명", R"(<input name="username" autocomplete="username" required />)")
          << R"(
      )" << ProductUiFormRowHtml("표시 이름", R"(<input name="displayName" />)")
          << R"(
      )" << ProductUiFormRowHtml("연락처", R"(<input name="contact" autocomplete="email" />)")
          << R"(
      )" << ProductUiFormRowHtml("요청 채널 ID", R"(<input name="viewId" placeholder="선택 사항" />)")
          << R"(
      )" << ProductUiFormRowHtml("사유", R"(<textarea name="reason" required></textarea>)")
          << R"(
      <button type="submit">요청 제출</button>
    </form>
)";
    AppendClientAccessRequestScript(out);
    AppendAuthShellEnd(out);
    return out.str();
}

std::string PasswordChangePageHtml(const ProductUiPrincipalView& principal,
                                   const std::string& message,
                                   bool failed) {
    std::ostringstream out;
    AppendAuthShellStart(out, "비밀번호 변경", "Password Change");
    out << R"(    <form class="auth-form auth-form-grid" method="post" action="/password/change" data-testid="auth-password-change-form">
      <h1>비밀번호 변경</h1>
      <p>)" << HtmlEscape(principal.display_name) << R"( 계정의 비밀번호를 새 정책에 맞게 변경합니다.</p>
)";
    out << AuthMessageHtml(message, failed);
    out << "      " << ProductUiFormRowHtml("현재 비밀번호",
                                             R"(<input name="currentPassword" type="password" autocomplete="current-password" required />)")
        << "\n";
    out << "      " << ProductUiFormRowHtml("새 비밀번호",
                                             R"(<input name="password" type="password" autocomplete="new-password" required />)")
        << "\n";
    out << "      " << ProductUiFormRowHtml("새 비밀번호 확인",
                                             R"(<input name="confirm" type="password" autocomplete="new-password" required />)")
        << "\n";
    out << "      " << PasswordPolicyHintHtml() << R"(
      <button class="primary" type="submit">비밀번호 변경</button>
    </form>
)";
    AppendAuthShellEnd(out);
    return out.str();
}

std::string AuthLandingPageHtml(const ProductUiPrincipalView& principal,
                                const std::string& title,
                                const std::string& body) {
    std::ostringstream out;
    out << R"(<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>)" << HtmlEscape(title) << R"(</title>
)" << ProductThemeBootScript() << ProductUiCss() << ProductSharedUiScript() << R"(
</head>
<body class="product-shell">
  <main class="product-page">
    <header class="app-header">
      <div class="app-header-top">
      <div>
        <h1>)" << HtmlEscape(title) << R"(</h1>
        <p>)" << HtmlEscape(body) << R"(</p>
      </div>
      <div class="header-utilities">
        )" << ProductThemeToggleButtonHtml() << ProductLanguageSelectHtml() << R"(
        <form method="post" action="/logout"><button class="button-secondary" type="submit">로그아웃</button></form>
      </div>
      </div>
    </header>
    <section class="panel">
      <strong>)" << HtmlEscape(principal.display_name) << R"(</strong>
      <div class="meta">
        )" << ProductUiStatusBadgeHtml("권한: " + principal.role)
            << ProductUiStatusBadgeHtml("인증: " + principal.auth_mode) << R"(
      </div>
      <p>)";
    for (std::size_t i = 0; i < principal.scopes.size(); ++i) {
        if (i != 0) {
            out << " · ";
        }
        out << HtmlEscape(principal.scopes[i]);
    }
    out << R"(</p>
    </section>
)";
    if (principal.can_access_ops_sources) {
        out << R"(    <section class="section-card"><a class="button button-primary" href="/ops/sources">채널 관리</a></section>
)";
    }
    AppendProductThemeScript(out);
    out << R"(
  </main>
</body>
</html>)";
    return out.str();
}

}  // namespace ingress
