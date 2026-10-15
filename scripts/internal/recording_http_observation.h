#pragma once
// Internal direct-HTTP fixture only. EOF is a receive boundary, not proof of a valid body.
#include <chrono>
#include <cstdint>
#include <cstdio>
#include <cerrno>
#include <cstdlib>
#include <sstream>
#include <stdexcept>
#include <string>
#include <sys/socket.h>
namespace recording_http_observation {
using Clock=std::chrono::steady_clock;
inline std::uint64_t HttpNowNs(){return std::chrono::duration_cast<std::chrono::nanoseconds>(Clock::now().time_since_epoch()).count();}
struct HttpObservation {
 unsigned id;const char* scope;const std::string& route;Clock::time_point begin{Clock::now()};
 std::size_t bytes=0;int status=0,error=0;bool headers=false;const char* failure="none";
 std::uint64_t headerNs=0,receiveEndNs=0,validationEndNs=0,bindingEndNs=0,outputEndNs=0;
 std::uint64_t bindingNs=0;std::size_t bindingCalls=0;
 // Scalar marks only; JSON serialization happens after the legacy endNs capture.
 static void Mark(std::uint64_t& field){field=HttpNowNs();}
 void BindingComplete(std::uint64_t started){bindingEndNs=HttpNowNs();bindingNs+=bindingEndNs-started;++bindingCalls;}
 static std::string Stamp(std::uint64_t n){return n?std::to_string(n):"null";}
 ~HttpObservation(){std::ostringstream o;o<<"[R119-http-wire] {\"id\":"<<id<<",\"scope\":\""<<scope<<"\",\"route\":\""<<route<<"\",\"beginNs\":"<<std::chrono::duration_cast<std::chrono::nanoseconds>(begin.time_since_epoch()).count()<<",\"endNs\":"<<HttpNowNs()<<",\"bytes\":"<<bytes<<",\"headers\":"<<(headers?"true":"false")<<",\"status\":"<<status<<",\"errno\":"<<error<<",\"failure\":\""<<failure<<"\",\"headerNs\":"<<Stamp(headerNs)<<",\"receiveEndNs\":"<<Stamp(receiveEndNs)<<",\"validationEndNs\":"<<Stamp(validationEndNs)<<",\"bindingEndNs\":"<<Stamp(bindingEndNs)<<",\"outputEndNs\":"<<Stamp(outputEndNs)<<",\"bindingNs\":"<<bindingNs<<",\"bindingCalls\":"<<bindingCalls<<"}\n";const auto row=o.str();std::fwrite(row.data(),1,row.size(),stderr);}
};
inline std::string Drain(int fd,Clock::time_point deadline,HttpObservation& observation){std::string result;char b[4096];for(;;){
 const auto remaining=std::chrono::duration_cast<std::chrono::microseconds>(deadline-Clock::now()).count();
 if(remaining<=0){observation.failure="total-deadline";throw std::runtime_error("HTTP total deadline");}
 timeval timeout{static_cast<time_t>(remaining/1000000),static_cast<suseconds_t>(remaining%1000000)};
 if(setsockopt(fd,SOL_SOCKET,SO_RCVTIMEO,&timeout,sizeof(timeout))){observation.error=errno;observation.failure="setsockopt";throw std::runtime_error("receive deadline");}
 const auto n=recv(fd,b,sizeof(b),0);const int saved_errno=n<0?errno:0;
 if(n==0){HttpObservation::Mark(observation.receiveEndNs);if(!observation.headers)observation.failure="eof-before-headers";break;}
 if(n<0){observation.error=saved_errno;observation.failure="recv";throw std::runtime_error("client receive failed");}
 observation.bytes+=static_cast<std::size_t>(n);
 if(result.size()+static_cast<std::size_t>(n)>4*1024*1024+8192){observation.failure="result-bound";throw std::runtime_error("HTTP fixture result bound");}
 result.append(b,n);observation.headers=result.find("\r\n\r\n")!=std::string::npos;
 if(observation.headers&&!observation.headerNs)HttpObservation::Mark(observation.headerNs);
 if(result.find("\r\n")!=std::string::npos&&result.rfind("HTTP/1.1 ",0)==0)observation.status=std::atoi(result.c_str()+9);
 }return result;}
}
