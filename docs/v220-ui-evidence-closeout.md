# v2.2.0 UI Evidence Close-out 준비

이 문서는 `V220-F06 UI Evidence Close-out 준비`의 source-of-truth입니다. 목적은
v2.2.0 follow-up의 새 로드맵 기준에 맞춰 기능 inventory, manual UI checklist,
UI 풀테스트 결과 기록 기준을 한곳에 연결하는 것입니다.

F06는 UI 풀테스트 실행 결과가 아니라 close-out 준비 기준입니다. 이 문서와 verifier가
통과해도 인앱 브라우저 UI 풀테스트, 30분 soak, 120분 longrun, 실기기/외부
credential 조건이 PASS가 됐다는 뜻이 아닙니다. 실행하지 않은 항목은 결과 문서에서
`미실행`으로 남깁니다.
기능 inventory와 checklist/template 연결은 실행 evidence가 아닙니다.

## 적용 범위

| 범위 | 기준 |
| --- | --- |
| 기능 inventory | [project-feature-test-inventory.md](./project-feature-test-inventory.md)가 F02~F06 follow-up을 기존 기능 ID와 verifier family에 연결합니다. inventory 자체는 실행 evidence가 아님을 유지합니다. |
| manual UI checklist | [manual-ui-checklist.md](./manual-ui-checklist.md)가 F02~F06 route/control/action과 네 단계 시작 조건을 새 로드맵 기준으로 확인하게 합니다. |
| UI 결과 기록 | [manual-ui-result-template.md](./manual-ui-result-template.md)가 F02~F06 로드맵 항목, 직접 UI 조작, 스크립트 테스트, 30분/120분, 제외 기록을 분리해 기록하게 합니다. |
| 안정성 verifier | `verify-v220-ui-evidence-closeout`이 이 연결을 정적 검증하고, `verify-manual-ui-evidence`가 기존 manual UI result 구조를 계속 검증합니다. |

## F02~F06 Four-Stage Mapping

UI 풀테스트를 시작하기 전에는 아래 항목을 기능별로 확인합니다.

| 항목 | UI 풀테스트 준비 기준 |
| --- | --- |
| V220-F02 Ops Channels Workspace | `/ops/sources`의 채널 목록, source detail, ONVIF/WHEP/WHIP 입력, PublishedView, audit task가 result row에 분리돼 있어야 합니다. |
| V220-F03 Ops Users / Access Workspace | `/ops/users`, `/client/request-access`, `/invite/setup`의 사용자, 승인, 초대, role/scope, audit action이 result row에 분리돼 있어야 합니다. |
| V220-F04 Ops VLM containment | `/ops/vlm` privacy, default-off, profile state, Ops-only raw/debug boundary가 result row에 분리돼 있어야 합니다. |
| V220-F05 Client Preview / Viewer Redaction | `/client/live`, `/client/dashboard`, `/client/events`의 admin preview와 viewer-safe 비노출 row가 분리돼 있어야 합니다. |
| V220-F06 UI Evidence Close-out | 기능 inventory, manual UI checklist, manual UI result template, release evidence 기록 기준이 서로 연결돼 있어야 합니다. |

## 판정 경계

- `verify-v220-ui-evidence-closeout` PASS는 문서와 verifier 연결 기준 PASS입니다.
- `verify-manual-ui-evidence` PASS는 manual UI checklist/template 구조 기준 PASS입니다.
- `verify-ui-fulltest-one-shot` PASS는 보조 helper PASS이며 UI 풀테스트 PASS가 아닙니다.
- Chrome/CDP fallback screenshot smoke는 인앱 브라우저 직접 UI 풀테스트 PASS를 대체하지 않습니다.
- raw JSON/API-only 확인은 제품 UI 직접 조작 evidence가 아닙니다.
- 실기기/외부 endpoint/credential이 필요한 ONVIF/WHEP/WHIP/VLM provider 조건은 별도 테스트 영역으로 만들지 않고 안정화 또는 UI 제외 기록에 남깁니다.

## 기록 기준

manual UI result는 아래 구분을 유지합니다.

- 스크립트 테스트: build, auth, route guard, verifier, screenshot smoke, `git diff --check`
- 30분 테스트: `verify-predev --soak-minutes 30`
- 120분 테스트: `verify-predev --soak-minutes 120`, `verify-va-runtime-console-longrun --duration-minutes 120`
- UI 풀테스트: 인앱 브라우저 route, 계정/권한, viewport/theme, 직접 클릭/타이핑/선택, 반영 상태, 로그/EventRecord 확인
- 제외 기록: 사용자가 명시 제외한 실기기/외부 credential/scope 밖 항목. 이 항목은 별도 테스트 영역이 아닙니다.

각 영역은 token start, token end, token consumed, elapsed, source를 기록합니다. 자동
집계가 없으면 `미집계`와 사유를 적습니다.

## 안정성 Verifier

```bash
./server.sh verify-v220-ui-evidence-closeout
./server.sh verify-manual-ui-evidence
./server.sh verify-feature-inventory-coverage
./server.sh verify-project-inventory
git diff --check
```

위 명령은 `안정화 테스트` 범위의 close-out 준비 기준을 확인합니다. 인앱 브라우저
UI 풀테스트와 30분/120분은 별도 실행 결과가 있을 때만 PASS로 기록합니다.
