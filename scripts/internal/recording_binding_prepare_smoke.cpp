// Actual retained-source corpus: fused preparation preserves the prior call-site oracle.
#include "recording/recording_contracts.h"
#include <fstream>
#include <chrono>
#include <iostream>
#include <vector>
using namespace recording;
namespace {
void Need(bool ok){if(!ok)throw std::runtime_error("binding preparation comparison");}
bool Prior(const std::string& raw,const RecordingSegmentV2& segment,RecordingSourceBindingV1* out,std::string* error){
 RecordingSourceBindingV1 value;if(!ParseRecordingSourceBindingV1(raw,&value,error)||!ValidateRecordingSourceBindingForSegment(value,segment,error))return false;*out=std::move(value);return true;
}
void Compare(const std::string& raw,const RecordingSegmentV2& segment,bool expected){
 RecordingSourceBindingV1 a,b;a.segment_id=b.segment_id="unchanged";std::string ea,eb;
 const bool x=Prior(raw,segment,&a,&ea),y=ParseRecordingSourceBindingForSegment(raw,segment,&b,&eb);
 Need(x==expected&&y==expected&&ea==eb);
 if(x)Need(SerializeRecordingSourceBindingV1(a)==SerializeRecordingSourceBindingV1(b));
 else Need(a.segment_id=="unchanged"&&b.segment_id=="unchanged");
}
}
int main(int argc,char**argv){try{if(argc!=2)return 2;std::ifstream f(argv[1]);std::string raw,segment_raw,error;std::vector<std::pair<std::string,RecordingSegmentV2>> rows;
 while(std::getline(f,raw)&&std::getline(f,segment_raw)){RecordingSegmentV2 s;Need(ParseRecordingSegmentV2(segment_raw,&s,&error));Compare(raw,s,true);rows.emplace_back(raw,std::move(s));}Need(!rows.empty());
 const auto& first=rows.front();RecordingSourceBindingV1 binding;Need(ParseRecordingSourceBindingV1(first.first,&binding,&error));
 auto s=first.second;s.channel_id="another";Compare(first.first,s,false);
 s=first.second;s.time_base_num=0;Compare(first.first,s,false);
 s=first.second;s.checksum_sha256=std::string(64,'0');Compare(first.first,s,false);
 s=first.second;s.media_start_pts=*s.media_end_pts;Compare(first.first,s,false);
 Compare(first.first+" trailing",first.second,false);Compare("{\"schema\":0,\"schema\":1}",first.second,false);
 auto invalid=first.first;auto pos=invalid.find("\"ordinal\":");Need(pos!=std::string::npos);auto end=invalid.find_first_of(",}",pos);invalid.replace(pos,end-pos,"\"ordinal\":0");Compare(invalid,first.second,false);
 invalid=first.first;pos=invalid.find("\"file_evidence\"");Need(pos!=std::string::npos);invalid.replace(pos,15,"\"unknown_field\"");Compare(invalid,first.second,false);
 binding.file_evidence.reset();Compare(SerializeRecordingSourceBindingV1(binding),first.second,true);
 // Before/after alternate order, three fixed passes; no best-run selection.
 using C=std::chrono::steady_clock;
 for(int run=0;run<3;++run){long long old_ns=0,new_ns=0;for(const auto& row:rows){auto measure=[&](bool fused){RecordingSourceBindingV1 out;auto t=C::now();Need(fused?ParseRecordingSourceBindingForSegment(row.first,row.second,&out,&error):Prior(row.first,row.second,&out,&error));return std::chrono::duration_cast<std::chrono::nanoseconds>(C::now()-t).count();};if(run%2){new_ns+=measure(true);old_ns+=measure(false);}else{old_ns+=measure(false);new_ns+=measure(true);}}
 std::cout<<"run="<<run<<" rows="<<rows.size()<<" priorMs="<<old_ns/1e6<<" fusedMs="<<new_ns/1e6<<'\n';}
 std::cout<<"PASS actual corpus, 9 error/legacy boundaries; not HTTP performance\n";return 0;
 }catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 1;}}
