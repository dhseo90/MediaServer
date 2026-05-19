#!/usr/bin/env node
// 파일 용도: v1.5.0 Explicit opt-in tracker/Re-ID policy guard가 저장/runtime/UI/docs에 고정됐는지 검증한다.
// 동작 요약: Re-ID assist가 tracker 선택 없이 암묵 적용되지 않고, default-on/migration 경계가 유지되는지 정적 점검한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v1.5.0 explicit opt-in tracker/Re-ID policy guard verification

Usage:
  ./server.sh verify-v150-opt-in-tracking-policy [options]

Options:
  --report <path>       Markdown 리포트를 저장합니다.
  --json-report <path>  JSON 리포트를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - analysis.trackingPolicy 저장 검증이 tracker 없는 Re-ID assist를 거부하는지 확인
  - runtime rule matching이 tracker 없는 trackingPolicy를 rule opt-in으로 해석하지 않는지 확인
  - /ops/rules UI validation과 저장 payload가 tracker/Re-ID 명시 선택 경계를 유지하는지 확인
  - docs/backlog/stream verification이 default-on, 자동 migration, 후속 Phase 경계를 분리하는지 확인
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const reportPath = args.report ? path.resolve(rootDir, args.report) : "";
const jsonReportPath = args.jsonReport ? path.resolve(rootDir, args.jsonReport) : "";
const checks = [];
const report = {
  schema: "media-server.v150-opt-in-tracking-policy-guard-report.v1",
  generatedAt: new Date().toISOString(),
  status: "pass",
  checks: [],
};

check("server save validation requires an explicit tracker field", () => {
  const server = readText("src/ingress/webrtc_http_server.cpp");
  for (const snippet of [
    "analysis.trackingPolicy.tracker is required for explicit opt-in policy",
    "const bool has_tracker_field",
    "const bool has_reid_field",
    "analysis.trackingPolicy.tracker must be none, lite, kalman-lite, or bytetrack",
    "analysis.trackingPolicy.reid must be off or assist",
    "analysis.trackingPolicy.reid must be off when tracker is none",
    "trackingPolicyContract",
    "runtimeFallback",
    "rule-level opt-in runtime trackers",
  ]) {
    assert(server.includes(snippet), `server validation missing snippet: ${snippet}`);
  }
  assert(!server.includes("analysis.trackingPolicy requires tracker or reid"), "server must not accept reid-only trackingPolicy objects");
  return {
    endpointContracts: ["rules", "va-rules"],
    rejectedPolicy: { trackingPolicy: { reid: "assist" } },
  };
});

check("runtime matching does not infer Re-ID assist without explicit tracker opt-in", () => {
  const analysisQuery = readText("src/ingress/analysis_query.cpp");
  for (const snippet of [
    "const auto tracker_field = FirstStringField(*policy, {\"tracker\", \"trackerPolicy\"});",
    "const auto reid_field = FirstStringField(*policy, {\"reid\", \"reId\", \"reID\", \"reidPolicy\"});",
    "if (tracker_field.has_value())",
    "tracker_policy = NormalizeTrackerPolicy(*tracker_field);",
    "reid_policy = NormalizeReidPolicy(reid_field.value_or(\"off\"));",
    "has_tracking_policy = !tracker_policy.empty() && !reid_policy.empty();",
    "matched.has_tracking_policy ? \"rule\" : \"rule-default\"",
  ]) {
    assert(analysisQuery.includes(snippet), `runtime policy guard missing snippet: ${snippet}`);
  }
  assert(
    !analysisQuery.includes("NormalizeTrackerPolicy(FirstStringField(*policy, {\"tracker\", \"trackerPolicy\"}).value_or(\"\"))"),
    "runtime must not synthesize tracker=lite from a missing tracker field"
  );
  return {
    defaultPolicy: { tracker: "lite", reid: "off", source: "rule-default" },
  };
});

check("ops rules UI preserves explicit tracker/Re-ID policy controls and validation", () => {
  const ui = readText("src/ingress/product_ui_page_scripts.cpp");
  const server = readText("src/ingress/webrtc_http_server.cpp");
  for (const snippet of [
    "opsRulesTrackingPolicyHasExplicitTracker",
    "Re-ID assist는 명시적으로 선택한 Tracker와 함께 저장해야 합니다.",
    "Tracker를 사용 안 함으로 선택하면 Re-ID는 off여야 합니다.",
    "trackingPolicy: opsRulesCurrentTrackingPolicy()",
    "tracker === 'none'",
    "reidSelect.value = 'off'",
  ]) {
    assert(ui.includes(snippet), `UI policy guard missing snippet: ${snippet}`);
  }
  for (const snippet of [
    '<option value="lite">Lite</option>',
    '<option value="none">사용 안 함</option>',
    '<option value="kalman-lite">Kalman-lite</option>',
    '<option value="bytetrack">ByteTrack</option>',
    '<option value="off">Off</option>',
    '<option value="assist">Assist</option>',
  ]) {
    assert(server.includes(snippet), `UI select contract missing snippet: ${snippet}`);
  }
  return {
    controls: ["opsVaRuleTrackerSelect", "opsVaRuleReidSelect"],
  };
});

check("analysis reuse key is internal while external metadata profileKey stays policy-free", () => {
  const manager = readText("src/analysis/analysis_manager.cpp");
  const smoke = readText("scripts/internal/analysis_state_smoke.cpp");
  const types = readText("include/analysis/analysis_types.h");
  for (const snippet of [
    "|trackerPolicy=",
    "|effectiveTracker=",
    "|reidPolicy=",
    "|policyRule=",
  ]) {
    assert(manager.includes(snippet), `internal reuse key missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "external AnalysisProfile key must not expose rule-level tracking policy",
    "tracker policy must remain outside externally visible profile key",
  ]) {
    assert(smoke.includes(snippet), `analysis state smoke missing snippet: ${snippet}`);
  }
  assert(!types.includes(":trackerPolicy="), "external BuildProfileKey must not expose trackerPolicy");
  assert(!types.includes(":reidPolicy="), "external BuildProfileKey must not expose reidPolicy");
  return {
    externalProfileKey: "policy-free",
    internalReuseKey: "policy-aware",
  };
});

check("round-trip smoke covers valid opt-in policies and invalid implicit Re-ID", () => {
  const roundtrip = readText("scripts/internal/verify_ops_rules_roundtrip.mjs");
  for (const snippet of [
    'trackingPolicy: { tracker: "none", reid: "off" }',
    'trackingPolicy: { tracker: "kalman-lite", reid: "off" }',
    'trackingPolicy: { tracker: "bytetrack", reid: "assist" }',
    'trackingPolicy: { reid: "assist" }',
    "trackingPolicy validation rejects reid=assist without explicit tracker",
    "trackingPolicy.tracker is required for explicit opt-in policy",
  ]) {
    assert(roundtrip.includes(snippet), `round-trip smoke missing snippet: ${snippet}`);
  }
  return {
    command: "verify-ops-rules-roundtrip",
  };
});

check("v1.5.0 docs keep this guard in-scope and separate later roadmap work", () => {
  const backlog = readText("docs/development-backlog.md");
  const stream = readText("docs/stream-verification.md");
  const video = readText("docs/video-analysis.md");
  for (const snippet of [
    "V150-P0-01",
    "Explicit opt-in tracker/Re-ID policy guard",
    "tracker 없는 `reid=assist` 저장 요청은 거부",
    "runtime은 tracker field가 없는 `trackingPolicy`를 rule-level opt-in으로 해석하지",
    "미분류 P0~P1 후속 이슈: 없음",
    "V150-P0-02",
    "V150-P0-03",
    "V150-P1-01",
    "V150-P1-02",
    "V150-P1-03",
  ]) {
    assert(backlog.includes(snippet), `backlog missing v1.5.0 guard snippet: ${snippet}`);
  }
  for (const snippet of [
    "verify-v150-opt-in-tracking-policy",
    "tracker 없는 `reid=assist` fixture를 저장 거부",
    "자동 migration 또는 default-on 승격 근거가 아닙니다",
  ]) {
    assert(stream.includes(snippet), `stream verification missing v1.5.0 guard snippet: ${snippet}`);
  }
  for (const snippet of [
    "Re-ID assist는 `tracker` field가 함께 있는 `analysis.trackingPolicy`에서만 유효합니다",
    "tracker 없는 `reid=assist`는 저장 검증에서 거부하고 runtime에서도 opt-in으로 해석하지 않습니다",
  ]) {
    assert(video.includes(snippet), `video analysis missing v1.5.0 guard snippet: ${snippet}`);
  }
  return {
    docs: ["docs/development-backlog.md", "docs/stream-verification.md", "docs/video-analysis.md"],
  };
});

check("server command and inventory expose the v1.5 guard verifier", () => {
  const server = readText("server.sh");
  const inventory = readText("scripts/internal/verify_script_inventory.mjs");
  for (const snippet of [
    "verify-v150-opt-in-tracking-policy",
    "verify_v150_opt_in_tracking_policy_guard.mjs",
  ]) {
    assert(server.includes(snippet), `server.sh missing ${snippet}`);
    assert(inventory.includes("verify_v150_opt_in_tracking_policy_guard.mjs"), `script inventory missing ${snippet}`);
  }
  return {
    command: "verify-v150-opt-in-tracking-policy",
  };
});

let pass = 0;
let fail = 0;
for (const item of checks) {
  try {
    const detail = item.fn() || {};
    pass += 1;
    report.checks.push({ name: item.name, status: "pass", detail });
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    fail += 1;
    const message = error instanceof Error ? error.message : String(error);
    report.checks.push({ name: item.name, status: "fail", message });
    console.log(`[fail] ${item.name}: ${message}`);
  }
}

report.status = fail === 0 ? "pass" : "fail";
console.log("");
console.log("== v1.5.0 explicit opt-in tracker/Re-ID policy guard summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
console.log(`- status: ${report.status}`);

if (jsonReportPath) {
  fs.mkdirSync(path.dirname(jsonReportPath), { recursive: true });
  fs.writeFileSync(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`- jsonReport: ${jsonReportPath}`);
}

if (reportPath) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, renderMarkdownReport(report));
  console.log(`- report: ${reportPath}`);
}

if (fail > 0) process.exit(1);

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

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function renderMarkdownReport(data) {
  const lines = [
    "# v1.5.0 Explicit Opt-in Tracker/Re-ID Policy Guard Report",
    "",
    `- status: ${data.status}`,
    `- generatedAt: ${data.generatedAt}`,
    "",
    "## Checks",
    "",
  ];
  for (const item of data.checks) {
    lines.push(`- ${item.status.toUpperCase()} ${item.name}`);
    if (item.message) {
      lines.push(`  - ${item.message}`);
    }
  }
  return `${lines.join("\n")}\n`;
}
