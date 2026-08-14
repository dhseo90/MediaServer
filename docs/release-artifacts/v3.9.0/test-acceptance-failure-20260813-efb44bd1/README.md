# v3.9.0 release acceptance failure evidence

This bounded package preserves the release run started on 2026-08-13 from source
`efb44bd1b20517297a22dd17956fb514f26ebbf0`.

- Full build: PASS
- 30-minute longrun: PASS
- Canonical UI: 424/424 PASS
- Policy v4: FAIL (`MEDIA-017`, unapproved 403/404 console responses)
- Final integrity: FAIL (legacy UI temporary-root field lookup)
- 120-minute longrun: not run after the Policy failure

The package retains the top-level summary/report/first failure, 30-minute summaries,
canonical UI and Policy summaries, the complete `MEDIA-017` case evidence, suite
finalizer evidence, and cleanup logs. It intentionally excludes the other 423 cases'
redundant screenshots and traces; the original full 4,651-file run was 311 MB.

Key SHA-256 bindings:

- `summary.json`: `6de7651dafc007b0e7b4dd1cdf4abf2cc750e9c2e9d3bc5541dcb68737b52f22`
- exact summary: `03ec82accc6e3aff2701c7a5f2936f030fcddf9ec0bcc6d3e945f9ab23c77fb7`
- Policy summary: `f8034e06b6ee4e2e2ef44de32b7dbb17ed1f0ce3d34540f35bea7ff260d8dd54`
- qualification evaluation: `6cf6c13d69f5b0bd0c8e6056abf6c9d288d4e3c6c5171385d52d0fc96f3ef8d8`

This is historical failure evidence. It must not be interpreted as release-ready or
as a substitute for a clean-source `./test_release.sh` PASS.
