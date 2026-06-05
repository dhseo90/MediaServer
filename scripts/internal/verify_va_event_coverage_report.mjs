#!/usr/bin/env node
// 파일 용도: VA rule/scenario/event type/EventRecord coverage를 조합 단위 report로 고정한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VA event coverage report verification

Usage:
  ./server.sh verify-va-event-coverage-report [options]

Options:
  --report <path>       Markdown coverage report를 저장합니다.
  --json-report <path>  JSON coverage report를 저장합니다.
  --event-history-coverage-json <path>
                        verify-ops-event-records-scope가 생성한 event-history-coverage.json을 읽어
                        exact 12-key EventRecord occurrence matrix를 검증합니다.
  --require-occurrence-matrix
                        event-history-coverage-json 입력이 없거나 12-key row 중 하나라도
                        미발생이면 실패합니다.
  -h, --help            도움말 출력

Checks:
  - verify-va-events, verify-va-replay, verify-ops-event-records-scope가 basic/scenario/EventRecord coverage를 조합 단위로 닫는지 확인
  - invalid/negative 조합은 PASS로 섞지 않고 expected FAIL row로 report에 남김
`);
}

assertKnownOptions(rawArgs, [
  "report",
  "json-report",
  "event-history-coverage-json",
  "require-occurrence-matrix",
  "h",
  "help",
]);

const args = parseArgs(rawArgs);
const reportPath = args.report ? path.resolve(rootDir, args.report) : "";
const jsonReportPath = args.jsonReport ? path.resolve(rootDir, args.jsonReport) : "";
const eventHistoryCoveragePath = args.eventHistoryCoverageJson ? path.resolve(rootDir, args.eventHistoryCoverageJson) : "";
const requireOccurrenceMatrix = args.requireOccurrenceMatrix === "1" || args.requireOccurrenceMatrix === true;
const rows = coverageRows();
const checks = [];

check("runtime VA event verifier exposes every basic event alias", () => {
  const script = readText("scripts/internal/verify_va_tracking_events.sh");
  for (const row of rows.filter(item => item.family === "runtime-basic")) {
    assert(script.includes(`"${row.ruleAlias}"`) || script.includes(` ${row.ruleAlias} `), `verify-va-events missing runtime alias: ${row.ruleAlias}`);
  }
  for (const snippet of [
    "filtered_specs = [",
    "EventRecord storage is disabled",
    "EventRecord storage enabled",
    "EventRecord 저장 이력 검증",
    "direction 분할 불일치",
  ]) {
    assert(script.includes(snippet), `verify-va-events missing coverage snippet: ${snippet}`);
  }
});

check("replay verifier exposes every scenario occurrence case", () => {
  const script = readText("scripts/internal/verify_va_replay_baselines.sh");
  for (const row of rows.filter(item => item.replayCase)) {
    assert(script.includes(`"${row.replayCase}|`), `verify-va-replay missing replay case: ${row.replayCase}`);
  }
  for (const mode of ["re-entry", "wrong-direction", "intrusion-after-line-crossing", "loitering", "zone-occupancy"]) {
    assert(script.includes(`--enable-${mode}`), `verify-va-replay missing scenario mode: ${mode}`);
  }
});

check("ops EventRecord scope verifier keeps exact event history keys", () => {
  const script = readText("scripts/internal/verify_ops_event_records_scope.mjs");
  for (const row of rows.filter(item => item.eventHistoryKey)) {
    assert(script.includes(`"${row.eventHistoryKey}"`), `ops EventRecord scope missing history key: ${row.eventHistoryKey}`);
  }
  for (const snippet of [
    "media-server.manual-ui-event-history-coverage.v1",
    "event history registry covers",
    "event history records cover every registry event/scenario rule",
    "invalid evidence query rejected",
  ]) {
    assert(script.includes(snippet), `ops EventRecord scope missing snippet: ${snippet}`);
  }
});

check("manual UI docs require exact VA event rows", () => {
  const fulltest = readText("docs/manual-ui-fulltest.md");
  const template = readText("docs/manual-ui-result-template.md");
  for (const eventType of ["presence", "enter", "exit", "line-crossing", "intrusion-dwell", "re-entry", "wrong-direction", "intrusion-after-line-crossing", "loitering", "zone-occupancy"]) {
    assert(fulltest.includes(eventType) || template.includes(eventType), `manual UI docs missing event type: ${eventType}`);
  }
  for (const snippet of [
    "basic event type",
    "scenario event type",
    "EventRecord history coverage",
    "basic/scenario 최종 12개 이상",
  ]) {
    assert(fulltest.includes(snippet) || template.includes(snippet), `manual UI docs missing coverage snippet: ${snippet}`);
  }
});

check("project inventory maps VA coverage report into RULE/EVT verifier families", () => {
  const inventory = readText("docs/project-feature-test-inventory.md");
  for (const snippet of ["verify-va-event-coverage-report"]) {
    assert(inventory.includes(snippet), `project feature inventory missing snippet: ${snippet}`);
  }
  const ruleRange = inventory.match(/`RULE-001`~`RULE-(\d{3})`/);
  const eventRange = inventory.match(/`EVT-001`~`EVT-(\d{3})`/);
  assert(ruleRange && Number(ruleRange[1]) >= 101, "project feature inventory RULE range must include S09 rule coverage baseline");
  assert(eventRange && Number(eventRange[1]) >= 26, "project feature inventory EVT range must include S09 event coverage baseline");
});

check("coverage report exposes exact 12-key EventRecord occurrence matrix", () => {
  const expectedKeys = exactEventRecordOccurrenceKeys();
  assert(report.eventRecordOccurrenceMatrix?.schema === "media-server.va-eventrecord-occurrence-matrix.v1",
    "coverage report missing exact EventRecord occurrence matrix schema");
  const rowsByKey = new Map((report.eventRecordOccurrenceMatrix.rows || []).map(row => [row.key, row]));
  const missing = expectedKeys.filter(key => !rowsByKey.has(key));
  assert(missing.length === 0, `coverage report missing exact EventRecord occurrence rows: ${missing.join(", ")}`);
});

check("EventRecord occurrence matrix input gate is enforced when requested", () => {
  if (!requireOccurrenceMatrix && !eventHistoryCoveragePath) return;
  assert(eventHistoryCoveragePath, "event-history-coverage-json is required for exact occurrence matrix verification");
  const matrix = report.eventRecordOccurrenceMatrix;
  assert(matrix.status === "pass", `EventRecord occurrence matrix status is ${matrix.status}`);
  const failing = matrix.rows.filter(row => row.status !== "pass");
  assert(failing.length === 0, `EventRecord occurrence matrix failing rows: ${failing.map(row => `${row.key}:${row.status}`).join(", ")}`);
});

const report = {
  schema: "media-server.va-rule-event-coverage-report.v1",
  generatedAt: new Date().toISOString(),
  status: "pass",
  summary: {
    rows: rows.length,
    passRows: rows.filter(row => row.expectedVerdict === "PASS").length,
    failRows: rows.filter(row => row.expectedVerdict === "FAIL").length,
    runtimeBasicRows: rows.filter(row => row.family === "runtime-basic").length,
    scenarioRows: rows.filter(row => row.family === "scenario-replay").length,
    invalidRows: rows.filter(row => row.invalidCombination).length,
  },
  rows,
  eventRecordOccurrenceMatrix: buildEventRecordOccurrenceMatrix(eventHistoryCoveragePath),
  checks: [],
};

let pass = 0;
let fail = 0;
for (const item of checks) {
  try {
    item.fn();
    pass += 1;
    report.checks.push({ name: item.name, status: "pass" });
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    fail += 1;
    report.status = "fail";
    report.checks.push({ name: item.name, status: "fail", message: error instanceof Error ? error.message : String(error) });
    console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log("");
console.log("== VA event coverage report summary ==");
console.log(`- rows: ${report.summary.rows}`);
console.log(`- expected PASS rows: ${report.summary.passRows}`);
console.log(`- expected FAIL rows: ${report.summary.failRows}`);
console.log(`- occurrence matrix status: ${report.eventRecordOccurrenceMatrix.status}`);
console.log(`- occurrence matrix rows: ${report.eventRecordOccurrenceMatrix.summary.rows}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);

if (reportPath) writeText(reportPath, renderMarkdown(report));
if (jsonReportPath) writeText(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`);
if (fail > 0) process.exit(1);

function coverageRows() {
  return [
    runtime("basic.presence.full-frame", "presence", "presence"),
    runtime("basic.presence.min-duration", "presence-500ms", "presence"),
    runtime("basic.presence.multi-category", "multi-category-presence", "presence"),
    runtime("basic.enter.center", "enter-center", "enter"),
    runtime("basic.exit.center", "exit-center", "exit"),
    runtime("basic.line.left.any", "line-left", "line-crossing", "any", "left"),
    runtime("basic.line.left.forward", "line-left-forward", "line-crossing", "forward", "left"),
    runtime("basic.line.left.reverse", "line-left-reverse", "line-crossing", "reverse", "left"),
    runtime("basic.line.right.any", "line-right", "line-crossing", "any", "right"),
    runtime("basic.line.right.forward", "line-right-forward", "line-crossing", "forward", "right"),
    runtime("basic.line.right.reverse", "line-right-reverse", "line-crossing", "reverse", "right"),
    scenario("scenario.intrusion", "intrusion", "intrusion", "", ""),
    scenario("scenario.line-crossing", "line-crossing", "line-crossing", "any", "line-crossing:any"),
    scenario("scenario.intrusion-dwell", "intrusion-dwell", "intrusion-dwell", "", "intrusion-dwell"),
    scenario("scenario.intrusion-dwell.rule-override", "intrusion-dwell-rule-override", "intrusion-dwell", "", "intrusion-dwell"),
    scenario("scenario.re-entry", "re-entry", "re-entry", "", "re-entry"),
    scenario("scenario.wrong-direction", "wrong-direction", "wrong-direction", "wrong-direction", "wrong-direction"),
    scenario("scenario.intrusion-after-line-crossing", "intrusion-after-line-crossing", "intrusion-after-line-crossing", "forward", "intrusion-after-line-crossing"),
    scenario("scenario.loitering", "loitering", "loitering", "", "loitering"),
    scenario("scenario.zone-occupancy", "zone-occupancy", "zone-occupancy", "", "zone-occupancy"),
    scenario("scenario.zone-occupancy.delayed-trigger", "zone-occupancy-delayed-trigger", "zone-occupancy", "", "zone-occupancy"),
    invalid("negative.loitering.under-threshold", "loitering-under-threshold", "loitering", "below-threshold scenario must not emit EventRecord"),
    invalid("negative.event-record.storage-disabled", "", "EventRecord", "verify-va-events --dispatch-records must fail before polling when storage is disabled"),
    invalid("negative.event-record.invalid-evidence-query", "", "EventRecord", "verify-ops-event-records-scope must reject invalid evidence query"),
    invalid("negative.line-crossing.direction-split-mismatch", "", "line-crossing", "verify-va-events must fail if any != forward + reverse"),
  ];
}

function exactEventRecordOccurrenceKeys() {
  return [
    "presence",
    "enter",
    "exit",
    "line-crossing:any",
    "line-crossing:forward",
    "line-crossing:reverse",
    "intrusion-dwell",
    "re-entry",
    "wrong-direction",
    "intrusion-after-line-crossing",
    "loitering",
    "zone-occupancy",
  ];
}

function buildEventRecordOccurrenceMatrix(coveragePath) {
  const expectedKeys = exactEventRecordOccurrenceKeys();
  const input = coveragePath ? readCoverageInput(coveragePath) : null;
  const rows = expectedKeys.map(key => buildOccurrenceRow(key, input));
  const passRows = rows.filter(row => row.status === "pass").length;
  const failRows = rows.filter(row => row.status === "fail").length;
  return {
    schema: "media-server.va-eventrecord-occurrence-matrix.v1",
    generatedAt: new Date().toISOString(),
    status: input ? (failRows === 0 ? "pass" : "fail") : "needs-event-history-coverage-json",
    source: input
      ? {
          path: coveragePath,
          schema: input.schema,
          historyDir: input.historyDir || "",
          registryPath: input.registryPath || "",
          eventsPath: input.eventsPath || "",
          pagingPath: input.pagingPath || "",
        }
      : {
          path: "",
          schema: "",
          historyDir: "",
          registryPath: "",
          eventsPath: "",
          pagingPath: "",
        },
    summary: {
      rows: rows.length,
      passRows,
      failRows,
      inputProvided: Boolean(input),
      requiredKeys: expectedKeys,
    },
    rows,
  };
}

function readCoverageInput(coveragePath) {
  const payload = JSON.parse(fs.readFileSync(coveragePath, "utf8"));
  if (payload?.schema !== "media-server.manual-ui-event-history-coverage.v1") {
    throw new Error(`event-history coverage schema mismatch: ${payload?.schema || "(missing)"}`);
  }
  if (!Array.isArray(payload.coverage)) {
    throw new Error("event-history coverage missing coverage array");
  }
  return payload;
}

function buildOccurrenceRow(key, input) {
  const eventType = key.split(":")[0];
  if (!input) {
    return {
      key,
      eventType,
      status: "needs-event-history-coverage-json",
      ruleIds: [],
      uiSeenType: false,
      recordCount: 0,
      sampleEventIds: [],
      evidence: "event-history-coverage-json not supplied",
    };
  }
  const coverage = input.coverage.filter(item => String(item?.key || "") === key);
  const recordCount = coverage.reduce((sum, item) => sum + Number(item?.count || 0), 0);
  const sampleEventIds = coverage
    .map(item => String(item?.sampleEventId || ""))
    .filter(Boolean);
  const ruleIds = coverage
    .map(item => String(item?.ruleId || ""))
    .filter(Boolean);
  const seenTypes = Array.isArray(input.seenTypes) ? input.seenTypes.map(String) : [];
  const uiSeenType = seenTypes.includes(eventType);
  const status = coverage.length > 0 && recordCount > 0 && sampleEventIds.length > 0 && uiSeenType
    ? "pass"
    : "fail";
  const missing = [];
  if (coverage.length === 0) missing.push("registry-row");
  if (recordCount <= 0) missing.push("event-record");
  if (sampleEventIds.length === 0) missing.push("sample-event-id");
  if (!uiSeenType) missing.push("ops-events-ui-type");
  return {
    key,
    eventType,
    status,
    ruleIds,
    uiSeenType,
    recordCount,
    sampleEventIds,
    evidence: status === "pass"
      ? "registry rule, /ops/events seen type, and EventRecord JSON Lines sample are present"
      : `missing ${missing.join(", ")}`,
  };
}

function runtime(id, ruleAlias, eventType, direction = "", lineSide = "") {
  return {
    id,
    family: "runtime-basic",
    ruleKind: "basic",
    ruleAlias,
    eventType,
    scenarioName: "",
    lineDirection: direction,
    lineSide,
    occurrenceEvidence: "verify-va-events",
    eventRecordEvidence: "MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED=1 verify-va-events --dispatch-records",
    eventHistoryKey: eventType === "line-crossing" && direction ? `${eventType}:${direction}` : eventType,
    expectedVerdict: "PASS",
    invalidCombination: false,
  };
}

function scenario(id, replayCase, eventType, direction, eventHistoryKey) {
  return {
    id,
    family: "scenario-replay",
    ruleKind: "scenario",
    ruleAlias: "",
    eventType,
    scenarioName: eventType,
    lineDirection: direction,
    lineSide: "",
    replayCase,
    occurrenceEvidence: "verify-va-replay",
    eventRecordEvidence: eventHistoryKey
      ? "verify-ops-event-records-scope --event-history-dir <manual-ui-event-history-dir>"
      : "비대상: EventRecord history key 없음; replay occurrence baseline only",
    eventHistoryKey,
    expectedVerdict: "PASS",
    invalidCombination: false,
  };
}

function invalid(id, replayCase, eventType, expectedFailure) {
  return {
    id,
    family: "negative",
    ruleKind: "invalid",
    ruleAlias: "",
    eventType,
    scenarioName: eventType,
    lineDirection: "",
    lineSide: "",
    replayCase,
    occurrenceEvidence: replayCase ? "verify-va-replay" : "static verifier guard",
    eventRecordEvidence: "no EventRecord PASS row; expected failure only",
    eventHistoryKey: "",
    expectedVerdict: "FAIL",
    invalidCombination: true,
    expectedFailure,
  };
}

function renderMarkdown(payload) {
  const lines = [
    "# VA Rule/Event Coverage Report",
    "",
    `- schema: ${payload.schema}`,
    `- generatedAt: ${payload.generatedAt}`,
    `- status: ${payload.status}`,
    `- rows: ${payload.summary.rows}`,
    `- expected PASS rows: ${payload.summary.passRows}`,
    `- expected FAIL rows: ${payload.summary.failRows}`,
    "",
    "| ID | Rule kind | Event type | Scenario | Direction | Occurrence evidence | EventRecord evidence | Expected |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const row of payload.rows) {
    lines.push([
      row.id,
      row.ruleKind,
      row.eventType,
      row.scenarioName || "-",
      row.lineDirection || "-",
      row.occurrenceEvidence,
      row.eventRecordEvidence,
      row.expectedVerdict,
    ].map(cell).join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }
  lines.push(
    "",
    "## Full VA EventRecord Occurrence Matrix",
    "",
    `- schema: ${payload.eventRecordOccurrenceMatrix.schema}`,
    `- status: ${payload.eventRecordOccurrenceMatrix.status}`,
    `- source: ${payload.eventRecordOccurrenceMatrix.source.path || "not supplied"}`,
    "",
    "| Event key | Event type | Status | Rule IDs | UI seen type | Records | Samples | Evidence |",
    "| --- | --- | --- | --- | --- | ---: | --- | --- |",
  );
  for (const row of payload.eventRecordOccurrenceMatrix.rows) {
    lines.push([
      row.key,
      row.eventType,
      row.status,
      row.ruleIds.length > 0 ? row.ruleIds.join(", ") : "-",
      row.uiSeenType ? "yes" : "no",
      row.recordCount,
      row.sampleEventIds.length > 0 ? row.sampleEventIds.join(", ") : "-",
      row.evidence,
    ].map(cell).join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function cell(value) {
  return String(value || "-").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
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
