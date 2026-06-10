#!/usr/bin/env node
// 파일 용도: v2.4.0 S07 evidence/inventory/manual UI mapping을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.4.0 S07 evidence and inventory mapping verification

Usage:
  ./server.sh verify-v240-evidence-inventory-mapping

Checks:
  - V240-S07 roadmap row references this gate
  - feature inventory maps S01-S05 features to IDs, verifiers, UI evidence, and non-goals
  - manual UI checklist maps the same routes/controls/actions
  - release evidence index records the mapping gate without promoting not-run tests
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

const featureRows = [
  {
    title: "V240-S01 Operator Event Review Inbox",
    ids: ["UI-014", "EVT-019", "EVT-020", "EVT-021"],
    verifier: "verify-ops-event-review-inbox",
    route: "/ops/events",
  },
  {
    title: "V240-S02 Event Action and Incident Workflow",
    ids: ["UI-037", "EVT-037", "SAFE-041"],
    verifier: "verify-ops-event-action-incident-workflow",
    route: "/ops/events",
  },
  {
    title: "V240-S03 Alert Dry-run and Delivery Attempt Log",
    ids: ["UI-038", "EVT-017", "EVT-018", "EVT-038", "SAFE-042"],
    verifier: "verify-ops-alert-delivery-integrations",
    route: "/ops/events",
  },
  {
    title: "V240-S04 Client-safe Event and Status Summary",
    ids: ["CLIENT-006", "CLIENT-007", "CLIENT-014", "CLIENT-015", "CLIENT-022", "SRC-012", "EVT-023"],
    verifier: "verify-client-dashboard-polish",
    route: "/client/dashboard",
  },
  {
    title: "V240-S05 Rule and Scenario Review Loop",
    ids: ["RULE-041", "RULE-102", "EVT-001", "EVT-026"],
    verifier: "verify-rule-ui",
    route: "/ops/rules",
  },
];

check("backlog S07 points to the mapping gate", () => {
  const backlog = readText("docs/development-backlog.md");
  assert(/\| 7 \| V240-S07 \| P2 \| (진행|완료) \| Evidence \/ inventory \|/.test(backlog),
    "backlog V240-S07 row must be 진행 or 완료");
  for (const snippet of [
    "verify-v240-evidence-inventory-mapping",
    "feature inventory, manual UI checklist, release evidence row",
    "Event review inbox, incident action, alert dry-run, client-safe summary, rule review loop",
  ]) {
    assert(backlog.includes(snippet), `backlog missing S07 snippet: ${snippet}`);
  }
});

check("feature inventory maps S01-S05 feature groups", () => {
  const inventory = readText("docs/project-feature-test-inventory.md");
  assert(inventory.includes("## v2.4.0 Operator Event Review Evidence Mapping"),
    "feature inventory missing v2.4.0 mapping section");
  for (const row of featureRows) {
    assert(inventory.includes(row.title), `feature inventory missing ${row.title}`);
    assert(inventory.includes(row.verifier), `feature inventory missing verifier ${row.verifier}`);
    assert(inventory.includes(row.route), `feature inventory missing route ${row.route}`);
    for (const id of row.ids) {
      assert(inventory.includes(id), `feature inventory missing mapped ID ${id}`);
    }
  }
  for (const snippet of [
    "mapping-only-not-execution-evidence",
    "UI 풀테스트 직접 조작 PASS가 아님",
    "30분/120분 longrun 미실행은 PASS가 아님",
    "새 테스트 영역 없음",
  ]) {
    assert(inventory.includes(snippet), `feature inventory missing boundary snippet: ${snippet}`);
  }
});

check("manual UI checklist maps the same v2.4.0 features", () => {
  const checklist = readText("docs/manual-ui-checklist.md");
  assert(checklist.includes("### v2.4.0 기능별 UI evidence mapping"),
    "manual UI checklist missing v2.4.0 feature mapping section");
  for (const row of featureRows) {
    assert(checklist.includes(row.title), `manual UI checklist missing ${row.title}`);
    assert(checklist.includes(row.route), `manual UI checklist missing route ${row.route}`);
    for (const id of row.ids) {
      assert(checklist.includes(id), `manual UI checklist missing mapped ID ${id}`);
    }
  }
  for (const snippet of [
    "route/control/action 단위",
    "직접 클릭/타이핑/선택",
    "raw JSON/API-only 확인은 UI 풀테스트 evidence가 아님",
    "열지 않은 화면은 FAIL",
  ]) {
    assert(checklist.includes(snippet), `manual UI checklist missing boundary snippet: ${snippet}`);
  }
});

check("release evidence index records S07 without promoting not-run tests", () => {
  const evidence = readText("docs/release-evidence-index.md");
  for (const snippet of [
    "v240-s07-evidence-inventory-mapping-20260610",
    "media-server.v240-evidence-inventory-mapping.v1",
    "verify-v240-evidence-inventory-mapping",
    "verify-feature-inventory-coverage",
    "verify-manual-ui-evidence",
    "verify-release-evidence-index",
    "verify-project-inventory",
    "UI 풀테스트 직접 조작 PASS를 대체하지 않음",
    "30분/120분 longrun 미실행",
  ]) {
    assert(evidence.includes(snippet), `release evidence index missing S07 snippet: ${snippet}`);
  }
});

check("server entrypoint exposes the S07 verifier", () => {
  const serverSh = readText("server.sh");
  assert(serverSh.includes("verify-v240-evidence-inventory-mapping"),
    "server.sh missing verify-v240-evidence-inventory-mapping");
  assert(serverSh.includes("verify_v240_evidence_inventory_mapping.mjs"),
    "server.sh missing S07 verifier script dispatch");
});

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

console.log("");
console.log("== v2.4.0 S07 evidence and inventory mapping summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);

if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
