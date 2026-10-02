#!/usr/bin/env node
// 파일 용도: product shell/component examples 문서와 UI guide 연결을 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { hasDocumentLink } from "./documentation_contract_lib.mjs";
import { parseServerDispatches } from "./script_dispatch_parser.mjs";

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
    "ProductUiCss()",
    "ProductSharedUiScript()",
    "ClientShellCss()",
    "ProductDesignTokensCss()",
  ];
  for (const snippet of required) {
    assert(doc.includes(snippet), `examples doc missing snippet: ${snippet}`);
  }
});

check("examples document keeps route boundaries explicit", () => {
  const doc = readText("docs/product-shell-component-examples.md");
  const required = [
    "/ops/home", "/ops/dashboard", "/ops/sources", "/ops/rules", "/ops/users", "/client/live", "/ops/events",
    "source URL", "ONVIF endpoint",
    "Developer URL",
    "raw JSON", "debug counter", "rule/profile", "token", "hash", "session",
  ];
  for (const snippet of required) {
    assert(doc.includes(snippet), `examples boundary missing snippet: ${snippet}`);
  }
});

check("examples document includes stable class examples", () => {
  const doc = readText("docs/product-shell-component-examples.md");
  const css = readText("src/ingress/product_ui_css.cpp");
  const clientCss = readText("src/ingress/product_ui_client_css.cpp");
  const clientScript = readText("src/ingress/product_ui_client_scripts.cpp");
  const required = [
    "app-chrome",
    "app-brand",
    "image-nav-tabs",
    "account-menu",
    "section-card",
    "metric-card",
    "chip warn",
    "ops-responsive-table",
    "ops-row-actions",
    "ops-detail-panel",
    "ops-audit-panel",
    "tile",
    "tile-stage",
    "aria-live=\"polite\"",
  ];
  for (const snippet of required) {
    assert(doc.includes(snippet), `examples class snippet missing: ${snippet}`);
  }
  for (const className of ["app-chrome", "app-brand", "image-nav-tabs", "section-card", "metric-card", "chip.warn", "ops-responsive-table"]) {
    assert(css.includes(`.${className}`), `product CSS missing documented class: ${className}`);
  }
  assert(clientCss.includes(".tile-stage"), "client CSS missing documented class: tile-stage");
  assert(clientScript.includes("class=\"tile"), "client live script missing documented tile class");
});

check("UI guide references product shell examples verifier", () => {
  const guide = readText("docs/ui-guide.md");
  assert(hasDocumentLink(guide, "product-shell-component-examples.md"), "UI guide missing examples link");
  assert(guide.includes("./server.sh verify-product-shell-examples"), "UI guide missing examples verifier");
});

check("server entrypoint exposes product shell examples verifier", () => {
  const server = readText("server.sh");
  const inventory = readText("scripts/internal/verify_script_inventory.mjs");
  const targets = parseServerDispatches(server).filter(item => item.command === "verify-product-shell-examples");
  assert(targets.length === 1 && targets[0].script === "verify_product_shell_examples.mjs",
    "server.sh missing or mismatched product shell examples dispatch");
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
console.log("- scope: static documentation/source wiring; actual UI not-run");

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
