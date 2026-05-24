#!/usr/bin/env node
// 파일 용도: Scenario Builder UI가 기존 이벤트 템플릿 폼만 보조하고 ScenarioEngine/payload 계약을 바꾸지 않는지 검증한다.

import fs from "node:fs";
import process from "node:process";

import { findChrome, openBrowserPage } from "./ui_visual_smoke_lib.mjs";

const args = parseArgs(process.argv.slice(2));
const failures = [];

const server = readText("src/ingress/webrtc_http_server.cpp");
const script = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const scenarioEngine = readText("src/analysis/scenario_engine.cpp");
const serverSh = readText("server.sh");

check("ops rules page exposes scenario builder as UI-only composer", () => {
  for (const snippet of [
    'data-testid="ops-scenario-builder"',
    'data-scenario-builder-contract="ui-only-no-engine-change"',
    'id="opsScenarioBuilderType"',
    'id="opsScenarioBuilderPreset"',
    'id="opsScenarioBuilderClasses"',
    'id="opsScenarioBuilderApply"',
    'data-scenario-builder-action="apply-event-template"',
    'class="scenario-builder-draft-details"',
    '초안 payload 보기',
    'id="opsScenarioBuilderDraft"',
  ]) {
    assertIncludes(server, snippet, "scenario builder HTML");
  }
});

check("scenario builder state helper exists", () => {
  assertIncludes(script, "function opsScenarioBuilderState", "scenario builder script");
});

check("scenario builder draft helper exists", () => {
  assertIncludes(script, "function opsScenarioBuilderDraft", "scenario builder script");
});

check("scenario builder render helper exists", () => {
  assertIncludes(script, "function renderOpsScenarioBuilder", "scenario builder script");
});

check("scenario builder apply action exists", () => {
  assertIncludes(script, "async function applyOpsScenarioBuilderToEventRule", "scenario builder script");
});

check("scenario builder uses existing preset baseline", () => {
  assertIncludes(script, "baseline: opsRulesScenarioBaseline(type, presetId)", "scenario builder script");
});

check("scenario builder refreshes existing event type options", () => {
  assertIncludes(script, "opsEventRuleRefreshTypeOptions(state.type)", "scenario builder script");
});

check("scenario builder applies existing preset inputs", () => {
  assertIncludes(script, "opsEventRuleApplyPresetToInputs(state.presetId)", "scenario builder script");
});

check("scenario builder applies existing class checks", () => {
  assertIncludes(script, "opsRulesSetSelectedCategories('opsEventRuleClassChecks'", "scenario builder script");
});

check("scenario builder opens existing event rule editor", () => {
  assertIncludes(script, "openOpsRulesEditor('event-rule', 'new')", "scenario builder script");
});

check("scenario builder styling stays inside ops rules surface", () => {
  for (const snippet of [
    ".ops-scenario-builder",
    ".scenario-builder-grid",
    ".scenario-builder-review",
    ".scenario-builder-draft-details",
    ".scenario-builder-draft",
    "data-redaction=\"no-source-or-raw-debug\"",
  ]) {
    assertIncludes(server + css, snippet, "scenario builder style/redaction");
  }
});

check("scenario engine stays independent from builder UI symbol", () => {
  assert(!scenarioEngine.includes("opsScenarioBuilder"), "ScenarioEngine must not know about Scenario Builder UI");
});

check("scenario engine stays independent from builder UI wording", () => {
  assert(!scenarioEngine.includes("Scenario Builder"), "ScenarioEngine must not include UI wording");
});

check("scenario builder block hides source URL", () => {
  const builderBlock = script.slice(
    script.indexOf("function opsScenarioBuilderState"),
    script.indexOf("function opsRulesIsScenarioType"),
  );
  assert(!builderBlock.includes("sourceUrl"), "scenario builder UI must not expose sourceUrl");
});

check("scenario builder block hides RTSP locator", () => {
  const builderBlock = script.slice(
    script.indexOf("function opsScenarioBuilderState"),
    script.indexOf("function opsRulesIsScenarioType"),
  );
  assert(!builderBlock.includes("rtsp://"), "scenario builder UI must not expose rtsp://");
});

check("scenario builder block hides debug counters", () => {
  const builderBlock = script.slice(
    script.indexOf("function opsScenarioBuilderState"),
    script.indexOf("function opsRulesIsScenarioType"),
  );
  assert(!builderBlock.includes("debugCounters"), "scenario builder UI must not expose debugCounters");
});

check("scenario builder block hides password hash", () => {
  const builderBlock = script.slice(
    script.indexOf("function opsScenarioBuilderState"),
    script.indexOf("function opsRulesIsScenarioType"),
  );
  assert(!builderBlock.includes("passwordHash"), "scenario builder UI must not expose passwordHash");
});

check("scenario builder block hides token hash", () => {
  const builderBlock = script.slice(
    script.indexOf("function opsScenarioBuilderState"),
    script.indexOf("function opsRulesIsScenarioType"),
  );
  assert(!builderBlock.includes("tokenHash"), "scenario builder UI must not expose tokenHash");
});

check("server command exposes scenario builder verifier command", () => {
  assertIncludes(uiSmoke + serverSh, "verify-ops-scenario-builder-ui", "scenario builder smoke wiring");
});

check("server command exposes scenario builder verifier script", () => {
  assertIncludes(uiSmoke + serverSh, "verify_ops_scenario_builder_ui.mjs", "scenario builder smoke wiring");
});

check("ops UI smoke tracks scenario builder panel", () => {
  assertIncludes(uiSmoke + serverSh, 'data-testid="ops-scenario-builder"', "scenario builder smoke wiring");
});

check("ops UI smoke tracks scenario builder apply control", () => {
  assertIncludes(uiSmoke + serverSh, 'id="opsScenarioBuilderApply"', "scenario builder smoke wiring");
});

check("ops UI smoke tracks scenario builder UI only contract", () => {
  assertIncludes(uiSmoke + serverSh, 'data-scenario-builder-contract="ui-only-no-engine-change"', "scenario builder smoke wiring");
});

if (args.browserSmoke) {
  await runBrowserSmoke();
}

if (failures.length > 0) {
  console.log("");
  console.log("== Scenario Builder UI 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== Scenario Builder UI 통과 ==");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function parseArgs(rawArgs) {
  const parsed = {
    browserSmoke: false,
    httpBase: "http://127.0.0.1:8081",
    timeoutMs: 10000,
    chromePath: "",
    debugPort: 9943,
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
  const browser = await openBrowserPage({
    httpBase: args.httpBase,
    pagePath: "/ops/rules",
    timeoutMs: args.timeoutMs,
    chromePath: args.chromePath || findChrome(),
    debugPort: args.debugPort,
    width: 1280,
    height: 920,
  });
  try {
    const result = await browser.evaluate(
      `
        (async () => {
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          await wait(500);
          const typeSelect = document.querySelector('#opsScenarioBuilderType');
          const presetSelect = document.querySelector('#opsScenarioBuilderPreset');
          const classesInput = document.querySelector('#opsScenarioBuilderClasses');
          const apply = document.querySelector('#opsScenarioBuilderApply');
          if (!typeSelect || !presetSelect || !classesInput || !apply) {
            return { ok: false, reason: 'builder controls missing' };
          }
          typeSelect.value = 'loitering';
          typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          presetSelect.value = 'doorway';
          presetSelect.dispatchEvent(new Event('change', { bubbles: true }));
          classesInput.value = 'person, vehicle';
          classesInput.dispatchEvent(new Event('input', { bubbles: true }));
          await wait(150);
          const draftDetails = document.querySelector('.scenario-builder-draft-details');
          const draftFoldedByDefault = draftDetails && !draftDetails.open;
          if (draftDetails && !draftDetails.open) draftDetails.open = true;
          await wait(50);
          const draftText = document.querySelector('#opsScenarioBuilderDraft')?.innerText || '';
          apply.click();
          await wait(350);
          const form = document.querySelector('#opsEventRuleForm');
          const checkedClasses = Array.from(document.querySelectorAll('#opsEventRuleClassChecks input:checked')).map(input => input.value).sort();
          const text = document.body.innerText || '';
          const forbidden = ['rtsp://', 'source URL', 'Developer URL', 'raw JSON', 'debugCounters', 'BBox diagnostics', 'passwordHash', 'tokenHash']
            .filter(item => text.includes(item));
          return {
            ok: Boolean(form && !form.hidden) &&
              document.querySelector('#opsEventRuleModeSelect')?.value === 'scenario' &&
              document.querySelector('#opsEventRuleTypeSelect')?.value === 'loitering' &&
              document.querySelector('#opsEventRulePresetSelect')?.value === 'doorway' &&
              document.querySelector('#opsEventRuleDwellInput')?.value === '15000' &&
              document.querySelector('#opsEventRuleLoiteringRadiusInput')?.value === '0.05' &&
              draftFoldedByDefault &&
              checkedClasses.includes('person') &&
              checkedClasses.includes('vehicle') &&
              draftText.includes('"ruleKind": "scenario"') &&
              draftText.includes('"presetId": "doorway"') &&
              forbidden.length === 0,
            mode: document.querySelector('#opsEventRuleModeSelect')?.value,
            type: document.querySelector('#opsEventRuleTypeSelect')?.value,
            preset: document.querySelector('#opsEventRulePresetSelect')?.value,
            dwell: document.querySelector('#opsEventRuleDwellInput')?.value,
            radius: document.querySelector('#opsEventRuleLoiteringRadiusInput')?.value,
            draftFoldedByDefault: Boolean(draftFoldedByDefault),
            checkedClasses,
            draftText,
            forbidden,
            overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
          };
        })()
      `,
      args.timeoutMs,
    );
    check("browser scenario builder applies preset to event template form", () => {
      assert(Boolean(result?.ok), "browser result was not ok");
    });
    if (!result?.ok) console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
}
