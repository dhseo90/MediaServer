// 파일 용도: 정책 문구 위치 변경과 실제 계약 누락을 구분하는 짧은 자체검사.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateVerificationDocumentation, validateUiPolicyDocumentation, validateArchitectureContractDocumentation, validateVisualArtifactGuideDocumentation, validateWebRtcMetadataDocumentation} from './documentation_contract_lib.mjs';
import {validatePolicy, evaluateEvidence} from './ui_fulltest_evidence_policy_v4_lib.mjs';

const read = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const agents = read('AGENTS.md');
const verification = read('docs/stream-verification.md');
const fulltest = read('docs/manual-ui-fulltest.md');
const policy = JSON.parse(read('test/fixtures/ui_fulltest_evidence_policy_v4.json'));

test('DOC-POL-01 현재 진입점과 상세 정책 연결', () => {
  assert.deepEqual(validateVerificationDocumentation({agents, verification}), []);
  assert.deepEqual(validateUiPolicyDocumentation({agents, fulltest, policy}), []);
});
test('DOC-POL-02 제목·절 번호·옛 완료 문구는 정책 계약이 아님', () => {
  const rewrite = (s) => s.replace(/^#{1,6}.*$/gm, '# 표현을 바꾼 제목').replace(/V390-ADD1-12|7\.6\.3|Current 실행은 pass 0\/not-run 424/g, '');
  assert.deepEqual(validateVerificationDocumentation({agents: rewrite(agents), verification: rewrite(verification)}), []);
  assert.deepEqual(validateUiPolicyDocumentation({agents: rewrite(agents), fulltest: rewrite(fulltest), policy}), []);
});
test('DOC-POL-03 정책 진입점 제거·환경변수 누락은 실패', () => {
  assert(validateVerificationDocumentation({agents: '', verification}).length > 0);
  assert(validateVerificationDocumentation({agents, verification: verification.replaceAll('MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD', '')}).length > 0);
});
test('DOC-POL-04 UI 적격 식별자·판정 분리 누락은 실패', () => {
  for (const identifier of [...policy.uiEvidenceModes, 'policyValidationResult', 'uiFulltestPass', 'completion oracle', 'redaction']) {
    assert(validateUiPolicyDocumentation({agents, fulltest: fulltest.replaceAll(identifier, ''), policy}).length > 0, identifier);
  }
  assert(validateUiPolicyDocumentation({agents: '', fulltest, policy}).length > 0);
});
test('DOC-POL-05 과거 원장·완료 문구 없이도 정의만으로 검사', () => {
  const a = '[기준](docs/stream-verification.md) [UI](docs/manual-ui-fulltest.md)';
  const v = verification.slice(verification.indexOf('## 검증 정책'), verification.indexOf('## 빠른 실행 경계'));
  const u = fulltest.slice(fulltest.indexOf('## Policy v4 증거 적격 기준'), fulltest.indexOf('## 1. 정의'));
  assert.deepEqual(validateVerificationDocumentation({agents: a, verification: v}), []);
  assert.deepEqual(validateUiPolicyDocumentation({agents: a, fulltest: u, policy}), []);
});
test('DOC-POL-06 실제 UI 없이 문서·정책만 통과해도 UI PASS 불가', () => {
  assert.deepEqual(validatePolicy(policy), []);
  const summary = JSON.parse(read('test/fixtures/v390_ui_current_evidence_state.json'));
  const result = evaluateEvidence(policy, summary);
  assert.equal(result.uiFulltestPass, false);
  assert.equal(result.evidenceEligibility, 'ineligible');
});
test('DOC-POL-07 UI 반례·완료 조건 완화는 기존 기계 정책이 거부', () => {
  for (const mutate of [
    p => { p.caseEquivalence.forbiddenEvidenceKinds = []; },
    p => { p.suiteClosure.requiredZeroCounts = []; },
    p => { p.sourceBinding.requireCurrentSourceVerification = false; },
  ]) {
    const copy = structuredClone(policy);
    mutate(copy);
    assert(validatePolicy(copy).length > 0);
  }
});

test('DOC-UI-GUIDE-01 현재 출력 계약·승인 기준 연결과 한글 문장 허용', () => {
  const guide = read('docs/ui-guide.md');
  assert.deepEqual(validateVisualArtifactGuideDocumentation(guide), []);
  const rewritten = guide.replace(/^#{1,6}.*$/gm, '# 새 한글 제목')
    .replaceAll('release baseline artifact role', '')
    .replace(/\[[^\]\n]+\]\((\.\/)?ui-visual-release-baseline-approval-template\.md\)/g,
      '[다른 제목의 승인 기준](ui-visual-release-baseline-approval-template.md)');
  assert.deepEqual(validateVisualArtifactGuideDocumentation(rewritten), []);
});
test('DOC-UI-GUIDE-02 승인 링크·출력 계약 누락은 실패', () => {
  const guide = read('docs/ui-guide.md');
  assert(validateVisualArtifactGuideDocumentation(undefined).length > 0);
  assert(validateVisualArtifactGuideDocumentation(guide.replaceAll('ui-visual-release-baseline-approval-template.md', '다른문서.md'))
    .some(error => error.includes('승인 기준 링크')));
  for (const identifier of ['visual-regression-manifest.json', 'media-server.ui-visual-artifact-index.v1',
    'media-server.ui-visual-artifact-retention.v1', 'compare-ui-visual-baseline', 'reviewRequired']) {
    assert(validateVisualArtifactGuideDocumentation(guide.replaceAll(identifier, '')).some(error => error.includes(identifier)), identifier);
  }
});

test('DOC-UI-GUIDE-03 룰 문서 소비자의 현행 화면 연결·누락 실패 전파', async t => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const page = 'src/ingress/product_ui_server_pages.cpp';
  const script = 'src/ingress/product_ui_page_scripts.cpp';
  const css = 'src/ingress/product_ui_css.cpp';
  const guide = 'docs/ui-guide.md';
  const digest = p => crypto.createHash('sha256').update(read(p)).digest('hex');
  const before = Object.fromEntries([page, script, css, guide].map(p => [p, digest(p)]));
  const cases = [
    ['현행 화면·JS·CSS·문서', null, 0, ''],
    ...[
      'data-testid="ops-rule-scenario-review-loop"',
      'data-review-loop="expected-event-type-conflict-missing-reference-preset-eventrecord-coverage"',
      'id="opsRulesReviewEventRecordLink"',
      'data-event-record-coverage-link="/ops/events"',
    ].map(remove => ['화면 marker 누락: ' + remove, {path: page, remove}, 1, 'rules page missing']),
    ['JS 연결 누락', {path: script, remove: 'opsRulesUpdateReviewLoop'}, 1, 'rules script missing'],
    ['CSS 연결 누락', {path: css, remove: '.ops-rule-review-loop'}, 1, 'rules CSS missing'],
    ['문서의 검사 범위 누락', {path: guide, remove: 'source mismatch'}, 1, 'docs missing'],
  ];
  for (const [name, mutation, exit, reason] of cases) await t.test(name, () => {
    const source = `
      import fs from 'node:fs'; import path from 'node:path'; import {pathToFileURL} from 'node:url';
      const root = ${JSON.stringify(root)}, mutation = ${JSON.stringify(mutation)};
      const read = fs.readFileSync;
      fs.readFileSync = function(file, options) {
        const raw = read.call(this, file, options);
        if (path.relative(root, String(file)) !== mutation?.path) return raw;
        const text = String(raw).replaceAll(mutation.remove, '');
        return Buffer.isBuffer(raw) ? Buffer.from(text) : text;
      };
      for (const key of ['writeFileSync', 'appendFileSync', 'unlinkSync', 'rmSync', 'renameSync', 'mkdirSync']) {
        fs[key] = () => { throw new Error('정적 검사에서 파일 쓰기 금지'); };
      }
      await import(pathToFileURL(path.join(root, 'scripts/internal/verify_ops_rule_validation_matrix.mjs')).href);
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', source], {
      cwd: root, encoding: 'utf8', timeout: 15000, maxBuffer: 4 * 1024 * 1024,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(result.status, exit, result.stderr + result.stdout);
    assert(result.stdout.includes('- fixtures: 13'), result.stdout);
    if (reason) assert(result.stdout.includes(reason), result.stderr + result.stdout);
    for (const [p, hash] of Object.entries(before)) assert.equal(digest(p), hash, p + ': 원본 불변');
  });
});

test('DOC-UI-GUIDE-04 공통 화면 소비자의 현행 구현·등록·문서 누락 거부', async t => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const shell = 'verify_product_shell_examples.mjs', token = 'verify_product_ui_token_drift.mjs';
  const cases = [
    ['과거 backlog 없이 현행 shell 검사', shell, null, 0, ''],
    ['과거 backlog 없이 현행 token 검사', token, null, 0, ''],
    ['Client CSS 누락', shell, {path:'src/ingress/product_ui_client_css.cpp',remove:'.tile-stage'}, 1, 'client CSS missing'],
    ['Client JS 누락', shell, {path:'src/ingress/product_ui_client_scripts.cpp',remove:'class="tile'}, 1, 'client live script missing'],
    ['공통 CSS 누락', shell, {path:'src/ingress/product_ui_css.cpp',remove:'.app-chrome'}, 1, 'product CSS missing'],
    ['shell 문서 연결 누락', shell, {path:'docs/ui-guide.md',remove:'./product-shell-component-examples.md'}, 1, 'UI guide missing examples link'],
    ['shell 명령 등록 누락', shell, {path:'server.sh',remove:'verify-product-shell-examples'}, 1, 'server.sh missing'],
    ['token 검사 등록 누락', token, {path:'server.sh',remove:'verify_product_ui_token_drift.mjs'}, 1, 'server dispatch missing'],
    ['token 문서 연결 누락', token, {path:'docs/ui-guide.md',remove:'verify-product-ui-token-drift'}, 1, 'must mention'],
    ['raw 색상 반례', token, {path:'src/ingress/product_ui_css.cpp',append:'\n.example {color: #fff;}\n'}, 1, 'raw color values outside'],
    ['분리된 Client raw 색상 반례', token, {path:'src/ingress/product_ui_client_css.cpp',append:'\n.example {color: #fff;}\n'}, 1, 'raw color values outside'],
    ['분리된 Client token hook 누락', token, {path:'src/ingress/product_ui_client_css.cpp',remove:'box-shadow: 0 0 0 2px var(--color-selection-ring)'}, 1, 'product CSS body missing token hook'],
  ];
  for (const [name, verifier, mutation, exit, reason] of cases) await t.test(name, () => {
    const originalHash = mutation ? crypto.createHash('sha256').update(read(mutation.path)).digest('hex') : null;
    const source = `
      import fs from 'node:fs'; import path from 'node:path'; import {pathToFileURL} from 'node:url';
      const root = ${JSON.stringify(root)}, mutation = ${JSON.stringify(mutation)};
      const read = fs.readFileSync;
      fs.readFileSync = function(file, options) {
        const relative = path.relative(root, String(file));
        if (['docs/development-backlog.md','docs/release-test-records.md','docs/release-evidence-index.md'].includes(relative)) {
          throw new Error('과거 완료/실행 기록 없이 현행 검사 가능해야 함');
        }
        const raw = read.call(this, file, options);
        if (relative !== mutation?.path) return raw;
        let text = String(raw);
        if (mutation.remove) text = text.replaceAll(mutation.remove, '');
        if (mutation.append) text += mutation.append;
        return Buffer.isBuffer(raw) ? Buffer.from(text) : text;
      };
      for (const key of ['writeFileSync', 'appendFileSync', 'unlinkSync', 'rmSync', 'renameSync', 'mkdirSync']) {
        fs[key] = () => { throw new Error('정적 검사에서 파일 쓰기 금지'); };
      }
      await import(pathToFileURL(path.join(root, 'scripts/internal', ${JSON.stringify(verifier)})).href);
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', source], {
      cwd: root, encoding: 'utf8', timeout: 15000, maxBuffer: 4 * 1024 * 1024,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(result.status, exit, result.stderr + result.stdout);
    if (reason) assert((result.stderr + result.stdout).includes(reason), result.stderr + result.stdout);
    assert(result.stdout.includes('actual UI not-run'), result.stdout);
    if (mutation) assert.equal(crypto.createHash('sha256').update(read(mutation.path)).digest('hex'), originalHash);
  });
});

test('DOC-ARCH-01 현행 구조 문서의 권한·공개 소비 경로 연결', () => {
  assert.deepEqual(validateArchitectureContractDocumentation(read('docs/media-server-architecture.md')), []);
});
test('DOC-ARCH-02 제목·배치·녹화 설명은 과거 파일 해시로 고정하지 않음', () => {
  const text = read('docs/media-server-architecture.md').replace(/^#{1,6}.*$/gm, '# 새 제목');
  const reordered = text.split('\n\n').reverse().join('\n\n') + '\n현행 녹화 구조 설명';
  assert.deepEqual(validateArchitectureContractDocumentation(reordered), []);
});
test('DOC-ARCH-03 문서·권한·공개 소비 경로 누락은 실패', () => {
  assert(validateArchitectureContractDocumentation(undefined).length > 0);
  const text = read('docs/media-server-architecture.md');
  for (const identifier of ['RequireScope', 'MEDIA_SERVER_AUTH_MODE=auto', 'integrator',
    'view:read:{viewId}', 'metadata:read:{viewId}', '/client/api/views/{viewId}/webrtc/session']) {
    assert(validateArchitectureContractDocumentation(text.replaceAll(identifier, '')).length > 0, identifier);
  }
});

test('DOC-METADATA-01 현행 소비 계약 유지·제목과 문장 변경 허용', () => {
  const text = read('docs/webrtc-metadata-client.md');
  assert.deepEqual(validateWebRtcMetadataDocumentation(text), []);
  assert.deepEqual(validateWebRtcMetadataDocumentation(text.replace(/^#{1,6}.*$/gm, '# 새 제목') + '\n한글 사용 안내\n'), []);
});
test('DOC-METADATA-02 문서·권한·좌표·동기화·예제 연결 누락 거부', () => {
  assert(validateWebRtcMetadataDocumentation(undefined).length > 0);
  const text = read('docs/webrtc-metadata-client.md');
  for (const identifier of [
    'media-server.webrtc.va-metadata.v1', 'vaMetadata=1', 'lab:read',
    '/client/api/views/{viewId}/webrtc/session', 'coordinateSpace=normalized-frame',
    'videoFramePtsMs', 'analysisPtsMs', 'syncDeltaMs', 'syncStatus', 'syncToleranceMs',
    'scripts/examples/webrtc_va_metadata_client.html', 'verify-webrtc-va-metadata',
  ]) assert(validateWebRtcMetadataDocumentation(text.replaceAll(identifier, '')).some(error => error.includes(identifier)), identifier);
});

test('DOC-ARCH-04 실제 정적 명령의 문서 변경 허용·안전 반례 실패 전파', async t => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const architecture = 'docs/media-server-architecture.md';
  const artifactGuide = 'docs/integrator-contract-artifact.md';
  const metadataGuide = 'docs/webrtc-metadata-client.md';
  const header = 'include/ingress/http_auth.h';
  const sample = 'test/fixtures/integrator_contract_artifact/samples/event-post.json';
  const digest = p => crypto.createHash('sha256').update(read(p)).digest('hex');
  const before = Object.fromEntries([architecture, artifactGuide, metadataGuide, header, sample].map(p => [p, digest(p)]));
  const cases = [
    ['문서 제목·녹화 설명 변경', null, 0, ''],
    ['필수 권한 설명 제거', {path: architecture, remove: 'RequireScope'}, 1, '식별자 누락'],
    ['역사 감사에서도 현행 권한 설명 검사', {path: architecture, remove: 'RequireScope', historicalAudit: true}, 1, '식별자 누락'],
    ['현행 문서 부재', {missing: architecture}, 1, 'missing freeze target'],
    ['현재 제품 파일 부재', {missing: header}, 1, 'missing freeze target'],
    ['연동 안내 명령 제거', {path: artifactGuide, remove: './server.sh verify-integrator-contract-artifact'}, 1, 'missing snippet'],
    ['metadata 문서 부재', {missing: metadataGuide}, 1, 'missing freeze target'],
    ['metadata 권한 설명 제거', {path: metadataGuide, remove: 'lab:read'}, 1, '계약/소비 경로 식별자 누락'],
    ['역사 감사에서도 metadata 좌표 설명 검사', {path: metadataGuide, remove: 'coordinateSpace=normalized-frame', historicalAudit: true}, 1, '계약/소비 경로 식별자 누락'],
    ['역사 감사의 metadata 문서 pin 변경', {path: metadataGuide, append: '\n설명 변경\n', historicalAudit: true}, 1, 'docs/webrtc-metadata-client.md: sha256 mismatch'],
    ['역사 감사의 인증 코드 pin 변경', {path: header, append: '\n// changed\n', historicalAudit: true}, 1, 'include/ingress/http_auth.h: sha256 mismatch'],
    ['실제 sample pin 변경', {path: sample, append: '\n'}, 1, 'sha256 mismatch'],
  ];
  for (const [name, mutation, exit, reason] of cases) await t.test(name, () => {
    // 기존 소비자 자체검사와 같은 메모리 주입 방식. 저장소 원본·운영 자료를 쓰지 않는다.
    const source = `
      import fs from 'node:fs'; import path from 'node:path'; import {pathToFileURL} from 'node:url';
      const root = ${JSON.stringify(root)}, mutation = ${JSON.stringify(mutation)};
      if (mutation?.historicalAudit) process.argv = [process.execPath, 'verifier', '--historical-source-pins'];
      const read = fs.readFileSync, exists = fs.existsSync;
      fs.existsSync = function(file) {
        if (path.relative(root, String(file)) === mutation?.missing) return false;
        return exists.call(this, file);
      };
      fs.readFileSync = function(file, options) {
        const relative = path.relative(root, String(file));
        const raw = read.call(this, file, options);
        let text = String(raw);
        if ([${JSON.stringify(architecture)}, ${JSON.stringify(artifactGuide)}, ${JSON.stringify(metadataGuide)}].includes(relative)) {
          text = text.replace(/^#{1,6}.*$/gm, '# 표현 변경') + '\\n별개 녹화 설명 갱신\\n';
        }
        if (relative === mutation?.path) {
          if (mutation.remove) text = text.replaceAll(mutation.remove, '');
          if (mutation.append) text += mutation.append;
        }
        return Buffer.isBuffer(raw) ? Buffer.from(text) : text;
      };
      for (const key of ['writeFileSync', 'appendFileSync', 'unlinkSync', 'rmSync', 'renameSync', 'mkdirSync']) {
        fs[key] = () => { throw new Error('정적 검사에서 파일 쓰기 금지'); };
      }
      await import(pathToFileURL(path.join(root, 'scripts/internal/verify_integrator_contract_artifact.mjs')).href);
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', source], {
      cwd: root, encoding: 'utf8', timeout: 15000, maxBuffer: 4 * 1024 * 1024,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(result.status, exit, result.stderr + result.stdout);
    if (reason) assert(result.stderr.includes(reason), result.stderr + result.stdout);
    if (mutation?.path === header && mutation.append) {
      const changedHash = crypto.createHash('sha256').update(read(header) + mutation.append).digest('hex');
      assert.notEqual(changedHash, before[header]);
      assert(result.stderr.includes(header + ': sha256 mismatch ' + changedHash + ' != '), result.stderr);
      assert(!result.stderr.includes(header + ': sha256 mismatch ' + before[header] + ' != '), '기존 불일치를 새 변이 검출로 대체 금지');
    }
    if (mutation?.path === metadataGuide && mutation.append) {
      const rewritten = read(metadataGuide).replace(/^#{1,6}.*$/gm, '# 표현 변경') + '\n별개 녹화 설명 갱신\n' + mutation.append;
      const changedHash = crypto.createHash('sha256').update(rewritten).digest('hex');
      assert(result.stderr.includes(metadataGuide + ': sha256 mismatch ' + changedHash + ' != '), result.stderr);
      assert(!result.stderr.includes(metadataGuide + ': sha256 mismatch ' + before[metadataGuide] + ' != '), '기존 문서 불일치를 새 변이 검출로 대체 금지');
    }
    assert(result.stdout.includes('runtime Auth/Rule/media verification: not-run-by-this-command'));
    assert(result.stdout.includes(mutation?.historicalAudit ? 'historical source byte audit: executed' : 'historical source byte audit: not-run'));
    for (const [p, hash] of Object.entries(before)) assert.equal(digest(p), hash, p + ': 원본 불변');
  });
});
