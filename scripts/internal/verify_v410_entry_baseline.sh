#!/usr/bin/env bash
# 파일 용도: v4.1.0 release target과 cut 직전 v4.0.0 공개 baseline의 분리를 검증한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
EXPECTED_VERSION="4.1.0"
CURRENT_ROADMAP="v4.1.0 Recording Foundation"
RELEASE_TARGET_TAG="v4.1.0"
LATEST_PUBLISHED_TAG="v4.0.0"
LATEST_PUBLISHED_BASELINE="v4.0.0 Local Operations Policy and Stabilization"

pass_count=0
fail_count=0

check_literal() {
  local label="$1"
  local path="$2"
  local literal="$3"
  if grep -Fq -- "${literal}" "${ROOT_DIR}/${path}"; then
    echo "[PASS] ${label}"
    pass_count=$((pass_count + 1))
  else
    echo "[FAIL] ${label}: ${path} missing ${literal}" >&2
    fail_count=$((fail_count + 1))
  fi
}

version="$(tr -d '[:space:]' < "${ROOT_DIR}/VERSION")"
if [[ "${version}" == "${EXPECTED_VERSION}" ]]; then
  echo "[PASS] VERSION=${EXPECTED_VERSION}"
  pass_count=$((pass_count + 1))
else
  echo "[FAIL] VERSION must be ${EXPECTED_VERSION}, got ${version}" >&2
  fail_count=$((fail_count + 1))
fi

branch="$(git -C "${ROOT_DIR}" symbolic-ref --quiet --short HEAD || true)"
if [[ -z "${branch}" || "${branch}" == "v4.1.0" || "${branch}" == "main" ]]; then
  echo "[PASS] branch context=${branch:-detached-ci}"
  pass_count=$((pass_count + 1))
else
  echo "[FAIL] branch must be v4.1.0, main, or detached CI; got ${branch}" >&2
  fail_count=$((fail_count + 1))
fi

check_literal "CMake source version" "CMakeLists.txt" "project(media_server VERSION ${EXPECTED_VERSION} LANGUAGES CXX)"
check_literal "README source version" "README.md" "현재 소스 버전: \`${EXPECTED_VERSION}\`"
check_literal "README current roadmap" "README.md" "현재 source roadmap: \`${CURRENT_ROADMAP}\`"
check_literal "README live latest" "README.md" "Live GitHub Latest: [Releases/latest]"
check_literal "README release target" "README.md" "현재 release target: [${RELEASE_TARGET_TAG}]"
check_literal "README prior baseline" "README.md" "직전 공개 baseline: ${LATEST_PUBLISHED_BASELINE}"
check_literal "README local readiness" "README.md" "S11 제품 검증과 B14 공개 준비 완료"
check_literal "English README source version" "README.en.md" "Current source version: \`${EXPECTED_VERSION}\`"
check_literal "English README current roadmap" "README.en.md" "Current source roadmap: \`${CURRENT_ROADMAP}\`"
check_literal "English README release target" "README.en.md" "Current release target: [${RELEASE_TARGET_TAG}]"
check_literal "English README local readiness" "README.en.md" "S11 product validation, and B14 public readiness are complete"
check_literal "docs index source version" "docs/README.md" "현재 소스 버전: \`${EXPECTED_VERSION}\`"
check_literal "docs index current roadmap" "docs/README.md" "현재 source roadmap: \`${CURRENT_ROADMAP}\`"
check_literal "docs index release notes" "docs/README.md" "[release-notes-v4.1.0.md](release-notes-v4.1.0.md)"
check_literal "English docs index source version" "docs/en/README.md" "Current source version: \`${EXPECTED_VERSION}\`"
check_literal "English docs index current roadmap" "docs/en/README.md" "Current source roadmap: \`${CURRENT_ROADMAP}\`"
check_literal "versioning policy source version" "docs/versioning-policy.md" "현재 소스 버전: \`${EXPECTED_VERSION}\`"
check_literal "versioning policy current roadmap" "docs/versioning-policy.md" "현재 source roadmap: \`${CURRENT_ROADMAP}\`"
check_literal "versioning policy release target" "docs/versioning-policy.md" "현재 release target: \`${RELEASE_TARGET_TAG}\`"
check_literal "release policy source version" "docs/release-policy.md" "현재 소스 버전: \`${EXPECTED_VERSION}\`"
check_literal "release policy current roadmap" "docs/release-policy.md" "현재 source roadmap은 \`${CURRENT_ROADMAP}\`입니다."
check_literal "release policy release target" "docs/release-policy.md" "현재 release target: \`${RELEASE_TARGET_TAG}\`"
check_literal "public review source version" "docs/public-repo-final-review.md" "현재 소스 버전: \`${EXPECTED_VERSION}\`"
check_literal "public review local readiness" "docs/public-repo-final-review.md" "S11 제품 검증과 B14 공개 준비는 완료"
check_literal "UI guide release target" "docs/ui-guide.md" "현재 소스 버전과 release target은 \`${EXPECTED_VERSION}\`입니다."
check_literal "UI assets source version" "docs/assets/ui/README.md" "현재 source tree는 \`v${EXPECTED_VERSION}\`"
check_literal "UI assets release target" "docs/assets/ui/README.md" "릴리즈 목표는 \`${CURRENT_ROADMAP}\`"
check_literal "UI asset manifest source version" "config/docs_ui_assets.json" '"sourceVersion": "4.1.0"'
check_literal "UI asset manifest release target" "config/docs_ui_assets.json" '"releaseTarget": "v4.1.0"'
check_literal "UI asset manifest published baseline" "config/docs_ui_assets.json" '"publishedRelease": "v4.0.0"'
check_literal "UI asset verifier published baseline" "scripts/internal/verify_docs_ui_assets.mjs" 'const latestPublishedTag = "v4.0.0";'
check_literal "backlog source version" "docs/development-backlog.md" "현재 소스 버전: \`${EXPECTED_VERSION}\`"
check_literal "backlog current roadmap" "docs/development-backlog.md" "## 현재 source roadmap: ${CURRENT_ROADMAP}"
check_literal "backlog release target" "docs/development-backlog.md" "현재 release target: \`${RELEASE_TARGET_TAG}\`"
check_literal "backlog local readiness" "docs/development-backlog.md" "제품 검증·B14 공개 준비 완료"
check_literal "roadmap source version" "docs/v410-v49-recording-search-roadmap.md" "현재 소스 버전: \`${EXPECTED_VERSION}\`"
check_literal "roadmap S00 status" "docs/v410-v49-recording-search-roadmap.md" "V410-S00 완료"
check_literal "cut-prior published baseline remains v4.0.0" "docs/README.md" "직전 공개 baseline: \`${LATEST_PUBLISHED_BASELINE}\`"
check_literal "release evidence exists" "docs/release-evidence-v410.md" "V410-S00"
check_literal "research gate dispatch" "server.sh" "verify-v410-research-gate)"
check_literal "entry baseline dispatch" "server.sh" "verify-v410-entry-baseline)"
check_literal "release metadata current tag" "scripts/internal/verify_release_metadata_consistency.mjs" 'assert(currentTag === "v4.1.0"'
check_literal "release metadata target tag" "scripts/internal/verify_release_metadata_consistency.mjs" 'const releaseTargetTag = currentTag;'
check_literal "release metadata current roadmap" "scripts/internal/verify_release_metadata_consistency.mjs" 'const currentRoadmap = "v4.1.0 Recording Foundation";'

echo "== v4.1.0 entry baseline summary =="
echo "pass=${pass_count} fail=${fail_count}"
if (( fail_count > 0 )); then
  exit 1
fi
