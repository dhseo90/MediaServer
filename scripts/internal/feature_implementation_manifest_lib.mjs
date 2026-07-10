// 파일 용도: project feature inventory 974개 행의 구현/UI/verifier evidence manifest를 생성하고 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const IMPLEMENTATION_MANIFEST_SCHEMA =
  "media-server.feature-implementation-evidence.v1";
export const EXPECTED_FEATURE_ROWS = 974;
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

export function generateImplementationManifest({ rootDir, inventoryText, rows }) {
  const repository = readRepositoryIndex(rootDir);
  const dispatch = parseServerDispatch(repository.textByFile.get("server.sh") || "");
  const reviewedManifestPath = path.join(rootDir, IMPLEMENTATION_MANIFEST_PATH);
  const reviewedManifest = fs.existsSync(reviewedManifestPath)
    ? JSON.parse(fs.readFileSync(reviewedManifestPath, "utf8"))
    : { items: [] };
  const reviewedById = new Map((reviewedManifest.items || []).map(item => [item.id, item]));
  const items = rows.map(row => buildItem(row, repository, dispatch, reviewedById.get(row.id)));
  return {
    schema: IMPLEMENTATION_MANIFEST_SCHEMA,
    expectedFeatureRows: EXPECTED_FEATURE_ROWS,
    inventorySha256: sha256(inventoryText),
    generatedFrom: "docs/project-feature-test-inventory.md",
    generationPolicy: "explicit-refresh-only; verifier never rewrites this manifest",
    executionEvidenceStatus: "not-execution-evidence",
    items,
  };
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
    if (item.status !== "closed-with-evidence") {
      errors.push(`${row.id} status must be closed-with-evidence`);
    }
    validateEvidence(`${row.id} sourceEvidence`, item.sourceEvidence, {
      errors,
      repository,
      tracked,
      allowedPrefix: /^(SAFE|OPS)$/.test(prefix)
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
      allowedPrefix: /^scripts\/internal\/verify/,
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

function buildItem(row, repository, dispatch, reviewedItem = null) {
  const prefix = featurePrefix(row.id);
  const areas = splitAreas(row.area);
  const requiresUiEvidence = row.uiNeed !== "비대상" || areas.includes("UI");
  const anchors = evidenceAnchors(row);
  const sourceCandidates = repository.entries.filter(([file]) => {
    if (/verify_(?:project_feature_test_inventory|feature_inventory_coverage|feature_implementation_evidence)/.test(file)) {
      return false;
    }
    if (/^(SAFE|OPS)$/.test(prefix)) {
      return /^(src|include|config|scripts\/internal|test)\//.test(file);
    }
    return /^(src|include|config)\//.test(file);
  });
  const uiCandidates = repository.entries.filter(([file]) =>
    /^src\/ingress\/(product_ui_|webrtc_http_server|http_auth)/.test(file));
  const verifierCandidates = repository.entries.filter(([file]) =>
    /^scripts\/internal\/verify/.test(file) &&
    !/verify_(?:project_feature_test_inventory|feature_inventory_coverage)/.test(file));

  const sourceEvidence = bestEvidence(row, anchors, sourceCandidates, "source");
  if (!sourceEvidence) throw new Error(`${row.id} has no production implementation anchor`);
  const uiEvidence = requiresUiEvidence
    ? structuredClone(reviewedItem?.uiEvidence) || bestEvidence(row, anchors, uiCandidates, "ui")
    : null;
  if (requiresUiEvidence && !uiEvidence) {
    throw new Error(`${row.id} has no product UI anchor`);
  }
  if (uiEvidence && !uiEvidence.screenRoute) {
    uiEvidence.screenRoute = explicitUiScreenRoute(row);
  }
  if (uiEvidence && !uiEvidence.screenRoute) {
    throw new Error(`${row.id} has no reviewed exact UI screenRoute mapping`);
  }
  const explicitCommands = explicitVerifierCommands(row.pass);
  const explicitEvidence = explicitCommands
    .map(command => {
      const file = dispatch.commandToScript.get(command);
      if (!file) return null;
      const text = repository.textByFile.get(file) || "";
      const asserted = anchors.find(item => text.includes(item.value));
      return {
        file,
        anchor: asserted?.value || command,
        anchorKind: asserted?.kind || "dispatch-command",
        command,
      };
    })
    .find(Boolean);
  const reviewedVerifierEvidence = areas.includes("UI")
    ? structuredClone(reviewedItem?.verifierEvidence)
    : null;
  const verifierEvidence = reviewedVerifierEvidence || explicitEvidence ||
    bestEvidence(row, anchors, verifierCandidates, "verifier", dispatch);
  if (!verifierEvidence) throw new Error(`${row.id} has no verifier assertion anchor`);
  if (!verifierEvidence.command) {
    verifierEvidence.command = resolveTransitiveCommand(
      verifierEvidence.file,
      repository,
      dispatch,
    );
  }

  return {
    id: row.id,
    section: sectionByPrefix[prefix],
    surfaceKind: surfaceKindByPrefix[prefix],
    feature: row.feature,
    uiNeed: row.uiNeed,
    testNeed: row.testNeed,
    testAreas: areas,
    status: "closed-with-evidence",
    sourceEvidence,
    uiEvidence,
    verifierEvidence,
    manualUiCaseId: areas.includes("UI")
      ? reviewedItem?.manualUiCaseId || row.id
      : null,
    longrunEvidence: {
      soak30: areas.includes("30분")
        ? "./server.sh verify-v390-server-longrun --duration-minutes 30"
        : null,
      soak120: areas.includes("120분")
        ? "./server.sh verify-v390-server-longrun --duration-minutes 120"
        : null,
      approval: areas.some(area => area === "30분" || area === "120분")
        ? "explicit-user-approval-required"
        : null,
    },
  };
}

function bestEvidence(row, anchors, candidates, kind, dispatch = null) {
  const direct = candidates
    .filter(([, text]) => text.includes(row.id))
    .map(([file]) => ({ file, anchor: row.id, anchorKind: "feature-id", score: 10000 }));
  const matches = [...direct];
  for (const anchor of anchors) {
    for (const [file, text] of candidates) {
      if (!text.includes(anchor.value)) continue;
      const ownerBonus = ownerScore(featurePrefix(row.id), file, kind);
      const routeBonus = anchor.kind === "route" && anchor.value.includes("/api/") ? 240 : 0;
      matches.push({
        file,
        anchor: anchor.value,
        anchorKind: anchor.kind,
        score: anchor.score + ownerBonus + routeBonus + Math.min(anchor.value.length * 4, 320),
      });
    }
  }
  matches.sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));
  const selected = matches[0];
  if (!selected) return null;
  const evidence = {
    file: selected.file,
    anchor: selected.anchor,
    anchorKind: selected.anchorKind,
  };
  if (kind === "verifier" && dispatch) {
    evidence.command = dispatch.scriptToCommands.get(selected.file)?.[0] || null;
  }
  return evidence;
}

function ownerScore(prefix, file, kind) {
  if (kind === "verifier") {
    const verifierRules = {
      UI: [/ui/, /auth/, /ops/],
      AUTH: [/auth/],
      SRC: [/source/, /onvif/, /ops_ui_click/],
      RULE: [/rule/, /scenario/, /va_/],
      EVT: [/event/, /runtime/, /vlm/],
      CLIENT: [/client/, /webrtc/],
      MEDIA: [/webrtc/, /rtsp/, /codec/, /media/],
      LAB: [/vlm/, /analysis/, /lab/],
      SAFE: [/boundary/, /guard/, /auth/, /schema/],
      OPS: [/release/, /readiness/, /evidence/],
    };
    const verifierIndex = (verifierRules[prefix] || []).findIndex(pattern => pattern.test(file));
    return verifierIndex < 0 ? 0 : 480 - verifierIndex * 40;
  }
  if (kind === "ui") {
    const uiRules = {
      UI: [/product_ui_/, /webrtc_http_server/],
      AUTH: [/product_ui_auth/, /http_auth/, /webrtc_http_server/],
      SRC: [/product_ui_ops_sources/, /webrtc_http_server/],
      RULE: [/product_ui_page_scripts/, /webrtc_http_server/],
      EVT: [/product_ui_page_scripts/, /webrtc_http_server/],
      CLIENT: [/product_ui_client/, /webrtc_http_server/],
      MEDIA: [/product_ui_client/, /webrtc_http_server/],
      SAFE: [/product_ui_/, /webrtc_http_server/, /http_auth/],
    };
    const uiIndex = (uiRules[prefix] || []).findIndex(pattern => pattern.test(file));
    if (uiIndex >= 0) return 620 - uiIndex * 60;
    if (file.includes("product_ui_")) return 400;
    if (file.endsWith("webrtc_http_server.cpp")) return 300;
    return 100;
  }
  const rules = {
    UI: [/product_ui_/, /webrtc_http_server/],
    AUTH: [/http_auth/, /webrtc_http_server/, /product_ui_/],
    SRC: [/source_view_registry/, /source_factory/, /onvif/, /webrtc_http_server/, /product_ui_ops_sources/],
    RULE: [/event_rule_engine/, /scenario/, /analysis_query/, /webrtc_http_server/, /product_ui_/],
    EVT: [/event_manager/, /event_storage/, /ops_event_route_owner/, /webrtc_http_server/, /product_ui_/],
    CLIENT: [/product_ui_client/, /webrtc_http_server/, /session_manager/],
    MEDIA: [/session_manager/, /source_factory/, /stream_registry/, /webrtc/, /rtsp/],
    LAB: [/analysis/, /vlm/, /webrtc_http_server/],
    SAFE: [/verify_/, /webrtc_http_server/, /http_auth/],
    OPS: [/verify_/, /release/, /server\.sh/],
  };
  const index = (rules[prefix] || []).findIndex(pattern => pattern.test(file));
  return index < 0 ? 0 : 400 - index * 40;
}

function evidenceAnchors(row) {
  const text = `${row.feature} ${row.pass}`;
  const values = [];
  for (const match of text.matchAll(/`([^`]+)`/g)) {
    const value = match[1].trim();
    if (isUsefulAnchor(value)) values.push({ value, kind: "code-span", score: 900 });
  }
  for (const match of text.matchAll(/\/(?:ops|client|lab|setup|login|logout|password|invite|webrtc|ws)[A-Za-z0-9_?&=./:{}-]*/g)) {
    const value = match[0];
    if (isUsefulAnchor(value)) {
      values.push({ value, kind: "route", score: 850 });
      const templateIndex = value.indexOf("{");
      if (templateIndex > 0) {
        values.push({ value: value.slice(0, templateIndex), kind: "route", score: 840 });
      }
    }
  }
  for (const match of text.matchAll(/[A-Za-z_][A-Za-z0-9_:-]{4,}/g)) {
    const value = match[0];
    if (isUsefulAnchor(value)) values.push({ value, kind: "identifier", score: 300 });
  }
  for (const match of text.matchAll(/[가-힣]{4,}/g)) {
    const value = match[0];
    if (isUsefulAnchor(value)) values.push({ value, kind: "ui-copy", score: 250 });
  }
  return [...new Map(values.map(item => [item.value, item])).values()];
}

function isUsefulAnchor(value) {
  return value.length >= 3 && value.length <= 180 &&
    !stopAnchors.has(value) && !/^v\d/i.test(value) && !/^\d+$/.test(value) &&
    !value.startsWith("verify-");
}

function explicitVerifierCommands(text) {
  return [...text.matchAll(/`(verify-[^`\s,]+)(?:\s+[^`]*)?`/g)].map(match => match[1]);
}

function explicitUiScreenRoute(row) {
  const text = `${row.feature} ${row.pass}`;
  const explicit = [...text.matchAll(/`(\/(?!ops\/api|client\/api|lab\/api)[A-Za-z0-9_./{}:-]*)`/g)]
    .map(match => match[1])
    .find(route => !route.includes("{") && !route.startsWith("/ws/"));
  return explicit || null;
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

function resolveTransitiveCommand(verifierFile, repository, dispatch) {
  const basename = path.basename(verifierFile);
  for (const [entryScript, commands] of dispatch.scriptToCommands.entries()) {
    const text = repository.textByFile.get(entryScript) || "";
    if (text.includes(basename)) return commands[0] || null;
  }
  return null;
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
    errors: 1,
  };
}
