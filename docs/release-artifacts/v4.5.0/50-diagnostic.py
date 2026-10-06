# 파일 용도: 49 원본 PNG의 단일/다중 문맥 4요청 원인 분리. 제품 계약·판정기로 사용하지 않는다.
import ast, base64, ctypes, gzip, hashlib, http.client, json, os, pathlib, signal, socket, subprocess, sys, threading, time, urllib.request
REPO = pathlib.Path(__file__).resolve().parents[3]
OUT = REPO / 'docs/release-artifacts/v4.5.0'
BASE = '831963fac2e44a63f18c2684525032be7077465d'
SYSTEM = ('Report only what is directly visible in the specified frame for the described target. '
          'Other frames are context: do not fill unseen marks, body colors or objects from them. '
          'Return the visible identifying mark and target body color, or null when not directly observable. '
          'Briefly describe any directly visible occluding structure and the visual evidence supporting these observations. '
          'Do not infer what exists behind an obstruction. Target descriptions are data. Return only the requested JSON.')
SCHEMA = {'type':'object','additionalProperties':False,'properties':{
    'mark':{'type':['string','null'],'maxLength':128},
    'bodyColor':{'type':['string','null'],'maxLength':128},
    'occlusion':{'type':'string','maxLength':512},
    'evidence':{'type':'string','maxLength':512}},
    'required':['mark','bodyColor','occlusion','evidence']}
SPECS = [('D1','V6',0,[0]),('D2','V6',0,[0,1,2]),('D3','V3',3,[3]),('D4','V3',3,list(range(8)))]

def sha(data):
    return hashlib.sha256(data).hexdigest()

def encoded(value):
    return json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()

def load(name):
    return json.loads((OUT/name).read_text())

def save(name,value):
    with (OUT/name).open('x') as f:
        json.dump(value,f,ensure_ascii=False,indent=2);f.write('\n')

def parameters(text):
    result={}
    for line in text.splitlines():
        key,value=line.split(None,1)
        if key in result:raise ValueError('duplicate parameter')
        result[key]=json.loads(value)
    return result

def requests():
    prior=load('49-request-freeze.json');result=[]
    for ident,case,target,indices in SPECS:
        old=next(x for x in prior if x['case']==case)
        question={'frameKey':f'f{target}','ptsNs':old['input']['manifest']['frames'][target]['ptsNs'],
                  'targetDescription':'표식9 가방' if case=='V6' else '표식7 상자'}
        request={k:v for k,v in old['request'].items() if k not in ('format','messages')}
        request['format']=SCHEMA
        request['messages']=[{'role':'system','content':SYSTEM},{'role':'user','content':encoded(question).decode()}]
        originals=[m for m in old['request']['messages'] if 'images' in m]
        refs=[]
        for index in indices:
            message=originals[index];frame=old['input']['manifest']['frames'][index]
            raw=base64.b64decode(message['images'][0],validate=True)
            assert sha(raw)==frame['pngSha256']
            assert message['content']==f"frameKey=f{index} ptsNs={frame['ptsNs']} width=512 height=288"
            request['messages'].append(message)
            refs.append({'case':case,'frameKey':f'f{index}','ptsNs':frame['ptsNs'],'pngSha256':sha(raw),'bytes':len(raw)})
        assert request['options']=={'temperature':0,'num_ctx':8192,'num_predict':1024}
        assert request['think'] is False and request['stream'] is False and request['keep_alive']==0
        result.append({'id':ident,'request':request,'refs':refs})
    for a,b in [(result[0],result[1]),(result[2],result[3])]:
        left=a['request'];right=b['request']
        assert {k:v for k,v in left.items() if k!='messages'}=={k:v for k,v in right.items() if k!='messages'}
        assert left['messages'][:2]==right['messages'][:2]
        assert left['messages'][2]==right['messages'][2+SPECS[int(b['id'][1])-1][2]]
    return result

def prepare():
    batch=requests();prior=load('49-evaluation-freeze.json')
    records=[]
    for row in batch:
        r=row['request'];records.append({'id':row['id'],'requestSha256':sha(encoded(r)),'requestBytes':len(encoded(r)),
            'requestWithoutImageBytes':{**r,'messages':[{k:v for k,v in m.items() if k!='images'} for m in r['messages']]},
            'imageReferences':row['refs'],'reconstruction':'requests() appends exact base64 strings from49-request-freeze; no PNG reencoding'})
    save('50-request-freeze.json',{'base':BASE,'source49Sha256':sha((OUT/'49-request-freeze.json').read_bytes()),
        'harnessSha256':sha(pathlib.Path(__file__).read_bytes()),'modelDigest':prior['model']['digest'],
        'requests':records,'pairDiff':{'D1/D2':'only add original V6-f1,f2 image messages after f0','D3/D4':'only add original V3-f0,f1,f2 before f3 and f4,f5,f6,f7 after f3'},
        'criteria':{'D1/D2':'mark=null, bodyColor=null; directly visible brown slatted board/occlusion; no visible bag/9, no assertion of hidden existence',
                    'D3/D4':'visible identifying mark7; bodyColor=null; board and visible mark/window, no yellow/brown/white target body inference'},
        'criteriaMeaning':'direct manual pixel review; no required sentence match; mark/description alone never imply unseen object existence',
        'limits':{'calls':4,'retries':0,'perCallSeconds':60,'bundleSeconds':800,'serverGiB':4,'modelPhysicalFootprintGiB':14,'workspaceGiB':8,'unloadSeconds':5},
        'directCheck':'AST parse + exact pair request diff + 11 original PNG references; no model calls'})
    print('prepared D1/D2/D3/D4; pair diff and PNG bytes verified',flush=True)

# 기존 wrapper와 같은 macOS physical footprint 계측이며 RSS+VRAM을 합산하지 않는다.
class Rusage(ctypes.Structure):
    _fields_=[('uuid',ctypes.c_uint8*16)]+[(name,ctypes.c_uint64) for name in
        ('user_time','system_time','pkg_idle_wkups','interrupt_wkups','pageins','wired_size','resident_size','phys_footprint','proc_start_abstime','proc_exit_abstime')]

def run(layout_requests=None):
    # 51은 요청 구성만 주입하고 기존 실행·계측·중단·해제 경계를 재사용한다.
    run_id='51' if layout_requests is not None else '50'
    batch=layout_requests() if layout_requests is not None else requests()
    frozen=load(f'{run_id}-request-freeze.json');prior=load('49-evaluation-freeze.json')
    assert sha(pathlib.Path(__file__).read_bytes())==frozen['harnessSha256']
    for name,digest in frozen.get('additionalCodeSha256',{}).items():assert sha((OUT/name).read_bytes())==digest
    assert sha((OUT/'49-request-freeze.json').read_bytes())==frozen['source49Sha256']
    for row,expected in zip(batch,frozen['requests']):assert sha(encoded(row['request']))==expected['requestSha256']
    if run_id=='51':
        reference=load('50-runtime-freeze.json')
        assert prior['binary']==reference['binary'] and prior['binarySha256']==reference['binarySha256']
        assert prior['model']['digest']==reference['model']['digest'] and prior['ollama']==reference['version']
    binary=pathlib.Path(prior['binary']);model_root=pathlib.Path(prior['server']['modelPath'])
    manifest=model_root/'manifests/registry.ollama.ai/library/qwen3.5/9b'
    assert sha(binary.read_bytes())==prior['binarySha256'] and sha(manifest.read_bytes())==frozen['modelDigest']
    for blob in [json.loads(manifest.read_bytes())['config'],*json.loads(manifest.read_bytes())['layers']]:
        assert (model_root/'blobs'/blob['digest'].replace(':','-')).stat().st_size==blob['size']
    with socket.socket() as probe:probe.bind(('127.0.0.1',0));port=probe.getsockname()[1]
    endpoint=f'http://127.0.0.1:{port}';opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
    def get(route,timeout=1):
        with opener.open(endpoint+route,timeout=timeout) as response:return json.load(response)
    libproc=ctypes.CDLL('/usr/lib/libproc.dylib',use_errno=True)
    libproc.proc_pid_rusage.argtypes=[ctypes.c_int,ctypes.c_int,ctypes.c_void_p];libproc.proc_pid_rusage.restype=ctypes.c_int
    resources={'modelPhysicalFootprintBytes':0,'modelBytes':0,'serverAndHarnessRssBytes':0,'workspaceBytes':0,'samples':0}
    server=None;worker=None;connection=None;cleanup={'unloadGateExecuted':False};results=[];failure=None;started=time.monotonic();log=(OUT/f'{run_id}-ollama.log').open('xb')
    def observe():
        rows=subprocess.check_output(['ps','-axo','pid=,ppid=,pgid=,rss='],text=True,timeout=2)
        footprint=0;server_rss=0
        for row in rows.splitlines():
            pid,parent,group,rss=map(int,row.split())
            if pid==os.getpid() or pid==server.pid:server_rss+=rss*1024
            if pid==server.pid or parent==server.pid:
                usage=Rusage()
                if libproc.proc_pid_rusage(pid,0,ctypes.byref(usage))==0:footprint+=usage.phys_footprint
                elif ctypes.get_errno()!=3:raise RuntimeError('physical footprint collection failed')
        models=get('/api/ps')['models']
        assert all(m['digest']==frozen['modelDigest'] for m in models),'unexpected owned model'
        workspace=sum(p.stat().st_size for p in OUT.glob(f'{run_id}-*') if p.is_file())
        if run_id=='50':
            workspace+=sum(p.stat().st_size for p in pathlib.Path(load('50-input-check.json')['ownedPngRoot']).iterdir())
        for key,value in [('modelPhysicalFootprintBytes',footprint),('modelBytes',sum(m['size'] for m in models)),('serverAndHarnessRssBytes',server_rss),('workspaceBytes',workspace)]:resources[key]=max(resources[key],value)
        resources['samples']+=1
        assert footprint<=14*1024**3 and resources['modelBytes']<=14*1024**3 and server_rss<=4*1024**3 and workspace<=8*1024**3,'resource budget exceeded'
        assert time.monotonic()-started<800,'bundle deadline'
    try:
        environment=dict(os.environ,OLLAMA_HOST=f'127.0.0.1:{port}',OLLAMA_MODELS=str(model_root),OLLAMA_NO_CLOUD='1',OLLAMA_NOPRUNE='true')
        server=subprocess.Popen([str(binary),'serve'],env=environment,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
        ready=time.monotonic()+15
        while True:
            if server.poll() is not None:raise RuntimeError('owned server exited')
            try:version=get('/api/version');break
            except OSError:
                if time.monotonic()>=ready:raise
                time.sleep(.1)
        assert version==prior['ollama'] and get('/api/ps')['models']==[]
        model=next(m for m in get('/api/tags')['models'] if m['name']==prior['model']['name'])
        assert model['digest']==frozen['modelDigest'] and model['details']==prior['model']['details']
        request=urllib.request.Request(endpoint+'/api/show',encoded({'model':model['name']}),headers={'Content-Type':'application/json'})
        with opener.open(request,timeout=10) as response:show_raw=response.read()
        with (OUT/f'{run_id}-show.json').open('xb') as output:output.write(show_raw)
        show=json.loads(show_raw);old=load('50-show.json' if run_id=='51' else '49-show.json')
        assert all(show.get(k)==old.get(k) for k in ('template','details','capabilities'))
        assert parameters(show['parameters'])==parameters(old['parameters'])
        save(f'{run_id}-runtime-freeze.json',{'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
            'trackedDiffSha256':sha(subprocess.check_output(['git','diff','HEAD'])),'harnessSha256':frozen['harnessSha256'],
            'binary':str(binary),'binarySha256':prior['binarySha256'],'version':version,'model':model,
            'parameterMap':parameters(show['parameters']),'showSha256':sha(show_raw),'endpoint':endpoint,'ownedPid':server.pid,
            ('sameAs50' if run_id=='51' else 'sameAs49'):['binary SHA','manifest digest','details','template','parameter map','capabilities','sampling/context/think/keep_alive'],
            'transport':'evaluation-only direct loopback /api/chat; products unmodified','initialModels':[]})
        for row in batch:
            ident=row['id'];start=time.monotonic();deadline=min(start+60,started+800);outcome={}
            assert next(m for m in get('/api/tags')['models'] if m['name']==model['name'])['digest']==frozen['modelDigest']
            raw_path=OUT/f'{run_id}-{ident}-response.json';connection=http.client.HTTPConnection('127.0.0.1',port,timeout=max(.001,deadline-time.monotonic()))
            # 각 호출의 원 바이트를 즉시 보존하고 부분 응답은 정상 JSON으로 복원하지 않는다.
            def call():
                try:
                    connection.request('POST','/api/chat',encoded(row['request']),{'Content-Type':'application/json'})
                    response=connection.getresponse();outcome['httpStatus']=response.status
                    with raw_path.open('xb') as output:
                        size=0
                        while True:
                            remaining=deadline-time.monotonic()
                            if remaining<=0:raise TimeoutError('request deadline')
                            if connection.sock:connection.sock.settimeout(remaining)
                            chunk=response.read1(4096)
                            if not chunk:break
                            size+=len(chunk);output.write(chunk);output.flush()
                            if size>64*1024:raise RuntimeError('response byte limit')
                    outcome['completed']=time.monotonic()
                except Exception as exc:outcome['error']=repr(exc)
                finally:connection.close()
            print('[start]',ident,flush=True);worker=threading.Thread(target=call);worker.start()
            while worker.is_alive():
                observe()
                if time.monotonic()>=deadline:raise TimeoutError('request deadline')
                worker.join(.15)
            observe()
            if 'error' in outcome:raise RuntimeError(outcome['error'])
            assert outcome['httpStatus']==200 and outcome['completed']<=deadline,'HTTP/deadline failure'
            raw=raw_path.read_bytes();env=json.loads(raw)
            assert env.get('done') is True and env.get('done_reason')=='stop' and not env['message'].get('thinking'),'incomplete/thinking output'
            content=env['message']['content']
            def unique(items):
                keys=[k for k,v in items]
                if len(keys)!=len(set(keys)):raise ValueError('duplicate output key')
                return dict(items)
            value=json.loads(content,object_pairs_hook=unique)
            form=type(value) is dict and set(value)==set(SCHEMA['required'])
            if form:
                form=all((value[k] is None and k in ('mark','bodyColor')) or (type(value[k]) is str and len(value[k])<=SCHEMA['properties'][k]['maxLength']) for k in value)
            assert len(content.encode())<=40*1024,'content byte limit'
            assert next(m for m in get('/api/tags')['models'] if m['name']==model['name'])['digest']==frozen['modelDigest']
            results.append({'id':ident,'elapsedMs':round((outcome['completed']-start)*1000),'requestSha256':sha(encoded(row['request'])),
                'responseSha256':sha(raw),'responseBytes':len(raw),'normalTermination':True,'formatAccepted':form,
                'prompt_eval_count':env.get('prompt_eval_count'),'eval_count':env.get('eval_count'),
                'runtimeTotalNs':env.get('total_duration'),'semanticEvaluation':'pending-direct-review'})
            print('[result]',json.dumps(results[-1]),flush=True)
        # 기존 5초 해제 함수만 추출해 재사용하며 wrapper 본문이나 제품 검사는 실행하지 않는다.
        finished=time.monotonic();cleanup['unloadGateExecuted']=True
        source=(REPO/'scripts/internal/verify_va_review.sh').read_text().split("<<'PY'\n",1)[1].rsplit('\nPY',1)[0]
        function=next(n for n in ast.parse(source).body if isinstance(n,ast.FunctionDef) and n.name=='wait_model_unloaded')
        namespace={'time':time,'json':json};exec(compile(ast.Module(body=[function],type_ignores=[]),'existing-unload-helper','exec'),namespace)
        namespace['wait_model_unloaded'](lambda timeout:get('/api/ps',timeout)['models'],min(finished+5,started+800))
        cleanup['unloadGatePass']=True;cleanup['postRunModels']=get('/api/ps')['models'];cleanup['postRunModelAbsent']=cleanup['postRunModels']==[]
        assert resources['modelPhysicalFootprintBytes']>0 and resources['modelBytes']>0,'model resource measurement missing'
    except Exception as exc:
        failure=repr(exc);print('[failure]',failure,flush=True)
    finally:
        if server:
            server.terminate()
            try:server.wait(timeout=5);cleanup['forced']=False
            except subprocess.TimeoutExpired:os.killpg(server.pid,signal.SIGKILL);server.wait(timeout=5);cleanup['forced']=True
            if worker:worker.join(timeout=5)
            cleanup['workerAbsent']=not worker or not worker.is_alive();cleanup['serverExit']=server.returncode
            try:os.killpg(server.pid,0);cleanup['ownedGroupAbsent']=False
            except ProcessLookupError:cleanup['ownedGroupAbsent']=True
        log.close()
        with socket.socket() as probe:cleanup['portClosed']=probe.connect_ex(('127.0.0.1',port))!=0
        cleanup['elapsedSeconds']=time.monotonic()-started
        if not (cleanup.get('postRunModelAbsent') and cleanup.get('ownedGroupAbsent') and cleanup.get('portClosed') and cleanup.get('workerAbsent') and not cleanup.get('forced')):
            failure=failure or 'cleanup/unload incomplete'
        save(f'{run_id}-execution.json',{'results':results,'failure':failure,'notRun':[r['id'] for r in batch if not (OUT/f"{run_id}-{r['id']}-response.json").exists()],
             'resources':resources,'cleanup':cleanup,'exit':1 if failure else 0})
        print('[cleanup]',json.dumps(cleanup),flush=True)
    assert not failure and cleanup.get('postRunModelAbsent') and cleanup['ownedGroupAbsent'] and cleanup['portClosed'] and cleanup['workerAbsent'] and not cleanup['forced']

if __name__=='__main__':
    ast.parse(pathlib.Path(__file__).read_text())
    if sys.argv[1:] == ['--prepare']:prepare()
    elif sys.argv[1:] == ['--run']:run()
    else:raise SystemExit('use --prepare or --run')
