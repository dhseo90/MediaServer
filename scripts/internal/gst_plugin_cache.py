#!/usr/bin/env python3
"""Homebrew 원본을 건드리지 않는 headless 플러그인 링크·registry 캐시를 준비한다."""

import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import sys
import tempfile


EXCLUDED = {name + suffix for name in ("libgstgtk", "libgstgtk4", "libgstpython", "libgstvalidategtk")
            for suffix in (".dylib", ".so")}


def private_directory(path):
    info = path.lstat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o022:
        raise ValueError(f"캐시 디렉터리는 현재 사용자 소유·쓰기 비공유·비링크여야 합니다: {path}")


def prepare(cache, scanner, roots):
    cache = Path(os.path.abspath(cache))
    if ":" in str(cache) or "\n" in str(cache):
        raise ValueError("캐시 경로에는 콜론/줄바꿈을 사용할 수 없습니다")
    # 상위 디렉터리를 임의로 만들지 않는다. 지정한 캐시 한 단계만 소유한다.
    cache.mkdir(mode=0o700, exist_ok=True)
    private_directory(cache)
    entries = {}
    identities = []
    seen = set()
    for root in roots:
        source = Path(root).resolve(strict=True)
        if not source.is_dir() or source in seen:
            continue
        if source == cache.resolve() or source in cache.resolve().parents or cache.resolve() in source.parents:
            raise ValueError("플러그인 원본과 캐시 경로가 겹칩니다")
        seen.add(source)
        index = len(identities)
        identities.append(str(source))
        # symlink 파일은 따라가되 symlink 디렉터리는 재귀하지 않는다(순환 방지).
        for directory, dirs, files in os.walk(source, followlinks=False):
            dirs[:] = sorted(d for d in dirs if not (Path(directory) / d).is_symlink())
            for name in sorted(files):
                if not name.endswith((".dylib", ".so")) or name in EXCLUDED:
                    continue
                original = Path(directory) / name
                target = original.resolve(strict=True)
                info = target.stat()
                if not stat.S_ISREG(info.st_mode):
                    raise ValueError(f"일반 파일이 아닌 플러그인: {original}")
                relative = str(Path(f"{index:04d}") / original.relative_to(source))
                entries[relative] = [str(target), info.st_size, info.st_mtime_ns, info.st_ino]
    if not entries:
        raise ValueError("필터 후 사용할 GStreamer 플러그인이 없습니다")
    scanner_path = Path(scanner).resolve(strict=True)
    scanner_info = scanner_path.stat()
    manifest = {"schema": 1, "roots": identities, "plugins": entries,
                "scanner": [str(scanner_path), scanner_info.st_size, scanner_info.st_mtime_ns],
                "machine": os.uname().machine}
    encoded = json.dumps(manifest, sort_keys=True, ensure_ascii=False).encode()
    bundle = cache / ("v1-" + hashlib.sha256(encoded).hexdigest())

    def validate():
        private_directory(bundle)
        private_directory(bundle / "plugins")
        manifest_path = bundle / "manifest.json"
        if manifest_path.is_symlink() or manifest_path.read_bytes() != encoded:
            raise ValueError(f"플러그인 캐시 manifest 불일치: {bundle}")
        actual = {}
        for directory, dirs, files in os.walk(bundle / "plugins", followlinks=False):
            for name in dirs:
                private_directory(Path(directory) / name)
            for name in files:
                link = Path(directory) / name
                if not link.is_symlink():
                    raise ValueError(f"캐시 플러그인은 원본 링크여야 합니다: {link}")
                actual[str(link.relative_to(bundle / "plugins"))] = os.readlink(link)
        if actual != {name: value[0] for name, value in entries.items()}:
            raise ValueError(f"플러그인 캐시 링크 불일치: {bundle}")
        registry = bundle / "registry.bin"
        if registry.is_symlink() or (registry.exists() and not registry.is_file()):
            raise ValueError(f"잘못된 registry 파일: {registry}")

    if not bundle.exists() and not bundle.is_symlink():
        staging = Path(tempfile.mkdtemp(prefix=".prepare-", dir=cache))
        try:
            for relative, value in entries.items():
                link = staging / "plugins" / relative
                link.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
                link.symlink_to(value[0])
            (staging / "manifest.json").write_bytes(encoded)
            try:
                staging.rename(bundle)
            except OSError:
                # 다른 프로세스가 먼저 공개한 경우에도 아래 내용 검증을 반드시 거친다.
                if not bundle.exists():
                    raise
        finally:
            if staging.exists():
                shutil.rmtree(staging)
    validate()
    return bundle


if __name__ == "__main__":
    try:
        if len(sys.argv) < 4:
            raise ValueError("사용법: gst_plugin_cache.py 캐시경로 scanner 플러그인경로...")
        print(prepare(sys.argv[1], sys.argv[2], sys.argv[3:]))
    except (OSError, ValueError) as error:
        print(f"[gstreamer 환경 오류] {error}", file=sys.stderr)
        sys.exit(1)
