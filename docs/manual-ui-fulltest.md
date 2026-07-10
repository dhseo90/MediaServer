# Manual UI Full Test Standard

이 문서는 MediaServer에서 "UI 풀테스트"라고 요청받았을 때 반드시 포함해야 하는
기준입니다. 기능별 UI 필요 여부와 테스트 영역 분류는
[project-feature-test-inventory.md](./project-feature-test-inventory.md)를 기준으로
삼고, 실행 순서는 [manual-ui-checklist.md](./manual-ui-checklist.md), 결과 기록은
[manual-ui-result-template.md](./manual-ui-result-template.md)를 사용합니다.
exact-ID 실행 목록은 `test/fixtures/project_feature_implementation_evidence.json`의
UI 테스트 영역 424개 `manualUiCaseId`, `uiEvidence.screenRoute`, product UI anchor를
사용하며 inventory ID와 manifest ID가 다르면 UI 풀테스트를 시작하지 않습니다.
최신 공개 release 기준은 `v3.8.0 Operator-Gated Action Pilot & Outcome Loop`이고
현재 소스/UI 문서 기준은
`v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation`입니다.
이번 v3.9.0 Required Closeout은 `V390-REQ-001`, `V390-REQ-002`,
`V390-REQ-003` 기준으로 manual UI 기준서 current화, 장시간/UI 테스트 시작 조건
current화, `v3.5-v3.8 UI coverage bridge`를 닫습니다. 아래 v2.x/v3.x release별
기준 섹션은 historical coverage bridge이며 현재 gate로 단독 사용하지 않습니다.
현재 제품 UI 기준으로 지원 가능한 모든 exact 기능 case를 실제 브라우저 조작으로
확인하지 않은 경우에는 완료로 쓰지 않습니다. 조작 evidence는 `AGENTS.md` 7.6.3의
Policy v4에 따라 direct-browser, qualified-native-automation, hybrid 중 하나로 기록합니다.

## 1. 정의

UI 풀테스트는 API smoke가 아니라 제품 웹 UI를 실제 브라우저에서 열고,
클릭과 타이핑으로 문서에 설명된 기능을 하나하나 확인하는 검수입니다. Codex
세션의 인앱 브라우저 직접 조작은 `direct-browser` evidence입니다. Playwright,
Selenium, Chrome/CDP 같은 실제 브라우저 자동화도 도구 이름이 아니라
`AGENTS.md` 7.6.3 Policy v4의 exact case, completion oracle, role/viewport/theme,
artifact integrity, redaction, visual/replay/cleanup 계약을 모두 만족하면
`qualified-native-automation` evidence로 해당 case를 대체할 수 있습니다.
사용자에게 pane 열기, 버튼 클릭, 팝업 확인을 요청해야만 진행되는 run은 clean
automation PASS가 아니며 direct evidence와 섞지 않습니다. API 응답, raw JSON,
screenshot 생성, fixture/wrapper/replay/coverage 또는 정적 스크립트 통과만으로는
UI 풀테스트를 완료했다고 기록하지 않습니다.

브라우저 선택 정책:

- Codex가 테스트를 실행하는 세션에서는 인앱 브라우저 direct evidence가 기본입니다.
- 외부 브라우저 자동화는 engine/fallback/version/provenance를 숨기지 않고 Policy v4
  qualifier를 통과해야 UI case 대체 evidence가 됩니다. fallback이라는 이유만으로
  자동 PASS/FAIL하지 않지만 증적 품질 조건 하나라도 빠지면 `unqualified`입니다.
- 안정화/30분/120분 스크립트 안의 부분 UI smoke는 Policy v4 exact fulltest 실행이
  아니면 UI 풀테스트 PASS로 쓰지 않습니다.

## 2. 테스트 영역 역할 분리

UI 풀테스트는 `스크립트 테스트`와 별도 영역입니다. 스크립트 테스트의 기준은
[stream-verification.md](./stream-verification.md)에 둡니다.

| 영역 | UI 풀테스트에서의 취급 |
| --- | --- |
| 안정화 테스트 | 30분/120분/UI 테스트의 선수 테스트입니다. 로드맵 각 스텝 종료 시 먼저 수행합니다. 실패하면 UI 풀테스트로 넘어가지 않습니다. |
| 30분 테스트 | 장기간 테스트 지시 시 기본으로 수행하되, 버전별 로드맵 개발 완료 뒤에도 명시 요청/close-out 승인 없으면 미실행으로 기록합니다. UI 클릭/타이핑 evidence를 대체하지 않습니다. |
| 120분 테스트 | 메모리 릭, 장시간 누수, runtime drift 감시용입니다. 무조건 실행하지 않고 필요하면 사용자에게 먼저 알립니다. UI 풀테스트 PASS를 대체하지 않습니다. |
| UI 풀테스트 | `direct-browser`, `qualified-native-automation`, `hybrid` 중 실제 evidence mode를 기록합니다. exact case별 실제 브라우저 조작, role, 반응형, 시각 품질 evidence이며 30분/120분 안정화 PASS를 대체하지 않습니다. |

따라서 결과 문서에는 `스크립트 테스트`와 `UI 풀테스트` 판정을 따로 적습니다.
UI 풀테스트 판정값은 `PASS`와 `FAIL`만 사용합니다. 모든 기능을 실제 브라우저에서
실행하고, 실제 수행 결과가 제품 상태에 반영됐는지 completion oracle으로 확인하고,
관련 로그 또는 이벤트 이력을 확인했을 때만 `PASS`입니다. 자동화 case는 추가로
Policy v4 qualifier를 통과해야 합니다. 그 외에는 전부 `FAIL`입니다.
실기기/외부 credential처럼 사용자가 의도적으로 빼라고 한 항목은 UI 풀테스트
대상에서 제외하고, 판정표 밖의 `제외 기록`에만 남깁니다.

포함 범위:

- 프로젝트 문서 파악
- 데이터 리셋과 throwaway fixture 준비
- Auth, Ops, Client, 접근 요청, 제품 UI/현재 API 경계 실제 브라우저 확인
- 문서에 나온 웹페이지 UI 기능의 클릭/타이핑 검수
- 320px, 390px, 760px, 1180px 반응형 확인
- light/dark theme 확인
- UI 시각 품질 확인
- 발견 이슈 수정 후 같은 화면 재검수
- evidence mode와 정적/보조 자동 검증 결과의 분리 기록

## 2.1 긴 테스트 전 fail-fast 기준

30분, 120분, UI 풀테스트는 시작 전에 실패 가능성이 높은 준비 문제를 먼저 끊어냅니다.
아래 항목이 정리되지 않으면 긴 테스트를 시작하지 않습니다.

- `docs/v390-feature-completion-inventory.md`의 `V390-REQ-001`,
  `V390-REQ-002`, `V390-REQ-003` 상태와
  [project-feature-test-inventory.md](./project-feature-test-inventory.md)의 현재
  route/control/action coverage를 먼저 확인합니다. 이 확인은 실행 PASS가 아니라
  빠뜨릴 대상을 정하는 시작 조건입니다.
- `docs/manual-ui-checklist.md`와 `docs/manual-ui-result-template.md`가
  `v3.9.0 release UI gate`, `## v3.9.0 Release Evidence Index`,
  `v3.5-v3.8 UI coverage bridge`를 포함하지 않으면 30분, 120분, UI 풀테스트를
  시작하지 않습니다.
- `/ops/vlm`, `/ops/events`, `/client/live`, `/client/dashboard`, `/client/events`의
  VLM 관련 UI/비노출 항목과 v3.5~v3.8에서 추가된 Ops/Client route/control/action
  항목이 result template 또는 project feature inventory delegation으로 연결돼 있어야 합니다.
- auth 테스트 비밀번호 환경변수, throwaway users/source/view/analysis/event/snapshot/clip
  경로, seed dry-run/registry dir, output artifact 경로를 시작 전에 기록합니다.
- `verify-product-ui-no-native-dialogs`와 `verify-ui-blocking-dialog-policy`를 UI 전
  선수 gate로 계획합니다. native dialog가 남아 있으면 UI 풀테스트를 시작하지 않습니다.
- 30분, UI 풀테스트, 120분은 사용자 지시 또는 명시 승인 범위에서만 실행합니다.
  120분은 AGENTS 7.6.2 직접 조건, 사용자 승인, RC/high-risk 사유,
  memory/runtime 관찰 항목이 없으면 시작하지 않습니다.

실패 후 재검수 범위:

- 시작 조건, fixture, auth env, output dir 실패는 긴 테스트 실패로 기록하지 않고,
  해당 안정화 조건 또는 문서만 고친 뒤 다시 확인합니다.
- 제품 runtime, media path, auth/session, registry seed를 바꾼 경우에는 영향을 받은
  phase부터 재검수합니다. 최종 UI PASS는 모든 UI 대상 기능 ID의 evidence가 다시
  충족될 때만 가능합니다.
- 120분 실행 결과 summary/report/log가 이미 남아 있고 제품 runtime을 고치지 않았다면,
  리포트 경로/문서 누락만으로 120분을 처음부터 다시 실행하지 않습니다. retained
  artifact가 요구 범위를 직접 증명하지 못하면 PASS가 아니라 미확인으로 남깁니다.

## 3. 문서 파악

테스트 전에는 프로젝트 내 문서를 먼저 읽고 UI 기능, release boundary, 비노출 정책,
검증 명령을 파악합니다. 최소 기준은 아래 문서입니다.

- [README.md](../README.md)
- [docs/README.md](./README.md)
- [ui-guide.md](./ui-guide.md)
- [development-guide.md](./development-guide.md)
- [stream-verification.md](./stream-verification.md)
- [config-reference.md](./config-reference.md)
- [project-feature-test-inventory.md](./project-feature-test-inventory.md)
- [manual-ui-checklist.md](./manual-ui-checklist.md)
- [manual-ui-result-template.md](./manual-ui-result-template.md)

문서에 기능이 설명되어 있지만 UI에서 열지 못한 경우 해당 기능은 `FAIL`입니다.
단, 사용자가 실기기 없음 등으로 명시 제외한 항목은 테스트 기준에서 제외하고
별도 기록에만 남깁니다.

기능별 테스트 분류는 [project-feature-test-inventory.md](./project-feature-test-inventory.md)를
기준으로 합니다. 이 inventory는 테스트 실행 결과가 아니라 기능별 `UI 필요 여부`,
`테스트 필요 여부`, `테스트 영역`, `PASS 판정 기준`을 고정하는 문서입니다. 따라서
inventory에 행이 있다는 이유만으로 해당 기능의 UI 풀테스트나 안정화 테스트가
완료됐다고 쓰지 않습니다.

### v3.9.0 Required Closeout coverage bridge

이 절은 `V390-REQ-001`, `V390-REQ-002`, `V390-REQ-003`의 manual UI 문서 기준입니다.
`v3.5-v3.8 UI coverage bridge`는 실행 evidence가 아니라, current v3.9 UI 풀테스트를
시작하기 전에 이전 release에서 추가된 route/control/action을 빠뜨리지 않도록
project feature inventory에 위임하는 기준입니다.

| Release range | Coverage delegation | Current v3.9 시작 조건 |
| --- | --- | --- |
| v3.5 Live Operations Control Plane | `docs/project-feature-test-inventory.md`의 `UI-080`~`UI-087`, `CLIENT-031`~`CLIENT-032`, v3.5 `verify-v350-*` rows | `/ops` live operations graph/command/staged/drill/export/field/VLM explanation controls와 `/client/live`, `/client/dashboard`, `/client/events` client-safe notice/impact rows가 결과 문서 대상에 포함돼야 함 |
| v3.6 Operations Simulation Workspace | `UI-088`~`UI-094`, v3.6 `verify-v360-*` rows | `/ops` simulation input/run/diff/safe-apply/export/field/default-off explanation controls가 결과 문서 대상에 포함돼야 함 |
| v3.7 Site-Aware Operations and Safe Runbook Control Plane | `UI-095`~`UI-101`, `CLIENT-037`~`CLIENT-039`, v3.7 `verify-v370-*` rows | site/source group, runbook, approval, site-aware notice, rule/VA what-if, field evidence, limited execution pilot, outcome/export controls가 결과 문서 대상에 포함돼야 함 |
| v3.8 Operator-Gated Action Pilot & Outcome Loop | `UI-102`~`UI-107`, `CLIENT-040`~`CLIENT-042`, v3.8 `verify-v380-*` rows | `/ops` action control workspace와 `/client/*` action notice preview, approval/readiness/receipt/default-off explanation controls가 결과 문서 대상에 포함돼야 함 |

이 bridge를 만족해도 인앱 브라우저 UI 풀테스트, 30분, 120분, published metadata,
release action이 실행된 것은 아닙니다. 각 실행 결과는 별도 evidence로만 기록합니다.

v2.2.0 UI Evidence Close-out은 F02~F06 follow-up을 기능 inventory, manual UI checklist,
result template에 연결하는 준비 기준입니다. F06는 UI 풀테스트 실행 결과가 아니라
결과 기록 기준 정리 단계이므로, F06 verifier PASS를 인앱 브라우저 UI 풀테스트 PASS로
쓰지 않습니다. 30분 또는 120분 장시간 테스트를 실행하지 않았으면 manual result의
별도 영역에 `미실행`으로 기록합니다.

## 4. 데이터 리셋

UI 풀테스트는 운영 데이터가 아닌 throwaway data reset 상태에서 시작합니다.

- 임시 users file
- 임시 source registry
- 임시 published views
- 임시 analysis registry
- 임시 event storage/snapshot/clip 경로
- `MEDIA_SERVER_AUTH_MODE=auto`
- 검증 전용 HTTP/RTSP port

현재 제품 baseline의 저장소는 내부 DB가 아니라 파일 기반 runtime state입니다.
auth는 users JSON, source/view/analysis 설정은 각 registry JSON, ops audit과
EventRecord는 JSON Lines, snapshot/clip evidence는 지정 디렉터리에 저장됩니다.
결과 문서에는 실제 사용한 `MEDIA_SERVER_AUTH_USERS_FILE`,
`MEDIA_SERVER_SOURCE_REGISTRY`, `MEDIA_SERVER_PUBLISHED_VIEWS`,
`MEDIA_SERVER_ANALYSIS_REGISTRY`,
`MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH`,
`MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR`,
`MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR`를 적고, DB 저장이라고 추정하지 않습니다.

데이터 리셋 후 `/setup`에서 admin을 직접 만들고, 결과 문서에는 비밀번호 원문,
invite token 원문, session cookie, generated password suggestion을 남기지 않습니다.

## 5. 실제 브라우저 조작과 Policy v4 evidence mode

UI 풀테스트는 사용자가 대신 누르는 절차가 아니라 테스트 주체가 브라우저를
제어해 수행하는 절차를 기본값으로 둡니다. Codex 세션의 인앱 브라우저는
`direct-browser`, Policy v4 qualifier를 통과한 actual browser runner는
`qualified-native-automation`, DOM만으로 닫히지 않는 시각/영상 항목에 direct 또는
전용 visual evidence를 결합하면 `hybrid`로 기록합니다. 다음 행위가 실제
브라우저에서 수행되어야 `확인됨`입니다.

- route를 실제로 열기
- nav/tab/button/menu/details를 클릭하기
- textbox/textarea/password에 타이핑하기
- select/checkbox/toggle/segmented control을 조작하기
- copy button, export button, preview/play/stop/reconnect를 누르기
- role별 route guard를 브라우저에서 확인하기
- responsive viewport를 바꾸고 화면을 다시 확인하기
- confirm/alert/prompt 같은 브라우저 native dialog가 제품 UI에 남아 있지 않은지
  `verify-product-ui-no-native-dialogs`로 먼저 확인하기
- blocking dialog policy에서 허용한 in-page dialog만 쓰는지
  `verify-ui-blocking-dialog-policy`로 확인하기
- 위험 action은 제품 화면 안 2회 확인 상태로 처리되고, 첫 클릭에는 write POST가
  발생하지 않으며 두 번째 클릭에서만 상태가 바뀌는지 확인하기

테스트가 Codex pane attach, 사용자의 클릭, 운영체제 팝업 버튼 수동 확인을 기다리면
그 항목은 제품 FAIL이 아니라 테스트 harness FAIL입니다. harness FAIL 상태에서
해당 기능을 PASS로 기록하지 않습니다.

### v3.9.0 AI-minimized UI automation adapter / Policy v4 기준

v3.9.0 Test Model Prep의 UI automation adapter는 사람이 브라우저를 매번 수동으로
운전하지 않아도 실패 원인을 재현할 수 있는 evidence를 남기는 기준입니다. 이 기준은
UI 풀테스트를 다섯 번째 테스트 영역으로 만들지 않고, AGENTS의 `UI` 영역 안에 둡니다.
runner PASS 자체는 UI PASS가 아니며 `./server.sh verify-ui-fulltest-evidence-policy-v4`
결과의 `policyValidationResult`와 `uiFulltestPass`를 분리합니다.

도구 우선순위:

- 1차 후보는 무료 web automation 도구인 Playwright입니다. 제품 UI가 웹 기반이고
  route/control/action/console/trace/screenshot evidence를 한 실행에서 남길 수 있기
  때문입니다.
- 2차 후보는 Selenium입니다. Playwright를 사용할 수 없는 환경의 web automation
  fallback으로만 봅니다.
- DOM-level 확인만으로 video viewport, overlay, crop, visual artifact를 판정하기
  어려운 경우에만 SikuliX 같은 image-based fallback을 검토합니다. 이 fallback도
  raw screenshot 생성만으로 UI PASS를 만들 수 없습니다.

failure report 필수 필드:

| 필드 | 기록 기준 |
| --- | --- |
| route | 실패한 제품 route 또는 route group |
| viewport | width/height와 responsive target |
| theme | light/dark 또는 미적용 사유 |
| account/role | 사용한 계정 유형과 role/scope |
| control/action | 클릭/타이핑/선택한 control과 action |
| expected result | 기대한 UI state, URL, DOM state, log/event |
| actual result | 실제 화면/DOM/log/event 차이 |
| screenshot | 실패 순간 screenshot 경로 |
| trace/video | Playwright trace/video 등 지원되는 경우의 artifact 경로 |
| browser console | console error/warning 요약 |
| server log reference | 관련 server log path와 tail marker |
| cleanup/port state | 테스트 종료 후 throwaway server/port cleanup 상태 |
| manual intervention | 사용자 클릭, pane attach, OS dialog 수동 확인이 있었는지 여부 |

manual intervention이 있으면 해당 run은 자동 clean PASS가 아닙니다. 보고서는
`manual intervention: yes`와 사유를 남기고, 최종 UI 풀테스트 PASS 여부는 개별
route/control/action 결과표에서 다시 판정합니다.

UI 풀테스트 결과는 모든 개별 기능, route, control, action 단위로 답합니다.
카테고리 묶음 판정은 금지합니다. 예를 들어 `Rules PASS`, `Auth FAIL`처럼 묶지
않고, `RULE-041 presence EventRecord 발생`, `AUTH-022 reset 후 must-change`,
`UI-004 password change 임시 pw 로그인`처럼 개별 행으로 기록합니다.
요약은 개별 행 이후에만 둘 수 있고, 요약이 개별 결과를 대체할 수 없습니다.
열어보지 않은 화면, 누르지 않은 기능, 일부 조건만 확인한 기능은 `FAIL`입니다.
제외 항목은 판정표 밖 `Exclusions`에만 둡니다.

Policy v4 자동화 동등성은 아래 추가 조건을 모두 요구합니다.

- exact `manualUiCaseId`와 route/control/action source mapping
- requested/observed role·scope, viewport, theme 일치
- 실제 trusted interaction과 DOM transition, correlated network+DOM, persisted state,
  EventRecord, server log 중 하나의 completion oracle
- exact-selector visible assertion과 실제 screenshot/trace/console/server-log artifact
- source/policy/manifest/runner fingerprint, artifact hash/type/path containment, redaction
- visual baseline/geometry evidence 또는 direct visual evidence가 필요한 항목의 hybrid 처리
- replay PASS, failed/not-run/unsupported/manualIntervention 0, server/port/temp cleanup PASS

전체 UI 풀테스트 PASS는 current exact UI test ID 424개와 교차 viewport/theme/role/
redaction/video/overlay/visual/accessibility 의무가 모두 direct 또는 automation-equivalent
PASS일 때만 가능합니다. 현재 v3.9 matrix의 automated 8, unsupported 415,
positive UI 제외 1은 부분 evidence이며 suite PASS가 아닙니다.

풀테스트 harness 자체를 한 번에 실행할 때는
`./server.sh verify-ui-fulltest-one-shot`을 사용합니다. 이 명령은 전용
throwaway registry/users/event 경로와 격리 포트로 core/auth 서버를 띄운 뒤
native/blocking dialog guard, feature inventory coverage, Ops/Client screenshot smoke,
Rules smoke, route/rules/table guard, core/auth click
E2E를 순서대로 실행하고 `summary.json`과 `summary.md`를 남깁니다. 이 wrapper는
`verify-predev --soak-minutes 30`, `verify-predev --soak-minutes 120`,
`verify-va-runtime-console-longrun --duration-minutes 120`을 실행하지 않습니다.
`--manual-result <result.md>`를 지정하면 기존 manual result 문서 구조를 함께
검증합니다. manual result 구조 검증은 opt-in이며, manual result를 지정하지 않으면
해당 step은 skip됩니다. wrapper PASS는 full UI 풀테스트 PASS가 아닙니다.
v3.9.0부터 wrapper summary는 아래 필드를 반드시 포함합니다.

| 필드 | 의미 | PASS로 승격 금지 |
| --- | --- | --- |
| `wrapperResult` | wrapper command 자체의 성공/실패입니다. | UI 풀테스트, 30분, 120분, manual result 실행 PASS가 아닙니다. |
| `resultScope` | `wrapper-only`로 고정해 wrapper 결과 범위를 표시합니다. | release/UI 실행 범위 확장 근거가 아닙니다. |
| `uiFulltestEvidenceStatus` | 인앱 브라우저 evidence JSON 제공 여부입니다. | `provided`여도 route/control/action 직접 결과표가 없으면 UI 풀테스트 PASS가 아닙니다. |
| `manualResultStatus` | manual result 문서 제공/skip/not-provided 상태입니다. | `skipped` 또는 `not-provided`는 manual UI 결과 PASS가 아닙니다. |
| `longrunStatus` | 30분, 120분 predev, runtime console 120분을 `not-run-by-this-wrapper`로 기록합니다. | longrun 실행 evidence로 사용할 수 없습니다. |

auth UI flow를 포함하므로 아래 환경변수는 실행자가 직접 지정해야 합니다.

- `MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD`
- `MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD`
- `MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD`
- `MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE`
- `MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO`

다음은 `확인됨`으로 쓰지 않으며, UI 풀테스트 대상이면 `FAIL`입니다.

- raw JSON/API-only 확인만 수행
- 스크립트 screenshot만 생성
- Policy v4 qualifier를 통과하지 않은 자동 smoke만 통과
- 열지 않은 화면
- 실패한 화면을 재검수하지 않음
- 브라우저가 아닌 문서/코드만 확인
- 사용자가 대신 누른 클릭이나 팝업 확인을 runner evidence처럼 기록

## 6. 필수 화면 범위

Auth:

- `/`
- `/setup`
- `/login`
- `/password/change`
- `/invite/setup`

Ops:

- `/ops/home`
- `/ops/dashboard`
- `/ops/sources`
- `/ops/rules`
- `/ops/users`
- `/ops/events`
- `/ops/vlm`

Client:

- `/client/live`
- `/client/dashboard`
- `/client/events`
- `/client/request-access`

Role/scope:

- admin/operator의 Ops 접근
- viewer의 Client 접근
- viewer의 `/ops/home` 접근 거부
- 승인 전 접근 요청이 로그인/채널 권한을 만들지 않는 경계
- invite setup 전후 접근 경계

## 7. 기능별 필수 조작

- Auth: weak password rejection, strong setup, login, must-change password,
  password history reuse rejection, invite setup
- Ops Home: nav, summary, status, event summary
- Ops Dashboard: refresh, incident search, source filter, copy/share, root cause panel
- Channels: add/edit validation, file channel, RTSP/ONVIF/WHEP input, row action, copy
- Rules: scenario/event template, profile, VA rule validation, preview play/stop,
  geometry default/clear, save
- Users: user create/edit, viewer scope, password reset, disable/restore, last admin guard,
  pending request approve/reject
- Events: filters, include archives, prev/next, evidence/export action
- VLM Ops: `/ops/vlm` install/model state, cloud opt-in guard, privacy transfer warning,
  profile activation/fallback/disable/delete, raw details 접힘 영역
- VLM Event Review: `/ops/events` VLM summary/explanation/false-positive hints/operator
  questions 표시, client/viewer 비노출
- Client Live: source tree, tile assignment, start/reconnect/stop, grid/density,
  dock side, info overlay, workspace actions, copy fallback, keyboard focus
- Client Dashboard: filter, sort, status copy, event copy
- Request Access: public submit, pending copy, approval before/after boundary
- v2.1.0 VLM pre-test 반영: `/ops/vlm`의 local/cloud dry-run 후보, missing-model,
  cloud-disabled, provider-timeout 안내, privacy transfer guard, profile 저장/
  활성화/fallback/disable/delete, raw details 접힘 영역을 기능 ID별로 확인
- v2.1.0 client redaction: `/client/live`, `/client/dashboard`, `/client/events`에서
  VLM model, prompt, raw response, provider, internal review card, source/debug JSON이
  보이지 않는지 기능 ID별로 확인
- v2.5.0 Semantic Incident Memory UI 풀테스트 기준: `/ops/events`에서 `UI-039`
  semantic search 입력/filter/matched evidence highlight, `UI-040` timeline graph,
  `UI-041` explainable incident brief, `UI-042` similar incident lookup, `UI-043`
  raw signed bundle과 별도 `release-safe bundle`, `UI-044` owner/release readiness
  기준을 기능 ID별로 확인합니다. raw JSON/API-only 확인, 자동 smoke, screenshot
  생성만으로는 UI 풀테스트 PASS로 쓰지 않습니다. release-safe bundle은 실제 버튼
  조작, token 요청, manifest-only/redaction policy 확인, raw evidence/source
  locator/provider material 비노출 확인을 분리해 기록합니다.
- v2.8.0 Operator-Supervised Action Readiness UI 풀테스트 기준: `/ops/events`에서
  `UI-055` Incident Action Readiness Queue, `UI-057` Evidence Intake and Field
  Readiness, `UI-058` Runtime Evidence Window를, `/ops/rules`에서 `UI-056`
  Approval-gated Rule Draft Readiness를, `/client/live`, `/client/dashboard`,
  `/client/events`에서 `CLIENT-024` Client-safe Follow-up Digest를 기능 ID별로
  확인합니다. S07 release readiness는 `OPS-040`과 `SAFE-070` 기준으로 S02~S06
  UI criteria, release evidence 문서, not-run/published metadata 경계가 같은
  범위를 가리키는지 확인하는 기준 정리입니다.
  raw JSON/API-only/static smoke/Chrome fallback은 UI 풀테스트 PASS로 쓰지 않습니다.
- v2.9.0 Final 2.x Closure UI 풀테스트 기준: v2.9.0은 새 제품 UI route를 추가하지
  않고 현재 2.x route/control/action/role/viewport/theme 기준을 freeze합니다. UI
  직접 대상은 `project-feature-test-inventory.md`의 현재 UI 대상 기능 ID 전체와
  `/setup`, `/login`, `/password/change`, `/invite/setup`, `/ops/home`,
  `/ops/dashboard`, `/ops/sources`, `/ops/rules`, `/ops/users`, `/ops/events`,
  `/ops/vlm`, `/client/live`, `/client/dashboard`, `/client/events`,
  `/client/request-access`입니다. admin/operator/viewer/integrator role guard,
  320px/390px/760px/1180px viewport, light/dark theme, nav/tab/button/menu/details,
  textbox/textarea/password, select/checkbox/toggle/segmented control, copy/export/
  preview/play/stop/reconnect action을 개별 기능 행으로 확인합니다. S05는 기준
  freeze이며 실제 UI 풀테스트 실행 PASS가 아닙니다. raw JSON/API-only/static smoke/
  screenshot-only/Chrome fallback은 UI 풀테스트 PASS로 쓰지 않습니다.
- v2.7.0 Operational Incident Command Loop UI 풀테스트 기준: `/ops/events`에서
  `UI-050` Incident Triage Board, `UI-051` Decision scorecard, `UI-052`
  Operational Action Pack, `UI-053` Rule What-if Preview, `UI-054` Operator
  outcome memory를 기능 ID별로 확인합니다. S06 release readiness는 `OPS-038`과
  `SAFE-063` 기준으로 S01~S05 UI criteria, release evidence 문서, not-run/published
  metadata 경계가 같은 범위를 가리키는지 확인하는 기준 정리입니다.
  raw JSON/API-only/static smoke/Chrome fallback은 UI 풀테스트 PASS로 쓰지 않습니다.
- v2.6.0 Operational Hardening UI 풀테스트 기준: `/ops/events`에서 `UI-045`
  VLM summary candidate review와 `UI-046` incident-to-rule draft-only 연결을,
  `/ops/sources`에서 `UI-047` ONVIF credential gate를, `/ops/dashboard`에서
  `UI-048` page-session-only runtime trend card를, `/ops/rules`에서 `UI-049`
  configured-zones A->B re-entry 후보를 기능 ID별로 확인합니다. S06 release
  readiness는 `/ops/events`, `/ops/sources`, `/ops/dashboard`, `/ops/rules`,
  release evidence 문서가 같은 not-run 경계를 가리키는지 확인하는 기준 정리입니다.
  raw JSON/API-only/static smoke/Chrome fallback은 UI 풀테스트 PASS로 쓰지 않습니다.

위 목록은 실행 순서 요약입니다. 실제 기능 단위 범위는
[project-feature-test-inventory.md](./project-feature-test-inventory.md)의 기능 ID를
기준으로 추적합니다. UI가 `비대상`인 API/계약/backend 기능은 억지로 제품 UI를
만들지 않고 스크립트 테스트 영역에서만 판정합니다.

비밀번호 변경 성공 케이스는 사용자 지정 테스트 비밀번호를 최종 상태로 보존하면서
검수합니다.

- 모든 테스트 계정은 실행자가 지정한 테스트 비밀번호로 시작합니다. 이 값은 기본
  비밀번호가 아니며 문서와 screenshot에 원문을 남기지 않습니다.
- 성공 flow는 `/password/change`에서 사용자 지정 테스트 비밀번호를 현재 비밀번호로
  입력하고, 임의의 강한 임시 비밀번호로 변경한 뒤 `/login` redirect를 확인합니다.
- 임시 비밀번호로 로그인해 실제로 변경됐는지 확인합니다.
- 임시 비밀번호에서 사용자 지정 테스트 비밀번호로 즉시 되돌리는 시도는
  password history 정책에 의해 거부되어야 합니다.
- 사용자 지정 테스트 비밀번호로 최종 복원해야 하는 경우,
  `MEDIA_SERVER_AUTH_PASSWORD_HISTORY_COUNT` 값을 확인합니다. 기본값은 `5`이므로
  `원래 -> 임의1 -> 임의2 -> 원래`는 복원 조건이 아닙니다. 원래 비밀번호가
  history 밖으로 밀려날 만큼 서로 다른 임시 비밀번호를 추가로 거친 뒤에만
  사용자 지정 테스트 비밀번호로 복원할 수 있습니다.
- 관리자 reset password UI/API는 password history 우회 수단으로 쓰지 않습니다.
  reset도 같은 history 정책을 통과해야 하며, 성공 시 다음 로그인 비밀번호 변경
  요구 상태가 될 수 있으므로 본인 변경 flow와 별도 evidence로 기록합니다.
- 최종 확인은 이전 임시 비밀번호 로그인이 거부되고, 사용자 지정 테스트 비밀번호로
  기대 role landing(`/ops/home` 또는 `/client/live`)에 도달하며, lockout/failure
  상태가 남지 않는 것입니다.

VA 룰/시나리오 검수는 Rule/Profile/Scenario CRUD와 EventRecord 발생 이력 확인을
분리합니다. `/ops/rules`에서 rule/template/profile을 저장한 것만으로 이벤트 발생을
확인했다고 쓰지 않습니다.

- 최종 analysis registry의 enabled event template과 vaRule을 모두 나열합니다.
- basic event type은 `presence`, `enter`, `exit`, `line-crossing`입니다.
- scenario event type은 `intrusion-dwell`, `re-entry`, `wrong-direction`,
  `intrusion-after-line-crossing`, `loitering`, `zone-occupancy`입니다.
- basic/scenario 최종 12개 이상 event key는 개별 PASS/FAIL 행으로 기록하고,
  카테고리 묶음 PASS로 대체하지 않습니다.
- UI 풀테스트 완료 전 `/ops/events`를 admin/operator 권한으로 열고 EventRecord
  rows를 직접 확인합니다. screenshot과 함께 visible row, pagination/filter 상태,
  archive 포함 여부를 기록합니다.
- 파일/API 조회는 보조 evidence로만 사용합니다. 보조 대조에서는
  `MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH`의 active JSON Lines와, 필요한 경우
  `includeArchives=1` 조회를 사용해 event type, `metadata.ruleId`, `zoneId`,
  `lineId`, `scenarioName`을 registry와 비교합니다.
- enabled template/vaRule 중 하나라도 EventRecord 이력이 없으면 해당 event type과
  rule id를 `FAIL`로 기록합니다. sample H.264 재생이나 preview
  화면만으로 모든 VA 이벤트 발생을 확인했다고 쓰지 않습니다.

## 8. 시각 품질과 반응형

UI 풀테스트는 기능 검수와 같은 비중으로 시각 품질을 봅니다.

- 320px, 390px, 760px, 1180px에서 각 주요 UI를 확인합니다.
- form label/input/select 간격이 같은 계층에서 일관적인지 확인합니다.
- button text, table row action, badge, tile action, modal/menu가 잘리지 않는지 봅니다.
- client live video viewport, control, status, overlay가 잘리지 않는지 봅니다.
- light/dark theme에서 semantic token contrast가 유지되는지 봅니다.
- hover/focus/selected/disabled/loading/error/empty 상태가 화면을 밀거나 겹치게
  만들지 않는지 확인합니다.
- client/viewer 화면에 source URL, Developer URL, raw JSON, debug counter,
  BBox diagnostics, rule/profile editor, model/source/auth material, Ops/Lab primary
  navigation이 노출되지 않는지 확인합니다.

## 9. 보조 자동 검증과 중단

아래 자동 검증은 UI fulltest actual-browser evidence와 별개인 `스크립트 테스트`
증거입니다. UI/Auth/Ops/Client 변경이 있으면 최소 아래 명령을 검토하고, 실행하지
않은 항목은 이유를 적습니다. Policy v4-qualified fulltest runner는 이 보조 smoke와
구분합니다.

- `./server.sh build`
- `./server.sh verify-auth-bootstrap`
- `./server.sh verify-auth-users`
- `./server.sh verify-auth-routes`
- `./server.sh verify-ops-client-ui`
- actual UI: direct-browser 또는 Policy v4-qualified browser evidence
- screenshot smoke: `./server.sh verify-ops-client-ui --screenshots`
- Policy v4 qualifier: `./server.sh verify-ui-fulltest-evidence-policy-v4 --summary <summary.json>`
- `./server.sh verify-product-ui-no-native-dialogs`
- `./server.sh verify-ui-blocking-dialog-policy`
- `./server.sh verify-ops-click-e2e`
- `./server.sh verify-ops-click-e2e --auth-ui-flow --auth-users-file <path>`
- `./server.sh verify-rule-ui`
- `git diff --check`

문서 변경이 있으면 아래를 검토합니다.

- `./server.sh verify-docs-links`
- `./server.sh verify-docs-ui-assets`
- `./server.sh verify-release-metadata`
- `./server.sh verify-manual-ui-evidence`

장시간 테스트와 `verify-predev`는 사용자가 명시 요청하지 않으면 실행하지 않습니다.
실행하지 않은 스크립트는 실행하지 않았다고 사실 기록만 남깁니다. 보조 smoke는
UI 풀테스트 대체 evidence가 아니며 Policy v4-qualified actual-browser summary만 exact
case 단위 대체 후보가 됩니다.

VLM UI 기준:

- `/ops/vlm`의 model install readiness, missing-model, cloud-disabled, provider timeout
  안내는 직접 클릭/선택/저장/삭제 결과로 확인합니다.
- cloud opt-in guard는 opt-in 전 provider 호출/credential 저장이 없고, opt-in 후에도
  dry-run 선택만 반영되는지 확인합니다.
- `/ops/events` VLM review detail은 EventRecord evidence와 함께 표시되지만
  Event POST/WebRTC/SSE/WS payload에 섞이지 않는지 스크립트 evidence와 분리합니다.
- `/client/live`, `/client/dashboard`, `/client/events`에는 VLM model, prompt, raw
  response, provider, internal review card가 보이지 않아야 합니다.
- raw JSON/API-only 확인, `verify-ops-client-ui --browser-mode static`, screenshot만으로는
  VLM UI 풀테스트 PASS가 아닙니다.

## 10. 토큰 사용량 기록

모든 안정화/30분/120분/UI 풀테스트 기록에는 평균 산출을 위해 토큰 사용량을
남깁니다. 결과 문서와 release evidence ledger에는 아래 필드를 빠뜨리지 않습니다.

- `token usage source`: Codex goal usage, 명령별 summary, 또는 미집계 사유
- `token start`: 해당 테스트 영역 시작 시점의 누적 토큰
- `token end`: 해당 테스트 영역 종료 시점의 누적 토큰
- `token consumed`: `token end - token start`
- `elapsed`: 실제 테스트/기록에 걸린 시간

토큰 사용량은 비용/평균 산출용 메타데이터입니다. 토큰 사용량이 적거나 많다는
이유로 테스트 결과를 PASS/FAIL에서 바꾸지 않습니다. 자동 집계값이 없으면 임의로
추정하지 않고 `manual-not-available` 또는 미집계 사유를 기록합니다.

## 11. 보고 원칙

보고는 확인된 사실과 추정을 분리합니다.

- 확인됨: 실제 실행한 명령, evidence mode, 실제 브라우저로 조작한 화면, 실제 생성된 fixture, 실제 수정 파일,
  실제 커밋 여부
- 제외 기록: 사용자가 의도적으로 UI 풀테스트 기준에서 제외하라고 한 실기기/외부
  credential/scope 밖 항목. 이 항목은 PASS/FAIL 판정표에 넣지 않습니다.
- 실패: PASS 조건을 충족하지 못한 모든 UI 풀테스트 대상 기능, 실패 명령, 실패 화면,
  영향 범위, 수정 여부, 재검수 결과
- UI 풀테스트 판정은 개별 기능별 `PASS` 또는 `FAIL`만 사용합니다.

푸시는 사용자가 명시 요청하기 전까지 수행하지 않고, 마지막에는 푸시 가능 여부와
푸시 수행 여부를 분리해서 보고합니다.

## 12. 문서 비교/병합 결과

이번 재작성에서는 기존 [manual-ui-checklist.md](./manual-ui-checklist.md)를 실행
runbook으로 전면 정리하고, 이 문서를 UI 풀테스트 세부 기준 문서로 새로
작성했습니다. 두 문서를 비교해 중복된 정의는 이 문서에 병합했고, route별 실행
항목과 종료 체크는 checklist에 남겼습니다. 결과 기록 항목은
[manual-ui-result-template.md](./manual-ui-result-template.md)에 병합했습니다.

앞으로 "UI 풀테스트"를 요청받으면 이 문서의 기준을 먼저 적용하고,
checklist와 result template을 함께 사용합니다.
