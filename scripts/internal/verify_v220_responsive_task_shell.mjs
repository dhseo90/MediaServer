#!/usr/bin/env node
// 파일 용도: v2.2.0 responsive task shell 계약 문서와 S02 roadmap 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.2.0 responsive task shell verification

Usage:
  ./server.sh verify-v220-responsive-task-shell

Checks:
  - V220-S02 roadmap row points to the responsive task shell gate
  - task shell document covers 320/390/760/1180+ viewport policy
  - route groups define primary task, secondary action, and breakpoint behavior
  - component primitive candidates map to S03/S04 follow-up
  - S02 keeps implementation/UI fulltest/longrun boundaries separate
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("backlog S02 points to responsive task shell gate", () => {
  const backlog = readText("docs/development-backlog.md");
  assert(/\| 2 \| V220-S02 \| P0 \| (진행|완료) \| Responsive task shell \|/.test(backlog),
    "backlog S02 row must be 진행 or 완료");
  for (const snippet of [
    "v220-responsive-task-shell.md",
    "verify-v220-responsive-task-shell",
    "`/ops`, `/client`, `/setup`, `/login`의 route별 primary task",
  ]) {
    assert(backlog.includes(snippet), `backlog missing S02 snippet: ${snippet}`);
  }
});

check("responsive task shell document covers viewport completion criteria", () => {
  const doc = readText("docs/v220-responsive-task-shell.md");
  for (const snippet of [
    "320px",
    "390px",
    "760px",
    "1180px+",
    "horizontal overflow 없음",
    "primary task first",
    "drawer/details",
    "dense table + side/detail panel",
  ]) {
    assert(doc.includes(snippet), `responsive shell missing viewport criterion: ${snippet}`);
  }
});

check("responsive task shell document covers required route groups", () => {
  const doc = readText("docs/v220-responsive-task-shell.md");
  for (const route of [
    "/setup",
    "/login",
    "/password/change",
    "/client/request-access",
    "/ops/home",
    "/ops/dashboard",
    "/ops/events",
    "/ops/sources",
    "/ops/rules",
    "/ops/users",
    "/client/live",
    "/client/dashboard",
    "/client/events",
  ]) {
    assert(doc.includes(route), `responsive shell missing route group: ${route}`);
  }
});

check("responsive task shell document assigns primary and secondary work", () => {
  const doc = readText("docs/v220-responsive-task-shell.md");
  for (const snippet of [
    "운영 상태 요약과 다음 조치 선택",
    "source/runtime/event 원인 판독",
    "event review와 filtering",
    "source 상태 확인과 source/view 관리",
    "rule/profile/scenario 작성과 preview/save",
    "live video 시청과 source 선택",
    "viewer-safe event review",
    "Secondary action",
    "320/390 정책",
    "760 정책",
    "1180+ 정책",
  ]) {
    assert(doc.includes(snippet), `responsive shell missing task assignment: ${snippet}`);
  }
});

check("responsive task shell document defines shell primitives and next-step inputs", () => {
  const doc = readText("docs/v220-responsive-task-shell.md");
  for (const snippet of [
    "ResponsiveTaskShell",
    "PrimaryTaskRegion",
    "SecondaryActionDrawer",
    "DetailDrawerPanel",
    "ResponsiveTable",
    "FormGrid",
    "ViewerSafeDock",
    "S03 design token refresh",
    "S04 component primitive",
    "S05~S08 route redesign",
  ]) {
    assert(doc.includes(snippet), `responsive shell missing primitive/follow-up: ${snippet}`);
  }
});

check("responsive task shell document preserves non-implementation and contract boundaries", () => {
  const doc = readText("docs/v220-responsive-task-shell.md");
  for (const snippet of [
    "S02는 설계 계약 단계입니다.",
    "실제 HTML/CSS/JavaScript 재배치",
    "브라우저 UI 풀테스트 PASS는 S02 완료 근거가 아닙니다.",
    "Event POST/WebRTC/SSE/WS metadata schema",
    "Auth/session/scope",
    "RTSP/WebRTC media",
    "source URL, Developer URL, raw JSON, debugCounters",
    "screenshot evidence",
    "30분 soak",
    "120분 longrun은 실행하지 않습니다.",
  ]) {
    assert(doc.includes(snippet), `responsive shell missing boundary snippet: ${snippet}`);
  }
});

check("stream verification exposes the S02 responsive task shell command", () => {
  const stream = readText("docs/stream-verification.md");
  for (const snippet of [
    "verify-v220-responsive-task-shell",
    "v2.2.0 responsive task shell",
    "verify-ops-client-ui --browser-mode static",
  ]) {
    assert(stream.includes(snippet), `stream verification missing S02 snippet: ${snippet}`);
  }
});

check("server entrypoint exposes the S02 responsive task shell verifier", () => {
  const server = readText("server.sh");
  assert(server.includes("verify-v220-responsive-task-shell"), "server.sh missing verify-v220-responsive-task-shell");
  assert(server.includes("verify_v220_responsive_task_shell.mjs"), "server.sh missing responsive task shell script dispatch");
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
console.log("== v2.2.0 responsive task shell summary ==");
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
