# 문서 안내

설치·운영·개발·유지보수 목적에 따라 필요한 문서를 선택하세요.
제품 개요와 빠른 시작은 [README](../README.md), 영문 안내는
[English README](../README.en.md)와 [영문 색인](en/README.md)에 있습니다.
공개 버전은 [GitHub Releases](https://github.com/dhseo90/MediaServer/releases/latest)에서 확인할 수 있습니다.

| 독자 | 시작점 |
| --- | --- |
| 설치자 | [설치·빌드·실행](#설치자-설치와-실행) |
| 운영자 | [채널·분석·녹화·복구](#운영자-설정과-화면-사용) |
| 개발자 | [구조·API·연동 계약](#개발자-구조와-연동) |
| 유지보수자 | [검증·배포·향후 개발](#유지보수자-검증과-배포) |

## 설치자: 설치와 실행

| 할 일 | 문서 |
| --- | --- |
| macOS/Linux 의존성 설치, 빌드, 서버 실행 | [개발 가이드](development-guide.md) |
| 포트, 인증, 입력과 저장 경로 설정 | [설정 참조](config-reference.md) |
| 소스 배포 범위와 선택 배포 형식 확인 | [배포 정책](distribution-policy.md) |
| 라이선스와 모델·런타임 별도 조건 확인 | [LICENSE](../LICENSE), [THIRD_PARTY_NOTICES](../THIRD_PARTY_NOTICES.md) |

## 운영자: 설정과 화면 사용

| 할 일 | 문서 |
| --- | --- |
| 초기 관리자 설정, 역할·권한, Ops/Client 화면 사용 | [UI 가이드](ui-guide.md) |
| 상시·이벤트 녹화 설정, 타임라인 조회와 재생 | [녹화 설정](config-reference.md#recording-env), [녹화 조회·재생](ui-guide.md#녹화-조회와-재생-v410-s06) |
| 분석 룰과 시나리오 설정 | [영상 분석](video-analysis.md), [분석 임계값 기준](analysis-threshold-baselines.md) |
| 라이브 입력 장애 진단과 인계 | [입력 상태와 source reliability operator runbook](live-source-health.md#operator-runbook-and-reliability-handoff) |
| 운영 설정 백업과 복구 | [백업·복구 가이드](ops-backup-recovery.md) |
| ONVIF 입력의 지원 범위 확인 | [라이브 입력 지원](onvif-live-source-support.md), [프로토콜 지원 표](onvif-protocol-support-matrix.md) |

녹화는 용량 제한에 따른 순환 보존과 역할·채널 권한을 적용합니다.
자연어 영상 검색은 [후속 로드맵](v410-v49-recording-search-roadmap.md)이며,
현재 기능은 완성형 VMS/NVR이나 무기한 영상 보관을 보장하지 않습니다.

## 개발자: 구조와 연동

### 서버·미디어·이벤트 계약

| 분야 | 문서 |
| --- | --- |
| RTSP/WebRTC/VA 구조와 요청 흐름 | [서버 구조](media-server-architecture.md) |
| Event POST, WebRTC, SSE, WS 메타데이터 | [공개 메타데이터 계약](live-event-metadata-contracts.md), [WebRTC 클라이언트](webrtc-metadata-client.md), [연동 샘플 계약](integrator-contract-artifact.md) |
| 이벤트 근거와 인코딩 클립 | [Event Evidence와 FrameRef](event-evidence-contract.md), [Encoded Event Clip과 PTS](v310-encoded-event-clip-contract.md) |
| FeatureSet·검색·개인정보 경계 | [스키마와 privacy guard](event-feature-schema-privacy.md), [Search DSL](v300-search-dsl-query-convert.md), [Feature/Search Index](v300-feature-search-index.md) |
| 보존·pin·정리와 보고서 보관 | [Retention/Pin/Cleanup](v300-retention-pin-cleanup.md), [close-object 보고서 정책](close-object-report-archive-policy.md) |
| 분석 진단 | [시나리오 타임라인 진단 필드](scenario-timeline-debug.md) |
| 제품 UI 구현 | [공통 컴포넌트 예시](product-shell-component-examples.md), [빈 상태·로딩·오류 문구](ui-empty-loading-error-copy-matrix.md), [클립보드 진단](browser-use-clipboard-diagnostics.md) |

### ONVIF 연동

실기기 연결의 검증 범위는 아래 gate를 따릅니다. 장치 없는 검사나 설계 초안은
실기기 성공을 뜻하지 않습니다.

- 검증: [장치 없는 검사](onvif-no-device-verification.md),
  [현장 smoke gate](onvif-field-smoke-gate.md), [결과 비식별화](onvif-field-smoke-artifact-redaction.md).
- 안전 경계: [미지원 API 차단](onvif-unsupported-api-guard.md),
  [인증정보 참조](onvif-credential-reference-policy.md), [TLS 전송](onvif-tls-transport-policy.md),
  [RTSPS 초안](onvif-rtsps-draft-policy.md).
- 전송·인증의 구현 조건과 미구현 경계: [인증 주입](onvif-auth-injection-design.md),
  [인증정보 저장소 연동](onvif-credential-store-integration-design.md),
  [HTTPS SOAP 전송](onvif-https-soap-transport-design.md),
  [HTTPS/TLS fixture harness](onvif-https-tls-fixture-harness-design.md).

HTTP Basic은 provider를 명시적으로 연결한 경로에서만, HTTPS SOAP는 OpenSSL 빌드에서 지원합니다.
제품 UI가 카메라 endpoint를 자동 탐색·probe하거나 영구 secret store를 제공한다는 뜻은 아닙니다.

### VLM 보조 기능

VLM은 기본 비활성입니다. 모델 선택, runtime opt-in, 검토와 후보 생성의 경계를
각 문서에서 확인하세요.

- 선택·연결: [모델 선택](vlm-model-selection.md), [PC 사양별 추천 기준](vlm-recommendation-engine.md),
  [설치·연결 dry-run](vlm-install-connection-dry-run.md), [로컬 runtime smoke](vlm-local-runtime-connection-smoke.md).
- 실행·저장: [opt-in 계약](vlm-runtime-opt-in-contract.md), [상태 UI](vlm-runtime-status-ui.md),
  [프로필 저장](vlm-profile-storage.md), [개인정보 전송 guard](vlm-privacy-transfer-guard.md),
  [클라우드 provider gate](vlm-cloud-provider-field-smoke-gate.md).
- 큐·보존: [backpressure 안정성](vlm-queue-backpressure-stability.md),
  [feature 큐](v300-vlm-feature-queue.md), [feature-only 보존](v300-feature-only-retention.md).
- 평가·검토: [평가 harness](vlm-evaluation-harness.md), [평가 결과 흐름](vlm-evaluation-result-workflow.md),
  [검토 action](vlm-review-action-workflow.md), [Ops 이벤트 검토](vlm-ops-event-review-ui.md).
- 근거·후보: [이벤트 근거 추출](vlm-event-evidence-extraction.md), [관측 sidecar](vlm-observation-sidecar.md),
  [이벤트 설명 힌트](vlm-event-explanation-hints.md), [요약·검색 후보](vlm-summary-search-candidates.md),
  [룰 제안 후보](vlm-rule-suggestion-candidates.md).

### 실험과 연구

- 외부 연결: [TURN/WHEP 현장 gate](external-turn-whep-field-gate.md),
  [YouTube import의 lab 전용 경계](youtube-import.md).
- Re-ID: [기본 비활성 연구 조건](reid-default-off-research-continuation.md),
  [fixture 후보](reid-fixture-default-on-candidates.md), [tracking event hold 분석](reid-tracking-event-hold-analysis.md).
- 추적기: [OC-SORT benchmark](oc-sort-benchmark-boundary.md),
  [BoT-SORT/DeepSORT 연구 경계](bot-sort-deepsort-research-boundary.md).

## 유지보수자: 검증과 배포

| 할 일 | 문서 |
| --- | --- |
| 변경에 맞는 검사와 현행 기능별 테스트 정의 찾기 | [검증 정책과 명령](stream-verification.md) |
| 실제 UI 검사 기준 확인 | [UI 풀테스트 기준](manual-ui-fulltest.md) |
| 코드 기여와 보안 제보 | [기여 안내](../CONTRIBUTING.md), [보안 정책](../SECURITY.md) |
| 소스 버전과 공개 절차 확인 | [버전 정책](versioning-policy.md), [릴리즈 정책](release-policy.md) |
| 공개 저장소와 선택 bundle 점검 | [공개 저장소 점검](public-repo-final-review.md), [runtime/model bundle 준비](runtime-model-bundle-rc-rehearsal.md) |
| 샘플 출처와 대표 이미지 관리 | [샘플 출처](sample-fixture-provenance.md), [이미지 정책](assets/ui/README.md) |
| 미해결 항목과 후속 개발 확인 | [backlog](development-backlog.md), [녹화·검색 로드맵](v410-v49-recording-search-roadmap.md) |
| 현재 트리에서 정리된 종료 기록 조회 | [Git 이력 안내](history/README.md) |
| 녹화 저장의 설계 근거와 라이선스 판단 확인 | [저장 표준·오픈소스 검토](research/v410-recording-storage-open-source-review.md), [IP 위험 차단 게이트](research/v410-recording-ip-risk-gate.md) |

기능별 테스트 정의와 실행 명령은 검증 문서에서 찾을 수 있습니다.
검증 도구의 준비 검사, 실제 제품·UI 실행, 30분·120분 검증은 각각 구분합니다.
대표 이미지는 제품 화면 안내이며 UI 풀테스트나 릴리즈 실행 증거가 아닙니다.

버전별 변경 사항: [v4.3.0 영상 유사도 검색 개발](release-notes-v4.3.0.md), [v4.2.0 구조화 검색 후보](release-notes-v4.2.0.md), [v4.1.1 릴리즈 후보](release-notes-v4.1.1.md),
[v4.1.0](release-notes-v4.1.0.md),
[v4.0.0](release-artifacts/v4.0.0/release-notes.md),
[v3.9.1](release-artifacts/v3.9.1/release-notes.md),
[v3.9.0](release-artifacts/v3.9.0/release-notes.md).
