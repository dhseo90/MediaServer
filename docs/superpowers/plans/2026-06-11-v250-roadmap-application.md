# v2.5.0 Roadmap Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v2.5.0 Semantic Incident Memory 로드맵을 현재 branch의 버전, 문서 source-of-truth, 정적 release metadata gate에 반영한다.

**Architecture:** 이번 작업은 source-of-truth 정렬 전용이다. `VERSION`/CMake, README 계열 문서, release/version/backlog 문서, UI asset manifest, release metadata verifier가 같은 v2.5.0 active roadmap을 말하게 하고, v2.4.0 릴리즈 증적은 historical evidence로 보존한다.

**Tech Stack:** Markdown, JSON manifest, Node.js release metadata verifier, CMake metadata.

---

### Task 1: 현재 버전 기준 전환

**Files:**
- Modify: `VERSION`
- Modify: `CMakeLists.txt`

- [ ] **Step 1: VERSION 갱신**

`VERSION` 값을 `2.5.0`으로 바꾼다.

- [ ] **Step 2: CMake project version 갱신**

`CMakeLists.txt`의 `project(media_server VERSION 2.5.0 LANGUAGES CXX)`가 `VERSION`과 일치하게 한다.

- [ ] **Step 3: 검증**

Run: `./server.sh verify-release-metadata`

Expected: VERSION/CMake mismatch가 없어야 한다. 문서 drift가 나오면 Task 2에서 함께 고친다.

### Task 2: 공개 진입 문서의 active roadmap 정렬

**Files:**
- Modify: `README.md`
- Modify: `README.en.md`
- Modify: `docs/README.md`
- Modify: `docs/en/README.md`

- [ ] **Step 1: 최신 공개 release와 현재 target 분리**

최신 공개 release는 `v2.4.0`, 현재 release target은 `v2.5.0`으로 표기한다.

- [ ] **Step 2: v2.5.0 로드맵 이름 반영**

문서 첫 화면과 색인에서 active roadmap을 `v2.5.0 Semantic Incident Memory`로 표기한다.

- [ ] **Step 3: 비범위 유지**

실기기 ONVIF, external TURN/WHEP, real cloud provider call, VLM default-on, media/schema 변경을 release PASS 조건으로 쓰지 않는다고 명시한다.

### Task 3: release/version/backlog source-of-truth 정렬

**Files:**
- Modify: `docs/versioning-policy.md`
- Modify: `docs/release-policy.md`
- Modify: `docs/development-backlog.md`
- Modify: `docs/public-repo-final-review.md`
- Modify: `docs/project-feature-test-inventory.md`

- [ ] **Step 1: versioning policy 갱신**

현재 기준 버전과 source-only release 기준 tag를 `v2.5.0`으로 둔다. 최신 공개 release 기준은 `v2.4.0 Operator Event Review & Action Workflow`로 둔다.

- [ ] **Step 2: release policy 갱신**

`v2.5.0 Release Target Runbook`을 현재 target으로 추가하고, v2.4.0 release readiness/test evidence는 archive 성격으로 남긴다.

- [ ] **Step 3: backlog 갱신**

상단 active roadmap에 V250-S00~S09를 추가한다. V250-S00은 source-of-truth 정렬 단계이고, V250-S01~S09는 구현 예정으로 둔다.

- [ ] **Step 4: inventory 갱신**

기능별 inventory가 현재 release 목표 `v2.5.0`을 가리키게 하되, 신규 기능 ID는 구현 단계에서 실제 행을 추가한다고 명시한다.

### Task 4: static gate 기준 갱신

**Files:**
- Modify: `config/docs_ui_assets.json`
- Modify: `docs/assets/ui/README.md`
- Modify: `docs/ui-guide.md`
- Modify: `scripts/internal/verify_release_metadata_consistency.mjs`

- [ ] **Step 1: UI asset baseline tag 갱신**

문서 대표 이미지는 v2.5.0 문서 baseline으로 유지하되, 새 UI 직접 확인 evidence로 쓰지 않는다고 명시한다.

- [ ] **Step 2: release metadata verifier 갱신**

Verifier의 active roadmap 기대값을 `v2.5.0 Semantic Incident Memory`로 바꾼다.

- [ ] **Step 3: 최종 검증**

Run:

```bash
git diff --check
./server.sh verify-release-metadata
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-project-inventory
```

Expected: 각 명령은 exit code 0이어야 한다. 실패하면 실패한 gate가 직접 검사한 범위 안에서 수정하고 같은 명령부터 재실행한다.
