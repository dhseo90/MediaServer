// 파일 용도: v3.9 backlog 진행 상태 표를 구조적으로 parse하고 단일 expected-state fixture와 대조한다.

import fs from "node:fs";
import path from "node:path";

export const V390_ENTRY_BASELINE_EXPECTATION_PATH =
  "test/fixtures/v390_entry_baseline_steps.json";

export function loadV390EntryBaselineExpectation(rootDir) {
  return JSON.parse(fs.readFileSync(
    path.join(rootDir, V390_ENTRY_BASELINE_EXPECTATION_PATH),
    "utf8",
  ));
}

export function parseV390ProgressTable(markdown, tableHeading) {
  const headingMatches = [...markdown.matchAll(new RegExp(`^${escapeRegExp(tableHeading)}$`, "gm"))];
  if (headingMatches.length !== 1) {
    return {
      rows: [],
      errors: [`progress heading must appear exactly once, got ${headingMatches.length}`],
    };
  }

  const afterHeading = markdown.slice(headingMatches[0].index + tableHeading.length);
  const lines = afterHeading.split(/\r?\n/);
  const headerIndex = lines.findIndex(line => line.trim().startsWith("| 번호 |"));
  if (headerIndex < 0) return { rows: [], errors: ["progress table header missing"] };

  const expectedHeader = ["번호", "제목", "우선순위", "상태", "완료/잔여 내용"];
  const header = parseCells(lines[headerIndex]);
  if (JSON.stringify(header) !== JSON.stringify(expectedHeader)) {
    return { rows: [], errors: [`progress table header drift: ${header.join(" | ")}`] };
  }
  if (!/^\|(?:\s*:?-+:?\s*\|){5}$/.test(lines[headerIndex + 1] || "")) {
    return { rows: [], errors: ["progress table separator missing or malformed"] };
  }

  const rows = [];
  for (const line of lines.slice(headerIndex + 2)) {
    if (!line.startsWith("|")) break;
    const cells = parseCells(line);
    if (cells.length !== expectedHeader.length) {
      return { rows, errors: [`progress table row has ${cells.length} cells: ${line}`] };
    }
    const id = Number.parseInt(cells[0], 10);
    if (!Number.isInteger(id)) return { rows, errors: [`progress table step ID is not numeric: ${cells[0]}`] };
    rows.push({
      id,
      title: cells[1],
      priority: cells[2],
      status: cells[3],
      detail: cells[4],
    });
  }
  return { rows, errors: [] };
}

export function validateV390EntryBaselineSteps(markdown, expectation) {
  const errors = [];
  if (expectation?.schema !== "media-server.v390-entry-baseline-steps.v1") {
    errors.push("entry baseline expectation schema drift");
  }
  if (!Array.isArray(expectation?.steps) || expectation.steps.length === 0) {
    errors.push("entry baseline expectation steps missing");
    return { ok: false, errors, rows: [] };
  }

  const parsed = parseV390ProgressTable(markdown, expectation.tableHeading || "");
  errors.push(...parsed.errors);
  const byId = new Map();
  for (const row of parsed.rows) {
    const matches = byId.get(row.id) || [];
    matches.push(row);
    byId.set(row.id, matches);
  }

  for (const expected of expectation.steps) {
    const matches = byId.get(expected.id) || [];
    if (matches.length === 0) {
      errors.push(`missing step ${expected.id}`);
      continue;
    }
    if (matches.length > 1) {
      errors.push(`duplicate step ${expected.id}`);
      continue;
    }
    const actual = matches[0];
    if (actual.title !== expected.title) errors.push(`step ${expected.id} title drift`);
    if (actual.priority !== expected.priority) errors.push(`step ${expected.id} priority drift`);
    if (actual.status !== expected.status) errors.push(`step ${expected.id} status drift`);
    for (const snippet of expected.detailIncludes || []) {
      if (!actual.detail.includes(snippet)) {
        errors.push(`step ${expected.id} historical/current boundary missing: ${snippet}`);
      }
    }
  }

  return { ok: errors.length === 0, errors, rows: parsed.rows };
}

function parseCells(line) {
  return line.split("|").slice(1, -1).map(cell => cell.trim());
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
