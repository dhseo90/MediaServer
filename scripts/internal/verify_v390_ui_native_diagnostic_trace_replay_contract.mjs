#!/usr/bin/env node
// 파일 용도: 연속 actual diagnostic의 확인된 잔여 33개 실패 replay를 하나의 fail-closed gate로 묶는다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const legacyReplaySources = Object.freeze([
  "verify_v390_ui_native_diagnostic_trace_replay_dom_contract.mjs",
  "verify_v390_ui_native_diagnostic_trace_replay_runtime_contract.mjs",
]);
for (const source of legacyReplaySources) {
  if (!fs.existsSync(path.join(scriptDir, source))) {
    throw new Error(`legacy replay source missing: ${source}`);
  }
}
const gates = Object.freeze([
  {
    label: "checkout-local-input",
    script: "verify_v390_ui_diagnostic_replay_checkout_local_contract.mjs",
    expected: /diagnostic replay checkout-local contract PASS: 5\/5/,
    count: 0,
  },
  {
    label: "impact-291",
    script: "verify_v390_ui_native_diagnostic_trace_replay_impact_contract.mjs",
    expected: /latest closure trace replay: PASS 99\/99 prior=92\/92 repaired=7\/7/,
    count: 390,
  },
  {
    label: "remaining",
    script: "verify_v390_ui_native_diagnostic_trace_replay_remaining_contract.mjs",
    expected: /remaining trace replay: PASS 23\/23/,
    count: 23,
  },
  {
    label: "final",
    script: "verify_v390_ui_native_diagnostic_trace_replay_final_contract.mjs",
    expected: /final trace replay: PASS 13\/13/,
    count: 10,
  },
  {
    label: "request-semantic-isolation",
    script: "verify_v390_ui_native_diagnostic_trace_replay_final_five_contract.mjs",
    expected: /request semantic isolation actual replay: PASS differential=125\/125 prior=120\/120 new=2\/2 failures=18\/18 recorded=125\/125 negative=2\/2/,
    count: 125,
  },
]);

let passed = 0;
for (const gate of gates) {
  const result = spawnSync(process.execPath, [path.join(scriptDir, gate.script)], {
    cwd: path.resolve(scriptDir, "../.."),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.status !== 0 || !gate.expected.test(output)) {
    process.stderr.write(output);
    throw new Error(`${gate.label} actual trace replay failed or reported incomplete coverage`);
  }
  process.stdout.write(result.stdout || "");
  passed += gate.count;
}

if (passed !== 548) throw new Error(`actual diagnostic trace replay coverage mismatch: ${passed}/548`);
console.log(`v390 UI native diagnostic trace replay contract PASS: ${passed}/548`);
