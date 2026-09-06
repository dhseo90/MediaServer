#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:-}"

case "$MODE" in
  --red-http-baseline)
    # 이름은 TDD 실행 단계 표식이며 성공 조건은 실제 기능 요구인 HTTP 200이다.
    exec node "$SCRIPT_DIR/verify_v410_recording_ui_contract.mjs" --red-status
    ;;
  --harness-self-test)
    exec node "$SCRIPT_DIR/verify_v410_recording_harness.test.mjs" all
    ;;
  "")
    echo "V410-S06-I01~I26 timeline/API verifier requires the S06 smoke binary" >&2
    exit 64
    ;;
  *)
    echo "사용법: verify_v410_recording_timeline.sh [--red-http-baseline|--harness-self-test]" >&2
    exit 64
    ;;
esac
