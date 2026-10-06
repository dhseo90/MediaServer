# 파일 용도: 47 서버 초안 편집의 고정6요청. 기존45 runtime/model을 읽고 설치 없이 실행한다.
import hashlib, json, os, pathlib, signal, socket, subprocess, time, urllib.request
repo=pathlib.Path(__file__).resolve().parents[3]
artifact=repo/'docs/release-artifacts/v4.5.0'
prior=json.loads((artifact/'38-evaluation-freeze.json').read_text())
plan=json.loads((artifact/'47-request-freeze.json').read_text())
baseline_plan=json.loads((artifact/'45-request-freeze.json').read_text())
renderer_plan=json.loads((artifact/'46-validation.json').read_text())['cases']
previous_freeze=json.loads((artifact/'45-evaluation-freeze.json').read_text())
selected=json.loads((artifact/'45-model.json').read_text())
for i,(before,after) in enumerate(zip(baseline_plan,plan)):
    assert after['case']==before['case'] and after['materials']==renderer_plan[i]['output']
    assert {k:v for k,v in after['request'].items() if k!='messages'}=={k:v for k,v in before['request'].items() if k!='messages'}
    context=json.loads(after['request']['messages'][1]['content'])
    assert set(context)=={'task','slots'} and [s['draftText'] for s in context['slots']]==[s['text'] for s in after['materials']['items']]
assert len(plan)==6 and len({x['requestSha256'] for x in plan})==6
for item in plan:
    request=item['request']
    assert request['options']==prior['options'] and request['keep_alive']==0 and request['model']==selected['model']['name'] and request['think'] is False
    assert all('images' not in m for m in request['messages'])
model_path=repo/'models/v450-question-eval/models'
binary=repo/'models/v450-question-eval/ollama-v0.35.1/ollama'
manifest=model_path/'manifests/registry.ollama.ai/library/qwen3.5/9b'
assert hashlib.sha256(manifest.read_bytes()).hexdigest()==selected['model']['digest']
assert hashlib.sha256(binary.read_bytes()).hexdigest()==previous_freeze['binarySha256']
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
log=(artifact/'47-ollama.log').open('xb')
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
    request=urllib.request.Request(endpoint+'/api/show',json.dumps({'model':selected['model']['name']}).encode(),headers={'Content-Type':'application/json'})
    with opener.open(request,timeout=10) as response:show_raw=response.read()
    show=json.loads(show_raw);previous_show=json.loads((artifact/'45-model-show.json').read_text())
    for field in ('template','parameters','details','capabilities'):
        assert show.get(field)==previous_show.get(field), 'runtime/model metadata changed: '+field
    save('47-model-metadata.json',{'version':version,'model':model,'template':show.get('template'),'parameters':show.get('parameters'),'capabilities':show.get('capabilities'),'showSha256':hashlib.sha256(show_raw).hexdigest(),'sameAs45MetadataFields':['template','parameters','details','capabilities']})

    paths=['CMakeLists.txt','scripts/internal/va_review_smoke.cpp','scripts/internal/va_review_question_checks.h','scripts/internal/va_review_rephrase_checks.h','scripts/internal/verify_va_review.sh','src/recording/va_review_questions.cpp','src/recording/va_review_material_requests.cpp','include/recording/va_review_material_requests.h','include/recording/va_review_questions.h','src/recording/va_review_transport.cpp','src/recording/va_review_core.cpp','test/fixtures/v450_review_questions.json']
    freeze={'baseCommit':base,'trackedDiffSha256':hashlib.sha256(subprocess.check_output(['git','diff','HEAD'],cwd=repo)).hexdigest(),'binary':str(binary),'binarySha256':hashlib.sha256(binary.read_bytes()).hexdigest(),'model':model,'ollama':version,'options':prior['options'],'keepAlive':0,'limits':prior['limits'],
        'codeFiles':{p:hashlib.sha256((repo/p).read_bytes()).hexdigest() for p in paths},
        'requestPlanSha256':hashlib.sha256((artifact/'47-request-freeze.json').read_bytes()).hexdigest(),
        'fixtureSha256':hashlib.sha256((repo/'test/fixtures/v450_review_questions.json').read_bytes()).hexdigest(),
        'runnerSha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),
        'archiveSha256':hashlib.sha256((repo/'build-gst-onnx/libmedia_server_runtime.a').read_bytes()).hexdigest(),
        'server':{'endpoint':endpoint,'ownedPid':server.pid,'initialModels':[],'modelPath':str(model_path)},
        'inputs':'synthetic explicit core fixtures; one existing-v3 helper with synthetic confirmation; no actual human confirmation or video inference claim',
        'review':'same implementer manual semantic review; no judge model','semanticCriteriaSha256':hashlib.sha256((artifact/'47-criteria.json').read_bytes()).hexdigest(),'comparison':'server-draft meaning-preserving editing; different input task from45 gap-driven generation','think':False,'showSha256':selected['showSha256'],
        'candidateChangesAfterCallsAllowed':False,'frozenAtUnix':time.time()}
    save('47-evaluation-freeze.json',freeze)
    print('[freeze]',base,endpoint,flush=True)
    command=['bash','scripts/internal/verify_va_review.sh','--rephrase-local',endpoint]
    with (artifact/'47-local.log').open('xb') as output:
        result=subprocess.run(command,cwd=repo,stdout=output,stderr=subprocess.STDOUT,timeout=870,env=dict(os.environ,MEDIA_SERVER_VA_QUESTION_CANDIDATE=str(artifact/'45-candidate.json'),MEDIA_SERVER_VA_QUESTION_PLAN=str(artifact/'45-request-freeze.json')))
        rc=result.returncode
    raw=(artifact/'47-local.log').read_bytes()
    save('47-local-command.json',{'command':command,'exit':rc,'rawSha256':hashlib.sha256(raw).hexdigest()})
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
    save('47-cleanup.json',cleanup)
    print('[cleanup]',json.dumps(cleanup),flush=True)
if rc!=0:raise SystemExit(rc if rc is not None else 1)
assert cleanup['postRunModelAbsent'] and cleanup['portClosed'] and cleanup['ownedGroupAbsent'] and not cleanup['serverForced']
