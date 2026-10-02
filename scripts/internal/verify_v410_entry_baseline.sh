#!/usr/bin/env bash
# 파일 용도: 기존 v4.1.0 진입 명령을 현행 로컬 릴리즈 문서 검사에 연결하는 호환 진입점.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 과거 단계명·완료 문구·종료 원장을 현재 트리에 재생성하지 않는다.
# 명령 호환만 유지하며 과거 v4.1.0 실행 증거나 제품 기능 PASS를 뜻하지 않는다.
printf '%s\n' 'v4.1.0 진입 명령: 현행 릴리즈 문서 검사로 연결합니다. 과거 실행 증거가 아닙니다.'
exec node "${SCRIPT_DIR}/verify_release_metadata_consistency.mjs" "$@"
