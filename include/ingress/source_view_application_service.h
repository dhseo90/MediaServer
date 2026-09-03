// 파일 요약: transport가 사용하는 Source/View application service 경계를 선언한다.
// 동작 요약: registry 저장/락/rollback 소유권은 숨기고 동일 응답과 명시적 DTO만 노출한다.
#pragma once

#include <functional>
#include <cstdint>
#include <string>
#include <vector>

#include "ingress/application_service_result.h"

namespace ingress {

class SourceViewApplicationService {
public:
    using ClientViewAccessAuthorizer =
        std::function<bool(const std::string& view_id,
                           const std::string& required_scope_prefix)>;

    struct SourceRecord {
        struct RecordingPolicy {
            bool enabled{false};
            std::uint64_t continuous_max_bytes{0};
            std::int64_t continuous_max_age_ms{0};
            std::uint64_t event_max_bytes{0};
            std::int64_t event_max_age_ms{0};
            std::string storage_path;
            std::uint64_t revision{1};
        };
        std::string source_id;
        std::string display_name;
        std::string kind;
        std::string canonical_source_key;
        std::string file;
        std::string rtsp_url;
        std::string webrtc_source_id;
        std::string whep_url;
        std::string http_url;
        bool enabled{true};
        std::vector<std::string> tags;
        std::string owner_group;
        std::string site;
        std::string group;
        std::string floor;
        std::string zone;
        RecordingPolicy recording;
    };

    struct PublishedViewRecord {
        std::string view_id;
        std::string display_name;
        std::string source_id;
        std::string default_rule_id;
        std::vector<std::string> allowed_rule_ids;
        std::vector<std::string> allowed_overlay_modes;
        bool show_dashboard{true};
        bool show_events{true};
        bool show_metadata_summary{true};
        std::vector<std::string> client_groups;
        int max_tiles{1};
        bool enabled{true};
    };

    struct ClientViewAccess {
        PublishedViewRecord view;
        SourceRecord source;
    };

    static SourceViewApplicationService& Instance();

    ApplicationServiceResult SourcesJson();
    ApplicationServiceResult ViewsJson();
    ApplicationServiceResult SourceRegistrySnapshotIdentityJson();
    ApplicationServiceResult SourceOnboardingQualitySummaryJson();
    ApplicationServiceResult ClientViewsJson(const ClientViewAccessAuthorizer& authorizer);
    ApplicationServiceResult ClientViewJson(const std::string& view_id,
                                            const ClientViewAccessAuthorizer& authorizer);
    ApplicationServiceResult ResolveClientViewAccess(
        const std::string& view_id,
        const ClientViewAccessAuthorizer& authorizer,
        const std::string& required_scope_prefix,
        ClientViewAccess* access);
    bool Snapshot(std::vector<SourceRecord>* sources,
                  std::vector<PublishedViewRecord>* views,
                  std::string* error_message);
    using SourceMutationCallback = std::function<void(const SourceRecord&)>;
    void SetSourceMutationCallback(SourceMutationCallback callback);

    ApplicationServiceResult CreateSource(const std::string& body);
    ApplicationServiceResult UpsertSource(const std::string& source_id,
                                          const std::string& body);
    ApplicationServiceResult UpsertOnvifSourceView(const std::string& source_id,
                                                   const std::string& source_body,
                                                   const std::string& published_view_body);
    ApplicationServiceResult DisableSource(const std::string& source_id);

    ApplicationServiceResult CreateView(const std::string& body);
    ApplicationServiceResult UpsertView(const std::string& view_id,
                                        const std::string& body);
    ApplicationServiceResult DisableView(const std::string& view_id);
};

}  // namespace ingress
