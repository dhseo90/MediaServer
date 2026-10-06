// 파일 용도: 실제 검색 응답만 지연하는 작업 소유 loopback 반례. 응답 내용은 그대로 전달한다.
import http from 'node:http';import fs from 'node:fs';
let delayed=0,requests=0;
const server=http.createServer(async(req,res)=>{
 const bytes=[];for await(const part of req)bytes.push(part);
 const response=await fetch('http://127.0.0.1:64914'+req.url,{method:req.method,redirect:'manual',headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(bytes)});
 const body=Buffer.from(await response.arrayBuffer());
 if(req.url.startsWith('/ops/api/recordings/visual-search?')){delayed++;await new Promise(r=>setTimeout(r,1200));}
 const headers={};for(const[k,v]of response.headers)if(!['transfer-encoding','content-encoding','connection'].includes(k))headers[k]=v;
 headers['content-length']=String(body.length);res.writeHead(response.status,headers);res.end(body);requests++;
});
server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({port:server.address().port,owned:true,delayMs:1200})));
setTimeout(()=>server.close(()=>{console.log(JSON.stringify({closed:true,requests,delayed}));}),120000);
