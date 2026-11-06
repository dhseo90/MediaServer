#!/usr/bin/env python3
"""Explicit v2 Recorder successor: pinned reviewed product + bounded diagnostic delta.
No user supplied allowlist, no inheritance of the old product's qualification.
Writer/Smoke/Build must execute at the final clean HEAD. Native is reused only for
unchanged functional bytes, with new diagnostic tests for the exact delta.
"""
import json  # 파일 용도: 고정된 검토 제품과 제한된 진단 차이를 대조하여 v2 Recorder 후속 결속을 검증한다.
from pathlib import Path
import subprocess
import sys
from recording_state_requalification import (artifact,bound,read,sha,identity,need,git,
    _validate_current,validate_fixed_lineage_artifacts)
from recording_state_binding_v2 import _bind_current
CONTRACT='v2-recorder-1'
SCHEMA='media-server.state45-recorder.v1'
BASE='14162b7113ed506cb803c90b990a7d303330f7f5'
OFFICIAL='aa4fc55c213a66292ab2e66d58bd5e393edd99b8'
INTEGRATION_SHA='91c87864357d66a33a912ef96788e44013a957fb32b7053fd3aa3c94759f36eb'
REVIEW_SHA='36494b7130578bbd0988d8334ca5e315f881918e4aefd8fce6851c606aa6838e'
PATCH_SHA='21000e4633cacbc84e17e4b091cda7fb675118862c692774c5ca7b57c73e103b'
POLICY=Path(__file__).with_name('recording_state_recorder_policy.json')

def anchored(entry,digest):
    need(entry['sha256']==digest,'recorder-trust-anchor')
    file=bound(entry);m=read(entry)
    return file.parent,{x['path']:x for x in m['files']}

def member(root,rows,name):
    need(name in rows,'recorder-anchor-member')
    row=rows[name];relative=Path(name)
    need(not relative.is_absolute() and '..' not in relative.parts,'recorder-anchor-path')
    return bound(dict(path=str(root/relative),sha256=row['sha256'],bytes=row['bytes']))

def validate_recorder_lineage(repo,b):
    line=read(b['recorderLineage']);policy=json.loads(POLICY.read_text())
    need(line['schema']=='state45-recorder-lineage-v1','recorder-lineage-schema')
    need(line['policy']==artifact(POLICY),'recorder-policy')
    need(line['baseHead']==BASE and line['officialHead']==OFFICIAL,'recorder-base-head')
    subprocess.run(['git','merge-base','--is-ancestor',BASE,'HEAD'],cwd=repo,check=True,stdout=subprocess.DEVNULL)
    need(git(repo,'rev-list','--reverse',OFFICIAL+'..'+BASE).splitlines()==[
      'cbc7fb9538e449a5999745d783d4740498f17577','c0a2cf3f0d71ebb6b6777725bd50fbb540dd8d66',BASE],'recorder-commit-chain')
    root,entries=anchored(line['integration'],INTEGRATION_SHA)
    rr,re=anchored(line['independentReview'],REVIEW_SHA)
    patch=member(root,entries,'candidate.patch');need(sha(patch)==PATCH_SHA,'recorder-patch')
    need(line['candidatePatch']==artifact(patch),'recorder-patch-binding')
    need(sha(member(rr,re,'candidate.patch'))==PATCH_SHA,'recorder-review-candidate')
    member(rr,re,'recorder-latest-independent-review.txt')
    sources=json.loads(member(root,entries,'evidence/candidate-source-manifest.json').read_text())
    need(len(sources)==405,'recorder-source-count')
    current=identity(repo)
    product_names={p for p in current['sources'] if p=='CMakeLists.txt' or p.startswith(('src/','include/'))}
    # 기존 405개 manifest 밖에 추가된 파일까지 포함한 전체 Git 제품 파일 집합이다.
    baseline_names=set(git(repo,'ls-tree','-r','--name-only',BASE,'--','CMakeLists.txt','src','include').splitlines())
    need(product_names==baseline_names,'recorder-product-file-set')
    changed=set(git(repo,'diff','--name-only',BASE,'HEAD','--','CMakeLists.txt','src','include').splitlines())
    need(changed==set(policy['diagnosticSources']),'recorder-delta-scope')
    for name in baseline_names:
        original=subprocess.check_output(['git','show',BASE+':'+name],cwd=repo)
        import hashlib
        digest=hashlib.sha256(original).hexdigest()
        if name in sources:need(sources[name]==digest,'recorder-reviewed-source')
        need(current['sources'][name]==policy['diagnosticSources'].get(name,digest),'recorder-product-bytes')
    need(line['finalHead']==current['head'] and read(line['finalProductSources'])=={p:current['sources'][p] for p in sorted(product_names)},'recorder-final-source')
    reuse=member(root,entries,'evidence/native-reuse.json')
    need(line['nativeReuse']==artifact(reuse),'recorder-native-provenance')
    native=json.loads(reuse.read_text());need(len(native['files'])==39,'recorder-native-coverage')
    for row in native['files']:
        p=Path(row['path']);bound(dict(path=str(p),sha256=row['sha256'],bytes=p.stat().st_size))
    # 정확한 과거 Multi-Finalize·Shutdown artifact는 보존하되 그때의 제품 적격성은
    # 승계하지 않는다. 아래의 새 Writer·Smoke가 최종 제품의 중지를 증명한다.
    validate_fixed_lineage_artifacts(b)
    diagnostic=read(line['diagnostic'])
    need(diagnostic['schema']=='recorder-mutex-qualification-v1' and diagnostic['source']==current and
         diagnostic['diagnosticSources']==policy['diagnosticSources'],'recorder-diagnostic-source')
    need(diagnostic['passed'] is True and diagnostic['cases']==policy['requiredDiagnosticCases'],'recorder-diagnostic-coverage')
    execution=read(diagnostic['execution']);need(execution['exit']==0 and execution['head']==current['head'] and execution['command']==['node','--test','scripts/internal/recording_mutex_identity.test.mjs'],'recorder-diagnostic-execution')
    output=bound(diagnostic['output']).read_text();need('# pass 15' in output and '# fail 0' in output,'recorder-diagnostic-result')
    need(diagnostic['execution'] in diagnostic['artifacts'] and diagnostic['output'] in diagnostic['artifacts'],'recorder-diagnostic-artifacts')
    for entry in diagnostic['artifacts']:bound(entry)
    need(bool(diagnostic['artifacts']),'recorder-diagnostic-empty')
    return dict(functionalNative='reused exact functional bytes; diagnostic delta separately tested')

def qualify(repo,bundle,digest):
    return _validate_current(repo,bundle,digest,validate_recorder_lineage)

def bind(repo,file,digest):
    result=_bind_current(repo,file,digest,SCHEMA,CONTRACT,qualify)
    result['nativeReuse']='historical functional tests; explicit diagnostic-only delta'
    return result

if __name__=='__main__':
    if len(sys.argv)!=5 or sys.argv[1]!='--binding':raise SystemExit('usage: --binding REPO BUNDLE SHA')
    print(json.dumps(bind(*sys.argv[2:])))
