#pragma once
// 테스트 전용. 중첩 scope의 inclusive/exclusive ns를 분리하며 제품에는 연결하지 않는다.
#include <chrono>
#include <cstdint>
#include <iostream>
#include <map>
#include <string>
namespace fc {
using Clock=std::chrono::steady_clock;
struct Metric {std::uint64_t count{},inclusive{},exclusive{};};
inline thread_local bool enabled=false;
inline thread_local std::map<std::string,Metric> metrics;
inline thread_local std::string target_payload;
inline thread_local std::uint64_t target_parses=0;
struct Scope;
inline thread_local Scope* current=nullptr;
struct Scope {
 bool active;Scope* parent{};std::string key;Clock::time_point begin;std::uint64_t children{};
 explicit Scope(const char* name):active(enabled){if(active){parent=current;key=parent?parent->key+"/"+name:name;begin=Clock::now();current=this;}}
 ~Scope(){if(active){const auto elapsed=static_cast<std::uint64_t>(std::chrono::duration_cast<std::chrono::nanoseconds>(Clock::now()-begin).count());auto& m=metrics[key];++m.count;m.inclusive+=elapsed;m.exclusive+=elapsed-children;current=parent;if(parent)parent->children+=elapsed;}}
};
template<class F> decltype(auto) Measure(const char* name,F&& f){Scope scope(name);return f();}
inline void Event(const char* name){if(enabled)++metrics[current?current->key+"/"+name:name].count;}
inline void Dump(const std::string& operation){if(current)throw std::runtime_error("active timer on dump");for(const auto& [name,m]:metrics)std::cout<<"[cost] operation="<<operation<<" scope="<<name<<" count="<<m.count<<" inclusive_ns="<<m.inclusive<<" exclusive_ns="<<m.exclusive<<'\n';metrics.clear();}
}
