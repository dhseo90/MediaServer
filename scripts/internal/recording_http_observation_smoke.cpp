#include "recording_http_observation.h"
#include <thread>
#include <future>
#include <unistd.h>
#include <iostream>
#include <fcntl.h>
using namespace recording_http_observation;
namespace {
void Need(bool value){if(!value)throw std::runtime_error("observation boundary assertion");}
struct Pair{int f[2];Pair(){Need(!socketpair(AF_UNIX,SOCK_STREAM,0,f));}~Pair(){close(f[0]);close(f[1]);}};
void Send(int fd,const std::string& s){Need(send(fd,s.data(),s.size(),0)==static_cast<ssize_t>(s.size()));}
}
int main(){try{
 const std::string route="/owned-observation";const std::string header="HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\n";
 {Pair p;Send(p.f[1],header+"{}");shutdown(p.f[1],SHUT_WR);HttpObservation o{1,"validation-output-delay",route};
  Need(Drain(p.f[0],Clock::now()+std::chrono::seconds(1),o)==header+"{}");
  std::this_thread::sleep_for(std::chrono::milliseconds(25));HttpObservation::Mark(o.validationEndNs);
  std::this_thread::sleep_for(std::chrono::milliseconds(25));HttpObservation::Mark(o.outputEndNs);
  Need(o.receiveEndNs>=o.headerNs&&o.validationEndNs-o.receiveEndNs>=20000000&&o.outputEndNs-o.validationEndNs>=20000000);}
 {Pair p;Send(p.f[1],header);HttpObservation o{2,"delayed-body",route};
  std::thread sender([&]{std::this_thread::sleep_for(std::chrono::milliseconds(50));Send(p.f[1],"{}");shutdown(p.f[1],SHUT_WR);});
  struct Join{std::thread& t;~Join(){t.join();}} join{sender};
  Need(Drain(p.f[0],Clock::now()+std::chrono::seconds(1),o)==header+"{}");Need(o.receiveEndNs-o.headerNs>=20000000);}
 {Pair p;Send(p.f[1],header+"{");shutdown(p.f[1],SHUT_WR);HttpObservation o{3,"incomplete-body",route};
  const auto wire=Drain(p.f[0],Clock::now()+std::chrono::seconds(1),o);Need(o.receiveEndNs&&o.status==200&&wire.size()==header.size()+1&&!o.validationEndNs);}
 {Pair p;Send(p.f[1],"HTTP/1.1 503 Busy\r\nContent-Length: 0\r\n\r\n");shutdown(p.f[1],SHUT_WR);HttpObservation o{4,"non200",route};
  (void)Drain(p.f[0],Clock::now()+std::chrono::seconds(1),o);Need(o.status==503&&o.receiveEndNs&&!o.validationEndNs);}
 {Pair p;Send(p.f[1],header);HttpObservation o{5,"receive-timeout",route};bool failed=false;
  try{(void)Drain(p.f[0],Clock::now()+std::chrono::milliseconds(30),o);}catch(const std::runtime_error&){failed=true;}
  Need(failed&&o.headerNs&&!o.receiveEndNs&&!o.validationEndNs&&o.error);}
 {Pair p;shutdown(p.f[1],SHUT_WR);HttpObservation o{6,"eof-expired-boundary",route};bool failed=false;
  try{(void)Drain(p.f[0],Clock::now()-std::chrono::nanoseconds(1),o);}catch(const std::runtime_error&){failed=true;}
  Need(failed&&!o.receiveEndNs&&std::string(o.failure)=="total-deadline");}
 {Pair p;Send(p.f[1],header+"{}");shutdown(p.f[1],SHUT_WR);HttpObservation o{7,"eof-within-budget",route};
  (void)Drain(p.f[0],Clock::now()+std::chrono::milliseconds(100),o);Need(o.receiveEndNs&&o.error==0);}
 {Pair p;shutdown(p.f[1],SHUT_WR);HttpObservation o{8,"eof-before-headers",route};
  (void)Drain(p.f[0],Clock::now()+std::chrono::seconds(1),o);Need(o.receiveEndNs&&!o.headerNs&&std::string(o.failure)=="eof-before-headers");}
 {int fd[2];Need(pipe(fd)==0);const int flags=fcntl(fd[1],F_GETFL);Need(flags>=0&&fcntl(fd[1],F_SETFL,flags|O_NONBLOCK)==0);char bytes[4096]{};while(write(fd[1],bytes,sizeof(bytes))>0){}Need(errno==EAGAIN);Need(fcntl(fd[1],F_SETFL,flags)==0);
  HttpObservation o{9,"blocked-output",route};HttpObservation::Mark(o.validationEndNs);
  std::thread drain([&]{std::this_thread::sleep_for(std::chrono::milliseconds(50));char b[4096];while(read(fd[0],b,sizeof(b))>0){}close(fd[0]);});
  const auto n=write(fd[1],"x",1);close(fd[1]);drain.join();Need(n==1);HttpObservation::Mark(o.outputEndNs);Need(o.outputEndNs-o.validationEndNs>=20000000);}
 std::cout<<"PASS observation boundaries 9 (not product performance)\n";return 0;
 }catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 1;}}
