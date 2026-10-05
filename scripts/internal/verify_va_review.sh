#!/usr/bin/env bash
# 파일 용도: 제품 archive와 연결하는 격리 VA review native 검사. 임시 root의 소유·정리 확인.
set -euo pipefail
task_repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$task_repo"
python3 - "$task_repo" "$@" <<'PY'
import ctypes, hashlib, http.server, json, os, pathlib, shlex, shutil, subprocess, sys, tempfile, threading, urllib.request, time
repo=pathlib.Path(sys.argv[1]); build=repo/'build-gst-onnx'
local=len(sys.argv)==4 and sys.argv[2]=='--local'
lifecycle=len(sys.argv)==4 and sys.argv[2]=='--local-lifecycle'
http_mode=len(sys.argv)==3 and sys.argv[2]=='--http-only'
if len(sys.argv)!=2 and not local and not lifecycle and not http_mode: raise RuntimeError('usage: verify_va_review.sh [--local http://127.0.0.1:port | --local-lifecycle http://127.0.0.1:port | --http-only]')
archive=build/'libmedia_server_runtime.a'
for directory in ('src','include'):
    for source in (repo/directory).rglob('*'):
        if source.suffix in ('.cpp','.h') and source.stat().st_mtime_ns>archive.stat().st_mtime_ns:
            raise RuntimeError('product build required: '+str(source.relative_to(repo)))
root=pathlib.Path(tempfile.mkdtemp(prefix='media-server-va-review-')).resolve()
identity=root.stat(); print('[fixture]',root,flush=True)
server=None; thread=None; stop=threading.Event(); monitor=None; resources={'modelBytes':0,'modelVramBytes':0,'modelRssPlusVramBytes':0,'modelPhysicalFootprintBytes':0,'workspaceBytes':0}
try:
    link=shlex.split((build/'CMakeFiles/media_server.dir/link.txt').read_text())
    libs=[str(archive),*link[link.index('libmedia_server_runtime.a')+1:]]
    flags=shlex.split(subprocess.check_output(['pkg-config','--cflags','openssl','sqlite3','gstreamer-app-1.0'],text=True))
    sources=sorted([*repo.glob('src/recording/va_review*.cpp'),*repo.glob('src/recording/va_review*.h'),*repo.glob('include/recording/va_review*.h'),repo/'scripts/internal/va_review_smoke.cpp',repo/'scripts/internal/va_review_quality_fixture.h',repo/'scripts/internal/verify_va_review.sh'])
    for source in sources: print('[source]',source.relative_to(repo),hashlib.sha256(source.read_bytes()).hexdigest(),flush=True)
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
            mode=data['mode'];status=int(mode) if mode.isdigit() else 302 if mode=='redirect' else 200
            if mode=='slow':stop.wait(2)
            body=b'x'*70000 if mode=='large' else b'{"ok":true}'
            try:
                self.send_response(status)
                if mode=='redirect':self.send_header('Location','http://invalid.invalid/must-not-follow')
                self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
            except (BrokenPipeError,ConnectionResetError):pass
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
                stop.wait(.25)
        monitor=threading.Thread(target=observe);monitor.start()
    else:
        server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
        server.daemon_threads=False
        endpoint='http://127.0.0.1:'+str(server.server_port)
        thread=threading.Thread(target=server.serve_forever);thread.start()
        print('[loopback]',endpoint,flush=True)
    focused_started=time.monotonic()
    subprocess.run(['bash','-c','source "$2/scripts/internal/env_common.sh"; export MEDIA_SERVER_GST_CACHE_DIR="$1/gst-cache"; media_server_apply_homebrew_gst_env || exit; exec "$1/smoke" "$1" "$3" "$4"',
        'va-review',str(root),str(repo),'--local-lifecycle' if lifecycle else '--local' if local else '--protocol',endpoint],check=True,timeout=60 if lifecycle else 800 if local else 90)
    if lifecycle:
        elapsed=time.monotonic()-focused_started
        if resources.get('lifecycleTrials')!=2 or 'lifecycleError' in resources or elapsed>=60:raise RuntimeError('lifecycle focused gate failed')
        print('[lifecycle-summary]',json.dumps({'trials':2,'focusedElapsedMs':round(elapsed*1000),'actualUiPass':False,'qualityCasesExecuted':0}),flush=True)
    if local:
        print('[resource]',json.dumps(resources,sort_keys=True),flush=True)
        if 'observationError' in resources or not 0<resources['modelBytes']<=14*1024**3 or not 0<resources['modelPhysicalFootprintBytes']<=14*1024**3 or resources['workspaceBytes']>8*1024**3:
            raise RuntimeError('resource observation/gate failed')
        with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(endpoint+'/api/ps',timeout=2) as response:models=json.load(response)['models']
        if models:raise RuntimeError('model runner not unloaded')
        print('[cleanup] modelUnloaded=true',flush=True)
finally:
    stop.set()
    if monitor:monitor.join(timeout=2)
    if monitor and monitor.is_alive():raise RuntimeError('monitor cleanup failed')
    if local or lifecycle:print('[resource-final]',json.dumps(resources,sort_keys=True),flush=True)
    if server:server.shutdown();server.server_close();thread.join(timeout=2)
    if thread and thread.is_alive():raise RuntimeError('loopback server cleanup failed')
    st=root.lstat()
    if root.is_symlink() or (st.st_dev,st.st_ino,st.st_uid)!=(identity.st_dev,identity.st_ino,os.getuid()):
        raise RuntimeError('cleanup ownership mismatch')
    shutil.rmtree(root)
    if root.exists():raise RuntimeError('cleanup remains')
    print('[cleanup] removed=true',flush=True)
PY
