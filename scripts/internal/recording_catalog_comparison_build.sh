#!/usr/bin/env bash
# 파일 용도: LP17 검사 복제본만 빌드한다. runtime freshness/자원 상한/cleanup은 호출 runner 소유다.
set -euo pipefail
lp_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
lp_repo="$(cd "$lp_script/../.." && pwd)"
lp_root="${1:?owned root required}"
lp_mode="${2:-default}"
[[ "$lp_mode" == default || "$lp_mode" == query ]] || exit 2
if [[ "$lp_mode" == query ]];then node "$lp_script/recording_catalog_comparison_instrument.cjs" "$lp_repo" "$lp_root" query;else node "$lp_script/recording_catalog_comparison_instrument.cjs" "$lp_repo" "$lp_root";fi
node - "$lp_repo" "$lp_root" "$lp_mode" <<'NODE'
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const [repo,out,mode]=process.argv.slice(2),build=path.join(repo,'build-gst-onnx');
const flagsPath=path.join(build,'CMakeFiles/media_server_runtime.dir/flags.make'),linkPath=path.join(build,'CMakeFiles/media_server.dir/link.txt'),archive=path.join(build,'libmedia_server_runtime.a');
for(const p of [flagsPath,linkPath,archive])if(!fs.statSync(p).isFile())throw Error('LP17_BUILD_INPUT');
const flags=fs.readFileSync(flagsPath,'utf8'),link=fs.readFileSync(linkPath,'utf8').trim();
// 현재 CMake 산출물은 quoting이 없는 단순 argv. 다른 형태를 추측 실행하지 않는다.
function split(s){if(/["'`$\\]/.test(s))throw Error('LP17_BUILD_QUOTING');return s.trim().split(/\s+/);}
function field(name){const m=flags.match(new RegExp('^'+name+' = (.*)$','m'));if(!m)throw Error('LP17_BUILD_FLAGS');return split(m[1]);}
const tokens=split(link),at=tokens.indexOf('libmedia_server_runtime.a');if(at<0||tokens.filter(t=>t==='libmedia_server_runtime.a').length!==1)throw Error('LP17_LINK_ARCHIVE');
const compiler=process.env.CXX||tokens[0];if(/\s/.test(compiler))throw Error('LP17_COMPILER');
const args=[...field('CXX_DEFINES'),'-I'+path.join(out,'include'),'-I'+out,'-I'+path.join(repo,'scripts/internal'),'-I'+path.join(repo,'src/recording'),...field('CXX_INCLUDES'),...field('CXX_FLAGS'),'-Wall','-Wextra','-pthread'];
function run(argv){const r=cp.spawnSync(compiler,argv,{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
const objects=[];
for(const file of ['recording_catalog.cpp','recording_journal.cpp','recording_contracts.cpp']){const obj=path.join(out,file+'.o');run([...args,'-c',path.join(out,file),'-o',obj]);objects.push(obj);}
const targets=mode==='query'?[['recording_catalog_comparison_probe.cpp','comparison'],['recording_catalog_query_probe.cpp','comparison-query']]:[['recording_catalog_comparison_probe.cpp','comparison'],['recording_catalog_comparison_job_probe.cpp','comparison-job']];
for(const [file,target] of targets){
 const main=path.join(repo,'scripts/internal',file);run([...args,main,...objects,archive,...tokens.slice(at+1),'-o',path.join(out,target)]);
 console.log('[lp17] '+JSON.stringify({kind:'binary',name:target,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(out,target))).digest('hex')}));
}
NODE
