#!/usr/bin/env python3
"""R159 opt-in wrapper around unchanged R157 workload and bounds."""
import argparse,json,hashlib
from pathlib import Path
import recording_http_cost_run as cost
import recording_http_lock as locks
import recording_http_lock_overlay as overlay

def generate(out):
 from recording_http_cost_overlay import generate as original
 result=original(out)
 for name in result:
  path=out/result[name]['overlay']
  if name.endswith('recording_catalog.cpp'):path.write_text(overlay.catalog(path.read_text()))
  elif name.endswith('recording_search_application_service.cpp'):path.write_text(overlay.search(path.read_text()))
  result[name]['overlaySha256']=cost.base.digest(path)
 catalog=(out/'recording_catalog.cpp').read_text().splitlines()
 sites=[next(i for i,s in enumerate(catalog,1) if 'r159::Call lock_call('+str(api)+',' in s) for api in range(7)]
 (out.parent/'lock-sites.json').write_text(json.dumps(sites)+'\n')
 return result

def build(parent):
 import recording_http_hold_overlay as hold_overlay
 original_generate=cost.generate;original_focused=hold_overlay.focused
 def focused(native):
  s=original_focused(native)
  s=s.replace(' static sqlite3* Db(', ' static std::unique_lock<std::mutex> Own(RecordingCatalog& c){return std::unique_lock<std::mutex>(c.mu_);}\n static sqlite3* Db(')
  injection='''
  {
   bool done=false;r159::Window window(11,done);const auto previous=recording::latency::local.request;
   {auto media=reader.ResolveMedia("9101",id);NeedHttp(bool(media),"R159 actual Catalog media");}
   NeedHttp(window.record.count==10&&recording::latency::local.request==previous&&holds()==base,"R159 actual ten locks and restored TLS");
   for(unsigned i=0;i<window.record.count;++i)NeedHttp(window.record.rows[i].ordinal==i+1&&window.record.rows[i].owned,"R159 ordinal ownership");done=true;
  }
  {
   auto owned=recording::RecordingAggregateResourceProbe::Own(catalog);std::mutex gate;std::condition_variable cv;bool armed=false;std::atomic<bool> acquired{false};
   const auto begin=recording::latency::Now();std::thread waiter([&]{bool done=false;r159::Window window(60,done);{std::lock_guard<std::mutex> l(gate);armed=true;cv.notify_one();}NeedHttp(bool(catalog.FindSegmentV2ById(id)),"R159 contended Catalog");acquired=true;done=true;});
   {std::unique_lock<std::mutex> l(gate);cv.wait(l,[&]{return armed;});}std::this_thread::sleep_for(std::chrono::milliseconds(20));NeedHttp(!acquired,"R159 owner gates Catalog");const auto release=recording::latency::Now();owned.unlock();waiter.join();NeedHttp(acquired,"R159 acquired after owner release");
   std::cout<<"[R159-owner] "<<begin<<" "<<release<<"\\n";
  }
'''
  s=s.replace('  const auto base=holds();','  const auto base=holds();'+injection)
  return '#include "recording_http_lock_probe.h"\n#include <condition_variable>\n#include <thread>\n'+s
 cost.generate=generate;hold_overlay.focused=focused
 try:cost.build(parent)
 finally:cost.generate=original_generate;hold_overlay.focused=original_focused

class Live:
 def __init__(self,sites):self.base=cost.LiveTrace();self.lock=locks.Collector(sites);self.first=None
 def __call__(self,line,context):
  if self.first:raise cost.DiagnosticFailure(self.first)
  try:
   self.base(line,context);self.lock.feed(line.decode('utf-8',errors='strict').rstrip('\n'))
  except cost.DiagnosticFailure as e:self.first=e.failure;raise
  except Exception as e:
   self.first=dict(context,source='original-lock',code=str(e));raise cost.DiagnosticFailure(self.first) from e

def run(parent):
 sites=json.loads((parent/'lock-sites.json').read_text());live=Live(sites);old_live=cost.LiveTrace;old_env=cost.base.environment
 def environment(p):
  e=old_env(p);e.update(MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE='1',MEDIA_SERVER_VERIFY_RECORDING_LATENCY_SLOW_ONLY='0',MEDIA_SERVER_VERIFY_CATALOG_HOLDER_TRACE='0');return e
 cost.LiveTrace=lambda:live;cost.base.environment=environment
 try:rc=cost.run(parent)
 finally:cost.LiveTrace=old_live;cost.base.environment=old_env
 p=parent/'run/attribution.json';result=json.loads(p.read_text())
 if not rc:
  try:result['locks']=live.lock.finish(hold={int(i):r for i,r in result['hold'].items()});result['decision']='LOCK_ATTRIBUTION_REVIEW_PENDING'
  except Exception as e:result['error']=str(e);result['decision']='FAIL_LOCK_TRACE_CONTRACT';rc=1
 p.write_text(json.dumps(result,indent=2)+'\n');return rc
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('action',choices=['build','run']);p.add_argument('parent');a=p.parse_args()
 if a.action=='build':build(Path(a.parent))
 else:raise SystemExit(run(Path(a.parent)))
