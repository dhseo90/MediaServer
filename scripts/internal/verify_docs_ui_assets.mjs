#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const docsAssetDir = path.join(rootDir, "docs/assets/ui");

const readmeAssets = [
  "ops-home.png",
  "ops-channels.png",
  "ops-rules.png",
  "ops-rules-preview.png",
  "ops-users.png",
  "client-live.png",
];

const uiGuideAssets = [
  ...readmeAssets,
  "ops-dashboard.png",
  "client-dashboard.png",
  "auth-login.png",
];

const checks = [];

check("README uses only representative product UI screenshots", () => {
  const readme = readText("README.md");
  for (const asset of readmeAssets) {
    assert(
      readme.includes(`docs/assets/ui/${asset}`),
      `README.md is missing docs/assets/ui/${asset}`,
    );
  }
  const referenced = findAssetReferences(readme);
  for (const asset of referenced) {
    assert(readmeAssets.includes(asset), `README.md references non-representative UI asset: ${asset}`);
  }
  assert(!/docs\/assets\/ui\/(?:analysis|lab|runtime|diagnostic|debug)-/i.test(readme), "README.md references diagnostic/lab assets");
});

check("UI guide keeps product screenshots in the shared asset set", () => {
  const guide = readText("docs/ui-guide.md");
  for (const asset of readmeAssets) {
    assert(guide.includes(`assets/ui/${asset}`), `docs/ui-guide.md is missing assets/ui/${asset}`);
  }
  const referenced = findAssetReferences(guide);
  for (const asset of referenced) {
    assert(uiGuideAssets.includes(asset), `docs/ui-guide.md references unmanaged UI asset: ${asset}`);
  }
  assert(guide.includes("./server.sh verify-docs-ui-assets"), "docs/ui-guide.md does not document verify-docs-ui-assets");
});

check("docs/assets/ui policy documents dark mode and VA overlay capture rules", () => {
  const policy = readText("docs/assets/ui/README.md");
  const requiredSnippets = [
    "dark mode",
    "va_four_scene_sample.mp4",
    "bbox/label",
    "README에는 대표 제품 화면만",
    "운영/개발 진단",
    "verify-docs-ui-assets",
  ];
  for (const snippet of requiredSnippets) {
    assert(policy.includes(snippet), `docs/assets/ui/README.md is missing policy snippet: ${snippet}`);
  }
});

check("capture script owns every documented UI asset", () => {
  const script = readText("scripts/internal/capture_docs_ui_assets.mjs");
  const requiredSnippets = [
    "function applyDarkTheme",
    "localStorage.setItem('mediaServerTheme', 'dark')",
    "va_four_scene_sample",
    "VA Test File",
    "va-overlay",
    "Page.captureScreenshot",
  ];
  for (const snippet of requiredSnippets) {
    assert(script.includes(snippet), `capture_docs_ui_assets.mjs is missing capture guard: ${snippet}`);
  }
  for (const asset of uiGuideAssets) {
    assert(script.includes(`file: "${asset}"`), `capture_docs_ui_assets.mjs does not manage ${asset}`);
  }
});

check("docs/assets/ui contains only managed PNG files with valid dimensions", () => {
  const allowed = new Set(uiGuideAssets);
  const entries = fs.readdirSync(docsAssetDir).filter((entry) => entry.endsWith(".png"));
  for (const entry of entries) {
    assert(allowed.has(entry), `unexpected unmanaged UI PNG asset: ${entry}`);
  }
  for (const asset of uiGuideAssets) {
    const filePath = path.join(docsAssetDir, asset);
    assert(fs.existsSync(filePath), `missing UI screenshot asset: ${asset}`);
    const size = fs.statSync(filePath).size;
    assert(size > 1024, `${asset} is too small to be a valid screenshot (${size} bytes)`);
    const dimensions = readPngDimensions(filePath);
    assert(dimensions.width >= 700, `${asset} width is too small: ${dimensions.width}`);
    assert(dimensions.height >= 400, `${asset} height is too small: ${dimensions.height}`);
  }
});

let failCount = 0;
for (const item of checks) {
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
console.log("== Docs UI asset verification summary ==");
console.log(`- pass: ${checks.length - failCount}`);
console.log(`- fail: ${failCount}`);

if (failCount > 0) {
  process.exit(1);
}

function check(name, run) {
  checks.push({ name, run });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function findAssetReferences(text) {
  const found = new Set();
  const patterns = [
    /docs\/assets\/ui\/([A-Za-z0-9._-]+\.png)/g,
    /assets\/ui\/([A-Za-z0-9._-]+\.png)/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      found.add(match[1]);
    }
  }
  return [...found].sort();
}

function readPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert(buffer.length >= 24, `${path.basename(filePath)} is too small for a PNG header`);
  assert(buffer.subarray(0, 8).equals(pngMagic), `${path.basename(filePath)} is not a PNG`);
  assert(buffer.subarray(12, 16).toString("ascii") === "IHDR", `${path.basename(filePath)} is missing IHDR`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}
