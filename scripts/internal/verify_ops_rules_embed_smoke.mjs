#!/usr/bin/env node

import path from "node:path";
import process from "node:process";

import { findChrome, openBrowserPage } from "./ui_visual_smoke_lib.mjs";

const args = parseArgs(process.argv.slice(2));
const httpBase = String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const timeoutMs = Number(args.timeoutMs || 12000);
const chromePath = args.chromePath || findChrome();
const debugPort = Number(args.debugPort || 9899);
const outputDir = args.outputDir || path.join("/tmp", `media_server_ops_rules_embed_${Date.now()}_${process.pid}`);

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
  const result = await browser.evaluate(buildExpression(), timeoutMs);
  if (!result?.ok) {
    throw new Error(JSON.stringify(result));
  }
  console.log("[pass] ops-rules-embed-smoke");
  console.log(JSON.stringify(result, null, 2));
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

function buildExpression() {
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
      await wait(2200);
      const host = document.getElementById('opsRulesEditorComponent');
      const shadow = host?.shadowRoot;
      if (!shadow || !visible(detailPanel)) {
        return fail('detail panel did not open after create va rule', {
          hostHidden: host?.hidden ?? null,
          detailHidden: detailPanel?.hidden ?? null,
          statusText: status?.textContent || ''
        });
      }
      const vaChannelPicker = shadow.getElementById('opsRuleChannelPicker');
      const vaChannelSelect = shadow.getElementById('opsRuleChannelSelect');
      if (!visible(vaChannelPicker)) {
        return fail('channel picker hidden in va create mode', {
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
      await wait(2200);
      const eventShadow = document.getElementById('opsRulesEditorComponent')?.shadowRoot;
      if (!eventShadow || !visible(detailPanel)) {
        return fail('detail panel did not open after create event template', {
          detailHidden: detailPanel?.hidden ?? null,
          statusText: status?.textContent || ''
        });
      }
      const eventChannelPicker = eventShadow.getElementById('opsRuleChannelPicker');
      if (visible(eventChannelPicker)) {
        return fail('channel picker should be hidden in event template mode');
      }

      const usersLink = Array.from(document.querySelectorAll('a[href="/ops/users"]')).find(node => visible(node));
      if (!usersLink) {
        return fail('missing visible users nav link');
      }

      return {
        ok: true,
        optionTexts,
        navHref: usersLink.getAttribute('href') || '',
        statusText: status?.textContent || ''
      };
    })()
  `;
}
