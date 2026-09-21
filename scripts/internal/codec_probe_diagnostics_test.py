#!/usr/bin/env python3
"""격리 파일/자식 Python만 사용한다. 서버·포트·ffprobe 실행 없음."""
import copy
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("codec_diag", Path(__file__).with_name("codec_probe_diagnostics.py"))
diag = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(diag)


class DiagnosticsTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="media-server-codec-diagnostics-unit.")
        self.root = os.path.realpath(self.tmp.name)
        self.config = {"sources": [{"name": "owned-http", "source_kind": "http", "source": "http://127.0.0.1:40001/input.mp4",
                                    "launcher": {"type": "local_http", "port": 40001, "root": "samples"}}]}

    def tearDown(self):
        self.tmp.cleanup()
        self.assertFalse(os.path.exists(self.root))
        print("[cleanup] " + self._testMethodName.split("_")[1] + " absent=true")

    def run_child(self, code, timeout=2, limit=diag.LIMIT):
        return diag.collect([sys.executable, "-B", "-c", code], timeout, limit)

    def test_CPD01_normal_stdout_exit(self):
        output, code, facts = self.run_child("print('0|h264|video');print('1|aac|audio')")
        self.assertEqual((output, code), (b"0|h264|video\n1|aac|audio\n", 0))
        self.assertEqual(facts["outcome"], "completed")

    def test_CPD02_timeout_124(self):
        output, code, facts = self.run_child("import time;print('0|h264|video',flush=True);time.sleep(2)", timeout=0.15)
        self.assertEqual(code, 124)
        self.assertEqual(output, b"0|h264|video\n")
        self.assertEqual(facts["outcome"], "timeout")

    def test_CPD03_abnormal_exit_preserved(self):
        _, code, facts = self.run_child("import sys;sys.stderr.write('private://secret');sys.exit(7)")
        self.assertEqual(code, 7)
        self.assertNotIn("secret", json.dumps(facts))

    def test_CPD04_fixed_trace_fields(self):
        trace = diag.Trace()
        trace.feed(b"OPTIONS rtsp://private/session RTSP/1.0\r\nRTSP/1.0 200 OK\r\nm=video 0 RTP/AVP 96\nStream #0:0: Video: h264\n")
        facts = trace.finish()
        self.assertEqual(facts["requests"]["OPTIONS"], 1)
        self.assertEqual(facts["response_classes"]["2xx"], 1)
        self.assertEqual(facts["sdp_media_lines"]["video"], 1)
        self.assertEqual(facts["discovered_stream_lines"]["video"], 1)

    def test_CPD05_unregistered_trace_unknown(self):
        trace = diag.Trace();trace.feed(b"unregistered stage reached\n")
        facts = trace.finish()
        self.assertEqual(facts["unknown_lines"], 1)
        self.assertEqual(facts["product_prepare_stage"], "unknown")

    def test_CPD06_malicious_material_not_persisted(self):
        trace = diag.Trace();trace.feed(b"[rtsp @ 0xabcd] DESCRIBE rtsp://user:secret@private/s?token=secret RTSP/1.0\nSession: secret\nAuthorization: secret\n")
        diag.append(self.root, dict(trace.finish(), kind="probe", phase="finish", case=1, route=1))
        text = Path(self.root, "codec-diagnostics.jsonl").read_text()
        for secret in ("secret", "private", "0xabcd", "rtsp://", "Session:"):
            self.assertNotIn(secret, text)

    def test_CPD07_output_cap_preparation_failure(self):
        _, code, facts = self.run_child("import sys;sys.stderr.write('x'*65536)", limit=64)
        self.assertEqual(code, 2)
        self.assertEqual(facts["outcome"], "output-limit")

    def test_CPD08_owned_jsonl(self):
        diag.append(self.root, {"kind": "diagnostic", "phase": "initialized"})
        target = Path(self.root, "codec-diagnostics.jsonl")
        self.assertEqual(target.stat().st_mode & 0o777, 0o600)
        self.assertGreater(json.loads(target.read_text())["monotonic_ns"], 0)

    def test_CPD09_symlink_directory_rejected(self):
        link = Path(self.root, "link");link.symlink_to(self.root)
        with self.assertRaises(ValueError):
            diag.owned_dir(str(link))

    def test_CPD10_directory_mode_uid_rejected(self):
        os.chmod(self.root, 0o755)
        with self.assertRaises(ValueError):
            diag.owned_dir(self.root)
        os.chmod(self.root, 0o700)
        with patch.object(diag.os, "getuid", return_value=os.getuid() + 1), self.assertRaises(ValueError):
            diag.owned_dir(self.root)

    def test_CPD11_file_symlink_mode_rejected(self):
        target = Path(self.root, "codec-diagnostics.jsonl");original = Path(self.root, "original")
        original.write_text("unchanged");target.symlink_to(original)
        with self.assertRaises(OSError):
            diag.append(self.root, {"kind": "diagnostic", "phase": "initialized"})
        self.assertEqual(original.read_text(), "unchanged")
        target.unlink();target.write_text("");target.chmod(0o644)
        with self.assertRaises(ValueError):
            diag.append(self.root, {"kind": "diagnostic", "phase": "initialized"})

    def test_CPD12_fields_ordinals_rejected(self):
        with self.assertRaises(ValueError):
            diag.append(self.root, {"url": "private://secret"})
        with self.assertRaises(ValueError):
            diag.launcher_record("ready", "private://secret", 0, 1, 1, 0, 1, -1)

    def test_CPD13_diagnostic_failure_preserves_original_exit(self):
        self.assertEqual(diag.diagnosed_exit(7, False), 7)
        self.assertEqual(diag.diagnosed_exit(124, False), 124)
        self.assertEqual(diag.diagnosed_exit(0, False), 2)

    def test_CPD14_launcher_wait_distinction(self):
        ready = diag.launcher_record("ready", 1, 10, 1, 1, 0, 2, -1)
        stopped = diag.launcher_record("stop", 1, 10, 1, -1, -1, 0, 143)
        self.assertEqual(ready["readiness_curl_exit"], 0)
        self.assertEqual(stopped["wait_signal_candidate"], 15)
        self.assertFalse(stopped["wait_signal_confirmed"])

    def test_CPD15_partial_ambiguous_trace_unknown(self):
        trace = diag.Trace();trace.feed(b"RTSP/1.0 200 OK\nPLAY rtsp://private")
        facts = trace.finish()
        self.assertTrue(facts["partial_line"])
        self.assertEqual(facts["requests"]["PLAY"], 0)
        self.assertEqual(facts["request_response_correlation"], "unknown")

    def test_CPD16_default_shell_path_unchanged(self):
        shell = Path(__file__).with_name("verify_codec_matrix.sh").read_text()
        body = shell.split("probe_rtsp_url() {", 1)[1].split("verify_rtsp_case()", 1)[0]
        self.assertIn('if [[ -n "${DIAG_DIR}" ]]', body)
        self.assertIn('"-v", "error"', body)
        self.assertIn('timeout=command_timeout_s', body)

    def test_CPD17_provider_only_valid_config(self):
        self.assertEqual(len(diag.provider_config("1", self.root, self.config)), 1)

    def test_CPD18_provider_only_invalid_mode_config(self):
        for mode, root in (("2", self.root), ("1", ""), ("0", self.root)):
            with self.assertRaises(ValueError):
                diag.provider_config(mode, root, self.config)
        for change in ({"source": "http://external:40001/input.mp4"}, {"source_kind": "file"},
                       {"source": "http://user:secret@127.0.0.1:40001/input.mp4"}):
            data = copy.deepcopy(self.config);data["sources"][0].update(change)
            with self.assertRaises(ValueError):
                diag.provider_config("1", self.root, data)

    def test_CPD19_actual_wrapped_responses(self):
        trace = diag.Trace()
        trace.feed(b"[rtsp @ 0x1234] line='RTSP/1.0 200 OK'\nline='RTSP/1.0 404 Not Found'\nline='RTSP/1.0 503 Service Unavailable'\n")
        facts = trace.finish()
        self.assertEqual([facts["response_classes"][key] for key in ("2xx", "4xx", "5xx")], [1, 1, 1])
        self.assertEqual(facts["response_observation"], "observed")

    def test_CPD20_chunk_boundaries_and_truncation(self):
        raw = b"[rtsp @ 0x1234] line='RTSP/1.0 200 OK'\r\n"
        for cut in range(len(raw) + 1):
            trace = diag.Trace();trace.feed(raw[:cut]);trace.feed(raw[cut:])
            self.assertEqual(trace.finish()["response_classes"]["2xx"], 1)
        trace = diag.Trace()
        for value in raw:
            trace.feed(bytes([value]))
        self.assertEqual(trace.finish()["response_classes"]["2xx"], 1)
        trace = diag.Trace();trace.feed(raw[:-3])
        facts = trace.finish()
        self.assertEqual(facts["response_classes"]["2xx"], 0)
        self.assertEqual(facts["response_observation"], "incomplete")

    def test_CPD21_observation_states_distinct(self):
        self.assertEqual(diag.Trace().finish()["response_observation"], "not-observed")
        trace = diag.Trace();trace.feed(b"unregistered harmless log\n")
        self.assertEqual(trace.finish()["response_observation"], "not-observed")
        trace = diag.Trace();trace.feed(b"line='RTSP/1.0 200 OK'\n" + b"x" * 4097 + b"\n")
        self.assertEqual(trace.finish()["response_observation"], "incomplete")

    def test_CPD22_malicious_wrapper_and_redaction(self):
        trace = diag.Trace()
        trace.feed(b"prefix line='RTSP/1.0 200 OK'\nline='RTSP/1.0 200 OK' secret\nline='RTSP/1.0 200 'nested''\nline='RTSP/1.0 40x secret'\n")
        facts = trace.finish()
        self.assertEqual(sum(facts["response_classes"].values()), 0)
        diag.append(self.root, dict(facts, kind="probe", phase="finish", case=1, route=1))
        text = Path(self.root, "codec-diagnostics.jsonl").read_text()
        self.assertNotIn("secret", text)
        self.assertNotIn("nested", text)

    def test_CPD23_compact_stdout_counts_and_preservation(self):
        raw = b"0|h264|video\n1|aac|audio\n2|opus|audio\ninvalid|video\n"
        output, code, facts = self.run_child("import sys;sys.stdout.buffer.write(" + repr(raw) + ")")
        self.assertEqual((output, code), (raw, 0))
        self.assertEqual(facts["stdout_stream_lines"], {"audio": 2, "video": 1})
        self.assertEqual(facts["discovered_stream_lines"], {"audio": 0, "video": 0})

    def test_CPD24_original_exit_and_timeout_contract(self):
        for micros, expected in ((8000000, 18), (10000000, 20), (1, 11), (999000000, 120)):
            output = io.BytesIO()
            with patch.object(diag, "collect", return_value=(b"0|h264|video\n", 7, {})) as collect, \
                    patch.object(diag.sys, "stdout", SimpleNamespace(buffer=output)), patch.object(diag.sys, "stderr", io.StringIO()):
                self.assertEqual(diag.probe(self.root, 1, 1, micros, "rtsp://private"), 7)
            command, deadline = collect.call_args.args
            self.assertEqual(deadline, expected)
            self.assertEqual(command[:-1], ["ffprobe", "-v", "trace", "-rtsp_transport", "tcp", "-rw_timeout", str(micros),
                                           "-show_entries", "stream=index,codec_name,codec_type", "-of", "compact=p=0:nk=1"])
            self.assertEqual(output.getvalue(), b"0|h264|video\n")


if __name__ == "__main__":
    unittest.main(verbosity=2)
