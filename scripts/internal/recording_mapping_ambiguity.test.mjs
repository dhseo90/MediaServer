// 설계 특성화 전용: 서로 다른 시간 변환 후보의 존재를 보인다.
// 후보 fitting은 원천 변환 증명이나 제품의 완전 녹화 판정이 아니다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base = new URL('../../docs/release-artifacts/v4.1.0/s11-preparation-mapping/timing-probe-data/', import.meta.url);
const native = (name) => JSON.parse(fs.readFileSync(new URL(name, base), 'utf8'));
// 입력 CSV에는 bytes/hash도 있으므로 시각 열만 명시적으로 읽는다.
function input(name) {
  const lines = fs.readFileSync(new URL(name, base), 'utf8').trim().split('\n').slice(1);
  return lines.map(line => {const v = line.split(','); return {pts: BigInt(v[1]), dts: BigInt(v[2])};});
}
function floor(n, d) { return n >= 0n ? n / d : -((-n + d - 1n) / d); }

test('MAP-A01 실제 tail50개는 서로 다른 rational 위상 두 개를 구분하지 못한다', () => {
  const file = native('TP01/segment-1-native.json');
  const original = input('TP01/input.csv').slice(250);
  assert.equal(file.timescale, 3000);
  assert.equal(file.samples.length, 50);
  assert.equal(original.length, 50);
  for (let i = 0; i < 50; ++i) {
    const localSixths = BigInt(file.samples[i].pts) * 2000000n;
    // A=25000000000/3ns, B=A+1/6ns. 정수 ns 관측은 양쪽 모두 일치한다.
    assert.equal(floor(localSixths + 50000000000n, 6n), original[i].pts);
    assert.equal(floor(localSixths + 50000000001n, 6n), original[i].pts);
  }
});

test('MAP-A02 같은 자료에 연속0과1/6ns 양수 간격 후보가 공존한다', () => {
  const before = native('TP01/segment-0-native.json');
  const after = native('TP01/segment-1-native.json');
  const last = before.samples.at(-1);
  assert.equal(before.timescale, 3000);
  assert.equal(last.pts + last.duration, 25000);
  assert.equal(after.samples[0].pts, 0);
  const endSixths = BigInt(last.pts + last.duration) * 2000000n;
  assert.equal(50000000000n - endSixths, 0n);
  assert.equal(50000000001n - endSixths, 1n);
  assert.equal(floor(50000000000n, 6n), 8333333333n);
  assert.equal(floor(50000000001n, 6n), 8333333333n);
});

test('MAP-A03 PTS 후보 변환을 DTS 공통 변환으로 취급하지 않는다', () => {
  const file = native('TP03/segment-0-native.json');
  const original = input('TP03/input.csv');
  assert.equal(file.samples[0].dts, 0);
  assert.equal(original[0].dts, 0n);
  assert.equal(floor(-2n, 3n), -1n);
});
