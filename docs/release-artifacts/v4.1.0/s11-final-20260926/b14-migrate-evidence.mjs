// 파일 용도: B14 한정 증거 정제를 수행한다. 제품·Git 이력은 수정하지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync, gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {sanitizeTranscript, publicTranscriptPath} from './b14-evidence-sanitizer.mjs';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const prefix = 'docs/release-artifacts/v4.1.0/';
const fail = code => {throw new Error(code);};
function canonical(file) {
  return typeof file === 'string' && !path.posix.isAbsolute(file) && !/[\\\0\r\n]/u.test(file) &&
    file.split('/').every(part => part && part !== '.' && part !== '..');
}
function read(root, file) {
  if (!canonical(file)) fail('B14_INVALID_RELATIVE_PATH');
  const target = path.resolve(root, file), stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink() || fs.realpathSync(target) !== target) fail('B14_UNSAFE_SOURCE');
  return fs.readFileSync(target);
}
function utf8(bytes) {
  const text = bytes.toString('utf8');
  if (bytes.includes(0) || !Buffer.from(text).equals(bytes)) fail('B14_INVALID_UTF8');
  return text;
}
export function rewriteMarkdownLinks(text, file, mapping) {
  return text.replace(/\]\((<?)([^\s)>]+)(>?)(\s+"[^"]*")?\)/gu, (whole, open, url, close, title = '') => {
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/)/iu.test(url)) return whole;
    const split = url.search(/[?#]/u), source = split < 0 ? url : url.slice(0, split), suffix = split < 0 ? '' : url.slice(split);
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), source));
    const replacement = mapping.get(resolved);
    if (!replacement) return whole;
    return `](${open}${path.posix.relative(path.posix.dirname(file), replacement)}${suffix}${close}${title})`;
  });
}
export function buildPlan(root, findings, tracked, policy) {
  root = fs.realpathSync(root);
  const sources = findings.deniedArtifacts.map(item => item.file);
  if (new Set(sources).size !== sources.length) fail('B14_DUPLICATE_SOURCE');
  const mapping = new Map(sources.map(file => [file, publicTranscriptPath(file)]));
  if (new Set(mapping.values()).size !== mapping.size) fail('B14_TARGET_COLLISION');
  const fingerprints = new Map(findings.affectedFileFingerprints.map(item => [item.file, item]));
  const selected = new Set([...sources, ...findings.contentFindings.map(item => item.file)]);
  for (const file of selected) {
    if (!file.startsWith(prefix) && file !== 'docs/release-test-records.md') fail('B14_OUTSIDE_APPROVED_CONTENT');
  }
  for (const file of tracked.filter(file => file.endsWith('.md'))) selected.add(file);
  const consumer = 'scripts/internal/recording_current_longrun_diagnostics.test.mjs';
  if (tracked.includes(consumer)) selected.add(consumer);
  const entries = [];
  for (const file of selected) {
    const original = read(root, file), target = mapping.get(file) ?? file, moved = target !== file;
    if (moved) {
      const expected = fingerprints.get(file);
      if (!expected || expected.bytes !== original.length || expected.sha256 !== digest(original)) fail('B14_ORIGINAL_CHANGED');
      if (fs.existsSync(path.join(root, target))) fail('B14_TARGET_EXISTS');
    }
    const plain = moved && file.endsWith('.gz') ? gunzipSync(original) : original;
    let text = utf8(plain), counts = {home: 0, temp: 0};
    if (findings.contentFindings.some(item => item.file === file) || moved) {
      const sanitized = sanitizeTranscript(text, policy); text = sanitized.text; counts = sanitized.counts;
    }
    const beforeLinks = text;
    if (file.endsWith('.md')) text = rewriteMarkdownLinks(text, file, mapping);
    if (file === consumer) {
      const old = 'docs/release-artifacts/v4.1.0/s11-recording-ui-20260923/recording-120-attempt3.log';
      const next = mapping.get(old);
      if (!next || text.split(old).length !== 2) fail('B14_CONSUMER_REFERENCE_MISMATCH');
      text = text.replace(old, next);
    }
    if (file.endsWith('.json')) { JSON.parse(utf8(plain)); JSON.parse(text); }
    if (file.endsWith('.jsonl')) for (const line of text.split('\n').filter(Boolean)) JSON.parse(line);
    const published = Buffer.from(text);
    if (!moved && original.equals(published)) continue;
    entries.push({source:file, target, moved, original, published, counts, referenceChanged:beforeLinks !== text});
  }
  return entries;
}
export function receiptFor(entries, sourceCommit) {
  return {schema:'media-server.public-evidence-migration.v1', sourceCommit,
    meaning:'original은 이행 전 원본, published는 경로 정제·현재 참조 보완 후 파일이다. 기존 manifest raw/source 해시는 역사적 원본이며 이 영수증으로 현재 배포본을 찾는다. 과거 PASS/FAIL 승격 없음.',
    entries:entries.map(e => ({source:e.source,published:e.target,moved:e.moved,
      originalBytes:e.original.length,originalSha256:digest(e.original),
      publishedBytes:e.published.length,publishedSha256:digest(e.published),
      replacements:e.counts,referenceChanged:e.referenceChanged}))};
}
export function applyPlan(root, entries, receiptPath, sourceCommit) {
  root = fs.realpathSync(root);
  if (!canonical(receiptPath) || !receiptPath.startsWith(prefix) || fs.existsSync(path.join(root, receiptPath))) fail('B14_INVALID_RECEIPT_TARGET');
  // 쓰기 전 전체 원본·목적지를 다시 확인한다. 실패하면 원본을 지우지 않는다.
  for (const e of entries) {
    if (!read(root,e.source).equals(e.original)) fail('B14_PLAN_SOURCE_CHANGED');
    if (e.moved && fs.existsSync(path.join(root,e.target))) fail('B14_TARGET_EXISTS');
  }
  const receipt = receiptFor(entries,sourceCommit);
  for (const e of entries.filter(e => e.moved)) {
    fs.writeFileSync(path.join(root,e.target),e.published,{flag:'wx',mode:0o644});
    if (!read(root,e.target).equals(e.published)) fail('B14_TARGET_VERIFY_FAILED');
  }
  fs.writeFileSync(path.join(root,receiptPath),gzipSync(JSON.stringify(receipt,null,2)+'\n'),{flag:'wx',mode:0o644});
  if (JSON.stringify(JSON.parse(gunzipSync(read(root,receiptPath)))) !== JSON.stringify(receipt)) fail('B14_RECEIPT_VERIFY_FAILED');
  for (const e of entries.filter(e => !e.moved)) {
    if (!read(root,e.source).equals(e.original)) fail('B14_PLAN_SOURCE_CHANGED');
    fs.writeFileSync(path.join(root,e.target),e.published);
    if (!read(root,e.target).equals(e.published)) fail('B14_TARGET_VERIFY_FAILED');
  }
  for (const e of entries.filter(e => e.moved)) {
    if (!read(root,e.source).equals(e.original) || !read(root,e.target).equals(e.published)) fail('B14_DELETE_PRECONDITION_FAILED');
    fs.unlinkSync(path.join(root,e.source));
    if (fs.existsSync(path.join(root,e.source))) fail('B14_DELETE_VERIFY_FAILED');
  }
  return receipt;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const mode = process.argv[2];
    if (!['--plan','--apply'].includes(mode) || process.argv.length !== 3) fail('B14_INVALID_MODE');
    const root = fs.realpathSync(process.cwd());
    const base = `${prefix}s11-final-20260926/`;
    const findings = JSON.parse(gunzipSync(read(root,`${base}b13-public-readiness.json.gz`))).findings;
    if (findings.deniedArtifacts.length !== 960) fail('B14_BASELINE_COUNT_MISMATCH');
    const tracked = execFileSync('git',['ls-files','-z'],{cwd:root,maxBuffer:8*1024*1024}).toString().split('\0').filter(Boolean);
    const policy = JSON.parse(read(root,'config/public_repo_policy.json'));
    const entries = buildPlan(root,findings,tracked,policy);
    const sourceCommit = execFileSync('git',['rev-parse','HEAD'],{cwd:root}).toString().trim();
    if (mode === '--apply') applyPlan(root,entries,`${base}b14-migration-receipt.json.gz`,sourceCommit);
    console.log(JSON.stringify({mode,sourceCommit,files:entries.length,moved:entries.filter(e=>e.moved).length,
      inPlace:entries.filter(e=>!e.moved).length,home:entries.reduce((n,e)=>n+e.counts.home,0),temp:entries.reduce((n,e)=>n+e.counts.temp,0)}));
  } catch (error) {
    console.error(/^B14_[A-Z_]+$/.test(error.message) ? error.message : 'B14_MIGRATION_FAILED');
    process.exitCode=1;
  }
}
