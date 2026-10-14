// 파일 용도: 보존 MP4의 정확한 sample 추출과 독립 요청/FD 수명을 검사한다. 입력을 수정하지 않는다.
#include "recording/visual_frame_decoder.h"
#include "recording/evidence_frame_extractor.h"
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>
#include <future>
#include <iostream>
#include <stdexcept>
namespace {
void Check(bool ok,const char* label){if(!ok)throw std::runtime_error(label);std::cout<<"PASS "<<label<<'\n';}
struct Input {int fd{-1};struct stat st{};explicit Input(const char* p){fd=::open(p,O_RDONLY|O_NOFOLLOW);if(fd<0||::fstat(fd,&st)||::lseek(fd,37,SEEK_SET)!=37)throw std::runtime_error("input");}~Input(){if(fd>=0)::close(fd);}};
}
int main(int argc,char** argv){try{
 if(argc!=2)return 2;
 Input input(argv[1]);Check(input.st.st_size==14990,"preserved byte size");
 std::vector<unsigned char> bytes(input.st.st_size);Check(::pread(input.fd,bytes.data(),bytes.size(),0)==input.st.st_size,"read original");
 Check(recording::EvidenceSha256(bytes.data(),bytes.size())=="268368de002ea717e51c017f374d9285dc4f6941c18047e524d0f6d7b3ed0379","preserved SHA256");
 auto run=[&](int fd,std::int64_t target,recording::VisualRgbFrame* frame,std::string* error,const std::function<bool()>& cancel={},unsigned budget=5000){return recording::DecodeVisualFrame(fd,input.st.st_size,target,frame,error,cancel,budget,recording::VisualDecodePolicy::SoftwareOnly);};
 recording::VisualRgbFrame frame;std::string error;
 for(auto target:{0LL,966666667LL,1966666667LL}){
  Check(run(input.fd,target,&frame,&error),"first middle last exact decode");
  Check(std::llabs(frame.presentation_ns-target)<=1&&frame.width==160&&frame.height==90&&frame.rgb.size()==43200,"sample and geometry");
  std::cout<<"target="<<target<<" actual="<<frame.presentation_ns<<" rgb="<<recording::EvidenceSha256(frame.rgb.data(),frame.rgb.size())<<'\n';
 }
 const auto expected=frame.rgb;
 Check(!run(input.fd,1950000000LL,&frame,&error)&&frame.rgb==expected,"absent sample refuses without replacing output");
 Check(!run(input.fd,1966666667LL,&frame,&error,[]{return true;})&&error=="visual-cancelled"&&frame.rgb==expected,"cancel preserves output");
 Check(!run(input.fd,1966666667LL,&frame,&error,{},0)&&frame.rgb==expected,"zero budget refuses");
 auto concurrent=[&]{Input independent(argv[1]);recording::VisualRgbFrame out;std::string why;const bool ok=run(independent.fd,1966666667LL,&out,&why);return ok&&out.rgb==expected&&out.presentation_ns==1966666666LL&&::lseek(independent.fd,0,SEEK_CUR)==37;};
 auto a=std::async(std::launch::async,concurrent);auto b=std::async(std::launch::async,concurrent);
 const bool first=a.get(),second=b.get();Check(first&&second,"two independent concurrent exact extractions");
 struct stat after{};Check(!::fstat(input.fd,&after)&&after.st_dev==input.st.st_dev&&after.st_ino==input.st.st_ino&&after.st_size==input.st.st_size&&::lseek(input.fd,0,SEEK_CUR)==37,"input FD identity size offset retained");
 Check(::pread(input.fd,bytes.data(),bytes.size(),0)==input.st.st_size&&recording::EvidenceSha256(bytes.data(),bytes.size())=="268368de002ea717e51c017f374d9285dc4f6941c18047e524d0f6d7b3ed0379","original hash unchanged");
 return 0;
 }catch(const std::exception& e){std::cerr<<"FAIL "<<e.what()<<'\n';return 1;}}
