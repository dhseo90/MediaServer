// 파일 요약: Source/View application service를 concrete registry에 연결한다.
// 동작 요약: 모든 결과와 DTO 필드를 명시적으로 복사하고 실패 시 caller output을 보존한다.
#include "ingress/source_view_application_service.h"

#include <utility>

#include "ingress/source_view_registry.h"

namespace ingress {
namespace {

ApplicationServiceResult ToApplicationServiceResult(RegistryResult result) {
    return ApplicationServiceResult{
        result.status,
        std::move(result.status_text),
        std::move(result.body),
    };
}

SourceViewApplicationService::SourceRecord ToApplicationSource(
    const SourceViewRegistry::SourceRecord& input) {
    SourceViewApplicationService::SourceRecord output;
    output.source_id = input.source_id;
    output.display_name = input.display_name;
    output.kind = input.kind;
    output.canonical_source_key = input.canonical_source_key;
    output.file = input.file;
    output.rtsp_url = input.rtsp_url;
    output.webrtc_source_id = input.webrtc_source_id;
    output.whep_url = input.whep_url;
    output.http_url = input.http_url;
    output.enabled = input.enabled;
    output.tags = input.tags;
    output.owner_group = input.owner_group;
    output.site = input.site;
    output.group = input.group;
    output.floor = input.floor;
    output.zone = input.zone;
    output.recording.enabled = input.recording.enabled;
    output.recording.quota_bytes = input.recording.quota_bytes;
    output.recording.retention_days = input.recording.retention_days;
    output.recording.storage_path = input.recording.storage_path;
    output.recording.revision = input.recording.revision;
    return output;
}

SourceViewApplicationService::PublishedViewRecord ToApplicationView(
    const SourceViewRegistry::PublishedViewRecord& input) {
    SourceViewApplicationService::PublishedViewRecord output;
    output.view_id = input.view_id;
    output.display_name = input.display_name;
    output.source_id = input.source_id;
    output.default_rule_id = input.default_rule_id;
    output.allowed_rule_ids = input.allowed_rule_ids;
    output.allowed_overlay_modes = input.allowed_overlay_modes;
    output.show_dashboard = input.show_dashboard;
    output.show_events = input.show_events;
    output.show_metadata_summary = input.show_metadata_summary;
    output.client_groups = input.client_groups;
    output.max_tiles = input.max_tiles;
    output.enabled = input.enabled;
    return output;
}

SourceViewApplicationService::ClientViewAccess ToApplicationAccess(
    const SourceViewRegistry::ClientViewAccess& input) {
    SourceViewApplicationService::ClientViewAccess output;
    output.view = ToApplicationView(input.view);
    output.source = ToApplicationSource(input.source);
    return output;
}

}  // namespace

SourceViewApplicationService& SourceViewApplicationService::Instance() {
    static SourceViewApplicationService service;
    return service;
}

ApplicationServiceResult SourceViewApplicationService::SourcesJson() {
    return ToApplicationServiceResult(SourceViewRegistry::Instance().SourcesJson());
}

ApplicationServiceResult SourceViewApplicationService::ViewsJson() {
    return ToApplicationServiceResult(SourceViewRegistry::Instance().ViewsJson());
}

ApplicationServiceResult SourceViewApplicationService::SourceRegistrySnapshotIdentityJson() {
    return ToApplicationServiceResult(
        SourceViewRegistry::Instance().SourceRegistrySnapshotIdentityJson());
}

ApplicationServiceResult SourceViewApplicationService::SourceOnboardingQualitySummaryJson() {
    return ToApplicationServiceResult(
        SourceViewRegistry::Instance().SourceOnboardingQualitySummaryJson());
}

ApplicationServiceResult SourceViewApplicationService::ClientViewsJson(
    const ClientViewAccessAuthorizer& authorizer) {
    return ToApplicationServiceResult(SourceViewRegistry::Instance().ClientViewsJson(authorizer));
}

ApplicationServiceResult SourceViewApplicationService::ClientViewJson(
    const std::string& view_id,
    const ClientViewAccessAuthorizer& authorizer) {
    return ToApplicationServiceResult(
        SourceViewRegistry::Instance().ClientViewJson(view_id, authorizer));
}

ApplicationServiceResult SourceViewApplicationService::ResolveClientViewAccess(
    const std::string& view_id,
    const ClientViewAccessAuthorizer& authorizer,
    const std::string& required_scope_prefix,
    ClientViewAccess* access) {
    if (access == nullptr) {
        return ToApplicationServiceResult(SourceViewRegistry::Instance().ResolveClientViewAccess(
            view_id, authorizer, required_scope_prefix, nullptr));
    }
    SourceViewRegistry::ClientViewAccess domain_access;
    auto result = SourceViewRegistry::Instance().ResolveClientViewAccess(
        view_id, authorizer, required_scope_prefix, &domain_access);
    if (result.status == 200) {
        *access = ToApplicationAccess(domain_access);
    }
    return ToApplicationServiceResult(std::move(result));
}

bool SourceViewApplicationService::Snapshot(std::vector<SourceRecord>* sources,
                                            std::vector<PublishedViewRecord>* views,
                                            std::string* error_message) {
    std::vector<SourceViewRegistry::SourceRecord> domain_sources;
    std::vector<SourceViewRegistry::PublishedViewRecord> domain_views;
    const bool ok = SourceViewRegistry::Instance().Snapshot(
        sources != nullptr ? &domain_sources : nullptr,
        views != nullptr ? &domain_views : nullptr,
        error_message);
    if (!ok) {
        return false;
    }
    if (sources != nullptr) {
        std::vector<SourceRecord> converted;
        converted.reserve(domain_sources.size());
        for (const auto& source : domain_sources) converted.push_back(ToApplicationSource(source));
        *sources = std::move(converted);
    }
    if (views != nullptr) {
        std::vector<PublishedViewRecord> converted;
        converted.reserve(domain_views.size());
        for (const auto& view : domain_views) converted.push_back(ToApplicationView(view));
        *views = std::move(converted);
    }
    return true;
}

void SourceViewApplicationService::SetSourceMutationCallback(SourceMutationCallback callback) {
    SourceViewRegistry::Instance().SetSourceMutationCallback(
        [callback = std::move(callback)](const SourceViewRegistry::SourceRecord& input) {
            if (callback) callback(ToApplicationSource(input));
        });
}

ApplicationServiceResult SourceViewApplicationService::CreateSource(const std::string& body) {
    return ToApplicationServiceResult(SourceViewRegistry::Instance().CreateSource(body));
}

ApplicationServiceResult SourceViewApplicationService::UpsertSource(
    const std::string& source_id,
    const std::string& body) {
    return ToApplicationServiceResult(SourceViewRegistry::Instance().UpsertSource(source_id, body));
}

ApplicationServiceResult SourceViewApplicationService::UpsertOnvifSourceView(
    const std::string& source_id,
    const std::string& source_body,
    const std::string& published_view_body) {
    return ToApplicationServiceResult(SourceViewRegistry::Instance().UpsertOnvifSourceView(
        source_id, source_body, published_view_body));
}

ApplicationServiceResult SourceViewApplicationService::DisableSource(
    const std::string& source_id) {
    return ToApplicationServiceResult(SourceViewRegistry::Instance().DisableSource(source_id));
}

ApplicationServiceResult SourceViewApplicationService::CreateView(const std::string& body) {
    return ToApplicationServiceResult(SourceViewRegistry::Instance().CreateView(body));
}

ApplicationServiceResult SourceViewApplicationService::UpsertView(
    const std::string& view_id,
    const std::string& body) {
    return ToApplicationServiceResult(SourceViewRegistry::Instance().UpsertView(view_id, body));
}

ApplicationServiceResult SourceViewApplicationService::DisableView(const std::string& view_id) {
    return ToApplicationServiceResult(SourceViewRegistry::Instance().DisableView(view_id));
}

}  // namespace ingress
