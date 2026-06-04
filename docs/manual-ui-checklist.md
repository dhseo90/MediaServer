# Manual UI Checklist

이 문서는 앞으로 "UI 풀테스트"라고 부르는 작업의 실행 체크리스트입니다.
기준 정의와 범위는 [manual-ui-fulltest.md](./manual-ui-fulltest.md)를
source-of-truth로 삼고, 기능별 UI 필요 여부와 테스트 영역은
[project-feature-test-inventory.md](./project-feature-test-inventory.md)를 기준으로
합니다. 결과 기록은 [manual-ui-result-template.md](./manual-ui-result-template.md)를
사용합니다. 최신 공개 release 기준은 `v2.1.0`이며, 현재 작업 브랜치의 UI 문서
기준은 `v2.2.0 Responsive UI Foundation`입니다. UI 풀테스트 기준은 해당 작업
범위에 포함된 제품 route, 권한, 기능 baseline만 대상으로 합니다.
현재 release 목표는 `v2.1.0`이라는 gate 문구는 최신 공개 release baseline을
뜻하며, v2.2.0 브랜치의 UI 재배치 작업 완료나 UI 풀테스트 PASS를 뜻하지 않습니다.
문서 구조와 evidence 경계는 `./server.sh verify-manual-ui-evidence`로 확인합니다.
현재 제품 UI 직접 조작 evidence 없이 완료 판정에 포함하지 않습니다.
전용 throwaway 서버부터 core/auth 클릭 검증까지 한 번에 실행해야 할 때는
`./server.sh verify-ui-fulltest-one-shot --output-dir <dir>`을 사용합니다.
이 wrapper는 UI 풀테스트 선수/보조 verifier 묶음만 실행하며 30분/120분 장시간
테스트는 실행하지 않습니다.

UI 풀테스트는 자동 smoke나 raw JSON 확인이 아니라, 인앱 브라우저에서 제품
화면을 직접 열고 클릭과 타이핑으로 수행하는 end-to-end 검수입니다. API-only
확인, screenshot 생성만 있는 항목, 열지 않은 화면은 `FAIL`입니다.
스크립트 테스트, 30분 안정화, 120분 장시간 테스트는
[stream-verification.md](./stream-verification.md)의 별도 영역입니다. UI 풀테스트와
스크립트 안정화 테스트는 서로 대체하지 않으며 결과 문서에서 판정을 분리합니다.
안정화 테스트는 30분/120분/UI 테스트의 선수 테스트이며, 로드맵 각 스텝 종료 시
수행합니다. 30분 테스트는 장기간 테스트 지시의 기본값이고 버전 로드맵 완료 시
수행합니다. 120분 테스트는 메모리 릭/장시간 누수 감시가 필요할 때 사용자에게
먼저 말한 뒤 수행합니다. UI 풀테스트도 버전 로드맵 완료 시 수행합니다.

## 1. 사전 파악

- 프로젝트 내 문서를 먼저 훑어 현재 release, 제품 경계, UI route, 비노출
  정책, 검증 명령을 파악합니다.
- 최소 확인 문서:
  - [README.md](../README.md)
  - [docs/README.md](./README.md)
  - [ui-guide.md](./ui-guide.md)
  - [development-guide.md](./development-guide.md)
  - [stream-verification.md](./stream-verification.md)
  - [config-reference.md](./config-reference.md)
  - [project-feature-test-inventory.md](./project-feature-test-inventory.md)
  - [manual-ui-fulltest.md](./manual-ui-fulltest.md)
  - [manual-ui-result-template.md](./manual-ui-result-template.md)
- 기능 설명이 있는 문서에 나온 웹 UI 흐름은 모두 검수 후보로 적습니다. 문서에
  나온 기능을 열지 못하면 해당 개별 기능은 `FAIL`입니다.
- 사용자가 실기기 없음, 외부 credential 없음, 현재 scope 밖 같은 이유로 명시 제외한
  항목은 UI 풀테스트 기준에서 제외하고 별도 `제외 기록`에만 남깁니다.
- 기능 단위 누락을 막기 위해 [project-feature-test-inventory.md](./project-feature-test-inventory.md)의
  ID별 `UI 필요`와 `테스트 영역`을 먼저 확인합니다. 이 inventory는 실행 evidence가
  아니므로, 행이 있다는 이유만으로 완료 처리하지 않습니다.
- 현재 scope 밖 기능, release 비범위, 실장비/외부 credential이 필요한 흐름은
  임의로 확장하지 않습니다.

## 2. 데이터 리셋과 서버 준비

- 운영 데이터가 아닌 throwaway fixture만 사용합니다.
- 서버는 검증 전용 포트와 임시 users/source/view/analysis/event 경로로 띄웁니다.
- 현재 제품 baseline은 내부 DB가 아니라 파일 기반 throwaway state를 사용합니다.
  검수 run에는 users JSON, source registry JSON, published views JSON,
  analysis registry JSON, EventRecord JSON Lines, snapshot/clip 디렉터리 경로를
  기록합니다.
- auth on 검증은 `MEDIA_SERVER_AUTH_MODE=auto`에서 admin을 직접 생성합니다.
- VA seed는 [project-feature-test-inventory.md](./project-feature-test-inventory.md)의
  `VA Manual UI Seed Matrix`와
  `test/fixtures/manual_ui_fulltest_va_seed_matrix.json`을 기준으로 준비합니다.
  이 seed는 Rule/Profile/Scenario CRUD 검수와 최종 event log 육안 확인을 분리하기
  위한 throwaway 기준이며, 서버에 적용하고 브라우저로 확인하기 전에는 evidence가
  아닙니다.
- 실제 서버 적용 전에는 `./server.sh prepare-manual-ui-fulltest-seed --dry-run`으로
  numeric ID, API payload 참조, tracker/Re-ID, scenario/preset coverage, media file
  존재를 확인합니다. 이 dry-run은 HTTP 요청 0건인 준비 검증이며 UI/event PASS
  evidence가 아닙니다.
- 외부 확인 서버나 수동 UI 테스트용 throwaway 디렉터리는
  `./server.sh prepare-manual-ui-fulltest-seed --dry-run --emit-registry-dir <dir>`로
  `sources.json`, `views.json`, `analysis.json`, `preconditions.json`을 한 디렉터리에
  생성합니다. auth users file은 비밀번호 hash가 필요하므로 실행자가 지정한
  비밀번호로 별도 생성하고, seed 스크립트가 기본 비밀번호를 만들지 않습니다.
- `./server.sh verify-ui-fulltest-one-shot`은 core/auth용 registry 디렉터리와
  event/snapshot/clip 경로를 output dir 아래에 직접 만들고, `--http-base`,
  `MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT`, `--auth-users-file`을 각 verifier에
  명시해 현재 PublishedView/Rule seed를 기준으로 실행합니다.
  `--manual-result <result.md>`를 지정하면 기존 manual result 문서 구조까지 함께
  검증합니다. manual result 구조 검증은 opt-in이며, manual result를 지정하지 않으면
  해당 step은 skip됩니다. helper PASS는 full UI 풀테스트 PASS가 아닙니다.
  auth UI flow를 포함하므로 아래 환경변수는 실행자가 직접 지정해야 합니다.
  - `MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD`
  - `MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD`
  - `MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD`
  - `MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE`
  - `MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO`
- seed를 서버에 넣는 동작은 실제 테스트 지시 후에만
  `./server.sh prepare-manual-ui-fulltest-seed --apply --confirm-throwaway-data --http-base <url>`
  형태로 수행합니다.
- Rule/Profile/Channel 추가·수정·삭제 검수 뒤에는 모든 basic event, scenario,
  preset, tracker/Re-ID 개별 조합이 남아 있는 최종 상태를 유지하고 event log를
  각 기능별로 확인합니다.
- VLM 검수는 `/ops/vlm`의 model install readiness, missing-model, cloud-disabled,
  provider timeout 안내, privacy transfer guard, profile activation/fallback/disable/delete,
  raw details 접힘 영역을 직접 조작합니다. `/ops/events`의 VLM review detail은
  EventRecord evidence와 함께 확인하고, `/client/live`, `/client/dashboard`,
  `/client/events`에서 VLM model/prompt/raw response/provider/internal review card가
  보이지 않는지 확인합니다.
- four-stage mapping은 [project-feature-test-inventory.md](./project-feature-test-inventory.md)의
  `Four-Stage Coverage Mapping`을 기준으로 확인합니다. 이 mapping은 실행 결과가 아니라
  안정화/30분/120분/UI 풀테스트에 포함할 대상을 빠뜨리지 않기 위한 기준입니다.
- destructive action은 throwaway 계정, 채널, 접근 요청으로만 수행합니다.
- UI smoke 전용 HTML selector 검증은 필요 시 별도 서버에서
  `./server.sh verify-ops-client-ui --screenshots`로 실행하되, 이 결과만으로
  수동 UI 풀테스트 완료라고 쓰지 않습니다.
- plaintext password, invite token 원문, session cookie, generated password
  suggestion은 결과 문서나 screenshot에 남기지 않습니다.
- Browser Use clipboard 오류는 [browser-use-clipboard-diagnostics.md](./browser-use-clipboard-diagnostics.md)
  기준으로 제품 회귀와 환경 문제를 분리합니다.
- Browser/Computer Use fallback은 Browser Use 직접 조작, Chrome 직접 조작,
  Computer Use visible UI 조작 순서로 시도하고 실패 지점과 대체 smoke를 분리해
  기록합니다. raw JSON/API-only 확인은 수동 UI 클릭 evidence로 쓰지 않습니다.

### 긴 테스트 시작 조건 확인

아래 항목이 하나라도 비어 있으면 30분, 120분, UI 풀테스트를 시작하지 않습니다.

- 기능/route/control/action mapping: `Four-Stage Coverage Mapping`,
  `Four-Stage Start Conditions`, `/ops/vlm`, `/client/events`, VLM client redaction.
- auth/env: auth verifier password env 5개가 `SET`인지, users file과 session state가
  throwaway인지 확인합니다.
- fixture/output: source/view/analysis/event/snapshot/clip 경로, seed dry-run 결과,
  output dir, summary/report/log/evidence JSON 경로를 시작 전에 고정합니다.
- UI blocker: native dialog guard, blocking dialog policy, browser automation 권한,
  viewport/theme 목록을 먼저 확인합니다.
- longrun blocker: 120분은 30분 또는 high-risk 안정화 조건 PASS, 사용자 승인,
  RC/high-risk 사유, memory/runtime 관찰 항목이 모두 있어야 시작합니다.

시작 조건 실패는 긴 테스트 실패로 과장하지 않습니다. 문서/mapping/fixture/env 문제를
고친 뒤 해당 안정화 조건만 다시 확인하고, 아직 시작하지 않은 30분/120분/UI 결과는
`미실행`으로 남깁니다.

### v2.2.0 UI Evidence Close-out four-stage mapping

v2.2.0 UI Evidence Close-out은 새 로드맵 기준에서 기능 inventory,
manual-ui-result-template.md, manual UI checklist가 같은 범위를 가리키는지 먼저
확인하는 준비 단계입니다. 이 mapping은 새 테스트 영역이 아니며 기준은
[v220-ui-evidence-closeout.md](./v220-ui-evidence-closeout.md)와
`./server.sh verify-v220-ui-evidence-closeout`입니다.

UI 풀테스트 결과 문서를 쓰기 전에는 아래 항목이 개별 route/control/action row로
분리돼 있는지 확인합니다. 이 목록은 실행 evidence가 아니라 누락 방지 목록입니다.

| 로드맵 항목 | 결과 기록 기준 |
| --- | --- |
| V220-F02 | `/ops/sources` 채널 목록, source detail, ONVIF/WHEP/WHIP 입력, PublishedView, audit |
| V220-F03 | `/ops/users`, `/client/request-access`, `/invite/setup` 사용자, 초대, 승인, role/scope, audit |
| V220-F04 | `/ops/vlm` privacy, default-off, profile 상태, Ops-only raw/debug containment |
| V220-F05 | `/client/live`, `/client/dashboard`, `/client/events` admin preview, viewer-safe 비노출 |
| V220-F06 | 기능 inventory, manual UI checklist, UI 풀테스트 결과 기록 기준 |

30분 soak, 120분 longrun, 인앱 브라우저 UI 풀테스트를 실행하지 않았으면 결과 문서의
스크립트 테스트 또는 UI 풀테스트 영역에 PASS로 쓰지 않고 `미실행`으로 남깁니다.

## 3. 실행 원칙

- 모든 웹 UI 검수는 인앱 브라우저에서 수행합니다.
- Codex가 실행하는 검수는 인앱 브라우저 evidence를 우선합니다. Codex 밖에서 사용자가
  직접 실행하는 자동 검수는 Chrome/CDP를 사용할 수 있습니다.
- Codex 세션에서 Chrome/CDP가 꼭 필요한 예외는 `MEDIA_SERVER_UI_BROWSER_MODE=chrome`과
  `MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1`을 함께 남긴 경우로 제한하고, 결과 문서에
  왜 인앱 브라우저가 아닌지 기록합니다.
- 클릭, 타이핑, select 변경, checkbox/toggle, copy button, nav 이동, route guard를
  실제 UI 조작으로 확인합니다.
- 모든 결과는 개별 기능, route, control, action 단위로 기록합니다. 카테고리 묶음
  판정은 금지합니다. `Auth PASS`, `Rules FAIL`처럼 묶지 않고 기능 ID별 개별 행으로
  `PASS` 또는 `FAIL`만 적습니다.
- 개별 기능은 인앱 브라우저에서 실행하고, 실제 수행 결과가 제품 상태에 반영됐는지
  확인하고, 관련 로그 또는 이벤트 이력을 확인해야 `PASS`입니다. 하나라도 빠지면
  `FAIL`입니다.
- 자동 스크립트는 보조 evidence입니다. 자동 smoke 통과만으로 화면을 확인했다고
  쓰지 않습니다.
- `verify-predev --soak-minutes 30`, `verify-predev --soak-minutes 120`,
  `verify-va-runtime-console-longrun --duration-minutes 120`은 스크립트 안정화
  테스트입니다. 실행 여부와 PASS/FAIL은 UI 풀테스트 판정과 별도 섹션에 기록합니다.
- VLM queue/backpressure, memory/runtime cache, provider timeout, model install state
  기준은 [vlm-stabilization-longrun-ui-criteria.md](./vlm-stabilization-longrun-ui-criteria.md)를
  따릅니다. 장시간 명령을 실행하지 않은 경우에는 UI PASS로 대체하지 않고
  `미실행` 또는 `제외 기록`에만 남깁니다.
- UI 풀테스트에는 기능 동작뿐 아니라 시각 품질을 포함합니다. 텍스트박스 간격,
  table/action 정렬, 버튼 text overflow, badge clipping, modal/menu 위치, focus
  visible, empty/loading/error copy, contrast, responsive overflow를 함께 확인합니다.
- 발견한 UI 문제는 현재 UI 풀테스트 범위 안에서만 수정합니다. schema, payload,
  WebRTC/SSE/WS metadata, RTSP/WebRTC media path, auth/scope 계약은 요청 없이
  변경하지 않습니다.
- 실패 후 고친 화면은 같은 조작으로 재검수하고, 최초 실패와 재확인 결과를 모두
  남깁니다.

### v2.1.0 release UI gate

v2.1.0 release close-out에서는 자동 smoke와 별도로 아래 화면을 브라우저에서 직접
열고 클릭한 Evidence index를 남깁니다. 자동 screenshot 생성이나 raw JSON/API-only 확인만
있으면 해당 개별 기능은 `FAIL`입니다.

- `/setup`: setup 필요/불필요 상태와 weak password 거절 또는 auth smoke 대체 범위를 분리합니다.
- `/login`: 직접 로그인 또는 auth smoke 대체 범위를 분리하고 session/cookie 값은 남기지 않습니다.
- `/ops`: primary nav(Home, Dashboard, Channels, Rules, Users, Client Preview) 이동을 직접 확인합니다.
- `/client`: viewer/admin preview에서 Live/Dashboard nav만 보이는지 확인합니다.
- `/ops/rules`: Rule/Profile/Scenario 저장 전 validation, preview 시작, `vaRule` 저장 flow를 직접 확인합니다.
- `/client/live`: source tree, drag/drop 또는 선택, tile start/reconnect/stop, dock 좌/우 전환, 정보 overlay, viewer-safe 비노출을 직접 확인합니다.

Evidence index에는 route, 계정/권한, 직접 조작, screenshot/artifact, 자동 검증 연결,
판정을 개별 기능 단위로 한 줄씩 기록합니다. 판정은 `PASS` 또는 `FAIL`만 사용합니다.
열지 않은 화면은 `FAIL`이고, 실패 후 재검수한 경우 최초 실패와 재확인 결과를 함께
남깁니다. 사용자가 의도적으로 제외한 항목은 Evidence index가 아니라 `제외 기록`에
남깁니다.

Codex 세션의 UI 조작 evidence는 인앱 브라우저 직접 조작을 우선합니다.
프로젝트 verifier가 자체 Chrome/CDP 세션에서 클릭/타이핑/팝업 처리를 완료한 기록은
명시 승인된 예외나 Codex 밖 실행의 보조 evidence로만 씁니다. 테스트가 사용자 클릭이나
팝업 버튼 수동 확인을 기다리면 해당 항목은 harness 실패로 기록하고 PASS 처리하지
않습니다.

## 4. Auth Shell

- `/`: setup 필요 상태에서는 `/setup`, 로그인 필요 상태에서는 `/login`, 로그인 후에는
  role landing으로 이동하는지 확인합니다.
- `/setup`: weak password rejection, strong admin password 설정, `/login` redirect를
  확인합니다.
- `/login`: admin/operator는 `/ops/home`, viewer는 `/client/live`로 이동하는지 확인합니다.
- `/password/change`: reset 또는 must-change 계정에서 이전 비밀번호 재사용 거부와
  새 비밀번호 설정 flow를 확인합니다.
- `/password/change`: 성공 flow는 사용자 지정 테스트 비밀번호에서 임의의 강한
  임시 비밀번호로 변경한 뒤, 임시 비밀번호 로그인 성공까지 확인합니다. 이후
  사용자 지정 테스트 비밀번호로 되돌릴 때는 `MEDIA_SERVER_AUTH_PASSWORD_HISTORY_COUNT`
  기본값 `5`를 고려해 원래 비밀번호가 history 밖으로 밀려날 만큼 서로 다른 임시
  비밀번호를 거쳐야 합니다. `원래 -> 임의1 -> 임의2 -> 원래`는 기본 정책에서
  복원 성공 조건이 아니며, 즉시 재사용 거부는 PASS로 기록합니다.
- 관리자 reset password는 history 정책 우회가 아닙니다. reset 성공/실패, 다음 로그인
  변경 요구 상태, 최종 사용자 지정 테스트 비밀번호 로그인 성공, 이전 임시 비밀번호
  로그인 거부를 각각 분리해 기록합니다.
- `/invite/setup`: 승인된 접근 요청의 초대 설정 전후 경계를 확인하되 token 원문은
  결과에 남기지 않습니다.
- Chrome auth input evidence는 throwaway users file에서만 수행합니다. `/setup`,
  `/login`, `/password/change`, `/invite/setup`의 비밀번호 입력/제출을 직접
  수행했다면 weak password rejection, 성공 redirect, screenshot/artifact 경로,
  실행한 `verify-auth-bootstrap` 또는 `verify-auth-users` 결과를 함께 남깁니다.
- Auth verifier 실행 전 `MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD`,
  `MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD`,
  `MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD`,
  `MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE`,
  `MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO`를 테스트 실행자가 지정합니다.
  값이 없으면 auth 테스트를 시작하지 않고 해당 개별 기능을 `FAIL`로 기록합니다.
- Chrome/Computer Use/Browser Use가 비밀번호 필드나 clipboard permission 때문에
  입력을 끝까지 수행하지 못한 경우에는 해당 개별 기능을 `FAIL`로 기록하고,
  어떤 단계까지 직접 확인했는지와 보조로 통과한 auth smoke 명령을 분리합니다.
  자동 smoke 통과만으로 Chrome 수동 auth 입력을 완료했다고 쓰지 않습니다.
  사용자가 대신 입력하거나 팝업을 누른 행위는 verifier evidence로 대체하지 않습니다.
- Auth evidence에는 plaintext password, invite token 원문, session cookie,
  generated password suggestion을 남기지 않습니다.

## 5. Ops 화면

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

## 6. Client 화면

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

## 7. 반응형/테마/시각 품질

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

## 8. 종료 보고와 문서 병합

- 결과는 [manual-ui-result-template.md](./manual-ui-result-template.md)에 기록합니다.
- 기능별 조작 결과는 [project-feature-test-inventory.md](./project-feature-test-inventory.md)의
  ID를 함께 적어, route 단위 PASS가 기능 단위 PASS로 과장되지 않게 합니다.
- 확인됨: 실제 클릭한 화면, 통과한 명령, 생성한 fixture, 수정/커밋 파일
- 개별 UI 결과: 모든 기능 ID/route/control/action을 묶지 않고 `PASS` 또는 `FAIL`로 기록
- 제외 기록: 사용자가 명시 제외한 실기기/외부 credential/scope 밖 항목만 별도 기록
- 실패: PASS 조건을 충족하지 못한 모든 개별 UI 기능, 실패 명령, 원인, 영향 범위,
  재검수 여부
- 푸시: 명시 요청 전에는 수행하지 않고, 푸시 가능 여부만 보고합니다.
- UI 풀테스트 문서를 재작성하거나 새 문서를 추가한 경우에는 중복된 기준을
  [manual-ui-fulltest.md](./manual-ui-fulltest.md)에 병합하고, 이 체크리스트에는
  실행 순서와 route별 확인 항목만 남깁니다.
