import json,math,re,subprocess

def qualify(root,repo,mode):
 clients=1 if mode=='single' else 2 if mode=='visual-pair' else 4
 text=(root/'output.log').read_text();requests=[];bodies=[]
 def rows(prefix):return [json.loads(x[len(prefix):]) for x in text.splitlines() if x.startswith(prefix)]
 for line in text.splitlines():
  if not line.startswith('[R107-http] '):continue
  m=re.fullmatch(r'\[R107-http\] round=(\d+) client=(\d+) ms=([0-9.e+-]+) response=(.*)',line);assert m,'request parse'
  rnd,client,ms,raw=m.groups();rnd,client,ms=int(rnd),int(client),float(ms);b=json.loads(raw);items=b['items']
  assert 0<len(items)<=20 and len({x['id'] for x in items})==len(items),'result IDs'
  assert math.isfinite(ms) and 0<=ms<=5000,'request deadline'
  if client<2:
   assert b['appliedQuery']['text']=='ball' and b['appliedQuery']['limit']==20 and b['appliedQuery']['threshold']==-1
   previous=None
   for x in items:
    score=x['score'];assert math.isfinite(score) and -1<=score<=1
    key=(-score,x['id']);assert previous is None or previous<=key;previous=key
    assert x['channelId'] in ('9101','9201') and x['playable'] and x['seekAvailable']
    assert x['timeBasis']=='verified-native-file-presentation' and math.isfinite(x['targetSeconds']) and x['targetSeconds']>=0
  else:
   assert b['schema']=='media-server.recording-search.v1' and all(x['channelId']=='9101' for x in items)
  requests.append((rnd,client,ms));bodies.append({'round':rnd,'client':client,'body':b})
 assert sorted((r,c) for r,c,t in requests)==[(r,c) for r in range(3) for c in range(clients)]
 times=sorted(t for r,c,t in requests);assert times[math.ceil(len(times)*.95)-1]<=2000,'p95'
 assert re.search(rf'^\[R107-result\] failures=0 count={3*clients} ',text,re.M),'all statuses/result'
 assert (re.search(r'\[R107-background\] writes=([0-9]+)',text) and '[R107-fail]' not in text) if mode.startswith('source-') else '[R107-background] writes=6 ' in text and '[R107-fail]' not in text
 owners=rows('[recording-resource] ');last=[x for x in owners if x['phase']=='after-storage-destruction'];assert len(last)==1
 assert last[0]['readerCleanupHealthy'] and all(last[0][k]==0 for k in ('ram','scratchDisk','scratchFd','scratchRam','preservedDisk','preservedFd')),'final owner'
 space=rows('[R101-space] ');end=rows('[R101-space-end] ');assert len(end)==1 and end[0]['samples']==len(space) and end[0]['endedObserved']
 assert '[R101-space-phase] model' in text and '[R101-space-phase] live' in text and '[R101-space-failure]' not in text
 for s in space:
  m=s['metrics'];f=m['fdObservation'];assert m['valid'] and f['complete'] and f['scope']=='complete-round-sequential-v1' and f['startIdentity']==m['startIdentity']
 js='''import fs from 'node:fs';import {catalogHolderSummary} from './scripts/internal/recording_latency_trace.mjs';import {visualRequestSummary} from './scripts/internal/recording_longrun_progress.mjs';const t=fs.readFileSync(process.argv[1],'utf8');const h=catalogHolderSummary(t,true,[1,2,3],'journal-wait,managed-authority,identity-lookup,cold-read-inclusive'),v=visualRequestSummary(t,true,true,true);console.log(JSON.stringify({holder:h,requests:v}));if(h.status!=='captured'||v.status!=='captured'||v.rows.length!==Number(process.argv[2]))process.exitCode=1;'''
 completed=subprocess.run(['node','--input-type=module','-e',js,str(root/'output.log'),str(3*min(clients,2)+(1 if mode.startswith("source-") else 0))],cwd=repo,capture_output=True,text=True,timeout=15)
 (root/'trace-analysis.json').write_text(completed.stdout);assert completed.returncode==0,'trace completeness/basis'
 (root/'http-bodies.json').write_text(json.dumps(bodies,indent=2)+'\n')
 return {'requests':len(requests),'p95Ms':times[math.ceil(len(times)*.95)-1],'maxMs':max(times),'spaceSamples':len(space),'scope':'actual HTTP/writer/index/retention; no evidence-A continuous mixed load; shape/order/seek metadata not exhaustive topk oracle','ownerFinal':last[0]}
