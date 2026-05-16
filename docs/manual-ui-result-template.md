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
- 관련 자동 검증:
  - `./server.sh verify-ops-client-ui --screenshots`:
  - `./server.sh verify-rule-ui`:
  - `./server.sh verify-auth-bootstrap`:
  - `./server.sh verify-auth-users`:
  - `./server.sh verify-auth-routes`:

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

## 접근 요청 검수

- pending request 생성:
- `/ops/users` pending row 확인:
- 승인 채널 ID 입력:
- approve 후 invite 출력:
- invite setup 전 login 결과:
- invite setup 후 `/client/live` 결과:
- invite setup 후 `/ops/home` 결과:
- 거절 flow 실행 여부:

## 비노출 확인

client/viewer 화면에서 보이지 않아야 하는 항목입니다.

- source URL:
- Developer URL:
- raw JSON:
- debug counter:
- BBox diagnostics:
- rule/profile editor:
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
