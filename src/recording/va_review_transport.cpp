// 파일 용도: provider 자격/본문을 argv나 임시 파일에 넣지 않는 bounded curl 전송.
#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include "recording/va_review_provider.h"
#include <algorithm>
#include <cerrno>
#include <charconv>
#include <csignal>
#include <fcntl.h>
#include <poll.h>
#include <spawn.h>
#include <sys/socket.h>
#include <sys/wait.h>
#include <unistd.h>

namespace recording {
namespace {
using Clock=VaReviewService::Clock;
bool Fail(std::string* error,const char* text){if(error)*error=text;return false;}
bool LocalUrl(const std::string& url) {
    constexpr char prefix[]="http://127.0.0.1:";
    if(url.rfind(prefix,0)!=0)return false;
    const auto slash=url.find('/',sizeof(prefix)-1);if(slash==std::string::npos)return false;
    const auto port=url.substr(sizeof(prefix)-1,slash-sizeof(prefix)+1);unsigned n=0;
    const auto r=std::from_chars(port.data(),port.data()+port.size(),n);
    return r.ec==std::errc{}&&r.ptr==port.data()+port.size()&&n>0&&n<=65535&&
        (url.substr(slash)=="/api/tags"||url.substr(slash)=="/api/chat");
}
bool GoogleUrl(const std::string& url) {
    const std::string prefix="https://generativelanguage.googleapis.com/v1beta/models/",suffix=":generateContent";
    if(url.rfind(prefix,0)!=0||url.size()<=prefix.size()+suffix.size()||url.substr(url.size()-suffix.size())!=suffix)return false;
    const auto model=url.substr(prefix.size(),url.size()-prefix.size()-suffix.size());
    return model.size()<=128&&std::all_of(model.begin(),model.end(),[](unsigned char c){
        return (c>='a'&&c<='z')||(c>='A'&&c<='Z')||(c>='0'&&c<='9')||c=='_'||c=='-'||c=='.';});
}
std::string ConfigQuote(const std::string& value) {
    std::string out="\"";
    for(const char c:value) {
        if(c=='\\'||c=='"')out+='\\';
        if(c=='\n')out+="\\n";else if(c=='\r')out+="\\r";else if(c=='\t')out+="\\t";else out+=c;
    }
    return out+'"';
}
struct Child {
    int socket{-1};pid_t pid{-1};bool reaped{false},lost{false};int status{0};
    bool Reap() {
        if(reaped||pid<0)return true;
        pid_t r;do{r=::waitpid(pid,&status,WNOHANG);}while(r<0&&errno==EINTR);
        if(r==pid){reaped=true;return true;}
        if(r<0&&errno==ECHILD){reaped=true;lost=true;return true;}
        return false;
    }
    bool Close() {
        if(socket>=0){::close(socket);socket=-1;}
        if(pid<0||Reap())return !lost;
        ::kill(pid,SIGTERM);
        const auto until=Clock::now()+std::chrono::milliseconds(200);
        while(Clock::now()<until){if(Reap())return true;::poll(nullptr,0,5);}
        ::kill(pid,SIGKILL);
        pid_t r;do{r=::waitpid(pid,&status,0);}while(r<0&&errno==EINTR);
        reaped=r==pid;return reaped;
    }
    ~Child(){Close();}
};
}
bool VaReviewCurl(const VaReviewHttpRequest& request,Clock::time_point deadline,
    const std::function<bool()>& cancelled,std::string* output,std::string* error) {
    const bool google=GoogleUrl(request.url);
    if(!output||(!LocalUrl(request.url)&&!google)||request.body.size()>20*1024*1024||
        (google?(request.body.empty()||request.headers.size()!=1):!request.headers.empty()))
        return Fail(error,"review-invalid-input");
    if(google){
        const std::string prefix="x-goog-api-key: ";const auto& h=request.headers.front();
        if(h.rfind(prefix,0)!=0||h.size()<=prefix.size()||h.size()>prefix.size()+256||
            !std::all_of(h.begin()+prefix.size(),h.end(),[](unsigned char c){
                return (c>='a'&&c<='z')||(c>='A'&&c<='Z')||(c>='0'&&c<='9')||c=='_'||c=='-';}))
            return Fail(error,"review-invalid-input");
    }
    for(const auto& h:request.headers)if(h.size()>512||h.find_first_of("\r\n")!=std::string::npos||h.find('\0')!=std::string::npos)
        return Fail(error,"review-invalid-input");
    if(Clock::now()>=deadline)return Fail(error,"review-timeout");
    if(cancelled&&cancelled())return Fail(error,"review-cancelled");
    const auto ms=std::chrono::duration_cast<std::chrono::milliseconds>(deadline-Clock::now()).count();
    std::string config="url = "+ConfigQuote(request.url)+"\n";
    config+="max-time = "+std::to_string(std::min<std::int64_t>(ms,60000)/1000.0)+"\n";
    if(!request.body.empty())config+="request = \"POST\"\nheader = \"Content-Type: application/json\"\ndata-binary = "+ConfigQuote(request.body)+"\n";
    for(const auto& header:request.headers)config+="header = "+ConfigQuote(header)+"\n";
    int pair[2];if(::socketpair(AF_UNIX,SOCK_STREAM,0,pair)!=0)return Fail(error,"review-connect-failed");
    Child child;child.socket=pair[0];
    ::fcntl(pair[0],F_SETFD,FD_CLOEXEC);::fcntl(pair[1],F_SETFD,FD_CLOEXEC);
#ifdef __APPLE__
    int no_sigpipe=1;::setsockopt(pair[0],SOL_SOCKET,SO_NOSIGPIPE,&no_sigpipe,sizeof(no_sigpipe));
#endif
    posix_spawn_file_actions_t actions;posix_spawnattr_t attributes;
    int setup=::posix_spawn_file_actions_init(&actions);
    if(setup){::close(pair[1]);return Fail(error,"review-connect-failed");}
    setup=::posix_spawnattr_init(&attributes);
    if(setup){::posix_spawn_file_actions_destroy(&actions);::close(pair[1]);return Fail(error,"review-connect-failed");}
    setup|=::posix_spawn_file_actions_adddup2(&actions,pair[1],STDIN_FILENO);
    setup|=::posix_spawn_file_actions_adddup2(&actions,pair[1],STDOUT_FILENO);
    setup|=::posix_spawn_file_actions_addopen(&actions,STDERR_FILENO,"/dev/null",O_WRONLY,0);
#ifdef __APPLE__
    setup|=::posix_spawnattr_setflags(&attributes,POSIX_SPAWN_CLOEXEC_DEFAULT);
#elif defined(__GLIBC__)
#if __GLIBC_PREREQ(2,34)
    setup|=::posix_spawn_file_actions_addclosefrom_np(&actions,3);
#else
    setup=ENOTSUP;
#endif
#else
    // 열린 인증/미디어 FD를 child에 넘기는 묵시적 대안은 사용하지 않는다.
    setup=ENOTSUP;
#endif
    const char* args[]={"/usr/bin/curl","-q","--config","-","--silent","--proto","=http,https",
        "--max-redirs","0","--noproxy","*","--proxy","","--connect-timeout","3",
        "--max-filesize","65536","--write-out","\nMSV450_HTTP:%{http_code}",nullptr};
    const char* env[]={"PATH=/usr/bin:/bin","LANG=C",nullptr};
    if(!setup)setup=::posix_spawn(&child.pid,args[0],&actions,&attributes,const_cast<char**>(args),const_cast<char**>(env));
    ::posix_spawn_file_actions_destroy(&actions);::posix_spawnattr_destroy(&attributes);::close(pair[1]);
    if(setup){child.pid=-1;return Fail(error,"review-connect-failed");}
    if(::fcntl(child.socket,F_SETFL,O_NONBLOCK)!=0)return Fail(error,"review-connect-failed");
    std::string response;std::size_t sent=0;bool eof=false,shutdown=false;const char* failure=nullptr;
    while(!eof||!child.Reap()) {
        if(Clock::now()>=deadline){failure="review-timeout";break;}
        if(cancelled&&cancelled()){failure="review-cancelled";break;}
        pollfd p{child.socket,short(POLLIN|(sent<config.size()?POLLOUT:0)),0};
        if(::poll(&p,1,20)<0){if(errno==EINTR)continue;failure="review-connect-failed";break;}
        if(sent<config.size()&&(p.revents&POLLOUT)) {
#ifdef MSG_NOSIGNAL
            const auto wrote=::send(child.socket,config.data()+sent,config.size()-sent,MSG_NOSIGNAL);
#else
            const auto wrote=::send(child.socket,config.data()+sent,config.size()-sent,0);
#endif
            if(wrote>0)sent+=std::size_t(wrote);
            else if(wrote<0&&errno!=EAGAIN&&errno!=EINTR){failure="review-connect-failed";break;}
        }
        if(sent==config.size()&&!shutdown){::shutdown(child.socket,SHUT_WR);shutdown=true;}
        if(p.revents&(POLLIN|POLLHUP)) {
            char bytes[4096];const auto n=::read(child.socket,bytes,sizeof(bytes));
            if(n==0)eof=true;
            else if(n>0) {
                response.append(bytes,std::size_t(n));
                if(response.size()>65536+16){failure="review-response-too-large";break;}
            } else if(errno!=EAGAIN&&errno!=EINTR){failure="review-connect-failed";break;}
        }
        if(p.revents&(POLLERR|POLLNVAL)){failure="review-connect-failed";break;}
    }
    if(!child.Close())return Fail(error,"review-cleanup-failed");
    if(failure)return Fail(error,failure);
    if(!WIFEXITED(child.status)||WEXITSTATUS(child.status)!=0) {
        const int status=WIFEXITED(child.status)?WEXITSTATUS(child.status):-1;
        return Fail(error,status==28?"review-timeout":status==63?"review-response-too-large":"review-connect-failed");
    }
    constexpr char marker[]="\nMSV450_HTTP:";const auto pos=response.rfind(marker);
    if(pos==std::string::npos||response.size()-pos!=sizeof(marker)-1+3||pos>65536)return Fail(error,"review-invalid-output");
    const auto status=response.substr(pos+sizeof(marker)-1);
    if(status!="200")return Fail(error,status=="401"||status=="403"?"review-provider-auth":
        status=="429"?"review-provider-rate-limit":status=="404"?"review-missing-model":"review-provider-unavailable");
    response.resize(pos);*output=std::move(response);if(error)error->clear();return true;
}
} // namespace recording
