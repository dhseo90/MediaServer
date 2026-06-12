# Documentation Index

이 문서는 Media Server 문서의 길잡이입니다. README에는 제품 개요와 빠른 시작만
두고, 세부 정책, release 기준, historical evidence는 이 색인에서 연결합니다.

## 먼저 볼 문서

| 목적 | 문서 |
| --- | --- |
| 설치, 빌드, 실행 | [development-guide.md](development-guide.md) |
| 설정 | [config-reference.md](config-reference.md) |
| 아키텍처 | [media-server-architecture.md](media-server-architecture.md) |
| 운영자/클라이언트 UI | [ui-guide.md](ui-guide.md) |
| 영상 분석과 scenario | [video-analysis.md](video-analysis.md) |
| 검증 명령과 release gate | [stream-verification.md](stream-verification.md) |
| 현재 release/roadmap/archive | [development-backlog.md](development-backlog.md) |
| release/version 기준 | [release-policy.md](release-policy.md), [versioning-policy.md](versioning-policy.md) |
| Release evidence의 실행/미실행/미확인 색인 | [release-evidence-index.md](release-evidence-index.md) |
| 영어 문서 진입점 | [en/README.md](en/README.md) |

## 현재 제품 경계

- 최신 공개 release: [`v2.4.0`](https://github.com/dhseo90/MediaServer/releases/tag/v2.4.0)
- 현재 release target: `v2.5.0` (GitHub Release publish 전 target이며 release 링크로 쓰지 않음)
- 활성 roadmap: `v2.5.0 Semantic Incident Memory`
- 기본 release 형태: source-only
- 중심 범위: live source onboarding, live source health, live VA event 품질,
  operator incident memory/search
- 테스트 영역: 안정화 테스트, 30분 테스트, 120분 테스트, UI 풀테스트
- 비범위: 장기 녹화, VMS/NVR, video playback/archive search,
  ONVIF Profile G recording/replay,
  Re-ID/tracker default-on, VLM default-on, VLM model/runtime bundle release,
  binary/runtime/model bundle release

## 현재 작업과 evidence

| 범위 | 문서 |
| --- | --- |
| Current Release Target / v2.5.0 semantic incident memory roadmap | [development-backlog.md](development-backlog.md)의 `활성 roadmap: v2.5.0 Semantic Incident Memory`, [release-policy.md](release-policy.md)의 `v2.5.0 Release Target Runbook`, [release-evidence-index.md](release-evidence-index.md) |
| Latest published release / v2.4.0 operator event review baseline | [development-backlog.md](development-backlog.md)의 `현재 기준: v2.4.0 Source Release Baseline`, [release-policy.md](release-policy.md), [release-evidence-index.md](release-evidence-index.md) |
| v2.5.0 S00 기준 정렬 | [development-backlog.md](development-backlog.md), [versioning-policy.md](versioning-policy.md), [release-policy.md](release-policy.md), [release-evidence-index.md](release-evidence-index.md) |
| 기능별 UI 필요/테스트 영역 inventory | [project-feature-test-inventory.md](project-feature-test-inventory.md) |
| UI 풀테스트 기준/체크리스트/결과 템플릿 | [manual-ui-fulltest.md](manual-ui-fulltest.md), [manual-ui-checklist.md](manual-ui-checklist.md), [manual-ui-result-template.md](manual-ui-result-template.md) |
| Runtime dashboard longrun evidence template | [runtime-dashboard-longrun-evidence-template.md](runtime-dashboard-longrun-evidence-template.md) |

## 기능 문서

| 영역 | 문서 |
| --- | --- |
| Live source health | [live-source-health.md](live-source-health.md) |
| Event/WebRTC/SSE/WS metadata contract | [live-event-metadata-contracts.md](live-event-metadata-contracts.md) |
| WebRTC metadata client | [webrtc-metadata-client.md](webrtc-metadata-client.md) |
| Integrator sample bundle | [integrator-contract-artifact.md](integrator-contract-artifact.md) |
| VA threshold/event/report details | [analysis-threshold-baselines.md](analysis-threshold-baselines.md), [close-object-report-archive-policy.md](close-object-report-archive-policy.md), [scenario-timeline-debug.md](scenario-timeline-debug.md) |
| Backup and restore | [ops-backup-recovery.md](ops-backup-recovery.md) |
| Distribution / public repo readiness | [distribution-policy.md](distribution-policy.md), [public-repo-final-review.md](public-repo-final-review.md) |
| Sample fixture provenance | [sample-fixture-provenance.md](sample-fixture-provenance.md) |
| External TURN/WHEP field gate | [external-turn-whep-field-gate.md](external-turn-whep-field-gate.md) |
| Runtime/model bundle RC rehearsal | [runtime-model-bundle-rc-rehearsal.md](runtime-model-bundle-rc-rehearsal.md) |

## ONVIF 문서

| 영역 | 문서 |
| --- | --- |
| Live source support | [onvif-live-source-support.md](onvif-live-source-support.md) |
| No-device / field condition | [onvif-no-device-verification.md](onvif-no-device-verification.md), [onvif-field-smoke-gate.md](onvif-field-smoke-gate.md), [onvif-field-smoke-artifact-redaction.md](onvif-field-smoke-artifact-redaction.md) |
| Protocol / unsupported guard | [onvif-protocol-support-matrix.md](onvif-protocol-support-matrix.md), [onvif-unsupported-api-guard.md](onvif-unsupported-api-guard.md) |
| Auth / credential | [onvif-auth-injection-design.md](onvif-auth-injection-design.md), [onvif-credential-reference-policy.md](onvif-credential-reference-policy.md), [onvif-credential-store-integration-design.md](onvif-credential-store-integration-design.md) |
| HTTPS / TLS / RTSPS | [onvif-https-soap-transport-design.md](onvif-https-soap-transport-design.md), [onvif-https-tls-fixture-harness-design.md](onvif-https-tls-fixture-harness-design.md), [onvif-tls-transport-policy.md](onvif-tls-transport-policy.md), [onvif-rtsps-draft-policy.md](onvif-rtsps-draft-policy.md) |

## VLM 문서

VLM 문서는 default-off 보조 계층 기준입니다. runtime/model bundle release 완료나
default-on 승격 근거로 쓰지 않습니다.

| 영역 | 문서 |
| --- | --- |
| 선택/추천/설치 | [vlm-model-selection.md](vlm-model-selection.md), [vlm-recommendation-engine.md](vlm-recommendation-engine.md), [vlm-install-connection-dry-run.md](vlm-install-connection-dry-run.md) |
| Runtime/profile/default-off | [vlm-profile-storage.md](vlm-profile-storage.md), [vlm-runtime-opt-in-contract.md](vlm-runtime-opt-in-contract.md), [vlm-local-runtime-connection-smoke.md](vlm-local-runtime-connection-smoke.md), [vlm-runtime-status-ui.md](vlm-runtime-status-ui.md) |
| Field/provider/privacy/queue | [vlm-cloud-provider-field-smoke-gate.md](vlm-cloud-provider-field-smoke-gate.md), [vlm-privacy-transfer-guard.md](vlm-privacy-transfer-guard.md), [vlm-queue-backpressure-stability.md](vlm-queue-backpressure-stability.md) |
| Evaluation/review workflow | [vlm-evaluation-harness.md](vlm-evaluation-harness.md), [vlm-evaluation-result-workflow.md](vlm-evaluation-result-workflow.md), [vlm-review-action-workflow.md](vlm-review-action-workflow.md), [vlm-ops-event-review-ui.md](vlm-ops-event-review-ui.md) |
| Evidence/observation/explanation | [vlm-event-evidence-extraction.md](vlm-event-evidence-extraction.md), [vlm-observation-sidecar.md](vlm-observation-sidecar.md), [vlm-event-explanation-hints.md](vlm-event-explanation-hints.md) |
| Search/suggestion | [vlm-summary-search-candidates.md](vlm-summary-search-candidates.md), [vlm-rule-suggestion-candidates.md](vlm-rule-suggestion-candidates.md) |
| Test/close-out | [vlm-test-rehearsal.md](vlm-test-rehearsal.md), [vlm-stabilization-longrun-ui-criteria.md](vlm-stabilization-longrun-ui-criteria.md), [vlm-close-out-readiness.md](vlm-close-out-readiness.md) |

## UI / 이미지 / 문구 문서

프로젝트 소개와 이미지 관련 문서는 v2.5.0 active target에서 현재 README 대표
이미지와 UI asset policy를 함께 확인합니다. 직접 UI 풀테스트 전에는 screenshot
검증기를 통과해도 현재 UI 직접 확인 PASS로 확대하지 않습니다.

| 영역 | 문서 |
| --- | --- |
| UI asset policy | [assets/ui/README.md](assets/ui/README.md) |
| Product shell examples | [product-shell-component-examples.md](product-shell-component-examples.md) |
| Empty/loading/error copy | [ui-empty-loading-error-copy-matrix.md](ui-empty-loading-error-copy-matrix.md) |
| Visual baseline approval | [ui-visual-release-baseline-approval-template.md](ui-visual-release-baseline-approval-template.md) |
| Browser clipboard diagnostics | [browser-use-clipboard-diagnostics.md](browser-use-clipboard-diagnostics.md) |

## v2.2.0 UI Foundation Archive

이 섹션의 문서는 완료된 v2.2.0 UI foundation 증적입니다. 현재 v2.5.0 작업의
현재 기준이 아니라, verifier와 historical evidence 보존용입니다.

| 범위 | 문서 |
| --- | --- |
| UI architecture / shell / token / primitives | [v220-ui-architecture-inventory.md](v220-ui-architecture-inventory.md), [v220-responsive-task-shell.md](v220-responsive-task-shell.md), [v220-design-token-refresh.md](v220-design-token-refresh.md), [v220-component-primitives.md](v220-component-primitives.md) |
| Workspace redesign | [v220-ops-workspace-redesign.md](v220-ops-workspace-redesign.md), [v220-rules-workspace-redesign.md](v220-rules-workspace-redesign.md), [v220-client-live-redesign.md](v220-client-live-redesign.md), [v220-auth-setup-redesign.md](v220-auth-setup-redesign.md) |
| v2.2.0 UI evidence close-out / follow-up | [v220-ops-channels-workspace.md](v220-ops-channels-workspace.md), [v220-ops-users-access-workspace.md](v220-ops-users-access-workspace.md), [v220-ops-vlm-containment.md](v220-ops-vlm-containment.md), [v220-client-preview-redaction-review.md](v220-client-preview-redaction-review.md), [v220-ui-evidence-closeout.md](v220-ui-evidence-closeout.md) |

## Historical Evidence Archive

과거 version-named standalone UI 결과와 v2.0.0 테스트 기록 문서는
[release-evidence-index.md](release-evidence-index.md)의 Test Token Usage Ledger로
병합했습니다. v2.3.0 S01~S07 evidence 정합성, UI renderer/module decomposition,
operational evidence implementation plan, integrator contract conformance 문서는
historical evidence로만 취급하며 현재 v2.5.0 완료 근거로 쓰지 않습니다. 현재 작업
기준은 이 색인, 현재 v2.5.0 roadmap, 그리고 로드맵 문서입니다.

| 범위 | 문서 |
| --- | --- |
| v2.3.0 UI renderer/module decomposition | [v230-ui-renderer-module-decomposition.md](v230-ui-renderer-module-decomposition.md) |

## Research / Experimental Boundaries

| 주제 | 문서 |
| --- | --- |
| Re-ID research | [reid-default-off-research-continuation.md](reid-default-off-research-continuation.md), [reid-fixture-default-on-candidates.md](reid-fixture-default-on-candidates.md), [reid-tracking-event-hold-analysis.md](reid-tracking-event-hold-analysis.md) |
| Tracker research | [oc-sort-benchmark-boundary.md](oc-sort-benchmark-boundary.md), [bot-sort-deepsort-research-boundary.md](bot-sort-deepsort-research-boundary.md) |
| YouTube import/source experiment | [youtube-import.md](youtube-import.md) |
