#!/usr/bin/env node
// 파일 용도: V200-S04 VLM 설치/연결 dry-run contract를 생성한다. 실제 설치, 저장, 호출은 수행하지 않는다.

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
  printUsageAndExit(`VLM install/connection dry-run contract

Usage:
  ./server.sh vlm-install-connection-dry-run [options]

Options:
  --recommendation <path>         media-server.vlm-recommendation.v1 JSON 입력을 사용합니다.
  --pc-capability <path>          recommendation 입력 대신 PC capability JSON으로 추천을 먼저 생성합니다.
  --pc-capability-fixture <path>  PC capability fixture bundle을 입력으로 사용합니다.
  --fixture-case <id>             fixture bundle 안의 case ID를 선택합니다.
  --privacy-mode <mode>           local-only, cloud-disabled, cloud-allowed 중 하나. 기본 local-only
  --cloud-opt-in <state>          acknowledged 또는 not-acknowledged. 기본 not-acknowledged
  --json-output <path>            JSON 결과를 저장합니다.
  --report <path>                 Markdown 요약을 저장합니다.
  --timeout-ms <ms>               live detector 또는 fixture detector timeout. 기본 800.
  -h, --help                      도움말 출력

Scope:
  - 추천 결과를 설치/연결 UI 후보로 바꾸는 dry-run JSON만 생성합니다.
  - 모델/runtime 설치, cloud/provider API 연결, credential 저장, profile 저장, VLM 호출, sidecar 저장은 수행하지 않습니다.
`);
}

assertKnownOptions(rawArgs, [
  "recommendation",
  "pc-capability",
  "pc-capability-fixture",
  "fixture-case",
  "privacy-mode",
  "cloud-opt-in",
  "json-output",
  "report",
  "timeout-ms",
  "h",
  "help",
]);

const args = parseArgs(rawArgs);
const cloudOptIn = normalizeCloudOptIn(args.cloudOptIn || "not-acknowledged");
const recommendation = loadRecommendation(args);
const dryRun = buildDryRunContract(recommendation, cloudOptIn);
const jsonText = `${JSON.stringify(dryRun, null, 2)}\n`;

if (args.jsonOutput) writeText(path.resolve(rootDir, args.jsonOutput), jsonText);
if (args.report) writeText(path.resolve(rootDir, args.report), renderMarkdown(dryRun));
process.stdout.write(jsonText);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "-h" || arg === "--help") {
      continue;
    } else if (arg === "--recommendation") {
      parsed.recommendation = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--recommendation=")) {
      parsed.recommendation = arg.slice("--recommendation=".length);
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
    } else if (arg === "--privacy-mode") {
      parsed.privacyMode = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--privacy-mode=")) {
      parsed.privacyMode = arg.slice("--privacy-mode=".length);
    } else if (arg === "--cloud-opt-in") {
      parsed.cloudOptIn = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--cloud-opt-in=")) {
      parsed.cloudOptIn = arg.slice("--cloud-opt-in=".length);
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
  const recommendationInputs = [parsed.recommendation, parsed.pcCapability, parsed.pcCapabilityFixture].filter(Boolean);
  if (recommendationInputs.length > 1) {
    throw new Error("--recommendation, --pc-capability, and --pc-capability-fixture are mutually exclusive");
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

function normalizeCloudOptIn(raw) {
  const value = String(raw || "").trim();
  if (value === "acknowledged" || value === "not-acknowledged") return value;
  throw new Error(`unsupported cloud opt-in state: ${raw}`);
}

function loadRecommendation(parsedArgs) {
  if (parsedArgs.recommendation) {
    const loaded = readJson(parsedArgs.recommendation);
    assertRecommendationSchema(loaded);
    return loaded;
  }
  const commandArgs = [];
  if (parsedArgs.pcCapability) {
    commandArgs.push("--pc-capability", parsedArgs.pcCapability);
  } else if (parsedArgs.pcCapabilityFixture) {
    commandArgs.push("--pc-capability-fixture", parsedArgs.pcCapabilityFixture, "--fixture-case", parsedArgs.fixtureCase);
  }
  commandArgs.push("--privacy-mode", parsedArgs.privacyMode || "local-only");
  commandArgs.push("--timeout-ms", String(positiveInteger(parsedArgs.timeoutMs, 800)));
  const output = execFileSync(process.execPath, [path.join(rootDir, "scripts/internal/recommend_vlm_model.mjs"), ...commandArgs], {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  const parsed = JSON.parse(output);
  assertRecommendationSchema(parsed);
  return parsed;
}

function positiveInteger(raw, fallback) {
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`timeout-ms must be a positive integer: ${raw}`);
  }
  return value;
}

function assertRecommendationSchema(value) {
  if (!value || value.schema !== "media-server.vlm-recommendation.v1") {
    throw new Error("recommendation input must use media-server.vlm-recommendation.v1");
  }
}

function buildDryRunContract(recommendation, cloudOptInState) {
  const optionInputs = [
    { source: "primary", item: recommendation.decision?.primaryRecommendation || null },
    ...(recommendation.decision?.alternativeRecommendations || []).map(item => ({ source: "alternative", item })),
  ].filter(entry => entry.item);
  const options = optionInputs.map((entry, index) => buildOption(entry.item, entry.source, index + 1, recommendation, cloudOptInState));
  const disabledOptions = (recommendation.decision?.notRecommended || []).map((entry, index) => ({
    id: `not-recommended-${entry.id || index + 1}`,
    model: entry.model || null,
    deployment: entry.deployment || "unknown",
    selectable: false,
    disabledReason: entry.reasonCode || "not-recommended",
    reason: entry.reason || "",
    licenseReviewRequired: entry.licenseReviewRequired === true,
    defaultAllowed: entry.defaultAllowed === true,
    execution: noSideEffects(),
  }));
  const selectableOptions = options.filter(option => option.selectable);
  const status = selectableOptions.length > 0 ? "ready-for-user-selection" : "no-selectable-option";
  return {
    schema: "media-server.vlm-install-connection-dry-run.v1",
    targetStep: "V200-S04",
    generatedAt: new Date().toISOString(),
    scope: "install-connection-dry-run-contract-only",
    sourceRecommendation: {
      schema: recommendation.schema,
      targetStep: recommendation.targetStep,
      source: recommendation.source,
      decisionStatus: recommendation.decision?.status || "unknown",
    },
    pcCapability: {
      osFamily: recommendation.pcCapability?.osFamily || null,
      platform: recommendation.pcCapability?.platform || null,
      hardwareClass: recommendation.pcCapability?.hardwareClassCandidate?.class || "unknown",
      runtimeReadiness: recommendation.runtimeReadiness?.status || "unknown",
    },
    privacy: {
      mode: recommendation.privacy?.mode || "unknown",
      externalTransferAllowed: recommendation.privacy?.externalTransferAllowed === true,
      cloudRequiresExplicitOptIn: true,
      cloudOptInState,
      sourceLocatorOrCredentialIncluded: false,
      promptOrResponseIncluded: false,
      providerCredentialEchoed: false,
    },
    decision: {
      status,
      singleSelectionRequired: true,
      automaticMultiInstallAllowed: false,
      selectableOptionIds: selectableOptions.map(option => option.id),
      blockedReason: selectableOptions.length > 0 ? "" : blockedReason(options, recommendation),
    },
    options,
    disabledOptions,
    warnings: buildWarnings(options, recommendation),
    nonScope: [
      "profile-storage",
      "runtime-vlm-call",
      "sidecar-storage",
      "cloud-provider-api-call",
      "credential-storage",
      "event-post-webrtc-sse-ws-schema-change",
      "rtsp-webrtc-media-path-change",
      "viewer-client-exposure",
      "model-or-runtime-bundle-release",
    ],
    contractInvariants: {
      installPerformed: false,
      connectionPerformed: false,
      runtimeVlmCallPerformed: false,
      profileStored: false,
      sidecarStored: false,
      cloudProviderApiCalled: false,
      credentialsStored: false,
      modelArtifactDownloaded: false,
      modelArtifactBundled: false,
      eventPostPayloadChanged: false,
      webrtcDataChannelSchemaChanged: false,
      sseMetadataSchemaChanged: false,
      wsMetadataSchemaChanged: false,
      rtspOrWebrtcMediaPathChanged: false,
      viewerClientExposureAdded: false,
    },
  };
}

function buildOption(item, source, priority, recommendation, cloudOptInState) {
  const deployment = item.deployment || (item.externalTransfer ? "cloud" : "local");
  const isCloud = deployment === "cloud" || item.externalTransfer === true;
  const requiresRuntimeSetup = !isCloud && recommendation.runtimeReadiness?.status !== "ready";
  const cloudPolicyAllowed = recommendation.privacy?.externalTransferAllowed === true && recommendation.privacy?.mode === "cloud-allowed";
  const cloudOptInSatisfied = cloudOptInState === "acknowledged";
  const disabledReasons = [];
  if (isCloud && !cloudPolicyAllowed) disabledReasons.push("cloud-privacy-mode-not-allowed");
  if (isCloud && !cloudOptInSatisfied) disabledReasons.push("cloud-explicit-opt-in-required");
  const selectable = disabledReasons.length === 0;
  return {
    id: `${source}-${item.id}`,
    source,
    actionType: isCloud ? "cloud-api-connection-dry-run" : "local-model-install-dry-run",
    provider: isCloud ? "cloud-provider-api" : "user-supplied-local-runtime",
    model: item.model,
    tier: item.tier || "",
    role: item.role || "",
    priority,
    deployment,
    selectable,
    disabledReasons,
    externalTransfer: isCloud,
    requiresCloudOptIn: isCloud,
    cloudOptInSatisfied: isCloud ? cloudOptInSatisfied : null,
    requiresRuntimeSetup,
    automaticInstallAllowed: false,
    automaticMultiInstallAllowed: false,
    bundleAllowed: false,
    installCommandsIncluded: false,
    modelArtifactReferenceIncluded: false,
    credentialAcceptedByDryRun: false,
    impact: {
      resourceEstimate: item.resourceEstimate || null,
      localRuntimeReadiness: recommendation.runtimeReadiness || null,
      installImpactSummary: installImpactSummary(item, isCloud, requiresRuntimeSetup),
      privacyImpactSummary: isCloud
        ? "External transfer warning and explicit opt-in are required before any provider connection."
        : "Local option keeps event evidence on operator-supplied runtime; no provider transfer in dry-run.",
    },
    execution: noSideEffects(),
    nextStepBoundary: "S04 Ops UI may display/select this option; S05 profile storage and later runtime calls remain separate.",
  };
}

function installImpactSummary(item, isCloud, requiresRuntimeSetup) {
  if (isCloud) {
    return "No local model artifact is installed in dry-run; provider cost/terms/logging review remains required.";
  }
  const diskGb = item.resourceEstimate?.disk?.modelArtifactGb;
  const workingSetGb = item.resourceEstimate?.memory?.localWorkingSetGb;
  const parts = [];
  if (diskGb !== undefined) parts.push(`model artifact planning size ${diskGb}GB`);
  if (workingSetGb !== undefined) parts.push(`local working set planning size ${workingSetGb}GB`);
  if (requiresRuntimeSetup) parts.push("local runtime setup is still required");
  return parts.length > 0 ? parts.join("; ") : "local runtime/model remains operator-supplied outside repo/release";
}

function noSideEffects() {
  return {
    dryRunOnly: true,
    installPerformed: false,
    connectionPerformed: false,
    runtimeCallPerformed: false,
    profileStored: false,
    sidecarStored: false,
    cloudProviderApiCalled: false,
    credentialsStored: false,
    modelArtifactDownloaded: false,
  };
}

function blockedReason(options, recommendation) {
  if ((recommendation.decision?.status || "") === "not-recommended") {
    return "recommendation-engine-returned-no-supported-option";
  }
  if (options.some(option => option.disabledReasons.includes("cloud-explicit-opt-in-required"))) {
    return "cloud-explicit-opt-in-required";
  }
  return "no-selectable-dry-run-option";
}

function buildWarnings(options, recommendation) {
  const warnings = [...(recommendation.warnings || [])];
  if (options.some(option => option.requiresRuntimeSetup)) warnings.push("local-runtime-setup-required-before-activation");
  if (options.some(option => option.requiresCloudOptIn && !option.cloudOptInSatisfied)) warnings.push("cloud-explicit-opt-in-required");
  warnings.push("dry-run-only-no-install-connection-profile-runtime-sidecar");
  return [...new Set(warnings)];
}

function renderMarkdown(dryRun) {
  const lines = [
    "# VLM Install/Connection Dry-run",
    "",
    `- schema: ${dryRun.schema}`,
    `- targetStep: ${dryRun.targetStep}`,
    `- status: ${dryRun.decision.status}`,
    `- hardwareClass: ${dryRun.pcCapability.hardwareClass}`,
    `- privacyMode: ${dryRun.privacy.mode}`,
    `- cloudOptIn: ${dryRun.privacy.cloudOptInState}`,
    "",
    "| option | action | model | selectable | disabled reasons |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const option of dryRun.options) {
    lines.push(`| ${option.id} | ${option.actionType} | ${option.model} | ${option.selectable ? "yes" : "no"} | ${option.disabledReasons.join(", ")} |`);
  }
  return `${lines.join("\n")}\n`;
}

function readJson(relativePath) {
  return JSON.parse(readText(path.resolve(rootDir, relativePath)));
}

function readText(resolvedPath) {
  return fs.readFileSync(resolvedPath, "utf8");
}

function writeText(outputPath, content) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content);
}
