// 승인된 S05 재검증 전용 실행 기록기. 제품/기존 verifier의 실패를 수정하거나 재시도하지 않는다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const self = fileURLToPath(import.meta.url);
const repo = path.resolve(path.dirname(self), '../../../..');
const [stage, root] = process.argv.slice(2);
const stages = ['environment', 'red', 'unit', 's05', 'contracts', 'configure', 'build'];
assert(stages.includes(stage) || stage === 'cleanup', '허용되지 않은 단계');
assert(root && /^\/private\/tmp\/media-server-s05-resume\.[A-Za-z0-9]+$/.test(root), '전용 root 필요');
assert.equal(fs.realpathSync(root), root);
assert.equal(fs.statSync(root).uid, process.getuid());
const output = path.join(path.dirname(self), `resume-${stage}.json`);
assert(!fs.existsSync(output), '기존 결과 덮어쓰기 금지');
const started = Date.now();
const report = {stage, startedAt: new Date(started).toISOString(), commands: [], tokens: {
  start: null, end: null, consumed: null, source: '계측값 미제공'
}};
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const hashFile = file => digest(fs.readFileSync(file));
const statePath = path.join(root, 'state.json');
let state;
function redact(value) {
  return String(value || '').replaceAll(root, '<run-root>').replaceAll(process.env.HOME || '\0', '<기존 HOME>');
}
function command(file, args, env, expected = 0) {
  const begin = Date.now();
  const result = spawnSync(file, args, {cwd: repo, env, encoding: 'utf8', timeout: 600000, maxBuffer: 8 * 1024 * 1024});
  const row = {file, args, exit: result.status, signal: result.signal, elapsedMs: Date.now() - begin,
    stdout: redact(result.stdout), stderr: redact(result.stderr), error: result.error?.message || null};
  report.commands.push(row);
  process.stdout.write(row.stdout + '\n' + row.stderr + '\n');
  assert.equal(result.status, expected, `${file}: 예상 exit ${expected}, 실제 ${result.status}`);
  assert(!result.error, row.error);
  return row;
}
function snapshot() {
  const tracked = spawnSync('git', ['ls-files', '-z', 'src', 'include', 'scripts/internal', 'test/fixtures', 'CMakeLists.txt', 'server.sh'], {cwd: repo});
  assert.equal(tracked.status, 0);
  const files = new Set(tracked.stdout.toString().split('\0').filter(Boolean));
  files.add('scripts/internal/recording_identity_smoke.cpp');
  files.add('scripts/internal/verify_recording_identity.sh');
  files.delete('scripts/internal/v410_s05_inventory.test.mjs');
  return Object.fromEntries([...files].sort().map(file => [file, hashFile(path.join(repo, file))]));
}
function measure(directory) {
  let bytes = 0, files = 0;
  for (const item of fs.readdirSync(directory, {withFileTypes: true})) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) {const child = measure(file); bytes += child.bytes; files += child.files;}
    else {bytes += fs.lstatSync(file).size; files++;}
  }
  return {files, bytes};
}
try {
  if (stage === 'environment') {
    assert.equal(fs.readdirSync(root).length, 0, '새 빈 root만 허용');
    assert(process.env.HOME && process.env.PATH, 'HOME/PATH 누락: 자식 실행 금지');
    const env = {HOME: process.env.HOME, PATH: process.env.PATH, TMPDIR: root + '/',
      MEDIA_SERVER_SKIP_LOCAL_ENV: '1', MEDIA_SERVER_BUILD_DIR: path.join(repo, 'build-gst-onnx'),
      MEDIA_SERVER_GST_CACHE_DIR: path.join(root, 'cache'),
      GST_REGISTRY_1_0: path.join(root, 'cache/registry.bin'), GST_REGISTRY: path.join(root, 'cache/registry.bin'),
      MEDIA_SERVER_VERIFY_V410_RECORDING_CONTRACTS_BUILD_DIR: path.join(root, 'contracts')};
    for (const key of ['USER', 'LOGNAME']) if (process.env[key] !== undefined) env[key] = process.env[key];
    state = {root, env, envDigest: digest(JSON.stringify(env)), frozen: snapshot()};
    fs.writeFileSync(statePath, JSON.stringify(state), {flag: 'wx', mode: 0o600});
    const shell = 'set -euo pipefail\nsource scripts/internal/env_common.sh\nmedia_server_apply_homebrew_gst_env\n' +
      'for tool in node bash c++ cmake make pkg-config brew python3 tee mktemp rm; do command -v "$tool"; done\n' +
      'node --version\nbrew --prefix\n' +
      'pkg-config --modversion sqlite3 openssl libsodium pangocairo gstreamer-1.0 gstreamer-app-1.0 gstreamer-rtsp-server-1.0 gstreamer-sdp-1.0 gstreamer-webrtc-1.0 gstreamer-video-1.0\n' +
      'test -x "$GST_PLUGIN_SCANNER_1_0"\ntest "$GST_REGISTRY_1_0" = "$MEDIA_SERVER_GST_CACHE_DIR/registry.bin"\n';
    command('/bin/bash', ['-c', shell], Object.freeze(env));
    report.environment = {homePresent: true, homeUnchanged: true, pathUnchanged: true, digest: state.envDigest,
      frozenFiles: Object.keys(state.frozen).length, sourceDigest: digest(JSON.stringify(state.frozen))};
  } else {
    state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.equal(state.root, root);
    assert.equal(state.env.HOME, process.env.HOME, '시작 때의 HOME과 다름');
    assert.equal(state.env.PATH, process.env.PATH, '시작 때의 PATH와 다름');
    assert.equal(digest(JSON.stringify(state.env)), state.envDigest);
    assert.deepEqual(snapshot(), state.frozen, '고정한 소스 변경 발견');
    report.environmentDigest = state.envDigest;
    const env = Object.freeze(state.env);
    if (stage !== 'cleanup') {
      for (const previous of stages.slice(0, stages.indexOf(stage))) {
        const prior = JSON.parse(fs.readFileSync(path.join(path.dirname(self), `resume-${previous}.json`), 'utf8'));
        assert.equal(prior.ok, true, `${previous}: 선행 단계 실패`);
        assert.equal(prior.root, root, '서로 다른 실행 root 결과 혼용 금지');
      }
    }
    if (stage === 'red' || stage === 'unit') {
      const result = command('node', ['scripts/internal/v410_s05_inventory.test.mjs'], env, stage === 'red' ? 1 : 0);
      if (stage === 'red') {
        assert(result.stderr.includes('확장 시험의 치환 대상 누락'), '알려진 assertion이 아닌 실패');
        report.expectedRed = true;
      }
    } else if (stage === 's05') command('./server.sh', ['verify-v410-event-recording'], env);
    else if (stage === 'contracts') command('./server.sh', ['verify-v410-recording-contracts'], env);
    else if (stage === 'configure') command('cmake', ['-S', repo, '-B', state.env.MEDIA_SERVER_BUILD_DIR,
      '-DMEDIA_SERVER_USE_GSTREAMER=ON', '-DMEDIA_SERVER_USE_ONNXRUNTIME=ON',
      '-DMEDIA_SERVER_ENABLE_YOUTUBE_SOURCE=0', '-DMEDIA_SERVER_ONNXRUNTIME_ROOT=/opt/homebrew/opt/onnxruntime'], env);
    else if (stage === 'build') command('./server.sh', ['build'], env);
    else if (stage === 'cleanup') {
      report.cleanup = {path: root, ...measure(root)};
      fs.rmSync(root, {recursive: true});
      report.cleanup.removed = !fs.existsSync(root);
      assert(report.cleanup.removed);
    }
  }
  assert.deepEqual(snapshot(), state.frozen, '실행 중 고정한 소스 변경 발견');
  report.frozenSourcesUnchanged = true;
  report.ok = true;
} catch (error) {
  report.ok = false;
  report.failure = redact(error.message);
  console.error(report.failure);
} finally {
  report.root = root;
  report.elapsedMs = Date.now() - started;
  report.scriptSha256 = hashFile(self);
  report.unitSha256 = hashFile(path.join(repo, 'scripts/internal/v410_s05_inventory.test.mjs'));
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({stage, ok: report.ok, elapsedMs: report.elapsedMs, report: output}));
  process.exitCode = report.ok ? 0 : 1;
}
