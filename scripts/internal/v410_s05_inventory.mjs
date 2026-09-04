// 파일 용도: 역사적 986개와 분리된 S05 정식 등록 및 실제 check 결과를 엄격하게 대조한다.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ids = Array.from({ length: 27 }, (_, i) => `V410-S05-I${String(i + 1).padStart(2, "0")}`);
const fixture = "test/fixtures/recording/v1/s05-action-inventory.json";
const cppFile = "scripts/internal/event_recording_link_smoke.cpp";
const appFile = "scripts/internal/verify_v390_event_storage_application_boundary.mjs";
const runtimeFile = "scripts/internal/event_storage_recording_runtime_smoke.cpp";
const runtimeCases = ["disabled-admit", "enabled-admit", "disabled-recover", "enabled-recover"];

export function validateS05Registration({ rootDir, manifest, inventoryText }) {
  const read = p => fs.readFileSync(path.join(rootDir, p), "utf8");
  manifest ??= JSON.parse(read(fixture));
  inventoryText ??= read("docs/project-feature-test-inventory.md");
  assert.equal(manifest.schema, "media-server.v410-s05-action-inventory.v1");
  assert.deepEqual(manifest.rows.map(r => r.id), ids, "S05 exact ID 집합/순서 불일치");
  const documentRows = inventoryText.split("\n").filter(l => /^\| V410-S05-I\d+ \|/.test(l));
  assert.deepEqual(documentRows.map(l => l.split("|")[1].trim()), ids, "문서 S05 ID 누락/중복/추가");
  const checkIds = new Set(), messages = new Set();
  for (const [index, row] of manifest.rows.entries()) {
    const cells = documentRows[index].split("|").slice(1, -1).map(c => c.trim());
    assert.equal(cells.length, 9, `${row.id}: 네 테스트 영역을 포함한 열 누락`);
    for (const key of ["action", "sourceFile", "sourceSymbol", "testFile", "testSymbol", "criterion", "stability", "soak30", "soak120", "ui"]) {
      assert.equal(typeof row[key], "string", `${row.id}: ${key} 형식`);
      assert(row[key].trim(), `${row.id}: ${key} 누락`);
    }
    assert.equal(row.stability, "대상");
    assert.equal(row.ui, "비대상: UI 없어야 정상");
    assert(row.soak30.startsWith("대상:") && row.soak120.startsWith("대상:"));
    assert.equal(cells[1], row.action);
    assert(cells[2].includes(row.sourceFile) && cells[2].includes(row.sourceSymbol));
    assert(cells[3].includes(row.testSymbol));
    assert.deepEqual(cells.slice(4), [row.criterion, row.stability, row.soak30, row.soak120, row.ui]);
    assert(row.sourceFile.startsWith("src/") && !row.sourceFile.includes(".."));
    assert(new RegExp("\\b" + row.sourceSymbol + "\\s*\\(").test(read(row.sourceFile)), `${row.id}: 구현 함수 없음`);
    assert([cppFile, appFile].includes(row.testFile), `${row.id}: 허용되지 않은 시험 파일`);
    assert(row.checks.length > 0, `${row.id}: check 없음`);
    for (const [checkIndex, check] of row.checks.entries()) {
      assert.equal(check.id, `${row.id}-C${String(checkIndex + 1).padStart(2, "0")}`);
      const testFile = check.testFile ?? row.testFile;
      const testSymbol = check.testSymbol ?? row.testSymbol;
      assert([cppFile, appFile, runtimeFile].includes(testFile), `${check.id}: 허용되지 않은 시험 파일`);
      if (testFile === runtimeFile) {
        assert(runtimeCases.includes(check.runtimeCase), `${check.id}: runtime 시나리오 누락/오류`);
        assert(cells[3].includes(testSymbol), `${check.id}: runtime 함수 문서 연결 없음`);
      } else assert.equal(check.runtimeCase, undefined, `${check.id}: 잘못된 runtime 시나리오`);
      const messageKey = `${testFile}:${check.runtimeCase ?? ""}:${check.message}`;
      assert(!checkIds.has(check.id) && !messages.has(messageKey), "중복 check 정의");
      assert(typeof check.message === "string" && check.message.trim(), "기대 메시지 없음");
      const source = read(testFile);
      const marker = testFile === appFile ? `check("${testSymbol}",` : `void ${testSymbol}(`;
      const start = source.indexOf(marker);
      assert(start >= 0, `${check.id}: 시험 함수/check 없음`);
      const next = source.indexOf(testFile === appFile ? "\ncheck(" : "\nvoid Verify", start + marker.length);
      const body = source.slice(start, next < 0 ? source.length : next);
      // 함수 내부에 실제 assertion 메시지/check 이름이 있어야 한다. 이는 실행 판정이 아니다.
      const declared = testFile === appFile
        ? source.includes(`check("${check.message}",`)
        : body.includes(JSON.stringify(check.message));
      assert(declared, `${check.id}: 시험 함수에 assertion 없음`);
      assert(cells[3].includes(check.id), `${check.id}: 문서 연결 없음`);
      checkIds.add(check.id); messages.add(messageKey);
    }
  }
  // S05 이후 등록군이 늘어도 S05의 exact ID/check 계약은 유지한다.
  // 다른 등록군의 실제 coverage는 각 담당 검증기의 책임이며 여기서는 요약 산술만 대조한다.
  const summary = inventoryText.match(/^\| 현재 등록 범위 \| 수 \|\n\|[^\n]+\|\n((?:\|[^\n]+\|\n)+)/m);
  assert(summary, "현재 등록 범위 표 누락");
  const counts = new Map();
  for (const line of summary[1].trim().split("\n")) {
    const cells = line.split("|").slice(1, -1).map(c => c.trim());
    assert.equal(cells.length, 2, "등록 범위 표 형식 오류");
    const [name, count] = cells;
    assert(name && !counts.has(name), "등록군 이름 누락/중복");
    assert(/^(0|[1-9]\d*)$/.test(count) && Number.isSafeInteger(Number(count)), "등록 수 형식 오류");
    counts.set(name, Number(count));
  }
  assert.equal(counts.get("역사적 canonical ID"), 986, "canonical 등록 수 불일치");
  assert.equal(counts.get("S05 개별 action ID"), ids.length, "S05 등록 수 불일치");
  const total = [...counts].filter(([name]) => name !== "현재 등록 총계").reduce((sum, [, count]) => sum + count, 0);
  assert(Number.isSafeInteger(total), "현재 등록 총계 범위 초과");
  assert.equal(counts.get("현재 등록 총계"), total, "현재 등록 총계 불일치");
  return manifest.rows;
}

export function validateS05Execution(rows, cppLog, appLog, runtimeLog = "") {
  const cppResults = cppLog.split("\n").filter(l => l.startsWith("[s05-assert] "))
    .map(l => JSON.parse(l.slice("[s05-assert] ".length)));
  const summaries = [...cppLog.matchAll(/^\[verify-v410-event-recording\] pass=(\d+) fail=(\d+)$/gm)];
  assert.equal(summaries.length, 1, "C++ summary 누락/중복");
  assert.equal(Number(summaries[0][2]), 0, "C++ 실행 실패");
  assert.equal(cppResults.length, Number(summaries[0][1]), "C++ 개별 실행 결과 누락");
  const appResults = [...appLog.matchAll(/^- PASS: (.+)$/gm)].map(m => m[1]);
  const appSummaries = [...appLog.matchAll(/^- summary: pass=(\d+) fail=(\d+)$/gm)];
  assert.equal(appSummaries.length, 1, "application summary 누락/중복");
  assert.equal(Number(appSummaries[0][2]), 0, "application 실행 실패");
  assert.equal(appResults.length, Number(appSummaries[0][1]), "application 개별 결과 누락");
  assert.equal(new Set(appResults).size, appResults.length, "application 결과 중복");
  const allChecks = rows.flatMap(row => row.checks.map(check => ({ ...check, testFile: check.testFile ?? row.testFile })));
  const expectedApp = allChecks.filter(c => c.testFile === appFile).map(c => c.message);
  assert.deepEqual([...appResults].sort(), [...expectedApp].sort(), "application 결과 exact 집합 불일치");
  assert(!cppLog.includes("[fail]") && !appLog.includes("- FAIL:"), "실패를 포함한 실행 로그");
  const runtimeResults = runtimeLog.split("\n").filter(l => l.startsWith("[s05-runtime-assert] "))
    .map(l => JSON.parse(l.slice("[s05-runtime-assert] ".length)));
  const runtimeSummaries = [...runtimeLog.matchAll(/^\[s05-runtime-summary\] case=(\S+) pass=(\d+) fail=(\d+)$/gm)];
  assert.deepEqual(runtimeSummaries.map(m => m[1]).sort(), [...runtimeCases].sort(), "runtime 시나리오 summary 누락/중복");
  assert(!runtimeLog.includes("[s05-runtime-fail]"), "runtime 실패 포함");
  const mutations = [...runtimeLog.matchAll(/^\[s05-runtime-mutation\] (.+)$/gm)].map(m => m[1]);
  assert.deepEqual(mutations.sort(), [
    "disabled-guard: PASS (실제 assertion의 RED 확인)",
    "prequeue-admission: PASS (실제 assertion의 RED 확인)",
  ], "runtime mutation 결과 누락/중복/오류");
  const negatives = [...runtimeLog.matchAll(/^\[s05-runtime-negative\] pass=(\d+) fail=(\d+) elapsedMs=\d+$/gm)];
  assert.equal(negatives.length, 1, "runtime negative summary 누락/중복");
  assert.equal(Number(negatives[0][1]), 2, "runtime negative PASS 수 불일치");
  assert.equal(Number(negatives[0][2]), 0, "runtime negative summary 실패");
  assert(runtimeResults.every(r => runtimeCases.includes(r.case)), "runtime 알 수 없는 결과 시나리오");
  for (const summary of runtimeSummaries) {
    assert.equal(Number(summary[3]), 0, "runtime 실패 summary");
    const actual = runtimeResults.filter(r => r.case === summary[1]).map(r => r.message);
    const expected = allChecks.filter(c => c.testFile === runtimeFile && c.runtimeCase === summary[1]).map(c => c.message);
    assert.equal(actual.length, Number(summary[2]), "runtime 개별 결과 수 불일치");
    assert.deepEqual([...actual].sort(), [...expected].sort(), "runtime assertion 누락/중복/알 수 없는 결과");
  }
  return rows.map(row => {
    const checks = row.checks.map(check => {
      const testFile = check.testFile ?? row.testFile;
      const results = testFile === runtimeFile
        ? runtimeResults.filter(r => r.case === check.runtimeCase).map(r => r.message)
        : testFile === cppFile ? cppResults : appResults;
      const executions = results.filter(m => m === check.message).length;
      assert(executions > 0, `${check.id}: 실제 assertion 성공 결과 없음`);
      return { id: check.id, status: "PASS", executions };
    });
    return { id: row.id, status: "PASS", checks };
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    const rows = validateS05Registration({ rootDir });
    const args = process.argv.slice(2);
    assert(args.length === 0 || (args.length === 4 && args[0] === "--results"), "사용법: [--results cpp-log app-log runtime-log]");
    if (args.length === 0) {
      console.log("[S05 등록 대조] 27개 연결 확인; 실행 증거 아님");
    } else {
      const results = validateS05Execution(rows, ...args.slice(1).map(p => fs.readFileSync(p, "utf8")));
      for (const row of results) console.log("[s05-action] " + JSON.stringify(row));
      console.log("[S05 개별 실행] pass=27 fail=0");
    }
  } catch (error) {
    console.error("[S05 등록/결과 대조] FAIL: " + error.message);
    process.exitCode = 1;
  }
}
