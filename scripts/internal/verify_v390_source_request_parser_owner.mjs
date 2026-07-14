#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 REVIEW4-64 source request parser core-owner verification

Usage:
  ./server.sh verify-v390-source-request-parser-owner

Checks:
  - ingress compatibility owner 제거와 core owner 단일화
  - rollback parser bytes와 route/file/source-kind/error 의미 불변
  - CMake와 SessionManager/RTSP consumer 결속
  - compiled parser matrix와 mutation negatives
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const oldHeaderPath = "include/ingress/request_parser.h";
const oldSourcePath = "src/ingress/request_parser.cpp";
const newHeaderPath = "include/core/source_request_parser.h";
const newSourcePath = "src/core/source_request_parser.cpp";
const rollbackHeaderSha256 = "ea942bf94d1fd958e71883bfd8fbed203b959e11de00d8bbc2017b9f536dc6a7";
const rollbackSourceSha256 = "81557d8b8c809b2e1fb445922da6f83f1b1f1b0e1fb8310d1afcbd31e1904b70";

const checks = [];
const check = (name, fn) => {
  try {
    fn();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", detail: error.message });
  }
};
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const read = file => fs.readFileSync(path.join(rootDir, file), "utf8");
const exists = file => fs.existsSync(path.join(rootDir, file));
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const count = (text, pattern) => [...text.matchAll(pattern)].length;

function normalizeHeader(text) {
  return text.replace("namespace core {", "namespace ingress {")
    .replace("}  // namespace core", "}  // namespace ingress");
}

function normalizeSource(text) {
  return text.replace('#include "core/source_request_parser.h"', '#include "ingress/request_parser.h"')
    .replace("namespace core {", "namespace ingress {")
    .replace("}  // namespace core", "}  // namespace ingress");
}

function assertOwnerSource(text) {
  for (const anchor of [
    "bool IsSupportedPath(const std::string& path)",
    "std::optional<std::string> ResolveFileUri(const std::string& file_token)",
    "std::optional<media::SourceSpec> ParseSourceSpecFromPath(const std::string& path)",
    "std::optional<media::SourceSpec> ParseSourceSpec(const media::IngressRequest& request",
    'SetError(error_message, "unsupported request path")',
    'SetError(error_message, "request must contain exactly one of file or url")',
    'SetError(error_message, "file path is outside configured file root")',
    'SetError(error_message, "source=whep requires an http(s) WHEP endpoint URL")',
    'SetError(error_message, "unsupported source kind: " + source_it->second)',
    "MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE=ON",
    "MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE=1",
  ]) assert(text.includes(anchor), `parser owner anchor missing: ${anchor}`);
}

check("source request parser has one core owner and no ingress compatibility wrapper", () => {
  assert(!exists(oldHeaderPath) && !exists(oldSourcePath), "old ingress parser owner or wrapper remains");
  assert(exists(newHeaderPath) && exists(newSourcePath), "core source request parser files are missing");
  const header = read(newHeaderPath);
  const source = read(newSourcePath);
  assert(header.includes("namespace core {") && source.includes("namespace core {"),
    "core parser namespace is missing");
  assert(!header.includes("namespace ingress") && !source.includes("namespace ingress"),
    "core parser retains ingress namespace ownership");
});

check("moved parser API and behavior bytes match the rollback owner", () => {
  const header = read(newHeaderPath);
  const source = read(newSourcePath);
  assert(sha256(normalizeHeader(header)) === rollbackHeaderSha256,
    "normalized parser header differs from rollback bytes");
  const normalizedSourceSha256 = sha256(normalizeSource(source));
  assert(normalizedSourceSha256 === rollbackSourceSha256,
    "normalized parser implementation differs from rollback bytes");
  assertOwnerSource(source);
});

check("CMake and exactly three production consumers use the core owner", () => {
  const cmake = read("CMakeLists.txt");
  const sessionHeader = read("include/core/session_manager.h");
  const sessionSource = read("src/core/session_manager.cpp");
  const rtspSource = read("src/ingress/gstreamer_rtsp_server.cpp");
  const httpSource = read("src/ingress/webrtc_http_server.cpp");
  assert(count(cmake, /src\/core\/source_request_parser\.cpp/g) === 1 &&
    !cmake.includes("src/ingress/request_parser.cpp"), "CMake parser owner is not exact");
  assert(sessionHeader.includes('#include "core/source_request_parser.h"') &&
    !sessionHeader.includes("ingress/request_parser.h"), "SessionManager header owner include drift");
  assert(count(sessionSource, /\bParseSourceSpec\(request, &parse_error\)/g) === 2 &&
    !sessionSource.includes("ingress::ParseSourceSpec"), "SessionManager parser consumer count drift");
  assert(rtspSource.includes('#include "core/source_request_parser.h"') &&
    count(rtspSource, /core::ParseSourceSpec\(request, &parse_error\)/g) === 1,
  "RTSP parser consumer drift");
  assert(!httpSource.includes("request_parser.h") && !httpSource.includes("ParseSourceSpec"),
    "WebRTC HTTP server retains an unused parser dependency");
  const production = [
    sessionHeader,
    sessionSource,
    rtspSource,
    httpSource,
    read(newHeaderPath),
    read(newSourcePath),
  ].join("\n");
  assert(!production.includes("ingress/request_parser.h") &&
    !production.includes("ingress::ParseSourceSpec"), "legacy parser include or namespace remains");
});

check("parser matrix preserves route, file, source-kind, and exact error semantics", () => {
  assert(exists(newHeaderPath) && exists(newSourcePath), "core parser implementation is missing");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "v390-source-parser-"));
  const harnessPath = path.join(tempDir, "source_parser_harness.cpp");
  const binaryPath = path.join(tempDir, "source_parser_harness");
  const harness = String.raw`
#include "core/source_request_parser.h"
#include <cstdlib>
#include <iostream>
#include <string>

namespace {
int passed = 0;
int failed = 0;
void Expect(bool condition, const char* label) {
    if (condition) { ++passed; return; }
    ++failed;
    std::cerr << "FAIL:" << label << "\n";
}
media::IngressRequest Request(std::string path) {
    media::IngressRequest request;
    request.path = std::move(path);
    return request;
}
void ExpectError(media::IngressRequest request, const std::string& expected, const char* label) {
    std::string error;
    const auto parsed = core::ParseSourceSpec(request, &error);
    Expect(!parsed.has_value() && error == expected, label);
}
}

int main() {
    setenv("MEDIA_SERVER_ROUTE", "stream", 1);
    setenv("MEDIA_SERVER_FILE_ROOT", "/tmp/v390-source-root", 1);
    unsetenv("MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE");

    Expect(core::IsSupportedPath("/stream"), "supported-root");
    Expect(core::IsSupportedPath("/stream/file/a.mp4"), "supported-child");
    Expect(!core::IsSupportedPath("/other"), "unsupported-path");

    auto filePath = core::ParseSourceSpecFromPath("/stream/file/sample.mp4");
    Expect(filePath && filePath->kind == media::SourceSpec::Kind::File &&
        filePath->uri == "/tmp/v390-source-root/sample.mp4", "file-path");
    auto urlPath = core::ParseSourceSpecFromPath("/stream/url/rtsp://camera/live");
    Expect(urlPath && urlPath->kind == media::SourceSpec::Kind::Rtsp &&
        urlPath->uri == "rtsp://camera/live", "url-path");

    auto fileQuery = Request("/stream");
    fileQuery.query["file"] = "clip.mp4";
    std::string error;
    auto parsed = core::ParseSourceSpec(fileQuery, &error);
    Expect(parsed && parsed->kind == media::SourceSpec::Kind::File &&
        parsed->uri == "/tmp/v390-source-root/clip.mp4" && error.empty(), "file-query");

    auto defaultUrl = Request("/stream");
    defaultUrl.query["url"] = "rtsp://camera/live";
    parsed = core::ParseSourceSpec(defaultUrl, &error);
    Expect(parsed && parsed->kind == media::SourceSpec::Kind::Rtsp, "default-rtsp");

    const struct { const char* token; media::SourceSpec::Kind kind; const char* url; } kinds[] = {
        {"rtsp", media::SourceSpec::Kind::Rtsp, "rtsp://camera/live"},
        {"webrtc", media::SourceSpec::Kind::WebRtc, "webrtc://publisher"},
        {"whep", media::SourceSpec::Kind::Whep, "https://example.test/whep"},
        {"hls", media::SourceSpec::Kind::Hls, "https://example.test/live.m3u8"},
        {"http", media::SourceSpec::Kind::Http, "https://example.test/video.mp4"},
    };
    for (const auto& item : kinds) {
        auto request = Request("/stream");
        request.query["url"] = item.url;
        request.query["source"] = item.token;
        error.clear();
        parsed = core::ParseSourceSpec(request, &error);
        Expect(parsed && parsed->kind == item.kind && parsed->uri == item.url && error.empty(), item.token);
    }

    ExpectError(Request("/other"), "unsupported request path", "error-path");
    ExpectError(Request("/stream"), "request must contain exactly one of file or url", "error-missing");
    auto both = Request("/stream"); both.query["file"] = "a"; both.query["url"] = "b";
    ExpectError(both, "request must contain exactly one of file or url", "error-both");
    auto traversal = Request("/stream"); traversal.query["file"] = "../outside.mp4";
    ExpectError(traversal, "file path is outside configured file root", "error-traversal");
    auto emptyUrl = Request("/stream"); emptyUrl.query["url"] = "";
    ExpectError(emptyUrl, "url query parameter is required", "error-url-empty");
    auto badWhep = Request("/stream"); badWhep.query["url"] = "rtsp://camera/live"; badWhep.query["source"] = "whep";
    ExpectError(badWhep, "source=whep requires an http(s) WHEP endpoint URL", "error-whep-scheme");
    auto unsupported = Request("/stream"); unsupported.query["url"] = "x"; unsupported.query["source"] = "ftp";
    ExpectError(unsupported, "unsupported source kind: ftp", "error-kind");
    auto youtube = Request("/stream"); youtube.query["url"] = "https://example.test/watch?v=x"; youtube.query["source"] = "youtube";
    ExpectError(youtube, "source=youtube is not available in this build; rebuild with MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE=ON to enable the lab-only experimental path", "error-youtube-default-off");

    std::cout << "pass=" << passed << " fail=" << failed << "\n";
    return failed == 0 ? 0 : 1;
}
`;
  fs.writeFileSync(harnessPath, harness);
  try {
    const compiler = process.env.CXX || "c++";
    const compile = spawnSync(compiler, [
      "-std=c++17",
      "-DMEDIA_SERVER_ENABLE_YOUTUBE_SOURCE=0",
      "-I", path.join(rootDir, "include"),
      harnessPath,
      path.join(rootDir, newSourcePath),
      path.join(rootDir, "src/app_config.cpp"),
      "-o", binaryPath,
    ], { cwd: rootDir, encoding: "utf8" });
    assert(compile.status === 0, `parser harness compile failed: ${compile.stderr || compile.stdout}`);
    const run = spawnSync(binaryPath, [], { cwd: rootDir, encoding: "utf8" });
    assert(run.status === 0 && run.stdout.includes("fail=0"),
      `parser harness failed: ${run.stdout}${run.stderr}`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

check("owner, consumer, error, and CMake mutations fail closed", () => {
  const header = read(newHeaderPath);
  const source = read(newSourcePath);
  const cmake = read("CMakeLists.txt");
  const sessionSource = read("src/core/session_manager.cpp");
  const namespaceMutation = header.replace("namespace core {", "namespace ingress {");
  assert(!(namespaceMutation.includes("namespace core {") &&
    !namespaceMutation.includes("namespace ingress {")), "namespace mutation was not detected");
  assert(sha256(normalizeSource(source.replace("unsupported source kind: ", "invalid source: "))) !== rollbackSourceSha256,
    "error mutation was not detected");
  assertOwnerSource(source);
  assert(count(cmake + "\nsrc/core/source_request_parser.cpp", /src\/core\/source_request_parser\.cpp/g) !== 1,
    "CMake duplicate mutation was not detected");
  assert(count(sessionSource.replace(/ParseSourceSpec\(request, &parse_error\)/, ""),
    /\bParseSourceSpec\(request, &parse_error\)/g) !== 2,
  "consumer omission mutation was not detected");
});

for (const item of checks) {
  console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
}
const passed = checks.filter(item => item.status === "PASS").length;
const failed = checks.length - passed;
console.log(`- summary: pass=${passed} fail=${failed}`);
process.exit(failed === 0 ? 0 : 1);
