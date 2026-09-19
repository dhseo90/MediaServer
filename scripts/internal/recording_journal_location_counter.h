#pragma once
#include <new>
namespace location_probe {
inline bool throw_location=false,throw_acquire=false;
inline void BeforeLocation(){if(throw_location){throw_location=false;throw std::bad_alloc();}}
inline void BeforeAcquire(){if(throw_acquire){throw_acquire=false;throw std::bad_alloc();}}
}
