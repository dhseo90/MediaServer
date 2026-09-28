// 파일 용도: 실제 GitHub 호출 없이 v4.1.0 published metadata 경계와 v4.0.0 반례를 검증한다.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testDir, "../../../..");
const verifierPath = path.join(rootDir, "scripts/internal/verify_release_metadata_consistency.mjs");
// 문서 URL은 실제 저장소를 검증하되 모든 외부 명령은 아래 격리 stub만 실행한다.
const repository = "dhseo90/MediaServer";
const localHead = "a".repeat(40);
const tagObjectSha = "b".repeat(40);

test("published metadata는 v4.1.0 list/API/view/tag/landing과 branch HEAD를 모두 확인한다", () => {
  const outcome = runPublishedFixture("v4.1.0");

  assert.equal(outcome.status, 0, outcome.stderr || outcome.stdout);
  assert.equal(outcome.report.status, "pass");
  assert.equal(outcome.report.releaseTargetTag, "v4.1.0");
  assert.equal(outcome.report.latestPublishedTag, "v4.1.0");
  assert.equal(outcome.report.cutPriorPublishedTag, "v4.0.0");
  assert.equal(outcome.report.github.releaseListLatest.tagName, "v4.1.0");
  assert.equal(outcome.report.github.releaseListLatest.source, "gh release list");
  assert.equal(outcome.report.github.releaseListLatest.fallbackUsed, false);
  assert.equal(outcome.report.github.latestRelease.tag_name, "v4.1.0");
  assert.equal(
    outcome.report.publishedEvidence.evidence.latestReleaseApi.source,
    "gh api repos/<repo>/releases/latest",
  );
  assert.equal(outcome.report.github.releaseView.tagName, "v4.1.0");
  assert.equal(outcome.report.github.releaseView.source, "gh release view");
  assert.equal(outcome.report.github.remoteTag.tag, "v4.1.0");
  assert.equal(outcome.report.github.remoteTag.sha, tagObjectSha);
  assert.equal(outcome.report.github.remoteTag.source, "git ls-remote --tags origin");
  assert.equal(outcome.report.github.remoteBranch.localHead, localHead);
  assert.equal(outcome.report.github.remoteBranch.remoteSha, localHead);
  assert.equal(
    outcome.report.github.repositoryLandingPage.observedTagPath,
    `/${repository}/releases/tag/v4.1.0`,
  );
  assert.equal(outcome.report.publishedEvidence.status, "pass");
  assert.equal(outcome.cleanupAbsent, true);
});

test("published metadata는 cut 직전 v4.0.0을 현재 target의 외부 증거로 받지 않는다", () => {
  const outcome = runPublishedFixture("v4.0.0");

  assert.equal(outcome.status, 1, outcome.stderr || outcome.stdout);
  assert.equal(outcome.report.status, "fail");
  assert.equal(outcome.report.publishedEvidence.status, "fail");
  const failed = new Set(outcome.report.publishedEvidence.failedChecks);
  for (const checkName of [
    "GitHub release list latest tag matches release target",
    "GitHub API latest release matches release target",
    "GitHub release view matches release target",
    "remote origin exposes release target tag",
    "GitHub repository page exposes Releases Latest link",
  ]) {
    assert.equal(failed.has(checkName), true, `v4.0.0 반례가 실패시키지 못한 검사: ${checkName}`);
  }
  assert.equal(failed.has("remote origin exposes release branch head"), false);
  assert.equal(outcome.cleanupAbsent, true);
});

function runPublishedFixture(observedTag) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-b15-metadata-"));
  const binDir = path.join(fixtureRoot, "bin");
  const reportPath = path.join(fixtureRoot, "report.json");
  fs.mkdirSync(binDir, { recursive: true, mode: 0o700 });

  try {
    for (const command of ["gh", "git", "curl"]) {
      fs.writeFileSync(path.join(binDir, command), fixtureCommandSource, { encoding: "utf8", mode: 0o700 });
    }

    const result = spawnSync(process.execPath, [
      verifierPath,
      "--published",
      "--release-branch",
      "v4.1.0",
      "--json-report",
      reportPath,
    ], {
      cwd: rootDir,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH || ""}`,
        MEDIA_SERVER_GITHUB_REPOSITORY: repository,
        B15_OBSERVED_TAG: observedTag,
        B15_LOCAL_HEAD: localHead,
        B15_TAG_OBJECT_SHA: tagObjectSha,
      },
      maxBuffer: 4 * 1024 * 1024,
    });
    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      report: JSON.parse(fs.readFileSync(reportPath, "utf8")),
      cleanupAbsent: true,
    };
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
    assert.equal(fs.existsSync(fixtureRoot), false, `격리 fixture 정리 실패: ${fixtureRoot}`);
  }
}

const fixtureCommandSource = `#!/usr/bin/env node
const path = require("node:path");
const command = path.basename(process.argv[1]);
const args = process.argv.slice(2);
const tag = process.env.B15_OBSERVED_TAG;
const repository = process.env.MEDIA_SERVER_GITHUB_REPOSITORY;
const releaseUrl = "https://github.com/" + repository + "/releases/tag/" + tag;
const publishedAt = "2026-09-28T00:00:00Z";

if (command === "gh" && args[0] === "release" && args[1] === "list") {
  process.stdout.write(JSON.stringify([{ tagName: tag, isLatest: true, publishedAt, isDraft: false, isPrerelease: false }]));
  process.exit(0);
}
if (command === "gh" && args[0] === "api") {
  process.stdout.write(JSON.stringify({ id: 410, tag_name: tag, html_url: releaseUrl, published_at: publishedAt, draft: false, prerelease: false }));
  process.exit(0);
}
if (command === "gh" && args[0] === "release" && args[1] === "view") {
  process.stdout.write(JSON.stringify({ tagName: tag, url: releaseUrl, publishedAt, isDraft: false, isPrerelease: false, targetCommitish: "v4.1.0" }));
  process.exit(0);
}
if (command === "git" && args[0] === "branch" && args[1] === "--show-current") {
  process.stdout.write("v4.1.0\\n");
  process.exit(0);
}
if (command === "git" && args[0] === "rev-parse" && args[1] === "HEAD") {
  process.stdout.write(process.env.B15_LOCAL_HEAD + "\\n");
  process.exit(0);
}
if (command === "git" && args[0] === "ls-remote" && args[1] === "--tags") {
  process.stdout.write(process.env.B15_TAG_OBJECT_SHA + "\\trefs/tags/" + tag + "\\n");
  process.exit(0);
}
if (command === "git" && args[0] === "ls-remote" && args[1] === "--heads") {
  process.stdout.write(process.env.B15_LOCAL_HEAD + "\\trefs/heads/v4.1.0\\n");
  process.exit(0);
}
if (command === "curl") {
  process.stdout.write('<a href="/' + repository + '/releases/tag/' + tag + '">' + tag + '</a><a href="/' + repository + '/releases/latest">Latest</a>');
  process.exit(0);
}
process.stderr.write("지원하지 않는 fixture 명령: " + command + " " + args.join(" ") + "\\n");
process.exit(64);
`;
