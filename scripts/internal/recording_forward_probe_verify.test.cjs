// FW05: 보존 actual capture의 validator 경계. 일반 MP4 parser 공격면 검증은 범위 밖이다.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const {verifySegment}=require('./recording_forward_probe_verify.cjs');
const root=path.resolve(__dirname,'../../docs/release-artifacts/v4.1.0/s11-preparation-mapping/forward-probe-data');
function csv(file){const lines=fs.readFileSync(file,'utf8').trim().split('\n'),keys=lines.shift().split(',');return lines.map(line=>Object.fromEntries(line.split(',').map((v,i)=>[keys[i],v])))}
function fixture(id,segment=0){
 const dir=path.join(root,id),prefix=path.join(dir,'forward-'+segment);
 return {original:csv(path.join(dir,'input.csv')),manifest:csv(path.join(dir,'manifest.csv'))[segment],accepted:csv(prefix+'-accepted.csv'),mux:csv(prefix+'-mux.csv'),binding:csv(prefix+'-binding.csv'),events:csv(prefix+'-events.csv'),n:JSON.parse(fs.readFileSync(prefix+'-native.json','utf8'))};
}
const captured=fixture('TP03');
for(const [id,segment,count] of [['TP01',0,250],['TP01',1,50],['TP02',0,30],['TP03',0,30],['TP04',0,12]]) {
 test(`FW05 positive actual ${id} segment${segment}`,()=>assert.equal(verifySegment(fixture(id,segment)).count,count));
}
function rejects(name,mutate,reason){test(`FW05 rejects ${name}`,()=>{const input=structuredClone(captured);mutate(input);assert.throws(()=>verifySegment(input),reason)})}
const different='f'.repeat(64);
rejects('accepted VCL hash',x=>x.accepted[0].vcl=different,/source-mux-identity/);
rejects('mux VCL hash',x=>x.mux[0].vcl=different,/source-mux-identity/);
rejects('accepted raw hash',x=>x.accepted[0].sha256=different,/actual-payload-identity/);
rejects('mux raw hash',x=>x.mux[0].sha256=different,/actual-payload-identity/);
rejects('file sample raw hash',x=>x.n.samples[0].sha256=different,/actual-payload-identity/);
rejects('source binding ordinal',x=>x.binding[0].ordinal='999',/accepted-source-binding/);
rejects('source binding PTS',x=>x.binding[0].pts_ns='66666667',/accepted-source-binding/);
rejects('per-AU origin disagreement',x=>{x.accepted[1].pts=String(BigInt(x.accepted[1].pts)-1n);x.accepted[1].dts=String(BigInt(x.accepted[1].dts)-1n)},/constant-writer-origin/);
rejects('appsrc PTS',x=>x.accepted[0].pts=String(BigInt(x.accepted[0].pts)+1n),/writer-integer-origin/);
rejects('appsrc DTS',x=>x.accepted[0].dts='1',/writer-integer-origin/);
rejects('mux PTS',x=>x.mux[1].pts=String(BigInt(x.mux[1].pts)+1n),/parser-pts-dts-boundary/);
rejects('mux DTS',x=>x.mux[1].dts=String(BigInt(x.mux[1].dts)+1000000n),/qtmux-forward-table|parser-pts-dts-boundary/);
rejects('accepted duration',x=>x.accepted[0].duration='1',/parser-pts-dts-boundary/);
rejects('used final mux duration',x=>x.mux.at(-1).duration=String(BigInt(x.mux.at(-1).duration)+1000000n),/qtmux-forward-table/);
rejects('native sample PTS tick',x=>x.n.samples[0].pts++,/qtmux-forward-table/);
rejects('native sample DTS tick',x=>x.n.samples[0].dts++,/qtmux-forward-table/);
rejects('native sample duration tick',x=>x.n.samples[0].duration++,/qtmux-forward-table/);
rejects('native timescale',x=>x.n.timescale++,/qtmux-forward-table/);
rejects('duplicate accepted VCL',x=>x.accepted[1].vcl=x.accepted[0].vcl,/non-unique-vcl/);
rejects('duplicate mux VCL',x=>x.mux[1].vcl=x.mux[0].vcl,/non-unique-vcl/);
rejects('duplicate file raw hash',x=>x.n.samples[1].sha256=x.n.samples[0].sha256,/non-unique-sha256/);
rejects('missing accepted AU',x=>x.accepted.pop(),/boundary-count/);
rejects('missing mux AU',x=>x.mux.pop(),/boundary-count/);
rejects('missing file sample',x=>x.n.samples.pop(),/boundary-count/);
rejects('missing accepted binding',x=>x.binding.pop(),/boundary-count/);
rejects('segment time translation',x=>{for(const e of x.events)if(e.kind==='segment')e.time='1'},/segment-observation/);
// 독립 정수 literal 산술: 검증 함수/결과에서 기대값을 생성하지 않는다.
test('FW05 exact native 2/3 ns leading shortfall remains uncovered',()=>{
 const denominator=3000n,nativeStart=200n*1000000000n,requestStart=66666666n*denominator;
 assert.equal(nativeStart-requestStart,2000n);
 assert.equal((nativeStart-requestStart)*3n,2n*denominator);
 assert.ok(nativeStart>requestStart);
});
test('FW05 exact cross-file 1/3 ns overlap is not a gap',()=>{
 const denominator=3000n,firstEnd=25000n*1000000000n,nextStart=8333333333n*denominator;
 assert.equal(firstEnd-nextStart,1000n);
 assert.equal((firstEnd-nextStart)*3n,denominator);
 assert.ok(nextStart<firstEnd);
});
