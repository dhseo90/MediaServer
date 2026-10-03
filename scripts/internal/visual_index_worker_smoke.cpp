// 파일 용도: worker의 단일 실행·세대 수명·실패 보존·취소/재시작을 직접 관측한다.
#include "recording/visual_index_worker.h"
#include <atomic>
#include <iostream>
#include <stdexcept>
#include <sys/stat.h>
using namespace recording;
using namespace std::chrono_literals;
namespace {
int checks=0;
void Check(bool b,const char* what){++checks;if(!b)throw std::runtime_error(what);}
template<class F> bool Wait(F predicate){const auto end=std::chrono::steady_clock::now()+2s;while(std::chrono::steady_clock::now()<end){if(predicate())return true;std::this_thread::sleep_for(2ms);}return false;}
VisualSearchDocument Row(std::string id){return {std::move(id),"camera","segment","",std::string(64,'a'),std::string(64,'b'),0,1,1000,{}, {}};}
}
int main(int argc,char**argv){
    try{
        if(argc!=2)return 2;std::filesystem::create_directory(argv[1]);::chmod(argv[1],0700);
        std::atomic<int> mode{0},encodes{0},sources{0},active{0},maximum{0};
        const auto source=[&](auto* docs,const auto& cancelled,std::string* error){
            ++sources;if(cancelled())return false;
            if(mode==3){*error="private/input/path";return false;}
            *docs={Row("a")};if(mode!=0)docs->push_back(Row("b"));
            if(mode==2||mode==4)docs->push_back(Row("c"));
            if(mode==5)docs->clear();
            return true;
        };
        const auto encode=[&](auto* row,const auto& cancelled,std::string* error){
            ++encodes;const int n=++active;maximum.store(std::max(maximum.load(),n));
            struct Guard{std::atomic<int>& n;~Guard(){--n;}}guard{active};
            if(mode==4){while(!cancelled())std::this_thread::sleep_for(2ms);return false;}
            if(mode==2){*error="secret";return false;}
            row->embedding.assign(768,0);row->embedding[0]=1;return true;
        };
        VisualIndexWorker worker(VisualIndexStore(argv[1]),source,encode,1h);
        Check(worker.Start()&&!worker.Start(),"single start");
        Check(Wait([&]{return worker.Status().generation==1;}),"initial publication");
        auto oldest=worker.Snapshot();Check(oldest&&oldest->documents().size()==1&&encodes==1,"initial embedding");
        worker.RequestRebuild();Check(Wait([&]{return worker.Status().generation==2;}),"second publication");
        Check(encodes==1,"unchanged reference reused");
        const int before=sources;mode=1;worker.RequestRebuild();std::this_thread::sleep_for(80ms);
        Check(sources==before&&worker.Status().generation==2,"old reader blocks third allocation");
        oldest.reset();Check(Wait([&]{return worker.Status().generation==3;}),"old reader release resumes build");
        Check(encodes==2&&worker.Snapshot()->documents().size()==2,"only added frame encoded");
        auto preserved=worker.Snapshot();mode=2;worker.RequestRebuild();
        Check(Wait([&]{return worker.Status().state=="unavailable";}),"encode failure visible");
        Check(worker.Snapshot()==preserved&&worker.Status().error=="visual-index-build-failed","no partial publication or private error");
        mode=3;const int before_failure=sources;worker.RequestRebuild();
        Check(Wait([&]{return sources>before_failure&&worker.Status().state=="unavailable";}),"source failure visible");
        Check(worker.Snapshot()==preserved,"source failure preserves old");
        mode=4;worker.RequestRebuild();Check(Wait([&]{return active==1;}),"work in flight");
        const int during=sources;for(int i=0;i<100;++i)worker.RequestRebuild();
        std::this_thread::sleep_for(50ms);Check(sources==during&&maximum==1,"bounded pending work and single encoder");
        const auto stop_start=std::chrono::steady_clock::now();worker.Stop();
        Check(std::chrono::steady_clock::now()-stop_start<1s&&active==0&&worker.Status().state=="stopped","cancel and join");
        Check(worker.Snapshot()==preserved,"cancel does not publish partial");preserved.reset();
        mode=5;Check(worker.Start(),"reactivate");
        Check(Wait([&]{return worker.Status().generation==4;}),"reactivated publication");
        Check(worker.Snapshot()->documents().empty(),"deletion reflected");worker.Stop();
        std::shared_ptr<const VisualSearchIndex> disk;std::string error;
        Check(VisualIndexStore(argv[1]).Load(VisualEmbeddingContract::Siglip2(),&disk,&error)&&disk->documents().empty(),"restart cache complete");
        Check(maximum==1,"no encoder overlap");
        std::cout<<"PASS visual worker checks="<<checks<<" encodes="<<encodes<<" source_scans="<<sources<<"\n";return 0;
    }catch(const std::exception& e){std::cerr<<"FAIL "<<e.what()<<" checks="<<checks<<"\n";return 1;}
}
