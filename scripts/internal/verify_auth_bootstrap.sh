#!/usr/bin/env bash
# 파일 용도: 최초 admin setup, password policy, login/logout/session smoke를 실행한다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/verify_auth_workflow.sh" bootstrap "$@"
