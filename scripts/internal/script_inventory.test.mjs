// 파일 용도: 실제 script inventory 분류와 dispatch 검사를 격리 입력으로 확인한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {parseServerDispatches} from './script_dispatch_parser.mjs';

const source = fs.readFileSync(new URL('./verify_script_inventory.mjs', import.meta.url), 'utf8');
const rootDir = '/owned-inventory-fixture';
const command = 'scripts/internal/command.sh';
const orphan = 'scripts/internal/unregistered.mjs';
const server = '  verify-fixture)\n    require_internal command.sh\n    exec "${INTERNAL_DIR}/command.sh" "$@"\n    ;;';
function run(name, entries, serverText = server) {
  const files = new Map(Object.entries(entries));
  const start = source.indexOf(`check("${name}", () => {`);
  const end = source.indexOf('\ncheck(', start + 1);
  assert(start >= 0 && end > start, '실제 검사 callback 경계');
  const relative = file => path.relative(rootDir, file);
  vm.runInNewContext(source.slice(start, end), {
    rootDir, path,
    fs: {
      existsSync: file => files.has(relative(file)),
      statSync: () => ({mode: 0o755}),
    },
    check: (_label, fn) => fn(),
    assert: (ok, reason) => { if (!ok) throw new Error(reason); },
    parseServerDispatches: () => parseServerDispatches(serverText),
    gitLsFiles: args => [...files.keys()].filter(file => !args.length || args.some(prefix => file.startsWith(prefix))),
    fileExists: file => files.has(file),
    readText: file => {
      assert(files.has(relative(file)), `fixture missing ${file}`);
      return files.get(relative(file));
    },
  });
}
const classify = entries => run('tracked scripts are classified and referenced', entries);
test('SI-01 command·실제 상대 import helper·명시 자체검사·수동 명령 분류', () => {
  classify({
    [command]: '',
    'scripts/internal/caller.mjs': "import './dependency.mjs';",
    'scripts/internal/dependency.mjs': 'export const value = 1;',
    'scripts/internal/focused.test.mjs': "import test from 'node:test'; test('case', () => {});",
    'scripts/internal/manual.sh': '#!/bin/bash',
    'docs/stream-verification.md': 'node scripts/internal/caller.mjs\nnode --test scripts/internal/focused.test.mjs\nbash scripts/internal/manual.sh',
  });
});
test('SI-02 미등록 및 파일명만 test인 스크립트 거부', () => {
  for (const file of [orphan, 'scripts/internal/unregistered.test.mjs']) {
    assert.throws(() => classify({[command]: '', [file]: ''}), /unclassified or unreferenced/);
  }
});
test('SI-03 실제 import 연결을 끊으면 남은 dependency 거부', () => {
  assert.throws(() => classify({
    [command]: '',
    'scripts/internal/caller.mjs': "import './wrong.mjs';",
    'scripts/internal/dependency.mjs': '',
    'docs/stream-verification.md': 'node scripts/internal/caller.mjs',
  }), /scripts\/internal\/dependency\.mjs/);
});
test('SI-04 누락·다른 실제 dispatch 대상 거부', () => {
  assert.throws(() => run('server.sh dispatch targets exist and are executable', {}), /missing target script/);
  assert.throws(() => run('server.sh dispatch targets exist and are executable', {[command]: ''},
    server.replace('require_internal command.sh', 'require_internal wrong.sh')), /dispatch command not found/);
});
for (const record of ['docs/release-artifacts/v4.1.1/failure.json', 'docs/release-artifacts/v4.1.0/run.md', 'docs/archive/run.md', 'failure.log']) {
  test(`SI-05 종료 기록의 경로·basename 참조는 등록이 아님: ${record}`, () => {
    for (const text of [orphan, path.basename(orphan)]) {
      assert.throws(() => classify({[command]: '', [orphan]: '', [record]: text}), /unclassified or unreferenced/);
    }
  });
}
test('SI-06 정상 분류는 종료 기록 추가·제거와 무관', () => {
  const entries = {[command]: '', [orphan]: '', 'docs/stream-verification.md': `node ${orphan}`};
  classify(entries);
  classify({...entries, 'docs/release-artifacts/v4.1.1/failure.json': orphan});
});
test('SI-07 현재 독립 실행 안내의 누락·잘못된 대상 거부', () => {
  const entries = {[command]: '', 'docs/development-guide.md': '', 'docs/stream-verification.md': `bash ${command}`};
  const name = 'current standalone script instructions target tracked files';
  run(name, entries);
  assert.throws(() => run(name, {...entries, 'docs/stream-verification.md': 'bash scripts/internal/missing.sh'}), /missing standalone script target/);
  assert.throws(() => run(name, {...entries, 'docs/stream-verification.md': 'node --test scripts/internal/wrong.test.mjs'}), /missing standalone script target/);
});
