#!/usr/bin/env bash
# 파일 용도: admin user management, viewer 제한 scope, lockout, invite/request smoke를 실행한다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/verify_auth_workflow.sh" users "$@"
