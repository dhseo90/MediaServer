// 검증 준비가 외부 ICE 기본값을 허용하는 회귀를 검사한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {assertLocalIceEnvironment as envCheck, assertLocalIceConfig as configCheck} from './verify_local_ice_guard.mjs';
const env=()=>({MEDIA_SERVER_WEBRTC_STUN_SERVER:'stun://127.0.0.1:45678',MEDIA_SERVER_WEBRTC_TURN_SERVER:''});
const config=()=>({hasStun:true,hasTurn:false,peerConnectionConfig:{iceServers:[{urls:'stun:127.0.0.1:45678'}]}});
test('ISO01 explicit owned loopback accepted',()=>{envCheck(env(),45678);configCheck(config(),45678);});
test('ISO02 empty STUN rejected',()=>assert.throws(()=>envCheck({...env(),MEDIA_SERVER_WEBRTC_STUN_SERVER:''},45678)));
test('ISO03 external STUN rejected',()=>assert.throws(()=>envCheck({...env(),MEDIA_SERVER_WEBRTC_STUN_SERVER:'stun://example.invalid:3478'},45678)));
test('ISO04 mixed server ICE rejected',()=>{const c=config();c.peerConnectionConfig.iceServers.push({urls:'stun:example.invalid:3478'});assert.throws(()=>configCheck(c,45678));});
test('ISO05 TURN rejected',()=>{assert.throws(()=>envCheck({...env(),MEDIA_SERVER_WEBRTC_TURN_SERVER:'turn://example.invalid:3478'},45678));assert.throws(()=>configCheck({...config(),hasTurn:true},45678));});
test('ISO06 unowned port rejected',()=>{assert.throws(()=>envCheck(env(),45679));assert.throws(()=>configCheck(config(),45679));});
test('ISO07 unexpected credentials rejected',()=>{const c=config();c.peerConnectionConfig.iceServers[0].credential='fixture-only';assert.throws(()=>configCheck(c,45678));});
