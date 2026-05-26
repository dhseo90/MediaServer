# UI Visual Release Baseline Approval Log Sample

주의: 이 파일은 작성 형식만 검증하는 sample-only fixture입니다. 실제 release baseline 승인, UI 검수 통과 증빙, public release asset, candidate pass proof로 사용하지 않습니다.

## Baseline Identity

- baseline run: sample-baseline-run-20260516
- branch/tag: sample/v1.8.0-rc
- commit: 0000000000000000000000000000000000000000
- artifact directory: `/tmp/sample-ui-visual-baseline-artifact`
- `visual-regression-manifest.json`: `/tmp/sample-ui-visual-baseline-artifact/visual-regression-manifest.json`
- `index.md`: `/tmp/sample-ui-visual-baseline-artifact/index.md`
- retention: 45 days

## Replacement Reason

- reason: sample-only replacement reason for verifier coverage
- affected pages/viewports: `/ops/home`, `/ops/dashboard`, `/client/live` at 320px, 390px, 760px, 1180px
- expected visual change: sample-only visual wording/layout update
- linked issue/PR: sample-only

## Comparison Evidence

- previous baseline artifact: `/tmp/sample-previous-baseline`
- candidate artifact: `/tmp/sample-candidate-baseline`
- `visual-baseline-diff.json`: `/tmp/sample-baseline-diff/visual-baseline-diff.json`
- `visual-baseline-diff.md`: `/tmp/sample-baseline-diff/visual-baseline-diff.md`
- decision: review
- review-required items: sample-only candidate screenshot review

## Manual Review

- 320px reviewed: sample-only yes
- 390px reviewed: sample-only yes
- 760px reviewed: sample-only yes
- 1180px reviewed: sample-only yes
- client/viewer source URL hidden: sample-only checked
- Developer URL hidden: sample-only checked
- raw JSON/debug counters/BBox diagnostics hidden: sample-only checked
- rule/profile editor hidden from client/viewer: sample-only checked

## Approval

- approver: sample-approver
- approval date: 2026-05-16
- accepted baseline run: sample-baseline-run-20260516
- release/RC note link: sample-only
- follow-up issues: sample-only follow-up list

## Not Run / Limitations

- 실물 ONVIF/RTSP/WebRTC 원본 장비 field smoke: not run; no physical source devices in this sample fixture
- 장시간 테스트: not run
- `verify-predev`: not run
- reason: sample-only fixture, no commands executed
