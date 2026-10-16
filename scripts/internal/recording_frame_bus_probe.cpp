// 격리된 단일 호출 진단. 원시 bus 설명은 이 전용 실행에서만 제한적으로 출력한다.
#define RECORDING_FRAME_DIAGNOSTIC 1
#include "../../src/recording/visual_frame_decoder.cpp"
#include "recording/evidence_frame_extractor.h"
#include <fcntl.h>
#include <iostream>
namespace {struct PrivateBus {bool seen=false,closing=false;int code=0;char source[160]{},domain[160]{},message[1024]{},debug[2048]{};} private_bus;}
namespace recording {
void RecordVisualFrameBusDiagnostic(GstMessage* msg,bool closing){
 if(private_bus.seen)return;
 private_bus.seen=true;private_bus.closing=closing;
 GError* e=nullptr;gchar* debug=nullptr;gst_message_parse_error(msg,&e,&debug);
 std::snprintf(private_bus.source,sizeof(private_bus.source),"%s",GST_MESSAGE_SRC(msg)?GST_OBJECT_NAME(GST_MESSAGE_SRC(msg)):"");
 if(e){private_bus.code=e->code;std::snprintf(private_bus.domain,sizeof(private_bus.domain),"%s",g_quark_to_string(e->domain));std::snprintf(private_bus.message,sizeof(private_bus.message),"%s",e->message);g_error_free(e);}
 if(debug){std::snprintf(private_bus.debug,sizeof(private_bus.debug),"%s",debug);g_free(debug);}
}
}
namespace {
std::string JsonString(const std::string& value) {
 std::string out="\"";
 constexpr char hex[]="0123456789abcdef";
 for(unsigned char c:value) {
  if(c=='"'||c=='\\'){out+='\\';out+=c;}
  else if(c<32){out+="\\u00";out+=hex[c>>4];out+=hex[c&15];}
  else out+=c;
 }
 return out+'"';
}
}
int main(int argc,char** argv){try {
 if(argc==2&&std::string(argv[1])=="--json-smoke"){std::cout<<JsonString("line\nnext\tquote\"slash\\")<<"\n";return 0;}
 if(argc!=4)return 2;
 const std::string policy=argv[3];if(policy!="automatic"&&policy!="software-only")return 2;
 std::size_t used=0;const auto target=std::stoll(argv[2],&used);
 if(target<0||used!=std::strlen(argv[2]))return 2;
 const int fd=::open(argv[1],O_RDONLY|O_NOFOLLOW|O_CLOEXEC);
 struct CloseFd {int fd;~CloseFd(){if(fd>=0)::close(fd);}} close_fd{fd};
 struct stat before{},after{};
 if(fd<0||::fstat(fd,&before)||!S_ISREG(before.st_mode)||before.st_size<=0||before.st_size>512*1024)return 2;
 std::vector<unsigned char> bytes(before.st_size);if(::pread(fd,bytes.data(),bytes.size(),0)!=before.st_size)return 2;
 const auto hash=recording::EvidenceSha256(bytes.data(),bytes.size());::lseek(fd,37,SEEK_SET);
 recording::VisualRgbFrame frame;std::string error;
 const bool ok=recording::DecodeVisualFrame(fd,before.st_size,target,&frame,&error,{},5000,policy=="automatic"?recording::VisualDecodePolicy::Automatic:recording::VisualDecodePolicy::SoftwareOnly);
 const bool unchanged=!::fstat(fd,&after)&&before.st_dev==after.st_dev&&before.st_ino==after.st_ino&&before.st_size==after.st_size&&::pread(fd,bytes.data(),bytes.size(),0)==before.st_size&&hash==recording::EvidenceSha256(bytes.data(),bytes.size());
 const auto offset=::lseek(fd,0,SEEK_CUR);
 std::cout<<"{\"ok\":"<<ok<<",\"error\":"<<JsonString(error)<<",\"policy\":"<<JsonString(policy)<<",\"targetNs\":"<<target<<",\"actualNs\":"<<frame.presentation_ns<<",\"rgbBytes\":"<<frame.rgb.size()<<",\"sha256\":"<<JsonString(hash)<<",\"unchanged\":"<<unchanged<<",\"offset\":"<<offset<<",\"bus\":{\"seen\":"<<private_bus.seen<<",\"closing\":"<<private_bus.closing<<",\"source\":"<<JsonString(private_bus.source)<<",\"domain\":"<<JsonString(private_bus.domain)<<",\"code\":"<<private_bus.code<<",\"message\":"<<JsonString(private_bus.message)<<",\"debug\":"<<JsonString(private_bus.debug)<<"}}\n";
 return unchanged&&offset==37?(ok?0:1):2;
}catch(const std::exception&){return 2;}
}
