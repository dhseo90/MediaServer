// 파일 용도: 동시 세션/스트림 admission과 release 카운터를 구현한다.
#include "core/resource_guard.h"

namespace core {

ResourceGuard::ResourceGuard(std::size_t max_sessions, std::size_t max_streams)
    : max_sessions_(max_sessions), max_streams_(max_streams) {}

bool ResourceGuard::AdmitSession() {
    std::size_t current = active_sessions_.load();
    while (current < max_sessions_) {
        // lock 없이 CAS로 admission을 처리해 RTSP/WebRTC 동시 요청 비용을 낮춘다.
        if (active_sessions_.compare_exchange_weak(current, current + 1)) {
            return true;
        }
    }
    return false;
}

void ResourceGuard::ReleaseSession() {
    std::size_t current = active_sessions_.load();
    while (current > 0) {
        if (active_sessions_.compare_exchange_weak(current, current - 1)) {
            return;
        }
    }
}

bool ResourceGuard::AdmitStream() {
    std::size_t current = active_streams_.load();
    while (current < max_streams_) {
        // stream 수는 dedup된 원본 source 수 기준이다. client 수와 별도로 제한한다.
        if (active_streams_.compare_exchange_weak(current, current + 1)) {
            return true;
        }
    }
    return false;
}

void ResourceGuard::ReleaseStream() {
    std::size_t current = active_streams_.load();
    while (current > 0) {
        if (active_streams_.compare_exchange_weak(current, current - 1)) {
            return;
        }
    }
}

std::size_t ResourceGuard::ActiveSessions() const {
    return active_sessions_.load();
}

std::size_t ResourceGuard::ActiveStreams() const {
    return active_streams_.load();
}

}  // namespace core
