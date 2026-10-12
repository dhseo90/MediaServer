#!/usr/bin/env python3
"""R101 collector/result rejection cases; synthetic events are not product runs."""
import copy,json,unittest
from recording_visual_contention_contract import validate_output

def fixture():
    records=[]
    items=[{'id':f'{i:02}', 'score':1-i/100,'channelId':'9101','playable':True,'seekAvailable':True,'timeBasis':'verified-native-file-presentation','targetSeconds':0} for i in range(16)]
    for r in range(3):
        for c in range(4):
            body={'items':items if c<2 else [{'id':'one','channelId':'9101'}]}
            if c<2:body['appliedQuery']={'text':'ball','limit':20,'threshold':-1}
            else:body['schema']='media-server.recording-search.v1'
            records.append(f'[R101-request] round={r} visual={int(c<2)} client={c} ms=100 status=200 body='+json.dumps(body))
    def row(kind,value):records.append(kind+' '+json.dumps(value))
    for i in range(1,7):row('[visual-request]',{'id':i})
    row('[visual-request-end]',{'started':6,'completed':6})
    row('[catalog-holder]',{'id':1})
    row('[catalog-holder-end]',{'records':1,'loss':False,'inflight':0,'requests':[4,5,6],'windows':[1,2,3],'ends':[2,3,4]})
    row('[recording-resource]',dict(phase='after-storage-destruction',readerCleanupHealthy=True,**{k:0 for k in ('ram','scratchDisk','scratchFd','scratchRam','preservedDisk','preservedFd')}))
    metrics={'valid':True,'startIdentity':'linux:1','fdObservation':{'scope':'complete-round-sequential-v1','complete':True,'startIdentity':'linux:1','rounds':1}}
    row('[R101-space]',{'phase':'model','metrics':metrics});row('[R101-space]',{'phase':'live','metrics':metrics})
    row('[R101-space-end]',{'samples':2,'endedObserved':True})
    records+=['[R101-space-ready]','[R101-space-phase] model','[R101-space-phase] live']
    return '\n'.join(records)+'\n'

class Contract(unittest.TestCase):
    def test_normal(self):self.assertEqual(validate_output(fixture(),'parallel','4')['requests'],12)
    def test_publication_boundary(self):
        original=fixture().replace('"requests": [4, 5, 6]','"requests": [1, 2, 3]')
        for r in range(3):original+=f'[R101-wave] round={r} completed={2*r} removed=0 status='+json.dumps({'index':{'instanceId':'worker','generation':1}})+'\n'
        status=json.dumps({'state':'ready','index':{'instanceId':'worker','generation':2}})
        original+='[R101-background] completed=6 removed=0\n[R101-post-background] '+status+'\n[R101-publication-complete] elapsedMs=20 status='+status+'\n'
        self.assertEqual(validate_output(original,'background','4')['requests'],12)
        for text in [original.replace('"generation": 2','"generation": 1'),original.replace('[R101-publication-complete]','[missing]'),original.replace('elapsedMs=20','elapsedMs=nan'),original.replace('"state": "ready"','"state": "degraded"'),original.replace('"state": "ready"','"state": "stopped"'),original.replace('[R101-post-background] '+status,'[R101-post-background] '+status.replace('worker','other'))]:
            with self.assertRaises(AssertionError):validate_output(text,'background','4')
    def test_rejections(self):
        original=fixture()
        variants={
          'slow-success':original.replace('ms=100','ms=2100'),
          'server-error':original.replace('status=200','status=503',1),
          'missing-request':'\n'.join(l for l in original.splitlines() if not l.startswith('[R101-request] round=2 visual=1 client=0')),
          'missing-summary':original.replace('[visual-request] {"id": 6}\n',''),
          'wrong-selection':original.replace('"requests": [4, 5, 6]','"requests": [1, 2, 3]'),
          'lost-trace':original.replace('"loss": false','"loss": true'),
          'live-owner':original.replace('"scratchDisk": 0','"scratchDisk": 1'),
          'incomplete-observation':original.replace('"complete": true','"complete": false'),
          'wrong-observation-scope':original.replace('complete-round-sequential-v1','assumed-zero'),
          'space-missing':original.replace('[R101-space-end]','[missing-end]'),
          'space-failure':original+'[R101-space-failure] collection\n',
          'phase-missing':original.replace('[R101-space-phase] live','[missing] live'),
          'wrong-scope':original.replace('"channelId": "9101"','"channelId": "private"'),
          'no-seek':original.replace('"seekAvailable": true','"seekAvailable": false'),
          'false-background':original,
        }
        for name,text in variants.items():
            with self.subTest(name=name):
                with self.assertRaises(AssertionError):validate_output(text,'background' if name=='false-background' else 'parallel','4')

if __name__=='__main__':unittest.main()
