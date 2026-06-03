#!/usr/bin/env node
// 파일 용도: v2.2.0 S09 UI fulltest matrix/evidence 문서와 manual UI runner 연결을 정적 검증한다.
import fs from 'node:fs';

const checks = [];
const read = (path) => fs.readFileSync(path, 'utf8');
const readIfExists = (path) => (fs.existsSync(path) ? read(path) : '');

const server = read('server.sh');
const matrixDoc = readIfExists('docs/v220-ui-fulltest-matrix-evidence.md');
const docsIndex = read('docs/README.md');
const backlog = read('docs/development-backlog.md');
const stream = read('docs/stream-verification.md');
const inventory = read('docs/project-feature-test-inventory.md');
const fulltest = read('docs/manual-ui-fulltest.md');
const checklist = read('docs/manual-ui-checklist.md');
const template = read('docs/manual-ui-result-template.md');
const runner = read('scripts/internal/verify_manual_ui_evidence_runner.mjs');

function check(name, condition) {
  checks.push({ name, condition });
}

function includesAll(text, needles) {
  return needles.every((needle) => text.includes(needle));
}

function featureRows(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^\| (UI|AUTH|SRC|RULE|EVT|CLIENT|MEDIA|LAB|SAFE)-\d+ \|/.test(line));
}

const featureRowCount = featureRows(inventory).length;
const uiTargetCount = featureRows(inventory).filter((line) => {
  const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
  return (cells[4] || '').split(',').map((item) => item.trim()).includes('UI');
}).length;

const s09Routes = [
  '/setup',
  '/login',
  '/password/change',
  '/invite/setup',
  '/client/request-access',
  '/ops/home',
  '/ops/dashboard',
  '/ops/events',
  '/ops/rules',
  '/client/live',
  '/client/dashboard',
  '/client/events',
];

const s09FeatureIds = [
  'UI-002',
  'UI-003',
  'UI-004',
  'UI-007',
  'UI-008',
  'UI-009',
  'UI-010',
  'UI-012',
  'UI-014',
  'UI-015',
  'UI-016',
  'UI-017',
  'UI-019',
  'UI-020',
  'UI-021',
  'SAFE-018',
  'SAFE-019',
  'SAFE-020',
  'SAFE-021',
];

const s09Markers = [
  'ops-workspace-home',
  'ops-workspace-dashboard',
  'ops-workspace-events',
  'rules-workspace',
  'client-live-workspace',
  'client-viewer-dashboard',
  'client-viewer-events',
  'auth-form-grid',
  'auth-login-form',
  'auth-setup-form',
  'auth-password-change-form',
  'auth-invite-setup-form',
  'auth-access-request-form',
];

check(
  'server exposes S09 verifier command',
  server.includes('verify-v220-ui-fulltest-matrix-evidence') &&
    server.includes('verify_v220_ui_fulltest_matrix_evidence.mjs')
);

check(
  'S09 matrix doc exists and declares schema',
  matrixDoc.includes('media-server.v220-ui-fulltest-matrix.v1') &&
    matrixDoc.includes('media-server.manual-ui-evidence-input.v1') &&
    matrixDoc.includes('verify-manual-ui-evidence-runner')
);

check('S09 matrix doc lists redesigned routes', includesAll(matrixDoc, s09Routes));
check('S09 matrix doc lists required feature IDs', includesAll(matrixDoc, s09FeatureIds));
check('S09 matrix doc lists route markers and controls', includesAll(matrixDoc, s09Markers));

check(
  'S09 matrix doc pins responsive/theme/redaction/role evidence',
  includesAll(matrixDoc, [
    '320',
    '390',
    '760',
    '1180',
    'light/dark',
    'source URL',
    'raw JSON',
    'role guard',
    'viewer redaction',
  ])
);

check(
  'S09 matrix doc separates non-substitution boundaries',
  includesAll(matrixDoc, [
    '브라우저 UI 풀테스트 PASS를 만들지 않습니다',
    '30분 soak',
    '120분 longrun',
    'published metadata',
    'Event POST',
    'WebRTC DataChannel',
    'RTSP/WebRTC media path',
  ])
);

check(
  'manual UI docs link S09 matrix and runner schema',
  [fulltest, checklist, template].every((text) =>
    includesAll(text, [
      'v220-ui-fulltest-matrix-evidence.md',
      'media-server.v220-ui-fulltest-matrix.v1',
      'verify-manual-ui-evidence-runner',
    ]))
);

check(
  'docs index links S09 source-of-truth and superpowers artifacts',
  includesAll(docsIndex, [
    'v220-ui-fulltest-matrix-evidence.md',
    '2026-06-03-v220-s09-ui-fulltest-matrix-evidence-design.md',
    '2026-06-03-v220-s09-ui-fulltest-matrix-evidence.md',
  ])
);

check(
  'feature inventory records S09 without changing row counts',
  featureRowCount === 392 &&
    uiTargetCount === 244 &&
    inventory.includes('v2.2.0 S09 UI fulltest matrix / evidence') &&
    inventory.includes('media-server.v220-ui-fulltest-matrix.v1')
);

check(
  'backlog records S09 closure and non-run boundaries',
  backlog.includes('### V220-S09 UI fulltest matrix / evidence 종료 기준') &&
    backlog.includes('verify-v220-ui-fulltest-matrix-evidence') &&
    backlog.includes('브라우저 UI 풀테스트') &&
    backlog.includes('미실행')
);

check(
  'stream verification documents S09 verifier',
  stream.includes('v2.2.0 UI fulltest matrix') &&
    stream.includes('verify-v220-ui-fulltest-matrix-evidence') &&
    stream.includes('verify-manual-ui-evidence-runner')
);

check(
  'manual UI evidence runner keeps expected UI target count',
  runner.includes('const EXPECTED_UI_TARGET_ROWS = 244') &&
    runner.includes('media-server.manual-ui-evidence-input.v1')
);

let pass = 0;
for (const item of checks) {
  if (item.condition) {
    pass += 1;
    console.log(`[pass] ${item.name}`);
  } else {
    console.error(`[fail] ${item.name}`);
  }
}

console.log('\n== v2.2.0 UI fulltest matrix/evidence summary ==');
console.log(`- featureRows: ${featureRowCount}`);
console.log(`- uiTargets: ${uiTargetCount}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${checks.length - pass}`);
process.exit(pass === checks.length ? 0 : 1);
