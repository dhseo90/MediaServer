#!/usr/bin/env node
// 파일 용도: v2.2.0 S06 Rules workspace redesign 산출물과 route/CSS/문서 연결을 정적 검증한다.
import fs from 'node:fs';

const checks = [];
const read = (path) => fs.readFileSync(path, 'utf8');
const source = read('src/ingress/webrtc_http_server.cpp');
const css = read('src/ingress/product_ui_css.cpp');
const backlog = read('docs/development-backlog.md');
const inventory = read('docs/project-feature-test-inventory.md');
const stream = read('docs/stream-verification.md');
const docs = fs.existsSync('docs/v220-rules-workspace-redesign.md')
  ? read('docs/v220-rules-workspace-redesign.md')
  : '';
const server = read('server.sh');

function check(name, condition) {
  checks.push({ name, condition });
}

check('S06 command is exposed by server.sh', server.includes('verify-v220-rules-workspace-redesign'));
check(
  'S06 docs exist and define /ops/rules scope',
  docs.includes('/ops/rules') && docs.includes('smoke selector') && docs.includes('저장 roundtrip')
);
check(
  'rules route uses workspace root class',
  source.includes('class="panel ops-workspace rules-workspace"') &&
    source.includes('data-testid="ops-rules-page"')
);
check(
  'rules route groups readiness and assist areas',
  source.includes('rules-workspace-readiness-grid') &&
    source.includes('rules-workspace-assist-grid')
);
check(
  'rules route groups catalog and detail areas',
  source.includes('rules-workspace-catalog-grid') &&
    source.includes('rules-workspace-detail-panel')
);
check(
  'existing rules hooks stay present',
  [
    'opsRulesStatus',
    'opsRulesValidationList',
    'opsAddVaRuleBtn',
    'opsCreateVaRuleBtn',
    'opsVaRulePreviewVideo',
    'opsScenarioBuilderApply',
    'opsVlmRuleDraftList',
    'opsRulesComposerSave',
    'ops-rules-audit-list',
  ].every((hook) => source.includes(hook))
);
check(
  'CSS defines responsive Rules workspace layout',
  [
    '.rules-workspace-readiness-grid',
    '.rules-workspace-assist-grid',
    '.rules-workspace-catalog-grid',
    '.rules-workspace-detail-panel',
    '@media (max-width: 760px)',
  ].every((needle) => css.includes(needle))
);
check(
  'backlog records S06 closure section',
  backlog.includes('### V220-S06 Rules workspace redesign 종료 기준')
);
check(
  'feature inventory maps S06 verifier',
  inventory.includes('verify-v220-rules-workspace-redesign') && inventory.includes('UI-012')
);
check(
  'stream verification documents S06 verifier',
  stream.includes('verify-v220-rules-workspace-redesign')
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

console.log('\n== v2.2.0 Rules workspace redesign summary ==');
console.log(`- pass: ${pass}`);
console.log(`- fail: ${checks.length - pass}`);
process.exit(pass === checks.length ? 0 : 1);
