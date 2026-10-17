"""R156 fail-closed literal transformations; no tracked product mutations."""
from recording_http_cost_overlay import replace

def search(s):
    s=replace(s,'std::string Take()&&{return std::move(value_);}', 'std::string Take()&&{r156::Phase take(r156::JsonTake);r156::Count(r156::ResponseBytes,value_.size());return std::move(value_);}')
    s=replace(s,'recording::SearchDiagnostic::Phase response_cost("CurrentnessJson");','recording::SearchDiagnostic::Phase response_cost("CurrentnessJson");\n        r156::Currentness currentness; r156::Count(r156::Positions,page.positions.size());')
    s=replace(s,'auto response_memory=catalog_.SearchResidency()->ReserveOwned(4ULL*4*1024*1024,recording::SearchModelResidency::Category::Response);','auto response_memory=r156::Eval(r156::ResponseAdmission,[&]{return catalog_.SearchResidency()->ReserveOwned(4ULL*4*1024*1024,recording::SearchModelResidency::Category::Response);});')
    s=replace(s,'if(id.empty()||Url(id).empty())return false;const auto key=std::to_string(channel.size())+":"+channel+id;', 'r156::Count(r156::AvailabilityCalls);r156::Phase key_cost(r156::AvailabilityKey);\n            if(id.empty()||Url(id).empty()){r156::Count(r156::InvalidKeys);return false;}const auto key=std::to_string(channel.size())+":"+channel+id;key_cost.End();')
    s=replace(s,'auto it=availability.find(key);if(it!=availability.end())return it->second;', 'auto it=r156::Eval(r156::AvailabilityCache,[&]{return availability.find(key);});if(it!=availability.end()){r156::Count(r156::CacheHits);return it->second;}r156::Count(r156::CacheMisses);')
    s=replace(s,'const bool ok=bool(reader_.ResolveMedia(channel,id));availability.emplace(key,ok);return ok;', 'r156::Count(r156::ResolveCalls);const bool ok=r156::Eval(r156::MediaResolve,[&]{return bool(reader_.ResolveMedia(channel,id));});r156::Count(ok?r156::ResolveOK:r156::ResolveFail);r156::Eval(r156::AvailabilityCache,[&]{return availability.emplace(key,ok);});r156::Count(r156::UniqueKeys);return ok;')
    s=replace(s,'        SearchJson json;','        r156::Phase init_cost(r156::JsonInitialization);SearchJson json;')
    s=replace(s,'        bool first=true;','        init_cost.End();bool first=true;')
    s=replace(s,'            bool playable=available(d.channel_id,target);','            r156::Count(r156::PreferredChecks);bool playable=available(d.channel_id,target);')
    s=replace(s,'!playable&&preferred&&available(d.channel_id,d.segment_id)', '!playable&&preferred&&r156::Eval(r156::FallbackResolve,[&]{r156::Count(r156::FallbackChecks);const bool ok=available(d.channel_id,d.segment_id);r156::Count(ok?r156::FallbackOK:r156::FallbackFail);return ok;})')
    s=replace(s,'            if(!first)json.Raw(",");first=false;', '            r156::Count(r156::Items);r156::Phase item_cost(r156::ItemSerialization);if(!first)json.Raw(",");first=false;')
    s=replace(s,'catalog_.IsDeletedSegmentId(target)?"deleted"', 'r156::Eval(r156::DeletedState,[&]{r156::Count(r156::DeletedQueries);return catalog_.IsDeletedSegmentId(target);})?"deleted"')
    s=replace(s,'        json.Raw("],\\"appliedQuery', '        r156::Phase tail_cost(r156::ResponseTail);json.Raw("],\\"appliedQuery')
    # Exact last authorization only; early auth retains original semantics.
    s=replace(s,'        if(!Authorized(query,authorize))return Error(403,"recording-channel-forbidden");\n        diagnostic.status=200;', '        tail_cost.End();if(!r156::Eval(r156::AuthorizationRecheck,[&]{return Authorized(query,authorize);}))return Error(403,"recording-channel-forbidden");\n        currentness.record.complete=true;diagnostic.status=200;')
    return s

def read(s):
    s=replace(s,'ResolvedRecordingMedia::~ResolvedRecordingMedia() {','ResolvedRecordingMedia::~ResolvedRecordingMedia() {\n    r156::Phase release_cost(r156::MediaObjectRelease);')
    start=s.index('std::unique_ptr<ResolvedRecordingMedia> RecordingReadService::ResolveMediaWithContext(')
    end=s.index('\nstd::uint64_t RecordingReadService::TracePreparationStarted',start)
    f=s[start:end]
    def wrap(old,stage,count=1):
        nonlocal f
        f=replace(f,old,'r156::Eval(r156::'+stage+',[&]{return '+old+';})',count)
    wrap('catalog_.IsDeletedSegmentId(segment_id)','DeletedIdCheck',2)
    wrap('catalog_.FindSegmentById(segment_id)','SegmentLookup')
    wrap('catalog_.FindSegmentV2ById(segment_id)','SegmentLookup')
    wrap('AllLinks(catalog_)','EventLinkLookup')
    f=replace(f,'    const auto links =', '    if(segment)r156::Count(r156::V1Rows);if(segment_v2)r156::Count(r156::V2Rows);\n    const auto links =')
    wrap('catalog_.AcquireMediaWithContext(channel_id,segment_id,&current,&location,&error,context)','MediaHoldAcquire')
    wrap('OpenMedia(location.first,location.second)','ContainedMediaOpen')
    wrap('catalog_.ValidateMediaWithContext(current,location,context)','MediaCurrentValidation')
    wrap('catalog_.AdjustHoldCount(segment_id, 1, nullptr)','MediaHoldAcquire')
    wrap('catalog_.FindSegmentMediaLocation(segment_id)','SegmentLookup')
    wrap('OpenMedia(location->first, location->second)','ContainedMediaOpen')
    wrap('OpenMedia(event_root_, RelativeLocator(event_root_, *fallback->fallback_media_locator))','ContainedMediaOpen')
    wrap('OpenMedia(event_root_, RelativeLocator(event_root_, *path))','ContainedMediaOpen')
    f=replace(f,'const auto inspected=InspectRecordingPhysicalMediaFd(media->fd_,{', 'const auto inspected=r156::Inspect(options.budget.count(),[&]{return InspectRecordingPhysicalMediaFd(media->fd_,{')
    f=replace(f,'current.checksum_sha256,current.retention_class},options);','current.checksum_sha256,current.retention_class},options);});')
    return s[:start]+f+s[end:]

def focused(native, original, instrumented):
    """Reuse original native V2 negative cases; exercise generated availability code verbatim."""
    def json_class(s):return s[s.index('class SearchJson {'):s.index('\nstd::string Url(')]
    prefix='#include "recording_http_currentness_probe.h"\n#include <optional>\n#include <string_view>\n#include <vector>\n'
    prefix+='namespace original156 { '+json_class(original)+' }\nnamespace instrumented156 { '+json_class(instrumented)+' }\n'
    # The exact production availability lambda with this reader; no mock media success.
    a=instrumented.index('        std::map<std::string,bool> availability;')
    b=instrumented.index('        r156::Phase init_cost',a)
    availability=instrumented[a:b]
    fallback=next(line.strip() for line in instrumented.splitlines() if 'if(!playable&&preferred&&r156::Eval' in line)
    injection=r'''
  {
   r156::Record cost;cost.id=10;r156::active=&cost;auto& reader_=reader;
   const auto Url=[](const std::string& value){return recording::ValidateOpaqueId(value,nullptr)?"/ops/api/recordings/media/"+value:"";};
AVAILABILITY
   NeedHttp(available("9101",id)&&available("9101",id),"R156 real media cache reuse");
   NeedHttp(!available("9201",id)&&!available("9101","")&&!available("9101","missing-r156"),"R156 channel empty missing");
   NeedHttp(cost.counts[r156::AvailabilityCalls]==5&&cost.counts[r156::CacheHits]==1&&cost.counts[r156::CacheMisses]==3&&cost.counts[r156::InvalidKeys]==1&&cost.counts[r156::ResolveOK]==1&&cost.counts[r156::ResolveFail]==2,"R156 exact native availability counts");
   NeedHttp(cost.calls[r156::PhysicalInspection]==1&&cost.calls[r156::MediaObjectRelease]==1&&cost.inspections[0].state==0,"R156 actual inspection and release");
   struct Doc156 {std::string channel_id,segment_id;} d{"9101",id};
   std::string target="missing-preferred";bool playable=available(d.channel_id,target);const bool preferred=true;
FALLBACK
   NeedHttp(playable&&target==id&&cost.counts[r156::FallbackOK]==1,"R156 actual fallback success");
   d.segment_id="missing-fallback";target="missing-preferred";playable=false;
FALLBACK
   NeedHttp(!playable&&cost.counts[r156::FallbackFail]==1,"R156 actual fallback unavailable");
   original156::SearchJson original;instrumented156::SearchJson changed;
   original.Raw("{").Text("x\\\"\n").Raw(":").List({"a","b"}).Raw(",\"n\":").Decimal(std::nullopt).Raw("}");
   changed.Raw("{").Text("x\\\"\n").Raw(":").List({"a","b"}).Raw(",\"n\":").Decimal(std::nullopt).Raw("}");
   const auto before=std::move(original).Take(),after=std::move(changed).Take();NeedHttp(before==after&&cost.counts[r156::ResponseBytes]==after.size(),"R156 exact JSON bytes unchanged");
   try{r156::Phase outer(r156::ItemSerialization);r156::Phase inner(r156::DeletedState);throw std::runtime_error("scope-test");}catch(const std::runtime_error&){}
   NeedHttp(!cost.depth&&!r156::top&&cost.inclusive[r156::DeletedState]<=cost.inclusive[r156::ItemSerialization],"R156 exception nesting restored");
   r156::active=nullptr;
  }
  {
   setenv("MEDIA_SERVER_VERIFY_RECORDING_SEARCH_TRACE","1",1);r154::Record request;request.id=10;r154::active=&request;
   ingress::RecordingApplicationService app(reader,catalog,true,{});
   std::unordered_map<std::string,std::string> q{{"channelIds","9101"},{"startTimeMs","1791887399000"},{"endTimeMs","1791887420000"},{"includeUnplaced","true"},{"limit","20"}};
   const auto ok=app.Search(q,"focused","9101",[](const auto& c){return c=="9101";});NeedHttp(ok.status==200&&ok.body.find("\"playable\":true")!=std::string::npos,"R156 actual Search currentness");
   NeedHttp(app.Search(q,"focused","9101",[](const auto&){return false;}).status==403,"R156 scope unchanged");
   ingress::RecordingApplicationService disabled(reader,catalog,false,{});NeedHttp(disabled.Search(q,"focused","9101",[](const auto&){return true;}).status==503,"R156 disabled unchanged");
   q["snapshotId"]=std::string(32,'0');q["hitId"]="missing";NeedHttp(app.SearchSeek(q,"focused","9101",[](const auto&){return true;}).status==410,"R156 expired unchanged");
   r154::active=nullptr;
  }
  r156::Record negative156;negative156.id=10;r156::active=&negative156;
'''.replace('AVAILABILITY',availability).replace('FALLBACK',fallback)
    native=replace(native,'  const auto holds=[&]',injection+'\n  const auto holds=[&]')
    native=replace(native,'  NeedHttp(runtime.Finish(&error),"focused Finish");',r'''
  NeedHttp(negative156.calls[r156::PhysicalInspection]>=5&&negative156.calls[r156::MediaObjectRelease]>=5,"R156 negative paths actually instrumented");
  bool failedInspection=false;for(unsigned i=0;i<negative156.samples;++i)failedInspection|=negative156.inspections[i].state!=0;
  NeedHttp(failedInspection&&!negative156.depth&&!r156::top,"R156 failed inspection cleanup");
  r156::active=nullptr;NeedHttp(!r154::loss,"R156 native no diagnostic loss");
  {r156::Record bounds;r156::active=&bounds;recording::MediaInspectionResult healthy;healthy.state=recording::MediaInspectionState::Healthy;
   for(unsigned i=0;i<128;++i)(void)r156::Inspect(5000,[&]{return healthy;});NeedHttp(bounds.samples==128&&!r154::loss,"R156 inspection cap accepted");
   (void)r156::Inspect(5000,[&]{return healthy;});NeedHttp(bounds.samples==128&&r154::loss,"R156 inspection overflow refused");r154::loss=false;r154::first_loss=0;r154::loss_emitted=false;
   const auto descend=[&](auto&& self,unsigned n)->void{r156::Phase phase(r156::ItemSerialization);if(n)self(self,n-1);};
   descend(descend,31);NeedHttp(!r154::loss&&!bounds.depth&&!r156::top,"R156 depth32 accepted");descend(descend,32);NeedHttp(r154::loss&&!bounds.depth&&!r156::top,"R156 depth33 refused and restored");r154::loss=false;r154::first_loss=0;r154::loss_emitted=false;r156::active=nullptr;
  }
  // Forced overflow is a focused diagnostic fault, never a normal media result.
  r156::Record overflow;overflow.counts[r156::Items]=~std::uint64_t{0};r156::active=&overflow;r156::Count(r156::Items);NeedHttp(r154::loss,"R156 overflow loss");r154::loss=false;r154::first_loss=0;r154::loss_emitted=false;r156::active=nullptr;
  NeedHttp(runtime.Finish(&error),"focused Finish");
  std::cout<<"[R156-focused] actual availability/JSON/Search/ReadService/nesting/negative ownership PASS\n";
''')
    return prefix+native
