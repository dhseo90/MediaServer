#!/usr/bin/env node
// 파일 용도: 녹화 UI 계약과 HTTP 권한의 격리 검증.

import fs from "node:fs";
import net from "node:net";
import dgram from "node:dgram";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {startRecordingUiRangeProxy,finishRecordingUiProxy} from './recording_ui_range_proxy.mjs';
import {validateCurrentUiSeed} from './recording_current_ui_seed.mjs';
import {assertLocalIceEnvironment,assertLocalIceConfig} from './verify_local_ice_guard.mjs';

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

function seedTimelinePath(seed){return `/ops/api/recordings/timeline?channelId=1&startTimeMs=${seed.startTimeMs}&endTimeMs=${seed.endTimeMs}`;}
export function validateHttpSeedManifest(root,seed){
  assert(seed?.schema==='recording-http-fixture.v1'&&seed.channelId==='1'&&Array.isArray(seed.outputs)&&seed.outputs.length===2,'managed seed shape');
  assert(/^\d+$/.test(seed.startTimeMs)&&/^\d+$/.test(seed.endTimeMs)&&BigInt(seed.startTimeMs)<BigInt(seed.endTimeMs),'seed UTC bounds');
  const mediaRoot=fs.realpathSync(path.join(root,'recordings')),ids=new Set(),paths=new Set();
  for(const [index,item]of [...seed.outputs,...(seed.transport?[seed.transport]:[])].entries()){
    assert(item&&typeof item.id==='string'&&/^[A-Za-z0-9._:-]{1,128}$/.test(item.id)&&!/^\d+$/.test(item.id)&&!ids.has(item.id),'seed opaque ID');ids.add(item.id);
    assert(typeof item.relativePath==='string'&&!path.isAbsolute(item.relativePath)&&!item.relativePath.includes('\\')&&
      item.relativePath.split('/').every(part=>part&&part!=='.'&&part!=='..'),'seed relative path');
    const file=path.resolve(mediaRoot,item.relativePath);assert(file.startsWith(mediaRoot+path.sep)&&fs.realpathSync(file)===file&&!paths.has(file),'seed containment');paths.add(file);
    const stat=fs.lstatSync(file);assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&Number.isSafeInteger(item.sizeBytes)&&
      item.sizeBytes>0&&item.sizeBytes<=64*1024*1024&&stat.size===item.sizeBytes,'seed regular size');
    assert(item.contentType==='video/mp4'&&/^[a-f0-9]{64}$/.test(item.sha256),'seed type/hash');
    const fd=fs.openSync(file,'r'),hash=crypto.createHash('sha256'),chunk=Buffer.alloc(65536);
    try{let n;while((n=fs.readSync(fd,chunk,0,chunk.length,null))>0)hash.update(chunk.subarray(0,n));}finally{fs.closeSync(fd);}
    assert(hash.digest('hex')===item.sha256,'seed file hash');
  }
  return seed;
}
async function verifyRecordingHttpApi(baseUrl, root, seed) {
  let checks = 0;
  const check = (condition, label) => { assert(condition, label); checks += 1; console.log(`[http-subcheck] PASS ${label}`); };
  const expected = fs.readFileSync(path.join(root,'recordings',seed.outputs[0].relativePath));
  const status = await fetch(`${baseUrl}/ops/api/recordings/status`).then(response => response.json());
  check(status.enabled === true && status.catalogMode === 'sqlite-primary' && Array.isArray(status.channels), 'I01 실제 status projection');
  const timelinePath = seedTimelinePath(seed);
  const timelineResponse = await fetch(`${baseUrl}${timelinePath}`);
  const timeline = await timelineResponse.json();
  const events=timeline.items.filter(item=>item.kind==='event');
  check(timelineResponse.status===200&&timeline.total===5&&events.length===2&&events.every(item=>seed.outputs.some(output=>output.id===item.segmentId)&&item.jobId===seed.jobId&&item.jobState==='complete'&&item.playable), 'I03/I06 실제 HTTP generated2출력·jobComplete timeline');
  check(timeline.items.some(item=>item.kind==='continuous'&&item.hideByEvent)&&timeline.items.some(item=>item.kind==='continuous'&&!item.hideByEvent&&item.eventOverlaps.length), 'I07 HTTP 전체/부분 중첩 원본 구별');
  check(timeline.unplacedTotal===1&&timeline.unplacedItems.length===1&&timeline.unplacedItems[0].startTimeMs===null&&!timeline.unplacedItems[0].playable,'D3D-02 accepted 미확인 독립 목록');
  check(events.every(item=>typeof item.startTimeMs==='string'&&typeof item.utcRange.startNs==='string'&&item.requestedRange.timeBasis==='media-pts-ms'&&item.requestedRange.preMs==='0'),'D3D-02 문자열 시간·요청축 보존');
  for(const output of seed.outputs){const response=await fetch(`${baseUrl}/ops/api/recordings/media/${output.id}`),body=Buffer.from(await response.arrayBuffer());
    check(response.status===200&&response.headers.get('content-type')===output.contentType&&body.length===output.sizeBytes&&crypto.createHash('sha256').update(body).digest('hex')===output.sha256,'D3D-04 actual Event output 전체 byte/hash·MIME');}
  check(!JSON.stringify(timeline).includes('absolutePath') && !JSON.stringify(timeline).includes(repo) && !JSON.stringify(timeline).includes('mediaRelpath'), 'I17 HTTP 내부 path 비노출');
  for (const query of ['', '?channelId=1&startTimeMs=-1&endTimeMs=10000', '?channelId=1&startTimeMs=10000&endTimeMs=1000', '?channelId=1&startTimeMs=1&endTimeMs=18446744073709551616', '?channelId=1&startTimeMs=1&endTimeMs=10000&limit=0']) {
    const response = await fetch(`${baseUrl}/ops/api/recordings/timeline${query}`);
    check(response.status === 400, `I04 HTTP 잘못된 query 거부 ${checks}`);
    await response.arrayBuffer();
  }
  const url = `${baseUrl}/ops/api/recordings/media/${seed.outputs[0].id}`;
  for (const name of ['Range', 'range', 'rAnGe']) {
    const response = await fetch(url, { headers: { [name]: 'bytes=2-5' } });
    const body = Buffer.from(await response.arrayBuffer());
    check(response.status === 206, `I20 ${name} status expected=206 actual=${response.status}`);
    check(response.headers.get('content-range') === `bytes 2-5/${expected.length}`, `I20 ${name} Content-Range 일치`);
    check(body.equals(expected.subarray(2, 6)), `I20 ${name} body expected=4 actual=${body.length} byte 일치`);
  }
  for (const [range, start, end] of [['bytes=2-5', 2, 6], ['bytes=10-', 10, expected.length], ['bytes=-7', expected.length - 7, expected.length]]) {
    const response = await fetch(url, { headers: { Range: range } });
    const body = Buffer.from(await response.arrayBuffer());
    check(response.status === 206 && response.headers.get('content-range') === `bytes ${start}-${end - 1}/${expected.length}` && response.headers.get('accept-ranges') === 'bytes' && body.equals(expected.subarray(start, end)), `I20/I21 실제 Range ${range}`);
  }
  const full = await fetch(url);
  check(full.status === 200 && full.headers.get('content-type') === seed.outputs[0].contentType && Buffer.from(await full.arrayBuffer()).equals(expected), 'I24 HTTP 전체 byte 일치');
  for (const range of ['bytes=1-0', 'bytes=-0', 'bytes=0-1,3-4', 'bytes=18446744073709551616-', `bytes=0-${expected.length}`, 'invalid']) {
    const response = await fetch(url, { headers: { Range: range } });
    check(response.status === 416 && response.headers.get('content-range') === `bytes */${expected.length}`, `I22 HTTP 범위 거부 ${range}`);
    await response.arrayBuffer();
  }
  for (const range of ['', 'bytes=2-5']) {
    const response = await fetch(url, { method: 'HEAD', headers: range ? { Range: range } : {} });
    check(response.status === (range ? 206 : 200) && Number(response.headers.get('content-length')) === (range ? 4 : expected.length) && (await response.arrayBuffer()).byteLength === 0, `I23 실제 HEAD ${range || 'full'}`);
  }
  const missing = await fetch(`${baseUrl}/ops/api/recordings/media/not-found`);
  check(missing.status === 404, 'I17 HTTP 없는 opaque ID 거부');
  await missing.arrayBuffer();
  console.log(`[S06 HTTP API] checks=${checks} fail=0 authMode=off roleTests=NOT_RUN`);
}

const authPasswordNames = ['MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD', 'MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD', 'MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD', 'MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE', 'MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO'];
function authPasswords() {
  const values = authPasswordNames.map(name => process.env[name]);
  assert(values.every(value => typeof value === 'string' && value.length >= 12) && new Set(values).size === 5,
    '인증 검증은 서로 다른 password 환경변수 5개가 필요함. 값은 출력하지 않음');
  return values;
}

export function uiAuthPreparationOptions(args) {
  assert((args.length === 2 || (args.length === 3 && args[2] === '--ui-seek-fixture')) && args[0] === '--ui-anchor-utc-ms', 'UI anchor required: --ui-anchor-utc-ms VALUE [--ui-seek-fixture]');
  assert(/^\d+$/.test(args[1]), 'invalid UI anchor');
  const anchor = Number(args[1]);
  assert(Number.isSafeInteger(anchor) && anchor >= 946684800000 && anchor <= 4102444800000, 'invalid UI anchor');
  return Object.freeze({anchor, holdMs: 60 * 60 * 1000,seekFixture:args.length===3});
}

export function validateUiSeekProbe(probe) {
  const streams=probe.streams;
  assert(Array.isArray(streams)&&streams.length===1&&streams[0].codec_type==='video'&&streams[0].codec_name==='h264'&&streams[0].width===1280&&streams[0].height===720,'seek fixture stream contract');
  const duration=Number(probe.format?.duration);
  assert(Number.isFinite(duration)&&duration>=9.95&&duration<=10.10,'seek fixture duration');
  assert(Array.isArray(probe.packets)&&probe.packets.length>0&&typeof probe.packets[0].flags==='string'&&probe.packets[0].flags.includes('K'),'seek fixture first keyframe');
  return {duration,width:1280,height:720,codec:'h264',audio:false,firstKeyframe:true};
}

export function createUiSeekFixture(root) {
  assert(fs.lstatSync(root).isDirectory()&&!fs.lstatSync(root).isSymbolicLink(),'seek fixture root');
  const owned=fs.realpathSync(root),inputDir=path.join(owned,'input');
  assert(fs.lstatSync(inputDir).isDirectory()&&!fs.lstatSync(inputDir).isSymbolicLink()&&fs.realpathSync(inputDir)===inputDir,'seek fixture input directory');
  const source=path.join(repo,'video/imports/va_tracking_event_1280x720_30fps_h264.mp4');
  assert(fs.lstatSync(source).isFile()&&!fs.lstatSync(source).isSymbolicLink(),'seek fixture source');
  const file=path.join(inputDir,'seek-event.mp4');
  const env={PATH:process.env.PATH||'/usr/bin:/bin',TMPDIR:path.join(owned,'tmp'),LANG:'C'};
  try {
    execFileSync('ffmpeg',['-nostdin','-v','error','-n','-i',source,'-t','10','-map','0:v:0','-an','-c:v','copy','-movflags','+faststart','-fs',String(16*1024*1024),file],{env,timeout:30000,maxBuffer:65536,stdio:['ignore','pipe','pipe']});
    const stat=fs.lstatSync(file);
    assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.size>0&&stat.size<=16*1024*1024,'seek fixture output size');
    const raw=execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-show_packets','-read_intervals','%+#1','-of','json',file],{env,timeout:30000,maxBuffer:65536,encoding:'utf8'});
    return {file,sizeBytes:stat.size,...validateUiSeekProbe(JSON.parse(raw))};
  } catch {throw new Error('seek fixture generation or validation failed');}
}

export function createUiAuthPasswords() {
  const values = Array.from({length: 5}, () => crypto.randomBytes(24).toString('base64url'));
  assert(new Set(values).size === 5, 'temporary credential collision');
  return values;
}

export function uiSeedEnvironment(anchor = null, inherited = process.env, seekFile = null) {
  const env = {...inherited};
  delete env.MEDIA_SERVER_VERIFY_RECORDING_UI_ANCHOR_UTC_MS;
  delete env.MEDIA_SERVER_VERIFY_RECORDING_UI_EVENT_MEDIA;
  for (const key of authPasswordNames) delete env[key];
  if (anchor !== null) env.MEDIA_SERVER_VERIFY_RECORDING_UI_ANCHOR_UTC_MS = String(anchor);
  if (anchor !== null && seekFile !== null) env.MEDIA_SERVER_VERIFY_RECORDING_UI_EVENT_MEDIA = seekFile;
  return env;
}

export function writeUiLoginHandoff(root, accounts) {
  assert(fs.lstatSync(root).isDirectory() && !fs.lstatSync(root).isSymbolicLink(), 'handoff root invalid');
  const file = path.join(fs.realpathSync(root), 'ui-login-once.json');
  fs.writeFileSync(file, JSON.stringify({accounts}), {flag:'wx',mode:0o600});
  assert((fs.lstatSync(file).mode & 0o777) === 0o600, 'handoff permissions invalid');
  return file;
}

export function uiLiveSource(id, file, blocked = false) {
  assert(['3','4'].includes(id) && file === `s06-channel-${id}.mp4`, 'invalid UI live source');
  return {sourceId:id,displayName:`S09 UI ${id}`,kind:'file',file,enabled:true,
    recording:{enabled:true,continuousMaxBytes:(blocked?1:128)*1024*1024,eventMaxBytes:128*1024*1024,
      continuousMaxAgeMs:3600000,eventMaxAgeMs:3600000,revision:1}};
}

export async function bootstrapRecordingUiAuth(baseUrl, passwords, fetchImpl = fetch) {
  assert(passwords.length === 5 && passwords.every(x => typeof x === 'string' && x.length >= 12) && new Set(passwords).size === 5, 'invalid temporary credentials');
  const call = async (route, options = {}) => {
    try { return await fetchImpl(`${baseUrl}${route}`, { ...options, redirect: 'manual', signal: AbortSignal.timeout(5000) }); }
    catch { const error = new Error('auth request failed'); error.uiStage = route === '/setup' ? 'setup' : route === '/login' ? 'login' : route === '/ops/api/users' ? 'users' : 'request'; throw error; }
  };
  const form = async (route, values) => call(route, { method: 'POST', body: new URLSearchParams(values) });
  const setup = await form('/setup', { username: 'admin', password: passwords[0], confirm: passwords[0] });
  assert(setup.status === 302, `인증 fixture setup 실패 status=${setup.status}`);
  await setup.arrayBuffer();
  const login = async (username, password) => {
    const response = await form('/login', { username, password });
    assert(response.status === 302, `인증 fixture login 실패 status=${response.status}`);
    const cookie = response.headers.getSetCookie().map(value => value.split(';', 1)[0]).join('; ');
    await response.arrayBuffer();
    assert(cookie.length > 0, '인증 fixture session cookie 누락');
    return cookie;
  };
  const admin = await login('admin', passwords[0]);
  const jsonPost = async (route, body) => {
    const response = await call(route, { method: 'POST', headers: { Cookie: admin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert(response.ok, `인증 fixture POST 실패 route=${route} status=${response.status}`);
    await response.arrayBuffer();
  };
  const users = [
    ['s06-operator', 'operator', ['ops:read', 'source:read:1']],
    ['s06-viewer', 'viewer', ['view:read:1']],
    ['s06-no-source', 'operator', ['ops:read']],
    ['s06-no-ops', 'operator', ['source:read:1']],
  ];
  const cookies = [admin];
  for (const [index, [username, role, scopes]] of users.entries()) {
    await jsonPost('/ops/api/users', { username, displayName: username, role, scopes, password: passwords[index + 1], enabled: true, mustChangePassword: false });
    cookies.push(await login(username, passwords[index + 1]));
  }
  return {cookies, call, accounts: [{username:'admin',role:'admin',password:passwords[0]},
    ...users.map(([username,role,scopes],index)=>({username,role,scopes,password:passwords[index+1]}))]};
}

async function verifyRecordingHttpAuth(baseUrl, root, seed, passwords) {
  let checks = 0;
  const check = (condition, label) => { assert(condition, label); checks += 1; console.log(`[auth-subcheck] PASS ${label}`); };
  const {cookies,call} = await bootstrapRecordingUiAuth(baseUrl, passwords);
  const routes = ['/ops/api/recordings/status', seedTimelinePath(seed), `/ops/api/recordings/media/${seed.outputs[0].id}`];
  for (const [index, cookie] of cookies.entries()) {
    for (const [routeIndex, route] of routes.entries()) {
      const expectedStatus = index <= 1 ? 200 : index === 3 ? [200, 403, 404][routeIndex] : 403;
      const response = await call(route, { headers: { Cookie: cookie } });
      const body = Buffer.from(await response.arrayBuffer());
      check(response.status === expectedStatus, `I12~I16 principal ${index} route ${routeIndex} expected=${expectedStatus} actual=${response.status}`);
      if (routeIndex === 0 && response.status === 200) {
        const status = JSON.parse(body.toString());
        const expectedChannels = index === 0 ? ['1', '2'] : index === 1 ? ['1'] : [];
        check(JSON.stringify(status.channels.map(channel => channel.channelId).sort()) === JSON.stringify(expectedChannels), `I02 principal ${index} 허용 채널만 status 반환`);
        check(status.channels.every(channel => channel.active === false && channel.enabled === false), `I01 principal ${index} 실제 비녹화 상태`);
        if (index === 0) {
          check(status.observations !== null && typeof status.observations === 'object', 'S07-http-observations-global');
        } else {
          check(!Object.hasOwn(status, 'observations'), `S07-http-observations-limited principal ${index}`);
        }
      }
      if (routeIndex < 2) check(!/passwordHash|passwordHistory|tokenHash|mediaRelpath|absolutePath/.test(body.toString()), `I02/I17 principal ${index} route ${routeIndex} 민감 field 비노출`);
    }
  }
  for (const route of routes) {
    const response = await call(route);
    check(response.status === 401, `I15 미인증 API expected=401 actual=${response.status}`);
    await response.arrayBuffer();
  }
  const deniedChannel = await call('/ops/api/recordings/timeline?channelId=2&startTimeMs=1000&endTimeMs=10000', { headers: { Cookie: cookies[1] } });
  check(deniedChannel.status === 403, 'I16 operator의 다른 채널 조회 거부');
  await deniedChannel.arrayBuffer();
  const page = await call('/ops/events', { headers: { Cookie: cookies[2] } });
  check(page.status !== 200 && !(await page.text()).includes('ops-recording-timeline'), `I34 viewer 녹화 화면 거부 status=${page.status}`);
  const store = fs.readFileSync(path.join(root, 'data/users.json'), 'utf8');
  check(passwords.every(value => !store.includes(value)), 'I17 인증 fixture plaintext 저장 없음');
  console.log(`[S06 HTTP AUTH] checks=${checks} fail=0 actualUiActions=NOT_RUN`);
}

// 서버의 수용 판정 대신 사용하지 않는다. 이미 기동된 격리 fixture의 실제 hold cache를 관측한다.
export function readRecordingLifecycleHold(root, segmentId) {
  const recordings=path.join(root,'recordings');
  const markerPath=path.join(recordings,'.recording-store-format');
  const markerStat=fs.lstatSync(markerPath);
  assert(markerStat.isFile()&&!markerStat.isSymbolicLink()&&markerStat.nlink===1,'lifecycle marker binding');
  const marker=JSON.parse(fs.readFileSync(markerPath,'utf8'));
  const generation=marker.format==='media-server.managed-recording-store.v2';
  assert(generation||marker.format==='media-server.managed-recording-store.v1','lifecycle managed format');
  assert(fs.existsSync(path.join(recordings,'recording-generation.json'))===generation,'lifecycle manifest format mismatch');
  assert(typeof segmentId==='string'&&segmentId.length>0,'lifecycle segment ID');
  const escaped=segmentId.replaceAll("'","''");
  const database=path.join(recordings,generation?'recording-generation-catalog.sqlite3':'recording-catalog.sqlite3');
  const stat=fs.lstatSync(database);
  assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1,'lifecycle cache binding');
  const query=generation?`SELECT count FROM b_hold WHERE id='${escaped}';`:
    `SELECT hold_count FROM recording_segment_states_v2 WHERE segment_id='${escaped}';`;
  const value=execFileSync('/usr/bin/sqlite3',['-readonly',database,query],{encoding:'utf8'}).trim();
  assert(/^(0|[1-9][0-9]*)$/.test(value)&&Number.isSafeInteger(Number(value)),'lifecycle hold row missing or invalid');
  return Number(value);
}

async function verifyRecordingHttpLifecycle(baseUrl, seed, root, child) {
  let checks = 0;
  const check = (condition, label) => { assert(condition, label); checks++; console.log(`[lifecycle-subcheck] PASS ${label}`); };
  assert(seed.transport,'transport fixture required');
  const fixture=path.join(root,'recordings',seed.transport.relativePath);
  const url = `${baseUrl}/ops/api/recordings/media/${seed.transport.id}`;
  const hold = () => readRecordingLifecycleHold(root,seed.transport.id);
  const waitHold = async expected => {
    for (let n = 0; n < 100; n++) {
      if (hold() === expected) return true;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    return false;
  };
  const expectedHash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(fixture)) expectedHash.update(chunk);
  const expectedSize = fs.statSync(fixture).size;
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  check(response.status === 200 && Number(response.headers.get('content-length')) === expectedSize, 'I24 큰 파일 status/길이');
  const actualHash = crypto.createHash('sha256');
  let bytes = 0;
  for await (const chunk of response.body) { bytes += chunk.length; actualHash.update(chunk); }
  check(bytes === expectedSize && actualHash.digest('hex') === expectedHash.digest('hex'), 'I24 64MiB 전체 streaming hash 일치');
  check(await waitHold(0), 'I25 전체 응답 뒤 hold0');
  const first = 256 * 1024 - 8, last = first + 31;
  const ranged = await fetch(url, { headers: { Range: `bytes=${first}-${last}` }, signal: AbortSignal.timeout(5000) });
  const expected = Buffer.alloc(32), fd = fs.openSync(fixture, 'r');
  try { assert(fs.readSync(fd, expected, 0, 32, first) === 32, 'fixture Range read'); } finally { fs.closeSync(fd); }
  check(ranged.status === 206 && Buffer.from(await ranged.arrayBuffer()).equals(expected), 'I24 256KiB 경계 Range byte 일치');
  const sockets = new Set();
  const pausedRequest = () => new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const socket = net.createConnection({ host: parsed.hostname, port: Number(parsed.port) });
    sockets.add(socket);
    const timer = setTimeout(() => { socket.destroy(); reject(new Error('느린 수신 fixture 시작 시간 초과')); }, 5000);
    socket.on('error', error => { clearTimeout(timer); reject(error); });
    socket.once('connect', () => socket.write(`GET ${parsed.pathname} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`));
    socket.once('data', () => { clearTimeout(timer); socket.pause(); resolve(socket); });
  });
  try {
    const interrupted = await pausedRequest();
    check(await waitHold(1), 'I26 disconnect 전 실제 hold1');
    interrupted.destroy();
    check(await waitHold(0), 'I26 disconnect 뒤 실제 hold0');
    check((await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(3000) })).status === 200, 'I26 disconnect 뒤 서버 health200');
    await pausedRequest();
    check(await waitHold(1), 'I26 서버 종료 전 실제 hold1');
    const stopped = await stopServer(child);
    check(stopped.exited && !stopped.forced && stopped.exitCode === 0, 'I26 활성 전송 중 정상 종료');
    check(hold() === 0, 'I26 정상 종료 후 영속 hold0');
  } finally { for (const socket of sockets) socket.destroy(); }
  console.log(`[S06 HTTP lifecycle] checks=${checks} fail=0 codecPlayback=NOT_RUN`);
}

export async function runVerifier(requestedMode = process.argv[2] || "--full") {
  const startedAt = Date.now();
  const mode = requestedMode;
  const allowedModes = new Set(["--red-status", "--red-http-baseline", "--full", "--http-api", "--http-auth", "--ui-direct", "--ui-auth-direct", "--http-lifecycle"]);
  if (!allowedModes.has(mode)) throw new Error(`지원하지 않는 mode: ${mode}`);
  const uiAuth = mode === '--ui-auth-direct' ? uiAuthPreparationOptions(process.argv.slice(3)) : null;
  const uiDirect = mode === '--ui-direct' && process.argv.length > 3 ? uiAuthPreparationOptions(process.argv.slice(3)) : null;
  if (!uiAuth && !uiDirect && process.argv.slice(3).includes('--ui-seek-fixture')) throw new Error('seek fixture requires UI anchor');
  const httpPasswords=mode==='--http-auth'?createUiAuthPasswords():null;
  let httpSeed=null;
  let currentUiSeed=null;

  let root = "";
  let rtspPort = 0;
  let httpPort = 0;
  let child;
  let primaryError;
  let cleanupError;
  let cleanupResult;
  let uiProxy;
  let uiUdp;
  let uiUdpPort = 0;
  let uiUdpClosed = true;
  let uiStage = 'seed';
  const uiLogReport = {truncated:false,droppedBytes:0,writeFailed:false};

  try {
    const tmpRoot = fs.realpathSync(os.tmpdir());
    root = fs.mkdtempSync(path.join(tmpRoot, "media-server-v410-s06-"));
    root = fs.realpathSync(root);
    for (const directory of ["data", "input", "events/clips", "events/snapshots", "recordings", "tmp", "gst-cache"]) {
      fs.mkdirSync(path.join(root, directory), { recursive: true });
    }
    let fixture = path.join(repo, "video/sample_h264_video_only.mp4");
    assert(fs.statSync(fixture).isFile(), `유효 media fixture가 없음: ${fixture}`);
    fs.copyFileSync(fixture, path.join(root, "input/sample_h264_video_only.mp4"));
    const sources = (mode === '--http-auth' || mode === '--ui-direct' || uiAuth)
      ? ['1', '2'].map(id => ({ sourceId: id, displayName: `S06 channel ${id}`, kind: 'file', file: `s06-channel-${id}.mp4`, enabled: false, recording: { enabled: false } }))
      : [];
    for (const source of sources) fs.copyFileSync(fixture, path.join(root, 'input', source.file));
    if (uiAuth) for (const id of ['3','4']) fs.copyFileSync(fixture,path.join(root,'input',`s06-channel-${id}.mp4`));
    fs.writeFileSync(path.join(root, "data/sources.json"), JSON.stringify({ sources }));
    fs.writeFileSync(path.join(root, "data/views.json"), JSON.stringify({ views: [] }));
    const seekFixture = (uiAuth || uiDirect)?.seekFixture ? createUiSeekFixture(root) : null;
    if(['--http-api','--http-auth','--http-lifecycle'].includes(mode)){
      const manifest=path.join(root,'seed-manifest.json');
      execFileSync('bash',[path.join(repo,'scripts/internal/verify_recording_http_seed.sh'),path.join(root,'recordings'),manifest,mode==='--http-lifecycle'?'1':'0'],
        {cwd:repo,stdio:'inherit',env:uiSeedEnvironment()});
      httpSeed=validateHttpSeedManifest(root,JSON.parse(fs.readFileSync(manifest,'utf8')));
      console.log('[seed-subcheck] PASS D3D-01 generated2출력 manifest/containment/hash');
    } else if (mode === '--ui-direct' || uiAuth) {
      const manifest=path.join(root,'ui-seed-manifest.json');
      execFileSync('bash', [path.join(repo, 'scripts/internal/verify_recording_current_ui_seed.sh'), path.join(root, 'recordings'),manifest,
        uiAuth?String(uiAuth.anchor):uiDirect?String(uiDirect.anchor):'unknown',seekFixture?.file??'none'], { cwd: repo, stdio: 'inherit',env:uiSeedEnvironment() });
      currentUiSeed=JSON.parse(fs.readFileSync(manifest,'utf8'));
      validateCurrentUiSeed(root,currentUiSeed);
      console.log('[ui-seed] current-managed; mapping units; seek=original-MP4; events=derived-fMP4; actualUiPass=false');
      console.log('[ui-seed-selection] '+JSON.stringify({seekSegmentId:currentUiSeed.seek?.id??null,
        eventOutputIds:currentUiSeed.jobs.filter(job=>['full','partial'].includes(job.name)).map(job=>({scenario:job.name,ids:job.outputs.map(output=>output.id)})),actualUiPass:false}));
    }
    rtspPort = await reservePort();
    httpPort = await reservePort();

    const binary = path.join(repo, "build-gst-onnx/media_server");
    assert(fs.existsSync(binary) && fs.statSync(binary).isFile() && (fs.statSync(binary).mode & 0o111) !== 0,
      `기존 baseline binary가 없음: ${binary}`);
    assert(fs.realpathSync(binary) === path.join(repo, "build-gst-onnx/media_server"),
      "검증 binary가 고정 제품 경로와 다름");
    const isolatedEnv = isolatedEnvironment(root, binary, rtspPort, httpPort);
    if (uiAuth) {
      uiUdp = dgram.createSocket('udp4');
      uiUdpClosed = false;
      await new Promise((resolve, reject) => {
        uiUdp.once('error', reject);
        uiUdp.bind(0, '127.0.0.1', resolve);
      });
      uiUdpPort = uiUdp.address().port;
    }
    const env = (mode === '--http-auth' || uiAuth)
      ? Object.freeze({ ...isolatedEnv, MEDIA_SERVER_AUTH_MODE: 'auto',
        ...(uiAuth ? {MEDIA_SERVER_WEBRTC_STUN_SERVER:`stun://127.0.0.1:${uiUdpPort}`,MEDIA_SERVER_WEBRTC_TURN_SERVER:''} : {}) })
      : mode === '--ui-direct'
        ? Object.freeze({ ...isolatedEnv, MEDIA_SERVER_ENABLE_LAB: '1' })
        : isolatedEnv;
    if (uiAuth) assertLocalIceEnvironment(env, uiUdpPort);
    const logState = { lineCount: 0, processErrorCode: "" };
    uiStage = 'spawn';
    const privateLog = uiAuth ? path.join(root,'server-private.log') : null;
    if (privateLog) fs.writeFileSync(privateLog,'',{flag:'wx',mode:0o600});
    let privateLogBytes = 0;
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
        if (privateLog) {
          try {
            if (privateLogBytes + Buffer.byteLength(chunk) > 4 * 1024 * 1024) {
              uiLogReport.truncated=true;uiLogReport.droppedBytes+=Buffer.byteLength(chunk);throw Error('private log limit');
            }
            fs.appendFileSync(privateLog,chunk); privateLogBytes += Buffer.byteLength(chunk);
          } catch { logState.privateLogFailed = true; uiLogReport.writeFailed=true; }
        }
      });
    }
    await spawned;
    child.on("error", error => {
      logState.processErrorCode = error?.code || "unknown";
    });
    const baseUrl = `http://127.0.0.1:${httpPort}`;
    uiStage = 'ready';
    await waitReady(baseUrl, child, logState);

    if (mode === '--http-lifecycle') {
      await verifyRecordingHttpLifecycle(baseUrl, httpSeed, root, child);
    } else if (mode === '--ui-direct' || uiAuth) {
      if (uiAuth) {
        uiStage = 'bootstrap';
        const auth = await bootstrapRecordingUiAuth(baseUrl, createUiAuthPasswords());
        uiStage = 'ice';
        const iceResponse = await auth.call('/webrtc/config', {headers:{Cookie:auth.cookies[0]}});
        assert(iceResponse.ok, 'UI local ICE response failed');
        assertLocalIceConfig(await iceResponse.json(), uiUdpPort);
        uiStage = 'source';
        for (const id of ['3','4']) {
          const response = await auth.call('/ops/api/sources',{method:'POST',headers:{Cookie:auth.cookies[0],'Content-Type':'application/json'},
            body:JSON.stringify(uiLiveSource(id,`s06-channel-${id}.mp4`,id==='4'))});
          assert(response.ok,'UI live source preparation failed'); await response.arrayBuffer();
        }
        writeUiLoginHandoff(root, auth.accounts);
        uiStage = 'proxy';
        uiProxy = await startRecordingUiRangeProxy({root,upstreamPort:httpPort});
        console.log(JSON.stringify({ready:true,baseUrl:uiProxy.baseUrl,observationPath:uiProxy.logPath,root,anchorUtcMs:uiAuth.anchor,accounts:auth.accounts.map(x=>x.username),actualUiPass:false}));
      } else console.log(`[S06 UI direct 준비] ${baseUrl}/ops/events ; 종료 시 stdin에 줄바꿈. UI PASS를 자동 판정하지 않음.`);
      uiStage = 'hold';
      await new Promise((resolve, reject) => {
        const finish = error => {
          clearTimeout(timer);
          if (logMonitor) clearInterval(logMonitor);
          child.removeListener('exit',onExit);
          process.stdin.removeListener('data', onData);
          process.stdin.removeListener('end', onEnd);
          process.stdin.pause();
          if (error) reject(error); else resolve();
        };
        const onData = () => finish();
        const onEnd = () => finish(new Error('UI 확인 종료 입력 전 stdin 종료'));
        const onExit = () => finish(new Error('UI preparation server exited'));
        const timer = setTimeout(() => finish(new Error(uiAuth ? 'UI 확인 60분 제한 도달' : 'UI 확인 15분 제한 도달')), uiAuth ? uiAuth.holdMs : 15 * 60 * 1000);
        const logMonitor = uiAuth ? setInterval(() => {if(logState.privateLogFailed||uiProxy?.failure)finish(new Error('private observation unavailable'));},250) : null;
        if (uiAuth) child.once('exit',onExit);
        process.stdin.once('data', onData);
        process.stdin.once('end', onEnd);
        process.stdin.resume();
      });
    } else if (mode === '--http-auth') {
      await verifyRecordingHttpAuth(baseUrl, root, httpSeed, httpPasswords);
    } else if (mode === '--http-api') {
      await verifyRecordingHttpApi(baseUrl, root, httpSeed);
    } else if (mode === "--red-status") {
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
    const stage = ['setup','login','users'].includes(error.uiStage) ? error.uiStage : uiStage;
    const code = ['EPERM','EACCES','ENOENT','EADDRINUSE'].includes(error.code) ? error.code : 'PREPARATION_FAILED';
    primaryError = uiAuth ? new Error(`UI auth preparation failed stage=${stage} code=${code}`) : error;
  }

  const cleanupStartedAt = Date.now();
  if (uiAuth) console.log(JSON.stringify({uiPreparationLog:uiLogReport,actualUiPass:false}));
  try {
    cleanupResult = await finishRecordingUiProxy(uiProxy, () => cleanupHarnessResources({ child, rtspPort, httpPort, root }));
  } catch (error) {
    cleanupError = error;
    cleanupResult = error.cleanupReport;
  }
  if (uiUdp) {
    try {
      await new Promise((resolve, reject) => {
        try { uiUdp.close(resolve); } catch (error) {
          if (error.code === 'ERR_SOCKET_DGRAM_NOT_RUNNING') resolve(); else reject(error);
        }
      });
      uiUdpClosed = true;
    } catch {
      cleanupError = cleanupError || new Error('UI UDP cleanup failed');
    }
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
    ...(uiAuth ? {uiUdpClosed} : {}),
  };
  if (cleanupError) {
    console.error(`[cleanup] FAIL ${JSON.stringify(cleanupPayload)}`);
  } else {
    console.log(`[cleanup] PASS ${JSON.stringify(cleanupPayload)}`);
  }
  if(httpPasswords)httpPasswords.fill(''); // 보유 참조를 해제하며 메모리 소거 보장으로 표현하지 않는다.
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
