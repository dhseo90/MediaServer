#!/usr/bin/env bash
# 파일 용도: MediaServer 설치/시작/중지/진단을 하나의 진입점으로 묶는다.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INTERNAL_DIR="${ROOT_DIR}/scripts/internal"

usage() {
  cat <<EOF_USAGE
MediaServer 사용법

Usage:
  ./server.sh <command> [options]

가장 많이 쓰는 명령:
  install        새 환경에 필요한 패키지, ONNX Runtime, YOLO 모델/라벨, 로컬 설정을 준비합니다.
  build          서버를 실행하지 않고 AI 포함 기본 빌드만 수행합니다.
  start          AI 포함 기본 빌드(build-gst-onnx) 후 서버를 백그라운드로 실행합니다.
  stop           실행 중인 media_server를 종료하고 stale pid/listener 상태를 정리합니다.

운영/점검 명령:
  restart        stop 후 start를 실행하고 진단까지 수행합니다.
  status         현재 프로세스, RTSP/HTTP 포트, 샘플 URL, 최근 로그를 확인합니다.
  check          status와 동일한 별칭입니다.
  diagnose       실행환경, 포트 바인딩, 파일/RTSP source 접근성 문제를 자세히 진단합니다.
  ops-bundle     health/runtime/diagnose/log/config 요약을 운영 공유용 bundle로 생성합니다.
  ops-evidence-cleanup
                 EventRecord snapshot/clip evidence retention cleanup job을 실행합니다.
  urls           같은 LAN의 다른 PC/VLC/IINA/브라우저에서 복사해 쓸 테스트 URL을 출력합니다.
  auth-user      users file 계정을 list/add/disable/enable/reset-password로 관리합니다.

개발/검증 명령:
  foreground     서버를 foreground로 실행합니다. 개발 중 로그를 바로 볼 때 사용합니다.
  test           기본값은 --basic입니다. 기본/풀/외부 통합 테스트를 한글 리포트로 실행합니다.
  verify-codecs  file/RTSP/WebRTC source와 codec route matrix를 자동 검증합니다.
  verify-webrtc-ice
                 WebRTC STUN/TURN/ICE policy와 candidate 수집 상태를 검증합니다.
  verify-external-turn-whep-field-gate
                 v2.1.0 external TURN/WHEP field smoke와 기본 release PASS 분리 기준을 검증합니다.
  verify-uri-longrun
                 HTTP/HLS URI source의 로컬 반복 검증과 선택 외부 URL 반복 검증을 수행합니다.
  verify-va      YOLO/VA overlay의 lab/RTSP 검증을 수행합니다.
  verify-redaction
                 사람 객체 자동 모자이크(redaction)의 image/live 검증을 수행합니다.
  verify-va-events
                 이동 테스트 영상으로 tracker 기반 presence/enter/exit/line-crossing을 검증합니다.
  verify-va-event-coverage-report
                 VA rule/scenario/EventRecord coverage를 조합 단위 report로 검증합니다.
  verify-va-category-samples
                 실제 영상 샘플에서 VA 카테고리별 presence 이벤트를 검증합니다.
  verify-route-profiles
                 실제 RTSP overlay에서 route별 profile/rule matching을 검증합니다.
  verify-rule-ui
                 /ops/rules Rule/Profile 카테고리 버튼과 저장 payload를 검증합니다.
  verify-ops-client-ui
                 /ops와 /client shell selector 및 client debug/source 비노출을 검증합니다.
  verify-ui-visual-artifact-index
                 UI screenshot artifact index/manifest 생성을 검증합니다.
  verify-ui-release-baseline-approval-log
                 UI release baseline approval log template과 CI 연결을 검증합니다.
  compare-ui-visual-baseline
                 UI screenshot artifact baseline과 candidate의 manifest/pixel diff를 생성합니다.
  write-ui-visual-qa-issue-links
                 UI visual QA issue에 붙일 artifact link Markdown을 생성합니다.
  write-ui-visual-baseline-comment
                 UI visual baseline diff report를 PR/issue comment Markdown으로 요약합니다.
  ui-visual-artifact-maintenance
                 UI visual artifact를 retention policy 기준으로 dry-run/보관/정리합니다.
  verify-product-ui-token-drift
                 제품 UI CSS가 design token 밖 raw color를 추가하지 않는지 검증합니다.
  verify-v220-design-token-refresh
                 v2.2.0 design token refresh 계약과 token 소비 지점을 검증합니다.
  verify-v220-component-primitives
                 v2.2.0 component primitive helper 경계와 소비 지점을 검증합니다.
  verify-v220-ops-workspace-redesign
                 v2.2.0 Ops workspace redesign route/CSS/문서 연결을 검증합니다.
  verify-v220-rules-workspace-redesign
                 v2.2.0 Rules workspace redesign route/CSS/문서 연결을 검증합니다.
  verify-v220-client-live-redesign
                 v2.2.0 Client live redesign route/CSS/문서 연결을 검증합니다.
  verify-v220-auth-setup-redesign
                 v2.2.0 Auth/setup redesign route/CSS/문서 연결을 검증합니다.
  verify-v220-ops-channels-workspace
                 v2.2.0 Ops Channels Workspace route/CSS/문서 연결을 검증합니다.
  verify-v220-ops-users-access-workspace
                 v2.2.0 Ops Users / Access Workspace route/CSS/문서 연결을 검증합니다.
  verify-v220-ops-vlm-containment
                 v2.2.0 Ops VLM containment route/CSS/문서 연결을 검증합니다.
  verify-v220-client-preview-redaction-review
                 v2.2.0 Client preview/redaction route/CSS/문서 연결을 검증합니다.
  verify-v220-ui-evidence-closeout
                 v2.2.0 UI evidence close-out 문서/checklist/result 기준 연결을 검증합니다.
  verify-product-shell-examples
                 제품 shell/component 예시 문서와 UI guide 연결을 검증합니다.
  verify-ops-route-boundaries
                 /ops, /client shell과 Lab 분석 API 경계를 검증합니다.
  verify-ops-click-e2e
                 /ops 채널/룰/사용자 주요 패널과 탭 이동을 실제 브라우저 클릭으로 검증합니다.
  verify-ops-tables-layout
                 /ops 채널/룰/사용자 데이터 테이블의 반응형 셀 침범과 리사이즈 안정성을 검증합니다.
  verify-ops-rules-roundtrip
                 /ops/rules 이벤트 템플릿 저장/조회 round-trip을 영상 재생 없이 검증합니다.
  verify-ops-rule-relationships
                 채널/PublishedView/VA 룰/이벤트 템플릿/분석 프로파일 참조와 저장 validation을 검증합니다.
  verify-ops-rule-conflict-ui
                 /ops/rules 저장 전 충돌/누락 표시와 차단 hook을 검증합니다.
  verify-ops-rule-validation-matrix
                 룰 저장 validation fixture matrix를 정적 검증합니다.
  verify-ops-scenario-presets
                 현장형 VA 시나리오 preset UI와 threshold round-trip을 검증합니다.
  verify-ops-source-lifecycle
                 WebRTC session active/cleanup 기준으로 공통 source lifecycle idle 복귀를 검증합니다.
  verify-ops-source-health-bulk
                 /ops/api/source-health/bulk partial retry 계약을 검증합니다.
  verify-ops-channel-bulk
                 /ops/sources 대량 채널 복제/비활성화/상태 진단 UI hook을 검증합니다.
  verify-ops-event-records-scope
                 EventRecord가 짧은 증거 기록 범위로 노출되고 /ops/events UI가 이를 표시하는지 검증합니다.
  verify-fixture-cleanup-contracts
                 UI/Event 검증 fixture가 실행 후 복원/삭제 계약을 유지하는지 정적 검증합니다.
  verify-flaky-verifiers
                 access approval, rule preview, clipboard, route smoke verifier 안정화 guard를 검증합니다.
  verify-ops-evidence-retention-cleanup
                 Evidence retention cleanup job의 dry-run/apply/audit/report 계약을 검증합니다.
  verify-ops-audit-trail
                 /ops 채널/룰/사용자 UI 변경 이력 패널과 기록 hook을 검증합니다.
  verify-ops-audit-persistence
                 /ops/api/audit 서버 영속 감사 로그와 UI fallback hook을 검증합니다.
  verify-ops-diagnostics-bundle
                 운영 diagnostics bundle 생성물과 config preset 기준을 검증합니다.
  verify-ops-backup-recovery-guide
                 운영 백업/복구 가이드와 복구 후 검증 절차를 정적 검증합니다.
  verify-ops-backup-restore-dry-run
                 운영 백업/복구 절차를 임시 디렉터리에서 리허설합니다.
  verify-ops-root-cause-panel
                 /ops/dashboard 문제 원인 패널과 source/stale/reconnect/auth 해석 hook을 검증합니다.
  verify-client-dashboard-polish
                 /client/dashboard 다중 view 비교와 로딩/빈/오류 상태 문구를 검증합니다.
  verify-ui-copy-matrix
                 제품 UI empty/loading/error copy matrix와 구현 스니펫을 검증합니다.
  verify-ui-copy-i18n-parity
                 제품 UI 한국어/영어 문구 parity와 반복 UI translation pattern을 검증합니다.
  verify-docs-ui-assets
                 README/UI guide screenshot 자산과 자동 캡처 기준을 검증합니다.
  verify-manual-ui-evidence
                 수동 UI 검수 결과가 확인/미확인/건너뜀을 분리해 기록됐는지 검증합니다.
  verify-product-ui-no-native-dialogs
                 제품 UI가 alert/confirm/prompt native dialog로 자동 UI 검수를 멈추지 않는지 검증합니다.
  verify-ui-blocking-dialog-policy
                 제품/test UI blocking dialog 허용 기준과 fail-fast 정책을 검증합니다.
  verify-ui-fulltest-one-shot
                 throwaway seed/server와 UI 풀테스트 verifier 묶음을 한 번에 실행합니다.
  prepare-manual-ui-fulltest-seed
                 수동 UI 풀테스트용 VA seed fixture를 dry-run 검증하고, 명시 승인 시 throwaway 서버에 적용합니다.
  verify-docs-links
                 README/docs Markdown 링크와 이미지 파일 참조를 검증합니다.
  verify-v260-incident-memory-productization
                 v2.6.0 S01 VLM summary candidate의 Ops incident memory productization 경계를 검증합니다.
  verify-v260-rule-suggestion-review
                 v2.6.0 S02 Rule suggestion 후보의 incident-to-rule manual review/draft 연결 경계를 검증합니다.
  verify-v260-onvif-credential-gate
                 v2.6.0 S03 ONVIF credential binding/store gate와 redaction guard를 검증합니다.
  verify-v260-runtime-dashboard-trends
                 v2.6.0 S04 Runtime dashboard baseline/sparkline 후보와 비범위 경계를 검증합니다.
  verify-v260-scenario-cross-zone-reentry
                 v2.6.0 S05 ScenarioEngine cross-zone re-entry 후보와 schema 불변 경계를 검증합니다.
  verify-v260-owner-release-readiness
                 v2.6.0 S06 release readiness gate와 미실행/제외 경계를 검증합니다.
  verify-v270-incident-triage-board
                 v2.7.0 S01 Incident Triage Board view model/UI와 비범위 경계를 검증합니다.
  verify-v270-incident-decision-scorecard
                 v2.7.0 S02 Incident Decision Scorecard와 deterministic priority reason 경계를 검증합니다.
  verify-v270-operational-action-pack
                 v2.7.0 S03 Operational Action Pack과 기존 수동 workflow 연결 경계를 검증합니다.
  verify-v270-rule-what-if-preview
                 v2.7.0 S04 Rule What-if Preview와 draft-only/manual-save 경계를 검증합니다.
  verify-v270-operator-outcome-memory
                 v2.7.0 S05 Operator outcome memory와 review/audit history hint 경계를 검증합니다.
  verify-v270-owner-release-readiness
                 v2.7.0 S06 release readiness gate와 미실행/제외 경계를 검증합니다.
  verify-v280-incident-action-readiness-queue
                 v2.8.0 S02 Incident Action Readiness Queue와 external delivery/auto write 비범위 경계를 검증합니다.
  verify-v280-approval-gated-rule-draft
                 v2.8.0 S03 Approval-gated Rule Draft Readiness와 no-auto-save/no-auto-apply 경계를 검증합니다.
  verify-v280-evidence-intake-field-readiness
                 v2.8.0 S04 Evidence Intake and Field Readiness와 redaction/field smoke 비범위 경계를 검증합니다.
  verify-v280-runtime-evidence-window
                 v2.8.0 S05 Runtime Evidence Window와 bounded/no-longrun/no-archive 경계를 검증합니다.
  verify-v280-client-safe-followup-digest
                 v2.8.0 S06 Client-safe Follow-up Digest와 viewer redaction 경계를 검증합니다.
  verify-v280-owner-release-readiness
                 v2.8.0 S07 release readiness gate와 미실행/제외 경계를 검증합니다.
  verify-v290-final-contract-freeze
                 v2.9.0 S01 2.x final contract freeze 문서/검증 기준과 schema/media/auth/rule payload 불변 경계를 검증합니다.
  verify-v290-v28-regression-bundle
                 v2.9.0 S02 v2.8 기능군 verifier를 현재 source tree에서 재실행해 regression bundle을 검증합니다.
  verify-v290-2x-compatibility-baseline
                 v2.9.0 S03 v2.5~v2.8 핵심 compatibility verifier를 현재 source tree에서 재실행합니다.
  verify-v290-release-test-records-enforcement
                 v2.9.0 S04 release test records enforcement와 테스트 기록/미실행 경계를 검증합니다.
  verify-v290-ui-fulltest-criteria-freeze
                 v2.9.0 S05 UI 풀테스트 route/control/action/role/viewport/theme 기준 freeze를 검증합니다.
  verify-v290-release-evidence-hygiene
                 v2.9.0 S06 release evidence index/records/inventory/manual UI evidence 경계를 검증합니다.
  verify-v290-public-docs-assets-refresh
                 v2.9.0 S07 public README/docs index/UI asset refresh 경계를 검증합니다.
  verify-v290-final-stabilization-run
                 v2.9.0 S08 final stabilization run 결과와 미실행 경계를 검증합니다.
  verify-v290-owner-release-readiness
                 v2.9.0 S09 owner release readiness와 close-out 준비 경계를 검증합니다.
  verify-v300-entry-baseline
                 v3.0.0 S00 source baseline과 latest published v3.0.0 경계를 검증합니다.
  verify-v300-event-evidence-contract
                 v3.0.0 S01 Event Evidence Contract와 FrameRef/retention/non-VMS 경계를 검증합니다.
  verify-v300-feature-schema-privacy
                 v3.0.0 S03 Feature Schema and Privacy Policy와 identity/privacy 경계를 검증합니다.
  verify-v300-vlm-feature-queue
                 v3.0.0 S04 VLM Feature Queue와 VLM-only failure 경계를 검증합니다.
  verify-v300-feature-only-retention
                 v3.0.0 S05 Feature-only Retention과 raw prompt/response non-retention 경계를 검증합니다.
  verify-v300-search-dsl-query-convert
                 v3.0.0 S06 Search DSL and Query Convert와 text/tags/filter 경계를 검증합니다.
  verify-v300-feature-search-index
                 v3.0.0 S07 Feature/Search Index와 stale result guard 경계를 검증합니다.
  verify-v300-ops-events-ui
                 v3.0.0 S08 Ops Events UI와 evidence timeline/feature reason/retry/pin/retention UI 경계를 검증합니다.
  verify-v300-retention-pin-cleanup
                 v3.0.0 S09 Retention/Pin/Cleanup과 pin 제외/dry-run/audit 경계를 검증합니다.
  verify-v300-stabilization-release-readiness
                 v3.0.0 S10 Stabilization and Release Readiness와 local release gate 경계를 검증합니다.
  verify-v310-entry-baseline
                 v3.1.0 S00 source baseline과 latest published v3.0.0 경계를 검증합니다.
  verify-v310-event-clip-contract
                 v3.1.0 S01 Encoded Event Clip Contract와 FrameRef/PTS/non-VMS 경계를 검증합니다.
  verify-v310-replay-timeline-ui
                 v3.1.0 S03 Replay Timeline UI와 event frame/frame bundle/encoded clip timeline 경계를 검증합니다.
  verify-v310-client-safe-event-digest
                 v3.1.0 S04 Client-safe Event Digest와 viewer redaction 경계를 검증합니다.
  verify-v310-scoped-integrator-search-api
                 v3.1.0 S05 Scoped Integrator Search API와 integrator scope/redaction 경계를 검증합니다.
  verify-v310-operator-feature-correction
                 v3.1.0 S06 Operator Feature Correction과 alias/reanalysis request 경계를 검증합니다.
  verify-v310-optional-vector-search
                 v3.1.0 S07 Optional Vector Search의 default-off embedding index와 quality gate 경계를 검증합니다.
  verify-v310-retention-export-hardening
                 v3.1.0 S08 Retention/Export Hardening과 encoded clip cleanup/export/audit 경계를 검증합니다.
  verify-v320-entry-baseline
                 v3.2.0 Step 1 source baseline과 latest published v3.1.0 경계를 검증합니다.
  verify-v320-resolution-state-contract
                 v3.2.0 Step 2 Resolution State Contract와 close/reopen lifecycle 경계를 검증합니다.
  verify-v320-unified-ops-events-workspace
                 v3.2.0 Step 3 Unified Ops Events Workspace와 resolution queue/detail/timeline UI 경계를 검증합니다.
  verify-v320-evidence-quality-layer
                 v3.2.0 Step 4 Evidence Quality Layer와 completeness/confidence/replay coverage hint 경계를 검증합니다.
  verify-v320-source-reliability-context
                 v3.2.0 Step 5 Source Reliability Context와 source health/recent failure/recheck hint 경계를 검증합니다.
  verify-v320-source-reliability-runtime-sample
                 v3.2.0 Step 5 fixture EventRecord item의 sourceReliability 런타임 샘플을 검증합니다.
  verify-v320-ai-review-quality-context
                 v3.2.0 Step 6 AI Review Quality Context와 correction/review signal, uncertainty reason, quality badge 경계를 검증합니다.
  verify-v320-operator-resolution-flow
                 v3.2.0 Step 7 Operator Resolution Flow와 assign/note/close/reopen/audit 경계를 검증합니다.
  verify-v320-action-readiness-checklist
                 v3.2.0 Step 8 Action Readiness Checklist와 rule draft/evidence bundle/notification readiness 경계를 검증합니다.
  verify-v320-client-safe-resolution-digest
                 v3.2.0 Step 9 Client-safe Resolution Digest와 viewer redaction 경계를 검증합니다.
  verify-v320-resolution-search-metrics
                 v3.2.0 Step 10 Resolution Search & Metrics와 filter/saved view/metric summary 경계를 검증합니다.
  verify-v320-stabilization-release-readiness
                 v3.2.0 Step 11 Stabilization and Release Readiness와 local release gate 경계를 검증합니다.
  verify-v330-entry-baseline
                 v3.3.0 Step 1 source baseline과 latest published v3.2.0 경계를 검증합니다.
  verify-v330-source-registry-snapshot-identity
                 v3.3.0 Step 2 Source Registry Snapshot and Identity read model 경계를 검증합니다.
  verify-v330-source-onboarding-quality-summary
                 v3.3.0 Step 3 Source Onboarding Quality Summary API/UI 경계를 검증합니다.
  verify-v330-reliability-timeline-health-history
                 v3.3.0 Step 4 Reliability Timeline and Health History API/UI 경계를 검증합니다.
  verify-v330-incident-source-correlation-layer
                 v3.3.0 Step 5 Incident-to-Source Correlation Layer API/UI 경계를 검증합니다.
  verify-v330-operator-recheck-recovery-queue
                 v3.3.0 Step 6 Operator Recheck and Recovery Queue API/UI 경계를 검증합니다.
  verify-v330-client-safe-source-status-digest
                 v3.3.0 Step 7 Client-safe Source Status Digest와 viewer redaction 경계를 검증합니다.
  verify-v330-operator-runbook-reliability-handoff
                 v3.3.0 Step 8 Operator Runbook and Reliability Handoff 문서 연결 경계를 검증합니다.
  verify-v330-source-reliability-search-metrics
                 v3.3.0 Step 9 Source Reliability Search and Metrics API/UI 경계를 검증합니다.
  verify-v330-ops-backup-recovery-source-handoff
                 v3.3.0 Step 10 Ops Backup and Recovery Source Handoff API/UI 경계를 검증합니다.
  verify-v330-stabilization-release-readiness
                 v3.3.0 Step 11 Stabilization and Release Readiness와 local release gate 경계를 검증합니다.
  verify-v340-entry-baseline
                 v3.4.0 Step 1 source baseline과 latest published v3.3.0 경계를 검증합니다.
  verify-v340-continuity-drill-contract
                 v3.4.0 Step 2 Continuity Drill Contract read-only/no-write 경계를 검증합니다.
  verify-v340-recovery-candidate-package
                 v3.4.0 Step 3 Recovery Candidate Package redacted read model 경계를 검증합니다.
  verify-v340-staging-restore-validation-harness
                 v3.4.0 Step 4 Staging Restore Validation Harness temporary-only 경계를 검증합니다.
  verify-v340-source-health-replay-drift-diff
                 v3.4.0 Step 5 Source Health Replay and Drift Diff read-only 경계를 검증합니다.
  verify-v340-ops-continuity-drill-workspace-ui
                 v3.4.0 Step 6 Ops Continuity Drill Workspace UI read-only 경계를 검증합니다.
  verify-v340-approval-gated-recovery-checklist-audit
                 v3.4.0 Step 7 Approval-Gated Recovery Checklist and Audit no-auto-recovery 경계를 검증합니다.
  verify-v340-client-safe-maintenance-digest
                 v3.4.0 Step 8 Client-safe Maintenance Digest redaction 경계를 검증합니다.
  verify-v340-drill-evidence-export-cleanup-manifest
                 v3.4.0 Step 9 Drill Evidence Export and Cleanup Manifest 경계를 검증합니다.
  verify-v340-field-bridge-condition-gates
                 v3.4.0 Step 10 Field Bridge Condition Gates 조건부 field smoke 경계를 검증합니다.
  verify-v340-stabilization-release-readiness
                 v3.4.0 Step 11 Stabilization and Release Readiness local gate 경계를 검증합니다.
  verify-v350-entry-baseline
                 v3.5.0 Step 1 source baseline과 latest published v3.4.0 경계를 검증합니다.
  verify-v350-live-operations-graph-contract
                 v3.5.0 Step 2 Live Operations Graph Contract read-only 경계를 검증합니다.
  verify-v350-operations-command-plan-contract
                 v3.5.0 Step 3 Operations Command Plan Contract draft-only 경계를 검증합니다.
  verify-v350-incident-to-command-handoff
                 v3.5.0 Step 4 Incident-to-Command Handoff selected detail 경계를 검증합니다.
  verify-v350-staged-change-plan-impact-preview
                 v3.5.0 Step 5 Staged Change Plan and Impact Preview staging-only 경계를 검증합니다.
  verify-v350-ops-command-workspace-ui
                 v3.5.0 Step 6 Ops Command Workspace UI read-only 경계를 검증합니다.
  verify-v350-drill-run-ledger-plan-comparison
                 v3.5.0 Step 7 Drill Run Ledger and Plan Comparison read-only 경계를 검증합니다.
  verify-v350-client-impact-forecast
                 v3.5.0 Step 8 Client Impact Forecast viewer-safe 경계를 검증합니다.
  verify-v350-client-safe-operations-notice
                 v3.5.0 Step 9 Client-safe Operations Notice viewer-safe 경계를 검증합니다.
  verify-v350-operations-export-bundle-handoff-map
                 v3.5.0 Step 10 Operations Export Bundle and Handoff Map release-safe 경계를 검증합니다.
  verify-v350-field-evidence-intake
                 v3.5.0 Step 11 Field Evidence Intake redacted/not-run 경계를 검증합니다.
  verify-v350-vlm-assisted-ops-explanation
                 v3.5.0 Step 12 VLM-assisted Ops Explanation default-off 경계를 검증합니다.
  verify-v350-stabilization-release-readiness
                 v3.5.0 Step 13 Stabilization and Release Readiness local gate 경계를 검증합니다.
  verify-v370-entry-baseline
                 v3.7.0 Step 1 source baseline과 latest published v3.6.0 경계를 검증합니다.
  verify-v370-site-source-group-contract
                 v3.7.0 Step 2 Site / Source Group Contract read-only 경계를 검증합니다.
  verify-v370-site-aware-source-registry-projection
                 v3.7.0 Step 3 Site-Aware Source Registry Projection read-only 경계를 검증합니다.
  verify-v370-site-health-rollup
                 v3.7.0 Step 4 Site Health Rollup read-only 경계를 검증합니다.
  verify-v370-site-impact-graph
                 v3.7.0 Step 5 Site Impact Graph read-only 경계를 검증합니다.
  verify-v370-site-simulation-input-pack
                 v3.7.0 Step 6 Site Simulation Input Pack read-only 경계를 검증합니다.
  verify-v370-cross-site-safe-apply-readiness
                 v3.7.0 Step 7 Cross-Site Safe Apply Readiness read-only 경계를 검증합니다.
  verify-v370-runbook-template-contract
                 v3.7.0 Step 8 Runbook Template Contract read-only 경계를 검증합니다.
  verify-v370-runbook-instance-ledger
                 v3.7.0 Step 9 Runbook Instance Ledger append-only/read-only 경계를 검증합니다.
  verify-v370-approval-ticket-workflow
                 v3.7.0 Step 10 Approval Ticket Workflow read-only 경계를 검증합니다.
  verify-v370-site-operations-workspace-ui
                 v3.7.0 Step 11 Site Operations Workspace UI read-only 경계를 검증합니다.
  verify-v370-client-notice-by-site-view-group
                 v3.7.0 Step 12 Client Notice by Site/View Group preview-only 경계를 검증합니다.
  verify-v370-rule-va-what-if-by-site
                 v3.7.0 Step 13 Rule/VA What-if by Site no-apply 경계를 검증합니다.
  verify-v370-field-evidence-attachment
                 v3.7.0 Step 14 Field Evidence Attachment conditional/not-run 경계를 검증합니다.
  verify-v370-limited-safe-execution-pilot
                 v3.7.0 Step 15 Limited Safe Execution Pilot approval-gated preview 경계를 검증합니다.
  verify-v360-entry-baseline
                 v3.6.0 Step 1 source baseline과 latest published v3.6.0 경계를 검증합니다.
  verify-v360-simulation-input-contract
                 v3.6.0 Step 2 Simulation Input Contract read-only 경계를 검증합니다.
  verify-v360-operations-simulation-run-contract
                 v3.6.0 Step 3 Operations Simulation Run Contract not-run 경계를 검증합니다.
  verify-v360-command-plan-dry-run-simulator
                 v3.6.0 Step 4 Command Plan Dry-run Simulator no-write 경계를 검증합니다.
  verify-v360-source-rule-impact-diff
                 v3.6.0 Step 5 Source/Rule Impact Diff read-only 경계를 검증합니다.
  verify-v360-safe-apply-readiness-gate
                 v3.6.0 Step 6 Safe Apply Readiness Gate no-auto-apply 경계를 검증합니다.
  verify-v360-ops-simulation-workspace-ui
                 v3.6.0 Step 7 Ops Simulation Workspace UI read-only 경계를 검증합니다.
  verify-v360-simulation-run-ledger-comparison
                 v3.6.0 Step 8 Simulation Run Ledger and Comparison read-only 경계를 검증합니다.
  verify-v360-client-notice-preview
                 v3.6.0 Step 9 Client Notice Preview preview-only 경계를 검증합니다.
  verify-v360-rule-va-what-if-replay-pack
                 v3.6.0 Step 10 Rule/VA What-if Replay Pack read-only 경계를 검증합니다.
  verify-v360-simulation-export-bundle
                 v3.6.0 Step 11 Simulation Export Bundle release-safe 경계를 검증합니다.
  verify-v360-field-evidence-simulation-adapter
                 v3.6.0 Step 12 Field Evidence Simulation Adapter not-run 경계를 검증합니다.
  verify-v360-vlm-assisted-simulation-explanation
                 v3.6.0 Step 13 VLM-assisted Simulation Explanation default-off 경계를 검증합니다.
  verify-v360-stabilization-release-readiness
                 v3.6.0 Step 14 Stabilization and Release Readiness local gate 경계를 검증합니다.
  verify-onvif-live-import-contract
                 카메라 없이 ONVIF live import fixture가 내부 import draft 계약을 지키는지 검증합니다.
  verify-onvif-protocol-support-matrix
                 ONVIF protocol/service 지원/비지원 matrix와 구현 기준을 검증합니다.
  verify-onvif-rtsps-draft-policy
                 ONVIF rtsps:// 후보와 automatic draft 저장 계약을 검증합니다.
  verify-onvif-https-soap-transport-design
                 ONVIF HTTPS SOAP transport 향후 설계와 현재 fail-closed 경계를 검증합니다.
  verify-onvif-https-tls-fixture
                 ONVIF HTTPS TLS fixture harness command skeleton의 design-only skip 경계를 검증합니다.
  verify-onvif-auth-injection-design
                 ONVIF 인증 주입 향후 설계와 현재 credential reference-only 경계를 검증합니다.
  verify-onvif-auth-injection-loopback
                 ONVIF credential reference가 있어도 인증 material이 주입되지 않는 loopback 경계를 검증합니다.
  verify-onvif-ws-discovery-ux
                 ONVIF WS-Discovery 비지원 Ops UX 문구와 문서 경계를 검증합니다.
  verify-onvif-unsupported-api-guard
                 ONVIF PTZ/Events/Profile G 등 비지원 API route 경계를 검증합니다.
  verify-onvif-probe-fixture-contract
                 ONVIF field probe fixture가 내부 probe-to-draft 계약을 지키는지 검증합니다.
  verify-onvif-probe-profile-variants
                 ONVIF Media/Media2 profile selection fixture variant를 검증합니다.
  verify-onvif-synthetic-vendor-fixtures
                 ONVIF vendor-style 합성 fixture pack을 실장비 없이 검증합니다.
  verify-onvif-probe-parser
                 ONVIF SOAP service/profile/stream URI parser 단위 smoke를 검증합니다.
  verify-onvif-probe-adapter
                 ONVIF probe action 순서와 실패 요약 redaction 단위 smoke를 검증합니다.
  verify-onvif-probe-error-wording
                 ONVIF probe 실패 문구 fixture matrix와 redaction을 검증합니다.
  verify-onvif-soap-fault-matrix
                 ONVIF SOAP Fault/malformed response matrix와 redaction을 검증합니다.
  verify-onvif-no-device-suite
                 ONVIF 실장비 제외 fixture/loopback/redaction 검증 묶음을 순차 실행합니다.
  verify-onvif-no-device-mode
                 ONVIF 실장비 제외 검증 모드의 문서/명령/옵션 경계를 검증합니다.
  verify-onvif-no-device-completion
                 ONVIF 실장비 제외 조건의 종료 판정과 별도 후속 범위 분리를 검증합니다.
  verify-onvif-field-smoke-redaction
                 ONVIF 현장 smoke 산출물 redaction checklist를 검증합니다.
  verify-onvif-field-smoke-gate
                 ONVIF 현장 smoke gate 절차와 report/review 상태 분리를 검증합니다.
  verify-onvif-field-http-probe
                 실제 ONVIF HTTP endpoint probe harness와 sanitized 산출물을 검증합니다.
  verify-onvif-closed-loopback-failure-matrix
                 ONVIF 닫힌 loopback endpoint 실패 matrix와 redaction을 검증합니다.
  verify-onvif-tls-transport-policy
                 ONVIF HTTPS/TLS fail-closed transport 정책을 검증합니다.
  verify-onvif-credential-reference-policy
                 ONVIF credential reference 원문 미저장 정책을 검증합니다.
  verify-onvif-field-smoke-sample-bundle
                 ONVIF 현장 smoke 산출물 sample bundle redaction을 검증합니다.
  verify-onvif-http-transport
                 ONVIF HTTP SOAP transport가 실제 POST/응답 수신을 수행하는지 검증합니다.
  verify-onvif-local-simulator
                 실장비 대신 로컬 ONVIF simulator fixture로 HTTP SOAP probe 성공 경로를 검증합니다.
  verify-onvif-probe-draft-api
                 실행 중인 서버가 ONVIF probe fixture를 source/view draft로 변환하는지 검증합니다.
  verify-onvif-import-draft-api
                 실행 중인 서버의 ONVIF import draft API가 fixture를 source/view draft로 변환하는지 검증합니다.
  verify-onvif-rtsp-downstream
                 ONVIF import draft의 공개 RTSP URL이 기존 source/view/client redaction 경로를 통과하는지 검증합니다.
  verify-onvif-ops-sources-ui
                 /ops/sources ONVIF import UI가 source/view 저장 round-trip까지 연결되는지 검증합니다.

일반 정적/release 검증 명령:
  verify-code-comments
                 코드/스크립트 상단 용도 주석과 한글 주석 정책을 검증합니다.
  verify-release-metadata
                 VERSION, CMake, README, release/versioning/backlog 문서의 release 기준 drift를 검증합니다.
  verify-release-evidence-index
                 release evidence index가 실행/미실행/미확인 항목을 분리하는지 검증합니다.
  verify-v190-entry-baseline
                 v1.9.0 종료와 v2.0.0 진입 baseline report 구획을 검증합니다.
  verify-v210-entry-baseline
                 v2.0.0 published evidence를 v2.1.0 진입 baseline으로 고정합니다.
  verify-v220-entry-boundary
                 v2.2.0 responsive UI foundation 진입 경계와 변경 금지 contract를 검증합니다.
  verify-v230-entry-baseline
                 v2.3.0 operational evidence baseline과 4대 테스트 영역 유지 계약을 검증합니다.
  verify-v230-test-evidence-consistency
                 v2.3.0 S02 4대 테스트 evidence 정합성과 미실행/제외 기록 경계를 검증합니다.
  verify-v230-ui-renderer-module-decomposition
                 v2.3.0 S03 UI renderer/module decomposition 산출물과 계약 경계를 검증합니다.
  verify-v230-conditional-field-evidence
                 v2.3.0 S04 조건부 ONVIF/external TURN/WHEP field evidence gate를 검증합니다.
  verify-v230-ops-backup-recovery-lifecycle
                 v2.3.0 S06 Ops backup/recovery evidence lifecycle gate를 검증합니다.
  verify-v220-ui-architecture-inventory
                 v2.2.0 UI architecture inventory와 S01 roadmap 연결을 검증합니다.
  verify-v220-responsive-task-shell
                 v2.2.0 responsive task shell 계약과 S02 roadmap 연결을 검증합니다.
  verify-feature-scope-gate
                 v1.8.0 안정화 범위에서 새 기능 후보를 구현으로 승격하지 않는 decision gate를 검증합니다.
  verify-script-inventory
                 server.sh 명령, 문서 명령 참조, JS 옵션 검증 적용 범위를 점검합니다.
  verify-project-inventory
                 코드 기능/UI 접근 기능/검증 명령 inventory 문서가 현재 command/route 범위를 덮는지 점검합니다.
  verify-feature-inventory-coverage
                 기능 ID가 verifier/UI evidence/장시간 승인/field exclusion 중 하나에 연결됐는지 점검합니다.
  verify-v300-entry-baseline
                 v3.0.0 S00 source baseline과 latest published v3.0.0 경계를 검증합니다.
  verify-v300-event-evidence-contract
                 v3.0.0 S01 Event Evidence Contract와 FrameRef/retention/non-VMS 경계를 검증합니다.
  verify-v300-feature-schema-privacy
                 v3.0.0 S03 Feature Schema and Privacy Policy와 identity/privacy 경계를 검증합니다.
  verify-v300-vlm-feature-queue
                 v3.0.0 S04 VLM Feature Queue와 VLM-only failure 경계를 검증합니다.
  verify-v300-feature-only-retention
                 v3.0.0 S05 Feature-only Retention과 raw prompt/response non-retention 경계를 검증합니다.
  verify-v300-search-dsl-query-convert
                 v3.0.0 S06 Search DSL and Query Convert와 text/tags/filter 경계를 검증합니다.
  verify-v300-feature-search-index
                 v3.0.0 S07 Feature/Search Index와 stale result guard 경계를 검증합니다.
  verify-v300-ops-events-ui
                 v3.0.0 S08 Ops Events UI와 evidence timeline/feature reason/retry/pin/retention UI 경계를 검증합니다.
  verify-v300-retention-pin-cleanup
                 v3.0.0 S09 Retention/Pin/Cleanup과 pin 제외/dry-run/audit 경계를 검증합니다.
  verify-v300-stabilization-release-readiness
                 v3.0.0 S10 Stabilization and Release Readiness와 local release gate 경계를 검증합니다.
  verify-v310-entry-baseline
                 v3.1.0 S00 source baseline과 latest published v3.0.0 경계를 검증합니다.
  verify-v310-event-clip-contract
                 v3.1.0 S01 Encoded Event Clip Contract와 FrameRef/PTS/non-VMS 경계를 검증합니다.
  verify-v310-replay-timeline-ui
                 v3.1.0 S03 Replay Timeline UI와 event frame/frame bundle/encoded clip timeline 경계를 검증합니다.
  verify-v310-client-safe-event-digest
                 v3.1.0 S04 Client-safe Event Digest와 viewer redaction 경계를 검증합니다.
  verify-v310-scoped-integrator-search-api
                 v3.1.0 S05 Scoped Integrator Search API와 integrator scope/redaction 경계를 검증합니다.
  verify-v310-operator-feature-correction
                 v3.1.0 S06 Operator Feature Correction과 alias/reanalysis request 경계를 검증합니다.
  verify-v310-optional-vector-search
                 v3.1.0 S07 Optional Vector Search의 default-off embedding index와 quality gate 경계를 검증합니다.
  verify-v310-retention-export-hardening
                 v3.1.0 S08 Retention/Export Hardening과 encoded clip cleanup/export/audit 경계를 검증합니다.
  verify-v310-stabilization-release-readiness
                 v3.1.0 S09 Stabilization and Release Readiness와 local release gate 경계를 검증합니다.
  verify-v320-entry-baseline
                 v3.2.0 Step 1 source baseline과 latest published v3.1.0 경계를 검증합니다.
  verify-v320-resolution-state-contract
                 v3.2.0 Step 2 Resolution State Contract와 close/reopen lifecycle 경계를 검증합니다.
  verify-v320-unified-ops-events-workspace
                 v3.2.0 Step 3 Unified Ops Events Workspace와 resolution queue/detail/timeline UI 경계를 검증합니다.
  verify-v320-evidence-quality-layer
                 v3.2.0 Step 4 Evidence Quality Layer와 completeness/confidence/replay coverage hint 경계를 검증합니다.
  verify-v320-source-reliability-context
                 v3.2.0 Step 5 Source Reliability Context와 source health/recent failure/recheck hint 경계를 검증합니다.
  verify-v320-source-reliability-runtime-sample
                 v3.2.0 Step 5 fixture EventRecord item의 sourceReliability 런타임 샘플을 검증합니다.
  verify-v320-ai-review-quality-context
                 v3.2.0 Step 6 AI Review Quality Context와 correction/review signal, uncertainty reason, quality badge 경계를 검증합니다.
  verify-v320-operator-resolution-flow
                 v3.2.0 Step 7 Operator Resolution Flow와 assign/note/close/reopen/audit 경계를 검증합니다.
  verify-v320-action-readiness-checklist
                 v3.2.0 Step 8 Action Readiness Checklist와 rule draft/evidence bundle/notification readiness 경계를 검증합니다.
  verify-v320-client-safe-resolution-digest
                 v3.2.0 Step 9 Client-safe Resolution Digest와 viewer redaction 경계를 검증합니다.
  verify-v320-stabilization-release-readiness
                 v3.2.0 Step 11 Stabilization and Release Readiness와 local release gate 경계를 검증합니다.
  verify-v330-entry-baseline
                 v3.3.0 Step 1 source baseline과 latest published v3.2.0 경계를 검증합니다.
  verify-v330-source-registry-snapshot-identity
                 v3.3.0 Step 2 Source Registry Snapshot and Identity read model 경계를 검증합니다.
  verify-v330-source-onboarding-quality-summary
                 v3.3.0 Step 3 Source Onboarding Quality Summary API/UI 경계를 검증합니다.
  verify-v330-reliability-timeline-health-history
                 v3.3.0 Step 4 Reliability Timeline and Health History API/UI 경계를 검증합니다.
  verify-v330-incident-source-correlation-layer
                 v3.3.0 Step 5 Incident-to-Source Correlation Layer API/UI 경계를 검증합니다.
  verify-v330-operator-recheck-recovery-queue
                 v3.3.0 Step 6 Operator Recheck and Recovery Queue API/UI 경계를 검증합니다.
  verify-v330-client-safe-source-status-digest
                 v3.3.0 Step 7 Client-safe Source Status Digest와 viewer redaction 경계를 검증합니다.
  verify-v330-operator-runbook-reliability-handoff
                 v3.3.0 Step 8 Operator Runbook and Reliability Handoff 문서 연결 경계를 검증합니다.
  verify-v330-source-reliability-search-metrics
                 v3.3.0 Step 9 Source Reliability Search and Metrics API/UI 경계를 검증합니다.
  verify-v330-ops-backup-recovery-source-handoff
                 v3.3.0 Step 10 Ops Backup and Recovery Source Handoff API/UI 경계를 검증합니다.
  verify-v340-entry-baseline
                 v3.4.0 Step 1 source baseline과 latest published v3.3.0 경계를 검증합니다.
  verify-v340-continuity-drill-contract
                 v3.4.0 Step 2 Continuity Drill Contract read-only/no-write 경계를 검증합니다.
  verify-v340-recovery-candidate-package
                 v3.4.0 Step 3 Recovery Candidate Package redacted read model 경계를 검증합니다.
  verify-v340-staging-restore-validation-harness
                 v3.4.0 Step 4 Staging Restore Validation Harness temporary-only 경계를 검증합니다.
  verify-v340-source-health-replay-drift-diff
                 v3.4.0 Step 5 Source Health Replay and Drift Diff read-only 경계를 검증합니다.
  verify-v340-ops-continuity-drill-workspace-ui
                 v3.4.0 Step 6 Ops Continuity Drill Workspace UI read-only 경계를 검증합니다.
  verify-v340-approval-gated-recovery-checklist-audit
                 v3.4.0 Step 7 Approval-Gated Recovery Checklist and Audit no-auto-recovery 경계를 검증합니다.
  verify-v340-client-safe-maintenance-digest
                 v3.4.0 Step 8 Client-safe Maintenance Digest redaction 경계를 검증합니다.
  verify-v340-drill-evidence-export-cleanup-manifest
                 v3.4.0 Step 9 Drill Evidence Export and Cleanup Manifest 경계를 검증합니다.
  verify-v340-field-bridge-condition-gates
                 v3.4.0 Step 10 Field Bridge Condition Gates 조건부 field smoke 경계를 검증합니다.
  verify-v340-stabilization-release-readiness
                 v3.4.0 Step 11 Stabilization and Release Readiness local gate 경계를 검증합니다.
  verify-v350-entry-baseline
                 v3.5.0 Step 1 source baseline과 latest published v3.4.0 경계를 검증합니다.
  verify-v350-live-operations-graph-contract
                 v3.5.0 Step 2 Live Operations Graph Contract read-only 경계를 검증합니다.
  verify-v350-operations-command-plan-contract
                 v3.5.0 Step 3 Operations Command Plan Contract draft-only 경계를 검증합니다.
  verify-v350-incident-to-command-handoff
                 v3.5.0 Step 4 Incident-to-Command Handoff selected detail 경계를 검증합니다.
  verify-v350-staged-change-plan-impact-preview
                 v3.5.0 Step 5 Staged Change Plan and Impact Preview staging-only 경계를 검증합니다.
  verify-v350-ops-command-workspace-ui
                 v3.5.0 Step 6 Ops Command Workspace UI read-only 경계를 검증합니다.
  verify-v350-drill-run-ledger-plan-comparison
                 v3.5.0 Step 7 Drill Run Ledger and Plan Comparison read-only 경계를 검증합니다.
  verify-v350-client-impact-forecast
                 v3.5.0 Step 8 Client Impact Forecast viewer-safe 경계를 검증합니다.
  verify-v350-stabilization-release-readiness
                 v3.5.0 Step 13 Stabilization and Release Readiness local gate 경계를 검증합니다.
  verify-v370-entry-baseline
                 v3.7.0 Step 1 source baseline과 latest published v3.6.0 경계를 검증합니다.
  verify-v370-site-source-group-contract
                 v3.7.0 Step 2 Site / Source Group Contract read-only 경계를 검증합니다.
  verify-v370-site-aware-source-registry-projection
                 v3.7.0 Step 3 Site-Aware Source Registry Projection read-only 경계를 검증합니다.
  verify-v370-site-health-rollup
                 v3.7.0 Step 4 Site Health Rollup read-only 경계를 검증합니다.
  verify-v370-site-impact-graph
                 v3.7.0 Step 5 Site Impact Graph read-only 경계를 검증합니다.
  verify-v370-site-simulation-input-pack
                 v3.7.0 Step 6 Site Simulation Input Pack read-only 경계를 검증합니다.
  verify-v370-cross-site-safe-apply-readiness
                 v3.7.0 Step 7 Cross-Site Safe Apply Readiness read-only 경계를 검증합니다.
  verify-v370-runbook-template-contract
                 v3.7.0 Step 8 Runbook Template Contract read-only 경계를 검증합니다.
  verify-v370-runbook-instance-ledger
                 v3.7.0 Step 9 Runbook Instance Ledger append-only/read-only 경계를 검증합니다.
  verify-v370-approval-ticket-workflow
                 v3.7.0 Step 10 Approval Ticket Workflow read-only 경계를 검증합니다.
  verify-v370-site-operations-workspace-ui
                 v3.7.0 Step 11 Site Operations Workspace UI read-only 경계를 검증합니다.
  verify-v370-client-notice-by-site-view-group
                 v3.7.0 Step 12 Client Notice by Site/View Group preview-only 경계를 검증합니다.
  verify-v370-rule-va-what-if-by-site
                 v3.7.0 Step 13 Rule/VA What-if by Site no-apply 경계를 검증합니다.
  verify-v370-field-evidence-attachment
                 v3.7.0 Step 14 Field Evidence Attachment conditional/not-run 경계를 검증합니다.
  verify-v370-limited-safe-execution-pilot
                 v3.7.0 Step 15 Limited Safe Execution Pilot approval-gated preview 경계를 검증합니다.
  verify-v360-entry-baseline
                 v3.6.0 Step 1 source baseline과 latest published v3.6.0 경계를 검증합니다.
  verify-v360-simulation-input-contract
                 v3.6.0 Step 2 Simulation Input Contract read-only 경계를 검증합니다.
  verify-v360-operations-simulation-run-contract
                 v3.6.0 Step 3 Operations Simulation Run Contract not-run 경계를 검증합니다.
  verify-v360-command-plan-dry-run-simulator
                 v3.6.0 Step 4 Command Plan Dry-run Simulator no-write 경계를 검증합니다.
  verify-v360-source-rule-impact-diff
                 v3.6.0 Step 5 Source/Rule Impact Diff read-only 경계를 검증합니다.
  verify-v360-safe-apply-readiness-gate
                 v3.6.0 Step 6 Safe Apply Readiness Gate no-auto-apply 경계를 검증합니다.
  verify-v360-ops-simulation-workspace-ui
                 v3.6.0 Step 7 Ops Simulation Workspace UI read-only 경계를 검증합니다.
  verify-v360-simulation-run-ledger-comparison
                 v3.6.0 Step 8 Simulation Run Ledger and Comparison read-only 경계를 검증합니다.
  verify-v360-client-notice-preview
                 v3.6.0 Step 9 Client Notice Preview preview-only 경계를 검증합니다.
  verify-v360-rule-va-what-if-replay-pack
                 v3.6.0 Step 10 Rule/VA What-if Replay Pack read-only 경계를 검증합니다.
  verify-v360-simulation-export-bundle
                 v3.6.0 Step 11 Simulation Export Bundle release-safe 경계를 검증합니다.
  verify-v360-field-evidence-simulation-adapter
                 v3.6.0 Step 12 Field Evidence Simulation Adapter not-run 경계를 검증합니다.
  verify-v360-vlm-assisted-simulation-explanation
                 v3.6.0 Step 13 VLM-assisted Simulation Explanation default-off 경계를 검증합니다.
  verify-v360-stabilization-release-readiness
                 v3.6.0 Step 14 Stabilization and Release Readiness local gate 경계를 검증합니다.
  verify-actions-security
                 GitHub Actions workflow 권한과 action 사용 정책을 검증합니다.
  verify-ci-local-gate-parity
                 로컬 verifier와 GitHub Actions static/guardrail gate 매핑을 검증합니다.
  verify-public-repo-readiness
                 public 전환 전 secret/history/asset/문서 준비 상태를 검증합니다.
  verify-post-release-reconciliation
                 post-release smoke 기록이 통과/미실행/미확인을 분리하는지 검증합니다.
  verify-release-closeout-helper
                 release close-out 전 로컬 검증, visual baseline readiness, 수동 tag/push 경계를 dry-run으로 요약합니다.
  verify-client-action-reduction
                 Client Live 버튼/CTA 축소 baseline과 UI smoke 연결을 검증합니다.
  verify-client-live-workspace
                 Client Live source tree/drag-drop workspace 계약을 검증합니다.
  verify-client-source-dock-events
                 Client Live source tree/dock event feed redaction 계약을 검증합니다.
  verify-client-tile-disconnect
                 Client Live tile/workspace disconnect 계약을 검증합니다.
  verify-ops-event-review-inbox
                 Rule Event Review Inbox의 별도 review state/audit/redaction 계약을 검증합니다.
  verify-ops-event-action-incident-workflow
                 Event Action/Incident Workflow의 Ops-only state/audit/UI 계약을 검증합니다.
  verify-ops-alert-delivery-integrations
                 Alert Delivery Integration의 payload 분리/retry/audit 계약을 검증합니다.
  verify-v240-ops-event-route-owner-decomposition
                 v2.4.0 S06 Ops Events/action/client summary/alert dry-run route owner 분리를 검증합니다.
  verify-v240-evidence-inventory-mapping
                 v2.4.0 S07 feature inventory/manual UI/release evidence 매핑을 검증합니다.
  verify-v240-release-readiness-gate
                 v2.4.0 S08 release metadata/docs/assets/CI parity/close-out dry-run evidence를 검증합니다.
  verify-v250-incident-text-projection
                 v2.5.0 Event/incident text projection과 redaction guard를 검증합니다.
  verify-v250-incident-memory-index
                 v2.5.0 Local incident memory index의 SQLite FTS5 primary/JSONL BM25 fallback을 검증합니다.
  verify-v250-ops-events-semantic-search-ui
                 v2.5.0 /ops/events semantic search UI와 Ops-only search view model을 검증합니다.
  verify-v250-incident-timeline-graph
                 v2.5.0 incident timeline graph와 action/audit linkage를 검증합니다.
  verify-v250-explainable-incident-brief
                 v2.5.0 explainable incident brief와 VLM default-off 경계를 검증합니다.
  verify-v250-similar-incident-lookup
                 v2.5.0 similar incident lookup과 deterministic scoring/redaction 경계를 검증합니다.
  verify-v250-client-safe-incident-digest
                 v2.5.0 client-safe incident digest와 viewer redaction 경계를 검증합니다.
  verify-v250-redacted-incident-evidence-bundle
                 v2.5.0 redacted incident evidence bundle과 release-safe export 경계를 검증합니다.
  verify-v250-owner-release-readiness
                 v2.5.0 owner decomposition/release readiness gate를 검증합니다.
  verify-ops-scenario-builder-ui
                 Scenario Builder UI의 Event Rule 폼 적용과 engine 비변경 계약을 검증합니다.
  verify-ops-client-shared-declutter
                 Ops/Client shared action declutter와 context action 계약을 검증합니다.
  verify-ops-source-group-site-management
                 Source Group/Site Management의 registry/API/UI/scope 계약을 검증합니다.
  verify-client-tile-info-overlay-health
                 Client Live tile info overlay와 playback health UI 계약을 검증합니다.
  verify-client-saved-views-layout-presets
                 Saved Views/Layout Presets preference API와 UI 계약을 검증합니다.
  verify-ops-operator-incident-timeline
                 Operator Incident Timeline workflow/UI 계약을 검증합니다.
  verify-server-start-modes
                 foreground/start 실행 모드의 health, route, state file 안정성을 검증합니다.
  verify-auth-bootstrap
                 최초 setup, admin password policy, login/logout/session을 검증합니다.
  verify-auth-users
                 admin 계정 관리, viewer scope 제한, lockout, invite/request를 검증합니다.
  verify-auth-routes
                 root/login/ops/client와 Lab API role 기반 route 정책을 검증합니다.
  verify-auth-ui-smoke
                 실행 중인 auth shell 페이지의 selector와 선택 visual smoke를 검증합니다.
  verify-auth-scope-picker
                 실행 중인 /ops/users 권한 범위 템플릿 UI를 admin 세션으로 검증합니다.
  verify-auth-regression-matrix
                 Auth/session/scope regression matrix와 verifier coverage를 검증합니다.
  verify-vlm-boundary
                 v2.0.0 VLM 도입 경계와 기존 event/metadata/media contract 불변 조건을 검증합니다.
  verify-vlm-selection-decision
                 v2.0.0 VLM 모델 선택값, fallback, license/privacy/bundle gate를 검증합니다.
  detect-vlm-pc-capability
                 v2.0.0 VLM PC 사양 감지 정보를 local-only JSON으로 수집합니다.
  verify-vlm-pc-capability
                 v2.0.0 VLM PC 사양 감지 detector와 fixture matrix를 검증합니다.
  recommend-vlm-model
                 v2.0.0 VLM 추천 모델/대안/비추천 사유와 resource estimate를 산출합니다.
  verify-vlm-recommendation-engine
                 v2.0.0 VLM 추천 엔진과 low/standard/high/privacy fixture matrix를 검증합니다.
  verify-vlm-install-connection-scope-gate
                 v2.0.0 VLM 설치/연결 UI 착수 범위 gate를 검증합니다.
  vlm-install-connection-dry-run
                 v2.0.0 VLM 설치/연결 dry-run contract JSON을 산출합니다.
  verify-vlm-install-connection-dry-run
                 v2.0.0 VLM 설치/연결 dry-run contract와 fixture matrix를 검증합니다.
  verify-vlm-install-connection-ui
                 v2.0.0 VLM 설치/연결 Ops UI와 dry-run API 경계를 검증합니다.
  verify-vlm-profile-storage
                 v2.0.0 VLM profile 저장 API/UI/fixture/auth 경계를 검증합니다.
  verify-vlm-runtime-opt-in-contract
                 v2.1.0 VLM runtime opt-in 상태와 default-off 계약을 검증합니다.
  verify-vlm-local-runtime-smoke
                 v2.1.0 Local VLM runtime connection smoke의 loopback endpoint/timeout/cleanup/fallback을 검증합니다.
  verify-vlm-cloud-provider-field-smoke-gate
                 v2.1.0 Cloud provider field smoke gate의 승인/credential/redaction/PASS 분리 기준을 검증합니다.
  verify-v230-vlm-opt-in-operational-evidence
                 v2.3.0 VLM opt-in operational evidence와 default-off/provider-not-run 경계를 검증합니다.
  verify-vlm-queue-backpressure-stability
                 v2.1.0 VLM queue/backpressure가 media/Event/metadata/Event POST 경로를 막지 않는지 검증합니다.
  verify-vlm-runtime-status-ui
                 v2.1.0 Ops VLM runtime status UI와 viewer/client 비노출 경계를 검증합니다.
  verify-vlm-evaluation-result-workflow
                 v2.1.0 VLM evaluation result workflow의 Ops 선택/profile draft 경계를 검증합니다.
  verify-vlm-review-action-workflow
                 v2.1.0 VLM review action workflow의 Ops review state/API/UI 경계를 검증합니다.
  verify-vlm-rule-suggestion-draft-workflow
                 v2.1.0 VLM rule suggestion 후보를 /ops/rules draft/manual save로만 가져가는지 검증합니다.
  evaluate-vlm-harness
                 v2.0.0 VLM 평가 harness fixture report를 산출합니다.
  verify-vlm-evaluation-harness
                 v2.0.0 VLM 평가 harness와 latency/품질/JSON/언어 fixture를 검증합니다.
  verify-vlm-event-evidence-extraction
                 v2.0.0 VLM event evidence reference 추출 경계를 검증합니다.
  verify-vlm-observation-sidecar
                 v2.0.0 VLMObservation sidecar 저장소와 EventRecord 상관 경계를 검증합니다.
  generate-vlm-event-explanation
                 v2.0.0 VLM 이벤트 설명/오탐 힌트 fixture report를 산출합니다.
  verify-vlm-event-explanation-hints
                 v2.0.0 VLM 이벤트 설명/오탐 힌트와 JSON 안정성을 검증합니다.
  verify-vlm-ops-event-review-ui
                 v2.0.0 Ops 이벤트 리뷰 UI의 VLM 설명/evidence 표시 경계를 검증합니다.
  verify-vlm-privacy-transfer-guard
                 v2.0.0 Privacy/전송 guard와 provider logging/redaction 경계를 검증합니다.
  verify-vlm-summary-search-candidates
                 v2.0.0 VLM summary 검색 후보와 sidecar/EventRecord correlation 경계를 검증합니다.
  verify-vlm-rule-suggestion-candidates
                 v2.0.0 VLM Rule 추천 보조 후보와 no-auto-apply 경계를 검증합니다.
  verify-vlm-test-rehearsal
                 v2.0.0 VLM 간이 테스트 리허설과 failure fixture/cleanup/lifecycle 경계를 검증합니다.
  verify-vlm-closeout-readiness
                 v2.0.0 VLM close-out readiness report와 release evidence 분리 기준을 검증합니다.
  verify-event-post
                 VA event POST payload, 실패/cooldown/queue 상태를 검증합니다.
  verify-integrator-contract-artifact
                 integrator 배포용 Event/WebRTC/SSE/WS contract sample bundle을 정적 검증합니다.
  verify-event-post-longrun
                 event POST schema/recovery/선택 queue 검증을 반복 실행합니다.
  verify-longrun-separation
                 기본 smoke와 장기 soak/longrun harness 분리 기준을 검증합니다.
  verify-runtime-media-longrun-trigger-matrix
                 runtime/media 변경 유형별 30분/120분 longrun trigger matrix를 검증합니다.
  verify-runtime-dashboard-longrun-template
                 Runtime Dashboard 장시간 evidence template과 실행 분리 기준을 검증합니다.
  verify-rc-release-gate
                 120분 soak/VA runtime longrun이 RC 전용 기준으로 분리됐는지 검증합니다.
  rc-release-checklist
                 RC gate summary/report를 Markdown/HTML checklist와 history index로 묶습니다.
  rc-artifact-archive
                 RC gate artifact를 외부 마운트/S3/NAS 보관소로 checksum manifest와 함께 복사합니다.
  write-dependency-notice
                 third-party attribution inventory에서 배포용 notice 문서를 생성하거나 검증합니다.
  dependency-snapshot
                 현재 설치된 dependency 버전, 모델 hash, linked library snapshot을 생성합니다.
  verify-bundle-policy
                 배포 bundle 안의 FFmpeg/GStreamer GPL-risk runtime 포함 여부를 검사합니다.
  verify-release-bundle-dry-run
                 기본 release bundle을 임시 구성하고 bundle policy gate를 실행합니다.
  verify-runtime-model-bundle-rc-rehearsal
                 v2.1.0 runtime/model bundle RC rehearsal과 release asset 금지 기준을 검증합니다.
  source-offer-checklist
                 LGPL/GPL runtime 포함 배포 전 source offer 준비 항목을 점검합니다.
  verify-tracker-stability
                 이동 영상에서 track ID 유지/분절 통계를 수집합니다.
  compare-close-object-tracker
                 close-object guard off/diagnostic/enforce tracker stability 비교 리포트를 생성합니다.
  verify-close-object-fixture-matrix
                 close-object guard 전체 fixture matrix를 정기 검증용 hard gate로 실행합니다.
  verify-reid-advanced-tracking
                 Re-ID/advanced tracking 실험의 default-off/privacy/benchmark gate를 검증합니다.
  verify-oc-sort-benchmark-boundary
                 OC-SORT 후순위 benchmark가 runtime tracker로 승격되지 않았는지 검증합니다.
  verify-bot-sort-deepsort-research-boundary
                 BoT-SORT/DeepSORT research boundary가 runtime tracker로 승격되지 않았는지 검증합니다.
  verify-yolo-layouts
                 YOLO 모델별 output layout/box/score 조합을 실제 모델로 검증합니다.
  verify-adaptive
                 adaptive tuner의 downshift/upshift 장시간 안정성을 검증합니다.
  verify-image-analysis
                 정적 이미지 입력의 YOLO metadata/snapshot/overlay API를 검증합니다.
  verify-analysis-state
                 TrackState/SceneContext/EventManager/Scenario/Appearance hook 단위 smoke를 검증합니다.
  verify-sse-metadata
                 VA metadata SSE side-channel schema/cleanup을 검증합니다.
  verify-va-metadata-sidechannel
                 VA metadata SSE side-channel schema/cleanup을 summary JSON과 함께 검증합니다.
  verify-webrtc-va-metadata
                 WebRTC vaMetadata=1 DataChannel의 video/ICE/schema 수신을 브라우저로 검증합니다.
  verify-va-runtime-console
                 VA Runtime Dashboard용 metrics/state/status endpoint를 검증합니다.
  verify-va-runtime-console-longrun
                 WebRTC metadata/dashboard/SSE/선택 RTSP overlay 장시간 안정성을 검증합니다.
  verify-va-runtime-console-cycles
                 WebRTC/dashboard/SSE/RTSP consumer connect/disconnect cycle RSS baseline을 검증합니다.
  verify-rtsp-va-overlay-policy
                 RTSP raw/server-side overlay와 metadata side-channel 분리 정책을 검증합니다.
  verify-ws-metadata
                 VA metadata WebSocket side-channel handshake/schema/cleanup을 검증합니다.
  replay-va-metadata
                 저장된 detection/tracking metadata를 media pipeline 없이 VA rule/scenario 계층에 replay합니다.
  verify-va-replay
                 VA metadata replay baseline fixture와 expected event JSON을 비교 검증합니다.
  verify-predev  기능 개발 재개 전 smoke, VA event, event POST, cleanup, report를 묶어 검증합니다.
  summarize-reports
                 /tmp의 검증 summary JSON/NDJSON을 짧은 Markdown 리포트로 변환합니다.

install 옵션:
  --basic        AI/ONNX 없이 미디어 스트리밍 의존성만 설치하고 기본 빌드를 build-gst로 설정합니다.
  --with-youtube lab-only YouTube 실험 보조 도구인 yt-dlp/deno를 설치합니다.
  --no-youtube   호환용 옵션입니다. 기본값이며 yt-dlp/deno 설치를 건너뜁니다.

예시:
  ./server.sh install
  ./server.sh build
  ./server.sh start
  ./server.sh status
  ./server.sh test
  ./server.sh urls
  ./server.sh stop

기본 동작:
  - AI 빌드가 기본입니다: build-gst-onnx + ONNX Runtime + YOLO 모델.
  - 외부 PC에서도 접근 가능하도록 RTSP/HTTP를 0.0.0.0에 바인딩합니다.
  - 로컬 환경 오버라이드는 scripts/.media_server.env에 저장합니다.
  - start background 방식은 기본 nohup입니다. macOS에서 필요하면 MEDIA_SERVER_START_MODE=launchd를 명시합니다.
  - WebRTC STUN/TURN은 MEDIA_SERVER_WEBRTC_STUN_SERVER, MEDIA_SERVER_WEBRTC_TURN_SERVER로 지정합니다.
EOF_USAGE
}

require_internal() {
  local script="$1"
  if [[ ! -x "${INTERNAL_DIR}/${script}" ]]; then
    echo "missing internal script: ${INTERNAL_DIR}/${script}"
    exit 1
  fi
}

cmd="${1:-}"
if [[ -z "${cmd}" || "${cmd}" == "help" || "${cmd}" == "-h" || "${cmd}" == "--help" ]]; then
  usage
  exit 0
fi
shift || true

case "${cmd}" in
  install)
    require_internal install_deps.sh
    exec "${INTERNAL_DIR}/install_deps.sh" "$@"
    ;;
  build)
    require_internal build_server.sh
    exec "${INTERNAL_DIR}/build_server.sh" "$@"
    ;;
  start)
    require_internal start_server.sh
    exec "${INTERNAL_DIR}/start_server.sh" "$@"
    ;;
  stop)
    require_internal stop_server.sh
    exec "${INTERNAL_DIR}/stop_server.sh" "$@"
    ;;
  restart)
    require_internal restart_server.sh
    exec "${INTERNAL_DIR}/restart_server.sh" "$@"
    ;;
  status|check)
    require_internal check_server.sh
    exec "${INTERNAL_DIR}/check_server.sh" "$@"
    ;;
  diagnose)
    require_internal diagnose_media_server.sh
    exec "${INTERNAL_DIR}/diagnose_media_server.sh" "$@"
    ;;
  ops-bundle)
    require_internal collect_ops_bundle.sh
    exec "${INTERNAL_DIR}/collect_ops_bundle.sh" "$@"
    ;;
  ops-evidence-cleanup)
    require_internal run_ops_evidence_retention_cleanup.mjs
    exec "${INTERNAL_DIR}/run_ops_evidence_retention_cleanup.mjs" "$@"
    ;;
  urls|external-urls)
    require_internal print_external_test_urls.sh
    exec "${INTERNAL_DIR}/print_external_test_urls.sh" "$@"
    ;;
  auth-user)
    require_internal auth_user_cli.sh
    exec "${INTERNAL_DIR}/auth_user_cli.sh" "$@"
    ;;
  foreground|run)
    require_internal run_server_foreground.sh
    exec "${INTERNAL_DIR}/run_server_foreground.sh" "$@"
    ;;
  test)
    require_internal test_all.sh
    exec "${INTERNAL_DIR}/test_all.sh" "$@"
    ;;
  verify-codecs)
    require_internal verify_codec_matrix.sh
    exec "${INTERNAL_DIR}/verify_codec_matrix.sh" "$@"
    ;;
  verify-webrtc-ice)
    require_internal verify_webrtc_ice_config.sh
    exec "${INTERNAL_DIR}/verify_webrtc_ice_config.sh" "$@"
    ;;
  verify-external-turn-whep-field-gate)
    require_internal verify_external_turn_whep_field_gate.mjs
    exec "${INTERNAL_DIR}/verify_external_turn_whep_field_gate.mjs" "$@"
    ;;
  verify-uri-longrun)
    require_internal verify_uri_source_longrun.sh
    exec "${INTERNAL_DIR}/verify_uri_source_longrun.sh" "$@"
    ;;
  verify-va)
    require_internal verify_va_overlay.sh
    exec "${INTERNAL_DIR}/verify_va_overlay.sh" "$@"
    ;;
  verify-redaction)
    require_internal verify_redaction.sh
    exec "${INTERNAL_DIR}/verify_redaction.sh" "$@"
    ;;
  verify-va-events)
    require_internal verify_va_tracking_events.sh
    exec "${INTERNAL_DIR}/verify_va_tracking_events.sh" "$@"
    ;;
  verify-va-event-coverage-report)
    require_internal verify_va_event_coverage_report.mjs
    exec "${INTERNAL_DIR}/verify_va_event_coverage_report.mjs" "$@"
    ;;
  verify-va-category-samples)
    require_internal verify_va_category_samples.sh
    exec "${INTERNAL_DIR}/verify_va_category_samples.sh" "$@"
    ;;
  verify-route-profiles)
    require_internal verify_route_profile_matching.sh
    exec "${INTERNAL_DIR}/verify_route_profile_matching.sh" "$@"
    ;;
  verify-rule-ui)
    require_internal verify_ops_rules_embed_smoke.mjs
    exec "${INTERNAL_DIR}/verify_ops_rules_embed_smoke.mjs" "$@"
    ;;
  verify-ops-client-ui)
    require_internal verify_ops_client_ui_smoke.mjs
    exec "${INTERNAL_DIR}/verify_ops_client_ui_smoke.mjs" "$@"
    ;;
  verify-ui-visual-artifact-index)
    require_internal verify_ui_visual_artifact_index.mjs
    exec "${INTERNAL_DIR}/verify_ui_visual_artifact_index.mjs" "$@"
    ;;
  verify-ui-release-baseline-approval-log)
    require_internal verify_ui_release_baseline_approval_log.mjs
    exec "${INTERNAL_DIR}/verify_ui_release_baseline_approval_log.mjs" "$@"
    ;;
  compare-ui-visual-baseline)
    require_internal compare_ui_visual_baseline.mjs
    exec "${INTERNAL_DIR}/compare_ui_visual_baseline.mjs" "$@"
    ;;
  write-ui-visual-qa-issue-links)
    require_internal write_ui_visual_qa_issue_links.mjs
    exec "${INTERNAL_DIR}/write_ui_visual_qa_issue_links.mjs" "$@"
    ;;
  write-ui-visual-baseline-comment)
    require_internal write_ui_visual_baseline_comment.mjs
    exec "${INTERNAL_DIR}/write_ui_visual_baseline_comment.mjs" "$@"
    ;;
  ui-visual-artifact-maintenance)
    require_internal manage_ui_visual_artifacts.mjs
    exec "${INTERNAL_DIR}/manage_ui_visual_artifacts.mjs" "$@"
    ;;
  verify-product-ui-token-drift)
    require_internal verify_product_ui_token_drift.mjs
    exec "${INTERNAL_DIR}/verify_product_ui_token_drift.mjs" "$@"
    ;;
  verify-product-shell-examples)
    require_internal verify_product_shell_examples.mjs
    exec "${INTERNAL_DIR}/verify_product_shell_examples.mjs" "$@"
    ;;
  verify-ops-route-boundaries)
    require_internal verify_ops_route_boundaries.mjs
    exec "${INTERNAL_DIR}/verify_ops_route_boundaries.mjs" "$@"
    ;;
  verify-ops-click-e2e)
    require_internal verify_ops_ui_click_e2e.mjs
    exec "${INTERNAL_DIR}/verify_ops_ui_click_e2e.mjs" "$@"
    ;;
  verify-ops-tables-layout)
    require_internal verify_ops_tables_layout.mjs
    exec "${INTERNAL_DIR}/verify_ops_tables_layout.mjs" "$@"
    ;;
  verify-ops-rules-roundtrip)
    require_internal verify_ops_rules_roundtrip.mjs
    exec "${INTERNAL_DIR}/verify_ops_rules_roundtrip.mjs" "$@"
    ;;
  verify-ops-rule-relationships)
    require_internal verify_ops_rule_relationships.mjs
    exec "${INTERNAL_DIR}/verify_ops_rule_relationships.mjs" "$@"
    ;;
  verify-ops-rule-conflict-ui)
    require_internal verify_ops_rule_conflict_ui.mjs
    exec "${INTERNAL_DIR}/verify_ops_rule_conflict_ui.mjs" "$@"
    ;;
  verify-ops-rule-validation-matrix)
    require_internal verify_ops_rule_validation_matrix.mjs
    exec "${INTERNAL_DIR}/verify_ops_rule_validation_matrix.mjs" "$@"
    ;;
  verify-ops-scenario-presets)
    require_internal verify_ops_scenario_presets.mjs
    exec "${INTERNAL_DIR}/verify_ops_scenario_presets.mjs" "$@"
    ;;
  verify-ops-source-lifecycle)
    require_internal verify_ops_source_lifecycle.mjs
    exec "${INTERNAL_DIR}/verify_ops_source_lifecycle.mjs" "$@"
    ;;
  verify-ops-source-health-bulk)
    require_internal verify_ops_source_health_bulk.mjs
    exec "${INTERNAL_DIR}/verify_ops_source_health_bulk.mjs" "$@"
    ;;
  verify-ops-channel-bulk)
    require_internal verify_ops_channel_bulk.mjs
    exec "${INTERNAL_DIR}/verify_ops_channel_bulk.mjs" "$@"
    ;;
  verify-ops-event-records-scope)
    require_internal verify_ops_event_records_scope.mjs
    exec "${INTERNAL_DIR}/verify_ops_event_records_scope.mjs" "$@"
    ;;
  verify-fixture-cleanup-contracts)
    require_internal verify_fixture_cleanup_contracts.mjs
    exec "${INTERNAL_DIR}/verify_fixture_cleanup_contracts.mjs" "$@"
    ;;
  verify-flaky-verifiers)
    require_internal verify_flaky_verifier_stabilization.mjs
    exec "${INTERNAL_DIR}/verify_flaky_verifier_stabilization.mjs" "$@"
    ;;
  verify-ops-evidence-retention-cleanup)
    require_internal verify_ops_evidence_retention_cleanup.mjs
    exec "${INTERNAL_DIR}/verify_ops_evidence_retention_cleanup.mjs" "$@"
    ;;
  verify-ops-audit-trail)
    require_internal verify_ops_audit_trail.mjs
    exec "${INTERNAL_DIR}/verify_ops_audit_trail.mjs" "$@"
    ;;
  verify-ops-audit-persistence)
    require_internal verify_ops_audit_persistence.mjs
    exec "${INTERNAL_DIR}/verify_ops_audit_persistence.mjs" "$@"
    ;;
  verify-ops-diagnostics-bundle)
    require_internal verify_ops_diagnostics_bundle.sh
    exec "${INTERNAL_DIR}/verify_ops_diagnostics_bundle.sh" "$@"
    ;;
  verify-ops-backup-recovery-guide)
    require_internal verify_ops_backup_recovery_guide.mjs
    exec "${INTERNAL_DIR}/verify_ops_backup_recovery_guide.mjs" "$@"
    ;;
  verify-ops-backup-restore-dry-run)
    require_internal verify_ops_backup_restore_dry_run.mjs
    exec "${INTERNAL_DIR}/verify_ops_backup_restore_dry_run.mjs" "$@"
    ;;
  verify-ops-root-cause-panel)
    require_internal verify_ops_root_cause_panel.mjs
    exec "${INTERNAL_DIR}/verify_ops_root_cause_panel.mjs" "$@"
    ;;
  verify-client-dashboard-polish)
    require_internal verify_client_dashboard_polish.mjs
    exec "${INTERNAL_DIR}/verify_client_dashboard_polish.mjs" "$@"
    ;;
  verify-ui-copy-matrix)
    require_internal verify_ui_copy_matrix.mjs
    exec "${INTERNAL_DIR}/verify_ui_copy_matrix.mjs" "$@"
    ;;
  verify-ui-copy-i18n-parity)
    require_internal verify_ui_copy_i18n_parity.mjs
    exec "${INTERNAL_DIR}/verify_ui_copy_i18n_parity.mjs" "$@"
    ;;
  verify-docs-ui-assets)
    require_internal verify_docs_ui_assets.mjs
    exec "${INTERNAL_DIR}/verify_docs_ui_assets.mjs" "$@"
    ;;
  verify-manual-ui-evidence)
    require_internal verify_manual_ui_evidence.mjs
    exec "${INTERNAL_DIR}/verify_manual_ui_evidence.mjs" "$@"
    ;;
  verify-product-ui-no-native-dialogs)
    require_internal verify_product_ui_no_native_dialogs.mjs
    exec "${INTERNAL_DIR}/verify_product_ui_no_native_dialogs.mjs" "$@"
    ;;
  verify-ui-blocking-dialog-policy)
    require_internal verify_ui_blocking_dialog_policy.mjs
    exec "${INTERNAL_DIR}/verify_ui_blocking_dialog_policy.mjs" "$@"
    ;;
  verify-ui-fulltest-one-shot)
    require_internal verify_ui_fulltest_one_shot.mjs
    exec "${INTERNAL_DIR}/verify_ui_fulltest_one_shot.mjs" "$@"
    ;;
  prepare-manual-ui-fulltest-seed)
    require_internal prepare_manual_ui_fulltest_seed.mjs
    exec "${INTERNAL_DIR}/prepare_manual_ui_fulltest_seed.mjs" "$@"
    ;;
  verify-docs-links)
    require_internal verify_docs_links.mjs
    exec "${INTERNAL_DIR}/verify_docs_links.mjs" "$@"
    ;;
  verify-onvif-live-import-contract)
    require_internal verify_onvif_live_import_contract.mjs
    exec "${INTERNAL_DIR}/verify_onvif_live_import_contract.mjs" "$@"
    ;;
  verify-onvif-protocol-support-matrix)
    require_internal verify_onvif_protocol_support_matrix.mjs
    exec "${INTERNAL_DIR}/verify_onvif_protocol_support_matrix.mjs" "$@"
    ;;
  verify-onvif-rtsps-draft-policy)
    require_internal verify_onvif_rtsps_draft_policy.mjs
    exec "${INTERNAL_DIR}/verify_onvif_rtsps_draft_policy.mjs" "$@"
    ;;
  verify-onvif-https-soap-transport-design)
    require_internal verify_onvif_https_soap_transport_design.mjs
    exec "${INTERNAL_DIR}/verify_onvif_https_soap_transport_design.mjs" "$@"
    ;;
  verify-onvif-https-tls-fixture)
    require_internal verify_onvif_https_tls_fixture.mjs
    exec "${INTERNAL_DIR}/verify_onvif_https_tls_fixture.mjs" "$@"
    ;;
  verify-onvif-auth-injection-design)
    require_internal verify_onvif_auth_injection_design.mjs
    exec "${INTERNAL_DIR}/verify_onvif_auth_injection_design.mjs" "$@"
    ;;
  verify-onvif-auth-injection-loopback)
    require_internal verify_onvif_auth_injection_loopback.sh
    exec "${INTERNAL_DIR}/verify_onvif_auth_injection_loopback.sh" "$@"
    ;;
  verify-onvif-ws-discovery-ux)
    require_internal verify_onvif_ws_discovery_ux.mjs
    exec "${INTERNAL_DIR}/verify_onvif_ws_discovery_ux.mjs" "$@"
    ;;
  verify-onvif-unsupported-api-guard)
    require_internal verify_onvif_unsupported_api_guard.mjs
    exec "${INTERNAL_DIR}/verify_onvif_unsupported_api_guard.mjs" "$@"
    ;;
  verify-onvif-probe-fixture-contract)
    require_internal verify_onvif_probe_fixture_contract.mjs
    exec "${INTERNAL_DIR}/verify_onvif_probe_fixture_contract.mjs" "$@"
    ;;
  verify-onvif-probe-profile-variants)
    require_internal verify_onvif_probe_profile_variants.mjs
    exec "${INTERNAL_DIR}/verify_onvif_probe_profile_variants.mjs" "$@"
    ;;
  verify-onvif-synthetic-vendor-fixtures)
    require_internal verify_onvif_synthetic_vendor_fixture_pack.mjs
    exec "${INTERNAL_DIR}/verify_onvif_synthetic_vendor_fixture_pack.mjs" "$@"
    ;;
  verify-onvif-probe-parser)
    require_internal verify_onvif_probe_parser.sh
    exec "${INTERNAL_DIR}/verify_onvif_probe_parser.sh" "$@"
    ;;
  verify-onvif-probe-adapter)
    require_internal verify_onvif_probe_adapter.sh
    exec "${INTERNAL_DIR}/verify_onvif_probe_adapter.sh" "$@"
    ;;
  verify-onvif-probe-error-wording)
    require_internal verify_onvif_probe_error_wording_matrix.mjs
    exec "${INTERNAL_DIR}/verify_onvif_probe_error_wording_matrix.mjs" "$@"
    ;;
  verify-onvif-soap-fault-matrix)
    require_internal verify_onvif_soap_fault_matrix.mjs
    exec "${INTERNAL_DIR}/verify_onvif_soap_fault_matrix.mjs" "$@"
    ;;
  verify-onvif-no-device-suite)
    require_internal verify_onvif_no_device_suite.mjs
    exec "${INTERNAL_DIR}/verify_onvif_no_device_suite.mjs" "$@"
    ;;
  verify-onvif-no-device-mode)
    require_internal verify_onvif_no_device_mode.mjs
    exec "${INTERNAL_DIR}/verify_onvif_no_device_mode.mjs" "$@"
    ;;
  verify-onvif-no-device-completion)
    require_internal verify_onvif_no_device_completion.mjs
    exec "${INTERNAL_DIR}/verify_onvif_no_device_completion.mjs" "$@"
    ;;
  verify-onvif-field-smoke-redaction)
    require_internal verify_onvif_field_smoke_redaction.mjs
    exec "${INTERNAL_DIR}/verify_onvif_field_smoke_redaction.mjs" "$@"
    ;;
  verify-onvif-field-smoke-gate)
    require_internal verify_onvif_field_smoke_gate.mjs
    exec "${INTERNAL_DIR}/verify_onvif_field_smoke_gate.mjs" "$@"
    ;;
  verify-onvif-field-http-probe)
    require_internal verify_onvif_field_http_probe.mjs
    exec "${INTERNAL_DIR}/verify_onvif_field_http_probe.mjs" "$@"
    ;;
  verify-onvif-closed-loopback-failure-matrix)
    require_internal verify_onvif_closed_loopback_failure_matrix.mjs
    exec "${INTERNAL_DIR}/verify_onvif_closed_loopback_failure_matrix.mjs" "$@"
    ;;
  verify-onvif-tls-transport-policy)
    require_internal verify_onvif_tls_transport_policy.mjs
    exec "${INTERNAL_DIR}/verify_onvif_tls_transport_policy.mjs" "$@"
    ;;
  verify-onvif-credential-reference-policy)
    require_internal verify_onvif_credential_reference_policy.mjs
    exec "${INTERNAL_DIR}/verify_onvif_credential_reference_policy.mjs" "$@"
    ;;
  verify-onvif-field-smoke-sample-bundle)
    require_internal verify_onvif_field_smoke_sample_bundle.mjs
    exec "${INTERNAL_DIR}/verify_onvif_field_smoke_sample_bundle.mjs" "$@"
    ;;
  verify-onvif-http-transport)
    require_internal verify_onvif_http_transport.sh
    exec "${INTERNAL_DIR}/verify_onvif_http_transport.sh" "$@"
    ;;
  verify-onvif-local-simulator)
    require_internal verify_onvif_local_simulator.sh
    exec "${INTERNAL_DIR}/verify_onvif_local_simulator.sh" "$@"
    ;;
  verify-onvif-probe-draft-api)
    require_internal verify_onvif_probe_draft_api.mjs
    exec "${INTERNAL_DIR}/verify_onvif_probe_draft_api.mjs" "$@"
    ;;
  verify-onvif-import-draft-api)
    require_internal verify_onvif_import_draft_api.mjs
    exec "${INTERNAL_DIR}/verify_onvif_import_draft_api.mjs" "$@"
    ;;
  verify-onvif-rtsp-downstream)
    require_internal verify_onvif_rtsp_downstream.mjs
    exec "${INTERNAL_DIR}/verify_onvif_rtsp_downstream.mjs" "$@"
    ;;
  verify-onvif-ops-sources-ui)
    require_internal verify_onvif_ops_sources_ui_roundtrip.mjs
    exec "${INTERNAL_DIR}/verify_onvif_ops_sources_ui_roundtrip.mjs" "$@"
    ;;
  verify-code-comments)
    require_internal verify_code_comments.mjs
    exec "${INTERNAL_DIR}/verify_code_comments.mjs" "$@"
    ;;
  verify-release-metadata)
    require_internal verify_release_metadata_consistency.mjs
    exec "${INTERNAL_DIR}/verify_release_metadata_consistency.mjs" "$@"
    ;;
  verify-release-evidence-index)
    require_internal verify_release_evidence_index.mjs
    exec "${INTERNAL_DIR}/verify_release_evidence_index.mjs" "$@"
    ;;
  verify-v190-entry-baseline)
    require_internal verify_v190_entry_baseline_report.mjs
    exec "${INTERNAL_DIR}/verify_v190_entry_baseline_report.mjs" "$@"
    ;;
  verify-v210-entry-baseline)
    require_internal verify_v210_entry_baseline.mjs
    exec "${INTERNAL_DIR}/verify_v210_entry_baseline.mjs" "$@"
    ;;
  verify-v220-entry-boundary)
    require_internal verify_v220_entry_boundary.mjs
    exec "${INTERNAL_DIR}/verify_v220_entry_boundary.mjs" "$@"
    ;;
  verify-v230-entry-baseline)
    require_internal verify_v230_entry_baseline.mjs
    exec "${INTERNAL_DIR}/verify_v230_entry_baseline.mjs" "$@"
    ;;
  verify-v230-test-evidence-consistency)
    require_internal verify_v230_test_evidence_consistency.mjs
    exec "${INTERNAL_DIR}/verify_v230_test_evidence_consistency.mjs" "$@"
    ;;
  verify-v230-ui-renderer-module-decomposition)
    require_internal verify_v230_ui_renderer_module_decomposition.mjs
    exec "${INTERNAL_DIR}/verify_v230_ui_renderer_module_decomposition.mjs" "$@"
    ;;
  verify-v230-conditional-field-evidence)
    require_internal verify_v230_conditional_field_evidence.mjs
    exec "${INTERNAL_DIR}/verify_v230_conditional_field_evidence.mjs" "$@"
    ;;
  verify-v230-ops-backup-recovery-lifecycle)
    require_internal verify_v230_ops_backup_recovery_lifecycle.mjs
    exec "${INTERNAL_DIR}/verify_v230_ops_backup_recovery_lifecycle.mjs" "$@"
    ;;
  verify-v220-ui-architecture-inventory)
    require_internal verify_v220_ui_architecture_inventory.mjs
    exec "${INTERNAL_DIR}/verify_v220_ui_architecture_inventory.mjs" "$@"
    ;;
  verify-v220-responsive-task-shell)
    require_internal verify_v220_responsive_task_shell.mjs
    exec "${INTERNAL_DIR}/verify_v220_responsive_task_shell.mjs" "$@"
    ;;
  verify-v220-design-token-refresh)
    require_internal verify_v220_design_token_refresh.mjs
    exec "${INTERNAL_DIR}/verify_v220_design_token_refresh.mjs" "$@"
    ;;
  verify-v220-component-primitives)
    require_internal verify_v220_component_primitives.mjs
    exec "${INTERNAL_DIR}/verify_v220_component_primitives.mjs" "$@"
    ;;
  verify-v220-ops-workspace-redesign)
    require_internal verify_v220_ops_workspace_redesign.mjs
    exec "${INTERNAL_DIR}/verify_v220_ops_workspace_redesign.mjs" "$@"
    ;;
  verify-v220-rules-workspace-redesign)
    require_internal verify_v220_rules_workspace_redesign.mjs
    exec "${INTERNAL_DIR}/verify_v220_rules_workspace_redesign.mjs" "$@"
    ;;
  verify-v220-client-live-redesign)
    require_internal verify_v220_client_live_redesign.mjs
    exec "${INTERNAL_DIR}/verify_v220_client_live_redesign.mjs" "$@"
    ;;
  verify-v220-auth-setup-redesign)
    require_internal verify_v220_auth_setup_redesign.mjs
    exec "${INTERNAL_DIR}/verify_v220_auth_setup_redesign.mjs" "$@"
    ;;
  verify-v220-ops-channels-workspace)
    require_internal verify_v220_ops_channels_workspace.mjs
    exec "${INTERNAL_DIR}/verify_v220_ops_channels_workspace.mjs" "$@"
    ;;
  verify-v220-ops-users-access-workspace)
    require_internal verify_v220_ops_users_access_workspace.mjs
    exec "${INTERNAL_DIR}/verify_v220_ops_users_access_workspace.mjs" "$@"
    ;;
  verify-v220-ops-vlm-containment)
    require_internal verify_v220_ops_vlm_containment.mjs
    exec "${INTERNAL_DIR}/verify_v220_ops_vlm_containment.mjs" "$@"
    ;;
  verify-v220-client-preview-redaction-review)
    require_internal verify_v220_client_preview_redaction_review.mjs
    exec "${INTERNAL_DIR}/verify_v220_client_preview_redaction_review.mjs" "$@"
    ;;
  verify-v220-ui-evidence-closeout)
    require_internal verify_v220_ui_evidence_closeout.mjs
    exec "${INTERNAL_DIR}/verify_v220_ui_evidence_closeout.mjs" "$@"
    ;;
  verify-feature-scope-gate)
    require_internal verify_feature_scope_decision_gate.mjs
    exec "${INTERNAL_DIR}/verify_feature_scope_decision_gate.mjs" "$@"
    ;;
  verify-script-inventory)
    require_internal verify_script_inventory.mjs
    exec "${INTERNAL_DIR}/verify_script_inventory.mjs" "$@"
    ;;
  verify-project-inventory)
    require_internal verify_project_feature_test_inventory.mjs
    exec "${INTERNAL_DIR}/verify_project_feature_test_inventory.mjs" "$@"
    ;;
  verify-feature-inventory-coverage)
    require_internal verify_feature_inventory_coverage.mjs
    exec "${INTERNAL_DIR}/verify_feature_inventory_coverage.mjs" "$@"
    ;;
  verify-v290-final-contract-freeze)
    require_internal verify_v290_final_contract_freeze.mjs
    exec "${INTERNAL_DIR}/verify_v290_final_contract_freeze.mjs" "$@"
    ;;
  verify-v290-v28-regression-bundle)
    require_internal verify_v290_v28_regression_bundle.mjs
    exec "${INTERNAL_DIR}/verify_v290_v28_regression_bundle.mjs" "$@"
    ;;
  verify-v290-2x-compatibility-baseline)
    require_internal verify_v290_2x_compatibility_baseline.mjs
    exec "${INTERNAL_DIR}/verify_v290_2x_compatibility_baseline.mjs" "$@"
    ;;
  verify-v290-release-test-records-enforcement)
    require_internal verify_v290_release_test_records_enforcement.mjs
    exec "${INTERNAL_DIR}/verify_v290_release_test_records_enforcement.mjs" "$@"
    ;;
  verify-v290-ui-fulltest-criteria-freeze)
    require_internal verify_v290_ui_fulltest_criteria_freeze.mjs
    exec "${INTERNAL_DIR}/verify_v290_ui_fulltest_criteria_freeze.mjs" "$@"
    ;;
  verify-v290-release-evidence-hygiene)
    require_internal verify_v290_release_evidence_hygiene.mjs
    exec "${INTERNAL_DIR}/verify_v290_release_evidence_hygiene.mjs" "$@"
    ;;
  verify-v290-public-docs-assets-refresh)
    require_internal verify_v290_public_docs_assets_refresh.mjs
    exec "${INTERNAL_DIR}/verify_v290_public_docs_assets_refresh.mjs" "$@"
    ;;
  verify-v300-entry-baseline)
    require_internal verify_v300_entry_baseline.mjs
    exec "${INTERNAL_DIR}/verify_v300_entry_baseline.mjs" "$@"
    ;;
  verify-v300-event-evidence-contract)
    require_internal verify_v300_event_evidence_contract.mjs
    exec "${INTERNAL_DIR}/verify_v300_event_evidence_contract.mjs" "$@"
    ;;
  verify-v300-feature-schema-privacy)
    require_internal verify_v300_feature_schema_privacy.mjs
    exec "${INTERNAL_DIR}/verify_v300_feature_schema_privacy.mjs" "$@"
    ;;
  verify-v300-vlm-feature-queue)
    require_internal verify_v300_vlm_feature_queue.mjs
    exec "${INTERNAL_DIR}/verify_v300_vlm_feature_queue.mjs" "$@"
    ;;
  verify-v300-feature-only-retention)
    require_internal verify_v300_feature_only_retention.mjs
    exec "${INTERNAL_DIR}/verify_v300_feature_only_retention.mjs" "$@"
    ;;
  verify-v300-search-dsl-query-convert)
    require_internal verify_v300_search_dsl_query_convert.mjs
    exec "${INTERNAL_DIR}/verify_v300_search_dsl_query_convert.mjs" "$@"
    ;;
  verify-v300-feature-search-index)
    require_internal verify_v300_feature_search_index.mjs
    exec "${INTERNAL_DIR}/verify_v300_feature_search_index.mjs" "$@"
    ;;
  verify-v300-ops-events-ui)
    require_internal verify_v300_ops_events_ui.mjs
    exec "${INTERNAL_DIR}/verify_v300_ops_events_ui.mjs" "$@"
    ;;
  verify-v300-retention-pin-cleanup)
    require_internal verify_v300_retention_pin_cleanup.mjs
    exec "${INTERNAL_DIR}/verify_v300_retention_pin_cleanup.mjs" "$@"
    ;;
  verify-v300-stabilization-release-readiness)
    require_internal verify_v300_stabilization_release_readiness.mjs
    exec "${INTERNAL_DIR}/verify_v300_stabilization_release_readiness.mjs" "$@"
    ;;
  verify-v310-entry-baseline)
    require_internal verify_v310_entry_baseline.mjs
    exec "${INTERNAL_DIR}/verify_v310_entry_baseline.mjs" "$@"
    ;;
  verify-v310-event-clip-contract)
    require_internal verify_v310_event_clip_contract.mjs
    exec "${INTERNAL_DIR}/verify_v310_event_clip_contract.mjs" "$@"
    ;;
  verify-v310-replay-timeline-ui)
    require_internal verify_v310_replay_timeline_ui.mjs
    exec "${INTERNAL_DIR}/verify_v310_replay_timeline_ui.mjs" "$@"
    ;;
  verify-v310-client-safe-event-digest)
    require_internal verify_v310_client_safe_event_digest.mjs
    exec "${INTERNAL_DIR}/verify_v310_client_safe_event_digest.mjs" "$@"
    ;;
  verify-v310-scoped-integrator-search-api)
    require_internal verify_v310_scoped_integrator_search_api.mjs
    exec "${INTERNAL_DIR}/verify_v310_scoped_integrator_search_api.mjs" "$@"
    ;;
  verify-v310-operator-feature-correction)
    require_internal verify_v310_operator_feature_correction.mjs
    exec "${INTERNAL_DIR}/verify_v310_operator_feature_correction.mjs" "$@"
    ;;
  verify-v310-optional-vector-search)
    require_internal verify_v310_optional_vector_search.mjs
    exec "${INTERNAL_DIR}/verify_v310_optional_vector_search.mjs" "$@"
    ;;
  verify-v310-retention-export-hardening)
    require_internal verify_v310_retention_export_hardening.mjs
    exec "${INTERNAL_DIR}/verify_v310_retention_export_hardening.mjs" "$@"
    ;;
  verify-v310-stabilization-release-readiness)
    require_internal verify_v310_stabilization_release_readiness.mjs
    exec "${INTERNAL_DIR}/verify_v310_stabilization_release_readiness.mjs" "$@"
    ;;
  verify-v320-entry-baseline)
    require_internal verify_v320_entry_baseline.mjs
    exec "${INTERNAL_DIR}/verify_v320_entry_baseline.mjs" "$@"
    ;;
  verify-v320-resolution-state-contract)
    require_internal verify_v320_resolution_state_contract.mjs
    exec "${INTERNAL_DIR}/verify_v320_resolution_state_contract.mjs" "$@"
    ;;
  verify-v320-unified-ops-events-workspace)
    require_internal verify_v320_unified_ops_events_workspace.mjs
    exec "${INTERNAL_DIR}/verify_v320_unified_ops_events_workspace.mjs" "$@"
    ;;
  verify-v320-evidence-quality-layer)
    require_internal verify_v320_evidence_quality_layer.mjs
    exec "${INTERNAL_DIR}/verify_v320_evidence_quality_layer.mjs" "$@"
    ;;
  verify-v320-source-reliability-context)
    require_internal verify_v320_source_reliability_context.mjs
    exec "${INTERNAL_DIR}/verify_v320_source_reliability_context.mjs" "$@"
    ;;
  verify-v320-source-reliability-runtime-sample)
    require_internal verify_v320_source_reliability_runtime_sample.mjs
    exec "${INTERNAL_DIR}/verify_v320_source_reliability_runtime_sample.mjs" "$@"
    ;;
  verify-v320-ai-review-quality-context)
    require_internal verify_v320_ai_review_quality_context.mjs
    exec "${INTERNAL_DIR}/verify_v320_ai_review_quality_context.mjs" "$@"
    ;;
  verify-v320-operator-resolution-flow)
    require_internal verify_v320_operator_resolution_flow.mjs
    exec "${INTERNAL_DIR}/verify_v320_operator_resolution_flow.mjs" "$@"
    ;;
  verify-v320-action-readiness-checklist)
    require_internal verify_v320_action_readiness_checklist.mjs
    exec "${INTERNAL_DIR}/verify_v320_action_readiness_checklist.mjs" "$@"
    ;;
  verify-v320-client-safe-resolution-digest)
    require_internal verify_v320_client_safe_resolution_digest.mjs
    exec "${INTERNAL_DIR}/verify_v320_client_safe_resolution_digest.mjs" "$@"
    ;;
  verify-v320-resolution-search-metrics)
    require_internal verify_v320_resolution_search_metrics.mjs
    exec "${INTERNAL_DIR}/verify_v320_resolution_search_metrics.mjs" "$@"
    ;;
  verify-v320-stabilization-release-readiness)
    require_internal verify_v320_stabilization_release_readiness.mjs
    exec "${INTERNAL_DIR}/verify_v320_stabilization_release_readiness.mjs" "$@"
    ;;
  verify-v330-entry-baseline)
    require_internal verify_v330_entry_baseline.mjs
    exec "${INTERNAL_DIR}/verify_v330_entry_baseline.mjs" "$@"
    ;;
  verify-v330-source-registry-snapshot-identity)
    require_internal verify_v330_source_registry_snapshot_identity.mjs
    exec "${INTERNAL_DIR}/verify_v330_source_registry_snapshot_identity.mjs" "$@"
    ;;
  verify-v330-source-onboarding-quality-summary)
    require_internal verify_v330_source_onboarding_quality_summary.mjs
    exec "${INTERNAL_DIR}/verify_v330_source_onboarding_quality_summary.mjs" "$@"
    ;;
  verify-v330-reliability-timeline-health-history)
    require_internal verify_v330_reliability_timeline_health_history.mjs
    exec "${INTERNAL_DIR}/verify_v330_reliability_timeline_health_history.mjs" "$@"
    ;;
  verify-v330-incident-source-correlation-layer)
    require_internal verify_v330_incident_source_correlation_layer.mjs
    exec "${INTERNAL_DIR}/verify_v330_incident_source_correlation_layer.mjs" "$@"
    ;;
  verify-v330-operator-recheck-recovery-queue)
    require_internal verify_v330_operator_recheck_recovery_queue.mjs
    exec "${INTERNAL_DIR}/verify_v330_operator_recheck_recovery_queue.mjs" "$@"
    ;;
  verify-v330-client-safe-source-status-digest)
    require_internal verify_v330_client_safe_source_status_digest.mjs
    exec "${INTERNAL_DIR}/verify_v330_client_safe_source_status_digest.mjs" "$@"
    ;;
  verify-v330-operator-runbook-reliability-handoff)
    require_internal verify_v330_operator_runbook_reliability_handoff.mjs
    exec "${INTERNAL_DIR}/verify_v330_operator_runbook_reliability_handoff.mjs" "$@"
    ;;
  verify-v330-source-reliability-search-metrics)
    require_internal verify_v330_source_reliability_search_metrics.mjs
    exec "${INTERNAL_DIR}/verify_v330_source_reliability_search_metrics.mjs" "$@"
    ;;
  verify-v330-ops-backup-recovery-source-handoff)
    require_internal verify_v330_ops_backup_recovery_source_handoff.mjs
    exec "${INTERNAL_DIR}/verify_v330_ops_backup_recovery_source_handoff.mjs" "$@"
    ;;
  verify-v330-stabilization-release-readiness)
    require_internal verify_v330_stabilization_release_readiness.mjs
    exec "${INTERNAL_DIR}/verify_v330_stabilization_release_readiness.mjs" "$@"
    ;;
  verify-v340-entry-baseline)
    require_internal verify_v340_entry_baseline.mjs
    exec "${INTERNAL_DIR}/verify_v340_entry_baseline.mjs" "$@"
    ;;
  verify-v340-continuity-drill-contract)
    require_internal verify_v340_continuity_drill_contract.mjs
    exec "${INTERNAL_DIR}/verify_v340_continuity_drill_contract.mjs" "$@"
    ;;
  verify-v340-recovery-candidate-package)
    require_internal verify_v340_recovery_candidate_package.mjs
    exec "${INTERNAL_DIR}/verify_v340_recovery_candidate_package.mjs" "$@"
    ;;
  verify-v340-staging-restore-validation-harness)
    require_internal verify_v340_staging_restore_validation_harness.mjs
    exec "${INTERNAL_DIR}/verify_v340_staging_restore_validation_harness.mjs" "$@"
    ;;
  verify-v340-source-health-replay-drift-diff)
    require_internal verify_v340_source_health_replay_drift_diff.mjs
    exec "${INTERNAL_DIR}/verify_v340_source_health_replay_drift_diff.mjs" "$@"
    ;;
  verify-v340-ops-continuity-drill-workspace-ui)
    require_internal verify_v340_ops_continuity_drill_workspace_ui.mjs
    exec "${INTERNAL_DIR}/verify_v340_ops_continuity_drill_workspace_ui.mjs" "$@"
    ;;
  verify-v340-approval-gated-recovery-checklist-audit)
    require_internal verify_v340_approval_gated_recovery_checklist_audit.mjs
    exec "${INTERNAL_DIR}/verify_v340_approval_gated_recovery_checklist_audit.mjs" "$@"
    ;;
  verify-v340-client-safe-maintenance-digest)
    require_internal verify_v340_client_safe_maintenance_digest.mjs
    exec "${INTERNAL_DIR}/verify_v340_client_safe_maintenance_digest.mjs" "$@"
    ;;
  verify-v340-drill-evidence-export-cleanup-manifest)
    require_internal verify_v340_drill_evidence_export_cleanup_manifest.mjs
    exec "${INTERNAL_DIR}/verify_v340_drill_evidence_export_cleanup_manifest.mjs" "$@"
    ;;
  verify-v340-field-bridge-condition-gates)
    require_internal verify_v340_field_bridge_condition_gates.mjs
    exec "${INTERNAL_DIR}/verify_v340_field_bridge_condition_gates.mjs" "$@"
    ;;
  verify-v340-stabilization-release-readiness)
    require_internal verify_v340_stabilization_release_readiness.mjs
    exec "${INTERNAL_DIR}/verify_v340_stabilization_release_readiness.mjs" "$@"
    ;;
  verify-v350-entry-baseline)
    require_internal verify_v350_entry_baseline.mjs
    exec "${INTERNAL_DIR}/verify_v350_entry_baseline.mjs" "$@"
    ;;
  verify-v350-live-operations-graph-contract)
    require_internal verify_v350_live_operations_graph_contract.mjs
    exec "${INTERNAL_DIR}/verify_v350_live_operations_graph_contract.mjs" "$@"
    ;;
  verify-v350-operations-command-plan-contract)
    require_internal verify_v350_operations_command_plan_contract.mjs
    exec "${INTERNAL_DIR}/verify_v350_operations_command_plan_contract.mjs" "$@"
    ;;
  verify-v350-incident-to-command-handoff)
    require_internal verify_v350_incident_to_command_handoff.mjs
    exec "${INTERNAL_DIR}/verify_v350_incident_to_command_handoff.mjs" "$@"
    ;;
  verify-v350-staged-change-plan-impact-preview)
    require_internal verify_v350_staged_change_plan_impact_preview.mjs
    exec "${INTERNAL_DIR}/verify_v350_staged_change_plan_impact_preview.mjs" "$@"
    ;;
  verify-v350-ops-command-workspace-ui)
    require_internal verify_v350_ops_command_workspace_ui.mjs
    exec "${INTERNAL_DIR}/verify_v350_ops_command_workspace_ui.mjs" "$@"
    ;;
  verify-v350-drill-run-ledger-plan-comparison)
    require_internal verify_v350_drill_run_ledger_plan_comparison.mjs
    exec "${INTERNAL_DIR}/verify_v350_drill_run_ledger_plan_comparison.mjs" "$@"
    ;;
  verify-v350-client-impact-forecast)
    require_internal verify_v350_client_impact_forecast.mjs
    exec "${INTERNAL_DIR}/verify_v350_client_impact_forecast.mjs" "$@"
    ;;
  verify-v350-client-safe-operations-notice)
    require_internal verify_v350_client_safe_operations_notice.mjs
    exec "${INTERNAL_DIR}/verify_v350_client_safe_operations_notice.mjs" "$@"
    ;;
  verify-v350-operations-export-bundle-handoff-map)
    require_internal verify_v350_operations_export_bundle_handoff_map.mjs
    exec "${INTERNAL_DIR}/verify_v350_operations_export_bundle_handoff_map.mjs" "$@"
    ;;
  verify-v350-field-evidence-intake)
    require_internal verify_v350_field_evidence_intake.mjs
    exec "${INTERNAL_DIR}/verify_v350_field_evidence_intake.mjs" "$@"
    ;;
  verify-v350-vlm-assisted-ops-explanation)
    require_internal verify_v350_vlm_assisted_ops_explanation.mjs
    exec "${INTERNAL_DIR}/verify_v350_vlm_assisted_ops_explanation.mjs" "$@"
    ;;
  verify-v350-stabilization-release-readiness)
    require_internal verify_v350_stabilization_release_readiness.mjs
    exec "${INTERNAL_DIR}/verify_v350_stabilization_release_readiness.mjs" "$@"
    ;;
  verify-v370-entry-baseline)
    require_internal verify_v370_entry_baseline.mjs
    exec "${INTERNAL_DIR}/verify_v370_entry_baseline.mjs" "$@"
    ;;
  verify-v370-site-source-group-contract)
    require_internal verify_v370_site_source_group_contract.mjs
    exec "${INTERNAL_DIR}/verify_v370_site_source_group_contract.mjs" "$@"
    ;;
  verify-v370-site-aware-source-registry-projection)
    require_internal verify_v370_site_aware_source_registry_projection.mjs
    exec "${INTERNAL_DIR}/verify_v370_site_aware_source_registry_projection.mjs" "$@"
    ;;
  verify-v370-site-health-rollup)
    require_internal verify_v370_site_health_rollup.mjs
    exec "${INTERNAL_DIR}/verify_v370_site_health_rollup.mjs" "$@"
    ;;
  verify-v370-site-impact-graph)
    require_internal verify_v370_site_impact_graph.mjs
    exec "${INTERNAL_DIR}/verify_v370_site_impact_graph.mjs" "$@"
    ;;
  verify-v370-site-simulation-input-pack)
    require_internal verify_v370_site_simulation_input_pack.mjs
    exec "${INTERNAL_DIR}/verify_v370_site_simulation_input_pack.mjs" "$@"
    ;;
  verify-v370-cross-site-safe-apply-readiness)
    require_internal verify_v370_cross_site_safe_apply_readiness.mjs
    exec "${INTERNAL_DIR}/verify_v370_cross_site_safe_apply_readiness.mjs" "$@"
    ;;
  verify-v370-runbook-template-contract)
    require_internal verify_v370_runbook_template_contract.mjs
    exec "${INTERNAL_DIR}/verify_v370_runbook_template_contract.mjs" "$@"
    ;;
  verify-v370-runbook-instance-ledger)
    require_internal verify_v370_runbook_instance_ledger.mjs
    exec "${INTERNAL_DIR}/verify_v370_runbook_instance_ledger.mjs" "$@"
    ;;
  verify-v370-approval-ticket-workflow)
    require_internal verify_v370_approval_ticket_workflow.mjs
    exec "${INTERNAL_DIR}/verify_v370_approval_ticket_workflow.mjs" "$@"
    ;;
  verify-v370-site-operations-workspace-ui)
    require_internal verify_v370_site_operations_workspace_ui.mjs
    exec "${INTERNAL_DIR}/verify_v370_site_operations_workspace_ui.mjs" "$@"
    ;;
  verify-v370-client-notice-by-site-view-group)
    require_internal verify_v370_client_notice_by_site_view_group.mjs
    exec "${INTERNAL_DIR}/verify_v370_client_notice_by_site_view_group.mjs" "$@"
    ;;
  verify-v370-rule-va-what-if-by-site)
    require_internal verify_v370_rule_va_what_if_by_site.mjs
    exec "${INTERNAL_DIR}/verify_v370_rule_va_what_if_by_site.mjs" "$@"
    ;;
  verify-v370-field-evidence-attachment)
    require_internal verify_v370_field_evidence_attachment.mjs
    exec "${INTERNAL_DIR}/verify_v370_field_evidence_attachment.mjs" "$@"
    ;;
  verify-v370-limited-safe-execution-pilot)
    require_internal verify_v370_limited_safe_execution_pilot.mjs
    exec "${INTERNAL_DIR}/verify_v370_limited_safe_execution_pilot.mjs" "$@"
    ;;
  verify-v360-entry-baseline)
    require_internal verify_v360_entry_baseline.mjs
    exec "${INTERNAL_DIR}/verify_v360_entry_baseline.mjs" "$@"
    ;;
  verify-v360-simulation-input-contract)
    require_internal verify_v360_simulation_input_contract.mjs
    exec "${INTERNAL_DIR}/verify_v360_simulation_input_contract.mjs" "$@"
    ;;
  verify-v360-operations-simulation-run-contract)
    require_internal verify_v360_operations_simulation_run_contract.mjs
    exec "${INTERNAL_DIR}/verify_v360_operations_simulation_run_contract.mjs" "$@"
    ;;
  verify-v360-command-plan-dry-run-simulator)
    require_internal verify_v360_command_plan_dry_run_simulator.mjs
    exec "${INTERNAL_DIR}/verify_v360_command_plan_dry_run_simulator.mjs" "$@"
    ;;
  verify-v360-source-rule-impact-diff)
    require_internal verify_v360_source_rule_impact_diff.mjs
    exec "${INTERNAL_DIR}/verify_v360_source_rule_impact_diff.mjs" "$@"
    ;;
  verify-v360-safe-apply-readiness-gate)
    require_internal verify_v360_safe_apply_readiness_gate.mjs
    exec "${INTERNAL_DIR}/verify_v360_safe_apply_readiness_gate.mjs" "$@"
    ;;
  verify-v360-ops-simulation-workspace-ui)
    require_internal verify_v360_ops_simulation_workspace_ui.mjs
    exec "${INTERNAL_DIR}/verify_v360_ops_simulation_workspace_ui.mjs" "$@"
    ;;
  verify-v360-simulation-run-ledger-comparison)
    require_internal verify_v360_simulation_run_ledger_comparison.mjs
    exec "${INTERNAL_DIR}/verify_v360_simulation_run_ledger_comparison.mjs" "$@"
    ;;
  verify-v360-client-notice-preview)
    require_internal verify_v360_client_notice_preview.mjs
    exec "${INTERNAL_DIR}/verify_v360_client_notice_preview.mjs" "$@"
    ;;
  verify-v360-rule-va-what-if-replay-pack)
    require_internal verify_v360_rule_va_what_if_replay_pack.mjs
    exec "${INTERNAL_DIR}/verify_v360_rule_va_what_if_replay_pack.mjs" "$@"
    ;;
  verify-v360-simulation-export-bundle)
    require_internal verify_v360_simulation_export_bundle.mjs
    exec "${INTERNAL_DIR}/verify_v360_simulation_export_bundle.mjs" "$@"
    ;;
  verify-v360-field-evidence-simulation-adapter)
    require_internal verify_v360_field_evidence_simulation_adapter.mjs
    exec "${INTERNAL_DIR}/verify_v360_field_evidence_simulation_adapter.mjs" "$@"
    ;;
  verify-v360-vlm-assisted-simulation-explanation)
    require_internal verify_v360_vlm_assisted_simulation_explanation.mjs
    exec "${INTERNAL_DIR}/verify_v360_vlm_assisted_simulation_explanation.mjs" "$@"
    ;;
  verify-v360-stabilization-release-readiness)
    require_internal verify_v360_stabilization_release_readiness.mjs
    exec "${INTERNAL_DIR}/verify_v360_stabilization_release_readiness.mjs" "$@"
    ;;
  verify-v290-final-stabilization-run)
    require_internal verify_v290_final_stabilization_run.mjs
    exec "${INTERNAL_DIR}/verify_v290_final_stabilization_run.mjs" "$@"
    ;;
  verify-v260-incident-memory-productization)
    require_internal verify_v260_incident_memory_productization.mjs
    exec "${INTERNAL_DIR}/verify_v260_incident_memory_productization.mjs" "$@"
    ;;
  verify-v260-rule-suggestion-review)
    require_internal verify_v260_rule_suggestion_review.mjs
    exec "${INTERNAL_DIR}/verify_v260_rule_suggestion_review.mjs" "$@"
    ;;
  verify-v260-onvif-credential-gate)
    require_internal verify_v260_onvif_credential_gate.mjs
    exec "${INTERNAL_DIR}/verify_v260_onvif_credential_gate.mjs" "$@"
    ;;
  verify-v260-runtime-dashboard-trends)
    require_internal verify_v260_runtime_dashboard_trends.mjs
    exec "${INTERNAL_DIR}/verify_v260_runtime_dashboard_trends.mjs" "$@"
    ;;
  verify-v260-scenario-cross-zone-reentry)
    require_internal verify_v260_scenario_cross_zone_reentry.mjs
    exec "${INTERNAL_DIR}/verify_v260_scenario_cross_zone_reentry.mjs" "$@"
    ;;
  verify-v260-owner-release-readiness)
    require_internal verify_v260_owner_release_readiness.mjs
    exec "${INTERNAL_DIR}/verify_v260_owner_release_readiness.mjs" "$@"
    ;;
  verify-v270-incident-triage-board)
    require_internal verify_v270_incident_triage_board.mjs
    exec "${INTERNAL_DIR}/verify_v270_incident_triage_board.mjs" "$@"
    ;;
  verify-v270-incident-decision-scorecard)
    require_internal verify_v270_incident_decision_scorecard.mjs
    exec "${INTERNAL_DIR}/verify_v270_incident_decision_scorecard.mjs" "$@"
    ;;
  verify-v270-operational-action-pack)
    require_internal verify_v270_operational_action_pack.mjs
    exec "${INTERNAL_DIR}/verify_v270_operational_action_pack.mjs" "$@"
    ;;
  verify-v270-rule-what-if-preview)
    require_internal verify_v270_rule_what_if_preview.mjs
    exec "${INTERNAL_DIR}/verify_v270_rule_what_if_preview.mjs" "$@"
    ;;
  verify-v270-operator-outcome-memory)
    require_internal verify_v270_operator_outcome_memory.mjs
    exec "${INTERNAL_DIR}/verify_v270_operator_outcome_memory.mjs" "$@"
    ;;
  verify-v270-owner-release-readiness)
    require_internal verify_v270_owner_release_readiness.mjs
    exec "${INTERNAL_DIR}/verify_v270_owner_release_readiness.mjs" "$@"
    ;;
  verify-v280-incident-action-readiness-queue)
    require_internal verify_v280_incident_action_readiness_queue.mjs
    exec "${INTERNAL_DIR}/verify_v280_incident_action_readiness_queue.mjs" "$@"
    ;;
  verify-v280-approval-gated-rule-draft)
    require_internal verify_v280_approval_gated_rule_draft.mjs
    exec "${INTERNAL_DIR}/verify_v280_approval_gated_rule_draft.mjs" "$@"
    ;;
  verify-v280-evidence-intake-field-readiness)
    require_internal verify_v280_evidence_intake_field_readiness.mjs
    exec "${INTERNAL_DIR}/verify_v280_evidence_intake_field_readiness.mjs" "$@"
    ;;
  verify-v280-runtime-evidence-window)
    require_internal verify_v280_runtime_evidence_window.mjs
    exec "${INTERNAL_DIR}/verify_v280_runtime_evidence_window.mjs" "$@"
    ;;
  verify-v280-client-safe-followup-digest)
    require_internal verify_v280_client_safe_followup_digest.mjs
    exec "${INTERNAL_DIR}/verify_v280_client_safe_followup_digest.mjs" "$@"
    ;;
  verify-v280-owner-release-readiness)
    require_internal verify_v280_owner_release_readiness.mjs
    exec "${INTERNAL_DIR}/verify_v280_owner_release_readiness.mjs" "$@"
    ;;
  verify-v290-owner-release-readiness)
    require_internal verify_v290_owner_release_readiness.mjs
    exec "${INTERNAL_DIR}/verify_v290_owner_release_readiness.mjs" "$@"
    ;;
  verify-actions-security)
    require_internal verify_actions_security.mjs
    exec "${INTERNAL_DIR}/verify_actions_security.mjs" "$@"
    ;;
  verify-ci-local-gate-parity)
    require_internal verify_ci_local_gate_parity.mjs
    exec "${INTERNAL_DIR}/verify_ci_local_gate_parity.mjs" "$@"
    ;;
  verify-public-repo-readiness)
    require_internal verify_public_repo_readiness.mjs
    exec "${INTERNAL_DIR}/verify_public_repo_readiness.mjs" "$@"
    ;;
  verify-post-release-reconciliation)
    require_internal verify_post_release_reconciliation.mjs
    exec "${INTERNAL_DIR}/verify_post_release_reconciliation.mjs" "$@"
    ;;
  verify-release-closeout-helper)
    require_internal verify_release_closeout_helper.mjs
    exec "${INTERNAL_DIR}/verify_release_closeout_helper.mjs" "$@"
    ;;
  verify-client-action-reduction)
    require_internal verify_client_action_reduction.mjs
    exec "${INTERNAL_DIR}/verify_client_action_reduction.mjs" "$@"
    ;;
  verify-client-live-workspace)
    require_internal verify_client_live_workspace.mjs
    exec "${INTERNAL_DIR}/verify_client_live_workspace.mjs" "$@"
    ;;
  verify-client-source-dock-events)
    require_internal verify_client_source_dock_events.mjs
    exec "${INTERNAL_DIR}/verify_client_source_dock_events.mjs" "$@"
    ;;
  verify-client-tile-disconnect)
    require_internal verify_client_tile_disconnect_contract.mjs
    exec "${INTERNAL_DIR}/verify_client_tile_disconnect_contract.mjs" "$@"
    ;;
  verify-ops-event-review-inbox)
    require_internal verify_ops_event_review_inbox.mjs
    exec "${INTERNAL_DIR}/verify_ops_event_review_inbox.mjs" "$@"
    ;;
  verify-ops-event-action-incident-workflow)
    require_internal verify_ops_event_action_incident_workflow.mjs
    exec "${INTERNAL_DIR}/verify_ops_event_action_incident_workflow.mjs" "$@"
    ;;
  verify-ops-alert-delivery-integrations)
    require_internal verify_ops_alert_delivery_integrations.mjs
    exec "${INTERNAL_DIR}/verify_ops_alert_delivery_integrations.mjs" "$@"
    ;;
  verify-v240-ops-event-route-owner-decomposition)
    require_internal verify_v240_ops_event_route_owner_decomposition.mjs
    exec "${INTERNAL_DIR}/verify_v240_ops_event_route_owner_decomposition.mjs" "$@"
    ;;
  verify-v240-evidence-inventory-mapping)
    require_internal verify_v240_evidence_inventory_mapping.mjs
    exec "${INTERNAL_DIR}/verify_v240_evidence_inventory_mapping.mjs" "$@"
    ;;
  verify-v240-release-readiness-gate)
    require_internal verify_v240_release_readiness_gate.mjs
    exec "${INTERNAL_DIR}/verify_v240_release_readiness_gate.mjs" "$@"
    ;;
  verify-v250-incident-text-projection)
    require_internal verify_v250_incident_text_projection.sh
    exec "${INTERNAL_DIR}/verify_v250_incident_text_projection.sh" "$@"
    ;;
  verify-v250-incident-memory-index)
    require_internal verify_v250_incident_memory_index.sh
    exec "${INTERNAL_DIR}/verify_v250_incident_memory_index.sh" "$@"
    ;;
  verify-v250-ops-events-semantic-search-ui)
    require_internal verify_v250_ops_events_semantic_search_ui.mjs
    exec "${INTERNAL_DIR}/verify_v250_ops_events_semantic_search_ui.mjs" "$@"
    ;;
  verify-v250-incident-timeline-graph)
    require_internal verify_v250_incident_timeline_graph.mjs
    exec "${INTERNAL_DIR}/verify_v250_incident_timeline_graph.mjs" "$@"
    ;;
  verify-v250-explainable-incident-brief)
    require_internal verify_v250_explainable_incident_brief.mjs
    exec "${INTERNAL_DIR}/verify_v250_explainable_incident_brief.mjs" "$@"
    ;;
  verify-v250-similar-incident-lookup)
    require_internal verify_v250_similar_incident_lookup.mjs
    exec "${INTERNAL_DIR}/verify_v250_similar_incident_lookup.mjs" "$@"
    ;;
  verify-v250-client-safe-incident-digest)
    require_internal verify_v250_client_safe_incident_digest.mjs
    exec "${INTERNAL_DIR}/verify_v250_client_safe_incident_digest.mjs" "$@"
    ;;
  verify-v250-redacted-incident-evidence-bundle)
    require_internal verify_v250_redacted_incident_evidence_bundle.mjs
    exec "${INTERNAL_DIR}/verify_v250_redacted_incident_evidence_bundle.mjs" "$@"
    ;;
  verify-v250-owner-release-readiness)
    require_internal verify_v250_owner_release_readiness.mjs
    exec "${INTERNAL_DIR}/verify_v250_owner_release_readiness.mjs" "$@"
    ;;
  verify-ops-scenario-builder-ui)
    require_internal verify_ops_scenario_builder_ui.mjs
    exec "${INTERNAL_DIR}/verify_ops_scenario_builder_ui.mjs" "$@"
    ;;
  verify-ops-client-shared-declutter)
    require_internal verify_ops_client_shared_declutter.mjs
    exec "${INTERNAL_DIR}/verify_ops_client_shared_declutter.mjs" "$@"
    ;;
  verify-ops-source-group-site-management)
    require_internal verify_ops_source_group_site_management.mjs
    exec "${INTERNAL_DIR}/verify_ops_source_group_site_management.mjs" "$@"
    ;;
  verify-client-tile-info-overlay-health)
    require_internal verify_client_tile_info_overlay_health.mjs
    exec "${INTERNAL_DIR}/verify_client_tile_info_overlay_health.mjs" "$@"
    ;;
  verify-client-saved-views-layout-presets)
    require_internal verify_client_saved_views_layout_presets.mjs
    exec "${INTERNAL_DIR}/verify_client_saved_views_layout_presets.mjs" "$@"
    ;;
  verify-ops-operator-incident-timeline)
    require_internal verify_ops_operator_incident_timeline.mjs
    exec "${INTERNAL_DIR}/verify_ops_operator_incident_timeline.mjs" "$@"
    ;;
  verify-server-start-modes)
    require_internal verify_server_start_modes.sh
    exec "${INTERNAL_DIR}/verify_server_start_modes.sh" "$@"
    ;;
  verify-auth-bootstrap)
    require_internal verify_auth_bootstrap.sh
    exec "${INTERNAL_DIR}/verify_auth_bootstrap.sh" "$@"
    ;;
  verify-auth-users)
    require_internal verify_auth_users.sh
    exec "${INTERNAL_DIR}/verify_auth_users.sh" "$@"
    ;;
  verify-auth-routes)
    require_internal verify_auth_routes.sh
    exec "${INTERNAL_DIR}/verify_auth_routes.sh" "$@"
    ;;
  verify-auth-ui-smoke)
    require_internal verify_auth_ui_smoke.mjs
    exec "${INTERNAL_DIR}/verify_auth_ui_smoke.mjs" "$@"
    ;;
  verify-auth-scope-picker)
    require_internal verify_auth_scope_picker.mjs
    exec "${INTERNAL_DIR}/verify_auth_scope_picker.mjs" "$@"
    ;;
  verify-auth-regression-matrix)
    require_internal verify_auth_regression_matrix.mjs
    exec "${INTERNAL_DIR}/verify_auth_regression_matrix.mjs" "$@"
    ;;
  verify-vlm-boundary)
    require_internal verify_vlm_boundary.mjs
    exec "${INTERNAL_DIR}/verify_vlm_boundary.mjs" "$@"
    ;;
  verify-vlm-selection-decision)
    require_internal verify_vlm_selection_decision.mjs
    exec "${INTERNAL_DIR}/verify_vlm_selection_decision.mjs" "$@"
    ;;
  detect-vlm-pc-capability)
    require_internal detect_vlm_pc_capability.mjs
    exec "${INTERNAL_DIR}/detect_vlm_pc_capability.mjs" "$@"
    ;;
  verify-vlm-pc-capability)
    require_internal verify_vlm_pc_capability_detector.mjs
    exec "${INTERNAL_DIR}/verify_vlm_pc_capability_detector.mjs" "$@"
    ;;
  recommend-vlm-model)
    require_internal recommend_vlm_model.mjs
    exec "${INTERNAL_DIR}/recommend_vlm_model.mjs" "$@"
    ;;
  verify-vlm-recommendation-engine)
    require_internal verify_vlm_recommendation_engine.mjs
    exec "${INTERNAL_DIR}/verify_vlm_recommendation_engine.mjs" "$@"
    ;;
  verify-vlm-install-connection-scope-gate)
    require_internal verify_vlm_install_connection_scope_gate.mjs
    exec "${INTERNAL_DIR}/verify_vlm_install_connection_scope_gate.mjs" "$@"
    ;;
  vlm-install-connection-dry-run)
    require_internal vlm_install_connection_dry_run.mjs
    exec "${INTERNAL_DIR}/vlm_install_connection_dry_run.mjs" "$@"
    ;;
  verify-vlm-install-connection-dry-run)
    require_internal verify_vlm_install_connection_dry_run.mjs
    exec "${INTERNAL_DIR}/verify_vlm_install_connection_dry_run.mjs" "$@"
    ;;
  verify-vlm-install-connection-ui)
    require_internal verify_vlm_install_connection_ui.mjs
    exec "${INTERNAL_DIR}/verify_vlm_install_connection_ui.mjs" "$@"
    ;;
  verify-vlm-profile-storage)
    require_internal verify_vlm_profile_storage.mjs
    exec "${INTERNAL_DIR}/verify_vlm_profile_storage.mjs" "$@"
    ;;
  verify-vlm-runtime-opt-in-contract)
    require_internal verify_vlm_runtime_opt_in_contract.mjs
    exec "${INTERNAL_DIR}/verify_vlm_runtime_opt_in_contract.mjs" "$@"
    ;;
  verify-vlm-local-runtime-smoke)
    require_internal verify_vlm_local_runtime_smoke.mjs
    exec "${INTERNAL_DIR}/verify_vlm_local_runtime_smoke.mjs" "$@"
    ;;
  verify-vlm-cloud-provider-field-smoke-gate)
    require_internal verify_vlm_cloud_provider_field_smoke_gate.mjs
    exec "${INTERNAL_DIR}/verify_vlm_cloud_provider_field_smoke_gate.mjs" "$@"
    ;;
  verify-v230-vlm-opt-in-operational-evidence)
    require_internal verify_v230_vlm_opt_in_operational_evidence.mjs
    exec "${INTERNAL_DIR}/verify_v230_vlm_opt_in_operational_evidence.mjs" "$@"
    ;;
  verify-vlm-queue-backpressure-stability)
    require_internal verify_vlm_queue_backpressure_stability.mjs
    exec "${INTERNAL_DIR}/verify_vlm_queue_backpressure_stability.mjs" "$@"
    ;;
  verify-vlm-runtime-status-ui)
    require_internal verify_vlm_runtime_status_ui.mjs
    exec "${INTERNAL_DIR}/verify_vlm_runtime_status_ui.mjs" "$@"
    ;;
  verify-vlm-evaluation-result-workflow)
    require_internal verify_vlm_evaluation_result_workflow.mjs
    exec "${INTERNAL_DIR}/verify_vlm_evaluation_result_workflow.mjs" "$@"
    ;;
  verify-vlm-review-action-workflow)
    require_internal verify_vlm_review_action_workflow.mjs
    exec "${INTERNAL_DIR}/verify_vlm_review_action_workflow.mjs" "$@"
    ;;
  evaluate-vlm-harness)
    require_internal evaluate_vlm_harness.mjs
    exec "${INTERNAL_DIR}/evaluate_vlm_harness.mjs" "$@"
    ;;
  verify-vlm-evaluation-harness)
    require_internal verify_vlm_evaluation_harness.mjs
    exec "${INTERNAL_DIR}/verify_vlm_evaluation_harness.mjs" "$@"
    ;;
  verify-vlm-event-evidence-extraction)
    require_internal verify_vlm_event_evidence_extraction.mjs
    exec "${INTERNAL_DIR}/verify_vlm_event_evidence_extraction.mjs" "$@"
    ;;
  verify-vlm-observation-sidecar)
    require_internal verify_vlm_observation_sidecar.mjs
    exec "${INTERNAL_DIR}/verify_vlm_observation_sidecar.mjs" "$@"
    ;;
  generate-vlm-event-explanation)
    require_internal generate_vlm_event_explanation.mjs
    exec "${INTERNAL_DIR}/generate_vlm_event_explanation.mjs" "$@"
    ;;
  verify-vlm-event-explanation-hints)
    require_internal verify_vlm_event_explanation_hints.mjs
    exec "${INTERNAL_DIR}/verify_vlm_event_explanation_hints.mjs" "$@"
    ;;
  verify-vlm-ops-event-review-ui)
    require_internal verify_vlm_ops_event_review_ui.mjs
    exec "${INTERNAL_DIR}/verify_vlm_ops_event_review_ui.mjs" "$@"
    ;;
  verify-vlm-privacy-transfer-guard)
    require_internal verify_vlm_privacy_transfer_guard.mjs
    exec "${INTERNAL_DIR}/verify_vlm_privacy_transfer_guard.mjs" "$@"
    ;;
  verify-vlm-summary-search-candidates)
    require_internal verify_vlm_summary_search_candidates.mjs
    exec "${INTERNAL_DIR}/verify_vlm_summary_search_candidates.mjs" "$@"
    ;;
  verify-vlm-rule-suggestion-candidates)
    require_internal verify_vlm_rule_suggestion_candidates.mjs
    exec "${INTERNAL_DIR}/verify_vlm_rule_suggestion_candidates.mjs" "$@"
    ;;
  verify-vlm-rule-suggestion-draft-workflow)
    require_internal verify_vlm_rule_suggestion_draft_workflow.mjs
    exec "${INTERNAL_DIR}/verify_vlm_rule_suggestion_draft_workflow.mjs" "$@"
    ;;
  verify-vlm-test-rehearsal)
    require_internal verify_vlm_test_rehearsal.mjs
    exec "${INTERNAL_DIR}/verify_vlm_test_rehearsal.mjs" "$@"
    ;;
  verify-vlm-closeout-readiness)
    require_internal verify_vlm_closeout_readiness.mjs
    exec "${INTERNAL_DIR}/verify_vlm_closeout_readiness.mjs" "$@"
    ;;
  verify-event-post)
    require_internal verify_event_post_dispatch.sh
    exec "${INTERNAL_DIR}/verify_event_post_dispatch.sh" "$@"
    ;;
  verify-integrator-contract-artifact)
    require_internal verify_integrator_contract_artifact.mjs
    exec "${INTERNAL_DIR}/verify_integrator_contract_artifact.mjs" "$@"
    ;;
  verify-event-post-longrun)
    require_internal verify_event_post_longrun.sh
    exec "${INTERNAL_DIR}/verify_event_post_longrun.sh" "$@"
    ;;
  verify-longrun-separation)
    require_internal verify_longrun_separation.mjs
    exec "${INTERNAL_DIR}/verify_longrun_separation.mjs" "$@"
    ;;
  verify-runtime-media-longrun-trigger-matrix)
    require_internal verify_runtime_media_longrun_trigger_matrix.mjs
    exec "${INTERNAL_DIR}/verify_runtime_media_longrun_trigger_matrix.mjs" "$@"
    ;;
  verify-runtime-dashboard-longrun-template)
    require_internal verify_runtime_dashboard_longrun_template.mjs
    exec "${INTERNAL_DIR}/verify_runtime_dashboard_longrun_template.mjs" "$@"
    ;;
  verify-rc-release-gate)
    require_internal verify_rc_release_gate.mjs
    exec "${INTERNAL_DIR}/verify_rc_release_gate.mjs" "$@"
    ;;
  rc-release-checklist)
    require_internal write_rc_release_checklist.mjs
    exec "${INTERNAL_DIR}/write_rc_release_checklist.mjs" "$@"
    ;;
  rc-artifact-archive)
    require_internal archive_rc_gate_artifact.mjs
    exec "${INTERNAL_DIR}/archive_rc_gate_artifact.mjs" "$@"
    ;;
  write-dependency-notice)
    require_internal write_dependency_notice.mjs
    exec "${INTERNAL_DIR}/write_dependency_notice.mjs" "$@"
    ;;
  dependency-snapshot)
    require_internal write_dependency_snapshot.mjs
    exec "${INTERNAL_DIR}/write_dependency_snapshot.mjs" "$@"
    ;;
  verify-bundle-policy)
    require_internal verify_bundle_distribution_policy.mjs
    exec "${INTERNAL_DIR}/verify_bundle_distribution_policy.mjs" "$@"
    ;;
  verify-release-bundle-dry-run)
    require_internal verify_release_bundle_dry_run.mjs
    exec "${INTERNAL_DIR}/verify_release_bundle_dry_run.mjs" "$@"
    ;;
  verify-runtime-model-bundle-rc-rehearsal)
    require_internal verify_runtime_model_bundle_rc_rehearsal.mjs
    exec "${INTERNAL_DIR}/verify_runtime_model_bundle_rc_rehearsal.mjs" "$@"
    ;;
  source-offer-checklist)
    require_internal write_source_offer_checklist.mjs
    exec "${INTERNAL_DIR}/write_source_offer_checklist.mjs" "$@"
    ;;
  verify-tracker-stability)
    require_internal verify_tracker_stability.sh
    exec "${INTERNAL_DIR}/verify_tracker_stability.sh" "$@"
    ;;
  compare-close-object-tracker)
    require_internal compare_close_object_tracker.py
    exec "${INTERNAL_DIR}/compare_close_object_tracker.py" "$@"
    ;;
  verify-close-object-fixture-matrix)
    require_internal compare_close_object_tracker.py
    exec "${INTERNAL_DIR}/compare_close_object_tracker.py" --fixture-matrix --modes off,diagnostic --fail-on-missing-fixtures --fail-on-hold "$@"
    ;;
  verify-reid-advanced-tracking)
    require_internal verify_reid_advanced_tracking_experiment.mjs
    exec "${INTERNAL_DIR}/verify_reid_advanced_tracking_experiment.mjs" "$@"
    ;;
  verify-oc-sort-benchmark-boundary)
    require_internal verify_oc_sort_benchmark_boundary.mjs
    exec "${INTERNAL_DIR}/verify_oc_sort_benchmark_boundary.mjs" "$@"
    ;;
  verify-bot-sort-deepsort-research-boundary)
    require_internal verify_bot_sort_deepsort_research_boundary.mjs
    exec "${INTERNAL_DIR}/verify_bot_sort_deepsort_research_boundary.mjs" "$@"
    ;;
  verify-yolo-layouts)
    require_internal verify_yolo_layouts.sh
    exec "${INTERNAL_DIR}/verify_yolo_layouts.sh" "$@"
    ;;
  verify-adaptive)
    require_internal verify_adaptive_tuner.sh
    exec "${INTERNAL_DIR}/verify_adaptive_tuner.sh" "$@"
    ;;
  verify-image-analysis)
    require_internal verify_image_analysis.sh
    exec "${INTERNAL_DIR}/verify_image_analysis.sh" "$@"
    ;;
  verify-analysis-state)
    require_internal verify_analysis_state_smoke.sh
    exec "${INTERNAL_DIR}/verify_analysis_state_smoke.sh" "$@"
    ;;
  verify-sse-metadata)
    require_internal va_metadata_stream_smoke.py
    exec "${INTERNAL_DIR}/va_metadata_stream_smoke.py" "$@"
    ;;
  verify-va-metadata-sidechannel)
    require_internal va_metadata_stream_smoke.py
    exec "${INTERNAL_DIR}/va_metadata_stream_smoke.py" "$@"
    ;;
  verify-webrtc-va-metadata)
    require_internal verify_webrtc_va_metadata.mjs
    exec "${INTERNAL_DIR}/verify_webrtc_va_metadata.mjs" "$@"
    ;;
  verify-va-runtime-console)
    require_internal verify_va_runtime_console.py
    exec "${INTERNAL_DIR}/verify_va_runtime_console.py" "$@"
    ;;
  verify-va-runtime-console-longrun)
    require_internal verify_va_runtime_console_longrun.py
    exec "${INTERNAL_DIR}/verify_va_runtime_console_longrun.py" "$@"
    ;;
  verify-va-runtime-console-cycles)
    require_internal verify_va_runtime_console_cycles.py
    exec "${INTERNAL_DIR}/verify_va_runtime_console_cycles.py" "$@"
    ;;
  verify-rtsp-va-overlay-policy)
    require_internal verify_rtsp_va_overlay_policy.sh
    exec "${INTERNAL_DIR}/verify_rtsp_va_overlay_policy.sh" "$@"
    ;;
  verify-ws-metadata)
    require_internal verify_ws_va_metadata.mjs
    exec "${INTERNAL_DIR}/verify_ws_va_metadata.mjs" "$@"
    ;;
  replay-va-metadata)
    require_internal replay_va_metadata.sh
    exec "${INTERNAL_DIR}/replay_va_metadata.sh" "$@"
    ;;
  verify-va-replay)
    require_internal verify_va_replay_baselines.sh
    exec "${INTERNAL_DIR}/verify_va_replay_baselines.sh" "$@"
    ;;
  verify-predev)
    require_internal verify_predev_stability.sh
    exec "${INTERNAL_DIR}/verify_predev_stability.sh" "$@"
    ;;
  summarize-reports)
    require_internal summarize_verification_reports.py
    exec "${INTERNAL_DIR}/summarize_verification_reports.py" "$@"
    ;;
  *)
    echo "알 수 없는 명령입니다: ${cmd}"
    echo
    usage
    exit 1
    ;;
esac
