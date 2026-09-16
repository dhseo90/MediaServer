#!/usr/bin/env bash
# FE01~08 제품 파일 증거 검증. 원출력만 보존하고 소유 임시 media/store를 정리한다.
set -euo pipefail
fe_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fe_repo="$(cd "$fe_script/../.." && pwd)"
fe_label="${2:-run}"
[[ "$fe_label" =~ ^[a-zA-Z0-9-]+$ ]] || exit 2
if [[ "${1:-}" != --run ]]; then
  fe_label="${1:-run}"
  [[ "$fe_label" =~ ^[a-zA-Z0-9-]+$ ]] || exit 2
  bash "$fe_script/verify_recording_file_evidence.sh" --run "$fe_label" 2>&1 | tee "$fe_repo/docs/release-artifacts/v4.1.0/s11-preparation-mapping/file-evidence-output-$fe_label.txt"
  exit $?
fi
fe_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
fe_root="$(mktemp -d "$fe_parent/media-server-file-evidence.XXXXXX")"
SECONDS=0
cleanup() {
  local result=$?
  trap - EXIT
  node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];if(p.dirname(r)!==process.argv[2]||!/^media-server-file-evidence\.[A-Za-z0-9]+$/.test(p.basename(r))||f.lstatSync(r).isSymbolicLink())throw Error("cleanup containment");function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}const bytes=size(r);f.rmSync(r,{recursive:true});console.log(`[cleanup] path=${r} bytes=${bytes} removed=${!f.existsSync(r)}`);if(f.existsSync(r))process.exit(1)' "$fe_root" "$fe_parent"
  printf '[elapsed] seconds=%s source=bash-SECONDS\n' "$SECONDS"
  exit "$result"
}
trap cleanup EXIT
printf '[run] label=%s root=%s\n' "$fe_label" "$fe_root"
source "$fe_script/env_common.sh"
media_server_apply_homebrew_gst_env
read -r -a fe_flags <<< "$(pkg-config --cflags --libs gstreamer-1.0 gstreamer-app-1.0 sqlite3 openssl)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$fe_repo/include" \
  -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_SQLITE3=1 -DMEDIA_SERVER_USE_OPENSSL=1 \
  "$fe_script/recording_file_evidence_smoke.cpp" "$fe_repo/src/recording/gstreamer_segment_writer.cpp" \
  "$fe_repo/src/recording/recording_catalog.cpp" "$fe_repo/src/recording/recording_journal.cpp" \
  "$fe_repo/src/recording/recording_finalize_recovery.cpp" "$fe_repo/src/recording/recording_file_evidence.cpp" "$fe_repo/src/recording/recording_media_inspector.cpp" \
  "$fe_repo/src/recording/recording_derived_job.cpp" "$fe_repo/src/recording/recording_derived_job_ready.cpp" \
  "$fe_repo/src/recording/recording_contracts.cpp" "$fe_repo/src/recording/retention_coordinator.cpp" \
  "$fe_repo/src/domain/strict_json.cpp" "${fe_flags[@]}" -o "$fe_root/check"
"$fe_root/check" "$fe_root"
