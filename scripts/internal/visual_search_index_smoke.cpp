// 파일 용도: 독립 long-double 전수정렬과 영상 벡터 admission/불변 게시 경계 검증.
#include "recording/visual_search_index.h"
#include <algorithm>
#include <cmath>
#include <iostream>
#include <limits>
#include <random>
#include <stdexcept>
using namespace recording;
namespace {
int checks = 0;
void Check(bool b, const char* name) { ++checks; if (!b) throw std::runtime_error(name); }
std::vector<float> Unit(std::size_t axis = 0, float sign = 1) {
    std::vector<float> v(768, 0); v.at(axis) = sign; return v;
}
VisualSearchDocument Doc(std::string id, std::vector<float> v = Unit()) {
    return {std::move(id), "camera", "segment", "", std::string(64,'a'), std::string(64,'b'),
        42, 1, 90000, 100, std::move(v)};
}
bool Allow(const VisualSearchDocument&) { return true; }
} // namespace
int main() {
    try {
        const auto contract = VisualEmbeddingContract::Siglip2();
        std::shared_ptr<const VisualSearchIndex> index;
        std::string error;
        Check(VisualSearchIndex::Build(contract, {Doc("b"), Doc("a"), Doc("c",Unit(1)),Doc("d",Unit(0,-1))}, &index,&error), "build");
        VisualSearchQuery q{contract,Unit(),{"camera"},{},{},2,0};
        std::vector<VisualSearchHit> hits;
        Check(index->Search(q,Allow,&hits,&error) && hits.size()==2 && index->documents()[hits[0].document_index].id=="a" && index->documents()[hits[1].document_index].id=="b", "stable ties");
        q.threshold=1; q.top_k=200;
        Check(index->Search(q,Allow,&hits,&error) && hits.size()==2 && hits[0].score==1, "inclusive threshold");
        q.threshold=0; q.top_k=2;
        Check(index->Search(q,[](const auto& d){return d.id!="a" && d.id!="b";},&hits,&error) && hits.size()==1 && index->documents()[hits[0].document_index].id=="c", "invalidated leaders do not hide valid candidate");
        q.channels={"other"}; Check(index->Search(q,Allow,&hits,&error) && hits.empty(),"channel filtering");
        q.channels={"camera"};q.start_utc_ns=100;q.end_utc_ns=101;
        Check(index->Search(q,Allow,&hits,&error)&&hits.size()==2,"inclusive UTC start");
        q.start_utc_ns=99;q.end_utc_ns=100;
        Check(index->Search(q,Allow,&hits,&error)&&hits.empty(),"exclusive UTC end");
        q.start_utc_ns.reset();q.end_utc_ns.reset();
        const auto original=index;
        auto RejectDoc=[&](VisualSearchDocument d){Check(!VisualSearchIndex::Build(contract,{std::move(d)},&index,&error)&&index==original,"invalid doc preserves publication");};
        auto d=Doc("x");d.embedding[0]=std::numeric_limits<float>::quiet_NaN();RejectDoc(d);
        d=Doc("x");d.embedding[0]=std::numeric_limits<float>::infinity();RejectDoc(d);
        d=Doc("x");d.embedding=std::vector<float>(768,0);RejectDoc(d);
        d=Doc("x");d.embedding.pop_back();RejectDoc(d);
        d=Doc("x");d.embedding[0]=.5;RejectDoc(d);
        d=Doc("x");d.media_sha256[0]='G';RejectDoc(d);
        d=Doc("x");d.frame_sha256.clear();RejectDoc(d);
        d=Doc("x");d.time_base_num=0;RejectDoc(d);
        d=Doc("x");d.time_base_den=-1;RejectDoc(d);
        d=Doc("x");d.utc_ns=-1;RejectDoc(d);
        d=Doc("x");d.channel_id="\n";RejectDoc(d);
        Check(!VisualSearchIndex::Build(contract,{Doc("x"),Doc("x")},&index,&error)&&index==original,"duplicate ID");
        Check(!VisualSearchIndex::Build(contract,{Doc("x")},&index,&error,{1,1})&&index==original,"byte admission");
        Check(!VisualSearchIndex::Build(contract,{Doc("x"),Doc("y")},&index,&error,{1,100000})&&index==original,"count admission");
        for (int field=0;field<4;++field) {
            auto changed=contract;
            if(field==0)changed.image_id+="new";if(field==1)changed.text_id+="new";
            if(field==2)changed.space_id+="new";if(field==3)changed.dimensions=767;
            Check(!VisualSearchIndex::Build(changed,{Doc("x")},&index,&error)&&index==original,"foreign build contract");
            auto bad=q;bad.contract=changed;hits={{123,0.5}};
            Check(!index->Search(bad,Allow,&hits,&error)&&hits.size()==1&&hits[0].document_index==123,"foreign query contract preserves output");
        }
        auto RejectQuery=[&](VisualSearchQuery bad){hits={{123,.5}};Check(!index->Search(bad,Allow,&hits,&error)&&hits.size()==1&&hits[0].document_index==123,"invalid query preserves output");};
        auto bad=q;bad.top_k=0;RejectQuery(bad);bad=q;bad.top_k=201;RejectQuery(bad);
        bad=q;bad.threshold=std::numeric_limits<double>::quiet_NaN();RejectQuery(bad);
        bad=q;bad.threshold=1.01;RejectQuery(bad);bad=q;bad.threshold=-1.01;RejectQuery(bad);
        bad=q;bad.embedding=Unit();bad.embedding[0]=0;RejectQuery(bad);
        bad=q;bad.embedding.pop_back();RejectQuery(bad);
        bad=q;bad.channels.clear();RejectQuery(bad);bad=q;bad.channels.resize(33,"camera");RejectQuery(bad);
        bad=q;bad.start_utc_ns=10;RejectQuery(bad);bad=q;bad.start_utc_ns=10;bad.end_utc_ns=10;RejectQuery(bad);
        hits={{123,.5}};
        Check(!index->Search(q,[](const auto&)->bool{throw std::runtime_error("private data");},&hits,&error)&&hits[0].document_index==123&&error=="visual-source-unavailable","source failure atomic and sanitized");
        Check(VisualSearchIndex::Build(contract,{},&index,&error)&&index->documents().empty()&&original->documents().size()==4,"empty rebuild and old owner");
        Check(index->Search(q,Allow,&hits,&error)&&hits.empty(),"empty result");

        std::mt19937 generator(430);
        std::normal_distribution<float> distribution(0,1);
        const auto Random=[&](){std::vector<float> v(768);long double squared=0;
            for(auto& x:v){x=distribution(generator);squared+=static_cast<long double>(x)*x;}
            for(auto& x:v)x=static_cast<float>(x/std::sqrt(squared));return v;};
        std::vector<VisualSearchDocument> docs;
        for(int i=0;i<1000;++i){auto row=Doc("row-"+std::to_string(i),Random());
            if(i%3==0)row.channel_id="other"; if(i%5==0)row.utc_ns.reset();else row.utc_ns=i; docs.push_back(std::move(row));}
        Check(VisualSearchIndex::Build(contract,std::move(docs),&index,&error),"random build");
        for(int trial=0;trial<20;++trial){q={contract,Random(),{"camera"},100,900,std::size_t(1+trial*9),trial%2 ? -.02 : .02};
            std::vector<std::pair<long double,std::string>> oracle;
            for(const auto& row:index->documents()) {
                if(row.channel_id!="camera"||!row.utc_ns||*row.utc_ns<100||*row.utc_ns>=900||row.id.back()=='7')continue;
                long double score=0;for(std::size_t j=0;j<768;++j)score+=static_cast<long double>(q.embedding[j])*row.embedding[j];
                if(score>=q.threshold)oracle.emplace_back(score,row.id);
            }
            std::sort(oracle.begin(),oracle.end(),[](const auto& a,const auto& b){return a.first==b.first ? a.second<b.second : a.first>b.first;});
            if(oracle.size()>q.top_k)oracle.resize(q.top_k);
            Check(index->Search(q,[](const auto& row){return row.id.back()!='7';},&hits,&error)&&hits.size()==oracle.size(),"oracle result count");
            for(std::size_t i=0;i<hits.size();++i)Check(index->documents()[hits[i].document_index].id==oracle[i].second&&std::abs(hits[i].score-oracle[i].first)<1e-12L,"independent score and rank");
        }
        std::cout<<"PASS visual index checks="<<checks<<" documents="<<index->documents().size()<<" logical_bytes="<<index->logical_bytes()<<"\n";
        return 0;
    }catch(const std::exception& e){std::cerr<<"FAIL "<<e.what()<<" checks="<<checks<<"\n";return 1;}
}
