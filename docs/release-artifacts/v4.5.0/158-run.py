from pathlib import Path
import os,sys,json,subprocess,time,signal,hashlib,copy
root=Path(__file__).parent;repo=Path('<REPO>');sys.path.insert(0,str(repo/'scripts/internal'));import recording_lock_timing as q
cases=[('normal','normal',1,0,0,True),('holder','normal',1,1,0,True),('disabled','normal',0,1,0,True),('aggregate','aggregate',1,0,0,True),('slow','slow',1,0,1,True),('lost-output','lost-output',1,0,0,False),('cap','cap',1,0,0,False),('byte-cap','byte-cap',1,0,0,False)]
results=[]
for name,mode,enabled,holder,slow,expect in cases:
 env={k:v for k,v in os.environ.items() if not k.startswith('MEDIA_SERVER_')};env.update(MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE=str(enabled),MEDIA_SERVER_VERIFY_CATALOG_HOLDER_TRACE=str(holder),MEDIA_SERVER_VERIFY_RECORDING_LATENCY_SLOW_ONLY=str(slow))
 t=time.monotonic();p=subprocess.Popen([str(root/'focused'),mode],cwd=root,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True)
 try:out,err=p.communicate(timeout=5)
 except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGKILL);out,err=p.communicate();raise
 (root/(name+'.stdout')).write_bytes(out);(root/(name+'.stderr')).write_bytes(err)
 raw=(out+err).decode();error=None;v=None
 try:v=q.qualify(raw,mode,expected=(enabled,holder,slow))
 except Exception as e:error=str(e)
 try:os.killpg(p.pid,0);absent=False
 except ProcessLookupError:absent=True
 row={'case':name,'mode':mode,'env':{k:v for k,v in env.items() if k.startswith('MEDIA_SERVER_')},'pid':p.pid,'exit':p.returncode,'seconds':time.monotonic()-t,'stdoutBytes':len(out),'stderrBytes':len(err),'stdoutSha256':hashlib.sha256(out).hexdigest(),'stderrSha256':hashlib.sha256(err).hexdigest(),'expectedQualified':expect,'qualified':v,'rejection':error,'groupAbsent':absent};results.append(row);(root/'results.json').write_text(json.dumps(results,indent=2)+'\n')
 assert p.returncode==0 and absent and bool(v)==expect,row
 print(name,'accepted' if v else 'rejected '+str(error))
# Mutate real, valid native observations; never infer missing original records.
raw=(root/'normal.stdout').read_text()+(root/'normal.stderr').read_text();g=q.parse(raw)
def fmt(g):
 return ''.join('[R158-call] '+json.dumps(x)+'\n' for x in g['calls'])+''.join('[recording-latency] '+json.dumps(x)+'\n' for x in g['rows'])+'[R158-end] '+json.dumps(g['end'][0])+'\n'
mutations={'duplicate-call':lambda g:g['calls'].__setitem__(1,copy.deepcopy(g['calls'][0])),'duplicate-row':lambda g:g['rows'].append(copy.deepcopy(g['rows'][0])),'wrong-request':lambda g:g['calls'][0].update(request=60),'wrong-mutex':lambda g:g['rows'][0].update(m=99),'missing-acquisition':lambda g:g['rows'][0].update(a=0),'missing-row':lambda g:g['rows'].pop(),'reverse-call':lambda g:g['calls'][0].update(ce=1),'overflow':lambda g:g['rows'][0].update(w=2**64),'cleanup-missing':lambda g:g['end'][0].pop('cleanup'),'aggregate-as-single':lambda g:g['rows'][0].update(k=2),'contention-not-overlap':lambda g:g['end'][0].update(ownerRelease=1)}
neg=[]
for name,fn in mutations.items():
 v=copy.deepcopy(g);fn(v)
 try:q.qualify(fmt(v));raise AssertionError('unexpected acceptance '+name)
 except ValueError as e:neg.append({'case':name,'rejection':str(e)})
(root/'native-negatives.json').write_text(json.dumps(neg,indent=2)+'\n');print('native mutations',len(neg))
