// 파일 용도: S06 요청의 admission과 종료 drain을 분리한다. 다른 HTTP 경로의 동작은 바꾸지 않는다.
#pragma once
#include <memory>
#include <array>
#include <chrono>
#include <cstdint>
#include <mutex>
#include <condition_variable>
#include <unordered_map>
#include <sys/socket.h>

namespace ingress {
// Fixed native-test observation. Disabled for every production gate; no payload,
// logging, retries or socket policy. Snapshot access is synchronized independently.
struct RecordingSendObservation {
    struct Event { std::int64_t ns; std::size_t requested; std::int64_t returned; int error; bool begin; };
    struct State { std::array<Event,64> events{}; std::size_t count{0}; bool overflow{false}; };
    void Record(std::size_t requested,std::int64_t returned,int error,bool begin) {
        const auto ns=std::chrono::duration_cast<std::chrono::nanoseconds>(
            std::chrono::steady_clock::now().time_since_epoch()).count();
        std::lock_guard lock(mu);
        if(state.count==state.events.size()){state.overflow=true;return;}
        state.events[state.count++]={ns,requested,returned,error,begin};
    }
    State Snapshot() const {std::lock_guard lock(mu);return state;}
private:
    mutable std::mutex mu;
    State state;
};
class RecordingRequestGate : public std::enable_shared_from_this<RecordingRequestGate> {
public:
    class Flight {
    public:
        ~Flight() {
            std::lock_guard lock(gate_->mu_);
            gate_->flights_.erase(this);
            gate_->drained_.notify_all();
        }
        Flight(const Flight&) = delete;
        Flight& operator=(const Flight&) = delete;
    private:
        friend class RecordingRequestGate;
        explicit Flight(std::shared_ptr<RecordingRequestGate> gate) : gate_(std::move(gate)) {}
        std::shared_ptr<RecordingRequestGate> gate_;
    };
    std::unique_ptr<Flight> Begin(int socket_fd) {
        std::lock_guard lock(mu_);
        if (!accepting_) return {};
        if (test_send_buffer_bytes_ > 0 && ::setsockopt(socket_fd, SOL_SOCKET, SO_SNDBUF,
            &test_send_buffer_bytes_, sizeof(test_send_buffer_bytes_))) return {};
        auto flight = std::unique_ptr<Flight>(new Flight(shared_from_this()));
        flights_.emplace(flight.get(), socket_fd);
        return flight;
    }
    void Close() {
        std::lock_guard lock(mu_);
        accepting_ = false;
        // Flight 제거와 같은 mutex에서 shutdown: 이미 닫혀 재사용된 fd를 취소하지 않는다.
        for (const auto& entry : flights_) if (entry.second >= 0) ::shutdown(entry.second, SHUT_RDWR);
    }
    void Drain() {
        std::unique_lock lock(mu_);
        drained_.wait(lock, [&] { return flights_.empty(); });
    }
    std::shared_ptr<RecordingSendObservation> SendObservation() const {
        std::lock_guard lock(mu_);return test_send_observation_;
    }
    bool Cancelled() const { std::lock_guard lock(mu_); return !accepting_; }
private:
    friend struct RecordingHttpOwnershipProbe;
    mutable std::mutex mu_;
    std::condition_variable drained_;
    bool accepting_{true};
    // Private native-test seam; zero in every production owner, no HTTP/config control.
    int test_send_buffer_bytes_{0};
    std::shared_ptr<RecordingSendObservation> test_send_observation_;
    std::unordered_map<Flight*, int> flights_;
};
}  // namespace ingress
