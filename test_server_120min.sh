#!/usr/bin/env bash
# 파일 용도: 사용자가 옵션 없이 v3.9.0 server 120분 테스트만 실행한다.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/internal/user_test_launcher_common.sh
source "${ROOT_DIR}/scripts/internal/user_test_launcher_common.sh"
media_server_run_user_test "server-120" "$@"
