// 파일 용도: 별도 제어 프로세스를 이용한 자원 계측 검사.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn, spawnSync} from 'node:child_process';
import readline from 'node:readline';
const directory = path.dirname(fileURLToPath(import.meta.url));
const start = Date.now();
let passed = 0, failed = 0, child, closed = false, lines;
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 's09-process-metrics-')));
const check = (condition, name) => {
  console.log(`[${condition ? 'pass' : 'fail'}] ${name}`);
  if (!condition) { failed++; throw Error(name); }
  passed++;
};
function compile(source, output) {
  const result = spawnSync(process.env.CXX || 'c++', ['-std=c++17', '-pthread', path.join(directory, source), '-o', output], {encoding:'utf8', timeout:30000});
  if (result.status !== 0) throw Error(`compile failed exit=${result.status}: ${result.stderr}`);
}
function sample(pid) {
  const result = spawnSync(path.join(root, 'metrics'), Array.isArray(pid) ? pid : [String(pid)], {encoding:'utf8', timeout:5000});
  if (result.error) throw result.error;
  return {exit:result.status, value:JSON.parse(result.stdout)};
}
async function line() {
  let timer;
  try { return await Promise.race([lines.next().then(x => x.value), new Promise((_, reject) => { timer=setTimeout(()=>reject(Error('fixture timeout')),5000); })]); }
  finally { clearTimeout(timer); }
}
function bytes(p) {
  const s=fs.lstatSync(p);
  return s.isDirectory() ? fs.readdirSync(p).reduce((n,x)=>n+bytes(path.join(p,x)),0) : s.size;
}
try {
  if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--red')) throw Error('unsupported test argument');
  compile('recording_process_metrics.cpp', path.join(root, 'metrics'));
  compile('recording_process_metrics_fixture.cpp', path.join(root, 'fixture'));
  child=spawn(path.join(root,'fixture'), [], {cwd:root, stdio:['pipe','pipe','inherit']});
  child.on('close',()=>{closed=true;});
  lines=readline.createInterface({input:child.stdout})[Symbol.asyncIterator]();
  if (await line() !== `ready ${child.pid}`) throw Error('fixture startup mismatch');
  const baseline=sample(child.pid);
  check(baseline.exit === 0 && baseline.value.valid === true && baseline.value.pid === child.pid, 'PM01 external child valid');
  console.log(`[sample] baseline ${JSON.stringify(baseline.value)}`);
  if (process.argv[2] !== '--red') {
    check(typeof baseline.value.startIdentity === 'string' && baseline.value.rssBytes > 0 && baseline.value.threadCount > 0 && baseline.value.fdCount >= 3,
      'PM01 complete positive fields');
    child.stdin.write('grow\n');
    if (await line() !== 'grown') throw Error('fixture growth failed');
    const grown=sample(child.pid);
    console.log(`[sample] grown ${JSON.stringify(grown.value)}`);
    check(grown.exit === 0 && grown.value.valid && grown.value.pid === child.pid && grown.value.startIdentity === baseline.value.startIdentity,
      'PM02 same external PID start identity');
    check(grown.value.fdCount === baseline.value.fdCount + 16, 'PM02 exact 16 additional FDs');
    check(grown.value.threadCount === baseline.value.threadCount + 3, 'PM02 exact 3 additional threads');
    check(grown.value.rssBytes > baseline.value.rssBytes + 32 * 1024 * 1024, 'PM02 touched allocation RSS grows');
    child.stdin.write('release\n');
    if (await line() !== 'released') throw Error('fixture release failed');
    const released=sample(child.pid);
    console.log(`[sample] released ${JSON.stringify(released.value)}`);
    check(released.exit === 0 && released.value.startIdentity === baseline.value.startIdentity, 'PM02 released identity preserved');
    check(released.value.fdCount === baseline.value.fdCount, 'PM02 released FDs return baseline');
    check(released.value.threadCount === baseline.value.threadCount, 'PM02 released threads return baseline');
    for (const [label,args] of [['missing',[]],['zero',['0']],['negative',['-1']],['text',['abc']],['partial',['12x']],['range',['2147483648']],['extra',['1','2']]]) {
      const result=sample(args);
      check(result.exit !== 0 && result.value.valid === false && result.value.error === 'invalid-pid' &&
        ['startIdentity','rssBytes','threadCount','fdCount'].every(k=>result.value[k] === null), `PM03 ${label} rejected null`);
    }
    const parser=spawnSync(path.join(root,'fixture'), ['--parsers'], {encoding:'utf8',timeout:5000});
    process.stdout.write(parser.stdout);
    passed += (parser.stdout.match(/^\[pass\]/gm) || []).length;
    if (parser.status !== 0) throw Error('PM04 parser failed');
    child.stdin.end('quit\n');
    const until=Date.now()+5000;
    while (!closed && Date.now()<until) await new Promise(r=>setTimeout(r,20));
    check(closed && child.exitCode === 0, 'PM05 controlled child exited zero');
    const exited=sample(child.pid);
    console.log(`[sample] exited ${JSON.stringify(exited.value)}`);
    check(exited.exit !== 0 && exited.value.valid === false && typeof exited.value.error === 'string' &&
      ['startIdentity','rssBytes','threadCount','fdCount'].every(k=>exited.value[k] === null), 'PM03 exited process null nonzero');
  }
} catch(e) {
  if (!failed) { failed++; console.log(`[fail] ${e.message}`); }
} finally {
  if (child && !closed) {
    child.stdin.end('quit\n');
    const until=Date.now()+5000;
    while (!closed && Date.now()<until) await new Promise(r=>setTimeout(r,20));
    if (!closed) { child.kill('SIGKILL'); const until=Date.now()+2000; while (!closed && Date.now()<until) await new Promise(r=>setTimeout(r,20)); failed++; }
  }
  if (child) console.log(`[cleanup] child=${child.pid} closed=${closed} exit=${child.exitCode}`);
  const size=bytes(root);
  if (!child || closed) {
    fs.rmSync(root,{recursive:true});
    let absent=false; try { fs.lstatSync(root); } catch(e) { absent=e.code==='ENOENT'; }
    if (!absent) failed++;
    console.log(`[cleanup] path=${root} bytes=${size} absent=${absent}`);
  } else { failed++; console.log('[cleanup] root preserved process still alive'); }
  console.log(JSON.stringify({passed,failed,elapsedMs:Date.now()-start,tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'하위작업별자동집계없음'}));
  process.exitCode=failed ? 1 : 0;
}
