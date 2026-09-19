#!/usr/bin/env bash
# 호출자가 생성·정리하는 소유 root에서만 빌드. 실행은 별도 승인한다.
set -euo pipefail
lp_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
lp_repo="$(cd "$lp_script/../.." && pwd)"
lp_root="${1:?owned root required}"
node - "$lp_repo" "$lp_root" <<'NODE'
const fs=require('fs'),path=require('path'),crypto=require('crypto'),[repo,out]=process.argv.slice(2);
if(!/^media-server-immutable-ownership\.[A-Za-z0-9]+$/.test(path.basename(out))||fs.lstatSync(out).isSymbolicLink()||fs.realpathSync(out)!==out)throw Error('LP18_ROOT');
function exact(s,a,b){if(s.split(a).length!==2)throw Error('LP18_EXACT');return s.replace(a,b);}
fs.mkdirSync(path.join(out,'include/recording'),{recursive:true});
for(const name of ['recording_catalog.h','recording_journal.h']){const file=path.join(repo,'include/recording',name);fs.writeFileSync(path.join(out,'include/recording',name),exact(fs.readFileSync(file,'utf8'),'private:','public: // LP18 owned test copy'));}
const source=fs.readFileSync(path.join(repo,'src/recording/recording_journal.cpp'),'utf8');
const helper='\nnamespace ownership_probe { using History=decltype(std::declval<recording::RecordingCatalog::CheckpointProjectionCache>().prefix); History JournalView(const recording::RecordingJournal& j){std::lock_guard lock(j.mu_);return j.managed_state_->records;} }\n';
fs.writeFileSync(path.join(out,'recording_journal.cpp'),'#include "recording/recording_catalog.h"\n'+source+helper);
fs.writeFileSync(path.join(out,'ownership_flags'),source.includes('RecordingMutationHandles records;')?'-DLP18_SHARED_RECORDS=1':'');
for(const name of ['include/recording/recording_journal.h','include/recording/recording_catalog.h','src/recording/recording_journal.cpp','src/recording/recording_catalog.cpp','src/recording/recording_checkpoint_validation.h','scripts/internal/recording_immutable_ownership_smoke.cpp'])console.log('[source] '+JSON.stringify({name,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,name))).digest('hex')}));
NODE
read -r -a lp_original_link < "$lp_repo/build-gst-onnx/CMakeFiles/media_server.dir/link.txt"
lp_libs=(); lp_found=0
for lp_token in "${lp_original_link[@]}";do
 if [[ "$lp_token" == libmedia_server_runtime.a ]];then lp_found=1;lp_libs+=("$lp_repo/build-gst-onnx/$lp_token");continue;fi
 if ((lp_found));then lp_libs+=("$lp_token");fi
done
test "$lp_found" = 1
read -r -a lp_flags <<< "$(pkg-config --cflags gstreamer-app-1.0 openssl sqlite3)"
lp_shared=(-DLP18_SHARED_RECORDS=0); if [[ -s "$lp_root/ownership_flags" ]];then lp_shared=(-DLP18_SHARED_RECORDS=1);fi
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$lp_root/include" -I"$lp_repo/include" -I"$lp_script" -I"$lp_repo/src/recording" "${lp_flags[@]}" "${lp_shared[@]}" \
 -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_SQLITE3=1 \
 "$lp_script/recording_immutable_ownership_smoke.cpp" "$lp_root/recording_journal.cpp" "$lp_repo/src/recording/recording_catalog.cpp" "${lp_libs[@]}" -o "$lp_root/check"
