# Manual UI Result Template

이 템플릿은 프로젝트 verifier의 자율 Chrome/CDP 세션 또는 인앱 브라우저에서
실제로 눌러 확인한 UI 풀테스트 결과를 남길 때 사용합니다. 자동 smoke,
screenshot artifact, raw JSON 확인만으로 이 문서를 채우지 않습니다.
기준 정의는 [manual-ui-fulltest.md](./manual-ui-fulltest.md),
기능별 UI 필요 여부와 테스트 영역은
[project-feature-test-inventory.md](./project-feature-test-inventory.md), 실행 순서는
[manual-ui-checklist.md](./manual-ui-checklist.md)를 봅니다.

## 검수 메타데이터

- run id:
- 검수자:
- 날짜/시간:
- 브랜치/커밋:
- 서버 URL:
- auth mode:
- users/source/view/analysis fixture:
- 데이터 리셋 방법:
- 브라우저: 자율 Chrome/CDP 또는 인앱 브라우저
- 브라우저 선택: Codex 실행은 인앱 브라우저 evidence 우선, Codex 밖 사용자 실행은
  Chrome/CDP 허용. Codex 세션의 Chrome/CDP 예외는
  `MEDIA_SERVER_UI_BROWSER_MODE=chrome` + `MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1`
  지정과 사유를 기록.
- viewport:
- theme:
- evidence index:
- 문서 파악 범위:
- feature inventory revision:
- manual evidence schema: `media-server.manual-ui-evidence-input.v1`
- manual evidence required fields: `id`, `verdict`, `route`, `control`,
  `interaction`, `input` 또는 `inputNotApplicableReason`, `expected`, `actual`,
  `stateReflected`, `artifacts`, `logChecked`/`eventRecordChecked`/`logNotApplicableReason`
- manualSpotReviews:
- token usage source:
- token start:
- token end:
- token consumed:
- elapsed:

## 테스트 영역별 판정

스크립트 테스트와 UI 풀테스트는 서로 대체하지 않습니다. UI 풀테스트 판정은
`PASS`와 `FAIL`만 사용합니다. PASS 조건은 모든 개별 기능을 실제 브라우저에서
실행하고, 실제 수행 결과가 제품 상태에 반영됐는지 확인하고, 관련 로그 또는
이벤트 이력을 확인하는 것입니다. 하나라도 빠지면 해당 개별 기능은 `FAIL`입니다.
사용자가 의도적으로 제외한 실기기/외부 credential/scope 밖 항목은 UI 풀테스트
판정표에서 빼고 `제외 기록`에만 남깁니다.
기능 inventory의 행은 실행 evidence가 아니며, 아래 판정은 실제 실행/조작 결과가
있을 때만 채웁니다.

| 영역 | 실행 범위 | evidence | 기록 |
| --- | --- | --- | --- |
| 안정화 테스트 | 로드맵 스텝 종료 및 30분/120분/UI 테스트 전 선수 확인 | 명령, exit code, summary/report | 실행 여부, exit code, 실패 사유 |
| 30분 테스트 | `verify-predev --soak-minutes 30`, 장기간 테스트 기본값/버전 완료 soak | summary/report/log | 실행 여부, summary/report/log |
| 120분 테스트 | `verify-predev --soak-minutes 120`, `verify-va-runtime-console-longrun --duration-minutes 120`, 메모리 릭 감시 필요 시 | summary/report/log | 실행 여부, summary/report/log |
| UI 풀테스트 | 버전 완료 후 자율 Chrome/CDP 또는 인앱 브라우저 직접 조작, 반응형, 시각 품질 | 개별 기능별 직접 조작, 반영 상태, 로그/EventRecord, screenshot/artifact, 재검수 결과 | PASS/FAIL |

모든 영역은 평균 산출을 위해 `token start`, `token end`, `token consumed`, `elapsed`,
`source`를 함께 기록합니다. Codex goal usage 같은 자동 집계값이 있으면 그 값을
우선하고, 집계값이 없으면 미집계 사유를 적습니다.

## 긴 테스트 Preflight / 재시작 경계

30분, 120분, UI 풀테스트를 시작하기 전에 채웁니다. 아래 항목 누락은 긴 테스트
실패가 아니라 preflight 실패입니다.

| 항목 | 기대 상태 | 실제 상태 | 판정 | 후속 |
| --- | --- | --- | --- | --- |
| 기능 목록 freeze | `Current Pre-Test Update List`와 기능 ID 목록 확인 |  | PASS/FAIL |  |
| VLM UI 대상 | `/ops/vlm`, `/ops/events`, `/client/live`, `/client/dashboard`, `/client/events` 결과 행 존재 |  | PASS/FAIL |  |
| auth verifier env | auth test password env 5개 모두 `SET` |  | PASS/FAIL |  |
| throwaway fixture | users/source/view/analysis/event/snapshot/clip 경로 고정 |  | PASS/FAIL |  |
| VA seed 준비 | seed dry-run 또는 registry dir 준비, 아직 UI/event evidence로 쓰지 않음 |  | PASS/FAIL |  |
| output artifact | summary/report/log/screenshot/evidence JSON 경로 고정 |  | PASS/FAIL |  |
| UI blocker guard | native dialog/blocking dialog/browser permission 확인 계획 있음 |  | PASS/FAIL |  |
| 30분 시작 조건 | 안정화 gate PASS 또는 미실행 사유, VLM queue/runtime/media 변경 여부 기록 |  | PASS/FAIL |  |
| 120분 시작 조건 | 사용자 승인, RC/high-risk 사유, 30분 또는 high-risk short gate, memory/runtime 관찰 항목 기록 |  | PASS/FAIL |  |

- preflight 실패:
- 긴 테스트 시작 여부:
- 긴 테스트 미시작 항목:
- 제품 runtime/media/auth/session/registry 수정 여부:
- 전체 재시작 필요 여부:
- 부분 재검수 가능 범위:
- retained artifact로 재판정 가능한 항목:
- retained artifact가 부족해 미확인으로 남길 항목:

## 현재 보존 증적

아래 표에는 최종 판정에 사용하는 retained artifact만 적습니다. command log에
남은 과거 `--output-dir` 경로가 transient artifact라 현재 파일시스템에 없을 수
있으므로, 최종 PASS 근거로 쓰는 경로는 이 표에서 `exists`로 확인합니다.

| 증적 | 경로 | 확인 |
| --- | --- | --- |
| Auth/browser evidence |  | exists/FAIL |
| Ops click E2E summary |  | exists/FAIL |
| EventRecord history coverage |  | exists/FAIL |

## 스크립트 테스트 기록

- 관련 자동 검증:
  - `./server.sh build`:
  - `./server.sh verify-auth-bootstrap`:
  - `./server.sh verify-auth-users`:
  - `./server.sh verify-auth-routes`:
  - `./server.sh verify-ops-client-ui`:
  - `./server.sh verify-ops-client-ui --screenshots`:
  - `./server.sh verify-product-ui-no-native-dialogs`:
  - `./server.sh verify-ui-blocking-dialog-policy`:
  - `./server.sh verify-ops-click-e2e`:
  - `./server.sh verify-ops-click-e2e --auth-ui-flow --auth-users-file <path>`:
  - `./server.sh verify-rule-ui`:
  - `./server.sh verify-manual-ui-evidence`:
  - `./server.sh verify-manual-ui-evidence-runner --evidence <json> --report <report.md>`:
  - `git diff --check`:
- 안정화/장시간:
  - `./server.sh verify-predev --soak-minutes 30`:
  - `./server.sh verify-predev --soak-minutes 120`:
  - `./server.sh verify-va-runtime-console-longrun --duration-minutes 120`:

## UI 풀테스트 기록

- blocking dialog policy:
  - native alert/confirm/prompt 없음:
  - allowlisted in-page dialog만 사용:
  - 위험 action 2회 확인 첫 클릭 write 없음:

- 브라우저:
- 직접 조작 범위:
- 반응형/테마 범위:
- 시각 품질 확인:
- 제외 기록:

### Manual UI Evidence Runner Fields

`verify-manual-ui-evidence-runner` report는 기능 ID별로 아래 필드를 출력합니다.
누락된 UI 대상 기능 ID 또는 아래 PASS 필드가 빠진 행은 `FAIL`입니다.
`manualSpotReviews`는 사람이 확인한 보조 범위를 남기지만 개별 기능 ID의
route/control/input/state/log/artifact 누락을 대체하지 않습니다.

| feature ID | route | control | interaction | input/inputNotApplicableReason | expected | actual | stateReflected | log/event evidence | artifacts | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

### VLM UI Criteria

| 기능 ID/화면 | 직접 조작 | 기대 상태 | 실제 상태 | 판정 | 증적 |
| --- | --- | --- | --- | --- | --- |
| UI-022 `/ops/vlm` 설치/연결 준비 | local/cloud dry-run 후보 선택 | 자동 설치/호출/저장 없음 |  | PASS/FAIL |  |
| UI-023 `/ops/vlm` profile 저장 | 저장/활성화/fallback/disable/delete | profile state만 반영, runtime call 없음 |  | PASS/FAIL |  |
| UI-024 `/ops/vlm` privacy guard | cloud opt-in 전/후 guard 확인 | provider 호출/credential 저장 없음 |  | PASS/FAIL |  |
| UI-025 `/ops/vlm` PC capability/recommendation | capability/recommendation 요약 확인 | 추천/대안/비추천 사유가 Ops-only로 보이고 자동 설치/호출 없음 |  | PASS/FAIL |  |
| UI-026 `/ops/vlm` local 후보 선택 | local dry-run 후보 선택 | model download/runtime install/profile 저장 없이 선택 상태만 갱신 |  | PASS/FAIL |  |
| UI-027 `/ops/vlm` cloud 후보 선택 | opt-in 전 disabled, opt-in 후 dry-run 선택 | provider API 호출/credential 저장 없이 선택 상태만 갱신 |  | PASS/FAIL |  |
| UI-028 `/ops/vlm` profile 상태 control | active/fallback/disabled 전환 | 저장 목록과 상세 copy만 반영, runtime call 없음 |  | PASS/FAIL |  |
| UI-029 `/ops/vlm` profile 삭제 | 삭제 action | 목록에서 제거되고 EventRecord/sidecar/media path 영향 없음 |  | PASS/FAIL |  |
| UI-030 `/ops/vlm` evaluation/prompt profile | 평가 상태와 prompt profile 표시 | benchmark PASS로 과장하지 않고 저장 profile에 표시 |  | PASS/FAIL |  |
| UI-031 `/ops/vlm` raw details | details 열기/닫기 | raw details는 Ops 접힘 영역에만 있음 |  | PASS/FAIL |  |
| UI-032 `/ops/events` VLM review | review detail 열기 | summary/explanation/hints/questions가 Ops에만 표시 |  | PASS/FAIL |  |
| SAFE-031 client/viewer 비노출 | `/client/live`, `/client/dashboard`, `/client/events` 확인 | model/prompt/raw response/provider/internal review card 없음 |  | PASS/FAIL |  |

VLM queue/backpressure, memory/runtime cache, provider timeout, model install state의
30분/120분 기준은 [vlm-stabilization-longrun-ui-criteria.md](./vlm-stabilization-longrun-ui-criteria.md)에
따릅니다. 실행하지 않은 장시간 테스트는 이 UI 표에서 PASS로 쓰지 않고
`안정화/장시간` 또는 `제외 기록`에만 남깁니다.

## VA Seed / 최종 룰 상태

기준 fixture는 `test/fixtures/manual_ui_fulltest_va_seed_matrix.json`입니다.
이 표는 seed를 실제 서버에 적용하고 UI에서 확인했을 때만 채웁니다.
준비 단계에서 `./server.sh prepare-manual-ui-fulltest-seed --dry-run`을 실행한
경우에는 아래 준비 검증에만 기록합니다. dry-run은 HTTP 요청 0건이며 UI/event
evidence가 아닙니다.

- seed dry-run:
- seed plan/report:
- seed registry dir:
- seed apply:
- seed apply 명령:
- data storage:
  - auth users JSON:
  - source registry JSON:
  - published views JSON:
  - analysis registry JSON:
  - EventRecord JSON Lines:
  - snapshot dir:
  - clip dir:

| 개별 항목 | 기대 상태 | 실제 상태 | 판정 |
| --- | --- | --- | --- |
| account: admin | admin 로그인/ops 접근 가능 |  | PASS/FAIL |
| account: operator | operator 로그인/허용 ops 접근 가능 |  | PASS/FAIL |
| account: viewer | viewer 로그인/client 접근 가능, ops 비노출 |  | PASS/FAIL |
| account: integrator | integrator scope/API 정책 확인 |  | PASS/FAIL |
| source: file sample | file sample source 표시/선택 가능 |  | PASS/FAIL |
| source: VA sample | VA event sample source 표시/선택 가능 |  | PASS/FAIL |
| source: field source | field 별도 source가 sample과 구분됨 |  | PASS/FAIL |
| profile: tracker `none` + Re-ID `off` | 저장/반영 확인 |  | PASS/FAIL |
| profile: tracker `lite` + Re-ID `off` | 저장/반영 확인 |  | PASS/FAIL |
| profile: tracker `kalman-lite` + Re-ID `off` | 저장/반영 확인 |  | PASS/FAIL |
| profile: tracker `bytetrack` + Re-ID `off` | 저장/반영 확인 |  | PASS/FAIL |
| profile: tracker `lite` + Re-ID `assist` | 저장/반영 확인 |  | PASS/FAIL |
| profile: tracker `kalman-lite` + Re-ID `assist` | 저장/반영 확인 |  | PASS/FAIL |
| profile: tracker `bytetrack` + Re-ID `assist` | 저장/반영 확인 |  | PASS/FAIL |
| invalid policy: tracker `none` + Re-ID `assist` | 저장 거부 또는 `reid=off` 정규화 |  | PASS/FAIL |
| event template: presence | 최종 enabled template 존재 |  | PASS/FAIL |
| event template: enter | 최종 enabled template 존재 |  | PASS/FAIL |
| event template: exit | 최종 enabled template 존재 |  | PASS/FAIL |
| event template: line-crossing any | 최종 enabled template 존재 |  | PASS/FAIL |
| event template: line-crossing forward | 최종 enabled template 존재 |  | PASS/FAIL |
| event template: line-crossing reverse | 최종 enabled template 존재 |  | PASS/FAIL |
| event template: intrusion-dwell | 최종 enabled template 존재 |  | PASS/FAIL |
| event template: re-entry | 최종 enabled template 존재 |  | PASS/FAIL |
| event template: wrong-direction | 최종 enabled template 존재 |  | PASS/FAIL |
| event template: intrusion-after-line-crossing | 최종 enabled template 존재 |  | PASS/FAIL |
| event template: loitering | 최종 enabled template 존재 |  | PASS/FAIL |
| event template: zone-occupancy | 최종 enabled template 존재 |  | PASS/FAIL |
| scenario preset: default | 선택/적용 확인 |  | PASS/FAIL |
| scenario preset: road | 선택/적용 확인 |  | PASS/FAIL |
| scenario preset: retail | 선택/적용 확인 |  | PASS/FAIL |
| scenario preset: park | 선택/적용 확인 |  | PASS/FAIL |
| scenario preset: indoor | 선택/적용 확인 |  | PASS/FAIL |
| scenario preset: lobby | 선택/적용 확인 |  | PASS/FAIL |
| scenario preset: platform | 선택/적용 확인 |  | PASS/FAIL |
| scenario preset: entrance | 선택/적용 확인 |  | PASS/FAIL |
| scenario preset: doorway | 선택/적용 확인 |  | PASS/FAIL |
| scenario preset: parking | 선택/적용 확인 |  | PASS/FAIL |
| scenario preset: elevator | 선택/적용 확인 |  | PASS/FAIL |
| scenario preset: custom | 선택/적용 확인 |  | PASS/FAIL |
| vaRule: presence | 최종 enabled vaRule 존재 |  | PASS/FAIL |
| vaRule: enter | 최종 enabled vaRule 존재 |  | PASS/FAIL |
| vaRule: exit | 최종 enabled vaRule 존재 |  | PASS/FAIL |
| vaRule: line-crossing any | 최종 enabled vaRule 존재 |  | PASS/FAIL |
| vaRule: line-crossing forward | 최종 enabled vaRule 존재 |  | PASS/FAIL |
| vaRule: line-crossing reverse | 최종 enabled vaRule 존재 |  | PASS/FAIL |
| vaRule: intrusion-dwell | 최종 enabled vaRule 존재 |  | PASS/FAIL |
| vaRule: re-entry | 최종 enabled vaRule 존재 |  | PASS/FAIL |
| vaRule: wrong-direction | 최종 enabled vaRule 존재 |  | PASS/FAIL |
| vaRule: intrusion-after-line-crossing | 최종 enabled vaRule 존재 |  | PASS/FAIL |
| vaRule: loitering | 최종 enabled vaRule 존재 |  | PASS/FAIL |
| vaRule: zone-occupancy | 최종 enabled vaRule 존재 |  | PASS/FAIL |

## VA Event Occurrence Coverage

`/ops/rules` 저장 성공은 이벤트 발생 evidence가 아닙니다. UI 풀테스트 후에는
admin/operator 권한으로 `/ops/events`를 직접 열고, 최종 enabled event
template/vaRule별 EventRecord 발생 이력을 대조합니다. 파일/API 대조는 보조
evidence이며, UI에서 열지 않은 경우 `FAIL`입니다.
`line-crossing:any`, `line-crossing:forward`, `line-crossing:reverse`처럼 event key를
개별 행으로 기록하고 묶음 PASS로 대체하지 않습니다.

- `/ops/events` screenshot:
- visible rows:
- pagination/filter/archive 상태:
- EventRecord active JSON Lines:
- `includeArchives=1` 조회 여부:
- registry 대조 artifact:

| 개별 event 기능 | template/rule id | vaRule id | UI rows | JSON Lines/API records | expected pass output | 판정 |
| --- | --- | --- | --- | --- | --- | --- |
| `presence` |  |  |  |  | 최소 1개 EventRecord, status/stream/track/evidence 표시 | PASS/FAIL |
| `enter` |  |  |  |  | 최소 1개 EventRecord, matching `metadata.ruleId` 또는 zone 표시 | PASS/FAIL |
| `exit` |  |  |  |  | 최소 1개 EventRecord, matching `metadata.ruleId` 또는 zone 표시 | PASS/FAIL |
| `line-crossing:any` |  |  |  |  | 최소 1개 EventRecord, line id와 any direction rule 대조 | PASS/FAIL |
| `line-crossing:forward` |  |  |  |  | 최소 1개 EventRecord, line id와 forward rule 대조 | PASS/FAIL |
| `line-crossing:reverse` |  |  |  |  | 최소 1개 EventRecord, line id와 reverse rule 대조 | PASS/FAIL |
| `intrusion-dwell` |  |  |  |  | 최소 1개 EventRecord, scenarioName/scenarioPhase 또는 scenario type 표시 | PASS/FAIL |
| `re-entry` |  |  |  |  | 최소 1개 EventRecord, scenarioName/scenarioPhase 또는 scenario type 표시 | PASS/FAIL |
| `wrong-direction` |  |  |  |  | 최소 1개 EventRecord, scenarioName/scenarioPhase 또는 scenario type 표시 | PASS/FAIL |
| `intrusion-after-line-crossing` |  |  |  |  | 최소 1개 EventRecord, scenarioName/scenarioPhase 또는 scenario type 표시 | PASS/FAIL |
| `loitering` |  |  |  |  | 최소 1개 EventRecord, scenarioName/scenarioPhase 또는 scenario type 표시 | PASS/FAIL |
| `zone-occupancy` |  |  |  |  | 최소 1개 EventRecord, scenarioName/scenarioPhase 또는 scenario type 표시 | PASS/FAIL |

- missing event types:
- missing template/rule ids:
- missing vaRule ids:
- sample/video 한계:
- 최종 판정:

## 확인됨

실제로 열고 클릭한 화면만 적습니다.

| 화면 | 계정/권한 | 직접 조작 | 기대 결과 | 실제 결과 | screenshot/artifact | 판정 |
| --- | --- | --- | --- | --- | --- | --- |
| `/setup` | unauth |  |  |  |  | PASS/FAIL |
| `/login` | unauth |  |  |  |  | PASS/FAIL |
| `/password/change` | must-change/reset |  |  |  |  | PASS/FAIL |
| `/invite/setup` | invite |  |  |  |  | PASS/FAIL |
| `/ops/home` | admin/operator |  |  |  |  | PASS/FAIL |
| `/ops/dashboard` | admin/operator |  |  |  |  | PASS/FAIL |
| `/ops/sources` | admin/operator |  |  |  |  | PASS/FAIL |
| `/ops/rules` | admin/operator |  |  |  |  | PASS/FAIL |
| `/ops/users` | admin |  |  |  |  | PASS/FAIL |
| `/ops/events` | admin/operator |  |  |  |  | PASS/FAIL |
| `/ops/vlm` | admin/operator |  |  |  |  | PASS/FAIL |
| `/client/live` | viewer/admin preview |  |  |  |  | PASS/FAIL |
| `/client/dashboard` | viewer/admin preview |  |  |  |  | PASS/FAIL |
| `/client/events` | viewer/admin preview |  |  |  |  | PASS/FAIL |
| `/client/request-access` | public |  |  |  |  | PASS/FAIL |

## v2.1.0 Release Evidence Index

자동 smoke나 raw JSON 확인만으로 채우지 않습니다. 실제로 열고 클릭한 화면만
`PASS` 후보가 될 수 있고, 열지 않은 개별 기능은 `FAIL`입니다.

| route | 계정/권한 | 직접 조작 | screenshot/artifact | 연결 자동 검증 | 판정 | 실패 사유 |
| --- | --- | --- | --- | --- | --- | --- |
| `/setup` | unauth |  |  | `verify-auth-bootstrap` | PASS/FAIL |  |
| `/login` | unauth |  |  | `verify-auth-bootstrap` | PASS/FAIL |  |
| `/ops/home` | admin/operator | Home 화면 진입/요약 카드 확인 |  | `verify-ops-client-ui --screenshots` | PASS/FAIL |  |
| `/ops/dashboard` | admin/operator | Dashboard 화면 진입/상태 카드 확인 |  | `verify-ops-client-ui --screenshots` | PASS/FAIL |  |
| `/ops/sources` | admin/operator | Channels 화면 진입/source table 확인 |  | `verify-ops-client-ui --screenshots` | PASS/FAIL |  |
| `/ops/rules` | admin/operator | Rules 화면 진입/validation 확인 |  | `verify-rule-ui` | PASS/FAIL |  |
| `/ops/users` | admin | Users 화면 진입/user table 확인 |  | `verify-ops-client-ui --screenshots` | PASS/FAIL |  |
| `/ops/events` | admin/operator | Events 화면 진입/EventRecord review 확인 |  | `verify-ops-event-records-scope` | PASS/FAIL |  |
| `/ops/vlm` | admin/operator | VLM install/profile/privacy 화면 진입 및 controls 확인 |  | `verify-vlm-install-connection-ui`, `verify-vlm-profile-storage`, `verify-vlm-privacy-transfer-guard` | PASS/FAIL |  |
| `/client/live` | viewer/admin preview | Live 화면 진입/source 선택/drag-drop 확인 |  | `verify-ops-client-ui --screenshots` | PASS/FAIL |  |
| `/client/dashboard` | viewer/admin preview | Dashboard 화면 진입/view 상태 확인 |  | `verify-client-dashboard-polish` | PASS/FAIL |  |
| `/client/events` | viewer/admin preview | viewer scope events와 VLM internal card 비노출 확인 |  | `verify-ops-client-ui --screenshots` | PASS/FAIL |  |

- 직접 열어보지 않은 화면:
- 실패 후 재검수한 화면:
- raw JSON/API-only로만 확인한 항목:
- client/viewer 비노출 재확인:

## 기능별 직접 조작 기록

기능 ID는 [project-feature-test-inventory.md](./project-feature-test-inventory.md)의 ID를
사용합니다. route를 열었더라도 해당 기능 ID의 control/action을 직접 조작하지
않았으면 `FAIL`로 남깁니다. 카테고리 묶음 판정은 금지합니다. 아래 행은 예시이며,
실제 결과 문서에서는 inventory의 대상 기능 ID를 빠짐없이 한 행씩 추가합니다.
runner 입력 JSON은 `media-server.manual-ui-evidence-input.v1` schema를 사용합니다.
`./server.sh verify-manual-ui-evidence-runner`는 누락된 UI 대상 기능 ID는 `FAIL`로
기록하고, 제외 항목은 판정표 밖 `Exclusions`에만 둡니다.

| 기능 ID | 영역 | 클릭/타이핑으로 확인한 항목 | 기대 결과 | 실제 결과 | 판정 | 비고 |
| --- | --- | --- | --- | --- | --- | --- |
| UI-001 | route |  |  |  |  |  |
| AUTH-018 | users |  |  |  |  |  |
| SRC-008 | sources |  |  |  |  |  |
| RULE-018 | rules |  |  |  |  |  |
| CLIENT-002 | client live |  |  |  |  |  |

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

Auth verifier 선수 조건:

- `MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD`: SET / MISSING
- `MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD`: SET / MISSING
- `MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD`: SET / MISSING
- `MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE`: SET / MISSING
- `MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO`: SET / MISSING

| 화면 | fixture/users file | 직접 입력/제출 | 기대 결과 | artifact/screenshot | 대체 검증 | 판정 |
| --- | --- | --- | --- | --- | --- | --- |
| `/setup` | throwaway | weak password 제출 | 400/rejection copy |  | `./server.sh verify-auth-bootstrap` | PASS/FAIL |
| `/setup` | throwaway | strong admin password 제출 | `/login` redirect |  | `./server.sh verify-auth-bootstrap` | PASS/FAIL |
| `/login` | throwaway | admin 로그인 | `/ops/home` redirect |  | `./server.sh verify-auth-bootstrap` | PASS/FAIL |
| `/password/change` | throwaway | reset/must-change 계정 변경 | history reuse 거부 또는 성공 redirect |  | `./server.sh verify-auth-users` | PASS/FAIL |
| `/invite/setup` | throwaway | invite password setup | viewer login 가능, ops forbidden |  | `./server.sh verify-auth-users` | PASS/FAIL |

- Password change success/restoration detail:
  - 시작 pw: 사용자 지정 테스트 pw / 기타
  - 임시 pw 변경 성공: PASS/FAIL
  - 임시 pw 로그인: PASS/FAIL
  - 즉시 원래 pw 재사용 거부: PASS/FAIL
  - `MEDIA_SERVER_AUTH_PASSWORD_HISTORY_COUNT`:
  - history eviction용 중간 변경 횟수:
  - 최종 사용자 지정 테스트 pw 복원 로그인:
  - 이전 임시 pw 로그인 거부:
  - failedLoginCount/lockedUntil 최종 상태:

- Chrome/Computer Use/Browser Use 실패 지점:
- 직접 확인한 마지막 화면/필드:
- 자동 smoke로 대체 확인한 항목:
- 수동 auth 입력 미완료 항목:

## Browser/Computer Use Fallback

raw JSON/API-only 확인은 수동 UI 클릭 evidence로 쓰지 않습니다.

| 항목 | 1차 Browser Use | 2차 Chrome | 3차 Computer Use | 마지막 직접 확인 상태 | 대체 smoke | 판정 |
| --- | --- | --- | --- | --- | --- | --- |
| auth 입력 |  |  |  |  |  | PASS/FAIL |
| copy fallback |  |  |  |  |  | PASS/FAIL |
| route navigation |  |  |  |  |  | PASS/FAIL |

- Browser/Chrome/Computer Use 실패 지점:
- 환경/sandbox/tool 제한:
- 제품 회귀 후보로 본 근거:
- 자동 smoke로만 대체한 항목:

## 비노출 확인

client/viewer 화면에서 보이지 않아야 하는 항목입니다.
admin이 client 화면을 확인한 경우에는 `Client Preview as admin` 상태를 함께 기록합니다.

- source URL:
- Developer URL:
- raw JSON:
- debug counter:
- BBox diagnostics:
- rule/profile editor:
- model/source/auth material:
- Ops/Lab primary navigation:

## 반응형/테마/시각 품질 확인

| viewport | theme | 확인 화면 | overflow/겹침 | 시각 품질 메모 | 판정 |
| --- | --- | --- | --- | --- | --- |
| 320px | light |  |  |  | PASS/FAIL |
| 320px | dark |  |  |  | PASS/FAIL |
| 390px | light |  |  |  | PASS/FAIL |
| 390px | dark |  |  |  | PASS/FAIL |
| 760px | light |  |  |  | PASS/FAIL |
| 760px | dark |  |  |  | PASS/FAIL |
| 1180px | light |  |  |  | PASS/FAIL |
| 1180px | dark |  |  |  | PASS/FAIL |

## 실패

| 화면 | 재현 조작 | 기대 결과 | 실제 결과 | 로그/스크린샷 | 영향 범위 | 재검수 |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |

## 제외 기록

사용자가 의도적으로 UI 풀테스트 기준에서 제외하라고 한 항목만 적습니다.
여기에 있는 항목은 PASS/FAIL 판정표에 넣지 않습니다.

| 항목 | 제외 이유 | 후속 확인 조건 |
| --- | --- | --- |
|  |  |  |

## 문서 재작성/신규 작성/비교 병합

- 재작성한 UI 풀테스트 관련 문서:
- 새로 작성한 UI 풀테스트 문서:
- 비교 결과:
- 병합 결과:
- 남은 중복:

## 최종 판정

- 최종 결론: PASS 또는 FAIL
- PASS 조건: 개별 기능 실패 행 0개, 제외 기록은 판정표 밖에만 존재
- 제품 회귀 여부:
- 환경/sandbox 한계:
- 수정 필요 이슈:
- 커밋:
- 푸시 가능:
- 푸시 수행 여부: 수행하지 않음

결과 문서를 저장한 뒤 `./server.sh verify-manual-ui-evidence`로 UI 풀테스트
PASS/FAIL 이원화, 개별 기능 결과, 제외 기록이 누락되지 않았는지 점검합니다.
