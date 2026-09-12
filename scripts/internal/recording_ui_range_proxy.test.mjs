// 파일 용도: RP01~09 고정 loopback 전달·안전 관측·종료를 실제 HTTP 경계에서 검사한다.
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {startRecordingUiRangeProxy,finishRecordingUiProxy} from './recording_ui_range_proxy.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'s09-range-proxy-test-'));
let pass=0,fail=0,index=0;const began=Date.now(),media='/ops/api/recordings/media/test-one';
const rows=p=>fs.readFileSync(p.logPath,'utf8').split('\n').filter(Boolean).map(JSON.parse);
const request=(p,target=media,headers={Range:'bytes=2-5'},method='GET')=>new Promise((resolve,reject)=>{
  const req=http.request({host:'127.0.0.1',port:new URL(p.baseUrl).port,path:target,headers,method,agent:false},res=>{
    const chunks=[];res.on('data',x=>chunks.push(x));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));res.on('error',reject);
  });req.on('error',reject);req.setTimeout(2000,()=>req.destroy(Error('deadline')));req.end();
});
async function fixture(handler,body,options={}){
  const dir=path.join(root,String(++index));fs.mkdirSync(dir);const sockets=new Set(),up=http.createServer(handler);let proxy;
  up.on('connection',s=>{sockets.add(s);s.once('close',()=>sockets.delete(s));});
  try{
    await new Promise((resolve,reject)=>{up.once('error',reject);up.listen(0,'127.0.0.1',resolve);});
    proxy=await startRecordingUiRangeProxy({root:dir,upstreamPort:up.address().port,...options});await body(proxy,up);
  }finally{try{if(proxy)await proxy.close();}finally{for(const s of sockets)s.destroy();await new Promise(resolve=>up.close(resolve));}}
}
const reply=(_req,res)=>{res.writeHead(206,{'Content-Range':'bytes 2-5/8','Accept-Ranges':'bytes'});res.end('cdef');};
async function check(name,fn){try{await fn();pass++;console.log('PASS '+name);}catch(e){fail++;console.log('FAIL '+name+' code='+(['EPERM','EACCES'].includes(e.code)?e.code:'ASSERT_OR_BOUNDARY'));}}
try{
await check('RP01 fixed loopback upstream and origin-form target only',async()=>{
  await assert.rejects(startRecordingUiRangeProxy({root,upstreamPort:0}));let calls=0;
  await fixture((req,res)=>{calls++;assert.match(req.headers.host,/^127\.0\.0\.1:\d+$/);reply(req,res);},async p=>{
    assert.equal((await request(p,'http://127.0.0.1:1/escape')).status,400);assert.equal((await request(p,'//127.0.0.1:1/escape')).status,400);
    assert.equal((await request(p,media,{Host:'external.invalid',Range:'bytes=2-5'})).status,400);
    for(const token of ['host','Origin','keep-alive, HOST'])assert.equal((await request(p,media,{Connection:token})).status,400);
    await request(p);
    for(const head of ['CONNECT external.invalid:80 HTTP/1.1\r\nHost: external.invalid\r\n\r\n','GET / HTTP/1.1\r\nHost: local\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n'])
      await new Promise((resolve,reject)=>{const s=net.connect(Number(new URL(p.baseUrl).port),'127.0.0.1',()=>s.write(head));s.setTimeout(1000,()=>{s.destroy();reject(Error('open socket'));});s.on('close',resolve);s.on('error',reject);});
    assert.equal(calls,1);
  });
});
await check('RP01 same-origin POST preserves proxy Host and external Origin rejection',async()=>{
  const observed=[];
  await fixture((req,res)=>{
    observed.push({host:req.headers.host,origin:req.headers.origin,method:req.method});
    res.writeHead(req.headers.origin===`http://${req.headers.host}`?302:403);res.end();
  },async p=>{
    assert.equal((await request(p,'/login',{Origin:p.baseUrl},'POST')).status,302);
    assert.equal((await request(p,'/login',{Origin:'http://external.invalid'},'POST')).status,403);
    assert.deepEqual(observed,[{host:new URL(p.baseUrl).host,origin:p.baseUrl,method:'POST'},
      {host:new URL(p.baseUrl).host,origin:'http://external.invalid',method:'POST'}]);
    assert.equal(rows(p).length,0);
  });
});
await check('RP02 streaming preserves 206 bytes and Range headers',async()=>{
  let release;
  await fixture((req,res)=>{assert.equal(req.headers.range,'bytes=2-5');res.writeHead(206,{'Content-Range':'bytes 2-5/8'});res.write('cd');release=()=>res.end('ef');},async p=>{
    const result=await new Promise((resolve,reject)=>{const req=http.get(p.baseUrl+media,{headers:{Range:'bytes=2-5'},agent:false},res=>{const chunks=[];res.on('data',x=>{chunks.push(x);if(release){assert.equal(Buffer.concat(chunks).toString(),'cd');const end=release;release=null;end();}});res.on('end',()=>resolve({res,body:Buffer.concat(chunks)}));res.on('error',reject);});req.on('error',reject);req.setTimeout(2000,()=>req.destroy(Error('deadline')));});
    assert.equal(result.body.toString(),'cdef');assert.equal(result.res.statusCode,206);assert.equal(result.res.headers['content-range'],'bytes 2-5/8');
    const r=rows(p);assert.equal(r.length,1);assert.equal(r[0].completed,true);assert.equal(r[0].range,'bytes=2-5');assert.equal(r[0].contentRange,'bytes 2-5/8');assert.equal(r[0].seq,1);assert(r[0].endedAtMs>=r[0].startedAtMs);
  });
});
await check('RP03 cookie forwarded but absent from observation',async()=>{
  const secret='test-only-private-cookie';
  await fixture((req,res)=>{assert.equal(req.headers.cookie,secret);res.setHeader('Set-Cookie',secret);reply(req,res);},async p=>{
    assert.equal((await request(p,media,{Cookie:secret,Range:'bytes=2-5'})).headers['set-cookie'][0],secret);
    assert(!fs.readFileSync(p.logPath,'utf8').includes(secret));assert.deepEqual(Object.keys(rows(p)[0]).sort(),['seq','startedAtMs','endedAtMs','opaqueId','range','status','contentRange','completed'].sort());
  });
});
await check('RP04 nonmedia and invalid metadata never expose payload',async()=>{
  await fixture((_req,res)=>{res.writeHead(206,{'Content-Range':'private-invalid'});res.end('private-body');},async p=>{
    await request(p,'/login?private-query');assert.equal(rows(p).length,0);
    for(const range of ['private-range','bytes=8-2','bytes=9007199254740992-','bytes=-0'])await request(p,media+'?private-query',{Range:range});
    assert(rows(p).every(r=>r.range===null&&r.contentRange===null));assert(!fs.readFileSync(p.logPath,'utf8').includes('private'));
  });
});
await check('RP05 upstream failure records incomplete safely',async()=>{await fixture(reply,async(p,up)=>{await new Promise(resolve=>up.close(resolve));assert.equal((await request(p)).status,502);assert.equal(rows(p)[0].completed,false);});});
await check('RP06 client disconnect closes upstream and records incomplete',async()=>{
  let notify;const ended=new Promise(resolve=>{notify=resolve;});
  await fixture((req,res)=>{req.socket.once('close',notify);res.writeHead(206);res.write('cd');},async p=>{
    await new Promise((resolve,reject)=>{http.get(p.baseUrl+media,{agent:false},res=>res.once('data',()=>{res.destroy();resolve();})).on('error',reject);});
    let timer;try{await Promise.race([ended,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('upstream open')),1000);})]);}finally{clearTimeout(timer);}assert.equal(rows(p)[0].completed,false);
  });
});
await check('RP07 close drains or destroys sockets and releases port',async()=>{
  let notify;const received=new Promise(resolve=>{notify=resolve;});
  await fixture((_req,res)=>{res.writeHead(206);res.write('x');notify();},async p=>{
    const pending=request(p).catch(()=>null);await received;const start=Date.now();await p.close();assert(Date.now()-start<1500);await pending;
    await new Promise((resolve,reject)=>{const s=net.connect(Number(new URL(p.baseUrl).port),'127.0.0.1');s.on('connect',()=>{s.destroy();reject(Error('port live'));});s.on('error',e=>e.code==='ECONNREFUSED'?resolve():reject(Error('unknown port')));});assert.equal(rows(p)[0].completed,false);
  },{closeMs:30});
});
await check('RP08 private log mode0600 bounded failure is latched',async()=>{
  for(const options of [{maxRows:1,maxBytes:1024},{maxBytes:1}]){
    let reached=false;
    try{await fixture(reply,async p=>{assert.equal(fs.statSync(p.logPath).mode&0o777,0o600);await request(p);if(options.maxRows)await request(p);assert(p.failure);assert(p.stats.bytes<=options.maxBytes);assert(rows(p).length<=1);reached=true;},options);}
    catch(e){assert.equal(e.message,'proxy observation limit');assert(reached);continue;}throw Error('limit did not fail');
  }
});
await check('RP09 harness proxy cleanup failure still runs owned server cleanup',async()=>{
  const order=[];let error;
  try{await finishRecordingUiProxy({async close(){order.push('proxy');throw Error('safe failure');}},async()=>{order.push('harness');return {rootAbsent:true};});}catch(e){error=e;}
  assert.deepEqual(order,['proxy','harness']);assert.equal(error?.cleanupReport?.rootAbsent,true);
});
}finally{
  const size=dir=>fs.readdirSync(dir).reduce((sum,name)=>{const file=path.join(dir,name),s=fs.lstatSync(file);return sum+(s.isDirectory()?size(file):s.size);},0);
  const bytes=size(root);fs.rmSync(root,{recursive:true});console.log('[cleanup] '+JSON.stringify({root,bytes,absent:!fs.existsSync(root)}));
}
console.log(JSON.stringify({pass,fail,elapsedMs:Date.now()-began,actualUi:false}));process.exitCode=fail?1:0;
