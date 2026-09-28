// 파일 용도: B15 승인 명령의 실제 종료값과 정제 원출력을 덮어쓰기 없이 보존한다.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {sanitizeTranscript} from './b14-evidence-sanitizer.mjs';
const [id,command,...args]=process.argv.slice(2);
if(!/^[a-z0-9-]+$/.test(id||'')||!command)throw Error('명령과 고유 결과 ID 필요');
const startedAt=new Date().toISOString(),began=performance.now();
const result=spawnSync(command,args,{cwd:process.cwd(),env:process.env,encoding:'utf8',maxBuffer:32*1024*1024});
const policy=JSON.parse(fs.readFileSync('config/public_repo_policy.json','utf8'));
const output=sanitizeTranscript((result.stdout||'')+(result.stderr||''),policy).text;
const receipt={id,command:[command,...args].map(x=>sanitizeTranscript(x,policy).text),startedAt,elapsedMs:performance.now()-began,exit:result.status,signal:result.signal,error:result.error?.code??null,output,token:{start:null,end:null,consumed:null,source:'개별 사용량 계측 미제공'}};
fs.writeFileSync(path.join(import.meta.dirname,id+'.json.gz'),gzipSync(JSON.stringify(receipt,null,2)+'\n'),{flag:'wx'});
console.log(JSON.stringify({id,exit:receipt.exit,elapsedMs:receipt.elapsedMs,output:output.slice(-7000)}));
process.exitCode=result.status??1;
