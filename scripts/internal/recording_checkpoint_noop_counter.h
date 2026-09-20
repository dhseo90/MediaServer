#pragma once
#include <cstddef>
#include <stdexcept>
namespace noop_probe {
inline bool capture=false,throw_apply=false;
inline const void* throw_owner=nullptr;
inline std::size_t parses=0,serializes=0,reads=0,bytes=0;
struct Scope {bool previous=capture;Scope(){capture=true;}~Scope(){capture=previous;}};
inline void Reset(){parses=serializes=reads=bytes=0;}
inline void Apply(const void* owner){if(throw_apply&&(!throw_owner||throw_owner==owner)){throw_apply=false;throw std::runtime_error("LP20_APPLY_EXCEPTION");}}
}
