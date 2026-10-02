#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: 현행 rules-workspace-redesign 소스·문서 연결을 정적으로 확인한다. CLI 이름은 호환용이다.
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

const documentationErrors = validateUiWorkspaceDocumentation({document: docs, kind: 'rules-workspace-redesign', inventory, verification: stream, server});
check('현행 작업 영역 계약·기능 정의·명령 연결', documentationErrors.length === 0);
for (const error of documentationErrors) console.error('[fail] ' + error);

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
