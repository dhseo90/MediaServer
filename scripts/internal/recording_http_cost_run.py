#!/usr/bin/env python3
"""R154 bounded instrumented R153 fixture; product archive and sources remain immutable."""
import argparse,importlib.util,json,os,shlex,subprocess,time
from pathlib import Path
import recording_accumulated_http_run as base
from recording_http_cost_overlay import generate
REPO=base.REPO
METRICS=['Capture','Sort','Group','Consumer','Locate','Validate1','Build','Validate2','Original','Segment','Lifecycle','Acquire','BinarySearch','CatalogAcquireScope','CatalogOwnedScope']
COUNTERS=['BindingsTotal','Scanned','NonNull','SegmentLookups','LifecycleChecks','ChannelMatches','SourceMatches','GenerationMatches','FullMatches','OwnedAcquisitions','BinarySearches','Exact','Unknown','OtherChannel','OtherSegment','OtherLifecycle','Pending','UniqueKeys']

def classify(i):return 1 if i in (10,11) else 2 if i in (12,13) else 3 if i==60 else 4 if 20<=i<60 else 5 if i>=61 else 6

def qualify_trace(lines,events):
    tables={k:{} for k in ('client','server','search')}
    for line in lines:
        if line.startswith(('[R154-loss]','[search-cost-loss]','[search-failure-loss]')):raise ValueError('trace loss')
        for kind in tables:
            prefix='[R154-'+kind+'] '
            if not line.startswith(prefix):continue
            r=json.loads(line[len(prefix):]);i=r['id']
            if type(i)!=int or not 1<=i<=128 or i in tables[kind]:raise ValueError('request identity')
            if r.get('loss') is not False:raise ValueError('trace loss')
            if kind!='search' and r.get('class')!=classify(i):raise ValueError('request class')
            tables[kind][i]=r
    clients,servers,search=tables.values();http={r['id']:r for r in events if r['phase']=='http'}
    if set(clients)!=set(http) or set(servers)!=set(http):raise ValueError('missing client/server terminal')
    if not {10,11,60}<=set(search):raise ValueError('missing search')
    def number(n):
        if type(n)!=int or not 0<=n<2**64:raise ValueError('counter overflow/negative/type')
    def order(v):
        for n in v:number(n)
        if not all(v) or sorted(v)!=v:raise ValueError('phase order/missing')
    for i,c in clients.items():
        s=servers[i];order([c[k] for k in ['begin','sendBegin','sendEnd','header','receiveEnd','end']]);order([c['connectBegin'],c['connectEnd'],c['sendBegin']]);order([s[k] for k in ['accepted','parsed','handler','prepared','end']])
        order([c['connectBegin'],s['accepted'],s['parsed']]);order([c['sendBegin'],s['parsed']]);order([s['end'],c['receiveEnd']])
        if c['status']!=http[i]['status'] or c['error'] or not c['bytes'] or http[i]['ms']>5000:raise ValueError('HTTP timeout/error')
        if c['receiveEnd']-c['begin']>5000000000:raise ValueError('late complete')
        if i in (10,11,12,13,60):
            order([s[k] for k in ['prepared','sendBegin','sendEnd','end']])
            if not s['sent']:raise ValueError('incomplete send')
        if len(s['metrics'])!=len(METRICS) or len(s['counts'])!=len(COUNTERS):raise ValueError('counter shape')
        for pair in s['metrics']:
            if len(pair)!=2:raise ValueError('metric shape')
            for n in pair:number(n)
        for n in s['counts']:number(n)
        k=dict(zip(COUNTERS,s['counts']))
        if not k['BindingsTotal']==k['Scanned'] or not k['NonNull']==k['SegmentLookups'] or not k['OtherChannel']==k['OtherSegment']:raise ValueError('scan count inconsistency')
        if not k['FullMatches']==k['OwnedAcquisitions']==k['BinarySearches']:raise ValueError('match count inconsistency')
        if not k['FullMatches']<=k['GenerationMatches']<=k['SourceMatches']<=k['ChannelMatches']<=k['LifecycleChecks']<=k['SegmentLookups']<=k['Scanned']:raise ValueError('count order')
        if not k['OtherLifecycle']<=k['OtherSegment']<=k['Scanned']:raise ValueError('other channel count')
    for i,r in search.items():
        if i not in servers:raise ValueError('unbound search')
        s=servers[i];order([s['handler'],r['begin'],r['end'],s['prepared']])
        if not 1<=r['diagnosticId']<=128 or len(r['phases'])>40 or not 0<=r['attempt']<3:raise ValueError('diagnostic bounds')
        required={'service-wait','service-hold','preparation-wait','preparation-hold','Refresh','WithPlayback','SnapshotBegin','CurrentnessJson'}
        if i in (10,11,60) and not required<={p[0] for p in r['phases']}:raise ValueError('missing required phase')
        if len(r['sources'])!=r['attempt']+1:raise ValueError('missing attempt source')
        for source in r['sources']:
            if not isinstance(source,list) or len(source)!=6:raise ValueError('source shape')
            for n in source[:4]:number(n)
            if any(type(v)!=bool for v in source[4:]):raise ValueError('source flags')
        for name,b,e in r['phases']:
            # existing service diagnostic starts a few instructions before probe entry
            order([b,e])
            if b>s['prepared'] or e>r['end'] or b<s['handler']:raise ValueError('phase outside request')
        if r['status']!=http[i]['status']:raise ValueError('search status')
    return tables

def build(parent):
    base.fixed_products();parent.mkdir(mode=0o700);base.environment(parent)
    overlays=generate(parent/'overlay');b=REPO/'build-gst-onnx';flags={}
    for line in (b/'CMakeFiles/media_server_runtime.dir/flags.make').read_text().splitlines():
        if ' = ' in line:
            k,v=line.split(' = ',1);flags[k]=shlex.split(v)
    link=shlex.split((b/'CMakeFiles/media_server.dir/link.txt').read_text());libs=link[link.index('libmedia_server_runtime.a')+1:]
    common=[link[0],*flags['CXX_DEFINES'],*flags['CXX_INCLUDES'],*flags['CXX_FLAGS'],'-I'+str(REPO/'scripts/internal')]
    commands=[];objects=[]
    def compile(cmd,name):
        commands.append(cmd)
        with (parent/(name+'.log')).open('xb') as f:subprocess.run(cmd,stdout=f,stderr=subprocess.STDOUT,check=True,timeout=180)
    for name in overlays:
        if name.startswith('scripts/'):continue
        obj=parent/(Path(name).name+'.o');objects.append(str(obj))
        compile([*common,'-I'+str((REPO/name).parent),'-MMD','-MF',str(obj)+'.d','-c',str(parent/'overlay'/Path(name).name),'-o',str(obj)],Path(name).name)
    archive=str(b/'libmedia_server_runtime.a')
    compile([*common,'-MMD','-MF',str(parent/'fixture.d'),str(parent/'overlay/recording_accumulated_http_smoke.cpp'),*objects,archive,*libs,'-Wl,-map,'+str(parent/'fixture.map'),'-o',str(parent/'fixture')],'fixture-build')
    compile([*common,'-MMD','-MF',str(parent/'seed.d'),str(REPO/'scripts/internal/recording_accumulated_seed.cpp'),archive,*libs,'-o',str(parent/'seed')],'seed-build')
    compile([link[0],'-std=c++17',str(REPO/'scripts/internal/recording_process_metrics.cpp'),'-o',str(parent/'process-metrics')],'metrics-build')
    # Reuse real native V2 ownership fixture; add exact original-reference counter expectations.
    native=(REPO/'scripts/internal/recording_accumulated_media_smoke.cpp').read_text()
    anchor='  const auto holds=[&]'
    assert native.count(anchor)==1
    injection='''  r154::Record record;record.id=1;r154::active=&record;
  recording::RecordingOriginalResult result;const auto sample=binding->samples.front();
  NeedHttp(catalog.ResolveOriginalSample("9201",binding->source_id,binding->source_generation,binding->generation_order,binding->track_id,sample.ordinal,sample.pts_ns,&result,&error),"counter unmatched lookup");
  NeedHttp(record.counts[r154::Scanned]==2&&record.counts[r154::OtherChannel]==2&&record.counts[r154::OtherLifecycle]==2&&record.counts[r154::FullMatches]==0&&result.exact.empty(),"independent other-channel counts");
  record={};record.id=1;
  NeedHttp(catalog.ResolveOriginalSample("9101",binding->source_id,binding->source_generation,binding->generation_order,binding->track_id,sample.ordinal,sample.pts_ns,&result,&error),"counter matching lookup");
  NeedHttp(record.counts[r154::Scanned]==2&&record.counts[r154::ChannelMatches]==2&&record.counts[r154::FullMatches]==2&&record.counts[r154::Exact]==1&&result.exact.size()==1,"independent matched counts");
  r154::active=nullptr;U_PLACEHOLDER
'''.replace('U_PLACEHOLDER','')
    injection+='''  {std::uint64_t overflow=~std::uint64_t{0};NeedHttp(!r154::Add(overflow)&&r154::loss,"overflow rejected");r154::loss=false;NeedHttp(r154::Identity("129")==0&&r154::loss,"128 bound");r154::loss=false;NeedHttp(r154::Identity("bad")==0&&r154::loss,"numeric identity only");r154::loss=false;recording::SearchDiagnostic d;d.id=1;for(unsigned i=0;i<41;++i)recording::SearchDiagnostic::CostRow("focused",1,2);NeedHttp(d.cost_count==40&&d.cost_loss,"40 phase loss bound");d.id=0;d.status=200;}
'''
    native='#include "recording_http_cost_probe.h"\n'+native.replace(anchor,injection+anchor)
    (parent/'focused.cpp').write_text(native)
    compile([*common,'-MMD','-MF',str(parent/'focused.d'),str(parent/'focused.cpp'),*objects,archive,*libs,'-o',str(parent/'focused')],'focused-build')
    mapping=(parent/'fixture.map').read_text()
    for name in overlays:
        if name.startswith('scripts/'):continue
        if str(parent/(Path(name).name+'.o')) not in mapping:raise ValueError('overlay object absent from map')
        if '('+Path(name).name+'.o)' in mapping:raise ValueError('original archive member also linked')
    nm=subprocess.check_output(['nm','-gU',str(parent/'fixture')],text=True);(parent/'symbols.txt').write_text(nm)
    for key in ['ResolveOriginalSample','RecordingApplicationService6Search','RecordingSearchReader7Refresh']:
        matches=[l for l in nm.splitlines() if key in l and ' T ' in l]
        if len(matches)!=1:raise ValueError('symbol uniqueness '+key+str(matches))
    from recording_build_freshness import depfile
    deps={}
    for p in list(parent.glob('*.d')):
        _,parsed=depfile(p.read_text())
        for name in parsed:
            path=Path(name)
            if not path.is_file():raise ValueError('missing dependency')
            if REPO in path.parents:deps[str(path.relative_to(REPO))]=base.digest(path)
    for p in Path(__file__).parent.glob('recording_http_cost*'):deps[str(p.resolve().relative_to(REPO))]=base.digest(p)
    binding={'products':base.fixed_products(),'sources':base.sources(),'dependencies':deps,'binaries':{n:base.digest(parent/n) for n in ['fixture','seed','process-metrics']}}
    (parent/'build-binding.json').write_text(json.dumps(binding,indent=2)+'\n')
    (parent/'instrumentation.json').write_text(json.dumps({'overlays':overlays,'commands':commands,'objects':{Path(o).name:base.digest(o) for o in objects},'fixtureSha256':base.digest(parent/'fixture'),'mapSha256':base.digest(parent/'fixture.map'),'symbolSha256':base.digest(parent/'symbols.txt'),'focusedSha256':base.digest(parent/'focused'),'focusedSourceSha256':base.digest(parent/'focused.cpp')},indent=2)+'\n')

def run(parent):
    binding=json.loads((parent/'instrumentation.json').read_text());assert base.digest(parent/'fixture')==binding['fixtureSha256']
    for name,row in binding['overlays'].items():
        assert base.digest(REPO/name)==row['originalSha256'] and base.digest(parent/'overlay'/row['overlay'])==row['overlaySha256']
    old=base.environment
    def env(p):
        e=old(p);e['MEDIA_SERVER_VERIFY_RECORDING_SEARCH_TRACE']='1';return e
    base.environment=env
    rc=base.run(parent);root=parent/'run';result={'fixtureExit':rc,'decision':'FAIL_BOUNDED_HTTP_CONTRACT'}
    try:
        if rc:raise ValueError('fixture failed')
        result['traces']=qualify_trace((root/'output.log').read_text().splitlines(),json.loads((root/'events.json').read_text()));result['decision']='ATTRIBUTION_REVIEW_PENDING'
    except Exception as e:result['error']=str(e);rc=1
    (root/'attribution.json').write_text(json.dumps(result,indent=2)+'\n');return rc

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('action',choices=['build','run']);p.add_argument('parent');a=p.parse_args();parent=Path(a.parent)
    if a.action=='build':build(parent)
    else:raise SystemExit(run(parent))
