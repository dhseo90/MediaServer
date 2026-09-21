// 파일 용도: 기존 실제 앱 dispatch/EventRecord 상관 규칙을 공유한다. 원장·시간축 변환 없음.
export function dispatchTuple(response, tap, ruleId) {
  if (response.tapId !== tap.tapId || response.result?.sourceKey !== tap.streamKey ||
      !Number.isSafeInteger(response.result?.pts)) return null;
  const events = (response.events || []).filter(e => e.ruleId === ruleId && e.type === 'presence' &&
    Number.isSafeInteger(e.object?.trackId)).sort((a, b) => a.object.trackId - b.object.trackId);
  if (!events.length) return null;
  return {source: tap.streamKey, pts: response.result.pts, ruleId, trackId: events[0].object.trackId, type: events[0].type};
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
