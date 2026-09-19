#pragma once
// 검사 복제본 전용: private strict 작업을 관측할 뿐 결과/분기를 변경하지 않는다.
#include <cstddef>
namespace intent_context_probe {
struct Counts {std::size_t validate=0,restore=0,json=0;};
inline bool enabled=false,watch_build=false;
inline Counts counts{},build_counts{};
inline std::size_t builds=0;
inline void Validate(){if(enabled)++counts.validate;}
inline void Restore(){if(enabled)++counts.restore;}
inline void Json(){if(enabled)++counts.json;}
struct BuildScope {
 bool active,previous;Counts saved;
 BuildScope():active(watch_build),previous(enabled),saved(counts){if(active){counts={};enabled=true;}}
 ~BuildScope(){if(active){build_counts=counts;++builds;counts=saved;enabled=previous;}}
};
}
