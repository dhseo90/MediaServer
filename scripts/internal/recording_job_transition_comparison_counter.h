// 파일 용도: 파생 녹화 상태 전이의 단계별 직렬화·파싱·검증 횟수를 제한된 배열에 계측한다.
#pragma once
#include "recording/recording_derived_job.h"
#include <array>
#include <cstddef>
namespace transition_compare_probe {
enum class Phase {None,Update,Apply,Pool};
struct Counts {std::size_t update=0,apply=0,pool=0,parses=0,validates=0,restores=0,jsons=0;};
inline Counts counts{};inline Phase phase=Phase::None;
inline bool enabled=false,watch_updates=false;
struct Row {unsigned state=0;std::size_t files=0;Counts counts;};
inline std::array<Row,8> rows{};inline std::size_t used=0,dropped=0;
inline Counts Difference(Counts a,Counts b){return {a.update-b.update,a.apply-b.apply,a.pool-b.pool,a.parses-b.parses,a.validates-b.validates,a.restores-b.restores,a.jsons-b.jsons};}
struct Scope {Phase previous;explicit Scope(Phase next):previous(phase){if(enabled)phase=next;}~Scope(){phase=previous;}};
struct UpdateScope {
 bool previous_enabled,capturing;Phase previous;Counts before;unsigned state;std::size_t files;
 explicit UpdateScope(const recording::DerivedJobRecordV1& value):previous_enabled(enabled),capturing(watch_updates),previous(phase),before(counts),state(static_cast<unsigned>(value.state)),files(value.files.size()) {enabled=enabled||watch_updates;if(enabled)phase=Phase::Update;}
 ~UpdateScope(){if(capturing){if(used<rows.size())rows[used++]={state,files,Difference(counts,before)};else ++dropped;}phase=previous;enabled=previous_enabled;}
};
inline void Serialize(){if(enabled){if(phase==Phase::Update)++counts.update;else if(phase==Phase::Apply)++counts.apply;else if(phase==Phase::Pool)++counts.pool;}}
inline void Parse(){if(enabled)++counts.parses;}
inline void Validate(){if(enabled&&phase==Phase::Apply)++counts.validates;}
inline void Restore(){if(enabled&&phase==Phase::Apply)++counts.restores;}
inline void Json(){if(enabled&&phase==Phase::Apply)++counts.jsons;}
}
