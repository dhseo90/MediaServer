// 파일 용도: 검색 owner의 기존 byte admission과 실제 값 소유 예약을 공유한다.
#pragma once
#include <atomic>
#include "recording/recording_memory_diagnostic.h"
#include <cstddef>
#include <memory>
#include <optional>
#include <stdexcept>
#include <utility>
#include <type_traits>
namespace recording {
class RecordingResourceUnavailable : public std::runtime_error {
public: RecordingResourceUnavailable():std::runtime_error("recording-resource-unavailable"){}
};
class SearchModelResidency {
public:
    using Category=memory_diagnostic::Category;
    // Diagnostic source labels are orthogonal to the unchanged admission categories.
    enum class Site : unsigned { Unspecified, JournalIdentity, JournalProof, HistoryRaw,
        HistoryVisitor, RetentionSlots, RetentionAuxiliary, CatalogSummary,
        GenerationRead, GenerationParse, GenerationCopy, GenerationCleanup, EvidenceImage, EvidencePackage, EvidenceResponse, Count };
    struct Witness {
        std::uint64_t live{},tickets{},acquires{},releases{},peak{},peakNs{},peakTotal{},
            peakTickets{},largest{},largestNs{},lastReleaseNs{},zeroNs{},splits{};
    };
    struct Diagnostic {std::uint64_t capturedNs{},used{},attributed{},unattributed{};std::array<std::uint64_t,unsigned(Category::Count)> bytes{},tickets{};std::array<Witness,unsigned(Site::Count)> sites{};std::uint64_t ticketPeak{},ticketPeakNs{};std::array<std::uint64_t,unsigned(Site::Count)> atPeak{};std::uint64_t unknownPeak{},unknownPeakNs{},unknownPeakTotal{},unknownPeakTickets{};std::array<std::uint64_t,unsigned(Site::Count)> unknownLive{},atUnknownPeak{};bool valid=true;};
private:
    struct State;
    struct TicketState {State* owner{};Category category{Category::Unattributed};Site site{Site::Unspecified};};
    struct State {
        const std::size_t limit;
        std::atomic<std::size_t> used{0},peak{0},rejected{0};
        mutable std::mutex diagnostic_mutex;
        const bool diagnostic=memory_diagnostic::Enabled();
        std::array<std::uint64_t,unsigned(Category::Count)> category_bytes{},category_tickets{};
        std::array<std::array<TicketState,unsigned(Site::Count)>,unsigned(Category::Count)> kinds{};
        std::array<Witness,unsigned(Site::Count)> sites{};
        std::uint64_t ticket_peak{},ticket_peak_ns{};
        std::array<std::uint64_t,unsigned(Site::Count)> at_peak{};
        std::uint64_t unknown_peak{},unknown_peak_ns{},unknown_peak_total{},unknown_peak_tickets{};
        std::array<std::uint64_t,unsigned(Site::Count)> unknown_live{},at_unknown_peak{};
        void UnknownDelta(Site site,std::size_t bytes,bool acquired) noexcept {
            if(!diagnostic)return;
            auto& n=unknown_live[unsigned(site)];if(acquired)n+=bytes;else n-=bytes;
            if(category_bytes[0]>unknown_peak){unknown_peak=category_bytes[0];unknown_peak_ns=memory_diagnostic::Now();
                unknown_peak_total=used.load();unknown_peak_tickets=category_tickets[0];at_unknown_peak=unknown_live;}
        }
        void Observe(Site site,std::size_t bytes,bool acquired) noexcept {
            if(!diagnostic)return;
            auto& w=sites[unsigned(site)];const auto now=memory_diagnostic::Now();
            if(acquired){w.live+=bytes;++w.tickets;++w.acquires;
                if(bytes>w.largest){w.largest=bytes;w.largestNs=now;}
                if(w.live>w.peak){w.peak=w.live;w.peakNs=now;w.peakTotal=used.load();w.peakTickets=w.tickets;}
                if(used.load()>ticket_peak){ticket_peak=used.load();ticket_peak_ns=now;for(unsigned i=0;i<sites.size();++i)at_peak[i]=sites[i].live;}
            }else{w.live-=bytes;--w.tickets;++w.releases;w.lastReleaseNs=now;if(!w.tickets)w.zeroNs=now;}
        }
        explicit State(std::size_t n):limit(n){for(unsigned i=0;i<kinds.size();++i)for(unsigned j=0;j<kinds[i].size();++j)kinds[i][j]={this,Category(i),Site(j)};}
        std::unique_lock<std::mutex> Guard() const {std::unique_lock<std::mutex> lock(diagnostic_mutex,std::defer_lock);if(diagnostic)lock.lock();return lock;}
        bool Acquire(std::size_t bytes,Category category,Site site) noexcept {
            auto lock=Guard();
            auto n=used.load();
            do {if(n>limit||bytes>limit-n){rejected.fetch_add(1);return false;}}
            while(!used.compare_exchange_weak(n,n+bytes));
            auto top=peak.load();while(top<n+bytes&&!peak.compare_exchange_weak(top,n+bytes)){}
            if(diagnostic){category_bytes[unsigned(category)]+=bytes;++category_tickets[unsigned(category)];Observe(site,bytes,true);if(category==Category::Unattributed)UnknownDelta(site,bytes,true);}
            return true;
        }
        void Release(std::size_t bytes,Category category,Site site) noexcept {auto lock=Guard();used.fetch_sub(bytes);if(diagnostic){category_bytes[unsigned(category)]-=bytes;--category_tickets[unsigned(category)];Observe(site,bytes,false);if(category==Category::Unattributed)UnknownDelta(site,bytes,false);}}
    };
    std::shared_ptr<State> state_;
public:
    // Value owners place this member BEFORE charged storage: copy reserves before
    // copying bytes and destruction releases after storage. Move transfers charge.
    // A shared value shares one Reservation, while a deep copy copies Reservation.
    class Reservation {
        friend class SearchModelResidency;
        // Aliasing shared_ptr keeps the original two-word handle and one-word size.
        // Category metadata lives in the existing shared domain, not each charged value.
        std::shared_ptr<TicketState> state_;
        std::size_t bytes_{0};
        Reservation(std::shared_ptr<TicketState> s,std::size_t n):state_(std::move(s)),bytes_(n){}
    public:
        Reservation()=default;
        Reservation(const Reservation& other):state_(other.state_),bytes_(other.bytes_) {
            if(state_&&!state_->owner->Acquire(bytes_,state_->category,state_->site))throw RecordingResourceUnavailable();
        }
        Reservation(Reservation&& other) noexcept:state_(std::move(other.state_)),bytes_(std::exchange(other.bytes_,0)){}
        Reservation& operator=(Reservation other) noexcept {swap(other);return *this;}
        ~Reservation(){if(state_)state_->owner->Release(bytes_,state_->category,state_->site);}
        void swap(Reservation& other) noexcept {state_.swap(other.state_);std::swap(bytes_,other.bytes_);}
        std::size_t bytes()const noexcept{return bytes_;}
        void DiagnosticCategory(Category c) noexcept {
            if(!state_)return;
            auto* owner=state_->owner;auto lock=owner->Guard();
            if(owner->diagnostic){owner->category_bytes[unsigned(state_->category)]-=bytes_;--owner->category_tickets[unsigned(state_->category)];owner->category_bytes[unsigned(c)]+=bytes_;++owner->category_tickets[unsigned(c)];
                if(state_->category==Category::Unattributed&&c!=Category::Unattributed)owner->UnknownDelta(state_->site,bytes_,false);
                else if(state_->category!=Category::Unattributed&&c==Category::Unattributed)owner->UnknownDelta(state_->site,bytes_,true);}
            state_=std::shared_ptr<TicketState>(state_,&owner->kinds[unsigned(c)][unsigned(state_->site)]);
        }
        // Caller owns this ticket exclusively. The sum stays charged throughout.
        Reservation Split(std::size_t n) {
            if(n>bytes_)throw std::logic_error("reservation split exceeds owner");
            if(state_){auto* owner=state_->owner;auto lock=owner->Guard();if(owner->diagnostic){++owner->category_tickets[unsigned(state_->category)];++owner->sites[unsigned(state_->site)].tickets;++owner->sites[unsigned(state_->site)].splits;}}
            bytes_-=n;return Reservation(state_,n);
        }
    };
    static constexpr std::size_t kDefaultBytes=640ULL*1024*1024;
    explicit SearchModelResidency(std::size_t bytes=kDefaultBytes):state_(std::make_shared<State>(bytes)){}
    std::optional<Reservation> ReserveOwned(std::size_t bytes,Category category=Category::Unattributed,Site site=Site::Unspecified) {
        if(!state_->Acquire(bytes,category,site))return std::nullopt;
        return Reservation(std::shared_ptr<TicketState>(state_,&state_->kinds[unsigned(category)][unsigned(site)]),bytes);
    }
    std::shared_ptr<void> Reserve(std::size_t bytes,Category category=Category::Unattributed,Site site=Site::Unspecified) {
        auto value=ReserveOwned(bytes,category,site);if(!value)return {};
        try{return std::make_shared<Reservation>(std::move(*value));}catch(...){return {};}
    }
    Diagnostic DiagnosticSnapshot() const {auto lock=state_->Guard();Diagnostic d;d.capturedNs=memory_diagnostic::Now();d.used=state_->used.load();d.bytes=state_->category_bytes;d.tickets=state_->category_tickets;d.sites=state_->sites;d.ticketPeak=state_->ticket_peak;d.ticketPeakNs=state_->ticket_peak_ns;d.atPeak=state_->at_peak;d.unknownPeak=state_->unknown_peak;d.unknownPeakNs=state_->unknown_peak_ns;d.unknownPeakTotal=state_->unknown_peak_total;d.unknownPeakTickets=state_->unknown_peak_tickets;d.unknownLive=state_->unknown_live;d.atUnknownPeak=state_->at_unknown_peak;for(unsigned i=1;i<d.bytes.size();++i)d.attributed+=d.bytes[i];d.valid=state_->diagnostic&&d.attributed<=d.used;if(d.valid)d.unattributed=d.used-d.attributed;return d;}
    std::size_t used()const{return state_->used.load();}
    std::size_t peak()const{return state_->peak.load();}
    std::size_t limit()const{return state_->limit;}
    std::size_t rejected()const{return state_->rejected.load();}
};
// The charge base is initialized before Fields and destroyed after it. No JSON
// field is added. Deep copy acquires a separate ticket before copying storage.
struct RecordingMemoryCharge { SearchModelResidency::Reservation memory; };
template<class Fields>
struct RecordingMemoryValue : RecordingMemoryCharge, Fields {
    RecordingMemoryValue()=default;
    template<class First,class... Rest,std::enable_if_t<!std::is_same_v<std::decay_t<First>,RecordingMemoryValue>,int> =0>
    RecordingMemoryValue(First&& first,Rest&&... rest):Fields{std::forward<First>(first),std::forward<Rest>(rest)...}{}
    RecordingMemoryValue(const RecordingMemoryValue&)=default;
    RecordingMemoryValue(RecordingMemoryValue&&) noexcept=default;
    RecordingMemoryValue& operator=(RecordingMemoryValue value) noexcept {
        memory.swap(value.memory);using std::swap;swap(static_cast<Fields&>(*this),static_cast<Fields&>(value));return *this;
    }
};
template<class T> void BindRecordingRowMemory(T& value,SearchModelResidency::Reservation& work,std::size_t bytes) {
    if constexpr(std::is_base_of_v<RecordingMemoryCharge,T>){value.memory=work.Split(sizeof(T)+512+8*bytes);value.memory.DiagnosticCategory(SearchModelResidency::Category::CatalogRow);}
}
} // namespace recording
