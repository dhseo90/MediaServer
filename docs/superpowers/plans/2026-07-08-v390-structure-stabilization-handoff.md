# v3.9.0 Structure Stabilization Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v3.9.0에서 닫은 기능 동작을 바꾸지 않고 v4.0.0 구조 안정화로 넘길 route/API/UI/docs/VLM 경계를 작업 가능한 단위로 고정한다.

**Architecture:** 이 계획은 behavior-preserving stabilization handoff다. 새 product route, write path, UI control, schema, media path를 만들지 않고, 기존 대형 translation unit과 문서 source-of-truth를 작은 소유권 단위로 나누기 위한 순서와 검증만 정의한다.

**Tech Stack:** C++17, GStreamer/ONNX 기반 MediaServer, `server.sh` verifier dispatch, Node.js static verifier, Markdown release/test evidence.

---

## Handoff Boundary

이 문서는 `V390-STRUCT-001`~`V390-STRUCT-005`의 이관 계획이며 구조 안정화 구현 완료 evidence가 아닙니다. 후속 v4.0.0 또는 별도 승인된 구조 안정화 브랜치에서 각 task를 TDD로 실행합니다.

대상 구조 항목:

- `V390-STRUCT-001`: `src/ingress/webrtc_http_server.cpp` route/API/UI ownership extraction
- `V390-STRUCT-002`: product UI script workspace split
- `V390-STRUCT-003`: source registry read-model naming/status consolidation
- `V390-STRUCT-004`: manual UI result template archive split
- `V390-STRUCT-005`: VLM contract index consolidation

불변 조건: do not change Event POST payload, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope, SourceRegistry/PublishedView, or Rule/Profile payload contracts.

Evidence boundary: UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, PR/main/tag/GitHub Release evidence가 아닙니다.

## File Structure

- Modify later: `src/ingress/webrtc_http_server.cpp`
  - Current route/API/UI glue concentration owner. Future work extracts named route groups and JSON builders without changing responses.
- Modify later: `src/ingress/product_ui_page_scripts.cpp`
  - Ops dashboard/rules/VLM/action workspace script concentration owner. Future work splits stable workspace renderers while preserving test IDs.
- Modify later: `src/ingress/product_ui_ops_sources_script.cpp`
  - Source registry, PublishedView, source health, restore/field handoff UI concentration owner.
- Modify later: `docs/manual-ui-result-template.md`
  - Current manual UI result fields remain current-only; historical v2.x/v3.x material moves behind archive links or appendix boundaries.
- Modify later: VLM docs under `docs/vlm-*.md`
  - A single contract index should link default-off, profile storage, provider field smoke, dry-run, and exclusion boundaries.
- Verify now: `scripts/internal/verify_v390_structure_stabilization_handoff.mjs`
  - Static gate for this handoff plan and release/test records.

### Task 1: Route/API Ownership Extraction Map

**Files:**
- Modify later: `src/ingress/webrtc_http_server.cpp`
- Verify before/after: existing v3.9 verifier family and `./server.sh verify-v390-structure-stabilization-handoff`

- [ ] **Step 1: Write the failing ownership-map test**

```js
// scripts/internal/verify_v400_route_ownership_map.mjs
assertIncludes(routeCatalog, "/ops/api/onvif/credential-provider-status", "ONVIF route group");
assertIncludes(routeCatalog, "/ops/api/vlm/rule-suggestion-draft-bridge", "VLM route group");
assertIncludes(routeCatalog, "/ops/api/actions/execution-deferral-decision", "actions route group");
assertIncludes(routeCatalog, "/ops/api/field-evidence/bridge-decision", "field evidence route group");
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `node scripts/internal/verify_v400_route_ownership_map.mjs`

Expected: FAIL because no route ownership map module exists yet.

- [ ] **Step 3: Extract only named ownership metadata**

Create a read-only route catalog helper or comments-backed catalog first. Do not move handler logic until the catalog passes.

- [ ] **Step 4: Verify behavior is unchanged**

Run: `./server.sh verify-v390-onvif-credential-provider-status`, `./server.sh verify-v390-vlm-rule-suggestion-draft-bridge`, `./server.sh verify-v390-action-execution-deferral-decision`, `./server.sh verify-v390-conditional-field-ai-decisions`, `git diff --check`.

Expected: all PASS; response schema and route guards unchanged.

### Task 2: Product UI Workspace Split Map

**Files:**
- Modify later: `src/ingress/product_ui_page_scripts.cpp`
- Modify later: focused `src/ingress/product_ui_*` script units if the split is approved

- [ ] **Step 1: Write a failing UI workspace split verifier**

```js
assertIncludes(scriptModules, "renderV390ActionExecutionDeferralDecision", "action workspace renderer");
assertIncludes(scriptModules, "renderV390FieldEvidenceBridgeDecision", "field evidence renderer");
assertIncludes(scriptModules, "renderV390ReidAssistDecision", "Re-ID renderer");
assertIncludes(scriptModules, "stable test id preservation", "test id boundary");
```

- [ ] **Step 2: Run the verifier and confirm RED**

Run: `node scripts/internal/verify_v400_product_ui_workspace_split.mjs`

Expected: FAIL because the module split catalog is not present yet.

- [ ] **Step 3: Split one renderer family at a time**

Move one renderer family and its state variables together. Keep DOM IDs, `data-testid`, route labels, and status text unchanged unless a later test explicitly requires a change.

- [ ] **Step 4: Verify UI static gates**

Run: `./server.sh verify-ops-client-ui`, `./server.sh verify-rule-ui`, relevant v3.9 verifier, and `git diff --check`.

Expected: all PASS. This is not UI 풀테스트 직접 조작 evidence.

### Task 3: Source Registry Read-model Boundary Map

**Files:**
- Modify later: `src/ingress/product_ui_ops_sources_script.cpp`
- Modify later: source registry route helpers under the existing ingress ownership boundary

- [ ] **Step 1: Write a failing source read-model verifier**

```js
assertIncludes(sourceBoundary, "SourceRegistry read", "source read boundary");
assertIncludes(sourceBoundary, "PublishedView read", "published view read boundary");
assertIncludes(sourceBoundary, "source health read", "source health boundary");
assertIncludes(sourceBoundary, "handoff read-only", "handoff boundary");
```

- [ ] **Step 2: Run the verifier and confirm RED**

Run: `node scripts/internal/verify_v400_source_registry_read_model_boundary.mjs`

Expected: FAIL because the boundary map has not been created.

- [ ] **Step 3: Create the boundary map before extraction**

Define read/write ownership names and map each existing route/UI panel to one owner. Do not create a new write route.

- [ ] **Step 4: Verify no write/schema drift**

Run: `./server.sh verify-v390-onvif-live-import-persist-decision`, `./server.sh verify-v390-backup-recovery-handoff-validation`, `./server.sh verify-feature-inventory-coverage`, `git diff --check`.

Expected: all PASS.

### Task 4: Manual UI Result Template Archive Plan

**Files:**
- Modify later: `docs/manual-ui-result-template.md`
- Modify later if approved: historical archive docs under `docs/release-artifacts/` or a stable docs appendix

- [ ] **Step 1: Write a failing archive-boundary verifier**

```js
assertIncludes(template, "current gate fields only", "current template boundary");
assertIncludes(template, "historical archive link", "historical archive boundary");
assertNotIncludes(currentTemplateSection, "v2.2");
assertNotIncludes(currentTemplateSection, "v2.4");
```

- [ ] **Step 2: Run the verifier and confirm RED**

Run: `node scripts/internal/verify_v400_manual_ui_result_template_archive.mjs`

Expected: FAIL until the template exposes a current-only section and archive boundary.

- [ ] **Step 3: Split historical material without deleting evidence**

Keep historical evidence discoverable, but prevent old sections from being copied into new current release results.

- [ ] **Step 4: Verify docs and manual UI gates**

Run: `./server.sh verify-manual-ui-evidence`, `./server.sh verify-docs-links`, `./server.sh verify-feature-inventory-coverage`, `git diff --check`.

Expected: all PASS.

### Task 5: VLM Contract Index Consolidation Plan

**Files:**
- Modify later: `docs/vlm-runtime-opt-in-contract.md`
- Modify later: `docs/vlm-profile-storage.md`
- Modify later: `docs/vlm-cloud-provider-field-smoke-gate.md`
- Modify later: `docs/vlm-install-connection-dry-run.md`
- Create later only if approved: `docs/vlm-contract-index.md`

- [ ] **Step 1: Write a failing VLM contract index verifier**

```js
assertIncludes(vlmIndex, "default-off", "runtime default boundary");
assertIncludes(vlmIndex, "profile storage", "profile boundary");
assertIncludes(vlmIndex, "field smoke", "provider field boundary");
assertIncludes(vlmIndex, "dry-run is not provider PASS", "dry-run boundary");
```

- [ ] **Step 2: Run the verifier and confirm RED**

Run: `node scripts/internal/verify_v400_vlm_contract_index.mjs`

Expected: FAIL because the consolidated index is not present yet.

- [ ] **Step 3: Add the index or consolidate links in an existing source-of-truth**

Prefer a single stable index only if it avoids duplication. Do not copy long policy text into multiple files.

- [ ] **Step 4: Verify VLM boundary gates**

Run: `./server.sh verify-v390-vlm-rule-suggestion-draft-bridge`, `./server.sh verify-v390-vlm-evaluation-promotion-guard`, `./server.sh verify-v390-conditional-field-ai-decisions`, `./server.sh verify-docs-links`, `git diff --check`.

Expected: all PASS.
