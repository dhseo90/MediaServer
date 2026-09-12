// 제품 내부 수락·최종화 순서의 실패 상태를 검증한다. 라이브러리/OS 장애 주입이 아니다.
#include "recording/recording_write_boundaries.h"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>
using namespace recording;
int main(int argc,char** argv) {
    if(argc!=2)return 2;
    int pass=0,fail=0;
    const auto check=[&](bool ok,const char* label){std::cout<<(ok?"[pass] ":"[fail] ")<<label<<'\n';ok?++pass:++fail;};
    RecordingSourceBindingV1 b;b.samples={{1,10}};b.last_accepted_ordinal=1;
    check(!detail::AcceptSourceSample(false,b,{2,20})&&b.samples.size()==1&&b.samples[0].pts_ns==10&&
        b.last_accepted_ordinal==1&&b.index_complete&&b.incomplete_reason.empty(),"C323-A 거부 결과 불변");
    check(detail::AcceptSourceSample(true,b,{2,20})&&b.samples.size()==2&&b.samples.back().ordinal==2&&
        b.samples.back().pts_ns==20&&b.last_accepted_ordinal==2,"C323-B 성공 원본 tuple");
    b.samples.clear();for(std::uint64_t i=1;i<=4096;++i)b.samples.push_back({i,i*10});
    b.last_accepted_ordinal=4096;
    const bool declined=!detail::AcceptSourceSample(false,b,{4097,40970})&&b.index_complete&&b.last_accepted_ordinal==4096;
    const bool accepted=detail::AcceptSourceSample(true,b,{4097,40970});
    const bool later=!detail::AcceptSourceSample(false,b,{4098,40980});
    check(declined&&accepted&&later&&b.samples.size()==4096&&b.samples.back().ordinal==4096&&
        b.last_accepted_ordinal==4097&&!b.index_complete&&b.incomplete_reason=="sample-index-cap","C323-C 상한 이후 수락·거부");
    const std::filesystem::path root(argv[1]);
    for(int failing=-1;failing<4;++failing) {
        const auto dir=root/("stage-"+std::to_string(failing));std::filesystem::create_directory(dir);
        {std::ofstream ready(dir/"ready");ready<<"owned-ready";}
        std::string calls;
        const auto step=[&](int stage){
            calls+=static_cast<char>('0'+stage);
            if(stage==failing)return false;
            if(stage==1){std::ofstream media(dir/"final");media<<"owned-media";}
            if(stage==3)std::filesystem::remove(dir/"ready");
            return true;
        };
        const bool ok=detail::FinalizeInOrder([&]{return step(0);},[&]{return step(1);},[&]{return step(2);},[&]{return step(3);});
        const char* labels[]={"C334-A 정상 순서","C334-B validate 실패","C334-C publish 실패","C334-D commit 실패 보존","C334-E clear 실패"};
        const std::string expected=failing<0?"0123":std::string("0123").substr(0,static_cast<std::size_t>(failing+1));
        bool files=std::filesystem::exists(dir/"ready")== (failing>=0);
        if(failing==2){std::ifstream ready(dir/"ready"),media(dir/"final");std::string r,m;ready>>r;media>>m;files=files&&r=="owned-ready"&&m=="owned-media";}
        check(ok==(failing<0)&&calls==expected&&files,labels[failing+1]);
    }
    std::cout<<"[summary] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
}
