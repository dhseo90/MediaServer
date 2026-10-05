#!/usr/bin/env python3
# 파일 용도: 내부 A record 검사. 소유 임시 root와 명령별 종료 코드, 별도 프로세스 재조회를 기록한다.
import hashlib
import os
import pathlib
import shlex
import shutil
import subprocess
import tempfile

repo = pathlib.Path(__file__).resolve().parents[2]
build = repo / 'build-gst-onnx'
archive = build / 'libmedia_server_runtime.a'
for directory in ('src', 'include'):
    for source in (repo / directory).rglob('*'):
        if source.suffix in ('.cpp', '.h') and source.stat().st_mtime_ns > archive.stat().st_mtime_ns:
            raise RuntimeError('product build required: ' + str(source.relative_to(repo)))
root = pathlib.Path(tempfile.mkdtemp(prefix='media-server-bound-review-')).resolve()
identity = root.stat()
print('[fixture]', root, flush=True)

def run(args, timeout=60):
    print('[command]', shlex.join(map(str, args)), flush=True)
    result = subprocess.run(args, cwd=repo, timeout=timeout)
    print('[exit]', result.returncode, flush=True)
    result.check_returncode()

try:
    link = shlex.split((build / 'CMakeFiles/media_server.dir/link.txt').read_text())
    libs = [str(archive), *link[link.index('libmedia_server_runtime.a') + 1:]]
    flags = shlex.split(subprocess.check_output(['pkg-config', '--cflags', 'openssl', 'sqlite3', 'gstreamer-app-1.0'], text=True))
    for relative in ('scripts/internal/va_review_bound_record_checks.h', 'scripts/internal/va_review_smoke.cpp',
                     'scripts/internal/verify_va_review_bound_record.py', 'src/recording/va_review_bound_record.cpp',
                     'src/recording/va_review_store.cpp', 'src/recording/evidence_observation.cpp'):
        print('[source]', relative, hashlib.sha256((repo / relative).read_bytes()).hexdigest(), flush=True)
    run(['c++', '-std=c++17', '-Wall', '-Wextra', '-Werror', '-pthread', '-I' + str(repo / 'include'),
         '-DMEDIA_SERVER_USE_OPENSSL=1', '-DMEDIA_SERVER_USE_SQLITE3=1', '-DMEDIA_SERVER_USE_GSTREAMER=1',
         '-DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1', *flags,
         str(repo / 'scripts/internal/va_review_smoke.cpp'), *libs, '-o', str(root / 'smoke')])
    for name in ('seed', 'read', 'legacy', 'core'):
        (root / name).mkdir(mode=0o700)
    run([str(root / 'smoke'), str(root / 'seed'), '--bound-seed', 'unused'])
    # fresh readback의 프로세스에는 catalog/원본 대신 불변 저장소 사본과 독립 기대 record만 준다.
    for name in ('evidence-packages', 'va-reviews'):
        shutil.copytree(root / 'seed' / name, root / 'read' / name)
    for name in ('record-id', 'package-id', 'expected-record.json'):
        shutil.copyfile(root / 'seed' / name, root / 'read' / name)
    shutil.rmtree(root / 'seed')
    print('[independence] seed process exited; original catalog/root removed before fresh process', flush=True)
    run([str(root / 'smoke'), str(root / 'read'), '--bound-read', 'unused'])
    run([str(root / 'smoke'), str(root / 'legacy'), '--records-only', 'unused'])
    for source, name in [('test/fixtures/v450_review_core.json', 'core-fixture.json'),
                         ('test/fixtures/v450_review_observer.json', 'observer-fixture.json'),
                         ('docs/release-artifacts/v4.5.0/37-request-freeze.json', 'previous-observation-plan.json')]:
        shutil.copyfile(repo / source, root / 'core' / name)
    run([str(root / 'smoke'), str(root / 'core'), '--core-only', 'unused'])
    print('[scope] model/provider calls=0; detector inference=0; public switch=0; full 40 suite not rerun', flush=True)
finally:
    after = root.lstat()
    if root.is_symlink() or (after.st_dev, after.st_ino, after.st_uid) != (identity.st_dev, identity.st_ino, os.getuid()):
        raise RuntimeError('owned root identity changed; cleanup refused')
    shutil.rmtree(root)
    if root.exists():
        raise RuntimeError('cleanup incomplete')
    print('[cleanup] owned process roots removed; no servers/ports/models started', flush=True)
