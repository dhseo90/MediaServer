#!/usr/bin/env node
// 파일 용도: /ops/users 권한 범위 템플릿 UI를 admin 세션 브라우저 클릭으로 검증한다.

import os from "node:os";
import path from "node:path";
import process from "node:process";

import {
  cookieHeaderFromNetscapeFile,
  findChrome,
  openBrowserPage,
} from "./ui_visual_smoke_lib.mjs";

const args = parseArgs(process.argv.slice(2));
const httpBase = String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const timeoutMs = Number(args.timeoutMs || 10000);
const cookieHeader = cookieHeaderFromNetscapeFile(args.cookieFile || "");
const chromePath = args.chromePath || findChrome();
const visualWidth = Number(args.visualWidth || 390);
const visualHeight = Number(args.visualHeight || 900);
const debugPort = Number(args.debugPort || 9920);
const outputDir = args.outputDir || path.join(os.tmpdir(), `media_server_auth_scope_picker_${Date.now()}_${process.pid}`);

if (!cookieHeader) {
  throw new Error("--cookie-file with an authenticated admin session is required");
}

const html = await requestText("/ops/users");
assertContains("ops-users-scope-picker-html", html, [
  'id="apply-view-scope-template"',
  'id="apply-role-default-scope-template"',
  'id="clear-custom-scopes"',
  'id="scope-template-preview"',
  'id="user-scopes-input"',
]);
console.log("[pass] ops users scope picker controls rendered");

await verifyBrowserPicker();
console.log("[pass] auth-scope-picker");

async function verifyBrowserPicker() {
  const browser = await openBrowserPage({
    httpBase,
    pagePath: "/ops/users",
    timeoutMs,
    chromePath,
    debugPort,
    width: visualWidth,
    height: visualHeight,
    outputDir,
    cookieHeader,
  });
  try {
    const result = await browser.evaluate(
      `
        (async () => {
          const waitFor = async (predicate, label) => {
            const startedAt = Date.now();
            while (Date.now() - startedAt < ${JSON.stringify(timeoutMs)}) {
              if (predicate()) return true;
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            throw new Error(label + ' timeout');
          };
          const selectors = [
            '#add-user-btn',
            '#user-detail-panel',
            '#apply-view-scope-template',
            '#apply-role-default-scope-template',
            '#clear-custom-scopes',
            '#scope-template-preview',
            '#user-scopes-input',
          ];
          const missing = selectors.filter(selector => !document.querySelector(selector));
          await waitFor(() => document.querySelector('#users-body')?.children.length > 0, 'users table load');
          document.querySelector('#add-user-btn').click();
          await waitFor(() => document.querySelector('#user-detail-panel')?.hidden === false, 'user editor open');
          const form = document.querySelector('#user-form');
          const scopesInput = document.querySelector('#user-scopes-input');
          const setRole = value => {
            form.elements.role.value = value;
            form.elements.role.dispatchEvent(new Event('change', { bubbles: true }));
          };
          const setView = value => {
            form.elements.viewId.value = value;
            form.elements.viewId.dispatchEvent(new Event('input', { bubbles: true }));
          };
          const scopeLines = () => scopesInput.value.split(/\\n/).map(item => item.trim()).filter(Boolean);
          setRole('viewer');
          setView('7');
          document.querySelector('#apply-view-scope-template').click();
          const viewer = scopeLines();
          document.querySelector('#clear-custom-scopes').click();
          const cleared = scopesInput.value === '';
          setRole('integrator');
          setView('8');
          document.querySelector('#apply-view-scope-template').click();
          const integrator = scopeLines();
          setRole('operator');
          document.querySelector('#apply-role-default-scope-template').click();
          const operator = scopeLines();
          setRole('viewer');
          setView('');
          await waitFor(() => (document.querySelector('#scope-template-preview')?.textContent || '').includes('__unassigned__'), 'unassigned preview');
          const doc = document.documentElement;
          const body = document.body;
          const overflowX = Math.max(0, Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth);
          const expectedViewer = ['view:read:7', 'dashboard:read:7', 'event:read:7', 'metadata:read:7'];
          const expectedIntegrator = ['metadata:read:8', 'event:read:8'];
          const expectedOperator = ['ops:read', 'rule:write', 'source:write', 'dashboard:read:*', 'event:read:*'];
          const same = (left, right) => left.length === right.length && left.every((item, index) => item === right[index]);
          return {
            ok: missing.length === 0 &&
              same(viewer, expectedViewer) &&
              same(integrator, expectedIntegrator) &&
              same(operator, expectedOperator) &&
              cleared &&
              overflowX <= 2,
            missing,
            viewer,
            integrator,
            operator,
            cleared,
            preview: document.querySelector('#scope-template-preview')?.textContent || '',
            overflowX,
            viewport: { width: window.innerWidth, height: window.innerHeight },
          };
        })()
      `,
      timeoutMs + 5000,
    );
    if (!result?.ok) {
      throw new Error(`scope picker browser check failed: ${JSON.stringify(result)}`);
    }
    console.log(`[pass] browser auth scope picker width=${visualWidth} overflow=${result.overflowX}`);
  } finally {
    await browser.close();
  }
}

function assertContains(label, text, needles) {
  const missing = needles.filter(item => !text.includes(item));
  if (missing.length > 0) {
    throw new Error(`${label}: missing ${missing.join(", ")}`);
  }
}

async function requestText(pagePath) {
  const response = await fetch(new URL(pagePath, `${httpBase}/`), {
    headers: {
      Accept: "text/html",
      Cookie: cookieHeader,
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${pagePath} HTTP ${response.status}: ${text.slice(0, 180)}`);
  }
  return text;
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      result[toCamel(raw.slice(0, eq))] = raw.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      result[toCamel(raw)] = next;
      index += 1;
    } else {
      result[toCamel(raw)] = "1";
    }
  }
  return result;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}
