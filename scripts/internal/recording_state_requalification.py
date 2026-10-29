#!/usr/bin/env python3
"""별도 제안 계약. 공식 결속기에서 import하지 않으며 State45 실행 권한을 반환하지 않는다."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

SCHEMA = 'state45-requalification-prototype-v1'
GATES = dict(observationSeconds=2700, supervisorSeconds=2880, combinedP95Ms=2000,
             maxSuccessMs=5000, timeouts=0, errors=0, shutdownGraceMs=5000,
             receiptCapacity=64, rawCapacity=32, ttlSeconds=60,
             continuousMaxBytes=113246208, reservationBytes=67108864,
             peakRssBytes=4294967296, workspaceEachBytes=469762048)

def need(value, code):
    if not value:
        raise ValueError(code)

def sha(file):
    h = hashlib.sha256()
    with Path(file).open('rb') as f:
        for b in iter(lambda: f.read(1024*1024), b''):
            h.update(b)
    return h.hexdigest()

def artifact(file):
    p = Path(file).resolve()
    return dict(path=str(p), sha256=sha(p), bytes=p.stat().st_size)

def bound(entry):
    p = Path(entry['path'])
    need(p.is_absolute() and p.resolve()==p and not p.is_symlink(), 'artifact-path')
    s = p.stat()
    need(p.is_file() and s.st_uid==os.getuid() and s.st_nlink==1, 'artifact-owner')
    need(s.st_size==entry['bytes'] and sha(p)==entry['sha256'], 'artifact-sha')
    return p

def read(entry):
    return json.loads(bound(entry).read_text())

def git(repo, *args):
    return subprocess.check_output(['git', *args], cwd=repo, env=dict(os.environ,GIT_OPTIONAL_LOCKS='0'), text=True).strip()

def identity(repo):
    need(not git(repo,'status','--porcelain=v1','--untracked-files=all'), 'dirty-worktree-or-index')
    names=git(repo,'ls-files','-z').split('\0')
    return dict(head=git(repo,'rev-parse','HEAD'), sources={p:sha(Path(repo)/p) for p in names if p})

def writer_review(plan, rows, recovery, execution, final_owner):
    need(plan['schema']=='state45-writer-plan-v1' and plan['generatorVersion']==1,'writer-plan-schema')
    need(plan['channels']==['9101','9201'] and plan['segmentSeconds']==2 and
         plan['minimumNormalPerChannel']==65 and plan['maxSegmentBytes']==71237 and
         plan['continuousMaxBytes']==113246208 and plan['reservationBytes']==67108864,'writer-plan-contract')
    need(execution['exit']==0 and not execution['forced'] and execution['stopMs']<=5000 and
         execution['portsClosed'] and execution['groupAbsent'],'writer-shutdown')
    need(final_owner['phase']=='after-storage-destruction' and final_owner['readerCleanupHealthy'] and
         all(final_owner[k]==0 for k in ['ram','scratchRam','scratchDisk','scratchFd','preservedDisk','preservedFd']),'writer-owner')
    need(recovery['catalogRecovered'] and recovery['deleted']==0 and recovery['available']==len(rows),'writer-recovery')
    ids=set(); channels={}
    for r in rows:
        need(r['id'] not in ids and r['channel'] in plan['channels'],'writer-id-channel'); ids.add(r['id'])
        need(0<r['bytes']<=71237 and r['bytes']==r['catalogBytes'] and r['sha256']==r['catalogSha256'],'writer-file-binding')
        need(isinstance(r['duration'],(float,int)) and 0<r['duration']<=2.10,'writer-duration')
        c=channels.setdefault(r['channel'],[])
        need(not c or r['order']>c[-1]['order'],'writer-order'); c.append(r)
    for channel in plan['channels']:
        c=channels.get(channel,[]); normal=[r for r in c if 1.95<=r['duration']<=2.10]
        need(len(normal)>=65,'writer-sample-coverage')
        mean=sum(r['bytes'] for r in normal)/len(normal)
        need(51200<=mean<=61440,'writer-mean-bound')
        channels[channel]=dict(count=len(c),normal=len(normal),mean=mean,max=max(r['bytes'] for r in c))
    return channels

def validate(repo, bundle, expected_sha):
    need(sha(bundle)==expected_sha,'bundle-sha')
    b=json.loads(Path(bundle).read_text())
    need(b['schema']==SCHEMA and b['officialAdoption'] is False,'schema-or-adoption')
    need(b['gates']==GATES,'gate-change')
    current=identity(repo); need(current==read(b['source']),'source-head-or-bytes')
    binary=bound(b['binary']); bound(b['runtime']); bound(b['input'])
    fresh=read(b['freshness'])
    need(fresh['status']=='PASS_TARGET_AWARE_PREFLIGHT' and
         fresh['targets']['media_server']['artifactSha256']==b['binary']['sha256'] and
         fresh['targets']['media_server_runtime']['artifactSha256']==b['runtime']['sha256'],'build-freshness')
    models=read(b['models']); need(models['files'],'models-empty')
    for entry in models['files']: bound(entry)
    plan=read(b['plan']); review=read(b['writer'])
    need(plan['runId']==review['runId'] and plan['source']==b['source'] and
         plan['binary']==b['binary'] and plan['input']==b['input'],'writer-plan-binding')
    need(review['planSha256']==b['plan']['sha256'] and review['sourceEnd']==current,'writer-source-binding')
    need(review['status']=='MEASURED' and review['synthetic'] is False,'writer-failed-or-synthetic')
    for entry in review['rawArtifacts']: bound(entry)
    rows=read(review['rows']); recovery=read(review['recovery'])
    for r in rows:
        need(artifact(bound(r['file']))['sha256']==r['sha256'] and r['file']['bytes']==r['bytes'],'writer-media')
    channels=writer_review(plan,rows,recovery,review['execution'],review['finalOwner'])
    execution=read(b['smokeExecution']); report=read(b['smokeReport'])
    need(execution['status']=='PASS' and execution['exit']==0 and execution['childExit']==0 and
         not execution['timedOut'] and execution['processGroupAbsent'] and execution['registeredGroupsAbsent'],'smoke-execution')
    need(execution['source']==execution['sourceEnd'] and execution['source']['head']==current['head'] and
         execution['source']['binarySha256']==b['binary']['sha256'],'smoke-source')
    need(report['failed']==0 and report['passed']>0 and report['blockerResults']['retention']['status']=='VERIFIED','smoke-result')
    # 원출력 전체가 별도 Manifest에 결속돼야 한다. 요약 PASS만으로 수용하지 않는다.
    for role in ['smokeRaw','native','shutdown']:
        manifest=read(b[role]); need(manifest['files'],'evidence-empty:'+role)
        for entry in manifest['files']: bound(entry)
    # Prototype는 실제 선행 검증의 바이트/측정값 결속만 판정한다. 공식 Gate는 절대 승격하지 않는다.
    need(identity(repo)==current and sha(binary)==b['binary']['sha256'],'postflight-changed')
    return dict(schema=SCHEMA,qualification='PROTOTYPE_BINDING_VALID',stateReady=False,
                officialAdoption=False,officialRuns=0,writerChannels=channels,
                limitations=['Native/Shutdown provenance requires explicit policy review',
                             'short Smoke is not State45 or natural-retention qualification'])

if __name__=='__main__':
    if len(sys.argv)!=5 or sys.argv[1]!='--prototype':
        raise SystemExit('usage: recording_state_requalification.py --prototype REPO BUNDLE SHA256')
    print(json.dumps(validate(*sys.argv[2:]),indent=2))
