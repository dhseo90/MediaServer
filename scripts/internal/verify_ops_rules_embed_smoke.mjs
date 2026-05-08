#!/usr/bin/env node

import path from "node:path";
import process from "node:process";

import { findChrome, openBrowserPage } from "./ui_visual_smoke_lib.mjs";

const args = parseArgs(process.argv.slice(2));
const httpBase = String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const timeoutMs = Number(args.timeoutMs || 12000);
const chromePath = args.chromePath || findChrome();
const debugPort = Number(args.debugPort || 9899);
const outputDir = args.outputDir || path.join("/tmp", `media_server_ops_rules_native_${Date.now()}_${process.pid}`);

if (!chromePath) {
  console.error("[fail] Chrome executable not found");
  process.exit(1);
}

const browser = await openBrowserPage({
  httpBase,
  pagePath: "/ops/rules",
  timeoutMs,
  chromePath,
  debugPort,
  width: 1280,
  height: 900,
  outputDir,
});

try {
  const result = await browser.evaluate(buildRulesOpenExpression(), timeoutMs);
  if (!result?.ok) {
    throw new Error(JSON.stringify(result));
  }
  const usersNav = await clickNavAndWait(browser, "/ops/users");
  if (!usersNav?.ok) {
    throw new Error(JSON.stringify(usersNav));
  }
  const rulesNav = await clickNavAndWait(browser, "/ops/rules");
  if (!rulesNav?.ok) {
    throw new Error(JSON.stringify(rulesNav));
  }
  const returned = await browser.evaluate(buildReturnedRulesExpression(), timeoutMs);
  if (!returned?.ok) {
    throw new Error(JSON.stringify(returned));
  }
  const sourcesNav = await clickNavAndWait(browser, "/ops/sources");
  if (!sourcesNav?.ok) {
    throw new Error(JSON.stringify(sourcesNav));
  }
  console.log("[pass] ops-rules-native-smoke");
  console.log(JSON.stringify({ ...result, returned, usersNav, rulesNav, sourcesNav }, null, 2));
} finally {
  await browser.close();
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      parsed[toCamel(raw.slice(0, eq))] = raw.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[toCamel(raw)] = next;
      index += 1;
    } else {
      parsed[toCamel(raw)] = "1";
    }
  }
  return parsed;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}

async function clickNavAndWait(browser, path) {
  const clicked = await browser.evaluate(`
    (() => {
      const visible = (node) => Boolean(node) && !node.hidden && getComputedStyle(node).display !== 'none';
      const link = Array.from(document.querySelectorAll('a[href="${path}"]')).find(node => visible(node));
      if (!link) return { ok: false, message: 'missing visible nav link', path: ${JSON.stringify(path)} };
      setTimeout(() => link.click(), 0);
      return { ok: true, href: link.getAttribute('href') || '' };
    })()
  `, timeoutMs);
  if (!clicked?.ok) return clicked;
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const state = await browser.evaluate(`
      (() => ({
        readyState: document.readyState,
        pathname: window.location.pathname,
        title: document.title
      }))()
    `, 3000).catch((error) => ({ error: error.message }));
    if (state.readyState === "complete" && String(state.pathname || "").endsWith(path)) {
      return { ok: true, path, title: state.title || "" };
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return { ok: false, message: "navigation timeout", path };
}

function buildRulesOpenExpression() {
  return `
    (async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const fail = (message, extra = {}) => ({ ok: false, message, ...extra });
      const visible = (node) => Boolean(node) && !node.hidden && getComputedStyle(node).display !== 'none';
      const click = (id) => {
        const button = document.getElementById(id);
        if (!button) throw new Error('missing button ' + id);
        button.click();
        return button;
      };
      const status = document.getElementById('opsRulesStatus');
      const detailPanel = document.getElementById('opsRulesDetailPanel');
      const vaSection = document.getElementById('opsVaRulesSection');
      const eventSection = document.getElementById('opsEventRulesSection');
      const profileSection = document.getElementById('opsProfileRulesSection');

      if (!visible(vaSection) || visible(eventSection) || visible(profileSection)) {
        return fail('rules page did not start in va section only', {
          vaVisible: visible(vaSection),
          eventVisible: visible(eventSection),
          profileVisible: visible(profileSection)
        });
      }

      click('opsCreateVaRuleBtn');
      await wait(400);
      const vaForm = document.getElementById('opsVaRuleForm');
      const vaChannelSelect = document.getElementById('opsVaRuleChannelSelect');
      if (!visible(detailPanel) || !visible(vaForm)) {
        return fail('detail panel did not open after create va rule', {
          detailHidden: detailPanel?.hidden ?? null,
          vaFormHidden: vaForm?.hidden ?? null,
          statusText: status?.textContent || ''
        });
      }
      const optionTexts = Array.from(vaChannelSelect?.options || []).map(option => option.textContent || '');
      if (!optionTexts.some(text => text.includes('Sample H264'))) {
        return fail('channel options missing expected source', { optionTexts });
      }

      click('opsAddEventRuleBtn');
      await wait(400);
      if (!visible(eventSection) || visible(vaSection) || visible(detailPanel)) {
        return fail('switching to event tab should close detail and show only event section', {
          vaVisible: visible(vaSection),
          eventVisible: visible(eventSection),
          detailVisible: visible(detailPanel)
        });
      }

      click('opsCreateEventRuleBtn');
      await wait(400);
      const eventForm = document.getElementById('opsEventRuleForm');
      if (!eventForm || !visible(detailPanel)) {
        return fail('detail panel did not open after create event template', {
          detailHidden: detailPanel?.hidden ?? null,
          statusText: status?.textContent || ''
        });
      }
      const eventChannelSelect = document.getElementById('opsVaRuleChannelSelect');
      if (visible(eventChannelSelect) && !document.getElementById('opsVaRuleForm')?.hidden) {
        return fail('va rule form should stay hidden in event template mode');
      }

      return {
        ok: true,
        optionTexts,
        navHref: Array.from(document.querySelectorAll('a[href="/ops/users"]')).find(node => visible(node))?.getAttribute('href') || '',
        statusText: status?.textContent || ''
      };
    })()
  `;
}

function buildReturnedRulesExpression() {
  return `
    (() => {
      const visible = (node) => Boolean(node) && !node.hidden && getComputedStyle(node).display !== 'none';
      const detailPanel = document.getElementById('opsRulesDetailPanel');
      const eventSection = document.getElementById('opsEventRulesSection');
      const channelLink = Array.from(document.querySelectorAll('a[href="/ops/sources"]')).find(node => visible(node));
      if (!channelLink) return { ok: false, message: 'missing visible sources nav link after returning to rules' };
      if (visible(detailPanel)) return { ok: false, message: 'rules detail panel remained open after returning from users tab' };
      return {
        ok: true,
        eventVisible: visible(eventSection),
        detailVisible: visible(detailPanel)
      };
    })()
  `;
}
