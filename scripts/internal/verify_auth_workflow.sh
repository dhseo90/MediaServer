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
    *'"role":"admin"'*) pass "admin whoami role" ;;
    *) fail "admin whoami role missing: ${whoami}" ;;
  esac
}

run_bootstrap() {
  start_server auto lab
  expect_eq "$(header_status_location "${BASE}/")" "302:/setup" "missing users root redirect"
  expect_page_contains "setup auth shell selectors" "${BASE}/setup" \
    'class="auth-shell"' 'id="themeToggleBtn"' 'name="username"' 'name="password"' 'name="confirm"' '기본 kr-privacy 정책'
  auth_ui_smoke "setup" "/setup" "form.auth-form" "" 'name="confirm"'
  setup_admin
  expect_eq "$(header_status_location "${BASE}/")" "302:/login" "unauthenticated root redirect"
  expect_page_contains "login auth shell selectors" "${BASE}/login" \
    'class="auth-shell"' 'id="themeToggleBtn"' 'name="username"' 'name="password"' 'autocomplete="current-password"'
  auth_ui_smoke "login" "/login" "form.auth-form" "" 'autocomplete="current-password"'
  expect_page_contains "client access request auth shell selectors" "${BASE}/client/request-access" \
    'class="auth-shell"' 'id="request-form"' 'name="username"' 'name="contact"' 'name="reason"' \
    '승인 전에는 로그인/채널 접근이 열리지 않습니다' 'window.MediaServerUi'
  auth_ui_smoke "client-request-access" "/client/request-access" "#request-form" "" 'name="reason"'
  login_admin
  local logout_code whoami_code
  logout_code="$(http_code -b "${ADMIN_COOKIE}" -c "${ADMIN_COOKIE}" -X POST "${BASE}/logout")"
  expect_eq "${logout_code}" "302" "logout redirects"
  whoami_code="$(http_code -b "${ADMIN_COOKIE}" "${BASE}/auth/whoami")"
  expect_eq "${whoami_code}" "401" "logout invalidates session"
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

  expect_eq "$(login_status_code "viewer-smoke" "${PREVIOUS_PASSWORD}" "${VIEWER_COOKIE}")" "302" "viewer login"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" "${BASE}/ops")" "403" "viewer ops forbidden"

  local reset_code landing change_reuse_code disable_code disabled_login
  reset_code="$(http_code -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data "$(json_password_payload "${TEST_PASSWORD}")" "${BASE}/ops/api/users/viewer-smoke/reset-password")"
  expect_eq "${reset_code}" "200" "admin reset password"
  local reset_users_json
  reset_users_json="$(curl -fsS -b "${ADMIN_COOKIE}" "${BASE}/ops/api/users")"
  case "${reset_users_json}" in
    *'"username":"viewer-smoke"'*'"mustChangePassword":true'*) pass "admin reset forces next-login password change" ;;
    *) fail "admin reset did not expose mustChangePassword lifecycle state: ${reset_users_json}" ;;
  esac
  landing="$(login_landing "${VIEWER_COOKIE}" "viewer-smoke" "${TEST_PASSWORD}")"
  expect_eq "${landing}" "302:/password/change" "mustChangePassword landing"
  expect_cookie_page_contains "password change auth shell selectors" "${VIEWER_COOKIE}" "${BASE}/password/change" \
    'class="auth-shell"' 'id="themeToggleBtn"' 'name="currentPassword"' 'name="password"' 'name="confirm"' '기본 kr-privacy 정책'
  auth_ui_smoke "password-change" "/password/change" "form.auth-form" "${VIEWER_COOKIE}" 'name="currentPassword"'
  change_reuse_code="$(http_code -b "${VIEWER_COOKIE}" -c "${VIEWER_COOKIE}" \
    -X POST \
    --data-urlencode "currentPassword=${TEST_PASSWORD}" \
    --data-urlencode "password=${TEST_PASSWORD}" \
    --data-urlencode "confirm=${TEST_PASSWORD}" \
    "${BASE}/password/change")"
  expect_eq "${change_reuse_code}" "400" "password history reuse rejected"
  disable_code="$(http_code -b "${ADMIN_COOKIE}" -X POST "${BASE}/ops/api/users/viewer-smoke/disable")"
  expect_eq "${disable_code}" "200" "admin disables viewer"
  disabled_login="$(login_status_code "viewer-smoke" "${TEST_PASSWORD}")"
  expect_eq "${disabled_login}" "401" "disabled user login rejected"

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
  preserve_reset="$(http_code -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data "$(json_password_payload "${PREVIOUS_PASSWORD}")" "${BASE}/ops/api/users/lockout-smoke/reset-password")"
  expect_eq "${preserve_reset}" "200" "users-only save after pending invite"
  expect_auth_store_contains "pending invite preserved across users save" "\"inviteId\": \"${invite_id}\""
  expect_page_contains "invite setup auth shell selectors" "${BASE}/invite/setup?token=${invite_token}" \
    'class="auth-shell"' 'id="themeToggleBtn"' 'name="token"' 'name="password"' 'name="confirm"' '기본 kr-privacy 정책'
  auth_ui_smoke "invite-setup" "/invite/setup?token=${invite_token}" "form.auth-form" "" 'name="token"'
  invite_setup="$(http_code -X POST --data-urlencode "token=${invite_token}" \
    --data-urlencode "password=${TEST_PASSWORD}" --data-urlencode "confirm=${TEST_PASSWORD}" "${BASE}/invite/setup")"
  expect_eq "${invite_setup}" "302" "invite password setup"
  invite_login="$(login_status_code "invite-smoke" "${TEST_PASSWORD}" "${INVITE_COOKIE}")"
  expect_eq "${invite_login}" "302" "invited viewer login"

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
  local rate_request_json rate_request_id reject_code access_requests_json
  request_json="$(curl -fsS -H 'Content-Type: application/json' \
    -X POST --data '{"username":"request-smoke","displayName":"Request Smoke","contact":"client@example.test","viewId":"2","reason":"smoke"}' "${BASE}/client/api/access-requests")"
  request_id="$(printf '%s' "${request_json}" | json_string_field requestId)"
  [[ -n "${request_id}" ]] || fail "access request id missing: ${request_json}"
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
  pending_login="$(login_status_code "request-smoke" "${TEST_PASSWORD}")"
  expect_eq "${pending_login}" "401" "pending request cannot login"
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
  expect_eq "$(header_status_location "${BASE}/")" "302:/setup" "setup required root"
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
  expect_eq "${viewer_landing}" "302:/client/live" "viewer login route"
  local integrator_landing
  integrator_landing="$(login_landing "${INTEGRATOR_COOKIE}" "integrator-smoke" "${TEST_PASSWORD}")"
  expect_eq "${integrator_landing}" "302:/auth/whoami" "integrator login keeps API-only landing"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" "${BASE}/ops")" "403" "viewer ops denied"
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
  vlm_profile_payload='{"schema":"media-server.vlm-profile.v1","id":"vlm-route-smoke","selectedOptionId":"primary-qwen3-vl-8b-instruct","provider":"user-supplied-local-runtime","model":"Qwen/Qwen3-VL-8B-Instruct","runtime":"not-configured","privacyMode":"local-only","cloudOptInAcknowledged":false,"promptProfile":{"id":"event-review-default","version":"v1","language":"ko-en"},"evaluation":{"status":"not-run"},"activation":{"enabled":false,"status":"disabled","fallbackProfileId":"","disabledReason":"evaluation-not-run"},"runtimeContract":{"schema":"media-server.vlm-runtime-opt-in-contract.v1","targetStep":"V210-S01","mode":"disabled","status":"disabled","defaultEnabled":false,"operatorOptInRequired":true,"operatorOptInAcknowledged":false,"runtimeCallAllowed":false,"providerCallAllowed":false,"providerFieldSmokeRequired":false,"failurePolicy":{"missingModel":"blocked-missing-model-no-media-path-failure","invalidOutput":"rejected-invalid-output-no-sidecar-write","timeout":"timeout-no-media-path-failure"},"sideEffects":{"runtimeVlmCallPerformed":false,"cloudProviderApiCalled":false,"modelArtifactDownloaded":false,"modelArtifactBundled":false,"credentialStored":false,"sidecarStored":false,"eventPostPayloadChanged":false,"webrtcDataChannelSchemaChanged":false,"sseMetadataSchemaChanged":false,"wsMetadataSchemaChanged":false,"rtspOrWebrtcMediaPathChanged":false,"viewerClientExposureAdded":false}},"sourceStep":"V210-S01","storageScope":"profile-storage-only","contractInvariants":{"runtimeVlmCallPerformed":false,"sidecarStored":false,"cloudProviderApiCalled":false,"credentialStored":false,"eventPostPayloadChanged":false,"webrtcDataChannelSchemaChanged":false,"sseMetadataSchemaChanged":false,"wsMetadataSchemaChanged":false,"rtspOrWebrtcMediaPathChanged":false,"viewerClientExposureAdded":false}}'
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
  case "${vlm_profile_list_json}" in
    *'"schema":"media-server.vlm-profile-registry.v1"'*'"id":"vlm-route-smoke"'*) pass "VLM profile read lists stored profile" ;;
    *) fail "VLM profile read list mismatch: ${vlm_profile_list_json}" ;;
  esac
  expect_eq "$(http_code -b "${ADMIN_COOKIE}" -X DELETE "${BASE}/ops/api/vlm/profiles/vlm-route-smoke")" "200" "VLM profile delete allowed for admin"
  local operator_source_write_json
  operator_source_write_json="$(curl -fsS -b "${OP_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data '{"sourceId":"30","displayName":"Operator Scope Write","kind":"whep","whepUrl":"https://example.test/operator-scope-write","enabled":true}' \
    "${BASE}/ops/api/sources")"
  case "${operator_source_write_json}" in
    *'"sourceId":"30"'*'"kind":"whep"'*'"whepUrl":"https://example.test/operator-scope-write"'*) pass "AUTH-029 operator source write scope creates source" ;;
    *) fail "AUTH-029 operator source write response missing expected fields: ${operator_source_write_json}" ;;
  esac
  expect_eq "$(http_code -b "${OP_COOKIE}" -H 'Content-Type: application/json' \
    -X PUT --data '{"id":"99","trackingClasses":["person"]}' "${BASE}/lab/analysis/profiles/99")" "200" "AUTH-029 operator rule write scope saves profile"
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
  if printf '%s' "${client_rule_session_id}" | grep -Eq '^client-live-[0-9a-f]{64}$'; then
    pass "client vaRule matching PublishedView source allowed"
  else
    fail "client vaRule matching source failed: ${client_rule_session_json}"
  fi
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" -X DELETE "${BASE}/client/api/views/1/webrtc/session/${client_rule_session_id}")" "200" "client vaRule wrapper delete allowed"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data '{"overlayMode":"va-rule","ruleId":"13"}' "${BASE}/client/api/views/1/webrtc/session")" "400" "client vaRule source mismatch denied"

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

  stop_server
  rm -f "${USERS_FILE}" "${USERS_FILE}.tmp" \
    "${SOURCE_REGISTRY_FILE}" "${SOURCE_REGISTRY_FILE}".tmp* \
    "${VIEWS_REGISTRY_FILE}" "${VIEWS_REGISTRY_FILE}".tmp*
  start_server off lab
  expect_eq "$(header_status_location "${BASE}/")" "302:/ops/home" "auth off root redirects to ops"
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
