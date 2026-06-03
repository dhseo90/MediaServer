#!/usr/bin/env node
// 파일 용도: v2.2.0 S08 Auth/setup redesign 산출물과 auth form/CSS/문서 연결을 정적 검증한다.
import fs from 'node:fs';

const checks = [];
const read = (path) => fs.readFileSync(path, 'utf8');
const source = read('src/ingress/webrtc_http_server.cpp');
const css = read('src/ingress/product_ui_css.cpp');
const backlog = read('docs/development-backlog.md');
const inventory = read('docs/project-feature-test-inventory.md');
const stream = read('docs/stream-verification.md');
const docsIndex = read('docs/README.md');
const docs = fs.existsSync('docs/v220-auth-setup-redesign.md')
  ? read('docs/v220-auth-setup-redesign.md')
  : '';
const server = read('server.sh');

function check(name, condition) {
  checks.push({ name, condition });
}

check('S08 command is exposed by server.sh', server.includes('verify-v220-auth-setup-redesign'));
check(
  'S08 docs exist and define auth route scope',
  docs.includes('/setup') &&
    docs.includes('/login') &&
    docs.includes('/password/change') &&
    docs.includes('/invite/setup') &&
    docs.includes('/client/request-access') &&
    docs.includes('auth route guard')
);
check(
  'docs index links S08 source-of-truth and superpowers artifacts',
  docsIndex.includes('v220-auth-setup-redesign.md') &&
    docsIndex.includes('2026-06-03-v220-s08-auth-setup-redesign-design.md') &&
    docsIndex.includes('2026-06-03-v220-s08-auth-setup-redesign.md')
);
check(
  'auth shell exposes responsive form markers',
  source.includes('class="auth-shell auth-responsive-shell"') &&
    source.includes('data-auth-shell="responsive-form"') &&
    source.includes('auth-card auth-responsive-card')
);
check(
  'auth routes expose stable form test ids and class',
  [
    'data-testid="auth-login-form"',
    'data-testid="auth-setup-form"',
    'data-testid="auth-invite-setup-form"',
    'data-testid="auth-access-request-form"',
    'data-testid="auth-password-change-form"',
    'auth-form auth-form-grid',
  ].every((needle) => source.includes(needle))
);
check(
  'auth forms consume ProductUiFormRowHtml without changing field names',
  [
    'ProductUiFormRowHtml("계정명"',
    'ProductUiFormRowHtml("비밀번호"',
    'ProductUiFormRowHtml("비밀번호 확인"',
    'ProductUiFormRowHtml("초대 토큰"',
    'ProductUiFormRowHtml("현재 비밀번호"',
    'ProductUiFormRowHtml("새 비밀번호"',
    'ProductUiFormRowHtml("새 비밀번호 확인"',
    'ProductUiFormRowHtml("표시 이름"',
    'ProductUiFormRowHtml("연락처"',
    'ProductUiFormRowHtml("요청 채널 ID"',
    'ProductUiFormRowHtml("사유"',
    'name="currentPassword"',
    'name="confirm"',
    'id="request-form"',
    'id="message"',
  ].every((needle) => source.includes(needle))
);
check(
  'password policy and message surfaces use S08 classes',
  source.includes('auth-helper-panel auth-policy-hint') &&
    source.includes('data-testid="auth-password-policy"') &&
    source.includes('auth-message')
);
check(
  'CSS defines responsive auth setup layout',
  [
    '.auth-responsive-shell',
    '.auth-responsive-card',
    '.auth-form-grid',
    '.auth-helper-panel',
    '.auth-message',
    '@media (max-width: 760px)',
    '@media (max-width: 560px)',
  ].every((needle) => css.includes(needle))
);
check(
  'auth route guard and scope strings stay present',
  [
    'RequireScope(principal_result.principal, "ops:read")',
    'auth::AuthenticateUserPassword',
    'auth::SaveBootstrapAdmin',
    'auth::CompleteInvitePasswordSetup',
    'auth::CreateAccessRequestFromJson',
  ].every((needle) => source.includes(needle))
);
check(
  'backlog records S08 closure section',
  backlog.includes('### V220-S08 Auth/setup redesign 종료 기준')
);
check(
  'feature inventory maps S08 verifier and auth route rows',
  inventory.includes('verify-v220-auth-setup-redesign') &&
    inventory.includes('UI-002') &&
    inventory.includes('UI-003') &&
    inventory.includes('UI-004') &&
    inventory.includes('UI-007') &&
    inventory.includes('UI-008')
);
check(
  'stream verification documents S08 verifier',
  stream.includes('verify-v220-auth-setup-redesign')
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

console.log('\n== v2.2.0 Auth/setup redesign summary ==');
console.log(`- pass: ${pass}`);
console.log(`- fail: ${checks.length - pass}`);
process.exit(pass === checks.length ? 0 : 1);
