#!/usr/bin/env node
// 파일 용도: v2.2.0 F03 Ops Users / Access Workspace 재배치 산출물과 auth/access route 연결을 정적 검증한다.
import fs from 'node:fs';

const checks = [];
const read = path => fs.readFileSync(path, 'utf8');
const source = read('src/ingress/webrtc_http_server.cpp');
const auth = read('src/ingress/http_auth.cpp');
const css = read('src/ingress/product_ui_css.cpp');
const pageScript = read('src/ingress/product_ui_page_scripts.cpp');
const backlog = read('docs/development-backlog.md');
const inventory = read('docs/project-feature-test-inventory.md');
const stream = read('docs/stream-verification.md');
const docs = fs.existsSync('docs/v220-ops-users-access-workspace.md')
  ? read('docs/v220-ops-users-access-workspace.md')
  : '';
const server = read('server.sh');

function check(name, condition) {
  checks.push({ name, condition });
}

check('Ops Users / Access command is exposed by server.sh', server.includes('verify-v220-ops-users-access-workspace'));
check(
  'Ops Users / Access docs define requested routes and task units',
  docs.includes('/ops/users') &&
    docs.includes('/client/request-access') &&
    docs.includes('/invite/setup') &&
    docs.includes('사용자') &&
    docs.includes('초대') &&
    docs.includes('승인') &&
    docs.includes('role/scope')
);
check(
  'Ops users route exposes access workspace class and task markers',
  source.includes('ops-users-access-workspace') &&
    source.includes('data-access-workspace="task-units"') &&
    source.includes('data-testid="ops-users-page"')
);
check(
  'user lifecycle task keeps existing users table and editor hooks',
  source.includes('data-access-task="users"') &&
    source.includes('id="users-body"') &&
    source.includes('id="user-detail-panel"') &&
    source.includes('id="user-form"') &&
    source.includes('id="user-reset-password-panel"')
);
check(
  'access request task keeps public request review and approval hooks',
  source.includes('data-access-task="requests"') &&
    source.includes('id="access-requests-body"') &&
    source.includes('id="request-invite-output"') &&
    pageScript.includes('/ops/api/access-requests') &&
    pageScript.includes('/approve') &&
    pageScript.includes('/reject')
);
check(
  'invite task keeps issue/list/setup one-time token boundary',
  source.includes('data-access-task="invites"') &&
    source.includes('data-testid="ops-invites-panel"') &&
    source.includes('id="invite-create-form"') &&
    source.includes('id="invite-list-body"') &&
    source.includes('토큰/토큰 해시를 노출하지 않습니다') &&
    pageScript.includes('/ops/api/invites')
);
check(
  'role/scope task keeps assignment template controls and scope contract',
  source.includes('data-access-task="role-scope"') &&
    source.includes('data-scope-contract="role-scope-unchanged"') &&
    source.includes('id="view-assignment"') &&
    source.includes('id="apply-view-scope-template"') &&
    source.includes('id="apply-role-default-scope-template"') &&
    source.includes('id="user-scopes-input"') &&
    pageScript.includes('scopeTemplateForRole(role, selectedViewIds)')
);
check(
  'audit task keeps user audit hook',
  source.includes('data-access-task="audit"') &&
    source.includes('id="user-audit-list"') &&
    pageScript.includes("renderOpsAuditTrail('user-audit-list', 'users')")
);
check(
  'public request and invite setup routes expose access-flow markers without field renames',
  source.includes('data-access-route="request-access"') &&
    source.includes('data-access-route="invite-setup"') &&
    source.includes('data-testid="auth-access-request-form"') &&
    source.includes('data-testid="auth-invite-setup-form"') &&
    source.includes('name="viewId"') &&
    source.includes('name="token"') &&
    source.includes('name="confirm"')
);
check(
  'CSS defines responsive Ops Users / Access workspace layout',
  [
    '.ops-users-access-workspace',
    '.ops-users-access-grid',
    '.ops-users-lifecycle-panel',
    '.ops-users-request-panel',
    '.ops-users-invite-panel',
    '.ops-users-role-scope-panel',
    '.ops-users-audit-panel',
  ].every(needle => css.includes(needle))
);
check(
  'roadmap and verification docs record Ops Users / Access follow-up scope',
  backlog.includes('V220-F03 Ops Users / Access Workspace 재배치') &&
    stream.includes('verify-v220-ops-users-access-workspace')
);
check(
  'feature inventory maps Ops Users / Access workspace verifier',
  inventory.includes('v2.2.0 F03 Ops Users / Access Workspace 재배치') &&
    inventory.includes('verify-v220-ops-users-access-workspace')
);
check(
  'auth/session/secret redaction hooks stay present',
  [
    'auth::CompleteInvitePasswordSetup',
    'auth::CreateAccessRequestFromJson',
    'auth::ApproveAccessRequest',
    'auth::RejectAccessRequest',
    'passwordHash',
    'tokenHash',
  ].every(needle => source.includes(needle) || pageScript.includes(needle) || auth.includes(needle))
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

console.log('\n== v2.2.0 Ops Users / Access Workspace summary ==');
console.log(`- pass: ${pass}`);
console.log(`- fail: ${checks.length - pass}`);
process.exit(pass === checks.length ? 0 : 1);
