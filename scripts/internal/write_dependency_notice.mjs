#!/usr/bin/env node
// 파일 용도: third-party attribution inventory를 읽어 배포용 notice 문서를 생성하거나 최신 상태인지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Dependency notice generator

Usage:
  ./server.sh write-dependency-notice [options]

Options:
  --inventory <path>  attribution inventory JSON입니다. 기본 config/third_party_attribution.json.
  --output <path>     생성할 Markdown 파일입니다. 기본 inventory.generatedFile.
  --check             파일을 쓰지 않고 생성 결과와 기존 파일이 같은지 검증합니다.
  -h, --help          도움말 출력
`);
}
assertKnownOptions(rawArgs, ["inventory", "output", "check", "h", "help"]);

const args = parseArgs(rawArgs);
const inventoryPath = path.resolve(rootDir, args.inventory || "config/third_party_attribution.json");
const inventory = readInventory(inventoryPath);
const outputPath = path.resolve(rootDir, args.output || inventory.generatedFile || "THIRD_PARTY_NOTICES.md");
const markdown = buildMarkdown(inventory, path.relative(rootDir, inventoryPath).replaceAll(path.sep, "/"));

if (args.check) {
  if (!fs.existsSync(outputPath)) {
    fail(`notice file is missing: ${path.relative(rootDir, outputPath)}`);
  }
  const current = fs.readFileSync(outputPath, "utf8");
  if (current !== markdown) {
    fail(`notice file is stale: ${path.relative(rootDir, outputPath)}\nrun: ./server.sh write-dependency-notice`);
  }
  console.log(`[pass] dependency notice is current: ${path.relative(rootDir, outputPath)}`);
  process.exit(0);
}

fs.writeFileSync(outputPath, markdown, "utf8");
console.log(`[pass] dependency notice written: ${path.relative(rootDir, outputPath)}`);

function readInventory(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`inventory not found: ${filePath}`);
  }
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(payload.dependencies) || payload.dependencies.length === 0) {
    throw new Error("inventory.dependencies must not be empty");
  }
  return payload;
}

function buildMarkdown(inventory, inventoryLabel) {
  const lines = [
    "# Third-Party Notices",
    "",
    "<!-- 이 파일은 ./server.sh write-dependency-notice 명령으로 생성합니다. -->",
    "",
    `- schema: ${inventory.schema || "media-server.third-party-attribution.v1"}`,
    `- source inventory: ${inventoryLabel}`,
    "- scope: binary bundle과 운영 배포 전에 확인해야 하는 third-party runtime/tool/model attribution",
    "",
    "이 문서는 이 저장소의 Apache-2.0 라이선스가 third-party 구성요소를 재라이선스하지 않는다는 점을 명확히 하기 위한 배포 점검용 문서입니다.",
    "실제 binary bundle에 포함되는 파일 목록은 배포 방식마다 달라질 수 있으므로, release 전에 포함 library/plugin/model/tool을 다시 확인해야 합니다.",
    "",
    "| 구성요소 | 라이선스 | 용도 | 출처 | 배포 형태 | 번들 기준 |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const dep of inventory.dependencies) {
    lines.push([
      `| ${cell(dep.name || dep.id)}`,
      cell(dep.license),
      cell(dep.usage),
      cell(dep.source),
      cell(dep.distribution),
      `${cell(dep.bundlePolicy)} |`,
    ].join(" | "));
  }
  lines.push(
    "",
    "## Release Checklist",
    "",
    "- [ ] binary bundle 안의 동적 library와 plugin 목록을 확인했습니다.",
    "- [ ] model file과 sample media가 bundle에 포함되는지 확인했습니다.",
    "- [ ] 포함되는 third-party license text와 attribution을 bundle에 함께 넣었습니다.",
    "- [ ] FFmpeg/GStreamer plugin build가 GPL component를 포함하는지 확인했습니다.",
    "- [ ] YOLO model asset 재배포/상업 사용 조건을 별도로 확인했습니다.",
    "",
  );
  return lines.join("\n");
}

function cell(value) {
  return String(value || "-").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function fail(message) {
  console.error(`[fail] ${message}`);
  process.exit(1);
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
    if (raw === "check") {
      parsed.check = true;
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
