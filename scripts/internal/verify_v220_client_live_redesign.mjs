#!/usr/bin/env node
// 파일 용도: v2.2.0 S07 Client live redesign 산출물과 viewer-safe route/CSS/문서 연결을 정적 검증한다.
import fs from 'node:fs';

const checks = [];
const read = (path) => fs.readFileSync(path, 'utf8');
const source = read('src/ingress/webrtc_http_server.cpp');
const script = read('src/ingress/product_ui_page_scripts.cpp');
const css = read('src/ingress/product_ui_css.cpp');
const backlog = read('docs/development-backlog.md');
const inventory = read('docs/project-feature-test-inventory.md');
const stream = read('docs/stream-verification.md');
const docsIndex = read('docs/README.md');
const docs = fs.existsSync('docs/v220-client-live-redesign.md')
  ? read('docs/v220-client-live-redesign.md')
  : '';
const server = read('server.sh');

function check(name, condition) {
  checks.push({ name, condition });
}

check('S07 command is exposed by server.sh', server.includes('verify-v220-client-live-redesign'));
check(
  'S07 docs exist and define client viewer scope',
  docs.includes('/client/live') &&
    docs.includes('/client/dashboard') &&
    docs.includes('/client/events') &&
    docs.includes('viewer redaction')
);
check(
  'docs index links S07 source-of-truth and superpowers artifacts',
  docsIndex.includes('v220-client-live-redesign.md') &&
    docsIndex.includes('2026-06-03-v220-s07-client-live-redesign-design.md') &&
    docsIndex.includes('2026-06-03-v220-s07-client-live-redesign.md')
);
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
  'backlog records S07 closure section',
  backlog.includes('### V220-S07 Client live redesign 종료 기준')
);
check(
  'feature inventory maps S07 verifier and client route rows',
  inventory.includes('verify-v220-client-live-redesign') &&
    inventory.includes('UI-015') &&
    inventory.includes('UI-016') &&
    inventory.includes('UI-017')
);
check(
  'stream verification documents S07 verifier',
  stream.includes('verify-v220-client-live-redesign')
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
