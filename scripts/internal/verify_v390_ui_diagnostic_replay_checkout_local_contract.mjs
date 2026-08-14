#!/usr/bin/env node

// 파일 용도: diagnostic replay가 tracked projection만 사용하며 checkout-local로 닫히는지 검증한다.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const replaySources = Object.freeze([
  "scripts/internal/verify_v390_ui_native_diagnostic_trace_replay_dom_contract.mjs",
  "scripts/internal/verify_v390_ui_native_diagnostic_trace_replay_runtime_contract.mjs",
  "scripts/internal/verify_v390_ui_native_diagnostic_trace_replay_impact_contract.mjs",
  "scripts/internal/verify_v390_ui_native_diagnostic_trace_replay_remaining_contract.mjs",
  "scripts/internal/verify_v390_ui_native_diagnostic_trace_replay_final_contract.mjs",
  "scripts/internal/verify_v390_ui_native_diagnostic_trace_replay_final_five_contract.mjs",
  "scripts/internal/verify_v390_ui_remaining_actual_trace_replay_contract.mjs",
]);
const projectionPath = path.join(
  root,
  "test/fixtures/v390_ui_diagnostic_replay_tracked_projection.json",
);
const companionProjectionPath = path.join(
  root,
  "test/fixtures/v390_ui_diagnostic_evt004_recorded_contract.json",
);
const checks = [];

function check(label, operation) {
  try {
    operation();
    checks.push({ label, pass: true });
  } catch (error) {
    checks.push({ label, pass: false, error: String(error?.message || error) });
  }
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key =>
      `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash("sha256").update(stable(value)).digest("hex");
}

check("all replay verifiers use the common tracked loader without historical local paths", () => {
  for (const relative of replaySources) {
    const source = fs.readFileSync(path.join(root, relative), "utf8");
    assert(!source.includes(".media_server.test"), `${relative} reads ignored local artifacts`);
    assert(!/v390-ui-diagnostic-(?:20\d{12,}|remaining\d*|final\d*)-[A-Za-z0-9-]+/.test(source),
      `${relative} hardcodes a historical run id`);
    assert(source.includes("v390_ui_diagnostic_replay_projection_loader.mjs"),
      `${relative} does not use the common replay projection loader`);
  }
});

let loader = null;
try {
  loader = await import("./v390_ui_diagnostic_replay_projection_loader.mjs");
} catch (error) {
  checks.push({
    label: "common loader is available",
    pass: false,
    error: String(error?.message || error),
  });
}

if (loader) {
  check("tracked projection is the only loader input", () => {
    const source = fs.readFileSync(path.join(
      root,
      "scripts/internal/v390_ui_diagnostic_replay_projection_loader.mjs",
    ), "utf8");
    assert(!/readFileSync\([^\n]*\.media_server\.test|path\.(?:join|resolve)\([^\n]*\.media_server\.test/.test(source),
      "loader contains a local artifact fallback");
    assert(!source.includes("existsSync"), "loader contains an existence-based fallback");
    assert(!source.includes("process.env"), "loader permits environment-selected replay input");
    assert(fs.existsSync(projectionPath), "tracked replay projection is missing");
    assert(fs.existsSync(companionProjectionPath), "tracked replay companion projection is missing");
  });

  check("projection schema and digest are fail-closed", () => {
    const projection = loader.loadV390UiDiagnosticReplayProjection();
    assert.equal(projection.schema,
      "media-server.v390-ui-diagnostic-replay-tracked-projection.v1");
    assert.equal(projection.projectionSha256, digest({ ...projection, projectionSha256: "" }));
    assert.equal(projection.secretSafety?.rawBodyStored, false);
    assert.equal(projection.secretSafety?.consoleStored, false);
    assert.equal(projection.secretSafety?.absoluteArtifactPathStored, false);

    const schemaDrift = structuredClone(projection);
    schemaDrift.schema = "media-server.v390-ui-diagnostic-replay-tracked-projection.v0";
    assert.throws(() => loader.validateV390UiDiagnosticReplayProjection(schemaDrift), /schema/i);

    const digestDrift = structuredClone(projection);
    digestDrift.runs[Object.keys(digestDrift.runs)[0]].sourceCommit = "0".repeat(40);
    assert.throws(() => loader.validateV390UiDiagnosticReplayProjection(digestDrift), /digest/i);

    const missingRuns = structuredClone(projection);
    delete missingRuns.runs;
    missingRuns.projectionSha256 = digest({ ...missingRuns, projectionSha256: "" });
    assert.throws(() => loader.validateV390UiDiagnosticReplayProjection(missingRuns), /runs/i);

    const companionBytes = fs.readFileSync(companionProjectionPath);
    assert.equal(crypto.createHash("sha256").update(companionBytes).digest("hex"),
      projection.companionProjectionSha256);
    const companion = JSON.parse(companionBytes);
    assert.equal(loader.validateV390UiDiagnosticReplayCompanionProjection(companion), companion);
    const companionSchemaDrift = structuredClone(companion);
    companionSchemaDrift.schema = "media-server.v390-ui-diagnostic-evt004-recorded-contract.v0";
    assert.throws(() => loader.validateV390UiDiagnosticReplayCompanionProjection(
      companionSchemaDrift), /schema/i);
  });

  check("missing run and case projections fail closed", () => {
    assert.throws(() => loader.loadDiagnosticReplayRun("missing-run"), /missing/i);
    const firstRun = Object.keys(loader.loadV390UiDiagnosticReplayProjection().runs)[0];
    assert.throws(() => loader.loadDiagnosticReplayCase(firstRun, "MISSING-CASE"), /missing/i);
  });

  check("checkout-local loader input is independent of process working directory", () => {
    const loaderUrl = new URL("./v390_ui_diagnostic_replay_projection_loader.mjs", import.meta.url).href;
    const output = execFileSync(process.execPath, ["--input-type=module", "--eval",
      `const m=await import(${JSON.stringify(loaderUrl)});` +
      "const p=m.loadV390UiDiagnosticReplayProjection();" +
      "process.stdout.write(`${p.projectionSha256}:${Object.keys(p.runs).length}`);"], {
      cwd: os.tmpdir(),
      encoding: "utf8",
    });
    const projection = loader.loadV390UiDiagnosticReplayProjection();
    assert.equal(output, `${projection.projectionSha256}:${Object.keys(projection.runs).length}`);
  });
}

const failures = checks.filter(item => !item.pass);
for (const item of checks) {
  console.log(`[${item.pass ? "PASS" : "FAIL"}] ${item.label}${item.error ? `: ${item.error}` : ""}`);
}
if (failures.length > 0) {
  console.error(`v390 UI diagnostic replay checkout-local contract FAIL: ${checks.length - failures.length}/${checks.length}`);
  process.exit(1);
}
console.log(`v390 UI diagnostic replay checkout-local contract PASS: ${checks.length}/${checks.length}`);
