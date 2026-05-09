#!/usr/bin/env bash
# 파일 용도: 운영 diagnostics bundle 생성물과 config preset 파일 기준을 검증한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
HTTP_BASE="${MEDIA_SERVER_VERIFY_OPS_BUNDLE_HTTP_BASE:-http://127.0.0.1:8081}"
OUTPUT_ROOT="${TMPDIR:-/tmp}/media_server_ops_bundle_verify_$(date +%s)_$$"
OUTPUT_DIR="${OUTPUT_ROOT}/bundle"
pass_count=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --http-base)
      HTTP_BASE="${2:-}"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="${2:-}"
      shift 2
      ;;
    *)
      echo "unknown option: $1" >&2
      exit 2
      ;;
  esac
done

pass() {
  pass_count=$((pass_count + 1))
  echo "[pass] $*"
}

fail() {
  echo "[fail] $*" >&2
  exit 1
}

require_file() {
  local path="$1"
  [[ -f "${path}" ]] || fail "missing file: ${path}"
  pass "file exists: $(basename "${path}")"
}

rm -rf "${OUTPUT_ROOT}"
mkdir -p "$(dirname "${OUTPUT_DIR}")"

"${SCRIPT_DIR}/collect_ops_bundle.sh" --http-base "${HTTP_BASE}" --output-dir "${OUTPUT_DIR}" >/tmp/media_server_ops_bundle_verify.out
cat /tmp/media_server_ops_bundle_verify.out

require_file "${OUTPUT_DIR}/manifest.json"
require_file "${OUTPUT_DIR}/health.json"
require_file "${OUTPUT_DIR}/check_server.txt"
require_file "${OUTPUT_DIR}/diagnose.txt"
require_file "${OUTPUT_DIR}/log_tail.txt"
require_file "${OUTPUT_DIR}/runtime_files.txt"
require_file "${OUTPUT_DIR}/config_redacted.env"
require_file "${OUTPUT_DIR}.tar.gz"

grep -Fq '"schema": "media-server.ops-diagnostics-bundle.v1"' "${OUTPUT_DIR}/manifest.json" ||
  fail "manifest schema mismatch"
pass "manifest schema"

grep -Fq '"status":"ok"' "${OUTPUT_DIR}/health.json" ||
  grep -Fq '"ok"' "${OUTPUT_DIR}/health.json" ||
  fail "health payload does not look healthy"
pass "health payload captured"

if grep -Eiq 'PASSWORD|TOKEN|SECRET|KEY|COOKIE' "${OUTPUT_DIR}/config_redacted.env"; then
  if grep -Ei '^[^#=]*(PASSWORD|TOKEN|SECRET|KEY|COOKIE)[^=]*=' "${OUTPUT_DIR}/config_redacted.env" |
    grep -Ev '=<redacted>$' >/dev/null; then
    fail "redacted env may contain unredacted sensitive value"
  fi
fi
pass "sensitive env redaction"

for preset in dev staging production; do
  file="${ROOT_DIR}/config/presets/${preset}.env.example"
  require_file "${file}"
  grep -Fq 'MEDIA_SERVER_AUTH_MODE=' "${file}" || fail "${file} missing MEDIA_SERVER_AUTH_MODE"
done
pass "config presets include auth mode"

rm -rf "${OUTPUT_ROOT}"
rm -f /tmp/media_server_ops_bundle_verify.out

echo
echo "== Ops diagnostics bundle 검증 요약 =="
echo "- 통과: ${pass_count}"
echo "- 실패: 0"
