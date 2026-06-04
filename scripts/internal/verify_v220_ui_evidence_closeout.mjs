#!/usr/bin/env node
// 파일 용도: v2.2.0 F06 UI Evidence Close-out 준비 문서와 manual UI 기록 기준 연결을 검증한다.
import fs from 'node:fs';

const checks = [];
const read = path => fs.readFileSync(path, 'utf8');
const maybeRead = path => (fs.existsSync(path) ? read(path) : '');

const server = read('server.sh');
const readme = read('docs/README.md');
const backlog = read('docs/development-backlog.md');
const stream = read('docs/stream-verification.md');
const inventory = read('docs/project-feature-test-inventory.md');
const checklist = read('docs/manual-ui-checklist.md');
const fulltest = read('docs/manual-ui-fulltest.md');
const template = read('docs/manual-ui-result-template.md');
const manualVerifier = read('scripts/internal/verify_manual_ui_evidence.mjs');
const docs = maybeRead('docs/v220-ui-evidence-closeout.md');

function check(name, condition) {
  checks.push({ name, condition });
}

check(
  'F06 command is exposed by server.sh',
  server.includes('verify-v220-ui-evidence-closeout') &&
    server.includes('verify_v220_ui_evidence_closeout.mjs')
);

check(
  'F06 docs define requested inventory/checklist/result scope',
  docs.includes('V220-F06 UI Evidence Close-out 준비') &&
    docs.includes('기능 inventory') &&
    docs.includes('manual UI checklist') &&
    docs.includes('UI 풀테스트 결과 기록 기준') &&
    docs.includes('새 로드맵 기준') &&
    docs.includes('실행 evidence가 아닙니다')
);

check(
  'docs README links F06 close-out source of truth',
  readme.includes('v2.2.0 UI evidence close-out') &&
    readme.includes('v220-ui-evidence-closeout.md')
);

check(
  'roadmap records V220-F06 row without marking it complete',
  backlog.includes('| 6 | V220-F06 |') &&
    backlog.includes('UI Evidence Close-out 준비') &&
    backlog.includes('기능 inventory, manual UI checklist, UI 풀테스트 결과 기록 기준') &&
    backlog.includes('verify-v220-ui-evidence-closeout') &&
    backlog.includes('| 6 | V220-F06 | P1 | 진행 |')
);

check(
  'stream verification records F06 gate and separation boundary',
  stream.includes('v2.2.0 UI Evidence Close-out 준비') &&
    stream.includes('./server.sh verify-v220-ui-evidence-closeout') &&
    stream.includes('verify-manual-ui-evidence') &&
    stream.includes('UI 풀테스트 PASS가 아닙니다')
);

check(
  'feature inventory maps F06 to manual UI evidence close-out docs',
  inventory.includes('v2.2.0 F06 UI Evidence Close-out 준비') &&
    inventory.includes('manual-ui-checklist.md') &&
    inventory.includes('manual-ui-result-template.md') &&
    inventory.includes('verify-v220-ui-evidence-closeout') &&
    inventory.includes('inventory 자체는 실행 evidence가 아님')
);

check(
  'manual checklist includes F02-F06 close-out preflight scope',
  checklist.includes('v2.2.0 UI Evidence Close-out') &&
    ['V220-F02', 'V220-F03', 'V220-F04', 'V220-F05', 'V220-F06'].every(needle => checklist.includes(needle)) &&
    checklist.includes('새 로드맵 기준') &&
    checklist.includes('manual-ui-result-template.md') &&
    checklist.includes('verify-v220-ui-evidence-closeout')
);

check(
  'manual fulltest standard separates F06 preparation from UI execution',
  fulltest.includes('v2.2.0 UI Evidence Close-out') &&
    fulltest.includes('F06는 UI 풀테스트 실행 결과가 아니라') &&
    fulltest.includes('기능 inventory') &&
    fulltest.includes('manual UI checklist') &&
    fulltest.includes('result template')
);

check(
  'manual result template adds v2.2.0 close-out recording table',
  template.includes('## v2.2.0 UI Evidence Close-out 기록 기준') &&
    ['V220-F02', 'V220-F03', 'V220-F04', 'V220-F05', 'V220-F06'].every(needle => template.includes(needle)) &&
    template.includes('로드맵 항목') &&
    template.includes('실행 evidence') &&
    template.includes('PASS/FAIL')
);

check(
  'manual evidence verifier enforces F06 references',
  manualVerifier.includes('verify-v220-ui-evidence-closeout') &&
    manualVerifier.includes('v2.2.0 UI Evidence Close-out') &&
    manualVerifier.includes('V220-F06')
);

check(
  'F06 docs keep non-overclaim language for skipped tests',
  [docs, checklist, template].every(text =>
    text.includes('30분') &&
    text.includes('120분') &&
    text.includes('미실행') &&
    text.includes('인앱 브라우저')
  )
);

check(
  'F06 close-out keeps existing manual evidence verifier wired',
  server.includes('verify-manual-ui-evidence') &&
    stream.includes('verify-manual-ui-evidence') &&
    checklist.includes('verify-manual-ui-evidence') &&
    template.includes('verify-manual-ui-evidence')
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

console.log('\n== v2.2.0 UI Evidence Close-out summary ==');
console.log(`- pass: ${pass}`);
console.log(`- fail: ${checks.length - pass}`);
process.exit(pass === checks.length ? 0 : 1);
