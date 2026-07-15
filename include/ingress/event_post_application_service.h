// 파일 요약: Event POST payload 입력과 dispatcher 상태를 dependency-free application DTO로 선언한다.
#pragma once

#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

namespace ingress {

struct EventPostDispatchBox {
    float x{0.0F};
    float y{0.0F};
    float width{0.0F};
    float height{0.0F};
};

struct EventPostDispatchSource {
    std::string source_key;
    std::string profile_key;
    std::string source_kind;
    std::string route;
    std::string client_id;
    std::int64_t pts{0};
};

struct EventPostDispatchEvent {
    std::string rule_id;
    std::string event_type;
    std::uint64_t track_id{0};
    int class_id{-1};
    std::string label;
    float score{0.0F};
    EventPostDispatchBox box;
    std::string highlight_color;
    int highlight_duration_ms{0};
    bool highlight_enabled{false};
    bool post_enabled{false};
    std::string post_url;
};

struct EventPostDispatchRequest {
    EventPostDispatchSource source;
    std::vector<EventPostDispatchEvent> events;
};

struct EventPostDispatchStatus {
    bool enabled{false};
    std::size_t queue_size{0};
    std::size_t max_queue_size{0};
    std::uint64_t enqueued_count{0};
    std::uint64_t sent_count{0};
    std::uint64_t failed_count{0};
    std::uint64_t dropped_count{0};
    std::uint64_t suppressed_count{0};
    std::string last_error;
};

void DispatchEventPostsForApplication(const EventPostDispatchRequest& request);
EventPostDispatchStatus ObserveEventPostDispatchStatus();

}  // namespace ingress
