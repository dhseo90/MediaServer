import assert from 'node:assert/strict';

let eventHasExactCatalogLink;
try {
  ({eventHasExactCatalogLink}=await import('./verify-actual-link-reader.mjs'));
} catch (error) {
  assert.fail(`실제 catalog 연결 판독기를 불러오지 못함: ${error.message}`);
}

let passed=0;
function test(name,body){
  body();
  passed++;
  console.log(`PASS: ${name}`);
}

const event={
  eventId:'evt_1788531854957_4',
  recordingLinkId:'event-link-sha256-8c9a8f5af9682511268a6e1d2e6ddc30c05c2033cef767d454926222b96a8634',
};
const canonicalPayload={
  schema:'media-server.event-recording-link.v1',
  link_id:event.recordingLinkId,
  event_id:event.eventId,
  source_id:'9101',
  channel_id:'9101',
  requested_range:null,
  media_pts_range_ms:{start_ms:8566,end_ms:9566},
  ordered_overlaps:[],
  derived_segment_id:null,
  fallback_evidence_id:'fallback-sha256-8c9a8f5af9682511268a6e1d2e6ddc30c05c2033cef767d454926222b96a8634',
  fallback_media_locator:'/private/tmp/example/events/clips/evt_1788531854957_4.clip/manifest.json',
  missing_ranges:[],
  time_basis:'media-pts-ms',
  completeness_reason:'pending-with-provisional-frame-buffer-fallback',
  status:'pending',
  created_at_ms:1788531854957,
  updated_at_ms:1788531855500,
};
const row={
  link_id:event.recordingLinkId,
  event_id:event.eventId,
  channel_id:'9101',
  requested_start_ms:0,
  requested_end_ms:0,
  derived_segment_id:'',
  fallback_ref:canonicalPayload.fallback_evidence_id,
  completeness:'pending',
  missing_ranges_json:JSON.stringify(canonicalPayload),
  display_priority:0,
};
const matches=rows=>eventHasExactCatalogLink(event,rows,{sourceId:'9101',channelId:'9101'});
const changed=(base,update)=>({...base,...update});
const payloadRow=update=>changed(row,{missing_ranges_json:JSON.stringify(changed(canonicalPayload,update))});

test('실제 SQLite 행과 정식 payload가 일치하면 연결을 승인한다',()=>assert.equal(matches([row]),true));
test('존재하지 않는 상위 source_id가 맞아도 payload source_id가 다르면 거부한다',()=>assert.equal(matches([changed(payloadRow({source_id:'다른-source'}),{source_id:'9101'})]),false));
test('정식 payload JSON이 손상되면 거부한다',()=>assert.equal(matches([changed(row,{missing_ranges_json:'{'})]),false));
test('정식 payload schema가 다르면 거부한다',()=>assert.equal(matches([payloadRow({schema:'media-server.event-recording-link.v2'})]),false));
test('SQL event_id가 다르면 거부한다',()=>assert.equal(matches([changed(row,{event_id:'다른-event'})]),false));
test('SQL link_id가 다르면 거부한다',()=>assert.equal(matches([changed(row,{link_id:'다른-link'})]),false));
test('SQL channel_id가 다르면 거부한다',()=>assert.equal(matches([changed(row,{channel_id:'다른-channel'})]),false));
test('payload event_id가 SQL 행과 다르면 거부한다',()=>assert.equal(matches([payloadRow({event_id:'다른-event'})]),false));
test('payload link_id가 SQL 행과 다르면 거부한다',()=>assert.equal(matches([payloadRow({link_id:'다른-link'})]),false));
test('payload channel_id가 다르면 거부한다',()=>assert.equal(matches([payloadRow({channel_id:'다른-channel'})]),false));
test('동일한 일치 행이 중복되면 정확히 한 건 조건으로 거부한다',()=>assert.equal(matches([row,structuredClone(row)]),false));
test('event recordingLinkId가 비어 있으면 거부한다',()=>assert.equal(eventHasExactCatalogLink(changed(event,{recordingLinkId:''}),[row],{sourceId:'9101',channelId:'9101'}),false));

console.log(`[verify-actual-link-reader] pass=${passed} fail=0`);
