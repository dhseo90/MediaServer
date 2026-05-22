#!/usr/bin/env node
// 파일 용도: README와 UI guide가 관리 대상 UI screenshot asset만 참조하는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const docsAssetDir = path.join(rootDir, "docs/assets/ui");
const docsAssetEnDir = path.join(docsAssetDir, "en");

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

check("English README uses English UI screenshots", () => {
  const readme = readText("README.en.md");
  for (const asset of readmeAssets) {
    assert(
      readme.includes(`docs/assets/ui/en/${asset}`),
      `README.en.md is missing docs/assets/ui/en/${asset}`,
    );
  }
  const referenced = findAssetReferences(readme);
  for (const asset of referenced) {
    assert(readmeAssets.map((item) => `en/${item}`).includes(asset), `README.en.md references non-English UI asset: ${asset}`);
  }
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
  const ruleSmoke = readText("scripts/internal/verify_ops_rules_embed_smoke.mjs");
  const sharedFixture = readText("scripts/internal/rule_preview_fixture_helpers.mjs");
  const requiredSnippets = [
    "function applyDarkTheme",
    "localStorage.setItem('mediaServerTheme', 'dark')",
    "va_four_scene_sample",
    "VA Test File",
    "va-overlay",
    "clip would crop selected content",
    "allowCrop",
    "setupOpsUsers",
    "auth users file not found",
    "Page.captureScreenshot",
    "ensureRulePreviewPrerequisites({ httpBase, includeVaRule: true })",
    "cleanupRulePreviewPrerequisites({ httpBase, created: seededPrereqs })",
  ];
  for (const snippet of requiredSnippets) {
    assert(script.includes(snippet), `capture_docs_ui_assets.mjs is missing capture guard: ${snippet}`);
  }
  assert(ruleSmoke.includes("ensureRulePreviewPrerequisites({ httpBase })"), "verify-rule-ui does not use shared rule preview fixture helper");
  assert(sharedFixture.includes("rulePreviewProfilePayload"), "shared rule preview fixture helper is missing profile payload");
  assert(sharedFixture.includes("rulePreviewEventTemplatePayload"), "shared rule preview fixture helper is missing event template payload");
  assert(sharedFixture.includes("rulePreviewVaRulePayload"), "shared rule preview fixture helper is missing VA rule payload");
  for (const asset of uiGuideAssets) {
    assert(script.includes(`file: "${asset}"`), `capture_docs_ui_assets.mjs does not manage ${asset}`);
  }
});

check("docs capture and English UI copy cover v1.7.0 screenshots", () => {
  const script = readText("scripts/internal/capture_docs_ui_assets.mjs");
  const i18n = readText("src/ingress/product_ui_js.cpp");
  const policy = readText("docs/assets/ui/README.md");
  const requiredScriptSnippets = [
    'data-testid="client-live-source-tree"',
    'data-testid="client-live-workspace"',
    "liveInfoOverlayToggle",
    "VA Test File",
  ];
  for (const snippet of requiredScriptSnippets) {
    assert(script.includes(snippet), `capture_docs_ui_assets.mjs is missing v1.7 capture snippet: ${snippet}`);
  }
  assert(!script.includes('[data-tile="0"] [data-role="view"]'), "client-live docs capture still waits for legacy tile view select");
  const requiredTranslations = [
    "'미리보기': 'Client Preview'",
    "'카메라': 'Cameras'",
    "'시나리오 빌더': 'Scenario Builder'",
    "'현장 preset과 대상 객체를 골라 이벤트 템플릿 초안을 만듭니다. 판단 엔진과 저장 payload 계약은 변경하지 않습니다.':",
    "'사용자 비공개': 'Users hidden'",
    "'채널 생성': 'Channel created'",
  ];
  for (const snippet of requiredTranslations) {
    assert(i18n.includes(snippet), `product English i18n is missing screenshot-visible copy: ${snippet}`);
  }
  assert(policy.includes("v1.7.0 UI-first close-out"), "docs/assets/ui/README.md does not state the v1.7.0 screenshot baseline");
});

check("docs/assets/ui contains only managed PNG files with valid dimensions", () => {
  const allowed = new Set(uiGuideAssets);
  const videoUiMinimums = new Map([
    ["client-live.png", { width: 1000, height: 900 }],
    ["ops-rules-preview.png", { width: 1000, height: 850 }],
  ]);
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
    const minimum = videoUiMinimums.get(asset);
    if (minimum) {
      assert(dimensions.width >= minimum.width, `${asset} video capture width is too small: ${dimensions.width}`);
      assert(dimensions.height >= minimum.height, `${asset} video capture height is too small; lower video/overlay area may be cropped: ${dimensions.height}`);
    }
  }
  assert(fs.existsSync(docsAssetEnDir), "missing English UI screenshot asset directory: docs/assets/ui/en");
  const englishEntries = fs.readdirSync(docsAssetEnDir).filter((entry) => entry.endsWith(".png"));
  for (const entry of englishEntries) {
    assert(uiGuideAssets.includes(entry), `unexpected unmanaged English UI PNG asset: ${entry}`);
  }
  for (const asset of uiGuideAssets) {
    const filePath = path.join(docsAssetEnDir, asset);
    assert(fs.existsSync(filePath), `missing English UI screenshot asset: ${asset}`);
    const size = fs.statSync(filePath).size;
    assert(size > 1024, `${asset} English screenshot is too small (${size} bytes)`);
    const dimensions = readPngDimensions(filePath);
    assert(dimensions.width >= 700, `${asset} English width is too small: ${dimensions.width}`);
    assert(dimensions.height >= 400, `${asset} English height is too small: ${dimensions.height}`);
    const minimum = videoUiMinimums.get(asset);
    if (minimum) {
      assert(dimensions.width >= minimum.width, `${asset} English video capture width is too small: ${dimensions.width}`);
      assert(dimensions.height >= minimum.height, `${asset} English video capture height is too small; lower video/overlay area may be cropped: ${dimensions.height}`);
    }
  }
});

check("VA sample and overlay documentation images keep full video frame bounds", () => {
  const sample = readPngDimensions(path.join(rootDir, "docs/assets/va-four-scene-sample.png"));
  const overlay = readJpegDimensions(path.join(rootDir, "docs/assets/va-four-scene-overlay-ko.jpg"));
  assert(sample.width >= 1280, `va-four-scene-sample.png width is too small: ${sample.width}`);
  assert(sample.height >= 720, `va-four-scene-sample.png height is too small: ${sample.height}`);
  assertVideoAspect(sample, "va-four-scene-sample.png");
  assert(overlay.width === 1280, `va-four-scene-overlay-ko.jpg width must remain 1280, got ${overlay.width}`);
  assert(overlay.height === 720, `va-four-scene-overlay-ko.jpg height must remain 720, got ${overlay.height}`);
  assertVideoAspect(overlay, "va-four-scene-overlay-ko.jpg");
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
    /docs\/assets\/ui\/((?:en\/)?[A-Za-z0-9._-]+\.png)/g,
    /assets\/ui\/((?:en\/)?[A-Za-z0-9._-]+\.png)/g,
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

function readJpegDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert(buffer.length > 4, `${path.basename(filePath)} is too small for a JPEG`);
  assert(buffer[0] === 0xff && buffer[1] === 0xd8, `${path.basename(filePath)} is not a JPEG`);
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd9 || marker === 0xda) break;
    const length = buffer.readUInt16BE(offset);
    assert(length >= 2, `${path.basename(filePath)} has invalid JPEG segment length`);
    if (isJpegStartOfFrame(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += length;
  }
  throw new Error(`${path.basename(filePath)} is missing a JPEG SOF dimension marker`);
}

function isJpegStartOfFrame(marker) {
  return [
    0xc0, 0xc1, 0xc2, 0xc3,
    0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb,
    0xcd, 0xce, 0xcf,
  ].includes(marker);
}

function assertVideoAspect(dimensions, label) {
  const ratio = dimensions.width / dimensions.height;
  const target = 16 / 9;
  assert(Math.abs(ratio - target) < 0.02, `${label} aspect ratio should stay near 16:9, got ${ratio.toFixed(3)}`);
}
