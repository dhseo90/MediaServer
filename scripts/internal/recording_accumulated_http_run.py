#!/usr/bin/env python3
"""R153 owned direct fixture: one seed + one HTTP cycle, total <=180s; no product launch."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import selectors
import shlex
import signal
import subprocess
import time
from recording_native_isolation import environment

REPO = Path(__file__).resolve().parents[2]
PRODUCTS = {'media_server': '33f516d35d56cb2f6cafc75647b6c37d2ced67115302d1205cca23bf51ab7f79',
            'libmedia_server_runtime.a': '2d91cf35fe7e805e0c06e00d16779c86849b35db635e087582277e1b676d198c'}
CAP = 4 * 1024 * 1024
PHASES = ['seed-verified', 'manifest', 'visual-ready', 'server', 'auth-seed-ready',
          'four-accepted', 'four-complete', 'evidence-complete', 'a-prepare-start',
          'a-prepare-complete', 'background-complete', 'services-stopped', 'finish', 'complete']

def digest(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def fixed_products():
    values = {k: digest(REPO / 'build-gst-onnx' / k) for k in PRODUCTS}
    if values != PRODUCTS:
        raise ValueError('fixed product/runtime SHA mismatch')
    return values

def sources():
    # Native include dependency closure is additionally retained from compiler depfiles.
    names = ['recording_accumulated_http_smoke.cpp', 'recording_accumulated_seed.cpp',
             'recording_accumulated_http_run.py', 'recording_degraded_http_smoke.cpp',
             'recording_source_http_fixture.h', 'recording_native_isolation.py',
             'recording_visual_contention_observer.mjs', 'recording_process_metrics.cpp']
    return {n: digest(REPO / 'scripts/internal' / n) for n in names}

def failure_summary(rows):
    first=[(i,r) for i,r in enumerate(rows) if r.get('phase')=='first-failure']
    terminal=[(i,r) for i,r in enumerate(rows) if r.get('phase')=='terminal']
    cleanup=[(i,r) for i,r in enumerate(rows) if r.get('phase') in ('cleanup-error','failure-cleanup-finish')]
    if len(first)!=1 or not first[0][1].get('error'): raise ValueError('missing/duplicate first failure')
    if len(terminal)!=1 or terminal[0][0]!=len(rows)-1 or terminal[0][1].get('exit')!=1: raise ValueError('missing/invalid failure terminal')
    if any(i<first[0][0] for i,_ in cleanup):raise ValueError('cleanup before first failure')
    if terminal[0][1].get('outputFailed') is not False:raise ValueError('diagnostic output failure')
    return {'firstFailure':first[0][1]['error'],'cleanupEvents':[r for _,r in cleanup]}

def qualify(rows):
    if any(r.get('phase') in ('first-failure', 'failure-cleanup-finish', 'cleanup-error', 'terminal') for r in rows):
        raise ValueError('first fixture failure retained')
    if [r['phase'] for r in rows if r['phase'] in PHASES] != PHASES:
        raise ValueError('missing/duplicate/reordered cycle phase')
    http = [r for r in rows if r['phase'] == 'http']
    ids = [r['id'] for r in http]
    if len(ids) != len(set(ids)):
        raise ValueError('duplicate HTTP request')
    for r in http:
        if r['status'] != {1:401, 2:403, 20:201, 40:201, 61:201, 76:201}.get(r['id'], 200):
            raise ValueError('HTTP status failure')
        if not 0 <= r['ms'] <= 5000 or r['bytes'] <= 0:
            raise ValueError('HTTP timeout/partial response')
    if not set([1,2,3,4,10,11,12,13,20,40,60,61,75,76,77]).issubset(ids):
        raise ValueError('required HTTP request missing')
    if max(r['ms'] for r in http if 10 <= r['id'] <= 13) > 2000:
        raise ValueError('existing normal search latency bound')
    positions = {r['phase']:i for i,r in enumerate(rows) if r['phase'] in PHASES}
    for i,r in enumerate(rows):
        if r['phase'] != 'http': continue
        lo,hi = ('server','auth-seed-ready') if r['id'] < 10 else ('four-accepted','four-complete') if r['id'] < 20 else ('four-complete','evidence-complete') if r['id'] < 60 else ('a-prepare-start','a-prepare-complete')
        if not positions[lo] < i < positions[hi]: raise ValueError('HTTP phase order')
    if len([r for r in rows if r['phase'] == 'package-readback']) != 3:
        raise ValueError('required package readback')
    manifest = next(r for r in rows if r['phase'] == 'manifest')['rows']
    decodes=[(i,r) for i,r in enumerate(rows) if r.get('phase')=='media-decode']
    if len(decodes)!=2 or {r.get('channel') for _,r in decodes}!={'9101','9201'}:raise ValueError('representative decode count/channel')
    for i,r in decodes:
        if r.get('targetNs')!=0 or not positions['seed-verified']<i<positions['manifest'] or not any(m['channel']==r['channel'] and m['segment']==r.get('segment') for m in manifest):raise ValueError('representative decode binding/order')
    seen = set()
    for r in manifest:
        if r['segment'] in seen or r['bytes'] <= 0 or len(r['sha256']) != 64 or not all(c in '0123456789abcdef' for c in r['sha256']):
            raise ValueError('invalid/duplicate input manifest')
        if r.get('bindingSegment')!=r['segment'] or r.get('bindingChannel')!=r['channel'] or r.get('inspection') is not True:
            raise ValueError('missing/mismatched binding or inspection')
        seen.add(r['segment'])
        if r['samples'] != r['lastOrdinal'] - r['firstOrdinal'] + 1:
            raise ValueError('ordinal coverage')
    for channel, count, samples in [('1',1,30),('9101',8,480),('9201',8,480)]:
        selected = [r for r in manifest if r['channel'] == channel]
        if len(selected) != count or sum(r['samples'] for r in selected) != samples:
            raise ValueError('incomplete accumulated input')
    for channel in ('1','9101','9201'):
        selected=[r for r in manifest if r['channel']==channel];generations={r['generation'] for r in selected}
        if len(generations)!=(1 if channel=='1' else 4):raise ValueError('generation count')
        for generation in generations:
            ordinals=[n for r in selected if r['generation']==generation for n in range(r['firstOrdinal'],r['lastOrdinal']+1)]
            if sorted(ordinals)!=list(range(1,31 if channel=='1' else 121)):raise ValueError('generation ordinal set')
    if len(manifest) != 17:
        raise ValueError('unexpected input channel')
    if any(r.get('monoNs',0)<0 for r in rows):raise ValueError('negative monotonic stamp')
    final = rows[-1]
    if final['phase'] != 'complete' or any(final[k] != 0 for k in ('logicalRam','scratch','fd')):
        raise ValueError('last owner/normal completion')
    return {'decision':'PASS_BOUNDED_FIXTURE_QUALIFIED', 'httpRequests':len(http),
            'inputFiles':17, 'inputSamples':990, 'ordinarySearches':4,
            'latencyAttribution':'NOT_RUN'}

def build(parent):
    fixed_products()
    b = REPO / 'build-gst-onnx'
    flags = {}
    for line in (b/'CMakeFiles/media_server_runtime.dir/flags.make').read_text().splitlines():
        if ' = ' in line:
            k,v = line.split(' = ',1); flags[k] = shlex.split(v)
    link = shlex.split((b/'CMakeFiles/media_server.dir/link.txt').read_text())
    libs = link[link.index('libmedia_server_runtime.a')+1:]
    for name, source in [('fixture','recording_accumulated_http_smoke.cpp'), ('seed','recording_accumulated_seed.cpp')]:
        cmd = [link[0], *flags['CXX_DEFINES'], *flags['CXX_INCLUDES'], *flags['CXX_FLAGS'],
               '-Wall','-Wextra','-Werror','-MMD','-MF',str(parent/(name+'.d')),
               '-I'+str(REPO/'scripts/internal'),str(REPO/'scripts/internal'/source),
               str(b/'libmedia_server_runtime.a'),*libs,'-o',str(parent/name)]
        with (parent/(name+'-build.log')).open('xb') as f:
            subprocess.run(cmd, stdout=f, stderr=subprocess.STDOUT, check=True, timeout=180)
    with (parent/'metrics-build.log').open('xb') as f:
        subprocess.run(['c++','-std=c++17',str(REPO/'scripts/internal/recording_process_metrics.cpp'),'-o',str(parent/'process-metrics')],stdout=f,stderr=subprocess.STDOUT,check=True,timeout=60)
    # Read compiler-emitted escaped depfiles through the already tested freshness parser.
    from recording_build_freshness import depfile
    deps = {}
    for name in ('fixture','seed'):
        _, parsed = depfile((parent/(name+'.d')).read_text())
        for dep in parsed:
            p = Path(dep)
            if not p.is_file(): raise ValueError('missing compiler dependency')
            if REPO in p.parents:
                deps[str(p.relative_to(REPO))] = digest(p)
    for name in ('CMakeFiles/media_server_runtime.dir/flags.make','CMakeFiles/media_server.dir/link.txt'):
        deps['build-gst-onnx/'+name] = digest(b/name)
    record = {'products':fixed_products(), 'sources':sources(), 'dependencies':deps,
              'binaries':{n:digest(parent/n) for n in ('fixture','seed','process-metrics')}}
    (parent/'build-binding.json').write_text(json.dumps(record,indent=2)+'\n')

def run(parent):
    binding = json.loads((parent/'build-binding.json').read_text())
    if binding['products'] != fixed_products() or binding['sources'] != sources():
        raise ValueError('stale build binding')
    for name, sha in binding['binaries'].items():
        if digest(parent/name) != sha: raise ValueError('binary binding')
    for name, sha in binding['dependencies'].items():
        if digest(REPO/name) != sha: raise ValueError('included source binding')
    root = parent/'run';root.mkdir(mode=0o700)  # exclusive leaf also rejects a second cycle
    env = environment(root)
    t = time.monotonic(); deadline = t+166  # reserve14s for two TERM/KILL drains within180
    record = {'schema':'media-server.r153.execution.v1','products':fixed_products(),
              'buildBinding':binding,'seedStarts':0,'fixtureStarts':0,'productStarts':0,
              'limitSeconds':180,'logCapBytes':CAP,'firstFailure':None,'cleanupErrors':[],
              'pids':[], 'collectorStarts':0, 'processes':[], 'runnerFailure':None, 'diagnosticErrors':[], 'cleanupEvents':[]}
    output = bytearray();children=[];rows=[]
    def stop(p):
        if p.poll() is None:
            try: os.killpg(p.pid,signal.SIGTERM)
            except ProcessLookupError: pass
            try:p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(p.pid,signal.SIGKILL);p.wait(timeout=2)
    def launch(cmd, limit, observer=False):
        proc_record={'role':'fixture' if observer else 'confirmed-seed','limitSeconds':limit,'startElapsedSeconds':time.monotonic()-t}
        record['processes'].append(proc_record)
        p=subprocess.Popen(cmd,cwd=root,env=env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True)
        children.append(p);record['pids'].append(p.pid)
        sel=selectors.DefaultSelector();sel.register(p.stdout,selectors.EVENT_READ,'child');buffers={'child':b'','observer':b''}
        monitor=None
        if observer:
            monitor=subprocess.Popen(['node',str(REPO/'scripts/internal/recording_visual_contention_observer.mjs'),str(root),str(p.pid),str(parent/'process-metrics')],cwd=root,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True)
            children.append(monitor);record['collectorStarts']+=1;sel.register(monitor.stdout,selectors.EVENT_READ,'observer')
        end=min(deadline,time.monotonic()+limit); saved_start=len(output)
        try:
            while sel.get_map():
                if time.monotonic()>=end: raise TimeoutError('bounded process deadline')
                if monitor and monitor.poll() not in (None,0):raise ValueError('resource collector failure')
                for key,_ in sel.select(.05):
                    data=os.read(key.fileobj.fileno(),65536)
                    if not data:sel.unregister(key.fileobj);continue
                    if len(output)+len(data)>CAP or (not observer and len(output)+len(data)-saved_start>1024*1024):raise ValueError('process output cap')
                    output.extend(data);buffers[key.data]+=data
                    while b'\n' in buffers[key.data]:
                        line,buffers[key.data]=buffers[key.data].split(b'\n',1)
                        if line.startswith(b'[R153] '):
                            row=json.loads(line[7:]);rows.append(row)
                            if row.get('phase')=='first-failure' and record['firstFailure'] is None:record['firstFailure']=row.get('error')
                        if line.startswith(b'[R153-output-failure]'):record['diagnosticErrors'].append('native output failure')
                        if line.startswith(b'[R152-seed-failure]') and record['firstFailure'] is None:record['firstFailure']=line.decode('utf-8',errors='strict').split('] ',1)[-1][:256] if b'/' not in line and b'Bearer' not in line else 'confirmed seed failed (private detail redacted)'
                        if line==b'[R101-space-ready]' or line.startswith(b'[R101-space-phase] '):
                            p.stdin.write(b'continue\n');p.stdin.flush()
                        if line.startswith(b'[R101-phase] '):
                            (root/'resource-phase').write_text(line.split(b' ')[1].decode())
            if any(buffers.values()):raise ValueError('partial output record')
            rc=p.wait(timeout=1);proc_record['exit']=rc
            if monitor and monitor.wait(timeout=1)!=0:raise ValueError('observer nonzero exit')
            if rc:raise ValueError('child exit '+str(rc))
        finally:
            for child in (p,monitor):
                if child:stop(child)
            proc_record['elapsedSeconds']=time.monotonic()-t-proc_record['startElapsedSeconds'];proc_record['finalExit']=p.poll()
            sel.close()
    try:
        record['seedStarts']+=1;launch([str(parent/'seed'),str(root)],10)
        record['seedSeconds']=time.monotonic()-t
        fixed=sum(p.stat().st_size for folder in ('models/v430-siglip2','third_party/v430-embedding','build-gst-onnx') for p in (REPO/folder).rglob('*') if p.is_file() and not p.is_symlink())+(parent/'fixture').stat().st_size
        (root/'preparation-budget.json').write_text(json.dumps({'fixedBytes':fixed,'temporaryModelReserve':1129352764}))
        (root/'resource-phase').write_text('initial');env['MEDIA_SERVER_VERIFY_CONTENTION_OBSERVER']='1'
        record['fixtureStarts']+=1;launch([str(parent/'fixture'),str(root),str(REPO/'models/v430-siglip2')],deadline-time.monotonic(),True)
        record['qualification']=qualify(rows)
    except Exception as e:
        record['runnerFailure']=str(e);record['firstFailure']=record['firstFailure'] or str(e);record['qualification']={'decision':'FAIL_FIXTURE_CONTRACT'}
    finally:
        for child in children:
            try:stop(child)
            except Exception as e:record['cleanupErrors'].append(str(e))
        if record['fixtureStarts'] and record['firstFailure']:
            try:record.update(failure_summary(rows))
            except Exception as e:record['diagnosticErrors'].append(str(e))
        record['productsAfter']=fixed_products()
        record['elapsedSeconds']=time.monotonic()-t
        if record['elapsedSeconds']>180:
            record['firstFailure']=record['firstFailure'] or 'overall180s exceeded'
            record['qualification']={'decision':'FAIL_FIXTURE_CONTRACT'}
        record['outputBytes']=len(output)
        record['groupsAbsent']=True
        for child in children:
            try:os.killpg(child.pid,0);record['groupsAbsent']=False
            except ProcessLookupError:pass
        (root/'output.log').write_bytes(output);(root/'events.json').write_text(json.dumps(rows,indent=2)+'\n')
        (root/'execution.json').write_text(json.dumps(record,indent=2)+'\n')
    print(json.dumps({k:v for k,v in record.items() if k not in ('buildBinding',)},indent=2))
    return 1 if record['firstFailure'] or record['cleanupErrors'] or record['diagnosticErrors'] or not record['groupsAbsent'] else 0

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('action',choices=['build','run']);p.add_argument('parent');a=p.parse_args()
    parent=Path(a.parent);environment(parent)
    if a.action=='build':build(parent)
    else:raise SystemExit(run(parent))
