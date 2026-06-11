#!/usr/bin/env node
// 파일 용도: v2.2.0 F05 Client Preview / Viewer Redaction 재검수 산출물과 client 비노출 경계를 정적 검증한다.
import fs from 'node:fs';

const checks = [];
const read = path => fs.readFileSync(path, 'utf8');
const source = read('src/ingress/webrtc_http_server.cpp');
const script = read('src/ingress/product_ui_client_scripts.cpp');
const css = read('src/ingress/product_ui_client_css.cpp');
const uiSmoke = read('scripts/internal/verify_ops_client_ui_smoke.mjs');
const backlog = read('docs/development-backlog.md');
const inventory = read('docs/project-feature-test-inventory.md');
const stream = read('docs/stream-verification.md');
const docs = fs.existsSync('docs/v220-client-preview-redaction-review.md')
  ? read('docs/v220-client-preview-redaction-review.md')
  : '';
const server = read('server.sh');

function check(name, condition) {
  checks.push({ name, condition });
}

check('Client preview redaction command is exposed by server.sh', server.includes('verify-v220-client-preview-redaction-review'));
check(
  'Client preview redaction docs define requested routes and boundaries',
  docs.includes('/client/live') &&
    docs.includes('/client/dashboard') &&
    docs.includes('/client/events') &&
    docs.includes('admin preview') &&
    docs.includes('viewer-safe') &&
    docs.includes('비노출')
);
check(
  'Client shell exposes admin preview boundary without changing route set',
  source.includes('data-client-preview=")') &&
    source.includes('data-client-preview-boundary="admin-preview-viewer-safe"') &&
    source.includes('data-client-redaction-review="viewer-safe-no-locator-debug"') &&
    source.includes('관리자 클라이언트 미리보기') &&
    source.includes('AppendImageNavLink(out, "/client/live"') &&
    source.includes('AppendImageNavLink(out, "/client/dashboard"')
);
check(
  'Client shell renders a compact preview/redaction review strip',
  source.includes('client-preview-redaction-strip') &&
    source.includes('data-client-review="admin-preview"') &&
    source.includes('data-admin-preview-state=")') &&
    source.includes('viewer-safe 경계 확인')
);
check(
  'Client live route marks viewer-safe review on source dock, event feed, and workspace',
  script.includes('data-client-redaction-review="viewer-safe-no-locator-debug"') &&
    script.includes('data-admin-preview-review="preview-aware"') &&
    script.includes('data-viewer-redaction="source-url-hidden"') &&
    script.includes('data-redaction="viewer-safe-events"') &&
    script.includes('data-viewer-flow="video-first"')
);
check(
  'Client dashboard route marks viewer-safe review and copy surfaces',
  script.includes('client-viewer-dashboard') &&
    script.includes('data-viewer-flow="status-events"') &&
    script.includes('data-client-redaction-review="viewer-safe-no-locator-debug"') &&
    script.includes('data-client-copy="status"') &&
    script.includes('data-client-copy="events"')
);
check(
  'Client events route marks viewer-safe review',
  script.includes('client-viewer-events') &&
    script.includes('data-viewer-flow="events-first"') &&
    script.includes('data-client-redaction-review="viewer-safe-no-locator-debug"') &&
    script.includes('data-client-copy="events"')
);
check(
  'CSS defines compact client preview/redaction review styling',
  [
    '.client-preview-redaction-strip',
    '.client-redaction-review-chip',
    '.client-redaction-review-copy',
  ].every(needle => css.includes(needle))
);
check(
  'ops/client UI smoke forbids source locators, raw debug, and VLM/internal material',
  [
    'raw JSON',
    'debugCounters',
    'Developer URL',
    'sourceUrl',
    'rtspUrl',
    'whepUrl',
    'opsVlmProviderStatus',
    'client-live-rendered-leak',
    'client-dashboard-rendered-leak',
    'client-events-rendered-leak',
  ].every(needle => uiSmoke.includes(needle))
);
check(
  'roadmap and verification docs record Client Preview / Viewer Redaction follow-up scope',
  backlog.includes('V220-F05') &&
    backlog.includes('Client Preview / Viewer Redaction 재검수 중심 정리') &&
    stream.includes('verify-v220-client-preview-redaction-review')
);
check(
  'feature inventory maps Client Preview / Viewer Redaction verifier',
  inventory.includes('v2.2.0 F05 Client Preview / Viewer Redaction 재검수') &&
    inventory.includes('verify-v220-client-preview-redaction-review') &&
    inventory.includes('SRC-028') &&
    inventory.includes('CLIENT-014') &&
    inventory.includes('SAFE-018')
);
check(
  'existing S07 verifier and client redaction smoke stay wired',
  server.includes('verify-v220-client-live-redesign') &&
    server.includes('verify-ops-client-ui') &&
    stream.includes('verify-v220-client-live-redesign') &&
    stream.includes('verify-ops-client-ui --screenshots')
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

console.log('\n== v2.2.0 Client preview/redaction review summary ==');
console.log(`- pass: ${pass}`);
console.log(`- fail: ${checks.length - pass}`);
process.exit(pass === checks.length ? 0 : 1);
