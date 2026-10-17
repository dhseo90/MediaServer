import copy,json,unittest
import recording_http_currentness as c
import recording_http_cost_run as run
class Currentness(unittest.TestCase):
 def valid(self):
  m=[[0,0,0] for _ in c.STAGES]
  for k in ['ResponseAdmission','JsonInitialization','ResponseTail','AuthorizationRecheck','JsonTake']:m[c.STAGES.index(k)]=[1,1,1]
  counts=[0]*len(c.COUNTERS);counts[c.COUNTERS.index('ResponseBytes')]=100
  return dict(schema=1,id=10,method='GET',routeClass='structured-search',begin=10,end=100,complete=True,loss=False,metrics=m,counts=counts,inspections=[])
 def test_valid(self):c.validate(self.valid())
 def test_negatives(self):
  changes=[lambda r:r.update(id=0),lambda r:r.update(id=11.0),lambda r:r.update(id=12),lambda r:r.update(complete=False),lambda r:r.update(loss=True),lambda r:r.update(end=1),lambda r:r.update(method='POST'),lambda r:r.update(metrics=[]),lambda r:r.update(counts=[]),lambda r:r['counts'].__setitem__(0,2**64),lambda r:r['counts'].__setitem__(0,-1),lambda r:r['counts'].__setitem__(0,1),lambda r:r['metrics'].__setitem__(0,[1,1,2]),lambda r:r['metrics'].__setitem__(0,[1,100,100]),lambda r:r.update(inspections=[[11,12,5000,0,0]]),lambda r:r['counts'].__setitem__(7,1),lambda r:r['counts'].__setitem__(11,1),lambda r:r['counts'].__setitem__(14,1)]
  for f in changes:
   r=self.valid();f(r)
   with self.subTest(value=r),self.assertRaises(ValueError):c.validate(r)
 def test_final_binding(self):
  rows=[];search={}
  for i in (10,11,60):
   r=self.valid();r['id']=i;rows.append(c.PREFIX+json.dumps(r));search[i]={'phases':[['CurrentnessJson',9,101]]}
  self.assertEqual(len(c.qualify(rows,{'search':search})),3)
  for bad in [rows[:-1],rows+rows[:1]]:
   with self.assertRaises(ValueError):c.qualify(bad,{'search':search})
  search[10]['phases'][0][1]=20
  with self.assertRaises(ValueError):c.qualify(rows,{'search':search})
 def test_live(self):
  r=self.valid();live=run.LiveTrace();line=(c.PREFIX+json.dumps(r)).encode();live(line,{'line':1})
  with self.assertRaises(run.DiagnosticFailure):live(line,{'line':2})
  self.assertEqual(live.first['requestId'],10)
  live=run.LiveTrace()
  with self.assertRaises(run.DiagnosticFailure):live((c.PREFIX+json.dumps(dict(r,loss=True))).encode(),{'line':1})
  self.assertEqual(live.first['requestId'],10)
  for line in [b'[R156-currentness] {', (c.PREFIX+json.dumps(dict(r,loss=True))).encode()]:
   with self.assertRaises(run.DiagnosticFailure):run.LiveTrace()(line,{'line':1})
 def test_inspection_sequence_and_nesting(self):
  r=self.valid();r['metrics'][c.STAGES.index('MediaResolve')]=[1,30,5];r['metrics'][c.STAGES.index('PhysicalInspection')]=[1,25,25];r['inspections']=[[20,46,5000,0,0]]
  for k in ['Positions','Items','AvailabilityCalls','CacheMisses','UniqueKeys','ResolveCalls','ResolveOK','PreferredChecks']:r['counts'][c.COUNTERS.index(k)]=1
  for k,count in [('AvailabilityKey',1),('AvailabilityCache',2),('ItemSerialization',1)]:r['metrics'][c.STAGES.index(k)]=[count,1,1]
  c.validate(r)
  for stage in ['AvailabilityKey','AvailabilityCache','ItemSerialization']:
   bad=copy.deepcopy(r);bad['metrics'][c.STAGES.index(stage)]=[0,0,0]
   with self.assertRaises(ValueError):c.validate(bad)
  for field,value in [(0,9),(1,101),(2,6000),(3,3)]:
   bad=copy.deepcopy(r);bad['inspections'][0][field]=value
   with self.assertRaises(ValueError):c.validate(bad)
  r['metrics'][c.STAGES.index('PhysicalInspection')]=[1,31,25]
  with self.assertRaises(ValueError):c.validate(r)
if __name__=='__main__':unittest.main()
