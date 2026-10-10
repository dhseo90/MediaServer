// 파일 용도: 독립적으로 검토된 현재 문맥만 기존 REVIEW4 proof locator에 반영한다.
// 이 도구는 승인 원장을 만들지 않는다. 이후 candidate/producer/readback은 별도다.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { sha256, stableStringify } from './feature_semantic_review4_trust_lib.mjs';
import { replaceJsonFixturesAtomically } from './feature_semantic_review4_apply.mjs';
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from './script_arg_utils.mjs';

export const proofFiles = [
  'test/fixtures/v390_review4_semantic_proofs_ui_auth_src_rule.json',
  'test/fixtures/v390_review4_semantic_proofs_evt_client_media_lab.json',
  'test/fixtures/v390_review4_semantic_proofs_safe_ops.json',
];
const schema = 'media-server.review4-proof-context-refresh.v1';
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const context = (lines, line) => lines.slice(Math.max(0, line - 2), line + 1).join('\n');
function readSource(root, relative) {
  assert(!path.isAbsolute(relative) && !relative.split('/').includes('..'), 'unsafe source path');
  const target = path.join(root, relative);
  assert(fs.realpathSync(target).startsWith(`${fs.realpathSync(root)}${path.sep}`), 'source outside repository');
  return fs.readFileSync(target, 'utf8');
}

export function prepareRefresh(root, candidate) {
  const known = new Set(candidate.items.map(item => item.id));
  assert(known.size === candidate.items.length && /^[a-f0-9]{64}$/.test(candidate.candidateDigest), 'invalid candidate');
  const changes = [], sources = {}, proofs = {};
  const seen = new Set();
  for (const file of proofFiles) {
    const raw = readSource(root, file); proofs[file] = sha256(raw);
    for (const item of JSON.parse(raw).items) {
      assert(known.has(item.id) && !seen.has(item.id), 'proof ID absent/duplicate'); seen.add(item.id);
      for (const [roleName, role] of Object.entries(item.roles)) {
        const source = readSource(root, role.file); sources[role.file] = sha256(source);
        const lines = source.split(/\r?\n/);
        const anchors = lines.flatMap((text, index) => text.trim() === role.anchor.trim() ? [index + 1] : []);
        const oldMatches = anchors.filter(line => sha256(context(lines, line)) === role.contextSha256);
        // Valid old context remains governed by the existing resolver, including
        // its approved enclosing-body rule. Do not refresh it speculatively.
        if (oldMatches.length) continue;
        assert(anchors.length === 1, `${item.id}.${roleName}: missing or ambiguous current anchor`);
        const line = anchors[0];
        changes.push({ id: item.id, role: roleName, proofFile: file,
          proofItemSha256: sha256(stableStringify(item)), old: role,
          next: { ...role, line, contextSha256: sha256(context(lines, line)) },
          currentContext: context(lines, line) });
      }
    }
  }
  assert(seen.size === known.size, 'proof coverage mismatch');
  return { schema, candidateDigest: candidate.candidateDigest,
    inventorySha256: sha256(readSource(root, 'docs/project-feature-test-inventory.md')),
    sources, proofs, changes, candidateIsApproval: false };
}

export function reviewedReplacements(root, candidate, proposal, decisions) {
  assert(stableStringify(proposal) === stableStringify(prepareRefresh(root, candidate)), 'proposal/source/candidate drift');
  assert(decisions.schema === `${schema}.independent-decision` && decisions.independent === true &&
    typeof decisions.reviewer === 'string' && decisions.reviewer.trim() &&
    decisions.reviewer !== decisions.implementationAuthor && typeof decisions.implementationAuthor === 'string' &&
    decisions.implementationAuthor.trim() && decisions.verdict === 'approved', 'independent reviewed decision required');
  assert(decisions.proposalSha256 === sha256(stableStringify(proposal)) &&
    decisions.candidateDigest === proposal.candidateDigest, 'decision candidate/proposal mismatch');
  const keys = proposal.changes.map(c => `${c.id}.${c.role}`);
  assert(Array.isArray(decisions.decisions) && stableStringify(decisions.decisions.map(c => `${c.id}.${c.role}`)) === stableStringify(keys), 'decision exact ID/role coverage required');
  const replacement = new Map();
  for (let i = 0; i < proposal.changes.length; ++i) {
    const c = proposal.changes[i], decision = decisions.decisions[i];
    assert(decision.decision === 'approved' && typeof decision.reason === 'string' && decision.reason.trim() &&
      decision.oldContextSha256 === c.old.contextSha256 && decision.currentContextSha256 === c.next.contextSha256 &&
      decision.sourceSha256 === proposal.sources[c.next.file], `${c.id}.${c.role}: unreviewed source/context`);
    if (!replacement.has(c.proofFile)) replacement.set(c.proofFile, JSON.parse(readSource(root, c.proofFile)));
    const item = replacement.get(c.proofFile).items.find(item => item.id === c.id);
    item.roles[c.role] = c.next;
  }
  for (const data of replacement.values()) for (const item of data.items) {
    if (!proposal.changes.some(c => c.id === item.id)) continue;
    for (const edge of item.edges) {
      if (edge.source) edge.source = `${item.roles[edge.from].file}:${item.roles[edge.from].line}`;
      if (edge.target) edge.target = `${item.roles[edge.to].file}:${item.roles[edge.to].line}`;
    }
  }
  return [...replacement].map(([file, value]) => [path.join(root, file), value]);
}

function freshCandidate(root, temp) {
  const out = path.join(temp, 'candidate.json');
  execFileSync(process.execPath, [path.join(root, 'scripts/internal/verify_v390_review4_feature_semantic_source_audit.mjs'), '--emit-candidate', out], { cwd: root, stdio: 'pipe', maxBuffer: 4 * 1024 * 1024 });
  return JSON.parse(fs.readFileSync(out, 'utf8'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (hasHelpFlag(args)) printUsageAndExit('node scripts/internal/review4_proof_context_refresh.mjs --prepare OUT | --apply PROPOSAL --decisions IN\nPrepare is not approval. Apply requires a separate source-bound independent decision.');
  assertKnownOptions(args, ['prepare', 'apply', 'decisions', 'h', 'help']);
  const value = key => { const i = args.indexOf(`--${key}`); return i < 0 ? null : args[i + 1]; };
  const prepare = value('prepare'), apply = value('apply'), decisionPath = value('decisions');
  assert(Boolean(prepare) !== Boolean(apply) && (prepare ? !decisionPath : Boolean(decisionPath)), 'choose prepare or apply+decisions');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'review4-proof-context-'));
  try {
    const candidate = freshCandidate(root, temp);
    if (prepare) {
      const proposal = prepareRefresh(root, candidate);
      fs.writeFileSync(prepare, `${JSON.stringify(proposal, null, 2)}\n`, { flag: 'wx' });
      console.log(JSON.stringify({ proposal: prepare, changes: proposal.changes.map(c => `${c.id}.${c.role}`), approval: false }));
    } else {
      const proposal = JSON.parse(fs.readFileSync(apply, 'utf8'));
      const decisions = JSON.parse(fs.readFileSync(decisionPath, 'utf8'));
      const replacements = reviewedReplacements(root, candidate, proposal, decisions);
      assert(replacements.length > 0, 'no changed context to apply');
      replaceJsonFixturesAtomically({ replacements, validateReadback: () => {
        const readback = freshCandidate(root, temp);
        for (const change of proposal.changes) {
          const item = readback.items.find(item => item.id === change.id);
          assert(item?.status === 'source-resolved-candidate' &&
            stableStringify(item.roles[change.role]) === stableStringify(change.next), `${change.id}: refreshed proof readback failed`);
        }
      } });
      console.log(JSON.stringify({ refreshed: proposal.changes.map(c => `${c.id}.${c.role}`), independentDecisionSha256: sha256(fs.readFileSync(decisionPath)), approvalLedgerWritten: false }));
    }
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}
