// 파일 용도: 정책 문구 위치 변경과 실제 계약 누락을 구분하는 짧은 자체검사.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateVerificationDocumentation, validateUiPolicyDocumentation, validateArchitectureContractDocumentation, validateVisualArtifactGuideDocumentation, validateWebRtcMetadataDocumentation, hasDocumentFieldValue, validateOnvifSupportMatrixDocumentation, validateOnvifNoDeviceDocumentation, validateOnvifRtspsDocumentation} from './documentation_contract_lib.mjs';
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

test('DOC-SHELL-COPY 현행 예제·문구 소비자의 제목 변경 허용과 누락 거부', async t => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const shell = 'verify_product_shell_examples.mjs', copy = 'verify_ui_copy_matrix.mjs';
  const examples = 'docs/product-shell-component-examples.md', matrix = 'docs/ui-empty-loading-error-copy-matrix.md';
  const cases = [
    ['한글 제목·다른 문장 shell 안내', shell, {rewriteHeadings:true}, 0, ''],
    ['한글 제목·다른 문장 상태 안내', copy, {rewriteHeadings:true}, 0, ''],
    ...['media-server.product-shell-component-examples.v1', 'ProductUiCss()', 'ProductSharedUiScript()',
      'ClientShellCss()', 'ProductDesignTokensCss()'].map(remove => [remove + ' 누락', shell, {path:examples,remove}, 1, 'examples doc missing']),
    ...['/ops/events', 'source URL', 'Developer URL', 'raw JSON', 'rule/profile', 'session'].map(remove => [remove + ' 경계 누락', shell, {path:examples,remove}, 1, 'examples boundary missing']),
    ...['app-chrome', 'chip warn', 'tile-stage', 'aria-live="polite"'].map(remove => [remove + ' 예제 누락', shell, {path:examples,remove}, 1, 'examples class snippet missing']),
    ['문구 schema 누락', copy, {path:matrix,remove:'media-server.ui-copy-matrix.v1'}, 1, 'copy matrix doc is missing'],
    ['문구 route 누락', copy, {path:matrix,remove:'/client/live'}, 1, 'copy matrix doc is missing'],
    ['현행 Client 구현 문구 누락', copy, {path:'src/ingress/product_ui_client_scripts.cpp',remove:'Live view가 없습니다'}, 1, 'client copy snippet is missing'],
    ['Ops 구현 문구 누락', copy, {path:'src/ingress/product_ui_page_scripts.cpp',remove:'VA 런타임 디버그를 불러오지 못했습니다.'}, 1, 'ops copy snippet is missing'],
    ['번역 표만 남고 초기 화면 문구 누락', copy, {path:'src/ingress/product_ui_server_pages.cpp',remove:'런타임 상태를 불러오는 중입니다.'}, 1, 'ops copy snippet is missing'],
    ...[[shell,'verify-product-shell-examples'],[copy,'verify-ui-copy-matrix']].flatMap(([verifier,command])=>[
      [command + ' 실행 대상 오연결',verifier,{dispatch:command},1,'dispatch'],
      [command + ' 등록 누락',verifier,{path:'server.sh',remove:command},1,'server.sh'],
    ]),
  ];
  for (const [name, verifier, mutation, exit, reason] of cases) await t.test(name, () => {
    const originalHash = mutation.path ? crypto.createHash('sha256').update(read(mutation.path)).digest('hex') : null;
    const source = `
      import fs from 'node:fs'; import path from 'node:path'; import {pathToFileURL} from 'node:url';
      const root=${JSON.stringify(root)},mutation=${JSON.stringify(mutation)},original=fs.readFileSync;
      fs.readFileSync=function(file,options){
        const relative=path.relative(root,String(file));
        if(['docs/development-backlog.md','docs/release-test-records.md','docs/release-evidence-index.md'].includes(relative)) throw new Error('종료 기록 읽기 금지');
        const raw=original.call(this,file,options); let text=String(raw);
        if(mutation.rewriteHeadings && [${JSON.stringify(examples)},${JSON.stringify(matrix)}].includes(relative)) {
          text=text.replace(/^#{1,6}.*$/gm,'# 한글 제목').replace('는 primary nav가 아니라 Dashboard 내부 섹션 또는 직접 route로 취급합니다.','는 기본 탐색에서 제외하고 진단 경로로 설명합니다.');
        }
        if(relative===mutation.path) text=text.replaceAll(mutation.remove,'');
        if(relative==='server.sh' && mutation.dispatch) {
          const start=text.indexOf('  '+mutation.dispatch+')'),end=text.indexOf('    ;;',start);
          if(start<0||end<0)throw new Error('반례 dispatch 위치 없음');
          text=text.slice(0,start)+text.slice(start,end).replaceAll(/verify_[a-z0-9_]+\\.mjs/g,'verify_other.mjs')+text.slice(end);
        }
        return Buffer.isBuffer(raw)?Buffer.from(text):text;
      };
      for(const key of ['writeFileSync','appendFileSync','unlinkSync','rmSync','renameSync','mkdirSync'])fs[key]=()=>{throw new Error('검사에서 파일 변경 금지');};
      await import(pathToFileURL(path.join(root,'scripts/internal',${JSON.stringify(verifier)})).href);
    `;
    const result=spawnSync(process.execPath,['--input-type=module','--eval',source],{cwd:root,encoding:'utf8',timeout:15000,maxBuffer:4*1024*1024});
    assert.equal(result.error,undefined); assert.equal(result.signal,null);
    assert.equal(result.status,exit,result.stdout+result.stderr);
    if(reason)assert((result.stdout+result.stderr).includes(reason),result.stdout+result.stderr);
    assert(result.stdout.includes('actual UI not-run'),result.stdout);
    if(mutation.path)assert.equal(crypto.createHash('sha256').update(read(mutation.path)).digest('hex'),originalHash);
  });
});

test('DOC-ONVIF-FIELD 공개 preview 필드·값의 inline/표 표현과 오류 구분', () => {
  assert(hasDocumentFieldValue('`storageAction=none`', 'storageAction', 'none'));
  assert(hasDocumentFieldValue('| `storageAction` | `none` |', 'storageAction', 'none'));
  assert(hasDocumentFieldValue('| `sourceRegistryMutation`, `publishedViewMutation` | `false` |', 'sourceRegistryMutation', 'false'));
  assert(!hasDocumentFieldValue('| `storageAction` | `write` | none |', 'storageAction', 'none'));
  assert(!hasDocumentFieldValue('storageAction=none-other', 'storageAction', 'none'));
  assert(!hasDocumentFieldValue('| `anotherStorageAction` | `none` |', 'storageAction', 'none'));
});

test('DOC-ONVIF-MATRIX 지원 행 누락·중복 거부, 제목·행 순서·상대 링크 표현 자유', () => {
  const doc=read('docs/onvif-protocol-support-matrix.md');
  const rewritten=doc.replace(/^#{1,6}.*$/gm,'# 다른 제목').replaceAll('(./','(');
  assert.deepEqual(validateOnvifSupportMatrixDocumentation(rewritten.split('\n').reverse().join('\n')),[]);
  const row=doc.split('\n').find(line=>line.startsWith('| ONVIF PTZ |'));
  assert(validateOnvifSupportMatrixDocumentation(doc.replace(row,'' )).some(error=>error.includes('missing/duplicate')));
  assert(validateOnvifSupportMatrixDocumentation(doc+'\n'+row).some(error=>error.includes('missing/duplicate')));
});

test('DOC-ONVIF 현행 지원 안내와 검사 정의 분리·계약 누락 거부', async t => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const matrix = 'docs/onvif-protocol-support-matrix.md', support = 'docs/onvif-live-source-support.md';
  const cases = [
    ['matrix 옛 버전·제목·실행 일지 없이 검사', 'protocol_support_matrix', {prose:true}, 0, ''],
    ['profile 옛 영문 제목 없이 검사', 'probe_fixture_contract', {prose:true}, 0, ''],
    ['completion 옛 버전 없이 검사', 'no_device_completion', {prose:true}, 0, ''],
    ['no-device 과거 실행 문장 없이 현행 정의 검사', 'no_device_mode', {prose:true}, 0, ''],
    ['no-device summary schema 누락', 'no_device_mode', {path:'docs/onvif-no-device-verification.md',remove:'media-server.onvif-no-device-suite-summary.v1'}, 1, 'schema'],
    ['no-device 실장비 미확인 필드 누락', 'no_device_completion', {path:'docs/onvif-no-device-verification.md',remove:'realDeviceEndpointSuccess'}, 1, 'realDeviceEndpointSuccess'],
    ['no-device 실패 검사 옵션 누락', 'no_device_mode', {path:'docs/onvif-no-device-verification.md',remove:'--expect-failure'}, 1, '--expect-failure'],
    ['no-device 성공 fixture 실제 실패 유지', 'no_device_mode', {path:'test/fixtures/onvif_no_device_suite_success_summary.json',successFailure:true}, 1, 'success summary result status'],
    ['no-device fixture 정제 누락', 'no_device_mode', {path:'test/fixtures/onvif_no_device_suite_failure_summary.json',leak:true}, 1, 'forbidden token'],
    ['no-device runner schema 불일치', 'no_device_mode', {path:'scripts/internal/verify_onvif_no_device_suite.mjs',remove:'media-server.onvif-no-device-suite-summary.v1'}, 1, 'summary schema'],
    ['WS-Discovery 미지원 판정 제거', 'protocol_support_matrix', {path:matrix,row:'ONVIF WS-Discovery'}, 1, 'unsupported'],
    ['Profile G 미지원 판정 제거', 'no_device_completion', {path:matrix,row:'ONVIF Profile G / Recording / Replay'}, 1, 'unsupported'],
    ['HTTPS OpenSSL 조건 제거', 'protocol_support_matrix', {path:matrix,remove:'OpenSSL'}, 1, 'OpenSSL'],
    ['Basic provider 조건 제거', 'protocol_support_matrix', {path:matrix,remove:'provider'}, 1, 'provider'],
    ['SOAP 조회 식별자 누락', 'protocol_support_matrix', {path:matrix,remove:'GetServices'}, 1, 'GetServices'],
    ['matrix 관계 링크 누락', 'protocol_support_matrix', {path:support,remove:'./onvif-protocol-support-matrix.md'}, 1, 'matrix'],
    ['profile 매핑 누락', 'probe_fixture_contract', {path:support,remove:'sourceDraft.rtspUrl'}, 1, 'profile policy'],
    ['draft 무저장 필드 누락', 'probe_fixture_contract', {path:support,remove:'storageAction'}, 1, 'preview contract'],
    ['검사 안내 링크 누락', 'no_device_mode', {path:support,remove:'./onvif-no-device-verification.md'}, 1, 'no-device'],
    ['no-device 실패 fixture를 PASS로 위장', 'no_device_mode', {path:'test/fixtures/onvif_no_device_suite_failure_summary.json',failure:true}, 1, 'failure summary'],
    ['제품 TLS hostname 검사 누락', 'protocol_support_matrix', {path:'src/ingress/onvif_live_import.cpp',remove:'SSL_set1_host'}, 1, 'implementation missing'],
    ['쌍 저장 허용 문서 경계 누락', 'unsupported_api_guard', {path:'docs/onvif-unsupported-api-guard.md',remove:'PUT /ops/api/onvif/channels/{channelId}'}, 1, 'allowed boundary'],
    ['제품 쌍 저장 route 누락', 'unsupported_api_guard', {path:'src/ingress/webrtc_http_server_runtime.cpp',remove:'/ops/api/onvif/channels/'}, 1, 'supported ONVIF route'],
    ['프로필 검사 안내 명령 누락', 'probe_profile_variants', {path:'docs/onvif-no-device-verification.md',remove:'verify-onvif-probe-profile-variants'}, 1, 'profile variant command'],
    ['vendor fixture 검사 안내 명령 누락', 'synthetic_vendor_fixture_pack', {path:'docs/onvif-no-device-verification.md',remove:'verify-onvif-synthetic-vendor-fixtures'}, 1, 'vendor fixture command'],
  ];
  for (const [name, verifier, mutation, expected, reason] of cases) await t.test(name, () => {
    const before = mutation.path ? crypto.createHash('sha256').update(read(mutation.path)).digest('hex') : null;
    const program = `
      import fs from 'node:fs'; import path from 'node:path'; import {pathToFileURL} from 'node:url';
      const root=${JSON.stringify(root)}, mutation=${JSON.stringify(mutation)}, original=fs.readFileSync;
      fs.readFileSync=function(file, options){
        const rel=path.relative(root,String(file));
        if(['docs/development-backlog.md','docs/release-test-records.md','docs/release-evidence-index.md'].includes(rel)) throw new Error('과거 원장 읽기 금지');
        const raw=original.call(this,file,options); let text=String(raw);
        if(mutation.prose && rel.startsWith('docs/onvif-')) text=text.replace(/^#{1,6}.*$/gm,'# 한글 제목').replaceAll('v1.8.0','').replace(/2026-05-15[\\s\\S]*?실제 ONVIF[\\s\\S]*?수행하지 않았습니다\\./g,'');
        if(rel===mutation.path){
          if(mutation.remove) text=text.replaceAll(mutation.remove,'');
          if(mutation.row) text=text.split('\\n').map(line=>line.startsWith('| '+mutation.row+' |')?line.replaceAll('비지원','지원').replaceAll('미지원','지원'):line).join('\\n');
          if(mutation.failure){const d=JSON.parse(text);d.completed=d.total;d.failed=null;text=JSON.stringify(d);}
          if(mutation.successFailure){const d=JSON.parse(text);d.results[0].status=1;text=JSON.stringify(d);}
          if(mutation.leak){const d=JSON.parse(text);d.unexpected='operator-entered-secret';text=JSON.stringify(d);}
        }
        return Buffer.isBuffer(raw)?Buffer.from(text):text;
      };
      for(const key of ['writeFileSync','appendFileSync','unlinkSync','rmSync','renameSync','mkdirSync'])fs[key]=()=>{throw new Error('정적 검사 파일 쓰기 금지');};
      await import(pathToFileURL(path.join(root,'scripts/internal/verify_onvif_${verifier}.mjs')).href);
    `;
    const r=spawnSync(process.execPath,['--input-type=module','--eval',program],{cwd:root,encoding:'utf8',timeout:15000,maxBuffer:4*1024*1024});
    assert.equal(r.error,undefined);assert.equal(r.signal,null);assert.equal(r.status,expected,r.stdout+r.stderr);
    if(reason)assert((r.stdout+r.stderr).includes(reason),r.stdout+r.stderr);
    if(mutation.path)assert.equal(crypto.createHash('sha256').update(read(mutation.path)).digest('hex'),before,'반례 뒤 원본 불변');
  });
});

test('DOC-ONVIF-DEFINITION 현행 정의의 제목·문장 위치와 계약 누락 구분', () => {
  for (const [path, validate, identifiers] of [
    ['docs/onvif-no-device-verification.md', validateOnvifNoDeviceDocumentation,
      ['generatedAt', 'results', 'MEDIA_SERVER_ONVIF_FIELD_ENDPOINT', '--output', 'onvif-field-smoke-gate.md']],
    ['docs/onvif-rtsps-draft-policy.md', validateOnvifRtspsDocumentation,
      ['rtsps://', 'kind=rtsp', 'rtspUrl', 'POST /ops/api/onvif/import-draft', 'OpenSSL', 'onvif-tls-transport-policy.md']],
  ]) {
    const doc = read(path);
    assert.deepEqual(validate(doc), [], path);
    assert.deepEqual(validate(doc.replace(/^#{1,6}.*$/gm, '# 다른 제목').replaceAll('(./', '(').split('\n\n').reverse().join('\n\n')), [], path);
    assert(validate('').length > 0, path);
    for (const id of identifiers) assert(validate(doc.replaceAll(id, '')).some(error => error.includes(id)), path + ': ' + id);
  }
  const doc = read('docs/onvif-no-device-verification.md');
  assert(validateOnvifNoDeviceDocumentation(doc.replaceAll('미확인', '성공')).some(error => error.includes('realDeviceEndpointSuccess')));
});

test('DOC-ONVIF-TLS 문서 preflight 변경은 실제 TLS 실행을 대체하지 않음', async t => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  for (const [name, remove, expected, reason] of [
    ['현행 문서 preflight만 통과', '', 0, 'preflight-only; actual TLS not-run'],
    ['문서 TLS 명령 누락 거부', 'verify-onvif-https-tls-fixture', 1, 'no-device doc missing TLS fixture term'],
    ['별도 C++ transport 검사 경계 누락 거부', 'SendOnvifSoapHttp', 1, 'no-device doc missing TLS fixture term'],
  ]) await t.test(name, () => {
    const program = `
      import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
      const root=${JSON.stringify(root)}, original=fs.readFileSync;
      fs.readFileSync=function(p,options){const raw=original.call(this,p,options);if(path.relative(root,String(p))!=='docs/onvif-no-device-verification.md')return raw;const text=String(raw).replaceAll(${JSON.stringify(remove)},'');return Buffer.isBuffer(raw)?Buffer.from(text):text;};
      // 실제 인증서 생성/소켓 이전에 종료한다. 이 경계를 통과했다는 사실만 검사한다.
      fs.mkdtempSync=()=>{console.log('preflight-only; actual TLS not-run');process.exit(0);};
      for(const key of ['writeFileSync','appendFileSync','unlinkSync','rmSync','renameSync','mkdirSync'])fs[key]=()=>{throw new Error('문서 preflight에서 파일 쓰기 금지');};
      await import(pathToFileURL(path.join(root,'scripts/internal/verify_onvif_https_tls_fixture.mjs')).href);
    `;
    const r=spawnSync(process.execPath,['--input-type=module','--eval',program],{cwd:root,encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
    assert.equal(r.error,undefined);assert.equal(r.signal,null);assert.equal(r.status,expected,r.stdout+r.stderr);
    assert((r.stdout+r.stderr).includes(reason),r.stdout+r.stderr);
  });
});

// 예상 RED: 현재 정책 소비자가 실제 계약과 무관한 옛 영문 제목을 필수로 요구한다.
test('DOC-ONVIF-CONTRACT 현행 TLS 정책은 제목 변경을 허용한다', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const program = `
    import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
    const root=${JSON.stringify(root)}, original=fs.readFileSync;
    fs.readFileSync=function(p,options){const raw=original.call(this,p,options);if(!path.relative(root,String(p)).startsWith('docs/onvif-'))return raw;const text=String(raw).replace(/^#{1,6}.*$/gm,'# 변경된 제목');return Buffer.isBuffer(raw)?Buffer.from(text):text;};
    for(const key of ['writeFileSync','appendFileSync','unlinkSync','rmSync','renameSync','mkdirSync'])fs[key]=()=>{throw new Error('정적 검사 파일 쓰기 금지');};
    await import(pathToFileURL(path.join(root,'scripts/internal/verify_onvif_tls_transport_policy.mjs')).href);
  `;
  const r=spawnSync(process.execPath,['--input-type=module','--eval',program],{cwd:root,encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
  assert.equal(r.error,undefined);assert.equal(r.signal,null);assert.equal(r.status,0,r.stdout+r.stderr);
});

test('DOC-ONVIF-TLS-CONTRACT 출력·원본 안전 검사 누락 거부와 표현 변경 허용', async t => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const cases = [
    ['SOAP 제목 변경', 'https_soap_transport_design', {prose:true}, 0, 'actual TLS not-run'],
    ['fixture summary 실장비 성공 위장', 'tls_transport_policy', {path:'docs/onvif-https-tls-fixture-harness-design.md',from:'미확인',to:'성공'}, 1, 'realDeviceEndpointSuccess'],
    ['fixture 만료 인증서 반례 삭제', 'https_soap_transport_design', {path:'docs/onvif-https-tls-fixture-harness-design.md',from:'certificate expired failure'}, 1, 'certificate expired failure'],
    ['CA 설정 계약 삭제', 'tls_transport_policy', {path:'docs/onvif-tls-transport-policy.md',from:'MEDIA_SERVER_ONVIF_TLS_CA_FILE'}, 1, 'MEDIA_SERVER_ONVIF_TLS_CA_FILE'],
    ['제품 hostname 검사 삭제', 'tls_transport_policy', {path:'src/ingress/onvif_live_import.cpp',from:'SSL_set1_host'}, 1, 'hostname verification'],
    ['제품 인증서 오류 검사 삭제', 'https_soap_transport_design', {path:'src/ingress/onvif_live_import.cpp',from:'TLS certificate verification failed'}, 1, 'implementation missing'],
    ['C++ 비밀번호 누출 반례 삭제', 'tls_transport_policy', {path:'scripts/internal/onvif_http_transport_smoke.cpp',from:'transport error leaked URL password'}, 1, 'redaction assertion'],
    ['관계 링크 삭제', 'https_soap_transport_design', {path:'docs/onvif-https-soap-transport-design.md',from:'onvif-auth-injection-design.md'}, 1, 'contract link missing'],
  ];
  for (const [name, verifier, mutation, expected, reason] of cases) await t.test(name, () => {
    const before = mutation.path ? crypto.createHash('sha256').update(read(mutation.path)).digest('hex') : null;
    const program = `
      import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
      const root=${JSON.stringify(root)}, mutation=${JSON.stringify(mutation)}, original=fs.readFileSync;
      fs.readFileSync=function(p,options){const rel=path.relative(root,String(p));if(['docs/release-test-records.md','docs/release-evidence-index.md','docs/development-backlog.md'].includes(rel))throw new Error('과거 원장 읽기 금지');const raw=original.call(this,p,options);let text=String(raw);if(mutation.prose&&rel.startsWith('docs/onvif-'))text=text.replace(/^#{1,6}.*$/gm,'# 변경된 제목').replaceAll('(./','(');if(rel===mutation.path)text=text.replaceAll(mutation.from,mutation.to||'');return Buffer.isBuffer(raw)?Buffer.from(text):text;};
      for(const key of ['writeFileSync','appendFileSync','unlinkSync','rmSync','renameSync','mkdirSync'])fs[key]=()=>{throw new Error('정적 검사 파일 쓰기 금지');};
      await import(pathToFileURL(path.join(root,'scripts/internal/verify_onvif_${verifier}.mjs')).href);
    `;
    const r=spawnSync(process.execPath,['--input-type=module','--eval',program],{cwd:root,encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
    assert.equal(r.error,undefined);assert.equal(r.signal,null);assert.equal(r.status,expected,r.stdout+r.stderr);
    assert((r.stdout+r.stderr).includes(reason),r.stdout+r.stderr);
    if(mutation.path)assert.equal(crypto.createHash('sha256').update(read(mutation.path)).digest('hex'),before,'변이 후 원본 불변');
  });
});

test('DOC-ONVIF-AUTH 현행 문서·fixture·주입 안전 조건과 원본 불변', async t => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const cases = [
    ['인증 문서 제목·상대 링크 표현 변경', 'auth_injection_design', {prose:true}, 0, 'actual auth/network/UI not-run'],
    ['provider 정적 경계만 확인', 'credential_reference_policy', {prose:true}, 0, 'preflight-only; C++ not-run'],
    ['실제 lookup 수행으로 문서 위장', 'credential_reference_policy', {path:'docs/onvif-credential-reference-policy.md',from:'credentialLookupPerformed=false',to:'credentialLookupPerformed=true'}, 1, 'credentialLookupPerformed'],
    ['미구현 Digest 상태 승격', 'auth_injection_design', {path:'docs/onvif-auth-injection-design.md',from:'design-only',to:'implemented'}, 1, 'method state'],
    ['provider 비노출 계약 누락', 'auth_injection_design', {path:'docs/onvif-credential-reference-policy.md',from:'credentialMaterialExposed'}, 1, 'credentialMaterialExposed'],
    ['현행 저장소 결정 연결 누락', 'credential_reference_policy', {path:'docs/onvif-credential-store-integration-design.md',from:'defer-product-persistent-store'}, 1, 'defer-product-persistent-store'],
    ['제품 ready 조건 제거', 'auth_injection_design', {path:'src/ingress/onvif_live_import.cpp',from:'CredentialLookupStatus::kReady'}, 1, 'missing auth injection term'],
    ['미지원 인증을 코드에 주입', 'auth_injection_design', {path:'src/ingress/onvif_live_import.cpp',append:'\nPasswordDigest\n'}, 1, 'unexpectedly includes unsupported'],
    ['auth fixture raw secret 허용 거부', 'auth_injection_design', {path:'test/fixtures/onvif_auth_method_design_matrix.json',fixtureSecret:true}, 1, 'must not include plaintext secrets'],
    ['store fixture의 영속 지원 승격 거부', 'credential_reference_policy', {path:'test/fixtures/onvif_credential_store_policy_decision.json',storeEnabled:true}, 1, 'scope disabled: productPersistentSecretStore'],
  ];
  for (const [name, verifier, mutation, expected, reason] of cases) await t.test(name, () => {
    const before = mutation.path ? crypto.createHash('sha256').update(read(mutation.path)).digest('hex') : null;
    const program = `
      import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
      const root=${JSON.stringify(root)},mutation=${JSON.stringify(mutation)},original=fs.readFileSync;
      fs.readFileSync=function(p,options){const rel=path.relative(root,String(p));if(['docs/release-test-records.md','docs/release-evidence-index.md','docs/development-backlog.md'].includes(rel))throw new Error('과거 원장 읽기 금지');const raw=original.call(this,p,options);let text=String(raw);if(mutation.prose&&rel.startsWith('docs/onvif-'))text=text.replace(/^#{1,6}.*$/gm,'# 다른 제목').replaceAll('(./','(');if(rel===mutation.path){if(mutation.from)text=text.replaceAll(mutation.from,mutation.to||'');if(mutation.append)text+=mutation.append;if(mutation.fixtureSecret){const data=JSON.parse(text);data.scope.plaintextSecretIncluded=true;text=JSON.stringify(data);}if(mutation.storeEnabled){const data=JSON.parse(text);data.currentScope.productPersistentSecretStore=true;text=JSON.stringify(data);}}return Buffer.isBuffer(raw)?Buffer.from(text):text;};
      fs.mkdtempSync=()=>{console.log('preflight-only; C++ not-run');process.exit(0);};
      for(const key of ['writeFileSync','appendFileSync','unlinkSync','rmSync','renameSync','mkdirSync'])fs[key]=()=>{throw new Error('정적 검사 파일 쓰기 금지');};
      await import(pathToFileURL(path.join(root,'scripts/internal/verify_onvif_${verifier}.mjs')).href);
    `;
    const r=spawnSync(process.execPath,['--input-type=module','--eval',program],{cwd:root,encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
    assert.equal(r.error,undefined);assert.equal(r.signal,null);assert.equal(r.status,expected,r.stdout+r.stderr);
    assert((r.stdout+r.stderr).includes(reason),r.stdout+r.stderr);
    if(mutation.path)assert.equal(crypto.createHash('sha256').update(read(mutation.path)).digest('hex'),before,'변이 후 원본 불변');
  });
});

test('DOC-ONVIF-SUITE 실행기 실패 전파·후속 중단·summary는 격리 stub으로 확인', async t => {
  const root=fileURLToPath(new URL('../../',import.meta.url));
  const expected=JSON.parse(read('test/fixtures/onvif_no_device_suite_success_summary.json')).results.map(r=>r.command);
  const before=crypto.createHash('sha256').update(read('scripts/internal/verify_onvif_no_device_suite.mjs')).digest('hex');
  for(const [name, failAt, status, exit] of [['전 단계 성공 구조',0,0,0],['4단계 실패 시 뒤 단계 미실행',4,7,7],['자식 종료 status 없음은 실패',4,null,1]]) await t.test(name,()=>{
    const program=`
      import fs from 'node:fs';import path from 'node:path';import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';import {pathToFileURL} from 'node:url';
      const root=${JSON.stringify(root)},calls=[];
      cp.spawnSync=(file,args)=>{if(file!==path.join(root,'server.sh'))throw new Error('예상 외 자식 실행');calls.push('./server.sh '+args.join(' '));return {status:calls.length===${failAt}?${JSON.stringify(status)}:0};};
      syncBuiltinESMExports();
      fs.mkdirSync=()=>{};
      fs.writeFileSync=(p,raw)=>{if(p!==path.join(root,'in-memory-summary.json'))throw new Error('예상 외 쓰기');console.log('__SUMMARY__'+JSON.stringify({summary:JSON.parse(raw),calls}));};
      for(const key of ['appendFileSync','unlinkSync','rmSync','renameSync'])fs[key]=()=>{throw new Error('실행기 자체검사 파일 쓰기 금지');};
      const script=path.join(root,'scripts/internal/verify_onvif_no_device_suite.mjs');
      process.argv=[process.execPath,script,'--json-output','in-memory-summary.json'];
      await import(pathToFileURL(script).href);
    `;
    const r=spawnSync(process.execPath,['--input-type=module','--eval',program],{cwd:root,encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
    assert.equal(r.error,undefined);assert.equal(r.signal,null);assert.equal(r.status,exit,r.stdout+r.stderr);
    const lines=r.stdout.split('\n').filter(line=>line.startsWith('__SUMMARY__'));
    assert.equal(lines.length,1);
    const {summary,calls}=JSON.parse(lines[0].slice('__SUMMARY__'.length));
    assert.equal(summary.total,expected.length);assert.deepEqual(calls,expected.slice(0,failAt||expected.length));
    assert.equal(summary.completed,failAt?failAt-1:expected.length);assert.equal(summary.failed,failAt?expected[failAt-1]:null);
    assert.equal(summary.realDeviceEndpointSuccess,'미확인');assert.equal(summary.mode,'실장비 제외');
    assert.equal(summary.schema,'media-server.onvif-no-device-suite-summary.v1');assert(Number.isFinite(Date.parse(summary.generatedAt)));
    assert.deepEqual(summary.results,calls.map((command,index)=>({index:index+1,command,ok:!failAt||index+1<failAt,status:failAt&&index+1===failAt?exit:0})));
  });
  assert.equal(crypto.createHash('sha256').update(read('scripts/internal/verify_onvif_no_device_suite.mjs')).digest('hex'),before);
  assert.equal(fs.existsSync(new URL('../../in-memory-summary.json',import.meta.url)),false);
});

test('DOC-FIELD-CONTRACT 현행 field 정의·반례와 과거 원장 독립', async t => {
  const root=fileURLToPath(new URL('../../',import.meta.url));
  const gate='verify_onvif_field_smoke_gate.mjs',redaction='verify_onvif_field_smoke_redaction.mjs',external='verify_external_turn_whep_field_gate.mjs';
  const gateDoc='docs/onvif-field-smoke-gate.md',redactionDoc='docs/onvif-field-smoke-artifact-redaction.md',externalDoc='docs/external-turn-whep-field-gate.md';
  const summary='test/fixtures/onvif_field_smoke_artifact_sample/redacted_probe_summary.json';
  const cases=[
    ['gate 제목·링크 표현 변경',gate,{prose:true},0,''],
    ['redaction 제목·체크박스 형식 변경',redaction,{prose:true},0,''],
    ['외부 gate 과거 문구 없이 검사',external,{prose:true},0,''],
    ['gate schema 누락',gate,{path:gateDoc,from:'media-server.onvif-field-smoke-gate.v1'},1,'definition missing'],
    ['gate 실패 상태 누락',gate,{path:gateDoc,from:'`not-run`, `blocked`, `failed`, `passed`',to:'`passed`'},1,'states missing/invalid'],
    ['무장비 성공 승격',gate,{path:gateDoc,from:'`noDeviceSuiteCountsAsFieldSuccess` | `false`',to:'`noDeviceSuiteCountsAsFieldSuccess` | `true`'},1,'field/value missing'],
    ['gate 정제 flag 누락',gate,{path:gateDoc,from:'endpointRedacted'},1,'field/value missing'],
    ['현재 색인 링크 누락',gate,{path:'docs/README.md',from:'onvif-field-smoke-gate.md'},1,'current docs missing gate link'],
    ['sample 실장비 성공 승격',gate,{path:summary,sampleFieldPass:true},1,'real device status mismatch'],
    ['sample 원문 포함',gate,{path:summary,leak:true},1,'leaked forbidden literal'],
    ['redaction source 계약 누락',redaction,{path:redactionDoc,from:'sourceDraft'},1,'definition missing'],
    ['redaction 현행 gate 링크 누락',redaction,{path:redactionDoc,from:'onvif-field-smoke-gate.md'},1,'contract link missing'],
    ['redaction secret 예시 거부',redaction,{path:redactionDoc,append:'\noperator-entered-secret\n'},1,'forbidden literal'],
    ['외부 미접속 기본값 변경',external,{path:externalDoc,from:'`externalNetworkAttempted` | `false`',to:'`externalNetworkAttempted` | `true`'},1,'field/value missing'],
    ['외부 실패 fixture를 성공으로 바꿈',external,{path:'test/fixtures/external_turn_whep_field_gate/cases.json',fixtureFail:true},1,'fixture expectation mismatch'],
    ['현행 SAFE-039 명령 연결 누락',external,{path:'docs/project-feature-test-inventory.md',removeFeature:true},1,'SAFE-039'],
    ['실행 대상 오연결',external,{path:'server.sh',dispatch:true},1,'dispatch'],
    ['coverage의 exact 명령 오연결',external,{path:'test/fixtures/project_feature_implementation_evidence.json',coverageDrift:true},1,'semantic coverage'],
    ['통합검사의 자식 호출 누락',external,{path:'scripts/internal/verify_v230_conditional_field_evidence.mjs',from:'runNodeScript("verify_external_turn_whep_field_gate.mjs"'},1,'must execute'],
    ['명시 역사 감사는 누락 거부',gate,{historical:true},1,'backlog missing gate term'],
  ];
  for(const [name,verifier,mutation,expected,reason] of cases) await t.test(name,()=>{
    const before=mutation.path?crypto.createHash('sha256').update(read(mutation.path)).digest('hex'):null;
    const program=`
      import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
      const root=${JSON.stringify(root)},m=${JSON.stringify(mutation)},read=fs.readFileSync;
      if(m.historical)process.argv=[process.execPath,'verifier','--backlog','docs/development-backlog.md'];
      fs.readFileSync=function(file,opts){const rel=path.relative(root,String(file));
        if(['docs/development-backlog.md','docs/release-test-records.md','docs/release-evidence-index.md'].includes(rel)){if(m.historical)return '';throw new Error('과거 원장 읽기 금지');}
        const raw=read.call(this,file,opts);let text=String(raw);
        if(m.prose&&[${JSON.stringify(gateDoc)},${JSON.stringify(redactionDoc)},${JSON.stringify(externalDoc)},'docs/onvif-live-source-support.md','docs/onvif-no-device-verification.md'].includes(rel))text=text.replace(/^#{1,6}.*$/gm,'# 다른 제목').replaceAll('(./','(').replaceAll('- [ ] ','- ');
        if(rel===m.path){if(m.from)text=text.replaceAll(m.from,m.to||'');if(m.append)text+=m.append;
          if(m.sampleFieldPass){const j=JSON.parse(text);j.gateDecision.realDeviceEndpointSuccess='pass';text=JSON.stringify(j);}
          if(m.leak){const j=JSON.parse(text);j.notes='operator-entered-secret';text=JSON.stringify(j);}
          if(m.fixtureFail){const j=JSON.parse(text);j.cases.find(c=>c.id==='approved-turn-relay-fail-not-release-pass').turnOutcome='pass';text=JSON.stringify(j);}
          if(m.coverageDrift){const j=JSON.parse(text);j.items.find(c=>c.id==='MEDIA-021').semanticEvidence.verifierAssertion.command='verify-unrelated';text=JSON.stringify(j);}
          if(m.removeFeature)text=text.split('\\n').filter(line=>!line.startsWith('| SAFE-039 |')).join('\\n');
          if(m.dispatch){const start=text.indexOf('  verify-external-turn-whep-field-gate)'),end=text.indexOf('    ;;',start);if(start<0||end<0)throw new Error('dispatch fixture missing');text=text.slice(0,start)+text.slice(start,end).replaceAll('verify_external_turn_whep_field_gate.mjs','verify_other.mjs')+text.slice(end);}
        }return Buffer.isBuffer(raw)?Buffer.from(text):text;};
      for(const k of ['writeFileSync','appendFileSync','unlinkSync','rmSync','renameSync','mkdirSync'])fs[k]=()=>{throw new Error('정적 검사 파일 쓰기 금지');};
      await import(pathToFileURL(path.join(root,'scripts/internal',${JSON.stringify(verifier)})).href);
    `;
    const r=spawnSync(process.execPath,['--input-type=module','--eval',program],{cwd:root,encoding:'utf8',timeout:15000,maxBuffer:2*1024*1024});
    assert.equal(r.error,undefined);assert.equal(r.signal,null);assert.equal(r.status,expected,r.stdout+r.stderr);
    if(reason)assert((r.stdout+r.stderr).includes(reason),r.stdout+r.stderr);
    if(mutation.path)assert.equal(crypto.createHash('sha256').update(read(mutation.path)).digest('hex'),before,'원본 불변');
  });
});

test('DOC-FIELD-INTEGRATION 하위 실패·보고서 보존·정리 전파는 격리 stub으로 확인',async t=>{
  const root=fileURLToPath(new URL('../../',import.meta.url));
  for(const scenario of ['pass','success-stderr','git-missing','onvif-fail','child-fail','report-fail','report-missing','report-invalid','network-claim','cleanup-fail']) await t.test(scenario,()=>{
    const program=`
      import fs from 'node:fs';import path from 'node:path';import cp from 'node:child_process';
      import {pathToFileURL} from 'node:url';import {syncBuiltinESMExports} from 'node:module';
      const root=${JSON.stringify(root)},scenario=${JSON.stringify(scenario)},read=fs.readFileSync,exists=fs.existsSync,trace=[];
      const report={schema:'media-server.external-turn-whep-field-gate-report.v1',gateStatus:scenario==='report-fail'?'fail':'pass',externalNetworkAttempted:scenario==='network-claim',fieldSmokeStatus:'not-run',turnRelayStatus:'not-run',whepPlaybackStatus:'not-run',defaultReleasePassClaimAllowed:false};
      process.argv=[process.execPath,'verifier','--json-report','/unit-parent.json'];
      fs.mkdtempSync=()=>'/unit-owned';
      fs.existsSync=function(p){if(p==='/unit-owned/external-turn-whep.json')return scenario!=='report-missing';return exists.call(this,p);};
      fs.readFileSync=function(p,opts){if(p==='/unit-owned/external-turn-whep.json'){trace.push('read-child');return scenario==='report-invalid'?'invalid':JSON.stringify(report);}const rel=path.relative(root,String(p));if(['docs/development-backlog.md','docs/release-test-records.md','docs/release-evidence-index.md'].includes(rel))throw new Error('과거 원장 읽기 금지');return read.call(this,p,opts);};
      fs.unlinkSync=p=>{if(p!=='/unit-owned/external-turn-whep.json')throw new Error('unexpected unlink');trace.push('unlink');};
      fs.rmdirSync=p=>{if(p!=='/unit-owned')throw new Error('unexpected rmdir');trace.push('rmdir');if(scenario==='cleanup-fail')throw Object.assign(new Error('fixture cleanup failure'),{code:'EACCES'});};
      fs.mkdirSync=p=>{if(p!=='/')throw new Error('unexpected mkdir');};
      fs.writeFileSync=(p,data)=>{if(p!=='/unit-parent.json')throw new Error('unexpected write');console.log('UNIT_EVIDENCE='+JSON.stringify({payload:JSON.parse(data),trace}));};
      cp.execFileSync=(command,args)=>{if(command==='git'){if(scenario==='git-missing')throw new Error('not a repository');return 'unit-source';}const file=String(args[0]);if(file.endsWith('verify_onvif_field_smoke_gate.mjs')){if(scenario==='onvif-fail')throw new Error('fixture onvif child failed');return 'ONVIF field smoke gate summary\\nrealDeviceEndpointSuccess: unverified unless field gate report proves pass';}if(file.endsWith('verify_external_turn_whep_field_gate.mjs')){if(scenario==='child-fail'){const error=new Error('child failed');error.status=1;error.stdout='failed check';error.stderr='fixture diagnostic';throw error;}return 'External TURN/WHEP field gate summary';}throw new Error('unexpected child process');};
      cp.spawnSync=(command,args)=>{if(command!==process.execPath||!String(args[0]).endsWith('verify_external_turn_whep_field_gate.mjs'))throw new Error('unexpected captured child');return {status:scenario==='child-fail'?1:0,signal:null,stdout:scenario==='child-fail'?'failed check':'External TURN/WHEP field gate summary',stderr:scenario==='child-fail'?'fixture diagnostic':scenario==='success-stderr'?'fixture warning':''};};
      syncBuiltinESMExports();
      await import(pathToFileURL(path.join(root,'scripts/internal/verify_v230_conditional_field_evidence.mjs')).href);
    `;
    const r=spawnSync(process.execPath,['--input-type=module','--eval',program],{cwd:root,encoding:'utf8',timeout:15000,maxBuffer:2*1024*1024});
    assert.equal(r.error,undefined);assert.equal(r.signal,null);
    const good=['pass','success-stderr','git-missing'].includes(scenario);assert.equal(r.status,good?0:1,r.stdout+r.stderr);
    const row=r.stdout.split('\n').find(line=>line.startsWith('UNIT_EVIDENCE='));assert(row,r.stdout+r.stderr);
    const {payload,trace}=JSON.parse(row.slice('UNIT_EVIDENCE='.length)),evidence=payload.runtimeEvidence.externalTurnWhepGate;
    assert.equal(payload.status,good?'pass':'fail');assert.equal(evidence.jsonReport,null);
    assert.equal(evidence.cleanup.status,scenario==='cleanup-fail'?'fail':'complete');
    assert(trace.includes('rmdir'));
    if(!['report-missing','report-invalid'].includes(scenario)){assert.deepEqual(evidence.report.schema,'media-server.external-turn-whep-field-gate-report.v1');assert(trace.indexOf('read-child')<trace.indexOf('unlink'));}
    if(scenario==='child-fail'){assert.equal(evidence.execution.exit,1);assert.equal(evidence.execution.stderr,'fixture diagnostic');assert.equal(evidence.failureReason,'external field child command failed');}
    if(scenario==='success-stderr')assert.equal(evidence.execution.stderr,'fixture warning');
    if(scenario==='cleanup-fail'){assert.equal(evidence.cleanup.remainingPath,'/unit-owned');assert.equal(evidence.cleanup.errorCode,'EACCES');}
    else assert.equal(evidence.cleanup.remainingPath,undefined);
    if(scenario==='git-missing'){assert.equal(payload.branch,'unknown');assert.equal(payload.head,'unknown');}
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
