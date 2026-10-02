#!/usr/bin/env node
// 파일 용도: release/version metadata가 VERSION, CMake, README, release 문서에서 같은 기준을 말하는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import {readReleaseContext, validateReleaseContext, validateLocalReleaseDocuments} from "./release_documentation_contract.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
let rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Release metadata consistency verification

Usage:
  ./server.sh verify-release-metadata [options]

Options:
  --root <path>         로컬 검사 대상 소스 루트. --published와 함께 사용하지 않습니다.
  --report <path>       Markdown 리포트를 저장합니다.
  --json-report <path>  JSON 리포트를 저장합니다.
  --published           publish 이후 GitHub latest/release/tag까지 확인합니다.
  --require-published   --published alias입니다.
  --allow-unpublished   이전 호환 옵션입니다. 기본 local metadata 모드와 동일하게 처리합니다.
  --release-branch <name>  published mode에서 원격 branch HEAD를 비교할 branch입니다. 기본은 현재 branch입니다.
  --self-test-fallback-policy  네트워크 없이 GitHub metadata fallback/failure 분류 정책을 자체 점검합니다.
  -h, --help            도움말 출력

Checks:
  - VERSION과 CMake project VERSION 값이 같은 semantic version인지 확인
  - 릴리즈 정책의 release-metadata 값과 README의 source/target/공개 관측·Latest 링크를 대조
  - 기본 모드에서는 GitHub latest/tag 외부 확인을 실행하지 않고 --published 재검증 안내로 기록
  - --published 모드에서는 GitHub Releases latest/list/view, GitHub API /releases/latest, 원격 tag/branch, repository page Releases/Latest link가 최신 공개 tag를 가리키는지 확인
  - gh 인증/도구 실패는 curl GitHub REST API fallback, SSH origin refs 실패는 HTTPS refs fallback으로 재시도하고 외부 접근 실패를 failure-class로 구분
  - 현행 release note·roadmap·문서 색인 존재 확인. 과거 제목·PASS 일지·모든 문서의 버전 복제를 요구하지 않음
`);
}

assertKnownOptions(rawArgs, ["root", "report", "json-report", "published", "require-published", "allow-unpublished", "release-branch", "self-test-fallback-policy", "h", "help"]);

const args = parseArgs(rawArgs);
if (args.root) {
  assert(typeof args.root === "string" && args.root !== "1", "--root requires a path");
  rootDir = path.resolve(args.root);
  assert(fs.existsSync(rootDir) && fs.statSync(rootDir).isDirectory(), "--root must be an existing directory");
}
if (args.selfTestFallbackPolicy) {
  runFallbackPolicySelfTest();
  process.exit(0);
}
const allowUnpublished = Boolean(args.allowUnpublished);
const publishedMode = Boolean(args.published || args.requirePublished);
assert(!(publishedMode && args.root), "--root is local-only; published verification uses the calling repository");
if (allowUnpublished && publishedMode) {
  throw new Error("--allow-unpublished cannot be combined with --published/--require-published");
}
const reportPath = args.report ? path.resolve(rootDir, args.report) : "";
const jsonReportPath = args.jsonReport ? path.resolve(rootDir, args.jsonReport) : "";
const checks = [];
const report = {
  schema: "media-server.release-metadata-consistency.v1",
  generatedAt: new Date().toISOString(),
  status: "pass",
  mode: publishedMode ? "published-release" : "local-release-metadata",
  currentVersion: "",
  currentTag: "",
  checks: [],
};

const version = readText("VERSION").trim();
assert(/^\d+\.\d+\.\d+$/.test(version), `VERSION must be semver, got ${version}`);
const currentTag = `v${version}`;
const releaseContext = readReleaseContext(readText("docs/release-policy.md"));
const contextErrors = validateReleaseContext(releaseContext, version);
assert(contextErrors.length === 0, contextErrors.join("; "));
const releaseTargetTag = releaseContext.releaseTarget;
const latestPublishedTag = releaseContext.published.tag;
const githubRepository = releaseContext.repository;
if (publishedMode) assert(resolveGithubRepository() === githubRepository, "GitHub repository differs from release context");
const repositoryUrl = `https://github.com/${githubRepository}`;
const liveLatestUrl = `${repositoryUrl}/releases/latest`;
const expectedReleaseUrl = `${repositoryUrl}/releases/tag/${releaseTargetTag}`;
const currentBranch = resolveCurrentBranch();
const releaseBranch = args.releaseBranch || process.env.MEDIA_SERVER_RELEASE_BRANCH || currentBranch;
report.currentVersion = version;
report.currentTag = currentTag;
report.releaseTargetTag = releaseTargetTag;
report.latestPublishedTag = publishedMode ? releaseTargetTag : latestPublishedTag;
report.cutPriorPublishedTag = releaseContext.priorPublishedTag;
report.publishedSnapshot = {...releaseContext.published, source: "documented-observation-not-current-remote-verification"};
report.latestPublishedVersion = report.latestPublishedTag.replace(/^v/, "");
report.github = {
  repository: githubRepository,
  repositoryUrl,
  expectedReleaseUrl,
  currentBranch,
  releaseBranch,
  latestRelease: null,
  releaseListLatest: null,
  releaseView: null,
  remoteTag: null,
  remoteBranch: null,
  repositoryLandingPage: null,
};
report.publishedEvidence = {
  schema: "media-server.published-release-evidence.v1",
  status: publishedMode ? "pending" : "manual-not-run",
  repository: githubRepository,
  repositoryUrl,
  expectedReleaseUrl,
  currentTag,
  releaseTargetTag,
  latestPublishedTag: publishedMode ? releaseTargetTag : latestPublishedTag,
  cutPriorPublishedTag: releaseContext.priorPublishedTag,
  currentBranch,
  releaseBranch,
  command: "./server.sh verify-release-metadata --published --report <report.md> --json-report <report.json>",
  fallbackPolicy: {
    schema: "media-server.github-metadata-fallback-policy.v1",
    ghFallback: "curl GitHub REST API /releases, /releases/latest, /releases/tags/<tag>",
    remoteRefFallback: `git ls-remote against https://github.com/${githubRepository}.git`,
    failureClasses: ["external-auth-or-permission", "external-network", "tool-unavailable", "external-github-access"],
  },
  evidence: {},
};

check("current release documents preserve version and publication boundaries", () => {
  const errors = validateLocalReleaseDocuments(rootDir, releaseContext, version);
  assert(errors.length === 0, errors.join("; "));
  return {version, releaseTargetTag, publishedSnapshotTag: latestPublishedTag,
    priorPublishedTag: releaseContext.priorPublishedTag, tagType: releaseContext.tagType,
    distribution: releaseContext.distribution, releaseNotes: releaseContext.releaseNotes,
    roadmap: releaseContext.roadmap};
});

check("historical v2.9 source-of-truth remains distinct from latest published v2.8", () => {
  const fixture = JSON.parse(readText("test/fixtures/release_metadata_boundary.json"));
  const boundary = fixture.case;
  const historicalBoundaryObserved = boundary.sourceVersion === "2.9.0" &&
    boundary.context.published.tag === "v2.8.0" && fixture.executionEvidence === false &&
    boundary.roadmapTitle === "v2.9.0 Final 2.x Closure & Compatibility Baseline" &&
    validateReleaseContext(boundary.context, boundary.sourceVersion).length === 0;
  assert(historicalBoundaryObserved,
    "historical source/published/roadmap fixture boundary drifted");
  const collapsed = {...boundary.context, releaseTarget: boundary.context.published.tag};
  assert(validateReleaseContext(collapsed, boundary.sourceVersion).length > 0,
    "source and published version collapse must fail");
  return {fixture: "test/fixtures/release_metadata_boundary.json", productExecutionEvidence: false,
    externalActionsExecuted: false};
});

if (!publishedMode) {
  check("default mode records published metadata verification as external gate", () => {
    report.publishedEvidence.reason = "Default mode checks local release metadata only; rerun with --published to verify GitHub Latest Release, remote tag, and release branch.";
    return {
      mode: "local-release-metadata",
      status: "external-not-checked",
      reason: "Default mode checks local release metadata only; rerun with --published to verify GitHub Latest Release, remote tag, and release branch.",
      expectedReleaseUrl,
      releaseBranch,
    };
  });
} else {
  check("GitHub release list latest tag matches release target", () => {
  const releaseListEvidence = readGithubReleaseListLatestWithFallback();
  const releaseList = releaseListEvidence.releaseList;
  assert(Array.isArray(releaseList), "GitHub release list did not return an array");
  const listedLatest = releaseListEvidence.latest;
  assert(listedLatest, "gh release list did not mark any release as latest");
  assert(listedLatest.tagName === releaseTargetTag, `GitHub latest release list tag ${listedLatest.tagName} does not match ${releaseTargetTag}`);
  assert(listedLatest.isDraft === false, "GitHub latest release list entry is draft");
  assert(listedLatest.isPrerelease === false, "GitHub latest release list entry is prerelease");
  report.github.releaseListLatest = {
    ...listedLatest,
    source: releaseListEvidence.source,
    fallbackUsed: releaseListEvidence.fallbackUsed,
    primaryFailure: releaseListEvidence.primaryFailure || null,
  };
  report.publishedEvidence.evidence.releaseListLatest = report.github.releaseListLatest;
  return {
    repository: githubRepository,
    releaseListTag: listedLatest.tagName,
    source: releaseListEvidence.source,
    fallbackUsed: releaseListEvidence.fallbackUsed,
  };
  });

  check("GitHub API latest release matches release target", () => {
  const latestEvidence = readGithubLatestApiWithFallback();
  const latestApi = latestEvidence.release;
  assert(latestApi?.tag_name === releaseTargetTag, `GitHub API latest release tag ${latestApi?.tag_name || "-"} does not match ${releaseTargetTag}`);
  assert(latestApi?.html_url === expectedReleaseUrl, `GitHub API latest release URL ${latestApi?.html_url || "-"} does not match ${expectedReleaseUrl}`);
  assert(latestApi?.draft === false, "GitHub API latest release is draft");
  assert(latestApi?.prerelease === false, "GitHub API latest release is prerelease");
  report.github.latestRelease = latestApi;
  report.publishedEvidence.evidence.latestReleaseApi = {
    ...summarizeLatestReleaseApi(latestApi),
    source: latestEvidence.source,
    fallbackUsed: latestEvidence.fallbackUsed,
    primaryFailure: latestEvidence.primaryFailure || null,
  };
  return {
    repository: githubRepository,
    apiTag: latestApi.tag_name,
    releaseUrl: latestApi.html_url,
    source: latestEvidence.source,
    fallbackUsed: latestEvidence.fallbackUsed,
  };
  });

  check("GitHub release view matches release target", () => {
  const releaseViewEvidence = readGithubReleaseViewWithFallback();
  const releaseView = releaseViewEvidence.release;
  assert(releaseView?.tagName === releaseTargetTag, `gh release view tag ${releaseView?.tagName || "-"} does not match ${releaseTargetTag}`);
  assert(releaseView?.url === expectedReleaseUrl, `gh release view URL ${releaseView?.url || "-"} does not match ${expectedReleaseUrl}`);
  assert(releaseView?.isDraft === false, "gh release view reports a draft release");
  assert(releaseView?.isPrerelease === false, "gh release view reports a prerelease");
  report.github.releaseView = {
    ...releaseView,
    source: releaseViewEvidence.source,
    fallbackUsed: releaseViewEvidence.fallbackUsed,
    primaryFailure: releaseViewEvidence.primaryFailure || null,
  };
  report.publishedEvidence.evidence.releaseView = report.github.releaseView;
  return {
    repository: githubRepository,
    releaseViewTag: releaseView.tagName,
    releaseUrl: releaseView.url,
    source: releaseViewEvidence.source,
    fallbackUsed: releaseViewEvidence.fallbackUsed,
  };
  });

  check("remote origin exposes release target tag", () => {
  const remoteTagEvidence = readRemoteRefWithHttpsFallback("tags", releaseTargetTag);
  const remoteTag = remoteTagEvidence.output;
  const remoteLines = remoteTag.split("\n").map(line => line.trim()).filter(Boolean);
  const exactTagLine = remoteLines.find(line => line.endsWith(`refs/tags/${releaseTargetTag}`));
  assert(exactTagLine, `remote origin does not expose refs/tags/${releaseTargetTag}`);
  const [sha] = exactTagLine.split(/\s+/);
  assert(/^[0-9a-f]{40}$/.test(sha), `remote tag ${releaseTargetTag} did not return a tag object SHA`);
  report.github.remoteTag = {
    tag: releaseTargetTag,
    sha,
    source: remoteTagEvidence.source,
    fallbackUsed: remoteTagEvidence.fallbackUsed,
    primaryFailure: remoteTagEvidence.primaryFailure || null,
  };
  report.publishedEvidence.evidence.remoteTag = report.github.remoteTag;
  return {
    repository: githubRepository,
    remoteTag: releaseTargetTag,
    remoteTagObjectSha: sha,
    source: remoteTagEvidence.source,
    fallbackUsed: remoteTagEvidence.fallbackUsed,
  };
  });

  check("remote origin exposes release branch head", () => {
  assert(releaseBranch && releaseBranch !== "HEAD", "release branch must resolve to a named branch");
  const localHead = runTextCommand("git", ["rev-parse", "HEAD"]).trim();
  assert(/^[0-9a-f]{40}$/.test(localHead), `local HEAD did not resolve to a commit SHA: ${localHead}`);
  const remoteBranchEvidence = readRemoteRefWithHttpsFallback("heads", releaseBranch);
  const remoteBranchOutput = remoteBranchEvidence.output;
  const remoteLines = remoteBranchOutput.split("\n").map(line => line.trim()).filter(Boolean);
  const exactBranchLine = remoteLines.find(line => line.endsWith(`refs/heads/${releaseBranch}`));
  assert(exactBranchLine, `remote origin does not expose refs/heads/${releaseBranch}`);
  const [remoteSha] = exactBranchLine.split(/\s+/);
  assert(/^[0-9a-f]{40}$/.test(remoteSha), `remote branch ${releaseBranch} did not return a commit SHA`);
  assert(remoteSha === localHead, `remote branch ${releaseBranch} (${remoteSha}) does not match local HEAD (${localHead})`);
  report.github.remoteBranch = {
    branch: releaseBranch,
    remoteSha,
    localHead,
    source: remoteBranchEvidence.source,
    fallbackUsed: remoteBranchEvidence.fallbackUsed,
    primaryFailure: remoteBranchEvidence.primaryFailure || null,
  };
  report.publishedEvidence.evidence.remoteBranch = report.github.remoteBranch;
  return {
    repository: githubRepository,
    remoteBranch: releaseBranch,
    remoteSha,
    source: remoteBranchEvidence.source,
    fallbackUsed: remoteBranchEvidence.fallbackUsed,
  };
  });

  check("GitHub repository page exposes Releases Latest link", () => {
  report.github.repositoryLandingPage = readRepositoryReleaseLink();
  report.publishedEvidence.evidence.repositoryLandingPage = report.github.repositoryLandingPage;
  return {
    repository: githubRepository,
    repositoryUrl,
    expectedRightRail: "Releases / Latest",
    expectedHref: expectedReleaseUrl,
    source: report.github.repositoryLandingPage.source,
  };
  });
}

let pass = 0;
let fail = 0;
for (const item of checks) {
  try {
    const detail = item.fn() || {};
    pass += 1;
    report.checks.push({ name: item.name, status: "pass", detail });
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    fail += 1;
    report.status = "fail";
    const message = error instanceof Error ? error.message : String(error);
    report.checks.push({ name: item.name, status: "fail", message });
    console.log(`[fail] ${item.name}: ${message}`);
  }
}

report.publishedEvidence.status = publishedMode ? report.status : "external-not-checked";
if (publishedMode && fail > 0) {
  report.publishedEvidence.failedChecks = report.checks
    .filter(item => item.status === "fail")
    .map(item => item.name);
}

console.log("");
console.log("== Release metadata consistency summary ==");
console.log(`- current version: ${version}`);
console.log(`- current tag: ${currentTag}`);
console.log(`- release target tag: ${releaseTargetTag}`);
console.log(`- cut-prior published tag: ${releaseContext.priorPublishedTag}`);
console.log(`- published metadata: ${report.publishedEvidence.status}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);

if (reportPath) writeText(reportPath, renderMarkdown(report));
if (jsonReportPath) writeText(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function renderMarkdown(payload) {
  const lines = [
    "# Release Metadata Consistency Report",
    "",
    `- schema: ${payload.schema}`,
    `- generatedAt: ${payload.generatedAt}`,
    `- status: ${payload.status}`,
    `- mode: ${payload.mode}`,
    `- currentVersion: ${payload.currentVersion}`,
    `- currentTag: ${payload.currentTag}`,
    `- releaseTargetTag: ${payload.releaseTargetTag || "-"}`,
    `- latestPublishedTag: ${payload.latestPublishedTag || "-"}`,
    `- cutPriorPublishedTag: ${payload.cutPriorPublishedTag || "-"}`,
    `- publishedMetadata: ${payload.publishedEvidence?.status || "-"}`,
    `- repository: ${payload.github?.repository || "-"}`,
    `- releaseBranch: ${payload.github?.releaseBranch || "-"}`,
    "",
    "## Published Release Evidence",
    "",
    `- schema: ${payload.publishedEvidence?.schema || "-"}`,
    `- status: ${payload.publishedEvidence?.status || "-"}`,
    `- expectedReleaseUrl: ${payload.publishedEvidence?.expectedReleaseUrl || "-"}`,
    `- command: ${payload.publishedEvidence?.command || "-"}`,
    `- fallbackPolicy: ${payload.publishedEvidence?.fallbackPolicy?.schema || "-"}`,
    `- ghFallback: ${payload.publishedEvidence?.fallbackPolicy?.ghFallback || "-"}`,
    `- remoteRefFallback: ${payload.publishedEvidence?.fallbackPolicy?.remoteRefFallback || "-"}`,
    "",
    "| 결과 | 검사 | 상세 |",
    "| --- | --- | --- |",
  ];
  for (const item of payload.checks) {
    const detail = item.message || JSON.stringify(item.detail || {});
    lines.push(`| ${item.status.toUpperCase()} | ${cell(item.name)} | ${cell(detail)} |`);
  }
  return `${lines.join("\n")}\n`;
}

function cell(value) {
  return String(value || "-").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
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

function runFallbackPolicySelfTest() {
  const samples = [
    ["gh auth login required before accessing releases", "external-auth-or-permission"],
    ["git@github.com: Permission denied (publickey). Could not read from remote repository.", "external-auth-or-permission"],
    ["curl: (6) Could not resolve host: github.com", "external-network"],
    ["spawn gh ENOENT", "tool-unavailable"],
  ];
  for (const [message, expected] of samples) {
    const actual = classifyExternalFailure(message);
    assert(actual === expected, `fallback classifier expected ${expected} for "${message}", got ${actual}`);
  }
  const normalizedView = normalizeGithubApiReleaseView({
    tag_name: "v1.8.0",
    html_url: "https://github.com/example/repo/releases/tag/v1.8.0",
    published_at: "2026-05-26T00:00:00Z",
    draft: false,
    prerelease: false,
    target_commitish: "main",
  });
  assert(normalizedView.tagName === "v1.8.0", "fallback release view tag normalization failed");
  assert(normalizedView.url.endsWith("/v1.8.0"), "fallback release view URL normalization failed");
  assert(normalizedView.isDraft === false, "fallback release view draft normalization failed");
  const normalizedList = normalizeGithubApiReleaseForList({ tag_name: "v1.8.0", draft: false, prerelease: false, published_at: "2026-05-26T00:00:00Z" });
  assert(normalizedList.tagName === "v1.8.0", "fallback release list tag normalization failed");
  assert(normalizedList.isPrerelease === false, "fallback release list prerelease normalization failed");
  console.log("[pass] GitHub metadata fallback failure classes");
  console.log("[pass] GitHub REST API release normalization");
  console.log("");
  console.log("== Release metadata fallback policy self-test summary ==");
  console.log("- pass: 2");
  console.log("- fail: 0");
}

function summarizeLatestReleaseApi(release) {
  return {
    id: release?.id || null,
    tagName: release?.tag_name || "",
    htmlUrl: release?.html_url || "",
    publishedAt: release?.published_at || "",
    draft: release?.draft,
    prerelease: release?.prerelease,
  };
}

function resolveCurrentBranch() {
  const result = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {cwd: rootDir, encoding: "utf8"});
  return result.status === 0 ? String(result.stdout || "").trim() : null;
}

function readGithubReleaseListLatestWithFallback() {
  const ghArgs = [
    "release",
    "list",
    "--repo",
    githubRepository,
    "--limit",
    "20",
    "--json",
    "tagName,isLatest,publishedAt,isDraft,isPrerelease",
  ];
  try {
    const releaseList = runJsonCommand("gh", ghArgs);
    const latest = Array.isArray(releaseList) ? releaseList.find((item) => item?.isLatest === true) : null;
    return {
      releaseList,
      latest,
      source: "gh release list",
      fallbackUsed: false,
    };
  } catch (primaryError) {
    const primaryMessage = errorMessage(primaryError);
    try {
      const apiList = runCurlJson(githubApiUrl(`repos/${githubRepository}/releases?per_page=20`));
      const latestApi = runCurlJson(githubApiUrl(`repos/${githubRepository}/releases/latest`));
      assert(Array.isArray(apiList), "GitHub REST /releases did not return an array");
      const latestTag = latestApi?.tag_name || "";
      const releaseList = apiList.map((item) => {
        const normalized = normalizeGithubApiReleaseForList(item);
        return { ...normalized, isLatest: normalized.tagName === latestTag };
      });
      const latest = releaseList.find((item) => item.isLatest === true) || normalizeGithubApiReleaseForList(latestApi);
      return {
        releaseList,
        latest: { ...latest, isLatest: true },
        source: "curl GitHub REST API /releases + /releases/latest fallback",
        fallbackUsed: true,
        primaryFailure: summarizeExternalFailure(primaryMessage),
      };
    } catch (fallbackError) {
      throw new Error(formatExternalFailure("GitHub release list/latest", primaryMessage, errorMessage(fallbackError)));
    }
  }
}

function readGithubLatestApiWithFallback() {
  const ghArgs = ["api", `repos/${githubRepository}/releases/latest`];
  try {
    return {
      release: runJsonCommand("gh", ghArgs),
      source: "gh api repos/<repo>/releases/latest",
      fallbackUsed: false,
    };
  } catch (primaryError) {
    const primaryMessage = errorMessage(primaryError);
    try {
      return {
        release: runCurlJson(githubApiUrl(`repos/${githubRepository}/releases/latest`)),
        source: "curl GitHub REST API /releases/latest fallback",
        fallbackUsed: true,
        primaryFailure: summarizeExternalFailure(primaryMessage),
      };
    } catch (fallbackError) {
      throw new Error(formatExternalFailure("GitHub API latest release", primaryMessage, errorMessage(fallbackError)));
    }
  }
}

function readGithubReleaseViewWithFallback() {
  const ghArgs = [
    "release",
    "view",
    "--repo",
    githubRepository,
    "--json",
    "tagName,url,publishedAt,isDraft,isPrerelease,targetCommitish",
  ];
  try {
    return {
      release: runJsonCommand("gh", ghArgs),
      source: "gh release view",
      fallbackUsed: false,
    };
  } catch (primaryError) {
    const primaryMessage = errorMessage(primaryError);
    try {
      const release = runCurlJson(githubApiUrl(`repos/${githubRepository}/releases/tags/${encodeURIComponent(releaseTargetTag)}`));
      return {
        release: normalizeGithubApiReleaseView(release),
        source: "curl GitHub REST API /releases/tags/<release-target-tag> fallback",
        fallbackUsed: true,
        primaryFailure: summarizeExternalFailure(primaryMessage),
      };
    } catch (fallbackError) {
      throw new Error(formatExternalFailure("GitHub release view", primaryMessage, errorMessage(fallbackError)));
    }
  }
}

function readRemoteRefWithHttpsFallback(kind, refName) {
  const flag = kind === "tags" ? "--tags" : "--heads";
  try {
    return {
      output: runTextCommand("git", ["ls-remote", flag, "origin", refName]),
      source: `git ls-remote ${flag} origin`,
      fallbackUsed: false,
    };
  } catch (primaryError) {
    const primaryMessage = errorMessage(primaryError);
    const httpsRemote = `https://github.com/${githubRepository}.git`;
    try {
      return {
        output: runTextCommand("git", ["ls-remote", flag, httpsRemote, refName]),
        source: `git ls-remote ${flag} ${httpsRemote} fallback`,
        fallbackUsed: true,
        primaryFailure: summarizeExternalFailure(primaryMessage),
      };
    } catch (fallbackError) {
      throw new Error(formatExternalFailure(`remote ${kind} ref ${refName}`, primaryMessage, errorMessage(fallbackError)));
    }
  }
}

function readRepositoryPageHtml() {
  try {
    return runTextCommand("curl", ["-fsSL", repositoryUrl]);
  } catch (error) {
    throw new Error(formatExternalFailure("GitHub repository page Releases/Latest link", errorMessage(error), ""));
  }
}

function readRepositoryReleaseLink() {
  const html = readRepositoryPageHtml();
  const expectedTagPath = `/${githubRepository}/releases/tag/${releaseTargetTag}`;
  const common = {url: repositoryUrl, expectedRightRail: "Releases / Latest",
    expectedHref: expectedReleaseUrl, observedTagPath: expectedTagPath};
  const hasTagLink = [...html.matchAll(/<a\b[^>]*\shref\s*=\s*(["'])(.*?)\1/gi)]
    .some(match => match[2] === expectedTagPath || match[2] === expectedReleaseUrl);
  const hasLatestMarker = html.includes(`/${githubRepository}/releases/latest`) || /\bLatest\b/i.test(html);
  if (hasTagLink && hasLatestMarker) {
    return {...common, source: "repository-html", observedLatestMarker: true};
  }

  // GitHub의 동적 Releases는 초기 HTML에 자리 표시자만 두고 /_sidebar의 latestRelease를 표시한다.
  // 같은 저장소에서 활성화한 영역임을 먼저 확인하며, README 링크나 REST API 성공으로 대신하지 않는다.
  const contexts = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/\btype=["']application\/json["']/i.test(match[1]) ||
        !/\bdata-target=["']react-app\.embeddedData["']/i.test(match[1])) continue;
    const context = JSON.parse(match[2])?.payload?.sidebarAbout;
    if (context) contexts.push(context);
  }
  assert(contexts.length === 1, `repository page ${repositoryUrl} has no unambiguous dynamic Releases context or release link ${expectedTagPath}`);
  const context = contexts[0];
  const [owner, name] = githubRepository.split("/");
  assert(context.ownerLogin === owner && context.repoName === name, "repository page sidebar owner/repository mismatch");
  const releases = context.sections?.releases;
  assert(releases && Number.isInteger(releases.releaseCount) && releases.releaseCount > 0,
    "repository page Releases section is disabled or has no published releases");

  const sidebarUrl = `${repositoryUrl}/_sidebar`;
  let sidebar;
  try {
    sidebar = JSON.parse(runTextCommand("curl", ["-fsSL", "-H", "Accept: application/json", sidebarUrl]));
  } catch (error) {
    throw new Error(formatExternalFailure("GitHub repository Releases sidebar", errorMessage(error), ""));
  }
  assert(sidebar?.releases?.releasesPath === `/${githubRepository}/releases`, "repository sidebar releasesPath mismatch");
  assert(sidebar.releases.latestRelease?.path === expectedTagPath,
    `repository sidebar latestRelease does not point to ${expectedTagPath}`);
  return {...common, source: "repository-html+github-sidebar-json", sidebarUrl,
    latestMarkerSource: "sidebar.latestRelease", observedReleasesPath: sidebar.releases.releasesPath};
}

function normalizeGithubApiReleaseForList(release) {
  return {
    tagName: release?.tag_name || "",
    publishedAt: release?.published_at || "",
    isDraft: release?.draft,
    isPrerelease: release?.prerelease,
  };
}

function normalizeGithubApiReleaseView(release) {
  return {
    tagName: release?.tag_name || "",
    url: release?.html_url || "",
    publishedAt: release?.published_at || "",
    isDraft: release?.draft,
    isPrerelease: release?.prerelease,
    targetCommitish: release?.target_commitish || "",
  };
}

function runCurlJson(url) {
  const output = runTextCommand("curl", ["-fsSL", url]);
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`curl ${url} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function githubApiUrl(apiPath) {
  return `https://api.github.com/${String(apiPath).replace(/^\/+/, "")}`;
}

function formatExternalFailure(label, primaryMessage, fallbackMessage) {
  const combined = [primaryMessage, fallbackMessage].filter(Boolean).join(" | ");
  const failureClass = classifyExternalFailure(combined);
  const fallbackPart = fallbackMessage ? `; fallback=${oneLine(fallbackMessage)}` : "";
  return `failure-class=${failureClass}; source=published-release-external-gate; ${label} failed; primary=${oneLine(primaryMessage)}${fallbackPart}; 제품 runtime/media 회귀와 외부 GitHub/auth/DNS/SSH 접근 실패를 분리해서 보고해야 합니다.`;
}

function summarizeExternalFailure(message) {
  return {
    failureClass: classifyExternalFailure(message),
    message: oneLine(message),
  };
}

function classifyExternalFailure(message) {
  const lower = String(message || "").toLowerCase();
  if (/(enoent|command not found|not recognized|no such file or directory)/.test(lower)) {
    return "tool-unavailable";
  }
  if (/(could not resolve|name or service not known|temporary failure in name resolution|getaddrinfo|network is unreachable|failed to connect|connection timed out|timed out|proxy|tls|ssl|couldn't connect)/.test(lower)) {
    return "external-network";
  }
  if (/(authentication required|requires authentication|not logged|gh auth login|bad credentials|permission denied|publickey|could not read from remote repository|http 401|http 403|resource not accessible)/.test(lower)) {
    return "external-auth-or-permission";
  }
  return "external-github-access";
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function oneLine(value, maxLength = 900) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function resolveGithubRepository() {
  const fromEnv = process.env.MEDIA_SERVER_GITHUB_REPOSITORY || process.env.GITHUB_REPOSITORY || "";
  if (fromEnv && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(fromEnv)) {
    return fromEnv;
  }
  const remoteUrl = runTextCommand("git", ["config", "--get", "remote.origin.url"]).trim();
  const match = (
    /^git@github\.com:([^/]+\/[^.]+)(?:\.git)?$/.exec(remoteUrl) ||
    /^https:\/\/github\.com\/([^/]+\/[^.]+)(?:\.git)?$/.exec(remoteUrl) ||
    /^ssh:\/\/git@github\.com\/([^/]+\/[^.]+)(?:\.git)?$/.exec(remoteUrl)
  );
  assert(match, `cannot resolve GitHub repository from remote.origin.url: ${remoteUrl}`);
  return match[1];
}

function runJsonCommand(command, args) {
  const output = runTextCommand(command, args);
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`${formatCommand(command, args)} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function runTextCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    env: process.env,
  });
  if (result.error) {
    throw new Error(`${formatCommand(command, args)} failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const stderr = String(result.stderr || "").trim();
    const stdout = String(result.stdout || "").trim();
    throw new Error(`${formatCommand(command, args)} failed with exit ${result.status}: ${stderr || stdout || "no output"}`);
  }
  return String(result.stdout || "");
}

function formatCommand(command, args) {
  return [command, ...args].join(" ");
}
