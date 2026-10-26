#!/usr/bin/env python3
"""R101 bounded direct executable build/run. Owned native isolation precedes gst/product initialization."""
import argparse, hashlib, json, os, pathlib, selectors, shlex, signal, subprocess, time
from recording_native_isolation import environment
from recording_visual_contention_contract import validate_output
p=argparse.ArgumentParser();p.add_argument('action',choices=['build','run']);p.add_argument('parent');p.add_argument('--label',required=True);p.add_argument('--scale',choices=['4','53','cycle'],default='53');p.add_argument('--mode',choices=['single','visual-pair','parallel','background'],default='parallel');p.add_argument("--density-snapshot");a=p.parse_args()
repo=pathlib.Path(__file__).resolve().parents[2];parent=pathlib.Path(a.parent);assert parent.is_absolute() and parent.resolve()==parent and parent.is_dir()
assert a.label and pathlib.Path(a.label).name==a.label and a.label not in ('.','..')
environment(parent) # validate owned namespace before creating any run leaf
root=parent/a.label;root.mkdir(mode=0o700);env=environment(root);build=repo/'build-gst-onnx';binary=parent/'contention';cap=4*1024*1024
if a.action=='build':
 flags={}
 for line in (build/'CMakeFiles/media_server_runtime.dir/flags.make').read_text().splitlines():
  if ' = ' in line:k,v=line.split(' = ',1);flags[k]=shlex.split(v)
 link=shlex.split((build/'CMakeFiles/media_server.dir/link.txt').read_text());libs=link[link.index('libmedia_server_runtime.a')+1:]
 command=[link[0]]+flags['CXX_DEFINES']+flags['CXX_INCLUDES']+flags['CXX_FLAGS']+['-Wall','-Wextra','-Werror','-I'+str(repo/'scripts/internal'),str(repo/'scripts/internal/recording_visual_contention_smoke.cpp'),str(build/'libmedia_server_runtime.a')]+libs+['-o',str(binary)]
else:
 command=[str(binary),str(root),str(repo/'models/v430-siglip2'),a.scale,a.mode]
 env.update(MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE='1',MEDIA_SERVER_VERIFY_RECORDING_LATENCY_SLOW_ONLY='1',MEDIA_SERVER_VERIFY_VISUAL_REQUEST_TRACE='1',MEDIA_SERVER_VERIFY_CATALOG_HOLDER_TRACE='1',MEDIA_SERVER_VERIFY_CATALOG_HOLDER_WHOLE_REQUESTS='late' if a.mode in ('parallel','visual-pair') else '1',MEDIA_SERVER_VERIFY_FRAME_TRACE='bounded',MEDIA_SERVER_VERIFY_CONTENTION_OBSERVER='1')
if a.density_snapshot:
 assert a.action=='run' and a.mode=='background' and a.scale=='53','density uses existing bounded background case'
 snapshot=pathlib.Path(a.density_snapshot)
 assert snapshot.is_absolute() and snapshot.resolve()==snapshot and snapshot.is_file()
 assert snapshot.stat().st_size<=16*1024*1024
 assert hashlib.sha256(snapshot.read_bytes()).hexdigest()=='48a14fa34ecfa528e8c1042dc7b92501eefbfd42e9b8ca3a52e21b7f5c93daee','density reference SHA'
 env.update(MEDIA_SERVER_NATIVE_CAPTURE_SNAPSHOT=str(snapshot),MEDIA_SERVER_VERIFY_SEARCH_ATTRIBUTION='1',MEDIA_SERVER_VERIFY_RECORDING_SEARCH_TRACE='1')
deadline=630 if a.action=='run' and a.scale=='cycle' else 180
record={'command':command,'cwd':str(root),'uid':os.getuid(),'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),'fixtureSha256':hashlib.sha256((repo/'scripts/internal/recording_visual_contention_smoke.cpp').read_bytes()).hexdigest(),'archiveSha256':hashlib.sha256((build/'libmedia_server_runtime.a').read_bytes()).hexdigest(),'mode':a.mode,'scale':a.scale,'isolation':'native helper + preinitialization binary guard','receivedBytes':0,'savedBytes':0,'timeout':False,'overflow':False,'limitBytes':cap,'deadlineSeconds':deadline}
if a.action=='run':
 record['binarySha256']=hashlib.sha256(binary.read_bytes()).hexdigest()
 costs={str(folder.relative_to(repo)):sum(p.stat().st_size for p in folder.rglob('*') if p.is_file() and not p.is_symlink()) for folder in (repo/'models/v430-siglip2',repo/'third_party/v430-embedding',build)}
 # Same documented model/dependency/build total plus this direct executable.
 fixed=sum(costs.values())+binary.stat().st_size
 assert fixed+1129352764<8*1024**3,'existing preparation8GiB budget'
 (root/'preparation-budget.json').write_text(json.dumps({'costs':costs,'fixtureBytes':binary.stat().st_size,'fixedBytes':fixed,'temporaryModelReserve':1129352764,'capBytes':8*1024**3}))
 (root/'resource-phase').write_text('initial')
(root/'execution.json').write_text(json.dumps(record,indent=2));t=time.monotonic()
child=None;monitor=None;sel=selectors.DefaultSelector();stop_at=None;ready=False;line_buffers={'child':b'','monitor':b''};phases=[]
record.update(collectionError=None,signal=None,monitorExit=None,observerReady=False,groupAbsent=False)
def terminate(proc,sig):
 if proc is None:return
 try:os.killpg(proc.pid,sig)
 except ProcessLookupError:pass
try:
 child=subprocess.Popen(command,cwd=root,env=env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True);record['pid']=child.pid
 sel.register(child.stdout,selectors.EVENT_READ,'child')
 if a.action=='run':
  collector=parent/'process-metrics';assert collector.is_file()
  monitor=subprocess.Popen(['node',str(repo/'scripts/internal/recording_visual_contention_observer.mjs'),str(root),str(child.pid),str(collector)],cwd=root,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True)
  sel.register(monitor.stdout,selectors.EVENT_READ,'monitor')
 with (root/'output.log').open('xb') as f:
  while sel.get_map():
   now=time.monotonic()
   if now-t>deadline and stop_at is None:record['timeout']=True;stop_at=now;terminate(child,signal.SIGTERM)
   if monitor and monitor.poll() not in (None,0) and stop_at is None:
    record['collectionError']='resource observer failed';stop_at=now;terminate(child,signal.SIGTERM)
   if stop_at is not None and now-stop_at>5:
    terminate(child,signal.SIGKILL);terminate(monitor,signal.SIGKILL)
    if now-stop_at>6:raise TimeoutError('output pipe did not close after group stop')
   for key,_ in sel.select(0.1):
    b=os.read(key.fileobj.fileno(),65536)
    if not b:sel.unregister(key.fileobj);continue
    record['receivedBytes']+=len(b)
    if record['savedBytes']+len(b)>cap:
     record['overflow']=True
     if stop_at is None:stop_at=time.monotonic();terminate(child,signal.SIGTERM)
    else:
     n=f.write(b);f.flush();record['savedBytes']+=n
     if n!=len(b):raise IOError('short write')
    line_buffers[key.data]+=b
    while b'\n' in line_buffers[key.data]:
     line,line_buffers[key.data]=line_buffers[key.data].split(b'\n',1)
     if line==b'[R101-space-ready]':
      assert key.data=='monitor' and not ready
      child.stdin.write(b'continue\n');child.stdin.flush();ready=True;record['observerReady']=True
     if line.startswith(b'[R101-phase] '):
      phase=line.split(b' ')[1].decode();assert key.data=='child' and phases==([] if phase=='model' else ['model']) and phase in ('model','live')
      phases.append(phase);(root/'resource-phase-next').write_text(phase);os.replace(root/'resource-phase-next',root/'resource-phase')
     if line.startswith(b'[R101-space-phase] '):
      phase=line.split(b' ')[1].decode();assert key.data=='monitor' and phases and phase==phases[-1]
      child.stdin.write(b'continue\n');child.stdin.flush()
      if phase=='live':child.stdin.close()
    if len(line_buffers[key.data])>1024*1024:raise IOError('collector line size')
except BaseException as error:
 record['collectionError']=type(error).__name__+':'+str(error)
finally:
 sel.close()
 for proc in (child,monitor):
  if proc is None:continue
  if proc.poll() is None:
   terminate(proc,signal.SIGTERM)
   try:proc.wait(timeout=5)
   except subprocess.TimeoutExpired:terminate(proc,signal.SIGKILL);proc.wait(timeout=5)
  if proc.stdout:proc.stdout.close()
  if proc.stdin and not proc.stdin.closed:proc.stdin.close()
 if child:
  record['exit']=child.wait();record['signal']=-record['exit'] if record['exit']<0 else None
  try:
   os.killpg(child.pid,0)
   # A pipe-less descendant is still a cleanup failure, even if the leader exited.
   terminate(child,signal.SIGTERM);record['collectionError']=record['collectionError'] or 'child group remained after leader exit'
  except ProcessLookupError:record['groupAbsent']=True
 else:record['exit']=None
 if monitor:record['monitorExit']=monitor.wait()
 if a.action=='run':
  try:record['qualification']=validate_output((root/'output.log').read_text(),a.mode,a.scale)
  except Exception as error:record['qualificationError']=type(error).__name__+':'+str(error);record['collectionError']=record['collectionError'] or 'result qualification failed'
 record['elapsedSeconds']=time.monotonic()-t
 (root/'execution.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record));raise SystemExit(0 if record['exit']==0 and not record['timeout'] and not record['overflow'] and record['collectionError'] is None and record['receivedBytes']==record['savedBytes'] and record['groupAbsent'] and (a.action=='build' or (record['observerReady'] and record['monitorExit']==0)) else 1)
