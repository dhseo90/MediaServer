import copy,json,unittest
import recording_lock_timing as q
class Negative(unittest.TestCase):
 def raw(self):
  row=dict(zip(q.FIELDS,[0,1,1,1,1,1,1,10,20,30,1,10,10,10,10]));end={'calls':0,'cleanup':True,'loss':False};return row,end
 def text(self,r,e):return '[recording-latency] '+json.dumps(r)+'\n[R158-end] '+json.dumps(e)+'\n'
 def test_row_negatives(self):
  for key,value in [('a',0),('b',21),('e',19),('w',-1),('h',2**64),('m',0),('n',2),('k',3),('o',2),('s',2)]:
   r,e=self.raw();r[key]=value
   with self.subTest(key=key),self.assertRaises(ValueError):q.parse(self.text(r,e))
 def test_output(self):
  r,e=self.raw();s=self.text(r,e)
  for bad in [s[:-1],s+'[R158-end] '+json.dumps(e)+'\n',s.replace('"cleanup": true','"cleanup": false'),s.replace('"loss": false','"loss": true'),'x'*(q.CAP+1),s+'[R158-failure] fault\n']:
   with self.assertRaises(ValueError):q.parse(bad)
 def test_settings(self):
  r,e=self.raw();e.update(enabled=False,holder=False,slow=False)
  with self.assertRaisesRegex(ValueError,'execution setting mismatch'):q.qualify(self.text(r,e))
  e.update(enabled=True,holder=True)
  with self.assertRaisesRegex(ValueError,'execution setting mismatch'):q.qualify(self.text(r,e))
 def test_no_call_fabrication(self):
  r,e=self.raw()
  with self.assertRaises(ValueError):q.qualify(self.text(r,e))
if __name__=='__main__':unittest.main()
