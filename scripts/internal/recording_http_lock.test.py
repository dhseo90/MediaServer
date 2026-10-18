import copy,json,unittest
import recording_http_lock as q
from recording_http_lock_run import Live
from recording_http_cost_run import DiagnosticFailure
SITES=list(range(101,108))
def fixture():
 c=dict(schema=1,id=10,ordinal=1,api=0,line=101,thread=1,mutex=1,identity=q.BASE+10*q.CAP+1,delta=0,cb=10,ce=30,rb=50,re=70,owned=True)
 r=dict(zip(q.FIELDS,[0,1,1,101,1,1,c['identity'],15,25,55,1,10,30,10,30]))
 e=dict(schema=1,id=10,count=1,begin=5,end=80,complete=True,enabled=True,slow=False,holder=False,loss=False)
 return c,r,e
def feed(c,r,e):
 v=q.Collector(SITES)
 for prefix,obj in [('[R159-call] ',c),('[recording-latency] ',r),('[R159-end] ',e)]:v.feed(prefix+json.dumps(obj))
 return v
class Contract(unittest.TestCase):
 def test_valid_and_background(self):
  c,r,e=fixture();v=feed(c,r,e);other=copy.deepcopy(r);other.update(r=0,l=999);v.feed('[recording-latency] '+json.dumps(other));result=v.finish(ids=(10,));self.assertEqual(result['selectedRows'],1);self.assertEqual(result['unselectedRows'],1)
  self.assertEqual(result['requests'][10]['sumsNs'],dict(constructorNs=20,acquisitionNs=10,heldNs=30,constructorBoundaryResidualNs=10,releaseBoundaryResidualNs=15))
 def test_negative_rows(self):
  for key,value in [('k',2),('o',2),('s',2),('l',102),('t',2),('m',2),('r',1),('a',0),('b',31),('w',-1),('h',2**64),('e',90)]:
   c,r,e=fixture();r[key]=value
   with self.subTest(key=key),self.assertRaises(ValueError):feed(c,r,e).finish(ids=(10,))
 def test_negative_calls(self):
  for key,value in [('id',12),('ordinal',129),('identity',0),('thread',0),('delta',1),('cb',2**63),('owned',False),('line',999)]:
   c,r,e=fixture();c[key]=value
   with self.subTest(key=key),self.assertRaises(ValueError):feed(c,r,e).finish(ids=(10,))
 def test_missing_duplicate(self):
  for kind in ('row','call','end'):
   c,r,e=fixture();v=feed(c,r,e)
   with self.subTest(kind=kind),self.assertRaises(ValueError):
    if kind=='row':v.rows.append(r);v.finish(ids=(10,))
    elif kind=='call':v.feed('[R159-call] '+json.dumps(c))
    else:v.feed('[R159-end] '+json.dumps(e))
  c,r,e=fixture();v=feed(c,r,e);v.rows=[]
  with self.assertRaises(ValueError):v.finish(ids=(10,))
 def test_live_sticky_and_cap(self):
  for bad in ('[recording-latency] '+json.dumps(dict(zip(q.FIELDS,[3]+[0]*15))), '[R159-end] {}','[catalog-holder-loss] cap'):
   live=Live(SITES);ctx={'stream':'child','line':1}
   with self.assertRaises(DiagnosticFailure):live(bad.encode(),ctx)
   first=live.first
   with self.assertRaises(DiagnosticFailure):live(b'valid later',ctx)
   self.assertIs(live.first,first)
  c,r,e=fixture();v=feed(c,r,e);v.rowbytes=2*1024*1024
  with self.assertRaises(ValueError):v.feed('[recording-latency] '+json.dumps(r))
 def test_terminal_settings(self):
  for k,val in [('enabled',False),('slow',True),('holder',True),('complete',False),('loss',True),('count',129),('begin',90)]:
   c,r,e=fixture();e[k]=val
   with self.assertRaises(ValueError):feed(c,r,e).finish(ids=(10,))
 def test_real_global_loss_stream(self):
  import os,sys
  from pathlib import Path
  from unittest.mock import patch
  import recording_http_cost_run as cost
  root=Path(os.environ['R159_FOCUSED_ROOT'])/'global-loss';root.mkdir(mode=0o700)
  loss=dict(zip(q.FIELDS,[3]+[0]*(len(q.FIELDS)-1)))
  child='#!'+sys.executable+'\nimport os,time\nos.write(1,'+repr(('[recording-latency] '+json.dumps(loss)+'\n').encode())+')\ntime.sleep(4)\nos.write(1,b"UNEXPECTED_CONTINUATION")\n'
  (root/'seed').write_text(child);(root/'seed').chmod(0o700)
  (root/'build-binding.json').write_text(json.dumps(dict(products={},sources={},binaries={},dependencies={})))
  with patch.object(cost.base,'fixed_products',return_value={}),patch.object(cost.base,'sources',return_value={}):
   rc=cost.base.run(root,line_callback=Live(SITES))
  r=json.loads((root/'run/execution.json').read_text())
  self.assertEqual(rc,1);self.assertEqual(r['fixtureStarts'],0);self.assertTrue(r['groupsAbsent'])
  self.assertEqual(r['firstDiagnosticFailure']['code'],'global latency loss')
  self.assertNotIn(b'UNEXPECTED_CONTINUATION',(root/'run/output.log').read_bytes())
  delay=r['termination'][0]['elapsedSeconds']-r['firstDiagnosticFailure']['detectionElapsedSeconds']
  self.assertGreaterEqual(delay,0);self.assertLess(delay,.5)
if __name__=='__main__':unittest.main()
