import copy,json,os,pathlib,subprocess,time,unittest
import recording_trace_budget as q
from recording_http_lock import Collector
from recording_http_lock_run import Live
from recording_http_cost_run import DiagnosticFailure

class Arithmetic(unittest.TestCase):
 def test_format(self):
  self.assertEqual(q.ROW_MAX,397)
  self.assertEqual((q.BYTES-q.RESERVE)//q.ROW_MAX,5281)
 def test_unknown_is_not_zero(self):
  self.assertEqual(q.qualify([dict(process='fixture',records=None,bytes=None)],0)['decision'],'UNVERIFIED')
 def test_processes_separate_collector_shared(self):
  p=[dict(process=n,records=16000,bytes=2000000) for n in ('seed','fixture')]
  self.assertEqual(q.qualify(p,0)['decision'],'PASS_ARITHMETIC_ONLY')
  self.assertEqual(q.qualify(p,200000)['decision'],'EXCEEDS_CAP')
 def test_caps(self):
  for n,b in [(16385,1),(1,2096641)]:self.assertEqual(q.qualify([dict(process='p',records=n,bytes=b)],0)['decision'],'EXCEEDS_CAP')
  self.assertEqual(q.qualify([dict(process='p',records=16384,bytes=2096640)],0)['decision'],'PASS_ARITHMETIC_ONLY')
 def test_invalid(self):
  for n in (-1,2**64,True):
   with self.assertRaises(ValueError):q.qualify([dict(process='p',records=n,bytes=0)],0)
  with self.assertRaises(ValueError):q.qualify([dict(process='p',records=1,bytes=1)]*2,0)
 def test_terminal_partial_loss(self):
  good=dict(mode='single',cleanup=True,localLoss=False,lossMarker=False,streamError=False)
  text=('[R160-end] '+json.dumps(good)+'\n').encode();q.records(text)
  for raw in (b'',text[:-1],text+text,b'x'*(q.COLLECTOR+1)):
   with self.assertRaises(ValueError):q.records(raw)
  for k in ('localLoss','lossMarker','streamError'):
   bad=dict(good);bad[k]=True
   with self.assertRaises(ValueError):q.records(('[R160-end] '+json.dumps(bad)+'\n').encode())
 def test_selected_and_streaming_loss(self):
  # Real R159 qualifier, not an aggregate split or post-hoc request assignment.
  sites=list(range(101,108));c=dict(schema=1,id=10,ordinal=1,api=0,line=101,thread=1,mutex=1,identity=1001281,delta=0,cb=10,ce=30,rb=50,re=70,owned=True)
  end=dict(schema=1,id=10,count=1,begin=5,end=80,complete=True,enabled=True,slow=False,holder=False,loss=False)
  collect=Collector(sites);collect.feed('[R159-call] '+json.dumps(c));collect.feed('[R159-end] '+json.dumps(end))
  with self.assertRaises(ValueError):collect.finish(ids=(10,))
  with self.assertRaises(ValueError):collect.feed('[R159-call] '+json.dumps(c))
  loss=q.serialized(dict.fromkeys(q.FIELDS,0)|{'k':3,'n':1})
  live=Live(sites)
  with self.assertRaises(DiagnosticFailure):live(loss,{'line':1,'stream':'child'})
  first=live.first
  with self.assertRaises(DiagnosticFailure):live(b'normal after loss',{'line':2})
  self.assertIs(live.first,first)

class Native(unittest.TestCase):
 def test_original_producer(self):
  root=pathlib.Path(os.environ['R160_FOCUSED_ROOT']);rows=[]
  for mode in ('format','single','aggregate','slow','thread','record-before','record-over','byte-before','byte-over','output-failure'):
   env={k:v for k,v in os.environ.items() if not k.startswith('MEDIA_SERVER_')}
   env.update(MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE='1',MEDIA_SERVER_VERIFY_RECORDING_LATENCY_SLOW_ONLY='1' if mode=='slow' else '0',MEDIA_SERVER_VERIFY_CATALOG_HOLDER_TRACE='0')
   start=time.monotonic();p=subprocess.Popen([str(root/'focused'),mode],env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True)
   try:out,err=p.communicate(timeout=5)
   except BaseException:os.killpg(p.pid,9);p.wait();raise
   (root/(mode+'.stdout')).write_bytes(out);(root/(mode+'.stderr')).write_bytes(err)
   self.assertEqual(p.returncode,0);self.assertLess(len(out)+len(err),65536)
   with self.assertRaises(ProcessLookupError):os.killpg(p.pid,0)
   terminal=json.loads(next(l[11:] for l in out.decode().splitlines() if l.startswith('[R160-end] ')))
   actual=[json.loads(l[20:]) for l in err.decode().splitlines() if l.startswith('[recording-latency] ')]
   if mode=='format':self.assertEqual(json.loads(out.decode().splitlines()[0][14:])['u64UpperBytes'],q.ROW_MAX)
   elif mode in ('record-over','byte-over'):
    self.assertTrue(terminal['localLoss']);self.assertEqual([r['k'] for r in actual],[3])
    with self.assertRaises(ValueError):q.records(err+out)
   elif mode=='output-failure':
    # Reproduce the original producer's known unchecked-write boundary, not PASS delivery.
    self.assertTrue(terminal['streamError']);self.assertFalse(terminal['localLoss']);self.assertFalse(terminal['lossMarker']);self.assertEqual(actual,[])
    with self.assertRaises(ValueError):q.records(err+out)
   else:
    q.records(err+out)
    if mode=='single':self.assertEqual([r['k'] for r in actual],[0,1])
    if mode=='aggregate':self.assertEqual([(r['k'],r['n']) for r in actual],[(2,3)])
    if mode=='slow':self.assertEqual(len(actual),1);self.assertIn(b'"lockCount":4',err)
    if mode=='thread':self.assertEqual(len(actual),1);self.assertNotEqual(actual[0]['t'],1)
    if mode=='record-before':self.assertEqual(terminal['emittedCounter'],16384)
    if mode=='byte-before':self.assertEqual(terminal['byteCounter'],2096640)
   rows.append(dict(mode=mode,pid=p.pid,exit=p.returncode,seconds=time.monotonic()-start,stdoutBytes=len(out),stderrBytes=len(err),actualRows=len(actual),terminal=terminal,groupAbsent=True))
  (root/'native-results.json').write_text(json.dumps(rows,indent=2)+'\n')
 def test_stream_original_loss(self):
  import sys
  from unittest.mock import patch
  import recording_http_cost_run as cost
  parent=pathlib.Path(os.environ['R160_FOCUSED_ROOT']);root=parent/'stream-original-loss';root.mkdir(mode=0o700)
  # Replay the exact original producer's cap-loss bytes, not a reconstructed ID.
  raw=(parent/'record-over.stderr').read_bytes();self.assertIn(b'"k":3',raw)
  source='#!'+sys.executable+'\nimport os,time\nos.write(1,'+repr(raw)+')\ntime.sleep(4)\nos.write(1,b"UNEXPECTED_CONTINUATION")\n'
  (root/'seed').write_text(source);(root/'seed').chmod(0o700)
  (root/'build-binding.json').write_text(json.dumps(dict(products={},sources={},dependencies={},binaries={})))
  with patch.object(cost.base,'fixed_products',return_value={}),patch.object(cost.base,'sources',return_value={}):
   rc=cost.base.run(root,line_callback=Live(list(range(101,108))))
  result=json.loads((root/'run/execution.json').read_text())
  self.assertEqual(rc,1);self.assertEqual(result['fixtureStarts'],0);self.assertTrue(result['groupsAbsent'])
  self.assertEqual(result['firstDiagnosticFailure']['code'],'global latency loss')
  self.assertEqual(result['cleanupErrors'],[])
  self.assertNotIn(b'UNEXPECTED_CONTINUATION',(root/'run/output.log').read_bytes())
  delay=result['termination'][0]['elapsedSeconds']-result['firstDiagnosticFailure']['detectionElapsedSeconds']
  self.assertGreaterEqual(delay,0);self.assertLess(delay,.5)
if __name__=='__main__':unittest.main()
