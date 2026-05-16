#!/usr/bin/env node
// 파일 용도: auth shell 페이지의 안정 selector와 선택적 visual smoke를 검증한다.

import os from "node:os";
import path from "node:path";
import process from "node:process";

import {
  cookieHeaderFromNetscapeFile,
  findChrome,
  isTruthy,
  parseWidthList,
  runVisualSmoke,
  writeVisualArtifactIndex,
} from "./ui_visual_smoke_lib.mjs";

const args = parseArgs(process.argv.slice(2));
const httpBase = (args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const timeoutMs = Number(args.timeoutMs || 10000);
const screenshotEnabled = isTruthy(args.screenshots);
const chromePath = args.chromePath || findChrome();
const visualWidths = parseWidthList(args.visualWidths || "320,390,760,1180");
const visualHeight = Number(args.visualHeight || 820);
const debugPortBase = Number(args.debugPortBase || 9820);
const runId = `auth-ui-${Date.now()}-${process.pid}`;
const outputDir = args.outputDir || path.join(os.tmpdir(), `media_server_${runId}`);
const pageSpecs = args.pages.length > 0 ? args.pages : ["login|/login|form.auth-form"];

let passCount = 0;
let failCount = 0;
const failures = [];
const visualChecks = [];

for (const spec of pageSpecs) {
  const page = parsePageSpec(spec);
  try {
    const html = await requestText(page.path, page.cookieFile);
    assertContains(page.name, html, [
      'class="auth-shell"',
      'id="themeToggleBtn"',
      "window.MediaServerUi",
      ...(page.must || []),
    ]);
    passCount += 1;
    console.log(`[pass] ${page.name}: ${page.path}`);
    visualChecks.push({
      name: page.name,
      path: page.path,
      visualSelector: page.visualSelector,
      cookieHeader: cookieHeaderFromNetscapeFile(page.cookieFile),
      requiredSelectors: [
        "body.auth-shell",
        "#themeToggleBtn",
        ".auth-card",
        page.visualSelector,
      ],
    });
  } catch (error) {
    failCount += 1;
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`[${page.name}] ${message}`);
    console.log(`[fail] ${page.name}: ${message}`);
  }
}

console.log("");
console.log("== Auth UI smoke 요약 ==");
console.log(`- 통과: ${passCount}`);
console.log(`- 실패: ${failCount}`);

if (failures.length > 0) {
  console.log("- 실패 상세:");
  for (const failure of failures) {
    console.log(`  - ${failure}`);
  }
  process.exit(1);
}

if (screenshotEnabled) {
  const result = await runVisualSmoke({
    checks: visualChecks,
    httpBase,
    timeoutMs,
    chromePath,
    visualWidths,
    visualHeight,
    debugPortBase,
    outputDir,
    summaryTitle: "Auth screenshot smoke 요약",
    labelPrefix: "auth-visual",
  });
  if (result.failCount > 0) process.exit(1);
  writeVisualArtifactIndex({
    outputDir,
    title: "Auth Visual Regression Artifacts",
    command: "MEDIA_SERVER_VERIFY_AUTH_VISUAL=1 MEDIA_SERVER_VERIFY_AUTH_SCREENSHOTS=1 ./server.sh verify-auth-bootstrap",
    httpBase,
    visualWidths,
    visualHeight,
    checks: visualChecks,
  });
}

function parsePageSpec(spec) {
  const [name, pagePath, visualSelector = "form.auth-form", cookieFile = "", ...needles] = String(spec).split("|");
  if (!name || !pagePath) {
    throw new Error(`invalid --page spec: ${spec}`);
  }
  return {
    name,
    path: pagePath,
    visualSelector,
    cookieFile,
    must: needles.filter(Boolean),
  };
}

function assertContains(name, text, needles) {
  for (const needle of needles) {
    if (!text.includes(needle)) {
      throw new Error(`${name}: missing selector/text: ${needle}`);
    }
  }
}

async function requestText(pagePath, cookieFile) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = { Accept: "text/html" };
  const cookieHeader = cookieHeaderFromNetscapeFile(cookieFile);
  if (cookieHeader) headers.Cookie = cookieHeader;
  try {
    const response = await fetch(new URL(pagePath, `${httpBase}/`), {
      signal: controller.signal,
      headers,
      credentials: "same-origin",
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`${pagePath} HTTP ${response.status}: ${text.slice(0, 180)}`);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function parseArgs(argv) {
  const result = { pages: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    const key = toCamel(eq >= 0 ? raw.slice(0, eq) : raw);
    const value = eq >= 0 ? raw.slice(eq + 1) : argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[++index] : "1";
    if (key === "page") {
      result.pages.push(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}
