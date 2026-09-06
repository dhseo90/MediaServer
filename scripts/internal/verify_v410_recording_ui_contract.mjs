#!/usr/bin/env node

import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise(resolve => server.close(resolve));
  assert(port > 0, "격리 port를 예약하지 못함");
  return port;
}

async function waitReady(baseUrl, child, logState) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (logState.processErrorCode) {
      throw new Error(`서버 process error(code=${logState.processErrorCode}; 원문 로그 출력 생략)`);
    }
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(
        `서버가 준비 전에 종료됨(exit=${child.exitCode}, signal=${child.signalCode}, ` +
        `capturedLogLines=${logState.lineCount}; 원문 로그 출력 생략)`,
      );
    }
    try {
      const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(500) });
      if (response.status === 200) return;
    } catch { /* 준비 중 */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(
    `서버 준비 시간 초과(capturedLogLines=${logState.lineCount}; 원문 로그 출력 생략)`,
  );
}

function observedChildExit(child) {
  return child.exitCode !== null || child.signalCode !== null;
}

function assertNormalChildExit(child) {
  if (child.exitCode !== 0 || child.signalCode !== null) {
    throw new Error(`서버 비정상 종료(exit=${child.exitCode}, signal=${child.signalCode})`);
  }
}

async function waitForChildExit(child, timeoutMs) {
  if (observedChildExit(child)) return true;
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer;
    const cleanup = () => {
      if (timer !== undefined) clearTimeout(timer);
      child.removeListener("exit", onExit);
      child.removeListener("error", onError);
    };
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };
    const onExit = () => finish(resolve, true);
    const onError = error => finish(reject, error);
    child.once("exit", onExit);
    child.once("error", onError);
    timer = setTimeout(() => finish(resolve, false), timeoutMs);
  });
}

export async function stopServer(child, options = {}) {
  const graceMs = options.graceMs ?? 5000;
  const forceWaitMs = options.forceWaitMs ?? 5000;
  if (observedChildExit(child)) {
    assertNormalChildExit(child);
    return { exited: true, forced: false, exitCode: child.exitCode, signalCode: child.signalCode };
  }

  const gracefulWait = waitForChildExit(child, graceMs);
  if (!child.kill("SIGTERM") && !observedChildExit(child)) {
    throw new Error("서버 SIGTERM 전달 실패");
  }
  if (await gracefulWait) {
    assertNormalChildExit(child);
    return { exited: true, forced: false, exitCode: child.exitCode, signalCode: child.signalCode };
  }

  const forcedWait = waitForChildExit(child, forceWaitMs);
  if (!child.kill("SIGKILL") && !observedChildExit(child)) {
    throw new Error("서버 SIGKILL 전달 실패");
  }
  if (!(await forcedWait)) {
    throw new Error("서버 강제 종료(SIGKILL) 후 exit 관찰 시간 초과");
  }
  throw new Error(`서버 강제 종료(SIGKILL) 사용(exit=${child.exitCode}, signal=${child.signalCode})`);
}

export async function assertPortClosed(port, options = {}) {
  const connect = options.connect ?? net.createConnection;
  const timeoutMs = options.timeoutMs ?? 1000;
  return await new Promise((resolve, reject) => {
    const socket = connect({ host: "127.0.0.1", port });
    let settled = false;
    const cleanup = () => {
      socket.removeListener("connect", onConnect);
      socket.removeListener("error", onError);
      socket.destroy();
    };
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };
    const onConnect = () => finish(reject, new Error(`cleanup 뒤에도 port ${port}가 열려 있음`));
    const onError = error => {
      if (error?.code === "ECONNREFUSED") {
        finish(resolve, { closed: true, evidence: "ECONNREFUSED" });
        return;
      }
      finish(reject, new Error(`port ${port} 부재 확인 실패: ${error?.code || "unknown error"}`));
    };
    socket.once("connect", onConnect);
    socket.once("error", onError);
    socket.setTimeout(timeoutMs, () => {
      finish(reject, new Error(`port ${port} 부재 확인 timeout`));
    });
  });
}

function measureTreeWithoutFollowingSymlinks(root) {
  const result = { bytes: 0, entries: 0, symlinks: 0 };
  if (!root || !fs.existsSync(root)) return result;
  const visit = target => {
    const stat = fs.lstatSync(target);
    result.entries += 1;
    result.bytes += stat.size;
    if (stat.isSymbolicLink()) {
      result.symlinks += 1;
      return;
    }
    if (!stat.isDirectory()) return;
    for (const name of fs.readdirSync(target)) visit(path.join(target, name));
  };
  visit(root);
  return result;
}

export async function cleanupHarnessResources(resources, options = {}) {
  const stop = options.stopServer ?? stopServer;
  const checkClosed = options.assertPortClosed ?? assertPortClosed;
  const removeRoot = options.removeRoot ?? (root => fs.rmSync(root, { recursive: true, force: true }));
  const rootExists = options.rootExists ?? fs.existsSync;
  const { child, rtspPort, httpPort, root } = resources;
  const failures = [];
  let attempted = 0;
  const report = {
    root,
    rootBefore: { bytes: null, entries: null, symlinks: null },
    rootAbsent: !root || !rootExists(root),
    process: child ? {
      pid: child.pid ?? null,
      exitCode: child.exitCode,
      signalCode: child.signalCode,
      graceful: false,
    } : { pid: null, exitCode: null, signalCode: null, graceful: true, notStarted: true },
    ports: [],
  };
  const attempt = async (name, action, onSuccess = () => {}) => {
    attempted += 1;
    try {
      onSuccess(await action());
    } catch (error) {
      failures.push(new Error(`${name}: ${error.message}`, { cause: error }));
    }
  };

  if (child) {
    await attempt("server-stop", () => stop(child), result => {
      report.process.graceful = result.forced === false;
    });
    report.process.exitCode = child.exitCode;
    report.process.signalCode = child.signalCode;
  }
  if (Number.isInteger(rtspPort) && rtspPort > 0) {
    const portReport = { kind: "rtsp", port: rtspPort, closed: false, evidence: "unconfirmed" };
    report.ports.push(portReport);
    await attempt("rtsp-port-closed", () => checkClosed(rtspPort), result => {
      assert(result?.closed === true && result?.evidence === "ECONNREFUSED",
        `port ${rtspPort} 부재의 확정된 증거가 없음`);
      portReport.closed = true;
      portReport.evidence = result.evidence;
    });
  }
  if (Number.isInteger(httpPort) && httpPort > 0) {
    const portReport = { kind: "http", port: httpPort, closed: false, evidence: "unconfirmed" };
    report.ports.push(portReport);
    await attempt("http-port-closed", () => checkClosed(httpPort), result => {
      assert(result?.closed === true && result?.evidence === "ECONNREFUSED",
        `port ${httpPort} 부재의 확정된 증거가 없음`);
      portReport.closed = true;
      portReport.evidence = result.evidence;
    });
  }
  if (typeof root === "string" && root) {
    await attempt("root-measure", () => measureTreeWithoutFollowingSymlinks(root), result => {
      report.rootBefore = result;
    });
    await attempt("root-remove", () => removeRoot(root));
    await attempt("root-absent", () => assert(!rootExists(root), `임시 root cleanup 실패: ${root}`), () => {
      report.rootAbsent = true;
    });
  }
  report.attempted = attempted;
  report.failureCount = failures.length;
  if (failures.length > 0) {
    const aggregate = new AggregateError(
      failures,
      `cleanup 실패 ${failures.length}건: ${failures.map(error => error.message).join("; ")}`,
    );
    aggregate.cleanupReport = report;
    throw aggregate;
  }
  return report;
}

function isolatedEnvironment(root, binary, rtspPort, httpPort) {
  assert(process.env.HOME, "HOME 누락: 격리 launcher 실행을 거부함");
  assert(process.env.PATH, "PATH 누락: 격리 launcher 실행을 거부함");
  const env = {
    HOME: process.env.HOME,
    PATH: process.env.PATH,
    TMPDIR: path.join(root, "tmp"),
  };
  for (const key of ["USER", "LOGNAME", "LANG", "LC_ALL", "LC_CTYPE"]) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  Object.assign(env, {
    MEDIA_SERVER_SKIP_LOCAL_ENV: "1",
    MEDIA_SERVER_SKIP_BUILD: "1",
    MEDIA_SERVER_SKIP_ENV_CHECK: "1",
    MEDIA_SERVER_ENABLE_AI: "1",
    MEDIA_SERVER_BUILD_DIR: path.dirname(binary),
    MEDIA_SERVER_BIN_PATH: binary,
    MEDIA_SERVER_AUTH_MODE: "off",
    MEDIA_SERVER_ENABLE_OPS: "1",
    MEDIA_SERVER_ENABLE_CLIENT: "1",
    MEDIA_SERVER_ENABLE_LAB: "0",
    MEDIA_SERVER_LISTEN_ADDRESS: "127.0.0.1",
    MEDIA_SERVER_HTTP_LISTEN_ADDRESS: "127.0.0.1",
    MEDIA_SERVER_LISTEN_PORT: String(rtspPort),
    MEDIA_SERVER_HTTP_LISTEN_PORT: String(httpPort),
    MEDIA_SERVER_FORCE_RTSP_TCP: "1",
    MEDIA_SERVER_FILE_ROOT: path.join(root, "input"),
    MEDIA_SERVER_DEFAULT_FILE: path.join(root, "input/sample_h264_video_only.mp4"),
    MEDIA_SERVER_STATE_DIR: path.join(root, "data"),
    MEDIA_SERVER_AUTH_USERS_FILE: path.join(root, "data/users.json"),
    MEDIA_SERVER_SOURCE_REGISTRY: path.join(root, "data/sources.json"),
    MEDIA_SERVER_PUBLISHED_VIEWS: path.join(root, "data/views.json"),
    MEDIA_SERVER_ANALYSIS_REGISTRY: path.join(root, "data/analysis.json"),
    MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED: "0",
    MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH: path.join(root, "events/events.jsonl"),
    MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED: "0",
    MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR: path.join(root, "events/snapshots"),
    MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED: "0",
    MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR: path.join(root, "events/clips"),
    MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED: "0",
    MEDIA_SERVER_RECORDING_ENABLED: "1",
    MEDIA_SERVER_RECORDING_STORAGE_ROOT: path.join(root, "recordings"),
    MEDIA_SERVER_RECORDING_RESERVED_FREE_BYTES: "0",
    MEDIA_SERVER_GST_CACHE_DIR: path.join(root, "gst-cache"),
    MEDIA_SERVER_GST_PLUGIN_PROFILE: "headless",
    GST_REGISTRY: path.join(root, "gst-registry.bin"),
    GST_REGISTRY_1_0: path.join(root, "gst-registry.bin"),
  });
  return Object.freeze(env);
}

function extractSection(html, marker) {
  const markerIndex = html.indexOf(marker);
  assert(markerIndex >= 0, `static section marker 누락: ${marker}`);
  const start = html.lastIndexOf("<section", markerIndex);
  assert(start >= 0, `static section 시작 누락: ${marker}`);
  const tags = /<\/?section\b[^>]*>/gi;
  tags.lastIndex = start;
  let depth = 0;
  for (let match = tags.exec(html); match; match = tags.exec(html)) {
    depth += match[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return html.slice(start, tags.lastIndex);
  }
  throw new Error(`static section 종료 누락: ${marker}`);
}

function verifyRecordingUiStaticContract(html) {
  const requiredSelectors = [
    "data-testid=\"ops-recording-timeline\"",
    "id=\"opsRecordingChannelFilter\"",
    "id=\"opsRecordingStartTime\"",
    "id=\"opsRecordingEndTime\"",
    "id=\"opsRecordingTimelineRows\"",
    "id=\"opsRecordingPlayer\"",
  ];
  const missing = requiredSelectors.filter(selector => !html.includes(selector));
  assert(missing.length === 0,
    `V410-S06-I27 static required control 누락: ${missing.join(", ")}`);
  console.log("[static-subcheck] PASS V410-S06-I27 required recording controls present");

  assert(html.includes("id=\"opsRecordingKindBadge\""),
    "V410-S06-I28 static event/continuous badge host 누락");
  console.log("[static-subcheck] PASS V410-S06-I28 kind badge host present; event 기본 선택 행동 미검증");

  assert(html.includes("id=\"opsRecordingOriginalView\""),
    "V410-S06-I29 static 원본 보기 control 누락");
  console.log("[static-subcheck] PASS V410-S06-I29 original-view control present; 클릭 행동 미검증");

  assert(/<video\b(?=[^>]*\bid="opsRecordingPlayer")(?=[^>]*\bcontrols\b)(?=[^>]*\bpreload="metadata")[^>]*>/i.test(html) &&
    html.includes("id=\"opsRecordingPlaybackSupport\""),
    "V410-S06-I30 static video controls/preload 또는 보이는 지원 상태 control 누락");
  console.log("[static-subcheck] PASS V410-S06-I30 video controls/preload and visible support status present; canPlayType/media error/decode 미검증");

  assert(html.includes("id=\"opsRecordingCompleteness\"") &&
    html.includes("id=\"opsRecordingPlaybackStatus\""),
    "V410-S06-I31 보이는 completeness/playback 상태 control 누락");
  console.log("[static-subcheck] PASS V410-S06-I31 visible completeness/playback status controls present; lifecycle 상태 반영 미검증");

  assert(html.includes("id=\"opsRecordingStatusBadges\"") &&
    html.includes("id=\"opsRecordingStatusText\""),
    "V410-S06-I32 static 녹화/quota 상태 영역 누락");
  console.log("[static-subcheck] PASS V410-S06-I32 status/quota placeholders present; API 값 반영 미검증");

  const section = extractSection(html, "data-testid=\"ops-recording-timeline\"");
  assert(!/<input\b[^>]*(?:natural.language|semantic|vector|embedding|검색어)[^>]*>/i.test(section),
    "V410-S06-I33 녹화 timeline 영역에 자연어/vector 입력이 있음");
  assert(!html.includes("href=\"/ops/recordings\""),
    "V410-S06-I33 별도 recording primary navigation이 추가됨");
  console.log("[static-subcheck] PASS V410-S06-I33 recording section has no natural-language/vector input");

  assert(!/(?:sourceUrl|absolutePath|rawJson|debugCounters)/i.test(section),
    "V410-S06-I34 녹화 timeline 정적 markup에 내부 source/path/debug field가 있음");
  console.log("[static-subcheck] PASS V410-S06-I34 recording markup redaction; role/responsive/theme 미검증");
  return 8;
}

export async function runVerifier(requestedMode = process.argv[2] || "--full") {
  const startedAt = Date.now();
  const mode = requestedMode;
  const allowedModes = new Set(["--red-status", "--red-http-baseline", "--full"]);
  if (!allowedModes.has(mode)) throw new Error(`지원하지 않는 mode: ${mode}`);

  let root = "";
  let rtspPort = 0;
  let httpPort = 0;
  let child;
  let primaryError;
  let cleanupError;
  let cleanupResult;

  try {
    const tmpRoot = fs.realpathSync(os.tmpdir());
    root = fs.mkdtempSync(path.join(tmpRoot, "media-server-v410-s06-"));
    root = fs.realpathSync(root);
    for (const directory of ["data", "input", "events/clips", "events/snapshots", "recordings", "tmp", "gst-cache"]) {
      fs.mkdirSync(path.join(root, directory), { recursive: true });
    }
    const fixture = path.join(repo, "video/sample_h264_video_only.mp4");
    assert(fs.statSync(fixture).isFile(), `유효 media fixture가 없음: ${fixture}`);
    fs.copyFileSync(fixture, path.join(root, "input/sample_h264_video_only.mp4"));
    fs.writeFileSync(path.join(root, "data/sources.json"), JSON.stringify({ sources: [] }));
    fs.writeFileSync(path.join(root, "data/views.json"), JSON.stringify({ views: [] }));
    rtspPort = await reservePort();
    httpPort = await reservePort();

    const binary = path.join(repo, "build-gst-onnx/media_server");
    assert(fs.existsSync(binary) && fs.statSync(binary).isFile() && (fs.statSync(binary).mode & 0o111) !== 0,
      `기존 baseline binary가 없음: ${binary}`);
    assert(fs.realpathSync(binary) === path.join(repo, "build-gst-onnx/media_server"),
      "검증 binary가 고정 제품 경로와 다름");
    const env = isolatedEnvironment(root, binary, rtspPort, httpPort);
    const logState = { lineCount: 0, processErrorCode: "" };
    child = spawn("./server.sh", ["foreground"], {
      cwd: repo,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const spawned = new Promise((resolve, reject) => {
      const cleanup = () => {
        child.removeListener("spawn", onSpawn);
        child.removeListener("error", onError);
      };
      const onSpawn = () => {
        cleanup();
        resolve();
      };
      const onError = error => {
        cleanup();
        reject(new Error(`서버 spawn 실패(code=${error?.code || "unknown"})`));
      };
      child.once("spawn", onSpawn);
      child.once("error", onError);
    });
    for (const stream of [child.stdout, child.stderr]) {
      stream.setEncoding("utf8");
      stream.on("data", chunk => {
        logState.lineCount += String(chunk).split(/\r?\n/).filter(Boolean).length;
      });
    }
    await spawned;
    child.on("error", error => {
      logState.processErrorCode = error?.code || "unknown";
    });
    const baseUrl = `http://127.0.0.1:${httpPort}`;
    await waitReady(baseUrl, child, logState);

    if (mode === "--red-status") {
      const response = await fetch(`${baseUrl}/ops/api/recordings/status`, {
        signal: AbortSignal.timeout(3000),
      });
      assert(response.status === 200,
        `V410-S06-I01 status API expected HTTP 200, actual ${response.status}`);
      console.log("[http-subcheck] PASS status API HTTP 200; V410-S06-I01 상세 status projection 미검증");
    } else {
      const response = await fetch(`${baseUrl}/ops/events`, { signal: AbortSignal.timeout(3000) });
      const html = await response.text();
      assert(response.status === 200, `/ops/events expected HTTP 200, actual ${response.status}`);
      const count = verifyRecordingUiStaticContract(html);
      console.log(`[V410-S06 UI static contract] subchecks=${count} fail=0 actualUiActions=NOT_RUN`);
    }
  } catch (error) {
    primaryError = error;
  }

  const cleanupStartedAt = Date.now();
  try {
    cleanupResult = await cleanupHarnessResources({ child, rtspPort, httpPort, root });
  } catch (error) {
    cleanupError = error;
    cleanupResult = error.cleanupReport;
  }
  const cleanupPayload = {
    root: cleanupResult?.root || root || null,
    rootBeforeBytes: cleanupResult?.rootBefore?.bytes ?? null,
    rootBeforeEntries: cleanupResult?.rootBefore?.entries ?? null,
    rootSymlinksNotFollowed: cleanupResult?.rootBefore?.symlinks ?? null,
    rootAbsent: cleanupResult?.rootAbsent ?? (!root || !fs.existsSync(root)),
    process: cleanupResult?.process ?? null,
    ports: cleanupResult?.ports ?? [],
    attempted: cleanupResult?.attempted ?? 0,
    failureCount: cleanupResult?.failureCount ?? 1,
    cleanupElapsedMs: Date.now() - cleanupStartedAt,
    verifierElapsedMs: Date.now() - startedAt,
  };
  if (cleanupError) {
    console.error(`[cleanup] FAIL ${JSON.stringify(cleanupPayload)}`);
  } else {
    console.log(`[cleanup] PASS ${JSON.stringify(cleanupPayload)}`);
  }
  if (primaryError && cleanupError) {
    throw new AggregateError([primaryError, cleanupError],
      `검증 실패와 cleanup 실패가 함께 발생: ${primaryError.message}; ${cleanupError.message}`);
  }
  if (primaryError) throw primaryError;
  if (cleanupError) throw cleanupError;
}

function isMainModule() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMainModule()) {
  runVerifier().catch(error => {
    console.error(`[V410-S06 verifier] FAIL: ${error.message}`);
    process.exitCode = 1;
  });
}
