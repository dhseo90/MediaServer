#!/usr/bin/env node
// 파일 용도: V210-S03 cloud provider field smoke gate와 선택 field 실행 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM cloud provider field smoke gate verification

Usage:
  ./server.sh verify-vlm-cloud-provider-field-smoke-gate [options]

Options:
  --allow-field-call    Allow a real provider call, only when MEDIA_SERVER_VLM_CLOUD_FIELD_SMOKE_APPROVED=1 and an env API key are also present.
  --provider <name>     Provider name. Default: gemini.
  --model <name>        Model name. Default: gemini-2.5-flash.
  --endpoint <url>      Optional provider endpoint override for approved field runs.
  --timeout-ms <ms>     Approved field run timeout. Default: 8000.
  --report <path>       Write a Markdown field smoke gate report.
  --json-report <path>  Write a JSON field smoke gate report.
  -h, --help            Show help.

Checks:
  - V210-S03 fixture separates not-run, missing-credential, provider failure, and provider pass states.
  - Real provider calls require manual flag, env approval, and env-only credential.
  - Default gate PASS is not provider field smoke PASS.
  - Reports do not store credential material, raw prompt, or raw provider response.
  - docs, feature inventory, server.sh, script inventory, and privacy guard wiring are present.
`);
}

assertKnownOptions(rawArgs, [
  "allow-field-call",
  "provider",
  "model",
  "endpoint",
  "timeout-ms",
  "report",
  "json-report",
  "h",
  "help",
]);

const args = parseArgs(rawArgs);
const fixturePath = "test/fixtures/vlm_cloud_provider_field_smoke_gate/cases.json";
const fixture = readJson(fixturePath);
const envApproval = process.env.MEDIA_SERVER_VLM_CLOUD_FIELD_SMOKE_APPROVED === "1";
const credential =
  process.env.MEDIA_SERVER_VLM_CLOUD_API_KEY ||
  process.env.GEMINI_API_KEY ||
  "";
const provider = args.provider || process.env.MEDIA_SERVER_VLM_CLOUD_PROVIDER || fixture.defaultProvider || "gemini";
const model = args.model || process.env.MEDIA_SERVER_VLM_CLOUD_MODEL || fixture.defaultModel || "gemini-2.5-flash";

const report = {
  schema: "media-server.vlm-cloud-provider-field-smoke-gate-report.v1",
  targetStep: "V210-S03",
  generatedAt: new Date().toISOString(),
  gateStatus: "pass",
  fixturePath,
  fieldSmoke: {
    provider,
    model,
    manualApprovalFlag: args.allowFieldCall,
    envApproval,
    credentialSource: credential ? "env" : "missing",
    providerApiCalled: false,
    status: "not-run",
    releasePassEligible: false,
    reason: "",
    httpStatus: null,
    latencyMs: null,
    responseShape: "not-run",
  },
  redaction: {
    credentialMaterialStored: false,
    rawPromptStored: false,
    rawProviderResponseStored: false,
    sourceUrlStored: false,
    rawFrameBytesStored: false,
    viewerClientExposureAdded: false,
  },
  summary: {
    fixtureCases: 0,
    releaseEligibleFixtureCases: 0,
    notRunFixtureCases: 0,
    failNotEligibleFixtureCases: 0,
  },
  cases: [],
  checks: [],
};

const checks = [];
assert(report.redaction.credentialMaterialStored === false, "credentialMaterialStored must remain absent/false");

check("fixture covers required V210-S03 cloud field smoke gate matrix", async () => {
  assert(fixture.schema === "media-server.vlm-cloud-provider-field-smoke-gate-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V210-S03", "fixture targetStep mismatch");
  assert(fixture.defaultProvider === "gemini", "fixture default provider mismatch");
  assert(fixture.defaultModel === "gemini-2.5-flash", "fixture default model mismatch");
  const ids = new Set((fixture.cases || []).map(item => item.id));
  for (const id of [
    "not-approved-not-run",
    "manual-flag-without-env-approval-not-run",
    "env-approval-without-manual-flag-not-run",
    "approved-missing-credential-blocked",
    "approved-provider-timeout-fail-not-release-pass",
    "approved-provider-pass-release-eligible",
  ]) {
    assert(ids.has(id), `missing cloud field gate case: ${id}`);
  }
});

check("fixture gate decisions never treat not-run or failure as release PASS", async () => {
  const cases = fixture.cases.map(evaluateFixtureCase);
  report.cases = cases;
  report.summary.fixtureCases = cases.length;
  report.summary.releaseEligibleFixtureCases = cases.filter(item => item.releasePassEligible).length;
  report.summary.notRunFixtureCases = cases.filter(item => item.fieldSmokeStatus === "not-run").length;
  report.summary.failNotEligibleFixtureCases = cases.filter(item => item.fieldSmokeStatus === "fail" && !item.releasePassEligible).length;

  for (const item of cases) {
    assert(item.status === "pass", `${item.id}: fixture expectation mismatch`);
    if (item.fieldSmokeStatus !== "pass") {
      assert(item.releasePassEligible === false, `${item.id}: non-pass field smoke must not be release eligible`);
    }
    if (!item.manualApprovalFlag || !item.envApproval || !item.credentialPresent) {
      assert(item.providerApiCalled === false, `${item.id}: provider must not be called before approval and credential`);
    }
  }
  assert(report.summary.releaseEligibleFixtureCases === 1, "exactly one fixture case should be release eligible");
  assert(report.summary.notRunFixtureCases === 3, "expected three not-run fixture cases");
  assert(report.summary.failNotEligibleFixtureCases === 1, "expected one failure-not-eligible fixture case");
});

check("current execution produces sanitized gate report and only calls provider with explicit approval", async () => {
  const fieldSmoke = await runCurrentFieldGate();
  report.fieldSmoke = fieldSmoke;
  assert(fieldSmoke.releasePassEligible === (fieldSmoke.status === "pass" && fieldSmoke.providerApiCalled === true), "release eligibility rule mismatch");
  if (!args.allowFieldCall || !envApproval || !credential) {
    assert(fieldSmoke.providerApiCalled === false, "provider call happened without full approval and credential");
    assert(fieldSmoke.releasePassEligible === false, "not-run/blocked field smoke must not be release eligible");
  }
  assertReportRedacted(report, credential);
});

check("docs, feature inventory, server command, script inventory, and privacy guard are wired", async () => {
  const docs = [
    readText("docs/vlm-cloud-provider-field-smoke-gate.md"),
    readText("docs/vlm-privacy-transfer-guard.md"),
    readText("docs/development-backlog.md"),
    readText("docs/stream-verification.md"),
    readText("docs/project-feature-test-inventory.md"),
    readText("docs/README.md"),
  ].join("\n");
  const serverSh = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
  const manifest = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
  for (const snippet of [
    "V210-S03",
    "Cloud provider field smoke gate",
    "media-server.vlm-cloud-provider-field-smoke-gate-fixtures.v1",
    "media-server.vlm-cloud-provider-field-smoke-gate-report.v1",
    "verify-vlm-cloud-provider-field-smoke-gate",
    "gemini-2.5-flash",
    "not-approved-not-run",
    "approved-missing-credential-blocked",
    "approved-provider-timeout-fail-not-release-pass",
    "LAB-057",
    "SAFE-035",
  ]) {
    assert(docs.includes(snippet), `docs missing cloud field gate snippet: ${snippet}`);
  }
  for (const snippet of [
    "verify-vlm-cloud-provider-field-smoke-gate",
    "verify_vlm_cloud_provider_field_smoke_gate.mjs",
  ]) {
    assert(serverSh.includes(snippet), `server.sh missing cloud field gate snippet: ${snippet}`);
  }
  assert(scriptInventory.includes("verify_vlm_cloud_provider_field_smoke_gate.mjs"), "script inventory missing cloud field gate verifier");
  assert(manifest.items.find(item => item.id === "SAFE-035")?.verifierEvidence?.command === "verify-vlm-cloud-provider-field-smoke-gate",
    "SAFE-035 manifest verifier command drift");
  assert(coverage.includes("validateImplementationManifest") && coverage.includes("verifierEvidenceRows"),
    "feature coverage must validate manifest-backed verifier evidence");
});

let failCount = 0;
for (const item of checks) {
  try {
    await item.run();
    report.checks.push({ name: item.name, status: "pass" });
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failCount += 1;
    report.gateStatus = "fail";
    const message = error instanceof Error ? error.message : String(error);
    report.checks.push({ name: item.name, status: "fail", message });
    console.log(`[fail] ${item.name}: ${message}`);
  }
}

const requestedFieldRun = args.allowFieldCall && envApproval;
const fieldRunFailed = requestedFieldRun && report.fieldSmoke.status !== "pass";

assertVlmCloudProviderFieldSmokeArtifact(report);

console.log("");
console.log("== VLM cloud provider field smoke gate summary ==");
console.log(`- schema: ${report.schema}`);
console.log(`- gateStatus: ${report.gateStatus}`);
console.log(`- provider: ${report.fieldSmoke.provider}`);
console.log(`- model: ${report.fieldSmoke.model}`);
console.log(`- fieldSmokeStatus: ${report.fieldSmoke.status}`);
console.log(`- providerApiCalled: ${report.fieldSmoke.providerApiCalled}`);
console.log(`- releasePassEligible: ${report.fieldSmoke.releasePassEligible}`);
console.log(`- pass: ${report.checks.filter(item => item.status === "pass").length}`);
console.log(`- fail: ${failCount}`);
if (fieldRunFailed) {
  console.log("- fieldRunFailure: approved field run did not pass");
}

if (args.report) writeText(path.resolve(rootDir, args.report), renderMarkdown(report));
if (args.jsonReport) writeText(path.resolve(rootDir, args.jsonReport), `${JSON.stringify(report, null, 2)}\n`);
if (failCount > 0 || fieldRunFailed) process.exit(1);

function check(name, run) {
  checks.push({ name, run });
}

function evaluateFixtureCase(item) {
  const providerApiCalled = item.manualApprovalFlag && item.envApproval && item.credentialPresent;
  let fieldSmokeStatus = "not-run";
  if (item.manualApprovalFlag && item.envApproval && !item.credentialPresent) {
    fieldSmokeStatus = "blocked-missing-credential";
  } else if (providerApiCalled && item.providerOutcome === "pass") {
    fieldSmokeStatus = "pass";
  } else if (providerApiCalled) {
    fieldSmokeStatus = "fail";
  }
  const redactionOk = Object.values(item.redaction || {}).every(value => value === false);
  const releasePassEligible = fieldSmokeStatus === "pass" && providerApiCalled && redactionOk;
  const status =
    item.expected?.gateStatus === "pass" &&
    item.expected?.fieldSmokeStatus === fieldSmokeStatus &&
    item.expected?.providerApiCalled === providerApiCalled &&
    item.expected?.releasePassEligible === releasePassEligible
      ? "pass"
      : "fail";
  return {
    id: item.id,
    status,
    manualApprovalFlag: item.manualApprovalFlag,
    envApproval: item.envApproval,
    credentialPresent: item.credentialPresent,
    providerApiCalled,
    fieldSmokeStatus,
    releasePassEligible,
  };
}

async function runCurrentFieldGate() {
  const fieldSmoke = {
    provider,
    model,
    manualApprovalFlag: args.allowFieldCall,
    envApproval,
    credentialSource: credential ? "env" : "missing",
    providerApiCalled: false,
    status: "not-run",
    releasePassEligible: false,
    reason: "",
    httpStatus: null,
    latencyMs: null,
    responseShape: "not-run",
  };

  if (!args.allowFieldCall || !envApproval) {
    fieldSmoke.reason = "manual flag and env approval are both required";
    return fieldSmoke;
  }
  if (!credential) {
    fieldSmoke.status = "blocked-missing-credential";
    fieldSmoke.responseShape = "not-called";
    fieldSmoke.reason = "approved field smoke requires env credential";
    return fieldSmoke;
  }
  if (provider !== "gemini") {
    fieldSmoke.status = "fail";
    fieldSmoke.responseShape = "unsupported-provider";
    fieldSmoke.reason = "only gemini provider is supported by this gate";
    return fieldSmoke;
  }

  fieldSmoke.providerApiCalled = true;
  const startedAt = Date.now();
  try {
    const result = await callGeminiProvider({
      model,
      endpoint: args.endpoint || process.env.MEDIA_SERVER_VLM_CLOUD_FIELD_ENDPOINT || "",
      timeoutMs: args.timeoutMs,
      credential,
    });
    fieldSmoke.httpStatus = result.httpStatus;
    fieldSmoke.latencyMs = Date.now() - startedAt;
    fieldSmoke.responseShape = result.responseShape;
    fieldSmoke.status = result.status;
    fieldSmoke.releasePassEligible = result.status === "pass";
    fieldSmoke.reason = result.reason;
    return fieldSmoke;
  } catch (error) {
    fieldSmoke.latencyMs = Date.now() - startedAt;
    fieldSmoke.status = "fail";
    fieldSmoke.responseShape = "error";
    fieldSmoke.reason = sanitizeError(error);
    return fieldSmoke;
  }
}

async function callGeminiProvider({ model, endpoint, timeoutMs, credential }) {
  const url = endpoint || `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": credential,
      },
      body: JSON.stringify(buildGeminiRequest()),
      signal: controller.signal,
    });
    const httpStatus = response.status;
    const text = await response.text();
    if (!response.ok) {
      return {
        status: "fail",
        httpStatus,
        responseShape: "http-error",
        reason: `provider returned HTTP ${httpStatus}`,
      };
    }
    const body = JSON.parse(text);
    const content = extractGeminiText(body);
    const parsed = parseProviderJson(content);
    if (!parsed.valid) {
      return {
        status: "fail",
        httpStatus,
        responseShape: "invalid-output",
        reason: "provider response did not match smoke JSON schema",
      };
    }
    return {
      status: "pass",
      httpStatus,
      responseShape: "structured-json-pass",
      reason: "approved provider field smoke passed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildGeminiRequest() {
  return {
    contents: [
      {
        parts: [
          {
            text:
              "Return JSON only with schema media-server.vlm-cloud-field-smoke-output.v1 and status ok. Do not include secrets.",
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
    },
  };
}

function extractGeminiText(body) {
  const parts = body?.candidates?.[0]?.content?.parts || [];
  return parts.map(part => part.text || "").join("");
}

function parseProviderJson(text) {
  try {
    const parsed = JSON.parse(stripJsonFence(text));
    return {
      valid: parsed.schema === "media-server.vlm-cloud-field-smoke-output.v1" && parsed.status === "ok",
    };
  } catch {
    return { valid: false };
  }
}

function stripJsonFence(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function assertReportRedacted(data, secret) {
  const serialized = JSON.stringify(data);
  if (secret) {
    assert(!serialized.includes(secret), "report includes credential material");
  }
  for (const phrase of [
    "Return JSON only with schema",
    "raw provider response",
  ]) {
    assert(!serialized.includes(phrase), `report includes raw prompt/response phrase: ${phrase}`);
  }
  for (const [field, value] of Object.entries(data.redaction || {})) {
    assert(value === false, `redaction field must be false: ${field}`);
  }
}

function parseArgs(argv) {
  const parsed = {
    allowFieldCall: false,
    provider: "",
    model: "",
    endpoint: "",
    timeoutMs: 8000,
    report: "",
    jsonReport: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--allow-field-call") parsed.allowFieldCall = true;
    else if (token === "--provider") parsed.provider = requireValue(argv, index += 1, token);
    else if (token.startsWith("--provider=")) parsed.provider = token.slice("--provider=".length);
    else if (token === "--model") parsed.model = requireValue(argv, index += 1, token);
    else if (token.startsWith("--model=")) parsed.model = token.slice("--model=".length);
    else if (token === "--endpoint") parsed.endpoint = requireValue(argv, index += 1, token);
    else if (token.startsWith("--endpoint=")) parsed.endpoint = token.slice("--endpoint=".length);
    else if (token === "--timeout-ms") parsed.timeoutMs = parsePositiveInteger(requireValue(argv, index += 1, token), token);
    else if (token.startsWith("--timeout-ms=")) parsed.timeoutMs = parsePositiveInteger(token.slice("--timeout-ms=".length), "--timeout-ms");
    else if (token === "--report") parsed.report = requireValue(argv, index += 1, token);
    else if (token.startsWith("--report=")) parsed.report = token.slice("--report=".length);
    else if (token === "--json-report") parsed.jsonReport = requireValue(argv, index += 1, token);
    else if (token.startsWith("--json-report=")) parsed.jsonReport = token.slice("--json-report=".length);
  }
  return parsed;
}

function renderMarkdown(data) {
  const rows = data.cases
    .map(item => `| ${item.id} | ${item.fieldSmokeStatus} | ${item.providerApiCalled} | ${item.releasePassEligible} | ${item.status} |`)
    .join("\n");
  return `# VLM Cloud Provider Field Smoke Gate Report

- schema: \`${data.schema}\`
- targetStep: \`${data.targetStep}\`
- gateStatus: \`${data.gateStatus}\`
- provider: \`${data.fieldSmoke.provider}\`
- model: \`${data.fieldSmoke.model}\`
- manualApprovalFlag: \`${data.fieldSmoke.manualApprovalFlag}\`
- envApproval: \`${data.fieldSmoke.envApproval}\`
- credentialSource: \`${data.fieldSmoke.credentialSource}\`
- providerApiCalled: \`${data.fieldSmoke.providerApiCalled}\`
- fieldSmokeStatus: \`${data.fieldSmoke.status}\`
- releasePassEligible: \`${data.fieldSmoke.releasePassEligible}\`
- responseShape: \`${data.fieldSmoke.responseShape}\`
- reason: \`${data.fieldSmoke.reason}\`

| Fixture case | Field status | Provider called | Release eligible | Status |
| --- | --- | --- | --- | --- |
${rows}

## Non-Substitution

Default gate PASS is not provider field smoke PASS. A not-run, blocked, timeout,
or failed provider result is not release PASS evidence.
`;
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function requireValue(argv, index, option) {
  const value = argv[index];
  assert(value && !value.startsWith("--"), `${option} requires a value`);
  return value;
}

function parsePositiveInteger(value, option) {
  const parsed = Number.parseInt(value, 10);
  assert(Number.isFinite(parsed) && parsed > 0, `${option} must be a positive integer`);
  return parsed;
}

function sanitizeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (credential) return message.replaceAll(credential, "[redacted]");
  return message;
}

function assertVlmCloudProviderFieldSmokeArtifact(value) {
  const artifactPath = path.join(process.env.TMPDIR || "/tmp", `media-server-vlm-cloud-provider-field-smoke-${process.pid}.json`);
  fs.writeFileSync(artifactPath, `${JSON.stringify(value)}\n`, "utf8");
  try {
    const observedReport = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    assert(observedReport.schema === "media-server.vlm-cloud-provider-field-smoke-gate-report.v1" && observedReport.fieldSmoke.releasePassEligible === (observedReport.fieldSmoke.status === "pass" && observedReport.fieldSmoke.providerApiCalled === true), "VLM cloud provider artifact releasePassEligible readback mismatch");
  } finally {
    fs.rmSync(artifactPath, { force: true });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
