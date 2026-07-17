// 파일 용도: REVIEW4-61 longrun duration, iteration, 120분 판정, cleanup raw evidence를 독립 검증한다.

import path from "node:path";
import os from "node:os";

const soakSuffixes = ["va-events", "event-post-schema", "event-post-recovery", "redaction", "runtime-idle"];
const highRiskChangeAreas = new Set([
  "rtsp-webrtc-whep-whip-media-path",
  "source-worker-lifecycle",
  "shared-stream-reuse",
  "runtime-metadata-fanout",
  "cleanup-port-lifecycle",
]);

const longrun120ChangeRules = [
  {
    category: "rtsp-webrtc-whep-whip-media-path",
    featureIds: ["MEDIA-001", "SAFE-212"],
    modules: ["rtsp-webrtc-media-path"],
    matches: file => /^(?:src|include)\//.test(file) && (
      /(?:rtsp|webrtc|whep|whip|media_(?:session|path)|codec)/i.test(file) ||
      /(?:^|[^a-z0-9])ice(?:[^a-z0-9]|$)/i.test(file)
    ),
  },
  {
    category: "source-worker-lifecycle",
    featureIds: ["SRC-001", "SAFE-212"],
    modules: ["source-worker-lifecycle"],
    matches: file => /^(?:src|include)\/.+(?:source_worker|source_session|source_view_application_service)/i.test(file),
  },
  {
    category: "shared-stream-reuse",
    featureIds: ["MEDIA-001", "SAFE-212"],
    modules: ["shared-stream-reuse"],
    matches: file => /^(?:src|include)\/.+(?:shared_stream|stream_reuse|session_manager)/i.test(file),
  },
  {
    category: "runtime-metadata-fanout",
    featureIds: ["MEDIA-001", "OPS-179"],
    modules: ["runtime-metadata-fanout"],
    matches: file => /^(?:src|include)\/.+(?:metadata|side_?channel|server_sent_event|sse|websocket)/i.test(file),
  },
  {
    category: "cleanup-port-lifecycle",
    featureIds: ["OPS-168", "SAFE-201", "SAFE-212"],
    modules: ["predev-server-lifecycle", "longrun-cleanup", "acceptance-cleanup"],
    matches: file => [
      "scripts/internal/verify_predev_stability.sh",
      "scripts/internal/verify_v390_server_longrun.mjs",
      "scripts/internal/verify_v390_test_acceptance_bundle.mjs",
      "scripts/internal/v390_acceptance_ui_environment.mjs",
      "scripts/internal/verify_v390_final_evidence_integrity.mjs",
    ].includes(file) || /^(?:src|include)\/.+(?:cleanup|port_lifecycle)/i.test(file),
  },
];

export function classifyLongrun120ChangedAreas(changedFiles = []) {
  const normalized = [...new Set((Array.isArray(changedFiles) ? changedFiles : [])
    .map(file => String(file || "").replace(/\\/g, "/"))
    .filter(Boolean))];
  return longrun120ChangeRules.flatMap(rule => {
    const files = normalized.filter(rule.matches);
    return files.length === 0 ? [] : [{
      category: rule.category,
      featureIds: [...rule.featureIds],
      files,
      modules: [...rule.modules],
    }];
  });
}

export function buildMonotonicDurationEvidence({
  requestedMinutes,
  fixtureMode,
  runnerStartedNs,
  runnerEndedNs,
  delegated,
}) {
  const started = parseNanoseconds(runnerStartedNs);
  const ended = parseNanoseconds(runnerEndedNs);
  const elapsedNs = ended >= started ? ended - started : 0n;
  const evidence = {
    schema: "media-server.v390-monotonic-duration-evidence.v1",
    clockSource: "process.hrtime.bigint-monotonic",
    fixtureMode: fixtureMode === true,
    requestedMinutes: Number(requestedMinutes),
    requestedSeconds: Number(requestedMinutes) * 60,
    runnerStartedMonotonicNs: String(runnerStartedNs),
    runnerEndedMonotonicNs: String(runnerEndedNs),
    runnerElapsedNs: elapsedNs.toString(),
    runnerElapsedMilliseconds: Number(elapsedNs) / 1_000_000,
    runnerElapsedSeconds: Number(elapsedNs) / 1_000_000_000,
    delegated: delegated ? structuredClone(delegated) : null,
    eligibleRealDuration: false,
    validationErrors: [],
  };
  evidence.validationErrors = validateMonotonicDurationEvidence(evidence, { ignoreEligibility: true });
  evidence.eligibleRealDuration = !evidence.fixtureMode && evidence.validationErrors.length === 0;
  return evidence;
}

export function validateMonotonicDurationEvidence(evidence, { ignoreEligibility = false } = {}) {
  const errors = [];
  if (evidence?.schema !== "media-server.v390-monotonic-duration-evidence.v1") errors.push("duration evidence schema mismatch");
  if (evidence?.clockSource !== "process.hrtime.bigint-monotonic") errors.push("runner clock is not monotonic");
  const started = parseNanoseconds(evidence?.runnerStartedMonotonicNs, errors, "runner started");
  const ended = parseNanoseconds(evidence?.runnerEndedMonotonicNs, errors, "runner ended");
  const elapsed = parseNanoseconds(evidence?.runnerElapsedNs, errors, "runner elapsed");
  if (ended < started) errors.push("runner monotonic end precedes start");
  if (ended >= started && elapsed !== ended - started) errors.push("runner monotonic elapsed arithmetic mismatch");
  const requestedSeconds = Number(evidence?.requestedSeconds);
  if (![30, 120].includes(Number(evidence?.requestedMinutes)) || requestedSeconds !== Number(evidence?.requestedMinutes) * 60) {
    errors.push("requested duration mismatch");
  }
  const runnerElapsedSeconds = Number(evidence?.runnerElapsedSeconds);
  if (!Number.isFinite(runnerElapsedSeconds) || runnerElapsedSeconds + 0.001 < requestedSeconds) {
    errors.push("runner requested elapsed time not reached");
  }
  const delegated = evidence?.delegated;
  if (delegated?.schema !== "media-server.predev-monotonic-duration.v1" || delegated?.clockSource !== "bash-SECONDS-monotonic") {
    errors.push("delegated monotonic duration schema mismatch");
  } else {
    const delegatedStart = Number(delegated.startedSeconds);
    const delegatedEnd = Number(delegated.endedSeconds);
    const delegatedElapsed = Number(delegated.elapsedSeconds);
    if (![delegatedStart, delegatedEnd, delegatedElapsed].every(Number.isFinite) ||
        delegatedEnd < delegatedStart || delegatedEnd - delegatedStart !== delegatedElapsed ||
        Number(delegated.durationSec) !== delegatedElapsed) {
      errors.push("delegated monotonic elapsed arithmetic mismatch");
    }
    if (Number(delegated.requestedSoakSeconds) !== requestedSeconds) errors.push("delegated requested duration mismatch");
    if (delegatedElapsed < requestedSeconds) errors.push("delegated requested elapsed time not reached");
  }
  if (evidence?.fixtureMode === true) errors.push("fixture duration is not real duration evidence");
  if (!ignoreEligibility) {
    const shouldBeEligible = evidence?.fixtureMode !== true && errors.length === 0;
    if (evidence?.eligibleRealDuration !== shouldBeEligible) errors.push("duration eligibility claim mismatch");
  }
  return unique(errors);
}

export function validateIterationLedger(ledger, steps) {
  const errors = [];
  if (ledger?.schema !== "media-server.predev-soak-iteration-ledger.v1") errors.push("iteration ledger schema mismatch");
  if (ledger?.source !== "explicit-step-ledger-not-max-inference") errors.push("iteration ledger source mismatch");
  const iterations = Array.isArray(ledger?.iterations) ? ledger.iterations : [];
  if (iterations.length === 0) errors.push("iteration ledger is empty");
  if (Number(ledger?.observedIterations) !== iterations.length) errors.push("iteration ledger observed count mismatch");
  const stepEntries = (Array.isArray(steps) ? steps : [])
    .filter(step => /^soak-[0-9]+-(?:va-events|event-post-schema|event-post-recovery|redaction|runtime-idle)$/.test(String(step?.name || "")));
  const stepById = new Map();
  for (const step of stepEntries) {
    const id = String(step.name);
    if (stepById.has(id)) errors.push(`duplicate soak step: ${id}`);
    stepById.set(id, String(step.result || ""));
  }
  const consumed = [];
  for (let index = 0; index < iterations.length; index += 1) {
    const item = iterations[index];
    const expectedIteration = index + 1;
    if (Number(item?.iteration) !== expectedIteration) errors.push("iteration ledger exact iteration sequence mismatch");
    const cases = Array.isArray(item?.cases) ? item.cases : [];
    const expectedIds = soakSuffixes.map(suffix => `soak-${expectedIteration}-${suffix}`);
    const observedIds = cases.map(entry => String(entry?.caseId || ""));
    if (JSON.stringify(observedIds) !== JSON.stringify(expectedIds)) errors.push(`iteration ${expectedIteration} exact case order mismatch`);
    for (const entry of cases) {
      const caseId = String(entry?.caseId || "");
      consumed.push(caseId);
      if (!stepById.has(caseId)) errors.push(`iteration case missing from step ledger: ${caseId}`);
      else if (stepById.get(caseId) !== String(entry?.result || "")) errors.push(`iteration case result drift: ${caseId}`);
    }
  }
  if (JSON.stringify(consumed) !== JSON.stringify(stepEntries.map(step => String(step.name)))) {
    errors.push("iteration ledger and delegated step ledger differ");
  }
  if (new Set(iterations.map(item => Number(item?.iteration))).size !== iterations.length) errors.push("duplicate iteration number");
  return unique(errors);
}

export function evaluateLongrun120Decision({ scope, runRequested }) {
  const reasons = [];
  const sourceComplete = scope?.schema === "media-server.v390-longrun-120-scope.v1" && scope?.sourceComplete === true;
  if (sourceComplete) {
    if (scope.userDirective === true) reasons.push("user-directive");
    if (scope.releaseGate === true) reasons.push("release-gate");
    for (const id of Array.isArray(scope.mappedFeatureIds) ? scope.mappedFeatureIds : []) reasons.push(`feature-map:${id}`);
    for (const area of Array.isArray(scope.changedAreas) ? scope.changedAreas : []) {
      if (!highRiskChangeAreas.has(String(area?.category || ""))) continue;
      if (!Array.isArray(area?.files) || area.files.length === 0 || !Array.isArray(area?.modules) || area.modules.length === 0) continue;
      reasons.push(`changed-area:${area.category}`);
    }
    for (const signal of Array.isArray(scope.upstreamSignals) ? scope.upstreamSignals : []) {
      if (signal?.status === "trigger" && signal?.id) reasons.push(`upstream-signal:${signal.id}`);
    }
  }
  const conditionMet = reasons.length > 0;
  let policyDecision = "미진행";
  let executionDecision = "not-required";
  let valid = true;
  if (!sourceComplete) {
    policyDecision = "미확인";
    executionDecision = "blocked-missing-source";
    valid = false;
  } else if (conditionMet) {
    policyDecision = "조건부 진행";
    executionDecision = runRequested === true ? "run" : "hold-awaiting-approval";
  } else if (runRequested === true) {
    executionDecision = "invalid-run-without-trigger";
    valid = false;
  }
  return {
    schema: "media-server.v390-longrun-120-decision.v1",
    policySource: "AGENTS.md#7.6.2",
    sourceComplete,
    conditionMet,
    policyDecision,
    triggerReasons: unique(reasons),
    runRequested: runRequested === true,
    executionDecision,
    valid,
    passSubstitution: false,
  };
}

export function validateCleanupMeasurement(evidence) {
  const errors = [];
  if (evidence?.schema !== "media-server.v390-cleanup-measurement.v1") errors.push("cleanup measurement schema mismatch");
  const processes = Array.isArray(evidence?.processes) ? evidence.processes : [];
  const ports = Array.isArray(evidence?.ports) ? evidence.ports : [];
  const artifacts = Array.isArray(evidence?.artifacts) ? evidence.artifacts : [];
  if (processes.length === 0) errors.push("cleanup PID lifecycle missing");
  if (ports.length === 0) errors.push("cleanup port observations missing");
  if (artifacts.length === 0) errors.push("cleanup artifact observations missing");
  const processByPid = new Map();
  for (const item of processes) {
    const pid = Number(item?.pid);
    if (!Number.isInteger(pid) || pid <= 1) errors.push("cleanup PID invalid");
    if (!/(?:media_server|run_server_foreground)/.test(String(item?.commandIdentity || ""))) {
      errors.push(`cleanup PID command identity mismatch: ${pid}`);
    }
    if (item?.aliveBefore !== true || item?.aliveAfter !== false) errors.push(`cleanup PID lifecycle mismatch: ${pid}`);
    if (!Array.isArray(item?.ownedPorts) || item.ownedPorts.length === 0) errors.push(`cleanup PID owned ports missing: ${pid}`);
    if (processByPid.has(pid)) errors.push(`cleanup PID duplicate: ${pid}`);
    processByPid.set(pid, item);
  }
  const seenPorts = new Set();
  for (const item of ports) {
    const port = Number(item?.port);
    if (!Number.isInteger(port) || port <= 0 || port > 65535 || seenPorts.has(port)) errors.push(`cleanup port invalid or duplicate: ${port}`);
    seenPorts.add(port);
    const before = Array.isArray(item?.listenerPidsBefore) ? item.listenerPidsBefore.map(Number) : [];
    const after = Array.isArray(item?.listenerPidsAfter) ? item.listenerPidsAfter.map(Number) : [];
    if (before.length === 0 || before.some(pid => {
      const owner = processByPid.get(pid);
      return !owner || !owner.ownedPorts.map(Number).includes(port);
    })) errors.push(`cleanup port pre-owner mismatch: ${port}`);
    if (after.length !== 0 || item?.bindableAfter !== true) errors.push(`cleanup port remained busy: ${port}`);
  }
  for (const item of artifacts) {
    const bytesBefore = Number(item?.bytesBefore);
    const bytesAfter = Number(item?.bytesAfter);
    const removedBytes = Number(item?.removedBytes);
    if (!isAllowedTemporaryArtifactPath(String(item?.path || "")) || item?.contained !== true) {
      errors.push("cleanup artifact path containment mismatch");
    }
    if (item?.existedBefore !== true) errors.push("cleanup artifact missing before measurement");
    if (item?.existsAfter !== false) errors.push("cleanup artifact still exists after cleanup");
    if (![bytesBefore, bytesAfter, removedBytes].every(value => Number.isFinite(value) && value >= 0)) errors.push("cleanup artifact byte measurement invalid");
    else if (bytesAfter !== 0 || removedBytes !== bytesBefore - bytesAfter) errors.push("cleanup artifact before/after byte arithmetic mismatch");
  }
  return unique(errors);
}

function parseNanoseconds(value, errors = null, label = "nanoseconds") {
  try {
    if (!/^[0-9]+$/.test(String(value ?? ""))) throw new Error("invalid");
    return BigInt(value);
  } catch {
    if (errors) errors.push(`${label} nanoseconds invalid`);
    return 0n;
  }
}

function isAllowedTemporaryArtifactPath(value) {
  if (!path.isAbsolute(value)) return false;
  const resolved = path.resolve(value);
  const allowedRoots = [...new Set([os.tmpdir(), "/tmp", "/private/tmp"].map(root => path.resolve(root)))];
  const basename = path.basename(resolved);
  const allowedName = basename.startsWith("media_server_predev-") || basename.startsWith("media_server_v390_ui-");
  return allowedName && allowedRoots.some(root => {
    const relative = path.relative(root, resolved);
    return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
  });
}

function unique(values) {
  return [...new Set(values)];
}
