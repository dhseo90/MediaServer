// 파일 용도: bounded 숫자 귀속 표본. 원문/주소/질의/권한 문자열을 출력하지 않는다.
#pragma once
#include "recording/recording_memory_reservation.h"
#include "recording/recording_allocator_diagnostic.h"
#include <cstdarg>
#include <cstdio>
#include <unistd.h>
#if defined(__APPLE__)
#include <libproc.h>
#endif
namespace recording::memory_diagnostic {
// One cursor per resource trace; no product objects, heap, history or FD retained.
struct EventCursor {std::uint64_t end=0;bool initialized=false,failed=false;};
struct OwnerSample {
    SearchModelResidency::Diagnostic ledger;
    std::array<Model,128> models{};std::array<Pool,16> pools{};std::array<Event,32> events{};
    std::array<std::uint64_t,CounterCount> live{},peak{};std::array<std::uint64_t,20> totals{};
    bool loss=false;std::uint64_t begin{},roles_at{},process_at{},endNs{};
    long long rss=-1,footprint=-1;AllocatorSample allocator;
};
// Pure formatting of one frozen sample, shared by production and deterministic tests.
inline bool EmitSample(const OwnerSample& sample,const char* phase,bool(*sink)(const char*,std::size_t),EventCursor* cursor=nullptr) {
    const auto& ledger=sample.ledger;const auto& models=sample.models;const auto& pools=sample.pools;const auto& events=sample.events;
    const auto& live=sample.live;const auto& peak=sample.peak;const auto& totals=sample.totals;const auto& allocator=sample.allocator;
    const auto begin=sample.begin,roles_at=sample.roles_at,process_at=sample.process_at;
    const auto rss=sample.rss,footprint=sample.footprint;bool loss=sample.loss;
    const auto end=totals[8],ringStart=end>events.size()?end-events.size():0;
    const bool full=cursor&&!cursor->initialized;
    const auto start=cursor&&cursor->initialized?cursor->end:ringStart;
    if(cursor&&(cursor->failed||end<start||end-start>events.size()))loss=true;
    char line[16384];std::size_t offset=0;bool complete=true;
    const auto add=[&](const char* format,auto... args){if(!complete)return;int n=0;if constexpr(sizeof...(args)==0)n=std::snprintf(line+offset,sizeof(line)-offset,"%s",format);else n=std::snprintf(line+offset,sizeof(line)-offset,format,args...);if(n<0||std::size_t(n)>=sizeof(line)-offset){complete=false;return;}offset+=n;};
    const auto u=[](std::uint64_t n){return static_cast<unsigned long long>(n);};
    add("[memory-attribution] {\"pid\":%d,\"phase\":\"%s\",\"sampleStartNs\":%llu,\"ownerCapturedNs\":%llu,\"rolesCapturedNs\":%llu,\"processCapturedNs\":%llu,\"rssBytes\":%lld,\"footprintBytes\":%lld,\"residencyUsed\":%llu,\"attributedSearchBytes\":%llu,\"unattributedSearchBytes\":%llu,\"valid\":%s,\"loss\":%s,\"tickets\":{",getpid(),phase,u(begin),u(ledger.capturedNs),u(roles_at),u(process_at),rss,footprint,u(ledger.used),u(ledger.attributed),u(ledger.unattributed),ledger.valid?"true":"false",loss?"true":"false");
    for(unsigned i=0;i<Names.size();++i)add("%s\"%s\":[%llu,%llu]",i?",":"",Names[i],u(ledger.bytes[i]),u(ledger.tickets[i]));
    add("},\"ticketWitness\":{\"peak\":%llu,\"peakNs\":%llu,\"atPeak\":[",u(ledger.ticketPeak),u(ledger.ticketPeakNs));
    for(unsigned i=0;i<ledger.atPeak.size();++i)add("%s%llu",i?",":"",u(ledger.atPeak[i]));
    add("],\"sites\":[");
    for(unsigned i=0;i<ledger.sites.size();++i){const auto& w=ledger.sites[i];
        add("%s[%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu]",i?",":"",u(w.live),u(w.tickets),u(w.acquires),u(w.releases),u(w.peak),u(w.peakNs),u(w.peakTotal),u(w.peakTickets),u(w.largest),u(w.largestNs),u(w.lastReleaseNs),u(w.zeroNs),u(w.splits));}
    add("],\"unknownPeak\":[%llu,%llu,%llu,%llu],\"atUnknownPeak\":[",u(ledger.unknownPeak),u(ledger.unknownPeakNs),u(ledger.unknownPeakTotal),u(ledger.unknownPeakTickets));
    for(unsigned i=0;i<ledger.atUnknownPeak.size();++i)add("%s%llu",i?",":"",u(ledger.atUnknownPeak[i]));
    add("],\"unknownLive\":[");for(unsigned i=0;i<ledger.unknownLive.size();++i)add("%s%llu",i?",":"",u(ledger.unknownLive[i]));
    add("],\"allocator\":[%s,%s,%llu,%llu,%llu,%llu,%llu,%llu]",allocator.supported?"true":"false",allocator.called?"true":"false",u(allocator.beginNs),u(allocator.endNs),u(allocator.sizeInUse),u(allocator.sizeAllocated),u(allocator.maxSizeInUse),u(allocator.blocksInUse));
    add("},\"models\":[");bool first=true;for(const auto& m:models)if(m.id){add("%s[%llu,%llu,%llu,%llu,%s,%llu,%s]",first?"":",",u(m.id),u(m.bytes),u(m.documents),u(m.revision),m.current?"true":"false",u(m.snapshotReferences),m.publishedOnce?"true":"false");first=false;}
    add("],\"snapshotPools\":[");first=true;for(const auto& p:pools)if(p.key){add("%s[%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%s]",first?"":",",u(p.key),u(p.entries),u(p.bytes),u(p.matchBytes),u(p.references),u(p.uniqueModels),u(p.uniqueBytes),u(p.oldestExpiryNs),u(p.newestExpiryNs),p.incomplete?"true":"false");first=false;}
    add("],\"live\":[");for(unsigned i=0;i<live.size();++i)add("%s%llu",i?",":"",u(live[i]));add("],\"peak\":[");for(unsigned i=0;i<peak.size();++i)add("%s%llu",i?",":"",u(peak[i]));
    add("],\"totals\":[");for(unsigned i=0;i<totals.size();++i)add("%s%llu",i?",":"",u(totals[i]));
    if(cursor)add("],\"schemaVersion\":2,\"eventFull\":%s,\"eventStartSequence\":%llu,\"eventSequence\":%llu,\"recentEvents\":[",full?"true":"false",u(start),u(end));
    else add("],\"recentEvents\":[");
    first=true;
    for(auto i=std::max(start,ringStart);i<end;++i){const auto& e=events[i%events.size()];
        add("%s[",first?"":",");if(cursor)add("%llu,",u(i));
        add("%llu,%llu,%llu,%llu,%llu,%llu]",u(e.at),u(e.id),u(e.kind),u(e.bytes),u(e.documents),u(e.revision));first=false;}
    add("],\"sampleEndNs\":%llu}\n",u(sample.endNs?sample.endNs:Now()));
    const bool ok=complete&&sink(line,offset)&&ledger.valid&&!loss;
    if(cursor){if(ok){cursor->end=end;cursor->initialized=true;}else cursor->failed=true;}
    return ok;
}
inline bool Emit(const SearchModelResidency& owner,const char* phase,bool(*sink)(const char*,std::size_t),EventCursor* cursor=nullptr) {
    if(!Enabled())return true;
    OwnerSample sample;sample.begin=Now();sample.ledger=owner.DiagnosticSnapshot();
    {auto& s=Data();std::lock_guard lock(s.mutex);sample.models=s.models;sample.pools=s.pools;sample.events=s.events;sample.live=s.live;sample.peak=s.peak;sample.loss=s.loss;
        sample.totals={s.created,s.destroyed,s.published,s.noLongerCurrent,s.snapshotRetained,s.expired,s.evicted,s.byteEvicted,s.eventSequence,s.lastReaderReleaseNs,s.finalReprepare,s.visualGeneration,s.visualDocs,s.visualBytes,s.retiredBytes,s.visualReferences,s.retiredReferences,s.visualCapturedNs,Now(),s.peakModels};}
    sample.roles_at=Now();
#if defined(__APPLE__)
    rusage_info_v4 usage{};if(proc_pid_rusage(getpid(),RUSAGE_INFO_V4,reinterpret_cast<rusage_info_t*>(&usage))==0){sample.rss=usage.ri_resident_size;sample.footprint=usage.ri_phys_footprint;}
#endif
    sample.process_at=Now();sample.allocator=AllocatorStatistics();
    return EmitSample(sample,phase,sink,cursor);
}
}
