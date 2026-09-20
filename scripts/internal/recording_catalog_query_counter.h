#pragma once
// 자연 비용과 강제 복귀의 안전 검사를 분리한다. 제품에는 연결하지 않는다.
#include "recording_catalog_cost_probe_timer.h"
#include <condition_variable>
#include <mutex>
namespace query_probe {
inline thread_local bool observing=false;
inline thread_local unsigned attempts=0,fallbacks=0;
inline std::mutex barrier_mutex;
inline std::condition_variable barrier_cv;
inline bool armed=false,entered=false,released=false;
inline void Begin(){attempts=0;fallbacks=0;observing=true;}
inline void Arm(){std::lock_guard<std::mutex> lock(barrier_mutex);armed=true;entered=false;released=false;}
inline void Materialize(){std::unique_lock<std::mutex> lock(barrier_mutex);if(!armed)return;armed=false;entered=true;barrier_cv.notify_all();barrier_cv.wait(lock,[]{return released;});}
inline bool Wait(){std::unique_lock<std::mutex> lock(barrier_mutex);return barrier_cv.wait_for(lock,std::chrono::seconds(3),[]{return entered;});}
inline void Release(){std::lock_guard<std::mutex> lock(barrier_mutex);released=true;armed=false;barrier_cv.notify_all();}
inline fc::Metric Suffix(const std::map<std::string,fc::Metric>& rows,const std::string& key,bool offlock=false){fc::Metric out;for(const auto& [name,m]:rows)if((!offlock||name.find("catalog.lock.hold")==std::string::npos)&&(name==key||(name.size()>key.size()&&name.compare(name.size()-key.size(),key.size(),key)==0&&name[name.size()-key.size()-1]=='/'))){out.count+=m.count;out.inclusive+=m.inclusive;out.exclusive+=m.exclusive;out.maximum=std::max(out.maximum,m.maximum);}return out;}
}
