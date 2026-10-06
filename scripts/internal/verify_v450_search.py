#!/usr/bin/env python3
# 파일 용도: 준비된 SigLIP2로 현재 검색 입력/색인/화면 상태 검사만 연결한다. 설치·다운로드 없음.
import os, pathlib, shlex, shutil, subprocess, tempfile
repo=pathlib.Path(__file__).resolve().parents[2];build=repo/'build-gst-onnx'
root=pathlib.Path(tempfile.mkdtemp(prefix='media-server-v450-search-')).resolve();identity=root.stat()
def run(args,timeout=90):
    print('[command]',shlex.join(map(str,args)),flush=True)
    r=subprocess.run(args,cwd=repo,timeout=timeout);code=r.returncode;print('[exit]',code,flush=True);r.check_returncode()
try:
    flags={}
    for line in (build/'CMakeFiles/media_server_runtime.dir/flags.make').read_text().splitlines():
        if ' = ' in line:k,v=line.split(' = ',1);flags[k]=shlex.split(v)
    link=shlex.split((build/'CMakeFiles/media_server.dir/link.txt').read_text());libs=[str(build/'libmedia_server_runtime.a'),*link[link.index('libmedia_server_runtime.a')+1:]]
    for name,args in [('siglip2_encoder_smoke',['query',str(repo/'models/v430-siglip2')]),('visual_index_worker_smoke',[str(root/'worker')]),('visual_search_application_smoke',[str(root/'app'),str(repo/'models/v430-siglip2'),'--scope-only'])]:
        binary=root/name
        run([link[0],*flags['CXX_DEFINES'],*flags['CXX_INCLUDES'],*flags['CXX_FLAGS'],str(repo/'scripts/internal'/f'{name}.cpp'),*libs,'-o',str(binary)])
        run(['bash','-c','source scripts/internal/env_common.sh; export MEDIA_SERVER_GST_CACHE_DIR="$1"; media_server_apply_homebrew_gst_env; exec "${@:2}"','search',str(root/'gst-cache'),str(binary),*args])
    run(['node','--test','scripts/internal/visual_search_ui_state.test.mjs','scripts/internal/recording_search_ui_state.test.mjs'])
finally:
    s=root.lstat();assert not root.is_symlink() and (s.st_dev,s.st_ino,s.st_uid)==(identity.st_dev,identity.st_ino,os.getuid())
    shutil.rmtree(root);assert not root.exists();print('[cleanup] owned search root absent',flush=True)
