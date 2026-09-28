// 파일 용도: B15 문서 촬영의 소유 임시 이미지·영수증을 해시 보존 후 정리한다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const targets=process.argv.slice(2);
assert(targets.length>0);
const records=[];
for(const root of targets){
  assert(path.dirname(root)==='/private/tmp'&&/^media-server-b15\.[A-Za-z0-9]+$/.test(path.basename(root)));
  const st=fs.lstatSync(root);assert(st.isDirectory()&&!st.isSymbolicLink()&&st.uid===process.getuid()&&(st.mode&0o777)===0o700);
  const files=fs.readdirSync(root).map(name=>{
    assert(/^(capture\.json|(?:ko|en)-(?:ops-rules|ops-users|client-dashboard|client-live)\.png)$/.test(name),'미확인 파일');
    const file=path.join(root,name),s=fs.lstatSync(file);assert(s.isFile()&&!s.isSymbolicLink());
    const b=fs.readFileSync(file);return {file:name,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')};
  });
  records.push({path:'<owned-temp>/'+path.basename(root),kind:'문서 촬영 임시 PNG/기하 영수증',bytes:files.reduce((n,x)=>n+x.bytes,0),files,action:'선택8개와 원출력·실패/기하 기록 보존 후 삭제',removed:false});
  const capture=files.find(x=>x.file==='capture.json');
  if(capture)records.at(-1).capture=JSON.parse(fs.readFileSync(path.join(root,'capture.json')));
}
const output=path.join(import.meta.dirname,'b15-cleanup.json');
fs.writeFileSync(output,JSON.stringify(records,null,2)+'\n',{flag:'wx'});
for(let i=0;i<targets.length;i++){
  fs.rmSync(targets[i],{recursive:true,force:false});
  records[i].removed=!fs.existsSync(targets[i]);assert(records[i].removed);
  fs.writeFileSync(output,JSON.stringify(records,null,2)+'\n');
}
console.log(JSON.stringify(records.map(({path,bytes,removed})=>({path,bytes,removed}))));
