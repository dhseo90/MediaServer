// 파일 용도: 녹화 통합 검증의 인증·쿠키·비밀값 가림 도우미.
import {fileURLToPath} from 'node:url';

export const authKeys = ['MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD', 'MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD',
  'MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD', 'MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE',
  'MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO'];
export function credentials(env) {
  const invalid = authKeys.filter(k => typeof env[k] !== 'string' || env[k].length < 12);
  if (invalid.length) throw Error(`credentials invalid count=${invalid.length} names=${invalid.join(',')}`);
  const values = authKeys.map(k => env[k]);
  if (new Set(values).size !== authKeys.length) throw Error('credentials duplicate count=5');
  return values;
}
export function requestOptions(cookie, options = {}) {
  const headers = new Headers(options.headers);
  headers.delete('Cookie');
  if (cookie) headers.set('Cookie', cookie);
  return {...options, headers, redirect: 'manual'};
}
export function redactSecrets(value, secrets) {
  let text = String(value);
  const ordered = [...new Set(secrets.filter(x => typeof x === 'string' && x.length))].sort((a, b) => b.length - a.length);
  for (const secret of ordered) text = text.split(secret).join('[secret-redacted]');
  return text;
}
export function timelineScope(value, channel) {
  return Array.isArray(value?.items) && value.items.length > 0 && value.items.every(x => x.channelId === channel);
}
function validSourceIds(ids) {
  return Array.isArray(ids) && ids.every(id => typeof id === 'string' && /^[0-9]+$/.test(id)) && new Set(ids).size === ids.length;
}
export function sourceRegistryIds(value) {
  if (!Array.isArray(value?.sources)) throw Error('source registry shape invalid');
  const ids = value.sources.map(source => source?.sourceId);
  if (!validSourceIds(ids)) throw Error('source registry IDs invalid');
  return ids.sort();
}
export function scopedSourceMatch(expected, observed, scope = null) {
  if (!validSourceIds(expected) || !validSourceIds(observed) ||
      (scope !== null && (typeof scope !== 'string' || !/^[0-9]+$/.test(scope)))) return false;
  const selected = expected.filter(id => scope === null || id === scope).sort();
  return JSON.stringify(selected) === JSON.stringify([...observed].sort());
}
export function coverageComplete(required, completed) {
  return required.length > 0 && required.every(id => completed.has(id));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { credentials(process.env); }
  catch (e) { console.error(e.message); process.exitCode = 1; }
}
