// 파일 용도: 역사적 986개와 분리된 S05 정식 등록 및 실제 check 결과를 엄격하게 대조한다.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ids = Array.from({ length: 27 }, (_, i) => `V410-S05-I${String(i + 1).padStart(2, "0")}`);
const fixture = "test/fixtures/recording/v1/s05-action-inventory.json";
const cppFile = "scripts/internal/event_recording_link_smoke.cpp";
const appFile = "scripts/internal/verify_v390_event_storage_application_boundary.mjs";

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
    const source = read(row.testFile);
    const marker = row.testFile === cppFile ? `void ${row.testSymbol}(` : `check("${row.testSymbol}",`;
    const start = source.indexOf(marker);
    assert(start >= 0, `${row.id}: 시험 함수/check 없음`);
    const next = source.indexOf(row.testFile === cppFile ? "\nvoid Verify" : "\ncheck(", start + marker.length);
    const body = source.slice(start, next < 0 ? source.length : next);
    assert(row.checks.length > 0, `${row.id}: check 없음`);
    for (const [checkIndex, check] of row.checks.entries()) {
      assert.equal(check.id, `${row.id}-C${String(checkIndex + 1).padStart(2, "0")}`);
      assert(!checkIds.has(check.id) && !messages.has(check.message), "중복 check 정의");
      assert(typeof check.message === "string" && check.message.trim(), "기대 메시지 없음");
      // 함수 내부에 실제 assertion 메시지/check 이름이 있어야 한다. 이는 실행 판정이 아니다.
      const declared = row.testFile === appFile
        ? source.includes(`check("${check.message}",`)
        : body.includes(JSON.stringify(check.message));
      assert(declared, `${check.id}: 시험 함수에 assertion 없음`);
      assert(cells[3].includes(check.id), `${check.id}: 문서 연결 없음`);
      checkIds.add(check.id); messages.add(check.message);
    }
  }
  assert(inventoryText.includes("| 현재 등록 총계 | 1013 |"), "legacy 986 + S05 27 총계 불일치");
  return manifest.rows;
}

export function validateS05Execution(rows, cppLog, appLog) {
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
  const expectedApp = rows.filter(r => r.testFile === appFile).flatMap(r => r.checks.map(c => c.message));
  assert.deepEqual([...appResults].sort(), [...expectedApp].sort(), "application 결과 exact 집합 불일치");
  assert(!cppLog.includes("[fail]") && !appLog.includes("- FAIL:"), "실패를 포함한 실행 로그");
  return rows.map(row => {
    const results = row.testFile === cppFile ? cppResults : appResults;
    const checks = row.checks.map(check => {
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
    assert(args.length === 0 || (args.length === 3 && args[0] === "--results"), "사용법: [--results cpp-log app-log]");
    if (args.length === 0) {
      console.log("[S05 등록 대조] 27개 연결 확인; 실행 증거 아님");
    } else {
      const results = validateS05Execution(rows, fs.readFileSync(args[1], "utf8"), fs.readFileSync(args[2], "utf8"));
      for (const row of results) console.log("[s05-action] " + JSON.stringify(row));
      console.log("[S05 개별 실행] pass=27 fail=0");
    }
  } catch (error) {
    console.error("[S05 등록/결과 대조] FAIL: " + error.message);
    process.exitCode = 1;
  }
}
