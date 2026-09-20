#pragma once
// 소유 복제 TU에서만 활성화한다. 복구 단계의 내용 비용과 실제 호출 수를 분리한다.
#include <array>
#include <cstdint>
#include <new>
namespace recovery_content_probe {
enum class Phase : unsigned { Apply, Preflight, RebuildPreflight, Projection };
struct Count {std::uint64_t parses{0},serializes{0},calls{0};};
inline bool enabled=false,rebuilding=false;
inline bool strict_only=false,fail_admission=false;
inline void Admission(){if(fail_admission){fail_admission=false;throw std::bad_alloc();}}
inline Phase phase=Phase::Apply;
inline std::array<Count,4> counts{};
struct Scope {
    Phase previous;
    explicit Scope(Phase value):previous(phase){phase=value;if(enabled)++counts[static_cast<unsigned>(value)].calls;}
    ~Scope(){phase=previous;}
};
struct Rebuild {bool previous;Rebuild():previous(rebuilding){rebuilding=true;}~Rebuild(){rebuilding=previous;}};
inline void Parse(){if(enabled)++counts[static_cast<unsigned>(phase)].parses;}
inline void Serialize(){if(enabled)++counts[static_cast<unsigned>(phase)].serializes;}
inline void Reset(){counts={};phase=Phase::Apply;rebuilding=false;}
}
