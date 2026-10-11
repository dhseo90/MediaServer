// 파일 용도: 실제 제품 owner 수집의 분할/누락/오류/마지막 수명 반례. 제품 실행 PASS와 구분.
import assert from 'node:assert/strict';
import {resourceTraceCollector,collectResourceTrace,currentResourceTrace,finishResourceTrace} from './recording_resource_trace.mjs';
const row=(seq,phase,extra={})=>({pid:42,seq,phase,elapsedMs:seq*5000,ram:0,ramPeak:10,ramLimit:671088640,ramRejected:0,scratchDisk:0,scratchDiskPeak:10,scratchDiskLimit:100,scratchFd:0,scratchFdPeak:2,scratchFdLimit:10,scratchRam:0,preservedDisk:0,preservedFd:0,readerCleanupHealthy:true,...extra});
const line=r=>Buffer.from('[recording-resource] '+JSON.stringify(r)+'\n');
const state=resourceTraceCollector(42);const first=line(row(0,'opened'));collectResourceTrace(state,first.subarray(0,21));collectResourceTrace(state,first.subarray(21));assert.equal(currentResourceTrace(state).seq,0);
collectResourceTrace(state,line(row(1,'before-Finish',{ram:10})));collectResourceTrace(state,line(row(2,'after-Finish',{ram:10,scratchDisk:10,scratchFd:1})));collectResourceTrace(state,line(row(3,'after-storage-destruction')));assert.equal(finishResourceTrace(state).status,'captured');
for(const [name,rows] of Object.entries({missing:[],sequence:[row(1,'opened')],over:[row(0,'opened',{ram:671088641})],rejected:[row(0,'opened',{ramRejected:1})],damaged:[row(0,'opened',{readerCleanupHealthy:false})],notFinal:[row(0,'opened')],wrongPid:[row(0,'opened',{pid:43})],residue:[row(0,'opened'),row(1,'before-Finish'),row(2,'after-Finish'),row(3,'after-storage-destruction',{ram:1})]})){
 const s=resourceTraceCollector(42);for(const r of rows)collectResourceTrace(s,line(r));assert.throws(()=>finishResourceTrace(s),name);
}
const cut=resourceTraceCollector(42);collectResourceTrace(cut,Buffer.from('[recording-resource] {'));assert.throws(()=>finishResourceTrace(cut));
console.log('PASS actual resource parser split sequence budget rejection missing truncated Finish-versus-last-owner');
