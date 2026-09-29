# UI 풀테스트 기준

이 문서는 실제 제품 UI 실행의 합격 기준이다. 실행 순서는 [체크리스트](manual-ui-checklist.md),
기록 형식은 [결과 템플릿](manual-ui-result-template.md), 기능별 대상·기대값은
[기능 테스트 정의](project-feature-test-inventory.md)를 따른다.
소스 버전은 [VERSION](../VERSION), 실행 source는 commit·worktree diff·build hash로 기록한다.
공개 릴리즈 관측이나 과거 실행 결과를 검토 없이 현재 소스의 PASS로 이월하지 않는다.
기존 증거의 유효성은 diff·source·환경·검증 경계로 판단한다.

현재 대상은 baseline **424개 + 녹화 8개 = 432개 ID**다.
baseline은 `test/fixtures/project_feature_implementation_evidence.json`의 UI 대상
`manualUiCaseId`, `uiEvidence.screenRoute`, product UI anchor와 inventory를 대조한다.
녹화는 `V410-S06-I27`~`V410-S06-I34`의 31개 action을 별도로 실행한다.
기존 canonical/native manifest와 Policy v4 qualifier의 424개 범위는 바꾸지 않는다.
432는 ID 수이며 action 수가 아니다. baseline qualifier만으로 전체 432개 PASS를 선언하지 않는다.
auth-off `--ui-direct` 준비·정리 fixture는 실제 UI action이나 역할 검증 증거가 아니다.

## Policy v4 증거 적격 기준

유지보수 참고: [시각 기준 승인 템플릿](ui-visual-release-baseline-approval-template.md),
[정확한 UI ID의 자동화 연결표](v390-ui-automation-coverage-matrix.md).
연결표의 준비/과거 상태는 이번 실제 UI 실행 결과가 아니다.

Policy v4는 UI 영역 안의 `direct-browser`, `qualified-native-automation`, `hybrid` 구분이다.
도구 이름이 아니라 실제 evidence로 판단한다. 개별 자동화 대체는 아래 조건을 모두 만족해야 한다.

1. 실제 제품 브라우저 실행이어야 한다. fixture, one-shot wrapper, static smoke, API/raw JSON-only, screenshot-only, source/script/hidden marker 판정은 불가다.
2. project implementation evidence의 exact test ID/route/control/action과 requested/observed role·scope, viewport, theme가 일치해야 한다.
3. 신뢰된 visible/enabled control을 실제 조작하고 DOM 전이, network response+DOM, persisted state readback, EventRecord, server log 중 하나 이상의 상관된 completion oracle로 반영을 확인한다. 기존 동일 문자열만으로 PASS하지 않는다.
4. exact-selector visible assertion, screenshot, trace, browser console, server log, 지원 시 실제 video, adapter/browser/version provenance, source/policy/manifest/runner fingerprint, 실행 시각·재현 명령을 보존한다.
5. 허용 run root 안 artifact의 hash/type/path containment·redaction을 통과해야 한다. placeholder video, 경로 escape, hash 불일치, credential/session/token/viewer source URL/raw debug material 노출은 FAIL이다.
6. fallback을 공개하고 manualIntervention=false, failed interaction 0, unapproved console error/warning 0, server/port/temp cleanup PASS여야 한다.
7. video viewport, VA overlay, crop, clipping, contrast, focus, accessibility는 명시적 visual/geometry evidence(`compare-ui-visual-baseline` 등)와 reviewRequired 해소 또는 direct evidence를 결합한 hybrid가 필요하다.

전체 PASS는 개별 대체 적격과 별개다. 현재 release exact ID 전수가 direct-pass 또는 automation-equivalent-pass,
fail/notRun/unsupported/unapproved exclusion/manual intervention 0이어야 한다.
반응형 320/390/760/1180, light/dark, role/scope guard, client/viewer redaction, video/overlay,
시각 품질·accessibility 교차 항목이 모두 닫혀야 한다. VA rule/scenario는 EventRecord 발생 이력도 확인한다.
부분 자동화·coverage mapping·replay·Policy contract PASS로 suite PASS를 만들지 않는다.
기계 기준은 `test/fixtures/ui_fulltest_evidence_policy_v4.json`과
`./server.sh verify-ui-fulltest-evidence-policy-v4`다. policyValidationResult와 uiFulltestPass를 분리한다.
fixture/verifier는 이 정책을 완화하지 않으며 historical evidence를 현재 PASS로 소급 승격하지 않는다.

## 판정과 실행 승인

UI 풀테스트 판정값은 `PASS`와 `FAIL`만 사용한다. 실제 조작·completion oracle·관련 로그 또는
이벤트 이력이 모두 있어야 개별 기능 PASS다. 카테고리 묶음 판정은 금지한다.
준비 중이거나 시작하지 않은 대상은 미실행으로 기록하고, 완료 판정에서 PASS로 세지 않는다.
사용자 승인 제외는 판정표 밖 제외 기록에 사유·후속 조건을 남긴다. 제외로 원래 전체 suite가
충족됐다고 하지 않으며 필수 미실행·FAIL·미확인은 [릴리즈 정책](release-policy.md)의 blocker다.

| 영역 | 역할과 실행 경계 |
| --- | --- |
| 안정화 | 변경 영향에 맞는 focused·회귀와 긴 실행의 선수 조건 확인. 실패한 선행 조건을 건너뛰지 않는다. |
| 30분 | `verify-predev --soak-minutes 30`. 버전 완료 필수 증거지만 별도 실행 승인을 확인한다. |
| 120분 | `verify-predev --soak-minutes 120`, `verify-va-runtime-console-longrun --duration-minutes 120`. 사용자 지시·gate·기능 매핑·미디어/수명 변화·메모리 릭/누수/drift 신호로 필요성을 판단하고 별도 승인을 받는다. |
| UI | 실제 브라우저 exact case, 권한·반응형·시각 품질. 위 스크립트·장시간 결과와 서로 대체하지 않는다. |

명령의 상세와 실패 시 처리는 [검증 정책](stream-verification.md#검증-정책),
승인·기록 수명은 [AGENTS](../AGENTS.md)를 따른다. 이 문서나 fixture는 실행 권한을 부여하지 않는다.

## 시작·중단·재검수

1. 현재 inventory와 baseline manifest의 ID/route/control/action 및 추가 녹화 action을 맞춘다.
   종료된 backlog나 과거 버전의 완료 제목은 시작 조건이 아니다.
2. Auth 환경, 소유 데이터·포트·artifact root, VA seed, 실제 브라우저 권한,
   `verify-product-ui-no-native-dialogs`와 `verify-ui-blocking-dialog-policy`를 확인한다.
3. 시작 조건 실패는 아직 실행하지 않은 긴 테스트의 제품 실패로 기록하지 않는다.
   최초 명령·exit·관측값을 보존하고 승인 범위 안 원인만 수정한다.
4. runtime/media/auth/session/registry 변경은 영향받은 실행과 증거를 재평가한다.
   경로·기록 정정만으로 무관한 120분/UI 결과를 자동 폐기하지 않지만, 실제 증거가 없으면 미확인이다.
5. 원출력과 실패→재검수 연결을 보존한 후 소유 PID·포트·임시 경로만 정리하고 부재를 확인한다.
   cleanup 실패·미확인은 완료 blocker이며 후속 실행으로 덮지 않는다.

## 데이터와 계정 격리

운영 원본이 아닌 throwaway 상태에서 `MEDIA_SERVER_AUTH_MODE=auto`로 실행한다.
`MEDIA_SERVER_AUTH_USERS_FILE`, `MEDIA_SERVER_SOURCE_REGISTRY`, `MEDIA_SERVER_PUBLISHED_VIEWS`,
`MEDIA_SERVER_ANALYSIS_REGISTRY`, `MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH`,
`MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR`, `MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR`,
`MEDIA_SERVER_RECORDING_STORAGE_ROOT`와 audit 경로를 소유 실행 root 안으로 격리한다.
Auth/registry는 JSON, audit/EventRecord는 JSON Lines, snapshot/clip/녹화는 해당 파일 저장소다.
녹화 off여도 시작 복구가 저장소를 변경할 수 있으므로 운영 원본·보존본을 참조하지 않는다.
세부 설정은 [설정 참조](config-reference.md), 복구 경계는 [백업 안내](ops-backup-recovery.md)를 따른다.

`/setup`으로 관리자 준비 및 테스트 계정 역할/scope를 확인한다. 비밀번호·초대 token·session cookie·
자동 생성 비밀번호 제안은 증거에 남기지 않는다. 테스트 비밀번호 환경변수와 VA seed 절차는
[체크리스트](manual-ui-checklist.md#준비)를 따른다.

## 실제 조작과 권한

인앱 브라우저 direct evidence가 기본이다. Playwright/Selenium/Chrome-CDP actual runner도
Policy v4를 충족하면 exact case 대체가 가능하다. fallback 자체가 자동 PASS/FAIL 사유는 아니지만
engine/version·fallback·provenance를 숨기지 않는다. DOM으로 video/overlay/crop을 판정하기
어려우면 실제 visual evidence를 결합한다. 사용자 pane attach/클릭/OS 팝업 개입은
`manualIntervention`으로 기록하며 clean automation PASS로 처리하지 않는다.

- 조작: nav/tab/button/menu/details, textbox/textarea/password,
  select/checkbox/toggle/segmented control, copy/export/preview/play/stop/reconnect.
- 권한: admin/operator/viewer/integrator와 미인증·pending·invite 전후의 role/scope를 각각 확인한다.
- 위험 action: native alert/confirm/prompt가 아니라 제품 화면 안 2회 확인을 쓴다.
  첫 클릭에는 write POST가 없고, 두 번째 클릭 뒤 의도한 상태·감사 이력만 바뀌어야 한다.
- Ops primary nav는 Home/Dashboard/Channels/Rules/Users/Client Preview다. Users는 admin,
  `/ops/events`는 직접 진단 route 또는 Dashboard 내부 섹션이다.
- Client nav는 Live/Dashboard이고 `/client/events`는 primary nav가 아니다.
  viewer의 Ops/Lab 접근을 거부하고 admin에는 `Client Preview as admin`을 표시한다.
- client/viewer에 source URL, Developer URL, raw JSON, debug counter/BBox diagnostics,
  rule/profile editor, model/source/auth/session material, Ops/Lab primary navigation을 노출하지 않는다.

현재 route별 control과 기대값은 [실행 체크리스트](manual-ui-checklist.md#화면별-실행)와
[UI 안내](ui-guide.md)에 둔다. 실제로 열지 않은 화면·누르지 않은 기능·미적격 smoke만 있는
기능은 완료 PASS가 아니다. 실제 화면·selector·전후 상태·artifact를 기능 ID별로 기록한다.

## Auth와 VA의 독립 결과

비밀번호 변경은 실행 초기 임시 비밀번호→다른 강한 임시 비밀번호→로그인 확인으로 실행한다.
`MEDIA_SERVER_AUTH_PASSWORD_HISTORY_COUNT` 기본값 5 때문에 즉시 원래 비밀번호 재사용은
거부돼야 한다. 격리 계정은 검사 후 정리하며 복원이 기본 의무는 아니다.
복원 동작도 검증한다면 history 밖으로 밀릴 만큼 서로 다른 비밀번호를 거친다.
관리자 reset은 history 우회가 아니다. 변경 성공·즉시 재사용 거부·최종 로그인·이전 임시
비밀번호 거부·잠금 해제를 각각 확인한다.

Rule/Profile CRUD는 EventRecord 발생 증거가 아니다. seed fixture
`test/fixtures/manual_ui_fulltest_va_seed_matrix.json`의 계정·tracker/Re-ID 조합·방향별 event
template·scenario preset·vaRule을 개별 확인한다. invalid `none + assist`도 별도 결과다.
최종 enabled rule/template을 유지하고 `/ops/events`의 visible row·filter·pagination·archive와
EventRecord active JSON Lines/`includeArchives=1` 응답을 대조한다.
`eventType`, `metadata.ruleId`, zoneId/lineId/scenarioName을 연결한다.

`presence`, `enter`, `exit`, `line-crossing:any`, `line-crossing:forward`,
`line-crossing:reverse`, `intrusion-dwell`, `re-entry`, `wrong-direction`,
`intrusion-after-line-crossing`, `loitering`, `zone-occupancy`는 각각 결과 행을 남긴다.
최종 enabled 항목 하나라도 발생 이력이 없으면 VA coverage는 PASS가 아니다.
sample 영상·preview 재생만으로 모든 scenario가 발생했다고 하지 않는다.

## 시각 품질과 반응형

320px/390px/760px/1180px viewport 각각 light/dark theme에서 확인한다.
텍스트·표·행 action·form·badge·tile·modal/menu가 겹치거나 잘리지 않아야 하며
hover/focus/selected/disabled/loading/error/empty 상태, 대비와 접근성을 확인한다.
영상은 전체 video viewport·control·timeline·status·VA overlay를 보존하고 과도한 축소나
screenshot-only 판정을 피한다. 명시적 visual/geometry artifact와 필요한 리뷰를 남긴다.

## 실행 도구와 결과 해석

`./server.sh verify-manual-ui-evidence`는 현행 문서·mapping 정합 검사다.
`--result <result.md>`를 추가하면 결과의 baseline 424개·녹화 8개/31 action,
집계·VA seed/EventRecord·보존 경로를 검사한다. 구조가 유효한 FAIL 기록은 보존할 수 있다.
명령 exit 0은 UI 실행 PASS가 아니며 실제 artifact/권한/시각 검토나 Policy v4 qualifier를 대신하지 않는다.
`./server.sh verify-v220-ui-evidence-closeout`도 현행 정의 연결 검사일 뿐이다.

`./server.sh verify-ui-fulltest-one-shot`은 승인 후 격리 core/auth 서버를 실행하는
보조 wrapper다. dialog guard, inventory coverage, screenshot/Rules/route/table smoke,
core/auth click E2E를 묶어 summary.json/summary.md를 남긴다. 장시간 명령은 실행하지 않는다.
`--manual-result <result.md>`가 없으면 결과 구조 검사는 skip이며 UI PASS가 아니다.

| wrapper 필드 | 의미 |
| --- | --- |
| `wrapperResult` | wrapper 자체 결과 |
| `resultScope` | `wrapper-only` |
| `uiFulltestEvidenceStatus` | evidence 제공 여부. 제공만으로 실제 PASS 아님 |
| `manualResultStatus` | provided/skip/not-provided 상태 |
| `longrunStatus` | `not-run-by-this-wrapper` |

Auth/미디어·실제 UI·장시간은 별도 실행 범위를 따른다. 보조 명령은
`verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`,
`verify-ops-client-ui`/`--screenshots`, `verify-ops-click-e2e`/`--auth-ui-flow`,
`verify-rule-ui` 등이며 정확한 옵션은 [검증 명령](stream-verification.md)을 따른다.
VLM의 default-off/privacy·profile 저장/후보 선택과 실제 provider 호출은 구별하고,
[관련 안정화 기준](vlm-stabilization-longrun-ui-criteria.md)에 따라 UI·장시간을 각각 판단한다.

결과는 실행 단위 한 곳에 명령·source/환경·UTC·exit·stdout/stderr·개별 결과·실패 연결·cleanup을
남기고 다른 문서는 링크한다. token usage source/start/end/consumed·elapsed는 측정값만 쓰며
없으면 미집계 사유를 남긴다. 커밋·푸시 가능 여부와 실제 수행을 구분한다.
