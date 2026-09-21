// 파일 용도: REVIEW4 승인 원본은 메모리 fixture에만 두고 현재 source 위치 읽기를 검사한다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import * as trustLibrary from './feature_semantic_review4_trust_lib.mjs';
import { validateSemanticItem, semanticDigest, SEMANTIC_CLOSURE_SCHEMA, REVIEW3_CALL_CHAIN_SCHEMA } from './feature_semantic_evidence_lib.mjs';
import { buildReview4SemanticObligation, buildReview4TrustBindings, parseVerifiedReview4Dispatch, review4SourceFlowDigest, sha256, REVIEW4_APPROVAL_SOURCE, REVIEW4_APPROVAL_REVIEWER_SOURCE } from './feature_semantic_review4_trust_lib.mjs';

function fixture(run, options = {}) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'review4-locator-'));
  fs.chmodSync(rootDir, 0o700);
  const write = (file, text) => { fs.mkdirSync(path.dirname(path.join(rootDir, file)), { recursive: true }); fs.writeFileSync(path.join(rootDir, file), text); };
  const product = '// padding\n'.repeat(40) + 'void Owner() {\n  Dispatch();\n  Action();\n  ScopedToken();\n\n\n  Unbound();\n}\n';
  let readback = '// padding\n'.repeat(40) + 'function Readback() {\n  const response = requestJson();\n  const ScopedToken = response.value;\n  if (ScopedToken !== 1) {\n\n\n    throw new Error("mismatch");\n  }\n}\n';
  if (options.duplicateWithin) readback = readback.replace('\n}\n', '\n  const ScopedToken = response.value;\n  if (ScopedToken !== 1) {\n\n    throw new Error("again");\n  }\n}\n');
  if (options.shellBody) readback = `Readback() {\n${options.shellBody}\n}\n`;
  const server = 'case "$command" in\n  verify-alpha)\n    require_internal alpha.mjs\n    exec "${INTERNAL_DIR}/alpha.mjs" "$@"\n    ;;\nesac\n';
  write('src/bound.cpp', product); write('scripts/internal/child.mjs', readback);
  write('scripts/internal/alpha.mjs', 'exec "${SCRIPT_DIR}/child.mjs" "$@"\n'); write('server.sh', server);
  const locator = (file, symbol, anchor) => {
    const lines = fs.readFileSync(path.join(rootDir, file), 'utf8').split('\n');
    const line = lines.findIndex(value => value.trim() === anchor) + 1;
    return { file, symbol, anchor, line, contextSha256: sha256(lines.slice(Math.max(0, line - 2), line + 1).join('\n')) };
  };
  const row = { id: 'UI-999', feature: 'ScopedToken read', pass: 'ScopedToken observed' };
  if (options.optional) row.feature += ' `/ops/optional-route`';
  const roles = {
    owner: locator('src/bound.cpp', 'Owner', 'void Owner() {'),
    dispatch: locator('src/bound.cpp', 'Owner', 'Dispatch();'),
    action: locator('src/bound.cpp', 'Owner', 'Action();'),
    state: locator('src/bound.cpp', 'ScopedToken', 'ScopedToken();'),
    readback: locator('scripts/internal/child.mjs', 'Readback', options.shellBody ? shellAnchor : 'if (ScopedToken !== 1) {'),
    verifier: locator('server.sh', 'server-dispatch:verify-alpha', 'verify-alpha)'),
  };
  const optional = 'void Optional() {\n  route("/ops/optional-route");\n  control();\n  controlReadback();\n\n\n  Other();\n}\n';
  if (options.optional) {
    write('src/optional.cpp', optional);
    for (const [name, anchor] of [['route', 'route("/ops/optional-route");'], ['control', 'control();'], ['controlReadback', 'controlReadback();']]) {
      roles[name] = locator('src/optional.cpp', 'Optional', anchor);
    }
  }
  const pairs = [['owner', 'dispatch', 'function-containment'], ['dispatch', 'action', 'function-containment'], ['action', 'state', 'function-containment'], ['state', 'readback', 'runtime-readback'], ['readback', 'verifier', 'verifier-dispatch']];
  const obligation = buildReview4SemanticObligation(row, { rootDir });
  const proof = { schema: 'media-server.feature-reviewed-source-flow.v1', id: row.id, featureContractSha256: sha256(`${row.feature}\n${row.pass}`), flowKind: 'read-model', requirement: obligation.requirement, evidenceMode: 'contract', evidenceToken: 'ScopedToken', sharedContract: null, semanticObligation: obligation, verifier: { command: 'verify-alpha', file: 'scripts/internal/alpha.mjs' }, roles,
    edges: pairs.map(([from, to, kind]) => ({ from, to, kind, witness: kind === 'verifier-dispatch' ? 'verify-alpha' : 'ScopedToken observed', source: `${roles[from].file}:${roles[from].line}`, target: `${roles[to].file}:${roles[to].line}` })), candidateDigest: 'a'.repeat(64) };
  proof.trustBindings = buildReview4TrustBindings(rootDir, proof, parseVerifiedReview4Dispatch(rootDir));
  proof.sourceFlowDigest = review4SourceFlowDigest(proof);
  proof.approval = { id: row.id, decision: 'approved-source-flow', reviewerSource: REVIEW4_APPROVAL_REVIEWER_SOURCE, sourceFlowDigest: proof.sourceFlowDigest, reason: 'UI-999 verify-alpha ScopedToken', reviewedOn: '2026-09-21' };
  proof.approvalDigest = sha256(JSON.stringify(proof.approval));
  const compatibility = name => name === 'dispatch' ? 'routeControl' : name;
  const evidence = { schema: SEMANTIC_CLOSURE_SCHEMA, review4Proof: proof,
    callChain: { schema: REVIEW3_CALL_CHAIN_SCHEMA, digest: proof.sourceFlowDigest, routeControlKind: 'review4-actual-dispatch-or-control', roles: Object.fromEntries(Object.entries(roles).filter(([name]) => name !== 'verifier').map(([name, value]) => [compatibility(name), structuredClone(value)])), edges: proof.edges.map(edge => ({ from: compatibility(edge.from), to: edge.to === 'verifier' ? 'verifierAssertion' : compatibility(edge.to), proof: structuredClone(edge) })) },
    stateOracle: { expectedBehavior: row.pass, expectedBehaviorSha256: sha256(`${row.feature} ${row.pass}`) }, verifierAssertion: { file: roles.readback.file, assertionAnchor: roles.readback.anchor, command: proof.verifier.command } };
  const digest = semanticDigest(row, evidence); evidence.verifierAssertion.assertedSemanticDigest = digest;
  const item = { status: 'semantic-reviewed', semanticEvidence: evidence, sourceEvidence: roles.owner, verifierEvidence: { ...roles.readback, command: proof.verifier.command }, review: { decision: 'approved', approvalSource: REVIEW4_APPROVAL_SOURCE, reviewer: REVIEW4_APPROVAL_REVIEWER_SOURCE, sourceFlowDigest: proof.sourceFlowDigest, approvalDigest: proof.approvalDigest, semanticDigest: digest } };
  try { run({ rootDir, write, product, readback, optional, item, check: () => validateSemanticItem({ rootDir, row, item }) }); }
  finally {
    const bytes = directoryBytes(rootDir);
    fs.rmSync(rootDir, { recursive: true, force: true });
    const absent = !fs.existsSync(rootDir);
    console.log(`[R4L13 cleanup] owned=true bytes=${bytes} removed=${absent}`);
    assert.equal(absent, true);
  }
}

function directoryBytes(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).reduce((sum, entry) => {
    const file = path.join(directory, entry.name);
    return sum + (entry.isDirectory() ? directoryBytes(file) : fs.statSync(file).size);
  }, 0);
}

test('R4L01 baseline exact source', () => fixture(f => assert.deepEqual(f.check(), [])));
test('R4L02 unique insertion relocation preserves approved semantics', () => fixture(f => { f.write('scripts/internal/child.mjs', '// inserted\n'.repeat(37) + f.readback); assert.deepEqual(f.check(), []); }));
test('R4L03 unique deletion relocation', () => fixture(f => { f.write('scripts/internal/child.mjs', f.readback.split('\n').slice(30).join('\n')); assert.deepEqual(f.check(), []); }));
test('R4L04 duplicate context even at original location rejected', () => fixture(f => { f.write('scripts/internal/child.mjs', f.readback + f.readback); assert.ok(f.check().some(e => /readback.*context|ambiguous/.test(e))); }));
test('R4L05 changed local context rejected', () => fixture(f => { f.write('scripts/internal/child.mjs', f.readback.replace('response.value', 'response.other')); assert.ok(f.check().some(e => /readback.*context/.test(e))); }));
test('R4L06 changed enclosing body rejected', () => fixture(f => { f.write('src/bound.cpp', f.product.replace('Unbound();', 'Changed();')); assert.ok(f.check().some(e => /trust binding drift/.test(e))); }));
test('R4L07 assertion removal rejected', () => fixture(f => { f.write('scripts/internal/child.mjs', f.readback.replace('if (ScopedToken !== 1) {', 'if (true) {')); assert.notDeepEqual(f.check(), []); }));
test('R4L08 verifier body change rejected', () => fixture(f => { f.write('scripts/internal/alpha.mjs', '// change\nexec "${SCRIPT_DIR}/child.mjs" "$@"\n'); assert.ok(f.check().some(e => /verifier file trust/.test(e))); }));
test('R4L09 same-process source relocation is fresh', () => fixture(f => { assert.deepEqual(f.check(), []); f.write('scripts/internal/child.mjs', '// moved\n'.repeat(37) + f.readback); assert.deepEqual(f.check(), []); }));
test('R4L10 same-process context and body mutation rejected', () => fixture(f => {
  assert.deepEqual(f.check(), []);
  f.write('scripts/internal/child.mjs', f.readback.replace('response.value', 'response.other'));
  assert.ok(f.check().some(e => /readback.*context/.test(e)));
  f.write('scripts/internal/child.mjs', f.readback);
  assert.deepEqual(f.check(), []);
  f.write('src/bound.cpp', f.product.replace('Unbound();', 'Changed();'));
  assert.ok(f.check().some(e => /trust binding drift/.test(e)));
}));
test('R4L11 validation never mutates proof or approval digests', () => fixture(f => { const original = structuredClone(f.item); f.write('scripts/internal/child.mjs', '// moved\n'.repeat(37) + f.readback); f.check(); assert.deepEqual(f.item, original); }));
test('R4L12 stale-range decoy cannot conceal actual readback mutation', () => fixture(f => {
  f.write('scripts/internal/child.mjs', f.readback.replace('if (ScopedToken !== 1) {', 'if (Decoy !== 1) {') + f.readback.replace('throw new Error("mismatch");', 'noop();'));
  const errors = f.check();
  assert.equal(errors.some(e => /readback.*context/.test(e)), false);
  assert.ok(errors.some(e => /readback-is-not-assertion/.test(e)));
  assert.ok(errors.some(e => /readback.*trust binding drift/.test(e)));
}));

test('R4L14 same-process corpus sees source token addition and removal', () => fixture(f => {
  const row = { id: 'UI-998', feature: '`FreshScopedToken` read', pass: 'FreshScopedToken observed' };
  const tokens = () => buildReview4SemanticObligation(row, { rootDir: f.rootDir }).fieldTokens;
  assert.equal(tokens().includes('FreshScopedToken'), false);
  f.write('src/fresh.cpp', 'FreshScopedToken();\n');
  assert.equal(tokens().includes('FreshScopedToken'), true);
  f.write('src/fresh.cpp', 'OtherScopedToken();\n');
  assert.equal(tokens().includes('FreshScopedToken'), false);
  f.write('src/fresh.cpp', 'FreshScopedToken();\n');
  assert.equal(tokens().includes('FreshScopedToken'), true);
  fs.unlinkSync(path.join(f.rootDir, 'src/fresh.cpp'));
  assert.equal(tokens().includes('FreshScopedToken'), false);
}));

test('R4L15 optional roles retained relocated and validated', () => fixture(f => {
  const original = structuredClone(f.item);
  assert.deepEqual(f.check(), []);
  f.write('src/optional.cpp', '// moved\n'.repeat(37) + f.optional);
  assert.deepEqual(f.check(), []);
  f.write('src/optional.cpp', f.optional.replace('Other();', 'Changed();'));
  assert.ok(f.check().some(e => /(?:route|control).*trust binding drift/.test(e)));
  f.write('src/optional.cpp', f.optional.replace('control();', 'changed();'));
  assert.ok(f.check().some(e => /control.*context/.test(e)));
  assert.deepEqual(f.item, original);
}, { optional: true }));

test('R4L16 duplicate statement in different function resolves approved body', () => fixture(f => {
  f.write('scripts/internal/child.mjs', f.readback.replace('Readback()', 'Different()') + f.readback);
  assert.deepEqual(f.check(), []);
}));

test('R4L17 same approved body with multiple candidates stays ambiguous', () => {
  fixture(f => assert.ok(f.check().some(e => /readback.*context/.test(e))), { duplicateWithin: true });
  fixture(f => { f.write('scripts/internal/child.mjs', f.readback + f.readback); assert.ok(f.check().some(e => /readback.*context/.test(e))); });
});

test('R4L18 no approved body match cannot fall back to stored line', () => fixture(f => {
  const original = structuredClone(f.item);
  const changed = f.readback.replace('requestJson()', 'changedRequest()');
  f.write('scripts/internal/child.mjs', changed + changed.replace('Readback()', 'Different()'));
  assert.ok(f.check().some(e => /readback.*context/.test(e)));
  assert.deepEqual(f.item, original);
}));

const shellAnchor = 'if ! output="$(probe_rtsp_url "${url}" "${timeout_us}" 2>&1)"; then';
const shellBranch = `${shellAnchor}\n  if [[ -n "${'${DIAG_DIR}'}" ]]; then\n    log_fail "diagnostic only"\n  else\n    log_fail "ScopedToken probe failure"\n  fi\n  echo "$output"\n  return 1\nfi`;
test('R4L19 nested shell failure branch preserves exact oracle', () => fixture(f => assert.deepEqual(f.check(), []), { shellBody: shellBranch }));
test('R4L20 closed fi excludes outside token and failure decoys', () => fixture(f => {
  const errors = f.check();
  assert.ok(errors.some(e => /readback-token-unbound/.test(e)));
  assert.ok(errors.some(e => /readback-is-not-assertion/.test(e)));
}, { shellBody: `${shellAnchor}\n  echo "no assertion"\nfi\nlog_fail "ScopedToken"\nreturn 1` }));
test('R4L21 incomplete bounded and success-only shell branches rejected', () => {
  for (const shellBody of [shellBranch.slice(0, -2), `${shellAnchor}\n${'# padding\n'.repeat(130)}log_fail "ScopedToken"\nreturn 1\nfi`, `${shellAnchor}\n#${'x'.repeat(32768)}\nreturn 1\nfi`, `${shellAnchor}\n${'if test 1; then\n'.repeat(16)}return 1\n${'fi\n'.repeat(17)}`, `${shellAnchor}\n  echo "failure unobserved"\nelse\n  log_fail "ScopedToken"\n  return 1\nfi`]) {
    fixture(f => assert.ok(f.check().some(e => /readback-is-not-assertion/.test(e))), { shellBody });
  }
});
test('R4L22 generator and consumer use same bounded branch reader', () => fixture(f => {
  const source = fs.readFileSync(new URL('./verify_v390_review4_feature_semantic_source_audit.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('function rawAssertionBranchText(role) {');
  const end = source.indexOf('\nfunction locatorContains(', start);
  assert.ok(start >= 0 && end > start);
  const role = f.item.semanticEvidence.review4Proof.roles.readback;
  const context = vm.createContext({ rootDir: f.rootDir, review4AssertionBranchText: trustLibrary.review4AssertionBranchText });
  vm.runInContext(source.slice(start, end), context);
  const generated = context.rawAssertionBranchText(role);
  assert.equal(generated, trustLibrary.review4AssertionBranchText(f.rootDir, role));
  assert.ok(generated.includes('ScopedToken'));
  assert.deepEqual(f.check(), []);
}, { shellBody: shellBranch }));

test('R4L23 Python heredoc condition retains non-shell branch reader', () => fixture(f => {
  const source = 'width = int(payload.get("width") or 0)\nheight = int(payload.get("height") or 0)\nif width <= 0 or height <= 0:\n    raise SystemExit("invalid image size")\n\n';
  f.write('scripts/internal/embedded.sh', source);
  const role = { file: 'scripts/internal/embedded.sh', line: 3, anchor: 'if width <= 0 or height <= 0:' };
  const branch = trustLibrary.review4AssertionBranchText(f.rootDir, role);
  assert.ok(branch.includes('raise SystemExit("invalid image size")'));
  assert.ok(branch.includes(role.anchor));
}));
