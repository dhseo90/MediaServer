#!/usr/bin/env bash
# 파일 용도: 녹화 타임라인 조회 및 HTTP 시험 자료 준비.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:-}"

case "$MODE" in
  --read-model|--seed-http|--seed-ui)
    # 부분 검증 모드다. HTTP/인증/Range/UI 전체 PASS를 의미하지 않는다.
    ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
    RUN_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/media-server-s06-read.XXXXXX")"
    RUN_ROOT="$(cd "$RUN_ROOT" && pwd -P)"
    READ_MODEL_COMPLETED=0
    cleanup_read_model() {
      local result=$?
      if [[ "$READ_MODEL_COMPLETED" != 1 && "$result" == 0 ]]; then result=1; fi
      trap - EXIT
      du -sk "$RUN_ROOT"
      rm -rf -- "$RUN_ROOT" || result=1
      if [[ -e "$RUN_ROOT" || -L "$RUN_ROOT" ]]; then
        echo "[fail] read-model 임시 root 삭제 실패" >&2
        result=1
      else
        echo "[pass] read-model 임시 root 삭제 확인: $RUN_ROOT"
      fi
      exit "$result"
    }
    trap cleanup_read_model EXIT
    SQLITE_CFLAGS=()
    SQLITE_LIBS=(-lsqlite3)
    CRYPTO_FLAGS=()
    SEED_FLAGS=()
    if [[ "$MODE" == "--seed-http" || "$MODE" == "--seed-ui" ]]; then
      read -r -a CRYPTO_FLAGS <<<"$(pkg-config --cflags --libs openssl)"
      SEED_FLAGS=(-DRECORDING_HTTP_SEED=1)
    fi
    if command -v pkg-config >/dev/null 2>&1 && pkg-config --exists sqlite3; then
      read -r -a SQLITE_CFLAGS <<<"$(pkg-config --cflags sqlite3)"
      read -r -a SQLITE_LIBS <<<"$(pkg-config --libs sqlite3)"
    fi
    "${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$ROOT_DIR/include" \
      ${SQLITE_CFLAGS[*]-} ${SEED_FLAGS[*]-} -DMEDIA_SERVER_USE_SQLITE3=1 \
      "$SCRIPT_DIR/recording_timeline_smoke.cpp" \
      "$ROOT_DIR/src/recording/recording_timeline_projection.cpp" \
      "$ROOT_DIR/src/recording/recording_read_service.cpp" \
      "$ROOT_DIR/src/ingress/recording_application_service.cpp" \
      "$ROOT_DIR/src/recording/recording_journal.cpp" \
      "$ROOT_DIR/src/recording/recording_catalog.cpp" \
 "$ROOT_DIR/src/recording/recording_finalize_recovery.cpp" \
 "$ROOT_DIR/src/recording/recording_media_inspector.cpp" \
      "$ROOT_DIR/src/recording/retention_coordinator.cpp" \
      "$ROOT_DIR/src/recording/recording_derived_job.cpp" "$ROOT_DIR/src/recording/recording_derived_job_ready.cpp" "$ROOT_DIR/src/recording/recording_contracts.cpp" \
      "$ROOT_DIR/src/domain/strict_json.cpp" \
      ${SQLITE_LIBS[*]-} ${CRYPTO_FLAGS[*]-} -o "$RUN_ROOT/read-smoke"
    if [[ "$MODE" == "--seed-http" || "$MODE" == "--seed-ui" ]]; then
      "$RUN_ROOT/read-smoke" "$2" "$MODE" "$3"
    else
      "$RUN_ROOT/read-smoke" "$RUN_ROOT/fixture"
      "$RUN_ROOT/read-smoke" "$RUN_ROOT/sqlite-fixture" --sqlite
    fi
    READ_MODEL_COMPLETED=1
    ;;
  --red-http-baseline)
    # 이름은 TDD 실행 단계 표식이며 성공 조건은 실제 기능 요구인 HTTP 200이다.
    exec node "$SCRIPT_DIR/verify_v410_recording_ui_contract.mjs" --red-status
    ;;
  --harness-self-test)
    exec node "$SCRIPT_DIR/verify_v410_recording_harness.test.mjs" all
    ;;
  "")
    # 미설정 인증값은 실행 전에 거부한다. 값 자체는 출력하거나 저장하지 않는다.
    for suffix in TEST_PASSWORD PREVIOUS_PASSWORD SECOND_PREVIOUS_PASSWORD WRONG_PASSWORD_ONE WRONG_PASSWORD_TWO; do
      variable="MEDIA_SERVER_VERIFY_AUTH_${suffix}"
      if [[ -z "${!variable:-}" ]]; then
        echo "[fail] 필수 인증 환경변수 미설정: ${variable}" >&2
        exit 1
      fi
    done
    bash "$0" --read-model
    node "$SCRIPT_DIR/verify_v410_recording_ui_contract.mjs" --http-api
    node "$SCRIPT_DIR/verify_v410_recording_ui_contract.mjs" --http-auth
    node "$SCRIPT_DIR/verify_v410_recording_ui_contract.mjs" --http-lifecycle
    echo "[pass] S06 조회/API/인증/전송 수명 검증 완료. 실제 UI·장시간 테스트는 미실행."
    ;;
  *)
    echo "사용법: verify_v410_recording_timeline.sh [--read-model|--red-http-baseline|--harness-self-test|--seed-http ROOT MEDIA|--seed-ui ROOT MEDIA]" >&2
    exit 64
    ;;
esac
