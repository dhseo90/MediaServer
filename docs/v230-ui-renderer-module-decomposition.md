# v2.3.0 S03 UI Renderer/Module Decomposition

이 문서는 V230-S03 `UI renderer/module decomposition`의 module inventory입니다.
목표는 `webrtc_http_server.cpp`, `product_ui_css.cpp`,
`product_ui_page_scripts.cpp`에 집중돼 있던 큰 문자열 UI 경계를 route renderer,
CSS module, JS controller 단위로 나누는 것입니다.

## 분해된 경계

| 경계 | 기존 owner | 현재 owner | 책임 |
| --- | --- | --- | --- |
| Auth route renderer | `src/ingress/webrtc_http_server.cpp` | `include/ingress/product_ui_auth_pages.h`, `src/ingress/product_ui_auth_pages.cpp` | `/setup`, `/login`, `/invite/setup`, `/client/request-access`, `/password/change`, auth landing HTML 생성 |
| Ops shell route renderer | `src/ingress/webrtc_http_server.cpp` | `src/ingress/webrtc_http_server.cpp` | HTTP route dispatch, Ops shell 조립, API/media/auth glue 유지 |
| Client CSS module | `src/ingress/product_ui_css.cpp` | `src/ingress/product_ui_client_css.cpp` | `ClientShellCss`와 client/viewer 전용 CSS |
| Shared/Ops CSS module | `src/ingress/product_ui_css.cpp` | `src/ingress/product_ui_css.cpp` | design token, 제품 공통 CSS, Ops/rules/channels/users CSS |
| Client JS controller | `src/ingress/product_ui_page_scripts.cpp` | `src/ingress/product_ui_client_scripts.cpp` | 접근 요청 form, `/client/live`, `/client/dashboard`, `/client/events` controller |
| Ops shell JS controller | `src/ingress/product_ui_page_scripts.cpp` | `src/ingress/product_ui_page_scripts.cpp` | `/ops/home`, `/ops/dashboard`, `/ops/events`, `/ops/rules`, `/ops/vlm` 공통 controller |
| Ops sources JS controller | `src/ingress/product_ui_page_scripts.cpp` | `src/ingress/product_ui_ops_sources_script.cpp` | `/ops/sources` 채널 목록/detail/input/PublishedView/audit controller |
| Ops users JS controller | `src/ingress/product_ui_page_scripts.cpp` | `src/ingress/product_ui_ops_users_script.cpp` | `/ops/users` 사용자/초대/요청/role-scope/audit controller |

## 컴파일 경계

`CMakeLists.txt`는 아래 source를 명시적으로 빌드합니다.

- `src/ingress/product_ui_auth_pages.cpp`
- `src/ingress/product_ui_client_css.cpp`
- `src/ingress/product_ui_client_scripts.cpp`
- `src/ingress/product_ui_ops_sources_script.cpp`
- `src/ingress/product_ui_ops_users_script.cpp`

기존 공개 API 중 `ProductDesignTokensCss`, `ProductUiCss`, `ClientShellCss`,
`AppendClientAccessRequestScript`, `AppendClientShellScript`,
`AppendOpsShellScript`, `AppendOpsSourcesPageScript`,
`AppendOpsUsersPageScript`의 호출 이름은 유지합니다.

## 불변 조건

이번 분해는 파일 경계 이동이며 아래 제품 계약을 바꾸지 않습니다.

- Event POST payload
- WebRTC DataChannel payload
- SSE/WS metadata schema
- RTSP/WebRTC media path
- Auth/session/scope contract
- Rule/Profile payload schema
- `/ops/rules` smoke selector와 Rule/Profile 저장 흐름
- client/viewer source URL, Developer URL, raw JSON, debugCounters, BBox diagnostics 비노출 경계

## 검증 경계

S03 안정화 evidence는 아래 명령이 담당합니다.

```bash
./server.sh verify-v230-ui-renderer-module-decomposition
./server.sh build
./server.sh verify-ops-client-ui
./server.sh verify-rule-ui
git diff --check
```

`verify-v230-ui-renderer-module-decomposition`은 module inventory와 source ownership을
확인하는 정적 gate입니다. route smoke, UI 직접 조작, 30분 테스트, 120분 테스트,
UI 풀테스트 실행 evidence를 대체하지 않습니다.

30분 테스트와 120분 테스트는 사용자 명시 지시가 있을 때만 실행합니다.
UI 풀테스트는 인앱 브라우저에서 직접 route/control/action을 조작한 evidence가
있을 때만 PASS입니다.
