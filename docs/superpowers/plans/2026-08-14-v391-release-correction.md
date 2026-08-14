# v3.9.1 Release Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the published v3.9.0 release while producing a v3.9.1 source release candidate that fixes tag-following correctness drift, public repository hygiene, documentation truth, release evidence structure, and UI asset currency, then proves it with fresh release tests.

**Architecture:** Keep historical release decisions immutable, separate current source metadata from latest-published metadata, and reduce tracked evidence to bounded summaries/manifests/screenshots. Move public-readiness rules into a testable library so path, content, large-text, and artifact-policy checks fail closed before raw evidence is removed.

**Tech Stack:** C++17/CMake, GStreamer 1.28+, Node.js ESM verifier scripts, shell dispatch through `server.sh`, Markdown/JSON release metadata, Codex in-app browser UI verification.

## Global Constraints

- Preserve the signed `v3.9.0` tag and its GitHub Release; do not force-update or delete either.
- Work only on branch `v3.9.1`, based on `7063480ae92b92b1d25dad29369de738749e3751`.
- Do not change feature logic, API schema, event payload, WebRTC/SSE/WS metadata schema, or RTSP/WebRTC media paths.
- Keep latest published metadata at `v3.9.0` until v3.9.1 is actually published; set current source metadata to `3.9.1`.
- Keep historical FAIL/not-run facts and first-failure summaries; do not retain reproducible raw runtime registries/logs/ports/seeds/traces in the public Git tree.
- Normalize personal home paths and ephemeral `/tmp` paths to repository-relative paths or stable placeholders.
- Run tests in order and stop at the first failure; mark all later stages `건너뜀`.
- Do not commit, push, create a PR, merge, tag, or create a GitHub Release without the corresponding explicit user approval.

---

### Task 1: Lock v3.9.1 source and published-version semantics

**Files:**
- Modify: `VERSION`
- Modify: `CMakeLists.txt:3`
- Modify: `scripts/internal/verify_release_metadata_consistency.mjs:70-78`
- Modify: `README.md:5-42`
- Modify: `README.en.md:5-42`
- Modify: `docs/README.md:7-30`
- Modify: `docs/development-backlog.md:1-180`
- Create: `docs/release-artifacts/v3.9.1/release-notes-draft.md`
- Test: `scripts/internal/verify_release_metadata_consistency.mjs`

**Interfaces:**
- Consumes: `VERSION`, CMake `project(media_server VERSION ...)`, GitHub latest-published tag `v3.9.0`.
- Produces: current source version `3.9.1`, current roadmap `v3.9.1 Release Correctness and Public Repository Hygiene`, and unchanged latest-published tag `v3.9.0` until publication.

- [ ] **Step 1: Change the metadata verifier expectation first**

Set the verifier constants to:

```js
const latestPublishedTag = "v3.9.0";
const currentRoadmap = "v3.9.1 Release Correctness and Public Repository Hygiene";
const latestPublishedBaseline = "v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation";
const previousPublishedTag = "v3.8.0";
```

Add assertions that `currentTag === "v3.9.1"`, the READMEs say current source `3.9.1`, and no current-status paragraph calls v3.8 the latest release.

- [ ] **Step 2: Run the verifier and confirm RED**

Run: `./server.sh verify-release-metadata`

Expected: FAIL because `VERSION`, CMake, README, backlog, and UI asset metadata still identify source `3.9.0`.

- [ ] **Step 3: Update source metadata and current-status documents**

Write `3.9.1` to `VERSION` and CMake. Update current-source wording to v3.9.1 while preserving the truthful statement that the latest published GitHub Release is v3.9.0. Add draft release notes with these fixed sections: Summary, Correctness Fixes, Public Repository Hygiene, Documentation, Verification, Not Run/Excluded, Source-only Scope.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
./server.sh verify-release-metadata
./server.sh verify-docs-links
git diff --check
```

Expected: all exit 0; published metadata remains external-not-checked and latest-published remains v3.9.0.

- [ ] **Step 5: Record commit eligibility without committing**

Run: `git status --short`

Record changed files and state `커밋 미수행—사용자 승인 필요`.

---

### Task 2: Make public-readiness scanning fail closed

**Files:**
- Create: `scripts/internal/public_repo_readiness_lib.mjs`
- Create: `scripts/internal/verify_public_repo_readiness_contract.mjs`
- Modify: `scripts/internal/verify_public_repo_readiness.mjs`
- Modify: `config/public_repo_policy.json`
- Modify: `server.sh:1184,2971-2974`
- Modify: `scripts/internal/verify_script_inventory.mjs`
- Test: `scripts/internal/verify_public_repo_readiness_contract.mjs`

**Interfaces:**
- Consumes: public policy JSON and tracked file paths/content.
- Produces: `scanTrackedTextFile(filePath, relativePath, policy)`, `findDeniedContent(text, policy)`, `isDeniedArtifactPath(relativePath, policy)`, and command `./server.sh verify-public-repo-readiness-contract`.

- [ ] **Step 1: Add the negative contract test**

The contract test must create isolated temporary fixtures and assert detection of:

```js
const cases = [
  { path: "docs/report.md", text: "/Users/example/private/repo", id: "personal-home-path" },
  { path: "docs/release-artifacts/v3.9.1/run/auth-registry", text: "{}", id: "raw-release-artifact" },
  { path: "docs/release-artifacts/v3.9.1/run/server.log", text: "ok", id: "raw-release-artifact" },
  { path: "test/fixtures/large.json", text: `${"x".repeat(2 * 1024 * 1024)}ghp_${"A".repeat(24)}`, id: "github-token" },
];
```

It must also assert that `docs/release-artifacts/v3.9.1/final/summary.json` and repository-relative paths are allowed.

- [ ] **Step 2: Confirm RED**

Run: `node scripts/internal/verify_public_repo_readiness_contract.mjs`

Expected: FAIL because the reusable library and large-text/path checks do not exist.

- [ ] **Step 3: Extract the scanner library and extend policy**

Implement these policy keys:

```json
{
  "deniedTrackedContentPatterns": [
    { "id": "personal-home-path", "pattern": "(?:^|[\\\"' ])/(?:Users|home)/[^/\\s]+/" },
    { "id": "ephemeral-private-tmp", "pattern": "/private/var/folders/[^\\s\\\"']+" }
  ],
  "deniedReleaseArtifactBasenames": [
    "auth-registry", "registry.json", "seed.json", "ports.json", "server.log", "trace.log"
  ],
  "trackedTextExtensions": [
    ".md", ".json", ".jsonl", ".mjs", ".js", ".ts", ".cpp", ".cc", ".h", ".hpp", ".txt", ".html", ".yml", ".yaml", ".sh"
  ]
}
```

Read large text sequentially without the current 2 MiB exclusion. Binary allowlisted assets must never be decoded as text.

- [ ] **Step 4: Add dispatch and inventory ownership**

Add `verify-public-repo-readiness-contract` to `server.sh` usage/case dispatch and `verify_script_inventory.mjs`.

- [ ] **Step 5: Verify contract GREEN and current tree RED**

Run:

```bash
./server.sh verify-public-repo-readiness-contract
./server.sh verify-public-repo-readiness --no-history
```

Expected: contract PASS; readiness FAIL listing current personal paths/raw artifacts. This RED is the required precondition for Task 3.

---

### Task 3: Redact tracked personal and ephemeral paths

**Files:**
- Modify: every tracked text file reported by `verify-public-repo-readiness --no-history`
- Modify: `docs/public-repo-final-review.md`
- Test: `scripts/internal/verify_public_repo_readiness.mjs`

**Interfaces:**
- Consumes: exact finding list emitted by Task 2.
- Produces: repository-relative source paths and stable `${REPO_ROOT}`, `${TMPDIR}`, `<workspace>` placeholders with no personal username.

- [ ] **Step 1: Save the exact pre-redaction census outside the repository**

Run:

```bash
./server.sh verify-public-repo-readiness --no-history --report /tmp/media_server_v391_public_before.md
git grep -Il -e '/Users/' -e '/home/' -e '/private/var/folders/' -- docs test scripts > /tmp/media_server_v391_path_files.txt
```

Expected: verifier exit 1 and `/tmp/media_server_v391_path_files.txt` contains the exact tracked-file scope.

- [ ] **Step 2: Normalize paths mechanically**

For each file in the census, replace repository-root prefixes with `${REPO_ROOT}/`, temporary run roots with `${TMPDIR}/media-server-run/`, and unrelated home paths with `<workspace>/`. Do not change hashes, PASS/FAIL status, timestamps, counts, or command semantics.

- [ ] **Step 3: Verify no personal path remains**

Run:

```bash
git grep -n -E '/Users/[^/[:space:]]+|/home/[^/[:space:]]+|/private/var/folders/' -- docs test scripts
./server.sh verify-public-repo-readiness --no-history
```

Expected: grep returns no matches; readiness may still fail only for raw artifact paths handled in Task 4.

- [ ] **Step 4: Verify format integrity**

Run:

```bash
git diff --check
./server.sh verify-docs-links
```

Expected: exit 0.

---

### Task 4: Minimize tracked release evidence without erasing history

**Files:**
- Modify: `config/public_repo_policy.json`
- Modify: `docs/release-evidence-index.md`
- Modify: `docs/release-test-records.md`
- Modify: `scripts/internal/verify_v390_final_evidence_integrity.mjs`
- Modify: `scripts/internal/verify_v390_test_acceptance_bundle_contract.mjs`
- Delete: policy-denied raw child logs, registries, seeds, port files, and traces under `docs/release-artifacts/`
- Preserve: bounded `summary.json`, report summary, first-failure summary, Policy v4 evaluation, canonical screenshots, hashes, and release notes
- Test: `scripts/internal/verify_v390_final_evidence_integrity_contract.mjs`
- Test: `scripts/internal/verify_v390_test_acceptance_bundle_contract.mjs`

**Interfaces:**
- Consumes: historical final/failure package semantics and current evidence integrity contracts.
- Produces: minimal evidence packages whose integrity is proved by summary/manifests rather than raw runtime state.

- [ ] **Step 1: Resolve the exact raw-file deletion set**

Run:

```bash
git ls-files 'docs/release-artifacts/**' | grep -E '(^|/)(auth-registry|registry\.json|seed\.json|ports\.json|[^/]*\.log|[^/]*trace[^/]*)$' > /tmp/media_server_v391_raw_artifacts.txt
while IFS= read -r file; do rg -n -F "$file" scripts test docs server.sh || true; done < /tmp/media_server_v391_raw_artifacts.txt
```

Classify every file as unreferenced raw output or a referenced child. A referenced child must be replaced by summary/manifest consumption before deletion.

- [ ] **Step 2: Change integrity contracts first**

Update contract fixtures so canonical evidence requires these semantic fields rather than raw child paths:

```js
const requiredEvidence = [
  "sourceCommit", "command", "status", "startedAt", "finishedAt",
  "firstFailure", "counts", "cleanup", "policyEvaluation", "artifactHashes"
];
```

Add a negative fixture proving that removing `firstFailure`, `counts`, or `artifactHashes` fails while absence of raw registry/log paths is allowed.

- [ ] **Step 3: Confirm contract RED**

Run:

```bash
./server.sh verify-v390-final-evidence-integrity-contract
./server.sh verify-v390-test-acceptance-bundle-contract
```

Expected: FAIL until verifier consumers use the minimal contract.

- [ ] **Step 4: Implement minimal evidence consumption and remove raw files**

Change the two verifier consumers to read summary/manifests only. Remove only the exact paths from `/tmp/media_server_v391_raw_artifacts.txt` whose semantic content is represented in the preserved summary/manifests.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
./server.sh verify-v390-final-evidence-integrity-contract
./server.sh verify-v390-test-acceptance-bundle-contract
./server.sh verify-public-repo-readiness --no-history
git diff --check
```

Expected: all exit 0.

---

### Task 5: Correct public documentation roles, dependency truth, and information architecture

**Files:**
- Modify: `README.md:180-230`
- Modify: `README.en.md:160-210`
- Modify: `docs/README.md`
- Modify: `docs/en/README.md`
- Modify: `docs/development-guide.md:20-40`
- Modify: `THIRD_PARTY_NOTICES.md:1-30`
- Modify: `DEPENDENCY_SNAPSHOT.md:1-30`
- Modify: `docs/manual-ui-checklist.md:1-20`
- Modify: `docs/manual-ui-fulltest.md:1-25`
- Modify: `docs/stream-verification.md:40-75`
- Modify: `docs/project-feature-test-inventory.md:95-130`
- Modify: `docs/v390-feature-completion-inventory.md:25-50,160-190`
- Modify: `docs/release-test-records.md:1-50`
- Modify: `docs/release-evidence-index.md:1-70`
- Modify: `docs/superpowers/plans/2026-08-13-v390-release-closeout.md`
- Create: `scripts/internal/verify_v391_documentation_truth.mjs`
- Modify: `server.sh`
- Modify: `scripts/internal/verify_script_inventory.mjs`

**Interfaces:**
- Consumes: admin-only `/ops/users` implementation, CMake GStreamer `>=1.28`, v3.9.0 published status, v3.9.1 current source status.
- Produces: `./server.sh verify-v391-documentation-truth` enforcing current/historical boundaries and public-index exclusions.

- [ ] **Step 1: Write the documentation truth verifier**

Require:

```js
assert(!readmeOperatorLine.includes("사용자"));
assert(!readmeEnOperatorLine.includes("users"));
assert(readme.includes("사용자 관리는 admin 전용"));
assert(readmeEn.includes("User management is admin-only"));
assert(developmentGuide.includes("GStreamer 1.28"));
assert(thirdParty.includes("minimum supported version: 1.28"));
assert(dependencySnapshot.includes("minimum supported version: 1.28"));
```

Reject public-index links containing `release-test-records`, `release-evidence-index`, `v390-current-state`, `v390-full-status`, `/superpowers/`, `project-feature-test-inventory`, or `v390-ui-automation-coverage-matrix`.

- [ ] **Step 2: Confirm RED**

Run: `node scripts/internal/verify_v391_documentation_truth.mjs`

Expected: FAIL on the operator/users wording, public index links, dependency wording, and stale current-status sections.

- [ ] **Step 3: Correct documents without rewriting historical snapshots**

Separate admin-only user management, reduce README verification commands to `./server.sh test --full` plus the stream-verification link, remove internal test/evidence/spec links from `docs/README.md`, and label retained v3.8/v3.9 pending rows as historical snapshots. Update the release-test current header to say v3.9.0 is published and v3.9.1 is the active correction source.

- [ ] **Step 4: Add dispatch and verify GREEN**

Run:

```bash
./server.sh verify-v391-documentation-truth
./server.sh verify-release-metadata
./server.sh verify-docs-links
./server.sh verify-script-inventory
git diff --check
```

Expected: all exit 0.

---

### Task 6: Compact generated fixtures without changing consumer schemas

**Files:**
- Create: `scripts/internal/generated_fixture_serialization.mjs`
- Create: `scripts/internal/verify_v391_generated_fixture_size_contract.mjs`
- Modify: `scripts/internal/feature_implementation_manifest_lib.mjs:284`
- Modify: `scripts/internal/v390_ui_native_exact_cases_lib.mjs:881-882`
- Modify: `scripts/internal/verify_v390_review4_feature_semantic_source_audit.mjs:86,127`
- Modify: `server.sh`
- Modify: `scripts/internal/verify_script_inventory.mjs`
- Modify: `test/fixtures/project_feature_implementation_evidence.json`
- Modify: `test/fixtures/v390_ui_native_exact_cases.json`
- Modify: `test/fixtures/v390_review4_feature_semantic_source_audit.json`
- Modify: `docs/release-evidence-index.md`
- Test: `scripts/internal/verify_v391_generated_fixture_size_contract.mjs`
- Test: existing generator/consumer contracts enumerated in Step 1

**Interfaces:**
- Consumes: canonical generator objects and all existing direct `JSON.parse` consumers.
- Produces: `serializeGeneratedFixture(value)` returning compact canonical JSON plus one trailing newline; file paths, parsed objects, record ordering, schemas, and semantic digests remain unchanged.

- [ ] **Step 1: Enumerate exact producers and consumers**

Run:

```bash
rg -n 'project_feature_implementation_evidence|v390_ui_native_exact_cases|v390_review4_feature_semantic_source_audit' scripts/internal server.sh test docs/project-feature-test-inventory.md
```

Record every command and consumer before editing.

- [ ] **Step 2: Add a size and round-trip contract before changing generators**

Create `verify_v391_generated_fixture_size_contract.mjs`. It must parse all three fixtures,
serialize each parsed object with `serializeGeneratedFixture`, parse the result again, and assert
deep equality. It must also require every serialized file to remain below `20 * 1024 * 1024`
bytes and contain no indentation-only lines.

- [ ] **Step 3: Confirm RED**

Run: `node scripts/internal/verify_v391_generated_fixture_size_contract.mjs`

Expected: FAIL because the helper does not exist and the 26.2 MB implementation fixture exceeds
the 20 MiB v3.9.1 generated-fixture ceiling.

- [ ] **Step 4: Implement compact canonical serialization and regenerate fixtures**

Implement:

```js
export function serializeGeneratedFixture(value) {
  return `${JSON.stringify(value)}\n`;
}
```

Use it only for the three canonical generated fixture outputs. Regenerate the fixtures through their
existing producers. Do not alter their JSON schema, property values, array ordering, paths, or direct
consumer APIs.

- [ ] **Step 5: Verify GREEN and measure reduction**

Add `verify-v391-generated-fixture-size-contract` to `server.sh` and the script inventory. Run that
command and all existing generator/consumer contracts enumerated in Step 1, then:

```bash
du -ch test/fixtures/project_feature_implementation_evidence* test/fixtures/v390_ui_native_exact_cases* test/fixtures/v390_review4_feature_semantic_source_audit*
git diff --check
```

Expected: semantic contracts PASS, parsed objects remain equal, and each file is below 20 MiB.
If a regenerated file still exceeds 20 MiB, stop and return to design review before introducing shards.

---

### Task 7: Ignore runtime media directories and clean local artifacts

**Files:**
- Modify: `.gitignore`
- Delete locally only: approved ignored runtime/test/build/cache outputs after census
- Preserve locally: `models/` and the four explicitly listed local sample/import media files unless a later test regenerates them

**Interfaces:**
- Consumes: ignored-file census and runtime defaults from `include/core/analysis_runtime_defaults.h`.
- Produces: ignore coverage for `.media_server.va_clips/` and `.media_server.va_snapshots/`, plus before/after cleanup evidence outside Git.

- [ ] **Step 1: Add an ignore regression check and confirm RED**

Run:

```bash
git check-ignore .media_server.va_clips/probe .media_server.va_snapshots/probe
```

Expected: exit 1 because neither runtime path is ignored.

- [ ] **Step 2: Add exact ignore entries**

Add:

```gitignore
.media_server.va_clips/
.media_server.va_snapshots/
```

- [ ] **Step 3: Confirm GREEN**

Run the same `git check-ignore` command.

Expected: both paths are printed and exit 0.

- [ ] **Step 4: Record cleanup targets and sizes before deletion**

Record `du -sk` and file counts for `.media_server.test`, `build-gst-onnx`, runtime JSON/JSONL/log files, `.media_server.reset-backups`, Python caches, `.superpowers`, and `.DS_Store` to `/tmp/media_server_v391_cleanup_before.txt`.

- [ ] **Step 5: Remove only approved reproducible targets**

Remove `.media_server.test`, `build-gst-onnx`, `.media_server.alert_deliveries.jsonl`, `.media_server.alert_delivery_attempts.jsonl`, `.media_server.analysis_registry.json`, `.media_server.event_reviews.jsonl`, `.media_server.log`, `.media_server.ops_audit.jsonl`, `.media_server.reset-backups`, `.media_server.sources.json`, `.media_server.users.json`, `.media_server.va_events.jsonl`, `.media_server.views.json`, `.superpowers`, Python `__pycache__`, and `.DS_Store`. Do not remove models or sample media.

- [ ] **Step 6: Record cleanup result**

Run `git status --ignored --short` and save the remaining ignored census to `/tmp/media_server_v391_cleanup_after.txt`. Confirm no tracked file was removed unintentionally.

---

### Task 8: Recapture and directly review the 20 managed documentation images

**Files:**
- Modify if visually changed: `docs/assets/ui/*.png`
- Modify if visually changed: `docs/assets/ui/en/*.png`
- Review: `docs/assets/va-four-scene-overlay-ko.jpg`
- Review: `docs/assets/va-four-scene-sample.png`
- Modify: `config/docs_ui_assets.json`
- Modify: `docs/assets/ui/README.md`
- Test: `scripts/internal/verify_docs_ui_assets.mjs`

**Interfaces:**
- Consumes: current v3.9.1 UI, dark theme, `va_four_scene_sample.mp4`, manifest capture tasks.
- Produces: 18 current Korean/English PNG captures, two reviewed VA images, a 2026-08-14 source binding, and direct-review results.

- [ ] **Step 1: Change the manifest verifier expectation first**

Require `baseline.sourceVersion === "3.9.1"`, `baseline.capturedAt === "2026-08-14"`, latest published release `v3.9.0`, and a direct-review record covering all 20 paths.

- [ ] **Step 2: Confirm RED**

Run: `./server.sh verify-docs-ui-assets`

Expected: FAIL because sourceVersion/capturedAt/direct review still describe the 2026-05-23 baseline.

- [ ] **Step 3: Start the current server and capture through the Codex in-app browser**

Use the documented fixture setup and dark theme. Capture each Korean and English route represented by the 9 manifest tasks. Do not use Chrome/CDP fallback unless the user separately authorizes that exception.

- [ ] **Step 4: Directly inspect all 20 images**

For each image record: opened, correct route/language/theme, current controls/status, crop/blur result, video/overlay visibility where applicable, and absence of source URL, raw JSON, debug counter, model path, credentials, and session material.

- [ ] **Step 5: Update manifest and policy record**

Set sourceVersion `3.9.1`, capturedAt `2026-08-14`, preserve publishedRelease `v3.9.0`, and record direct review without calling the images UI-fulltest or release publication evidence.

- [ ] **Step 6: Verify GREEN**

Run:

```bash
./server.sh verify-docs-ui-assets
./server.sh verify-docs-links
git diff --check
```

Expected: all exit 0.

---

### Task 9: Run focused stabilization and build

**Files:**
- Modify only if a test exposes a defect within Tasks 1-8; otherwise none
- Record: `docs/release-test-records.md`
- Record: `docs/release-evidence-index.md`
- Record: `docs/release-artifacts/v3.9.1/release-notes-draft.md`

**Interfaces:**
- Consumes: completed Tasks 1-8.
- Produces: fresh local release-gate results tied to the current working-tree diff.

- [ ] **Step 1: Run static and focused gates in order**

```bash
git diff --check
./server.sh verify-release-metadata
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-public-repo-readiness
./server.sh verify-public-repo-readiness-contract
./server.sh verify-v391-documentation-truth
./server.sh verify-script-inventory
./server.sh verify-release-evidence-index
./server.sh verify-release-closeout-helper --dry-run
```

- [ ] **Step 2: Stop on the first failure**

Record the exact failing command and mark build and all later tests `건너뜀`. Apply `superpowers:systematic-debugging` before changing any implementation.

- [ ] **Step 3: Build**

Run: `./server.sh build`

Expected: exit 0 with no build failure.

- [ ] **Step 4: Run current feature/semantic regression**

Run the v3.9 feature, structure, semantic, and acceptance contract commands listed by `./server.sh verify-v390-stabilization-release-readiness` and `docs/project-feature-test-inventory.md`. Do not count fixture-only PASS as duration or UI PASS.

- [ ] **Step 5: Update records truthfully**

Record commands, source working-tree hash/diff identity, PASS/FAIL/not-run status, and exclusions. Do not claim clean-clone or longrun PASS yet.

- [ ] **Step 6: Report commit-ready state and request explicit commit approval**

Run `git status --short`, `git diff --stat`, and `git diff --check`. Stop before committing.

---

### Task 10: Commit-approved clean clone and full release acceptance

**Files:**
- Create during test: bounded `docs/release-artifacts/v3.9.1/test-acceptance-current-final/` evidence only
- Modify after test: `docs/release-test-records.md`
- Modify after test: `docs/release-evidence-index.md`
- Modify after test: `docs/release-artifacts/v3.9.1/release-notes-draft.md`

**Interfaces:**
- Consumes: a user-approved v3.9.1 commit containing Tasks 1-9.
- Produces: commit-bound clean-clone build, 30-minute, actual UI 424/424, Policy v4, 120-minute, integrity, and cleanup evidence.

- [ ] **Step 1: After explicit approval, commit the reviewed release-correction changes**

Stage only the reviewed v3.9.1 files. Use a release-correction commit message approved at that time. Confirm `git show --stat --oneline HEAD` and the exact source commit.

- [ ] **Step 2: Create a separate `--no-local` clean clone**

Clone the repository into a `mktemp -d` directory from the committed v3.9.1 source. Confirm the clone HEAD equals the source commit and ignored local state is absent.

- [ ] **Step 3: Run preflight and build in the clone**

Run version, metadata, docs, public-readiness, inventory, semantic gates and `./server.sh build`. Stop on first failure.

- [ ] **Step 4: Run 30-minute server longrun**

Run the v3.9 acceptance runner's exact 30-minute stage. Require real elapsed-duration evidence and preserve only bounded summaries/manifests.

- [ ] **Step 5: Run actual browser UI fulltest**

Execute all 424 canonical cases in the actual browser, then run Policy v4 qualification. Require `424 PASS / 0 FAIL / 0 not-run` unless the canonical policy explicitly records an allowed excluded category; do not accept replay/fixture-only substitution.

- [ ] **Step 6: Run 120-minute server longrun**

Run the exact 120-minute stage after 30-minute and UI success. Require real elapsed-duration evidence.

- [ ] **Step 7: Run final integrity and cleanup**

Verify source commit binding, first-failure retention, counts, artifact hashes, Policy v4 result, and cleanup. Delete clone runtime/build/raw evidence, retaining only the bounded v3.9.1 package copied into the source tree.

- [ ] **Step 8: Re-run static gates after evidence recording**

```bash
git diff --check
./server.sh verify-release-metadata
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-public-repo-readiness
./server.sh verify-release-evidence-index
./server.sh verify-release-closeout-helper --dry-run
```

- [ ] **Step 9: Report final local release readiness**

Report all command results, skipped/excluded field smokes, changed files, regression risk, cleanup, commit status, and whether push is allowed. Do not push, create PR, merge, tag, or create the GitHub Release without new explicit approvals.

---

## Plan Self-Review

- Spec coverage: version/source truth, role/dependency docs, public index, evidence redaction/minimization, fail-closed gate, generated fixture debt, runtime ignore/cleanup, 20 UI images, build, 30-minute, UI/Policy v4, 120-minute, clean clone, and release-action boundaries are each assigned to Tasks 1-10.
- Placeholder scan: no unresolved marker or deferred implementation instruction remains.
- Interface consistency: `verify-public-repo-readiness-contract` and `verify-v391-documentation-truth` have one exact `server.sh` command name throughout; v3.9.1 is current source and v3.9.0 remains latest published until external publication.
- Scope boundary: no feature logic, API, metadata schema, or media path change is included.
- Commit boundary: Tasks 1-9 stop at commit eligibility; Task 10 begins only after explicit commit approval.
