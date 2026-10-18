#!/usr/bin/env python3
# 파일 용도: R90 실제 검색 capture latch/실패 수집을 기존 runtime에 연결한다. 제품 서버·모델 설치 없음.
import argparse, hashlib, json, os, pathlib, shlex, subprocess, time
p=argparse.ArgumentParser();p.add_argument('--build',default='build-gst-onnx');p.add_argument('--output',required=True);a=p.parse_args()
repo=pathlib.Path(__file__).resolve().parents[2];build=(repo/a.build).resolve();out=pathlib.Path(a.output)
if not out.is_absolute() or out.exists() or out.parent.resolve()!=out.parent or out.parent.stat().st_uid!=os.getuid():
    raise SystemExit('new owned absolute output required')
out.mkdir(mode=0o700);records=[]
def run(label,args,env=None):
    began=time.monotonic();raw=out/(label+'.log')
    with raw.open('wb') as f:
        child=subprocess.Popen(args,cwd=repo,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
        # Existing command budget; bounded output fails, never discard and report success.
        import selectors
        poll=selectors.DefaultSelector();poll.register(child.stdout,selectors.EVENT_READ);size=0;failure=None
        try:
            while poll.get_map():
                if time.monotonic()-began>90:raise RuntimeError('command deadline')
                for key,_ in poll.select(.1):
                    data=os.read(key.fd,65536)
                    if not data:poll.unregister(key.fileobj);continue
                    size+=len(data)
                    if size>4*1024*1024:raise RuntimeError('command log overflow')
                    if f.write(data)!=len(data):raise RuntimeError('command short write')
            code=child.wait(timeout=max(.1,90-(time.monotonic()-began)))
        except Exception as e:
            failure=type(e).__name__;child.terminate()
            try:child.wait(timeout=3)
            except subprocess.TimeoutExpired:child.kill();child.wait()
            code=child.returncode
        finally:poll.close();child.stdout.close()
    records.append(dict(phase=label,args=args,exit=code,failure=failure,bytes=size,seconds=time.monotonic()-began))
    (out/'commands.json').write_text(json.dumps(records,indent=2))
    if code or failure:raise SystemExit(1)
flags={}
for line in (build/'CMakeFiles/media_server_runtime.dir/flags.make').read_text().splitlines():
    if ' = ' in line:k,v=line.split(' = ',1);flags[k]=shlex.split(v)
link=shlex.split((build/'CMakeFiles/media_server.dir/link.txt').read_text());libs=[str(build/'libmedia_server_runtime.a'),*link[link.index('libmedia_server_runtime.a')+1:]]
binary=out/'scope'
run('compile',[link[0],*flags['CXX_DEFINES'],*flags['CXX_INCLUDES'],*flags['CXX_FLAGS'],'-Wall','-Wextra','-Werror','-pthread','-DRECORDING_SEARCH_TESTING=1',str(repo/'src/recording/recording_search_reader.cpp'),str(repo/'scripts/internal/recording_search_scope_smoke.cpp'),*libs,'-o',str(binary)])
env=os.environ.copy();env.update(MEDIA_SERVER_SKIP_LOCAL_ENV='1',MEDIA_SERVER_VERIFY_RECORDING_SEARCH_TRACE='1',MEDIA_SERVER_VERIFY_VISUAL_LATENCY_TRACE='0')
run('actual',['bash','-c','source scripts/internal/env_common.sh; export MEDIA_SERVER_GST_CACHE_DIR="$1"; media_server_apply_homebrew_gst_env; exec "${@:2}"','scope',str(out/'gst-cache'),str(binary),str(out/'store')],env)
run('collection',['node','--input-type=module','-e',"import fs from 'node:fs';import {searchFailureSummary} from './scripts/internal/recording_longrun_progress.mjs';const r=searchFailureSummary(fs.readFileSync(process.argv[1],'utf8'));console.log(JSON.stringify(r));const [capacity,changed]=r.failures;if(r.status!=='captured'||r.failures.length!==2||capacity.attempts.length!==1||capacity.attempts[0].stage!=='capture-source'||capacity.attempts[0].reason!=='search-capacity-exceeded'||capacity.resourceRejectionsAfter!==capacity.resourceRejectionsBefore+1||changed.attempts.length!==3||changed.attempts.some(a=>a.stage!=='validate-source'||a.reason!=='search-source-changed'))process.exit(1)",str(out/'actual.log')])
(out/'binding.json').write_text(json.dumps({'binarySha256':hashlib.sha256(binary.read_bytes()).hexdigest(),'runtimeSha256':hashlib.sha256((build/'libmedia_server_runtime.a').read_bytes()).hexdigest(),'fullPhase':False,'searchFailureTrace':True,'source':{str(x.relative_to(repo)):hashlib.sha256(x.read_bytes()).hexdigest() for x in [repo/'src/recording/recording_search_reader.cpp',repo/'scripts/internal/recording_search_scope_smoke.cpp']}},indent=2))
print('[search-scope] actual latch and terminal collection PASS; owned output preserved',flush=True)
