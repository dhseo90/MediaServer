// 파일 용도: v2.4.0 Ops 이벤트 review/action route의 owner 매칭 구현.
// V240-S06 owner-only route matching이며 Event POST payload는 변경하지 않는다.
// WebRTC DataChannel schema와 SSE/WS metadata schema도 변경하지 않는다.
// RTSP/WebRTC media path 역시 변경하지 않는다.
// Client summary owner는 /client/api/views/{id}/dashboard,
// /client/api/views/{id}/events, /client/api/views/{id}/metadata를 담당한다.
#include "ingress/ops_event_route_owner.h"

namespace ingress {

namespace {

constexpr const char* kOpsEventsPagePath = "/ops/events";
constexpr const char* kOpsEventsStatusPath = "/ops/api/events/status";
constexpr const char* kOpsEventReviewsPath = "/ops/api/events/reviews";
constexpr const char* kOpsEventReviewItemPrefix = "/ops/api/events/reviews/";
constexpr const char* kOpsAlertDeliveriesPath = "/ops/api/alerts/deliveries";
constexpr const char* kOpsAlertDeliveryDryRunPath = "/ops/api/alerts/deliveries/dry-run";
constexpr const char* kOpsAlertDeliveryFixturePath = "/ops/api/alerts/deliveries/test";
constexpr const char* kClientDashboardSummarySubresource = "dashboard";
constexpr const char* kClientEventsSummarySubresource = "events";
constexpr const char* kClientMetadataSummarySubresource = "metadata";

bool HasPrefix(const std::string& value, const std::string& prefix) {
    return value.rfind(prefix, 0) == 0;
}

}  // namespace

OpsEventRouteMatch MatchOpsEventRouteOwner(const std::string& method, const std::string& path) {
    if (IsOpsEventsPageRoute(path)) {
        return {OpsEventRouteOwner::OpsEventsPage, "ops-events-page", ""};
    }
    if (IsOpsEventStatusRoute(method, path)) {
        return {OpsEventRouteOwner::OpsEventStatusApi, "ops-events-status", ""};
    }
    if (IsOpsEventReviewCollectionRoute(method, path)) {
        return {OpsEventRouteOwner::OpsEventReviewApi, "ops-event-review-collection", ""};
    }
    if (IsOpsEventReviewItemRoute(path)) {
        return {OpsEventRouteOwner::OpsEventReviewApi,
                "ops-event-review-item",
                OpsEventReviewItemIdFromPath(path)};
    }
    if (IsOpsAlertDeliveryCollectionRoute(path)) {
        return {OpsEventRouteOwner::OpsAlertDeliveryApi, "ops-alert-delivery-collection", ""};
    }
    if (IsOpsAlertDeliveryDryRunRoute(method, path)) {
        return {OpsEventRouteOwner::OpsAlertDeliveryApi, "ops-alert-delivery-dry-run", ""};
    }
    if (IsOpsAlertDeliveryFixtureRoute(method, path)) {
        return {OpsEventRouteOwner::OpsAlertDeliveryApi, "ops-alert-delivery-fixture", ""};
    }
    return {};
}

bool IsOpsEventsPageRoute(const std::string& path) {
    return path == kOpsEventsPagePath;
}

bool IsOpsEventStatusRoute(const std::string& method, const std::string& path) {
    return method == "GET" && path == kOpsEventsStatusPath;
}

bool IsOpsEventReviewCollectionRoute(const std::string& method, const std::string& path) {
    return method == "GET" && path == kOpsEventReviewsPath;
}

bool IsOpsEventReviewItemRoute(const std::string& path) {
    return HasPrefix(path, kOpsEventReviewItemPrefix) &&
           path.size() > std::string(kOpsEventReviewItemPrefix).size();
}

std::string OpsEventReviewItemIdFromPath(const std::string& path) {
    if (!IsOpsEventReviewItemRoute(path)) {
        return "";
    }
    return path.substr(std::string(kOpsEventReviewItemPrefix).size());
}

bool IsOpsAlertDeliveryCollectionRoute(const std::string& path) {
    return path == kOpsAlertDeliveriesPath;
}

bool IsOpsAlertDeliveryDryRunRoute(const std::string& method, const std::string& path) {
    return method == "POST" && path == kOpsAlertDeliveryDryRunPath;
}

bool IsOpsAlertDeliveryFixtureRoute(const std::string& method, const std::string& path) {
    return method == "POST" && path == kOpsAlertDeliveryFixturePath;
}

bool IsClientViewSummaryRoute(const std::string& subresource) {
    return IsClientViewDashboardSummaryRoute(subresource) ||
           IsClientViewEventsSummaryRoute(subresource) ||
           IsClientViewMetadataSummaryRoute(subresource);
}

bool IsClientViewDashboardSummaryRoute(const std::string& subresource) {
    return subresource == kClientDashboardSummarySubresource;
}

bool IsClientViewEventsSummaryRoute(const std::string& subresource) {
    return subresource == kClientEventsSummarySubresource;
}

bool IsClientViewMetadataSummaryRoute(const std::string& subresource) {
    return subresource == kClientMetadataSummarySubresource;
}

}  // namespace ingress
