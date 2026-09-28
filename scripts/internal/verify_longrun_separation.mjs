#!/usr/bin/env node
// 파일 용도: 기본 smoke와 장기 longrun 검증 명령이 문서와 스크립트에서 분리되어 있는지 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { hasDocumentLink } from "./documentation_contract_lib.mjs";
import { parseServerDispatches } from "./script_dispatch_parser.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const checks = [];

check("basic test mode does not invoke longrun harnesses", () => {
  const testAll = readText("scripts/internal/test_all.sh");
  assert(!testAll.includes("verify-event-post-longrun"), "test_all.sh must use verify-event-post smoke, not verify-event-post-longrun");

  const basicBlock = shellIfBlock(testAll, 'if [[ "${MODE}" == "basic" ]]');
  assert(!basicBlock.includes("INCLUDE_URI_LONGRUN=1"), "basic mode must not enable URI longrun");
  assert(!basicBlock.includes("INCLUDE_WEBRTC_ICE=1"), "basic mode must not enable external ICE checks");
  assert(!basicBlock.includes("INCLUDE_EVENT_POST=1"), "basic mode must not enable event POST checks");
});

check("full test mode does not invoke longrun harnesses", () => {
  const testAll = readText("scripts/internal/test_all.sh");
  const fullBlock = shellIfBlock(testAll, 'if [[ "${MODE}" == "full" ]]');
  assert(!fullBlock.includes("INCLUDE_URI_LONGRUN=1"), "full mode must not enable URI longrun");
  assert(!fullBlock.includes("INCLUDE_WEBRTC_ICE=1"), "full mode must not enable external ICE checks");
  assert(fullBlock.includes("INCLUDE_EVENT_POST=1"), "full mode should keep event POST smoke");
});

check("test modes keep event POST smoke commands", () => {
  const testAll = readText("scripts/internal/test_all.sh");
  assert(testAll.includes("./server.sh verify-event-post --mode schema"), "test_all.sh must run event POST schema smoke");
  assert(testAll.includes("./server.sh verify-event-post --mode recovery"), "test_all.sh must run event POST recovery smoke");
});

check("longrun commands remain explicit server.sh entrypoints", () => {
  const server = readText("server.sh");
  const dispatches = parseServerDispatches(server);
  const requiredCommands = [
    "verify-uri-longrun",
    "verify-event-post-longrun",
    "verify-va-runtime-console-longrun",
    "verify-va-runtime-console-cycles",
    "verify-predev",
    "verify-longrun-separation",
  ];
  for (const command of requiredCommands) {
    assert(dispatches.filter(item => item.command === command).length === 1, "server.sh dispatch missing/duplicate: " + command);
  }
});

check("stream verification docs keep short gates documented", () => {
  const docs = readText("docs/stream-verification.md");
  const requiredSnippets = [
    "./server.sh test --full",
    "verify-event-post --mode schema",
    "verify-event-post --mode recovery",
  ];
  for (const snippet of requiredSnippets) {
    assert(docs.includes(snippet), `docs/stream-verification.md is missing: ${snippet}`);
  }
});

check("stream verification docs keep long gates documented", () => {
  const docs = readText("docs/stream-verification.md");
  const requiredSnippets = [
    "./server.sh verify-uri-longrun",
    "./server.sh verify-event-post-longrun",
    "./server.sh verify-va-runtime-console-longrun",
    "./server.sh verify-va-runtime-console-cycles",
    "./server.sh verify-longrun-separation",
    "./server.sh verify-rc-release-gate",
  ];
  for (const snippet of requiredSnippets) {
    assert(docs.includes(snippet), `docs/stream-verification.md is missing: ${snippet}`);
  }
});

check("README points longrun work to the verification guide", () => {
  const readme = readText("README.md");
  const direct = hasDocumentLink(readme, "docs/stream-verification.md");
  const viaIndex = hasDocumentLink(readme, "docs/README.md") &&
    hasDocumentLink(readText("docs/README.md"), "stream-verification.md");
  assert(direct || viaIndex, "README 검증 안내 경로 없음");
});

let failCount = 0;
for (const item of checks) {
  try {
    item.run();
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failCount += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[fail] ${item.name}: ${message}`);
  }
}

console.log("");
console.log("== Longrun separation verification summary ==");
console.log(`- pass: ${checks.length - failCount}`);
console.log(`- fail: ${failCount}`);

if (failCount > 0) {
  process.exit(1);
}

function check(name, run) {
  checks.push({ name, run });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function shellIfBlock(text, needle) {
  const start = text.indexOf(needle);
  assert(start >= 0, `missing shell block: ${needle}`);
  const rest = text.slice(start);
  const end = rest.indexOf("\nfi\n");
  assert(end >= 0, `unterminated shell block: ${needle}`);
  return rest.slice(0, end + 4);
}
