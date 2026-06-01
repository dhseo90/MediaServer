#!/usr/bin/env node
// 파일 용도: V200-S06 VLM 평가 harness. Fixture output을 latency/품질/JSON/언어 기준으로 비교한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM evaluation harness

Usage:
  ./server.sh evaluate-vlm-harness [options]

Options:
  --fixture <path>       Fixture bundle. 기본 test/fixtures/vlm_evaluation_harness/cases.json
  --case <id>            특정 fixture case만 평가합니다.
  --json-output <path>   JSON report를 저장합니다.
  --report <path>        Markdown report를 저장합니다.
  -h, --help             도움말 출력

Scope:
  - sample event frame, bbox crop, previous/next frame reference와 captured structured output fixture를 평가합니다.
  - 실제 VLM runtime 호출, cloud provider API 호출, model download, sidecar 저장, Event/WebRTC/SSE/WS schema 변경은 수행하지 않습니다.
`);
}

assertKnownOptions(rawArgs, ["fixture", "case", "json-output", "report", "h", "help"]);

const args = parseArgs(rawArgs);
const fixturePath = args.fixture || "test/fixtures/vlm_evaluation_harness/cases.json";
const fixture = readJson(fixturePath);
assertFixture(fixture);
const cases = args.case ? fixture.cases.filter(item => item.id === args.case) : fixture.cases;
if (args.case && cases.length === 0) throw new Error(`fixture case not found: ${args.case}`);

const evaluatedCases = cases.map(evaluateCase);
const report = {
  schema: "media-server.vlm-evaluation-report.v1",
  targetStep: "V200-S06",
  source: {
    fixture: fixturePath,
    fixtureSchema: fixture.schema,
    caseFilter: args.case || null,
  },
  status: evaluatedCases.some(item => item.summary.blockingFailures > 0) ? "review-required" : "passed",
  summary: summarize(evaluatedCases),
  cases: evaluatedCases,
  contractInvariants: {
    runtimeMode: "fixture-captured-output-only",
    runtimeVlmCallPerformed: false,
    cloudProviderApiCalled: false,
    modelArtifactDownloaded: false,
    sidecarStored: false,
    eventPostPayloadChanged: false,
    webrtcDataChannelSchemaChanged: false,
    sseMetadataSchemaChanged: false,
    wsMetadataSchemaChanged: false,
    rtspOrWebrtcMediaPathChanged: false,
    viewerClientExposureAdded: false,
  },
};

const json = `${JSON.stringify(report, null, 2)}\n`;
if (args.jsonOutput) writeText(path.resolve(rootDir, args.jsonOutput), json);
if (args.report) writeText(path.resolve(rootDir, args.report), renderMarkdown(report));
process.stdout.write(json);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "-h" || arg === "--help") {
      continue;
    } else if (arg === "--fixture") {
      parsed.fixture = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--fixture=")) {
      parsed.fixture = arg.slice("--fixture=".length);
    } else if (arg === "--case") {
      parsed.case = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--case=")) {
      parsed.case = arg.slice("--case=".length);
    } else if (arg === "--json-output") {
      parsed.jsonOutput = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--json-output=")) {
      parsed.jsonOutput = arg.slice("--json-output=".length);
    } else if (arg === "--report") {
      parsed.report = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--report=")) {
      parsed.report = arg.slice("--report=".length);
    }
  }
  return parsed;
}

function requireValue(argv, index, option) {
  const value = argv[index];
  if (!value || value.startsWith("-")) throw new Error(`${option} requires a value`);
  return value;
}

function assertFixture(value) {
  if (!value || value.schema !== "media-server.vlm-evaluation-fixtures.v1") {
    throw new Error("fixture must use media-server.vlm-evaluation-fixtures.v1");
  }
  if (value.targetStep !== "V200-S06") throw new Error("fixture targetStep must be V200-S06");
  if (!Array.isArray(value.cases) || value.cases.length === 0) throw new Error("fixture cases are required");
}

function evaluateCase(item) {
  assertEvidenceRefs(item);
  const candidates = (item.candidates || []).map(candidate => evaluateCandidate(item, candidate));
  const best = [...candidates].sort((a, b) => b.score.total - a.score.total)[0] || null;
  return {
    id: item.id,
    eventType: item.event?.eventType || "unknown",
    evidenceRefs: item.evidenceRefs,
    thresholds: item.thresholds,
    promptProfilesCompared: [...new Set(candidates.map(candidate => candidate.promptProfile.id))],
    candidates,
    bestCandidateId: best?.id || null,
    summary: {
      candidateCount: candidates.length,
      passed: candidates.filter(candidate => candidate.status === "passed").length,
      failed: candidates.filter(candidate => candidate.status === "failed").length,
      reviewRequired: candidates.filter(candidate => candidate.status === "review-required").length,
      blockingFailures: candidates.filter(candidate => candidate.expectedStatus !== candidate.status).length,
    },
  };
}

function assertEvidenceRefs(item) {
  const refs = item.evidenceRefs || {};
  for (const key of ["eventFrame", "bboxCrop", "previousFrame", "nextFrame"]) {
    if (!refs[key] || typeof refs[key] !== "string") {
      throw new Error(`${item.id}: evidenceRefs.${key} is required`);
    }
  }
  if (!item.event?.eventId || !item.event?.sourceId || !item.event?.ruleId) {
    throw new Error(`${item.id}: event id/source/rule metadata is required`);
  }
  if (!Array.isArray(item.candidates) || item.candidates.length === 0) {
    throw new Error(`${item.id}: candidate outputs are required`);
  }
}

function evaluateCandidate(testCase, candidate) {
  const parsed = parseStructuredOutput(candidate.structuredJsonText);
  const dimensions = {
    latency: evaluateLatency(testCase, candidate),
    jsonStability: evaluateJsonStability(testCase, candidate, parsed),
    explanationQuality: evaluateExplanation(testCase, parsed.value),
    hallucination: evaluateHallucination(testCase, candidate, parsed.value),
    languageQuality: evaluateLanguage(candidate, parsed.value),
  };
  const score = {
    latency: dimensions.latency.pass ? 1 : 0,
    jsonStability: dimensions.jsonStability.pass ? 1 : 0,
    explanationQuality: dimensions.explanationQuality.score,
    hallucination: dimensions.hallucination.pass ? 1 : 0,
    languageQuality: dimensions.languageQuality.pass ? 1 : 0,
  };
  score.total = round2((score.latency * 0.18) +
    (score.jsonStability * 0.24) +
    (score.explanationQuality * 0.24) +
    (score.hallucination * 0.2) +
    (score.languageQuality * 0.14));
  const failedDimensions = Object.entries(dimensions)
    .filter(([, value]) => !value.pass)
    .map(([key]) => key);
  const status = failedDimensions.length === 0 ? "passed" : "failed";
  return {
    id: candidate.id,
    model: candidate.model,
    promptProfile: candidate.promptProfile,
    language: candidate.language,
    latencyMs: candidate.latencyMs,
    status,
    expectedStatus: candidate.expectedStatus || status,
    failedDimensions,
    dimensions,
    score,
  };
}

function parseStructuredOutput(text) {
  try {
    return { ok: true, value: JSON.parse(String(text || "")), error: null };
  } catch (error) {
    return { ok: false, value: null, error: error instanceof Error ? error.message : String(error) };
  }
}

function evaluateLatency(testCase, candidate) {
  const maxMs = Number(testCase.thresholds?.maxLatencyMs || 30000);
  const latencyMs = Number(candidate.latencyMs);
  const pass = Number.isFinite(latencyMs) && latencyMs > 0 && latencyMs <= maxMs;
  return { pass, latencyMs, maxMs };
}

function evaluateJsonStability(testCase, candidate, parsed) {
  if (!parsed.ok) return { pass: false, error: parsed.error, missing: ["parseable-json"] };
  const output = parsed.value;
  const required = ["schema", "eventId", "language", "summary", "evidenceRefs", "objects", "falsePositiveRisk", "operatorQuestions", "confidence"];
  const missing = required.filter(key => output?.[key] === undefined);
  const expectedSchema = testCase.expectedOutputSchema || "media-server.vlm-event-review.v1";
  const schemaMatches = output?.schema === expectedSchema;
  const eventMatches = output?.eventId === testCase.event.eventId;
  const evidenceMatches = ["eventFrame", "bboxCrop"].every(key => output?.evidenceRefs?.includes?.(key));
  const noRawMedia = !JSON.stringify(output).match(/data:image|base64|sourceUrl|credential|apiKey/i);
  return {
    pass: missing.length === 0 && schemaMatches && eventMatches && evidenceMatches && noRawMedia,
    missing,
    schemaMatches,
    eventMatches,
    evidenceMatches,
    noRawMedia,
  };
}

function evaluateExplanation(testCase, output) {
  if (!output) return { pass: false, score: 0, matchedTerms: [], missingTerms: testCase.requiredTerms || [] };
  const text = stringifyOutputText(output).toLowerCase();
  const terms = testCase.requiredTerms || [];
  const matchedTerms = terms.filter(term => text.includes(String(term).toLowerCase()));
  const score = terms.length === 0 ? 1 : round2(matchedTerms.length / terms.length);
  return {
    pass: score >= Number(testCase.thresholds?.minExplanationTermCoverage || 0.75),
    score,
    matchedTerms,
    missingTerms: terms.filter(term => !matchedTerms.includes(term)),
  };
}

function evaluateHallucination(testCase, candidate, output) {
  const text = `${stringifyOutputText(output)} ${(candidate.unsupportedClaims || []).join(" ")}`.toLowerCase();
  const forbidden = testCase.forbiddenClaims || [];
  const hits = forbidden.filter(term => text.includes(String(term).toLowerCase()));
  return {
    pass: hits.length === 0 && (candidate.unsupportedClaims || []).length === 0,
    forbiddenHits: hits,
    unsupportedClaims: candidate.unsupportedClaims || [],
  };
}

function evaluateLanguage(candidate, output) {
  if (!output) return { pass: false, reason: "no structured output" };
  const expected = candidate.language;
  const text = stringifyOutputText(output);
  const hasHangul = /[가-힣]/.test(text);
  const hasAsciiWord = /[A-Za-z]{3,}/.test(text);
  const languageMatches = output.language === expected;
  if (expected === "ko") return { pass: languageMatches && hasHangul, languageMatches, hasHangul };
  if (expected === "en") return { pass: languageMatches && hasAsciiWord && !hasHangul, languageMatches, hasAsciiWord, hasHangul };
  return { pass: false, reason: `unsupported language ${expected}` };
}

function stringifyOutputText(output) {
  if (!output) return "";
  return [
    output.summary,
    output.falsePositiveRisk,
    ...(output.operatorQuestions || []),
    ...(output.objects || []).map(item => item.label || ""),
  ].join(" ");
}

function summarize(cases) {
  const candidates = cases.flatMap(item => item.candidates);
  return {
    cases: cases.length,
    candidates: candidates.length,
    passedCandidates: candidates.filter(item => item.status === "passed").length,
    failedCandidates: candidates.filter(item => item.status === "failed").length,
    promptProfilesCompared: [...new Set(candidates.map(item => item.promptProfile.id))],
    bestCandidateIds: cases.map(item => item.bestCandidateId).filter(Boolean),
  };
}

function renderMarkdown(value) {
  const lines = [
    "# VLM Evaluation Harness Report",
    "",
    `- schema: \`${value.schema}\``,
    `- status: \`${value.status}\``,
    `- fixture: \`${value.source.fixture}\``,
    `- cases: ${value.summary.cases}`,
    `- candidates: ${value.summary.candidates}`,
    "",
    "| case | best | passed | failed |",
    "| --- | --- | ---: | ---: |",
  ];
  for (const item of value.cases) {
    lines.push(`| ${item.id} | ${item.bestCandidateId || ""} | ${item.summary.passed} | ${item.summary.failed} |`);
  }
  lines.push("", "## Contract Invariants", "");
  for (const [key, invariant] of Object.entries(value.contractInvariants)) {
    lines.push(`- ${key}: ${invariant}`);
  }
  return `${lines.join("\n")}\n`;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function readJson(relativePath) {
  return JSON.parse(readText(path.resolve(rootDir, relativePath)));
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
