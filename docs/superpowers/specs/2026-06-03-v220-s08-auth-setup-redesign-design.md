# v2.2.0 S08 Auth Setup Redesign Design

## 목적

`V220-S08 Auth/setup redesign`은 `/setup`, `/login`, `/password/change`,
`/invite/setup`, `/client/request-access`를 같은 token, responsive form layout,
message/helper panel 기준으로 정리합니다. 목표는 작은 화면에서 auth form이 먼저
보이고, theme/language, policy hint, result message가 부모 폭 안에서 안정적으로
줄바꿈되는 것입니다.

## 범위

- 공통 auth shell에 S08 responsive class와 route marker를 추가합니다.
- auth form은 `auth-form-grid` class와 route별 `data-testid`를 갖습니다.
- login 외 setup, invite setup, password change, access request form도
  `ProductUiFormRowHtml`을 사용합니다.
- password policy hint는 같은 helper panel class로 묶습니다.
- message/error 영역은 `auth-message` class로 묶습니다.
- 320/390/760/1180 viewport에서 text/control overflow가 없어야 합니다.
- S08 산출물 문서, backlog closure, stream verification, feature inventory를 갱신합니다.

## 비범위

- Auth/session/scope/role guard, password policy, invite token, access request API
  schema를 변경하지 않습니다.
- `/ops/users` user lifecycle, source/view assignment, client live viewer route는 S08
  범위가 아닙니다.
- 브라우저 UI 풀테스트 PASS, 30분 soak, 120분 longrun, published metadata 재검증은
  S08 구현 완료 근거가 아닙니다.

## 설계

S08은 `AppendAuthShellStart`와 각 auth page builder를 유지한 채 class와 helper 소비를
정리합니다. route별 form은 기존 action, method, input name, autocomplete, hidden
message id를 보존합니다. CSS는 `ProductDesignTokensCss()`의 spacing, radius, control
height, form-grid token을 사용하고 raw color를 추가하지 않습니다.

## 검증

S08 집중 검증:

```bash
./server.sh verify-v220-auth-setup-redesign
./server.sh verify-auth-bootstrap
./server.sh verify-auth-users
./server.sh verify-auth-routes
git diff --check
```

보조 검증:

```bash
./server.sh verify-v220-component-primitives
./server.sh verify-product-ui-token-drift
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-script-inventory
./server.sh verify-feature-inventory-coverage
```
