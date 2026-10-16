import json,math,re,subprocess

def visual_response(body, channels, start=None, end=None, exact_count=None):
 q=body['appliedQuery'];items=body['items']
 assert body['kind']=='visual-frame' and body['scoreMeaning']=='similarity-not-evidence'
 assert q['text']=='ball' and q['limit']==200 and q['threshold']==-1
 assert q['channelIds']==channels and q['startTimeMs']==start and q['endTimeMs']==end
 assert body['returnedItems']==len(items) and 0<len(items)<=200
 if exact_count is not None:assert len(items)==exact_count,'aux200 count'
 assert len({x['id'] for x in items})==len(items)
 previous=None
 for x in items:
  score=x['score'];assert math.isfinite(score) and -1<=score<=1
  key=(-score,x['id']);assert previous is None or previous<=key,'visual order';previous=key
  assert x['channelId'] in channels and x['playable'] is True and x['seekAvailable'] is True
  assert x['timeBasis']=='verified-native-file-presentation' and math.isfinite(x['targetSeconds']) and x['targetSeconds']>=0
  assert x['playbackUrl'].startswith('/ops/api/recordings/media/')
  if start is not None:assert x['timeNs'] is not None and start*1000000<=int(x['timeNs'])<end*1000000
 return items

def public_fresh(body,target):
 assert 1<=target['bucketCount']<=200 and target['freshCount']>0
 assert target['startMs']==int(target['utcNs'])//1000000 and target['endMs']==target['startMs']+1
 items=visual_response(body,[target['channel']],target['startMs'],target['endMs'])
 assert len(items)<=target['bucketCount']
 index=body['index'];assert index['instanceId']==target['instanceId'] and index['generation']==target['generation'],'public-fresh generation'
 found=[x for x in items if x['id']==target['id']];assert len(found)==1,'public-fresh target missing'
 x=found[0];assert x['channelId']==target['channel'] and x['timeNs']==target['utcNs'] and x['playbackUrl']=='/ops/api/recordings/media/'+target['segment']
 assert target['seekTimescale']>0 and int(target['seekTicks'])>=0
 assert abs(x['targetSeconds']-int(target['seekTicks'])/target['seekTimescale'])<=1e-9,'public-fresh exact seek'
 assert int(target['durationTicks'])>0 and abs(x['frameDurationSeconds']-int(target['durationTicks'])/target['seekTimescale'])<=1e-9,'public-fresh frame duration'
 return True

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
 if mode.startswith('source-'):
  broad=[json.loads(x.split(' response=',1)[1]) for x in text.splitlines() if x.startswith('[R118-publication] ')];assert len(broad)==1
  visual_response(broad[0],['9101','9201'],exact_count=200)
  targets=rows('[R133-target] ');fresh=[json.loads(x.split('response=',1)[1]) for x in text.splitlines() if x.startswith('[R133-public-fresh] ')];assert len(targets)==len(fresh)==1
  public_fresh(fresh[0],targets[0])
  wires=rows('[R119-http-wire] ')
  for scope,count in [('original12',3*clients),('auxiliary200',1),('publicFresh',1)]:
   selected=[x for x in wires if x['scope']==scope];assert len(selected)==count
   assert all(x['status']==200 and x['headers'] and x['bytes']>0 and x['failure']=='none' and x['errno']==0 and 0<=x['endNs']-x['beginNs']<=5000000000 for x in selected),'actual wire/deadline'
  assert '[R133-finish-success]' in text and '[R119-stop] server=1' in text and '[R119-stop] visual=1' in text and '[R119-finish] ok=1 error=' in text
 owners=rows('[recording-resource] ');last=[x for x in owners if x['phase']=='after-storage-destruction'];assert len(last)==1
 assert last[0]['readerCleanupHealthy'] and all(last[0][k]==0 for k in ('ram','scratchDisk','scratchFd','scratchRam','preservedDisk','preservedFd')),'final owner'
 space=rows('[R101-space] ');end=rows('[R101-space-end] ');assert len(end)==1 and end[0]['samples']==len(space) and end[0]['endedObserved']
 assert '[R101-space-phase] model' in text and '[R101-space-phase] live' in text and '[R101-space-failure]' not in text
 for s in space:
  m=s['metrics'];f=m['fdObservation'];assert m['valid'] and f['complete'] and f['scope']=='complete-round-sequential-v1' and f['startIdentity']==m['startIdentity']
 js='''import fs from 'node:fs';import {catalogHolderSummary} from './scripts/internal/recording_latency_trace.mjs';import {visualRequestSummary} from './scripts/internal/recording_longrun_progress.mjs';const t=fs.readFileSync(process.argv[1],'utf8');const h=catalogHolderSummary(t,true,[1,2,3],'journal-wait,managed-authority,identity-lookup,cold-read-inclusive'),v=visualRequestSummary(t,true,true,true);console.log(JSON.stringify({holder:h,requests:v}));if(h.status!=='captured'||v.status!=='captured'||v.rows.length!==Number(process.argv[2]))process.exitCode=1;'''
 completed=subprocess.run(['node','--input-type=module','-e',js,str(root/'output.log'),str(3*min(clients,2)+(2 if mode.startswith("source-") else 0))],cwd=repo,capture_output=True,text=True,timeout=15)
 (root/'trace-analysis.json').write_text(completed.stdout);assert completed.returncode==0,'trace completeness/basis'
 (root/'http-bodies.json').write_text(json.dumps(bodies,indent=2)+'\n')
 return {'requests':len(requests),'p95Ms':times[math.ceil(len(times)*.95)-1],'maxMs':max(times),'spaceSamples':len(space),'scope':'actual HTTP/writer/index/retention; no evidence-A continuous mixed load; shape/order/seek metadata not exhaustive topk oracle','ownerFinal':last[0]}
