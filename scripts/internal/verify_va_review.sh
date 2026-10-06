#!/usr/bin/env bash
# 파일 용도: 제품 archive와 연결하는 격리 VA review native 검사. 임시 root의 소유·정리 확인.
set -euo pipefail
task_repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$task_repo"
python3 - "$task_repo" "$@" <<'PY'
import ctypes, gzip, hashlib, http.server, json, os, pathlib, shlex, shutil, subprocess, sys, tempfile, threading, urllib.request, time, ssl
def wait_model_unloaded(fetch, deadline, clock=time.monotonic, sleep=time.sleep):
    started=clock(); observations=[]
    try:
        while True:
            remaining=deadline-clock()
            if remaining<=0:raise RuntimeError('model runner unload deadline exceeded')
            models=fetch(min(1,remaining))
            elapsed=clock()-started
            observations.append({'elapsedMs':round(elapsed*1000),'modelCount':len(models)})
            if clock()>deadline:raise RuntimeError('model runner unload deadline exceeded')
            if not models:return
            sleep(min(.05,max(0,deadline-clock())))
    finally:
        print('[model-unload]',json.dumps({'observations':observations}),flush=True)
repo=pathlib.Path(sys.argv[1]); build=repo/'build-gst-onnx'
local=len(sys.argv)==4 and sys.argv[2] in ('--local','--diagnostic-text','--diagnostic-text-uncertain','--diagnostic-text-decisive','--diagnostic-inversion','--cause-ab','--observe-local','--questions-local','--rephrase-local')
lifecycle=len(sys.argv)==4 and sys.argv[2]=='--local-lifecycle'
http_mode=len(sys.argv)==3 and sys.argv[2]=='--http-only'
contract=len(sys.argv)==3 and sys.argv[2]=='--contract-only'
cause_offline=len(sys.argv)==3 and sys.argv[2]=='--cause-offline'
core_only=len(sys.argv)==3 and sys.argv[2] in ('--core-only','--observer-only')
rephrase_only=len(sys.argv)==3 and sys.argv[2]=='--rephrase-only'
rephrase_local=local and sys.argv[2]=='--rephrase-local'
materials_only=len(sys.argv)==3 and sys.argv[2]=='--materials-only'
questions_only=len(sys.argv)==3 and sys.argv[2]=='--questions-only'
questions_local=local and sys.argv[2]=='--questions-local'
observe_local=local and sys.argv[2]=='--observe-local'
cause_ab=local and sys.argv[2]=='--cause-ab'
if len(sys.argv)!=2 and not local and not lifecycle and not http_mode and not contract and not cause_offline and not core_only and not questions_only and not materials_only and not rephrase_only: raise RuntimeError('usage: verify_va_review.sh [--local http://127.0.0.1:port | --local-lifecycle http://127.0.0.1:port | --diagnostic-text http://127.0.0.1:port | --diagnostic-inversion http://127.0.0.1:port | --http-only | --contract-only | --cause-offline | --cause-ab http://127.0.0.1:port | --core-only | --observer-only | --observe-local http://127.0.0.1:port | --rephrase-only | --rephrase-local http://127.0.0.1:port | --materials-only | --questions-only | --questions-local http://127.0.0.1:port]')
archive=build/'libmedia_server_runtime.a'
for directory in ('src','include'):
    for source in (repo/directory).rglob('*'):
        if source.suffix in ('.cpp','.h') and source.stat().st_mtime_ns>archive.stat().st_mtime_ns:
            raise RuntimeError('product build required: '+str(source.relative_to(repo)))
root=pathlib.Path(tempfile.mkdtemp(prefix='media-server-va-review-')).resolve()
identity=root.stat(); print('[fixture]',root,flush=True)
tls_servers=[]; server=None; thread=None; stop=threading.Event(); monitor=None; resources={'modelBytes':0,'modelVramBytes':0,'modelRssPlusVramBytes':0,'modelPhysicalFootprintBytes':0,'workspaceBytes':0}
try:
    link=shlex.split((build/'CMakeFiles/media_server.dir/link.txt').read_text())
    libs=[str(archive),*link[link.index('libmedia_server_runtime.a')+1:]]
    flags=shlex.split(subprocess.check_output(['pkg-config','--cflags','openssl','sqlite3','gstreamer-app-1.0'],text=True))
    sources=sorted([*repo.glob('src/recording/va_review*.cpp'),*repo.glob('src/recording/va_review*.h'),*repo.glob('include/recording/va_review*.h'),repo/'scripts/internal/va_review_smoke.cpp',repo/'scripts/internal/va_review_quality_fixture.h',repo/'scripts/internal/verify_va_review.sh',repo/'scripts/internal/va_review_contract_replay.json',repo/'scripts/internal/va_review_cause_diagnostic.h',repo/'scripts/internal/va_review_core_checks.h',repo/'scripts/internal/va_review_question_checks.h',repo/'scripts/internal/va_review_material_checks.h',repo/'scripts/internal/va_review_rephrase_checks.h',repo/'test/fixtures/v450_review_questions.json',repo/'test/fixtures/v450_review_core.json',repo/'test/fixtures/v450_review_observer.json'])
    for source in sources: print('[source]',source.relative_to(repo),hashlib.sha256(source.read_bytes()).hexdigest(),flush=True)
    shutil.copyfile(repo/'scripts/internal/va_review_contract_replay.json',root/'contract-replay.json')
    if questions_only or questions_local or materials_only or rephrase_only or rephrase_local:
        shutil.copyfile(repo/'test/fixtures/v450_review_questions.json',root/'question-fixture.json')
        if questions_local or rephrase_only or rephrase_local:shutil.copyfile(repo/'docs/release-artifacts/v4.5.0/43-request-freeze.json',root/'questions-plan.json')
        candidate=os.environ.get('MEDIA_SERVER_VA_QUESTION_CANDIDATE')
        candidate_plan=os.environ.get('MEDIA_SERVER_VA_QUESTION_PLAN')
        if bool(candidate)!=bool(candidate_plan):raise RuntimeError('candidate config and plan must be specified together')
        if candidate:
            shutil.copyfile(candidate,root/'question-candidate.json')
            if questions_local or rephrase_only or rephrase_local:shutil.copyfile(candidate_plan,root/'candidate-questions-plan.json')
    if rephrase_only or rephrase_local:
        raw=gzip.decompress((repo/'docs/release-artifacts/v4.5.0/46-offline-3.log.gz').read_bytes()).decode()
        rows=[line.removeprefix('[material-case] ') for line in raw.splitlines() if line.startswith('[material-case] ')]
        if len(rows)!=6:raise RuntimeError('original46 six outputs missing')
        (root/'material-baseline.json').write_text('{"cases":['+','.join(rows)+']}')
        if rephrase_local:shutil.copyfile(repo/'docs/release-artifacts/v4.5.0/47-request-freeze.json',root/'rephrase-plan.json')
    if core_only or observe_local:
        shutil.copyfile(repo/'test/fixtures/v450_review_core.json',root/'core-fixture.json')
        shutil.copyfile(repo/'test/fixtures/v450_review_observer.json',root/'observer-fixture.json')
        shutil.copyfile(repo/'docs/release-artifacts/v4.5.0/37-request-freeze.json',root/'previous-observation-plan.json')
        if observe_local:shutil.copyfile(repo/'docs/release-artifacts/v4.5.0/38-request-freeze.json',root/'core-plan.json')
    if cause_offline or cause_ab:
        artifact=repo/'docs/release-artifacts/v4.5.0'
        prior=json.loads((artifact/'35-evaluation-freeze.json').read_text())
        cases=[];current=None;request_hash=None
        for line in (artifact/'35-text-uncertain.log').read_text().splitlines():
            if line.startswith('[diagnostic-input] '):current=line.split('case=')[1].split(' ')[0]
            elif line.startswith('[wire-provenance] '):request_hash=line.split('requestSha256=')[1].split(' ')[0]
            elif line.startswith('[synthetic-raw-response] '):
                envelope=json.loads(json.loads(line.split(' ',1)[1]))
                cases.append({'id':current,'requestSha256':request_hash,'content':envelope['message']['content']})
        if [c['id'] for c in cases]!=['one-motion','one-direction','blank-hidden','occluded-final']:
            raise RuntimeError('original four-case provenance mismatch')
        (root/'cause-replay.json').write_text(json.dumps({'modelDigest':prior['modelDigest'],'cases':cases},ensure_ascii=False))
        if cause_ab:shutil.copyfile(artifact/'36-request-freeze.json',root/'cause-plan.json')
    subprocess.run(['c++','-std=c++17','-Wall','-Wextra','-Werror','-pthread','-I'+str(repo/'include'),
        '-DMEDIA_SERVER_USE_OPENSSL=1','-DMEDIA_SERVER_USE_SQLITE3=1','-DMEDIA_SERVER_USE_GSTREAMER=1',
        '-DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1',*flags,
        str(repo/'scripts/internal/va_review_smoke.cpp'),*libs,'-o',str(root/'smoke')],check=True,timeout=60)
    if http_mode:
        environment=dict(os.environ,MEDIA_SERVER_VA_REVIEW_FIXTURE_BIN=str(root/'smoke'))
        subprocess.run(['node',str(repo/'scripts/internal/va_review_http_checks.mjs')],env=environment,check=True,timeout=70)
        sys.exit(0)
    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self,*args):pass
        def do_POST(self):
            data=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            mode=data['mode'];status=int(mode) if mode.isdigit() else 302 if mode=='redirect' else 401 if mode=='auth' and self.headers.get('Authorization')!='Bearer synthetic-token' else 200
            if mode=='slow':stop.wait(2)
            body=b'x'*70000 if mode=='large' else b'{"ok":true}'
            try:
                self.send_response(status)
                if mode=='redirect':self.send_header('Location','http://127.0.0.1:1/must-not-follow')
                self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
            except (BrokenPipeError,ConnectionResetError,ssl.SSLError):pass
    if local or lifecycle:
        endpoint=sys.argv[3]
        if not endpoint.startswith('http://127.0.0.1:') or not endpoint.removeprefix('http://127.0.0.1:').isdigit():raise RuntimeError('numeric loopback only')
        port=endpoint.removeprefix('http://127.0.0.1:')
        server_pid=subprocess.check_output(['lsof','-t','-iTCP:'+port,'-sTCP:LISTEN'],text=True).strip()
        if not server_pid.isdigit() or pathlib.Path(subprocess.check_output(['ps','-p',server_pid,'-o','comm='],text=True).strip()).name!='ollama':
            raise RuntimeError('dedicated Ollama owner required')
        if sys.platform!='darwin':raise RuntimeError('this physical-footprint quality verifier requires macOS')
        # macOS SDK sys/resource.h rusage_info_v0: unified CPU/GPU pages를 RSS+VRAM으로 중복 합산하지 않는다.
        class Rusage(ctypes.Structure):
            _fields_=[('uuid',ctypes.c_uint8*16)]+[(name,ctypes.c_uint64) for name in
                ('user_time','system_time','pkg_idle_wkups','interrupt_wkups','pageins','wired_size','resident_size','phys_footprint','proc_start_abstime','proc_exit_abstime')]
        libproc=ctypes.CDLL('/usr/lib/libproc.dylib',use_errno=True)
        libproc.proc_pid_rusage.argtypes=[ctypes.c_int,ctypes.c_int,ctypes.c_void_p]
        libproc.proc_pid_rusage.restype=ctypes.c_int
        def observe():
            opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
            if lifecycle:
                try:
                    def models():
                        with opener.open(endpoint+'/api/ps',timeout=1) as response:return json.load(response)['models']
                    if models():raise RuntimeError('lifecycle requires initially unloaded model')
                    for trial in (1,2):
                        prefix='lifecycle-'+str(trial);limit=time.monotonic()+22
                        while not (root/(prefix+'-request')).exists():
                            if stop.wait(.025):return
                            if time.monotonic()>=limit:raise RuntimeError('lifecycle request signal timeout')
                        limit=time.monotonic()+20
                        while True:
                            loaded=models()
                            if any(m.get('name',m.get('model'))=='qwen3-vl:8b-instruct-q4_K_M' for m in loaded):break
                            if stop.wait(.025):return
                            if time.monotonic()>=limit:raise RuntimeError('lifecycle actual model load timeout')
                        print('[model-lifecycle]',json.dumps({'trial':trial,'loaded':True,'modelCount':len(loaded)}),flush=True)
                        (root/(prefix+'-loaded')).write_text('api-ps observed model')
                        action=root/(prefix+'-action');limit=time.monotonic()+5
                        while not action.exists():
                            if stop.wait(.025):return
                            if time.monotonic()>=limit:raise RuntimeError('lifecycle action signal timeout')
                        action_time=action.stat().st_mtime;limit=time.monotonic()+max(0,5-(time.time()-action_time))
                        while True:
                            empty=not models();elapsed=time.time()-action_time
                            if empty and elapsed<=5:break
                            if time.monotonic()>=limit:raise RuntimeError('lifecycle unload exceeds five seconds')
                            if stop.wait(.025):return
                        print('[model-lifecycle]',json.dumps({'trial':trial,'unloaded':True,'actionToEmptyMs':round(elapsed*1000)}),flush=True)
                        (root/(prefix+'-empty')).write_text('api-ps empty within five seconds')
                        resources['lifecycleTrials']=trial
                except Exception as exc:
                    resources['lifecycleError']=str(exc);(root/'lifecycle-error').write_text(type(exc).__name__)
                return
            while not stop.is_set():
                try:
                    with opener.open(endpoint+'/api/ps',timeout=1) as response:models=json.load(response)['models']
                    resources['modelBytes']=max(resources['modelBytes'],sum(m['size'] for m in models))
                    resources['modelVramBytes']=max(resources['modelVramBytes'],sum(m['size_vram'] for m in models))
                    children=subprocess.run(['pgrep','-P',server_pid],capture_output=True,text=True)
                    pids=[server_pid,*[p for p in children.stdout.split() if p.isdigit()]]
                    rss=subprocess.run(['ps','-p',','.join(pids),'-o','rss='],capture_output=True,text=True)
                    if rss.returncode or children.returncode not in (0,1):raise RuntimeError('owned process observation failed')
                    resources['modelRssPlusVramBytes']=max(resources['modelRssPlusVramBytes'],sum(int(n)*1024 for n in rss.stdout.split())+sum(m['size_vram'] for m in models))
                    footprint=0
                    for pid in pids:
                        usage=Rusage()
                        if libproc.proc_pid_rusage(int(pid),0,ctypes.byref(usage))==0:footprint+=usage.phys_footprint
                        elif ctypes.get_errno()!=3:raise RuntimeError('physical footprint observation failed')
                    resources['modelPhysicalFootprintBytes']=max(resources['modelPhysicalFootprintBytes'],footprint)
                    resources['workspaceBytes']=max(resources['workspaceBytes'],sum(p.stat().st_size for p in root.rglob('*') if p.is_file()))
                except Exception as exc: resources['observationError']=type(exc).__name__
                if (cause_ab or observe_local or questions_local or rephrase_local) and ('observationError' in resources or resources['modelBytes']>14*1024**3 or resources['modelPhysicalFootprintBytes']>14*1024**3 or resources['workspaceBytes']>8*1024**3):
                    (root/'cause-stop').write_text('resource limit or observation failure')
                stop.wait(.25)
        monitor=threading.Thread(target=observe);monitor.start()
    elif cause_offline or core_only or questions_only or materials_only or rephrase_only:
        endpoint='unused'
    else:
        server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
        server.daemon_threads=False
        endpoint='http://127.0.0.1:'+str(server.server_port)
        thread=threading.Thread(target=server.serve_forever);thread.start()
        print('[loopback]',endpoint,flush=True)
        openssl=shutil.which('openssl')
        if not openssl:raise RuntimeError('existing OpenSSL executable required; do not install automatically')
        subprocess.run([openssl,'req','-x509','-newkey','rsa:2048','-nodes','-keyout',str(root/'tls-key.pem'),
            '-out',str(root/'tls-cert.pem'),'-days','1','-subj','/CN=localhost',
            '-addext','subjectAltName=DNS:localhost'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=15)
        expired=subprocess.run([openssl,'x509','-in',str(root/'tls-cert.pem'),'-signkey',str(root/'tls-key.pem'),
            '-not_before','20000101000000Z','-not_after','20000102000000Z','-out',str(root/'tls-expired.pem')],
            stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,text=True,timeout=5)
        if expired.returncode:raise RuntimeError('expired certificate fixture: '+expired.stderr[:2048])
        for certificate in ('tls-cert.pem','tls-expired.pem'):
            secure=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
            tls_servers.append((secure,None))
            context=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);context.load_cert_chain(str(root/certificate),str(root/'tls-key.pem'))
            secure.socket=context.wrap_socket(secure.socket,server_side=True)
            secure_thread=threading.Thread(target=secure.serve_forever);secure_thread.start();tls_servers[-1]=(secure,secure_thread)
        (root/'tls-ports.txt').write_text(' '.join(str(server.server_port) for server,_ in tls_servers))
        print('[tls-fixture] loopback only; temporary CA; no system trust changes',flush=True)

    focused_started=time.monotonic()
    stage_deadline=focused_started+800
    if local and sys.argv[2] in ('--diagnostic-text-uncertain','--diagnostic-text-decisive'):
        # 두 텍스트 분할은 수동 대기를 포함해 호출자가 고정한 800초 한도를 공유한다.
        stage_deadline=float(os.environ['MEDIA_SERVER_VA_TEXT_DEADLINE_MONOTONIC'])
        remaining=stage_deadline-focused_started
        if not 0<remaining<=800:raise RuntimeError('shared text budget exhausted or invalid')
        print('[text-budget]',json.dumps({'deadlineMonotonic':stage_deadline,'remainingSeconds':remaining}),flush=True)
    subprocess.run(['bash','-c','source "$2/scripts/internal/env_common.sh"; export MEDIA_SERVER_GST_CACHE_DIR="$1/gst-cache"; media_server_apply_homebrew_gst_env || exit; exec "$1/smoke" "$1" "$3" "$4"',
        'va-review',str(root),str(repo),'--local-lifecycle' if lifecycle else sys.argv[2] if local or contract or cause_offline or core_only or questions_only or materials_only or rephrase_only else '--protocol',endpoint],check=True,timeout=60 if lifecycle else stage_deadline-time.monotonic() if local else 90,
        env=dict(os.environ,HTTP_PROXY='http://127.0.0.1:1',HTTPS_PROXY='http://127.0.0.1:1',ALL_PROXY='http://127.0.0.1:1',
            http_proxy='http://127.0.0.1:1',https_proxy='http://127.0.0.1:1',all_proxy='http://127.0.0.1:1',NO_PROXY='',no_proxy=''))
    focused_finished=time.monotonic()
    if rephrase_only:
        target=repo/'docs/release-artifacts/v4.5.0/47-request-freeze.json';data=(root/'rephrase-plan.json').read_bytes()
        if target.exists():
            if target.read_bytes()!=data:raise RuntimeError('frozen rephrase requests changed')
        else:
            with target.open('xb') as output:output.write(data)
        print('[rephrase-plan-preserved]',hashlib.sha256(data).hexdigest(),flush=True)
    if questions_only:
        target=repo/'docs/release-artifacts/v4.5.0/43-request-freeze.json'
        data=(root/'questions-plan.json').read_bytes()
        if target.exists():
            if target.read_bytes()!=data:raise RuntimeError('frozen question request changed')
        else:
            with target.open('xb') as output:output.write(data)
        print('[question-plan-preserved]',hashlib.sha256(data).hexdigest(),flush=True)
        if candidate:
            target=pathlib.Path(candidate_plan);data=(root/'candidate-questions-plan.json').read_bytes()
            if target.exists():
                if target.read_bytes()!=data:raise RuntimeError('frozen candidate request changed')
            else:
                with target.open('xb') as output:output.write(data)
            print('[candidate-plan-preserved]',hashlib.sha256(data).hexdigest(),flush=True)
    if core_only:
        target=repo/'docs/release-artifacts/v4.5.0/38-request-freeze.json'
        data=(root/'core-plan.json').read_bytes()
        if target.exists():
            if target.read_bytes()!=data:raise RuntimeError('frozen observation request changed')
        else:
            with target.open('xb') as output:output.write(data)
        print('[observation-plan-preserved]',hashlib.sha256(data).hexdigest(),flush=True)
    if cause_offline:
        target=repo/'docs/release-artifacts/v4.5.0/36-request-freeze.json'
        with target.open('xb') as output:output.write((root/'cause-plan.json').read_bytes())
        print('[cause-plan-preserved]',hashlib.sha256(target.read_bytes()).hexdigest(),flush=True)
    if lifecycle:
        elapsed=time.monotonic()-focused_started
        if resources.get('lifecycleTrials')!=2 or 'lifecycleError' in resources or elapsed>=60:raise RuntimeError('lifecycle focused gate failed')
        print('[lifecycle-summary]',json.dumps({'trials':2,'focusedElapsedMs':round(elapsed*1000),'actualUiPass':False,'qualityCasesExecuted':0}),flush=True)
    if local:
        print('[resource]',json.dumps(resources,sort_keys=True),flush=True)
        if 'observationError' in resources or not 0<resources['modelBytes']<=14*1024**3 or not 0<resources['modelPhysicalFootprintBytes']<=14*1024**3 or resources['workspaceBytes']>8*1024**3:
            raise RuntimeError('resource observation/gate failed')
        def fetch_models(timeout):
            with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(endpoint+'/api/ps',timeout=timeout) as response:
                models=json.load(response)['models']
                if not isinstance(models,list):raise RuntimeError('invalid model list')
                return models
        wait_model_unloaded(fetch_models,min(focused_finished+5,stage_deadline))
        print('[cleanup] modelUnloaded=true',flush=True)
finally:
    stop.set()
    if monitor:monitor.join(timeout=2)
    if monitor and monitor.is_alive():raise RuntimeError('monitor cleanup failed')
    if local or lifecycle:print('[resource-final]',json.dumps(resources,sort_keys=True),flush=True)
    for secure,secure_thread in tls_servers:
        if secure_thread:secure.shutdown()
        secure.server_close()
        if secure_thread:secure_thread.join(timeout=2)
        if secure_thread and secure_thread.is_alive():raise RuntimeError('TLS fixture cleanup failed')
    if server:server.shutdown();server.server_close();thread.join(timeout=2)
    if thread and thread.is_alive():raise RuntimeError('loopback server cleanup failed')
    st=root.lstat()
    if root.is_symlink() or (st.st_dev,st.st_ino,st.st_uid)!=(identity.st_dev,identity.st_ino,os.getuid()):
        raise RuntimeError('cleanup ownership mismatch')
    shutil.rmtree(root)
    if root.exists():raise RuntimeError('cleanup remains')
    print('[cleanup] removed=true',flush=True)
PY
