#!/usr/bin/env node
// 파일 용도: 현행 공개 문서의 권한·의존성·metadata·정책 연결을 검사한다. 종료 실행 기록은 입력이 아니다.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";
import {assertKnownOptions, hasHelpFlag, printUsageAndExit} from "./script_arg_utils.mjs";
import {hasDocumentLink, validateUiPolicyDocumentation, validateVerificationDocumentation} from "./documentation_contract_lib.mjs";
import {readReleaseContext, validateReleaseContext, validateLocalReleaseDocuments} from "./release_documentation_contract.mjs";
import {validatePolicy} from "./ui_fulltest_evidence_policy_v4_lib.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
if (hasHelpFlag(args)) printUsageAndExit("공개 문서 정합성 검사\nUsage: ./server.sh verify-v391-documentation-truth\n현행 권한 안내·의존성·source/published metadata·공개 색인·검증 기준을 확인합니다. 과거 제목·고정 행수·실행 원장은 요구하지 않습니다.");
assertKnownOptions(args, ["h", "help"]);
const checks = [];
const read = relative => fs.readFileSync(path.join(rootDir, relative), "utf8");

check("공개 권한 안내는 admin 전용 사용자 관리와 operator 제한을 유지", () => {
  const ko = prose(read("README.md")), en = prose(read("README.en.md"));
  assert(/사용자\s*관리[^\n]*admin[^\n]*전용/.test(ko), "README admin 전용 사용자 관리 안내 없음");
  assert(/user\s+management[^\n]*admin-only/i.test(en), "README.en admin-only user management 안내 없음");
  const koOperator = ko.split(/\r?\n/).filter(line => /\boperator\b/.test(line)).join("\n");
  const enOperator = en.split(/\r?\n/).filter(line => /\boperator\b/.test(line)).join("\n");
  assert(/사용자\s*관리[^\n]*(?:접근하지\s*않|접근할\s*수\s*없)/.test(koOperator), "README operator 사용자 관리 제한 없음");
  assert(/cannot\s+access\s+user\s+management/i.test(enOperator), "README.en operator 사용자 관리 제한 없음");
  for (const file of ["README.md","README.en.md"])
    assert(hasDocumentLink(read(file), "docs/ui-guide.md"), file + " 상세 권한 안내 연결 없음");
});

const developmentGuide = read("docs/development-guide.md");
const thirdParty = read("THIRD_PARTY_NOTICES.md");
const dependencySnapshot = read("DEPENDENCY_SNAPSHOT.md");
const attribution = JSON.parse(read("config/third_party_attribution.json"));
const cmake = read("CMakeLists.txt");

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

check("공개 색인에서 상세 실행 기록과 내부 계획 분리", () => {
  const text = prose(read("docs/README.md"));
  const links = [...text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map(match => match[1]);
  const forbidden = ["release-test-records", "release-evidence-index", "release-artifacts/",
    "v390-current-state", "v390-full-status", "superpowers/", "v390-feature-completion-inventory"];
  // release-artifacts 안의 공개 release note는 실행 일지와 다르다. 디렉터리명만으로 배제하지 않는다.
  const releaseNote = link => /^release-artifacts\/v\d+\.\d+\.\d+\/release-notes\.md(?:#[^\s]*)?$/.test(link.replace(/^\.\//, ""));
  const denied = links.filter(link => !releaseNote(link) && forbidden.some(marker => link.includes(marker)));
  assert(denied.length === 0, "공개 색인에 종료 기록/내부 계획 연결: " + denied.join(", "));
  // 현행 inventory·검증 정의는 유지보수자용 색인의 대상이다. 실행 일지와 혼동하지 않는다.
});

check("현행 source와 기록된 공개 metadata 일치", () => {
  const version = read("VERSION").trim(), context = readReleaseContext(read("docs/release-policy.md"));
  const errors = [...validateReleaseContext(context, version), ...validateLocalReleaseDocuments(rootDir, context, version)];
  assert(errors.length === 0, errors.join("; "));
});

check("현행 UI·단기·장시간 판정 기준 연결", () => {
  const policy = JSON.parse(read("test/fixtures/ui_fulltest_evidence_policy_v4.json"));
  const agents = read("AGENTS.md"), fulltest = read("docs/manual-ui-fulltest.md");
  const errors = [...validatePolicy(policy), ...validateUiPolicyDocumentation({agents, fulltest, policy}),
    ...validateVerificationDocumentation({agents, verification: read("docs/stream-verification.md")})];
  for (const file of ["docs/manual-ui-checklist.md", "docs/project-feature-test-inventory.md"])
    if (!read(file).trim()) errors.push(file + " 현행 정의 없음");
  assert(errors.length === 0, errors.join("; "));
});

let pass = 0, fail = 0;
for (const item of checks) {
  try { item.run(); pass += 1; console.log("[pass] " + item.name); }
  catch (error) { fail += 1; console.log("[fail] " + item.name + ": " + error.message); }
}
console.log("\n== v3.9.1 documentation truth summary ==");
console.log("- scope: current documentation; no product, UI or published execution");
console.log("- pass: " + pass);
console.log("- fail: " + fail);
if (fail > 0) process.exit(1);

function prose(text) {
  return text.replace(/(^|\n)[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n[ \t]*\2[ \t]*(?=\n|$)/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "").replace(/`/g, "");
}
function check(name, run) { checks.push({name, run}); }
function assert(value, message) { if (!value) throw new Error(message); }
