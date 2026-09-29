#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: 현행 auth-setup-redesign 소스·문서 연결을 정적으로 확인한다. CLI 이름은 호환용이다.
import fs from 'node:fs';
import {validateUiWorkspaceDocumentation} from './documentation_contract_lib.mjs';

const checks = [];
const read = (path) => fs.readFileSync(path, 'utf8');
const source = readWebRtcHttpServerBundle(read) + read('src/ingress/product_ui_auth_pages.cpp');
const css = read('src/ingress/product_ui_css.cpp');
const inventory = read('docs/project-feature-test-inventory.md');
const stream = read('docs/stream-verification.md');
const docs = read('docs/product-shell-component-examples.md');
const server = read('server.sh');

function check(name, condition) {
  checks.push({ name, condition });
}

const documentationErrors = validateUiWorkspaceDocumentation({document: docs, kind: 'auth-setup-redesign', inventory, verification: stream, server});
check('현행 작업 영역 계약·기능 정의·명령 연결', documentationErrors.length === 0);
for (const error of documentationErrors) console.error('[fail] ' + error);

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
