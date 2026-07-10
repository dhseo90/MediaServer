# v3.9.0 Longrun First-Fail Diagnostics Implementation Plan

대상 독자는 v3.9.0 테스트 실행기와 release evidence를 유지보수하는 개발자 및 자동화
에이전트입니다. 이 문서는 V390-ADD1-10 구현 기간에만 사용하는 실행 계획이며,
`AGENTS.md`의 개발·테스트·보고 규칙과 `docs/development-backlog.md`의 roadmap 상태를
대체하지 않습니다.

**Goal:** `verify-v390-server-longrun`의 delegated duration case loop가 첫 실패에서 즉시
중단되고 이후 case를 `not-run`으로 남기며, console/summary/report에 context, 분리된
stderr, 재현 명령을 출력하도록 보강합니다.

**Architecture:** release-grade Node runner는 phase orchestration과 최상위 first-failure
diagnostics를 소유합니다. Legacy/compatibility `verify-predev --fail-fast`는 실제 duration
case 실행과 서버 lifecycle을 유지하되 case 사이에 fail-fast 경계를 두고, 첫 실패 뒤
남은 case를 명시적 `not-run`으로 기록합니다. Fast contract fixture는 실제 30분/120분을
기다리지 않고 동일한 실패·stderr·재현 계약을 실행 검증합니다.

**Tech stack:** Node.js ESM, Bash, `server.sh`, JSON/Markdown evidence, 기존 v3.9 R1
longrun runner/contract.

## Task 1 — 실행 전 등록과 RED

- [x] `V390-ADD1-10`을 roadmap, feature/test inventory, release test definition에 등록합니다.
- [x] contract에 첫 실패 즉시 중단, later case `not-run`, `context`, `stderrTail`,
  `reproductionCommand` assertion을 먼저 추가합니다.
- [x] 기존 runner에 새 진단 계약이 없어 contract가 실패하는 RED를 보존합니다.

## Task 2 — delegated case loop first-fail

- [x] `verify_predev_stability.sh --fail-fast`에서 soak case 사이의 실패 경계를 확인합니다.
- [x] 첫 실패 뒤 같은 iteration의 남은 case와 future iteration을 실행하지 않고
  `not-run`으로 기록합니다.
- [x] build/start/integrated-smoke/main-idle/queue 경계도 cleanup/report를 제외한 이후
  일반 case를 실행하지 않습니다.
- [x] stdout/stderr 파일과 stderr tail, case context, 재현 명령을 predev step summary에
  분리 기록합니다.

## Task 3 — top-level diagnostics

- [x] `verify_v390_server_longrun.mjs`가 phase stdout/stderr를 분리 수집합니다.
- [x] 첫 실패 순간 console에 phase/case/context/stderr/reproduction command를 출력합니다.
- [x] summary의 `failure`와 failed phase, Markdown report에 동일한 진단 필드를 보존합니다.
- [x] delegated predev summary의 첫 실패와 later `not-run` 순서를 검증하고 상위 evidence에
  보존합니다.

## Task 4 — 안정화와 기록

- [x] longrun contract의 fixture failure/pass/delegated failure를 실행합니다.
- [x] `verify-v390-longrun-runner-role-alignment`, longrun separation/trigger matrix,
  acceptance contract, inventory/docs/script gate와 `git diff --check`를 실행합니다.
- [x] 실제 30분/120분은 최신 요청에 duration 실행 승인이 없으므로 실행하지 않고
  non-duration contract evidence와 분리합니다.
- [x] 최초 RED, 수정, 최종 PASS, 임시 산출물 cleanup, 미실행 경계를 release test records와
  roadmap에 기록한 뒤 현재 단계만 커밋합니다.
