// 파일 용도: 승인된 검색 UI fixture의 서버 없는 준비·재개방·64MiB admission을 확인한다.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {createUiSeekFixture,uiSeedEnvironment} from '/Users/dhseo/Workspace/mediaServer/scripts/internal/verify_v410_recording_ui_contract.mjs';
const repo='/Users/dhseo/Workspace/mediaServer',root=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'media-server-v410-s06-search-preflight-'));fs.chmodSync(root,0o700);
console.log(JSON.stringify({root,serverStarted:false}));
for(const d of ['recordings','events','input','tmp'])fs.mkdirSync(path.join(root,d));
const media=createUiSeekFixture(root),manifest=path.join(root,'ui-seed-manifest.json');
const run=(command,args)=>{const start=Date.now();const r=spawnSync(command,args,{cwd:repo,env:uiSeedEnvironment(),encoding:'utf8',timeout:120000,maxBuffer:1024*1024});console.log(r.stdout,r.stderr,JSON.stringify({exit:r.status,signal:r.signal,elapsedMs:Date.now()-start}));if(r.status!==0)throw Error('fixture-preflight-failed');};
run('bash',[path.join(repo,'scripts/internal/verify_recording_current_ui_seed.sh'),path.join(root,'recordings'),manifest,String(Math.floor(Date.now()/60000)*60000),media.file,'search']);
fs.writeFileSync(path.join(root,'search-server-stopped'),'offline fixture; no server was started\n',{flag:'wx',mode:0o600});
for(const action of ['restart','add','capacity'])run(path.join(root,'search-fixture-tool'),['--search-mutate',path.join(root,'recordings'),action]);
const info=fs.lstatSync(root);if(info.isSymbolicLink()||info.uid!==process.getuid()||fs.realpathSync(root)!==root)throw Error('cleanup ownership');
fs.rmSync(root,{recursive:true});console.log(JSON.stringify({cleanupAbsent:!fs.existsSync(root),actualUi:false}));
