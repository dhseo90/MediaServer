// 파일 요약: dependency-free Event POST 입력을 canonical dispatcher 타입으로 투영한다.
#include "ingress/event_post_application_service.h"

#include <utility>

#include "analysis/event_post_dispatcher.h"

namespace ingress {

void DispatchEventPostsForApplication(const EventPostDispatchRequest& request) {
    analysis::AnalysisResult result;
    result.source_key = request.source.source_key;
    result.profile_key = request.source.profile_key;
    result.context.source_kind = request.source.source_kind;
    result.context.route = request.source.route;
    result.context.client_id = request.source.client_id;
    result.pts = request.source.pts;

    std::vector<analysis::AnalysisEvent> events;
    events.reserve(request.events.size());
    for (const auto& input : request.events) {
        analysis::AnalysisEvent event;
        event.rule_id = input.rule_id;
        event.event_type = input.event_type;
        event.track_id = input.track_id;
        event.class_id = input.class_id;
        event.label = input.label;
        event.score = input.score;
        event.box.x = input.box.x;
        event.box.y = input.box.y;
        event.box.width = input.box.width;
        event.box.height = input.box.height;
        event.highlight_color = input.highlight_color;
        event.highlight_duration_ms = input.highlight_duration_ms;
        event.highlight_enabled = input.highlight_enabled;
        event.post_enabled = input.post_enabled;
        event.post_url = input.post_url;
        events.push_back(std::move(event));
    }
    analysis::DispatchEventPosts(result, events);
}

EventPostDispatchStatus ObserveEventPostDispatchStatus() {
    const auto snapshot = analysis::GetEventPostDispatcherSnapshot();
    EventPostDispatchStatus status;
    status.enabled = snapshot.enabled;
    status.queue_size = snapshot.queue_size;
    status.max_queue_size = snapshot.max_queue_size;
    status.enqueued_count = snapshot.enqueued_count;
    status.sent_count = snapshot.sent_count;
    status.failed_count = snapshot.failed_count;
    status.dropped_count = snapshot.dropped_count;
    status.suppressed_count = snapshot.suppressed_count;
    status.last_error = snapshot.last_error;
    return status;
}

}  // namespace ingress
