# Manual UI Full Test Standard

이 문서는 MediaServer에서 "UI 풀테스트"라고 요청받았을 때 반드시 포함해야 하는
기준입니다. 기능별 UI 필요 여부와 테스트 영역 분류는
[project-feature-test-inventory.md](./project-feature-test-inventory.md)를 기준으로
삼고, 실행 순서는 [manual-ui-checklist.md](./manual-ui-checklist.md), 결과 기록은
[manual-ui-result-template.md](./manual-ui-result-template.md)를 사용합니다.
현재 제품 UI 기준은 release 목표 `v1.8.0`입니다. 지원 가능한 모든 기능을 실제 UI 조작으로 확인하지 않은 경우에는 완료로 쓰지 않습니다.

## 1. 정의

UI 풀테스트는 자동 smoke가 아니라 인앱 브라우저에서 제품 웹 UI를 직접 열고,
클릭과 타이핑으로 문서에 설명된 기능을 하나하나 확인하는 검수입니다.
API 응답, raw JSON, screenshot 생성, 스크립트 통과만으로는 UI 풀테스트를 완료했다고
기록하지 않습니다.

## 2. 테스트 영역 역할 분리

UI 풀테스트는 `스크립트 테스트`와 별도 영역입니다. 스크립트 테스트의 기준은
[stream-verification.md](./stream-verification.md)에 둡니다.

| 영역 | UI 풀테스트에서의 취급 |
| --- | --- |
| 안정화 테스트 | 30분/120분/UI 테스트의 선수 테스트입니다. 로드맵 각 스텝 종료 시 먼저 수행합니다. 실패하면 UI 풀테스트로 넘어가지 않습니다. |
| 30분 테스트 | 장기간 테스트 지시 시 기본으로 수행하고, 각 버전별 로드맵 개발이 끝나면 수행합니다. UI 클릭/타이핑 evidence를 대체하지 않습니다. |
| 120분 테스트 | 메모리 릭, 장시간 누수, runtime drift 감시용입니다. 무조건 실행하지 않고 필요하면 사용자에게 먼저 알립니다. UI 풀테스트 PASS를 대체하지 않습니다. |
| UI 풀테스트 | 인앱 브라우저 직접 조작, role별 화면, 반응형, 시각 품질 evidence입니다. 30분/120분 안정화 PASS를 대체하지 않습니다. |

따라서 결과 문서에는 `스크립트 테스트`와 `UI 풀테스트` 판정을 따로 적습니다.
UI 풀테스트 판정값은 `PASS`와 `FAIL`만 사용합니다. 모든 기능을 인앱 브라우저에서
실행하고, 실제 수행 결과가 제품 상태에 반영됐는지 확인하고, 관련 로그 또는
이벤트 이력을 확인했을 때만 `PASS`입니다. 그 외에는 전부 `FAIL`입니다.
실기기/외부 credential처럼 사용자가 의도적으로 빼라고 한 항목은 UI 풀테스트
대상에서 제외하고, 판정표 밖의 `제외 기록`에만 남깁니다.

포함 범위:

- 프로젝트 문서 파악
- 데이터 리셋과 throwaway fixture 준비
- Auth, Ops, Client, 접근 요청, 제품 UI/현재 API 경계 직접 확인
- 문서에 나온 웹페이지 UI 기능의 클릭/타이핑 검수
- 320px, 390px, 760px, 1180px 반응형 확인
- light/dark theme 확인
- UI 시각 품질 확인
- 발견 이슈 수정 후 같은 화면 재검수
- 수동 결과 문서와 자동 검증 결과의 분리 기록

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

## 5. 인앱 브라우저 직접 조작

모든 수동 확인은 인앱 브라우저에서 수행합니다. 다음 행위가 있어야 `확인됨`입니다.

- route를 실제로 열기
- nav/tab/button/menu/details를 클릭하기
- textbox/textarea/password에 타이핑하기
- select/checkbox/toggle/segmented control을 조작하기
- copy button, export button, preview/play/stop/reconnect를 누르기
- role별 route guard를 브라우저에서 확인하기
- responsive viewport를 바꾸고 화면을 다시 확인하기

UI 풀테스트 결과는 모든 개별 기능, route, control, action 단위로 답합니다.
카테고리 묶음 판정은 금지합니다. 예를 들어 `Rules PASS`, `Auth FAIL`처럼 묶지
않고, `RULE-041 presence EventRecord 발생`, `AUTH-022 reset 후 must-change`,
`UI-004 password change 임시 pw 로그인`처럼 개별 행으로 기록합니다.
요약은 개별 행 이후에만 둘 수 있고, 요약이 개별 결과를 대체할 수 없습니다.

다음은 `확인됨`으로 쓰지 않으며, UI 풀테스트 대상이면 `FAIL`입니다.

- raw JSON/API-only 확인만 수행
- 스크립트 screenshot만 생성
- 자동 smoke만 통과
- 열지 않은 화면
- 실패한 화면을 재검수하지 않음
- 브라우저가 아닌 문서/코드만 확인

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

Client:

- `/client/live`
- `/client/dashboard`
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
- Client Live: source tree, tile assignment, start/reconnect/stop, grid/density,
  dock side, info overlay, workspace actions, copy fallback, keyboard focus
- Client Dashboard: filter, sort, status copy, event copy
- Request Access: public submit, pending copy, approval before/after boundary

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

## 9. 자동 검증과 중단

자동 검증은 수동 UI evidence를 보강하는 `스크립트 테스트` 증거입니다. UI/Auth/Ops/Client 변경이
있으면 최소 아래 명령을 검토하고, 실행하지 않은 항목은 이유를 적습니다.

- `./server.sh build`
- `./server.sh verify-auth-bootstrap`
- `./server.sh verify-auth-users`
- `./server.sh verify-auth-routes`
- `./server.sh verify-ops-client-ui`
- `./server.sh verify-ops-client-ui --screenshots`
- `./server.sh verify-rule-ui`
- `git diff --check`

문서 변경이 있으면 아래를 검토합니다.

- `./server.sh verify-docs-links`
- `./server.sh verify-docs-ui-assets`
- `./server.sh verify-release-metadata`
- `./server.sh verify-manual-ui-evidence`

장시간 테스트와 `verify-predev`는 사용자가 명시 요청하지 않으면 실행하지 않습니다.
실행하지 않은 스크립트는 실행하지 않았다고 사실 기록만 남기며, UI 풀테스트의
대체 evidence로 쓰지 않습니다.

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

- 확인됨: 실제 실행한 명령, 실제 클릭한 화면, 실제 생성된 fixture, 실제 수정 파일,
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
runbook으로 전면 정리하고, 이 문서를 UI 풀테스트 기준 source-of-truth로 새로
작성했습니다. 두 문서를 비교해 중복된 정의는 이 문서에 병합했고, route별 실행
항목과 종료 체크는 checklist에 남겼습니다. 결과 기록 항목은
[manual-ui-result-template.md](./manual-ui-result-template.md)에 병합했습니다.

앞으로 "UI 풀테스트"를 요청받으면 이 문서의 기준을 먼저 적용하고,
checklist와 result template을 함께 사용합니다.
