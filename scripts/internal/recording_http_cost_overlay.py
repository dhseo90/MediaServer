#!/usr/bin/env python3
"""R154 literal, fail-closed instrumentation overlays; never rewrites tracked product sources."""
from pathlib import Path
import hashlib
REPO=Path(__file__).resolve().parents[2]

def replace(s,old,new,count=1):
    if s.count(old)!=count:raise ValueError('overlay anchor count mismatch: '+old[:100])
    return s.replace(old,new)

def generate(out):
    out.mkdir(mode=0o700)
    result={}
    names=['src/recording/recording_read_service.cpp','src/recording/recording_catalog.cpp','src/recording/recording_search_reader.cpp','src/ingress/recording_search_application_service.cpp','src/ingress/webrtc_http_server_runtime.cpp','src/ingress/webrtc_http_server.cpp','scripts/internal/recording_accumulated_http_smoke.cpp']
    for name in names:
        raw=(REPO/name).read_text();s=raw
        if name.endswith('recording_catalog.cpp'):
            start=s.index('bool RecordingCatalog::ResolveOriginalSample(');end=s.index('bool RecordingCatalog::ValidateFinalizeRecoveryV2',start);f=s[start:end]
            f=replace(f,'    if(result)*result={};','    r154::Phase original_cost(r154::Original);\n    if(result)*result={};')
            anchor='    recording::latency::Lock lock(mu_,recording::latency::Source::Catalog,__LINE__,false,__func__);'
            f=replace(f,anchor,'    const auto wait_begin=r154::Tick();\n'+anchor+'\n    r154::Held held;held.Acquired(wait_begin);r154::Count(r154::BindingsTotal,source_bindings_.size());')
            f=replace(f,'for(const auto& [id,handle]:source_bindings_) {','for(const auto& entry:source_bindings_) {const auto& id=entry.first;const auto& handle=entry.second;')
            f=replace(f,'        if(!handle)continue;','        r154::Count(r154::Scanned);if(!handle)continue;\n        r154::Count(r154::NonNull);const bool other=handle.channel!=channel;if(other)r154::Count(r154::OtherChannel);')
            f=replace(f,'const auto segment=segments_v2_.find(id);','r154::Count(r154::SegmentLookups);if(other)r154::Count(r154::OtherSegment);const auto segment=r154::Eval(r154::Segment,[&]{return segments_v2_.find(id);});')
            f=replace(f,'EffectiveLifecycleV2Locked(id)!=RecordingLifecycle::Finalized','r154::Eval(r154::Lifecycle,[&]{r154::Count(r154::LifecycleChecks);if(other)r154::Count(r154::OtherLifecycle);return EffectiveLifecycleV2Locked(id);})!=RecordingLifecycle::Finalized')
            for field,arg,counter in [('channel','channel','ChannelMatches'),('source','source','SourceMatches'),('generation','generation','GenerationMatches')]:
                f=replace(f,'handle.'+field+'!='+arg,'([&]{const bool match=handle.'+field+'=='+arg+';if(match)r154::Count(r154::'+counter+');return !match;})()',2 if field=='channel' else 1)
            # Other-channel classification must remain a simple diagnostic comparison.
            f=f.replace('const bool other=([&]{const bool match=handle.channel==channel;if(match)r154::Count(r154::ChannelMatches);return !match;})();','const bool other=handle.channel!=channel;')
            f=replace(f,'        SourceBindingHandle owned;','        r154::Count(r154::FullMatches);r154::Count(r154::OwnedAcquisitions);SourceBindingHandle owned;')
            f=replace(f,'AcquireSourceBindingOwnedLocked(id,&owned,error)','r154::Eval(r154::Acquire,[&]{return AcquireSourceBindingOwnedLocked(id,&owned,error);})')
            f=replace(f,'const auto sample=std::lower_bound(b.samples.begin(),b.samples.end(),ordinal,[](const auto& value,auto key){return value.ordinal<key;});','r154::Count(r154::BinarySearches);const auto sample=r154::Eval(r154::BinarySearch,[&]{return std::lower_bound(b.samples.begin(),b.samples.end(),ordinal,[](const auto& value,auto key){return value.ordinal<key;});});')
            f=replace(f,'candidate.sample=*sample;','r154::Count(r154::Exact);candidate.sample=*sample;')
            f=replace(f,'candidate.reason=b.incomplete_reason;','r154::Count(r154::Unknown);candidate.reason=b.incomplete_reason;')
            s=s[:start]+f+s[end:]
        elif name.endswith('recording_search_reader.cpp'):
            start=s.index('bool RecordingSearchReader::Refresh(');end=s.index('\nbool ',start+10);f=s[start:end]
            f=replace(f,'{SearchDiagnostic::Phase cost("Capture");','{r154::Phase capture_cost(r154::Capture);SearchDiagnostic::Phase cost("Capture");')
            f=replace(f,'    std::sort(batch.pending.begin(),batch.pending.end(),[&](const auto& a,const auto& b){return originalKey(a)<originalKey(b);});','    r154::Count(r154::Pending,batch.pending.size());\n    {r154::Phase sort_cost(r154::Sort);std::sort(batch.pending.begin(),batch.pending.end(),[&](const auto& a,const auto& b){return originalKey(a)<originalKey(b);});}')
            f=replace(f,'const auto key=originalKey(pending);','const auto key=r154::Eval(r154::Group,[&]{return originalKey(pending);});')
            f=replace(f,'if (!reader_.ResolveConsumerReference(ref, &resolution, error))','if(key)r154::Count(r154::UniqueKeys);if (!r154::Eval(r154::Consumer,[&]{return reader_.ResolveConsumerReference(ref, &resolution, error);}))')
            f=replace(f,'        Locate(batch.delta.upserts.at(pending.document_index), resolution);','        {r154::Phase locate_cost(r154::Locate);Locate(batch.delta.upserts.at(pending.document_index), resolution);}')
            f=replace(f,'catalog_.ValidateSearchSource(batch, error)','r154::Eval(r154::Validate1,[&]{return catalog_.ValidateSearchSource(batch, error);})')
            f=replace(f,'catalog_.ValidateSearchSource(batch,error)','r154::Eval(r154::Validate2,[&]{return catalog_.ValidateSearchSource(batch,error);})')
            f=replace(f,'const bool built = batch.rebuild ?', 'const bool built = r154::Eval(r154::Build,[&]{return batch.rebuild ?')
            f=replace(f,'RecordingSearchModel::ApplyDelta(*previous, batch.delta, &next, error, limits);','RecordingSearchModel::ApplyDelta(*previous, batch.delta, &next, error, limits);});')
            s=s[:start]+f+s[end:]
        elif name.endswith('recording_search_application_service.cpp'):
            s=replace(s,'recording::SearchDiagnostic diagnostic(catalog_.SearchResidency().get());','recording::SearchDiagnostic diagnostic(catalog_.SearchResidency().get());r154::Search search_probe(diagnostic);')
        elif name.endswith('recording_read_service.cpp'):
            from recording_http_currentness_overlay import read
            s=read(s)
        elif name.endswith('webrtc_http_server.cpp'):
            s=replace(s,'std::optional<HttpRequest> ReadHttpRequest(int client_fd, HttpResponse* error_response) {','std::optional<HttpRequest> ReadHttpRequest(int client_fd, HttpResponse* error_response) {\n    r154::header_count=0;')
            s=replace(s,'        request.headers[key] = value;','        r154::HeaderSeen(key);request.headers[key] = value;')
        elif name.endswith('webrtc_http_server_runtime.cpp'):
            s=replace(s,'            const auto accepted_at =','            const auto r154_accepted=r154::Tick();\n            const auto accepted_at =')
            s=replace(s,'site_request_diagnostic_enabled, accepted_at] {','site_request_diagnostic_enabled, accepted_at,r154_accepted] {')
            s=replace(s,'auto request_opt = ReadHttpRequest(client_fd, &response);','auto request_opt = ReadHttpRequest(client_fd, &response);\n                r154::Server r154_request(request_opt?r154::Correlation(HeaderValue(*request_opt,"x-r154-id")):0,r154_accepted);')
            s=replace(s,'site_diagnostic.Emit(SiteOperationsRequestDiagnostic::Phase::HandlerBegin);','r154_request.handler=r154::Tick();site_diagnostic.Emit(SiteOperationsRequestDiagnostic::Phase::HandlerBegin);')
            s=replace(s,'site_diagnostic.Emit(SiteOperationsRequestDiagnostic::Phase::HandlerEnd);','r154_request.prepared=r154::Tick();site_diagnostic.Emit(SiteOperationsRequestDiagnostic::Phase::HandlerEnd);')
            s=replace(s,'const bool sent = SendAllObserved(client_fd, encoded, observation.get());','r154_request.sendBegin=r154::Tick();const bool sent = SendAllObserved(client_fd, encoded, observation.get());r154_request.sendEnd=r154::Tick();r154_request.sent=sent;')
            s=replace(s,'                active_connection_guard.Finish();','                r154_request.End();active_connection_guard.Finish();')
            # Streaming routes retain original sends; explicitly unknown transmission stamps there.
        else:
            s=replace(s,'HttpObservation observation{id,"r152",route,begin};','HttpObservation observation{id,"r152",route,begin};r154::Client client_probe(id,observation);')
            s=replace(s,'if(c.fd<0){c.fd=socket','if(c.fd<0){r154::connects[id-1][0]=r154::Tick();c.fd=socket')
            s=replace(s,'"connect");}','"connect");r154::connects[id-1][1]=r154::Tick();}')
            s=replace(s,'HTTP/1.1\\r\\nHost: localhost\\r\\n','HTTP/1.1\\r\\nX-R154-ID: "+std::to_string(id)+"\\r\\nHost: localhost\\r\\n')
            s=replace(s,'NeedHttp(webrtc_http_server_detail::SendAll(c.fd,request),"send");','client_probe.sendBegin=r154::Tick();NeedHttp(webrtc_http_server_detail::SendAll(c.fd,request),"send");client_probe.sendEnd=r154::Tick();')
            s=replace(s,'for(auto& c:sockets){c.fd=socket','for(auto& c:sockets){r154::connects[9+(&c-sockets.data())][0]=r154::Tick();c.fd=socket')
            s=replace(s,'"parallel connect");}','"parallel connect");r154::connects[9+(&c-sockets.data())][1]=r154::Tick();}')
        if name.endswith('recording_search_application_service.cpp'):
            from recording_http_currentness_overlay import search
            s=search(s)
        path=out/Path(name).name;path.write_text('#include "recording_http_currentness_probe.h"\n'+s)
        result[name]={'originalSha256':hashlib.sha256(raw.encode()).hexdigest(),'overlaySha256':hashlib.sha256(path.read_bytes()).hexdigest(),'overlay':path.name}
    return result
