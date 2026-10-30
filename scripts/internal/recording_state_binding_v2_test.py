"""합성 계약 단위 검사. 실제 제품 Evidence로 사용하지 않는다."""
import copy
import json
import tempfile
import unittest
from pathlib import Path
import subprocess
import uuid
from recording_state_binding_v2 import *

class V2(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix='media-server-v2-unit-');self.root=Path(self.temp.name).resolve()
        self.rows=[];raw=[];probes={}
        for c in ['9101','9201']:
            for n in range(66):
                id=c+'-'+str(n);f=self.root/id;f.write_bytes(b'test');duration=2 if n<65 else 1
                self.rows.append(dict(id=id,channel=c,order=n+1,catalogBytes=4,catalogSha256=sha(f),duration=duration,finalizedAtMs=1001 if n==65 else 900,file=artifact(f)))
                raw.append(dict(mediaRelpath=id,occurredAtMs=str(self.rows[-1]['finalizedAtMs']),segment=dict(id=id,channel=c,order=str(n+1),sizeBytes='4',sha256=sha(f),startPts='0',endPts=str(duration*1000000000),timeBaseNum=1,timeBaseDen=1000000000)))
                probes[id]=dict(exit=0,result=dict(streams=[dict(codec_name='h264',width=160,height=90,avg_frame_rate='30/1',nb_read_frames=str(duration*30),duration=str(duration))]))
        self.plan=dict(qualificationContract='v2',minimumNormalPerChannel=65,channels=['9101','9201'])
        self.review=dict(rows=self.put('rows.json',self.rows),rawArtifacts=[self.put('observe-0.stdout',dict(busy=False,partialBytes=0,rows=raw))],mediaProbes=self.put('probes.json',probes),execution=dict(signalAtMs=1000),segmentCounts={c:dict(finalized=66,normal=65,tail=1) for c in self.plan['channels']})
    def tearDown(self):self.temp.cleanup()
    def put(self,name,data):
        p=self.root/name;p.write_text(json.dumps(data));return artifact(p)
    def reject(self,code):
        with self.assertRaisesRegex(ValueError,code):check_writer(self.plan,self.review)
    def test_writer_positive_tail_included(self):self.assertEqual(check_writer(self.plan,self.review)['9101']['tail'],1)
    def test_writer_count_mismatch(self):self.review['segmentCounts']['9101']['finalized']=65;self.reject('count-summary')
    def test_raw_missing(self):
        d=read(self.review['rawArtifacts'][0]);d['rows'].pop();self.review['rawArtifacts'][0]=self.put('observe-0.stdout',d);self.reject('finalize-count')
    def test_raw_mismatch(self):
        d=read(self.review['rawArtifacts'][0]);d['rows'][0]['segment']['sizeBytes']='5';self.review['rawArtifacts'][0]=self.put('observe-0.stdout',d);self.reject('raw-segment-mismatch')
    def test_probe_missing(self):
        d=read(self.review['mediaProbes']);d.pop(next(iter(d)));self.review['mediaProbes']=self.put('probes.json',d);self.reject('probe-coverage')
    def test_probe_corrupt(self):
        d=read(self.review['mediaProbes']);d[next(iter(d))]['exit']=1;self.review['mediaProbes']=self.put('probes.json',d);self.reject('probe-failed')
    def test_unexplained_tail(self):self.review['execution']['signalAtMs']=2000;self.reject('tail-not-stop')
    def test_minimum_not_observed_value(self):self.plan['minimumNormalPerChannel']=66;self.reject('writer-contract')
    def smoke_fixture(self):
        run=str(uuid.uuid4());inp=self.put('input.json',{});q=dict(contract='v2',runId=run,input=inp,modelDirectory=str(self.root))
        inner=dict(input=inp,smokeExecution=self.put('execution.json',dict(qualification=q)),smokeReport=self.put('report.json',dict(mode='multifinalize-blocker-resolution',processCount=3,processesClosed=True,udpClosed=True,blockerResults=dict(qualification=q))))
        log=self.root/'run.log';log.write_text('\n'.join('[pass] '+x for x in REQUIRED_CHECKS)+'\n'+''.join('[blocker-stop-result] '+json.dumps(dict(exitCode=0,normalShutdownPass=True,elapsedMs=100))+'\n' for _ in range(3)))
        files=[artifact(log)]
        for n in range(3):
            p=self.root/f'server-{n}.private.log';owner=dict(seq=0,phase='after-storage-destruction',readerCleanupHealthy=True,ram=0,scratchRam=0,scratchDisk=0,scratchFd=0,preservedDisk=0,preservedFd=0)
            p.write_text('[recording-resource] '+json.dumps(owner)+'\n'+''.join('[membership-proof] '+json.dumps(dict(fastSelected=fast,receipts=4,capacity=64))+'\n' for fast in [True,False]));files.append(artifact(p))
        for c in ['9101','9201']:
            p=self.root/f'retention-{c}.mp4';p.write_bytes(Path(inp['path']).read_bytes());files.append(artifact(p))
        inner['smokeRaw']=self.put('raw.json',dict(files=files))
        return dict(smokeRunId=run,modelDirectory=str(self.root)),inner
    def test_smoke_functional_positive(self):
        b,i=self.smoke_fixture();self.assertEqual(check_smoke(b,i)['functionalChecks'],len(REQUIRED_CHECKS))
    def test_smoke_missing_contract_case(self):
        b,i=self.smoke_fixture();p=self.root/'run.log';p.write_text(p.read_text().replace('[pass] R184-B actual Visual200','omitted Visual'))
        m=read(i['smokeRaw']);m['files'][0]=artifact(p);i['smokeRaw']=self.put('raw.json',m)
        with self.assertRaisesRegex(ValueError,'functional-coverage'):check_smoke(b,i)
    def test_smoke_other_run(self):
        b,i=self.smoke_fixture();b['smokeRunId']=str(uuid.uuid4())
        with self.assertRaisesRegex(ValueError,'smoke-run'):check_smoke(b,i)
    def test_smoke_owner_residue(self):
        b,i=self.smoke_fixture();m=read(i['smokeRaw']);p=Path(m['files'][1]['path']);p.write_text(p.read_text().replace('"ram": 0','"ram": 1'));m['files'][1]=artifact(p);i['smokeRaw']=self.put('raw.json',m)
        with self.assertRaisesRegex(ValueError,'resource-return'):check_smoke(b,i)
    def test_official_run_once(self):
        from run_v450_recording_a_mixed import claim_state_v2
        b=dict(runId=str(uuid.uuid4()),contractVersion='v2',verifiedResult=str(self.root/'bundle.json'),sourceBinding=dict(head='fixture'))
        claim_state_v2(b,self.root/'first')
        with self.assertRaises(FileExistsError):claim_state_v2(b,self.root/'second')
    def test_run_ids(self):run_ids(*(str(uuid.uuid4()) for _ in range(3)))
    def test_duplicate_id(self):
        u=str(uuid.uuid4())
        with self.assertRaisesRegex(ValueError,'duplicate-run-id'):run_ids(u,u,str(uuid.uuid4()))
    def test_invalid_id(self):
        with self.assertRaises(ValueError):run_ids('old',str(uuid.uuid4()),str(uuid.uuid4()))
    def entry(self,env):
        p=Path(__file__).with_name('recording_state_input_profile.mjs').as_uri()
        code=f"import {{EARLY_STATE_INPUT,requireStateInputExecutable}} from {json.dumps(p)};requireStateInputExecutable(EARLY_STATE_INPUT,{json.dumps(env)});"
        return subprocess.run(['node','--input-type=module','-e',code],capture_output=True,text=True)
    def test_unsupported_version(self):self.assertIn('state-contract-version',self.entry({'MEDIA_SERVER_STATE_CONTRACT':'v3'}).stderr)
    def test_v1_v2_mix(self):self.assertIn('state-v1-v2-mixed',self.entry({'MEDIA_SERVER_STATE_CONTRACT':'v2','MEDIA_SERVER_STATE_WRITER_REVIEW':str(self.root)}).stderr)
    def test_explicit_v2_required(self):self.assertIn('state-v2-explicit-selection-required',self.entry({'MEDIA_SERVER_STATE_V2_BUNDLE':str(self.root/'bundle')}).stderr)
    def test_v2_missing_bundle(self):self.assertIn('state-v2-bundle-required',self.entry({'MEDIA_SERVER_STATE_CONTRACT':'v2'}).stderr)
    def test_v1_missing_original_still_fails(self):
        env={k:str(self.root/n) for k,n in [('MEDIA_SERVER_STATE_WRITER_REVIEW','review'),('MEDIA_SERVER_STATE_INPUT_MEDIA','input'),('MEDIA_SERVER_STATE_PRODUCT','product'),('MEDIA_SERVER_STATE_RUNTIME','runtime')]}
        p=self.entry(env);self.assertNotEqual(p.returncode,0);self.assertIn('ENOENT',p.stderr);self.assertIn('plan.json',p.stderr)

if __name__=='__main__':unittest.main(verbosity=2)
