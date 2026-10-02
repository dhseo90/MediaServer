#!/usr/bin/env node
// 파일 용도: 현행 UI tokens 계약·구현 연결을 확인한다. CLI 이름은 호환을 위해 유지한다.

import { validateUiComponentDocumentation } from "./documentation_contract_lib.mjs";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.2.0 design token refresh verification

Usage:
  ./server.sh verify-v220-design-token-refresh

검사 범위:
  - 현행 UI 기술 안내와 정확한 명령 연결
  - 기존 소스·helper·모듈 계약
  - 정적 결과를 실제 UI/장시간 PASS로 사용하지 않음
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("현행 UI 안내·정책·명령 연결", () => {
  const errors = validateUiComponentDocumentation({
    document: readText("docs/product-shell-component-examples.md"), kind: "tokens",
    verification: readText("docs/stream-verification.md"), server: readText("server.sh"),
  });
  assert(errors.length === 0, errors.join("; "));
});


check("ProductDesignTokensCss centralizes refreshed token families", () => {
  const tokenCss = productDesignTokensCss();
  for (const token of [
    "--font-ui",
    "--font-mono",
    "--font-size-xs",
    "--font-size-sm",
    "--font-size-md",
    "--font-size-lg",
    "--font-size-xl",
    "--line-height-tight",
    "--line-height-base",
    "--line-height-relaxed",
    "--control-height-sm",
    "--control-height-md",
    "--control-height-lg",
    "--icon-button-size",
    "--panel-padding",
    "--card-padding",
    "--button-radius",
    "--button-padding-y",
    "--button-padding-x",
    "--input-height",
    "--input-radius",
    "--input-padding-y",
    "--input-padding-x",
    "--table-row-min-height",
    "--table-cell-padding-y",
    "--table-cell-padding-x",
    "--badge-height",
    "--badge-radius",
    "--badge-padding-y",
    "--badge-padding-x",
    "--debug-details-bg",
    "--debug-details-border",
    "--debug-details-text",
    "--debug-details-padding",
    "--shadow-lg",
  ]) {
    assert(tokenCss.includes(`${token}:`), `ProductDesignTokensCss missing ${token}`);
  }
});

check("ProductUiCss consumes refreshed tokens for common controls", () => {
  const body = productCssBody();
  for (const snippet of [
    "font-family: var(--font-ui)",
    "font-family: var(--font-mono)",
    "min-height: var(--control-height-md)",
    "min-height: var(--control-height-sm)",
    "padding: var(--button-padding-y) var(--button-padding-x)",
    "border-radius: var(--button-radius)",
    "min-height: var(--input-height)",
    "border-radius: var(--input-radius)",
    "padding: var(--input-padding-y) var(--input-padding-x)",
    "min-height: var(--badge-height)",
    "padding: var(--badge-padding-y) var(--badge-padding-x)",
    "padding: var(--table-cell-padding-y) var(--table-cell-padding-x)",
    "background: var(--debug-details-bg)",
    "border: 1px solid var(--debug-details-border)",
    "color: var(--debug-details-text)",
  ]) {
    assert(body.includes(snippet), `ProductUiCss missing refreshed token usage: ${snippet}`);
  }
});

check("ProductUiCss does not scale font size with viewport width", () => {
  const body = productCssBody();
  const viewportFontMatches = [...body.matchAll(/font-size\s*:\s*clamp\([^;\n]*(?:vw|vh|vmin|vmax)[^;\n]*\)/g)]
    .map((match) => lineSummary(body, match.index || 0, match[0]));
  assert(viewportFontMatches.length === 0,
    `viewport-scaled font-size clamp() rules are not allowed:\n${viewportFontMatches.join("\n")}`);
});


check("server entrypoint exposes the S03 design token refresh verifier", () => {
  const server = readText("server.sh");
  assert(server.includes("verify-v220-design-token-refresh"), "server.sh missing verify-v220-design-token-refresh");
  assert(server.includes("verify_v220_design_token_refresh.mjs"), "server.sh missing design token refresh script dispatch");
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
console.log("== v2.2.0 design token refresh summary ==");
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

function productDesignTokensCss() {
  const css = readText("src/ingress/product_ui_css.cpp");
  const tokenStart = css.indexOf("std::string ProductDesignTokensCss()");
  const tokenEnd = css.indexOf("std::string ProductUiCss()");
  assert(tokenStart >= 0 && tokenEnd > tokenStart, "failed to locate ProductDesignTokensCss/ProductUiCss boundaries");
  return css.slice(tokenStart, tokenEnd);
}

function productCssBody() {
  const css = readText("src/ingress/product_ui_css.cpp");
  const tokenEnd = css.indexOf("std::string ProductUiCss()");
  assert(tokenEnd >= 0, "failed to locate ProductUiCss boundary");
  return css.slice(tokenEnd);
}

function lineSummary(text, index, matchText) {
  const line = text.slice(0, index).split("\n").length;
  return `line ${line}: ${matchText}`;
}
