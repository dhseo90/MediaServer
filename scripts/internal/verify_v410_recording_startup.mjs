#!/usr/bin/env node
// 파일 용도: 실제 앱 startup fixture. 운영 환경·파일·포트를 재사용하지 않는다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import os from 'node:os';
import {spawn, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mode = process.argv[2] || '--app';
assert(
    ['--red-app', '--app', '--extra-app', '--active-app'].includes(mode),
    '지원하지 않는 startup 모드');
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'media-server-startup-')));
const start = Date.now();
let child, passed = 0, failed = 0;
let childClosed = false, childClosePromise;
const reservedPorts = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const check = (ok, label) => {
  console.log(`[${ok ? 'pass' : 'fail'}] ${label}`);
  ok ? passed++ : failed++;
};
const must = (ok, label) => {
  check(ok, label);
  assert(ok, label);
};
async function port() {
  const s = net.createServer();
  await new Promise((r, j) => {
    s.once('error', j);
    s.listen(0, '127.0.0.1', r);
  });
  const p = s.address().port;
  await new Promise(r => s.close(r));
  reservedPorts.push(p);
  return p;
}
async function closed(p) {
  return new Promise(r => {
    const s = net.connect(p, '127.0.0.1');
    s.setTimeout(500, () => {
      s.destroy();
      r(false);
    });
    s.once('connect', () => {
      s.destroy();
      r(false);
    });
    s.once('error', () => r(true));
  });
}
function segment(bytes) {
  const s = JSON.parse(
      fs.readFileSync(path.join(repo, 'test/fixtures/recording/v1/segments.jsonl'), 'utf8')
          .split('\n')[0]);
  delete s.future_hint;
  s.segment_id = 'startup-segment';
  s.size_bytes = bytes.length;
  s.checksum_sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  return s;
}
function mutation(type, payload, id = 'startup-segment', mid = type) {
  return {
    schema: 'media-server.recording-mutation.v1',
    mutationId: mid,
    mutationType: type,
    occurredAtMs: 1767225606000,
    entityId: id,
    payload
  };
}
function journal(dir, rows) {
  fs.writeFileSync(
      path.join(dir, 'recordings/recording-mutations.jsonl'),
      rows.map(x => JSON.stringify(x) + '\n').join(''));
}
function replay(dir) {
  return fs.readFileSync(path.join(dir, 'recordings/recording-mutations.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(x => JSON.parse(x));
}
function setup(name) {
  const dir = path.join(root, name);
  for (const d of ['recordings', 'input', 'data', 'events', 'tmp'])
    fs.mkdirSync(path.join(dir, d), {recursive: true});
  fs.writeFileSync(path.join(dir, 'data/sources.json'), '{"sources":[]}');
  fs.writeFileSync(path.join(dir, 'data/views.json'), '{"views":[]}');
  return dir;
}
function environment(dir, rp, hp) {
  const env = {HOME: process.env.HOME, PATH: process.env.PATH, TMPDIR: path.join(dir, 'tmp')};
  for (const k of ['USER', 'LOGNAME', 'LANG', 'LC_ALL', 'LC_CTYPE'])
    if (process.env[k]) env[k] = process.env[k];
  return Object.assign(env, {
    MEDIA_SERVER_SKIP_LOCAL_ENV: '1',
    MEDIA_SERVER_SKIP_BUILD: '1',
    MEDIA_SERVER_SKIP_ENV_CHECK: '1',
    MEDIA_SERVER_ENABLE_AI: '1',
    MEDIA_SERVER_BUILD_DIR: path.join(repo, 'build-gst-onnx'),
    MEDIA_SERVER_BIN_PATH: path.join(repo, 'build-gst-onnx/media_server'),
    MEDIA_SERVER_AUTH_MODE: 'off',
    MEDIA_SERVER_ENABLE_OPS: '1',
    MEDIA_SERVER_ENABLE_CLIENT: '1',
    MEDIA_SERVER_ENABLE_LAB: '0',
    MEDIA_SERVER_LISTEN_ADDRESS: '127.0.0.1',
    MEDIA_SERVER_HTTP_LISTEN_ADDRESS: '127.0.0.1',
    MEDIA_SERVER_LISTEN_PORT: String(rp),
    MEDIA_SERVER_HTTP_LISTEN_PORT: String(hp),
    MEDIA_SERVER_FORCE_RTSP_TCP: '1',
    MEDIA_SERVER_FILE_ROOT: path.join(dir, 'input'),
    MEDIA_SERVER_DEFAULT_FILE: path.join(dir, 'input/absent.mp4'),
    MEDIA_SERVER_STATE_DIR: path.join(dir, 'data'),
    MEDIA_SERVER_AUTH_USERS_FILE: path.join(dir, 'data/users.json'),
    MEDIA_SERVER_SOURCE_REGISTRY: path.join(dir, 'data/sources.json'),
    MEDIA_SERVER_PUBLISHED_VIEWS: path.join(dir, 'data/views.json'),
    MEDIA_SERVER_ANALYSIS_REGISTRY: path.join(dir, 'data/analysis.json'),
    MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED: '0',
    MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH: path.join(dir, 'events/events.jsonl'),
    MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED: '0',
    MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR: path.join(dir, 'events/snapshots'),
    MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED: '0',
    MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR: path.join(dir, 'events/clips'),
    MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED: '0',
    MEDIA_SERVER_RECORDING_ENABLED: '0',
    MEDIA_SERVER_RECORDING_STORAGE_ROOT: path.join(dir, 'recordings'),
    MEDIA_SERVER_RECORDING_RESERVED_FREE_BYTES: '0',
    MEDIA_SERVER_GST_CACHE_DIR: path.join(dir, 'gst-cache'),
    MEDIA_SERVER_GST_PLUGIN_PROFILE: 'headless',
    GST_REGISTRY: path.join(dir, 'gst-registry.bin'),
    GST_REGISTRY_1_0: path.join(dir, 'gst-registry.bin')
  });
}
async function stop() {
  if (!child) return;
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM');
    await Promise.race([new Promise(r => child.once('exit', r)), sleep(5000)]);
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
      await Promise.race([new Promise(r => child.once('exit', r)), sleep(2000)]);
      if (child.exitCode === null && child.signalCode === null)
        throw Error('서버 종료 미확인: root 보존');
      child = undefined;
      throw Error('서버 정상 종료 시간 초과/SIGKILL 종료');
    }
  }
  await Promise.race([childClosePromise, sleep(2000)]);
  if (!childClosed) throw Error('서버 stdout/stderr close 미확인: root 보존');
  child = undefined;
}
async function launch(dir, extraEnv = {}) {
  const rp = await port(), hp = await port();
  assert.notEqual(rp, hp);
  let logs = '';
  child = spawn('./server.sh', ['foreground'], {
    cwd: repo,
    env: {...environment(dir, rp, hp), ...extraEnv},
    stdio: ['ignore', 'pipe', 'pipe']
  });
  childClosed = false;
  const launched = child;
  childClosePromise = new Promise(resolve => child.once('close', () => {
    childClosed = true;
    resolve();
  }));
  child.stdout.on('data', x => logs += x);
  child.stderr.on('data', x => logs += x);
  await new Promise((r, j) => {
    child.once('spawn', r);
    child.once('error', j);
  });
  let ready = false;
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline && child.exitCode === null && child.signalCode === null) {
    try {
      const response =
          await fetch(`http://127.0.0.1:${hp}/health`, {signal: AbortSignal.timeout(300)});
      if (response.status === 200) {
        ready = true;
        break;
      }
    } catch {
    }
    await sleep(50);
  }
  return {ready, rp, hp, logs: () => logs, exit: () => launched.exitCode};
}
function sql(dir, query) {
  const r = spawnSync(
      'sqlite3', [path.join(dir, 'recordings/recording-catalog.sqlite3'), query],
      {encoding: 'utf8', timeout: 5000});
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}
function bytesJournal(dir) {
  return fs.readFileSync(path.join(dir, 'recordings/recording-mutations.jsonl'), 'utf8');
}
function seedFinal(dir, bytes, relative = 'startup-segment.mp4') {
  const s = segment(bytes);
  const file = path.join(dir, 'recordings', relative);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, bytes);
  journal(dir, [mutation('segment_finalized', {segment: s, mediaRelpath: relative})]);
  return s;
}
function ready(dir, s, bytes) {
  const partial = 'startup-segment.mp4.partial.123e4567-e89b-42d3-a456-426614174000';
  fs.writeFileSync(path.join(dir, 'recordings', partial), bytes);
  fs.writeFileSync(
      path.join(dir, 'recordings/startup-segment.mp4.finalize-ready'),
      JSON.stringify(
          {version: 1, segment: s, partial, final: 'startup-segment.mp4', eventLink: null}));
  fs.writeFileSync(
      path.join(dir, 'recordings/startup-segment.mp4.cleanup-pending'),
      `recording-cleanup-pending-v2\npartial=${partial}\n`);
}
async function success(dir, label) {
  const app = await launch(dir);
  must(app.ready, `${label} 실제 health200`);
  must(
      app.logs().includes('recording startup recovery complete:'),
      `${label} HTTP 준비 시 동기 복구 완료 로그 존재`);
  await stop();
  must(app.exit() === 0, `${label} 실제 정상 종료 exit0`);
  must(await closed(app.rp) && await closed(app.hp), `${label} 종료 포트 부재`);
}
async function rejected(dir, stage, label) {
  const app = await launch(dir);
  must(!app.ready && app.exit() === 1, `${label} 실제 exit1 HTTP 미시작`);
  must(
      app.logs().includes(`recording startup recovery failed: stage=${stage}`) &&
          !app.logs().includes('recording startup recovery complete:'),
      `${label} 실패 단계 ${stage}`);
  must(await closed(app.rp) && await closed(app.hp), `${label} RTSP/HTTP bind 없음`);
  await stop();
}
try {
  if (mode === '--app' || mode === '--red-app') {
    const dir = setup('missing-off'), s = segment(Buffer.from('missing-known-media'));
    journal(
        dir, [mutation('segment_finalized', {segment: s, mediaRelpath: 'startup-segment.mp4'})]);
    const app = await launch(dir);
    assert(app.ready, `실제 baseline 앱 시작 실패(예상 RED 아님): ${app.logs()}`);
    check(
        replay(dir).some(
            m => m.mutationType === 'corruption_detected' && m.entityId === s.segment_id &&
                m.payload.reason === 'missing-media'),
        'ST01 recording off 실제 앱 HTTP 시작 전 missing segment Corrupt mutation');
    await stop();
    must(app.exit() === 0, 'ST01 실제 정상 종료 exit0');
    check(await closed(app.rp) && await closed(app.hp), 'ST01 실제 앱 종료 후 RTSP/HTTP 포트 부재');
    if (mode === '--app') {
      must(failed === 0, 'ST01 선행 검증 통과');
      must(
          sql(dir,
              'SELECT lifecycle FROM recording_segments WHERE segment_id=\'startup-segment\'') ===
              'corrupt',
          'ST01 SQLite lifecycle Corrupt 실제 투영');
      const before = bytesJournal(dir);
      await success(dir, 'ST10 existing Corrupt restart');
      must(bytesJournal(dir) === before, 'ST10 Corrupt 재시작 무승격/noappend');
      const media = fs.readFileSync(path.join(repo, 'video/sample_h264_video_only.mp4'));
      {
        const d = setup('healthy');
        seedFinal(d, media);
        const original = bytesJournal(d);
        for (let i = 0; i < 2; i++) await success(d, `ST02 healthy ${i}`);
        must(
            bytesJournal(d) === original &&
                sql(d,
                    'SELECT lifecycle FROM recording_segments WHERE segment_id=\'startup-segment\'') ===
                    'finalized',
            'ST02 healthy journal byte 불변·SQL finalized');
      }
      {
        const d = setup('ready');
        journal(d, []);
        const s = segment(media);
        ready(d, s, media);
        await success(d, 'ST03 ready');
        must(
            replay(d)
                    .filter(
                        x => x.mutationType === 'segment_finalized' &&
                            x.entityId === 'startup-segment')
                    .length === 1,
            'ST03 원래 ID 단일 finalized');
        must(
            fs.readFileSync(path.join(d, 'recordings/startup-segment.mp4')).equals(media) &&
                !fs.existsSync(path.join(d, 'recordings/startup-segment.mp4.finalize-ready')),
            'ST03 실제 media byte·ticket cleanup');
        const before = bytesJournal(d);
        await success(d, 'ST03 ready restart');
        must(bytesJournal(d) === before, 'ST03 재시작 noappend');
      }
      for (const missing of [false, true]) {
        const d = setup(`pending-${missing}`);
        const s = seedFinal(d, media);
        journal(
            d, [...replay(d), mutation('deletion_requested', {reason: 'manual-corrupt-cleanup'})]);
        if (missing) fs.unlinkSync(path.join(d, 'recordings/startup-segment.mp4'));
        await success(d, `ST04 pending missing=${missing}`);
        must(
            !fs.existsSync(path.join(d, 'recordings/startup-segment.mp4')) &&
                replay(d).some(
                    x => x.mutationType === 'deletion_completed' && x.entityId === s.segment_id),
            'ST04 unlink/tombstone 완료');
        const before = bytesJournal(d);
        await success(d, `ST04 pending restart ${missing}`);
        must(bytesJournal(d) === before, 'ST04 tombstone 중복 없음');
      }
      {
        const d = setup('pending-stale-ready'), s = seedFinal(d, media);
        journal(
            d, [...replay(d), mutation('deletion_requested', {reason: 'manual-corrupt-cleanup'})]);
        ready(d, s, media);
        await rejected(d, 'finalize-ready', 'ST05 stale ready');
        must(
            replay(d).some(x => x.mutationType === 'deletion_completed') &&
                !fs.existsSync(path.join(d, 'recordings/startup-segment.mp4')),
            'ST05 ready 실패 전에 durable 삭제 수렴');
        must(
            fs.existsSync(path.join(d, 'recordings/startup-segment.mp4.finalize-ready')),
            'ST05 충돌 ready 보존');
      }
      {
        const d = setup('pending-unlink-error');
        seedFinal(d, media);
        journal(
            d, [...replay(d), mutation('deletion_requested', {reason: 'manual-corrupt-cleanup'})]);
        fs.unlinkSync(path.join(d, 'recordings/startup-segment.mp4'));
        fs.mkdirSync(path.join(d, 'recordings/startup-segment.mp4'));
        const before = bytesJournal(d);
        await rejected(d, 'pending-deletion', 'ST06 unlink nonregular');
        must(
            bytesJournal(d) === before &&
                fs.statSync(path.join(d, 'recordings/startup-segment.mp4')).isDirectory(),
            'ST06 원본/원장 불변');
      }
      {
        const d = setup('ready-conflict'), s = seedFinal(d, media);
        s.source_id = 'other-source';
        ready(d, s, media);
        const before = bytesJournal(d);
        await rejected(d, 'finalize-ready', 'ST07 metadata conflict');
        must(
            bytesJournal(d) === before &&
                fs.existsSync(path.join(d, 'recordings/startup-segment.mp4.finalize-ready')),
            'ST07 충돌 보존/noappend');
      }
      for (const kind of ['missing-parent', 'symlink', 'permission']) {
        const d = setup(`unavailable-${kind}`);
        seedFinal(d, media, 'parent/startup-segment.mp4');
        const parent = path.join(d, 'recordings/parent');
        if (kind === 'missing-parent') fs.rmSync(parent, {recursive: true});
        if (kind === 'symlink') {
          fs.renameSync(parent, path.join(d, 'outside'));
          fs.symlinkSync(path.join(d, 'outside'), parent);
        }
        if (kind === 'permission') fs.chmodSync(path.join(parent, 'startup-segment.mp4'), 0);
        const before = bytesJournal(d);
        try {
          await rejected(d, 'media-inspection', `ST08/ST12 ${kind}`);
          must(bytesJournal(d) === before, `ST08/ST12 ${kind} noappend`);
        } finally {
          if (kind === 'permission') fs.chmodSync(path.join(parent, 'startup-segment.mp4'), 0o600);
        }
      }
    }
  }
  if (mode === '--app' || mode === '--extra-app') {
    const media = fs.readFileSync(path.join(repo, 'video/sample_h264_video_only.mp4'));
    for (const missingOutput of [false, true]) {
      const d = setup(`pending-event-${missingOutput}`), source = seedFinal(d, media);
      const output = {...source, segment_id: 'startup-output', retention_class: 'event'};
      fs.writeFileSync(path.join(d, 'recordings/startup-output.mp4'), media);
      const link = {
        schema: 'media-server.event-recording-link.v1',
        link_id: 'startup-link',
        event_id: 'startup-event',
        source_id: source.source_id,
        channel_id: source.channel_id,
        stream_epoch_id: source.stream_epoch_id,
        requested_range: {start_ms: 1767225601000, end_ms: 1767225604000},
        ordered_overlaps: [
          {segment_id: source.segment_id, range: {start_ms: 1767225601000, end_ms: 1767225604000}}
        ],
        derived_segment_id: output.segment_id,
        missing_ranges: [],
        time_basis: 'utc-ms',
        status: 'pending',
        created_at_ms: 1767225606000,
        updated_at_ms: 1767225606000
      };
      journal(d, [
        ...replay(d),
        mutation(
            'segment_finalized', {segment: output, mediaRelpath: 'startup-output.mp4'},
            output.segment_id, 'output-finalized'),
        mutation('event_link_created', {link}, link.link_id, 'pending-event')
      ]);
      fs.unlinkSync(
          path.join(d, 'recordings', missingOutput ? 'startup-output.mp4' : 'startup-segment.mp4'));
      const before = bytesJournal(d);
      await rejected(
          d, 'corruption-apply', `ST09 실제 Pending ${missingOutput ? 'output' : 'source'}`);
      must(bytesJournal(d) === before, 'ST09 실제 앱 Pending 보호 noappend');
      must(
          sql(d, 'SELECT COUNT(*) FROM recording_segments WHERE lifecycle=\'finalized\'') === '2',
          'ST09 실제 SQL source/output finalized 보존');
    }
    {
      const d = setup('http-seed');
      const seeded = spawnSync(
          'bash',
          [
            path.join(repo, 'scripts/internal/verify_v410_recording_timeline.sh'), '--seed-http',
            path.join(d, 'recordings'), path.join(repo, 'video/sample_h264_video_only.mp4')
          ],
          {cwd: repo, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024});
      process.stdout.write(seeded.stdout || '');
      assert.equal(seeded.status, 0, `ST13 seed compile/run 오류: ${seeded.stderr}`);
      const digest = crypto.createHash('sha256').update(media).digest('hex');
      must(
          replay(d)
              .filter(x => x.mutationType === 'segment_finalized')
              .every(x => x.payload.segment.checksum_sha256 === digest),
          'ST13 HTTP fixture 실제 SHA256');
      const before = bytesJournal(d), app = await launch(d, {MEDIA_SERVER_RECORDING_ENABLED: '1'});
      must(app.ready, 'ST13 실제 healthy archive HTTP200');
      const response = await fetch(
          `http://127.0.0.1:${app.hp}/ops/api/recordings/media/http-continuous`,
          {headers: {Range: 'bytes=2-5'}, signal: AbortSignal.timeout(3000)});
      must(
          response.status === 206 &&
              Buffer.from(await response.arrayBuffer()).equals(media.subarray(2, 6)),
          'ST13 실제 HTTP Range206 원본 bytes 2~5');
      await stop();
      const log = app.logs();
      must(app.exit() === 0, 'ST13 실제 정상 종료 exit0');
      console.log(
          `[startup-order] recovery=${log.indexOf('recording startup recovery complete:')} http=${
              log.indexOf('webrtc http server started: yes')}`);
      must(
          log.indexOf('recording startup recovery complete:') >= 0 &&
              log.indexOf('recording startup recovery complete:') <
                  log.indexOf('webrtc http server started: yes'),
          'ST01/ST13 실제 stdout 복구완료→HTTP시작 순서');
      must(bytesJournal(d) === before, 'ST13 정상 fixture startup noappend');
    }
  }
  if (mode === '--app' || mode === '--active-app') {
    const media = fs.readFileSync(path.join(repo, 'video/sample_h264_video_only.mp4'));
    const prepare = name => {
      const d = setup(name);
      fs.writeFileSync(path.join(d, 'input/identity.mp4'), media);
      fs.writeFileSync(path.join(d, 'data/sources.json'), JSON.stringify({
        sources: [{
          sourceId: '9101',
          displayName: 'Startup local recording fixture',
          kind: 'file',
          file: 'identity.mp4',
          enabled: true,
          recording: {
            enabled: true,
            continuousMaxBytes: 268435456,
            eventMaxBytes: 268435456,
            continuousMaxAgeMs: 3600000,
            eventMaxAgeMs: 3600000,
            revision: 1
          }
        }]
      }));
      return d;
    };
    const enabled = {
      MEDIA_SERVER_RECORDING_ENABLED: '1',
      MEDIA_SERVER_RECORDING_SEGMENT_DURATION_SECONDS: '2'
    };
    {
      const d = prepare('active-healthy'), app = await launch(d, enabled);
      must(app.ready, 'ST14 enabled opt-in local source healthy200');
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline && !replay(d).some(x => x.mutationType === 'segment_finalized'))
        await sleep(100);
      must(
          replay(d).some(
              x => x.mutationType === 'segment_finalized' &&
                  x.payload.segment.channel_id === '9101'),
          'ST14 실제 worker 신규 finalized segment');
      await stop();
      const rows = replay(d).filter(x => x.mutationType === 'segment_finalized');
      must(app.exit() === 0, 'ST14 실제 정상 종료 exit0');
      must(
          rows.length > 0 && rows.every(x => {
            const s = x.payload.segment,
                  data = fs.readFileSync(path.join(d, 'recordings', x.payload.mediaRelpath));
            return s.source_id === '9101' && s.end.utc_ms > s.start.utc_ms &&
                s.end.pts > s.start.pts && s.size_bytes === data.length &&
                s.checksum_sha256 === crypto.createHash('sha256').update(data).digest('hex');
          }),
          'ST14 신규 segment 실제 source/time/size/SHA256');
      const remaining =
          fs.readdirSync(path.join(d, 'recordings'), {recursive: true})
              .filter(
                  x => String(x).includes('.partial.') || String(x).endsWith('.finalize-ready') ||
                      String(x).endsWith('.cleanup-pending'));
      must(remaining.length === 0, 'ST14 정상 종료 partial/ready/marker 없음');
      must(await closed(app.rp) && await closed(app.hp), 'ST14 정상 종료 두 포트 부재');
    }
    {
      const d = prepare('active-rejected'), s = segment(media);
      journal(d, [mutation(
                     'segment_finalized',
                     {segment: s, mediaRelpath: 'absent-parent/startup-segment.mp4'})]);
      const before = bytesJournal(d), app = await launch(d, enabled);
      must(
          !app.ready && app.exit() === 1 && app.logs().includes('stage=media-inspection'),
          'ST14 같은 enabled source 복구실패 exit1');
      await stop();
      must(bytesJournal(d) === before, 'ST14 실패 시 worker 신규 원장추가 없음');
      const names = fs.readdirSync(path.join(d, 'recordings'), {recursive: true});
      must(
          names.every(
              x => !String(x).includes('.mp4') && !String(x).includes('.partial.') &&
                  !String(x).includes('.cleanup-pending')),
          'ST14 실패 시 신규 media/partial/marker 없음');
      must(await closed(app.rp) && await closed(app.hp), 'ST14 실패 두 포트 미시작');
    }
  }
} catch (e) {
  console.error(`[startup-error] ${e.stack}`);
  if (failed === 0) failed++;
} finally {
  try {
    await stop();
  } catch (e) {
    console.error(e.message);
    failed++;
  }
  for (const p of reservedPorts) check(await closed(p), `cleanup reserved port=${p} absent`);
  function size(p) {
    const s = fs.lstatSync(p);
    return s.isDirectory() ? fs.readdirSync(p).reduce((n, k) => n + size(path.join(p, k)), 0) :
                             s.size;
  }
  const bytes = size(root);
  if (!child) {
    fs.rmSync(root, {recursive: true});
    check(
        !fs.existsSync(root),
        `cleanup path=${root} bytes=${bytes} removed=${!fs.existsSync(root)}`);
  } else
    check(false, `cleanup path=${root} bytes=${bytes} preserved because process exit unknown`);
  console.log(`[startup-summary] pass=${passed} fail=${failed} elapsedMs=${Date.now() - start}`);
  process.exitCode = failed ? 1 : 0;
}
