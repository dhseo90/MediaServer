# 파일 용도: 45 후보/별도 runtime의 고정6요청 단발 실행과 소유 서버 정리 기록.
import hashlib, json, os, pathlib, signal, socket, subprocess, time, urllib.request
repo=pathlib.Path(__file__).resolve().parents[3]
artifact=repo/'docs/release-artifacts/v4.5.0'
prior=json.loads((artifact/'38-evaluation-freeze.json').read_text())
plan=json.loads((artifact/'45-request-freeze.json').read_text())
baseline_plan=json.loads((artifact/'43-request-freeze.json').read_text())
selected=json.loads((artifact/'45-model.json').read_text())
for before,after in zip(baseline_plan,plan):
    assert after['case']==before['case'] and after['decisions']==before['decisions']
    assert after['request']==dict(before['request'],model=selected['model']['name'],think=False)
assert len(plan)==6 and len({x['requestSha256'] for x in plan})==6
for item in plan:
    request=item['request']
    assert request['options']==prior['options'] and request['keep_alive']==0 and request['model']==selected['model']['name'] and request['think'] is False
    assert all('images' not in m for m in request['messages'])
model_path=repo/'models/v450-question-eval/models'
binary=repo/'models/v450-question-eval/ollama-v0.35.1/ollama'
manifest=model_path/'manifests/registry.ollama.ai/library/qwen3.5/9b'
assert hashlib.sha256(manifest.read_bytes()).hexdigest()==selected['model']['digest']
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
log=(artifact/'45-ollama.log').open('xb')
try:
    environment=dict(os.environ,OLLAMA_HOST=f'127.0.0.1:{port}',OLLAMA_MODELS=str(model_path),OLLAMA_NO_CLOUD='1',OLLAMA_NOPRUNE='true')
    server=subprocess.Popen([str(binary),'serve'],env=environment,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
    deadline=time.monotonic()+15
    while True:
        if server.poll() is not None:raise RuntimeError('owned Ollama exited before ready')
        try:version=get('/api/version');break
        except OSError:
            if time.monotonic()>=deadline:raise
            time.sleep(.1)
    assert version=={'version':'0.35.1'},version
    tags=get('/api/tags')['models'];model=next(m for m in tags if m['name']==selected['model']['name'])
    assert model['digest']==selected['model']['digest'] and model['details']['quantization_level']==selected['model']['details']['quantization_level']
    assert get('/api/ps')['models']==[]
    paths=['CMakeLists.txt','scripts/internal/va_review_smoke.cpp','scripts/internal/va_review_question_checks.h','scripts/internal/verify_va_review.sh','src/recording/va_review_questions.cpp','include/recording/va_review_questions.h','src/recording/va_review_transport.cpp','src/recording/va_review_core.cpp','test/fixtures/v450_review_questions.json']
    freeze={'baseCommit':base,'trackedDiffSha256':hashlib.sha256(subprocess.check_output(['git','diff','HEAD'],cwd=repo)).hexdigest(),'binary':str(binary),'binarySha256':hashlib.sha256(binary.read_bytes()).hexdigest(),'model':model,'ollama':version,'options':prior['options'],'keepAlive':0,'limits':prior['limits'],
        'codeFiles':{p:hashlib.sha256((repo/p).read_bytes()).hexdigest() for p in paths},
        'requestPlanSha256':hashlib.sha256((artifact/'45-request-freeze.json').read_bytes()).hexdigest(),
        'fixtureSha256':hashlib.sha256((repo/'test/fixtures/v450_review_questions.json').read_bytes()).hexdigest(),
        'runnerSha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),
        'archiveSha256':hashlib.sha256((repo/'build-gst-onnx/libmedia_server_runtime.a').read_bytes()).hexdigest(),
        'server':{'endpoint':endpoint,'ownedPid':server.pid,'initialModels':[],'modelPath':str(model_path)},
        'inputs':'synthetic explicit core fixtures; one existing-v3 helper with synthetic confirmation; no actual human confirmation or video inference claim',
        'review':'same implementer manual semantic review; no judge model','semanticCriteriaSha256':hashlib.sha256((artifact/'43-evaluation.json').read_bytes()).hexdigest(),'comparison':'new model and runtime combination; not isolated model effect','think':False,'showSha256':selected['showSha256'],
        'candidateChangesAfterCallsAllowed':False,'frozenAtUnix':time.time()}
    save('45-evaluation-freeze.json',freeze)
    print('[freeze]',base,endpoint,flush=True)
    command=['bash','scripts/internal/verify_va_review.sh','--questions-local',endpoint]
    with (artifact/'45-local.log').open('xb') as output:
        result=subprocess.run(command,cwd=repo,stdout=output,stderr=subprocess.STDOUT,timeout=870,env=dict(os.environ,MEDIA_SERVER_VA_QUESTION_CANDIDATE=str(artifact/'45-candidate.json'),MEDIA_SERVER_VA_QUESTION_PLAN=str(artifact/'45-request-freeze.json')))
        rc=result.returncode
    raw=(artifact/'45-local.log').read_bytes()
    save('45-local-command.json',{'command':command,'exit':rc,'rawSha256':hashlib.sha256(raw).hexdigest()})
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
    save('45-cleanup.json',cleanup)
    print('[cleanup]',json.dumps(cleanup),flush=True)
if rc!=0:raise SystemExit(rc if rc is not None else 1)
assert cleanup['postRunModelAbsent'] and cleanup['portClosed'] and cleanup['ownedGroupAbsent'] and not cleanup['serverForced']
