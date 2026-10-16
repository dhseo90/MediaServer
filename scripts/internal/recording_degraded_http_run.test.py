#!/usr/bin/env python3
"""제품을 시작하지 않는 래퍼 오류 보존 단위 검사. 제품 PASS 근거가 아니다."""
import ast
import json
import pathlib
import signal
import tempfile
import types
import unittest

SOURCE = pathlib.Path(__file__).with_name('recording_degraded_http_run.py')

class Process:
    def __init__(self, code, wait_error=False):
        self.pid = 12345
        self.code = code
        self.stdout = self.stdin = None
        self.wait_error = wait_error
    def poll(self):
        return self.code
    def wait(self, timeout=None):
        if self.wait_error:
            raise OSError('injected cleanup wait failure')
        return self.code

class WrapperOutcomeTest(unittest.TestCase):
    def outcome(self, proc, qualification_error=False, group_remains=False):
        tree = ast.parse(SOURCE.read_text())
        cleanup = next(n.finalbody for n in tree.body if isinstance(n, ast.Try) and n.finalbody)
        code = compile(ast.fix_missing_locations(ast.Module(body=cleanup, type_ignores=[])), str(SOURCE), 'exec')
        def killpg(pid, sig):
            if not group_remains:
                raise ProcessLookupError()
        def qualify(*args):
            if qualification_error:
                raise ValueError('injected postprocessing failure')
            return {'unitOnly': True}
        with tempfile.TemporaryDirectory(prefix='media-server-wrapper-unit-') as tmp:
            record = dict(runnerError='original runner failure', collectionError='original observer failure',
                          qualificationError=None, cleanupError=None, groupAbsent=False, monitorExit=None)
            context = dict(record=record, child=proc, monitor=None,
                           sel=types.SimpleNamespace(close=lambda: None), terminate=lambda *args: None,
                           os=types.SimpleNamespace(killpg=killpg), signal=signal,
                           subprocess=types.SimpleNamespace(TimeoutExpired=TimeoutError),
                           a=types.SimpleNamespace(action='run', mode='parallel'), qualify=qualify,
                           root=pathlib.Path(tmp), repo=SOURCE.parent, time=types.SimpleNamespace(monotonic=lambda: 2), t=1, json=json)
            exec(code, context)
            return json.loads((pathlib.Path(tmp)/'execution.json').read_text())
    def test_product_and_postprocessing_are_distinct(self):
        r=self.outcome(Process(1), qualification_error=True)
        self.assertEqual(r['exit'],1)
        self.assertIn('postprocessing failure',r['qualificationError'])
        self.assertEqual(r['runnerError'],'original runner failure')
        self.assertEqual(r['collectionError'],'original observer failure')
        self.assertTrue(r['groupAbsent'])
    def test_cleanup_failure_still_writes_first_outcomes(self):
        r=self.outcome(Process(None,True), qualification_error=True)
        self.assertIn('cleanup wait failure',r['cleanupError'])
        self.assertIn('postprocessing failure',r['qualificationError'])
        self.assertIsNone(r['exit'])
        self.assertFalse(r['groupAbsent'])
    def test_remaining_group_is_not_cleanup_pass(self):
        r=self.outcome(Process(0),group_remains=True)
        self.assertIn('group remained',r['cleanupError'])
        self.assertFalse(r['groupAbsent'])

if __name__=='__main__':
    unittest.main()
