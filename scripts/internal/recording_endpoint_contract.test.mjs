// 검증 전용 계산 모델. 제품 연결/파일 파싱/증거 인증/저장·복구 구현이 아니다.
// 입력 native 표와 공통축 변환의 신뢰성은 별도 전제다. 계산 성공을 재생 가능으로 쓰지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';

const NS = 1000000000n, MAX = (1n << 63n) - 1n;
function endpoint(p) {
  if (!p || ['pts', 'duration', 'scale', 'origin', 'original'].some(k => p[k] == null))
    return { state: 'unknown', reason: 'native-evidence-missing' };
  if (p.mapping !== 'identity-file-axis')
    return { state: 'unknown', reason: 'mapping-not-established' };
  for (const k of ['pts', 'duration', 'scale', 'origin', 'original'])
    if (typeof p[k] !== 'bigint') throw new RangeError('integer-required');
  if (p.scale <= 0n || p.scale > 0xffffffffn || p.pts < 0n || p.pts > MAX ||
      p.duration <= 0n || p.duration > MAX || p.origin < 0n || p.original < 0n ||
      p.origin > MAX || p.original > MAX || p.pts + p.duration > MAX)
    throw new RangeError('invalid-native-range');
  const startNumerator = p.origin * p.scale + p.pts * NS;
  const endNumerator = p.origin * p.scale + (p.pts + p.duration) * NS;
  if (endNumerator > MAX * p.scale) throw new RangeError('ns-overflow');
  const startNs = startNumerator / p.scale;
  if (startNs !== p.original) return { state: 'unknown', reason: 'original-binding-mismatch' };
  // presentation 끝을 native 축에서 먼저 합산하고 단 한 번 정수 ns로 변환한다.
  const endNs = endNumerator / p.scale;
  return { state: 'calculated', startNs, endNs, startNumerator, endNumerator, denominator: p.scale };
}
function sample(pts, duration, scale, original, origin = 0n) {
  return { pts, duration, scale, original, origin, mapping: 'identity-file-axis' };
}
function nativeGap(left, right) {
  assert.equal(left.state, 'calculated'); assert.equal(right.state, 'calculated');
  return right.startNumerator * left.denominator - left.endNumerator * right.denominator;
}

test('EP01 각 항 절삭 반례와 presentation 끝 단일 변환', () => {
  const r = endpoint(sample(23600n, 100n, 3000n, 7866666666n));
  assert.equal(r.startNs, 7866666666n);
  assert.equal(r.endNs, 7900000000n);
  assert.equal(7866666666n + 33333333n, 7899999999n); // 실제 parser 경계 값
});
test('EP02 30000/1001 분수fps 끝점', () => {
  assert.equal(endpoint(sample(1001n, 1001n, 30000n, 33366666n)).endNs, 66733333n);
  assert.equal(endpoint(sample(29029n, 1001n, 30000n, 967633333n)).endNs, 1001000000n);
});
test('EP03 실제1ns와 sub-ns 누락은 양자화 전에 구분', () => {
  const a = endpoint(sample(0n, 100n, NS, 0n));
  const b = endpoint(sample(101n, 10n, NS, 101n));
  assert.equal(b.startNs - a.endNs, 1n); assert.ok(nativeGap(a, b) > 0n);
  const c = endpoint(sample(0n, 200n, 2n * NS, 0n));
  const d = endpoint(sample(201n, 10n, 2n * NS, 100n));
  assert.equal(d.startNs - c.endNs, 0n);
  assert.ok(nativeGap(c, d) > 0n); // 0.5ns 실제 차이, ns 근사로 닫지 않음
  const contiguous = endpoint(sample(200n, 10n, 2n * NS, 100n));
  assert.equal(nativeGap(c, contiguous), 0n);
});
test('EP04 VFR은 각 sample duration 사용', () => {
  const a = endpoint(sample(0n, 60n, 3000n, 0n));
  const b = endpoint(sample(60n, 150n, 3000n, 20000000n));
  assert.deepEqual([a.endNs, b.endNs], [20000000n, 70000000n]);
  assert.equal(nativeGap(a, b), 0n);
});
test('EP05 B-frame PTS 기준, DTS duration/다음 decode-order PTS 배제', () => {
  const a = endpoint(sample(200n, 100n, 3000n, 66666666n));
  const b = endpoint(sample(400n, 100n, 3000n, 133333333n));
  const c = endpoint(sample(300n, 100n, 3000n, 100000000n));
  assert.deepEqual([a.endNs, b.endNs, c.endNs], [100000000n, 166666666n, 133333333n]);
  assert.equal(nativeGap(a, c), 0n); assert.equal(nativeGap(c, b), 0n);
  assert.notEqual(66666666n + 33333333n, a.endNs); // TP03/0 demux 값도 부족
  assert.notEqual(100000000n + 33333334n, c.endNs); // TP03/2 demux 값은 초과
  assert.equal(endpoint(sample(400n, 100n, 3000n, 133333332n)).reason, 'original-binding-mismatch');
});
test('EP06 마지막 샘플: 실제파일duration과 입력 희망길이 분리', () => {
  const r = endpoint(sample(1110n, 100n, 3000n, 370000000n));
  assert.equal(r.endNs, 403333333n); assert.notEqual(r.endNs, 440000000n);
  assert.equal(endpoint(sample(1110n, undefined, 3000n, 370000000n)).state, 'unknown');
});
test('EP07 무효 산술과 미지원 변환 거부', () => {
  for (const p of [sample(0n, 1n, 0n, 0n), sample(0n, 0n, NS, 0n),
    sample(0n, -1n, NS, 0n), sample(-1n, 1n, NS, 0n),
    sample(MAX, 1n, NS, MAX), sample(10000000000n, 1n, 1n, 0n),
    sample(0n, 1n, NS, MAX, MAX), sample(0n, 1n, 0x100000000n, 0n)])
    assert.throws(() => endpoint(p), RangeError);
  assert.throws(() => endpoint({ ...sample(0n, 1n, NS, 0n), scale: 1000000000 }), RangeError);
  assert.equal(endpoint({ ...sample(0n, 1n, NS, 0n), mapping: 'unresolved-edit' }).state, 'unknown');
});
test('EP08 기존 ns 증거만 있거나 원본 시작 불일치면 승격 금지', () => {
  assert.equal(endpoint({ file_pts_ns: 7866666666n, file_duration_ns: 33333333n }).state, 'unknown');
  assert.equal(endpoint(sample(200n, 100n, 3000n, 8400000000n, 8333333333n)).reason,
    'original-binding-mismatch');
  assert.equal(endpoint(null).state, 'unknown');
});
