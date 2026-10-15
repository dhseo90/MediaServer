// 파일 용도: 실제 binding corpus의 strict 파싱/소유와 잘못된 tuple 거부를 비교한다.
#include "recording/recording_contracts.h"
#include "domain/strict_json.h"
#include <chrono>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <vector>
using namespace recording;
static void Need(bool v,const char* s){if(!v)throw std::runtime_error(s);}
int main(int argc,char** argv)try{
    Need(argc==2,"corpus argument");std::ifstream input(argv[1]);Need(bool(input),"corpus open");
    std::vector<std::string> rows;std::string row;while(std::getline(input,row))rows.push_back(row);Need(!rows.empty(),"nonempty corpus");
    for(int pass=0;pass<3;++pass){
        std::uint64_t hash=1469598103934665603ULL,capacity=0,samples=0;std::int64_t parse_ns=0;
        for(const auto& text:rows){RecordingSourceBindingV1 b;std::string error;
            const auto begin=std::chrono::steady_clock::now();Need(ParseRecordingSourceBindingV1(text,&b,&error),"valid binding");
            parse_ns+=std::chrono::duration_cast<std::chrono::nanoseconds>(std::chrono::steady_clock::now()-begin).count();
            const auto canonical=SerializeRecordingSourceBindingV1(b);Need(canonical==text,"exact canonical independent input");
            for(unsigned char c:canonical){hash^=c;hash*=1099511628211ULL;}
            samples+=b.samples.size();capacity+=b.samples.capacity()*sizeof(RecordingSourceSampleV1);
            if(b.file_evidence)capacity+=b.file_evidence->samples.capacity()*sizeof(RecordingFileSampleEvidenceV1);
        }
        std::cout<<"{\"pass\":"<<pass<<",\"rows\":"<<rows.size()<<",\"samples\":"<<samples<<",\"parseNs\":"<<parse_ns<<",\"typedCapacityBytes\":"<<capacity<<",\"canonicalFnv64\":"<<hash<<"}\n";
    }
    // Every serialized field participates; equality is compared to independent
    // canonical output, including each mapping component and vector ordering.
    RecordingSegmentV2 base;base.mappings.resize(2);base.mappings[1].mapping_id="second";
    Need(SameRecordingSegmentV2Content(base,base),"identity equality");
    const auto changed=[&](const auto& mutate){auto b=base;mutate(b);Need(SerializeRecordingSegmentV2(base)!=SerializeRecordingSegmentV2(b),"oracle different bytes");Need(!SameRecordingSegmentV2Content(base,b),"all-field difference");};
    changed([](auto& b){b.schema+="x";});
    changed([](auto& b){b.segment_id+="x";});
    changed([](auto& b){b.source_id+="x";});
    changed([](auto& b){b.channel_id+="x";});
    changed([](auto& b){b.store_id+="x";});
    changed([](auto& b){b.order_request_id+="x";});
    changed([](auto& b){b.media_epoch_id+="x";});
    changed([](auto& b){b.container+="x";});
    changed([](auto& b){b.audio_omitted_reason+="x";});
    changed([](auto& b){b.checksum_sha256+="x";});
    changed([](auto& b){++b.order_sequence;});
    changed([](auto& b){++b.media_start_pts;});
    changed([](auto& b){++b.time_base_num;});
    changed([](auto& b){++b.time_base_den;});
    changed([](auto& b){++b.size_bytes;});
    changed([](auto& b){++b.created_at_ms;});
    changed([](auto& b){++b.finalized_at_ms;});
    changed([](auto& b){b.media_end_pts=5;});
    changed([](auto& b){b.video_codecs.push_back("h264");});
    changed([](auto& b){b.audio_codecs.push_back("aac");});
    changed([](auto& b){b.retention_class=RecordingRetentionClass::Event;});
    changed([](auto& b){b.lifecycle=RecordingLifecycle::Corrupt;});
    changed([](auto& b){b.pinned=true;});
    changed([](auto& b){b.mappings.pop_back();});
    changed([](auto& b){std::swap(b.mappings[0],b.mappings[1]);});
    changed([](auto& b){b.mappings[0].schema+="x";});
    changed([](auto& b){b.mappings[0].mapping_id+="x";});
    changed([](auto& b){b.mappings[0].provenance+="x";});
    changed([](auto& b){b.mappings[0].reason+="x";});
    changed([](auto& b){b.mappings[0].start_pts=7;});
    changed([](auto& b){b.mappings[0].end_pts=7;});
    changed([](auto& b){b.mappings[0].utc_start_ns=7;});
    changed([](auto& b){b.mappings[0].utc_end_ns=7;});
    changed([](auto& b){b.mappings[0].uncertainty_ns=7;});
    RecordingSourceBindingV1 owned;
    {auto temporary=rows.front();std::string error;Need(ParseRecordingSourceBindingV1(temporary,&owned,&error),"owned parse");temporary.assign(temporary.size(),'x');}
    Need(SerializeRecordingSourceBindingV1(owned)==rows.front(),"successful output survives source mutation and destruction");
    const auto first=rows.front();RecordingSourceBindingV1 valid;std::string error;Need(ParseRecordingSourceBindingV1(first,&valid,&error),"first");
    Need(valid.file_evidence.has_value(),"file evidence corpus");
    std::vector<std::string> bad={first.substr(0,first.size()-1),first.substr(0,first.size()-1)+",\"samples\":[]}"};
    const auto samples=first.find("\"file_evidence\"");const auto tuple=first.find("\"samples\":[[",samples)+11;
    Need(samples!=std::string::npos&&tuple>10,"native tuple");
    for(const auto& value:{"null","{}","[]","[1]","[01]","[1e999]","[\"\\uD800\"]","[\"\\x\"]"}){
        auto changed=first;const auto end=changed.find(']',tuple);Need(end!=std::string::npos,"tuple end");changed.replace(tuple,end-tuple+1,value);bad.push_back(std::move(changed));
    }
    for(const auto& text:bad){auto output=valid;Need(!ParseRecordingSourceBindingV1(text,&output,&error),"malformed tuple rejected");Need(SerializeRecordingSourceBindingV1(output)==first,"failed output unchanged");}
    // Captured and discarded strings share escape validation, including surrogate pairs.
    for(const auto& text:{"{\"a\":[\"\\uD800\"]}","{\"a\":{\"x\":1,\"x\":2}}","{\"a\":[\"\\x\"]}","{\"a\":[[01]]}"}){
        ingress::StrictJsonObjectDocument d;Need(!ingress::ParseStrictJsonObjectDocumentArrayViews(text,&d,&error),"nested strict rejection");
    }
    ingress::StrictJsonObjectDocument d;Need(ingress::ParseStrictJsonObjectDocumentArrayViews("{\"a\":[\"\\uD83D\\uDE00\"],\"b\":\"\\uD83D\\uDE00\"}",&d,&error),"surrogate pair");Need(d.Find("b")&&d.Find("b")->string_value.size()==4,"captured decoded bytes");
    std::cout<<"PASS strict corpus, malformed tuple and output lifetime\n";return 0;
}catch(const std::exception& e){std::cerr<<"FAIL "<<e.what()<<'\n';return 1;}
