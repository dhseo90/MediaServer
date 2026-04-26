#!/usr/bin/env bash
# 파일 용도: 사용자가 "테스트 진행"을 요청했을 때 적용할 통합 기준선을 한글 리포트로 실행한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/env_common.sh"
media_server_apply_homebrew_gst_env

ENV_FILE="${SCRIPTS_DIR}/.media_server.env"
if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "${ENV_FILE}"
  set +a
fi

MODE="stable"
NO_START=0
STOP_AFTER=0
SKIP_CODECS=0
SKIP_EXTERNAL_CLIENT=0
SKIP_EXTERNAL_SOURCE=0
SKIP_VA=0
INCLUDE_RULES=0
INCLUDE_RULE_UI=0
INCLUDE_VA_EVENTS=0
INCLUDE_IMAGE_ANALYSIS=0
INCLUDE_WEBRTC_ICE=0
INCLUDE_URI_LONGRUN=0
FAIL_FAST=0
REQUIRE_EXTERNAL_SOURCE=0

usage() {
  cat <<'EOF_USAGE'
MediaServer 통합 테스트

Usage:
  ./server.sh test [options]

기본 기준(stable):
  1. 스크립트 문법과 codec matrix JSON이 깨지지 않았는지 확인
  2. 서버를 시작하고 RTSP/HTTP listen, /health, 기본 샘플 파일을 확인
  3. LAN IP 기준 외부 클라이언트 접근성을 확인
  4. 제3자 RTSP upstream reachability를 advisory로 확인
  5. 안정화된 로컬 source(file, RTSP pull, WebRTC publish)의 RTSP/WebRTC 기본 경로 검증
  6. 기본 설치 범위인 YOLO/VA overlay 검증

기본에서 제외되는 항목:
  - HLS/외부 HTTP URI source: 네트워크와 upstream 상태 영향이 커서 선택 검증
  - YouTube source/import: 실험실 기능
  - /lab UI, 룰/이벤트/POST, adaptive tuner: 아직 안정 기능으로 승격하지 않음
  - 정적 이미지 분석 API: 개발용 endpoint라 선택 검증으로만 실행

Options:
  --quick             정적 검사, start, status, diagnose, LAN IP 외부 접근성까지만 실행
  --stable            기본값. 안정화된 로컬 스트리밍 + LAN IP 외부 접근성 + 외부 RTSP upstream advisory 실행
  --include-rules     선택 검증: profile/rule registry API smoke test를 추가
  --include-rule-ui   선택 검증: /lab/rules Rule/Profile 카테고리 UI smoke test를 추가
  --include-va-events 선택 검증: 이동 영상 기반 tracker 이벤트 검증을 추가
  --include-image-analysis
                       선택 검증: 정적 이미지 metadata/snapshot/overlay API를 추가
  --include-webrtc-ice
                       선택 검증: WebRTC STUN/TURN/ICE policy와 candidate 수집 상태를 추가
  --include-uri-longrun
                       선택 검증: HTTP/HLS URI source 장기 검증을 추가
  --require-external-source
                       제3자 RTSP upstream 후보 실패도 hard fail로 처리
  --skip-external     LAN IP 외부 클라이언트 접근성과 제3자 RTSP upstream 검증 생략. 격리된 개발 환경에서만 사용
  --skip-va           YOLO/VA overlay 검증 생략
  --skip-codecs       codec matrix 검증 생략
  --no-start          서버 자동 시작 생략. 이미 실행 중인 서버만 검사
  --stop-after        테스트 후 서버 종료
  --fail-fast         첫 실패에서 중단
  -h, --help          도움말 출력

결과:
  - 실패 시 한글 원인 추정과 원본 로그 위치를 출력합니다.
  - 상세 로그는 .media_server.test/<timestamp>/ 아래에 저장됩니다.
EOF_USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --quick)
      MODE="quick"
      ;;
    --stable)
      MODE="stable"
      ;;
    --include-rules)
      INCLUDE_RULES=1
      ;;
    --include-rule-ui)
      INCLUDE_RULE_UI=1
      ;;
    --include-va-events)
      INCLUDE_VA_EVENTS=1
      ;;
    --include-image-analysis)
      INCLUDE_IMAGE_ANALYSIS=1
      ;;
    --include-webrtc-ice)
      INCLUDE_WEBRTC_ICE=1
      ;;
    --include-uri-longrun)
      INCLUDE_URI_LONGRUN=1
      ;;
    --require-external-source)
      REQUIRE_EXTERNAL_SOURCE=1
      ;;
    --skip-external)
      SKIP_EXTERNAL_CLIENT=1
      SKIP_EXTERNAL_SOURCE=1
      ;;
    --skip-codecs)
      SKIP_CODECS=1
      ;;
    --skip-va)
      SKIP_VA=1
      ;;
    --no-start)
      NO_START=1
      ;;
    --stop-after)
      STOP_AFTER=1
      ;;
    --fail-fast)
      FAIL_FAST=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "알 수 없는 test 옵션입니다: $1"
      echo
      usage
      exit 1
      ;;
  esac
  shift
done

if [[ "${MODE}" == "quick" ]]; then
  SKIP_CODECS=1
  SKIP_EXTERNAL_SOURCE=1
  SKIP_VA=1
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOG_DIR="${ROOT_DIR}/.media_server.test/${TIMESTAMP}"
mkdir -p "${LOG_DIR}"

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
STEP_INDEX=0
DEPENDENCY_FAILED=0

print_header() {
  cat <<EOF_HEADER
MediaServer 통합 테스트 시작
- 모드: ${MODE}
- 로그: ${LOG_DIR}
- 기준:
  1. 코드/스크립트 기본 구조가 깨지지 않아야 함
  2. 서버가 RTSP/HTTP 포트를 열고 /health에 응답해야 함
  3. 모든 test 모드에서 LAN IP 기준 외부 클라이언트 접근성이 확인되어야 함
  4. stable 모드에서는 제3자 RTSP upstream reachability를 advisory로 확인해야 함
  5. stable 모드에서는 안정화된 로컬 source(file/RTSP/WebRTC publish/HTTP URI)가 RTSP/WebRTC 기본 경로로 소비되어야 함
  6. stable 모드에서는 기본 설치 범위인 YOLO/VA overlay가 lab API, RTSP, WebRTC에서 동작해야 함
- 제외:
  HLS/외부 HTTP URI, YouTube, /lab UI, 룰/이벤트/POST, adaptive tuner, 외부 TURN relay
  룰 registry는 --include-rules, Rule UI는 --include-rule-ui, 이동 이벤트는 --include-va-events,
  이미지 분석은 --include-image-analysis, WebRTC ICE는 --include-webrtc-ice,
  URI 장기 검증은 --include-uri-longrun으로 선택 실행 가능

EOF_HEADER
}

print_line() {
  local status="$1"
  local message="$2"
  echo "[${status}] ${message}"
}

infer_reason() {
  local log_file="$1"
  local fallback="$2"

  if grep -Eiq "missing required command|command not found|No such file or directory" "${log_file}"; then
    echo "필수 실행 도구가 없습니다. ./server.sh install 또는 OS 패키지 설치를 먼저 확인하세요."
  elif grep -Eiq "pkg-config cannot find|Package .* was not found|gstreamer.*not found|No such element|No such plugin" "${log_file}"; then
    echo "GStreamer 개발 패키지 또는 plugin이 누락됐습니다. pkg-config/GStreamer 설치 상태를 확인하세요."
  elif grep -Eiq "ONNX Runtime root not found|ONNX Runtime not found|MEDIA_SERVER_ONNXRUNTIME_ROOT" "${log_file}"; then
    echo "ONNX Runtime 개발 파일을 찾지 못했습니다. ./server.sh install 또는 MEDIA_SERVER_ONNXRUNTIME_ROOT 설정이 필요합니다."
  elif grep -Eiq "AI assets missing|missing YOLO model|missing YOLO labels|No such file.*yolo|No such file.*coco" "${log_file}"; then
    echo "YOLO 모델 또는 label 파일이 없습니다. ./server.sh install로 models/yolo11n.onnx와 models/coco.names를 준비하세요."
  elif grep -Eiq "Operation not permitted|cannot bind TCP|Error binding to address|Address already in use|not listening" "${log_file}"; then
    echo "포트 바인딩 또는 리슨 상태 문제입니다. 포트 충돌, 샌드박스 권한, 방화벽/보안 정책을 확인하세요."
  elif grep -Eiq "HTTP health check failed|health failed|/health|Connection refused|Failed to connect" "${log_file}"; then
    echo "HTTP 서버가 준비되지 않았거나 접근할 수 없습니다. 서버 로그와 HTTP 포트를 확인하세요."
  elif grep -Eiq "RTSP probe failed|RTSP probe timeout|ffprobe.*failed|Invalid data found|timed out waiting for RTSP source|503 Service Unavailable" "${log_file}"; then
    echo "RTSP 미디어 생성 또는 source 준비가 실패했습니다. source token, route, codec 변환, URI source pacing 여부를 확인하세요."
  elif grep -Eiq "WebRTC .*failed|session create failed|missing sessionId|decoded video frame|playback.*failed|consumer.*timeout" "${log_file}"; then
    echo "WebRTC signaling/playback 검증이 실패했습니다. HTTP signaling, 브라우저 자동화, RTP payload 흐름을 확인하세요."
  elif grep -Eiq "missing detections|detections=0|decoderErrors|lab YOLO analysis status failed" "${log_file}"; then
    echo "VA 분석 결과가 기대 조건을 만족하지 못했습니다. 모델/라벨, 입력 영상, detector 성능, decoder 오류를 확인하세요."
  elif grep -Eiq "External RTSP|connection timed out|Network is unreachable|Name or service not known" "${log_file}"; then
    echo "외부 네트워크 source 접근 실패입니다. 네트워크, DNS, outbound 포트, upstream 상태를 확인하세요."
  else
    echo "${fallback}"
  fi
}

tail_log() {
  local log_file="$1"
  if [[ -f "${log_file}" ]]; then
    echo "---- 실패 로그 tail (${log_file}) ----"
    tail -n 80 "${log_file}" | sed 's/^/  /'
    echo "---- 실패 로그 tail 끝 ----"
  fi
}

run_step() {
  local id="$1"
  local title="$2"
  local fallback_reason="$3"
  local command="$4"
  STEP_INDEX=$((STEP_INDEX + 1))
  local log_file="${LOG_DIR}/${STEP_INDEX}-${id}.log"

  echo
  echo "== [${STEP_INDEX}] ${title}"
  echo "명령: ${command}" > "${log_file}"
  echo >> "${log_file}"

  set +e
  (cd "${ROOT_DIR}" && bash -lc "${command}") >> "${log_file}" 2>&1
  local rc=$?
  set -e

  if [[ ${rc} -eq 0 ]]; then
    PASS_COUNT=$((PASS_COUNT + 1))
    print_line "통과" "${title}"
    return 0
  fi

  FAIL_COUNT=$((FAIL_COUNT + 1))
  print_line "실패" "${title}"
  print_line "원인" "$(infer_reason "${log_file}" "${fallback_reason}")"
  print_line "로그" "${log_file}"
  tail_log "${log_file}"
  if [[ "${FAIL_FAST}" == "1" ]]; then
    print_line "중단" "--fail-fast 설정으로 첫 실패에서 중단합니다."
    print_summary
    exit 1
  fi
  return "${rc}"
}

skip_step() {
  local title="$1"
  local reason="$2"
  SKIP_COUNT=$((SKIP_COUNT + 1))
  echo
  print_line "건너뜀" "${title}"
  print_line "사유" "${reason}"
}

print_summary() {
  echo
  echo "== 통합 테스트 요약 =="
  echo "- 통과: ${PASS_COUNT}"
  echo "- 실패: ${FAIL_COUNT}"
  echo "- 건너뜀: ${SKIP_COUNT}"
  echo "- 상세 로그: ${LOG_DIR}"
  if [[ ${FAIL_COUNT} -eq 0 ]]; then
    print_line "결론" "현재 stable 기준선은 통과했습니다."
  else
    print_line "결론" "실패 항목이 있습니다. 위 한글 원인과 개별 로그를 기준으로 수정하세요."
  fi
}

run_codec_filter() {
  local filter="$1"
  local label="$2"
  run_step \
    "codec-${filter}" \
    "codec matrix: ${label}" \
    "codec matrix 검증 실패입니다. source/route codec 변환과 ffprobe 결과를 확인하세요." \
    "MEDIA_SERVER_VERIFY_INCLUDE_EXTERNAL=0 MEDIA_SERVER_VERIFY_SOURCE_FILTER='${filter}' ./server.sh verify-codecs" || true
}

print_header

run_step \
  "static-scripts" \
  "스크립트 문법 검사" \
  "쉘 스크립트 문법 오류입니다. 최근 수정한 server.sh 또는 scripts/internal/*.sh를 확인하세요." \
  "bash -n server.sh scripts/internal/*.sh" || true

run_step \
  "config-json" \
  "codec test config JSON 검사" \
  "config/codec_test_sources.json 문법이 깨졌습니다." \
  "python3 -m json.tool config/codec_test_sources.json >/dev/null" || true

if [[ "${NO_START}" == "1" ]]; then
  skip_step "서버 자동 시작" "--no-start 옵션이 지정되어 이미 실행 중인 서버만 검사합니다."
else
  if ! run_step \
      "start" \
      "서버 시작 또는 기존 서버 확인" \
      "서버 시작 실패입니다. 빌드, ONNX Runtime, 모델 파일, 포트 바인딩을 확인하세요." \
      "MEDIA_SERVER_AUTO_DIAGNOSE=0 ./server.sh start"; then
    DEPENDENCY_FAILED=1
  fi
fi

if [[ ${DEPENDENCY_FAILED} -eq 0 ]]; then
  run_step \
    "status" \
    "서버 상태 확인" \
    "서버 상태 점검 실패입니다. pid, listen port, health check를 확인하세요." \
    "./server.sh status" || DEPENDENCY_FAILED=1
else
  skip_step "서버 상태 확인" "서버 시작 단계가 실패해 상태 확인을 신뢰할 수 없습니다."
fi

if [[ ${DEPENDENCY_FAILED} -eq 0 ]]; then
  run_step \
    "diagnose" \
    "실행환경 진단" \
    "실행환경 진단 실패입니다. 포트, 파일, GStreamer, 외부 source 접근성을 확인하세요." \
    "./server.sh diagnose" || DEPENDENCY_FAILED=1
else
  skip_step "실행환경 진단" "이전 서버 readiness 단계가 실패했습니다."
fi

if [[ "${SKIP_EXTERNAL_CLIENT}" == "1" ]]; then
  skip_step "LAN IP 외부 클라이언트 접근성" "--skip-external 옵션으로 생략했습니다."
elif [[ ${DEPENDENCY_FAILED} -ne 0 ]]; then
  skip_step "LAN IP 외부 클라이언트 접근성" "서버 readiness가 실패해 외부 접근성 검증을 생략합니다."
else
  run_step \
    "external-client-access" \
    "LAN IP 외부 클라이언트 접근성" \
    "LAN IP 기준 외부 클라이언트 접근성 검증 실패입니다. bind address, MEDIA_SERVER_EXTERNAL_HOST, macOS 방화벽, 네트워크 격리를 확인하세요." \
    "./scripts/internal/test_external_access.sh" || true
fi

if [[ "${SKIP_EXTERNAL_SOURCE}" == "1" ]]; then
  skip_step "외부 RTSP upstream reachability" "--skip-external 또는 --quick 옵션으로 생략했습니다."
elif [[ ${DEPENDENCY_FAILED} -ne 0 ]]; then
  skip_step "외부 RTSP upstream reachability" "서버 readiness가 실패해 외부 source 검증을 생략합니다."
else
  run_step \
    "external-rtsp-source" \
    "외부 RTSP upstream reachability" \
    "외부 RTSP upstream 접근 실패입니다. DNS, outbound 554/tcp, 방화벽, upstream 상태를 확인하세요." \
    "MEDIA_SERVER_TEST_REQUIRE_EXTERNAL_SOURCE=${REQUIRE_EXTERNAL_SOURCE} ./scripts/internal/test_external_source_reachability.sh" || true
fi

if [[ "${SKIP_CODECS}" == "1" ]]; then
  skip_step "codec matrix 검증" "--skip-codecs 또는 --quick 옵션으로 생략했습니다."
elif [[ ${DEPENDENCY_FAILED} -ne 0 ]]; then
  skip_step "codec matrix 검증" "서버 readiness가 실패해 codec 검증을 생략합니다."
else
  run_codec_filter "file_local_h264_aac" "file H264/AAC -> RTSP/WebRTC"
  run_codec_filter "file_local_h265_aac" "file H265/AAC -> RTSP/WebRTC"
  run_codec_filter "rtsp_local_h265_opus" "local RTSP H265/Opus -> RTSP/WebRTC"
  run_codec_filter "rtsp_local_h264_pcmu" "local RTSP H264/PCMU -> RTSP/WebRTC"
  run_codec_filter "rtsp_local_h264_pcma" "local RTSP H264/PCMA -> RTSP/WebRTC"
  run_codec_filter "webrtc_local_publish_h264_opus" "local WHIP publish -> RTSP/WebRTC"
  run_codec_filter "http_local_h264_aac" "local HTTP URI H264/AAC -> RTSP/WebRTC"
  run_codec_filter "http_local_h264_video_only" "local HTTP URI video-only -> RTSP/WebRTC"
  skip_step "HLS/외부 HTTP URI source" "네트워크와 upstream 상태 영향이 큰 항목이라 기본 안정 테스트에서 제외합니다."
fi

if [[ "${INCLUDE_URI_LONGRUN}" == "1" ]]; then
  if [[ ${DEPENDENCY_FAILED} -ne 0 ]]; then
    skip_step "HTTP/HLS URI 장기 검증 선택 검증" "서버 readiness가 실패해 URI 장기 검증을 생략합니다."
  else
    run_step \
      "uri-longrun" \
      "선택 검증: HTTP/HLS URI source 장기 검증" \
      "HTTP/HLS URI 장기 검증 실패입니다. 로컬 HTTP/HLS launcher, URI source timeout, 외부 upstream 상태를 확인하세요." \
      "./server.sh verify-uri-longrun" || true
  fi
else
  skip_step "HTTP/HLS URI 장기 검증 선택 검증" "HLS/외부 HTTP URI는 환경 영향이 커 기본 테스트에서 제외합니다. 필요하면 --include-uri-longrun을 사용하세요."
fi

if [[ "${SKIP_VA}" == "1" ]]; then
  skip_step "YOLO/VA overlay 검증" "--skip-va 또는 --quick 옵션으로 생략했습니다."
elif [[ ${DEPENDENCY_FAILED} -ne 0 ]]; then
  skip_step "YOLO/VA overlay 검증" "서버 readiness가 실패해 VA 검증을 생략합니다."
else
  run_step \
    "va-overlay" \
    "YOLO/VA overlay 검증" \
    "VA overlay 검증 실패입니다. ONNX Runtime, YOLO 모델/라벨, detector 성능, WebRTC playback을 확인하세요." \
    "./server.sh verify-va" || true
fi

if [[ "${INCLUDE_WEBRTC_ICE}" == "1" ]]; then
  if [[ ${DEPENDENCY_FAILED} -ne 0 ]]; then
    skip_step "WebRTC ICE 선택 검증" "서버 readiness가 실패해 WebRTC ICE 검증을 생략합니다."
  else
    run_step \
      "webrtc-ice" \
      "선택 검증: WebRTC STUN/TURN/ICE policy" \
      "WebRTC ICE 검증 실패입니다. STUN/TURN URI, relay policy, TURN 계정, candidate 수집 상태를 확인하세요." \
      "./server.sh verify-webrtc-ice" || true
  fi
else
  skip_step "WebRTC ICE 선택 검증" "실제 TURN/auth/ICE policy 검증은 환경 의존 항목이라 기본 테스트에서 제외합니다. 필요하면 --include-webrtc-ice를 사용하세요."
fi

if [[ "${INCLUDE_RULES}" == "1" ]]; then
  if [[ ${DEPENDENCY_FAILED} -ne 0 ]]; then
    skip_step "profile/rule registry 선택 검증" "서버 readiness가 실패해 rule 검증을 생략합니다."
  else
    run_step \
      "rules-registry" \
      "선택 검증: profile/rule registry API" \
      "profile/rule registry API 검증 실패입니다. /lab/analysis/profiles, /lab/analysis/rules 응답과 registry 파일 권한을 확인하세요." \
      "bash scripts/internal/test_rule_registry.sh" || true
  fi
else
  skip_step "profile/rule registry 선택 검증" "아직 안정 기능으로 승격하지 않아 기본 테스트에서 제외합니다. 필요하면 --include-rules를 사용하세요."
fi

if [[ "${INCLUDE_RULE_UI}" == "1" ]]; then
  if [[ ${DEPENDENCY_FAILED} -ne 0 ]]; then
    skip_step "Rule/Profile UI 선택 검증" "서버 readiness가 실패해 Rule UI 검증을 생략합니다."
  else
    run_step \
      "rule-ui-smoke" \
      "선택 검증: Rule/Profile 카테고리 UI" \
      "Rule/Profile UI 검증 실패입니다. /lab/rules DOM, 버튼 동작, 카테고리 payload를 확인하세요." \
      "./server.sh verify-rule-ui" || true
  fi
else
  skip_step "Rule/Profile UI 선택 검증" "브라우저 자동화가 필요한 항목이라 기본 테스트에서 제외합니다. 필요하면 --include-rule-ui를 사용하세요."
fi

if [[ "${INCLUDE_VA_EVENTS}" == "1" ]]; then
  if [[ ${DEPENDENCY_FAILED} -ne 0 ]]; then
    skip_step "VA tracking 이벤트 선택 검증" "서버 readiness가 실패해 tracker 이벤트 검증을 생략합니다."
  else
    run_step \
      "va-tracking-events" \
      "선택 검증: VA tracking 이벤트" \
      "VA tracking 이벤트 검증 실패입니다. 테스트 영상, YOLO 검출, trackId 유지, event rule 영역/라인을 확인하세요." \
      "./server.sh verify-va-events" || true
  fi
else
  skip_step "VA tracking 이벤트 선택 검증" "실제 이동 영상 기반 검증은 아직 기본 기준이 아닙니다. 필요하면 --include-va-events를 사용하세요."
fi

if [[ "${INCLUDE_IMAGE_ANALYSIS}" == "1" ]]; then
  if [[ ${DEPENDENCY_FAILED} -ne 0 ]]; then
    skip_step "정적 이미지 분석 선택 검증" "서버 readiness가 실패해 image analysis 검증을 생략합니다."
  elif [[ "${SKIP_VA}" == "1" ]]; then
    skip_step "정적 이미지 분석 선택 검증" "--skip-va 옵션으로 YOLO 기반 이미지 분석 검증을 생략합니다."
  else
    run_step \
      "image-analysis" \
      "선택 검증: 정적 이미지 분석 API + tracking category" \
      "정적 이미지 분석 API 검증 실패입니다. 이미지 decode, ONNX Runtime, YOLO 모델/라벨, overlay JPEG 인코딩, trackingClasses category/all 정책을 확인하세요." \
      "./server.sh verify-image-analysis" || true
  fi
else
  skip_step "정적 이미지 분석 선택 검증" "개발용 endpoint라 기본 테스트에서 제외합니다. 필요하면 --include-image-analysis를 사용하세요."
fi

if [[ "${STOP_AFTER}" == "1" ]]; then
  run_step \
    "stop-after" \
    "테스트 후 서버 종료" \
    "서버 종료 실패입니다. pid 파일과 listen port를 확인하세요." \
    "./server.sh stop" || true
fi

print_summary

if [[ ${FAIL_COUNT} -gt 0 ]]; then
  exit 1
fi
exit 0
