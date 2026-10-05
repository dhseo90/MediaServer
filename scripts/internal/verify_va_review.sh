#!/usr/bin/env bash
# 파일 용도: 제품 archive와 연결하는 격리 VA review native 검사. 임시 root의 소유·정리 확인.
set -euo pipefail
task_repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$task_repo"
python3 - "$task_repo" <<'PY'
import hashlib, os, pathlib, shlex, shutil, subprocess, sys, tempfile
repo=pathlib.Path(sys.argv[1]); build=repo/'build-gst-onnx'
archive=build/'libmedia_server_runtime.a'
for directory in ('src','include'):
    for source in (repo/directory).rglob('*'):
        if source.suffix in ('.cpp','.h') and source.stat().st_mtime_ns>archive.stat().st_mtime_ns:
            raise RuntimeError('product build required: '+str(source.relative_to(repo)))
root=pathlib.Path(tempfile.mkdtemp(prefix='media-server-va-review-')).resolve()
identity=root.stat(); print('[fixture]',root,flush=True)
try:
    link=shlex.split((build/'CMakeFiles/media_server.dir/link.txt').read_text())
    libs=[str(archive),*link[link.index('libmedia_server_runtime.a')+1:]]
    flags=shlex.split(subprocess.check_output(['pkg-config','--cflags','openssl','sqlite3','gstreamer-app-1.0'],text=True))
    sources=sorted([*repo.glob('src/recording/va_review*.cpp'),*repo.glob('src/recording/va_review*.h'),*repo.glob('include/recording/va_review*.h'),repo/'scripts/internal/va_review_smoke.cpp'])
    for source in sources: print('[source]',source.relative_to(repo),hashlib.sha256(source.read_bytes()).hexdigest(),flush=True)
    subprocess.run(['c++','-std=c++17','-Wall','-Wextra','-Werror','-pthread','-I'+str(repo/'include'),
        '-DMEDIA_SERVER_USE_OPENSSL=1','-DMEDIA_SERVER_USE_SQLITE3=1','-DMEDIA_SERVER_USE_GSTREAMER=1',
        '-DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1',*flags,
        str(repo/'scripts/internal/va_review_smoke.cpp'),*libs,'-o',str(root/'smoke')],check=True,timeout=60)
    subprocess.run(['bash','-c','source "$2/scripts/internal/env_common.sh"; export MEDIA_SERVER_GST_CACHE_DIR="$1/gst-cache"; media_server_apply_homebrew_gst_env || exit; exec "$1/smoke" "$1"',
        'va-review',str(root),str(repo)],check=True,timeout=90)
finally:
    st=root.lstat()
    if root.is_symlink() or (st.st_dev,st.st_ino,st.st_uid)!=(identity.st_dev,identity.st_ino,os.getuid()):
        raise RuntimeError('cleanup ownership mismatch')
    shutil.rmtree(root)
    if root.exists():raise RuntimeError('cleanup remains')
    print('[cleanup] removed=true',flush=True)
PY
