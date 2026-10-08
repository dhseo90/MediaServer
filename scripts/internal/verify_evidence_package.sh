#!/usr/bin/env bash
# 파일 용도: 현재 제품 archive에 연결해 격리 증거 패키지를 검사한다. 서버·포트·모델 없음.
set -euo pipefail
task_repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
task_parent="$(cd "${MEDIA_SERVER_TEST_ARTIFACT_ROOT:-${TMPDIR:-/tmp}}" && pwd -P)"
if [[ -n "${MEDIA_SERVER_TEST_ARTIFACT_ROOT:-}" ]]; then
 [[ "$task_parent" = "$MEDIA_SERVER_TEST_ARTIFACT_ROOT" && "$task_parent" = /private/tmp/media-server-* && ! -L "$task_parent" && -O "$task_parent" ]] || exit 2
fi
task_root="$(mktemp -d "$task_parent/media-server-evidence.XXXXXX")"
task_identity="$(node -e 'const s=require("fs").lstatSync(process.argv[1]);console.log(`${s.dev}:${s.ino}:${s.uid}`)' "$task_root")"
cleanup(){
 local prior=$?
 if [[ -n "${MEDIA_SERVER_TEST_ARTIFACT_ROOT:-}" ]]; then
  printf '[preserved-root] %s exit=%s\n' "$task_root" "$prior"
  return "$prior"
 fi
 node -e 'const f=require("fs"),p=require("path"),r=process.argv[1],s=f.lstatSync(r);if(p.dirname(r)!==process.argv[2]||!/^media-server-evidence\.[A-Za-z0-9]+$/.test(p.basename(r))||s.isSymbolicLink()||!s.isDirectory()||f.realpathSync(r)!==r||`${s.dev}:${s.ino}:${s.uid}`!==process.argv[3]||s.uid!==process.getuid())throw Error("cleanup-ownership");f.rmSync(r,{recursive:true});if(f.existsSync(r))throw Error("cleanup-remains");console.log("[cleanup] removed=true")' "$task_root" "$task_parent" "$task_identity" || return 1
 return "$prior"
}
trap cleanup EXIT
cd "$task_repo"
source scripts/internal/env_common.sh
export MEDIA_SERVER_GST_CACHE_DIR="$task_root/gst-cache"
media_server_apply_homebrew_gst_env
date -u '+[start] %Y-%m-%dT%H:%M:%SZ'
git rev-parse HEAD
uname -sm
python3 - "$task_repo" "$task_root" "${1:-}" <<'PY'
import hashlib, os, pathlib, shlex, shutil, subprocess, sys
repo, root = map(pathlib.Path, sys.argv[1:3])
build = repo / 'build-gst-onnx'
archive = build / 'libmedia_server_runtime.a'
for folder in ('src', 'include'):
    for source in (repo / folder).rglob('*'):
        if source.suffix in ('.cpp', '.h') and source.stat().st_mtime_ns > archive.stat().st_mtime_ns:
            raise RuntimeError('product archive is stale: ' + str(source.relative_to(repo)))
observation_mode = sys.argv[3] == '--observations'
smoke = 'evidence_observation_smoke.cpp' if observation_mode else 'evidence_package_smoke.cpp'
link = shlex.split((build / 'CMakeFiles/media_server.dir/link.txt').read_text())
index = link.index('libmedia_server_runtime.a')
libs = [str(archive), *link[index + 1:]]
flags = shlex.split(subprocess.check_output(['pkg-config', '--cflags', 'gstreamer-app-1.0', 'openssl', 'sqlite3'], text=True))
for source in sorted([*(repo/'src/recording').glob('evidence_*.cpp'), *(repo/'include/recording').glob('evidence_*.h'), repo/'scripts/internal'/smoke]):
    print('[source]', str(source.relative_to(repo)), hashlib.sha256(source.read_bytes()).hexdigest(), flush=True)
command = [os.environ.get('CXX', 'c++'), '-std=c++17', '-Wall', '-Wextra', '-Werror', '-pthread', '-I'+str(repo/'include'),
    '-DMEDIA_SERVER_USE_GSTREAMER=1', '-DMEDIA_SERVER_USE_OPENSSL=1', '-DMEDIA_SERVER_USE_SQLITE3=1',
    '-DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1', *flags, str(repo/'scripts/internal'/smoke),
    *libs, '-o', str(root/'evidence-smoke')]
subprocess.run(command, check=True, timeout=60)
if observation_mode:
    subprocess.run([str(root/'evidence-smoke'), str(root), 'seed'], check=True, timeout=90)
    subprocess.run([str(root/'evidence-smoke'), str(root), 'recover'], check=True, timeout=30)
    # 이전 프로세스와 catalog 객체는 종료됐다. 테스트 소유 원본 저장소만 제거하고 별도 reader를 시작한다.
    originals = root/'recordings'
    if originals.is_symlink() or not originals.is_dir() or originals.resolve().parent != root:
        raise RuntimeError('readback-removal-ownership')
    shutil.rmtree(originals)
    if originals.exists(): raise RuntimeError('readback-removal-remains')
    subprocess.run([str(root/'evidence-smoke'), str(root), 'readback'], check=True, timeout=30)
if not observation_mode and sys.argv[3] not in ('--http-only','--visual-http','--ui'):
    subprocess.run([str(root/'evidence-smoke'), str(root)], check=True, timeout=90)
if sys.argv[3] in ('--http','--http-only','--visual-http','--ui'):
    environment = dict(os.environ, MEDIA_SERVER_EVIDENCE_FIXTURE_BIN=str(root/'evidence-smoke'))
    if sys.argv[3] == '--visual-http': environment['MEDIA_SERVER_EVIDENCE_VISUAL']='1'
    if sys.argv[3] == '--ui': environment['MEDIA_SERVER_EVIDENCE_UI']='1'
    subprocess.run(['node', str(repo/'scripts/internal/evidence_http_checks.mjs')], env=environment, check=True, timeout=365 if sys.argv[3]=='--ui' else 65)
PY
date -u '+[end] %Y-%m-%dT%H:%M:%SZ'
