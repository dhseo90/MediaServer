#!/usr/bin/env node
// 파일 용도: LGPL/GPL 계열 runtime을 포함하는 배포 전 source offer 준비 항목을 Markdown으로 정리한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Third-party source offer checklist writer

Usage:
  ./server.sh source-offer-checklist [options]

Options:
  --inventory <path>             third-party attribution inventory JSON입니다. 기본 config/third_party_attribution.json.
  --bundle-policy-report <path>  verify-bundle-policy --json-output 결과입니다. 있으면 위반 후보를 함께 표시합니다.
  --output <path>                생성할 Markdown 파일입니다. 기본 /tmp/media_server_source_offer_checklist.md.
  --stable                       generatedAt을 고정해 CI diff를 안정화합니다.
  -h, --help                     도움말 출력
`);
}
assertKnownOptions(rawArgs, [
  "inventory",
  "bundle-policy-report",
  "output",
  "stable",
  "h",
  "help",
]);

const args = parseArgs(rawArgs);
const inventoryPath = path.resolve(rootDir, args.inventory || "config/third_party_attribution.json");
const outputPath = path.resolve(rootDir, args.output || "/tmp/media_server_source_offer_checklist.md");
const reportPath = args.bundlePolicyReport ? path.resolve(rootDir, args.bundlePolicyReport) : "";
const inventory = readJson(inventoryPath);
const report = reportPath && fs.existsSync(reportPath) ? readJson(reportPath) : null;
const generatedAt = args.stable ? "stable" : new Date().toISOString();

const checklist = buildChecklist({ inventoryPath, inventory, reportPath, report, generatedAt });
writeText(outputPath, checklist);
console.log(`[pass] source offer checklist written: ${path.relative(rootDir, outputPath) || outputPath}`);

function buildChecklist({ inventoryPath: sourceInventoryPath, inventory: inventoryPayload, reportPath: sourceReportPath, report: bundleReport, generatedAt: snapshotTime }) {
  const riskyDeps = (inventoryPayload.dependencies || []).filter(isSourceOfferRelevant);
  const hits = Array.isArray(bundleReport?.hits) ? bundleReport.hits : [];
  const status = hits.length > 0 ? "requires-license-review" : "default-bundle-no-runtime-hit";
  const lines = [
    "# Third-party Source Offer Checklist",
    "",
    "<!-- 이 파일은 ./server.sh source-offer-checklist 명령으로 생성합니다. -->",
    "",
    `- schema: media-server.source-offer-checklist.v1`,
    `- generatedAt: ${snapshotTime}`,
    `- status: ${status}`,
    `- inventory: ${relativePath(sourceInventoryPath)}`,
    `- bundlePolicyReport: ${sourceReportPath ? relativePath(sourceReportPath) : "(not provided)"}`,
    "",
    "기본 Apache-2.0 소스 공개에는 third-party runtime binary를 포함하지 않습니다.",
    "FFmpeg, libav*, x264/x265, GStreamer GPL-risk plugin, LGPL runtime library를 bundle/container/offline package에 넣는 경우에만 아래 항목을 release gate로 사용합니다.",
    "",
    "## Release Gate",
    "",
    "- [ ] `./server.sh verify-bundle-policy --bundle-dir <release_bundle_dir> --json-output /tmp/media_server_bundle_policy.json` 결과를 보관했습니다.",
    "- [ ] 포함된 binary와 정확히 대응되는 upstream source URL, tag, package version을 기록했습니다.",
    "- [ ] configure/build flag, patch/diff, local rebuild 절차를 보관했습니다.",
    "- [ ] license text, NOTICE, attribution, source offer 문구를 bundle과 release note에 포함했습니다.",
    "- [ ] LGPL/GPL과 충돌하는 EULA 문구가 없는지 확인했습니다.",
    "- [ ] container image 또는 offline package라면 image/rootfs 파일 목록과 checksum manifest를 보관했습니다.",
    "",
    "## Bundle Policy Hits",
    "",
    "| 결과 | Rule | 종류 | 파일 | 상세 | 사유 |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  if (hits.length === 0) {
    lines.push("| PASS | - | - | - | - | 기본 bundle policy 위반 후보가 없습니다. |");
  } else {
    for (const hit of hits) {
      lines.push(`| REVIEW | ${cell(hit.ruleId)} | ${cell(hit.kind)} | ${cell(hit.file)} | ${cell(hit.line || "-")} | ${cell(hit.reason)} |`);
    }
  }
  lines.push(
    "",
    "## Source Offer 대상 후보",
    "",
    "| 구성요소 | License | 배포 형태 | Source | 확인 기준 |",
    "| --- | --- | --- | --- | --- |",
  );
  for (const dep of riskyDeps) {
    lines.push([
      `| ${cell(dep.name || dep.id)}`,
      cell(dep.license || "-"),
      cell(dep.distribution || "-"),
      cell(dep.source || "-"),
      `${cell(dep.bundlePolicy || dep.versionPolicy || "-")} |`,
    ].join(" | "));
  }
  if (riskyDeps.length === 0) {
    lines.push("| - | - | - | - | inventory에 source offer 대상 후보가 없습니다. |");
  }
  return `${lines.join("\n")}\n`;
}

function isSourceOfferRelevant(dep) {
  const text = [
    dep.license,
    dep.bundlePolicy,
    dep.distribution,
    dep.usage,
  ].join(" ").toLowerCase();
  return /(gpl|lgpl|ffmpeg|libav|x264|x265|runtime|plugin)/.test(text);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`file not found: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function relativePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, "/") || ".";
}

function cell(value) {
  return String(value || "-").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      parsed[toCamel(raw.slice(0, eq))] = raw.slice(eq + 1);
      continue;
    }
    if (raw === "stable") {
      parsed.stable = true;
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[toCamel(raw)] = next;
      index += 1;
    } else {
      parsed[toCamel(raw)] = "1";
    }
  }
  return parsed;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}
