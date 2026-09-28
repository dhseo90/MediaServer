// 파일 용도: 체크포인트 무변경 경로 검사용 파싱·직렬화·읽기 계수와 예외 주입을 제공한다.
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
