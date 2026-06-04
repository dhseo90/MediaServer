# v2.2.0 S05 Ops Workspace Redesign Design

## 목적

`V220-S05 Ops workspace redesign`은 `/ops/home`, `/ops/dashboard`, `/ops/events`를
운영자가 반복적으로 쓰는 작업 흐름 기준으로 재배치합니다. 색상만 바꾸는 작업이
아니라, S02의 responsive task shell, S03의 design token, S04의 component primitive를
실제 Ops route에 적용해 320/390/760/1180+ viewport에서 같은 기능을 더 잘 스캔하고
조작할 수 있게 만듭니다.

## 범위

이번 단계에서 변경하는 제품 화면은 아래 세 route입니다.

- `/ops/home`: 운영 상태 요약과 다음 조치 선택
- `/ops/dashboard`: source/runtime/event 원인 판독
- `/ops/events`: event review와 filtering

`/ops/sources`, `/ops/rules`, `/ops/users`, `/client`, `/setup`, `/login`의 전면
재배치는 후속 S06~S08 범위입니다. 단, S05 검증을 위해 기존 route smoke가 깨지지
않는지 확인합니다.

## UI 방향

1. `/ops/home`은 운영 지휘 화면으로 둡니다. 첫 화면은 현재 구성, 런타임 상태,
   위험 신호, 바로 갈 action을 한 묶음으로 보여줍니다.
2. `/ops/dashboard`는 진단 화면으로 둡니다. root cause, incident timeline,
   runtime operations, VA quality를 동일한 판독 흐름 안에서 배치합니다.
3. `/ops/events`는 이벤트 작업대입니다. 이벤트 저장소/Event POST/증거/보존 상태를
   상단 요약으로 두고, alert delivery, review inbox, recent records를 순서대로
   이어지는 작업 흐름으로 정리합니다.
4. 작은 화면에서는 primary task를 먼저 보여주고, filter/action은 줄바꿈 가능한
   compact toolbar 또는 full-width control로 내려갑니다.
5. 데스크톱에서는 dense scan/compare/action이 가능하도록 metric grid와 workspace
   section을 2~4열로 배치합니다.

## 구현 경계

- `src/ingress/webrtc_http_server.cpp`의 Ops overview HTML builder를 정리합니다.
- `src/ingress/product_ui_css.cpp`에 Ops workspace 전용 layout class를 추가합니다.
- `docs/v220-ops-workspace-redesign.md`를 S05 산출물로 추가합니다.
- `scripts/internal/verify_v220_ops_workspace_redesign.mjs`를 추가하고 `server.sh`에
  `verify-v220-ops-workspace-redesign` 명령을 연결합니다.
- 기존 `id`, `data-testid`, route path, button id, form control id는 유지합니다.
  기존 JS가 찾는 DOM hook을 바꾸지 않습니다.

## 변경 금지

S05는 아래 contract를 변경하지 않습니다.

- Event POST payload
- WebRTC DataChannel payload
- SSE/WS metadata schema
- RTSP/WebRTC media path
- Auth/session/scope contract
- Rule/Profile payload schema
- `/ops/rules` smoke selector와 저장 roundtrip
- client/viewer source URL, Developer URL, raw JSON, debugCounters, BBox diagnostics,
  rule/profile editor 비노출 정책

## 검증 기준

S05 완료는 아래 evidence로만 판정합니다.

- `./server.sh build`
- `./server.sh verify-v220-ops-workspace-redesign`
- `./server.sh verify-v220-component-primitives`
- `./server.sh verify-product-ui-token-drift`
- `./server.sh verify-ops-click-e2e`
- `./server.sh verify-ops-client-ui --screenshots`
- `./server.sh verify-rule-ui`
- `git diff --check`

브라우저 UI 풀테스트, 30분 soak, 120분 longrun, published metadata 재검증은 S05 완료
근거가 아니며, 실행하지 않으면 미실행으로 보고합니다.

## 완료 정의

- `/ops/home`, `/ops/dashboard`, `/ops/events`에 S05 workspace class와 responsive
  section 구조가 존재합니다.
- S04 component primitive가 S05 route에서 계속 소비됩니다.
- 320/390/760/1180+ viewport 정책을 문서와 verifier가 확인합니다.
- 기존 JS hook과 `data-testid`가 유지됩니다.
- 변경 금지 contract를 건드리지 않았음을 검증과 diff review로 확인합니다.
