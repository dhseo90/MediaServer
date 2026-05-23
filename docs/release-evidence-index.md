# Release Evidence Index

이 문서는 v1.8.0 release trust hardening 이후 release close-out evidence를 한곳에서
찾기 위한 색인입니다. README 첫 화면에는 세부 evidence 목록을 반복하지 않고,
이 문서와 [release-policy.md](./release-policy.md), [development-backlog.md](./development-backlog.md)로
연결합니다.

## 기록 원칙

- 실행한 항목만 `PASS` 또는 `FAIL`로 기록합니다.
- 실행하지 않은 항목은 `NOT RUN`, 수동 승인 전 항목은 `manual-not-run`으로 기록합니다.
- 열지 않은 화면, 직접 클릭하지 않은 UI, 확인하지 않은 screenshot은 `미확인`으로 기록합니다.
- 자동 smoke, raw JSON, API 응답만으로 manual UI evidence를 완료했다고 쓰지 않습니다.
- 30분 soak와 120분 longrun은 서로 대체하지 않습니다.
- 스크립트 테스트와 UI 풀테스트는 별도 evidence 영역입니다. 30분/120분 안정화 PASS는
  UI 풀테스트 PASS가 아니고, UI 풀테스트 PASS도 30분/120분 안정화 PASS가 아닙니다.
- tag, push, GitHub Release 생성은 사용자 명시 승인 전에는 완료로 기록하지 않습니다.

## Evidence Matrix

| 영역 | Evidence | 대표 명령/출처 | 상태 기록 |
| --- | --- | --- | --- |
| GitHub Latest Release | GitHub Releases latest/list/view, `/releases/latest`, remote tag | `./server.sh verify-release-metadata` | PASS/FAIL |
| Release metadata/docs drift | VERSION, CMake, README, docs index, release policy, backlog | `./server.sh verify-release-metadata`, `./server.sh verify-docs-links` | PASS/FAIL |
| Docs UI assets | managed screenshot manifest, capture script ownership, direct image review checklist | `./server.sh verify-docs-ui-assets` | PASS/FAIL/미확인 |
| Manual UI evidence | `/setup`, `/login`, `/ops`, `/client`, `/ops/rules`, `/client/live` direct click index | `./server.sh verify-manual-ui-evidence`, manual browser review | PASS/FAIL/미확인/건너뜀 |
| English UI visual copy QA | English capture path, nav/card/table wrapping, Korean residue review | `./server.sh verify-ui-copy-i18n-parity`, `./server.sh verify-ops-client-ui --screenshots` | PASS/FAIL/미확인 |
| Release close-out runbook | branch close, PR merge, main sync, tag, GitHub Release, Latest 확인, next branch sync | `./server.sh verify-release-closeout-helper --dry-run` | planned-local/manual-not-run |
| Feature scope decision gate | 새 기능 후보를 v1.8 안정화 gate 안에서 구현으로 승격하지 않는 절차 | `./server.sh verify-feature-scope-gate` | PASS/FAIL |
| PR checks | Preflight, licensing/artifact guardrails, required checks | GitHub Actions UI/API | PASS/FAIL/미확인 |
| Release notes | source-only scope, non-goals, verification, not-run/unverified | [release-policy.md](./release-policy.md) | PASS/FAIL/미확인 |
| Script smoke/stability | build/static/auth/API/media verifier, short smoke, skip reason | `./server.sh build`, 범위별 `verify-*` 명령 | PASS/FAIL/NOT RUN |
| 30분 soak | 사용자 명시 요청 시 30분 안정성 테스트 | `./server.sh verify-predev --soak-minutes 30` | PASS/FAIL/NOT RUN |
| 장시간/외부 gate | 120분 longrun, real ONVIF, external TURN/WHEP, YouTube real URL | release runbook/manual report | PASS/FAIL/NOT RUN/미확인 |

## Skipped / Not-run Wording

보고서와 release note에서는 아래 문구를 구분합니다.

| 상태 | 의미 |
| --- | --- |
| `PASS` | 해당 release cut에서 실제 실행했고 통과 |
| `FAIL` | 해당 release cut에서 실제 실행했고 실패 |
| `NOT RUN` | 실행 조건이 아니거나 명시 요청이 없어 실행하지 않음 |
| `manual-not-run` | tag, push, PR merge, GitHub Release처럼 수동 승인 전이라 실행하지 않음 |
| `미확인` | 화면, screenshot, 외부 UI/API를 직접 열어 확인하지 않음 |
| `건너뜀` | destructive action 또는 fixture 조건 때문에 의도적으로 생략 |

`NOT RUN`, `manual-not-run`, `미확인`, `건너뜀`은 PASS가 아닙니다.

## Verification

```bash
./server.sh verify-release-evidence-index
./server.sh verify-feature-scope-gate
./server.sh verify-docs-links
./server.sh verify-release-metadata
```
