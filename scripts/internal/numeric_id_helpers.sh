#!/usr/bin/env bash
# 파일 용도: 검증 스크립트에서 임시 numeric id base/offset을 일관되게 만든다.

media_server_assert_numeric_id() {
  local label="$1"
  local value="$2"
  if [[ ! "${value}" =~ ^[0-9]+$ ]]; then
    echo "[fail] ${label} must be numeric: ${value}" >&2
    return 1
  fi
}

media_server_numeric_id_base() {
  local label="$1"
  local override="$2"
  local fallback="$3"
  if [[ -n "${override}" ]]; then
    media_server_assert_numeric_id "${label}" "${override}"
    printf '%s' "${override}"
    return 0
  fi
  media_server_assert_numeric_id "${label}" "${fallback}"
  printf '%s' "${fallback}"
}

media_server_numeric_id_at() {
  local label="$1"
  local base="$2"
  local offset="$3"
  media_server_assert_numeric_id "${label} base" "${base}"
  media_server_assert_numeric_id "${label} offset" "${offset}"
  printf '%s' "$((10#${base} + 10#${offset}))"
}
