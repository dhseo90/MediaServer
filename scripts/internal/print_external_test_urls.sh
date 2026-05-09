#!/usr/bin/env bash
# 파일 용도: 같은 LAN의 다른 PC에서 복사해 테스트할 RTSP/WebRTC URL 목록을 출력한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/env_common.sh"

ENV_FILE="${SCRIPTS_DIR}/.media_server.env"
if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "${ENV_FILE}"
  set +a
fi

STD_AFX="${ROOT_DIR}/include/stdafx.h"

read_port_default() {
  local name="$1"
  local fallback="$2"
  local value
  value="$(sed -nE "s/.*${name} = ([0-9]+).*/\\1/p" "${STD_AFX}" | head -n1)"
  printf '%s' "${value:-${fallback}}"
}

detect_lan_ips() {
  local ips=()

  if command -v ipconfig >/dev/null 2>&1; then
    local iface ip
    for iface in en0 en1 en2 bridge0; do
      ip="$(ipconfig getifaddr "${iface}" 2>/dev/null || true)"
      [[ -n "${ip}" ]] && ips+=("${ip}")
    done
  fi

  if command -v ifconfig >/dev/null 2>&1; then
    while IFS= read -r ip; do
      [[ -n "${ip}" ]] && ips+=("${ip}")
    done < <(ifconfig | awk '/inet / && $2 != "127.0.0.1" {print $2}')
  fi

  if command -v hostname >/dev/null 2>&1; then
    while IFS= read -r ip; do
      [[ -n "${ip}" ]] && ips+=("${ip}")
    done < <(hostname -I 2>/dev/null | tr ' ' '\n' | awk '/^[0-9]+\./ && $1 != "127.0.0.1" {print $1}')
  fi

  printf '%s\n' "${ips[@]}" | awk '!seen[$0]++'
}

print_rtsp_routes() {
  local label="$1"
  local query="$2"
  shift 2

  echo
  echo "## ${label}"
  local route
  for route in "$@"; do
    if [[ "${route}" == "/" ]]; then
      echo "rtsp://${HOST}:${RTSP_PORT}/${ROUTE}?${query}"
    else
      echo "rtsp://${HOST}:${RTSP_PORT}/${ROUTE}${route}?${query}"
    fi
  done
}

RTSP_PORT="${MEDIA_SERVER_LISTEN_PORT:-$(read_port_default kRtspListenPort 8554)}"
HTTP_PORT="${MEDIA_SERVER_HTTP_LISTEN_PORT:-$(read_port_default kHttpListenPort 8080)}"
ROUTE_DEFAULT="$(media_server_read_const_charp "${STD_AFX}" "kStreamRoute" || true)"
ROUTE="${MEDIA_SERVER_ROUTE:-${ROUTE_DEFAULT:-dhseo}}"

HOST="${MEDIA_SERVER_EXTERNAL_HOST:-}"
DETECTED_IPS=()
while IFS= read -r detected_ip; do
  [[ -n "${detected_ip}" ]] && DETECTED_IPS+=("${detected_ip}")
done < <(detect_lan_ips)
if [[ -z "${HOST}" && ${#DETECTED_IPS[@]} -gt 0 ]]; then
  HOST="${DETECTED_IPS[0]}"
fi
HOST="${HOST:-<MACBOOK_LAN_IP>}"
EXPERIMENTAL_YOUTUBE_ENABLED="${MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE:-0}"

YOUTUBE_UPLOAD_ENCODED="https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Daqz-KE-bpKQ"
YOUTUBE_LIVE_ENCODED="https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DiYmvCUonukw"

cat <<EOF
# MediaServer 외부 수동 테스트 URL

감지된 host: ${HOST}
감지된 LAN IP 후보: ${DETECTED_IPS[*]:-(none)}
RTSP 기본 주소: rtsp://${HOST}:${RTSP_PORT}/${ROUTE}
운영자 화면: http://${HOST}:${HTTP_PORT}/ops/home
클라이언트 화면: http://${HOST}:${HTTP_PORT}/client/live

## MacBook server 시작 명령

./server.sh restart

## Desktop 최초 확인

http://${HOST}:${HTTP_PORT}/health
http://${HOST}:${HTTP_PORT}/ops/home
http://${HOST}:${HTTP_PORT}/client/live
EOF

print_rtsp_routes "RTSP file sample_h264.mp4" \
  "file=sample_h264.mp4" \
  "/" "/h264" "/h265" "/opus" "/h265/opus" "/pcmu" "/h265/pcmu" "/pcma" "/h265/pcma"

print_rtsp_routes "RTSP file sample_h265.mp4" \
  "file=sample_h265.mp4" \
  "/" "/h264" "/h265" "/opus" "/h265/opus" "/pcmu" "/h265/pcmu" "/pcma" "/h265/pcma"

print_rtsp_routes "RTSP file sample_h264_video_only.mp4" \
  "file=sample_h264_video_only.mp4" \
  "/" "/h264" "/h265"

print_rtsp_routes "RTSP VA sample va_four_scene_sample.mp4" \
  "file=va_four_scene_sample.mp4&va=1" \
  "/" "/h264" "/h265"

if [[ "${EXPERIMENTAL_YOUTUBE_ENABLED}" == "1" ]]; then
  print_rtsp_routes "RTSP YouTube uploaded/VOD (experimental)" \
    "source=youtube&url=${YOUTUBE_UPLOAD_ENCODED}" \
    "/" "/h264" "/h265" "/opus"

  print_rtsp_routes "RTSP YouTube live (experimental)" \
    "source=youtube&url=${YOUTUBE_LIVE_ENCODED}" \
    "/" "/h264" "/h265" "/opus"
fi

cat <<EOF

## Product UI 수동 확인

Desktop에서 아래 화면을 엽니다.
http://${HOST}:${HTTP_PORT}/ops/home
http://${HOST}:${HTTP_PORT}/ops/sources
http://${HOST}:${HTTP_PORT}/ops/rules
http://${HOST}:${HTTP_PORT}/client/live

Client Live는 설정된 PublishedView 목록을 사용해야 합니다. 영상 screenshot과 VA overlay 확인은 4분할 `VA Test File` channel을 사용합니다.

## WebRTC publish -> consume 수동 확인

기존 browser test page는 제거되었습니다. publisher ingest에는 `/whip/publish`를 사용하고, 생성된 Published WebRTC sourceId는 `/ops/sources`에서 등록한 뒤 `/client/live`에서 재생을 확인합니다.

## 참고

- Desktop에서 /health가 열리지 않으면 macOS firewall, bind address, router WiFi/LAN isolation을 먼저 확인하세요.
- VLC/IINA RTSP 테스트는 RTSP over TCP를 우선 사용하세요.
- YouTube import는 제품 UI 범위가 아닙니다. 별도 experimental import flow를 검토할 때만 활성화하세요.
EOF

if [[ "${EXPERIMENTAL_YOUTUBE_ENABLED}" == "1" ]]; then
  cat <<EOF
- Experimental YouTube tests are enabled for this server instance.

sourceType=youtube
url=https://www.youtube.com/watch?v=aqz-KE-bpKQ

sourceType=youtube
url=https://www.youtube.com/watch?v=iYmvCUonukw

- Experimental YouTube tests require yt-dlp on the MacBook and public/non-login URLs.
EOF
else
  cat <<EOF
- Experimental YouTube tests are hidden. Start the server with
  MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE=1 if you explicitly want to expose them.
EOF
fi
