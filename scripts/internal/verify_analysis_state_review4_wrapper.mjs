#!/usr/bin/env node
// 파일 용도: compiled analysis-state smoke를 실행하고 REVIEW4-safe observation을 독립 판독한다.

import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const smoke = spawnSync(path.join(scriptDir, "verify_analysis_state_smoke.sh"), process.argv.slice(2), {
  encoding: "utf8",
  env: process.env,
  maxBuffer: 32 * 1024 * 1024,
});
if (smoke.stdout) process.stdout.write(smoke.stdout);
if (smoke.stderr) process.stderr.write(smoke.stderr);
if ((smoke.status ?? 1) !== 0) process.exit(smoke.status ?? 1);

assertSafe083Observation(smoke.stdout || "");
assertSafe084Observation(smoke.stdout || "");

function assertSafe083Observation(output) {
  const encoded = markerJson(output, "[safe-083-encoded-clip] ");
  assert(encoded.continuousRecording === false && encoded.archiveApi === false && encoded.eventPostPayloadChanged === false && encoded.viewerClientExposureAdded === false,
    "SAFE-083 continuousRecording/archiveApi schema mutation client/viewer boundary failed");
}

function assertSafe084Observation(output) {
  const evidence = markerJson(output, "[safe-084-evidence-manifest] ");
  assert(evidence.eventFrame === true && evidence.representativeImage === true && evidence.bboxCrop === true && evidence.rawPromptStored === false && evidence.rawResponseStored === false,
    "SAFE-084 /ops/events eventFrame/representativeImage/bboxCrop raw material must remain absent");
}

function markerJson(output, marker) {
  const line = output.split(/\r?\n/).find(value => value.startsWith(marker));
  assert(line, `compiled analysis-state marker missing: ${marker}`);
  return JSON.parse(line.slice(marker.length));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
