// WHEP 신호협상 oracle 자체검사. 네트워크/서버/native process를 시작하지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateOffer, validateCreated, validateIce, validateDeleted, validateMalformed,
  validateProcess, safeProcessFacts, safeFailureFacts, selectedMode} from './verify_whep_local_signaling.mjs';
import {assertLocalIceEnvironment, assertLocalIceConfig} from './verify_local_ice_guard.mjs';

const offer = ['v=0','o=- 1 1 IN IP4 0.0.0.0','s=-','t=0 0','a=group:BUNDLE video0',
  'm=video 9 UDP/TLS/RTP/SAVPF 96','c=IN IP4 0.0.0.0','a=mid:video0',
  'a=recvonly','a=rtcp-mux','a=rtpmap:96 H264/90000','a=setup:actpass',
  'a=ice-ufrag:fixture','a=ice-pwd:fixture-password-only',
  'a=fingerprint:sha-256 '+Array(32).fill('AB').join(':'),''].join('\r\n');
const answer=offer.replace('a=recvonly','a=sendonly').replace('a=setup:actpass','a=setup:active');
const created=(changes={})=>({status:201,contentType:'application/sdp',location:'/whep/session/whep-fixture',body:answer,...changes});

test('WLS01 genuine offer and compatible answer accepted',()=>{
  const expected=validateOffer(offer); assert.equal(expected.mid,'video0');
  assert.equal(validateCreated(created(),expected).location,'/whep/session/whep-fixture');
});
test('WLS02 wrong creation status or content type rejected',()=>{
  for(const changes of [{status:200},{status:500},{contentType:'text/plain'}])assert.throws(()=>validateCreated(created(changes),validateOffer(offer)));
});
test('WLS03 echoed offer and wrong DTLS or direction rejected',()=>{
  for(const body of [offer,answer.replace('a=setup:active','a=setup:actpass'),answer.replace('a=sendonly','a=recvonly')])assert.throws(()=>validateCreated(created({body}),validateOffer(offer)));
});
test('WLS04 missing codec, mismatched mid or rejected media rejected',()=>{
  for(const body of [answer.replace('H264/90000','VP8/90000'),answer.replaceAll('video0','video1'),answer.replace('m=video 9 ','m=video 0 ')])assert.throws(()=>validateCreated(created({body}),validateOffer(offer)));
});
test('WLS05 unsafe or non-WHEP Location never followed',()=>{
  for(const location of ['http://attacker.invalid/private','//attacker.invalid/x','/webrtc/session/x','/whep/session/../x','/whep/session/a%2fb','/whep/session/x?secret=1','/whep/session/x#secret'])assert.throws(()=>validateCreated(created({location}),validateOffer(offer)));
});
test('WLS06 bounded SDP rejects truncation, duplicate attributes and extra media',()=>{
  for(const body of ['v=0\r\n','x'.repeat(65537),offer.replace('a=mid:video0','a=mid:video0\r\na=mid:video1'),offer+'m=audio 9 UDP/TLS/RTP/SAVPF 97\r\n'])assert.throws(()=>validateOffer(body));
});
test('WLS07 ICE shape validated without requiring connectivity',()=>{
  assert.equal(validateIce({status:200,contentType:'application/json',body:'{"candidates":[]}'}),0);
  for(const body of ['{}','{"candidates":[{"candidate":"private","sdpMLineIndex":-1}]}','{"candidates":null}'])assert.throws(()=>validateIce({status:200,contentType:'application/json',body}));
});
test('WLS08 deletion and repeated deletion have distinct exact oracles',()=>{
  validateDeleted({status:200,body:'{"ok":true}'},false);validateDeleted({status:404,body:'unknown session'},true);
  assert.throws(()=>validateDeleted({status:200,body:'{"ok":false}'},false));assert.throws(()=>validateDeleted({status:200,body:'{"ok":true}'},true));
});
test('WLS09 malformed offer rejection cannot be a server error or SDP success',()=>{
  validateMalformed({status:400,body:'invalid offer',contentType:'text/plain'});
  for(const r of [{status:500,body:'error'},{status:201,body:answer},{status:400,body:answer,contentType:'application/sdp'},{status:400,body:'invalid offer',location:'/whep/session/private'}])assert.throws(()=>validateMalformed(r));
});
test('WLS10 external ICE environment and advertised config rejected',()=>{
  assertLocalIceEnvironment({MEDIA_SERVER_WEBRTC_STUN_SERVER:'stun://127.0.0.1:12345',MEDIA_SERVER_WEBRTC_TURN_SERVER:''},12345);
  assert.throws(()=>assertLocalIceEnvironment({MEDIA_SERVER_WEBRTC_STUN_SERVER:'stun://external.invalid:1'},12345));
  assert.throws(()=>assertLocalIceConfig({hasStun:true,hasTurn:true,peerConnectionConfig:{iceServers:[]}},12345));
});
test('WLS11 timeout, overflow, signal and spawn failure never pass',()=>{
  const ok={code:0,signal:null,timedOut:false,overflow:false,spawnError:false};validateProcess(ok);
  for(const patch of [{code:1},{signal:'SIGKILL'},{timedOut:true},{overflow:true},{spawnError:true}])assert.throws(()=>validateProcess({...ok,...patch}));
});
test('WLS12 diagnostics expose only fixed numeric and hash fields and modes are exact',()=>{
  const safe=safeProcessFacts({code:0,signal:null,bytes:17,sha256:'a'.repeat(64),stdout:'secret SDP',url:'http://private/session',capability:'secret'});
  assert.deepEqual(Object.keys(safe),['code','signal','bytes','sha256']);assert.ok(!JSON.stringify(safe).includes('secret'));
  assert.equal(selectedMode(['--run']),'--run');assert.throws(()=>selectedMode([]));assert.throws(()=>selectedMode(['--run','extra']));
});
test('WLS13 failure phase and errno are allowlisted without raw error leakage',()=>{
  assert.deepEqual(safeFailureFacts({code:'EPERM',message:'private SDP'},'reserve-http'),{phase:'reserve-http',errno:'EPERM',reason:'unknown',rawPublished:false});
  for(const code of ['EACCES','EADDRINUSE'])assert.equal(safeFailureFacts({code},'bind-udp').errno,code);
  const unknown=safeFailureFacts({code:'private-url',message:'secret-capability',stack:'private SDP'},'secret-session');
  assert.deepEqual(unknown,{phase:'unknown',errno:'unknown',reason:'unknown',rawPublished:false});
  assert.equal(safeFailureFacts({message:'secret-private'},'reserve-http').reason,'unknown');
  assert.equal(safeFailureFacts({message:'sdp-direction'},'native-offer').reason,'sdp-direction');
});
