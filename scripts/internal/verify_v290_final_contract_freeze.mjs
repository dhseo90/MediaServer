#!/usr/bin/env node
// 파일 용도: v2.9.0 S01 2.x final contract freeze 문서와 local gate wiring을 정적 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.9.0 final contract freeze verification

Usage:
  ./server.sh verify-v290-final-contract-freeze

Checks:
  - live contract 문서가 v2.9.0 2.x final freeze matrix를 포함
  - Event POST/WebRTC/SSE/WS/media/Auth/Rule payload contract 식별자와 no-mutation 경계가 고정
  - server.sh command, stream verification, feature inventory, backlog, release test records가 같은 gate를 가리킴
  - integrator freeze-baseline이 contract 문서 hash drift를 감지
  - local static gate PASS를 runtime smoke/UI/30분/120분/published evidence로 확대하지 않는 문구 유지
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

const liveContract = readText("docs/live-event-metadata-contracts.md");
const backlog = readText("docs/development-backlog.md");
const streamVerification = readText("docs/stream-verification.md");
const featureInventory = readText("docs/project-feature-test-inventory.md");
const releaseRecords = readText("docs/release-test-records.md");
const configReference = readText("docs/config-reference.md");
const server = readText("server.sh");
const authSource = readText("src/ingress/http_auth.cpp");
const freezeBaseline = readJson("test/fixtures/integrator_contract_artifact/freeze-baseline.json");

check("live contract document owns the v2.9.0 final freeze matrix", () => {
  for (const snippet of [
    "## v2.9.0 2.x Final Contract Freeze",
    "직접 답: v2.9.0에서 닫는 2.x 최종 계약",
    "`verify-v290-final-contract-freeze`",
    "`media-server.va.event.v1`",
    "`media-server.webrtc.va-metadata.v1`, label `va-metadata`",
    "`media-server.va.runtime-metadata.v1`",
    "`media-server.va.metadata-control.v1`",
    "기존 live relay path",
    "기본 auth mode `auto`",
    "기존 Rule/Profile/Event Template/VA Rule 저장 payload",
  ]) {
    assert(liveContract.includes(snippet), `live contract missing freeze snippet: ${snippet}`);
  }
});

check("final freeze records explicit non-goals and evidence boundaries", () => {
  for (const snippet of [
    "3.0 신규 기능 구현",
    "OpenAPI/VMS archive/playback/search API",
    "Event POST/WebRTC DataChannel/SSE/WS payload field",
    "RTSP/WebRTC media path",
    "Auth/Role/Scope default",
    "Rule/Profile draft를 자동 저장/자동 적용",
    "runtime delivery",
    "UI 직접 조작",
    "30분/120분",
    "published GitHub Release metadata",
  ]) {
    assert(liveContract.includes(snippet), `live contract missing non-goal/boundary snippet: ${snippet}`);
  }
});

check("auth role and scope defaults still match the frozen boundary", () => {
  for (const snippet of [
    "std::vector<std::string> DefaultScopesForRole",
    'if (role == "admin" || role == "operator")',
    '"view:read:*"',
    '"source:read:*"',
    '"rule:read:*"',
    '"event:read:*"',
    '"metadata:read:*"',
    '"dashboard:read:*"',
    '"debug:read"',
    '"rule:write"',
    '"source:write"',
    '"ops:read"',
    '"lab:read"',
    'if (role == "viewer")',
    'if (role == "integrator")',
  ]) {
    assert(authSource.includes(snippet), `auth source missing frozen scope snippet: ${snippet}`);
  }
  for (const snippet of [
    "`MEDIA_SERVER_AUTH_MODE`",
    "`auto`",
    "`admin`",
    "`operator`",
    "`viewer`",
    "`integrator`",
    "`source:write`",
    "`rule:write`",
    "`lab:read`",
  ]) {
    assert(configReference.includes(snippet), `config reference missing frozen auth snippet: ${snippet}`);
  }
});

check("server command and script inventory wiring are present", () => {
  for (const snippet of [
    "verify-v290-final-contract-freeze",
    "verify_v290_final_contract_freeze.mjs",
    "v2.9.0 S01 2.x final contract freeze",
  ]) {
    assert(server.includes(snippet), `server.sh missing S01 command snippet: ${snippet}`);
  }
});

check("roadmap and stream verification point S01 to the local gate", () => {
  for (const [label, text] of [
    ["development backlog", backlog],
    ["stream verification", streamVerification],
  ]) {
    for (const snippet of [
      "V290-S01",
      "`./server.sh verify-v290-final-contract-freeze`",
      "3.0 신규 기능 구현이나 migration 완료 evidence가 아님",
    ]) {
      assert(text.includes(snippet), `${label} missing S01 snippet: ${snippet}`);
    }
  }
  assert(backlog.includes("## v2.9.0 S01 개발 기록"), "development backlog missing S01 development record");
});

check("feature inventory maps S01 IDs to this verifier", () => {
  assertSummaryCountAtLeast("전체 기능 항목", 501);
  assertSummaryCountAtLeast("기능 ID 목록", 501);
  assertRangeCovers("SAFE", 72);
  assertRangeCovers("OPS", 42);
  for (const snippet of [
    "V290-S01 2.x final contract freeze | `OPS-042`, `SAFE-072` | `verify-v290-final-contract-freeze`",
    "SAFE-072 | V290-S01 2.x final contract freeze boundary",
    "OPS-042 | V290-S01 2.x final contract freeze 게이트",
  ]) {
    assert(featureInventory.includes(snippet), `feature inventory missing S01 snippet: ${snippet}`);
  }
});

check("release records include S01 test item, first failure, and not-run boundaries", () => {
  for (const snippet of [
    "V290 final contract freeze",
    "`./server.sh verify-v290-final-contract-freeze`",
    "최초 `./server.sh verify-v290-final-contract-freeze`는 command 미구현으로 fail",
    "v290 S01 runtime smoke",
    "v290 S01 UI 풀테스트",
  ]) {
    assert(releaseRecords.includes(snippet), `release records missing S01 snippet: ${snippet}`);
  }
});

check("integrator freeze baseline pins the updated live contract document hash", () => {
  assert(freezeBaseline.schema === "media-server.v200-contract-schema-freeze.v1", "freeze baseline schema mismatch");
  assert(freezeBaseline.requiresSchemaReviewForDrift === true, "freeze baseline must require schema review for drift");
  const entry = freezeBaseline.entries?.find((item) => item.path === "docs/live-event-metadata-contracts.md");
  assert(entry, "freeze baseline missing docs/live-event-metadata-contracts.md");
  assert(entry.group === "live-event-metadata", "live contract document must stay in live-event-metadata group");
  const actualHash = sha256File("docs/live-event-metadata-contracts.md");
  assert(entry.sha256 === actualHash, `live contract hash drift ${actualHash} != ${entry.sha256}`);
  for (const samplePath of [
    "test/fixtures/integrator_contract_artifact/schemas/event-post.schema.json",
    "test/fixtures/integrator_contract_artifact/schemas/webrtc-va-metadata.schema.json",
    "test/fixtures/integrator_contract_artifact/schemas/runtime-metadata.schema.json",
    "test/fixtures/integrator_contract_artifact/schemas/metadata-control.schema.json",
    "test/fixtures/integrator_contract_artifact/samples/event-post.json",
    "test/fixtures/integrator_contract_artifact/samples/webrtc-va-metadata.json",
    "test/fixtures/integrator_contract_artifact/samples/runtime-metadata-sse.json",
    "test/fixtures/integrator_contract_artifact/samples/runtime-metadata-ws.json",
  ]) {
    const sampleEntry = freezeBaseline.entries?.find((item) => item.path === samplePath);
    assert(sampleEntry, `freeze baseline missing sample/schema target: ${samplePath}`);
  }
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
console.log("== v2.9.0 final contract freeze summary ==");
console.log("- schema: media-server.v290-final-contract-freeze.v1");
console.log("- scope: Event POST/WebRTC/SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload static freeze");
console.log("- runtimeSmoke: not-run-by-this-command");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function sha256File(relativePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, relativePath))).digest("hex");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertSummaryCountAtLeast(label, minimum) {
  const pattern = new RegExp(`\\| ${escapeRegExp(label)} \\| ([0-9]+)`);
  const match = featureInventory.match(pattern);
  assert(match, `feature inventory missing summary count: ${label}`);
  const count = Number.parseInt(match[1], 10);
  assert(count >= minimum, `feature inventory ${label} ${count} below ${minimum}`);
}

function assertRangeCovers(prefix, minimum) {
  const pattern = new RegExp(`\`${prefix}-[0-9]{3}\`~\`${prefix}-([0-9]{3})\``, "g");
  const matches = [...featureInventory.matchAll(pattern)];
  assert(matches.length > 0, `feature inventory missing ${prefix} range`);
  const max = Math.max(...matches.map((match) => Number.parseInt(match[1], 10)));
  assert(max >= minimum, `feature inventory ${prefix} range ${max} below ${minimum}`);
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
