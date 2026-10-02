#!/usr/bin/env node
// 파일 용도: 공개 문서의 현행 연결·이미지 관리·검수 경계를 확인한다. 과거 실행 원장은 읽지 않는다.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";
import {assertKnownOptions, hasHelpFlag, printUsageAndExit} from "./script_arg_utils.mjs";
import {validateFeatureDocumentation, validateUiPolicyDocumentation} from "./documentation_contract_lib.mjs";
import {readReleaseContext, validateReleaseContext, validateReadmeMetadata} from "./release_documentation_contract.mjs";
import {validatePolicy} from "./ui_fulltest_evidence_policy_v4_lib.mjs";
import {parseServerDispatches} from "./script_dispatch_parser.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
if (hasHelpFlag(args)) printUsageAndExit("공개 문서/이미지 준비 검사\nUsage: ./server.sh verify-v290-public-docs-assets-refresh\n현행 문서·metadata·관리 이미지·명령 연결만 검사합니다. 이미지 직접 검수나 제품/UI/릴리즈 실행 결과가 아닙니다.");
assertKnownOptions(args, ["h", "help"]);
const command = "verify-v290-public-docs-assets-refresh";
const featureIds = ["SAFE-078", "OPS-048"];
const checks = [];

check("현행 기능 정의와 명령 연결", () => {
  const implementation = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
  const errors = validateFeatureDocumentation({
    document: readText("docs/assets/ui/README.md"),
    identifiers: ["config/docs_ui_assets.json", "verify-docs-ui-assets"],
    command, script: "verify_v290_public_docs_assets_refresh.mjs", featureIds,
    inventory: readText("docs/project-feature-test-inventory.md"), implementation,
    verification: readText("docs/stream-verification.md"), server: readText("server.sh"),
  });
  for (const id of featureIds) {
    const entries = implementation.items.filter(item => item.id === id);
    if (entries.length !== 1 || entries[0].verifierEvidence?.command !== command) errors.push(id + " 명령 연결 누락/중복/불일치");
  }
  assert(errors.length === 0, errors.join("; "));
});

check("현행 공개 문서와 관리 이미지 연결", () => {
  const context = readReleaseContext(readText("docs/release-policy.md"));
  const documentErrors = validatePublicDocuments(context, readText("VERSION").trim());
  const publicDocsConnected = documentErrors.length === 0;
  assert(publicDocsConnected, "OPS-048: " + documentErrors.join("; "));
});

check("직접 검수와 정적 검사의 경계", () => {
  const context = readReleaseContext(readText("docs/release-policy.md"));
  const policyErrors = validateReleaseContext(context, readText("VERSION").trim());
  const manifest = JSON.parse(readText("config/docs_ui_assets.json"));
  const uiPolicy = JSON.parse(readText("test/fixtures/ui_fulltest_evidence_policy_v4.json"));
  policyErrors.push(...validatePolicy(uiPolicy));
  policyErrors.push(...validateUiPolicyDocumentation({agents: readText("AGENTS.md"), fulltest: readText("docs/manual-ui-fulltest.md"), policy: uiPolicy}));
  if (manifest.baseline?.manualReviewRequired !== true) policyErrors.push("manualReviewRequired는 true여야 함");
  const safe078BoundaryObserved = policyErrors.length === 0;
  assert(safe078BoundaryObserved, "SAFE-078: " + policyErrors.join("; "));
});

check("분리된 이미지·링크·metadata 검사 안내와 실제 dispatch", () => {
  const verification = readText("docs/stream-verification.md");
  const dispatches = parseServerDispatches(readText("server.sh"));
  for (const [name, script] of [
    [command, "verify_v290_public_docs_assets_refresh.mjs"],
    ["verify-docs-ui-assets", "verify_docs_ui_assets.mjs"],
    ["verify-docs-links", "verify_docs_links.mjs"],
    ["verify-release-metadata", "verify_release_metadata_consistency.mjs"],
  ]) {
    const targets = dispatches.filter(item => item.command === name);
    assert(verification.includes(name) && targets.length === 1 && targets[0].script === script,
      name + " 안내/dispatch 누락·중복·불일치");
  }
});

check("전수 기능 검증과 필수 ID 연결", () => {
  const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
  const inventory = readText("scripts/internal/verify_project_feature_test_inventory.mjs");
  assert(coverage.includes("loadImplementationManifest") && coverage.includes("validateImplementationManifest"),
    "전수 기능 manifest 검사 연결 누락");
  for (const id of featureIds) assert(inventory.includes('"' + id + '"'), id + " 필수 기능 검사 연결 누락");
});

let pass = 0, fail = 0;
for (const item of checks) {
  try { item.fn(); pass += 1; console.log("[pass] " + item.name); }
  catch (error) { fail += 1; console.log("[fail] " + item.name + ": " + error.message); }
}
console.log("");
console.log("== v2.9.0 public docs/assets refresh summary ==");
console.log("- schema: media-server.v290-public-docs-assets-refresh.v1");
console.log("- publicDocs: README.md, README.en.md, docs/README.md, docs/en/README.md");
console.log("- uiGuide: docs/ui-guide.md");
console.log("- assetPolicy: docs/assets/ui/README.md");
console.log("- managedAssets: config/docs_ui_assets.json");
console.log("- recapture: not-run-by-this-command");
console.log("- directBrowserReview: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- scope: current documentation wiring; image integrity and visual review are separate");
console.log("- pass: " + pass);
console.log("- fail: " + fail);
if (fail > 0) process.exit(1);

function validatePublicDocuments(context, version) {
  const errors = [];
  const documents = {};
  for (const file of ["README.md", "README.en.md", "docs/README.md", "docs/en/README.md",
    "docs/ui-guide.md", "docs/assets/ui/README.md", "docs/versioning-policy.md"]) {
    try { documents[file] = readText(file); if (!documents[file].trim()) errors.push(file + " 빈 문서"); }
    catch (error) { errors.push(file + ": " + error.message); documents[file] = ""; }
  }
  for (const file of ["README.md", "README.en.md"]) errors.push(...validateReadmeMetadata(documents[file], version, context).map(error => file + ": " + error));
  const manifest = JSON.parse(readText("config/docs_ui_assets.json"));
  if (manifest.schema !== "media-server.docs-ui-assets.v1" || !Array.isArray(manifest.assets) || !manifest.assets.length) return [...errors, "관리 이미지 manifest 없음/형식 오류"];
  const files = manifest.assets.map(asset => asset.file);
  if (new Set(files).size !== files.length || files.some(file => !/^[a-z0-9-]+\.png$/.test(file))) errors.push("관리 이미지 목록 중복/경로 오류");
  for (const [file, english] of [["README.md", false], ["README.en.md", true]]) {
    const refs = references(documents[file]);
    if (!refs.length) errors.push(file + " 대표 이미지 없음");
    for (const ref of refs) {
      const name = ref.replace(/^en\//, "");
      if (ref.startsWith("en/") !== english || !manifest.assets.some(asset => asset.file === name && asset.readme === true))
        errors.push(file + ": 미관리/언어 불일치 대표 이미지 " + ref);
    }
  }
  const guideRefs = references(documents["docs/ui-guide.md"]);
  for (const ref of guideRefs) if (!manifest.assets.some(asset => asset.file === ref && asset.uiGuide === true))
    errors.push("docs/ui-guide.md: 미관리 이미지 " + ref);
  for (const asset of manifest.assets.filter(asset => asset.readme === true))
    if (!guideRefs.includes(asset.file)) errors.push("docs/ui-guide.md: 대표 이미지 안내 없음 " + asset.file);
  for (const id of ["config/docs_ui_assets.json", "verify-docs-ui-assets"])
    if (!documents["docs/assets/ui/README.md"].includes(id)) errors.push("docs/assets/ui/README.md: " + id + " 없음");
  return errors;
}
function references(text) {
  return [...new Set([...text.matchAll(/(?:docs\/)?assets\/ui\/((?:en\/)?[A-Za-z0-9._-]+\.png)/g)].map(match => match[1]))];
}
function check(name, fn) { checks.push({name, fn}); }
function assert(value, message) { if (!value) throw new Error(message); }
function readText(relative) { return fs.readFileSync(path.join(rootDir, relative), "utf8"); }
