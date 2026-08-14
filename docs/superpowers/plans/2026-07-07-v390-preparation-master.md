# v3.9.0 Preparation Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

독자: MediaServer 개발/검증 에이전트. Lifecycle: historical initial v3.9.0 준비·기능 완성 발견 실행 계획이며, current claim은 `V390-REVIEW4-50`/`V390-REVIEW4-51`에 의해 superseded되었습니다. 아래 당시 계획·RED·수치는 과거 사실로 보존하지만 현재 구조 실행 버전·상태 evidence로 사용하지 않습니다. Current source-of-truth는 `AGENTS.md`, `docs/development-backlog.md`, `docs/v390-feature-completion-inventory.md`, `docs/release-test-records.md`, `test/fixtures/v390_structure_execution_scope_decision.json`입니다.

**Goal:** Establish the v3.9.0 baseline, create the feature-completion inventory system, discover unfinished v1.0.0-v3.8.0 functionality, and stop for user review before feature development.

**Architecture:** This plan creates a high-level v3.9 status board in `docs/development-backlog.md`, a detailed completion inventory in `docs/v390-feature-completion-inventory.md`, and static verifier gates that ensure those documents stay wired into `server.sh`, feature inventory, release records, and script inventory. It intentionally stops after discovery classification so actual feature-development waves can be planned from real findings instead of guessed.

**Tech Stack:** Markdown source-of-truth docs, Node.js verifier scripts, shell dispatch in `server.sh`, existing MediaServer static verifier patterns, `rg`-based read-only discovery commands.

---

## Scope Check

The approved spec covers three large subsystems: feature completion, structure stabilization, and test model transition. This master plan implements only the first working slice:

1. v3.9 baseline alignment
2. feature completion inventory infrastructure
3. read-only discovery and classification report
4. user review gate before development

Do not implement structure refactors, longrun wrapper changes, UI automation migration, or feature-gap fixes in this plan. Those require follow-up plans after the discovery inventory is reviewed.

## File Structure

Create:

- `docs/v390-feature-completion-inventory.md`: detailed v3.9 source-of-truth for incomplete, partial, candidate, deferred, and excluded feature gaps.
- `scripts/internal/verify_v390_entry_baseline.mjs`: static verifier for v3.9 source/version/docs/backlog/test-record baseline wiring.
- `scripts/internal/verify_v390_feature_completion_inventory.mjs`: static verifier for required inventory sections, column names, disposition vocabulary, and AGENTS four-test-area mapping.

Modify:

- `VERSION`: source version becomes `3.9.0`.
- `CMakeLists.txt`: `project(media_server VERSION 3.9.0 LANGUAGES CXX)`.
- `README.md`, `README.en.md`, `docs/README.md`, `docs/en/README.md`: current source version and roadmap become v3.9.0 while latest published remains v3.8.0 until release action evidence exists.
- `docs/versioning-policy.md`, `docs/release-policy.md`, `docs/public-repo-final-review.md`, `docs/ui-guide.md`, `docs/assets/ui/README.md`: v3.9 source target wording and not-run boundaries.
- `docs/development-backlog.md`: high-level v3.9 phase board and Phase 0/1 records.
- `docs/stream-verification.md`: v3.9 verifier rows.
- `docs/project-feature-test-inventory.md`: v3.9 inventory/verifier coverage rows and reserved feature IDs.
- `docs/release-test-records.md`: v3.9 RED/final verifier result rows and not-run boundaries.
- `docs/release-evidence-index.md`: v3.9 local evidence index entries without release-action completion claims.
- `scripts/internal/verify_script_inventory.mjs`: include the two new verifier scripts in tracked script coverage.
- `scripts/internal/verify_project_feature_test_inventory.mjs`: extend allowed ID ranges if new IDs are added.
- `scripts/internal/verify_feature_inventory_coverage.mjs`: map new v3.9 verifier commands to the new feature IDs.
- `server.sh`: usage and dispatch for the two new verifier commands.

Do not modify product route/API/media/auth/schema behavior in this plan.

---

### Task 1: RED Baseline And Inventory Commands

**Files:**
- Read: `server.sh`
- Record later: `docs/release-test-records.md`

- [ ] **Step 1: Run missing v3.9 entry command**

Run:

```bash
./server.sh verify-v390-entry-baseline
```

Expected: FAIL with unknown command wording such as `알 수 없는 명령입니다: verify-v390-entry-baseline`.

- [ ] **Step 2: Run missing v3.9 inventory command**

Run:

```bash
./server.sh verify-v390-feature-completion-inventory
```

Expected: FAIL with unknown command wording such as `알 수 없는 명령입니다: verify-v390-feature-completion-inventory`.

- [ ] **Step 3: Record RED boundary in notes, not as PASS**

Record these two failures in the implementation notes for `docs/release-test-records.md` later:

```text
| v390 Step 1 RED entry baseline gate | 최초 `./server.sh verify-v390-entry-baseline`은 command dispatch가 아직 없어 unknown command로 실패. v3.9 baseline verifier를 추가하기 전 기대 실패이며 제품 회귀가 아님 | fail |
| v390 Step 2 RED feature completion inventory gate | 최초 `./server.sh verify-v390-feature-completion-inventory`는 command dispatch가 아직 없어 unknown command로 실패. inventory verifier를 추가하기 전 기대 실패이며 제품 회귀가 아님 | fail |
```

Do not edit files in this task.

---

### Task 2: Version And Public Baseline Alignment

**Files:**
- Modify: `VERSION`
- Modify: `CMakeLists.txt`
- Modify: `README.md`
- Modify: `README.en.md`
- Modify: `docs/README.md`
- Modify: `docs/en/README.md`

- [ ] **Step 1: Update source version files**

Change `VERSION` to:

```text
3.9.0
```

Change the CMake project line to:

```cmake
project(media_server VERSION 3.9.0 LANGUAGES CXX)
```

- [ ] **Step 2: Update Korean public entry wording**

In `README.md` and `docs/README.md`, keep the latest published release as `v3.8.0` and change current source wording to:

```text
- 최신 공개 GitHub Release: [v3.8.0](https://github.com/dhseo90/MediaServer/releases/tag/v3.8.0)
- 현재 소스 버전: `3.9.0`
- v3.9.0 준비 상태: source-only 준비 브랜치. Binary, runtime, model bundle은 포함하지 않음
- 현재 source roadmap: `v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation`
```

Use this roadmap paragraph:

```text
## v3.9 Source Roadmap

- 최신 공개 릴리즈: `v3.8.0` Operator-Gated Action Pilot & Outcome Loop, source-only.
- 현재 소스: `3.9.0` Feature Completion, Structure Stabilization, and Test Model Preparation.
- v3.9 로드맵: v1.0.0부터 v3.8.0까지 노출/약속/부분 구현된 기능을 전수 확인하고, v4.0.0 구조 안정화와 새 테스트 체계로 넘어가기 전 필요한 기능 완성 항목을 닫습니다.
- 최신 공개 기준: v3.8.0 Operator-Gated Action Pilot & Outcome Loop는 published baseline이며, v3.9.0은 아직 publish evidence가 없는 준비 브랜치입니다.
```

- [ ] **Step 3: Update English public entry wording**

In `README.en.md` and `docs/en/README.md`, keep latest published as `v3.8.0` and change current source wording to:

```text
- Latest published GitHub Release: [v3.8.0](https://github.com/dhseo90/MediaServer/releases/tag/v3.8.0)
- Current source version: `3.9.0`
- v3.9.0 preparation status: source-only preparation branch. Binary, runtime, and model bundles are not included.
- Current source roadmap: `v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation`
```

Use this roadmap paragraph:

```text
## v3.9 Source Roadmap

- Latest published release: `v3.8.0` Operator-Gated Action Pilot & Outcome Loop, source-only.
- Current source: `3.9.0` Feature Completion, Structure Stabilization, and Test Model Preparation.
- The v3.9 roadmap audits exposed, promised, and partially implemented functionality from v1.0.0 through v3.8.0, completes necessary feature gaps before v4.0.0, then prepares structure stabilization and the new test model.
- Latest published baseline: v3.8.0 Operator-Gated Action Pilot & Outcome Loop. v3.9.0 is a preparation branch with no publish evidence yet.
```

- [ ] **Step 4: Run metadata check to observe expected remaining drift**

Run:

```bash
./server.sh verify-release-metadata
```

Expected: FAIL or drift until `scripts/internal/verify_release_metadata_consistency.mjs` and release/version docs are updated in later tasks. Record the exact failing fields. Do not report v3.9 baseline complete yet.

---

### Task 3: High-Level v3.9 Backlog Board

**Files:**
- Modify: `docs/development-backlog.md`
- Read: `docs/superpowers/specs/2026-07-07-v390-preparation-design.md`

- [ ] **Step 1: Replace current active source roadmap header**

At the top of `docs/development-backlog.md`, set:

```text
- 현재 소스 버전: `3.9.0`
- 최신 공개 GitHub Release: `v3.8.0`
- `v3.9.0` 준비 상태: source-only preparation branch. Binary, runtime, model bundle은 포함하지 않습니다.
- 현재 source roadmap: `v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation`
- 최신 published baseline: `v3.8.0 Operator-Gated Action Pilot & Outcome Loop`
```

- [ ] **Step 2: Add v3.9 roadmap section above v3.8 history**

Insert this section before the existing v3.8 roadmap:

```markdown
## 현재 source roadmap: v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation

상태: Foundation 단계에서 baseline과 feature completion inventory/discovery를 먼저 진행합니다. Discovery 결과를 사용자에게 보고하고 승인받기 전에는 미완성 기능 개발, 구조 안정화 리팩토링, 테스트 방식 전환 구현으로 넘어가지 않습니다.

직접 답: v3.9.0의 1차 선택값은 `Feature Completion First with Dedicated Inventory`입니다.
v3.8까지 앞으로 나아간 프로젝트를 멈춰 세우고, v1.0.0부터 v3.8.0까지 노출/약속/부분 구현된 기능을 전수 확인해 v4.0.0 구조 안정화 전에 필요한 기능을 닫습니다.

비범위:

- discovery 승인 전 미완성 기능 임의 개발
- feature completion close-out 전 구조 전면 리팩토링 착수
- 새 테스트 모델을 다섯 번째 AGENTS 테스트 영역으로 추가
- Event POST payload, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path 변경
- Auth/Role/Scope, SourceRegistry/PublishedView, Rule/Profile 저장 payload 계약 변경
- viewer/client에 source locator, credential, raw diagnostic JSON, operator-only blocker detail 노출
- 사용자 승인 없는 30분/120분/UI 풀테스트, PR, main merge, tag, GitHub Release, 후속 브랜치 생성

| 구간 | 제목 | 우선순위 | 개발 내용 |
| --- | --- | --- | --- |
| Foundation | v3.9.0 (1) v3.9.0 baseline 정렬 | P0 | VERSION/CMake/README/docs/backlog/source roadmap을 `3.9.0` 준비 브랜치와 `verify-v390-entry-baseline` 기준으로 정렬 |
| Foundation | v3.9.0 (2) Feature Completion Inventory/Discovery Gate | P0 | `docs/v390-feature-completion-inventory.md`를 만들고 작은 기능까지 추적하는 필드/상태/테스트 매핑 기준을 고정 |
| Discovery | v3.9.0 (3) v1.0.0-v3.8.0 Feature Completion Discovery | P0 | docs/route/API/UI/verifier/release evidence를 대조해 미구현/부분 구현/검증 누락/구조 안정화 이관 후보를 전수 후보화 |
| Review Gate | v3.9.0 (3) User Review Gate | P0 | Required development, candidate development, structure-stabilization handoff, excluded/non-scope를 보고하고 사용자 승인 전 개발 중단 |
| Feature Development | v3.9.0 (4+) Required Feature Development Waves | P0/P1/P2 | Discovery 승인 후 별도 계획으로 필요한 기능을 개발 |
| Structure | v3.9.0 Structure Stabilization | P0/P1 | Feature completion close-out 뒤 동작 변경 없이 구조 안정화 계획으로 전환 |
| Testing | v3.9.0 Test Model Preparation | P0/P1 | v4.0 테스트 모델 전환을 위해 서버 longrun wrapper와 UI 자동화 도구 평가/계획으로 전환 |
| Release | v3.9.0 Stabilization and Release Readiness | P0 | AGENTS 네 테스트 영역 판정, evidence, cleanup, release close-out dry-run을 실제 실행/미실행으로 분리 |

### v3.9.0 진행 상태

| 번호 | 제목 | 우선순위 | 상태 | 완료/잔여 내용 |
| --- | --- | --- | --- | --- |
| 1 | v3.9.0 (1) v3.9.0 baseline 정렬 | P0 | 진행 | VERSION/CMake/docs/backlog/source roadmap과 `verify-v390-entry-baseline` 기준 정렬 필요 |
| 2 | v3.9.0 (2) Feature Completion Inventory/Discovery Gate | P0 | 진행 | `docs/v390-feature-completion-inventory.md`와 `verify-v390-feature-completion-inventory` 필요 |
| 3 | v3.9.0 (3) v1.0.0-v3.8.0 Feature Completion Discovery | P0 | 미진행 | 문서/route/API/UI/verifier/release evidence 직접 대조 필요 |
| 3 | v3.9.0 (3) User Review Gate | P0 | 미진행 | discovery 결과 승인 전 기능 개발 금지 |
```

- [ ] **Step 3: Keep v3.8 as history**

Rename the old v3.8 active section heading to:

```markdown
## previous published baseline: v3.8.0 Operator-Gated Action Pilot & Outcome Loop
```

Do not delete v3.8 evidence or completion records.

---

### Task 4: Feature Completion Inventory Document

**Files:**
- Create: `docs/v390-feature-completion-inventory.md`

- [ ] **Step 1: Create the inventory with fixed columns and vocabulary**

Create `docs/v390-feature-completion-inventory.md` with this content:

```markdown
# v3.9.0 Feature Completion Inventory

독자: MediaServer 개발/검증 에이전트. Lifecycle: v3.9.0 feature completion discovery와 개발 close-out 동안 유지되는 상세 source-of-truth. Source-of-truth 관계: `AGENTS.md`가 권한/테스트/보고 규칙을 우선하고, `docs/development-backlog.md`는 큰 phase 상태판이며, 이 문서는 작은 기능 단위의 완료 여부를 추적한다.

## Purpose

이 문서는 v1.0.0부터 v3.8.0까지 노출, 약속, 부분 구현된 기능 중 v4.0.0 구조 안정화 전에 닫아야 할 기능 gap을 전수 추적한다.

이 문서는 구현 완료 evidence가 아니다. 각 행은 해당 route/API/UI/function/verifier/test evidence가 생기고 통과해야 닫힌다.

## Disposition Vocabulary

| Disposition | 의미 | 개발 전 사용자 승인 |
| --- | --- | --- |
| required-development | v3.9 기능 완성 단계에서 반드시 개발해야 하는 항목 | discovery 보고 승인 후 진행 |
| candidate-development | 제품 완성도상 유용하지만 필수 여부를 사용자에게 확인해야 하는 항목 | 개별 승인 후 진행 |
| structure-stabilization-handoff | 기능 개발이 아니라 구조 안정화/리팩토링 단계로 넘길 항목 | 구조 안정화 계획 승인 후 진행 |
| excluded-non-scope | v3.9 범위 밖이거나 제품 경계/불변 조건을 넘는 항목 | 개발하지 않음 |
| closed-with-evidence | 구현/검증/evidence가 모두 확인되어 닫힌 항목 | 추가 개발 없음 |

## Test Area Vocabulary

테스트 영역은 AGENTS 기준 네 가지 `안정화`, `30분`, `120분`, `UI`만 사용한다.
wrapper, preflight, dry-run, field smoke, external credential, no-device는 별도 테스트 영역이 아니다.

## Discovery Table

| Feature ID | Source | Current State | Required Development | Completion Condition | Stabilization | 30min | 120min | UI Fulltest | v3.9 Disposition | Invariant Impact | Evidence / Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| V390-DISCOVERY-000 | approved design | inventory seed row | Create and verify this inventory before adding feature candidates | `verify-v390-feature-completion-inventory` passes and discovery rows are added before development | required | not-run | not-run | not-run | required-development | none | This seed row prevents an empty inventory from being mistaken for completed discovery. |

## Discovery Sources To Check

| Source Group | Files / Targets | Status | Notes |
| --- | --- | --- | --- |
| Public entry docs | `README.md`, `README.en.md`, `docs/README.md`, `docs/en/README.md` | pending | Find promised current product flows and version drift. |
| Roadmap and policy | `docs/development-backlog.md`, `docs/release-policy.md`, `docs/versioning-policy.md` | pending | Find roadmap promises, not-run boundaries, release gate claims. |
| Test source-of-truth | `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`, `docs/release-test-records.md`, `docs/release-evidence-index.md` | pending | Find verifier scope, missing test mappings, old evidence boundaries. |
| Product UI docs | `docs/ui-guide.md`, `docs/manual-ui-fulltest.md`, `docs/manual-ui-checklist.md`, `docs/manual-ui-result-template.md` | pending | Find UI controls, routes, roles, route/control/action expectations. |
| Server routes/API | `src/ingress/webrtc_http_server.cpp`, `src/ingress/*.cpp`, `include/ingress/*.h` | pending | Find route/API surfaces and partial read models. |
| Product UI source | `src/ingress/product_ui_*.cpp`, `src/ingress/product_ui_*.h` | pending | Find panels, scripts, CSS, controls, empty/error states. |
| Analysis/core/media | `src/analysis/*`, `include/analysis/*`, `src/core/*`, `include/core/*` | pending | Find feature hooks, storage, scenario, event, media path candidates. |
| Verifier dispatch | `server.sh`, `scripts/internal/verify_*.mjs`, `scripts/internal/verify_*.sh`, `scripts/internal/verify_*.py` | pending | Find verifier gaps and stale v3.8-only assumptions. |

## Review Gate

Discovery is not complete until:

- every source group above is marked checked
- every candidate has one of the approved dispositions
- required/candidate development rows have concrete completion conditions
- test area columns are filled with `required`, `conditional`, `not-run`, or `excluded`
- invariant impact is explicitly recorded
- the user reviews and approves the required/candidate development list
```

- [ ] **Step 2: Do not add real candidate rows before discovery**

The seed row `V390-DISCOVERY-000` is allowed. Add real feature rows only after running Task 8 discovery commands and reading the relevant files.

---

### Task 5: v3.9 Entry Baseline Verifier And Dispatch

**Files:**
- Create: `scripts/internal/verify_v390_entry_baseline.mjs`
- Modify: `server.sh`
- Modify: `scripts/internal/verify_script_inventory.mjs`

- [ ] **Step 1: Create entry baseline verifier**

Create `scripts/internal/verify_v390_entry_baseline.mjs` with this complete body:

```javascript
#!/usr/bin/env node
// 파일 용도: v3.9.0 source baseline, roadmap, docs, verifier 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 entry baseline verification

Usage:
  ./server.sh verify-v390-entry-baseline

Checks:
  - VERSION/CMake and public docs identify source 3.9.0
  - latest published release remains v3.8.0 until release action evidence exists
  - v3.9.0 roadmap selection is Feature Completion, Structure Stabilization, and Test Model Preparation
  - backlog, stream verification, release records, feature inventory, completion inventory, and dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-entry-baseline";
const inventoryCommand = "verify-v390-feature-completion-inventory";
const currentVersion = "3.9.0";
const currentRoadmap = "v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation";
const latestPublishedTag = "v3.8.0";
const latestPublishedBaseline = "v3.8.0 Operator-Gated Action Pilot & Outcome Loop";

const files = {
  cmake: readText("CMakeLists.txt"),
  readme: readText("README.md"),
  readmeEn: readText("README.en.md"),
  docsIndex: readText("docs/README.md"),
  docsEnIndex: readText("docs/en/README.md"),
  versioning: readText("docs/versioning-policy.md"),
  releasePolicy: readText("docs/release-policy.md"),
  publicReview: readText("docs/public-repo-final-review.md"),
  uiGuide: readText("docs/ui-guide.md"),
  assetPolicy: readText("docs/assets/ui/README.md"),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  completionInventory: readText("docs/v390-feature-completion-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidence: readText("docs/release-evidence-index.md"),
  releaseMetadataVerifier: readText("scripts/internal/verify_release_metadata_consistency.mjs"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  serverSh: readText("server.sh"),
};

const version = readText("VERSION").trim();
const checks = [];

check("source version is v3.9.0 and CMake matches", () => {
  assert(version === currentVersion, `VERSION must be ${currentVersion}, got ${version}`);
  assertIncludes(files.cmake, "project(media_server VERSION 3.9.0 LANGUAGES CXX)", "CMake project version");
});

check("public entry docs pin source v3.9.0 and published v3.8.0", () => {
  const expectations = [
    ["README.md", files.readme, "현재 소스 버전: `3.9.0`", `현재 source roadmap: \`${currentRoadmap}\``],
    ["README.en.md", files.readmeEn, "Current source version: `3.9.0`", `Current source roadmap: \`${currentRoadmap}\``],
    ["docs/README.md", files.docsIndex, "현재 소스 버전: `3.9.0`", `현재 source roadmap: \`${currentRoadmap}\``],
    ["docs/en/README.md", files.docsEnIndex, "Current source version: `3.9.0`", `Current source roadmap: \`${currentRoadmap}\``],
  ];
  for (const [label, text, sourceSnippet, roadmapSnippet] of expectations) {
    assertIncludes(text, sourceSnippet, label);
    assertIncludes(text, roadmapSnippet, label);
    assertIncludes(text, latestPublishedTag, label);
    assertIncludes(text, "source-only", label);
    assertIncludes(text, latestPublishedBaseline, label);
  }
});

check("versioning and release policy pin v3.9 source and v3.8 published baseline", () => {
  for (const snippet of [
    "현재 소스 버전: `3.9.0`",
    `현재 source roadmap: \`${currentRoadmap}\``,
    "최신 공개 GitHub Release: `v3.8.0`",
    "## 3.9.0 active source roadmap 범위",
    "Feature Completion, Structure Stabilization, and Test Model Preparation",
    latestPublishedBaseline,
  ]) {
    assertIncludes(files.versioning, snippet, "versioning policy");
  }
  for (const snippet of [
    "현재 소스 버전: `3.9.0`",
    "최신 공개 GitHub Release: `v3.8.0`",
    `현재 source roadmap은 \`${currentRoadmap}\`입니다.`,
    "## v3.9.0 Source Roadmap Scope",
    "v3.9.0 (1) v3.9.0 baseline 정렬",
    latestPublishedBaseline,
  ]) {
    assertIncludes(files.releasePolicy, snippet, "release policy");
  }
});

check("roadmap records v3.9 phases and discovery gate", () => {
  for (const snippet of [
    `## 현재 source roadmap: ${currentRoadmap}`,
    "Feature Completion First with Dedicated Inventory",
    "| Foundation | v3.9.0 (1) v3.9.0 baseline 정렬 | P0 |",
    "| Foundation | v3.9.0 (2) Feature Completion Inventory/Discovery Gate | P0 |",
    "| Discovery | v3.9.0 (3) v1.0.0-v3.8.0 Feature Completion Discovery | P0 |",
    "| Review Gate | v3.9.0 (3) User Review Gate | P0 |",
    "discovery 결과 승인 전 기능 개발 금지",
  ]) {
    assertIncludes(files.backlog, snippet, "development backlog");
  }
});

check("completion inventory exists and is linked", () => {
  for (const snippet of [
    "# v3.9.0 Feature Completion Inventory",
    "Disposition Vocabulary",
    "Discovery Table",
    "Review Gate",
    "V390-DISCOVERY-000",
  ]) {
    assertIncludes(files.completionInventory, snippet, "feature completion inventory");
  }
  assertIncludes(files.backlog, "docs/v390-feature-completion-inventory.md", "development backlog");
  assertIncludes(files.streamVerification, inventoryCommand, "stream verification");
  assertIncludes(files.releaseRecords, inventoryCommand, "release records");
});

check("stream verification, feature inventory, release records, and evidence expose v3.9 gates", () => {
  for (const snippet of [
    "| v3.9.0 (1) | `./server.sh verify-v390-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` |",
    "| v3.9.0 (2) | `./server.sh verify-v390-feature-completion-inventory` |",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification");
  }
  for (const snippet of [
    "현재 release 목표 `v3.9.0`",
    "v3.9.0 (1) v3.9.0 baseline 정렬",
    "v3.9.0 (2) Feature Completion Inventory/Discovery Gate",
    command,
    inventoryCommand,
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory");
  }
  for (const snippet of [
    "v390 Step 1 RED entry baseline gate",
    "v390 Step 1 entry baseline final",
    "v390 Step 2 RED feature completion inventory gate",
    "v390 Step 2 feature completion inventory final",
    "v390 discovery user review gate",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records");
  }
  assertIncludes(files.releaseEvidence, "v3.9.0", "release evidence index");
  assertIncludes(files.releaseEvidence, command, "release evidence index");
  assertIncludes(files.releaseEvidence, inventoryCommand, "release evidence index");
});

check("server entrypoint and inventory verifiers include v3.9 gates", () => {
  assertIncludes(files.serverSh, command, "server.sh");
  assertIncludes(files.serverSh, "verify_v390_entry_baseline.mjs", "server.sh");
  assertIncludes(files.serverSh, inventoryCommand, "server.sh");
  assertIncludes(files.serverSh, "verify_v390_feature_completion_inventory.mjs", "server.sh");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  assertIncludes(files.featureCoverageVerifier, inventoryCommand, "feature coverage verifier");
  assertIncludes(files.projectInventoryVerifier, "SAFE-196", "project inventory verifier SAFE-196");
  assertIncludes(files.projectInventoryVerifier, "OPS-163", "project inventory verifier OPS-163");
  assertIncludes(files.projectInventoryVerifier, "`SAFE-001`~`SAFE-197`", "project inventory SAFE range");
  assertIncludes(files.projectInventoryVerifier, "`OPS-035`~`OPS-164`", "project inventory OPS range");
  assertIncludes(files.scriptInventory, "verify_v390_entry_baseline.mjs", "script inventory");
  assertIncludes(files.scriptInventory, "verify_v390_feature_completion_inventory.mjs", "script inventory");
});

for (const [label, text] of [
  ["docs/public-repo-final-review.md", files.publicReview],
  ["docs/ui-guide.md", files.uiGuide],
  ["docs/assets/ui/README.md", files.assetPolicy],
]) {
  check(`${label} pins v3.9 source wording`, () => {
    assertIncludes(text, "3.9.0", label);
    assertIncludes(text, "v3.9.0", label);
    assertIncludes(text, "Feature Completion, Structure Stabilization, and Test Model Preparation", label);
  });
}

check("release metadata verifier expects v3.9 source with v3.8 latest published", () => {
  assertIncludes(files.releaseMetadataVerifier, 'const currentVersion = "3.9.0";', "release metadata verifier");
  assertIncludes(files.releaseMetadataVerifier, 'const latestPublishedTag = "v3.8.0";', "release metadata verifier");
  assertIncludes(files.releaseMetadataVerifier, `const currentRoadmap = "${currentRoadmap}";`, "release metadata verifier");
});

const results = runChecks();
console.log("");
console.log("== v3.9.0 entry baseline summary ==");
console.log("- schema: media-server.v390-entry-baseline.v1");
console.log(`- currentVersion: ${version}`);
console.log("- latestPublishedTag: v3.8.0");
console.log(`- currentRoadmap: ${currentRoadmap}`);
console.log("- featureImplementation: not-run-by-this-command");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

function runChecks() {
  let pass = 0;
  let fail = 0;
  for (const item of checks) {
    try {
      item.fn();
      pass += 1;
      console.log(`[pass] ${item.name}`);
    } catch (error) {
      fail += 1;
      console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { pass, fail };
}

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}
```

- [ ] **Step 2: Make the script executable**

Run:

```bash
chmod +x scripts/internal/verify_v390_entry_baseline.mjs
```

Expected: command exits 0.

- [ ] **Step 3: Wire `server.sh` usage and dispatch**

Add this usage line near the v3.8 verifier usage block:

```text
  verify-v390-entry-baseline
                 v3.9.0 source baseline과 feature completion preparation 경계를 검증합니다.
```

Add this case near the v3.8 verifier dispatch block:

```bash
  verify-v390-entry-baseline)
    require_internal verify_v390_entry_baseline.mjs
    exec "${INTERNAL_DIR}/verify_v390_entry_baseline.mjs" "$@"
    ;;
```

- [ ] **Step 4: Add the script to script inventory**

In `scripts/internal/verify_script_inventory.mjs`, add:

```javascript
"verify_v390_entry_baseline.mjs",
```

near the v3.8 verifier scripts.

---

### Task 6: Feature Completion Inventory Verifier And Dispatch

**Files:**
- Create: `scripts/internal/verify_v390_feature_completion_inventory.mjs`
- Modify: `server.sh`
- Modify: `scripts/internal/verify_script_inventory.mjs`

- [ ] **Step 1: Create inventory verifier**

Create `scripts/internal/verify_v390_feature_completion_inventory.mjs` with this complete body:

```javascript
#!/usr/bin/env node
// 파일 용도: v3.9.0 feature completion inventory 구조와 판정 어휘를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 feature completion inventory verification

Usage:
  ./server.sh verify-v390-feature-completion-inventory

Checks:
  - inventory has required sections and columns
  - disposition vocabulary is fixed
  - AGENTS four test areas are preserved
  - discovery sources and review gate are present
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const inventory = readText("docs/v390-feature-completion-inventory.md");
const backlog = readText("docs/development-backlog.md");
const streamVerification = readText("docs/stream-verification.md");
const releaseRecords = readText("docs/release-test-records.md");
const serverSh = readText("server.sh");
const checks = [];

check("inventory declares source-of-truth relationship", () => {
  for (const snippet of [
    "# v3.9.0 Feature Completion Inventory",
    "Source-of-truth 관계",
    "`AGENTS.md`가 권한/테스트/보고 규칙을 우선",
    "`docs/development-backlog.md`는 큰 phase 상태판",
    "작은 기능 단위의 완료 여부를 추적",
  ]) {
    assertIncludes(inventory, snippet, "inventory source-of-truth");
  }
});

check("inventory has fixed disposition vocabulary", () => {
  for (const disposition of [
    "required-development",
    "candidate-development",
    "structure-stabilization-handoff",
    "excluded-non-scope",
    "closed-with-evidence",
  ]) {
    assertIncludes(inventory, disposition, "disposition vocabulary");
  }
});

check("inventory keeps AGENTS four test areas only", () => {
  for (const area of ["안정화", "30분", "120분", "UI"]) {
    assertIncludes(inventory, area, "test area vocabulary");
  }
  for (const phrase of [
    "wrapper, preflight, dry-run, field smoke, external credential, no-device는 별도 테스트 영역이 아니다",
    "Stabilization | 30min | 120min | UI Fulltest",
  ]) {
    assertIncludes(inventory, phrase, "test area boundary");
  }
});

check("discovery table has exact required columns", () => {
  const header = "| Feature ID | Source | Current State | Required Development | Completion Condition | Stabilization | 30min | 120min | UI Fulltest | v3.9 Disposition | Invariant Impact | Evidence / Notes |";
  assertIncludes(inventory, header, "discovery table header");
  assertIncludes(inventory, "V390-DISCOVERY-000", "seed discovery row");
});

check("discovery source groups are present", () => {
  for (const group of [
    "Public entry docs",
    "Roadmap and policy",
    "Test source-of-truth",
    "Product UI docs",
    "Server routes/API",
    "Product UI source",
    "Analysis/core/media",
    "Verifier dispatch",
  ]) {
    assertIncludes(inventory, group, "discovery source group");
  }
});

check("review gate prevents development before approval", () => {
  for (const phrase of [
    "Discovery is not complete until",
    "the user reviews and approves the required/candidate development list",
    "development list",
  ]) {
    assertIncludes(inventory, phrase, "review gate");
  }
  assertIncludes(backlog, "discovery 결과 승인 전 기능 개발 금지", "backlog review gate");
});

check("server and docs expose inventory verifier", () => {
  for (const [label, text] of [
    ["server.sh", serverSh],
    ["docs/stream-verification.md", streamVerification],
    ["docs/release-test-records.md", releaseRecords],
  ]) {
    assertIncludes(text, "verify-v390-feature-completion-inventory", label);
  }
});

const results = runChecks();
console.log("");
console.log("== v3.9.0 feature completion inventory summary ==");
console.log("- schema: media-server.v390-feature-completion-inventory.v1");
console.log("- featureDevelopment: not-run-by-this-command");
console.log("- discoveryComplete: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

function runChecks() {
  let pass = 0;
  let fail = 0;
  for (const item of checks) {
    try {
      item.fn();
      pass += 1;
      console.log(`[pass] ${item.name}`);
    } catch (error) {
      fail += 1;
      console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { pass, fail };
}

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}
```

- [ ] **Step 2: Make the script executable**

Run:

```bash
chmod +x scripts/internal/verify_v390_feature_completion_inventory.mjs
```

Expected: command exits 0.

- [ ] **Step 3: Wire `server.sh` usage and dispatch**

Add this usage line:

```text
  verify-v390-feature-completion-inventory
                 v3.9.0 기능 완성 인벤토리 구조와 discovery review gate를 검증합니다.
```

Add this dispatch case:

```bash
  verify-v390-feature-completion-inventory)
    require_internal verify_v390_feature_completion_inventory.mjs
    exec "${INTERNAL_DIR}/verify_v390_feature_completion_inventory.mjs" "$@"
    ;;
```

- [ ] **Step 4: Add the script to script inventory**

In `scripts/internal/verify_script_inventory.mjs`, add:

```javascript
"verify_v390_feature_completion_inventory.mjs",
```

near the v3.9 entry baseline verifier.

---

### Task 7: Verification Records And Feature Inventory Wiring

**Files:**
- Modify: `docs/stream-verification.md`
- Modify: `docs/project-feature-test-inventory.md`
- Modify: `docs/release-test-records.md`
- Modify: `docs/release-evidence-index.md`
- Modify: `docs/versioning-policy.md`
- Modify: `docs/release-policy.md`
- Modify: `docs/public-repo-final-review.md`
- Modify: `docs/ui-guide.md`
- Modify: `docs/assets/ui/README.md`
- Modify: `scripts/internal/verify_project_feature_test_inventory.mjs`
- Modify: `scripts/internal/verify_feature_inventory_coverage.mjs`
- Modify: `scripts/internal/verify_release_metadata_consistency.mjs`

- [ ] **Step 1: Add stream verification rows**

Insert near the current verifier section in `docs/stream-verification.md`:

```markdown
## 현재 v3.9.0 verifier

아래 명령은 v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation의 현재 source gate입니다.
UI 풀테스트, 30분/120분, published metadata, release action, field smoke는 실행 evidence가 있을 때만 별도로 PASS 근거가 됩니다.

| Step | Command | Scope |
| --- | --- | --- |
| v3.9.0 (1) | `./server.sh verify-v390-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` | source `3.9.0`, latest published `v3.8.0`, current roadmap `v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation` 정렬. v3.9 기능 구현, discovery 완료, UI 풀테스트, 30분/120분, tag, push, GitHub Release evidence와는 별도 gate입니다 |
| v3.9.0 (2) | `./server.sh verify-v390-feature-completion-inventory` | `docs/v390-feature-completion-inventory.md`의 필수 컬럼, disposition vocabulary, AGENTS 네 테스트 영역, discovery source group, user review gate를 확인합니다. 실제 기능 discovery 완료, 미완성 기능 개발, UI 풀테스트, 30분/120분, published metadata evidence가 아닙니다 |
```

- [ ] **Step 2: Add feature inventory rows and ranges**

In `docs/project-feature-test-inventory.md`, set current release target to `v3.9.0` and add:

```markdown
## v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation Coverage Mapping

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| v3.9.0 (1) v3.9.0 baseline 정렬 | `OPS-163`, `SAFE-196` | `verify-v390-entry-baseline`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets` | source `3.9.0`, latest published `v3.8.0`, current roadmap `v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation` 정렬 기준. v3.9 기능 구현, discovery 완료, UI 풀테스트, 30분/120분, GitHub Release publish evidence와는 별도 gate입니다 |
| v3.9.0 (2) Feature Completion Inventory/Discovery Gate | `OPS-164`, `SAFE-197` | `verify-v390-feature-completion-inventory`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory` | `docs/v390-feature-completion-inventory.md`의 필드/상태/테스트 매핑/review gate 기준. 실제 미완성 기능 discovery 완료, 기능 개발, UI 풀테스트, 30분/120분, GitHub Release publish evidence와는 별도 gate입니다 |
```

In `scripts/internal/verify_project_feature_test_inventory.mjs`, extend allowed ranges to include:

```text
`SAFE-001`~`SAFE-197`
`OPS-035`~`OPS-164`
```

Add IDs `SAFE-196`, `SAFE-197`, `OPS-163`, `OPS-164` to the expected ID checks using the existing local pattern.

- [ ] **Step 3: Add feature coverage verifier mappings**

In `scripts/internal/verify_feature_inventory_coverage.mjs`, add the two commands to the existing verifier coverage map:

```javascript
"verify-v390-entry-baseline",
"verify-v390-feature-completion-inventory",
```

Map both under the v3.9 feature ID groups that include `OPS-163`, `OPS-164`, `SAFE-196`, and `SAFE-197`.

- [ ] **Step 4: Add release test records rows**

In `docs/release-test-records.md`, add a `### v3.9.0` section with:

```markdown
### v3.9.0

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| v390 Step 1 RED entry baseline gate | 최초 `./server.sh verify-v390-entry-baseline`은 command dispatch가 아직 없어 unknown command로 실패. v3.9 baseline verifier를 추가하기 전 기대 실패이며 제품 회귀가 아님 | fail |
| v390 Step 2 RED feature completion inventory gate | 최초 `./server.sh verify-v390-feature-completion-inventory`는 command dispatch가 아직 없어 unknown command로 실패. inventory verifier를 추가하기 전 기대 실패이며 제품 회귀가 아님 | fail |
| v390 Step 1 entry baseline final | `./server.sh verify-v390-entry-baseline` 실행. source `3.9.0`, latest published `v3.8.0`, current roadmap `v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation`, release metadata/docs/backlog/stream verification/inventory/server dispatch 연결을 확인. v3.9 기능 구현/discovery/UI/longrun/published metadata는 not-run-by-this-command로 분리 | pass |
| v390 Step 2 feature completion inventory final | `./server.sh verify-v390-feature-completion-inventory` 실행. inventory 필드, disposition vocabulary, AGENTS 네 테스트 영역, discovery source group, review gate를 확인. 실제 discovery 완료, 기능 개발, UI/longrun/published metadata는 not-run-by-this-command로 분리 | pass |
| v390 discovery user review gate | discovery 결과를 사용자에게 보고하고 required/candidate development 승인 전 기능 개발을 중단해야 함. 이 행은 실행 결과가 아니라 review gate 기준이며 실제 승인 전 PASS로 쓰지 않음 | fail |

#### v3.9.0 미실행/제외

| 제목 | 수행내용 | 사유 | 완료 evidence로 사용 가능 여부 |
| --- | --- | --- | --- |
| v390 기능 개발 | required/candidate development 구현 | discovery 결과 사용자 승인 전 미실행 | 사용 불가 |
| v390 구조 안정화 | 구조 전면 리팩토링 | feature completion close-out 전 미실행 | 사용 불가 |
| v390 테스트 방식 전환 구현 | longrun wrapper/UI automation migration | 별도 하위 계획 전 미실행 | 사용 불가 |
| v390 30분 테스트 | `./server.sh verify-predev --soak-minutes 30` | 사용자 실행 승인 전 미실행 | 사용 불가 |
| v390 120분 테스트 | `./server.sh verify-predev --soak-minutes 120` 또는 runtime longrun | 직접 근거/사용자 승인 전 미실행 | 사용 불가 |
| v390 UI 풀테스트 | 제품 UI 직접 조작/자동화 evidence | 사용자 실행 승인 전 미실행 | 사용 불가 |
| v390 published metadata | `./server.sh verify-release-metadata --published` | GitHub Release publish 전 미실행 | 사용 불가 |
```

- [ ] **Step 5: Add release policy/versioning/public review wording**

Add current v3.9 source wording to `docs/versioning-policy.md`, `docs/release-policy.md`, `docs/public-repo-final-review.md`, `docs/ui-guide.md`, and `docs/assets/ui/README.md`:

```text
현재 소스 버전: `3.9.0`
현재 source roadmap: `v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation`
최신 공개 GitHub Release: `v3.8.0`
최신 published baseline: `v3.8.0 Operator-Gated Action Pilot & Outcome Loop`
```

In `docs/release-policy.md`, add:

```markdown
## v3.9.0 Source Roadmap Scope

현재 `3.9.0` source tree는 아래 roadmap 후보를 source 기능과 local verifier 기준으로 준비합니다.

- v3.9.0 (1) v3.9.0 baseline 정렬
- v3.9.0 (2) Feature Completion Inventory/Discovery Gate
- v3.9.0 (3) v1.0.0-v3.8.0 Feature Completion Discovery
- v3.9.0 (3) User Review Gate

`v3.9.0` publish 완료는 tag, GitHub Release, published metadata 검증 evidence가 있을 때만 완료로 기록합니다. 현재 latest published release는 `v3.8.0`입니다.
```

- [ ] **Step 6: Update release metadata verifier**

In `scripts/internal/verify_release_metadata_consistency.mjs`, update constants to expect:

```javascript
const currentVersion = "3.9.0";
const currentTag = "v3.9.0";
const latestPublishedTag = "v3.8.0";
const currentRoadmap = "v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation";
```

Keep published checks requiring actual GitHub evidence only when `--published` is passed.

---

### Task 8: Run Baseline And Inventory Verifiers

**Files:**
- No production code expected

- [ ] **Step 1: Run entry baseline verifier**

Run:

```bash
./server.sh verify-v390-entry-baseline
```

Expected: PASS with `fail: 0`. Output must include:

```text
schema: media-server.v390-entry-baseline.v1
currentVersion: 3.9.0
latestPublishedTag: v3.8.0
featureImplementation: not-run-by-this-command
```

- [ ] **Step 2: Run feature completion inventory verifier**

Run:

```bash
./server.sh verify-v390-feature-completion-inventory
```

Expected: PASS with `fail: 0`. Output must include:

```text
schema: media-server.v390-feature-completion-inventory.v1
featureDevelopment: not-run-by-this-command
discoveryComplete: not-run-by-this-command
```

- [ ] **Step 3: Run companion metadata/docs/inventory checks**

Run:

```bash
./server.sh verify-release-metadata
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-project-inventory
./server.sh verify-feature-inventory-coverage
./server.sh verify-script-inventory
git diff --check
```

Expected: each command exits 0. If a command fails, stop this task and fix only the directly reported drift before rerunning the failed command.

---

### Task 9: Read-Only Feature Completion Discovery

**Files:**
- Modify: `docs/v390-feature-completion-inventory.md`
- Read: docs, server source, UI source, verifier scripts, release records

- [ ] **Step 1: Collect version and roadmap surfaces**

Run:

```bash
rg -n "v3\\.8\\.0|3\\.8\\.0|v3\\.9\\.0|3\\.9\\.0|완료|미완료|pending|not-run|not run|review-required|후속|부분|stub|draft-only" README.md README.en.md docs CMakeLists.txt VERSION
```

Expected: command exits 0 and prints candidate locations. For every current-source `3.8.0` reference outside historical evidence/archive context, add or update a row in `docs/v390-feature-completion-inventory.md`.

- [ ] **Step 2: Collect route/API surfaces**

Run:

```bash
rg -n "request\\.path|/ops/api|/client/api|/lab/analysis|data-testid|route-boundary|readiness|receipt|notice|draft|field|recheck|outcome|stub|draft-only" src include
```

Expected: command exits 0 and prints route/API/UI hook locations. Add rows for partial surfaces where a route/API is present but the related UI, verifier, or completion condition is missing.

- [ ] **Step 3: Collect verifier and script surfaces**

Run:

```bash
rg -n "not-run-by-this-command|UI 풀테스트|30분|120분|published metadata|field smoke|stub|draft-only|v380|v370|v360|verify-v" server.sh scripts/internal docs/stream-verification.md docs/project-feature-test-inventory.md docs/release-test-records.md
```

Expected: command exits 0 and prints verifier/evidence boundaries. Add rows for stale verifier assumptions, missing v3.9 dispatch, missing coverage mappings, or commands whose PASS might be overinterpreted.

- [ ] **Step 4: Read high-risk files directly**

Read these files before classifying route/UI/verification candidates:

```bash
sed -n '1,220p' src/ingress/webrtc_http_server.cpp
sed -n '220,520p' src/ingress/webrtc_http_server.cpp
sed -n '1,220p' src/ingress/product_ui_page_scripts.cpp
sed -n '1,220p' src/ingress/product_ui_css.cpp
sed -n '1,220p' docs/ui-guide.md
sed -n '1,220p' docs/manual-ui-fulltest.md
sed -n '1,220p' docs/manual-ui-result-template.md
```

Expected: each command exits 0. If a file is too large, continue reading only sections identified by `rg` hits. Do not claim full-file review unless the entire file was read.

- [ ] **Step 5: Fill discovery table rows**

For each candidate, add one row using the same fixed vocabulary as this concrete example:

```markdown
| V390-CANDIDATE-001 | `docs/development-backlog.md` + direct route/UI check | partial | Complete the exposed operator flow that the row identifies during discovery | Named route/API/UI/verifier evidence exists and passes for the identified flow | required | conditional | not-run | required | required-development | none | Replace this example row with the discovered feature-specific row before development. |
```

Feature IDs must use existing prefixes when possible. Use temporary IDs `V390-CANDIDATE-001`, `V390-CANDIDATE-002`, and so on only when no stable project prefix is obvious. Replace temporary IDs before implementation.

- [ ] **Step 6: Mark discovery source groups checked**

In the `Discovery Sources To Check` table, change `pending` to `checked` only for source groups actually checked. If a group was only partially read, use `partial` and explain the remaining scope in Notes.

- [ ] **Step 7: Stop for user review**

Do not implement candidate features. Prepare a report with:

```text
Required development:
- V390-CANDIDATE-001: discovered required feature summary and direct reason

Candidate development:
- V390-CANDIDATE-002: discovered candidate feature summary and direct reason

Structure-stabilization handoff:
- V390-CANDIDATE-003: discovered structure-only handoff summary and direct reason

Excluded / non-scope:
- V390-CANDIDATE-004: discovered excluded item summary and direct reason

미확인:
- Product UI source: partial read only, exact unread file list and reason
```

Expected: user review is requested before any feature development begins.

---

### Task 10: Final Verification And Handoff

**Files:**
- Modified docs and verifier scripts from prior tasks

- [ ] **Step 1: Run required final commands**

Run:

```bash
./server.sh verify-v390-entry-baseline
./server.sh verify-v390-feature-completion-inventory
./server.sh verify-release-metadata
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-project-inventory
./server.sh verify-feature-inventory-coverage
./server.sh verify-script-inventory
git diff --check
```

Expected: each command exits 0.

- [ ] **Step 2: Confirm no prohibited tests or release actions were run**

Report:

```text
30분 테스트: 미실행, 이유: 사용자 명시 실행 승인 없음
120분 테스트: 미실행, 이유: 직접 진행 조건/사용자 명시 실행 승인 없음
UI 풀테스트: 미실행, 이유: 사용자 명시 실행 승인 없음
PR/main/tag/GitHub Release/published metadata: 미실행, 이유: 사용자 명시 release action 승인 없음
```

- [ ] **Step 3: Inspect changed files**

Run:

```bash
git status --short
git diff --stat
```

Expected: only v3.9 baseline/inventory/discovery plan files are modified. `.superpowers/` brainstorming artifacts are either left untracked and reported or ignored in a separate user-approved cleanup change.

- [ ] **Step 4: Report commit status without committing automatically**

Report:

```text
커밋:
- 수행하지 않음
- 이유: AGENTS.md 기준 최신 사용자 지시에 커밋 명시 승인 없음

푸시:
- 푸시 가능: 아니오
- 이유: 커밋 미수행 및 discovery user review gate 남음
- 푸시 수행 여부: 수행하지 않음
```

If the user explicitly approves a commit after this task, stage only the files changed for this plan and use:

```bash
git add VERSION CMakeLists.txt README.md README.en.md docs/README.md docs/en/README.md docs/development-backlog.md docs/v390-feature-completion-inventory.md docs/stream-verification.md docs/project-feature-test-inventory.md docs/release-test-records.md docs/release-evidence-index.md docs/versioning-policy.md docs/release-policy.md docs/public-repo-final-review.md docs/ui-guide.md docs/assets/ui/README.md scripts/internal/verify_v390_entry_baseline.mjs scripts/internal/verify_v390_feature_completion_inventory.mjs scripts/internal/verify_script_inventory.mjs scripts/internal/verify_project_feature_test_inventory.mjs scripts/internal/verify_feature_inventory_coverage.mjs scripts/internal/verify_release_metadata_consistency.mjs server.sh
git commit -m "docs: add v3.9 preparation baseline and inventory"
```

Do not push unless the user explicitly requests push.

---

## Self-Review Checklist

Spec coverage:

- v3.9 feature-completion-first direction is covered by Tasks 3, 4, and 9.
- Dedicated feature completion inventory is covered by Tasks 4, 6, and 9.
- User review gate before development is covered by Tasks 3, 4, 9, and 10.
- Structure stabilization and test model transition are deliberately scoped out and deferred to follow-up plans after discovery.
- AI-minimized testing is not implemented here; it is preserved as a future plan target and not misreported as complete.

Plan red-flag scan:

- Dynamic discovery rows are generated by exact commands and exact table vocabulary.

Type/name consistency:

- Command names use `verify-v390-entry-baseline` and `verify-v390-feature-completion-inventory`.
- Script names use `verify_v390_entry_baseline.mjs` and `verify_v390_feature_completion_inventory.mjs`.
- Roadmap name is consistently `v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation`.
