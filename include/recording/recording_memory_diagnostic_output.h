// 파일 용도: bounded 숫자 귀속 표본. 원문/주소/질의/권한 문자열을 출력하지 않는다.
#pragma once
#include "recording/recording_memory_reservation.h"
#include <cstdarg>
#include <cstdio>
#include <unistd.h>
#if defined(__APPLE__)
#include <libproc.h>
#endif
namespace recording::memory_diagnostic {
inline bool Emit(const SearchModelResidency& owner,const char* phase,bool(*sink)(const char*,std::size_t)) {
    if(!Enabled())return true;
    const auto begin=Now();const auto ledger=owner.DiagnosticSnapshot();
    std::array<Model,128> models;std::array<Pool,16> pools;std::array<Event,32> events;
    std::array<std::uint64_t,CounterCount> live,peak;
    std::array<std::uint64_t,20> totals{};bool loss=false;
    {auto& s=Data();std::lock_guard lock(s.mutex);models=s.models;pools=s.pools;events=s.events;live=s.live;peak=s.peak;loss=s.loss;
        totals={s.created,s.destroyed,s.published,s.noLongerCurrent,s.snapshotRetained,s.expired,s.evicted,s.byteEvicted,s.eventSequence,s.lastReaderReleaseNs,s.finalReprepare,s.visualGeneration,s.visualDocs,s.visualBytes,s.retiredBytes,s.visualReferences,s.retiredReferences,s.visualCapturedNs,Now(),s.peakModels};}
    const auto roles_at=Now();long long rss=-1,footprint=-1;
#if defined(__APPLE__)
    rusage_info_v4 usage{};if(proc_pid_rusage(getpid(),RUSAGE_INFO_V4,reinterpret_cast<rusage_info_t*>(&usage))==0){rss=usage.ri_resident_size;footprint=usage.ri_phys_footprint;}
#endif
    const auto process_at=Now();char line[16384];std::size_t offset=0;bool complete=true;
    const auto add=[&](const char* format,auto... args){if(!complete)return;int n=0;if constexpr(sizeof...(args)==0)n=std::snprintf(line+offset,sizeof(line)-offset,"%s",format);else n=std::snprintf(line+offset,sizeof(line)-offset,format,args...);if(n<0||std::size_t(n)>=sizeof(line)-offset){complete=false;return;}offset+=n;};
    const auto u=[](std::uint64_t n){return static_cast<unsigned long long>(n);};
    add("[memory-attribution] {\"pid\":%d,\"phase\":\"%s\",\"sampleStartNs\":%llu,\"ownerCapturedNs\":%llu,\"rolesCapturedNs\":%llu,\"processCapturedNs\":%llu,\"rssBytes\":%lld,\"footprintBytes\":%lld,\"residencyUsed\":%llu,\"attributedSearchBytes\":%llu,\"unattributedSearchBytes\":%llu,\"valid\":%s,\"loss\":%s,\"tickets\":{",getpid(),phase,u(begin),u(ledger.capturedNs),u(roles_at),u(process_at),rss,footprint,u(ledger.used),u(ledger.attributed),u(ledger.unattributed),ledger.valid?"true":"false",loss?"true":"false");
    for(unsigned i=0;i<Names.size();++i)add("%s\"%s\":[%llu,%llu]",i?",":"",Names[i],u(ledger.bytes[i]),u(ledger.tickets[i]));
    add("},\"models\":[");bool first=true;for(const auto& m:models)if(m.id){add("%s[%llu,%llu,%llu,%llu,%s,%llu,%s]",first?"":",",u(m.id),u(m.bytes),u(m.documents),u(m.revision),m.current?"true":"false",u(m.snapshotReferences),m.publishedOnce?"true":"false");first=false;}
    add("],\"snapshotPools\":[");first=true;for(const auto& p:pools)if(p.key){add("%s[%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%s]",first?"":",",u(p.key),u(p.entries),u(p.bytes),u(p.matchBytes),u(p.references),u(p.uniqueModels),u(p.uniqueBytes),u(p.oldestExpiryNs),u(p.newestExpiryNs),p.incomplete?"true":"false");first=false;}
    add("],\"live\":[");for(unsigned i=0;i<live.size();++i)add("%s%llu",i?",":"",u(live[i]));add("],\"peak\":[");for(unsigned i=0;i<peak.size();++i)add("%s%llu",i?",":"",u(peak[i]));
    add("],\"totals\":[");for(unsigned i=0;i<totals.size();++i)add("%s%llu",i?",":"",u(totals[i]));
    add("],\"recentEvents\":[");first=true;const auto end=totals[8],start=end>events.size()?end-events.size():0;
    for(auto i=start;i<end;++i){const auto& e=events[i%events.size()];add("%s[%llu,%llu,%llu,%llu,%llu,%llu]",first?"":",",u(e.at),u(e.id),u(e.kind),u(e.bytes),u(e.documents),u(e.revision));first=false;}
    add("],\"sampleEndNs\":%llu}\n",u(Now()));
    return complete&&sink(line,offset)&&ledger.valid&&!loss;
}
}
