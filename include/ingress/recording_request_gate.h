// 파일 용도: S06 요청의 admission과 종료 drain을 분리한다. 다른 HTTP 경로의 동작은 바꾸지 않는다.
#pragma once
#include <memory>
#include <mutex>
#include <condition_variable>
#include <unordered_map>
#include <sys/socket.h>

namespace ingress {
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
    bool Cancelled() const { std::lock_guard lock(mu_); return !accepting_; }
private:
    mutable std::mutex mu_;
    std::condition_variable drained_;
    bool accepting_{true};
    std::unordered_map<Flight*, int> flights_;
};
}  // namespace ingress
