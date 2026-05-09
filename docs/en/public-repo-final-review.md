# Public Repo Final Review

Detailed Korean checklist: [../public-repo-final-review.md](../public-repo-final-review.md)

This checklist is used immediately before changing repository visibility from private to public. GitHub UI settings stay manual and owner-controlled.

## Current Manual State

As of 2026-05-10:

- Latest confirmed main readiness commit: `main` HEAD immediately before public conversion
- Main branch Actions status target:
  - Latest `Preflight`: passed
  - Latest `Licensing and Artifact Guardrails`: passed
- Required status checks:
  - `static-gates`
  - `guardrails`
- Branch rules:
  - `Restrict deletions`: enabled
  - `Block force pushes`: enabled
- Visibility: still private. Changing visibility to public is manual.
- First source-only tag candidate: `v1.0.0`

`Restrict deletions` and `Block force pushes` are ruleset branch rules, not GitHub Actions checks. They do not need to appear as required status checks.

## Dependabot Actions Failures

Observed failed runs:

- `Preflight #8`: `ci: bump actions/checkout from 4 to 6`
- `Preflight #7`: `ci: bump actions/upload-artifact from 4 to 7`

These failures are expected policy blocks. `verify-actions-security` allows official `actions/*@v4` or SHA-pinned actions. Dependabot major updates should be reviewed manually before changing that policy.

## Automatic Checks

```bash
./server.sh verify-script-inventory
./server.sh verify-code-comments
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-actions-security
./server.sh write-dependency-notice --check
./server.sh verify-public-repo-readiness --report /tmp/media_server_public_repo_readiness.md
./server.sh verify-bundle-policy --output /tmp/media_server_bundle_policy.md --json-output /tmp/media_server_bundle_policy.json
```

## Manual GitHub Settings

- Actions workflow permissions: read repository contents.
- Allow GitHub Actions to create and approve pull requests: off.
- Required status checks on `main`: `static-gates`, `guardrails`.
- Force pushes and deletions: blocked.
- Pull request required before merging: optional until the owner decides public workflow is ready.
- Repository visibility: keep private until the owner changes it.

## Public UI Rehearsal

Before public conversion, open the repository page and check:

- README badges render.
- Korean and English README links work.
- README image previews load.
- Documentation map links open.
- Public-facing description and topics match the actual product boundary.

## Post-Public Rehearsal

After public conversion, verify manually:

- Ruleset remains enforced on `main`.
- `static-gates` and `guardrails` remain required.
- Test branch force push/delete is blocked.
- The first public `Preflight` and `Licensing and Artifact Guardrails` runs pass.
- No sample/model/runtime asset appears outside the allowlist.
