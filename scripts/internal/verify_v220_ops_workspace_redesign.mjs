#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: 현행 ops-workspace-redesign 소스·문서 연결을 정적으로 확인한다. CLI 이름은 호환용이다.
import fs from 'node:fs';
import {validateUiWorkspaceDocumentation} from './documentation_contract_lib.mjs';

const checks = [];
const read = (path) => fs.readFileSync(path, 'utf8');
const source = readWebRtcHttpServerBundle(read) +
  read('src/ingress/product_ui_server_pages.cpp');
const css = read('src/ingress/product_ui_css.cpp');
const inventory = read('docs/project-feature-test-inventory.md');
const stream = read('docs/stream-verification.md');
const docs = read('docs/product-shell-component-examples.md');
const server = read('server.sh');

function check(name, condition) {
  checks.push({ name, condition });
}

const documentationErrors = validateUiWorkspaceDocumentation({document: docs, kind: 'ops-workspace-redesign', inventory, verification: stream, server});
check('현행 작업 영역 계약·기능 정의·명령 연결', documentationErrors.length === 0);
for (const error of documentationErrors) console.error('[fail] ' + error);

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
