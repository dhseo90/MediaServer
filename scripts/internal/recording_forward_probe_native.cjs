// 기존 timing probe 제한 parser의 동작을 보존한 검증 전용 복사.
// source: recording_timing_probe.js native(); 일반 MP4 제품 지원을 주장하지 않는다.
const fs=require('fs'),crypto=require('crypto');
function need(value,message){if(!value)throw Error(message)}
function hash(bytes){return crypto.createHash('sha256').update(bytes).digest('hex')}
function native(file){
 const b=fs.readFileSync(file);need(b.length<16*1024*1024,'size-bound');const boxes=[];
 function walk(start,end,depth){need(depth<8,'depth');for(let p=start;p<end;){need(p+8<=end,'header');let size=b.readUInt32BE(p),head=8;const type=b.toString('ascii',p+4,p+8);if(size===1){need(p+16<=end,'large');size=Number(b.readBigUInt64BE(p+8));head=16}if(size===0)size=end-p;need(Number.isSafeInteger(size)&&size>=head&&p+size<=end,'box-bound');boxes.push({type,offset:p,size,data:p+head});if(['moov','trak','mdia','minf','stbl','edts'].includes(type))walk(p+head,p+size,depth+1);p+=size;}}
 walk(0,b.length,0);need(boxes.filter(x=>x.type==='trak').length===1&&!boxes.some(x=>['moof','mvex','stz2'].includes(x.type)),'single unfragmented track only');function box(t){const x=boxes.filter(x=>x.type===t);need(x.length===1,'one '+t);return x[0]}
 function entries(t,stride,fn,optional=false){const xs=boxes.filter(x=>x.type===t);if(optional&&!xs.length)return [];const x=box(t),n=b.readUInt32BE(x.data+4);need(n<=10000&&x.data+8+n*stride<=x.offset+x.size,'table '+t);return Array.from({length:n},(_,i)=>fn(x.data+8+i*stride,b[x.data]))}
 const md=box('mdhd'),version=b[md.data];need(version===0||version===1,'mdhd-version');need(md.data+(version?32:20)<=md.offset+md.size,'mdhd-size');const timescale=b.readUInt32BE(md.data+(version?20:12));need(timescale>0,'timescale');const mv=box('mvhd'),mvVersion=b[mv.data];need(mvVersion<2&&mv.data+(mvVersion?32:20)<=mv.offset+mv.size,'mvhd');const movieTimescale=b.readUInt32BE(mv.data+(mvVersion?20:12));need(movieTimescale>0,'movie timescale');
 const stts=entries('stts',8,p=>[b.readUInt32BE(p),b.readUInt32BE(p+4)]),ctts=entries('ctts',8,(p,v)=>{need(v<2,'ctts-version');return [b.readUInt32BE(p),v?b.readInt32BE(p+4):b.readUInt32BE(p+4)]},true);
 const el=boxes.filter(x=>x.type==='elst');let edits=[];if(el.length){const v=b[el[0].data];need(v<2,'elst-version');edits=entries('elst',v?20:12,p=>v?[b.readBigUInt64BE(p).toString(),b.readBigInt64BE(p+8).toString(),b.readInt32BE(p+16)]:[String(b.readUInt32BE(p)),String(b.readInt32BE(p+4)),b.readInt32BE(p+8)])}
 const sz=box('stsz'),constant=b.readUInt32BE(sz.data+4),count=b.readUInt32BE(sz.data+8);need(count<=10000&&sz.data+12+(constant?0:count*4)<=sz.offset+sz.size,'stsz');const sizes=Array.from({length:count},(_,i)=>constant||b.readUInt32BE(sz.data+12+i*4));
 const chunks=boxes.some(x=>x.type==='stco')?entries('stco',4,p=>b.readUInt32BE(p)):entries('co64',8,p=>Number(b.readBigUInt64BE(p)));
 const stsc=entries('stsc',12,p=>[b.readUInt32BE(p),b.readUInt32BE(p+4),b.readUInt32BE(p+8)]);need(stsc.length&&stsc[0][0]===1,'stsc');let sample=0,hashes=[];
 chunks.forEach((offset,i)=>{let s=stsc[0];for(const e of stsc)if(e[0]<=i+1)s=e;for(let j=0;j<s[1];j++){need(sample<count&&offset+sizes[sample]<=b.length,'sample-bound');hashes.push(hash(b.subarray(offset,offset+sizes[sample])));offset+=sizes[sample++];}});need(sample===count,'sample-count');
 need(stts.reduce((s,e)=>s+e[0],0)===count&&(!ctts.length||ctts.reduce((s,e)=>s+e[0],0)===count),'expanded count bound');const durations=stts.flatMap(([n,d])=>{need(d>0,'positive duration');return Array(n).fill(d)}),offsets=ctts.length?ctts.flatMap(([n,d])=>Array(n).fill(d)):Array(count).fill(0);let dts=0;const samples=durations.map((duration,i)=>{const r={index:i,dts,pts:dts+offsets[i],duration,sha256:hashes[i]};dts+=duration;need(Number.isSafeInteger(dts)&&Number.isSafeInteger(r.pts)&&r.pts>=0,'tick-range');return r});return {fileBytes:b.length,fileSHA256:hash(b),timescale,movieTimescale,stts,ctts,edits,boxes,samples};
}
module.exports={native};
