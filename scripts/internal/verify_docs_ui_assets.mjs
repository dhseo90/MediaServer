#!/usr/bin/env node
// 파일 용도: README와 UI guide가 관리 대상 UI screenshot asset만 참조하는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import { extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const realRootDir = fs.realpathSync(rootDir);
const docsAssetDir = path.join(rootDir, "docs/assets/ui");
const docsAssetEnDir = path.join(docsAssetDir, "en");

const manifest = JSON.parse(readText("config/docs_ui_assets.json"));
const currentVersion = readText("VERSION").trim();
const latestPublishedTag = "v4.0.0";
const readmeAssets = manifest.assets.filter((asset) => asset.readme).map((asset) => asset.file);
const uiGuideAssets = manifest.assets.filter((asset) => asset.uiGuide).map((asset) => asset.file);
const assetByFile = new Map(manifest.assets.map((asset) => [asset.file, asset]));
const expectedUiReviewFiles = [
  "auth-login.png",
  "client-dashboard.png",
  "client-live.png",
  "ops-channels.png",
  "ops-dashboard.png",
  "ops-home.png",
  "ops-rules-preview.png",
  "ops-rules.png",
  "ops-users.png",
];
const expectedReviewPaths = [
  ...expectedUiReviewFiles.map((file) => `docs/assets/ui/${file}`),
  ...expectedUiReviewFiles.map((file) => `docs/assets/ui/en/${file}`),
  "docs/assets/va-four-scene-sample.png",
  "docs/assets/va-four-scene-overlay-ko.jpg",
].sort();
const historicalVaReviewPaths = new Set([
  "docs/assets/va-four-scene-sample.png",
  "docs/assets/va-four-scene-overlay-ko.jpg",
]);

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

check("docs UI asset policy documents capture rules", () => {
  const policy = readText("docs/assets/ui/README.md");
  const requiredSnippets = [
    "config/docs_ui_assets.json",
    "managed asset list",
    "직접 이미지 검수 checklist",
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

check("managed UI asset manifest stays complete", () => {
  assert(manifest.schema === "media-server.docs-ui-assets.v1", "docs UI asset manifest schema mismatch");
  assert(manifest.baseline?.sourceVersion === currentVersion, "docs UI asset manifest source version drifted");
  assert(manifest.baseline?.releaseTarget === `v${currentVersion}`, "docs UI asset manifest release target drifted");
  assert(manifest.baseline?.publishedRelease === latestPublishedTag, "docs UI asset manifest published release drifted");
  assert(manifest.baseline?.publicReleaseStatus === `v${currentVersion}-source-${latestPublishedTag}-published`, "docs UI asset manifest public release status drifted");
  assert(manifest.baseline?.capturedAt === "2026-08-31", "docs UI asset manifest capture date drifted");
  assert(manifest.baseline?.theme === "dark", "docs UI asset manifest theme drifted");
  assert(manifest.baseline?.sampleVideo === "va_four_scene_sample.mp4", "docs UI asset manifest sample video drifted");
  assert(manifest.baseline?.manualReviewRequired === true, "docs UI asset manifest must require direct manual image review");
  assert(manifest.directReview?.reviewedAt === "2026-09-28", "docs UI asset direct review date drifted");
  assert(manifest.directReview?.tool === "Native Chrome + Codex PNG review", "docs UI asset direct review tool drifted");
  assert(manifest.directReview?.assetCount === 20, "docs UI asset direct review count drifted");
  assert(manifest.directReview?.status === "PASS", "docs UI asset direct review is not PASS");
  assert(manifest.directReview?.englishHangulResidue === 0, "English screenshot direct review found Hangul residue");
  assert(manifest.directReview?.clientLeakCheck === "PASS", "client screenshot leak review is not PASS");
  assert(Array.isArray(manifest.directReview?.assets), "docs UI asset direct review receipts are missing");
  assert(manifest.directReview.assets.length === manifest.directReview.assetCount, "direct review receipt count does not match assetCount");
  const reviewedPaths = manifest.directReview.assets.map((asset) => asset?.path);
  assert(new Set(reviewedPaths).size === reviewedPaths.length, "direct review receipts contain duplicate paths");
  assert(
    JSON.stringify([...reviewedPaths].sort()) === JSON.stringify(expectedReviewPaths),
    "direct review receipts must contain the exact Korean/English UI 18 and historical VA 2 paths",
  );
  let recapturedCount = 0;
  let retainedCount = 0;
  for (const reviewed of manifest.directReview.assets) {
    assertReviewedAssetReceipt(reviewed);
    if (reviewed.action === "recaptured") recapturedCount += 1;
    if (reviewed.action === "retained") retainedCount += 1;
  }
  assert(recapturedCount === 8, `direct review recaptured count must be 8, got ${recapturedCount}`);
  assert(retainedCount === 12, `direct review retained count must be 12, got ${retainedCount}`);
  assert(manifest.captureScript === "scripts/internal/capture_docs_ui_assets.mjs", "docs UI asset manifest capture script drifted");
  assert(manifest.verificationCommand === "./server.sh verify-docs-ui-assets", "docs UI asset manifest verification command drifted");
  assert(Array.isArray(manifest.directReviewChecklist) && manifest.directReviewChecklist.length >= 5, "direct review checklist is too small");
  for (const snippet of [
    "Open every Korean and English PNG",
    "current source tree representative shell",
    "full video viewport",
    "source URLs",
    "unverified rather than pass",
  ]) {
    assert(
      manifest.directReviewChecklist.some((item) => String(item).includes(snippet)),
      `direct review checklist missing snippet: ${snippet}`,
    );
  }
  const files = new Set();
  for (const asset of manifest.assets) {
    assert(asset.file && asset.captureTask, `manifest asset missing file/captureTask: ${JSON.stringify(asset)}`);
    assert(!files.has(asset.file), `duplicate managed UI asset: ${asset.file}`);
    files.add(asset.file);
    assert(asset.minimum?.width >= 700, `${asset.file} minimum width is too small`);
    assert(asset.minimum?.height >= 400, `${asset.file} minimum height is too small`);
  }
  for (const asset of readmeAssets) {
    assert(uiGuideAssets.includes(asset), `README asset must also be in UI guide set: ${asset}`);
  }
});

check("capture script owns every documented UI asset", () => {
  const script = readText("scripts/internal/capture_docs_ui_assets.mjs");
  const productThemeBlock = extractCppFunctionBlock(
    readText("src/ingress/product_ui_js.cpp"),
    "void AppendProductThemeScript(std::ostringstream& out)",
  );
  assert(productThemeBlock.includes("const next = currentTheme() === 'dark' ? 'light' : 'dark';"), "UI-019 bounded light/dark theme action missing");
  assert(productThemeBlock.includes("document.documentElement.dataset.theme = next;"), "UI-019 bounded document theme state readback missing");
  assert(productThemeBlock.includes("localStorage.setItem('mediaServerTheme', next);"), "UI-019 bounded theme persistence readback missing");
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
  assert(
    ruleSmoke.includes("ensureRulePreviewPrerequisites({") && ruleSmoke.includes("httpBase"),
    "verify-rule-ui does not use shared rule preview fixture helper",
  );
  assert(sharedFixture.includes("rulePreviewProfilePayload"), "shared rule preview fixture helper is missing profile payload");
  assert(sharedFixture.includes("rulePreviewEventTemplatePayload"), "shared rule preview fixture helper is missing event template payload");
  assert(sharedFixture.includes("rulePreviewVaRulePayload"), "shared rule preview fixture helper is missing VA rule payload");
  for (const asset of manifest.assets) {
    assert(script.includes(`name: "${asset.captureTask}"`), `capture_docs_ui_assets.mjs does not manage task ${asset.captureTask}`);
    assert(script.includes(`file: "${asset.file}"`), `capture_docs_ui_assets.mjs does not manage ${asset.file}`);
  }
});

check("docs capture covers current screenshots", () => {
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
    assert(script.includes(snippet), `capture_docs_ui_assets.mjs is missing current capture snippet: ${snippet}`);
  }
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
  assert(policy.includes("제품 shell 설명용"), "docs/assets/ui/README.md must describe screenshots as representative shell assets");
  assert(policy.includes("공개 릴리즈 증거로 쓰지 않습니다"), "docs/assets/ui/README.md must not describe screenshots as publication evidence");
});

check("representative screenshot docs do not point at stale visual baselines", () => {
  const scopedDocs = [
    ["README.md", readText("README.md")],
    ["README.en.md", readText("README.en.md")],
    ["docs/ui-guide.md", readText("docs/ui-guide.md")],
    ["docs/assets/ui/README.md", readText("docs/assets/ui/README.md")],
  ];
  const stalePatterns = [
    /v1\.[0-6]\.0[^.\n]*(?:screenshot|스크린샷|대표 이미지)/i,
    /2026-05-(?:0[1-9]|1[0-9]|2[0-2])[^.\n]*(?:screenshot|스크린샷|대표 이미지)/i,
  ];
  for (const [label, text] of scopedDocs) {
    for (const pattern of stalePatterns) {
      assert(!pattern.test(text), `${label} still references stale screenshot baseline pattern: ${pattern}`);
    }
  }
});

check("docs UI asset directory contains managed PNG files", () => {
  const allowed = new Set(uiGuideAssets);
  const trackedAssets = gitLsFiles("docs/assets/ui");
  const entries = trackedAssets
    .filter((entry) => path.dirname(entry) === "docs/assets/ui" && entry.endsWith(".png"))
    .map((entry) => path.basename(entry));
  for (const entry of entries) {
    assert(allowed.has(entry), `unexpected unmanaged UI PNG asset: ${entry}`);
  }
  for (const asset of uiGuideAssets) {
    const filePath = path.join(docsAssetDir, asset);
    assert(fs.existsSync(filePath), `missing UI screenshot asset: ${asset}`);
    const size = fs.statSync(filePath).size;
    assert(size > 1024, `${asset} is too small to be a valid screenshot (${size} bytes)`);
    const dimensions = readPngDimensions(filePath);
    assertMeetsManifestMinimum(asset, dimensions, "");
  }
  assert(fs.existsSync(docsAssetEnDir), "missing English UI screenshot asset directory: docs/assets/ui/en");
  const englishEntries = trackedAssets
    .filter((entry) => path.dirname(entry) === "docs/assets/ui/en" && entry.endsWith(".png"))
    .map((entry) => path.basename(entry));
  for (const entry of englishEntries) {
    assert(uiGuideAssets.includes(entry), `unexpected unmanaged English UI PNG asset: ${entry}`);
  }
  for (const asset of uiGuideAssets) {
    const filePath = path.join(docsAssetEnDir, asset);
    assert(fs.existsSync(filePath), `missing English UI screenshot asset: ${asset}`);
    const size = fs.statSync(filePath).size;
    assert(size > 1024, `${asset} English screenshot is too small (${size} bytes)`);
    const dimensions = readPngDimensions(filePath);
    assertMeetsManifestMinimum(asset, dimensions, "English ");
  }
});

check("VA documentation images keep full video frame bounds", () => {
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

function gitLsFiles(relativePath) {
  const result = spawnSync("git", ["ls-files", relativePath], {
    cwd: rootDir,
    encoding: "utf8",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`git ls-files ${relativePath} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.split(/\n/).filter(Boolean);
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

// 직접 시각 검토 receipt와 현재 파일의 결속만 확인하며 시각 검토 자체를 대체하지 않는다.
function assertReviewedAssetReceipt(reviewed) {
  assert(reviewed && typeof reviewed === "object", "direct review asset receipt must be an object");
  const relativePath = reviewed.path;
  assert(typeof relativePath === "string" && relativePath.length > 0, "direct review asset path is missing");
  assert(!relativePath.includes("\\") && !relativePath.includes("\0"), `direct review asset path is not portable: ${relativePath}`);
  assert(!path.isAbsolute(relativePath), `direct review asset path must be repository-relative: ${relativePath}`);
  assert(path.posix.normalize(relativePath) === relativePath && !relativePath.split("/").includes(".."), `direct review asset path is not normalized: ${relativePath}`);
  assert(relativePath.startsWith("docs/assets/"), `direct review asset is outside docs/assets: ${relativePath}`);
  const filePath = path.resolve(rootDir, relativePath);
  assert(filePath.startsWith(`${rootDir}${path.sep}`), `direct review asset escapes repository root: ${relativePath}`);
  assert(fs.existsSync(filePath), `direct review asset is missing: ${relativePath}`);
  const realFilePath = fs.realpathSync(filePath);
  assert(realFilePath.startsWith(`${realRootDir}${path.sep}`), `direct review asset symlink escapes repository root: ${relativePath}`);
  const stat = fs.statSync(filePath);
  assert(stat.isFile(), `direct review asset is not a file: ${relativePath}`);

  assert(reviewed.review === "PASS", `direct review asset is not PASS: ${relativePath}`);
  assert(reviewed.action === "recaptured" || reviewed.action === "retained", `direct review action is invalid: ${relativePath}`);
  if (historicalVaReviewPaths.has(relativePath)) {
    assert(reviewed.action === "retained", `historical VA asset must be retained: ${relativePath}`);
    assert(reviewed.capturedAt === null, `only historical VA assets use null capturedAt: ${relativePath}`);
  } else if (reviewed.action === "recaptured") {
    assert(reviewed.capturedAt === "2026-09-28", `recaptured UI asset date drifted: ${relativePath}`);
  } else {
    assert(reviewed.capturedAt === manifest.baseline.capturedAt, `retained UI asset date must keep the baseline capture date: ${relativePath}`);
  }

  assert(Number.isSafeInteger(reviewed.bytes) && reviewed.bytes > 1024, `direct review asset bytes are invalid: ${relativePath}`);
  assert(reviewed.bytes === stat.size, `direct review asset byte count drifted: ${relativePath}`);
  assert(typeof reviewed.sha256 === "string" && /^[0-9a-f]{64}$/.test(reviewed.sha256), `direct review asset SHA-256 is invalid: ${relativePath}`);
  assert(reviewed.sha256 === sha256File(filePath), `direct review asset SHA-256 drifted: ${relativePath}`);
  assert(Number.isSafeInteger(reviewed.width) && reviewed.width > 0, `direct review asset width is invalid: ${relativePath}`);
  assert(Number.isSafeInteger(reviewed.height) && reviewed.height > 0, `direct review asset height is invalid: ${relativePath}`);
  const dimensions = relativePath.endsWith(".png") ? readPngDimensions(filePath) : readJpegDimensions(filePath);
  assert(reviewed.width === dimensions.width, `direct review asset width drifted: ${relativePath}`);
  assert(reviewed.height === dimensions.height, `direct review asset height drifted: ${relativePath}`);

  if (relativePath.startsWith("docs/assets/ui/") && relativePath.endsWith(".png")) {
    const asset = path.basename(relativePath);
    assertMeetsManifestMinimum(asset, dimensions, relativePath.includes("/en/") ? "English " : "");
    assert(dimensions.height <= 1450, `${relativePath} height exceeds 1450: ${dimensions.height}`);
    const verticalRatio = dimensions.height / dimensions.width;
    assert(verticalRatio <= 1.15, `${relativePath} height/width exceeds 1.15: ${verticalRatio.toFixed(3)}`);
  }
}

function sha256File(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
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

function assertMeetsManifestMinimum(asset, dimensions, prefix) {
  const managed = assetByFile.get(asset);
  assert(managed, `${asset} is missing from docs UI asset manifest`);
  const minimum = managed.minimum || { width: 700, height: 400 };
  assert(dimensions.width >= minimum.width, `${asset} ${prefix}width is too small: ${dimensions.width}`);
  const videoHint = managed.video ? "; lower video/control/status/overlay area may be cropped" : "";
  assert(dimensions.height >= minimum.height, `${asset} ${prefix}height is too small: ${dimensions.height}${videoHint}`);
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
