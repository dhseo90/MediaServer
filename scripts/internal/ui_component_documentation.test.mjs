// 파일 용도: UI 기술 문서 소비자의 역사 기록 독립성과 기존 소스 검사의 실패 전파를 확인한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const guide = 'docs/product-shell-component-examples.md';
const cases = [
  ['architecture', 'verify_v220_ui_architecture_inventory.mjs', 'verify-v220-ui-architecture-inventory'],
  ['responsive', 'verify_v220_responsive_task_shell.mjs', 'verify-v220-responsive-task-shell'],
  ['tokens', 'verify_v220_design_token_refresh.mjs', 'verify-v220-design-token-refresh'],
  ['primitives', 'verify_v220_component_primitives.mjs', 'verify-v220-component-primitives'],
  ['renderer', 'verify_v230_ui_renderer_module_decomposition.mjs', 'verify-v230-ui-renderer-module-decomposition'],
];
const oldFiles = [
  'docs/development-backlog.md', 'docs/release-test-records.md', 'docs/release-evidence-index.md',
  'docs/v220-ui-architecture-inventory.md', 'docs/v220-responsive-task-shell.md',
  'docs/v220-design-token-refresh.md', 'docs/v220-component-primitives.md',
  'docs/v230-ui-renderer-module-decomposition.md', 'docs/README.md',
  ...['auth-setup-redesign', 'client-live-redesign', 'ops-workspace-redesign',
    'rules-workspace-redesign', 'ops-channels-workspace', 'ops-users-access-workspace',
    'ops-vlm-containment', 'client-preview-redaction-review'].map(name => 'docs/v220-' + name + '.md'),
];
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(root + file)).digest('hex');

function run(verifier, mutations = []) {
  const hashes = Object.fromEntries([guide, ...mutations.map(x => x.file)].map(file => [file, digest(file)]));
  const source = `
    import fs from 'node:fs'; import path from 'node:path'; import {fileURLToPath, pathToFileURL} from 'node:url';
    const root = ${JSON.stringify(root)}, mutations = ${JSON.stringify(mutations)};
    const oldFiles = new Set(${JSON.stringify(oldFiles)});
    const original = fs.readFileSync;
    fs.readFileSync = function(file, options) {
      const relative = path.relative(root, file instanceof URL ? fileURLToPath(file) : String(file));
      if (oldFiles.has(relative)) throw new Error('종료 기록/직접 색인 읽기 금지: ' + relative);
      const raw = original.call(this, file, options);
      if (!mutations.some(x => x.file === relative)) return raw;
      let text = String(raw);
      for (const mutation of mutations.filter(x => x.file === relative)) {
        if (mutation.empty) text = '';
        if (mutation.headings) text = text.replace(/^#{1,6} .*$/gm, '# 다른 제목');
        if (mutation.remove) text = text.replaceAll(mutation.remove, mutation.replace || '');
        if (mutation.append) text += mutation.append;
      }
      return Buffer.isBuffer(raw) ? Buffer.from(text) : text;
    };
    for (const key of ['writeFileSync', 'appendFileSync', 'unlinkSync', 'rmSync', 'renameSync', 'mkdirSync']) {
      fs[key] = () => { throw new Error('검증기 자체검사에서 파일 쓰기 금지'); };
    }
    await import(pathToFileURL(path.join(root, 'scripts/internal/' + ${JSON.stringify(verifier)})).href);
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', source], {
    cwd: root, encoding: 'utf8', timeout: 15000, maxBuffer: 4 * 1024 * 1024,
  });
  for (const [file, hash] of Object.entries(hashes)) assert.equal(digest(file), hash, file + ' 원본 불변');
  assert.equal(result.error, undefined, String(result.error));
  assert.equal(result.signal, null);
  return result;
}
function expect(verifier, mutations, exit, reason = '') {
  const result = run(verifier, mutations);
  const output = result.stdout + result.stderr;
  assert.equal(result.status, exit, output);
  if (reason) assert(output.includes(reason), output);
}

for (const [kind, verifier, command] of cases) {
  test('UI-DOC-01 ' + kind + ' 역사 기록 없이 현재 정의 검사', () => expect(verifier, [], 0));
  test('UI-DOC-02 ' + kind + ' 제목 변경 허용', () => expect(verifier, [{file: guide, headings: true}], 0));
  for (const remove of ['manual-ui-fulltest.md', '../AGENTS.md']) {
    test('UI-DOC-02 ' + kind + ' 정책 링크 누락 ' + remove,
      () => expect(verifier, [{file: guide, remove}], 1, '링크'));
  }
  test('UI-DOC-02 ' + kind + ' 현재 문서 누락',
    () => expect(verifier, [{file: guide, empty: true}], 1));
  test('UI-DOC-02 ' + kind + ' 정확한 dispatch 불일치',
    () => expect(verifier, [{file: 'server.sh', remove: verifier, replace: 'wrong_verifier.mjs'}], 1, 'dispatch'));
  test('UI-DOC-02 ' + kind + ' 명령 안내 누락',
    () => expect(verifier, [{file: guide, remove: command}], 1, '명령'));
  test('UI-DOC-02 ' + kind + ' 분야별 안내 링크 누락',
    () => expect(verifier, [{file: 'docs/stream-verification.md', remove: 'product-shell-component-examples.md'}], 1, '링크'));
  test('UI-DOC-02 ' + kind + ' 중복 dispatch 거부', () => {
    const append = '\n  ' + command + ')\n    require_internal ' + verifier + '\n    exec node "${INTERNAL_DIR}/' + verifier + '" "$@"\n    ;;\n';
    expect(verifier, [{file: 'server.sh', append}], 1, 'dispatch');
  });
}
test('UI-DOC-02 중복 viewport 거부', () => expect(cases[1][1], [
  {file: guide, append: '\n| 390px | 주 작업 | 보조 작업 |\n'},
], 1, 'viewport'));
test('UI-DOC-02 viewport 확인 조건 누락 거부', () => {
  const row = fs.readFileSync(root + guide, 'utf8').split('\n').find(line => /^\| 390px \|/.test(line));
  assert(row, '390px 정의가 있어야 반례를 만들 수 있음');
  const cells = row.split('|'); cells[3] = ' ';
  expect(cases[1][1], [{file: guide, remove: row, replace: cells.join('|')}], 1, 'viewport');
});
test('UI-DOC-02 중복 route 작업 거부', () => expect(cases[1][1], [
  {file: guide, append: '\n| /client/live | 주 작업 | 보조 작업 |\n'},
], 1, 'route'));
const failCases = [
  ['architecture', guide, 'ProductThemeBootScript', '', 'missing public helper'],
  ['architecture', guide, '/ops/rules', '', 'missing route'],
  ['responsive', guide, '390', '', 'viewport'],
  ['responsive', guide, '/client/live', '', 'route'],
  ['tokens', 'src/ingress/product_ui_css.cpp', '--font-ui:', '', 'missing --font-ui'],
  ['tokens', 'src/ingress/product_ui_css.cpp', 'font-family: var(--font-ui)', '', 'missing refreshed token usage'],
  ['tokens', 'src/ingress/product_ui_css.cpp', '', '\n.invalid {font-size: clamp(12px, 2vw, 20px);}\n', 'viewport-scaled'],
  ['primitives', 'include/ingress/product_ui_components.h', 'ProductUiToolbarHtml', '', 'component API missing'],
  ['primitives', 'src/ingress/product_ui_components.cpp', 'section-card', '', 'implementation missing'],
  ['primitives', 'src/ingress/product_ui_server_pages.cpp', 'ProductUiToolbarHtml(', '', 'component helper usage'],
  ['primitives', 'src/ingress/product_ui_auth_pages.cpp', 'ProductUiFormRowHtml(', '', 'component helper usage'],
  ['primitives', 'CMakeLists.txt', 'src/ingress/product_ui_components.cpp', '', 'CMakeLists.txt missing'],
  ['renderer', 'CMakeLists.txt', 'src/ingress/product_ui_client_css.cpp', '', 'CMakeLists.txt missing'],
  ['renderer', 'src/ingress/product_ui_client_css.cpp', 'std::string ClientShellCss()', '', 'must define ClientShellCss'],
  ['renderer', 'src/ingress/product_ui_page_scripts.cpp', '', '\nvoid AppendClientShellScript() {}\n', 'still defines'],
  ['renderer', 'src/ingress/product_ui_ops_sources_script.cpp', 'source:write', '', 'ops sources JS module missing'],
];
for (const [kind, file, remove, append, reason] of failCases) {
  test('UI-DOC-03 ' + kind + ' 기존 소스/계약 거부: ' + (remove || reason), () => {
    expect(cases.find(x => x[0] === kind)[1], [{file, remove, append}], 1, reason);
  });
}

const workspaces = [
  ['auth-setup-redesign', 'UI-002'], ['client-live-redesign', 'UI-015'],
  ['ops-workspace-redesign', 'UI-009'], ['rules-workspace-redesign', 'UI-012'],
  ['ops-channels-workspace', 'UI-011'], ['ops-users-access-workspace', 'UI-013'],
  ['ops-vlm-containment', 'UI-022'], ['client-preview-redaction-review', 'CLIENT-018'],
];
for (const [name, id] of workspaces) {
  const verifier = 'verify_v220_' + name.replaceAll('-', '_') + '.mjs';
  const command = 'verify-v220-' + name;
  test('UI-WORKSPACE-DOC-01 ' + name + ' 역사 기록 없이 현재 정의 검사', () => expect(verifier, [], 0));
  test('UI-WORKSPACE-DOC-02 ' + name + ' 제목 변경 허용', () => expect(verifier, [{file: guide, headings: true}], 0));
  test('UI-WORKSPACE-DOC-02 ' + name + ' 현재 문서 누락', () => expect(verifier, [{file: guide, empty: true}], 1));
  test('UI-WORKSPACE-DOC-02 ' + name + ' 명령 안내 누락', () => expect(verifier, [{file: guide, remove: command}], 1, '명령'));
  test('UI-WORKSPACE-DOC-02 ' + name + ' 실제 dispatch 오류',
    () => expect(verifier, [{file: 'server.sh', remove: verifier, replace: 'wrong_workspace.mjs'}], 1, 'dispatch'));
  test('UI-WORKSPACE-DOC-02 ' + name + ' 현행 기능 ID 누락',
    () => expect(verifier, [{file: 'docs/project-feature-test-inventory.md', remove: '| ' + id + ' |'}], 1, id));
  test('UI-WORKSPACE-DOC-02 ' + name + ' 중복 기능 정의 거부', () => {
    const row = fs.readFileSync(root + 'docs/project-feature-test-inventory.md', 'utf8').split('\n').find(line => line.startsWith('| ' + id + ' |'));
    assert(row);
    expect(verifier, [{file: 'docs/project-feature-test-inventory.md', append: '\n' + row + '\n'}], 1, id);
  });
  test('UI-WORKSPACE-DOC-02 ' + name + ' UI 정책 링크 누락',
    () => expect(verifier, [{file: guide, remove: 'manual-ui-fulltest.md'}], 1, '링크'));
  test('UI-WORKSPACE-DOC-02 ' + name + ' 중복 dispatch 거부', () => {
    const append = '\n  ' + command + ')\n    require_internal ' + verifier + '\n    exec node "${INTERNAL_DIR}/' + verifier + '" "$@"\n    ;;\n';
    expect(verifier, [{file: 'server.sh', append}], 1, 'dispatch');
  });
}

const criteriaVerifier = 'verify_v290_ui_fulltest_criteria_freeze.mjs';
test('UI-CRITERIA-DOC-01 종료 원장 없이 현재 UI 기준 검사', () => expect(criteriaVerifier, [], 0));
test('UI-CRITERIA-DOC-01 문서 제목 변경 허용', () => expect(criteriaVerifier,
  ['fulltest', 'checklist', 'result-template'].map(name => ({file: 'docs/manual-ui-' + name + '.md', headings: true})), 0));
for (const file of ['docs/manual-ui-fulltest.md', 'docs/manual-ui-checklist.md', 'docs/manual-ui-result-template.md']) {
  test('UI-CRITERIA-DOC-02 현행 문서 누락 ' + file, () => expect(criteriaVerifier, [{file, empty: true}], 1));
}
test('UI-CRITERIA-DOC-02 UI 정책 식별자 누락', () => expect(criteriaVerifier,
  [{file: 'docs/manual-ui-fulltest.md', remove: 'policyValidationResult'}], 1, 'UI 정책'));
for (const id of ['OPS-046', 'SAFE-076']) {
  test('UI-CRITERIA-DOC-02 정확한 기능 정의 누락 ' + id, () => expect(criteriaVerifier,
    [{file: 'docs/project-feature-test-inventory.md', remove: '| ' + id + ' |'}], 1, id));
}
test('UI-CRITERIA-DOC-02 dispatch 변경 거부', () => expect(criteriaVerifier,
  [{file: 'server.sh', remove: criteriaVerifier, replace: 'wrong_criteria.mjs'}], 1, 'dispatch'));
test('UI-CRITERIA-DOC-03 raw JSON 증거 금지 완화 거부', () => expect(criteriaVerifier,
  [{file: 'test/fixtures/ui_fulltest_evidence_policy_v4.json', remove: '"raw-json-only",'}], 1, 'raw material'));
test('UI-CRITERIA-DOC-03 정책 검사와 실제 UI PASS 혼동 거부', () => expect(criteriaVerifier,
  [{file: 'test/fixtures/ui_fulltest_evidence_policy_v4.json', remove: '"policyVerifierPassIsUiFulltestPass": false', replace: '"policyVerifierPassIsUiFulltestPass": true'}], 1, 'UI PASS'));

const workspaceFailures = [
  ['auth-setup-redesign', 'src/ingress/product_ui_auth_pages.cpp', 'data-testid="auth-login-form"', 'stable form test ids'],
  ['auth-setup-redesign', 'src/ingress/product_ui_auth_pages.cpp', 'name="currentPassword"', 'field names'],
  ['auth-setup-redesign', 'src/ingress/webrtc_http_server_runtime.cpp', 'auth::SaveBootstrapAdmin', 'auth route guard'],
  ['client-live-redesign', 'src/ingress/product_ui_client_scripts.cpp', 'data-viewer-redaction="source-url-hidden"', 'viewer redaction markers'],
  ['client-live-redesign', 'src/ingress/product_ui_client_css.cpp', '.client-live-video-grid', 'responsive Client'],
  ['ops-workspace-redesign', 'src/ingress/product_ui_server_pages.cpp', 'id="dashRootCauseList"', 'existing JS hooks'],
  ['ops-workspace-redesign', 'src/ingress/product_ui_css.cpp', 'grid-template-columns: 34px minmax(0, 1fr);', 'mobile grid template missing'],
  ['rules-workspace-redesign', 'src/ingress/product_ui_server_pages.cpp', 'id="opsRulesComposerSave"', 'existing rules hooks'],
  ['ops-channels-workspace', 'src/ingress/webrtc_http_server.cpp', 'data-channel-task="list"', 'first primary task'],
  ['ops-channels-workspace', 'src/ingress/webrtc_http_server.cpp', 'data-scope-contract="view-read-scopes-unchanged"', 'source/view management boundary'],
  ['ops-users-access-workspace', 'src/ingress/product_ui_ops_users_script.cpp', '/ops/api/access-requests', 'approval hooks'],
  ['ops-users-access-workspace', 'src/ingress/product_ui_auth_pages.cpp', 'data-access-route="invite-setup"', 'without field renames'],
  ['ops-vlm-containment', 'src/ingress/product_ui_page_scripts.cpp', 'runtimeCallAllowed === false', 'no-auto-start'],
  ['ops-vlm-containment', 'src/ingress/product_ui_server_pages.cpp', 'id="opsVlmExternalTransferWarningAck"', 'Privacy task'],
  ['client-preview-redaction-review', 'src/ingress/webrtc_http_server.cpp', 'data-admin-preview-state=', 'CLIENT-018 exact'],
  ['client-preview-redaction-review', 'scripts/internal/verify_ops_client_ui_smoke.mjs', 'client-events-rendered-leak', 'UI smoke forbids'],
];
for (const [name, file, remove, reason] of workspaceFailures) {
  test('UI-WORKSPACE-DOC-03 ' + name + ' 기존 실패 전파 ' + remove, () => {
    assert(fs.readFileSync(root + file, 'utf8').includes(remove), '반례 대상 식별자 존재: ' + file);
    expect('verify_v220_' + name.replaceAll('-', '_') + '.mjs', [{file, remove}], 1, reason);
  });
}
