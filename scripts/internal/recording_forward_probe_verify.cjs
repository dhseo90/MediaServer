// actual acceptance → VCL identity → mux bytes → actual file samples.
const fs=require('fs'),path=require('path');
const {native}=require('./recording_forward_probe_native.cjs');
function need(value,message){if(!value)throw Error(message)}
function csv(file){const lines=fs.readFileSync(file,'utf8').trim().split('\n'),header=lines.shift().split(',');return lines.map(line=>Object.fromEntries(line.split(',').map((v,i)=>[header[i],v])))}
function unique(rows,key){const result=new Map();for(const row of rows){need(!result.has(row[key]),'non-unique-'+key);result.set(row[key],row)}return result}
const round=(ns,t)=>(BigInt(ns)*BigInt(t)+500000000n)/1000000000n;
// 입출력 없는 검증 경계. native 표는 제한 parser가 읽은 결과를 전달한다.
function verifySegment({original,manifest,accepted,mux,binding,n,events}) {
  const byRaw=unique(original,'sha256'),byVcl=unique(accepted,'vcl'),muxVcl=unique(mux,'vcl'),fileRaw=unique(n.samples,'sha256');
  need(binding.length===accepted.length&&accepted.length===mux.length&&mux.length===n.samples.length&&accepted.length===Number(manifest.count),'boundary-count');
  need(mux.length>0&&mux[0].dts==='0','supported-zero-dts-origin');
  const rows=['ordinal,original_pts_ns,original_dts_ns,writer_origin_ns,appsrc_pts_ns,appsrc_dts_ns,appsrc_duration_ns,mux_pts_ns,mux_dts_ns,mux_duration_ns,vcl_sha256,mux_raw_sha256,file_sample_index,native_pts_tick,native_dts_tick,native_duration_tick,timescale,forward_pts_tick,forward_dts_tick,forward_duration_tick'];
  const seenOriginal=new Set(),seenFile=new Set();let origin=null;
  for(let i=0;i<mux.length;i++){
   const m=mux[i],a=byVcl.get(m.vcl);need(a&&muxVcl.has(a.vcl),'source-mux-identity');
   const o=byRaw.get(a.sha256),s=fileRaw.get(m.sha256);need(o&&s,'actual-payload-identity');
   need(!seenOriginal.has(o.index)&&!seenFile.has(s.index),'identity-reuse');seenOriginal.add(o.index);seenFile.add(s.index);
   const ordinal=Number(o.index)+1;
   const bound=binding[Number(a.index)];
   need(bound&&Number(bound.ordinal)===ordinal&&bound.pts_ns===o.pts,'accepted-source-binding');
   const op=BigInt(o.pts)-BigInt(a.pts),od=BigInt(o.dts)-BigInt(a.dts);
   need(op===od&&op>=0n,'writer-integer-origin');if(origin===null)origin=op;need(origin===op,'constant-writer-origin');
   need(a.duration===o.duration&&a.pts===m.pts&&a.dts===m.dts,'parser-pts-dts-boundary');
   // qtmux 1.28.1: independent rounded PTS/DTS, delta of rounded decode endpoints.
   const dt=round(m.dts,n.timescale),pt=round(m.pts,n.timescale);
   const end=i+1<mux.length?BigInt(mux[i+1].dts):BigInt(m.dts)+BigInt(m.duration);
   const duration=round(end,n.timescale)-dt;
   need(BigInt(s.dts)===dt&&BigInt(s.pts)===pt&&BigInt(s.duration)===duration,'qtmux-forward-table');
   rows.push([ordinal,o.pts,o.dts,origin,a.pts,a.dts,a.duration,m.pts,m.dts,m.duration,a.vcl,m.sha256,s.index,s.pts,s.dts,s.duration,n.timescale,pt,dt,duration].join(','));
  }
  need(seenOriginal.size===accepted.length&&seenFile.size===n.samples.length,'identity-total');
  need(events.some(e=>e.kind==='segment'&&e.start==='0'&&e.time==='0'&&e.rate==='1'&&e.applied_rate==='1'),'segment-observation');
  return {rows,origin,count:accepted.length};
}
function run(root) {
for(let test=1;test<=4;test++){
 const dir=path.join(root,'TP0'+test),original=csv(path.join(dir,'input.csv'));
 const manifests=csv(path.join(dir,'manifest.csv'));let total=0;
 for(const manifest of manifests){
  const prefix=path.join(dir,'forward-'+manifest.segment),accepted=csv(prefix+'-accepted.csv'),mux=csv(prefix+'-mux.csv'),binding=csv(prefix+'-binding.csv');
  const n=native(path.join(dir,manifest.file)),events=csv(prefix+'-events.csv');
  const {rows,origin}=verifySegment({original,manifest,accepted,mux,binding,n,events});
  fs.writeFileSync(prefix+'-mapping.csv',rows.join('\n')+'\n');
  fs.writeFileSync(prefix+'-native.json',JSON.stringify(n,null,2)+'\n');
  console.log(`[FW0${test}] segment=${manifest.segment} samples=${accepted.length} acceptance_vcl_file_identity=pass integer_origin_subtraction=pass actual_mux_native_forward=pass origin_ns=${origin} timescale=${n.timescale}`);
  total+=accepted.length;
 }
 need(total===original.length,'fixture-total');
 console.log(`[pass] FW0${test} samples=${total} scope=forward-characterization-only inverse_endpoint_mapping=not-proven request_fully_satisfied=not-evaluated`);
}
console.log('[summary] pass=4 fail=0 scope=actual-forward-capture-and-native-table-comparison product-complete=false');
}
module.exports={verifySegment};
if(require.main===module)run(process.argv[2]);
