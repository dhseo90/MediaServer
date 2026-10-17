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
 def test_cross_clock_order(self):self.bad(lambda r,e:r[1][1].update(end=95))
 def test_product_hash(self):self.assertEqual(m.base.fixed_products(),m.base.PRODUCTS)
if __name__=='__main__':unittest.main()
