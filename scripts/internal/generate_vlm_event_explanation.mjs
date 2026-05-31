#!/usr/bin/env node
// 파일 용도: V200-S09 이벤트 설명, 오탐 힌트, 운영자 확인 질문을 fixture 기반으로 생성한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM event explanation fixture generator

Usage:
  ./server.sh generate-vlm-event-explanation [options]

Options:
  --fixture <path>       Fixture bundle. 기본 test/fixtures/vlm_event_explanation/cases.json
  --case <id>            특정 fixture case만 생성합니다.
  --json-output <path>   JSON report를 저장합니다.
  --report <path>        Markdown report를 저장합니다.
  -h, --help             도움말 출력

Scope:
  - 이벤트 발생 이유, 화면 내 객체/영역 관계, 오탐 가능성, 운영자 확인 질문을 fixture로 생성합니다.
  - 실제 VLM runtime 호출, cloud provider API 호출, model download, Event/WebRTC/SSE/WS schema 변경은 수행하지 않습니다.
`);
}

assertKnownOptions(rawArgs, ["fixture", "case", "json-output", "report", "h", "help"]);

const args = parseArgs(rawArgs);
const fixturePath = args.fixture || "test/fixtures/vlm_event_explanation/cases.json";
const fixture = readJson(fixturePath);
assertFixture(fixture);
const cases = args.case ? fixture.cases.filter(item => item.id === args.case) : fixture.cases;
if (args.case && cases.length === 0) throw new Error(`fixture case not found: ${args.case}`);

const generatedCases = cases.map(generateCase);
const report = {
  schema: "media-server.vlm-event-explanation-report.v1",
  targetStep: "V200-S09",
  source: {
    fixture: fixturePath,
    fixtureSchema: fixture.schema,
    caseFilter: args.case || null,
  },
  status: generatedCases.some(item => item.status !== "passed") ? "review-required" : "passed",
  summary: summarize(generatedCases),
  cases: generatedCases,
  jsonStability: {
    stable: true,
    deterministicClock: "1970-01-01T00:00:00Z",
    deterministicLatencyMs: 0,
    inputOrderPreserved: true,
  },
  contractInvariants: defaultContractInvariants(),
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
  if (!value || value.schema !== "media-server.vlm-event-explanation-fixtures.v1") {
    throw new Error("fixture must use media-server.vlm-event-explanation-fixtures.v1");
  }
  if (value.targetStep !== "V200-S09") throw new Error("fixture targetStep must be V200-S09");
  if (!Array.isArray(value.cases) || value.cases.length === 0) throw new Error("fixture cases are required");
}

function generateCase(item) {
  assertCase(item);
  const explanation = buildExplanation(item);
  const validation = validateExplanation(item, explanation);
  return {
    id: item.id,
    eventId: item.event.eventId,
    eventType: item.event.eventType,
    language: item.language,
    status: validation.passed ? "passed" : "review-required",
    explanation,
    validation,
  };
}

function assertCase(item) {
  if (!item.id || !item.language || !item.event?.eventId || !item.event?.eventType) {
    throw new Error("case id, language, eventId, and eventType are required");
  }
  for (const key of ["previousFrame", "eventFrame", "nextFrame", "bboxCrop"]) {
    if (!item.evidenceRefs?.[key]) throw new Error(`${item.id}: evidenceRefs.${key} is required`);
  }
  if (!item.primaryObject?.label) throw new Error(`${item.id}: primaryObject.label is required`);
  if (!Array.isArray(item.relations) || item.relations.length === 0) {
    throw new Error(`${item.id}: object/area relations are required`);
  }
  if (!Array.isArray(item.falsePositiveFactors) || item.falsePositiveFactors.length === 0) {
    throw new Error(`${item.id}: false positive factors are required`);
  }
  if (!Array.isArray(item.operatorReviewQuestions) || item.operatorReviewQuestions.length === 0) {
    throw new Error(`${item.id}: operator review questions are required`);
  }
}

function buildExplanation(item) {
  const relationSummary = item.relations.map(formatRelation).join(item.language === "ko" ? " " : " ");
  const falsePositiveHints = item.falsePositiveFactors.map((factor, index) => ({
    id: `fp-${index + 1}`,
    risk: factor.risk,
    reason: factor.reason,
    evidenceRefs: factor.evidenceRefs || ["eventFrame", "bboxCrop"],
    operatorAction: factor.operatorAction,
  }));
  return {
    schema: "media-server.vlm-event-explanation.v1",
    eventId: item.event.eventId,
    sourceId: item.event.sourceId,
    ruleId: item.event.ruleId,
    scenarioId: item.event.scenarioId || null,
    eventType: item.event.eventType,
    language: item.language,
    summary: makeSummary(item, relationSummary),
    eventExplanation: makeEventExplanation(item, relationSummary),
    objectAreaRelations: item.relations.map((relation, index) => ({
      id: `rel-${index + 1}`,
      subject: relation.subject,
      subjectLabel: relation.subjectLabel,
      target: relation.target,
      targetLabel: relation.targetLabel,
      relation: relation.relation,
      evidenceRefs: relation.evidenceRefs,
      reviewFocus: relation.reviewFocus,
    })),
    falsePositiveHints,
    operatorReviewQuestions: [...item.operatorReviewQuestions],
    uncertainty: {
      level: item.uncertainty?.level || "medium",
      score: Number(item.uncertainty?.score ?? 0.5),
      reason: item.uncertainty?.reason || "fixture uncertainty review required",
    },
    inputEvidenceRefs: item.evidenceRefs,
    provider: "fixture-only",
    model: "deterministic-template-v1",
    promptProfile: {
      id: item.promptProfile?.id || "event-explanation-default",
      version: item.promptProfile?.version || "1",
      language: item.language,
    },
    privacyMode: item.privacyMode || "local-only-fixture",
    latencyMs: 0,
    createdAt: "1970-01-01T00:00:00Z",
    storageScope: "observation-store-compatible",
    redactionReview: defaultRedactionReview(),
    contractInvariants: defaultContractInvariants(),
  };
}

function formatRelation(relation) {
  return `${relation.subjectLabel} ${relation.relation} ${relation.targetLabel}.`;
}

function makeSummary(item, relationSummary) {
  if (item.language === "ko") {
    return `${item.primaryObject.label} 기준 ${item.event.displayName} 이벤트 설명입니다. ${relationSummary}`;
  }
  return `${item.event.displayName} explanation for ${item.primaryObject.label}. ${relationSummary}`;
}

function makeEventExplanation(item, relationSummary) {
  const basis = item.event.triggerReason || item.event.displayName;
  if (item.language === "ko") {
    return `${basis} ${relationSummary} 이 설명은 기존 이벤트 판정을 대체하지 않고 운영자 검토를 돕습니다.`;
  }
  return `${basis} ${relationSummary} This explanation supports operator review and does not replace the existing event decision.`;
}

function validateExplanation(item, explanation) {
  const text = stringifyExplanation(explanation).toLowerCase();
  const expected = item.expected || {};
  const requiredTerms = expected.requiredTerms || [];
  const matchedTerms = requiredTerms.filter(term => text.includes(String(term).toLowerCase()));
  const missingTerms = requiredTerms.filter(term => !matchedTerms.includes(term));
  const relationTargets = new Set(explanation.objectAreaRelations.map(relation => relation.targetLabel));
  const relationSubjects = new Set(explanation.objectAreaRelations.map(relation => relation.subjectLabel));
  const questionCount = explanation.operatorReviewQuestions.length;
  const hintCount = explanation.falsePositiveHints.length;
  const evidenceComplete = ["previousFrame", "eventFrame", "nextFrame", "bboxCrop"]
    .every(key => typeof explanation.inputEvidenceRefs[key] === "string");
  const redactionClean = Object.values(explanation.redactionReview).every(value => value === false);
  const invariantsClean = Object.values(explanation.contractInvariants).every(value => value === false);
  const passed = missingTerms.length === 0 &&
    relationTargets.size > 0 &&
    relationSubjects.has(item.primaryObject.label) &&
    questionCount >= Number(expected.minOperatorQuestions || 1) &&
    hintCount >= Number(expected.minFalsePositiveHints || 1) &&
    evidenceComplete &&
    redactionClean &&
    invariantsClean;
  return {
    passed,
    matchedTerms,
    missingTerms,
    relationTargets: [...relationTargets],
    relationSubjects: [...relationSubjects],
    questionCount,
    hintCount,
    evidenceComplete,
    redactionClean,
    invariantsClean,
  };
}

function summarize(items) {
  return {
    cases: items.length,
    passed: items.filter(item => item.status === "passed").length,
    reviewRequired: items.filter(item => item.status !== "passed").length,
    languages: [...new Set(items.map(item => item.language))],
    eventTypes: [...new Set(items.map(item => item.eventType))],
  };
}

function defaultRedactionReview() {
  return {
    rawPromptStored: false,
    rawProviderResponseStored: false,
    credentialMaterialStored: false,
    sourceUrlStored: false,
    rawFrameBytesStored: false,
  };
}

function defaultContractInvariants() {
  return {
    runtimeVlmCallPerformed: false,
    cloudProviderApiCalled: false,
    modelArtifactDownloaded: false,
    eventPostPayloadChanged: false,
    webrtcDataChannelSchemaChanged: false,
    sseMetadataSchemaChanged: false,
    wsMetadataSchemaChanged: false,
    rtspOrWebrtcMediaPathChanged: false,
    viewerClientExposureAdded: false,
    autoRuleApplied: false,
  };
}

function stringifyExplanation(value) {
  return [
    value.summary,
    value.eventExplanation,
    ...value.objectAreaRelations.flatMap(item => [item.subjectLabel, item.targetLabel, item.relation, item.reviewFocus]),
    ...value.falsePositiveHints.flatMap(item => [item.risk, item.reason, item.operatorAction]),
    ...value.operatorReviewQuestions,
  ].join(" ");
}

function renderMarkdown(value) {
  const lines = [
    "# VLM Event Explanation Report",
    "",
    `- schema: \`${value.schema}\``,
    `- status: \`${value.status}\``,
    `- fixture: \`${value.source.fixture}\``,
    `- cases: ${value.summary.cases}`,
    "",
    "| case | event | language | status | hints | questions |",
    "| --- | --- | --- | --- | ---: | ---: |",
  ];
  for (const item of value.cases) {
    lines.push(`| ${item.id} | ${item.eventType} | ${item.language} | ${item.status} | ${item.validation.hintCount} | ${item.validation.questionCount} |`);
  }
  lines.push("", "## JSON Stability", "");
  for (const [key, stable] of Object.entries(value.jsonStability)) {
    lines.push(`- ${key}: ${stable}`);
  }
  lines.push("", "## Contract Invariants", "");
  for (const [key, invariant] of Object.entries(value.contractInvariants)) {
    lines.push(`- ${key}: ${invariant}`);
  }
  return `${lines.join("\n")}\n`;
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
