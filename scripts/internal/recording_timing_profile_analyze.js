// 파일 용도: 검증 전용: 기존 제한 native reader만 재사용하고 NP 특성화 결과를 보존한다.
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=process.argv[2],source=fs.readFileSync(path.join(__dirname,'recording_timing_probe.js'),'utf8');
const marker='for(let c=1;c<=4;c++)';if(source.split(marker).length!==2)throw Error('reader source boundary');
const {native,csv}=vm.runInNewContext(source.split(marker)[0]+'\n({native,csv})',{require,process});
function need(v,m){if(!v)throw Error(m)}
let files=0;const trackOnly=Boolean(process.env.MEDIA_SERVER_TIMING_PROFILE_TRACK_ONLY);
for(const caseId of ['NP01','NP02','NP03','NP04','NP04-L']){
 const id=trackOnly?caseId.replace('NP','NP-T'):caseId;
 const finalDir=path.join(root,id),partialDir=path.join(root,caseId.replace('NP','TP'));
 const dir=fs.existsSync(finalDir)?finalDir:partialDir;
 if(!fs.existsSync(dir)){console.log(`[not-run] ${id} capture unavailable after prior failure`);break;}
 const input=csv(path.join(dir,'input.csv')),manifest=csv(path.join(dir,'manifest.csv'));
 if(!manifest.length){need(caseId==='NP04-L','no finalized file');console.log(`[observation] ${id} writer rejected/no finalized file; safe timing not established`);continue;}
 for(const m of manifest){const file=path.join(dir,m.file),n=native(file),bytes=fs.readFileSync(file),md=n.boxes.find(b=>b.type==='mdhd'),mv=n.boxes.find(b=>b.type==='mvhd');
  n.mdhdVersion=bytes[md.data];n.mdhdDuration=n.mdhdVersion===1?bytes.readBigUInt64BE(md.data+24).toString():String(bytes.readUInt32BE(md.data+16));n.mvhdVersion=bytes[mv.data];n.mvhdDuration=n.mvhdVersion===1?bytes.readBigUInt64BE(mv.data+24).toString():String(bytes.readUInt32BE(mv.data+16));
  fs.writeFileSync(path.join(dir,`segment-${m.segment}-native.json`),JSON.stringify(n,null,2)+'\n');
  const demux=csv(path.join(dir,`segment-${m.segment}-demux.csv`)),parsed=csv(path.join(dir,`segment-${m.segment}-parse.csv`));
  console.log(`[diagnostic] ${id}/${m.segment} input=${input.length} binding=${m.count} native=${n.samples.length} demux=${demux.length} parse=${parsed.length} scale=${n.timescale} movieScale=${n.movieTimescale} mdhdVersion=${n.mdhdVersion} mdhdDuration=${n.mdhdDuration} mvhdVersion=${n.mvhdVersion} mvhdDuration=${n.mvhdDuration} stts=${JSON.stringify(n.stts)} edits=${JSON.stringify(n.edits)}`);
  need(n.timescale===1000000000&&(trackOnly?n.movieTimescale>0:n.movieTimescale===1000000000),'actual ns profile');need(n.samples.length===Number(m.count)&&demux.length===n.samples.length&&parsed.length===demux.length,'counts');
  let ptsMismatch=0,dtsMismatch=0,durationChanges=0,nativeDemuxMismatch=0;
  const rows=['index,original_pts,original_dts,original_duration,native_pts,native_dts,native_duration,origin,demux_pts,demux_dts,demux_duration,parse_pts,parse_dts,parse_duration'];
  for(let i=0;i<n.samples.length;i++){const s=n.samples[i],o=input[Number(m.ordinal)-1+i],d=demux[i],p=parsed[i];need(s.sha256===d.sha256,'payload native-demux');if(BigInt(o.pts)!==BigInt(m.media_start)+BigInt(s.pts))ptsMismatch++;if(BigInt(o.dts)!==BigInt(m.media_start)+BigInt(s.dts))dtsMismatch++;if(BigInt(d.pts)!==BigInt(s.pts)||BigInt(d.dts)!==BigInt(s.dts)||BigInt(d.duration)!==BigInt(s.duration))nativeDemuxMismatch++;if(d.duration!==p.duration)durationChanges++;rows.push([i,o.pts,o.dts,o.duration,s.pts,s.dts,s.duration,m.media_start,d.pts,d.dts,d.duration,p.pts,p.dts,p.duration].join(','));}
  fs.writeFileSync(path.join(dir,`segment-${m.segment}-comparison.csv`),rows.join('\n')+'\n');
  console.log(`[native] ${id}/${m.segment} samples=${n.samples.length} bytes=${n.fileBytes} sha256=${n.fileSHA256} timescale=${n.timescale} movieTimescale=${n.movieTimescale} mdhdVersion=${n.mdhdVersion} mdhdDuration=${n.mdhdDuration} mvhdVersion=${n.mvhdVersion} mvhdDuration=${n.mvhdDuration}`);
  console.log(`[boundary] ${id}/${m.segment} original_pts_mismatch=${ptsMismatch} original_dts_mismatch=${dtsMismatch} native_demux_timing_mismatch=${nativeDemuxMismatch} demux_parse_duration_changes=${durationChanges} first_delta=${n.samples[0].duration} last_delta=${n.samples.at(-1).duration} ctts_entries=${n.ctts.length} edits=${JSON.stringify(n.edits)}`);
  if(caseId==='NP01'&&m.segment==='0')need(n.mdhdVersion===1&&BigInt(n.mdhdDuration)>4294967295n,'long mdhd v1');
  if(caseId!=='NP04-L')need(ptsMismatch===0&&dtsMismatch===0&&nativeDemuxMismatch===0,'normal profile exactness');
  else console.log(`[limit-observation] ${id} requested_delta=5000000000 stored_first_delta=${n.samples[0].duration} requested_last_duration=5000000000 stored_last_delta=${n.samples.at(-1).duration} acceptable=false`);
  ++files;
 }
 console.log(`[pass] ${id} characterization-only files=${manifest.length}`);
}
console.log(`[summary] characterized_cases=5 files=${files} product_profile_approved=false`);
