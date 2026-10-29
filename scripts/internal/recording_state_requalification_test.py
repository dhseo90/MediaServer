"""합성 자료로 검사기의 거부 조건만 시험한다. 이 자료는 실제 제품 증거가 아니다."""
import copy
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from recording_state_requalification import *

class Contract(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(prefix='media-server-rq-test-'); self.root=Path(self.tmp.name).resolve()
        self.repo=self.root/'repo'; self.repo.mkdir(); self.ev=self.root/'evidence'; self.ev.mkdir()
        subprocess.run(['git','init','-q',str(self.repo)],check=True)
        (self.repo/'CMakeLists.txt').write_text('synthetic-contract-test-only')
        subprocess.run(['git','add','CMakeLists.txt'],cwd=self.repo,check=True)
        subprocess.run(['git','-c','user.name=Fixture','-c','user.email=fixture@invalid','commit','-qm','synthetic fixture'],cwd=self.repo,check=True)
        self.src=identity(self.repo); source=self.put('source',self.src)
        binary=self.put('binary',{'fixture':True}); runtime=self.put('runtime',{'fixture':True}); inp=self.put('input',{'fixture':True}); model=self.put('model',{'fixture':True})
        plan=dict(schema='state45-writer-plan-v1',generatorVersion=1,runId='synthetic-only',source=source,binary=binary,input=inp,
                  channels=['9101','9201'],segmentSeconds=2,minimumNormalPerChannel=65,maxSegmentBytes=71237,
                  continuousMaxBytes=113246208,reservationBytes=67108864)
        media=self.ev/'media';media.write_bytes(b'x'*60000); media=artifact(media)
        rows=[dict(id=c+str(n),channel=c,order=n+1,bytes=60000,catalogBytes=60000,sha256=media['sha256'],catalogSha256=media['sha256'],duration=2,file=media) for c in ['9101','9201'] for n in range(65)]
        p=self.put('plan',plan)
        review=dict(status='MEASURED',synthetic=False,runId='synthetic-only',planSha256=p['sha256'],sourceEnd=self.src,
            rawArtifacts=[inp],rows=self.put('rows',rows),recovery=self.put('recovery',dict(catalogRecovered=True,deleted=0,available=130)),
            execution=dict(exit=0,forced=False,stopMs=100,portsClosed=True,groupAbsent=True),
            finalOwner=dict(phase='after-storage-destruction',readerCleanupHealthy=True,ram=0,scratchRam=0,scratchDisk=0,scratchFd=0,preservedDisk=0,preservedFd=0))
        ss=dict(head=self.src['head'],binarySha256=binary['sha256'])
        self.b=dict(schema=SCHEMA,officialAdoption=False,gates=GATES.copy(),source=source,binary=binary,runtime=runtime,input=inp,
            freshness=self.put('freshness',dict(status='PASS_TARGET_AWARE_PREFLIGHT',targets=dict(media_server=dict(artifactSha256=binary['sha256']),media_server_runtime=dict(artifactSha256=runtime['sha256'])))),
            models=self.put('models',dict(files=[model])),plan=p,writer=self.put('writer',review),
            smokeExecution=self.put('smokeExecution',dict(status='PASS',exit=0,childExit=0,timedOut=False,processGroupAbsent=True,registeredGroupsAbsent=True,source=ss,sourceEnd=ss)),
            smokeReport=self.put('smokeReport',dict(failed=0,passed=1,blockerResults=dict(retention=dict(status='VERIFIED')))))
        for role in ['smokeRaw','native','shutdown']:self.b[role]=self.put(role,dict(files=[inp]))
    def tearDown(self): self.tmp.cleanup()
    def put(self,name,obj):
        p=self.ev/(name+'.json');p.write_text(json.dumps(obj));return artifact(p)
    def run_bundle(self):
        p=self.ev/'bundle.json';p.write_text(json.dumps(self.b));return validate(self.repo,p,sha(p))
    def change(self,role,fn):
        v=read(self.b[role]);fn(v);self.b[role]=self.put(role,v)
    def reject(self,code):
        with self.assertRaisesRegex((ValueError,FileNotFoundError),code): self.run_bundle()
    def test_positive_contract_mechanics_only(self):
        r=self.run_bundle();self.assertFalse(r['stateReady']);self.assertFalse(r['officialAdoption'])
    def test_dirty(self): (self.repo/'CMakeLists.txt').write_text('changed'); self.reject('dirty')
    def test_staged(self):
        (self.repo/'new').write_text('new');subprocess.run(['git','add','new'],cwd=self.repo,check=True);self.reject('dirty')
    def test_head(self): self.change('source',lambda v:v.update(head='0'*40));self.reject('source-head')
    def test_source(self): self.change('source',lambda v:v['sources'].update({'CMakeLists.txt':'0'*64}));self.reject('source-head')
    def test_binary(self): Path(self.b['binary']['path']).write_text('tampered');self.reject('artifact-sha')
    def test_missing_plan(self): Path(self.b['plan']['path']).unlink();self.reject('No such file')
    def test_plan_hash(self): Path(self.b['plan']['path']).write_text('tampered');self.reject('artifact-sha')
    def test_plan_different_run(self): self.change('plan',lambda v:v.update(runId='other'));self.reject('writer-plan-binding')
    def test_writer_fail(self): self.change('writer',lambda v:v.update(status='FAIL'));self.reject('writer-failed')
    def test_writer_other_source(self): self.change('writer',lambda v:v.update(sourceEnd={}));self.reject('writer-source')
    def test_writer_insufficient(self):
        rows=read(read(self.b['writer'])['rows'])[:-1]
        self.change('writer',lambda v:v.update(rows=self.put('rows-short',rows)))
        self.reject('writer-recovery')
    def test_writer_owner(self): self.change('writer',lambda v:v['finalOwner'].update(ram=1));self.reject('writer-owner')
    def test_input(self): Path(self.b['input']['path']).write_text('changed');self.reject('artifact-sha')
    def test_model(self): Path(read(self.b['models'])['files'][0]['path']).write_text('changed');self.reject('artifact-sha')
    def test_smoke_failed(self): self.change('smokeReport',lambda v:v.update(failed=1));self.reject('smoke-result')
    def test_smoke_missing(self): Path(self.b['smokeExecution']['path']).unlink();self.reject('No such file')
    def test_smoke_source(self):
        self.change('smokeExecution',lambda v:v['source'].update(head='0'*40));self.reject('smoke-source')
    def test_schema(self): self.b['schema']='future';self.reject('schema')
    def test_gate(self): self.b['gates']['shutdownGraceMs']=6000;self.reject('gate-change')
    def test_official_adoption(self): self.b['officialAdoption']=True;self.reject('schema-or-adoption')
    def test_native_missing(self): Path(self.b['native']['path']).unlink();self.reject('No such file')
    def test_shutdown_empty(self): self.change('shutdown',lambda v:v.update(files=[]));self.reject('evidence-empty')
    def test_bundle_tamper(self):
        p=self.ev/'bundle.json';p.write_text(json.dumps(self.b))
        with self.assertRaisesRegex(ValueError,'bundle-sha'):validate(self.repo,p,'0'*64)

if __name__=='__main__':unittest.main(verbosity=2)
