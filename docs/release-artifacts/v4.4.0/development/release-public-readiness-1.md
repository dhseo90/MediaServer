# Public Repo Readiness Report

- schema: media-server.public-repo-readiness-report.v1
- generatedAt: 2026-10-04T12:32:51.688Z
- policy: config/public_repo_policy.json

| 결과 | 검사 | 상세 |
| --- | --- | --- |
| PASS | required public docs exist | {"count":15} |
| PASS | tracked denied paths are absent | {"trackedFiles":3649} |
| PASS | tracked release artifacts are bounded | {"trackedArtifacts":1894} |
| PASS | tracked content has no personal or ephemeral paths | {"patterns":2} |
| PASS | tracked file sizes stay public-friendly | {"maxBytes":26214400} |
| PASS | tracked media assets are allowlisted | {"assetCount":93,"reviewedHistoricalAssets":20} |
| PASS | current tracked content has no high-confidence secrets | {"patterns":5} |
| PASS | git history has no high-confidence secrets | {"maxHistory":500} |
