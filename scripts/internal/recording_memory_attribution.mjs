// 숫자 진단만 수집한다. 원문을 다시 보관하거나 로그 한도를 확장하지 않는다.
const prefix='[memory-attribution] ';
export function memoryAttributionCollector(pid){return {pid,carry:'',last:null,count:0,error:null,receivedNs:null,phases:{},lastEndNs:0};}
export function validateMemoryAttribution(row,pid){
 const phases=['opened','sample','before-Finish','after-Finish','after-storage-destruction'];
 if(!phases.includes(row.phase))throw Error('memory-attribution-phase');
 for(const [key,width] of [['live',14],['peak',14],['totals',20]])if(!Array.isArray(row[key])||row[key].length!==width||row[key].some(n=>!Number.isSafeInteger(n)||n<0))throw Error('memory-attribution-owner-shape');
 if(row.live.some((n,i)=>n>row.peak[i]))throw Error('memory-attribution-peak');
 if(![row.rssBytes,row.footprintBytes].every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('memory-attribution-process-memory');
 if(row.pid!==pid||row.valid!==true||row.loss!==false)throw Error('memory-attribution-invalid');
 const ns=['sampleStartNs','ownerCapturedNs','rolesCapturedNs','processCapturedNs','sampleEndNs'];
 if(!ns.every(k=>Number.isSafeInteger(row[k])&&row[k]>0)||ns.some((k,i)=>i&&row[k]<row[ns[i-1]]))throw Error('memory-attribution-clock');
 if(![row.residencyUsed,row.attributedSearchBytes,row.unattributedSearchBytes].every(n=>Number.isSafeInteger(n)&&n>=0)||row.residencyUsed<row.attributedSearchBytes||row.residencyUsed-row.attributedSearchBytes!==row.unattributedSearchBytes)throw Error('memory-attribution-negative-or-mismatch');
 if(!row.tickets||Object.keys(row.tickets).length!==13||Object.values(row.tickets).some(a=>!Array.isArray(a)||a.length!==2||a.some(n=>!Number.isSafeInteger(n)||n<0)))throw Error('memory-attribution-tickets');
 const sum=Object.values(row.tickets).reduce((n,a)=>n+a[0],0);if(sum!==row.residencyUsed||row.tickets.unattributed[0]!==row.unattributedSearchBytes)throw Error('memory-attribution-ticket-sum');
 for(const [key,max,width] of [['models',128,7],['snapshotPools',16,10],['recentEvents',32,6]])if(!Array.isArray(row[key])||row[key].length>max||row[key].some(a=>!Array.isArray(a)||a.length!==width||a.some(n=>typeof n!=='boolean'&&(!Number.isSafeInteger(n)||n<0))))throw Error('memory-attribution-shape');
 if(row.ticketWitness!==undefined){
  const w=row.ticketWitness, num=n=>Number.isSafeInteger(n)&&n>=0, vec=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(num), sum=v=>v.reduce((a,b)=>a+b,0);
  if(Object.keys(w).sort().join(',')!=='allocator,atPeak,atUnknownPeak,peak,peakNs,sites,unknownLive,unknownPeak'||!num(w.peak)||!num(w.peakNs)||!vec(w.atPeak,15)||!vec(w.atUnknownPeak,15)||!vec(w.unknownLive,15)||!vec(w.unknownPeak,4)||!Array.isArray(w.sites)||w.sites.length!==15||w.sites.some(v=>!vec(v,13)))throw Error('memory-ticket-witness-shape');
  if(sum(w.atPeak)!==w.peak||sum(w.atUnknownPeak)!==w.unknownPeak[0]||sum(w.unknownLive)!==row.unattributedSearchBytes||sum(w.sites.map(v=>v[0]))!==row.residencyUsed||w.unknownPeak[0]<row.unattributedSearchBytes||w.peak<row.residencyUsed||w.sites.some((v,i)=>v[0]<w.unknownLive[i]||v[0]>v[4]||v[8]>v[4]||v[2]+v[12]!==v[3]+v[1]))throw Error('memory-ticket-witness-sum');
  const a=w.allocator;
  if(!Array.isArray(a)||a.length!==8||typeof a[0]!=='boolean'||typeof a[1]!=='boolean'||!a.slice(2).every(num)||a[1]&&!a[0]||a[2]<row.processCapturedNs||a[3]<a[2]||a[3]>row.sampleEndNs)throw Error('memory-allocator-coverage');
 }
 if(row.snapshotPools.some(p=>p[9]))throw Error('memory-attribution-pool-overflow');
 return row;
}
export function collectMemoryAttribution(state,chunk){
 if(state.error)return;try{
  let text=state.carry+chunk.toString();state.carry='';let end;
  while((end=text.indexOf('\n'))>=0){const line=text.slice(0,end);text=text.slice(end+1);if(!line.startsWith(prefix))continue;if(Buffer.byteLength(line)>16384)throw Error('memory-attribution-line-cap');const row=validateMemoryAttribution(JSON.parse(line.slice(prefix.length)),state.pid);if(row.sampleStartNs<=state.lastEndNs)throw Error('memory-attribution-clock-reversal');
   const order=['opened','sample','before-Finish','after-Finish','after-storage-destruction'];
   const prior=state.last?.phase;if(!prior&&row.phase!=='opened')throw Error('memory-attribution-open-missing');
   if(prior&&(order.indexOf(row.phase)<order.indexOf(prior)||(row.phase===prior&&row.phase!=='sample')))throw Error('memory-attribution-phase-order');
   state.phases[row.phase]=(state.phases[row.phase]??0)+1;state.lastEndNs=row.sampleEndNs;state.last=row;state.receivedNs=Number(process.hrtime.bigint());if(++state.count>1600)throw Error('memory-attribution-sample-cap');}
  if(text.length>16384){if(text.startsWith(prefix))throw Error('memory-attribution-fragment-cap');text='';}state.carry=text;
 }catch(e){state.error=e.message;}
}
export function memoryAttributionSnapshot(state){if(state.error||!state.last)throw Error(state.error||'memory-attribution-missing');return {receivedNs:state.receivedNs,sample:state.last};}

export function finishMemoryAttribution(state){
 if(state.error)throw Error(state.error);
 if(state.carry.startsWith(prefix)||prefix.startsWith(state.carry)&&state.carry.length)throw Error('memory-attribution-incomplete-tail');
 for(const phase of ['opened','sample','before-Finish','after-Finish','after-storage-destruction'])if(!state.phases[phase])throw Error('memory-attribution-missing-'+phase);
 const row=state.last;
 if(row.phase!=='after-storage-destruction'||row.residencyUsed||row.models.length||row.snapshotPools.length||row.live.some(n=>n))throw Error('memory-attribution-final-owners');
 return {status:'captured',pid:state.pid,count:state.count,phases:state.phases,finalOwnerZero:true};
}
