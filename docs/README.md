# Documentation Index

이 문서는 Media Server 공개 문서의 길잡이입니다. 내부 테스트 결과, release evidence
ledger, 수동 UI 결과 템플릿, Superpowers plan, 과거 UI archive 문서는 공개 첫 진입점에서
제외합니다.

## 현재 상태

- 최신 공개 GitHub Release: [`v3.1.0`](https://github.com/dhseo90/MediaServer/releases/tag/v3.1.0)
- 최신 published baseline: `v3.1.0 Encoded Event Clip and Safe Sharing Expansion`
- 직전 published baseline: `v3.0.0 Event Evidence Search MVP`
- 현재 소스 버전: `3.2.0`
- v3.1.0 공개 상태: source-only GitHub Release. Binary, runtime, model bundle은 포함하지 않음
- 현재 source roadmap: `v3.2.0 Operations Resolution Workspace`
- 기본 공개 형태: source-only
- 공개 문서/대표 asset 기준: `README.md`, `README.en.md`, `docs/README.md`,
  `docs/en/README.md`, `docs/ui-guide.md`, `docs/assets/ui/README.md`는 v3.2
  source roadmap과 v3.1 published baseline을 분리하고 직전 v3.0 baseline은
  historical reference로 유지합니다. 대표 이미지는
  `config/docs_ui_assets.json`과 `./server.sh verify-docs-ui-assets`로 관리하고,
  교체 시 직접 이미지 검수 기록을 별도로 남깁니다.

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
| 영어 문서 진입점 | [en/README.md](en/README.md) |

## 공개 문서 전체 목록

### 운영과 배포

| 문서 | 내용 |
| --- | --- |
| [development-guide.md](development-guide.md) | 개발 환경, 설치, 빌드, 실행, 기본 검증 |
| [config-reference.md](config-reference.md) | 서버, RTSP/WebRTC, source, VA, event storage 설정 |
| [distribution-policy.md](distribution-policy.md) | source-only, bundle, container 배포 경계 |
| [release-policy.md](release-policy.md) | release 권한, tag, GitHub Release, not-run 경계 |
| [release-test-records.md](release-test-records.md) | 릴리즈 테스트 항목과 버전별 pass/fail 기록 |
| [versioning-policy.md](versioning-policy.md) | 소스 버전, 공개 릴리즈, semver 기준 |
| [public-repo-final-review.md](public-repo-final-review.md) | 공개 저장소 점검 기준 |
| [superpowers/specs/2026-06-20-v300-v310-event-evidence-search-roadmap-design.md](superpowers/specs/2026-06-20-v300-v310-event-evidence-search-roadmap-design.md) | v3.0/v3.1 event evidence search roadmap design |
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
| [project-feature-test-inventory.md](project-feature-test-inventory.md) | 기능별 테스트 영역 inventory. 실행 evidence가 아니라 coverage 기준 |
| [video-analysis.md](video-analysis.md) | VA pipeline, rule, scenario, metadata |
| [event-evidence-contract.md](event-evidence-contract.md) | v3.0 Event Evidence Contract와 FrameRef/retention/non-VMS 경계 |
| [v310-encoded-event-clip-contract.md](v310-encoded-event-clip-contract.md) | v3.1 Encoded Event Clip Contract와 FrameRef/PTS/non-VMS 경계 |
| [event-feature-schema-privacy.md](event-feature-schema-privacy.md) | v3.0 FeatureSet schema와 비식별 privacy guard |
| [v300-search-dsl-query-convert.md](v300-search-dsl-query-convert.md) | v3.0 Search DSL/query convert 경계 |
| [v300-feature-search-index.md](v300-feature-search-index.md) | v3.0 Feature/Search Index와 stale result guard 경계 |
| [v300-retention-pin-cleanup.md](v300-retention-pin-cleanup.md) | v3.0 Retention/Pin/Cleanup lifecycle와 audit 경계 |
| [analysis-threshold-baselines.md](analysis-threshold-baselines.md) | 분석 threshold baseline |
| [live-source-health.md](live-source-health.md) | live source health 상태 모델 |
| [live-event-metadata-contracts.md](live-event-metadata-contracts.md) | Event POST, WebRTC, SSE, WS metadata contract |
| [webrtc-metadata-client.md](webrtc-metadata-client.md) | WebRTC VA metadata client |
| [close-object-report-archive-policy.md](close-object-report-archive-policy.md) | close-object report 보관 정책 |
| [scenario-timeline-debug.md](scenario-timeline-debug.md) | scenario timeline debug field |
| [integrator-contract-artifact.md](integrator-contract-artifact.md) | integrator sample bundle contract |

### ONVIF

| 문서 | 내용 |
| --- | --- |
| [onvif-live-source-support.md](onvif-live-source-support.md) | ONVIF live source 지원 범위 |
| [onvif-no-device-verification.md](onvif-no-device-verification.md) | 실기기 없는 검증 경계 |
| [onvif-field-smoke-gate.md](onvif-field-smoke-gate.md) | 실기기 field smoke gate |
| [onvif-field-smoke-artifact-redaction.md](onvif-field-smoke-artifact-redaction.md) | field smoke artifact redaction |
| [onvif-protocol-support-matrix.md](onvif-protocol-support-matrix.md) | ONVIF protocol support matrix |
| [onvif-unsupported-api-guard.md](onvif-unsupported-api-guard.md) | unsupported API guard |
| [onvif-auth-injection-design.md](onvif-auth-injection-design.md) | auth injection design |
| [onvif-credential-reference-policy.md](onvif-credential-reference-policy.md) | credential reference policy |
| [onvif-credential-store-integration-design.md](onvif-credential-store-integration-design.md) | credential store integration design |
| [onvif-https-soap-transport-design.md](onvif-https-soap-transport-design.md) | HTTPS SOAP transport design |
| [onvif-https-tls-fixture-harness-design.md](onvif-https-tls-fixture-harness-design.md) | HTTPS/TLS fixture harness |
| [onvif-tls-transport-policy.md](onvif-tls-transport-policy.md) | TLS transport policy |
| [onvif-rtsps-draft-policy.md](onvif-rtsps-draft-policy.md) | RTSPS draft policy |

### VLM Default-off 보조 기능

| 문서 | 내용 |
| --- | --- |
| [vlm-model-selection.md](vlm-model-selection.md) | VLM 후보와 선택 기준 |
| [vlm-recommendation-engine.md](vlm-recommendation-engine.md) | PC 사양별 추천 기준 |
| [vlm-install-connection-dry-run.md](vlm-install-connection-dry-run.md) | 설치/연결 dry-run contract |
| [vlm-local-runtime-connection-smoke.md](vlm-local-runtime-connection-smoke.md) | local runtime loopback smoke |
| [vlm-runtime-opt-in-contract.md](vlm-runtime-opt-in-contract.md) | runtime opt-in contract |
| [vlm-runtime-status-ui.md](vlm-runtime-status-ui.md) | runtime status UI |
| [vlm-profile-storage.md](vlm-profile-storage.md) | profile storage |
| [vlm-privacy-transfer-guard.md](vlm-privacy-transfer-guard.md) | privacy/transfer guard |
| [vlm-cloud-provider-field-smoke-gate.md](vlm-cloud-provider-field-smoke-gate.md) | cloud provider field smoke gate |
| [vlm-queue-backpressure-stability.md](vlm-queue-backpressure-stability.md) | queue/backpressure stability |
| [v300-vlm-feature-queue.md](v300-vlm-feature-queue.md) | v3.0 VLM feature queue |
| [v300-feature-only-retention.md](v300-feature-only-retention.md) | v3.0 feature-only retention |
| [vlm-evaluation-harness.md](vlm-evaluation-harness.md) | evaluation harness |
| [vlm-evaluation-result-workflow.md](vlm-evaluation-result-workflow.md) | evaluation result workflow |
| [vlm-review-action-workflow.md](vlm-review-action-workflow.md) | review action workflow |
| [vlm-ops-event-review-ui.md](vlm-ops-event-review-ui.md) | Ops event review UI |
| [vlm-event-evidence-extraction.md](vlm-event-evidence-extraction.md) | event evidence extraction |
| [vlm-observation-sidecar.md](vlm-observation-sidecar.md) | observation sidecar |
| [vlm-event-explanation-hints.md](vlm-event-explanation-hints.md) | explanation and false-positive hints |
| [vlm-summary-search-candidates.md](vlm-summary-search-candidates.md) | summary/search candidates |
| [vlm-rule-suggestion-candidates.md](vlm-rule-suggestion-candidates.md) | rule suggestion candidates |

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
