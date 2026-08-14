# v3.9.0 final-integrity failure evidence

This bounded package preserves the release run started on 2026-08-13 from source
`08ad8b3ee70391be84cdf21de07215ec7ce0f070`.

- Full build and feature gates: PASS
- 30-minute longrun: PASS (`118 PASS / 0 FAIL / 2 skip`)
- Canonical UI: PASS (`424/424`, actual browser execution)
- Policy v4: PASS and eligible (`424/424` qualified)
- 120-minute longrun: PASS (`443 PASS / 0 FAIL / 2 skip`, 87 soak iterations)
- Cleanup: PASS
- Final integrity: FAIL (`final-policy-independent-evaluation-mismatch`)

The failing verifier recomputed `worktreePatchSha256` from the complete Git diff,
which included the acceptance-owned canonical artifact directory. Earlier Policy
qualification correctly excluded that directory from source provenance. The two
stages therefore compared different source boundaries for the same run.

The package retains 13 files: top-level summary/report/first failure, 30-minute
and 120-minute summaries/reports, exact-424 and Policy summaries, qualification
evidence, and the final-integrity log. The original 4,900-file/309 MB run is not
committed.

Key SHA-256 bindings:

- `summary.json`: `73503093f444263c49d63e7dd5d45c8b70d77cbc7cf068588ef0595275c466d4`
- exact summary: `fdab6a69b114b3028b3d8c77d4cb11ffa268181248b49ea769aaa9fef8f804d5`
- Policy source summary: `0d5cf56311041661d4c13332f1d5d7469915e58b229f29186806bd29a7380bcd`
- qualification evaluation: `24092044b2a43ace78beae7e157711494805485d31c6ad53ef0a438cb5386194`
- 120-minute summary: `8768f9f598fd7ce24bbafc6502e9416e584d5940fdef0b4111f141ced510854a`

This is historical failure evidence. It is not release-ready evidence and does
not substitute for a clean-source `./test_release.sh` PASS.
