#!/usr/bin/env bash
# 파일 용도: WebRTC STUN/TURN/ICE transport policy 설정과 candidate 수집 상태를 검증한다.
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
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
RUN_ID="webrtc-ice-$(date +%s)-$$"
CANDIDATES_FILE="/tmp/media_server_${RUN_ID}_candidates.ndjson"
SESSION_JSON="/tmp/media_server_${RUN_ID}_session.json"
CONFIG_JSON="/tmp/media_server_${RUN_ID}_webrtc_config.json"
BROWSER_LOG="/tmp/media_server_${RUN_ID}_browser.json"
SUMMARY_FILE="/tmp/media_server_${RUN_ID}_summary.json"
SESSION_ID=""
REQUIRE_RELAY=0
EXTERNAL_TURN_MODE=0
SKIP_BROWSER=0
SKIP_WHIP=0
PRINT_LOCAL_COTURN_EXAMPLE=0
POLL_COUNT="${MEDIA_SERVER_VERIFY_WEBRTC_ICE_POLL_COUNT:-10}"
POLL_INTERVAL_S="${MEDIA_SERVER_VERIFY_WEBRTC_ICE_POLL_INTERVAL_S:-0.5}"
FILE_TOKEN="${MEDIA_SERVER_VERIFY_WEBRTC_ICE_FILE:-sample_h264.mp4}"
WEBRTC_HOLD_MS="${MEDIA_SERVER_VERIFY_WEBRTC_ICE_HOLD_MS:-5000}"
WEBRTC_TIMEOUT_MS="${MEDIA_SERVER_VERIFY_WEBRTC_ICE_TIMEOUT_MS:-45000}"

# 검증 진행 상황을 같은 형식으로 출력한다.
log_info() { echo "[info] $*"; }
# 성공 건수를 누적하고 통과 메시지를 출력한다.
log_pass() { echo "[pass] $*"; PASS_COUNT=$((PASS_COUNT + 1)); }
# 실패 건수를 누적하고 실패 메시지를 출력한다.
log_fail() { echo "[fail] $*"; FAIL_COUNT=$((FAIL_COUNT + 1)); }
# 환경 의존으로 생략한 항목을 누적하고 이유를 출력한다.
log_skip() { echo "[skip] $*"; SKIP_COUNT=$((SKIP_COUNT + 1)); }

# verify-webrtc-ice 명령의 사용법과 관련 환경 변수를 출력한다.
usage() {
  cat <<'EOF_USAGE'
WebRTC ICE 설정 검증

Usage:
  ./server.sh verify-webrtc-ice [options]

Options:
  --require-relay    relay candidate가 반드시 수집되어야 함. 실제 TURN 서버/계정 검증용
  --external-turn    외부 운영 TURN credential 검증 모드. relay policy와 TURN credential 필요
  --skip-browser     브라우저 WebRTC playback 검증 생략
  --skip-whip        WHIP publish -> consume 검증 생략
  --file <token>     file source token. 기본 sample_h264.mp4
  --print-local-coturn
                     Mac 로컬 coturn 검증용 실행 예시를 출력하고 종료
  -h, --help         도움말 출력

환경 변수:
  MEDIA_SERVER_WEBRTC_STUN_SERVER
  MEDIA_SERVER_WEBRTC_TURN_SERVER
  MEDIA_SERVER_WEBRTC_ICE_TRANSPORT_POLICY=all|relay
  MEDIA_SERVER_VERIFY_WEBRTC_EXTERNAL_TURN_SERVER
  MEDIA_SERVER_VERIFY_WEBRTC_ICE_REQUIRE_RELAY=1
  MEDIA_SERVER_VERIFY_WEBRTC_ICE_POLL_COUNT
  MEDIA_SERVER_VERIFY_WEBRTC_ICE_POLL_INTERVAL_S

Mac 로컬 coturn 단일 머신 검증 예:
  turnserver -n --log-file stdout --no-cli --no-tls --no-dtls \
    --lt-cred-mech --fingerprint --realm media-server.local \
    --user test:testpass --listening-ip 0.0.0.0 --listening-port 3478 \
    --relay-ip <mac-lan-ip> --min-port 49160 --max-port 49200 \
    --allow-loopback-peers -v

  MEDIA_SERVER_WEBRTC_STUN_SERVER=stun://stun.l.google.com:19302 \
  MEDIA_SERVER_WEBRTC_TURN_SERVER=turn://test:testpass@<mac-lan-ip>:3478 \
  MEDIA_SERVER_WEBRTC_ICE_TRANSPORT_POLICY=relay \
  ./server.sh verify-webrtc-ice --require-relay

주의:
  --allow-loopback-peers는 browser, MediaServer, coturn을 같은 Mac에서 돌리는
  개발 검증용 옵션입니다. 운영 TURN 서버에는 사용하지 않습니다.

외부 운영 TURN 검증 예:
  MEDIA_SERVER_WEBRTC_STUN_SERVER=stun://stun.l.google.com:19302 \
  MEDIA_SERVER_WEBRTC_TURN_SERVER=turn://user:pass@turn.example.com:3478 \
  MEDIA_SERVER_WEBRTC_ICE_TRANSPORT_POLICY=relay \
  ./server.sh foreground

  MEDIA_SERVER_WEBRTC_TURN_SERVER=turn://user:pass@turn.example.com:3478 \
  MEDIA_SERVER_WEBRTC_ICE_TRANSPORT_POLICY=relay \
  ./server.sh verify-webrtc-ice --external-turn
EOF_USAGE
}

# Mac 로컬 coturn으로 relay 검증을 재현할 때 필요한 명령을 출력한다.
print_local_coturn_example() {
  cat <<'EOF_EXAMPLE'
Mac 로컬 coturn 실행 예:

turnserver -n \
  --log-file stdout \
  --no-cli \
  --no-tls \
  --no-dtls \
  --lt-cred-mech \
  --fingerprint \
  --realm media-server.local \
  --user test:testpass \
  --listening-ip 0.0.0.0 \
  --listening-port 3478 \
  --relay-ip <mac-lan-ip> \
  --min-port 49160 \
  --max-port 49200 \
  --allow-loopback-peers \
  -v

검증 명령 예:

MEDIA_SERVER_WEBRTC_STUN_SERVER=stun://stun.l.google.com:19302 \
MEDIA_SERVER_WEBRTC_TURN_SERVER=turn://test:testpass@<mac-lan-ip>:3478 \
MEDIA_SERVER_WEBRTC_ICE_TRANSPORT_POLICY=relay \
./server.sh verify-webrtc-ice --require-relay

주의: --allow-loopback-peers는 로컬 단일 머신 개발 검증용입니다. 운영 TURN에는 사용하지 않습니다.
EOF_EXAMPLE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --require-relay)
      REQUIRE_RELAY=1
      ;;
    --external-turn)
      EXTERNAL_TURN_MODE=1
      REQUIRE_RELAY=1
      ;;
    --skip-browser)
      SKIP_BROWSER=1
      ;;
    --skip-whip)
      SKIP_WHIP=1
      ;;
    --file)
      if [[ $# -lt 2 ]]; then
        echo "--file 옵션에는 file token이 필요합니다."
        exit 1
      fi
      FILE_TOKEN="$2"
      shift
      ;;
    --print-local-coturn)
      PRINT_LOCAL_COTURN_EXAMPLE=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "알 수 없는 verify-webrtc-ice 옵션입니다: $1"
      echo
      usage
      exit 1
      ;;
  esac
  shift
done

if [[ "${PRINT_LOCAL_COTURN_EXAMPLE}" == "1" ]]; then
  print_local_coturn_example
  exit 0
fi

if [[ "${MEDIA_SERVER_VERIFY_WEBRTC_ICE_REQUIRE_RELAY:-0}" == "1" ]]; then
  REQUIRE_RELAY=1
fi

# 외부 명령 의존성이 없으면 검증을 즉시 중단한다.
require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log_fail "필수 도구가 없습니다: $1"
    exit 1
  fi
}

# env 값이 없을 때 include/stdafx.h의 기본 포트를 읽어 테스트 대상 포트를 결정한다.
resolve_port() {
  local env_value="$1"
  local const_name="$2"
  local fallback="$3"
  if [[ -n "${env_value}" ]]; then
    printf '%s' "${env_value}"
    return
  fi
  local parsed
  parsed="$(sed -nE "s/.*${const_name} = ([0-9]+).*/\\1/p" "${STD_AFX}" | head -n1)"
  printf '%s' "${parsed:-${fallback}}"
}

# 서버 listen address가 wildcard이면 로컬 클라이언트가 접근 가능한 loopback 주소로 바꾼다.
client_host() {
  local value="$1"
  if [[ -z "${value}" || "${value}" == "0.0.0.0" || "${value}" == "::" ]]; then
    printf '127.0.0.1'
  else
    printf '%s' "${value}"
  fi
}

# file token과 source URL을 query string에 안전하게 넣기 위해 URL 인코딩한다.
urlencode() {
  python3 - "$1" <<'PY'
import sys
import urllib.parse
print(urllib.parse.quote(sys.argv[1], safe="/._-"))
PY
}

# 검증 중 만든 WebRTC signaling session을 남기지 않도록 종료 시 정리한다.
cleanup() {
  if [[ -n "${SESSION_ID}" ]]; then
    curl -fsS -X DELETE "${HTTP_BASE}/webrtc/session/${SESSION_ID}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# relay 검증 실패 시 TURN 서버/정책/로컬 coturn 옵션 확인 순서를 안내한다.
print_turn_failure_hints() {
  cat <<EOF_HINT
[hint] TURN relay 검증 실패 시 확인 순서
[hint] 1. MEDIA_SERVER_WEBRTC_TURN_SERVER 형식: turn://user:pass@host:3478
[hint] 2. relay 강제 검증이면 MEDIA_SERVER_WEBRTC_ICE_TRANSPORT_POLICY=relay
[hint] 3. Mac 로컬 단일 머신 coturn 검증이면 coturn에 --allow-loopback-peers 필요
[hint] 4. 별도 호스트/운영 TURN이면 3478 TCP/UDP와 relay UDP range inbound 필요
[hint] 5. 외부 운영 TURN 서버 relay/auth end-to-end는 현재 프로젝트에서 아직 진행하지 않음
EOF_HINT
}

# 브라우저 playback 실패 시 ICE와 media 수신 원인을 빠르게 좁히는 힌트를 출력한다.
print_browser_failure_hints() {
  cat <<EOF_HINT
[hint] 브라우저 playback 실패 원인 후보
[hint] 1. relay policy에서 ICE가 failed/disconnected이면 TURN permission/channel bind 로그 확인
[hint] 2. Mac 로컬 coturn이면 --allow-loopback-peers 누락 여부 확인
[hint] 3. candidate는 relay인데 bytes/frames가 0이면 MediaServer WebRTC trace와 browser log 확인
[hint] 4. browser log: ${BROWSER_LOG}
EOF_HINT
}

# WHIP publish 실패 시 source readiness와 TURN 경로를 확인하도록 안내한다.
print_whip_failure_hints() {
  cat <<EOF_HINT
[hint] WHIP publish 검증 실패 원인 후보
[hint] 1. publisher source video/audio readiness timeout 여부 확인
[hint] 2. relay policy 강제 시 publisher/consumer 양쪽 TURN candidate 수집 여부 확인
[hint] 3. verify-codecs 로그: /tmp/media_server_${RUN_ID}_whip.log
EOF_HINT
}

require_cmd curl
require_cmd python3

HTTP_PORT="$(resolve_port "${MEDIA_SERVER_HTTP_LISTEN_PORT:-}" "kHttpListenPort" "8080")"
HTTP_ADDRESS="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-$(media_server_read_const_charp "${STD_AFX}" "kHttpListenAddress" || true)}"
HTTP_HOST="$(client_host "${MEDIA_SERVER_VERIFY_WEBRTC_ICE_HTTP_HOST:-${MEDIA_SERVER_VERIFY_HOST:-${HTTP_ADDRESS}}}")"
HTTP_BASE="${MEDIA_SERVER_VERIFY_WEBRTC_ICE_HTTP_BASE:-http://${HTTP_HOST}:${HTTP_PORT}}"
STUN_SERVER="${MEDIA_SERVER_WEBRTC_STUN_SERVER:-stun://stun.l.google.com:19302}"
TURN_SERVER="${MEDIA_SERVER_WEBRTC_TURN_SERVER:-}"
if [[ -n "${MEDIA_SERVER_VERIFY_WEBRTC_EXTERNAL_TURN_SERVER:-}" ]]; then
  TURN_SERVER="${MEDIA_SERVER_VERIFY_WEBRTC_EXTERNAL_TURN_SERVER}"
fi
ICE_POLICY="${MEDIA_SERVER_WEBRTC_ICE_TRANSPORT_POLICY:-all}"
EFFECTIVE_ICE_POLICY="${ICE_POLICY}"

log_info "http_base=${HTTP_BASE}"
log_info "file=${FILE_TOKEN}"
log_info "stun=${STUN_SERVER:-<unset>}"
log_info "turn=$([[ -n "${TURN_SERVER}" ]] && printf '<set>' || printf '<unset>')"
log_info "ice_policy=${ICE_POLICY} require_relay=${REQUIRE_RELAY}"
if [[ "${EXTERNAL_TURN_MODE}" == "1" && -z "${TURN_SERVER}" ]]; then
  log_skip "외부 운영 TURN 검증 생략: MEDIA_SERVER_WEBRTC_TURN_SERVER 또는 MEDIA_SERVER_VERIFY_WEBRTC_EXTERNAL_TURN_SERVER가 없습니다."
  echo "[info] Metered Open Relay도 TURN REST API credential은 무료 계정/API key가 필요합니다."
  python3 - "${SUMMARY_FILE}" <<'PY'
import json
import pathlib
import sys

pathlib.Path(sys.argv[1]).write_text(json.dumps({
    "mode": "external-turn",
    "status": "skip",
    "reason": "missing TURN credential",
    "note": "외부 운영 TURN relay 검증은 가입/API key 기반 credential이 필요하다.",
}, ensure_ascii=False, indent=2), encoding="utf-8")
PY
  echo "- summary: ${SUMMARY_FILE}"
  echo
  echo "== WebRTC ICE 설정 검증 요약 =="
  echo "- 통과: ${PASS_COUNT}"
  echo "- 실패: ${FAIL_COUNT}"
  echo "- 건너뜀: ${SKIP_COUNT}"
  exit 0
fi
if [[ "${TURN_SERVER}" =~ @127\.0\.0\.1:|@localhost:|@\[::1\]:|://127\.0\.0\.1:|://localhost:|://\[::1\]: ]]; then
  log_info "local TURN detected: Mac 단일 머신 coturn 검증이면 --allow-loopback-peers가 필요할 수 있습니다."
fi
if [[ "${EXTERNAL_TURN_MODE}" == "1" && "${TURN_SERVER}" =~ @127\.0\.0\.1:|@localhost:|@\[::1\]:|://127\.0\.0\.1:|://localhost:|://\[::1\]:|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\. ]]; then
  log_fail "--external-turn은 loopback/LAN TURN이 아닌 외부 운영 TURN credential 검증용입니다"
fi
if [[ "${EXTERNAL_TURN_MODE}" == "1" && "${ICE_POLICY}" != "relay" ]]; then
  log_fail "--external-turn 검증은 MEDIA_SERVER_WEBRTC_ICE_TRANSPORT_POLICY=relay가 필요합니다"
fi

if [[ "${ICE_POLICY}" != "all" && "${ICE_POLICY}" != "relay" ]]; then
  log_fail "MEDIA_SERVER_WEBRTC_ICE_TRANSPORT_POLICY는 all 또는 relay만 허용합니다: ${ICE_POLICY}"
fi
if [[ -n "${STUN_SERVER}" && ! "${STUN_SERVER}" =~ ^stun:// ]]; then
  log_fail "STUN URI는 stun:// 로 시작해야 합니다: ${STUN_SERVER}"
else
  log_pass "STUN URI 형식 확인"
fi
if [[ -n "${TURN_SERVER}" && ! "${TURN_SERVER}" =~ ^turns?:// ]]; then
  log_fail "TURN URI는 turn:// 또는 turns:// 로 시작해야 합니다"
else
  log_pass "TURN URI 형식 확인"
fi
if [[ "${ICE_POLICY}" == "relay" && -z "${TURN_SERVER}" ]]; then
  log_pass "relay 요청 + TURN 미설정 fallback 시나리오 확인 대상"
fi

if ! curl -fsS --max-time 3 "${HTTP_BASE}/health" >/dev/null; then
  log_fail "HTTP health check 실패: ${HTTP_BASE}/health"
  exit 1
fi
log_pass "HTTP health ok"

if curl -fsS --max-time 3 "${HTTP_BASE}/webrtc/config" > "${CONFIG_JSON}"; then
  EFFECTIVE_ICE_POLICY="$(python3 - "${CONFIG_JSON}" <<'PY'
import json
import pathlib
import sys
payload = json.loads(pathlib.Path(sys.argv[1]).read_text())
print((payload.get("peerConnectionConfig") or {}).get("iceTransportPolicy", payload.get("iceTransportPolicy", "all")))
PY
)"
  if python3 - "${CONFIG_JSON}" "${STUN_SERVER}" "${TURN_SERVER}" "${ICE_POLICY}" <<'PY'
import json
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
expected_stun = sys.argv[2]
expected_turn = sys.argv[3]
expected_policy = sys.argv[4]
payload = json.loads(path.read_text())
pc_config = payload.get("peerConnectionConfig") or {}
policy = pc_config.get("iceTransportPolicy", "all")
requested_policy = payload.get("requestedIceTransportPolicy", policy)
fallback = bool(payload.get("relayPolicyFallback"))
has_turn = bool(payload.get("hasTurn"))
servers = pc_config.get("iceServers") or []
urls = []
for server in servers:
    value = server.get("urls")
    if isinstance(value, list):
        urls.extend(str(item) for item in value)
    elif value:
        urls.append(str(value))
print("browser_ice_policy=", policy)
print("browser_requested_ice_policy=", requested_policy)
print("browser_relay_fallback=", fallback)
print("browser_ice_urls=", urls)
if expected_policy == "relay" and not expected_turn:
    if requested_policy != "relay" or policy != "all" or not fallback or has_turn:
        raise SystemExit(f"relay fallback mismatch: requested={requested_policy}, policy={policy}, fallback={fallback}, hasTurn={has_turn}")
elif policy != expected_policy:
    raise SystemExit(f"browser iceTransportPolicy mismatch: {policy} != {expected_policy}")
if expected_stun and not any(item.startswith("stun:") for item in urls):
    raise SystemExit("browser config에 STUN server가 없습니다")
if expected_turn and not any(item.startswith("turn:") or item.startswith("turns:") for item in urls):
    raise SystemExit("browser config에 TURN server가 없습니다")
if expected_turn:
    turn_servers = [server for server in servers if str(server.get("urls", "")).startswith(("turn:", "turns:"))]
    if not any(server.get("username") is not None and server.get("credential") is not None for server in turn_servers):
        raise SystemExit("browser config TURN server에 username/credential이 없습니다")
PY
  then
    log_pass "WebRTC browser ICE config 확인"
  else
    log_fail "WebRTC browser ICE config 검증 실패"
    print_turn_failure_hints
  fi
else
  log_fail "WebRTC browser ICE config 조회 실패: ${HTTP_BASE}/webrtc/config"
fi

QUERY="file=$(urlencode "${FILE_TOKEN}")"
if ! curl -fsS -X POST "${HTTP_BASE}/webrtc/session?${QUERY}" > "${SESSION_JSON}"; then
  log_fail "WebRTC session 생성 실패"
else
  SESSION_ID="$(python3 - "${SESSION_JSON}" <<'PY'
import json
import pathlib
import sys
payload = json.loads(pathlib.Path(sys.argv[1]).read_text())
print(payload.get("sessionId", ""))
PY
)"
  if [[ -z "${SESSION_ID}" ]]; then
    log_fail "WebRTC sessionId가 응답에 없습니다"
  else
    log_pass "WebRTC session 생성: ${SESSION_ID}"
  fi
fi

: > "${CANDIDATES_FILE}"
if [[ -n "${SESSION_ID}" ]]; then
  for _ in $(seq 1 "${POLL_COUNT}"); do
    curl -fsS "${HTTP_BASE}/webrtc/session/${SESSION_ID}/ice" >> "${CANDIDATES_FILE}" || true
    printf '\n' >> "${CANDIDATES_FILE}"
    sleep "${POLL_INTERVAL_S}"
  done

  if python3 - "${CANDIDATES_FILE}" "${REQUIRE_RELAY}" "${EFFECTIVE_ICE_POLICY}" <<'PY'
import collections
import json
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
require_relay = sys.argv[2] == "1"
policy = sys.argv[3]
counts = collections.Counter()
total = 0
samples = []
for line in path.read_text().splitlines():
    if not line.strip():
        continue
    try:
        payload = json.loads(line)
    except json.JSONDecodeError:
        continue
    for item in payload.get("candidates", []):
        candidate = item.get("candidate", "")
        match = re.search(r" typ ([a-zA-Z0-9_-]+)", candidate)
        ctype = match.group(1) if match else "unknown"
        counts[ctype] += 1
        total += 1
        if len(samples) < 6:
            samples.append(candidate)
print("candidate_total=", total)
print("candidate_types=", dict(counts))
print("candidate_samples=", samples)
if total <= 0:
    raise SystemExit("ICE candidate가 수집되지 않았습니다")
if require_relay and counts.get("relay", 0) <= 0:
    raise SystemExit("relay candidate가 없습니다. 실제 TURN 서버/계정 또는 relay policy 적용 상태를 확인하세요")
if policy == "relay" and counts.get("host", 0) > 0:
    raise SystemExit("relay policy에서 host candidate가 수집되었습니다. 서버가 relay policy로 시작됐는지 확인하세요")
PY
  then
    log_pass "ICE candidate 수집/정책 확인"
  else
    log_fail "ICE candidate 수집/정책 검증 실패"
    print_turn_failure_hints
  fi
fi

if [[ "${SKIP_BROWSER}" == "1" ]]; then
  log_skip "브라우저 WebRTC playback 검증 생략"
elif [[ -x "${SCRIPT_DIR}/browser_webrtc_publish_consume_check.mjs" || -f "${SCRIPT_DIR}/browser_webrtc_publish_consume_check.mjs" ]]; then
  if node "${SCRIPT_DIR}/browser_webrtc_publish_consume_check.mjs" \
      --http-base "${HTTP_BASE}" \
      --mode simple \
      --file "${FILE_TOKEN}" \
      --single-browser 1 \
      --hold-ms "${WEBRTC_HOLD_MS}" \
      --timeout-ms "${WEBRTC_TIMEOUT_MS}" > "${BROWSER_LOG}" 2>&1; then
    log_pass "브라우저 WebRTC file consume playback 확인"
  else
    log_fail "브라우저 WebRTC file consume playback 실패"
    tail -n 80 "${BROWSER_LOG}" || true
    print_browser_failure_hints
  fi
else
  log_skip "browser_webrtc_publish_consume_check.mjs 없음"
fi

if [[ "${SKIP_WHIP}" == "1" ]]; then
  log_skip "WHIP publish 검증 생략"
else
  if MEDIA_SERVER_VERIFY_SKIP_RTSP=1 MEDIA_SERVER_VERIFY_SOURCE_FILTER=webrtc_local_publish_h264_opus \
      "${ROOT_DIR}/server.sh" verify-codecs >/tmp/media_server_${RUN_ID}_whip.log 2>&1; then
    log_pass "WHIP publish -> WebRTC signaling 확인"
  else
    log_fail "WHIP publish -> WebRTC signaling 실패"
    tail -n 80 "/tmp/media_server_${RUN_ID}_whip.log" || true
    print_whip_failure_hints
  fi
fi

python3 - "${SUMMARY_FILE}" "${CONFIG_JSON}" "${CANDIDATES_FILE}" "${EXTERNAL_TURN_MODE}" "${REQUIRE_RELAY}" "${PASS_COUNT}" "${FAIL_COUNT}" "${SKIP_COUNT}" <<'PY'
import collections
import json
import pathlib
import re
import sys

summary_path = pathlib.Path(sys.argv[1])
config_path = pathlib.Path(sys.argv[2])
candidates_path = pathlib.Path(sys.argv[3])
counts = collections.Counter()
if candidates_path.exists():
    for line in candidates_path.read_text().splitlines():
        if not line.strip():
            continue
        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            continue
        for item in payload.get("candidates", []):
            match = re.search(r" typ ([a-zA-Z0-9_-]+)", item.get("candidate", ""))
            counts[match.group(1) if match else "unknown"] += 1
config = {}
if config_path.exists():
    try:
        config = json.loads(config_path.read_text())
    except json.JSONDecodeError:
        config = {}
summary = {
    "mode": "external-turn" if sys.argv[4] == "1" else "local",
    "requireRelay": sys.argv[5] == "1",
    "requestedIceTransportPolicy": config.get("requestedIceTransportPolicy", ""),
    "iceTransportPolicy": config.get("iceTransportPolicy", ""),
    "relayPolicyFallback": bool(config.get("relayPolicyFallback")),
    "hasStun": bool(config.get("hasStun")),
    "hasTurn": bool(config.get("hasTurn")),
    "candidateTypes": dict(sorted(counts.items())),
    "pass": int(sys.argv[6]),
    "fail": int(sys.argv[7]),
    "skip": int(sys.argv[8]),
}
summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
PY

echo
echo "== WebRTC ICE 설정 검증 요약 =="
echo "- 통과: ${PASS_COUNT}"
echo "- 실패: ${FAIL_COUNT}"
echo "- 건너뜀: ${SKIP_COUNT}"
echo "- browser config: ${CONFIG_JSON}"
echo "- candidates: ${CANDIDATES_FILE}"
echo "- browser log: ${BROWSER_LOG}"
echo "- summary: ${SUMMARY_FILE}"

if (( FAIL_COUNT > 0 )); then
  exit 1
fi
