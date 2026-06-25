// 파일 요약: 운영 source registry와 client published view registry API를 선언한다.
// 동작 요약: source 원본 설정과 클라이언트 공개 view를 분리해 JSON 파일로 저장하고 role/scope 기반 조회를 제공한다.
#pragma once

#include <filesystem>
#include <mutex>
#include <string>
#include <vector>

#include "ingress/http_auth.h"

namespace ingress {

struct RegistryResult {
    int status{200};
    std::string status_text{"OK"};
    std::string body;
};

class SourceViewRegistry {
public:
    struct SourceRecord {
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

    struct SourceIdentityPublishedView {
        std::string view_id;
        std::string display_name;
        std::string default_rule_id;
        std::vector<std::string> allowed_rule_ids;
        std::vector<std::string> allowed_overlay_modes;
        std::vector<std::string> client_groups;
        int max_tiles{1};
        bool enabled{true};
        bool show_dashboard{true};
        bool show_events{true};
        bool show_metadata_summary{true};
    };

    struct SourceIdentitySnapshot {
        std::string source_id;
        std::string display_name;
        std::string source_kind;
        std::string canonical_source_key;
        bool enabled{true};
        std::vector<std::string> tags;
        std::string owner_group;
        std::string site;
        std::string group;
        std::string floor;
        std::string zone;
        std::vector<SourceIdentityPublishedView> published_views;
    };

    struct SourceIdentitySummary {
        int source_count{0};
        int enabled_source_count{0};
        int disabled_source_count{0};
        int published_view_count{0};
        int linked_published_view_count{0};
        int disabled_published_view_count{0};
        int sources_without_published_view{0};
        int published_views_without_source{0};
    };

    static SourceViewRegistry& Instance();

    RegistryResult SourcesJson();
    RegistryResult ViewsJson();
    RegistryResult SourceRegistrySnapshotIdentityJson();
    RegistryResult ClientViewsJson(const auth::Principal& principal);
    RegistryResult ClientViewJson(const std::string& view_id, const auth::Principal& principal);
    RegistryResult ResolveClientViewAccess(const std::string& view_id,
                                           const auth::Principal& principal,
                                           const std::string& required_scope_prefix,
                                           ClientViewAccess* access);
    bool Snapshot(std::vector<SourceRecord>* sources,
                  std::vector<PublishedViewRecord>* views,
                  std::string* error_message);

    RegistryResult CreateSource(const std::string& body);
    RegistryResult UpsertSource(const std::string& source_id, const std::string& body);
    RegistryResult DisableSource(const std::string& source_id);

    RegistryResult CreateView(const std::string& body);
    RegistryResult UpsertView(const std::string& view_id, const std::string& body);
    RegistryResult DisableView(const std::string& view_id);

private:
    bool EnsureLoadedLocked(std::string* error_message);
    bool SaveSourcesLocked(const std::vector<SourceRecord>& sources,
                           std::string* error_message) const;
    bool SaveViewsLocked(const std::vector<PublishedViewRecord>& views,
                         std::string* error_message) const;

    mutable std::mutex mu_;
    bool loaded_{false};
    std::filesystem::path source_storage_path_;
    std::filesystem::path views_storage_path_;
    std::vector<SourceRecord> sources_;
    std::vector<PublishedViewRecord> views_;
};

}  // namespace ingress
