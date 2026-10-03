// 파일 용도: 격리 파생 cache의 roundtrip·손상·중단 원자성·경로 경계 검증.
#include "recording/visual_index_store.h"
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <sys/stat.h>
#include <sys/wait.h>
#include <unistd.h>
#include <csignal>
#include <chrono>
#include <thread>
using namespace recording;
namespace {
int checks=0;
void Check(bool b,const char* what){++checks;if(!b)throw std::runtime_error(what);}
#if MEDIA_SERVER_USE_SIGLIP2
std::string Read(const std::filesystem::path& p){std::ifstream f(p,std::ios::binary);return {std::istreambuf_iterator<char>(f),{}};}
void Write(const std::filesystem::path& p,const std::string& s){std::ofstream f(p,std::ios::binary|std::ios::trunc);f.write(s.data(),s.size());if(!f)throw std::runtime_error("fixture write");}
#endif
}
int main(int argc,char**argv){
    try{
        if(argc!=2)return 2;const std::filesystem::path root=argv[1];
        std::filesystem::create_directory(root/"cache");::chmod((root/"cache").c_str(),0700);
        VisualIndexStore store(root/"cache");const auto contract=VisualEmbeddingContract::Siglip2();
        std::shared_ptr<const VisualSearchIndex> index,loaded;std::string error;
        VisualSearchDocument row{"frame","camera","segment","event",std::string(64,'a'),std::string(64,'b'),-123,1001,30000,123456789,{}};
        row.embedding.resize(768);row.embedding[3]=1;
        Check(VisualSearchIndex::Build(contract,{row},&index,&error),"build fixture");
        loaded=index;
#if !MEDIA_SERVER_USE_SIGLIP2
        Check(!store.Save(*index,&error)&&error=="visual-disabled","disabled save");
        Check(!store.Load(contract,&loaded,&error)&&loaded==index&&error=="visual-disabled","disabled load");
#else
        Check(!store.Load(contract,&loaded,&error)&&error=="visual-cache-missing"&&loaded==index,"missing cache");
        Check(store.Save(*index,&error),"initial save");
        std::filesystem::path cache;
        for(const auto& entry:std::filesystem::directory_iterator(root/"cache")){if(entry.path().filename()==".visual-writer.lock")continue;Check(cache.empty(),"one cache file");cache=entry.path();}
        struct stat st{};Check(::stat(cache.c_str(),&st)==0&&(st.st_mode&0777)==0600,"private cache mode");
        const auto original=Read(cache);
        Check(store.Load(contract,&loaded,&error)&&loaded!=index,"fresh loaded owner");
        const auto& r=loaded->documents().at(0);
        Check(r.id==row.id&&r.channel_id==row.channel_id&&r.segment_id==row.segment_id&&r.event_id==row.event_id&&r.media_sha256==row.media_sha256&&r.frame_sha256==row.frame_sha256&&r.media_pts==row.media_pts&&r.time_base_num==row.time_base_num&&r.time_base_den==row.time_base_den&&r.utc_ns==row.utc_ns&&r.embedding==row.embedding,"exact field roundtrip");
        const auto published=loaded;
        std::shared_ptr<const VisualSearchIndex> empty;
        Check(VisualSearchIndex::Build(contract,{},&empty,&error),"empty replacement build");
        ::setenv("V430_VISUAL_STORE_FAIL_BEFORE_RENAME","1",1);
        Check(!store.Save(*empty,&error)&&error=="visual-cache-write-failed"&&Read(cache)==original,"failure before rename preserves old cache");
        ::unsetenv("V430_VISUAL_STORE_FAIL_BEFORE_RENAME");
        std::size_t files=0;for(const auto& entry:std::filesystem::directory_iterator(root/"cache")){(void)entry;++files;}
        Check(files==2&&!std::filesystem::exists(root/"cache"/".visual-pending.v1"),"failed temporary removed; one durable lock and one cache");
        const pid_t child=::fork();Check(child>=0,"fork interrupted writer");
        if(child==0){::setenv("V430_VISUAL_STORE_STOP_BEFORE_RENAME","1",1);std::string reason;store.Save(*empty,&reason);::_exit(2);}
        struct ChildGuard {pid_t pid;~ChildGuard(){if(pid>0){::kill(pid,SIGKILL);int status;::waitpid(pid,&status,0);}}} child_guard{child};
        int child_status=0;pid_t observed=0;const auto stop_deadline=std::chrono::steady_clock::now()+std::chrono::seconds(2);
        while(observed==0&&std::chrono::steady_clock::now()<stop_deadline){observed=::waitpid(child,&child_status,WUNTRACED|WNOHANG);if(!observed)std::this_thread::sleep_for(std::chrono::milliseconds(5));}
        if(observed==child&&!WIFSTOPPED(child_status))child_guard.pid=-1;
        Check(observed==child&&WIFSTOPPED(child_status),"writer stopped before rename");
        Check(!store.Save(*empty,&error)&&error=="visual-cache-writer-unavailable","concurrent writer cannot replace pending file");
        Check(::kill(child,SIGKILL)==0&&::waitpid(child,&child_status,0)==child&&WIFSIGNALED(child_status),"owned interrupted process reaped");
        child_guard.pid=-1;
        Check(store.Load(contract,&loaded,&error)&&loaded->documents().size()==1&&Read(cache)==original,"interruption preserves previous complete cache");
        Check(std::filesystem::exists(root/"cache"/".visual-pending.v1"),"crash leaves bounded single pending file");
        Check(store.Save(*index,&error)&&Read(cache)==original&&!std::filesystem::exists(root/"cache"/".visual-pending.v1"),"restart reclaims verified pending and republishes");
        const auto pending=root/"cache"/".visual-pending.v1";
        Write(root/"unowned","untouched");std::filesystem::create_symlink(root/"unowned",pending);
        Check(!store.Save(*index,&error)&&Read(root/"unowned")=="untouched"&&std::filesystem::is_symlink(pending),"pending symlink remains untouched");std::filesystem::remove(pending);
        Write(pending,"unknown bytes");::chmod(pending.c_str(),0600);
        Check(!store.Save(*index,&error)&&Read(pending)=="unknown bytes","unknown pending bytes remain untouched");std::filesystem::remove(pending);
        for(int mutation=0;mutation<6;++mutation){auto bytes=original;
            if(mutation==0)bytes[0]^=1;
            if(mutation==1)bytes[bytes.size()-1]^=1;
            if(mutation==2)bytes+="extra";
            if(mutation==3)bytes.resize(bytes.size()-1);
            if(mutation==4)bytes.resize(16);
            if(mutation==5)for(int i=8;i<16;++i)bytes[i]=char(255);
            Write(cache,bytes);loaded=published;
            Check(!store.Load(contract,&loaded,&error)&&loaded==published,"corrupt cache cannot replace publication");
        }
        Write(cache,original);
        Check(!store.Load(contract,&loaded,&error,{1,1})&&loaded==published,"load byte admission");
        auto foreign=contract;foreign.text_id+="new";
        Check(!store.Load(foreign,&loaded,&error)&&loaded==published&&error=="visual-contract-mismatch","foreign contract rejected");
        const auto outside=root/"outside";std::filesystem::rename(cache,outside);std::filesystem::create_symlink(outside,cache);
        Check(!store.Load(contract,&loaded,&error)&&loaded==published,"cache symlink refused");
        std::filesystem::remove(cache);std::filesystem::rename(outside,cache);
        std::filesystem::create_directory_symlink(root/"cache",root/"link");
        Check(!VisualIndexStore(root/"link").Load(contract,&loaded,&error)&&error=="visual-cache-directory","directory symlink refused");
        Check(!VisualIndexStore(root/"link").Save(*index,&error)&&Read(cache)==original,"symlink write refused");
        std::filesystem::create_directory(root/"cache"/"nested");
        Check(!VisualIndexStore(root/"link"/"nested").Load(contract,&loaded,&error)&&error=="visual-cache-directory","parent symlink refused");
        std::filesystem::rename(cache,outside);Check(::mkfifo(cache.c_str(),0600)==0,"fifo fixture");
        Check(!store.Load(contract,&loaded,&error)&&loaded==published,"nonregular input cannot block");
        std::filesystem::remove(cache);std::filesystem::rename(outside,cache);
        Check(store.Save(*empty,&error)&&store.Load(contract,&loaded,&error)&&loaded->documents().empty()&&published->documents().size()==1,"atomic empty replacement and existing readers");
        Check(store.Save(*index,&error)&&store.Load(contract,&loaded,&error)&&loaded->documents().size()==1,"rebuild after replacement");
#endif
        std::cout<<"PASS visual store checks="<<checks<<"\n";return 0;
    }catch(const std::exception& e){std::cerr<<"FAIL "<<e.what()<<" checks="<<checks<<"\n";return 1;}
}
