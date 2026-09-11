#!/usr/bin/env bash
# 파일 용도: 명시120분 외 입력은 환경·임시root·서버 생성 전에 거부한다.
set -euo pipefail
if [[ $# != 2 || "${1:-}" != --duration-minutes || "${2:-}" != 120 ]]; then
  echo 'usage: verify-v410-recording-longrun --duration-minutes 120' >&2
  exit 2
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "${SCRIPT_DIR}/verify_v410_recording_foundation.sh" --app-longrun --duration-minutes 120
