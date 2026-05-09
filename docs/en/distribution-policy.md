# Distribution Policy

Korean detailed policy: [../distribution-policy.md](../distribution-policy.md)

## Default Rule

- The default public unit is Apache-2.0 source code and documentation.
- The default binary bundle does not include FFmpeg, FFprobe, libav*, x264/x265, or GStreamer GPL-risk plugin binaries.
- FFmpeg/GStreamer runtime is treated as a user-installed dependency.
- Bundle, app package, container image, and offline package releases must pass bundle policy checks.

## Distribution Types

| Type | Boundary | Required check |
| --- | --- | --- |
| Source release | Source, docs, LICENSE, NOTICE | `write-dependency-notice --check`, `verify-bundle-policy` |
| Local binary bundle | `media_server` plus docs | `verify-release-bundle-dry-run`, `verify-bundle-policy --bundle-dir <dir>` |
| Runtime-included bundle | Includes GStreamer/FFmpeg/plugins | Legal review, source offer, license text, attribution |
| Container without runtime | User chooses runtime layer | README dependency statement |
| Container with runtime | Image contains FFmpeg/GStreamer/plugins | Extract image root and run `verify-bundle-policy` |

## Checks

```bash
./server.sh verify-bundle-policy --bundle-dir <release_bundle_dir> --json-output /tmp/media_server_bundle_policy.json
./server.sh source-offer-checklist --stable --bundle-policy-report /tmp/media_server_bundle_policy.json
```

If intentionally including LGPL/GPL runtime components, attach upstream license text, attribution, source offer, checksum manifest, and build configuration to the release record.
