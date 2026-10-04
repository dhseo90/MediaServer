#!/usr/bin/env python3
# 파일 용도: 제품·모델·포트 없이 혼합 실행기의 정상/실패/시간/소유 그룹 종료 경계를 확인한다.
import datetime
import hashlib
import json
import os
from pathlib import Path
import runpy
import shutil
import signal
import subprocess
import sys
import tempfile
import time

directory = Path(__file__).resolve().parent
repo = directory.parents[5]
runtime = runpy.run_path(str(directory / 'run-bounded.py'), run_name='launcher_checks')
run_owned = runtime['run_owned']
group_alive = runtime['group_alive']
root = Path(tempfile.mkdtemp(prefix='v440-launcher-checks-')).resolve()
os.chmod(root, 0o700)
began = time.monotonic()
rows = []
groups = []
sentinel = None
failure = None
log_dest = directory / 'launcher-checks-2'
log_dest.mkdir()
receipt = directory / 'launcher-checks-2.json'
if receipt.exists():
    raise FileExistsError(receipt)
record = {'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'scope': 'launcher fixture only; no product/model/server/port', 'timeoutSeconds': 30,
          'sourceHead': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip(),
          'wrapperSha256': hashlib.sha256((directory / 'run-bounded.py').read_bytes()).hexdigest()}
record['previousFailure'] = 'launcher-checks-1.json'


def register(pid):
    groups.append(pid)
    with (log_dest / 'created-groups.jsonl').open('a') as output:
        output.write(json.dumps({'pid': pid}) + '\n')


def check(condition, message):
    if not condition:
        raise AssertionError(message)
    if time.monotonic() - began >= 30:
        raise TimeoutError('launcher-checks-total-budget')


def execute(name, command, seconds=3, started=None, registry=None, env=None, cwd=None):
    check(True, 'before-case')
    def capture(pid):
        register(pid)
        if started:
            started(pid)
    return run_owned(command, root / (name + '.log'), seconds, cwd or repo,
                     env or dict(os.environ), capture, registry)


def node_script(name, source):
    file = root / (name + '.mjs')
    file.write_text('import fs from "node:fs";\nimport {runCurrentRecovery} from ' +
                    json.dumps((repo / 'scripts/internal/recording_current_observer.mjs').as_uri()) +
                    ';\n' + source)
    return ['node', str(file)]


def expired(number, frame):
    raise TimeoutError('launcher-checks-total-budget')


signal.signal(signal.SIGALRM, expired)
signal.setitimer(signal.ITIMER_REAL, max(0.01, 30 - (time.monotonic() - began)))
try:
    r = execute('normal', [sys.executable, '-c', 'pass'])
    check(r['status'] == 'PASS' and r['childExit'] == 0 and r['processGroupAbsent'], 'normal-exit')
    rows.append({'case': 'normal-exit', 'pass': True, 'result': r})

    r = execute('nonzero', [sys.executable, '-c', 'raise SystemExit(7)'])
    check(r['status'] == 'FAIL' and r['childExit'] == 7 and r['processGroupAbsent'], 'nonzero-exit')
    rows.append({'case': 'nonzero-exit', 'pass': True, 'result': r})

    sentinel = subprocess.Popen([sys.executable, '-c', 'import time;time.sleep(30)'], start_new_session=True)
    register(sentinel.pid)
    descendant = """import subprocess,sys,time,signal,json
child=subprocess.Popen([sys.executable,'-c','import time;time.sleep(30)'])
def stopped(number,frame):
    child.wait(timeout=2)
    raise SystemExit(0)
signal.signal(signal.SIGTERM,stopped)
print(json.dumps({'descendantPid':child.pid}),flush=True)
time.sleep(30)
"""
    r = execute('deadline', [sys.executable, '-c', descendant], seconds=0.4)
    detail = json.loads((root / 'deadline.log').read_text().splitlines()[0])
    check(r['status'] == 'FAIL' and r['timedOut'] and r['exit'] == 124 and r['childExit'] == 0
          and r['processGroupAbsent'] and sentinel.poll() is None and detail['descendantPid'] > 1,
          'deadline-with-descendant')
    rows.append({'case': 'deadline-with-descendant', 'pass': True, 'result': r,
                 'unrelatedSentinelAlive': True, 'descendantCreated': True})

    def broken_receipt(pid):
        raise OSError('fixture receipt failure')
    r = execute('callback', [sys.executable, '-c', 'import time;time.sleep(30)'], started=broken_receipt)
    check(r['status'] == 'FAIL' and r['errorType'] == 'OSError' and r['processGroupAbsent'],
          'receipt-callback-failure')
    rows.append({'case': 'receipt-callback-failure', 'pass': True, 'result': r})

    registry = root / 'recovery-groups.jsonl'
    registry.write_text('')
    command = node_script('detached', 'await runCurrentRecovery({command:process.execPath,'
        'args:["-e","setInterval(()=>{},1000)"],observe:()=>null,'
        'onGroup:e=>{fs.appendFileSync(' + json.dumps(str(registry)) +
        ',JSON.stringify(e)+"\\n");if(e.event==="started"){while(true){}}}});\n')
    r = execute('detached', command, seconds=0.4, registry=registry)
    owned = runtime['registered_groups'](registry)
    groups.extend(owned)
    check(r['status'] == 'FAIL' and r['timedOut'] and r['processGroupAbsent']
          and r['registeredGroupsAbsent'] and r['residualRegisteredGroups'] and len(owned) == 1
          and sentinel.poll() is None, 'detached-recovery-registration')
    normal_command = node_script('default-hook', 'const r=await runCurrentRecovery({command:process.execPath,'
        'args:["-e","process.exit(0)"],observe:()=>null});console.log(JSON.stringify(r));\n')
    default = execute('default-hook', normal_command)
    default_result = json.loads((root / 'default-hook.log').read_text())
    check(default['status'] == 'PASS' and default_result['groupClosed']
          and default_result['monitor']['failure'] is None, 'default-hook-unchanged')
    rows.append({'case': 'detached-recovery-registration', 'pass': True, 'result': r,
                 'defaultHookResult': default_result, 'unrelatedSentinelAlive': True})

    broken_command = node_script('broken-registration', 'const r=await runCurrentRecovery({command:process.execPath,'
        'args:["-e","setInterval(()=>{},1000)"],observe:()=>null,'
        'onGroup:()=>{throw Error("fixture registration failure")}});console.log(JSON.stringify(r));\n')
    bad = execute('broken-registration', broken_command)
    bad_result = json.loads((root / 'broken-registration.log').read_text())
    check(bad['status'] == 'PASS' and bad_result['groupClosed']
          and bad_result['monitor']['failure'] == 'recovery-group-registration', 'registration-error')

    fake_repo = root / 'fixture-repo'
    fake_run = fake_repo / 'docs/release-artifacts/v4.4.0/development/mixed-preparation/mixed-120-15'
    fake_run.mkdir(parents=True)
    (fake_repo / 'build-gst-onnx').mkdir()
    (fake_repo / 'build-gst-onnx/media_server').write_bytes(b'non-product-fixture')
    fake_bin = root / 'fixture-bin'
    fake_bin.mkdir()
    (fake_bin / 'git').write_text('#!' + sys.executable + '\nimport sys\nif sys.argv[1]=="rev-parse":print("f"*40)\n')
    (fake_bin / 'git').chmod(0o700)
    (fake_run / 'run-bounded.py').write_bytes((directory / 'run-bounded.py').read_bytes())
    (fake_run / 'owned-recovery-groups.jsonl').write_text('existing fixture registry\n')
    (fake_run / 'mixed-plan.json').write_text(json.dumps({'durationMs': 7200000, 'totalBudgetMs': 7380000,
        'driverHashes': {}, 'productBinarySha256': hashlib.sha256(b'non-product-fixture').hexdigest(),
        'executionAuthorization': {'status': 'explicitly-resumed-by-user'}}))
    preparation = execute('registry-exists', [sys.executable, str(fake_run / 'run-bounded.py')],
                          env=dict(os.environ, PATH=str(fake_bin) + os.pathsep + os.environ['PATH']), cwd=fake_repo)
    preparation_record = json.loads((fake_run / 'execution.json').read_text())
    check(preparation['status'] == 'FAIL' and preparation_record['status'] == 'FAIL'
          and preparation_record['productStarted'] is False
          and preparation_record['preparationErrorType'] == 'FileExistsError', 'registry-failure-not-running')
    rows.append({'case': 'registration-error', 'pass': True, 'helperResult': bad_result,
                 'preparationStatus': preparation_record['status'], 'productStarted': False})
except Exception as error:
    failure = {'type': type(error).__name__, 'message': str(error)}
finally:
    signal.setitimer(signal.ITIMER_REAL, 0)
    record.update(result='FAIL', cases=rows, failure=failure, ownedProcessGroups=groups)
    receipt.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    if sentinel is not None:
        try:
            record['sentinelCleanup'] = runtime['stop_created_group'](sentinel)
        except Exception as error:
            record['cleanupError'] = {'type': type(error).__name__, 'message': str(error)}
            failure = failure or record['cleanupError']
    group_absence = {}
    for pid in groups:
        try:
            group_absence[str(pid)] = not group_alive(pid)
        except Exception as error:
            group_absence[str(pid)] = False
            record.setdefault('observationErrors', []).append({'pid': pid, 'type': type(error).__name__})
    record.update(result='PASS' if failure is None and all(group_absence.values()) and len(rows) == 6 else 'FAIL',
                  cases=rows, failure=failure, elapsedSeconds=time.monotonic() - began,
                  ownedProcessGroupsAbsent=group_absence)
    for file in root.glob('*.log'):
        shutil.copyfile(file, log_dest / file.name)
    for file in root.glob('*.mjs'):
        shutil.copyfile(file, log_dest / file.name)
    if (root / 'recovery-groups.jsonl').exists():
        shutil.copyfile(root / 'recovery-groups.jsonl', log_dest / 'recovery-groups.jsonl')
    if all(group_absence.values()):
        shutil.rmtree(root)
    record['temporaryRootAbsent'] = not root.exists()
    if not record['temporaryRootAbsent'] or record['elapsedSeconds'] > 30:
        record['result'] = 'FAIL'
    receipt.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(record, ensure_ascii=False, indent=2))
raise SystemExit(0 if record['result'] == 'PASS' else 1)
