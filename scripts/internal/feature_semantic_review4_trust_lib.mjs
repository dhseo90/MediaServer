// 파일 용도: REVIEW4 candidate/source/verifier/approval의 공통 trust binding을 제공한다.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const REVIEW4_AUDIT_SCHEMA = 'media-server.v390-review4-feature-semantic-source-audit.v1';
export const REVIEW4_APPROVAL_SCHEMA = 'media-server.v390-review4-feature-semantic-source-approvals.v1';
export const REVIEW4_APPROVAL_PRODUCER = 'independent-review4-source-audit';
export const REVIEW4_APPROVAL_REVIEWER_SOURCE = 'review4-independent-audit';
export const REVIEW4_APPROVAL_SOURCE = 'review4-independent-source-audit';
export const REVIEW4_DECISION_SCHEMA = 'media-server.v390-review4-independent-reviewer-decisions.v1';
export const REVIEW4_OBLIGATION_POLICY = 'review4-outcome-binding-v3';
export const REVIEW4_GENERATION_BOUNDARY = Object.freeze({
  inputs: ['inventory feature/pass contract', 'server.sh dispatch', 'dispatched verifier source', 'tracked production source', 'separate reviewed proof specs'],
  excludedInputs: ['review.reason', 'review.semanticDigest', 'review.decision', 'review.reviewer', 'semanticEvidence.callChain.edges', 'semanticEvidence.callChain.digest'],
  candidateIsApproval: false,
});
const semanticSourceCorpusCache = new Map();
const review4FunctionalVerifierAllowlist = new Set([
  'scripts/internal/verify_v390_review4_lab_core_api.mjs',
  'scripts/internal/verify_v390_review4_structure_scope_decision.mjs',
]);

export function review4ProofOnlyVerifierPath(file) {
  const value = String(file || '');
  return /^scripts\/internal\/verify_v390_review4_[^/]+\.(?:mjs|sh)$/.test(value) &&
    !review4FunctionalVerifierAllowlist.has(value);
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function stableStringify(value) {
  return JSON.stringify(sortValue(value));
}

export function review4SourceFlowDigest(item) {
  return sha256(stableStringify({
    id: item.id,
    featureContractSha256: item.featureContractSha256,
    flowKind: item.flowKind,
    requirement: item.requirement,
    evidenceMode: item.evidenceMode,
    evidenceToken: item.evidenceToken,
    sharedContract: item.sharedContract,
    verifier: item.verifier,
    roles: item.roles,
    edges: item.edges,
    trustBindings: review4HardTrustBindings(item.trustBindings),
    semanticObligation: item.semanticObligation || null,
  }));
}

export function review4CandidateDigest(items) {
  return sha256(stableStringify(review4HardCandidateItems(items)));
}

export function review4HardCandidateItems(items) {
  return (items || []).map(item => ({ ...structuredClone(item), trustBindings: review4HardTrustBindings(item.trustBindings) }));
}

export function review4ApprovalEnvelope(approvals, orderedIds, audit = null) {
  return {
    schema: approvals.schema,
    producer: approvals.producer,
    candidateGeneratorMayApprove: approvals.candidateGeneratorMayApprove,
    candidateDigest: approvals.candidateDigest,
    reviewedOn: approvals.reviewedOn,
    approvedCount: approvals.approvals.length,
    orderedIdsSha256: sha256(stableStringify(orderedIds)),
    inventoryDigest: approvals.inventoryDigest,
    approvalsDigest: approvals.approvalsDigest,
    reviewerActor: approvals.reviewerActor,
    reviewerSource: approvals.reviewerSource,
    decisionArtifactSha256: approvals.decisionArtifactSha256,
    approvalsSha256: sha256(stableStringify(approvals.approvals)),
    auditSchema: audit?.schema || null,
    sourceRelease: audit?.sourceRelease || null,
    generationBoundarySha256: audit ? sha256(stableStringify(audit.generationBoundary)) : null,
  };
}

export function review4InventoryDigest(rows) {
  return sha256(stableStringify((rows || []).map(row => ({
    id: row.id,
    feature: String(row.feature || '').trim().replace(/\s+/g, ' '),
    pass: String(row.pass || '').trim().replace(/\s+/g, ' '),
  }))));
}

export function review4ApprovalReason(row, item) {
  const feature = String(row?.feature || '').trim().replace(/\s+/g, ' ');
  const pass = String(row?.pass || '').trim().replace(/\s+/g, ' ');
  return [
    `id=${item.id}`,
    `feature=${feature}`,
    `pass=${pass}`,
    `verifier=${item.verifier?.command || ''}`,
    `evidence=${item.evidenceToken || ''}`,
    `action=${item.roles?.action?.symbol || ''}`,
    `state=${item.roles?.state?.symbol || ''}`,
    `sourceFlowDigest=${item.sourceFlowDigest || ''}`,
  ].join('|');
}

export function review4GenerationBoundaryDigest() {
  return sha256(stableStringify(REVIEW4_GENERATION_BOUNDARY));
}

export function validateReview4DecisionArtifact({ audit, decisions, orderedIds, rows }) {
  const errors = [];
  if (decisions?.schema !== REVIEW4_DECISION_SCHEMA) errors.push('REVIEW4 reviewer decision schema mismatch');
  if (decisions?.reviewerSource !== REVIEW4_APPROVAL_REVIEWER_SOURCE) errors.push('REVIEW4 reviewer decision producer spoof');
  if (!String(decisions?.reviewerActor || '').trim() || /candidate.generator/i.test(String(decisions?.reviewerActor))) errors.push('REVIEW4 reviewer actor missing or generator-owned');
  if (decisions?.candidateDigest !== audit?.candidateDigest) errors.push('REVIEW4 reviewer mixed candidate digest');
  if (decisions?.orderedIdsSha256 !== sha256(stableStringify(orderedIds))) errors.push('REVIEW4 reviewer ordered ID digest drift');
  if (decisions?.inventoryDigest !== review4InventoryDigest(rows)) errors.push('REVIEW4 reviewer inventory digest drift');
  if (decisions?.generationBoundarySha256 !== review4GenerationBoundaryDigest()) errors.push('REVIEW4 reviewer generation boundary digest drift');
  if (stableStringify(audit?.generationBoundary) !== stableStringify(REVIEW4_GENERATION_BOUNDARY)) errors.push('REVIEW4 audit generation boundary canonical drift');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(decisions?.reviewedOn || ''))) errors.push('REVIEW4 reviewer decision date missing');
  const entries = Array.isArray(decisions?.decisions) ? decisions.decisions : [];
  if (stableStringify(entries.map(item => item.id)) !== stableStringify(orderedIds)) errors.push('REVIEW4 reviewer decision ordered ID coverage drift');
  if (new Set(entries.map(item => item.id)).size !== orderedIds.length) errors.push('REVIEW4 reviewer duplicate or missing decisions');
  if (new Set(entries.map(item => item.justification)).size !== orderedIds.length) errors.push('REVIEW4 reviewer justifications must be row-specific');
  const auditById = new Map((audit?.items || []).map(item => [item.id, item]));
  const rowById = new Map((rows || []).map(row => [row.id, row]));
  for (const entry of entries) {
    const item = auditById.get(entry.id);
    const row = rowById.get(entry.id);
    if (!item || item.status !== 'source-resolved-candidate') { errors.push(`${entry.id || 'unknown'} REVIEW4 reviewer decision unresolved candidate`); continue; }
    if (!['approved', 'rejected'].includes(entry.decision)) errors.push(`${entry.id} REVIEW4 reviewer decision invalid`);
    if (entry.reviewedOn !== decisions.reviewedOn) errors.push(`${entry.id} REVIEW4 reviewer mixed date`);
    if (entry.featureContractSha256 !== item.featureContractSha256 || entry.featureContractSha256 !== sha256(`${row?.feature || ''}\n${row?.pass || ''}`) ||
        entry.sourceFlowDigest !== item.sourceFlowDigest || entry.verifierCommand !== item.verifier?.command || entry.evidenceToken !== item.evidenceToken ||
        entry.actionSymbol !== item.roles?.action?.symbol || entry.stateSymbol !== item.roles?.state?.symbol) errors.push(`${entry.id} REVIEW4 reviewer flow field drift`);
    const justification = String(entry.justification || '');
    const required = [entry.id, row?.feature, row?.pass, entry.verifierCommand, entry.evidenceToken, entry.actionSymbol, entry.stateSymbol, entry.sourceFlowDigest].filter(Boolean);
    if (entry.justificationSha256 !== sha256(justification) || !required.every(token => justification.includes(token))) errors.push(`${entry.id} REVIEW4 reviewer justification unbound`);
  }
  return errors;
}

export function normalizeReview4DecisionsToApprovals({ audit, decisions, orderedIds, rows }) {
  const errors = validateReview4DecisionArtifact({ audit, decisions, orderedIds, rows });
  if (errors.length) throw new Error(errors.join('; '));
  const rejected = decisions.decisions.filter(item => item.decision !== 'approved');
  if (rejected.length) throw new Error(`REVIEW4 reviewer rejected ${rejected.length} row(s); approval ledger generation forbidden`);
  const approvals = decisions.decisions.map(entry => ({
    id: entry.id,
    decision: 'approved-source-flow',
    reviewerSource: decisions.reviewerSource,
    reviewerActor: decisions.reviewerActor,
    reviewedOn: decisions.reviewedOn,
    featureContractSha256: entry.featureContractSha256,
    sourceFlowDigest: entry.sourceFlowDigest,
    verifierCommand: entry.verifierCommand,
    evidenceToken: entry.evidenceToken,
    actionSymbol: entry.actionSymbol,
    stateSymbol: entry.stateSymbol,
    reason: entry.justification,
    reasonSha256: entry.justificationSha256,
  }));
  return {
    schema: REVIEW4_APPROVAL_SCHEMA,
    producer: REVIEW4_APPROVAL_PRODUCER,
    reviewerActor: decisions.reviewerActor,
    reviewerSource: decisions.reviewerSource,
    candidateGeneratorMayApprove: false,
    candidateDigest: audit.candidateDigest,
    reviewedOn: decisions.reviewedOn,
    orderedIdsSha256: decisions.orderedIdsSha256,
    inventoryDigest: decisions.inventoryDigest,
    generationBoundarySha256: decisions.generationBoundarySha256,
    decisionArtifactSha256: sha256(stableStringify(decisions)),
    approvalsDigest: sha256(stableStringify(approvals)),
    approvals,
  };
}

export function parseVerifiedReview4Dispatch(rootDir, serverText = null) {
  const text = serverText ?? fs.readFileSync(path.join(rootDir, 'server.sh'), 'utf8');
  const commandToRecord = new Map();
  const fileToCommands = new Map();
  const rejected = [];
  for (const match of text.matchAll(/^  ([^\n)]+)\)\n([\s\S]*?)^    ;;/gm)) {
    const commands = match[1].split('|').map(value => value.trim()).filter(value => value.startsWith('verify-'));
    if (commands.length === 0) continue;
    const arm = match[0];
    const body = match[2];
    const requireMatches = [...body.matchAll(/^    require_internal\s+([^\s]+)\s*$/gm)];
    const execMatches = [...body.matchAll(/^    exec\s+"\$\{INTERNAL_DIR\}\/([^"\s]+)"([^\n]*)$/gm)]
      .filter(value => {
        const args = value[2].trim();
        return args.endsWith('"$@"') && !/[;&|<>`]|\$\(/.test(args);
      });
    if (requireMatches.length !== 1 || execMatches.length !== 1 ||
        requireMatches[0][1] !== execMatches[0][1] || requireMatches[0].index >= execMatches[0].index) {
      for (const command of commands) rejected.push({ command, reason: 'require-internal-exec-target-mismatch' });
      continue;
    }
    const file = `scripts/internal/${requireMatches[0][1]}`;
    if (!fs.existsSync(path.join(rootDir, file))) {
      for (const command of commands) rejected.push({ command, reason: 'dispatch-target-missing' });
      continue;
    }
    const record = {
      file,
      armSha256: sha256(arm),
      requireTarget: requireMatches[0][1],
      execTarget: execMatches[0][1],
    };
    const connected = verifiedConnectedHarness(rootDir, file);
    if (connected) {
      record.connectedFiles = [connected.file];
      record.connectedExecSha256 = connected.execSha256;
    }
    for (const command of commands) {
      commandToRecord.set(command, record);
      const owners = fileToCommands.get(file) || [];
      owners.push(command);
      fileToCommands.set(file, owners);
    }
  }
  return { commandToRecord, fileToCommands, rejected };
}

function verifiedConnectedHarness(rootDir, file) {
  const text = fs.readFileSync(path.join(rootDir, file), 'utf8');
  const matches = [...text.matchAll(/^exec\s+"\$\{SCRIPT_DIR\}\/([^"\s]+)"([^\n]*)$/gm)]
    .filter(match => !/[;&|<>`]|\$\(/.test(match[2]));
  if (matches.length !== 1) return null;
  const target = `scripts/internal/${matches[0][1]}`;
  if (!fs.existsSync(path.join(rootDir, target))) return null;
  return { file: target, execSha256: sha256(matches[0][0]) };
}

export function buildReview4TrustBindings(rootDir, item, dispatchIndex) {
  const roles = {};
  for (const [name, locator] of Object.entries(item.roles || {})) {
    roles[name] = roleTrustBinding(rootDir, locator);
  }
  const dispatch = dispatchIndex.commandToRecord.get(item.verifier?.command || '');
  if (!dispatch) throw new Error(`${item.id || 'unknown'} verified dispatch missing: ${item.verifier?.command || ''}`);
  if (dispatch.file !== item.verifier?.file) {
    throw new Error(`${item.id || 'unknown'} verifier target mismatch: ${item.verifier?.command} -> ${dispatch.file}, proof=${item.verifier?.file}`);
  }
  const verifierText = fs.readFileSync(path.join(rootDir, dispatch.file), 'utf8');
  return {
    schema: 'media-server.review4-source-trust-bindings.v1',
    roles,
    verifierFileSha256: sha256(verifierText),
    dispatch: {
      command: item.verifier.command,
      file: dispatch.file,
      armSha256: dispatch.armSha256,
      requireTarget: dispatch.requireTarget,
      execTarget: dispatch.execTarget,
      connectedFiles: dispatch.connectedFiles || [],
      connectedExecSha256: dispatch.connectedExecSha256 || null,
    },
  };
}

export function validateReview4TrustBindings(rootDir, item, dispatchIndex) {
  const errors = [];
  let expected;
  try {
    expected = buildReview4TrustBindings(rootDir, item, dispatchIndex);
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
  const actualHard = review4HardTrustBindings(item.trustBindings);
  const expectedHard = review4HardTrustBindings(expected);
  if (stableStringify(actualHard) !== stableStringify(expectedHard)) {
    for (const name of new Set([...Object.keys(item.trustBindings?.roles || {}), ...Object.keys(expected.roles)])) {
      if (stableStringify(actualHard?.roles?.[name]) !== stableStringify(expectedHard.roles[name])) {
        errors.push(`${item.id || 'unknown'} REVIEW4 ${name} blob/enclosing-body trust binding drift`);
      }
    }
    if (item.trustBindings?.verifierFileSha256 !== expected.verifierFileSha256) {
      errors.push(`${item.id || 'unknown'} REVIEW4 verifier file trust binding drift`);
    }
    if (stableStringify(item.trustBindings?.dispatch) !== stableStringify(expected.dispatch)) {
      errors.push(`${item.id || 'unknown'} REVIEW4 dispatch arm trust binding drift`);
    }
    if (errors.length === 0) errors.push(`${item.id || 'unknown'} REVIEW4 source/verifier trust binding drift`);
  }
  return errors;
}

export function review4HardTrustBindings(bindings) {
  if (!bindings || typeof bindings !== 'object') return bindings;
  const copy = structuredClone(bindings);
  for (const role of Object.values(copy.roles || {})) {
    if (/^(?:src|include|config)\//.test(String(role.file || ''))) {
      delete role.trackedBlobSha256;
    }
  }
  return copy;
}

export function validateReview4ApprovalEnvelope({ audit, approvals, orderedIds, rows }) {
  const errors = [];
  if (audit?.schema !== REVIEW4_AUDIT_SCHEMA) errors.push('REVIEW4 source audit schema mismatch');
  if (audit?.sourceRelease !== 'v3.9.0') errors.push('REVIEW4 source release mismatch');
  if (audit?.generationBoundary?.candidateIsApproval !== false) errors.push('REVIEW4 candidate boundary permits approval');
  if (stableStringify(audit?.generationBoundary) !== stableStringify(REVIEW4_GENERATION_BOUNDARY)) errors.push('REVIEW4 generation boundary canonical drift');
  if (!Array.isArray(audit?.generationBoundary?.inputs) ||
      !audit.generationBoundary.inputs.includes('separate reviewed proof specs')) {
    errors.push('REVIEW4 candidate input boundary drift');
  }
  if (!Array.isArray(audit?.generationBoundary?.excludedInputs) ||
      !audit.generationBoundary.excludedInputs.includes('review.decision') ||
      !audit.generationBoundary.excludedInputs.includes('review.reviewer')) {
    errors.push('REVIEW4 candidate approval exclusion boundary drift');
  }
  if (!Array.isArray(audit?.items)) errors.push('REVIEW4 audit items missing');
  else if (audit.candidateDigest !== review4CandidateDigest(audit.items)) errors.push('REVIEW4 audit candidate digest drift');
  if (approvals?.schema !== REVIEW4_APPROVAL_SCHEMA) errors.push('REVIEW4 approval schema mismatch');
  if (approvals?.producer !== REVIEW4_APPROVAL_PRODUCER) errors.push('REVIEW4 approval producer mismatch');
  if (approvals?.candidateGeneratorMayApprove !== false) errors.push('REVIEW4 candidate generator approval boundary mismatch');
  if (approvals?.candidateDigest !== audit?.candidateDigest) errors.push('REVIEW4 approval candidate digest drift');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(approvals?.reviewedOn || ''))) errors.push('REVIEW4 approval top-level date missing');
  if (approvals?.orderedIdsSha256 !== sha256(stableStringify(orderedIds))) errors.push('REVIEW4 approval ordered ID digest drift');
  if (approvals?.inventoryDigest !== review4InventoryDigest(rows)) errors.push('REVIEW4 approval inventory digest drift');
  if (approvals?.generationBoundarySha256 !== review4GenerationBoundaryDigest()) errors.push('REVIEW4 approval generation boundary digest drift');
  if (!String(approvals?.reviewerActor || '').trim() || approvals?.reviewerSource !== REVIEW4_APPROVAL_REVIEWER_SOURCE) errors.push('REVIEW4 approval reviewer identity drift');
  if (!/^[a-f0-9]{64}$/.test(String(approvals?.decisionArtifactSha256 || ''))) errors.push('REVIEW4 approval decision artifact digest missing');
  const approvalItems = Array.isArray(approvals?.approvals) ? approvals.approvals : [];
  if (approvals?.approvalsDigest !== sha256(stableStringify(approvalItems))) errors.push('REVIEW4 approval items digest drift');
  if (stableStringify(approvalItems.map(item => item.id)) !== stableStringify(orderedIds)) {
    errors.push('REVIEW4 approval ordered ID coverage drift');
  }
  if (new Set(approvalItems.map(item => item.id)).size !== orderedIds.length) errors.push('REVIEW4 approval duplicate or missing IDs');
  if (new Set(approvalItems.map(item => item.reason)).size !== orderedIds.length) {
    errors.push('REVIEW4 approval reasons must be unique per row');
  }
  const auditById = new Map((audit?.items || []).map(item => [item.id, item]));
  const rowById = new Map((rows || []).map(row => [row.id, row]));
  for (const approval of approvalItems) {
    const item = auditById.get(approval.id);
    const row = rowById.get(approval.id);
    if (!item || item.status !== 'source-resolved-candidate') {
      errors.push(`${approval.id || 'unknown'} REVIEW4 approval has no resolved candidate`);
      continue;
    }
    if (approval.decision !== 'approved-source-flow') errors.push(`${approval.id} REVIEW4 approval decision drift`);
    if (approval.reviewerSource !== REVIEW4_APPROVAL_REVIEWER_SOURCE) errors.push(`${approval.id} REVIEW4 approval reviewer drift`);
    if (approval.sourceFlowDigest !== item.sourceFlowDigest) errors.push(`${approval.id} REVIEW4 approval source-flow digest drift`);
    if (approval.reviewedOn !== approvals?.reviewedOn) errors.push(`${approval.id} REVIEW4 approval date drift`);
    const featureContractSha256 = sha256(`${row?.feature || ''}\n${row?.pass || ''}`);
    if (!row || approval.featureContractSha256 !== featureContractSha256 || item.featureContractSha256 !== featureContractSha256) errors.push(`${approval.id} REVIEW4 approval feature/pass digest drift`);
    if (approval.verifierCommand !== item.verifier?.command || approval.evidenceToken !== item.evidenceToken ||
        approval.actionSymbol !== item.roles?.action?.symbol || approval.stateSymbol !== item.roles?.state?.symbol ||
        approval.reviewerActor !== approvals?.reviewerActor) {
      errors.push(`${approval.id} REVIEW4 approval flow field drift`);
    }
    const reason = String(approval.reason || '');
    const reasonTokens = [approval.id, row?.feature, row?.pass, item.verifier?.command, item.evidenceToken, item.roles?.action?.symbol, item.roles?.state?.symbol, item.sourceFlowDigest].filter(Boolean);
    if (!reasonTokens.every(token => reason.includes(token)) || approval.reasonSha256 !== sha256(reason)) errors.push(`${approval.id} REVIEW4 approval reason is not independently flow-bound`);
  }
  return errors;
}

export function classifyReview4Requirement(row) {
  const feature = String(row.feature || '');
  const pass = String(row.pass || '');
  const stagedNoApplyBoundary = /\bstaged(?:\s+change)?[^\n]{0,80}\bno[- ]?apply\b[^\n]{0,40}\bboundary\b/i.test(feature) ||
    (/\bstaging[- ]only\b/i.test(pass) &&
     /(?:sourceChangeApplied|publishedViewChangeApplied|ruleFollowUpApplied|commandPlanExecuted|\bmutation\b|\bapply\b|\bapplied\b|적용|변경)[\s\S]{0,240}(?:false|수행하지\s*않|변경하지\s*않|적용하지\s*않)/i.test(pass));
  const explicitNegativeOutcome = /비노출|불변|금지|거부|차단|미수행|수행하지\s*않|변경하지\s*않|저장하지\s*않|발생하지\s*않|추가하지\s*않|노출하지\s*않|forbid|reject|deny|must not|no[- ](?:write|store|mutation)|not[- ]performed|default[- ]off/i.test(pass);
  const boundaryFeature = /deferral|default[- ]off|read[- ]only|no[- ](?:write|store|mutation)|비노출|불변|금지|거부|차단|미수행/i.test(feature);
  const positivePrimaryOutcome = /(?:저장|생성|등록|변경|갱신|삭제|발급|적용|반영)(?:되고|되며|되어|하여|하고|함|됨|한다|\s*성공)|(?:표시|조회|요약|렌더|비교|로그인|확인|구분)(?:되고|되며|되어|하여|하고|함|됨|한다|\s*성공|\s|,|$)|(?:saved|created|registered|updated|changed|deleted|issued|applied|persisted|displayed|rendered|listed|read|logged[- ]in)\b/i.test(pass);
  const expectation = /비노출|redact/i.test(feature) || (/비노출|redact/i.test(pass) && (boundaryFeature || !positivePrimaryOutcome))
    ? 'redact'
    : /불변|invariant/i.test(feature) || (/불변|invariant/i.test(pass) && (boundaryFeature || !positivePrimaryOutcome))
      ? 'invariant'
      : /금지|거부|차단|미수행|없음|forbid|reject|deny|must not|no[- ](?:write|store|mutation)/i.test(feature) ||
          (explicitNegativeOutcome && (boundaryFeature || !positivePrimaryOutcome))
        ? 'deny'
        : 'allow';
  let operation = 'read';
  if (/삭제|종료|delete|remove|logout/i.test(feature)) operation = 'delete';
  else if (/수정|변경|갱신|update|change|edit/i.test(feature)) operation = 'update';
  else if (/생성|등록|추가|발급|create|insert|register|issue/i.test(feature)) operation = 'create';
  else if (/저장|적용|승인|거절|save|apply|persist|write|approve|reject/i.test(feature)) operation = 'write';
  else if (/비대상|none|not applicable/i.test(feature)) operation = 'none';
  const prefix = String(row.id || '').split('-')[0];
  const surface = ({ UI: 'ui', AUTH: 'auth', SRC: 'storage', RULE: 'rule', EVT: 'event', CLIENT: 'client', MEDIA: 'media', LAB: 'runtime', SAFE: 'policy', OPS: 'ops' })[prefix] || 'unknown';
  if (stagedNoApplyBoundary) return { operation: 'read', expectation: 'invariant', surface };
  return { operation, expectation, surface };
}

export function buildReview4SemanticObligation(row, { rootDir = null } = {}) {
  const pass = String(row.pass || '');
  const text = `${row.feature}\n${pass}`;
  const requirement = classifyReview4Requirement(row);
  const corpus = rootDir ? semanticSourceCorpus(rootDir) : '';
  const quoted = [...text.matchAll(/`([^`]{2,180})`/g)].map(match => match[1]);
  const quotedRoutes = [...text.matchAll(/`(\/(?:[A-Za-z0-9_?&=/{}/.-]*))`/g)].map(match => match[1]);
  const routeTokens = [...new Set([
    ...quotedRoutes,
    ...[...text.matchAll(/(?:^|[\s`"'(])\/(ops|client|lab|setup|login|logout|password|invite|webrtc|auth|whep|whip)[A-Za-z0-9_?&=/{}/.-]*/gm)]
      .map(match => match[0].trim().replace(/^[`"'(]/, '')),
  ])].filter(Boolean);
  const schemaTokens = uniqueMatches(text, /media-server\.[A-Za-z0-9_.:-]+/g);
  const named = [...new Set([
    ...uniqueMatches(text, /\b(?:[a-z_][A-Za-z0-9_]*[A-Z][A-Za-z0-9_]*|[A-Za-z_][A-Za-z0-9_]*_[A-Za-z0-9_]+)\b/g),
    ...uniqueMatches(text, /\b(?:RTSP|WHEP|WHIP|ONVIF|WebRTC|SSE|TURN|VLM)\b/g),
  ])];
  const fieldTokens = [...new Set([...quoted, ...named])]
    .filter(token => !routeTokens.includes(token) && !schemaTokens.includes(token) && semanticToken(token));
  const outcomeTokens = [...new Set(pass.split(/[^\p{L}\p{N}_:/.-]+/u).filter(semanticToken).filter(strongOutcomeToken))].slice(0, 48);
  const currentRouteTokens = filterCurrentSourceTokens(routeTokens, corpus);
  const currentSchemaTokens = filterCurrentSourceTokens(schemaTokens, corpus);
  const currentFieldTokens = filterCurrentSourceTokens(fieldTokens, corpus);
  const currentOutcomeTokens = filterCurrentSourceTokens(outcomeTokens, corpus);
  const negativeBoundaries = extractNegativeBoundaries(pass);
  const prefix = String(row.id || '').split('-')[0];
  const sourceClass = new Set(['UI', 'AUTH', 'SRC', 'RULE', 'EVT', 'CLIENT', 'MEDIA']).has(prefix)
    ? 'product-source-required'
    : 'harness-source-eligible';
  const normalizedOutcome = String(row.pass || '').trim().replace(/\s+/g, ' ');
  const clauses = [
    { kind: 'route', tokens: currentRouteTokens, minimumExactMatches: currentRouteTokens.length > 0 ? 1 : 0 },
    { kind: 'schema', tokens: currentSchemaTokens, minimumExactMatches: currentSchemaTokens.length > 0 ? 1 : 0 },
    { kind: 'field', tokens: currentFieldTokens, minimumExactMatches: currentFieldTokens.length > 0 ? 1 : 0 },
    { kind: 'outcome', tokens: currentOutcomeTokens, minimumExactMatches: currentOutcomeTokens.length > 0 ? 1 : 0 },
  ];
  return {
    schema: 'media-server.review4-typed-semantic-obligation.v1',
    policyVersion: REVIEW4_OBLIGATION_POLICY,
    featureContractSha256: sha256(`${row.feature}\n${row.pass}`),
    requirement,
    sourceClass,
    routeTokens: currentRouteTokens,
    schemaTokens: currentSchemaTokens,
    fieldTokens: currentFieldTokens,
    outcomeTokens: currentOutcomeTokens,
    negativeBoundaries,
    clauses,
    requiredOutcome: {
      normalized: normalizedOutcome,
      sha256: sha256(normalizedOutcome),
    },
  };
}

export function validateReview4SemanticProof({ item, dispatchIndex, rootDir = null }) {
  const errors = [];
  for (const [index, edge] of (item.edges || []).entries()) {
    errors.push(...proofNarrativeErrors(edge?.witness).map(error => `edge-${index}:${error}`));
    const from = item.roles?.[edge?.from];
    const to = item.roles?.[edge?.to];
    if (edge?.source && edge.source !== `${from?.file}:${from?.line}`) errors.push(`edge-${index}:source-locator-unbound`);
    if (edge?.target && edge.target !== `${to?.file}:${to?.line}`) errors.push(`edge-${index}:target-locator-unbound`);
  }
  if (review4ProofOnlyVerifierPath(item.verifier?.file) || review4ProofOnlyVerifierPath(item.roles?.readback?.file)) {
    errors.push('proof-only-short-verifier-rejected');
  }
  const proofScaffold = /\breview4(?:Typed|Safe|Ops)[A-Za-z0-9_]*\b/;
  for (const [name, role] of Object.entries(item.roles || {})) {
    const evidence = `${role?.symbol || ''}\n${role?.anchor || ''}\n${bindingBodyText(rootDir, role, item.trustBindings?.roles?.[name])}`;
    if (proofScaffold.test(evidence)) errors.push(`${name}:proof-only-review4-scaffold-rejected`);
  }
  const obligation = item.semanticObligation;
  if (!obligation || obligation.schema !== 'media-server.review4-typed-semantic-obligation.v1' ||
      obligation.policyVersion !== REVIEW4_OBLIGATION_POLICY ||
      obligation.featureContractSha256 !== item.featureContractSha256 ||
      stableStringify(obligation.requirement) !== stableStringify(item.requirement)) {
    errors.push('typed-semantic-obligation-drift');
    return errors;
  }
  if (!obligation.requiredOutcome?.normalized ||
      obligation.requiredOutcome.sha256 !== sha256(obligation.requiredOutcome.normalized)) {
    errors.push('required-outcome-integrity-drift');
    return errors;
  }
  const outcomeClause = (obligation.clauses || []).find(clause => clause.kind === 'outcome');
  if (!outcomeClause || (outcomeClause.tokens || []).length === 0 && outcomeClause.minimumExactMatches !== 0 ||
      (outcomeClause.tokens || []).length > 0 && outcomeClause.minimumExactMatches < 1) {
    errors.push('outcome-clause-cardinality-invalid');
    return errors;
  }
  if (item.sharedContract &&
      (!/^media-server\.actual-contract\.[A-Za-z0-9_.:-]+$/.test(String(item.sharedContract.id || '')) ||
       !['ops-gate', 'safety-invariant'].includes(item.sharedContract.facet))) {
    errors.push('shared-contract-metadata-invalid');
  }
  const roles = item.roles || {};
  if (obligation.sourceClass === 'product-source-required') {
    for (const name of ['owner', 'action', 'state']) {
      if (!/^(?:src|include|config)\//.test(String(roles[name]?.file || ''))) errors.push(`${name}:product-source-required`);
    }
  }
  const evidence = Object.entries(roles).flatMap(([name, role]) => [
    role?.anchor,
    name === 'verifier' ? '' : bindingBodyText(rootDir, role, item.trustBindings?.roles?.[name]),
  ]).join('\n');
  for (const clause of obligation.clauses || []) {
    const matchingTokens = clause.kind === 'field'
      ? clause.tokens.filter(token => evidence.toLocaleLowerCase('en-US').includes(String(token).toLocaleLowerCase('en-US')))
      : clause.tokens.filter(token => evidence.includes(token));
    if (clause.minimumExactMatches > 0 &&
        matchingTokens.length < clause.minimumExactMatches) {
      errors.push(`obligation-${clause.kind}-token-unbound`);
    }
  }
  const stateNegativeBoundaryEvidence = [
    roles.state?.anchor,
    bindingBodyText(rootDir, roles.state, item.trustBindings?.roles?.state),
  ].join('\n');
  const readbackNegativeBoundaryEvidence = [
    roles.readback?.anchor,
    bindingBodyText(rootDir, roles.readback, item.trustBindings?.roles?.readback),
  ].join('\n');
  const negativeBoundaryEvidence = `${stateNegativeBoundaryEvidence}\n${readbackNegativeBoundaryEvidence}`;
  for (const boundary of obligation.negativeBoundaries || []) {
    const productStateComparison = /^(?:src|include|config)\//.test(String(roles.state?.file || '')) &&
      review4ExplicitProductNegativeBoundaryEvidence(stateNegativeBoundaryEvidence, boundary);
    if (!review4ExplicitNegativeBoundaryEvidence(negativeBoundaryEvidence, boundary) && !productStateComparison) {
      errors.push(`negative-boundary-${boundary.kind}-oracle-unbound`);
    }
  }

  const pairs = [['owner', 'dispatch'], ['dispatch', 'action'], ['action', 'state'], ['state', 'readback'], ['readback', 'verifier']];
  if (!Array.isArray(item.edges) || item.edges.length !== pairs.length) errors.push('edge-count-drift');
  else pairs.forEach(([from, to], index) => {
    const edge = item.edges[index];
    if (edge?.from !== from || edge?.to !== to) errors.push(`edge-${index}:sequence-drift`);
    errors.push(...validateTypedEdge(edge || {}, roles, item.evidenceToken, item.trustBindings, dispatchIndex, rootDir, item).map(error => `edge-${index}:${error}`));
  });

  const mutation = obligation.requirement.expectation === 'allow' &&
    ['create', 'update', 'delete', 'write'].includes(obligation.requirement.operation);
  if (mutation) {
    const stateEvidence = `${roles.state?.anchor || ''}\n${bindingBodyText(rootDir, roles.state, item.trustBindings?.roles?.state)}`;
    if (!authoritativeMutationAnchor(stateEvidence)) errors.push('mutation-authoritative-state-change-missing');
    const readbackEdge = item.edges?.[3];
    if (readbackEdge?.kind !== 'runtime-readback' || !observedRuntimeAssertion({ rootDir, role: roles.readback, trust: item.trustBindings?.roles?.readback, item })) {
      errors.push('mutation-independent-observed-readback-missing');
    }
  }
  if (['deny', 'redact', 'invariant'].includes(obligation.requirement.expectation)) {
    const combined = `${roles.state?.anchor || ''}\n${roles.readback?.anchor || ''}`;
    if (!negativeOutcomeAssertion(combined)) errors.push('negative-explicit-reject-redact-absence-oracle-missing');
  }
  return errors;
}

function proofNarrativeErrors(witness) {
  const text = String(witness || '');
  const errors = [];
  if (text.length > 512) errors.push('witness-too-long');
  if (/\|\s*(?:UI|AUTH|SRC|RULE|EVT|CLIENT|MEDIA|LAB|SAFE|OPS)-\d{3}\s*\|/.test(text)) errors.push('inventory-row-in-witness-rejected');
  if (/production state\s*->\s*verifier literal line/i.test(text)) errors.push('synthetic-literal-assertion-narrative-rejected');
  return errors;
}

export function review4CanonicalFlowKey(item) {
  const roles = item.trustBindings?.roles || {};
  return sha256(stableStringify({
    owner: flowRoleKey(roles.owner, item.roles?.owner),
    action: flowRoleKey(roles.action, item.roles?.action),
    state: flowRoleKey(roles.state, item.roles?.state),
    readback: flowRoleKey(roles.readback, item.roles?.readback),
    edgeKinds: (item.edges || []).map(edge => edge.kind || edge.proof || null),
  }));
}

function flowRoleKey(binding, locator) {
  return {
    enclosingBodySha256: binding?.enclosingBodySha256 || null,
    anchorSemanticSha256: locator?.anchor ? sha256(normalizeSemanticAnchor(locator.anchor)) : null,
  };
}

function normalizeSemanticAnchor(anchor) {
  return String(anchor || '').trim().replace(/\s+/g, ' ').replace(/\b\d+\b/g, '<number>');
}

export function validateReview4SharedFlows(items) {
  const errors = [];
  const groups = new Map();
  for (const item of items.filter(value => value.status === 'source-resolved-candidate' || value.sourceFlowDigest)) {
    const key = review4CanonicalFlowKey(item);
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }
  for (const [key, group] of groups) {
    if (group.length <= 1) continue;
    const ids = new Set(group.map(item => item.sharedContract?.id).filter(Boolean));
    const facets = group.map(item => item.sharedContract?.facet).filter(Boolean);
    if (!group.every(item => item.sharedContract?.id && item.sharedContract?.facet) || ids.size !== 1 ||
        new Set(facets).size !== group.length) {
      errors.push({ key, ids: group.map(item => item.id), reason: 'ambiguous-shared-contract-facet' });
    }
  }
  const negativeConditionGroups = new Map();
  for (const item of items.filter(value =>
    (value.status === 'source-resolved-candidate' || value.sourceFlowDigest) &&
    (value.semanticObligation?.negativeBoundaries || []).length > 0)) {
    const key = sharedNegativeConditionKey(item);
    if (!key) continue;
    const group = negativeConditionGroups.get(key) || [];
    group.push(item);
    negativeConditionGroups.set(key, group);
  }
  for (const [key, group] of negativeConditionGroups) {
    if (new Set(group.map(item => item.id)).size <= 1) continue;
    errors.push({ key, ids: group.map(item => item.id), reason: 'shared-negative-condition-ambiguity' });
  }
  return errors;
}

function validateTypedEdge(edge, roles, evidenceToken, trustBindings, dispatchIndex, rootDir, item) {
  const errors = [];
  const kind = edge.kind || edge.proof;
  const from = roles[edge.from];
  const to = roles[edge.to];
  const allowed = new Set(['callsite', 'direct-callsite', 'branch-containment', 'function-containment', 'argument-def-use', 'return-def-use', 'assignment-def-use', 'co-asserted-boundary', 'event-binding', 'structural-producer-assertion', 'runtime-readback', 'verifier-dispatch']);
  if (!allowed.has(kind)) return ['unsupported-proof-kind'];
  if (!edge.witness) errors.push('witness-missing');
  if (!from || !to) return [...errors, 'role-missing'];
  const expectedSource = `${from.file}:${from.line}`;
  const expectedTarget = `${to.file}:${to.line}`;
  if (edge.source && edge.source !== expectedSource) errors.push('source-locator-unbound');
  if (edge.target && edge.target !== expectedTarget) errors.push('target-locator-unbound');
  if (kind === 'callsite' || kind === 'direct-callsite') {
    const bare = String(to.symbol || '').split('::').pop();
    if (!bare || !String(from.anchor || '').includes(bare)) errors.push('callsite-symbol-unbound');
  }
  if (kind === 'branch-containment' || kind === 'function-containment') {
    const body = trustBindings?.roles?.[edge.from];
    if (from.file !== to.file || from.line >= to.line || !body ||
        from.line < body.enclosingBodyStartLine || to.line > body.enclosingBodyEndLine) errors.push('containment-unproven');
  }
  if (['argument-def-use', 'assignment-def-use', 'return-def-use', 'event-binding'].includes(kind)) {
    const shared = sharedIdentifiers(from, to, evidenceToken);
    const directCall = directCallRelation(from, to, rootDir, trustBindings);
    const directArgumentShared = directCall && directArgumentSharedRelation(from, to, rootDir, trustBindings);
    const returnAssignment = returnAssignmentRelation(from, to);
    const assignmentRelation = kind === 'assignment-def-use' && assignmentDefUseObserved(from, to);
    if (shared.length === 0 && !directArgumentShared && !returnAssignment && !assignmentRelation) errors.push('def-use-token-or-variable-unbound');
    if (kind === 'assignment-def-use' && !assignmentRelation && !returnAssignment) errors.push('assignment-def-use-unproven');
    if (kind === 'assignment-def-use' && from.file !== to.file && !directArgumentShared && !returnAssignment) {
      errors.push('cross-file-assignment-def-use-unproven');
    }
    if (kind === 'assignment-def-use' && sameEnclosingBody(from, to, trustBindings) && from.line >= to.line) {
      errors.push('assignment-order-invalid');
    }
    if (kind === 'argument-def-use' && !((directCall && (shared.length > 0 || directArgumentShared) && callHasArguments(from, to, rootDir, trustBindings)) || returnAssignment)) errors.push('argument-call-not-observed');
    if (kind === 'return-def-use' && !/\breturn\b/.test(`${from.anchor}\n${to.anchor}`) && !returnAssignment) errors.push('return-not-observed');
    if (kind === 'event-binding' && !/(?:addEventListener|dispatchEvent|emit\s*\(|on[A-Z_a-z]+\s*=|\.on\s*\()/.test(`${from.anchor}\n${to.anchor}`)) errors.push('event-binding-not-observed');
  }
  if (kind === 'co-asserted-boundary' && !coAssertedBoundaryObserved(from, to, roles.readback, trustBindings)) {
    errors.push('co-asserted-boundary-unproven');
  }
  if (kind === 'structural-producer-assertion' || kind === 'runtime-readback') {
    const token = String(evidenceToken || '');
    const readbackEvidence = kind === 'structural-producer-assertion'
      ? String(to.anchor || '')
      : `${to.anchor || ''}\n${localAssertionBranchText(rootDir, to, trustBindings?.roles?.[edge.to])}`;
    if (!token || !String(from.anchor || '').includes(token) || !readbackEvidence.includes(token)) errors.push('readback-token-unbound');
    if (kind === 'structural-producer-assertion' && review4WholeFileSourceAssertion(rootDir, to, trustBindings?.roles?.[edge.to])) {
      errors.push('whole-file-source-assertion');
    }
    if (!readbackAssertion({ rootDir, role: to, trust: trustBindings?.roles?.[edge.to], item, witness: edge.witness })) errors.push('readback-is-not-assertion');
    if (kind === 'runtime-readback' && review4SelfDeclaredRuntimeReadback(rootDir, to, trustBindings?.roles?.[edge.to])) {
      errors.push('runtime-readback-self-declared');
    }
    if (kind === 'runtime-readback' && !observedRuntimeAssertion({ rootDir, role: to, trust: trustBindings?.roles?.[edge.to], item })) {
      errors.push('runtime-readback-observation-missing');
    }
  }
  if (kind === 'verifier-dispatch') {
    const record = dispatchIndex?.commandToRecord?.get(edge.witness);
    const executableFiles = record ? [record.file, ...(record.connectedFiles || [])] : [];
    if (!record || !executableFiles.includes(roles.readback?.file) || roles.verifier?.file !== 'server.sh') errors.push('verifier-dispatch-unbound');
    if (record && !authWorkflowReadbackReachable(edge.witness, roles.readback, rootDir)) {
      errors.push('verifier-fixed-mode-readback-unreachable');
    }
  }
  return errors;
}

function localAssertionBranchText(rootDir, role, trust, radius = 12) {
  if (!rootDir || !role?.file || !Number.isInteger(role.line)) return '';
  try {
    const lines = fs.readFileSync(path.join(rootDir, role.file), 'utf8').split(/\r?\n/);
    const assertionIndex = role.line - 1;
    const anchor = String(role.anchor || '');
    const start = Math.max(0, assertionIndex - 120);
    for (let index = assertionIndex; index >= start; index -= 1) {
      const match = lines[index].match(/\bfor\s*\(\s*const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+of\s*\[/);
      if (!match || !new RegExp(`\\b${escapeRegExp(match[1])}\\b`).test(anchor)) continue;
      for (let probe = index; probe <= Math.min(assertionIndex, index + 120); probe += 1) {
        if (!/\]\s*\)\s*\{\s*$/.test(lines[probe])) continue;
        const column = lines[probe].lastIndexOf('{');
        if (matchingBraceLine(lines, probe + 1, column) >= role.line) {
          return lines.slice(index, assertionIndex + 1).join('\n');
        }
        break;
      }
    }
    return lines.slice(Math.max(0, assertionIndex - 2), Math.min(lines.length, assertionIndex + 3)).join('\n');
  } catch {
    return '';
  }
}

function sharedIdentifiers(from, to, evidenceToken) {
  const stop = new Set([
    'const', 'auto', 'return', 'true', 'false', 'string', 'request', 'response', 'status', 'source', 'state',
    'result', 'this', 'null', 'void', 'canonical', 'owner', 'dispatch', 'action', 'readback', 'verifier', 'role',
  ]);
  const ids = value => new Set([...String(value || '').matchAll(/[A-Za-z_$][A-Za-z0-9_$]{2,}/g)].map(match => match[0]).filter(token => !stop.has(token.toLowerCase())));
  // Symbol은 reviewer가 작성한 locator label이며 source-level def-use evidence가 아니다.
  // 두 exact source anchor에 모두 존재하는 identifier만 typed edge를 증명할 수 있다.
  const left = ids(from.anchor || '');
  const right = ids(to.anchor || '');
  const shared = [...left].filter(token => right.has(token));
  for (const token of ids(evidenceToken)) if (left.has(token) && right.has(token)) shared.push(token);
  return [...new Set(shared)];
}

function authoritativeMutationAnchor(anchor) {
  return /(?:\b(?:save|write|store|persist|insert|emplace|append|push|erase|remove|delete|disable|update|upsert|create|replace|publish|assign|put|post|patch)\w*\s*\(|\b(?:Create|Update|Upsert|Delete|Persist|Save|Append|Publish)[A-Za-z0-9_:]*\s*\(|[A-Za-z_$][A-Za-z0-9_$.[\]"']*\s*=(?!=|>)|\[[^\]]+\]\s*=(?!=|>)|\+\+|--|\b(?:JsonResponse|JsonResult|RegistryHttpResponse)\s*\(\s*(?:200|201|202|204)\b|\breturn\b[^;]*(?:created|updated|deleted|disabled|persisted|saved))/i.test(anchor);
}

function assignmentDefUseObserved(from, to) {
  const assigned = assignedIdentifiers(from?.anchor);
  const target = String(to?.anchor || '');
  return [...assigned].some(identifier => new RegExp(`\\b${escapeRegExp(identifier)}\\b`).test(target));
}

function assignedIdentifiers(anchor) {
  const source = String(anchor || '');
  const assigned = new Set();
  for (const match of source.matchAll(/(?:^|[^=!<>])(?:\b(?:const|let|var|auto)\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*=(?!=|>)/g)) {
    assigned.add(match[1]);
  }
  for (const match of source.matchAll(/(?:^|[^=!<>])([A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)+)\s*=(?!=|>)/g)) {
    const parts = match[1].split('.');
    assigned.add(match[1]);
    assigned.add(parts.at(-1));
  }
  return assigned;
}

function coAssertedBoundaryObserved(from, to, readback, trustBindings) {
  if (!from || !to || !readback || from.file !== to.file || to.file !== readback.file ||
      from.line >= to.line || to.line >= readback.line ||
      !sameEnclosingBody(from, to, trustBindings) || !sameEnclosingBody(to, readback, trustBindings)) return false;
  const fromIds = assignedIdentifiers(from.anchor);
  const toIds = assignedIdentifiers(to.anchor);
  const assertion = String(readback.anchor || '');
  return fromIds.size > 0 && toIds.size > 0 && assertionLine(assertion) &&
    [...fromIds].some(identifier => new RegExp(`\\b${escapeRegExp(identifier)}\\b`).test(assertion)) &&
    [...toIds].some(identifier => new RegExp(`\\b${escapeRegExp(identifier)}\\b`).test(assertion));
}

function sameEnclosingBody(from, to, trustBindings) {
  if (from?.file !== to?.file) return false;
  const fromTrust = Object.values(trustBindings?.roles || {}).find(binding =>
    binding.file === from.file && binding.symbol === from.symbol &&
    from.line >= binding.enclosingBodyStartLine && from.line <= binding.enclosingBodyEndLine);
  const toTrust = Object.values(trustBindings?.roles || {}).find(binding =>
    binding.file === to.file && binding.symbol === to.symbol &&
    to.line >= binding.enclosingBodyStartLine && to.line <= binding.enclosingBodyEndLine);
  return Boolean(fromTrust && toTrust &&
    fromTrust.enclosingBodyStartLine === toTrust.enclosingBodyStartLine &&
    fromTrust.enclosingBodyEndLine === toTrust.enclosingBodyEndLine &&
    fromTrust.enclosingBodyScope === toTrust.enclosingBodyScope);
}

function assertionLine(anchor) {
  return /\bassert[A-Za-z0-9_]*\s*\(|^\s*assert\s+\S|\bexpect(?:_[A-Za-z0-9_]+)?\s*(?:\(|\")/i.test(anchor);
}

function observedRuntimeAssertion({ rootDir, role, trust, item }) {
  const anchor = String(role?.anchor || '');
  if (staticSourceAssertion(anchor)) return false;
  const body = bindingBodyText(rootDir, role, trust);
  if (!body || trust?.enclosingBodyScope === 'file-fallback' || staticSourceAssertion(body)) return false;
  if (primaryMutationResponseAssertion(anchor, body)) return false;
  if (!readbackAssertion({ rootDir, role, trust, item, witness: item.edges?.[3]?.witness || '' })) return false;
  return /(?:\bcurl\b|\bhttp_code\b|browser\.|\.cdp\s*\(|\bfetch\s*\(|\brequestJson\s*\(|\bresponse\b|\bpayload\b|\bpathname\b|\breadyState\b|\b[A-Za-z0-9_]*(?:response|result|status|readback|body|payload|record|rows?|count|json)\b)/i.test(`${anchor}\n${body}`);
}

function primaryMutationResponseAssertion(anchor, body) {
  const mutationRequest = /(?:-X\s+(?:PUT|POST|PATCH|DELETE)\b|\bmethod\s*:\s*['"](?:PUT|POST|PATCH|DELETE)['"])/i;
  if (mutationRequest.test(anchor)) return true;
  const anchorOffset = body.indexOf(anchor);
  if (anchorOffset < 0) return false;
  const identifiers = [...anchor.matchAll(/[A-Za-z_$][A-Za-z0-9_$]{2,}/g)].map(match => match[0]);
  for (const identifier of identifiers) {
    const assignmentPattern = new RegExp(`(?:^|\\n)\\s*(?:local\\s+)?${escapeRegExp(identifier)}\\s*=`, 'g');
    let assignment = null;
    for (const match of body.slice(0, anchorOffset).matchAll(assignmentPattern)) assignment = match;
    if (assignment && mutationRequest.test(body.slice(assignment.index, anchorOffset))) return true;
  }
  return false;
}

function staticSourceAssertion(anchor) {
  const text = String(anchor || '');
  const namedSourceAssertion = /\b(?:source|server|script|docs?|implementation|inventory|backlog|fixtureText)\s*\.\s*(?:includes|match|test)\s*\(/i.test(text);
  const helperSourceRead = /\b(?:fs\.)?readText\s*\(/i.test(text);
  const repositoryPath = /["'](?:src|include|docs|scripts|config|test\/fixtures)\/|["']server\.sh["']/i.test(text);
  const filesystemRead = /\bfs\.(?:readFileSync|readFile)\s*\(/i.test(text);
  return /\bassertIncludes\s*\(/.test(text) || namedSourceAssertion || helperSourceRead || (filesystemRead && repositoryPath);
}

export function review4WholeFileSourceAssertion(rootDir, role, trust) {
  const text = String(role?.anchor || '');
  const helperMatch = text.match(/\bassertIncludes\s*\(\s*([^,]+),/);
  const directMatch = text.match(/\bassert\s*\(\s*((?:files\.)?[A-Za-z_$][A-Za-z0-9_$.]*)\.includes\s*\(/);
  const firstArgument = (helperMatch?.[1] || directMatch?.[1] || '').trim();
  if (!firstArgument) return false;
  const wholeFileName = /^(?:files\.)?(?:source|server|script|pageScript|clientScript|uiScript|opsScript|opsSourcesScript|docs?|inventory|backlog|implementation|fixtureText)$/i;
  if (wholeFileName.test(firstArgument)) return true;
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(firstArgument)) return false;
  const body = bindingBodyText(rootDir, role, trust);
  let alias = firstArgument;
  const visited = new Set();
  for (let depth = 0; depth < 6 && alias && !visited.has(alias); depth += 1) {
    visited.add(alias);
    const match = new RegExp(`\\b(?:const|let|var)\\s+${escapeRegExp(alias)}\\s*=\\s*([^;\\n]+)`).exec(body);
    if (!match) return false;
    const expression = match[1].trim();
    if (wholeFileName.test(expression) || /^(?:readText|fs\.(?:readFileSync|readFile))\s*\(/.test(expression)) return true;
    const next = expression.match(/^([A-Za-z_$][A-Za-z0-9_$]*)$/)?.[1];
    if (!next) return false;
    alias = next;
  }
  return false;
}

function authWorkflowReadbackReachable(command, readback, rootDir) {
  if (!String(readback?.file || '').endsWith('scripts/internal/verify_auth_workflow.sh')) return true;
  if (!/^verify-auth-(?:bootstrap|users|routes)$/.test(String(command || ''))) return false;
  try {
    const wrapperFile = path.join(rootDir, `scripts/internal/${String(command).replaceAll('-', '_')}.sh`);
    const wrapper = fs.readFileSync(wrapperFile, 'utf8');
    const fixedMode = wrapper.match(/verify_auth_workflow\.sh["']?\s+(bootstrap|users|routes)\b/)?.[1];
    if (!fixedMode) return false;
    const workflow = fs.readFileSync(path.join(rootDir, readback.file), 'utf8');
    if (!new RegExp(`(?:^|\\n)\\s*${escapeRegExp(fixedMode)}\\)\\s*\\n\\s*run_${escapeRegExp(fixedMode)}\\b`).test(workflow)) return false;
    const enclosing = shellEnclosingFunction(workflow, shellRoleCurrentLine(workflow, readback));
    if (!enclosing) return false;
    return shellFunctionReachable(workflow, `run_${fixedMode}`, enclosing);
  } catch {
    return false;
  }
}

function shellRoleCurrentLine(text, role) {
  const lines = String(text || '').split(/\r?\n/);
  const anchor = String(role?.anchor || '').trim();
  if (anchor) {
    const matches = [];
    for (let index = 0; index < lines.length; index += 1) {
      if (lines[index].trim() === anchor) matches.push(index + 1);
    }
    if (matches.length === 1) return matches[0];
  }
  return Number(role?.line || 0);
}

function shellEnclosingFunction(text, lineNumber) {
  const targetIndex = Number(lineNumber || 1) - 1;
  return shellFunctionSections(text).find(section =>
    targetIndex >= section.startIndex && targetIndex < section.endIndex)?.name || '';
}

function shellFunctionReachable(text, rootFunction, targetFunction) {
  const bodies = new Map(shellFunctionSections(text).map(section => [section.name, section.body]));
  const queue = [rootFunction];
  const visited = new Set();
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === targetFunction) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const body = bodies.get(current) || '';
    for (const name of bodies.keys()) {
      if (!visited.has(name) && new RegExp(`(?:^|\\n|[|;&])\\s*${escapeRegExp(name)}(?:\\s|\\()`).test(body)) queue.push(name);
    }
  }
  return false;
}

function shellFunctionSections(text) {
  const lines = String(text || '').split(/\r?\n/);
  const starts = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^([A-Za-z_][A-Za-z0-9_]*)\(\)\s*\{/);
    if (match) starts.push({ name: match[1], index });
  }
  return starts.map((entry, index) => {
    let endIndex = starts[index + 1]?.index ?? lines.length;
    if (index === starts.length - 1) {
      const dispatcherOffset = lines.slice(entry.index + 1).findIndex(line => /^case\s+.+\s+in\s*$/.test(line));
      if (dispatcherOffset >= 0) endIndex = entry.index + 1 + dispatcherOffset;
    }
    return {
      name: entry.name,
      startIndex: entry.index,
      endIndex,
      body: lines.slice(entry.index, endIndex).join('\n'),
    };
  });
}

function readbackAssertion({ rootDir, role, trust, item, witness }) {
  const anchor = String(role?.anchor || '');
  if (assertionLine(anchor)) return true;
  const body = bindingBodyText(rootDir, role, trust);
  const anchorOffset = body.indexOf(anchor);
  if (!body || anchorOffset < 0) return false;
  const shellCase = /^case\s+.+\s+in\s*$/.test(anchor.trim());
  const conditionalStart = Math.max(body.lastIndexOf('if', anchorOffset), body.lastIndexOf('?', anchorOffset));
  const conditional = conditionalStart >= 0 && anchorOffset - conditionalStart <= 800
    ? body.slice(conditionalStart, anchorOffset + anchor.length)
    : anchor;
  if (!shellCase && !/(?:\bif\s*\(|\?|&&|\|\||===|!==|<=|>=|<|>)/.test(conditional)) return false;
  const afterCondition = body.slice(anchorOffset);
  const failure = /(?:\bthrow\s+new\s+Error|\bthrow\b|process\.exit\s*\(\s*[1-9]|\breturn\s+(?:false|[1-9]\d*)\b|\bfail(?:ure)?Count\s*\+\+|\bfail\s*\+=\s*1|results\.fail\s*\+=\s*1|\bfail\s+["']|\bassert\.fail\s*\()/i.test(afterCondition);
  if (!failure) return false;
  if (/results\.fail|\bfail\s*\+=|failureCount/.test(body)) {
    if (trust?.enclosingBodyScope === 'file-fallback') return false;
    const featureTokens = [item.id, item.evidenceToken, ...(item.semanticObligation?.clauses || []).flatMap(clause => clause.tokens || [])]
      .filter(semanticToken);
    const bindingText = `${body}\n${witness || ''}`;
    if (!featureTokens.some(token => bindingText.includes(token))) return false;
  }
  return true;
}

function bindingBodyText(rootDir, role, trust) {
  if (!rootDir || !role?.file || !trust?.enclosingBodyStartLine || !trust?.enclosingBodyEndLine) return '';
  try {
    const lines = fs.readFileSync(path.join(rootDir, role.file), 'utf8').split(/\r?\n/);
    return lines.slice(trust.enclosingBodyStartLine - 1, trust.enclosingBodyEndLine).join('\n');
  } catch {
    return '';
  }
}

function directCallRelation(from, to, rootDir, trustBindings) {
  const fromBare = String(from.symbol || '').split('::').pop().replace(/^.*:/, '');
  const toBare = String(to.symbol || '').split('::').pop().replace(/^.*:/, '');
  const fromSpan = balancedCallSpan(rootDir, from, bindingForRole(trustBindings, from)) || String(from.anchor || '');
  const toSpan = balancedCallSpan(rootDir, to, bindingForRole(trustBindings, to)) || String(to.anchor || '');
  return Boolean((toBare && new RegExp(`\\b${escapeRegExp(toBare)}\\s*\\(`).test(fromSpan)) ||
    (fromBare && new RegExp(`\\b${escapeRegExp(fromBare)}\\s*\\(`).test(toSpan)));
}

function callHasArguments(from, to, rootDir, trustBindings) {
  const text = `${balancedCallSpan(rootDir, from, bindingForRole(trustBindings, from))}\n${balancedCallSpan(rootDir, to, bindingForRole(trustBindings, to))}`;
  return /[A-Za-z_$][A-Za-z0-9_$:.]*\s*\(\s*[^)]\S[^)]*\)/.test(text);
}

function directArgumentSharedRelation(from, to, rootDir, trustBindings) {
  const fromSpan = balancedCallSpan(rootDir, from, bindingForRole(trustBindings, from));
  const toSpan = balancedCallSpan(rootDir, to, bindingForRole(trustBindings, to));
  const fromBare = String(from.symbol || '').split('::').pop().replace(/^.*:/, '');
  const toBare = String(to.symbol || '').split('::').pop().replace(/^.*:/, '');
  return callArgumentsShareIdentifier(fromSpan, toBare, `${to.anchor || ''} ${to.symbol || ''}`) ||
    callArgumentsShareIdentifier(toSpan, fromBare, `${from.anchor || ''} ${from.symbol || ''}`);
}

function callArgumentsShareIdentifier(callerSpan, calleeName, calleeEvidence) {
  if (!calleeName) return false;
  const call = new RegExp(`\\b${escapeRegExp(calleeName)}\\s*\\(([\\s\\S]*)\\)`).exec(callerSpan);
  if (!call || !call[1].trim()) return false;
  const stop = new Set(['true', 'false', 'null', 'this', 'request', 'response', 'status', 'result', 'string']);
  const argumentsIds = new Set([...call[1].matchAll(/[A-Za-z_$][A-Za-z0-9_$]{2,}/g)]
    .map(match => match[0]).filter(token => !stop.has(token.toLowerCase())));
  return [...calleeEvidence.matchAll(/[A-Za-z_$][A-Za-z0-9_$]{2,}/g)]
    .some(match => argumentsIds.has(match[0]) && match[0] !== calleeName);
}

function bindingForRole(trustBindings, role) {
  return Object.values(trustBindings?.roles || {}).find(binding =>
    binding.file === role?.file && binding.symbol === role?.symbol &&
    role?.line >= binding.enclosingBodyStartLine && role?.line <= binding.enclosingBodyEndLine) || null;
}

function balancedCallSpan(rootDir, role, trust) {
  if (!rootDir || !role?.file || !Number.isInteger(role.line)) return String(role?.anchor || '');
  try {
    const lines = fs.readFileSync(path.join(rootDir, role.file), 'utf8').split(/\r?\n/);
    const start = Math.max(trust?.enclosingBodyStartLine || 1, role.line);
    const end = Math.min(trust?.enclosingBodyEndLine || lines.length, role.line + 18);
    let text = '';
    let depth = 0;
    let seen = false;
    for (let line = start; line <= end; line += 1) {
      text += `${lines[line - 1]}\n`;
      for (const char of lines[line - 1]) {
        if (char === '(') { depth += 1; seen = true; }
        else if (char === ')' && seen) depth -= 1;
      }
      if (line >= role.line && seen && depth <= 0) break;
    }
    return text;
  } catch {
    return String(role.anchor || '');
  }
}

function returnAssignmentRelation(from, to) {
  const producer = String(from?.anchor || '');
  const consumer = String(to?.anchor || '');
  const returnedCall = /\breturn\s+([A-Za-z_$][A-Za-z0-9_$:.]*)\s*\(/.exec(producer);
  const assignedCall = /[A-Za-z_$][A-Za-z0-9_$.[\]]*\s*=(?!=|>)\s*([A-Za-z_$][A-Za-z0-9_$:.]*)\s*\(/.exec(consumer);
  return Boolean(returnedCall && assignedCall && returnedCall[1] === assignedCall[1]);
}

function negativeOutcomeAssertion(text) {
  if (/\bassertIncludes\s*\([^\n]*(?:false|zero|deny|reject|redact|absen)/i.test(text)) return false;
  return /(?:\b(?:reject|deny|forbid|blocked|redact|absent|absence|not[- ]found|unauthorized|forbidden)\b|\b4\d\d\b|===\s*false|!==\s*true|===\s*0|!\s*[A-Za-z_$][A-Za-z0-9_$]*\.includes\s*\(|does not include|must not contain)/i.test(text);
}

function uniqueMatches(text, pattern) {
  return [...new Set(text.match(pattern) || [])];
}

function filterCurrentSourceTokens(tokens, corpus) {
  if (!corpus) return tokens;
  return tokens.filter(token => !token.startsWith('./server.sh') && corpus.includes(token));
}

function strongOutcomeToken(token) {
  const value = String(token || '').trim();
  if (!semanticToken(value) || /^\/(?:ops|client|lab|auth|setup|login)\b/.test(value) || /^media-server\./.test(value)) return false;
  if (/^(?:EventRecord|WebRTC|ONVIF|WHEP|WHIP|TURN|VLM|SSE|read-only|ops-only|viewer-safe|default-off|not-run|dry-run|raw|debug|credential|provider|without|기반|상태|경로|노출|수행|변경|자동|수동)$/i.test(value)) return false;
  return /(?:^[a-z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*$|^[A-Za-z][A-Za-z0-9]*_[A-Za-z0-9_]+$)/.test(value);
}

function extractNegativeBoundaries(pass) {
  const text = String(pass || '');
  // 한글 acceptance 문장은 positive save/render 절과 별도 non-exposure 경계를 함께 쓰기도 한다.
  // 이들 병렬 절을 가로질러 결속하면 실제 write가 잘못된 `no-write` 의무로 바뀐다.
  // 따라서 subject/negative pair는 각 semantic clause 안에서만 판정한다.
  // 병렬 절 밖의 token은 같은 outcome의 근거로 사용하지 않는다.
  const clauses = text.split(/(?:저장\s*흐름과|저장하고|반영되고|반영하며|표시되고)/);
  const negative = String.raw`(?:없이|않(?:음|는다|고|도록)?|금지|거부|차단|비노출|제외|false(?![-A-Za-z0-9_])|no[- ]|not[- ]|must not|without)`;
  const specs = [
    ['no-write', String.raw`(?:write|저장|registry write)`, ['write', 'WritePerformed', 'registryWrite']],
    ['no-send', String.raw`(?:send|delivery|발송|clientNoticeSent|sendPerformed)`, ['send', 'delivery', '발송', 'clientNoticeSent', 'sendPerformed']],
    ['no-mutation', String.raw`(?:mutation|schema 변경|payload 변경|media path 변경)`, ['mutation', 'Changed', '변경']],
    ['no-auto-apply', String.raw`(?:auto[- ]?apply|autoRuleApplied|automaticApplyPerformed|자동 적용)`, ['autoApply', 'autoRuleApplied', 'automaticApplyPerformed', '자동 적용']],
    ['raw-material-redaction', String.raw`(?:raw(?: JSON| material| evidence| locator)?|원문)`, ['raw', 'rawEvidence', 'rawJson', 'rawLocator']],
    ['source-url-redaction', String.raw`(?:source URL|sourceUrl|raw locator)`, ['sourceUrl', 'source URL', 'rawLocator']],
    ['credential-redaction', String.raw`(?:credential|자격 증명)`, ['credential', 'Credential']],
    ['debug-redaction', String.raw`(?:debug|디버그)`, ['debug', 'Debug']],
    ['client-viewer-boundary', String.raw`(?:client\/viewer|viewer client|client exposure|viewer exposure)`, ['viewerClientExposure', 'client', 'viewer']],
    ['provider-boundary', String.raw`(?:provider call|provider material|provider 호출|cloudProviderContacted|vlmProviderCalled|cloud provider API 호출)`, ['providerCall', 'providerMaterial', 'provider', 'cloudProviderContacted', 'vlmProviderCalled']],
  ];
  const boundaries = [];
  for (const [kind, subject, tokens] of specs) {
    const subjectThenNegative = new RegExp(`${subject}.{0,120}${negative}`, 'i');
    const negativeThenSubject = new RegExp(`${negative}.{0,120}${subject}`, 'i');
    if (clauses.some(clause => subjectThenNegative.test(clause) || negativeThenSubject.test(clause))) {
      boundaries.push({ kind, tokens });
    }
  }
  return boundaries;
}

export function review4ExplicitNegativeBoundaryEvidence(evidence, boundary) {
  return negativeOracleConditions(evidence).some(condition =>
    (boundary.tokens || []).some(token => conditionBindsNegativeToken(condition, token)));
}

export function review4ExplicitProductNegativeBoundaryEvidence(evidence, boundary) {
  const conditions = [];
  for (const line of String(evidence || '').split(/\r?\n/)) {
    const outsideStrings = stripStringLiteralContents(line);
    const comparisonPattern = /[A-Za-z_$][A-Za-z0-9_$]*(?:(?:\?\.|\.)[A-Za-z_$][A-Za-z0-9_$]*|\[[^\]\n]+\])*\s*(?:===|!==)\s*(?:false|true|0)\b/g;
    for (const match of line.matchAll(comparisonPattern)) {
      const expression = match[0];
      const offset = match.index || 0;
      const templateStart = line.lastIndexOf('${', offset);
      const templateEnd = templateStart >= 0 ? line.indexOf('}', offset + expression.length) : -1;
      if (!outsideStrings.includes(expression) && !(templateStart >= 0 && templateEnd >= 0)) continue;
      conditions.push({ expression, rejectsWhenTrue: false });
    }
  }
  return conditions.some(condition =>
    !selfDeclaredNegativeCondition(evidence, condition, boundary) &&
    (boundary.tokens || []).some(token => conditionBindsNegativeToken(condition, token)));
}

function selfDeclaredNegativeCondition(evidence, condition, boundary) {
  const expression = String(condition.expression || '');
  const executable = stripStringLiteralContents(evidence);
  const identifiers = [...expression.matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)].map(match => match[0]);
  return identifiers.some(identifier =>
    (boundary.tokens || []).some(token => identifier.toLowerCase().includes(String(token).toLowerCase())) &&
    (new RegExp(`\\b(?:const|let|var)\\s+${escapeRegExp(identifier)}\\s*=\\s*(?:false|true|0)\\b`).test(executable) ||
     new RegExp(`(?:^|[,{])\\s*${escapeRegExp(identifier)}\\s*:\\s*(?:false|true|0)\\b`, 'm').test(executable)));
}

function conditionBindsNegativeToken(condition, token) {
  const expression = String(condition.expression || '');
  const needle = String(token || '').toLowerCase();
  if (!needle) return false;
  let offset = expression.toLowerCase().indexOf(needle);
  while (offset >= 0) {
    const window = expression.slice(Math.max(0, offset - 180), Math.min(expression.length, offset + needle.length + 180));
    const operators = stripStringLiteralContents(window);
    if (/(?:===?|\bis)\s*false\b|!==?\s*true\b|\bnot\s+in\b|!\s*(?:\(|\[|[A-Za-z_$])|(?:===?|\bis)\s*0\b|\b(?:status|statusCode|httpCode|code)\b[^\n]{0,80}\b4\d\d\b/i.test(operators)) return true;
    if (condition.rejectsWhenTrue && /(?:\.includes\s*\(|\bhas\s*\(|\bin\b|(?:===?|\bis)\s*true\b)/i.test(operators)) return true;
    offset = expression.toLowerCase().indexOf(needle, offset + 1);
  }
  return false;
}

function negativeOracleConditions(evidence) {
  const text = String(evidence || '');
  const conditions = [];
  const callPattern = /\b(assert[A-Za-z0-9_]*|expect[A-Za-z0-9_]*|if)\s*\(/g;
  for (const match of text.matchAll(callPattern)) {
    const open = match.index + match[0].lastIndexOf('(');
    const close = matchingParenOffset(text, open);
    if (close < 0) continue;
    const name = match[1];
    const inner = text.slice(open + 1, close);
    const expression = name === 'if' ? inner : firstTopLevelArgument(inner);
    const tail = text.slice(close + 1, Math.min(text.length, close + 500));
    conditions.push({
      expression,
      rejectsWhenTrue: name === 'if' && /(?:\bthrow\b|\braise\b|process\.exit\s*\(\s*[1-9]|\bfail\s*\(|\bfail\s+["'])/i.test(stripStringLiteralContents(tail)),
    });
  }
  for (const match of text.matchAll(/^\s*assert\s+(?!\()(.+)$/gm)) {
    conditions.push({ expression: firstTopLevelArgument(match[1]), rejectsWhenTrue: false });
  }
  for (const match of text.matchAll(/^\s*expect_eq\s+(.+?)\s+["'](4\d\d)["']/gm)) {
    conditions.push({ expression: `${match[1]} statusCode ${match[2]}`, rejectsWhenTrue: false });
  }
  return conditions;
}

function matchingParenOffset(text, open) {
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = open; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) { escaped = false; continue; }
    if (quote) {
      if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '(') depth += 1;
    else if (char === ')' && --depth === 0) return index;
  }
  return -1;
}

function firstTopLevelArgument(text) {
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  let quote = '';
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) { escaped = false; continue; }
    if (quote) {
      if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '(') paren += 1;
    else if (char === ')') paren -= 1;
    else if (char === '[') bracket += 1;
    else if (char === ']') bracket -= 1;
    else if (char === '{') brace += 1;
    else if (char === '}') brace -= 1;
    else if (char === ',' && paren === 0 && bracket === 0 && brace === 0) return text.slice(0, index).trim();
  }
  return text.trim();
}

function stripStringLiteralContents(text) {
  let result = '';
  let quote = '';
  let escaped = false;
  for (const char of String(text || '')) {
    if (escaped) { escaped = false; continue; }
    if (quote) {
      if (char === '\\') escaped = true;
      else if (char === quote) { result += `${quote}${quote}`; quote = ''; }
      continue;
    }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    result += char;
  }
  return result;
}

function sharedNegativeConditionKey(item) {
  const conditions = negativeOracleConditions(item.roles?.readback?.anchor || '')
    .map(condition => condition.expression.trim().replace(/\s+/g, ' '));
  if (conditions.length === 0) return '';
  return sha256(stableStringify({
    stateFile: item.roles?.state?.file || '',
    stateSymbol: item.roles?.state?.symbol || '',
    stateAnchor: normalizeSemanticAnchor(item.roles?.state?.anchor || ''),
    readbackFile: item.roles?.readback?.file || '',
    conditions,
  }));
}

export function review4SelfDeclaredRuntimeReadback(rootDir, role, trust) {
  if (!rootDir || !role?.file) return false;
  if (trust?.enclosingBodyScope === 'file-fallback') return true;
  let fileText = '';
  try { fileText = fs.readFileSync(path.join(rootDir, role.file), 'utf8'); } catch { return false; }
  const body = bindingBodyText(rootDir, role, trust);
  const independentArtifactReadback = /\bfs\.writeFileSync\s*\(/.test(body) &&
    /\bfs\.readFileSync\s*\(/.test(body) && /\bJSON\.parse\s*\(/.test(body);
  if (/\bfs\.(?:readFileSync|readFile)\s*\([\s\S]{0,500}?["']test\/fixtures\//i.test(body) ||
      /\bfs\.(?:readFileSync|readFile)\s*\(\s*(?:path\.join\([^)]*,\s*)?fixture[A-Za-z0-9_$]*\s*[,)]/i.test(body)) return true;
  if (/\bfixture\.cases\.map\s*\(\s*(?:evaluate|derive)[A-Za-z0-9_$]*/.test(body) &&
      !/(?:\bcurl\b|\bfetch\s*\(|\brequestJson\s*\(|execFile|spawn\s*\(|browser\.)/.test(body)) return true;
  if (/loopback-fixture-only/.test(fileText) && /\bfixture\.cases\b/.test(fileText) && !independentArtifactReadback) return true;
  const anchor = String(role.anchor || '');
  const assertedEntities = new Map();
  for (const match of anchor.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:\?\.|\.)\s*([A-Za-z_$][A-Za-z0-9_$]*)/g)) {
    const [, root, field] = match;
    const literalObject = new RegExp(`\\b(?:const|let|var)\\s+${escapeRegExp(root)}\\s*=\\s*\\{[\\s\\S]{0,800}?\\b${escapeRegExp(field)}\\s*:\\s*(?:false|true|null|-?[0-9]+|["'\\x60])`);
    const fixtureAlias = new RegExp(`\\b(?:const|let|var)\\s+${escapeRegExp(root)}\\s*=\\s*(?:fixture|fixtures|caseData)\\b`);
    assertedEntities.set(root, literalObject.test(body) || fixtureAlias.test(body));
  }
  for (const match of anchor.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:===|!==|<=|>=|<|>)/g)) {
    if (/[.?]\s*$/.test(anchor.slice(0, match.index))) continue;
    const identifier = match[1];
    if (assertedEntities.has(identifier)) continue;
    assertedEntities.set(identifier,
      new RegExp(`\\b(?:const|let|var)\\s+${escapeRegExp(identifier)}\\s*=\\s*(?:false|true|null|-?[0-9]+|["'\\x60])`).test(body));
  }
  if (assertedEntities.size > 0 && [...assertedEntities.values()].every(Boolean)) return true;
  const reportFields = [...anchor.matchAll(/\breport(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*\.([A-Za-z_$][A-Za-z0-9_$]*)/g)]
    .map(match => match[1]);
  if (reportFields.length > 0 && !/(?:\bcurl\b|\bfetch\s*\(|\brequestJson\s*\(|execFile|spawn\s*\(|browser\.)/.test(body) &&
      reportFields.every(field => new RegExp(`\\b${escapeRegExp(field)}\\s*:\\s*(?:false|true|null|[0-9]+|["'])`).test(fileText))) return true;
  return false;
}

function semanticSourceCorpus(rootDir) {
  if (semanticSourceCorpusCache.has(rootDir)) return semanticSourceCorpusCache.get(rootDir);
  const files = [];
  for (const directory of ['src', 'include', 'config', 'scripts/internal']) {
    const absolute = path.join(rootDir, directory);
    if (!fs.existsSync(absolute)) continue;
    collectSourceFiles(absolute, files);
  }
  if (fs.existsSync(path.join(rootDir, 'server.sh'))) files.push(path.join(rootDir, 'server.sh'));
  const corpus = files.map(file => {
    try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
  }).join('\n');
  semanticSourceCorpusCache.set(rootDir, corpus);
  return corpus;
}

function collectSourceFiles(directory, out) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collectSourceFiles(absolute, out);
    else if (/\.(?:cpp|cc|c|h|hpp|mjs|js|sh|py|json)$/.test(entry.name)) out.push(absolute);
  }
}

function semanticToken(token) {
  const value = String(token || '').trim();
  if (value.length < 2 || value.length > 180) return false;
  return !/^(?:필요|비대상|안정화|확인|표시|적용|설정|검증|성공|실패|화면|목록|상세|조회|유지|일치|반영|관리|source|status|result|response|current|actual|pass|fail|true|false|ops|runtime|event|events|view|viewer|client|media|rule|profile|schema|payload|field|type|baseline|HTTP|HTTPS|JSON|UI|API|URI|CRUD|SHA|VA|GET|POST|PUT|PATCH|DELETE|S\d+|V\d+)$/i.test(value);
}

function roleTrustBinding(rootDir, locator) {
  if (!locator?.file || !Number.isInteger(locator.line)) throw new Error('REVIEW4 role locator incomplete');
  const absolute = path.resolve(rootDir, locator.file);
  const relative = path.relative(rootDir, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`REVIEW4 role escapes repository: ${locator.file}`);
  const text = fs.readFileSync(absolute, 'utf8');
  const lines = text.split(/\r?\n/);
  const body = enclosingBody(lines, locator);
  return {
    file: locator.file,
    symbol: locator.symbol,
    trackedBlobSha256: sha256(text),
    enclosingBodySha256: sha256(lines.slice(body.startLine - 1, body.endLine).join('\n')),
    enclosingBodyStartLine: body.startLine,
    enclosingBodyEndLine: body.endLine,
    enclosingBodyScope: body.scope,
  };
}

function enclosingBody(lines, locator) {
  const rawSymbol = String(locator.symbol || '');
  const semanticLabel = rawSymbol.includes(':') && !rawSymbol.includes('::');
  const bare = rawSymbol.split('::').pop();
  if (!semanticLabel && bare && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(bare)) {
    for (let index = Math.min(lines.length - 1, locator.line - 1); index >= 0; index -= 1) {
      if (!new RegExp(`\\b${escapeRegExp(bare)}\\b`).test(lines[index])) continue;
      const open = findOpeningBrace(lines, index, Math.min(lines.length - 1, index + 12));
      if (!open) continue;
      const endLine = matchingBraceLine(lines, open.line, open.column);
      if (endLine >= locator.line) return { startLine: index + 1, endLine, scope: 'declared-symbol' };
    }
  }
  for (let index = Math.min(lines.length - 1, locator.line - 1); index >= Math.max(0, locator.line - 1600); index -= 1) {
    if (!/(?:\b(?:async\s+)?function\b|=>\s*\{|^\s*(?:check|test|it)\s*\(|^\s*(?:function\s+)?[A-Za-z_][A-Za-z0-9_]*\s*\(\)\s*\{)/.test(lines[index])) continue;
    const open = findOpeningBrace(lines, index, Math.min(lines.length - 1, index + 12));
    if (!open) continue;
    const endLine = matchingBraceLine(lines, open.line, open.column);
    if (endLine >= locator.line) return { startLine: index + 1, endLine, scope: 'semantic-enclosing-function' };
  }
  for (let index = Math.min(lines.length - 1, locator.line - 1); index >= Math.max(0, locator.line - 1200); index -= 1) {
    for (let column = lines[index].length - 1; column >= 0; column -= 1) {
      if (lines[index][column] !== '{') continue;
      const endLine = matchingBraceLine(lines, index + 1, column);
      if (endLine >= locator.line) return { startLine: index + 1, endLine, scope: 'nearest-enclosing-block' };
    }
  }
  return { startLine: 1, endLine: lines.length, scope: 'file-fallback' };
}

function findOpeningBrace(lines, start, end) {
  const signature = lines.slice(start, end + 1).join('\n');
  const arrowDeclaration = !/\bfunction\b/.test(lines[start]) &&
    (lines[start].includes('=>') || /\b(?:const|let|var)\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*(?:async\s*)?\(/.test(lines[start]));
  const arrow = arrowDeclaration ? signature.indexOf('=>') : -1;
  if (arrow >= 0) {
    const brace = signature.indexOf('{', arrow + 2);
    if (brace >= 0) {
      const prefix = signature.slice(0, brace);
      const relativeLine = prefix.split('\n').length - 1;
      const lastBreak = prefix.lastIndexOf('\n');
      return { line: start + relativeLine + 1, column: brace - lastBreak - 1 };
    }
  }
  for (let index = start; index <= end; index += 1) {
    const column = index === start ? lines[index].lastIndexOf('{') : lines[index].indexOf('{');
    if (column >= 0) return { line: index + 1, column };
  }
  return null;
}

function matchingBraceLine(lines, startLine, startColumn) {
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let line = startLine; line <= lines.length; line += 1) {
    const text = lines[line - 1];
    for (let column = line === startLine ? startColumn : 0; column < text.length; column += 1) {
      const char = text[column];
      if (escaped) { escaped = false; continue; }
      if (quote) {
        if (char === '\\') escaped = true;
        else if (char === quote) quote = '';
        continue;
      }
      if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
      if (char === '{') depth += 1;
      else if (char === '}') {
        depth -= 1;
        if (depth === 0) return line;
      }
    }
  }
  return lines.length;
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortValue(value[key])]));
  }
  return value;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
