# 파일 용도: 승인된 공식 qwen3.5:9b 한 종만 기존 제외 경로에 확보하고 metadata를 보존한다.
import hashlib,json,os,pathlib,signal,socket,subprocess,time,urllib.request
repo=pathlib.Path(__file__).resolve().parents[3];out=repo/'docs/release-artifacts/v4.5.0';models=repo/'models/v450-ollama'
old={str(p.relative_to(models)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (models/'manifests').rglob('*') if p.is_file()}
expected=hashlib.sha256((out/'44-registry-9b.json').read_bytes()).hexdigest()
s=socket.socket();s.bind(('127.0.0.1',0));port=s.getsockname()[1];s.close();endpoint=f'http://127.0.0.1:{port}'
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def call(route,data=None,timeout=2):
 req=urllib.request.Request(endpoint+route,None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json'})
 with opener.open(req,timeout=timeout) as response:return response.read()
log=(out/'44-prepare-ollama.log').open('xb');server=None;cleanup={};started=time.monotonic()
try:
 env=dict(os.environ,OLLAMA_HOST=f'127.0.0.1:{port}',OLLAMA_MODELS=str(models),OLLAMA_NOPRUNE='true',OLLAMA_NO_CLOUD='true')
 server=subprocess.Popen(['/opt/homebrew/bin/ollama','serve'],env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
 deadline=time.monotonic()+15
 while True:
  if server.poll() is not None:raise RuntimeError('owned server exited')
  try:version=json.loads(call('/api/version'));break
  except OSError:
   if time.monotonic()>deadline:raise
   time.sleep(.1)
 assert version=={'version':'0.21.0'}
 assert json.loads(call('/api/ps'))['models']==[]
 tags=json.loads(call('/api/tags'))['models'];present=next((m for m in tags if m['name']=='qwen3.5:9b'),None)
 if present:assert present['digest']==expected
 else:
  args=['/opt/homebrew/bin/ollama','pull','qwen3.5:9b']
  with (out/'44-pull.log').open('xb') as f:r=subprocess.run(args,env=env,stdout=f,stderr=subprocess.STDOUT,timeout=1200)
  rc=r.returncode;(out/'44-pull-command.json').write_text(json.dumps({'command':args,'exit':rc,'elapsedSeconds':time.monotonic()-started}))
  if rc:raise RuntimeError('official model pull failed')
 tags=json.loads(call('/api/tags'))['models'];candidate=next(m for m in tags if m['name']=='qwen3.5:9b')
 assert candidate['digest']==expected and candidate['details']['quantization_level']=='Q4_K_M'
 raw=call('/api/show',{'model':'qwen3.5:9b'},timeout=20);(out/'44-model-show.json').write_bytes(raw);show=json.loads(raw)
 for name in ['qwen3-vl:8b-instruct-q4_K_M']:
  (out/'44-baseline-model-show.json').write_bytes(call('/api/show',{'model':name},timeout=20))
 (out/'44-model.json').write_text(json.dumps({'model':candidate,'runtime':version,'officialSource':'https://ollama.com/library/qwen3.5:9b','registry':'https://registry.ollama.ai/v2/library/qwen3.5/manifests/9b','manifestDigest':expected,'showSha256':hashlib.sha256(raw).hexdigest(),'modelPath':str(models),'priorModelManifests':old,'reused':present is not None,'newGenerationCalls':0},ensure_ascii=False,indent=2)+'\n')
 assert 'thinking' in show.get('capabilities',[]) or False in show.get('thinking',{}).get('values',[])
 for path,sha in old.items():assert hashlib.sha256((models/path).read_bytes()).hexdigest()==sha
 cleanup['modelAbsent']=json.loads(call('/api/ps'))['models']==[]
 print('[model]',candidate['name'],candidate['digest'],candidate['size'],candidate['details'],flush=True)
 print('[thinking]',show.get('thinking'),show.get('capabilities'),flush=True)
finally:
 if server:
  server.terminate()
  try:server.wait(timeout=5);cleanup['forced']=False
  except subprocess.TimeoutExpired:os.killpg(server.pid,signal.SIGKILL);server.wait(timeout=5);cleanup['forced']=True
  cleanup['exit']=server.returncode
  try:os.killpg(server.pid,0);cleanup['groupAbsent']=False
  except ProcessLookupError:cleanup['groupAbsent']=True
 log.close()
 with socket.socket() as probe:cleanup['portClosed']=probe.connect_ex(('127.0.0.1',port))!=0
 cleanup['elapsedSeconds']=time.monotonic()-started
 (out/'44-prepare-cleanup.json').write_text(json.dumps(cleanup,indent=2)+'\n');print('[cleanup]',cleanup,flush=True)
assert cleanup['modelAbsent'] and cleanup['portClosed'] and cleanup['groupAbsent'] and not cleanup['forced']
