#!/usr/bin/env bash
# 파일 용도: v4.1.0 녹화 기반의 공개 자료 provenance와 IP clean-room 게이트를 검증한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
OPEN_SOURCE_REVIEW="${ROOT_DIR}/docs/research/v410-recording-storage-open-source-review.md"
IP_RISK_GATE="${ROOT_DIR}/docs/research/v410-recording-ip-risk-gate.md"

fail() {
  echo "[FAIL] $*" >&2
  exit 1
}

require_file() {
  local path="$1"
  [[ -f "${path}" ]] || fail "v4.1 recording research gate document missing: ${path#${ROOT_DIR}/}"
}

require_literal() {
  local path="$1"
  local literal="$2"
  grep -Fq -- "${literal}" "${path}" || fail "required research gate field missing in ${path#${ROOT_DIR}/}: ${literal}"
}

source_block() {
  local source_id="$1"
  awk -v heading="## sourceId: ${source_id}" '
    $0 == heading { capture = 1; next }
    capture && /^## / { exit }
    capture { print }
  ' "${OPEN_SOURCE_REVIEW}"
}

require_source() {
  local source_id="$1"
  local block
  block="$(source_block "${source_id}")"
  [[ -n "${block}" ]] || fail "source record missing: ${source_id}"

  for field in url revision checkedAt license referenceScope adoptedSemantics notAdopted implementationReference; do
    grep -Eq "^- ${field}: .+" <<<"${block}" || fail "${source_id} missing non-empty field: ${field}"
  done
  for field in codeCopied runtimeDependency submodule; do
    grep -Fq -- "- ${field}: false" <<<"${block}" || fail "${source_id} must set ${field}=false"
  done
}

approach_block() {
  local approach_id="$1"
  awk -v heading="## approachId: ${approach_id}" '
    $0 == heading { capture = 1; next }
    capture && /^## / { exit }
    capture { print }
  ' "${IP_RISK_GATE}"
}

require_approach() {
  local approach_id="$1"
  local block
  block="$(approach_block "${approach_id}")"
  [[ -n "${block}" ]] || fail "IP approach decision missing: ${approach_id}"
  grep -Eq '^- decision: (허용|재설계|보류)$' <<<"${block}" || fail "${approach_id} decision must be 허용/재설계/보류"
  for field in functionality decisionBasis cleanRoomAction; do
    grep -Eq "^- ${field}: .+" <<<"${block}" || fail "${approach_id} missing non-empty field: ${field}"
  done
}

require_file "${OPEN_SOURCE_REVIEW}"
require_file "${IP_RISK_GATE}"

for source_id in \
  gstreamer-splitmuxsink \
  onvif-profile-g \
  onvif-profile-m \
  onvif-analytics \
  sqlite-transactional-storage \
  mylocalllm-vatester-vector-search-cpp \
  varulelens \
  shared-gpt-conversation; do
  require_source "${source_id}"
done

for literal in \
  '- reviewPolicy: public-standard-and-license-metadata-only' \
  '- repositoryPolicy: original-repositories-unchanged' \
  '- implementationPolicy: independent-clean-room-reimplementation' \
  '- incompatibleOrUnknownLicensePolicy: implementation-reference-excluded'; do
  require_literal "${OPEN_SOURCE_REVIEW}" "${literal}"
done

for literal in \
  '- screeningRegions: KR, US, EP, PCT' \
  '- legalBoundary: not-legal-opinion-not-fto' \
  '- specificPatentDetailsConsumed: false' \
  '- patentNumberCopied: false' \
  '- claimTextCopied: false' \
  '- implementationDetailCopied: false' \
  '- cleanRoomConfirmed: true'; do
  require_literal "${IP_RISK_GATE}" "${literal}"
done

for approach_id in \
  segment-keyframe-rotation \
  atomic-fragment-finalize \
  oldest-first-quota-retention \
  event-overlap-derived-clip \
  future-semantic-search-techniques; do
  require_approach "${approach_id}"
done

echo "[PASS] v4.1 recording research gate"
echo "- source records: 8"
echo "- IP approach decisions: 5"
echo "- specific patent details consumed: false"
echo "- legal boundary: not legal opinion / not FTO"
