// query 전용 관측 검증. 기존 sources/owner/RSS 판정은 바꾸지 않는다.
const integer=n=>Number.isSafeInteger(n)&&n>=0;
export const queryCases=[
 'LP21-Q01 fixture separates total sources from two relevant 4096-sample bindings',
 'LP21-Q01 quiet wait queries preserve canonical bytes and cold detail',
 'LP21-Q02 natural overlap preserves exact snapshots and all normal writes',
 'LP21-Q02 forced unrelated Apply falls back once without performance timing',
 'LP21-Q03 both selected sources stay protected until exact lease release',
 'LP21-Q03 released sources regain the existing deletion behavior',
];
function exact(row,keys){return Object.keys(row).sort().join('|')===keys.split(' ').sort().join('|');}
function suffix(name,key){return name===key||name.endsWith('/'+key);}
export function validateQuery(stdout,total){
 try{
  const rows=stdout.split('\n').filter(l=>l.startsWith('[query] ')).map(l=>JSON.parse(l.slice(8)));
  if(rows.some(r=>!['phase','thread','cost','forced','summary'].includes(r.kind)))return false;
  const of=kind=>rows.filter(r=>r.kind===kind),phases=of('phase'),threads=of('thread'),costs=of('cost'),forced=of('forced'),summaries=of('summary');
  if(phases.length!==2||threads.length!==3||forced.length!==1||summaries.length!==1)return false;
  const summary=summaries[0];
  if(!exact(summary,'kind total relevant protected samples pass fail nativeFileEvidence')||summary.total!==total||summary.relevant!==2||summary.protected!==2||summary.samples!==4096||summary.pass!==6||summary.fail!==0||summary.nativeFileEvidence!==true)return false;
  if(!exact(forced[0],'kind total attempts fallbacks writes timed')||forced[0].total!==total||forced[0].attempts!==1||forced[0].fallbacks!==1||forced[0].writes!==1||forced[0].timed!==false)return false;
  const seen=new Set();for(const p of phases){if(!exact(p,'kind stage total relevant protected samples attempts fallbacks writes')||!['quiet','overlap'].includes(p.stage)||seen.has(p.stage)||p.total!==total||p.relevant!==2||p.protected!==2||p.samples!==4096||p.attempts!==8||!integer(p.fallbacks)||p.fallbacks>8||p.writes!==(p.stage==='quiet'?0:16)||p.stage==='quiet'&&p.fallbacks!==0)return false;seen.add(p.stage);}
  const threadIds=new Set();
  for(const t of threads){
   if(!exact(t,'kind stage thread attempts fallbacks writes callCount wallNs maxCallNs waitCount waitNs maxWaitNs holdCount holdNs maxHoldNs offlockCalls offlockNs protectionCalls protectionNs metricRows'))return false;
   const id=t.stage+'/'+t.thread;if(!['quiet/reader','overlap/reader','overlap/writer'].includes(id)||threadIds.has(id))return false;threadIds.add(id);
   if(Object.entries(t).some(([k,v])=>!['kind','stage','thread'].includes(k)&&!integer(v)))return false;
   const own=costs.filter(c=>c.stage===t.stage&&c.thread===t.thread);if(!own.length||own.length!==t.metricRows||new Set(own.map(c=>c.scope)).size!==own.length)return false;
   for(const c of own)if(!exact(c,'kind stage thread scope count inclusiveNs exclusiveNs maximumNs')||!/^[A-Za-z0-9_.\/]+$/.test(c.scope)||!['count','inclusiveNs','exclusiveNs','maximumNs'].every(k=>integer(c[k]))||c.exclusiveNs>c.inclusiveNs||c.maximumNs>c.inclusiveNs)return false;
   const aggregate=(key,outside=false)=>own.filter(c=>suffix(c.scope,key)&&(!outside||!c.scope.includes('catalog.lock.hold'))).reduce((a,c)=>({count:a.count+c.count,sum:a.sum+c.inclusiveNs,max:Math.max(a.max,c.maximumNs)}),{count:0,sum:0,max:0});
   const call=aggregate('query.call'),wait=aggregate('catalog.lock.wait'),hold=aggregate('catalog.lock.hold'),off=aggregate('query.materialize',true),protection=aggregate('query.protection');
   if(call.count!==t.callCount||call.sum!==t.wallNs||call.max!==t.maxCallNs||!wait.count||wait.count!==t.waitCount||wait.sum!==t.waitNs||wait.max!==t.maxWaitNs||hold.count!==t.holdCount||hold.sum!==t.holdNs||hold.max!==t.maxHoldNs||off.count!==t.offlockCalls||off.sum!==t.offlockNs||protection.count!==t.protectionCalls||protection.sum!==t.protectionNs)return false;
   if(t.thread==='reader'){const p=phases.find(p=>p.stage===t.stage);if(t.callCount!==8||t.attempts!==8||t.fallbacks!==p.fallbacks||t.writes!==0||t.protectionCalls!==8||!t.offlockCalls)return false;}
   else if(t.callCount!==0||t.attempts!==0||t.fallbacks!==0||t.writes!==16||t.protectionCalls!==0||t.offlockCalls!==0)return false;
  }
  if(costs.some(c=>!threadIds.has(c.stage+'/'+c.thread)))return false;
  const passes=stdout.split('\n').filter(l=>l.startsWith('[pass] LP21-'));return JSON.stringify(passes)===JSON.stringify(queryCases.map(s=>'[pass] '+s))&&!stdout.includes('[fail]')&&!stdout.includes('[error]');
 }catch{return false;}
}
