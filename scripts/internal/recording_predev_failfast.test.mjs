// 파일 용도: 실제 predev main의 integrated argv와 실패 전파를 서버 없이 검증한다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 's09-predev-failfast-'));
const started = Date.now();
let passed = 0, failed = 0;
const owned = new Set([root]);
function check(label, value) {
  console.log(`[${value ? 'pass' : 'fail'}] ${label}`);
  value ? passed++ : failed++;
}
function bytes(p) {
  const s = fs.lstatSync(p);
  return s.isDirectory() ? fs.readdirSync(p).reduce((n, f) => n + bytes(path.join(p, f)), 0) : s.size;
}
function ownWork(p, pid) {
  if (!new RegExp(`^/tmp/media_server_predev-[0-9]+-${pid}$`).test(p) ||
      fs.realpathSync(p) !== path.join(fs.realpathSync('/tmp'), path.basename(p)) ||
      !fs.lstatSync(p).isDirectory() || fs.lstatSync(p).isSymbolicLink()) {
    throw new Error('unsafe-owned-work-path');
  }
  owned.add(p);
}
function execute(label, args, inject, report = null) {
  const dir = path.join(root, label);
  fs.mkdirSync(path.join(dir, 'scripts/internal'), { recursive: true });
  const source = fs.readFileSync(path.join(repo, 'scripts/internal/verify_predev_stability.sh'), 'utf8');
  if ((source.match(/^main "\$@"$/gm) || []).length !== 1 || !/\nmain "\$@"\s*$/.test(source)) {
    throw new Error('entry-boundary-not-exact');
  }
  const hooks = `
${report?.environment ? environmentFixture(dir) : ''}
printf '%s\\n' "$WORK_DIR" >"$ROOT_DIR/work-path"
require_cmd() { :; }
detect_rule_ui_chrome_path() { :; }
is_codex_in_app_browser_environment() { return 0; }
start_server() { SERVER_PID=$$; }
stop_server() { printf 'cleanup\\n' >>"$ROOT_DIR/lifecycle"; SERVER_PID=''; }
assert_ports_clean() { printf 'ports-clean-boundary\\n' >>"$ROOT_DIR/lifecycle"; }
run_external_turn_gate() { :; }
run_soak_loop() { printf 'soak\\n' >>"$ROOT_DIR/lifecycle"; }
assert_runtime_idle() { :; }
${report ? '' : 'refresh_summary_report() { :; }'}
`;
  // 제품 함수 본문은 변경하지 않고 main 직전 느린 외부 경계만 대체한다.
  const script = inject ? source.replace(/\nmain "\$@"\s*$/, () => `${hooks}\nmain "$@"\n`) : source;
  fs.writeFileSync(path.join(dir, 'scripts/internal/verify_predev_stability.sh'), script);
  fs.writeFileSync(path.join(dir, 'server.sh'), `#!/usr/bin/env bash
set -eu
if [[ "$1" == test ]]; then
  printf '%s\\n' "$@" > received-argv
  printf 'first-failed\\n' > child-cases
  for arg in "$@"; do [[ "$arg" != --fail-fast ]] || exit 23; done
  printf 'later-case\\n' >> child-cases
  exit 23
fi
[[ "$1" == summarize-reports ]]
`, { mode: 0o700 });
  const special = report?.special ? ` space ' " $(touch injected)` : '';
  const summary = path.join(dir, report?.glob ? 'summary[x]*?.json' : `summary${special}.json`);
  const expectedInput = report?.glob ? path.join(dir, 'summary[[]x][*][?].json') : summary;
  const reportFile = path.join(dir, `report${special}.md`);
  const htmlFile = path.join(dir, `report${special}.html`);
  if (report) {
    fs.writeFileSync(path.join(dir, 'report-config.json'), JSON.stringify({ summary, expectedInput, reportFile, htmlFile, failCall: report.failCall ?? 0,
      summarizer: path.join(repo, 'scripts/internal/summarize_verification_reports.py') }));
    fs.writeFileSync(path.join(dir, 'unrelated-summary.json'), JSON.stringify({ kind: 'UNRELATED_SCOPE_SENTINEL', status: 'pass', pass: 987654 }));
    fs.writeFileSync(path.join(dir, 'summaryxdecoyz.json'), JSON.stringify({ kind: 'UNRELATED_SCOPE_SENTINEL', status: 'pass', pass: 987654 }));
    fs.writeFileSync(path.join(dir, 'report-boundary.py'), `import json, pathlib, subprocess, sys
root = pathlib.Path(__file__).parent
cfg = json.loads((root / 'report-config.json').read_text())
args = sys.argv[1:]
if args[0] in ('test', 'verify-event-post'):
    sys.exit(0)
if args[0] != 'summarize-reports':
    sys.exit(41)
log = root / 'report-argv.jsonl'
index = len(log.read_text().splitlines()) + 1 if log.exists() else 1
with log.open('a') as f:
    f.write(json.dumps(args) + '\\n')
expected = ['summarize-reports', cfg['expectedInput'], '--output', cfg['reportFile'], '--html-output', cfg['htmlFile']]
unescaped = ['summarize-reports', cfg['summary'], '--output', cfg['reportFile'], '--html-output', cfg['htmlFile']]
if args != expected and args != unescaped:
    sys.exit(42)
if index == cfg['failCall']:
    sys.exit(43)
sys.exit(subprocess.run(['python3', cfg['summarizer'], *args[1:]], check=False).returncode)
`);
    fs.writeFileSync(path.join(dir, 'server.sh'), '#!/usr/bin/env bash\n' + (report.environment ? 'scope-sentinel "$1" || exit 47\n' : '') + 'exec python3 "$(dirname "$0")/report-boundary.py" "$@"\n', { mode: 0o700 });
  }
  const result = spawnSync('bash', [path.join(dir, 'scripts/internal/verify_predev_stability.sh'), ...args,
    '--summary-file', summary, '--report-file', reportFile,
    '--report-html-file', htmlFile], {
    cwd: dir, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: os.tmpdir(),
      MEDIA_SERVER_VERIFY_PREDEV_HEARTBEAT_INTERVAL_S: '0' },
  });
  const data = fs.existsSync(summary) ? JSON.parse(fs.readFileSync(summary, 'utf8')) : null;
  if (data?.workDir) ownWork(data.workDir, result.pid);
  if (fs.existsSync(path.join(dir, 'work-path'))) ownWork(fs.readFileSync(path.join(dir, 'work-path'), 'utf8').trim(), result.pid);
  if (result.error) {
    console.log(`[diagnostic] ${JSON.stringify({ code: result.error.code, stdout: result.stdout?.slice(-4096), stderr: result.stderr?.slice(-4096) })}`);
    throw new Error('bounded-child-execution-failed');
  }
  return { result, data, summary, expectedInput, reportFile, htmlFile,
    read: name => fs.existsSync(path.join(dir, name)) ? fs.readFileSync(path.join(dir, name), 'utf8') : '' };
}
function executeTestAll(config) {
  const dir = path.join(root, config.label);
  fs.mkdirSync(path.join(dir, 'scripts/internal'), { recursive: true });
  const source = fs.readFileSync(path.join(repo, 'scripts/internal/test_all.sh'), 'utf8');
  if ((source.match(/^print_header$/gm) || []).length !== 1) throw new Error('test-all-entry-not-exact');
  const basename = config.special ? `logs[x]*? space ' " $(touch injected)` : 'logs';
  const logDir = path.join(dir, basename);
  const input = path.join(logDir, 'test-summary.json');
  const escaped = path.join(dir, config.special ? `logs[[]x][*][?] space ' " $(touch injected)` : 'logs', 'test-summary.json');
  const hooks = `
${config.environment ? environmentFixture(dir) : ''}
LOG_DIR=$(python3 -c 'import json; print(json.load(open("config.json"))["logDir"])')
mkdir -p "$LOG_DIR"
eval "$(declare -f run_step | sed '1s/run_step/real_run_step/')"
run_step() {
  printf '%s\\n' "$1" >>"$ROOT_DIR/steps-seen"
  if [[ "$1" == report-summary ]]; then real_run_step "$@"; return $?; fi
  if [[ "$1" == static-scripts && '${config.firstFail ? 'yes' : 'no'}' == yes ]]; then
    real_run_step "$1" "$2" "$3" false
  else real_run_step "$1" "$2" "$3" ${config.environment ? '"scope-sentinel testall"' : ':'}; fi
}
trap 'printf "cleanup\\n" >>"$ROOT_DIR/lifecycle"' EXIT
`;
  fs.writeFileSync(path.join(dir, 'scripts/internal/test_all.sh'), source.replace(/^print_header$/m, () => `${hooks}\nprint_header`));
  fs.writeFileSync(path.join(dir, 'scripts/internal/env_common.sh'), 'media_server_apply_homebrew_gst_env() { :; }\n');
  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ logDir, input, escaped, fail: !!config.reportFail,
    summarizer: path.join(repo, 'scripts/internal/summarize_verification_reports.py') }));
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(path.join(logDir, 'unrelated-summary.json'), JSON.stringify({ kind: 'UNRELATED_SCOPE_SENTINEL', pass: 987654 }));
  fs.writeFileSync(path.join(dir, 'server.sh'), '#!/usr/bin/env bash\nexec python3 "$(dirname "$0")/boundary.py" "$@"\n', { mode: 0o700 });
  fs.writeFileSync(path.join(dir, 'boundary.py'), `import json, pathlib, subprocess, sys
root = pathlib.Path(__file__).parent
cfg = json.loads((root / 'config.json').read_text())
args = sys.argv[1:]
(root / 'argv.json').write_text(json.dumps(args))
expected = ['summarize-reports', cfg['escaped'], '--output', cfg['logDir'] + '/verification_report.md', '--html-output', cfg['logDir'] + '/verification_report.html']
if args != expected: sys.exit(42)
(root / 'partial.json').write_text(pathlib.Path(cfg['input']).read_text())
print('REPORT_BOUNDARY_REACHED')
if cfg['fail']: sys.exit(43)
sys.exit(subprocess.run(['python3', cfg['summarizer'], *args[1:]], check=False).returncode)
`);
  const result = spawnSync('bash', [path.join(dir, 'scripts/internal/test_all.sh'), '--no-start', '--skip-codecs', '--skip-va', '--fail-fast'], {
    cwd: dir, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, MEDIA_SERVER_SKIP_LOCAL_ENV: '1' },
  });
  if (result.error) throw new Error(`test-all-child-${result.error.code}`);
  const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const partial = read(path.join(dir, 'partial.json'));
  const final = read(input);
  const args = read(path.join(dir, 'argv.json'));
  const parse = value => { try { return value ? JSON.parse(value) : null; } catch { return null; } };
  const renderedFinal = spawnSync('python3', [path.join(repo, 'scripts/internal/summarize_verification_reports.py'), escaped],
    { encoding: 'utf8', timeout: 5000, maxBuffer: 1024 * 1024 });
  if (renderedFinal.status !== 0) throw new Error('final-render-execution-failed');
  return { result, logDir, partial: parse(partial), final: parse(final), renderedFinal: renderedFinal.stdout,
    args: args ? JSON.parse(args) : null,
    expected: ['summarize-reports', escaped, '--output', path.join(logDir, 'verification_report.md'), '--html-output', path.join(logDir, 'verification_report.html')],
    report: read(path.join(logDir, 'verification_report.md')), seen: read(path.join(dir, 'steps-seen')),
    cleanup: read(path.join(dir, 'lifecycle')), injected: fs.existsSync(path.join(dir, 'injected')),
    sentinel: read(path.join(dir, 'sentinel-used')), bashEnv: read(path.join(dir, 'bash-env-used')),
    usedPaths: read(path.join(dir, 'path-used')), expectedPath: read(path.join(dir, 'path-expected')) };
}
function environmentFixture(dir) {
  const bin = path.join(dir, 'sentinel-bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'scope-sentinel'), '#!/bin/sh\nprintf "%s\\n" "$1" >>"' + dir + '/sentinel-used"\nprintf "%s\\n" "$PATH" >>"' + dir + '/path-used"\n', {mode: 0o700});
  fs.writeFileSync(path.join(dir, 'bash-env'), 'printf "unexpected\\n" >>"' + dir + '/bash-env-used"\n');
  return 'export PATH="' + bin + ':$PATH"\nprintf "%s\\n" "$PATH" >"' + dir + '/path-expected"\nexport BASH_ENV="' + dir + '/bash-env"';
}
function renderedMetrics(report) {
  const row = report.split('\n').find(line => line.startsWith('| ') && line.includes('.json |'));
  return row ? row.split(' | ').slice(2, 6) : null;
}
try {
  const envPredev = execute('environment-predev', ['--skip-build', '--soak-minutes', '0', '--fail-fast'], true, {environment: true});
  check('PE01 predev integrated PATH sentinel', envPredev.read('sentinel-used').split('\n').includes('test'));
  check('PE01 predev initial and refresh PATH sentinel', envPredev.read('sentinel-used').split('\n').filter(x => x === 'summarize-reports').length === 2);
  check('PE03 predev BASH_ENV never executed', envPredev.read('bash-env-used') === '');
  const predevPaths = envPredev.read('path-used').trimEnd().split('\n');
  check('PE05 predev integrated initial refresh exact PATH', predevPaths.length >= 3 && predevPaths.every(x => x === envPredev.read('path-expected').trimEnd()));
  const envTestAll = executeTestAll({label: 'environment-testall', environment: true});
  check('PE02 testall PATH sentinel', envTestAll.sentinel.split('\n').filter(x => x === 'testall').length === 7);
  check('PE03 testall BASH_ENV never executed', envTestAll.bashEnv === '');
  check('PE05 testall exact PATH', envTestAll.usedPaths.trimEnd().split('\n').length === 7 && envTestAll.usedPaths.trimEnd().split('\n').every(x => x === envTestAll.expectedPath.trimEnd()));
  for (const fast of [false, true]) {
    const label = fast ? 'explicit' : 'default';
    const run = execute(label, ['--skip-build', '--soak-minutes', '0', ...(fast ? ['--fail-fast'] : [])], true);
    const argv = run.read('received-argv').trim().split('\n');
    check(`${label} integrated argv ${fast ? 'contains' : 'omits'} --fail-fast`, argv.includes('--fail-fast') === fast);
    for (const arg of ['test', '--no-start', '--skip-external', '--include-rules', '--include-va-events', '--include-image-analysis', '--include-redaction']) {
      check(`${label} preserves ${arg}`, argv.includes(arg));
    }
    check(`${label} child failure exits nonzero`, run.result.status === 1 && run.data?.status === 'fail');
    check(`${label} child later-case ${fast ? 'blocked' : 'retained'}`, run.read('child-cases').includes('later-case') === !fast);
    check(`${label} subsequent soak ${fast ? 'blocked' : 'retained'}`, run.read('lifecycle').includes('soak') === !fast);
    check(`${label} cleanup invoked`, run.read('lifecycle').includes('cleanup'));
    if (fast) check('explicit queue case not-run', run.data?.steps.some(s => s.name === 'event-post-queue' && s.result === 'not-run'));
  }
  for (const fast of [true, false]) {
    const run = execute(`legacy-${fast}`, [fast ? '--fixture-first-fail' : '--fixture-cumulative-fail'], false);
    check(`existing ${fast ? 'first-fail' : 'cumulative'} fixture exit1`, run.result.status === 1 && run.data?.fail === 1);
    check(`existing ${fast ? 'first-fail' : 'cumulative'} third case`, run.data?.steps.find(s => s.name === 'fixture-third')?.result === (fast ? 'not-run' : 'pass'));
  }
  for (const config of [{ label: 'report-normal' }, { label: 'report-special', special: true }, { label: 'report-glob', glob: true },
    { label: 'report-initial-failure', failCall: 1 }, { label: 'report-refresh-failure', failCall: 2 }]) {
    const run = execute(config.label, ['--skip-build', '--soak-minutes', '0', '--fail-fast'], true, config);
    const calls = run.read('report-argv.jsonl').trim().split('\n').filter(Boolean).map(x => JSON.parse(x));
    const expected = ['summarize-reports', run.expectedInput, '--output', run.reportFile, '--html-output', run.htmlFile];
    for (const [index, phase] of ['initial', 'refresh'].entries()) {
      check(`${config.label} ${phase} exact current-summary argv`, JSON.stringify(calls[index]) === JSON.stringify(expected));
    }
    check(`${config.label} command substitution not executed`, !fs.existsSync(path.join(path.dirname(run.summary), 'injected')));
    check(`${config.label} exit follows report result`, run.result.status === (config.failCall ? 1 : 0));
    if (config.failCall) {
      const step = config.failCall === 1 ? 'summary-report' : 'summary-report-refresh';
      check(`${config.label} exact failed step recorded`, run.data?.steps.some(s => s.name === step && s.result === 'fail'));
    } else {
      const rendered = fs.existsSync(run.reportFile) ? fs.readFileSync(run.reportFile, 'utf8') : '';
      const html = fs.existsSync(run.htmlFile) ? fs.readFileSync(run.htmlFile, 'utf8') : '';
      check(`${config.label} actual Python report contains current source`, rendered.includes(path.basename(run.summary)) && html.length > 0);
      check(`${config.label} unrelated fixture excluded`, rendered.length > 0 && !rendered.includes('UNRELATED_SCOPE_SENTINEL') && !rendered.includes('unrelated-summary.json') && !rendered.includes('summaryxdecoyz.json') && !rendered.includes('987654'));
    }
    check(`${config.label} cleanup invoked`, run.read('lifecycle').includes('cleanup'));
  }
  for (const config of [{ label: 'internal-normal' }, { label: 'internal-special', special: true },
    { label: 'internal-report-failure', reportFail: true }, { label: 'internal-first-failure', firstFail: true }]) {
    const run = executeTestAll(config);
    if (!config.firstFail) {
      check(`${config.label} exact current summary argv`, JSON.stringify(run.args) === JSON.stringify(run.expected));
      check(`${config.label} partial counters before report`, run.partial?.passCount === 5 && run.partial?.failCount === 0);
    } else check(`${config.label} report not reached`, run.args === null && !run.seen.includes('report-summary'));
    const wantPass = config.firstFail ? 0 : config.reportFail ? 5 : 8;
    const wantFail = config.firstFail || config.reportFail ? 1 : 0;
    check(`${config.label} final counters`, run.final?.passCount === wantPass && run.final?.failCount === wantFail);
    check(`${config.label} exit status`, run.result.status === (wantFail ? 1 : 0));
    check(`${config.label} final schema and logDir`, run.final?.schema === 'media-server.test-summary.v1' && run.final?.logDir === run.logDir);
    check(`${config.label} elapsed consistency`, Number.isInteger(run.final?.elapsedSeconds) && run.final.elapsedMinutes === Number((run.final.elapsedSeconds / 60).toFixed(1)));
    check(`${config.label} one final conclusion only`, (run.result.stdout.match(/\[결론\]/g) || []).length === 1);
    check(`${config.label} command substitution not executed`, !run.injected);
    if (!wantFail) {
      check(`${config.label} current report rendered`, run.report.includes('test-summary.json'));
      check(`${config.label} unrelated excluded`, run.report.length > 0 && !run.report.includes('UNRELATED_SCOPE_SENTINEL') && !run.report.includes('unrelated-summary.json') && !run.report.includes('987654'));
      check(`${config.label} rendered partial counts and status`, JSON.stringify(renderedMetrics(run.report)) === JSON.stringify(['pass', '5', '0', '0']));
    } else check(`${config.label} later status not executed`, !run.seen.includes('\nstatus\n'));
    check(`${config.label} rendered final counts and status`, JSON.stringify(renderedMetrics(run.renderedFinal)) === JSON.stringify([wantFail ? 'fail' : 'pass', String(wantPass), String(wantFail), String(wantFail ? 0 : 14)]));
    check(`${config.label} cleanup invoked`, run.cleanup.includes('cleanup'));
  }
  for (const [name, payload, expected] of [
    ['generic', { pass: 3, fail: 0, skip: 2 }, ['pass', '3', '0', '2']],
    ['event', { kind: 'event-post', status: 'pass', pass: 4, fail: 0, skip: 1 }, ['pass', '4', '0', '1']],
    ['predev', { status: 'fail', pass: 2, fail: 1, skip: 3, steps: [] }, ['fail', '2', '1', '3']],
    ['generic-info', { observation: 1 }, ['info', '1', '0', '0']],
    ['unknown-schema', { schema: 'media-server.test-summary.v2', passCount: 8, failCount: 2, skipCount: 3 }, ['info', '1', '0', '0']],
    ['generic-failure', { pass: 2, fail: 1, skip: 0 }, ['fail', '2', '1', '0']],
    ['event-failure', { kind: 'event-post', status: 'fail', pass: 1, fail: 2, skip: 3 }, ['fail', '1', '2', '3']],
    ['predev-pass', { status: 'pass', pass: 7, fail: 0, skip: 1, steps: [] }, ['pass', '7', '0', '1']],
    ['test-valid', { schema: 'media-server.test-summary.v1', passCount: 5, failCount: 0, skipCount: 2 }, ['pass', '5', '0', '2']],
    ['test-failure', { schema: 'media-server.test-summary.v1', passCount: 0, failCount: 1, skipCount: 0 }, ['fail', '0', '1', '0']],
    ['test-missing', { schema: 'media-server.test-summary.v1', passCount: 5, skipCount: 0 }, ['fail', '-', '-', '-']],
    ['test-string', { schema: 'media-server.test-summary.v1', passCount: '5', failCount: 0, skipCount: 0 }, ['fail', '-', '-', '-']],
    ['test-boolean', { schema: 'media-server.test-summary.v1', passCount: 5, failCount: false, skipCount: 0 }, ['fail', '-', '-', '-']],
    ['test-negative', { schema: 'media-server.test-summary.v1', passCount: 5, failCount: 0, skipCount: -1 }, ['fail', '-', '-', '-']],
  ]) {
    const file = path.join(root, `${name}.json`);
    fs.writeFileSync(file, JSON.stringify(payload));
    const run = spawnSync('python3', [path.join(repo, 'scripts/internal/summarize_verification_reports.py'), file], { encoding: 'utf8', timeout: 5000, maxBuffer: 1024 * 1024 });
    check(`renderer existing ${name} unchanged`, run.status === 0 && JSON.stringify(renderedMetrics(run.stdout)) === JSON.stringify(expected));
  }
} catch (error) {
  console.log(`[diagnostic] ${JSON.stringify({ name: error.name, code: error.code ?? null, message: String(error.message).slice(0, 256) })}`);
  check('runner setup/execution completed without unexpected exception', false);
} finally {
  for (const p of owned) {
    const size = bytes(p);
    fs.rmSync(p, { recursive: true });
    let absent = false;
    try { fs.lstatSync(p); } catch (error) { absent = error.code === 'ENOENT'; }
    console.log(`[cleanup] ${JSON.stringify({ path: p, bytes: size, absent })}`);
    check('owned temporary path absent', absent);
  }
  console.log(`[summary] ${JSON.stringify({ passed, failed, elapsedMs: Date.now() - started, actualServer: false })}`);
  process.exitCode = failed ? 1 : 0;
}
