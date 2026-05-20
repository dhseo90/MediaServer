#!/usr/bin/env node
// 파일 용도: v1.7.0 Client Live action reduction baseline이 반복 text button UI로 되돌아가지 않는지 검증한다.

import fs from "node:fs";
import process from "node:process";

const script = fs.readFileSync("src/ingress/product_ui_page_scripts.cpp", "utf8");
const css = fs.readFileSync("src/ingress/product_ui_css.cpp", "utf8");
const uiSmoke = fs.readFileSync("scripts/internal/verify_ops_client_ui_smoke.mjs", "utf8");

const failures = [];

function check(name, condition) {
  if (condition) {
    console.log(`[pass] ${name}`);
  } else {
    failures.push(name);
    console.log(`[fail] ${name}`);
  }
}

check(
  "client-live action model is declared",
  script.includes('data-testid="client-live-action-reduction"') &&
    script.includes('data-action-model="source-drag,tile-selection,icon-actions,keyboard-shortcuts"'),
);
check(
  "tile actions use icon-only contextual buttons",
  script.includes('class="icon-button tile-action-primary"') &&
    script.includes('aria-label="타일 ${tile.index + 1} 시작"') &&
    script.includes('<span aria-hidden="true">▶</span>') &&
    css.includes(".tile:hover .tile-actions") &&
    css.includes(".tile:focus-within .tile-actions") &&
    css.includes("opacity: 0;"),
);
check(
  "keyboard shortcuts cover start reconnect stop",
  script.includes("event.key === 's'") &&
    script.includes("event.key === 'R'") &&
    script.includes("event.key === 'Delete'") &&
    script.includes("startLiveTile(tile.index)") &&
    script.includes("restartLiveTile(tile.index)") &&
    script.includes("stopLiveTile(tile.index)"),
);
check(
  "bulk start/reconnect are not always-visible toolbar buttons",
  !script.includes('id="liveAllStart"') &&
    !script.includes('id="liveAllRestart"') &&
    script.includes('class="workspace-actions"') &&
    script.includes('id="liveAllStop"'),
);
check(
  "ops/client UI smoke tracks the v1.7.0 action contract",
  uiSmoke.includes('data-testid="client-live-action-reduction"') &&
    uiSmoke.includes('id="liveAllStart"') &&
    uiSmoke.includes('id="liveAllRestart"') &&
    uiSmoke.includes("event.key === 'Delete'"),
);

if (failures.length > 0) {
  console.log("");
  console.log("== v1.7.0 Client action reduction 실패 ==");
  for (const failure of failures) {
    console.log(`- ${failure}`);
  }
  process.exit(1);
}

console.log("");
console.log("== v1.7.0 Client action reduction 통과 ==");
