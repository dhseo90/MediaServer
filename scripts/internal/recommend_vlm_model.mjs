#!/usr/bin/env node
// 파일 용도: V200-S03 VLM 추천 엔진. PC 사양과 privacy mode로 추천/대안/비추천 사유만 산출한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM recommendation engine

Usage:
  ./server.sh recommend-vlm-model [options]

Options:
  --pc-capability <path>          media-server.vlm-pc-capability.v1 JSON 입력을 사용합니다.
  --pc-capability-fixture <path>  PC capability fixture bundle을 입력으로 사용합니다.
  --fixture-case <id>             fixture bundle 안의 case ID를 선택합니다.
  --selection-decision <path>     VLM model selection decision JSON. 기본 test/fixtures/vlm_model_catalog/selection_decision.json
  --privacy-mode <mode>           local-only, cloud-disabled, cloud-allowed 중 하나. 기본 local-only
  --json-output <path>            JSON 결과를 저장합니다.
  --report <path>                 Markdown 요약을 저장합니다.
  --timeout-ms <ms>               live detector 또는 fixture detector timeout. 기본 800.
  -h, --help                      도움말 출력

Scope:
  - 사용자 PC 사양과 privacy mode에 따라 추천 모델, 대안 모델, 비추천 사유, 예상 memory/disk/latency/cost를 산출합니다.
  - local 모델은 사용자 준비 runtime을 전제로 하며 자동 설치하지 않습니다.
  - cloud 모델은 explicit opt-in privacy mode에서만 추천합니다.
  - VLM runtime 호출, 설치 UI, profile 저장, sidecar 저장, Event POST/WebRTC/SSE/WS schema 변경은 수행하지 않습니다.
`);
}

assertKnownOptions(rawArgs, [
  "pc-capability",
  "pc-capability-fixture",
  "fixture-case",
  "selection-decision",
  "privacy-mode",
  "json-output",
  "report",
  "timeout-ms",
  "h",
  "help",
]);

const args = parseArgs(rawArgs);
const timeoutMs = positiveInteger(args.timeoutMs, 800);
const selectionDecisionPath = args.selectionDecision || "test/fixtures/vlm_model_catalog/selection_decision.json";
const selectionDecision = readJson(selectionDecisionPath);
const privacyMode = normalizePrivacyMode(args.privacyMode || "local-only");
const capability = loadCapability(args, timeoutMs);

const MODEL_ESTIMATES = {
  "Qwen/Qwen3-VL-4B-Instruct": {
    estimateSource: "planning-estimate-not-benchmark",
    memory: {
      localWorkingSetGb: 10,
      minimumSystemRamGb: 16,
      minimumGpuVramGb: 8,
      minimumAppleUnifiedMemoryGb: 16,
      headroomPolicy: "working set must stay within 70% of available RAM/VRAM",
    },
    disk: {
      modelArtifactGb: 9,
      bundledInRepoOrRelease: false,
    },
    latency: {
      measured: false,
      eventReviewP50Seconds: 6,
      eventReviewP95Seconds: 20,
      target: "single event snapshot/crop review",
    },
    cost: {
      providerApiCost: false,
      costClass: "local-hardware-only",
      note: "No provider API cost; operator supplies local runtime/model outside repo/release.",
    },
  },
  "Qwen/Qwen3-VL-8B-Instruct": {
    estimateSource: "planning-estimate-not-benchmark",
    memory: {
      localWorkingSetGb: 18,
      minimumSystemRamGb: 24,
      minimumGpuVramGb: 12,
      minimumAppleUnifiedMemoryGb: 24,
      headroomPolicy: "working set must stay within 70% of available RAM/VRAM",
    },
    disk: {
      modelArtifactGb: 16,
      bundledInRepoOrRelease: false,
    },
    latency: {
      measured: false,
      eventReviewP50Seconds: 8,
      eventReviewP95Seconds: 25,
      target: "single event snapshot/crop review",
    },
    cost: {
      providerApiCost: false,
      costClass: "local-hardware-only",
      note: "No provider API cost; operator supplies local runtime/model outside repo/release.",
    },
  },
  "Qwen/Qwen3-VL-30B-A3B-Instruct": {
    estimateSource: "planning-estimate-not-benchmark",
    memory: {
      localWorkingSetGb: 46,
      minimumSystemRamGb: 64,
      minimumGpuVramGb: 24,
      minimumAppleUnifiedMemoryGb: 48,
      headroomPolicy: "high tier candidate; must be rechecked by V200-S06 before default promotion",
    },
    disk: {
      modelArtifactGb: 60,
      bundledInRepoOrRelease: false,
    },
    latency: {
      measured: false,
      eventReviewP50Seconds: 12,
      eventReviewP95Seconds: 35,
      target: "single event snapshot/crop review; above default target until evaluated",
    },
    cost: {
      providerApiCost: false,
      costClass: "local-high-hardware",
      note: "No provider API cost; high local hardware and evaluation budget required.",
    },
  },
  "gemini-2.5-flash": {
    estimateSource: "provider-dependent-planning-estimate-not-price-quote",
    memory: {
      localWorkingSetGb: 0,
      minimumSystemRamGb: null,
      minimumGpuVramGb: null,
      minimumAppleUnifiedMemoryGb: null,
      headroomPolicy: "local media pipeline still keeps non-blocking queue headroom",
    },
    disk: {
      modelArtifactGb: 0,
      bundledInRepoOrRelease: false,
    },
    latency: {
      measured: false,
      providerDependent: true,
      eventReviewP50Seconds: null,
      eventReviewP95Seconds: null,
      target: "provider/API/network dependent; V200-S06 must measure before production default",
    },
    cost: {
      providerApiCost: true,
      costClass: "variable-provider-api-cost",
      priceQuoteIncluded: false,
      requiresCurrentProviderPricingReview: true,
      note: "Requires current provider pricing, logging, retention, and external transfer review.",
    },
  },
};

const recommendation = buildRecommendation({
  capability,
  selectionDecision,
  selectionDecisionPath,
  privacyMode,
  inputSource: args.pcCapability ? "pc-capability-json" : args.pcCapabilityFixture ? "pc-capability-fixture" : "live-detector",
});

const jsonText = `${JSON.stringify(recommendation, null, 2)}\n`;
if (args.jsonOutput) writeText(path.resolve(rootDir, args.jsonOutput), jsonText);
if (args.report) writeText(path.resolve(rootDir, args.report), renderMarkdown(recommendation));
process.stdout.write(jsonText);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "-h" || arg === "--help") {
      continue;
    } else if (arg === "--pc-capability") {
      parsed.pcCapability = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--pc-capability=")) {
      parsed.pcCapability = arg.slice("--pc-capability=".length);
    } else if (arg === "--pc-capability-fixture") {
      parsed.pcCapabilityFixture = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--pc-capability-fixture=")) {
      parsed.pcCapabilityFixture = arg.slice("--pc-capability-fixture=".length);
    } else if (arg === "--fixture-case") {
      parsed.fixtureCase = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--fixture-case=")) {
      parsed.fixtureCase = arg.slice("--fixture-case=".length);
    } else if (arg === "--selection-decision") {
      parsed.selectionDecision = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--selection-decision=")) {
      parsed.selectionDecision = arg.slice("--selection-decision=".length);
    } else if (arg === "--privacy-mode") {
      parsed.privacyMode = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--privacy-mode=")) {
      parsed.privacyMode = arg.slice("--privacy-mode=".length);
    } else if (arg === "--json-output") {
      parsed.jsonOutput = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--json-output=")) {
      parsed.jsonOutput = arg.slice("--json-output=".length);
    } else if (arg === "--report") {
      parsed.report = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--report=")) {
      parsed.report = arg.slice("--report=".length);
    } else if (arg === "--timeout-ms") {
      parsed.timeoutMs = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--timeout-ms=")) {
      parsed.timeoutMs = arg.slice("--timeout-ms=".length);
    }
  }
  if (parsed.pcCapability && parsed.pcCapabilityFixture) {
    throw new Error("--pc-capability and --pc-capability-fixture are mutually exclusive");
  }
  if (parsed.pcCapabilityFixture && !parsed.fixtureCase) {
    throw new Error("--pc-capability-fixture requires --fixture-case");
  }
  return parsed;
}

function requireValue(argv, index, option) {
  const value = argv[index];
  if (!value || value.startsWith("-")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

function positiveInteger(raw, fallback) {
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`timeout-ms must be a positive integer: ${raw}`);
  }
  return value;
}

function normalizePrivacyMode(raw) {
  const value = String(raw || "").trim();
  if (["local-only", "cloud-disabled", "cloud-allowed"].includes(value)) return value;
  throw new Error(`unsupported privacy mode: ${raw}`);
}

function loadCapability(parsedArgs, timeoutMs) {
  if (parsedArgs.pcCapability) {
    const capability = readJson(parsedArgs.pcCapability);
    assertCapabilitySchema(capability);
    return capability;
  }
  const detectorArgs = ["--timeout-ms", String(timeoutMs)];
  if (parsedArgs.pcCapabilityFixture) {
    detectorArgs.push("--fixture", parsedArgs.pcCapabilityFixture, "--fixture-case", parsedArgs.fixtureCase);
  }
  const output = execFileSync(process.execPath, [
    path.join(rootDir, "scripts/internal/detect_vlm_pc_capability.mjs"),
    ...detectorArgs,
  ], {
    cwd: rootDir,
    encoding: "utf8",
    timeout: 15000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const capability = JSON.parse(output);
  assertCapabilitySchema(capability);
  return capability;
}

function assertCapabilitySchema(capability) {
  if (capability?.schema !== "media-server.vlm-pc-capability.v1") {
    throw new Error(`pc capability schema mismatch: ${capability?.schema || "<missing>"}`);
  }
  if (!capability.hardwareClassCandidate?.class) {
    throw new Error("pc capability missing hardwareClassCandidate.class");
  }
}

function buildRecommendation(input) {
  const capability = input.capability;
  const decision = input.selectionDecision;
  const hardwareClass = capability.hardwareClassCandidate.class;
  const cloudAllowed = input.privacyMode === "cloud-allowed";
  const localCloudDisabled = input.privacyMode === "local-only" || input.privacyMode === "cloud-disabled";
  const warnings = [...(capability.warnings || [])];
  const notRecommended = [];
  const alternatives = [];

  const qwen4 = findModel(decision, "Qwen/Qwen3-VL-4B-Instruct");
  const qwen8 = findModel(decision, "Qwen/Qwen3-VL-8B-Instruct");
  const qwen30 = findModel(decision, "Qwen/Qwen3-VL-30B-A3B-Instruct");
  const gemini = findModel(decision, "gemini-2.5-flash");

  let primary = null;
  let status = "recommended";
  let decisionReason = "";

  if (hardwareClass === "local-unsupported") {
    notRecommended.push(notRecommendedModel(qwen4, "hardware-below-local-low", "Local low-spec fallback requires Apple Silicon 16GB+ or NVIDIA 8GB+ with 16GB+ RAM."));
    notRecommended.push(notRecommendedModel(qwen8, "hardware-below-local-standard", "Local standard requires Apple Silicon 24GB+ or NVIDIA 12GB+ with 24GB+ RAM."));
    notRecommended.push(notRecommendedModel(qwen30, "hardware-below-local-high", "High local candidate requires Apple Silicon 48GB+ or NVIDIA 24GB+ with 64GB+ RAM."));
    if (cloudAllowed) {
      primary = recommendationItem(gemini, {
        role: "cloud-opt-in-fallback",
        priority: 1,
        reasonCodes: ["local-hardware-unsupported", "cloud-explicitly-allowed"],
        reason: "Local VLM is not recommended on this PC class; explicit cloud opt-in allows Gemini fallback.",
      });
      decisionReason = "cloud fallback selected because local hardware is unsupported and external transfer is allowed";
    } else {
      status = "not-recommended";
      notRecommended.push(notRecommendedModel(gemini, "privacy-mode-disallows-cloud", "Cloud fallback requires explicit external transfer opt-in."));
      decisionReason = localCloudDisabled
        ? "no local VLM recommendation because hardware is unsupported and cloud transfer is disabled"
        : "no VLM recommendation";
    }
  } else if (hardwareClass === "local-low") {
    primary = recommendationItem(qwen4, {
      role: "primary-local-low-spec-fallback",
      priority: 1,
      reasonCodes: ["local-low-hardware-class", "prefer-local-privacy"],
      reason: "Local-low PC class fits the 4B fallback and keeps event evidence local.",
    });
    notRecommended.push(notRecommendedModel(qwen8, "hardware-below-local-standard", "The 8B standard model is reserved for local-standard or higher hardware."));
    notRecommended.push(notRecommendedModel(qwen30, "hardware-below-local-high", "The 30B candidate is high-tier only and requires later evaluation."));
    if (cloudAllowed) {
      alternatives.push(recommendationItem(gemini, {
        role: "cloud-opt-in-alternative",
        priority: 2,
        reasonCodes: ["cloud-explicitly-allowed", "quality-or-latency-fallback"],
        reason: "Cloud fallback may be selected when operator accepts external transfer and provider cost.",
      }));
    } else {
      notRecommended.push(notRecommendedModel(gemini, "privacy-mode-disallows-cloud", "Cloud fallback requires explicit external transfer opt-in."));
    }
    decisionReason = "local low-spec fallback selected";
  } else if (hardwareClass === "local-standard") {
    primary = recommendationItem(qwen8, {
      role: "primary-local-standard",
      priority: 1,
      reasonCodes: ["local-standard-hardware-class", "v200-s01-primary"],
      reason: "Local-standard PC class fits the V200-S01 primary local model.",
    });
    alternatives.push(recommendationItem(qwen4, {
      role: "local-low-latency-alternative",
      priority: 2,
      reasonCodes: ["lower-memory-local-fallback"],
      reason: "Use the 4B local fallback if latency or memory headroom matters more than description quality.",
    }));
    notRecommended.push(notRecommendedModel(qwen30, "hardware-below-local-high", "The 30B candidate is high-tier only and requires later evaluation."));
    if (cloudAllowed) {
      alternatives.push(recommendationItem(gemini, {
        role: "cloud-opt-in-alternative",
        priority: 3,
        reasonCodes: ["cloud-explicitly-allowed", "provider-fallback"],
        reason: "Cloud fallback is available only after external transfer, provider terms, and cost review.",
      }));
    } else {
      notRecommended.push(notRecommendedModel(gemini, "privacy-mode-disallows-cloud", "Cloud fallback requires explicit external transfer opt-in."));
    }
    decisionReason = "local standard model selected";
  } else if (hardwareClass === "local-high") {
    primary = recommendationItem(qwen30, {
      role: "local-high-evaluation-candidate",
      priority: 1,
      reasonCodes: ["local-high-hardware-class", "requires-v200-s06-evaluation-before-default"],
      reason: "High-tier PC class can evaluate the 30B candidate; it is not default-on before V200-S06.",
    });
    primary.defaultAllowedBeforeEvaluation = false;
    alternatives.push(recommendationItem(qwen8, {
      role: "safe-local-standard-fallback",
      priority: 2,
      reasonCodes: ["safe-fallback", "v200-s01-primary"],
      reason: "Use the 8B local standard model when high candidate latency or quality evaluation is not complete.",
    }));
    if (cloudAllowed) {
      alternatives.push(recommendationItem(gemini, {
        role: "cloud-opt-in-alternative",
        priority: 3,
        reasonCodes: ["cloud-explicitly-allowed", "provider-fallback"],
        reason: "Cloud fallback remains opt-in and cost/provider-policy dependent.",
      }));
    } else {
      notRecommended.push(notRecommendedModel(gemini, "privacy-mode-disallows-cloud", "Cloud fallback requires explicit external transfer opt-in."));
    }
    warnings.push("local-high-candidate-requires-v200-s06-evaluation");
    decisionReason = "high local candidate selected as evaluation candidate with 8B safe fallback";
  } else {
    status = "not-recommended";
    decisionReason = `unsupported hardware class candidate: ${hardwareClass}`;
  }

  const gemma = (decision.conditional || []).find(item => item.id === "gemma-family");
  if (gemma) {
    notRecommended.push({
      id: gemma.id,
      model: "Gemma family",
      role: "conditional-user-supplied",
      reasonCode: "license-terms-review-required",
      reason: "Gemma remains conditional because separate terms/license review is required before default or baseline recommendation.",
      licenseReviewRequired: true,
      defaultAllowed: false,
    });
  }

  const localRuntime = localRuntimeReadiness(capability);
  if (primary?.deployment === "local" && localRuntime.status !== "ready") {
    warnings.push(`local-runtime-${localRuntime.status}`);
  }

  return {
    schema: "media-server.vlm-recommendation.v1",
    targetStep: "V200-S03",
    generatedAt: new Date().toISOString(),
    source: input.inputSource,
    scope: "recommendation-engine-only",
    selectionDecision: {
      path: input.selectionDecisionPath,
      schema: decision.schema,
      sourceTargetStep: decision.targetStep,
      status: decision.status,
    },
    nonScope: [
      "install-or-connection-ui",
      "profile-storage",
      "runtime-vlm-call",
      "sidecar-storage",
      "event-post-webrtc-sse-ws-schema-change",
      "auto-multi-model-install",
      "model-or-runtime-bundle-release",
    ],
    privacy: {
      mode: input.privacyMode,
      externalTransferAllowed: cloudAllowed,
      cloudRequiresExplicitOptIn: true,
      sourceUrlOrCredentialIncluded: false,
      rawPromptOrResponseIncluded: false,
    },
    pcCapability: summarizeCapability(capability),
    runtimeReadiness: localRuntime,
    decision: {
      status,
      reason: decisionReason,
      primaryRecommendation: primary,
      alternativeRecommendations: alternatives,
      notRecommended,
    },
    estimates: {
      estimateSource: "planning-estimate-not-benchmark",
      latencyTargets: decision.resourceDecisionPolicy?.latencyTargets || null,
      memoryHeadroomMaxRatio: decision.resourceDecisionPolicy?.memoryHeadroomMaxRatio ?? null,
      reservedGpuVramGb: decision.resourceDecisionPolicy?.reservedGpuVramGb ?? null,
    },
    contractInvariants: {
      eventPostPayloadChanged: false,
      webrtcDataChannelSchemaChanged: false,
      sseMetadataSchemaChanged: false,
      wsMetadataSchemaChanged: false,
      rtspOrWebrtcMediaPathChanged: false,
      viewerClientExposureAdded: false,
    },
    warnings: [...new Set(warnings)].sort(),
  };
}

function recommendationItem(modelDecision, options) {
  return {
    id: modelDecision.id,
    model: modelDecision.model,
    tier: modelDecision.tier,
    role: options.role,
    priority: options.priority,
    deployment: modelDecision.deployment,
    externalTransfer: Boolean(modelDecision.externalTransfer),
    privacyModeRequired: modelDecision.privacyModeRequired || (modelDecision.externalTransfer ? "cloud-allowed-explicit-opt-in" : "local-only-or-cloud-disabled"),
    bundleAllowed: modelDecision.bundleAllowed === true,
    autoInstallAllowed: modelDecision.autoInstallAllowed === true,
    runtimeCallPerformed: false,
    reasonCodes: options.reasonCodes,
    reason: options.reason,
    resourceEstimate: estimateFor(modelDecision.model),
  };
}

function notRecommendedModel(modelDecision, reasonCode, reason) {
  return {
    id: modelDecision.id,
    model: modelDecision.model,
    tier: modelDecision.tier,
    deployment: modelDecision.deployment,
    reasonCode,
    reason,
    externalTransfer: Boolean(modelDecision.externalTransfer),
    bundleAllowed: modelDecision.bundleAllowed === true,
    autoInstallAllowed: modelDecision.autoInstallAllowed === true,
    resourceEstimate: estimateFor(modelDecision.model),
  };
}

function findModel(decision, modelName) {
  const lists = [
    [decision.primary].filter(Boolean),
    decision.fallbacks || [],
    decision.highCandidates || [],
    decision.conditional || [],
  ];
  for (const list of lists) {
    const found = list.find(item => item.model === modelName || item.family === modelName);
    if (found) return found;
  }
  throw new Error(`selection decision missing model: ${modelName}`);
}

function estimateFor(model) {
  const estimate = MODEL_ESTIMATES[model];
  if (!estimate) throw new Error(`missing estimate for model: ${model}`);
  return JSON.parse(JSON.stringify(estimate));
}

function localRuntimeReadiness(capability) {
  const ollamaApi = capability.runtimes?.ollama?.loopbackApi?.status;
  const vllmApi = capability.runtimes?.vllm?.loopbackApi?.status;
  const ollamaCli = capability.runtimes?.ollama?.cli;
  const vllmModule = capability.runtimes?.vllm?.pythonModule;
  const reachable = ollamaApi === "reachable" || vllmApi === "reachable";
  const toolPresent = Boolean(ollamaCli?.available || vllmModule?.available);
  return {
    status: reachable ? "ready" : toolPresent ? "tool-present-endpoint-not-ready" : "missing",
    ollamaLoopbackApi: ollamaApi || "unknown",
    vllmLoopbackApi: vllmApi || "unknown",
    ollamaCliAvailable: Boolean(ollamaCli?.available),
    vllmModuleAvailable: Boolean(vllmModule?.available),
    runtimeInstallPerformed: false,
    runtimeCallPerformed: false,
  };
}

function summarizeCapability(capability) {
  return {
    schema: capability.schema,
    source: capability.source,
    fixtureCase: capability.fixtureCase,
    osFamily: capability.os?.family || "",
    platform: capability.os?.platform || "",
    arch: capability.os?.arch || "",
    systemRamGb: capability.memory?.systemRamGb ?? null,
    appleSilicon: Boolean(capability.apple?.appleSilicon),
    unifiedMemoryGb: capability.apple?.unifiedMemoryGb ?? null,
    maxGpuVramGb: capability.gpu?.maxVramGb ?? null,
    nvidiaRuntimeVerified: Boolean(capability.gpu?.nvidiaRuntimeVerified),
    hardwareClassCandidate: capability.hardwareClassCandidate,
    warnings: capability.warnings || [],
    unknowns: capability.unknowns || [],
  };
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.resolve(rootDir, relativePath), "utf8");
}

function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function renderMarkdown(value) {
  const lines = [
    "# VLM Recommendation Report",
    "",
    `- schema: \`${value.schema}\``,
    `- targetStep: \`${value.targetStep}\``,
    `- generatedAt: \`${value.generatedAt}\``,
    `- privacyMode: \`${value.privacy.mode}\``,
    `- hardwareClass: \`${value.pcCapability.hardwareClassCandidate.class}\``,
    `- status: \`${value.decision.status}\``,
    `- reason: ${value.decision.reason}`,
    "",
    "## Primary",
    "",
  ];
  if (value.decision.primaryRecommendation) {
    const item = value.decision.primaryRecommendation;
    lines.push(`- model: \`${item.model}\``);
    lines.push(`- role: \`${item.role}\``);
    lines.push(`- deployment: \`${item.deployment}\``);
    lines.push(`- reason: ${item.reason}`);
  } else {
    lines.push("- none");
  }
  lines.push("", "## Alternatives", "");
  if (value.decision.alternativeRecommendations.length === 0) {
    lines.push("- none");
  } else {
    for (const item of value.decision.alternativeRecommendations) {
      lines.push(`- \`${item.model}\`: ${item.reason}`);
    }
  }
  lines.push("", "## Not Recommended", "");
  for (const item of value.decision.notRecommended) {
    lines.push(`- \`${item.model}\`: ${item.reasonCode} - ${item.reason}`);
  }
  lines.push("", "## Warnings", "");
  if (value.warnings.length === 0) {
    lines.push("- none");
  } else {
    for (const item of value.warnings) lines.push(`- \`${item}\``);
  }
  return `${lines.join("\n")}\n`;
}
