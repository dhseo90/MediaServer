#!/usr/bin/env node
// 파일 용도: Re-ID/advanced tracking 실험 범위의 default-off, privacy, benchmark gate를 정적 검증한다.
// 동작 요약: Re-ID hook이 외부 metadata/schema에 embedding/crop/model path를 노출하지 않고 close-object benchmark 경계가 유지되는지 점검한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Re-ID / advanced tracking experiment verification

Usage:
  ./server.sh verify-reid-advanced-tracking [options]

Options:
  --report <path>       Markdown 리포트를 저장합니다.
  --json-report <path>  JSON 리포트를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - Re-ID appearance hook과 close-object guard 기본값이 default-off인지 확인
  - appearance worker가 bounded async/rate-limit/stale-drop 정책을 유지하는지 확인
  - WebRTC/SSE/WS/Event/debug JSON serializer가 embedding/crop/model path를 노출하지 않는지 확인
  - close-object benchmark 명령과 fixture matrix가 유지되는지 확인
  - docs/backlog가 default-on, 대형 tracker, media pipeline blocking을 별도 review로 고정하는지 확인
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const reportPath = args.report ? path.resolve(rootDir, args.report) : "";
const jsonReportPath = args.jsonReport ? path.resolve(rootDir, args.jsonReport) : "";
const checks = [];
const report = {
  schema: "media-server.reid-advanced-tracking-experiment-report.v1",
  generatedAt: new Date().toISOString(),
  status: "pass",
  checks: [],
};

check("default-off Re-ID and close-object guard settings are pinned", () => {
  const stdafx = readText("include/stdafx.h");
  assert(stdafx.includes('kDefaultAnalysisAppearanceEnabled = false'), "Re-ID appearance hook must stay default disabled");
  assert(stdafx.includes('kDefaultAnalysisAppearanceExtractor = "noop"'), "default appearance extractor must stay noop");
  assert(stdafx.includes('kDefaultAnalysisAppearanceModelPath = ""'), "default Re-ID model path must stay empty");
  assert(stdafx.includes('kDefaultAnalysisTrackingCloseObjectGuardMode = "off"'), "close-object guard must stay default off");
  return {
    appearanceDefault: "disabled",
    extractorDefault: "noop",
    closeObjectGuardDefault: "off",
  };
});

check("appearance execution stays bounded and off the media hot path", () => {
  const manager = readText("src/analysis/track_state_manager.cpp");
  const extractor = readText("src/analysis/appearance_extractor.cpp");
  for (const snippet of [
    "appearance_worker_ = std::thread",
    "max_queue_size",
    "global_max_queue_size",
    "per_stream_rate_limit_ms",
    "max_job_age_ms",
    'RecordAppearanceDrop("stale")',
    'RecordAppearanceDrop("rate-limited")',
    'RecordAppearanceDrop("global-queue-full")',
  ]) {
    assert(manager.includes(snippet), `TrackStateManager missing bounded worker snippet: ${snippet}`);
  }
  assert(extractor.includes("std::try_to_lock"), "ONNX Re-ID extractor must avoid blocking on concurrent inference");
  assert(extractor.includes("falling back to NoOp"), "ONNX Re-ID extractor must keep NoOp fallback paths");
  return {
    worker: "async bounded",
    concurrency: "try_to_lock",
    fallback: "noop",
  };
});

check("external metadata serializers do not expose appearance identity material", () => {
  const files = [
    "src/analysis/va_runtime_metadata.cpp",
    "src/analysis/event_rule_engine.cpp",
    "src/ingress/webrtc_http_server.cpp",
  ];
  const forbiddenJsonFields = [
    "embedding",
    "embeddingQuality",
    "appearanceProfile",
    "appearance_profile",
    "cropRgb",
    "crop_rgb",
    "upperColor",
    "lowerColor",
    "gender",
    "hat",
    "glasses",
    "modelPath",
    "model_path",
  ];
  const hits = [];
  for (const file of files) {
    const text = readText(file);
    for (const field of forbiddenJsonFields) {
      if (text.includes(`"${field}"`) || text.includes(`\\"${field}\\"`)) {
        hits.push(`${file}: ${field}`);
      }
    }
  }
  assert(hits.length === 0, `forbidden appearance JSON field(s):\n${hits.join("\n")}`);
  const runtimeHeader = readText("include/analysis/va_runtime_metadata.h");
  assert(!runtimeHeader.includes("AppearanceProfile"), "runtime metadata contract must not carry AppearanceProfile");
  return {
    checkedFiles: files,
    forbiddenFieldCount: forbiddenJsonFields.length,
  };
});

check("appearance diagnostics expose aggregate status only", () => {
  const server = readText("src/ingress/webrtc_http_server.cpp");
  assert(hasJsonFieldLiteral(server, "appearanceProfiles"), "runtime status should keep aggregate appearance profile count");
  assert(hasJsonFieldLiteral(server, "appearanceExtractor"), "runtime status should keep aggregate extractor stats");
  assert(!hasJsonFieldLiteral(server, "modelPath") && !hasJsonFieldLiteral(server, "model_path"), "runtime status must not expose Re-ID model path");
  assert(!hasJsonFieldLiteral(server, "embedding") && !hasJsonFieldLiteral(server, "appearanceProfile"), "runtime status must not expose appearance vectors/profiles");
  return {
    allowed: ["appearanceProfiles", "appearanceExtractor"],
    denied: ["modelPath", "embedding", "appearanceProfile"],
  };
});

check("close-object benchmark commands and fixture matrix remain available", () => {
  const server = readText("server.sh");
  const compare = readText("scripts/internal/compare_close_object_tracker.py");
  const trackerStability = readText("scripts/internal/verify_tracker_stability.sh");
  for (const snippet of [
    "compare-close-object-tracker",
    "verify-close-object-fixture-matrix",
    "verify-reid-advanced-tracking",
  ]) {
    assert(server.includes(snippet), `server.sh missing command: ${snippet}`);
  }
  assert(
    server.includes("--fixture-matrix --modes off,diagnostic --fail-on-missing-fixtures --fail-on-hold"),
    "verify-close-object-fixture-matrix must keep enforce out of the default clean gate"
  );
  for (const fixture of [
    "tracking-event",
    "tracking-event-long",
    "tracking-event-slow-long",
    "four-scene-control",
    "field-new-york-driving",
  ]) {
    assert(compare.includes(`"id": "${fixture}"`), `fixture matrix missing ${fixture}`);
  }
  assert(
    /"id": "field-new-york-driving"[\s\S]*"qualityPreset": "field-driving-live"[\s\S]*"maxFragmentation": "6\.0"[\s\S]*"maxOverlapFragmentation": "6\.0"[\s\S]*"maxIdSwitchRisk": "8\.0"/.test(compare),
    "field-new-york-driving fixture must keep vehicle-heavy tracker-stability limits"
  );
  assert(compare.includes('"field-driving-live"'), "fixture matrix must define field-driving-live quality preset");
  for (const snippet of [
    '"riskTolerances": {',
    '"trackerAssociationRiskScore": 0.30',
    '"idSwitchRiskScore": 0.10',
  ]) {
    assert(compare.includes(snippet), `fixture matrix must pin live jitter tolerance: ${snippet}`);
  }
  for (const snippet of [
    "issue_observation_counts = collections.Counter()",
    "issue_keys_by_type = collections.defaultdict(set)",
    "trackingIssueObservationCounts",
    "if not class_allowed(label):",
    "if not class_allowed(diagnostic.get(\"className\")):",
    "if not class_allowed(issue.get(\"className\")):",
  ]) {
    assert(trackerStability.includes(snippet), `tracker stability must class-filter observed counters: ${snippet}`);
  }
  assert(compare.includes("close-object guard default-on is not changed by this report."), "comparison report must state default-on is unchanged");
  for (const snippet of [
    "matrix_default_on_decision",
    '"productDefaultOn": False',
    '"status": status',
    "[matrix-default-on-decision]",
    "[matrix-product-default-on]",
    "fixture matrix contains fail/hold/warning rows; keep close-object guard default off",
    "all fixtures are candidates, but product default-on still requires separate review and field evidence",
    "`matrix-ok` is a command/gate result, not product default-on approval",
    '"candidateCount": decision.get("candidateCount")',
    '"defaultOnDecision": decision.get("status")',
    '"productDefaultOn": decision.get("productDefaultOn")',
    '"defaultOnReason": decision.get("reason")',
    "default-on decision",
    "product default-on",
  ]) {
    assert(compare.includes(snippet), `compare matrix output must separate matrix-ok from product default-on: ${snippet}`);
  }
  return {
    commands: ["compare-close-object-tracker", "verify-close-object-fixture-matrix", "verify-reid-advanced-tracking"],
    fixtureCount: 5,
  };
});

check("docs pin privacy review and separate default-on review boundaries", () => {
  const backlog = readText("docs/development-backlog.md");
  const stream = readText("docs/stream-verification.md");
  const video = readText("docs/video-analysis.md");
  const holdAnalysis = readText("docs/reid-tracking-event-hold-analysis.md");
  const fixtureCandidates = readText("docs/reid-fixture-default-on-candidates.md");
  const researchContinuation = readText("docs/reid-default-off-research-continuation.md");
  const readme = readText("README.md");
  const readmeEn = readText("README.en.md");
  const docsEnReadme = readText("docs/en/README.md");
  for (const snippet of [
    "V120-P2-02 WARNING 판정",
    "V130-P2-02 Re-ID default-off research continuation 종료 판정",
    "verify-reid-advanced-tracking",
    "잔여 이슈를 남깁니다",
    "개발 가능한 후속 이슈는 위 검증 통과 시 남기지",
    "tracking-event=pass",
    "field-new-york-driving=warning",
    "reid-default-off-research-continuation.md",
    "reid-tracking-event-hold-analysis.md",
    "reid-fixture-default-on-candidates.md",
    "verify-close-object-fixture-matrix",
    "defaultOnDecision",
    "productDefaultOn",
    "candidateCount",
    "defaultOnReason",
  ]) {
    assert(backlog.includes(snippet), `backlog missing Re-ID closure snippet: ${snippet}`);
  }
  assert(backlog.includes("종료하지 않고 WARNING(실험 유지)"), "backlog must keep V120-P2-02 in a warning/default-off state");
  assert(!backlog.includes("V120-P2-02 범주 안의 잔여 이슈는 남기지 않습니다"), "backlog must not claim V120-P2-02 has no residual issues");
  for (const snippet of [
    "privacy/default-off gate",
    "verify-reid-advanced-tracking",
    "default-on candidate=False",
    "Matrix gate 상태 정의",
    "`warning`은 안정적이라는 뜻이 아니며",
    "`matrix-ok`는 명령/gate 결과",
    "[matrix-default-on-decision]",
    "[matrix-product-default-on]",
    "fixture별 후보로만 기록",
    "field-driving-live",
    "observed issue counter",
    "--modes off,diagnostic,enforce",
    "trackingIssueObservationCounts",
    "defaultOnDecision",
    "productDefaultOn",
    "candidateCount",
    "defaultOnReason",
    "reid-fixture-default-on-candidates.md",
    "별도 review",
  ]) {
    assert(stream.includes(snippet), `stream verification missing Re-ID gate snippet: ${snippet}`);
  }
  for (const snippet of [
    "embedding/crop/model path",
    "외부 metadata payload에 직렬화하지 않습니다",
    "fixture 전용 tracker-stability 상한",
    "Matrix gate는 다음처럼 해석합니다",
    "안정 판정이 아니며 default-on 근거로 사용 금지",
    "`matrix-ok`는 명령/gate 결과",
    "[matrix-default-on-decision]",
    "[matrix-product-default-on]",
    "해당 fixture 단독 후보일 뿐 제품 default-on 완료 아님",
    "field-driving-live",
    "observed issue/diagnostic",
    "off,diagnostic",
    "trackingIssueObservationCounts",
    "reid-default-off-research-continuation.md",
    "defaultOnDecision",
    "productDefaultOn",
    "candidateCount",
    "defaultOnReason",
    "reid-fixture-default-on-candidates.md",
    "verify-reid-advanced-tracking",
  ]) {
    assert(video.includes(snippet), `video analysis missing privacy snippet: ${snippet}`);
  }
  for (const snippet of [
    "Re-ID Tracking Event Hold Analysis",
    "tracking-event",
    "2026-05-17 KST 재검증",
    "matrix-ok=True",
    "fixture judgement: `pass`",
    "field-new-york-driving=warning",
    "matrix-ok=False",
    "diagnosticVsOff event/scenario signature changed",
    "eventScenarioDelta=true",
    "missedFrameSpikeCount +38",
    "directionChangeSpikeCount +93",
    "enforceVsOff",
    "closeObjectGuardAppliedCount +46",
    "default-on candidate: `False`",
    "keep guard opt-in",
  ]) {
    assert(holdAnalysis.includes(snippet), `hold analysis missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "Re-ID Fixture Default-on Candidates",
    "matrix-ok=True",
    "[matrix-default-on-decision]",
    "[matrix-product-default-on]",
    "tracking-event-slow-long",
    "`pass`",
    "`True`",
    "이 fixture 단독 후보. 제품 default-on 완료 근거 아님",
    "tracking-event-long",
    "단독 fixture 후보",
    "field-new-york-driving",
    "association risk metric increased",
    "field-driving-live",
    "close-object guard 기본값은 계속 `off`",
  ]) {
    assert(fixtureCandidates.includes(snippet), `fixture candidate doc missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "V130-P2-02 Re-ID default-off research continuation",
    "defaultOnDecision",
    "productDefaultOn",
    "candidateCount",
    "defaultOnReason",
    "verify-close-object-fixture-matrix",
    "verify-reid-advanced-tracking",
    "제품 기본 활성화 여부. 이 연구 범위에서는 항상 `False`",
    "Re-ID default-on",
    "대형 tracker 교체",
    "RTSP/WebRTC media path 변경",
    "개발 가능한 후속 이슈는 다음 조건이 모두 통과하면 남기지",
  ]) {
    assert(researchContinuation.includes(snippet), `research continuation doc missing snippet: ${snippet}`);
  }
  for (const [label, text] of [
    ["README.md", readme],
    ["README.en.md", readmeEn],
    ["docs/en/README.md", docsEnReadme],
  ]) {
    assert(text.includes("reid-default-off-research-continuation.md"), `${label} missing Re-ID research doc link`);
  }
  return {
    docs: [
      "docs/development-backlog.md",
      "docs/stream-verification.md",
      "docs/video-analysis.md",
      "docs/reid-tracking-event-hold-analysis.md",
      "docs/reid-fixture-default-on-candidates.md",
      "docs/reid-default-off-research-continuation.md",
    ],
  };
});

let pass = 0;
let fail = 0;
for (const item of checks) {
  try {
    const detail = item.fn() || {};
    pass += 1;
    report.checks.push({ name: item.name, status: "pass", detail });
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    fail += 1;
    const message = error instanceof Error ? error.message : String(error);
    report.checks.push({ name: item.name, status: "fail", message });
    console.log(`[fail] ${item.name}: ${message}`);
  }
}

report.status = fail === 0 ? "pass" : "fail";
console.log("");
console.log("== Re-ID / advanced tracking experiment summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
console.log(`- status: ${report.status}`);

if (reportPath) writeText(reportPath, renderMarkdown(report));
if (jsonReportPath) writeText(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(file) {
  return fs.readFileSync(path.join(rootDir, file), "utf8");
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function renderMarkdown(payload) {
  const lines = [
    "# Re-ID / Advanced Tracking Experiment Report",
    "",
    `- schema: ${payload.schema}`,
    `- generatedAt: ${payload.generatedAt}`,
    `- status: ${payload.status}`,
    "",
    "| 결과 | 점검 | 상세 |",
    "| --- | --- | --- |",
  ];
  for (const item of payload.checks) {
    const detail = item.status === "pass"
      ? JSON.stringify(item.detail || {})
      : item.message;
    lines.push(`| ${item.status.toUpperCase()} | ${escapeCell(item.name)} | ${escapeCell(detail || "")} |`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

function hasJsonFieldLiteral(text, field) {
  return text.includes(`"${field}"`) || text.includes(`\\"${field}\\"`) || text.includes(`\\\"${field}\\\"`);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const [name, inlineValue] = token.slice(2).split("=", 2);
    if (name === "report" || name === "json-report") {
      const value = inlineValue ?? argv[index + 1];
      if (inlineValue === undefined) index += 1;
      parsed[name.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase())] = value;
    }
  }
  return parsed;
}
