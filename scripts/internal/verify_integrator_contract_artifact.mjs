#!/usr/bin/env node
// 파일 용도: integrator contract artifact sample bundle과 문서/entrypoint 연결을 정적 검증한다.
// 동작 요약: manifest, JSON Schema, sample payload, 금지 노출 후보, server.sh 등록 상태를 점검한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Integrator contract artifact verification

Usage:
  ./server.sh verify-integrator-contract-artifact [--artifact-dir <dir>]

Checks:
  - manifest/schema/sample JSON parse와 contract identifier 일치
  - README/changelog/field index/schema review checklist가 manifest와 일치
  - sample payload가 제공된 JSON Schema subset을 만족
  - sample에 source URL/userinfo/credential/token/hash 노출 후보가 없음
  - live contract 문서, backlog, server.sh, script inventory 연결 유지
`);
}

assertKnownOptions(rawArgs, ["artifact-dir", "h", "help"]);

const args = parseArgs(rawArgs);
const artifactDir = path.resolve(rootDir, args.artifactDir || "test/fixtures/integrator_contract_artifact");
const manifestPath = path.join(artifactDir, "manifest.json");
const checks = [];

check("manifest and contract files are present", () => {
  const manifest = readJson(manifestPath);
  assert(manifest.schema === "media-server.integrator-contract-artifact.v1", "manifest schema mismatch");
  assert(manifest.artifactVersion === "v1.2.0-integrator-contract-artifact.1", "artifact version mismatch");
  assert(Array.isArray(manifest.files) && manifest.files.length >= 15, "manifest files list is incomplete");
  for (const file of manifest.files) {
    assert(fs.existsSync(path.join(artifactDir, file)), `manifest-listed file missing: ${file}`);
  }
  assert(Array.isArray(manifest.contracts) && manifest.contracts.length === 5, "manifest must list five contract samples");
  for (const item of manifest.contracts) {
    assert(item.id && item.contractIdentifier && item.schemaFile && item.sampleFile, `manifest contract missing fields: ${JSON.stringify(item)}`);
    assert(fs.existsSync(path.join(artifactDir, item.schemaFile)), `${item.id}: schema file missing`);
    assert(fs.existsSync(path.join(artifactDir, item.sampleFile)), `${item.id}: sample file missing`);
  }
});

check("bundle support docs pin review and change boundaries", () => {
  const manifest = readJson(manifestPath);
  const readme = readBundleText("README.md");
  const changelog = readBundleText("CHANGELOG.md");
  const reviewChecklist = readBundleText("schema-review-checklist.md");
  const fieldIndex = readJson(path.join(artifactDir, "field-index.json"));
  assert(manifest.files.includes("README.md"), "manifest missing README.md");
  assert(manifest.files.includes("CHANGELOG.md"), "manifest missing CHANGELOG.md");
  assert(manifest.files.includes("field-index.json"), "manifest missing field-index.json");
  assert(manifest.files.includes("schema-review-checklist.md"), "manifest missing schema-review-checklist.md");
  assert(fieldIndex.schema === "media-server.integrator-contract-field-index.v1", "field index schema mismatch");
  assert(fieldIndex.artifactVersion === manifest.artifactVersion, "field index artifactVersion mismatch");
  for (const snippet of [
    "does not define a new API",
    "Runtime delivery verification is separate",
    "./server.sh verify-integrator-contract-artifact",
  ]) {
    assert(readme.includes(snippet), `bundle README missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "No Event POST, WebRTC DataChannel, SSE, or WebSocket runtime payload fields",
    "were added, removed, renamed, or retyped",
  ]) {
    assert(changelog.includes(snippet), `bundle changelog missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "recorded archive, playback, search, VMS, or",
    "Source locators, endpoint userinfo, credentials, token hashes, raw JSON",
    "Runtime delivery smoke was run when runtime delivery is claimed",
  ]) {
    assert(reviewChecklist.includes(snippet), `schema review checklist missing snippet: ${snippet}`);
  }
});

check("sample payloads match manifest identifiers and schema files", () => {
  const manifest = readJson(manifestPath);
  for (const item of manifest.contracts) {
    const schema = readJson(path.join(artifactDir, item.schemaFile));
    const sample = readJson(path.join(artifactDir, item.sampleFile));
    assert(schema.$id === item.contractIdentifier, `${item.id}: schema $id mismatch`);
    assert(sample.schema === item.contractIdentifier, `${item.id}: sample schema mismatch`);
    validateSchema(sample, schema, item.id);
  }
});

check("schema samples keep known live identifiers pinned", () => {
  const manifest = readJson(manifestPath);
  const fieldIndex = readJson(path.join(artifactDir, "field-index.json"));
  const expected = new Map([
    ["event-post", "media-server.va.event.v1"],
    ["webrtc-va-metadata", "media-server.webrtc.va-metadata.v1"],
    ["sse-runtime-metadata", "media-server.va.runtime-metadata.v1"],
    ["ws-runtime-metadata", "media-server.va.runtime-metadata.v1"],
    ["ws-control-ack", "media-server.va.metadata-control.v1"],
  ]);
  for (const item of manifest.contracts) {
    assert(expected.get(item.id) === item.contractIdentifier, `${item.id}: unexpected identifier ${item.contractIdentifier}`);
  }
  for (const [id, identifier] of expected.entries()) {
    if (id === "sse-runtime-metadata" || id === "ws-runtime-metadata") continue;
    const indexItem = fieldIndex.contracts?.find((item) => item.id === id);
    assert(indexItem?.identifier === identifier, `${id}: field index identifier mismatch`);
    assert(Array.isArray(indexItem.requiredTopLevelFields) && indexItem.requiredTopLevelFields.includes("schema"), `${id}: field index missing required fields`);
  }
  const runtimeIndex = fieldIndex.contracts?.find((item) => item.id === "runtime-metadata");
  assert(runtimeIndex?.identifier === "media-server.va.runtime-metadata.v1", "runtime field index identifier mismatch");
  assert(runtimeIndex.transports?.includes("sse-runtime-metadata"), "runtime field index missing SSE transport");
  assert(runtimeIndex.transports?.includes("ws-runtime-metadata"), "runtime field index missing WS transport");
  const webrtc = manifest.contracts.find((item) => item.id === "webrtc-va-metadata");
  assert(webrtc?.channelLabel === "va-metadata", "WebRTC DataChannel label must stay va-metadata");
  const webrtcIndex = fieldIndex.contracts?.find((item) => item.id === "webrtc-va-metadata");
  assert(webrtcIndex?.channelLabel === "va-metadata", "field index WebRTC label must stay va-metadata");
  assert(webrtcIndex.explicitlyExcludedFields?.includes("source"), "WebRTC field index must keep source excluded");
});

check("samples and support docs avoid operational secret and source locator leaks", () => {
  const sampleDir = path.join(artifactDir, "samples");
  const supportFiles = ["README.md", "CHANGELOG.md", "field-index.json", "schema-review-checklist.md", "manifest.json"];
  const sampleForbidden = [
    /passwordHash/i,
    /tokenHash/i,
    /credential/i,
    /rtsp:\/\//i,
    /rtsps:\/\//i,
    /https?:\/\/[^/\s"']+:[^@\s"']+@/i,
    /\b192\.168\.\d{1,3}\.\d{1,3}\b/,
    /\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,
    /\b172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}\b/
  ];
  const supportForbidden = [
    /rtsp:\/\//i,
    /rtsps:\/\//i,
    /https?:\/\/[^/\s"']+:[^@\s"']+@/i,
    /\b192\.168\.\d{1,3}\.\d{1,3}\b/,
    /\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,
    /\b172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}\b/
  ];
  for (const file of fs.readdirSync(sampleDir).filter((name) => name.endsWith(".json"))) {
    const text = fs.readFileSync(path.join(sampleDir, file), "utf8");
    for (const pattern of sampleForbidden) {
      assert(!pattern.test(text), `${file}: forbidden sample exposure candidate ${pattern}`);
    }
  }
  for (const file of supportFiles) {
    const text = fs.readFileSync(path.join(artifactDir, file), "utf8");
    for (const pattern of supportForbidden) {
      assert(!pattern.test(text), `${file}: forbidden support doc exposure candidate ${pattern}`);
    }
  }
});

check("documentation and entrypoints reference the artifact", () => {
  const doc = readText("docs/integrator-contract-artifact.md");
  const liveContract = readText("docs/live-event-metadata-contracts.md");
  const backlog = readText("docs/development-backlog.md");
  const readme = readText("README.md");
  const server = readText("server.sh");
  const inventory = readText("scripts/internal/verify_script_inventory.mjs");
  for (const snippet of [
    "media-server.integrator-contract-artifact.v1",
    "test/fixtures/integrator_contract_artifact/",
    "field-index.json",
    "schema-review-checklist.md",
    "./server.sh verify-integrator-contract-artifact",
    "payload field를 추가하거나 삭제하지 않습니다"
  ]) {
    assert(doc.includes(snippet), `integrator doc missing snippet: ${snippet}`);
  }
  assert(liveContract.includes("./integrator-contract-artifact.md"), "live contract doc missing artifact link");
  assert(backlog.includes("V120-P1-03은 Integrator contract artifact"), "backlog missing V120-P1-03 closure note");
  assert(backlog.includes("V120-P1-03 범주 안의 잔여 이슈는 남기지 않습니다"), "backlog missing in-scope no-residual statement");
  assert(readme.includes("Integrator contract artifact"), "README missing integrator contract artifact roadmap link");
  assert(server.includes("verify-integrator-contract-artifact"), "server.sh missing verifier command");
  assert(server.includes("verify_integrator_contract_artifact.mjs"), "server.sh missing verifier script target");
  assert(inventory.includes("verify_integrator_contract_artifact.mjs"), "script inventory missing verifier script");
});

let failCount = 0;
for (const item of checks) {
  try {
    item.run();
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failCount += 1;
    console.error(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log("");
console.log("== Integrator contract artifact verification summary ==");
console.log(`- artifactDir: ${path.relative(rootDir, artifactDir)}`);
console.log(`- pass: ${checks.length - failCount}`);
console.log(`- fail: ${failCount}`);

if (failCount > 0) {
  process.exit(1);
}

function parseArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const eq = arg.startsWith("--") ? arg.indexOf("=") : -1;
    const name = eq >= 0 ? arg.slice(2, eq) : arg.replace(/^--/, "");
    const inlineValue = eq >= 0 ? arg.slice(eq + 1) : undefined;
    if (name === "artifact-dir") parsed.artifactDir = inlineValue ?? args[++i];
  }
  return parsed;
}

function check(name, run) {
  checks.push({ name, run });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readBundleText(relativePath) {
  return fs.readFileSync(path.join(artifactDir, relativePath), "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateSchema(value, schema, label, schemaRoot = schema, pathLabel = "$") {
  if (schema.$ref) {
    return validateSchema(value, resolveRef(schema.$ref, schemaRoot), label, schemaRoot, pathLabel);
  }
  if (Object.prototype.hasOwnProperty.call(schema, "const")) {
    assert(value === schema.const, `${label} ${pathLabel}: expected const ${schema.const}, got ${JSON.stringify(value)}`);
  }
  if (schema.type) {
    const expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
    assert(expectedTypes.some((type) => matchesType(value, type)), `${label} ${pathLabel}: expected type ${expectedTypes.join("|")}, got ${typeOf(value)}`);
  }
  if (Array.isArray(schema.enum)) {
    assert(schema.enum.includes(value), `${label} ${pathLabel}: enum mismatch`);
  }
  if (typeof schema.minimum === "number" && typeof value === "number") {
    assert(value >= schema.minimum, `${label} ${pathLabel}: below minimum ${schema.minimum}`);
  }
  if (typeof schema.maximum === "number" && typeof value === "number") {
    assert(value <= schema.maximum, `${label} ${pathLabel}: above maximum ${schema.maximum}`);
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const required of schema.required || []) {
      assert(Object.prototype.hasOwnProperty.call(value, required), `${label} ${pathLabel}: missing required field ${required}`);
    }
    for (const [key, childSchema] of Object.entries(schema.properties || {})) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        validateSchema(value[key], childSchema, label, schemaRoot, `${pathLabel}.${key}`);
      }
    }
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) => validateSchema(item, schema.items, label, schemaRoot, `${pathLabel}[${index}]`));
  }
}

function resolveRef(ref, schemaRoot) {
  if (ref.startsWith("#/$defs/")) {
    const name = ref.slice("#/$defs/".length);
    const common = readJson(path.join(artifactDir, "schemas/common.json"));
    const resolved = schemaRoot.$defs?.[name] || common.$defs?.[name];
    assert(resolved, `missing local schema ref ${ref}`);
    return resolved;
  }
  if (ref.startsWith("common.json#/$defs/")) {
    const name = ref.slice("common.json#/$defs/".length);
    const common = readJson(path.join(artifactDir, "schemas/common.json"));
    const resolved = common.$defs?.[name];
    assert(resolved, `missing common schema ref ${ref}`);
    return resolved;
  }
  throw new Error(`unsupported schema ref ${ref}`);
}

function matchesType(value, type) {
  if (type === "array") return Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "null") return value === null;
  return typeof value === type && !Array.isArray(value);
}

function typeOf(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}
