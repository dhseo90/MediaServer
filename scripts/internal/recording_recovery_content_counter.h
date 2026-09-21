#pragma once
// 파일 용도: 소유 복제 TU에서만 활성화한다. 복구 단계의 내용 비용과 실제 호출 수를 분리한다.
#include <array>
#include <cstdint>
#include <new>
#include <chrono>
#include <iostream>
namespace recovery_content_probe {
enum class Phase : unsigned { Apply, Preflight, RebuildPreflight, Projection };
struct Count {std::uint64_t parses{0},serializes{0},calls{0};};
inline bool enabled=false,rebuilding=false;
inline bool strict_only=false,fail_admission=false;
inline void Admission(){if(fail_admission){fail_admission=false;throw std::bad_alloc();}}
inline Phase phase=Phase::Apply;
inline std::array<Count,4> counts{};
// 제품 소스가 아닌 시험 복제본 계측. 고정 단계/수치만 최대128행 기록한다.
inline bool tracing=false;
inline unsigned trace_rows=0;
inline std::chrono::steady_clock::time_point trace_start;
enum class TracePoint : unsigned { Open, Preflight, RebuildPreflight, Projection, Rebuild, Query };
inline void Trace(TracePoint point,bool begin){
    if(!tracing)return;
    if(trace_rows++>=128){if(trace_rows==129)std::cout<<"[recovery-phase-trace] {\"truncated\":true}"<<std::endl;return;}
    const auto us=std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now()-trace_start).count();
    std::cout<<"[recovery-phase-trace] {\"point\":"<<static_cast<unsigned>(point)<<",\"begin\":"<<(begin?"true":"false")<<",\"us\":"<<us<<"}"<<std::endl;
}
struct TraceSession {TraceSession(){trace_rows=0;trace_start=std::chrono::steady_clock::now();tracing=true;}~TraceSession(){tracing=false;}};
struct Scope {
    Phase previous;
    explicit Scope(Phase value):previous(phase){phase=value;if(enabled)++counts[static_cast<unsigned>(value)].calls;Trace(static_cast<TracePoint>(value),true);}
    ~Scope(){Trace(static_cast<TracePoint>(phase),false);phase=previous;}
};
struct Rebuild {bool previous;Rebuild():previous(rebuilding){rebuilding=true;Trace(TracePoint::Rebuild,true);}~Rebuild(){Trace(TracePoint::Rebuild,false);rebuilding=previous;}};
inline void Parse(){if(enabled)++counts[static_cast<unsigned>(phase)].parses;}
inline void Serialize(){if(enabled)++counts[static_cast<unsigned>(phase)].serializes;}
inline void Reset(){counts={};phase=Phase::Apply;rebuilding=false;}
}
