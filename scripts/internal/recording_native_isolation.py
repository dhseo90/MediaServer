#!/usr/bin/env python3
"""기존 writer/native 검사 전용 자식 환경. 제품 기본 설정을 읽거나 생성하지 않는다."""
import os
import pathlib
import signal
import stat
import subprocess
import sys


def environment(root):
    root = pathlib.Path(root)
    base = pathlib.Path('/tmp').resolve()
    if not root.is_absolute() or root.resolve() != root or base not in root.parents:
        raise ValueError('owned absolute canonical temp root required')
    relative = root.relative_to(base)
    if not relative.parts[0].startswith(('media-server-', 'media_server_')):
        raise ValueError('test root namespace required')
    p = base
    for part in relative.parts:
        p /= part
        s = p.lstat()
        if not stat.S_ISDIR(s.st_mode) or s.st_uid != os.getuid() or s.st_mode & 0o022:
            raise ValueError('test root owner/type/mode rejected')
    env = {k: v for k, v in os.environ.items() if not k.startswith('MEDIA_SERVER_')}
    env.update(MEDIA_SERVER_SKIP_LOCAL_ENV='1', MEDIA_SERVER_VERIFY_RECORDING_STATE_TRACE='1', PYTHONDONTWRITEBYTECODE='1')
    paths = {
        'MEDIA_SERVER_SOURCE_REGISTRY': 'sources.json', 'MEDIA_SERVER_PUBLISHED_VIEWS': 'views.json',
        'MEDIA_SERVER_ANALYSIS_REGISTRY': 'analysis.json', 'MEDIA_SERVER_AUTH_USERS_FILE': 'users.json',
        'MEDIA_SERVER_RECORDING_STORAGE_ROOT': 'recording', 'MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH': 'events',
        'MEDIA_SERVER_FILE_ROOT': 'input', 'XDG_CACHE_HOME': 'cache', 'TMPDIR': 'tmp',
        'GST_REGISTRY': 'registry.bin', 'GST_REGISTRY_1_0': 'registry.bin', 'HOME': 'home',
    }
    dirs = {'recording', 'events', 'input', 'cache', 'tmp', 'home'}
    for key, leaf in paths.items():
        p = root / leaf
        if p.exists() or p.is_symlink():
            s = p.lstat()
            if s.st_uid != os.getuid() or p.is_symlink() or s.st_mode & 0o022 or (p.is_file() and s.st_nlink != 1):
                raise ValueError('test leaf ownership rejected')
            if not (stat.S_ISDIR(s.st_mode) if leaf in dirs else stat.S_ISREG(s.st_mode)):
                raise ValueError('test leaf kind rejected')
        elif leaf in dirs:
            p.mkdir(mode=0o700)
        env[key] = str(p)
    return env


if __name__ == '__main__':
    if len(sys.argv) < 4 or sys.argv[2] != '--':
        raise SystemExit('usage: recording_native_isolation.py ROOT -- BINARY ARG...')
    root = pathlib.Path(sys.argv[1])
    env = environment(root)
    code = subprocess.call(sys.argv[3:], cwd=root, env=env)
    if code < 0:
        signum = -code
        if signum not in (signal.SIGKILL, signal.SIGSTOP):
            signal.signal(signum, signal.SIG_DFL)
        os.kill(os.getpid(), signum)
    raise SystemExit(code)
