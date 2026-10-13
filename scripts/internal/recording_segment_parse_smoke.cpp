// 파일 용도: 고정 V2 JSON의 strict 수용/정규 bytes를 이전 파서와 대조한다.
#include "recording/recording_contracts.h"
#include "domain/strict_json.h"
#include <iostream>
#include <stdexcept>
#include <utility>
#include <vector>
using namespace recording;
void Check(bool ok,const char* why){if(!ok)throw std::runtime_error(why);}
std::string Replace(std::string s,const std::string& from,const std::string& to){auto p=s.find(from);Check(p!=s.npos,"fixture token");s.replace(p,from.size(),to);return s;}
std::uint64_t Hash(const std::string& s){std::uint64_t h=14695981039346656037ULL;for(unsigned char c:s){h^=c;h*=1099511628211ULL;}return h;}
int main(){try{
    RecordingSegmentV2 v;v.segment_id="segment";v.store_id="store";v.source_id="source";v.channel_id="channel";
    v.order_request_id="order";v.order_sequence=1;v.media_epoch_id="epoch";v.media_end_pts=1;
    v.container="mp4";v.video_codecs={"h264"};v.audio_omitted_reason="source-no-audio";v.size_bytes=1;
    v.checksum_sha256=std::string(64,'a');v.created_at_ms=1;v.finalized_at_ms=2;
    v.mappings={{"media-server.recording-utc-mapping.v1","map",0,1,"server-observation",100,101,1,"observed"}};
    const auto base=SerializeRecordingSegmentV2(v);Check(!base.empty(),"base");
    std::vector<std::pair<std::string,bool>> cases={{base,true},{" \n"+base+"\t",true}};
    const auto field=base.find(",\"mappings\":");
    cases.push_back({"{\"mappings\":"+base.substr(field+12,base.size()-field-13)+","+base.substr(1,field-1)+"}",true});
    for(auto n:{1,2,128,256,257}){
        auto many=v;many.mappings.clear();many.media_end_pts=n;
        for(int i=0;i<n;++i){auto m=v.mappings[0];m.mapping_id="map-"+std::to_string(i);m.start_pts=i;m.end_pts=i+1;m.utc_start_ns=100+i;m.utc_end_ns=101+i;many.mappings.push_back(m);}
        cases.push_back({SerializeRecordingSegmentV2(many),n<=256});
    }
    cases.push_back({Replace(base,"\"observed\"","\"esc\\n\\u0061\\uD83D\\uDE00\""),true});
    for(const auto& change:std::vector<std::pair<std::string,std::string>>{
        {"\"mapping_id\":\"map\"","\"mapping_id\":\"map\",\"mapping_id\":\"map\""},
        {"\"mapping_id\":\"map\"","\"mapping_id\":\"map\",\"mapping\\u005fid\":\"other\""},
        {"\"reason\":\"observed\"","\"reason\":{\"x\":1,\"x\":2}"},
        {"\"reason\":\"observed\"","\"reason\":\"\\uD800\""},
        {"\"end_pts\":1","\"end_pts\":9223372036854775808"},
        {"\"end_pts\":1","\"end_pts\":1.5"},
        {"\"start_pts\":0","\"start_pts\":1"},
        {"\"uncertainty_ns\":1","\"uncertainty_ns\":null"},
        {"\"schema\":\"media-server.recording-utc-mapping.v1\",",""},
        {"\"mappings\":[","\"mappings\":[null,"},
        {"\"mappings\":[","\"mappings\":[[],"},
        {"\"mappings\":[","\"mappings\":[{},"},
        {"\"mappings\":[","\"mappings\":null,\"unused\":["},
        {"\"segment_id\":\"segment\"","\"segment_id\":\"segment\",\"segment_id\":\"segment\""},
        {"\"source_id\":\"source\"","\"unknown\":1,\"source_id\":\"source\""}})cases.push_back({Replace(base,change.first,change.second),false});
    cases.push_back({base+"x",false});
    cases.push_back({base.substr(0,base.size()-1)+",\"mappings\":[]}",false});
    cases.push_back({Replace(base,"\"mappings\":[","\"mappings\":[,") ,false});
    auto unknown=v;unknown.mappings[0].provenance="unknown";unknown.mappings[0].utc_start_ns.reset();unknown.mappings[0].utc_end_ns.reset();unknown.mappings[0].uncertainty_ns.reset();
    cases.push_back({SerializeRecordingSegmentV2(unknown),true});
    for(std::size_t i=0;i<base.size();i+=17)cases.push_back({base.substr(0,i),false});
    unsigned n=0;
    for(const auto& [input,expected]:cases){
        RecordingSegmentV2 out;out.segment_id="unchanged";std::string error;
        const bool ok=ParseRecordingSegmentV2(input,&out,&error);Check(ok==expected,"case acceptance");
        const auto canonical=ok?SerializeRecordingSegmentV2(out):std::string{};
        Check(ok||out.segment_id=="unchanged","failure publication");
#ifndef RECORDING_PARSE_OLD_ORACLE
        RecordingSegmentV2 second;second.segment_id="unchanged";std::string saved="unchanged";
        Check(ParseRecordingSegmentV2Canonical(input,&second,&saved,&error)==ok,"canonical acceptance");
        Check(ok?(saved==canonical&&SerializeRecordingSegmentV2(second)==canonical):(saved=="unchanged"&&second.segment_id=="unchanged"),"canonical publication");
#endif
        std::cout<<n++<<' '<<ok<<' '<<canonical.size()<<' '<<Hash(canonical)<<'\n';
    }
#ifndef RECORDING_PARSE_OLD_ORACLE
    ingress::StrictJsonObjectDocument d;std::string e;unsigned calls=0;
    Check(!ingress::ParseStrictJsonObjectDocumentObjectArray("{\"items\":[{\"x\":1}],\"late\":0,\"late\":1}","items",&d,[&](const auto&){++calls;return true;},&e)&&calls==1,"late parent duplicate");
    Check(!ingress::ParseStrictJsonObjectDocumentObjectArray("{\"items\":[{\"x\":1}]}","items",&d,[](const auto&){return false;},&e),"consumer refusal");
    bool threw=false;try{ingress::ParseStrictJsonObjectDocumentObjectArray("{\"items\":[{}]}","items",&d,[](const auto&)->bool{throw std::runtime_error("consumer");},&e);}catch(const std::runtime_error&){threw=true;}Check(threw,"consumer exception");
#endif
    return 0;
}catch(const std::exception& e){std::cerr<<"[FAIL] "<<e.what()<<'\n';return 1;}}
