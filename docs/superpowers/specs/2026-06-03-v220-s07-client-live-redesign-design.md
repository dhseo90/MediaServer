# v2.2.0 S07 Client Live Redesign Design

## 목적

`V220-S07 Client live redesign`은 `/client` viewer 화면을 live video, viewer-safe
status, viewer-safe event review 중심으로 재정리합니다. S07의 초점은 작은 화면에서
영상이 먼저 보이고, 보조 source tree/event dock/action이 뒤따르며, viewer에게 운영자
debug/source/raw/editor 정보를 노출하지 않는 것입니다.

## 범위

- `/client/live` shell에 viewer-first workspace class를 추가합니다.
- live source dock, live event dock, live primary video grid, live toolbar에 S07 class와
  redaction marker를 추가합니다.
- `/client/dashboard`는 status/event summary를 viewer-safe dashboard class로 묶습니다.
- `/client/events`는 기존 direct route 계약과 viewer redaction 경계를 유지합니다.
- 320/390/760/1180 viewport에서 video-first, no horizontal overflow, toolbar wrap을
  CSS 계약으로 고정합니다.
- S07 산출물 문서, backlog closure, stream verification, feature inventory를 갱신합니다.

## 비범위

- RTSP/WebRTC media path, signaling, ICE, DataChannel, SSE/WS metadata schema를 변경하지
  않습니다.
- Event POST payload, Rule/Profile payload, Auth/session/scope contract를 변경하지
  않습니다.
- `/ops`, `/ops/rules`, `/setup`, `/login`의 전면 재배치는 S07 범위가 아닙니다.
- 브라우저 UI 풀테스트 PASS, 30분 soak, 120분 longrun, published metadata 재검증은
  S07 구현 완료 근거가 아닙니다. 실행 여부를 별도로 보고합니다.

## 설계

S07은 기존 C++ route builder, client JS renderer, `ClientShellCss()` 경계를 유지합니다.
HTML shell에는 `client-viewer-workspace`, `client-viewer-dock`, `client-viewer-detail`을
추가하고, JS 렌더링 결과에는 `client-live-*`, `client-viewer-dashboard`,
`client-viewer-events` class를 추가합니다. 기존 `data-testid`와 control id는
smoke/verifier가 쓰는 계약이므로 삭제하지 않습니다.

반응형 CSS는 새 class를 기준으로 mobile first 보강만 추가합니다. 780px 이하에서는
source dock이 video grid 뒤로 내려가고, toolbar는 wrap/grid로 접히며, 560px 이하에서는
copy/action/select control이 부모 폭을 넘지 않아야 합니다. 1180px 이상에서는 source
dock과 video grid가 dense viewer console처럼 한 화면에서 scan 가능해야 합니다.

## Redaction 계약

Viewer/client 화면에는 source URL, Developer URL, raw JSON, debugCounters,
BBox diagnostics, rule/profile editor, provider credential을 노출하지 않습니다. S07
verifier는 redaction marker와 기존 client forbidden text guard가 유지되는지 확인합니다.

## 검증

S07 집중 검증:

```bash
./server.sh verify-v220-client-live-redesign
./server.sh verify-ops-client-ui --screenshots
git diff --check
```

S07 종료 전 회귀 검증:

```bash
./server.sh build
./server.sh verify-auth-bootstrap
./server.sh verify-auth-users
./server.sh verify-auth-routes
./server.sh verify-v220-component-primitives
./server.sh verify-v220-ops-workspace-redesign
./server.sh verify-v220-rules-workspace-redesign
./server.sh verify-product-ui-token-drift
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-script-inventory
./server.sh verify-feature-inventory-coverage
./server.sh verify-code-comments
./server.sh verify-release-metadata
git diff --check
```
