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

media_server_apply_homebrew_gst_env() {
  local brew_prefix="${HOMEBREW_PREFIX:-/opt/homebrew}"

  if [[ ! -d "${brew_prefix}" ]]; then
    return 0
  fi

  export HOMEBREW_PREFIX="${brew_prefix}"
  export PATH="${brew_prefix}/bin:${PATH}"

  local pkg_path="${brew_prefix}/lib/pkgconfig:${brew_prefix}/share/pkgconfig"
  if [[ -n "${PKG_CONFIG_PATH:-}" ]]; then
    export PKG_CONFIG_PATH="${pkg_path}:${PKG_CONFIG_PATH}"
  else
    export PKG_CONFIG_PATH="${pkg_path}"
  fi

  local typelib_path="${brew_prefix}/lib/girepository-1.0"
  if [[ -d "${typelib_path}" ]]; then
    if [[ -n "${GI_TYPELIB_PATH:-}" ]]; then
      export GI_TYPELIB_PATH="${typelib_path}:${GI_TYPELIB_PATH}"
    else
      export GI_TYPELIB_PATH="${typelib_path}"
    fi
  fi

  local scanner_path=""
  if [[ -x "${brew_prefix}/libexec/gstreamer-1.0/gst-plugin-scanner" ]]; then
    scanner_path="${brew_prefix}/libexec/gstreamer-1.0/gst-plugin-scanner"
  else
    scanner_path="$(find "${brew_prefix}/Cellar/gstreamer" -path '*libexec/gstreamer-1.0/gst-plugin-scanner' 2>/dev/null | tail -n 1)"
  fi
  if [[ -n "${scanner_path}" && -x "${scanner_path}" ]]; then
    export GST_PLUGIN_SCANNER="${scanner_path}"
  fi

  local plugin_paths=()
  if [[ -d "${brew_prefix}/lib/gstreamer-1.0" ]]; then
    plugin_paths+=("${brew_prefix}/lib/gstreamer-1.0")
  fi
  if [[ -d "${brew_prefix}/opt/libnice-gstreamer/libexec/gstreamer-1.0" ]]; then
    plugin_paths+=("${brew_prefix}/opt/libnice-gstreamer/libexec/gstreamer-1.0")
  fi
  if [[ ${#plugin_paths[@]} -gt 0 ]]; then
    local joined
    joined="$(IFS=:; printf '%s' "${plugin_paths[*]}")"
    if [[ -n "${GST_PLUGIN_PATH:-}" ]]; then
      export GST_PLUGIN_PATH="${joined}:${GST_PLUGIN_PATH}"
    else
      export GST_PLUGIN_PATH="${joined}"
    fi
  fi

  local dyld_path="${brew_prefix}/lib:/usr/local/lib:/usr/lib"
  if [[ -n "${DYLD_FALLBACK_LIBRARY_PATH:-}" ]]; then
    export DYLD_FALLBACK_LIBRARY_PATH="${dyld_path}:${DYLD_FALLBACK_LIBRARY_PATH}"
  else
    export DYLD_FALLBACK_LIBRARY_PATH="${dyld_path}"
  fi
  if [[ -n "${DYLD_LIBRARY_PATH:-}" ]]; then
    export DYLD_LIBRARY_PATH="${dyld_path}:${DYLD_LIBRARY_PATH}"
  else
    export DYLD_LIBRARY_PATH="${dyld_path}"
  fi
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

  # Fallback: probe at shell level when python3 unavailable.
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

  # Fallback when python3 is unavailable.
  perl -e 'use IO::Socket::INET; my $s = IO::Socket::INET->new(LocalHost=>$ARGV[0], LocalPort=>$ARGV[1], Proto=>"tcp", Listen=>1, ReuseAddr=>1) and exit 0; exit 1' \
    "${addr}" "${port}" 2>/dev/null
  return $?
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
