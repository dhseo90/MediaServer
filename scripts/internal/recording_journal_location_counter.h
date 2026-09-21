// 파일 용도: 녹화 원장 위치·참조 취득 검사용 읽기 계수와 할당 실패 주입을 제공한다.
#pragma once
#include <new>
#include <cstddef>
namespace location_probe {
inline bool throw_location=false,throw_acquire=false;
inline bool throw_ref=false;
inline std::size_t raw_reads=0;
inline std::size_t release_visits=0;
inline void BeforeLocation(){if(throw_location){throw_location=false;throw std::bad_alloc();}}
inline void BeforeRef(){if(throw_ref){throw_ref=false;throw std::bad_alloc();}}
inline void BeforeAcquire(){++raw_reads;if(throw_acquire){throw_acquire=false;throw std::bad_alloc();}}
}
