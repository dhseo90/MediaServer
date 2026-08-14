#!/usr/bin/env bash
# 파일 용도: auth bootstrap/users/routes smoke 검증을 격리 users file과 포트에서 실행한다.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODE="${1:-}"
if [[ -z "${MODE}" ]]; then
  echo "usage: verify_auth_workflow.sh bootstrap|users|routes" >&2
  exit 2
fi

RUN_ID="auth-${MODE}-$(date +%s)-$$"
TMP_DIR="${TMPDIR:-/tmp}"
USERS_FILE="${TMP_DIR}/media_server_${RUN_ID}_users.json"
SOURCE_REGISTRY_FILE="${TMP_DIR}/media_server_${RUN_ID}_sources.json"
VIEWS_REGISTRY_FILE="${TMP_DIR}/media_server_${RUN_ID}_views.json"
ANALYSIS_REGISTRY_FILE="${TMP_DIR}/media_server_${RUN_ID}_analysis_registry.json"
ADMIN_COOKIE="${TMP_DIR}/media_server_${RUN_ID}_admin.cookie"
OP_COOKIE="${TMP_DIR}/media_server_${RUN_ID}_operator.cookie"
OP_READONLY_COOKIE="${TMP_DIR}/media_server_${RUN_ID}_operator_readonly.cookie"
VIEWER_COOKIE="${TMP_DIR}/media_server_${RUN_ID}_viewer.cookie"
INTEGRATOR_COOKIE="${TMP_DIR}/media_server_${RUN_ID}_integrator.cookie"
INVITE_COOKIE="${TMP_DIR}/media_server_${RUN_ID}_invite.cookie"
EXISTING_INVITE_COOKIE="${TMP_DIR}/media_server_${RUN_ID}_existing_invite.cookie"
REQUEST_COOKIE="${TMP_DIR}/media_server_${RUN_ID}_request.cookie"
LOG_FILE="${TMP_DIR}/media_server_${RUN_ID}.log"
ACCESS_REQUEST_PAYLOAD="${TMP_DIR}/media_server_${RUN_ID}_access_request_payload.json"
SERVER_PID=""
BASE=""

die_config() {
  echo "[fail] $*" >&2
  exit 2
}

require_auth_secret_env() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "${value}" ]]; then
    die_config "${name} is required. Auth verifier passwords must be provided by the test operator, not defaulted by the script."
  fi
  if [[ "${value}" == *$'\n'* || "${value}" == *$'\r'* ]]; then
    die_config "${name} must be a single-line value"
  fi
  printf '%s' "${value}"
}

TEST_PASSWORD="$(require_auth_secret_env MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD)"
# 교체/history 검증은 표준 smoke 비밀번호와 다른 이전 비밀번호가 필요하다.
PREVIOUS_PASSWORD="$(require_auth_secret_env MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD)"
SECOND_PREVIOUS_PASSWORD="$(require_auth_secret_env MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD)"
WRONG_PASSWORD_ONE="$(require_auth_secret_env MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE)"
WRONG_PASSWORD_TWO="$(require_auth_secret_env MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO)"

AUTH_SECRET_VALUES=("${TEST_PASSWORD}" "${PREVIOUS_PASSWORD}" "${SECOND_PREVIOUS_PASSWORD}" "${WRONG_PASSWORD_ONE}" "${WRONG_PASSWORD_TWO}")
for ((auth_secret_i = 0; auth_secret_i < ${#AUTH_SECRET_VALUES[@]}; auth_secret_i += 1)); do
  for ((auth_secret_j = auth_secret_i + 1; auth_secret_j < ${#AUTH_SECRET_VALUES[@]}; auth_secret_j += 1)); do
    if [[ "${AUTH_SECRET_VALUES[auth_secret_i]}" == "${AUTH_SECRET_VALUES[auth_secret_j]}" ]]; then
      die_config "auth verifier password env values must be distinct"
    fi
  done
done
unset AUTH_SECRET_VALUES auth_secret_i auth_secret_j

pass_count=0

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
    wait "${SERVER_PID}" >/dev/null 2>&1 || true
  fi
  rm -f "${USERS_FILE}" "${USERS_FILE}.tmp" \
    "${SOURCE_REGISTRY_FILE}" "${SOURCE_REGISTRY_FILE}".tmp* \
    "${VIEWS_REGISTRY_FILE}" "${VIEWS_REGISTRY_FILE}".tmp* \
    "${ANALYSIS_REGISTRY_FILE}" "${ANALYSIS_REGISTRY_FILE}".tmp* \
    "${ADMIN_COOKIE}" "${OP_COOKIE}" "${OP_READONLY_COOKIE}" \
    "${VIEWER_COOKIE}" "${INTEGRATOR_COOKIE}" \
    "${INVITE_COOKIE}" "${EXISTING_INVITE_COOKIE}" "${REQUEST_COOKIE}" \
    "${LOG_FILE}" "${ACCESS_REQUEST_PAYLOAD}"
  rm -f "${TMP_DIR}/media_server_${RUN_ID}_"*.payload
}
trap cleanup EXIT

info() {
  echo "[info] $*"
}

pass() {
  pass_count=$((pass_count + 1))
  echo "[pass] $*"
}

fail() {
  echo "[fail] $*" >&2
  if [[ -f "${LOG_FILE}" ]]; then
    echo "[log] ${LOG_FILE}" >&2
    tail -n 80 "${LOG_FILE}" >&2 || true
  fi
  exit 1
}

write_payload_file() {
  local label="$1"
  local value="$2"
  local payload_file="${TMP_DIR}/media_server_${RUN_ID}_${label}.payload"
  (umask 077; printf '%s' "${value}" >"${payload_file}")
  printf '%s' "${payload_file}"
}

choose_free_port() {
  local port="$1"
  local max="${2:-40}"
  local i=0
  while command -v lsof >/dev/null 2>&1 && \
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; do
    port=$((port + 1))
    i=$((i + 1))
    if (( i > max )); then
      fail "free TCP port not found near ${port}"
    fi
  done
  echo "${port}"
}

start_server() {
  local auth_mode="$1"
  local ui_home="${2:-lab}"
  local requested_http="${MEDIA_SERVER_VERIFY_AUTH_HTTP_PORT:-8091}"
  local requested_rtsp="${MEDIA_SERVER_VERIFY_AUTH_RTSP_PORT:-8565}"
  local http_port rtsp_port
  http_port="$(choose_free_port "${requested_http}")"
  rtsp_port="$(choose_free_port "${requested_rtsp}")"
  BASE="http://127.0.0.1:${http_port}"
  info "starting auth ${MODE} server: auth=${auth_mode} http=${http_port} rtsp=${rtsp_port}"
  MEDIA_SERVER_SKIP_LOCAL_ENV=1 \
  MEDIA_SERVER_SKIP_BUILD=1 \
  MEDIA_SERVER_AUTH_MODE="${auth_mode}" \
  MEDIA_SERVER_AUTH_USERS_FILE="${USERS_FILE}" \
  MEDIA_SERVER_SOURCE_REGISTRY="${SOURCE_REGISTRY_FILE}" \
  MEDIA_SERVER_PUBLISHED_VIEWS="${VIEWS_REGISTRY_FILE}" \
  MEDIA_SERVER_ANALYSIS_REGISTRY="${ANALYSIS_REGISTRY_FILE}" \
  MEDIA_SERVER_AUTH_LOGIN_MAX_FAILURES=2 \
  MEDIA_SERVER_AUTH_LOGIN_LOCKOUT_SECONDS=60 \
  MEDIA_SERVER_AUTH_PASSWORD_HISTORY_COUNT=2 \
  MEDIA_SERVER_UI_DEFAULT_HOME="${ui_home}" \
  MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 \
  MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 \
  MEDIA_SERVER_LISTEN_PORT="${rtsp_port}" \
  MEDIA_SERVER_HTTP_LISTEN_PORT="${http_port}" \
    "${ROOT_DIR}/server.sh" foreground >"${LOG_FILE}" 2>&1 &
  SERVER_PID=$!
  for _ in $(seq 1 80); do
    if curl -sS "${BASE}/health" >/dev/null 2>&1; then
      pass "server health ok (${BASE})"
      return
    fi
    if ! kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
      fail "server exited before health became ready"
    fi
    sleep 0.25
  done
  fail "server health timeout (${BASE})"
}

stop_server() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
    wait "${SERVER_PID}" >/dev/null 2>&1 || true
  fi
  SERVER_PID=""
}

header_status_location() {
  curl -sS -o /dev/null -D - "$@" | tr -d '\r' |
    awk 'BEGIN{s=""; l=""} /^HTTP/{s=$2} /^Location:/{l=$2} END{print s ":" l}'
}

response_header_value() {
  local header="$1"
  shift
  local wanted
  wanted="$(printf '%s' "${header}" | tr '[:upper:]' '[:lower:]')"
  curl -sS -o /dev/null -D - "$@" | tr -d '\r' |
    awk -v wanted="${wanted}" '
      BEGIN { value = "" }
      {
        line = $0
        split(line, parts, ":")
        if (tolower(parts[1]) == wanted) {
          sub(/^[^:]*:[ \t]*/, "", line)
          value = line
        }
      }
      END { print value }
    '
}

http_code() {
  curl -sS -o /dev/null -w "%{http_code}" "$@"
}

raw_http_code() {
  local payload="$1"
  local base="${BASE#http://}"
  local host="${base%%:*}"
  local port_part="${base#*:}"
  local port="${port_part%%/*}"
  local line
  exec 9<>"/dev/tcp/${host}/${port}" || {
    echo "000"
    return
  }
  printf "%b" "${payload}" >&9
  if ! IFS= read -r -t 3 line <&9; then
    line="HTTP/1.1 000"
  fi
  exec 9>&-
  line="${line%$'\r'}"
  printf '%s\n' "${line}" | awk '{print $2}'
}

expect_eq() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  if [[ "${actual}" != "${expected}" ]]; then
    fail "${label}: expected ${expected}, got ${actual}"
  fi
  pass "${label}: ${actual}"
}

file_mode() {
  local path="$1"
  if stat -f '%Lp' "${path}" >/dev/null 2>&1; then
    stat -f '%Lp' "${path}"
  else
    stat -c '%a' "${path}"
  fi
}

expect_auth_store_owner_only() {
  local label="${1:-auth users file owner-only mode}"
  [[ -f "${USERS_FILE}" ]] || fail "auth users file missing: ${USERS_FILE}"
  local mode
  mode="$(file_mode "${USERS_FILE}")"
  expect_eq "${mode}" "600" "${label}"
}

expect_auth_store_contains() {
  local label="$1"
  local needle="$2"
  if grep -Fq "${needle}" "${USERS_FILE}"; then
    pass "${label}"
  else
    fail "${label}: missing ${needle}"
  fi
}

expect_page_contains() {
  local label="$1"
  local url="$2"
  shift 2
  local html
  html="$(curl -fsS "${url}")"
  for needle in "$@"; do
    case "${html}" in
      *"${needle}"*) ;;
      *) fail "${label}: missing ${needle}" ;;
    esac
  done
  pass "${label}"
}

expect_cookie_page_contains() {
  local label="$1"
  local cookie="$2"
  local url="$3"
  shift 3
  local html
  html="$(curl -fsS -b "${cookie}" "${url}")"
  for needle in "$@"; do
    case "${html}" in
      *"${needle}"*) ;;
      *) fail "${label}: missing ${needle}" ;;
    esac
  done
  pass "${label}"
}

truthy() {
  case "${1:-}" in
    1|true|TRUE|yes|YES|on|ON) return 0 ;;
    *) return 1 ;;
  esac
}

auth_ui_smoke() {
  if ! truthy "${MEDIA_SERVER_VERIFY_AUTH_VISUAL:-0}"; then
    return
  fi
  local label="$1"
  local path="$2"
  local selector="$3"
  local cookie="${4:-}"
  shift 4 || true
  local page_spec="${label}|${path}|${selector}|${cookie}"
  local needle
  for needle in "$@"; do
    page_spec="${page_spec}|${needle}"
  done
  local args=(
    "${ROOT_DIR}/scripts/internal/verify_auth_ui_smoke.mjs"
    --http-base "${BASE}"
    --page "${page_spec}"
    --visual-widths "${MEDIA_SERVER_VERIFY_AUTH_VISUAL_WIDTHS:-320,390,760,1180}"
    --debug-port-base "${MEDIA_SERVER_VERIFY_AUTH_DEBUG_PORT_BASE:-9820}"
  )
  if truthy "${MEDIA_SERVER_VERIFY_AUTH_SCREENSHOTS:-0}"; then
    args+=(--screenshots)
  fi
  node "${args[@]}"
  pass "${label} auth visual smoke"
}

auth_scope_picker_smoke() {
  local enabled="${MEDIA_SERVER_VERIFY_AUTH_SCOPE_PICKER:-${MEDIA_SERVER_VERIFY_AUTH_VISUAL:-0}}"
  if ! truthy "${enabled}"; then
    return
  fi
  node "${ROOT_DIR}/scripts/internal/verify_auth_scope_picker.mjs" \
    --http-base "${BASE}" \
    --cookie-file "${ADMIN_COOKIE}" \
    --visual-width "${MEDIA_SERVER_VERIFY_AUTH_SCOPE_PICKER_WIDTH:-390}" \
    --debug-port "${MEDIA_SERVER_VERIFY_AUTH_SCOPE_PICKER_DEBUG_PORT:-9920}"
  pass "ops users scope picker browser smoke"
}

json_string_field() {
  local field="$1"
  sed -n "s/.*\"${field}\":\"\\([^\"]*\\)\".*/\\1/p"
}

json_first_source_field() {
  local field="$1"
  node -e 'const fs = require("fs");
const field = process.argv[1];
const data = JSON.parse(fs.readFileSync(0, "utf8"));
const source = Array.isArray(data.sources) ? data.sources[0] : null;
const value = source ? source[field] : "";
if (value !== undefined && value !== null) process.stdout.write(String(value));' "${field}"
}

assert_sources_api_freeze() {
  local payload_json
  # registry response의 field/type readback은 아래 frozen digest에 결속한다.
  payload_json="$(cat)"
  python3 - "${payload_json}" <<'PY'
import hashlib
import json
import sys

payload = json.loads(sys.argv[1])
sources = payload.get("sources")
if not isinstance(payload.get("status"), str) or not isinstance(sources, list) or not sources:
    raise SystemExit("SourceRegistry API requires status:string and non-empty sources:array")
assert (isinstance(payload.get("status"), str) and isinstance(sources, list) and bool(sources)), "SourceRegistry runtime readback requires status:string and non-empty sources:array"
source = sources[0]
required = {"sourceId": str, "displayName": str, "kind": str, "enabled": bool}
for field, field_type in required.items():
    if not isinstance(source.get(field), field_type):
        raise SystemExit(f"SourceRegistry API field/type mismatch: {field}={source.get(field)!r}")
shape = {"status": "string", "sources": [{"sourceId": "string", "displayName": "string", "kind": "string", "enabled": "boolean"}]}
digest = hashlib.sha256(json.dumps(shape, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
expected = "d6db4f603fbde478e5a4097daa8f5da4ba41e7cbdb42dea26bbda0546380763f"
if digest != expected:
    raise SystemExit(f"SourceRegistry API freeze SHA-256 mismatch: {digest} != {expected}")
print(f"[pass] SourceRegistry API field/type freeze SHA-256={digest}")
PY
}

assert_client_views_api_freeze() {
  local payload_json
  payload_json="$(cat)"
  python3 - "${payload_json}" <<'PY'
import hashlib
import json
import sys

payload = json.loads(sys.argv[1])
views = payload.get("views")
if payload.get("status") != "clientViews" or not isinstance(views, list) or not views:
    raise SystemExit("Client PublishedView projection requires status=clientViews and non-empty views:array")
view = views[0]
required = {
    "viewId": str, "sourceId": str, "displayName": str,
    "sourceDisplayName": str, "sourceKind": str, "sourceTags": list,
    "defaultRuleId": str, "allowedRuleIds": list, "allowedOverlayModes": list,
    "showDashboard": bool, "showEvents": bool, "showMetadataSummary": bool,
    "site": str, "group": str, "floor": str, "zone": str, "maxTiles": int,
}
for field, field_type in required.items():
    if not isinstance(view.get(field), field_type):
        raise SystemExit(f"Client PublishedView projection field/type mismatch: {field}={view.get(field)!r}")
shape = {"status": "string", "views": [{
    "viewId": "string", "sourceId": "string", "displayName": "string",
    "sourceDisplayName": "string", "sourceKind": "string", "sourceTags": "array",
    "defaultRuleId": "string", "allowedRuleIds": "array", "allowedOverlayModes": "array",
    "showDashboard": "boolean", "showEvents": "boolean", "showMetadataSummary": "boolean",
    "site": "string", "group": "string", "floor": "string", "zone": "string", "maxTiles": "number",
}]}
digest = hashlib.sha256(json.dumps(shape, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
expected = "f289c7a2e21e47ca7439ecdf12949cc106c9aa2b6e1b80eeaab4327980bc6d62"
if digest != expected:
    raise SystemExit(f"Client PublishedView projection freeze SHA-256 mismatch: {digest} != {expected}")
print(f"[pass] Client PublishedView projection field/type freeze SHA-256={digest}")
PY
}

assert_vaRule_session_id() {
  local session_id="$1"
  local response_json="$2"
  if printf '%s' "${session_id}" | grep -Eq '^client-live-[0-9a-f]{64}$'; then
    pass "client vaRule matching PublishedView source allowed"
  else
    fail "client vaRule matching source failed: ${response_json}"
  fi
}

assert_client_redacted_debug_absent() {
  local payload_json="$1"
  local client_html="${2:-}"
  local client_html_file
  client_html_file="$(write_payload_file client-redacted-html "${client_html}")"
  python3 - "${payload_json}" "${client_html_file}" <<'PY'
import json
import pathlib
import sys

payload = json.loads(sys.argv[1])
client_html = pathlib.Path(sys.argv[2]).read_text()
serialized = json.dumps(payload, sort_keys=True)
assert ('viewId' in serialized), "client public viewId must not be absent before redaction checks"
forbidden_keys = {"sourceUrl", "rtspUrl", "httpUrl", "whepUrl", "raw", "debug", "internalSession"}
def walk(value):
    if isinstance(value, dict):
        for key, nested in value.items():
            if key in forbidden_keys:
                raise SystemExit(f"client redacted debug/source/raw material absent oracle failed: {key}")
            walk(nested)
    elif isinstance(value, list):
        for nested in value:
            walk(nested)
    elif isinstance(value, str) and value.startswith(("rtsp://", "http://", "https://")):
        raise SystemExit("client redacted source URL absent oracle failed")
walk(payload)
for forbidden in ('id="opsVlmRawDetails"', 'data-vlm-task="raw-debug"', 'sourceUrl', 'rtsp://', 'whepUrl', 'internalSession'):
    assert (forbidden not in client_html), f"client HTML/UI debug/source/raw material must remain absent: {forbidden}"
PY
}

assert_auth_redacted_material_absent() {
  local payload_json="$1"
  python3 - "${payload_json}" <<'PY'
import json
import sys

payload = json.loads(sys.argv[1])
assert ("authenticated" in payload), "public authenticated field must not be absent before auth redaction checks"
forbidden = {"passwordHash", "passwordHistory", "tokenHash", "sessionId", "credential", "secret"}
def walk(value):
    if isinstance(value, dict):
        for key, nested in value.items():
            if key in forbidden:
                raise SystemExit(f"auth redacted material absent oracle failed: {key}")
            walk(nested)
    elif isinstance(value, list):
        for nested in value:
            walk(nested)
walk(payload)
PY
}

assert_viewer_whoami_exact_runtime() {
  local payload_json="$1"
  python3 - "${payload_json}" <<'PY'
import json
import sys

whoami = json.loads(sys.argv[1])
scopes = whoami.get("scopes") or []
assert (whoami.get("username") == "viewer-smoke" and whoami.get("role") == "viewer" and "view:read:1" in scopes and all(scope != "view:read:2" for scope in scopes)), "scopes exact username/role/view:read:1 session whoami readback failed"
PY
}

assert_session_role_landings_authoritative_runtime() {
  local operator_landing="$1"
  local viewer_landing="$2"
  local integrator_landing="$3"
  local logout_code="$4"
  local logged_out_whoami_code="$5"
  local relogin_landing="$6"
  python3 - "${operator_landing}" "${viewer_landing}" "${integrator_landing}" \
    "${logout_code}" "${logged_out_whoami_code}" "${relogin_landing}" <<'PY'
import sys

assert (sys.argv[1:7] == ["302:/ops/home", "302:/client/live", "302:/auth/whoami", "302", "401", "302:/client/live"]), "Set-Cookie session operator/viewer/integrator role landing, logout, and relogin lifecycle failed"
PY
}

assert_auth_artifact_ui_api_absent() {
  local api_json="$1"
  local ops_html="$2"
  local client_html="$3"
  local ops_html_file client_html_file
  ops_html_file="$(write_payload_file auth-artifact-ops-html "${ops_html}")"
  client_html_file="$(write_payload_file auth-artifact-client-html "${client_html}")"
  python3 - "${api_json}" "${ops_html_file}" "${client_html_file}" <<'PY'
import json
import pathlib
import sys

api = json.loads(sys.argv[1])
api_surface = json.dumps(api, sort_keys=True)
ui_surface = pathlib.Path(sys.argv[2]).read_text() + pathlib.Path(sys.argv[3]).read_text()
for token in ("passwordHash", "passwordHistory", "tokenHash", "sessionId", "providerCredential", "apiKey"):
    assert (token not in api_surface), f"auth material must remain absent from whoami API surface: {token}"
for token in ("passwordHash", "passwordHistory", "tokenHash", "providerCredential", "apiKey"):
    assert (token not in ui_surface), f"auth material must remain absent from product UI surface: {token}"
PY
}

assert_auth_bootstrap_authoritative_runtime() {
  local before_setup="$1"
  local hashless_setup="$2"
  local hashless_login_code="$3"
  local after_setup="$4"
  local passwordless_login_code="$5"
  local admin_whoami_json="$6"
  local cookie_text="$7"
  local protected_allow_code="$8"
  local protected_deny_location="$9"
  local logout_landing="${10}"
  local setup_ui_policy="${11}"
  local login_ui_policy="${12}"
  local users_ui_policy="${13}"
  local users_json="${14}"
  python3 - "${before_setup}" "${hashless_setup}" "${hashless_login_code}" "${after_setup}" \
    "${passwordless_login_code}" "${admin_whoami_json}" "${cookie_text}" "${USERS_FILE}" \
    "${protected_allow_code}" "${protected_deny_location}" "${logout_landing}" \
    "${setup_ui_policy}" "${login_ui_policy}" "${users_ui_policy}" "${users_json}" \
    "${TEST_PASSWORD}" "${PREVIOUS_PASSWORD}" "${SECOND_PREVIOUS_PASSWORD}" "${WRONG_PASSWORD_ONE}" "${WRONG_PASSWORD_TWO}" <<'PY'
import json
import pathlib
import sys

before_setup, hashless_setup, hashless_login_code, after_setup = sys.argv[1:5]
passwordless_login_code, whoami_raw, cookie_text, users_file = sys.argv[5:9]
protected_allow_code, protected_deny_location, logout_landing = sys.argv[9:12]
setup_ui_policy, login_ui_policy, users_ui_policy, users_raw = sys.argv[12:16]
store_raw = pathlib.Path(users_file).read_text()
store = json.loads(store_raw)
users = store.get("users") or []
admin = next((user for user in users if user.get("username") == "admin"), None)
whoami = json.loads(whoami_raw)
public_users = json.loads(users_raw)
assert (before_setup == "302:/setup" and after_setup == "302:/login" and protected_allow_code == "200" and protected_deny_location == "302:/login"), "AuthMode::Auto users/admin state setup-login-role gate transition failed"
assert (before_setup == "302:/setup" and hashless_setup == "302:/setup" and hashless_login_code == "403" and after_setup == "302:/login"), "/setup missing-users and admin passwordHash-absent preconditions are independently enforced"
assert (admin and admin.get("role") == "admin" and admin.get("enabled") is True), 'username = "admin" authoritative store readback failed'
assert (passwordless_login_code == "401" and hashless_login_code == "403" and bool(admin.get("passwordHash"))), "password_hash empty-password and hash-absent admin login rejection failed"
assert (admin.get("passwordHash") not in ("", None) and all(secret not in store_raw for secret in sys.argv[16:])), "password_history/passwordHash plaintext absence failed"
assert (whoami.get("authenticated") is True and whoami.get("username") == "admin" and whoami.get("role") == "admin"), "Authenticated session principal readback failed"
assert (whoami.get("scopes") == ["*"]), "bootstrap admin wildcard scope exact whoami readback failed"
assert ("media_server_session" in cookie_text), "Set-Cookie login session cookie readback failed"
assert (protected_allow_code == "200" and protected_deny_location == "302:/login" and logout_landing == "302:/login"), "session protected route cookie allow-deny and logout role landing failed"
assert (setup_ui_policy == "1" and login_ui_policy == "1" and users_ui_policy == "1" and any(user.get("username") == "admin" for user in public_users.get("users", []))), "admin setup/login/users UI and public user policy readback failed"
PY
}

assert_password_history_authoritative_runtime() {
  python3 - "${USERS_FILE}" "$1" "${TEST_PASSWORD}" "${PREVIOUS_PASSWORD}" "${SECOND_PREVIOUS_PASSWORD}" <<'PY'
import json
import pathlib
import sys

store_raw = pathlib.Path(sys.argv[1]).read_text()
store = json.loads(store_raw)
viewer = next(user for user in store.get("users", []) if user.get("username") == "viewer-smoke")
history = viewer.get("passwordHistory") or []
assert (sys.argv[2] == "400" and len(history) == 2 and all(isinstance(value, str) and value for value in history)), "password_history reuse rejected with authoritative storage rotation readback failed"
assert (all(secret not in store_raw for secret in sys.argv[3:])), "password_history raw password absence failed"
PY
}

assert_password_hash_algorithm_authoritative_runtime() {
  python3 - "${USERS_FILE}" "${TEST_PASSWORD}" <<'PY'
import json
import pathlib
import re
import sys

store_raw = pathlib.Path(sys.argv[1]).read_text()
store = json.loads(store_raw)
by_name = {user.get("username"): user for user in store.get("users", [])}
hashes = [by_name[name].get("passwordHash", "") for name in ("admin", "salt-smoke-a", "salt-smoke-b")]
pattern = re.compile(r"^\$argon2id\$v=\d+\$m=(\d+),t=(\d+),p=(\d+)\$([^$]+)\$([^$]+)$")
matches = [pattern.match(value) for value in hashes]
assert (all(matches) and all(all(int(value) > 0 for value in match.groups()[:3]) for match in matches)), "crypto_pwhash argon2id algorithm format and positive work-factor readback failed"
assert (hashes[1] != hashes[2] and matches[1].group(4) != matches[2].group(4) and sys.argv[2] not in store_raw), "passwordHash per-record salt independence and plaintext absence failed"
PY
}

assert_user_creation_authoritative_runtime() {
  local create_json="$1"
  local invalid_code="$2"
  local users_json="$3"
  local users_html="$4"
  python3 - "${create_json}" "${invalid_code}" "${users_json}" "${users_html}" "${USERS_FILE}" <<'PY'
import json
import pathlib
import sys

created, invalid_code, listed, users_html = json.loads(sys.argv[1]), sys.argv[2], json.loads(sys.argv[3]), sys.argv[4]
store = json.loads(pathlib.Path(sys.argv[5]).read_text())
stored = next((user for user in store.get("users", []) if user.get("username") == "viewer-smoke"), None)
public = json.dumps([created, listed], sort_keys=True) + users_html
assert (created.get("status") == "created" and stored and any(user.get("username") == "viewer-smoke" for user in listed.get("users", []))), "users->push_back(candidate) create API/store/list readback failed"
assert (invalid_code == "400"), "user create validation rejection failed"
assert ("passwordHash" not in public), "AppendPublicUserJson password_hash API and /ops/users UI absence failed"
assert ("passwordHistory" not in public), "AppendPublicUserJson password_history API and /ops/users UI absence failed"
assert ("tokenHash" not in public), "AppendPublicUserJson token_hash API and /ops/users UI absence failed"
PY
}

assert_user_update_authoritative_runtime() {
  local update_json="$1"
  local users_json="$2"
  python3 - "${update_json}" "${users_json}" "${USERS_FILE}" <<'PY'
import json
import pathlib
import sys

updated, listed = json.loads(sys.argv[1]), json.loads(sys.argv[2])
store = json.loads(pathlib.Path(sys.argv[3]).read_text())
stored = next(user for user in store.get("users", []) if user.get("username") == "edit-smoke")
listed_user = next(user for user in listed.get("users", []) if user.get("username") == "edit-smoke")
detail = updated.get("user") or {}
assert (updated.get("status") == "updated" and stored.get("displayName") == "Edit Smoke Updated" and stored.get("role") == "operator" and stored.get("scopes") == ["ops:read"] and stored.get("enabled") is False and listed_user.get("role") == "operator" and listed_user.get("scopes") == ["ops:read"] and listed_user.get("enabled") is False and detail.get("role") == "operator"), "SaveUsersFile role/scope/status edit response-detail/store/list readback failed"
PY
}

assert_user_enabled_authoritative_runtime() {
  local expected_enabled="$1"
  local users_json="$2"
  local login_code="$3"
  local protected_code="$4"
  python3 - "${expected_enabled}" "${users_json}" "${login_code}" "${protected_code}" "${USERS_FILE}" <<'PY'
import json
import pathlib
import sys

expected = sys.argv[1] == "true"
listed = json.loads(sys.argv[2])
store = json.loads(pathlib.Path(sys.argv[5]).read_text())
stored = next(user for user in store.get("users", []) if user.get("username") == "viewer-smoke")
listed_user = next(user for user in listed.get("users", []) if user.get("username") == "viewer-smoke")
if expected:
    assert (stored.get("enabled") is True and listed_user.get("enabled") is True and sys.argv[3] == "302" and sys.argv[4] == "200"), "user.enabled enable/restore API/store/login and protected client access readback failed"
else:
    assert (stored.get("enabled") is False and listed_user.get("enabled") is False and sys.argv[3] == "401" and sys.argv[4] == "401"), "user.enabled disable/delete API/store/login and existing session revoke readback failed"
PY
}

assert_password_reset_authoritative_runtime() {
  local users_json="$1"
  local revoked_session_code="$2"
  local forced_landing="$3"
  python3 - "${users_json}" "${revoked_session_code}" "${forced_landing}" "${USERS_FILE}" <<'PY'
import json
import pathlib
import sys

listed = json.loads(sys.argv[1])
store = json.loads(pathlib.Path(sys.argv[4]).read_text())
stored = next(user for user in store.get("users", []) if user.get("username") == "viewer-smoke")
listed_user = next(user for user in listed.get("users", []) if user.get("username") == "viewer-smoke")
assert (stored.get("mustChangePassword") is True and listed_user.get("mustChangePassword") is True and sys.argv[2] == "401" and sys.argv[3] == "302:/password/change"), "must_change_password reset/session revoke/forced-change readback failed"
PY
}

assert_last_admin_authoritative_runtime() {
  local disable_code="$1"
  local downgrade_code="$2"
  local users_json="$3"
  local users_html="$4"
  python3 - "${disable_code}" "${downgrade_code}" "${users_json}" "${users_html}" "${USERS_FILE}" <<'PY'
import json
import pathlib
import sys

listed = json.loads(sys.argv[3])
users_html = sys.argv[4]
store = json.loads(pathlib.Path(sys.argv[5]).read_text())
stored = next(user for user in store.get("users", []) if user.get("username") == "admin")
listed_admin = next(user for user in listed.get("users", []) if user.get("username") == "admin")
assert (sys.argv[1:3] == ["409", "409"] and stored.get("enabled") is True and stored.get("role") == "admin" and listed_admin.get("role") == "admin" and "마지막 활성 admin이면 서버가 비활성화를 거부합니다." in users_html), "HasAnotherEnabledAdmin last-admin disable/downgrade and UI rejection copy readback failed"
PY
}

assert_invite_hash_redaction_authoritative_runtime() {
  local invite_id="$1"
  local raw_token="$2"
  local invite_list_json="$3"
  local users_html="$4"
  python3 - "${invite_id}" "${raw_token}" "${invite_list_json}" "${users_html}" "${USERS_FILE}" <<'PY'
import json
import pathlib
import sys

invite_id, raw_token, list_raw, users_html, users_file = sys.argv[1:6]
store_raw = pathlib.Path(users_file).read_text()
store = json.loads(store_raw)
invite = next(item for item in store.get("invites", []) if item.get("inviteId") == invite_id)
token_hash = invite.get("tokenHash")
listed = json.loads(list_raw)
assert (token_hash and token_hash != raw_token and raw_token not in store_raw), "token_hash invite authoritative hash/raw-token absence failed"
assert (raw_token not in list_raw and "tokenHash" not in list_raw and raw_token not in users_html and "tokenHash" not in users_html), "AppendInviteSummaryJson invite API/UI token absent readback failed"
assert (any(item.get("inviteId") == invite_id for item in listed.get("invites", []))), "invite list independent readback missing"
PY
}

assert_user_token_hash_authoritative_runtime() {
  local raw_token="$1"
  local whoami_json="$2"
  local unauth_code="$3"
  local mutated_code="$4"
  local sources_code="$5"
  local rules_code="$6"
  local users_code="$7"
  local users_html="$8"
  python3 - "${raw_token}" "${whoami_json}" "${unauth_code}" "${mutated_code}" \
    "${sources_code}" "${rules_code}" "${users_code}" "${users_html}" "${USERS_FILE}" <<'PY'
import json
import pathlib
import sys

raw_token, whoami_raw, unauth_code, mutated_code = sys.argv[1:5]
sources_code, rules_code, users_code, users_html, users_file = sys.argv[5:10]
raw_token_write = raw_token
store_raw = pathlib.Path(users_file).read_text()
store = json.loads(store_raw)
operator = next(user for user in store.get("users", []) if user.get("username") == "operator-smoke")
whoami = json.loads(whoami_raw)
token_hash = operator.get("tokenHash")
assert (token_hash and token_hash != raw_token_write and raw_token_write not in store_raw and "tokenHash" not in whoami_raw and "tokenHash" not in users_html), "token_hash libsodium fixture raw token no-write and API/UI raw material absent readback failed"
observed = {
    "unauth": unauth_code,
    "mutated": mutated_code,
    "sources": sources_code,
    "rules": rules_code,
    "users": users_code,
    "username": whoami.get("username"),
    "role": whoami.get("role"),
    "scopes": whoami.get("scopes") or [],
}
assert (unauth_code == "401" and mutated_code == "401" and sources_code == "200" and rules_code == "200" and users_code == "403" and whoami.get("username") == "operator-smoke" and whoami.get("role") == "operator" and "ops:read" in observed["scopes"]), f"PrincipalFromUserToken bearer principal and scope-specific endpoint guard readback failed: {observed}"
PY
}

assert_auth_off_authoritative_runtime() {
  local root_location="$1"
  local whoami_json="$2"
  local users_code="$3"
  local auto_default_root="$4"
  python3 - "${root_location}" "${whoami_json}" "${users_code}" "${auto_default_root}" <<'PY'
import json
import sys

whoami = json.loads(sys.argv[2])
assert (sys.argv[4] == "302:/setup" and sys.argv[1] == "302:/ops/home" and sys.argv[3] == "200" and whoami.get("role") == "admin" and whoami.get("username") == ""), "AuthMode::Off explicit non-default development principal versus default Auto runtime readback failed"
PY
}

assert_admin_role_routes_authoritative_runtime() {
  python3 - "$@" <<'PY'
import sys

users_page_code, rules_page_code, sources_page_code, users_api_code, source_action_code, rule_action_code, admin_action_code, operator_admin_action_code, users_html = sys.argv[1:10]
observed = {
    "usersPage": users_page_code,
    "rulesPage": rules_page_code,
    "sourcesPage": sources_page_code,
    "usersApi": users_api_code,
    "sourceAction": source_action_code,
    "ruleAction": rule_action_code,
    "adminAction": admin_action_code,
    "operatorAdminAction": operator_admin_action_code,
    "usersDom": 'data-testid="ops-users-page"' in users_html,
}
assert (users_page_code == "200" and rules_page_code == "200" and sources_page_code == "200" and users_api_code == "200" and source_action_code == "201" and rule_action_code == "200" and admin_action_code == "201" and operator_admin_action_code == "403" and observed["usersDom"]), f"IsAdmin ops/users/rules/sources routes and admin action allow/operator deny readback failed: {observed}"
PY
}

assert_auth_role_scope_authoritative_runtime() {
  python3 - "$@" <<'PY'
import json
import sys

(viewer_landing, viewer_ops_code, viewer_lab_code, viewer_client_html, client_views_raw,
 integrator_landing, integrator_client_code, integrator_views_raw, integrator_event_code,
 integrator_metadata_code, integrator_dashboard_code, readonly_read_code, readonly_source_write_code,
 readonly_rule_write_code, operator_source_raw, operator_rule_code, lab_read_code, lab_viewer_code,
 cross_view_dashboard_code, cross_view_webrtc_code, unauth_code, unauth_body, forbidden_code,
 forbidden_body, cors_actual_code, cors_preflight_code, cors_allow_origin) = sys.argv[1:28]
client_views = json.loads(client_views_raw)
integrator_views = json.loads(integrator_views_raw)
operator_source = json.loads(operator_source_raw)
operator_source_record = operator_source.get("source") or operator_source
viewer_ids = [str(item.get("viewId")) for item in client_views.get("views", [])]
integrator_ids = [str(item.get("viewId")) for item in integrator_views.get("views", [])]
assert (viewer_landing == "302:/client/live" and viewer_ops_code == "403" and viewer_lab_code == "403" and 'data-testid="client-shell-page"' in viewer_client_html), "view:read viewer client-only route/API allow-deny boundary failed"
assert (integrator_landing == "302:/auth/whoami" and integrator_client_code == "403" and not integrator_ids and integrator_event_code == "200" and integrator_metadata_code == "200" and integrator_dashboard_code == "403"), "integrator API/scope-only product UI boundary failed"
ops_write_performed = readonly_source_write_code == "200" or readonly_rule_write_code == "200"
assert (readonly_read_code == "200" and ops_write_performed is False), "ops:read read-only allow and write action no-write boundary failed"
other_write_performed = readonly_source_write_code == "200"
unrelated_mutation_changed = readonly_rule_write_code == "200"
assert (operator_source.get("status") == "created" and operator_source_record.get("sourceId") == "30" and operator_rule_code == "200" and readonly_source_write_code == "403" and readonly_rule_write_code == "403" and other_write_performed is False and unrelated_mutation_changed is False), "source:write rule:write scoped mutation and other write/no-mutation boundary failed"
assert (viewer_ids == ["1"] and "2" not in viewer_ids), "ClientViewsJson PrincipalCanReadView assigned view only client readback failed"
assert (lab_read_code == "200" and lab_viewer_code == "403"), "lab scope required API read guard allow-deny readback failed"
lab_write_performed = readonly_rule_write_code == "200"
assert (lab_read_code == "200" and lab_write_performed is False), "lab scope required operator or lab:read without separate lab write readback failed"
assert (cross_view_dashboard_code == "403" and cross_view_webrtc_code == "403" and viewer_ops_code == "403"), "PrincipalCanReadView route guard browser/API consistency failed"
forbidden_serialized = unauth_body + forbidden_body
assert (unauth_code == "401" and forbidden_code == "403" and all(token not in forbidden_serialized for token in ("passwordHash", "passwordHistory", "tokenHash", "sessionId", "credential"))), "403 unauthorized/forbidden API payload redaction failed"
assert (cors_actual_code == "403" and cors_preflight_code == "403" and cors_allow_origin == ""), "CorsForbiddenResponse disallowed origin actual/preflight rejection failed"
PY
}

assert_invite_creation_authoritative_runtime() {
  python3 - "$1" "$2" "$3" "$4" "${USERS_FILE}" <<'PY'
import json, pathlib, sys
created_raw, invite_id, raw_token, listed_raw, users_file = sys.argv[1:6]
created, listed = json.loads(created_raw), json.loads(listed_raw)
store_raw = pathlib.Path(users_file).read_text(); store = json.loads(store_raw)
invite = next(item for item in store.get("invites", []) if item.get("inviteId") == invite_id)
raw_token_write = raw_token
assert (created.get("status") == "inviteCreated" and invite.get("tokenHash") and any(item.get("inviteId") == invite_id for item in listed.get("invites", [])) and raw_token_write not in store_raw and raw_token_write not in listed_raw), "store.invites invite create API/store/list raw token absent no-write readback failed"
PY
}

assert_invite_accept_authoritative_runtime() {
  python3 - "$1" "$2" "$3" "$4" "${USERS_FILE}" <<'PY'
import json, pathlib, sys
setup_code, login_code, whoami_raw, client_code, users_file = sys.argv[1:6]
whoami = json.loads(whoami_raw); store = json.loads(pathlib.Path(users_file).read_text())
user = next(item for item in store.get("users", []) if item.get("username") == "invite-smoke")
invite = next(item for item in store.get("invites", []) if item.get("username") == "invite-smoke")
assert (setup_code == "302" and login_code == "302" and client_code == "200" and invite.get("used") is True and user.get("enabled") is True and whoami.get("role") == "viewer" and "view:read:1" in (whoami.get("scopes") or [])), "invite.used setup/login/client role-scope acceptance readback failed"
PY
}

assert_invite_invalid_authoritative_runtime() {
  python3 - "$1" "$2" "$3" "${USERS_FILE}" <<'PY'
import json, pathlib, sys
consumed_code, expired_code, invite_id, users_file = sys.argv[1:5]
store = json.loads(pathlib.Path(users_file).read_text())
invite = next(item for item in store.get("invites", []) if item.get("inviteId") == invite_id)
assert (consumed_code == "401" and expired_code == "410" and invite.get("used") is True), "invite.used consumed/expired token status split with authoritative store readback failed"
PY
}

assert_access_request_pending_authoritative_runtime() {
  local access_request_form_html
  access_request_form_html="$(curl -fsS "${BASE}/client/request-access")"
  python3 - "$1" "$2" "$3" "$4" "${access_request_form_html}" "${USERS_FILE}" <<'PY'
import json, pathlib, sys
request_id, created_raw, listed_raw, pending_login, form_html, users_file = sys.argv[1:7]
created, listed = json.loads(created_raw), json.loads(listed_raw); store = json.loads(pathlib.Path(users_file).read_text())
request = next(item for item in store.get("accessRequests", []) if item.get("requestId") == request_id)
assert (created.get("status") == "pending" and request.get("status") == "pending" and any(item.get("requestId") == request_id and item.get("status") == "pending" for item in listed.get("accessRequests", [])) and 'data-testid="auth-access-request-form"' in form_html), "store.access_requests public request pending API/store/auth-access-request-form readback failed"
pending_users = [item for item in store.get("users", []) if item.get("username") == "request-smoke"]
assert (pending_login == "401" and not pending_users and not request.get("inviteId")), "store.access_requests pending user/session/view scope absence failed"
PY
}

assert_access_request_approved_authoritative_runtime() {
  python3 - "$1" "$2" "$3" "$4" "${USERS_FILE}" <<'PY'
import json, pathlib, sys
request_id, approved_raw, raw_token, users_raw, users_file = sys.argv[1:6]
users = json.loads(users_raw); store_raw = pathlib.Path(users_file).read_text(); store = json.loads(store_raw)
request = next(item for item in store.get("accessRequests", []) if item.get("requestId") == request_id)
invite = next(item for item in store.get("invites", []) if item.get("inviteId") == request.get("inviteId"))
assert (request.get("status") == "approved" and invite.get("viewId") == "2" and invite.get("tokenHash") and raw_token not in store_raw and all(item.get("username") != "request-smoke" for item in users.get("users", []))), "store->invites access request approve invite/view scope API/store readback failed"
PY
}

assert_access_request_rejected_authoritative_runtime() {
  python3 - "$1" "$2" "${USERS_FILE}" <<'PY'
import json, pathlib, sys
request_id, listed_raw, users_file = sys.argv[1:4]
listed = json.loads(listed_raw); store = json.loads(pathlib.Path(users_file).read_text())
request = next(item for item in store.get("accessRequests", []) if item.get("requestId") == request_id); username = request.get("username")
assert (request.get("status") == "rejected" and any(item.get("requestId") == request_id and item.get("status") == "rejected" for item in listed.get("accessRequests", [])) and all(item.get("username") != username for item in store.get("users", [])) and all(item.get("username") != username for item in store.get("invites", []))), "request.status rejected invite/session/view scope absence readback failed"
PY
}

assert_vlm_install_scope_runtime_boundary() {
  local before_json="$1"
  local dry_run_json="$2"
  local after_json="$3"
  local ops_html="$4"
  local client_html="$5"
  local ops_html_file client_html_file
  ops_html_file="$(write_payload_file vlm-install-ops-html "${ops_html}")"
  client_html_file="$(write_payload_file vlm-install-client-html "${client_html}")"
  python3 - "${before_json}" "${dry_run_json}" "${after_json}" "${ops_html_file}" "${client_html_file}" <<'PY'
import json
import pathlib
import sys

before, dry_run, after = [json.loads(value) for value in sys.argv[1:4]]
assert (before == after), "VLM install dry-run must not mutate profile storage"
serialized = json.dumps(dry_run, sort_keys=True)
for field in ("profileStored", "runtimeVlmCallPerformed", "sidecarStored", "cloudProviderApiCalled", "eventPostPayloadChanged", "webrtcDataChannelSchemaChanged", "sseMetadataSchemaChanged", "wsMetadataSchemaChanged", "rtspOrWebrtcMediaPathChanged", "viewerClientExposureAdded"):
    if f'"{field}": true' in serialized:
        raise SystemExit(f"VLM install scope no-write/no-mutation boundary failed: {field}")
assert ('data-testid="ops-vlm-page"' in pathlib.Path(sys.argv[4]).read_text()), "Ops VLM install UI marker missing"
assert ('data-testid="ops-vlm-page"' not in pathlib.Path(sys.argv[5]).read_text()), "viewer/client must not expose Ops VLM install UI"
PY
}

assert_vlm_profile_authoritative_persistence() {
  local profile_json="$1"
  local registry_file="$2"
  python3 - "${profile_json}" "${registry_file}" <<'PY'
import json
import pathlib
import sys

payload = json.loads(sys.argv[1])
profile = payload.get("profile") or payload.get("vlmProfile") or payload
runtime = profile.get("runtimeContract") or {}
side_effects = runtime.get("sideEffects") or {}
assert (profile.get("id") == "vlm-route-smoke" and side_effects.get("runtimeVlmCallPerformed") is False and side_effects.get("sidecarStored") is False and side_effects.get("cloudProviderApiCalled") is False), "VLM profile authoritative GET permits profile persistence only; runtime/sidecar/provider no-write must remain absent/false"
registry = json.loads(pathlib.Path(sys.argv[2]).read_text())
stored = registry.get("vlmProfiles") or []
assert any(item.get("id") == "vlm-route-smoke" for item in stored), "VLM profile authoritative storage mutation missing"
serialized = json.dumps(profile, sort_keys=True)
for token in ("apiKey", "providerCredential", "rawPrompt", "rawResponse", "sourceUrl", "frameBytes"):
    assert (token not in serialized), f"VLM profile credential/raw boundary failed: {token}"
assert (all(token not in serialized for token in ("apiKey", "providerCredential", "rawPrompt", "rawResponse", "rawJson", "rawEvidence", "rawLocator", "sourceUrl", "frameBytes"))), "VLM profile raw/sourceUrl/credential material must remain absent"
PY
}

assert_vlm_privacy_redaction_absent() {
  local payload_json="$1"
  python3 - "${payload_json}" <<'PY'
import json
import sys

payload = json.loads(sys.argv[1])
assert (payload.get("schema") == "media-server.vlm-profile-registry.v1"), "VLM privacy readback registry schema mismatch"
forbidden_keys = {
    "rawprompt",
    "rawresponse",
    "rawjson",
    "rawlocator",
    "sourceurl",
    "apikey",
    "providercredential",
    "credentialmaterial",
    "providermaterial",
    "providerrequest",
    "providerresponse",
    "framebytes",
    "password",
    "authorization",
    "accesstoken",
    "refreshtoken",
}

def inspect(value):
    if isinstance(value, dict):
        for key, child in value.items():
            if key.lower() in forbidden_keys:
                raise SystemExit(f"VLM privacy redaction absent oracle failed: {key}")
            inspect(child)
    elif isinstance(value, list):
        for child in value:
            inspect(child)

inspect(payload)
for profile in payload.get("vlmProfiles", payload.get("profiles", [])):
    redaction = (profile.get("privacyGuard") or {}).get("redaction") or {}
    for field, value in redaction.items():
        if field.endswith("Stored") or field == "viewerClientExposureAdded":
            if value is not False:
                raise SystemExit(f"VLM privacy redaction field must be false: {field}")
PY
}

assert_product_ui_lab_editor_absent() {
  local ops_html="$1"
  local client_html="$2"
  local ops_html_file client_html_file
  ops_html_file="$(write_payload_file product-lab-ops-html "${ops_html}")"
  client_html_file="$(write_payload_file product-lab-client-html "${client_html}")"
  python3 - "${ops_html_file}" "${client_html_file}" <<'PY'
import pathlib
import sys

ops_html, client_html = [pathlib.Path(value).read_text() for value in sys.argv[1:3]]
assert ('data-testid="ops-home-page"' in ops_html), "ops home marker must not be absent before lab editor absence checks"
assert ('data-testid="client-shell-page"' in client_html), "client shell functional HTML marker missing"
combined = ops_html + client_html
for forbidden in ('data-testid="lab-analysis-editor"', 'id="labAnalysisEditor"', 'data-lab-editor='):
    assert (forbidden not in combined), f"lab development editor must remain absent from product UI: {forbidden}"
PY
}

assert_role_navigation_action_boundaries() {
  local ops_home_html="$1"
  local operator_sources_html="$2"
  local readonly_sources_html="$3"
  local client_html="$4"
  local ops_home_file operator_sources_file readonly_sources_file client_html_file
  ops_home_file="$(write_payload_file role-nav-ops-home "${ops_home_html}")"
  operator_sources_file="$(write_payload_file role-nav-operator-sources "${operator_sources_html}")"
  readonly_sources_file="$(write_payload_file role-nav-readonly-sources "${readonly_sources_html}")"
  client_html_file="$(write_payload_file role-nav-client-html "${client_html}")"
  python3 - "${ops_home_file}" "${operator_sources_file}" "${readonly_sources_file}" "${client_html_file}" <<'PY'
import pathlib
import sys

ops_home, operator_sources, readonly_sources, client_html = [pathlib.Path(value).read_text() for value in sys.argv[1:5]]
assert ('data-testid="ops-home-page"' in ops_home), "IsAdmin admin Ops/users/rules/sources access boundary missing"
assert ('data-scope-state="source-write-allowed"' in operator_sources and 'aria-disabled="false"' in operator_sources), "operator allowed action boundary missing"
assert ('data-scope-state="source-write-blocked"' in readonly_sources and 'data-scope-blocked="source:write"' in readonly_sources), "readonly operator denied action boundary missing"
assert ('data-testid="client-shell-page"' in client_html), "viewer client navigation positive boundary missing"
assert ('data-testid="ops-home-page"' not in client_html), "viewer client route must not expose Ops navigation"
PY
}

assert_action_route_boundary_runtime() {
  local payload_json="$1"
  python3 - "${payload_json}" <<'PY'
import json
import sys

payload = json.loads(sys.argv[1])
boundaries = payload.get("boundaries") or {}
assert (boundaries.get("rawLocatorExposedToClient") is False), "raw locator/source URL must remain absent/redacted from client"
assert (boundaries.get("ruleRegistryWritePerformed") is False), "rule registry write/auto apply must remain absent before manual save"
assert (boundaries.get("viewerClientPayloadChanged") is False), "viewer/client VLM model prompt raw response debug exposure must remain absent"
PY
}

assert_vlm_rule_draft_mutation_independent_runtime() {
  local before_catalog_json="$1"
  local draft_json="$2"
  local after_catalog_json="$3"
  local client_html="$4"
  local client_html_file
  client_html_file="$(write_payload_file vlm-draft-client-html "${client_html}")"
  python3 - "${before_catalog_json}" "${draft_json}" "${after_catalog_json}" "${client_html_file}" <<'PY'
import json
import pathlib
import sys

before_catalog, draft, after_catalog = [json.loads(value) for value in sys.argv[1:4]]
client_html = pathlib.Path(sys.argv[4]).read_text()
contract = draft.get("workflowContract") or {}
assert (contract.get("draftOnly") is True), "rule suggestion response must remain draft-only"
assert (contract.get("manualSaveRequired") is True), "rule suggestion must require the independent manual save action"
assert (contract.get("ruleRegistryWritePerformed") is False and before_catalog == after_catalog), "ruleRegistryWritePerformed must remain absent/false and mutation-independent rule catalog readback must remain unchanged"
assert (contract.get("autoRuleApplied") is False), "auto rule apply must remain absent during suggestion readback"
assert (contract.get("autoProfileApplied") is False), "auto profile apply must remain absent during suggestion readback"
assert (contract.get("viewerClientExposureAdded") is False and "rawPrompt" not in client_html and "rawResponse" not in client_html and "rawJson" not in client_html), "viewer/client raw VLM material must remain absent"
assert (contract.get("viewerClientExposureAdded") is False and '<details id="opsVlmRawDetails"' not in client_html and 'data-vlm-task="raw-debug"' not in client_html), "viewer/client debug VLM DOM must remain absent"
assert (contract.get("ruleRegistryWritePerformed") is False and contract.get("eventPostPayloadChanged") is False and contract.get("rtspOrWebrtcMediaPathChanged") is False), "draft workflow write/schema/media mutation must remain absent"
PY
}

assert_ops_event_review_runtime_boundaries() {
  local payload_json="$1"
  local audit_json="$2"
  local client_html="$3"
  local client_html_file
  client_html_file="$(write_payload_file event-review-client-html "${client_html}")"
  python3 - "${payload_json}" "${audit_json}" "${client_html_file}" <<'PY'
import json
import pathlib
import sys

payload = json.loads(sys.argv[1])
audit = json.loads(sys.argv[2])
client_html = pathlib.Path(sys.argv[3]).read_text()
storage = payload.get("storage") or {}
memory = payload.get("memorySearch") or {}
timeline = payload.get("timelineGraph") or {}
brief = payload.get("incidentBrief") or {}
similar = payload.get("similarIncidents") or {}
assert (storage.get("eventPostPayloadChanged") is False and "rawJson" not in storage and "rawLocator" not in storage and storage.get("viewerClientExposureAdded", False) is False), "VLM review action raw/client-viewer external schema field must remain absent"
audit_route = "/ops/api/audit"
audit_entries = audit.get("entries") or []
assert (storage.get("eventPostPayloadChanged") is False and "rawEvidence" not in storage and "viewer" not in storage and "client" not in storage and "WebRTC" not in storage and "SSE" not in storage and "RTSP" not in storage and audit_route == "/ops/api/audit" and any(item.get("action") == "event-review-update" for item in audit_entries) and "incidentWorkflow" not in client_html), "incident action audit/raw/client-viewer external payload boundary failed"
assert (memory.get("viewerClientExposureAdded") is False and "registryWritePerformed" not in memory and "rawJson" not in memory and "rawEvidence" not in memory and "rawLocator" not in memory and "sourceUrl" not in memory and "debugCounters" not in memory), "/ops/events projection raw/source/debug material and registry write must remain absent"
assert (memory.get("modelProviderDependency") is False and "credential" not in memory and "Credential" not in memory and "WebRTC" not in memory and "SSE" not in memory), "incident memory credential/model/provider transport dependency must remain absent"
assert (memory.get("backend") == "jsonl-bm25"), "incident memory jsonl-bm25 local fallback mismatch"
assert (memory.get("viewerClientExposureAdded") is False and "rawJson" not in memory and "debugCounters" not in memory and "providerMaterial" not in memory and "providerCall" not in memory), "semantic search raw/debug/provider material must remain absent"
assert (timeline.get("viewerClientExposureAdded") is False and "rawJson" not in timeline and "debugCounters" not in timeline and "providerMaterial" not in timeline and "providerCall" not in timeline), "timeline raw/debug/provider client exposure must remain absent"
assert (brief.get("viewerClientExposureAdded") is False and "rawJson" not in brief and "debugCounters" not in brief and "providerMaterial" not in brief and "providerCall" not in brief), "incident brief raw/debug/provider client exposure must remain absent"
assert (similar.get("modelProviderDependency") is False and "rawJson" not in similar and "debugCounters" not in similar and "providerMaterial" not in similar and "providerCall" not in similar), "similar incident raw/debug/provider dependency must remain absent"
PY
}

assert_client_incident_digest_runtime_boundary() {
  local payload_json="$1"
  python3 - "${payload_json}" <<'PY'
import json
import sys

payload = json.loads(sys.argv[1])
events = payload.get("events") or {}
digest = events.get("incidentDigest") or {}
assert (digest.get("schema") == "media-server.client.incident-digest.v1" and digest.get("viewerSafe") is True), "client incident digest schema/viewer-safe boundary failed"
assert (digest.get("rawEvidenceIncluded") is False and digest.get("sourceLocatorIncluded") is False), "client incident digest raw evidence/source locator must remain absent"
assert (digest.get("rawEvidenceIncluded") is False and digest.get("debugMaterialIncluded") is False and digest.get("providerMaterialIncluded") is False and digest.get("eventPostPayloadChanged") is False), "client incident digest raw/debug/provider material must remain absent"
follow_up = events.get("followUpDigest") or {}
assert (follow_up.get("schema") == "media-server.client.follow-up-digest.v1" and follow_up.get("viewerSafe") is True and follow_up.get("publishedViewScoped") is True), "client follow-up digest schema/scope boundary failed"
assert (follow_up.get("rawEvidenceIncluded") is False and follow_up.get("sourceUrlIncluded") is False and follow_up.get("debugMaterialIncluded") is False and follow_up.get("providerMaterialIncluded") is False and follow_up.get("eventPostPayloadChanged") is False and follow_up.get("eventSchemaChanged") is False and follow_up.get("mediaPathChanged") is False), "client follow-up raw/source/debug/provider material must remain absent"
PY
}

assert_safe_product_projection_runtime_boundaries() {
  local reviews_json="$1"
  local rule_draft_json="$2"
  local client_html="$3"
  local client_html_file
  client_html_file="$(write_payload_file safe-projection-client-html "${client_html}")"
  python3 - "${reviews_json}" "${rule_draft_json}" "${client_html_file}" <<'PY'
import json
import pathlib
import sys

payload = json.loads(sys.argv[1])
draft = json.loads(sys.argv[2])
client_html = pathlib.Path(sys.argv[3]).read_text()
memory = payload.get("memorySearch") or {}
summary = memory.get("vlmSummaryCandidateReview") or {}
summary_contract = summary.get("contract") or {}
assert (summary.get("manualReviewRoute") == "/ops/events" and summary_contract.get("providerCallPerformed", summary_contract.get("cloudProviderApiCalled")) is False and summary_contract.get("viewerClientExposureAdded") is False), "VLM summary candidate /ops/events providerCall/client boundary failed"
draft_contract = draft.get("workflowContract") or {}
assert (draft.get("manualSaveRoute") == "/ops/rules" and draft_contract.get("ruleRegistryWritePerformed") is False and draft_contract.get("eventPostPayloadChanged") is False and draft_contract.get("autoRuleApplied") is False and draft_contract.get("viewerClientExposureAdded") is False and draft_contract.get("cloudProviderApiCalled") is False and draft_contract.get("rtspOrWebrtcMediaPathChanged") is False and "/ops/events" not in client_html), "incident-to-rule /ops/events /ops/rules write/mutation/autoApply/client/provider boundary failed"

triage = payload.get("incidentTriageBoard") or {}
triage_contract = triage.get("contract") or {}
assert (triage.get("schema") == "media-server.ops.incident-triage-board.v1" and triage_contract.get("cloudProviderApiCalled") is False and triage_contract.get("viewerClientExposureAdded") is False and triage_contract.get("eventPostPayloadChanged") is False), "incident triage /ops/events provider/client mutation boundary failed"
scorecard = payload.get("incidentDecisionScorecard") or {}
scorecard_contract = scorecard.get("contract") or {}
assert (scorecard.get("deterministicPriorityReasons") is True and scorecard_contract.get("rawJsonExposed") is False and scorecard_contract.get("sourceUrlExposed") is False and scorecard_contract.get("eventPostPayloadChanged") is False and scorecard_contract.get("rtspOrWebrtcMediaPathChanged") is False), "decision scorecard rawJson/sourceUrl mutation boundary failed"
action_pack = payload.get("operationalActionPack") or {}
action_contract = action_pack.get("contract") or {}
assert (action_pack.get("workflow") == "manual-workflow-links" and action_contract.get("externalDeliveryPerformed") is False and action_contract.get("ruleRegistryWritePerformed") is False and action_contract.get("sourceHealthWritePerformed") is False and action_contract.get("eventPostPayloadChanged") is False and action_contract.get("rtspOrWebrtcMediaPathChanged") is False), "operational action pack delivery/registryWrite/mutation boundary failed"
what_if = payload.get("ruleWhatIfPreview") or {}
what_if_contract = what_if.get("contract") or {}
assert (what_if_contract.get("ruleRegistryWritePerformed") is False and what_if_contract.get("autoRuleApplied") is False and what_if_contract.get("autoProfileApplied") is False and what_if_contract.get("eventPostPayloadChanged") is False and what_if_contract.get("rtspOrWebrtcMediaPathChanged") is False), "rule what-if registryWrite/autoApply/mutation boundary failed"
outcome = payload.get("operatorOutcomeMemory") or {}
outcome_contract = outcome.get("contract") or outcome
assert (outcome_contract.get("operatorOutcomeMemoryPersistentWrite", outcome_contract.get("persistentOutcomeStoreCreated")) is False and outcome_contract.get("eventPostPayloadChanged") is False and outcome_contract.get("rtspOrWebrtcMediaPathChanged") is False), "operator outcome memory persistent write/mutation boundary failed"
readiness = payload.get("incidentActionReadinessQueue") or {}
readiness_contract = readiness.get("contract") or readiness
assert (readiness_contract.get("externalDeliveryPerformed") is False and readiness_contract.get("autoActionWritePerformed") is False and readiness_contract.get("viewerClientExposureAdded") is False and readiness_contract.get("eventPostPayloadChanged") is False and readiness_contract.get("rtspOrWebrtcMediaPathChanged") is False), "action readiness delivery/WritePerformed/client boundary failed"
approval = payload.get("approvalGatedRuleDraftReadiness") or {}
approval_contract = approval.get("contract") or approval
assert (approval_contract.get("ruleRegistryWritePerformed") is False and approval_contract.get("profileRegistryWritePerformed") is False and approval_contract.get("autoRuleApplied") is False and approval_contract.get("autoProfileApplied") is False and approval_contract.get("eventPostPayloadChanged") is False and approval_contract.get("rtspOrWebrtcMediaPathChanged") is False), "approval-gated draft registryWrite/autoApply/mutation boundary failed"
field = payload.get("evidenceIntakeFieldReadiness") or {}
field_contract = field.get("contract") or field
assert (field_contract.get("credentialMaterialExposed") is False and field_contract.get("rawEvidenceMaterialExposed") is False and field_contract.get("debugMaterialExposed") is False and field_contract.get("providerMaterialExposed") is False and field_contract.get("cloudProviderApiCalled") is False and field_contract.get("eventPostPayloadChanged") is False and field_contract.get("rtspOrWebrtcMediaPathChanged") is False), "field readiness credential/raw/debug/providerCall/mutation boundary failed"
window = payload.get("runtimeEvidenceWindow") or {}
window_contract = window.get("contract") or window
assert (window_contract.get("viewerClientExposureAdded") is False and window_contract.get("persistentArchiveCreated") is False and window_contract.get("eventPostPayloadChanged") is False and window_contract.get("rtspOrWebrtcMediaPathChanged") is False), "runtime evidence window client/viewer archive mutation boundary failed"
PY
}

assert_ops_vlm_raw_details_runtime_boundary() {
  local ops_vlm_html="$1"
  local client_html="$2"
  local ops_vlm_html_file client_html_file
  ops_vlm_html_file="$(write_payload_file vlm-raw-ops-html "${ops_vlm_html}")"
  client_html_file="$(write_payload_file vlm-raw-client-html "${client_html}")"
  python3 - "${ops_vlm_html_file}" "${client_html_file}" <<'PY'
import pathlib
import sys

ops_vlm_html, client_html = [pathlib.Path(value).read_text() for value in sys.argv[1:3]]
assert ('<details id="opsVlmRawDetails"' in ops_vlm_html and 'data-vlm-task="raw-debug"' in ops_vlm_html), "opsVlmRawDetails Ops-only debug panel is absent"
assert ('<details id="opsVlmRawDetails"' not in client_html and 'data-vlm-task="raw-debug"' not in client_html), "ops VLM raw/debug DOM must remain absent from client routes"
PY
}

assert_field_evidence_bridge_runtime() {
  local payload_json="$1"
  python3 - "${payload_json}" <<'PY'
import json
import re
import sys

payload = json.loads(sys.argv[1])
boundary = payload.get("boundaries") or payload.get("boundary") or payload.get("contract") or payload

for flag in (
    "rawEndpointIncluded",
    "rawCredentialMaterialIncluded",
    "rawProviderMaterialIncluded",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
):
    assert boundary.get(flag) is False, f"field bridge boundary {flag} must remain false"

forbidden_keys = {
    "rawwhepurl",
    "sourceurl",
    "rawlocator",
    "credentialmaterial",
    "password",
    "authorization",
    "apikey",
    "accesstoken",
    "refreshtoken",
}
url_pattern = re.compile(r"(?:https?|rtsps?|wss?)://", re.IGNORECASE)
rawSourceUrlCredentialMaterialLeaks = []

def inspect(value):
    if isinstance(value, dict):
        for key, child in value.items():
            if key.lower() in forbidden_keys:
                rawSourceUrlCredentialMaterialLeaks.append(f"key:{key}")
            assert key.lower() not in forbidden_keys, f"field bridge forbidden raw material key present: {key}"
            inspect(child)
    elif isinstance(value, list):
        for child in value:
            inspect(child)
    elif isinstance(value, str):
        if url_pattern.search(value) is not None:
            rawSourceUrlCredentialMaterialLeaks.append("url-value")
        assert url_pattern.search(value) is None, "field bridge raw endpoint URL value must remain absent"

inspect(payload)
assert (
    boundary.get("rawEndpointIncluded") is False
    and boundary.get("rawCredentialMaterialIncluded") is False
    and boundary.get("sourceRegistryWritePerformed") is False
    and boundary.get("publishedViewWritePerformed") is False
    and len(rawSourceUrlCredentialMaterialLeaks) == 0
), "field bridge no-write/raw/sourceUrl/credential runtime boundary failed"
PY
}

assert_onvif_and_runtime_trend_boundaries() {
  local onvif_json="$1"
  local ops_html="$2"
  local client_html="$3"
  local ops_html_file client_html_file
  ops_html_file="$(write_payload_file onvif-trend-ops-html "${ops_html}")"
  client_html_file="$(write_payload_file onvif-trend-client-html "${client_html}")"
  python3 - "${onvif_json}" "${ops_html_file}" "${client_html_file}" <<'PY'
import json
import pathlib
import sys
import urllib.parse

onvif = json.loads(sys.argv[1])
preview = onvif.get("previewContract") or {}
credential_gate = onvif.get("credentialGate") or {}
redaction = credential_gate.get("redactionGuard") or {}
contract = credential_gate.get("contract") or {}
assert (onvif.get("status") == "onvifImportDraft" and onvif.get("notSaved") is True), "ONVIF import draft status/notSaved boundary failed"
assert (preview.get("storageAction") == "none" and preview.get("sourceRegistryMutation") is False and preview.get("publishedViewMutation") is False and preview.get("rawSoapIncluded") is False and preview.get("credentialMaterialIncluded") is False and preview.get("diagnosticJsonIncluded") is False), "ONVIF draft preview no-write/raw/credential boundary failed"
assert (credential_gate.get("secretMaterialStored") is False and credential_gate.get("referenceValueExposed") is False and redaction.get("draftApiOmitsCredentialRef") is True and redaction.get("authHeaderMaterialIncluded") is False and redaction.get("soapSecurityHeaderIncluded") is False), "ONVIF credential reference/auth/SOAP material boundary failed"
assert (contract.get("eventPostPayloadChanged") is False and contract.get("webrtcDataChannelSchemaChanged") is False and contract.get("sseMetadataSchemaChanged") is False and contract.get("wsMetadataSchemaChanged") is False and contract.get("rtspOrWebrtcMediaPathChanged") is False), "ONVIF draft external schema/media mutation boundary failed"

forbidden_keys = {"credentialref", "username", "password", "authorization", "rawsoap", "soapenvelope", "authheader", "wssecurity"}
def inspect(value):
    if isinstance(value, dict):
        for key, child in value.items():
            assert key.lower() not in forbidden_keys, f"ONVIF sensitive material key must remain absent: {key}"
            inspect(child)
    elif isinstance(value, list):
        for child in value:
            inspect(child)
inspect(onvif)
serialized_onvif = json.dumps(onvif, sort_keys=True).lower()
assert (all(f'"{key}"' not in serialized_onvif for key in forbidden_keys)), "ONVIF credential/raw/auth material keys must remain absent"

rtsp_url = (onvif.get("sourceDraft") or {}).get("rtspUrl", "")
parsed_rtsp_url = urllib.parse.urlsplit(rtsp_url)
assert (parsed_rtsp_url.scheme in ("rtsp", "rtsps") and parsed_rtsp_url.username is None and parsed_rtsp_url.password is None), "ONVIF source draft RTSP locator must remain credential-free"
ops_html, client_html = [pathlib.Path(value).read_text() for value in sys.argv[2:4]]
start = ops_html.find("const MAX_RUNTIME_TREND_SAMPLES")
end = ops_html.find("const rootCauseCorrelationId", start)
trend_region = ops_html[start:end] if start >= 0 and end > start else ""
assert ("MAX_RUNTIME_TREND_SAMPLES = 12" in trend_region and "slice(-MAX_RUNTIME_TREND_SAMPLES)" in trend_region and "localStorage" not in trend_region and "sessionStorage" not in trend_region and "indexedDB" not in trend_region and "eventPostPayloadChanged" not in trend_region and "viewerClientExposureAdded" not in trend_region), "runtime trend page-session storage/mutation boundary failed"
assert ('data-testid="ops-runtime-trend-card"' in ops_html and 'data-runtime-trend-scope="page-session-only"' in ops_html), "Ops runtime trend page-session DOM boundary missing"
assert ('data-testid="ops-runtime-trend-card"' not in client_html and 'data-runtime-trend-scope="page-session-only"' not in client_html), "runtime trend Ops DOM must remain absent from client routes"
PY
}

assert_vlm_defaultEnabled_runtime_absent() {
  local payload_json="$1"
  python3 - "${payload_json}" <<'PY'
import json
import sys

payload = json.loads(sys.argv[1])
profiles = payload.get("vlmProfiles", payload.get("profiles", []))
assert (profiles), "stored VLM profile readback is absent"
contract = profiles[0].get("runtimeContract") or {}
assert (contract.get("defaultEnabled") is False), "stored VLM runtime defaultEnabled must remain absent/false"
assert (contract.get("runtimeCallAllowed") is False and contract.get("providerCallAllowed") is False and contract.get("providerFieldSmokeRequired") is False), "stored VLM runtime/queue auto-start and provider call must remain not-run/false"
side_effects = contract.get("sideEffects") or {}
assert (side_effects.get("modelArtifactDownloaded") is False and side_effects.get("credentialStored") is False), "stored VLM model artifact/download token/credential must remain absent/false"
for field, value in (contract.get("sideEffects") or {}).items():
    if value is not False:
        raise SystemExit(f"VLM runtime side effect must remain absent/false: {field}")
PY
}

json_quote() {
  node -e 'process.stdout.write(JSON.stringify(process.argv[1] || ""));' "$1"
}

json_password_payload() {
  printf '{"password":%s}' "$(json_quote "$1")"
}

login_status_code() {
  local username="$1"
  local password="$2"
  local cookie_file="${3:-}"
  if [[ -n "${cookie_file}" ]]; then
    http_code -c "${cookie_file}" -X POST \
      --data-urlencode "username=${username}" \
      --data-urlencode "password=${password}" \
      "${BASE}/login"
  else
    http_code -X POST \
      --data-urlencode "username=${username}" \
      --data-urlencode "password=${password}" \
      "${BASE}/login"
  fi
}

login_landing() {
  local cookie_file="$1"
  local username="$2"
  local password="$3"
  curl -sS -c "${cookie_file}" -o /dev/null -D - \
    -X POST \
    --data-urlencode "username=${username}" \
    --data-urlencode "password=${password}" \
    "${BASE}/login" |
    tr -d '\r' | awk 'BEGIN{s=""; l=""} /^HTTP/{s=$2} /^Location:/{l=$2} END{print s ":" l}'
}

setup_admin() {
  local weak_code strong_code after_setup
  weak_code="$(http_code -X POST \
    --data-urlencode "username=admin" \
    --data-urlencode "password=weak" \
    --data-urlencode "confirm=weak" \
    "${BASE}/setup")"
  expect_eq "${weak_code}" "400" "weak admin password rejected"
  strong_code="$(http_code -X POST \
    --data-urlencode "username=admin" \
    --data-urlencode "password=${TEST_PASSWORD}" \
    --data-urlencode "confirm=${TEST_PASSWORD}" \
    "${BASE}/setup")"
  expect_eq "${strong_code}" "302" "initial admin password setup"
  expect_auth_store_owner_only
  after_setup="$(header_status_location "${BASE}/setup")"
  expect_eq "${after_setup}" "302:/login" "setup blocked after completion"
}

login_admin() {
  local landing whoami
  landing="$(login_landing "${ADMIN_COOKIE}" "admin" "${TEST_PASSWORD}")"
  expect_eq "${landing}" "302:/ops/home" "admin login landing"
  whoami="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/auth/whoami")"
  case "${whoami}" in
    *'"username":"admin"'*'"role":"admin"'*) pass "admin whoami username and role" ;;
    *) fail "admin whoami role missing: ${whoami}" ;;
  esac
}

verify_password_change_lifecycle() {
  local temporary_change_code original_reuse_code history_rotation_code final_restore_code
  expect_cookie_page_contains "password change auth shell selectors" "${VIEWER_COOKIE}" "${BASE}/password/change" \
    'class="auth-shell auth-responsive-shell"' 'data-testid="auth-password-change-form"' 'id="themeToggleBtn"' 'name="currentPassword"' 'name="password"' 'name="confirm"' '기본 kr-privacy 정책'
  auth_ui_smoke "password-change" "/password/change" "form.auth-form" "${VIEWER_COOKIE}" 'name="currentPassword"'
  temporary_change_code="$(http_code -b "${VIEWER_COOKIE}" -c "${VIEWER_COOKIE}" \
    -X POST \
    --data-urlencode "currentPassword=${TEST_PASSWORD}" \
    --data-urlencode "password=${SECOND_PREVIOUS_PASSWORD}" \
    --data-urlencode "confirm=${SECOND_PREVIOUS_PASSWORD}" \
    "${BASE}/password/change")"
  expect_eq "${temporary_change_code}" "302" "password change to temporary password succeeds"
  expect_eq "$(login_status_code "viewer-smoke" "${SECOND_PREVIOUS_PASSWORD}" "${VIEWER_COOKIE}")" "302" \
    "temporary password login succeeds"

  original_reuse_code="$(http_code -b "${VIEWER_COOKIE}" -c "${VIEWER_COOKIE}" \
    -X POST \
    --data-urlencode "currentPassword=${SECOND_PREVIOUS_PASSWORD}" \
    --data-urlencode "password=${TEST_PASSWORD}" \
    --data-urlencode "confirm=${TEST_PASSWORD}" \
    "${BASE}/password/change")"
  expect_eq "${original_reuse_code}" "400" "password_history original password immediate history reuse rejected"

  history_rotation_code="$(http_code -b "${VIEWER_COOKIE}" -c "${VIEWER_COOKIE}" \
    -X POST \
    --data-urlencode "currentPassword=${SECOND_PREVIOUS_PASSWORD}" \
    --data-urlencode "password=${PREVIOUS_PASSWORD}" \
    --data-urlencode "confirm=${PREVIOUS_PASSWORD}" \
    "${BASE}/password/change")"
  expect_eq "${history_rotation_code}" "302" "password history count rotation succeeds"
  expect_eq "$(login_status_code "viewer-smoke" "${PREVIOUS_PASSWORD}" "${VIEWER_COOKIE}")" "302" \
    "history rotation password login succeeds"

  final_restore_code="$(http_code -b "${VIEWER_COOKIE}" -c "${VIEWER_COOKIE}" \
    -X POST \
    --data-urlencode "currentPassword=${PREVIOUS_PASSWORD}" \
    --data-urlencode "password=${TEST_PASSWORD}" \
    --data-urlencode "confirm=${TEST_PASSWORD}" \
    "${BASE}/password/change")"
  expect_eq "${final_restore_code}" "302" "original password restored after history count rotation"
  expect_eq "$(login_status_code "viewer-smoke" "${TEST_PASSWORD}" "${VIEWER_COOKIE}")" "302" "SaveUsersFile-backed password change lifecycle final login succeeds"
  assert_password_history_authoritative_runtime "${original_reuse_code}"
}

verify_pending_access_request_ui_and_login_denial() {
  local pending_login="$1"
  expect_page_contains "pending access request form and pending-state copy" "${BASE}/client/request-access" \
    'data-testid="auth-access-request-form"' 'id="request-form"' \
    '요청은 승인 대기 상태로 저장되며 관리자 승인 전에는 로그인이나 채널 접근이 허용되지 않습니다.'
  expect_eq "${pending_login}" "401" "pending form submission remains denied login before approval"
}

run_bootstrap() {
  start_server auto lab
  local before_setup hashless_setup hashless_login_code after_setup passwordless_login_code admin_whoami_json
  local setup_html login_html users_html users_json protected_allow_code protected_deny_location admin_cookie_snapshot
  local setup_ui_policy=0 login_ui_policy=0 users_ui_policy=0
  before_setup="$(header_status_location "${BASE}/")"
  expect_eq "${before_setup}" "302:/setup" "missing users root redirect"
  setup_html="$(curl -fsS "${BASE}/setup")"
  case "${setup_html}" in *'name="username"'*'admin'*) setup_ui_policy=1 ;; esac
  expect_page_contains "setup auth shell selectors" "${BASE}/setup" \
    'class="auth-shell auth-responsive-shell"' 'data-testid="auth-setup-form"' 'id="themeToggleBtn"' 'name="username"' 'name="password"' 'name="confirm"' '기본 kr-privacy 정책'
  auth_ui_smoke "setup" "/setup" "form.auth-form" "" 'name="confirm"'
  stop_server
  node - "${USERS_FILE}" <<'NODE'
const fs = require("fs");
const usersFile = process.argv[2];
const store = {
  users: [{ username: "admin", displayName: "Admin", role: "admin", scopes: ["*"], passwordHash: "", enabled: true }],
  invites: [],
  accessRequests: [],
};
fs.writeFileSync(usersFile, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
NODE
  start_server auto lab
  hashless_setup="$(header_status_location "${BASE}/")"
  expect_eq "${hashless_setup}" "302:/setup" "existing users file with hashless admin redirects to setup"
  hashless_login_code="$(http_code -X POST --data-urlencode "username=admin" --data-urlencode "password=${TEST_PASSWORD}" "${BASE}/login")"
  expect_eq "${hashless_login_code}" "403" "hashless admin login blocked by setup gate"
  stop_server
  rm -f "${USERS_FILE}" "${USERS_FILE}.tmp"
  start_server auto lab
  setup_admin
  after_setup="$(header_status_location "${BASE}/")"
  expect_eq "${after_setup}" "302:/login" "unauthenticated root redirect"
  expect_page_contains "login auth shell selectors" "${BASE}/login" \
    'class="auth-shell auth-responsive-shell"' 'data-testid="auth-login-form"' 'id="themeToggleBtn"' 'name="username"' 'name="password"' 'autocomplete="current-password"'
  auth_ui_smoke "login" "/login" "form.auth-form" "" 'autocomplete="current-password"'
  login_html="$(curl -fsS "${BASE}/login")"
  case "${login_html}" in *'name="username"'*) login_ui_policy=1 ;; esac
  expect_page_contains "client access request auth shell selectors" "${BASE}/client/request-access" \
    'class="auth-shell auth-responsive-shell"' 'data-testid="auth-access-request-form"' 'id="request-form"' 'name="username"' 'name="contact"' 'name="reason"' \
    '승인 전에는 로그인/채널 접근이 열리지 않습니다' 'window.MediaServerUi'
  auth_ui_smoke "client-request-access" "/client/request-access" "#request-form" "" 'name="reason"'
  passwordless_login_code="$(login_status_code "admin" "")"
  expect_eq "${passwordless_login_code}" "401" "passwordless admin login rejected"
  login_admin
  admin_whoami_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/auth/whoami")"
  local logout_landing whoami_code
  protected_allow_code="$(http_code -b "${ADMIN_COOKIE}" "${BASE}/ops/api/users")"
  protected_deny_location="$(header_status_location "${BASE}/ops/users")"
  users_html="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/users")"
  case "${users_html}" in *'data-testid="ops-users-page"'*'마지막 활성 admin이면 서버가 비활성화를 거부합니다.'*) users_ui_policy=1 ;; esac
  users_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/users")"
  admin_cookie_snapshot="$(cat "${ADMIN_COOKIE}")"
  logout_landing="$(header_status_location -b "${ADMIN_COOKIE}" -c "${ADMIN_COOKIE}" -X POST "${BASE}/logout")"
  expect_eq "${logout_landing}" "302:/login" "logout redirects to login landing"
  whoami_code="$(http_code -b "${ADMIN_COOKIE}" "${BASE}/auth/whoami")"
  expect_eq "${whoami_code}" "401" "logout invalidates session"
  assert_auth_bootstrap_authoritative_runtime \
    "${before_setup}" "${hashless_setup}" "${hashless_login_code}" "${after_setup}" \
    "${passwordless_login_code}" "${admin_whoami_json}" "${admin_cookie_snapshot}" \
    "${protected_allow_code}" "${protected_deny_location}" "${logout_landing}" \
    "${setup_ui_policy}" "${login_ui_policy}" "${users_ui_policy}" "${users_json}"
}

create_user() {
  local payload="$1"
  curl -fsS -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data "${payload}" "${BASE}/ops/api/users"
}

run_users() {
  start_server auto lab
  setup_admin
  chmod 644 "${USERS_FILE}" || fail "failed to simulate permissive auth users file"
  login_admin
  expect_cookie_page_contains "ops users access request selectors" "${ADMIN_COOKIE}" "${BASE}/ops/users" \
    'id="access-requests-body"' 'id="request-invite-output"' '/ops/api/access-requests' '승인 대기 요청' \
    'id="apply-view-scope-template"' 'id="scope-template-preview"' 'id="user-scopes-input"' \
    'id="user-lifecycle-summary"' 'data-user-set-enabled' '다음 로그인 시 비밀번호 변경 필요' \
    'data-testid="user-lifecycle-policy"' '초대 링크는 기본 24시간 동안만 유효' \
    'data-testid="ops-invites-panel"' 'id="invite-create-form"' 'id="invite-list-body"' \
    '/ops/api/invites' '토큰/토큰 해시를 노출하지 않습니다' \
    'id="user-reset-password-panel"' 'id="user-reset-password-button"' 'data-user-reset-password' \
    '사용자 감사 JSON/CSV/Diff JSON export' '승인 전: 로그인/세션/채널 권한 없음' \
    '초대 설정 완료 전까지는 로그인/세션/채널 권한이 열리지 않습니다'
  auth_scope_picker_smoke
  expect_auth_store_owner_only "permissive auth users file re-hardened"

  local test_password_json previous_password_json second_previous_password_json
  test_password_json="$(json_quote "${TEST_PASSWORD}")"
  previous_password_json="$(json_quote "${PREVIOUS_PASSWORD}")"
  second_previous_password_json="$(json_quote "${SECOND_PREVIOUS_PASSWORD}")"

  local viewer_json
  viewer_json="$(create_user "{\"username\":\"viewer-smoke\",\"displayName\":\"Viewer Smoke\",\"role\":\"viewer\",\"viewId\":\"1\",\"password\":${previous_password_json},\"enabled\":true,\"mustChangePassword\":false}")"
  create_user "{\"username\":\"salt-smoke-a\",\"displayName\":\"Salt Smoke A\",\"role\":\"viewer\",\"viewId\":\"1\",\"password\":${test_password_json},\"enabled\":true,\"mustChangePassword\":false}" >/dev/null
  create_user "{\"username\":\"salt-smoke-b\",\"displayName\":\"Salt Smoke B\",\"role\":\"viewer\",\"viewId\":\"1\",\"password\":${test_password_json},\"enabled\":true,\"mustChangePassword\":false}" >/dev/null
  assert_password_hash_algorithm_authoritative_runtime
  case "${viewer_json}" in
    *'view:read:1'*) pass "viewer view scope assigned" ;;
    *) fail "viewer view scope missing: ${viewer_json}" ;;
  esac
  case "${viewer_json}" in
    *'debug:read'*|*'lab:read'*|*'ops:read'*|*'source:write'*|*'rule:write'*)
      fail "viewer received privileged scope: ${viewer_json}" ;;
    *) pass "viewer privileged scopes blocked" ;;
  esac
  case "${viewer_json}" in
    *'passwordHash'*|*'tokenHash'*) fail "hash leaked in user API: ${viewer_json}" ;;
    *) pass "user API hash redaction" ;;
  esac
  local bad_viewer_scope_code bad_integrator_scope_code
  bad_viewer_scope_code="$(http_code -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data "{\"username\":\"viewer-bad-scope\",\"displayName\":\"Bad Scope\",\"role\":\"viewer\",\"scopes\":[\"ops:read\"],\"password\":${test_password_json}}" "${BASE}/ops/api/users")"
  bad_integrator_scope_code="$(http_code -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data "{\"username\":\"integrator-bad-scope\",\"displayName\":\"Bad Scope\",\"role\":\"integrator\",\"scopes\":[\"view:read:1\"],\"password\":${test_password_json}}" "${BASE}/ops/api/users")"
  expect_eq "${bad_viewer_scope_code}" "400" "viewer custom privileged scope rejected"
  expect_eq "${bad_integrator_scope_code}" "400" "integrator live view scope rejected"

  local users_after_create_json viewer_update_json users_after_update_json ops_users_html
  users_after_create_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/users")"
  ops_users_html="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/users")"
  assert_user_creation_authoritative_runtime "${viewer_json}" "${bad_viewer_scope_code}" "${users_after_create_json}" "${ops_users_html}"
  create_user "{\"username\":\"edit-smoke\",\"displayName\":\"Edit Smoke\",\"role\":\"viewer\",\"viewId\":\"1\",\"password\":${test_password_json},\"enabled\":true,\"mustChangePassword\":false}" >/dev/null
  viewer_update_json="$(curl -fsS -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X PUT --data '{"displayName":"Edit Smoke Updated","role":"operator","scopes":["ops:read"],"enabled":false,"mustChangePassword":false}' \
    "${BASE}/ops/api/users/edit-smoke")"
  users_after_update_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/users")"
  assert_user_update_authoritative_runtime "${viewer_update_json}" "${users_after_update_json}"

  expect_eq "$(login_status_code "viewer-smoke" "${PREVIOUS_PASSWORD}" "${VIEWER_COOKIE}")" "302" "viewer login"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" "${BASE}/ops")" "403" "viewer ops forbidden"

  local reset_code landing reset_revoked_session disable_code disabled_login enable_code enabled_login
  reset_code="$(http_code -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data "$(json_password_payload "${TEST_PASSWORD}")" "${BASE}/ops/api/users/viewer-smoke/reset-password")"
  expect_eq "${reset_code}" "200" "admin reset password"
  reset_revoked_session="$(http_code -b "${VIEWER_COOKIE}" "${BASE}/auth/whoami")"
  expect_eq "${reset_revoked_session}" "401" "admin reset revokes existing viewer session"
  local reset_users_json
  reset_users_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/users")"
  case "${reset_users_json}" in
    *'"username":"viewer-smoke"'*'"mustChangePassword":true'*) pass "admin reset forces next-login password change" ;;
    *) fail "admin reset did not expose mustChangePassword lifecycle state: ${reset_users_json}" ;;
  esac
  landing="$(login_landing "${VIEWER_COOKIE}" "viewer-smoke" "${TEST_PASSWORD}")"
  expect_eq "${landing}" "302:/password/change" "mustChangePassword landing"
  assert_password_reset_authoritative_runtime "${reset_users_json}" "${reset_revoked_session}" "${landing}"
  verify_password_change_lifecycle
  disable_code="$(http_code -b "${ADMIN_COOKIE}" -X POST "${BASE}/ops/api/users/viewer-smoke/disable")"
  expect_eq "${disable_code}" "200" "admin disables viewer"
  disabled_login="$(login_status_code "viewer-smoke" "${TEST_PASSWORD}")"
  expect_eq "${disabled_login}" "401" "disabled user login rejected"
  local users_after_disable_json users_after_enable_json disabled_session_code restored_client_code
  users_after_disable_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/users")"
  disabled_session_code="$(http_code -b "${VIEWER_COOKIE}" "${BASE}/auth/whoami")"
  assert_user_enabled_authoritative_runtime false "${users_after_disable_json}" "${disabled_login}" "${disabled_session_code}"
  enable_code="$(http_code -b "${ADMIN_COOKIE}" -X POST "${BASE}/ops/api/users/viewer-smoke/enable")"
  expect_eq "${enable_code}" "200" "admin restores viewer"
  enabled_login="$(login_status_code "viewer-smoke" "${TEST_PASSWORD}" "${VIEWER_COOKIE}")"
  expect_eq "${enabled_login}" "302" "restored viewer login succeeds"
  users_after_enable_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/users")"
  restored_client_code="$(http_code -b "${VIEWER_COOKIE}" "${BASE}/client")"
  assert_user_enabled_authoritative_runtime true "${users_after_enable_json}" "${enabled_login}" "${restored_client_code}"

  local last_admin_disable_code last_admin_downgrade_code last_admin_users_json
  last_admin_disable_code="$(http_code -b "${ADMIN_COOKIE}" -X POST "${BASE}/ops/api/users/admin/disable")"
  last_admin_downgrade_code="$(http_code -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X PUT --data '{"displayName":"Administrator","role":"operator","enabled":true}' "${BASE}/ops/api/users/admin")"
  expect_eq "${last_admin_disable_code}" "409" "last active admin disable rejected"
  expect_eq "${last_admin_downgrade_code}" "409" "last active admin role downgrade rejected"
  last_admin_users_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/users")"
  assert_last_admin_authoritative_runtime \
    "${last_admin_disable_code}" "${last_admin_downgrade_code}" "${last_admin_users_json}" "${ops_users_html}"

  create_user "{\"username\":\"lockout-smoke\",\"displayName\":\"Lockout Smoke\",\"role\":\"viewer\",\"viewId\":\"1\",\"password\":${test_password_json},\"enabled\":true,\"mustChangePassword\":false}" >/dev/null
  login_status_code "lockout-smoke" "${WRONG_PASSWORD_ONE}" >/dev/null || true
  login_status_code "lockout-smoke" "${WRONG_PASSWORD_TWO}" >/dev/null || true
  if grep -q '"lockedUntil": "[^"]' "${USERS_FILE}"; then
    pass "login lockout stored"
  else
    fail "login lockout was not stored"
  fi

  local invite_json invite_id invite_token preserve_reset invite_setup invite_login
  invite_json="$(curl -fsS -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data '{"username":"invite-smoke","displayName":"Invite Smoke","role":"viewer","viewId":"1"}' "${BASE}/ops/api/invites")"
  invite_id="$(printf '%s' "${invite_json}" | json_string_field inviteId)"
  invite_token="$(printf '%s' "${invite_json}" | json_string_field token)"
  [[ -n "${invite_token}" ]] || fail "invite token missing: ${invite_json}"
  pass "invite token issued once"
  case "${invite_json}" in
    *"\"expiresAt\":\"20"*"\"setupUrl\":\"/invite/setup"*) pass "invite expiry and setup URL visible once" ;;
    *) fail "invite expiry/setup URL missing: ${invite_json}" ;;
  esac
  local invite_list_json
  invite_list_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/invites")"
  case "${invite_list_json}" in
    *"\"inviteId\":\"${invite_id}\""*'"username":"invite-smoke"'*) pass "invite list API exposes issued invite summary" ;;
    *) fail "invite list API missing issued invite: ${invite_list_json}" ;;
  esac
  case "${invite_list_json}" in
    *'"token"'*|*'"tokenHash"'*|*'/invite/setup?token='*) fail "invite list API exposed token material: ${invite_list_json}" ;;
    *) pass "invite list API redacts token material" ;;
  esac
  local users_html
  users_html="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/users")"
  assert_invite_hash_redaction_authoritative_runtime \
    "${invite_id}" "${invite_token}" "${invite_list_json}" "${users_html}"
  assert_invite_creation_authoritative_runtime "${invite_json}" "${invite_id}" "${invite_token}" "${invite_list_json}"
  preserve_reset="$(http_code -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data "$(json_password_payload "${PREVIOUS_PASSWORD}")" "${BASE}/ops/api/users/lockout-smoke/reset-password")"
  expect_eq "${preserve_reset}" "200" "users-only save after pending invite"
  expect_auth_store_contains "pending invite preserved across users save" "\"inviteId\": \"${invite_id}\""
  local invite_setup_html
  invite_setup_html="$(curl -fsS "${BASE}/invite/setup?token=${invite_token}")"
  case "${invite_setup_html}" in
    *'data-testid="auth-invite-setup-form"'*'name="token"'*'name="password"'*) pass "invite setup HTTP response renders required form" ;;
    *) fail "invite setup HTTP response missing required form: ${invite_setup_html}" ;;
  esac
  expect_page_contains "invite setup auth shell selectors" "${BASE}/invite/setup?token=${invite_token}" \
    'class="auth-shell auth-responsive-shell"' 'data-testid="auth-invite-setup-form"' 'id="themeToggleBtn"' 'name="token"' 'name="password"' 'name="confirm"' '기본 kr-privacy 정책'
  auth_ui_smoke "invite-setup" "/invite/setup?token=${invite_token}" "form.auth-form" "" 'name="token"'
  invite_setup="$(http_code -X POST --data-urlencode "token=${invite_token}" \
    --data-urlencode "password=${TEST_PASSWORD}" --data-urlencode "confirm=${TEST_PASSWORD}" "${BASE}/invite/setup")"
  expect_eq "${invite_setup}" "302" "invite password setup"
  invite_login="$(login_status_code "invite-smoke" "${TEST_PASSWORD}" "${INVITE_COOKIE}")"
  expect_eq "${invite_login}" "302" "invited viewer login"
  local invite_whoami_json invite_client_code consumed_invite_code expired_invite_json expired_invite_id expired_invite_token expired_invite_code
  invite_whoami_json="$(curl -fsS -b "${INVITE_COOKIE}" "${BASE}/auth/whoami")"
  invite_client_code="$(http_code -b "${INVITE_COOKIE}" "${BASE}/client")"
  assert_invite_accept_authoritative_runtime "${invite_setup}" "${invite_login}" "${invite_whoami_json}" "${invite_client_code}"
  consumed_invite_code="$(http_code -X POST --data-urlencode "token=${invite_token}" --data-urlencode "password=${TEST_PASSWORD}" --data-urlencode "confirm=${TEST_PASSWORD}" "${BASE}/invite/setup")"
  expired_invite_json="$(curl -fsS -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' -X POST --data '{"username":"invite-expired","displayName":"Invite Expired","role":"viewer","viewId":"1"}' "${BASE}/ops/api/invites")"
  expired_invite_id="$(printf '%s' "${expired_invite_json}" | json_string_field inviteId)"
  expired_invite_token="$(printf '%s' "${expired_invite_json}" | json_string_field token)"
  [[ -n "${expired_invite_id}" && -n "${expired_invite_token}" ]] || fail "expired invite fixture missing"
  node - "${USERS_FILE}" "${expired_invite_id}" <<'NODE'
const fs = require("fs"); const [usersFile, inviteId] = process.argv.slice(2);
const store = JSON.parse(fs.readFileSync(usersFile, "utf8")); const invite = (store.invites || []).find(item => item.inviteId === inviteId);
if (!invite) throw new Error("expired invite fixture missing"); invite.expiresAt = "2000-01-01T00:00:00Z";
fs.writeFileSync(usersFile, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
NODE
  expired_invite_code="$(http_code -X POST --data-urlencode "token=${expired_invite_token}" --data-urlencode "password=${TEST_PASSWORD}" --data-urlencode "confirm=${TEST_PASSWORD}" "${BASE}/invite/setup")"
  expect_eq "${consumed_invite_code}:${expired_invite_code}" "401:410" "invite.used consumed/expired token runtime status split"
  assert_invite_invalid_authoritative_runtime "${consumed_invite_code}" "${expired_invite_code}" "${invite_id}"

  create_user "{\"username\":\"invite-existing\",\"displayName\":\"Invite Existing\",\"role\":\"viewer\",\"viewId\":\"1\",\"password\":${previous_password_json},\"enabled\":true,\"mustChangePassword\":false}" >/dev/null
  expect_eq "$(login_status_code "invite-existing" "${PREVIOUS_PASSWORD}" "${EXISTING_INVITE_COOKIE}")" "302" "existing invite target baseline login"
  local existing_before existing_invite_json existing_invite_token existing_after existing_setup existing_relogin existing_final
  existing_before="$(curl -fsS -b "${EXISTING_INVITE_COOKIE}" "${BASE}/auth/whoami")"
  case "${existing_before}" in
    *'"role":"viewer"'*'"view:read:1"'*) pass "existing invite baseline scope visible" ;;
    *) fail "existing invite baseline scope mismatch: ${existing_before}" ;;
  esac
  existing_invite_json="$(curl -fsS -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data '{"username":"invite-existing","displayName":"Invite Existing Integrator","role":"integrator","viewId":"2"}' "${BASE}/ops/api/invites")"
  existing_invite_token="$(printf '%s' "${existing_invite_json}" | json_string_field token)"
  [[ -n "${existing_invite_token}" ]] || fail "existing user invite token missing: ${existing_invite_json}"
  expect_eq "$(http_code -b "${EXISTING_INVITE_COOKIE}" "${BASE}/auth/whoami")" "200" "pending invite keeps existing session"
  existing_after="$(curl -fsS -b "${EXISTING_INVITE_COOKIE}" "${BASE}/auth/whoami")"
  case "${existing_after}" in
    *'"role":"viewer"'*'"view:read:1"'*) pass "pending invite does not change existing role/scope" ;;
    *) fail "pending invite changed existing role/scope: ${existing_after}" ;;
  esac
  case "${existing_after}" in
    *'"role":"integrator"'*|*'"metadata:read:2"'*) fail "pending invite applied future integrator scope: ${existing_after}" ;;
    *) pass "pending invite future scope not applied" ;;
  esac
  existing_setup="$(http_code -X POST --data-urlencode "token=${existing_invite_token}" \
    --data-urlencode "password=${TEST_PASSWORD}" --data-urlencode "confirm=${TEST_PASSWORD}" "${BASE}/invite/setup")"
  expect_eq "${existing_setup}" "302" "existing invite accepted"
  expect_eq "$(http_code -b "${EXISTING_INVITE_COOKIE}" "${BASE}/auth/whoami")" "401" "accepted invite revokes previous session"
  existing_relogin="$(login_status_code "invite-existing" "${TEST_PASSWORD}" "${EXISTING_INVITE_COOKIE}")"
  expect_eq "${existing_relogin}" "302" "existing invite new password login"
  existing_final="$(curl -fsS -b "${EXISTING_INVITE_COOKIE}" "${BASE}/auth/whoami")"
  case "${existing_final}" in
    *'"role":"integrator"'*'"metadata:read:2"'*'"event:read:2"'*) pass "accepted invite applies role/scope" ;;
    *) fail "accepted invite did not apply role/scope: ${existing_final}" ;;
  esac

  local request_json request_id pending_login approve_json approve_invite_id approve_token request_user_list request_preserve_reset request_setup request_login
  local rate_request_json rate_request_id reject_code access_requests_json pending_access_requests_json
  request_json="$(curl -fsS -H 'Content-Type: application/json' \
    -X POST --data '{"username":"request-smoke","displayName":"Request Smoke","contact":"client@example.test","viewId":"2","reason":"smoke"}' "${BASE}/client/api/access-requests")"
  request_id="$(printf '%s' "${request_json}" | json_string_field requestId)"
  [[ -n "${request_id}" ]] || fail "access request id missing: ${request_json}"
  pending_access_requests_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/access-requests")"
  expect_eq "$(http_code -H 'Content-Type: application/json' \
    -X POST --data '{"username":"request-smoke","displayName":"Request Smoke","contact":"client@example.test","viewId":"2","reason":"duplicate"}' "${BASE}/client/api/access-requests")" "409" "duplicate pending access request rejected"
  expect_eq "$(http_code -H 'Content-Type: application/json' \
    -X POST --data '{"username":"request-bad-view","displayName":"Bad View","viewId":"../bad","reason":"bad view"}' "${BASE}/client/api/access-requests")" "400" "access request unsafe viewId rejected"
  printf '{"username":"request-large","reason":"' >"${ACCESS_REQUEST_PAYLOAD}"
  printf '%05000d' 0 >>"${ACCESS_REQUEST_PAYLOAD}"
  printf '"}' >>"${ACCESS_REQUEST_PAYLOAD}"
  expect_eq "$(http_code -H 'Content-Type: application/json' \
    -X POST --data-binary @"${ACCESS_REQUEST_PAYLOAD}" "${BASE}/client/api/access-requests")" "413" "oversized access request body rejected"
  rate_request_json="$(curl -fsS -H 'Content-Type: application/json' \
    -X POST --data '{"username":"request-rate-1","reason":"rate one"}' "${BASE}/client/api/access-requests")"
  rate_request_id="$(printf '%s' "${rate_request_json}" | json_string_field requestId)"
  [[ -n "${rate_request_id}" ]] || fail "rate access request id missing: ${rate_request_json}"
  pass "access request rate budget allows fourth counted attempt"
  expect_eq "$(http_code -H 'Content-Type: application/json' \
    -X POST --data '{"username":"request-rate-2","reason":"rate two"}' "${BASE}/client/api/access-requests")" "201" "access request rate budget allows fifth counted attempt"
  expect_eq "$(http_code -H 'Content-Type: application/json' \
    -X POST --data '{"username":"request-rate-limit","reason":"rate limit"}' "${BASE}/client/api/access-requests")" "429" "access request per-peer rate limit enforced"
  reject_code="$(http_code -b "${ADMIN_COOKIE}" -X POST "${BASE}/ops/api/access-requests/${rate_request_id}/reject")"
  expect_eq "${reject_code}" "200" "ops users access request reject API"
  access_requests_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/access-requests")"
  case "${access_requests_json}" in
    *"\"requestId\":\"${rate_request_id}\""*'"status":"rejected"'*) pass "rejected access request visible in ops API" ;;
    *) fail "rejected access request missing from ops API: ${access_requests_json}" ;;
  esac
  assert_access_request_rejected_authoritative_runtime "${rate_request_id}" "${access_requests_json}"
  pending_login="$(login_status_code "request-smoke" "${TEST_PASSWORD}")"
  verify_pending_access_request_ui_and_login_denial "${pending_login}"
  assert_access_request_pending_authoritative_runtime "${request_id}" "${request_json}" "${pending_access_requests_json}" "${pending_login}"
  approve_json="$(curl -fsS -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data '{"viewId":"2"}' "${BASE}/ops/api/access-requests/${request_id}/approve")"
  approve_invite_id="$(printf '%s' "${approve_json}" | json_string_field inviteId)"
  approve_token="$(printf '%s' "${approve_json}" | json_string_field token)"
  [[ -n "${approve_token}" ]] || fail "approve invite token missing: ${approve_json}"
  case "${approve_json}" in
    *"\"expiresAt\":\"20"*"\"setupUrl\":\"/invite/setup"*) pass "approved request invite expiry visible once" ;;
    *) fail "approved request invite expiry/setup URL missing: ${approve_json}" ;;
  esac
  request_user_list="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/users")"
  case "${request_user_list}" in
    *'"username":"request-smoke"'*) fail "approved request created user before invite setup: ${request_user_list}" ;;
    *) pass "approved request keeps user pending until invite setup" ;;
  esac
  assert_access_request_approved_authoritative_runtime "${request_id}" "${approve_json}" "${approve_token}" "${request_user_list}"
  request_preserve_reset="$(http_code -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data "{\"password\":${second_previous_password_json}}" "${BASE}/ops/api/users/lockout-smoke/reset-password")"
  expect_eq "${request_preserve_reset}" "200" "users-only save after approved request"
  expect_auth_store_contains "approved request preserved across users save" "\"requestId\": \"${request_id}\""
  expect_auth_store_contains "approved request invite preserved across users save" "\"inviteId\": \"${approve_invite_id}\""
  request_setup="$(http_code -X POST --data-urlencode "token=${approve_token}" \
    --data-urlencode "password=${TEST_PASSWORD}" --data-urlencode "confirm=${TEST_PASSWORD}" "${BASE}/invite/setup")"
  expect_eq "${request_setup}" "302" "approved request password setup"
  request_login="$(login_status_code "request-smoke" "${TEST_PASSWORD}" "${REQUEST_COOKIE}")"
  expect_eq "${request_login}" "302" "approved request viewer login"
}

run_routes() {
  start_server auto lab
  local auto_default_root
  auto_default_root="$(header_status_location "${BASE}/")"
  expect_eq "${auto_default_root}" "302:/setup" "setup required root"
  setup_admin
  expect_eq "$(header_status_location "${BASE}/")" "302:/login" "logout root"
  login_admin
  expect_eq "$(header_status_location -b "${ADMIN_COOKIE}" "${BASE}/")" "302:/ops/home" "admin root"
  local test_password_json
  test_password_json="$(json_quote "${TEST_PASSWORD}")"
  create_user "{\"username\":\"operator-smoke\",\"displayName\":\"Operator Smoke\",\"role\":\"operator\",\"password\":${test_password_json},\"enabled\":true,\"mustChangePassword\":false}" >/dev/null
  create_user "{\"username\":\"operator-readonly\",\"displayName\":\"Operator Readonly\",\"role\":\"operator\",\"scopes\":[\"ops:read\"],\"password\":${test_password_json},\"enabled\":true,\"mustChangePassword\":false}" >/dev/null
  create_user "{\"username\":\"viewer-smoke\",\"displayName\":\"Viewer Smoke\",\"role\":\"viewer\",\"viewId\":\"1\",\"password\":${test_password_json},\"enabled\":true,\"mustChangePassword\":false}" >/dev/null
  create_user "{\"username\":\"integrator-smoke\",\"displayName\":\"Integrator Smoke\",\"role\":\"integrator\",\"viewId\":\"1\",\"password\":${test_password_json},\"enabled\":true,\"mustChangePassword\":false}" >/dev/null
  local sources_json source_id source_kind source_file source_rtsp source_webrtc source_http matching_rule_source mismatched_rule_source
  sources_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/sources")"
  printf '%s' "${sources_json}" | assert_sources_api_freeze
  source_id="$(printf '%s' "${sources_json}" | json_first_source_field sourceId)"
  [[ -n "${source_id}" ]] || fail "default source id missing: ${sources_json}"
  source_kind="$(printf '%s' "${sources_json}" | json_first_source_field kind)"
  source_file="$(printf '%s' "${sources_json}" | json_first_source_field file)"
  source_rtsp="$(printf '%s' "${sources_json}" | json_first_source_field rtspUrl)"
  source_webrtc="$(printf '%s' "${sources_json}" | json_first_source_field webrtcSourceId)"
  source_http="$(printf '%s' "${sources_json}" | json_first_source_field httpUrl)"
  if [[ -n "${source_file}" ]]; then
    matching_rule_source="\"kind\":\"file\",\"file\":$(json_quote "${source_file}")"
    mismatched_rule_source="\"kind\":\"file\",\"file\":\"va_four_scene_sample.mp4\""
  elif [[ -n "${source_rtsp}" ]]; then
    matching_rule_source="\"kind\":\"rtsp\",\"url\":$(json_quote "${source_rtsp}")"
    mismatched_rule_source="\"kind\":\"rtsp\",\"url\":\"rtsp://127.0.0.1:65530/forbidden\""
  elif [[ -n "${source_webrtc}" ]]; then
    matching_rule_source="\"kind\":\"webrtc\",\"url\":$(json_quote "${source_webrtc}")"
    mismatched_rule_source="\"kind\":\"webrtc\",\"url\":\"forbidden-client-live-source\""
  elif [[ -n "${source_http}" ]]; then
    source_kind="${source_kind:-http}"
    matching_rule_source="\"kind\":$(json_quote "${source_kind}"),\"url\":$(json_quote "${source_http}")"
    mismatched_rule_source="\"kind\":$(json_quote "${source_kind}"),\"url\":\"http://127.0.0.1:65530/forbidden\""
  else
    fail "default source has no playable locator: ${sources_json}"
  fi
  curl -fsS -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X PUT --data '{"id":"11","enabled":true,"analysis":{"classes":["person"]},"event":{"type":"intrusion-dwell","region":{"type":"polygon","points":[{"x":0.1,"y":0.1},{"x":0.9,"y":0.1},{"x":0.9,"y":0.9},{"x":0.1,"y":0.9}]},"minConfidence":0.25,"minDurationMs":0},"ruleKind":"scenario","scenario":{"type":"intrusion-dwell","enabled":true,"candidateTimeMs":1000,"dwellTimeMs":3000,"cooldownMs":5000,"targetClasses":["person"],"restrictedZoneIds":[]}}' \
    "${BASE}/lab/analysis/rules/11" >/dev/null
  curl -fsS -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X PUT --data "{\"id\":\"12\",\"source\":{${matching_rule_source}},\"analysis\":{\"classes\":[\"person\"],\"profileId\":\"1\"},\"templateStart\":{\"ruleId\":\"11\"},\"event\":{\"type\":\"intrusion-dwell\",\"region\":{\"type\":\"polygon\",\"points\":[{\"x\":0.1,\"y\":0.1},{\"x\":0.9,\"y\":0.1},{\"x\":0.9,\"y\":0.9},{\"x\":0.1,\"y\":0.9}]},\"minConfidence\":0.25,\"minDurationMs\":0}}" \
    "${BASE}/lab/analysis/va-rules/12" >/dev/null
  curl -fsS -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X PUT --data "{\"id\":\"13\",\"source\":{${mismatched_rule_source}},\"analysis\":{\"classes\":[\"person\"],\"profileId\":\"1\"},\"templateStart\":{\"ruleId\":\"11\"},\"event\":{\"type\":\"intrusion-dwell\",\"region\":{\"type\":\"polygon\",\"points\":[{\"x\":0.1,\"y\":0.1},{\"x\":0.9,\"y\":0.1},{\"x\":0.9,\"y\":0.9},{\"x\":0.1,\"y\":0.9}]},\"minConfidence\":0.25,\"minDurationMs\":0}}" \
    "${BASE}/lab/analysis/va-rules/13" >/dev/null
  curl -fsS -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X PUT --data "{\"id\":\"14\",\"priority\":14,\"source\":{${matching_rule_source}},\"analysis\":{\"classes\":[\"person\"],\"profileId\":\"1\"},\"templateStart\":{\"ruleId\":\"11\"},\"event\":{\"type\":\"intrusion-dwell\",\"region\":{\"type\":\"polygon\",\"points\":[{\"x\":0.1,\"y\":0.1},{\"x\":0.9,\"y\":0.1},{\"x\":0.9,\"y\":0.9},{\"x\":0.1,\"y\":0.9}]},\"minConfidence\":0.25,\"minDurationMs\":0}}" \
    "${BASE}/lab/analysis/va-rules/14" >/dev/null
  curl -fsS -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X PUT --data "{\"viewId\":\"1\",\"sourceId\":\"${source_id}\",\"displayName\":\"View 1\",\"defaultRuleId\":\"12\",\"allowedRuleIds\":[\"12\",\"13\"],\"allowedOverlayModes\":[\"raw\",\"va-rule\"],\"enabled\":true}" \
    "${BASE}/ops/api/views/1" >/dev/null
  curl -fsS -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X PUT --data "{\"viewId\":\"2\",\"sourceId\":\"${source_id}\",\"displayName\":\"View 2\",\"allowedOverlayModes\":[\"raw\"],\"enabled\":true}" \
    "${BASE}/ops/api/views/2" >/dev/null
  local op_landing viewer_landing
  op_landing="$(login_landing "${OP_COOKIE}" "operator-smoke" "${TEST_PASSWORD}")"
  expect_eq "${op_landing}" "302:/ops/home" "operator login route"
  local operator_sources_html
  operator_sources_html="$(curl -fsS -b "${OP_COOKIE}" "${BASE}/ops/sources")"
  case "${operator_sources_html}" in
    *'data-testid="ops-sources-page"'*'data-scope-state="source-write-allowed"'*'id="add-channel"'*'aria-disabled="false"'*) pass "AUTH-029 operator with source write scope sees enabled source write UI" ;;
    *) fail "AUTH-029 operator source write UI allowed state missing: ${operator_sources_html}" ;;
  esac
  local op_readonly_landing
  op_readonly_landing="$(login_landing "${OP_READONLY_COOKIE}" "operator-readonly" "${TEST_PASSWORD}")"
  expect_eq "${op_readonly_landing}" "302:/ops/home" "readonly operator login route"
  viewer_landing="$(login_landing "${VIEWER_COOKIE}" "viewer-smoke" "${TEST_PASSWORD}")"
  expect_eq "${viewer_landing}" "302:/client/live" "Set-Cookie session viewer login route"
  local viewer_whoami_json
  viewer_whoami_json="$(curl -fsS -b "${VIEWER_COOKIE}" "${BASE}/auth/whoami")"
  assert_auth_redacted_material_absent "${viewer_whoami_json}"
  assert_viewer_whoami_exact_runtime "${viewer_whoami_json}"
  local integrator_landing
  integrator_landing="$(login_landing "${INTEGRATOR_COOKIE}" "integrator-smoke" "${TEST_PASSWORD}")"
  expect_eq "${integrator_landing}" "302:/auth/whoami" "integrator login keeps API-only landing"
  local viewer_logout_code viewer_logged_out_whoami_code viewer_relogin_landing
  viewer_logout_code="$(http_code -b "${VIEWER_COOKIE}" -c "${VIEWER_COOKIE}" -X POST "${BASE}/logout")"
  viewer_logged_out_whoami_code="$(http_code -b "${VIEWER_COOKIE}" "${BASE}/auth/whoami")"
  viewer_relogin_landing="$(login_landing "${VIEWER_COOKIE}" "viewer-smoke" "${TEST_PASSWORD}")"
  assert_session_role_landings_authoritative_runtime \
    "${op_landing}" "${viewer_landing}" "${integrator_landing}" "${viewer_logout_code}" \
    "${viewer_logged_out_whoami_code}" "${viewer_relogin_landing}"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" "${BASE}/ops")" "403" "viewer ops denied"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" "${BASE}/ops/vlm")" "403" "viewer VLM install/connection UI denied"
  local undefined_route_http_code undefined_route_BuildHttpResponse_status undefined_route_BuildHttpResponse_observed
  undefined_route_http_code="$(http_code -b "${VIEWER_COOKIE}" "${BASE}/undefined-route-review4")"
  undefined_route_BuildHttpResponse_status="${undefined_route_http_code}"
  undefined_route_BuildHttpResponse_observed="${undefined_route_BuildHttpResponse_status}"
  expect_eq "${undefined_route_BuildHttpResponse_observed}" "404" "undefined route BuildHttpResponse returns 404"
  local legacy_lab_http_code legacy_lab_BuildHttpResponse_status legacy_lab_BuildHttpResponse_observed
  legacy_lab_http_code="$(http_code -b "${VIEWER_COOKIE}" "${BASE}/lab")"
  legacy_lab_BuildHttpResponse_status="${legacy_lab_http_code}"
  legacy_lab_BuildHttpResponse_observed="${legacy_lab_BuildHttpResponse_status}"
  expect_eq "${legacy_lab_BuildHttpResponse_observed}" "404" "legacy /lab product UI BuildHttpResponse returns 404"
  local ops_home_html ops_dashboard_html ops_vlm_html client_live_html
  ops_home_html="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/home")"
  ops_dashboard_html="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/dashboard")"
  ops_vlm_html="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/vlm")"
  client_live_html="$(curl -fsS -b "${VIEWER_COOKIE}" "${BASE}/client/live")"
  assert_product_ui_lab_editor_absent "${ops_home_html}" "${client_live_html}"
  assert_auth_artifact_ui_api_absent "${viewer_whoami_json}" "${ops_home_html}" "${client_live_html}"
  assert_ops_vlm_raw_details_runtime_boundary "${ops_vlm_html}" "${client_live_html}"
  local profiles_before_dry_run_json install_dry_run_json profiles_after_dry_run_json
  profiles_before_dry_run_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/vlm/profiles")"
  install_dry_run_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/vlm/install-connection/dry-run?hardwareClass=local-standard&privacyMode=local-only&cloudOptIn=not-acknowledged&runtimeReadiness=missing")"
  profiles_after_dry_run_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/vlm/profiles")"
  assert_vlm_install_scope_runtime_boundary "${profiles_before_dry_run_json}" "${install_dry_run_json}" "${profiles_after_dry_run_json}" "${ops_vlm_html}" "${client_live_html}"
  local action_boundary_json ops_event_reviews_json ops_event_audit_json field_evidence_bridge_json
  action_boundary_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/actions/route-boundary")"
  assert_action_route_boundary_runtime "${action_boundary_json}"
  field_evidence_bridge_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/field-evidence/bridge-decision")"
  assert_field_evidence_bridge_runtime "${field_evidence_bridge_json}"
  curl -fsS -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' -X PUT \
    --data '{"reviewStatus":"confirmed","classification":"false-positive","incidentStatus":"in-progress","actionTarget":"operator-triage","note":"review4 safe audit note","vlmAction":{"schema":"media-server.ops.vlm-review-action-state.v1","action":"review-needed","target":"operatorReviewQuestions","note":"review4 safe VLM note"}}' \
    "${BASE}/ops/api/events/reviews/review4-safe-041" >/dev/null
  ops_event_reviews_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/events/reviews?eventId=review4-safe-041")"
  ops_event_audit_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/audit?limit=20&area=events&action=event-review-update")"
  assert_ops_event_review_runtime_boundaries "${ops_event_reviews_json}" "${ops_event_audit_json}" "${client_live_html}"
  local rules_before_draft_json rule_draft_json rules_after_draft_json
  rules_before_draft_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/rules/catalog")"
  rule_draft_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/vlm/rule-suggestion-drafts?limit=1")"
  rules_after_draft_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/rules/catalog")"
  assert_vlm_rule_draft_mutation_independent_runtime "${rules_before_draft_json}" "${rule_draft_json}" "${rules_after_draft_json}" "${client_live_html}"
  assert_safe_product_projection_runtime_boundaries "${ops_event_reviews_json}" "${rule_draft_json}" "${client_live_html}"
  expect_eq "$(http_code "${BASE}/ops/api/sources")" "401" "unauth ops sources API denied"
  expect_eq "$(http_code "${BASE}/ops/api/views")" "401" "unauth ops views API denied"
  expect_eq "$(http_code "${BASE}/ops/api/runtime/status")" "401" "unauth ops runtime API denied"
  expect_eq "$(http_code "${BASE}/ops/api/rules/catalog")" "401" "unauth ops rules catalog API denied"
  expect_eq "$(http_code "${BASE}/ops/api/events/status?limit=1")" "401" "unauth ops events API denied"
  local onvif_fixture_payload
  onvif_fixture_payload="$(tr -d '\n' < "${ROOT_DIR}/test/fixtures/onvif_live_import_stub.json")"
  local onvif_probe_fixture_payload
  onvif_probe_fixture_payload="$(tr -d '\n' < "${ROOT_DIR}/test/fixtures/onvif_probe_result_stub.json")"
  expect_eq "$(http_code -H 'Content-Type: application/json' \
    -X POST --data "${onvif_fixture_payload}" "${BASE}/ops/api/onvif/import-draft")" "401" "unauth ops ONVIF import draft API denied"
  expect_eq "$(http_code -H 'Content-Type: application/json' \
    -X POST --data "${onvif_probe_fixture_payload}" "${BASE}/ops/api/onvif/import-draft")" "401" "unauth ops ONVIF probe draft API denied"
  expect_eq "$(http_code "${BASE}/ops/api/users")" "401" "unauth ops users API denied"
  expect_eq "$(http_code "${BASE}/ops/api/invites")" "401" "unauth ops invites API denied"
  expect_eq "$(http_code "${BASE}/ops/api/access-requests")" "401" "unauth ops access requests API denied"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" "${BASE}/ops/api/sources")" "403" "viewer ops sources API denied"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" "${BASE}/ops/api/views")" "403" "viewer ops views API denied"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" "${BASE}/ops/api/runtime/status")" "403" "viewer ops runtime API denied"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data "${onvif_fixture_payload}" "${BASE}/ops/api/onvif/import-draft")" "403" "viewer ops ONVIF import draft API denied"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data "${onvif_probe_fixture_payload}" "${BASE}/ops/api/onvif/import-draft")" "403" "viewer ops ONVIF probe draft API denied"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" "${BASE}/ops/api/users")" "403" "viewer ops users API denied"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" "${BASE}/ops/api/invites")" "403" "viewer ops invites API denied"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" "${BASE}/ops/api/access-requests")" "403" "viewer ops access requests API denied"
  expect_eq "$(http_code -b "${OP_READONLY_COOKIE}" "${BASE}/ops/api/sources")" "200" "readonly operator ops read allowed"
  expect_eq "$(http_code -b "${OP_READONLY_COOKIE}" "${BASE}/ops/api/runtime/status")" "200" "ops runtime API read allowed"
  expect_eq "$(http_code -b "${OP_READONLY_COOKIE}" "${BASE}/ops/api/rules/catalog")" "200" "ops rules catalog API read allowed"
  expect_eq "$(http_code -b "${OP_READONLY_COOKIE}" "${BASE}/ops/api/events/status?limit=1")" "200" "ops events status API read allowed"
  local readonly_sources_html
  readonly_sources_html="$(curl -fsS -b "${OP_READONLY_COOKIE}" "${BASE}/ops/sources")"
  case "${readonly_sources_html}" in
    *'data-testid="ops-sources-page"'*'data-scope-state="source-write-blocked"'*'id="add-channel"'*'disabled data-scope-blocked="source:write"'*) pass "AUTH-028 readonly operator sees ops sources UI with source write lock policy" ;;
    *) fail "AUTH-028 readonly operator sources UI scope policy missing: ${readonly_sources_html}" ;;
  esac
  assert_role_navigation_action_boundaries "${ops_home_html}" "${operator_sources_html}" "${readonly_sources_html}" "${client_live_html}"
  expect_eq "$(http_code -b "${OP_READONLY_COOKIE}" "${BASE}/ops/api/users")" "403" "readonly operator admin users API denied"
  expect_eq "$(http_code -b "${OP_READONLY_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data '{"username":"readonly-invite","role":"viewer","viewId":"1"}' "${BASE}/ops/api/invites")" "403" "readonly operator invite API denied"
  expect_eq "$(http_code -b "${OP_READONLY_COOKIE}" "${BASE}/ops/api/invites")" "403" "readonly operator invite list API denied"
  expect_eq "$(http_code -b "${OP_READONLY_COOKIE}" "${BASE}/ops/api/access-requests")" "403" "readonly operator access requests API denied"
  expect_eq "$(http_code -b "${OP_READONLY_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data '{"viewId":"99"}' "${BASE}/ops/api/views")" "403" "source write scope required for view create"
  expect_eq "$(http_code -b "${OP_READONLY_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data "${onvif_fixture_payload}" "${BASE}/ops/api/onvif/import-draft")" "403" "source write scope required for ONVIF import draft"
  expect_eq "$(http_code -b "${OP_READONLY_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data "${onvif_probe_fixture_payload}" "${BASE}/ops/api/onvif/import-draft")" "403" "source write scope required for ONVIF probe draft"
  local readonly_view_update_payload readonly_source_update_payload readonly_va_rule_payload
  readonly_view_update_payload="{\"viewId\":\"1\",\"sourceId\":\"${source_id}\",\"displayName\":\"Denied\"}"
  readonly_source_update_payload="{\"sourceId\":\"${source_id}\",\"displayName\":\"Denied\",\"kind\":\"file\",\"file\":\"sample_h264.mp4\"}"
  readonly_va_rule_payload="{\"id\":\"14\",\"source\":{${matching_rule_source}},\"analysis\":{\"classes\":[\"person\"]},\"templateStart\":{\"ruleId\":\"11\"}}"
  expect_eq "$(http_code -b "${OP_READONLY_COOKIE}" -H 'Content-Type: application/json' \
    -X PUT --data "${readonly_view_update_payload}" "${BASE}/ops/api/views/1")" "403" "source write scope required for view update"
  expect_eq "$(http_code -b "${OP_READONLY_COOKIE}" -H 'Content-Type: application/json' \
    -X PUT --data "${readonly_source_update_payload}" "${BASE}/ops/api/sources/${source_id}")" "403" "source write scope required for source update"
  expect_eq "$(http_code -b "${OP_READONLY_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data '{}' "${BASE}/lab/analysis/rules")" "403" "rule write scope required for lab rule write"
  expect_eq "$(http_code -b "${OP_READONLY_COOKIE}" -H 'Content-Type: application/json' \
    -X PUT --data "${readonly_va_rule_payload}" "${BASE}/lab/analysis/va-rules/14")" "403" "rule write scope required for lab vaRule write"
  expect_eq "$(http_code -b "${OP_READONLY_COOKIE}" -H 'Content-Type: application/json' \
    -X PUT --data '{"id":"99","trackingClasses":["person"]}' "${BASE}/lab/analysis/profiles/99")" "403" "rule write scope required for lab profile write"
  local vlm_profile_payload invalid_vlm_profile_payload
  vlm_profile_payload='{"schema":"media-server.vlm-profile.v1","id":"vlm-route-smoke","selectedOptionId":"primary-qwen3-vl-8b-instruct","provider":"user-supplied-local-runtime","model":"Qwen/Qwen3-VL-8B-Instruct","runtime":"not-configured","privacyMode":"local-only","cloudOptInAcknowledged":false,"promptProfile":{"id":"event-review-default","version":"v1","language":"ko-en"},"evaluation":{"candidateId":"","expectedCatalogRevision":"","expectedProvenanceDigest":""},"activation":{"enabled":false,"status":"disabled","fallbackProfileId":"","disabledReason":"evaluation-not-run"},"runtimeContract":{"schema":"media-server.vlm-runtime-opt-in-contract.v1","targetStep":"V210-S01","mode":"disabled","status":"disabled","defaultEnabled":false,"operatorOptInRequired":true,"operatorOptInAcknowledged":false,"runtimeCallAllowed":false,"providerCallAllowed":false,"providerFieldSmokeRequired":false,"failurePolicy":{"missingModel":"blocked-missing-model-no-media-path-failure","invalidOutput":"rejected-invalid-output-no-sidecar-write","timeout":"timeout-no-media-path-failure"},"sideEffects":{"runtimeVlmCallPerformed":false,"cloudProviderApiCalled":false,"modelArtifactDownloaded":false,"modelArtifactBundled":false,"credentialStored":false,"sidecarStored":false,"eventPostPayloadChanged":false,"webrtcDataChannelSchemaChanged":false,"sseMetadataSchemaChanged":false,"wsMetadataSchemaChanged":false,"rtspOrWebrtcMediaPathChanged":false,"viewerClientExposureAdded":false}},"sourceStep":"V210-S01","storageScope":"profile-storage-only","contractInvariants":{"runtimeVlmCallPerformed":false,"sidecarStored":false,"cloudProviderApiCalled":false,"credentialStored":false,"eventPostPayloadChanged":false,"webrtcDataChannelSchemaChanged":false,"sseMetadataSchemaChanged":false,"wsMetadataSchemaChanged":false,"rtspOrWebrtcMediaPathChanged":false,"viewerClientExposureAdded":false}}'
  invalid_vlm_profile_payload='{"schema":"media-server.vlm-profile.v1","id":"vlm-route-smoke-invalid","selectedOptionId":"primary-qwen3-vl-8b-instruct","provider":"user-supplied-local-runtime","model":"Qwen/Qwen3-VL-8B-Instruct","runtime":"not-configured","privacyMode":"local-only","prompt":"leak"}'
  expect_eq "$(http_code "${BASE}/ops/api/vlm/profiles")" "401" "unauth VLM profile API denied"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" "${BASE}/ops/api/vlm/profiles")" "403" "viewer VLM profile API denied"
  expect_eq "$(http_code -b "${OP_READONLY_COOKIE}" "${BASE}/ops/api/vlm/profiles")" "200" "readonly operator VLM profile read allowed"
  expect_eq "$(http_code -b "${OP_READONLY_COOKIE}" -H 'Content-Type: application/json' \
    -X PUT --data "${vlm_profile_payload}" "${BASE}/ops/api/vlm/profiles/vlm-route-smoke")" "403" "rule write scope required for VLM profile write"
  expect_eq "$(http_code -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X PUT --data "${invalid_vlm_profile_payload}" "${BASE}/ops/api/vlm/profiles/vlm-route-smoke-invalid")" "400" "invalid VLM profile fixture rejected"
  local vlm_profile_json vlm_profile_list_json
  vlm_profile_json="$(curl -fsS -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X PUT --data "${vlm_profile_payload}" "${BASE}/ops/api/vlm/profiles/vlm-route-smoke")"
  case "${vlm_profile_json}" in
    *'"status":"created"'*'"schema":"media-server.vlm-profile.v1"'*) pass "VLM profile write creates storage document" ;;
    *) fail "VLM profile write response mismatch: ${vlm_profile_json}" ;;
  esac
  vlm_profile_list_json="$(curl -fsS -b "${OP_READONLY_COOKIE}" "${BASE}/ops/api/vlm/profiles")"
  assert_vlm_privacy_redaction_absent "${vlm_profile_list_json}"
  assert_vlm_defaultEnabled_runtime_absent "${vlm_profile_list_json}"
  case "${vlm_profile_list_json}" in
    *'"schema":"media-server.vlm-profile-registry.v1"'*'"id":"vlm-route-smoke"'*'"evaluation":'*'"status":"not-run"'*) pass "VLM profile read lists stored profile with canonical evaluation status" ;;
    *) fail "VLM profile read list mismatch: ${vlm_profile_list_json}" ;;
  esac
  local vlm_profile_get_json
  vlm_profile_get_json="$(curl -fsS -b "${OP_READONLY_COOKIE}" "${BASE}/ops/api/vlm/profiles/vlm-route-smoke")"
  assert_vlm_profile_authoritative_persistence "${vlm_profile_get_json}" "${ANALYSIS_REGISTRY_FILE}"
  expect_eq "$(http_code -b "${ADMIN_COOKIE}" -X DELETE "${BASE}/ops/api/vlm/profiles/vlm-route-smoke")" "200" "VLM profile delete allowed for admin"
  local vlm_profile_delete_readback_json
  vlm_profile_delete_readback_json="$(curl -fsS -b "${OP_READONLY_COOKIE}" "${BASE}/ops/api/vlm/profiles")"
  case "${vlm_profile_delete_readback_json}" in
    *'"id":"vlm-route-smoke"'*) fail "VLM profile delete readback still contains vlm-route-smoke: ${vlm_profile_delete_readback_json}" ;;
    *) pass "VLM profile delete readback confirms vlm-route-smoke absence" ;;
  esac
  local operator_source_write_json
  operator_source_write_json="$(curl -fsS -b "${OP_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data '{"sourceId":"30","displayName":"Operator Scope Write","kind":"whep","whepUrl":"https://example.test/operator-scope-write","enabled":true}' \
    "${BASE}/ops/api/sources")"
  case "${operator_source_write_json}" in
    *'"sourceId":"30"'*'"kind":"whep"'*'"whepUrl":"https://example.test/operator-scope-write"'*) pass "AUTH-029 operator source write scope creates source" ;;
    *) fail "AUTH-029 operator source write response missing expected fields: ${operator_source_write_json}" ;;
  esac
  local operator_rule_code
  operator_rule_code="$(http_code -b "${OP_COOKIE}" -H 'Content-Type: application/json' \
    -X PUT --data '{"id":"99","trackingClasses":["person"]}' "${BASE}/lab/analysis/profiles/99")"
  expect_eq "${operator_rule_code}" "200" "AUTH-029 operator rule write scope saves profile"
  local admin_users_page_code admin_rules_page_code admin_sources_page_code admin_users_api_code
  local admin_source_action_code admin_rule_action_code admin_invite_action_code operator_invite_action_code admin_users_html
  admin_users_page_code="$(http_code -b "${ADMIN_COOKIE}" "${BASE}/ops/users")"
  admin_rules_page_code="$(http_code -b "${ADMIN_COOKIE}" "${BASE}/ops/rules")"
  admin_sources_page_code="$(http_code -b "${ADMIN_COOKIE}" "${BASE}/ops/sources")"
  admin_users_api_code="$(http_code -b "${ADMIN_COOKIE}" "${BASE}/ops/api/users")"
  admin_source_action_code="$(http_code -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data '{"sourceId":"39064","displayName":"Admin Action Source","kind":"file","file":"sample_h265.mp4","enabled":true}' "${BASE}/ops/api/sources")"
  admin_rule_action_code="$(http_code -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X PUT --data '{"id":"98","trackingClasses":["person"]}' "${BASE}/lab/analysis/profiles/98")"
  admin_invite_action_code="$(http_code -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data '{"username":"admin-action-smoke","displayName":"Admin Action Smoke","role":"viewer","viewId":"1"}' "${BASE}/ops/api/invites")"
  operator_invite_action_code="$(http_code -b "${OP_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data '{"username":"operator-admin-denied","role":"viewer","viewId":"1"}' "${BASE}/ops/api/invites")"
  admin_users_html="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/users")"
  assert_admin_role_routes_authoritative_runtime \
    "${admin_users_page_code}" "${admin_rules_page_code}" "${admin_sources_page_code}" "${admin_users_api_code}" \
    "${admin_source_action_code}" "${admin_rule_action_code}" "${admin_invite_action_code}" \
    "${operator_invite_action_code}" "${admin_users_html}"
  local onvif_draft_json
  onvif_draft_json="$(curl -fsS -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data "${onvif_fixture_payload}" "${BASE}/ops/api/onvif/import-draft")"
  case "${onvif_draft_json}" in
    *'"status":"onvifImportDraft"'*'"notSaved":true'*'"sourceDraft"'*'"publishedViewDraft"'*) pass "ONVIF import draft API allowed for source writer" ;;
    *) fail "ONVIF import draft response missing expected fields: ${onvif_draft_json}" ;;
  esac
  case "${onvif_draft_json}" in
    *'"credentialRef"'*|*'operator-entered-secret'*|*'/onvif/device_service'*) fail "ONVIF import draft leaked credential or endpoint: ${onvif_draft_json}" ;;
    *) pass "ONVIF import draft redacts credential reference and endpoint" ;;
  esac
  assert_onvif_and_runtime_trend_boundaries "${onvif_draft_json}" "${ops_dashboard_html}" "${client_live_html}"
  local onvif_probe_draft_json
  onvif_probe_draft_json="$(curl -fsS -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data "${onvif_probe_fixture_payload}" "${BASE}/ops/api/onvif/import-draft")"
  case "${onvif_probe_draft_json}" in
    *'"status":"onvifImportDraft"'*'"notSaved":true'*'"sourceDraft"'*'"publishedViewDraft"'*) pass "ONVIF probe draft API allowed for source writer" ;;
    *) fail "ONVIF probe draft response missing expected fields: ${onvif_probe_draft_json}" ;;
  esac
  case "${onvif_probe_draft_json}" in
    *'"credentialRef"'*|*'operator-entered-secret'*|*'/onvif/device_service'*) fail "ONVIF probe draft leaked credential or endpoint: ${onvif_probe_draft_json}" ;;
    *) pass "ONVIF probe draft redacts credential reference and endpoint" ;;
  esac
  local whep_source_json whep_sources_json
  whep_source_json="$(curl -fsS -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data '{"sourceId":"31","displayName":"WHEP Smoke","kind":"whep","whepUrl":"https://example.test/whep/stream?b=2&a=1","enabled":true}' \
    "${BASE}/ops/api/sources")"
  case "${whep_source_json}" in
    *'"kind":"whep"'*'"whepUrl":"https://example.test/whep/stream?b=2&a=1"'*) pass "WHEP source registry create allowed" ;;
    *) fail "WHEP source registry create response missing fields: ${whep_source_json}" ;;
  esac
  expect_eq "$(http_code -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data '{"sourceId":"32","displayName":"WHEP Smoke Dup","kind":"whep","whepUrl":"https://example.test/whep/stream?a=1&b=2","enabled":true}' \
    "${BASE}/ops/api/sources")" "409" "WHEP source canonical duplicate denied"
  whep_sources_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/sources")"
  case "${whep_sources_json}" in
    *'"sourceId":"31"'*'"kind":"whep"'*'"whepUrl":"https://example.test/whep/stream?b=2&a=1"'*) pass "WHEP source visible to ops API" ;;
    *) fail "WHEP source missing from ops API: ${whep_sources_json}" ;;
  esac
  expect_eq "$(http_code -b "${INTEGRATOR_COOKIE}" "${BASE}/client")" "403" "integrator client shell denied"
  expect_eq "$(http_code "${BASE}/client/api/views")" "401" "unauth client views API denied"
  expect_eq "$(http_code "${BASE}/client/api/preferences/live-layout")" "401" "unauth client live layout preference API denied"
  expect_eq "$(http_code "${BASE}/client/api/views/1/dashboard")" "401" "unauth client dashboard API denied"
  expect_eq "$(http_code -H 'Content-Type: application/json' \
    -X POST --data '{"overlayMode":"raw"}' "${BASE}/client/api/views/1/webrtc/session")" "401" "unauth client WebRTC wrapper denied"
  local public_request_code client_views_json client_view_detail_json client_layout_json integrator_views_json
  public_request_code="$(http_code -H 'Content-Type: application/json' \
    -X POST --data '{"username":"route-public-request","displayName":"Route Public","contact":"route@example.test","viewId":"1","reason":"route smoke"}' "${BASE}/client/api/access-requests")"
  expect_eq "${public_request_code}" "201" "public access request API remains unauthenticated"
  client_views_json="$(curl -fsS -b "${VIEWER_COOKIE}" "${BASE}/client/api/views")"
  assert_client_redacted_debug_absent "${client_views_json}" "${client_live_html}"
  local client_events_boundary_json
  client_events_boundary_json="$(curl -fsS -b "${VIEWER_COOKIE}" "${BASE}/client/api/views/1/events")"
  assert_client_incident_digest_runtime_boundary "${client_events_boundary_json}"
  printf '%s' "${client_views_json}" | assert_client_views_api_freeze
  case "${client_views_json}" in
    *'"viewId":"1"'*) pass "viewer assigned view visible in client API" ;;
    *) fail "viewer assigned view missing from client API: ${client_views_json}" ;;
  esac
  case "${client_views_json}" in
    *'"viewId":"1"'*'"defaultRuleId":"12"'*'"allowedRuleIds":["12","13"]'*) pass "SRC-022 viewer client API keeps PublishedView allowedRuleIds list" ;;
    *) fail "SRC-022 viewer client API allowedRuleIds mismatch: ${client_views_json}" ;;
  esac
  case "${client_views_json}" in
    *'"allowedRuleIds"'*'"14"'*) fail "SRC-022 viewer client API leaked unassigned vaRule 14: ${client_views_json}" ;;
    *) pass "SRC-022 viewer client API omits unassigned vaRule from allowedRuleIds" ;;
  esac
  client_view_detail_json="$(curl -fsS -b "${VIEWER_COOKIE}" "${BASE}/client/api/views/1")"
  case "${client_view_detail_json}" in
    *'"viewId":"1"'*'"defaultRuleId":"12"'*'"allowedRuleIds":["12","13"]'*) pass "SRC-022 viewer client detail API keeps PublishedView allowedRuleIds list" ;;
    *) fail "SRC-022 viewer client detail API allowedRuleIds mismatch: ${client_view_detail_json}" ;;
  esac
  case "${client_views_json}" in
    *'"viewId":"2"'*) fail "viewer unassigned view leaked in client API: ${client_views_json}" ;;
    *) pass "viewer unassigned view hidden from client API" ;;
  esac
  client_layout_json="$(curl -fsS -b "${VIEWER_COOKIE}" "${BASE}/client/api/preferences/live-layout")"
  case "${client_layout_json}" in
    *'"userPreferenceSeparateFromRolePreset":true'*'"rolePreset"'*) pass "viewer client live layout preference separates user and role presets" ;;
    *) fail "viewer client live layout preference contract missing: ${client_layout_json}" ;;
  esac
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" -H 'Content-Type: application/json' \
    -X PUT --data '{"schema":"media-server.client-live-layout.v1","workspaceLayout":{"gridSize":2,"density":"compact","dockSide":"right"},"filters":{"eventFeed":"selected-tile","selectedTileIndex":0,"selectedViewId":"1"},"overlayDefaults":{"infoOverlayEnabled":true},"selectedSources":[{"slot":0,"viewId":"1","overlayMode":"raw"}],"tiles":[{"slot":0,"viewId":"1","overlayMode":"raw","selected":true}]}' \
    "${BASE}/client/api/preferences/live-layout")" "200" "viewer client live layout preference save allowed"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" -H 'Content-Type: application/json' \
    -X PUT --data '{"schema":"media-server.client-live-layout.v1","workspaceLayout":{"gridSize":1,"density":"comfortable","dockSide":"left"},"filters":{"eventFeed":"selected-tile"},"overlayDefaults":{"infoOverlayEnabled":false},"sourceUrl":"rtsp://192.0.2.10/live"}' \
    "${BASE}/client/api/preferences/live-layout")" "400" "viewer client live layout preference rejects source URL material"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" "${BASE}/client/api/views/2/dashboard")" "403" "viewer cross-view dashboard denied"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data '{"overlayMode":"raw"}' "${BASE}/client/api/views/2/webrtc/session")" "403" "viewer cross-view WebRTC wrapper denied"
  integrator_views_json="$(curl -fsS -b "${INTEGRATOR_COOKIE}" "${BASE}/client/api/views")"
  case "${integrator_views_json}" in
    *'"viewId":"1"'*) fail "integrator live view leaked in client views list: ${integrator_views_json}" ;;
    *) pass "integrator client views list omits live views" ;;
  esac
  expect_eq "$(http_code -b "${INTEGRATOR_COOKIE}" "${BASE}/client/api/views/1/events?limit=1")" "200" "integrator event scope allowed"
  expect_eq "$(http_code "${BASE}/client/api/views/1/events/search?q=presence&limit=1")" "401" "unauth scoped event search denied"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" "${BASE}/client/api/views/1/events/search?q=presence&limit=1")" "403" "viewer scoped event search role denied"
  expect_eq "$(http_code -b "${INTEGRATOR_COOKIE}" "${BASE}/client/api/views/1/events/search?q=presence&limit=1")" "200" "integrator scoped event search allowed"
  expect_eq "$(http_code -b "${INTEGRATOR_COOKIE}" "${BASE}/client/api/views/2/events/search?q=presence&limit=1")" "403" "integrator scoped event search cross-view denied"
  expect_eq "$(http_code -b "${INTEGRATOR_COOKIE}" "${BASE}/client/api/views/1/metadata")" "200" "integrator metadata scope allowed"
  expect_eq "$(http_code -b "${INTEGRATOR_COOKIE}" "${BASE}/client/api/views/1/dashboard")" "403" "integrator dashboard scope denied"
  expect_eq "$(http_code -X POST "${BASE}/webrtc/session?file=sample_h264.mp4")" "401" "unauth generic WebRTC denied"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" -X POST "${BASE}/webrtc/session?file=sample_h264.mp4")" "403" "viewer generic WebRTC denied"
  expect_eq "$(http_code -X POST "${BASE}/whep?file=sample_h264.mp4")" "401" "unauth WHEP denied"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" -X POST "${BASE}/whep?file=sample_h264.mp4")" "403" "viewer WHEP denied"
  expect_eq "$(http_code -X POST --data 'v=0' "${BASE}/whip/publish?sourceId=91")" "401" "unauth WHIP publish denied"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" -X POST --data 'v=0' "${BASE}/whip/publish?sourceId=91")" "403" "viewer WHIP publish denied"
  expect_eq "$(http_code "${BASE}/ws/va-metadata?file=sample_h264.mp4")" "401" "unauth metadata websocket denied"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" "${BASE}/ws/va-metadata?file=sample_h264.mp4")" "403" "viewer metadata websocket denied"
  expect_eq "$(response_header_value access-control-allow-origin "${BASE}/auth/whoami")" "" "plain request omits CORS allow origin"
  expect_eq "$(http_code -H 'Origin: http://evil.example' "${BASE}/auth/whoami")" "403" "cross-origin actual request denied"
  expect_eq "$(response_header_value access-control-allow-origin -H 'Origin: http://evil.example' "${BASE}/auth/whoami")" "" "cross-origin response omits CORS allow origin"
  expect_eq "$(response_header_value access-control-allow-origin -H "Origin: ${BASE}" "${BASE}/auth/whoami")" "${BASE}" "same-origin actual reflects origin"
  expect_eq "$(http_code -X OPTIONS -H 'Origin: http://evil.example' -H 'Access-Control-Request-Method: GET' "${BASE}/auth/whoami")" "403" "cross-origin preflight denied"
  expect_eq "$(http_code -X OPTIONS -H "Origin: ${BASE}" -H 'Access-Control-Request-Method: GET' "${BASE}/auth/whoami")" "204" "same-origin preflight allowed"
  expect_eq "$(response_header_value access-control-allow-origin -X OPTIONS -H "Origin: ${BASE}" -H 'Access-Control-Request-Method: GET' "${BASE}/auth/whoami")" "${BASE}" "same-origin preflight reflects origin"
  expect_eq "$(raw_http_code $'POST /login HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: abc\r\nConnection: close\r\n\r\n')" "400" "invalid content-length rejected"
  expect_eq "$(http_code "${BASE}/health")" "200" "server survives invalid content-length"
  expect_eq "$(raw_http_code $'POST /login HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: 2097153\r\nConnection: close\r\n\r\n')" "413" "oversized content-length rejected"
  expect_eq "$(http_code "${BASE}/health")" "200" "server survives oversized content-length"
  local admin_session_json admin_session_id admin_session_token
  admin_session_json="$(curl -fsS -b "${ADMIN_COOKIE}" -X POST "${BASE}/webrtc/session?file=sample_h264.mp4")"
  admin_session_id="$(printf '%s' "${admin_session_json}" | json_string_field sessionId)"
  admin_session_token="$(printf '%s' "${admin_session_json}" | json_string_field sessionToken)"
  if printf '%s' "${admin_session_id}" | grep -Eq '^webrtc-http-[0-9a-f]{64}$'; then
    pass "WebRTC session id uses random token shape"
  else
    fail "WebRTC session id is not random-shaped: ${admin_session_id}"
  fi
  if printf '%s' "${admin_session_token}" | grep -Eq '^[0-9a-f]{64}$'; then
    pass "WebRTC session capability issued"
  else
    fail "WebRTC session capability missing: ${admin_session_json}"
  fi
  expect_eq "$(http_code "${BASE}/webrtc/session/${admin_session_id}/ice")" "401" "unauth session follow-up denied"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" "${BASE}/webrtc/session/${admin_session_id}/ice")" "403" "viewer session follow-up denied"
  expect_eq "$(http_code -H "X-Session-Capability: ${admin_session_token}" "${BASE}/webrtc/session/${admin_session_id}/ice")" "200" "session capability follow-up allowed"
  expect_eq "$(http_code -H "X-Session-Capability: ${admin_session_token}" -X DELETE "${BASE}/webrtc/session/${admin_session_id}")" "200" "session capability delete allowed"
  local client_session_json client_session_id
  client_session_json="$(curl -fsS -b "${VIEWER_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data '{"overlayMode":"raw"}' "${BASE}/client/api/views/1/webrtc/session")"
  client_session_id="$(printf '%s' "${client_session_json}" | json_string_field sessionId)"
  if printf '%s' "${client_session_id}" | grep -Eq '^client-live-[0-9a-f]{64}$'; then
    pass "client WebRTC wrapper returns client session alias"
  else
    fail "client WebRTC wrapper leaked unexpected session id: ${client_session_json}"
  fi
  case "${client_session_json}" in
    *sessionToken*|*client-live-internal*|*webrtc-http*)
      fail "client WebRTC wrapper leaked internal signaling detail: ${client_session_json}" ;;
    *) pass "client WebRTC wrapper hides internal signaling detail" ;;
  esac
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data '{"overlayMode":"raw"}' "${BASE}/client/api/views/1/webrtc/session")" "409" "client PublishedView maxTiles enforced"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data '{"file":"sample_h264.mp4","overlayMode":"raw"}' "${BASE}/client/api/views/1/webrtc/session")" "400" "client WebRTC wrapper source override denied"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" "${BASE}/webrtc/session/${client_session_id}/ice")" "404" "client alias rejected on generic session route"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" "${BASE}/client/api/views/1/webrtc/session/${client_session_id}/ice")" "200" "client wrapper ICE allowed"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" -X DELETE "${BASE}/client/api/views/1/webrtc/session/${client_session_id}")" "200" "client wrapper delete allowed"
  local client_rule_session_json client_rule_session_id
  client_rule_session_json="$(curl -fsS -b "${VIEWER_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data '{"overlayMode":"va-rule","ruleId":"12"}' "${BASE}/client/api/views/1/webrtc/session")"
  client_rule_session_id="$(printf '%s' "${client_rule_session_json}" | json_string_field sessionId)"
  assert_vaRule_session_id "${client_rule_session_id}" "${client_rule_session_json}"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" -X DELETE "${BASE}/client/api/views/1/webrtc/session/${client_rule_session_id}")" "200" "client vaRule wrapper delete allowed"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data '{"overlayMode":"va-rule","ruleId":"13"}' "${BASE}/client/api/views/1/webrtc/session")" "400" "client vaRule source mismatch denied"

  local viewer_ops_boundary_code viewer_lab_boundary_code integrator_client_boundary_code
  local integrator_event_boundary_code integrator_metadata_boundary_code integrator_dashboard_boundary_code
  local readonly_read_boundary_code readonly_source_write_boundary_code readonly_rule_write_boundary_code
  local lab_read_boundary_code lab_viewer_boundary_code cross_view_dashboard_boundary_code cross_view_webrtc_boundary_code
  local unauth_users_boundary_code unauth_users_boundary_body forbidden_users_boundary_code forbidden_users_boundary_body
  local cors_actual_boundary_code cors_preflight_boundary_code cors_allow_origin_boundary
  viewer_ops_boundary_code="$(http_code -b "${VIEWER_COOKIE}" "${BASE}/ops/api/sources")"
  viewer_lab_boundary_code="$(http_code -b "${VIEWER_COOKIE}" "${BASE}/lab/runtime/status")"
  integrator_client_boundary_code="$(http_code -b "${INTEGRATOR_COOKIE}" "${BASE}/client")"
  integrator_event_boundary_code="$(http_code -b "${INTEGRATOR_COOKIE}" "${BASE}/client/api/views/1/events?limit=1")"
  integrator_metadata_boundary_code="$(http_code -b "${INTEGRATOR_COOKIE}" "${BASE}/client/api/views/1/metadata")"
  integrator_dashboard_boundary_code="$(http_code -b "${INTEGRATOR_COOKIE}" "${BASE}/client/api/views/1/dashboard")"
  readonly_read_boundary_code="$(http_code -b "${OP_READONLY_COOKIE}" "${BASE}/ops/api/sources")"
  readonly_source_write_boundary_code="$(http_code -b "${OP_READONLY_COOKIE}" -H 'Content-Type: application/json' -X POST --data '{"sourceId":"auth-boundary-denied","displayName":"Denied","kind":"file","file":"sample_h264.mp4"}' "${BASE}/ops/api/sources")"
  readonly_rule_write_boundary_code="$(http_code -b "${OP_READONLY_COOKIE}" -H 'Content-Type: application/json' -X PUT --data '{"id":"auth-boundary-denied","trackingClasses":["person"]}' "${BASE}/lab/analysis/profiles/auth-boundary-denied")"
  lab_read_boundary_code="$(http_code -b "${OP_READONLY_COOKIE}" "${BASE}/lab/runtime/status")"
  lab_viewer_boundary_code="$(http_code -b "${VIEWER_COOKIE}" "${BASE}/lab/runtime/status")"
  cross_view_dashboard_boundary_code="$(http_code -b "${VIEWER_COOKIE}" "${BASE}/client/api/views/2/dashboard")"
  cross_view_webrtc_boundary_code="$(http_code -b "${VIEWER_COOKIE}" -H 'Content-Type: application/json' -X POST --data '{"overlayMode":"raw"}' "${BASE}/client/api/views/2/webrtc/session")"
  unauth_users_boundary_code="$(http_code "${BASE}/ops/api/users")"; unauth_users_boundary_body="$(curl -sS "${BASE}/ops/api/users")"
  forbidden_users_boundary_code="$(http_code -b "${VIEWER_COOKIE}" "${BASE}/ops/api/users")"; forbidden_users_boundary_body="$(curl -sS -b "${VIEWER_COOKIE}" "${BASE}/ops/api/users")"
  cors_actual_boundary_code="$(http_code -H 'Origin: http://evil.example' "${BASE}/auth/whoami")"
  cors_preflight_boundary_code="$(http_code -X OPTIONS -H 'Origin: http://evil.example' -H 'Access-Control-Request-Method: GET' "${BASE}/auth/whoami")"
  cors_allow_origin_boundary="$(response_header_value access-control-allow-origin -H 'Origin: http://evil.example' "${BASE}/auth/whoami")"
  assert_auth_role_scope_authoritative_runtime \
    "${viewer_landing}" "${viewer_ops_boundary_code}" "${viewer_lab_boundary_code}" "${client_live_html}" "${client_views_json}" \
    "${integrator_landing}" "${integrator_client_boundary_code}" "${integrator_views_json}" "${integrator_event_boundary_code}" \
    "${integrator_metadata_boundary_code}" "${integrator_dashboard_boundary_code}" "${readonly_read_boundary_code}" \
    "${readonly_source_write_boundary_code}" "${readonly_rule_write_boundary_code}" "${operator_source_write_json}" "${operator_rule_code}" \
    "${lab_read_boundary_code}" "${lab_viewer_boundary_code}" "${cross_view_dashboard_boundary_code}" "${cross_view_webrtc_boundary_code}" \
    "${unauth_users_boundary_code}" "${unauth_users_boundary_body}" "${forbidden_users_boundary_code}" "${forbidden_users_boundary_body}" \
    "${cors_actual_boundary_code}" "${cors_preflight_boundary_code}" "${cors_allow_origin_boundary}"

  stop_server
  printf '%s\n' '{"sources":[{"sourceId":"98","displayName":"Broken Source","kind":"file","enabled":true}]}' >"${SOURCE_REGISTRY_FILE}"
  rm -f "${VIEWS_REGISTRY_FILE}" "${VIEWS_REGISTRY_FILE}".tmp*
  start_server auto lab
  login_admin
  expect_eq "$(http_code -b "${ADMIN_COOKIE}" "${BASE}/ops/api/sources")" "500" "malformed source registry fail closed"
  if grep -Fq '"sourceId":"98"' "${SOURCE_REGISTRY_FILE}"; then
    pass "malformed source registry not overwritten"
  else
    fail "malformed source registry was overwritten"
  fi

  stop_server
  printf '%s\n' '{"sources":[{"sourceId":"97","displayName":"Strict Source","kind":"file","file":"sample_h264.mp4","enabled":true}]}' >"${SOURCE_REGISTRY_FILE}"
  printf '%s\n' '{"views":[{"viewId":"96","displayName":"Broken View","enabled":true}]}' >"${VIEWS_REGISTRY_FILE}"
  start_server auto lab
  login_admin
  expect_eq "$(http_code -b "${ADMIN_COOKIE}" "${BASE}/ops/api/views")" "500" "malformed published view registry fail closed"
  if grep -Fq '"viewId":"96"' "${VIEWS_REGISTRY_FILE}"; then
    pass "malformed published view registry not overwritten"
  else
    fail "malformed published view registry was overwritten"
  fi

  local token_seed_raw token_unauth_code token_mutated_code token_whoami_json
  local token_sources_code token_rules_code token_users_code token_users_html
  stop_server
  token_seed_raw="$(python3 - "${USERS_FILE}" <<'PY'
import ctypes
import ctypes.util
import json
import pathlib
import sys

library = ctypes.util.find_library("sodium")
if not library:
    raise SystemExit("libsodium shared library not found for auth token fixture")
sodium = ctypes.CDLL(library)
if sodium.sodium_init() < 0:
    raise SystemExit("libsodium initialization failed")
sodium.crypto_pwhash_strbytes.restype = ctypes.c_size_t
sodium.crypto_pwhash_opslimit_interactive.restype = ctypes.c_ulonglong
sodium.crypto_pwhash_memlimit_interactive.restype = ctypes.c_size_t
raw = (ctypes.c_ubyte * 32)()
sodium.randombytes_buf(raw, ctypes.c_size_t(len(raw)))
token = bytes(raw).hex()
encoded = token.encode()
out = ctypes.create_string_buffer(sodium.crypto_pwhash_strbytes())
result = sodium.crypto_pwhash_str(
    out,
    ctypes.c_char_p(encoded),
    ctypes.c_ulonglong(len(encoded)),
    sodium.crypto_pwhash_opslimit_interactive(),
    sodium.crypto_pwhash_memlimit_interactive(),
)
if result != 0:
    raise SystemExit("libsodium token hash generation failed")
users_file = pathlib.Path(sys.argv[1])
store = json.loads(users_file.read_text())
user = next((item for item in store.get("users", []) if item.get("username") == "operator-smoke"), None)
if not user:
    raise SystemExit("operator token fixture user missing")
user["tokenHash"] = out.value.decode()
users_file.write_text(json.dumps(store, indent=2) + "\n")
users_file.chmod(0o600)
print(token)
PY
)"
  [[ "${token_seed_raw}" =~ ^[0-9a-f]{64}$ ]] || fail "libsodium token fixture raw token shape invalid"
  rm -f "${SOURCE_REGISTRY_FILE}" "${SOURCE_REGISTRY_FILE}".tmp* \
    "${VIEWS_REGISTRY_FILE}" "${VIEWS_REGISTRY_FILE}".tmp*
  start_server token lab
  token_unauth_code="$(http_code "${BASE}/auth/whoami")"
  expect_eq "${token_unauth_code}" "401" "token mode unauthenticated request denied"
  token_mutated_code="$(http_code -H "Authorization: Bearer ${token_seed_raw}x" "${BASE}/auth/whoami")"
  token_whoami_json="$(curl -fsS -H "Authorization: Bearer ${token_seed_raw}" "${BASE}/auth/whoami")"
  token_sources_code="$(http_code -H "Authorization: Bearer ${token_seed_raw}" "${BASE}/ops/api/sources")"
  token_rules_code="$(http_code -H "Authorization: Bearer ${token_seed_raw}" "${BASE}/ops/api/rules/catalog")"
  token_users_code="$(http_code -H "Authorization: Bearer ${token_seed_raw}" "${BASE}/ops/api/users")"
  token_users_html="$(curl -sS -H "Authorization: Bearer ${token_seed_raw}" "${BASE}/ops/users")"
  assert_user_token_hash_authoritative_runtime \
    "${token_seed_raw}" "${token_whoami_json}" "${token_unauth_code}" "${token_mutated_code}" \
    "${token_sources_code}" "${token_rules_code}" "${token_users_code}" "${token_users_html}"

  stop_server
  rm -f "${SOURCE_REGISTRY_FILE}" "${SOURCE_REGISTRY_FILE}".tmp* \
    "${VIEWS_REGISTRY_FILE}" "${VIEWS_REGISTRY_FILE}".tmp*
  start_server off lab
  local off_root_location off_whoami_json off_users_code
  off_root_location="$(header_status_location "${BASE}/")"
  expect_eq "${off_root_location}" "302:/ops/home" "auth off root redirects to ops"
  off_whoami_json="$(curl -fsS "${BASE}/auth/whoami")"
  off_users_code="$(http_code "${BASE}/ops/api/users")"
  expect_eq "${off_users_code}" "200" "auth off development admin accesses users API"
  assert_auth_off_authoritative_runtime "${off_root_location}" "${off_whoami_json}" "${off_users_code}" "${auto_default_root}"
}

case "${MODE}" in
  bootstrap)
    run_bootstrap
    ;;
  users)
    run_users
    ;;
  routes)
    run_routes
    ;;
  *)
    fail "unknown auth verify mode: ${MODE}"
    ;;
esac

echo
echo "== Auth ${MODE} 검증 요약 =="
echo "- 통과: ${pass_count}"
echo "- 실패: 0"
