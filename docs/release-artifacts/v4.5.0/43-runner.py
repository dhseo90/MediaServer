# 파일 용도: 43 고정 후보의 단발 로컬 실행과 소유 서버 정리 기록. 제품/일반 실행 도구가 아니다.
import hashlib, json, os, pathlib, signal, socket, subprocess, time, urllib.request
repo=pathlib.Path(__file__).resolve().parents[3]
artifact=repo/'docs/release-artifacts/v4.5.0'
prior=json.loads((artifact/'38-evaluation-freeze.json').read_text())
plan=json.loads((artifact/'43-request-freeze.json').read_text())
assert len(plan)==6 and len({x['requestSha256'] for x in plan})==6
for item in plan:
    request=item['request']
    assert request['options']==prior['options'] and request['keep_alive']==0 and request['model']==prior['model']['name']
    assert all('images' not in m for m in request['messages'])
model_path=repo/'models/v450-ollama'
manifest=model_path/'manifests/registry.ollama.ai/library/qwen3-vl/8b-instruct-q4_K_M'
assert hashlib.sha256(manifest.read_bytes()).hexdigest()==prior['model']['digest']
for blob in [json.loads(manifest.read_bytes())['config'],*json.loads(manifest.read_bytes())['layers']]:
    path=model_path/'blobs'/blob['digest'].replace(':','-')
    assert path.is_file() and path.stat().st_size==blob['size']
sock=socket.socket();sock.bind(('127.0.0.1',0));port=sock.getsockname()[1];sock.close()
endpoint=f'http://127.0.0.1:{port}'
base=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def get(route):
    with opener.open(endpoint+route,timeout=1) as response:return json.load(response)
def save(name,value):
    with (artifact/name).open('x') as f:json.dump(value,f,ensure_ascii=False,indent=2);f.write('\n')
server=None;cleanup={};rc=None;start=time.monotonic()
log=(artifact/'43-ollama.log').open('xb')
try:
    environment=dict(os.environ,OLLAMA_HOST=f'127.0.0.1:{port}',OLLAMA_MODELS=str(model_path))
    server=subprocess.Popen(['/opt/homebrew/bin/ollama','serve'],env=environment,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
    deadline=time.monotonic()+15
    while True:
        if server.poll() is not None:raise RuntimeError('owned Ollama exited before ready')
        try:version=get('/api/version');break
        except OSError:
            if time.monotonic()>=deadline:raise
            time.sleep(.1)
    assert version==prior['ollama'],version
    tags=get('/api/tags')['models'];model=next(m for m in tags if m['name']==prior['model']['name'])
    assert model['digest']==prior['model']['digest'] and model['details']['quantization_level']==prior['model']['details']['quantization_level']
    assert get('/api/ps')['models']==[]
    paths=['CMakeLists.txt','scripts/internal/va_review_smoke.cpp','scripts/internal/va_review_question_checks.h','scripts/internal/verify_va_review.sh','src/recording/va_review_questions.cpp','include/recording/va_review_questions.h','src/recording/va_review_transport.cpp','src/recording/va_review_core.cpp','test/fixtures/v450_review_questions.json']
    freeze={'codeCommit':base,'model':model,'ollama':version,'options':prior['options'],'keepAlive':0,'limits':prior['limits'],
        'codeFiles':{p:hashlib.sha256((repo/p).read_bytes()).hexdigest() for p in paths},
        'requestPlanSha256':hashlib.sha256((artifact/'43-request-freeze.json').read_bytes()).hexdigest(),
        'fixtureSha256':hashlib.sha256((repo/'test/fixtures/v450_review_questions.json').read_bytes()).hexdigest(),
        'runnerSha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),
        'archiveSha256':hashlib.sha256((repo/'build-gst-onnx/libmedia_server_runtime.a').read_bytes()).hexdigest(),
        'server':{'endpoint':endpoint,'ownedPid':server.pid,'initialModels':[],'modelPath':str(model_path)},
        'inputs':'synthetic explicit core fixtures; one existing-v3 helper with synthetic confirmation; no actual human confirmation or video inference claim',
        'review':'same implementer manual semantic review; no judge model',
        'candidateChangesAfterCallsAllowed':False,'frozenAtUnix':time.time()}
    save('43-evaluation-freeze.json',freeze)
    print('[freeze]',base,endpoint,flush=True)
    command=['bash','scripts/internal/verify_va_review.sh','--questions-local',endpoint]
    with (artifact/'43-local.log').open('xb') as output:
        result=subprocess.run(command,cwd=repo,stdout=output,stderr=subprocess.STDOUT,timeout=870)
        rc=result.returncode
    raw=(artifact/'43-local.log').read_bytes()
    save('43-local-command.json',{'command':command,'exit':rc,'rawSha256':hashlib.sha256(raw).hexdigest()})
    print('[local-exit]',rc,flush=True)
    # 이 조회는 사후 부재이며 wrapper 안의5초 gate를 대체하지 않는다.
    cleanup['postRunModels']=get('/api/ps')['models']
    cleanup['postRunModelAbsent']=cleanup['postRunModels']==[]
finally:
    if server:
        server.terminate()
        try:server.wait(timeout=5);cleanup['serverForced']=False
        except subprocess.TimeoutExpired:
            os.killpg(server.pid,signal.SIGKILL);server.wait(timeout=5);cleanup['serverForced']=True
        cleanup['serverExit']=server.returncode
        try:os.killpg(server.pid,0);cleanup['ownedGroupAbsent']=False
        except ProcessLookupError:cleanup['ownedGroupAbsent']=True
    log.close()
    with socket.socket() as probe:cleanup['portClosed']=probe.connect_ex(('127.0.0.1',port))!=0
    cleanup['elapsedSeconds']=time.monotonic()-start
    save('43-cleanup.json',cleanup)
    print('[cleanup]',json.dumps(cleanup),flush=True)
if rc!=0:raise SystemExit(rc if rc is not None else 1)
assert cleanup['postRunModelAbsent'] and cleanup['portClosed'] and cleanup['ownedGroupAbsent'] and not cleanup['serverForced']
