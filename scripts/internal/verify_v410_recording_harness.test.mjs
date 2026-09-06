// 파일 용도: S06 verifier의 자원 정리·종료·port 부재 판정 경계를 실제 helper 호출로 검증한다.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  assertPortClosed,
  cleanupHarnessResources,
  stopServer,
} from "./verify_v410_recording_ui_contract.mjs";

const selected = process.argv[2] || "all";
assert(["H01", "H02", "H03", "H03-R01", "H03-R02", "all"].includes(selected),
  "사용법: [H01|H02|H03|H03-R01|H03-R02|all]");

async function verifyH01CleanupContinuesAfterFailure() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-v410-s06-h01-"));
  fs.writeFileSync(path.join(root, "owned.txt"), "test-owned\n");
  let closeChecks = 0;
  let cleanupError;
  let helperCleanupReport;
  try {
    try {
      await cleanupHarnessResources(
        { child: null, rtspPort: 41001, httpPort: 41002, root },
        {
          assertPortClosed: async () => {
            closeChecks += 1;
            if (closeChecks === 1) throw new Error("injected first cleanup error");
            return { closed: true, evidence: "ECONNREFUSED" };
          },
        },
      );
    } catch (error) {
      cleanupError = error;
      helperCleanupReport = error.cleanupReport;
    }
    assert.match(cleanupError?.message || "", /injected first cleanup error/,
      "H01 최초 cleanup 오류를 보존하지 않음");
    assert.equal(closeChecks, 2, "H01 최초 cleanup 오류 뒤 후속 port 정리를 시도하지 않음");
    assert.equal(fs.existsSync(root), false, "H01 최초 cleanup 오류 뒤 test-owned root를 삭제하지 않음");
    console.log(`[harness-test-cleanup] H01 ${JSON.stringify({
      root,
      rootBeforeBytes: helperCleanupReport?.rootBefore?.bytes ?? null,
      rootBeforeEntries: helperCleanupReport?.rootBefore?.entries ?? null,
      symlinksNotFollowed: helperCleanupReport?.rootBefore?.symlinks ?? null,
      helperRootAbsent: helperCleanupReport?.rootAbsent ?? false,
    })}`);
    return 4;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    assert.equal(fs.existsSync(root), false, "H01 테스트 자체 temp root cleanup 실패");
    console.log(`[harness-test-cleanup] H01 finalRootAbsent=true root=${JSON.stringify(root)}`);
  }
}

async function startTerminableNodeChild() {
  const child = spawn(process.execPath, [
    "-e",
    "process.on('SIGTERM',()=>process.exit(0));process.stdout.write('ready\\n');setInterval(()=>{},1000)",
  ], { stdio: ["ignore", "pipe", "ignore"] });
  await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.stdout.once("data", resolve);
  });
  return child;
}

class ForcedExitChild extends EventEmitter {
  constructor() {
    super();
    this.exitCode = null;
    this.signalCode = null;
  }

  kill(signal) {
    if (signal === "SIGKILL") {
      this.signalCode = "SIGKILL";
      queueMicrotask(() => this.emit("exit", null, "SIGKILL"));
    }
    return true;
  }
}

async function verifyH02ForcedTerminationIsFailure() {
  const child = await startTerminableNodeChild();
  let result;
  try {
    result = await stopServer(child, { graceMs: 1000 });
    assert.equal(result.forced, false, "H02 정상 SIGTERM 종료를 강제 종료로 기록함");
    assert.equal(child.exitCode, 0, "H02 실제 Node child의 정상 SIGTERM exit를 관찰하지 못함");
    assert.equal(child.signalCode, null, "H02 정상 종료가 signal 종료로 기록됨");
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = new Promise(resolve => child.once("exit", resolve));
      child.kill("SIGKILL");
      await Promise.race([
        exited,
        new Promise((_, reject) => setTimeout(() => reject(new Error("H02 test-owned child cleanup timeout")), 1000)),
      ]);
    }
  }
  console.log(`[harness-test-cleanup] H02 ${JSON.stringify({
    pid: child.pid,
    exitCode: child.exitCode,
    signalCode: child.signalCode,
    graceful: result?.forced === false,
  })}`);

  const forced = new ForcedExitChild();
  await assert.rejects(
    () => stopServer(forced, { graceMs: 5 }),
    /강제 종료/,
    "H02 SIGKILL fallback을 정상 cleanup으로 반환함",
  );
  const alreadySignaled = new ForcedExitChild();
  alreadySignaled.signalCode = "SIGTERM";
  await assert.rejects(
    () => stopServer(alreadySignaled, { graceMs: 5 }),
    /비정상 종료/,
    "H02 이미 signal 종료된 child를 정상 cleanup으로 반환함",
  );
  return 5;
}

function fakeConnect(outcome) {
  return () => {
    const socket = new EventEmitter();
    socket.destroy = () => {};
    socket.setTimeout = (_milliseconds, callback) => {
      if (outcome === "timeout") queueMicrotask(callback);
    };
    if (outcome !== "timeout") {
      const error = Object.assign(new Error(outcome), { code: outcome });
      queueMicrotask(() => socket.emit("error", error));
    }
    return socket;
  };
}

async function verifyH03OnlyConnectionRefusedMeansClosed() {
  const [eperm, timeout, refused] = await Promise.allSettled([
    assertPortClosed(41003, { connect: fakeConnect("EPERM"), timeoutMs: 5 }),
    assertPortClosed(41004, { connect: fakeConnect("timeout"), timeoutMs: 5 }),
    assertPortClosed(41005, { connect: fakeConnect("ECONNREFUSED"), timeoutMs: 5 }),
  ]);
  assert.equal(eperm.status, "rejected", "H03 EPERM을 port closed로 처리함");
  assert.equal(timeout.status, "rejected", "H03 timeout을 port closed로 처리함");
  assert.equal(refused.status, "fulfilled", "H03 확정적 ECONNREFUSED를 port closed로 인정하지 않음");
  return 3;
}

async function verifyH03ConfirmedEvidenceReachesCleanupReport() {
  const checkClosed = port => assertPortClosed(port, {
    connect: fakeConnect("ECONNREFUSED"), timeoutMs: 5,
  });
  assert.deepEqual(await checkClosed(41005), { closed: true, evidence: "ECONNREFUSED" },
    "H03-R01 포트 확인 성공 증거가 호출자에게 반환되지 않음");
  const report = await cleanupHarnessResources(
    { child: null, rtspPort: 41006, httpPort: 41007, root: "" },
    { assertPortClosed: checkClosed },
  );
  assert.deepEqual(report.ports, [
    { kind: "rtsp", port: 41006, closed: true, evidence: "ECONNREFUSED" },
    { kind: "http", port: 41007, closed: true, evidence: "ECONNREFUSED" },
  ], "H03-R01 포트 확인 증거가 최종 정리 보고에 전달되지 않음");
  assert.equal(report.failureCount, 0, "H03-R01 확정된 두 포트 부재를 실패로 기록함");
  return 3;
}

async function verifyH03UnconfirmedEvidenceCannotPassCleanup() {
  const invalidResults = [
    undefined,
    {},
    { closed: false, evidence: "ECONNREFUSED" },
    { closed: true },
    { closed: true, evidence: "unconfirmed" },
  ];
  for (const result of invalidResults) {
    await assert.rejects(
      () => cleanupHarnessResources(
        { child: null, rtspPort: 41006, httpPort: 41007, root: "" },
        { assertPortClosed: async () => result },
      ),
      error => {
        assert.ok(error instanceof AggregateError, "H03-R02 정리 실패 집계를 누락함");
        assert.equal(error.cleanupReport.failureCount, 2, "H03-R02 미확인 포트를 실패 집계에서 누락함");
        assert.equal(error.cleanupReport.attempted, 2, "H03-R02 첫 실패 뒤 다음 포트를 확인하지 않음");
        assert.deepEqual(error.cleanupReport.ports, [
          { kind: "rtsp", port: 41006, closed: false, evidence: "unconfirmed" },
          { kind: "http", port: 41007, closed: false, evidence: "unconfirmed" },
        ], "H03-R02 미확인 증거를 성공 상태로 기록함");
        return true;
      },
      `H03-R02 미확인 포트 증거를 cleanup 성공으로 반환함: ${JSON.stringify(result)}`,
    );
  }
  return invalidResults.length * 5;
}

const cases = {
  H01: verifyH01CleanupContinuesAfterFailure,
  H02: verifyH02ForcedTerminationIsFailure,
  H03: verifyH03OnlyConnectionRefusedMeansClosed,
  "H03-R01": verifyH03ConfirmedEvidenceReachesCleanupReport,
  "H03-R02": verifyH03UnconfirmedEvidenceCannotPassCleanup,
};

const startedAt = Date.now();
let executed = 0;
let checks = 0;
for (const [name, test] of Object.entries(cases)) {
  if (selected !== "all" && selected !== name) continue;
  const caseStartedAt = Date.now();
  checks += await test();
  executed += 1;
  console.log(`[v410-s06-harness-unit] PASS ${name} elapsedMs=${Date.now() - caseStartedAt}`);
}
console.log(`[v410-s06-harness-summary] cases=${executed} checks=${checks} fail=0 elapsedMs=${Date.now() - startedAt}`);
