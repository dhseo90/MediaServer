// 파일 용도: 기존 실제 앱 dispatch/EventRecord 상관 규칙을 공유한다. 원장·시간축 변환 없음.
export function dispatchTuple(response, tap, ruleId, {selectionBasis='lowest-track-id-stable-reference'}={}) {
  if (response.tapId !== tap.tapId || response.result?.sourceKey !== tap.streamKey ||
      !Number.isSafeInteger(response.result?.pts)) return null;
  const events = (response.events || []).filter(e => e.ruleId === ruleId && e.type === 'presence' &&
    Number.isSafeInteger(e.object?.trackId));
  if(!['lowest-track-id-stable-reference','first-dispatch-stable-reference'].includes(selectionBasis))throw Error('dispatch-selection-basis');
  // first-dispatch는 reference 정체성을 고정할 뿐 render queue 순서를 뜻하지 않는다.
  // 어느 기준이든 한 번 선택한 뒤 느리다는 이유로 다른 작업으로 교체하지 않는다.
  if(selectionBasis==='lowest-track-id-stable-reference')events.sort((a, b) => a.object.trackId - b.object.trackId);
  if (!events.length) return null;
  const selected=events[0],selectedDispatchOrdinal=(response.events || []).indexOf(selected);
  return {source: tap.streamKey, pts: response.result.pts, ruleId, trackId:selected.object.trackId, type:selected.type,
    selectionBasis,candidateCount:events.length,selectedDispatchOrdinal};
}
export function correlatedEvent(rows, excluded, tuple) {
  const matches = rows.filter(x => x.eventId && !excluded.has(x.eventId) &&
    x.streamId === tuple.source && x.channelId === tuple.source && x.eventType === tuple.type &&
    x.trackId === tuple.trackId && Number.isSafeInteger(x.updateTime) &&
    x.updateTime === Math.trunc(tuple.pts / 1000000) && x.metadata?.ruleId === tuple.ruleId &&
    ((x.metadata.schema === 'media-server.va.event-record.metadata.v1' && x.metadata.pts === tuple.pts) ||
     (x.metadata.schema === 'media-server.va.event-track-health.v1' &&
      x.metadata.eventMetadata !== null && typeof x.metadata.eventMetadata === 'object' && !Array.isArray(x.metadata.eventMetadata) &&
      x.metadata.trackHealth !== null && typeof x.metadata.trackHealth === 'object' && !Array.isArray(x.metadata.trackHealth))));
  const ids = new Set(matches.map(x => x.eventId));
  if (ids.size > 1) throw Error('ambiguous-new-dispatch-event-ids');
  return matches[0];
}
