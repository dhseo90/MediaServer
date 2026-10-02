# Release Metadata Consistency Report

- schema: media-server.release-metadata-consistency.v1
- generatedAt: 2026-10-02T15:06:33.266Z
- status: pass
- mode: published-release
- currentVersion: 4.1.1
- currentTag: v4.1.1
- releaseTargetTag: v4.1.1
- latestPublishedTag: v4.1.1
- cutPriorPublishedTag: v4.1.0
- publishedMetadata: pass
- repository: dhseo90/MediaServer
- releaseBranch: v4.1.1

## Published Release Evidence

- schema: media-server.published-release-evidence.v1
- status: pass
- expectedReleaseUrl: https://github.com/dhseo90/MediaServer/releases/tag/v4.1.1
- command: ./server.sh verify-release-metadata --published --report <report.md> --json-report <report.json>
- fallbackPolicy: media-server.github-metadata-fallback-policy.v1
- ghFallback: curl GitHub REST API /releases, /releases/latest, /releases/tags/<tag>
- remoteRefFallback: git ls-remote against https://github.com/dhseo90/MediaServer.git

| 결과 | 검사 | 상세 |
| --- | --- | --- |
| PASS | current release documents preserve version and publication boundaries | {"version":"4.1.1","releaseTargetTag":"v4.1.1","publishedSnapshotTag":"v4.1.0","priorPublishedTag":"v4.1.0","tagType":"signed-annotated","distribution":"source-only","releaseNotes":"docs/release-notes-v4.1.1.md","roadmap":"docs/v410-v49-recording-search-roadmap.md"} |
| PASS | historical v2.9 source-of-truth remains distinct from latest published v2.8 | {"fixture":"test/fixtures/release_metadata_boundary.json","productExecutionEvidence":false,"externalActionsExecuted":false} |
| PASS | GitHub release list latest tag matches release target | {"repository":"dhseo90/MediaServer","releaseListTag":"v4.1.1","source":"gh release list","fallbackUsed":false} |
| PASS | GitHub API latest release matches release target | {"repository":"dhseo90/MediaServer","apiTag":"v4.1.1","releaseUrl":"https://github.com/dhseo90/MediaServer/releases/tag/v4.1.1","source":"gh api repos/<repo>/releases/latest","fallbackUsed":false} |
| PASS | GitHub release view matches release target | {"repository":"dhseo90/MediaServer","releaseViewTag":"v4.1.1","releaseUrl":"https://github.com/dhseo90/MediaServer/releases/tag/v4.1.1","source":"gh release view","fallbackUsed":false} |
| PASS | remote origin exposes release target tag | {"repository":"dhseo90/MediaServer","remoteTag":"v4.1.1","remoteTagObjectSha":"e15f2451b813b9eec402e4d8db043096f58f7d03","source":"git ls-remote --tags origin","fallbackUsed":false} |
| PASS | remote origin exposes release branch head | {"repository":"dhseo90/MediaServer","remoteBranch":"v4.1.1","remoteSha":"74ae5ff448580b212d973f900e7d5fc23b8c2fd8","source":"git ls-remote --heads origin","fallbackUsed":false} |
| PASS | GitHub repository page exposes Releases Latest link | {"repository":"dhseo90/MediaServer","repositoryUrl":"https://github.com/dhseo90/MediaServer","expectedRightRail":"Releases / Latest","expectedHref":"https://github.com/dhseo90/MediaServer/releases/tag/v4.1.1","source":"repository-html+github-sidebar-json"} |
