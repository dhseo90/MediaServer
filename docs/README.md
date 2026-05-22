# Documentation Index

이 문서는 Media Server 문서의 길잡이입니다. README에는 제품 개요와 빠른 시작만
두고, 세부 정책과 검증 이력은 아래 문서에서 관리합니다.

## 먼저 볼 문서

| 목적 | 문서 |
| --- | --- |
| 설치, 빌드, 실행 | [development-guide.md](development-guide.md) |
| 운영자/클라이언트 UI | [ui-guide.md](ui-guide.md) |
| RTSP/WebRTC/VA 구조 | [media-server-architecture.md](media-server-architecture.md) |
| 영상 분석, tracking, scenario | [video-analysis.md](video-analysis.md) |
| 검증 명령과 release gate | [stream-verification.md](stream-verification.md) |
| release/version 기준 | [release-policy.md](release-policy.md), [versioning-policy.md](versioning-policy.md), [release-evidence-index.md](release-evidence-index.md) |
| 영어 문서 진입점 | [en/README.md](en/README.md) |

## 현재 제품 경계

- 현재 main 기준 release: `v1.7.0`
- 중심 범위: live source onboarding, live source health, live VA event 품질
- 기본 release 형태: source-only
- 명시적 비범위: 장기 녹화, VMS/NVR, playback/search, ONVIF Profile G
  recording/replay, Re-ID/tracker default-on, binary/runtime/model bundle release

상세 기준은 [development-backlog.md](development-backlog.md),
[versioning-policy.md](versioning-policy.md),
[release-policy.md](release-policy.md)를 봅니다.

## Active Roadmap

v1.8.0의 활성 차기 로드맵은 [development-backlog.md](development-backlog.md)의
`v1.8.0 Release Trust Hardening` 섹션에서 관리합니다. 이 로드맵은 새 제품 기능
확장이 아니라 release/latest/docs evidence drift를 막는 검증 체계 보강입니다.
Release close-out runbook과 tag/push 수동 gate는
[release-policy.md](release-policy.md)의 `v1.8.0 Release Close-out Runbook`에만
세부 순서를 둡니다.
Release evidence의 실행/미실행/미확인 색인은
[release-evidence-index.md](release-evidence-index.md)에 둡니다.

## 기능별 문서

| 영역 | 문서 |
| --- | --- |
| ONVIF live source | [onvif-live-source-support.md](onvif-live-source-support.md) |
| ONVIF no-device/field smoke | [onvif-no-device-verification.md](onvif-no-device-verification.md), [onvif-field-smoke-gate.md](onvif-field-smoke-gate.md) |
| Live source health | [live-source-health.md](live-source-health.md) |
| Event/WebRTC/SSE/WS metadata contract | [live-event-metadata-contracts.md](live-event-metadata-contracts.md) |
| Integrator sample bundle | [integrator-contract-artifact.md](integrator-contract-artifact.md) |
| Runtime dashboard/scenario timeline | [scenario-timeline-debug.md](scenario-timeline-debug.md) |
| Backup and restore | [ops-backup-recovery.md](ops-backup-recovery.md) |
| Config reference | [config-reference.md](config-reference.md) |
| Public repo/release readiness | [public-repo-final-review.md](public-repo-final-review.md) |
| Distribution boundary | [distribution-policy.md](distribution-policy.md) |
| Sample fixture provenance | [sample-fixture-provenance.md](sample-fixture-provenance.md) |

## Research / Experimental Boundaries

| 주제 | 문서 |
| --- | --- |
| Re-ID default-off research | [reid-default-off-research-continuation.md](reid-default-off-research-continuation.md) |
| Re-ID fixture default-on candidates | [reid-fixture-default-on-candidates.md](reid-fixture-default-on-candidates.md) |
| OC-SORT benchmark/sandbox | [oc-sort-benchmark-boundary.md](oc-sort-benchmark-boundary.md) |
| BoT-SORT/DeepSORT research | [bot-sort-deepsort-research-boundary.md](bot-sort-deepsort-research-boundary.md) |
| YouTube import/source experiment | [youtube-import.md](youtube-import.md) |

## v1.7.0 Release Close-out

v1.7.0의 현재 release close-out 기준은 [development-backlog.md](development-backlog.md)의
`v1.7.0 UI-first Close-out` 섹션입니다. 세부 historical evidence는 아래 v1.6.0
섹션에 보존합니다.

## v1.6.0 Historical Release Evidence

아래 문서는 release close-out 증적입니다. README나 일반 색인에 모든 세부 검증을
풀어 쓰지 않고, 이 섹션에서만 모아 둡니다.

- Release evidence dashboard:
  [v1.6.0-release-evidence-dashboard.md](v1.6.0-release-evidence-dashboard.md),
  `verify-v160-release-evidence-dashboard`
- Stability gate 분리:
  [v1.6.0-stability-verification-gates.md](v1.6.0-stability-verification-gates.md),
  `verify-v160-stability-verification-gate`
- Client/debug 비노출 guard:
  [v1.6.0-debug-exposure-regression-guard.md](v1.6.0-debug-exposure-regression-guard.md),
  `verify-v160-debug-exposure-regression-guard`
- Tracker/Re-ID opt-in close-out:
  [v1.6.0-tracker-reid-opt-in-closeout.md](v1.6.0-tracker-reid-opt-in-closeout.md),
  `verify-v160-tracker-reid-opt-in-closeout`
- ONVIF field evidence reconciliation:
  [v1.6.0-onvif-field-smoke-evidence-reconciliation.md](v1.6.0-onvif-field-smoke-evidence-reconciliation.md),
  `verify-v160-onvif-field-smoke-evidence-reconciliation`
- Audit/export masking guard:
  [v1.6.0-audit-export-masking-regression-hardening.md](v1.6.0-audit-export-masking-regression-hardening.md),
  `verify-v160-audit-export-masking-regression-hardening`
- Runtime/model bundle RC policy:
  [v1.6.0-runtime-model-bundle-rc-policy.md](v1.6.0-runtime-model-bundle-rc-policy.md),
  `verify-v160-runtime-model-bundle-rc-policy`
- Manual UI checklist closure:
  [v1.6.0-manual-ui-release-checklist-closure.md](v1.6.0-manual-ui-release-checklist-closure.md),
  `verify-v160-manual-ui-release-checklist-closure`
- Public docs consistency:
  [v1.6.0-public-docs-consistency-polish.md](v1.6.0-public-docs-consistency-polish.md),
  `verify-v160-public-docs-consistency-polish`
- Tracker benchmark planning only:
  [v1.6.0-tracker-benchmark-harness-planning.md](v1.6.0-tracker-benchmark-harness-planning.md),
  `verify-v160-tracker-benchmark-harness-planning`

## Historical Close-Out

| Version | 문서 |
| --- | --- |
| v1.2.1 | [v1.2.1-follow-up-closure.md](v1.2.1-follow-up-closure.md) |
| v1.3.0 | [v1.3.0-follow-up-closure.md](v1.3.0-follow-up-closure.md) |
| v1.4.0 | [v1.4.0-follow-up-closure.md](v1.4.0-follow-up-closure.md) |
| v1.5.0 | [v1.5.0-follow-up-closure.md](v1.5.0-follow-up-closure.md) |

긴 개발/검증 이력은 [history/development-history.md](history/development-history.md),
[history/verification-history.md](history/verification-history.md)에 보관합니다.
