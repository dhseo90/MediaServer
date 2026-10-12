"""Native R101 collection/result checks; response shape is not an exhaustive top-k oracle."""
import json, math, re

def validate_output(text, mode, scale):
    def rows(prefix):
        return [json.loads(line[len(prefix):]) for line in text.splitlines() if line.startswith(prefix)]
    requests=[]
    for line in text.splitlines():
        if line.startswith('[R101-request] '):
            match=re.fullmatch(r'\[R101-request\] round=(\d+) visual=([01]) client=(\d+) ms=([0-9.e+-]+) status=(\d+) body=(.*)',line)
            assert match, 'request parse'
            rnd,visual,client,ms,status,raw=match.groups();body=json.loads(raw)
            assert int(status)==200 and math.isfinite(float(ms)) and 0<=float(ms)<=5000, 'request result'
            items=body['items'];assert 0<len(items)<=20 and len({item['id'] for item in items})==len(items),'result count/identity'
            if visual=='1':
                assert body['appliedQuery']['text']=='ball' and body['appliedQuery']['limit']==20 and body['appliedQuery']['threshold']==-1,'applied query'
                if mode!='background':assert len(items)==min(20,4*int(scale)) if scale!='cycle' else len(items)==20,'static sampled count'
                previous=None
                for item in items:
                    score=item['score'];assert math.isfinite(score) and -1<=score<=1,'score'
                    key=(-score,item['id']);assert previous is None or previous<=key,'score/tie order';previous=key
                    assert item['channelId'] in ('9101','9201') and item['playable'] and item['seekAvailable'],'authorized playable result'
                    assert item['timeBasis']=='verified-native-file-presentation' and math.isfinite(item['targetSeconds']) and item['targetSeconds']>=0,'seek metadata'
            else:
                assert body['schema']=='media-server.recording-search.v1','structured schema'
                assert all(item['channelId']=='9101' for item in items),'structured scope'
            requests.append((int(rnd),int(client),int(visual),float(ms)))
    expected=[(r,c,int(c<2)) for r in range(3) for c in range(1 if mode=='single' else 4)]
    assert sorted(x[:3] for x in requests)==expected,'request population'
    times=sorted(x[3] for x in requests);assert times[math.ceil(len(times)*.95)-1]<=2000,'p95'
    end=rows('[visual-request-end] ');assert len(end)==1 and end[0]['started']==end[0]['completed']==(3 if mode=='single' else 6),'visual collection'
    summaries=rows('[visual-request] ');assert len(summaries)==end[0]['completed'] and sorted(x['id'] for x in summaries)==list(range(1,end[0]['completed']+1)),'visual summary coverage'
    holder=rows('[catalog-holder-end] ');assert len(holder)==1 and holder[0]['loss'] is False and holder[0]['inflight']==0,'holder collection'
    assert holder[0]['requests']==([4,5,6] if mode=='parallel' else [1,2,3]),'holder selected requests'
    assert holder[0]['records']==len(rows('[catalog-holder] ')),'holder count'
    assert len(holder[0]['windows'])==len(holder[0]['ends'])==3 and all(0<b<=e for b,e in zip(holder[0]['windows'],holder[0]['ends'])),'holder full intervals'
    owners=rows('[recording-resource] ');last=[x for x in owners if x['phase']=='after-storage-destruction'];assert len(last)==1,'resource end'
    assert last[0]['readerCleanupHealthy'] and all(last[0][k]==0 for k in ('ram','scratchDisk','scratchFd','scratchRam','preservedDisk','preservedFd')),'owner cleanup'
    space=rows('[R101-space] ');ends=rows('[R101-space-end] ');assert space and len(ends)==1 and ends[0]['samples']==len(space) and ends[0]['endedObserved'],'resource collection'
    assert '[R101-space-phase] model' in text and '[R101-space-phase] live' in text and any(x['phase']=='model' for x in space) and any(x['phase']=='live' for x in space),'model/live admission'
    assert '[R101-space-ready]' in text and '[R101-space-failure]' not in text,'resource guard'
    assert '[visual-request-loss]' not in text and '[catalog-holder-loss]' not in text and '[R101-failure]' not in text,'collection/product failure'
    if mode=='background':
        match=re.search(r'^\[R101-background\] completed=(\d+) removed=(\d+)$',text,re.M);assert match and int(match[1])==6 and (scale!='cycle' or int(match[2])>0),'background progress'
        waves=[]
        for line in text.splitlines():
            if line.startswith('[R101-wave] '):
                m=re.fullmatch(r'\[R101-wave\] round=(\d+) completed=(\d+) removed=(\d+) status=(.*)',line);assert m,'wave';waves.append((int(m[1]),int(m[2]),json.loads(m[4])))
        assert len(waves)==3 and all(completed>=2*r for r,completed,_ in waves),'completed writes before later waves'
        final=rows('[R101-post-background] ');assert final and final[0]['index']['generation']>waves[0][2]['index']['generation'],'index publication progressed'
        assert final[0]['index']['instanceId']==waves[0][2]['index']['instanceId'],'same worker publication'
        completion=[line for line in text.splitlines() if line.startswith('[R101-publication-complete] ')]
        assert len(completion)==1,'publication completion observed'
        match=re.fullmatch(r'\[R101-publication-complete\] elapsedMs=([0-9.e+-]+) status=(.*)',completion[0]);assert match,'completion parse'
        assert math.isfinite(float(match[1])) and float(match[1])>=0,'completion elapsed'
        published=json.loads(match[2]);assert published['state'] in ('ready','indexing'),'completion state'
        assert published['index']['instanceId']==final[0]['index']['instanceId'] and published['index']['generation']>waves[0][2]['index']['generation'],'completion authority'

    return {'requests':len(requests),'p95Ms':times[math.ceil(len(times)*.95)-1],'maxMs':times[-1],'spaceSamples':len(space),'scope':'status/shape/order/seek metadata and trace/progress/owner gates; not exhaustive top-k or actual Seek execution'}
