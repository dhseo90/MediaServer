# VLM Stabilization, Longrun, And UI Criteria

이 문서는 `v2.0.0 V200-S17 안정화/장시간/UI 기준 정리`의 source-of-truth입니다.
VLM queue, memory, provider timeout, model install 상태가 바뀌었을 때 어떤 검증을
실행하고, 어떤 검증은 실행하지 않았다고 분리 보고할지 고정합니다.

## 직접 답

기본 선택값은 아래와 같습니다.

- 짧은 안정화: 모든 VLM 변경은 `verify-vlm-test-rehearsal`과 해당 VLM verifier를
  먼저 실행합니다.
- 30분 soak: VLM queue/backpressure, runtime worker lifecycle, memory/cache,
  media non-blocking 경계를 바꾼 경우에만 `verify-predev --soak-minutes 30`을
  실행합니다. 버전 로드맵 전체 close-out 시에도 별도 실행 대상입니다.
- 120분 longrun: VLM memory/cache ownership, active RSS high-water, provider retry
  queue drift, metadata fanout/media path 고위험 변경, release candidate gate에서만
  사용자 승인 후 실행합니다.
- UI 풀테스트: `/ops/vlm`, `/ops/events` VLM review, viewer/client redaction,
  cloud opt-in guard, model install state copy가 바뀌면 인앱 브라우저 또는 자율
  브라우저 직접 조작 evidence가 필요합니다.
- 브라우저 선택: Codex가 실행하는 UI evidence는 인앱 브라우저가 기본입니다. Codex
  밖에서 사용자가 직접 실행하는 자동 검수는 Chrome/CDP를 사용할 수 있으며, Codex
  세션의 Chrome/CDP는 `MEDIA_SERVER_UI_BROWSER_MODE=chrome`과
  `MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1`을 함께 지정한 명시 예외로만 둡니다.
- Cloud provider field smoke: cloud provider timeout/retry/credential이 실제 provider에
  의존하면 local soak PASS로 대체하지 않고, field smoke 또는 제외 기록으로 남깁니다.

Fallback은 VLM runtime을 켜지 않는 fixture-only 검증입니다. runtime/provider/model
조건이 준비되지 않은 경우에는 `missing-model`, `cloud-disabled`, `provider-field-not-run`
같은 제외/미실행 사유를 남기고 PASS evidence로 대체하지 않습니다.

제외 대상과 이유:

- 모델 weight download, runtime install, provider credential 저장: v2.0.0 source-only
  release와 bundle policy 밖입니다.
- cloud provider API 호출: opt-in, credential, provider logging/retention 검토와 field
  환경이 필요합니다.
- 120분 상시 실행: 비용/시간이 크고 RC/high-risk 승인 gate로 분리되어야 합니다.
- raw JSON/API-only UI 확인: UI 풀테스트 evidence가 아닙니다.

## Trigger Matrix

| 변경 상태 | 안정화 | 30분 | 120분 | UI 풀테스트 | 제외/미실행 보고 |
| --- | --- | --- | --- | --- | --- |
| VLM docs/fixture/verifier wording only | `verify-vlm-test-rehearsal`, 관련 docs/static verifier | 미실행 | 미실행 | 미실행 | 장시간/UI 기준 밖 |
| `/ops/vlm` install/profile/privacy UI state | VLM UI/profile/privacy verifier, auth/ops shell smoke | 버전 close-out 전까지 미실행 가능 | 미실행 | 필요 | 직접 조작 없으면 UI PASS 아님 |
| missing-model / model install readiness | VLM rehearsal, profile/dry-run verifier | 미실행 | 미실행 | `/ops/vlm` 상태 표시 변경 시 필요 | missing model은 media path FAIL이 아님 |
| cloud-disabled / provider opt-in copy | privacy guard, profile verifier | 미실행 | 미실행 | cloud opt-in UI 변경 시 필요 | provider 호출 미실행, field smoke 제외 가능 |
| provider timeout/retry/credential path | privacy guard, event/post/schema side-effect verifier | local soak로 대체 금지 | 승인 후 field/RC 판단 | provider error UI 변경 시 필요 | credential/provider 미준비 시 field exclusion |
| VLM queue/backpressure/timeout worker | VLM rehearsal, side-effect verifier, build | 필요 | 승인 후 필요 | runtime status UI 변경 시 필요 | 120분 미승인 시 HOLD/미실행 |
| VLM memory/cache/frame retention | build, side-effect verifier, memory-trigger review | 필요 | 승인 후 필요 | UI 변경 없으면 비대상 | RSS high-water 미확인 분리 |
| VLM sidecar/Ops event review display | sidecar, ops event review, privacy verifier | event storage/runtime fanout 변경 시 필요 | fanout/high-risk 승인 시 필요 | 필요 | raw API만으로 UI PASS 금지 |

## Reporting Rules

- `verify-*` PASS는 해당 명령이 검사한 범위만 PASS입니다.
- `verify-vlm-test-rehearsal` PASS는 안정화/30분/120분/UI 풀테스트 완료 evidence가
  아닙니다.
- `verify-ops-client-ui --browser-mode static`은 HTML/API smoke이며 UI 풀테스트 직접
  조작 evidence가 아닙니다.
- 30분과 120분은 서로 대체하지 않습니다.
- 120분은 사용자 승인, RC gate, high-risk signal 중 하나가 있어야 실행합니다.
- 실행하지 않은 장시간/UI 항목은 `미실행`으로 남기고 PASS/FAIL 표 밖의 제외 기록과
  분리합니다.

## Commands

```bash
./server.sh verify-vlm-test-rehearsal
./server.sh verify-runtime-media-longrun-trigger-matrix
./server.sh verify-longrun-separation
./server.sh verify-manual-ui-evidence
git diff --check
```

장시간 명령은 S17 문서 정리만으로 실행하지 않습니다.

```bash
./server.sh verify-predev --soak-minutes 30
./server.sh verify-predev --soak-minutes 120
./server.sh verify-va-runtime-console-longrun --duration-minutes 120
```

## 완료 기준

- `verify-runtime-media-longrun-trigger-matrix`가 VLM queue, memory, provider timeout,
  model install state row를 검사합니다.
- `verify-longrun-separation`이 기본 smoke와 장시간 gate 분리를 유지합니다.
- `manual-ui-fulltest.md`, `manual-ui-checklist.md`, `manual-ui-result-template.md`가
  VLM UI direct evidence와 장시간/UI 비대체 경계를 설명합니다.
- `git diff --check`가 코드/문서/script whitespace drift를 확인합니다.

이 기준 정리는 실제 30분/120분 장시간 실행, 인앱 브라우저 UI 풀테스트, S18
close-out readiness를 대신하지 않습니다.
