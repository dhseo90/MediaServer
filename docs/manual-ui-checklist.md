# UI 풀테스트 실행 체크리스트

[합격 기준과 Policy v4](manual-ui-fulltest.md), [기능별 테스트 정의](project-feature-test-inventory.md),
[결과 템플릿](manual-ui-result-template.md)을 함께 사용한다. 소스 버전은 [VERSION](../VERSION)을
읽고 실제 commit/diff/build를 기록한다. 과거 완료 기록은 실행 전제나 이번 PASS가 아니다.
내부 기능의 단기 검사는 inventory의 UI 필요 여부를 따르며 실제 UI PASS로 부풀리지 않는다.

## 준비

- [UI 안내](ui-guide.md), [설정](config-reference.md), [제품 지원 범위](../README.md)에서
  이번 route/control/action과 역할을 확인한다. 승인 범위 밖 실기기·외부 서비스를 추가하지 않는다.
- baseline manifest 424개 UI ID와 inventory를 대조하고 녹화 8개/31 action을 합쳐 432개를 고정한다.
  exact ID별 정상/오류/경계 기대값, role/scope, viewport/theme, completion oracle을 정한다.
- 운영 원본과 분리된 users/source/view/analysis/event/snapshot/clip/녹화/audit 경로, HTTP/RTSP 포트,
  output root·정리 방법을 정한다. 녹화 off도 시작 복구가 있으므로
  `MEDIA_SERVER_RECORDING_STORAGE_ROOT`를 격리한다. `MEDIA_SERVER_AUTH_MODE=auto`를 사용한다.
- Auth verifier의 임시 비밀번호 5개는 아래 Auth 절에 따라 안전하게 생성·주입하고 값은 기록하지 않는다.
- `verify-product-ui-no-native-dialogs`, `verify-ui-blocking-dialog-policy`, 실제 browser 권한을 확인한다.
  사용자 대신 클릭/팝업 확인이 필요하면 harness 실패와 `manualIntervention`을 남긴다.
- 30분·120분·UI 실행은 별도 승인을 확인한다. 시작 조건 실패와 미시작은 실제 제품 FAIL과 구분한다.
  영향 판단·실패 전파·cleanup은 [검증 정책](stream-verification.md#검증-정책)과 [AGENTS](../AGENTS.md)를 따른다.

### VA seed와 실행 도구

`test/fixtures/manual_ui_fulltest_va_seed_matrix.json`은 준비 정의이며 실행 증거가 아니다.
`./server.sh prepare-manual-ui-fulltest-seed --dry-run --published-seed-baseline`은 HTTP 요청 없이 계획을 확인한다.
`--emit-registry-dir <dir>`는 source/view/analysis registry와 precondition을 만든다.
Auth users에는 비가역 hash가 필요하며 기본 비밀번호를 만들지 않는다.
실제 적용은 승인된 throwaway 서버에만
`--apply --published-seed-baseline --confirm-throwaway-data --http-base <url>`로 수행한다.
준비 자료의 버전 표시는 provenance이며 현재 source를 대신하지 않는다.
최종 enabled event template·vaRule, 방향별 line-crossing, scenario preset,
tracker/Re-ID 조합을 유지해 CRUD 이후 EventRecord를 따로 확인한다.
4신 sample·VA overlay와 실제 event용 sample의 목적을 구별한다.

보조 wrapper `verify-ui-fulltest-one-shot --output-dir <dir>`는 실제 core/auth 서버를 실행한다.
`--http-base`, `MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT`, `--auth-users-file`,
선택적 `--manual-result <result.md>`의 경계는 [기준서](manual-ui-fulltest.md#실행-도구와-결과-해석)를 따른다.
wrapper/자동 screenshot/API-only는 실제 UI 풀테스트가 아니고 장시간을 실행하지 않는다.
`verify-predev --soak-minutes 30`, `verify-predev --soak-minutes 120`,
`verify-va-runtime-console-longrun --duration-minutes 120` 결과는 별도 영역이다.

## 녹화 UI 실행

현재 대상은 baseline 424 + inventory I27~I34 녹화 8 = 432개 ID입니다.
기존 canonical/native manifest는 보존하고 424 qualifier는 baseline만 판정합니다.
[결과 템플릿의 action별 사전 정의](./manual-ui-result-template.md#v410-녹화-8개-id-action별-결과)를
한 행도 생략하지 않고 실행합니다. 이 표는 ID 8개 안의 세부 조작을 정의하며 새 ID가 아닙니다.

1. baseline 424개 exact 실행·증거를 확보하고 녹화 8개와 집계를 분리합니다.
2. /ops/events에서 I27 정상/빈값/역전/페이지 → I28 이벤트 우선 → I29 원본 →
   I30 실제 영상 재생/정지/탐색을 실제 control로 조작합니다.
3. I31 partial의 일부 구간·재생 가능 여부, 실제 삭제/손상 fixture 각각의 공통 재생 불가 안내, 미완결 event, 공백, 오류를 확인합니다. 정확한 missingRanges 표출이나 Writing segment의 목록 표출은 요구하지 않습니다. Writing 재생 금지는 내부 안전성 V410-S06-I08(`verify-v410-recording-timeline --read-model`)로 별도 검증하며 Pending event UI로 대체하지 않습니다. I32 quota/활성/blocked를 각각 확인합니다.
   준비 fixture에 없는 상태는 미실행으로 남기고 정상 상태로 대체하지 않습니다.
4. I33 navigation 범위와 I34 실제 role/scope/redaction 및
   320/390/760/1180 × light/dark 8개 조합을 확인합니다.
5. 과거 실행 PASS는 diff·source·환경·검증 경계 검토 없이 일괄 승계하지 않습니다. auth-off --ui-direct 준비·종료는 역할 검증이
   아니므로 실제 로그인·권한별 조작 및 제품 반영을 별도로 기록합니다.
6. 메인이 exact 432개와 모든 세부 action·[Policy v4 공통 조건](manual-ui-fulltest.md#policy-v4-증거-적격-기준)·cleanup을
   확인한 뒤 whole-suite 판정합니다. 424 qualifier나 준비 도구 exit0로 대체하지 않습니다.

## 화면별 실행

각 control을 실제 클릭·타이핑·선택하고 전후 상태·로그/EventRecord를 확인한다.
인앱 direct-browser 또는 Policy v4 적격 actual automation만 실행 증거다.

### Auth

- `/`: setup 필요 상태에서는 `/setup`, 로그인 필요 상태에서는 `/login`, 로그인 후에는
  role landing으로 이동하는지 확인합니다.
- `/setup`: weak password rejection, strong admin password 설정, `/login` redirect를
  확인합니다.
- `/login`: admin/operator는 `/ops/home`, viewer는 `/client/live`로 이동하는지 확인합니다.
- `/password/change`: reset 또는 must-change 계정에서 이전 비밀번호 재사용 거부와
  새 비밀번호 설정 flow를 확인합니다.
- `/password/change`: 성공 flow는 실행 초기 임시 비밀번호에서 임의의 강한
  임시 비밀번호로 변경한 뒤, 임시 비밀번호 로그인 성공까지 확인합니다. 이후
  초기 임시 비밀번호 복원도 검증하는 경우에는 `MEDIA_SERVER_AUTH_PASSWORD_HISTORY_COUNT`
  기본값 `5`를 고려해 원래 비밀번호가 history 밖으로 밀려날 만큼 서로 다른 임시
  비밀번호를 거쳐야 합니다. `원래 -> 임의1 -> 임의2 -> 원래`는 기본 정책에서
  복원 성공 조건이 아니며, 즉시 재사용 거부는 PASS로 기록합니다. 격리 계정은 검사 후
  정리하므로 복원이 일반 종료 의무는 아닙니다.
- 관리자 reset password는 history 정책 우회가 아닙니다. reset 성공/실패, 다음 로그인
  변경 요구 상태, 최종 실행 초기 임시 비밀번호 로그인 성공, 이전 임시 비밀번호
  로그인 거부를 각각 분리해 기록합니다.
- `/invite/setup`: 승인된 접근 요청의 초대 설정 전후 경계를 확인하되 token 원문은
  결과에 남기지 않습니다.
- 실제 브라우저 Auth 입력 증거는 throwaway users file에서만 수행합니다. `/setup`,
  `/login`, `/password/change`, `/invite/setup`의 비밀번호 입력/제출을 직접
  수행했다면 weak password rejection, 성공 redirect, screenshot/artifact 경로,
  실행한 `verify-auth-bootstrap` 또는 `verify-auth-users` 결과를 함께 남깁니다.
- Auth verifier 실행 전 `MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD`,
  `MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD`,
  `MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD`,
  `MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE`,
  `MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO`는 검증 내부 전달 이름입니다.
  격리 Auth verifier는 실행마다 안전한 난수 5개를 자동 생성합니다. 자동 생성이 없는
  wrapper 경로는 준비 단계에서 안전하게 주입하며 사용자에게 지정을 요구하지 않습니다.
  안전한 생성·주입·격리가 안 되면 준비 실패와 UI 미실행으로 기록합니다.
  값 원문·고정값·이전 실행값·운영 계정 비밀번호를 사용하거나 기록하지 않습니다.
- Chrome/Computer Use/Browser Use가 비밀번호 필드나 clipboard permission 때문에
  입력을 끝까지 수행하지 못한 경우에는 해당 개별 기능을 `FAIL`로 기록하고,
  어떤 단계까지 직접 확인했는지와 보조로 통과한 auth smoke 명령을 분리합니다.
  자동 smoke 통과만으로 실제 브라우저 Auth 입력을 완료했다고 쓰지 않습니다.
  사용자가 대신 입력하거나 팝업을 누른 행위는 verifier evidence로 대체하지 않습니다.
- Auth evidence에는 plaintext password, invite token 원문, session cookie,
  generated password suggestion을 남기지 않습니다.

### Ops

- `/ops/home`: 운영 구성, 실시간 상태, 최근 이벤트 요약, primary nav가 겹침 없이
  보이는지 확인합니다.
- `/ops/dashboard`: root cause, incident timeline, VA quality, scenario timeline,
  filter/search/select/copy action을 직접 조작합니다.
- `/ops/sources`: source/PublishedView 목록, 채널 추가/수정 validation, file/RTSP/ONVIF/WHEP
  입력, detail panel, copy/audit export UI를 확인합니다.
- `/ops/rules`: VA rule, Event template, Profile 화면을 확인하고 저장 전 validation,
  preview 재생/정지, geometry 기본 좌표/비우기, 저장 flow를 직접 조작합니다.
- `/ops/rules`와 `/ops/events`: 최종 enabled event template/vaRule 기준으로
  `presence`, `enter`, `exit`, `line-crossing`, `intrusion-dwell`, `re-entry`,
  `wrong-direction`, `intrusion-after-line-crossing`, `loitering`, `zone-occupancy`
  발생 이력을 모두 대조합니다. `/ops/events`에서 visible EventRecord row와
  pagination/filter/archive 상태를 직접 확인하고, JSON Lines/API 대조는 보조
  evidence로만 사용합니다. 하나라도 없으면 VA 이벤트 커버리지는 PASS가 아닙니다.
- `/ops/users`: 사용자 추가/수정, viewer scope 적용, reset password, disable/restore,
  마지막 admin 보호, pending access request 승인/거절 flow를 확인합니다.
  접근 요청 거절 같은 위험 action은 native confirm/alert/prompt가 아니라 제품 화면 안
  2회 확인 상태로 처리되어야 합니다. `verify-product-ui-no-native-dialogs`로 native
  dialog가 없는지 먼저 막고, `verify-ui-blocking-dialog-policy`로 allowlist와
  blocking dialog policy를 확인합니다. `verify-ops-click-e2e`는 첫 클릭에서 POST가 발생하지
  않는지와 두 번째 클릭 뒤 거절 POST, rejected row, user row 미생성까지 확인합니다.
- `/ops/events`: evidence policy, evidence filter, include archives, prev/next,
  signed bundle export를 확인합니다.
- `/ops/events`는 primary nav가 아니라 진단/직접 route 또는 Dashboard 내부 섹션으로
  취급합니다.

### Client

- `/client/live`: Live/Dashboard nav만 보이고 Ops/Lab nav, source URL, Developer URL,
  raw JSON, debug counter, BBox diagnostics, rule/profile editor가 보이지 않아야 합니다.
- `/client/live`: source tree 선택 또는 drag/drop, tile start/reconnect/stop, grid,
  density, dock 좌/우 전환, 정보 overlay, workspace 작업 메뉴, copy fallback,
  keyboard focus 이동을 확인합니다.
- `/client/dashboard`: assigned channel, status/event summary, comparison filter,
  sort, copy action이 viewer scope 안에서 동작하는지 확인합니다.
- `/client/request-access`: 요청 제출 후 승인 전 로그인/채널 접근이 열리지 않는다는
  문구가 보이는지 확인합니다.
- 승인된 요청은 invite setup 전 로그인 401, invite setup 후 `/client/live` 접근 200,
  `/ops/home` 접근 403 또는 Access Denied를 확인합니다.
- admin이 client 화면을 보면 `Client Preview as admin` 상태가 명확해야 합니다.

### 반응형·테마

- 320px, 390px, 760px, 1180px에서 `/setup`, `/login`, `/ops/home`,
  `/ops/dashboard`, `/ops/sources`, `/ops/rules`, `/ops/users`, `/ops/events`,
  `/ops/vlm`, `/client/live`, `/client/dashboard`, `/client/events`,
  `/client/request-access`를 확인합니다.
- nav, table row action, form input, select, button text, badge, tile, modal/menu,
  workspace 작업 메뉴가 부모 폭과 viewport를 넘지 않아야 합니다.
- light/dark 전환 후 shell, card, table, form, badge, video tile contrast가 유지됩니다.
- 영상 화면은 video viewport, control, status, overlay가 잘리지 않아야 합니다.
- client/viewer screenshot에는 source URL, Developer URL, raw JSON, debug counter,
  BBox diagnostics, model path/checksum/provenance, auth/session material이 보이면
  안 됩니다.

### 세부 기능과 보조 검사 연결

현재 대상에서 빠뜨리지 않아야 할 세부 기능이다. 버전 이름이 붙은 명령도 현행 회귀 연결이며
삭제하거나 과거 PASS로 대신하지 않는다. 보조 검사 통과는 실제 UI 조작을 대신하지 않는다.

| 기능 | 기능 ID | route | 실제 조작·관측 및 안전 경계 | 보조 검사 |
| --- | --- | --- | --- | --- |
| Operator Event Review Inbox | `UI-014`, `EVT-019`, `EVT-020`, `EVT-021` | `/ops/events` | event list/detail, evidence refs, review status/classification/note, false-positive/action target 저장, primary nav 비노출 | `verify-ops-event-review-inbox`, `verify-vlm-ops-event-review-ui` |
| Event Action and Incident Workflow | `UI-037`, `EVT-037`, `SAFE-041` | `/ops/events` | incident status/id/action target 저장, `incident-action-update` audit trail, EventRecord/Event POST/metadata/media path 불변 확인 | `verify-ops-event-action-incident-workflow`, `verify-ops-audit-trail`, `verify-ops-audit-persistence` |
| Alert Dry-run and Delivery Attempt Log | `UI-038`, `EVT-017`, `EVT-018`, `EVT-038`, `SAFE-042` | `/ops/events` | alert target draft, payload preview, dry-run result, delivery attempt log, endpoint redaction, 외부 전송 없음 확인 | `verify-ops-alert-delivery-integrations`, `verify-ops-client-ui` |
| Client-safe Event and Status Summary | `CLIENT-006`, `CLIENT-007`, `CLIENT-014`, `CLIENT-015`, `CLIENT-022`, `SRC-012`, `EVT-023` | `/client/dashboard`, `/client/live`, `/client/events` | viewer-safe event/status/source health/incident summary, copy text, source URL/Developer URL/raw JSON/debugCounters/BBox diagnostics 비노출 | `verify-client-dashboard-polish`, `verify-v220-client-preview-redaction-review`, `verify-ops-client-ui`, `verify-auth-routes` |
| Rule and Scenario Review Loop | `RULE-041`, `RULE-102`, `EVT-001`, `EVT-026` | `/ops/rules` | 저장 전 예상 event type, conflict, missing reference, scenario preset 영향, `/ops/events` EventRecord coverage link | `verify-rule-ui`, `verify-ops-rules-roundtrip`, `verify-ops-rule-validation-matrix`, `verify-va-event-coverage-report` |
| Semantic Incident Search | `UI-039`, `EVT-041`, `SAFE-045` | `/ops/events` | 검색어 입력, rule/source/incident status/time filter, matched evidence highlight, Ops-only 표시, client/viewer 비노출 | `verify-v250-ops-events-semantic-search-ui`, `verify-ops-client-ui` |
| Incident Timeline Graph | `UI-040`, `EVT-042`, `LAB-065`, `SAFE-046` | `/ops/events` | source state, EventRecord, operator action, alert dry-run, close state node/edge 표시와 source URL/raw/debug/provider material 비노출 | `verify-v250-incident-timeline-graph` |
| Explainable Incident Brief | `UI-041`, `EVT-043`, `LAB-066`, `SAFE-047` | `/ops/events` | action/object/context/environment slot 표시, VLM default-off badge, provider call 없음, client/viewer 비노출 | `verify-v250-explainable-incident-brief` |
| Similar Incident Lookup | `UI-042`, `EVT-044`, `LAB-067`, `SAFE-048` | `/ops/events` | similar incident group, deterministic score, explanation term, source/raw/debug/provider material 비노출 | `verify-v250-similar-incident-lookup` |
| Redacted Incident Evidence Bundle | `UI-043`, `EVT-045`, `LAB-068`, `SAFE-050` | `/ops/events` | raw signed bundle과 별도 `release-safe bundle` 버튼, token 요청, manifest-only/redaction policy, raw evidence/source locator/provider material 제외 | `verify-v250-redacted-incident-evidence-bundle`, `verify-ops-event-records-scope` |
| Incident Triage Board | `UI-050`, `EVT-050`, `LAB-074`, `SAFE-058` | `/ops/events` | Incident Triage Board card, lane filter, priority filter, priority/review-age/event-time sort, source/rule/scenario/similar incident/VLM candidate 표시, client/viewer 비노출 | `verify-v270-incident-triage-board`, `verify-ops-client-ui` |
| Decision scorecard | `UI-051`, `EVT-051`, `LAB-075`, `SAFE-059` | `/ops/events` | Decision Scorecard card, priority reason chips, EventRecord/source health/similar incident/VLM summary/rule candidate/operator review age 표시, raw JSON/source URL/provider material 비노출, client/viewer 비노출 | `verify-v270-incident-decision-scorecard`, `verify-ops-client-ui` |
| Operational Action Pack | `UI-052`, `EVT-052`, `LAB-076`, `SAFE-060` | `/ops/events` | Operational Action Pack card, release-safe bundle, rule draft route, alert dry-run, source health recheck dry-run 표시, 외부 실제 발송/자동 rule write 없음, client/viewer 비노출 | `verify-v270-operational-action-pack`, `verify-ops-client-ui` |
| Rule What-if Preview | `UI-053`, `EVT-053`, `LAB-077`, `SAFE-061` | `/ops/events`, `/ops/rules` | Rule What-if Preview card, selected incident/EventRecord, rule suggestion condition preview, draft comparison, `/ops/rules` draft-only context, full replay/자동 저장/자동 적용 없음, client/viewer 비노출 | `verify-v270-rule-what-if-preview`, `verify-vlm-rule-suggestion-draft-workflow`, `verify-rule-ui`, `verify-ops-client-ui` |
| Operator outcome memory | `UI-054`, `EVT-054`, `LAB-078`, `SAFE-062` | `/ops/events` | Operator Outcome Memory card, accept/dismiss/review-needed outcome count, deterministic history hint, review state/audit action 기반 표시, 새 저장소/자동 학습/EventRecord top-level 변경 없음, client/viewer 비노출 | `verify-v270-operator-outcome-memory`, `verify-vlm-review-action-workflow`, `verify-ops-client-ui` |
| Incident Action Readiness Queue | `UI-055`, `EVT-055`, `LAB-079`, `SAFE-065` | `/ops/events` | Incident Action Readiness Queue card, ready/blocked/field-smoke-needed/not-run count, blockerReasons, fieldSmokeRequired, follow-up 후보, manual approval required, external delivery/auto action write 없음, client/viewer 비노출 | `verify-v280-incident-action-readiness-queue`, `verify-ops-client-ui` |
| Approval-gated Rule Draft Readiness | `UI-056`, `RULE-104`, `EVT-056`, `LAB-080`, `SAFE-066` | `/ops/events`, `/ops/rules` | Approval-gated Rule Draft Readiness card, approvalState, validationSummary, stagedDraft, `/ops/rules` approvalDraft context, no-auto-save/no-auto-apply, full replay 미실행, rule/profile registry 자동 write 없음, client/viewer 비노출 | `verify-v280-approval-gated-rule-draft`, `verify-v270-rule-what-if-preview`, `verify-rule-ui`, `verify-ops-client-ui` |
| Evidence Intake and Field Readiness | `UI-057`, `SRC-032`, `EVT-057`, `LAB-081`, `SAFE-067` | `/ops/events` | Evidence Intake and Field Readiness card, evidenceIntakeStatus/sourceHealthReadiness/fieldSmokeStatus, endpointCredentialRequired, fieldSmokeCredentialStatus, redactedEvidenceBundleStatus, credential/source/raw/debug/provider material 비노출, endpoint/credential 없는 field PASS 없음, client/viewer 비노출 | `verify-v280-evidence-intake-field-readiness`, `verify-v250-redacted-incident-evidence-bundle`, `verify-ops-source-health-bulk`, `verify-ops-client-ui` |
| Runtime Evidence Window | `UI-058`, `EVT-058`, `LAB-082`, `SAFE-068` | `/ops/events` | Runtime Evidence Window card, runtimeEvidencePacket, boundedLocalBuffer/pageSessionOnly, eventWindowMs, runtime/source/event window summary, persistentArchiveCreated false, longrunSubstitute false, 30분/120분 PASS claim 없음, client/viewer 비노출 | `verify-v280-runtime-evidence-window`, `verify-v260-runtime-dashboard-trends`, `verify-ops-client-ui` |
| Client-safe Follow-up Digest | `CLIENT-024`, `SAFE-069` | `/client/live`, `/client/dashboard`, `/client/events` | Client-safe Follow-up Digest card, `followUpDigest`, `media-server.client.follow-up-digest.v1`, followUpStatus/severity/time만 표시, source/raw/debug/provider/rule editor/action control 비노출, viewer PublishedView scope 유지 | `verify-v280-client-safe-followup-digest`, `verify-v250-client-safe-incident-digest`, `verify-ops-client-ui` |
| Client-safe Event Digest | `CLIENT-025`, `SAFE-096` | `/client/live`, `/client/dashboard`, `/client/events` | Client-safe Event Digest card, `eventDigest`, `media-server.client.event-digest.v1`, summaryText/eventType/status/severity/timelineHint/time만 표시, source/raw/debug/provider/feature provenance/encoded clip path/rule editor/action control 비노출, viewer PublishedView scope 유지 | `verify-v310-client-safe-event-digest`, `verify-v250-client-safe-incident-digest`, `verify-v280-client-safe-followup-digest`, `verify-ops-client-ui` |
| Operator Feature Correction | `UI-061`, `EVT-061`, `SAFE-098`, `OPS-065` | `/ops/events` | Operator Feature Correction card, event review row의 correctedFeatureLabel/featureAliases/reanalysisRequested/reanalysisReason controls, 기존 review 저장 버튼 반영, audit `operator-feature-correction-update`, EventRecord/Event POST/WebRTC/SSE/WS/media path/client viewer 노출 변경 없음 | `verify-v310-operator-feature-correction`, `verify-ops-client-ui` |
| Unified Ops Events Workspace | `UI-062`, `EVT-064`, `SAFE-104`, `OPS-071` | `/ops/events` | Resolution queue/detail/timeline workspace, resolution status/reason context, timeline row/detail 전환, client/viewer 비노출, source URL/raw JSON/debug material 비노출 | `verify-v320-unified-ops-events-workspace`, `verify-ops-client-ui` |
| Evidence Quality Layer | `UI-063`, `EVT-065`, `SAFE-105`, `OPS-072` | `/ops/events` | Evidence Quality card, completeness/confidence/replay coverage hint, evidence 상태 badge, 부족 evidence hint 표시, client/viewer 비노출, raw evidence/source/debug/provider material 비노출 | `verify-v320-evidence-quality-layer`, `verify-ops-client-ui` |
| Source Reliability Context | `UI-064`, `EVT-066`, `SAFE-106`, `OPS-073` | `/ops/events` | Source Reliability card, source health/recent failure/operator recheck hint, 개별 EventRecord sourceReliability 표시, 재확인 hint가 자동 action이나 external call을 만들지 않음, client/viewer 비노출 | `verify-v320-source-reliability-context`, `verify-v320-source-reliability-runtime-sample`, `verify-ops-client-ui` |
| AI Review Quality Context | `UI-065`, `EVT-067`, `SAFE-107`, `OPS-074` | `/ops/events` | AI Review Quality card, correction/review signal, uncertainty reason, quality badge, provider-free boundary 표시, raw provider response/model provenance/source URL/debug material 비노출 | `verify-v320-ai-review-quality-context`, `verify-ops-client-ui` |
| Operator Resolution Flow | `UI-066`, `EVT-068`, `SAFE-108`, `OPS-075` | `/ops/events` | Operator Resolution Flow controls, assign/note/close/reopen 조작, 저장 후 detail/timeline 상태 반영, `operator-resolution-flow-update` audit 확인, Ops-only boundary와 client/viewer 비노출 | `verify-v320-operator-resolution-flow`, `verify-ops-client-ui` |
| Action Readiness Checklist | `UI-067`, `EVT-069`, `SAFE-109`, `OPS-076` | `/ops/events` | Action Readiness Checklist card, rule draft/evidence bundle/notification readiness 상태, manual approval required 표시, 자동 rule write/external delivery 없음, client/viewer 비노출 | `verify-v320-action-readiness-checklist`, `verify-ops-client-ui` |
| Client-safe Resolution Digest | `UI-068`, `CLIENT-027`, `SAFE-110`, `OPS-077` | `/client/live`, `/client/dashboard`, `/client/events` | Client-safe Resolution Digest card, `resolutionDigest`, `media-server.client.resolution-digest.v1`, resolutionStatus/resolutionLabel/summaryText/severity/timelineHint/time만 표시, source/raw/debug/provider/feature provenance/internal evidence/operator note/rule editor/action control 비노출, viewer PublishedView scope 유지 | `verify-v320-client-safe-resolution-digest`, `verify-v310-client-safe-event-digest`, `verify-ops-client-ui` |
| Resolution Search & Metrics | `UI-069`, `EVT-070`, `SAFE-111`, `OPS-078` | `/ops/events` | Resolution Search & Metrics controls, active resolution filters, saved view preset 표시, operations metric summary, 검색/필터 변경 후 queue/detail 반영, saved view write 없음, client/viewer 비노출 | `verify-v320-resolution-search-metrics`, `verify-ops-client-ui` |
| Client-safe Source Status Digest | `UI-072`, `CLIENT-028`, `SRC-038`, `SAFE-119`, `OPS-086` | `/client/live`, `/client/dashboard`, `/client/events` | Client-safe Source Status Digest card, `sourceStatusDigest`, `media-server.client.source-status-digest.v1`, sourceStatus/connectionStatus/videoFrameStatus/metadataStatus/summaryText/severity/timelineHint만 표시, source URL/raw locator/raw JSON/debug/credential/operator material/rule editor/action control 비노출, viewer PublishedView scope 유지 | `verify-v330-client-safe-source-status-digest`, `verify-v320-client-safe-resolution-digest`, `verify-ops-client-ui` |
| Ops Continuity Drill Workspace UI | `UI-075`, `SAFE-129`, `OPS-096` | `/ops/sources` | `Ops Continuity Drill Workspace`, `source-continuity-drill-status`, `media-server.ops.v340-continuity-drill-workspace-ui.v1`, drill package/validation status/blocked-ready/source health drift 표시, source URL/raw locator/raw JSON/debug/credential material 비노출, 자동 recovery/source registry write 없음 | `verify-v340-ops-continuity-drill-workspace-ui`, `verify-ops-client-ui` |
| Approval-Gated Recovery Checklist and Audit | `UI-076`, `SAFE-130`, `OPS-097` | `/ops/sources` | `Approval-Gated Recovery Checklist`, `source-recovery-checklist-status`, `media-server.ops.v340-approval-gated-recovery-checklist.v1`, operator note, ready/blocked/field-smoke-needed/not-run 상태, dry-run result, Ops audit link 표시, source URL/raw locator/raw JSON/debug/credential material 비노출, 자동 recovery/source registry write 없음 | `verify-v340-approval-gated-recovery-checklist-audit`, `verify-ops-client-ui` |
| Client-safe Maintenance Digest | `UI-077`, `CLIENT-029`, `SAFE-131`, `OPS-098` | `/client/live`, `/client/dashboard`, `/client/events` | `Client-safe Maintenance Digest`, `media-server.client.v340-maintenance-digest.v1`, maintenance/recovering/unavailable viewer-safe digest 표시, source URL/raw locator/raw JSON/debug/credential material/operator note/Ops audit/dry-run/recovery action 비노출 | `verify-v340-client-safe-maintenance-digest`, `verify-ops-client-ui` |
| Drill Evidence Export and Cleanup Manifest | `UI-078`, `SAFE-132`, `OPS-099` | `/ops/sources` | `Drill Evidence Export and Cleanup Manifest`, `media-server.ops.v340-drill-evidence-export-cleanup-manifest.v1`, redacted drill artifact manifest, minimum retained evidence, /tmp cleanup manifest, sensitive material scan boundary 표시, source URL/raw locator/raw JSON/debug/credential material/raw audit body 비노출, cleanup 실행 없음 | `verify-v340-drill-evidence-export-cleanup-manifest`, `verify-ops-client-ui` |
| Field Bridge Condition Gates | `UI-079`, `SRC-043`, `MEDIA-022`, `LAB-091`, `SAFE-133`, `OPS-100` | `/ops/sources` | `Field Bridge Condition Gates`, `media-server.ops.v340-field-bridge-condition-gates.v1`, ONVIF 실기기/external WHEP-TURN/real cloud-VLM provider 조건 gate, endpoint/credential/approval 필요, source-only PASS accepted false, fieldSmokeExecuted false, endpoint URL/raw locator/raw JSON/debug/credential/provider material 비노출 | `verify-v340-field-bridge-condition-gates`, `verify-ops-client-ui` |
| Incident Memory Productization | `UI-045`, `EVT-046`, `LAB-069`, `SAFE-052` | `/ops/events` | VLM summary candidate review card, Ops-only manual review 상태, client/viewer 비노출 | `verify-v260-incident-memory-productization`, `verify-ops-client-ui` |
| Rule Suggestion Review | `UI-046`, `EVT-047`, `LAB-070`, `SAFE-053` | `/ops/events`, `/ops/rules` | incident-to-rule card, draft-only 링크, 수동 저장 전 registry write 없음, client/viewer 비노출 | `verify-v260-rule-suggestion-review`, `verify-vlm-rule-suggestion-draft-workflow` |
| ONVIF Credential Gate | `UI-047`, `SRC-031`, `LAB-071`, `SAFE-054` | `/ops/sources` | credential gate panel, URL credential reject, redacted credentialGate summary, source:write guard | `verify-v260-onvif-credential-gate`, `verify-onvif-import-draft-api` |
| Runtime Dashboard Trends | `UI-048`, `EVT-048`, `LAB-072`, `SAFE-055` | `/ops/dashboard` | page-session-only trend card, sparkline 상태, longrun evidence 아님 표시, client/viewer 비노출 | `verify-v260-runtime-dashboard-trends`, `verify-va-runtime-console` |
| Scenario Cross-zone Re-entry | `UI-049`, `RULE-103`, `EVT-049`, `LAB-073`, `SAFE-056` | `/ops/rules` | configured-zones A->B candidate option, source/destination zone 표시, 기존 event type/schema 유지 | `verify-v260-scenario-cross-zone-reentry`, `verify-va-replay` |
| 운영 제어·안내 | `UI-080`~`UI-087`, `CLIENT-031`~`CLIENT-032` | /ops, /client/live, /client/dashboard, /client/events | live graph/command/staged/drill/export/field/VLM explanation, client-safe notice/impact | inventory의 `verify-v350-*` 개별 명령 |
| 운영 시뮬레이션 | `UI-088`~`UI-094` | /ops | input/run/diff/safe-apply/export/field/default-off | inventory의 `verify-v360-*` 개별 명령 |
| site·runbook | `UI-095`~`UI-101`, `CLIENT-037`~`CLIENT-039` | /ops, /client/live, /client/dashboard, /client/events | site/source group, runbook/approval, notice, rule/VA what-if, field evidence, limited pilot, outcome/export | inventory의 `verify-v370-*` 개별 명령 |
| action 승인·결과 | `UI-102`~`UI-107`, `CLIENT-040`~`CLIENT-042` | /ops, /client/live, /client/dashboard, /client/events | action workspace, notice preview, approval/readiness/receipt/default-off | inventory의 `verify-v380-*` 개별 명령 |

VLM은 [런타임 UI](vlm-runtime-status-ui.md), [이벤트 리뷰 UI](vlm-ops-event-review-ui.md)와
결과 템플릿의 `UI-022`~`UI-032`, `SAFE-031`을 확인한다. 모델 다운로드·provider 호출·
외부 전송은 UI 선택/저장만으로 승인되거나 실행됐다고 하지 않는다.

## 종료

- baseline 424개와 녹화 8개 모든 action을 분리 집계하고 실패→수정→재검수 연결을 보존한다.
- Policy v4 시각·권한·비노출·접근성, VA EventRecord와 실제 보존 artifact를 확인한다.
- 필요한 정제 증거를 보존한 뒤 소유 server/PID·port·임시 경로를 정리하고 부재를 확인한다.
  cleanup 실패·미확인은 완료 blocker다. 원출력·exit나 누락 결과를 추정 복원하지 않는다.
- `./server.sh verify-manual-ui-evidence --result <result.md>`로 결과 구조·집계를,
  `./server.sh verify-ui-fulltest-evidence-policy-v4 --summary <summary.json>`로 자동화 적격을 확인한다.
  구조 검사 exit 0과 `policyValidationResult`는 `uiFulltestPass`가 아니다.
- `./server.sh verify-v220-ui-evidence-closeout`는 정의 연결만 확인한다.
  미실행·승인 제외를 별도 기록하고 전체 suite 미충족을 숨기지 않는다.
  커밋·푸시는 별도 승인 없이 수행하지 않는다.
