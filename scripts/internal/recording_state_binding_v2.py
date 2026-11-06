#!/usr/bin/env python3
"""승인된 격리 State45 v2 결속. v1 고정 증거와 성능 Gate는 변경하지 않는다."""
import json  # 파일 용도: 승인된 격리 State45 v2 결속을 검사하며 v1 고정 증거와 성능 gate는 유지한다.
import os
from pathlib import Path
import subprocess
import sys
import uuid
from recording_state_requalification import (artifact,bound,read,sha,identity,need,validate,GATES)

SCHEMA='media-server.state45-current-head.v2'
MODEL_NAMES={'upstream/tokenizer.model','onnx/image_encoder.onnx','onnx/text_encoder.onnx'}
HELPERS={'normalize','process-metrics','review-seed','catalog-instrumented.cpp'}
REQUIRED_CHECKS={
 'R184-B actual Visual200','R184-B before-restart exact journal membership',
 'R184-B multi finalize both requests','R184-B after-restart exact journal membership',
 'R184-B restarted process rejects old sessions401','R184-B durable deleted media404',
 'R184-B surviving media206','R184-B latest excludes deleted',
 'R184-B historical membership never grants deleted playback',
 'R184-B resumed historical page current media check','R184-B Visual excludes formerly returned deleted media',
 'R184-B durable journal complete after stop','R184-B deletion survives restart',
 'R184-B restart-after-delete exact journal membership','R184-B new-finalize-after-strict exact journal membership'}
for phase in ['before-restart','after-restart-fresh']:
    for role,status in [('owner',200),('scoped-operator',403),('viewer',403),('anonymous',401)]:
        REQUIRED_CHECKS.add(f'R184-B {phase} {role} expected {status} actual {status}')
    for role,status in [('owner',206),('scoped-operator',404),('anonymous',401)]:
        REQUIRED_CHECKS.add(f'R184-B {phase} media {role} expected {status} actual {status}')


def save(file,value):
    with Path(file).open('x') as f:json.dump(value,f,indent=2);f.write('\n')

def run_ids(qualification,writer,smoke):
    values=[qualification,writer,smoke]
    need(all(isinstance(v,str) and str(uuid.UUID(v))==v for v in values),'v2-run-id')
    need(len(set(values))==3,'v2-duplicate-run-id')

def check_writer(plan,review):
    need(plan.get('qualificationContract')=='v2' and plan['minimumNormalPerChannel']==65,'v2-writer-contract')
    rows=read(review['rows']);raw=[]
    for entry in review['rawArtifacts']:
        p=Path(entry['path'])
        if p.name.startswith('observe-') and p.name.endswith('.stdout'):
            doc=read(entry);need(not doc['busy'] and doc['partialBytes']==0,'v2-writer-raw-complete');raw.extend(doc['rows'])
    final=[x for x in raw if 'mediaRelpath' in x]
    need(len(final)==len(rows) and len({x['segment']['id'] for x in final})==len(rows),'v2-finalize-count')
    raw_ids={x['segment']['id']:x for x in final};file_paths=set();tail={}
    probes=read(review['mediaProbes']);need(set(probes)=={r['id'] for r in rows},'v2-probe-coverage')
    for r in rows:
        original=raw_ids.get(r['id']);need(original is not None,'v2-segment-missing')
        s=original['segment'];duration=(int(s['endPts'])-int(s['startPts']))*s['timeBaseNum']/s['timeBaseDen']
        need(r['channel']==s['channel'] and r['order']==int(s['order']) and r['catalogBytes']==int(s['sizeBytes']) and
             r['catalogSha256']==s['sha256'] and abs(r['duration']-duration)<1e-8 and
             r['finalizedAtMs']==int(original['occurredAtMs']),'v2-raw-segment-mismatch')
        path=bound(r['file']);need(str(path) not in file_paths,'v2-media-alias');file_paths.add(str(path))
        probe=probes[r['id']];need(probe['exit']==0,'v2-media-probe-failed')
        streams=probe['result']['streams'];need(len(streams)==1,'v2-media-track')
        st=streams[0];need(st['codec_name']=='h264' and st['width']==160 and st['height']==90 and
            st['avg_frame_rate']=='30/1' and int(st['nb_read_frames'])>0 and
            abs(float(st['duration'])-duration)<=1/30+0.005 and
            abs(int(st['nb_read_frames'])-float(st['duration'])*30)<1.01,'v2-media-integrity')
        if duration<1.95:
            c=r['channel'];need(c not in tail,'v2-multiple-tails');tail[c]=r
    for c,r in tail.items():
        need(r['order']==max(x['order'] for x in rows if x['channel']==c),'v2-tail-not-last')
        need(review['execution']['signalAtMs']-1<=r['finalizedAtMs']<=review['execution']['signalAtMs']+5000,'v2-tail-not-stop')
    expected={c:dict(finalized=sum(x['channel']==c for x in rows),normal=sum(x['channel']==c and 1.95<=x['duration']<=2.1 for x in rows),tail=sum(x['channel']==c and x['duration']<1.95 for x in rows)) for c in plan['channels']}
    need(review['segmentCounts']==expected,'v2-segment-count-summary')
    need(all(v['normal']>=65 and v['finalized']==v['normal']+v['tail'] for v in expected.values()),'v2-normal-coverage')
    return expected

def json_lines(text,prefix):
    return [json.loads(x[len(prefix):]) for x in text.splitlines() if x.startswith(prefix)]

def check_smoke(b,inner):
    execution=read(inner['smokeExecution']);report=read(inner['smokeReport']);q=execution['qualification']
    need(q==report['blockerResults']['qualification'] and q['runId']==b['smokeRunId'] and q['contract']=='v2','v2-smoke-run')
    need(q['input']==inner['input'] and q['modelDirectory']==b['modelDirectory'],'v2-smoke-input-model')
    need(report['mode']=='multifinalize-blocker-resolution' and report['processCount']==3 and
         report['processesClosed'] and report['udpClosed'],'v2-smoke-processes')
    files=read(inner['smokeRaw'])['files'];logs=[bound(x) for x in files if Path(x['path']).name=='run.log']
    need(len(logs)==1,'v2-smoke-log');text=logs[0].read_text()
    checks={line[7:] for line in text.splitlines() if line.startswith('[pass] ')}
    need(REQUIRED_CHECKS<=checks,'v2-smoke-functional-coverage')
    need(not any(line.startswith('[fail] ') for line in text.splitlines()),'v2-smoke-log-failure')
    stops=json_lines(text,'[blocker-stop-result] ')
    need(len(stops)==3 and all(x['exitCode']==0 and x['normalShutdownPass'] and x['elapsedMs']<=5000 for x in stops),'v2-smoke-shutdown')
    servers=[bound(x) for x in files if Path(x['path']).name.startswith('server-') and Path(x['path']).name.endswith('.private.log')]
    need(len(servers)==3,'v2-server-log-coverage');membership=[]
    for p in servers:
        text=p.read_text();membership.extend(json_lines(text,'[membership-proof] '));owners=json_lines(text,'[recording-resource] ')
        need(owners and [x['seq'] for x in owners]==list(range(len(owners))),'v2-owner-sequence')
        last=owners[-1];need(last['phase']=='after-storage-destruction' and last['readerCleanupHealthy'] and
             all(last[k]==0 for k in ['ram','scratchRam','scratchDisk','scratchFd','preservedDisk','preservedFd']),'v2-resource-return')
    need(any(x['fastSelected'] and x['receipts']>=2 and x['capacity']==64 for x in membership) and
         any(not x['fastSelected'] for x in membership),'v2-fast-strict-coverage')
    inputs=[x for x in files if Path(x['path']).name in ['retention-9101.mp4','retention-9201.mp4']]
    need(len(inputs)==2 and all(x['sha256']==inner['input']['sha256'] for x in inputs),'v2-smoke-input-files')
    return dict(functionalChecks=len(REQUIRED_CHECKS),membershipObservations=len(membership),
                fastSelections=sum(x['fastSelected'] for x in membership),scope='focused short HTTP; capacity retention, no Segment Delete API; not natural State45 retention')

def bind(repo,file,expected):
    return _bind_current(repo,file,expected,SCHEMA,"v2",validate)

def _bind_current(repo,file,expected,schema,contract,qualifier):
    need(sha(file)==expected,'v2-bundle-sha');b=json.loads(Path(file).read_text())
    need(b['schema']==schema and b['contractVersion']==contract and b['gates']==GATES,'v2-schema-gates')
    run_ids(b['runId'],b['writerRunId'],b['smokeRunId'])
    inner_path=bound(b['qualification']);inner=read(b['qualification'])
    result=qualifier(repo,inner_path,b['qualification']['sha256'])
    source=read(inner['source']);plan=read(inner['plan']);review=read(inner['writer'])
    need(b['writerRunId']==plan['runId']==review['runId'],'v2-writer-run')
    counts=check_writer(plan,review);smoke=check_smoke(b,inner)
    model=Path(b['modelDirectory']);need(model.is_absolute() and model.resolve()==model,'v2-model-root')
    model_entries=read(inner['models'])['files'];mapping={e['path']:e for e in model_entries}
    need(all(str(model/p) in mapping for p in MODEL_NAMES),'v2-model-selection')
    need(Path(inner['binary']['path'])==Path(repo)/'build-gst-onnx/media_server' and
         Path(inner['runtime']['path'])==Path(repo)/'build-gst-onnx/libmedia_server_runtime.a','v2-build-selection')
    actual=json.loads(subprocess.check_output(['python3','-B',str(Path(repo)/'scripts/internal/recording_build_freshness.py'),
                       '--repo',str(repo),'--build',str(Path(repo)/'build-gst-onnx')],timeout=20,text=True))
    fresh=read(inner['freshness']);need(actual['status']==fresh['status']=='PASS_TARGET_AWARE_PREFLIGHT' and
         actual['graphSha256']==fresh['graphSha256'] and actual['targets']==fresh['targets'],'v2-current-build-freshness')
    helper=read(b['helperReceipt']);need(helper['source']==source and helper['sourceEnd']==source and
         helper['binary']==inner['binary'] and helper['runtime']==inner['runtime'],'v2-helper-source')
    need(set(helper['helpers'])==HELPERS and plan['helper']==helper['helpers']['normalize'],'v2-helper-selection')
    for entry in helper['helpers'].values():bound(entry)
    for entry in b['dependencies']:bound(entry)
    deps={x['path'] for x in b['dependencies']}
    for rel in ['third_party/v430-embedding/sentencepiece/include/sentencepiece_processor.h',
                'third_party/v430-embedding/sentencepiece/lib/libsentencepiece.a']:
        need(str((Path(repo)/rel).resolve()) in deps,'v2-vendor-coverage')
    if sys.platform=='darwin':
        libraries=subprocess.check_output(['otool','-L',inner['binary']['path']],text=True).splitlines()[1:]
        for line in libraries:
            library=line.strip().split(' (',1)[0]
            if library.startswith('/opt/'):
                need(str(Path(library).resolve()) in deps,'v2-dynamic-library-coverage')
    need(identity(repo)==source,'v2-source-changed')
    return dict(contractVersion=contract,evidenceSchema=schema,runId=b['runId'],profile='state-early-cbr224-v1',
        input=inner['input']['path'],product=inner['binary']['path'],runtime=inner['runtime']['path'],modelDirectory=str(model),
        helpers=helper['helpers'],matched=len(source['sources']),sha256={k:inner[v]['sha256'] for k,v in [('input','input'),('product','binary'),('runtime','runtime')]},
        sourceBinding=dict(head=source['head'],manifestSha256=inner['source']['sha256']),freshness=actual,
        writerCounts=counts,smoke=smoke,verifiedResult=str(file),verifiedResultSha256=expected,shutdownMode='stop')

def helpers(repo,root,finish=False):
    root=Path(root);source=identity(repo);binary=artifact(Path(repo)/'build-gst-onnx/media_server');runtime=artifact(Path(repo)/'build-gst-onnx/libmedia_server_runtime.a')
    if not finish:save(root/'helper-source.json',dict(source=source,binary=binary,runtime=runtime));return
    before=json.loads((root/'helper-source.json').read_text());need(before==dict(source=source,binary=binary,runtime=runtime),'helper-source-changed')
    save(root/'helpers.json',dict(**before,sourceEnd=source,helpers={n:artifact(root/n) for n in sorted(HELPERS)}))

if __name__=='__main__':
    if len(sys.argv)==4 and sys.argv[1] in ['--helpers-begin','--helpers-end']:
        helpers(*sys.argv[2:],finish=sys.argv[1]=='--helpers-end')
    elif len(sys.argv)==5 and sys.argv[1]=='--binding':print(json.dumps(bind(*sys.argv[2:])))
    else:raise SystemExit('usage: --binding REPO BUNDLE SHA | --helpers-begin/--helpers-end REPO ROOT')
