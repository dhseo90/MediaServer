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
  urls           같은 LAN의 다른 PC/VLC/IINA/브라우저에서 복사해 쓸 테스트 URL을 출력합니다.

개발/검증 명령:
  foreground     서버를 foreground로 실행합니다. 개발 중 로그를 바로 볼 때 사용합니다.
  test           안정 기능과 LAN IP 외부 접근성 통합 테스트를 한글 리포트로 실행합니다.
  verify-codecs  file/RTSP/WebRTC source와 codec route matrix를 자동 검증합니다.
  verify-webrtc-ice
                 WebRTC STUN/TURN/ICE policy와 candidate 수집 상태를 검증합니다.
  verify-multichannel
                 같은 영상/여러 영상을 다중 WebRTC client가 동시에 소비하는 fan-out을 검증합니다.
  verify-uri-longrun
                 HTTP/HLS URI source의 로컬 반복 검증과 선택 외부 URL 반복 검증을 수행합니다.
  verify-va      YOLO/VA overlay의 lab, RTSP, WebRTC 검증을 수행합니다.
  verify-va-events
                 이동 테스트 영상으로 tracker 기반 presence/enter/exit/line-crossing을 검증합니다.
  verify-va-category-samples
                 실제 영상 샘플에서 VA 카테고리별 presence 이벤트를 검증합니다.
  verify-route-profiles
                 실제 RTSP/WebRTC overlay 세션에서 route별 profile/rule matching을 검증합니다.
  verify-rule-ui
                 /lab/rules Rule/Profile 카테고리 버튼과 저장 payload를 검증합니다.
  verify-event-post
                 VA event POST payload, 실패/cooldown/queue 상태를 검증합니다.
  verify-lab-import-ui
                 /lab/import 실험실 import UI와 jobs API를 검증합니다.
  verify-tracker-stability
                 이동 영상에서 track ID 유지/분절 통계를 수집합니다.
  verify-yolo-layouts
                 YOLO 모델별 output layout/box/score 조합을 실제 모델로 검증합니다.
  verify-adaptive
                 adaptive tuner의 downshift/upshift 장시간 안정성을 검증합니다.
  verify-image-analysis
                 정적 이미지 입력의 YOLO metadata/snapshot/overlay API를 검증합니다.
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
  urls|external-urls)
    require_internal print_external_test_urls.sh
    exec "${INTERNAL_DIR}/print_external_test_urls.sh" "$@"
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
    require_internal verify_rule_ui_smoke.sh
    exec "${INTERNAL_DIR}/verify_rule_ui_smoke.sh" "$@"
    ;;
  verify-event-post)
    require_internal verify_event_post_dispatch.sh
    exec "${INTERNAL_DIR}/verify_event_post_dispatch.sh" "$@"
    ;;
  verify-lab-import-ui)
    require_internal verify_lab_import_ui.sh
    exec "${INTERNAL_DIR}/verify_lab_import_ui.sh" "$@"
    ;;
  verify-tracker-stability)
    require_internal verify_tracker_stability.sh
    exec "${INTERNAL_DIR}/verify_tracker_stability.sh" "$@"
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
