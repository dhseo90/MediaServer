#!/usr/bin/env node
// 파일 용도: Ops 채널/룰/사용자 데이터 테이블의 반응형 폭, 셀 침범, 동적 리사이즈 안정성을 검증한다.

import os from "node:os";
import path from "node:path";
import process from "node:process";
import fs from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

import {
  cleanupRulePreviewPrerequisites,
  ensureRulePreviewPrerequisites,
} from "./rule_preview_fixture_helpers.mjs";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { findChrome, openBrowserPage, parseWidthList } from "./ui_visual_smoke_lib.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Ops table layout smoke

Usage:
  ./server.sh verify-ops-tables-layout [options]

Options:
  --http-base <url>         실행 중인 서버 HTTP base입니다. 기본 http://127.0.0.1:8081.
  --timeout-ms <ms>         브라우저 대기 시간입니다. 기본 15000.
  --chrome-path <path>      Chrome/Chromium 실행 파일 경로입니다.
  --widths <csv>            반응형 검증 viewport 폭 목록입니다.
  --height <px>             viewport 높이입니다. 기본 900.
  --debug-port-base <port>  Chrome CDP port 시작값입니다. 기본 9790.
  --output-dir <path>       screenshot/log 출력 디렉터리입니다.
  -h, --help                도움말 출력
`);
}
assertKnownOptions(rawArgs, [
  "http-base",
  "timeout-ms",
  "chrome-path",
  "widths",
  "height",
  "debug-port-base",
  "output-dir",
  "h",
  "help",
]);
const args = parseArgs(rawArgs);
const httpBase = String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const timeoutMs = Number(args.timeoutMs || 15000);
const chromePath = args.chromePath || findChrome();
const widths = parseWidthList(args.widths || "1180,900,760,560,390,320,760,1180");
const height = Number(args.height || 900);
const debugPortBase = Number(args.debugPortBase || 9790);
const outputDir = args.outputDir || path.join(os.tmpdir(), `media_server_ops_tables_layout_${Date.now()}_${process.pid}`);

const checks = [
  {
    name: "channels",
    path: "/ops/sources",
    root: '[data-testid="ops-sources-page"]',
    readySelectors: ["#channels-body"],
    tableSelectors: [".channel-table.ops-responsive-table"],
    detailSelectors: ["#channel-detail-panel.ops-detail-panel"],
    detailOpenSelector: "[data-view-channel]",
    auditSelector: "#channel-audit-list",
  },
  {
    name: "rules",
    path: "/ops/rules",
    root: '[data-testid="ops-rules-page"]',
    readySelectors: ["#opsVaRuleRows", "#opsEventRuleRows", "#opsProfileRows"],
    tableSelectors: [".ops-rules-table.ops-responsive-table"],
    detailSelectors: ["#opsRulesDetailPanel.ops-detail-panel"],
    detailOpenSelector: '[data-ops-rule-action="view-va"]',
    auditSelector: "#ops-rules-audit-list",
  },
  {
    name: "users",
    path: "/ops/users",
    root: '[data-testid="ops-users-page"]',
    readySelectors: ["#users-body", "#access-requests-body"],
    tableSelectors: [".user-table.ops-responsive-table"],
    detailSelectors: ["#user-detail-panel.ops-detail-panel"],
    detailOpenSelector: "[data-user-view]",
    auditSelector: "#user-audit-list",
  },
];

if (!chromePath) {
  console.error("[fail] Chrome executable not found");
  process.exit(1);
}

assertSharedTableHelpers();

let passCount = 0;
let failCount = 0;
const failures = [];
const seededRulePrereqs = await ensureRulePreviewPrerequisites({ httpBase, includeVaRule: true });

for (let index = 0; index < checks.length; index += 1) {
  const check = checks[index];
  const browser = await openBrowserPage({
    httpBase,
    pagePath: check.path,
    timeoutMs,
    chromePath,
    debugPort: debugPortBase + index,
    width: Math.max(...widths),
    height,
    outputDir,
  });
  try {
    await assertTablesReady(browser, check);
    for (const width of widths) {
      await setViewport(browser, width, height);
      await assertTablesReady(browser, check);
      const result = await browser.evaluate(layoutCheckExpression(check), 10000);
      const label = `${check.name}-${width}`;
      if (!result?.ok) {
        const details = Array.isArray(result?.issues) ? result.issues.join("; ") : JSON.stringify(result);
        throw new Error(`${label}: ${details}`);
      }
      passCount += 1;
      console.log(`[pass] ${label}: tables=${result.tableCount}, overflow=${result.overflowX}`);
      const detailResult = await browser.evaluate(detailAndAuditCheckExpression(check), 10000);
      if (!detailResult?.ok) {
        const details = Array.isArray(detailResult?.issues) ? detailResult.issues.join("; ") : JSON.stringify(detailResult);
        throw new Error(`${label}-detail-audit: ${details}`);
      }
      passCount += 1;
      console.log(`[pass] ${label}-detail-audit: detail=${detailResult.detailChecked ? 1 : 0}, controls=${detailResult.auditControlCount}`);
    }
  } catch (error) {
    failCount += 1;
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`[${check.name}] ${message}`);
    console.log(`[fail] ${check.name}: ${message}`);
  } finally {
    await browser.close();
  }
}

await cleanupRulePreviewPrerequisites({ httpBase, created: seededRulePrereqs });

console.log("");
console.log("== Ops 데이터 테이블 레이아웃 요약 ==");
console.log(`- 통과: ${passCount}`);
console.log(`- 실패: ${failCount}`);
if (failures.length > 0) {
  console.log("- 실패 상세:");
  for (const failure of failures) {
    console.log(`  - ${failure}`);
  }
  process.exit(1);
}

async function setViewport(browser, width, viewportHeight) {
  await browser.cdp("Emulation.setDeviceMetricsOverride", {
    width,
    height: viewportHeight,
    deviceScaleFactor: 1,
    mobile: width <= 560,
  });
  await browser.evaluate(
    "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
    3000,
  );
}

async function assertTablesReady(browser, check) {
  await waitForResult(
    browser,
    `
      (() => {
        const root = document.querySelector(${JSON.stringify(check.root)});
        const readySelectors = ${JSON.stringify(check.readySelectors)};
        const bodies = readySelectors.map(selector => document.querySelector(selector));
        const missing = readySelectors.filter((_, index) => !bodies[index]);
        const loading = bodies
          .filter(Boolean)
          .filter(body => /로딩 중/.test(body.textContent || ''))
          .map(body => body.id || body.tagName);
        return {
          ok: document.readyState === 'complete' && !!root && missing.length === 0 && loading.length === 0,
          pathname: window.location.pathname,
          missing,
          loading
        };
      })()
    `,
    result => result?.ok === true,
    `${check.name} table ready`,
  );
}

function layoutCheckExpression(check) {
  return `
    (() => {
      const tableSelectors = ${JSON.stringify(check.tableSelectors)};
      const issues = [];
      const issue = message => {
        if (issues.length < 16) issues.push(message);
      };
      const isVisible = node => {
        if (!node) return false;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const doc = document.documentElement;
      const body = document.body;
      const overflowX = Math.max(0, Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth);
      if (overflowX > 2) {
        issue('document horizontal overflow ' + overflowX + 'px');
      }
      const tables = tableSelectors.flatMap(selector => Array.from(document.querySelectorAll(selector)));
      if (tables.length === 0) {
        issue('missing target table: ' + tableSelectors.join(','));
      }
      const detailSelectors = ${JSON.stringify(check.detailSelectors || [])};
      for (const selector of detailSelectors) {
        if (!document.querySelector(selector)) {
          issue('missing shared detail panel selector ' + selector);
        }
      }
      const targetTables = new Set(tables);
      for (const wrap of Array.from(document.querySelectorAll('.table-wrap'))) {
        const table = wrap.querySelector('table');
        if (!targetTables.has(table)) continue;
        const overflow = Math.max(0, wrap.scrollWidth - wrap.clientWidth);
        if (overflow > 2) {
          issue(labelFor(table) + ' wrapper overflow ' + overflow + 'px');
        }
      }
      for (const table of tables) {
        if (!isVisible(table)) continue;
        const tableLabel = labelFor(table);
        if (!table.classList.contains('ops-responsive-table')) {
          issue(tableLabel + ' missing ops-responsive-table class');
        }
        for (const cell of Array.from(table.querySelectorAll('th, td'))) {
          if (!isVisible(cell)) continue;
          const cellLabel = tableLabel + ' ' + (cell.getAttribute('data-label') || cell.textContent || cell.tagName).trim().slice(0, 42);
          const scrollOverflow = Math.max(0, cell.scrollWidth - Math.ceil(cell.clientWidth));
          if (scrollOverflow > 2) {
            issue(cellLabel + ' cell scroll overflow ' + scrollOverflow + 'px');
          }
          const cellRect = cell.getBoundingClientRect();
          for (const child of Array.from(cell.children)) {
            if (!isVisible(child)) continue;
            const childRect = child.getBoundingClientRect();
            if (childRect.left < cellRect.left - 2 || childRect.right > cellRect.right + 2) {
              issue(cellLabel + ' child exceeds cell bounds');
              break;
            }
          }
        }
        for (const group of Array.from(table.querySelectorAll('.table-actions, .ops-rule-row-actions, .user-row-actions, .channel-row-actions, .channel-stream-actions'))) {
          if (!isVisible(group)) continue;
          if (!group.classList.contains('ops-row-actions')) {
            issue(tableLabel + ' action group missing ops-row-actions');
          }
          const overflow = Math.max(0, group.scrollWidth - Math.ceil(group.clientWidth));
          if (overflow > 2) {
            issue(tableLabel + ' action group overflow ' + overflow + 'px');
          }
        }
      }
      return {
        ok: issues.length === 0,
        tableCount: tables.length,
        overflowX,
        issues,
        viewport: { width: window.innerWidth, height: window.innerHeight }
      };
      function labelFor(table) {
        if (!table) return 'unknown-table';
        if (table.classList.contains('channel-table')) return 'channel-table';
        if (table.classList.contains('ops-rules-va-table')) return 'ops-rules-va-table';
        if (table.classList.contains('ops-rules-event-table')) return 'ops-rules-event-table';
        if (table.classList.contains('ops-rules-profile-table')) return 'ops-rules-profile-table';
        if (table.classList.contains('user-table')) return 'user-table';
        return table.className || table.tagName;
      }
    })()
  `;
}

function detailAndAuditCheckExpression(check) {
  return `
    (async () => {
      const issues = [];
      const issue = message => {
        if (issues.length < 16) issues.push(message);
      };
      const isVisible = node => {
        if (!node) return false;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const overflowFor = node => node ? Math.max(0, node.scrollWidth - Math.ceil(node.clientWidth)) : 0;
      const doc = document.documentElement;
      const body = document.body;
      const overflowX = Math.max(0, Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth);
      if (overflowX > 2) issue('document horizontal overflow before detail ' + overflowX + 'px');

      let detailChecked = false;
      const openSelector = ${JSON.stringify(check.detailOpenSelector || "")};
      const detailSelectors = ${JSON.stringify(check.detailSelectors || [])};
      if (openSelector) {
        const opener = Array.from(document.querySelectorAll(openSelector)).find(isVisible);
        if (opener) {
          opener.click();
          await new Promise(resolve => setTimeout(resolve, 350));
          for (const selector of detailSelectors) {
            const panel = document.querySelector(selector);
            if (!isVisible(panel)) {
              issue('detail panel did not open: ' + selector);
              continue;
            }
            detailChecked = true;
            const panelRect = panel.getBoundingClientRect();
            if (panelRect.left < -1 || panelRect.right > window.innerWidth + 1) {
              issue('detail panel outside viewport: ' + Math.round(panelRect.left) + '..' + Math.round(panelRect.right));
            }
            const toolbar = panel.querySelector('.toolbar');
            if (toolbar && overflowFor(toolbar) > 2) {
              issue('detail toolbar overflow ' + overflowFor(toolbar) + 'px');
            }
            for (const actionGroup of Array.from(panel.querySelectorAll('.actions, .table-actions, .ops-row-actions'))) {
              if (!isVisible(actionGroup)) continue;
              const overflow = overflowFor(actionGroup);
              if (overflow > 2) issue('detail action group overflow ' + overflow + 'px');
            }
            for (const field of Array.from(panel.querySelectorAll('input, select, textarea, button'))) {
              if (!isVisible(field)) continue;
              const rect = field.getBoundingClientRect();
              if (rect.left < panelRect.left - 2 || rect.right > panelRect.right + 2) {
                issue('detail control outside panel bounds: ' + (field.id || field.name || field.tagName));
              }
            }
          }
        } else {
          issue('missing visible detail opener: ' + openSelector);
        }
      }

      const auditSelector = ${JSON.stringify(check.auditSelector || "")};
      let auditControlCount = 0;
      if (auditSelector) {
        const audit = document.querySelector(auditSelector);
        if (!audit) {
          issue('missing audit selector ' + auditSelector);
        } else {
          audit.scrollIntoView({ block: 'center' });
          await new Promise(resolve => setTimeout(resolve, 120));
          const auditRect = audit.getBoundingClientRect();
          const controls = Array.from(audit.querySelectorAll('input, select, button'));
          auditControlCount = controls.length;
          if (controls.length < 8) issue('audit controls missing or not rendered: ' + controls.length);
          for (const control of controls) {
            if (!isVisible(control)) continue;
            const rect = control.getBoundingClientRect();
            if (rect.left < auditRect.left - 2 || rect.right > auditRect.right + 2) {
              issue('audit control outside audit panel: ' + (control.id || control.dataset.auditPreset || control.textContent || control.tagName));
            }
            if (rect.left < -1 || rect.right > window.innerWidth + 1) {
              issue('audit control outside viewport: ' + Math.round(rect.left) + '..' + Math.round(rect.right));
            }
          }
          const presets = audit.querySelector('.audit-presets');
          if (presets && overflowFor(presets) > 2) {
            issue('audit presets overflow ' + overflowFor(presets) + 'px');
          }
        }
      }

      const finalOverflowX = Math.max(0, Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth);
      if (finalOverflowX > 2) issue('document horizontal overflow after detail/audit ' + finalOverflowX + 'px');
      return {
        ok: issues.length === 0,
        issues,
        detailChecked,
        auditControlCount,
        overflowX: finalOverflowX,
        viewport: { width: window.innerWidth, height: window.innerHeight }
      };
    })()
  `;
}

function assertSharedTableHelpers() {
  const shared = fs.readFileSync("src/ingress/product_ui_js.cpp", "utf8");
  const pages = fs.readFileSync("src/ingress/product_ui_page_scripts.cpp", "utf8");
  const requiredShared = [
    "opsRowActionsHtml",
    "opsTableRowHtml",
    "setOpsDetailPanelOpen",
    "table-actions",
    "ops-row-actions",
    "ops-detail-panel",
  ];
  const requiredPages = [
    "opsRowActionsHtml(",
    "opsTableRowHtml([",
    "setOpsDetailPanelOpen(",
    "channel-row-actions",
    "ops-rule-row-actions",
    "user-row-actions",
  ];
  for (const snippet of requiredShared) {
    if (!shared.includes(snippet)) throw new Error(`shared table helper missing: ${snippet}`);
  }
  for (const snippet of requiredPages) {
    if (!pages.includes(snippet)) throw new Error(`page table helper usage missing: ${snippet}`);
  }
}

async function waitForResult(browser, expression, predicate, description) {
  const startedAt = Date.now();
  let last = null;
  while (Date.now() - startedAt < timeoutMs) {
    last = await browser.evaluate(expression, 5000).catch(error => ({ ok: false, error: error.message }));
    if (predicate(last)) return last;
    await delay(200);
  }
  throw new Error(`${description} timeout: ${JSON.stringify(last)}`);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}
