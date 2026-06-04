# v2.2.0 Client Live Redesign

이 문서는 `V220-S07 Client live redesign`의 산출물입니다. 목적은 `/client` viewer
화면을 video-first, viewer-safe, responsive workspace 기준으로 정리하는 것입니다.

S07은 `/client/live`, `/client/dashboard`, `/client/events`의 화면 구조와 CSS class를
다룹니다. `/setup`, `/login`, `/password/change`, `/invite/setup`의 전면 재배치는 S08
범위입니다. 브라우저 UI 풀테스트 PASS, 30분 soak, 120분 longrun은 S07 완료 근거가
아니며 별도 close-out에서 실행/미실행을 분리합니다.

## Source Of Truth

- `src/ingress/webrtc_http_server.cpp`
  - `ClientShellPageHtml`
  - `ClientShellActiveForPath`
- `src/ingress/product_ui_page_scripts.cpp`
  - `renderDashboard`
  - `renderEventPage`
  - `liveSourceTreeHtml`
  - `liveMonitorHtml`
- `src/ingress/product_ui_css.cpp`
  - `ClientShellCss()`
  - `client-viewer-*`
  - `client-live-*`
- `scripts/internal/verify_v220_client_live_redesign.mjs`

## 구현 범위

- `/client/live` shell에 `client-viewer-workspace`, `client-viewer-dock`,
  `client-viewer-detail`을 추가했습니다.
- live renderer에 `client-live-workspace`, `client-live-layout`,
  `client-live-primary`, `client-live-video-grid`, `client-live-dock`,
  `client-live-event-dock`을 추가했습니다.
- `/client/dashboard`에는 `client-viewer-dashboard`와 status/event summary 흐름을
  표시하는 `data-viewer-flow="status-events"`를 추가했습니다.
- `/client/events` direct route는 `data-client-active="events"`로 event renderer를
  사용하고, `client-viewer-events`, `data-viewer-flow="events-first"`를 추가했습니다.
- 780px 이하에서는 source dock이 video grid 뒤로 내려가고, 560px 이하에서는 toolbar
  control이 single-column으로 접히도록 CSS를 보강했습니다.

## Viewer Redaction

viewer redaction 계약은 유지합니다.

- viewer/client 화면에는 source URL, Developer URL, raw JSON, debugCounters,
  BBox diagnostics, rule/profile editor, provider credential을 노출하지 않습니다.
- live source dock에는 `data-viewer-redaction="source-url-hidden"` marker를 둡니다.
- live event dock에는 기존 `data-redaction="viewer-safe-events"` marker를 유지합니다.
- `/client/events` direct route는 viewer scope 안의 event summary만 표시합니다.

## 변경 금지 경계

S07은 아래를 변경하지 않습니다.

- Event POST payload schema
- WebRTC DataChannel schema
- SSE/WS metadata schema
- RTSP/WebRTC media path
- Auth/session/scope contract
- Rule/Profile payload schema
- `/ops/rules` smoke selector와 저장 roundtrip

## 검증

S07 집중 verifier:

```bash
./server.sh verify-v220-client-live-redesign
```

S07 route smoke와 redaction/screenshot 보강:

```bash
./server.sh verify-ops-client-ui --screenshots
git diff --check
```

이 검증은 S07 static contract와 기존 route smoke를 확인합니다. 인앱 브라우저 UI
풀테스트, 30분 soak, 120분 longrun, published metadata 재검증은 이 문서의 PASS로
대체하지 않습니다.
