import copy,json,unittest
import recording_http_hold as h
import recording_http_cost_run as run
class Hold(unittest.TestCase):
 def valid(self):return dict(schema=1,id=10,begin=10,end=100,complete=True,loss=False,mutexTiming='UNKNOWN',journalMutexTiming='UNKNOWN',metrics=[[0,0,0] for _ in h.STAGES],counts=[0]*len(h.COUNTERS),outcomes=[[0,0] for _ in range(7)])
 def test_valid_unknown(self):h.validate(self.valid())
 def test_negative(self):
  changes=[lambda r:r.update(id=0),lambda r:r.update(id=12),lambda r:r.update(id=129),lambda r:r.update(id=True),lambda r:r.update(loss=True),lambda r:r.update(complete=False),lambda r:r.update(begin=101),lambda r:r.update(metrics=[]),lambda r:r.update(outcomes=[]),lambda r:r.update(mutexTiming='MEASURED'),lambda r:r.update(journalMutexTiming='MEASURED'),lambda r:r['counts'].__setitem__(0,-1),lambda r:r['counts'].__setitem__(0,2**64),lambda r:r['metrics'].__setitem__(0,[1,2,3]),lambda r:r['metrics'].__setitem__(0,[1,91,1]),lambda r:r['outcomes'].__setitem__(0,[1,0]),lambda r:r['counts'].__setitem__(3,1)]
  for change in changes:
   r=self.valid();change(r)
   with self.subTest(r=r),self.assertRaises(ValueError):h.validate(r)
 def test_nesting(self):
  r=self.valid();r['metrics'][h.STAGES.index('PlusCommit')]=[1,10,10]
  with self.assertRaises(ValueError):h.validate(r)
  r=self.valid();r['metrics'][h.STAGES.index('LockConstruction')]=[1,10,10]
  with self.assertRaises(ValueError):h.validate(r)
 def test_release_failure_live(self):
  r=self.valid();r['metrics'][h.STAGES.index('MinusHold')]=[1,1,1]
  for k in ['MinusCalls','MinusFail']:r['counts'][h.COUNTERS.index(k)]=1
  live=run.LiveTrace()
  with self.assertRaises(run.DiagnosticFailure):live((h.PREFIX+json.dumps(r)).encode(),{'line':1})
  self.assertEqual(live.first['requestId'],10)
  self.assertEqual(live.first['code'],'hold ownership operation failed')
 def test_live(self):
  live=run.LiveTrace();line=(h.PREFIX+json.dumps(self.valid())).encode();live(line,{'line':1})
  with self.assertRaises(run.DiagnosticFailure):live(line,{'line':2})
  self.assertEqual(live.first['requestId'],10)
  for bad in [b'[R157-hold] {', (h.PREFIX+json.dumps(dict(self.valid(),loss=True))).encode()]:
   with self.assertRaises(run.DiagnosticFailure):run.LiveTrace()(bad,{'line':1})
 def test_missing_duplicate(self):
  with self.assertRaises(ValueError):h.qualify([], {})
  row=h.PREFIX+json.dumps(self.valid())
  with self.assertRaises(ValueError):h.qualify([row,row],{})
if __name__=='__main__':unittest.main()
