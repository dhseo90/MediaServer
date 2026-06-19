#!/usr/bin/env node
// 파일 용도: release/version metadata가 VERSION, CMake, README, release 문서에서 같은 기준을 말하는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Release metadata consistency verification

Usage:
  ./server.sh verify-release-metadata [options]

Options:
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
  - README/English README의 현재 release 링크가 current tag와 GitHub Release를 가리키는지 확인
  - 기본 모드에서는 GitHub latest/tag 외부 확인을 실행하지 않고 --published 재검증 안내로 기록
  - --published 모드에서는 GitHub Releases latest/list/view, GitHub API /releases/latest, 원격 tag/branch, repository page Releases/Latest link가 현재 tag를 가리키는지 확인
  - gh 인증/도구 실패는 curl GitHub REST API fallback, SSH origin refs 실패는 HTTPS refs fallback으로 재시도하고 외부 접근 실패를 failure-class로 구분
  - versioning/release/backlog/public review/UI guide 문서가 같은 current release baseline과 active next-roadmap gate를 말하는지 확인
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "published", "require-published", "allow-unpublished", "release-branch", "self-test-fallback-policy", "h", "help"]);

const args = parseArgs(rawArgs);
if (args.selfTestFallbackPolicy) {
  runFallbackPolicySelfTest();
  process.exit(0);
}
const allowUnpublished = Boolean(args.allowUnpublished);
const publishedMode = Boolean(args.published || args.requirePublished);
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
const latestPublishedTag = currentTag;
const latestPublishedVersion = latestPublishedTag.replace(/^v/, "");
const currentRoadmap = `${currentTag} Final 2.x Closure & Compatibility Baseline`;
const latestPublishedBaseline = `${latestPublishedTag} Final 2.x Closure & Compatibility Baseline`;
const previousPublishedTag = "v2.8.0";
const previousPublishedBaseline = `${previousPublishedTag} Operator-Supervised Action Readiness`;
const githubRepository = resolveGithubRepository();
const repositoryUrl = `https://github.com/${githubRepository}`;
const expectedReleaseUrl = `https://github.com/${githubRepository}/releases/tag/${latestPublishedTag}`;
const currentBranch = resolveCurrentBranch();
const releaseBranch = args.releaseBranch || process.env.MEDIA_SERVER_RELEASE_BRANCH || currentBranch;
report.currentVersion = version;
report.currentTag = currentTag;
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
  latestPublishedTag,
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

check("VERSION matches CMake project VERSION", () => {
  const cmake = readText("CMakeLists.txt");
  const match = /project\s*\(\s*media_server\s+VERSION\s+([0-9]+\.[0-9]+\.[0-9]+)\s+LANGUAGES\s+CXX\s*\)/.exec(cmake);
  assert(match, "CMakeLists.txt missing project(media_server VERSION ... LANGUAGES CXX)");
  assert(match[1] === version, `CMake project version ${match[1]} does not match VERSION ${version}`);
  return { version };
});

check("README.md points to the current published release", () => {
  const readme = readText("README.md");
  assert(readme.includes(`현재 소스 버전: \`${version}\``), "README.md source version wording drifted");
  assert(readme.includes(`최신 공개 GitHub Release: [${latestPublishedTag}](${expectedReleaseUrl})`), "README.md latest release link drifted");
  assert(readme.includes(`${latestPublishedTag} 공개 상태: source-only GitHub Release`), "README.md missing source-only published release wording");
  assert(readme.includes(`현재 source roadmap: \`${currentRoadmap}\``), "README.md source roadmap wording drifted");
  assertAllowedReleaseLinks(readme, "README.md", latestPublishedTag);
  return { file: "README.md", currentTag, latestPublishedTag, expectedReleaseUrl };
});

check("README.md keeps release source-of-truth links lightweight", () => {
  const readme = readText("README.md");
  assert(readme.includes("docs/development-backlog.md"), "README.md missing development backlog link");
  assert(readme.includes("docs/release-policy.md"), "README.md missing release policy link");
  return { file: "README.md", currentTag, latestPublishedTag };
});

check("README.en.md points to the current published release", () => {
  const readmeEn = readText("README.en.md");
  assert(readmeEn.includes(`Current source version: \`${version}\``), "README.en.md source version wording drifted");
  assert(readmeEn.includes(`Latest published GitHub Release: [${latestPublishedTag}](${expectedReleaseUrl})`), "README.en.md latest release link drifted");
  assert(readmeEn.includes(`${latestPublishedTag} public status: source-only GitHub Release`), "README.en.md missing source-only published release wording");
  assert(readmeEn.includes(`Current source roadmap: \`${currentRoadmap}\``), "README.en.md source roadmap wording drifted");
  assertAllowedReleaseLinks(readmeEn, "README.en.md", latestPublishedTag);
  return { file: "README.en.md", currentTag, latestPublishedTag, expectedReleaseUrl };
});

check("README.en.md keeps release source-of-truth links lightweight", () => {
  const readmeEn = readText("README.en.md");
  assert(readmeEn.includes("docs/development-backlog.md"), "README.en.md missing development backlog link");
  assert(readmeEn.includes("docs/release-policy.md"), "README.en.md missing release policy link");
  return { file: "README.en.md", currentTag, latestPublishedTag };
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
  check("GitHub release list latest tag matches current tag", () => {
  const releaseListEvidence = readGithubReleaseListLatestWithFallback();
  const releaseList = releaseListEvidence.releaseList;
  assert(Array.isArray(releaseList), "GitHub release list did not return an array");
  const listedLatest = releaseListEvidence.latest;
  assert(listedLatest, "gh release list did not mark any release as latest");
  assert(listedLatest.tagName === latestPublishedTag, `GitHub latest release list tag ${listedLatest.tagName} does not match ${latestPublishedTag}`);
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

  check("GitHub API latest release matches current tag", () => {
  const latestEvidence = readGithubLatestApiWithFallback();
  const latestApi = latestEvidence.release;
  assert(latestApi?.tag_name === latestPublishedTag, `GitHub API latest release tag ${latestApi?.tag_name || "-"} does not match ${latestPublishedTag}`);
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

  check("GitHub release view matches current tag", () => {
  const releaseViewEvidence = readGithubReleaseViewWithFallback();
  const releaseView = releaseViewEvidence.release;
  assert(releaseView?.tagName === latestPublishedTag, `gh release view tag ${releaseView?.tagName || "-"} does not match ${latestPublishedTag}`);
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

  check("remote origin exposes current release tag", () => {
  const remoteTagEvidence = readRemoteRefWithHttpsFallback("tags", latestPublishedTag);
  const remoteTag = remoteTagEvidence.output;
  const remoteLines = remoteTag.split("\n").map(line => line.trim()).filter(Boolean);
  const exactTagLine = remoteLines.find(line => line.endsWith(`refs/tags/${latestPublishedTag}`));
  assert(exactTagLine, `remote origin does not expose refs/tags/${latestPublishedTag}`);
  const [sha] = exactTagLine.split(/\s+/);
  assert(/^[0-9a-f]{40}$/.test(sha), `remote tag ${currentTag} did not return a commit SHA`);
  report.github.remoteTag = {
    tag: latestPublishedTag,
    sha,
    source: remoteTagEvidence.source,
    fallbackUsed: remoteTagEvidence.fallbackUsed,
    primaryFailure: remoteTagEvidence.primaryFailure || null,
  };
  report.publishedEvidence.evidence.remoteTag = report.github.remoteTag;
  return {
    repository: githubRepository,
    remoteTag: latestPublishedTag,
    remoteSha: sha,
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
  const pageHtml = readRepositoryPageHtml();
  const expectedTagPath = `/${githubRepository}/releases/tag/${latestPublishedTag}`;
  const expectedLatestPath = `/${githubRepository}/releases/latest`;
  const hasTagLink = pageHtml.includes(expectedTagPath) || pageHtml.includes(expectedReleaseUrl);
  const hasLatestMarker = pageHtml.includes(expectedLatestPath) || /\bLatest\b/i.test(pageHtml);
  assert(hasTagLink, `repository page ${repositoryUrl} does not include release link ${expectedTagPath}`);
  assert(hasLatestMarker, `repository page ${repositoryUrl} does not include a Latest release marker`);
  report.github.repositoryLandingPage = {
    url: repositoryUrl,
    expectedRightRail: "Releases / Latest",
    expectedHref: expectedReleaseUrl,
    observedTagPath: expectedTagPath,
    observedLatestMarker: true,
  };
  report.publishedEvidence.evidence.repositoryLandingPage = report.github.repositoryLandingPage;
  return {
    repository: githubRepository,
    repositoryUrl,
    expectedRightRail: "Releases / Latest",
    expectedHref: expectedReleaseUrl,
  };
  });
}

check("versioning policy separates source version and published release", () => {
  const doc = readText("docs/versioning-policy.md");
  for (const snippet of [
    `현재 소스 버전: \`${version}\``,
    `현재 source roadmap: \`${currentRoadmap}\``,
    `최신 공개 GitHub Release: \`${latestPublishedBaseline}\``,
    `${latestPublishedTag} 공개 상태: source-only GitHub Release`,
    `현재 소스 트리의 \`${version}\` roadmap은 ${latestPublishedTag} source-only/live-only Final 2.x Closure & Compatibility Baseline`,
    `published tag \`${latestPublishedTag}\`와 현재 source tag \`${currentTag}\``,
    "## 2.x runway / 3.0 전환 정책",
    `## ${version} active source roadmap 범위`,
  ]) {
    assert(doc.includes(snippet), `docs/versioning-policy.md missing snippet: ${snippet}`);
  }
  return { file: "docs/versioning-policy.md" };
});

check("versioning policy pins semver source fields", () => {
  const doc = readText("docs/versioning-policy.md");
  for (const snippet of [
    `\`VERSION\` 파일과 \`CMakeLists.txt\`의 \`project(... VERSION ...)\` 값은 같은 값을 유지합니다.`,
    "source-only/live-only",
    "`PATCH`: 문서, 테스트, bug fix, UI 문구, guardrail 보강처럼 공개 API/설정 호환성을 깨지 않는 변경",
  ]) {
    assert(doc.includes(snippet), `docs/versioning-policy.md missing snippet: ${snippet}`);
  }
  return { file: "docs/versioning-policy.md" };
});

check("release policy separates source version and published release", () => {
  const doc = readText("docs/release-policy.md");
  for (const snippet of [
    `현재 소스 버전: \`${version}\``,
    `최신 공개 GitHub Release: \`${latestPublishedTag}\``,
    `\`${latestPublishedTag}\` 공개 상태: source-only GitHub Release`,
    `현재 source roadmap은 \`${currentRoadmap}\`입니다.`,
    `현재 latest published release는 \`${latestPublishedTag}\`입니다.`,
    `현재 공개 release tag 기준은 \`${latestPublishedTag}\`입니다.`,
    `다음 준비 중인 source tag 기준은 \`${currentTag}\`입니다.`,
  ]) {
    assert(doc.includes(snippet), `docs/release-policy.md missing snippet: ${snippet}`);
  }
  return { file: "docs/release-policy.md" };
});

check("release policy pins future release note template", () => {
  const doc = readText("docs/release-policy.md");
  for (const snippet of [
    `# Media Server ${currentTag}`,
    `아래 템플릿은 ${currentTag} source-only GitHub Release note 기준입니다.`,
  ]) {
    assert(doc.includes(snippet), `docs/release-policy.md missing snippet: ${snippet}`);
  }
  return { file: "docs/release-policy.md" };
});

check("release policies require future signed tags", () => {
  const docs = [
    ["docs/release-policy.md", readText("docs/release-policy.md")],
    ["docs/versioning-policy.md", readText("docs/versioning-policy.md")],
  ];
  for (const [file, doc] of docs) {
    for (const snippet of [
      "다음 신규 release tag는 signed annotated tag로 생성합니다.",
      "unsigned annotated tag",
      "lightweight tag는 새 release tag",
      "GitHub API tag\n  verification `verified=true`/`reason=valid`",
    ]) {
      assert(doc.includes(snippet), `${file} missing snippet: ${snippet}`);
    }
  }
  return { files: docs.map(([file]) => file) };
});

check("development backlog pins current source roadmap and public release boundary", () => {
  const doc = readText("docs/development-backlog.md");
  for (const snippet of [
    `## 현재 source roadmap: ${currentRoadmap}`,
    "| 0 | V290-S00 | P0 |",
    "Operator-Supervised Action Readiness",
    "2.x final contract freeze",
    "v2.8 feature regression bundle",
    `## 최신 공개 기준: ${latestPublishedTag} Source Release Baseline`,
    `## 직전 공개 기준: ${previousPublishedTag} Source Release Baseline`,
    "## 완료 roadmap: v2.7.0 Operational Incident Command Loop",
    "## 완료 roadmap: v2.6.0 Operational Hardening & Incident Memory Productization",
    "## 이전 공개 기준: v2.5.0 Source Release Baseline",
    "Operator Event Review & Action",
    "기존 네 영역인 안정화 테스트, 30분 테스트, 120분 테스트, UI 풀테스트",
    `\`${currentTag}\` GitHub Release publish 완료는 tag, GitHub Release, \`verify-release-metadata --published\` evidence가 있을 때만 기록합니다.`,
  ]) {
    assert(doc.includes(snippet), `docs/development-backlog.md missing snippet: ${snippet}`);
  }
  assert(/\| 0 \| V290-S00 \| P0 \| (진행|완료) \| v2\.9\.0 baseline \| VERSION\/CMake\/README\/docs index\/release metadata를 `2\.9\.0` source target/.test(doc),
    "docs/development-backlog.md V290-S00 row must be 진행 or 완료");
  return { file: "docs/development-backlog.md", currentTag, latestPublishedTag, previousPublishedTag };
});

check("docs index points to backlog as current release source of truth", () => {
  const readme = readText("README.md");
  const readmeEn = readText("README.en.md");
  const docsEn = readText("docs/en/README.md");
  for (const [label, text] of [
    ["README.md", readme],
    ["README.en.md", readmeEn],
    ["docs/en/README.md", docsEn],
  ]) {
    assert(text.includes("docs/development-backlog.md") || text.includes("../development-backlog.md"), `${label} missing development backlog link`);
    assert(
      text.includes(`현재 소스 버전: \`${version}\``) ||
        text.includes(`Current source version: \`${version}\``),
      `${label} missing current source version wording`
    );
  }
  return { files: ["README.md", "README.en.md", "docs/en/README.md"] };
});

check("public entry docs keep release evidence source-of-truth deduped", () => {
  const readme = readText("README.md");
  const readmeEn = readText("README.en.md");
  const docsIndex = readText("docs/README.md");
  const releasePolicy = readText("docs/release-policy.md");
  const backlog = readText("docs/development-backlog.md");
  const forbiddenPublicDetails = [
    "Historical Release Evidence verifier matrix",
    "archived release evidence dashboard command",
    "Dry-run checklist",
    "Real close-out checklist",
    "media-server.release-visual-baseline-automation.v1",
  ];
  for (const [label, text] of [["README.md", readme], ["README.en.md", readmeEn]]) {
    for (const snippet of forbiddenPublicDetails) {
      assert(!text.includes(snippet), `${label} repeats detailed release evidence/runbook content: ${snippet}`);
    }
  }
  for (const snippet of [
    "현재 source roadmap",
    currentRoadmap,
    latestPublishedBaseline,
    previousPublishedBaseline,
    "release-policy.md",
  ]) {
    assert(docsIndex.includes(snippet), `docs/README.md missing source-of-truth link snippet: ${snippet}`);
  }
  assert(releasePolicy.includes("## v2.9.0 Source Roadmap Scope"), "release policy must own the v2.9.0 source roadmap boundary");
  assert(backlog.includes(`## 현재 source roadmap: ${currentRoadmap}`), `development backlog must own the ${currentTag} source roadmap`);
  assert(backlog.includes(`직전 공개 릴리즈입니다.`), "development backlog must preserve previous published release boundary");
  return {
    publicEntrypoints: ["README.md", "README.en.md"],
    sourceOfTruth: ["docs/README.md", "docs/development-backlog.md", "docs/release-policy.md"],
  };
});

check("public review pins current release wording", () => {
  const publicReview = readText("docs/public-repo-final-review.md");
  assert(publicReview.includes(`현재 소스 버전: \`${version}\``), "docs/public-repo-final-review.md source version drifted");
  assert(publicReview.includes(`최신 공개 GitHub Release: \`${latestPublishedTag}\``), "docs/public-repo-final-review.md latest release wording drifted");
  assert(publicReview.includes(`\`${latestPublishedTag}\` 공개 상태: source-only GitHub Release`), "docs/public-repo-final-review.md source-only release wording drifted");
  assert(publicReview.includes(`현재 source roadmap: \`${currentRoadmap}\``), "docs/public-repo-final-review.md source roadmap wording drifted");
  return { file: "docs/public-repo-final-review.md", currentTag, latestPublishedTag };
});

check("UI guide pins current release wording", () => {
  const uiGuide = readText("docs/ui-guide.md");
  assert(uiGuide.includes(`현재 소스 버전은 \`${version}\`입니다.`), "docs/ui-guide.md source version drifted");
  assert(uiGuide.includes(`최신 공개 GitHub Release는 \`${latestPublishedTag}\` source-only`), "docs/ui-guide.md source-only release wording drifted");
  assert(uiGuide.includes("v2.9.0 roadmap 경계"), "docs/ui-guide.md source roadmap boundary drifted");
  return { file: "docs/ui-guide.md", currentTag, latestPublishedTag };
});

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

function assertAllowedReleaseLinks(text, label, expectedTag) {
  const links = [...text.matchAll(/releases\/tag\/(v\d+\.\d+\.\d+)/g)].map(match => match[1]);
  const publishedTagMatches = [
    ...text.matchAll(/(?:최신 공개 release|최신 공개 GitHub Release|Latest published release|Latest published GitHub Release|최신 공개 release notes|Latest published release notes): \[(v\d+\.\d+\.\d+)/g),
  ].map(match => match[1]);
  const allowed = new Set([expectedTag, ...publishedTagMatches]);
  const unexpected = links.filter(tag => !allowed.has(tag));
  assert(unexpected.length === 0, `${label} has release tag link(s) outside current target/published release: ${unexpected.join(", ")}`);
}

function assertNoOtherCurrentTag(text, label, expectedTag) {
  const currentTagMatches = [
    ...text.matchAll(/현재 (?:기준 버전|source-only release|source-only release 기준 tag|(?:published )?source-only release tag 기준|(?:published )?source-only release tag)[^\n`]*`(v\d+\.\d+\.\d+)`/g),
  ].map(match => match[1]);
  const unexpected = currentTagMatches.filter(tag => tag !== expectedTag);
  assert(unexpected.length === 0, `${label} has current tag other than ${expectedTag}: ${unexpected.join(", ")}`);
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
  const branch = runTextCommand("git", ["branch", "--show-current"]).trim();
  if (branch) return branch;
  return runTextCommand("git", ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
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
      const release = runCurlJson(githubApiUrl(`repos/${githubRepository}/releases/tags/${encodeURIComponent(currentTag)}`));
      return {
        release: normalizeGithubApiReleaseView(release),
        source: "curl GitHub REST API /releases/tags/<tag> fallback",
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
