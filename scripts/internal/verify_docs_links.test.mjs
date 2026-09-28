// 파일 용도: 문서 링크·목적별 도달성 검증기의 격리 자체검사. 제품 서버를 실행하지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const verifier = fileURLToPath(new URL('./verify_docs_links.mjs', import.meta.url));
function fixture(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'media-server-docs-links-'));
  const write = (name, value) => {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, value);
  };
  write('README.md', '# 제품\n[사용 안내](docs/README.md)\n');
  write('AGENTS.md', '# 작업 규칙\n');
  write('docs/README.md', '# 문서 색인\n[운영](operations/README.md)\n');
  write('docs/operations/README.md', '# 운영\n[녹화](recording.md#재생)\n');
  write('docs/operations/recording.md', '# 녹화\n## 재생\n');
  const run = (...args) => spawnSync(process.execPath, [verifier, '--root', root, ...args], {encoding: 'utf8', timeout: 10000});
  try { fn({root, write, run}); }
  finally {
    fs.rmSync(root, {recursive: true});
    assert.equal(fs.existsSync(root), false);
  }
}
function expect(result, code, pattern) {
  assert.equal(result.error, undefined);
  assert.equal(result.status, code, result.stdout + result.stderr);
  if (pattern) assert.match(result.stdout + result.stderr, pattern);
}

test('DOC-01 source archive에서도 목적별 색인의 두 단계 연결을 인정', () => fixture(({run}) => {
  expect(run(), 0, /indexed docs: 2/);
}));
test('DOC-02 현행 문서의 끊어진 링크와 앵커는 실패', () => fixture(({write, run}) => {
  write('docs/operations/recording.md', '# 녹화\n[없는 문서](missing.md)\n');
  expect(run(), 1, /존재하지 않는 링크/);
  expect(run(), 1, /존재하지 않는 anchor/);
}));
test('DOC-03 파일명에 과거 버전이 있어도 미연결 현행 계약은 실패', () => fixture(({write, run}) => {
  write('docs/v220-current-contract.md', '# 현재 계약\n');
  expect(run(), 1, /도달할 수 없는 문서: docs\/v220-current-contract.md/);
}));
test('DOC-04 AGENTS에서 연결한 유지보수 문서는 공개 색인 중복 불필요', () => fixture(({write, run}) => {
  write('AGENTS.md', '# 규칙\n[검증](docs/testing.md)\n');
  write('docs/testing.md', '# 검증\n[정의](../test/fixtures/README.md)\n');
  write('test/fixtures/README.md', '# 회귀 fixture 설명\n');
  expect(run(), 0);
  write('test/fixtures/README.md', '# 회귀 fixture 설명\n[없는 fixture](missing.json)\n');
  expect(run(), 1, /test\/fixtures\/README.md: 존재하지 않는 링크/);
}));
test('DOC-05 참조형 링크와 HTML 앵커·이미지도 검사', () => fixture(({write, run}) => {
  write('docs/operations/README.md', '# 운영\n[녹화][guide]\n[guide]: recording.md#play\n');
  write('docs/operations/recording.md', '# 녹화\n<a id="play"></a>\n![화면][picture]\n[picture]: view.png\n');
  write('docs/operations/view.png', 'fixture-image');
  expect(run(), 0);
  write('docs/operations/recording.md', '# 녹화\n<a id="play"></a>\n<img src="missing.png">\n');
  expect(run(), 1, /존재하지 않는 HTML 이미지/);
}));
test('DOC-06 코드 예제의 링크·제목은 실제 문서 링크·앵커가 아님', () => fixture(({write, run}) => {
  write('docs/operations/recording.md', '# 녹화\n## 재생\n```md\n## 예제\n[링크](missing.md)\n```\n');
  expect(run(), 0);
  write('docs/operations/README.md', '# 운영\n[녹화](recording.md#예제)\n');
  expect(run(), 1, /존재하지 않는 anchor/);
}));
test('DOC-07 Git 저장소에서는 추적·미추적 현재 문서를 함께 검사', () => fixture(({root, write, run}) => {
  const git = (...args) => spawnSync('git', ['-C', root, ...args], {encoding: 'utf8'});
  expect(git('init', '--quiet'), 0);
  expect(git('add', 'README.md', 'AGENTS.md', 'docs'), 0);
  expect(run(), 0);
  write('docs/untracked.md', '# 아직 등록하지 않은 현재 문서\n');
  expect(run(), 1, /도달할 수 없는 문서: docs\/untracked.md/);
}));
test('DOC-08 경로 이탈과 외부 symlink를 읽지 않고 거부', () => fixture(({root, write, run}) => {
  write('docs/operations/recording.md', '# 녹화\n## 재생\n[외부](../../../outside.md)\n');
  expect(run(), 1, /저장소 밖/);
  write('docs/operations/recording.md', '# 녹화\n## 재생\n[외부](external.md)\n');
  fs.symlinkSync(os.tmpdir(), path.join(root, 'docs/operations/external.md'));
  expect(run(), 1, /symlink/);
}));
test('DOC-09 문서 색인 부재·잘못된 CLI는 성공 아님', () => fixture(({root, run}) => {
  fs.unlinkSync(path.join(root, 'docs/README.md'));
  expect(run(), 1, /문서 색인 파일이 없음/);
  expect(run('--not-an-option'), 2, /unknown option/);
}));
test('DOC-10 내부 기록도 깨진 링크는 실패하고 현행 문서 도달성을 대체하지 못함', () => fixture(({write, run}) => {
  write('docs/release-artifacts/v4.1.1/run/result.md', '# 기록\n[계약](../../../unlinked.md)\n');
  write('docs/unlinked.md', '# 현행 계약\n');
  write('AGENTS.md', '# 규칙\n[기록](docs/release-artifacts/v4.1.1/run/result.md)\n');
  expect(run(), 1, /도달할 수 없는 문서: docs\/unlinked.md/);
  write('docs/release-artifacts/v4.1.1/run/result.md', '# 기록\n[없는 파일](absent.json)\n');
  expect(run(), 1, /존재하지 않는 링크/);
}));
test('DOC-11 끊어진 symlink·옵션 누락·중복도 성공으로 숨기지 않음', () => fixture(({root, run}) => {
  fs.symlinkSync('missing-target.md', path.join(root, 'docs/broken.md'));
  expect(run(), 1, /symlink/);
  expect(run('--root'), 2, /디렉터리 하나/);
  expect(run('--root', root), 2, /디렉터리 하나/);
}));
