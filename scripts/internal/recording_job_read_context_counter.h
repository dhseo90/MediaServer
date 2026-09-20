// 소유 복제본의 실제 public Parse만 Query 호출 구간에서 계수한다.
#pragma once
#include <cstddef>
#include <memory>
#include <vector>
#include <new>
#include <stdexcept>
namespace recording {struct DerivedJobRecordV1;struct RecordingMutationV1;}
namespace job_read_probe {
inline thread_local bool enabled=false;
inline thread_local std::size_t parses=0;
inline thread_local std::size_t serializes=0;
inline thread_local bool strict_only=false,fail_admission=false,fail_media=false;
inline thread_local std::size_t observed_charge=0,observed_entries=0;
inline thread_local bool zero_budget=false;
inline thread_local std::vector<std::weak_ptr<const recording::DerivedJobRecordV1>> jobs;
inline thread_local std::vector<std::weak_ptr<const recording::RecordingMutationV1>> envelopes;
inline void Parse() noexcept {if(enabled)++parses;}
inline void Serialize() noexcept {if(enabled)++serializes;}
inline void Admission(){if(fail_admission){fail_admission=false;throw std::bad_alloc();}}
inline void Media(){if(fail_media){fail_media=false;throw std::runtime_error("fixture-media-exception");}}
template<class Context> struct Observe {
    const Context& context;
    ~Observe(){if(!enabled)return;observed_charge=context.charge;observed_entries=context.entries.size();
        jobs.clear();envelopes.clear();for(const auto& e:context.entries){jobs.push_back(e.job);envelopes.push_back(e.envelope);}}
};
inline bool Expired(){for(const auto& value:jobs)if(!value.expired())return false;for(const auto& value:envelopes)if(!value.expired())return false;return true;}
inline bool ObservedExpired(){return observed_entries>0&&jobs.size()==observed_entries&&envelopes.size()==observed_entries&&Expired();}
}
