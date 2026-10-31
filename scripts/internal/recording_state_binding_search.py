#!/usr/bin/env python3
"""Exact reviewed Search successor; historical contracts keep their product guards.
Recorder lineage uses the same conditions as its unchanged historical validator,
with batched immutable Git blob reads on the pinned clean prior repository. Only the reviewed single-file Search delta is admitted here. Current
Build/Writer/Smoke/helper/model gates are inherited without replacing any check.
"""
import json
import hashlib
from pathlib import Path
import subprocess
import sys
from recording_state_requalification import (artifact, bound, read, sha, identity,
    need, git, GATES, _validate_current, validate_fixed_lineage_artifacts)
from recording_state_binding_v2 import _bind_current
from recording_state_binding_recorder import (anchored, member, BASE, OFFICIAL,
    INTEGRATION_SHA, REVIEW_SHA as RECORDER_REVIEW_SHA, PATCH_SHA)

CONTRACT='v2-recorder-search-1'
SCHEMA='media-server.state45-recorder-search.v1'
PREVIOUS_HEAD='89108bd28b430ee263bf1fe8752d1948663542df'
RECORDER_BUNDLE_SHA='2d490d959a8b1f532b24d7ab07166285ceb91bbc4ef19bb04a660b94d845938a'
REVIEW_SHA='2e95206f20f1fed46c08e93f1d874b86a33e540ed65c48f5659e809584447555'
PREPARATION_SHA='f0b3dafba891b3c4d53c91651cb1cc659fae056c29de2cd90de8de2ab5a6296e'
PUBLICATION_SHA='b5dc58677191ae8c98f278b7d159b9c2c4cb40505fe5e331a75ca94e9c9932a6'
SOURCE='src/recording/recording_search_source.cpp'
FIXTURE='scripts/internal/recording_search_retry_smoke.cpp'
SOURCE_SHA='f2d4c5bb5247e3374626187951e19d70234f54d1d714ecfb2a1bb060cf940c95'
VERDICT='SEARCH_PREPARATION_INDEPENDENT_REVIEW_GO'
# The exact members are authenticated through the fixed manifests above.
PATCH_MEMBERS={'candidatePatch':'candidate.patch','rebasePatch':'preparation-only.diff'}
NATIVE_MEMBERS={
 'focusedExecution':'evidence/native-approved.json',
 'focusedOutput':'evidence/native-approved.stdout',
 'focusedError':'evidence/native-approved.stderr',
 'focusedCompile':'evidence/native-approved-compile.json',
 'regressionExecution':'evidence/native-existing-retry.json',
 'regressionOutput':'evidence/native-existing-retry.stdout',
 'regressionError':'evidence/native-existing-retry.stderr',
 'regressionCompile':'evidence/native-final-compile.json',
 'focusedBinary':'native-approved','regressionBinary':'native-final'}

def product_sources(current):
    return {p:h for p,h in current['sources'].items()
            if p=='CMakeLists.txt' or p.startswith(('src/','include/'))}

def validate_product_delta(repo, current, reviewed):
    expected=reviewed['files']
    need(len(expected)==406 and expected.get(SOURCE)==SOURCE_SHA,'search-reviewed-product-manifest')
    actual=product_sources(current)
    need(actual==expected,'search-product-bytes')
    previous=set(git(repo,'ls-tree','-r','--name-only',PREVIOUS_HEAD,'--','CMakeLists.txt','src','include').splitlines())
    need(set(actual)==previous,'search-product-file-set')
    changed=set(git(repo,'diff','--name-only',PREVIOUS_HEAD,'HEAD','--','CMakeLists.txt','src','include').splitlines())
    need(changed=={SOURCE},'search-delta-scope')

def product_blob_digests(repo,names):
    """Read each exact BASE:path blob once, preserving binary bytes and mapping.
    This is an invocation-local batch read, not a cache or acceptance receipt.
    """
    names=sorted(names)
    need(all(not Path(p).is_absolute() and '..' not in Path(p).parts and
             not any(c in p for c in ['\n','\r','\0']) for p in names),'recorder-batch-path')
    request=''.join(BASE+':'+p+'\n' for p in names).encode()
    output=subprocess.check_output(['git','cat-file','--batch'],cwd=repo,input=request)
    return parse_product_blob_digests(output,names)


def parse_product_blob_digests(output,names):
    result={};offset=0
    for name in names:
        end=output.find(b'\n',offset)
        need(end>=offset,'recorder-batch-header')
        fields=output[offset:end].split(b' ')
        need(len(fields)==3 and len(fields[0])==40 and
             all(c in b'0123456789abcdef' for c in fields[0]) and
             fields[1]==b'blob' and fields[2].isdigit(),'recorder-batch-header')
        size=int(fields[2]);offset=end+1;data=output[offset:offset+size]
        need(len(data)==size and output[offset+size:offset+size+1]==b'\n','recorder-batch-size')
        need(hashlib.sha1(b'blob '+str(size).encode()+b'\0'+data).hexdigest().encode()==fields[0],
             'recorder-batch-object')
        need(name not in result,'recorder-batch-duplicate')
        result[name]=hashlib.sha256(data).hexdigest();offset+=size+1
    need(offset==len(output),'recorder-batch-trailing')
    return result


def validate_prior_recorder_lineage(repo,b,current):
    """Recorder v1 conditions; current is the enclosing prior entry snapshot."""
    policy_path=Path(repo)/'scripts/internal/recording_state_recorder_policy.json'
    line=read(b['recorderLineage']);policy=json.loads(policy_path.read_text())
    need(line['schema']=='state45-recorder-lineage-v1','recorder-lineage-schema')
    need(line['policy']==artifact(policy_path),'recorder-policy')
    need(line['baseHead']==BASE and line['officialHead']==OFFICIAL,'recorder-base-head')
    subprocess.run(['git','merge-base','--is-ancestor',BASE,'HEAD'],cwd=repo,check=True,stdout=subprocess.DEVNULL)
    need(git(repo,'rev-list','--reverse',OFFICIAL+'..'+BASE).splitlines()==[
      'cbc7fb9538e449a5999745d783d4740498f17577','c0a2cf3f0d71ebb6b6777725bd50fbb540dd8d66',BASE],'recorder-commit-chain')
    root,entries=anchored(line['integration'],INTEGRATION_SHA)
    rr,re=anchored(line['independentReview'],RECORDER_REVIEW_SHA)
    patch=member(root,entries,'candidate.patch');need(sha(patch)==PATCH_SHA,'recorder-patch')
    need(line['candidatePatch']==artifact(patch),'recorder-patch-binding')
    need(sha(member(rr,re,'candidate.patch'))==PATCH_SHA,'recorder-review-candidate')
    member(rr,re,'recorder-latest-independent-review.txt')
    sources=json.loads(member(root,entries,'evidence/candidate-source-manifest.json').read_text())
    need(len(sources)==405,'recorder-source-count')
    product_names={p for p in current['sources'] if p=='CMakeLists.txt' or p.startswith(('src/','include/'))}
    # Full git product set, including any additions outside the old 405 manifest.
    baseline_names=set(git(repo,'ls-tree','-r','--name-only',BASE,'--','CMakeLists.txt','src','include').splitlines())
    need(product_names==baseline_names,'recorder-product-file-set')
    changed=set(git(repo,'diff','--name-only',BASE,'HEAD','--','CMakeLists.txt','src','include').splitlines())
    need(changed==set(policy['diagnosticSources']),'recorder-delta-scope')
    digests=product_blob_digests(repo,baseline_names)
    for name in baseline_names:
        digest=digests[name]
        if name in sources:need(sources[name]==digest,'recorder-reviewed-source')
        need(current['sources'][name]==policy['diagnosticSources'].get(name,digest),'recorder-product-bytes')
    need(line['finalHead']==current['head'] and read(line['finalProductSources'])=={p:current['sources'][p] for p in sorted(product_names)},'recorder-final-source')
    reuse=member(root,entries,'evidence/native-reuse.json')
    need(line['nativeReuse']==artifact(reuse),'recorder-native-provenance')
    native=json.loads(reuse.read_text());need(len(native['files'])==39,'recorder-native-coverage')
    for row in native['files']:
        p=Path(row['path']);bound(dict(path=str(p),sha256=row['sha256'],bytes=p.stat().st_size))
    # Preserve exact historical Multi-Finalize/Shutdown artifacts, but not their
    # old product qualification. New Writer/Smoke below prove final product stop.
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

def validate_previous_recorder(repo, entry):
    need(entry['sha256']==RECORDER_BUNDLE_SHA,'search-recorder-anchor')
    old=read(entry)
    need(old['contractVersion']=='v2-recorder-1' and old['schema']=='media-server.state45-recorder.v1' and old['gates']==GATES,'search-recorder-contract')
    inner=read(old['qualification']);line=read(inner['recorderLineage'])
    prior_repo=Path(line['policy']['path']).parents[2]
    previous=identity(prior_repo)
    need(previous==read(inner['source']) and previous['head']==PREVIOUS_HEAD and line['finalHead']==PREVIOUS_HEAD,'search-recorder-source')
    # Keep the prior full-source entry/exit snapshots. The intervening Recorder
    # conditions are identical to its original validator, with immutable Git
    # blob reads batched rather than spawning one git process for every file.
    for name in ['recording_state_binding_recorder.py','recording_state_requalification.py',
                 'recording_state_binding_v2.py','recording_state_recorder_policy.json']:
        relative='scripts/internal/'+name
        need(sha(Path(repo)/relative)==previous['sources'][relative], 'search-recorder-validator-bytes')
    validate_prior_recorder_lineage(prior_repo,inner,previous)
    need(identity(prior_repo)==previous,'search-recorder-postflight')
    subprocess.run(['git','merge-base','--is-ancestor',PREVIOUS_HEAD,'HEAD'],cwd=repo,check=True,stdout=subprocess.DEVNULL)
    return previous

def validate_search_lineage(repo,b):
    line=read(b['searchLineage']);current=identity(repo)
    need(line['schema']=='state45-recorder-search-lineage-v1','search-lineage-schema')
    need(line['previousHead']==PREVIOUS_HEAD and line['finalHead']==current['head'],'search-final-head')
    need(line['validator']==artifact(Path(__file__)),'search-validator-version')
    previous=validate_previous_recorder(repo,line['recorderBundle'])
    validate_fixed_lineage_artifacts(b)
    rr,re=anchored(line['independentReview'],REVIEW_SHA)
    review=read(line['independentReview'])
    need(review['schema']=='search-combined-independent-review-evidence-v1' and review['verdict']==VERDICT and review['baseHead']==PREVIOUS_HEAD,'search-review-verdict')
    for name in ['independent-review.txt','independent-review.json','evidence/lineage.json']:
        member(rr,re,name)
    review_line=json.loads(member(rr,re,'evidence/lineage.json').read_text())
    need(review_line['sourceChainMatches'] is True and review_line['products']==406 and
         review_line['changedProductFiles']==[SOURCE] and review_line['combinedSourceSha256']==SOURCE_SHA,'search-review-chain')
    root,rows=anchored(line['searchPreparation'],PREPARATION_SHA)
    pub,pubrows=anchored(line['publication'],PUBLICATION_SHA)
    references={(x['root'],x['manifestSha256']) for x in review['references'] if x['pass'] is True}
    need((str(root),PREPARATION_SHA) in references and (str(pub),PUBLICATION_SHA) in references,'search-review-reference')
    for role,name in PATCH_MEMBERS.items():
        need(line[role]==artifact(member(root,rows,name)),'search-patch-binding:'+role)
    need(line['publicationPatch']==artifact(member(pub,pubrows,'candidate.patch')),'search-publication-patch')
    reviewed=member(root,rows,'evidence/new-source-binding.json')
    need(line['reviewedProductSources']==artifact(reviewed),'search-reviewed-source-binding')
    reviewed=json.loads(reviewed.read_text());validate_product_delta(repo,current,reviewed)
    need(read(line['finalProductSources'])==product_sources(current),'search-final-product-source')
    # Preserve all prior Recorder product bytes, including the two diagnostic
    # headers. Search is the only authorized product difference from 89108.
    need({p:h for p,h in product_sources(current).items() if p!=SOURCE}==
         {p:h for p,h in product_sources(previous).items() if p!=SOURCE},'search-recorder-product-preservation')
    need(artifact(Path(repo)/FIXTURE)['sha256']==
         artifact(member(rr,re,'lineage-combined/'+FIXTURE))['sha256'],'search-fixture-bytes')
    policy=json.loads(Path(__file__).with_name('recording_state_recorder_policy.json').read_text())
    diagnostic=read(line['diagnostic'])
    need(diagnostic['schema']=='recorder-mutex-qualification-v1' and diagnostic['source']==current and
         diagnostic['diagnosticSources']==policy['diagnosticSources'],'search-diagnostic-source')
    need(diagnostic['passed'] is True and diagnostic['cases']==policy['requiredDiagnosticCases'],'search-diagnostic-coverage')
    execution=read(diagnostic['execution'])
    need(execution['exit']==0 and execution['head']==current['head'] and execution['command']==
         ['node','--test','scripts/internal/recording_mutex_identity.test.mjs'],'search-diagnostic-execution')
    output=bound(diagnostic['output']).read_text()
    need('# pass 15' in output and '# fail 0' in output,'search-diagnostic-result')
    need(diagnostic['execution'] in diagnostic['artifacts'] and diagnostic['output'] in diagnostic['artifacts'],'search-diagnostic-artifacts')
    for entry in diagnostic['artifacts']:bound(entry)
    need(bool(diagnostic['artifacts']),'search-diagnostic-empty')
    native=line['native']
    need(set(native)==set(NATIVE_MEMBERS),'search-native-coverage')
    for role,name in NATIVE_MEMBERS.items():
        need(native[role]==artifact(member(root,rows,name)),'search-native-binding:'+role)
    for role,count in [('focused',93),('regression',1250)]:
        execution=read(native[role+'Execution']);compile_result=read(native[role+'Compile'])
        need(execution['exit']==0 and compile_result['exit']==0 and
             execution['command'][0]==native[role+'Binary']['path'],'search-native-execution:'+role)
        text=bound(native[role+'Output']).read_text()
        prefix='[retention-publication]' if role=='focused' else '[search-retry]'
        need(f'{prefix} pass={count} fail=0' in text and
             sum(x.startswith('[pass] ') for x in text.splitlines())==count and
             not any(x.startswith('[fail] ') for x in text.splitlines()),'search-native-result:'+role)
    return dict(searchNative='reused exact reviewed source: focused93 (includes69), regression1250; not new execution')

def qualify(repo,bundle,digest):
    return _validate_current(repo,bundle,digest,validate_search_lineage)

def bind(repo,file,digest):
    result=_bind_current(repo,file,digest,SCHEMA,CONTRACT,qualify)
    result['nativeReuse']='pinned Recorder native/diagnostic lineage; reviewed Search focused93/regression1250'
    result['validator']=artifact(Path(__file__))
    result['previousQualifiedHead']=PREVIOUS_HEAD
    return result

if __name__=='__main__':
    if len(sys.argv)!=5 or sys.argv[1]!='--binding':raise SystemExit('usage: --binding REPO BUNDLE SHA')
    print(json.dumps(bind(*sys.argv[2:])))
