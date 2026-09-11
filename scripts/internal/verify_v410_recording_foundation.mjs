#!/usr/bin/env node
// 파일 용도: 실제 앱 API 검증. 공개 UI·auth·장시간 검증을 대체하지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {credentials, requestOptions, redactSecrets, timelineScope, coverageComplete, sourceRegistryIds, scopedSourceMatch} from './recording_foundation_auth_helpers.mjs';
import {FoundationObserver,collectProcess,observationCompleted} from './recording_foundation_observer.mjs';
import {RecordingJournalReader} from './recording_journal_reader.mjs';
import {LongrunProgress,parseLongrunArgs,sampleContinuity,nextRecordingSettings,mediaAbsent} from './recording_longrun_progress.mjs';
import {summarizeRecordingObservations} from './recording_longrun_summary.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mode = process.argv[2] || '--all';
let passed = 0, failed = 0, root, capFailure;
let authPasswords;
const authSecrets = [], authMediaRefs = new Map(), actualSourceIds = new Set();
const authMode = mode === '--app-auth';
const longrunMode = mode === '--app-longrun';
const observeMode = mode === '--app-observe' || longrunMode;
let longrunResult, longrunSummary;
const longrunSamples=[];
const monotonicStart=performance.now();
let observer, observerPid=null, observerTimer, observerFinal;
function observationError(error) {
  capFailure ||= `observer: ${error.message}`;
}
async function observeTick() {
  if(!observerPid)return;
  try {
    const sample=await observer.tick(observerPid);
    if(sample){
      if(longrunMode){
        if(longrunSamples.length>=10000)throw Error('longrun-sample-limit');
        longrunSamples.push({...sample,phaseAt:performance.now()});
      }
      console.log(`[observation-sample] ${JSON.stringify(sample)}`);
    }
  } catch(error){observationError(error);}
}
let authAttempted = false, authSuiteCompleted = false;
const authRequired = ['bootstrap', 'restart-login', 'continuous', 'fallback', 'derived', 'restart-continuous', 'restart-fallback', 'restart-derived'];
const authCompleted = new Set();
const authCaseCompleted = new Set();
const authCaseRequired = ['AP10-B accounts bootstrapped through product API', 'AP10-B restart relogin without setup',
  'AP10-F independent initial source IDs', 'AP10-F successful POST identity', 'AP10-F restart source IDs exact'];
for (const kind of authRequired.slice(2)) {
  authCaseRequired.push(`AP10-C ${kind} six byte fixture prefix`);
  for (const i of [0, 1]) authCaseRequired.push(`AP10-C ${kind} principal${i} literal Range206`);
  for (const label of ['unauth', 'other-channel', 'viewer', 'no-ops']) {
    authCaseRequired.push(`AP10-D ${kind} ${label} media denied`, `AP10-D ${kind} ${label} no sensitive media response`);
  }
  authCaseRequired.push(`AP10-D ${kind} other-channel known nonexistent indistinguishable`);
  for (const [label, status] of [['admin',200], ['allowed',200], ['unauth',401], ['other-channel',403], ['viewer',403], ['no-ops',403]])
    authCaseRequired.push(`AP10-D ${kind} ${label} timeline${status}`);
  for (const label of ['admin', 'allowed']) authCaseRequired.push(`AP10-D ${kind} ${label} timeline channel scope`);
  authCaseRequired.push(`AP10-E ${kind} unauth status401`);
  for (let i = 0; i < 5; i++) {
    authCaseRequired.push(`AP10-E ${kind} status principal${i}`, `AP10-E ${kind} status redaction principal${i}`);
    if (i < 3) authCaseRequired.push(`AP10-E ${kind} exact scope channels principal${i}`);
    if (i > 0 && i < 3) authCaseRequired.push(`AP10-E ${kind} no global observations principal${i}`);
  }
}
const safeText = text => redactSecrets(text, authSecrets);
const start = Date.now(), processes = [], ports = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MiB = 1024 * 1024;
const check = (ok, label, detail = '') => {
  console.log(safeText(`[${ok ? 'pass' : 'fail'}] ${label}${detail ? ` | ${detail}` : ''}`));
  ok ? passed++ : failed++;
  if (ok && label.startsWith('AP10-')) authCaseCompleted.add(label);
  return !!ok;
};
function must(ok, label, detail = '') {
  if (!check(ok, label, detail)) throw Object.assign(Error(label), {recorded: true});
}
function bytes(target) {
  try {
    const st = fs.lstatSync(target);
    return st.isDirectory() ? fs.readdirSync(target).reduce((n, x) => n + bytes(path.join(target, x)), 0) : st.size;
  } catch (e) {
    if (e.code === 'ENOENT') return 0;
    throw e;
  }
}
function hash(file) {
  const h = crypto.createHash('sha256'), fd = fs.openSync(file, 'r');
  const chunk = Buffer.alloc(65536);
  try {
    let n;
    while ((n = fs.readSync(fd, chunk, 0, chunk.length, null))) h.update(chunk.subarray(0, n));
    return h.digest('hex');
  } finally { fs.closeSync(fd); }
}
function relativeMedia(rel) {
  const base = path.join(root, 'recordings'), p = path.resolve(base, rel);
  if (!p.startsWith(base + path.sep)) throw Error('media path escaped isolated archive');
  return p;
}
function jsonl(file) {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, 'utf8');
  return text.slice(0, text.lastIndexOf('\n') + 1).split('\n').filter(Boolean).map(JSON.parse);
}
function journal() { return jsonl(path.join(root, 'recordings/recording-mutations.jsonl')); }
function state() {
  const segments = new Map(), links = new Map(), observations = new Map(), tombstones = new Map();
  const rows = journal();
  for (const row of rows) {
    const p = row.payload;
    if (row.mutationType === 'segment_finalized' && !segments.has(row.entityId))
      segments.set(row.entityId, {...p.segment, mediaRelpath: p.mediaRelpath});
    if (p.link) links.set(p.link.event_id, p.link);
    if (p.observation) observations.set(row.entityId, p.observation);
    if (p.tombstone) tombstones.set(row.entityId, p.tombstone);
  }
  return {rows, segments, links, observations, tombstones};
}
function oldest(rows) {
  return [...rows].sort((a, b) => a.end.utc_ms - b.end.utc_ms || a.segment_id.localeCompare(b.segment_id));
}
function rangeMatches(body, expected, contentRange, size) {
  return contentRange === `bytes 2-5/${size}` && body.equals(expected.subarray(2, 6));
}
function priorityMatches(item, kind) {
  return item?.kind === kind && item.displayPriority === (kind === 'event' ? 200 : 100);
}
function uniqueIds(rows) { return new Set(rows.map(x => x.mutationId)).size === rows.length; }
async function port() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const value = server.address().port;
  await new Promise(resolve => server.close(resolve));
  ports.push(value);
  return value;
}
async function portClosed(value) {
  return new Promise(resolve => {
    const socket = net.connect(value, '127.0.0.1');
    socket.setTimeout(500, () => { socket.destroy(); resolve(false); });
    socket.once('connect', () => { socket.destroy(); resolve(false); });
    socket.once('error', e => resolve(e.code === 'ECONNREFUSED'));
  });
}
function environment(rp = 0, hp = 0) {
  const env = {PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: path.join(root, 'tmp')};
  for (const k of ['USER', 'LOGNAME', 'LANG', 'LC_ALL', 'GST_PLUGIN_PATH', 'GST_PLUGIN_SYSTEM_PATH', 'GST_PLUGIN_SCANNER',
    'GST_PLUGIN_PATH_1_0', 'GST_PLUGIN_SYSTEM_PATH_1_0', 'GST_PLUGIN_SCANNER_1_0', 'DYLD_LIBRARY_PATH', 'DYLD_FALLBACK_LIBRARY_PATH', 'GI_TYPELIB_PATH'])
    if (process.env[k] !== undefined) env[k] = process.env[k];
  const values = {
    AUTH_MODE: authMode ? 'auto' : 'off', ENABLE_AI: '1', ENABLE_OPS: '1', ENABLE_CLIENT: '1', ENABLE_LAB: '1',
    LISTEN_ADDRESS: '127.0.0.1', HTTP_LISTEN_ADDRESS: '127.0.0.1',
    LISTEN_PORT: String(rp), HTTP_LISTEN_PORT: String(hp), FORCE_RTSP_TCP: '1',
    FILE_ROOT: path.join(root, 'input'), DEFAULT_FILE: path.join(root, 'input/identity.mp4'),
    STATE_DIR: path.join(root, 'data'), AUTH_USERS_FILE: path.join(root, 'data/users.json'),
    SOURCE_REGISTRY: path.join(root, 'data/sources.json'), PUBLISHED_VIEWS: path.join(root, 'data/views.json'),
    ANALYSIS_REGISTRY: path.join(root, 'data/analysis.json'),
    ANALYSIS_MODEL: path.join(repo, 'models/yolo11n.onnx'), ANALYSIS_LABELS: path.join(repo, 'models/coco.names'),
    ANALYSIS_DETECTOR: 'yolo', ANALYSIS_FPS: '8', ANALYSIS_CONFIDENCE: '0.25', ANALYSIS_ADAPTIVE: '0',
    ANALYSIS_EVENT_STORAGE_ENABLED: '1', ANALYSIS_EVENT_STORAGE_PATH: path.join(root, 'events/events.jsonl'),
    ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED: '0', ANALYSIS_EVENT_SNAPSHOT_DIR: path.join(root, 'events/snapshots'),
    ANALYSIS_EVENT_CLIP_HOOK_ENABLED: '1', ANALYSIS_EVENT_CLIP_DIR: path.join(root, 'events/clips'),
    ANALYSIS_EVENT_PRE_EVENT_MS: '500', ANALYSIS_EVENT_POST_EVENT_MS: '500',
    ANALYSIS_EVENT_CLIP_BUFFER_MS: '3000', ANALYSIS_EVENT_POST_ENABLED: '0',
    RECORDING_ENABLED: '1', RECORDING_STORAGE_ROOT: path.join(root, 'recordings'),
    RECORDING_SEGMENT_DURATION_SECONDS: '1', RECORDING_RESERVED_FREE_BYTES: '0',
    RECORDING_RETENTION_INTERVAL_MS: '1000', GST_CACHE_DIR: path.join(root, 'gst-cache'), GST_PLUGIN_PROFILE: 'headless'
  };
  for (const [key, value] of Object.entries(values)) env[`MEDIA_SERVER_${key}`] = value;
  env.GST_REGISTRY = env.GST_REGISTRY_1_0 = path.join(root, 'gst-registry.bin');
  return env;
}
function own(exe, args, env, label) {
  const child = spawn(exe, args, {cwd: root, env, detached: true, stdio: ['ignore', 'pipe', 'pipe']});
  const item = {child, label, closed: false, logs: '', error: null};
  item.done = new Promise(resolve => child.once('close', () => { item.closed = true; resolve(); }));
  child.on('error', e => { item.error = e; });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => {
    if (item.logs.length + chunk.length > 4 * MiB) {
      item.error = Error(`${label} log limit exceeded`);
      signal(item, 'SIGTERM');
    } else item.logs += chunk;
  });
  processes.push(item);
  return item;
}
function signal(item, name) {
  if (!item.closed && item.child.pid) {
    try { process.kill(-item.child.pid, name); }
    catch (e) { if (e.code !== 'ESRCH') throw e; }
  }
}
async function stop(item, expectZero = true) {
  if(observer&&observerPid===item.child.pid){
    observerPid=null;
    try{await observer.pause();}catch(error){observationError(error);}
  }
  if (!item.closed) {
    signal(item, 'SIGTERM');
    await Promise.race([item.done, sleep(7000)]);
  }
  if (!item.closed) {
    signal(item, 'SIGKILL');
    await Promise.race([item.done, sleep(2000)]);
    throw Error(`${item.label} graceful shutdown timeout; closed=${item.closed}`);
  }
  if (expectZero) must(item.child.exitCode === 0, `AP12 ${item.label} exit0`, `exit=${item.child.exitCode} signal=${item.child.signalCode}`);
}
async function waitFor(label, predicate, limit = 20000) {
  const until = Date.now() + limit;
  while (Date.now() < until) {
    if (capFailure) throw Error(capFailure);
    for (const p of processes) if (p.error) throw p.error;
    const value = await predicate();
    if (value) return value;
    await sleep(100);
  }
  throw Error(`timeout: ${label}`);
}
async function launch() {
  const rp = await port(), hp = await port();
  must(rp !== hp, 'AP12 distinct loopback ports');
  const item = own(path.join(repo, 'build-gst-onnx/media_server'), [], environment(rp, hp), `app${processes.length}`);
  item.base = `http://127.0.0.1:${hp}`;
  await waitFor('HTTP health', async () => {
    if (item.closed) throw Error(`app exited ${item.child.exitCode}: ${item.logs.slice(-3000)}`);
    try { return (await appFetch(item, '/health', {signal: AbortSignal.timeout(500)}, null)).ok; }
    catch { return false; }
  });
  check(true, 'AP12 actual foreground healthy', `pid=${item.child.pid} cwd=${root}`);
  if (authMode) {
    await setupAuth(item);
    const observed = sourceRegistryIds(await request(item, 'GET', '/ops/api/sources'));
    if (processes.length === 1) {
      for (const id of observed) actualSourceIds.add(id);
      must(true, 'AP10-F independent initial source IDs', `ids=${JSON.stringify(observed)}`);
    } else {
      must(scopedSourceMatch([...actualSourceIds], observed), 'AP10-F restart source IDs exact',
        `expected=${JSON.stringify([...actualSourceIds].sort())} observed=${JSON.stringify(observed)}`);
    }
  }
  if(observeMode){observerPid=item.child.pid;await observeTick();if(capFailure)throw Error(capFailure);}
  return item;
}
function appFetch(app, route, options = {}, cookie = app.cookie) {
  return fetch(app.base + route, requestOptions(cookie, options));
}
const authUsers = [
  {username:'s09-channel', role:'operator', scopes:['ops:read', 'source:read:9101']},
  {username:'s09-other', role:'operator', scopes:['ops:read', 'source:read:9201']},
  {username:'s09-viewer', role:'viewer', scopes:['view:read:9101']},
  {username:'s09-no-ops', role:'operator', scopes:['source:read:9101']}
];
async function setupAuth(app) {
  authAttempted = true;
  const form = (route, body) => appFetch(app, route, {method:'POST', body:new URLSearchParams(body), signal:AbortSignal.timeout(5000)}, null);
  const usersFile = path.join(root, 'data/users.json');
  const bootstrap = !fs.existsSync(usersFile);
  if (bootstrap) {
    const response = await form('/setup', {username:'admin', password:authPasswords[0], confirm:authPasswords[0]});
    await response.arrayBuffer();
    must(response.status === 302, 'AP10-B production setup', `status=${response.status}`);
  }
  const login = async (username, password) => {
    const response = await form('/login', {username, password});
    const cookie = response.headers.getSetCookie().map(x => x.split(';', 1)[0]).join('; ');
    authSecrets.push(cookie, ...cookie.split('; ').map(x => x.slice(x.indexOf('=') + 1)));
    await response.arrayBuffer();
    must(response.status === 302 && cookie.length > 0, 'AP10-B production login', `status=${response.status}`);
    return cookie;
  };
  app.cookie = await login('admin', authPasswords[0]);
  app.authCookies = [app.cookie];
  for (const [i, user] of authUsers.entries()) {
    if (bootstrap) await request(app, 'POST', '/ops/api/users', {...user, displayName:user.username,
      password:authPasswords[i + 1], enabled:true, mustChangePassword:false});
    app.authCookies.push(await login(user.username, authPasswords[i + 1]));
  }
  const store = fs.readFileSync(usersFile, 'utf8');
  must(authPasswords.every(p => !store.includes(p)), 'AP10-B isolated users no plaintext credential');
  check(true, bootstrap ? 'AP10-B accounts bootstrapped through product API' : 'AP10-B restart relogin without setup');
  authCompleted.add(bootstrap ? 'bootstrap' : 'restart-login');
}
function authBodySafe(body) {
  return !/passwordHash|passwordHistory|tokenHash|mediaRelpath|absolutePath|"(?:password|token|session|cookie|sourceUrl)"\s*:/i.test(body) &&
    !body.includes(root) && !body.includes('file::') && authSecrets.every(x => !x || !body.includes(x));
}
async function authStatus(app, phase) {
  const unauth = await appFetch(app, '/ops/api/recordings/status', {signal:AbortSignal.timeout(4000)}, null);
  must(unauth.status === 401 && authBodySafe(await unauth.text()), `AP10-E ${phase} unauth status401`);
  for (let i = 0; i < app.authCookies.length; i++) {
    const response = await appFetch(app, '/ops/api/recordings/status', {signal:AbortSignal.timeout(4000)}, app.authCookies[i]);
    const body = await response.text();
    must(response.status === (i < 3 ? 200 : 403), `AP10-E ${phase} status principal${i}`, `status=${response.status}`);
    must(authBodySafe(body), `AP10-E ${phase} status redaction principal${i}`);
    if (response.status === 200) {
      const value = JSON.parse(body);
      const scope = i === 0 ? null : (i === 1 ? '9101' : '9201');
      const expected = [...actualSourceIds].filter(id => scope === null || id === scope).sort();
      const observed = Array.isArray(value.channels) ? value.channels.map(c => c?.channelId) : null;
      const safeObserved = observed?.map(id => typeof id === 'string' && /^[0-9]+$/.test(id) ? id : '[invalid-id]');
      must(scopedSourceMatch([...actualSourceIds], observed, scope),
        `AP10-E ${phase} exact scope channels principal${i}`,
        `expected=${JSON.stringify(expected)} observed=${JSON.stringify(safeObserved ?? null)}`);
      if (i !== 0) must(!Object.hasOwn(value, 'observations'), `AP10-E ${phase} no global observations principal${i}`);
    }
  }
}
async function authMedia(app, item, file, kind) {
  authMediaRefs.set(item.segmentId, {item, file, kind});
  const expected = Buffer.alloc(6), size = fs.statSync(file).size;
  const fd = fs.openSync(file, 'r');
  try { must(fs.readSync(fd, expected, 0, 6, 0) === 6, `AP10-C ${kind} six byte fixture prefix`); }
  finally { fs.closeSync(fd); }
  for (const i of [0, 1]) {
    const response = await appFetch(app, item.playbackUrl, {headers:{Range:'bytes=2-5'}, signal:AbortSignal.timeout(4000)}, app.authCookies[i]);
    const body = Buffer.from(await response.arrayBuffer());
    must(response.status === 206 && rangeMatches(body, expected, response.headers.get('content-range'), size),
      `AP10-C ${kind} principal${i} literal Range206`);
  }
  let deniedKnown;
  for (const [label, cookie, expectedStatus] of [['unauth', null, 401], ['other-channel', app.authCookies[2], 404],
    ['viewer', app.authCookies[3], 403], ['no-ops', app.authCookies[4], 403]]) {
    const response = await appFetch(app, item.playbackUrl, {headers:{Range:'bytes=2-5'}, signal:AbortSignal.timeout(4000)}, cookie);
    const body = await response.text();
    must(response.status === expectedStatus, `AP10-D ${kind} ${label} media denied`, `status=${response.status}`);
    must(authBodySafe(body) && !response.headers.has('content-range'), `AP10-D ${kind} ${label} no sensitive media response`);
    if (label === 'other-channel') deniedKnown = {status:response.status, body, type:response.headers.get('content-type')};
  }
  const unknown = await appFetch(app, '/ops/api/recordings/media/s09-nonexistent-media-id',
    {headers:{Range:'bytes=2-5'}, signal:AbortSignal.timeout(4000)}, app.authCookies[2]);
  const unknownBody = await unknown.text();
  must(unknown.status === deniedKnown.status && unknownBody === deniedKnown.body &&
    unknown.headers.get('content-type') === deniedKnown.type && !unknown.headers.has('content-range'),
    `AP10-D ${kind} other-channel known nonexistent indistinguishable`);
  const timelineRoute = `/ops/api/recordings/timeline?channelId=9101&startTimeMs=${item.startTimeMs}&endTimeMs=${item.endTimeMs}`;
  for (const [label, cookie, status] of [['admin', app.authCookies[0], 200], ['allowed', app.authCookies[1], 200],
    ['unauth', null, 401], ['other-channel', app.authCookies[2], 403], ['viewer', app.authCookies[3], 403], ['no-ops', app.authCookies[4], 403]]) {
    const response = await appFetch(app, timelineRoute, {signal:AbortSignal.timeout(4000)}, cookie);
    const body = await response.text();
    must(response.status === status && authBodySafe(body), `AP10-D ${kind} ${label} timeline${status}`);
    if (status === 200) {
      const timeline = JSON.parse(body);
      must(timelineScope(timeline, '9101'),
        `AP10-D ${kind} ${label} timeline channel scope`);
    }
  }
  await authStatus(app, kind);
  authCompleted.add(kind);
}
async function request(app, method, route, body) {
  const response = await appFetch(app, route, {
    method, headers: body ? {'Content-Type': 'application/json'} : {},
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(4000)
  });
  const text = await response.text();
  must(response.ok, `${method} ${route}`, `status=${response.status}`);
  const value = text ? JSON.parse(text) : {};
  if (method === 'POST' && route === '/ops/api/sources' && body?.sourceId) {
    if (authMode) {
      const ids = sourceRegistryIds({sources: [value.source]});
      must(ids[0] === body.sourceId && !actualSourceIds.has(ids[0]), 'AP10-F successful POST identity');
      actualSourceIds.add(ids[0]);
    } else actualSourceIds.add(body.sourceId);
  }
  return value;
}

function negatives() {
  const media = Buffer.from('0123456789');
  must(rangeMatches(Buffer.from('2345'), media, 'bytes 2-5/10', 10), 'AP11 literal Range valid');
  must(!rangeMatches(Buffer.from('3456'), media, 'bytes 2-5/10', 10), 'AP11 wrong Range bytes rejected');
  must(!rangeMatches(Buffer.from('2345'), media, 'bytes 3-6/10', 10), 'AP11 wrong Content-Range rejected');
  const rows = [{segment_id: 'b', end: {utc_ms: 2}}, {segment_id: 'c', end: {utc_ms: 1}}, {segment_id: 'a', end: {utc_ms: 1}}];
  must(oldest(rows).map(x => x.segment_id).join(',') === 'a,c,b', 'AP11 independent oldest tie order');
  must(uniqueIds([{mutationId: 'a'}, {mutationId: 'b'}]), 'AP11 actual restart predicate accepts unique IDs');
  must(!uniqueIds([{mutationId: 'a'}, {mutationId: 'a'}]), 'AP11 actual restart predicate rejects duplicate IDs');
  must(priorityMatches({kind: 'event', displayPriority: 200}, 'event') && priorityMatches({kind: 'continuous', displayPriority: 100}, 'continuous'), 'AP11 actual timeline predicate accepts priority');
  must(!priorityMatches({kind: 'event', displayPriority: 100}, 'event') && !priorityMatches({kind: 'continuous', displayPriority: 200}, 'continuous'), 'AP11 actual timeline predicate rejects inversion');
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'media-server-s09-fallback-oracle-')));
  fs.mkdirSync(path.join(root, 'events/clips'), {recursive: true});
  const file = path.join(root, 'events/clips/media.webm'), manifestPath = path.join(root, 'events/clips/manifest.json');
  fs.writeFileSync(file, '0123456789');
  const valid = {schema: 'media-server.va.event-clip-hook.v1', eventId: 'oracle-event', encodedClip: {
    schema: 'media-server.encoded-event-clip-contract.v1', status: 'completed', format: 'webm',
    contentType: 'video/webm', codec: 'vp8', byteSize: 10, mediaPath: file}};
  const link = {event_id: 'oracle-event', fallback_media_locator: manifestPath};
  fs.writeFileSync(manifestPath, JSON.stringify(valid));
  must(fallbackMedia(link).file === file, 'AP05 shared selector returns encoded media not manifest');
  for (const [field, value] of [['schema', 'wrong'], ['status', 'failed'], ['contentType', 'application/json'],
    ['byteSize', 11], ['mediaPath', path.join(root, 'escape.webm')]]) {
    fs.writeFileSync(manifestPath, JSON.stringify({...valid, encodedClip: {...valid.encodedClip, [field]: value}}));
    let rejected = false;
    try { fallbackMedia(link); } catch { rejected = true; }
    must(rejected, `AP05 shared selector rejects encoded ${field}`);
  }
}

function source(id, file, quota = 256 * MiB, revision = 1) {
  return {sourceId: id, displayName: `S09 isolated ${id}`, kind: 'file', file, enabled: true,
    recording: {enabled: true, continuousMaxBytes: quota, eventMaxBytes: 256 * MiB,
      continuousMaxAgeMs: 3600000, eventMaxAgeMs: 3600000, revision}};
}
function rule(id = '9101') {
  return {id, priority: 100, enabled: true,
    match: {sourceKind: 'file', route: 'http'}, analysis: {classes: ['person']},
    event: {type: 'presence', minConfidence: 0.25,
      region: {type: 'polygon', points: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}]}},
    eventActions: {highlight: {enabled: true, mode: 'blink', target: 'matched-object', durationMs: 1500, color: '#00ff00'},
      post: {enabled: false, method: 'POST', url: '', payloadFormat: 'media-server.va.event.v1'}}};
}
function continuous(channel) {
  const s = state();
  return [...s.segments.values()].filter(x => x.channel_id === channel && x.retention_class === 'continuous' && !s.tombstones.has(x.segment_id));
}
function validateSegment(s) {
  const file = relativeMedia(s.mediaRelpath);
  must(s.schema === 'media-server.recording-segment.v1' && s.stream_epoch_id && s.source_id === s.channel_id,
    `AP01 V1 identity ${s.segment_id}`);
  must(s.start.utc_ms > 0 && s.end.utc_ms > s.start.utc_ms && s.end.pts > s.start.pts && s.start.time_base_num > 0 && s.start.time_base_den > 0,
    `AP01 positive UTC/PTS ${s.segment_id}`);
  must(fs.statSync(file).size === s.size_bytes && hash(file) === s.checksum_sha256,
    `AP01 actual bytes SHA ${s.segment_id}`, `bytes=${s.size_bytes} sha256=${s.checksum_sha256}`);
}
async function timeline(app, link) {
  const r = link.requested_range;
  return request(app, 'GET', `/ops/api/recordings/timeline?channelId=9101&startTimeMs=${r.start_ms - 1000}&endTimeMs=${r.end_ms + 1000}`);
}
async function range(app, item, file, kind) {
  must(item.playable && item.playbackUrl.startsWith('/ops/api/recordings/media/'), `AP05 ${kind} playable local URL`);
  const response = await appFetch(app, item.playbackUrl, {headers: {Range: 'bytes=2-5'}, signal: AbortSignal.timeout(4000)});
  const actual = Buffer.from(await response.arrayBuffer());
  const expected = Buffer.alloc(6), fd = fs.openSync(file, 'r');
  try { must(fs.readSync(fd, expected, 0, 6, 0) === 6, `AP05 ${kind} actual file prefix`); }
  finally { fs.closeSync(fd); }
  const size = fs.statSync(file).size;
  must(response.status === 206 && rangeMatches(actual, expected, response.headers.get('content-range'), size),
    `AP05 ${kind} literal GET Range`, `status=${response.status} contentRange=${response.headers.get('content-range')} bodyHex=${actual.toString('hex')}`);
}
function fallbackMedia(link) {
  const clipRoot = path.join(root, 'events/clips') + path.sep;
  const manifestPath = path.resolve(link.fallback_media_locator);
  if (!manifestPath.startsWith(clipRoot)) throw Error('fallback manifest outside isolated clip root');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const encoded = manifest.encodedClip;
  if (manifest.schema !== 'media-server.va.event-clip-hook.v1' || manifest.eventId !== link.event_id ||
      encoded?.schema !== 'media-server.encoded-event-clip-contract.v1' || encoded.status !== 'completed' ||
      encoded.format !== 'webm' || encoded.contentType !== 'video/webm' || !['vp8', 'vp9'].includes(encoded.codec) ||
      typeof encoded.mediaPath !== 'string' || !Number.isSafeInteger(encoded.byteSize) || encoded.byteSize <= 0)
    throw Error('fallback manifest/encodedClip is not completed real WebM');
  const file = path.resolve(encoded.mediaPath);
  if (!file.startsWith(clipRoot) || !fs.lstatSync(file).isFile() || fs.statSync(file).size !== encoded.byteSize)
    throw Error('fallback encoded media containment/size mismatch');
  return {file, manifest, encoded};
}
// 진단용 identity는 원문 source URL 대신 타입·hash와 동등성만 기록한다.
function identityEvidence(value) {
  return {kind: typeof value === 'string' && value.startsWith('file::') ? 'file-stream-key' : 'opaque-id',
    sha256: crypto.createHash('sha256').update(String(value ?? '')).digest('hex')};
}
function fallbackDiagnostic(link) {
  const result = {eventId: link.event_id, linkId: link.link_id, requested: link.requested_range,
    mediaPts: link.media_pts_range_ms, deferred: link.deferred_requested_range,
    deferredMediaPts: link.deferred_media_pts_range_ms, status: link.status,
    reason: link.completeness_reason, overlaps: link.ordered_overlaps, missing: link.missing_ranges,
    epoch: link.stream_epoch_id, derivedId: link.derived_segment_id,
    manifestExists: false, mediaExists: false};
  if (!link.fallback_media_locator) return result;
  const manifestPath = path.resolve(link.fallback_media_locator);
  if (!manifestPath.startsWith(path.join(root, 'events/clips') + path.sep)) return {...result, error: 'manifest-outside-root'};
  result.manifestExists = fs.existsSync(manifestPath);
  if (!result.manifestExists) return result;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')), encoded = manifest.encodedClip;
    result.identity = {eventMatches: manifest.eventId === link.event_id,
      streamMatchesCatalogSource: manifest.streamId === link.source_id,
      channelMatchesCatalogChannel: manifest.channelId === link.channel_id,
      manifestStream: identityEvidence(manifest.streamId), manifestChannel: identityEvidence(manifest.channelId),
      catalogSource: identityEvidence(link.source_id), catalogChannel: identityEvidence(link.channel_id)};
    result.encodedClip = encoded && {schema: encoded.schema, status: encoded.status,
      format: encoded.format, contentType: encoded.contentType, codec: encoded.codec, byteSize: encoded.byteSize};
    const media = typeof encoded?.mediaPath === 'string' ? path.resolve(encoded.mediaPath) : '';
    result.mediaExists = media.startsWith(path.join(root, 'events/clips') + path.sep) && fs.existsSync(media);
  } catch (e) { result.error = e.message; }
  return result;
}
function dispatchTuple(response, tap, ruleId) {
  if (response.tapId !== tap.tapId || response.result?.sourceKey !== tap.streamKey ||
      !Number.isSafeInteger(response.result?.pts)) return null;
  const events = (response.events || []).filter(e => e.ruleId === ruleId && e.type === 'presence' &&
    Number.isSafeInteger(e.object?.trackId)).sort((a, b) => a.object.trackId - b.object.trackId);
  if (!events.length) return null;
  return {source: tap.streamKey, pts: response.result.pts, ruleId, trackId: events[0].object.trackId, type: events[0].type};
}
function correlatedEvent(rows, excluded, tuple) {
  const matches = rows.filter(x => x.eventId && !excluded.has(x.eventId) &&
    x.streamId === tuple.source && x.channelId === tuple.source && x.eventType === tuple.type &&
    x.trackId === tuple.trackId && Number.isSafeInteger(x.updateTime) &&
    x.updateTime === Math.trunc(tuple.pts / 1000000) && x.metadata?.ruleId === tuple.ruleId &&
    ((x.metadata.schema === 'media-server.va.event-record.metadata.v1' && x.metadata.pts === tuple.pts) ||
     (x.metadata.schema === 'media-server.va.event-track-health.v1' &&
      x.metadata.eventMetadata !== null && typeof x.metadata.eventMetadata === 'object' && !Array.isArray(x.metadata.eventMetadata) &&
      x.metadata.trackHealth !== null && typeof x.metadata.trackHealth === 'object' && !Array.isArray(x.metadata.trackHealth))));
  const ids = new Set(matches.map(x => x.eventId));
  if (ids.size > 1) throw Error('ambiguous-new-dispatch-event-ids');
  return matches[0];
}
function selectionNegatives() {
  const tap = {tapId: 'tap-new', streamKey: 'local-fixture'};
  const response = {tapId: tap.tapId, result: {sourceKey: tap.streamKey, pts: 2000000000},
    events: [{ruleId: '9102', type: 'presence', object: {trackId: 4}}, {ruleId: '9102', type: 'presence', object: {trackId: 2}}]};
  const tuple = dispatchTuple(response, tap, '9102');
  const row = {eventId: 'new', streamId: tap.streamKey, channelId: tap.streamKey, eventType: 'presence', trackId: 2,
    startTime: 2000, updateTime: 2000, metadata: {schema: 'media-server.va.event-track-health.v1',
      ruleId: '9102', eventMetadata: {}, trackHealth: {}}};
  const excluded = new Set(['old']);
  must(tuple?.trackId === 2, 'AP11 deterministic first response minimum track');
  must(correlatedEvent([row], excluded, tuple)?.eventId === 'new', 'AP11 exact new dispatch tuple');
  must(!correlatedEvent([{...row, eventId: 'old', updateTime: 99999}], excluded, tuple), 'AP11 old ID newer update rejected');
  must(!dispatchTuple({...response, tapId: 'other'}, tap, '9102'), 'AP11 unrelated tap response rejected');
  for (const [label, changed] of [['rule', {...row, metadata: {...row.metadata, ruleId: '9101'}}],
    ['updateTime', {...row, updateTime: 1}], ['track', {...row, trackId: 4}], ['source', {...row, streamId: 'other'}]])
    must(!correlatedEvent([changed], excluded, tuple), `AP11 unrelated durable ${label} rejected`);
  must(correlatedEvent([row, {...row, updateTime: 2100}], excluded, tuple)?.eventId === 'new', 'AP11 same ID repeated rows accepted');
  let ambiguous = false;
  try { correlatedEvent([row, {...row, eventId: 'other-new'}], excluded, tuple); } catch { ambiguous = true; }
  must(ambiguous, 'AP11 distinct matching IDs rejected');
  must(correlatedEvent([{...row, metadata: {schema: 'media-server.va.event-record.metadata.v1',
    pts: 2000000000, ruleId: '9102'}}], excluded, tuple)?.eventId === 'new', 'AP11 base metadata exact time accepted');
  must(!correlatedEvent([{...row, metadata: {schema: 'media-server.va.event-record.metadata.v1',
    pts: 1, ruleId: '9102'}}], excluded, tuple), 'AP11 base metadata wrong PTS rejected');
  must(!correlatedEvent([{...row, metadata: {...row.metadata, schema: 'unknown'}}], excluded, tuple), 'AP11 unknown metadata schema rejected');
  must(!correlatedEvent([{...row, metadata: undefined}], excluded, tuple), 'AP11 absent metadata rejected');
}
async function eventCase(app, kind, excluded) {
  const priorIds = new Set([...excluded, ...jsonl(path.join(root, 'events/events.jsonl')).map(x => x.eventId)]);
  const tap = await request(app, 'POST', '/lab/analysis/taps?file=identity.mp4&va=1&fps=8&maxQueue=1&trackIds=1');
  must(tap.tapId && tap.streamKey, `AP0${kind === 'fallback' ? 2 : 3} actual tap created`);
  let event;
  let lastTransition;
  let fixedTuple;
  try {
    const ruleId = kind === 'derived' ? '9102' : '9101';
    if (kind === 'derived') {
      const boundary = oldest(continuous('9101')).at(-1);
      must(boundary, 'AP03 finalized boundary available');
      let lastPts;
      await waitFor('AP03 actual interior PTS before new rule', async () => {
        const snapshot = await request(app, 'GET', `/lab/analysis/taps/${tap.tapId}`);
        const pts = snapshot.tap?.latestResult?.pts;
        const latest = oldest(continuous('9101')).at(-1);
        if (latest?.stream_epoch_id !== boundary.stream_epoch_id) throw Error('AP03 boundary epoch changed');
        if (latest.end.time_base_num !== 1 || latest.end.time_base_den !== 1000000000 ||
            !Number.isSafeInteger(latest.end.pts)) throw Error('AP03 unsupported finalized PTS timebase');
        if (!Number.isSafeInteger(pts)) return false;
        if (lastPts !== undefined && pts < lastPts) throw Error('AP03 source PTS rollback before dispatch');
        lastPts = pts;
        if (pts < latest.end.pts + 750000000) return false;
        console.log(`[event-input] ${JSON.stringify({tapId: tap.tapId, pts, finalizedEndPts: latest.end.pts, epoch: latest.stream_epoch_id})}`);
        return true;
      }, 15000);
      await request(app, 'PUT', '/lab/analysis/rules/9102', rule('9102'));
    }
    await waitFor(`actual ${kind} dispatch response`, async () => {
      const response = await request(app, 'GET', `/lab/analysis/taps/${tap.tapId}/events?dispatch=1`);
      fixedTuple = dispatchTuple(response, tap, ruleId);
      return fixedTuple;
    }, 20000);
    console.log(`[event-correlation] ${JSON.stringify({...fixedTuple, source: {sha256: crypto.createHash('sha256').update(fixedTuple.source).digest('hex')}, priorIdCount: priorIds.size})}`);
    event = await waitFor(`actual ${kind} durable correlated EventRecord`, () =>
      correlatedEvent(jsonl(path.join(root, 'events/events.jsonl')), priorIds, fixedTuple), 20000);
    must(event.channelId === tap.streamKey && event.recordingLinkId, `AP02/03 actual EventRecord identity ${kind}`,
      `eventId=${event.eventId} linkId=${event.recordingLinkId}`);
    must(Number.isFinite(event.startTime) && event.startTime >= 500, `AP02/03 actual nonnegative padded event start ${kind}`,
      `startTime=${event.startTime} updateTime=${event.updateTime} timeBasis=${event.timeBasis}`);
    const link = await waitFor(`${kind} exact link`, async () => {
      const x = state().links.get(event.eventId);
      if (!x || x.link_id !== event.recordingLinkId) return false;
      let http;
      if (x.requested_range) {
        const r = x.requested_range;
        const response = await appFetch(app, `/ops/api/recordings/timeline?channelId=9101&startTimeMs=${r.start_ms - 1000}&endTimeMs=${r.end_ms + 1000}`, {signal: AbortSignal.timeout(4000)});
        const body = await response.json();
        http = {status: response.status, items: body.items?.filter(item => item.eventId === event.eventId)};
      }
      const diagnostic = {...fallbackDiagnostic(x), http,
        segments: continuous('9101').map(s => ({id: s.segment_id, epoch: s.stream_epoch_id, start: s.start, end: s.end}))};
      const serialized = JSON.stringify(diagnostic);
      if (serialized !== lastTransition) {
        console.log(`[event-transition] ${serialized}`);
        lastTransition = serialized;
      }
      if (kind === 'fallback' && x.status === 'complete' && x.derived_segment_id)
        throw Error('fallback-superseded-before-http: same event became Complete');
      if (!x.requested_range) return false;
      if (kind === 'fallback') return x.fallback_evidence_id && x.fallback_media_locator &&
        http?.status === 200 && http.items?.some(item => item.segmentId === x.fallback_evidence_id && item.playable && item.completeness === 'partial') && x;
      return x.status === 'complete' && x.derived_segment_id && x;
    }, 20000);
    must(link.source_id === '9101' && link.channel_id === '9101', `AP02/03 durable link source ${kind}`);
    const response = await timeline(app, link);
    const item = response.items.find(x => x.eventId === event.eventId && x.segmentId === (kind === 'fallback' ? link.fallback_evidence_id : link.derived_segment_id));
    must(priorityMatches(item, 'event'), `AP04 ${kind} event priority`);
    must(!JSON.stringify(response).includes(root) && !JSON.stringify(response).includes('mediaRelpath'), `AP04 ${kind} path redaction`);
    if (kind === 'fallback') {
      must(item.completeness === 'partial' && item.rangeBasis === 'requested-fallback', 'AP02 fallback remains partial requested-fallback');
      const {file} = fallbackMedia(link);
      check(true, 'AP02 encoded WebM eventId/encoded contract/size/isolated path');
      await range(app, item, file, kind);
      if (authMode) await authMedia(app, item, file, kind);
    } else {
      const output = state().segments.get(link.derived_segment_id);
      must(output && output.retention_class === 'event' && link.derivation_mode === 'remux-no-video-reencode', 'AP03 actual derived remux metadata');
      validateSegment(output);
      must(item.completeness === 'complete' && link.ordered_overlaps.length > 0, 'AP03 Complete actual overlaps');
      const originals = response.items.filter(x => x.kind === 'continuous' && x.supersededByEventIds.includes(event.eventId));
      must(originals.length > 0 && originals.every(x => priorityMatches(x, 'continuous')), 'AP04 continuous superseded with priority100');
      await range(app, item, relativeMedia(output.mediaRelpath), kind);
      if (authMode) await authMedia(app, item, relativeMedia(output.mediaRelpath), kind);
    }
    console.log(`[evidence] ${kind} ${JSON.stringify({eventId: event.eventId, link, item, capturedAtMs: Date.now()})}`);
    return event.eventId;
  } catch (error) {
    if (!event && fixedTuple) {
      const candidates = jsonl(path.join(root, 'events/events.jsonl')).filter(x =>
        x.trackId === fixedTuple.trackId || x.metadata?.ruleId === fixedTuple.ruleId).slice(-16).map(x => ({
        eventId: x.eventId, priorId: priorIds.has(x.eventId), eventType: x.eventType, trackId: x.trackId,
        sourceMatches: x.streamId === fixedTuple.source, channelMatches: x.channelId === fixedTuple.source,
        startTime: x.startTime, updateTime: x.updateTime, metadataSchema: x.metadata?.schema,
        ruleId: x.metadata?.ruleId, metadataPts: x.metadata?.pts,
        hasTrackHealth: typeof x.metadata?.trackHealth === 'object'
      }));
      console.log(`[event-candidate-diagnostic] ${JSON.stringify({expectedPts: fixedTuple.pts,
        expectedUpdateTime: Math.trunc(fixedTuple.pts / 1000000), ruleId: fixedTuple.ruleId,
        trackId: fixedTuple.trackId, candidates})}`);
    }
    if (event) {
      const s = state();
      console.log(`[event-diagnostic] ${JSON.stringify({eventId: event.eventId, lastTransition: lastTransition && JSON.parse(lastTransition),
        selectedLinkPresent: s.links.has(event.eventId)})}`);
    }
    throw error;
  } finally {
    await request(app, 'DELETE', `/lab/analysis/taps/${tap.tapId}`);
  }
}
async function generateRetention() {
  const file = path.join(root, 'input/retention.mp4');
  const item = own('gst-launch-1.0', ['-e', 'videotestsrc', 'num-buffers=120', 'pattern=snow', '!',
    'video/x-raw,width=640,height=360,framerate=30/1', '!', 'x264enc', 'tune=zerolatency',
    'speed-preset=ultrafast', 'pass=quant', 'quantizer=0', 'key-int-max=30', '!', 'h264parse', '!', 'mp4mux', '!', 'filesink', `location=${file}`], environment(), 'retention-generator');
  await waitFor('bounded actual retention fixture', () => item.closed, 30000);
  must(item.child.exitCode === 0, 'AP06 actual H264 generator', `exit=${item.child.exitCode} log=${item.logs.slice(-1200).replaceAll('\n', ' ')}`);
  must(fs.statSync(file).size < 96 * MiB, 'AP12 generated input bounded', `bytes=${fs.statSync(file).size} limitBytes=${96 * MiB}`);
}
function retentionProgress(rows, cursor, knownIds) {
  const result = [], seen = new Set();
  const positive = n => Number.isSafeInteger(n) && n > 0;
  for (let index = cursor; index < rows.length; index++) {
    const r = rows[index], s = r.payload?.segment;
    if (r.mutationType !== 'segment_finalized' || s?.channel_id !== '9201' ||
        s.retention_class !== 'continuous' || knownIds.has(r.entityId)) continue;
    if (seen.has(r.entityId)) return [];
    seen.add(r.entityId);
    if (!r.entityId || s.segment_id !== r.entityId || s.lifecycle !== 'finalized' ||
        !positive(s.start?.utc_ms) || !positive(s.end?.utc_ms) || s.end.utc_ms <= s.start.utc_ms ||
        !Number.isSafeInteger(s.start.pts) || s.start.pts < 0 || !positive(s.end.pts) || s.end.pts <= s.start.pts ||
        !positive(s.start.time_base_num) || !positive(s.start.time_base_den) ||
        s.start.time_base_num !== s.end.time_base_num || s.start.time_base_den !== s.end.time_base_den ||
        !positive(s.size_bytes) || !/^[a-f0-9]{64}$/.test(s.checksum_sha256) || !positive(s.finalized_at_ms)) return [];
    const previous = result.at(-1)?.segment;
    if (previous && (s.start.utc_ms <= previous.start.utc_ms || s.end.utc_ms <= previous.end.utc_ms)) return [];
    const requested = rows.findIndex(x => x.entityId === r.entityId && x.mutationType === 'deletion_requested');
    const completed = rows.findIndex(x => x.entityId === r.entityId && x.mutationType === 'deletion_completed');
    if (completed >= 0 && !(requested > index && completed > requested)) return [];
    result.push({index, entityId: r.entityId, segment: s, deleted: completed >= 0});
  }
  return result.length >= 2 ? result : [];
}
function retentionProgressTests() {
  const segment = (id, start) => ({segment_id: id, channel_id: '9201', retention_class: 'continuous', lifecycle: 'finalized',
    start: {utc_ms: start, pts: start * 1000000, time_base_num: 1, time_base_den: 1000000000},
    end: {utc_ms: start + 1000, pts: (start + 1000) * 1000000, time_base_num: 1, time_base_den: 1000000000},
    size_bytes: 100, checksum_sha256: 'a'.repeat(64), finalized_at_ms: start + 1001});
  const triple = (id, start) => [{mutationType: 'segment_finalized', entityId: id, payload: {segment: segment(id, start)}},
    {mutationType: 'deletion_requested', entityId: id, payload: {}}, {mutationType: 'deletion_completed', entityId: id, payload: {}}];
  const rows = [...triple('old', 1000), ...triple('new1', 3000), ...triple('new2', 5000)];
  const found = retentionProgress(rows, 3, new Set(['old']));
  must(found.length >= 2, 'AP08 two finalized then tombstoned segments count as progress');
  if (mode === '--retention-progress-red') return;
  const test = (label, changed, cursor = 3, known = new Set(['old'])) =>
    must(retentionProgress(changed, cursor, known).length === 0, `AP08 rejects ${label}`);
  test('old cursor only', rows, rows.length);
  test('known Stop finalize only', rows, 0, new Set(['old', 'new1', 'new2']));
  test('one new segment only', rows.slice(0, 6));
  test('duplicate ID', [...rows, rows[3]]);
  for (const [label, patch] of [['other channel', {channel_id: '9101'}], ['invalid range', {end: {utc_ms: 1, pts: 1}}],
    ['zero size', {size_bytes: 0}], ['invalid SHA', {checksum_sha256: 'A'.repeat(64)}],
    ['invalid finalized time', {finalized_at_ms: 0}], ['time order', {start: rows[3].payload.segment.start, end: rows[3].payload.segment.end}]]) {
    const changed = structuredClone(rows);
    Object.assign(changed[6].payload.segment, patch);
    test(label, changed);
  }
  const wrongDeleteOrder = structuredClone(rows);
  [wrongDeleteOrder[7], wrongDeleteOrder[8]] = [wrongDeleteOrder[8], wrongDeleteOrder[7]];
  test('deletion order', wrongDeleteOrder);
  const alive = rows.filter(r => r.mutationType === 'segment_finalized');
  must(retentionProgress(alive, 1, new Set(['old'])).length === 2, 'AP08 two alive finalized metadata accepted');
}
async function retentionDiagnostic(app, offset, before, phase) {
  try {
    const s = state();
    const rows = s.rows.map((r, index) => ({r, index})).filter(({r, index}) =>
      index >= offset && ['segment_finalized', 'deletion_requested', 'deletion_completed'].includes(r.mutationType) &&
      s.segments.get(r.entityId)?.channel_id === '9201').map(({r, index}) => {
        const segment = r.payload.segment;
        return {index, mutationId: r.mutationId, type: r.mutationType, entityId: r.entityId,
          existedBeforeQuota: before.some(x => x.segment_id === r.entityId),
          segment: segment && {channel: segment.channel_id, epoch: segment.stream_epoch_id, start: segment.start,
            end: segment.end, size: segment.size_bytes, checksum_sha256: segment.checksum_sha256,
            finalized_at_ms: segment.finalized_at_ms, lifecycle: segment.lifecycle},
          tombstoned: s.tombstones.has(r.entityId)};
      });
    console.log(`[retention-journal] ${JSON.stringify({phase, offset, rows})}`);
    const response = await appFetch(app, '/ops/api/recordings/status', {signal: AbortSignal.timeout(4000)});
    const body = await response.json();
    const c = body.channels?.find(x => x.channelId === '9201');
    if (response.status !== 200 || !c) throw Error(`status=${response.status} channelPresent=${!!c}`);
    console.log(`[retention-status] ${JSON.stringify({phase, status: response.status, channelId: c.channelId,
      enabled: c.enabled, active: c.active, storageBlocked: c.storageBlocked, continuousBytes: c.continuousBytes,
      continuousMaxBytes: c.continuousMaxBytes})}`);
  } catch (e) {
    check(false, `AP08 diagnostic failed ${phase}`, e.message);
  }
}
async function appScenarios() {
  let app = await launch();
  await request(app, 'POST', '/ops/api/sources', source('9101', 'identity.mp4'));
  await waitFor('actual continuous finalized before tap', () => continuous('9101').length > 0, 15000);
  continuous('9101').forEach(validateSegment);
  if (authMode) {
    const segment = continuous('9101')[0];
    const result = await request(app, 'GET', `/ops/api/recordings/timeline?channelId=9101&startTimeMs=${segment.start.utc_ms}&endTimeMs=${segment.end.utc_ms}`);
    const item = result.items.find(x => x.segmentId === segment.segment_id);
    must(item?.playable, 'AP10-C actual continuous timeline media');
    await authMedia(app, item, relativeMedia(segment.mediaRelpath), 'continuous');
  }
  check(true, 'AP02 actual finalized barrier before rule and tap');
  await request(app, 'PUT', '/lab/analysis/rules/9101', rule());
  const first = await eventCase(app, 'fallback', new Set());
  await waitFor('first continuous segment', () => continuous('9101').length > 0, 15000);
  continuous('9101').forEach(validateSegment);
  const second = await eventCase(app, 'derived', new Set([first]));
  must(first !== second, 'AP02/03 fallback and derived independent events');
  await generateRetention();
  await request(app, 'POST', '/ops/api/sources', source('9201', 'retention.mp4'));
  const before = await waitFor('three actual retention segments over quota', () => {
    const values = continuous('9201');
    return values.length >= 3 && values.reduce((n, s) => n + s.size_bytes, 0) > 64 * MiB && values;
  }, 15000);
  before.forEach(validateSegment);
  must(before.every(x => x.size_bytes < 64 * MiB), 'AP06 each actual segment below reservation');
  const total = before.reduce((n, x) => n + x.size_bytes, 0), ordered = oldest(before);
  check(total > 64 * MiB, 'AP06 actual total exceeds future quota', `count=${before.length} bytes=${total} oldest=${ordered.map(x => x.segment_id).join(',')}`);
  const offset = journal().length;
  await request(app, 'PUT', '/ops/api/sources/9201', source('9201', 'retention.mp4', 64 * MiB, 2));
  await waitFor('oldest deletion completed', () => state().tombstones.has(ordered[0].segment_id), 15000);
  const after = state(), changes = after.rows.slice(offset);
  const deleted = changes.filter(x => x.mutationType === 'deletion_requested' && before.some(s => s.segment_id === x.entityId));
  must(deleted.length > 0 && deleted[0].entityId === ordered[0].segment_id, 'AP07 oldest deletion request independent order');
  for (const row of deleted) {
    await waitFor(`deletion complete ${row.entityId}`, () => state().tombstones.has(row.entityId), 5000);
    must(state().rows.some(x => x.mutationType === 'deletion_completed' && x.entityId === row.entityId), `AP07 durable completed ${row.entityId}`);
    must(!fs.existsSync(relativeMedia(after.segments.get(row.entityId).mediaRelpath)), `AP07 physical absent ${row.entityId}`);
  }
  const progressCursor = journal().length;
  const progressKnown = new Set(state().segments.keys());
  await retentionDiagnostic(app, offset, before, 'before-wait');
  let progress;
  try {
    progress = await waitFor('new finalized after retention', () => {
      const found = retentionProgress(journal(), progressCursor, progressKnown);
      return found.length >= 2 && found;
    }, 10000);
  } catch (e) {
    await retentionDiagnostic(app, offset, before, 'after-failure');
    throw e;
  }
  await retentionDiagnostic(app, offset, before, 'after-success');
  for (const item of progress) {
    if (item.deleted) must(!fs.existsSync(relativeMedia(state().segments.get(item.entityId).mediaRelpath)),
      `AP08 new finalized then ordered deleted physical absence ${item.entityId}`);
  }
  console.log(`[retention-progress] ${JSON.stringify({cursor: progressCursor, ids: progress.map(x => x.entityId),
    metadataOnly: true, physicalShaRechecked: false})}`);
  check(true, 'AP08 actual recording resumes after quota deletion');
  // 두 번째 시작의 quota 선제삭제가 기존 살아있는 자료를 제거하지 않도록 정상 API로 quota를 복원한다.
  await request(app, 'PUT', '/ops/api/sources/9201', source('9201', 'retention.mp4', 256 * MiB, 3));
  const restoredKnown = new Set(state().segments.keys());
  await waitFor('new finalized after quota restored', () => continuous('9201').some(s => !restoredKnown.has(s.segment_id)), 10000);
  check(true, 'AP08 restored quota new finalized');
  await stop(app);
  const snapshot = state(), mediaHashes = new Map();
  for (const [id, s] of snapshot.segments) if (!snapshot.tombstones.has(id)) {
    validateSegment(s);
    mediaHashes.set(id, hash(relativeMedia(s.mediaRelpath)));
  }
  const oldPid = app.child.pid;
  app = await launch();
  must(app.child.pid !== oldPid, 'AP09 restart actual new PID');
  if (authMode) {
    for (const {item, file, kind} of [...authMediaRefs.values()]) await authMedia(app, item, file, `restart-${kind}`);
  }
  const recovered = state();
  for (const [id, value] of snapshot.segments) must(JSON.stringify(recovered.segments.get(id)) === JSON.stringify(value), `AP09 immutable segment ${id}`);
  for (const [id, value] of mediaHashes) must(hash(relativeMedia(recovered.segments.get(id).mediaRelpath)) === value, `AP09 immutable media SHA ${id}`);
  for (const key of ['links', 'observations', 'tombstones']) {
    for (const [id, value] of snapshot[key]) must(JSON.stringify(recovered[key].get(id)) === JSON.stringify(value), `AP09 immutable ${key} ${id}`);
  }
  must(uniqueIds(recovered.rows), 'AP09 duplicate mutation IDs zero');
  await waitFor('post restart recording', () => continuous('9101').some(s => !snapshot.segments.has(s.segment_id)), 15000);
  check(true, 'AP09 actual post-restart finalized');
  if(longrunMode) app=await longrunPhase(app);
  await stop(app);
  must(!capFailure && bytes(root) < 512 * MiB, 'AP12 root below 512MiB cap', `bytes=${bytes(root)}`);
  if (authMode) authSuiteCompleted = coverageComplete(authRequired, authCompleted) && coverageComplete(authCaseRequired, authCaseCompleted);
  if (authMode) must(authSuiteCompleted, 'AP10 required suite coverage complete');
}
async function longrunSettings(app,enabled) {
  const value=await request(app,'GET','/ops/api/sources');
  for(const id of ['9101','9201']){
    const recording=nextRecordingSettings(value,id,enabled);
    const body=source(id,id==='9101'?'identity.mp4':'retention.mp4');
    body.recording=recording;
    const result=await request(app,'PUT',`/ops/api/sources/${id}`,body);
    must(result.source?.recording?.revision===body.recording.revision&&result.source.recording.enabled===enabled,
      `LR03 recording settings accepted ${id}`);
  }
}
async function longrunPhase(app) {
  await longrunSettings(app,true);
  const reader=new RecordingJournalReader(root,'recordings/recording-mutations.jsonl');
  try{
    let initial;
    for(let i=0;i<128;i++){initial=reader.poll();if(!initial.backlog)break;}
    must(!initial.backlog,'LR02 initial bounded prefix drained',`offset=${initial.consumedOffset} backlog=${initial.backlogBytes}`);
    const begin=performance.now(),progress=new LongrunProgress(begin),sampleBegin=longrunSamples.length;
    await observer.pause();await observeTick();
    const identity=longrunSamples.at(-1)?.startIdentity;
    while(performance.now()-begin<7200000){
      if(capFailure)throw Error(capFailure);
      const now=performance.now(),batch=reader.poll();
      must(!batch.backlog,'LR02 incremental backlog bounded',`backlog=${batch.backlogBytes}`);
      for(const deleted of progress.consume(batch.batch,now))
        must(mediaAbsent(()=>fs.lstatSync(relativeMedia(deleted.mediaRelpath))),`LR02 physical deleted ${deleted.entityId}`);
      const status=await request(app,'GET','/ops/api/recordings/status');
      for(const id of ['9101','9201']){
        const c=status.channels?.filter(c=>c.channelId===id);
        must(c?.length===1&&c[0].enabled===true&&c[0].active===true&&c[0].storageBlocked===false,`LR02 active recording ${id}`);
      }
      console.log(`[longrun-progress] ${JSON.stringify(progress.status(performance.now()))}`);
      await sleep(Math.min(5000,Math.max(0,7200000-(performance.now()-begin))));
    }
    await observer.pause();await observeTick();
    const end=performance.now();
    must(sampleContinuity(longrunSamples.slice(sampleBegin),begin,end,app.child.pid,identity),'LR04 phase sample continuity');
    const tail=reader.poll();must(!tail.backlog,'LR02 end backlog bounded');
    for(const deleted of progress.consume(tail.batch,end))
      must(mediaAbsent(()=>fs.lstatSync(relativeMedia(deleted.mediaRelpath))),`LR02 physical deleted ${deleted.entityId}`);
    longrunResult=progress.finish(end);
    check(true,'LR02 full 120 minute observation elapsed',`elapsedMs=${longrunResult.elapsedMs}`);
  }finally{reader.close();}
  await longrunSettings(app,false);
  await stop(app);
  const before=state();
  for(const [id,s] of before.segments)if(!before.tombstones.has(id))validateSegment(s);
  const oldPid=app.child.pid;
  app=await launch();must(app.child.pid!==oldPid,'LR03 disabled restart new PID');
  const restored=state();
  for(const key of ['segments','links','observations','tombstones']){
    must(restored[key].size===before[key].size,`LR03 disabled restart count ${key}`);
    for(const [id,s] of before[key])must(JSON.stringify(restored[key].get(id))===JSON.stringify(s),`LR03 immutable ${key} ${id}`);
  }
  for(const [id,s] of restored.segments)if(!restored.tombstones.has(id))validateSegment(s);
  must(uniqueIds(restored.rows),'LR03 restart duplicate mutation IDs zero');
  await longrunSettings(app,true);
  await waitFor('LR03 reenabled both channels finalized',()=>['9101','9201'].every(id=>continuous(id).some(s=>!before.segments.has(s.segment_id))),30000);
  check(true,'LR03 reenabled both channels actual finalized');
  return app;
}
async function identityDiagnostic() {
  const app = await launch();
  await request(app, 'POST', '/ops/api/sources', source('9101', 'identity.mp4'));
  await request(app, 'PUT', '/lab/analysis/rules/9101', rule());
  const tap = await request(app, 'POST', '/lab/analysis/taps?file=identity.mp4&va=1&fps=8&maxQueue=1&trackIds=1');
  must(tap.tapId && tap.streamKey, 'AP13 actual tap identity available');
  try {
    const event = await waitFor('AP13 actual first EventRecord', async () => {
      await request(app, 'GET', `/lab/analysis/taps/${tap.tapId}/events?dispatch=1`);
      return jsonl(path.join(root, 'events/events.jsonl')).find(x => x.eventType === 'presence' && x.eventId && x.recordingLinkId);
    }, 20000);
    const link = await waitFor('AP13 durable fallback manifest', () => {
      const value = state().links.get(event.eventId);
      return value?.link_id === event.recordingLinkId && value.fallback_media_locator && value;
    }, 20000);
    const diagnostic = fallbackDiagnostic(link);
    must(diagnostic.manifestExists && diagnostic.identity?.eventMatches && diagnostic.encodedClip,
      'AP13 actual manifest inspected', 'UTC mapping/playable/Range success not asserted');
    console.log(`[identity-diagnostic] ${JSON.stringify(diagnostic)}`);
  } finally {
    await request(app, 'DELETE', `/lab/analysis/taps/${tap.tapId}`);
  }
  await stop(app);
}

let monitor;
try {
  if (!['--app-longrun', '--app-observe', '--app-auth', '--app-nonauth', '--oracle-negative', '--event-selection-negative', '--retention-progress-red', '--retention-progress-negative', '--identity-diagnostic'].includes(mode)) throw Error('unsupported internal mode: use foundation shell wrapper for default or --all');
  if(longrunMode)parseLongrunArgs(process.argv.slice(4));
  if (authMode) { authPasswords = credentials(process.env); authSecrets.push(...authPasswords); }
  let collectorBinary;
  if(observeMode){
    const cache=process.env.MEDIA_SERVER_GST_CACHE_DIR;
    if(process.argv.length!==(longrunMode?6:4)||!cache||process.argv[3]!==path.join(cache,'recording-process-metrics'))throw Error('observer requires fixed wrapper collector');
    const stat=fs.lstatSync(process.argv[3]);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||fs.realpathSync(path.dirname(process.argv[3]))!==fs.realpathSync(cache))throw Error('observer unsafe collector');
    collectorBinary=process.argv[3];
  }
  if (mode.startsWith('--retention-progress-')) retentionProgressTests();
  else if (mode === '--event-selection-negative') selectionNegatives();
  else if (mode === '--oracle-negative') negatives();
  else {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'media-server-s09-foundation-')));
    for (const dir of ['input', 'data', 'events', 'recordings', 'tmp']) fs.mkdirSync(path.join(root, dir));
    fs.writeFileSync(path.join(root, 'data/sources.json'), '{"sources":[]}');
    fs.writeFileSync(path.join(root, 'data/views.json'), '{"views":[]}');
    fs.copyFileSync(path.join(repo, 'video/imports/va_tracking_event_1280x720_30fps_h264.mp4'), path.join(root, 'input/identity.mp4'));
    if(observeMode){
      observer=new FoundationObserver({root,file:'recordings/recording-mutations.jsonl',collect:pid=>collectProcess(collectorBinary,pid)});
      observerTimer=setInterval(()=>{void observeTick();},5000);
    }
    monitor = setInterval(() => {
      try {
        const size = bytes(root);
        // 512MiB보다 낮은 448MiB에서 쓰기를 중단하여 감시 간격의 여유를 둔다.
        if (size >= 448 * MiB || (longrunMode ? performance.now()-monotonicStart>7380000 : Date.now() - start > 180000)) {
          capFailure = `AP12 safety stop bytes=${size} elapsedMs=${Date.now() - start}`;
          for (const item of processes) signal(item, 'SIGTERM');
        }
      } catch (e) { capFailure = e.message; }
    }, 50);
    if (mode === '--identity-diagnostic') await identityDiagnostic();
    else await appScenarios();
  }
} catch (e) {
  if (!e.recorded) check(false, e.message);
} finally {
  clearInterval(observerTimer);
  for (const item of processes) {
    try { await stop(item, false); }
    catch (e) { check(false, e.message); }
    if (failed) {
      const redacted = item.logs.slice(-6000).replace(/file::\S+/g, '[local-source-redacted]')
        .replace(/(?:rtsp|https?):\/\/\S+/g, '[local-url-redacted]');
      console.log(safeText(`[diagnostic] ${item.label} ${redacted.replaceAll('\n', ' | ')}`));
    }
  }
  clearInterval(monitor);
  if(observer){
    try{
      await observer.pause();
      if(!processes.every(p=>p.closed))throw Error('observer-process-close-unconfirmed');
      observerFinal=observer.close(true);
      console.log(`[observation-final] ${JSON.stringify(observerFinal)}`);
      if(longrunMode){
        longrunSummary=summarizeRecordingObservations(longrunSamples,{warmupMs:300000});
        console.log(`[longrun-resource-summary] ${JSON.stringify(longrunSummary)}`);
      }
    }
    catch(error){observationError(error);try{observer.close(false);}catch{check(false,'observer close failed');}}
  }
  if (capFailure) check(false, capFailure);
  for (const p of ports) check(await portClosed(p), `AP12 port absent ${p}`);
  if (root) {
    const size = bytes(root);
    if (processes.every(p => p.closed)) {
      fs.rmSync(root, {recursive: true});
      check(!fs.existsSync(root), 'AP12 root cleanup', `path=${root} bytes=${size} absent=${!fs.existsSync(root)}`);
    } else check(false, 'AP12 root preserved: process close unconfirmed', `path=${root} bytes=${size}`);
  }
  console.log(JSON.stringify({mode, passed, failed, startedAtMs: start, endedAtMs: Date.now(), elapsedMs: Date.now() - start, fullFoundationPass: false,
    ...(longrunMode?{longrunObservationCompleted:failed===0&&!!longrunResult&&!!longrunSummary,verifiedDurationMs:longrunResult?.elapsedMs??null,reviewRequired:true,
      executionScopes:{recording120Observation:failed===0&&!!longrunResult&&!!longrunSummary,predev120:false,resourceReview:false}}:{}),
    coverage: mode.endsWith('-negative') || mode.startsWith('--retention-progress-') ? 'oracle-predicates-only' : mode === '--identity-diagnostic' ? 'manifest-identity-observation-only' : longrunMode ? 'app-longrun-observation' : observeMode ? 'app-observe-partial' : authMode ? 'app-auth-partial' : 'app-nonauth-partial',
    observationCompleted:observationCompleted({enabled:observeMode,final:observerFinal,failed,error:capFailure,processesClosed:processes.every(p=>p.closed)}), resourceTrendPass:false,
    authAttempted, authSuiteCompleted: authSuiteCompleted && failed === 0,
    authRemaining: authRequired.filter(id => !authCompleted.has(id)),
    authRemainingCases: authCaseRequired.filter(id => !authCaseCompleted.has(id)),
    notRun: [...(authSuiteCompleted && failed === 0 ? [] : ['auth']), '30min', ...(longrunMode?['predev120','resourceReview',...(failed===0&&longrunResult&&longrunSummary?[]:['recording120'])]:['120min']), 'UI'], tokenStart: null, tokenEnd: null, tokenConsumed: null,
    tokenSource: '하위 작업별 자동 집계 없음'}));
  process.exitCode = failed ? 1 : 0;
}
