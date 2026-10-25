#!/usr/bin/env python3
# 파일 용도: 승인된 혼합120분 관측의 컴파일·재시작·정리를 포함해 총123분을 제한한다.
import datetime
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import time
import sys
import selectors
import stat
import math
import re
from contextlib import nullcontext

# Existing diagnostic supervisor output cap (recording_catalog_comparison_guard.mjs).
# Limited-only combined parent pipe; independent of each product's 4MiB log.
LIMITED_PARENT_OUTPUT_BYTES = 2097152


class LimitedParentCapture:
    def __init__(self, *, official=False):
        self.observed=0;self.written=0;self.eof=False;self.first=None;self.capture_error=None
        self.failure_events={};self.carry=b'';self.skip_line=False;self.digest=hashlib.sha256()
        self.output=None;self.selector=None;self.pipe=None
        self.official=official;self.shutdown=None

    def fail(self,code):
        row={'code':code,'at':utc_now(),'observedBytes':self.observed,'writtenBytes':self.written}
        self.first=self.first or row
        self.failure_events.setdefault(code,row)
        if code!='child-diagnostic':self.capture_error=self.capture_error or row

    def push(self,data):
        # Actual pipe bytes, no per-chunk decoding/re-encoding. A truncated UTF-8
        # prefix remains explicitly incomplete raw evidence, not cleaned text.
        if not isinstance(data,bytes):raise TypeError('capture-bytes-required')
        self.observed+=len(data)
        for part in data.splitlines(keepends=True):
            if not self.skip_line:
                self.carry+=part[:max(0,8192-len(self.carry))]
                if len(self.carry)>=8192:self.skip_line=True
            if part.endswith(b'\n'):
                if self.carry.startswith((b'[R165-first-failure] ',b'[fail] current observation:')):
                    self.fail('child-diagnostic')
                    if self.official:
                        self.failure_events['child-diagnostic'].setdefault('diagnostic',self.carry.decode('utf-8',errors='replace'))
                self.carry=b'';self.skip_line=False
        kept=data[:max(0,LIMITED_PARENT_OUTPUT_BYTES-self.written)]
        if kept and not self.capture_error:
            try:
                n=self.output.write(kept)
                if not isinstance(n,int) or not 0<=n<=len(kept):raise OSError('invalid-write-count')
                self.digest.update(kept[:n]);self.written+=n
                if n!=len(kept):raise OSError('short-write')
            except Exception:self.fail('parent-log-write')
        if self.observed>=LIMITED_PARENT_OUTPUT_BYTES:self.fail('parent-output-cap')

    def attach(self,child,output):
        self.output=output;self.pipe=child.stdout
        os.set_blocking(self.pipe.fileno(),False)
        self.selector=selectors.DefaultSelector();self.selector.register(self.pipe,selectors.EVENT_READ)

    def read(self,timeout):
        try:
            for key,_ in self.selector.select(timeout):
                data=os.read(key.fd,65536)
                if data:self.push(data)
                else:self.eof=True;self.selector.unregister(self.pipe)
        except Exception:self.fail('parent-log-collection')

    def close(self):
        try:
            if self.selector:self.selector.close()
            if self.pipe:self.pipe.close()
        except Exception:self.fail('parent-log-close')

    def begin_shutdown(self):
        if self.shutdown is None:
            self.shutdown={'observedBytesAtStart':self.observed,'storedBytesAtStart':self.written}

    def drain_step(self, deadline):
        remaining=deadline-time.monotonic()
        if self.pipe is not None and not self.eof and not self.capture_error and remaining>0:
            self.read(min(0.1,remaining))
        elif remaining>0:
            time.sleep(min(0.1,remaining))

    def finish_shutdown(self, child, cleanup, registered, deadline):
        self.begin_shutdown()
        while self.pipe is not None and not self.eof and not self.capture_error and time.monotonic()<deadline:
            self.drain_step(deadline)
        expired=time.monotonic()>=deadline
        if not self.eof and not self.capture_error:self.fail('parent-drain-deadline' if expired else 'parent-eof-missing')
        code=child.returncode if child is not None else None
        self.shutdown.update(childExit=code if code is None or code>=0 else None,
            childSignal=signal.Signals(-code).name if code is not None and code<0 else None,
            additionalObservedBytes=self.observed-self.shutdown['observedBytesAtStart'],
            additionalStoredBytes=self.written-self.shutdown['storedBytesAtStart'],
            byteScope='since shutdown began, including output during owned-group termination',
            deadlineExceeded=expired,cleanup=cleanup,registeredCleanup=registered)

    def preserve(self,log_path):
        errors=[];verified=False
        try:
            s=Path(log_path).lstat()
            if not stat.S_ISREG(s.st_mode) or s.st_uid!=os.getuid() or s.st_nlink!=1 or s.st_size>LIMITED_PARENT_OUTPUT_BYTES:raise ValueError('log-readback-owner-size')
            with Path(log_path).open('rb') as f:
                os.fsync(f.fileno());digest=hashlib.sha256();size=0
                while size<=LIMITED_PARENT_OUTPUT_BYTES:
                    chunk=f.read(min(65536,LIMITED_PARENT_OUTPUT_BYTES+1-size))
                    if not chunk:break
                    digest.update(chunk);size+=len(chunk)
            verified=size==self.written and digest.hexdigest()==self.digest.hexdigest()
            if not verified:raise ValueError('readback-mismatch')
        except Exception:self.fail('parent-log-readback');errors.append('parent-log-readback')
        result={'capBytes':LIMITED_PARENT_OUTPUT_BYTES,'observedBytes':self.observed,'storedBytes':self.written,
            'observedBytesCoverage':'complete-pipe' if self.eof else 'read-prefix-only; termination output may be unobserved',
            'complete':self.eof and not (self.capture_error if self.official else self.first) and verified,'eof':self.eof,'truncated':self.observed>self.written or not self.eof,
            'storedSha256':self.digest.hexdigest(),'readbackVerified':verified,'firstFailure':self.first,
            'failureEvents':list(self.failure_events.values()),'inFlightTerminals':'UNVERIFIED' if self.first or not self.eof else 'requires-ledger-verification'}
        if self.official:result.update(shutdown=self.shutdown,outputLimitExceeded='parent-output-cap' in self.failure_events,
            completenessScope='pipe bytes only; child exit and cleanup are independent')
        receipt=Path(log_path).with_name('parent-output-receipt.json')
        try:
            raw=(json.dumps(result,ensure_ascii=False,indent=2)+'\n').encode('utf-8')
            if len(raw)>32768:raise ValueError('receipt-cap')
            fd=os.open(receipt,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
            with os.fdopen(fd,'wb') as f:f.write(raw);f.flush();os.fsync(f.fileno())
            if receipt.read_bytes()!=raw:raise ValueError('receipt-readback')
            result['receiptSha256']=hashlib.sha256(raw).hexdigest()
        except Exception:errors.append('parent-output-evidence');result['complete']=False
        result['evidenceErrors']=errors
        return result


def utc_now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def group_alive(group):
    try:
        os.killpg(group, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        # macOS의 미회수 종료 자식도 EPERM이다. ESRCH가 확인되기 전에는 부재로 판정하지 않는다.
        return True


def stop_created_group(child, *, capture=None, deadline=None):
    begin = time.monotonic()
    sent = []
    errors = []
    for number, grace in ((signal.SIGTERM, 10), (signal.SIGKILL, 2)):
        child.poll()
        if not group_alive(child.pid):
            break
        try:
            os.killpg(child.pid, number)
            sent.append(signal.Signals(number).name)
        except ProcessLookupError:
            break
        except PermissionError:
            errors.append({'signal': signal.Signals(number).name, 'error': 'PermissionError'})
        grace_end = time.monotonic() + grace
        if deadline is not None:grace_end=min(grace_end,deadline)
        while time.monotonic() < grace_end:
            child.poll()
            if not group_alive(child.pid):
                break
            if capture:capture.drain_step(grace_end)
            else:time.sleep(0.1)
    child.poll()
    return {'cleanupSignals': sent, 'processGroupAbsent': not group_alive(child.pid),
            'cleanupErrors': errors, 'cleanupOnlySeconds': time.monotonic() - begin}


def registered_groups(registry):
    active = set()
    if registry is None:
        return active
    for line in Path(registry).read_text().splitlines(keepends=True):
        if not line.endswith('\n'):
            raise ValueError('incomplete ownership record')
        row = json.loads(line)
        pid = row.get('pid')
        if type(pid) is not int or pid <= 1 or pid in (os.getpid(), os.getpgrp()):
            raise ValueError('invalid owned group')
        if row.get('event') == 'started' and pid not in active:
            active.add(pid)
        elif row.get('event') == 'closed' and pid in active:
            active.remove(pid)
        else:
            raise ValueError('invalid ownership transition')
    return active


def finish_registered_groups(registry, *, capture=None, deadline=None):
    began = time.monotonic()
    try:
        groups = registered_groups(registry)
        remaining = {pid for pid in groups if group_alive(pid)}
        residual = bool(remaining)
        sent = []
        for number, grace in ((signal.SIGTERM, 10), (signal.SIGKILL, 2)):
            for pid in remaining:
                try:
                    os.killpg(pid, number)
                    sent.append({'group': pid, 'signal': signal.Signals(number).name})
                except ProcessLookupError:
                    pass
            grace_end = time.monotonic() + grace
            if deadline is not None:grace_end=min(grace_end,deadline)
            while remaining and time.monotonic() < grace_end:
                remaining = {pid for pid in remaining if group_alive(pid)}
                if remaining:
                    if capture:capture.drain_step(grace_end)
                    else:time.sleep(0.1)
        return {'registeredGroupsAbsent': not remaining, 'residualRegisteredGroups': residual,
                'registeredGroupSignals': sent, 'registeredGroupCleanupSeconds': time.monotonic() - began}
    except Exception as error:
        return {'registeredGroupsAbsent': False, 'registeredGroupErrorType': type(error).__name__,
                'registeredGroupCleanupSeconds': time.monotonic() - began}


class LimitedPreparationNativeObserver:
    """Read-only producer adapter to existing JS/native readers; never builds.

    Invocation is reachable only behind the unchanged Limited capacity guard.
    A poll cannot certify births/exits or write peaks between observations.
    """
    def __init__(self, root, collector, collector_sha, node, origin, *, copy_root=None):
        self.root=Path(root);self.origin=origin;self.node=node;self.known=[];self.group=None
        self.trace=None;self.trace_bytes=0
        def identity(p):
            s=p.lstat()
            if p.resolve()!=p or not stat.S_ISDIR(s.st_mode) or s.st_uid!=os.getuid() or s.st_mode&0o777!=0o700:raise ValueError('limited-observer-root')
            return {'dev':s.st_dev,'ino':s.st_ino}
        self.config={'root':str(self.root),'rootIdentity':identity(self.root),'collector':str(collector),'collectorSha256':collector_sha,
                     'launcherPid':os.getpid(),'copyRoot':str(copy_root) if copy_root else None,'copyIdentity':identity(Path(copy_root)) if copy_root else None}
        self.module=(Path(__file__).parent/'recording_accumulated_cost.mjs').as_uri()

    def __call__(self, child):
        if child is not None:self.group=child.pid
        config=dict(self.config,childPid=self.group,knownPids=self.known)
        code='import {observeLimitedPreparation} from '+json.dumps(self.module)+';console.log(JSON.stringify(await observeLimitedPreparation(JSON.parse(process.argv[1]))));'
        remaining=min(3,300-(time.monotonic()-self.origin))
        if remaining<=0:raise ValueError('limited-finalization-deadline')
        p=None;selector=selectors.DefaultSelector();data=bytearray();error=None;cleanup=None;later=[];began=time.monotonic()
        try:
            p=subprocess.Popen([self.node,'--input-type=module','-e',code,json.dumps(config)],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,
                env={k:v for k,v in os.environ.items() if k not in ('NODE_OPTIONS','NODE_PATH')},start_new_session=True)
            os.set_blocking(p.stdout.fileno(),False);selector.register(p.stdout,selectors.EVENT_READ)
            eof=False
            while not eof:
                if time.monotonic()-began>=remaining:raise ValueError('limited-observer-timeout')
                for key,_ in selector.select(min(0.05,remaining)):
                    chunk=os.read(key.fd,16385-len(data))
                    if not chunk:eof=True;break
                    data.extend(chunk)
                    if len(data)>16384:raise ValueError('limited-observer-output-cap')
            p.wait(timeout=max(0.001,remaining-(time.monotonic()-began)))
            if p.returncode!=0:raise ValueError('limited-observer-exit')
        except Exception as exc:error=exc
        finally:
            selector.close()
            if p is not None:
                try:
                    cleanup=stop_created_group(p)
                    if not cleanup['processGroupAbsent'] or cleanup['cleanupErrors']:raise ValueError('limited-observer-cleanup')
                except Exception as exc:later.append(str(exc));error=error or exc
                finally:
                    if p.stdout:p.stdout.close()
            try:
                if self.trace is None:self.trace=(self.root/'limited-preparation-observations.jsonl').open('xb');os.fchmod(self.trace.fileno(),0o600)
                row=(json.dumps({'elapsedSeconds':time.monotonic()-self.origin,'observerPid':p.pid if p else None,'output':data.decode('utf8',errors='replace'),
                    'error':str(error) if error else None,'cleanup':cleanup,'secondaryErrors':later})+'\n').encode()
                if self.trace_bytes+len(row)>1024*1024:raise ValueError('limited-observation-artifact-cap')
                self.trace.write(row);self.trace.flush();os.fsync(self.trace.fileno());self.trace_bytes+=len(row)
            except Exception as exc:later.append(str(exc));error=error or exc
        self.secondary_errors=later
        if error:raise error
        value=json.loads(data)
        self.known=sorted(set(self.known)|{r['pid'] for r in value['processes']})
        return value

    def close(self):
        if self.trace:self.trace.close()


class LimitedPreparationBoundary:
    """Limited-only observation consumer. Polling is not spawn/write admission.

    The callable is a real observation producer at runtime; deterministic tests
    substitute only that boundary. No values are synthesized on missing input.
    A complete-runtime eligibility receipt is deliberately not issued here.
    """
    def __init__(self, observe, *, now=time.monotonic, origin=None):
        self.now=now;self.origin=now() if origin is None else origin
        if type(self.origin) not in (int,float) or not math.isfinite(self.origin) or not 0<=self.origin<=now():raise ValueError('limited-clock')
        self.observe=observe;self.last=self.origin;self.first=None;self.secondary=[]
        self.identities={};self.peaks={};self.samples=0;self.last_snapshot=None

    def fail(self,code,phase):
        event={'code':code,'phase':phase,'elapsedSeconds':self.now()-self.origin}
        if self.first is None:self.first=event
        elif event['code']!=self.first['code']:self.secondary.append(event)
        return self.first

    def remaining(self,work=True):
        current=self.now()
        if type(current) not in (int,float) or not math.isfinite(current) or not self.last<=current:
            self.fail('limited-clock','clock');raise ValueError(self.first['code'])
        self.last=current
        return (240 if work else 300)-(current-self.origin)

    def admit(self,phase):
        if self.first:raise ValueError(self.first['code'])
        if self.remaining()<=0:
            self.fail('limited-work-deadline',phase);raise ValueError(self.first['code'])

    def sample(self,phase,child=None,work=True):
        # During cleanup continue collecting even after the first error.
        try:
            if work:self.admit(phase)
            if self.remaining(False)<=0:raise ValueError('limited-finalization-deadline')
            value=self.observe(child)
            integer=lambda n:type(n) is int and 0<=n<=9007199254740991
            if not isinstance(value,dict) or value.get('complete') is not True:raise ValueError('limited-observation-missing')
            rows=value.get('processes');expected=value.get('expectedPids')
            if not isinstance(rows,list) or not isinstance(expected,list) or not expected or len(set(expected))!=len(expected):raise ValueError('limited-process-coverage')
            if len(rows)!=len(expected) or {r.get('pid') for r in rows}!=set(expected):raise ValueError('limited-process-coverage')
            rss_sum=0
            for r in rows:
                pid=r.get('pid');identity=r.get('startIdentity');pgid=r.get('pgid')
                if not integer(pid) or pid<=1 or not integer(pgid) or pgid<=1 or not isinstance(identity,str) or not re.fullmatch(r'(macos:[1-9]\d{0,19}:\d{1,6}|linux:[1-9]\d{0,19})',identity):raise ValueError('limited-process-identity')
                if pgid!=r.get('expectedPgid'):raise ValueError('limited-group-escape')
                if pid in self.identities and self.identities[pid]!=(identity,pgid):raise ValueError('limited-process-identity-changed')
                if r.get('valid') is not True or r.get('error') is not None or not r.get('fdObservation',{}).get('complete') or r['fdObservation'].get('startIdentity')!=identity:raise ValueError('limited-native-observation')
                begin,end=r.get('observedStartNs'),r.get('observedEndNs')
                if not all(isinstance(n,str) and re.fullmatch(r'[1-9]\d{0,19}',n) for n in (begin,end)) or int(begin)>int(end):raise ValueError('limited-observation-clock')
                rss=r.get('rssBytes')
                if not integer(rss) or rss<=0:raise ValueError('limited-rss-missing')
                if rss>4*1024**3:raise ValueError('limited-rss-cap')
                self.identities[pid]=(identity,pgid);self.peaks[pid]=max(self.peaks.get(pid,0),rss);rss_sum+=rss
            storage=value.get('workspace',{})
            total,fixed,copy,anonymous=(storage.get(k) for k in ('totalBytes','fixedBytes','copyBytes','anonymousBytes'))
            if not all(integer(n) for n in (total,fixed,copy,anonymous)) or total<fixed:raise ValueError('limited-workspace-unobserved')
            cap=448*1024*1024;charged=total+anonymous
            if charged-fixed>=cap:raise ValueError('limited-workspace-variable-cap')
            if copy>=cap:raise ValueError('limited-workspace-copy-cap')
            if charged+copy>=fixed+2*cap:raise ValueError('limited-workspace-combined-cap')
            if self.samples>=1600:raise ValueError('limited-observation-sample-cap')
            self.samples+=1
            self.last_snapshot={'phase':phase,'elapsedSeconds':self.now()-self.origin,'processes':rows,'workspace':storage,
                'rssSumBytes':rss_sum,'rssMeaning':'sum of process RSS; shared pages may be counted more than once; not unique physical usage'}
            if self.remaining(False)<=0:raise ValueError('limited-finalization-deadline')
            if work:self.admit(phase)
            return self.last_snapshot
        except Exception as error:
            self.fail(str(error),phase)
            for later in getattr(self.observe,'secondary_errors',[]):self.fail(later,'observer-finalization')
            raise

    def report(self):
        return {'originMonotonic':self.origin,'workDeadlineMonotonic':self.origin+240,'hardDeadlineMonotonic':self.origin+300,
            'firstFailure':self.first,'secondaryErrors':self.secondary,'samples':self.samples,'lastSnapshot':self.last_snapshot,
            'peakRssByPid':dict(self.peaks),'identityByPid':dict(self.identities),
            'coverage':'observed snapshots only; unseen short-lived processes are not proven',
            'capacityPreflight':'BLOCKED','blocker':'spawn-and-write-admission-not-bound',
            'instantaneousRssPeak':'UNPROVEN','instantaneousWorkspacePeak':'UNPROVEN'}


def run_owned(command, log_path, budget_seconds, cwd, env, started, registry=None, *, limited_capture=None, limited_boundary=None):
    # 별도 세션에서 만든 자기 작업 그룹만 종료한다. 한도 뒤의 정리는 PASS 시간을 늘리지 않는다.
    if limited_capture and limited_capture.official and limited_boundary is not None:
        raise ValueError('official-parent-boundary-conflict')
    interrupted = []
    previous = {sig: signal.signal(sig, lambda number, frame: interrupted.append(number))
                for sig in (signal.SIGINT, signal.SIGTERM)}
    begin = time.monotonic()
    timed_out = False
    child = None
    output = None
    official=bool(limited_capture and limited_capture.official)
    hard_deadline=begin+budget_seconds
    def official_cleanup():
        limited_capture.begin_shutdown()
        options={'capture':limited_capture,'deadline':hard_deadline}
        try:
            cleanup=stop_created_group(child,**options) if child is not None else {'processGroupAbsent':True,'cleanupErrors':[]}
        except Exception as error:
            cleanup={'processGroupAbsent':False,'cleanupErrors':[{'error':type(error).__name__,'message':str(error)}]}
        try:registered=finish_registered_groups(registry,**options)
        except Exception as error:registered={'registeredGroupsAbsent':False,'registeredGroupErrorType':type(error).__name__}
        limited_capture.finish_shutdown(child,cleanup,registered,hard_deadline)
        return cleanup,registered
    def official_receipt():
        if not official:return {}
        return {'parentFirstFailure':limited_capture.first,
            'parentFailureEvents':list(limited_capture.failure_events.values()),
            'parentEof':limited_capture.eof,'parentShutdown':limited_capture.shutdown,
            'cleanupDeadlineExceeded':time.monotonic()>=hard_deadline}
    try:
        if limited_boundary:limited_boundary.sample('before-spawn')
        output=Path(log_path).open('xb' if limited_capture else 'x')
        # Limited capture stays open through exception cleanup/drain as well.
        with nullcontext(output) if limited_capture else output:
            if limited_capture:os.fchmod(output.fileno(),0o600)
            child = subprocess.Popen(command, cwd=cwd, env=env, stdout=subprocess.PIPE if limited_capture else output,
                                     stderr=subprocess.STDOUT, start_new_session=True)
            started(child.pid)
            if limited_capture:limited_capture.attach(child,output)
            if limited_boundary:limited_boundary.sample('after-spawn',child)
            while child.poll() is None or (limited_capture and not limited_capture.eof):
                remaining = budget_seconds - (time.monotonic() - begin)
                if limited_boundary:
                    limited_boundary.sample('work',child)
                    remaining=min(remaining,limited_boundary.remaining())
                if interrupted or remaining <= 0:
                    timed_out = remaining <= 0
                    break
                if limited_capture:
                    limited_capture.read(min(0.1,remaining))
                    if limited_capture.first:
                        if limited_boundary:limited_boundary.fail(limited_capture.first['code'],'parent-output')
                        break
                    continue
                try:
                    child.wait(timeout=min(1.0, remaining))
                except subprocess.TimeoutExpired:
                    pass
            execution_elapsed = time.monotonic() - begin
            timed_out = timed_out or execution_elapsed > budget_seconds
            remaining_group = group_alive(child.pid)
            if official:cleanup,registered=official_cleanup()
            else:
                cleanup = stop_created_group(child)
                registered = finish_registered_groups(registry)
            if limited_boundary:
                # Preserve shutdown output after stopping; it remains in the
                # same parent 2MiB budget and the same 300s lifetime.
                while limited_capture and not limited_capture.eof and limited_boundary.remaining(False)>0:
                    limited_capture.read(min(0.1,limited_boundary.remaining(False)))
                    if limited_capture.capture_error:break
                limited_boundary.sample('after-cleanup',None,work=False)
            elapsed = time.monotonic() - begin
            passed = (child.returncode == 0 and not interrupted and not timed_out
                      and (limited_capture is None or (limited_capture.eof and not limited_capture.first))
                      and not remaining_group and cleanup['processGroupAbsent']
                      and (not limited_boundary or not cleanup.get('cleanupErrors'))
                      and registered['registeredGroupsAbsent'] and not registered.get('residualRegisteredGroups', False)
                      and (not official or (not cleanup.get('cleanupErrors') and time.monotonic()<hard_deadline))
                      and (limited_boundary.remaining(False)>0 if limited_boundary else elapsed<=budget_seconds))
            return {'status': 'PASS' if passed else 'FAIL', 'childExit': child.returncode,
                    'exit': 0 if passed else 124 if timed_out else 1,
                    'executionElapsedSeconds': execution_elapsed, 'elapsedSeconds': elapsed,
                    'timeoutSeconds': budget_seconds, 'timedOut': timed_out,
                    'interruptedSignals': interrupted, 'residualGroupAfterCommand': remaining_group,
                    **cleanup, **registered, **official_receipt(),
                    'finishedAt': utc_now()}
    except Exception as error:
        if limited_boundary:limited_boundary.fail(str(error),'owned-supervision')
        if official:cleanup,registered=official_cleanup()
        else:
            cleanup = stop_created_group(child) if child is not None else {
                'cleanupSignals': [], 'processGroupAbsent': True, 'cleanupOnlySeconds': 0}
            registered = finish_registered_groups(registry)
        if limited_boundary:
            try:
                while limited_capture and limited_capture.pipe is not None and not limited_capture.eof and limited_boundary.remaining(False)>0:
                    limited_capture.read(min(0.1,limited_boundary.remaining(False)))
                    if limited_capture.capture_error:break
                limited_boundary.sample('failure-cleanup',None,work=False)
            except Exception as later:limited_boundary.fail(str(later),'failure-cleanup')
        return {'status': 'FAIL', 'exit': 1, 'errorType': type(error).__name__,
                'childExit': child.returncode if child is not None else None,
                'elapsedSeconds': time.monotonic() - begin, 'timeoutSeconds': budget_seconds,
                'interruptedSignals': interrupted, **cleanup, **registered, **official_receipt(), 'finishedAt': utc_now()}
    finally:
        if limited_capture:limited_capture.close()
        if limited_capture and output:output.close()
        for sig, handler in previous.items():
            signal.signal(sig, handler)


def save_final_record(receipt, record):
    try:
        receipt.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    except Exception as error:
        record.update(status='FAIL', exit=1, receiptSaved=False, receiptErrorType=type(error).__name__)
    # 최종 receipt 실패도 호출자의 stdout 대체 기록에 실제 종료/정리 결과와 함께 남는다.
    return record


# S03-only closeout helpers. No process launch on import; ordinary modes unchanged.
OFFICIAL_CLOSEOUT_RESERVE = 6 * 1024 * 1024  # log copy 4MiB + ledger 1MiB + receipts/pending 1MiB
OFFICIAL_WORKSPACE_CAP = 448 * 1024 * 1024
OFFICIAL_RUN_DIRECTORY = 'media-server-current-observer-s03'


def official_workspace(root, fixed=None, reserve=OFFICIAL_CLOSEOUT_RESERVE):
    root=Path(root);work=root/'work';run_root=work/OFFICIAL_RUN_DIRECTORY;total=0
    if type(reserve) is not int or not 0<=reserve<=OFFICIAL_CLOSEOUT_RESERVE:raise ValueError('official-reserve')
    def scan(p):
        nonlocal total
        s=p.lstat()
        if s.st_uid!=os.getuid():raise ValueError('official-workspace-owner')
        if stat.S_ISLNK(s.st_mode):
            if not p.is_relative_to(run_root/'gst-cache'):raise ValueError('official-workspace-symlink')
            total+=s.st_size  # owned link bytes, never the shared plugin target
        elif stat.S_ISDIR(s.st_mode):
            if p.resolve()!=p:raise ValueError('official-workspace-path')
            for child in p.iterdir():scan(child)
        elif stat.S_ISREG(s.st_mode) and s.st_nlink==1:total+=s.st_size
        else:raise ValueError('official-workspace-file')
    scan(root)
    fixed_bytes=0
    if fixed is not None and work.exists():
        names=['input/retention-9101.mp4','input/retention-9201.mp4','normalize','process-metrics','catalog-instrumented.cpp']
        if fixed.get('root')!=str(run_root) or [x.get('name') for x in fixed.get('files',[])]!=names:raise ValueError('official-fixed-inputs')
        for row in fixed['files']:
            p=run_root/row['name'];s=p.lstat()
            if not stat.S_ISREG(s.st_mode) or s.st_nlink!=1 or s.st_size!=row['size'] or hashlib.sha256(p.read_bytes()).hexdigest()!=row['sha256']:raise ValueError('official-fixed-sha')
            fixed_bytes+=s.st_size
        if fixed_bytes!=fixed.get('fixedBytes'):raise ValueError('official-fixed-total')
    variable=total-fixed_bytes;copy_bytes=0  # official diagnose skips recovery/copy path
    if variable<0 or variable+reserve>=OFFICIAL_WORKSPACE_CAP or copy_bytes>=OFFICIAL_WORKSPACE_CAP or total+reserve>=fixed_bytes+2*OFFICIAL_WORKSPACE_CAP:raise ValueError('official-final-workspace-cap')
    return {'namedBytes':total,'fixedBytes':fixed_bytes,'variableBytes':variable,'copyBytes':copy_bytes,
        'reservedAdditionalBytes':reserve,'variableCapBytes':OFFICIAL_WORKSPACE_CAP,
        'coverage':'named bytes after owned groups stop; runtime anonymous bytes remain Driver native observations; not instantaneous peak'}


def official_report_check(report, storage_failure=False):
    if storage_failure:raise ValueError('official-report-storage-failure')
    if report.get('status')!='PASS' or report.get('exit')!=0 or report.get('failed')!=0:raise ValueError('official-report-not-pass')
    if report.get('processCount')!=1 or report.get('processesClosed') is not True or report.get('udpClosed') is not True:raise ValueError('official-process-closure')
    if report.get('verifiedDurationMs',0)<1800000 or report.get('searchPerformance',{}).get('status')!='PASS':raise ValueError('official-performance-incomplete')
    a=report.get('aLoad',{});load=report.get('evidenceLoad',{});ledger=report.get('failureAttribution',{})
    if len(a.get('initialStore',{}).get('names',[]))>3 or len(a.get('schedule',[]))>45:raise ValueError('official-report-premise')
    if load.get('searchSuccess',0)+load.get('searchUnavailable',0)>484 or ledger.get('status')!='captured':raise ValueError('official-ledger-incomplete')
    workspace=report.get('workspaceFailure')
    if not isinstance(workspace,dict) or workspace.get('status')!='no-workspace-failure' or workspace.get('collectionError') is not None or report.get('recordingStatusFailure'):raise ValueError('official-storage-failure')
    return ledger


def verify_official_completion(evidence):
    evidence=Path(evidence)
    def read(name):
        p=evidence/name;s=p.lstat()
        if not stat.S_ISREG(s.st_mode) or s.st_uid!=os.getuid() or s.st_nlink!=1 or s.st_size>32768:raise ValueError('official-final-receipt')
        return p.read_bytes()
    marker=json.loads(read('finalization-complete.json'));result=read('result.json');manifest=read('SHA256SUMS')
    if marker.get('status')!='FINALIZATION_PASS' or marker.get('manifestVerified') is not True or marker.get('resultSha256')!=hashlib.sha256(result).hexdigest() or marker.get('manifestSha256')!=hashlib.sha256(manifest).hexdigest():raise ValueError('official-final-marker')
    saved=json.loads(result)
    if saved.get('proposedStatus')!='FINALIZATION_PASS' or saved.get('runId')!=marker.get('runId'):raise ValueError('official-final-result')
    seen=set()
    for line in manifest.decode().splitlines():
        digest,name=line.split('  ',1);p=evidence/name
        if name in seen or Path(name).is_absolute() or '..' in Path(name).parts or p.resolve()!=p:raise ValueError('official-manifest-path')
        seen.add(name);s=p.lstat()
        if not stat.S_ISREG(s.st_mode) or s.st_uid!=os.getuid() or s.st_nlink!=1 or hashlib.sha256(p.read_bytes()).hexdigest()!=digest:raise ValueError('official-manifest-sha')
    actual={str(p.relative_to(evidence)) for p in evidence.rglob('*') if not p.is_dir()}
    if actual!=seen|{'SHA256SUMS','finalization-complete.json'}:raise ValueError('official-manifest-coverage')
    return {'status':'FINALIZATION_PASS','manifestEntries':len(seen),'markerVerified':True}


def run_limited_owned(command, log_path, cwd, env, started, registry=None, *, boundary=None):
    # Limited-only adapter: includes wrapper preparation/product startup. Build
    # is a separate, shared 180s bounded phase, never part of this allowance.
    # The generated wrapper's independent capacity guard remains mandatory.
    began = boundary.origin if boundary else time.monotonic()
    capture=LimitedParentCapture()
    kwargs={'limited_capture':capture}
    if boundary:kwargs['limited_boundary']=boundary
    result = run_owned(command, log_path, 240, cwd, env, started, registry,**kwargs)
    result['parentOutput']=capture.preserve(log_path)
    if not result['parentOutput']['complete']:
        result.update(status='FAIL',exit=result.get('exit') or 1)
    elapsed = time.monotonic() - began
    result.update(profile='limited-search-diagnostic', hardDeadlineSeconds=300,
                  workDeadlineSeconds=240, finishReserveSeconds=60,
                  elapsedIncludingCleanupSeconds=elapsed,
                  evidenceRemainingSeconds=max(0, 300-elapsed))
    if elapsed >= 300:
        result.update(status='FAIL', exit=124, limitedDeadlineExceeded=True)
    if boundary:
        try:boundary.sample('parent-evidence',None,work=False)
        except Exception:result.update(status='FAIL',exit=result.get('exit') or 1)
        result['preparationSupervision']=boundary.report()
        if boundary.first:result.update(status='FAIL',exit=result.get('exit') or 1)
    return result


def finish_limited_record(receipt, record, elapsed_seconds):
    # Caller measures from run_limited_owned entry, including final binding and
    # evidence writes. Cleanup after exhaustion is safety work, never PASS.
    if not isinstance(elapsed_seconds, (int,float)) or not 0<=elapsed_seconds<300:
        record.update(status='FAIL', exit=124, limitedDeadlineExceeded=True)
    record['totalWithFinalBindingSeconds']=elapsed_seconds
    try:
        raw=(json.dumps(record,ensure_ascii=False,indent=2)+'\n').encode('utf-8')
        if len(raw)>32768:raise ValueError('limited-receipt-cap')
        fd=os.open(receipt,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
        with os.fdopen(fd,'wb') as f:f.write(raw);f.flush();os.fsync(f.fileno())
        if Path(receipt).read_bytes()!=raw:raise ValueError('limited-receipt-readback')
        record['receiptSaved']=True
    except Exception as error:
        record.update(status='FAIL',exit=record.get('exit') or 1,receiptSaved=False,receiptErrorType=type(error).__name__)
    return record


def limited_entry(directory):
    # The plan is produced in an owned Terminal package after a separate bounded
    # build. Never silently substitute the old in-repository binary/archive.
    began=time.monotonic()  # before binding checks, copying, seeds or product work
    from recording_accumulated_cost import verify_isolated_build_inputs, verify_isolated_link, sha
    repo=Path(__file__).resolve().parents[2]
    if not directory.is_absolute() or directory.exists() or directory.parent.resolve()!=directory.parent or not str(directory).startswith('/private/tmp/media-server-'):
        raise ValueError('limited-owned-run')
    parent=directory.parent
    if parent.stat().st_uid!=os.getuid() or parent.stat().st_mode&0o777!=0o700:raise ValueError('limited-owner')
    plan_path=parent/'limited-binding.json'
    if plan_path.is_symlink() or plan_path.stat().st_uid!=os.getuid():raise ValueError('limited-binding-owner')
    plan=json.loads(plan_path.read_text())
    b=verify_isolated_build_inputs(plan['buildRoot'],plan['buildReceipt'])
    wrapper=parent/'overlay/wrapper.sh';binary=parent/'media_server'
    linked_files=(wrapper,binary,parent/'link.map',parent/'symbols.txt',parent/'overlay/mixed.mjs',parent/'overlay/recording_http_cost_probe.h')
    for file in linked_files:
        if file.resolve()!=file or sha(file)!=plan.get('artifactSha256',{}).get(str(file.relative_to(parent))):raise ValueError('limited-artifact-binding')
    link_plan=plan['linkPlan']
    if link_plan.get('archive')!=str(b/'libmedia_server_runtime.a'):raise ValueError('limited-old-archive')
    for n,binding in link_plan['sources'].items():
        overlay=parent/'overlay'/Path(n).name
        if sha(repo/n)!=binding['original'] or overlay.resolve()!=overlay or sha(overlay)!=binding['overlay']:raise ValueError('limited-overlay-binding')
    verify_isolated_link(link_plan,(parent/'link.map').read_text(),(parent/'symbols.txt').read_text())
    # Same guard as the generated wrapper; no flag/receipt can opt out.
    module=(repo/'scripts/internal/recording_accumulated_cost.mjs').as_uri()
    subprocess.run(['node','--input-type=module','-e','import {assertLimitedSearchCapacity} from '+json.dumps(module)+';assertLimitedSearchCapacity();'],check=True,timeout=5)
    directory.mkdir(mode=0o700);registry=directory/'owned-recovery-groups.jsonl';registry.touch(mode=0o600,exist_ok=False)
    # This remains unreachable until all admission/coverage obligations are
    # qualified; a bool/receipt cannot bypass assertLimitedSearchCapacity.
    observation=LimitedPreparationNativeObserver(directory,plan['helperCollector']['path'],plan['helperCollector']['sha256'],plan['node'],began)
    boundary=LimitedPreparationBoundary(observation,origin=began)
    result=run_limited_owned(['bash',str(wrapper),'--limited-search-diagnostic'],directory/'run.log',repo,
        dict(os.environ,MEDIA_SERVER_TEST_ARTIFACT_ROOT=str(directory),MEDIA_SERVER_OWNED_RECOVERY_GROUPS=str(registry),
             MEDIA_SERVER_LIMITED_ORIGIN_NS=str(int(began*1000000000))),lambda pid:None,registry,boundary=boundary)
    try:
        verify_isolated_build_inputs(b,plan['buildReceipt'])
        for file in linked_files:
            if sha(file)!=plan['artifactSha256'][str(file.relative_to(parent))]:raise ValueError('limited-postflight-binding')
    except Exception as error:
        result.update(status='FAIL',exit=result.get('exit') or 1,postflightError=type(error).__name__)
    result['buildPhase']='separate shared 180s bounded build; no builds in this entry'
    result['sourceBinding']={'path':str(plan_path),'sha256':sha(plan_path)}
    try:boundary.sample('final-binding',None,work=False)
    except Exception:result.update(status='FAIL',exit=result.get('exit') or 1)
    result['preparationSupervision']=boundary.report()
    observation.close()
    finish_limited_record(directory/'execution.json',result,time.monotonic()-began)
    # Separate bounded control output; full details live in exclusive receipts.
    print(json.dumps({'status':result['status'],'exit':result['exit'],'receiptSaved':result.get('receiptSaved',False),
        'parentOutputComplete':result.get('parentOutput',{}).get('complete',False),
        'receiptErrorType':result.get('receiptErrorType'),
        'supervisorErrorType':result.get('errorType'),
        'captureFirstFailure':result.get('parentOutput',{}).get('firstFailure'),
        'captureEvidenceErrors':result.get('parentOutput',{}).get('evidenceErrors',[]),
        'processGroupAbsent':result.get('processGroupAbsent'),
        'registeredGroupsAbsent':result.get('registeredGroupsAbsent')}))
    return result['exit']


def state_execution_binding(repo):
    return json.loads(subprocess.check_output(['node', str(repo / 'scripts/internal/recording_state_input_profile.mjs'), '--binding'], cwd=repo, text=True, timeout=20))


def source_binding(repo):
    names = subprocess.check_output(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=repo).decode().split('\0')
    rows = []
    for name in sorted(set(names)):
        if not name or name.startswith('docs/release-artifacts/'):
            continue
        file = repo / name
        rows.append([name, hashlib.sha256(file.read_bytes()).hexdigest() if file.is_file() else 'missing'])
    state = state_execution_binding(repo) if os.environ.get('MEDIA_SERVER_STATE_INPUT_PROFILE') else None
    return {**({'stateExecution': state} if state else {}), 'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip(),
            'fixtureProfile': 'continuous-r114',
            'fixtureProfileSourceSha256': hashlib.sha256((repo / 'scripts/internal/recording_longrun_progress.mjs').read_bytes()).hexdigest(),
            'tree': subprocess.check_output(['git', 'rev-parse', 'HEAD^{tree}'], cwd=repo, text=True).strip(),
            'sourceSha256': hashlib.sha256(json.dumps(rows, separators=(',', ':')).encode()).hexdigest(),
            'binarySha256': hashlib.sha256((Path(state['product']) if state else repo / 'build-gst-onnx/media_server').read_bytes()).hexdigest()}


def main():
    if len(sys.argv)==3 and sys.argv[1]=='--limited-search-diagnostic':
        raise SystemExit(limited_entry(Path(sys.argv[2])))
    if len(sys.argv) != 3 or sys.argv[1] not in ('--memory-attribution-diagnostic', '--prepare', '--120', '--frame-diagnostic', '--state-diagnostic', '--contention-diagnostic'):
        raise SystemExit('usage: run_v450_recording_a_mixed.py --memory-attribution-diagnostic|--prepare|--120|--frame-diagnostic|--state-diagnostic|--contention-diagnostic /private/tmp/media-server-.../new-run')
    repo = Path(__file__).resolve().parents[2]
    if os.environ.get('MEDIA_SERVER_STATE_INPUT_PROFILE') and sys.argv[1] != '--state-diagnostic':
        raise SystemExit('state-input-mode')
    if os.environ.get('MEDIA_SERVER_STATE_INPUT_PROFILE'):
        state_execution_binding(repo)
    directory = Path(sys.argv[2])
    if not directory.is_absolute() or not str(directory).startswith('/private/tmp/media-server-') or directory.exists():
        raise SystemExit('new owned parent run required')
    if directory.parent.resolve() != directory.parent or directory.parent.stat().st_uid != os.getuid():
        raise SystemExit('parent ownership')
    if sys.argv[1] in ('--120', '--state-diagnostic') and subprocess.check_output(['git', 'status', '--porcelain'], cwd=repo):
        raise SystemExit('commit source before long observation')
    directory.mkdir(mode=0o700)
    timeout = 780 if sys.argv[1] == '--memory-attribution-diagnostic' else 1080 if sys.argv[1] == '--contention-diagnostic' else 2880 if sys.argv[1] == '--state-diagnostic' else 180 if sys.argv[1] == '--prepare' else 780 if sys.argv[1] == '--frame-diagnostic' else 7380
    command = ['bash', str(repo / 'scripts/internal/verify_v450_recording_a_mixed.sh')] + (
        ['--memory-attribution-diagnostic'] if sys.argv[1] == '--memory-attribution-diagnostic' else ['--contention-diagnostic'] if sys.argv[1] == '--contention-diagnostic' else ['--state-diagnostic'] if sys.argv[1] == '--state-diagnostic' else ['--app-observe'] if sys.argv[1] == '--prepare' else ['--frame-diagnostic'] if sys.argv[1] == '--frame-diagnostic' else ['--duration-minutes', '120'])
    record = {'preparationContractVersion': 2, 'resultScope': 'startup-only; separate generation cyclic/recovery and space required' if sys.argv[1] == '--prepare' else 'existing mixed mode', 'command': command, 'startedAt': utc_now(), 'status': 'RUNNING', 'source': source_binding(repo),
              'timeoutSeconds': timeout, 'observationSeconds': 600 if sys.argv[1] == '--memory-attribution-diagnostic' else 900 if sys.argv[1] == '--contention-diagnostic' else 2700 if sys.argv[1] == '--state-diagnostic' else 30 if sys.argv[1] == '--prepare' else 600 if sys.argv[1] == '--frame-diagnostic' else 7200,
              'wrapperSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              'resourceTrendPass': False, 'reviewRequired': True, 'uiFulltestPass': False}
    receipt = directory / 'execution.json'
    registry = directory / 'owned-recovery-groups.jsonl'
    registry.write_text('')
    receipt.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    def started(pid):
        record['processGroup'] = pid
        receipt.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
        print(json.dumps({'status': 'RUNNING', 'processGroup': pid, 'timeoutSeconds': timeout}), flush=True)
    execution_begin = time.monotonic()
    result = run_owned(command, directory / 'run.log', timeout, repo,
                       dict(os.environ, MEDIA_SERVER_TEST_ARTIFACT_ROOT=str(directory),
                            MEDIA_SERVER_OWNED_RECOVERY_GROUPS=str(registry)), started, registry)
    record.update(result)
    def expired(number, frame):
        raise TimeoutError('final source binding deadline')
    previous_alarm = signal.signal(signal.SIGALRM, expired)
    try:
        remaining = timeout - (time.monotonic() - execution_begin)
        if remaining <= 0:
            raise TimeoutError('no final binding budget')
        signal.setitimer(signal.ITIMER_REAL, remaining)
        record['sourceEnd'] = source_binding(repo)
        if record['source'] != record['sourceEnd']:
            record.update(status='FAIL', exit=1, sourceChanged=True)
        record['totalWithFinalBindingSeconds'] = time.monotonic() - execution_begin
    except Exception as error:
        record.update(status='FAIL', exit=124 if isinstance(error, TimeoutError) else 1,
                      finalBindingErrorType=type(error).__name__)
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, previous_alarm)
    record['rootDisposition'] = 'preserved-for-byte-review-and-owned-cleanup'
    save_final_record(receipt, record)
    print(json.dumps(record, ensure_ascii=False, indent=2), flush=True)
    raise SystemExit(record['exit'])


if __name__ == '__main__':
    main()
