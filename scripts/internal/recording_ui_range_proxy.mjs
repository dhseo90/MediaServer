// 파일 용도: 녹화 UI의 실제 Range 요청을 고정 loopback upstream에서 관찰하는 테스트 전용 proxy.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const cleanHeaders = headers => {
  const result={...headers};
  for(const name of String(headers.connection||'').split(',')) delete result[name.trim().toLowerCase()];
  for(const name of ['connection','keep-alive','proxy-authenticate','proxy-authorization','te','trailer','transfer-encoding','upgrade'])delete result[name];
  return result;
};
const safeRange = value => {
  const match=typeof value==='string'&&/^bytes=(\d{0,16})-(\d{0,16})$/.exec(value);
  if(!match||(!match[1]&&!match[2]))return null;
  const first=Number(match[1]),last=Number(match[2]);
  return Number.isSafeInteger(first)&&Number.isSafeInteger(last)&&(!match[1]?last>0:(!match[2]||last>=first))?value:null;
};
const safeContentRange = value => {
  const match=typeof value==='string'&&/^bytes (\d{1,16})-(\d{1,16})\/(\d{1,16})$/.exec(value);
  if(!match)return null;
  const [first,last,total]=match.slice(1).map(Number);
  return [first,last,total].every(Number.isSafeInteger)&&first<=last&&last<total?value:null;
};

export async function finishRecordingUiProxy(proxy, cleanup) {
  let proxyError, result;
  try { if(proxy)await proxy.close(); } catch(error) {proxyError=error;}
  try { result=await cleanup(); } catch(error) {
    if(proxyError) {const combined=new AggregateError([proxyError,error],'proxy and harness cleanup failed');combined.cleanupReport=error.cleanupReport;throw combined;}
    throw error;
  }
  if(proxyError) {proxyError.cleanupReport=result;throw proxyError;}
  return result;
}

export async function startRecordingUiRangeProxy({root, upstreamPort,maxBytes=4*1024*1024,maxRows=4096,closeMs=2000}) {
  assert(Number.isInteger(upstreamPort) && upstreamPort > 0 && upstreamPort < 65536, 'invalid upstream port');
  assert(fs.lstatSync(root).isDirectory()&&!fs.lstatSync(root).isSymbolicLink(),'invalid proxy root');
  for(const [value,limit] of [[maxBytes,4*1024*1024],[maxRows,4096],[closeMs,2000]])assert(Number.isInteger(value)&&value>0&&value<=limit,'invalid proxy bound');
  const logPath = path.join(fs.realpathSync(root), 'range-observation.jsonl');
  const fd = fs.openSync(logPath, 'wx', 0o600);
  const sockets = new Set(), active = new Set();
  let failure=null,bytes=0,rows=0,seq=0,closing=false,closePromise;
  const latch=code=>{failure ||= new Error(code);};
  const append=record=>{
    if(failure)return;
    const line=JSON.stringify(record)+'\n';
    if(rows>=maxRows||bytes+Buffer.byteLength(line)>maxBytes){latch('proxy observation limit');return;}
    try{fs.writeSync(fd,line);bytes+=Buffer.byteLength(line);rows++;}catch{latch('proxy observation write failed');}
  };
  const track=socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));};
  const server = http.createServer((req,res) => {
    if(closing||failure){res.writeHead(503).end();return;}
    if(req.headers.host!==`127.0.0.1:${server.address()?.port}`){res.writeHead(400).end();return;}
    if(String(req.headers.connection||'').split(',').some(name=>['host','origin'].includes(name.trim().toLowerCase()))){res.writeHead(400).end();return;}
    if(typeof req.url!=='string'||!req.url.startsWith('/')||req.url.startsWith('//')||req.url.includes('\\')||req.url.includes('#')){res.writeHead(400).end();return;}
    const pathname=req.url.split('?')[0];
    const media=req.method==='GET'&&/^\/ops\/api\/recordings\/media\/([A-Za-z0-9._:-]{1,128})$/.exec(pathname);
    const observation=media?{seq:++seq,startedAtMs:Date.now(),opaqueId:media[1],range:safeRange(req.headers.range),status:null,contentRange:null,completed:false}:null;
    let terminal=false,upResponse;
    const finish=completed=>{if(terminal)return;terminal=true;active.delete(finish);if(observation)append({...observation,endedAtMs:Date.now(),completed});};
    active.add(finish);
    const headers=cleanHeaders(req.headers);
    const upstream = http.request({hostname:'127.0.0.1',port:upstreamPort,path:req.url,method:req.method,headers,agent:false}, response => {
      upResponse=response;
      if(observation){observation.status=response.statusCode;observation.contentRange=safeContentRange(response.headers['content-range']);}
      res.writeHead(response.statusCode,cleanHeaders(response.headers));
      response.on('error',()=>{finish(false);res.destroy();});
      response.on('aborted',()=>{finish(false);res.destroy();});
      response.pipe(res);
    });
    upstream.on('socket',track);
    upstream.on('error',()=>{if(observation&&observation.status===null)observation.status=502;finish(false);if(!res.headersSent)res.writeHead(502);res.end();});
    req.on('aborted',()=>{finish(false);upstream.destroy();});
    req.on('error',()=>{finish(false);upstream.destroy();res.destroy();});
    res.on('error',()=>{finish(false);upstream.destroy();});
    res.on('finish',()=>finish(upResponse?.complete===true));
    res.on('close',()=>{if(!res.writableFinished){finish(false);upstream.destroy();upResponse?.destroy();}});
    req.pipe(upstream);
  });
  server.on('connection',socket=>{if(sockets.size>=256){latch('proxy socket limit');socket.destroy();return;}track(socket);});
  server.on('connect',(_req,socket)=>socket.destroy());
  server.on('upgrade',(_req,socket)=>socket.destroy());
  server.on('clientError',(_error,socket)=>socket.destroy());
  try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});}
  catch{fs.closeSync(fd);for(const socket of sockets)socket.destroy();throw Error('proxy listen failed');}
  server.on('error',()=>latch('proxy server failed'));
  const port=server.address().port;
  return {baseUrl:`http://127.0.0.1:${port}`,logPath,get failure(){return failure;},get stats(){return {rows,bytes,sockets:sockets.size};},
    close(){return closePromise ||= (async()=>{
      closing=true;
      await new Promise(resolve=>{const timer=setTimeout(()=>{for(const done of active)done(false);for(const socket of sockets)socket.destroy();},closeMs);server.close(()=>{clearTimeout(timer);resolve();});server.closeIdleConnections();});
      for(const done of active)done(false);
      for(const socket of sockets)socket.destroy();
      try{fs.closeSync(fd);}catch{latch('proxy log close failed');}
      if(failure)throw failure;
    })();}};
}
