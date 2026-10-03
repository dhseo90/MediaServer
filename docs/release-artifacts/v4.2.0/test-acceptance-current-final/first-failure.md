# v3.9.0 Acceptance First Failure

schema: media-server.v390-acceptance-first-failure.v1
recordedAt: 2026-10-03T03:45:08.533Z
runId: v390-test-acceptance-20261003033950-82694
sourceCommitSha: 4ad2fe20ae03dd676cab1c4c8bf3e1f0f71238e3
failedStage: feature-gates
testcaseId: project-inventory
error: [pass] manual UI seed tracker Re-ID pair bytetrack/off | [pass] manual UI seed tracker Re-ID pair lite/assist | [pass] manual UI seed tracker Re-ID pair kalman-lite/assist | [pass] manual UI seed tracker Re-ID pair bytetrack/assist | [pass] manual UI seed invalid policy tracker none Re-ID assist | [pass] manual UI seed final state minimum vaRules | [pass] manual UI VA seed matrix covers required current release cases | == Project feature/test inventory summary == | - featureRows: 986 | - seedFixture: test/fixtures/manual_ui_fulltest_va_seed_matrix.json | - pass: 17 | - fail: 1
logPath: /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.2.0/test-acceptance-current-final/runs/v390-test-acceptance-20261003033950-82694/feature-gates-32-project-inventory.log
failedCommand: ./server.sh verify-project-inventory
reproductionCommand: ./test_release.sh
context: [pass] manual UI seed tracker Re-ID pair bytetrack/off | [pass] manual UI seed tracker Re-ID pair lite/assist | [pass] manual UI seed tracker Re-ID pair kalman-lite/assist | [pass] manual UI seed tracker Re-ID pair bytetrack/assist | [pass] manual UI seed invalid policy tracker none Re-ID assist | [pass] manual UI seed final state minimum vaRules | [pass] manual UI VA seed matrix covers required current release cases | == Project feature/test inventory summary == | - featureRows: 986 | - seedFixture: test/fixtures/manual_ui_fulltest_va_seed_matrix.json | - pass: 17 | - fail: 1
childFailurePhase: not-recorded
childFailureCase: not-recorded
childCleanupStatus: not-recorded

## Diagnostic artifact snapshots

### /Users/dhseo/Workspace/mediaServer/docs/release-artifacts/v4.2.0/test-acceptance-current-final/runs/v390-test-acceptance-20261003033950-82694/feature-gates-32-project-inventory.log

bytes: 210286
sha256: 79b5df030239d12a84eeca037d9144e8a66cd5d41e1998b20d1f3435af233c09

```text
[pass] feature OPS-172 pass criteria present
[pass] feature OPS-173 name present
[pass] feature OPS-173 UI need 비대상
[pass] feature OPS-173 test need 필요
[pass] feature OPS-173 test area assigned
[pass] feature OPS-173 pass criteria present
[pass] feature OPS-174 name present
[pass] feature OPS-174 UI need 비대상
[pass] feature OPS-174 test need 필요
[pass] feature OPS-174 test area assigned
[pass] feature OPS-174 pass criteria present
[pass] feature OPS-175 name present
[pass] feature OPS-175 UI need 비대상
[pass] feature OPS-175 test need 필요
[pass] feature OPS-175 test area assigned
[pass] feature OPS-175 pass criteria present
[pass] feature OPS-176 name present
[pass] feature OPS-176 UI need 비대상
[pass] feature OPS-176 test need 필요
[pass] feature OPS-176 test area assigned
[pass] feature OPS-176 pass criteria present
[pass] feature OPS-177 name present
[pass] feature OPS-177 UI need 비대상
[pass] feature OPS-177 test need 필요
[pass] feature OPS-177 test area assigned
[pass] feature OPS-177 pass criteria present
[pass] feature OPS-178 name present
[pass] feature OPS-178 UI need 비대상
[pass] feature OPS-178 test need 필요
[pass] feature OPS-178 test area assigned
[pass] feature OPS-178 pass criteria present
[pass] feature OPS-179 name present
[pass] feature OPS-179 UI need 비대상
[pass] feature OPS-179 test need 필요
[pass] feature OPS-179 test area assigned
[pass] feature OPS-179 pass criteria present
[pass] feature OPS-180 name present
[pass] feature OPS-180 UI need 비대상
[pass] feature OPS-180 test need 필요
[pass] feature OPS-180 test area assigned
[pass] feature OPS-180 pass criteria present
[pass] feature OPS-181 name present
[pass] feature OPS-181 UI need 비대상
[pass] feature OPS-181 test need 필요
[pass] feature OPS-181 test area assigned
[pass] feature OPS-181 pass criteria present
[pass] feature OPS-182 name present
[pass] feature OPS-182 UI need 비대상
[pass] feature OPS-182 test need 필요
[pass] feature OPS-182 test area assigned
[pass] feature OPS-182 pass criteria present
[pass] feature OPS-183 name present
[pass] feature OPS-183 UI need 비대상
[pass] feature OPS-183 test need 필요
[pass] feature OPS-183 test area assigned
[pass] feature OPS-183 pass criteria present
[pass] feature OPS-184 name present
[pass] feature OPS-184 UI need 비대상
[pass] feature OPS-184 test need 필요
[pass] feature OPS-184 test area assigned
[pass] feature OPS-184 pass criteria present
[pass] feature rows have required matrix columns
[pass] inventory rejects separate test-area labels
[pass] coverage wording separates mapping from execution
[pass] current feature expansion rows exist
[pass] manual UI docs reference inventory
[pass] manual checklist references seed fixture
[pass] manual result template references seed fixture
[pass] VA seed inventory commands select the latest published baseline explicitly
[pass] AGENTS links current individual feature test definitions
[pass] manual UI seed account role admin
[pass] manual UI seed account role operator
[pass] manual UI seed account role viewer
[pass] manual UI seed account role integrator
[pass] manual UI seed profile 9101 numeric id
[pass] manual UI seed profile 9101 tracking classes present
[pass] manual UI seed profile 9102 numeric id
[pass] manual UI seed profile 9102 tracking classes present
[pass] manual UI seed profile 9103 numeric id
[pass] manual UI seed profile 9103 tracking classes present
[pass] manual UI seed profile 9104 numeric id
[pass] manual UI seed profile 9104 tracking classes present
[pass] manual UI seed profile 9105 numeric id
[pass] manual UI seed profile 9105 tracking classes present
[pass] manual UI seed profile 9106 numeric id
[pass] manual UI seed profile 9106 tracking classes present
[pass] manual UI seed profile 9107 numeric id
[pass] manual UI seed profile 9107 tracking classes present
[pass] manual UI seed event type presence
[pass] manual UI seed event type enter
[pass] manual UI seed event type exit
[pass] manual UI seed event type line-crossing
[pass] manual UI seed event type intrusion-dwell
[pass] manual UI seed event type re-entry
[pass] manual UI seed event type wrong-direction
[pass] manual UI seed event type intrusion-after-line-crossing
[pass] manual UI seed event type loitering
[pass] manual UI seed event type zone-occupancy
[pass] manual UI seed event template 9201 numeric id
[pass] manual UI seed event template 9201 event type presence
[pass] manual UI seed event template 9201 profile reference
[pass] manual UI seed event template 9202 numeric id
[pass] manual UI seed event template 9202 event type enter
[pass] manual UI seed event template 9202 profile reference
[pass] manual UI seed event template 9203 numeric id
[pass] manual UI seed event template 9203 event type exit
[pass] manual UI seed event template 9203 profile reference
[pass] manual UI seed event template 9204 numeric id
[pass] manual UI seed event template 9204 event type line-crossing
[pass] manual UI seed event template 9204 profile reference
[pass] manual UI seed event template 9205 numeric id
[pass] manual UI seed event template 9205 event type line-crossing
[pass] manual UI seed event template 9205 profile reference
[pass] manual UI seed event template 9206 numeric id
[pass] manual UI seed event template 9206 event type line-crossing
[pass] manual UI seed event template 9206 profile reference
[pass] manual UI seed event template 9207 numeric id
[pass] manual UI seed event template 9207 event type intrusion-dwell
[pass] manual UI seed event template 9207 profile reference
[pass] manual UI seed event template 9208 numeric id
[pass] manual UI seed event template 9208 event type re-entry
[pass] manual UI seed event template 9208 profile reference
[pass] manual UI seed event template 9209 numeric id
[pass] manual UI seed event template 9209 event type wrong-direction
[pass] manual UI seed event template 9209 profile reference
[pass] manual UI seed event template 9210 numeric id
[pass] manual UI seed event template 9210 event type intrusion-after-line-crossing
[pass] manual UI seed event template 9210 profile reference
[pass] manual UI seed event template 9211 numeric id
[pass] manual UI seed event template 9211 event type loitering
[pass] manual UI seed event template 9211 profile reference
[pass] manual UI seed event template 9212 numeric id
[pass] manual UI seed event template 9212 event type zone-occupancy
[pass] manual UI seed event template 9212 profile reference
[pass] manual UI seed line direction any
[pass] manual UI seed line direction forward
[pass] manual UI seed line direction reverse
[pass] manual UI seed scenario preset default
[pass] manual UI seed scenario preset road
[pass] manual UI seed scenario preset retail
[pass] manual UI seed scenario preset park
[pass] manual UI seed scenario preset indoor
[pass] manual UI seed scenario preset lobby
[pass] manual UI seed scenario preset platform
[pass] manual UI seed scenario preset entrance
[pass] manual UI seed scenario preset doorway
[pass] manual UI seed scenario preset parking
[pass] manual UI seed scenario preset elevator
[pass] manual UI seed scenario preset custom
[pass] manual UI seed vaRule 9301 numeric id
[pass] manual UI seed vaRule 9301 profile reference
[pass] manual UI seed vaRule 9301 event template reference
[pass] manual UI seed vaRule 9302 numeric id
[pass] manual UI seed vaRule 9302 profile reference
[pass] manual UI seed vaRule 9302 event template reference
[pass] manual UI seed vaRule 9303 numeric id
[pass] manual UI seed vaRule 9303 profile reference
[pass] manual UI seed vaRule 9303 event template reference
[pass] manual UI seed vaRule 9304 numeric id
[pass] manual UI seed vaRule 9304 profile reference
[pass] manual UI seed vaRule 9304 event template reference
[pass] manual UI seed vaRule 9305 numeric id
[pass] manual UI seed vaRule 9305 profile reference
[pass] manual UI seed vaRule 9305 event template reference
[pass] manual UI seed vaRule 9306 numeric id
[pass] manual UI seed vaRule 9306 profile reference
[pass] manual UI seed vaRule 9306 event template reference
[pass] manual UI seed vaRule 9307 numeric id
[pass] manual UI seed vaRule 9307 profile reference
[pass] manual UI seed vaRule 9307 event template reference
[pass] manual UI seed vaRule 9308 numeric id
[pass] manual UI seed vaRule 9308 profile reference
[pass] manual UI seed vaRule 9308 event template reference
[pass] manual UI seed vaRule 9309 numeric id
[pass] manual UI seed vaRule 9309 profile reference
[pass] manual UI seed vaRule 9309 event template reference
[pass] manual UI seed vaRule 9310 numeric id
[pass] manual UI seed vaRule 9310 profile reference
[pass] manual UI seed vaRule 9310 event template reference
[pass] manual UI seed vaRule 9311 numeric id
[pass] manual UI seed vaRule 9311 profile reference
[pass] manual UI seed vaRule 9311 event template reference
[pass] manual UI seed vaRule 9312 numeric id
[pass] manual UI seed vaRule 9312 profile reference
[pass] manual UI seed vaRule 9312 event template reference
[pass] manual UI seed tracker Re-ID pair none/off
[pass] manual UI seed tracker Re-ID pair lite/off
[pass] manual UI seed tracker Re-ID pair kalman-lite/off
[pass] manual UI seed tracker Re-ID pair bytetrack/off
[pass] manual UI seed tracker Re-ID pair lite/assist
[pass] manual UI seed tracker Re-ID pair kalman-lite/assist
[pass] manual UI seed tracker Re-ID pair bytetrack/assist
[pass] manual UI seed invalid policy tracker none Re-ID assist
[pass] manual UI seed final state minimum vaRules
[pass] manual UI VA seed matrix covers required current release cases
== Project feature/test inventory summary ==
- featureRows: 986
- seedFixture: test/fixtures/manual_ui_fulltest_va_seed_matrix.json
- pass: 17
- fail: 1
```
