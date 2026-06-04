# v2.2.0 Client Preview / Viewer Redaction 재검수 정리

이 문서는 `V220-F05 Client Preview / Viewer Redaction 재검수 중심 정리`의 산출물입니다.
목적은 `/client/live`, `/client/dashboard`, `/client/events`에서 admin preview 상태와
viewer-safe 비노출 경계를 검수하기 쉽게 표시하는 것입니다.

## 범위

- `/client/live`
  - `data-client-preview-boundary="admin-preview-viewer-safe"`
  - `data-client-redaction-review="viewer-safe-no-locator-debug"`
  - `data-admin-preview-review="preview-aware"`
- `/client/dashboard`
  - `data-viewer-flow="status-events"`
  - `data-client-redaction-review="viewer-safe-no-locator-debug"`
  - `data-admin-preview-review="preview-aware"`
- `/client/events`
  - `data-viewer-flow="events-first"`
  - `data-client-redaction-review="viewer-safe-no-locator-debug"`
  - `data-admin-preview-review="preview-aware"`

## 구현 기준

- admin/operator가 `ops:read` scope로 client route를 열면 기존
  `data-client-preview="true"`와 `관리자 클라이언트 미리보기` 상태를 유지합니다.
- viewer route는 client workspace 안에 compact review strip을 보여주되 forbidden
  material 이름을 화면 문구로 직접 쓰지 않습니다.
- live source dock, live event feed, live workspace, dashboard shell, events shell은
  같은 viewer-safe review marker를 사용합니다.
- 기존 client forbidden text guard가 source locator, raw debug material, internal
  VLM/Ops material을 계속 차단합니다.

## 변경하지 않는 것

- Client PublishedView API schema
- client live WebRTC wrapper/session alias contract
- Event POST, WebRTC DataChannel, SSE/WS metadata schema
- RTSP/WebRTC media path
- Auth/session/scope/role contract
- `/ops/sources`, `/ops/rules`, `/ops/vlm` API contract

## 검증

```bash
./server.sh verify-v220-client-preview-redaction-review
./server.sh verify-v220-client-live-redesign
./server.sh verify-ops-client-ui --screenshots
./server.sh verify-auth-routes
git diff --check
```

위 명령은 F05 route/CSS/문서 연결, admin preview marker, viewer-safe forbidden text
guard를 확인합니다. 인앱 브라우저 UI 풀테스트, 30분 soak, 120분 longrun은 실행하지
않으면 미실행으로 분리해 보고합니다.
