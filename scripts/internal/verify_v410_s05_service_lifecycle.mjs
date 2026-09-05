#!/usr/bin/env node
// 파일 용도: S05 실제 nohup/launchd 녹화·이벤트 연결·재시작·정리 lifecycle을 격리 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { eventHasExactCatalogLink } from "../../docs/release-artifacts/v4.1.0/20260904-s05-identity-fix/verify-actual-link-reader.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(scriptDir, "../..");
const stateNames = [
  ".media_server.pid",
  ".media_server.address",
  ".media_server.port",
  ".media_server.log",
  ".media_server.mode",
  ".media_server.launchd.plist",
];
const mainStageIds = [
  "preflight",
  "isolated-config",
  "start",
  "environment-handoff",
  "health",
  "source-create",
  "source-readback",
  "first-segment",
  "rule-create",
  "first-tap",
  "first-event",
  "first-event-link",
  "restart",
  "old-pid-exit",
  "new-pid-health",
  "source-recovery",
  "catalog-recovery",
  "second-segment",
  "second-tap",
  "second-event",
  "second-event-link",
  "normal-stop",
];
const cleanupStageIds = [
  "cleanup-service",
  "cleanup-label",
  "cleanup-pids-ports",
  "cleanup-state",
  "binary-invariant",
  "repo-invariant",
  "cleanup-root",
];

const options = parseOptions(process.argv.slice(2));
if (!new Set(["nohup", "launchd"]).has(options.mode)) {
  console.error("--mode는 nohup 또는 launchd여야 합니다");
  process.exit(2);
}
if (!options.output || !path.isAbsolute(options.output)) {
  console.error("--output에는 아직 존재하지 않는 절대 JSON 경로가 필요합니다");
  process.exit(2);
}
if (path.extname(options.output) !== ".json" || fs.existsSync(options.output)) {
  console.error("--output은 덮어쓰지 않을 새 .json 파일이어야 합니다");
  process.exit(2);
}
const outputParent = path.dirname(options.output);
if (!fs.existsSync(outputParent) || fs.lstatSync(outputParent).isSymbolicLink() ||
    fs.statSync(outputParent).uid !== process.getuid()) {
  console.error("--output 상위 디렉터리는 현재 사용자 소유의 기존 비심볼릭 링크여야 합니다");
  process.exit(2);
}

let fixture = null;
if (options.fixture) {
  fixture = JSON.parse(fs.readFileSync(options.fixture, "utf8"));
  if (fixture?.schema !== "media-server.v410-s05-lifecycle-fixture.v1" ||
      !path.isAbsolute(fixture.binary || "") || !path.isAbsolute(fixture.toolsDir || "") ||
      !path.isAbsolute(fixture.driver || "")) {
    console.error("--fixture 계약이 올바르지 않습니다");
    process.exit(2);
  }
}

const startedAt = Date.now();
const rows = [];
const report = {
  schema: "media-server.v410-s05-service-lifecycle.v1",
  release: "v4.1.0",
  mode: options.mode,
  scope: "durable-link-and-fallback-boundary; derived clip full coverage 아님",
  stages: rows,
  outcome: "fail",
};
let root = "";
let stateDir = "";
let runtimeDir = "";
let label = "";
let rtspPort = 0;
let httpPort = 0;
let env = null;
let binary = "";
let binaryBefore = null;
let repoBefore = null;
let oldPid = 0;
let newPid = 0;
let activePid = 0;
let firstTap = "";
let secondTap = "";
let firstEvent = null;
let mainFailure = "";
let mainFinished = false;
let serviceStopped = false;
let cleanupLogSize = { files: 0, bytes: 0 };
const trackedPids = new Set();

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function demand(condition, message) {
  if (!condition) throw new Error(message);
}

function digestFile(target) {
  return crypto.createHash("sha256").update(fs.readFileSync(target)).digest("hex");
}

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitize(item)]));
  }
  if (typeof value !== "string") return value;
  let result = value;
  for (const [sensitive, replacement] of [
    [root, "<run-root>"],
    [fixture ? path.dirname(options.fixture) : "", "<fixture-root>"],
    [process.env.HOME || "", "<home>"],
  ]) {
    if (sensitive) result = result.split(sensitive).join(replacement);
  }
  return result
    .replace(/(Bearer\s+)[^\s]+/gi, "$1<redacted>")
    .replace(/((?:password|token|secret|cookie)\s*[=:]\s*)[^\s,]+/gi, "$1<redacted>");
}

function record(id, result, detail = {}) {
  const row = sanitize({ id, result, detail, elapsedMs: Date.now() - startedAt });
  rows.push(row);
  console.log(JSON.stringify(row));
  return row;
}

async function stage(id, body) {
  try {
    const detail = await body();
    record(id, "pass", detail);
    return detail;
  } catch (error) {
    record(id, "fail", { message: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

function command(executable, args, commandEnv = env || process.env, timeout = 15000) {
  const run = spawnSync(executable, args, {
    cwd: repo,
    env: commandEnv,
    encoding: "utf8",
    timeout,
    maxBuffer: 4 * 1024 * 1024,
  });
  return {
    exit: run.status,
    signal: run.signal,
    stdout: String(run.stdout || "").trim(),
    stderr: String(run.stderr || "").trim(),
    error: run.error?.message || "",
  };
}

function checkedCommand(executable, args, commandEnv = env, timeout = 15000) {
  const run = command(executable, args, commandEnv, timeout);
  const diagnostic = [run.stderr, run.stdout, run.error].filter(Boolean).join("\n");
  demand(run.exit === 0, `${path.basename(executable)} exit=${run.exit}: ${diagnostic}`);
  return run;
}

function tool(name, absolute) {
  return fixture ? path.join(fixture.toolsDir, name) : absolute;
}

function labelPresent() {
  const run = command(tool("launchctl", "/bin/launchctl"), ["print", `gui/${process.getuid()}/${label}`]);
  demand([0, 1, 3, 113].includes(run.exit), `launchctl print 확인 불가: ${run.stderr || run.error}`);
  return run.exit === 0;
}

function listPids(port) {
  const run = command(tool("lsof", "/usr/sbin/lsof"), ["-nP", "-a", `-iTCP:${port}`, "-sTCP:LISTEN", "-Fp"]);
  demand([0, 1].includes(run.exit), `lsof ${port} 확인 불가: ${run.stderr || run.error}`);
  return [...new Set(run.stdout.split(/\r?\n/).filter(line => /^p\d+$/.test(line)).map(line => Number(line.slice(1))))];
}

async function allocateFreePort(excluded = new Set()) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (fixture) {
      const selected = 19000 + crypto.randomInt(0, 20000);
      if (!excluded.has(selected) && listPids(selected).length === 0) return selected;
      continue;
    }
    const selected = await new Promise((resolve, reject) => {
      const server = net.createServer();
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        const port = typeof address === "object" && address ? address.port : 0;
        server.close(error => error ? reject(error) : resolve(port));
      });
    });
    if (!excluded.has(selected) && listPids(selected).length === 0) return selected;
  }
  throw new Error("사용 가능한 loopback port를 확보하지 못함");
}

function isAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

async function waitUntil(labelText, timeout, probe) {
  const effectiveTimeout = fixture ? Math.min(timeout, 1000) : timeout;
  const deadline = Date.now() + effectiveTimeout;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const value = await probe();
      if (value) return value;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await delay(250);
  }
  throw new Error(`${labelText} timeout${lastError ? `: ${lastError}` : ""}`);
}

function readPid() {
  const file = path.join(stateDir, ".media_server.pid");
  demand(fs.existsSync(file), "state PID 파일이 없음");
  const pid = Number(fs.readFileSync(file, "utf8").trim());
  demand(Number.isInteger(pid) && pid > 0, "state PID가 올바르지 않음");
  return pid;
}

function processSnapshot(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return { alive: false };
  const run = command(tool("ps", "/bin/ps"), ["-p", String(pid), "-o", "ppid=", "-o", "stat=", "-o", "etime=", "-o", "comm="], process.env);
  demand([0, 1].includes(run.exit), `ps PID ${pid} 확인 불가: ${run.stderr || run.error}`);
  if (run.exit === 1 || !run.stdout) return { alive: false };
  const match = run.stdout.match(/^\s*(\d+)\s+(\S+)\s+(\S+)\s+(.+)$/);
  demand(match, `ps PID ${pid} 출력 해석 불가: ${run.stdout}`);
  return { alive: true, parentPid: Number(match[1]), state: match[2], elapsed: match[3], command: match[4] };
}

async function runWrapper(name, observedPid = 0) {
  const wrapperStartedAt = Date.now();
  const processTransitions = [];
  let previousSnapshot = "";
  const observe = () => {
    if (!observedPid) return;
    const snapshot = processSnapshot(observedPid);
    const comparable = JSON.stringify(snapshot);
    if (comparable === previousSnapshot) return;
    previousSnapshot = comparable;
    processTransitions.push({ atMs: Date.now() - wrapperStartedAt, ...snapshot });
  };
  observe();
  const run = await new Promise(resolve => {
    const child = spawn("/bin/bash", [path.join(scriptDir, name)], {
      cwd: repo,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let error = "";
    let timedOut = false;
    const append = (current, chunk) => `${current}${String(chunk)}`.slice(-(4 * 1024 * 1024));
    child.stdout.on("data", chunk => { stdout = append(stdout, chunk); });
    child.stderr.on("data", chunk => { stderr = append(stderr, chunk); });
    child.on("error", childError => { error = childError.message; });
    const interval = observedPid ? setInterval(observe, 100) : null;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, 90000);
    child.on("close", (code, signal) => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
      observe();
      resolve({
        exit: code,
        signal,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        error: timedOut ? `${name} 90000ms timeout` : error,
      });
    });
  });
  const durationMs = Date.now() - wrapperStartedAt;
  const diagnostic = [run.stderr, run.stdout, run.error].filter(Boolean).join("\n");
  demand(run.exit === 0, `${name} exit=${run.exit}: ${diagnostic}`);
  const forcedLine = run.stdout.split(/\r?\n/).find(line => /graceful stop timeout|sending SIGKILL/i.test(line)) || "";
  const detail = {
    command: name,
    exit: run.exit,
    durationMs,
    observedPid: observedPid || null,
    forcedTermination: Boolean(forcedLine),
    processTransitions,
    stdoutTail: run.stdout.split(/\r?\n/).slice(-20),
    stderrTail: run.stderr.split(/\r?\n/).slice(-20),
  };
  demand(!forcedLine, `${name}가 정상 종료 대신 강제 종료를 사용함: ${forcedLine}; durationMs=${durationMs}; processTransitions=${JSON.stringify(processTransitions)}`);
  return detail;
}

function pathSnapshot(target) {
  if (!fs.existsSync(target)) return "absent";
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink()) return `symlink:${fs.readlinkSync(target)}`;
  if (stat.isFile()) return `file:${stat.size}:${digestFile(target)}`;
  if (!stat.isDirectory()) return `other:${stat.mode}`;
  const hash = crypto.createHash("sha256");
  const walk = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const child = path.join(directory, entry.name);
      const relative = path.relative(target, child);
      const childStat = fs.lstatSync(child);
      hash.update(`${relative}\0${childStat.mode}\0${childStat.size}\0`);
      if (childStat.isDirectory()) walk(child);
      else if (childStat.isSymbolicLink()) hash.update(fs.readlinkSync(child));
      else if (childStat.isFile()) hash.update(fs.readFileSync(child));
    }
  };
  walk(target);
  return `directory:${hash.digest("hex")}`;
}

function repoSnapshot() {
  const names = [...stateNames, ".media_server.users.json", ".analysis_registry.json", ".views.json", "data", "events", "recordings"];
  const entries = Object.fromEntries(names.map(name => [name, pathSnapshot(path.join(repo, name))]));
  return { entries, sha256: crypto.createHash("sha256").update(JSON.stringify(entries)).digest("hex") };
}

function measure(target) {
  if (!fs.existsSync(target)) return { files: 0, bytes: 0 };
  const stat = fs.lstatSync(target);
  if (!stat.isDirectory()) return { files: 1, bytes: stat.size };
  let files = 0;
  let bytes = 0;
  const walk = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const child = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(child);
      else { files += 1; bytes += fs.lstatSync(child).size; }
    }
  };
  walk(target);
  return { files, bytes };
}

function fixtureCall(operation, payload = {}) {
  const run = checkedCommand(process.execPath, [fixture.driver, operation, JSON.stringify(payload)], env, 10000);
  try { return JSON.parse(run.stdout); } catch { throw new Error(`fixture ${operation} JSON 응답이 아님`); }
}

async function httpJson(method, route, body) {
  const response = await fetch(`http://127.0.0.1:${httpPort}${route}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
  });
  const raw = await response.text();
  demand(response.ok, `${method} ${route}: HTTP ${response.status} ${raw.slice(0, 240)}`);
  try { return { ...JSON.parse(raw), httpStatus: response.status }; }
  catch { throw new Error(`${method} ${route}: JSON 응답이 아님`); }
}

function responseHttpStatus(value) {
  return value?.httpStatus ?? (typeof value?.status === "number" ? value.status : 0);
}

function sql(query) {
  const run = checkedCommand("/usr/bin/sqlite3", ["-readonly", "-json", path.join(root, "recordings/recording-catalog.sqlite3"), query], env);
  return run.stdout ? JSON.parse(run.stdout) : [];
}

function readEvents() {
  const target = path.join(root, "events/events.jsonl");
  if (!fs.existsSync(target)) return [];
  const rows = [];
  for (const line of fs.readFileSync(target, "utf8").split(/\r?\n/).filter(Boolean)) {
    try { const value = JSON.parse(line); if (value?.eventId && value?.eventType === "presence") rows.push(value); } catch { /* incomplete tail은 미완료 */ }
  }
  return rows;
}

const adapter = {
  health: async () => fixture ? fixtureCall("health") : httpJson("GET", "/health"),
  createSource: async source => fixture ? fixtureCall("create-source", { source }) : httpJson("POST", "/ops/api/sources", source),
  listSources: async () => fixture ? fixtureCall("list-sources") : httpJson("GET", "/ops/api/sources"),
  segments: async () => fixture ? fixtureCall("segments") : sql("SELECT segment_id,source_id,channel_id,stream_epoch_id,start_utc_ms,end_utc_ms,start_pts,end_pts,time_base_num,time_base_den,size_bytes,retention_class,lifecycle,media_relpath FROM recording_segments WHERE channel_id='9101' AND lifecycle='finalized' AND retention_class='continuous' ORDER BY start_utc_ms,segment_id"),
  putRule: async rule => fixture ? fixtureCall("put-rule", { rule }) : httpJson("PUT", "/lab/analysis/rules/9101", rule),
  createTap: async () => fixture ? fixtureCall("create-tap") : httpJson("POST", "/lab/analysis/taps?file=identity.mp4&va=1&fps=8&maxQueue=1&trackIds=1"),
  pollEvent: async (tapId, excluded) => {
    if (fixture) return fixtureCall("poll-event", { tapId }).event;
    await httpJson("GET", `/lab/analysis/taps/${tapId}/events?dispatch=1`);
    return readEvents().find(event => !excluded.has(event.eventId)) || null;
  },
  links: async () => fixture ? fixtureCall("links") : sql("SELECT * FROM recording_event_links ORDER BY event_id,link_id"),
  deleteTap: async tapId => fixture ? fixtureCall("delete-tap", { tapId }) : httpJson("DELETE", `/lab/analysis/taps/${tapId}`),
};

function validateSegment(segment) {
  demand(segment?.channel_id === "9101" && segment?.source_id === "9101", "numeric source/channel segment가 아님");
  demand(segment.lifecycle === "finalized" && segment.retention_class === "continuous", "finalized continuous segment가 아님");
  const media = path.resolve(root, "recordings", segment.media_relpath || "");
  demand(media.startsWith(`${path.resolve(root, "recordings")}${path.sep}`), "segment media 경로가 격리 root 밖임");
  demand(fs.existsSync(media) && fs.statSync(media).size > 0, "finalized segment MP4 실파일이 없음");
}

function sourceRequest() {
  return {
    sourceId: "9101",
    displayName: `S05 ${options.mode} lifecycle 검증`,
    kind: "file",
    file: "identity.mp4",
    enabled: true,
    recording: {
      enabled: true,
      continuousMaxBytes: 268435456,
      eventMaxBytes: 268435456,
      continuousMaxAgeMs: 3600000,
      eventMaxAgeMs: 3600000,
      revision: 1,
    },
  };
}

function ruleRequest() {
  return {
    id: "9101",
    priority: 100,
    enabled: true,
    match: { sourceKind: "file", route: "http" },
    analysis: { classes: ["person"] },
    event: { type: "presence", minConfidence: 0.25, region: { type: "polygon", points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }] } },
    eventActions: { highlight: { enabled: true, mode: "blink", target: "matched-object", durationMs: 1500, color: "#00ff00" }, post: { enabled: false, method: "POST", url: "", payloadFormat: "media-server.va.event.v1" } },
  };
}

function makeEnvironment() {
  demand(process.env.HOME, "HOME 누락: launcher 실행을 거부함");
  const next = { PATH: fixture ? `${fixture.toolsDir}:${process.env.PATH}` : process.env.PATH, HOME: process.env.HOME, TMPDIR: path.join(root, "tmp") };
  for (const key of ["USER", "LOGNAME"]) if (process.env[key] !== undefined) next[key] = process.env[key];
  Object.assign(next, {
    MEDIA_SERVER_SKIP_LOCAL_ENV: "1",
    MEDIA_SERVER_SKIP_BUILD: "1",
    MEDIA_SERVER_SKIP_ENV_CHECK: "1",
    MEDIA_SERVER_ENABLE_AI: "1",
    MEDIA_SERVER_BUILD_DIR: path.join(repo, "build-gst-onnx"),
    MEDIA_SERVER_BIN_PATH: binary,
    MEDIA_SERVER_START_MODE: options.mode,
    MEDIA_SERVER_STATE_DIR: stateDir,
    MEDIA_SERVER_LAUNCHD_LABEL: label,
    MEDIA_SERVER_LISTEN_ADDRESS: "127.0.0.1",
    MEDIA_SERVER_HTTP_LISTEN_ADDRESS: "127.0.0.1",
    MEDIA_SERVER_LISTEN_PORT: String(rtspPort),
    MEDIA_SERVER_PORT_CANDIDATES: String(rtspPort),
    MEDIA_SERVER_HTTP_LISTEN_PORT: String(httpPort),
    MEDIA_SERVER_START_STABILITY_WAIT_S: "0",
    MEDIA_SERVER_AUTO_DIAGNOSE: "0",
    MEDIA_SERVER_AUTH_MODE: "off",
    MEDIA_SERVER_ENABLE_LAB: "1",
    MEDIA_SERVER_ENABLE_OPS: "1",
    MEDIA_SERVER_FILE_ROOT: path.join(root, "input"),
    MEDIA_SERVER_DEFAULT_FILE: path.join(root, "input/identity.mp4"),
    MEDIA_SERVER_AUTH_USERS_FILE: path.join(root, "data/users.json"),
    MEDIA_SERVER_SOURCE_REGISTRY: path.join(root, "data/sources.json"),
    MEDIA_SERVER_PUBLISHED_VIEWS: path.join(root, "data/views.json"),
    MEDIA_SERVER_ANALYSIS_REGISTRY: path.join(root, "data/analysis.json"),
    MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED: "1",
    MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH: path.join(root, "events/events.jsonl"),
    MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED: "0",
    MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR: path.join(root, "events/snapshots"),
    MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED: "1",
    MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR: path.join(root, "events/clips"),
    MEDIA_SERVER_ANALYSIS_EVENT_PRE_EVENT_MS: "500",
    MEDIA_SERVER_ANALYSIS_EVENT_POST_EVENT_MS: "500",
    MEDIA_SERVER_ANALYSIS_EVENT_CLIP_BUFFER_MS: "3000",
    MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED: "0",
    MEDIA_SERVER_RECORDING_ENABLED: "1",
    MEDIA_SERVER_RECORDING_STORAGE_ROOT: path.join(root, "recordings"),
    MEDIA_SERVER_RECORDING_SEGMENT_DURATION_SECONDS: "2",
    MEDIA_SERVER_RECORDING_RESERVED_FREE_BYTES: "67108864",
    MEDIA_SERVER_RECORDING_RETENTION_INTERVAL_MS: "1000",
    MEDIA_SERVER_GST_CACHE_DIR: path.join(root, "gst-cache"),
    MEDIA_SERVER_ANALYSIS_MODEL: path.join(repo, "models/yolo11n.onnx"),
    MEDIA_SERVER_ANALYSIS_LABELS: path.join(repo, "models/coco.names"),
    MEDIA_SERVER_ANALYSIS_DETECTOR: "yolo",
    MEDIA_SERVER_ANALYSIS_FPS: "8",
    MEDIA_SERVER_ANALYSIS_CONFIDENCE: "0.25",
    MEDIA_SERVER_ANALYSIS_ADAPTIVE: "0",
    GST_REGISTRY: path.join(root, "gst-registry.bin"),
    GST_REGISTRY_1_0: path.join(root, "gst-registry.bin"),
  });
  if (fixture) {
    Object.assign(next, {
      HOMEBREW_PREFIX: path.join(root, "missing-homebrew"),
      MEDIA_SERVER_LIFECYCLE_ROOT: root,
      MEDIA_SERVER_LIFECYCLE_RUNTIME_DIR: runtimeDir,
      FAKE_TOOL_LOG: fixture.toolLog,
    });
  }
  return Object.freeze(next);
}

async function cleanup() {
  let cleanupSafe = true;
  await cleanupStage("cleanup-service", async () => {
    if (!env || serviceStopped) return { needed: false };
    const pidFile = stateDir ? path.join(stateDir, ".media_server.pid") : "";
    if (pidFile && fs.existsSync(pidFile)) {
      const pid = Number(fs.readFileSync(pidFile, "utf8").trim());
      if (Number.isInteger(pid) && pid > 0) trackedPids.add(pid);
    }
    const run = command("/bin/bash", [path.join(scriptDir, "stop_server.sh")], env, 60000);
    const okay = run.exit === 0;
    cleanupSafe &&= okay;
    demand(okay, `stop wrapper cleanup 실패: ${run.stderr || run.error}`);
    return { needed: true, exit: run.exit };
  });
  await cleanupStage("cleanup-label", async () => {
    const present = label ? labelPresent() : false;
    cleanupSafe &&= !present;
    demand(!present, "exact launchd label residue");
    return { label, absent: true };
  });
  await cleanupStage("cleanup-pids-ports", async () => {
    for (const pid of [oldPid, newPid, activePid]) if (pid) trackedPids.add(pid);
    const pids = [...trackedPids];
    const alive = pids.filter(isAlive);
    const ports = [rtspPort, httpPort].filter(Boolean).map(port => ({ port, pids: listPids(port) }));
    const okay = alive.length === 0 && ports.every(entry => entry.pids.length === 0);
    cleanupSafe &&= okay;
    demand(okay, `PID/port residue: alive=${alive.join(",")}`);
    return { checkedPids: pids, ports };
  });
  await cleanupStage("cleanup-state", async () => {
    if (stateDir) {
      const log = path.join(stateDir, ".media_server.log");
      cleanupLogSize = measure(log);
      if (fs.existsSync(log) && !fs.lstatSync(log).isSymbolicLink()) fs.rmSync(log);
    }
    const residue = stateDir ? stateNames.filter(name => fs.existsSync(path.join(stateDir, name))) : [];
    const okay = residue.length === 0;
    cleanupSafe &&= okay;
    demand(okay, `state residue: ${residue.join(",")}`);
    return { residue };
  });
  await cleanupStage("binary-invariant", async () => {
    if (!binaryBefore) return { checked: false };
    const after = { sha256: digestFile(binary), mtimeMs: fs.statSync(binary).mtimeMs };
    demand(JSON.stringify(after) === JSON.stringify(binaryBefore), "제품 binary SHA/mtime 변경");
    return { checked: true, before: binaryBefore, after };
  });
  await cleanupStage("repo-invariant", async () => {
    if (!repoBefore) return { checked: false };
    const after = repoSnapshot();
    demand(after.sha256 === repoBefore.sha256, "repo root state/data SHA 변경");
    return { checked: true, beforeSha256: repoBefore.sha256, afterSha256: after.sha256 };
  });
  await cleanupStage("cleanup-root", async () => {
    if (!root) return { removed: false, reason: "root 미생성" };
    const sizes = {
      ...Object.fromEntries(["recordings", "events", "gst-cache", "state"].map(name => [name, measure(path.join(root, name))])),
      log: cleanupLogSize,
    };
    const rootStat = fs.lstatSync(root);
    const safeRoot = rootStat.isDirectory() && !rootStat.isSymbolicLink() && rootStat.uid === process.getuid() &&
      path.basename(root).startsWith(`media-server-v410-s05-${options.mode}.`);
    demand(cleanupSafe && safeRoot, "실행 root 안전 삭제 경계 미충족");
    fs.rmSync(root, { recursive: true });
    const removed = !fs.existsSync(root);
    demand(removed, "실행 root 삭제 실패");
    report.cleanup = { root: "<run-root>", sizes, removed };
    return report.cleanup;
  });
}

async function cleanupStage(id, body) {
  try { record(id, "pass", await body()); }
  catch (error) { record(id, "fail", { message: error instanceof Error ? error.message : String(error) }); }
}

try {
  await stage("preflight", async () => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), `media-server-v410-s05-${options.mode}.`)));
    demand(fs.statSync(root).uid === process.getuid(), "실행 root가 현재 사용자 소유가 아님");
    stateDir = path.join(root, "state");
    runtimeDir = path.join(root, "runtime");
    for (const name of ["state", "runtime", "tmp", "input", "data", "events", "recordings", "gst-cache"]) fs.mkdirSync(path.join(root, name));
    label = `com.dhseo.mediaserver.v410s05.${options.mode}.${crypto.randomBytes(6).toString("hex")}`;
    rtspPort = await allocateFreePort();
    httpPort = await allocateFreePort(new Set([rtspPort]));
    binary = fixture ? fixture.binary : path.join(repo, "build-gst-onnx/media_server");
    demand(fs.existsSync(binary) && fs.statSync(binary).isFile() && (fs.statSync(binary).mode & 0o111) !== 0, "실행 binary가 없음");
    if (!fixture) demand(fs.realpathSync(binary) === path.join(repo, "build-gst-onnx/media_server"), "실제 모드는 고정 제품 binary만 허용");
    for (const name of stateNames) demand(!fs.existsSync(path.join(repo, name)), `repo legacy state 충돌: ${name}`);
    demand(!labelPresent(), "exact launchd label이 이미 존재함");
    demand(listPids(rtspPort).length === 0 && listPids(httpPort).length === 0, "선정 port가 이미 사용 중");
    binaryBefore = { sha256: digestFile(binary), mtimeMs: fs.statSync(binary).mtimeMs };
    repoBefore = repoSnapshot();
    report.binary = { path: binary, before: binaryBefore };
    report.preflight = { label, rtspPort, httpPort, legacyStateAbsent: stateNames.length, repoSha256: repoBefore.sha256 };
    return report.preflight;
  });

  await stage("isolated-config", async () => {
    if (fixture) fs.writeFileSync(path.join(root, "input/identity.mp4"), "fixture-media");
    else {
      fs.copyFileSync(path.join(repo, "video/imports/va_tracking_event_1280x720_30fps_h264.mp4"), path.join(root, "input/identity.mp4"));
    }
    for (const name of ["sample_h264.mp4", "sample_h265.mp4"]) {
      fs.copyFileSync(path.join(repo, "video", name), path.join(root, "input", name));
    }
    fs.writeFileSync(path.join(root, "data/sources.json"), JSON.stringify({ sources: [] }));
    fs.writeFileSync(path.join(root, "data/views.json"), JSON.stringify({ views: [] }));
    env = makeEnvironment();
    return { stateDir, dataDir: path.join(root, "data"), eventDir: path.join(root, "events"), recordingDir: path.join(root, "recordings"), gstCacheDir: path.join(root, "gst-cache"), authFile: env.MEDIA_SERVER_AUTH_USERS_FILE, sourceFile: env.MEDIA_SERVER_SOURCE_REGISTRY };
  });

  await stage("start", async () => {
    const wrapper = await runWrapper("start_server.sh");
    activePid = oldPid = readPid();
    trackedPids.add(oldPid);
    demand(isAlive(oldPid), "기동 PID가 살아 있지 않음");
    const ports = [rtspPort, httpPort].map(port => ({ port, pids: listPids(port) }));
    demand(ports.every(entry => entry.pids.includes(oldPid)), "기동 PID가 두 listener를 소유하지 않음");
    demand(fs.readFileSync(path.join(stateDir, ".media_server.mode"), "utf8").trim() === (options.mode === "launchd" ? "launchd" : "detached"), "state mode 불일치");
    return { ...wrapper, pid: oldPid, ports };
  });

  await stage("environment-handoff", async () => {
    if (options.mode === "launchd") {
      const plist = fs.readFileSync(path.join(stateDir, ".media_server.launchd.plist"), "utf8");
      for (const expected of [label, stateDir, env.MEDIA_SERVER_SOURCE_REGISTRY, env.MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH, env.MEDIA_SERVER_RECORDING_STORAGE_ROOT, env.MEDIA_SERVER_GST_CACHE_DIR, env.GST_REGISTRY_1_0]) {
        demand(plist.includes(expected), `launchd 환경 전달 누락: ${expected}`);
      }
      return { mode: "launchd", plistEnvironmentChecked: 7 };
    }
    return { mode: "nohup", behavioralReadback: "후속 격리 data/event/recording 생성으로 확인" };
  });

  await stage("health", async () => {
    const health = await waitUntil("초기 health", 30000, () => adapter.health().then(value => value?.ok === false ? null : value));
    return { status: responseHttpStatus(health), pid: oldPid };
  });

  const source = sourceRequest();
  await stage("source-create", async () => {
    const created = await adapter.createSource(source);
    demand(responseHttpStatus(created) === 201 && created.source?.sourceId === "9101", "numeric source 9101 생성 응답 불일치");
    return { status: responseHttpStatus(created), sourceId: created.source.sourceId };
  });
  await stage("source-readback", async () => {
    const response = await adapter.listSources();
    const found = response.sources?.find(item => item.sourceId === "9101");
    demand(responseHttpStatus(response) === 200 && found?.file === "identity.mp4" && found?.recording?.enabled === true, "source 9101 readback 실패");
    return { status: responseHttpStatus(response), sourceId: found.sourceId, recordingEnabled: true };
  });

  let firstSegments = [];
  await stage("first-segment", async () => {
    firstSegments = await waitUntil("첫 finalized continuous segment", 45000, async () => {
      const segments = await adapter.segments();
      return segments.length ? segments : null;
    });
    firstSegments.forEach(validateSegment);
    return { segments: firstSegments.map(item => ({ segmentId: item.segment_id, channelId: item.channel_id, sizeBytes: item.size_bytes, lifecycle: item.lifecycle })) };
  });

  await stage("rule-create", async () => {
    const response = await adapter.putRule(ruleRequest());
    demand(responseHttpStatus(response) === 200, "rule 생성 실패");
    return { status: responseHttpStatus(response), ruleId: "9101" };
  });
  await stage("first-tap", async () => {
    const response = await adapter.createTap();
    demand(responseHttpStatus(response) === 200 && response.tapId && response.streamKey, "첫 tap 생성 실패");
    firstTap = response.tapId;
    report.firstTapStreamKey = response.streamKey;
    return { tapId: firstTap, streamKey: response.streamKey };
  });
  await stage("first-event", async () => {
    firstEvent = await waitUntil("첫 EventRecord", 60000, () => adapter.pollEvent(firstTap, new Set()));
    demand(firstEvent.eventId && firstEvent.recordingLinkId, "첫 EventRecord/link ID 누락");
    demand(firstEvent.channelId === report.firstTapStreamKey && firstEvent.streamId === report.firstTapStreamKey, "첫 EventRecord 원본 stream identity 변경");
    return { eventId: firstEvent.eventId, recordingLinkId: firstEvent.recordingLinkId, channelId: firstEvent.channelId };
  });
  await stage("first-event-link", async () => {
    const links = await waitUntil("첫 catalog exact link", 30000, async () => {
      const current = await adapter.links();
      return eventHasExactCatalogLink(firstEvent, current, { sourceId: "9101", channelId: "9101" }) ? current : null;
    });
    return { eventId: firstEvent.eventId, rows: links.length, exact: true, scope: report.scope };
  });

  await stage("restart", async () => {
    await adapter.deleteTap(firstTap);
    firstTap = "";
    const wrapper = await runWrapper("restart_server.sh", oldPid);
    activePid = newPid = readPid();
    trackedPids.add(newPid);
    demand(newPid !== oldPid, "restart PID가 변경되지 않음");
    return { ...wrapper, oldPid, newPid };
  });
  await stage("old-pid-exit", async () => {
    await waitUntil("기존 PID 종료", 10000, async () => !isAlive(oldPid));
    return { oldPid, exited: true };
  });
  await stage("new-pid-health", async () => {
    demand(isAlive(newPid), "새 PID가 살아 있지 않음");
    const health = await waitUntil("재시작 health", 30000, () => adapter.health().then(value => value?.ok === false ? null : value));
    const ports = [rtspPort, httpPort].map(port => ({ port, pids: listPids(port) }));
    demand(ports.every(entry => entry.pids.includes(newPid) && !entry.pids.includes(oldPid)), "재시작 listener PID 소유 불일치");
    return { newPid, status: responseHttpStatus(health), ports };
  });
  await stage("source-recovery", async () => {
    const response = await adapter.listSources();
    demand(response.sources?.some(item => item.sourceId === "9101" && item.recording?.enabled === true), "재시작 source 복구 실패");
    return { sourceId: "9101", recovered: true };
  });
  await stage("catalog-recovery", async () => {
    const recovered = await adapter.segments();
    const previous = new Set(firstSegments.map(item => item.segment_id));
    demand(firstSegments.every(item => recovered.some(candidate => candidate.segment_id === item.segment_id)), "재시작 catalog가 기존 segment를 복구하지 못함");
    recovered.forEach(validateSegment);
    return { recoveredIds: recovered.filter(item => previous.has(item.segment_id)).map(item => item.segment_id) };
  });
  let secondSegments = [];
  await stage("second-segment", async () => {
    const previous = new Set(firstSegments.map(item => item.segment_id));
    secondSegments = await waitUntil("재시작 후 새 segment", 45000, async () => {
      const segments = await adapter.segments();
      return segments.some(item => !previous.has(item.segment_id)) ? segments : null;
    });
    secondSegments.forEach(validateSegment);
    return { newIds: secondSegments.filter(item => !previous.has(item.segment_id)).map(item => item.segment_id) };
  });
  await stage("second-tap", async () => {
    const response = await adapter.createTap();
    demand(responseHttpStatus(response) === 200 && response.tapId && response.streamKey, "두 번째 tap 생성 실패");
    secondTap = response.tapId;
    report.secondTapStreamKey = response.streamKey;
    return { tapId: secondTap, streamKey: response.streamKey };
  });
  let secondEvent = null;
  await stage("second-event", async () => {
    secondEvent = await waitUntil("두 번째 EventRecord", 60000, () => adapter.pollEvent(secondTap, new Set([firstEvent.eventId])));
    demand(secondEvent.eventId && secondEvent.eventId !== firstEvent.eventId, "두 번째 event ID가 새 값이 아님");
    demand(secondEvent.recordingLinkId && secondEvent.recordingLinkId !== firstEvent.recordingLinkId, "두 번째 link ID가 새 값이 아님");
    demand(secondEvent.channelId === report.secondTapStreamKey && secondEvent.streamId === report.secondTapStreamKey, "두 번째 EventRecord 원본 stream identity 변경");
    return { eventId: secondEvent.eventId, recordingLinkId: secondEvent.recordingLinkId };
  });
  await stage("second-event-link", async () => {
    const links = await waitUntil("두 번째 catalog exact link", 30000, async () => {
      const current = await adapter.links();
      return eventHasExactCatalogLink(secondEvent, current, { sourceId: "9101", channelId: "9101" }) ? current : null;
    });
    return { eventId: secondEvent.eventId, rows: links.length, exact: true, scope: report.scope };
  });
  await stage("normal-stop", async () => {
    await adapter.deleteTap(secondTap);
    secondTap = "";
    const wrapper = await runWrapper("stop_server.sh", newPid);
    activePid = 0;
    const labelAbsent = !labelPresent();
    const ports = [rtspPort, httpPort].map(port => ({ port, pids: listPids(port) }));
    const stateResidue = stateNames.filter(name => name !== ".media_server.log" && fs.existsSync(path.join(stateDir, name)));
    const pidExited = !isAlive(newPid);
    demand(pidExited, "정상 stop 뒤 새 PID가 살아 있음");
    demand(labelAbsent, "정상 stop 뒤 exact launchd label이 남음");
    demand(ports.every(entry => entry.pids.length === 0), "정상 stop 뒤 listener port가 남음");
    demand(stateResidue.length === 0, `정상 stop 뒤 state residue: ${stateResidue.join(",")}`);
    serviceStopped = true;
    return { ...wrapper, stoppedPid: newPid, pidExited, labelAbsent, ports, stateResidue, logCleanupDeferred: true };
  });
  mainFinished = true;
} catch (error) {
  mainFailure = error instanceof Error ? error.message : String(error);
} finally {
  const completed = new Set(rows.map(row => row.id));
  for (const id of mainStageIds) if (!completed.has(id)) record(id, "skipped", { reason: `선행 실패: ${mainFailure || "알 수 없음"}` });
  await cleanup();
  report.outcome = !mainFailure && mainFinished && rows.every(row => row.result !== "fail") ? "pass" : "fail";
  report.failure = sanitize(mainFailure);
  report.elapsedMs = Date.now() - startedAt;
  report.stageSummary = Object.fromEntries(["pass", "fail", "skipped"].map(result => [result, rows.filter(row => row.result === result).length]));
  const sanitizedReport = sanitize(report);
  try { fs.writeFileSync(options.output, `${JSON.stringify(sanitizedReport, null, 2)}\n`, { flag: "wx", mode: 0o600 }); }
  catch (error) { console.error(`sanitized JSON evidence 저장 실패: ${error.message}`); process.exitCode = 1; }
  console.log(JSON.stringify({ mode: options.mode, outcome: report.outcome, report: options.output, summary: report.stageSummary }));
  if (report.outcome !== "pass") process.exitCode = 1;
}

function parseOptions(args) {
  const parsed = { mode: "", output: "", fixture: "" };
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--mode") parsed.mode = String(args[++index] || "");
    else if (token.startsWith("--mode=")) parsed.mode = token.slice(7);
    else if (token === "--output") parsed.output = path.resolve(String(args[++index] || ""));
    else if (token.startsWith("--output=")) parsed.output = path.resolve(token.slice(9));
    else if (token === "--fixture") parsed.fixture = path.resolve(String(args[++index] || ""));
    else if (token.startsWith("--fixture=")) parsed.fixture = path.resolve(token.slice(10));
    else if (token === "-h" || token === "--help") {
      console.log("사용법: node scripts/internal/verify_v410_s05_service_lifecycle.mjs --mode nohup|launchd --output /absolute/report.json");
      process.exit(0);
    } else {
      console.error(`알 수 없는 옵션: ${token}`);
      process.exit(2);
    }
  }
  return parsed;
}
