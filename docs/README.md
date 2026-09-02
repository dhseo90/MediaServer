# Documentation Index

이 문서는 Media Server 공개 문서의 길잡이입니다. 내부 테스트 결과, release evidence
ledger, 수동 UI 결과 템플릿, Superpowers plan, 과거 UI archive 문서는 공개 첫 진입점에서
제외합니다.

## 현재 상태

- 최신 공개 GitHub Release: [v4.0.0](https://github.com/dhseo90/MediaServer/releases/tag/v4.0.0)
- 최신 published baseline: `v4.0.0 Local Operations Policy and Stabilization`
- 직전 published baseline: `v3.9.1 Release Correctness and Public Repository Hygiene`
- 현재 소스 버전: `4.0.0`
- v4.0.0 공개 상태: source-only GitHub Release. Binary, runtime, model bundle은 포함하지 않음
- 현재 source roadmap: `v4.0.0 Local Operations Policy and Stabilization`
- 다음 source 개발 로드맵: `v4.1.0 Recording Foundation`. 현재는 설계/계획 단계이며
  구현·테스트·릴리즈 완료 상태가 아님
- 장기 로드맵은 `main`에서 공통 관리하며 각 버전 브랜치는 해당 버전 구현에만 집중하고
  후속 버전 절은 stable contract 설계 문맥으로 상속함
- 현재 장기 로드맵은 v4.1.0 변경에 포함하며 v4.1.0 머지 때 `main`에 공통 반영
- 의도된 공개용 영문 문서를 제외한 프로젝트 문서의 기본 언어는 한글
- 기본 공개 형태: source-only
- 대표 이미지는 2026-08-31에 source `4.0.0` / 당시 published `v3.9.1` 기준으로 v3.8.0
  구도를 참고해 다시 캡처했습니다. `config/docs_ui_assets.json`과
  `./server.sh verify-docs-ui-assets`로 관리하며 UI 풀테스트나 GitHub Release 증거가
  아닙니다. 정책은 [assets/ui/README.md](assets/ui/README.md)입니다.

## 먼저 볼 문서

| 목적 | 문서 |
| --- | --- |
| 제품 개요와 빠른 시작 | [../README.md](../README.md), [../README.en.md](../README.en.md) |
| 설치, 빌드, 실행 | [development-guide.md](development-guide.md) |
| 설정 | [config-reference.md](config-reference.md) |
| 운영자/클라이언트 UI | [ui-guide.md](ui-guide.md) |
| RTSP/WebRTC/VA 구조 | [media-server-architecture.md](media-server-architecture.md) |
| 영상 분석과 scenario | [video-analysis.md](video-analysis.md) |
| 검증 명령 | [stream-verification.md](stream-verification.md) |
| 버전과 release 정책 | [versioning-policy.md](versioning-policy.md), [release-policy.md](release-policy.md) |
| 현재 roadmap 요약 | [development-backlog.md](development-backlog.md) |
| v4.1.0~v4.9.0 녹화·검색 로드맵 | [v410-v49-recording-search-roadmap.md](v410-v49-recording-search-roadmap.md) |
| v4.1.0 녹화 기반 상세 구현계획 | [superpowers/plans/2026-09-02-v410-recording-foundation-implementation-plan.md](superpowers/plans/2026-09-02-v410-recording-foundation-implementation-plan.md) |
| v4.0.0 release notes | [release-artifacts/v4.0.0/release-notes.md](release-artifacts/v4.0.0/release-notes.md) |
| v3.9.1 release notes | [release-artifacts/v3.9.1/release-notes.md](release-artifacts/v3.9.1/release-notes.md) |
| v3.9.0 release notes | [release-artifacts/v3.9.0/release-notes.md](release-artifacts/v3.9.0/release-notes.md) |
| 영어 문서 진입점 | [en/README.md](en/README.md) |

## 공개 문서 전체 목록

### 운영과 배포

| 문서 | 내용 |
| --- | --- |
| [development-guide.md](development-guide.md) | 개발 환경, 설치, 빌드, 실행, 기본 검증 |
| [config-reference.md](config-reference.md) | 서버, RTSP/WebRTC, source, VA, event storage 설정 |
| [distribution-policy.md](distribution-policy.md) | source-only, bundle, container 배포 경계 |
| [release-policy.md](release-policy.md) | release 권한, tag, GitHub Release, not-run 경계 |
| [versioning-policy.md](versioning-policy.md) | 소스 버전, 공개 릴리즈, semver 기준 |
| [public-repo-final-review.md](public-repo-final-review.md) | 공개 저장소 점검 기준 |
| [ops-backup-recovery.md](ops-backup-recovery.md) | 운영 설정 백업과 복구 |
| [sample-fixture-provenance.md](sample-fixture-provenance.md) | sample fixture 공개 판단 |
| [runtime-model-bundle-rc-rehearsal.md](runtime-model-bundle-rc-rehearsal.md) | runtime/model bundle RC rehearsal 경계 |

### 제품 UI와 문구

| 문서 | 내용 |
| --- | --- |
| [ui-guide.md](ui-guide.md) | Auth, Ops, Client UI 구조 |
| [assets/ui/README.md](assets/ui/README.md) | README/UI guide screenshot 정책 |
| [product-shell-component-examples.md](product-shell-component-examples.md) | 제품 shell component 예시 |
| [ui-empty-loading-error-copy-matrix.md](ui-empty-loading-error-copy-matrix.md) | 빈 상태, 로딩, 오류 문구 |
| [browser-use-clipboard-diagnostics.md](browser-use-clipboard-diagnostics.md) | browser clipboard 진단 경계 |

### 미디어, 이벤트, 메타데이터

| 문서 | 내용 |
| --- | --- |
| [media-server-architecture.md](media-server-architecture.md) | 서버 구조와 요청 흐름 |
| [stream-verification.md](stream-verification.md) | 검증 명령과 테스트 영역 경계 |
| [video-analysis.md](video-analysis.md) | VA pipeline, rule, scenario, metadata |
| [event-evidence-contract.md](event-evidence-contract.md) | v3.0 Event Evidence Contract와 FrameRef/retention/non-VMS 경계 |
| [v310-encoded-event-clip-contract.md](v310-encoded-event-clip-contract.md) | v3.1 Encoded Event Clip Contract와 FrameRef/PTS/non-VMS 경계 |
| [event-feature-schema-privacy.md](event-feature-schema-privacy.md) | v3.0 FeatureSet schema와 비식별 privacy guard |
| [v300-search-dsl-query-convert.md](v300-search-dsl-query-convert.md) | v3.0 Search DSL/query convert 경계 |
| [v300-feature-search-index.md](v300-feature-search-index.md) | v3.0 Feature/Search Index와 stale result guard 경계 |
| [v300-retention-pin-cleanup.md](v300-retention-pin-cleanup.md) | v3.0 Retention/Pin/Cleanup lifecycle와 audit 경계 |
| [analysis-threshold-baselines.md](analysis-threshold-baselines.md) | 분석 threshold baseline |
| [live-source-health.md](live-source-health.md#operator-runbook-and-reliability-handoff) | live source health 상태 모델과 source reliability operator runbook |
| [live-event-metadata-contracts.md](live-event-metadata-contracts.md) | Event POST, WebRTC, SSE, WS metadata contract |
| [webrtc-metadata-client.md](webrtc-metadata-client.md) | WebRTC VA metadata client |
| [close-object-report-archive-policy.md](close-object-report-archive-policy.md) | close-object report 보관 정책 |
| [scenario-timeline-debug.md](scenario-timeline-debug.md) | scenario timeline debug field |
| [integrator-contract-artifact.md](integrator-contract-artifact.md) | integrator sample bundle contract |

### ONVIF

실기기 성공은 기본 공개 릴리즈 PASS가 아닙니다. 운영/검증 경계와 설계 초안을
나눕니다.

운영/검증 경계:

- [onvif-live-source-support.md](onvif-live-source-support.md)
- [onvif-no-device-verification.md](onvif-no-device-verification.md)
- [onvif-field-smoke-gate.md](onvif-field-smoke-gate.md)
- [onvif-field-smoke-artifact-redaction.md](onvif-field-smoke-artifact-redaction.md)
- [onvif-protocol-support-matrix.md](onvif-protocol-support-matrix.md)
- [onvif-unsupported-api-guard.md](onvif-unsupported-api-guard.md)
- [onvif-credential-reference-policy.md](onvif-credential-reference-policy.md)
- [onvif-tls-transport-policy.md](onvif-tls-transport-policy.md)
- [onvif-rtsps-draft-policy.md](onvif-rtsps-draft-policy.md)

설계 초안 (default-off, 제품 PASS 아님):

- [onvif-auth-injection-design.md](onvif-auth-injection-design.md)
- [onvif-credential-store-integration-design.md](onvif-credential-store-integration-design.md)
- [onvif-https-soap-transport-design.md](onvif-https-soap-transport-design.md)
- [onvif-https-tls-fixture-harness-design.md](onvif-https-tls-fixture-harness-design.md)

### VLM Default-off 보조 기능

VLM은 제품 default-on이 아닙니다. 선택/연결, runtime opt-in, 검토, 힌트 문서로
나눕니다.

선택과 연결:

- [vlm-model-selection.md](vlm-model-selection.md)
- [vlm-recommendation-engine.md](vlm-recommendation-engine.md)
- [vlm-install-connection-dry-run.md](vlm-install-connection-dry-run.md)
- [vlm-local-runtime-connection-smoke.md](vlm-local-runtime-connection-smoke.md)

runtime opt-in:

- [vlm-runtime-opt-in-contract.md](vlm-runtime-opt-in-contract.md)
- [vlm-runtime-status-ui.md](vlm-runtime-status-ui.md)
- [vlm-profile-storage.md](vlm-profile-storage.md)
- [vlm-privacy-transfer-guard.md](vlm-privacy-transfer-guard.md)
- [vlm-cloud-provider-field-smoke-gate.md](vlm-cloud-provider-field-smoke-gate.md)
- [vlm-queue-backpressure-stability.md](vlm-queue-backpressure-stability.md)
- [v300-vlm-feature-queue.md](v300-vlm-feature-queue.md)
- [v300-feature-only-retention.md](v300-feature-only-retention.md)

검토와 평가:

- [vlm-evaluation-harness.md](vlm-evaluation-harness.md)
- [vlm-evaluation-result-workflow.md](vlm-evaluation-result-workflow.md)
- [vlm-review-action-workflow.md](vlm-review-action-workflow.md)
- [vlm-ops-event-review-ui.md](vlm-ops-event-review-ui.md)

힌트와 후보:

- [vlm-event-evidence-extraction.md](vlm-event-evidence-extraction.md)
- [vlm-observation-sidecar.md](vlm-observation-sidecar.md)
- [vlm-event-explanation-hints.md](vlm-event-explanation-hints.md)
- [vlm-summary-search-candidates.md](vlm-summary-search-candidates.md)
- [vlm-rule-suggestion-candidates.md](vlm-rule-suggestion-candidates.md)

### 실험과 연구 경계

| 문서 | 내용 |
| --- | --- |
| [external-turn-whep-field-gate.md](external-turn-whep-field-gate.md) | external TURN/WHEP field gate |
| [youtube-import.md](youtube-import.md) | YouTube import/source lab-only 경계 |
| [reid-default-off-research-continuation.md](reid-default-off-research-continuation.md) | Re-ID default-off 연구 지속 조건 |
| [reid-fixture-default-on-candidates.md](reid-fixture-default-on-candidates.md) | Re-ID fixture 후보 |
| [reid-tracking-event-hold-analysis.md](reid-tracking-event-hold-analysis.md) | Re-ID tracking event hold 분석 |
| [oc-sort-benchmark-boundary.md](oc-sort-benchmark-boundary.md) | OC-SORT benchmark 경계 |
| [bot-sort-deepsort-research-boundary.md](bot-sort-deepsort-research-boundary.md) | BoT-SORT/DeepSORT 연구 경계 |

## 공개 색인에서 제외한 문서

다음 문서는 저장소에 남아 있어도 공개 첫 진입점의 안내 대상이 아닙니다.

- release evidence ledger, 수동 UI checklist/result/template, runtime dashboard longrun template
- VLM close-out readiness, VLM test rehearsal, stabilization/longrun/UI criteria 같은 history/test 기준 문서
- v2.2.0/v2.3.0 standalone UI archive 문서
- `.media_server.test/*`, `test/fixtures/*`, `docs/superpowers/*`
