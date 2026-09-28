#!/usr/bin/env bash
# 파일 용도: 기존 제품 archive의 실제 B 누적 검증. small과 deleted 실행 승인은 구분한다.
set -euo pipefail
task_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
task_repo="$(cd "$task_script/../.." && pwd)"
task_mode="${1:-small}"
[[ "$task_mode" == small || "$task_mode" == deleted || "$task_mode" == bounded-small || "$task_mode" == bounded-deleted || "$task_mode" == receipt-compat ]] || exit 2
task_build="$task_repo/build-gst-onnx"
node -e 'const f=require("fs"),p=require("path"),r=process.argv[1],stamp=f.statSync(process.argv[2]).mtimeMs;function scan(d){for(const n of f.readdirSync(d)){const q=p.join(d,n),s=f.statSync(q);if(s.isDirectory())scan(q);else if(/\.(h|hpp|cpp)$/.test(n)&&s.mtimeMs>stamp)throw Error("stale-product-archive")}}scan(p.join(r,"src"));scan(p.join(r,"include"))' "$task_repo" "$task_build/libmedia_server_runtime.a"
task_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
task_root="$(mktemp -d "$task_parent/media-server-generation-scale.XXXXXX")"
chmod 700 "$task_root"
task_identity="$(node -e 'const s=require("fs").lstatSync(process.argv[1]);console.log(`${s.dev}:${s.ino}:${s.uid}`)' "$task_root")"
SECONDS=0
task_execution_started=0
cleanup(){
 local status=$?
 trap - EXIT
 node -e 'const f=require("fs"),p=require("path"),r=process.argv[1],s=f.lstatSync(r);if(p.dirname(r)!==process.argv[2]||!/^media-server-generation-scale\.[A-Za-z0-9]+$/.test(p.basename(r))||s.isSymbolicLink()||f.realpathSync(r)!==r||`${s.dev}:${s.ino}:${s.uid}`!==process.argv[3]||s.uid!==process.getuid())throw Error("cleanup-ownership");function size(q){const v=f.lstatSync(q);return v.isDirectory()?f.readdirSync(q).reduce((n,k)=>n+size(p.join(q,k)),0):v.size}const bytes=size(r);if(process.argv[4]!=="0"&&process.argv[5]==="1"){console.log(`[cleanup] path=${r} bytes=${bytes} removed=false preserved=execution-failure dev=${s.dev} ino=${s.ino} uid=${s.uid}`);process.exit(0)}f.rmSync(r,{recursive:true});console.log(`[cleanup] path=${r} bytes=${bytes} removed=${!f.existsSync(r)}`);if(f.existsSync(r))process.exit(1)' "$task_root" "$task_parent" "$task_identity" "$status" "$task_execution_started" || exit 1
 printf '[end] exit=%s elapsed_seconds=%s\n' "$status" "$SECONDS"
 exit "$status"
}
trap cleanup EXIT
printf '[start] utc=%s mode=%s root=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$task_mode" "$task_root"
uname -sm
"${CXX:-c++}" --version | head -1
shasum -a 256 "$task_script/recording_generation_scale_probe.cpp" "$task_script/verify_recording_generation_scale.sh" "$task_script/recording_file_evidence_smoke.cpp" "$task_script/recording_media_test_fixture.h" "$task_script/recording_generation_observation.h" "$task_repo/include/recording/recording_latency_trace.h" "$task_repo/include/recording/recording_catalog.h" "$task_repo/include/recording/recording_journal.h" "$task_repo/src/recording/recording_catalog.cpp" "$task_repo/src/recording/recording_journal.cpp" "$task_repo/src/recording/recording_runtime_composition.cpp" "$task_build/libmedia_server_runtime.a"
export MEDIA_SERVER_GST_CACHE_DIR="$task_root/gst-cache" MEDIA_SERVER_GST_PLUGIN_PROFILE=headless
export GST_REGISTRY="$task_root/registry.bin" GST_REGISTRY_1_0="$task_root/registry.bin"
unset GST_PLUGIN_PATH GST_PLUGIN_PATH_1_0 GST_PLUGIN_SYSTEM_PATH GST_PLUGIN_SYSTEM_PATH_1_0 MEDIA_SERVER_GST_MANAGED_REGISTRY MEDIA_SERVER_GST_MANAGED_PLUGIN_PATH MEDIA_SERVER_GST_INPUT_PLUGIN_PATH
source "$task_script/env_common.sh"
media_server_apply_homebrew_gst_env
read -r -a task_original_link < "$task_build/CMakeFiles/media_server.dir/link.txt"
task_libs=();task_found=0
for token in "${task_original_link[@]}";do
 if [[ "$token" == libmedia_server_runtime.a ]];then task_found=1;task_libs+=("$task_build/$token");continue;fi
 if ((task_found));then task_libs+=("$token");fi
done
test "$task_found" = 1
read -r -a task_flags <<<"$(pkg-config --cflags gstreamer-app-1.0 openssl sqlite3)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$task_repo/include" "${task_flags[@]}" \
 -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_SQLITE3=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 \
 "$task_script/recording_generation_scale_probe.cpp" "${task_libs[@]}" -o "$task_root/probe"
mkdir -m 700 "$task_root/data"
if [[ "$task_mode" == receipt-compat ]]; then
 node - "$task_repo" "$task_root/data" <<'NODE'
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const [repo,base]=process.argv.slice(2),dir=path.join(repo,'docs/release-artifacts/v4.1.0/s11-final-20260926'),archive=path.join(dir,'b10-observer-metadata.tar.xz');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
if(sha(fs.readFileSync(archive))!=='d0eba4711feb83742d17ff28af2f803069d92ca9f7e105d6b7e7402574f3a3ab')throw Error('B11-archive-sha');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'b10-observer-input-manifest.json'))),names=cp.spawnSync('tar',['-tf',archive],{encoding:'utf8',timeout:3000});
if(names.status!==0)throw Error('B11-archive-list');const listed=names.stdout.trimEnd().split('\n');
if(listed.length!==manifest.files.length||new Set(listed).size!==listed.length||listed.some(n=>!/^\.?[a-zA-Z0-9_.-]+$/.test(n)||n==='.'||n==='..'||!manifest.files.some(f=>f.path===n)))throw Error('B11-archive-members');
const root=path.join(base,'recordings');fs.mkdirSync(root,{mode:0o700});
const unpack=cp.spawnSync('tar',['-xf',archive,'-C',root],{encoding:'utf8',timeout:3000});if(unpack.status!==0)throw Error('B11-unpack');
for(const f of manifest.files){const file=path.join(root,f.path),s=fs.lstatSync(file);if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size!==f.bytes||sha(fs.readFileSync(file))!==f.sha256)throw Error('B11-file-sha');}
const generation=JSON.parse(fs.readFileSync(path.join(root,'recording-generation.json'))),segments=new Map(),deleted=new Set();
for(const r of fs.readFileSync(path.join(root,generation.snapshot.name),'utf8').trimEnd().split('\n').slice(1).map(JSON.parse)){
 if(r.kind==='segment-v2')segments.set(r.key,r.value);if(r.kind==='tombstone-v2')deleted.add(r.key);
}
const seen=new Set();for(const m of fs.readFileSync(path.join(root,generation.active.name),'utf8').trimEnd().split('\n').filter(Boolean).map(JSON.parse)){
 if(seen.has(m.mutationId))continue;seen.add(m.mutationId);
 if(m.mutationType==='segment_v2_bound_finalized')segments.set(m.entityId,m.payload.segment);
 else if(m.mutationType==='segment_v2_deleted')deleted.add(m.entityId);
 else if(!['recording_order_reserved','segment_v2_state'].includes(m.mutationType))throw Error('B11-unexpected-tail-type');
}
// JS에서는 정밀도 손실 위험이 있는 UTC/PTS 숫자를 재직렬화·제품 입력으로 사용하지 않는다.
// 이 표는 문자열 식별값·상태·배열 길이의 독립 기대값이며 실제 제품 codec이 원본을 읽는다.
const rows=[...segments].sort(([a],[b])=>a.localeCompare(b)).map(([id,s])=>{
 if(typeof id!=='string'||id!==s.segment_id||!/^\d+$/.test(s.channel_id)||!/^[a-f0-9]{64}$/.test(s.checksum_sha256)||!Array.isArray(s.mappings))throw Error('B11-oracle-shape');
 return [id,s.channel_id,deleted.has(id)?'deleted':'live',s.checksum_sha256,s.mappings.length].join('\t');
});
if(rows.length!==1116||deleted.size!==1110||[...deleted].some(id=>!segments.has(id)))throw Error('B11-oracle-count');
fs.writeFileSync(path.join(base,'expected.tsv'),rows.join('\n')+'\n',{flag:'wx',mode:0o600});
console.log('[fixture] B11 archive_files='+listed.length+' segments='+rows.length+' deleted='+deleted.size+' source_unchanged=true metadata_only=true');
NODE
fi
export MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE=1
if [[ "$task_mode" == bounded-* ]]; then
 export MEDIA_SERVER_VERIFY_RECORDING_LATENCY_SLOW_ONLY=1
fi
if [[ "$task_mode" == receipt-compat ]]; then
 printf '[scope] B11 archived-actual-metadata catalog-only media-playback=not-run observer=not-run\n'
else
 printf '[scope] observer=file-index-only normalize=synthetic js-semantic=not-run historical-detail-io-counter=not-instrumented\n'
fi
task_execution_started=1
"$task_root/probe" "$task_root/data" "$task_mode"
