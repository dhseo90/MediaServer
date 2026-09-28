const SCHEMA='media-server.event-recording-link.v1';

function parseCanonicalLink(row){
  if(!row||typeof row.missing_ranges_json!=='string')return null;
  try{
    const value=JSON.parse(row.missing_ranges_json);
    return value&&typeof value==='object'&&!Array.isArray(value)?value:null;
  }catch{
    return null;
  }
}

function rowMatches(event,row,{sourceId,channelId}){
  if(!event?.eventId||!event?.recordingLinkId||!sourceId||!channelId)return false;
  if(row?.event_id!==event.eventId||row?.link_id!==event.recordingLinkId||row?.channel_id!==channelId)return false;
  const canonical=parseCanonicalLink(row);
  return canonical?.schema===SCHEMA&&
    canonical.event_id===row.event_id&&
    canonical.link_id===row.link_id&&
    canonical.source_id===sourceId&&
    canonical.channel_id===channelId;
}

export function eventHasExactCatalogLink(event,rows,expected){
  if(!Array.isArray(rows))return false;
  return rows.filter(row=>rowMatches(event,row,expected)).length===1;
}
