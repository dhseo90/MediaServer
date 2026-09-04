#!/usr/bin/env bash
# 파일 용도: macOS/Homebrew GStreamer 환경변수와 공통 경로/포트 유틸리티를 제공한다.

media_server_read_const_charp() {
  local file_path="$1"
  local name="$2"
  awk -v key="$name" '
    BEGIN { in_block=0; value="" }
    {
      if (in_block == 0 && $0 ~ key "[[:space:]]*=") {
        in_block=1
      }
      if (in_block == 1) {
        line=$0
        while (match(line, /"[^"]*"/)) {
          part=substr(line, RSTART+1, RLENGTH-2)
          value=value part
          line=substr(line, RSTART+RLENGTH)
        }
        if ($0 ~ /;/) {
          print value
          exit 0
        }
      }
    }
  ' "${file_path}"
}

media_server_trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "${value}"
}

media_server_has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

media_server_resolve_project_path() {
  local root_dir="$1"
  local value="$2"
  if [[ -z "${value}" ]]; then
    return 0
  fi
  case "${value}" in
    /*)
      printf '%s' "${value}"
      ;;
    *)
      printf '%s/%s' "${root_dir}" "${value}"
      ;;
  esac
}

media_server_prepend_env_path() {
  local name="$1" addition="$2" current
  current="${!name:-}"
  case ":${current}:" in
    *":${addition}:"*) ;;
    *) printf -v "${name}" '%s' "${addition}${current:+:${current}}" ;;
  esac
  export "${name}"
}

media_server_apply_homebrew_gst_env() {
  # Linux의 distro GStreamer·LD_LIBRARY_PATH는 변경하지 않는다.
  [[ "$(uname -s)" == "Darwin" ]] || return 0
  local profile="${MEDIA_SERVER_GST_PLUGIN_PROFILE:-headless}"
  case "${profile}" in
    headless|system) ;;
    *) echo "[gstreamer 환경 오류] profile은 headless 또는 system이어야 합니다" >&2; return 1 ;;
  esac
  if [[ "${profile}" == "system" && -n "${MEDIA_SERVER_GST_MANAGED_PLUGIN_PATH:-}" ]]; then
    echo "[gstreamer 환경 오류] system 진단 모드는 공통 환경 적용 전 새 셸에서 지정하세요" >&2
    return 1
  fi
  local brew_prefix="${HOMEBREW_PREFIX:-}"
  if [[ -z "${brew_prefix}" ]] && media_server_has_cmd brew; then
    brew_prefix="$(brew --prefix 2>/dev/null)" || return 1
  fi
  if [[ -z "${brew_prefix}" ]]; then
    local candidate
    for candidate in /opt/homebrew /usr/local; do
      if [[ -d "${candidate}/lib/gstreamer-1.0" ]]; then brew_prefix="${candidate}"; break; fi
    done
  fi
  [[ -n "${brew_prefix}" && -d "${brew_prefix}/lib/gstreamer-1.0" ]] || return 0
  export HOMEBREW_PREFIX="${brew_prefix}"
  media_server_prepend_env_path PATH "${brew_prefix}/bin"
  media_server_prepend_env_path PKG_CONFIG_PATH "${brew_prefix}/lib/pkgconfig:${brew_prefix}/share/pkgconfig"
  if [[ -d "${brew_prefix}/lib/girepository-1.0" ]]; then
    media_server_prepend_env_path GI_TYPELIB_PATH "${brew_prefix}/lib/girepository-1.0"
  fi
  media_server_prepend_env_path DYLD_FALLBACK_LIBRARY_PATH "${brew_prefix}/lib:/usr/local/lib:/usr/lib"
  media_server_prepend_env_path DYLD_LIBRARY_PATH "${brew_prefix}/lib:/usr/local/lib:/usr/lib"
  # 전체 패키지를 살펴보는 명시적 진단 모드는 GST 검색/registry 설정을 덮어쓰지 않는다.
  [[ "${profile}" == "headless" ]] || return 0

  local scanner="${GST_PLUGIN_SCANNER_1_0:-${GST_PLUGIN_SCANNER:-}}"
  if [[ -z "${scanner}" ]]; then
    for candidate in "${brew_prefix}/opt/gstreamer/libexec/gstreamer-1.0/gst-plugin-scanner" \
                     "${brew_prefix}/libexec/gstreamer-1.0/gst-plugin-scanner"; do
      if [[ -x "${candidate}" ]]; then scanner="${candidate}"; break; fi
    done
  fi
  if [[ -z "${scanner}" || ! -x "${scanner}" ]] || ! media_server_has_cmd python3; then
    echo "[gstreamer 환경 오류] 실행 가능한 gst-plugin-scanner와 python3가 필요합니다" >&2
    return 1
  fi
  local input="${GST_PLUGIN_PATH_1_0-${GST_PLUGIN_PATH:-}}" item
  if [[ -n "${MEDIA_SERVER_GST_MANAGED_PLUGIN_PATH:-}" ]]; then
    # 부모가 적용한 경로 앞/뒤에 사용자 root를 추가한 경우에도 관리 캐시를 다시 수집하지 않는다.
    local managed_pattern=":${MEDIA_SERVER_GST_MANAGED_PLUGIN_PATH}:"
    local original_replacement=":${MEDIA_SERVER_GST_INPUT_PLUGIN_PATH:-}:"
    input=":${input}:"
    input="${input//"${managed_pattern}"/${original_replacement}}"
    input="${input#:}"
    input="${input%:}"
  fi
  local -a plugin_paths=() extra_paths=()
  IFS=: read -r -a extra_paths <<< "${input}"
  # Bash 3.2는 set -u에서 비어 있는 배열도 미정의로 취급한다.
  for item in "${extra_paths[@]-}" "${brew_prefix}/lib/gstreamer-1.0" \
              "${brew_prefix}/opt/libnice-gstreamer/libexec/gstreamer-1.0"; do
    [[ -d "${item}" ]] && plugin_paths+=("${item}")
  done
  local common_dir project_root bundle registry
  common_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  project_root="$(cd "${common_dir}/../.." && pwd)"
  bundle="$(python3 "${common_dir}/gst_plugin_cache.py" \
    "${MEDIA_SERVER_GST_CACHE_DIR:-${project_root}/.media_server.gstreamer}" \
    "${scanner}" "${plugin_paths[@]}")" || return 1
  registry="${GST_REGISTRY_1_0-${GST_REGISTRY:-}}"
  if [[ -z "${registry}" || "${registry}" == "${MEDIA_SERVER_GST_MANAGED_REGISTRY:-}" ]]; then
    registry="${bundle}/registry.bin"
    export MEDIA_SERVER_GST_MANAGED_REGISTRY="${registry}"
  fi
  local -a mirror_paths=()
  for item in "${bundle}/plugins/"*; do
    [[ -d "${item}" ]] && mirror_paths+=("${item}")
  done
  local joined
  joined="$(IFS=:; printf '%s' "${mirror_paths[*]}")"
  export MEDIA_SERVER_GST_INPUT_PLUGIN_PATH="${input}"
  export MEDIA_SERVER_GST_MANAGED_PLUGIN_PATH="${joined}"
  export GST_PLUGIN_PATH_1_0="${joined}" GST_PLUGIN_PATH="${joined}"
  export GST_PLUGIN_SYSTEM_PATH_1_0='' GST_PLUGIN_SYSTEM_PATH=''
  export GST_PLUGIN_SCANNER_1_0="${scanner}" GST_PLUGIN_SCANNER="${scanner}"
  export GST_REGISTRY_1_0="${registry}" GST_REGISTRY="${registry}"
}

media_server_is_tcp_listening() {
  local port="$1"

  if [[ -z "${port}" ]]; then
    return 1
  fi

  if media_server_has_cmd lsof; then
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
    return $?
  fi

  if media_server_has_cmd ss; then
    ss -ltnH "sport = :${port}" >/dev/null 2>&1
    return $?
  fi

  if media_server_has_cmd netstat; then
    netstat -ltn 2>/dev/null | grep -E "[:.]${port}([[:space:]]|$)" | grep -E "LISTEN|LISTENING" >/dev/null 2>&1
    return $?
  fi

  return 1
}

media_server_has_listener_probe() {
  if media_server_has_cmd lsof || media_server_has_cmd ss || media_server_has_cmd netstat; then
    return 0
  fi
  return 1
}

media_server_check_gst_dev_tools() {
  local missing=0

  if ! media_server_has_cmd cmake; then
    echo "[env] missing required command: cmake"
    missing=1
  fi

  if ! media_server_has_cmd pkg-config; then
    echo "[env] missing required command: pkg-config"
    missing=1
  else
    if ! pkg-config --exists gstreamer-1.0 gstreamer-rtsp-server-1.0 >/dev/null 2>&1; then
      echo "[env] pkg-config cannot find gstreamer-1.0 or gstreamer-rtsp-server-1.0"
      missing=1
    fi
  fi

  if (( missing != 0 )); then
    echo "[env] install/deps check: failed"
    echo "  run: ./server.sh install"
    return 1
  fi

  return 0
}

media_server_can_bind_udp_port() {
  local addr="$1"
  local port="$2"

  if command -v python3 >/dev/null 2>&1; then
    python3 - "$addr" "$port" <<'PY'
import socket
import sys

addr = sys.argv[1]
port = int(sys.argv[2])
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
try:
    sock.bind((addr, port))
except OSError:
    sys.exit(1)
else:
    sys.exit(0)
finally:
    sock.close()
PY
    return $?
  fi

  # 주요 동작: python3가 없으면 shell 수준의 perl probe로 UDP bind 가능 여부를 확인한다.
  perl -e 'use IO::Socket::INET; my $s = IO::Socket::INET->new(LocalHost=>$ARGV[0], LocalPort=>$ARGV[1], Proto=>"udp") and exit 0; exit 1' \
    "${addr}" "${port}" 2>/dev/null
  return $?
}

media_server_can_bind_tcp_port() {
  local addr="$1"
  local port="$2"

  if command -v python3 >/dev/null 2>&1; then
    python3 - "$addr" "$port" <<'PY'
import socket
import sys

addr = sys.argv[1]
port = int(sys.argv[2])
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    sock.bind((addr, port))
except OSError:
    sys.exit(1)
else:
    sys.exit(0)
finally:
    sock.close()
PY
    return $?
  fi

  # 주요 동작: python3가 없으면 shell 수준의 perl probe로 TCP bind 가능 여부를 확인한다.
  perl -e 'use IO::Socket::INET; my $s = IO::Socket::INET->new(LocalHost=>$ARGV[0], LocalPort=>$ARGV[1], Proto=>"tcp", Listen=>1, ReuseAddr=>1) and exit 0; exit 1' \
    "${addr}" "${port}" 2>/dev/null
  return $?
}

media_server_tcp_bind_error() {
  local addr="$1"
  local port="$2"

  if command -v python3 >/dev/null 2>&1; then
    python3 - "$addr" "$port" <<'PY'
import socket
import sys

addr = sys.argv[1]
port = int(sys.argv[2])
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    sock.bind((addr, port))
except OSError as exc:
    print(f"{exc.__class__.__name__}: {exc}")
    sys.exit(0)
else:
    sys.exit(1)
finally:
    sock.close()
PY
    return $?
  fi

  # 주요 동작: python3가 없으면 bind 실패 세부 원인을 알 수 없으므로 일반 메시지를 반환한다.
  if media_server_can_bind_tcp_port "${addr}" "${port}"; then
    return 1
  fi
  printf 'bind probe failed'
  return 0
}

media_server_is_tcp_bind_forbidden() {
  local addr="$1"
  local port="$2"

  if media_server_can_bind_tcp_port "${addr}" "${port}"; then
    return 1
  fi
  return 0
}

media_server_http_healthcheck() {
  local addr="$1"
  local port="$2"
  local path="${3:-/health}"

  if ! media_server_has_cmd curl; then
    return 1
  fi

  curl -fsS --max-time 2 "http://${addr}:${port}${path}" >/dev/null 2>&1
  return $?
}

media_server_rtsp_preflight() {
  local uri="$1"
  local timeout_ms="${2:-1500}"

  if [[ "${timeout_ms}" -le 0 ]]; then
    echo "RTSP preflight disabled"
    return 0
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    echo "python3 not found"
    return 1
  fi

  python3 - "$uri" "$timeout_ms" <<'PY'
import socket
import sys
import urllib.parse

uri = sys.argv[1]
timeout_ms = int(sys.argv[2])

try:
    parsed = urllib.parse.urlparse(uri)
except Exception as exc:
    print(f"invalid RTSP URI: {exc}")
    sys.exit(1)

if not parsed.scheme or not parsed.hostname:
    print(f"invalid RTSP URI: {uri}")
    sys.exit(1)

host = parsed.hostname
port = parsed.port or 554

last_error = None
try:
    infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
except OSError as exc:
    print(f"failed to resolve RTSP host '{host}': {exc}")
    sys.exit(1)

timeout_s = timeout_ms / 1000.0
for family, socktype, proto, _canon, sockaddr in infos:
    sock = socket.socket(family, socktype, proto)
    try:
        sock.settimeout(timeout_s)
        sock.connect(sockaddr)
    except OSError as exc:
        last_error = exc
    else:
        print(f"RTSP preflight ok: {host}:{port}")
        sys.exit(0)
    finally:
        sock.close()

if last_error is None:
    print(f"RTSP preflight failed for {host}:{port}")
else:
    print(f"RTSP preflight failed for {host}:{port} within {timeout_ms}ms ({last_error})")
sys.exit(1)
PY
}

media_server_is_udp_env_restricted() {
  local addr="$1"
  local -a test_ports=(44000 44001 44002 44010 44011 44100)
  local ok=0
  local p

  for p in "${test_ports[@]}"; do
    if media_server_can_bind_udp_port "${addr}" "${p}"; then
      ok=1
      break
    fi
  done

  if [[ ${ok} -eq 1 ]]; then
    return 1
  fi
  return 0
}
