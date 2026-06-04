# v2.2.0 Ops Users / Access Workspace 재배치

이 문서는 `V220-F03 Ops Users / Access Workspace 재배치`의 산출물입니다. 목적은
`/ops/users`, `/client/request-access`, `/invite/setup`의 사용자, 초대, 승인,
role/scope 흐름을 운영자가 검수 가능한 작업 단위로 나누는 것입니다.

## 범위

- `/ops/users`
  - `ops-users-access-workspace`
  - `ops-users-access-grid`
  - `data-access-task="users"`
  - `data-access-task="requests"`
  - `data-access-task="invites"`
  - `data-access-task="role-scope"`
  - `data-access-task="audit"`
- `/client/request-access`
  - `data-access-route="request-access"`
  - 기존 `auth-access-request-form`, `request-form`, `viewId`, `reason`, `message` hook 유지
- `/invite/setup`
  - `data-access-route="invite-setup"`
  - 기존 `auth-invite-setup-form`, `token`, `password`, `confirm` hook 유지

## 구현 기준

- 사용자 목록은 `data-access-task="users"`로 두고 기존 `users-body`, 사용자 detail,
  password reset, enable/disable hook을 유지합니다.
- 접근 요청은 `data-access-task="requests"`로 두고 기존 공개 request submit과
  운영 승인/거절 API 흐름을 유지합니다. 승인 전에는 user/password/session/view
  scope가 열리지 않습니다.
- 초대 발급/목록은 `data-access-task="invites"`로 두고 one-time token 표시 경계를
  유지합니다. 목록에는 token과 tokenHash를 노출하지 않습니다.
- role/scope 편집은 `data-access-task="role-scope"`와
  `data-scope-contract="role-scope-unchanged"`로 묶되, 기존 role default와 view
  assignment scope template 계산을 바꾸지 않습니다.
- 감사 흐름은 `data-access-task="audit"`와 기존 `user-audit-list` hook으로 유지합니다.

## 변경하지 않는 것

- Auth/session/scope/role contract
- password policy와 password history policy
- invite token 저장/노출 contract
- access request API schema와 rate-limit/approval contract
- SourceRegistry/PublishedView API contract
- Event POST, WebRTC DataChannel, SSE/WS metadata schema
- RTSP/WebRTC media path

## 검증

```bash
./server.sh verify-v220-ops-users-access-workspace
./server.sh verify-auth-bootstrap
./server.sh verify-auth-users
./server.sh verify-auth-routes
./server.sh verify-auth-ui-smoke
./server.sh verify-auth-scope-picker
./server.sh verify-ops-client-ui --screenshots
git diff --check
```

위 명령은 F03 route/CSS/문서 연결과 auth/access smoke를 확인합니다. 인앱 브라우저
UI 풀테스트, 30분 soak, 120분 longrun은 실행하지 않으면 미실행으로 분리해 보고합니다.
