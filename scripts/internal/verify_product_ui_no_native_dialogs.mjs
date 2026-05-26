#!/usr/bin/env node
// 파일 용도: 제품 UI가 브라우저 native dialog로 자동 UI 검수를 멈추지 않는지 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Product UI native dialog guard

Usage:
  ./server.sh verify-product-ui-no-native-dialogs

Checks:
  - product UI source does not call window.alert/window.confirm/window.prompt
  - bare alert/confirm/prompt calls are also rejected in product UI source
  - tests should use in-page confirmation state instead of OS/browser modal dialogs
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const targets = [
  "src/ingress/product_ui_page_scripts.cpp",
  "src/ingress/product_ui_js.cpp",
];

const patterns = [
  { name: "window.alert", regex: /\bwindow\s*\.\s*alert\s*\(/g },
  { name: "window.confirm", regex: /\bwindow\s*\.\s*confirm\s*\(/g },
  { name: "window.prompt", regex: /\bwindow\s*\.\s*prompt\s*\(/g },
  { name: "bare alert", regex: /(?<![\w$.])alert\s*\(/g },
  { name: "bare confirm", regex: /(?<![\w$.])confirm\s*\(/g },
  { name: "bare prompt", regex: /(?<![\w$.])prompt\s*\(/g },
];

const findings = [];
for (const target of targets) {
  const absolute = path.join(rootDir, target);
  const text = fs.readFileSync(absolute, "utf8");
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(line)) {
        findings.push({
          file: target,
          line: index + 1,
          pattern: pattern.name,
          text: line.trim(),
        });
      }
    }
  }
}

if (findings.length > 0) {
  for (const finding of findings) {
    console.log(`[fail] ${finding.file}:${finding.line} ${finding.pattern}: ${finding.text}`);
  }
  console.log("");
  console.log("== Product UI native dialog guard summary ==");
  console.log(`- result: FAIL`);
  console.log(`- findings: ${findings.length}`);
  console.log("- reason: native browser dialogs block autonomous UI full-test execution; use in-page confirmation controls instead.");
  process.exit(1);
}

console.log("[pass] product UI does not use native browser dialogs");
console.log("");
console.log("== Product UI native dialog guard summary ==");
console.log("- result: PASS");
console.log("- findings: 0");
