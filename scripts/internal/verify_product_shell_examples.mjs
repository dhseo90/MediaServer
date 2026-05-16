#!/usr/bin/env node
// 파일 용도: product shell/component examples 문서와 UI guide 연결을 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Product shell examples verification

Usage:
  ./server.sh verify-product-shell-examples

Checks:
  - product shell/component examples 문서가 핵심 class/helper와 금지선을 포함하는지
  - UI guide가 examples 문서와 verifier를 안내하는지
  - server.sh command와 script inventory 등록이 유지되는지
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("examples document defines product shell component contract", () => {
  const doc = readText("docs/product-shell-component-examples.md");
  const required = [
    "media-server.product-shell-component-examples.v1",
    "Product Shell",
    "Metric And Section Cards",
    "Dense Tables",
    "Detail And Audit Panels",
    "Client Live Tile",
    "ProductUiCss()",
    "ProductSharedUiScript()",
    "ClientShellCss()",
    "ProductDesignTokensCss()",
  ];
  for (const snippet of required) {
    assert(doc.includes(snippet), `examples doc missing snippet: ${snippet}`);
  }
});

check("examples document keeps route and viewer boundaries explicit", () => {
  const doc = readText("docs/product-shell-component-examples.md");
  const required = [
    "`Home`, `Dashboard`, `Channels`, `Rules`, `Users`, `Client Preview`",
    "`/ops/events`는 primary nav가 아니라 Dashboard 내부 섹션 또는 직접 route로 취급합니다.",
    "source URL 또는 ONVIF endpoint",
    "Developer URL",
    "raw JSON 또는 debug counter",
    "rule/profile editor",
    "내부 token/hash/session id",
  ];
  for (const snippet of required) {
    assert(doc.includes(snippet), `examples boundary missing snippet: ${snippet}`);
  }
});

check("examples document includes stable class examples", () => {
  const doc = readText("docs/product-shell-component-examples.md");
  const css = readText("src/ingress/product_ui_css.cpp");
  const pageScripts = readText("src/ingress/product_ui_page_scripts.cpp");
  const required = [
    "app-chrome",
    "app-brand",
    "image-nav-tabs",
    "account-menu",
    "section-card",
    "metric-card",
    "status-badge warning",
    "ops-responsive-table",
    "ops-row-actions",
    "ops-detail-panel",
    "ops-audit-panel",
    "tile",
    "tile-stage",
    "aria-label=\"타일 1 보기 방식\"",
  ];
  for (const snippet of required) {
    assert(doc.includes(snippet), `examples class snippet missing: ${snippet}`);
  }
  for (const className of ["app-chrome", "app-brand", "image-nav-tabs", "section-card", "metric-card", "ops-responsive-table", "tile-stage"]) {
    assert(css.includes(`.${className}`), `product CSS missing documented class: ${className}`);
  }
  assert(pageScripts.includes("class=\"tile"), "client live script missing documented tile class");
});

check("UI guide references product shell examples verifier", () => {
  const guide = readText("docs/ui-guide.md");
  const backlog = readText("docs/development-backlog.md");
  assert(guide.includes("./product-shell-component-examples.md"), "UI guide missing examples link");
  assert(guide.includes("./server.sh verify-product-shell-examples"), "UI guide missing examples verifier");
  assert(backlog.includes("Product shell component examples"), "backlog missing examples closure");
});

check("server entrypoint exposes product shell examples verifier", () => {
  const server = readText("server.sh");
  const inventory = readText("scripts/internal/verify_script_inventory.mjs");
  assert(server.includes("verify-product-shell-examples"), "server.sh missing verify-product-shell-examples");
  assert(server.includes("verify_product_shell_examples.mjs"), "server.sh missing verifier script reference");
  assert(inventory.includes("verify_product_shell_examples.mjs"), "script inventory missing verify_product_shell_examples.mjs");
});

let failCount = 0;
for (const item of checks) {
  try {
    item.run();
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failCount += 1;
    console.error(`[fail] ${item.name}: ${error.message}`);
  }
}

console.log("");
console.log("== Product shell examples verification summary ==");
console.log(`- pass: ${checks.length - failCount}`);
console.log(`- fail: ${failCount}`);

if (failCount > 0) {
  process.exit(1);
}

function check(name, run) {
  checks.push({ name, run });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
