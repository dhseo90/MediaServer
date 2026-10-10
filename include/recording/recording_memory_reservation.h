// 파일 용도: 검색 owner의 기존 byte admission과 실제 값 소유 예약을 공유한다.
#pragma once
#include <atomic>
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
    struct State {
        const std::size_t limit;
        std::atomic<std::size_t> used{0},peak{0};
        explicit State(std::size_t n):limit(n){}
        bool Acquire(std::size_t bytes) noexcept {
            auto n=used.load();
            do {if(n>limit||bytes>limit-n)return false;}
            while(!used.compare_exchange_weak(n,n+bytes));
            auto top=peak.load();while(top<n+bytes&&!peak.compare_exchange_weak(top,n+bytes)){}
            return true;
        }
    };
    std::shared_ptr<State> state_;
public:
    // Value owners place this member BEFORE charged storage: copy reserves before
    // copying bytes and destruction releases after storage. Move transfers charge.
    // A shared value shares one Reservation, while a deep copy copies Reservation.
    class Reservation {
        friend class SearchModelResidency;
        std::shared_ptr<State> state_;
        std::size_t bytes_{0};
        Reservation(std::shared_ptr<State> s,std::size_t n):state_(std::move(s)),bytes_(n){}
    public:
        Reservation()=default;
        Reservation(const Reservation& other):state_(other.state_),bytes_(other.bytes_) {
            if(state_&&!state_->Acquire(bytes_))throw RecordingResourceUnavailable();
        }
        Reservation(Reservation&& other) noexcept:state_(std::move(other.state_)),bytes_(std::exchange(other.bytes_,0)){}
        Reservation& operator=(Reservation other) noexcept {swap(other);return *this;}
        ~Reservation(){if(state_)state_->used.fetch_sub(bytes_);}
        void swap(Reservation& other) noexcept {state_.swap(other.state_);std::swap(bytes_,other.bytes_);}
        std::size_t bytes()const noexcept{return bytes_;}
        // Caller owns this ticket exclusively. The sum stays charged throughout.
        Reservation Split(std::size_t n) {
            if(n>bytes_)throw std::logic_error("reservation split exceeds owner");
            bytes_-=n;return Reservation(state_,n);
        }
    };
    static constexpr std::size_t kDefaultBytes=640ULL*1024*1024;
    explicit SearchModelResidency(std::size_t bytes=kDefaultBytes):state_(std::make_shared<State>(bytes)){}
    std::optional<Reservation> ReserveOwned(std::size_t bytes) {
        if(!state_->Acquire(bytes))return std::nullopt;
        return Reservation(state_,bytes);
    }
    std::shared_ptr<void> Reserve(std::size_t bytes) {
        auto value=ReserveOwned(bytes);if(!value)return {};
        try{return std::make_shared<Reservation>(std::move(*value));}catch(...){return {};}
    }
    std::size_t used()const{return state_->used.load();}
    std::size_t peak()const{return state_->peak.load();}
    std::size_t limit()const{return state_->limit;}
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
    if constexpr(std::is_base_of_v<RecordingMemoryCharge,T>)value.memory=work.Split(sizeof(T)+512+8*bytes);
}
} // namespace recording
