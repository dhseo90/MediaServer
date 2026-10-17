import unittest,json,copy
from pathlib import Path
import recording_http_cost_run as m
class Contract(unittest.TestCase):
 def valid(self):
  rows=[];events=[]
  for i in [10,11,12,13,60]:
   c=dict(id=i,**{'class':m.classify(i)},begin=10,connectBegin=1,connectEnd=9,sendBegin=20,sendEnd=30,header=80,receiveEnd=90,end=100,status=200,error=0,bytes=10,loss=False)
   s=dict(id=i,**{'class':m.classify(i)},accepted=9,parsed=31,handler=32,prepared=70,sendBegin=71,sendEnd=75,end=85,sent=True,loss=False,metrics=[[0,0] for _ in m.METRICS],counts=[0]*len(m.COUNTERS))
   rows += [('client',c),('server',s)];events.append(dict(phase='http',id=i,status=200,ms=1,bytes=10))
   if i in [10,11,60]:rows.append(('search',dict(id=i,diagnosticId=i,begin=33,end=69,status=200,attempt=0,loss=False,phases=[[n,34,68] for n in ['service-wait','service-hold','preparation-wait','preparation-hold','Refresh','WithPlayback','SnapshotBegin','CurrentnessJson']],sources=[[1,1,1,1,True,True]])))
  return rows,events
 def check(self,mutate=None):
  rows,e=self.valid()
  if mutate:mutate(rows,e)
  return m.qualify_trace(['[R154-'+k+'] '+json.dumps(r) for k,r in rows],e)
 def bad(self,f):
  with self.assertRaises(ValueError):self.check(f)
 def test_valid(self):self.assertEqual(len(self.check()['server']),5)
 def test_duplicate(self):self.bad(lambda r,e:r.append(r[0]))
 def test_missing(self):self.bad(lambda r,e:r.pop(0))
 def test_class(self):self.bad(lambda r,e:r[0][1].update({'class':3}))
 def test_order(self):self.bad(lambda r,e:r[0][1].update(sendEnd=1))
 def test_missing_end(self):self.bad(lambda r,e:r[0][1].update(receiveEnd=0))
 def test_overflow(self):self.bad(lambda r,e:r[1][1]['counts'].__setitem__(0,2**64))
 def test_negative(self):self.bad(lambda r,e:r[1][1]['metrics'].__setitem__(0,[1,-1]))
 def test_scan_not_total(self):self.bad(lambda r,e:r[1][1]['counts'].__setitem__(0,2))
 def test_count_order(self):self.bad(lambda r,e:r[1][1]['counts'].__setitem__(5,1))
 def test_trace_loss(self):self.bad(lambda r,e:r[1][1].update(loss=True))
 def test_request_limit(self):self.bad(lambda r,e:r[0][1].update(id=129))
 def test_phase_limit(self):self.bad(lambda r,e:r[2][1].update(phases=[['x',34,35]]*41))
 def test_timeout(self):self.bad(lambda r,e:e[0].update(ms=5001))
 def test_late_complete(self):self.bad(lambda r,e:r[0][1].update(receiveEnd=5000000011,end=5000000012))
 def test_bad_status(self):self.bad(lambda r,e:r[0][1].update(status=503))
 def test_unbound_search(self):self.bad(lambda r,e:r[2][1].update(id=99))
 def test_no_send(self):self.bad(lambda r,e:r[1][1].update(sent=False))
 def test_loss_marker(self):
  with self.assertRaises(ValueError):m.qualify_trace(['[R154-loss]'],[])
 def test_r153_unchanged(self):
  self.assertEqual(m.base.digest(m.REPO/'scripts/internal/recording_accumulated_http_smoke.cpp'),'ecae596fe880552eeead576097a0bfd098fdf5bc8b9c990cdc4a28d01c170955')
 def test_missing_phase(self):self.bad(lambda r,e:r[2][1].update(phases=[]))
 def test_missing_source(self):self.bad(lambda r,e:r[2][1].update(sources=[]))
 def test_bad_source(self):self.bad(lambda r,e:r[2][1].update(sources=[None]))
 def test_bad_source_counter(self):self.bad(lambda r,e:r[2][1].update(sources=[[-1,1,1,1,True,True]]))
 def test_bad_source_bool(self):self.bad(lambda r,e:r[2][1].update(sources=[[1,1,1,1,1,True]]))
 def test_cross_clock_order(self):self.bad(lambda r,e:r[1][1].update(accepted=95))
 def test_product_hash(self):self.assertEqual(m.base.fixed_products(),m.base.PRODUCTS)


class Streaming(unittest.TestCase):
 valid=Contract.valid
 def test_live_parallel_order(self):
  rows,_=self.valid();live=m.LiveTrace()
  # Search precedes Server, and parallel requests complete in reverse ID order.
  for k,r in sorted(rows,key=lambda v:(-v[1]['id'],v[0]!='search')):
   live(('[R154-'+k+'] '+json.dumps(r)).encode(),{'line':1})
  self.assertIsNone(live.first)
 def test_live_invalids(self):
  rows,_=self.valid()
  mutations=[lambda r:r.update(id=0),lambda r:r.update(id=129),lambda r:r.update(loss=True),lambda r:r.update({'class':9}),lambda r:r.update(end=1),lambda r:r.update(metrics=[[1,2**64]]*len(m.METRICS))]
  for mutate in mutations:
   live=m.LiveTrace();r=copy.deepcopy(rows[1][1]);mutate(r)
   with self.assertRaises(m.DiagnosticFailure):live(('[R154-server] '+json.dumps(r)).encode(),{'line':1})
 def test_live_sticky(self):
  live=m.LiveTrace()
  with self.assertRaises(m.DiagnosticFailure):live(b'[R154-loss]',{'line':1})
  first=live.first.copy()
  with self.assertRaises(m.DiagnosticFailure):live(b'[R154-loss] secondary',{'line':2})
  self.assertEqual(live.first,first)
 def test_real_streaming_children(self):
  import tempfile,os,sys,time
  from unittest.mock import patch
  rows,_=self.valid();valid='[R154-server] '+json.dumps(rows[1][1])+'\n'
  bad=copy.deepcopy(rows[1][1]);bad['id']=0
  loss=copy.deepcopy(rows[1][1]);loss['loss']=True
  cases={
   'hold-loss':['[R157-hold] '+json.dumps(dict(schema=1,id=10,complete=True,loss=True))+'\n'],
   'hold-malformed':['[R157-hold] {oops}\n'],
   'currentness-loss':['[R156-currentness] '+json.dumps(dict(schema=1,id=10,method='GET',routeClass='structured-search',complete=True,loss=True))+'\n'],
   'currentness-malformed':['[R156-currentness] {oops}\n'],
   'id0':['[R154-server] '+json.dumps(bad)+'\n'],
   'loss':['[R154-server] '+json.dumps(loss)+'\n'],
   'explicit':['[R154-loss]\n'],
   'overflow':['[search-cost-loss]\n'],
   'split':['[R154-lo','ss]\n'],
   'valid-invalid':[valid,'[R154-loss]\n'],
   'invalid-valid':['[R154-loss]\n',valid],
   'duplicate':[valid,valid],
   'malformed':['[R154-server] {oops}\n'],
   'cap':['x'*(m.base.CAP+1)],
   'partial':['[R154-server] {'],
   'output':['[R153-output-failure]\n'],
   'cleanup-error':['[R154-loss]\n'],
   'parallel-order':['[R154-'+k+'] '+json.dumps(r)+'\n' for k,r in sorted(rows,key=lambda v:(-v[1]['id'],v[0]!='search'))]+['[R154-loss]\n']}

  parent=Path(os.environ['R155_FOCUSED_ROOT']);summaries=[]
  for name,chunks in cases.items():
   with self.subTest(name=name):
    root=parent/('stream-'+name);root.mkdir(mode=0o700)
    script='#!'+sys.executable+'\nimport os,time\n'
    script+='parts='+repr(chunks)+'\n'
    script+='for p in parts:\n os.write(1,p.encode());time.sleep(.04)\n'
    if name!='partial':script+='time.sleep(4)\nos.write(1,b"UNEXPECTED_CONTINUATION\\n")\n'
    (root/'seed').write_text(script);(root/'seed').chmod(0o700)
    (root/'build-binding.json').write_text(json.dumps(dict(products={},sources={},binaries={},dependencies={})))
    live=m.LiveTrace();start=time.monotonic()
    # Binding stubs concern the synthetic child only. Collector/selector/signals are real.
    real_killpg=os.killpg;injected=[]
    def killpg(pid,sig):
     if name=='cleanup-error' and sig and not injected:
      injected.append(True);raise OSError('injected cleanup signal failure')
     return real_killpg(pid,sig)
    with patch.object(m.base,'fixed_products',return_value={}),patch.object(m.base,'sources',return_value={}),patch.object(m.base.os,'killpg',side_effect=killpg):
     rc=m.base.run(root,line_callback=live)

    record=json.loads((root/'run/execution.json').read_text());output=(root/'run/output.log').read_bytes()
    self.assertEqual(rc,1);self.assertTrue(record['groupsAbsent']);self.assertEqual(record['seedStarts'],1);self.assertEqual(record['fixtureStarts'],0)
    if name in ('currentness-loss','hold-loss'):self.assertEqual(record['firstDiagnosticFailure']['requestId'],10)
    if name=='parallel-order':self.assertEqual(record['firstDiagnosticFailure']['line'],len(rows)+1)
    if name=='cleanup-error':
     self.assertEqual(record['firstDiagnosticFailure']['code'],'trace-loss-marker');self.assertTrue(record['cleanupErrors']);self.assertEqual(record['firstFailure'],'diagnostic trace-loss-marker')
    self.assertIsNotNone(record['firstDiagnosticFailure']);self.assertNotIn(b'UNEXPECTED_CONTINUATION',output)
    self.assertLess(time.monotonic()-start,3)
    if name!='partial':
     self.assertTrue(record['termination'])
     delay=record['termination'][0]['elapsedSeconds']-record['firstDiagnosticFailure']['detectionElapsedSeconds']
     self.assertGreaterEqual(delay,0);self.assertLess(delay,.5)
    summaries.append(dict(case=name,first=record['firstDiagnosticFailure'],termination=record['termination'],groupsAbsent=record['groupsAbsent'],elapsed=record['elapsedSeconds'],outputBytes=record['outputBytes'],cleanupErrors=record['cleanupErrors'],firstFailure=record['firstFailure']))
  (parent/'stream-results.json').write_text(json.dumps(summaries,indent=2)+'\n')

 def test_fixture_log_cap(self):
  import os,sys,subprocess
  from unittest.mock import patch
  root=Path(os.environ['R155_FOCUSED_ROOT'])/'stream-fixture-cap';root.mkdir(mode=0o700)
  for name,body in [('seed','pass'),('fixture','import os,time;os.write(1,b"x"*'+str(m.base.CAP+1)+');time.sleep(4)')]:
   (root/name).write_text('#!'+sys.executable+'\n'+body+'\n');(root/name).chmod(0o700)
  (root/'build-binding.json').write_text(json.dumps(dict(products={},sources={},binaries={},dependencies={})))
  real_popen=subprocess.Popen
  def popen(cmd,**kw):
   if cmd[0]=='node':cmd=[sys.executable,'-c','import time;time.sleep(4)']
   return real_popen(cmd,**kw)
  with patch.object(m.base,'fixed_products',return_value={}),patch.object(m.base,'sources',return_value={}),patch.object(m.base.subprocess,'Popen',side_effect=popen):
   rc=m.base.run(root,line_callback=m.LiveTrace())
  r=json.loads((root/'run/execution.json').read_text())
  self.assertEqual(rc,1);self.assertEqual(r['firstDiagnosticFailure']['code'],'process output cap');self.assertEqual(r['firstDiagnosticFailure']['failurePhase'],'fixture');self.assertTrue(r['groupsAbsent']);self.assertEqual(r['collectorStarts'],1);self.assertEqual(r['logCapBytes'],4194304)
  self.assertEqual(r['outputBytes'],m.base.CAP)

if __name__=='__main__':unittest.main()
