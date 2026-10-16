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
    struct Diagnostic {std::uint64_t capturedNs{},used{},attributed{},unattributed{};std::array<std::uint64_t,unsigned(Category::Count)> bytes{},tickets{};bool valid=true;};
private:
    struct State;
    struct TicketState {State* owner{};Category category{Category::Unattributed};};
    struct State {
        const std::size_t limit;
        std::atomic<std::size_t> used{0},peak{0},rejected{0};
        mutable std::mutex diagnostic_mutex;
        const bool diagnostic=memory_diagnostic::Enabled();
        std::array<std::uint64_t,unsigned(Category::Count)> category_bytes{},category_tickets{};
        std::array<TicketState,unsigned(Category::Count)> kinds{};
        explicit State(std::size_t n):limit(n){for(unsigned i=0;i<kinds.size();++i)kinds[i]={this,Category(i)};}
        std::unique_lock<std::mutex> Guard() const {std::unique_lock<std::mutex> lock(diagnostic_mutex,std::defer_lock);if(diagnostic)lock.lock();return lock;}
        bool Acquire(std::size_t bytes,Category category) noexcept {
            auto lock=Guard();
            auto n=used.load();
            do {if(n>limit||bytes>limit-n){rejected.fetch_add(1);return false;}}
            while(!used.compare_exchange_weak(n,n+bytes));
            auto top=peak.load();while(top<n+bytes&&!peak.compare_exchange_weak(top,n+bytes)){}
            if(diagnostic){category_bytes[unsigned(category)]+=bytes;++category_tickets[unsigned(category)];}
            return true;
        }
        void Release(std::size_t bytes,Category category) noexcept {auto lock=Guard();used.fetch_sub(bytes);if(diagnostic){category_bytes[unsigned(category)]-=bytes;--category_tickets[unsigned(category)];}}
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
            if(state_&&!state_->owner->Acquire(bytes_,state_->category))throw RecordingResourceUnavailable();
        }
        Reservation(Reservation&& other) noexcept:state_(std::move(other.state_)),bytes_(std::exchange(other.bytes_,0)){}
        Reservation& operator=(Reservation other) noexcept {swap(other);return *this;}
        ~Reservation(){if(state_)state_->owner->Release(bytes_,state_->category);}
        void swap(Reservation& other) noexcept {state_.swap(other.state_);std::swap(bytes_,other.bytes_);}
        std::size_t bytes()const noexcept{return bytes_;}
        void DiagnosticCategory(Category c) noexcept {
            if(!state_)return;
            auto* owner=state_->owner;auto lock=owner->Guard();
            if(owner->diagnostic){owner->category_bytes[unsigned(state_->category)]-=bytes_;--owner->category_tickets[unsigned(state_->category)];owner->category_bytes[unsigned(c)]+=bytes_;++owner->category_tickets[unsigned(c)];}
            state_=std::shared_ptr<TicketState>(state_,&owner->kinds[unsigned(c)]);
        }
        // Caller owns this ticket exclusively. The sum stays charged throughout.
        Reservation Split(std::size_t n) {
            if(n>bytes_)throw std::logic_error("reservation split exceeds owner");
            if(state_){auto* owner=state_->owner;auto lock=owner->Guard();if(owner->diagnostic)++owner->category_tickets[unsigned(state_->category)];}
            bytes_-=n;return Reservation(state_,n);
        }
    };
    static constexpr std::size_t kDefaultBytes=640ULL*1024*1024;
    explicit SearchModelResidency(std::size_t bytes=kDefaultBytes):state_(std::make_shared<State>(bytes)){}
    std::optional<Reservation> ReserveOwned(std::size_t bytes,Category category=Category::Unattributed) {
        if(!state_->Acquire(bytes,category))return std::nullopt;
        return Reservation(std::shared_ptr<TicketState>(state_,&state_->kinds[unsigned(category)]),bytes);
    }
    std::shared_ptr<void> Reserve(std::size_t bytes,Category category=Category::Unattributed) {
        auto value=ReserveOwned(bytes,category);if(!value)return {};
        try{return std::make_shared<Reservation>(std::move(*value));}catch(...){return {};}
    }
    Diagnostic DiagnosticSnapshot() const {auto lock=state_->Guard();Diagnostic d;d.capturedNs=memory_diagnostic::Now();d.used=state_->used.load();d.bytes=state_->category_bytes;d.tickets=state_->category_tickets;for(unsigned i=1;i<d.bytes.size();++i)d.attributed+=d.bytes[i];d.valid=state_->diagnostic&&d.attributed<=d.used;if(d.valid)d.unattributed=d.used-d.attributed;return d;}
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
