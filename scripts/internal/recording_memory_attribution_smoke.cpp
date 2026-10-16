// 파일 용도: 진단 ticket/공유 모델/만료의 결정적 기대값. 제품 서버·미디어 부하 없음.
#include "recording/recording_search_snapshots.h"
#include "recording/recording_memory_diagnostic_output.h"
#include <iostream>
#include <thread>
#include <atomic>
#include <stdexcept>
using namespace recording;
static_assert(sizeof(SearchModelResidency::Reservation)==sizeof(std::shared_ptr<void>)+sizeof(std::size_t),"diagnostic category must not change charged value layout");
namespace d=recording::memory_diagnostic;
namespace {
unsigned checks=0;
void Check(bool value,const char* label){if(!value)throw std::runtime_error(label);++checks;std::cout<<"[pass] "<<label<<'\n';}
d::Pool Pool(){auto& s=d::Data();std::lock_guard lock(s.mutex);for(auto p:s.pools)if(p.key)return p;return {};}
std::size_t Models(){auto& s=d::Data();std::lock_guard lock(s.mutex);return std::count_if(s.models.begin(),s.models.end(),[](const auto&m){return m.id!=0;});}
SearchDocument Doc(const char* id){SearchDocument x;x.id=id;x.channel_id="canary-channel";x.segment_id=id;x.start_ns=1000000000;x.end_ns=2000000000;return x;}
std::string captured;
bool Sink(const char* p,std::size_t n){captured.append(p,n);return true;}
}
int main(){try{
 Check(d::Enabled(),"explicit diagnostic opt-in");
 using C=SearchModelResidency::Category;
 {SearchModelResidency r(1000);auto t=r.ReserveOwned(200,C::Page);Check(t.has_value(),"ticket admission unchanged");
  auto copy=*t;Check(r.DiagnosticSnapshot().bytes[unsigned(C::Page)]==400,"copy actual second charge");
  auto moved=std::move(copy);Check(r.used()==400&&copy.bytes()==0,"move no double charge");
  auto split=moved.Split(50);split.DiagnosticCategory(C::Response);auto s=r.DiagnosticSnapshot();Check(s.valid&&s.attributed==400&&s.bytes[unsigned(C::Response)]==50,"split and category conserve sum");
  bool exception=false;try{auto big=r.ReserveOwned(500,C::Page);auto denied=*big;(void)denied;}catch(const RecordingResourceUnavailable&){exception=true;}
  Check(exception&&r.used()==400,"failed copy and exception release");t.reset();moved={};split={};Check(r.used()==0&&r.DiagnosticSnapshot().attributed==0,"last reservation release");
  std::array<std::thread,4> threads;std::atomic<bool> good{true};
  for(auto& thread:threads)thread=std::thread([&]{for(int i=0;i<2000;++i){auto charge=r.ReserveOwned(100,C::SourceCut);auto row=r.DiagnosticSnapshot();if(!row.valid||row.used!=row.attributed||row.unattributed)good=false;}});
  for(auto& thread:threads){thread.join();}
  Check(good&&r.used()==0,"concurrent ledger capture consistent");
  auto unknown=r.ReserveOwned(40);Check(r.DiagnosticSnapshot().unattributed==40,"unknown not relabelled as attributed");}
 int same_address=0;
 const auto old_id=d::CreateModel(10,1,1,&same_address);
 Check(d::RetireModelKey(&same_address)==old_id,"detach key before allocator reuse");
 const auto new_id=d::CreateModel(20,2,2,&same_address);
 Check(d::ModelIdentity(&same_address)==new_id,"reused address resolves new identity");
 d::DestroyModel(old_id);Check(d::ModelIdentity(&same_address)==new_id,"old destroy cannot erase reused address");
 d::RetireModelKey(&same_address);d::DestroyModel(new_id);
 auto owner=std::make_shared<SearchModelResidency>();std::string error;
 std::shared_ptr<const RecordingSearchModel> model,other;
 Check(RecordingSearchModel::Build({Doc("canary-document")},"canary-source",1,&model,&error,{100000,64*1024*1024,owner}),"model real build");
 d::Current(0,model->diagnostic_identity());Check(Models()==1,"created current unique model");
 RecordingSearchQuery q;q.channels={"canary-channel"};q.start_time_ms=0;q.end_time_ms=3000;q.limit=1;
 RecordingSearchPage page;const auto now=RecordingSearchSnapshots::Clock::now();
 {RecordingSearchSnapshots pool;Check(Pool().entries==0,"empty pool");
  Check(pool.Begin(model,q,"canary-principal","canary-scope",&page,&error,now),"one snapshot");Check(Pool().entries==1&&Pool().uniqueModels==1,"one unique model");
  for(int i=0;i<7;++i)Check(pool.Begin(model,q,"canary-principal","canary-scope",&page,&error,now),"eight snapshots input");
  auto p=Pool();Check(p.entries==8&&p.references==8&&p.uniqueModels==1&&p.uniqueBytes==model->accounted_bytes(),"eight references deduplicated");
  Check(RecordingSearchModel::Build({Doc("canary-new")},"canary-source",2,&other,&error,{100000,64*1024*1024,owner}),"new model");d::Current(model->diagnostic_identity(),other->diagnostic_identity());
  Check(pool.Begin(other,q,"canary-principal","canary-scope",&page,&error,now),"replacement pool entry");Check(Pool().entries==8&&Pool().uniqueModels==2,"count eviction distinct models");
  model.reset();Check(Models()==2,"snapshot retains old current");
  std::shared_ptr<const RecordingSearchModel> unused;std::size_t pos=0;
  Check(!pool.ResolveHit(page.snapshot_id,"canary-new",q,"canary-principal","canary-scope",&unused,&pos,&error,now+std::chrono::minutes(6)),"expire real pool path");
  Check(Pool().entries==0&&Models()==1,"expired old model destroyed but page live");
  d::Current(other->diagnostic_identity(),0);other.reset();Check(Models()==1,"page holds expired model");
  page={};Check(Models()==0&&owner->used()==0,"last page and model release");
 }
 Check(Pool().key==0,"pool destruction unregisters");
 {std::shared_ptr<const RecordingSearchModel> unpublished;Check(RecordingSearchModel::Build({Doc("canary-unpublished")},"canary-source",3,&unpublished,&error,{100000,64*1024*1024,owner}),"unpublished build");}
 Check(Models()==0&&owner->used()==0,"unpublished retry release");
 Check(d::Emit(*owner,"focused",Sink),"bounded output valid");
 for(const auto* secret:{"canary-channel","canary-document","canary-principal","canary-scope","canary-source"})Check(captured.find(secret)==std::string::npos,"no payload in diagnostic");
 std::cout<<captured<<"[result] memory-attribution checks="<<checks<<" fail=0\n";return 0;
 }catch(const std::exception& e){std::cerr<<"[fail] "<<e.what()<<'\n';return 1;}}
