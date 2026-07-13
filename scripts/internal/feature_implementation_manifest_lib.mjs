// 파일 용도: project feature inventory 986개 행의 구현/UI/verifier evidence manifest를 생성하고 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  SEMANTIC_CLOSURE_SCHEMA,
  summarizeSemanticClosure,
  validateSemanticItem,
} from "./feature_semantic_evidence_lib.mjs";

export const IMPLEMENTATION_MANIFEST_SCHEMA =
  "media-server.feature-implementation-evidence.v2";
export const EXPECTED_FEATURE_ROWS = 986;
export const IMPLEMENTATION_MANIFEST_PATH =
  "test/fixtures/project_feature_implementation_evidence.json";

const sectionByPrefix = {
  UI: "A",
  AUTH: "B",
  SRC: "C",
  RULE: "D",
  EVT: "E",
  CLIENT: "F",
  MEDIA: "G",
  LAB: "H",
  SAFE: "I",
  OPS: "J",
};

const surfaceKindByPrefix = {
  UI: "ui-route-control-action",
  AUTH: "auth-role-scope-route",
  SRC: "source-view-route-action",
  RULE: "rule-profile-scenario-action",
  EVT: "runtime-event-route-state",
  CLIENT: "client-route-control-state",
  MEDIA: "media-runtime-contract",
  LAB: "lab-api-runtime-contract",
  SAFE: "safety-boundary-invariant",
  OPS: "ops-evidence-release-gate",
};

const stopAnchors = new Set([
  "PASS", "FAIL", "UI", "API", "Ops", "Client", "HTTP", "JSON", "MVP",
  "source", "route", "state", "status", "summary", "report", "result",
  "manual", "runtime", "media", "schema", "payload", "evidence", "boundary",
  "default", "disabled", "enabled", "required", "existing", "selected",
  "candidate", "current", "read-only", "not-run", "none", "true", "false",
  "필요", "비대상", "안정화", "확인", "표시", "적용", "설정", "검증",
  "AppConfig", "sourceId", "viewId", "displayName", "incident",
]);

const forbiddenClosureWords = [
  /\bTODO\b/i,
  /\bTBD\b/i,
  /\bFIXME\b/i,
  /review-required/i,
  /not-approved/i,
  /후속 Ops API/,
  /후속 확인 필요/,
  /검증해야 함/,
  /후보 `verify-/,
];

export function parseFeatureRows(text) {
  return text
    .split(/\r?\n/)
    .filter(line => /^\| (UI|AUTH|SRC|RULE|EVT|CLIENT|MEDIA|LAB|SAFE|OPS)-\d+ \|/.test(line))
    .map(line => {
      const cells = line.split("|").slice(1, -1).map(cell => cell.trim());
      return {
        id: cells[0] || "",
        feature: cells[1] || "",
        uiNeed: cells[2] || "",
        testNeed: cells[3] || "",
        area: cells[4] || "",
        pass: cells[5] || "",
      };
    });
}

export function generateImplementationManifest({ rootDir, inventoryText, rows, reviewApproval = null }) {
  if (reviewApproval) {
    throw new Error("bulk semantic approval is forbidden; provide per-feature reviewed call-chain decisions");
  }
  const repository = readRepositoryIndex(rootDir);
  const dispatch = parseServerDispatch(repository.textByFile.get("server.sh") || "");
  const reviewedManifestPath = path.join(rootDir, IMPLEMENTATION_MANIFEST_PATH);
  const reviewedManifest = fs.existsSync(reviewedManifestPath)
    ? JSON.parse(fs.readFileSync(reviewedManifestPath, "utf8"))
    : { items: [] };
  const reviewedById = new Map((reviewedManifest.items || []).map(item => [item.id, item]));
  const items = rows.map(row => buildItem(rootDir, row, repository, dispatch, reviewedById.get(row.id)));
  const manifest = {
    schema: IMPLEMENTATION_MANIFEST_SCHEMA,
    semanticClosureSchema: SEMANTIC_CLOSURE_SCHEMA,
    expectedFeatureRows: EXPECTED_FEATURE_ROWS,
    inventorySha256: sha256(inventoryText),
    generatedFrom: "docs/project-feature-test-inventory.md",
    generationPolicy: "reviewed-map-only; unchanged reviewed rows are preserved; changed rows become review-required; token scoring and bulk approval are forbidden",
    semanticClosurePolicy: "owner/route-or-control/action/state/readback/verifier reviewed call-chain plus per-feature reason and content digest",
    executionEvidenceStatus: "not-execution-evidence",
    items,
  };
  manifest.semanticClosureSummary = summarizeSemanticClosure({ rows, manifest });
  return manifest;
}

export function validateImplementationManifest({ rootDir, inventoryText, rows, manifest }) {
  const errors = [];
  const repository = readRepositoryIndex(rootDir);
  const serverText = repository.textByFile.get("server.sh") || "";
  const dispatch = parseServerDispatch(serverText);
  const tracked = repository.tracked;

  if (manifest?.schema !== IMPLEMENTATION_MANIFEST_SCHEMA) {
    errors.push(`schema must be ${IMPLEMENTATION_MANIFEST_SCHEMA}`);
  }
  if (manifest?.semanticClosureSchema !== SEMANTIC_CLOSURE_SCHEMA) {
    errors.push(`semanticClosureSchema must be ${SEMANTIC_CLOSURE_SCHEMA}`);
  }
  if (manifest?.expectedFeatureRows !== EXPECTED_FEATURE_ROWS) {
    errors.push(`expectedFeatureRows must be ${EXPECTED_FEATURE_ROWS}`);
  }
  if (!Array.isArray(manifest?.items)) {
    errors.push("items must be an array");
    return { ok: false, errors, summary: emptySummary(rows) };
  }
  if (rows.length !== EXPECTED_FEATURE_ROWS) {
    errors.push(`inventory row count must stay ${EXPECTED_FEATURE_ROWS}, got ${rows.length}`);
  }
  if (manifest.items.length !== EXPECTED_FEATURE_ROWS) {
    errors.push(`manifest item count must stay ${EXPECTED_FEATURE_ROWS}, got ${manifest.items.length}`);
  }
  if (manifest.inventorySha256 !== sha256(inventoryText)) {
    errors.push("inventorySha256 drift; explicitly refresh and review the manifest");
  }

  const rowIds = rows.map(row => row.id);
  const manifestIds = manifest.items.map(item => item?.id || "");
  const rowSet = new Set(rowIds);
  const manifestSet = new Set(manifestIds);
  if (rowSet.size !== rowIds.length) errors.push("inventory contains duplicate feature IDs");
  if (manifestSet.size !== manifestIds.length) errors.push("manifest contains duplicate feature IDs");
  for (const id of rowIds) {
    if (!manifestSet.has(id)) errors.push(`manifest missing feature ID ${id}`);
  }
  for (const id of manifestIds) {
    if (!rowSet.has(id)) errors.push(`manifest has extra feature ID ${id}`);
  }

  const rowById = new Map(rows.map(row => [row.id, row]));
  for (const item of manifest.items) {
    const row = rowById.get(item.id);
    if (!row) continue;
    const prefix = featurePrefix(row.id);
    const isReview4 = item.review?.approvalSource === "review4-independent-source-audit";
    const rowAreas = splitAreas(row.area);
    const requiresUiEvidence = row.uiNeed !== "비대상" || rowAreas.includes("UI");
    const requiresManualUiCase = rowAreas.includes("UI");
    if (item.section !== sectionByPrefix[prefix]) {
      errors.push(`${row.id} section mismatch: ${item.section}`);
    }
    if (item.surfaceKind !== surfaceKindByPrefix[prefix]) {
      errors.push(`${row.id} surfaceKind mismatch: ${item.surfaceKind}`);
    }
    for (const [field, expected] of [
      ["feature", row.feature],
      ["uiNeed", row.uiNeed],
      ["testNeed", row.testNeed],
      ["testAreas", splitAreas(row.area)],
    ]) {
      const actual = item[field];
      const same = Array.isArray(expected)
        ? JSON.stringify(actual) === JSON.stringify(expected)
        : actual === expected;
      if (!same) errors.push(`${row.id} ${field} drift`);
    }
    errors.push(...validateSemanticItem({ rootDir, row, item }));
    validateEvidence(`${row.id} sourceEvidence`, item.sourceEvidence, {
      errors,
      repository,
      tracked,
      allowedPrefix: isReview4
        ? /^(src|include|config|scripts\/internal|test)\//
        : /^(SAFE|OPS)$/.test(prefix)
        ? /^(src|include|config|scripts\/internal|test)\//
        : /^(src|include|config)\//,
    });
    if (requiresUiEvidence) {
      validateEvidence(`${row.id} uiEvidence`, item.uiEvidence, {
        errors,
        repository,
        tracked,
        allowedPrefix: /^src\/ingress\/(product_ui_|webrtc_http_server|http_auth)/,
      });
      if (requiresManualUiCase && item.manualUiCaseId !== row.id) {
        errors.push(`${row.id} manualUiCaseId must equal the feature ID`);
      }
      if (!requiresManualUiCase && item.manualUiCaseId !== null) {
        errors.push(`${row.id} without UI test area must not declare a manualUiCaseId`);
      }
      if (!item.uiEvidence?.screenRoute ||
          ![...repository.entries]
            .filter(([file]) => /^src\/ingress\//.test(file))
            .some(([, text]) => text.includes(item.uiEvidence.screenRoute))) {
        errors.push(`${row.id} UI screenRoute missing from product source: ${item.uiEvidence?.screenRoute}`);
      }
    } else if (item.uiEvidence !== null || item.manualUiCaseId !== null) {
      errors.push(`${row.id} row without UI evidence requirement must not invent UI evidence`);
    }
    validateEvidence(`${row.id} verifierEvidence`, item.verifierEvidence, {
      errors,
      repository,
      tracked,
      allowedPrefix: isReview4 ? /^scripts\/internal\// : /^scripts\/internal\/verify/,
    });
    if (!item.verifierEvidence?.command) {
      errors.push(`${row.id} verifierEvidence.command is required`);
    } else {
      const command = item.verifierEvidence.command;
      const script = dispatch.commandToScript.get(command);
      if (!script) errors.push(`${row.id} verifier command not dispatched: ${command}`);
      else if (script !== item.verifierEvidence.file) {
        const entryText = repository.textByFile.get(script) || "";
        if (!entryText.includes(path.basename(item.verifierEvidence.file))) {
          errors.push(`${row.id} verifier command/script mismatch: ${command} -> ${script}`);
        }
      }
    }
    const longrun = item.longrunEvidence || {};
    if (splitAreas(row.area).includes("30분") &&
        longrun.soak30 !== "./server.sh verify-v390-server-longrun --duration-minutes 30") {
      errors.push(`${row.id} 30분 mapping must use the v3.9 canonical runner`);
    }
    if (splitAreas(row.area).includes("120분") &&
        longrun.soak120 !== "./server.sh verify-v390-server-longrun --duration-minutes 120") {
      errors.push(`${row.id} 120분 mapping must use the v3.9 canonical runner`);
    }
    if (JSON.stringify(item).includes("verify-predev --soak-minutes")) {
      errors.push(`${row.id} must not use legacy verify-predev as current longrun mapping`);
    }
    const closureText = `${row.feature}\n${row.pass}`;
    for (const pattern of forbiddenClosureWords) {
      if (pattern.test(closureText)) errors.push(`${row.id} contains unresolved closure wording: ${pattern}`);
    }
  }

  const reviewReasons = manifest.items.map(item => item?.review?.reason || "");
  if (reviewReasons.some(reason => !reason)) errors.push("every feature requires a review reason");
  if (new Set(reviewReasons).size !== manifest.items.length) {
    errors.push("bulk or duplicate semantic review reason detected");
  }

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      inventoryRows: rows.length,
      manifestRows: manifest.items.length,
      sourceEvidenceRows: manifest.items.filter(item => item?.sourceEvidence).length,
      uiEvidenceRows: manifest.items.filter(item => item?.uiEvidence).length,
      verifierEvidenceRows: manifest.items.filter(item => item?.verifierEvidence).length,
      manualUiCaseRows: manifest.items.filter(item => item?.manualUiCaseId).length,
      semanticReviewedRows: manifest.items.filter(item => item?.status === "semantic-reviewed").length,
      uniqueSemanticDigests: new Set(manifest.items.map(item => item?.review?.semanticDigest).filter(Boolean)).size,
      uniqueReviewReasons: new Set(manifest.items.map(item => item?.review?.reason).filter(Boolean)).size,
      reviewedCallChains: manifest.items.filter(item => item?.semanticEvidence?.callChain).length,
      errors: errors.length,
    },
  };
}

export function loadImplementationManifest(rootDir) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, IMPLEMENTATION_MANIFEST_PATH), "utf8"));
}

export function writeImplementationManifest(rootDir, manifest) {
  const target = path.join(rootDir, IMPLEMENTATION_MANIFEST_PATH);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`);
}

function buildItem(rootDir, row, repository, dispatch, reviewedItem = null) {
  const areas = splitAreas(row.area);
  if (reviewedItem &&
      reviewedItem.feature === row.feature &&
      reviewedItem.uiNeed === row.uiNeed &&
      reviewedItem.testNeed === row.testNeed &&
      JSON.stringify(reviewedItem.testAreas) === JSON.stringify(areas)) {
    const copy = structuredClone(reviewedItem);
    const reviewErrors = validateSemanticItem({ rootDir, row, item: copy });
    if (reviewErrors.length === 0) return copy;
    copy.status = "review-required";
    copy.review = {
      decision: "pending",
      reviewer: null,
      reviewedOn: null,
      reason: `${row.id}: source or reviewed call-chain drift requires an explicit per-feature decision`,
      semanticDigest: null,
      validationErrors: reviewErrors,
    };
    return copy;
  }
  throw new Error(`${row.id} has no reviewed semantic call-chain map; automatic token selection is forbidden`);
}

function readRepositoryIndex(rootDir) {
  const trackedFiles = execFileSync("git", ["ls-files"], {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim().split("\n").filter(Boolean);
  const tracked = new Set(trackedFiles);
  const textByFile = new Map();
  for (const file of trackedFiles) {
    if (/\.(png|jpe?g|gif|mp4|mov|zip|gz|pdf|woff2?|ttf|dylib|so|a|o)$/i.test(file)) continue;
    try {
      textByFile.set(file, fs.readFileSync(path.join(rootDir, file), "utf8"));
    } catch {
      // 바이너리이거나 읽을 수 없는 추적 파일은 텍스트 증적 소유자로 사용하지 않는다.
    }
  }
  return { tracked, textByFile, entries: [...textByFile.entries()] };
}

function parseServerDispatch(serverText) {
  const commandToScript = new Map();
  const scriptToCommands = new Map();
  const arm = /^\s{2}([^\n)]+)\)\n([\s\S]*?)^\s{4};;/gm;
  for (const match of serverText.matchAll(arm)) {
    const required = match[2].match(/require_internal\s+([^\s]+)/);
    if (!required) continue;
    const file = `scripts/internal/${required[1]}`;
    for (const command of match[1].split("|").map(item => item.trim()).filter(item => item.startsWith("verify-"))) {
      commandToScript.set(command, file);
      const commands = scriptToCommands.get(file) || [];
      commands.push(command);
      scriptToCommands.set(file, commands);
    }
  }
  return { commandToScript, scriptToCommands };
}

function validateEvidence(label, evidence, { errors, repository, tracked, allowedPrefix }) {
  if (!evidence || typeof evidence !== "object") {
    errors.push(`${label} missing`);
    return;
  }
  if (!tracked.has(evidence.file)) {
    errors.push(`${label} file is not tracked: ${evidence.file}`);
    return;
  }
  if (!allowedPrefix.test(evidence.file)) {
    errors.push(`${label} file is outside allowed owners: ${evidence.file}`);
  }
  const text = repository.textByFile.get(evidence.file) || "";
  if (!evidence.anchor || !text.includes(evidence.anchor)) {
    errors.push(`${label} anchor missing from ${evidence.file}: ${evidence.anchor}`);
  }
}

function featurePrefix(id) {
  return id.replace(/-\d+$/, "");
}

function splitAreas(area) {
  return area.split(",").map(item => item.trim()).filter(Boolean);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function emptySummary(rows) {
  return {
    inventoryRows: rows.length,
    manifestRows: 0,
    sourceEvidenceRows: 0,
    uiEvidenceRows: 0,
    verifierEvidenceRows: 0,
    manualUiCaseRows: 0,
    semanticReviewedRows: 0,
    uniqueSemanticDigests: 0,
    errors: 1,
  };
}
