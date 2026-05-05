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
ADMIN_COOKIE="${TMP_DIR}/media_server_${RUN_ID}_admin.cookie"
OP_COOKIE="${TMP_DIR}/media_server_${RUN_ID}_operator.cookie"
VIEWER_COOKIE="${TMP_DIR}/media_server_${RUN_ID}_viewer.cookie"
INVITE_COOKIE="${TMP_DIR}/media_server_${RUN_ID}_invite.cookie"
REQUEST_COOKIE="${TMP_DIR}/media_server_${RUN_ID}_request.cookie"
LOG_FILE="${TMP_DIR}/media_server_${RUN_ID}.log"
SERVER_PID=""
BASE=""

pass_count=0

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
    wait "${SERVER_PID}" >/dev/null 2>&1 || true
  fi
  rm -f "${USERS_FILE}" "${USERS_FILE}.tmp" \
    "${ADMIN_COOKIE}" "${OP_COOKIE}" "${VIEWER_COOKIE}" \
    "${INVITE_COOKIE}" "${REQUEST_COOKIE}" "${LOG_FILE}"
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

http_code() {
  curl -sS -o /dev/null -w "%{http_code}" "$@"
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
    --visual-widths "${MEDIA_SERVER_VERIFY_AUTH_VISUAL_WIDTHS:-390,760}"
    --debug-port-base "${MEDIA_SERVER_VERIFY_AUTH_DEBUG_PORT_BASE:-9820}"
  )
  if truthy "${MEDIA_SERVER_VERIFY_AUTH_SCREENSHOTS:-0}"; then
    args+=(--screenshots)
  fi
  node "${args[@]}"
  pass "${label} auth visual smoke"
}

json_string_field() {
  local field="$1"
  sed -n "s/.*\"${field}\":\"\\([^\"]*\\)\".*/\\1/p"
}

setup_admin() {
  local weak_code strong_code after_setup
  weak_code="$(http_code -X POST -d 'username=admin&password=weak&confirm=weak' "${BASE}/setup")"
  expect_eq "${weak_code}" "400" "weak admin password rejected"
  strong_code="$(http_code -X POST -d 'username=admin&password=Strong!91&confirm=Strong!91' "${BASE}/setup")"
  expect_eq "${strong_code}" "302" "initial admin password setup"
  after_setup="$(header_status_location "${BASE}/setup")"
  expect_eq "${after_setup}" "302:/login" "setup blocked after completion"
}

login_admin() {
  local landing whoami
  landing="$(curl -sS -c "${ADMIN_COOKIE}" -o /dev/null -D - \
    -X POST -d 'username=admin&password=Strong!91' "${BASE}/login" |
    tr -d '\r' | awk 'BEGIN{s=""; l=""} /^HTTP/{s=$2} /^Location:/{l=$2} END{print s ":" l}')"
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
    'class="auth-shell"' 'id="request-form"' 'name="username"' 'name="contact"' 'name="reason"' 'window.MediaServerUi'
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
  login_admin

  local viewer_json
  viewer_json="$(create_user '{"username":"viewer-smoke","displayName":"Viewer Smoke","role":"viewer","viewId":"view-a","password":"Viewer!91","enabled":true,"mustChangePassword":false}')"
  case "${viewer_json}" in
    *'view:read:view-a'*) pass "viewer view scope assigned" ;;
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

  expect_eq "$(http_code -c "${VIEWER_COOKIE}" -X POST -d 'username=viewer-smoke&password=Viewer!91' "${BASE}/login")" "302" "viewer login"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" "${BASE}/ops")" "403" "viewer ops forbidden"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" "${BASE}/lab")" "403" "viewer lab forbidden"

  local reset_code landing change_reuse_code disable_code disabled_login
  reset_code="$(http_code -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data '{"password":"Reset!91"}' "${BASE}/ops/api/users/viewer-smoke/reset-password")"
  expect_eq "${reset_code}" "200" "admin reset password"
  landing="$(curl -sS -c "${VIEWER_COOKIE}" -o /dev/null -D - \
    -X POST -d 'username=viewer-smoke&password=Reset!91' "${BASE}/login" |
    tr -d '\r' | awk 'BEGIN{s=""; l=""} /^HTTP/{s=$2} /^Location:/{l=$2} END{print s ":" l}')"
  expect_eq "${landing}" "302:/password/change" "mustChangePassword landing"
  expect_cookie_page_contains "password change auth shell selectors" "${VIEWER_COOKIE}" "${BASE}/password/change" \
    'class="auth-shell"' 'id="themeToggleBtn"' 'name="currentPassword"' 'name="password"' 'name="confirm"' '기본 kr-privacy 정책'
  auth_ui_smoke "password-change" "/password/change" "form.auth-form" "${VIEWER_COOKIE}" 'name="currentPassword"'
  change_reuse_code="$(http_code -b "${VIEWER_COOKIE}" -c "${VIEWER_COOKIE}" \
    -X POST -d 'currentPassword=Reset!91&password=Reset!91&confirm=Reset!91' "${BASE}/password/change")"
  expect_eq "${change_reuse_code}" "400" "password history reuse rejected"
  disable_code="$(http_code -b "${ADMIN_COOKIE}" -X POST "${BASE}/ops/api/users/viewer-smoke/disable")"
  expect_eq "${disable_code}" "200" "admin disables viewer"
  disabled_login="$(http_code -X POST -d 'username=viewer-smoke&password=Reset!91' "${BASE}/login")"
  expect_eq "${disabled_login}" "401" "disabled user login rejected"

  create_user '{"username":"lockout-smoke","displayName":"Lockout Smoke","role":"viewer","viewId":"view-a","password":"Lockout!91","enabled":true,"mustChangePassword":false}' >/dev/null
  http_code -X POST -d 'username=lockout-smoke&password=Wrong!91' "${BASE}/login" >/dev/null || true
  http_code -X POST -d 'username=lockout-smoke&password=Wrong!92' "${BASE}/login" >/dev/null || true
  if grep -q '"lockedUntil": "[^"]' "${USERS_FILE}"; then
    pass "login lockout stored"
  else
    fail "login lockout was not stored"
  fi

  local invite_json invite_token invite_setup invite_login
  invite_json="$(curl -fsS -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data '{"username":"invite-smoke","displayName":"Invite Smoke","role":"viewer","viewId":"view-a"}' "${BASE}/ops/api/invites")"
  invite_token="$(printf '%s' "${invite_json}" | json_string_field token)"
  [[ -n "${invite_token}" ]] || fail "invite token missing: ${invite_json}"
  pass "invite token issued once"
  expect_page_contains "invite setup auth shell selectors" "${BASE}/invite/setup?token=${invite_token}" \
    'class="auth-shell"' 'id="themeToggleBtn"' 'name="token"' 'name="password"' 'name="confirm"' '기본 kr-privacy 정책'
  auth_ui_smoke "invite-setup" "/invite/setup?token=${invite_token}" "form.auth-form" "" 'name="token"'
  invite_setup="$(http_code -X POST --data-urlencode "token=${invite_token}" \
    --data-urlencode 'password=Invite!91' --data-urlencode 'confirm=Invite!91' "${BASE}/invite/setup")"
  expect_eq "${invite_setup}" "302" "invite password setup"
  invite_login="$(http_code -c "${INVITE_COOKIE}" -X POST -d 'username=invite-smoke&password=Invite!91' "${BASE}/login")"
  expect_eq "${invite_login}" "302" "invited viewer login"

  local request_json request_id pending_login approve_json approve_token request_setup request_login
  request_json="$(curl -fsS -H 'Content-Type: application/json' \
    -X POST --data '{"username":"request-smoke","displayName":"Request Smoke","contact":"client@example.test","viewId":"view-b","reason":"smoke"}' "${BASE}/client/api/access-requests")"
  request_id="$(printf '%s' "${request_json}" | json_string_field requestId)"
  [[ -n "${request_id}" ]] || fail "access request id missing: ${request_json}"
  pending_login="$(http_code -X POST -d 'username=request-smoke&password=Request!91' "${BASE}/login")"
  expect_eq "${pending_login}" "401" "pending request cannot login"
  approve_json="$(curl -fsS -b "${ADMIN_COOKIE}" -H 'Content-Type: application/json' \
    -X POST --data '{"viewId":"view-b"}' "${BASE}/ops/api/access-requests/${request_id}/approve")"
  approve_token="$(printf '%s' "${approve_json}" | json_string_field token)"
  [[ -n "${approve_token}" ]] || fail "approve invite token missing: ${approve_json}"
  request_setup="$(http_code -X POST --data-urlencode "token=${approve_token}" \
    --data-urlencode 'password=Request!91' --data-urlencode 'confirm=Request!91' "${BASE}/invite/setup")"
  expect_eq "${request_setup}" "302" "approved request password setup"
  request_login="$(http_code -c "${REQUEST_COOKIE}" -X POST -d 'username=request-smoke&password=Request!91' "${BASE}/login")"
  expect_eq "${request_login}" "302" "approved request viewer login"
}

run_routes() {
  start_server auto lab
  expect_eq "$(header_status_location "${BASE}/")" "302:/setup" "setup required root"
  setup_admin
  expect_eq "$(header_status_location "${BASE}/")" "302:/login" "logout root"
  login_admin
  expect_eq "$(header_status_location -b "${ADMIN_COOKIE}" "${BASE}/")" "302:/ops/home" "admin root"
  create_user '{"username":"operator-smoke","displayName":"Operator Smoke","role":"operator","password":"Operator!91","enabled":true,"mustChangePassword":false}' >/dev/null
  create_user '{"username":"viewer-smoke","displayName":"Viewer Smoke","role":"viewer","viewId":"view-a","password":"Viewer!91","enabled":true,"mustChangePassword":false}' >/dev/null
  local op_landing viewer_landing
  op_landing="$(curl -sS -c "${OP_COOKIE}" -o /dev/null -D - \
    -X POST -d 'username=operator-smoke&password=Operator!91' "${BASE}/login" |
    tr -d '\r' | awk 'BEGIN{s=""; l=""} /^HTTP/{s=$2} /^Location:/{l=$2} END{print s ":" l}')"
  expect_eq "${op_landing}" "302:/ops/home" "operator login route"
  viewer_landing="$(curl -sS -c "${VIEWER_COOKIE}" -o /dev/null -D - \
    -X POST -d 'username=viewer-smoke&password=Viewer!91' "${BASE}/login" |
    tr -d '\r' | awk 'BEGIN{s=""; l=""} /^HTTP/{s=$2} /^Location:/{l=$2} END{print s ":" l}')"
  expect_eq "${viewer_landing}" "302:/client/live" "viewer login route"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" "${BASE}/ops")" "403" "viewer ops denied"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" "${BASE}/lab")" "403" "viewer lab denied"
  expect_eq "$(http_code -X POST "${BASE}/webrtc/session?file=sample_h264.mp4")" "401" "unauth generic WebRTC denied"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" -X POST "${BASE}/webrtc/session?file=sample_h264.mp4")" "403" "viewer generic WebRTC denied"
  expect_eq "$(http_code -X POST "${BASE}/whep?file=sample_h264.mp4")" "401" "unauth WHEP denied"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" -X POST "${BASE}/whep?file=sample_h264.mp4")" "403" "viewer WHEP denied"
  expect_eq "$(http_code -X POST --data 'v=0' "${BASE}/whip/publish?sourceId=auth-smoke")" "401" "unauth WHIP publish denied"
  expect_eq "$(http_code -b "${VIEWER_COOKIE}" -X POST --data 'v=0' "${BASE}/whip/publish?sourceId=auth-smoke")" "403" "viewer WHIP publish denied"
  stop_server
  rm -f "${USERS_FILE}" "${USERS_FILE}.tmp"
  start_server off lab
  expect_eq "$(header_status_location "${BASE}/")" "302:/lab" "auth off lab root"
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
