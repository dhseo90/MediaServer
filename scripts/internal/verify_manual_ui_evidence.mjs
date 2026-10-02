#!/usr/bin/env node
// 파일 용도: 현행 UI 정의와 결과 구조를 확인한다. 검사 통과는 실제 UI 실행 PASS가 아니다.
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { hasDocumentLink, validateUiPolicyDocumentation } from "./documentation_contract_lib.mjs";
import { parseServerDispatches } from "./script_dispatch_parser.mjs";

const rootDir = fileURLToPath(new URL("../../", import.meta.url));
export const recordingIds = Array.from({length: 8}, (_, i) => "V410-S06-I" + (i + 27));
const recordingCounts = [4, 1, 1, 3, 6, 3, 1, 12];
const routes = ["/setup", "/login", "/password/change", "/invite/setup", "/ops/home",
  "/ops/dashboard", "/ops/sources", "/ops/rules", "/ops/users", "/ops/events", "/ops/vlm",
  "/client/live", "/client/dashboard", "/client/events", "/client/request-access"];

// 메모리 읽기 대역으로 같은 판정을 검사할 수 있다. 쓰기/서버/자식 명령은 없다.
export function verifyManualUiEvidence({read = readText, exists = fs.existsSync, resultPath = ""} = {}) {
  const result = resultPath ? read(resultPath) : "";
  const checklist = read("docs/manual-ui-checklist.md");
  const template = read("docs/manual-ui-result-template.md");
  const fulltest = read("docs/manual-ui-fulltest.md");
  const inventory = read("docs/project-feature-test-inventory.md");
  const implementationManifest = JSON.parse(read("test/fixtures/project_feature_implementation_evidence.json"));
  const seedFixture = JSON.parse(read("test/fixtures/manual_ui_fulltest_va_seed_matrix.json"));
  const policy = JSON.parse(read("test/fixtures/ui_fulltest_evidence_policy_v4.json"));
  const agents = read("AGENTS.md"), server = read("server.sh");
  const currentVersion = read("VERSION").trim();
  const checks = [], check = (name, fn) => checks.push({name, fn});

  check("current UI documentation links and execution identifiers", () => {
    assert(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(currentVersion), "VERSION missing/invalid");
    for (const [name, document, links] of [
      ["fulltest", fulltest, ["../VERSION", "../AGENTS.md", "manual-ui-checklist.md", "manual-ui-result-template.md", "project-feature-test-inventory.md", "stream-verification.md"]],
      ["checklist", checklist, ["../VERSION", "../AGENTS.md", "manual-ui-fulltest.md", "manual-ui-result-template.md", "project-feature-test-inventory.md"]],
      ["template", template, ["../VERSION", "manual-ui-fulltest.md", "manual-ui-checklist.md", "project-feature-test-inventory.md"]],
    ]) for (const link of links) assert(hasDocumentLink(document, link), name + " missing link: " + link);
    for (const command of ["verify-manual-ui-evidence", "verify-v220-ui-evidence-closeout"]) {
      assertIncludes(checklist, [command], "checklist command");
      const script = command.replaceAll("-", "_") + ".mjs";
      const targets = parseServerDispatches(server).filter(row => row.command === command);
      assert(targets.length === 1 && targets[0].script === script, "dispatch missing/duplicate/mismatch: " + command);
    }
    for (const document of [fulltest, checklist, template]) assertIncludes(document, ["424", "432", "Policy v4"], "UI scope");
    assertIncludes(fulltest, ["--result", "policyValidationResult", "uiFulltestPass", "completion oracle",
      "manualIntervention", "reviewRequired", "cleanup", "EventRecord"], "UI evidence identifiers");
    assertIncludes(checklist, ["--emit-registry-dir <dir>", "--dry-run", "--apply",
      "manual_ui_fulltest_va_seed_matrix.json", "verify-predev --soak-minutes 30",
      "verify-predev --soak-minutes 120", "verify-va-runtime-console-longrun --duration-minutes 120",
      "verify-product-ui-no-native-dialogs", "verify-ui-blocking-dialog-policy"], "UI preparation");
  });

  check("Policy v4 and role/redaction definitions remain connected", () => {
    const errors = validateUiPolicyDocumentation({agents, fulltest, policy});
    assert(errors.length === 0, errors.join("; "));
    assert(policy.schema === "media-server.ui-fulltest-evidence-policy.v4" && policy.policyVersion === 4,
      "Policy v4 schema/version mismatch");
    assert(policy.suiteClosure.expectedExactUiTestIds === 424, "Policy v4 baseline must remain 424");
    for (const flag of ["policyVerifierPassIsUiFulltestPass", "replayAloneIsUiFulltestPass",
      "coverageMappingAloneIsUiFulltestPass", "partialAutomationIsUiFulltestPass", "historicalEvidenceIsRetroactivelyUpgraded"]) {
      assert(policy.boundaries[flag] === false, "Policy non-promotion boundary changed: " + flag);
    }
    for (const field of ["fail", "notRun", "unsupported", "unapprovedExclusions", "manualIntervention"]) {
      assert(policy.suiteClosure.requiredZeroCounts.includes(field), "Policy zero-count missing: " + field);
    }
    assertIncludes(fulltest, ["admin", "operator", "viewer", "integrator", "role/scope",
      "320", "390", "760", "1180", "light/dark", "source URL", "Developer URL", "raw JSON",
      "debug counter", "BBox diagnostics", "rule/profile editor", "Ops/Lab primary navigation",
      "Client Preview as admin"], "UI role/privacy");
    assertIncludes(template, routes, "UI result routes");
    for (const [route, role] of [["/ops/users", "admin"], ["/client/live", "viewer/admin preview"],
      ["/invite/setup", "invite"], ["/password/change", "must-change/reset"]]) {
      const rows = parseGenericTableRows(template).filter(row => row[0].replaceAll(String.fromCharCode(96), "") === route);
      assert(rows.some(row => row[1] === role), "UI route role missing: " + route + "/" + role);
    }
    for (const env of ["TEST_PASSWORD", "PREVIOUS_PASSWORD", "SECOND_PREVIOUS_PASSWORD", "WRONG_PASSWORD_ONE", "WRONG_PASSWORD_TWO"]) {
      assertIncludes(checklist, ["MEDIA_SERVER_VERIFY_AUTH_" + env], "Auth prerequisite");
      assertIncludes(template, ["MEDIA_SERVER_VERIFY_AUTH_" + env], "Auth result");
    }
  });

  check("current 424 baseline plus recording 8 IDs and 31 actions", () => {
    const baseline = uiTargetFeatureIds(inventory);
    const manifestRows = implementationManifest.items.filter(item => item.testAreas?.includes("UI"));
    assert(baseline.length === 424 && new Set(baseline).size === 424, "inventory baseline must contain 424 unique UI IDs");
    assert(manifestRows.length === 424 && new Set(manifestRows.map(row => row.id)).size === 424,
      "manifest baseline must contain 424 unique UI IDs");
    for (const item of manifestRows) assert(baseline.includes(item.id) && item.manualUiCaseId === item.id &&
      item.uiEvidence?.screenRoute && item.uiEvidence?.anchor, "baseline UI mapping missing: " + item.id);
    const recording = recordingRows(template);
    for (const [index, id] of recordingIds.entries()) {
      const definitions = inventory.split("\n").filter(line => line.startsWith("| " + id + " |"));
      assert(definitions.length === 1 && definitions[0].includes("/ops/events"), "recording inventory mapping missing: " + id);
      const actions = recording.filter(row => row.id === id);
      assert(actions.length === recordingCounts[index] && new Set(actions.map(row => row.action)).size === actions.length,
        "recording action mapping missing/duplicate: " + id);
    }
    assert(recording.length === 31 && baseline.length + recordingIds.length === 432, "whole UI mapping must be 432 IDs/31 recording actions");
    assertIncludes(template, expectedSeedResultRows(seedFixture), "VA seed result definitions");
    assertIncludes(template, ["line-crossing:any", "line-crossing:forward", "line-crossing:reverse",
      "server cleanup:", "port cleanup:", "temp cleanup:"], "UI event/cleanup result fields");
  });

check("v3.5-v3.8 bridge binds all 36 exact IDs to route/control/action semantic evidence", () => {
  const expectedIds = v350ToV380BridgeIds();
  const result = validateBridgeItems(expectedIds, implementationManifest.items || []);
  assert(result.errors.length === 0, result.errors.join("; "));
  assert(expectedIds.length === 36, `bridge ID count drift: ${expectedIds.length}`);


  const omitted = (implementationManifest.items || []).filter(item => item.id !== "UI-094");
  const negative = validateBridgeItems(expectedIds, omitted);
  assert(negative.errors.some(error => error.includes("UI-094")),
    "middle-ID omission negative must reject UI-094 removal");
});

check("inventory longrun mapping counts are derived from the current 986-row manifest", () => {
  assert(implementationManifest.expectedFeatureRows === 986 && implementationManifest.items?.length === 986,
    "implementation manifest must contain the current 986 rows");
  const soak30 = implementationManifest.items.filter(item => item.longrunEvidence?.soak30).length;
  const soak120 = implementationManifest.items.filter(item => item.longrunEvidence?.soak120).length;
  assert(inventory.includes(`| 30분 soak 대상 | ${soak30} |`),
    `inventory 30-minute summary must equal derived ${soak30}`);
  assert(inventory.includes(`| 120분 대상 | ${soak120} |`),
    `inventory 120-minute summary must equal derived ${soak120}`);
  assert(inventory.includes(`| 30분 mapping | ${soak30}/${soak30} |`),
    `completed coverage 30-minute mapping must equal derived ${soak30}/${soak30}`);
  assert(inventory.includes(`| 120분 mapping | ${soak120}/${soak120} |`),
    `completed coverage 120-minute mapping must equal derived ${soak120}/${soak120}`);
});

if (resultPath) {
  check("provided manual result follows current evidence structure", () => {
    assertIncludes(result, [
      "## 검수 메타데이터",
      "## 확인됨",
      "## 제외 기록",
      "## 실패",
      "푸시 수행 여부",
    ], path.relative(rootDir, resultPath).replaceAll(path.sep, "/"));
    assertNotIncludes(result, [
      "PASS/FAIL/BLOCKED",
      "PASS/FAIL/미확인",
      "PASS/FAIL/BLOCKED/미확인",
      "## 미확인",
      "## 건너뜀",
      "NOT RUN",
    ], path.relative(rootDir, resultPath).replaceAll(path.sep, "/"));
  });

  check("provided manual result covers every UI-target feature ID", () => {
    const inventoryRows = uiTargetFeatureIds(inventory);
    const resultRows = parseFeatureRows(result);
    const resultIds = new Set(resultRows.map(row => row.id));
    const missing = inventoryRows.filter(id => !resultIds.has(id));
    assert(missing.length === 0, `manual result missing UI target feature rows: ${missing.join(", ")}`);
    for (const row of resultRows) {
      if (!/^(UI|AUTH|SRC|RULE|EVT|CLIENT|MEDIA|LAB|SAFE)-\d+$/.test(row.id)) continue;
      assert(["PASS", "FAIL", "미실행"].includes(row.verdict), `manual result row ${row.id} verdict must be PASS, FAIL or 미실행: ${row.verdict || "(empty)"}`);
    }
  });

  check("provided manual result 432-ID summary and recording actions agree", () => {
    const baselineIds = uiTargetFeatureIds(inventory);
    const rows = parseFeatureRows(result).filter(row => baselineIds.includes(row.id));
    assert(new Set(rows.map(row => row.id)).size === rows.length, "duplicate baseline result ID");
    const definitions = recordingRows(template), actual = recordingRows(result);
    assert(actual.length === definitions.length, "recording action row count mismatch");
    for (const definition of definitions) {
      const matching = actual.filter(row => row.id === definition.id && row.action === definition.action);
      assert(matching.length === 1, "recording action missing/duplicate: " + definition.id + "/" + definition.action);
      assert(["PASS", "FAIL", "미실행"].includes(matching[0].verdict), "recording action verdict invalid: " + definition.id);
    }
    const recording = recordingIds.map(id => {
      const actions = actual.filter(row => row.id === id);
      return {id, verdict: actions.some(row => row.verdict === "FAIL") ? "FAIL" :
        actions.some(row => row.verdict === "미실행") ? "미실행" : "PASS"};
    });
    const pass = [...rows, ...recording].filter(row => row.verdict === "PASS").length;
    const fail = [...rows, ...recording].filter(row => row.verdict === "FAIL").length;
    const notRun = [...rows, ...recording].filter(row => row.verdict === "미실행").length;
    const summary = result.match(/UI 풀테스트\s*\|\s*(\d+)개 UI 대상 기능 ID 중 (\d+) PASS, (\d+) FAIL(?:, (\d+) 미실행)?/);
    assert(summary, "manual result missing UI full-test summary count");
    assert(Number(summary[1]) === 432 && Number(summary[2]) === pass && Number(summary[3]) === fail &&
      Number(summary[4] || 0) === notRun, "manual result 432-ID summary mismatch");
    const conclusion = result.match(/^- 최종 결론:\s*(PASS|FAIL)\s*$/m)?.[1];
    assert(conclusion, "manual result missing final PASS/FAIL conclusion");
    for (const kind of ["server", "port", "temp"]) {
      const cleanup = result.match(new RegExp("^- " + kind + " cleanup:\\s*(PASS|FAIL|미확인|미실행)\\s*$", "m"))?.[1];
      assert(cleanup, "manual result missing " + kind + " cleanup");
      if (conclusion === "PASS") assert(cleanup === "PASS", "PASS contradicts cleanup failure: " + kind);
    }
    if (conclusion === "PASS") {
      assert(fail === 0 && notRun === 0, "PASS contradicts failed/not-run feature/action");
      assert(!parseGenericTableRows(result).some(cells => cells.includes("FAIL") || cells.includes("미실행")),
        "PASS contradicts failed/not-run result row");
    }
  });

  check("provided manual result retained evidence paths exist", () => {
    const section = sectionBetween(result, "## 현재 보존 증적", "## 스크립트 테스트 기록");
    assert(section, "manual result missing retained evidence section");
    const rows = parseGenericTableRows(section)
      .filter(row => row[1]?.startsWith("`/"));
    assert(rows.length >= 6, `manual result retained evidence rows too small: ${rows.length}`);
    const missing = [];
    for (const row of rows) {
      const rawPath = String(row[1] || "").replace(/^`|`$/g, "");
      if (!exists(rawPath)) {
        missing.push(rawPath);
      }
      const status = String(row[2] || "").trim();
      if (status !== "exists") {
        missing.push(`${rawPath} status=${status || "(empty)"}`);
      }
    }
    assert(missing.length === 0, `manual result retained evidence paths missing: ${missing.join(", ")}`);
  });

  check("provided manual result covers every RULE feature ID", () => {
    const inventoryRuleIds = parseFeatureRows(inventory)
      .filter(row => row.id.startsWith("RULE-"))
      .map(row => row.id);
    const resultIds = new Set(parseFeatureRows(result).map(row => row.id));
    const missing = inventoryRuleIds.filter(id => !resultIds.has(id));
    assert(missing.length === 0, `manual result missing RULE feature rows: ${missing.join(", ")}`);
  });

  check("provided manual result populates VA seed matrix rows", () => {
    const section = sectionBetween(result, "## VA Seed / 최종 룰 상태", "## VA Event Occurrence Coverage");
    assert(section, "manual result missing VA Seed / final rule section");
    const expectedRows = expectedSeedResultRows(seedFixture);
    const rows = parseGenericTableRows(section);
    const byName = new Map(rows.map(row => [row[0], row]));
    const missing = expectedRows.filter(name => !byName.has(name));
    assert(missing.length === 0, `manual result missing VA seed matrix rows: ${missing.join(", ")}`);
    const incomplete = [];
    for (const name of expectedRows) {
      const row = byName.get(name) || [];
      const actual = row[2] || "";
      const verdict = row[3] || "";
      if (!actual || !["PASS", "FAIL", "미실행"].includes(verdict)) {
        incomplete.push(name);
      }
    }
    assert(incomplete.length === 0, `manual result has unpopulated VA seed matrix rows: ${incomplete.join(", ")}`);
  });

  check("provided manual result splits VA EventRecord coverage by exact event key", () => {
    const section = sectionBetween(result, "## VA Event Occurrence Coverage", "## 확인됨");
    assert(section, "manual result missing VA Event Occurrence Coverage section");
    const expectedKeys = [
      "`presence`",
      "`enter`",
      "`exit`",
      "`line-crossing:any`",
      "`line-crossing:forward`",
      "`line-crossing:reverse`",
      "`intrusion-dwell`",
      "`re-entry`",
      "`wrong-direction`",
      "`intrusion-after-line-crossing`",
      "`loitering`",
      "`zone-occupancy`",
    ];
    const rows = parseGenericTableRows(section)
      .filter(row => row[0]?.startsWith("`"));
    const byKey = new Map(rows.map(row => [row[0], row]));
    const missing = expectedKeys.filter(key => !byKey.has(key));
    assert(missing.length === 0, `manual result missing exact VA EventRecord rows: ${missing.join(", ")}`);
    const extraCombined = rows
      .map(row => row[0])
      .filter(key => key.includes("/") || key.includes("any/forward/reverse"));
    assert(extraCombined.length === 0, `manual result has combined VA EventRecord rows instead of exact rows: ${extraCombined.join(", ")}`);
    const invalidPass = [];
    for (const key of expectedKeys) {
      const row = byKey.get(key) || [];
      const evidence = eventCoverageEvidence(row);
      const verdict = evidence.verdict;
      if (!["PASS", "FAIL", "미실행"].includes(verdict || "")) {
        invalidPass.push(`${key}: invalid verdict ${verdict || "(empty)"}`);
      } else if (verdict === "미실행" && !/^- VA 미실행 사유:[ \t]*\S[^\r\n]*$/m.test(section)) {
        invalidPass.push(`${key}: missing VA not-run reason`);
      } else if (verdict === "PASS" && (!/^(yes|[1-9]\d*)$/i.test(evidence.uiRows) || !/^[1-9]\d*$/.test(evidence.jsonRecords))) {
        invalidPass.push(`${key}: PASS without UI row and record evidence`);
      }
    }
    assert(invalidPass.length === 0, `manual result has invalid VA EventRecord verdicts: ${invalidPass.join("; ")}`);
  });
}

  const results = checks.map(item => {
    try { item.fn(); return {name: item.name, ok: true}; }
    catch (error) { return {name: item.name, ok: false, error: error instanceof Error ? error.message : String(error)}; }
  });
  return {checks: results, pass: results.filter(item => item.ok).length, fail: results.filter(item => !item.ok).length, resultPath};
}

function recordingRows(text) {
  return parseGenericTableRows(text).filter(row => /^V410-S06-I(?:2[7-9]|3[0-4])$/.test(row[0] || ""))
    .map(row => ({id: row[0], action: String(row[1] || "").split(/[：:]/)[0].trim(), verdict: String(row[2] || "").toUpperCase()}));
}
function readText(relativePath) {
  return fs.readFileSync(path.resolve(rootDir, relativePath), "utf8");
}
export function printManualUiReport(report) {
  for (const item of report.checks) console.log("[" + (item.ok ? "pass" : "fail") + "] " + item.name + (item.error ? ": " + item.error : ""));
  console.log("\n== Manual UI evidence verification summary ==");
  console.log("- result: " + (report.resultPath ? path.relative(rootDir, report.resultPath).replaceAll(path.sep, "/") : "not provided; template/checklist only"));
  console.log("- pass: " + report.pass);
  console.log("- fail: " + report.fail);
  console.log("- uiFulltest: not-run-by-this-command");
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rawArgs = process.argv.slice(2);
  if (hasHelpFlag(rawArgs)) printUsageAndExit("Manual UI evidence verification\n\nUsage:\n  ./server.sh verify-manual-ui-evidence [options]\n\nOptions:\n  --result <path>  실제 결과 문서의 ID/action·집계·VA·보존 경로 구조를 함께 검사합니다.\n  -h, --help       도움말 출력\n\n구조 검사 exit 0은 실제 UI 실행 PASS가 아니며 유효한 FAIL 기록도 보존합니다.");
  assertKnownOptions(rawArgs, ["result", "h", "help"]);
  const args = parseArgs(rawArgs);
  const report = verifyManualUiEvidence({resultPath: args.result ? path.resolve(rootDir, args.result) : ""});
  printManualUiReport(report);
  if (report.fail) process.exitCode = 1;
}
function parseFeatureRows(text) {
  return text
    .split(/\r?\n/)
    .filter(line => /^\| (UI|AUTH|SRC|RULE|EVT|CLIENT|MEDIA|LAB|SAFE)-\d+ \|/.test(line))
    .map(line => {
      const cells = line.split("|").slice(1, -1).map(cell => cell.trim());
      return {
        id: cells[0] || "",
        feature: cells[1] || "",
        uiNeed: cells[2] || "",
        testNeed: cells[3] || "",
        area: cells[4] || "",
        pass: cells[5] || "",
        verdict: cells[5] || "",
      };
    });
}

function hasArea(area, token) {
  return String(area || "").split(",").map(item => item.trim()).includes(token);
}

function uiTargetFeatureIds(inventory) {
  return parseFeatureRows(inventory)
    .filter(row => hasArea(row.area, "UI"))
    .map(row => row.id);
}

function sectionBetween(text, startHeading, nextHeading) {
  const start = text.indexOf(startHeading);
  if (start < 0) return "";
  const next = text.indexOf(nextHeading, start + startHeading.length);
  return text.slice(start, next >= 0 ? next : undefined);
}

function parseGenericTableRows(text) {
  return text
    .split(/\r?\n/)
    .filter(line => line.startsWith("|") && !/^\|\s*-+\s*\|/.test(line))
    .map(line => line.split("|").slice(1, -1).map(cell => cell.trim()))
    .filter(cells => cells.length > 0 && cells.some(Boolean))
    .filter(cells => !/^(개별 항목|개별 event 기능|ID)$/.test(cells[0] || ""));
}

function expectedSeedResultRows(seed) {
  return [
    ...arrayAt(seed, "accounts").map(item => `account: ${item.role}`),
    ...expectedTrackerPairs(seed).map(pair => `profile: tracker \`${pair.tracker}\` + Re-ID \`${pair.reid}\``),
    "invalid policy: tracker `none` + Re-ID `assist`",
    ...arrayAt(seed, "eventTemplates").map(item => `event template: ${eventTemplateLabel(item)}`),
    ...arrayAt(seed, "scenarioPresets").map(preset => `scenario preset: ${preset}`),
    ...arrayAt(seed, "vaRules").map(item => `vaRule: ${eventTemplateLabel(arrayAt(seed, "eventTemplates").find(templateRow => templateRow.id === item.eventTemplateId) || {})}`),
  ];
}

function eventCoverageEvidence(row) {
  if (row.length >= 7) {
    return {
      uiRows: row[3] || "",
      jsonRecords: row[4] || "",
      verdict: row[6] || "",
    };
  }
  return {
    uiRows: row[1] || "",
    jsonRecords: row[2] || "",
    verdict: row[3] || "",
  };
}

function expectedTrackerPairs(seed) {
  const pairs = new Map();
  for (const collectionName of ["eventTemplates", "vaRules"]) {
    for (const item of arrayAt(seed, collectionName)) {
      const policy = item.payload?.analysis?.trackingPolicy || {};
      const tracker = String(policy.tracker || "").trim();
      const reid = String(policy.reid || "off").trim();
      if (tracker && reid && !(tracker === "none" && reid !== "off")) {
        pairs.set(`${tracker}/${reid}`, { tracker, reid });
      }
    }
  }
  return [...pairs.values()].sort((left, right) => `${left.tracker}/${left.reid}`.localeCompare(`${right.tracker}/${right.reid}`));
}

function v350ToV380BridgeIds() {
  const range = (prefix, start, end) => Array.from(
    { length: end - start + 1 },
    (_unused, offset) => `${prefix}-${String(start + offset).padStart(3, "0")}`,
  );
  return [
    ...range("UI", 80, 107),
    ...range("CLIENT", 31, 32),
    ...range("CLIENT", 37, 42),
  ];
}

function validateBridgeItems(expectedIds, items) {
  const byId = new Map(items.map(item => [item.id, item]));
  const errors = [];
  const signatures = [];
  for (const id of expectedIds) {
    const item = byId.get(id);
    if (!item) {
      errors.push(`bridge missing exact ID ${id}`);
      continue;
    }
    const semantic = item.semanticEvidence || {};
    if (!semantic.handler?.file || !semantic.handler?.symbol || !semantic.handler?.anchor) {
      errors.push(`${id} bridge handler locator missing`);
    }
    if (!semantic.actionHandler?.file || !semantic.actionHandler?.symbol || !semantic.actionHandler?.anchor) {
      errors.push(`${id} bridge action locator missing`);
    }
    if (!semantic.stateOracle?.locator?.file || !semantic.stateOracle?.expectedBehaviorSha256) {
      errors.push(`${id} bridge state oracle missing`);
    }
    if (!semantic.route?.applicability) errors.push(`${id} bridge route applicability missing`);
    if (!semantic.controlSelector?.applicability) errors.push(`${id} bridge control applicability missing`);
    if (item.testAreas?.includes("UI") &&
        semantic.controlSelector?.applicability !== "product-control" &&
        !semantic.controlSelector?.reason) {
      errors.push(`${id} UI bridge exact control or N/A reason missing`);
    }
    signatures.push({
      id,
      route: semantic.route,
      control: semantic.controlSelector,
      action: semantic.actionHandler,
      stateBehaviorSha256: semantic.stateOracle?.expectedBehaviorSha256,
      reviewDigest: item.review?.semanticDigest || null,
    });
  }
  const digest = crypto.createHash("sha256").update(JSON.stringify(signatures)).digest("hex");
  return { errors, digest, count: signatures.length };
}

function eventTemplateLabel(item) {
  if (!item?.type) return "";
  if (item.type === "line-crossing") {
    return `line-crossing ${item.direction || item.payload?.event?.region?.direction || ""}`.trim();
  }
  return item.type;
}

function arrayAt(value, key) {
  const item = value?.[key];
  if (!Array.isArray(item)) throw new Error(`${key} must be an array`);
  return item;
}

function assertIncludes(text, terms, label) {
  const missing = terms.filter(term => !text.includes(term));
  if (missing.length > 0) {
    throw new Error(`${label} missing required wording: ${missing.join(", ")}`);
  }
}

function assertNotIncludes(text, terms, label) {
  const present = terms.filter(term => text.includes(term));
  if (present.length > 0) {
    throw new Error(`${label} contains forbidden wording: ${present.join(", ")}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      parsed[toCamel(raw.slice(0, eq))] = raw.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[toCamel(raw)] = next;
      index += 1;
    } else {
      parsed[toCamel(raw)] = "1";
    }
  }
  return parsed;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}
