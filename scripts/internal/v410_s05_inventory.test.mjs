// 파일 용도: S05 등록·실행 결과 소비자의 누락/중복/가짜 완료 거부를 검증한다.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateS05Registration, validateS05Execution } from "./v410_s05_inventory.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "test/fixtures/recording/v1/s05-action-inventory.json"), "utf8"));
const inventoryText = fs.readFileSync(path.join(rootDir, "docs/project-feature-test-inventory.md"), "utf8");
let passed = 0;
function test(name, fn) { fn(); ++passed; console.log(`[등록기 단위 테스트] PASS ${name}`); }
const validate = (m = manifest, text = inventoryText) => validateS05Registration({ rootDir, manifest: m, inventoryText: text });
test("정상 정식 등록 27개", () => assert.equal(validate().length, 27));

// 실제 문서 검증은 위에서 유지한다. 합계 변형시험은 현재 총계나 제품 등록군을
// 치환하지 않고 독립 literal 입력을 사용한다. S05 상세 연결 행만 실제 문서에서 가져온다.
const actionRows = inventoryText.split("\n").filter(line => /^\| V410-S05-I\d+ \|/.test(line)).join("\n");
const summaryFixture = summary => `${summary}\n${actionRows}\n`;
const baseSummary = `| 현재 등록 범위 | 수 |
| --- | ---: |
| 역사적 canonical ID | 986 |
| S05 개별 action ID | 27 |
| 현재 등록 총계 | 1013 |
`;
const oneGroupSummary = `| 현재 등록 범위 | 수 |
| --- | ---: |
| 역사적 canonical ID | 986 |
| S05 개별 action ID | 27 |
| 합성 등록군 A | 2 |
| 현재 등록 총계 | 1015 |
`;
const multiGroupSummary = `| 현재 등록 범위 | 수 |
| --- | ---: |
| 역사적 canonical ID | 986 |
| S05 개별 action ID | 27 |
| 합성 등록군 A | 7 |
| 합성 등록군 B | 11 |
| 현재 등록 총계 | 1031 |
`;
test("다른 등록군 추가와 일관된 총계 허용", () => {
  for (const summary of [baseSummary, oneGroupSummary, multiGroupSummary]) {
    assert.equal(validate(manifest, summaryFixture(summary)).length, 27);
  }
});
for (const [name, before, after, reason] of [
  ["전체 총계 불일치 거부", "| 현재 등록 총계 | 1031 |", "| 현재 등록 총계 | 1030 |", /총계/],
  ["canonical 등록 수 변경 거부", "| 역사적 canonical ID | 986 |", "| 역사적 canonical ID | 985 |", /canonical/],
  ["S05 등록 수 변경 거부", "| S05 개별 action ID | 27 |", "| S05 개별 action ID | 26 |", /S05/],
  ["등록군 중복 거부", "| 합성 등록군 A | 7 |", "| 합성 등록군 A | 7 |\n| 합성 등록군 A | 0 |", /중복/],
  ["음수 등록 수 거부", "| 합성 등록군 A | 7 |", "| 합성 등록군 A | -7 |", /등록 수/],
  ["소수 등록 수 거부", "| 합성 등록군 A | 7 |", "| 합성 등록군 A | 7.0 |", /등록 수/],
  ["등록 범위 표 누락 거부", "| 현재 등록 범위 | 수 |", "| 잘못된 표 | 수 |", /등록 범위/],
]) test(name, () => {
  assert(multiGroupSummary.includes(before), `${name}: mutation 대상 누락`);
  assert.throws(() => validate(manifest, summaryFixture(multiGroupSummary.replace(before, after))), reason);
});
for (const [name, mutate] of [
  ["누락 ID", m => m.rows.pop()],
  ["중복 ID", m => { m.rows[1].id = m.rows[0].id; }],
  ["추가 ID", m => m.rows.push({ ...m.rows[0], id: "V410-S05-I28" })],
  ["빈 테스트 영역", m => { m.rows[0].soak120 = ""; }],
  ["없는 구현 심볼", m => { m.rows[0].sourceSymbol = "MissingS05Owner"; }],
  ["없는 테스트 함수", m => { m.rows[0].testSymbol = "MissingS05Test"; }],
  ["없는 check", m => { m.rows[0].checks[0].message = "MissingS05Assertion"; }],
  ["중복 check ID", m => { m.rows[1].checks[0].id = m.rows[0].checks[0].id; }],
]) {
  test(name, () => { const changed = structuredClone(manifest); mutate(changed); assert.throws(() => validate(changed)); });
}
test("문서 행 누락", () => assert.throws(() => validate(manifest, inventoryText.replace(/^\| V410-S05-I03 \|.*\n/m, ""))));

// 소비자 계약을 위한 합성 입력이며 제품 실행 증거로 저장/사용하지 않는다.
const checks = manifest.rows.flatMap(row => row.checks.map(check => ({ ...check, testFile: check.testFile ?? row.testFile })));
const cppMessages = checks.filter(c => c.testFile.endsWith("/event_recording_link_smoke.cpp")).map(c => c.message);
const appMessages = checks.filter(c => c.testFile.endsWith(".mjs")).map(c => c.message);
const runtimeLog = ["disabled-admit", "enabled-admit", "disabled-recover", "enabled-recover", "shutdown-cancel"].map(runtimeCase => {
  const messages = checks.filter(c => c.runtimeCase === runtimeCase).map(c => c.message);
  return messages.map(message => "[s05-runtime-assert] " + JSON.stringify({ case: runtimeCase, message })).join("\n") +
    `\n[s05-runtime-summary] case=${runtimeCase} pass=${messages.length} fail=0\n`;
}).join("") +
  "[s05-runtime-mutation] disabled-guard: PASS (실제 assertion의 RED 확인)\n" +
  "[s05-runtime-mutation] prequeue-admission: PASS (실제 assertion의 RED 확인)\n" +
  "[s05-runtime-negative] pass=2 fail=0 elapsedMs=1\n";
const cppLog = cppMessages.map(m => "[s05-assert] " + JSON.stringify(m)).join("\n") +
  `\n[verify-v410-event-recording] pass=${cppMessages.length} fail=0\n`;
const appLog = appMessages.map(m => "- PASS: " + m).join("\n") +
  `\n- summary: pass=${appMessages.length} fail=0\n`;
const execute = (cpp = cppLog, app = appLog, runtime = runtimeLog) => validateS05Execution(manifest.rows, cpp, app, runtime);
test("실행 소비자 정상 합성 입력", () => assert.equal(execute().length, 27));
test("실제 check 결과 누락", () => assert.throws(() => execute(cppLog.replace(cppMessages[0], "누락"))));
test("EOS assertion 제거와 감소한 summary도 거부", () => {
  const eos = manifest.rows.find(r => r.id === "V410-S05-I14").checks.find(c => c.id === "V410-S05-I14-C05");
  const reduced = cppMessages.filter(message => message !== eos.message);
  const log = reduced.map(message => "[s05-assert] " + JSON.stringify(message)).join("\n") +
    `\n[verify-v410-event-recording] pass=${reduced.length} fail=0\n`;
  assert.throws(() => execute(log), /V410-S05-I14-C05/);
});
test("실패 summary", () => assert.throws(() => execute(cppLog.replace("fail=0", "fail=1"))));
test("성공 summary만으로 PASS 금지", () => assert.throws(() => execute("[verify-v410-event-recording] pass=140 fail=0")));
test("중복 application 결과", () => assert.throws(() => execute(cppLog, "- PASS: " + appMessages[0] + "\n" + appLog)));
for (const [name, mutate] of [
  ["runtime 로그 전체 누락", () => ""],
  ["runtime 시나리오 누락", log => log.split("\n").filter(l => !l.includes("enabled-recover")).join("\n")],
  ["종료 취소 runtime 시나리오 누락", log => log.split("\n").filter(l => !l.includes("shutdown-cancel")).join("\n")],
  ["runtime assertion 누락 및 감소 summary", log => log.replace(/^\[s05-runtime-assert\].*\n/, "").replace("pass=7", "pass=6")],
  ["runtime assertion 중복 및 증가 summary", log => log.split("\n")[0] + "\n" + log.replace("pass=7", "pass=8")],
  ["runtime summary 실패", log => log.replace("fail=0", "fail=1")],
  ["runtime summary 중복", log => log + "[s05-runtime-summary] case=disabled-admit pass=7 fail=0\n"],
  ["runtime failure marker", log => log + "[s05-runtime-fail] 주입 실패\n"],
  ["runtime mutation 결과 누락", log => log.replace(/^\[s05-runtime-mutation\].*\n/m, "")],
  ["runtime mutation 결과 중복", log => log + "[s05-runtime-mutation] disabled-guard: PASS (실제 assertion의 RED 확인)\n"],
  ["runtime negative summary 실패", log => log.replace("[s05-runtime-negative] pass=2 fail=0", "[s05-runtime-negative] pass=1 fail=1")],
]) test(name, () => assert.throws(() => execute(cppLog, appLog, mutate(runtimeLog)), /runtime/));
console.log(`[v410-s05-inventory-unit] pass=${passed} fail=0`);
