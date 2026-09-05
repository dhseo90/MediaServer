#!/usr/bin/env node
// 파일 용도: 실제 launcher wrapper를 fake binary/tool에 연결해 S05 lifecycle orchestration을 검증한다.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const runner = path.join(scriptDir, "verify_v410_s05_service_lifecycle.mjs");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-v410-lifecycle-test."));
let passed = 0;

function executable(target, body) {
  fs.writeFileSync(target, `#!/bin/bash\nset -euo pipefail\n${body}\n`, { mode: 0o700 });
}

function sha256(target) {
  return crypto.createHash("sha256").update(fs.readFileSync(target)).digest("hex");
}

function setupFixture(name, fault = "") {
  const base = path.join(temp, name);
  const tools = path.join(base, "tools");
  fs.mkdirSync(tools, { recursive: true });
  const binary = path.join(base, "media_server");
  const toolLog = path.join(base, "tools.log");
  executable(binary, `
runtime="\${MEDIA_SERVER_LIFECYCLE_RUNTIME_DIR:?}"
mkdir -p "$runtime"
generation=0
[[ ! -f "$runtime/generation" ]] || generation="$(cat "$runtime/generation")"
generation=$((generation + 1))
printf '%s' "$generation" > "$runtime/generation"
printf '%s' "$$" > "$runtime/current.pid"
trap 'exit 0' TERM INT
while true; do sleep 0.05; done`);
  executable(path.join(tools, "lsof"), `
printf 'lsof %s\\n' "$*" >> "\${FAKE_TOOL_LOG}"
pid_file="\${MEDIA_SERVER_LIFECYCLE_RUNTIME_DIR}/current.pid"
[[ -s "$pid_file" ]] || exit 1
pid="$(cat "$pid_file")"
kill -0 "$pid" 2>/dev/null || exit 1
printf 'p%s\\n' "$pid"`);
  executable(path.join(tools, "curl"), `
pid_file="\${MEDIA_SERVER_LIFECYCLE_RUNTIME_DIR}/current.pid"
[[ -s "$pid_file" ]] || exit 1
kill -0 "$(cat "$pid_file")" 2>/dev/null || exit 1
printf '{"status":"ok"}\\n'`);
  executable(path.join(tools, "ffprobe"), `
printf 'ffprobe %s\\n' "$*" >> "\${FAKE_TOOL_LOG}"
url="\${!#}"
case "$url" in
  *sample_h264.mp4*) test -s "\${MEDIA_SERVER_FILE_ROOT}/sample_h264.mp4" ;;
  *sample_h265.mp4*) test -s "\${MEDIA_SERVER_FILE_ROOT}/sample_h265.mp4" ;;
esac
exit 0`);
  executable(path.join(tools, "python3"), "exit 0");
  executable(path.join(tools, "ps"), `
pid=""
while [[ "$#" -gt 0 ]]; do
  if [[ "$1" == "-p" ]]; then pid="$2"; shift 2; continue; fi
  shift
done
[[ -n "$pid" ]] || exit 2
kill -0 "$pid" 2>/dev/null || exit 1
printf '1 S 00:00 %s\\n' "${binary}"`);
  executable(path.join(tools, "launchctl"), `
printf 'launchctl %s\\n' "$*" >> "\${FAKE_TOOL_LOG}"
runtime="\${MEDIA_SERVER_LIFECYCLE_RUNTIME_DIR}"
case "\${1:-}" in
  print)
    [[ -s "$runtime/label" && -s "$runtime/current.pid" ]] || exit 1
    [[ "\${2:-}" == *"/$(cat "$runtime/label")" ]] || exit 1
    kill -0 "$(cat "$runtime/current.pid")" 2>/dev/null
    ;;
  bootstrap)
    printf '%s' "\${MEDIA_SERVER_LAUNCHD_LABEL}" > "$runtime/label"
    nohup "\${MEDIA_SERVER_BIN_PATH}" >/dev/null 2>&1 &
    ;;
  bootout)
    if [[ -s "$runtime/current.pid" ]]; then
      pid="$(cat "$runtime/current.pid")"
      kill "$pid" 2>/dev/null || true
      for _ in {1..100}; do kill -0 "$pid" 2>/dev/null || break; sleep 0.02; done
    fi
    rm -f "$runtime/label"
    ;;
  *) exit 2 ;;
esac`);

  const driver = path.join(base, "driver.mjs");
  fs.writeFileSync(driver, `
import fs from "node:fs";
import path from "node:path";
const op=process.argv[2];
const input=JSON.parse(process.argv[3]||"{}");
const root=process.env.MEDIA_SERVER_LIFECYCLE_ROOT;
const runtime=process.env.MEDIA_SERVER_LIFECYCLE_RUNTIME_DIR;
const statePath=path.join(root,"fixture-service.json");
const read=()=>fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath,"utf8")):{sources:[],segments:[],events:[],links:[],tapCount:0,rule:false};
const write=value=>fs.writeFileSync(statePath,JSON.stringify(value));
const generation=()=>Number(fs.readFileSync(path.join(runtime,"generation"),"utf8"));
const result=value=>process.stdout.write(JSON.stringify(value));
const processAlive=()=>{try{const pid=Number(fs.readFileSync(path.join(runtime,"current.pid"),"utf8"));process.kill(pid,0);return true;}catch{return false;}};
const canonical=(event,source="9101")=>({schema:"media-server.event-recording-link.v1",link_id:event.recordingLinkId,event_id:event.eventId,source_id:source,channel_id:"9101",requested_range:null,media_pts_range_ms:{start_ms:1000,end_ms:2000},ordered_overlaps:[],derived_segment_id:null,fallback_evidence_id:"fallback-"+event.eventId,fallback_media_locator:"events/clips/"+event.eventId+"/manifest.json",missing_ranges:[],time_basis:"media-pts-ms",completeness_reason:"pending-with-provisional-frame-buffer-fallback",status:"pending",created_at_ms:1700000000000,updated_at_ms:1700000001000});
const state=read();
switch(op){
  case "health": result({ok:processAlive(),httpStatus:200,status:"ok"}); break;
  case "create-source": state.sources=[input.source];write(state);result({httpStatus:201,status:"created",source:input.source});break;
  case "list-sources": result({httpStatus:200,status:"ok",sources:state.sources});break;
  case "segments": {
    const gen=generation();
    for(let n=1;n<=gen;n+=1){const id="segment-"+n;if(!state.segments.some(x=>x.segment_id===id)){const rel="media/"+id+".mp4";fs.mkdirSync(path.join(root,"recordings/media"),{recursive:true});fs.writeFileSync(path.join(root,"recordings",rel),"fake-mp4-"+n);state.segments.push({segment_id:id,source_id:"9101",channel_id:"9101",retention_class:"continuous",lifecycle:"finalized",media_relpath:rel,size_bytes:10});}}
    write(state);result(state.segments);break;
  }
  case "put-rule": state.rule=true;write(state);result({httpStatus:200,status:"saved",id:"9101"});break;
  case "create-tap": state.tapCount+=1;write(state);result({httpStatus:200,status:"ok",tapId:"tap-"+state.tapCount,streamKey:"identity.mp4"});break;
  case "poll-event": {
    if(!state.rule)throw new Error("rule missing");
    const index=Number(String(input.tapId).split("-").at(-1));
    const event={eventId:"event-"+index,eventType:"presence",recordingLinkId:"link-"+index,channelId:"identity.mp4",streamId:"identity.mp4"};
    if(!state.events.some(x=>x.eventId===event.eventId)){state.events.push(event);const source=${JSON.stringify(fault)}==="bad-second-link"&&index===2?"wrong-source":"9101";const payload=canonical(event,source);state.links.push({link_id:event.recordingLinkId,event_id:event.eventId,channel_id:"9101",missing_ranges_json:JSON.stringify(payload)});write(state);}
    result({httpStatus:200,status:"ok",event});break;
  }
  case "links": result(state.links);break;
  case "delete-tap": result({httpStatus:200,status:"deleted",deleted:true});break;
  default: throw new Error("unknown fixture operation: "+op);
}`);
  const config = path.join(base, "fixture.json");
  fs.writeFileSync(config, JSON.stringify({
    schema: "media-server.v410-s05-lifecycle-fixture.v1",
    binary,
    toolsDir: tools,
    driver,
    toolLog,
  }));
  return { base, binary, config, toolLog };
}

function invoke(mode, fixture) {
  const output = path.join(fixture.base, `${mode}-report.json`);
  const before = sha256(fixture.binary);
  const run = spawnSync(process.execPath, [runner, "--mode", mode, "--fixture", fixture.config, "--output", output], {
    cwd: path.resolve(scriptDir, "../.."),
    env: { ...process.env, PATH: `${fixture.base}/tools:${process.env.PATH}` },
    encoding: "utf8",
    timeout: 30000,
  });
  const report = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output, "utf8")) : null;
  return { run, report, output, before, after: sha256(fixture.binary) };
}

function test(name, body) {
  body();
  passed += 1;
  console.log(`[S05 lifecycle fixture] PASS ${name}`);
}

try {
  test("nohup wrapper가 전체 lifecycle과 cleanup을 독립 통과한다", () => {
    const fixture = setupFixture("nohup");
    const { run, report, before, after } = invoke("nohup", fixture);
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.equal(report.mode, "nohup");
    assert.equal(report.outcome, "pass");
    assert.equal(report.stages.filter(row => row.result === "fail").length, 0);
    assert.equal(report.stages.filter(row => row.result === "skipped").length, 0);
    const restarted = report.stages.find(row => row.id === "restart");
    assert.equal(restarted.detail.observedPid, restarted.detail.oldPid);
    assert.equal(typeof restarted.detail.durationMs, "number");
    assert.equal(restarted.detail.forcedTermination, false);
    assert.ok(restarted.detail.processTransitions.some(entry => entry.alive === false));
    const stopped = report.stages.find(row => row.id === "normal-stop");
    assert.equal(stopped.detail.observedPid, stopped.detail.stoppedPid);
    assert.equal(typeof stopped.detail.durationMs, "number");
    assert.equal(stopped.detail.forcedTermination, false);
    assert.ok(stopped.detail.processTransitions.some(entry => entry.alive === false));
    assert.equal(stopped.detail.labelAbsent, true);
    assert.equal(stopped.detail.pidExited, true);
    assert.equal(stopped.detail.ports.every(entry => entry.pids.length === 0), true);
    assert.deepEqual(stopped.detail.stateResidue, []);
    assert.equal(typeof report.cleanup.sizes.log.bytes, "number");
    assert.equal(report.cleanup.removed, true);
    assert.equal(before, after);
    assert.equal(JSON.stringify(report).includes(temp), false);
  });

  test("launchd wrapper가 exact label로 두 번 bootstrap하고 cleanup한다", () => {
    const fixture = setupFixture("launchd");
    const { run, report } = invoke("launchd", fixture);
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.equal(report.mode, "launchd");
    assert.equal(report.outcome, "pass");
    assert.equal(report.stages.find(row => row.id === "normal-stop")?.detail.labelAbsent, true);
    const calls = fs.readFileSync(fixture.toolLog, "utf8");
    assert.equal((calls.match(/launchctl bootstrap/g) || []).length, 2);
    assert.ok((calls.match(/launchctl bootout/g) || []).length >= 2);
    assert.equal(calls.includes("com.dhseo.mediaserver\n"), false);
  });

  test("정식 payload 불일치는 fail-fast하고 후속 main stage를 skipped로 남긴다", () => {
    const fixture = setupFixture("fail-fast", "bad-second-link");
    const { run, report } = invoke("nohup", fixture);
    assert.equal(run.status, 1);
    assert.equal(report.outcome, "fail");
    assert.equal(report.stages.find(row => row.id === "second-event-link")?.result, "fail");
    assert.equal(report.stages.find(row => row.id === "normal-stop")?.result, "skipped");
    assert.equal(report.stages.find(row => row.id === "cleanup-root")?.result, "pass");
    assert.equal(report.cleanup.removed, true);
  });

  test("지원하지 않는 mode는 wrapper 실행 전에 거부한다", () => {
    const fixture = setupFixture("invalid");
    const output = path.join(fixture.base, "invalid-report.json");
    const run = spawnSync(process.execPath, [runner, "--mode", "foreground", "--fixture", fixture.config, "--output", output], {
      cwd: path.resolve(scriptDir, "../.."), encoding: "utf8", timeout: 5000,
    });
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /--mode는 nohup 또는 launchd/);
    assert.equal(fs.existsSync(output), false);
    assert.equal(fs.existsSync(fixture.toolLog), false);
  });
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log(`[verify-v410-s05-service-lifecycle-fixture] pass=${passed} fail=0`);
