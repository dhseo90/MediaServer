import copy,unittest
from recording_degraded_http_qualification import visual_response,public_fresh
class Oracle(unittest.TestCase):
 def setUp(self):
  self.t=dict(id='fresh',channel='9101',segment='new',utcNs='1234567',startMs=1,endMs=2,bucketCount=2,freshCount=48,instanceId='worker',generation=2,seekTicks='0',durationTicks='100',seekTimescale=3000)
  self.item=dict(id='fresh',channelId='9101',timeNs='1234567',score=.2,playable=True,seekAvailable=True,timeBasis='verified-native-file-presentation',targetSeconds=0,frameDurationSeconds=100/3000,playbackUrl='/ops/api/recordings/media/new')
  self.body=dict(kind='visual-frame',scoreMeaning='similarity-not-evidence',appliedQuery=dict(text='ball',limit=200,threshold=-1,channelIds=['9101'],startTimeMs=1,endTimeMs=2),items=[self.item],returnedItems=1,index=dict(instanceId='worker',generation=2))
 def test_target(self):self.assertTrue(public_fresh(self.body,self.t))
 def test_refusal(self):
  for change in ('missing','unplayable','no-seek','generation','instance','time','seek','duration','source'):
   b=copy.deepcopy(self.body)
   if change=='missing':b['items'][0]['id']='other'
   elif change=='unplayable':b['items'][0]['playable']=False
   elif change=='no-seek':b['items'][0]['seekAvailable']=False
   elif change=='generation':b['index']['generation']=3
   elif change=='instance':b['index']['instanceId']='different'
   elif change=='time':b['items'][0]['timeNs']='1234568'
   elif change=='seek':b['items'][0]['targetSeconds']=.1
   elif change=='duration':b['items'][0]['frameDurationSeconds']=.2
   else:b['items'][0]['playbackUrl']='/ops/api/recordings/media/changed'
   with self.subTest(change=change),self.assertRaises(AssertionError):public_fresh(b,self.t)
 def test_broad_rank_fresh_independence(self):
  for scenario in ('fresh-top','fresh-low-score','fresh-ID-tie','fresh48-none'):
   b=copy.deepcopy(self.body);b['appliedQuery'].update(channelIds=['9101','9201'],startTimeMs=None,endTimeMs=None);b['items']=[dict(self.item,id=f'{i:03}',score=.8) for i in range(200)];b['returnedItems']=200
   if scenario=='fresh-top':b['items'][0]['id']='000fresh'
   self.assertEqual(len(visual_response(b,['9101','9201'],exact_count=200)),200)
 def test_broad_gate_preserved(self):
  b=copy.deepcopy(self.body)
  with self.assertRaises(AssertionError):visual_response(b,['9101'],1,2,exact_count=200)
  b['items']=[dict(self.item,id='z'),dict(self.item,id='a')];b['returnedItems']=2
  with self.assertRaises(AssertionError):visual_response(b,['9101'],1,2)
if __name__=='__main__':unittest.main()
