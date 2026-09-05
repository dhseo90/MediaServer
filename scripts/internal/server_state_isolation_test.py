#!/usr/bin/env python3
"""제품 서버를 띄우지 않고 launcher 상태 namespace 격리를 검증한다."""

import os
from pathlib import Path
import shutil
import signal
import subprocess
import tempfile
import time
import unittest


ROOT = Path(__file__).resolve().parents[2]
INTERNAL = ROOT / "scripts/internal"
STATE_NAMES = (
    ".media_server.pid",
    ".media_server.address",
    ".media_server.port",
    ".media_server.log",
    ".media_server.mode",
    ".media_server.launchd.plist",
)


def executable(path, body):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("#!/bin/bash\nset -euo pipefail\n" + body + "\n")
    path.chmod(0o700)


class ServerStateIsolationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="media_server_state_isolation_")
        self.base = Path(self.temp.name).resolve()
        self.project = self.base / "project"
        self.internal = self.project / "scripts/internal"
        self.internal.mkdir(parents=True)
        (self.project / "include").mkdir()
        shutil.copy2(ROOT / "include/stdafx.h", self.project / "include/stdafx.h")
        for name in (
            "env_common.sh",
            "gst_plugin_cache.py",
            "start_server.sh",
            "stop_server.sh",
            "check_server.sh",
            "diagnose_media_server.sh",
            "restart_server.sh",
        ):
            shutil.copy2(INTERNAL / name, self.internal / name)

        video = self.project / "video"
        video.mkdir()
        (video / "sample_h264.mp4").write_bytes(b"fixture")

        self.bin = self.base / "bin"
        self.bin.mkdir()
        self.tool_log = self.base / "tool.log"
        self.fake_pid_file = self.base / "fake.pid"
        self.fake_launch_active_file = self.base / "launch-active"
        self.fake_server = self.base / "fake-media-server"
        executable(
            self.fake_server,
            'echo "$$" > "${FAKE_PID_FILE}"\n'
            'echo "fake-server-started"\n'
            "trap 'exit 0' TERM INT\n"
            "while true; do sleep 0.1; done",
        )
        executable(
            self.bin / "uname",
            'printf "%s\\n" "${FAKE_UNAME:-Linux}"',
        )
        executable(
            self.bin / "id",
            'if [[ "${1:-}" == "-u" ]]; then printf "%s\\n" "${FAKE_ID_UID:-' + str(os.getuid()) + '}"; else exec /usr/bin/id "$@"; fi',
        )
        executable(
            self.bin / "stat",
            'if [[ "${FAKE_STAT_STYLE:-}" == "gnu" ]]; then\n'
            '  if [[ "${1:-}" == "-f" ]]; then echo "?"; exit 0; fi\n'
            '  if [[ "${1:-}" == "-c" ]]; then echo "' + str(os.getuid()) + '"; exit 0; fi\n'
            'fi\n'
            'exec /usr/bin/stat "$@"',
        )
        executable(
            self.bin / "lsof",
            'printf "lsof %s\\n" "$*" >> "${FAKE_TOOL_LOG}"\n'
            'pid="${FAKE_LSOF_ALWAYS_PID:-}"\n'
            'if [[ -z "${pid}" && -n "${FAKE_LAUNCH_ACTIVE_FILE:-}" && -f "${FAKE_LAUNCH_ACTIVE_FILE}" ]]; then pid="${FAKE_LAUNCH_PID}"; fi\n'
            'if [[ -z "${pid}" && -s "${FAKE_PID_FILE}" ]]; then pid="$(cat "${FAKE_PID_FILE}")"; fi\n'
            'if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then printf "p%s\\n" "${pid}"; exit 0; fi\n'
            "exit 1",
        )
        executable(
            self.bin / "curl",
            'printf "%s\\n" \'{"status":"ok"}\'',
        )
        executable(self.bin / "python3", "exit 0")
        executable(
            self.bin / "launchctl",
            'printf "launchctl %s\\n" "$*" >> "${FAKE_TOOL_LOG}"\n'
            'case "${1:-}" in\n'
            '  bootstrap) [[ -n "${FAKE_LAUNCH_ACTIVE_FILE:-}" ]] && : > "${FAKE_LAUNCH_ACTIVE_FILE}"; exit 0;;\n'
            '  bootout) [[ -n "${FAKE_LAUNCH_ACTIVE_FILE:-}" ]] && rm -f "${FAKE_LAUNCH_ACTIVE_FILE}"; exit 0;;\n'
            '  print) [[ -n "${FAKE_EXISTING_LAUNCH_LABEL:-}" && "${2:-}" == *"/${FAKE_EXISTING_LAUNCH_LABEL}" ]] && exit 0; exit 1;;\n'
            '  *) exit 2;;\n'
            'esac',
        )

        self.state = self.base / "state"
        self.state.mkdir()
        self.other_state = self.base / "local-env-state"
        self.other_state.mkdir()
        self.env = {
            "PATH": str(self.bin) + ":/usr/bin:/bin:/usr/sbin:/sbin",
            "HOME": os.environ["HOME"],
            "USER": os.environ.get("USER", "test"),
            "LOGNAME": os.environ.get("LOGNAME", "test"),
            "FAKE_PID_FILE": str(self.fake_pid_file),
            "FAKE_TOOL_LOG": str(self.tool_log),
            "FAKE_UNAME": "Darwin",
            "HOMEBREW_PREFIX": str(self.base / "missing-homebrew"),
            "MEDIA_SERVER_STATE_DIR": str(self.state),
            "MEDIA_SERVER_LAUNCHD_LABEL": "com.dhseo.mediaserver.test.state",
            "MEDIA_SERVER_SKIP_LOCAL_ENV": "1",
            "MEDIA_SERVER_SKIP_BUILD": "1",
            "MEDIA_SERVER_SKIP_ENV_CHECK": "1",
            "MEDIA_SERVER_ENABLE_AI": "0",
            "MEDIA_SERVER_BIN_PATH": str(self.fake_server),
            "MEDIA_SERVER_LISTEN_ADDRESS": "127.0.0.1",
            "MEDIA_SERVER_HTTP_LISTEN_ADDRESS": "127.0.0.1",
            "MEDIA_SERVER_LISTEN_PORT": "19998",
            "MEDIA_SERVER_PORT_CANDIDATES": "19998",
            "MEDIA_SERVER_HTTP_LISTEN_PORT": "19999",
            "MEDIA_SERVER_START_STABILITY_WAIT_S": "0",
            "MEDIA_SERVER_AUTO_DIAGNOSE": "0",
            "MEDIA_SERVER_FFMPEG_FREE": "1",
        }
        (self.project / "scripts/.media_server.env").write_text(
            f"MEDIA_SERVER_STATE_DIR={self.other_state}\n"
            "MEDIA_SERVER_LAUNCHD_LABEL=com.dhseo.mediaserver.user\n"
            "export MEDIA_SERVER_STATE_DIR MEDIA_SERVER_LAUNCHD_LABEL\n"
        )

    def tearDown(self):
        self.stop_fake_process()
        self.temp.cleanup()

    def stop_fake_process(self):
        if self.fake_pid_file.exists():
            try:
                pid = int(self.fake_pid_file.read_text().strip())
                os.kill(pid, signal.SIGTERM)
                for _ in range(30):
                    try:
                        os.kill(pid, 0)
                    except ProcessLookupError:
                        break
                    time.sleep(0.05)
                else:
                    os.kill(pid, signal.SIGKILL)
            except (ProcessLookupError, ValueError):
                pass
            self.fake_pid_file.unlink(missing_ok=True)

    def clear_state_files(self):
        for name in STATE_NAMES:
            candidate = self.state / name
            if candidate.is_symlink() or candidate.exists():
                candidate.unlink()

    def run_script(self, name, *, env=None, timeout=12):
        return subprocess.run(
            ["/bin/bash", str(self.internal / name)],
            cwd=self.project,
            env=env or self.env,
            text=True,
            capture_output=True,
            timeout=timeout,
        )

    def start_nohup(self):
        result = self.run_script("start_server.sh")
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertTrue(self.fake_pid_file.exists())
        return result

    def test_start_rejects_unsafe_state_dirs_before_spawning(self):
        cases = []
        relative_env = {**self.env, "MEDIA_SERVER_STATE_DIR": "relative-state"}
        cases.append((relative_env, "절대경로"))

        real = self.base / "real-state"
        real.mkdir()
        link = self.base / "linked-state"
        link.symlink_to(real, target_is_directory=True)
        cases.append(({**self.env, "MEDIA_SERVER_STATE_DIR": str(link)}, "심볼릭 링크"))

        foreign = self.base / "foreign-state"
        foreign.mkdir()
        cases.append(({
            **self.env,
            "MEDIA_SERVER_STATE_DIR": str(foreign),
            "FAKE_ID_UID": str(os.getuid() + 1),
        }, "현재 사용자 소유"))

        for env, expected in cases:
            with self.subTest(expected=expected):
                self.fake_pid_file.unlink(missing_ok=True)
                result = self.run_script("start_server.sh", env=env)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(expected, result.stderr)
                self.assertFalse(self.fake_pid_file.exists(), "unsafe state에서 binary가 실행됨")
                self.assertFalse(any((self.project / name).exists() for name in STATE_NAMES))

    def test_start_rejects_invalid_launchd_label_before_spawning(self):
        for label in ("bad/label", "bad_label"):
            with self.subTest(label=label):
                result = self.run_script(
                    "start_server.sh",
                    env={**self.env, "MEDIA_SERVER_LAUNCHD_LABEL": label},
                )
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("MEDIA_SERVER_LAUNCHD_LABEL", result.stderr)
                self.assertFalse(self.fake_pid_file.exists())
                self.assertEqual(list(self.state.iterdir()), [])

    def test_start_rejects_each_state_leaf_symlink_before_access(self):
        for index, name in enumerate(STATE_NAMES):
            with self.subTest(name=name):
                self.clear_state_files()
                target = self.base / f"outside-state-{index}"
                target.write_text("sentinel")
                (self.state / name).symlink_to(target)
                try:
                    result = self.run_script("start_server.sh")
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn("state leaf는 심볼릭 링크일 수 없습니다", result.stderr)
                    self.assertEqual(target.read_text(), "sentinel")
                finally:
                    self.stop_fake_process()
                    self.clear_state_files()

    def test_stop_check_and_diagnose_reject_state_leaf_symlink_before_access(self):
        for command in ("stop_server.sh", "check_server.sh", "diagnose_media_server.sh"):
            for index, name in enumerate(STATE_NAMES):
                with self.subTest(command=command, name=name):
                    self.clear_state_files()
                    target = self.base / f"outside-{command}-{index}"
                    target.write_text("sentinel")
                    (self.state / name).symlink_to(target)
                    try:
                        result = self.run_script(command)
                        self.assertNotEqual(result.returncode, 0)
                        self.assertIn("state leaf는 심볼릭 링크일 수 없습니다", result.stderr)
                        self.assertEqual(target.read_text(), "sentinel")
                        self.assertTrue((self.state / name).is_symlink())
                    finally:
                        self.clear_state_files()

    def test_linux_uses_gnu_owner_probe_for_safe_state_dir(self):
        result = self.run_script(
            "start_server.sh",
            env={**self.env, "FAKE_UNAME": "Linux", "FAKE_STAT_STYLE": "gnu"},
        )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertTrue((self.state / ".media_server.pid").exists())

    def test_start_writes_only_explicit_state_namespace(self):
        result = self.start_nohup()
        self.assertIn("mode: detached", result.stdout)
        for name in STATE_NAMES[:-1]:
            self.assertTrue((self.state / name).exists(), name)
        self.assertEqual((self.state / ".media_server.mode").read_text().strip(), "detached")
        self.assertFalse(any((self.project / name).exists() for name in STATE_NAMES))
        self.assertEqual(list(self.other_state.iterdir()), [])

    def test_check_reads_explicit_state_namespace(self):
        self.start_nohup()
        result = self.run_script("check_server.sh")
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn(f"[pid] file exists: {self.state / '.media_server.pid'}", result.stdout)
        self.assertIn("[mode] detached", result.stdout)
        self.assertIn(f"[log] tail {self.state / '.media_server.log'}", result.stdout)

    def test_diagnose_reads_explicit_state_namespace(self):
        self.start_nohup()
        result = self.run_script("diagnose_media_server.sh")
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn(f"Recent log ({self.state / '.media_server.log'})", result.stdout)
        self.assertIn("fake-server-started", result.stdout)

    def test_stop_with_explicit_state_never_uses_legacy_fallbacks(self):
        self.start_nohup()
        self.tool_log.write_text("")
        result = self.run_script("stop_server.sh")
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        calls = self.tool_log.read_text()
        self.assertIn("com.dhseo.mediaserver.test.state", calls)
        self.assertNotIn("com.dhseo.mediaserver.user", calls)
        for forbidden in ("com.dhseo.mediaserver\n", "8554", "8555", "8556", "8080", "8081"):
            self.assertNotIn(forbidden, calls)
        for name in (".media_server.pid", ".media_server.address", ".media_server.port",
                     ".media_server.mode", ".media_server.launchd.plist"):
            self.assertFalse((self.state / name).exists(), name)
        self.assertTrue((self.state / ".media_server.log").exists())
        self.assertEqual(list(self.other_state.iterdir()), [])

    def test_stop_with_explicit_state_never_boots_out_by_plist_path(self):
        (self.state / ".media_server.launchd.plist").write_text(
            "<plist><dict><key>Label</key><string>com.dhseo.mediaserver.user</string></dict></plist>"
        )
        result = self.run_script("stop_server.sh")
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        calls = self.tool_log.read_text()
        self.assertIn("launchctl print gui/" + str(os.getuid()) + "/com.dhseo.mediaserver.test.state", calls)
        self.assertNotIn("launchctl bootout", calls)
        self.assertNotIn("com.dhseo.mediaserver.user", calls)

    def test_stop_does_not_signal_unrelated_pid_without_scoped_listener_match(self):
        unrelated = subprocess.Popen(["/bin/sleep", "30"])
        try:
            (self.state / ".media_server.pid").write_text(str(unrelated.pid))
            (self.state / ".media_server.port").write_text("19998")
            (self.state / ".media_server.address").write_text("127.0.0.1")
            result = self.run_script("stop_server.sh")
            self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
            self.assertIsNone(unrelated.poll(), "listener ownership 없는 PID가 signal됨")
            self.assertFalse((self.state / ".media_server.pid").exists())
            self.assertFalse((self.state / ".media_server.port").exists())
        finally:
            if unrelated.poll() is None:
                unrelated.terminate()
            unrelated.wait(timeout=5)

    def test_launchd_mode_is_not_overwritten_by_detached(self):
        result = self.run_script(
            "start_server.sh",
            env={
                **self.env,
                "FAKE_UNAME": "Darwin",
                "FAKE_LAUNCH_ACTIVE_FILE": str(self.fake_launch_active_file),
                "FAKE_LAUNCH_PID": str(os.getpid()),
                "MEDIA_SERVER_START_MODE": "launchd",
            },
        )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertTrue((self.state / ".media_server.mode").exists())
        self.assertEqual((self.state / ".media_server.mode").read_text().strip(), "launchd")
        self.assertIn("mode: launchd", result.stdout)

    def test_launchd_start_refuses_existing_explicit_label_without_bootout(self):
        label = self.env["MEDIA_SERVER_LAUNCHD_LABEL"]
        result = self.run_script(
            "start_server.sh",
            env={
                **self.env,
                "FAKE_EXISTING_LAUNCH_LABEL": label,
                "MEDIA_SERVER_START_MODE": "launchd",
            },
            timeout=30,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("이미 등록되어 있습니다", result.stdout + result.stderr)
        calls = self.tool_log.read_text()
        self.assertIn(f"launchctl print gui/{os.getuid()}/{label}", calls)
        self.assertNotIn("launchctl bootout", calls)
        self.assertNotIn("launchctl bootstrap", calls)
        self.assertFalse(self.fake_pid_file.exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
