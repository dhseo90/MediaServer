#!/usr/bin/env python3
# 파일 용도: 확인된 A 경로의 단기 직접 검사. 소유 root, 즉시 종료 코드, 별도 프로세스 재조회를 보존한다.
import hashlib, os, pathlib, shlex, shutil, subprocess, tempfile, sys
repo=pathlib.Path(__file__).resolve().parents[2];build=repo/'build-gst-onnx';archive=build/'libmedia_server_runtime.a'
for folder in ('src','include'):
    for p in (repo/folder).rglob('*'):
        if p.suffix in ('.cpp','.h') and p.stat().st_mtime_ns>archive.stat().st_mtime_ns:raise RuntimeError('build required: '+str(p))
root=pathlib.Path(tempfile.mkdtemp(prefix='media-server-confirmed-review-')).resolve();identity=root.stat();print('[fixture]',root,flush=True)
def run(args,timeout=60,env=None):
    print('[command]',shlex.join(map(str,args)),flush=True);r=subprocess.run(args,cwd=repo,timeout=timeout,env=env);rc=r.returncode;print('[exit]',rc,flush=True);r.check_returncode()
try:
    paths=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard'],cwd=repo,text=True).splitlines()
    for name in paths:
        if name.startswith(('src/','include/','scripts/internal/')) and ('review' in name or name in ('src/ingress/webrtc_http_server_runtime.cpp','src/ingress/product_ui_page_scripts.cpp','src/ingress/product_ui_server_pages.cpp')):
            print('[source]',name,hashlib.sha256((repo/name).read_bytes()).hexdigest(),flush=True)
    link=shlex.split((build/'CMakeFiles/media_server.dir/link.txt').read_text());libs=[str(archive),*link[link.index('libmedia_server_runtime.a')+1:]]
    flags=shlex.split(subprocess.check_output(['pkg-config','--cflags','openssl','sqlite3','gstreamer-app-1.0'],text=True))
    run(['c++','-std=c++17','-Wall','-Wextra','-Werror','-pthread','-I'+str(repo/'include'),'-DMEDIA_SERVER_USE_OPENSSL=1','-DMEDIA_SERVER_USE_SQLITE3=1','-DMEDIA_SERVER_USE_GSTREAMER=1','-DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1',*flags,str(repo/'scripts/internal/va_review_smoke.cpp'),*libs,'-o',str(root/'smoke')])
    if '--http' in sys.argv:
        env=dict(os.environ,MEDIA_SERVER_VA_REVIEW_FIXTURE_BIN=str(root/'smoke'))
        run(['node',str(repo/'scripts/internal/va_review_confirmed_http.mjs')],timeout=240,env=env)
    else:
        (root/'seed').mkdir(mode=0o700);(root/'read').mkdir(mode=0o700)
        run([str(root/'smoke'),str(root/'seed'),'--confirmed-seed','unused'])
        run([str(root/'smoke'),str(root/'seed'),'--confirmed-checks','unused'])
        shutil.copytree(root/'seed/va-reviews',root/'read/va-reviews')
        for name in ('confirmed-id','confirmed-expected'):shutil.copyfile(root/'seed'/name,root/'read'/name)
        shutil.rmtree(root/'seed');print('[independence] original catalog/media/packages and first process removed',flush=True)
        run([str(root/'smoke'),str(root/'read'),'--confirmed-read','unused'])
    print('[scope] actual model calls=0; no installation; focused validation only',flush=True)
finally:
    s=root.lstat()
    if root.is_symlink() or (s.st_dev,s.st_ino,s.st_uid)!=(identity.st_dev,identity.st_ino,os.getuid()):raise RuntimeError('cleanup ownership changed')
    shutil.rmtree(root)
    if root.exists():raise RuntimeError('cleanup incomplete')
    print('[cleanup] owned temporary root absent',flush=True)
