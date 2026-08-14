#!/usr/bin/env node
// 파일 용도: Rule Event Review Inbox의 state/API/UI/audit 경계를 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";
import { findChrome, openBrowserPage } from "./ui_visual_smoke_lib.mjs";
import { resolveWebRtcHttpServerSource } from "./webrtc_http_server_source_bundle.mjs";

const args = parseArgs(process.argv.slice(2));
const failures = [];
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const reviewInboxSource = resolveWebRtcHttpServerSource(undefined, {
  tokens: ["bool OpsEventReviewInboxJson("],
});
const reviewStorageSource = resolveWebRtcHttpServerSource(undefined, {
  tokens: [".media_server.event_reviews.jsonl", "UpsertOpsEventReviewState"],
});
const reviewRouteSource = readText("src/ingress/ops_event_route_owner.cpp");
const reviewInboxBlock = extractCppFunctionBlock(reviewInboxSource.source, "bool OpsEventReviewInboxJson(");
const pageShell = readText("src/ingress/product_ui_server_pages.cpp");
const pageScript = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const eventStorage = readText("src/analysis/event_storage.cpp");
const eventPost = readText("src/analysis/event_post_dispatcher.cpp");
const serverSh = readText("server.sh");
const featureInventory = readText("docs/project-feature-test-inventory.md");

check("server stores review state outside event payloads", () => {
  assertIncludes(reviewInboxBlock, "OpsEventReviewInboxItemJson", "review detail item projection");
  assertIncludes(reviewStorageSource.source, ".media_server.event_reviews.jsonl", "review state storage");
  assertIncludes(reviewStorageSource.source, "OpsEventReviewState", "review state struct");
  assertIncludes(reviewStorageSource.source, "UpsertOpsEventReviewState", "review state update");
  assertIncludes(reviewInboxBlock, "separateFromEventRecords", "review storage contract");
  assertIncludes(reviewInboxBlock, "separateFromEventPostPayload", "review storage contract");
  assertIncludes(reviewInboxBlock, "eventPostPayloadChanged", "review storage contract");
  assertIncludes(reviewInboxBlock, "OpsEventReviewInboxJson", "review inbox list");
  assertIncludes(reviewRouteSource, "/ops/api/events/reviews", "review API route");
  assertIncludes(reviewInboxBlock, "event-review-update", "review audit action");
  assertIncludes(reviewInboxBlock, "media-server.ops.vlm-review-action-state.v1", "VLM review action state");
  assertIncludes(reviewStorageSource.source, '\\"vlmAction\\":{', "VLM review action JSON");
  assertIncludes(reviewInboxBlock, "vlmReviewActionSchema", "VLM review action storage contract");
});

check("event review persistence parses review and resolution notes as distinct JSON fields", () => {
  const parserBlock = extractCppFunctionBlock(
    reviewStorageSource.source, "bool ParseOpsEventReviewStructuredNotes(");
  const loaderBlock = extractCppFunctionBlock(
    reviewStorageSource.source, "bool OpsEventReviewStateFromJsonLine(");
  const storageLoaderBlock = extractCppFunctionBlock(
    reviewStorageSource.source, "bool LoadOpsEventReviewStatesLocked(");
  const serializerBlock = extractCppFunctionBlock(
    reviewStorageSource.source, "std::string OpsEventReviewStateJson(");
  assertIncludes(parserBlock, "VlmProfileJsonDocument::Parse(line", "structured root parser");
  assertIncludes(parserBlock, 'document.StringField("note")', "top-level review note");
  assertIncludes(parserBlock, 'document.ObjectField("resolution")', "nested resolution object");
  assertIncludes(parserBlock, 'resolution.StringField("note")', "nested resolution note");
  assertIncludes(parserBlock, 'document.StringField("resolutionNote")',
    "legacy top-level resolution note compatibility");
  assertIncludes(loaderBlock,
    "ParseOpsEventReviewStructuredNotes(", "review-state structured parser call");
  assertIncludes(loaderBlock,
    "line, &structured_notes, &structured_notes_error",
    "review-state structured parser call");
  assertIncludes(loaderBlock,
    "if (!ParseOpsEventReviewStructuredNotes(", "structured parser fail-closed branch");
  assertIncludes(loaderBlock,
    "structured_notes.review_note.value_or(\"\")", "review note structured readback");
  assertIncludes(loaderBlock,
    "structured_notes.resolution_note.value_or(\"\")", "resolution note structured readback");
  assertIncludes(loaderBlock,
    "*error_message = \"invalid event review persisted JSON record\"",
    "persisted row redacted parse error");
  assertIncludes(storageLoaderBlock,
    "if (!OpsEventReviewStateFromJsonLine(line, &state, &row_error))",
    "storage loader rejects invalid row");
  assertIncludes(storageLoaderBlock, "states->clear()", "storage loader atomic failure");
  assertIncludes(storageLoaderBlock, "std::to_string(line_number)",
    "storage loader reports bounded line identity");
  assert(!loaderBlock.includes('ParseStringField(line, "note")'),
    "review loader still scans nested note fields by substring");
  assertIncludes(serializerBlock, '<< "\\"resolution\\":" << OpsResolutionStateJson(resolution_state)',
    "nested resolution serialization");
  assertIncludes(serializerBlock, '<< "\\"note\\":\\"" << JsonEscape(state.note)',
    "top-level review note serialization");
  assertIncludes(reviewStorageSource.source,
    "constexpr std::size_t kMaxReviewNoteBytes = 500", "review note normalization boundary");
  assertIncludes(reviewStorageSource.source,
    "constexpr std::size_t kMaxResolutionNoteBytes = 240", "resolution note normalization boundary");
  assertIncludes(loaderBlock, "NormalizeOpsEventReviewNote(", "review note normalizer");
  assertIncludes(loaderBlock, "NormalizeOpsResolutionNote(", "resolution note normalizer");

  const bindStart = pageScript.indexOf("function bindEventReviewActions()");
  const bindEnd = pageScript.indexOf("function bindEvidenceBundleActions()", bindStart);
  const bindBlock = pageScript.slice(bindStart, bindEnd);
  assert(bindStart >= 0 && bindEnd > bindStart, "event review UI payload function missing");
  assertIncludes(bindBlock,
    "note: row.querySelector('[data-event-review-field=\"note\"]')?.value || ''",
    "official top-level review note payload");
  assert(!bindBlock.includes("resolution:") && !bindBlock.includes("resolutionNote:"),
    "official review UI mirrors note into the resolution contract");

  const productionRun = compileAndRunReviewLoaderHarness(
    reviewStorageSource.source, "production");
  assert(productionRun.status === 0 &&
      String(productionRun.stdout || "").trim() === "event-review-production-loader-ok",
    `event review production loader roundtrip failed:\n` +
      `${productionRun.stdout}\n${productionRun.stderr}`);

  const mutations = [
    {
      name: "discard-parsed-review-note",
      find: `parsed_state.note =
        NormalizeOpsEventReviewNote(structured_notes.review_note.value_or(""));`,
      replace: "parsed_state.note.clear();",
    },
    {
      name: "ignore-structured-parse-failure",
      find: `if (!ParseOpsEventReviewStructuredNotes(
            line, &structured_notes, &structured_notes_error)) {`,
      replace: `if (false && !ParseOpsEventReviewStructuredNotes(
            line, &structured_notes, &structured_notes_error)) {`,
    },
    {
      name: "promote-resolution-note-to-review-note",
      find: "structured_notes.review_note.value_or(\"\")",
      replace: "structured_notes.resolution_note.value_or(\"\")",
    },
    {
      name: "accept-invalid-storage-row",
      find: "if (!OpsEventReviewStateFromJsonLine(line, &state, &row_error)) {",
      replace: "if (false && !OpsEventReviewStateFromJsonLine(line, &state, &row_error)) {",
    },
  ];
  for (const mutation of mutations) {
    const mutated = replaceExactlyOnce(
      reviewStorageSource.source, mutation.find, mutation.replace, mutation.name);
    const result = compileAndRunReviewLoaderHarness(mutated, mutation.name);
    assert(result.compiled === true,
      `${mutation.name} mutation did not compile:\n${result.stdout}\n${result.stderr}`);
    assert(result.status !== 0,
      `${mutation.name} mutation unexpectedly passed the production executable contract`);
  }
});

check("event payload storage excludes review fields", () => {
  assert(!eventStorage.includes("reviewStatus"), "EventRecord storage must not include reviewStatus");
  assert(!eventStorage.includes("classification\""), "EventRecord storage must not include review classification");
  assert(!eventStorage.includes("vlmAction"), "EventRecord storage must not include VLM review action");
  assert(!eventPost.includes("reviewStatus"), "Event POST dispatcher must not include reviewStatus");
  assert(!eventPost.includes("vlmAction"), "Event POST dispatcher must not include VLM review action");
  assert(!eventPost.includes("event-review"), "Event POST dispatcher must not mention event review state");
});

check("ops events UI exposes review inbox controls", () => {
  assertIncludes(pageShell, 'data-testid="ops-event-review-inbox"', "ops events review inbox marker");
  assertIncludes(pageShell, 'data-route-scope="operator-event-review"', "ops events operator review route scope");
  assertIncludes(pageShell, 'data-event-review-workflow="operator-inbox"', "ops events operator inbox workflow marker");
  assertIncludes(pageShell, "<h2>Operator Event Review Inbox</h2>", "ops events operator inbox title");
  assertIncludes(pageShell, 'data-review-state="separate-from-event-post-payload"', "review state marker");
  assertIncludes(pageShell, 'data-vlm-review-action-workflow="ops-only-review-state"', "VLM review action marker");
  assertIncludes(pageShell, 'id="eventReviewStatusFilter"', "review status filter");
  assertIncludes(pageShell, 'id="eventReviewClassFilter"', "review classification filter");
  assertIncludes(pageShell, 'id="eventReviewRows"', "review rows");
  assertIncludes(pageScript, "renderEventReviewRows", "review table renderer");
  assertIncludes(pageScript, "bindEventReviewActions", "review save binding");
  assertIncludes(pageScript, 'data-event-review-detail="event-list-detail"', "event list/detail row marker");
  assertIncludes(pageScript, 'data-event-review-action-target="false-positive-or-vlm-target"', "review action target marker");
  assertIncludes(pageScript, "vlmAction", "VLM review action save binding");
  assertIncludes(pageScript, "media-server.ops.vlm-review-action-state.v1", "VLM review action save schema");
  assertIncludes(pageScript, "/ops/api/events/reviews/", "review save endpoint");
  assertIncludes(pageScript, "Event POST payload 변경 없음", "review summary contract copy");
  assertIncludes(css, ".event-review-table", "review table CSS");
  assertIncludes(css, ".ops-vlm-review-action-controls", "VLM review action CSS");
});

check("ops client UI smoke tracks event review inbox", () => {
  assertIncludes(uiSmoke, 'data-testid="ops-event-review-inbox"', "ops events smoke marker");
  assertIncludes(uiSmoke, 'data-route-scope="operator-event-review"', "ops events smoke operator route marker");
  assertIncludes(uiSmoke, 'data-event-review-workflow="operator-inbox"', "ops events smoke operator workflow marker");
  assertIncludes(uiSmoke, 'data-review-state="separate-from-event-post-payload"', "ops events smoke state marker");
  assertIncludes(uiSmoke, 'data-vlm-review-action-workflow="ops-only-review-state"', "ops events smoke VLM action marker");
  assertIncludes(uiSmoke, "/ops/api/events/reviews", "ops events smoke endpoint");
});

check("feature inventory names ops events as operator review inbox", () => {
  assertIncludes(featureInventory, "| UI-014 | `/ops/events` Operator Event Review Inbox |", "UI inventory operator inbox row");
  assertIncludes(featureInventory, "| EVT-019 | Operator event review 목록 |", "EVT review list inventory row");
  assertIncludes(featureInventory, "| EVT-020 | Operator event review 상세 |", "EVT review detail inventory row");
  assertIncludes(featureInventory, "| EVT-021 | Operator event review 상태/action 저장 |", "EVT review action inventory row");
});

check("server command is registered", () => {
  assertIncludes(serverSh, "verify-ops-event-review-inbox", "server.sh command");
  assertIncludes(serverSh, "verify_ops_event_review_inbox.mjs", "server.sh script target");
});

if (args.roundtripSmoke) {
  await runRoundtripSmoke();
}

if (args.browserSmoke) {
  await runBrowserSmoke();
}

if (failures.length > 0) {
  console.log("");
  console.log("== Event Review Inbox 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== Event Review Inbox 통과 ==");

function compileAndRunReviewLoaderHarness(foundationSource, label) {
  const buildDir = path.join(rootDir, process.env.MEDIA_SERVER_BUILD_DIR || "build-gst-onnx");
  const flagsPath = path.join(
    buildDir, "CMakeFiles/media_server_runtime.dir/flags.make");
  const linkPath = path.join(buildDir, "CMakeFiles/media_server.dir/link.txt");
  const runtimeLibrary = path.join(buildDir, "libmedia_server_runtime.a");
  assert(fs.existsSync(flagsPath), `CMake flags missing: ${flagsPath}`);
  assert(fs.existsSync(linkPath), `CMake link command missing: ${linkPath}`);
  assert(fs.existsSync(runtimeLibrary), `runtime library missing: ${runtimeLibrary}`);

  const flags = fs.readFileSync(flagsPath, "utf8");
  const compileArgs = [
    ...cmakeAssignmentArgs(flags, "CXX_DEFINES"),
    ...cmakeAssignmentArgs(flags, "CXX_INCLUDES"),
    ...cmakeAssignmentArgs(flags, "CXX_FLAGS"),
    "-I", path.join(rootDir, "src/ingress"),
  ];
  const linkTokens = splitCommandArgs(fs.readFileSync(linkPath, "utf8"));
  const libraryIndex = linkTokens.findIndex((token) =>
    token.endsWith("libmedia_server_runtime.a"));
  assert(libraryIndex >= 0, "runtime library missing from CMake link command");
  const runtimeLinkArgs = linkTokens.slice(libraryIndex);
  runtimeLinkArgs[0] = runtimeLibrary;

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `event-review-loader-${label}-`));
  const sourcePath = path.join(tempRoot, "webrtc_http_server_ops_foundation.cpp");
  const harnessPath = path.join(tempRoot, "main.cpp");
  const sourceObject = path.join(tempRoot, "foundation.o");
  const harnessObject = path.join(tempRoot, "main.o");
  const binaryPath = path.join(tempRoot, "verify");
  const harness = `#include "webrtc_http_server_detail.h"

namespace detail = ingress::webrtc_http_server_detail;

namespace {

bool ParseState(const std::string& json,
                detail::OpsEventReviewState* state,
                std::string* error) {
    return detail::OpsEventReviewStateFromJsonLine(json, state, error);
}

bool ExpectInvalid(const std::string& json) {
    detail::OpsEventReviewState state;
    state.present = true;
    state.note = "must-be-cleared";
    std::string error;
    return !ParseState(json, &state, &error) &&
           !state.present &&
           state.note.empty() &&
           error == "invalid event review persisted JSON record" &&
           error.find("leak-marker") == std::string::npos;
}

bool WriteRows(const std::filesystem::path& path,
               const std::vector<std::string>& rows) {
    std::ofstream out(path, std::ios::trunc);
    if (!out) return false;
    for (const auto& row : rows) out << row << "\\n";
    return static_cast<bool>(out);
}

bool ExpectInvalidStorageRow(const std::filesystem::path& path,
                             const std::string& invalid) {
    if (!WriteRows(path, {
            R"({"eventId":"valid-before-invalid","note":"kept-only-on-success"})",
            invalid,
        })) return false;
    std::unordered_map<std::string, detail::OpsEventReviewState> states;
    states["preexisting"].present = true;
    std::string error;
    return !detail::LoadOpsEventReviewStatesLocked(path, &states, &error) &&
           states.empty() &&
           error == "invalid event review persisted JSON record at line 2" &&
           error.find("leak-marker") == std::string::npos;
}

}  // namespace

int main() {
    detail::OpsEventReviewState state;
    std::string error;

    if (!ParseState(R"({"eventId":"top-level","note":"review-only"})", &state, &error) ||
        !state.present || state.note != "review-only" || !state.resolution_note.empty()) return 1;
    if (!ParseState(
            R"({"eventId":"nested-only","resolution":{"note":"resolution-only"}})",
            &state, &error) ||
        !state.present || !state.note.empty() ||
        state.resolution_note != "resolution-only") return 2;
    if (!ParseState(
            R"({"eventId":"distinct","note":"review","resolution":{"note":"resolution"}})",
            &state, &error) ||
        state.note != "review" || state.resolution_note != "resolution") return 3;
    if (!ParseState(
            R"({"eventId":"same","note":"same","resolution":{"note":"same"}})",
            &state, &error) ||
        state.note != "same" || state.resolution_note != "same") return 4;
    if (!ParseState(
            R"({"eventId":"legacy","note":"review","resolution":{"note":"nested"},"resolutionNote":"legacy"})",
            &state, &error) ||
        state.note != "review" || state.resolution_note != "legacy") return 5;
    if (!ParseState(
            R"({"eventId":"escaped","note":"quote \\" slash \\\\ unicode \\uD55C","resolution":{"note":"해결 \\" 경로 \\\\"}})",
            &state, &error) ||
        state.note != "quote \\" slash \\\\ unicode 한" ||
        state.resolution_note != "해결 \\" 경로 \\\\") return 6;

    const std::string review(520, 'r');
    const std::string resolution(260, 's');
    if (!ParseState(
            "{\\"eventId\\":\\"bounded\\",\\"note\\":\\"" + review +
                "\\",\\"resolution\\":{\\"note\\":\\"" + resolution + "\\"}}",
            &state, &error) ||
        state.note.size() != 500 || state.resolution_note.size() != 240) return 7;

    detail::OpsEventReviewState official;
    official.present = true;
    official.event_id = "official-ui";
    official.note = "official top-level note";
    official.resolution_note = "independent resolution";
    const std::string official_json = detail::OpsEventReviewStateJson(official);
    if (!ParseState(official_json, &state, &error) ||
        state.note != "official top-level note" ||
        state.resolution_note != "independent resolution") return 8;

    for (const std::string invalid : {
             std::string(R"({"eventId":"malformed","note":"leak-marker")"),
             std::string(R"({"eventId":"duplicate","note":"a","note":"leak-marker"})"),
             std::string(R"({"eventId":"type-invalid","note":{"value":"leak-marker"}})"),
             std::string(R"({"eventId":"nested-type","resolution":{"note":false}})"),
             std::string(R"({"eventId":17,"note":"leak-marker"})"),
         }) {
        if (!ExpectInvalid(invalid)) return 9;
    }
    if (ParseState(R"({"eventId":"null-output","note":"review"})", nullptr, &error) ||
        error != "event review state output is required") return 10;

    const auto root = std::filesystem::temp_directory_path() /
        ("event-review-production-loader-" + std::to_string(::getpid()));
    std::error_code ec;
    std::filesystem::remove_all(root, ec);
    std::filesystem::create_directories(root, ec);
    if (ec) return 11;
    const auto storage = root / "reviews.jsonl";
    if (!WriteRows(storage, {
            R"({"eventId":"load-a","note":"review-a"})",
            R"({"eventId":"load-b","resolution":{"note":"resolution-b"}})",
        })) return 12;
    std::unordered_map<std::string, detail::OpsEventReviewState> states;
    if (!detail::LoadOpsEventReviewStatesLocked(storage, &states, &error) ||
        states.size() != 2 ||
        states.at("load-a").note != "review-a" ||
        !states.at("load-a").resolution_note.empty() ||
        !states.at("load-b").note.empty() ||
        states.at("load-b").resolution_note != "resolution-b" ||
        !error.empty()) return 13;

    for (const std::string invalid : {
             std::string(R"({"eventId":"malformed","note":"leak-marker")"),
             std::string(R"({"eventId":"duplicate","note":"a","note":"leak-marker"})"),
             std::string(R"({"eventId":"type-invalid","note":false})"),
         }) {
        if (!ExpectInvalidStorageRow(storage, invalid)) return 14;
    }
    states["stale"].present = true;
    if (!detail::LoadOpsEventReviewStatesLocked(root / "missing.jsonl", &states, &error) ||
        !states.empty()) return 15;
    std::filesystem::remove_all(root, ec);
    if (ec) return 16;

    std::cout << "event-review-production-loader-ok\\n";
    return 0;
}
`;
  try {
    fs.writeFileSync(sourcePath, foundationSource);
    fs.writeFileSync(harnessPath, harness);

    const sourceCompile = spawnSync(process.env.CXX || "/usr/bin/c++", [
      ...compileArgs,
      "-c", sourcePath,
      "-o", sourceObject,
    ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    if (sourceCompile.status !== 0) {
      return {
        compiled: false,
        status: sourceCompile.status,
        stdout: sourceCompile.stdout,
        stderr: sourceCompile.stderr,
      };
    }
    const harnessCompile = spawnSync(process.env.CXX || "/usr/bin/c++", [
      ...compileArgs,
      "-c", harnessPath,
      "-o", harnessObject,
    ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    if (harnessCompile.status !== 0) {
      return {
        compiled: false,
        status: harnessCompile.status,
        stdout: harnessCompile.stdout,
        stderr: harnessCompile.stderr,
      };
    }
    const link = spawnSync(process.env.CXX || "/usr/bin/c++", [
      harnessObject,
      sourceObject,
      "-o", binaryPath,
      ...runtimeLinkArgs,
    ], { cwd: buildDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    if (link.status !== 0) {
      return {
        compiled: false,
        status: link.status,
        stdout: link.stdout,
        stderr: link.stderr,
      };
    }
    const run = spawnSync(binaryPath, [], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return {
      compiled: true,
      status: run.status,
      stdout: run.stdout,
      stderr: run.stderr,
    };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function cmakeAssignmentArgs(text, name) {
  const match = text.match(new RegExp(`^${name} = (.*)$`, "m"));
  assert(match, `CMake assignment missing: ${name}`);
  return splitCommandArgs(match[1]);
}

function splitCommandArgs(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean);
}

function replaceExactlyOnce(source, find, replacement, label) {
  const first = source.indexOf(find);
  assert(first >= 0, `${label} mutation target missing`);
  assert(source.indexOf(find, first + find.length) < 0,
    `${label} mutation target is not unique`);
  return source.slice(0, first) + replacement + source.slice(first + find.length);
}

function readText(path) {
  return fs.readFileSync(path, "utf8");
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
    browserSmoke: false,
    httpBase: "http://127.0.0.1:8081",
    timeoutMs: 10000,
    chromePath: "",
    debugPort: 9940,
  };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--roundtrip-smoke") {
      parsed.roundtripSmoke = true;
    } else if (arg === "--browser-smoke") {
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

async function requestJson(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs);
  try {
    const response = await fetch(`${args.httpBase}${path}`, {
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
    if (!response.ok) {
      throw new Error(json.error || `${response.status} ${response.statusText}`);
    }
    return { json, text };
  } finally {
    clearTimeout(timeout);
  }
}

async function runRoundtripSmoke() {
  await checkAsync("roundtrip smoke health is reachable", async () => {
    await requestJson("/health");
  });
  const eventId = `event-review-${Date.now()}-${process.pid}`;
  await checkAsync("review state update redacts sensitive note", async () => {
    const { json, text } = await requestJson(`/ops/api/events/reviews/${encodeURIComponent(eventId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reviewStatus: "confirmed",
        classification: "false-positive",
        note: "operator checked rtsp://internal.example/live with token abc",
        vlmAction: {
          schema: "media-server.ops.vlm-review-action-state.v1",
          action: "review-needed",
          target: "operatorReviewQuestions",
          note: "follow up before using rtsp://internal.example/live token abc",
        },
      }),
    });
    assert(json.status === "ops-event-review", "unexpected update status");
    assert(json.review?.eventId === eventId, "updated review eventId mismatch");
    assert(json.review?.reviewStatus === "confirmed", "updated review status mismatch");
    assert(json.review?.classification === "false-positive", "updated review classification mismatch");
    assert(json.review?.note === "[redacted-review-note]", "sensitive review note was not redacted");
    assert(json.review?.vlmAction?.schema === "media-server.ops.vlm-review-action-state.v1", "VLM action schema mismatch");
    assert(json.review?.vlmAction?.action === "review-needed", "VLM action mismatch");
    assert(json.review?.vlmAction?.target === "operatorReviewQuestions", "VLM action target mismatch");
    assert(json.review?.vlmAction?.note === "[redacted-review-note]", "sensitive VLM action note was not redacted");
    assert(!text.includes("rtsp://internal.example"), "review response leaked rtsp URL");
    assert(!text.includes("token abc"), "review response leaked token text");
  });
  await checkAsync("review state list returns synthetic review without EventRecord mutation", async () => {
    const { json, text } = await requestJson(`/ops/api/events/reviews?eventId=${encodeURIComponent(eventId)}`);
    assert(json.status === "ops-event-review-inbox", "unexpected inbox status");
    assert(json.storage?.separateFromEventRecords === true, "missing separate EventRecord flag");
    assert(json.storage?.separateFromEventPostPayload === true, "missing separate Event POST flag");
    assert(json.storage?.eventPostPayloadChanged === false, "Event POST changed flag must be false");
    const review = json.records?.[0]?.review;
    assert(review?.eventId === eventId, "listed /ops/events review eventId mismatch");
    assert(review?.reviewStatus === "confirmed", "listed review status mismatch");
    assert(review?.classification === "false-positive", "listed review classification mismatch");
    assert(review?.note === "[redacted-review-note]", "listed review note mismatch");
    assert(review?.vlmAction?.action === "review-needed", "listed /ops/events VLM action mismatch");
    assert(review?.vlmAction?.target === "operatorReviewQuestions", "listed VLM action target mismatch");
    assert(review?.vlmAction?.note === "[redacted-review-note]", "listed VLM action note mismatch");
    assert(!text.includes("rtsp://internal.example"), "inbox response leaked rtsp URL");
    const status = await requestJson(`/ops/api/events/status?eventId=${encodeURIComponent(eventId)}&limit=1`);
    assert(observed?.vlmAction?.schema === "media-server.ops.vlm-review-action-state.v1" && status.text.includes("vlmAction") === false, "listed VLM action schema or EventRecord no-action boundary mismatch");
    assert(!status.text.includes("reviewStatus"), "EventRecord no-write boundary: status response contains reviewStatus");
    assert(!status.text.includes("event-review-update"), "EventRecord status response contains review audit action");
  });
  for (const action of ["accept", "dismiss"]) {
    await checkAsync(`VLM ${action} action persists and is independently listed`, async () => {
      const target = action === "accept" ? "summary" : "falsePositiveHints";
      const reviewStatus = action === "accept" ? "confirmed" : "dismissed";
      const classification = action === "accept" ? "true-positive" : "false-positive";
      const update = await requestJson(`/ops/api/events/reviews/${encodeURIComponent(eventId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewStatus,
          classification,
          note: `${action} operator note`,
          vlmAction: {
            schema: "media-server.ops.vlm-review-action-state.v1",
            action,
            target,
            note: `${action} VLM note`,
          },
        }),
      });
      assert(update.json.review?.vlmAction?.action === action, `${action} primary action mismatch`);
      assert(update.json.review?.vlmAction?.target === target, `${action} primary target mismatch`);
      const listed = await requestJson(`/ops/api/events/reviews?eventId=${encodeURIComponent(eventId)}`);
      const observed = listed.json.records?.[0]?.review;
      assert(observed?.vlmAction?.action === action, `${action} independent list action mismatch`);
      assert(observed?.vlmAction?.target === target, `${action} independent list target mismatch`);
      assert(observed?.reviewStatus === reviewStatus, `${action} independent list review status mismatch`);
      assert(observed?.classification === classification, `${action} independent list classification mismatch`);
      assert(observed?.note === `${action} operator note`, `${action} independent list note mismatch`);
      const clientViews = await requestJson("/client/api/views");
      assert(!clientViews.text.includes("vlmAction"), `${action} client-viewer-boundary leaked vlmAction`);
      assert(!clientViews.text.includes("event-review-update"), `${action} no-write boundary leaked review audit state to client`);
    });
  }
  await checkAsync("event review audit is persisted and redacted", async () => {
    const { text } = await requestJson("/ops/api/audit?limit=20&area=events&action=event-review-update");
    assert(text.includes("event-review-update"), "audit response missing event-review-update action");
    assert(text.includes(`event:${eventId}`), "audit response missing review target");
    assert(!text.includes("rtsp://internal.example"), "audit response leaked rtsp URL");
    assert(!text.includes("token abc"), "audit response leaked token text");
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

async function runBrowserSmoke() {
  const browser = await openBrowserPage({
    httpBase: args.httpBase,
    pagePath: "/ops/events",
    timeoutMs: args.timeoutMs,
    chromePath: args.chromePath || findChrome(),
    debugPort: args.debugPort,
    width: 1180,
    height: 900,
  });
  try {
    const result = await browser.evaluate(
      `
        (async () => {
          await new Promise(resolve => setTimeout(resolve, 600));
          const inbox = document.querySelector('[data-testid="ops-event-review-inbox"]');
          const rows = document.querySelector('#eventReviewRows');
          const nav = document.querySelector('nav[aria-label="운영 메뉴"]');
          const scripts = Array.from(document.scripts).map(node => node.textContent || '').join('\n');
          const text = document.body.innerText || '';
          return {
            ok: Boolean(inbox) &&
              inbox?.dataset.reviewState === 'separate-from-event-post-payload' &&
              Boolean(document.querySelector('#eventReviewStatusFilter')) &&
              Boolean(document.querySelector('#eventReviewClassFilter')) &&
              Boolean(rows) &&
              text.includes('Event POST payload 변경 없음'),
            primaryNavHidden: !nav?.querySelector('a[href="/ops/events"]'),
            evidenceRefsBound: scripts.includes('snapshotPathPresent') &&
              scripts.includes('clipPathPresent') &&
              scripts.includes('eventRecordEvidence(item)'),
            forbidden: ['rtsp://', 'rtsps://', 'Developer URL', 'passwordHash', 'tokenHash']
              .filter(item => text.includes(item)),
            overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
          };
        })()
      `,
      args.timeoutMs,
    );
    check("browser review inbox renders with redaction boundary", () => {
      assert(Boolean(result?.ok), `browser inbox contract failed: ${JSON.stringify(result)}`);
      assert(result?.primaryNavHidden === true, "/ops/events unexpectedly exposed in primary nav");
      assert(result?.evidenceRefsBound === true, "event review evidence refs renderer is not bound");
      assert((result?.forbidden || []).length === 0, `forbidden text visible: ${(result?.forbidden || []).join(", ")}`);
      assert(Number(result?.overflowX || 0) <= 2, `horizontal overflow: ${result?.overflowX}`);
    });
  } finally {
    await browser.close();
  }
}
