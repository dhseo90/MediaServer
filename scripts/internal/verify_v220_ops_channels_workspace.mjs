#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: 현행 ops-channels-workspace 소스·문서 연결을 정적으로 확인한다. CLI 이름은 호환용이다.
import fs from 'node:fs';
import {validateUiWorkspaceDocumentation} from './documentation_contract_lib.mjs';

const checks = [];
const read = (path) => fs.readFileSync(path, 'utf8');
const source = readWebRtcHttpServerBundle(read);
const css = read('src/ingress/product_ui_css.cpp');
const inventory = read('docs/project-feature-test-inventory.md');
const stream = read('docs/stream-verification.md');
const server = read('server.sh');
const docs = read('docs/product-shell-component-examples.md');

function check(name, condition) {
  checks.push({ name, condition });
}

const documentationErrors = validateUiWorkspaceDocumentation({document: docs, kind: 'ops-channels-workspace', inventory, verification: stream, server});
check('현행 작업 영역 계약·기능 정의·명령 연결', documentationErrors.length === 0);
for (const error of documentationErrors) console.error('[fail] ' + error);

check(
  'Ops sources route exposes channels workspace class and task markers',
  source.includes('data-ops-panel="sources"') &&
    source.includes('ops-channels-workspace') &&
    source.includes('data-channel-workspace="task-units"')
);
check(
  'Channel list is the first primary task and keeps existing table hook',
  source.indexOf('data-channel-task="list"') > 0 &&
    source.indexOf('id="channels-body"') > source.indexOf('data-channel-task="list"') &&
    source.indexOf('data-channel-task="list"') < source.indexOf('data-channel-task="detail"')
);
check(
  'Source detail task keeps existing edit/save form hooks',
  source.includes('data-channel-task="detail"') &&
    source.includes('id="channel-detail-panel"') &&
    source.includes('id="channel-form"') &&
    source.includes('id="channel-save-selected"')
);
check(
  'Input task explicitly groups ONVIF, WHEP, and WHIP/Published WebRTC controls',
  source.includes('data-channel-task="inputs"') &&
    source.includes('data-channel-input-group="onvif"') &&
    source.includes('data-channel-input-group="whep"') &&
    source.includes('data-channel-input-group="whip"') &&
    source.includes('name="onvifStreamUrl"') &&
    source.includes('name="whepUrl"') &&
    source.includes('name="webrtcSourceId"')
);
check(
  'PublishedView task marker preserves source/view management boundary',
  source.includes('data-channel-task="published-view"') &&
    source.includes('PublishedView') &&
    source.includes('data-scope-contract="view-read-scopes-unchanged"')
);
check(
  'Channel audit task keeps audit list hook',
  source.includes('data-channel-task="audit"') &&
    source.includes('id="channel-audit-list"') &&
    source.includes('data-audit-area="channels"')
);
check(
  'CSS defines responsive Ops Channels workspace layout',
  [
    '.ops-channels-workspace',
    '.ops-channels-main-grid',
    '.ops-channels-detail-grid',
    '.ops-channels-input-grid',
    '.ops-channels-audit-panel',
    '@media (max-width: 760px)',
  ].every((needle) => css.includes(needle))
);
check(
  'existing source/view API and route hooks stay present',
  [
    'BuildOpsSourcesPageHtml',
    'AppendOpsSourcesPageScript',
    'channelScopePolicy',
    'onvifProbeDraftApply',
    'channel-audit-refresh',
  ].every((hook) => source.includes(hook))
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

console.log('\n== v2.2.0 Ops Channels Workspace summary ==');
console.log(`- pass: ${pass}`);
console.log(`- fail: ${checks.length - pass}`);
process.exit(pass === checks.length ? 0 : 1);
