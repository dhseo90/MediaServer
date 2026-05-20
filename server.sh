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
  verify-multichannel
                 제거된 초기 브라우저 harness 대신 현재는 명시적으로 skip합니다. 제품 UI smoke를 사용하세요.
  verify-uri-longrun
                 HTTP/HLS URI source의 로컬 반복 검증과 선택 외부 URL 반복 검증을 수행합니다.
  verify-va      YOLO/VA overlay의 lab/RTSP 검증과 사용 가능한 WebRTC browser harness 검증을 수행합니다.
  verify-redaction
                 사람 객체 자동 모자이크(redaction)의 image/live 검증을 수행합니다. multichannel은 현재 skip입니다.
  verify-va-events
                 이동 테스트 영상으로 tracker 기반 presence/enter/exit/line-crossing을 검증합니다.
  verify-va-category-samples
                 실제 영상 샘플에서 VA 카테고리별 presence 이벤트를 검증합니다.
  verify-route-profiles
                 실제 RTSP overlay와 사용 가능한 WebRTC browser harness에서 route별 profile/rule matching을 검증합니다.
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
  verify-product-shell-examples
                 제품 shell/component 예시 문서와 UI guide 연결을 검증합니다.
  verify-ops-route-boundaries
                 /ops, /client, /lab 화면/API route 경계 계약을 검증합니다.
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
  verify-docs-links
                 README/docs Markdown 링크와 이미지 파일 참조를 검증합니다.
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
  verify-v1.1-boundary-keywords
                 v1.1.0 live-only 제품 경계 키워드가 비범위/보류 문맥인지 검증합니다.
  verify-code-comments
                 코드/스크립트 상단 용도 주석과 한글 주석 정책을 검증합니다.
  verify-release-metadata
                 VERSION, CMake, README, release/versioning/backlog 문서의 release 기준 drift를 검증합니다.
  verify-script-inventory
                 server.sh 명령, 문서 명령 참조, JS 옵션 검증 적용 범위를 점검합니다.
  verify-actions-security
                 GitHub Actions workflow 권한과 action 사용 정책을 검증합니다.
  verify-public-repo-readiness
                 public 전환 전 secret/history/asset/문서 준비 상태를 검증합니다.
  verify-post-release-reconciliation
                 post-release smoke 기록이 통과/미실행/미확인을 분리하는지 검증합니다.
  verify-release-closeout-helper
                 release close-out 전 로컬 검증, visual baseline readiness, 수동 tag/push 경계를 dry-run으로 요약합니다.
  verify-v121-follow-up-closure
                 v1.2.1 roadmap 내 개발 가능한 후속 이슈가 남지 않았는지 검증합니다.
  verify-v130-follow-up-closure
                 v1.3.0 follow-up closure가 기능 개발 없이 별도 Phase/release gate를 분리하는지 검증합니다.
  verify-v140-follow-up-closure
                 v1.4.0 follow-up closure가 범위 안 후속 이슈를 모두 닫았는지 검증합니다.
  verify-v140-report-archive-policy
                 v1.4.0 close-object report archive가 raw media/image 보존으로 확장되지 않는지 검증합니다.
  verify-v150-follow-up-closure
                 v1.5.0 follow-up closure가 범위 안 후속 이슈를 모두 닫았는지 검증합니다.
  verify-v150-opt-in-tracking-policy
                 v1.5.0 tracker/Re-ID 명시 opt-in 저장/runtime/UI/docs guard를 검증합니다.
  verify-v150-tracker-reid-stability-matrix
                 v1.5.0 Tracker/Re-ID stability matrix와 warning/default-on 경계를 검증합니다.
  verify-v150-reid-provenance-fallback-approval
                 v1.5.0 Re-ID model provenance/checksum/privacy/fallback approval 경계를 검증합니다.
  verify-v150-ops-tracker-warning-next-action
                 v1.5.0 Ops Dashboard tracker warning next-action과 default-on 비승격 경계를 검증합니다.
  verify-v150-audit-export-review-hardening
                 v1.5.0 audit export review와 model/source material masking 경계를 검증합니다.
  verify-v150-field-smoke-summary-evidence-boundary
                 v1.5.0 field smoke summary/report/history evidence와 raw media 비보존 경계를 검증합니다.
  verify-v150-oc-sort-experimental-sandbox
                 v1.5.0 OC-SORT experimental sandbox가 runtime tracker 승격 없이 연결됐는지 검증합니다.
  verify-v160-release-evidence-dashboard
                 v1.6.0 release evidence dashboard가 실행/미실행/미확인을 분리하는지 검증합니다.
  verify-v160-stability-verification-gate
                 v1.6.0 stability verification gate가 smoke/flaky/longrun을 분리하는지 검증합니다.
  verify-v160-debug-exposure-regression-guard
                 v1.6.0 client/ops debug/source/model/auth 비노출 guard를 검증합니다.
  verify-v160-tracker-reid-opt-in-closeout
                 v1.6.0 tracker/Re-ID opt-in default-off close-out을 검증합니다.
  verify-v160-onvif-field-smoke-evidence-reconciliation
                 v1.6.0 ONVIF field smoke evidence의 미실행/미확인/redaction 경계를 검증합니다.
  verify-v160-audit-export-masking-regression-hardening
                 v1.6.0 audit 조회/export의 source/model/auth/raw material masking guard를 검증합니다.
  verify-v160-runtime-model-bundle-rc-policy
                 v1.6.0 runtime/model bundle 미포함 기본값과 RC 승인 조건을 검증합니다.
  verify-v160-manual-ui-release-checklist-closure
                 v1.6.0 수동 UI release checklist와 evidence 경계를 검증합니다.
  verify-v160-public-docs-consistency-polish
                 v1.6.0 public docs의 current tag/stabilization evidence 표현을 검증합니다.
  verify-v160-tracker-benchmark-harness-planning
                 v1.6.0 tracker benchmark harness planning-only 경계를 검증합니다.
  verify-server-start-modes
                 foreground/start 실행 모드의 health, route, state file 안정성을 검증합니다.
  verify-auth-bootstrap
                 최초 setup, admin password policy, login/logout/session을 검증합니다.
  verify-auth-users
                 admin 계정 관리, viewer scope 제한, lockout, invite/request를 검증합니다.
  verify-auth-routes
                 root/login/ops/client/lab role 기반 route 정책을 검증합니다.
  verify-event-post
                 VA event POST payload, 실패/cooldown/queue 상태를 검증합니다.
  verify-integrator-contract-artifact
                 integrator 배포용 Event/WebRTC/SSE/WS contract sample bundle을 정적 검증합니다.
  verify-event-post-longrun
                 event POST schema/recovery/선택 queue 검증을 반복 실행합니다.
  verify-longrun-separation
                 기본 smoke와 장기 soak/longrun harness 분리 기준을 검증합니다.
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
  verify-predev  기능 개발 재개 전 smoke, 다채널, event POST, cleanup, report를 묶어 검증합니다.
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
  verify-multichannel)
    require_internal verify_multichannel_webrtc.sh
    exec "${INTERNAL_DIR}/verify_multichannel_webrtc.sh" "$@"
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
  verify-v1.1-boundary-keywords)
    require_internal verify_v1_1_boundary_keywords.mjs
    exec "${INTERNAL_DIR}/verify_v1_1_boundary_keywords.mjs" "$@"
    ;;
  verify-code-comments)
    require_internal verify_code_comments.mjs
    exec "${INTERNAL_DIR}/verify_code_comments.mjs" "$@"
    ;;
  verify-release-metadata)
    require_internal verify_release_metadata_consistency.mjs
    exec "${INTERNAL_DIR}/verify_release_metadata_consistency.mjs" "$@"
    ;;
  verify-script-inventory)
    require_internal verify_script_inventory.mjs
    exec "${INTERNAL_DIR}/verify_script_inventory.mjs" "$@"
    ;;
  verify-actions-security)
    require_internal verify_actions_security.mjs
    exec "${INTERNAL_DIR}/verify_actions_security.mjs" "$@"
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
  verify-v121-follow-up-closure)
    require_internal verify_v121_follow_up_closure.mjs
    exec "${INTERNAL_DIR}/verify_v121_follow_up_closure.mjs" "$@"
    ;;
  verify-v130-follow-up-closure)
    require_internal verify_v130_follow_up_closure.mjs
    exec "${INTERNAL_DIR}/verify_v130_follow_up_closure.mjs" "$@"
    ;;
  verify-v140-follow-up-closure)
    require_internal verify_v140_follow_up_closure.mjs
    exec "${INTERNAL_DIR}/verify_v140_follow_up_closure.mjs" "$@"
    ;;
  verify-v140-report-archive-policy)
    require_internal verify_v140_report_archive_policy.mjs
    exec "${INTERNAL_DIR}/verify_v140_report_archive_policy.mjs" "$@"
    ;;
  verify-v150-follow-up-closure)
    require_internal verify_v150_follow_up_closure.mjs
    exec "${INTERNAL_DIR}/verify_v150_follow_up_closure.mjs" "$@"
    ;;
  verify-v150-opt-in-tracking-policy)
    require_internal verify_v150_opt_in_tracking_policy_guard.mjs
    exec "${INTERNAL_DIR}/verify_v150_opt_in_tracking_policy_guard.mjs" "$@"
    ;;
  verify-v150-tracker-reid-stability-matrix)
    require_internal verify_v150_tracker_reid_stability_matrix.mjs
    exec "${INTERNAL_DIR}/verify_v150_tracker_reid_stability_matrix.mjs" "$@"
    ;;
  verify-v150-reid-provenance-fallback-approval)
    require_internal verify_v150_reid_provenance_fallback_approval.mjs
    exec "${INTERNAL_DIR}/verify_v150_reid_provenance_fallback_approval.mjs" "$@"
    ;;
  verify-v150-ops-tracker-warning-next-action)
    require_internal verify_v150_ops_tracker_warning_next_action.mjs
    exec "${INTERNAL_DIR}/verify_v150_ops_tracker_warning_next_action.mjs" "$@"
    ;;
  verify-v150-audit-export-review-hardening)
    require_internal verify_v150_audit_export_review_hardening.mjs
    exec "${INTERNAL_DIR}/verify_v150_audit_export_review_hardening.mjs" "$@"
    ;;
  verify-v150-field-smoke-summary-evidence-boundary)
    require_internal verify_v150_field_smoke_summary_evidence_boundary.mjs
    exec "${INTERNAL_DIR}/verify_v150_field_smoke_summary_evidence_boundary.mjs" "$@"
    ;;
  verify-v150-oc-sort-experimental-sandbox)
    require_internal verify_v150_oc_sort_experimental_sandbox.mjs
    exec "${INTERNAL_DIR}/verify_v150_oc_sort_experimental_sandbox.mjs" "$@"
    ;;
  verify-v160-release-evidence-dashboard)
    require_internal verify_v160_release_evidence_dashboard.mjs
    exec "${INTERNAL_DIR}/verify_v160_release_evidence_dashboard.mjs" "$@"
    ;;
  verify-v160-stability-verification-gate)
    require_internal verify_v160_stability_verification_gate.mjs
    exec "${INTERNAL_DIR}/verify_v160_stability_verification_gate.mjs" "$@"
    ;;
  verify-v160-debug-exposure-regression-guard)
    require_internal verify_v160_debug_exposure_regression_guard.mjs
    exec "${INTERNAL_DIR}/verify_v160_debug_exposure_regression_guard.mjs" "$@"
    ;;
  verify-v160-tracker-reid-opt-in-closeout)
    require_internal verify_v160_tracker_reid_opt_in_closeout.mjs
    exec "${INTERNAL_DIR}/verify_v160_tracker_reid_opt_in_closeout.mjs" "$@"
    ;;
  verify-v160-onvif-field-smoke-evidence-reconciliation)
    require_internal verify_v160_onvif_field_smoke_evidence_reconciliation.mjs
    exec "${INTERNAL_DIR}/verify_v160_onvif_field_smoke_evidence_reconciliation.mjs" "$@"
    ;;
  verify-v160-audit-export-masking-regression-hardening)
    require_internal verify_v160_audit_export_masking_regression_hardening.mjs
    exec "${INTERNAL_DIR}/verify_v160_audit_export_masking_regression_hardening.mjs" "$@"
    ;;
  verify-v160-runtime-model-bundle-rc-policy)
    require_internal verify_v160_runtime_model_bundle_rc_policy.mjs
    exec "${INTERNAL_DIR}/verify_v160_runtime_model_bundle_rc_policy.mjs" "$@"
    ;;
  verify-v160-manual-ui-release-checklist-closure)
    require_internal verify_v160_manual_ui_release_checklist_closure.mjs
    exec "${INTERNAL_DIR}/verify_v160_manual_ui_release_checklist_closure.mjs" "$@"
    ;;
  verify-v160-public-docs-consistency-polish)
    require_internal verify_v160_public_docs_consistency_polish.mjs
    exec "${INTERNAL_DIR}/verify_v160_public_docs_consistency_polish.mjs" "$@"
    ;;
  verify-v160-tracker-benchmark-harness-planning)
    require_internal verify_v160_tracker_benchmark_harness_planning.mjs
    exec "${INTERNAL_DIR}/verify_v160_tracker_benchmark_harness_planning.mjs" "$@"
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
