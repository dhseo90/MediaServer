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
  verify-ops-channel-bulk
                 /ops/sources 대량 채널 복제/비활성화/상태 진단 UI hook을 검증합니다.
  verify-ops-event-records-scope
                 EventRecord가 짧은 증거 기록 범위로 노출되고 /ops/events UI가 이를 표시하는지 검증합니다.
  verify-ops-audit-trail
                 /ops 채널/룰/사용자 UI 변경 이력 패널과 기록 hook을 검증합니다.
  verify-ops-audit-persistence
                 /ops/api/audit 서버 영속 감사 로그와 UI fallback hook을 검증합니다.
  verify-ops-diagnostics-bundle
                 운영 diagnostics bundle 생성물과 config preset 기준을 검증합니다.
  verify-ops-backup-recovery-guide
                 운영 백업/복구 가이드와 복구 후 검증 절차를 정적 검증합니다.
  verify-ops-root-cause-panel
                 /ops/dashboard 문제 원인 패널과 source/stale/reconnect/auth 해석 hook을 검증합니다.
  verify-client-dashboard-polish
                 /client/dashboard 다중 view 비교와 로딩/빈/오류 상태 문구를 검증합니다.
  verify-docs-ui-assets
                 README/UI guide screenshot 자산과 자동 캡처 기준을 검증합니다.
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
  verify-event-post-longrun
                 event POST schema/recovery/선택 queue 검증을 반복 실행합니다.
  verify-longrun-separation
                 기본 smoke와 장기 soak/longrun harness 분리 기준을 검증합니다.
  verify-rc-release-gate
                 120분 soak/VA runtime longrun이 RC 전용 기준으로 분리됐는지 검증합니다.
  rc-release-checklist
                 RC gate summary/report를 Markdown/HTML checklist와 history index로 묶습니다.
  verify-tracker-stability
                 이동 영상에서 track ID 유지/분절 통계를 수집합니다.
  compare-close-object-tracker
                 close-object guard off/diagnostic/enforce tracker stability 비교 리포트를 생성합니다.
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
  --no-youtube   yt-dlp/deno 같은 YouTube 실험실 보조 도구 설치를 건너뜁니다.

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
  verify-ops-channel-bulk)
    require_internal verify_ops_channel_bulk.mjs
    exec "${INTERNAL_DIR}/verify_ops_channel_bulk.mjs" "$@"
    ;;
  verify-ops-event-records-scope)
    require_internal verify_ops_event_records_scope.mjs
    exec "${INTERNAL_DIR}/verify_ops_event_records_scope.mjs" "$@"
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
  verify-ops-root-cause-panel)
    require_internal verify_ops_root_cause_panel.mjs
    exec "${INTERNAL_DIR}/verify_ops_root_cause_panel.mjs" "$@"
    ;;
  verify-client-dashboard-polish)
    require_internal verify_client_dashboard_polish.mjs
    exec "${INTERNAL_DIR}/verify_client_dashboard_polish.mjs" "$@"
    ;;
  verify-docs-ui-assets)
    require_internal verify_docs_ui_assets.mjs
    exec "${INTERNAL_DIR}/verify_docs_ui_assets.mjs" "$@"
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
  verify-event-post-longrun)
    require_internal verify_event_post_longrun.sh
    exec "${INTERNAL_DIR}/verify_event_post_longrun.sh" "$@"
    ;;
  verify-longrun-separation)
    require_internal verify_longrun_separation.mjs
    exec "${INTERNAL_DIR}/verify_longrun_separation.mjs" "$@"
    ;;
  verify-rc-release-gate)
    require_internal verify_rc_release_gate.mjs
    exec "${INTERNAL_DIR}/verify_rc_release_gate.mjs" "$@"
    ;;
  rc-release-checklist)
    require_internal write_rc_release_checklist.mjs
    exec "${INTERNAL_DIR}/write_rc_release_checklist.mjs" "$@"
    ;;
  verify-tracker-stability)
    require_internal verify_tracker_stability.sh
    exec "${INTERNAL_DIR}/verify_tracker_stability.sh" "$@"
    ;;
  compare-close-object-tracker)
    require_internal compare_close_object_tracker.py
    exec "${INTERNAL_DIR}/compare_close_object_tracker.py" "$@"
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
