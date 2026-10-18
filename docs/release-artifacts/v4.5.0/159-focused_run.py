from pathlib import Path
import subprocess,sys,os,json,time,signal
sys.path.insert(0,str(Path.cwd()/'scripts/internal'))
from recording_native_isolation import environment
root=Path(__file__).parent;records=[]
cases=[('callsite',root/'callsite',[]),('ordinal-cap',root/'callsite',['overflow']),('catalog-native',root/'candidate/currentness-focused',None),('media-native',root/'candidate/focused',None)]
for mode in ['upper','lower','mixed','missing','empty','text','zero','range','duplicate','variant','conflict','reuse']:cases.append(('parser-'+mode,root/'candidate/parser',[mode]))
for name,binary,args in cases:
 owned=root/("owned-"+name);owned.mkdir(mode=0o700);env=environment(owned);env.update(MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE='1',MEDIA_SERVER_VERIFY_RECORDING_LATENCY_SLOW_ONLY='0',MEDIA_SERVER_VERIFY_CATALOG_HOLDER_TRACE='0')
 if args is None:args=[str(owned)]
 t=time.monotonic();p=subprocess.Popen([str(binary),*args],cwd=owned,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True)
 try:out,_=p.communicate(timeout=30)
 except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGKILL);out,_=p.communicate();raise
 (root/(name+'.log')).write_bytes(out)
 try:os.killpg(p.pid,0);absent=False
 except ProcessLookupError:absent=True
 r={'case':name,'pid':p.pid,'exit':p.returncode,'seconds':time.monotonic()-t,'groupAbsent':absent,'bytes':len(out)};records.append(r);(root/'focused-executions.json').write_text(json.dumps(records,indent=2)+'\n');print(r,flush=True)
 assert p.returncode==0 and absent,r
