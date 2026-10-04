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
            if(mode==6||mode==7){*docs={Row(mode==6?"unsupported":"corrupt"),Row("healthy")};
                docs->front().segment_id="bad-file";docs->back().segment_id="good-file";}
            return true;
        };
        const auto encode=[&](auto* row,const auto& cancelled,std::string* error){
            ++encodes;const int n=++active;maximum.store(std::max(maximum.load(),n));
            struct Guard{std::atomic<int>& n;~Guard(){--n;}}guard{active};
            if(mode==4){while(!cancelled())std::this_thread::sleep_for(2ms);return false;}
            if(mode==2){*error="secret";return false;}
            if((mode==6||mode==7)&&row->segment_id=="bad-file"){
                *error=mode==6?"visual-frame-unsupported":"visual-frame-file-changed";return false;}
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
        Check(Wait([&]{return worker.Status().state=="ready"&&!worker.Status().error.empty();}),"encode failure visible");
        Check(worker.Snapshot()==preserved&&worker.Status().error=="visual-index-build-failed","no partial publication or private error");
        mode=3;const int before_failure=sources;worker.RequestRebuild();
        Check(Wait([&]{return sources>before_failure&&worker.Status().state=="ready"&&!worker.Status().error.empty();}),"source failure visible");
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
        mode=6;Check(worker.Start(),"mixed supported/unsupported restart");
        Check(Wait([&]{return worker.Status().generation==5;}),"unsupported file does not block healthy publication");
        Check(worker.Snapshot()->documents().size()==1&&worker.Snapshot()->documents().front().id=="healthy"&&
            worker.Status().unsupported_segments.at("camera")==1,"healthy result and channel exclusion coverage");
        mode=7;worker.RequestRebuild();
        Check(Wait([&]{return worker.Status().state=="ready"&&!worker.Status().error.empty();}),"integrity failure still fails entire build");
        Check(worker.Status().generation==5&&worker.Snapshot()->documents().front().id=="healthy","integrity failure never publishes partial");
        worker.Stop();
        {
            const auto empty=std::filesystem::path(argv[1])/"initial-failure";std::filesystem::create_directory(empty);::chmod(empty.c_str(),0700);
            VisualIndexWorker initial(VisualIndexStore(empty),[](auto*,const auto&,std::string* error){*error="injected-source-failure";return false;},encode,1h);
            Check(initial.Start(),"initial failure worker starts");
            Check(Wait([&]{return initial.Status().state=="unavailable"&&!initial.Status().error.empty();}),"initial failure without complete index remains unavailable");
            Check(!initial.Snapshot(),"initial failure never publishes an empty replacement");initial.Stop();
        }
        {
            const auto path=std::filesystem::path(argv[1])/"build-scope";std::filesystem::create_directory(path);::chmod(path.c_str(),0700);
            std::atomic<int> owned{0},factories{0},behavior{0},entered{0};
            struct Lease {std::atomic<int>& count;explicit Lease(std::atomic<int>& c):count(c){++count;}~Lease(){--count;}};
            VisualIndexWorker scoped(VisualIndexStore(path),[&](auto* docs,const auto&,auto*){*docs={Row(std::to_string(behavior.load()))};return true;},
                VisualIndexWorker::EncodeFactory([&]{++factories;auto lease=std::make_shared<Lease>(owned);
                    return [&,lease](auto* doc,const auto& cancelled,std::string* error){
                        ++entered;if(behavior==2)throw std::runtime_error("owned exception");
                        if(behavior==3){while(!cancelled())std::this_thread::sleep_for(2ms);return false;}
                        if(behavior==1){*error="owned encode failure";return false;}
                        doc->embedding.assign(768,0);doc->embedding[0]=1;return true;
                    };}),1h);
            Check(scoped.Start(),"build-scope worker starts");
            Check(Wait([&]{return scoped.Status().generation==1&&owned==0;}),"successful rebuild releases callback resource");
            for(int failure:{1,2}){const auto before=factories.load();behavior=failure;scoped.RequestRebuild();
                Check(Wait([&]{return factories>before&&owned==0&&!scoped.Status().error.empty();}),"failure and exception both release callback resource");}
            behavior=3;scoped.RequestRebuild();Check(Wait([&]{return owned==1&&entered==4;}),"cancellable build holds one local resource");
            scoped.Stop();Check(owned==0,"cancel and join release local callback resource");
        }
        Check(maximum==1,"no encoder overlap");
        std::cout<<"PASS visual worker checks="<<checks<<" encodes="<<encodes<<" source_scans="<<sources<<"\n";return 0;
    }catch(const std::exception& e){std::cerr<<"FAIL "<<e.what()<<" checks="<<checks<<"\n";return 1;}
}
