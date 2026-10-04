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


def stop_created_group(child):
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
        deadline = time.monotonic() + grace
        while time.monotonic() < deadline:
            child.poll()
            if not group_alive(child.pid):
                break
            time.sleep(0.1)
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


def finish_registered_groups(registry):
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
            deadline = time.monotonic() + grace
            while remaining and time.monotonic() < deadline:
                remaining = {pid for pid in remaining if group_alive(pid)}
                if remaining:
                    time.sleep(0.1)
        return {'registeredGroupsAbsent': not remaining, 'residualRegisteredGroups': residual,
                'registeredGroupSignals': sent, 'registeredGroupCleanupSeconds': time.monotonic() - began}
    except Exception as error:
        return {'registeredGroupsAbsent': False, 'registeredGroupErrorType': type(error).__name__,
                'registeredGroupCleanupSeconds': time.monotonic() - began}


def run_owned(command, log_path, budget_seconds, cwd, env, started, registry=None):
    # 별도 세션에서 만든 자기 작업 그룹만 종료한다. 한도 뒤의 정리는 PASS 시간을 늘리지 않는다.
    interrupted = []
    previous = {sig: signal.signal(sig, lambda number, frame: interrupted.append(number))
                for sig in (signal.SIGINT, signal.SIGTERM)}
    begin = time.monotonic()
    timed_out = False
    child = None
    try:
        with Path(log_path).open('x') as output:
            child = subprocess.Popen(command, cwd=cwd, env=env, stdout=output,
                                     stderr=subprocess.STDOUT, start_new_session=True)
            started(child.pid)
            while child.poll() is None:
                remaining = budget_seconds - (time.monotonic() - begin)
                if interrupted or remaining <= 0:
                    timed_out = remaining <= 0
                    break
                try:
                    child.wait(timeout=min(1.0, remaining))
                except subprocess.TimeoutExpired:
                    pass
            execution_elapsed = time.monotonic() - begin
            timed_out = timed_out or execution_elapsed > budget_seconds
            remaining_group = group_alive(child.pid)
            cleanup = stop_created_group(child)
            registered = finish_registered_groups(registry)
            elapsed = time.monotonic() - begin
            passed = (child.returncode == 0 and not interrupted and not timed_out
                      and not remaining_group and cleanup['processGroupAbsent']
                      and registered['registeredGroupsAbsent'] and not registered.get('residualRegisteredGroups', False)
                      and elapsed <= budget_seconds)
            return {'status': 'PASS' if passed else 'FAIL', 'childExit': child.returncode,
                    'exit': 0 if passed else 124 if timed_out else 1,
                    'executionElapsedSeconds': execution_elapsed, 'elapsedSeconds': elapsed,
                    'timeoutSeconds': budget_seconds, 'timedOut': timed_out,
                    'interruptedSignals': interrupted, 'residualGroupAfterCommand': remaining_group,
                    **cleanup, **registered,
                    'finishedAt': utc_now()}
    except Exception as error:
        cleanup = stop_created_group(child) if child is not None else {
            'cleanupSignals': [], 'processGroupAbsent': True, 'cleanupOnlySeconds': 0}
        registered = finish_registered_groups(registry)
        return {'status': 'FAIL', 'exit': 1, 'errorType': type(error).__name__,
                'childExit': child.returncode if child is not None else None,
                'elapsedSeconds': time.monotonic() - begin, 'timeoutSeconds': budget_seconds,
                'interruptedSignals': interrupted, **cleanup, **registered, 'finishedAt': utc_now()}
    finally:
        for sig, handler in previous.items():
            signal.signal(sig, handler)


def main():
    directory = Path(__file__).resolve().parent
    repo = directory.parents[5]
    plan = json.loads((directory / 'mixed-plan.json').read_text())
    authorization = plan.get('executionAuthorization', {})
    if authorization.get('status') != 'explicitly-resumed-by-user':
        raise SystemExit('test execution is stopped; explicit user resume is required')
    if plan['durationMs'] != 7200000 or plan['totalBudgetMs'] != 7380000:
        raise SystemExit('unexpected execution budget')
    digest = lambda file: hashlib.sha256(file.read_bytes()).hexdigest()
    for name, expected in plan['driverHashes'].items():
        if digest(directory / name) != expected:
            raise SystemExit('driver hash mismatch')
    binary = repo / 'build-gst-onnx/media_server'
    if digest(binary) != plan['productBinarySha256']:
        raise SystemExit('product hash mismatch')
    if subprocess.check_output(['git', 'status', '--porcelain'], cwd=repo, timeout=5):
        raise SystemExit('source must be committed before this execution')
    record = {'command': ['bash', str(directory / 'mixed-120.sh'), '--duration-minutes', '120'],
              'startedAt': utc_now(), 'status': 'RUNNING', 'wrapperPid': os.getpid(),
              'sourceHead': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True, timeout=5).strip(),
              'productBinarySha256': digest(binary), 'driverHashes': plan['driverHashes'],
              'wrapperSha256': digest(Path(__file__).resolve()), 'timeoutSeconds': 7380,
              'scope': 'actual changed-path120min; compile/restart/cleanup included in123min; not whole-suite PASS',
              'reviewRequired': True, 'resourceTrendPass': False, 'uiFulltestPass': False}
    receipt = directory / 'execution.json'
    registry = directory / 'owned-recovery-groups.jsonl'
    try:
        descriptor = os.open(registry, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        os.close(descriptor)
    except Exception as error:
        record.update(status='FAIL', exit=1, preparationErrorType=type(error).__name__, productStarted=False)
    try:
        with receipt.open('x') as output:
            output.write(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    except Exception as error:
        record.update(status='FAIL', exit=1, receiptSaved=False,
                      preparationErrorType=type(error).__name__, productStarted=False)
    if record['status'] == 'FAIL':
        print(json.dumps(record, ensure_ascii=False, indent=2), flush=True)
        raise SystemExit(1)

    def started(pid):
        record['processGroup'] = pid
        receipt.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
        print(json.dumps({'status': 'RUNNING', 'processGroup': pid, 'timeoutSeconds': 7380}), flush=True)

    execution_begin = time.monotonic()
    result = run_owned(record['command'], directory / 'run.log', 7380, repo,
                       dict(os.environ, MEDIA_SERVER_RECORDING_RECEIPT_DIR=str(directory / 'receipts'),
                            MEDIA_SERVER_OWNED_RECOVERY_GROUPS=str(registry)), started, registry)
    record.update(result)
    deadline = execution_begin + 7380

    def expired(number, frame):
        raise TimeoutError('execution deadline')

    prior_alarm = signal.signal(signal.SIGALRM, expired)
    try:
        remaining = deadline - time.monotonic()
        if remaining <= 0 or record.get('timedOut'):
            raise TimeoutError('no final binding budget')
        signal.setitimer(signal.ITIMER_REAL, remaining)
        record['sourceHeadEnd'] = subprocess.check_output(
            ['git', 'rev-parse', 'HEAD'], cwd=repo, text=True, timeout=min(5, remaining)).strip()
        record['productBinarySha256End'] = digest(binary)
        if record['sourceHeadEnd'] != record['sourceHead'] or record['productBinarySha256End'] != record['productBinarySha256']:
            record.update(status='FAIL', exit=1, sourceChangedDuringExecution=True)
        record['totalWithFinalBindingSeconds'] = time.monotonic() - execution_begin
        receipt.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    except Exception as error:
        record.update(status='FAIL', exit=124 if isinstance(error, TimeoutError) else 1,
                      finalBindingErrorType=type(error).__name__)
        if isinstance(error, TimeoutError):
            record['timedOut'] = True
        record['totalWithFinalBindingSeconds'] = time.monotonic() - execution_begin
        # 한도 뒤에는 검사를 재개하지 않고 실패 기록만 최대3초 안에서 보존한다.
        signal.setitimer(signal.ITIMER_REAL, 3)
        try:
            receipt.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
        except Exception as receipt_error:
            record.update(status='FAIL', exit=1, receiptSaved=False,
                          receiptErrorType=type(receipt_error).__name__)
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, prior_alarm)
    print(json.dumps(record, ensure_ascii=False, indent=2), flush=True)
    raise SystemExit(record['exit'])


if __name__ == '__main__':
    main()
