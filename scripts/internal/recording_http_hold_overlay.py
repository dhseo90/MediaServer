"""R157 literal test-only additions. Product locking/SQL/return order is unchanged."""
from recording_http_cost_overlay import replace

def section(s,start,end,fn):
 a=s.index(start);b=s.index(end,a);return s[:a]+fn(s[a:b])+s[b:]

def catalog(s):
 # Constructor and body scopes deliberately do not claim raw mutex timing.
 names=['FindSegmentV2ById','AcquireMediaWithContext','ValidateMediaWithContext','FindSegmentById','IsDeletedSegmentId','ListEventLinks','AdjustHoldCount']
 for name in names:
  a=s.index('RecordingCatalog::'+name+'(');b=s.index('\n}',a)
  f=s[a:b];anchor='recording::latency::Lock lock(mu_,recording::latency::Source::Catalog,__LINE__,false,__func__);'
  f=replace(f,anchor,'r157::Phase constructor_cost(r157::LockConstruction);'+anchor+'constructor_cost.End();r157::Phase owned_body(r157::OwnedBody);')
  s=s[:a]+f+s[b:]
 def eligibility(f):
  f=replace(f,' const try {',' const try {\n    r157::Phase eligible_cost(r157::Eligibility);')
  f=replace(f,'CanReadLocked(nullptr)','r157::Eval(r157::EligibilityCanRead,[&]{return CanReadLocked(nullptr);})')
  f=replace(f,'EffectiveLifecycleV2Locked(id,true)','r157::Eval(r157::EligibilityLifecycle,[&]{return EffectiveLifecycleV2Locked(id,true);})')
  f=replace(f,'    for(const auto& entry:event_links_)','    r157::Phase event_cost(r157::EventProtection);for(const auto& entry:event_links_)')
  f=replace(f,'    const auto& segment=*current;','    event_cost.End();const auto& segment=*current;')
  f=replace(f,'if(segment.retention_class==RecordingRetentionClass::Continuous)return true;','if(segment.retention_class==RecordingRetentionClass::Continuous){r157::Count(r157::Continuous);return true;}')
  f=replace(f,'if(segment.retention_class!=RecordingRetentionClass::Event)return false;','if(segment.retention_class!=RecordingRetentionClass::Event){r157::Count(r157::OtherRetention);return false;}r157::Count(r157::Event);')
  return f
 s=section(s,'bool RecordingCatalog::MediaV2EligibleLocked','bool RecordingCatalog::AcquireMediaV2',eligibility)
 def acquire(f):
  f=replace(f,'    if(segment)*segment={};','    r157::Phase init_cost(r157::AcquireInit);if(segment)*segment={};')
  f=replace(f,'    if(!segment||!location||','    init_cost.End();if(!segment||!location||')
  f=replace(f,'media_relpaths_.find(id)','r157::Eval(r157::LocationLookup,[&]{return media_relpaths_.find(id);})')
  f=replace(f,'    *segment=segments_v2_.at(id);*location={options_.media_root,path->second};','    {r157::Phase copy_cost(r157::SegmentCopy);*segment=segments_v2_.at(id);*location={options_.media_root,path->second};}')
  f=replace(f,'return AdjustHoldCountLocked(id,1,error);','return r157::Hold(1,[&]{return AdjustHoldCountLocked(id,1,error);});')
  return f
 s=section(s,'bool RecordingCatalog::AcquireMediaWithContext','bool RecordingCatalog::ValidateMediaV2',acquire)
 def validate(f):
  f=replace(f,' const {',' const {\n    r157::Phase validate_cost(r157::ValidateBody);')
  f=replace(f,'media_relpaths_.find(segment.segment_id)','r157::Eval(r157::LocationLookup,[&]{return media_relpaths_.find(segment.segment_id);})')
  f=replace(f,'SameRecordingSegmentV2Content(segment,current->second)','r157::Eval(r157::ContentCompare,[&]{return SameRecordingSegmentV2Content(segment,current->second);})')
  return f
 s=section(s,'bool RecordingCatalog::ValidateMediaLocked','RecordingLifecycle RecordingCatalog::SegmentLifecycleV2',validate)
 s=replace(s,'return AdjustHoldCountLocked(segment_id,delta,error);','return r157::Hold(delta,[&]{return AdjustHoldCountLocked(segment_id,delta,error);});')
 def adjust(f):
  f=replace(f,'CanReadLocked(error)','r157::H(r157::PlusRead,[&]{return CanReadLocked(error);})')
  f=replace(f,'EffectiveLifecycleV2Locked(segment_id,true)','r157::H(r157::PlusLifecycle,[&]{return EffectiveLifecycleV2Locked(segment_id,true);})')
  f=replace(f,'    const auto current_hold=','    r157::Phase lookup_cost(r157::HoldStage(r157::PlusLookup));const auto current_hold=')
  f=replace(f,'    const std::uint64_t magnitude =','    lookup_cost.End();r157::Count(r157::direction<0?r157::MinusPrior:r157::PlusPrior,current);r157::Phase range_cost(r157::HoldStage(r157::PlusRange));const std::uint64_t magnitude =')
  f=replace(f,'    if(generation_backend_&&!UpdateGenerationHoldsLocked({{segment_id,next}},error))return false;', '    range_cost.End();r157::Count(r157::direction<0?r157::MinusNext:r157::PlusNext,next);\n    if(generation_backend_&&!r157::H(r157::PlusGeneration,[&]{r157::Count(r157::direction<0?r157::GenerationMinus:r157::GenerationPlus);return UpdateGenerationHoldsLocked({{segment_id,next}},error);}))return false;')
  f=replace(f,'    if (sqlite_db_ != nullptr) {','    if (sqlite_db_ != nullptr) {r157::Count(r157::direction<0?r157::LegacyMinus:r157::LegacyPlus);r157::Phase legacy_cost(r157::HoldStage(r157::PlusLegacy));')
  f=replace(f,'    if (next == 0) hold_counts_.erase(segment_id);\n    else hold_counts_[segment_id] = next;', '    {r157::Phase map_cost(r157::HoldStage(r157::PlusMap));if (next == 0) hold_counts_.erase(segment_id);\n    else hold_counts_[segment_id] = next;}')
  return f
 s=section(s,'bool RecordingCatalog::AdjustHoldCountLocked','RecordingOrphanReport RecordingCatalog::InspectOrphans',adjust)
 def generation(f):
  f=replace(f,'journal_.CommitGenerationProtection(this,[]{return true;},error)','r157::H(r157::PlusPrecheck,[&]{return journal_.CommitGenerationProtection(this,[]{return true;},error);})')
  f=replace(f,'Exec(db,"BEGIN IMMEDIATE",error)','r157::H(r157::PlusBegin,[&]{r157::Count(r157::direction<0?r157::SQLiteMinus:r157::SQLitePlus);return Exec(db,"BEGIN IMMEDIATE",error);})')
  f=replace(f,'sqlite3_prepare_v2(db,"INSERT INTO b_hold VALUES(?,?) ON CONFLICT(id) DO UPDATE SET count=excluded.count",-1,&statement,nullptr)','r157::H(r157::PlusPrepare,[&]{return sqlite3_prepare_v2(db,"INSERT INTO b_hold VALUES(?,?) ON CONFLICT(id) DO UPDATE SET count=excluded.count",-1,&statement,nullptr);})')
  f=replace(f,'        BindText(statement,1,p.first);','        r157::Phase bind_cost(r157::HoldStage(r157::PlusBindStep));BindText(statement,1,p.first);')
  f=replace(f,'sqlite3_finalize(statement);','sqlite3_finalize(statement);bind_cost.End();')
  f=replace(f,'journal_.CommitGenerationProtection(this,[&]{return Exec(db,"COMMIT",error);},error)','r157::H(r157::PlusCommitAuthority,[&]{return journal_.CommitGenerationProtection(this,[&]{return r157::H(r157::PlusCommit,[&]{return Exec(db,"COMMIT",error);});},error);})')
  f=replace(f,'Exec(db,"ROLLBACK",nullptr)','r157::H(r157::PlusRollback,[&]{return Exec(db,"ROLLBACK",nullptr);})',3)
  return f
 return section(s,'bool RecordingCatalog::UpdateGenerationHoldsLocked','bool RecordingCatalog::Open(',generation)

def read(s):
 # Inside R156 wrappers: API elapsed includes original lock RAII destruction.
 for expr,stage,count in [('catalog_.IsDeletedSegmentId(segment_id)','DeletedAPI',2),('catalog_.FindSegmentById(segment_id)','V1API',1),('catalog_.FindSegmentV2ById(segment_id)','V2API',1),('catalog_.AcquireMediaWithContext(channel_id,segment_id,&current,&location,&error,context)','AcquireAPI',1),('catalog_.ValidateMediaWithContext(current,location,context)','ValidateAPI',1)]:
  a=s.index('std::unique_ptr<ResolvedRecordingMedia> RecordingReadService::ResolveMediaWithContext(');b=s.index('\nstd::uint64_t RecordingReadService::TracePreparationStarted',a)
  f=replace(s[a:b],expr,'r157::BoolApi(r157::'+stage+',[&]{return '+expr+';})',count);s=s[:a]+f+s[b:]
 s=replace(s,'catalog.ListEventLinks(status)','r157::Api(r157::LinksAPI,[&]{return catalog.ListEventLinks(status);},[](const auto&){return true;})')
 a=s.index('ResolvedRecordingMedia::~ResolvedRecordingMedia()');b=s.index('\nRecordingCatalog::SourceBindingHandle',a);f=s[a:b]
 f=replace(f,'::close(fd_);','r157::Eval(r157::FDClose,[&]{const auto rc=::close(fd_);r157::Count(rc==0?r157::CloseOK:r157::CloseFail);return rc;});')
 f=replace(f,'memory_diagnostic::Add(memory_diagnostic::ResolvedMediaFDs,-1);','r157::Eval(r157::FDDiagnostic,[&]{return memory_diagnostic::Add(memory_diagnostic::ResolvedMediaFDs,-1);});')
 f=replace(f,'catalog_->AdjustHoldCount(segment_id_, -1, nullptr)','r157::BoolApi(r157::ReleaseAPI,[&]{return catalog_->AdjustHoldCount(segment_id_, -1, nullptr);})')
 return s[:a]+f+s[b:]

def focused(native):
 prefix='''#include "recording_http_hold_probe.h"
#include <sqlite3.h>
#include "recording/recording_catalog.h"
namespace recording {struct RecordingAggregateResourceProbe {
 static sqlite3* Db(RecordingCatalog& c){return c.generation_sqlite_db_;}
 static bool EventWithoutOwner(RecordingCatalog& c,const RecordingSegmentV2& original){
  std::lock_guard lock(c.mu_);auto event=original;event.retention_class=RecordingRetentionClass::Event;
  return c.MediaV2EligibleLocked(event.channel_id,event.segment_id,nullptr,&event);
 }
 static bool LinkedDenied(RecordingCatalog& c,const RecordingSegmentV2& original){
  std::lock_guard lock(c.mu_);EventRecordingLinkV1 link;link.link_id="r157-focused-link";link.event_id="r157-event";link.source_id="r157-source";link.channel_id=original.channel_id;link.created_at_ms=1;link.updated_at_ms=1;link.time_basis="utc-ms";link.requested_range=UtcRangeV1{1,2};link.derived_segment_id=original.segment_id;
  c.event_links_.emplace("r157-focused-link",link);const bool result=c.MediaV2EligibleLocked(original.channel_id,original.segment_id,nullptr,&original);c.event_links_.erase("r157-focused-link");return !result;
 }
};}
'''
 injection=r'''
  {
   r157::Record cost;cost.id=10;struct Restore157 {r157::Record* prior=r157::active;r157::Phase* priorTop=r157::top;~Restore157(){r157::active=prior;r157::top=priorTop;}} restore157;r157::active=&cost;
   auto media=reader.ResolveMedia("9101",id);NeedHttp(bool(media)&&holds()==base+1,"R157 held exactly once");
   const int fd=media->fd();media.reset();NeedHttp(holds()==base&&fcntl(fd,F_GETFD)==-1&&errno==EBADF,"R157 hold0 fd closed");
   NeedHttp(cost.counts[r157::PlusCalls]==1&&cost.counts[r157::MinusCalls]==1&&cost.counts[r157::PlusOK]==1&&cost.counts[r157::MinusOK]==1&&cost.counts[r157::CloseOK]==1,"R157 exact +1/-1 and close counts");
   NeedHttp(cost.counts[r157::GenerationPlus]==1&&cost.counts[r157::GenerationMinus]==1&&cost.counts[r157::SQLitePlus]==1&&cost.counts[r157::SQLiteMinus]==1,"R157 real generation SQLite branches");
   for(auto stage:{r157::PlusPrecheck,r157::MinusPrecheck,r157::PlusBegin,r157::MinusBegin,r157::PlusPrepare,r157::MinusPrepare,r157::PlusBindStep,r157::MinusBindStep,r157::PlusCommitAuthority,r157::MinusCommitAuthority,r157::PlusCommit,r157::MinusCommit})NeedHttp(cost.calls[stage]==1,"R157 SQL/protection actual once");
   NeedHttp(cost.calls[r157::PlusRollback]==0&&cost.calls[r157::MinusRollback]==0&&cost.counts[r157::PlusNext]==base+1&&cost.counts[r157::MinusNext]==base,"R157 normal delta and no rollback");
   NeedHttp(cost.inclusive[r157::PlusCommit]<=cost.inclusive[r157::PlusCommitAuthority]&&cost.inclusive[r157::PlusCommitAuthority]<=cost.inclusive[r157::PlusGeneration]&&cost.inclusive[r157::MinusHold]<=cost.inclusive[r157::ReleaseAPI],"R157 inclusive parent boundaries");
   auto badCurrent=*row;badCurrent.checksum_sha256=std::string(64,'0');const auto location=catalog.FindSegmentMediaLocation(id);NeedHttp(location&&!catalog.ValidateMediaV2(badCurrent,*location),"R157 exact content currentness rejected");
   NeedHttp(!recording::RecordingAggregateResourceProbe::EventWithoutOwner(catalog,*row)&&recording::RecordingAggregateResourceProbe::LinkedDenied(catalog,*row),"R157 event owner and link protection preserved");
   NeedHttp(cost.counts[r157::Event]==1,"R157 actual missing event owner branch");
   auto* db=recording::RecordingAggregateResourceProbe::Db(catalog);NeedHttp(db!=nullptr,"R157 generation SQL handle");
   for(bool commit:{false,true}){
    cost={};cost.id=10;
    if(commit)sqlite3_commit_hook(db,[](void*)->int{return 1;},nullptr);
    else NeedHttp(sqlite3_exec(db,"CREATE TEMP TRIGGER r157_owned_abort BEFORE INSERT ON b_hold BEGIN SELECT RAISE(ABORT,'owned fault'); END",nullptr,nullptr,nullptr)==SQLITE_OK,"R157 owned SQL trigger");
    const bool accepted=catalog.AdjustHoldCount(id,1,&error);
    if(commit)sqlite3_commit_hook(db,nullptr,nullptr);
    else NeedHttp(sqlite3_exec(db,"DROP TRIGGER r157_owned_abort",nullptr,nullptr,nullptr)==SQLITE_OK,"R157 owned trigger removal");
    NeedHttp(!accepted&&cost.counts[r157::PlusFail]==1&&cost.calls[r157::PlusRollback]==1&&holds()==base&&sqlite3_get_autocommit(db),"R157 actual failed hold rollback and map preserved");
    NeedHttp(cost.calls[r157::PlusCommit]==(commit?1:0),"R157 SQL step versus COMMIT fault distinguished");
   }
   cost={};cost.id=10;NeedHttp(!catalog.AdjustHoldCount(id,-1,&error)&&cost.counts[r157::MinusFail]==1&&holds()==base,"R157 double release refused");
   r157::active=nullptr;NeedHttp(!cost.depth&&!r157::top&&!r157::direction,"R157 scope restored");
   std::cout<<"[R157-focused] actual generation hold +1/-1 SQL step/COMMIT faults rollback currentness event/link FD PASS\n";
  }
'''
 native=replace(native,'  const auto base=holds();','  const auto base=holds();'+injection)
 return prefix+native
