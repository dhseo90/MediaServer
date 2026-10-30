#!/usr/bin/env python3
"""새 실행만 수집하는 Writer 측정 도구. 공식 State 실행기와 연결하지 않는다."""
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import time
import uuid
from recording_state_requalification import artifact, identity, need, sha, writer_review


def save(p,v):
    with Path(p).open('x') as f: json.dump(v,f,indent=2); f.write('\n')

def port():
    with socket.socket() as s:
        s.bind(('127.0.0.1',0)); return s.getsockname()[1]

def closed(n):
    with socket.socket() as s:
        return s.connect_ex(('127.0.0.1',n))!=0

def collect(repo, output, source_input, helper, *, v2=False):
    repo=Path(repo).resolve(); root=Path(output)
    need(root.is_absolute() and not root.exists() and root.parent.resolve()==root.parent and
         root.name.startswith('media-server-current-observer-'),'new-owned-root')
    root.mkdir(mode=0o700)
    current=identity(repo); save(root/'source.json',current)
    for name in ['input','state','recordings','tmp','events']: (root/name).mkdir(mode=0o700)
    http,rtsp=port(),port(); need(http!=rtsp,'distinct-ports')
    binary=repo/'build-gst-onnx/media_server'
    settings=dict(enabled=True,revision=1,continuousMaxBytes=113246208,eventMaxBytes=134217728,
                  continuousMaxAgeMs=10800000,eventMaxAgeMs=10800000)
    sources=[dict(sourceId=id,displayName='Qualification '+id,kind='file',file=f'retention-{id}.mp4',
                  enabled=True,recording=settings) for id in ['9101','9201']]
    for s in sources: shutil.copyfile(source_input,root/'input'/s['file'])
    save(root/'state/sources.json',dict(sources=sources)); save(root/'state/views.json',dict(views=[]))
    plan=dict(schema='state45-writer-plan-v1',generatorVersion=1,runId=str(uuid.uuid4()),
              source=artifact(root/'source.json'),binary=artifact(binary),input=artifact(source_input),
              generator=artifact(__file__),helper=artifact(helper),channels=['9101','9201'],segmentSeconds=2,
              minimumNormalPerChannel=65,maxSegmentBytes=71237,continuousMaxBytes=113246208,
              reservationBytes=67108864,observeSeconds=134,deadlineSeconds=180,ports=[http,rtsp],
              workspaceBytes=469762048,peakRssBytes=4294967296,expected='65+ normal segments/channel; all files/hash/catalog; recovery; owner=0; stop<=5s')
    if v2:plan.update(qualificationContract='v2',qualificationGeneratorVersion=2,minimumBasis='65 normal segments/channel exceeds receipt capacity64; not a long-run or fast-path proof')
    save(root/'plan.json',plan)
    values=dict(SKIP_LOCAL_ENV=1,SKIP_BUILD=1,SKIP_ENV_CHECK=1,BUILD_DIR=str(binary.parent),BIN_PATH=str(binary),
                AUTH_MODE='auto',ENABLE_AI=0,ENABLE_LAB=0,ENABLE_OPS=1,ENABLE_CLIENT=0,ENABLE_YOUTUBE_SOURCE=0,
                LISTEN_ADDRESS='127.0.0.1',HTTP_LISTEN_ADDRESS='127.0.0.1',LISTEN_PORT=rtsp,HTTP_LISTEN_PORT=http,
                FORCE_RTSP_TCP=1,FILE_ROOT=str(root/'input'),DEFAULT_FILE=str(root/'input/retention-9101.mp4'),
                STATE_DIR=str(root/'state'),AUTH_USERS_FILE=str(root/'state/users.json'),SOURCE_REGISTRY=str(root/'state/sources.json'),
                PUBLISHED_VIEWS=str(root/'state/views.json'),ANALYSIS_REGISTRY=str(root/'state/analysis.json'),
                ANALYSIS_EVENT_STORAGE_ENABLED=0,ANALYSIS_EVENT_POST_ENABLED=0,ANALYSIS_EVENT_CLIP_HOOK_ENABLED=0,
                ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED=0,VA_REVIEW_ENABLED=0,VISUAL_SEARCH_ENABLED=0,EVIDENCE_ENABLED=0,
                RECORDING_ENABLED=1,RECORDING_STORAGE_ROOT=str(root/'recordings'),RECORDING_SEGMENT_DURATION_SECONDS=2,
                RECORDING_RESERVED_FREE_BYTES=0,RECORDING_RETENTION_INTERVAL_MS=1000,VERIFY_RECORDING_RESOURCE_TRACE=1,
                SHUTDOWN_PROBE='stop',GST_CACHE_DIR=str(root/'gst-cache'),GST_PLUGIN_PROFILE='headless',
                WEBRTC_STUN_SERVER='stun://127.0.0.1:1',WEBRTC_TURN_SERVER='')
    env=dict(PATH=os.environ['PATH'],HOME=os.environ['HOME'],TMPDIR=str(root/'tmp'),
             **{'MEDIA_SERVER_'+k:str(v) for k,v in values.items()})
    save(root/'environment.json',env)
    began=time.monotonic(); child=None; forced=False; metrics=[]; failure=None; stop_ms=None; signal_at=None
    try:
        with (root/'server.log').open('xb') as log:
            child=subprocess.Popen([str(repo/'server.sh'),'foreground'],cwd=repo,env=env,stdout=log,stderr=log,start_new_session=True)
            save(root/'launch.json',dict(pid=child.pid,startedAt=time.time(),command=[str(repo/'server.sh'),'foreground']))
            while time.monotonic()-began<134:
                need(child.poll() is None,'early-product-exit')
                rss=int(subprocess.check_output(['ps','-o','rss=','-p',str(child.pid)],text=True,timeout=2).strip())*1024
                total=sum(p.stat().st_size for p in root.rglob('*') if p.is_file() and not p.is_symlink())
                metrics.append(dict(seconds=time.monotonic()-began,rss=rss,workspaceBytes=total))
                need(rss<=4294967296 and total<469762048 and (root/'server.log').stat().st_size<4194304,'resource-bound')
                time.sleep(1)
    except BaseException as e:
        failure=type(e).__name__+': '+str(e)
    finally:
        if child is not None:
            stop=time.monotonic(); signal_at=int(time.time()*1000)
            if child.poll() is None:
                os.killpg(child.pid,signal.SIGTERM)
                try: child.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    forced=True; os.killpg(child.pid,signal.SIGKILL); child.wait(timeout=3)
            stop_ms=(time.monotonic()-stop)*1000
        save(root/'metrics.json',metrics)
    group_absent=False
    if child:
        try: os.killpg(child.pid,0)
        except ProcessLookupError: group_absent=True
    execution=dict(exit=child.returncode if child else None,forced=forced,stopMs=stop_ms,
                   portsClosed=all(closed(p) for p in [http,rtsp]),groupAbsent=group_absent,
                   elapsedSeconds=time.monotonic()-began,error=failure,signalAtMs=signal_at)
    save(root/'execution.json',execution)
    need(failure is None,'writer-execution:'+str(failure))
    need(execution['exit']==0 and not forced and group_absent and execution['portsClosed'],'writer-cleanup')
    # 현행 native parser로 Raw/Binding chain을 읽는다. 관측만으로 durable이라고 판정하지 않는다.
    rows=[]; offset=0
    while True:
        p=subprocess.run([helper,'--observe-generation',str(root/'recordings'),str(offset)],capture_output=True,timeout=5)
        (root/f'observe-{offset}.stdout').write_bytes(p.stdout); (root/f'observe-{offset}.stderr').write_bytes(p.stderr)
        need(p.returncode==0,'raw-observer'); data=json.loads(p.stdout)
        need(not data['busy'] and data['partialBytes']==0,'raw-completeness')
        rows.extend(data['rows']); offset+=len(data['rows'])
        if not data['backlog']: break
        need(offset<10000 and time.monotonic()-began<170,'raw-budget')
    segments=[r for r in rows if 'mediaRelpath' in r]
    result=[]
    for r in segments:
        s=r['segment']; f=(root/'recordings'/r['mediaRelpath']).resolve()
        need(f.is_relative_to(root/'recordings'),'media-path')
        result.append(dict(id=s['id'],channel=s['channel'],order=int(s['order']),finalizedAtMs=int(r['occurredAtMs']),file=artifact(f),
                           bytes=f.stat().st_size,catalogBytes=int(s['sizeBytes']),sha256=sha(f),catalogSha256=s['sha256'],
                           duration=(int(s['endPts'])-int(s['startPts']))*s['timeBaseNum']/s['timeBaseDen']))
    result.sort(key=lambda r:(r['channel'],r['order']));save(root/'rows.json',result)
    actual={p.resolve() for p in (root/'recordings').rglob('*.mp4')}
    need(actual=={Path(r['file']['path']) for r in result},'unmapped-media')
    need(not list((root/'recordings').rglob('*.partial')),'pending-media')
    if v2:
        probes={}
        for row in result:
            command=['ffprobe','-v','error','-select_streams','v:0','-count_frames','-show_entries',
                     'stream=codec_name,width,height,avg_frame_rate,duration,nb_read_frames','-of','json',row['file']['path']]
            p=subprocess.run(command,capture_output=True,timeout=min(3,max(0.1,180-(time.monotonic()-began))))
            probes[row['id']]=dict(command=command,exit=p.returncode,stderr=p.stderr.decode(),result=json.loads(p.stdout) if p.returncode==0 else None)
            need(p.returncode==0 and not p.stderr,'media-decode-probe')
        save(root/'media-probes.json',probes)
    # 원출력은 그대로 유지하고 복사본에 실제 Catalog Open/Recover/ResolveMedia를 실행한다.
    copy=root/'media-server-current-observer-recovery'; copy.mkdir(); shutil.copytree(root/'recordings',copy/'recordings')
    p=subprocess.run([helper,'--snapshot',str(copy/'recordings')],capture_output=True,timeout=max(1,min(20,180-(time.monotonic()-began))),
                     env=dict(os.environ,MEDIA_SERVER_VERIFY_RECORDING_RESOURCE_TRACE='1'))
    (root/'recovery.stdout').write_bytes(p.stdout); (root/'recovery.stderr').write_bytes(p.stderr)
    need(p.returncode==0,'catalog-recovery'); recovered=json.loads(p.stdout);save(root/'recovery.json',recovered)
    owners=[json.loads(line.split('] ',1)[1]) for line in (root/'server.log').read_text().splitlines() if line.startswith('[recording-resource] ')]
    need(owners and [r['seq'] for r in owners]==list(range(len(owners))),'owner-trace')
    need(time.monotonic()-began<180,'qualification-deadline')
    channels=writer_review(plan,result,recovered,execution,owners[-1])
    need(identity(repo)==current and artifact(binary)==plan['binary'],'source-changed')
    raw=[artifact(p) for p in sorted(root.rglob('*')) if p.is_file() and not p.is_symlink()]
    review=dict(status='MEASURED',synthetic=False,runId=plan['runId'],planSha256=sha(root/'plan.json'),
         sourceEnd=current,rows=artifact(root/'rows.json'),recovery=artifact(root/'recovery.json'),
         execution=execution,finalOwner=owners[-1],channels=channels,rawArtifacts=raw,
         limits='No natural retention, full mixed-load, crash-recovery, or State45 claim')
    if v2:
        review['mediaProbes']=artifact(root/'media-probes.json')
        review['segmentCounts']={c:dict(finalized=sum(x['channel']==c for x in result),normal=sum(x['channel']==c and 1.95<=x['duration']<=2.1 for x in result),tail=sum(x['channel']==c and x['duration']<1.95 for x in result)) for c in plan['channels']}
        from recording_state_binding_v2 import check_writer
        check_writer(plan,review)
    save(root/'review.json',review)
    print(json.dumps(dict(status='MEASURED',root=str(root),channels=channels,execution=execution)))

if __name__=='__main__':
    if len(sys.argv)==6 and sys.argv[1]=='--v2':
        collect(*sys.argv[2:],v2=True);raise SystemExit(0)
    if len(sys.argv)!=5: raise SystemExit('usage: collect_state_writer_requalification.py REPO NEW_ROOT INPUT HELPER')
    collect(*sys.argv[1:])
