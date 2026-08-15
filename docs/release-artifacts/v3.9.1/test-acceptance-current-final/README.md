# v3.9.1 local release acceptance evidence

This bounded package preserves the successful GitHub clean-clone `./test_release.sh`
run started on 2026-08-15T03:53:37Z from source
`2882bb3594c87c3aa0d24d6bc8d45825a0054e92` (`v3.9.1`).

- Full build and 36 feature gates: PASS
- 30-minute longrun: PASS (`118 PASS / 0 FAIL / 2 skip`, 22 soak iterations)
- Canonical UI: PASS (`424/424`, actual browser execution)
- Policy v4: PASS and eligible (`424/424` qualified, `uiFulltestPass=true`)
- 120-minute longrun: PASS (`448 PASS / 0 FAIL / 2 skip`, 88 soak iterations)
- Cleanup: PASS
- Final integrity: PASS
- Final evidence eligibility: `true`

The generated clone run occupied about 309 MB including per-case UI artifacts.
This repository package keeps 21 files and 11.42 MiB: the top-level
summary/report, longrun summaries/reports, exact-424 and Policy summaries, and
qualification evidence. Raw `.log` files, per-case screenshots, traces, browser
logs, and the throwaway clone are not committed. Personal clone paths were
replaced with `${REPO_ROOT}` after the run, matching the v3.9.0 bounded package.

Key SHA-256 bindings of the committed redacted files:

- `summary.json`: `d23290f2f4f9aa620d82b784626fcee0f36840ffbf8727b79059859d21d89dce`
- 30-minute suite summary: `688784528dbc3b14548fa2fd242a72f79e161642a715bdcea4e5f8aba733fc1f`
- 30-minute predev summary: `8144eeb88a84c4704631d0331cb4e9f1c6ea15afa16ea07cd5cd0f09a492efb4`
- exact-424 summary: `f28cf840bbd7fdb989512f984d240405dbfa2a615408f8d53ef72616624e95b3`
- Policy v4 producer summary: `44b734ff8738fc3a34065d2f3d878ceee25eeb0d7912713e4ec54cb54b77d98e`
- qualification evaluation: `95c76c9c9a3b941aa05389807deff314791a7a3ab801a97b6891d09ce64d0bc6`
- 120-minute suite summary: `000b80b6836ffdf5f3915430ed24ff79dd1fb6bb0fe1b72478f975dd34728ee7`
- 120-minute predev summary: `41223d572122dced9deebe0266fb0afc9f15f83c4c8d81a7f744dd882482957d`
- report.md: `4f521941eb161749a21cac0dab40fd11e1a931da176fa45dfd8d27d92c31709d`
- built `media_server` SHA-256: `637f8880cb3363111320e2d31682f0e592666ac32c25f13182225d7bed3c91d0` (17,528,176 bytes)

The two predev `skip` rows are `--skip-build` (parent already built) and
`external-turn-hard-gate` (`--include-external-turn` not requested). Real-device
ONVIF field smoke and STUN/TURN/external TURN are exclusions, not product PASS.

PR checks, main merge, signed tag, GitHub Release, and published metadata
verification are separate close-out actions and were not run.
