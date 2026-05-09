# Stream Verification

Korean detailed guide: [../stream-verification.md](../stream-verification.md)

## Fast Public/Docs Gate

```bash
./server.sh build
git diff --check -- README.md README.en.md NOTICE THIRD_PARTY_NOTICES.md DEPENDENCY_SNAPSHOT.md .github config docs scripts src include
./server.sh verify-script-inventory
./server.sh verify-code-comments
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-actions-security
./server.sh verify-public-repo-readiness --report /tmp/media_server_public_repo_readiness.md
```

## Runtime Smoke

```bash
./server.sh test --basic --ffmpeg-free
```

Use this when the change is public-readiness, documentation, Actions, or release policy work and should avoid FFmpeg CLI dependency.

## Full Regression

```bash
./server.sh test
```

The full test path uses additional RTSP/WebRTC source videos and codec matrix checks. It is intentionally slower.

## UI Smoke

Run a server first:

```bash
MEDIA_SERVER_AUTH_MODE=off ./server.sh foreground
```

Then run:

```bash
./server.sh verify-ops-client-ui
./server.sh verify-ops-click-e2e
./server.sh verify-ops-tables-layout
./server.sh verify-rule-ui
./server.sh verify-ops-rules-roundtrip
```

## RC Longrun

RC-only longrun checks are separate from the default smoke path:

```bash
./server.sh verify-predev --soak-minutes 120
```
