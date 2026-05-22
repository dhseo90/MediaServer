# Manual UI Result Template

이 템플릿은 사람이 브라우저에서 직접 눌러 확인한 UI 검수 결과를 남길 때
사용합니다. 자동 smoke, screenshot artifact, raw JSON 확인만으로 이 문서를
채우지 않습니다.

## 검수 메타데이터

- run id:
- 검수자:
- 날짜/시간:
- 브랜치/커밋:
- 서버 URL:
- auth mode:
- users/source/view fixture:
- 브라우저:
- viewport:
- evidence index:
- 관련 자동 검증:
  - `./server.sh verify-ops-client-ui --screenshots`:
  - `./server.sh verify-rule-ui`:
  - `./server.sh verify-auth-bootstrap`:
  - `./server.sh verify-auth-users`:
  - `./server.sh verify-auth-routes`:
  - `./server.sh verify-v160-manual-ui-release-checklist-closure`:

## 확인됨

실제로 열고 클릭한 화면만 적습니다.

| 화면 | 계정/권한 | 직접 조작 | 기대 결과 | 실제 결과 | 판정 |
| --- | --- | --- | --- | --- | --- |
| `/setup` | unauth |  |  |  | PASS/FAIL |
| `/login` | unauth |  |  |  | PASS/FAIL |
| `/ops/home` | admin |  |  |  | PASS/FAIL |
| `/ops/dashboard` | admin |  |  |  | PASS/FAIL |
| `/ops/sources` | admin |  |  |  | PASS/FAIL |
| `/ops/rules` | admin |  |  |  | PASS/FAIL |
| `/ops/users` | admin |  |  |  | PASS/FAIL |
| `/ops/events` | admin |  |  |  | PASS/FAIL |
| `/client/live` | viewer/admin preview |  |  |  | PASS/FAIL |
| `/client/dashboard` | viewer/admin preview |  |  |  | PASS/FAIL |
| `/client/request-access` | public |  |  |  | PASS/FAIL |

## v1.8.0 Release Evidence Index

자동 smoke나 raw JSON 확인만으로 채우지 않습니다. 실제로 열고 클릭한 화면만
`확인됨`으로 기록하고, 열지 않은 화면은 `미확인` 또는 `건너뜀`으로 남깁니다.

| route | 계정/권한 | 직접 조작 | screenshot/artifact | 연결 자동 검증 | 판정 | 미확인/건너뜀 사유 |
| --- | --- | --- | --- | --- | --- | --- |
| `/setup` | unauth |  |  | `verify-auth-bootstrap` | PASS/FAIL/미확인/건너뜀 |  |
| `/login` | unauth |  |  | `verify-auth-bootstrap` | PASS/FAIL/미확인/건너뜀 |  |
| `/ops` | admin/operator | Home, Dashboard, Channels, Rules, Users, Client Preview nav 클릭 |  | `verify-ops-client-ui --screenshots` | PASS/FAIL/미확인/건너뜀 |  |
| `/client` | viewer/admin preview | Live/Dashboard nav 클릭 |  | `verify-ops-client-ui --screenshots` | PASS/FAIL/미확인/건너뜀 |  |
| `/ops/rules` | admin/operator | validation, preview, save flow 확인 |  | `verify-rule-ui` | PASS/FAIL/미확인/건너뜀 |  |
| `/client/live` | viewer/admin preview | source 선택/drag-drop, tile action, dock, overlay 확인 |  | `verify-ops-client-ui --screenshots` | PASS/FAIL/미확인/건너뜀 |  |

- 직접 열어보지 않은 화면:
- 실패 후 재검수한 화면:
- raw JSON/API-only로만 확인한 항목:
- client/viewer 비노출 재확인:

## 접근 요청 검수

- pending request 생성:
- `/ops/users` pending row 확인:
- 승인 채널 ID 입력:
- approve 후 invite 출력:
- invite setup 전 login 결과:
- invite setup 후 `/client/live` 결과:
- invite setup 후 `/ops/home` 결과:
- 거절 flow 실행 여부:

## Chrome Auth 입력 Evidence

비밀번호 원문, invite token 원문, session cookie, 브라우저 generated password
suggestion은 기록하지 않습니다.

| 화면 | fixture/users file | 직접 입력/제출 | 기대 결과 | artifact/screenshot | 대체 검증 | 판정 |
| --- | --- | --- | --- | --- | --- | --- |
| `/setup` | throwaway | weak password 제출 | 400/rejection copy |  | `./server.sh verify-auth-bootstrap` | PASS/FAIL/BLOCKED |
| `/setup` | throwaway | strong admin password 제출 | `/login` redirect |  | `./server.sh verify-auth-bootstrap` | PASS/FAIL/BLOCKED |
| `/login` | throwaway | admin 로그인 | `/ops/home` redirect |  | `./server.sh verify-auth-bootstrap` | PASS/FAIL/BLOCKED |
| `/password/change` | throwaway | reset/must-change 계정 변경 | history reuse 거부 또는 성공 redirect |  | `./server.sh verify-auth-users` | PASS/FAIL/BLOCKED |
| `/invite/setup` | throwaway | invite password setup | viewer login 가능, ops forbidden |  | `./server.sh verify-auth-users` | PASS/FAIL/BLOCKED |

- Chrome/Computer Use/Browser Use 실패 지점:
- 직접 확인한 마지막 화면/필드:
- 자동 smoke로 대체 확인한 항목:
- 수동 auth 입력 미완료 항목:

## Browser/Computer Use Fallback

raw JSON/API-only 확인은 수동 UI 클릭 evidence로 쓰지 않습니다.

| 항목 | 1차 Browser Use | 2차 Chrome | 3차 Computer Use | 마지막 직접 확인 상태 | 대체 smoke | 판정 |
| --- | --- | --- | --- | --- | --- | --- |
| auth 입력 |  |  |  |  |  | PASS/FAIL/BLOCKED/미확인 |
| copy fallback |  |  |  |  |  | PASS/FAIL/BLOCKED/미확인 |
| route navigation |  |  |  |  |  | PASS/FAIL/BLOCKED/미확인 |

- Browser/Chrome/Computer Use 실패 지점:
- 환경/sandbox/tool 제한:
- 제품 회귀 후보로 본 근거:
- 자동 smoke로만 대체한 항목:

## 비노출 확인

client/viewer 화면에서 보이지 않아야 하는 항목입니다.

- source URL:
- Developer URL:
- raw JSON:
- debug counter:
- BBox diagnostics:
- rule/profile editor:
- model/source/auth material:
- Ops/Lab primary navigation:

## 반응형/테마 확인

| viewport | theme | 확인 화면 | overflow/겹침 | 판정 |
| --- | --- | --- | --- | --- |
| 320px | light |  |  | PASS/FAIL |
| 390px | dark |  |  | PASS/FAIL |
| 760px | light |  |  | PASS/FAIL |
| 1180px | dark |  |  | PASS/FAIL |

## 실패

| 화면 | 재현 조작 | 기대 결과 | 실제 결과 | 로그/스크린샷 | 영향 범위 |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

## 미확인

열지 않았거나 직접 클릭하지 않은 항목만 적습니다.

- 장시간 테스트:
- `verify-predev`:
- 실장비/외부 네트워크:
- screenshot artifact/link 미확인:
- GitHub Actions/link 미확인:
- destructive action:
- 기타:

## 건너뜀

| 항목 | 이유 | 후속 확인 조건 |
| --- | --- | --- |
|  |  |  |

## 최종 판정

- 전체 판정: PASS/FAIL/BLOCKED
- 제품 회귀 여부:
- 환경/sandbox 한계:
- 수정 필요 이슈:
- 커밋:
- 푸시 가능:
- 푸시 수행 여부: 수행하지 않음

결과 문서를 저장한 뒤 `./server.sh verify-manual-ui-evidence`로 수동 확인,
미확인, 건너뜀 구분이 누락되지 않았는지 점검합니다.
