#!/usr/bin/env bash
# 파일 용도: 다른 PC가 접속할 수 있는 주소로 MediaServer HTTP/RTSP가 열려 있는지 서버 측에서 검증한다.
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

STD_AFX="${ROOT_DIR}/include/stdafx.h"
PORT_FILE="${ROOT_DIR}/.media_server.port"
ADDRESS_FILE="${ROOT_DIR}/.media_server.address"

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

is_loopback_host() {
  local host="$1"
  [[ "${host}" == "127."* || "${host}" == "localhost" || "${host}" == "::1" ]]
}

RTSP_PORT="${MEDIA_SERVER_LISTEN_PORT:-}"
if [[ -z "${RTSP_PORT}" && -f "${PORT_FILE}" ]]; then
  RTSP_PORT="$(cat "${PORT_FILE}")"
fi
RTSP_PORT="${RTSP_PORT:-$(read_port_default kRtspListenPort 8554)}"

HTTP_PORT="${MEDIA_SERVER_HTTP_LISTEN_PORT:-$(read_port_default kHttpListenPort 8080)}"
ROUTE_DEFAULT="$(media_server_read_const_charp "${STD_AFX}" "kStreamRoute" || true)"
ROUTE="${MEDIA_SERVER_ROUTE:-${ROUTE_DEFAULT:-dhseo}}"

RTSP_BIND_ADDRESS="${MEDIA_SERVER_LISTEN_ADDRESS:-}"
if [[ -z "${RTSP_BIND_ADDRESS}" && -f "${ADDRESS_FILE}" ]]; then
  RTSP_BIND_ADDRESS="$(cat "${ADDRESS_FILE}")"
fi
RTSP_BIND_ADDRESS="${RTSP_BIND_ADDRESS:-$(media_server_read_const_charp "${STD_AFX}" "kRtspListenAddress" || true)}"
RTSP_BIND_ADDRESS="${RTSP_BIND_ADDRESS:-127.0.0.1}"
HTTP_BIND_ADDRESS="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-$(media_server_read_const_charp "${STD_AFX}" "kHttpListenAddress" || true)}"
HTTP_BIND_ADDRESS="${HTTP_BIND_ADDRESS:-127.0.0.1}"

DETECTED_IPS=()
while IFS= read -r detected_ip; do
  [[ -n "${detected_ip}" ]] && DETECTED_IPS+=("${detected_ip}")
done < <(detect_lan_ips)

HOST="${MEDIA_SERVER_EXTERNAL_HOST:-}"
if [[ -z "${HOST}" && ${#DETECTED_IPS[@]} -gt 0 ]]; then
  HOST="${DETECTED_IPS[0]}"
fi

echo "[정보] rtsp_bind=${RTSP_BIND_ADDRESS}:${RTSP_PORT}"
echo "[정보] http_bind=${HTTP_BIND_ADDRESS}:${HTTP_PORT}"
echo "[정보] detected_lan_ips=${DETECTED_IPS[*]:-(none)}"
echo "[정보] external_host=${HOST:-<unset>}"

if [[ -z "${HOST}" || "${HOST}" == "<MACBOOK_LAN_IP>" ]]; then
  echo "[실패] 외부 접속용 LAN IP를 찾지 못했습니다."
  echo "[원인] MEDIA_SERVER_EXTERNAL_HOST를 설정하거나 네트워크 인터페이스 IP를 확인하세요."
  exit 1
fi

if is_loopback_host "${HOST}"; then
  echo "[실패] 외부 접속용 host가 loopback입니다: ${HOST}"
  echo "[원인] 다른 PC에서 접근 가능한 LAN IP를 MEDIA_SERVER_EXTERNAL_HOST로 지정하세요."
  exit 1
fi

if is_loopback_host "${RTSP_BIND_ADDRESS}" || is_loopback_host "${HTTP_BIND_ADDRESS}"; then
  echo "[실패] 서버가 loopback 주소에만 바인딩되어 있습니다."
  echo "[원인] MEDIA_SERVER_LISTEN_ADDRESS=0.0.0.0, MEDIA_SERVER_HTTP_LISTEN_ADDRESS=0.0.0.0으로 실행해야 외부 PC가 접속할 수 있습니다."
  exit 1
fi

if [[ "${RTSP_BIND_ADDRESS}" != "0.0.0.0" && "${RTSP_BIND_ADDRESS}" != "::" && "${RTSP_BIND_ADDRESS}" != "${HOST}" ]]; then
  echo "[실패] RTSP bind address와 외부 host가 다릅니다."
  echo "[원인] 현재 bind=${RTSP_BIND_ADDRESS}, external_host=${HOST}. 0.0.0.0 또는 해당 LAN IP로 바인딩하세요."
  exit 1
fi

if [[ "${HTTP_BIND_ADDRESS}" != "0.0.0.0" && "${HTTP_BIND_ADDRESS}" != "::" && "${HTTP_BIND_ADDRESS}" != "${HOST}" ]]; then
  echo "[실패] HTTP bind address와 외부 host가 다릅니다."
  echo "[원인] 현재 bind=${HTTP_BIND_ADDRESS}, external_host=${HOST}. 0.0.0.0 또는 해당 LAN IP로 바인딩하세요."
  exit 1
fi

if ! curl -fsS --max-time 5 "http://${HOST}:${HTTP_PORT}/health" >/dev/null; then
  echo "[실패] LAN IP 기준 HTTP health check 실패: http://${HOST}:${HTTP_PORT}/health"
  echo "[원인] macOS 방화벽, Wi-Fi/LAN 격리, bind address, HTTP 포트를 확인하세요."
  exit 1
fi
echo "[통과] LAN IP HTTP health ok"

if ! curl -fsS --max-time 5 "http://${HOST}:${HTTP_PORT}/lab" >/dev/null; then
  echo "[실패] LAN IP 기준 lab page 접근 실패: http://${HOST}:${HTTP_PORT}/lab"
  echo "[원인] HTTP 서버는 열렸지만 lab route가 응답하지 않습니다."
  exit 1
fi
echo "[통과] LAN IP lab page ok"

if ! command -v ffprobe >/dev/null 2>&1; then
  echo "[실패] ffprobe가 없어 LAN IP RTSP probe를 수행할 수 없습니다."
  echo "[원인] ./server.sh install 또는 ffmpeg 설치를 확인하세요."
  exit 1
fi

RTSP_URL="rtsp://${HOST}:${RTSP_PORT}/${ROUTE}?file=sample_h264.mp4"
if ! ffprobe -v error -rw_timeout 10000000 -rtsp_transport tcp \
    -show_entries stream=index,codec_name,codec_type \
    -of compact=p=0:nk=1 "${RTSP_URL}" >/tmp/media_server_external_rtsp_probe.txt 2>&1; then
  echo "[실패] LAN IP 기준 RTSP probe 실패: ${RTSP_URL}"
  echo "[원인] 외부 클라이언트용 RTSP 주소, macOS 방화벽, RTSP TCP 접근 가능 여부를 확인하세요."
  sed -n '1,40p' /tmp/media_server_external_rtsp_probe.txt | sed 's/^/  /'
  exit 1
fi
echo "[통과] LAN IP RTSP sample ok"
sed -n '1,8p' /tmp/media_server_external_rtsp_probe.txt | sed 's/^/  /'

cat <<EOF
[완료] 외부 클라이언트 접근성 서버 측 검증 통과
  HTTP health: http://${HOST}:${HTTP_PORT}/health
  Lab page:    http://${HOST}:${HTTP_PORT}/lab
  RTSP sample: ${RTSP_URL}

[주의] 이 검증은 서버가 LAN IP로 응답하는지 확인합니다.
      실제 데스크탑에서의 접근은 공유기/AP 격리, macOS 방화벽, 데스크탑 네트워크 정책까지 영향을 받으므로
      데스크탑에서도 위 URL을 한 번 열어 최종 확인해야 합니다.
EOF
