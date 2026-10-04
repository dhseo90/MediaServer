#!/usr/bin/env python3
"""RequestMedia의 실제 저장소 경계만 검사한다. 모델 추론이나 서버/포트는 실행하지 않는다."""
import argparse, hashlib, json, os, pathlib, shlex, shutil, subprocess, tempfile, time
parser=argparse.ArgumentParser();parser.add_argument('--build',required=True);parser.add_argument('--output',required=True);args=parser.parse_args()
repo=pathlib.Path(__file__).resolve().parents[2];build=(repo/args.build).resolve();output=(repo/args.output).resolve();output.parent.mkdir(parents=True,exist_ok=True)
assert not output.exists(), 'result already exists'
root=pathlib.Path(tempfile.mkdtemp(prefix='media-server-visual-cache-')).resolve();identity=root.stat();record={'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),'results':[],'cleanup':{'root':str(root),'rootAbsent':False},'scope':'real V2 media; source copy changes field access only; product budgets unchanged'}
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
failed=True
try:
 source=repo/'src/ingress/visual_search_application_service.cpp';original=source.read_text();anchor='class RequestMedia {\n';assert original.count(anchor)==1
 copy=root/'visual_request_media_cache_under_test.cpp';copy.write_text(original.replace(anchor,anchor+'public: // test-only observation access\n'))
 record['sourceSha256']=sha(source);record['observedCopySha256']=sha(copy);record['copyChange']='one public access label; no behavior/budget replacement';record['archiveSha256']=sha(build/'libmedia_server_runtime.a')
 record['fixtureSha256']=sha(repo/'scripts/internal/visual_request_media_cache_smoke.cpp');record['wrapperSha256']=sha(pathlib.Path(__file__))
 flags={}
 for line in (build/'CMakeFiles/media_server_runtime.dir/flags.make').read_text().splitlines():
  if ' = ' in line:k,v=line.split(' = ',1);flags[k]=shlex.split(v)
 link=shlex.split((build/'CMakeFiles/media_server.dir/link.txt').read_text());libs=link[link.index('libmedia_server_runtime.a')+1:]
 binary=root/'check';fixture=root/'fixture';fixture.mkdir()
 commands=[('compile',[link[0]]+flags['CXX_DEFINES']+flags['CXX_INCLUDES']+flags['CXX_FLAGS']+['-I'+str(root),'-I'+str(repo/'scripts/internal'),str(repo/'scripts/internal/visual_request_media_cache_smoke.cpp'),str(build/'libmedia_server_runtime.a')]+libs+['-o',str(binary)]),('run',[str(binary),str(fixture)])]
 for name,command in commands:
  log=output.with_name(output.stem+'-'+name+'.log');started=time.monotonic()
  with log.open('w') as f:
   try:code=subprocess.run(command,cwd=repo,stdout=f,stderr=subprocess.STDOUT,timeout=90).returncode
   except subprocess.TimeoutExpired:code=124
  record['results'].append({'phase':name,'command':command,'exit':code,'elapsedSeconds':time.monotonic()-started,'timeoutSeconds':90,'log':log.name});output.write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record['results'][-1]),flush=True)
  if code:print(log.read_text()[-4000:],flush=True);break
 else:failed=False
except Exception as exc:
 record['exception']={'type':type(exc).__name__,'message':str(exc)}
 raise
finally:
 current=root.lstat();assert not root.is_symlink() and root.resolve()==root and (current.st_dev,current.st_ino,current.st_uid)==(identity.st_dev,identity.st_ino,os.getuid())
 shutil.rmtree(root);record['cleanup']['rootAbsent']=not root.exists();assert record['cleanup']['rootAbsent'];record['status']='FAIL' if failed else 'PASS';output.write_text(json.dumps(record,indent=2)+'\n')
raise SystemExit(1 if failed else 0)
