# Documentation Index

이 문서는 Media Server 문서의 길잡이입니다. README에는 제품 개요와 빠른 시작만
두고, 세부 정책과 release 기준은 아래 문서에서 관리합니다.

## 먼저 볼 문서

| 목적 | 문서 |
| --- | --- |
| 설치, 빌드, 실행 | [development-guide.md](development-guide.md) |
| 운영자/클라이언트 UI | [ui-guide.md](ui-guide.md) |
| UI 풀테스트 기준/체크리스트/결과 | [manual-ui-fulltest.md](manual-ui-fulltest.md), [manual-ui-checklist.md](manual-ui-checklist.md), [manual-ui-result-template.md](manual-ui-result-template.md), [manual-ui-result-2026-05-25-ui-fulltest-restart.md](manual-ui-result-2026-05-25-ui-fulltest-restart.md) |
| 기능별 UI 필요/테스트 영역 inventory | [project-feature-test-inventory.md](project-feature-test-inventory.md) |
| RTSP/WebRTC/VA 구조 | [media-server-architecture.md](media-server-architecture.md) |
| 영상 분석, tracking, scenario | [video-analysis.md](video-analysis.md) |
| 검증 명령과 release gate | [stream-verification.md](stream-verification.md) |
| release/version 기준 | [release-policy.md](release-policy.md), [versioning-policy.md](versioning-policy.md), [release-evidence-index.md](release-evidence-index.md) |
| 현재/차기 roadmap | [development-backlog.md](development-backlog.md) |
| v2.0.0 VLM 모델 선택/PC 사양 감지 기준, 추천 엔진, 설치/연결 dry-run 및 profile 저장 | [vlm-model-selection.md](vlm-model-selection.md), [vlm-recommendation-engine.md](vlm-recommendation-engine.md), [vlm-install-connection-dry-run.md](vlm-install-connection-dry-run.md), [vlm-profile-storage.md](vlm-profile-storage.md), [development-backlog.md](development-backlog.md) |
| 영어 문서 진입점 | [en/README.md](en/README.md) |

## 현재 제품 경계

- 현재 release 준비 기준: `v1.9.0`
- 활성 차기 roadmap: `v2.0.0 VLM 기반 AI 대형 업데이트`
- 중심 범위: live source onboarding, live source health, live VA event 품질
- 기본 release 형태: source-only
- 명시적 비범위: 장기 녹화, VMS/NVR, playback/search, ONVIF Profile G
  recording/replay, Re-ID/tracker default-on, VLM default-on,
  VLM model/runtime bundle release, binary/runtime/model bundle release

상세 기준은 [development-backlog.md](development-backlog.md),
[versioning-policy.md](versioning-policy.md),
[release-policy.md](release-policy.md)를 봅니다.

v2.0.0의 활성 차기 roadmap은 [development-backlog.md](development-backlog.md)의
`활성 차기 로드맵: v2.0.0 VLM 기반 AI 대형 업데이트` 섹션에서 관리합니다. 이 항목은
개발 순서 기준 roadmap이며, 구현 완료나 release evidence가 아닙니다.

## Current Release Close-Out

v1.9.0의 현재 release close-out 기준은 [development-backlog.md](development-backlog.md)의
`v1.9.0 Release Trust Hardening Close-out` 섹션에서 관리합니다. 이 release는 새 제품
기능 확장이 아니라 release/latest/docs evidence drift와 v2.0.0 진입 전 gate drift를
막는 검증 체계 보강입니다.
Release close-out runbook과 tag/push 수동 gate는
[release-policy.md](release-policy.md)의 `v1.9.0 Release Close-out Runbook`에만
세부 순서를 둡니다.
Release evidence의 실행/미실행/미확인 색인은
[release-evidence-index.md](release-evidence-index.md)에 둡니다.
직전 UI 풀테스트 close-out 증적은 결과표 221 PASS / 0 FAIL, 30분 predev PASS,
해당 close-out 커밋의 브랜치 push 완료로 기록되어 있습니다. 120분 longrun과 main/tag/GitHub Release
publish gate는 아직 미실행이며, GitHub release URL은 publish 이후 `verify-release-metadata --published`로
확인합니다.
현재 v1.9.0 제품 회귀와 UI 풀테스트 gate는
[stream-verification.md](stream-verification.md)와
[manual-ui-checklist.md](manual-ui-checklist.md)의 버전 중립 명령만 기준으로
확인합니다.
기능별 UI 필요 여부와 테스트 영역 분류는
[project-feature-test-inventory.md](project-feature-test-inventory.md)에 두며,
이 문서는 실행 evidence가 아니라 coverage 대조 전 기준표입니다.

## 기능별 문서

| 영역 | 문서 |
| --- | --- |
| ONVIF live source | [onvif-live-source-support.md](onvif-live-source-support.md) |
| ONVIF no-device/field smoke | [onvif-no-device-verification.md](onvif-no-device-verification.md), [onvif-field-smoke-gate.md](onvif-field-smoke-gate.md) |
| ONVIF protocol/security policy | [onvif-protocol-support-matrix.md](onvif-protocol-support-matrix.md), [onvif-auth-injection-design.md](onvif-auth-injection-design.md), [onvif-credential-reference-policy.md](onvif-credential-reference-policy.md), [onvif-unsupported-api-guard.md](onvif-unsupported-api-guard.md) |
| ONVIF credential/TLS/RTSPS details | [onvif-credential-store-integration-design.md](onvif-credential-store-integration-design.md), [onvif-https-soap-transport-design.md](onvif-https-soap-transport-design.md), [onvif-https-tls-fixture-harness-design.md](onvif-https-tls-fixture-harness-design.md), [onvif-tls-transport-policy.md](onvif-tls-transport-policy.md), [onvif-rtsps-draft-policy.md](onvif-rtsps-draft-policy.md), [onvif-field-smoke-artifact-redaction.md](onvif-field-smoke-artifact-redaction.md) |
| Live source health | [live-source-health.md](live-source-health.md) |
| Event/WebRTC/SSE/WS metadata contract | [live-event-metadata-contracts.md](live-event-metadata-contracts.md) |
| VA threshold/event/report details | [analysis-threshold-baselines.md](analysis-threshold-baselines.md), [webrtc-metadata-client.md](webrtc-metadata-client.md), [close-object-report-archive-policy.md](close-object-report-archive-policy.md) |
| Integrator sample bundle | [integrator-contract-artifact.md](integrator-contract-artifact.md) |
| Runtime dashboard/scenario timeline | [scenario-timeline-debug.md](scenario-timeline-debug.md), [runtime-dashboard-longrun-evidence-template.md](runtime-dashboard-longrun-evidence-template.md) |
| Backup and restore | [ops-backup-recovery.md](ops-backup-recovery.md) |
| Config reference | [config-reference.md](config-reference.md) |
| Public repo/release readiness | [public-repo-final-review.md](public-repo-final-review.md) |
| Distribution boundary | [distribution-policy.md](distribution-policy.md) |
| Sample fixture provenance | [sample-fixture-provenance.md](sample-fixture-provenance.md) |
| UI assets/copy/visual baselines | [assets/ui/README.md](assets/ui/README.md), [product-shell-component-examples.md](product-shell-component-examples.md), [ui-empty-loading-error-copy-matrix.md](ui-empty-loading-error-copy-matrix.md), [ui-visual-release-baseline-approval-template.md](ui-visual-release-baseline-approval-template.md), [browser-use-clipboard-diagnostics.md](browser-use-clipboard-diagnostics.md) |

## Research / Experimental Boundaries

| 주제 | 문서 |
| --- | --- |
| Re-ID default-off research | [reid-default-off-research-continuation.md](reid-default-off-research-continuation.md) |
| Re-ID fixture default-on candidates | [reid-fixture-default-on-candidates.md](reid-fixture-default-on-candidates.md) |
| Re-ID event hold analysis | [reid-tracking-event-hold-analysis.md](reid-tracking-event-hold-analysis.md) |
| OC-SORT benchmark/sandbox | [oc-sort-benchmark-boundary.md](oc-sort-benchmark-boundary.md) |
| BoT-SORT/DeepSORT research | [bot-sort-deepsort-research-boundary.md](bot-sort-deepsort-research-boundary.md) |
| YouTube import/source experiment | [youtube-import.md](youtube-import.md) |

## Archive

과거 version-named standalone close-out 문서는 현재 문서 세트에서 제거했습니다.
긴 개발/검증 이력은 [development-backlog.md](development-backlog.md)의 archive
섹션에만 보관하며, 현재 release 기준이나 새 작업 source-of-truth로 쓰지 않습니다.
