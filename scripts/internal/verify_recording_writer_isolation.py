#!/usr/bin/env python3
"""격리 guard를 실제 writer 바이너리에서 검증한다. 기본 설정 반례는 가짜 HOME/CWD만 사용."""
import hashlib
import json
import os
import pathlib
import subprocess
import sys
sys.dont_write_bytecode = True
from recording_native_isolation import environment

parent = pathlib.Path(sys.argv[1])
binary = pathlib.Path(sys.argv[2]).resolve()
results = []
for case in ['missing', 'source-only', 'views-only', 'relative', 'outside', 'symlink', 'default-name', 'directory', 'fifo', 'cache-file', 'valid-one', 'valid-two']:
    root = parent / case
    root.mkdir(mode=0o700)
    sentinel = {root / '.media_server.sources.json': b'fake source sentinel\n', root / '.media_server.views.json': b'fake view sentinel\n'}
    for p, b in sentinel.items():
        p.write_bytes(b)
    env = environment(root)
    if case in ['missing', 'source-only', 'views-only']:
        source, views = env['MEDIA_SERVER_SOURCE_REGISTRY'], env['MEDIA_SERVER_PUBLISHED_VIEWS']
        if case == 'missing':
            env = {k: v for k, v in env.items() if not k.startswith('MEDIA_SERVER_')}
            env['MEDIA_SERVER_SKIP_LOCAL_ENV'] = '1'
        else:
            env.pop('MEDIA_SERVER_SOURCE_REGISTRY')
            env.pop('MEDIA_SERVER_PUBLISHED_VIEWS')
            if case == 'source-only': env['MEDIA_SERVER_SOURCE_REGISTRY'] = source
            if case == 'views-only': env['MEDIA_SERVER_PUBLISHED_VIEWS'] = views
    elif case == 'relative': env['MEDIA_SERVER_SOURCE_REGISTRY'] = 'sources.json'
    elif case == 'outside': env['MEDIA_SERVER_PUBLISHED_VIEWS'] = str(parent / 'outside-sentinel')
    elif case == 'symlink':
        (root / 'sources.json').symlink_to(root / '.media_server.sources.json')
    elif case == 'default-name': env['MEDIA_SERVER_SOURCE_REGISTRY'] = str(root / '.media_server.sources.json')
    elif case == 'directory': (root / 'sources.json').mkdir()
    elif case == 'fifo':
        os.mkfifo(root / 'sources.json', 0o600)
        try: environment(root)
        except ValueError: pass
        else: raise AssertionError('helper accepted FIFO')
    elif case == 'cache-file':
        (root / 'cache').rmdir()
        (root / 'cache').write_bytes(b'not a directory')
        try: environment(root)
        except ValueError: pass
        else: raise AssertionError('helper accepted non-directory cache')
    # Bypass the helper deliberately: guard must run before any registry/config singleton.
    result = subprocess.run([str(binary), str(root)], cwd=root, env=env, capture_output=True, timeout=30)
    output = result.stdout + result.stderr
    assert len(output) <= 4194304
    (parent / (case + '.log')).write_bytes(output)
    assert all(p.is_file() and p.read_bytes() == b for p, b in sentinel.items()), case
    valid = case.startswith('valid-')
    assert result.returncode == (0 if valid else 78), (case, result.returncode)
    if not valid:
        assert output == b'[isolation] rejected before registry/config initialization\n', (case, output[:100])
    else:
        assert (root / 'sources.json').is_file() and b'pass=118 fail=0' in output
        assert (root / 'sources.json').resolve().parent == root
    results.append({'case': case, 'exit': result.returncode, 'bytes': len(output), 'sha256': hashlib.sha256(output).hexdigest(), 'sentinelUnchanged': True, 'directBinary': True})
assert (parent/'outside-sentinel').read_bytes() == b'outside fake sentinel\n'
(parent / 'isolation-results.json').write_text(json.dumps(results, indent=2)+'\n')
print(json.dumps({'passed':len(results),'failed':0,'normalRoots':2,'initializationBeforeReject':False}))
