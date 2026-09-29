#!/usr/bin/env node
// 파일 용도: 현행 UI 실행 정의·기록 양식·검사 명령 연결을 확인한다. 실제 UI를 실행하지 않는다.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {hasDocumentLink} from "./documentation_contract_lib.mjs";
import {verifyManualUiEvidence} from "./verify_manual_ui_evidence.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const readText = file => fs.readFileSync(path.resolve(root, file), "utf8");

export function verifyUiEvidenceCloseout({read = readText} = {}) {
  // baseline/녹화/VA/권한·Policy 정의 검사를 그대로 사용하고 실패를 상위 결과로 전파한다.
  const manual = verifyManualUiEvidence({read});
  const checks = manual.checks.map(item => ({...item}));
  const stream = read("docs/stream-verification.md");
  const inventory = read("docs/project-feature-test-inventory.md");
  for (const [name, text, links] of [
    ["verification", stream, ["manual-ui-fulltest.md"]],
    ["inventory", inventory, ["manual-ui-fulltest.md", "manual-ui-result-template.md"]],
  ]) {
    for (const link of links) checks.push({
      name: name + " links current UI definition: " + link,
      ok: hasDocumentLink(text, link),
      error: hasDocumentLink(text, link) ? undefined : "current UI definition link missing: " + link,
    });
  }
  return {checks, pass: checks.filter(item => item.ok).length, fail: checks.filter(item => !item.ok).length};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = verifyUiEvidenceCloseout();
  for (const item of report.checks) {
    (item.ok ? console.log : console.error)("[" + (item.ok ? "pass" : "fail") + "] " + item.name + (item.error ? ": " + item.error : ""));
  }
  console.log("\n== v2.2.0 UI Evidence Close-out summary ==");
  console.log("- pass: " + report.pass);
  console.log("- fail: " + report.fail);
  console.log("- uiFulltest: not-run-by-this-command");
  process.exitCode = report.fail ? 1 : 0;
}
