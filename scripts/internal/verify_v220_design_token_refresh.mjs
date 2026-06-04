#!/usr/bin/env node
// 파일 용도: v2.2.0 S03 design token refresh 계약과 구현 연결을 검증한다.

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

Checks:
  - V220-S03 roadmap row points to the design token refresh gate
  - design token document records S03 scope, non-goals, S04 input contract, and verification
  - ProductDesignTokensCss centralizes typography, density, component, table, badge, debug detail tokens
  - ProductUiCss consumes the refreshed token families for common controls
  - font-size rules do not use viewport-scaled clamp() values
  - server.sh and stream verification expose this verifier
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("backlog S03 points to design token refresh gate", () => {
  const backlog = readText("docs/development-backlog.md");
  assert(/\| 3 \| V220-S03 \| P0 \| (진행|완료) \| Design token refresh \|/.test(backlog),
    "backlog S03 row must be 진행 or 완료");
  for (const snippet of [
    "v220-design-token-refresh.md",
    "verify-v220-design-token-refresh",
    "light/dark theme-aware token, spacing, density, typography",
  ]) {
    assert(backlog.includes(snippet), `backlog missing S03 snippet: ${snippet}`);
  }
});

check("design token refresh document covers S03 scope and boundaries", () => {
  const doc = readText("docs/v220-design-token-refresh.md");
  for (const snippet of [
    "V220-S03 Design token refresh",
    "ProductDesignTokensCss()",
    "typography",
    "density",
    "component",
    "button/input/table/badge/debug details",
    "320",
    "390",
    "760",
    "1180+",
    "S04 component primitive",
    "UI 풀테스트 PASS는 S03 완료 근거가 아닙니다.",
    "30분 soak",
    "120분 longrun",
    "Event POST/WebRTC/SSE/WS metadata schema",
    "RTSP/WebRTC media path",
  ]) {
    assert(doc.includes(snippet), `design token refresh doc missing: ${snippet}`);
  }
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

check("stream verification exposes the S03 design token refresh command", () => {
  const stream = readText("docs/stream-verification.md");
  for (const snippet of [
    "verify-v220-design-token-refresh",
    "v2.2.0 design token refresh",
    "verify-product-ui-token-drift",
  ]) {
    assert(stream.includes(snippet), `stream verification missing S03 snippet: ${snippet}`);
  }
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
