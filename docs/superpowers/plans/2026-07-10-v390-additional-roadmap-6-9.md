# v3.9.0 Additional Roadmap 6-9 Implementation Plan

> **For agentic workers:** Follow the repository Superpowers plan/execution discipline: register every changed feature/test item before execution, prove RED where applicable, implement one numbered roadmap item at a time, rerun from the failed boundary, record evidence, and commit only the completed current item.

**Goal:** Close V390-ADD1-06 through V390-ADD1-09 with an actual acceptance entrypoint, complete v3.9 UI cases, a native free automation adapter, and DOM/action-based assertions that cannot pass from embedded script strings.

**Architecture:** Keep product API/schema/media/auth contracts unchanged. Extend only test orchestration, UI automation adapters/assertions, fixtures, and evidence documentation. The acceptance runner owns ordered execution and stop-on-first-fail; the UI runner owns native browser actions and structured DOM/state assertions.

**Tech stack:** Node.js ESM scripts, `server.sh`, existing v3.9 longrun/UI runners, bundled Playwright runtime, JSON fixtures, Markdown evidence.

## Task 1 — V390-ADD1-06 Actual acceptance bundle

- [ ] Register roadmap, inventory, and release test definitions before RED.
- [ ] RED: run the non-dry command and preserve its current rejection.
- [ ] Add actual phases: preflight → build → feature gates → real 30-minute runner → actual UI automation → conditional 120-minute decision → cleanup → report.
- [ ] Add fixture pass/fail modes proving stop-on-first-fail and later `not-run` without waiting 30 minutes.
- [ ] Keep published metadata and release actions outside this command.
- [ ] Run contract, actual 30-minute acceptance command, artifact replay, cleanup, docs/inventory gates, and `git diff --check`.
- [ ] Record the initial failure and final evidence, then commit Step 6 only.

## Task 2 — V390-ADD1-07 UI-108 through UI-115 completeness

- [ ] Add `UI-112` and require the exact contiguous set `UI-108`…`UI-115`.
- [ ] Define route, control/action, expected state, failure state, artifact, console, and server-log evidence for every case.
- [ ] Add negative fixtures for missing, duplicate, and out-of-range v3.9 case IDs.
- [ ] Run the actual eight-case automation suite and replay verifier.
- [ ] Record and commit Step 7 only.

## Task 3 — V390-ADD1-08 Native free automation adapter

- [ ] Resolve native Playwright from workspace or bundled Codex dependencies without network installation.
- [ ] Fail preflight with an actionable dependency message when the requested native adapter is absent; never label `chrome-cdp-fallback` as native Playwright.
- [ ] Implement adapter methods for wait, query/assert, click, type, select, evaluate, and screenshot.
- [ ] Record native engine/module/browser provenance and reproduction command.
- [ ] Run actual native Playwright evidence and replay verification.
- [ ] Record and commit Step 8 only.

## Task 4 — V390-ADD1-09 False-PASS prevention

- [ ] Remove `outerHTML`, whole-page substring, and script-source marker success criteria.
- [ ] Express each case as visible DOM selectors, text/state predicates, and concrete user actions.
- [ ] Require pre-action state, action success, post-action state, and absence of forbidden state.
- [ ] Add adversarial fixtures where marker text exists only in script/hidden DOM and require FAIL.
- [ ] Run actual native eight-case suite, negative contracts, replay guard, inventories/docs, and `git diff --check`.
- [ ] Record and commit Step 9 only.

## Fixed test-category decision

| 테스트 카테고리 | 판정 | 직접 근거 | 실행 승인 상태 |
| --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | 6~9가 runner, fixture, DOM/action assertion, evidence를 직접 변경 | 최신 goal에서 6~9 개발 승인 |
| 30분 테스트 | 진행 대상 | 6번이 build→feature→30분→UI 실제 단일 진입점을 명시 | 최신 goal에서 6번 실제 acceptance 승인 |
| 120분 테스트 | 조건부 진행 | 6번이 조건부 120분을 명시하며 AGENTS 7.6.2 trigger가 필요 | trigger 확인 시에만 실행 |
| UI 풀테스트 | 미진행 | 7~9는 native 자동화 adapter/evidence 범위이며 Codex 인앱 브라우저 전체 수동 UI 지시가 아님 | 직접 UI 풀테스트 승인 없음 |
