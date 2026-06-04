# v2.2.0 Ops Channels Workspace

이 문서는 `V220-F02 Ops Channels Workspace 재배치`의 산출물입니다. 목적은
`/ops/sources`를 채널 목록, source detail, 입력 준비, PublishedView, audit 흐름으로
나누어 운영자가 채널 작업 순서를 더 쉽게 스캔하도록 정리하는 것입니다.

F02는 `/ops/sources`의 visual structure와 responsive CSS만 다룹니다.
SourceRegistry/PublishedView API schema, 저장 payload, RTSP/WebRTC media path,
ONVIF probe/import contract, Auth/session/scope contract는 변경하지 않습니다.

## Source Of Truth

- `src/ingress/webrtc_http_server.cpp`
  - `BuildOpsSourcesPageHtml`
  - 기존 `channel-*`, `onvifProbe*`, audit hook ID 유지
- `src/ingress/product_ui_css.cpp`
  - `ops-channels-workspace`
  - `ops-channels-main-grid`
  - `ops-channels-detail-grid`
  - `ops-channels-input-grid`
  - `ops-channels-audit-panel`
- `scripts/internal/verify_v220_ops_channels_workspace.mjs`

## 구현 범위

- `/ops/sources` root에 `data-ops-panel="sources"`,
  `data-channel-workspace="task-units"`, `ops-channels-workspace`를 추가했습니다.
- 채널 목록은 `data-channel-task="list"`로 먼저 표시하고 기존 `channels-body`
  table hook을 유지합니다.
- source detail은 `data-channel-task="detail"`로 분리하고 기존 `channel-form`,
  `channel-save-selected`, `channel-detail-panel` hook을 유지합니다.
- ONVIF, WHEP, WHIP/Published WebRTC 입력은 `data-channel-task="inputs"` 아래에서
  `data-channel-input-group`으로 구분합니다.
- PublishedView 관련 site/group/floor/zone와 source/view scope 경계는
  `data-channel-task="published-view"`로 묶되 기존 저장 payload를 바꾸지 않습니다.
- 채널 변경 이력은 `data-channel-task="audit"`와 기존 `channel-audit-list`로
  분리합니다.

## 변경 금지 경계

- SourceRegistry / PublishedView API 계약
- ONVIF probe/import draft payload
- WHEP/WHIP/RTSP/HTTP 입력 저장 schema
- RTSP/WebRTC media path
- Auth/session/scope contract
- Event POST/WebRTC/SSE/WS metadata schema
- client/viewer source URL, raw JSON, debugCounter 비노출 정책

## 검증

F02 집중 verifier:

```bash
./server.sh verify-v220-ops-channels-workspace
```

관련 route smoke와 기존 채널/PublishedView 경계 보강:

```bash
./server.sh verify-ops-client-ui --screenshots
./server.sh verify-ops-source-lifecycle
./server.sh verify-ops-source-group-site-management
git diff --check
```

이 검증은 `/ops/sources` static contract와 기존 route/source smoke를 확인합니다.
인앱 브라우저 UI 풀테스트, 30분 soak, 120분 longrun, 실장비 ONVIF endpoint/credential
조건은 실행하지 않으면 미실행 또는 제외 기록으로 분리합니다.
