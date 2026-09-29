#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: 현행 client-live-redesign 소스·문서 연결을 정적으로 확인한다. CLI 이름은 호환용이다.
import fs from 'node:fs';
import {validateUiWorkspaceDocumentation} from './documentation_contract_lib.mjs';

const checks = [];
const read = (path) => fs.readFileSync(path, 'utf8');
const source = readWebRtcHttpServerBundle(read);
const script = read('src/ingress/product_ui_client_scripts.cpp');
const css = read('src/ingress/product_ui_client_css.cpp');
const inventory = read('docs/project-feature-test-inventory.md');
const stream = read('docs/stream-verification.md');
const docs = read('docs/product-shell-component-examples.md');
const server = read('server.sh');

function check(name, condition) {
  checks.push({ name, condition });
}

const documentationErrors = validateUiWorkspaceDocumentation({document: docs, kind: 'client-live-redesign', inventory, verification: stream, server});
check('현행 작업 영역 계약·기능 정의·명령 연결', documentationErrors.length === 0);
for (const error of documentationErrors) console.error('[fail] ' + error);

check(
  'client shell exposes viewer workspace classes',
  source.includes('client-viewer-workspace') &&
    source.includes('data-client-workspace="viewer-first"') &&
    source.includes('client-viewer-dock') &&
    source.includes('data-client-redaction="viewer-safe-dock"') &&
    source.includes('client-viewer-detail')
);
check(
  'client events direct route activates event renderer',
  source.includes('if (path == "/client/events")') &&
    source.includes('return "events";') &&
    source.includes('data-client-active=")')
);
check(
  'live renderer exposes video-first viewer classes',
  [
    'client-live-workspace',
    'client-live-layout',
    'client-live-primary',
    'client-live-video-grid',
    'client-live-dock',
    'client-live-event-dock',
    'data-viewer-flow="video-first"',
    'data-viewer-redaction="source-url-hidden"',
  ].every((needle) => script.includes(needle))
);
check(
  'dashboard and event renderers expose viewer-safe classes',
  script.includes('client-viewer-dashboard') &&
    script.includes('data-viewer-flow="status-events"') &&
    script.includes('client-viewer-events') &&
    script.includes('data-viewer-flow="events-first"')
);
check(
  'existing client live hooks stay present',
  [
    'data-testid="client-live-source-tree"',
    'data-testid="client-live-dock-event-feed"',
    'data-redaction="viewer-safe-events"',
    'data-testid="client-live-workspace"',
    'data-testid="client-live-drop-grid"',
    'data-testid="client-live-layout-presets"',
    'data-testid="client-live-tile-info-overlay"',
    'data-testid="client-live-va-overlay-toggle"',
    'data-client-copy="status"',
    'data-client-copy="events"',
  ].every((needle) => script.includes(needle))
);
check(
  'CSS defines responsive Client viewer workspace layout',
  [
    '.client-viewer-workspace',
    '.client-live-workspace',
    '.client-live-layout',
    '.client-live-primary',
    '.client-live-video-grid',
    '.client-live-dock',
    '.client-live-event-dock',
    '.client-viewer-dashboard',
    '.client-viewer-events',
    '@media (max-width: 780px)',
    '@media (max-width: 560px)',
  ].every((needle) => css.includes(needle))
);
check(
  'viewer redaction markers and existing forbidden-text guard stay connected',
  script.includes('viewer-safe 이벤트만 표시됩니다') &&
    script.includes('data-redaction="viewer-safe-events"') &&
    script.includes('data-viewer-redaction="source-url-hidden"') &&
    !source.includes('client-views-json')
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

console.log('\n== v2.2.0 Client live redesign summary ==');
console.log(`- pass: ${pass}`);
console.log(`- fail: ${checks.length - pass}`);
process.exit(pass === checks.length ? 0 : 1);
