#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: Source Group/Site Management의 registry/API/UI/scope 경계를 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import net from "node:net";

const args = parseArgs(process.argv.slice(2));
const failures = [];

const header = readText("include/ingress/source_view_registry.h");
const registry = readText("src/ingress/source_view_registry.cpp");
const server = readWebRtcHttpServerBundle(readText);
const pageScript = readText("src/ingress/product_ui_page_scripts.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const auth = readText("src/ingress/http_auth.cpp");
const serverSh = readText("server.sh");

for (const field of ["site", "group", "floor", "zone"]) {
  check(`source registry stores ${field} metadata field`, () => {
    assertIncludes(header + registry, `std::string ${field};`, "source group registry");
  });
  check(`source registry parses ${field} metadata field`, () => {
    assertIncludes(header + registry, `ParseStringField(body, "${field}")`, "source group registry");
  });
  check(`source registry serializes ${field} metadata field`, () => {
    assertIncludes(header + registry, `\\"${field}\\":\\"`, "source group registry");
  });
}

check("client view JSON exposes only safe grouping metadata", () => {
  const clientBlock = registry.slice(
    registry.indexOf("std::string ClientPublishedViewJson"),
    registry.indexOf("RegistryResult JsonResult"),
  );
  for (const snippet of ['\\"site\\"', '\\"group\\"', '\\"floor\\"', '\\"zone\\"', "source.owner_group"]) {
    assertIncludes(clientBlock, snippet, "client grouping json");
  }
  for (const forbidden of ["rtsp_url", "http_url", "whep_url", "canonical_source_key"]) {
    assert(!clientBlock.includes(forbidden), `client view JSON must not expose ${forbidden}`);
  }
});

check("ops sources UI manages grouping metadata", () => {
  for (const snippet of [
    'data-testid="source-group-site-management"',
    'data-scope-contract="view-read-scopes-unchanged"',
    'name="site"',
    'name="group"',
    'name="floor"',
    'name="zone"',
    "sourceLocationLabel",
    "channel-name-stack",
  ]) {
    assertIncludes(server + pageScript, snippet, "ops source grouping UI");
  }
});

check("client source tree consumes location group metadata", () => {
  assertIncludes(server + pageScript, "liveSourceTreeGroups", "client grouping consumers");
});

check("client source tree consumes site group aliases", () => {
  assertIncludes(server + pageScript, "['site', 'siteName', 'group', 'groupName', 'locationName']", "client grouping consumers");
});

check("client source tree consumes floor zone aliases", () => {
  assertIncludes(server + pageScript, "['floor', 'floorName', 'zone', 'zoneName']", "client grouping consumers");
});

check("client source tree renders location label", () => {
  assertIncludes(server + pageScript, "clientViewLocationLabel", "client grouping consumers");
});

check("user scope chooser renders assignment options", () => {
  assertIncludes(server + pageScript, "view-assignment-options", "client grouping consumers");
});

check("user scope chooser renders site group copy", () => {
  assertIncludes(server + pageScript, "사이트/그룹", "client grouping consumers");
});

check("source group UI does not add source group read scope", () => {
  assert(!pageScript.includes("source-group:read"), "UI must not introduce source-group scopes");
});

check("auth contract does not add source group read scope", () => {
  assert(!auth.includes("source-group:read"), "auth contract must not introduce source-group scopes");
});

check("auth contract does not add site read scope", () => {
  assert(!auth.includes("site:read:"), "auth contract must not introduce site scopes");
});

check("ops UI smoke tracks source grouping panel", () => {
  assertIncludes(uiSmoke + serverSh, 'data-testid="source-group-site-management"', "source grouping smoke wiring");
});

check("ops UI smoke tracks source assignment options", () => {
  assertIncludes(uiSmoke + serverSh, "view-assignment-options", "source grouping smoke wiring");
});

check("server command exposes source grouping verifier command", () => {
  assertIncludes(uiSmoke + serverSh, "verify-ops-source-group-site-management", "source grouping smoke wiring");
});

check("server command exposes source grouping verifier script", () => {
  assertIncludes(uiSmoke + serverSh, "verify_ops_source_group_site_management.mjs", "source grouping smoke wiring");
});

if (args.roundtripSmoke) {
  await runRoundtripSmoke();
}

if (failures.length > 0) {
  console.log("");
  console.log("== Source Group/Site Management 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== Source Group/Site Management 통과 ==");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
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

function parseArgs(rawArgs) {
  const parsed = {
    roundtripSmoke: false,
    timeoutMs: 12000,
  };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--roundtrip-smoke") {
      parsed.roundtripSmoke = true;
    } else if (arg === "--timeout-ms") {
      parsed.timeoutMs = Number(rawArgs[++index] || parsed.timeoutMs);
    } else {
      failures.push(`unknown option: ${arg}`);
      console.log(`[fail] unknown option: ${arg}`);
    }
  }
  return parsed;
}

async function findFreePort(start) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => {
        if (port > 0) resolve(port);
        else reject(new Error(`no free port near ${start}`));
      });
    });
  });
}

async function requestJson(base, resourcePath, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs);
  try {
    const response = await fetch(`${base}${resourcePath}`, {
      cache: "no-store",
      signal: controller.signal,
      ...options,
    });
    const text = await response.text();
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    if (!response.ok) throw new Error(json.error || `${response.status} ${response.statusText}`);
    return { json, text };
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForHealth(base, child) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < args.timeoutMs) {
    if (child.exitCode !== null) throw new Error(`server exited early with code ${child.exitCode}`);
    try {
      await requestJson(base, "/health", { headers: { Accept: "application/json" } });
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  throw new Error(`server health timeout: ${base}`);
}

async function runRoundtripSmoke() {
  await checkAsync("source group roundtrip smoke", async () => {
    const runId = `source-group-${Date.now()}-${process.pid}`;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `${runId}-`));
    const httpPort = await findFreePort(18170 + (process.pid % 400));
    const rtspPort = await findFreePort(httpPort + 1000);
    const base = `http://127.0.0.1:${httpPort}`;
    const child = spawn("./server.sh", ["foreground"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        MEDIA_SERVER_SKIP_LOCAL_ENV: "1",
        MEDIA_SERVER_SKIP_BUILD: "1",
        MEDIA_SERVER_AUTH_MODE: "off",
        MEDIA_SERVER_LISTEN_ADDRESS: "127.0.0.1",
        MEDIA_SERVER_HTTP_LISTEN_ADDRESS: "127.0.0.1",
        MEDIA_SERVER_LISTEN_PORT: String(rtspPort),
        MEDIA_SERVER_HTTP_LISTEN_PORT: String(httpPort),
        MEDIA_SERVER_SOURCE_REGISTRY: path.join(tmpDir, "sources.json"),
        MEDIA_SERVER_PUBLISHED_VIEWS: path.join(tmpDir, "views.json"),
        MEDIA_SERVER_ANALYSIS_REGISTRY: path.join(tmpDir, "analysis.json"),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const logs = [];
    child.stdout.on("data", chunk => logs.push(String(chunk)));
    child.stderr.on("data", chunk => logs.push(String(chunk)));
    try {
      await waitForHealth(base, child);
      const sourceId = "1701";
      const sourceBody = {
        sourceId,
        displayName: "P1 Site Camera",
        kind: "file",
        file: "sample_h264.mp4",
        enabled: true,
        tags: ["p1", "site"],
        ownerGroup: "North Gate",
        site: "HQ",
        group: "North Gate",
        floor: "B1",
        zone: "Entry",
        allowDuplicateSource: true,
      };
      const viewBody = {
        viewId: sourceId,
        displayName: "P1 Site Camera",
        sourceId,
        allowedOverlayModes: ["raw", "va-overlay"],
        showDashboard: true,
        showEvents: true,
        showMetadataSummary: true,
        maxTiles: 2,
        enabled: true,
      };
      await requestJson(base, `/ops/api/sources/${sourceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sourceBody),
      });
      await requestJson(base, `/ops/api/views/${sourceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(viewBody),
      });
      const opsSources = await requestJson(base, "/ops/api/sources");
      const savedSource = opsSources.json.sources?.find(source => source.sourceId === sourceId);
      assert(savedSource?.site === "HQ", "ops source site did not roundtrip");
      assert(savedSource?.group === "North Gate", "ops source group did not roundtrip");
      assert(savedSource?.floor === "B1", "ops source floor did not roundtrip");
      assert(savedSource?.zone === "Entry", "ops source zone did not roundtrip");
      const clientViews = await requestJson(base, "/client/api/views");
      const clientText = clientViews.text;
      const clientView = clientViews.json.views?.find(view => view.viewId === sourceId);
      assert(clientView?.site === "HQ", "client view site missing");
      assert(clientView?.group === "North Gate", "client view group missing");
      assert(clientView?.floor === "B1", "client view floor missing");
      assert(clientView?.zone === "Entry", "client view zone missing");
      for (const forbidden of ["sample_h264.mp4", "rtsp://", "httpUrl", "whepUrl", "canonicalSourceKey"]) {
        assert(!clientText.includes(forbidden), `client grouping response leaked ${forbidden}`);
      }
    } finally {
      child.kill("SIGTERM");
      await new Promise(resolve => child.once("exit", resolve));
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
}

async function checkAsync(name, fn) {
  try {
    await fn();
    console.log(`[pass] ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.log(`[fail] ${name}: ${error.message}`);
  }
}
