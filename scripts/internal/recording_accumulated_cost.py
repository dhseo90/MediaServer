#!/usr/bin/env python3
"""R165 BLOCKED_PRE_EXECUTION: generated owned copies only; actual selected phase gate unqualified."""
import hashlib,json,shlex,subprocess,sys,os,stat
from pathlib import Path
from recording_http_cost_overlay import replace
REPO=Path(__file__).resolve().parents[2]
SCRIPTS=REPO/'scripts/internal'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def generate(out, attribution=False, mandatory_ledger=False, limited_search=False, build_root=None, official_contract=None):
    if limited_search and not mandatory_ledger:raise ValueError('limited-search-requires-mandatory-ledger')
    if official_contract is not None and (not mandatory_ledger or limited_search or build_root is not None):raise ValueError('official-closeout-profile')
    out.mkdir(mode=0o700)
    probe=(SCRIPTS/'recording_http_cost_probe.h').read_text()
    probe=replace(probe,'return id==10||id==11?1:id==12||id==13?2:id==60?3:id>=20&&id<60?4:id>=61?5:6;','return id%3==0?3:1;')
    probe=replace(probe,'id>128','id>15')
    probe=replace(probe,'if(header_count!=1)','if(!header_count&&value.empty())return 0;if(header_count!=1)')
    probe=replace(probe,'valid=id&&id<=128;if(!valid)Lose(1);else if','valid=id&&id<=15;if(id&&!valid)Lose(1);else if(valid&&')
    probe=replace(probe,'seen[id-1].exchange(true)){','seen[id-1].exchange(true))){')
    probe=replace(probe,'{if(!id)Lose(1);}','{}')
    probe=replace(probe,'~Search(){if(d.cost_loss||!d.id)Lose(7);if(!id)return;','~Search(){if(!id)return;if(d.cost_loss||!d.id)Lose(7);')
    if mandatory_ledger:probe='#define MEDIA_SERVER_VERIFY_MANDATORY_LEDGER 1\n'+probe
    (out/'recording_http_cost_probe.h').write_text(probe)
    names=['src/ingress/recording_search_application_service.cpp','src/ingress/webrtc_http_server_runtime.cpp','src/ingress/webrtc_http_server.cpp']
    binding={}
    for name in names:
        s=(REPO/name).read_text()
        if name.endswith('recording_search_application_service.cpp'):
            s=replace(s,'recording::SearchDiagnostic diagnostic(catalog_.SearchResidency().get());','recording::SearchDiagnostic diagnostic(catalog_.SearchResidency().get());\n    if(r154::active){diagnostic.id=r154::active->id;diagnostic.entered=recording::SearchDiagnostic::Tick();}r154::Search selected(diagnostic);')
        elif name.endswith('webrtc_http_server.cpp'):
            s=replace(s,'std::optional<HttpRequest> ReadHttpRequest(int client_fd, HttpResponse* error_response) {','std::optional<HttpRequest> ReadHttpRequest(int client_fd, HttpResponse* error_response) {\n    r154::header_count=0;')
            s=replace(s,'        request.headers[key] = value;','        r154::HeaderSeen(key);request.headers[key] = value;')
        else:
            s=replace(s,'            const auto accepted_at =','            const auto selected_accept=r154::Tick();\n            const auto accepted_at =')
            s=replace(s,'site_request_diagnostic_enabled, accepted_at] {','site_request_diagnostic_enabled, accepted_at,selected_accept] {')
            s=replace(s,'auto request_opt = ReadHttpRequest(client_fd, &response);','''auto request_opt = ReadHttpRequest(client_fd, &response);
                const unsigned selected_id=request_opt?r154::Correlation(HeaderValue(*request_opt,"x-r154-id")):0;
                if(selected_id){const auto q=ParseQueryString(request_opt->query);
                    const auto channel=q.find("channelIds"),object=q.find("object");
                    const bool a=selected_id%3==0;
                    if(request_opt->method!="GET"||request_opt->path!="/ops/api/recordings/search"||channel==q.end()||channel->second!=(a?"1":"9101")||(a&&(object==q.end()||object->second!="synthetic-target")))r154::Lose(8);
                }
                r154::Server selected_request(selected_id,selected_accept);''')
            s=replace(s,'site_diagnostic.Emit(SiteOperationsRequestDiagnostic::Phase::HandlerBegin);','selected_request.handler=r154::Tick();site_diagnostic.Emit(SiteOperationsRequestDiagnostic::Phase::HandlerBegin);')
            s=replace(s,'site_diagnostic.Emit(SiteOperationsRequestDiagnostic::Phase::HandlerEnd);','selected_request.prepared=r154::Tick();site_diagnostic.Emit(SiteOperationsRequestDiagnostic::Phase::HandlerEnd);')
            s=replace(s,'const bool sent = SendAllObserved(client_fd, encoded, observation.get());','selected_request.sendBegin=r154::Tick();const bool sent = SendAllObserved(client_fd, encoded, observation.get());selected_request.sendEnd=r154::Tick();selected_request.sent=sent;')
            s=replace(s,'                active_connection_guard.Finish();','                selected_request.End();active_connection_guard.Finish();')
        p=out/Path(name).name;p.write_text('#include "recording_http_cost_probe.h"\n'+s)
        binding[name]={'original':sha(REPO/name),'overlay':sha(p)}
    # Import paths are absolute; original mixed/A functions remain the workload owners.
    s=(SCRIPTS/'v450_recording_a_mixed.mjs').read_text()
    import re
    s=re.sub(r"(['\"])\./([^'\"]+)\1",lambda m:json.dumps(str(SCRIPTS/m[2])),s)
    s=replace(s,"const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');",'const repo='+json.dumps(str(REPO))+';')
    s=replace(s,'stateDiagnose?2700000','stateDiagnose?1800000')
    s=replace(s,'stateDiagnose?2880000','stateDiagnose?1870000')
    s=replace(s,"BIN_PATH:path.join(repo,'build-gst-onnx/media_server')","BIN_PATH:process.env.R165_BINARY")
    s=replace(s,'VERIFY_RECORDING_SEARCH_TRACE:1','VERIFY_RECORDING_SEARCH_TRACE:0')
    s=replace(s,'VERIFY_RECORDING_LATENCY_TRACE:1','VERIFY_RECORDING_LATENCY_TRACE:0,VERIFY_RECORDING_COMPLETION_TRACE:1')
    s=replace(s,'VERIFY_RECORDING_LATENCY_SLOW_ONLY:1','VERIFY_RECORDING_LATENCY_SLOW_ONLY:0')
    s=replace(s,'aLoad.start(begin,duration);','aLoad.start(begin,2700000); // original minute schedule; outer observation is bounded to 1800s')
    s=replace(s,'async function evidenceFetch(app,route,method=\'GET\',body){','''async function evidenceFetch(app,route,method='GET',body,selectedId=0){
 if(!selectedId&&method==='GET'&&route.split('?')[0]==='/ops/api/recordings/search'&&new URLSearchParams(route.split('?')[1]).get('channelIds')==='1')selectedId=aSelection(aLoad?.schedule?.rows.at(-1)?.slot);
 if(selectedId)selectedTrace.start(selectedId);''')
    s=replace(s,"report:value=>console.log('[mixed-http-timing] '+JSON.stringify({...value,routeKind})),","report:value=>{console.log('[mixed-http-timing] '+JSON.stringify({...value,routeKind}));if(selectedId){const row={...value,id:selectedId,loss:false,observationMs:performance.now()-observationStart,channels:progress.status(performance.now()).channels};console.log('[R165-client] '+JSON.stringify(row));selectedTrace.client(row);}},")
    s=replace(s,"headers:{Cookie:app.cookie,...(method==='POST'","headers:{Cookie:app.cookie,...(selectedId?{'X-R154-ID':String(selectedId)}:{}),...(method==='POST'")
    s=replace(s,'const all=await Promise.all(routes.map(route=>evidenceFetch(app,route)));','const selectedBatch=selectedBatchOrdinal++;const all=await Promise.all(routes.map((route,i)=>evidenceFetch(app,route,\'GET\',undefined,selection(selectedBatch,i))));')
    s=replace(s,'function budget(){if(cancelled)',"function budget(){if(selectedTrace.failure())throw Error(selectedTrace.failure().code);if(cancelled)")
    s=replace(s,"collectResourceTrace(app.resourceTrace,chunk);","collectResourceTrace(app.resourceTrace,chunk);") # assert original boundary
    s=replace(s,"captureBoundedProcessLog(app,chunk,bytes=>fs.writeSync(app.logFd,bytes),()=>child.kill('SIGTERM'));","captureBoundedProcessLog(app,chunk,bytes=>fs.writeSync(app.logFd,bytes),()=>child.kill('SIGTERM'));selectedTrace.append(chunk,stream===child.stdout?0:1);if(selectedTrace.failure()){if(!selectedFailureReported){selectedFailureReported=true;console.error('[R165-first-failure] '+JSON.stringify(selectedTrace.failure()));}cancelled=true;child.kill('SIGTERM');}")
    s=replace(s,'await evidenceLoad(first);await aLoad.tick(first);cadence();','await evidenceLoad(first);await aLoad.tick(first);cadence();if(!aLoad.active&&selectedTrace.ready(progress.status(performance.now()).channels)&&Object.values(progress.status(performance.now()).channels).every(c=>!preparationContract.requiresDeletion||c.deleted>0)&&mixed.windows.every(w=>w.structured>0&&w.visual>0&&w.evidence>0&&w.visualEvidence>0))break;')
    s=replace(s,'await aLoad.finish(first);if(!short)requireMixedWindows(mixed.windows);',"await aLoad.finish(first);if(!short)requireMixedWindows(mixed.windows);const bound=selectedTrace.complete();console.log('[R165-qualified] '+JSON.stringify({requests:bound.client.length,goalMet:selectedTrace.ready(progress.status(performance.now()).channels)}));")
    # Keep original latency gate/result, but perform diagnostic shutdown before reporting its failure.
    s=replace(s,'if(!memoryDiagnose)check(orderedLatencies.at(Math.ceil(orderedLatencies.length*.95)-1)<=2000&&orderedLatencies.at(-1)<=5000,"V440 successful search latency");else ', '')
    s=replace(s,"console.log('[memory-latency-diagnostic] '+JSON.stringify({count:orderedLatencies.length,p95:orderedLatencies.at(Math.ceil(orderedLatencies.length*.95)-1),max:orderedLatencies.at(-1),gate:false}))","console.log('[R165-latency-gate] '+JSON.stringify({count:orderedLatencies.length,p95:orderedLatencies.at(Math.ceil(orderedLatencies.length*.95)-1),max:orderedLatencies.at(-1),limitP95:2000,limitMax:5000,pass:latencyPassed=orderedLatencies.at(Math.ceil(orderedLatencies.length*.95)-1)<=2000&&orderedLatencies.at(-1)<=5000}))")
    s=replace(s,'const searchFailure=searchFailureSummary(text,app.requiresFrameTrace);','const searchFailure=searchFailureSummary(text,false);')
    s=replace(s,"if(slow.status!=='captured'){failed++;console.log('[fail] slow-diagnostic-unavailable');}","if(text.includes('[recording-latency]')){failed++;console.log('[fail] forbidden-global-trace');}")
    s=replace(s,"mode:memoryDiagnose?'v450-memory-attribution-diagnostic'","mode:true?'r165-selected-accumulated-diagnostic':memoryDiagnose?'v450-memory-attribution-diagnostic'")
    s=replace(s,'stateDiagnosticPass:stateDiagnose&&failed===0&&!!phaseResult','stateDiagnosticPass:false')
    s=replace(s,"status:resultFailed?'FAIL':'PASS',exit:resultFailed?1:0", "diagnosticCompleted:failed===0&&!!phaseResult,latencyPassed,status:resultFailed||failed||latencyPassed!==true?'FAIL':'PASS',exit:resultFailed||failed||latencyPassed!==true?1:0")
    s=replace(s,'process.exitCode=resultFailed?1:0','process.exitCode=resultFailed||failed||latencyPassed!==true?1:0')
    s=replace(s,'}catch(error){failed++;if(error.workspaceDecision)',"}catch(error){failed++;if(!selectedFailureReported){selectedFailureReported=true;console.error('[R165-first-failure] '+JSON.stringify({code:selectedTrace.failure()?.code??'functional-failure',atMs:performance.now()}));}if(error.workspaceDecision)")
    # Explicit search-only mode exists only in this selected, instrumented overlay.
    # The original mixed runner and all historical diagnostic modes are unchanged.
    s=replace(s,"const stateDiagnose=args.length===1&&args[0]==='--state-diagnostic';", "const performanceDiagnose=args.length===1&&args[0]==='--search-performance-diagnostic';\nif(performanceDiagnose)assertSearchPerformanceCapacity();\nconst stateDiagnose=performanceDiagnose||(args.length===1&&args[0]==='--state-diagnostic');")
    s=replace(s,'memoryObservationMode(args)',"memoryObservationMode(performanceDiagnose?['--state-diagnostic']:args)")
    s=replace(s,'if(!aLoad.active&&selectedTrace.ready','if(!performanceDiagnose&&!aLoad.active&&selectedTrace.ready')
    s=replace(s,'const bound=selectedTrace.complete();','const bound=selectedTrace.complete();selectedBound=bound;')
    s=replace(s,'const completion=app.completionTrace.finish();','const completion=app.completionTrace.finish();performanceCompletion.push(completion);')
    s=replace(s,'if(!processLogCaptureComplete(app,Buffer.byteLength(text)))', 'performanceLogs.push(processLogCaptureComplete(app,Buffer.byteLength(text)));if(!processLogCaptureComplete(app,Buffer.byteLength(text)))')
    s=replace(s,"mode:true?'r165-selected-accumulated-diagnostic'", "mode:performanceDiagnose?'v450-search-performance-diagnostic':true?'r165-selected-accumulated-diagnostic'")
    s=replace(s,'};try{artifacts.checkpoint({...final,', "};if(performanceDiagnose){try{selectedBound=selectedTrace.complete();}catch{selectedBound=null;}}if(performanceDiagnose)final.searchPerformance=searchPerformanceResult({final,trace:selectedTrace.failure()?null:selectedBound,completion:performanceCompletion,logsCaptured:performanceLogs.length===processes.length&&performanceLogs.every(Boolean),batches:selectedBatchOrdinal});try{artifacts.checkpoint({...final,")
    s=replace(s,"status:resultFailed||failed||latencyPassed!==true?'FAIL':'PASS',exit:resultFailed||failed||latencyPassed!==true?1:0", "status:performanceDiagnose?final.searchPerformance.status:resultFailed||failed||latencyPassed!==true?'FAIL':'PASS',exit:performanceDiagnose?(final.searchPerformance.status==='PASS'?0:1):resultFailed||failed||latencyPassed!==true?1:0")
    s=replace(s,'diagnosticCompleted:failed===0&&!!phaseResult', "diagnosticCompleted:performanceDiagnose?final.searchPerformance.status==='PASS':failed===0&&!!phaseResult")
    s=replace(s,'process.exitCode=resultFailed||failed||latencyPassed!==true?1:0', "process.exitCode=performanceDiagnose?(final.searchPerformance.status==='PASS'?0:1):resultFailed||failed||latencyPassed!==true?1:0")
    s="import {selection,aSelection,costCollector,assertSearchPerformanceCapacity,searchPerformanceResult,checkpointSearchPerformanceReport} from "+json.dumps(str(SCRIPTS/'recording_accumulated_cost.mjs'))+";\nlet selectedBatchOrdinal=0,selectedFailureReported=false,latencyPassed=null,selectedBound=null,officialFirstFailure=null;const selectedTrace=costCollector(),performanceCompletion=[],performanceLogs=[];\n"+s
    if mandatory_ledger:s=mandatory_overlay(out,binding,s)
    elif attribution:s=attribution_overlay(out,binding,s)
    if limited_search:s=limited_overlay(s)
    # Preserve the first observation exception separately from final Report storage.
    s=replace(s,'}catch(error){failed++;if(!selectedFailureReported)',
        "}catch(error){failed++;if(performanceDiagnose&&officialFirstFailure===null)officialFirstFailure={name:error?.name??'Error',message:error?.message??String(error),code:error?.code??null};if(!selectedFailureReported)")
    # Only the official final report changes whitespace. Historical diagnostics
    # and Limited keep the shared checkpoint implementation and its consumers.
    s=replace(s,'try{artifacts.checkpoint({...final,',
        'try{(performanceDiagnose?report=>checkpointSearchPerformanceReport(artifacts,report,officialFirstFailure):report=>artifacts.checkpoint(report))({...final,')
    if official_contract is not None:
        contract_path=Path(official_contract)
        if not contract_path.is_absolute():raise ValueError('official-contract-path')
        # This opt-in is used only by the SHA-bound external official Runner.
        # Historical generated drivers/wrappers keep their unconditional guard.
        s=replace(s,'if(performanceDiagnose)assertSearchPerformanceCapacity();',
            'if(performanceDiagnose)assertSearchPerformanceCapacity(JSON.parse(fs.readFileSync('+json.dumps(str(contract_path))+')));')
        s=replace(s,".filter(n=>!n.startsWith('media-server-current-observer-'))",
            ".filter(n=>performanceDiagnose?n!=='work':!n.startsWith('media-server-current-observer-'))")
        # Reserve closeout in live checks too. Keep returned storage as measured
        # bytes: the reservation is not a file and must not be counted twice by
        # subsequent sidecar/response admission. Native anonymous bytes remain
        # charged by the existing status/sample collectors.
        s=replace(s,'  const bounds=admitWorkspaceSnapshot({storage:combined,',
            "  if(performanceDiagnose)admitWorkspaceSnapshot({storage:combined,baseline:workspace??{fixedBytes:0,capBytes:448*1024*1024},additionalBytes:6*1024*1024,context:{kind:'official-live-closeout-reserve'}},workspaceFailure);\n  const bounds=admitWorkspaceSnapshot({storage:combined,")
        s=replace(s,'additionalBytes:bytes,\n  context:',
            'additionalBytes:bytes+(performanceDiagnose?6*1024*1024:0),\n  context:')
        s=replace(s,'metrics:point,\n      expectedPid:',
            'metrics:point,additionalBytes:performanceDiagnose?6*1024*1024:0,\n      expectedPid:')
        s=replace(s,"fs.statSync(path.join(repo,'build-gst-onnx/media_server'))","fs.statSync(process.env.R165_BINARY)",2)
        # Final upper-bound assumptions are checked against actual report inputs.
        s=replace(s,'report=>checkpointSearchPerformanceReport(artifacts,report,officialFirstFailure)',
            "report=>{if(report.status==='PASS'&&(report.processCount!==1||report.evidenceLoad.searchSuccess+report.evidenceLoad.searchUnavailable>484||report.aLoad.initialStore.names.length>3||report.aLoad.schedule.length>45))throw Error('official-report-premise');const receipt=checkpointSearchPerformanceReport(artifacts,report,officialFirstFailure);console.log('[official-report-artifact] '+JSON.stringify({file:'report.json',bytes:receipt.bytes,sha256:receipt.sha256}));return receipt;}")
        # The complete report already passed the bounded writer and SHA readback.
        # Keep per-sample diagnostics: the report contains only their summaries.
        s=replace(s,'console.log(JSON.stringify(final));process.exitCode=',
            'if(!performanceDiagnose)console.log(JSON.stringify(final));process.exitCode=')
        s=replace(s,'checkpointSearchPerformanceReport} from ',
            'checkpointSearchPerformanceReport,createOfficialObservationEvidence,preserveOfficialHttpError} from ')
        s=replace(s,'const artifacts=createReviewTestArtifacts(repo);', '''const artifacts=createReviewTestArtifacts(repo);
let officialObservations=null,officialHttpFailure=null,officialControlOrdinal=0;
function getOfficialObservations(){return officialObservations??=createOfficialObservationEvidence(artifacts,{admit:additionalBytes=>
 admitWorkspaceSnapshot({storage:storageNow(),baseline:workspace??{fixedBytes:0,capBytes:448*1024*1024},additionalBytes:additionalBytes+6*1024*1024,
 context:{kind:'official-observation-write'}},workspaceFailure)});}
function officialObservation(kind,value){if(performanceDiagnose)getOfficialObservations().append(kind,value);else console.log('['+kind+'] '+JSON.stringify(value));}''')
        for kind in ['memory-attribution-cycle','current-observation','visual-query-observation','root-storage']:
            token="console.log('["+kind+"] '+JSON.stringify("
            # Root has both regular and failure paths. Keep all values/branches.
            count=s.count(token)
            if count<1:raise ValueError('official-observation-producer-missing:'+kind)
            s=replace(s,token,"officialObservation('"+kind+"',(",count)
        s=replace(s,'function budget(){',
            "function budget(){if(performanceDiagnose&&officialHttpFailure)throw officialHttpFailure;if(performanceDiagnose&&officialObservations?.failure())throw Error(officialObservations.failure().message);")
        s=replace(s,'async function request(app,method,route,body,observeStatus=false){const begin=',
            'async function request(app,method,route,body,observeStatus=false){const localRequestId=performanceDiagnose?\'control-\'+(++officialControlOrdinal):null;const begin=')
        old="if(response.status!==200&&response.status!==201){console.log('[http-failed-response] '+JSON.stringify({method,route,status:response.status,body:response.bytes.toString()}));throw Error('http-status-'+response.status);}"
        s=replace(s,old,"""if(response.status!==200&&response.status!==201){
 if(performanceDiagnose){
  officialHttpFailure=preserveOfficialHttpError(artifacts,{bytes:response.bytes,status:response.status,requestId:localRequestId,method,route,
   admit:additionalBytes=>admitWorkspaceSnapshot({storage:storageNow(),baseline:workspace??{fixedBytes:0,capBytes:448*1024*1024},additionalBytes:additionalBytes+6*1024*1024,context:{kind:'official-http-error-write'}},workspaceFailure)});
  officialFirstFailure??={name:officialHttpFailure.name,message:officialHttpFailure.message,code:officialHttpFailure.code??null};
  console.log('[http-failed-response-artifact] '+JSON.stringify(officialHttpFailure.httpReference));throw officialHttpFailure;
 }
 console.log('[http-failed-response] '+JSON.stringify({method,route,status:response.status,body:response.bytes.toString()}));throw Error('http-status-'+response.status);
}""")
        s=replace(s,'const receipt=checkpointSearchPerformanceReport(artifacts,report,officialFirstFailure);', '''let observationError=null;
try{const observation=getOfficialObservations().finish(report.status==='PASS',officialFirstFailure);
 if(report.status==='PASS'&&(observation.counts[0]!==report.resources.sampleCount||observation.counts[1]!==report.resources.sampleCount||observation.counts[2]!==report.evidenceLoad.searchSuccessByClient[2]+report.evidenceLoad.searchSuccessByClient[3]||observation.counts[3]<report.resources.sampleCount+2))throw Error('official-observation-report-count');
 console.log('[official-observation-artifact] '+JSON.stringify(observation));
}catch(error){observationError=error;}
const receipt=checkpointSearchPerformanceReport(artifacts,observationError?{...report,status:'INCOMPLETE',exit:1}:report,officialFirstFailure??(observationError?{name:observationError.name,message:observationError.message}:null));
if(observationError)throw observationError;''')
        # Explicit official Driver/A call sites, not global console interception.
        s=replace(s,'preserveOfficialHttpError} from ','preserveOfficialHttpError,createOfficialRemainingEvidence} from ')
        leave={'fixture-profile','official-report-artifact','official-observation-artifact','http-failed-response-artifact'}
        def redirect_output(m):
            return m[0] if m[3] in leave else "officialRemainingOutput('"+('stdout' if m[1]=='log' else 'stderr')+"',"+m[2]+'['+m[3]+']'
        s=re.sub(r"console\.(log|error)\((['\"])\[([A-Za-z0-9_-]+)\]",redirect_output,s)
        s=replace(s,'let officialObservations=null,', '''let officialRemaining=null,officialRemainingError=null,officialRemainingFailurePrinted=false,officialResponseOrdinal=0;
function getOfficialRemaining(){return officialRemaining??=createOfficialRemainingEvidence(artifacts,{admit:additionalBytes=>admitWorkspaceSnapshot({storage:storageNow(),baseline:workspace??{fixedBytes:0,capBytes:448*1024*1024},additionalBytes:additionalBytes+6*1024*1024,context:{kind:'official-remaining-write'}},workspaceFailure)});}
function officialRemainingOutput(stream,text){
 if(!performanceDiagnose){console[stream==='stdout'?'log':'error'](text);return;}
 try{if(text.startsWith('[workspace-fixed] ')){if(Buffer.byteLength(text)+1>16384){getOfficialRemaining().diagnostic(stream,text);throw Error('official-fixed-line-cap');}console.log(text);return;}
  getOfficialRemaining().diagnostic(stream,text);}catch(error){officialRemainingError??=error;if(!officialRemainingFailurePrinted){officialRemainingFailurePrinted=true;console.error('[remaining-evidence-incomplete]');}}
}
function officialRemainingResponseRoute(route){const p=route.split('?')[0];return p.includes('/evidence')||p.includes('/a-record')||p==='/ops/api/recordings/search'&&new URLSearchParams(route.split('?')[1]).get('channelIds')==='1';}
let officialObservations=null,''')
        s=replace(s,'function budget(){if(performanceDiagnose&&officialHttpFailure)',
            'function budget(){if(performanceDiagnose&&officialRemainingError)throw officialRemainingError;if(performanceDiagnose&&officialHttpFailure)')
        s=replace(s,"async function evidenceFetch(app,route,method='GET',body,selectedId=0){",
            "async function evidenceFetch(app,route,method='GET',body,selectedId=0){\n const remainingRequestId=performanceDiagnose?'response-'+(++officialResponseOrdinal):null;")
        s=replace(s,'failureBody=result.bytes;failureElapsedMs=', '''failureBody=result.bytes;
 if(performanceDiagnose&&officialRemainingResponseRoute(route))try{getOfficialRemaining().response(result.bytes,{requestId:remainingRequestId,mandatoryRequestId:failureId||null,method,route,status:result.status,elapsedMs:performance.now()-started,activeA:aLoad?.active??null,scheduledA:aLoad?.schedule?.rows.at(-1)??null});}catch(error){officialRemainingError??=error;throw error;}
 failureElapsedMs=''')
        a_path=out/'s03_a_load.mjs'
        a=(SCRIPTS/'v450_recording_a_load.mjs').read_text()
        a=replace(a,'constructor({root,seedInfo,request,check,budget}){','constructor({root,seedInfo,request,check,budget,output}){this.output=output??console.log;')
        a=replace(a,'console.log(\'[A-',"this.output('[A-",4)
        a_path.write_text(a)
        binding['scripts/internal/v450_recording_a_load.mjs']={'original':sha(SCRIPTS/'v450_recording_a_load.mjs'),'overlay':sha(a_path)}
        s=replace(s,json.dumps(str(SCRIPTS/'v450_recording_a_load.mjs')),json.dumps(str(a_path)))
        s=replace(s,'new MixedALoad({root,seedInfo,request:evidenceFetch,check,budget})',"new MixedALoad({root,seedInfo,request:evidenceFetch,check,budget,output:text=>officialRemainingOutput('stdout',text)})")
        s=replace(s,'let observationError=null;', '''let remainingError=officialRemainingError;
try{const remaining=getOfficialRemaining().finish(report.status==='PASS'&&!remainingError,officialFirstFailure);console.log('[official-remaining-artifact] '+JSON.stringify(remaining));}catch(error){remainingError??=error;}
if(remainingError){report={...report,status:'INCOMPLETE',exit:1};officialFirstFailure??={name:remainingError.name,message:remainingError.message,code:remainingError.code??null};}
let observationError=null;''')
        s=replace(s,'if(observationError)throw observationError;','if(observationError||remainingError)throw observationError??remainingError;')
    if build_root is not None:
        if not limited_search:raise ValueError('isolated-build-limited-only')
        b=isolated_build_root(build_root)
        s=replace(s,'BIN_PATH:process.env.R165_BINARY','BIN_PATH:'+json.dumps(str(b.parent/'media_server')))
        s=s.replace("path.join(repo,'build-gst-onnx')",json.dumps(str(b)))
        s=s.replace("path.join(repo,'build-gst-onnx/libmedia_server_runtime.a')",json.dumps(str(b/'libmedia_server_runtime.a')))
    (out/'mixed.mjs').write_text(s)
    wrapper=(SCRIPTS/'verify_v450_recording_a_mixed.sh').read_text()
    wrapper=replace(wrapper,'observer_driver="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"','observer_driver='+shlex.quote(str(SCRIPTS)))
    wrapper=replace(wrapper,'node "$observer_driver/v450_recording_a_mixed.mjs"', 'node '+shlex.quote(str(out/'mixed.mjs')))
    if build_root is not None:wrapper=replace(wrapper,'observer_build="$observer_repo/build-gst-onnx"','observer_build='+shlex.quote(str(b)))
    wrapper=replace(wrapper,'  --memory-attribution-diagnostic|','  --search-performance-diagnostic|--memory-attribution-diagnostic|')
    # Reject capacity-unqualified execution before root creation/build/port ownership.
    guard="import {assertSearchPerformanceCapacity} from "+json.dumps(str(SCRIPTS/'recording_accumulated_cost.mjs'))+";assertSearchPerformanceCapacity();"
    wrapper=replace(wrapper,'esac\n','esac\nif [[ "$*" == --search-performance-diagnostic ]]; then\n  node --input-type=module -e '+shlex.quote(guard)+' || exit $?\nfi\n')
    if limited_search:
        wrapper=replace(wrapper,'  --search-performance-diagnostic|','  --limited-search-diagnostic|--search-performance-diagnostic|')
        guard="import {assertLimitedSearchCapacity} from "+json.dumps(str(SCRIPTS/'recording_accumulated_cost.mjs'))+";assertLimitedSearchCapacity();"
        wrapper=replace(wrapper,'esac\n','esac\nif [[ "$*" == --limited-search-diagnostic ]]; then\n  node --input-type=module -e '+shlex.quote(guard)+' || exit $?\nfi\n')
    if limited_search:
        start=wrapper.index('read -r -a observer_link')
        end=wrapper.index('export MEDIA_SERVER_VA_REVIEW_FIXTURE_BIN=',start)
        original=wrapper[start:end]
        reuse='python3 '+shlex.quote(str(SCRIPTS/'recording_accumulated_cost.py'))+' --install-limited-helpers "${MEDIA_SERVER_LIMITED_HELPERS_MANIFEST:?qualified helper manifest required}" "${MEDIA_SERVER_LIMITED_HELPERS_MANIFEST_SHA:?qualified helper manifest SHA required}" "$observer_run"\n'
        wrapper=wrapper[:start]+'if [[ "$*" == --limited-search-diagnostic ]]; then\n'+reuse+'else\n'+original+'fi\n'+wrapper[end:]
    (out/'wrapper.sh').write_text(wrapper)
    (out/'binding.json').write_text(json.dumps(binding,indent=2)+'\n')
    return binding

def attribution_overlay(out,binding,mixed):
    # Explicit generator opt-in, no change to ordinary or selected-only workloads.
    for original in binding:
        p=out/Path(original).name;s=p.read_text()
        if p.name=='recording_search_application_service.cpp':
            s=replace(s,'r154::Search selected(diagnostic);','r154::Search selected(diagnostic);r171::Search failure_request(diagnostic);')
        elif p.name=='webrtc_http_server.cpp':
            s=replace(s,'r154::header_count=0;','r154::header_count=0;r171::headers=0;')
            s=replace(s,'r154::HeaderSeen(key);','r154::HeaderSeen(key);r171::HeaderSeen(key);')
        else:
            s=replace(s,'r154::Server selected_request(selected_id,selected_accept);',
                '''r154::Server selected_request(selected_id,selected_accept);
                const unsigned failure_id=request_opt?r171::Identity(HeaderValue(*request_opt,"x-r171-id")):0;
                if(r171::Enabled()&&request_opt){const auto q=ParseQueryString(request_opt->query);const auto c=q.find("channelIds");
                    const bool general=request_opt->method=="GET"&&request_opt->path=="/ops/api/recordings/search"&&c!=q.end()&&c->second=="9101";
                    if(general!=bool(failure_id))r154::Lose(177);}
                r171::Server failure_request(failure_id);''')
            s=replace(s,'selected_request.handler=r154::Tick();','failure_request.handler=r154::Tick();selected_request.handler=r154::Tick();')
            s=replace(s,'selected_request.prepared=r154::Tick();','failure_request.prepared=r154::Tick();failure_request.status=response.status;selected_request.prepared=r154::Tick();')
            s=replace(s,'selected_request.sendBegin=r154::Tick();','failure_request.status=response.status;failure_request.send_begin=r154::Tick();selected_request.sendBegin=r154::Tick();')
            s=replace(s,'selected_request.sent=sent;','selected_request.sent=sent;failure_request.send_end=r154::Tick();failure_request.sent=sent;')
            s=replace(s,'selected_request.End();','failure_request.End();selected_request.End();')
        p.write_text(s);binding[original]['overlay']=sha(p)
    mixed=replace(mixed,'costCollector,assertSearchPerformanceCapacity','costCollector,failureCollector,attributionError,assertSearchPerformanceCapacity')
    mixed=replace(mixed,'const selectedTrace=costCollector(),','let failureOrdinal=0;const failureTrace=failureCollector();const selectedTrace=costCollector(),')
    mixed=replace(mixed,'VERIFY_RECORDING_COMPLETION_TRACE:1','VERIFY_RECORDING_COMPLETION_TRACE:1,VERIFY_SEARCH_ATTRIBUTION:1')
    mixed=replace(mixed,"if(selectedId)selectedTrace.start(selectedId);",'''if(selectedId)selectedTrace.start(selectedId);
 const failureId=method==='GET'&&route.split('?')[0]==='/ops/api/recordings/search'&&new URLSearchParams(route.split('?')[1]).get('channelIds')==='9101'?++failureOrdinal:0;
 if(failureId)failureTrace.start(failureId);let failureTiming=null,failureBody=null,selectedClientFailure=null;
 try {''')
    mixed=replace(mixed,"report:value=>{console.log('[mixed-http-timing] '","report:value=>{failureTiming=value;console.log('[mixed-http-timing] '")
    mixed=replace(mixed,'selectedTrace.client(row);','try{selectedTrace.client(row);}catch(error){selectedClientFailure=error;}')
    mixed=replace(mixed,"headers:{Cookie:app.cookie,...(selectedId?", "headers:{Cookie:app.cookie,...(failureId?{'X-R171-ID':String(failureId)}:{}),...(selectedId?")
    mixed=replace(mixed,'return {...result,elapsedMs:performance.now()-started};', '''failureBody=result.bytes;return {...result,elapsedMs:performance.now()-started};
 } finally {if(failureId){if(!failureTiming)throw Error('attribution-client-missing-timing');
 const t=failureTiming;const row={id:failureId,loss:false,status:t.status,phase:t.phase,outcome:t.outcome,headerReceived:t.headerElapsedMs!==null,totalElapsedMs:t.totalElapsedMs,bytes:t.bytes,reason:attributionError(failureBody)};
 process.stdout.write(failureTrace.client(row));}if(selectedClientFailure)throw selectedClientFailure;}
''')
    mixed=replace(mixed,"selectedTrace.append(chunk,stream===child.stdout?0:1);if(selectedTrace.failure())", "selectedTrace.append(chunk,stream===child.stdout?0:1);failureTrace.append(chunk,stream===child.stdout?0:1);if(selectedTrace.failure()||failureTrace.failure())")
    mixed=replace(mixed,'JSON.stringify(selectedTrace.failure())','JSON.stringify(selectedTrace.failure()??failureTrace.failure())')
    mixed=replace(mixed,"function budget(){if(selectedTrace.failure())", "function budget(){if(failureTrace.failure())throw Error(failureTrace.failure().code);if(selectedTrace.failure())")
    mixed=replace(mixed,'};if(performanceDiagnose){try{selectedBound=', '''};try{final.failureAttribution=failureTrace.complete();}catch{final.failureAttribution={status:'incomplete',firstFailure:failureTrace.failure(),requests:failureTrace.snapshot()};failed++;final.failed=failed;}if(performanceDiagnose){try{selectedBound=''')
    return mixed


def mandatory_overlay(out,binding,mixed):
    # Reuse R171 hooks, but choose a versioned ledger only in this generated copy.
    mixed=attribution_overlay(out,binding,mixed)
    mixed=replace(mixed,' const started=performance.now();','')
    mixed=replace(mixed,"async function evidenceFetch(app,route,method='GET',body,selectedId=0){","async function evidenceFetch(app,route,method='GET',body,selectedId=0){\n const started=performance.now();")
    mixed=replace(mixed,'failureCollector,attributionError','mandatoryRequestLedger,settleLedgerBatch,attributionError')
    mixed=replace(mixed,'failureTrace=failureCollector()','failureTrace=mandatoryRequestLedger()')
    runtime=out/'webrtc_http_server_runtime.cpp';s=runtime.read_text()
    s=replace(s,'request_opt->path=="/ops/api/recordings/search"&&c!=q.end()&&c->second=="9101";',
        '((request_opt->path=="/ops/api/recordings/search"&&c!=q.end()&&c->second=="9101")||(request_opt->path=="/ops/api/recordings/visual-search"&&c!=q.end()&&c->second=="9101,9201"));')
    runtime.write_text(s);binding['src/ingress/webrtc_http_server_runtime.cpp']['overlay']=sha(runtime)
    mixed=replace(mixed,"const failureId=method==='GET'&&route.split('?')[0]==='/ops/api/recordings/search'&&new URLSearchParams(route.split('?')[1]).get('channelIds')==='9101'?++failureOrdinal:0;",
        """if(cancelled||selectedTrace.failure())failureTrace.fail('ledger-supervisor-stopped');
 if(failureTrace.failure())throw Error(failureTrace.failure().code);
 const failureKind=method!=='GET'?null:route.split('?')[0]==='/ops/api/recordings/search'&&new URLSearchParams(route.split('?')[1]).get('channelIds')==='9101'?'structured':route.split('?')[0]==='/ops/api/recordings/visual-search'&&new URLSearchParams(route.split('?')[1]).get('channelIds')==='9101,9201'?'visual':null;
 const failureId=failureKind?++failureOrdinal:0;""")
    mixed=replace(mixed,'if(failureId)failureTrace.start(failureId);let failureTiming=null,failureBody=null,selectedClientFailure=null;',
        "if(failureId)process.stdout.write(failureTrace.start(failureId,{kind:failureKind,pid:app.child.pid,startedMs:started}));let failureTiming=null,failureBody=null,selectedClientFailure=null,failureError=null,failureElapsedMs=null,failureSignal=null,failureCancelled=false;")
    mixed=replace(mixed,'failureBody=result.bytes;return {...result,elapsedMs:performance.now()-started};',
        'failureBody=result.bytes;failureElapsedMs=performance.now()-started;return {...result,elapsedMs:failureElapsedMs};')
    begin=mixed.index(" } finally {if(failureId){if(!failureTiming)")
    end=mixed.index('\n}',begin)
    mixed=mixed[:begin]+""" } catch(error){failureError=error;failureTrace.fail('ledger-request-failed',failureId||null);throw error;}
 finally {if(failureId){
  const t=failureTiming;const row={v:2,id:failureId,pid:app.child.pid,status:t?.status??null,phase:t?.phase??'unobserved',outcome:failureCancelled||failureSignal?.aborted&&failureSignal.reason?.name==='AbortError'?'cancelled':t?.outcome??'incomplete',headerReceived:t? t.headerElapsedMs!==null:false,totalElapsedMs:failureElapsedMs??t?.totalElapsedMs??null,endedMs:performance.now(),bytes:t?.bytes??0,reason:attributionError(failureBody)};
  try{process.stdout.write(failureTrace.client(row));}catch(error){failureTrace.fail('ledger-client-write',failureId);if(!failureError)throw error;}
 }if(selectedClientFailure){failureTrace.fail('ledger-selected-client');if(!failureError)throw selectedClientFailure;}}
"""+mixed[end:]
    # Observe fetch abort before the existing HTTP helper sanitizes its exception.
    mixed=replace(mixed,"request:()=>fetch(app.base+route,{method,redirect:'error',signal:AbortSignal.timeout(5000),headers:{Cookie:app.cookie,...(failureId?",
        "request:async()=>{try{return await fetch(app.base+route,{method,redirect:'error',signal:(failureSignal=AbortSignal.timeout(5000)),headers:{Cookie:app.cookie,...(failureId?")
    mixed=replace(mixed,"body:method==='POST'?JSON.stringify(body??{}):undefined})});",
        "body:method==='POST'?JSON.stringify(body??{}):undefined});}catch(error){failureCancelled=error?.name==='AbortError'&&failureSignal?.reason?.name!=='TimeoutError';throw error;}}});")
    mixed=replace(mixed,"if(app.completionTrace.error||app.resourceTrace.error||(memoryObserve&&app.memoryTrace.error))child.kill('SIGTERM');",
        "if(app.completionTrace.error||app.resourceTrace.error||(memoryObserve&&app.memoryTrace.error)){failureTrace.fail('ledger-resource-or-completion');child.kill('SIGTERM');}")
    mixed=replace(mixed,"()=>child.kill('SIGTERM'));selectedTrace.append",
        "()=>{failureTrace.fail('ledger-product-log');child.kill('SIGTERM');});selectedTrace.append")
    mixed=replace(mixed,"if(selectedTrace.failure()||failureTrace.failure()){if(!selectedFailureReported)",
        "if(selectedTrace.failure()||failureTrace.failure()){if(selectedTrace.failure())failureTrace.fail('ledger-selected-loss');if(!selectedFailureReported)")
    mixed=replace(mixed,'failureTrace.append(chunk,stream===child.stdout?0:1);','failureTrace.append(chunk,stream===child.stdout?0:1,child.pid);')
    mixed=replace(mixed,'const phaseAt=performance.now();','failureTrace.bindProcess(m,currentResourceTrace(app.resourceTrace));const phaseAt=performance.now();')
    mixed=replace(mixed,"const all=await Promise.all(routes.map((route,i)=>evidenceFetch(app,route,'GET',undefined,selection(selectedBatch,i))));",
        "const all=await settleLedgerBatch(failureTrace,routes.map((route,i)=>()=>evidenceFetch(app,route,'GET',undefined,selection(selectedBatch,i))));")
    mixed=replace(mixed,"const created=await Promise.all([0,1].map(()=>evidenceFetch(app,'/ops/api/recordings/search/evidence?'+query,'POST')));",
        "const created=await settleLedgerBatch(failureTrace,[0,1].map(()=>()=>evidenceFetch(app,'/ops/api/recordings/search/evidence?'+query,'POST')));")
    # sample already validates native metrics and FD receipts; reuse it, no extra collection.
    # Stops remain owned and bounded. Preserve final mandatory records after sticky failures.
    mixed=replace(mixed,"try{final.failureAttribution=failureTrace.complete();}catch{final.failureAttribution={status:'incomplete',firstFailure:failureTrace.failure(),requests:failureTrace.snapshot()};failed++;final.failed=failed;}",
        "final.failureAttribution=failureTrace.report({cleanupComplete:final.processesClosed===true&&final.udpClosed===true&&processes.every(app=>app.result?.normalShutdownPass===true)});if(final.failureAttribution.status!=='captured'){failed++;final.failed=failed;}")
    return mixed

def limited_overlay(mixed):
    # Dedicated generated opt-in only. No change to the original mixed driver.
    mixed="import {assertLimitedSearchCapacity,limitedSearchSchedule,runLimitedSearch,limitedPreparationStart} from "+json.dumps(str(SCRIPTS/'recording_accumulated_cost.mjs'))+";\n"+mixed
    mixed=replace(mixed,"const stateDiagnose=performanceDiagnose", "const limitedDiagnose=args.length===1&&args[0]==='--limited-search-diagnostic';\nif(limitedDiagnose)assertLimitedSearchCapacity();\nlet limitedSchedule=null;\nconst stateDiagnose=performanceDiagnose")
    mixed=replace(mixed,"memoryObservationMode(performanceDiagnose?['--state-diagnostic']:args)","memoryObservationMode(limitedDiagnose?['--frame-diagnostic']:performanceDiagnose?['--state-diagnostic']:args)")
    mixed=replace(mixed,'const diagnose=memoryDiagnose','const diagnose=limitedDiagnose||memoryDiagnose')
    mixed=replace(mixed,'mixedPreparationContract(args)','mixedPreparationContract(limitedDiagnose?[\'--frame-diagnostic\']:args)')
    mixed=replace(mixed,'const duration=short?','const duration=limitedDiagnose?300000:short?')
    mixed=replace(mixed,'const start=performance.now(),deadline=',"const start=limitedDiagnose?limitedPreparationStart({originNs:process.env.MEDIA_SERVER_LIMITED_ORIGIN_NS}):performance.now(),deadline=")
    mixed=replace(mixed,'deadline=start+(short?','deadline=start+(limitedDiagnose?300000:short?')
    start=mixed.index('  aLoad=new MixedALoad(')
    end=mixed.index('  }catch(error){failed++;',start)
    original=mixed[start:end]
    # Reuse the exact existing query construction, refreshed on every batch.
    route_begin=mixed.index(' const query=new URLSearchParams(',mixed.index('async function evidenceLoad('))
    route_end=mixed.index('\n const selectedBatch=',route_begin)
    routes=mixed[route_begin:route_end]
    limited="""  if(limitedDiagnose){
   limitedSchedule=limitedSearchSchedule({startedAt:0,now:()=>performance.now()-start});
   const begin=performance.now(),observationBudget=new CurrentObservationBudget();observationStart=begin;
   progress=new CurrentLongrunProgress(begin,['9101','9201'],observationBudget);
   observer=new CurrentRecordingObserver(path.join(root,'recordings'),native,observationBudget);
   await runLimitedSearch({schedule:limitedSchedule,ledger:failureTrace,
    sample:async()=>{budget();await sample(first);budget();},pause,
    routes:()=>{ROUTES return routes;},
    fetch:async route=>{const result=await evidenceFetch(first,route);if(result.status!==200)throw Error('limited-http-failure');return result;}});
   phaseResult=progress.status(performance.now());observationStart=null;
   await stop(first);
  }else{
""".replace('ROUTES',routes)+original+'  }\n'
    mixed=mixed[:start]+limited+mixed[end:]
    # Limited requests are not part of the historical selected 15-request set.
    mixed=replace(mixed,"if(!selectedId&&method==='GET'", "if(!limitedDiagnose&&!selectedId&&method==='GET'")
    mixed=replace(mixed,'if(performanceDiagnose){try{selectedBound=',"if(limitedDiagnose){final.limitedSearch=limitedSchedule?.report({cleanupComplete:final.processesClosed===true&&final.udpClosed===true})??{status:'INCOMPLETE',firstFailure:{code:'limited-not-started'}};if(final.limitedSearch.status!=='BOUNDED')failed++;final.failed=failed;latencyPassed=failed===0;final.mode='limited-search-diagnostic';final.frameDiagnosticPass=false;}if(performanceDiagnose){try{selectedBound=")
    return mixed

def isolated_build_root(root):
    b=Path(root)
    if not b.is_absolute() or b.resolve()!=b or not str(b).startswith('/private/tmp/media-server-') or REPO in b.parents or b.name!='build':raise ValueError('isolated-build-root')
    if b.parent.stat().st_uid!=os.getuid() or b.parent.stat().st_mode&0o777!=0o700:raise ValueError('isolated-build-owner')
    if b.exists() and (not b.is_dir() or b.stat().st_uid!=os.getuid()):raise ValueError('isolated-build-entry')
    return b

def isolated_build_plan(root, reference=None):
    # Plan only: CMake and the compiler are never invoked by this function.
    b=isolated_build_root(root);reference=Path(reference or REPO/'build-gst-onnx')
    values={};generator=None
    for line in (reference/'CMakeCache.txt').read_text().splitlines():
        if not line or line.startswith(('#','//')) or '=' not in line or ':' not in line.split('=',1)[0]:continue
        key_type,value=line.split('=',1);key,kind=key_type.split(':',1)
        if kind in ('BOOL','STRING','PATH','FILEPATH'):
            values[key_type]=value.replace(str(reference),str(b))
        elif key=='CMAKE_GENERATOR':generator=value
    if generator!='Unix Makefiles':raise ValueError('isolated-generator-unreviewed')
    configure=['cmake','-S',str(REPO),'-B',str(b),'-G',generator]+['-D'+k+'='+v for k,v in sorted(values.items())]
    return {'buildRoot':str(b),'referenceCacheSha256':sha(reference/'CMakeCache.txt'),
      'commands':[configure,['cmake','--build',str(b),'--target','media_server_runtime','media_server','--parallel','1']],
      'limits':{'sharedSeconds':180,'rssBytes':1073741824,'diskBytes':536870912,'outputBytes':2097152},
      'sourcePolicy':'exact HEAD + complete approved dirty-source SHA manifest, never report clean',
      'requiredPostBuild':['source-manifest-recheck','flags-match','current-archive-sha','mandatory-overlay-objects','link-map','unique-symbols'],
      'productSourceLink':'NOT_TESTED','buildTimeDiskQualification':'UNPROVEN'}

def isolated_source_sha(receipt, build_root):
    if 'sourceManifest' not in receipt:return receipt.get('sourceSha256',{})
    ref=receipt['sourceManifest']
    if 'sourceSha256' in receipt or ref.get('path')!='source-sha256.json':raise ValueError('isolated-source-reference')
    p=Path(build_root).parent.parent/'evidence'/ref['path']
    if p.parent.resolve()!=p.parent:raise ValueError('isolated-source-reference')
    s=p.lstat()
    if not stat.S_ISREG(s.st_mode) or s.st_uid!=os.getuid() or s.st_nlink!=1 or s.st_mode&0o777!=0o600:raise ValueError('isolated-source-reference')
    if s.st_size>2097152 or s.st_size!=ref.get('bytes'):raise ValueError('isolated-source-manifest-cap')
    fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
    with os.fdopen(fd,'rb') as f:
        actual=os.fstat(f.fileno())
        if (actual.st_dev,actual.st_ino)!=(s.st_dev,s.st_ino):raise ValueError('isolated-source-reference')
        data=f.read(s.st_size+1)
    if len(data)!=s.st_size or hashlib.sha256(data).hexdigest()!=ref.get('sha256'):raise ValueError('isolated-source-manifest-sha')
    expected=json.loads(data)
    if not isinstance(expected,dict):raise ValueError('isolated-source-manifest')
    return expected

def verify_isolated_build_inputs(root, receipt):
    b=isolated_build_root(root)
    if receipt.get('buildRoot')!=str(b) or receipt.get('head')!=subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip():raise ValueError('isolated-head-binding')
    expected=isolated_source_sha(receipt,b)
    names=subprocess.check_output(['git','ls-files','-z','--cached','--others','--exclude-standard'],cwd=REPO).decode().split('\0')
    required={n for n in names if n and (n.startswith(('src/','include/','scripts/internal/')) or n in ('CMakeLists.txt','VERSION'))}
    if not required.issubset(expected):raise ValueError('isolated-source-manifest')
    for n in required:
        if sha(REPO/n)!=expected[n]:raise ValueError('isolated-source-changed')
    for n in ['libmedia_server_runtime.a','media_server','CMakeFiles/media_server_runtime.dir/flags.make','CMakeFiles/media_server.dir/link.txt']:
        if not (b/n).is_file() or (b/n).resolve()!=b/n or sha(b/n)!=receipt.get('buildSha256',{}).get(n):raise ValueError('isolated-build-binding')
    old=REPO/'build-gst-onnx'
    if (b/'CMakeFiles/media_server_runtime.dir/flags.make').read_bytes()!=(old/'CMakeFiles/media_server_runtime.dir/flags.make').read_bytes():raise ValueError('isolated-flags-changed')
    link=(b/'CMakeFiles/media_server.dir/link.txt').read_text()
    if str(old) in link:raise ValueError('isolated-old-link-input')
    return b

def isolated_link_plan(parent, build_root, receipt):
    b=verify_isolated_build_inputs(build_root,receipt);out=parent/'overlay'
    binding=generate(out,mandatory_ledger=True,limited_search=True,build_root=b);flags={}
    for line in (b/'CMakeFiles/media_server_runtime.dir/flags.make').read_text().splitlines():
        if ' = ' in line:
            k,v=line.split(' = ',1);flags[k]=shlex.split(v)
    link=shlex.split((b/'CMakeFiles/media_server.dir/link.txt').read_text())
    objects=[str(out/(Path(n).name+'.o')) for n in binding]
    common=[link[0],*flags['CXX_DEFINES'],*flags['CXX_INCLUDES'],*flags['CXX_FLAGS'],'-I'+str(out),'-I'+str(SCRIPTS)]
    commands=[[*common,'-I'+str((REPO/n).parent),'-c',str(out/Path(n).name),'-o',o] for n,o in zip(binding,objects)]
    link[link.index('-o')+1]=str(parent/'media_server');link[link.index('libmedia_server_runtime.a'):link.index('libmedia_server_runtime.a')]=objects
    link+=['-Wl,-map,'+str(parent/'link.map')];commands.append(link)
    return {'commands':commands,'cwd':str(b),'sources':binding,'objects':objects,'archive':str(b/'libmedia_server_runtime.a'),
      'sharedBuildBudgetSeconds':180,'requiresRemainingBuildBudget':True,'requiresExistingRunBounded':True,'productSourceLink':'NOT_TESTED'}

def verify_isolated_link(plan, mapping, symbols):
    expected={'src/ingress/recording_search_application_service.cpp','src/ingress/webrtc_http_server_runtime.cpp','src/ingress/webrtc_http_server.cpp'}
    if set(plan['sources'])!=expected or len(plan['objects'])!=3 or len(set(plan['objects']))!=3:raise ValueError('isolated-overlay-set')
    for source,obj in zip(plan['sources'],plan['objects']):
        if obj not in mapping or '('+Path(source).name+'.o)' in mapping:raise ValueError('isolated-overlay-link')
    for key in ['RecordingApplicationService6Search','ReadHttpRequest']:
        if len([l for l in symbols.splitlines() if key in l and ' T ' in l])!=1:raise ValueError('isolated-duplicate-symbol')

# Limited-only helper artifacts. No compiler or executable is launched here.
HELPER_NAMES=('normalize','process-metrics','review-seed')
HELPER_FILES=(*HELPER_NAMES,'catalog-instrumented.cpp')
def helper_owned(p, directory=False):
    p=Path(p);s=p.lstat()
    if not p.is_absolute() or p.resolve()!=p or s.st_uid!=os.getuid() or (not stat.S_ISDIR(s.st_mode) if directory else not stat.S_ISREG(s.st_mode) or s.st_nlink!=1):raise ValueError('helper-unsafe-path')
    if (s.st_mode&0o777) not in ((0o700,) if directory else (0o600,0o700)):raise ValueError('helper-permissions')
    return s

def helper_macho(p):
    import struct
    with Path(p).open('rb') as f:
        header=f.read(32)
        if len(header)!=32:raise ValueError('helper-mach-o-arm64')
        command_bytes=struct.unpack_from('<I',header,20)[0]
        if command_bytes>2*1024*1024:raise ValueError('helper-mach-o-commands')
        data=header+f.read(command_bytes)
    if len(data)<32 or struct.unpack_from('<III',data)!=(0xfeedfacf,0x100000c,0) or struct.unpack_from('<I',data,12)[0]!=2:raise ValueError('helper-mach-o-arm64')
    count,size=struct.unpack_from('<II',data,16);pos=32;libs=[];rpaths=[]
    if size>len(data)-32 or count>10000:raise ValueError('helper-mach-o-commands')
    for _ in range(count):
        if pos+8>32+size:raise ValueError('helper-mach-o-commands')
        cmd,n=struct.unpack_from('<II',data,pos)
        if n<8 or pos+n>32+size:raise ValueError('helper-mach-o-commands')
        if cmd in (0xc,0x80000018,0x8000001f,0x80000023,0x8000001c):
            off=struct.unpack_from('<I',data,pos+8)[0]
            if off<12 or off>=n:raise ValueError('helper-mach-o-string')
            raw=data[pos+off:pos+n];end=raw.find(b'\0')
            if end<0:raise ValueError('helper-mach-o-string')
            value=raw[:end].decode('utf8')
            (rpaths if cmd==0x8000001c else libs).append(value)
        pos+=n
    if pos!=32+size:raise ValueError('helper-mach-o-commands')
    dependencies=[]
    for name in libs:
        if name.startswith(('/usr/lib/','/System/Library/')):
            dependencies.append({'name':name,'kind':'system-dyld-cache','availability':'NOT_RUNTIME_TESTED'});continue
        candidates=[Path(r)/name[len('@rpath/'):] for r in rpaths if r.startswith('/')] if name.startswith('@rpath/') else [Path(name)]
        matches=[p.resolve() for p in candidates if p.is_absolute() and p.is_file()]
        if len(set(matches))!=1:raise ValueError('helper-dynamic-dependency')
        resolved=matches[0]
        if not str(resolved).startswith('/opt/homebrew/'):raise ValueError('helper-dynamic-dependency')
        dependencies.append({'name':name,'path':str(resolved),'sha256':sha(resolved),'kind':'file'})
    return {'architecture':'arm64','format':'Mach-O executable','rpaths':rpaths,'dependencies':dependencies,'dynamicLoading':'NOT_TESTED'}

def helper_inputs(approved):
    h=approved['helperBuild'];reference=Path(h['referenceBuild'])
    if reference.resolve()!=reference or reference.name!='build' or not str(reference).startswith('/private/tmp/media-server-'):raise ValueError('helper-reference-build')
    required={str(reference/'libmedia_server_runtime.a'),str(reference/'CMakeFiles/media_server.dir/link.txt'),str(reference.parent/'media_server')}
    if not required.issubset(h['inputs']):raise ValueError('helper-input-binding')
    for p in (reference,reference.parent):helper_owned(p,True)
    for p in (reference/'libmedia_server_runtime.a',reference.parent/'media_server'):helper_owned(p)
    for n,digest in h['inputs'].items():
        p=Path(n)
        if not p.is_absolute() or sha(p)!=digest:raise ValueError('helper-input-sha')
    for n,entry in h['tools'].items():
        if str(Path(n).resolve())!=entry['resolved'] or sha(Path(entry['resolved']))!=entry['sha256']:raise ValueError('helper-tool-sha')
    if h['compiler'] not in h['tools'] or h['node'] not in h['tools'] or h['pkgConfig'] not in h['tools']:raise ValueError('helper-tool-binding')
    return h,reference

def helper_plan(work,approved,cflags):
    h,b=helper_inputs(approved);out=work/'helpers'
    # The wrapper's archive token and entire suffix are retained, in the same order.
    link=shlex.split((b/'CMakeFiles/media_server.dir/link.txt').read_text())
    idx=link.index('libmedia_server_runtime.a');libs=[str(b/'libmedia_server_runtime.a'),*link[idx+1:]]
    # Relative linker inputs would depend on the old build cwd; never silently resolve them differently.
    if any(not v.startswith(('-','/')) for v in libs):raise ValueError('helper-relative-link-input')
    common=[h['compiler'],'-std=c++17','-Wall','-Wextra','-Werror','-pthread','-I'+str(REPO/'include')]
    definitions=['-DMEDIA_SERVER_USE_GSTREAMER=1','-DMEDIA_SERVER_USE_OPENSSL=1','-DMEDIA_SERVER_USE_SQLITE3=1','-DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1']
    commands=[[*common,'-I'+str(REPO/'src/recording'),*cflags,*definitions,'-include',str(SCRIPTS/'recording_archive_phase_trace.h'),str(out/'catalog-instrumented.cpp'),str(SCRIPTS/'recording_current_observer_native.cpp'),*libs,'-o',str(out/'normalize')],
      [h['compiler'],'-std=c++17',str(SCRIPTS/'recording_process_metrics.cpp'),'-o',str(out/'process-metrics')],
      [*common,*cflags,*definitions,str(SCRIPTS/'va_review_smoke.cpp'),*libs,'-o',str(out/'review-seed')]]
    wrapper=(SCRIPTS/'verify_v450_recording_a_mixed.sh').read_text()
    instrument=wrapper.split("<<'NODE'\n",1)[1].split('\nNODE\n',1)[0]
    return {'commands':commands,'names':HELPER_NAMES,'instrument':[h['node'],'--input-type=module','-',str(REPO),str(out/'catalog-instrumented.cpp')],
      'instrumentSource':instrument,'runtimeConsumers':['normalize','review-seed'],'standalone':['process-metrics'],
      'archive':str(b/'libmedia_server_runtime.a'),'sourceManifest':approved['sourceManifest']}

def helper_stage(stage,root,approved,save):
    work=root/'work';evidence=root/'evidence';h,b=helper_inputs(approved)
    if stage=='helper-inputs':
        save('helper-inputs.json',{'flagsCommand':[h['pkgConfig'],'--cflags','gstreamer-app-1.0','openssl','sqlite3'],'inputs':h['inputs'],'tools':h['tools']})
    elif stage=='helper-plan':
        plan=helper_plan(work,approved,shlex.split((evidence/'helper-flags.stdout.txt').read_text()))
        (work/'helpers').mkdir(mode=0o700)
        # Store the original instrumentation program; run it under the same supervisor.
        script=work/'instrument.mjs'
        script.write_text(plan.pop('instrumentSource'));script.chmod(0o600)
        plan['instrument']=[h['node'],'--input-type=module','-e',script.read_text(),str(REPO),str(work/'helpers/catalog-instrumented.cpp')]
        # -e has argv[1] as the first argument; preserve the original stdin program's argv[2:] contract.
        plan['instrument'].insert(-2,'-')
        save('helper-plan.json',plan)
    elif stage=='helper-verify':
        out=work/'helpers';helper_owned(out,True)
        if set(p.name for p in out.iterdir())!=set(HELPER_FILES):raise ValueError('helper-output-set')
        entries={}
        for n in HELPER_FILES:
            p=out/n;s=helper_owned(p);p.chmod(0o700 if n in HELPER_NAMES else 0o600)
            entries[n]={'bytes':s.st_size,'sha256':sha(p),'mode':oct(p.stat().st_mode&0o777),'uid':s.st_uid,'links':s.st_nlink,
                        **(helper_macho(p) if n in HELPER_NAMES else {})}
        # Rename, not duplicate large outputs: artifact+work+evidence stay in the same 512MiB root.
        destination=root/'artifacts'
        if destination.exists():raise ValueError('helper-artifacts-exist')
        out.rename(destination)
        for n,e in entries.items():
            if sha(destination/n)!=e['sha256']:raise ValueError('helper-artifact-readback')
        save('helper-artifacts.json',{'version':1,'root':str(destination),'head':approved['head'],'files':entries,
          'sourceManifest':approved['sourceManifest'],'inputs':h['inputs'],'tools':h['tools'],
          'planSha256':sha(evidence/'helper-plan.json'),'actualHelpersExecuted':0,
          'retention':'Retain until separately approved cleanup after Limited execution review; total build root <=512MiB'})
    else:raise ValueError('helper-stage')

def install_limited_helpers(manifest_path,expected_sha,destination):
    import shutil
    manifest_path=Path(manifest_path);destination=Path(destination)
    helper_owned(manifest_path);helper_owned(manifest_path.parent,True);helper_owned(destination,True)
    if len(expected_sha)!=64 or sha(manifest_path)!=expected_sha:raise ValueError('helper-manifest-sha')
    record=json.loads(manifest_path.read_text());root=Path(record['root']);helper_owned(root,True)
    handoff=manifest_path.parent/'helper-handoff.json';helper_owned(handoff)
    handoff_record=json.loads(handoff.read_text())
    if handoff_record.get('status')!='HELPER_BUILD_ACTUAL_PASS' or handoff_record.get('manifestSha256')!=expected_sha:raise ValueError('helper-handoff-unqualified')
    terminal=manifest_path.parent.parent.parent/'evidence/result.json'
    helper_owned(terminal)
    if handoff_record.get('terminalResult')!=str(terminal) or sha(terminal)!=handoff_record.get('terminalResultSha256') or json.loads(terminal.read_text()).get('status')!='LIMITED_HELPER_BUILD_PASS' or (terminal.parent.parent/'finalization-failure.json').exists():raise ValueError('helper-terminal-unqualified')
    if root!=manifest_path.parent.parent/'artifacts' or set(record['files'])!=set(HELPER_FILES):raise ValueError('helper-manifest-binding')
    receipt=manifest_path.parent/'result.json';helper_owned(receipt)
    result=json.loads(receipt.read_text())
    if result['status']!='PASS' or result.get('helperArtifacts',{}).get('sha256')!=expected_sha or (manifest_path.parent/'finalization-failure.json').exists():raise ValueError('helper-build-not-qualified')
    source=record['sourceManifest'];source_path=manifest_path.parent/source['path'];helper_owned(source_path)
    if source['path']!='source-sha256.json' or sha(source_path)!=source['sha256']:raise ValueError('helper-source-manifest')
    for n,h in json.loads(source_path.read_text()).items():
        if Path(n).is_absolute() or '..' in Path(n).parts or sha(REPO/n)!=h:raise ValueError('helper-source-sha')
    for n,h in record['inputs'].items():
        if sha(Path(n))!=h:raise ValueError('helper-input-sha')
    # Check every input first. No fallback to a compiler and no helper execution.
    for n,e in record['files'].items():
        p=root/n;s=helper_owned(p)
        if s.st_size!=e['bytes'] or sha(p)!=e['sha256'] or oct(s.st_mode&0o777)!=e['mode']:raise ValueError('helper-artifact-sha')
        if (destination/n).exists() or (destination/n).is_symlink():raise ValueError('helper-destination-exists')
        if n in HELPER_NAMES and helper_macho(p)!= {k:e[k] for k in ('architecture','format','rpaths','dependencies','dynamicLoading')}:raise ValueError('helper-dependency-changed')
    projected=sum(e['bytes'] for e in record['files'].values())
    if projected>448*1024*1024:raise ValueError('helper-copy-cap')
    for n,e in record['files'].items():
        fd=os.open(root/n,os.O_RDONLY|os.O_NOFOLLOW)
        with os.fdopen(fd,'rb') as src, (destination/n).open('xb') as dst:
            shutil.copyfileobj(src,dst,65536);dst.flush();os.fsync(dst.fileno())
        (destination/n).chmod(int(e['mode'],8));helper_owned(destination/n)
        if sha(destination/n)!=e['sha256']:raise ValueError('helper-copy-readback')

# Limited build-only bridge. Each invocation is itself supervised by runBounded;
# this dispatcher never invokes CMake/compiler/linker or a product executable.
def isolated_supervision_stage(stage, root):
    root=Path(root);work=root/'work';b=work/'build';evidence=root/'evidence'
    isolated_build_root(b)
    approved=json.loads((evidence/'approved.json').read_text())
    def source_check():
        head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip()
        status=subprocess.check_output(['git','status','--short'],cwd=REPO,text=True)
        if head!=approved['head'] or status!=approved['status']:raise ValueError('isolated-approved-git')
        if subprocess.check_output(['git','branch','--show-current'],cwd=REPO,text=True).strip()!='v4.5.0':raise ValueError('isolated-branch')
        if subprocess.check_output(['git','diff','--cached','--name-only'],cwd=REPO):raise ValueError('isolated-index')
        names=subprocess.check_output(['git','ls-files','-z','--cached','--others','--exclude-standard'],cwd=REPO).decode().split('\0')
        required={n for n in names if n and (n.startswith(('src/','include/','scripts/internal/')) or n in ('CMakeLists.txt','VERSION'))}
        required.update('build-gst-onnx/'+n for n in ['CMakeCache.txt','CMakeFiles/media_server_runtime.dir/flags.make','CMakeFiles/media_server.dir/link.txt','libmedia_server_runtime.a','media_server'])
        expected=isolated_source_sha(approved,b)
        if not required.issubset(expected):raise ValueError('isolated-source-manifest')
        for n,h in expected.items():
            if Path(n).is_absolute() or '..' in Path(n).parts or sha(REPO/n)!=h:raise ValueError('isolated-source-changed')
    def save(name,value):
        data=(json.dumps(value,indent=2)+'\n').encode()
        if len(data)>65536:raise ValueError('isolated-plan-cap')
        target=evidence/name
        fd=os.open(target,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
        with os.fdopen(fd,'wb') as f:f.write(data);f.flush();os.fsync(f.fileno())
        if target.read_bytes()!=data:raise ValueError('isolated-plan-readback')
    source_check()
    if stage.startswith('helper-'):
        helper_stage(stage,root,approved,save)
    elif stage=='plan':
        plan=isolated_build_plan(b)
        # Preserve the reference flags. Output/launcher overrides outside the
        # owned tree need separate review, never silently rewrite them.
        for arg in plan['commands'][0]:
            if arg.startswith('-D') and '=' in arg:
                key,value=arg[2:].split('=',1);key=key.split(':')[0]
                if ('OUTPUT_DIRECTORY' in key or key.endswith('_LAUNCHER') or key in ('CMAKE_PROJECT_INCLUDE','CMAKE_PROJECT_INCLUDE_BEFORE')) and value:
                    raise ValueError('isolated-unreviewed-output-or-launcher')
        save('cmake-plan.json',plan)
    elif stage=='link-plan':
        names=['libmedia_server_runtime.a','media_server','CMakeFiles/media_server_runtime.dir/flags.make','CMakeFiles/media_server.dir/link.txt']
        receipt={**approved,'buildRoot':str(b),'buildSha256':{n:sha(b/n) for n in names}}
        plan=isolated_link_plan(work,b,receipt)
        save('build-inputs.json',receipt);save('link-plan.json',plan)
    elif stage=='verify':
        receipt=json.loads((evidence/'build-inputs.json').read_text())
        verify_isolated_build_inputs(b,receipt)
        plan=json.loads((evidence/'link-plan.json').read_text())
        if plan['archive']!=str(b/'libmedia_server_runtime.a'):raise ValueError('isolated-old-archive')
        for name,entry in plan['sources'].items():
            if sha(REPO/name)!=entry['original'] or sha(work/'overlay'/Path(name).name)!=entry['overlay']:raise ValueError('isolated-overlay-source')
        verify_isolated_link(plan,(work/'link.map').read_text(),(evidence/'symbols.stdout.txt').read_text())
        outputs=[work/'media_server',work/'link.map',*[Path(o) for o in plan['objects']]]
        save('link-binding.json',{'head':approved['head'],**{k:approved[k] for k in ('sourceManifest','sourceSha256') if k in approved},
          'sources':plan['sources'],'archive':{'path':plan['archive'],'sha256':sha(Path(plan['archive']))},
          'outputs':{str(p.relative_to(root)):sha(p) for p in outputs},'uniqueSymbols':True,'productExecution':'NOT_TESTED'})
    else:raise ValueError('isolated-supervision-stage')

def build(parent):
    out=parent/'overlay';binding=generate(out,'--failure-attribution' in sys.argv);b=REPO/'build-gst-onnx';flags={}
    for line in (b/'CMakeFiles/media_server_runtime.dir/flags.make').read_text().splitlines():
        if ' = ' in line:
            k,v=line.split(' = ',1);flags[k]=shlex.split(v)
    link=shlex.split((b/'CMakeFiles/media_server.dir/link.txt').read_text());common=[link[0],*flags['CXX_DEFINES'],*flags['CXX_INCLUDES'],*flags['CXX_FLAGS'],'-I'+str(out),'-I'+str(SCRIPTS)]
    objects=[];commands=[]
    def run(cmd,name,cwd=REPO):
        commands.append(cmd)
        with (parent/(name+'.log')).open('xb') as f:subprocess.run(cmd,cwd=cwd,stdout=f,stderr=subprocess.STDOUT,check=True,timeout=180)
    for name in binding:
        obj=out/(Path(name).name+'.o');objects.append(str(obj))
        run([*common,'-I'+str((REPO/name).parent),'-c',str(out/Path(name).name),'-o',str(obj)],Path(name).name)
    cmd=link.copy();cmd[cmd.index('-o')+1]=str(parent/'media_server');idx=cmd.index('libmedia_server_runtime.a');cmd[idx:idx]=objects;cmd+=['-Wl,-map,'+str(parent/'link.map')];run(cmd,'link',b)
    mapping=(parent/'link.map').read_text()
    for name in binding:
        assert str(out/(Path(name).name+'.o')) in mapping
        assert '('+Path(name).name+'.o)' not in mapping
    symbols=subprocess.check_output(['nm','-gU',str(parent/'media_server')],text=True)
    for key in ['RecordingApplicationService6Search','ReadHttpRequest']:
        assert len([l for l in symbols.splitlines() if key in l and ' T ' in l])==1
    (parent/'build.json').write_text(json.dumps({'sources':binding,'commands':commands,'probeSha':sha(out/'recording_http_cost_probe.h'),'binarySha':sha(parent/'media_server'),'mapSha':sha(parent/'link.map'),'uniqueSymbols':True},indent=2)+'\n')
    # Preserve the common Http152 source; the selected header is confined to this owned copy.
    native=(SCRIPTS/'recording_accumulated_http_smoke.cpp').read_text()
    native=replace(native,'+"Connection: close\\r\\n"','+(id==10?"X-R154-ID: 1\\r\\n":"")+"Connection: close\\r\\n"')
    native=replace(native,'return {wire.substr(end+4),ms};','''if(id==10)std::cout<<"[R165-client] {\\\"id\\\":1,\\\"loss\\\":false,\\\"status\\\":"<<status<<",\\\"outcome\\\":\\\"ok\\\",\\\"phase\\\":\\\"complete\\\",\\\"bytes\\\":"<<wire.size()<<",\\\"totalElapsedMs\\\":"<<static_cast<long long>(ms+0.5)<<"}\\n";return {wire.substr(end+4),ms};''')
    if '--failure-attribution' in sys.argv:native=native.replace('X-R154-ID: 1\\r\\n','X-R154-ID: 1\\r\\nX-R171-ID: 1\\r\\n')
    if '--failure-attribution' in sys.argv:native=replace(native,'X-R171-ID: 1\\r\\n":"")','X-R171-ID: 1\\r\\n":id==1?"X-R171-ID: 2\\r\\n":"")')
    (out/'recording_accumulated_http_smoke.cpp').write_text(native)
    (out/'selected-focused.cpp').write_text((SCRIPTS/'recording_accumulated_cost_smoke.cpp').read_text())
    focused_cmd=[*common,'-I'+str(REPO/'src/ingress'),str(out/'selected-focused.cpp'),*objects,str(b/'libmedia_server_runtime.a'),*link[link.index('libmedia_server_runtime.a')+1:],'-Wl,-map,'+str(parent/'focused.map'),'-o',str(parent/'selected-focused')]
    run(focused_cmd,'focused-link')
    (parent/'focused-build.json').write_text(json.dumps({'command':focused_cmd,'binarySha':sha(parent/'selected-focused'),'sourceSha':sha(out/'selected-focused.cpp'),'helperSha':sha(out/'recording_accumulated_http_smoke.cpp'),'mapSha':sha(parent/'focused.map')},indent=2)+'\n')
    if '--parser' not in sys.argv:return
    parser=(SCRIPTS/'recording_http_cost_parser_smoke.cpp').read_text()
    parser=replace(parser,'d.id=1;d.status=200;','d.id=id;d.status=200;')
    parser=replace(parser,'} else if(mode=="reuse") {','''} else if(mode=="unselected") {
   id=Parse("");Need(id==0&&!r154::loss);r154::Server server(id,r154::Tick());
   recording::SearchDiagnostic d;r154::Search search(d);Need(!d.id&&!search.id&&!r154::loss);
  } else if(mode=="reuse") {''')
    parser=replace(parser,'mode=="missing"?""','mode=="missing"?"X-R154-ID: \\r\\n"')
    parser=replace(parser,'X-R154-ID: 129','X-R154-ID: 16')
    (out/'parser.cpp').write_text(parser)
    run([*common,'-I'+str(REPO/'src/ingress'),str(out/'parser.cpp'),*objects,str(b/'libmedia_server_runtime.a'),*link[link.index('libmedia_server_runtime.a')+1:],'-o',str(parent/'parser')],'parser-link')
if __name__=='__main__':
    if sys.argv[1:2]==['--install-limited-helpers']:
        if len(sys.argv)!=5:raise ValueError('helper-install-arguments')
        install_limited_helpers(*sys.argv[2:])
    elif sys.argv[1:2]==['--limited-build-stage']:
        if len(sys.argv)!=4:raise ValueError('isolated-supervision-arguments')
        isolated_supervision_stage(sys.argv[2],sys.argv[3])
    else:build(Path(sys.argv[1]))
