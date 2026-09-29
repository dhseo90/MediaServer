#!/usr/bin/env node
// 파일 용도: RC 전용 release gate 명령, 문서, CI workflow, artifact 정책이 서로 맞는지 검증한다.

import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {hasDocumentLink, validateVerificationDocumentation} from "./documentation_contract_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const checks = [];
const ownedDirectories = new Set();
let childExecutions=[];

function runFixtureChild(executable,args,options) {
  const result=spawnSync(executable,args,{...options,encoding:'utf8',timeout:10000,maxBuffer:4*1024*1024});
  childExecutions.push({script:path.basename(args[0]),exit:result.status,signal:result.signal,
    stdout:result.stdout??'',stderr:result.stderr??'',errorCode:result.error?.code??null});
  if(result.error||result.signal||result.status!==0)throw new Error('fixture child failed: '+path.basename(args[0]));
}

function temporaryDirectory(prefix) {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),prefix));
  ownedDirectories.add(directory);
  return directory;
}

function failureSnapshot(error) {
  const clean=value=>{
    let text=String(value??'');
    for(const directory of ownedDirectories)text=text.replaceAll(directory,'<fixture>');
    text=text.replaceAll(rootDir,'<repository>');
    return {text:text.slice(0,32768),truncated:text.length>32768};
  };
  const files=[];
  const walk=(directory,base)=>{
    for(const name of fs.readdirSync(directory)){
      const file=path.join(directory,name),stat=fs.lstatSync(file);
      if(stat.isSymbolicLink())throw new Error('진단 대상 symlink 거부');
      if(stat.isDirectory()){walk(file,base);continue;}
      if(!stat.isFile())throw new Error('진단 대상 일반 파일 아님');
      const bytes=fs.readFileSync(file);
      const item={path:path.relative(base,file),bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
      // 직접 생성한 합성 입력/관측값만 남긴다. 이 정제 출력은 원본 바이트 보존 주장이 아니다.
      item.observed=clean(bytes.toString('utf8'));
      files.push(item);
    }
  };
  for(const directory of ownedDirectories)walk(directory,directory);
  return {kind:'rc-fixture-failure',children:childExecutions.map(item=>({...item,stdout:clean(item.stdout),stderr:clean(item.stderr)})),files};
}

const rcServerLongrunCommand = "./server.sh verify-v390-server-longrun --duration-minutes 120";
const rcRuntimeCommand = "./server.sh verify-va-runtime-console-longrun --duration-minutes 120";

check("stream verification guide defines the RC-only release gate", () => {
  const docs = readText("docs/stream-verification.md");
  const requiredSnippets = [
    rcServerLongrunCommand,
    rcRuntimeCommand,
    "--include-sidechannel",
    "--include-dashboard",
    "--include-rtsp",
    "--idle-after-cleanup-minutes 30",
    "./server.sh rc-release-checklist",
    "--history-dir",
    "index.md",
    "`artifacts/rc-gate/`",
    "media-server-rc-gate",
    "`rc-artifact-archive`",
    "`external-artifact-manifest.json`",
    "`SHA256SUMS`",
    "`NOT PRESERVED`",
  ];
  for (const snippet of requiredSnippets) {
    assert(docs.includes(snippet), `docs/stream-verification.md is missing RC gate snippet: ${snippet}`);
  }
});

check("release policy fixes longrun report retention locations", () => {
  const releasePolicy = readText("docs/release-policy.md");
  assert(hasDocumentLink(releasePolicy,"../AGENTS.md"),"release policy missing AGENTS.md retention/approval boundary link");
  assert(hasDocumentLink(releasePolicy,"stream-verification.md"),"release policy missing stream-verification.md retention definition link");
  const verification = readText("docs/stream-verification.md");
  for (const snippet of [
    "rc-release-checklist", "media-server-rc-gate", "rc-artifact-archive",
    "external-artifact-manifest.json", "SHA256SUMS", "NOT PRESERVED",
  ]) {
    assert(verification.includes(snippet), `docs/stream-verification.md missing retention contract: ${snippet}`);
  }
});

check("default smoke scripts do not call RC-only longrun commands", () => {
  const testAll = readText("scripts/internal/test_all.sh");
  const forbidden = [
    "verify-predev --soak-minutes 120",
    "verify-va-runtime-console-longrun --duration-minutes 120",
    "verify-va-runtime-console-longrun",
    "verify-va-runtime-console-cycles",
  ];
  for (const snippet of forbidden) {
    assert(!testAll.includes(snippet), `test_all.sh must not call RC-only command: ${snippet}`);
  }
});

check("server exposes RC gate verification without running the longrun", () => {
  const server = readText("server.sh");
  assert(server.includes("verify-rc-release-gate"), "server.sh is missing verify-rc-release-gate command");
  assert(server.includes("verify_rc_release_gate.mjs"), "server.sh does not dispatch verify_rc_release_gate.mjs");
  assert(server.includes("rc-release-checklist"), "server.sh is missing rc-release-checklist command");
  assert(server.includes("write_rc_release_checklist.mjs"), "server.sh does not dispatch write_rc_release_checklist.mjs");
});

check("GitHub Actions workflow uploads RC gate artifacts", () => {
  const workflow = readText(".github/workflows/rc-release-gate.yml");
  const requiredSnippets = [
    "name: RC Release Gate",
    "workflow_dispatch",
    "run_predev_120",
    "verify-v390-server-longrun",
    "run_va_runtime_120",
    "runner_label",
    "require_va_assets",
    "artifact_retention_days",
    "external_artifact_dir",
    "Check RC gate assets",
    "asset-manifest.json",
    "retention-days: ${{ inputs.artifact_retention_days }}",
    "artifacts/rc-gate",
    "./server.sh rc-release-checklist",
    "--asset-manifest artifacts/rc-gate/asset-manifest.json",
    "--runner-label",
    "--artifact-retention-days",
    "--history-dir artifacts/rc-gate/history",
    "Archive RC artifact to external storage",
    "./server.sh rc-artifact-archive",
    "--source-dir artifacts/rc-gate",
    "--destination-dir",
    "--retention-days",
    "--history-dir artifacts/rc-gate/history",
    "--artifact-name media-server-rc-gate",
    "actions/upload-artifact@v6",
    "media-server-rc-gate",
  ];
  for (const snippet of requiredSnippets) {
    assert(workflow.includes(snippet), `rc-release-gate workflow missing snippet: ${snippet}`);
  }
});

check("release checklist generator writes Markdown output", () => {
  const workDir = temporaryDirectory("media-server-rc-checklist-");
  const predevSummary = path.join(workDir, "predev-summary.json");
  const runtimeSummary = path.join(workDir, "runtime-summary.json");
  const predevReport = path.join(workDir, "predev-report.md");
  const runtimeReport = path.join(workDir, "runtime-report.md");
  const assetManifest = path.join(workDir, "asset-manifest.json");
  const historyDir = path.join(workDir, "history");
  const output = path.join(workDir, "release-checklist.md");
  const htmlOutput = path.join(workDir, "release-checklist.html");
  fs.writeFileSync(predevSummary, JSON.stringify({ status: "pass", passCount: 69, failCount: 0 }), "utf8");
  fs.writeFileSync(runtimeSummary, JSON.stringify({ ok: true, passCount: 12, failCount: 0 }), "utf8");
  fs.writeFileSync(predevReport, "# predev\n", "utf8");
  fs.writeFileSync(runtimeReport, "# runtime\n", "utf8");
  fs.writeFileSync(assetManifest, JSON.stringify({
    schema: "media-server.rc-gate-assets.v1",
    runnerLabel: "self-hosted-macos-va",
    artifactRetentionDays: "45",
    samples: [{ path: "video/sample_h264.mp4", status: "ok" }],
    model: { path: "models/yolo11n.onnx", status: "ok" },
    labels: { path: "models/coco.names", status: "ok" },
  }), "utf8");
  runFixtureChild(process.execPath, [
    path.join(rootDir, "scripts/internal/write_rc_release_checklist.mjs"),
    "--predev-summary", predevSummary,
    "--predev-report", predevReport,
    "--runtime-summary", runtimeSummary,
    "--runtime-report", runtimeReport,
    "--output", output,
    "--html-output", htmlOutput,
    "--artifact-name", "media-server-rc-gate",
    "--asset-manifest", assetManifest,
    "--runner-label", "self-hosted-macos-va",
    "--artifact-retention-days", "45",
    "--history-dir", historyDir,
  ], {
    cwd: rootDir,
    stdio: "pipe",
    env: {
      ...process.env,
      GITHUB_SERVER_URL: "https://github.com",
      GITHUB_REPOSITORY: "example/mediaServer",
      GITHUB_RUN_ID: "12345",
      GITHUB_REF_NAME: "main",
      GITHUB_SHA: "abcdef1234567890",
    },
  });
  const markdown = fs.readFileSync(output, "utf8");
  const html = fs.readFileSync(htmlOutput, "utf8");
  const historyJson = fs.readFileSync(path.join(historyDir, "index.json"), "utf8");
  const historyMarkdown = fs.readFileSync(path.join(historyDir, "index.md"), "utf8");
  const historyHtml = fs.readFileSync(path.join(historyDir, "index.html"), "utf8");
  assert(markdown.includes("# RC Release Checklist"), "release checklist missing title");
  assert(markdown.includes("overall: PASS"), "release checklist missing PASS status");
  assert(markdown.includes("reportHistory:"), "release checklist missing report history link");
  assert(markdown.includes("Server 120m release-grade longrun"), "release checklist missing server longrun row");
  assert(markdown.includes("VA runtime console 120m longrun"), "release checklist missing runtime row");
  assert(markdown.includes("ciArtifact: media-server-rc-gate"), "release checklist missing CI artifact");
  assert(markdown.includes("artifactRetentionDays: 45"), "release checklist missing artifact retention");
  assert(markdown.includes("runner: self-hosted-macos-va"), "release checklist missing runner label");
  assert(markdown.includes("assetStatus: PASS"), "release checklist missing asset status");
  assert(markdown.includes("https://github.com/example/mediaServer/actions/runs/12345"), "release checklist missing CI run URL");
});

check("release checklist generator writes HTML output", () => {
  const workDir = temporaryDirectory("media-server-rc-checklist-");
  const predevSummary = path.join(workDir, "predev-summary.json");
  const runtimeSummary = path.join(workDir, "runtime-summary.json");
  const predevReport = path.join(workDir, "predev-report.md");
  const runtimeReport = path.join(workDir, "runtime-report.md");
  const assetManifest = path.join(workDir, "asset-manifest.json");
  const historyDir = path.join(workDir, "history");
  const output = path.join(workDir, "release-checklist.md");
  const htmlOutput = path.join(workDir, "release-checklist.html");
  fs.writeFileSync(predevSummary, JSON.stringify({ status: "pass", passCount: 69, failCount: 0 }), "utf8");
  fs.writeFileSync(runtimeSummary, JSON.stringify({ ok: true, passCount: 12, failCount: 0 }), "utf8");
  fs.writeFileSync(predevReport, "# predev\n", "utf8");
  fs.writeFileSync(runtimeReport, "# runtime\n", "utf8");
  fs.writeFileSync(assetManifest, JSON.stringify({
    schema: "media-server.rc-gate-assets.v1",
    runnerLabel: "self-hosted-macos-va",
    artifactRetentionDays: "45",
    samples: [{ path: "video/sample_h264.mp4", status: "ok" }],
    model: { path: "models/yolo11n.onnx", status: "ok" },
    labels: { path: "models/coco.names", status: "ok" },
  }), "utf8");
  runFixtureChild(process.execPath, [
    path.join(rootDir, "scripts/internal/write_rc_release_checklist.mjs"),
    "--predev-summary", predevSummary,
    "--predev-report", predevReport,
    "--runtime-summary", runtimeSummary,
    "--runtime-report", runtimeReport,
    "--output", output,
    "--html-output", htmlOutput,
    "--artifact-name", "media-server-rc-gate",
    "--asset-manifest", assetManifest,
    "--runner-label", "self-hosted-macos-va",
    "--artifact-retention-days", "45",
    "--history-dir", historyDir,
  ], {
    cwd: rootDir,
    stdio: "pipe",
    env: {
      ...process.env,
      GITHUB_SERVER_URL: "https://github.com",
      GITHUB_REPOSITORY: "example/mediaServer",
      GITHUB_RUN_ID: "12345",
      GITHUB_REF_NAME: "main",
      GITHUB_SHA: "abcdef1234567890",
    },
  });
  const html = fs.readFileSync(htmlOutput, "utf8");
  const historyJson = fs.readFileSync(path.join(historyDir, "index.json"), "utf8");
  const historyMarkdown = fs.readFileSync(path.join(historyDir, "index.md"), "utf8");
  const historyHtml = fs.readFileSync(path.join(historyDir, "index.html"), "utf8");
  assert(html.includes("RC Release Checklist"), "release checklist HTML missing title");
  assert(historyJson.includes("media-server.rc-soak-history.v1"), "history index JSON missing schema");
  assert(historyMarkdown.includes("# RC Soak Report History"), "history index Markdown missing title");
  assert(historyMarkdown.includes("Server 120m release-grade longrun: PASS"), "history index missing server longrun status");
  assert(historyMarkdown.includes("VA runtime console 120m longrun: PASS"), "history index missing runtime status");
  assert(historyHtml.includes("RC Soak Report History"), "history index HTML missing title");
});

check("external RC artifact archive writes checksums", () => {
  const workDir = temporaryDirectory("media-server-rc-external-");
  const sourceDir = path.join(workDir, "source");
  const destinationDir = path.join(workDir, "external");
  fs.mkdirSync(path.join(sourceDir, "history"), { recursive: true });
  fs.writeFileSync(path.join(sourceDir, "rc-release-checklist.md"), "# checklist\n", "utf8");
  fs.writeFileSync(path.join(sourceDir, "history", "index.md"), "# history\n", "utf8");
  runFixtureChild(process.execPath, [
    path.join(rootDir, "scripts/internal/archive_rc_gate_artifact.mjs"),
    "--source-dir", sourceDir,
    "--destination-dir", destinationDir,
    "--run-id", "12345",
    "--retention-days", "30",
  ], { cwd: rootDir, stdio: "pipe" });
  const manifestPath = path.join(destinationDir, "12345", "external-artifact-manifest.json");
  const checksumsPath = path.join(destinationDir, "12345", "SHA256SUMS");
  const indexJsonPath = path.join(destinationDir, "index.json");
  const indexMdPath = path.join(destinationDir, "index.md");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert(manifest.schema === "media-server.rc-external-artifact.v1", "external artifact manifest schema mismatch");
  assert(manifest.files.some(file => file.path === "rc-release-checklist.md"), "manifest missing checklist");
  assert(fs.readFileSync(checksumsPath, "utf8").includes("rc-release-checklist.md"), "SHA256SUMS missing checklist");
});

check("external RC artifact archive writes index", () => {
  const workDir = temporaryDirectory("media-server-rc-external-");
  const sourceDir = path.join(workDir, "source");
  const destinationDir = path.join(workDir, "external");
  fs.mkdirSync(path.join(sourceDir, "history"), { recursive: true });
  fs.writeFileSync(path.join(sourceDir, "rc-release-checklist.md"), "# checklist\n", "utf8");
  fs.writeFileSync(path.join(sourceDir, "history", "index.md"), "# history\n", "utf8");
  runFixtureChild(process.execPath, [
    path.join(rootDir, "scripts/internal/archive_rc_gate_artifact.mjs"),
    "--source-dir", sourceDir,
    "--destination-dir", destinationDir,
    "--run-id", "12345",
    "--retention-days", "30",
  ], { cwd: rootDir, stdio: "pipe" });
  const indexJsonPath = path.join(destinationDir, "index.json");
  const indexMdPath = path.join(destinationDir, "index.md");
  assert(fs.readFileSync(indexJsonPath, "utf8").includes("media-server.rc-external-artifact-index.v1"), "external artifact index missing schema");
  assert(fs.readFileSync(indexMdPath, "utf8").includes("RC External Artifact Index"), "external artifact index markdown missing title");
});

check("현행 검증 기준이 영역과 실행 승인 기준으로 연결됨", () => {
  const errors=validateVerificationDocumentation({agents:readText("AGENTS.md"),verification:readText("docs/stream-verification.md")});
  assert(errors.length===0,errors.join("; "));
});

let failCount = 0;
let passCount = 0;
let completedCount = 0;
for (const item of checks) {
  completedCount += 1;
  childExecutions=[];
  let canCleanup=true;
  try {
    item.run();
    passCount += 1;
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failCount += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[fail] ${item.name}: ${message}`);
    try {
      if(ownedDirectories.size>0)console.log(JSON.stringify(failureSnapshot(error)));
    } catch(diagnosticError){
      canCleanup=false;
      console.log(`[fail] fixture diagnostics incomplete: ${diagnosticError.message}; 자료 보존`);
    }
  } finally {
    for(const directory of canCleanup?ownedDirectories:[]){
      try {
        assert(!fs.lstatSync(directory).isSymbolicLink(),"owned fixture directory replaced by symlink");
        fs.rmSync(directory,{recursive:true,force:false});
        assert(!fs.existsSync(directory),"owned fixture cleanup incomplete");
        ownedDirectories.delete(directory);
      } catch(error) {
        failCount += 1;
        console.log(`[fail] fixture cleanup: ${error.message}`);
      }
    }
  }
  // 정리 실패가 남으면 새 fixture를 만들지 않는다. 최초 실패와 잔여 자료는 유지한다.
  if(ownedDirectories.size>0)break;
}

console.log("");
console.log("== RC release gate verification summary ==");
console.log(`- pass: ${passCount}`);
console.log(`- fail: ${failCount}`);
console.log(`- not-run: ${checks.length-completedCount}`);
console.log("- 범위: 합성 결과의 도구 자체검사이며 실제 120분·외부 저장소·릴리즈를 실행하지 않았습니다.");

if (failCount > 0) {
  process.exit(1);
}

function check(name, run) {
  checks.push({ name, run });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
