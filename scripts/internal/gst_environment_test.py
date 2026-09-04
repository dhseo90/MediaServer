#!/usr/bin/env python3
"""GStreamer 실행 환경 회귀 검사. 기본은 격리 fixture이며 실제 서버를 시작하지 않는다."""

import concurrent.futures
import json
import os
from pathlib import Path
import plistlib
import shlex
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
COMMON = ROOT / "scripts/internal/env_common.sh"
SELECT = ("PATH", "HOMEBREW_PREFIX", "GST_PLUGIN_PATH_1_0", "GST_PLUGIN_PATH",
          "GST_PLUGIN_SYSTEM_PATH_1_0", "GST_PLUGIN_SYSTEM_PATH",
          "GST_REGISTRY_1_0", "GST_REGISTRY", "GST_PLUGIN_SCANNER_1_0",
          "MEDIA_SERVER_GST_INPUT_PLUGIN_PATH", "MEDIA_SERVER_GST_MANAGED_PLUGIN_PATH",
          "MEDIA_SERVER_GST_MANAGED_REGISTRY")
JSON_ENV = shlex.quote(sys.executable) + " -c " + shlex.quote(
    "import os,json;print(json.dumps({k:os.environ[k] for k in "
    + repr(SELECT) + " if k in os.environ}))")


def executable(path, body):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("#!/bin/bash\n" + body + "\n")
    path.chmod(0o700)


def shell_function(source, name):
    start = source.index(name + "() {")
    end = source.index("\n}\n", start) + 3
    return source[start:end]


class EnvironmentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="media_server_gst_env_")
        self.base = Path(self.temp.name).resolve()
        self.brew = self.base / "brew prefix"
        self.plugins = self.brew / "lib/gstreamer-1.0"
        self.plugins.mkdir(parents=True)
        for name in ("libgstcoreelements.dylib", "libgstgtk.dylib", "libgstgtk4.dylib",
                     "libgstpython.dylib", "validate/libgstvalidategtk.dylib",
                     "validate/libgstvalidatessim.dylib"):
            target = self.plugins / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(name)
        self.scanner = self.brew / "opt/gstreamer/libexec/gstreamer-1.0/gst-plugin-scanner"
        executable(self.scanner, "exit 0")
        executable(self.brew / "libexec/gstreamer-1.0/gst-plugin-scanner", "exit 0")
        nice = self.brew / "opt/libnice-gstreamer/libexec/gstreamer-1.0"
        nice.mkdir(parents=True)
        (nice / "libgstnice.dylib").write_text("nice")
        self.bin = self.base / "bin"
        executable(self.bin / "uname", "echo Darwin")
        executable(self.bin / "brew", "[[ $1 == --prefix ]] || exit 2\nprintf '%s\\n' "
                   + shlex.quote(str(self.brew)))
        self.cache = self.base / "cache with spaces"
        self.env = {k: v for k, v in os.environ.items()
                    if not k.startswith(("GST_", "MEDIA_SERVER_GST_", "DYLD_"))}
        self.env.update(HOMEBREW_PREFIX=str(self.brew),
                        PATH=str(self.bin) + ":" + os.environ["PATH"],
                        MEDIA_SERVER_GST_CACHE_DIR=str(self.cache))

    def tearDown(self):
        files = [p for p in self.base.rglob("*") if p.is_file() or p.is_symlink()]
        size = sum(p.lstat().st_size for p in files)
        self.temp.cleanup()
        self.assertFalse(self.base.exists())
        print(f"[cleanup] {self.id()}: path={self.base} files={len(files)} bytes={size} removed=true")

    def apply(self, extra="", env=None, check=True):
        code = "set -euo pipefail\nsource " + shlex.quote(str(COMMON))
        code += "\nmedia_server_apply_homebrew_gst_env\n" + extra + "\n" + JSON_ENV
        result = subprocess.run(["/bin/bash", "-c", code], env=env or self.env,
                                text=True, capture_output=True, timeout=20)
        if check:
            self.assertEqual(result.returncode, 0, result.stderr)
            return json.loads(result.stdout)
        return result

    def test_linux_unchanged(self):
        executable(self.bin / "uname", "echo Linux")
        self.env["GST_PLUGIN_PATH"] = "/custom/linux/plugins"
        self.assertEqual(self.apply(), {k: self.env[k] for k in SELECT if k in self.env})
        self.assertFalse(self.cache.exists())

    def test_explicit_prefix(self):
        result = self.apply()
        self.assertEqual(result["HOMEBREW_PREFIX"], str(self.brew))
        self.assertEqual(result.get("GST_PLUGIN_SCANNER_1_0"), str(self.scanner))

    def test_prefix_discovery(self):
        del self.env["HOMEBREW_PREFIX"]
        result = self.apply()
        self.assertEqual(result["HOMEBREW_PREFIX"], str(self.brew))
        self.assertEqual(result["GST_PLUGIN_SCANNER_1_0"], str(self.scanner))

    def test_filter(self):
        before = {str(p): p.read_bytes() for p in self.plugins.rglob("*") if p.is_file()}
        result = self.apply()
        links = [p for root in result["GST_PLUGIN_PATH_1_0"].split(":")
                 for p in Path(root).rglob("*") if p.is_symlink()]
        self.assertEqual({p.name for p in links},
                         {"libgstcoreelements.dylib", "libgstnice.dylib", "libgstvalidatessim.dylib"})
        self.assertEqual(result["GST_PLUGIN_SYSTEM_PATH_1_0"], "")
        self.assertEqual(result["GST_PLUGIN_SYSTEM_PATH"], "")
        self.assertEqual(before, {str(p): p.read_bytes() for p in self.plugins.rglob("*") if p.is_file()})

    def test_custom_paths(self):
        custom = self.base / "custom plugins"
        custom.mkdir()
        (custom / "libgstnice.dylib").write_text("custom nice")
        self.env["GST_PLUGIN_PATH_1_0"] = str(custom)
        links = [p.resolve() for root in self.apply()["GST_PLUGIN_PATH_1_0"].split(":")
                 for p in Path(root).rglob("*.dylib")]
        self.assertIn(custom / "libgstnice.dylib", links)
        self.assertEqual(sum(p.name == "libgstnice.dylib" for p in links), 2)
        # 디렉터리 재귀 열거 순서가 아니라 GST의 명시적 root 순서로 우선순위를 전달한다.
        roots = self.apply()["GST_PLUGIN_PATH_1_0"].split(":")
        self.assertEqual(len(roots), 3)
        self.assertEqual((Path(roots[0]) / "libgstnice.dylib").resolve(), custom / "libgstnice.dylib")

    def test_custom_so_plugins(self):
        custom = self.base / "custom so"
        custom.mkdir()
        for name in ("libgstcustom.so", "libgstgtk.so", "libgstgtk4.so", "libgstpython.so",
                     "libgstvalidategtk.so"):
            (custom / name).write_text(name)
        self.env["GST_PLUGIN_PATH_1_0"] = str(custom)
        links = [p.name for root in self.apply()["GST_PLUGIN_PATH_1_0"].split(":")
                 for p in Path(root).rglob("*.so")]
        self.assertEqual(links, ["libgstcustom.so"])

    def test_inherited_custom_paths(self):
        first = self.apply()
        custom = self.base / "additional plugins"
        custom.mkdir()
        (custom / "libgstcustom.dylib").write_text("extra")
        for value in (str(custom) + ":" + first["GST_PLUGIN_PATH_1_0"],
                      first["GST_PLUGIN_PATH_1_0"] + ":" + str(custom)):
            result = self.apply(env={**self.env, **first, "GST_PLUGIN_PATH_1_0": value})
            links = [p.resolve() for root in result["GST_PLUGIN_PATH_1_0"].split(":")
                     for p in Path(root).rglob("*.dylib")]
            self.assertIn(custom / "libgstcustom.dylib", links)
            self.assertEqual(len(links), 4)

    def test_reapply(self):
        first = self.apply()
        second = self.apply("media_server_apply_homebrew_gst_env\nmedia_server_apply_homebrew_gst_env")
        self.assertEqual(first, second)
        self.assertEqual(len(list(self.cache.glob("v1-*"))), 1)

    def test_upgrade(self):
        first = self.apply()
        (self.plugins / "libgstcoreelements.dylib").write_text("updated plugin")
        second = self.apply(env={**self.env, **first})
        self.assertNotEqual(first["GST_PLUGIN_PATH_1_0"], second["GST_PLUGIN_PATH_1_0"])
        self.assertNotEqual(first["GST_REGISTRY_1_0"], second["GST_REGISTRY_1_0"])

    def test_concurrent(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(lambda _: self.apply(), range(4)))
        self.assertTrue(all(r == results[0] for r in results))
        self.assertEqual(len(list(self.cache.glob("v1-*"))), 1)

    def test_unsafe_cache(self):
        foreign = self.base / "foreign"
        foreign.mkdir()
        self.cache.symlink_to(foreign, target_is_directory=True)
        result = self.apply(check=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("캐시 디렉터리는 현재 사용자 소유", result.stderr)
        self.assertEqual(list(foreign.iterdir()), [])
        self.cache.unlink()
        self.cache.mkdir(mode=0o777)
        self.cache.chmod(0o777)
        result = self.apply(check=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("캐시 디렉터리는 현재 사용자 소유", result.stderr)

    def test_tampered_cache(self):
        roots = self.apply()["GST_PLUGIN_PATH_1_0"].split(":")
        mirror = Path(roots[0])
        link = next(p for root in roots for p in Path(root).rglob("libgstnice.dylib"))
        original = os.readlink(link)
        link.unlink()
        link.symlink_to(self.plugins / "libgstgtk.dylib")
        result = self.apply(check=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("플러그인 캐시 링크 불일치", result.stderr)
        link.unlink()
        link.symlink_to(original)
        (mirror / "extra.dylib").symlink_to(self.plugins / "libgstgtk.dylib")
        result = self.apply(check=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("플러그인 캐시 링크 불일치", result.stderr)

    def test_registry(self):
        result = self.apply()
        self.assertTrue(Path(result["GST_REGISTRY_1_0"]).is_relative_to(self.cache))
        for key in ("GST_REGISTRY", "GST_REGISTRY_1_0"):
            explicit = str(self.base / (key + " explicit.bin"))
            result = self.apply(env={**self.env, key: explicit})
            self.assertEqual(result["GST_REGISTRY_1_0"], explicit)

    def test_system_profile(self):
        self.env["MEDIA_SERVER_GST_PLUGIN_PROFILE"] = "system"
        result = self.apply()
        self.assertFalse(self.cache.exists())
        self.assertNotIn("GST_PLUGIN_SYSTEM_PATH_1_0", result)
        self.assertNotIn("GST_REGISTRY_1_0", result)

    def test_invalid_profile(self):
        self.env["MEDIA_SERVER_GST_PLUGIN_PROFILE"] = "typo"
        result = self.apply(check=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("profile은 headless 또는 system이어야", result.stderr)
        self.env.pop("MEDIA_SERVER_GST_PLUGIN_PROFILE")
        result = self.apply("export MEDIA_SERVER_GST_PLUGIN_PROFILE=system\n"
                            "media_server_apply_homebrew_gst_env", check=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("system 진단 모드는 공통 환경 적용 전 새 셸", result.stderr)

    def test_override_order(self):
        for name in ("build_server.sh", "start_server.sh", "run_server_foreground.sh", "test_all.sh"):
            source = (COMMON.parent / name).read_text()
            self.assertGreater(source.index("\nmedia_server_apply_homebrew_gst_env"),
                               source.index('source "${ENV_FILE}"'), name)

    def background(self, mode):
        source = (COMMON.parent / "start_server.sh").read_text()
        funcs = "\n".join(shell_function(source, n) for n in
                          ("xml_escape", "write_launchd_plist", "start_detached"))
        output = self.base / "background.json"
        binary = self.base / "capture-env"
        executable(binary, JSON_ENV + " > " + shlex.quote(str(output) + ".tmp")
                   + "\nmv " + shlex.quote(str(output) + ".tmp") + " " + shlex.quote(str(output)))
        executable(self.bin / "launchctl", "exit 0")
        assignments = {"ROOT_DIR": str(self.base), "PLIST_FILE": str(self.base / "launchd.plist"),
                       "LAUNCHD_LABEL": "test.gst", "MEDIA_SERVER_BIN": str(binary),
                       "LOG_FILE": str(self.base / "log"), "MEDIA_SERVER_START_MODE": mode,
                       "MEDIA_SERVER_LISTEN_ADDRESS": "127.0.0.1", "MEDIA_SERVER_HTTP_LISTEN_PORT": "9999",
                       "MEDIA_SERVER_HTTP_LISTEN_ADDRESS": "127.0.0.1", "MEDIA_SERVER_FORCE_RTSP_TCP": "1"}
        script = funcs + "\n" + "\n".join(k + "=" + shlex.quote(v) for k, v in assignments.items())
        script += "\nstart_with_launchd() { write_launchd_plist; }\nstart_detached 9998\n"
        if mode == "nohup":
            script += "for _ in {1..100}; do [[ -f " + shlex.quote(str(output)) + " ]] && break; sleep 0.01; done\n"
        self.apply(script)
        if mode == "launchd":
            return plistlib.loads((self.base / "launchd.plist").read_bytes())["EnvironmentVariables"]
        return json.loads(output.read_text())

    def test_nohup_environment(self):
        result = self.background("nohup")
        self.assertEqual(result["GST_PLUGIN_SYSTEM_PATH_1_0"], "")
        self.assertEqual(result["GST_PLUGIN_SYSTEM_PATH"], "")
        self.assertTrue(result["GST_REGISTRY_1_0"])
        self.assertTrue(result["GST_PLUGIN_SCANNER_1_0"])

    def test_launchd_environment(self):
        result = self.background("launchd")
        self.assertEqual(result["GST_PLUGIN_SYSTEM_PATH_1_0"], "")
        self.assertEqual(result["GST_PLUGIN_SYSTEM_PATH"], "")
        self.assertTrue(result["GST_REGISTRY_1_0"])
        self.assertTrue(result["GST_PLUGIN_SCANNER_1_0"])

    def test_dispatch_environment(self):
        project = self.base / "project"
        internal = project / "scripts/internal"
        internal.mkdir(parents=True)
        for name in ("env_common.sh", "gst_plugin_cache.py"):
            (internal / name).write_bytes((COMMON.parent / name).read_bytes())
        (project / "server.sh").write_bytes((ROOT / "server.sh").read_bytes())
        executable(internal / "verify_v410_event_recording.sh", JSON_ENV)
        result = subprocess.run(["/bin/bash", str(project / "server.sh"), "verify-v410-event-recording"],
                                env=self.env, text=True, capture_output=True, timeout=20)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["GST_PLUGIN_SYSTEM_PATH_1_0"], "")
        wrapper = (COMMON.parent / "verify_v410_event_recording.sh").read_text()
        self.assertIn("media_server_apply_homebrew_gst_env", wrapper)

    def test_cli_no_gst_side_effects(self):
        project = self.base / "cli project"
        internal = project / "scripts/internal"
        internal.mkdir(parents=True)
        for name in ("env_common.sh", "gst_plugin_cache.py", "verify_docs_links.mjs", "script_arg_utils.mjs"):
            (internal / name).write_bytes((COMMON.parent / name).read_bytes())
            (internal / name).chmod(0o700)
        (project / "server.sh").write_bytes((ROOT / "server.sh").read_bytes())
        self.env["MEDIA_SERVER_GST_PLUGIN_PROFILE"] = "invalid-for-test"
        for args, expected_code, expected_text in (
                (["verify-docs-links", "--help"], 0, "Docs link verification"),
                (["verify-unknown-command"], 1, "알 수 없는 명령입니다")):
            result = subprocess.run(["/bin/bash", str(project / "server.sh"), *args],
                                    env=self.env, text=True, capture_output=True, timeout=20)
            self.assertEqual(result.returncode, expected_code, result.stderr)
            self.assertIn(expected_text, result.stdout)
            self.assertFalse(self.cache.exists())


if __name__ == "__main__":
    unittest.main(verbosity=2, failfast=True)
