// 파일 용도: 새 snapshot 후보 증거의 정상/오류/경계 계약. 영상 동일성 통합 증명은 별도다.
#include "analysis/event_snapshot_proof.h"
#include <iostream>
#include <stdexcept>
int main(){
    unsigned checks=0;auto check=[&](bool ok,const char* name){++checks;if(!ok)throw std::runtime_error(name);};
    try{
        analysis::RawVideoFrame f;f.width=1;f.height=2;f.format=analysis::PixelFormat::RGB;f.pts=123456789;
        f.track_id="video";f.data={1,2,3,4,5,6};
        f.source_association={analysis::SourceAssociationQuality::TimestampMatch,analysis::OriginalSampleIdentity{"gen\\\"x",1,2,"video",123456789}};
        const std::vector<unsigned char> image{7,8,9};
#if MEDIA_SERVER_USE_OPENSSL
        const auto expected="7192385c3c0605de55bb9476ce1d90748190ecb32a8eed7f5207b30cf6a1fe89";
        check(analysis::SnapshotRgbSha256(f)==expected,"independent fixed RGB SHA");
        const auto p=analysis::BuildEventSnapshotProof(f,image,f.source_association,"event-epoch");check(bool(p),"valid candidate");
        check(p->rgb_sha256==expected&&p->image_sha256!=p->rgb_sha256,"separate image/raw hashes");
        auto other=f.source_association;other.original->source_generation="reconnected";
        check(!analysis::BuildEventSnapshotProof(f,image,other,"event-epoch"),"reconnect generation rejected");
        other=f.source_association;++other.original->generation_order;
        check(!analysis::BuildEventSnapshotProof(f,image,other,"event-epoch"),"generation order mismatch rejected");
        check(!analysis::BuildEventSnapshotProof(f,image,{},"event-epoch"),"unknown event association rejected");
        check(!analysis::BuildEventSnapshotProof(f,image,f.source_association,""),"unknown event epoch rejected");
        check(p->event_epoch=="event-epoch","event epoch bound");
        const auto json=analysis::SerializeEventSnapshotProof(*p);analysis::EventSnapshotProof parsed;
        check(analysis::ParseEventSnapshotProof(json,&parsed),"strict roundtrip");
        check(analysis::SerializeEventSnapshotProof(parsed)==json,"all fields stable");
        auto padded=f;padded.data={1,2,3,99,4,5,6,88};check(analysis::SnapshotRgbSha256(padded)==expected,"row padding excluded");
        padded.data.push_back(9);check(analysis::SnapshotRgbSha256(padded).empty(),"invalid span");
        for(auto q:{analysis::SourceAssociationQuality::Nearest,analysis::SourceAssociationQuality::Ambiguous,analysis::SourceAssociationQuality::Unavailable}){
            auto bad=f;bad.source_association.quality=q;check(!analysis::BuildEventSnapshotProof(bad,image,f.source_association,"event-epoch"),"non exact association excluded");}
        auto bad=f;bad.source_association.original.reset();check(!analysis::BuildEventSnapshotProof(bad,image,f.source_association,"event-epoch"),"missing original");
        bad=f;bad.pts=-1;check(!analysis::BuildEventSnapshotProof(bad,image,f.source_association,"event-epoch"),"negative PTS");
        bad=f;++bad.pts;check(!analysis::BuildEventSnapshotProof(bad,image,f.source_association,"event-epoch"),"PTS mismatch");
        bad=f;bad.track_id="other";check(!analysis::BuildEventSnapshotProof(bad,image,f.source_association,"event-epoch"),"track mismatch");
        bad=f;bad.source_association.original->ordinal=0;check(!analysis::BuildEventSnapshotProof(bad,image,f.source_association,"event-epoch"),"zero ordinal");
        bad=f;bad.width=4097;check(!analysis::BuildEventSnapshotProof(bad,image,f.source_association,"event-epoch"),"width cap");
        bad=f;bad.format=analysis::PixelFormat::BGR;check(!analysis::BuildEventSnapshotProof(bad,image,f.source_association,"event-epoch"),"unsupported RGB contract");
        check(!analysis::BuildEventSnapshotProof(f,{},f.source_association,"event-epoch"),"empty image");
        for(const std::string& input:std::vector<std::string>{"{}",json.substr(0,json.size()-1)+",\"width\":\"1\"}",json+"x",std::string(8193,'x')}){
            parsed=*p;check(!analysis::ParseEventSnapshotProof(input,&parsed),"malformed proof rejected");
            check(analysis::SerializeEventSnapshotProof(parsed)==json,"failed parse preserves output");}
        for(const std::string value:{"-1","0","01","18446744073709551616","1.5"}){
            auto input=json;const auto at=input.find("\"ordinal\":\"2\"");input.replace(at,13,"\"ordinal\":\""+value+"\"");
            check(!analysis::ParseEventSnapshotProof(input,&parsed),"ordinal strict boundary");}
#else
        check(analysis::SnapshotRgbSha256(f).empty(),"crypto unavailable");
        check(!analysis::BuildEventSnapshotProof(f,image,f.source_association,"event-epoch"),"no proof without digest");
#endif
        std::cout<<"PASS snapshot candidate proof checks="<<checks<<"\n";return 0;
    }catch(const std::exception& e){std::cerr<<"FAIL "<<e.what()<<" after checks="<<checks<<"\n";return 1;}
}
