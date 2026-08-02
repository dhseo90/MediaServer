#!/usr/bin/env node
// 파일 용도: Operator Incident Timeline이 event/source/rule/runtime 단서를 workflow로 묶는지 검증한다.

import fs from "node:fs";
import process from "node:process";

import { findChrome, openBrowserPage } from "./ui_visual_smoke_lib.mjs";
import { extractCppFunctionBlock, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";

const args = parseArgs(process.argv.slice(2));
const failures = [];

const pageSource = readText("src/ingress/product_ui_server_pages.cpp");
const script = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const serverSh = readText("server.sh");
const dashboardPage = extractCppFunctionBlock(pageSource, "void AppendOpsDashboardPage(");
const timelineItems = extractNamedFunctionBlock(script, "dashboardIncidentTimelineItems");
const timelineRenderer = extractNamedFunctionBlock(script, "renderDashboardIncidentTimeline");

check("ops dashboard exposes operator incident source filters", () => {
  for (const snippet of [
    'data-testid="ops-incident-timeline-panel"',
    'id="dashIncidentTimelineSource"',
    '<option value="event-record">EventRecord</option>',
    '<option value="source-health">Source Health</option>',
    '<option value="rule-warning">Rule Warning</option>',
    '<option value="runtime-status">Runtime Status</option>',
  ]) {
    assertIncludes(dashboardPage, snippet, "incident timeline shell");
  }
});

check("incident timeline renders supported incident source types", () => {
  for (const snippet of [
    "dashboardIncidentTimelineItems",
    "dashboardIncidentEventRecords",
    "dashboardSourceHealthIncidentId",
    "dashboardRuleWarningItems",
    "dashboardRuntimeStatusIncidentItems",
    "Rule Warning",
    "Runtime Status",
    "/ops/api/rules/catalog",
    "/ops/api/runtime/status",
    "/ops/api/events/status?limit=5&includeArchives=1",
    "/ops/api/source-health",
    "data-incident-unit",
    'data-incident-workflow="cause-impact-next-action"',
    "원인",
    "영향",
    "다음",
  ]) {
    assertIncludes(script, snippet, "operator incident timeline script");
  }
  const timelineProductBoundary = `${dashboardPage}\n${timelineItems}\n${timelineRenderer}`;
  assert(!timelineProductBoundary.includes("/ops/api/incidents"),
    "must not introduce a new incident API in the dashboard timeline owner");
  assert(!timelineProductBoundary.includes("media-server.ops.incident"),
    "must not introduce a new incident schema in the dashboard timeline owner");
});

check("bounded incident timeline retains authoritative EventRecord rows", () => {
  for (const snippet of [
    "'root-cause': 600",
    "'event-record': 500",
    "'source-health': 400",
    "'rule-warning': 300",
    "'runtime-status': 200",
    "'log-tail': 100",
    "const reserved = [...rootTimeline, ...eventTimeline]",
    "const items = [...reserved, ...remaining].slice(0, 8)",
  ]) assertIncludes(script, snippet, "deterministic incident source band");
  assert(!timelineItems.includes("Number.MAX_SAFE_INTEGER"),
    "incident source ranks must not depend on MAX_SAFE_INTEGER arithmetic");
  assert(!timelineItems.includes("sort: dashboardIncidentSortValue(item)"),
    "EventRecord timestamp must not be compared with source rank classes");

  const rank = Object.freeze({ root: 600, event: 500, source: 400, rule: 300, runtime: 200, log: 100 });
  const bounded = ({ root = 0, event = 0, source = 0, rule = 0, runtime = 0, log = 0 }, permutation = []) => {
    const make = (kind, count) => Array.from({ length: count }, (_, index) => ({ kind, index, rank: rank[kind] }));
    const groups = {
      root: make("root", Math.min(root, 3)),
      event: make("event", Math.min(event, 4)),
      source: make("source", Math.min(source, 3)),
      rule: make("rule", Math.min(rule, 3)),
      runtime: make("runtime", Math.min(runtime, 1)),
      log: make("log", Math.min(log, 3)),
    };
    const reserved = [...groups.root, ...groups.event];
    const order = permutation.length ? permutation : ["source", "rule", "runtime", "log"];
    const remaining = order.flatMap(kind => groups[kind])
      .sort((left, right) => (right.rank - left.rank) || (left.index - right.index));
    return [...reserved, ...remaining].slice(0, 8);
  };
  const permutations = [
    ["source", "rule", "runtime", "log"],
    ["log", "runtime", "rule", "source"],
    ["rule", "source", "log", "runtime"],
  ];
  for (let root = 0; root <= 3; root += 1) {
    for (let event = 1; event <= 4; event += 1) {
      for (const permutation of permutations) {
        const items = bounded({ root, event, source: 3, rule: 3, runtime: 1, log: 3 }, permutation);
        assert(items.length <= 8, "incident timeline exceeded the global bound");
        assert(items.filter(item => item.kind === "event").length === event,
          `EventRecord band was truncated: root=${root} event=${event}`);
        assert(items.filter(item => item.kind === "event").every((item, index) => item.index === index),
          "EventRecord source-relative order drifted");
      }
    }
  }
});

check("incident timeline emits bounded lifecycle evidence without payload material", () => {
  for (const snippet of [
    "incidentRenderPhase",
    "incidentInputCounts",
    "incidentBoundedCounts",
    "eventRecordInputCount",
    "eventRecordBoundedCount",
    "eventRecordDomCount",
  ]) assertIncludes(timelineRenderer, snippet, "incident lifecycle evidence");
});

check("incident workflow is styled for responsive ops review", () => {
  for (const snippet of [
    ".incident-workflow",
    ".incident-workflow span",
    ".incident-workflow strong",
    ".incident-timeline-controls",
  ]) {
    assertIncludes(css, snippet, "incident workflow CSS");
  }
});

check("ops client UI smoke tracks operator incident timeline", () => {
  for (const snippet of [
    "verify-ops-operator-incident-timeline",
    "verify_ops_operator_incident_timeline.mjs",
    'option value="rule-warning"',
    'option value="runtime-status"',
    "dashboardRuleWarningItems",
    "dashboardRuntimeStatusIncidentItems",
    "data-incident-workflow",
  ]) {
    assertIncludes(uiSmoke + serverSh, snippet, "operator incident smoke wiring");
  }
});

if (args.browserSmoke) {
  await runBrowserSmoke();
}

if (failures.length > 0) {
  console.log("");
  console.log("== Operator Incident Timeline 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== Operator Incident Timeline 통과 ==");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function parseArgs(rawArgs) {
  const parsed = {
    browserSmoke: false,
    httpBase: "http://127.0.0.1:8081",
    timeoutMs: 10000,
    chromePath: "",
    debugPort: 9944,
  };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--browser-smoke") {
      parsed.browserSmoke = true;
    } else if (arg === "--http-base") {
      parsed.httpBase = rawArgs[++index] || parsed.httpBase;
    } else if (arg === "--timeout-ms") {
      parsed.timeoutMs = Number(rawArgs[++index] || parsed.timeoutMs);
    } else if (arg === "--chrome-path") {
      parsed.chromePath = rawArgs[++index] || "";
    } else if (arg === "--debug-port") {
      parsed.debugPort = Number(rawArgs[++index] || parsed.debugPort);
    } else {
      failures.push(`unknown option: ${arg}`);
      console.log(`[fail] unknown option: ${arg}`);
    }
  }
  return parsed;
}

function check(name, fn) {
  try {
    fn();
    console.log(`[pass] ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.log(`[fail] ${name}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}

async function runBrowserSmoke() {
  const browser = await openBrowserPage({
    httpBase: args.httpBase,
    pagePath: "/ops/dashboard",
    timeoutMs: args.timeoutMs,
    chromePath: args.chromePath || findChrome(),
    debugPort: args.debugPort,
    width: 1180,
    height: 900,
  });
  try {
    const result = await browser.evaluate(
      `
        (async () => {
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          for (let i = 0; i < 40 && !document.querySelector('[data-incident-workflow]'); i += 1) {
            await wait(150);
          }
          const source = document.querySelector('#dashIncidentTimelineSource');
          const options = Array.from(source?.options || []).map(option => option.value);
          source.value = 'runtime-status';
          source.dispatchEvent(new Event('change', { bubbles: true }));
          await wait(250);
          const runtimeUnits = Array.from(document.querySelectorAll('[data-incident-unit="runtime-status"]'));
          const runtimeWorkflowCount = document.querySelectorAll('[data-incident-workflow]').length;
          const runtimeText = document.body.innerText || '';
          source.value = 'rule-warning';
          source.dispatchEvent(new Event('change', { bubbles: true }));
          await wait(250);
          const text = document.body.innerText || '';
          const forbidden = ['rtsp://', 'source URL', 'Developer URL', 'raw JSON', 'debugCounters', 'BBox diagnostics', 'passwordHash', 'tokenHash']
            .filter(item => text.includes(item));
          return {
            ok: options.includes('event-record') &&
              options.includes('source-health') &&
              options.includes('rule-warning') &&
              options.includes('runtime-status') &&
              runtimeWorkflowCount > 0 &&
              runtimeUnits.length > 0 &&
              runtimeText.includes('원인') &&
              runtimeText.includes('영향') &&
              runtimeText.includes('다음') &&
              forbidden.length === 0,
            options,
            workflowCount: runtimeWorkflowCount,
            runtimeUnits: runtimeUnits.length,
            forbidden,
            overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
          };
        })()
      `,
      args.timeoutMs,
    );
    check("browser operator incident timeline workflow smoke", () => {
      assert(Boolean(result?.ok), "browser operator incident timeline result was not ok");
    });
    if (!result?.ok) console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
}
