#!/usr/bin/env bash
# 파일 용도: v4.5.0 녹화·검색·증거·A 혼합120분 및 단기 준비 관측. 짧은 실행은 장시간 PASS가 아니다.
set -euo pipefail
case "$*" in
  --app-observe|--frame-diagnostic|"--duration-minutes 120") ;;
  *) echo 'usage: verify_v450_recording_a_mixed.sh --app-observe | --frame-diagnostic | --duration-minutes 120' >&2; exit 2 ;;
esac
observer_driver="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
observer_script="$observer_driver"
observer_repo="$(cd "$observer_script/../.." && pwd)"
observer_parent="${MEDIA_SERVER_TEST_ARTIFACT_ROOT:?owned parent run required}"
[[ -d "$observer_parent" && ! -L "$observer_parent" && "$observer_parent" = /private/tmp/media-server-* ]] || exit 2
observer_receipts="$observer_parent/receipts"
mkdir -m 700 "$observer_receipts"
export MEDIA_SERVER_RECORDING_RECEIPT_DIR="$observer_receipts"
export MEDIA_SERVER_TEST_OUTPUT_DIR="$observer_parent/artifacts"
observer_run="$(mktemp -d "$observer_parent/media-server-current-observer-XXXXXX")"
observer_run="$(cd "$observer_run" && pwd -P)"
chmod 700 "$observer_run"
node -e 'const f=require("fs"),s=f.lstatSync(process.argv[1]);console.log("[owned-root] "+JSON.stringify({root:process.argv[1],dev:s.dev,ino:s.ino,uid:s.uid}));' "$observer_run"
# 원출력 보존 전에는 성공한 root도 삭제하지 않는다. 종료 후 메인이 정제/보존/소유권 대조 뒤 정리한다.
trap 'code=$?; printf "[wrapper-exit] %s\n" "$code"; exit "$code"' EXIT
export MEDIA_SERVER_GST_CACHE_DIR="$observer_run/gst-cache" MEDIA_SERVER_GST_PLUGIN_PROFILE=headless
export GST_REGISTRY="$observer_run/registry.bin" GST_REGISTRY_1_0="$observer_run/registry.bin"
source "$observer_script/env_common.sh"
media_server_apply_homebrew_gst_env
observer_build="$observer_repo/build-gst-onnx"
node - "$observer_repo" "$observer_build" <<'NODE'
const fs=require('fs'),path=require('path'),root=process.argv[2],build=process.argv[3];
const stamp=fs.statSync(path.join(build,'libmedia_server_runtime.a')).mtimeMs;
function check(dir){for(const name of fs.readdirSync(dir)){const p=path.join(dir,name),s=fs.statSync(p);if(s.isDirectory())check(p);else if(/\.(h|hpp|cpp)$/.test(name)&&s.mtimeMs>stamp)throw Error('stale-product-build');}}check(path.join(root,'include/recording'));check(path.join(root,'src/recording'));
NODE
read -r -a observer_link < "$observer_build/CMakeFiles/media_server.dir/link.txt"
observer_libs=();observer_found=0
for token in "${observer_link[@]}";do
  if [[ "$token" == libmedia_server_runtime.a ]];then observer_found=1;observer_libs+=("$observer_build/$token");continue;fi
  if ((observer_found));then observer_libs+=("$token");fi
done
test "$observer_found" = 1
read -r -a observer_flags <<<"$(pkg-config --cflags gstreamer-app-1.0 openssl sqlite3)"
node --input-type=module - "$observer_repo" "$observer_run/catalog-instrumented.cpp" <<'NODE'
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const [repo,destination]=process.argv.slice(2),{instrumentCatalog}=await import(pathToFileURL(path.join(repo,'scripts/internal/recording_archive_diagnostic_profile.mjs'))),source=fs.readFileSync(path.join(repo,'src/recording/recording_catalog.cpp'),'utf8');
fs.writeFileSync(destination,instrumentCatalog(source),{flag:'wx',mode:0o600});
NODE
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$observer_repo/include" -I"$observer_repo/src/recording" "${observer_flags[@]}" \
  -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_SQLITE3=1 \
  -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 \
  -include "$observer_script/recording_archive_phase_trace.h" "$observer_run/catalog-instrumented.cpp" \
  "$observer_script/recording_current_observer_native.cpp" "${observer_libs[@]}" -o "$observer_run/normalize"
c++ -std=c++17 "$observer_script/recording_process_metrics.cpp" -o "$observer_run/process-metrics"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$observer_repo/include" "${observer_flags[@]}" \
  -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_SQLITE3=1 \
  -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 "$observer_script/va_review_smoke.cpp" "${observer_libs[@]}" -o "$observer_run/review-seed"
export MEDIA_SERVER_VA_REVIEW_FIXTURE_BIN="$observer_run/review-seed"
node "$observer_driver/v450_recording_a_mixed.mjs" "$observer_run" "$@"
