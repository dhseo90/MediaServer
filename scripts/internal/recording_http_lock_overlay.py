"""R159 original-Lock callsite instrumentation, no shadow header or lifetime wrapper."""
from recording_http_cost_overlay import replace
NAMES=['IsDeletedSegmentId','FindSegmentById','FindSegmentV2ById','ListEventLinks','AcquireMediaWithContext','ValidateMediaWithContext','AdjustHoldCount']
def catalog(s):
 for api,name in enumerate(NAMES):
  a=s.index('RecordingCatalog::'+name+'(');b=s.index('\n}',a);f=s[a:b]
  old='r157::Phase constructor_cost(r157::LockConstruction);recording::latency::Lock lock(mu_,recording::latency::Source::Catalog,__LINE__,false,__func__);constructor_cost.End();r157::Phase owned_body(r157::OwnedBody);'
  delta='delta<0?-1:delta>0?1:0' if name=='AdjustHoldCount' else '1' if name=='AcquireMediaWithContext' else '0'
  new=f'r159::Call lock_call({api},__LINE__,{delta});r157::Phase constructor_cost(r157::LockConstruction);lock_call.Begin();recording::latency::Lock lock(mu_,recording::latency::Source::Catalog,__LINE__,lock_call.Selected(),__func__);lock_call.Acquired(lock.owns_lock());constructor_cost.End();r159::Release lock_release{{lock_call}};r157::Phase owned_body(r157::OwnedBody);'
  s=s[:a]+replace(f,old,new)+s[b:]
 return '#include "recording_http_lock_probe.h"\n'+s
def search(s):
 return '#include "recording_http_lock_probe.h"\n'+replace(s,'r156::Currentness currentness;','r156::Currentness currentness;r159::Window lock_window(currentness.record.id,currentness.record.complete);')
