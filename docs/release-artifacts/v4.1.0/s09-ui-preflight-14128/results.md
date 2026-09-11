# S09 UI preflight 14128 실패 증거

독자: 개발·테스트 검토자. Lifecycle: 실행별 불변 실패 기록. 중앙 release-test-records의 보조 artifact이며 현재 정책이나 UI PASS를 대체하지 않는다.

실제 명령 `./test_ui.sh`; exit1; start 2026-09-11T04:47:18.150Z; end 2026-09-11T04:47:41.979Z; elapsed 23829ms. 실제 브라우저/UI 0개 실행. 첫 실패는 clean worktree preflight, ui-final-integrity는 뒤따르는 증거 부재 2차 실패다. 커밋을 자동 승인하거나 gate를 우회하지 않았다.

## Stage 전수

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| preflight | command=preflight; exit=1; durationMs=0; log=/Users/dhseo/Workspace/mediaServer/.media_server.test/v4.1.0/ui-acceptance-current/runs/v390-test-acceptance-20260911044741-82626/preflight.log; current final actual acceptance requires a clean worktree; commit approved changes before running | fail | 원본 stage |
| build | command=; exit=null; durationMs=0; log=; not run after preflight failure | 미실행 | PASS 근거 아님 |
| feature-gates | command=; exit=null; durationMs=0; log=; not run after preflight failure | 미실행 | PASS 근거 아님 |
| server-longrun-30 | command=; exit=null; durationMs=0; log=; not run after preflight failure | 미실행 | PASS 근거 아님 |
| ui-environment-bootstrap | command=; exit=null; durationMs=0; log=; not run after preflight failure | 미실행 | PASS 근거 아님 |
| ui-exact-424 | command=; exit=null; durationMs=0; log=; not run after preflight failure | 미실행 | PASS 근거 아님 |
| ui-server-cleanup | command=stop exact UI throwaway server and verify ports; exit=0; durationMs=0; log=/Users/dhseo/Workspace/mediaServer/.media_server.test/v4.1.0/ui-acceptance-current/runs/v390-test-acceptance-20260911044741-82626/ui-server-cleanup.log;  | pass | 원본 stage |
| ui-fulltest-qualification | command=; exit=null; durationMs=0; log=; not run after preflight failure | 미실행 | PASS 근거 아님 |
| longrun-120-decision | command=; exit=null; durationMs=0; log=; not run after preflight failure | 미실행 | PASS 근거 아님 |
| server-longrun-120 | command=; exit=null; durationMs=0; log=; not run after preflight failure | 미실행 | PASS 근거 아님 |
| cleanup | command=validate child cleanup and preserved evidence; exit=0; durationMs=0; log=/Users/dhseo/Workspace/mediaServer/.media_server.test/v4.1.0/ui-acceptance-current/runs/v390-test-acceptance-20260911044741-82626/cleanup.log;  | pass | 원본 stage |
| ui-final-integrity | command=validate canonical UI parent/424 children/Policy/current run/source/cleanup; exit=1; durationMs=0; log=/Users/dhseo/Workspace/mediaServer/.media_server.test/v4.1.0/ui-acceptance-current/runs/v390-test-acceptance-20260911044741-82626/ui-final-integrity.log; final-parent-schema-mismatch; final-parent-eligibility-state-mismatch; final-parent-summary-path-mismatch; final-source-commit-mismatch; final-source-branch-mismatch; final-source-end-drift; final-current-source-drift; final-runtime-ownership-drift; final-policy-schema-mismatch; final-policy-not-qualified; final-policy-independent-evaluation-mismatch; final-policy-raw-schema-mismatch; final-policy-raw-source-binding-mismatch; final-policy-qualified-rows-not-canonical-424; final-policy-summary-missing; final-success-first-failure-not-null; ui-final-runtime-cleanup-not-measured | fail | preflight 뒤 2차 증거 부재 |
| report | command=write acceptance summary/report; exit=0; durationMs=0; log=/Users/dhseo/Workspace/mediaServer/.media_server.test/v4.1.0/ui-acceptance-current/runs/v390-test-acceptance-20260911044741-82626/report.log;  | pass | 원본 stage |
| final-integrity | command=; exit=null; durationMs=0; log=; not selected by ui suite | 미실행 | PASS 근거 아님 |

compact summary: {"total":14,"pass":3,"fail":2,"notRun":9}; stage 수14 = pass3/fail2/notRun9. 이 수는 UI case 수가 아니다.

## Launcher·source contract 원문 판정 전수

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| execution.log:4 | [pass] four root launchers are executable zero-option entrypoints | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:5 | [pass] common launcher owns output, contract preflight, sanitization, and exact delegation | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:6 | [pass] compact result writer normalizes parent checks and exact UI cases without stale failure files | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:7 | [pass] compact failure handoff preserves first failure and every later not-run item | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:8 | [pass] compact result writer records failures before a child summary exists | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:9 | [pass] user launcher bootstraps checksum-bound AI assets before actual test delegation | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:10 | [pass] server launchers use OS temp while UI and release use distinct repository roots | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:11 | [pass] standalone UI verifies the exact source manifest before environment bootstrap | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:12 | [pass] standalone UI source-contract failure cannot reach the acceptance environment | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:13 | [pass] 30-minute launcher delegates only the runner-owned 30-minute suite | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:14 | [pass] 30-minute root launcher accepts a passing server summary without UI evidence | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:15 | [pass] 120-minute launcher invocation is recorded as direct user authorization | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:16 | [pass] server launchers preserve suite-specific first failure and later not-run evidence | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:17 | [pass] release launcher falls back to the failed feature-gate check testcase ID | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:18 | [pass] UI launcher prints exact canonical fields and fails closed on a false gate | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:19 | [pass] UI launcher fails closed and prints explicit blanks when canonical summary path is missing | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:20 | [pass] UI launcher prints every canonical gate blank when the top acceptance summary is absent | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:21 | [pass] UI launcher builds current source before exact 424 environment and Policy v4 stages | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:22 | [pass] UI launcher build failure never reaches bootstrap or browser execution | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:23 | [pass] UI launcher fail-stop keeps Policy v4 not-run and still cleans up | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:24 | [pass] actual UI suite rejects an OS temp artifact root before environment bootstrap | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:25 | [pass] release launcher records 120 minutes as not-required without a trigger | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:26 | [pass] release launcher automatically runs 120 minutes only after a trigger | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:27 | [pass] AGENTS 7.6.2 change classifier covers every automatic 120-minute area | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:28 | [pass] media-path ICE classification requires an independent path token | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:29 | [pass] lower runners expose automatic UI suite and conditional 120 source contracts | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:39 | [pass] generated manifest validates against canonical exact ordered 424 | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:40 | [pass] event typed fixtures select one row and preserve request-derived identities | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:41 | [pass] incident memory search fixtures bind every product filter and searchable query | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:42 | [pass] event review seed receipts bind PUT response, storage readback, and EventRecord identity | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:43 | [pass] event review authoritative readback selects one exact nested event/review identity | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:44 | [pass] EVT-038 binds one dry-run response to one attempt, audit row, and DOM projection | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:45 | [pass] event review note evidence survives the production failure rewrap and parent aggregation | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:46 | [pass] builder is deterministic and preserves exact case order | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:47 | [pass] all 424 completion modes separate document navigation from application requests | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:48 | [pass] all 424 failure lifecycles retain the initial manifest navigation binding | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:49 | [pass] independent readback passes one coordinator ownership context and always ends it | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:50 | [pass] RULE-097 callback receives only its declared explicit argument projection | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:51 | [pass] bounded ownership cleanup precedes physical close without changing close truth | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:52 | [pass] EVT-004 reuses one document navigation and correlates only the authoritative API fetch | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:53 | [pass] canonical and native generator writes are one validated atomic transaction | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:54 | [pass] RULE relationship fixtures use one collision-free numeric identity contract | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:55 | [pass] workflow distribution is owned by the shared exact 424 contract | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:56 | [pass] declared exact runtime seeds materialize through the shared deterministic fixture registry | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:57 | [pass] every exact EVT seed.kind has a declarative store and join materializer | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:58 | [pass] event review mutation cleanup validates an empty 200 collection and byte restore | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:59 | [pass] event review seed keeps the official top-level note schema and uses structured reload | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:60 | [pass] records.records fixture family uses product dispatch with exact readback and cleanup | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:61 | [pass] fixture-safe incident digests bind one authoritative event to one safe summary | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:62 | [pass] EVT-023/026 expected digest binds one materialized EventRecord identity before browser startup | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:63 | [pass] EVT-004 diagnostic log evidence is redacted and byte-restored before native execution | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:64 | [pass] audited route-local primary controls match their exact runtime oracles | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:65 | [pass] endpoint source fixtures intentionally cross the published canonical-media baseline without bypassing sourceId identity | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:66 | [pass] inactive-or-equal-before cleanup accepts absent or disabled state and rejects enabled residue | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:67 | [pass] non-canonical implementation review metadata does not invalidate the exact 424 manifest | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:68 | [pass] exact-case implementation projection drift and whole-file fallback are rejected | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:69 | [pass] endpoint action execution inputs retain full runtime values but trace inputs are release-safe digests | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:70 | [pass] admin-only ops users cases and runtime role schema stay authoritative | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:71 | [pass] API ownership routes normalize to product screens | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:72 | [pass] UI-017 binds the client events read model instead of a dashboard-only preset status | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:73 | [pass] UI-018 remains a dedicated negative route case | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:74 | [pass] SAFE-017 keeps its cross-route negative behavior without changing UI-018 classification | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:75 | [pass] MEDIA/SAFE client cases and SAFE-016 negative route use one exact route lifecycle | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:76 | [pass] remaining client-safe batch clusters bind dynamic identities and owned lifecycle endpoints | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:77 | [pass] actual read-only and hidden-boundary completion requests use exact runtime oracle paths | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:78 | [pass] all cases declare native action, oracle seed, and artifact plan | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:79 | [pass] REVIEW4-56 requires exact typed product workflows for all 424 cases | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:80 | [pass] REVIEW4-56 rejects fallback no-submit generic and self-comparison workflows | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:81 | [pass] runner owns native execution, role state, first-fail, and artifact fields | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:82 | [pass] self-contained runtime closes invite, auth readback, preference, and visual-session gaps | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:83 | [pass] case runtime keeps generated secrets ephemeral and rejects state path escape | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:84 | [pass] authoritative cleanup readback restores state after success and failure | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:85 | [pass] SRC-010 and SRC-019 use a fresh fixture-scoped viewer and restore auth bytes | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:86 | [pass] fresh role session restores login audit writes before a read-only case | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:87 | [pass] fresh viewer session uses scope and client view readback instead of a nonexistent whoami viewId | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:88 | [pass] canonical requested route and runtime screen route are explicit projections | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:89 | [pass] runner and producer share typed capture schema while qualifier is independently implemented | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:90 | [pass] missing, reordered, unsupported, API-screen, and field drift are rejected | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:91 | [pass] stale implementation binding writes a fail-closed 0/424 pre-execution summary | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:92 | [pass] canonical parent bootstrap failure writes a fail-closed 0/424 summary | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:93 | [pass] pre-execution failure cannot become UI PASS, Policy v4 eligible, or cleanup evidence | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:94 | [pass] raw capture success and UI qualification remain separate lifecycle states | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:95 | [pass] evidence producer failure always leaves an exact 424 failure ledger | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:96 | [pass] full exact failure ledger preserves the typed EVT-004 lifecycle envelope | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:97 | [pass] failed case partial artifacts are referenced, deduplicated, and orphan-free | pass | 계약/정적 판정; 실제 UI PASS 아님 |
| execution.log:98 | [pass] canonical case children bind duplicate screenshots to one prior artifact | pass | 계약/정적 판정; 실제 UI PASS 아님 |

## Summary 주요 상태 및 cleanup 내부 검사

```json
{
  "actualBrowserExecution": false,
  "uiFulltestQualification": {
    "status": "ineligible",
    "finalEvidenceEligible": false,
    "exactCaseCount": 424,
    "qualifiedCaseCount": 0,
    "unsupported": -1,
    "uiFulltestPass": false,
    "policyValidationResult": "missing",
    "sourceSummary": "",
    "sourceSummarySha256": "",
    "reasons": [
      "acceptance-execution-not-pass",
      "policy-evaluation-schema-mismatch",
      "policy-validation-not-pass",
      "policy-source-evidence-schema-mismatch",
      "policy-evidence-not-eligible",
      "policy-ui-fulltest-not-pass",
      "qualified-case-count-not-424",
      "qualified-case-id-list-not-424",
      "qualified-case-id-list-has-duplicates",
      "qualified-case-id-list-not-canonical",
      "full-suite-not-actual-browser-execution",
      "requested-exact-case-count-not-424",
      "full-suite-pass-count-not-424",
      "full-suite-fail-not-zero",
      "full-suite-notRun-not-zero",
      "full-suite-unsupported-not-zero",
      "full-suite-unapprovedExclusions-not-zero",
      "full-suite-manualIntervention-not-zero",
      "policy-source-summary-hash-missing"
    ]
  },
  "uiFinalIntegrity": {
    "schema": "media-server.v390-ui-final-integrity.v1",
    "contractFixture": false,
    "status": "FAIL",
    "finalEvidenceEligible": false,
    "runId": "v390-test-acceptance-20260911044741-82626",
    "canonicalParentRunId": "",
    "sourceBinding": null,
    "parent": null,
    "policyRaw": null,
    "policyEvaluation": null,
    "childSummaryCensusCount": 0,
    "exactCounts": null,
    "cleanup": {
      "root": "PASS",
      "runtime": "PASS"
    },
    "reasons": [
      "final-parent-schema-mismatch",
      "final-parent-eligibility-state-mismatch",
      "final-parent-summary-path-mismatch",
      "final-source-commit-mismatch",
      "final-source-branch-mismatch",
      "final-source-end-drift",
      "final-current-source-drift",
      "final-runtime-ownership-drift",
      "final-policy-schema-mismatch",
      "final-policy-not-qualified",
      "final-policy-independent-evaluation-mismatch",
      "final-policy-raw-schema-mismatch",
      "final-policy-raw-source-binding-mismatch",
      "final-policy-qualified-rows-not-canonical-424",
      "final-policy-summary-missing",
      "final-success-first-failure-not-null",
      "ui-final-runtime-cleanup-not-measured"
    ],
    "path": "/Users/dhseo/Workspace/mediaServer/.media_server.test/v4.1.0/ui-acceptance-current/runs/v390-test-acceptance-20260911044741-82626/ui-final-integrity.json",
    "bytes": 1140,
    "sha256": "fe633c74233841afba843dc71b43ef3dedc74f2e0f370ee05a994b21cbc4931d"
  },
  "cleanup": {
    "status": "PASS",
    "verificationSource": "child-summary-and-filesystem",
    "childCleanupVerified": true,
    "temporaryArtifactsRemoved": true,
    "placeholderVideoFilesAbsent": true,
    "duplicateScreenshotFilesAbsent": true,
    "preservedArtifacts": [
      "/Users/dhseo/Workspace/mediaServer/.media_server.test/v4.1.0/ui-acceptance-current/summary.json",
      "/Users/dhseo/Workspace/mediaServer/.media_server.test/v4.1.0/ui-acceptance-current/report.md"
    ],
    "preservationReason": "minimum reproducible summary/report/log/screenshot evidence inside requested output directory",
    "checks": [
      {
        "check": "child-cleanup-validation",
        "status": "PASS",
        "observed": true
      },
      {
        "check": "temporary-run-paths-absent",
        "status": "PASS",
        "paths": []
      },
      {
        "check": "placeholder-video-files-absent",
        "status": "PASS",
        "paths": []
      },
      {
        "check": "duplicate-screenshot-files-absent",
        "status": "PASS",
        "groups": []
      }
    ]
  },
  "uiServerCleanup": {
    "status": "PASS",
    "runtimeEvidence": false,
    "fixtureMode": false,
    "verificationSource": "no-environment-acquired-no-cleanup-required",
    "serversStopped": true,
    "portsClean": true,
    "temporaryArtifactsRemoved": true,
    "removedTemporaryArtifacts": [],
    "measurement": null,
    "checks": [
      {
        "check": "no-environment-acquired",
        "status": "PASS"
      }
    ]
  }
}
```

ui-server-cleanup은 no-environment-acquired-no-cleanup-required이며 실제 서버/port 측정 PASS가 아니다. cleanup stage는 child 임시 runtime 없음 검사이고 아래 보존 로그/root의 최종 삭제와 다르다.

## 미실행 전수

- build: not run after preflight failure. 완료 근거 아님.
- feature-gates: not run after preflight failure. 완료 근거 아님.
- server-longrun-30: not run after preflight failure. 완료 근거 아님.
- ui-environment-bootstrap: not run after preflight failure. 완료 근거 아님.
- ui-exact-424: not run after preflight failure. 완료 근거 아님.
- ui-fulltest-qualification: not run after preflight failure. 완료 근거 아님.
- longrun-120-decision: not run after preflight failure. 완료 근거 아님.
- server-longrun-120: not run after preflight failure. 완료 근거 아님.
- final-integrity: not selected by ui suite. 완료 근거 아님.
- baseline424 실제 browser 및 녹화8 action: 미실행. 전체432 PASS 아님.
- UI 실패 뒤 녹화전용120: 이번 실행 범위에서 미실행.

## 원본 파일과 cleanup 예정

모든 경로는 lstat; symlink를 따라가지 않았다. 원본은 아직 삭제하지 않았으며 메인이 증거 검토 후 정리한다.

| 경로 | bytes | SHA256 | 소유 근거/조치 |
| --- | ---: | --- | --- |
| /private/tmp/s09-ui-baseline-gGUka4/before-temp-names.json | 189 | eece7c89a29416cd24a5dcf82617bf00d54b6125da86e0cf30e1b4585435220b | 실행 capture root; 삭제 예정 |
| /private/tmp/s09-ui-baseline-gGUka4/execution.log | 11393 | 310ffa9fc1929e69dd66d8e9d83d7108c5073be63ca28887c93b3a0d3d7ee2b1 | 실행 capture root; 삭제 예정 |
| /private/tmp/s09-ui-baseline-gGUka4/exit.json | 90 | 1a0aa155ff2cf5872a5bbb10d98819334b0308b7025d7d67cd3e41cfaaec8ea8 | 실행 capture root; 삭제 예정 |
| /Users/dhseo/Workspace/mediaServer/.media_server.test/v4.1.0/ui-acceptance-current/failure-handoff.json | 2491 | d79887746f65ef0d70d6001329f388e0f5555e9cb19e1ad73ff97aa55bfaf4f7 | summary.outputDir/runDir 산출물; 삭제 예정 |
| /Users/dhseo/Workspace/mediaServer/.media_server.test/v4.1.0/ui-acceptance-current/failure-handoff.md | 1348 | 91febf672e0b54f05bf8270657a47b4c7c6608ec5fd0c03770577053819040f7 | summary.outputDir/runDir 산출물; 삭제 예정 |
| /Users/dhseo/Workspace/mediaServer/.media_server.test/v4.1.0/ui-acceptance-current/first-failure.json | 14673 | 51988b578e35fe845345d79fbfc65631063c0bb21c365a18a63d20b4fc09a183 | summary.outputDir/runDir 산출물; 삭제 예정 |
| /Users/dhseo/Workspace/mediaServer/.media_server.test/v4.1.0/ui-acceptance-current/first-failure.md | 1176 | 33886f7869f5e83cc772fd9882eced0e2f12534070bf1c4aba426b132cd5f472 | summary.outputDir/runDir 산출물; 삭제 예정 |
| /Users/dhseo/Workspace/mediaServer/.media_server.test/v4.1.0/ui-acceptance-current/report.md | 4392 | ca05ef9345119087dd554ece6f77a14e7d6e1d5c8fbaa48f4549d4c616fc3ac4 | summary.outputDir/runDir 산출물; 삭제 예정 |
| /Users/dhseo/Workspace/mediaServer/.media_server.test/v4.1.0/ui-acceptance-current/runs/v390-test-acceptance-20260911044741-82626/cleanup.log | 827 | ddd749b92f9877ea3b3a52b1b5ca5066def738e83fdf8fc68945288df5188f7c | summary.outputDir/runDir 산출물; 삭제 예정 |
| /Users/dhseo/Workspace/mediaServer/.media_server.test/v4.1.0/ui-acceptance-current/runs/v390-test-acceptance-20260911044741-82626/preflight.log | 98 | 2850b406fc5621e54113a6194b61e56fa7bbf646f87c3e79f277cb380723da5e | summary.outputDir/runDir 산출물; 삭제 예정 |
| /Users/dhseo/Workspace/mediaServer/.media_server.test/v4.1.0/ui-acceptance-current/runs/v390-test-acceptance-20260911044741-82626/report.log | 222 | 9219614f1fa3c2936de771f109cc5496e2d094d07f9289bd4c08387d7bbc84d9 | summary.outputDir/runDir 산출물; 삭제 예정 |
| /Users/dhseo/Workspace/mediaServer/.media_server.test/v4.1.0/ui-acceptance-current/runs/v390-test-acceptance-20260911044741-82626/ui-final-integrity.json | 1140 | fe633c74233841afba843dc71b43ef3dedc74f2e0f370ee05a994b21cbc4931d | summary.outputDir/runDir 산출물; 삭제 예정 |
| /Users/dhseo/Workspace/mediaServer/.media_server.test/v4.1.0/ui-acceptance-current/runs/v390-test-acceptance-20260911044741-82626/ui-final-integrity.log | 567 | 233be89ec5dc18ddda867947fa329b4cb7a7e8ef3d10c1991c38b995f635fded | summary.outputDir/runDir 산출물; 삭제 예정 |
| /Users/dhseo/Workspace/mediaServer/.media_server.test/v4.1.0/ui-acceptance-current/runs/v390-test-acceptance-20260911044741-82626/ui-server-cleanup.log | 315 | 95693ff94c15a468e0165402d193f566bc102721d01e19ad0c1eb4b36f45850f | summary.outputDir/runDir 산출물; 삭제 예정 |
| /Users/dhseo/Workspace/mediaServer/.media_server.test/v4.1.0/ui-acceptance-current/summary.json | 46490 | 51f5341548a7ca723a57ec42fa17c72a1c8bda04864c5d216bda508f8a590b19 | summary.outputDir/runDir 산출물; 삭제 예정 |
| /Users/dhseo/Workspace/mediaServer/.media_server.test/v4.1.0/ui-acceptance-current/test-run-summary.json | 5134 | f461648d70e5965a62d0fe3bbc97a5d8341bced29d5380ce3a51fb133683d7ab | summary.outputDir/runDir 산출물; 삭제 예정 |

### before-temp 신규 경로 대조

| 경로 | lstat bytes | 소유 판정 |
| --- | ---: | --- |

## Census·한계

{"stageCount":14,"contractMarkerRows":86,"contractCounts":{"pass":86},"sourceFiles":16,"rootFileBytes":11672,"outputFileBytes":78873,"newTempNames":[]}

원본 URL/session 값은 가림, credential·raw source/debug payload는 보존하지 않음. token start/end/consumed 미집계: 실행별 자동 집계 제공 안 됨. elapsed source=exit.json. 추가 테스트·서버·삭제·커밋·푸시 미수행.
