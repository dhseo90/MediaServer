#!/usr/bin/env bash
# 파일 용도: GStreamer 환경·캐시·background 전달을 격리 fixture로 검증한다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
case "${1:-}" in
  -h|--help)
    echo "사용법: ./server.sh verify-gst-environment"
    echo "격리 fixture 검증입니다. 실제 플랫폼·미디어 검증을 대체하지 않습니다."
    exit 0 ;;
  '') ;;
  *) echo "지원하지 않는 인수: $*" >&2; exit 2 ;;
esac
exec python3 "${SCRIPT_DIR}/gst_environment_test.py"
