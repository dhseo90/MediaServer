#pragma once
#include <chrono>
#include <condition_variable>
#include <mutex>
#include <atomic>
namespace snapshot_probe {
inline std::mutex mutex;
inline std::condition_variable changed;
inline bool armed=false,entered=false,released=false;
inline std::atomic<unsigned> parses{0},locked_snapshots{0};
inline bool throw_acquire=false;
inline void Acquire(){if(throw_acquire){throw_acquire=false;throw std::bad_alloc();}}
inline void Arm(){std::lock_guard<std::mutex> lock(mutex);armed=true;entered=false;released=false;}
inline void Parse(){++parses;std::unique_lock<std::mutex> lock(mutex);if(!armed)return;armed=false;entered=true;changed.notify_all();changed.wait(lock,[]{return released;});}
inline bool Entered(){std::unique_lock<std::mutex> lock(mutex);return changed.wait_for(lock,std::chrono::seconds(2),[]{return entered;});}
inline void Release(){std::lock_guard<std::mutex> lock(mutex);released=true;armed=false;changed.notify_all();}
}
