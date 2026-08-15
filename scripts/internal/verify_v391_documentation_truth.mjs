#!/usr/bin/env node
// 파일 용도: v3.9.1 public 문서의 role, dependency, current/published, public-index 경계를 검증합니다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.1 documentation truth verification

Usage:
  ./server.sh verify-v391-documentation-truth

Checks public role wording, GStreamer 1.28 minimums, public-index exclusions,
and v3.9.1 current-source / v3.9.0 latest-published status boundaries.
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), "utf8");
const head = (text, lineCount) => text.split(/\r?\n/).slice(0, lineCount).join("\n");

const readme = read("README.md");
const readmeEn = read("README.en.md");
const docsIndex = read("docs/README.md");
const developmentGuide = read("docs/development-guide.md");
const thirdParty = read("THIRD_PARTY_NOTICES.md");
const dependencySnapshot = read("DEPENDENCY_SNAPSHOT.md");
const attribution = JSON.parse(read("config/third_party_attribution.json"));
const cmake = read("CMakeLists.txt");

check("Ops user management is admin-only in both public READMEs", () => {
  const ko = section(readme, "## 계정별 화면");
  const en = section(readmeEn, "## Account Views");
  assert(ko.includes("사용자 관리는 admin 전용입니다."), "README missing admin-only user management wording");
  assert(en.includes("User management is admin-only."), "README.en missing admin-only user management wording");
  const koOperator = ko.split(/\r?\n/).find(line => line.includes("operator")) || "";
  const enOperator = en.split(/\r?\n/).find(line => line.includes("operator")) || "";
  assert(koOperator.includes("사용자 관리 화면에는 접근하지 않습니다"), "README does not deny operator user-management access");
  assert(/cannot access user management/i.test(enOperator), "README.en does not deny operator user-management access");
});

check("GStreamer API namespace and minimum supported version are distinct", () => {
  const gst = attribution.dependencies.find(item => item.id === "gstreamer");
  assert(developmentGuide.includes("GStreamer 1.28+"), "development guide missing GStreamer 1.28+");
  assert(thirdParty.includes("minimum supported version: 1.28"), "third-party notice missing GStreamer minimum 1.28");
  assert(dependencySnapshot.includes("minimum supported version: 1.28"), "dependency snapshot missing GStreamer minimum 1.28");
  assert(gst?.minimumVersion === "minimum supported version: 1.28",
    "third-party attribution source missing GStreamer minimum 1.28");
  for (const moduleName of ["gstreamer-1.0", "gstreamer-rtsp-server-1.0", "gstreamer-pbutils-1.0",
    "gstreamer-app-1.0", "gstreamer-webrtc-1.0", "gstreamer-sdp-1.0"]) {
    assert(cmake.includes(`${moduleName}>=1.28`), `CMake missing ${moduleName}>=1.28`);
  }
});

check("public docs index excludes internal release and generated-test material", () => {
  const links = [...docsIndex.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map(match => match[1]);
  const forbidden = [
    "release-test-records",
    "release-evidence-index",
    "v390-current-state",
    "v390-full-status",
    "/superpowers/",
    "superpowers/",
    "project-feature-test-inventory",
    "v390-ui-automation-coverage-matrix",
    "v390-feature-completion-inventory",
  ];
  const denied = links.filter(link => forbidden.some(marker => link.includes(marker)));
  assert(denied.length === 0, `public docs index contains internal link(s): ${denied.join(", ")}`);
});

check("manual UI current header separates v3.9.1 source from v3.9.0 published", () => {
  for (const file of ["docs/manual-ui-checklist.md", "docs/manual-ui-fulltest.md"]) {
    const current = head(read(file), 35);
    assert(current.includes("v3.9.1"), `${file} missing current source v3.9.1`);
    assert(current.includes("v3.9.0"), `${file} missing latest published v3.9.0`);
    assert(!current.includes("최신 공개 release 기준은 `v3.8.0"), `${file} still calls v3.8.0 latest`);
  }
});

check("current verification and inventory docs expose v3.9.1 correction state", () => {
  assert(head(read("docs/stream-verification.md"), 125).includes("v3.9.1 release correction"),
    "stream verification missing v3.9.1 correction row");
  assert(head(read("docs/project-feature-test-inventory.md"), 190).includes("v3.9.1 release correction"),
    "project inventory missing v3.9.1 correction row");
  const completion = head(read("docs/v390-feature-completion-inventory.md"), 25);
  assert(completion.includes("historical v3.9.0 archive") &&
    completion.includes("현재 source 3.9.1의 완료 상태가 아닙니다"),
  "v3.9 completion inventory lacks historical archive boundary");
});

check("release records and evidence report v3.9.1 as not-yet-fresh-PASS", () => {
  for (const file of ["docs/release-test-records.md", "docs/release-evidence-index.md"]) {
    const current = head(read(file), 90);
    assert(current.includes("v3.9.1 현재 소스 정정 상태"), `${file} missing v3.9.1 current correction status`);
    const notRun = current.includes("fresh full test: 미실행");
    const failedBeforeDurationAndUi = /fresh full test: [^\n]*clean-clone[^\n]*FAIL/.test(current) &&
      current.includes("30분") && current.includes("미실행");
    assert(notRun || failedBeforeDurationAndUi,
      `${file} overclaims or omits v3.9.1 fresh full-test status`);
    assert(current.includes("latest published: v3.9.0"), `${file} missing latest-published v3.9.0`);
  }
});

check("v3.9.0 closeout plan is explicitly historical", () => {
  const current = head(read("docs/superpowers/plans/2026-08-13-v390-release-closeout.md"), 18);
  assert(current.includes("Historical archive") && current.includes("v3.9.1 실행 계획으로 사용하지 않습니다"),
    "v3.9.0 closeout plan can be mistaken for the current v3.9.1 plan");
});

const result = runChecks();
console.log("");
console.log("== v3.9.1 documentation truth summary ==");
console.log(`- pass: ${result.pass}`);
console.log(`- fail: ${result.fail}`);
if (result.fail > 0) process.exit(1);

function section(text, heading) {
  const start = text.indexOf(heading);
  assert(start >= 0, `heading missing: ${heading}`);
  const tail = text.slice(start + heading.length);
  const next = tail.search(/\n##\s/);
  return next >= 0 ? tail.slice(0, next) : tail;
}

function check(name, fn) { checks.push({ name, fn }); }

function runChecks() {
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
  return { pass, fail };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
