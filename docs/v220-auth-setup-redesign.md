# v2.2.0 Auth Setup Redesign

이 문서는 `V220-S08 Auth/setup redesign`의 산출물입니다. 목적은 `/setup`, `/login`,
`/password/change`, `/invite/setup`, `/client/request-access`를 같은 responsive form
layout과 design token 기준으로 정리하는 것입니다.

S08은 auth form의 visual structure와 responsive CSS만 다룹니다. auth route guard,
session/scope/role 정책, password policy, invite token 처리, access request API schema는
변경하지 않습니다. `/ops/users` lifecycle UI와 v2.2.0 UI fulltest matrix는 후속 S09
범위입니다.

## Source Of Truth

- `src/ingress/webrtc_http_server.cpp`
  - `AppendAuthShellStart`
  - `LoginPageHtml`
  - `SetupPageHtml`
  - `InviteSetupPageHtml`
  - `ClientAccessRequestPageHtml`
  - `PasswordChangePageHtml`
- `src/ingress/product_ui_css.cpp`
  - `auth-responsive-shell`
  - `auth-responsive-card`
  - `auth-form-grid`
  - `auth-helper-panel`
  - `auth-message`
- `scripts/internal/verify_v220_auth_setup_redesign.mjs`

## 구현 범위

- 공통 auth shell에 `auth-responsive-shell`, `auth-responsive-card`,
  `data-auth-shell="responsive-form"`을 추가했습니다.
- route별 form에 `auth-form-grid`와 stable `data-testid`를 추가했습니다.
- setup, invite setup, password change, access request form을 `ProductUiFormRowHtml`
  기반 row로 정리했습니다.
- password policy hint는 `auth-helper-panel auth-policy-hint`로 묶었습니다.
- form message/error 영역은 `auth-message`로 묶었습니다.
- 760px/560px 이하에서 theme/language controls, card, input, textarea, button이
  부모 폭 안에 머물도록 CSS를 보강했습니다.

## 변경 금지 경계

S08은 아래를 변경하지 않습니다.

- auth route guard
- Auth/session/scope/role contract
- password policy와 password history 정책
- invite token 생성/검증/만료 정책
- access request API schema/rate limit
- RTSP/WebRTC media path
- Event POST/WebRTC/SSE/WS metadata schema

## 검증

S08 집중 verifier:

```bash
./server.sh verify-v220-auth-setup-redesign
```

Auth route guard와 form flow 보강:

```bash
./server.sh verify-auth-bootstrap
./server.sh verify-auth-users
./server.sh verify-auth-routes
git diff --check
```

이 검증은 S08 static contract와 auth smoke를 확인합니다. 인앱 브라우저 UI 풀테스트,
30분 soak, 120분 longrun, published metadata 재검증은 이 문서의 PASS로 대체하지
않습니다.
