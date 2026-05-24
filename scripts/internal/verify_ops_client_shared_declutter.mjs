#!/usr/bin/env node
// 파일 용도: Ops/Client shared UI declutter가 row action을 대표 작업 + context action으로 정리했는지 검증한다.

import fs from "node:fs";
import process from "node:process";

import { findChrome, openBrowserPage } from "./ui_visual_smoke_lib.mjs";

const args = parseArgs(process.argv.slice(2));
const failures = [];

const sharedUi = readText("src/ingress/product_ui_js.cpp");
const script = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const clientReduction = readText("scripts/internal/verify_client_action_reduction.mjs");
const serverSh = readText("server.sh");

check("shared UI helper renders primary action plus context actions", () => {
  for (const snippet of [
    "const opsContextActionsHtml",
    'data-testid="ops-context-actions"',
    'data-action-density="primary-context"',
    "ops-context-actions-menu",
    "opsRowActionsHtml(`${primary}${menu}`",
  ]) {
    assertIncludes(sharedUi, snippet, "shared context action helper");
  }
});

check("Ops rules use context action rows", () => {
  for (const snippet of [
    "'ops-rule-row-actions'",
    "opsContextActionsHtml(normalized[0] || ''",
  ]) {
    assertIncludes(script, snippet, "Ops rules context action usage");
  }
});

check("Ops channels use context action rows", () => {
  for (const snippet of [
    "data-view-channel=",
    "data-clone-channel=",
    "data-open-client-live=",
    "data-delete-channel=",
    "'channel-row-actions'",
  ]) {
    assertIncludes(script, snippet, "Ops channel context action usage");
  }
});

check("Ops users use context action rows", () => {
  for (const snippet of [
    "data-user-view=",
    "data-user-reset-password=",
    "data-user-set-enabled=",
    "'user-row-actions'",
  ]) {
    assertIncludes(script, snippet, "Ops user context action usage");
  }
});

check("context action styling avoids always-expanded table buttons", () => {
  for (const snippet of [
    ".ops-context-row-actions",
    ".ops-context-actions > summary",
    ".ops-context-actions-menu",
    ".ops-context-actions[open] > summary",
    ".channel-row-actions.ops-context-row-actions",
    ".user-row-actions.ops-context-row-actions",
    "@media (max-width: 560px)",
  ]) {
    assertIncludes(css, snippet, "context action CSS");
  }
});

check("client action reduction baseline remains tracked", () => {
  for (const snippet of [
    'data-testid="client-live-action-reduction"',
    'data-action-model="source-drag,tile-selection,icon-actions,keyboard-shortcuts"',
    "tile actions use icon-only contextual buttons",
  ]) {
    assertIncludes(script + clientReduction, snippet, "client action reduction guard");
  }
});

check("ops client smoke includes shared declutter verifier", () => {
  for (const snippet of [
    "opsContextActionsHtml",
    'data-testid="ops-context-actions"',
    'data-action-density="primary-context"',
  ]) {
    assertIncludes(uiSmoke, snippet, "shared declutter UI smoke wiring");
  }
});

check("server command includes shared declutter verifier", () => {
  for (const snippet of [
    "verify-ops-client-shared-declutter",
    "verify_ops_client_shared_declutter.mjs",
  ]) {
    assertIncludes(serverSh, snippet, "shared declutter server wiring");
  }
});

if (args.browserSmoke) {
  await runBrowserSmoke();
}

if (failures.length > 0) {
  console.log("");
  console.log("== Ops/Client shared UI declutter 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== Ops/Client shared UI declutter 통과 ==");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function parseArgs(rawArgs) {
  const parsed = {
    browserSmoke: false,
    httpBase: "http://127.0.0.1:8081",
    timeoutMs: 10000,
    chromePath: "",
    debugPort: 9944,
  };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--browser-smoke") {
      parsed.browserSmoke = true;
    } else if (arg === "--http-base") {
      parsed.httpBase = rawArgs[++index] || parsed.httpBase;
    } else if (arg === "--timeout-ms") {
      parsed.timeoutMs = Number(rawArgs[++index] || parsed.timeoutMs);
    } else if (arg === "--chrome-path") {
      parsed.chromePath = rawArgs[++index] || "";
    } else if (arg === "--debug-port") {
      parsed.debugPort = Number(rawArgs[++index] || parsed.debugPort);
    } else {
      failures.push(`unknown option: ${arg}`);
      console.log(`[fail] unknown option: ${arg}`);
    }
  }
  return parsed;
}

function check(name, fn) {
  try {
    fn();
    console.log(`[pass] ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.log(`[fail] ${name}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}

async function runBrowserSmoke() {
  const source = await inspectContextPage("/ops/sources", `
    const primary = document.querySelector('[data-view-channel]');
    const context = document.querySelector('.channel-row-actions [data-testid="ops-context-actions"]');
    context?.querySelector('summary')?.click();
    await wait(120);
    return {
      ok: visible(primary) &&
        context?.dataset?.actionDensity === 'primary-context' &&
        visible(context?.querySelector('.ops-context-actions-menu')) &&
        visible(context?.querySelector('[data-clone-channel]')) &&
        visible(context?.querySelector('[data-delete-channel]')),
      primary: Boolean(primary),
      context: context?.outerHTML || '',
    };
  `, 0);
  const users = await inspectContextPage("/ops/users", `
    const primary = document.querySelector('[data-user-view]');
    const context = document.querySelector('.user-row-actions [data-testid="ops-context-actions"]');
    const addButton = document.querySelector('#add-user-btn');
    const usersText = document.querySelector('#users-body')?.textContent || '';
    const resetEmpty = !primary && /사용자 저장소|등록된 사용자가 없습니다/.test(usersText);
    context?.querySelector('summary')?.click();
    await wait(120);
    if (resetEmpty) {
      return {
        ok: visible(addButton),
        primary: false,
        context: '',
        resetEmpty: true,
      };
    }
    return {
      ok: visible(primary) &&
        context?.dataset?.actionDensity === 'primary-context' &&
        visible(context?.querySelector('[data-user-reset-password]')) &&
        visible(context?.querySelector('[data-user-set-enabled]')),
      primary: Boolean(primary),
      context: context?.outerHTML || '',
    };
  `, 1);
  const rules = await inspectContextPage("/ops/rules", `
    const primary = document.querySelector('[data-ops-rule-action]');
    const context = document.querySelector('.ops-rule-row-actions [data-testid="ops-context-actions"]');
    context?.querySelector('summary')?.click();
    await wait(120);
    return {
      ok: Boolean(primary) &&
        (!context || (
          context.dataset?.actionDensity === 'primary-context' &&
          visible(context.querySelector('[data-ops-rule-action*="delete"]'))
        )),
      primary: Boolean(primary),
      context: context?.outerHTML || '',
    };
  `, 2);
  const result = {
    ok: source.ok && users.ok && rules.ok && source.forbidden.length === 0 && users.forbidden.length === 0 && rules.forbidden.length === 0,
    source,
    users,
    rules,
  };
  check("browser context actions keep primary visible", () => {
    assert(Boolean(source.primary), "source primary action missing");
    assert(Boolean(users.primary) || users.resetEmpty, "users primary action missing");
    assert(Boolean(rules.primary), "rules primary action missing");
  });
  check("browser context actions keep secondary contextual", () => {
    assert(Boolean(result?.ok), "browser result was not ok");
  });
  if (!result?.ok) console.log(JSON.stringify(result, null, 2));
}

async function inspectContextPage(pagePath, bodyScript, portOffset) {
  const browser = await openBrowserPage({
    httpBase: args.httpBase,
    pagePath,
    timeoutMs: args.timeoutMs,
    chromePath: args.chromePath || findChrome(),
    debugPort: args.debugPort + portOffset,
    width: 1180,
    height: 900,
  });
  try {
    return await browser.evaluate(
      `
        (async () => {
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          const visible = el => {
            if (!el) return false;
            const rect = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
          };
          await wait(500);
          const pageResult = await (async () => { ${bodyScript} })();
          const text = document.body.innerText || '';
          const forbidden = ['raw JSON', 'debugCounters', 'BBox diagnostics', 'passwordHash', 'tokenHash']
            .filter(item => text.includes(item));
          return { ...pageResult, forbidden, overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth) };
        })()
      `,
      args.timeoutMs,
    );
  } finally {
    await browser.close();
  }
}
