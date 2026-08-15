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
This repository package keeps 65 files and about 11.7 MiB: the top-level
summary/report, feature-gate logs, longrun summaries/reports, exact-424 and
Policy summaries, qualification evidence, 120-minute decision, and cleanup
logs. Per-case screenshots, traces, browser logs, and the throwaway clone are
not committed.

Key SHA-256 bindings:

- `summary.json`: `6e931015c70eb411282a7f883e20f1a4e6c5f2a21daf96eefb96ada828bb8d88`
- 30-minute suite summary: `32524799e0041e3d8f7a01b47bd0668b1298b0eb29ac600c68aed2481bc50bd2`
- 30-minute predev summary: `78ad2eb474e4cff054019448eda220bc867a51ddaf18601a66354dd284938da8`
- exact-424 summary: `b0a5e0e7b44f8fb6007ce3b4c8f8391bbbddb20c49cfea2391efd013b16c0b01`
- Policy v4 producer summary: `c011f6ed9748d09e96954f4d981a5b37839b2181c22404dd98422b13206ae5ee`
- qualification evaluation: `95c76c9c9a3b941aa05389807deff314791a7a3ab801a97b6891d09ce64d0bc6`
- 120-minute suite summary: `64c0832875bff2e939507e566ac4853a24a934d855f2430fcff0843a3e1cdc95`
- 120-minute predev summary: `8b93684cc07ab98a4140cb1f1599c8a70ac7418f8e678923f8916c20681e5259`
- 120-minute decision: `03c2b74926ce111225ca79dbc735cddb862443dd14c9a79181becf12b53ad592`
- report.md: `eeca12eb89f1a69b9b247cfd719686740d7b45fd70c5a49feebb619dc002d330`
- built `media_server` SHA-256: `637f8880cb3363111320e2d31682f0e592666ac32c25f13182225d7bed3c91d0` (17,528,176 bytes)

The two predev `skip` rows are `--skip-build` (parent already built) and
`external-turn-hard-gate` (`--include-external-turn` not requested). Real-device
ONVIF field smoke and STUN/TURN/external TURN are exclusions, not product PASS.

PR checks, main merge, signed tag, GitHub Release, and published metadata
verification are separate close-out actions and were not run.
