#!/usr/bin/env node
// 파일 용도: 최신 actual diagnostic 33개 실패의 DOM/runtime trace replay를 하나의 fail-closed gate로 묶는다.

import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const gates = Object.freeze([
  {
    label: "DOM",
    script: "verify_v390_ui_native_diagnostic_trace_replay_dom_contract.mjs",
    expected: /evaluator GREEN 21\/21/,
    count: 21,
  },
  {
    label: "runtime",
    script: "verify_v390_ui_native_diagnostic_trace_replay_runtime_contract.mjs",
    expected: /actual diagnostic runtime replay: 12 PASS \/ 0 FAIL \/ 12 target/,
    count: 12,
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

if (passed !== 33) throw new Error(`actual diagnostic trace replay coverage mismatch: ${passed}/33`);
console.log(`v390 UI native diagnostic trace replay contract PASS: ${passed}/33`);
