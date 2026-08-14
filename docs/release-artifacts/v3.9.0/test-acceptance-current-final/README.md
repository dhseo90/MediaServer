# v3.9.0 final release acceptance evidence

This bounded package preserves the successful `./test_release.sh` run started on
2026-08-13 from source `c6b3d20a778a7a641e44decadd1ee5b416426650`.

- Full build and feature gates: PASS
- 30-minute longrun: PASS (`118 PASS / 0 FAIL / 2 skip`, 22 soak iterations)
- Canonical UI: PASS (`424/424`, actual browser execution)
- Policy v4: PASS and eligible (`424/424` qualified)
- 120-minute longrun: PASS (`443 PASS / 0 FAIL / 2 skip`, 87 soak iterations)
- Cleanup: PASS
- Final integrity: PASS (`12/12`)
- Final evidence eligibility: `true`

The generated run contained roughly 4,900 files and occupied 309 MB. This repository package keeps
80 files and 11.4 MiB: the top-level summary/report, the preserved earliest failure record, feature gate
logs, longrun summaries/reports, exact-424 and Policy summaries, qualification evidence, cleanup, and
final-integrity output. Per-case screenshots, traces, browser logs, and duplicate Policy projections
are not committed.

Key SHA-256 bindings:

- `summary.json`: `673bd94804022bee52ed6b8172007c373839aae3bb03549f4e7889593f51619a`
- 30-minute summary: `c9057a572cffc9286bbce0d6c22e1011f49ae0f6e4bb471b472c4a423b8bbb62`
- exact-424 summary: `0f5064c759212259981f89ba76692a50ec3d303e131812cd77d473cbc4fb4d92`
- Policy v4 source summary: `7e542b498cf287fe67d493c25605cce5256acfabcb66081aef2c17ad89c5919b`
- qualification evaluation: `64ff5ad4114e09a542754519a8b849be1529570083d8554ffcb1d60a331c113d`
- 120-minute summary: `50a9772e374d8861c8eb73499eb74ee4c831ae46d25139e1e05bcce675e072a9`
- final-integrity log: `210a4fd60bc49f299523f4643bdda6e45c409bd1a154cd615dccfd901d90e9ed`

The release acceptance is source-bound to `c6b3d20a...`. PR checks, main merge, signed tag,
GitHub Release publication, and published metadata verification are separate close-out actions.
