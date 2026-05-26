#!/usr/bin/env node
// 파일 용도: product UI CSS 변경이 공통 design token 경계를 벗어나지 않는지 검증한다.
// 동작 요약: CSS raw color와 문서/서버 command 연결을 정적 검사한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Product UI token drift verification

Usage:
  ./server.sh verify-product-ui-token-drift

Options:
  -h, --help   도움말 출력
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const cssPath = path.join(rootDir, "src/ingress/product_ui_css.cpp");
const uiGuidePath = path.join(rootDir, "docs/ui-guide.md");
const backlogPath = path.join(rootDir, "docs/development-backlog.md");
const serverPath = path.join(rootDir, "server.sh");

const css = fs.readFileSync(cssPath, "utf8");
const uiGuide = fs.readFileSync(uiGuidePath, "utf8");
const backlog = fs.readFileSync(backlogPath, "utf8");
const server = fs.readFileSync(serverPath, "utf8");

const tokenStart = css.indexOf("std::string ProductDesignTokensCss()");
const tokenEnd = css.indexOf("std::string ProductUiCss()");
if (tokenStart < 0 || tokenEnd < 0 || tokenEnd <= tokenStart) {
  throw new Error("failed to locate ProductDesignTokensCss/ProductUiCss boundaries");
}
const tokenCss = css.slice(tokenStart, tokenEnd);
const productCssBody = css.slice(tokenEnd);

const checksRun = [];

for (const token of [
  "--color-bg",
  "--color-surface",
  "--color-text",
  "--color-primary",
  "--color-warning",
  "--color-danger",
  "--color-selection-ring",
  "--color-modal-backdrop",
  "--color-media-bg",
]) {
  check(`semantic token ${token} has theme definitions`, () => {
    const count = countTokenDefinitions(tokenCss, token);
    assert(count >= 2, `${token} must be defined for light and dark themes`);
  });
}

for (const token of [
  "--radius-sm",
  "--radius-md",
  "--radius-lg",
  "--space-1",
  "--space-2",
  "--space-3",
  "--space-4",
  "--space-6",
  "--shadow-sm",
  "--shadow-md",
  "--overlay-stage-gloss-shadow",
  "--overlay-point-shadow",
  "--overlay-badge-stroke",
]) {
  check(`design token ${token} is centralized`, () => {
    assert(tokenCss.includes(`${token}:`), `${token} is missing from ProductDesignTokensCss`);
  });
}

check("product CSS body does not introduce raw hex or rgb colors", () => {
  const rawColorMatches = [...productCssBody.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^;\n]*\)/g)]
    .map((match) => lineSummary(productCssBody, match.index || 0, match[0]));
  assert(rawColorMatches.length === 0, `raw color values outside ProductDesignTokensCss:\n${rawColorMatches.join("\n")}`);
});

for (const snippet of [
  "box-shadow: 0 0 0 2px var(--color-selection-ring)",
  "background: var(--color-modal-backdrop)",
  "box-shadow: var(--overlay-stage-gloss-shadow)",
  "filter: var(--overlay-point-shadow)",
  "stroke: var(--overlay-badge-stroke)",
  "background: var(--color-media-bg)",
]) {
  check(`tokenized CSS hook exists for ${snippet}`, () => {
    assert(productCssBody.includes(snippet), `product CSS body missing token hook: ${snippet}`);
  });
}

for (const [label, text] of [
  ["server.sh", server],
  ["docs/ui-guide.md", uiGuide],
  ["docs/development-backlog.md", backlog],
]) {
  check(`${label} mentions token drift verification`, () => {
    assert(text.includes("verify-product-ui-token-drift"), `${label} must mention verify-product-ui-token-drift`);
  });
}

let failCount = 0;
for (const item of checksRun) {
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
console.log("== Product UI token drift verification summary ==");
console.log(`- pass: ${checksRun.length - failCount}`);
console.log(`- fail: ${failCount}`);

if (failCount > 0) process.exit(1);

function check(name, run) {
  checksRun.push({ name, run });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function countTokenDefinitions(text, token) {
  return [...text.matchAll(new RegExp(`${escapeRegExp(token)}\\s*:`, "g"))].length;
}

function lineSummary(text, index, matchText) {
  const line = text.slice(0, index).split("\n").length;
  return `line ${line}: ${matchText}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
