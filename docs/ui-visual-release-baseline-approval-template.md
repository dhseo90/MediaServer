# UI Visual Release Baseline Approval Log

이 템플릿은 UI visual release baseline artifact를 새 기준으로 채택하거나 교체할 때 사용합니다.
release baseline artifact는 승인된 release/RC 화면 상태를 다음 candidate artifact와 비교하는
approved comparator이며, public release asset 또는 candidate pass proof가 아닙니다.

## Baseline Identity

- baseline run:
- branch/tag:
- commit:
- artifact directory:
- `visual-regression-manifest.json`:
- `index.md`:
- retention: 45 days

## Replacement Reason

- reason:
- affected pages/viewports:
- expected visual change:
- linked issue/PR:

## Comparison Evidence

- previous baseline artifact:
- candidate artifact:
- `visual-baseline-diff.json`:
- `visual-baseline-diff.md`:
- decision: pass / review / fail
- review-required items:

## Manual Review

- 320px reviewed:
- 390px reviewed:
- 760px reviewed:
- 1180px reviewed:
- client/viewer source URL hidden:
- Developer URL hidden:
- raw JSON/debug counters/BBox diagnostics hidden:
- rule/profile editor hidden from client/viewer:

## Approval

- approver:
- approval date:
- accepted baseline run:
- release/RC note link:
- follow-up issues:

## Not Run / Limitations

- 실물 ONVIF/RTSP/WebRTC 원본 장비 field smoke:
- 장시간 테스트:
- `verify-predev`:
- reason:
