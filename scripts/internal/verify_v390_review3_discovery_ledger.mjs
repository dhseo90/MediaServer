#!/usr/bin/env node
// 파일 용도: V390-REVIEW3-36의 Markdown 전문 감사와 source incomplete marker 결정을 재현한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const ledgerRelativePath = "test/fixtures/v390_review3_discovery_ledger.json";
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 REVIEW3 discovery ledger verification

Usage:
  ./server.sh verify-v390-review3-discovery-ledger [--write-ledger]

Checks:
  - AGENTS.md와 분리된 tracked Markdown 173개를 파일별로 끝까지 읽고 SHA-256/분류/marker/중복 ledger를 고정
  - src/include 및 검증 tooling의 explicit incomplete marker를 전수 분류
  - AnalysisDocumentRegistry::RulesJson()의 두 notImplementedYet 항목이 승인된 제외/테스트 이관 결정으로 닫힘
  - feature inventory 986행 수가 비기능 scope decision 때문에 변하지 않음
`);
}
assertKnownOptions(rawArgs, ["h", "help", "write-ledger"]);

const writeLedger = rawArgs.includes("--write-ledger");
const current = buildLedger();
if (writeLedger) {
  fs.mkdirSync(path.dirname(path.join(rootDir, ledgerRelativePath)), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, ledgerRelativePath),
    `${JSON.stringify(current, null, 2)}\n`,
  );
}

const stored = readJson(ledgerRelativePath);
const checks = [];
check("AGENTS.md is audited separately from the 173-file document ledger", () => {
  assert(current.agentsDocument.path === "AGENTS.md", "AGENTS.md audit boundary is missing");
  assert(current.agentsDocument.fullReadBytes === current.agentsDocument.bytes, "AGENTS.md was not fully read");
  assert(current.summary.markdownFiles === 173, `expected 173 Markdown files, got ${current.summary.markdownFiles}`);
  assert(current.markdown.every(item => item.fullReadBytes === item.bytes), "a Markdown file was not fully read");
});
check("stored Markdown ledger exactly matches current full-file content", () => {
  assertStableEqual(stored.markdown, current.markdown, "Markdown ledger drift");
  assertStableEqual(stored.agentsDocument, current.agentsDocument, "AGENTS.md ledger drift");
});
check("source incomplete marker ledger exactly matches current source", () => {
  assertStableEqual(stored.sourceMarkers, current.sourceMarkers, "source marker ledger drift");
  assert(stored.sourceMarkers.every(item => item.disposition !== "unclassified"), "unclassified source marker remains");
});
check("RulesJson incomplete markers are closed by explicit decisions", () => {
  const source = readText("src/ingress/webrtc_http_server.cpp");
  assert(!source.includes("notImplementedYet"), "RulesJson still exposes notImplementedYet");
  assertStableEqual(stored.scopeDecisions, current.scopeDecisions, "scope decision drift");
  assert(stored.scopeDecisions.length === 2, "exactly two RulesJson scope decisions are required");
  assert(stored.scopeDecisions.every(item => ["excluded-by-design", "transferred-to-test-condition"].includes(item.disposition)), "invalid scope decision disposition");
});
check("scope decisions are registered without inflating the 986 feature rows", () => {
  const inventory = readText("docs/project-feature-test-inventory.md");
  const featureRows = [...inventory.matchAll(/^\| (?:UI|AUTH|SRC|RULE|EVT|CLIENT|MEDIA|LAB|SAFE|OPS)-\d{3} \|/gm)];
  assert(featureRows.length === 986, `feature inventory row count changed: ${featureRows.length}`);
  for (const decision of current.scopeDecisions) {
    assert(inventory.includes(decision.id), `inventory missing scope decision ${decision.id}`);
    assert(inventory.includes(decision.disposition), `inventory missing disposition ${decision.disposition}`);
  }
});
check("roadmap and retained test records identify REVIEW3-36 implementation", () => {
  const backlog = readText("docs/development-backlog.md");
  const records = readText("docs/release-test-records.md");
  assert(backlog.includes("V390-REVIEW3-36"), "roadmap item is missing");
  assert(/^\| 36 \| V390-REVIEW3-36 \| Discovery \|[^\n]*\| 완료 \|/m.test(backlog), "roadmap does not record REVIEW3-36 completion");
  assert(records.includes("V390-REVIEW3-36 discovery ledger"), "release test record entry is missing");
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
console.log("== V390 REVIEW3 discovery ledger summary ==");
console.log(`- markdownFiles: ${current.summary.markdownFiles}`);
console.log(`- sourceFiles: ${current.summary.sourceFiles}`);
console.log(`- sourceMarkers: ${current.summary.sourceMarkers}`);
console.log(`- scopeDecisions: ${current.scopeDecisions.length}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function buildLedger() {
  const markdownPaths = repositoryFiles(["*.md", "*.sub.md"])
    .filter(file => file !== "AGENTS.md")
    .sort();
  const agentsDocument = auditMarkdown("AGENTS.md", new Map());
  const paragraphOwners = buildParagraphOwners(markdownPaths);
  const markdown = markdownPaths.map(file => auditMarkdown(file, paragraphOwners));
  const sourcePaths = repositoryFiles([])
    .filter(isAuditedSource)
    .sort();
  const sourceMarkers = sourcePaths.flatMap(auditSourceMarkers);
  return {
    schema: "media-server.v390-review3-discovery-ledger.v1",
    generatedAt: new Date().toISOString(),
    sourceBoundary: {
      markdown: "all repository Markdown except AGENTS.md, which is audited separately",
      source: "src/include product code plus server.sh and scripts/internal verifier/runtime tooling",
      evidenceBoundary: "full-content static audit; not runtime, UI fulltest, 30-minute, or 120-minute PASS evidence",
    },
    summary: {
      markdownFiles: markdown.length,
      markdownBytes: markdown.reduce((sum, item) => sum + item.bytes, 0),
      sourceFiles: sourcePaths.length,
      sourceMarkers: sourceMarkers.length,
      unclassifiedSourceMarkers: sourceMarkers.filter(item => item.disposition === "unclassified").length,
    },
    agentsDocument,
    markdown,
    sourceMarkers,
    scopeDecisions: scopeDecisions(),
  };
}

function repositoryFiles(patterns) {
  const args = ["ls-files", "--cached", "--others", "--exclude-standard"];
  if (patterns.length > 0) args.push("--", ...patterns);
  return execFileSync("git", args, { cwd: rootDir, encoding: "utf8" })
    .split("\n")
    .map(value => value.trim())
    .filter(Boolean)
    .filter(file => fs.existsSync(path.join(rootDir, file)));
}

function auditMarkdown(relativePath, paragraphOwners) {
  const raw = fs.readFileSync(path.join(rootDir, relativePath));
  const text = raw.toString("utf8");
  const explicitStatusMarkers = lineMatches(text, /\b(?:TODO|FIXME|TBD)\b|미완료|미확인|후속 예정|review-required|not-approved/gi);
  const duplicateParagraphs = normalizedParagraphs(text)
    .map(value => sha256(value))
    .filter(digest => (paragraphOwners.get(digest) ?? new Set()).size > 1);
  const classification = classifyMarkdown(relativePath);
  return {
    path: relativePath,
    classification,
    bytes: raw.byteLength,
    fullReadBytes: raw.byteLength,
    lines: text === "" ? 0 : text.split(/\r?\n/).length,
    sha256: sha256(raw),
    explicitStatusMarkerCount: explicitStatusMarkers.length,
    duplicateParagraphGroupCount: new Set(duplicateParagraphs).size,
    currentLogicMismatch: classification === "historical-evidence"
      ? "historical-not-current"
      : explicitStatusMarkers.length > 0
        ? "reviewed-explicit-status-markers"
        : "none-detected-by-strict-static-audit",
    duplicateComplexity: duplicateParagraphs.length > 0
      ? "cross-file-exact-paragraph-repetition-recorded"
      : "none-detected",
    action: markdownAction(classification, explicitStatusMarkers.length),
  };
}

function buildParagraphOwners(markdownPaths) {
  const owners = new Map();
  for (const file of markdownPaths) {
    const text = readText(file);
    for (const paragraph of normalizedParagraphs(text)) {
      const digest = sha256(paragraph);
      if (!owners.has(digest)) owners.set(digest, new Set());
      owners.get(digest).add(file);
    }
  }
  return owners;
}

function normalizedParagraphs(text) {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map(block => block.split(/\r?\n/).map(line => line.trim()).join(" ").replace(/\s+/g, " ").trim())
    .filter(block => block.length >= 160)
    .filter(block => !block.startsWith("|") && !block.startsWith("```") && !block.startsWith("#"));
}

function classifyMarkdown(file) {
  if (file.startsWith("docs/release-artifacts/")) return "historical-evidence";
  if (file.startsWith("docs/superpowers/")) return "implementation-plan";
  if (file.startsWith("test/fixtures/")) return "test-fixture";
  if (file.startsWith(".github/")) return "repository-template";
  if (file === "README.md" || file === "README.en.md" || file.startsWith("docs/en/")) return "public-entry";
  if (file.startsWith("docs/")) return "current-documentation";
  return "repository-policy-or-metadata";
}

function markdownAction(classification, markerCount) {
  if (classification === "historical-evidence") return "preserve-audit-only";
  if (classification === "implementation-plan") return "preserve-plan-history";
  if (classification === "test-fixture") return "preserve-test-input";
  return markerCount > 0 ? "status-language-reviewed-no-implicit-pass" : "retain-no-change";
}

function isAuditedSource(file) {
  if (file === "server.sh") return true;
  if (!/^(src|include|scripts\/internal)\//.test(file)) return false;
  return /\.(?:c|cc|cpp|cxx|h|hh|hpp|mjs|js|sh|py)$/.test(file);
}

function auditSourceMarkers(relativePath) {
  const text = readText(relativePath);
  return lineMatches(text, /\b(?:TODO|FIXME|XXX)\b|notImplementedYet|\bnot\s+implemented(?:\s+yet)?\b|\bunimplemented\b|미구현|미완성|후속 예정/gi)
    .map(item => ({
      path: relativePath,
      line: item.line,
      marker: item.match,
      contextSha256: sha256(item.context),
      disposition: sourceMarkerDisposition(relativePath, item.context),
    }));
}

function sourceMarkerDisposition(file, context) {
  if (file.startsWith("scripts/internal/")) return "verifier-contract-or-historical-wording";
  if (file === "src/ingress/product_ui_js.cpp" && context.includes("입력 미완성")) {
    return "product-state-copy-not-code-gap";
  }
  if (file === "src/ingress/product_ui_page_scripts.cpp" && context.includes("receipt bundle is not implemented in Step 10")) {
    return "preserved-step-boundary-copy";
  }
  if (/stub/i.test(context)) return "supported-build-fallback";
  return "unclassified";
}

function scopeDecisions() {
  return [
    {
      id: "V390-RULESJSON-NON-VA-AUTO-MATCH",
      originalMarker: "automatic rule matching for non-VA streams",
      disposition: "excluded-by-design",
      inventoryRowDelta: 0,
      reason: "analysis rule selection is valid only after explicit VA enablement; attaching analysis to a non-VA media path would violate the product analysis boundary",
      ownerToReadback: "AnalysisDocumentRegistry::RuleDocuments -> FindMatchingRuleProfile -> ResolveAnalysisProfile -> AnalysisManager tap selectedByRuleId readback",
      sourceEvidence: [
        "src/ingress/webrtc_http_server.cpp::AnalysisDocumentRegistry::RuleDocuments",
        "src/ingress/analysis_query.cpp::FindMatchingRuleProfile",
        "src/ingress/analysis_query.cpp::ResolveAnalysisProfile",
        "src/core/session_manager.cpp::AttachAnalysisTap",
      ],
      completionEvidence: "RulesJson no longer advertises the excluded behavior as notImplementedYet",
    },
    {
      id: "V390-RULESJSON-RTSP-WEBRTC-LONGRUN",
      originalMarker: "long-running RTSP/WebRTC route matching validation",
      disposition: "transferred-to-test-condition",
      inventoryRowDelta: 0,
      reason: "this is duration evidence for existing route/profile matching, not a product feature; AGENTS 7.6.2 keeps it in the conditional 120-minute area when a media-path change or risk signal exists and the user approves execution",
      ownerToReadback: "FindMatchingRuleProfile -> RTSP/WebRTC analysis context -> selectedByRuleId runtime readback -> conditional 120-minute verifier evidence",
      sourceEvidence: [
        "src/ingress/analysis_query.cpp::FindMatchingRuleProfile",
        "scripts/internal/verify_route_profile_matching.sh",
        "AGENTS.md::7.6.2",
      ],
      completionEvidence: "inventory records the conditional 120-minute mapping without claiming unexecuted long-run PASS",
    },
  ];
}

function lineMatches(text, expression) {
  const matches = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    expression.lastIndex = 0;
    for (const match of lines[index].matchAll(expression)) {
      matches.push({ line: index + 1, match: match[0], context: lines[index].trim() });
    }
  }
  return matches;
}

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertStableEqual(actual, expected, message) {
  const withoutGenerated = value => JSON.stringify(value);
  assert(withoutGenerated(actual) === withoutGenerated(expected), message);
}

function readJson(relativePath) {
  const absolute = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolute)) throw new Error(`${relativePath} is missing; run with --write-ledger`);
  return JSON.parse(fs.readFileSync(absolute, "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
