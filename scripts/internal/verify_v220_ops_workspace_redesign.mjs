#!/usr/bin/env node
// 파일 용도: v2.2.0 S05 Ops workspace redesign 산출물과 route/CSS/문서 연결을 정적 검증한다.
import fs from 'node:fs';

const checks = [];
const read = (path) => fs.readFileSync(path, 'utf8');
const source = read('src/ingress/webrtc_http_server.cpp');
const css = read('src/ingress/product_ui_css.cpp');
const backlog = read('docs/development-backlog.md');
const stream = read('docs/stream-verification.md');
const docs = fs.existsSync('docs/v220-ops-workspace-redesign.md')
  ? read('docs/v220-ops-workspace-redesign.md')
  : '';
const server = read('server.sh');

function check(name, condition) {
  checks.push({ name, condition });
}

check('S05 command is exposed by server.sh', server.includes('verify-v220-ops-workspace-redesign'));
check(
  'S05 docs exist and define route scope',
  docs.includes('/ops/home') && docs.includes('/ops/dashboard') && docs.includes('/ops/events')
);
check(
  'home route uses ops workspace class',
  source.includes('ops-workspace-home') && source.includes('data-testid="ops-home-page"')
);
check(
  'dashboard route uses diagnostic workspace class',
  source.includes('ops-workspace-dashboard') && source.includes('data-testid="ops-dashboard-page"')
);
check(
  'events route uses event workbench class',
  source.includes('ops-workspace-events') && source.includes('data-testid="ops-events-page"')
);
check(
  'existing JS hooks stay present',
  [
    'homeChannelCount',
    'dashRootCauseList',
    'dashIncidentTimeline',
    'opsEventsRefresh',
    'eventReviewRows',
    'eventRecordRows',
  ].every((hook) => source.includes(hook))
);
check(
  'CSS defines responsive Ops workspace layout',
  [
    '.ops-workspace-hero',
    '.ops-workspace-action-grid',
    '.ops-workspace-diagnostic-grid',
    '.ops-workspace-event-grid',
    '@media (max-width: 760px)',
  ].every((needle) => css.includes(needle))
);
if (!css.includes('.ops-workspace-diagnostic-grid')) throw new Error('ops workspace diagnostic grid missing');
if (!css.includes('grid-template-columns: 34px minmax(0, 1fr);')) throw new Error('ops workspace mobile grid template missing');
check(
  'historical S05 document records closure evidence',
  docs.includes('S05 완료 evidence') && docs.includes('./server.sh verify-v220-ops-workspace-redesign')
);
check(
  'historical S05 document preserves execution boundaries',
  docs.includes('브라우저 UI 풀테스트') && docs.includes('30분 soak') && docs.includes('120분 longrun')
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

console.log('\n== v2.2.0 Ops workspace redesign summary ==');
console.log(`- pass: ${pass}`);
console.log(`- fail: ${checks.length - pass}`);
process.exit(pass === checks.length ? 0 : 1);
