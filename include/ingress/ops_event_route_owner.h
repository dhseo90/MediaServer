// 파일 용도: v2.4.0 Ops 이벤트 route와 v2.5.0 incident memory route owner 매칭 선언.
#pragma once

#include <string>
#include <vector>

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

enum class OpsIncidentMemoryRouteOwner {
    MemorySearch,
    TimelineGraph,
    ExplainableBrief,
    SimilarIncidentLookup,
    ClientSafeDigest,
    RedactedEvidenceBundle,
    ReleaseReadiness,
};

struct OpsIncidentMemoryRouteReadiness {
    OpsIncidentMemoryRouteOwner owner;
    const char* route;
    const char* schema;
    const char* ui_test_id;
    const char* verifier;
    bool ops_only;
    bool client_safe;
};

OpsEventRouteMatch MatchOpsEventRouteOwner(const std::string& method, const std::string& path);
const std::vector<OpsIncidentMemoryRouteReadiness>& IncidentMemoryRouteReadinessCatalog();

bool IsOpsEventsPageRoute(const std::string& path);
bool IsOpsEventStatusRoute(const std::string& method, const std::string& path);
bool IsOpsEventReviewCollectionRoute(const std::string& method, const std::string& path);
bool IsOpsEventReviewItemRoute(const std::string& path);
std::string OpsEventReviewItemIdFromPath(const std::string& path);
bool IsOpsIncidentMemoryReviewRoute(const std::string& method, const std::string& path);

bool IsOpsAlertDeliveryCollectionRoute(const std::string& path);
bool IsOpsAlertDeliveryDryRunRoute(const std::string& method, const std::string& path);
bool IsOpsAlertDeliveryFixtureRoute(const std::string& method, const std::string& path);
bool IsLabEventEvidenceBundleTokenRoute(const std::string& method, const std::string& path);
bool IsLabEventEvidenceBundleDownloadRoute(const std::string& method, const std::string& path);

bool IsClientViewSummaryRoute(const std::string& subresource);
bool IsClientViewDashboardSummaryRoute(const std::string& subresource);
bool IsClientViewEventsSummaryRoute(const std::string& subresource);
bool IsClientViewMetadataSummaryRoute(const std::string& subresource);

}  // namespace ingress
