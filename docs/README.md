# Documentation Index

이 문서는 Media Server 문서의 길잡이입니다. README에는 제품 개요와 빠른 시작만
두고, 세부 정책과 검증 이력은 아래 문서에서 관리합니다.

## 먼저 볼 문서

| 목적 | 문서 |
| --- | --- |
| 설치, 빌드, 실행 | [development-guide.md](development-guide.md) |
| 운영자/클라이언트 UI | [ui-guide.md](ui-guide.md) |
| UI 풀테스트 기준/체크리스트 | [manual-ui-fulltest.md](manual-ui-fulltest.md), [manual-ui-checklist.md](manual-ui-checklist.md), [manual-ui-result-template.md](manual-ui-result-template.md) |
| RTSP/WebRTC/VA 구조 | [media-server-architecture.md](media-server-architecture.md) |
| 영상 분석, tracking, scenario | [video-analysis.md](video-analysis.md) |
| 검증 명령과 release gate | [stream-verification.md](stream-verification.md) |
| release/version 기준 | [release-policy.md](release-policy.md), [versioning-policy.md](versioning-policy.md), [release-evidence-index.md](release-evidence-index.md) |
| 영어 문서 진입점 | [en/README.md](en/README.md) |

## 현재 제품 경계

- 현재 main 기준 release: `v1.8.0`
- 중심 범위: live source onboarding, live source health, live VA event 품질
- 기본 release 형태: source-only
- 명시적 비범위: 장기 녹화, VMS/NVR, playback/search, ONVIF Profile G
  recording/replay, Re-ID/tracker default-on, binary/runtime/model bundle release

상세 기준은 [development-backlog.md](development-backlog.md),
[versioning-policy.md](versioning-policy.md),
[release-policy.md](release-policy.md)를 봅니다.

## Current Release Close-Out

v1.8.0의 현재 release close-out 기준은 [development-backlog.md](development-backlog.md)의
`v1.8.0 Release Trust Hardening Close-out` 섹션에서 관리합니다. 이 release는 새 제품
기능 확장이 아니라 release/latest/docs evidence drift를 막는 검증 체계 보강입니다.
Release close-out runbook과 tag/push 수동 gate는
[release-policy.md](release-policy.md)의 `v1.8.0 Release Close-out Runbook`에만
세부 순서를 둡니다.
Release evidence의 실행/미실행/미확인 색인은
[release-evidence-index.md](release-evidence-index.md)에 둡니다.
`verify-v*` 계열은 historical release archive 보존용입니다. 현재 v1.8.0 제품
회귀와 UI 풀테스트 gate는 [stream-verification.md](stream-verification.md)와
[manual-ui-checklist.md](manual-ui-checklist.md)의 버전 중립 명령을 기준으로
확인합니다.

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

## Archive

과거 version-named close-out 문서는 증적 보존용 archive입니다. 현재 release 기준이나
새 작업 source-of-truth로 쓰지 않습니다. 긴 개발/검증 이력은
[history/development-history.md](history/development-history.md),
[history/verification-history.md](history/verification-history.md)에 보관합니다.
