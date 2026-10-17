#!/usr/bin/env python3
"""R140 test-only byte envelope. No product execution; unknown != zero.
The uint64/registry envelope is deliberately NOT a reachable workload model.
"""
import hashlib, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
U64 = 2**64-1
NAMES = 'unattributed model sourceBatch retryBatch sourceCut preparation matches page response preparedNative retainedRaw catalogRow scratch'.split()
def wire(row):
    return ('[memory-attribution] '+json.dumps(row,separators=(',',':'))+'\n').encode()
def envelope(n, models, pools, events, phase='after-storage-destruction'):
    # Same keys, array widths and scalar types as Emit; not conservation-valid state.
    return dict(pid=2147483647,phase=phase,sampleStartNs=n,ownerCapturedNs=n,rolesCapturedNs=n,processCapturedNs=n,
        rssBytes=min(n,2**63-1),footprintBytes=min(n,2**63-1),residencyUsed=n,attributedSearchBytes=n,unattributedSearchBytes=n,
        valid=False,loss=False,tickets={k:[n,n] for k in NAMES},
        ticketWitness=dict(peak=n,peakNs=n,atPeak=[n]*15,sites=[[n]*13 for _ in range(15)],unknownPeak=[n]*4,
                           atUnknownPeak=[n]*15,unknownLive=[n]*15,allocator=[False,False]+[n]*5+[min(n,2**32-1)]),
        models=[[n,n,n,n,False,n,False] for _ in range(models)],snapshotPools=[[n]*9+[False] for _ in range(pools)],
        live=[n]*14,peak=[n]*14,totals=[n]*20,recentEvents=[[n]*6 for _ in range(events)],sampleEndNs=n)
def component_bytes(row):
    # Disjoint bytes: top-level field names/value/separators plus prefix/braces/newline.
    parts={};keys=list(row)
    for i,k in enumerate(keys):
        parts[k]=len((json.dumps(k)+':'+json.dumps(row[k],separators=(',',':'))+(',' if i<len(keys)-1 else '')).encode())
    parts['envelope']=len('[memory-attribution] {}\n')
    assert sum(parts.values())==len(wire(row))
    return parts

def report():
    formal=envelope(U64,128,16,32)
    safe=envelope(2**53-1,128,16,32)
    empty=envelope(U64,0,0,32)
    emitter=(ROOT/'include/recording/recording_memory_diagnostic_output.h').read_text()
    for token in ['char line[16384]','std::array<Model,128>','std::array<Pool,16>','std::array<Event,32>','complete&&sink(line,offset)']:
        assert token in emitter,token
    return {'decision':'HOLD_45_LOG_BUDGET_PROOF_GAP','productRuns':0,'longRuns':0,
        'caps':{'memoryEmittedRecordStrictlyLessThan':16384,'processStdoutPlusStderrInclusive':4194304},
        'rowCounts':{'main2700UpperWithFourBoundaries':544,'entire2880BudgetConservativeUpper':580,'emitterSequenceCap':1600,
                     'condition':'one PID; Poll cannot emit faster than5s; four explicit boundaries; budget includes startup/shutdown'},
        'fixedWidths':{'tickets':13,'sites':15,'siteFields':13,'live':14,'peak':14,'totals':20,'recentEventsCap':32},
        'formalEnvelope':{'uint64Max':U64,'modelSlots':128,'poolSlots':16,'bytes':len(wire(formal)),
            'componentBytes':component_bytes(formal),'feasible':False,'reason':'type/registry envelope only; violates owner/clock/conservation constraints; not BLOCKED proof'},
        'safeIntegerEnvelope':{'bytes':len(wire(safe)),'feasible':False,'reason':'collector scalar representation only; not simultaneous-state proof'},
        'formalWithoutModelsPools':{'bytes':len(wire(empty)),'componentBytes':component_bytes(empty),'feasible':False},
        'modelIncrementBytesAtUint64Width':len(wire(envelope(U64,2,0,32)))-len(wire(envelope(U64,1,0,32))),
        'poolIncrementBytesAtUint64Width':len(wire(envelope(U64,0,2,32)))-len(wire(envelope(U64,0,1,32))),
        'provedNormalMaximumRecordBytes':None,'provedNormalProcessBytes':None,'provedDeletionBytes':None,
        'emittedMemoryTransportCeiling':16383,'memoryTransportOnly580RowCeiling':580*16383,
        'transportCeilingIsCapacityProof':False,
        'historical139':{'representative':3456040,'numericSensitivity':4230340,'excess':36036,'notSourceFeasibleProof':True},
        'sumSets':['memory','resource','completion+evidence(shared cap)','state/deletion-related','search+visual','startup/shutdown+other'],
        'combination':'Do not add registry/type maxima as a simultaneously reachable execution. Normal workload sum remains unknown.'}
if __name__=='__main__':
    print(json.dumps(report(),ensure_ascii=False,indent=2))
