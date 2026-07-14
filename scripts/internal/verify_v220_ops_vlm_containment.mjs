#!/usr/bin/env node
// 파일 용도: v2.2.0 F04 Ops VLM UI containment 재정리 산출물과 VLM default-off/privacy/profile 경계를 정적 검증한다.
import fs from 'node:fs';

const checks = [];
const read = path => fs.readFileSync(path, 'utf8');
const source = read('src/ingress/webrtc_http_server.cpp') +
  read('src/ingress/product_ui_server_pages.cpp');
const css = read('src/ingress/product_ui_css.cpp');
const pageScript = read('src/ingress/product_ui_page_scripts.cpp');
const backlog = read('docs/development-backlog.md');
const inventory = read('docs/project-feature-test-inventory.md');
const stream = read('docs/stream-verification.md');
const docs = fs.existsSync('docs/v220-ops-vlm-containment.md')
  ? read('docs/v220-ops-vlm-containment.md')
  : '';
const server = read('server.sh');

function check(name, condition) {
  checks.push({ name, condition });
}

check('Ops VLM containment command is exposed by server.sh', server.includes('verify-v220-ops-vlm-containment'));
check(
  'Ops VLM containment docs define requested route and status axes',
  docs.includes('/ops/vlm') &&
    docs.includes('Ops 보조 작업') &&
    docs.includes('privacy') &&
    docs.includes('default-off') &&
    docs.includes('profile 상태')
);
check(
  'Ops VLM route exposes containment workspace marker',
  source.includes('ops-vlm-containment-workspace') &&
    source.includes('data-vlm-containment="ops-aux-default-off"') &&
    source.includes('data-testid="ops-vlm-page"')
);
check(
  'Ops auxiliary task keeps install connection controls and dry-run summary hooks',
  source.includes('data-vlm-task="ops-aux"') &&
    source.includes('data-testid="ops-vlm-controls"') &&
    source.includes('id="opsVlmHardwareClass"') &&
    source.includes('id="opsVlmRuntimeReadiness"') &&
    source.includes('id="opsVlmDecisionStatus"') &&
    pageScript.includes('/ops/api/vlm/install-connection/dry-run')
);
check(
  'Default-off task keeps runtime status and no-auto-start selectors',
  source.includes('data-vlm-task="default-off"') &&
    source.includes('data-testid="ops-vlm-runtime-status-panel"') &&
    source.includes('id="opsVlmDefaultOffStatus"') &&
    source.includes('data-vlm-runtime-status="ops-only-default-off"') &&
    pageScript.includes('default-off') &&
    pageScript.includes('runtimeCallAllowed === false')
);
check(
  'Privacy task keeps transfer guard and redaction review controls',
  source.includes('data-vlm-task="privacy"') &&
    source.includes('data-testid="ops-vlm-privacy-transfer-guard-panel"') &&
    source.includes('id="opsVlmExternalTransferWarningAck"') &&
    source.includes('id="opsVlmProviderLoggingReviewed"') &&
    source.includes('credential, prompt, raw response, source URL, raw frame bytes') &&
    pageScript.includes('media-server.vlm-privacy-transfer-guard.v1')
);
check(
  'Profile state task keeps profile save and activation/fallback/disabled controls',
  source.includes('data-vlm-task="profile-state"') &&
    source.includes('data-testid="ops-vlm-profile-panel"') &&
    source.includes('id="opsVlmProfileId"') &&
    source.includes('id="opsVlmEvaluationStatus"') &&
    source.includes('id="opsVlmActivationStatus"') &&
    source.includes('id="opsVlmFallbackProfileId"') &&
    source.includes('id="opsVlmDisabledReason"') &&
    pageScript.includes('profile-storage-only')
);
check(
  'Boundary and raw debug tasks remain Ops-only auxiliary surfaces',
  source.includes('data-vlm-task="boundary"') &&
    source.includes('data-vlm-task="raw-debug"') &&
    source.includes('id="opsVlmBoundaryBadges"') &&
    source.includes('id="opsVlmRawDetails"') &&
    source.includes('credential 저장 없음') &&
    source.includes('VLM 호출 없음')
);
check(
  'CSS defines readable VLM containment layout',
  [
    '.ops-vlm-containment-workspace',
    '.ops-vlm-containment-grid',
    '.ops-vlm-aux-panel',
    '.ops-vlm-default-off-panel',
    '.ops-vlm-privacy-panel',
    '.ops-vlm-profile-state-panel',
    '.ops-vlm-boundary-containment-panel',
  ].every(needle => css.includes(needle))
);
check(
  'roadmap and verification docs record Ops VLM containment follow-up scope',
  backlog.includes('V220-F04 Ops VLM UI containment 정리') &&
    stream.includes('verify-v220-ops-vlm-containment')
);
check(
  'feature inventory maps Ops VLM containment verifier',
  inventory.includes('v2.2.0 F04 Ops VLM UI containment 정리') &&
    inventory.includes('verify-v220-ops-vlm-containment')
);
check(
  'existing VLM verifiers stay wired for containment boundaries',
  [
    'verify-vlm-runtime-opt-in-contract',
    'verify-vlm-runtime-status-ui',
    'verify-vlm-profile-storage',
    'verify-vlm-privacy-transfer-guard',
    'verify-vlm-install-connection-ui',
  ].every(needle => server.includes(needle) && stream.includes(needle))
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

console.log('\n== v2.2.0 Ops VLM containment summary ==');
console.log(`- pass: ${pass}`);
console.log(`- fail: ${checks.length - pass}`);
process.exit(pass === checks.length ? 0 : 1);
