// 파일 용도: A HTTP 검사 산출물을 부모 run 또는 독립 임시 출력에 한정하고 참조 무결성을 확인한다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const within=(root,file)=>file.startsWith(root+path.sep);
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function checkedDirectory(dir){
  assert(path.isAbsolute(dir)&&path.normalize(dir)===dir,'artifact path must be absolute and normalized');
  let current=path.parse(dir).root;
  for(const part of dir.slice(current.length).split(path.sep).filter(Boolean)){
    current=path.join(current,part);const stat=fs.lstatSync(current);
    assert(!stat.isSymbolicLink()&&stat.isDirectory(),'artifact directory symlink/non-directory');
  }
  assert.equal(fs.realpathSync(dir),dir,'artifact path resolution changed');
}
export function createReviewTestArtifacts(repo,env=process.env){
  const supplied=env.MEDIA_SERVER_TEST_ARTIFACT_ROOT!==undefined||env.MEDIA_SERVER_TEST_OUTPUT_DIR!==undefined;
  let allowedRoot,outputDir;
  if(supplied){
    allowedRoot=env.MEDIA_SERVER_TEST_ARTIFACT_ROOT;outputDir=env.MEDIA_SERVER_TEST_OUTPUT_DIR;
    assert(allowedRoot&&outputDir,'both parent artifact root and check output required');
    checkedDirectory(allowedRoot);
    assert(path.isAbsolute(outputDir)&&path.normalize(outputDir)===outputDir&&within(allowedRoot,outputDir),'output outside parent artifact root');
    // 저장소 안에서는 acceptance 소유 root만 허용한다. source/fixture/과거 버전 루트는 출력 대상이 아니다.
    if(allowedRoot===repo||within(repo,allowedRoot))assert(/^docs\/release-artifacts\/v\d+\.\d+\.\d+\/test-acceptance-current-final$/.test(path.relative(repo,allowedRoot)),'repository output requires exact acceptance root');
    assert(!within(outputDir,repo)&&outputDir!==repo,'output cannot contain repository');
    checkedDirectory(path.dirname(outputDir));
    fs.mkdirSync(outputDir,{mode:0o700}); // 기존 실행을 덮지 않는다. EEXIST도 실패다.
  }else{
    allowedRoot=fs.realpathSync(os.tmpdir());outputDir=fs.mkdtempSync(path.join(allowedRoot,'media-server-review-artifacts-'));
    fs.chmodSync(outputDir,0o700);
  }
  const identity=fs.lstatSync(outputDir);assert.equal(identity.uid,process.getuid(),'artifact owner mismatch');
  const owned=new Map();
  const verify=()=>{checkedDirectory(outputDir);const s=fs.lstatSync(outputDir);assert(s.dev===identity.dev&&s.ino===identity.ino&&s.uid===identity.uid,'artifact identity changed');};
  const filePath=name=>{assert(/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(name)&&name!=='.'&&name!=='..','invalid artifact filename');verify();return path.join(outputDir,name);};
  const write=(name,bytes,replace=false)=>{
    const file=filePath(name);let fd;
    if(replace&&owned.has(name)){
      const s=fs.lstatSync(file),old=owned.get(name);assert(!s.isSymbolicLink()&&s.nlink===1&&s.dev===old.dev&&s.ino===old.ino,'artifact file identity changed');
      fd=fs.openSync(file,fs.constants.O_WRONLY|fs.constants.O_NOFOLLOW);
      const actual=fs.fstatSync(fd);if(actual.dev!==s.dev||actual.ino!==s.ino){fs.closeSync(fd);throw Error('artifact replaced during open');}
    }else fd=fs.openSync(file,'wx',0o600);
    try{fs.ftruncateSync(fd,0);fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);owned.set(name,fs.fstatSync(fd));}finally{fs.closeSync(fd);}
    return {file:name,bytes:Buffer.byteLength(bytes),sha256:digest(bytes)};
  };
  // 쓰기 준비 실패는 서버/브라우저 생성보다 앞서 발생한다. 고정 버전 폴더로 우회하지 않는다.
  write('started.json',JSON.stringify({status:'RUNNING',startedAt:new Date().toISOString(),allowedRoot,outputDir})+'\n');
  console.log('[artifacts] '+outputDir);
  return {allowedRoot,outputDir,
    checkpoint:report=>write('report.json',JSON.stringify({...report,artifactRoot:outputDir},null,2)+'\n',true),
    screenshot:async(surface,name,metadata={})=>{
      filePath(name);assert(!fs.existsSync(path.join(outputDir,name)),'screenshot collision');
      const bytes=await surface.screenshot();
      assert(bytes.length>=24&&bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),'screenshot must be PNG');
      return {...metadata,...write(name,bytes),pixelWidth:bytes.readUInt32BE(16),pixelHeight:bytes.readUInt32BE(20)};
    }};
}

// 부모는 전달값 소실에 따른 독립 tmp fallback도 성공으로 수용하지 않는다.
export function verifyReviewTestArtifacts(outputDir){
  checkedDirectory(outputDir);
  const report=JSON.parse(fs.readFileSync(path.join(outputDir,'report.json'),'utf8'));
  assert.equal(report.artifactRoot,outputDir,'child output binding lost');
  assert(report.status==='PASS'&&report.exit===0&&report.cleanup?.rootAbsent===true,'child failed or cleanup incomplete');
  for(const item of report.browser?.screenshots||[]){
    assert(typeof item.file==='string'&&path.basename(item.file)===item.file,'invalid screenshot reference');
    const file=path.join(outputDir,item.file),stat=fs.lstatSync(file);assert(stat.isFile()&&!stat.isSymbolicLink(),'invalid screenshot file');
    const bytes=fs.readFileSync(file);assert(bytes.length===item.bytes&&digest(bytes)===item.sha256,'screenshot bytes/hash mismatch');
    assert(bytes.readUInt32BE(16)===item.pixelWidth&&bytes.readUInt32BE(20)===item.pixelHeight,'screenshot dimensions mismatch');
  }
  return {outputDir,reportSha256:digest(fs.readFileSync(path.join(outputDir,'report.json'))),screenshots:report.browser?.screenshots?.length||0};
}
