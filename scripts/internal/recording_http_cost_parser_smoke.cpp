// R155: actual ReadHttpRequest and HeaderValue, socketpair only; no server/model.
#include "recording_http_cost_probe.h"
#include "webrtc_http_server_detail.h"
#include <sys/socket.h>
#include <unistd.h>
#include <stdexcept>
using namespace ingress::webrtc_http_server_detail;
static void Need(bool b){if(!b)throw std::runtime_error("parser focused assertion");}
static unsigned Parse(const std::string& headers){
 int f[2];Need(socketpair(AF_UNIX,SOCK_STREAM,0,f)==0);
 const std::string bytes="GET / HTTP/1.1\r\nHost: localhost\r\nCookie: focused\r\n"+headers+"\r\n";
 Need(SendAll(f[0],bytes));HttpResponse error;auto r=ReadHttpRequest(f[1],&error);close(f[0]);close(f[1]);Need(bool(r));
 Need(HeaderValue(*r,"cookie")=="focused");return r154::Correlation(HeaderValue(*r,"x-r154-id"));
}
int main(int argc,char** argv){
 try {
  Need(argc==2);const std::string mode=argv[1];unsigned id=0;
  if(mode=="upper"||mode=="lower"||mode=="mixed"){
   id=Parse((mode=="upper"?"X-R154-ID":mode=="lower"?"x-r154-id":"X-r154-Id")+std::string(": 10\r\n"));Need(id==10&&!r154::loss);
   r154::Server server(id,r154::Tick());server.handler=r154::Tick();
   {recording::SearchDiagnostic d;d.id=1;d.status=200;r154::Search search(d);Need(search.id==server.record.id);}
   server.prepared=r154::Tick();server.End();
  } else if(mode=="reuse") {
   id=Parse("X-R154-ID: 10\r\n");{r154::Server a(id,r154::Tick());a.handler=r154::Tick();a.prepared=r154::Tick();}
   {r154::Server b(Parse("X-R154-ID: 10\r\n"),r154::Tick());Need(!b.valid&&r154::loss);}
  } else {
   const std::string header=mode=="missing"?"":mode=="empty"?"X-R154-ID:\r\n":mode=="text"?"X-R154-ID: bad\r\n":mode=="zero"?"X-R154-ID: 0\r\n":mode=="range"?"X-R154-ID: 129\r\n":mode=="duplicate"?"X-R154-ID: 10\r\nX-R154-ID: 10\r\n":mode=="variant"?"X-R154-ID: 10\r\nx-r154-id: 10\r\n":mode=="conflict"?"X-R154-ID: 10\r\nX-R154-ID: 11\r\n":"invalid";
   Need(header!="invalid");id=Parse(header);Need(id==0&&r154::loss);r154::Server bad(id,r154::Tick());Need(!bad.valid);
  }
  std::printf("[R155-parser] case=%s PASS\n",mode.c_str());return 0;
 }catch(...){std::fputs("[R155-parser] FAIL\n",stderr);return 1;}
}
