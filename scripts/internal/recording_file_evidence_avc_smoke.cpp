// 실제 AVC 입력을 기존 writer/typed 저장/최종 파일 검증에 연결한다.
#define main recording_file_evidence_unused_main
#include "recording_file_evidence_smoke.cpp"
#undef main
int main(int argc,char** argv){
 if(argc!=2)return 2;gst_init(nullptr,nullptr);
 try{
  auto input=Encode(90,false,false,160,90,30,30,"avc");
  GstCaps* caps=gst_caps_from_string(input.descriptor.tracks.front().caps_string.c_str());
  if(!caps)throw std::runtime_error("F01 actual AVC caps prerequisite");
  const auto* s=gst_caps_get_structure(caps,0);const auto* format=gst_structure_get_string(s,"stream-format");const auto* codec=gst_structure_get_value(s,"codec_data");
  const bool avc=format&&std::string(format)=="avc"&&codec&&GST_VALUE_HOLDS_BUFFER(codec);gst_caps_unref(caps);
  Check(avc,"F01 actual encoded AVC caps and codec_data");
  const auto outputs=Record(std::filesystem::path(argv[1])/"avc",input);
  Check(outputs.size()==1,"F01 AVC existing recording finalizes one segment");
  Check(outputs.front().binding.file_evidence.has_value(),"F01 AVC actual writer issues file evidence");
  Check(Verify(outputs.front()),"F01 AVC final native file and hash verified");
  const auto& binding=outputs.front().binding;bool identity=binding.samples.size()==input.packets.size()&&binding.file_evidence->samples.size()==input.packets.size();
  for(std::size_t i=0;identity&&i<input.packets.size();++i){const auto& p=*input.packets[i].observation;const auto& sample=binding.file_evidence->samples[i];identity=binding.samples[i].ordinal==p.ordinal&&binding.samples[i].pts_ns==*p.pts_ns&&sample.ordinal==p.ordinal&&sample.original_pts_ns==static_cast<std::int64_t>(*p.pts_ns)&&sample.original_dts_ns==static_cast<std::int64_t>(*p.dts_ns)&&sample.original_duration_ns==static_cast<std::int64_t>(*p.duration_ns);}
  Check(identity,"F01 AVC original ordinal PTS DTS duration unchanged");
  std::cout<<"[summary] checks_pass="<<passes<<" checks_fail=0 scope=actual-avc-file-evidence\n";return 0;
 }catch(const std::exception& e){std::cerr<<"[fail] "<<e.what()<<'\n';return 1;}
}
