# VLM Close-out Readiness

schema: `media-server.vlm-close-out-readiness.v1`
targetStep: `V200-S18`
status: `readiness-recorded`
updated: 2026-05-31

이 문서는 `v2.0.0 V200-S18 v2.0.0 close-out readiness`의 source-of-truth입니다.
S18은 v2.0.0 VLM 로드맵의 스크립트 테스트, UI 풀테스트, 30분, 120분, 미실행,
제외, 미확인을 서로 대체하지 않도록 release evidence로 정리하는 단계입니다.
이 문서는 release tag, GitHub Release, main merge, runtime/model bundle release,
실제 provider 호출 완료를 뜻하지 않습니다.

## 직접 답

S18에서 닫는 것은 `v2.0.0 VLM 기반 AI 대형 업데이트`의 close-out readiness입니다.
현재 source-only 기준의 결론은 아래와 같습니다.

- 스크립트 테스트: S15~S17에서 추가한 VLM rehearsal, side-effect, longrun/UI 기준
  verifier를 S18 안정성 검토의 선수 gate로 다시 확인합니다.
- UI 풀테스트: 이번 S18 readiness 작업에서는 실행하지 않습니다. 직접 브라우저 조작
  evidence가 없으므로 UI 풀테스트 PASS로 쓰지 않습니다.
- 30분 soak: 이번 S18 readiness 작업에서는 실행하지 않습니다. 사용자 명시 요청 또는
  release close-out runbook에서 별도로 실행해야 합니다.
- 120분 longrun: 이번 S18 readiness 작업에서는 실행하지 않습니다. 사용자 승인,
  RC/high-risk gate가 있을 때만 실행합니다.
- Cloud/provider field smoke: provider credential과 external endpoint가 없으므로
  실행하지 않습니다. local smoke PASS로 provider 성공을 대체하지 않습니다.
- Push: 사용자가 S18 완료 후 push를 명시했으므로, S18 안정성 검토가 PASS이고
  미커밋 변경이 없으면 commit 후 push합니다.

Fallback은 문서/fixture/verifier 기반 close-out readiness입니다. 30분/UI/120분을
실행하지 않은 상태는 `미실행`으로 보존하며, release 완료나 UI PASS로 승격하지
않습니다.

## Script Test Evidence

| 영역 | 명령/증적 | S18 상태 | verifier가 커버하는 범위 | verifier가 커버하지 않는 범위 |
| --- | --- | --- | --- | --- |
| VLM rehearsal | `./server.sh verify-vlm-test-rehearsal` | PASS 기록 대상 | missing-model, cloud-disabled, invalid-output, queue-timeout, cleanup, lifecycle fixture | 실제 VLM runtime/provider/model install |
| Side-effect regression | `docs/development-backlog.md` S16 evidence, `./server.sh verify-vlm-closeout-readiness` | PASS 기록 대상 | S16 build/auth/UI/rule/VA/metadata/Event POST 결과 분리 | UI 풀테스트 직접 조작, 장시간 soak |
| Longrun criteria | `./server.sh verify-runtime-media-longrun-trigger-matrix`, `./server.sh verify-longrun-separation` | PASS 기록 대상 | 30분/120분 trigger와 approval boundary | 30분/120분 실제 실행 결과 |
| Manual UI evidence structure | `./server.sh verify-manual-ui-evidence` | PASS 기록 대상 | UI 풀테스트 문서 구조, PASS/FAIL/제외 기록 경계 | 실제 UI 클릭/타이핑/시각 품질 확인 |
| Release evidence | `./server.sh verify-release-evidence-index` | PASS 기록 대상 | evidence matrix, token ledger, 미실행/미확인/제외 문구 | GitHub Release publish 상태 |
| Release metadata | `./server.sh verify-release-metadata` | PASS 기록 대상 | branch-level VERSION/CMake/README/docs drift | publish 후 GitHub Latest Release |
| Docs/index | `./server.sh verify-docs-links`, `./server.sh verify-script-inventory` | PASS 기록 대상 | 문서 링크와 server command/script inventory 연결 | 제품 runtime 동작 |

## UI Fulltest Status

UI 풀테스트: 미실행

미실행 이유:

- 사용자가 S18에서 30분/UI/120분 직접 실행을 별도로 명시하지 않았습니다.
- S18의 예상 검증은 `30분/UI/120분 실행 또는 미실행 기록`입니다.
- S17 기준에 따라 static smoke, raw JSON/API-only 확인, screenshot 생성은 VLM UI
  풀테스트 PASS evidence가 아닙니다.

후속 완료 조건:

- `/ops/vlm`, `/ops/events`, `/client/live`, `/client/dashboard`, `/client/events`를
  인앱 브라우저 또는 자율 브라우저로 직접 열고 클릭/타이핑/선택/반응형/시각 품질을
  확인합니다.
- VLM model/prompt/raw response/provider/internal review card가 client/viewer에
  노출되지 않는지 직접 확인합니다.
- 기능 ID별 PASS/FAIL 결과를 `manual-ui-result-template.md` 기준으로 남깁니다.

## 30-Minute And 120-Minute Status

30분 soak: 미실행

120분 longrun: 미실행

미실행 이유:

- 장시간 테스트와 `verify-predev`는 사용자 명시 요청 전에는 실행하지 않습니다.
- 이번 S18 변경은 close-out readiness 문서와 정적 verifier wiring 중심이며,
  VLM queue/backpressure, memory/runtime cache ownership, media path ownership을
  새로 변경하지 않습니다.
- 120분은 사용자 승인, RC/high-risk signal, active RSS high-water, cleanup drift가
  있을 때만 실행합니다.

후속 실행 조건:

- 30분: version release close-out에서 사용자가 장시간 테스트를 명시하거나 VLM
  queue/runtime cache/media non-blocking 변경이 있을 때 실행합니다.
- 120분: RC/high-risk gate 또는 사용자 승인 후
  `verify-predev --soak-minutes 120` 또는
  `verify-va-runtime-console-longrun --duration-minutes 120`을 실행합니다.

## Exclusions And Unverified

| 항목 | 상태 | 이유 | 후속 조건 |
| --- | --- | --- | --- |
| 실제 VLM runtime 호출 | 미실행 | source-only readiness, runtime/provider 설치 없음 | runtime opt-in과 profile/evaluation 승인 후 |
| cloud provider API 호출 | 미실행 | credential/provider field 환경 없음 | cloud opt-in, provider logging/retention 검토, field smoke 승인 후 |
| model/runtime download 또는 bundle | 제외 | v2.0.0 source-only release와 bundle policy 밖 | 별도 runtime/model bundle release 정책 후 |
| GitHub Release/latest publish 검증 | manual-not-run | S18은 release publish 단계가 아님 | tag/GitHub Release 생성 후 `verify-release-metadata --published` |
| UI 풀테스트 직접 조작 | 미실행 | 이번 작업에서 브라우저 UI 풀테스트를 실행하지 않음 | 별도 UI 풀테스트 지시 또는 release close-out runbook |

## Token Usage

| test area | token usage source | token start | token end | token consumed | elapsed |
| --- | --- | --- | --- | --- | --- |
| S18 close-out readiness docs/static verifier | manual-not-available | 미집계 | 미집계 | 미집계 | command output 기준 |
| 30분 soak | 미실행 | 미실행 | 미실행 | 미실행 | 미실행 |
| 120분 longrun | 미실행 | 미실행 | 미실행 | 미실행 | 미실행 |
| UI 풀테스트 | 미실행 | 미실행 | 미실행 | 미실행 | 미실행 |

Codex goal usage는 최종 보고에서 별도로 확인합니다. 문서에는 임의 token 값을 쓰지
않고 미집계 사유를 남깁니다.

## Post-S18 Branch Test Evidence

이 절은 S18 readiness 당시의 완료 조건을 바꾸지 않고, 이후 v2.0.0 브랜치에서 별도로
실행한 테스트 상태만 연결합니다.

| 후속 test area | 실행 상태 | evidence | 경계 |
| --- | --- | --- | --- |
| 30분 soak | PASS | [v200-test-record-2026-05-31.md](./v200-test-record-2026-05-31.md), `/private/tmp/media_server_v200_inapp_30min_20260601_summary.json` | S18 readiness PASS를 대체하지 않고 별도 evidence |
| UI 풀테스트 | PASS | [manual-ui-result-2026-06-01-v200-inapp-fulltest.md](./manual-ui-result-2026-06-01-v200-inapp-fulltest.md) | 직접 UI evidence이며 30분/120분을 대체하지 않음 |
| predev 120-minute longrun | PASS | [release-evidence-index.md](./release-evidence-index.md), `/private/tmp/media_server_v200_120min_20260601_retry2_summary.json` | `verify-va-runtime-console-longrun --duration-minutes 120`은 별도 미실행 |

## Completion Boundary

S18 완료로 인정하는 것:

- VLM close-out readiness report가 존재합니다.
- release evidence index가 S18 script/UI/30분/120분 상태를 분리합니다.
- `verify-release-evidence-index`, `verify-release-metadata`,
  `verify-vlm-closeout-readiness`, `git diff --check`가 PASS입니다.
- 30분/UI/120분 미실행 상태가 PASS로 과장되지 않습니다.

S18 완료로 인정하지 않는 것:

- v2.0.0 release tag 또는 GitHub Release 완료
- main merge 완료
- 30분/120분 longrun PASS
- UI 풀테스트 PASS
- cloud provider field smoke PASS
- VLM default-on 또는 runtime/model bundle release

## Commands

```bash
./server.sh verify-vlm-closeout-readiness
./server.sh verify-release-evidence-index
./server.sh verify-release-metadata
./server.sh verify-vlm-test-rehearsal
./server.sh verify-runtime-media-longrun-trigger-matrix
./server.sh verify-longrun-separation
./server.sh verify-manual-ui-evidence
./server.sh verify-script-inventory
./server.sh verify-docs-links
git diff --check
```

장시간/UI 명령은 이번 S18 readiness에서 실행하지 않았습니다.

```bash
./server.sh verify-predev --soak-minutes 30
./server.sh verify-predev --soak-minutes 120
./server.sh verify-va-runtime-console-longrun --duration-minutes 120
./server.sh verify-ui-fulltest-one-shot --output-dir <dir>
```
