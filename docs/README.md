# Documentation Index

이 문서는 Media Server 공개 문서의 길잡이입니다. 내부 테스트 결과, release evidence
ledger, 수동 UI 결과 템플릿, Superpowers plan, 과거 UI archive 문서는 공개 첫 진입점에서
제외합니다.

## 현재 상태

- 최신 공개 GitHub Release: [`v2.4.0`](https://github.com/dhseo90/MediaServer/releases/tag/v2.4.0)
- 현재 소스 버전: `2.5.0`
- v2.5.0 공개 상태: GitHub Release와 tag는 취소되어 공개 릴리즈 링크로 안내하지 않음
- 현재 문서 재정리 기준: `v2.5.0 Semantic Incident Memory`
- 기본 공개 형태: source-only

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
