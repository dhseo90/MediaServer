// 파일 용도: 인증 검증 도우미의 입력·쿠키·가림 경계 검사.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {authKeys, credentials, requestOptions, redactSecrets, timelineScope, coverageComplete} from './recording_foundation_auth_helpers.mjs';
const start = Date.now();
let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log(`[pass] ${name}`); };
assert.throws(() => credentials({}), /credentials/, 'AP10-A missing credentials rejected');
passed++; console.log('[pass] AP10-A missing credentials rejected');
// 이 값들은 순수helper fixture이며 실제server에 전달하지 않는다.
const values = ['fixture-only-one', 'fixture-only-two', 'fixture-only-three', 'fixture-only-four', 'fixture-only-five'];
const env = Object.fromEntries(authKeys.map((k, i) => [k, values[i]]));
check('AP10-A five distinct valid values', () => assert.deepEqual(credentials(env), values));
for (const [name, value] of [['missing', undefined], ['nonstring', 12345], ['short', 'short']])
  check(`AP10-A rejects ${name}`, () => assert.throws(() => credentials({...env, [authKeys[2]]: value}), /credentials/));
check('AP10-A rejects duplicate', () => assert.throws(() => credentials({...env, [authKeys[2]]: values[0]}), /duplicate/));
check('AP10-A errors contain no secret', () => { try { credentials({...env, [authKeys[2]]: undefined}); }
  catch (e) { assert(values.every(v => !e.message.includes(v))); } });
check('AP10-F explicit cookie replaces ambient cookie', () => assert.equal(requestOptions('sid=fixture-new', {headers:{Cookie:'sid=fixture-old'}}).headers.get('Cookie'), 'sid=fixture-new'));
check('AP10-F explicit unauth removes cookie', () => assert.equal(requestOptions(null, {headers:{Cookie:'sid=fixture-old'}}).headers.get('Cookie'), null));
check('AP10-F redirect always manual', () => assert.equal(requestOptions(null, {redirect:'follow'}).redirect, 'manual'));
check('AP10-F Range header preserved', () => assert.equal(requestOptions('sid=x', {headers:{Range:'bytes=2-5'}}).headers.get('Range'), 'bytes=2-5'));
check('AP10-F lowercase cookie removed', () => assert.equal(requestOptions(null, {headers:{cookie:'sid=fixture'}}).headers.get('cookie'), null));
check('AP10-F Headers cookie removed and content type preserved', () => {
  const headers = requestOptions(null, {headers:new Headers({cookie:'sid=fixture', 'Content-Type':'application/json', Range:'bytes=2-5'})}).headers;
  assert.equal(headers.get('cookie'), null);
  assert.equal(headers.get('Content-Type'), 'application/json');
  assert.equal(headers.get('Range'), 'bytes=2-5');
});
check('AP10-F redacts password and cookie', () => assert.equal(redactSecrets('a fixture-only-one sid=test z', ['fixture-only-one', 'sid=test']), 'a [secret-redacted] [secret-redacted] z'));
for (const order of [0, 1]) check(`AP10-F overlapping secrets order${order}`, () => {
  const secrets = ['fixture-short', 'fixture-short-with-suffix'];
  if (order) secrets.reverse();
  assert.equal(redactSecrets('fixture-short-with-suffix fixture-short', secrets), '[secret-redacted] [secret-redacted]');
});
for (const [name, invalid] of [['missing', {}], ['short', {...env, [authKeys[0]]:'short'}],
  ['duplicate', {...env, [authKeys[0]]:values[1]}]]) check(`AP10-A wrapper ${name} before GST root or app`, () => {
  const absentPath = `/private/tmp/s09-auth-not-created-${process.pid}-${name}`;
  assert(!fs.existsSync(absentPath));
  const result = spawnSync('/bin/bash', [fileURLToPath(new URL('./verify_v410_recording_foundation.sh', import.meta.url)), '--app-auth'],
    {env:{PATH:process.env.PATH, TMPDIR:absentPath, ...invalid}, encoding:'utf8', timeout:5000});
  assert.equal(result.status, 1);
  assert.match(result.stderr, /credentials/);
  assert(!result.stdout.includes('[cleanup]'));
  assert(values.every(v => !`${result.stdout}${result.stderr}`.includes(v)));
  assert(!fs.existsSync(absentPath));
});
check('AP10-D timeline allowed nonempty', () => assert(timelineScope({items:[{channelId:'9101'}]}, '9101')));
check('AP10-D timeline empty denied', () => assert(!timelineScope({items:[]}, '9101')));
check('AP10-D timeline other channel denied', () => assert(!timelineScope({items:[{channelId:'9101'}, {channelId:'9201'}]}, '9101')));
check('AP10-F coverage one missing denied', () => assert(!coverageComplete(['a','b'], new Set(['a']))));
check('AP10-F coverage complete accepted', () => assert(coverageComplete(['a','b'], new Set(['a','b']))));
console.log(JSON.stringify({passed, failed:0, elapsedMs:Date.now()-start, tokenStart:null, tokenEnd:null, tokenConsumed:null, tokenSource:'순수helper별 자동집계없음', scope:'helper-only-no-app', cleanup:'no temporary artifacts'}));
