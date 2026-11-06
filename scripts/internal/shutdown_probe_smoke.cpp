#include "recording/shutdown_diagnostic.h"  // 파일 용도: 종료 probe의 signal 전 무출력과 signal 후 범위·카운터 정리를 격리 검증한다.
#include <csignal>
#include <chrono>
#include <iostream>
void handler(int n){recording::shutdown_probe::Signal(n);}
int main(){using namespace recording::shutdown_probe;if(!Enabled()||!StopOnly())return 1;std::signal(SIGTERM,handler);auto start=Now();for(unsigned i=0;i<100000;++i){Scope a("structured");Scope b("Capture");}auto elapsed=Now()-start;if(rows.load()!=0||structured.load()!=0)return 2;{Scope active("structured");raise(SIGTERM);if(!signaled.load())return 3;{Scope join("probe-join");}}if(rows.load()!=3||structured.load()!=0)return 4;std::cout<<"{\"iterations\":100000,\"preSignalRows\":0,\"postSignalRows\":"<<rows.load()<<",\"elapsedNs\":"<<elapsed<<"}\n";}
