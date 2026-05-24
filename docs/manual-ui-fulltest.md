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
한쪽이 PASS여도 다른 쪽을 실행하지 않았다면 다른 쪽은 `NOT RUN`, `미확인`,
`건너뜀`, 또는 `BLOCKED`로 남깁니다.

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

문서에 기능이 설명되어 있지만 UI에서 열지 못한 경우, 완료로 쓰지 않고 `미확인`,
`건너뜀`, 또는 `BLOCKED`로 분리합니다.

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

다음은 `확인됨`으로 쓰지 않습니다.

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

장시간 테스트와 `verify-predev`는 사용자가 명시 요청하지 않으면 실행하지 않고
`미실행`으로 적습니다. 실행했더라도 UI 풀테스트의 직접 조작 evidence로 쓰지 않습니다.

## 10. 보고 원칙

보고는 확인된 사실과 추정을 분리합니다.

- 확인됨: 실제 실행한 명령, 실제 클릭한 화면, 실제 생성된 fixture, 실제 수정 파일,
  실제 커밋 여부
- 미확인: 열지 않은 화면, 실행하지 않은 테스트, 추정 원인, 외부 환경
- 건너뜀: destructive action, 실장비/외부 credential, scope 밖 항목
- 실패: 실패 명령, 실패 화면, 영향 범위, 수정 여부, 재검수 결과
- 스크립트 테스트와 UI 풀테스트: 각각 PASS/FAIL/NOT RUN/미확인을 별도 판정

푸시는 사용자가 명시 요청하기 전까지 수행하지 않고, 마지막에는 푸시 가능 여부와
푸시 수행 여부를 분리해서 보고합니다.

## 11. 문서 비교/병합 결과

이번 재작성에서는 기존 [manual-ui-checklist.md](./manual-ui-checklist.md)를 실행
runbook으로 전면 정리하고, 이 문서를 UI 풀테스트 기준 source-of-truth로 새로
작성했습니다. 두 문서를 비교해 중복된 정의는 이 문서에 병합했고, route별 실행
항목과 종료 체크는 checklist에 남겼습니다. 결과 기록 항목은
[manual-ui-result-template.md](./manual-ui-result-template.md)에 병합했습니다.

앞으로 "UI 풀테스트"를 요청받으면 이 문서의 기준을 먼저 적용하고,
checklist와 result template을 함께 사용합니다.
