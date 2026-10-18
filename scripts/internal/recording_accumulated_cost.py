#!/usr/bin/env python3
"""R165 BLOCKED_PRE_EXECUTION: generated owned copies only; actual selected phase gate unqualified."""
import hashlib,json,shlex,subprocess,sys
from pathlib import Path
from recording_http_cost_overlay import replace
REPO=Path(__file__).resolve().parents[2]
SCRIPTS=REPO/'scripts/internal'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def generate(out):
    out.mkdir(mode=0o700)
    probe=(SCRIPTS/'recording_http_cost_probe.h').read_text()
    probe=replace(probe,'return id==10||id==11?1:id==12||id==13?2:id==60?3:id>=20&&id<60?4:id>=61?5:6;','return id%3==0?3:1;')
    probe=replace(probe,'id>128','id>15')
    probe=replace(probe,'if(header_count!=1)','if(!header_count&&value.empty())return 0;if(header_count!=1)')
    probe=replace(probe,'valid=id&&id<=128;if(!valid)Lose(1);else if','valid=id&&id<=15;if(id&&!valid)Lose(1);else if(valid&&')
    probe=replace(probe,'seen[id-1].exchange(true)){','seen[id-1].exchange(true))){')
    probe=replace(probe,'{if(!id)Lose(1);}','{}')
    probe=replace(probe,'~Search(){if(d.cost_loss||!d.id)Lose(7);if(!id)return;','~Search(){if(!id)return;if(d.cost_loss||!d.id)Lose(7);')
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
    s=replace(s,'VERIFY_RECORDING_LATENCY_TRACE:1','VERIFY_RECORDING_LATENCY_TRACE:0')
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
    s=replace(s,"status:failed?'FAIL':'PASS',exit:failed?1:0", "diagnosticCompleted:failed===0&&!!phaseResult,latencyPassed,status:failed||latencyPassed!==true?'FAIL':'PASS',exit:failed||latencyPassed!==true?1:0")
    s=replace(s,'process.exitCode=failed?1:0','process.exitCode=failed||latencyPassed!==true?1:0')
    s=replace(s,'}catch(error){failed++;if(error.workspaceDecision)',"}catch(error){failed++;if(!selectedFailureReported){selectedFailureReported=true;console.error('[R165-first-failure] '+JSON.stringify({code:selectedTrace.failure()?.code??'functional-failure',atMs:performance.now()}));}if(error.workspaceDecision)")
    s="import {selection,aSelection,costCollector} from "+json.dumps(str(SCRIPTS/'recording_accumulated_cost.mjs'))+";\nlet selectedBatchOrdinal=0,selectedFailureReported=false,latencyPassed=null;const selectedTrace=costCollector();\n"+s
    (out/'mixed.mjs').write_text(s)
    wrapper=(SCRIPTS/'verify_v450_recording_a_mixed.sh').read_text()
    wrapper=replace(wrapper,'observer_driver="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"','observer_driver='+shlex.quote(str(SCRIPTS)))
    wrapper=replace(wrapper,'node "$observer_driver/v450_recording_a_mixed.mjs"', 'node '+shlex.quote(str(out/'mixed.mjs')))
    (out/'wrapper.sh').write_text(wrapper)
    (out/'binding.json').write_text(json.dumps(binding,indent=2)+'\n')
    return binding

def build(parent):
    out=parent/'overlay';binding=generate(out);b=REPO/'build-gst-onnx';flags={}
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
if __name__=='__main__':build(Path(sys.argv[1]))
