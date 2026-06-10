// File purpose: declares owner-only route matching for v2.4.0 Ops event routes.
#pragma once

#include <string>

namespace ingress {

enum class OpsEventRouteOwner {
    None,
    OpsEventsPage,
    OpsEventStatusApi,
    OpsEventReviewApi,
    OpsAlertDeliveryApi,
    ClientViewSummaryApi,
};

struct OpsEventRouteMatch {
    OpsEventRouteOwner owner{OpsEventRouteOwner::None};
    std::string route_name;
    std::string item_id;
};

OpsEventRouteMatch MatchOpsEventRouteOwner(const std::string& method, const std::string& path);

bool IsOpsEventsPageRoute(const std::string& path);
bool IsOpsEventStatusRoute(const std::string& method, const std::string& path);
bool IsOpsEventReviewCollectionRoute(const std::string& method, const std::string& path);
bool IsOpsEventReviewItemRoute(const std::string& path);
std::string OpsEventReviewItemIdFromPath(const std::string& path);

bool IsOpsAlertDeliveryCollectionRoute(const std::string& path);
bool IsOpsAlertDeliveryDryRunRoute(const std::string& method, const std::string& path);
bool IsOpsAlertDeliveryFixtureRoute(const std::string& method, const std::string& path);

bool IsClientViewSummaryRoute(const std::string& subresource);
bool IsClientViewDashboardSummaryRoute(const std::string& subresource);
bool IsClientViewEventsSummaryRoute(const std::string& subresource);
bool IsClientViewMetadataSummaryRoute(const std::string& subresource);

}  // namespace ingress
