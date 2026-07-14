// 파일 요약: WebRTC HTTP 서버의 v3.5~v3.8 운영 workflow 구현이다.
#include "webrtc_http_server_detail.h"

namespace ingress {

using namespace webrtc_http_server_detail;

namespace webrtc_http_server_detail {

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17051 function
OpsV350LiveOperationsGraphContext BuildV350LiveOperationsGraphContext(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    OpsV350LiveOperationsGraphContext context;
    if (!source_health_snapshot.ok) {
        context.ok = false;
        context.error = source_health_snapshot.error.empty() ? "source health snapshot failed"
                                                             : source_health_snapshot.error;
        return context;
    }

    std::string load_error;
    if (!SourceViewApplicationService::Instance().Snapshot(&context.sources, &context.views, &load_error)) {
        context.ok = false;
        context.error = load_error.empty() ? "source registry load failed" : load_error;
        return context;
    }

    for (const auto& view : context.views) {
        if (!view.source_id.empty()) {
            context.published_view_ids_by_source[view.source_id].push_back(view.view_id);
        }
    }
    for (const auto& health : source_health_snapshot.items) {
        if (!health.source_id.empty()) {
            context.health_by_source[health.source_id] = &health;
            context.source_health_status_by_source[health.source_id] = health.status;
        }
    }

    analysis::EventRecordQueryOptions event_options;
    event_options.limit = 200;
    analysis::EventRecordQueryResult event_result;
    std::string event_error;
    if (analysis::QueryEventRecords(event_options, &event_result, &event_error)) {
        context.event_record_count = static_cast<int>(event_result.matched_records);
        for (const auto& event_json : event_result.records_json) {
            const std::string stream_id = ParseStringField(event_json, "streamId").value_or("");
            const std::string channel_id = ParseStringField(event_json, "channelId").value_or("");
            if (!stream_id.empty()) {
                ++context.event_record_count_by_source[stream_id];
            }
            if (!channel_id.empty() && channel_id != stream_id) {
                ++context.event_record_count_by_source[channel_id];
            }
        }
    }

    const auto recovery_context =
        BuildV340RecoveryCandidateContext(context.views, source_health_snapshot, config);
    context.recovery_candidates =
        BuildV340RecoveryCandidatePackages(context.sources, recovery_context);
    const auto handoff_source_health_snapshot =
        BuildV340HandoffSourceHealthReplaySnapshot(source_health_snapshot);
    context.source_health_replay_drift_items =
        BuildV340SourceHealthReplayDriftDiffItems(handoff_source_health_snapshot,
                                                  source_health_snapshot);
    return context;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17111 function
const OpsV340RecoveryCandidatePackageItem* V350RecoveryCandidateForSource(
    const std::vector<OpsV340RecoveryCandidatePackageItem>& candidates,
    const std::string& source_id) {
    for (const auto& candidate : candidates) {
        if (candidate.source_id == source_id) {
            return &candidate;
        }
    }
    return nullptr;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17122 function
std::vector<OpsV350LiveOperationsGraphNode> BuildV350LiveOperationsGraphNodes(
    const OpsV350LiveOperationsGraphContext& context) {
    std::vector<OpsV350LiveOperationsGraphNode> nodes;
    nodes.reserve(context.sources.size() * 4 + context.views.size());
    for (const auto& source : context.sources) {
        const auto view_it = context.published_view_ids_by_source.find(source.source_id);
        const std::vector<std::string> publishedViewIds =
            view_it == context.published_view_ids_by_source.end()
                ? std::vector<std::string>{}
                : view_it->second;
        const auto health_it = context.source_health_status_by_source.find(source.source_id);
        const std::string sourceHealthStatus =
            health_it == context.source_health_status_by_source.end() ? "unknown" : health_it->second;
        const auto event_it = context.event_record_count_by_source.find(source.source_id);
        const int eventRecordCount =
            event_it == context.event_record_count_by_source.end() ? 0 : event_it->second;
        const OpsV340RecoveryCandidatePackageItem* recovery =
            V350RecoveryCandidateForSource(context.recovery_candidates, source.source_id);
        const std::string continuityDrillReadiness =
            recovery == nullptr ? "drill-context-missing"
                                : "drill-" + recovery->recovery_readiness;
        const std::string clientImpact =
            publishedViewIds.empty() ? "no-published-view-client-impact"
                                     : "published-view-client-impact";
        const std::string viewerSafeImpactSummary =
            publishedViewIds.empty()
                ? "No published client view is linked to this source."
                : "PublishedView linkage is summarized without source locator or credential material.";

        nodes.push_back({"source:" + source.source_id,
                         "sourceRegistry",
                         source.display_name.empty() ? source.source_id : source.display_name,
                         source.enabled ? "enabled" : "disabled",
                         source.source_id,
                         publishedViewIds,
                         eventRecordCount,
                         sourceHealthStatus,
                         continuityDrillReadiness,
                         clientImpact,
                         viewerSafeImpactSummary});
        nodes.push_back({"sourceHealth:" + source.source_id,
                         "sourceHealth",
                         "Source health " + source.source_id,
                         sourceHealthStatus,
                         source.source_id,
                         {},
                         eventRecordCount,
                         sourceHealthStatus,
                         continuityDrillReadiness,
                         clientImpact,
                         viewerSafeImpactSummary});
        nodes.push_back({"continuityDrill:" + source.source_id,
                         "continuityDrill",
                         "Continuity drill " + source.source_id,
                         continuityDrillReadiness,
                         source.source_id,
                         publishedViewIds,
                         eventRecordCount,
                         sourceHealthStatus,
                         continuityDrillReadiness,
                         clientImpact,
                         viewerSafeImpactSummary});
        nodes.push_back({"clientImpact:" + source.source_id,
                         "clientImpact",
                         "Client impact " + source.source_id,
                         clientImpact,
                         source.source_id,
                         publishedViewIds,
                         eventRecordCount,
                         sourceHealthStatus,
                         continuityDrillReadiness,
                         clientImpact,
                         viewerSafeImpactSummary});
    }
    for (const auto& view : context.views) {
        nodes.push_back({"publishedView:" + view.view_id,
                         "publishedView",
                         view.display_name.empty() ? view.view_id : view.display_name,
                         view.enabled ? "enabled" : "disabled",
                         view.source_id,
                         {view.view_id},
                         0,
                         "view-linked",
                         "view-readiness-projected",
                         view.enabled ? "viewer-visible" : "viewer-hidden",
                         "PublishedView identity only; source locator and credential material are excluded."});
    }
    if (context.event_record_count > 0) {
        nodes.push_back({"eventRecord:recent",
                         "eventRecord",
                         "Recent EventRecord aggregate",
                         "recorded",
                         "aggregate",
                         {},
                         context.event_record_count,
                         "event-record-context",
                         "drill-context-linked",
                         context.client_impact,
                         context.viewer_safe_impact_summary});
    }
    return nodes;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17225 function
std::vector<OpsV350LiveOperationsGraphEdge> BuildV350LiveOperationsGraphEdges(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV350LiveOperationsGraphNode>& graphNodes) {
    (void)graphNodes;
    std::vector<OpsV350LiveOperationsGraphEdge> graphEdges;
    for (const auto& source : context.sources) {
        graphEdges.push_back({"edge:source-health:" + source.source_id,
                              "source:" + source.source_id,
                              "sourceHealth:" + source.source_id,
                              "source-to-health",
                              "linked",
                              "SourceRegistry source is linked to the redacted source health node."});
        graphEdges.push_back({"edge:source-drill:" + source.source_id,
                              "sourceHealth:" + source.source_id,
                              "continuityDrill:" + source.source_id,
                              "health-to-continuity-drill",
                              "linked",
                              "Source health status feeds the continuity drill readiness projection."});
        graphEdges.push_back({"edge:drill-client:" + source.source_id,
                              "continuityDrill:" + source.source_id,
                              "clientImpact:" + source.source_id,
                              "drill-to-client-impact",
                              "viewer-safe",
                              "Continuity drill state is summarized as viewer-safe client impact."});
    }
    for (const auto& view : context.views) {
        graphEdges.push_back({"edge:source-view:" + view.source_id + ":" + view.view_id,
                              "source:" + view.source_id,
                              "publishedView:" + view.view_id,
                              "source-to-published-view",
                              view.enabled ? "enabled" : "disabled",
                              "PublishedView identity is linked without exposing source locator material."});
        graphEdges.push_back({"edge:view-client:" + view.view_id,
                              "publishedView:" + view.view_id,
                              "clientImpact:" + view.source_id,
                              "published-view-to-client-impact",
                              view.enabled ? "viewer-safe" : "disabled",
                              "PublishedView client impact is summarized before any client payload change."});
    }
    if (context.event_record_count > 0) {
        for (const auto& source : context.sources) {
            graphEdges.push_back({"edge:event-source:" + source.source_id,
                                  "eventRecord:recent",
                                  "source:" + source.source_id,
                                  "event-record-to-source",
                                  "aggregate",
                                  "Recent EventRecord aggregate is connected to source context by source/channel id."});
        }
    }
    return graphEdges;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17277 function
OpsV350LiveOperationsGraphSummary BuildV350LiveOperationsGraphSummary(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV350LiveOperationsGraphEdge>& graphEdges) {
    OpsV350LiveOperationsGraphSummary summary;
    summary.source_count = static_cast<int>(context.sources.size());
    summary.published_view_count = static_cast<int>(context.views.size());
    summary.event_record_count = context.event_record_count;
    summary.source_health_count = static_cast<int>(context.health_by_source.size());
    summary.continuity_drill_candidate_count =
        static_cast<int>(context.recovery_candidates.size());
    summary.edge_count = static_cast<int>(graphEdges.size());
    for (const auto& candidate : context.recovery_candidates) {
        if (candidate.recovery_readiness != "ready") {
            ++summary.blocked_count;
        }
        if (candidate.source_health_status != "live") {
            ++summary.degraded_source_count;
        }
        if (!candidate.published_view_ids.empty()) {
            ++summary.client_impact_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17302 function
void AppendV350LiveOperationsGraphNodeJson(std::ostringstream& out,
                                           const OpsV350LiveOperationsGraphNode& node) {
    out << "{"
        << "\"nodeId\":\"" << JsonEscape(node.node_id) << "\","
        << "\"nodeType\":\"" << JsonEscape(node.node_type) << "\","
        << "\"label\":\"" << JsonEscape(node.label) << "\","
        << "\"status\":\"" << JsonEscape(node.status) << "\","
        << "\"sourceId\":\"" << JsonEscape(node.source_id) << "\","
        << "\"publishedViewIds\":";
    AppendV340RecoveryCandidateStringListJson(out, node.published_view_ids);
    out << ",\"eventRecordCount\":" << node.event_record_count
        << ",\"sourceHealthStatus\":\"" << JsonEscape(node.source_health_status) << "\","
        << "\"continuityDrillReadiness\":\""
        << JsonEscape(node.continuity_drill_readiness) << "\","
        << "\"clientImpact\":\"" << JsonEscape(node.client_impact) << "\","
        << "\"viewerSafeImpactSummary\":\""
        << JsonEscape(node.viewer_safe_impact_summary) << "\""
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17322 function
void AppendV350LiveOperationsGraphEdgeJson(std::ostringstream& out,
                                           const OpsV350LiveOperationsGraphEdge& edge) {
    out << "{"
        << "\"edgeId\":\"" << JsonEscape(edge.edge_id) << "\","
        << "\"fromNodeId\":\"" << JsonEscape(edge.from_node_id) << "\","
        << "\"toNodeId\":\"" << JsonEscape(edge.to_node_id) << "\","
        << "\"edgeType\":\"" << JsonEscape(edge.edge_type) << "\","
        << "\"status\":\"" << JsonEscape(edge.status) << "\","
        << "\"summary\":\"" << JsonEscape(edge.summary) << "\""
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17334 function
void AppendV350LiveOperationsGraphSummaryJson(std::ostringstream& out,
                                              const OpsV350LiveOperationsGraphSummary& summary) {
    out << "{"
        << "\"sourceCount\":" << summary.source_count << ","
        << "\"publishedViewCount\":" << summary.published_view_count << ","
        << "\"eventRecordCount\":" << summary.event_record_count << ","
        << "\"sourceHealthCount\":" << summary.source_health_count << ","
        << "\"continuityDrillCandidateCount\":" << summary.continuity_drill_candidate_count << ","
        << "\"clientImpactCount\":" << summary.client_impact_count << ","
        << "\"degradedSourceCount\":" << summary.degraded_source_count << ","
        << "\"blockedCount\":" << summary.blocked_count << ","
        << "\"edgeCount\":" << summary.edge_count
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17349 function
std::string OpsV350LiveOperationsGraphJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v350-live-operations-graph.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }

    const auto graphNodes = BuildV350LiveOperationsGraphNodes(context);
    const auto graphEdges = BuildV350LiveOperationsGraphEdges(context, graphNodes);
    const auto summary = BuildV350LiveOperationsGraphSummary(context, graphEdges);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v350-live-operations-graph.v1\","
        << "\"status\":\"live-operations-graph\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"sourceRegistryRoute\":\"/ops/api/source-registry/snapshot\","
        << "\"publishedViewRoute\":\"/ops/api/views\","
        << "\"sourceHealthRoute\":\"/ops/api/source-health\","
        << "\"continuityDrillRoute\":\"/ops/api/source-registry/continuity-drill/contract\","
        << "\"clientImpactRoute\":\"/client/api/views\","
        << "\"viewerSafeImpactSummary\":\""
        << JsonEscape(context.viewer_safe_impact_summary) << "\","
        << "\"liveOperationsGraphSummary\":";
    AppendV350LiveOperationsGraphSummaryJson(out, summary);
    out << ",\"graphNodes\":[";
    for (std::size_t i = 0; i < graphNodes.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV350LiveOperationsGraphNodeJson(out, graphNodes[i]);
    }
    out << "],\"graphEdges\":[";
    for (std::size_t i = 0; i < graphEdges.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV350LiveOperationsGraphEdgeJson(out, graphEdges[i]);
    }
    out << "],\"readModelPolicy\":{"
        << "\"eventRecord\":\"linked-by-source-or-channel-id\","
        << "\"sourceRegistry\":\"identity-only\","
        << "\"publishedView\":\"identity-only\","
        << "\"sourceHealth\":\"status-summary\","
        << "\"continuityDrill\":\"readiness-summary\","
        << "\"clientImpact\":\"viewer-safe-summary\""
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"redacted\":true,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"commandPlanWritePerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"rawDiagnosticJsonIncluded\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}




// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17464 function
const SourceViewApplicationService::SourceRecord* V370SourceById(
    const std::vector<SourceViewApplicationService::SourceRecord>& sources,
    const std::string& source_id) {
    const auto it = std::find_if(sources.begin(), sources.end(), [&](const auto& source) {
        return source.source_id == source_id;
    });
    return it == sources.end() ? nullptr : &*it;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17473 function
std::vector<std::string> V370PublishedViewIdsForSource(
    const OpsV350LiveOperationsGraphContext& context,
    const std::string& source_id) {
    const auto it = context.published_view_ids_by_source.find(source_id);
    return it == context.published_view_ids_by_source.end() ? std::vector<std::string>{}
                                                            : it->second;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17481 function
int V370EventRecordCountForSource(
    const OpsV350LiveOperationsGraphContext& context,
    const std::string& source_id) {
    const auto it = context.event_record_count_by_source.find(source_id);
    return it == context.event_record_count_by_source.end() ? 0 : it->second;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17488 function
std::string V370SourceHealthStatusForSource(
    const OpsV350LiveOperationsGraphContext& context,
    const std::string& source_id) {
    const auto it = context.source_health_status_by_source.find(source_id);
    return it == context.source_health_status_by_source.end() ? "unknown" : it->second;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17495 function
const OpsV370SiteHealthRollupItem* V370RollupForProjection(
    const std::vector<OpsV370SiteHealthRollupItem>& rollups,
    const OpsV370SiteAwareSourceRegistryProjectionItem& projected) {
    const auto it = std::find_if(rollups.begin(), rollups.end(), [&](const auto& item) {
        return item.site_id == projected.site_id &&
               item.source_group == projected.source_group &&
               item.zone == projected.zone;
    });
    return it == rollups.end() ? nullptr : &*it;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17506 function
std::vector<OpsV370SiteImpactGraphNode> BuildV370SiteImpactGraphNodes(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection,
    const std::vector<OpsV370SiteHealthRollupItem>& rollups) {
    std::vector<OpsV370SiteImpactGraphNode> nodes;
    for (const auto& projected : projection) {
        const auto* rollup = V370RollupForProjection(rollups, projected);
        int group_event_count = 0;
        for (const auto& source_id : projected.source_ids) {
            group_event_count += V370EventRecordCountForSource(context, source_id);
        }

        OpsV370SiteImpactGraphNode site;
        site.node_id = "siteImpactGraph:site:" + projected.site_id;
        site.node_type = "site";
        site.site_id = projected.site_id;
        site.source_group = "all-source-groups";
        site.label = projected.site_id;
        site.status = rollup == nullptr ? "site-linked" : rollup->rollup_state;
        site.published_view_ids = projected.view_ids;
        site.event_record_count = group_event_count;
        site.source_health_status = site.status;
        site.client_impact = projected.view_ids.empty() ? "no-published-view-client-impact"
                                                        : "published-view-client-impact";
        site.viewer_safe_impact_summary =
            "Site-level EventRecord, source health, PublishedView, and client impact are linked without raw locator or credential material.";
        site.refs = {"/ops/api/site-operations/source-registry-projection",
                     "/ops/api/site-operations/health-rollup",
                     "/ops/api/events/reviews"};
        nodes.push_back(std::move(site));

        OpsV370SiteImpactGraphNode group;
        group.node_id = "siteImpactGraph:sourceGroup:" + projected.site_id + ":" + projected.source_group;
        group.node_type = "sourceGroup";
        group.site_id = projected.site_id;
        group.source_group = projected.source_group;
        group.label = projected.source_group;
        group.status = rollup == nullptr ? "source-group-linked" : rollup->rollup_state;
        group.published_view_ids = projected.view_ids;
        group.event_record_count = group_event_count;
        group.source_health_status = group.status;
        group.client_impact = projected.view_ids.empty() ? "no-published-view-client-impact"
                                                         : "published-view-client-impact";
        group.viewer_safe_impact_summary =
            "Source group impact keeps EventRecord and client impact as redacted read model refs.";
        group.refs = {"/ops/api/site-operations/source-registry-projection",
                      "/ops/api/site-operations/health-rollup"};
        nodes.push_back(std::move(group));

        for (const auto& source_id : projected.source_ids) {
            const auto* source = V370SourceById(context.sources, source_id);
            const auto view_ids = V370PublishedViewIdsForSource(context, source_id);
            const int event_count = V370EventRecordCountForSource(context, source_id);
            const std::string health_status = V370SourceHealthStatusForSource(context, source_id);
            const std::string label =
                source == nullptr || source->display_name.empty() ? source_id : source->display_name;
            const std::string client_impact =
                view_ids.empty() ? "no-published-view-client-impact" : "published-view-client-impact";

            OpsV370SiteImpactGraphNode source_node;
            source_node.node_id = "siteImpactGraph:source:" + source_id;
            source_node.node_type = "sourceRegistry";
            source_node.site_id = projected.site_id;
            source_node.source_group = projected.source_group;
            source_node.label = label;
            source_node.status = source != nullptr && source->enabled ? "enabled" : "disabled";
            source_node.source_id = source_id;
            source_node.published_view_ids = view_ids;
            source_node.event_record_count = event_count;
            source_node.source_health_status = health_status;
            source_node.client_impact = client_impact;
            source_node.viewer_safe_impact_summary =
                "Source impact links identity, health, EventRecord count, PublishedView refs, and viewer-safe client impact.";
            source_node.refs = {"/ops/api/source-registry/snapshot", "/ops/api/site-operations/impact-graph"};
            nodes.push_back(std::move(source_node));

            OpsV370SiteImpactGraphNode health_node;
            health_node.node_id = "siteImpactGraph:sourceHealth:" + source_id;
            health_node.node_type = "sourceHealth";
            health_node.site_id = projected.site_id;
            health_node.source_group = projected.source_group;
            health_node.label = "Source health " + source_id;
            health_node.status = health_status;
            health_node.source_id = source_id;
            health_node.published_view_ids = view_ids;
            health_node.event_record_count = event_count;
            health_node.source_health_status = health_status;
            health_node.client_impact = client_impact;
            health_node.viewer_safe_impact_summary =
                "Source health is summarized for impact graph without persisting health changes.";
            health_node.refs = {"/ops/api/site-operations/health-rollup", "sourceHealth:" + source_id};
            nodes.push_back(std::move(health_node));

            OpsV370SiteImpactGraphNode event_node;
            event_node.node_id = "siteImpactGraph:eventRecord:" + source_id;
            event_node.node_type = "EventRecord";
            event_node.site_id = projected.site_id;
            event_node.source_group = projected.source_group;
            event_node.label = "EventRecord aggregate " + source_id;
            event_node.status = event_count > 0 ? "recorded" : "empty";
            event_node.source_id = source_id;
            event_node.published_view_ids = view_ids;
            event_node.event_record_count = event_count;
            event_node.source_health_status = health_status;
            event_node.client_impact = client_impact;
            event_node.viewer_safe_impact_summary =
                "EventRecord aggregate is counted only; payload and schema are unchanged.";
            event_node.refs = {"/ops/api/events/reviews", "EventRecord:" + source_id};
            nodes.push_back(std::move(event_node));

            OpsV370SiteImpactGraphNode client_node;
            client_node.node_id = "siteImpactGraph:clientImpact:" + source_id;
            client_node.node_type = "clientImpact";
            client_node.site_id = projected.site_id;
            client_node.source_group = projected.source_group;
            client_node.label = "Client impact " + source_id;
            client_node.status = client_impact;
            client_node.source_id = source_id;
            client_node.published_view_ids = view_ids;
            client_node.event_record_count = event_count;
            client_node.source_health_status = health_status;
            client_node.client_impact = client_impact;
            client_node.viewer_safe_impact_summary =
                view_ids.empty()
                    ? "No published client view is linked to this source."
                    : "Client impact is a viewer-safe PublishedView summary only.";
            client_node.refs = {"/client/api/views", "/ops/api/site-operations/impact-graph"};
            nodes.push_back(std::move(client_node));

            for (const auto& view_id : view_ids) {
                OpsV370SiteImpactGraphNode view_node;
                view_node.node_id = "siteImpactGraph:publishedView:" + view_id;
                view_node.node_type = "PublishedView";
                view_node.site_id = projected.site_id;
                view_node.source_group = projected.source_group;
                view_node.label = "PublishedView " + view_id;
                view_node.status = "view-linked";
                view_node.source_id = source_id;
                view_node.published_view_ids = {view_id};
                view_node.event_record_count = event_count;
                view_node.source_health_status = health_status;
                view_node.client_impact = client_impact;
                view_node.viewer_safe_impact_summary =
                    "PublishedView identity is linked without exposing source locator or credential material.";
                view_node.refs = {"/ops/api/views", "PublishedView:" + view_id};
                nodes.push_back(std::move(view_node));
            }
        }
    }
    return nodes;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17658 function
std::vector<OpsV370SiteImpactGraphEdge> BuildV370SiteImpactGraphEdges(
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection) {
    std::vector<OpsV370SiteImpactGraphEdge> edges;
    for (const auto& projected : projection) {
        const std::string site_node = "siteImpactGraph:site:" + projected.site_id;
        const std::string group_node =
            "siteImpactGraph:sourceGroup:" + projected.site_id + ":" + projected.source_group;
        edges.push_back({"siteImpactGraph:edge:site-sourceGroup:" + projected.site_id + ":" + projected.source_group,
                         site_node,
                         group_node,
                         "site-to-source-group",
                         projected.site_id,
                         projected.source_group,
                         "linked",
                         "Site node owns the source group impact scope."});
        for (const auto& source_id : projected.source_ids) {
            const std::string source_node = "siteImpactGraph:source:" + source_id;
            const std::string health_node = "siteImpactGraph:sourceHealth:" + source_id;
            const std::string event_node = "siteImpactGraph:eventRecord:" + source_id;
            const std::string client_node = "siteImpactGraph:clientImpact:" + source_id;
            edges.push_back({"siteImpactGraph:edge:sourceGroup-source:" + source_id,
                             group_node,
                             source_node,
                             "source-group-to-source",
                             projected.site_id,
                             projected.source_group,
                             "linked",
                             "Source group is linked to SourceRegistry identity."});
            edges.push_back({"siteImpactGraph:edge:source-health:" + source_id,
                             source_node,
                             health_node,
                             "source-to-source-health",
                             projected.site_id,
                             projected.source_group,
                             "linked",
                             "Source identity is linked to source health status."});
            edges.push_back({"siteImpactGraph:edge:event-source:" + source_id,
                             event_node,
                             source_node,
                             "event-record-to-source",
                             projected.site_id,
                             projected.source_group,
                             "aggregate",
                             "Recent EventRecord aggregate is linked by source/channel id."});
            edges.push_back({"siteImpactGraph:edge:source-client:" + source_id,
                             source_node,
                             client_node,
                             "source-to-client-impact",
                             projected.site_id,
                             projected.source_group,
                             "viewer-safe",
                             "Source impact is summarized for client impact without client payload changes."});
            edges.push_back({"siteImpactGraph:edge:health-client:" + source_id,
                             health_node,
                             client_node,
                             "source-health-to-client-impact",
                             projected.site_id,
                             projected.source_group,
                             "viewer-safe",
                             "Source health status informs viewer-safe client impact summary."});
            for (const auto& view_id : projected.view_ids) {
                const std::string view_node = "siteImpactGraph:publishedView:" + view_id;
                edges.push_back({"siteImpactGraph:edge:source-view:" + source_id + ":" + view_id,
                                 source_node,
                                 view_node,
                                 "source-to-published-view",
                                 projected.site_id,
                                 projected.source_group,
                                 "linked",
                                 "PublishedView identity is linked without exposing raw source material."});
                edges.push_back({"siteImpactGraph:edge:view-client:" + view_id,
                                 view_node,
                                 client_node,
                                 "published-view-to-client-impact",
                                 projected.site_id,
                                 projected.source_group,
                                 "viewer-safe",
                                 "PublishedView client impact remains a viewer-safe summary."});
            }
        }
    }
    return edges;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17742 function
OpsV370SiteImpactGraphSummary BuildV370SiteImpactGraphSummary(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV370SiteHealthRollupItem>& rollups,
    const std::vector<OpsV370SiteImpactGraphNode>& nodes,
    const std::vector<OpsV370SiteImpactGraphEdge>& edges) {
    OpsV370SiteImpactGraphSummary summary;
    std::vector<std::string> site_ids;
    summary.derivation_sources = {
        "BuildV350LiveOperationsGraphContext",
        "BuildV370SiteAwareSourceRegistryProjectionItems",
        "BuildV370SiteHealthRollupItems",
        "event_record_count_by_source",
        "published_view_ids_by_source",
        "source_health_status_by_source",
    };
    summary.source_count = static_cast<int>(context.sources.size());
    summary.published_view_count = static_cast<int>(context.views.size());
    summary.event_record_count = context.event_record_count;
    summary.source_health_count = static_cast<int>(context.health_by_source.size());
    summary.node_count = static_cast<int>(nodes.size());
    summary.edge_count = static_cast<int>(edges.size());
    for (const auto& rollup : rollups) {
        AddV370UniqueString(&site_ids, rollup.site_id);
        ++summary.source_group_count;
        if (rollup.rollup_state == "field-needed") {
            ++summary.field_needed_group_count;
        }
    }
    for (const auto& node : nodes) {
        if (node.node_type == "clientImpact") {
            ++summary.client_impact_count;
        }
    }
    summary.site_count = static_cast<int>(site_ids.size());
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17779 function
void AppendV370SiteImpactGraphSummaryJson(
    std::ostringstream& out,
    const OpsV370SiteImpactGraphSummary& summary) {
    out << "{"
        << "\"siteCount\":" << summary.site_count << ","
        << "\"sourceGroupCount\":" << summary.source_group_count << ","
        << "\"sourceCount\":" << summary.source_count << ","
        << "\"publishedViewCount\":" << summary.published_view_count << ","
        << "\"eventRecordCount\":" << summary.event_record_count << ","
        << "\"sourceHealthCount\":" << summary.source_health_count << ","
        << "\"clientImpactCount\":" << summary.client_impact_count << ","
        << "\"fieldNeededGroupCount\":" << summary.field_needed_group_count << ","
        << "\"nodeCount\":" << summary.node_count << ","
        << "\"edgeCount\":" << summary.edge_count << ","
        << "\"derivationSources\":";
    AppendJsonStringArray(out, summary.derivation_sources);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17798 function
void AppendV370SiteImpactGraphNodeJson(
    std::ostringstream& out,
    const OpsV370SiteImpactGraphNode& node) {
    out << "{"
        << "\"nodeId\":\"" << JsonEscape(node.node_id) << "\","
        << "\"nodeType\":\"" << JsonEscape(node.node_type) << "\","
        << "\"siteId\":\"" << JsonEscape(node.site_id) << "\","
        << "\"sourceGroup\":\"" << JsonEscape(node.source_group) << "\","
        << "\"label\":\"" << JsonEscape(node.label) << "\","
        << "\"status\":\"" << JsonEscape(node.status) << "\","
        << "\"sourceId\":\"" << JsonEscape(node.source_id) << "\","
        << "\"publishedViewIds\":";
    AppendJsonStringArray(out, node.published_view_ids);
    out << ",\"eventRecordCount\":" << node.event_record_count
        << ",\"sourceHealthStatus\":\"" << JsonEscape(node.source_health_status) << "\","
        << "\"clientImpact\":\"" << JsonEscape(node.client_impact) << "\","
        << "\"viewerSafeImpactSummary\":\"" << JsonEscape(node.viewer_safe_impact_summary) << "\","
        << "\"refs\":";
    AppendJsonStringArray(out, node.refs);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17820 function
void AppendV370SiteImpactGraphEdgeJson(
    std::ostringstream& out,
    const OpsV370SiteImpactGraphEdge& edge) {
    out << "{"
        << "\"edgeId\":\"" << JsonEscape(edge.edge_id) << "\","
        << "\"fromNodeId\":\"" << JsonEscape(edge.from_node_id) << "\","
        << "\"toNodeId\":\"" << JsonEscape(edge.to_node_id) << "\","
        << "\"edgeType\":\"" << JsonEscape(edge.edge_type) << "\","
        << "\"siteId\":\"" << JsonEscape(edge.site_id) << "\","
        << "\"sourceGroup\":\"" << JsonEscape(edge.source_group) << "\","
        << "\"status\":\"" << JsonEscape(edge.status) << "\","
        << "\"summary\":\"" << JsonEscape(edge.summary) << "\""
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17835 function
std::string OpsV370SiteImpactGraphJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v370-site-impact-graph.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto projection =
        BuildV370SiteAwareSourceRegistryProjectionItems(context.sources, context.views);
    const auto rollups =
        BuildV370SiteHealthRollupItems(context.sources, context.views, source_health_snapshot);
    const auto nodes = BuildV370SiteImpactGraphNodes(context, projection, rollups);
    const auto edges = BuildV370SiteImpactGraphEdges(projection);
    const auto summary = BuildV370SiteImpactGraphSummary(context, rollups, nodes, edges);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v370-site-impact-graph.v1\","
        << "\"status\":\"site-impact-graph\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"siteRegistryProjectionRoute\":\"/ops/api/site-operations/source-registry-projection\","
        << "\"siteHealthRollupRoute\":\"/ops/api/site-operations/health-rollup\","
        << "\"eventRecordRoute\":\"/ops/api/events/reviews\","
        << "\"publishedViewRoute\":\"/ops/api/views\","
        << "\"clientImpactRoute\":\"/client/api/views\","
        << "\"viewerSafeImpactSummary\":\"" << JsonEscape(context.viewer_safe_impact_summary) << "\","
        << "\"siteImpactGraphSummary\":";
    AppendV370SiteImpactGraphSummaryJson(out, summary);
    out << ",\"siteImpactGraphNodes\":[";
    for (std::size_t i = 0; i < nodes.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV370SiteImpactGraphNodeJson(out, nodes[i]);
    }
    out << "],\"siteImpactGraphEdges\":[";
    for (std::size_t i = 0; i < edges.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV370SiteImpactGraphEdgeJson(out, edges[i]);
    }
    out << "],\"readModelPolicy\":{"
        << "\"EventRecord\":\"linked-by-source-or-channel-id aggregate only\","
        << "\"sourceHealth\":\"site rollup status summary\","
        << "\"PublishedView\":\"identity refs only\","
        << "\"clientImpact\":\"viewer-safe summary only\","
        << "\"graphOnly\":true"
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"graphOnly\":true,"
        << "\"redacted\":true,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"rawDiagnosticJsonIncluded\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17933 function
std::vector<OpsV350CommandPlanCandidate> BuildV350CommandPlanCandidates(
    const OpsV350LiveOperationsGraphContext& context) {
    // live operations graph 입력에서 command 후보를 만들되 graph node id만 보존합니다.
    std::vector<OpsV350CommandPlanCandidate> commandPlanCandidates;
    for (const auto& source : context.sources) {
        const auto health_it = context.source_health_status_by_source.find(source.source_id);
        const std::string health_status =
            health_it == context.source_health_status_by_source.end() ? "unknown" : health_it->second;
        const auto view_it = context.published_view_ids_by_source.find(source.source_id);
        const bool has_published_view =
            view_it != context.published_view_ids_by_source.end() && !view_it->second.empty();
        const OpsV340RecoveryCandidatePackageItem* recovery =
            V350RecoveryCandidateForSource(context.recovery_candidates, source.source_id);
        const bool source_needs_attention =
            health_status != "live" || !source.enabled || !has_published_view ||
            (recovery != nullptr && recovery->recovery_readiness != "ready");

        commandPlanCandidates.push_back({"sourceHealthRecheck:" + source.source_id,
                                         "sourceRecheck",
                                         source.source_id,
                                         "not-selected",
                                         source_needs_attention ? "draft-blocked" : "draft-ready",
                                         "/ops/api/source-health",
                                         "sourceHealthRecheck candidate checks source health before any recovery or client notice action.",
                                         source_needs_attention ? "operator-approval-required"
                                                                : "not-blocked",
                                         {"source:" + source.source_id,
                                          "sourceHealth:" + source.source_id},
                                         true,
                                         true});
        commandPlanCandidates.push_back({"recoveryCandidatePackage:" + source.source_id,
                                         "recovery",
                                         source.source_id,
                                         "not-selected",
                                         recovery == nullptr || recovery->recovery_readiness == "blocked"
                                             ? "draft-blocked"
                                             : "draft-ready",
                                         "/ops/api/source-registry/recovery-candidate-package",
                                         "recoveryCandidatePackage candidate links continuity drill readiness to an operator-approved recovery draft.",
                                         recovery == nullptr ? "recovery-context-missing"
                                                             : "operator-approval-required",
                                         {"continuityDrill:" + source.source_id},
                                         true,
                                         true});
        commandPlanCandidates.push_back({"maintenance:" + source.source_id,
                                         "maintenance",
                                         source.source_id,
                                         "not-selected",
                                         source_needs_attention ? "draft-ready" : "draft-optional",
                                         "/ops/sources",
                                         "maintenance candidate keeps operational remediation in Ops-only review before execution.",
                                         "operator-approval-required",
                                         {"source:" + source.source_id,
                                          "clientImpact:" + source.source_id},
                                         true,
                                         true});
        commandPlanCandidates.push_back({"clientNoticeDraft:" + source.source_id,
                                         "clientNotice",
                                         source.source_id,
                                         "not-selected",
                                         has_published_view ? "draft-ready" : "draft-blocked",
                                         "/ops/api/live-operations/graph",
                                         "clientNoticeDraft candidate summarizes viewer-safe impact without sending a client notice.",
                                         has_published_view ? "operator-approval-required"
                                                            : "missing-published-view",
                                         {"clientImpact:" + source.source_id},
                                         true,
                                         true});
        commandPlanCandidates.push_back({"ruleFollowUpDraft:" + source.source_id,
                                         "ruleFollowUp",
                                         source.source_id,
                                         "not-selected",
                                         "draft-ready",
                                         "/ops/rules",
                                         "ruleFollowUpDraft candidate records rule follow-up review without applying rule changes.",
                                         "operator-approval-required",
                                         {"eventRecord:recent", "source:" + source.source_id},
                                         true,
                                         true});
        if (commandPlanCandidates.size() >= 40U) {
            break;
        }
    }
    return commandPlanCandidates;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18019 function
OpsV350CommandPlanSummary BuildV350CommandPlanSummary(
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates) {
    OpsV350CommandPlanSummary summary;
    summary.candidate_count = static_cast<int>(commandPlanCandidates.size());
    for (const auto& candidate : commandPlanCandidates) {
        if (candidate.draft_only) {
            ++summary.draft_count;
        }
        if (candidate.status.find("blocked") != std::string::npos ||
            candidate.operator_approval_required) {
            ++summary.blocked_count;
        }
        if (candidate.candidate_type == "sourceRecheck") {
            ++summary.source_recheck_count;
        } else if (candidate.candidate_type == "recovery") {
            ++summary.recovery_count;
        } else if (candidate.candidate_type == "maintenance") {
            ++summary.maintenance_count;
        } else if (candidate.candidate_type == "clientNotice") {
            ++summary.client_notice_count;
        } else if (candidate.candidate_type == "ruleFollowUp") {
            ++summary.rule_follow_up_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18046 function
void AppendV350CommandPlanCandidateJson(std::ostringstream& out,
                                        const OpsV350CommandPlanCandidate& candidate) {
    out << "{"
        << "\"candidateId\":\"" << JsonEscape(candidate.candidate_id) << "\","
        << "\"candidateType\":\"" << JsonEscape(candidate.candidate_type) << "\","
        << "\"sourceId\":\"" << JsonEscape(candidate.source_id) << "\","
        << "\"eventId\":\"" << JsonEscape(candidate.event_id) << "\","
        << "\"status\":\"" << JsonEscape(candidate.status) << "\","
        << "\"route\":\"" << JsonEscape(candidate.route) << "\","
        << "\"summary\":\"" << JsonEscape(candidate.summary) << "\","
        << "\"blockedReason\":\"" << JsonEscape(candidate.blocked_reason) << "\","
        << "\"draftOnly\":" << (candidate.draft_only ? "true" : "false") << ","
        << "\"operatorApprovalRequired\":"
        << (candidate.operator_approval_required ? "true" : "false") << ","
        << "\"relatedNodeIds\":";
    AppendV340RecoveryCandidateStringListJson(out, candidate.related_node_ids);
    out << ",\"sourceRecheckExecuted\":false,"
        << "\"recoveryExecuted\":false,"
        << "\"maintenanceStarted\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"ruleFollowUpApplied\":false"
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18070 function
void AppendV350CommandPlanSummaryJson(std::ostringstream& out,
                                      const OpsV350CommandPlanSummary& summary) {
    out << "{"
        << "\"candidateCount\":" << summary.candidate_count << ","
        << "\"draftCount\":" << summary.draft_count << ","
        << "\"blockedCount\":" << summary.blocked_count << ","
        << "\"sourceRecheckCount\":" << summary.source_recheck_count << ","
        << "\"recoveryCount\":" << summary.recovery_count << ","
        << "\"maintenanceCount\":" << summary.maintenance_count << ","
        << "\"clientNoticeCount\":" << summary.client_notice_count << ","
        << "\"ruleFollowUpCount\":" << summary.rule_follow_up_count
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18084 function
std::string OpsV350CommandPlanJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v350-command-plan.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto summary = BuildV350CommandPlanSummary(commandPlanCandidates);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v350-command-plan.v1\","
        << "\"status\":\"operations-command-plan\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"graphRoute\":\"/ops/api/live-operations/graph\","
        << "\"commandPlanSummary\":";
    AppendV350CommandPlanSummaryJson(out, summary);
    out << ",\"commandPlanCandidates\":[";
    for (std::size_t i = 0; i < commandPlanCandidates.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV350CommandPlanCandidateJson(out, commandPlanCandidates[i]);
    }
    out << "],\"contractPolicy\":{"
        << "\"sourceRecheck\":\"draft-only\","
        << "\"recovery\":\"draft-only\","
        << "\"maintenance\":\"draft-only\","
        << "\"clientNotice\":\"draft-only\","
        << "\"ruleFollowUp\":\"draft-only\""
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"draftOnly\":true,"
        << "\"operatorApprovalRequired\":true,"
        << "\"sourceRecheckExecuted\":false,"
        << "\"recoveryExecuted\":false,"
        << "\"maintenanceStarted\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"ruleFollowUpApplied\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18158 function
OpsV350IncidentCommandHandoff BuildV350IncidentCommandHandoff(
    const std::string& event_json,
    const std::string& incident_event_id,
    const std::string& source_id,
    const std::string& source_cause_category,
    const std::string& source_cause_summary,
    bool source_recheck_required,
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates) {
    // incident source correlation과 command/recovery context를 읽기 전용 handoff로 묶습니다.
    // sourceRecheck, recovery, maintenance, clientNotice, ruleFollowUp action은 실행하지 않습니다.
    OpsV350IncidentCommandHandoff handoff;
    handoff.event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
    if (handoff.event_id.empty()) {
        handoff.event_id = incident_event_id;
    }
    handoff.source_id = source_id;
    handoff.source_cause = source_cause_category;
    handoff.source_cause_evidence = source_cause_summary;
    handoff.continuity_drill_candidate =
        source_recheck_required ? "continuity-drill-review-required"
                                : "continuity-drill-ready";
    handoff.command_plan_draft = "/ops/api/live-operations/command-plan";
    handoff.handoff_readiness =
        source_recheck_required ? "blocked" : "ready";
    handoff.operator_next_action =
        source_recheck_required
            ? "Open command plan draft, run source recheck, then choose recovery or maintenance follow-up."
            : "Confirm source cause and close the handoff without executing a command plan.";
    for (const auto& candidate : commandPlanCandidates) {
        if (candidate.source_id == handoff.source_id &&
            (candidate.candidate_type == "sourceRecheck" ||
             candidate.candidate_type == "recovery" ||
             candidate.candidate_type == "maintenance" ||
             candidate.candidate_type == "clientNotice" ||
             candidate.candidate_type == "ruleFollowUp")) {
            handoff.command_plan_candidate_ids.push_back(candidate.candidate_id);
        }
        if (handoff.command_plan_candidate_ids.size() >= 8U) {
            break;
        }
    }
    return handoff;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18202 function
void AppendV350IncidentCommandHandoffJson(std::ostringstream& out,
                                          const OpsV350IncidentCommandHandoff& handoff) {
    out << "{"
        << "\"schema\":\"media-server.ops.v350-incident-command-handoff.v1\","
        << "\"eventId\":\"" << JsonEscape(handoff.event_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(handoff.source_id) << "\","
        << "\"sourceCause\":\"" << JsonEscape(handoff.source_cause) << "\","
        << "\"sourceCauseEvidence\":\"" << JsonEscape(handoff.source_cause_evidence) << "\","
        << "\"continuityDrillCandidate\":\""
        << JsonEscape(handoff.continuity_drill_candidate) << "\","
        << "\"commandPlanDraft\":\"" << JsonEscape(handoff.command_plan_draft) << "\","
        << "\"commandPlanCandidateIds\":";
    AppendV340RecoveryCandidateStringListJson(out, handoff.command_plan_candidate_ids);
    out << ",\"handoffReadiness\":\"" << JsonEscape(handoff.handoff_readiness) << "\","
        << "\"operatorNextAction\":\"" << JsonEscape(handoff.operator_next_action) << "\","
        << "\"graphRoute\":\"/ops/api/live-operations/graph\","
        << "\"commandPlanRoute\":\"/ops/api/live-operations/command-plan\","
        << "\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"draftOnly\":true,"
        << "\"operatorApprovalRequired\":true,"
        << "\"commandPlanExecuted\":false,"
        << "\"sourceRecheckExecuted\":false,"
        << "\"recoveryExecuted\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"ruleFollowUpApplied\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"rawDiagnosticJsonIncluded\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18248 function
std::string OpsV350IncidentCommandHandoffSummaryJson(
    const std::vector<OpsV350IncidentCommandHandoff>& handoffs) {
    int ready = 0;
    int blocked = 0;
    int candidate_links = 0;
    for (const auto& handoff : handoffs) {
        if (handoff.handoff_readiness == "ready") {
            ++ready;
        } else {
            ++blocked;
        }
        candidate_links += static_cast<int>(handoff.command_plan_candidate_ids.size());
    }
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.v350-incident-command-handoff.v1\","
        << "\"status\":\"incident-command-handoff\","
        << "\"itemCount\":" << handoffs.size() << ","
        << "\"readyCount\":" << ready << ","
        << "\"blockedCount\":" << blocked << ","
        << "\"commandPlanCandidateLinkCount\":" << candidate_links << ","
        << "\"commandPlanRoute\":\"/ops/api/live-operations/command-plan\","
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"viewerClientExposureAdded\":false"
        << "}";
    return out.str();
}




// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18311 function
std::vector<OpsV350StagedChangePlan> BuildV350StagedChangePlans(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates) {
    // graph context와 command 후보를 beforeApply staging preview로 투영합니다.
    // 승인, 차단, 영향, 변경 후보 필드는 read-only 상태를 유지합니다.
    std::vector<OpsV350StagedChangePlan> stagedChangePlans;
    for (const auto& candidate : commandPlanCandidates) {
        if (candidate.candidate_type != "sourceRecheck" &&
            candidate.candidate_type != "recovery" &&
            candidate.candidate_type != "ruleFollowUp") {
            continue;
        }
        const auto view_it = context.published_view_ids_by_source.find(candidate.source_id);
        const int view_count =
            view_it == context.published_view_ids_by_source.end()
                ? 0
                : static_cast<int>(view_it->second.size());
        OpsV350StagedChangePlan plan;
        plan.plan_id = "staged:" + candidate.candidate_id;
        plan.candidate_type = candidate.candidate_type;
        plan.source_id = candidate.source_id;
        plan.status = "staged-not-applied";
        plan.source_change_candidate =
            candidate.candidate_type == "sourceRecheck" ||
                    candidate.candidate_type == "recovery"
                ? "sourceChangeCandidate"
                : "not-required";
        plan.published_view_change_candidate =
            view_count > 0 ? "publishedViewChangeCandidate" : "not-required";
        plan.rule_follow_up_change_candidate =
            candidate.candidate_type == "ruleFollowUp" ? "ruleFollowUpChangeCandidate"
                                                       : "not-required";
        plan.impact_preview.affected_source_count = candidate.source_id.empty() ? 0 : 1;
        plan.impact_preview.affected_published_view_count = view_count;
        plan.impact_preview.affected_rule_follow_up_count =
            candidate.candidate_type == "ruleFollowUp" ? 1 : 0;
        plan.impact_preview.client_impact =
            view_count > 0 ? "clientImpact viewer-safe summary only" : "no clientImpact";
        plan.impact_preview.summary =
            "beforeApply impactPreview is staging-only/read-only and requires operator approval.";
        plan.blockers.push_back(candidate.blocked_reason.empty()
                                    ? "operator-approval-required"
                                    : candidate.blocked_reason);
        if (view_count == 0) {
            plan.blockers.push_back("missing-published-view");
        }
        stagedChangePlans.push_back(std::move(plan));
        if (stagedChangePlans.size() >= 24U) {
            break;
        }
    }
    return stagedChangePlans;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18365 function
OpsV350StagedChangePlanSummary BuildV350StagedChangePlanSummary(
    const std::vector<OpsV350StagedChangePlan>& stagedChangePlans) {
    OpsV350StagedChangePlanSummary summary;
    summary.plan_count = static_cast<int>(stagedChangePlans.size());
    for (const auto& plan : stagedChangePlans) {
        if (plan.apply_blocked || !plan.blockers.empty()) {
            ++summary.blocked_count;
        }
        if (plan.source_change_candidate == "sourceChangeCandidate") {
            ++summary.source_change_candidate_count;
        }
        if (plan.published_view_change_candidate == "publishedViewChangeCandidate") {
            ++summary.published_view_change_candidate_count;
        }
        if (plan.rule_follow_up_change_candidate == "ruleFollowUpChangeCandidate") {
            ++summary.rule_follow_up_change_candidate_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18386 function
void AppendV350ImpactPreviewJson(std::ostringstream& out,
                                 const OpsV350ImpactPreview& impactPreview) {
    out << "{"
        << "\"affectedSourceCount\":" << impactPreview.affected_source_count << ","
        << "\"affectedPublishedViewCount\":"
        << impactPreview.affected_published_view_count << ","
        << "\"affectedRuleFollowUpCount\":"
        << impactPreview.affected_rule_follow_up_count << ","
        << "\"clientImpact\":\"" << JsonEscape(impactPreview.client_impact) << "\","
        << "\"beforeApply\":\"" << JsonEscape(impactPreview.before_apply) << "\","
        << "\"summary\":\"" << JsonEscape(impactPreview.summary) << "\""
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18400 function
void AppendV350StagedChangePlanJson(std::ostringstream& out,
                                    const OpsV350StagedChangePlan& plan) {
    out << "{"
        << "\"planId\":\"" << JsonEscape(plan.plan_id) << "\","
        << "\"candidateType\":\"" << JsonEscape(plan.candidate_type) << "\","
        << "\"sourceId\":\"" << JsonEscape(plan.source_id) << "\","
        << "\"status\":\"" << JsonEscape(plan.status) << "\","
        << "\"sourceChangeCandidate\":\"" << JsonEscape(plan.source_change_candidate) << "\","
        << "\"publishedViewChangeCandidate\":\""
        << JsonEscape(plan.published_view_change_candidate) << "\","
        << "\"ruleFollowUpChangeCandidate\":\""
        << JsonEscape(plan.rule_follow_up_change_candidate) << "\","
        << "\"impactPreview\":";
    AppendV350ImpactPreviewJson(out, plan.impact_preview);
    out << ",\"blockers\":";
    AppendV340RecoveryCandidateStringListJson(out, plan.blockers);
    out << ",\"stagingOnly\":" << (plan.staging_only ? "true" : "false") << ","
        << "\"applyBlocked\":" << (plan.apply_blocked ? "true" : "false") << ","
        << "\"sourceChangeApplied\":false,"
        << "\"publishedViewChangeApplied\":false,"
        << "\"ruleFollowUpApplied\":false,"
        << "\"commandPlanExecuted\":false"
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18425 function
void AppendV350StagedChangePlanSummaryJson(
    std::ostringstream& out,
    const OpsV350StagedChangePlanSummary& summary) {
    out << "{"
        << "\"planCount\":" << summary.plan_count << ","
        << "\"blockedCount\":" << summary.blocked_count << ","
        << "\"sourceChangeCandidateCount\":" << summary.source_change_candidate_count << ","
        << "\"publishedViewChangeCandidateCount\":"
        << summary.published_view_change_candidate_count << ","
        << "\"ruleFollowUpChangeCandidateCount\":"
        << summary.rule_follow_up_change_candidate_count
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18439 function
std::string OpsV350StagedChangePlanImpactPreviewJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v350-staged-change-plan-impact-preview.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans =
        BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto summary = BuildV350StagedChangePlanSummary(stagedChangePlans);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v350-staged-change-plan-impact-preview.v1\","
        << "\"status\":\"staged-change-plan-impact-preview\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"commandPlanRoute\":\"/ops/api/live-operations/command-plan\","
        << "\"stagedChangePlanSummary\":";
    AppendV350StagedChangePlanSummaryJson(out, summary);
    out << ",\"stagedChangePlans\":[";
    for (std::size_t i = 0; i < stagedChangePlans.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV350StagedChangePlanJson(out, stagedChangePlans[i]);
    }
    out << "],\"impactPreview\":{"
        << "\"beforeApply\":\"beforeApply\","
        << "\"stagingOnly\":true,"
        << "\"summary\":\"source/view/rule follow-up candidates are previewed before apply\""
        << "},\"blockers\":[\"operator-approval-required\",\"apply-route-not-present\"],"
        << "\"contractPolicy\":{"
        << "\"sourceChangeCandidate\":\"staging-only\","
        << "\"publishedViewChangeCandidate\":\"staging-only\","
        << "\"ruleFollowUpChangeCandidate\":\"staging-only\""
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"stagingOnly\":true,"
        << "\"applyBlocked\":true,"
        << "\"sourceChangeApplied\":false,"
        << "\"publishedViewChangeApplied\":false,"
        << "\"ruleFollowUpApplied\":false,"
        << "\"commandPlanExecuted\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"rawDiagnosticJsonIncluded\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18531 function
const OpsV350CommandPlanCandidate* V350CommandCandidateForStagedPlan(
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates,
    const OpsV350StagedChangePlan& plan) {
    const std::string expected_plan_id_prefix = "staged:";
    std::string candidate_id = plan.plan_id;
    if (candidate_id.rfind(expected_plan_id_prefix, 0) == 0) {
        candidate_id = candidate_id.substr(expected_plan_id_prefix.size());
    }
    for (const auto& candidate : commandPlanCandidates) {
        if (candidate.candidate_id == candidate_id) {
            return &candidate;
        }
    }
    for (const auto& candidate : commandPlanCandidates) {
        if (candidate.source_id == plan.source_id &&
            candidate.candidate_type == plan.candidate_type) {
            return &candidate;
        }
    }
    return nullptr;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18553 function
std::vector<OpsV350DrillRunLedgerEntry> BuildV350DrillRunLedgerEntries(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates,
    const std::vector<OpsV350StagedChangePlan>& stagedChangePlans) {
    // graph, command, staged plan을 append-only ledger projection으로 합칩니다.
    // operator-note-required 값은 표시만 하고 저장하지 않습니다.
    (void)context;
    std::vector<OpsV350DrillRunLedgerEntry> ledgerEntries;
    int source_run_index = 0;
    for (const auto& plan : stagedChangePlans) {
        const OpsV350CommandPlanCandidate* candidate =
            V350CommandCandidateForStagedPlan(commandPlanCandidates, plan);
        const std::string source_key = plan.source_id.empty() ? "unknown-source" : plan.source_id;
        const std::string previous_run_id =
            "drill-run:" + source_key + ":previous-" + std::to_string(source_run_index + 1);
        const std::string current_run_id =
            "drill-run:" + source_key + ":current-" + std::to_string(source_run_index + 1);

        OpsV350DrillRunLedgerEntry previous;
        previous.drill_run_id = previous_run_id;
        previous.source_id = source_key;
        previous.staged_plan_id = plan.plan_id;
        previous.command_plan_candidate_id = candidate == nullptr ? "" : candidate->candidate_id;
        previous.status = "previous-observed";
        previous.operator_note = "previous operator note retained for planComparison";
        previous.blocker = "previous-blocker-observed";
        previous.evidence_refs = {
            "/ops/api/source-registry/continuity-drill/contract",
            "/ops/api/live-operations/graph",
        };
        previous.plan_comparison = "previous run baseline for comparedToRunId";
        previous.diff_from_previous_run = "baseline previous run";
        previous.changed_fields = {"baseline"};
        previous.accumulated_run_count = 1;
        ledgerEntries.push_back(std::move(previous));

        OpsV350DrillRunLedgerEntry current;
        current.drill_run_id = current_run_id;
        current.source_id = source_key;
        current.staged_plan_id = plan.plan_id;
        current.command_plan_candidate_id = candidate == nullptr ? "" : candidate->candidate_id;
        current.status = plan.apply_blocked ? "blocked" : "ready";
        current.operator_note =
            "operator-note-required before command plan execution; review blocker and evidence refs";
        current.blocker = plan.blockers.empty()
                              ? "operator-approval-required"
                              : JoinV340ApprovalRecoveryStrings(plan.blockers, ", ");
        current.evidence_refs = {
            "/ops/api/live-operations/graph",
            "/ops/api/live-operations/command-plan",
            "/ops/api/live-operations/staged-change-plan-impact-preview",
            plan.plan_id,
        };
        if (candidate != nullptr) {
            current.evidence_refs.push_back(candidate->candidate_id);
        }
        current.previous_run_id = previous_run_id;
        current.compared_to_run_id = previous_run_id;
        current.plan_comparison =
            "planComparison compares staged plan blockers and evidence refs to previous run";
        current.diff_from_previous_run =
            "blockerDelta=" + current.blocker + "; evidenceRefDelta=graph/command/staged refs";
        current.changed_fields = {"blockerDelta", "evidenceRefDelta", "planComparison"};
        current.accumulated_run_count = 2;
        ledgerEntries.push_back(std::move(current));

        ++source_run_index;
        if (ledgerEntries.size() >= 24U) {
            break;
        }
    }
    if (ledgerEntries.empty()) {
        OpsV350DrillRunLedgerEntry empty;
        empty.drill_run_id = "drill-run:pending:current-1";
        empty.source_id = "pending-source";
        empty.status = "not-run";
        empty.operator_note = "operator-note-required after a staged drill plan is available";
        empty.blocker = "missing-staged-plan";
        empty.evidence_refs = {"/ops/api/live-operations/graph", "/ops/api/live-operations/command-plan"};
        empty.plan_comparison = "planComparison pending because no staged plan exists";
        empty.diff_from_previous_run = "no previous run to compare";
        empty.changed_fields = {"missingStagedPlan"};
        ledgerEntries.push_back(std::move(empty));
    }
    return ledgerEntries;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18640 function
OpsV350DrillRunLedgerSummary BuildV350DrillRunLedgerSummary(
    const std::vector<OpsV350DrillRunLedgerEntry>& ledgerEntries) {
    OpsV350DrillRunLedgerSummary summary;
    summary.run_count = static_cast<int>(ledgerEntries.size());
    for (const auto& entry : ledgerEntries) {
        if (!entry.blocker.empty() && entry.blocker != "none") {
            ++summary.blocked_count;
        }
        summary.evidence_ref_count += static_cast<int>(entry.evidence_refs.size());
        if (!entry.previous_run_id.empty() || !entry.compared_to_run_id.empty()) {
            ++summary.comparison_count;
        }
        summary.changed_field_count += static_cast<int>(entry.changed_fields.size());
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18657 function
void AppendV350DrillRunLedgerSummaryJson(
    std::ostringstream& out,
    const OpsV350DrillRunLedgerSummary& summary) {
    out << "{"
        << "\"runCount\":" << summary.run_count << ","
        << "\"blockedCount\":" << summary.blocked_count << ","
        << "\"evidenceRefCount\":" << summary.evidence_ref_count << ","
        << "\"comparisonCount\":" << summary.comparison_count << ","
        << "\"changedFieldCount\":" << summary.changed_field_count
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18669 function
void AppendV350DrillRunLedgerEntryJson(
    std::ostringstream& out,
    const OpsV350DrillRunLedgerEntry& entry) {
    out << "{"
        << "\"drillRunId\":\"" << JsonEscape(entry.drill_run_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(entry.source_id) << "\","
        << "\"stagedPlanId\":\"" << JsonEscape(entry.staged_plan_id) << "\","
        << "\"commandPlanCandidateId\":\""
        << JsonEscape(entry.command_plan_candidate_id) << "\","
        << "\"status\":\"" << JsonEscape(entry.status) << "\","
        << "\"operatorNote\":\"" << JsonEscape(entry.operator_note) << "\","
        << "\"blocker\":\"" << JsonEscape(entry.blocker) << "\","
        << "\"evidenceRefs\":";
    AppendV340RecoveryCandidateStringListJson(out, entry.evidence_refs);
    out << ",\"previousRunId\":\"" << JsonEscape(entry.previous_run_id) << "\","
        << "\"comparedToRunId\":\"" << JsonEscape(entry.compared_to_run_id) << "\","
        << "\"planComparison\":\"" << JsonEscape(entry.plan_comparison) << "\","
        << "\"diffFromPreviousRun\":\""
        << JsonEscape(entry.diff_from_previous_run) << "\","
        << "\"changedFields\":";
    AppendV340RecoveryCandidateStringListJson(out, entry.changed_fields);
    out << ",\"accumulatedRunCount\":" << entry.accumulated_run_count << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18693 function
std::string OpsV350DrillRunLedgerPlanComparisonJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v350-drill-run-ledger.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans =
        BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto ledgerEntries =
        BuildV350DrillRunLedgerEntries(context, commandPlanCandidates, stagedChangePlans);
    const auto summary = BuildV350DrillRunLedgerSummary(ledgerEntries);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v350-drill-run-ledger.v1\","
        << "\"status\":\"drill-run-ledger-plan-comparison\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"graphRoute\":\"/ops/api/live-operations/graph\","
        << "\"commandPlanRoute\":\"/ops/api/live-operations/command-plan\","
        << "\"stagedPlanRoute\":\"/ops/api/live-operations/staged-change-plan-impact-preview\","
        << "\"drillRunLedgerSummary\":";
    AppendV350DrillRunLedgerSummaryJson(out, summary);
    out << ",\"drillRunLedgerEntries\":[";
    for (std::size_t i = 0; i < ledgerEntries.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV350DrillRunLedgerEntryJson(out, ledgerEntries[i]);
    }
    out << "],\"planComparison\":{"
        << "\"mode\":\"previous-run-diff\","
        << "\"previousRunIdField\":\"previousRunId\","
        << "\"comparedToRunIdField\":\"comparedToRunId\","
        << "\"diffFields\":[\"blockerDelta\",\"evidenceRefDelta\",\"planComparison\"]"
        << "},\"contractPolicy\":{"
        << "\"appendOnlyLedgerProjection\":true,"
        << "\"operatorNote\":\"display-only-not-persisted\","
        << "\"blocker\":\"derived-from-staged-plan\","
        << "\"evidenceRefs\":\"redacted-route-and-plan-ids-only\""
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"appendOnlyLedgerProjection\":true,"
        << "\"drillRunWritePerformed\":false,"
        << "\"operatorNoteWritePerformed\":false,"
        << "\"commandPlanExecuted\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"rawDiagnosticJsonIncluded\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}




// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18795 function
std::vector<std::string> FirstV350CommandPlanRefs(
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates) {
    std::vector<std::string> refs;
    for (const auto& candidate : commandPlanCandidates) {
        refs.push_back(candidate.candidate_id);
        if (refs.size() >= 8U) {
            break;
        }
    }
    if (refs.empty()) {
        refs.push_back("/ops/api/live-operations/command-plan");
    }
    return refs;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18810 function
std::vector<std::string> FirstV350DrillLedgerRefs(
    const std::vector<OpsV350DrillRunLedgerEntry>& ledgerEntries) {
    std::vector<std::string> refs;
    for (const auto& entry : ledgerEntries) {
        refs.push_back(entry.drill_run_id);
        if (refs.size() >= 8U) {
            break;
        }
    }
    if (refs.empty()) {
        refs.push_back("/ops/api/live-operations/drill-run-ledger");
    }
    return refs;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18825 function
std::vector<std::string> V350FieldEvidenceRefs(
    const std::vector<OpsV340FieldBridgeConditionGate>& fieldBridgeConditionGates) {
    std::vector<std::string> refs;
    for (const auto& gate : fieldBridgeConditionGates) {
        refs.push_back(gate.gate_key + ":" + gate.execution_status);
    }
    if (refs.empty()) {
        refs.push_back("/ops/api/source-registry/field-bridge-condition-gates");
    }
    return refs;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18837 function
std::vector<std::string> V350ClientImpactForecastRefs(
    const OpsV350LiveOperationsGraphContext& context) {
    std::vector<std::string> refs;
    for (const auto& view : context.views) {
        refs.push_back("clientImpactForecast:" + view.view_id);
        if (refs.size() >= 8U) {
            break;
        }
    }
    if (refs.empty()) {
        for (const auto& source : context.sources) {
            refs.push_back("clientImpactForecast:source:" + source.source_id);
            if (refs.size() >= 8U) {
                break;
            }
        }
    }
    if (refs.empty()) {
        refs.push_back("/client/api/views");
    }
    return refs;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18860 function
std::vector<OpsV350OperationsExportBundleItem> BuildV350OperationsExportBundleItems(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates,
    const std::vector<OpsV350DrillRunLedgerEntry>& ledgerEntries,
    const std::vector<OpsV340FieldBridgeConditionGate>& fieldBridgeConditionGates) {
    const auto command_plan_refs = FirstV350CommandPlanRefs(commandPlanCandidates);
    const auto drill_ledger_refs = FirstV350DrillLedgerRefs(ledgerEntries);
    const auto field_evidence_refs = V350FieldEvidenceRefs(fieldBridgeConditionGates);
    const auto client_impact_refs = V350ClientImpactForecastRefs(context);

    std::vector<OpsV350OperationsExportBundleItem> items;
    OpsV350OperationsExportBundleItem command_plan_item;
    command_plan_item.bundle_item_id = "bundle:command-plan";
    command_plan_item.item_type = "command-plan";
    command_plan_item.label = "Command Plan refs";
    command_plan_item.route = "/ops/api/live-operations/command-plan";
    command_plan_item.summary =
        "release-safe commandPlanRefs only; command plan execution is not performed";
    command_plan_item.command_plan_refs = command_plan_refs;
    command_plan_item.evidence_refs = {"/ops/api/live-operations/graph",
                                       "/ops/api/live-operations/command-plan"};
    items.push_back(std::move(command_plan_item));

    OpsV350OperationsExportBundleItem drill_ledger_item;
    drill_ledger_item.bundle_item_id = "bundle:drill-ledger";
    drill_ledger_item.item_type = "drill-ledger";
    drill_ledger_item.label = "Drill Ledger refs";
    drill_ledger_item.route = "/ops/api/live-operations/drill-run-ledger";
    drill_ledger_item.summary =
        "drillLedgerRefs include run ids and evidence refs without creating a run";
    drill_ledger_item.command_plan_refs = command_plan_refs;
    drill_ledger_item.drill_ledger_refs = drill_ledger_refs;
    drill_ledger_item.evidence_refs = {"/ops/api/live-operations/drill-run-ledger"};
    items.push_back(std::move(drill_ledger_item));

    OpsV350OperationsExportBundleItem field_evidence_item;
    field_evidence_item.bundle_item_id = "bundle:field-evidence";
    field_evidence_item.item_type = "field-evidence";
    field_evidence_item.label = "Field Evidence refs";
    field_evidence_item.status = "condition-gated";
    field_evidence_item.route = "/ops/api/source-registry/field-bridge-condition-gates";
    field_evidence_item.summary =
        "fieldEvidenceRefs are redacted condition gate keys; field smoke remains not-run";
    field_evidence_item.blocked_reason = "field-smoke-conditions-not-run";
    field_evidence_item.command_plan_refs = command_plan_refs;
    field_evidence_item.drill_ledger_refs = drill_ledger_refs;
    field_evidence_item.field_evidence_refs = field_evidence_refs;
    field_evidence_item.evidence_refs = {"/ops/api/source-registry/field-bridge-condition-gates"};
    items.push_back(std::move(field_evidence_item));

    OpsV350OperationsExportBundleItem client_impact_item;
    client_impact_item.bundle_item_id = "bundle:client-impact-forecast";
    client_impact_item.item_type = "client-impact-forecast";
    client_impact_item.label = "Client Impact Forecast refs";
    client_impact_item.route = "/client/api/views";
    client_impact_item.summary =
        "clientImpactForecastRefs point to viewer-safe digest projections only";
    client_impact_item.command_plan_refs = command_plan_refs;
    client_impact_item.drill_ledger_refs = drill_ledger_refs;
    client_impact_item.client_impact_forecast_refs = client_impact_refs;
    client_impact_item.evidence_refs = {"/client/api/views",
                                        "/client/api/views/{id}/events"};
    items.push_back(std::move(client_impact_item));

    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18927 function
std::vector<OpsV350HandoffMapEntry> BuildV350OperationsHandoffMapEntries(
    const std::vector<OpsV350OperationsExportBundleItem>& items) {
    std::vector<OpsV350HandoffMapEntry> entries;
    if (items.size() < 2U) {
        return entries;
    }
    const auto find_id = [&](const std::string& item_type) -> std::string {
        for (const auto& item : items) {
            if (item.item_type == item_type) {
                return item.bundle_item_id;
            }
        }
        return "";
    };

    const std::string command_plan_id = find_id("command-plan");
    const std::string drill_ledger_id = find_id("drill-ledger");
    const std::string field_evidence_id = find_id("field-evidence");
    const std::string client_impact_id = find_id("client-impact-forecast");

    if (!command_plan_id.empty() && !drill_ledger_id.empty()) {
        entries.push_back({"handoff:command-plan:drill-ledger",
                           command_plan_id,
                           drill_ledger_id,
                           "operator-review-required",
                           "ops-operator",
                           "operator-note-required",
                           {"/ops/api/live-operations/command-plan",
                            "/ops/api/live-operations/drill-run-ledger"},
                           true});
    }
    if (!drill_ledger_id.empty() && !field_evidence_id.empty()) {
        entries.push_back({"handoff:drill-ledger:field-evidence",
                           drill_ledger_id,
                           field_evidence_id,
                           "blocked",
                           "field-operator",
                           "field-smoke-conditions-not-run",
                           {"/ops/api/live-operations/drill-run-ledger",
                            "/ops/api/source-registry/field-bridge-condition-gates"},
                           true});
    }
    if (!command_plan_id.empty() && !client_impact_id.empty()) {
        entries.push_back({"handoff:command-plan:client-impact-forecast",
                           command_plan_id,
                           client_impact_id,
                           "viewer-safe-review",
                           "client-ops-reviewer",
                           "client-notice-not-sent",
                           {"/ops/api/live-operations/command-plan",
                            "/client/api/views",
                            "/client/api/views/{id}/events"},
                           true});
    }
    return entries;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18984 function
OpsV350OperationsExportBundleSummary BuildV350OperationsExportBundleSummary(
    const std::vector<OpsV350OperationsExportBundleItem>& items,
    const std::vector<OpsV350HandoffMapEntry>& handoffMapEntries) {
    OpsV350OperationsExportBundleSummary summary;
    summary.bundle_item_count = static_cast<int>(items.size());
    summary.handoff_entry_count = static_cast<int>(handoffMapEntries.size());
    for (const auto& item : items) {
        if (item.release_safe) {
            ++summary.release_safe_count;
        }
        if (!item.blocked_reason.empty() && item.blocked_reason != "not-blocked") {
            ++summary.blocked_count;
        }
        summary.command_plan_ref_count += static_cast<int>(item.command_plan_refs.size());
        summary.drill_ledger_ref_count += static_cast<int>(item.drill_ledger_refs.size());
        summary.field_evidence_ref_count += static_cast<int>(item.field_evidence_refs.size());
        summary.client_impact_forecast_ref_count +=
            static_cast<int>(item.client_impact_forecast_refs.size());
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19006 function
void AppendV350OperationsExportBundleItemJson(
    std::ostringstream& out,
    const OpsV350OperationsExportBundleItem& item) {
    out << "{"
        << "\"bundleItemId\":\"" << JsonEscape(item.bundle_item_id) << "\","
        << "\"itemType\":\"" << JsonEscape(item.item_type) << "\","
        << "\"label\":\"" << JsonEscape(item.label) << "\","
        << "\"status\":\"" << JsonEscape(item.status) << "\","
        << "\"route\":\"" << JsonEscape(item.route) << "\","
        << "\"summary\":\"" << JsonEscape(item.summary) << "\","
        << "\"blockedReason\":\"" << JsonEscape(item.blocked_reason) << "\","
        << "\"releaseSafe\":" << (item.release_safe ? "true" : "false") << ","
        << "\"commandPlanRefs\":";
    AppendV340RecoveryCandidateStringListJson(out, item.command_plan_refs);
    out << ",\"drillLedgerRefs\":";
    AppendV340RecoveryCandidateStringListJson(out, item.drill_ledger_refs);
    out << ",\"fieldEvidenceRefs\":";
    AppendV340RecoveryCandidateStringListJson(out, item.field_evidence_refs);
    out << ",\"clientImpactForecastRefs\":";
    AppendV340RecoveryCandidateStringListJson(out, item.client_impact_forecast_refs);
    out << ",\"evidenceRefs\":";
    AppendV340RecoveryCandidateStringListJson(out, item.evidence_refs);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19031 function
void AppendV350OperationsHandoffMapEntryJson(
    std::ostringstream& out,
    const OpsV350HandoffMapEntry& entry) {
    out << "{"
        << "\"handoffEntryId\":\"" << JsonEscape(entry.handoff_entry_id) << "\","
        << "\"fromBundleItemId\":\"" << JsonEscape(entry.from_bundle_item_id) << "\","
        << "\"toBundleItemId\":\"" << JsonEscape(entry.to_bundle_item_id) << "\","
        << "\"handoffStatus\":\"" << JsonEscape(entry.handoff_status) << "\","
        << "\"nextOperatorRole\":\"" << JsonEscape(entry.next_operator_role) << "\","
        << "\"blockedReason\":\"" << JsonEscape(entry.blocked_reason) << "\","
        << "\"releaseSafe\":" << (entry.release_safe ? "true" : "false") << ","
        << "\"evidenceRefs\":";
    AppendV340RecoveryCandidateStringListJson(out, entry.evidence_refs);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19047 function
void AppendV350OperationsExportBundleSummaryJson(
    std::ostringstream& out,
    const OpsV350OperationsExportBundleSummary& summary) {
    out << "{"
        << "\"bundleItemCount\":" << summary.bundle_item_count << ","
        << "\"releaseSafeCount\":" << summary.release_safe_count << ","
        << "\"handoffEntryCount\":" << summary.handoff_entry_count << ","
        << "\"commandPlanRefCount\":" << summary.command_plan_ref_count << ","
        << "\"drillLedgerRefCount\":" << summary.drill_ledger_ref_count << ","
        << "\"fieldEvidenceRefCount\":" << summary.field_evidence_ref_count << ","
        << "\"clientImpactForecastRefCount\":"
        << summary.client_impact_forecast_ref_count << ","
        << "\"blockedCount\":" << summary.blocked_count
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19063 function
std::string OpsV350OperationsExportBundleHandoffMapJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v350-export-bundle-handoff-map.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans =
        BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto ledgerEntries =
        BuildV350DrillRunLedgerEntries(context, commandPlanCandidates, stagedChangePlans);
    const auto fieldBridgeConditionGates = BuildV340FieldBridgeConditionGates();
    const auto operationsExportBundle =
        BuildV350OperationsExportBundleItems(context,
                                             commandPlanCandidates,
                                             ledgerEntries,
                                             fieldBridgeConditionGates);
    const auto handoffMapEntries =
        BuildV350OperationsHandoffMapEntries(operationsExportBundle);
    const auto summary =
        BuildV350OperationsExportBundleSummary(operationsExportBundle, handoffMapEntries);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v350-export-bundle-handoff-map.v1\","
        << "\"status\":\"operations-export-bundle-handoff-map\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"commandPlanRoute\":\"/ops/api/live-operations/command-plan\","
        << "\"drillLedgerRoute\":\"/ops/api/live-operations/drill-run-ledger\","
        << "\"fieldEvidenceRoute\":\"/ops/api/source-registry/field-bridge-condition-gates\","
        << "\"clientImpactForecastRoute\":\"/client/api/views\","
        << "\"operationsExportBundleSummary\":";
    AppendV350OperationsExportBundleSummaryJson(out, summary);
    out << ",\"operationsExportBundle\":[";
    for (std::size_t i = 0; i < operationsExportBundle.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV350OperationsExportBundleItemJson(out, operationsExportBundle[i]);
    }
    out << "],\"handoffMap\":{"
        << "\"releaseSafe\":true,"
        << "\"handoffMapPolicy\":\"release-safe route/id refs only\","
        << "\"entries\":[";
    for (std::size_t i = 0; i < handoffMapEntries.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV350OperationsHandoffMapEntryJson(out, handoffMapEntries[i]);
    }
    out << "]},\"handoffMapEntries\":[";
    for (std::size_t i = 0; i < handoffMapEntries.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV350OperationsHandoffMapEntryJson(out, handoffMapEntries[i]);
    }
    out << "],\"contractPolicy\":{"
        << "\"commandPlanRefs\":\"route-and-candidate-id-only\","
        << "\"drillLedgerRefs\":\"run-id-only\","
        << "\"fieldEvidenceRefs\":\"condition-gate-key-and-status-only\","
        << "\"clientImpactForecastRefs\":\"viewer-safe-view-or-source-ids-only\","
        << "\"releaseSafe\":true"
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"releaseSafe\":true,"
        << "\"artifactExportExecuted\":false,"
        << "\"handoffWritePerformed\":false,"
        << "\"fieldEvidenceExecutionPerformed\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"commandPlanExecuted\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"rawProviderResponseIncluded\":false,"
        << "\"rawVlmPromptIncluded\":false,"
        << "\"clientViewerRawMaterialIncluded\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}




// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19200 function
std::string V350FieldEvidenceNotRunReason(
    const OpsV340FieldBridgeConditionGate& gate) {
    if (gate.bridge_kind == "onvif-real-device") {
        return "not-run: approved ONVIF real device endpoint, credential, and operator approval are required";
    }
    if (gate.bridge_kind == "external-whep-turn") {
        return "not-run: approved external WHEP endpoint, TURN relay credential, and operator approval are required";
    }
    if (gate.bridge_kind == "real-cloud-vlm-provider") {
        return "not-run: approved cloud/VLM provider endpoint, credential, and operator approval are required";
    }
    return "not-run: endpoint, credential, and operator approval are required before field smoke";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19214 function
std::vector<OpsV350FieldEvidenceIntakeRecord> BuildV350FieldEvidenceIntakeRecords(
    const std::vector<OpsV340FieldBridgeConditionGate>& fieldBridgeConditionGates) {
    std::vector<OpsV350FieldEvidenceIntakeRecord> records;
    for (const auto& gate : fieldBridgeConditionGates) {
        OpsV350FieldEvidenceIntakeRecord record;
        record.evidence_id = "field-evidence:" + gate.gate_key;
        record.bridge_kind = gate.bridge_kind;
        record.label = gate.label;
        record.evidence_intake_status = "condition-gated";
        record.execution_status = gate.execution_status;
        record.field_smoke_status = gate.field_smoke_status;
        record.not_run_reason = V350FieldEvidenceNotRunReason(gate);
        record.redacted_field_evidence =
            "redacted field evidence: no endpoint, credential, raw locator, raw provider response, or VLM prompt captured";
        record.result_summary =
            "condition-gated redacted field evidence only; field smoke remains not-run";
        record.endpoint_required = gate.endpoint_required;
        record.credential_required = gate.credential_required;
        record.operator_approval_required = gate.operator_approval_required;
        record.field_smoke_executed = gate.field_smoke_executed;
        record.evidence_refs = {"/ops/api/source-registry/field-bridge-condition-gates",
                                gate.gate_key + ":" + gate.execution_status};
        records.push_back(std::move(record));
    }
    return records;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19241 function
std::vector<OpsV350FieldEvidenceExecutionCondition> BuildV350FieldEvidenceExecutionConditions(
    const std::vector<OpsV350FieldEvidenceIntakeRecord>& fieldEvidenceIntakeRecords) {
    std::vector<OpsV350FieldEvidenceExecutionCondition> conditions;
    for (const auto& record : fieldEvidenceIntakeRecords) {
        conditions.push_back({record.evidence_id + ":endpoint",
                              record.evidence_id,
                              record.bridge_kind,
                              "endpointRequired",
                              record.endpoint_required ? "missing" : "not-required",
                              record.execution_status,
                              "field endpoint must be supplied out of band before field smoke",
                              record.endpoint_required,
                              false,
                              false,
                              record.field_smoke_executed});
        conditions.push_back({record.evidence_id + ":credential",
                              record.evidence_id,
                              record.bridge_kind,
                              "credentialRequired",
                              record.credential_required ? "missing" : "not-required",
                              record.execution_status,
                              "credential material must stay out of band and is never captured in the intake",
                              false,
                              record.credential_required,
                              false,
                              record.field_smoke_executed});
        conditions.push_back({record.evidence_id + ":operator-approval",
                              record.evidence_id,
                              record.bridge_kind,
                              "operatorApprovalRequired",
                              record.operator_approval_required ? "missing" : "not-required",
                              record.execution_status,
                              "operator approval is required before any real field smoke or provider call",
                              false,
                              false,
                              record.operator_approval_required,
                              record.field_smoke_executed});
    }
    return conditions;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19282 function
OpsV350FieldEvidenceIntakeSummary BuildV350FieldEvidenceIntakeSummary(
    const std::vector<OpsV350FieldEvidenceIntakeRecord>& records,
    const std::vector<OpsV350FieldEvidenceExecutionCondition>& conditions) {
    OpsV350FieldEvidenceIntakeSummary summary;
    summary.evidence_record_count = static_cast<int>(records.size());
    summary.execution_condition_count = static_cast<int>(conditions.size());
    for (const auto& record : records) {
        if (record.execution_status == "not-run") {
            ++summary.not_run_count;
        }
        if (record.evidence_intake_status == "condition-gated") {
            ++summary.condition_gated_count;
        }
        if (!record.redacted_field_evidence.empty()) {
            ++summary.redacted_count;
        }
        if (record.field_smoke_status == "field-smoke-needed") {
            ++summary.field_smoke_needed_count;
        }
        if (record.endpoint_required) {
            ++summary.endpoint_required_count;
        }
        if (record.credential_required) {
            ++summary.credential_required_count;
        }
        if (record.operator_approval_required) {
            ++summary.approval_required_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19314 function
void AppendV350FieldEvidenceExecutionConditionJson(
    std::ostringstream& out,
    const OpsV350FieldEvidenceExecutionCondition& condition) {
    out << "{"
        << "\"conditionId\":\"" << JsonEscape(condition.condition_id) << "\","
        << "\"evidenceId\":\"" << JsonEscape(condition.evidence_id) << "\","
        << "\"bridgeKind\":\"" << JsonEscape(condition.bridge_kind) << "\","
        << "\"conditionKind\":\"" << JsonEscape(condition.condition_kind) << "\","
        << "\"conditionStatus\":\"" << JsonEscape(condition.condition_status) << "\","
        << "\"executionStatus\":\"" << JsonEscape(condition.execution_status) << "\","
        << "\"summary\":\"" << JsonEscape(condition.summary) << "\","
        << "\"endpointRequired\":" << (condition.endpoint_required ? "true" : "false") << ","
        << "\"credentialRequired\":" << (condition.credential_required ? "true" : "false") << ","
        << "\"operatorApprovalRequired\":"
        << (condition.operator_approval_required ? "true" : "false") << ","
        << "\"fieldSmokeExecuted\":"
        << (condition.field_smoke_executed ? "true" : "false")
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19334 function
void AppendV350FieldEvidenceIntakeRecordJson(
    std::ostringstream& out,
    const OpsV350FieldEvidenceIntakeRecord& record) {
    out << "{"
        << "\"evidenceId\":\"" << JsonEscape(record.evidence_id) << "\","
        << "\"bridgeKind\":\"" << JsonEscape(record.bridge_kind) << "\","
        << "\"label\":\"" << JsonEscape(record.label) << "\","
        << "\"evidenceIntakeStatus\":\""
        << JsonEscape(record.evidence_intake_status) << "\","
        << "\"executionStatus\":\"" << JsonEscape(record.execution_status) << "\","
        << "\"fieldSmokeStatus\":\"" << JsonEscape(record.field_smoke_status) << "\","
        << "\"notRunReason\":\"" << JsonEscape(record.not_run_reason) << "\","
        << "\"redactedFieldEvidence\":\""
        << JsonEscape(record.redacted_field_evidence) << "\","
        << "\"resultSummary\":\"" << JsonEscape(record.result_summary) << "\","
        << "\"endpointRequired\":" << (record.endpoint_required ? "true" : "false") << ","
        << "\"credentialRequired\":" << (record.credential_required ? "true" : "false") << ","
        << "\"operatorApprovalRequired\":"
        << (record.operator_approval_required ? "true" : "false") << ","
        << "\"fieldSmokeExecuted\":"
        << (record.field_smoke_executed ? "true" : "false") << ","
        << "\"endpointUrlIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"rawJsonIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"providerMaterialIncluded\":false,"
        << "\"rawTurnCredentialsIncluded\":false,"
        << "\"rawVlmPromptIncluded\":false,"
        << "\"rawProviderResponseIncluded\":false,"
        << "\"clientViewerMaterialIncluded\":false,"
        << "\"evidenceRefs\":";
    AppendV340RecoveryCandidateStringListJson(out, record.evidence_refs);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19370 function
void AppendV350FieldEvidenceIntakeSummaryJson(
    std::ostringstream& out,
    const OpsV350FieldEvidenceIntakeSummary& summary) {
    out << "{"
        << "\"evidenceRecordCount\":" << summary.evidence_record_count << ","
        << "\"executionConditionCount\":" << summary.execution_condition_count << ","
        << "\"notRunCount\":" << summary.not_run_count << ","
        << "\"conditionGatedCount\":" << summary.condition_gated_count << ","
        << "\"redactedCount\":" << summary.redacted_count << ","
        << "\"fieldSmokeNeededCount\":" << summary.field_smoke_needed_count << ","
        << "\"endpointRequiredCount\":" << summary.endpoint_required_count << ","
        << "\"credentialRequiredCount\":" << summary.credential_required_count << ","
        << "\"approvalRequiredCount\":" << summary.approval_required_count
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19386 function
std::string OpsV350FieldEvidenceIntakeJson(
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    if (!source_health_snapshot.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v350-field-evidence-intake.v1\",\"error\":\"" +
               JsonEscape(source_health_snapshot.error) + "\"}";
    }

    const auto fieldBridgeConditionGates = BuildV340FieldBridgeConditionGates();
    const auto fieldEvidenceIntakeRecords =
        BuildV350FieldEvidenceIntakeRecords(fieldBridgeConditionGates);
    const auto fieldEvidenceExecutionConditions =
        BuildV350FieldEvidenceExecutionConditions(fieldEvidenceIntakeRecords);
    const auto summary = BuildV350FieldEvidenceIntakeSummary(
        fieldEvidenceIntakeRecords, fieldEvidenceExecutionConditions);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v350-field-evidence-intake.v1\","
        << "\"status\":\"field-evidence-intake\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"fieldBridgeConditionGateRoute\":\"/ops/api/source-registry/field-bridge-condition-gates\","
        << "\"fieldEvidenceIntakeSummary\":";
    AppendV350FieldEvidenceIntakeSummaryJson(out, summary);
    out << ",\"fieldEvidenceExecutionConditions\":[";
    for (std::size_t i = 0; i < fieldEvidenceExecutionConditions.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV350FieldEvidenceExecutionConditionJson(
            out, fieldEvidenceExecutionConditions[i]);
    }
    out << "],\"fieldEvidenceIntakeRecords\":[";
    for (std::size_t i = 0; i < fieldEvidenceIntakeRecords.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV350FieldEvidenceIntakeRecordJson(out, fieldEvidenceIntakeRecords[i]);
    }
    out << "],\"evidenceIntakePolicy\":{"
        << "\"intakeStatus\":\"condition-gated\","
        << "\"executionStatus\":\"not-run\","
        << "\"redactedFieldEvidence\":\"redacted field evidence only\","
        << "\"executionConditions\":\"endpointRequired, credentialRequired, operatorApprovalRequired\","
        << "\"notRunReason\":\"field smoke/provider call requires approved endpoint, credential, and operator approval\","
        << "\"onvifRealDevice\":\"not-run\","
        << "\"externalWhepTurn\":\"not-run\","
        << "\"realCloudVlmProvider\":\"not-run\""
        << "},\"redactionPolicy\":{"
        << "\"redacted\":true,"
        << "\"endpointUrlIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"rawJsonIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"providerMaterialIncluded\":false,"
        << "\"rawTurnCredentialsIncluded\":false,"
        << "\"rawVlmPromptIncluded\":false,"
        << "\"rawProviderResponseIncluded\":false,"
        << "\"clientViewerMaterialIncluded\":false"
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"fieldEvidencePersisted\":false,"
        << "\"fieldEvidenceWritePerformed\":false,"
        << "\"fieldSmokeExecuted\":false,"
        << "\"endpointProbePerformed\":false,"
        << "\"credentialProbePerformed\":false,"
        << "\"onvifDeviceContacted\":false,"
        << "\"externalWhepTurnContacted\":false,"
        << "\"cloudProviderContacted\":false,"
        << "\"vlmProviderCalled\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"artifactExportExecuted\":false,"
        << "\"commandPlanExecuted\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19502 function
std::string V350VlmExplanationSourceHealth(
    const OpsV350LiveOperationsGraphContext& context,
    const std::string& source_id) {
    const auto it = context.source_health_status_by_source.find(source_id);
    return it == context.source_health_status_by_source.end() ? "unknown" : it->second;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19509 function
int V350VlmExplanationEventRecordCount(
    const OpsV350LiveOperationsGraphContext& context,
    const std::string& source_id) {
    const auto it = context.event_record_count_by_source.find(source_id);
    return it == context.event_record_count_by_source.end() ? 0 : it->second;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19516 function
std::vector<OpsV350VlmAssistedOpsExplanationItem>
BuildV350VlmAssistedOpsExplanationItems(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates) {
    const OpsV350CommandPlanCandidate* first_candidate = nullptr;
    for (const auto& candidate : commandPlanCandidates) {
        if (first_candidate == nullptr ||
            candidate.status.find("blocked") != std::string::npos) {
            first_candidate = &candidate;
            if (candidate.status.find("blocked") != std::string::npos) {
                break;
            }
        }
    }

    std::string source_id = first_candidate == nullptr ? "" : first_candidate->source_id;
    if (source_id.empty() && !context.sources.empty()) {
        source_id = context.sources.front().source_id;
    }
    if (source_id.empty()) {
        source_id = "unknown-source";
    }
    const std::string health_status = V350VlmExplanationSourceHealth(context, source_id);
    const int event_record_count = V350VlmExplanationEventRecordCount(context, source_id);
    const std::string candidate_id =
        first_candidate == nullptr ? "commandPlan:pending" : first_candidate->candidate_id;
    const std::string candidate_type =
        first_candidate == nullptr ? "commandPlan" : first_candidate->candidate_type;
    const std::string blocked_reason =
        first_candidate == nullptr ? "operator-approval-required"
                                  : first_candidate->blocked_reason;

    std::vector<OpsV350VlmAssistedOpsExplanationItem> items;
    OpsV350VlmAssistedOpsExplanationItem blocker_item;
    blocker_item.explanation_id = "vlm-explanation:command-plan-blocker";
    blocker_item.explanation_type = "command-plan-blocker";
    blocker_item.title = "command plan blocker";
    blocker_item.source_id = source_id;
    blocker_item.command_plan_ref = candidate_id;
    blocker_item.command_plan_blocker_summary =
        "blockedReason " + blocked_reason + " keeps " + candidate_type +
        " draft-only until operator approval.";
    blocker_item.incident_source_relation_summary =
        "source " + source_id + " sourceHealth " + health_status +
        " has eventRecord count " + std::to_string(event_record_count) +
        " in the live operations graph.";
    blocker_item.operator_review_hint =
        "operator review hint: inspect blockedReason, sourceHealth, and command plan draft before any opt-in VLM assistance.";
    blocker_item.evidence_refs = {"/ops/api/live-operations/command-plan",
                                  "/ops/api/live-operations/graph",
                                  candidate_id};
    items.push_back(std::move(blocker_item));

    OpsV350VlmAssistedOpsExplanationItem relation_item;
    relation_item.explanation_id = "vlm-explanation:incident-source-relation";
    relation_item.explanation_type = "incident-source-relation";
    relation_item.title = "incident/source relation";
    relation_item.source_id = source_id;
    relation_item.command_plan_ref = candidate_id;
    relation_item.command_plan_blocker_summary =
        "command plan blocker remains " + blocked_reason + ".";
    relation_item.incident_source_relation_summary =
        "incident/source relation uses sourceHealth " + health_status +
        ", eventRecord count " + std::to_string(event_record_count) +
        ", and graph sourceId " + source_id + " without VLM/provider calls.";
    relation_item.operator_review_hint =
        "operator review hint: compare incident/source relation with source health and recent EventRecord evidence.";
    relation_item.evidence_refs = {"/ops/api/live-operations/graph",
                                   "sourceHealth:" + source_id,
                                   "eventRecord:recent"};
    items.push_back(std::move(relation_item));

    OpsV350VlmAssistedOpsExplanationItem review_item;
    review_item.explanation_id = "vlm-explanation:operator-review-hint";
    review_item.explanation_type = "operator-review-hint";
    review_item.title = "operator review hint";
    review_item.source_id = source_id;
    review_item.command_plan_ref = candidate_id;
    review_item.command_plan_blocker_summary =
        "command plan blocker summary is deterministic and default-off.";
    review_item.incident_source_relation_summary =
        "incident/source relation summary is redacted from ops read models only.";
    review_item.operator_review_hint =
        "operator review hint: VLM assistance is default-off; use this summary as a checklist and do not execute command plans from it.";
    review_item.evidence_refs = {"/ops/api/live-operations/command-plan",
                                 "/ops/api/live-operations/graph",
                                 "/ops/api/events/reviews"};
    items.push_back(std::move(review_item));

    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19608 function
OpsV350VlmAssistedOpsExplanationSummary
BuildV350VlmAssistedOpsExplanationSummary(
    const std::vector<OpsV350VlmAssistedOpsExplanationItem>& items) {
    OpsV350VlmAssistedOpsExplanationSummary summary;
    summary.explanation_count = static_cast<int>(items.size());
    for (const auto& item : items) {
        if (item.explanation_type == "command-plan-blocker") {
            ++summary.command_plan_blocker_count;
        } else if (item.explanation_type == "incident-source-relation") {
            ++summary.incident_source_relation_count;
        } else if (item.explanation_type == "operator-review-hint") {
            ++summary.operator_review_hint_count;
        }
        if (item.default_off && !item.default_enabled) {
            ++summary.default_off_count;
        }
        if (item.vlm_provider_call_performed || item.vlm_runtime_call_performed) {
            ++summary.provider_call_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19631 function
void AppendV350VlmAssistedOpsExplanationItemJson(
    std::ostringstream& out,
    const OpsV350VlmAssistedOpsExplanationItem& item) {
    out << "{"
        << "\"explanationId\":\"" << JsonEscape(item.explanation_id) << "\","
        << "\"explanationType\":\"" << JsonEscape(item.explanation_type) << "\","
        << "\"title\":\"" << JsonEscape(item.title) << "\","
        << "\"sourceId\":\"" << JsonEscape(item.source_id) << "\","
        << "\"eventId\":\"" << JsonEscape(item.event_id) << "\","
        << "\"commandPlanRef\":\"" << JsonEscape(item.command_plan_ref) << "\","
        << "\"commandPlanBlockerSummary\":\""
        << JsonEscape(item.command_plan_blocker_summary) << "\","
        << "\"incidentSourceRelationSummary\":\""
        << JsonEscape(item.incident_source_relation_summary) << "\","
        << "\"operatorReviewHint\":\""
        << JsonEscape(item.operator_review_hint) << "\","
        << "\"defaultOff\":" << (item.default_off ? "true" : "false") << ","
        << "\"defaultEnabled\":"
        << (item.default_enabled ? "true" : "false") << ","
        << "\"runtimeOptInRequired\":"
        << (item.runtime_opt_in_required ? "true" : "false") << ","
        << "\"vlmProviderCallPerformed\":"
        << (item.vlm_provider_call_performed ? "true" : "false") << ","
        << "\"vlmRuntimeCallPerformed\":"
        << (item.vlm_runtime_call_performed ? "true" : "false") << ","
        << "\"rawVlmPromptIncluded\":false,"
        << "\"rawProviderResponseIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"evidenceRefs\":";
    AppendV340RecoveryCandidateStringListJson(out, item.evidence_refs);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19664 function
void AppendV350VlmAssistedOpsExplanationSummaryJson(
    std::ostringstream& out,
    const OpsV350VlmAssistedOpsExplanationSummary& summary) {
    out << "{"
        << "\"explanationCount\":" << summary.explanation_count << ","
        << "\"commandPlanBlockerCount\":"
        << summary.command_plan_blocker_count << ","
        << "\"incidentSourceRelationCount\":"
        << summary.incident_source_relation_count << ","
        << "\"operatorReviewHintCount\":"
        << summary.operator_review_hint_count << ","
        << "\"defaultOffCount\":" << summary.default_off_count << ","
        << "\"providerCallCount\":" << summary.provider_call_count
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19680 function
std::string OpsV350VlmAssistedOpsExplanationJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v350-vlm-assisted-explanation.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto explanations =
        BuildV350VlmAssistedOpsExplanationItems(context, commandPlanCandidates);
    const auto summary = BuildV350VlmAssistedOpsExplanationSummary(explanations);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v350-vlm-assisted-explanation.v1\","
        << "\"status\":\"vlm-assisted-ops-explanation\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"commandPlanRoute\":\"/ops/api/live-operations/command-plan\","
        << "\"graphRoute\":\"/ops/api/live-operations/graph\","
        << "\"defaultOff\":true,"
        << "\"defaultEnabled\":false,"
        << "\"runtimeOptInRequired\":true,"
        << "\"vlmAssistedOpsExplanationSummary\":";
    AppendV350VlmAssistedOpsExplanationSummaryJson(out, summary);
    out << ",\"vlmAssistedOpsExplanations\":[";
    for (std::size_t i = 0; i < explanations.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV350VlmAssistedOpsExplanationItemJson(out, explanations[i]);
    }
    out << "],\"explanationPolicy\":{"
        << "\"defaultOff\":true,"
        << "\"defaultEnabled\":false,"
        << "\"runtimeOptInRequired\":true,"
        << "\"summaryMode\":\"deterministic-read-model\","
        << "\"commandPlanBlockerSummary\":\"blockedReason and draft-only command plan context\","
        << "\"incidentSourceRelationSummary\":\"sourceHealth and eventRecord relation summary\","
        << "\"operatorReviewHint\":\"operator review hint only; no automatic action\""
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"defaultOff\":true,"
        << "\"defaultEnabled\":false,"
        << "\"runtimeOptInRequired\":true,"
        << "\"vlmProviderCallPerformed\":false,"
        << "\"vlmRuntimeCallPerformed\":false,"
        << "\"rawVlmPromptIncluded\":false,"
        << "\"rawProviderResponseIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"commandPlanExecuted\":false,"
        << "\"operatorReviewWritePerformed\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19772 function
std::vector<OpsV360SimulationInputPackItem> BuildV360SimulationInputPackItems(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates,
    const std::vector<OpsV350StagedChangePlan>& stagedChangePlans) {
    std::vector<OpsV360SimulationInputPackItem> items;

    items.push_back({"input:event-record",
                     "EventRecord",
                     "/ops/api/events/reviews",
                     context.event_record_count > 0 ? "available" : "empty",
                     "read-only EventRecord aggregate; no EventRecord write",
                     {"eventId", "streamId", "channelId", "eventType", "createdAtMs"},
                     context.event_record_count,
                     true});
    items.push_back({"input:source-registry",
                     "SourceRegistry",
                     "/ops/api/source-registry/snapshot",
                     context.sources.empty() ? "empty" : "available",
                     "read-only SourceRegistry identity; no source registry write",
                     {"sourceId", "displayName", "enabled", "sourceKind"},
                     static_cast<int>(context.sources.size()),
                     true});
    items.push_back({"input:published-view",
                     "PublishedView",
                     "/ops/api/views",
                     context.views.empty() ? "empty" : "available",
                     "read-only PublishedView identity; no PublishedView write",
                     {"viewId", "sourceId", "displayName", "enabled"},
                     static_cast<int>(context.views.size()),
                     true});
    items.push_back({"input:command-plan",
                     "commandPlan",
                     "/ops/api/live-operations/command-plan",
                     commandPlanCandidates.empty() ? "empty" : "available",
                     "draft-only command plan input; command plan is not executed",
                     {"candidateId", "candidateType", "sourceId", "blockedReason", "operatorApprovalRequired"},
                     static_cast<int>(commandPlanCandidates.size()),
                     true});
    items.push_back({"input:staged-plan",
                     "stagedPlan",
                     "/ops/api/live-operations/staged-change-plan-impact-preview",
                     stagedChangePlans.empty() ? "empty" : "available",
                     "staging-only staged plan input; staged plan is not applied",
                     {"planId", "candidateType", "sourceId", "impactPreview", "blockers"},
                     static_cast<int>(stagedChangePlans.size()),
                     true});
    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19821 function
OpsV360SimulationInputPackSummary BuildV360SimulationInputPackSummary(
    const std::vector<OpsV360SimulationInputPackItem>& items) {
    OpsV360SimulationInputPackSummary summary;
    summary.derivation_sources = {
        "BuildV350LiveOperationsGraphContext",
        "BuildV350CommandPlanCandidates",
        "BuildV350StagedChangePlans",
    };
    summary.input_count = static_cast<int>(items.size());
    for (const auto& item : items) {
        if (item.input_type == "EventRecord") {
            summary.event_record_count = item.record_count;
        } else if (item.input_type == "SourceRegistry") {
            summary.source_registry_count = item.record_count;
        } else if (item.input_type == "PublishedView") {
            summary.published_view_count = item.record_count;
        } else if (item.input_type == "commandPlan") {
            summary.command_plan_candidate_count = item.record_count;
        } else if (item.input_type == "stagedPlan") {
            summary.staged_plan_count = item.record_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19846 function
void AppendV360SimulationInputPackItemJson(
    std::ostringstream& out,
    const OpsV360SimulationInputPackItem& item) {
    out << "{"
        << "\"inputId\":\"" << JsonEscape(item.input_id) << "\","
        << "\"inputType\":\"" << JsonEscape(item.input_type) << "\","
        << "\"sourceRoute\":\"" << JsonEscape(item.source_route) << "\","
        << "\"snapshotStatus\":\"" << JsonEscape(item.snapshot_status) << "\","
        << "\"recordCount\":" << item.record_count << ","
        << "\"includedFields\":";
    AppendV340RecoveryCandidateStringListJson(out, item.included_fields);
    out << ",\"writeGuard\":\"" << JsonEscape(item.write_guard) << "\","
        << "\"readOnly\":" << (item.read_only ? "true" : "false")
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19862 function
void AppendV360SimulationInputPackSummaryJson(
    std::ostringstream& out,
    const OpsV360SimulationInputPackSummary& summary) {
    out << "{"
        << "\"inputCount\":" << summary.input_count << ","
        << "\"eventRecordCount\":" << summary.event_record_count << ","
        << "\"sourceRegistryCount\":" << summary.source_registry_count << ","
        << "\"publishedViewCount\":" << summary.published_view_count << ","
        << "\"commandPlanCandidateCount\":" << summary.command_plan_candidate_count << ","
        << "\"stagedPlanCount\":" << summary.staged_plan_count << ","
        << "\"derivationSources\":";
    AppendV340RecoveryCandidateStringListJson(out, summary.derivation_sources);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19877 function
std::string OpsV360SimulationInputPackJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v360-simulation-input-pack.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans = BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto inputPackItems =
        BuildV360SimulationInputPackItems(context, commandPlanCandidates, stagedChangePlans);
    const auto summary = BuildV360SimulationInputPackSummary(inputPackItems);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v360-simulation-input-pack.v1\","
        << "\"status\":\"read-only-simulation-input-pack\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"readOnlySimulationInputPack\":true,"
        << "\"eventRecordRoute\":\"/ops/api/events/reviews\","
        << "\"sourceRegistryRoute\":\"/ops/api/source-registry/snapshot\","
        << "\"publishedViewRoute\":\"/ops/api/views\","
        << "\"commandPlanRoute\":\"/ops/api/live-operations/command-plan\","
        << "\"stagedPlanRoute\":\"/ops/api/live-operations/staged-change-plan-impact-preview\","
        << "\"simulationInputPackSummary\":";
    AppendV360SimulationInputPackSummaryJson(out, summary);
    out << ",\"simulationInputPackItems\":[";
    for (std::size_t i = 0; i < inputPackItems.size(); ++i) {
        if (i != 0) out << ",";
        AppendV360SimulationInputPackItemJson(out, inputPackItems[i]);
    }
    out << "],\"contractPolicy\":{"
        << "\"EventRecord\":\"read-only aggregate input\","
        << "\"SourceRegistry\":\"identity-only input\","
        << "\"PublishedView\":\"identity-only input\","
        << "\"commandPlan\":\"draft-only input\","
        << "\"stagedPlan\":\"staging-only input\""
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"readOnlySimulationInputPack\":true,"
        << "\"simulationInputPersisted\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"commandPlanExecuted\":false,"
        << "\"stagedPlanApplied\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19958 function
OpsV360SimulationRunContract BuildV360SimulationRunContract() {
    OpsV360SimulationRunContract contract;
    contract.simulation_route_family = {
        "/ops/api/live-operations/simulation/input-pack",
        "/ops/api/live-operations/simulation/run-contract",
        "/ops/api/live-operations/simulation/command-plan-dry-run",
        "/ops/api/live-operations/simulation/impact-diff",
        "/ops/api/live-operations/simulation/safe-apply-readiness",
        "/ops/api/live-operations/simulation/run-ledger",
        "/ops/api/live-operations/simulation/client-notice-preview",
        "/ops/api/live-operations/simulation/rule-va-what-if-replay-pack",
        "/ops/api/live-operations/simulation/export-bundle",
        "/ops/api/live-operations/simulation/field-evidence-adapter",
        "/ops/api/live-operations/simulation/vlm-assisted-explanation",
    };
    contract.allowed_readiness_states = {
        "ready",
        "blocked",
        "approval-needed",
        "field-needed",
        "not-run",
    };
    return contract;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19983 function
OpsV360SimulationResultEnvelope BuildV360SimulationResultEnvelope(
    const OpsV360SimulationInputPackSummary& input_summary) {
    OpsV360SimulationResultEnvelope envelope;
    envelope.ready_status = input_summary.input_count > 0 ? "not-run" : "blocked";
    envelope.blockers = {"simulation-not-executed", "safe-apply-readiness-not-approved"};
    if (input_summary.source_registry_count == 0) {
        envelope.blockers.push_back("source-registry-empty");
    }
    if (input_summary.command_plan_candidate_count == 0) {
        envelope.blockers.push_back("command-plan-candidate-empty");
    }
    return envelope;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19997 function
void AppendV360SimulationRunContractJson(
    std::ostringstream& out,
    const OpsV360SimulationRunContract& contract) {
    out << "{"
        << "\"simulationRunId\":\"" << JsonEscape(contract.simulation_run_id) << "\","
        << "\"inputPackRoute\":\"" << JsonEscape(contract.input_pack_route) << "\","
        << "\"resultStatus\":\"" << JsonEscape(contract.result_status) << "\","
        << "\"simulationRouteFamily\":";
    AppendV340RecoveryCandidateStringListJson(out, contract.simulation_route_family);
    out << ",\"allowedReadinessStates\":";
    AppendV340RecoveryCandidateStringListJson(out, contract.allowed_readiness_states);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20011 function
void AppendV360SimulationResultEnvelopeJson(
    std::ostringstream& out,
    const OpsV360SimulationResultEnvelope& envelope) {
    out << "{"
        << "\"simulationRunId\":\"" << JsonEscape(envelope.simulation_run_id) << "\","
        << "\"resultStatus\":\"" << JsonEscape(envelope.result_status) << "\","
        << "\"readyStatus\":\"" << JsonEscape(envelope.ready_status) << "\","
        << "\"summary\":\"" << JsonEscape(envelope.summary) << "\","
        << "\"blockers\":";
    AppendV340RecoveryCandidateStringListJson(out, envelope.blockers);
    out << ",\"resultEnvelopePersisted\":false}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20024 function
std::string OpsV360OperationsSimulationRunContractJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v360-simulation-run-contract.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans = BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto inputPackItems =
        BuildV360SimulationInputPackItems(context, commandPlanCandidates, stagedChangePlans);
    const auto inputSummary = BuildV360SimulationInputPackSummary(inputPackItems);
    const auto simulationRunSchema = BuildV360SimulationRunContract();
    const auto simulationResultEnvelope = BuildV360SimulationResultEnvelope(inputSummary);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v360-simulation-run-contract.v1\","
        << "\"status\":\"operations-simulation-run-contract\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"simulationRunSchema\":";
    AppendV360SimulationRunContractJson(out, simulationRunSchema);
    out << ",\"simulationResultEnvelope\":";
    AppendV360SimulationResultEnvelopeJson(out, simulationResultEnvelope);
    out << ",\"contractPolicy\":{"
        << "\"runMode\":\"read-only\","
        << "\"resultStatus\":\"not-run\","
        << "\"inputPackRoute\":\"/ops/api/live-operations/simulation/input-pack\","
        << "\"resultEnvelope\":\"schema-only-not-persisted\""
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"simulationRunPersisted\":false,"
        << "\"simulationRunExecuted\":false,"
        << "\"resultEnvelopePersisted\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"commandPlanExecuted\":false,"
        << "\"automaticApplyPerformed\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20116 function
int V370ImpactGraphNodeCountForScope(
    const std::vector<OpsV370SiteImpactGraphNode>& nodes,
    const OpsV370SiteAwareSourceRegistryProjectionItem& projected) {
    return static_cast<int>(std::count_if(nodes.begin(), nodes.end(), [&](const auto& node) {
        return node.site_id == projected.site_id &&
               (node.source_group == projected.source_group || node.node_type == "site");
    }));
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20125 function
int V370ImpactGraphEdgeCountForScope(
    const std::vector<OpsV370SiteImpactGraphEdge>& edges,
    const OpsV370SiteAwareSourceRegistryProjectionItem& projected) {
    return static_cast<int>(std::count_if(edges.begin(), edges.end(), [&](const auto& edge) {
        return edge.site_id == projected.site_id && edge.source_group == projected.source_group;
    }));
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20133 function
int V370SourceHealthCountForProjection(
    const OpsV350LiveOperationsGraphContext& context,
    const OpsV370SiteAwareSourceRegistryProjectionItem& projected) {
    int count = 0;
    for (const auto& source_id : projected.source_ids) {
        if (context.health_by_source.find(source_id) != context.health_by_source.end()) {
            ++count;
        }
    }
    return count;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20145 function
int V370EventRecordCountForProjection(
    const OpsV350LiveOperationsGraphContext& context,
    const OpsV370SiteAwareSourceRegistryProjectionItem& projected) {
    int count = 0;
    for (const auto& source_id : projected.source_ids) {
        count += V370EventRecordCountForSource(context, source_id);
    }
    return count;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20155 function
std::vector<OpsV370SiteSimulationInputPackItem> BuildV370SiteSimulationInputPackItems(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection,
    const std::vector<OpsV370SiteHealthRollupItem>& rollups,
    const std::vector<OpsV370SiteImpactGraphNode>& impactGraphNodes,
    const std::vector<OpsV370SiteImpactGraphEdge>& impactGraphEdges,
    const std::vector<OpsV360SimulationInputPackItem>& v360InputPackItems) {
    std::vector<OpsV370SiteSimulationInputPackItem> items;
    items.reserve(projection.size() * 6);

    for (const auto& projected : projection) {
        const auto* rollup = V370RollupForProjection(rollups, projected);
        const int eventRecordCount = V370EventRecordCountForProjection(context, projected);
        const int sourceHealthCount = V370SourceHealthCountForProjection(context, projected);
        const int impactNodeCount = V370ImpactGraphNodeCountForScope(impactGraphNodes, projected);
        const int impactEdgeCount = V370ImpactGraphEdgeCountForScope(impactGraphEdges, projected);
        const std::string scope = projected.site_id + ":" + projected.source_group;
        const std::string snapshotStatus =
            rollup == nullptr ? "site-scope-linked" : rollup->rollup_state;

        items.push_back({"siteSimulationInputPack:" + scope + ":source-registry-projection",
                         "SourceRegistry",
                         projected.site_id,
                         projected.source_group,
                         "/ops/api/site-operations/source-registry-projection",
                         projected.source_ids.empty() ? "empty" : "available",
                         "read-only site source projection; no SourceRegistry write",
                         projected.source_ids,
                         projected.view_ids,
                         {"siteId", "sourceGroup", "zone", "sourceIds", "viewIds"},
                         {"/ops/api/site-operations/source-registry-projection"},
                         static_cast<int>(projected.source_ids.size()),
                         eventRecordCount,
                         sourceHealthCount,
                         impactNodeCount,
                         impactEdgeCount,
                         true,
                         true});
        items.push_back({"siteSimulationInputPack:" + scope + ":event-record",
                         "EventRecord",
                         projected.site_id,
                         projected.source_group,
                         "/ops/api/events/reviews",
                         eventRecordCount > 0 ? "available" : "empty",
                         "read-only EventRecord aggregate; no EventRecord write",
                         projected.source_ids,
                         projected.view_ids,
                         {"eventId", "streamId", "channelId", "eventType", "createdAtMs"},
                         {"/ops/api/events/reviews"},
                         eventRecordCount,
                         eventRecordCount,
                         sourceHealthCount,
                         impactNodeCount,
                         impactEdgeCount,
                         true,
                         true});
        items.push_back({"siteSimulationInputPack:" + scope + ":published-view",
                         "PublishedView",
                         projected.site_id,
                         projected.source_group,
                         "/ops/api/views",
                         projected.view_ids.empty() ? "empty" : "available",
                         "read-only PublishedView identity; no PublishedView write",
                         projected.source_ids,
                         projected.view_ids,
                         {"viewId", "sourceId", "displayName", "enabled", "siteId", "sourceGroup"},
                         {"/ops/api/views", "/client/api/views"},
                         static_cast<int>(projected.view_ids.size()),
                         eventRecordCount,
                         sourceHealthCount,
                         impactNodeCount,
                         impactEdgeCount,
                         true,
                         true});
        items.push_back({"siteSimulationInputPack:" + scope + ":source-health-rollup",
                         "sourceHealthRollup",
                         projected.site_id,
                         projected.source_group,
                         "/ops/api/site-operations/health-rollup",
                         snapshotStatus,
                         "read-only source health rollup; no recovery or field action",
                         projected.source_ids,
                         projected.view_ids,
                         {"siteId", "sourceGroup", "liveCount", "degradedCount", "fieldNeededCount"},
                         {"/ops/api/site-operations/health-rollup"},
                         sourceHealthCount,
                         eventRecordCount,
                         sourceHealthCount,
                         impactNodeCount,
                         impactEdgeCount,
                         true,
                         true});
        items.push_back({"siteSimulationInputPack:" + scope + ":site-impact-graph",
                         "SiteImpactGraph",
                         projected.site_id,
                         projected.source_group,
                         "/ops/api/site-operations/impact-graph",
                         impactNodeCount > 0 ? "available" : "empty",
                         "read-only impact graph input; no client exposure or graph persistence",
                         projected.source_ids,
                         projected.view_ids,
                         {"nodeId", "edgeId", "siteId", "sourceGroup", "clientImpact"},
                         {"/ops/api/site-operations/impact-graph"},
                         impactNodeCount,
                         eventRecordCount,
                         sourceHealthCount,
                         impactNodeCount,
                         impactEdgeCount,
                         true,
                         true});
        items.push_back({"siteSimulationInputPack:" + scope + ":v360-input-envelope",
                         "simulationInputEnvelope",
                         projected.site_id,
                         projected.source_group,
                         "/ops/api/live-operations/simulation/input-pack",
                         v360InputPackItems.empty() ? "empty" : "available",
                         "read-only v3.6 simulation input envelope ref; simulation is not executed",
                         projected.source_ids,
                         projected.view_ids,
                         {"inputId", "inputType", "sourceRoute", "snapshotStatus", "recordCount"},
                         {"/ops/api/live-operations/simulation/input-pack",
                          "/ops/api/live-operations/simulation/run-contract"},
                         static_cast<int>(v360InputPackItems.size()),
                         eventRecordCount,
                         sourceHealthCount,
                         impactNodeCount,
                         impactEdgeCount,
                         true,
                         true});
    }
    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20288 function
OpsV370SiteSimulationInputPackSummary BuildV370SiteSimulationInputPackSummary(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection,
    const std::vector<OpsV370SiteSimulationInputPackItem>& items,
    const OpsV360SimulationInputPackSummary& v360InputPackSummary,
    const std::vector<OpsV370SiteImpactGraphNode>& impactGraphNodes,
    const std::vector<OpsV370SiteImpactGraphEdge>& impactGraphEdges) {
    OpsV370SiteSimulationInputPackSummary summary;
    std::vector<std::string> site_ids;
    summary.derivation_sources = {
        "BuildV350LiveOperationsGraphContext",
        "BuildV350CommandPlanCandidates",
        "BuildV350StagedChangePlans",
        "BuildV360SimulationInputPackItems",
        "BuildV360SimulationInputPackSummary",
        "BuildV360SimulationResultEnvelope",
        "BuildV370SiteAwareSourceRegistryProjectionItems",
        "BuildV370SiteHealthRollupItems",
        "BuildV370SiteImpactGraphNodes",
        "BuildV370SiteImpactGraphEdges",
    };
    summary.pack_count = static_cast<int>(items.size());
    summary.source_count = static_cast<int>(context.sources.size());
    summary.published_view_count = static_cast<int>(context.views.size());
    summary.event_record_count = context.event_record_count;
    summary.impact_graph_node_count = static_cast<int>(impactGraphNodes.size());
    summary.impact_graph_edge_count = static_cast<int>(impactGraphEdges.size());
    summary.v360_input_count = v360InputPackSummary.input_count;
    summary.v360_command_plan_candidate_count = v360InputPackSummary.command_plan_candidate_count;
    summary.v360_staged_plan_count = v360InputPackSummary.staged_plan_count;
    for (const auto& projected : projection) {
        AddV370UniqueString(&site_ids, projected.site_id);
        summary.source_health_count += V370SourceHealthCountForProjection(context, projected);
    }
    summary.site_count = static_cast<int>(site_ids.size());
    summary.source_group_count = static_cast<int>(projection.size());
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20327 function
void AppendV370SiteSimulationInputPackItemJson(
    std::ostringstream& out,
    const OpsV370SiteSimulationInputPackItem& item) {
    out << "{"
        << "\"packId\":\"" << JsonEscape(item.pack_id) << "\","
        << "\"inputType\":\"" << JsonEscape(item.input_type) << "\","
        << "\"siteId\":\"" << JsonEscape(item.site_id) << "\","
        << "\"sourceGroup\":\"" << JsonEscape(item.source_group) << "\","
        << "\"sourceRoute\":\"" << JsonEscape(item.source_route) << "\","
        << "\"snapshotStatus\":\"" << JsonEscape(item.snapshot_status) << "\","
        << "\"recordCount\":" << item.record_count << ","
        << "\"eventRecordCount\":" << item.event_record_count << ","
        << "\"sourceHealthCount\":" << item.source_health_count << ","
        << "\"impactGraphNodeCount\":" << item.impact_graph_node_count << ","
        << "\"impactGraphEdgeCount\":" << item.impact_graph_edge_count << ","
        << "\"sourceIds\":";
    AppendJsonStringArray(out, item.source_ids);
    out << ",\"publishedViewIds\":";
    AppendJsonStringArray(out, item.published_view_ids);
    out << ",\"includedFields\":";
    AppendJsonStringArray(out, item.included_fields);
    out << ",\"refs\":";
    AppendJsonStringArray(out, item.refs);
    out << ",\"writeGuard\":\"" << JsonEscape(item.write_guard) << "\","
        << "\"siteScoped\":" << (item.site_scoped ? "true" : "false") << ","
        << "\"readOnly\":" << (item.read_only ? "true" : "false")
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20356 function
void AppendV370SiteSimulationInputPackSummaryJson(
    std::ostringstream& out,
    const OpsV370SiteSimulationInputPackSummary& summary) {
    out << "{"
        << "\"packCount\":" << summary.pack_count << ","
        << "\"siteCount\":" << summary.site_count << ","
        << "\"sourceGroupCount\":" << summary.source_group_count << ","
        << "\"sourceCount\":" << summary.source_count << ","
        << "\"publishedViewCount\":" << summary.published_view_count << ","
        << "\"eventRecordCount\":" << summary.event_record_count << ","
        << "\"sourceHealthCount\":" << summary.source_health_count << ","
        << "\"impactGraphNodeCount\":" << summary.impact_graph_node_count << ","
        << "\"impactGraphEdgeCount\":" << summary.impact_graph_edge_count << ","
        << "\"v360InputPackCount\":" << summary.v360_input_count << ","
        << "\"v360CommandPlanCandidateCount\":" << summary.v360_command_plan_candidate_count << ","
        << "\"v360StagedPlanCount\":" << summary.v360_staged_plan_count << ","
        << "\"derivationSources\":";
    AppendJsonStringArray(out, summary.derivation_sources);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20377 function
std::string OpsV370SiteSimulationInputPackJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v370-site-simulation-input-pack.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans = BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto v360InputPackItems =
        BuildV360SimulationInputPackItems(context, commandPlanCandidates, stagedChangePlans);
    const auto v360InputPackSummary = BuildV360SimulationInputPackSummary(v360InputPackItems);
    const auto simulationResultEnvelope =
        BuildV360SimulationResultEnvelope(v360InputPackSummary);
    const auto projection =
        BuildV370SiteAwareSourceRegistryProjectionItems(context.sources, context.views);
    const auto rollups =
        BuildV370SiteHealthRollupItems(context.sources, context.views, source_health_snapshot);
    const auto impactGraphNodes = BuildV370SiteImpactGraphNodes(context, projection, rollups);
    const auto impactGraphEdges = BuildV370SiteImpactGraphEdges(projection);
    const auto siteSimulationInputPackItems =
        BuildV370SiteSimulationInputPackItems(context,
                                             projection,
                                             rollups,
                                             impactGraphNodes,
                                             impactGraphEdges,
                                             v360InputPackItems);
    const auto summary = BuildV370SiteSimulationInputPackSummary(context,
                                                                projection,
                                                                siteSimulationInputPackItems,
                                                                v360InputPackSummary,
                                                                impactGraphNodes,
                                                                impactGraphEdges);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v370-site-simulation-input-pack.v1\","
        << "\"status\":\"site-scoped-read-only-simulation-input-pack\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"siteScopedInputPack\":true,"
        << "\"readOnlySimulationInputPack\":true,"
        << "\"simulationInputPackRoute\":\"/ops/api/live-operations/simulation/input-pack\","
        << "\"simulationRunContractRoute\":\"/ops/api/live-operations/simulation/run-contract\","
        << "\"siteRegistryProjectionRoute\":\"/ops/api/site-operations/source-registry-projection\","
        << "\"siteHealthRollupRoute\":\"/ops/api/site-operations/health-rollup\","
        << "\"siteImpactGraphRoute\":\"/ops/api/site-operations/impact-graph\","
        << "\"eventRecordRoute\":\"/ops/api/events/reviews\","
        << "\"publishedViewRoute\":\"/ops/api/views\","
        << "\"v360InputPackSummary\":";
    AppendV360SimulationInputPackSummaryJson(out, v360InputPackSummary);
    out << ",\"simulationResultEnvelope\":";
    AppendV360SimulationResultEnvelopeJson(out, simulationResultEnvelope);
    out << ",\"siteSimulationInputPackSummary\":";
    AppendV370SiteSimulationInputPackSummaryJson(out, summary);
    out << ",\"siteSimulationInputPackItems\":[";
    for (std::size_t i = 0; i < siteSimulationInputPackItems.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV370SiteSimulationInputPackItemJson(out, siteSimulationInputPackItems[i]);
    }
    out << "],\"contractPolicy\":{"
        << "\"SourceRegistry\":\"site scoped identity input only\","
        << "\"EventRecord\":\"aggregate input only\","
        << "\"PublishedView\":\"identity refs only\","
        << "\"SiteImpactGraph\":\"read-only graph input\","
        << "\"simulationResultEnvelope\":\"v3.6 envelope ref only; not persisted\","
        << "\"siteScopedInputPack\":true"
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"siteScopedInputPack\":true,"
        << "\"readOnlySimulationInputPack\":true,"
        << "\"simulationInputPersisted\":false,"
        << "\"simulationRunExecuted\":false,"
        << "\"simulationResultPersisted\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"commandPlanExecuted\":false,"
        << "\"stagedPlanApplied\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20499 function
std::vector<OpsV360CommandPlanDryRunResult> BuildV360CommandPlanDryRunResults(
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates) {
    std::vector<OpsV360CommandPlanDryRunResult> results;
    const auto append_result = [&](const std::string& candidate_id,
                                   const std::string& candidate_type,
                                   const std::string& source_id,
                                   const std::string& blocked_reason) {
        OpsV360CommandPlanDryRunResult result;
        result.result_id = "dry-run:" + candidate_id;
        result.candidate_id = candidate_id;
        result.candidate_type = candidate_type;
        result.source_id = source_id.empty() ? "unknown-source" : source_id;
        result.dry_run_status = "dryRunComputed";
        result.predicted_result = candidate_type + " dry-run result computed without write";
        result.write_plan = candidate_type + " writePlan: read-only simulation, no mutation";
        result.blockers.push_back(blocked_reason.empty() ? "operator-approval-required"
                                                         : blocked_reason);
        results.push_back(std::move(result));
    };

    for (const auto& candidate : commandPlanCandidates) {
        if (candidate.candidate_type == "sourceRecheck" ||
            candidate.candidate_type == "recovery" ||
            candidate.candidate_type == "maintenance" ||
            candidate.candidate_type == "clientNotice" ||
            candidate.candidate_type == "ruleFollowUp") {
            append_result(candidate.candidate_id,
                          candidate.candidate_type,
                          candidate.source_id,
                          candidate.blocked_reason);
        }
        if (results.size() >= 40U) {
            break;
        }
    }

    const std::vector<std::string> required_types = {
        "sourceRecheck", "recovery", "maintenance", "clientNotice", "ruleFollowUp"};
    for (const auto& type : required_types) {
        bool exists = false;
        for (const auto& result : results) {
            if (result.candidate_type == type) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            append_result("candidate:default:" + type, type, "pending-source", "not-run");
        }
    }
    return results;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20552 function
OpsV360CommandPlanDryRunSummary BuildV360CommandPlanDryRunSummary(
    const std::vector<OpsV360CommandPlanDryRunResult>& results) {
    OpsV360CommandPlanDryRunSummary summary;
    summary.result_count = static_cast<int>(results.size());
    for (const auto& result : results) {
        if (result.candidate_type == "sourceRecheck") {
            ++summary.source_recheck_count;
        } else if (result.candidate_type == "recovery") {
            ++summary.recovery_count;
        } else if (result.candidate_type == "maintenance") {
            ++summary.maintenance_count;
        } else if (result.candidate_type == "clientNotice") {
            ++summary.client_notice_count;
        } else if (result.candidate_type == "ruleFollowUp") {
            ++summary.rule_follow_up_count;
        }
        if (!result.blockers.empty()) {
            ++summary.blocked_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20575 function
void AppendV360CommandPlanDryRunResultJson(
    std::ostringstream& out,
    const OpsV360CommandPlanDryRunResult& result) {
    out << "{"
        << "\"resultId\":\"" << JsonEscape(result.result_id) << "\","
        << "\"candidateId\":\"" << JsonEscape(result.candidate_id) << "\","
        << "\"candidateType\":\"" << JsonEscape(result.candidate_type) << "\","
        << "\"sourceId\":\"" << JsonEscape(result.source_id) << "\","
        << "\"dryRunStatus\":\"" << JsonEscape(result.dry_run_status) << "\","
        << "\"predictedResult\":\"" << JsonEscape(result.predicted_result) << "\","
        << "\"writePlan\":\"" << JsonEscape(result.write_plan) << "\","
        << "\"blockers\":";
    AppendV340RecoveryCandidateStringListJson(out, result.blockers);
    out << ",\"dryRunComputed\":" << (result.dry_run_computed ? "true" : "false") << ","
        << "\"sourceRecheckExecuted\":false,"
        << "\"recoveryExecuted\":false,"
        << "\"maintenanceStarted\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"ruleFollowUpApplied\":false"
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20597 function
void AppendV360CommandPlanDryRunSummaryJson(
    std::ostringstream& out,
    const OpsV360CommandPlanDryRunSummary& summary) {
    out << "{"
        << "\"resultCount\":" << summary.result_count << ","
        << "\"sourceRecheckCount\":" << summary.source_recheck_count << ","
        << "\"recoveryCount\":" << summary.recovery_count << ","
        << "\"maintenanceCount\":" << summary.maintenance_count << ","
        << "\"clientNoticeCount\":" << summary.client_notice_count << ","
        << "\"ruleFollowUpCount\":" << summary.rule_follow_up_count << ","
        << "\"blockedCount\":" << summary.blocked_count << ","
        << "\"derivationSource\":\"" << JsonEscape(summary.derivation_source) << "\""
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20612 function
std::string OpsV360CommandPlanDryRunSimulatorJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v360-command-plan-dry-run.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto dryRunResults = BuildV360CommandPlanDryRunResults(commandPlanCandidates);
    const auto summary = BuildV360CommandPlanDryRunSummary(dryRunResults);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v360-command-plan-dry-run.v1\","
        << "\"status\":\"command-plan-dry-run-simulator\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"simulationInputPackRoute\":\"/ops/api/live-operations/simulation/input-pack\","
        << "\"commandPlanRoute\":\"/ops/api/live-operations/command-plan\","
        << "\"commandPlanDryRunSummary\":";
    AppendV360CommandPlanDryRunSummaryJson(out, summary);
    out << ",\"commandPlanDryRunResults\":[";
    for (std::size_t i = 0; i < dryRunResults.size(); ++i) {
        if (i != 0) out << ",";
        AppendV360CommandPlanDryRunResultJson(out, dryRunResults[i]);
    }
    out << "],\"candidatePolicy\":{"
        << "\"sourceRecheck\":\"dry-run-only\","
        << "\"recovery\":\"dry-run-only\","
        << "\"maintenance\":\"dry-run-only\","
        << "\"clientNotice\":\"dry-run-only\","
        << "\"ruleFollowUp\":\"dry-run-only\""
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"dryRunOnly\":true,"
        << "\"sourceRecheckExecuted\":false,"
        << "\"recoveryExecuted\":false,"
        << "\"maintenanceStarted\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"ruleFollowUpApplied\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"commandPlanExecuted\":false,"
        << "\"automaticApplyPerformed\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20691 function
std::vector<OpsV360SourceRuleImpactDiff> BuildV360SourceRuleImpactDiffs(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates,
    const std::vector<OpsV350StagedChangePlan>& stagedChangePlans) {
    (void)context;
    const auto dryRunResults = BuildV360CommandPlanDryRunResults(commandPlanCandidates);
    std::vector<OpsV360SourceRuleImpactDiff> diffs;
    for (const auto& result : dryRunResults) {
        OpsV360SourceRuleImpactDiff diff;
        diff.diff_id = "impact-diff:" + result.candidate_id;
        diff.source_id = result.source_id;
        diff.candidate_id = result.candidate_id;
        diff.candidate_type = result.candidate_type;
        diff.before_state = "beforeState: current source/view/rule projection";
        diff.after_state = "afterState: simulated " + result.candidate_type + " projection";
        diff.source_health_diff =
            result.candidate_type == "sourceRecheck" || result.candidate_type == "recovery"
                ? "sourceHealthDiff: simulated health may improve after operator action"
                : "sourceHealthDiff: no source health change";
        diff.event_risk_diff =
            result.candidate_type == "ruleFollowUp"
                ? "eventRiskDiff: simulated rule follow-up may reduce repeat event risk"
                : "eventRiskDiff: no EventRecord payload change";
        diff.client_impact_diff =
            result.candidate_type == "clientNotice"
                ? "clientImpactDiff: viewer-safe notice candidate"
                : "clientImpactDiff: viewer-safe summary only";
        diff.source_change_candidate =
            result.candidate_type == "sourceRecheck" || result.candidate_type == "recovery"
                ? "sourceChangeCandidate"
                : "not-required";
        diff.rule_change_candidate =
            result.candidate_type == "ruleFollowUp" ? "ruleChangeCandidate" : "not-required";
        diff.blockers = result.blockers;
        for (const auto& plan : stagedChangePlans) {
            if (plan.source_id == result.source_id && plan.candidate_type == result.candidate_type) {
                diff.after_state = "afterState: simulated staged plan " + plan.plan_id;
                break;
            }
        }
        diffs.push_back(std::move(diff));
        if (diffs.size() >= 40U) {
            break;
        }
    }
    return diffs;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20739 function
OpsV360SourceRuleImpactDiffSummary BuildV360SourceRuleImpactDiffSummary(
    const std::vector<OpsV360SourceRuleImpactDiff>& diffs) {
    OpsV360SourceRuleImpactDiffSummary summary;
    summary.derivation_sources = {
        "BuildV350CommandPlanCandidates",
        "BuildV350StagedChangePlans",
        "BuildV360CommandPlanDryRunResults",
    };
    summary.diff_count = static_cast<int>(diffs.size());
    for (const auto& diff : diffs) {
        if (diff.source_health_diff.find("no source health change") == std::string::npos) {
            ++summary.source_health_diff_count;
        }
        if (diff.event_risk_diff.find("no EventRecord") == std::string::npos) {
            ++summary.event_risk_diff_count;
        }
        if (diff.client_impact_diff.find("viewer-safe") != std::string::npos) {
            ++summary.client_impact_diff_count;
        }
        if (diff.rule_change_candidate == "ruleChangeCandidate") {
            ++summary.rule_change_candidate_count;
        }
        if (!diff.blockers.empty()) {
            ++summary.blocked_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20768 function
void AppendV360SourceRuleImpactDiffJson(
    std::ostringstream& out,
    const OpsV360SourceRuleImpactDiff& diff) {
    out << "{"
        << "\"diffId\":\"" << JsonEscape(diff.diff_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(diff.source_id) << "\","
        << "\"candidateId\":\"" << JsonEscape(diff.candidate_id) << "\","
        << "\"candidateType\":\"" << JsonEscape(diff.candidate_type) << "\","
        << "\"beforeState\":\"" << JsonEscape(diff.before_state) << "\","
        << "\"afterState\":\"" << JsonEscape(diff.after_state) << "\","
        << "\"sourceHealthDiff\":\"" << JsonEscape(diff.source_health_diff) << "\","
        << "\"eventRiskDiff\":\"" << JsonEscape(diff.event_risk_diff) << "\","
        << "\"clientImpactDiff\":\"" << JsonEscape(diff.client_impact_diff) << "\","
        << "\"sourceChangeCandidate\":\"" << JsonEscape(diff.source_change_candidate) << "\","
        << "\"ruleChangeCandidate\":\"" << JsonEscape(diff.rule_change_candidate) << "\","
        << "\"blockers\":";
    AppendV340RecoveryCandidateStringListJson(out, diff.blockers);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20788 function
void AppendV360SourceRuleImpactDiffSummaryJson(
    std::ostringstream& out,
    const OpsV360SourceRuleImpactDiffSummary& summary) {
    out << "{"
        << "\"diffCount\":" << summary.diff_count << ","
        << "\"sourceHealthDiffCount\":" << summary.source_health_diff_count << ","
        << "\"eventRiskDiffCount\":" << summary.event_risk_diff_count << ","
        << "\"clientImpactDiffCount\":" << summary.client_impact_diff_count << ","
        << "\"ruleChangeCandidateCount\":" << summary.rule_change_candidate_count << ","
        << "\"blockedCount\":" << summary.blocked_count << ","
        << "\"derivationSources\":";
    AppendV340RecoveryCandidateStringListJson(out, summary.derivation_sources);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20803 function
std::string OpsV360SourceRuleImpactDiffJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v360-source-rule-impact-diff.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans = BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto diffs =
        BuildV360SourceRuleImpactDiffs(context, commandPlanCandidates, stagedChangePlans);
    const auto summary = BuildV360SourceRuleImpactDiffSummary(diffs);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v360-source-rule-impact-diff.v1\","
        << "\"status\":\"source-rule-impact-diff\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"commandPlanDryRunRoute\":\"/ops/api/live-operations/simulation/command-plan-dry-run\","
        << "\"stagedPlanRoute\":\"/ops/api/live-operations/staged-change-plan-impact-preview\","
        << "\"sourceRuleImpactDiffSummary\":";
    AppendV360SourceRuleImpactDiffSummaryJson(out, summary);
    out << ",\"sourceRuleImpactDiffs\":[";
    for (std::size_t i = 0; i < diffs.size(); ++i) {
        if (i != 0) out << ",";
        AppendV360SourceRuleImpactDiffJson(out, diffs[i]);
    }
    out << "],\"diffPolicy\":{"
        << "\"beforeState\":\"current read model\","
        << "\"afterState\":\"simulated projection\","
        << "\"sourceHealthDiff\":\"computed-only\","
        << "\"eventRiskDiff\":\"computed-only\","
        << "\"clientImpactDiff\":\"viewer-safe computed-only\""
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"diffOnly\":true,"
        << "\"sourceHealthChangedPersisted\":false,"
        << "\"eventRiskChangedPersisted\":false,"
        << "\"clientImpactChangedPersisted\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"sourceChangeApplied\":false,"
        << "\"ruleFollowUpApplied\":false,"
        << "\"automaticApplyPerformed\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20885 function
std::vector<OpsV360SafeApplyReadinessItem> BuildV360SafeApplyReadinessItems(
    const std::vector<OpsV360CommandPlanDryRunResult>& dryRunResults,
    const std::vector<OpsV360SourceRuleImpactDiff>& diffs) {
    std::vector<OpsV360SafeApplyReadinessItem> items;
    for (const auto& result : dryRunResults) {
        OpsV360SafeApplyReadinessItem item;
        item.readiness_id = "safe-apply:" + result.candidate_id;
        item.candidate_id = result.candidate_id;
        item.candidate_type = result.candidate_type;
        item.source_id = result.source_id;
        item.blockers = result.blockers;
        item.operator_approval_required = true;
        if (result.candidate_type == "clientNotice") {
            item.readiness_state = "ready";
            item.operator_approval_required = false;
            item.blockers.clear();
        } else if (result.candidate_type == "sourceRecheck") {
            item.readiness_state = "approval-needed";
        } else if (result.candidate_type == "maintenance") {
            item.readiness_state = "field-needed";
            item.field_evidence_required = true;
            item.blockers.push_back("field-evidence-required");
        } else if (result.candidate_type == "ruleFollowUp") {
            item.readiness_state = "not-run";
            item.blockers.push_back("dry-run-not-run");
        } else {
            item.readiness_state = "blocked";
        }
        for (const auto& diff : diffs) {
            if (diff.candidate_id == result.candidate_id &&
                diff.client_impact_diff.find("viewer-safe") == std::string::npos) {
                item.blockers.push_back("client-impact-not-viewer-safe");
            }
        }
        items.push_back(std::move(item));
        if (items.size() >= 40U) {
            break;
        }
    }
    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20927 function
OpsV360SafeApplyReadinessSummary BuildV360SafeApplyReadinessSummary(
    const std::vector<OpsV360SafeApplyReadinessItem>& items) {
    OpsV360SafeApplyReadinessSummary summary;
    summary.derivation_sources = {
        "BuildV360CommandPlanDryRunResults",
        "BuildV360SourceRuleImpactDiffs",
    };
    summary.item_count = static_cast<int>(items.size());
    for (const auto& item : items) {
        if (item.readiness_state == "ready") {
            ++summary.ready_count;
        } else if (item.readiness_state == "blocked") {
            ++summary.blocked_count;
        } else if (item.readiness_state == "approval-needed") {
            ++summary.approval_needed_count;
        } else if (item.readiness_state == "field-needed") {
            ++summary.field_needed_count;
        } else if (item.readiness_state == "not-run") {
            ++summary.not_run_count;
        }
        summary.blocker_count += static_cast<int>(item.blockers.size());
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20952 function
void AppendV360SafeApplyReadinessItemJson(
    std::ostringstream& out,
    const OpsV360SafeApplyReadinessItem& item) {
    out << "{"
        << "\"readinessId\":\"" << JsonEscape(item.readiness_id) << "\","
        << "\"candidateId\":\"" << JsonEscape(item.candidate_id) << "\","
        << "\"candidateType\":\"" << JsonEscape(item.candidate_type) << "\","
        << "\"sourceId\":\"" << JsonEscape(item.source_id) << "\","
        << "\"readinessState\":\"" << JsonEscape(item.readiness_state) << "\","
        << "\"operatorApprovalRequired\":"
        << (item.operator_approval_required ? "true" : "false") << ","
        << "\"fieldEvidenceRequired\":"
        << (item.field_evidence_required ? "true" : "false") << ","
        << "\"blockers\":";
    AppendV340RecoveryCandidateStringListJson(out, item.blockers);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20970 function
void AppendV360SafeApplyReadinessSummaryJson(
    std::ostringstream& out,
    const OpsV360SafeApplyReadinessSummary& summary) {
    out << "{"
        << "\"itemCount\":" << summary.item_count << ","
        << "\"readyCount\":" << summary.ready_count << ","
        << "\"blockedCount\":" << summary.blocked_count << ","
        << "\"approvalNeededCount\":" << summary.approval_needed_count << ","
        << "\"fieldNeededCount\":" << summary.field_needed_count << ","
        << "\"notRunCount\":" << summary.not_run_count << ","
        << "\"blockerCount\":" << summary.blocker_count << ","
        << "\"derivationSources\":";
    AppendV340RecoveryCandidateStringListJson(out, summary.derivation_sources);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20986 function
std::string OpsV360SafeApplyReadinessGateJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v360-safe-apply-readiness.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans = BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto dryRunResults = BuildV360CommandPlanDryRunResults(commandPlanCandidates);
    const auto diffs =
        BuildV360SourceRuleImpactDiffs(context, commandPlanCandidates, stagedChangePlans);
    const auto readinessItems = BuildV360SafeApplyReadinessItems(dryRunResults, diffs);
    const auto summary = BuildV360SafeApplyReadinessSummary(readinessItems);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v360-safe-apply-readiness.v1\","
        << "\"status\":\"safe-apply-readiness-gate\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"commandPlanDryRunRoute\":\"/ops/api/live-operations/simulation/command-plan-dry-run\","
        << "\"impactDiffRoute\":\"/ops/api/live-operations/simulation/impact-diff\","
        << "\"safeApplyReadinessSummary\":";
    AppendV360SafeApplyReadinessSummaryJson(out, summary);
    out << ",\"readinessStateCatalog\":[\"ready\",\"blocked\",\"approval-needed\",\"field-needed\",\"not-run\"],"
        << "\"safeApplyReadinessItems\":[";
    for (std::size_t i = 0; i < readinessItems.size(); ++i) {
        if (i != 0) out << ",";
        AppendV360SafeApplyReadinessItemJson(out, readinessItems[i]);
    }
    out << "],\"gatePolicy\":{"
        << "\"safeApplyGateOnly\":true,"
        << "\"ready\":\"dry-run computed and no blockers\","
        << "\"blocked\":\"blocker present\","
        << "\"approval-needed\":\"operator approval required\","
        << "\"field-needed\":\"field evidence required\","
        << "\"not-run\":\"simulation not executed\""
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"safeApplyGateOnly\":true,"
        << "\"automaticApplyPerformed\":false,"
        << "\"safeApplyPerformed\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"fieldSmokeExecuted\":false,"
        << "\"commandPlanExecuted\":false,"
        << "\"sourceChangeApplied\":false,"
        << "\"ruleFollowUpApplied\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21084 function
const OpsV370SiteAwareSourceRegistryProjectionItem* V370ProjectionForSource(
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection,
    const std::string& source_id) {
    for (const auto& projected : projection) {
        if (std::find(projected.source_ids.begin(), projected.source_ids.end(), source_id) !=
            projected.source_ids.end()) {
            return &projected;
        }
    }
    return nullptr;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21096 function
std::vector<std::string> V370AffectedClientRefsForProjection(
    const OpsV370SiteAwareSourceRegistryProjectionItem* projected) {
    std::vector<std::string> refs;
    if (projected == nullptr) {
        return refs;
    }
    for (const auto& view_id : projected->view_ids) {
        refs.push_back("PublishedView:" + view_id);
    }
    return refs;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21108 function
const OpsV360SourceRuleImpactDiff* V370ImpactDiffForCandidate(
    const std::vector<OpsV360SourceRuleImpactDiff>& diffs,
    const std::string& candidate_id) {
    const auto it = std::find_if(diffs.begin(), diffs.end(), [&](const auto& diff) {
        return diff.candidate_id == candidate_id;
    });
    return it == diffs.end() ? nullptr : &*it;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21117 function
int V370SiteSimulationPackCountForScope(
    const std::vector<OpsV370SiteSimulationInputPackItem>& siteSimulationInputPackItems,
    const std::string& site_id,
    const std::string& source_group) {
    return static_cast<int>(std::count_if(siteSimulationInputPackItems.begin(),
                                          siteSimulationInputPackItems.end(),
                                          [&](const auto& item) {
                                              return item.site_id == site_id &&
                                                     item.source_group == source_group;
                                          }));
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21129 function
std::vector<OpsV370CrossSiteSafeApplyReadinessItem> BuildV370CrossSiteSafeApplyReadinessItems(
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection,
    const std::vector<OpsV370SiteSimulationInputPackItem>& siteSimulationInputPackItems,
    const std::vector<OpsV360SafeApplyReadinessItem>& readinessItems,
    const std::vector<OpsV360SourceRuleImpactDiff>& diffs) {
    std::vector<OpsV370CrossSiteSafeApplyReadinessItem> items;
    items.reserve(readinessItems.size());

    for (const auto& readiness : readinessItems) {
        const auto* projected = V370ProjectionForSource(projection, readiness.source_id);
        const auto* diff = V370ImpactDiffForCandidate(diffs, readiness.candidate_id);
        const auto affectedClientRefs = V370AffectedClientRefsForProjection(projected);
        const std::string siteId = projected == nullptr ? "unassigned-site" : projected->site_id;
        const std::string sourceGroup =
            projected == nullptr ? "unassigned-source-group" : projected->source_group;
        const int siteInputPackCount =
            V370SiteSimulationPackCountForScope(siteSimulationInputPackItems, siteId, sourceGroup);

        OpsV370CrossSiteSafeApplyReadinessItem item;
        item.readiness_id = "cross-site-safe-apply:" + readiness.candidate_id;
        item.candidate_id = readiness.candidate_id;
        item.candidate_type = readiness.candidate_type;
        item.source_id = readiness.source_id;
        item.site_id = siteId;
        item.source_group = sourceGroup;
        item.readiness_state = readiness.readiness_state;
        item.affected_client_refs = affectedClientRefs;
        item.blockers = readiness.blockers;
        item.operator_approval_required = readiness.operator_approval_required;
        item.field_evidence_required = readiness.field_evidence_required;
        item.cross_site_review_required = projected == nullptr || affectedClientRefs.size() > 1U ||
                                          item.readiness_state == "field-needed";
        item.cross_site_impact =
            item.cross_site_review_required ? "cross-site-review-required" : "site-scoped";
        if (projected != nullptr) {
            item.affected_source_ids = projected->source_ids;
        } else if (!readiness.source_id.empty() && readiness.source_id != "pending-source") {
            item.affected_source_ids = {readiness.source_id};
        }
        if (projected == nullptr) {
            item.readiness_state = "blocked";
            item.blockers.push_back("site-projection-missing");
            item.cross_site_impact = "cross-site-review-required";
            item.cross_site_review_required = true;
        }
        if (item.operator_approval_required) {
            item.blockers.push_back("operator-approval-required");
        }
        if (item.field_evidence_required) {
            item.blockers.push_back("field-evidence-required");
        }
        item.evidence_refs = {
            "/ops/api/live-operations/simulation/safe-apply-readiness",
            "/ops/api/site-operations/simulation-input-pack",
            "/ops/api/site-operations/source-registry-projection",
            "/ops/api/site-operations/impact-graph",
            "siteSimulationInputPackCount:" + std::to_string(siteInputPackCount),
        };
        if (diff != nullptr) {
            item.evidence_refs.push_back(diff->diff_id);
            item.evidence_refs.push_back(diff->client_impact_diff);
        }
        items.push_back(std::move(item));
    }
    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21196 function
OpsV370CrossSiteSafeApplyReadinessSummary BuildV370CrossSiteSafeApplyReadinessSummary(
    const std::vector<OpsV370CrossSiteSafeApplyReadinessItem>& items,
    const OpsV360SafeApplyReadinessSummary& v360ReadinessSummary) {
    OpsV370CrossSiteSafeApplyReadinessSummary summary;
    std::vector<std::string> source_groups;
    summary.derivation_sources = {
        "BuildV350LiveOperationsGraphContext",
        "BuildV350CommandPlanCandidates",
        "BuildV350StagedChangePlans",
        "BuildV360CommandPlanDryRunResults",
        "BuildV360SourceRuleImpactDiffs",
        "BuildV360SafeApplyReadinessItems",
        "BuildV360SafeApplyReadinessSummary",
        "BuildV370SiteAwareSourceRegistryProjectionItems",
        "BuildV370SiteSimulationInputPackItems",
        "BuildV370SiteImpactGraphNodes",
        "BuildV370SiteImpactGraphEdges",
    };
    summary.item_count = static_cast<int>(items.size());
    summary.ready_count = v360ReadinessSummary.ready_count;
    summary.approval_needed_count = v360ReadinessSummary.approval_needed_count;
    summary.field_needed_count = v360ReadinessSummary.field_needed_count;
    summary.not_run_count = v360ReadinessSummary.not_run_count;
    for (const auto& item : items) {
        if (item.readiness_state == "blocked") {
            ++summary.blocked_count;
        }
        if (item.cross_site_review_required) {
            ++summary.cross_site_review_required_count;
        }
        summary.blocker_count += static_cast<int>(item.blockers.size());
        summary.affected_client_count += static_cast<int>(item.affected_client_refs.size());
        AddV370UniqueString(&source_groups, item.site_id + ":" + item.source_group);
    }
    summary.source_group_count = static_cast<int>(source_groups.size());
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21234 function
void AppendV370CrossSiteSafeApplyReadinessItemJson(
    std::ostringstream& out,
    const OpsV370CrossSiteSafeApplyReadinessItem& item) {
    out << "{"
        << "\"readinessId\":\"" << JsonEscape(item.readiness_id) << "\","
        << "\"candidateId\":\"" << JsonEscape(item.candidate_id) << "\","
        << "\"candidateType\":\"" << JsonEscape(item.candidate_type) << "\","
        << "\"sourceId\":\"" << JsonEscape(item.source_id) << "\","
        << "\"siteId\":\"" << JsonEscape(item.site_id) << "\","
        << "\"sourceGroup\":\"" << JsonEscape(item.source_group) << "\","
        << "\"readinessState\":\"" << JsonEscape(item.readiness_state) << "\","
        << "\"crossSiteImpact\":\"" << JsonEscape(item.cross_site_impact) << "\","
        << "\"operatorApprovalRequired\":"
        << (item.operator_approval_required ? "true" : "false") << ","
        << "\"fieldEvidenceRequired\":"
        << (item.field_evidence_required ? "true" : "false") << ","
        << "\"crossSiteReviewRequired\":"
        << (item.cross_site_review_required ? "true" : "false") << ","
        << "\"affectedSourceIds\":";
    AppendJsonStringArray(out, item.affected_source_ids);
    out << ",\"affectedClientRefs\":";
    AppendJsonStringArray(out, item.affected_client_refs);
    out << ",\"blockers\":";
    AppendJsonStringArray(out, item.blockers);
    out << ",\"evidenceRefs\":";
    AppendJsonStringArray(out, item.evidence_refs);
    out << ",\"readOnly\":" << (item.read_only ? "true" : "false")
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21264 function
void AppendV370CrossSiteSafeApplyReadinessSummaryJson(
    std::ostringstream& out,
    const OpsV370CrossSiteSafeApplyReadinessSummary& summary) {
    out << "{"
        << "\"itemCount\":" << summary.item_count << ","
        << "\"readyCount\":" << summary.ready_count << ","
        << "\"blockedCount\":" << summary.blocked_count << ","
        << "\"approvalNeededCount\":" << summary.approval_needed_count << ","
        << "\"fieldNeededCount\":" << summary.field_needed_count << ","
        << "\"notRunCount\":" << summary.not_run_count << ","
        << "\"blockerCount\":" << summary.blocker_count << ","
        << "\"affectedClientCount\":" << summary.affected_client_count << ","
        << "\"crossSiteReviewRequiredCount\":" << summary.cross_site_review_required_count << ","
        << "\"sourceGroupCount\":" << summary.source_group_count << ","
        << "\"derivationSources\":";
    AppendJsonStringArray(out, summary.derivation_sources);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21283 function
std::string OpsV370CrossSiteSafeApplyReadinessJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v370-cross-site-safe-apply-readiness.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans = BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto dryRunResults = BuildV360CommandPlanDryRunResults(commandPlanCandidates);
    const auto impactDiffs =
        BuildV360SourceRuleImpactDiffs(context, commandPlanCandidates, stagedChangePlans);
    const auto v360ReadinessItems = BuildV360SafeApplyReadinessItems(dryRunResults, impactDiffs);
    const auto v360ReadinessSummary = BuildV360SafeApplyReadinessSummary(v360ReadinessItems);
    const auto v360InputPackItems =
        BuildV360SimulationInputPackItems(context, commandPlanCandidates, stagedChangePlans);
    const auto projection =
        BuildV370SiteAwareSourceRegistryProjectionItems(context.sources, context.views);
    const auto rollups =
        BuildV370SiteHealthRollupItems(context.sources, context.views, source_health_snapshot);
    const auto impactGraphNodes = BuildV370SiteImpactGraphNodes(context, projection, rollups);
    const auto impactGraphEdges = BuildV370SiteImpactGraphEdges(projection);
    const auto siteSimulationInputPackItems =
        BuildV370SiteSimulationInputPackItems(context,
                                             projection,
                                             rollups,
                                             impactGraphNodes,
                                             impactGraphEdges,
                                             v360InputPackItems);
    const auto readinessItems =
        BuildV370CrossSiteSafeApplyReadinessItems(projection,
                                                 siteSimulationInputPackItems,
                                                 v360ReadinessItems,
                                                 impactDiffs);
    const auto summary =
        BuildV370CrossSiteSafeApplyReadinessSummary(readinessItems, v360ReadinessSummary);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v370-cross-site-safe-apply-readiness.v1\","
        << "\"status\":\"cross-site-safe-apply-readiness\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"safeApplyReadinessRoute\":\"/ops/api/live-operations/simulation/safe-apply-readiness\","
        << "\"siteSimulationInputPackRoute\":\"/ops/api/site-operations/simulation-input-pack\","
        << "\"siteRegistryProjectionRoute\":\"/ops/api/site-operations/source-registry-projection\","
        << "\"siteImpactGraphRoute\":\"/ops/api/site-operations/impact-graph\","
        << "\"readinessStateCatalog\":[\"ready\",\"blocked\",\"approval-needed\",\"field-needed\",\"not-run\"],"
        << "\"crossSiteSafeApplyReadinessSummary\":";
    AppendV370CrossSiteSafeApplyReadinessSummaryJson(out, summary);
    out << ",\"crossSiteSafeApplyReadinessItems\":[";
    for (std::size_t i = 0; i < readinessItems.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV370CrossSiteSafeApplyReadinessItemJson(out, readinessItems[i]);
    }
    out << "],\"readinessPolicy\":{"
        << "\"ready\":\"safe apply candidate is only ready when v3.6 gate is ready\","
        << "\"blocked\":\"site projection or blocker prevents apply\","
        << "\"approval-needed\":\"operator approval required before any apply\","
        << "\"field-needed\":\"field evidence required before any apply\","
        << "\"affectedClientRefs\":\"PublishedView refs only; no client payload is sent\","
        << "\"crossSiteSafeApplyReadinessOnly\":true"
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"crossSiteSafeApplyReadinessOnly\":true,"
        << "\"automaticApplyPerformed\":false,"
        << "\"safeApplyPerformed\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"fieldSmokeExecuted\":false,"
        << "\"commandPlanExecuted\":false,"
        << "\"sourceChangeApplied\":false,"
        << "\"ruleFollowUpApplied\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21407 function
std::string V370RunbookTemplateTypeForCandidate(const std::string& candidate_type) {
    if (candidate_type == "sourceRecheck" || candidate_type == "recovery") {
        return "source-recheck";
    }
    if (candidate_type == "maintenance") {
        return "maintenance";
    }
    if (candidate_type == "ruleFollowUp") {
        return "rule-draft";
    }
    if (candidate_type == "clientNotice") {
        return "client-notice";
    }
    return {};
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21423 function
const OpsV360SafeApplyReadinessItem* V370ReadinessForCandidate(
    const std::vector<OpsV360SafeApplyReadinessItem>& readiness_items,
    const std::string& candidate_id) {
    const auto it = std::find_if(readiness_items.begin(), readiness_items.end(), [&](const auto& item) {
        return item.candidate_id == candidate_id;
    });
    return it == readiness_items.end() ? nullptr : &*it;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21432 function
const OpsV370CrossSiteSafeApplyReadinessItem* V370CrossSiteReadinessForCandidate(
    const std::vector<OpsV370CrossSiteSafeApplyReadinessItem>& readiness_items,
    const std::string& candidate_id) {
    const auto it = std::find_if(readiness_items.begin(), readiness_items.end(), [&](const auto& item) {
        return item.candidate_id == candidate_id;
    });
    return it == readiness_items.end() ? nullptr : &*it;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21441 function
bool V370RunbookTemplateHasType(
    const std::vector<OpsV370RunbookTemplateContractItem>& items,
    const std::string& template_type) {
    return std::any_of(items.begin(), items.end(), [&](const auto& item) {
        return item.template_type == template_type;
    });
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21449 function
std::vector<OpsV370RunbookTemplateContractItem> BuildV370RunbookTemplateContractItems(
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates,
    const std::vector<OpsV360CommandPlanDryRunResult>& dryRunResults,
    const std::vector<OpsV360SourceRuleImpactDiff>& impactDiffs,
    const std::vector<OpsV360SafeApplyReadinessItem>& readinessItems,
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection,
    const std::vector<OpsV370SiteSimulationInputPackItem>& siteSimulationInputPackItems,
    const std::vector<OpsV370CrossSiteSafeApplyReadinessItem>& crossSiteReadinessItems) {
    std::vector<OpsV370RunbookTemplateContractItem> items;

    const auto append_template = [&](const std::string& candidate_id,
                                     const std::string& candidate_type,
                                     const std::string& source_id,
                                     const std::string& default_route) {
        const std::string template_type = V370RunbookTemplateTypeForCandidate(candidate_type);
        if (template_type.empty()) {
            return;
        }
        const auto* projected = V370ProjectionForSource(projection, source_id);
        const auto* readiness = V370ReadinessForCandidate(readinessItems, candidate_id);
        const auto* cross_site_readiness =
            V370CrossSiteReadinessForCandidate(crossSiteReadinessItems, candidate_id);
        const auto* diff = V370ImpactDiffForCandidate(impactDiffs, candidate_id);
        const std::string site_id = projected == nullptr ? "unassigned-site" : projected->site_id;
        const std::string source_group =
            projected == nullptr ? "unassigned-source-group" : projected->source_group;
        const int site_input_pack_count =
            V370SiteSimulationPackCountForScope(siteSimulationInputPackItems, site_id, source_group);

        OpsV370RunbookTemplateContractItem item;
        item.runbook_template_id = "runbook-template:" + template_type + ":" +
                                   (source_id.empty() ? candidate_id : source_id);
        item.template_type = template_type;
        item.candidate_id = candidate_id;
        item.candidate_type = candidate_type;
        item.site_id = site_id;
        item.source_group = source_group;
        item.required_inputs = {
            "siteId",
            "sourceGroup",
            "candidateId",
            "safeApplyReadinessRef",
            "operatorReviewReason",
        };
        if (template_type == "source-recheck") {
            item.required_inputs.push_back("sourceHealthSnapshot");
        } else if (template_type == "maintenance") {
            item.required_inputs.push_back("maintenanceWindow");
        } else if (template_type == "rule-draft") {
            item.required_inputs.push_back("ruleDraftRef");
        } else if (template_type == "client-notice") {
            item.required_inputs.push_back("viewerSafeNoticePreview");
        }
        item.approval_state_catalog = {"approval", "hold", "reject", "field-needed"};
        item.output_refs = {
            default_route,
            "/ops/api/site-operations/runbook-instance-ledger",
            "/ops/api/site-operations/approval-ticket-workflow",
        };
        item.evidence_refs = {
            "/ops/api/site-operations/simulation-input-pack",
            "/ops/api/site-operations/cross-site-safe-apply-readiness",
            "siteSimulationInputPackCount:" + std::to_string(site_input_pack_count),
            candidate_id,
        };
        if (readiness != nullptr) {
            item.operator_approval_required = readiness->operator_approval_required;
            item.field_evidence_required = readiness->field_evidence_required;
            item.evidence_refs.push_back(readiness->readiness_id);
        }
        if (cross_site_readiness != nullptr) {
            item.evidence_refs.push_back(cross_site_readiness->readiness_id);
        }
        if (diff != nullptr) {
            item.evidence_refs.push_back(diff->diff_id);
        }
        items.push_back(std::move(item));
    };

    for (const auto& candidate : commandPlanCandidates) {
        append_template(candidate.candidate_id,
                        candidate.candidate_type,
                        candidate.source_id,
                        candidate.route.empty() ? "/ops/api/live-operations/command-plan"
                                                : candidate.route);
        if (items.size() >= 20U) {
            break;
        }
    }

    const std::vector<std::pair<std::string, std::string>> required_templates = {
        {"source-recheck", "sourceRecheck"},
        {"maintenance", "maintenance"},
        {"rule-draft", "ruleFollowUp"},
        {"client-notice", "clientNotice"},
    };
    for (const auto& [template_type, candidate_type] : required_templates) {
        if (!V370RunbookTemplateHasType(items, template_type)) {
            append_template("candidate:default:" + candidate_type,
                            candidate_type,
                            "pending-source",
                            "/ops/api/site-operations/runbook-template-contract");
        }
    }
    (void)dryRunResults;
    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21557 function
OpsV370RunbookTemplateContractSummary BuildV370RunbookTemplateContractSummary(
    const std::vector<OpsV370RunbookTemplateContractItem>& items) {
    OpsV370RunbookTemplateContractSummary summary;
    summary.derivation_sources = {
        "BuildV350LiveOperationsGraphContext",
        "BuildV350CommandPlanCandidates",
        "BuildV360CommandPlanDryRunResults",
        "BuildV360SourceRuleImpactDiffs",
        "BuildV360SafeApplyReadinessItems",
        "BuildV370SiteAwareSourceRegistryProjectionItems",
        "BuildV370SiteSimulationInputPackItems",
        "BuildV370CrossSiteSafeApplyReadinessItems",
    };
    summary.template_count = static_cast<int>(items.size());
    for (const auto& item : items) {
        if (item.template_type == "source-recheck") {
            ++summary.source_recheck_count;
        } else if (item.template_type == "maintenance") {
            ++summary.maintenance_count;
        } else if (item.template_type == "rule-draft") {
            ++summary.rule_draft_count;
        } else if (item.template_type == "client-notice") {
            ++summary.client_notice_count;
        }
        if (item.operator_approval_required) {
            ++summary.approval_required_count;
        }
        if (item.field_evidence_required) {
            ++summary.field_required_count;
        }
        for (const auto& ref : item.evidence_refs) {
            if (ref.rfind("cross-site-safe-apply:", 0) == 0) {
                ++summary.cross_site_readiness_ref_count;
            }
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21596 function
void AppendV370RunbookTemplateContractSummaryJson(
    std::ostringstream& out,
    const OpsV370RunbookTemplateContractSummary& summary) {
    out << "{"
        << "\"templateCount\":" << summary.template_count << ","
        << "\"sourceRecheckCount\":" << summary.source_recheck_count << ","
        << "\"maintenanceCount\":" << summary.maintenance_count << ","
        << "\"ruleDraftCount\":" << summary.rule_draft_count << ","
        << "\"clientNoticeCount\":" << summary.client_notice_count << ","
        << "\"approvalRequiredCount\":" << summary.approval_required_count << ","
        << "\"fieldRequiredCount\":" << summary.field_required_count << ","
        << "\"crossSiteReadinessRefCount\":" << summary.cross_site_readiness_ref_count << ","
        << "\"derivationSources\":";
    AppendJsonStringArray(out, summary.derivation_sources);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21613 function
void AppendV370RunbookTemplateContractItemJson(
    std::ostringstream& out,
    const OpsV370RunbookTemplateContractItem& item) {
    out << "{"
        << "\"runbookTemplateId\":\"" << JsonEscape(item.runbook_template_id) << "\","
        << "\"templateType\":\"" << JsonEscape(item.template_type) << "\","
        << "\"candidateId\":\"" << JsonEscape(item.candidate_id) << "\","
        << "\"candidateType\":\"" << JsonEscape(item.candidate_type) << "\","
        << "\"siteId\":\"" << JsonEscape(item.site_id) << "\","
        << "\"sourceGroup\":\"" << JsonEscape(item.source_group) << "\","
        << "\"reviewPolicy\":\"" << JsonEscape(item.review_policy) << "\","
        << "\"operatorApprovalRequired\":"
        << (item.operator_approval_required ? "true" : "false") << ","
        << "\"fieldEvidenceRequired\":"
        << (item.field_evidence_required ? "true" : "false") << ","
        << "\"requiredInputs\":";
    AppendJsonStringArray(out, item.required_inputs);
    out << ",\"approvalStateCatalog\":";
    AppendJsonStringArray(out, item.approval_state_catalog);
    out << ",\"outputRefs\":";
    AppendJsonStringArray(out, item.output_refs);
    out << ",\"evidenceRefs\":";
    AppendJsonStringArray(out, item.evidence_refs);
    out << ",\"readOnly\":" << (item.read_only ? "true" : "false")
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21640 function
std::string OpsV370RunbookTemplateContractJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v370-runbook-template-contract.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans = BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto dryRunResults = BuildV360CommandPlanDryRunResults(commandPlanCandidates);
    const auto impactDiffs =
        BuildV360SourceRuleImpactDiffs(context, commandPlanCandidates, stagedChangePlans);
    const auto readinessItems = BuildV360SafeApplyReadinessItems(dryRunResults, impactDiffs);
    const auto v360InputPackItems =
        BuildV360SimulationInputPackItems(context, commandPlanCandidates, stagedChangePlans);
    const auto projection =
        BuildV370SiteAwareSourceRegistryProjectionItems(context.sources, context.views);
    const auto rollups =
        BuildV370SiteHealthRollupItems(context.sources, context.views, source_health_snapshot);
    const auto impactGraphNodes = BuildV370SiteImpactGraphNodes(context, projection, rollups);
    const auto impactGraphEdges = BuildV370SiteImpactGraphEdges(projection);
    const auto siteSimulationInputPackItems =
        BuildV370SiteSimulationInputPackItems(context,
                                             projection,
                                             rollups,
                                             impactGraphNodes,
                                             impactGraphEdges,
                                             v360InputPackItems);
    const auto crossSiteReadinessItems =
        BuildV370CrossSiteSafeApplyReadinessItems(projection,
                                                 siteSimulationInputPackItems,
                                                 readinessItems,
                                                 impactDiffs);
    const auto runbookTemplateContractItems =
        BuildV370RunbookTemplateContractItems(commandPlanCandidates,
                                             dryRunResults,
                                             impactDiffs,
                                             readinessItems,
                                             projection,
                                             siteSimulationInputPackItems,
                                             crossSiteReadinessItems);
    const auto summary =
        BuildV370RunbookTemplateContractSummary(runbookTemplateContractItems);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v370-runbook-template-contract.v1\","
        << "\"status\":\"runbook-template-contract\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"siteSimulationInputPackRoute\":\"/ops/api/site-operations/simulation-input-pack\","
        << "\"crossSiteSafeApplyReadinessRoute\":\"/ops/api/site-operations/cross-site-safe-apply-readiness\","
        << "\"runbookInstanceLedgerRoute\":\"/ops/api/site-operations/runbook-instance-ledger\","
        << "\"approvalTicketWorkflowRoute\":\"/ops/api/site-operations/approval-ticket-workflow\","
        << "\"templateTypeCatalog\":[\"source-recheck\",\"maintenance\",\"rule-draft\",\"client-notice\"],"
        << "\"runbookTemplateContractSummary\":";
    AppendV370RunbookTemplateContractSummaryJson(out, summary);
    out << ",\"runbookTemplateContractItems\":[";
    for (std::size_t i = 0; i < runbookTemplateContractItems.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV370RunbookTemplateContractItemJson(out, runbookTemplateContractItems[i]);
    }
    out << "],\"templatePolicy\":{"
        << "\"requiredInputs\":\"site/source group, candidate ref, readiness ref, operator review reason\","
        << "\"approvalStateCatalog\":[\"approval\",\"hold\",\"reject\",\"field-needed\"],"
        << "\"outputRefs\":\"ledger and approval ticket routes only; no execution route is invoked\","
        << "\"runbookTemplateContractOnly\":true"
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"runbookTemplateContractOnly\":true,"
        << "\"runbookInstancePersisted\":false,"
        << "\"approvalTicketWritePerformed\":false,"
        << "\"operatorNoteWritePerformed\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"fieldSmokeExecuted\":false,"
        << "\"commandPlanExecuted\":false,"
        << "\"automaticApplyPerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21765 function
std::vector<OpsV360SimulationRunLedgerEntry> BuildV360SimulationRunLedgerEntries(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV360SimulationInputPackItem>& inputPackItems,
    const OpsV360SimulationRunContract& simulationRunContract,
    const OpsV360SimulationResultEnvelope& simulationResultEnvelope,
    const std::vector<OpsV360CommandPlanDryRunResult>& dryRunResults,
    const std::vector<OpsV360SourceRuleImpactDiff>& impactDiffs,
    const std::vector<OpsV360SafeApplyReadinessItem>& readinessItems) {
    // Simulation run ledger는 기존 read model을 append-only projection처럼 보여줄 뿐 저장하지 않습니다.
    (void)context;
    (void)simulationRunContract;
    (void)simulationResultEnvelope;
    std::vector<OpsV360SimulationRunLedgerEntry> entries;
    int run_index = 0;
    const std::string default_input_ref =
        inputPackItems.empty() ? "/ops/api/live-operations/simulation/input-pack"
                               : inputPackItems.front().input_id;

    for (const auto& result : dryRunResults) {
        const auto diff_it = std::find_if(
            impactDiffs.begin(),
            impactDiffs.end(),
            [&](const OpsV360SourceRuleImpactDiff& diff) {
                return diff.candidate_id == result.candidate_id;
            });
        const auto readiness_it = std::find_if(
            readinessItems.begin(),
            readinessItems.end(),
            [&](const OpsV360SafeApplyReadinessItem& item) {
                return item.candidate_id == result.candidate_id;
            });
        const std::string source_key =
            result.source_id.empty() ? "unknown-source" : result.source_id;
        const std::string input_ref =
            "inputRef:" + default_input_ref + ":" + result.candidate_id;
        const std::string previous_run_id =
            "simulation-run:" + source_key + ":previous-" + std::to_string(run_index + 1);
        const std::string current_run_id =
            "simulation-run:" + source_key + ":current-" + std::to_string(run_index + 1);

        OpsV360SimulationRunLedgerEntry previous;
        previous.simulation_run_id = previous_run_id;
        previous.input_ref = input_ref;
        previous.source_id = source_key;
        previous.candidate_id = result.candidate_id;
        previous.readiness_state = "previous-observed";
        previous.result_diff = "baseline previous simulation result";
        previous.operator_note = "previous operator note retained for resultDiff comparison";
        previous.blocker = "previous-blocker-observed";
        previous.evidence_refs = {
            "/ops/api/live-operations/simulation/input-pack",
            "/ops/api/live-operations/simulation/run-contract",
        };
        previous.changed_fields = {"baseline"};
        previous.accumulated_run_count = 1;
        entries.push_back(std::move(previous));

        OpsV360SimulationRunLedgerEntry current;
        current.simulation_run_id = current_run_id;
        current.input_ref = input_ref;
        current.source_id = source_key;
        current.candidate_id = result.candidate_id;
        current.readiness_state =
            readiness_it == readinessItems.end() ? "not-run" : readiness_it->readiness_state;
        current.operator_note =
            "operator-note-required before simulation promotion; review resultDiff and readiness blockers";
        std::vector<std::string> blockers = result.blockers;
        if (readiness_it != readinessItems.end()) {
            blockers.insert(blockers.end(),
                            readiness_it->blockers.begin(),
                            readiness_it->blockers.end());
        }
        current.blocker = blockers.empty() ? "none" : JoinV340ApprovalRecoveryStrings(blockers, ", ");
        current.result_diff =
            "resultDiff compares dry-run output, impact diff, readiness blocker to previous run";
        if (diff_it != impactDiffs.end()) {
            current.result_diff += "; " + diff_it->source_health_diff + "; " +
                                   diff_it->event_risk_diff + "; " +
                                   diff_it->client_impact_diff;
        }
        current.evidence_refs = {
            "/ops/api/live-operations/simulation/input-pack",
            "/ops/api/live-operations/simulation/run-contract",
            "/ops/api/live-operations/simulation/command-plan-dry-run",
            "/ops/api/live-operations/simulation/impact-diff",
            "/ops/api/live-operations/simulation/safe-apply-readiness",
            result.candidate_id,
        };
        if (diff_it != impactDiffs.end()) {
            current.evidence_refs.push_back(diff_it->diff_id);
        }
        current.previous_run_id = previous_run_id;
        current.compared_to_run_id = previous_run_id;
        current.changed_fields = {"inputRefDelta", "resultDiffDelta", "readinessBlockerDelta"};
        current.accumulated_run_count = 2;
        entries.push_back(std::move(current));

        ++run_index;
        if (entries.size() >= 24U) {
            break;
        }
    }

    if (entries.empty()) {
        OpsV360SimulationRunLedgerEntry empty;
        empty.simulation_run_id = "simulation-run:pending:current-1";
        empty.input_ref = default_input_ref;
        empty.source_id = "pending-source";
        empty.result_diff = "resultDiff pending because no dry-run result exists";
        empty.operator_note = "operator-note-required after simulation dry-run result is available";
        empty.blocker = "dry-run-result-missing";
        empty.evidence_refs = {
            "/ops/api/live-operations/simulation/input-pack",
            "/ops/api/live-operations/simulation/command-plan-dry-run",
        };
        empty.changed_fields = {"missingDryRunResult"};
        entries.push_back(std::move(empty));
    }
    return entries;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21886 function
OpsV360SimulationRunLedgerSummary BuildV360SimulationRunLedgerSummary(
    const std::vector<OpsV360SimulationRunLedgerEntry>& entries) {
    OpsV360SimulationRunLedgerSummary summary;
    summary.run_count = static_cast<int>(entries.size());
    for (const auto& entry : entries) {
        if (!entry.previous_run_id.empty() || !entry.compared_to_run_id.empty()) {
            ++summary.comparison_count;
        }
        if (!entry.blocker.empty() && entry.blocker != "none") {
            ++summary.blocker_count;
        }
        if (!entry.operator_note.empty()) {
            ++summary.operator_note_count;
        }
        summary.changed_field_count += static_cast<int>(entry.changed_fields.size());
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21905 function
void AppendV360SimulationRunLedgerSummaryJson(
    std::ostringstream& out,
    const OpsV360SimulationRunLedgerSummary& summary) {
    out << "{"
        << "\"runCount\":" << summary.run_count << ","
        << "\"comparisonCount\":" << summary.comparison_count << ","
        << "\"blockerCount\":" << summary.blocker_count << ","
        << "\"operatorNoteCount\":" << summary.operator_note_count << ","
        << "\"changedFieldCount\":" << summary.changed_field_count
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21917 function
void AppendV360SimulationRunLedgerEntryJson(
    std::ostringstream& out,
    const OpsV360SimulationRunLedgerEntry& entry) {
    out << "{"
        << "\"simulationRunId\":\"" << JsonEscape(entry.simulation_run_id) << "\","
        << "\"inputRef\":\"" << JsonEscape(entry.input_ref) << "\","
        << "\"sourceId\":\"" << JsonEscape(entry.source_id) << "\","
        << "\"candidateId\":\"" << JsonEscape(entry.candidate_id) << "\","
        << "\"readinessState\":\"" << JsonEscape(entry.readiness_state) << "\","
        << "\"resultDiff\":\"" << JsonEscape(entry.result_diff) << "\","
        << "\"operatorNote\":\"" << JsonEscape(entry.operator_note) << "\","
        << "\"blocker\":\"" << JsonEscape(entry.blocker) << "\","
        << "\"evidenceRefs\":";
    AppendV340RecoveryCandidateStringListJson(out, entry.evidence_refs);
    out << ",\"previousRunId\":\"" << JsonEscape(entry.previous_run_id) << "\","
        << "\"comparedToRunId\":\"" << JsonEscape(entry.compared_to_run_id) << "\","
        << "\"changedFields\":";
    AppendV340RecoveryCandidateStringListJson(out, entry.changed_fields);
    out << ",\"accumulatedRunCount\":" << entry.accumulated_run_count << ","
        << "\"readOnly\":" << (entry.read_only ? "true" : "false")
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21940 function
std::string OpsV360SimulationRunLedgerComparisonJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v360-simulation-run-ledger.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans = BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto inputPackItems =
        BuildV360SimulationInputPackItems(context, commandPlanCandidates, stagedChangePlans);
    const auto inputSummary = BuildV360SimulationInputPackSummary(inputPackItems);
    const auto simulationRunContract = BuildV360SimulationRunContract();
    const auto simulationResultEnvelope = BuildV360SimulationResultEnvelope(inputSummary);
    const auto dryRunResults = BuildV360CommandPlanDryRunResults(commandPlanCandidates);
    const auto impactDiffs =
        BuildV360SourceRuleImpactDiffs(context, commandPlanCandidates, stagedChangePlans);
    const auto readinessItems = BuildV360SafeApplyReadinessItems(dryRunResults, impactDiffs);
    const auto ledgerEntries =
        BuildV360SimulationRunLedgerEntries(context,
                                            inputPackItems,
                                            simulationRunContract,
                                            simulationResultEnvelope,
                                            dryRunResults,
                                            impactDiffs,
                                            readinessItems);
    const auto summary = BuildV360SimulationRunLedgerSummary(ledgerEntries);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v360-simulation-run-ledger.v1\","
        << "\"status\":\"simulation-run-ledger-comparison\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"inputPackRoute\":\"/ops/api/live-operations/simulation/input-pack\","
        << "\"runContractRoute\":\"/ops/api/live-operations/simulation/run-contract\","
        << "\"commandPlanDryRunRoute\":\"/ops/api/live-operations/simulation/command-plan-dry-run\","
        << "\"impactDiffRoute\":\"/ops/api/live-operations/simulation/impact-diff\","
        << "\"readinessRoute\":\"/ops/api/live-operations/simulation/safe-apply-readiness\","
        << "\"simulationRunLedgerSummary\":";
    AppendV360SimulationRunLedgerSummaryJson(out, summary);
    out << ",\"simulationRunLedgerEntries\":[";
    for (std::size_t i = 0; i < ledgerEntries.size(); ++i) {
        if (i != 0) out << ",";
        AppendV360SimulationRunLedgerEntryJson(out, ledgerEntries[i]);
    }
    out << "],\"comparisonPolicy\":{"
        << "\"mode\":\"previous-run-diff\","
        << "\"inputRefField\":\"inputRef\","
        << "\"resultDiffField\":\"resultDiff\","
        << "\"operatorNote\":\"display-only-not-persisted\","
        << "\"previousRunIdField\":\"previousRunId\","
        << "\"comparedToRunIdField\":\"comparedToRunId\","
        << "\"diffFields\":[\"inputRefDelta\",\"resultDiffDelta\",\"readinessBlockerDelta\"]"
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"appendOnlyLedgerProjection\":true,"
        << "\"simulationRunPersisted\":false,"
        << "\"simulationRunExecuted\":false,"
        << "\"operatorNoteWritePerformed\":false,"
        << "\"resultDiffPersisted\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"rawDiagnosticJsonIncluded\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22050 function
const OpsV360SimulationRunLedgerEntry* V370SimulationLedgerEntryForCandidate(
    const std::vector<OpsV360SimulationRunLedgerEntry>& simulationRunLedgerEntries,
    const std::string& candidate_id) {
    const auto it =
        std::find_if(simulationRunLedgerEntries.rbegin(),
                     simulationRunLedgerEntries.rend(),
                     [&](const OpsV360SimulationRunLedgerEntry& entry) {
                         return entry.candidate_id == candidate_id &&
                                (!entry.previous_run_id.empty() ||
                                 !entry.compared_to_run_id.empty());
                     });
    return it == simulationRunLedgerEntries.rend() ? nullptr : &*it;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22064 function
std::string V370RunbookLedgerStatusFor(
    const OpsV370RunbookTemplateContractItem& item,
    const OpsV370CrossSiteSafeApplyReadinessItem* readiness) {
    if (readiness != nullptr && !readiness->readiness_state.empty()) {
        return readiness->readiness_state;
    }
    if (item.field_evidence_required) {
        return "field-needed";
    }
    if (item.operator_approval_required) {
        return "approval-needed";
    }
    return "not-run";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22079 function
std::vector<OpsV370RunbookInstanceLedgerEntry> BuildV370RunbookInstanceLedgerEntries(
    const std::vector<OpsV370RunbookTemplateContractItem>& runbookTemplateContractItems,
    const std::vector<OpsV370CrossSiteSafeApplyReadinessItem>& crossSiteReadinessItems,
    const std::vector<OpsV360SimulationRunLedgerEntry>& simulationRunLedgerEntries) {
    std::vector<OpsV370RunbookInstanceLedgerEntry> entries;
    int index = 0;
    for (const auto& item : runbookTemplateContractItems) {
        const auto* readiness =
            V370CrossSiteReadinessForCandidate(crossSiteReadinessItems, item.candidate_id);
        const auto* previous_run =
            V370SimulationLedgerEntryForCandidate(simulationRunLedgerEntries, item.candidate_id);

        OpsV370RunbookInstanceLedgerEntry entry;
        entry.runbook_id = "runbook:" + item.runbook_template_id + ":" + std::to_string(index + 1);
        entry.runbook_template_id = item.runbook_template_id;
        entry.candidate_id = item.candidate_id;
        entry.site_id = item.site_id;
        entry.source_group = item.source_group;
        entry.status = V370RunbookLedgerStatusFor(item, readiness);
        entry.operator_note =
            "operatorNote: review required before promotion; note is displayed but not persisted";
        entry.status_history = {
            "created:read-only-projection",
            "status:" + entry.status,
            "operatorNote:display-only",
        };
        entry.evidence_refs = {
            "/ops/api/site-operations/runbook-template-contract",
            "/ops/api/site-operations/cross-site-safe-apply-readiness",
            item.runbook_template_id,
            item.candidate_id,
        };
        if (readiness != nullptr) {
            entry.evidence_refs.push_back(readiness->readiness_id);
        }
        if (previous_run != nullptr) {
            entry.previous_run_id = previous_run->previous_run_id;
            entry.compared_to_run_id = previous_run->compared_to_run_id;
            entry.previous_run_comparison =
                "previousRunComparison: comparedToRunId=" + previous_run->compared_to_run_id +
                "; resultDiff=" + previous_run->result_diff;
            entry.evidence_refs.push_back(previous_run->simulation_run_id);
        } else {
            entry.previous_run_comparison =
                "previousRunComparison: no persisted runbook execution exists; compare template and readiness refs only";
        }
        entries.push_back(std::move(entry));
        ++index;
        if (entries.size() >= 24U) {
            break;
        }
    }
    return entries;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22134 function
OpsV370RunbookInstanceLedgerSummary BuildV370RunbookInstanceLedgerSummary(
    const std::vector<OpsV370RunbookInstanceLedgerEntry>& entries) {
    OpsV370RunbookInstanceLedgerSummary summary;
    summary.derivation_sources = {
        "BuildV370RunbookTemplateContractItems",
        "BuildV370RunbookTemplateContractSummary",
        "BuildV370CrossSiteSafeApplyReadinessItems",
        "BuildV360SimulationRunLedgerEntries",
    };
    summary.runbook_count = static_cast<int>(entries.size());
    for (const auto& entry : entries) {
        if (entry.status == "approval-needed") {
            ++summary.approval_needed_count;
        } else if (entry.status == "field-needed") {
            ++summary.field_needed_count;
        } else if (entry.status == "blocked") {
            ++summary.blocked_count;
        }
        if (!entry.previous_run_comparison.empty()) {
            ++summary.previous_run_comparison_count;
        }
        if (!entry.operator_note.empty()) {
            ++summary.operator_note_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22162 function
void AppendV370RunbookInstanceLedgerSummaryJson(
    std::ostringstream& out,
    const OpsV370RunbookInstanceLedgerSummary& summary) {
    out << "{"
        << "\"runbookCount\":" << summary.runbook_count << ","
        << "\"approvalNeededCount\":" << summary.approval_needed_count << ","
        << "\"fieldNeededCount\":" << summary.field_needed_count << ","
        << "\"blockedCount\":" << summary.blocked_count << ","
        << "\"previousRunComparisonCount\":" << summary.previous_run_comparison_count << ","
        << "\"operatorNoteCount\":" << summary.operator_note_count << ","
        << "\"derivationSources\":";
    AppendJsonStringArray(out, summary.derivation_sources);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22177 function
void AppendV370RunbookInstanceLedgerEntryJson(
    std::ostringstream& out,
    const OpsV370RunbookInstanceLedgerEntry& entry) {
    out << "{"
        << "\"runbookId\":\"" << JsonEscape(entry.runbook_id) << "\","
        << "\"runbookTemplateId\":\"" << JsonEscape(entry.runbook_template_id) << "\","
        << "\"candidateId\":\"" << JsonEscape(entry.candidate_id) << "\","
        << "\"siteId\":\"" << JsonEscape(entry.site_id) << "\","
        << "\"sourceGroup\":\"" << JsonEscape(entry.source_group) << "\","
        << "\"status\":\"" << JsonEscape(entry.status) << "\","
        << "\"operatorNote\":\"" << JsonEscape(entry.operator_note) << "\","
        << "\"previousRunComparison\":\"" << JsonEscape(entry.previous_run_comparison) << "\","
        << "\"previousRunId\":\"" << JsonEscape(entry.previous_run_id) << "\","
        << "\"comparedToRunId\":\"" << JsonEscape(entry.compared_to_run_id) << "\","
        << "\"statusHistory\":";
    AppendJsonStringArray(out, entry.status_history);
    out << ",\"evidenceRefs\":";
    AppendJsonStringArray(out, entry.evidence_refs);
    out << ",\"readOnly\":" << (entry.read_only ? "true" : "false")
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22199 function
std::string OpsV370RunbookInstanceLedgerJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v370-runbook-instance-ledger.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans = BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto dryRunResults = BuildV360CommandPlanDryRunResults(commandPlanCandidates);
    const auto impactDiffs =
        BuildV360SourceRuleImpactDiffs(context, commandPlanCandidates, stagedChangePlans);
    const auto readinessItems = BuildV360SafeApplyReadinessItems(dryRunResults, impactDiffs);
    const auto v360InputPackItems =
        BuildV360SimulationInputPackItems(context, commandPlanCandidates, stagedChangePlans);
    const auto inputSummary = BuildV360SimulationInputPackSummary(v360InputPackItems);
    const auto simulationRunContract = BuildV360SimulationRunContract();
    const auto simulationResultEnvelope = BuildV360SimulationResultEnvelope(inputSummary);
    const auto simulationRunLedgerEntries =
        BuildV360SimulationRunLedgerEntries(context,
                                            v360InputPackItems,
                                            simulationRunContract,
                                            simulationResultEnvelope,
                                            dryRunResults,
                                            impactDiffs,
                                            readinessItems);
    const auto projection =
        BuildV370SiteAwareSourceRegistryProjectionItems(context.sources, context.views);
    const auto rollups =
        BuildV370SiteHealthRollupItems(context.sources, context.views, source_health_snapshot);
    const auto impactGraphNodes = BuildV370SiteImpactGraphNodes(context, projection, rollups);
    const auto impactGraphEdges = BuildV370SiteImpactGraphEdges(projection);
    const auto siteSimulationInputPackItems =
        BuildV370SiteSimulationInputPackItems(context,
                                             projection,
                                             rollups,
                                             impactGraphNodes,
                                             impactGraphEdges,
                                             v360InputPackItems);
    const auto crossSiteReadinessItems =
        BuildV370CrossSiteSafeApplyReadinessItems(projection,
                                                 siteSimulationInputPackItems,
                                                 readinessItems,
                                                 impactDiffs);
    const auto runbookTemplateContractItems =
        BuildV370RunbookTemplateContractItems(commandPlanCandidates,
                                             dryRunResults,
                                             impactDiffs,
                                             readinessItems,
                                             projection,
                                             siteSimulationInputPackItems,
                                             crossSiteReadinessItems);
    const auto templateSummary =
        BuildV370RunbookTemplateContractSummary(runbookTemplateContractItems);
    const auto runbookInstanceLedgerEntries =
        BuildV370RunbookInstanceLedgerEntries(runbookTemplateContractItems,
                                             crossSiteReadinessItems,
                                             simulationRunLedgerEntries);
    const auto summary =
        BuildV370RunbookInstanceLedgerSummary(runbookInstanceLedgerEntries);
    (void)templateSummary;

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v370-runbook-instance-ledger.v1\","
        << "\"status\":\"runbook-instance-ledger\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"runbookTemplateContractRoute\":\"/ops/api/site-operations/runbook-template-contract\","
        << "\"crossSiteSafeApplyReadinessRoute\":\"/ops/api/site-operations/cross-site-safe-apply-readiness\","
        << "\"approvalTicketWorkflowRoute\":\"/ops/api/site-operations/approval-ticket-workflow\","
        << "\"appendOnlyLedgerProjection\":true,"
        << "\"simulationRunLedgerEntries\":" << simulationRunLedgerEntries.size() << ","
        << "\"runbookInstanceLedgerSummary\":";
    AppendV370RunbookInstanceLedgerSummaryJson(out, summary);
    out << ",\"runbookInstanceLedgerEntries\":[";
    for (std::size_t i = 0; i < runbookInstanceLedgerEntries.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV370RunbookInstanceLedgerEntryJson(out, runbookInstanceLedgerEntries[i]);
    }
    out << "],\"ledgerPolicy\":{"
        << "\"appendOnly\":\"projection-only; no runbook instance is persisted\","
        << "\"operatorNote\":\"display-only-not-persisted\","
        << "\"previousRunComparison\":\"derived from v3.6 simulation ledger when available\","
        << "\"statusCatalog\":[\"approval-needed\",\"field-needed\",\"blocked\",\"ready\",\"not-run\"]"
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"appendOnlyLedgerProjection\":true,"
        << "\"runbookInstancePersisted\":false,"
        << "\"operatorNoteWritePerformed\":false,"
        << "\"approvalTicketWritePerformed\":false,"
        << "\"resultDiffPersisted\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"fieldSmokeExecuted\":false,"
        << "\"commandPlanExecuted\":false,"
        << "\"automaticApplyPerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22350 function
const OpsV370RunbookTemplateContractItem* V370RunbookTemplateForId(
    const std::vector<OpsV370RunbookTemplateContractItem>& runbookTemplateContractItems,
    const std::string& runbook_template_id) {
    const auto it =
        std::find_if(runbookTemplateContractItems.begin(),
                     runbookTemplateContractItems.end(),
                     [&](const OpsV370RunbookTemplateContractItem& item) {
                         return item.runbook_template_id == runbook_template_id;
                     });
    return it == runbookTemplateContractItems.end() ? nullptr : &*it;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22362 function
std::string V370ApprovalTicketStatusFor(
    const OpsV370RunbookInstanceLedgerEntry& ledger,
    const OpsV370CrossSiteSafeApplyReadinessItem* readiness) {
    if (ledger.status == "field-needed" ||
        (readiness != nullptr && readiness->field_evidence_required)) {
        return "field-needed";
    }
    if (ledger.status == "blocked" ||
        (readiness != nullptr && !readiness->blockers.empty())) {
        return "hold";
    }
    if (ledger.status == "approval-needed" || ledger.status == "ready") {
        return "approval";
    }
    return "hold";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22379 function
std::string V370ApprovalTicketReasonFor(
    const OpsV370RunbookInstanceLedgerEntry& ledger,
    const OpsV370RunbookTemplateContractItem* runbook_template,
    const OpsV370CrossSiteSafeApplyReadinessItem* readiness) {
    if (readiness != nullptr && readiness->field_evidence_required) {
        return "field evidence is required before approval ticket promotion";
    }
    if (readiness != nullptr && !readiness->blockers.empty()) {
        return "hold until readiness blockers are reviewed";
    }
    if (runbook_template != nullptr && runbook_template->operator_approval_required) {
        return "operator approval required by runbook template contract";
    }
    if (ledger.status == "ready") {
        return "ready ticket requires reviewer acknowledgement before execution";
    }
    return "manual review required before approval decision";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22398 function
std::vector<OpsV370ApprovalTicketWorkflowItem> BuildV370ApprovalTicketWorkflowItems(
    const std::vector<OpsV370RunbookTemplateContractItem>& runbookTemplateContractItems,
    const std::vector<OpsV370RunbookInstanceLedgerEntry>& runbookInstanceLedgerEntries,
    const std::vector<OpsV370CrossSiteSafeApplyReadinessItem>& crossSiteReadinessItems) {
    std::vector<OpsV370ApprovalTicketWorkflowItem> items;
    int index = 0;
    for (const auto& ledger : runbookInstanceLedgerEntries) {
        const auto* runbook_template =
            V370RunbookTemplateForId(runbookTemplateContractItems, ledger.runbook_template_id);
        const auto* readiness =
            V370CrossSiteReadinessForCandidate(crossSiteReadinessItems, ledger.candidate_id);

        OpsV370ApprovalTicketWorkflowItem item;
        item.approval_ticket_id =
            "approval-ticket:" + ledger.runbook_id + ":" + std::to_string(index + 1);
        item.runbook_id = ledger.runbook_id;
        item.runbook_template_id = ledger.runbook_template_id;
        item.candidate_id = ledger.candidate_id;
        item.site_id = ledger.site_id;
        item.source_group = ledger.source_group;
        item.status = V370ApprovalTicketStatusFor(ledger, readiness);
        item.reviewer = item.status == "field-needed" ? "field-operator" : "ops-approver";
        if (item.status == "hold") {
            item.reviewer = "ops-reviewer";
        }
        item.reason = V370ApprovalTicketReasonFor(ledger, runbook_template, readiness);
        item.audit_link = "ops-audit:read-only:approval-ticket-workflow:" + ledger.candidate_id;
        item.evidence_refs = ledger.evidence_refs;
        item.evidence_refs.push_back("/ops/api/site-operations/runbook-template-contract");
        item.evidence_refs.push_back("/ops/api/site-operations/runbook-instance-ledger");
        item.evidence_refs.push_back("/ops/api/site-operations/cross-site-safe-apply-readiness");
        if (runbook_template != nullptr) {
            item.evidence_refs.push_back(runbook_template->runbook_template_id);
        }
        if (readiness != nullptr) {
            item.evidence_refs.push_back(readiness->readiness_id);
        }
        items.push_back(std::move(item));
        ++index;
        if (items.size() >= 24U) {
            break;
        }
    }
    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22444 function
OpsV370ApprovalTicketWorkflowSummary BuildV370ApprovalTicketWorkflowSummary(
    const std::vector<OpsV370ApprovalTicketWorkflowItem>& items) {
    OpsV370ApprovalTicketWorkflowSummary summary;
    summary.derivation_sources = {
        "BuildV370RunbookTemplateContractItems",
        "BuildV370RunbookInstanceLedgerEntries",
        "BuildV370RunbookInstanceLedgerSummary",
        "BuildV370CrossSiteSafeApplyReadinessItems",
    };
    summary.approval_ticket_count = static_cast<int>(items.size());
    for (const auto& item : items) {
        if (item.status == "approval") {
            ++summary.approval_count;
        } else if (item.status == "hold") {
            ++summary.hold_count;
        } else if (item.status == "reject") {
            ++summary.reject_count;
        } else if (item.status == "field-needed") {
            ++summary.field_needed_count;
        }
        if (!item.reviewer.empty()) {
            ++summary.reviewer_count;
        }
        if (!item.audit_link.empty()) {
            ++summary.audit_link_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22474 function
void AppendV370ApprovalTicketWorkflowSummaryJson(
    std::ostringstream& out,
    const OpsV370ApprovalTicketWorkflowSummary& summary) {
    out << "{"
        << "\"approvalTicketCount\":" << summary.approval_ticket_count << ","
        << "\"approvalCount\":" << summary.approval_count << ","
        << "\"holdCount\":" << summary.hold_count << ","
        << "\"rejectCount\":" << summary.reject_count << ","
        << "\"fieldNeededCount\":" << summary.field_needed_count << ","
        << "\"reviewerCount\":" << summary.reviewer_count << ","
        << "\"auditLinkCount\":" << summary.audit_link_count << ","
        << "\"derivationSources\":";
    AppendJsonStringArray(out, summary.derivation_sources);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22490 function
void AppendV370ApprovalTicketWorkflowItemJson(
    std::ostringstream& out,
    const OpsV370ApprovalTicketWorkflowItem& item) {
    out << "{"
        << "\"approvalTicketId\":\"" << JsonEscape(item.approval_ticket_id) << "\","
        << "\"runbookId\":\"" << JsonEscape(item.runbook_id) << "\","
        << "\"runbookTemplateId\":\"" << JsonEscape(item.runbook_template_id) << "\","
        << "\"candidateId\":\"" << JsonEscape(item.candidate_id) << "\","
        << "\"siteId\":\"" << JsonEscape(item.site_id) << "\","
        << "\"sourceGroup\":\"" << JsonEscape(item.source_group) << "\","
        << "\"status\":\"" << JsonEscape(item.status) << "\","
        << "\"reviewer\":\"" << JsonEscape(item.reviewer) << "\","
        << "\"reason\":\"" << JsonEscape(item.reason) << "\","
        << "\"auditLink\":\"" << JsonEscape(item.audit_link) << "\","
        << "\"approvalStateCatalog\":";
    AppendJsonStringArray(out, item.approval_state_catalog);
    out << ",\"evidenceRefs\":";
    AppendJsonStringArray(out, item.evidence_refs);
    out << ",\"readOnly\":" << (item.read_only ? "true" : "false")
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22512 function
std::string OpsV370ApprovalTicketWorkflowJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v370-approval-ticket-workflow.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans = BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto dryRunResults = BuildV360CommandPlanDryRunResults(commandPlanCandidates);
    const auto impactDiffs =
        BuildV360SourceRuleImpactDiffs(context, commandPlanCandidates, stagedChangePlans);
    const auto readinessItems = BuildV360SafeApplyReadinessItems(dryRunResults, impactDiffs);
    const auto v360InputPackItems =
        BuildV360SimulationInputPackItems(context, commandPlanCandidates, stagedChangePlans);
    const auto inputSummary = BuildV360SimulationInputPackSummary(v360InputPackItems);
    const auto simulationRunContract = BuildV360SimulationRunContract();
    const auto simulationResultEnvelope = BuildV360SimulationResultEnvelope(inputSummary);
    const auto simulationRunLedgerEntries =
        BuildV360SimulationRunLedgerEntries(context,
                                            v360InputPackItems,
                                            simulationRunContract,
                                            simulationResultEnvelope,
                                            dryRunResults,
                                            impactDiffs,
                                            readinessItems);
    const auto projection =
        BuildV370SiteAwareSourceRegistryProjectionItems(context.sources, context.views);
    const auto rollups =
        BuildV370SiteHealthRollupItems(context.sources, context.views, source_health_snapshot);
    const auto impactGraphNodes = BuildV370SiteImpactGraphNodes(context, projection, rollups);
    const auto impactGraphEdges = BuildV370SiteImpactGraphEdges(projection);
    const auto siteSimulationInputPackItems =
        BuildV370SiteSimulationInputPackItems(context,
                                             projection,
                                             rollups,
                                             impactGraphNodes,
                                             impactGraphEdges,
                                             v360InputPackItems);
    const auto crossSiteReadinessItems =
        BuildV370CrossSiteSafeApplyReadinessItems(projection,
                                                 siteSimulationInputPackItems,
                                                 readinessItems,
                                                 impactDiffs);
    const auto runbookTemplateContractItems =
        BuildV370RunbookTemplateContractItems(commandPlanCandidates,
                                             dryRunResults,
                                             impactDiffs,
                                             readinessItems,
                                             projection,
                                             siteSimulationInputPackItems,
                                             crossSiteReadinessItems);
    const auto runbookInstanceLedgerEntries =
        BuildV370RunbookInstanceLedgerEntries(runbookTemplateContractItems,
                                             crossSiteReadinessItems,
                                             simulationRunLedgerEntries);
    const auto runbookInstanceLedgerSummary =
        BuildV370RunbookInstanceLedgerSummary(runbookInstanceLedgerEntries);
    const auto approvalTicketWorkflowItems =
        BuildV370ApprovalTicketWorkflowItems(runbookTemplateContractItems,
                                            runbookInstanceLedgerEntries,
                                            crossSiteReadinessItems);
    const auto summary =
        BuildV370ApprovalTicketWorkflowSummary(approvalTicketWorkflowItems);
    (void)runbookInstanceLedgerSummary;

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v370-approval-ticket-workflow.v1\","
        << "\"status\":\"approval-ticket-workflow\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"runbookTemplateContractRoute\":\"/ops/api/site-operations/runbook-template-contract\","
        << "\"runbookInstanceLedgerRoute\":\"/ops/api/site-operations/runbook-instance-ledger\","
        << "\"crossSiteSafeApplyReadinessRoute\":\"/ops/api/site-operations/cross-site-safe-apply-readiness\","
        << "\"approvalStateCatalog\":[\"approval\",\"hold\",\"reject\",\"field-needed\"],"
        << "\"approvalTicketWorkflowSummary\":";
    AppendV370ApprovalTicketWorkflowSummaryJson(out, summary);
    out << ",\"approvalTicketWorkflowItems\":[";
    for (std::size_t i = 0; i < approvalTicketWorkflowItems.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV370ApprovalTicketWorkflowItemJson(out, approvalTicketWorkflowItems[i]);
    }
    out << "],\"workflowPolicy\":{"
        << "\"approval\":\"reviewer acknowledgement only; no decision is persisted\","
        << "\"hold\":\"blocker or manual review state\","
        << "\"reject\":\"catalog state only until a reviewer records an external decision\","
        << "\"field-needed\":\"field evidence must be attached outside this read model\","
        << "\"auditLink\":\"read-only link label; no Ops audit record is written\""
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"approvalTicketWorkflowOnly\":true,"
        << "\"approvalTicketWritePerformed\":false,"
        << "\"reviewerAssignmentWritePerformed\":false,"
        << "\"approvalDecisionPersisted\":false,"
        << "\"runbookInstancePersisted\":false,"
        << "\"operatorNoteWritePerformed\":false,"
        << "\"resultDiffPersisted\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"fieldSmokeExecuted\":false,"
        << "\"commandPlanExecuted\":false,"
        << "\"automaticApplyPerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22658 function
std::string V360ClientNoticePreviewStatusFor(const std::string& candidate_type) {
    if (candidate_type == "maintenance") {
        return "maintenance";
    }
    if (candidate_type == "recovery" || candidate_type == "sourceRecheck") {
        return "recovering";
    }
    return "degraded";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22668 function
std::string V360ClientNoticePreviewTitleFor(const std::string& status) {
    if (status == "maintenance") {
        return "Maintenance preview";
    }
    if (status == "recovering") {
        return "Recovering preview";
    }
    return "Degraded preview";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22678 function
std::string V360ClientNoticePreviewTimelineHintFor(const std::string& status) {
    if (status == "maintenance") {
        return "Maintenance window is being prepared; live video may pause briefly.";
    }
    if (status == "recovering") {
        return "Service is recovering; live video should stabilize shortly.";
    }
    return "Some live views may be degraded while operators review the source.";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22688 function
std::vector<OpsV360ClientNoticePreviewItem> BuildV360ClientNoticePreviewItems(
    const std::vector<OpsV360CommandPlanDryRunResult>& dryRunResults,
    const std::vector<OpsV360SourceRuleImpactDiff>& impactDiffs,
    const std::vector<OpsV360SafeApplyReadinessItem>& readinessItems) {
    std::vector<OpsV360ClientNoticePreviewItem> items;
    const auto append_preview = [&](const std::string& preview_id,
                                    const std::string& candidate_id,
                                    const std::string& source_id,
                                    const std::string& candidate_type) {
        const std::string status = V360ClientNoticePreviewStatusFor(candidate_type);
        OpsV360ClientNoticePreviewItem item;
        item.notice_preview_id = preview_id;
        item.candidate_id = candidate_id;
        item.source_id = source_id.empty() ? "pending-source" : source_id;
        item.notice_status = status;
        item.viewer_safe_title = V360ClientNoticePreviewTitleFor(status);
        item.viewer_safe_body =
            "viewerSafeClientNoticePreview: " + status +
            " notice preview generated without client notice delivery";
        item.timeline_hint = V360ClientNoticePreviewTimelineHintFor(status);
        item.evidence_refs = {
            "/ops/api/live-operations/simulation/command-plan-dry-run",
            "/ops/api/live-operations/simulation/impact-diff",
            "/ops/api/live-operations/simulation/safe-apply-readiness",
            candidate_id,
        };
        for (const auto& diff : impactDiffs) {
            if (diff.candidate_id == candidate_id) {
                item.evidence_refs.push_back(diff.diff_id);
                break;
            }
        }
        for (const auto& readiness : readinessItems) {
            if (readiness.candidate_id == candidate_id) {
                item.evidence_refs.push_back(readiness.readiness_id);
                break;
            }
        }
        items.push_back(std::move(item));
    };

    for (const auto& result : dryRunResults) {
        if (result.candidate_type == "maintenance" ||
            result.candidate_type == "clientNotice" ||
            result.candidate_type == "recovery" ||
            result.candidate_type == "sourceRecheck") {
            append_preview("notice-preview:" + result.candidate_id,
                           result.candidate_id,
                           result.source_id,
                           result.candidate_type);
        }
        if (items.size() >= 12U) {
            break;
        }
    }

    const std::vector<std::pair<std::string, std::string>> required_status_candidates = {
        {"maintenance", "maintenance"},
        {"degraded", "clientNotice"},
        {"recovering", "recovery"},
    };
    for (const auto& [status, candidate_type] : required_status_candidates) {
        bool exists = false;
        for (const auto& item : items) {
            if (item.notice_status == status) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            append_preview("notice-preview:default:" + status,
                           "candidate:default:" + candidate_type,
                           "pending-source",
                           candidate_type);
        }
    }
    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22767 function
OpsV360ClientNoticePreviewSummary BuildV360ClientNoticePreviewSummary(
    const std::vector<OpsV360ClientNoticePreviewItem>& items) {
    OpsV360ClientNoticePreviewSummary summary;
    summary.preview_count = static_cast<int>(items.size());
    for (const auto& item : items) {
        if (item.notice_status == "maintenance") {
            ++summary.maintenance_count;
        } else if (item.notice_status == "degraded") {
            ++summary.degraded_count;
        } else if (item.notice_status == "recovering") {
            ++summary.recovering_count;
        }
        summary.evidence_ref_count += static_cast<int>(item.evidence_refs.size());
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22784 function
void AppendV360ClientNoticePreviewSummaryJson(
    std::ostringstream& out,
    const OpsV360ClientNoticePreviewSummary& summary) {
    out << "{"
        << "\"previewCount\":" << summary.preview_count << ","
        << "\"maintenanceCount\":" << summary.maintenance_count << ","
        << "\"degradedCount\":" << summary.degraded_count << ","
        << "\"recoveringCount\":" << summary.recovering_count << ","
        << "\"evidenceRefCount\":" << summary.evidence_ref_count
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22796 function
void AppendV360ClientNoticePreviewItemJson(
    std::ostringstream& out,
    const OpsV360ClientNoticePreviewItem& item) {
    out << "{"
        << "\"noticePreviewId\":\"" << JsonEscape(item.notice_preview_id) << "\","
        << "\"candidateId\":\"" << JsonEscape(item.candidate_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(item.source_id) << "\","
        << "\"noticeStatus\":\"" << JsonEscape(item.notice_status) << "\","
        << "\"viewerSafeTitle\":\"" << JsonEscape(item.viewer_safe_title) << "\","
        << "\"viewerSafeBody\":\"" << JsonEscape(item.viewer_safe_body) << "\","
        << "\"timelineHint\":\"" << JsonEscape(item.timeline_hint) << "\","
        << "\"deliveryState\":\"" << JsonEscape(item.delivery_state) << "\","
        << "\"viewerSafe\":" << (item.viewer_safe ? "true" : "false") << ","
        << "\"evidenceRefs\":";
    AppendV340RecoveryCandidateStringListJson(out, item.evidence_refs);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22814 function
std::string OpsV360ClientNoticePreviewJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v360-client-notice-preview.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans = BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto dryRunResults = BuildV360CommandPlanDryRunResults(commandPlanCandidates);
    const auto impactDiffs =
        BuildV360SourceRuleImpactDiffs(context, commandPlanCandidates, stagedChangePlans);
    const auto readinessItems = BuildV360SafeApplyReadinessItems(dryRunResults, impactDiffs);
    const auto previewItems =
        BuildV360ClientNoticePreviewItems(dryRunResults, impactDiffs, readinessItems);
    const auto summary = BuildV360ClientNoticePreviewSummary(previewItems);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v360-client-notice-preview.v1\","
        << "\"status\":\"client-notice-preview\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"commandPlanDryRunRoute\":\"/ops/api/live-operations/simulation/command-plan-dry-run\","
        << "\"impactDiffRoute\":\"/ops/api/live-operations/simulation/impact-diff\","
        << "\"readinessRoute\":\"/ops/api/live-operations/simulation/safe-apply-readiness\","
        << "\"viewerSafeClientNoticePreview\":true,"
        << "\"previewStatuses\":[\"maintenance\",\"degraded\",\"recovering\"],"
        << "\"clientNoticePreviewSummary\":";
    AppendV360ClientNoticePreviewSummaryJson(out, summary);
    out << ",\"clientNoticePreviewItems\":[";
    for (std::size_t i = 0; i < previewItems.size(); ++i) {
        if (i != 0) out << ",";
        AppendV360ClientNoticePreviewItemJson(out, previewItems[i]);
    }
    out << "],\"deliveryPolicy\":{"
        << "\"deliveryState\":\"preview-only\","
        << "\"actualSend\":\"not-run\","
        << "\"viewerSafeFields\":[\"noticeStatus\",\"viewerSafeTitle\",\"viewerSafeBody\",\"timelineHint\"]"
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"viewerSafe\":true,"
        << "\"previewOnly\":true,"
        << "\"clientNoticeSent\":false,"
        << "\"clientNoticePersisted\":false,"
        << "\"viewerClientPayloadChanged\":false,"
        << "\"sourceUrlIncluded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"rawJsonIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"operatorMaterialIncluded\":false,"
        << "\"commandPlanDetailsIncluded\":false,"
        << "\"incidentDetailsIncluded\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22920 function
std::string V370SiteImpactSummaryForRuleWhatIf(
    const std::vector<OpsV370SiteImpactGraphNode>& impactGraphNodes,
    const std::string& site_id,
    const std::string& source_group,
    const std::string& source_id) {
    const auto source_it = std::find_if(impactGraphNodes.begin(), impactGraphNodes.end(), [&](const auto& node) {
        return node.source_id == source_id && node.node_type == "EventRecord";
    });
    if (source_it != impactGraphNodes.end()) {
        return source_it->viewer_safe_impact_summary;
    }
    const auto group_it = std::find_if(impactGraphNodes.begin(), impactGraphNodes.end(), [&](const auto& node) {
        return node.site_id == site_id && node.source_group == source_group &&
               node.node_type == "sourceGroup";
    });
    if (group_it != impactGraphNodes.end()) {
        return group_it->viewer_safe_impact_summary;
    }
    return "siteImpactSummary: EventRecord, source health, PublishedView, and client impact are compared as read-only refs";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22941 function
std::string V370RuleVaThresholdCandidateForDryRun(
    const OpsV360CommandPlanDryRunResult& result) {
    if (result.candidate_type == "ruleFollowUp") {
        return "thresholdCandidate:confidence+0.05";
    }
    return "thresholdCandidate:site-sensitivity-review";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22949 function
std::string V370RuleVaScenarioCandidateForDryRun(
    const OpsV360CommandPlanDryRunResult& result) {
    if (result.candidate_type == "ruleFollowUp") {
        return "scenarioCandidate:loitering-by-site";
    }
    return "scenarioCandidate:presence-by-site";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22957 function
std::vector<OpsV370RuleVaWhatIfBySiteItem> BuildV370RuleVaWhatIfBySiteItems(
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection,
    const std::vector<OpsV370SiteImpactGraphNode>& impactGraphNodes,
    const std::vector<OpsV370SiteSimulationInputPackItem>& siteSimulationInputPackItems,
    const std::vector<OpsV370CrossSiteSafeApplyReadinessItem>& crossSiteReadinessItems,
    const std::vector<OpsV360CommandPlanDryRunResult>& dryRunResults,
    const std::vector<OpsV360SourceRuleImpactDiff>& impactDiffs) {
    std::vector<OpsV370RuleVaWhatIfBySiteItem> items;
    const auto* fallback_projection = projection.empty() ? nullptr : &projection.front();

    for (const auto& result : dryRunResults) {
        if (result.candidate_type != "ruleFollowUp") {
            continue;
        }
        const auto* projected = V370ProjectionForSource(projection, result.source_id);
        if (projected == nullptr) {
            projected = fallback_projection;
        }
        const auto* diff = V370ImpactDiffForCandidate(impactDiffs, result.candidate_id);
        const auto* readiness =
            V370CrossSiteReadinessForCandidate(crossSiteReadinessItems, result.candidate_id);
        const std::string site_id = projected == nullptr ? "unassigned-site" : projected->site_id;
        const std::string source_group =
            projected == nullptr ? "unassigned-source-group" : projected->source_group;
        const std::string source_id =
            result.source_id == "pending-source" && projected != nullptr && !projected->source_ids.empty()
                ? projected->source_ids.front()
                : result.source_id;
        const int site_input_count =
            V370SiteSimulationPackCountForScope(siteSimulationInputPackItems, site_id, source_group);

        OpsV370RuleVaWhatIfBySiteItem item;
        item.what_if_by_site_id =
            "siteRuleVaWhatIfBySite:" + site_id + ":" + source_group + ":" + result.candidate_id;
        item.site_id = site_id;
        item.source_group = source_group;
        item.source_id = source_id.empty() ? "pending-source" : source_id;
        item.rule_candidate_id = result.candidate_id;
        item.event_record_ref = "EventRecord:aggregate:" + site_id + ":" + source_group;
        item.rule_threshold_candidate = V370RuleVaThresholdCandidateForDryRun(result);
        item.preset_candidate = "presetCandidate:site-default";
        item.scenario_candidate = V370RuleVaScenarioCandidateForDryRun(result);
        item.before_match_state =
            diff == nullptr ? "beforeMatchState: current site EventRecord/Rule projection"
                            : diff->before_state;
        item.after_match_state =
            diff == nullptr ? "afterMatchState: siteRuleVaWhatIfBySite projection"
                            : diff->after_state + " via siteRuleVaWhatIfBySite";
        item.site_impact_summary = V370SiteImpactSummaryForRuleWhatIf(
            impactGraphNodes, item.site_id, item.source_group, item.source_id);
        item.what_if_result_delta =
            diff == nullptr
                ? "ruleThresholdDelta=" + item.rule_threshold_candidate +
                      "; scenarioDelta=" + item.scenario_candidate +
                      "; siteImpactDelta=viewer-safe-summary-only"
                : "ruleThresholdDelta=" + item.rule_threshold_candidate +
                      "; scenarioDelta=" + item.scenario_candidate +
                      "; " + diff->event_risk_diff + "; " + diff->client_impact_diff;
        item.readiness_state = readiness == nullptr ? "not-run" : readiness->readiness_state;
        item.affected_client_refs =
            readiness == nullptr ? V370AffectedClientRefsForProjection(projected)
                                 : readiness->affected_client_refs;
        item.changed_fields = {"ruleThresholdDelta", "scenarioDelta", "siteImpactDelta"};
        item.evidence_refs = {
            "/ops/api/site-operations/source-registry-projection",
            "/ops/api/site-operations/health-rollup",
            "/ops/api/site-operations/impact-graph",
            "/ops/api/site-operations/simulation-input-pack",
            "/ops/api/site-operations/cross-site-safe-apply-readiness",
            "/ops/api/events/reviews",
            "/ops/api/live-operations/simulation/rule-va-what-if-replay-pack",
            "BuildV360RuleVaWhatIfReplayCandidates",
            "manual_ui_fulltest_va_seed_matrix",
            "siteSimulationInputPackCount:" + std::to_string(site_input_count),
        };
        if (diff != nullptr) {
            item.evidence_refs.push_back(diff->diff_id);
        }
        if (readiness != nullptr) {
            item.evidence_refs.push_back(readiness->readiness_id);
        }
        items.push_back(std::move(item));
        if (items.size() >= 12U) {
            break;
        }
    }

    if (items.empty()) {
        OpsV370RuleVaWhatIfBySiteItem item;
        item.what_if_by_site_id = "siteRuleVaWhatIfBySite:pending";
        item.site_id = fallback_projection == nullptr ? "unassigned-site" : fallback_projection->site_id;
        item.source_group =
            fallback_projection == nullptr ? "unassigned-source-group" : fallback_projection->source_group;
        item.source_id = fallback_projection == nullptr || fallback_projection->source_ids.empty()
                             ? "pending-source"
                             : fallback_projection->source_ids.front();
        item.rule_candidate_id = "candidate:default:ruleFollowUp";
        item.event_record_ref = "EventRecord:aggregate:" + item.site_id + ":" + item.source_group;
        item.scenario_candidate = "scenarioCandidate:presence-by-site";
        item.site_impact_summary =
            "siteImpactSummary: pending site impact graph, EventRecord aggregate, and VA fixture refs";
        item.what_if_result_delta =
            "ruleThresholdDelta=thresholdCandidate:confidence+0.05; scenarioDelta=scenarioCandidate:presence-by-site";
        item.evidence_refs = {
            "/ops/api/site-operations/source-registry-projection",
            "/ops/api/site-operations/impact-graph",
            "/ops/api/events/reviews",
            "/ops/api/live-operations/simulation/rule-va-what-if-replay-pack",
            "BuildV360RuleVaWhatIfReplayCandidates",
            "manual_ui_fulltest_va_seed_matrix",
        };
        items.push_back(std::move(item));
    }
    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23073 function
OpsV370RuleVaWhatIfBySiteSummary BuildV370RuleVaWhatIfBySiteSummary(
    const std::vector<OpsV370RuleVaWhatIfBySiteItem>& items) {
    OpsV370RuleVaWhatIfBySiteSummary summary;
    summary.derivation_sources = {
        "BuildV350LiveOperationsGraphContext",
        "BuildV350CommandPlanCandidates",
        "BuildV360CommandPlanDryRunResults",
        "BuildV360SourceRuleImpactDiffs",
        "BuildV360RuleVaWhatIfReplayCandidates",
        "BuildV370SiteAwareSourceRegistryProjectionItems",
        "BuildV370SiteHealthRollupItems",
        "BuildV370SiteImpactGraphNodes",
        "BuildV370SiteSimulationInputPackItems",
        "BuildV370CrossSiteSafeApplyReadinessItems",
        "manual_ui_fulltest_va_seed_matrix",
    };
    std::vector<std::string> sites;
    std::vector<std::string> source_groups;
    summary.item_count = static_cast<int>(items.size());
    for (const auto& item : items) {
        AddV370UniqueString(&sites, item.site_id);
        AddV370UniqueString(&source_groups, item.site_id + ":" + item.source_group);
        if (!item.rule_threshold_candidate.empty()) {
            ++summary.threshold_candidate_count;
        }
        if (!item.scenario_candidate.empty()) {
            ++summary.scenario_candidate_count;
        }
        if (!item.event_record_ref.empty()) {
            ++summary.event_record_ref_count;
        }
        if (!item.va_fixture_ref.empty()) {
            ++summary.va_fixture_ref_count;
        }
        if (item.readiness_state != "ready") {
            ++summary.blocked_or_not_run_count;
        }
        summary.affected_client_ref_count +=
            static_cast<int>(item.affected_client_refs.size());
    }
    summary.site_count = static_cast<int>(sites.size());
    summary.source_group_count = static_cast<int>(source_groups.size());
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23118 function
void AppendV370RuleVaWhatIfBySiteSummaryJson(
    std::ostringstream& out,
    const OpsV370RuleVaWhatIfBySiteSummary& summary) {
    out << "{"
        << "\"itemCount\":" << summary.item_count << ","
        << "\"siteCount\":" << summary.site_count << ","
        << "\"sourceGroupCount\":" << summary.source_group_count << ","
        << "\"thresholdCandidateCount\":" << summary.threshold_candidate_count << ","
        << "\"scenarioCandidateCount\":" << summary.scenario_candidate_count << ","
        << "\"eventRecordRefCount\":" << summary.event_record_ref_count << ","
        << "\"vaFixtureRefCount\":" << summary.va_fixture_ref_count << ","
        << "\"affectedClientRefCount\":" << summary.affected_client_ref_count << ","
        << "\"blockedOrNotRunCount\":" << summary.blocked_or_not_run_count << ","
        << "\"derivationSources\":";
    AppendJsonStringArray(out, summary.derivation_sources);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23136 function
void AppendV370RuleVaWhatIfBySiteItemJson(
    std::ostringstream& out,
    const OpsV370RuleVaWhatIfBySiteItem& item) {
    out << "{"
        << "\"whatIfBySiteId\":\"" << JsonEscape(item.what_if_by_site_id) << "\","
        << "\"siteId\":\"" << JsonEscape(item.site_id) << "\","
        << "\"sourceGroup\":\"" << JsonEscape(item.source_group) << "\","
        << "\"sourceId\":\"" << JsonEscape(item.source_id) << "\","
        << "\"ruleCandidateId\":\"" << JsonEscape(item.rule_candidate_id) << "\","
        << "\"eventRecordRef\":\"" << JsonEscape(item.event_record_ref) << "\","
        << "\"vaFixtureRef\":\"" << JsonEscape(item.va_fixture_ref) << "\","
        << "\"ruleThresholdCandidate\":\""
        << JsonEscape(item.rule_threshold_candidate) << "\","
        << "\"presetCandidate\":\"" << JsonEscape(item.preset_candidate) << "\","
        << "\"scenarioCandidate\":\"" << JsonEscape(item.scenario_candidate) << "\","
        << "\"beforeMatchState\":\"" << JsonEscape(item.before_match_state) << "\","
        << "\"afterMatchState\":\"" << JsonEscape(item.after_match_state) << "\","
        << "\"siteImpactSummary\":\"" << JsonEscape(item.site_impact_summary) << "\","
        << "\"whatIfResultDelta\":\"" << JsonEscape(item.what_if_result_delta) << "\","
        << "\"readinessState\":\"" << JsonEscape(item.readiness_state) << "\","
        << "\"affectedClientRefs\":";
    AppendJsonStringArray(out, item.affected_client_refs);
    out << ",\"changedFields\":";
    AppendJsonStringArray(out, item.changed_fields);
    out << ",\"evidenceRefs\":";
    AppendJsonStringArray(out, item.evidence_refs);
    out << ",\"readOnly\":" << JsonBool(item.read_only)
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23166 function
std::string OpsV370RuleVaWhatIfBySiteJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v370-rule-va-what-if-by-site.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans = BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto dryRunResults = BuildV360CommandPlanDryRunResults(commandPlanCandidates);
    const auto impactDiffs =
        BuildV360SourceRuleImpactDiffs(context, commandPlanCandidates, stagedChangePlans);
    const auto readinessItems = BuildV360SafeApplyReadinessItems(dryRunResults, impactDiffs);
    const auto v360InputPackItems =
        BuildV360SimulationInputPackItems(context, commandPlanCandidates, stagedChangePlans);
    const auto projection =
        BuildV370SiteAwareSourceRegistryProjectionItems(context.sources, context.views);
    const auto rollups =
        BuildV370SiteHealthRollupItems(context.sources, context.views, source_health_snapshot);
    const auto impactGraphNodes = BuildV370SiteImpactGraphNodes(context, projection, rollups);
    const auto impactGraphEdges = BuildV370SiteImpactGraphEdges(projection);
    const auto siteSimulationInputPackItems =
        BuildV370SiteSimulationInputPackItems(context,
                                             projection,
                                             rollups,
                                             impactGraphNodes,
                                             impactGraphEdges,
                                             v360InputPackItems);
    const auto crossSiteReadinessItems =
        BuildV370CrossSiteSafeApplyReadinessItems(projection,
                                                 siteSimulationInputPackItems,
                                                 readinessItems,
                                                 impactDiffs);
    const auto whatIfItems = BuildV370RuleVaWhatIfBySiteItems(
        projection,
        impactGraphNodes,
        siteSimulationInputPackItems,
        crossSiteReadinessItems,
        dryRunResults,
        impactDiffs);
    const auto summary = BuildV370RuleVaWhatIfBySiteSummary(whatIfItems);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v370-rule-va-what-if-by-site.v1\","
        << "\"status\":\"rule-va-what-if-by-site\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"siteRegistryProjectionRoute\":\"/ops/api/site-operations/source-registry-projection\","
        << "\"siteHealthRollupRoute\":\"/ops/api/site-operations/health-rollup\","
        << "\"siteImpactGraphRoute\":\"/ops/api/site-operations/impact-graph\","
        << "\"siteSimulationInputPackRoute\":\"/ops/api/site-operations/simulation-input-pack\","
        << "\"crossSiteSafeApplyReadinessRoute\":\"/ops/api/site-operations/cross-site-safe-apply-readiness\","
        << "\"eventRecordRoute\":\"/ops/api/events/reviews\","
        << "\"ruleVaReplayRoute\":\"/ops/api/live-operations/simulation/rule-va-what-if-replay-pack\","
        << "\"siteRuleVaWhatIfBySite\":true,"
        << "\"whatIfOnly\":true,"
        << "\"ruleVaWhatIfBySiteSummary\":";
    AppendV370RuleVaWhatIfBySiteSummaryJson(out, summary);
    out << ",\"ruleVaWhatIfBySiteItems\":[";
    for (std::size_t i = 0; i < whatIfItems.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV370RuleVaWhatIfBySiteItemJson(out, whatIfItems[i]);
    }
    out << "],\"whatIfPolicy\":{"
        << "\"siteRuleVaWhatIfBySite\":true,"
        << "\"EventRecord\":\"read-only aggregate input\","
        << "\"vaFixtureRef\":\"manual_ui_fulltest_va_seed_matrix\","
        << "\"thresholdCandidate\":\"computed-only\","
        << "\"scenarioCandidate\":\"computed-only\","
        << "\"ruleApply\":\"never\""
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"whatIfOnly\":true,"
        << "\"siteScoped\":true,"
        << "\"eventRecordReadOnly\":true,"
        << "\"vaFixtureReadOnly\":true,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"ruleThresholdApplied\":false,"
        << "\"presetApplied\":false,"
        << "\"scenarioApplied\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"simulationRunExecuted\":false,"
        << "\"safeApplyPerformed\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"viewerClientPayloadChanged\":false,"
        << "\"sourceUrlIncluded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"rawJsonIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23315 function
const OpsV370RunbookInstanceLedgerEntry* V370RunbookLedgerForAttachment(
    const std::vector<OpsV370RunbookInstanceLedgerEntry>& runbookInstanceLedgerEntries,
    std::size_t index) {
    if (runbookInstanceLedgerEntries.empty()) {
        return nullptr;
    }
    const auto field_it =
        std::find_if(runbookInstanceLedgerEntries.begin(),
                     runbookInstanceLedgerEntries.end(),
                     [](const auto& entry) {
                         return entry.status == "field-needed" ||
                                entry.status == "approval-needed" ||
                                entry.status == "blocked";
                     });
    if (field_it != runbookInstanceLedgerEntries.end()) {
        return &*field_it;
    }
    return &runbookInstanceLedgerEntries[index % runbookInstanceLedgerEntries.size()];
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23335 function
const OpsV370ApprovalTicketWorkflowItem* V370ApprovalTicketForRunbook(
    const std::vector<OpsV370ApprovalTicketWorkflowItem>& approvalTicketWorkflowItems,
    const std::string& runbook_id,
    std::size_t index) {
    const auto it =
        std::find_if(approvalTicketWorkflowItems.begin(),
                     approvalTicketWorkflowItems.end(),
                     [&](const auto& item) { return item.runbook_id == runbook_id; });
    if (it != approvalTicketWorkflowItems.end()) {
        return &*it;
    }
    if (approvalTicketWorkflowItems.empty()) {
        return nullptr;
    }
    return &approvalTicketWorkflowItems[index % approvalTicketWorkflowItems.size()];
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23352 function
const OpsV370SiteSimulationInputPackItem* V370SiteSimulationInputPackForScope(
    const std::vector<OpsV370SiteSimulationInputPackItem>& siteSimulationInputPackItems,
    const std::string& site_id,
    const std::string& source_group) {
    const auto it =
        std::find_if(siteSimulationInputPackItems.begin(),
                     siteSimulationInputPackItems.end(),
                     [&](const auto& item) {
                         return item.site_id == site_id &&
                                item.source_group == source_group;
                     });
    return it == siteSimulationInputPackItems.end() ? nullptr : &*it;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23366 function
std::string V370FieldEvidenceAttachmentNotRunReason(
    const OpsV350FieldEvidenceIntakeRecord& record) {
    if (!record.not_run_reason.empty()) {
        return record.not_run_reason;
    }
    if (record.bridge_kind == "onvif-real-device") {
        return "ONVIF 실기기 endpoint와 credential, operator approval 없이는 실행하지 않음";
    }
    if (record.bridge_kind == "external-whep-turn") {
        return "external WHEP endpoint와 TURN credential 조건 미충족으로 실행하지 않음";
    }
    if (record.bridge_kind == "real-cloud-vlm-provider") {
        return "cloud/VLM provider credential과 runtime opt-in 없이는 호출하지 않음";
    }
    return "field execution condition is conditional/not-run";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23383 function
std::vector<OpsV370FieldEvidenceAttachmentItem> BuildV370FieldEvidenceAttachmentItems(
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection,
    const std::vector<OpsV370SiteSimulationInputPackItem>& siteSimulationInputPackItems,
    const std::vector<OpsV370RunbookInstanceLedgerEntry>& runbookInstanceLedgerEntries,
    const std::vector<OpsV370ApprovalTicketWorkflowItem>& approvalTicketWorkflowItems,
    const std::vector<OpsV350FieldEvidenceIntakeRecord>& fieldEvidenceIntakeRecords,
    const std::vector<OpsV350FieldEvidenceExecutionCondition>& fieldEvidenceExecutionConditions) {
    std::vector<OpsV370FieldEvidenceAttachmentItem> items;
    const auto* fallback_projection = projection.empty() ? nullptr : &projection.front();

    for (std::size_t i = 0; i < fieldEvidenceIntakeRecords.size(); ++i) {
        const auto& record = fieldEvidenceIntakeRecords[i];
        const auto* runbook =
            V370RunbookLedgerForAttachment(runbookInstanceLedgerEntries, i);
        const auto* approval =
            V370ApprovalTicketForRunbook(approvalTicketWorkflowItems,
                                        runbook == nullptr ? "" : runbook->runbook_id,
                                        i);

        const std::string site_id =
            runbook != nullptr && !runbook->site_id.empty()
                ? runbook->site_id
                : (fallback_projection == nullptr ? "unassigned-site" : fallback_projection->site_id);
        const std::string source_group =
            runbook != nullptr && !runbook->source_group.empty()
                ? runbook->source_group
                : (fallback_projection == nullptr ? "unassigned-source-group"
                                                   : fallback_projection->source_group);
        const auto* scoped_input =
            V370SiteSimulationInputPackForScope(siteSimulationInputPackItems, site_id, source_group);
        const auto* projected = fallback_projection;
        if (fallback_projection != nullptr) {
            const auto projection_it =
                std::find_if(projection.begin(), projection.end(), [&](const auto& item) {
                    return item.site_id == site_id && item.source_group == source_group;
                });
            if (projection_it != projection.end()) {
                projected = &*projection_it;
            }
        }

        OpsV370FieldEvidenceAttachmentItem item;
        item.field_evidence_attachment_id =
            "fieldEvidenceAttachment:" + site_id + ":" + source_group + ":" +
            record.bridge_kind;
        item.site_id = site_id;
        item.source_group = source_group;
        item.source_id =
            projected == nullptr || projected->source_ids.empty()
                ? "pending-source"
                : projected->source_ids.front();
        item.runbook_id = runbook == nullptr ? "runbook:pending" : runbook->runbook_id;
        item.approval_ticket_id =
            approval == nullptr ? "approval-ticket:pending" : approval->approval_ticket_id;
        item.bridge_kind = record.bridge_kind;
        item.label = record.label;
        item.site_runbook_evidence_ref =
            "siteRunbookEvidenceRef:" + item.site_id + ":" + item.source_group + ":" +
            item.runbook_id + ":" + item.bridge_kind;
        item.conditional_not_run_evidence =
            "conditionalNotRunEvidence: " + record.result_summary;
        item.execution_status =
            record.execution_status.empty() ? "not-run" : record.execution_status;
        item.field_smoke_status =
            record.field_smoke_status.empty() ? "field-smoke-not-run"
                                              : record.field_smoke_status;
        item.not_run_reason = V370FieldEvidenceAttachmentNotRunReason(record);
        item.redacted_field_evidence =
            record.redacted_field_evidence.empty()
                ? "redactedFieldEvidence: endpoint, credential, provider, and VLM material omitted"
                : record.redacted_field_evidence;
        item.simulation_input_ref =
            scoped_input == nullptr
                ? "/ops/api/live-operations/simulation/field-evidence-adapter:" +
                      record.bridge_kind
                : scoped_input->pack_id + ":fieldEvidenceAttachment";
        item.simulation_readiness_blocker_ref =
            "simulationReadinessBlockerRef:" + record.bridge_kind + ":conditional-not-run";
        item.runbook_ledger_ref =
            "runbookLedgerRef:" + item.runbook_id + ":conditional-field-evidence";
        item.approval_ticket_ref =
            "approvalTicketRef:" + item.approval_ticket_id + ":field-needed";
        for (const auto& condition : fieldEvidenceExecutionConditions) {
            if (condition.evidence_id == record.evidence_id) {
                item.condition_refs.push_back(condition.condition_id);
            }
        }
        item.evidence_refs = record.evidence_refs;
        item.evidence_refs.push_back("/ops/api/site-operations/source-registry-projection");
        item.evidence_refs.push_back("/ops/api/site-operations/runbook-instance-ledger");
        item.evidence_refs.push_back("/ops/api/site-operations/approval-ticket-workflow");
        item.evidence_refs.push_back("/ops/api/live-operations/simulation/field-evidence-adapter");
        item.evidence_refs.push_back(item.site_runbook_evidence_ref);
        item.evidence_refs.push_back(item.runbook_ledger_ref);
        item.evidence_refs.push_back(item.approval_ticket_ref);
        item.endpoint_required = record.endpoint_required;
        item.credential_required = record.credential_required;
        item.operator_approval_required = record.operator_approval_required;
        items.push_back(std::move(item));
    }

    if (items.empty()) {
        OpsV370FieldEvidenceAttachmentItem item;
        item.field_evidence_attachment_id = "fieldEvidenceAttachment:pending";
        item.site_id = fallback_projection == nullptr ? "unassigned-site" : fallback_projection->site_id;
        item.source_group =
            fallback_projection == nullptr ? "unassigned-source-group" : fallback_projection->source_group;
        item.source_id = fallback_projection == nullptr || fallback_projection->source_ids.empty()
                             ? "pending-source"
                             : fallback_projection->source_ids.front();
        item.runbook_id = "runbook:pending";
        item.approval_ticket_id = "approval-ticket:pending";
        item.bridge_kind = "conditional-field-evidence";
        item.label = "Conditional field evidence attachment";
        item.site_runbook_evidence_ref =
            "siteRunbookEvidenceRef:" + item.site_id + ":" + item.source_group + ":pending";
        item.conditional_not_run_evidence =
            "conditionalNotRunEvidence: no field adapter item exists; not-run";
        item.not_run_reason = "field evidence adapter source is empty";
        item.redacted_field_evidence =
            "redactedFieldEvidence: no raw endpoint, credential, provider, or VLM material";
        item.simulation_input_ref =
            "/ops/api/site-operations/simulation-input-pack:fieldEvidenceAttachment:pending";
        item.simulation_readiness_blocker_ref =
            "/ops/api/site-operations/cross-site-safe-apply-readiness:pending";
        item.runbook_ledger_ref = "runbookLedgerRef:pending";
        item.approval_ticket_ref = "approvalTicketRef:pending";
        item.condition_refs = {"condition:pending:not-run"};
        item.evidence_refs = {
            "/ops/api/site-operations/source-registry-projection",
            "/ops/api/site-operations/runbook-instance-ledger",
            "/ops/api/site-operations/approval-ticket-workflow",
            "/ops/api/live-operations/simulation/field-evidence-adapter",
        };
        items.push_back(std::move(item));
    }
    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23522 function
OpsV370FieldEvidenceAttachmentSummary BuildV370FieldEvidenceAttachmentSummary(
    const std::vector<OpsV370FieldEvidenceAttachmentItem>& items) {
    OpsV370FieldEvidenceAttachmentSummary summary;
    summary.derivation_sources = {
        "BuildV340FieldBridgeConditionGates",
        "BuildV350FieldEvidenceIntakeRecords",
        "BuildV350FieldEvidenceExecutionConditions",
        "BuildV360FieldEvidenceSimulationAdapterItems",
        "BuildV370SiteAwareSourceRegistryProjectionItems",
        "BuildV370SiteSimulationInputPackItems",
        "BuildV370RunbookInstanceLedgerEntries",
        "BuildV370ApprovalTicketWorkflowItems",
    };
    summary.attachment_count = static_cast<int>(items.size());
    for (const auto& item : items) {
        if (item.bridge_kind == "onvif-real-device") {
            ++summary.onvif_condition_count;
        } else if (item.bridge_kind == "external-whep-turn") {
            ++summary.external_whep_turn_condition_count;
        } else if (item.bridge_kind == "real-cloud-vlm-provider") {
            ++summary.cloud_vlm_provider_condition_count;
        }
        if (item.execution_status == "not-run") {
            ++summary.not_run_count;
        }
        if (item.endpoint_required) {
            ++summary.endpoint_required_count;
        }
        if (item.credential_required) {
            ++summary.credential_required_count;
        }
        if (item.operator_approval_required) {
            ++summary.approval_required_count;
        }
        if (!item.runbook_ledger_ref.empty()) {
            ++summary.runbook_ref_count;
        }
        if (!item.approval_ticket_ref.empty()) {
            ++summary.approval_ref_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23566 function
void AppendV370FieldEvidenceAttachmentSummaryJson(
    std::ostringstream& out,
    const OpsV370FieldEvidenceAttachmentSummary& summary) {
    out << "{"
        << "\"attachmentCount\":" << summary.attachment_count << ","
        << "\"onvifConditionCount\":" << summary.onvif_condition_count << ","
        << "\"externalWhepTurnConditionCount\":"
        << summary.external_whep_turn_condition_count << ","
        << "\"cloudVlmProviderConditionCount\":"
        << summary.cloud_vlm_provider_condition_count << ","
        << "\"notRunCount\":" << summary.not_run_count << ","
        << "\"endpointRequiredCount\":" << summary.endpoint_required_count << ","
        << "\"credentialRequiredCount\":" << summary.credential_required_count << ","
        << "\"approvalRequiredCount\":" << summary.approval_required_count << ","
        << "\"runbookRefCount\":" << summary.runbook_ref_count << ","
        << "\"approvalRefCount\":" << summary.approval_ref_count << ","
        << "\"derivationSources\":";
    AppendJsonStringArray(out, summary.derivation_sources);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23587 function
void AppendV370FieldEvidenceAttachmentItemJson(
    std::ostringstream& out,
    const OpsV370FieldEvidenceAttachmentItem& item) {
    out << "{"
        << "\"fieldEvidenceAttachmentId\":\""
        << JsonEscape(item.field_evidence_attachment_id) << "\","
        << "\"siteId\":\"" << JsonEscape(item.site_id) << "\","
        << "\"sourceGroup\":\"" << JsonEscape(item.source_group) << "\","
        << "\"sourceId\":\"" << JsonEscape(item.source_id) << "\","
        << "\"runbookId\":\"" << JsonEscape(item.runbook_id) << "\","
        << "\"approvalTicketId\":\"" << JsonEscape(item.approval_ticket_id) << "\","
        << "\"bridgeKind\":\"" << JsonEscape(item.bridge_kind) << "\","
        << "\"label\":\"" << JsonEscape(item.label) << "\","
        << "\"siteRunbookEvidenceRef\":\""
        << JsonEscape(item.site_runbook_evidence_ref) << "\","
        << "\"conditionalNotRunEvidence\":\""
        << JsonEscape(item.conditional_not_run_evidence) << "\","
        << "\"executionStatus\":\"" << JsonEscape(item.execution_status) << "\","
        << "\"fieldSmokeStatus\":\"" << JsonEscape(item.field_smoke_status) << "\","
        << "\"notRunReason\":\"" << JsonEscape(item.not_run_reason) << "\","
        << "\"redactedFieldEvidence\":\""
        << JsonEscape(item.redacted_field_evidence) << "\","
        << "\"simulationInputRef\":\"" << JsonEscape(item.simulation_input_ref) << "\","
        << "\"simulationReadinessBlockerRef\":\""
        << JsonEscape(item.simulation_readiness_blocker_ref) << "\","
        << "\"runbookLedgerRef\":\"" << JsonEscape(item.runbook_ledger_ref) << "\","
        << "\"approvalTicketRef\":\"" << JsonEscape(item.approval_ticket_ref) << "\","
        << "\"conditionRefs\":";
    AppendJsonStringArray(out, item.condition_refs);
    out << ",\"evidenceRefs\":";
    AppendJsonStringArray(out, item.evidence_refs);
    out << ",\"endpointRequired\":" << JsonBool(item.endpoint_required)
        << ",\"credentialRequired\":" << JsonBool(item.credential_required)
        << ",\"operatorApprovalRequired\":"
        << JsonBool(item.operator_approval_required)
        << ",\"readOnly\":" << JsonBool(item.read_only)
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23626 function
std::string OpsV370FieldEvidenceAttachmentJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v370-field-evidence-attachment.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans = BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto dryRunResults = BuildV360CommandPlanDryRunResults(commandPlanCandidates);
    const auto impactDiffs =
        BuildV360SourceRuleImpactDiffs(context, commandPlanCandidates, stagedChangePlans);
    const auto readinessItems = BuildV360SafeApplyReadinessItems(dryRunResults, impactDiffs);
    const auto v360InputPackItems =
        BuildV360SimulationInputPackItems(context, commandPlanCandidates, stagedChangePlans);
    const auto inputSummary = BuildV360SimulationInputPackSummary(v360InputPackItems);
    const auto simulationRunContract = BuildV360SimulationRunContract();
    const auto simulationResultEnvelope = BuildV360SimulationResultEnvelope(inputSummary);
    const auto simulationRunLedgerEntries =
        BuildV360SimulationRunLedgerEntries(context,
                                            v360InputPackItems,
                                            simulationRunContract,
                                            simulationResultEnvelope,
                                            dryRunResults,
                                            impactDiffs,
                                            readinessItems);
    const auto projection =
        BuildV370SiteAwareSourceRegistryProjectionItems(context.sources, context.views);
    const auto rollups =
        BuildV370SiteHealthRollupItems(context.sources, context.views, source_health_snapshot);
    const auto impactGraphNodes = BuildV370SiteImpactGraphNodes(context, projection, rollups);
    const auto impactGraphEdges = BuildV370SiteImpactGraphEdges(projection);
    const auto siteSimulationInputPackItems =
        BuildV370SiteSimulationInputPackItems(context,
                                             projection,
                                             rollups,
                                             impactGraphNodes,
                                             impactGraphEdges,
                                             v360InputPackItems);
    const auto crossSiteReadinessItems =
        BuildV370CrossSiteSafeApplyReadinessItems(projection,
                                                 siteSimulationInputPackItems,
                                                 readinessItems,
                                                 impactDiffs);
    const auto runbookTemplateContractItems =
        BuildV370RunbookTemplateContractItems(commandPlanCandidates,
                                             dryRunResults,
                                             impactDiffs,
                                             readinessItems,
                                             projection,
                                             siteSimulationInputPackItems,
                                             crossSiteReadinessItems);
    const auto runbookInstanceLedgerEntries =
        BuildV370RunbookInstanceLedgerEntries(runbookTemplateContractItems,
                                             crossSiteReadinessItems,
                                             simulationRunLedgerEntries);
    const auto approvalTicketWorkflowItems =
        BuildV370ApprovalTicketWorkflowItems(runbookTemplateContractItems,
                                            runbookInstanceLedgerEntries,
                                            crossSiteReadinessItems);
    const auto fieldBridgeConditionGates = BuildV340FieldBridgeConditionGates();
    const auto fieldEvidenceIntakeRecords =
        BuildV350FieldEvidenceIntakeRecords(fieldBridgeConditionGates);
    const auto fieldEvidenceExecutionConditions =
        BuildV350FieldEvidenceExecutionConditions(fieldEvidenceIntakeRecords);
    const auto attachments =
        BuildV370FieldEvidenceAttachmentItems(projection,
                                             siteSimulationInputPackItems,
                                             runbookInstanceLedgerEntries,
                                             approvalTicketWorkflowItems,
                                             fieldEvidenceIntakeRecords,
                                             fieldEvidenceExecutionConditions);
    const auto summary = BuildV370FieldEvidenceAttachmentSummary(attachments);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v370-field-evidence-attachment.v1\","
        << "\"status\":\"field-evidence-attachment\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"siteRegistryProjectionRoute\":\"/ops/api/site-operations/source-registry-projection\","
        << "\"siteSimulationInputPackRoute\":\"/ops/api/site-operations/simulation-input-pack\","
        << "\"runbookInstanceLedgerRoute\":\"/ops/api/site-operations/runbook-instance-ledger\","
        << "\"approvalTicketWorkflowRoute\":\"/ops/api/site-operations/approval-ticket-workflow\","
        << "\"fieldEvidenceSimulationAdapterRoute\":\"/ops/api/live-operations/simulation/field-evidence-adapter\","
        << "\"fieldEvidenceAttachmentSummary\":";
    AppendV370FieldEvidenceAttachmentSummaryJson(out, summary);
    out << ",\"fieldEvidenceAttachments\":[";
    for (std::size_t i = 0; i < attachments.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV370FieldEvidenceAttachmentItemJson(out, attachments[i]);
    }
    out << "],\"attachmentPolicy\":{"
        << "\"siteRunbookEvidenceRef\":\"site/runbook scoped reference only\","
        << "\"conditionalNotRunEvidence\":true,"
        << "\"ONVIF\":\"conditional-not-run\","
        << "\"externalWhepTurn\":\"conditional-not-run\","
        << "\"cloudVlmProvider\":\"conditional-not-run\","
        << "\"fieldSmoke\":\"not-run\","
        << "\"rawMaterial\":\"redacted\""
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"attachmentOnly\":true,"
        << "\"siteScoped\":true,"
        << "\"conditionalNotRunOnly\":true,"
        << "\"fieldSmokeExecuted\":false,"
        << "\"endpointProbePerformed\":false,"
        << "\"credentialProbePerformed\":false,"
        << "\"providerCallPerformed\":false,"
        << "\"vlmProviderCalled\":false,"
        << "\"vlmRuntimeCallPerformed\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"runbookInstancePersisted\":false,"
        << "\"approvalTicketWritePerformed\":false,"
        << "\"approvalDecisionPersisted\":false,"
        << "\"operatorNoteWritePerformed\":false,"
        << "\"resultDiffPersisted\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"viewerClientPayloadChanged\":false,"
        << "\"rawEndpointIncluded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"rawJsonIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"providerMaterialIncluded\":false,"
        << "\"vlmPromptIncluded\":false,"
        << "\"vlmResponseIncluded\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23807 function
std::string V380FieldConnectorKindForBridge(const std::string& bridge_kind) {
    if (bridge_kind == "onvif-real-device") {
        return "onvif-connector-evidence";
    }
    if (bridge_kind == "external-whep-turn") {
        return "external-whep-turn-connector-evidence";
    }
    if (bridge_kind == "real-cloud-vlm-provider") {
        return "cloud-provider-connector-evidence";
    }
    return "field-connector-evidence";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23820 function
std::vector<OpsV380FieldConnectorEvidencePackageItem>
BuildV380FieldConnectorEvidencePackageItems(
    const std::vector<OpsV380ActionReadinessPreflightItem>& readinessItems,
    const std::vector<OpsV380SourceRecheckActionPilotItem>& sourceRecheckItems,
    const std::vector<OpsV380OutcomeObserverReconciliationItem>& outcomeItems,
    const std::vector<OpsV380ActionReceiptBundleItem>& receiptItems,
    const std::vector<OpsV370FieldEvidenceAttachmentItem>& fieldAttachments) {
    std::vector<OpsV380FieldConnectorEvidencePackageItem> items;
    const std::size_t item_count =
        std::max<std::size_t>(1U,
                              std::max({fieldAttachments.size(),
                                        readinessItems.size(),
                                        sourceRecheckItems.size(),
                                        receiptItems.size()}));

    for (std::size_t index = 0; index < item_count && index < 8U; ++index) {
        const auto& readiness =
            readinessItems.empty() ? OpsV380ActionReadinessPreflightItem{}
                                   : readinessItems[index % readinessItems.size()];
        const auto& source =
            sourceRecheckItems.empty() ? OpsV380SourceRecheckActionPilotItem{}
                                       : sourceRecheckItems[index % sourceRecheckItems.size()];
        const auto& outcome =
            outcomeItems.empty() ? OpsV380OutcomeObserverReconciliationItem{}
                                 : outcomeItems[index % outcomeItems.size()];
        const auto& receipt =
            receiptItems.empty() ? OpsV380ActionReceiptBundleItem{}
                                 : receiptItems[index % receiptItems.size()];
        const auto& attachment =
            fieldAttachments.empty() ? OpsV370FieldEvidenceAttachmentItem{}
                                     : fieldAttachments[index % fieldAttachments.size()];

        OpsV380FieldConnectorEvidencePackageItem item;
        item.connector_kind = V380FieldConnectorKindForBridge(attachment.bridge_kind);
        item.connector_evidence_package_id =
            "fieldConnectorEvidencePackage:" + item.connector_kind + ":" +
            std::to_string(index + 1);
        item.action_request_ref =
            receipt.action_request_ref.empty()
                ? "actionRequestRef:v380-actions/{siteId}/{actionKind}/{idempotencyKey}"
                : receipt.action_request_ref;
        item.readiness_ref =
            readiness.dimension.empty()
                ? "/ops/api/actions/readiness-preflight#fieldEvidence"
                : "/ops/api/actions/readiness-preflight#" + readiness.dimension;
        item.source_recheck_ref =
            source.field.empty()
                ? "/ops/api/actions/source-recheck-pilot#sourceHealthRecheck"
                : "/ops/api/actions/source-recheck-pilot#" + source.field;
        item.outcome_ref =
            outcome.outcome_observer_id.empty()
                ? "/ops/api/actions/outcome-reconciliation#pending"
                : "/ops/api/actions/outcome-reconciliation#" + outcome.outcome_observer_id;
        item.receipt_bundle_ref =
            receipt.receipt_bundle_id.empty()
                ? "/ops/api/actions/receipt-bundle#redacted-release-safe"
                : "/ops/api/actions/receipt-bundle#" + receipt.receipt_bundle_id;
        item.field_attachment_ref =
            attachment.field_evidence_attachment_id.empty()
                ? "/ops/api/site-operations/field-evidence-attachment#conditional-not-run"
                : "/ops/api/site-operations/field-evidence-attachment#" +
                      attachment.field_evidence_attachment_id;
        item.endpoint_approval_ref =
            "endpoint-approval-required:" + item.connector_kind;
        item.credential_approval_ref =
            "credential-approval-required:" + item.connector_kind;
        item.connector_evidence_state = "conditional-not-run";
        item.field_smoke_status =
            attachment.field_smoke_status.empty() ? "field-smoke-not-run"
                                                  : attachment.field_smoke_status;
        item.redacted_connector_evidence =
            attachment.redacted_field_evidence.empty()
                ? "redactedConnectorEvidence: endpoint, locator, credential, provider, and debug material omitted"
                : "redactedConnectorEvidence: " + attachment.redacted_field_evidence;
        item.condition_refs = attachment.condition_refs;
        item.condition_refs.push_back("credential-approval-required");
        item.condition_refs.push_back("endpoint-approval-required");
        item.condition_refs.push_back(item.field_smoke_status);
        item.evidence_refs = attachment.evidence_refs;
        item.evidence_refs.push_back("/ops/api/actions/readiness-preflight");
        item.evidence_refs.push_back("/ops/api/actions/source-recheck-pilot");
        item.evidence_refs.push_back("/ops/api/actions/outcome-reconciliation");
        item.evidence_refs.push_back("/ops/api/actions/receipt-bundle");
        item.evidence_refs.push_back("/ops/api/site-operations/field-evidence-attachment");
        item.evidence_refs.push_back("onvif-connector-evidence");
        item.evidence_refs.push_back("external-whep-turn-connector-evidence");
        item.evidence_refs.push_back("cloud-provider-connector-evidence");
        item.endpoint_required = attachment.endpoint_required;
        item.credential_required = attachment.credential_required;
        item.operator_approval_required = attachment.operator_approval_required;
        items.push_back(std::move(item));
    }
    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23915 function
OpsV380FieldConnectorEvidencePackageSummary
BuildV380FieldConnectorEvidencePackageSummary(
    const std::vector<OpsV380FieldConnectorEvidencePackageItem>& items) {
    OpsV380FieldConnectorEvidencePackageSummary summary;
    summary.derivation_sources = {
        "BuildV380ActionReadinessPreflightItems",
        "BuildV380SourceRecheckActionPilotItems",
        "BuildV380OutcomeObserverReconciliationItems",
        "BuildV380ActionReceiptBundleItems",
        "BuildV370FieldEvidenceAttachmentItems",
    };
    summary.connector_package_count = static_cast<int>(items.size());
    for (const auto& item : items) {
        if (item.connector_kind == "onvif-connector-evidence") {
            ++summary.onvif_connector_count;
        } else if (item.connector_kind == "external-whep-turn-connector-evidence") {
            ++summary.external_whep_turn_connector_count;
        } else if (item.connector_kind == "cloud-provider-connector-evidence") {
            ++summary.cloud_provider_connector_count;
        }
        if (item.endpoint_required) {
            ++summary.endpoint_approval_required_count;
        }
        if (item.credential_required) {
            ++summary.credential_approval_required_count;
        }
        if (item.operator_approval_required) {
            ++summary.operator_approval_required_count;
        }
        if (item.connector_evidence_state == "conditional-not-run" ||
            item.field_smoke_status == "field-smoke-not-run") {
            ++summary.not_run_count;
        }
        if (item.release_safe) {
            ++summary.release_safe_count;
        }
        summary.condition_ref_count += static_cast<int>(item.condition_refs.size());
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23956 function
void AppendV380FieldConnectorEvidencePackageSummaryJson(
    std::ostringstream& out,
    const OpsV380FieldConnectorEvidencePackageSummary& summary) {
    out << "{"
        << "\"connectorPackageCount\":" << summary.connector_package_count << ","
        << "\"onvifConnectorCount\":" << summary.onvif_connector_count << ","
        << "\"externalWhepTurnConnectorCount\":"
        << summary.external_whep_turn_connector_count << ","
        << "\"cloudProviderConnectorCount\":"
        << summary.cloud_provider_connector_count << ","
        << "\"endpointApprovalRequiredCount\":"
        << summary.endpoint_approval_required_count << ","
        << "\"credentialApprovalRequiredCount\":"
        << summary.credential_approval_required_count << ","
        << "\"operatorApprovalRequiredCount\":"
        << summary.operator_approval_required_count << ","
        << "\"notRunCount\":" << summary.not_run_count << ","
        << "\"releaseSafeCount\":" << summary.release_safe_count << ","
        << "\"conditionRefCount\":" << summary.condition_ref_count << ","
        << "\"derivationSources\":";
    AppendJsonStringArray(out, summary.derivation_sources);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23980 function
void AppendV380FieldConnectorEvidencePackageItemJson(
    std::ostringstream& out,
    const OpsV380FieldConnectorEvidencePackageItem& item) {
    out << "{"
        << "\"connectorEvidencePackageId\":\""
        << JsonEscape(item.connector_evidence_package_id) << "\","
        << "\"connectorKind\":\"" << JsonEscape(item.connector_kind) << "\","
        << "\"actionRequestRef\":\"" << JsonEscape(item.action_request_ref) << "\","
        << "\"readinessRef\":\"" << JsonEscape(item.readiness_ref) << "\","
        << "\"sourceRecheckRef\":\"" << JsonEscape(item.source_recheck_ref) << "\","
        << "\"outcomeRef\":\"" << JsonEscape(item.outcome_ref) << "\","
        << "\"receiptBundleRef\":\"" << JsonEscape(item.receipt_bundle_ref) << "\","
        << "\"fieldAttachmentRef\":\"" << JsonEscape(item.field_attachment_ref) << "\","
        << "\"endpointApprovalRef\":\"" << JsonEscape(item.endpoint_approval_ref) << "\","
        << "\"credentialApprovalRef\":\"" << JsonEscape(item.credential_approval_ref) << "\","
        << "\"operatorApprovalRequired\":"
        << JsonBool(item.operator_approval_required) << ","
        << "\"connectorEvidenceState\":\""
        << JsonEscape(item.connector_evidence_state) << "\","
        << "\"fieldSmokeStatus\":\"" << JsonEscape(item.field_smoke_status) << "\","
        << "\"redactedConnectorEvidence\":\""
        << JsonEscape(item.redacted_connector_evidence) << "\","
        << "\"conditionRefs\":";
    AppendJsonStringArray(out, item.condition_refs);
    out << ",\"evidenceRefs\":";
    AppendJsonStringArray(out, item.evidence_refs);
    out << ",\"endpointRequired\":" << JsonBool(item.endpoint_required)
        << ",\"credentialRequired\":" << JsonBool(item.credential_required)
        << ",\"releaseSafe\":" << JsonBool(item.release_safe)
        << ",\"readOnly\":" << JsonBool(item.read_only)
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24013 function
std::string OpsV380FieldConnectorEvidencePackageJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v380-field-connector-evidence-package.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans = BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto dryRunResults = BuildV360CommandPlanDryRunResults(commandPlanCandidates);
    const auto impactDiffs =
        BuildV360SourceRuleImpactDiffs(context, commandPlanCandidates, stagedChangePlans);
    const auto readinessItemsV360 =
        BuildV360SafeApplyReadinessItems(dryRunResults, impactDiffs);
    const auto v360InputPackItems =
        BuildV360SimulationInputPackItems(context, commandPlanCandidates, stagedChangePlans);
    const auto inputSummary = BuildV360SimulationInputPackSummary(v360InputPackItems);
    const auto simulationRunContract = BuildV360SimulationRunContract();
    const auto simulationResultEnvelope = BuildV360SimulationResultEnvelope(inputSummary);
    const auto simulationRunLedgerEntries =
        BuildV360SimulationRunLedgerEntries(context,
                                            v360InputPackItems,
                                            simulationRunContract,
                                            simulationResultEnvelope,
                                            dryRunResults,
                                            impactDiffs,
                                            readinessItemsV360);
    const auto projection =
        BuildV370SiteAwareSourceRegistryProjectionItems(context.sources, context.views);
    const auto rollups =
        BuildV370SiteHealthRollupItems(context.sources, context.views, source_health_snapshot);
    const auto impactGraphNodes = BuildV370SiteImpactGraphNodes(context, projection, rollups);
    const auto impactGraphEdges = BuildV370SiteImpactGraphEdges(projection);
    const auto siteSimulationInputPackItems =
        BuildV370SiteSimulationInputPackItems(context,
                                             projection,
                                             rollups,
                                             impactGraphNodes,
                                             impactGraphEdges,
                                             v360InputPackItems);
    const auto crossSiteReadinessItems =
        BuildV370CrossSiteSafeApplyReadinessItems(projection,
                                                 siteSimulationInputPackItems,
                                                 readinessItemsV360,
                                                 impactDiffs);
    const auto runbookTemplateContractItems =
        BuildV370RunbookTemplateContractItems(commandPlanCandidates,
                                             dryRunResults,
                                             impactDiffs,
                                             readinessItemsV360,
                                             projection,
                                             siteSimulationInputPackItems,
                                             crossSiteReadinessItems);
    const auto runbookInstanceLedgerEntries =
        BuildV370RunbookInstanceLedgerEntries(runbookTemplateContractItems,
                                             crossSiteReadinessItems,
                                             simulationRunLedgerEntries);
    const auto approvalTicketWorkflowItems =
        BuildV370ApprovalTicketWorkflowItems(runbookTemplateContractItems,
                                            runbookInstanceLedgerEntries,
                                            crossSiteReadinessItems);
    const auto fieldBridgeConditionGates = BuildV340FieldBridgeConditionGates();
    const auto fieldEvidenceIntakeRecords =
        BuildV350FieldEvidenceIntakeRecords(fieldBridgeConditionGates);
    const auto fieldEvidenceExecutionConditions =
        BuildV350FieldEvidenceExecutionConditions(fieldEvidenceIntakeRecords);
    const auto fieldAttachments =
        BuildV370FieldEvidenceAttachmentItems(projection,
                                             siteSimulationInputPackItems,
                                             runbookInstanceLedgerEntries,
                                             approvalTicketWorkflowItems,
                                             fieldEvidenceIntakeRecords,
                                             fieldEvidenceExecutionConditions);
    const auto readinessItems = BuildV380ActionReadinessPreflightItems();
    const auto sourceRecheckItems = BuildV380SourceRecheckActionPilotItems();
    const auto outcomeItems = BuildV380OutcomeObserverReconciliationItems();
    const auto receiptItems = BuildV380ActionReceiptBundleItems();
    const auto packageItems =
        BuildV380FieldConnectorEvidencePackageItems(readinessItems,
                                                   sourceRecheckItems,
                                                   outcomeItems,
                                                   receiptItems,
                                                   fieldAttachments);
    const auto summary =
        BuildV380FieldConnectorEvidencePackageSummary(packageItems);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v380-field-connector-evidence-package.v1\","
        << "\"status\":\"field-connector-evidence-package\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"route\":\"/ops/api/actions/field-connector-evidence-package\","
        << "\"readinessPreflightRoute\":\"/ops/api/actions/readiness-preflight\","
        << "\"sourceRecheckActionPilotRoute\":\"/ops/api/actions/source-recheck-pilot\","
        << "\"outcomeReconciliationRoute\":\"/ops/api/actions/outcome-reconciliation\","
        << "\"receiptBundleRoute\":\"/ops/api/actions/receipt-bundle\","
        << "\"fieldEvidenceAttachmentRoute\":\"/ops/api/site-operations/field-evidence-attachment\","
        << "\"fieldConnectorEvidenceSummary\":";
    AppendV380FieldConnectorEvidencePackageSummaryJson(out, summary);
    out << ",\"fieldConnectorEvidenceItems\":[";
    for (std::size_t i = 0; i < packageItems.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV380FieldConnectorEvidencePackageItemJson(out, packageItems[i]);
    }
    out << "],\"connectorEvidencePolicy\":{"
        << "\"connectorEvidencePackageOnly\":true,"
        << "\"conditionalNotRunOnly\":true,"
        << "\"releaseSafe\":true,"
        << "\"onvif\":\"credential-approval-required; endpoint-approval-required; field-smoke-not-run\","
        << "\"externalWhepTurn\":\"credential-approval-required; endpoint-approval-required; field-smoke-not-run\","
        << "\"cloudProvider\":\"credential-approval-required; endpoint-approval-required; field-smoke-not-run\","
        << "\"rawMaterial\":\"redacted\""
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"connectorEvidencePackageOnly\":true,"
        << "\"conditionalNotRunOnly\":true,"
        << "\"releaseSafe\":true,"
        << "\"fieldSmokeExecuted\":false,"
        << "\"endpointProbePerformed\":false,"
        << "\"credentialProbePerformed\":false,"
        << "\"providerCallPerformed\":false,"
        << "\"onvifDeviceContacted\":false,"
        << "\"externalWhepContacted\":false,"
        << "\"externalTurnCredentialUsed\":false,"
        << "\"cloudProviderCalled\":false,"
        << "\"actionExecutionPerformed\":false,"
        << "\"sourceRecheckExecuted\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"noticeQueueWritePerformed\":false,"
        << "\"ruleApplyPerformed\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"viewerClientPayloadChanged\":false,"
        << "\"rawEndpointIncluded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"rawJsonIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"providerMaterialIncluded\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24205 function
std::vector<OpsV380DefaultOffActionExplanationItem>
BuildV380DefaultOffActionExplanationItems(
    const std::vector<OpsV380ApprovalDecisionGateItem>& approvalItems,
    const std::vector<OpsV380ActionReadinessPreflightItem>& readinessItems,
    const std::vector<OpsV380OutcomeObserverReconciliationItem>& outcomeItems,
    const std::vector<OpsV380ActionReceiptBundleItem>& receiptItems,
    const std::vector<OpsV380FieldConnectorEvidencePackageItem>& fieldConnectorItems) {
    std::vector<OpsV380DefaultOffActionExplanationItem> items;
    const auto* approval =
        approvalItems.empty() ? nullptr : &approvalItems.front();
    const auto* readiness =
        readinessItems.empty() ? nullptr : &readinessItems.front();
    const auto* outcome =
        outcomeItems.empty() ? nullptr : &outcomeItems.front();
    const auto* receipt =
        receiptItems.empty() ? nullptr : &receiptItems.front();
    const auto* field =
        fieldConnectorItems.empty() ? nullptr : &fieldConnectorItems.front();

    OpsV380DefaultOffActionExplanationItem approval_item;
    approval_item.default_off_action_explanation_id =
        "defaultOffActionExplanation:approval-blocker-explanation";
    approval_item.explanation_kind = "approval-blocker-explanation";
    approval_item.approval_blocker_summary =
        approval == nullptr
            ? "approval blocker summary: approval decision is required before readiness"
            : "approval blocker summary: " + approval->decision + " requires " +
                  approval->required_role + " reason before readiness";
    approval_item.readiness_reason_summary =
        "readiness reason summary: approval must be approved and not stale";
    approval_item.outcome_hint =
        "outcome hint: no outcome is observed until an approved, explicit action path exists";
    approval_item.operator_review_hint =
        "operator review hint: choose approve, hold, reject, or field-needed outside this read model";
    approval_item.action_request_ref =
        receipt == nullptr ? "actionRequestRef:v380-actions/{siteId}/{actionKind}/{idempotencyKey}"
                           : receipt->action_request_ref;
    approval_item.approval_ref = "/ops/api/actions/approval-decision-gate#provider-opt-in-required";
    approval_item.readiness_ref = "/ops/api/actions/readiness-preflight#approval";
    approval_item.outcome_ref =
        outcome == nullptr ? "/ops/api/actions/outcome-reconciliation#pending"
                           : "/ops/api/actions/outcome-reconciliation#" + outcome->outcome_observer_id;
    approval_item.receipt_bundle_ref =
        receipt == nullptr ? "/ops/api/actions/receipt-bundle#redacted-release-safe"
                           : "/ops/api/actions/receipt-bundle#" + receipt->receipt_bundle_id;
    approval_item.field_connector_ref =
        field == nullptr ? "/ops/api/actions/field-connector-evidence-package#conditional-not-run"
                         : "/ops/api/actions/field-connector-evidence-package#" +
                               field->connector_evidence_package_id;
    approval_item.redacted_explanation =
        "redactedExplanation: approval blocker text only; no raw prompt, provider response, credential, locator, or debug material";
    approval_item.evidence_refs = {
        "BuildV380ApprovalDecisionGateItems",
        "BuildV380ActionReadinessPreflightItems",
        "/ops/api/actions/approval-decision-gate",
        "/ops/api/actions/readiness-preflight",
        "provider-opt-in-required",
        "runtime-opt-in-required",
    };
    items.push_back(std::move(approval_item));

    const auto readiness_source =
        readiness == nullptr ? std::string("readiness") : readiness->source;
    OpsV380DefaultOffActionExplanationItem readiness_item;
    readiness_item.default_off_action_explanation_id =
        "defaultOffActionExplanation:readiness-reason-explanation";
    readiness_item.explanation_kind = "readiness-reason-explanation";
    readiness_item.approval_blocker_summary =
        "approval blocker summary: readiness remains not-run until approval and field evidence refs are reviewed";
    readiness_item.readiness_reason_summary =
        readiness == nullptr
            ? "readiness reason summary: blocker and source health reasons are pending"
            : "readiness reason summary: " + readiness->dimension + " expects " +
                  readiness->expected_state + " but is guarded by " + readiness->blocker;
    readiness_item.outcome_hint =
        "outcome hint: readiness reason explains why source recheck, notice, or rule package stays preview-only";
    readiness_item.operator_review_hint =
        "operator review hint: inspect " + readiness_source +
        " and keep provider/runtime explanation default-off";
    readiness_item.action_request_ref =
        receipt == nullptr ? "actionRequestRef:v380-actions/{siteId}/{actionKind}/{idempotencyKey}"
                           : receipt->action_request_ref;
    readiness_item.approval_ref = "/ops/api/actions/approval-decision-gate#approval-blocker-explanation";
    readiness_item.readiness_ref =
        readiness == nullptr ? "/ops/api/actions/readiness-preflight#provider-opt-in-required"
                             : "/ops/api/actions/readiness-preflight#" + readiness->dimension;
    readiness_item.outcome_ref =
        outcome == nullptr ? "/ops/api/actions/outcome-reconciliation#pending"
                           : "/ops/api/actions/outcome-reconciliation#" + outcome->outcome_observer_id;
    readiness_item.receipt_bundle_ref =
        receipt == nullptr ? "/ops/api/actions/receipt-bundle#redacted-release-safe"
                           : "/ops/api/actions/receipt-bundle#" + receipt->receipt_bundle_id;
    readiness_item.field_connector_ref =
        field == nullptr ? "/ops/api/actions/field-connector-evidence-package#conditional-not-run"
                         : "/ops/api/actions/field-connector-evidence-package#" +
                               field->connector_evidence_package_id;
    readiness_item.redacted_explanation =
        "redactedExplanation: readiness reason summary only; provider/runtime call remains not-run";
    readiness_item.evidence_refs = {
        "BuildV380ActionReadinessPreflightItems",
        "BuildV380FieldConnectorEvidencePackageItems",
        "/ops/api/actions/readiness-preflight",
        "/ops/api/actions/field-connector-evidence-package",
        "provider-opt-in-required",
        "runtime-opt-in-required",
    };
    items.push_back(std::move(readiness_item));

    OpsV380DefaultOffActionExplanationItem outcome_item;
    outcome_item.default_off_action_explanation_id =
        "defaultOffActionExplanation:outcome-hint-explanation";
    outcome_item.explanation_kind = "outcome-hint-explanation";
    outcome_item.approval_blocker_summary =
        "approval blocker summary: outcome hints cannot replace approval or readiness";
    outcome_item.readiness_reason_summary =
        "readiness reason summary: outcome hints stay explain-only until an explicit approved pilot exists";
    outcome_item.outcome_hint =
        outcome == nullptr
            ? "outcome hint: pending outcome comparison, no EventRecord or client impact mutation"
            : "outcome hint: " + outcome->reconciliation_status + " with " +
                  outcome->observed_outcome_ref + " and " + outcome->source_outcome_diff;
    outcome_item.operator_review_hint =
        "operator review hint: compare receipt and outcome refs; keep default-off explanation separate from provider calls";
    outcome_item.action_request_ref =
        receipt == nullptr ? "actionRequestRef:v380-actions/{siteId}/{actionKind}/{idempotencyKey}"
                           : receipt->action_request_ref;
    outcome_item.approval_ref = "/ops/api/actions/approval-decision-gate#approval-blocker-explanation";
    outcome_item.readiness_ref = "/ops/api/actions/readiness-preflight#readiness-reason-explanation";
    outcome_item.outcome_ref =
        outcome == nullptr ? "/ops/api/actions/outcome-reconciliation#pending"
                           : "/ops/api/actions/outcome-reconciliation#" + outcome->outcome_observer_id;
    outcome_item.receipt_bundle_ref =
        receipt == nullptr ? "/ops/api/actions/receipt-bundle#redacted-release-safe"
                           : "/ops/api/actions/receipt-bundle#" + receipt->receipt_bundle_id;
    outcome_item.field_connector_ref =
        field == nullptr ? "/ops/api/actions/field-connector-evidence-package#conditional-not-run"
                         : "/ops/api/actions/field-connector-evidence-package#" +
                               field->connector_evidence_package_id;
    outcome_item.redacted_explanation =
        "redactedExplanation: outcome hint only; raw prompt, provider response, credential, endpoint, and debug material omitted";
    outcome_item.evidence_refs = {
        "BuildV380OutcomeObserverReconciliationItems",
        "BuildV380ActionReceiptBundleItems",
        "BuildV380FieldConnectorEvidencePackageItems",
        "/ops/api/actions/outcome-reconciliation",
        "/ops/api/actions/receipt-bundle",
        "/ops/api/actions/field-connector-evidence-package",
        "provider-opt-in-required",
        "runtime-opt-in-required",
    };
    items.push_back(std::move(outcome_item));

    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24360 function
OpsV380DefaultOffActionExplanationSummary
BuildV380DefaultOffActionExplanationSummary(
    const std::vector<OpsV380DefaultOffActionExplanationItem>& items) {
    OpsV380DefaultOffActionExplanationSummary summary;
    summary.derivation_sources = {
        "BuildV380ApprovalDecisionGateItems",
        "BuildV380ActionReadinessPreflightItems",
        "BuildV380OutcomeObserverReconciliationItems",
        "BuildV380ActionReceiptBundleItems",
        "BuildV380FieldConnectorEvidencePackageItems",
    };
    summary.explanation_count = static_cast<int>(items.size());
    for (const auto& item : items) {
        if (item.explanation_kind == "approval-blocker-explanation") {
            ++summary.approval_blocker_count;
        } else if (item.explanation_kind == "readiness-reason-explanation") {
            ++summary.readiness_reason_count;
        } else if (item.explanation_kind == "outcome-hint-explanation") {
            ++summary.outcome_hint_count;
        }
        if (item.default_off && !item.default_enabled) {
            ++summary.default_off_count;
        }
        if (item.provider_opt_in_required) {
            ++summary.provider_opt_in_required_count;
        }
        if (item.runtime_opt_in_required) {
            ++summary.runtime_opt_in_required_count;
        }
        if (item.release_safe) {
            ++summary.release_safe_count;
        }
        summary.evidence_ref_count += static_cast<int>(item.evidence_refs.size());
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24397 function
void AppendV380DefaultOffActionExplanationSummaryJson(
    std::ostringstream& out,
    const OpsV380DefaultOffActionExplanationSummary& summary) {
    out << "{"
        << "\"explanationCount\":" << summary.explanation_count << ","
        << "\"approvalBlockerCount\":" << summary.approval_blocker_count << ","
        << "\"readinessReasonCount\":" << summary.readiness_reason_count << ","
        << "\"outcomeHintCount\":" << summary.outcome_hint_count << ","
        << "\"defaultOffCount\":" << summary.default_off_count << ","
        << "\"providerOptInRequiredCount\":"
        << summary.provider_opt_in_required_count << ","
        << "\"runtimeOptInRequiredCount\":"
        << summary.runtime_opt_in_required_count << ","
        << "\"releaseSafeCount\":" << summary.release_safe_count << ","
        << "\"evidenceRefCount\":" << summary.evidence_ref_count << ","
        << "\"derivationSources\":";
    AppendJsonStringArray(out, summary.derivation_sources);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24417 function
void AppendV380DefaultOffActionExplanationItemJson(
    std::ostringstream& out,
    const OpsV380DefaultOffActionExplanationItem& item) {
    out << "{"
        << "\"defaultOffActionExplanationId\":\""
        << JsonEscape(item.default_off_action_explanation_id) << "\","
        << "\"explanationKind\":\"" << JsonEscape(item.explanation_kind) << "\","
        << "\"approvalBlockerSummary\":\""
        << JsonEscape(item.approval_blocker_summary) << "\","
        << "\"readinessReasonSummary\":\""
        << JsonEscape(item.readiness_reason_summary) << "\","
        << "\"outcomeHint\":\"" << JsonEscape(item.outcome_hint) << "\","
        << "\"operatorReviewHint\":\"" << JsonEscape(item.operator_review_hint) << "\","
        << "\"actionRequestRef\":\"" << JsonEscape(item.action_request_ref) << "\","
        << "\"approvalRef\":\"" << JsonEscape(item.approval_ref) << "\","
        << "\"readinessRef\":\"" << JsonEscape(item.readiness_ref) << "\","
        << "\"outcomeRef\":\"" << JsonEscape(item.outcome_ref) << "\","
        << "\"receiptBundleRef\":\"" << JsonEscape(item.receipt_bundle_ref) << "\","
        << "\"fieldConnectorRef\":\"" << JsonEscape(item.field_connector_ref) << "\","
        << "\"redactedExplanation\":\"" << JsonEscape(item.redacted_explanation) << "\","
        << "\"evidenceRefs\":";
    AppendJsonStringArray(out, item.evidence_refs);
    out << ",\"defaultEnabled\":" << JsonBool(item.default_enabled)
        << ",\"defaultOff\":" << JsonBool(item.default_off)
        << ",\"runtimeOptInRequired\":"
        << JsonBool(item.runtime_opt_in_required)
        << ",\"providerOptInRequired\":"
        << JsonBool(item.provider_opt_in_required)
        << ",\"releaseSafe\":" << JsonBool(item.release_safe)
        << ",\"readOnly\":" << JsonBool(item.read_only)
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24450 function
std::string OpsV390FieldEvidenceBridgeDecisionJson() {
    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v390-field-evidence-bridge-decision.v1\","
        << "\"targetStep\":\"v3.9.0 (17)\","
        << "\"featureId\":\"V390-CAND-009\","
        << "\"selectedMode\":\"approval-only-minimal-field-evidence-bridge\","
        << "\"route\":\"/ops/api/field-evidence/bridge-decision\","
        << "\"fieldConnectorEvidencePackageRoute\":\"/ops/api/actions/field-connector-evidence-package\","
        << "\"fieldEvidenceIntakeRoute\":\"/ops/api/live-operations/field-evidence-intake\","
        << "\"fieldEvidenceAttachmentRoute\":\"/ops/api/site-operations/field-evidence-attachment\","
        << "\"externalTurnWhepFieldGateCommand\":\"verify-external-turn-whep-field-gate\","
        << "\"fieldEvidenceBridgeDecisionSummary\":{"
        << "\"decisionStatus\":\"approval-only-minimal-field-evidence-bridge\","
        << "\"bridgeCandidateCount\":3,"
        << "\"approvedRunCount\":0,"
        << "\"notRunCount\":3,"
        << "\"minimalEvidenceOnly\":true,"
        << "\"approvalRequired\":true,"
        << "\"fieldPassClaimed\":false,"
        << "\"releasePassClaimed\":false,"
        << "\"decisionReason\":\"external endpoint, credential, and provider field runs require explicit operator approval; not-run or failed runs cannot become release PASS\""
        << "},\"fieldEvidenceBridgeDecisions\":["
        << "{\"bridgeKind\":\"onvif-device-field-smoke\","
        << "\"status\":\"not-run\","
        << "\"approvalState\":\"approval-required\","
        << "\"minimalEvidenceContract\":\"redacted endpoint class, credential reference presence, run id, status, timestamps, and failure reason only\","
        << "\"sourceRef\":\"/ops/api/source-registry/field-bridge-condition-gates\","
        << "\"writeBoundary\":\"fieldSmokeExecuted=false; endpointProbePerformed=false; credentialProbePerformed=false; sourceRegistryWritePerformed=false\"},"
        << "{\"bridgeKind\":\"external-whep-turn\","
        << "\"status\":\"not-run\","
        << "\"approvalState\":\"approval-required\","
        << "\"minimalEvidenceContract\":\"redacted WHEP/TURN condition id, operator approval ref, run status, and error class only\","
        << "\"sourceRef\":\"/ops/api/actions/field-connector-evidence-package\","
        << "\"writeBoundary\":\"externalWhepTurnContacted=false; turnCredentialUsed=false; rtspOrWebrtcMediaPathChanged=false\"},"
        << "{\"bridgeKind\":\"cloud-vlm-provider\","
        << "\"status\":\"not-run\","
        << "\"approvalState\":\"approval-required\","
        << "\"minimalEvidenceContract\":\"provider class, redaction result, approval ref, run status, and bounded summary only\","
        << "\"sourceRef\":\"/ops/api/live-operations/field-evidence-intake\","
        << "\"writeBoundary\":\"cloudProviderCalled=false; vlmProviderCalled=false; rawProviderMaterialIncluded=false\"}"
        << "],\"minimalEvidenceFields\":["
        << "\"runId\","
        << "\"conditionId\","
        << "\"approvalRef\","
        << "\"status\","
        << "\"startedAt\","
        << "\"finishedAt\","
        << "\"redactionStatus\","
        << "\"failureClass\""
        << "],\"excludedMaterial\":["
        << "\"raw endpoint\","
        << "\"credential material\","
        << "\"provider request\","
        << "\"provider response\","
        << "\"raw media\","
        << "\"source locator\""
        << "],\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"approvalRequired\":true,"
        << "\"minimalEvidenceOnly\":true,"
        << "\"fieldSmokeExecuted\":false,"
        << "\"endpointProbePerformed\":false,"
        << "\"credentialProbePerformed\":false,"
        << "\"onvifDeviceContacted\":false,"
        << "\"externalWhepTurnContacted\":false,"
        << "\"turnCredentialUsed\":false,"
        << "\"cloudProviderCalled\":false,"
        << "\"vlmProviderCalled\":false,"
        << "\"minimalEvidencePersistedByRoute\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"fieldPassClaimed\":false,"
        << "\"releasePassClaimed\":false,"
        << "\"rawEndpointIncluded\":false,"
        << "\"rawCredentialMaterialIncluded\":false,"
        << "\"rawProviderMaterialIncluded\":false,"
        << "\"viewerClientPayloadChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24542 function
std::string OpsV390ReidAssistDecisionJson(const WebRtcHttpRuntimeConfig& config) {
    const auto normalized_lower = [](std::string value) {
        value = Trim(std::move(value));
        std::transform(value.begin(), value.end(), value.begin(), [](unsigned char ch) {
            return static_cast<char>(std::tolower(ch));
        });
        return value;
    };
    analysis::AppearanceExtractorOptions appearance_options;
    appearance_options.enabled = config.analysis_appearance_enabled;
    appearance_options.extractor_name = normalized_lower(config.analysis_appearance_extractor);
    appearance_options.model_path = config.analysis_appearance_model_path;
    appearance_options.model_sha256 = normalized_lower(config.analysis_appearance_model_sha256);
    appearance_options.model_provenance = Trim(config.analysis_appearance_model_provenance);
    appearance_options.input_width = std::max(1, config.analysis_appearance_input_width);
    appearance_options.input_height = std::max(1, config.analysis_appearance_input_height);
    appearance_options.max_embedding_dim =
        std::max<std::size_t>(1, config.analysis_appearance_max_embedding_dim);
    appearance_options.log_enabled = config.analysis_appearance_log_enabled;
    appearance_options.async_enabled = config.analysis_appearance_async_enabled;
    appearance_options.max_queue_size = std::max<std::size_t>(1, config.analysis_appearance_max_queue);
    appearance_options.global_max_queue_size =
        std::max<std::size_t>(1, config.analysis_appearance_global_max_queue);
    appearance_options.per_stream_rate_limit_ms =
        std::max(0, config.analysis_appearance_per_stream_rate_limit_ms);
    appearance_options.max_job_age_ms = std::max(0, config.analysis_appearance_max_job_age_ms);
    const auto readiness = analysis::InspectAppearanceModelReadiness(appearance_options);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v390-reid-assist-decision.v1\","
        << "\"targetStep\":\"v3.9.0 (18)\","
        << "\"featureId\":\"V390-CAND-010\","
        << "\"selectedMode\":\"explicit-opt-in-provenance-gated-assist\","
        << "\"route\":\"/ops/api/analysis/reid-assist-decision\","
        << "\"analysisStateCommand\":\"verify-analysis-state\","
        << "\"reidAdvancedTrackingCommand\":\"verify-reid-advanced-tracking\","
        << "\"reidAssistDecisionSummary\":{"
        << "\"decisionStatus\":\"explicit-opt-in-provenance-gated-assist\","
        << "\"defaultEnabled\":false,"
        << "\"explicitOptInRequired\":true,"
        << "\"associationAssistOnly\":true,"
        << "\"trackerNoneForcesReidOff\":true,"
        << "\"modelBackedPreflightReady\":"
        << JsonBool(readiness.model_backed_preflight_ready) << ","
        << "\"modelBackedExecutionReady\":false,"
        << "\"modelSessionLoadValidated\":false,"
        << "\"noOpFallbackVisible\":"
        << JsonBool(!readiness.model_backed_preflight_ready) << ","
        << "\"decisionReason\":\"Re-ID assist remains an opt-in association helper; the server-owned preflight checks the configured regular model file, SHA-256 match, trimmed provenance, OpenSSL runtime, and ONNX Runtime before the extractor performs its separate session-load validation\""
        << "},\"reidAssistRuntimeGate\":{"
        << "\"readinessAuthority\":\"analysis::InspectAppearanceModelReadiness\","
        << "\"appearanceEnabled\":" << JsonBool(readiness.appearance_enabled) << ","
        << "\"configuredExtractor\":\"" << JsonEscape(config.analysis_appearance_extractor) << "\","
        << "\"onnxReidExtractorSelected\":"
        << JsonBool(readiness.onnx_reid_extractor_selected) << ","
        << "\"modelPathConfigured\":" << JsonBool(readiness.model_path_configured) << ","
        << "\"modelFileExists\":" << JsonBool(readiness.model_file_exists) << ","
        << "\"modelFileRegular\":" << JsonBool(readiness.model_file_regular) << ","
        << "\"modelChecksumConfigured\":" << JsonBool(readiness.checksum_configured) << ","
        << "\"modelChecksumFormatValid\":"
        << JsonBool(readiness.checksum_format_valid) << ","
        << "\"openSslRuntimeAvailable\":"
        << JsonBool(readiness.openssl_runtime_available) << ","
        << "\"modelChecksumReadable\":" << JsonBool(readiness.checksum_readable) << ","
        << "\"modelChecksumMatches\":" << JsonBool(readiness.checksum_matches) << ","
        << "\"modelProvenanceConfigured\":"
        << JsonBool(readiness.provenance_configured) << ","
        << "\"provenanceValidationScope\":\"trimmed-non-empty-operator-assertion\","
        << "\"onnxRuntimeAvailable\":" << JsonBool(readiness.onnxruntime_available) << ","
        << "\"modelBackedPreflightReady\":"
        << JsonBool(readiness.model_backed_preflight_ready) << ","
        << "\"modelSessionLoadValidated\":false,"
        << "\"modelBackedExecutionReady\":false,"
        << "\"readinessReason\":\"" << JsonEscape(readiness.fallback_reason) << "\","
        << "\"fallbackMode\":\""
        << (readiness.model_backed_preflight_ready ? "preflight-ready-session-not-validated"
                                                   : "no-op-visible")
        << "\""
        << "},\"policyDecisions\":["
        << "{\"policy\":\"tracker-with-reid-assist\","
        << "\"decision\":\"allowed-when-explicitly-selected\","
        << "\"runtimeMeaning\":\"selected tracker association assist only\","
        << "\"externalMetadataBoundary\":\"no embedding, crop, model path, checksum, or identity material is serialized\"},"
        << "{\"policy\":\"tracker-none-with-reid-assist\","
        << "\"decision\":\"forced-off\","
        << "\"runtimeMeaning\":\"tracker=none disables Re-ID assist\","
        << "\"externalMetadataBoundary\":\"no assist opt-in without selected tracker\"},"
        << "{\"policy\":\"model-backed-assist\","
        << "\"decision\":\"provenance-gated\","
        << "\"runtimeMeaning\":\"requires server-verified regular model file, SHA-256 match, trimmed provenance, OpenSSL and ONNX Runtime availability, enabled appearance config, and explicit operator opt-in; extractor session load remains the final gate\","
        << "\"externalMetadataBoundary\":\"model-backed execution is distinguished from UI selection and field smoke evidence\"}"
        << "],\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"explicitOptInRequired\":true,"
        << "\"modelBackedExecutionPerformed\":false,"
        << "\"modelSessionLoadPerformed\":false,"
        << "\"appearanceExtractorCreatedByRoute\":false,"
        << "\"runtimeReidCallPerformed\":false,"
        << "\"embeddingSerialized\":false,"
        << "\"cropSerialized\":false,"
        << "\"modelPathExposed\":false,"
        << "\"modelChecksumExposed\":false,"
        << "\"modelProvenanceExposed\":false,"
        << "\"identitySearchEnabled\":false,"
        << "\"faceRecognitionEnabled\":false,"
        << "\"watchlistMatchingEnabled\":false,"
        << "\"clientViewerExposureAdded\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24637 function
std::string OpsV380DefaultOffActionExplanationJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v380-default-off-action-explanation.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans = BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto dryRunResults = BuildV360CommandPlanDryRunResults(commandPlanCandidates);
    const auto impactDiffs =
        BuildV360SourceRuleImpactDiffs(context, commandPlanCandidates, stagedChangePlans);
    const auto readinessItemsV360 =
        BuildV360SafeApplyReadinessItems(dryRunResults, impactDiffs);
    const auto v360InputPackItems =
        BuildV360SimulationInputPackItems(context, commandPlanCandidates, stagedChangePlans);
    const auto inputSummary = BuildV360SimulationInputPackSummary(v360InputPackItems);
    const auto simulationRunContract = BuildV360SimulationRunContract();
    const auto simulationResultEnvelope = BuildV360SimulationResultEnvelope(inputSummary);
    const auto simulationRunLedgerEntries =
        BuildV360SimulationRunLedgerEntries(context,
                                            v360InputPackItems,
                                            simulationRunContract,
                                            simulationResultEnvelope,
                                            dryRunResults,
                                            impactDiffs,
                                            readinessItemsV360);
    const auto projection =
        BuildV370SiteAwareSourceRegistryProjectionItems(context.sources, context.views);
    const auto rollups =
        BuildV370SiteHealthRollupItems(context.sources, context.views, source_health_snapshot);
    const auto impactGraphNodes = BuildV370SiteImpactGraphNodes(context, projection, rollups);
    const auto impactGraphEdges = BuildV370SiteImpactGraphEdges(projection);
    const auto siteSimulationInputPackItems =
        BuildV370SiteSimulationInputPackItems(context,
                                             projection,
                                             rollups,
                                             impactGraphNodes,
                                             impactGraphEdges,
                                             v360InputPackItems);
    const auto crossSiteReadinessItems =
        BuildV370CrossSiteSafeApplyReadinessItems(projection,
                                                 siteSimulationInputPackItems,
                                                 readinessItemsV360,
                                                 impactDiffs);
    const auto runbookTemplateContractItems =
        BuildV370RunbookTemplateContractItems(commandPlanCandidates,
                                             dryRunResults,
                                             impactDiffs,
                                             readinessItemsV360,
                                             projection,
                                             siteSimulationInputPackItems,
                                             crossSiteReadinessItems);
    const auto runbookInstanceLedgerEntries =
        BuildV370RunbookInstanceLedgerEntries(runbookTemplateContractItems,
                                             crossSiteReadinessItems,
                                             simulationRunLedgerEntries);
    const auto approvalTicketWorkflowItems =
        BuildV370ApprovalTicketWorkflowItems(runbookTemplateContractItems,
                                            runbookInstanceLedgerEntries,
                                            crossSiteReadinessItems);
    const auto fieldBridgeConditionGates = BuildV340FieldBridgeConditionGates();
    const auto fieldEvidenceIntakeRecords =
        BuildV350FieldEvidenceIntakeRecords(fieldBridgeConditionGates);
    const auto fieldEvidenceExecutionConditions =
        BuildV350FieldEvidenceExecutionConditions(fieldEvidenceIntakeRecords);
    const auto fieldAttachments =
        BuildV370FieldEvidenceAttachmentItems(projection,
                                             siteSimulationInputPackItems,
                                             runbookInstanceLedgerEntries,
                                             approvalTicketWorkflowItems,
                                             fieldEvidenceIntakeRecords,
                                             fieldEvidenceExecutionConditions);
    const auto approvalItems = BuildV380ApprovalDecisionGateItems();
    const auto readinessItems = BuildV380ActionReadinessPreflightItems();
    const auto sourceRecheckItems = BuildV380SourceRecheckActionPilotItems();
    const auto outcomeItems = BuildV380OutcomeObserverReconciliationItems();
    const auto receiptItems = BuildV380ActionReceiptBundleItems();
    const auto fieldConnectorItems =
        BuildV380FieldConnectorEvidencePackageItems(readinessItems,
                                                   sourceRecheckItems,
                                                   outcomeItems,
                                                   receiptItems,
                                                   fieldAttachments);
    const auto explanations =
        BuildV380DefaultOffActionExplanationItems(approvalItems,
                                                 readinessItems,
                                                 outcomeItems,
                                                 receiptItems,
                                                 fieldConnectorItems);
    const auto summary =
        BuildV380DefaultOffActionExplanationSummary(explanations);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v380-default-off-action-explanation.v1\","
        << "\"status\":\"default-off-action-explanation\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"route\":\"/ops/api/actions/default-off-explanation\","
        << "\"approvalDecisionGateRoute\":\"/ops/api/actions/approval-decision-gate\","
        << "\"readinessPreflightRoute\":\"/ops/api/actions/readiness-preflight\","
        << "\"outcomeReconciliationRoute\":\"/ops/api/actions/outcome-reconciliation\","
        << "\"receiptBundleRoute\":\"/ops/api/actions/receipt-bundle\","
        << "\"fieldConnectorEvidencePackageRoute\":\"/ops/api/actions/field-connector-evidence-package\","
        << "\"defaultOffActionExplanationSummary\":";
    AppendV380DefaultOffActionExplanationSummaryJson(out, summary);
    out << ",\"defaultOffActionExplanations\":[";
    for (std::size_t i = 0; i < explanations.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV380DefaultOffActionExplanationItemJson(out, explanations[i]);
    }
    out << "],\"explanationPolicy\":{"
        << "\"explanationHintOnly\":true,"
        << "\"defaultOff\":true,"
        << "\"providerOptInRequired\":true,"
        << "\"runtimeOptInRequired\":true,"
        << "\"releaseSafe\":true,"
        << "\"rawMaterial\":\"redacted\""
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"defaultOff\":true,"
        << "\"explanationHintOnly\":true,"
        << "\"runtimeOptInRequired\":true,"
        << "\"providerOptInRequired\":true,"
        << "\"defaultEnabled\":false,"
        << "\"vlmProviderCallPerformed\":false,"
        << "\"vlmRuntimeCallPerformed\":false,"
        << "\"rawVlmPromptIncluded\":false,"
        << "\"rawProviderResponseIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"rawEndpointIncluded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"rawJsonIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"actionExecutionPerformed\":false,"
        << "\"sourceRecheckExecuted\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"noticeQueueWritePerformed\":false,"
        << "\"ruleApplyPerformed\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"operatorReviewWritePerformed\":false,"
        << "\"viewerClientPayloadChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24829 function
std::string V370ClientNoticeStatusFor(
    const OpsV370SiteHealthRollupItem* rollup,
    int approval_count,
    int field_needed_count) {
    if (field_needed_count > 0 || (rollup != nullptr && rollup->rollup_state == "field-needed")) {
        return "field-needed";
    }
    if (approval_count > 0) {
        return "maintenance";
    }
    if (rollup == nullptr) {
        return "degraded";
    }
    if (rollup->rollup_state == "healthy") {
        return "available";
    }
    if (rollup->rollup_state == "recovering") {
        return "recovering";
    }
    return "degraded";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24851 function
std::string V370ClientNoticeTitleFor(const std::string& status,
                                     const std::string& site_id,
                                     const std::string& view_group) {
    if (status == "available") {
        return "Available preview for " + site_id + " / " + view_group;
    }
    if (status == "recovering") {
        return "Recovering preview for " + site_id + " / " + view_group;
    }
    if (status == "maintenance") {
        return "Maintenance preview for " + site_id + " / " + view_group;
    }
    if (status == "field-needed") {
        return "Field evidence preview for " + site_id + " / " + view_group;
    }
    return "Degraded preview for " + site_id + " / " + view_group;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24869 function
std::string V370ClientNoticeTimelineHintFor(const std::string& status) {
    if (status == "available") {
        return "available";
    }
    if (status == "recovering") {
        return "recovering signal";
    }
    if (status == "maintenance") {
        return "maintenance window pending approval";
    }
    if (status == "field-needed") {
        return "field evidence required before delivery";
    }
    return "degraded";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24885 function
std::vector<std::string> V370ClientNoticeAffectedClientRefs(
    const OpsV370SiteAwareSourceRegistryProjectionItem& projected,
    const std::string& view_group) {
    std::vector<std::string> refs;
    AddV370UniqueString(&refs, "viewGroup:" + view_group);
    for (const auto& view_id : projected.view_ids) {
        AddV370UniqueString(&refs, "PublishedView:" + view_id);
    }
    return refs;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24896 function
int V370ApprovalTicketCountForScope(
    const std::vector<OpsV370ApprovalTicketWorkflowItem>& approvals,
    const std::string& site_id,
    const std::string& source_group) {
    return static_cast<int>(std::count_if(approvals.begin(), approvals.end(), [&](const auto& item) {
        return item.site_id == site_id && item.source_group == source_group;
    }));
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24905 function
int V370ApprovalFieldNeededCountForScope(
    const std::vector<OpsV370ApprovalTicketWorkflowItem>& approvals,
    const std::string& site_id,
    const std::string& source_group) {
    return static_cast<int>(std::count_if(approvals.begin(), approvals.end(), [&](const auto& item) {
        return item.site_id == site_id && item.source_group == source_group &&
               item.status == "field-needed";
    }));
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24915 function
std::vector<OpsV370ClientNoticeBySiteViewGroupItem>
BuildV370ClientNoticeBySiteViewGroupItems(
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection,
    const std::vector<OpsV370SiteHealthRollupItem>& rollups,
    const std::vector<OpsV370SiteImpactGraphNode>& impactGraphNodes,
    const std::vector<OpsV370RunbookInstanceLedgerEntry>& runbookInstanceLedgerEntries,
    const std::vector<OpsV370ApprovalTicketWorkflowItem>& approvalTicketWorkflowItems) {
    std::vector<OpsV370ClientNoticeBySiteViewGroupItem> items;
    for (const auto& projected : projection) {
        const auto* rollup = V370RollupForProjection(rollups, projected);
        const int approval_count = V370ApprovalTicketCountForScope(
            approvalTicketWorkflowItems, projected.site_id, projected.source_group);
        const int field_needed_count = V370ApprovalFieldNeededCountForScope(
            approvalTicketWorkflowItems, projected.site_id, projected.source_group);
        std::vector<std::string> view_groups = projected.view_groups.empty()
            ? std::vector<std::string>{"default-view-group"}
            : projected.view_groups;
        for (const auto& view_group : view_groups) {
            OpsV370ClientNoticeBySiteViewGroupItem item;
            item.notice_preview_id =
                "client-notice-by-site-view-group:" + projected.site_id + ":" +
                projected.source_group + ":" + view_group;
            item.site_id = projected.site_id;
            item.source_group = projected.source_group;
            item.view_group = view_group;
            item.notice_status =
                V370ClientNoticeStatusFor(rollup, approval_count, field_needed_count);
            item.viewer_safe_title =
                V370ClientNoticeTitleFor(item.notice_status, item.site_id, item.view_group);
            item.viewer_safe_body =
                "viewerSafeClientNoticeBySiteViewGroup: " + item.notice_status +
                " notice preview for site/view group without client notice delivery";
            item.timeline_hint = V370ClientNoticeTimelineHintFor(item.notice_status);
            item.affected_view_ids = projected.view_ids;
            item.affected_client_refs = V370ClientNoticeAffectedClientRefs(projected, view_group);
            item.evidence_refs = {
                "/ops/api/site-operations/source-registry-projection",
                "/ops/api/site-operations/health-rollup",
                "/ops/api/site-operations/impact-graph",
                "/ops/api/site-operations/runbook-instance-ledger",
                "/ops/api/site-operations/approval-ticket-workflow",
                "site:" + item.site_id,
                "sourceGroup:" + item.source_group,
                "viewGroup:" + item.view_group,
            };
            for (const auto& node : impactGraphNodes) {
                if (node.site_id == item.site_id && node.source_group == item.source_group &&
                    node.node_type == "clientImpact") {
                    item.evidence_refs.push_back(node.node_id);
                    break;
                }
            }
            for (const auto& ledger : runbookInstanceLedgerEntries) {
                if (ledger.site_id == item.site_id && ledger.source_group == item.source_group) {
                    item.evidence_refs.push_back(ledger.runbook_id);
                    break;
                }
            }
            items.push_back(std::move(item));
        }
    }
    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24979 function
OpsV370ClientNoticeBySiteViewGroupSummary
BuildV370ClientNoticeBySiteViewGroupSummary(
    const std::vector<OpsV370ClientNoticeBySiteViewGroupItem>& items) {
    OpsV370ClientNoticeBySiteViewGroupSummary summary;
    summary.derivation_sources = {
        "BuildV370SiteAwareSourceRegistryProjectionItems",
        "BuildV370SiteHealthRollupItems",
        "BuildV370SiteImpactGraphNodes",
        "BuildV370RunbookTemplateContractItems",
        "BuildV370RunbookInstanceLedgerEntries",
        "BuildV370ApprovalTicketWorkflowItems",
    };
    std::vector<std::string> view_groups;
    summary.item_count = static_cast<int>(items.size());
    summary.delivery_queue_count = static_cast<int>(items.size());
    for (const auto& item : items) {
        AddV370UniqueString(&view_groups, item.site_id + ":" + item.view_group);
        summary.affected_view_count += static_cast<int>(item.affected_view_ids.size());
        if (item.notice_status == "maintenance") {
            ++summary.maintenance_count;
        } else if (item.notice_status == "recovering") {
            ++summary.recovering_count;
        } else if (item.notice_status == "available") {
            ++summary.available_count;
        } else if (item.notice_status == "field-needed") {
            ++summary.field_needed_count;
        } else {
            ++summary.degraded_count;
        }
    }
    summary.view_group_count = static_cast<int>(view_groups.size());
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25013 function
void AppendV370ClientNoticeBySiteViewGroupSummaryJson(
    std::ostringstream& out,
    const OpsV370ClientNoticeBySiteViewGroupSummary& summary) {
    out << "{"
        << "\"itemCount\":" << summary.item_count << ","
        << "\"viewGroupCount\":" << summary.view_group_count << ","
        << "\"affectedViewCount\":" << summary.affected_view_count << ","
        << "\"deliveryQueueCount\":" << summary.delivery_queue_count << ","
        << "\"maintenanceCount\":" << summary.maintenance_count << ","
        << "\"degradedCount\":" << summary.degraded_count << ","
        << "\"recoveringCount\":" << summary.recovering_count << ","
        << "\"availableCount\":" << summary.available_count << ","
        << "\"fieldNeededCount\":" << summary.field_needed_count << ","
        << "\"derivationSources\":";
    AppendJsonStringArray(out, summary.derivation_sources);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25031 function
void AppendV370ClientNoticeBySiteViewGroupItemJson(
    std::ostringstream& out,
    const OpsV370ClientNoticeBySiteViewGroupItem& item) {
    out << "{"
        << "\"noticePreviewId\":\"" << JsonEscape(item.notice_preview_id) << "\","
        << "\"siteId\":\"" << JsonEscape(item.site_id) << "\","
        << "\"sourceGroup\":\"" << JsonEscape(item.source_group) << "\","
        << "\"viewGroup\":\"" << JsonEscape(item.view_group) << "\","
        << "\"noticeStatus\":\"" << JsonEscape(item.notice_status) << "\","
        << "\"viewerSafeTitle\":\"" << JsonEscape(item.viewer_safe_title) << "\","
        << "\"viewerSafeBody\":\"" << JsonEscape(item.viewer_safe_body) << "\","
        << "\"timelineHint\":\"" << JsonEscape(item.timeline_hint) << "\","
        << "\"deliveryState\":\"" << JsonEscape(item.delivery_state) << "\","
        << "\"deliveryQueueState\":\"" << JsonEscape(item.delivery_queue_state) << "\","
        << "\"affectedViewIds\":";
    AppendJsonStringArray(out, item.affected_view_ids);
    out << ",\"affectedClientRefs\":";
    AppendJsonStringArray(out, item.affected_client_refs);
    out << ",\"evidenceRefs\":";
    AppendJsonStringArray(out, item.evidence_refs);
    out << ",\"viewerSafe\":" << JsonBool(item.viewer_safe)
        << ",\"viewGroupScoped\":" << JsonBool(item.view_group_scoped)
        << ",\"readOnly\":" << JsonBool(item.read_only)
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25057 function
std::string OpsV370ClientNoticeBySiteViewGroupJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v370-client-notice-by-site-view-group.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans = BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto dryRunResults = BuildV360CommandPlanDryRunResults(commandPlanCandidates);
    const auto impactDiffs =
        BuildV360SourceRuleImpactDiffs(context, commandPlanCandidates, stagedChangePlans);
    const auto readinessItems = BuildV360SafeApplyReadinessItems(dryRunResults, impactDiffs);
    const auto v360InputPackItems =
        BuildV360SimulationInputPackItems(context, commandPlanCandidates, stagedChangePlans);
    const auto inputSummary = BuildV360SimulationInputPackSummary(v360InputPackItems);
    const auto simulationRunContract = BuildV360SimulationRunContract();
    const auto simulationResultEnvelope = BuildV360SimulationResultEnvelope(inputSummary);
    const auto simulationRunLedgerEntries =
        BuildV360SimulationRunLedgerEntries(context,
                                            v360InputPackItems,
                                            simulationRunContract,
                                            simulationResultEnvelope,
                                            dryRunResults,
                                            impactDiffs,
                                            readinessItems);
    const auto projection =
        BuildV370SiteAwareSourceRegistryProjectionItems(context.sources, context.views);
    const auto rollups =
        BuildV370SiteHealthRollupItems(context.sources, context.views, source_health_snapshot);
    const auto impactGraphNodes = BuildV370SiteImpactGraphNodes(context, projection, rollups);
    const auto impactGraphEdges = BuildV370SiteImpactGraphEdges(projection);
    const auto siteSimulationInputPackItems =
        BuildV370SiteSimulationInputPackItems(context,
                                             projection,
                                             rollups,
                                             impactGraphNodes,
                                             impactGraphEdges,
                                             v360InputPackItems);
    const auto crossSiteReadinessItems =
        BuildV370CrossSiteSafeApplyReadinessItems(projection,
                                                 siteSimulationInputPackItems,
                                                 readinessItems,
                                                 impactDiffs);
    const auto runbookTemplateContractItems =
        BuildV370RunbookTemplateContractItems(commandPlanCandidates,
                                             dryRunResults,
                                             impactDiffs,
                                             readinessItems,
                                             projection,
                                             siteSimulationInputPackItems,
                                             crossSiteReadinessItems);
    const auto runbookInstanceLedgerEntries =
        BuildV370RunbookInstanceLedgerEntries(runbookTemplateContractItems,
                                             crossSiteReadinessItems,
                                             simulationRunLedgerEntries);
    const auto approvalTicketWorkflowItems =
        BuildV370ApprovalTicketWorkflowItems(runbookTemplateContractItems,
                                            runbookInstanceLedgerEntries,
                                            crossSiteReadinessItems);
    const auto noticeItems = BuildV370ClientNoticeBySiteViewGroupItems(
        projection,
        rollups,
        impactGraphNodes,
        runbookInstanceLedgerEntries,
        approvalTicketWorkflowItems);
    const auto summary = BuildV370ClientNoticeBySiteViewGroupSummary(noticeItems);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v370-client-notice-by-site-view-group.v1\","
        << "\"status\":\"client-notice-by-site-view-group\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"siteRegistryProjectionRoute\":\"/ops/api/site-operations/source-registry-projection\","
        << "\"siteHealthRollupRoute\":\"/ops/api/site-operations/health-rollup\","
        << "\"siteImpactGraphRoute\":\"/ops/api/site-operations/impact-graph\","
        << "\"runbookInstanceLedgerRoute\":\"/ops/api/site-operations/runbook-instance-ledger\","
        << "\"approvalTicketWorkflowRoute\":\"/ops/api/site-operations/approval-ticket-workflow\","
        << "\"viewerSafeClientNoticeBySiteViewGroup\":true,"
        << "\"deliveryQueueState\":\"delivery-queue-preview\","
        << "\"noticeStatusCatalog\":[\"maintenance\",\"degraded\",\"recovering\",\"available\",\"field-needed\"],"
        << "\"clientNoticeBySiteViewGroupSummary\":";
    AppendV370ClientNoticeBySiteViewGroupSummaryJson(out, summary);
    out << ",\"clientNoticeBySiteViewGroupItems\":[";
    for (std::size_t i = 0; i < noticeItems.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV370ClientNoticeBySiteViewGroupItemJson(out, noticeItems[i]);
    }
    out << "],\"deliveryQueuePolicy\":{"
        << "\"deliveryState\":\"preview-only\","
        << "\"deliveryQueueState\":\"delivery-queue-preview\","
        << "\"siteViewGroupScoped\":true,"
        << "\"viewerSafeFields\":[\"siteId\",\"sourceGroup\",\"viewGroup\",\"noticeStatus\",\"viewerSafeTitle\",\"viewerSafeBody\",\"timelineHint\"]"
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"viewerSafe\":true,"
        << "\"previewOnly\":true,"
        << "\"siteViewGroupScoped\":true,"
        << "\"clientNoticeSent\":false,"
        << "\"clientNoticePersisted\":false,"
        << "\"viewerClientPayloadChanged\":false,"
        << "\"sourceUrlIncluded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"rawJsonIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"operatorMaterialIncluded\":false,"
        << "\"commandPlanDetailsIncluded\":false,"
        << "\"incidentDetailsIncluded\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"approvalTicketWritePerformed\":false,"
        << "\"runbookInstancePersisted\":false,"
        << "\"operatorNoteWritePerformed\":false,"
        << "\"fieldSmokeExecuted\":false,"
        << "\"commandPlanExecuted\":false,"
        << "\"automaticApplyPerformed\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25227 function
const OpsV370ApprovalTicketWorkflowItem* V370ApprovalTicketForPilot(
    const std::vector<OpsV370ApprovalTicketWorkflowItem>& approvalTicketWorkflowItems,
    const std::string& runbook_id) {
    const auto it =
        std::find_if(approvalTicketWorkflowItems.begin(),
                     approvalTicketWorkflowItems.end(),
                     [&](const auto& item) { return item.runbook_id == runbook_id; });
    if (it != approvalTicketWorkflowItems.end()) {
        return &*it;
    }
    return approvalTicketWorkflowItems.empty() ? nullptr : &approvalTicketWorkflowItems.front();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25240 function
const OpsV370ClientNoticeBySiteViewGroupItem* V370NoticeQueuePilotForScope(
    const std::vector<OpsV370ClientNoticeBySiteViewGroupItem>& noticeItems,
    const std::string& site_id,
    const std::string& source_group) {
    const auto it =
        std::find_if(noticeItems.begin(),
                     noticeItems.end(),
                     [&](const auto& item) {
                         return item.site_id == site_id && item.source_group == source_group;
                     });
    return it == noticeItems.end() ? nullptr : &*it;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25253 function
const OpsV370FieldEvidenceAttachmentItem* V370FieldAttachmentForScope(
    const std::vector<OpsV370FieldEvidenceAttachmentItem>& attachments,
    const std::string& site_id,
    const std::string& source_group) {
    const auto it =
        std::find_if(attachments.begin(),
                     attachments.end(),
                     [&](const auto& item) {
                         return item.site_id == site_id && item.source_group == source_group;
                     });
    return it == attachments.end() ? nullptr : &*it;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25266 function
std::string V370LimitedSafePilotGateState(
    const OpsV370ApprovalTicketWorkflowItem* approval,
    const OpsV370RunbookInstanceLedgerEntry& runbook) {
    if (approval != nullptr && approval->status == "approval" && runbook.status == "ready") {
        return "approval-gated-ready";
    }
    if (approval != nullptr && approval->status == "approval") {
        return "approval-gated-review";
    }
    if (approval != nullptr && approval->status == "field-needed") {
        return "field-needed";
    }
    return "hold";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25281 function
std::vector<OpsV370LimitedSafeExecutionPilotAction>
BuildV370LimitedSafeExecutionPilotActions(
    const std::vector<OpsV370RunbookInstanceLedgerEntry>& runbookInstanceLedgerEntries,
    const std::vector<OpsV370ApprovalTicketWorkflowItem>& approvalTicketWorkflowItems,
    const std::vector<OpsV370FieldEvidenceAttachmentItem>& fieldEvidenceAttachments,
    const std::vector<OpsV370ClientNoticeBySiteViewGroupItem>& noticeItems) {
    std::vector<OpsV370LimitedSafeExecutionPilotAction> actions;
    int index = 0;
    for (const auto& runbook : runbookInstanceLedgerEntries) {
        const auto* approval =
            V370ApprovalTicketForPilot(approvalTicketWorkflowItems, runbook.runbook_id);
        const auto* attachment =
            V370FieldAttachmentForScope(fieldEvidenceAttachments, runbook.site_id, runbook.source_group);
        const auto* notice =
            V370NoticeQueuePilotForScope(noticeItems, runbook.site_id, runbook.source_group);

        OpsV370LimitedSafeExecutionPilotAction source_action;
        source_action.pilot_action_id =
            "limitedSafeExecutionPilot:" + runbook.site_id + ":" + runbook.source_group +
            ":source-recheck:" + std::to_string(index + 1);
        source_action.site_id = runbook.site_id;
        source_action.source_group = runbook.source_group;
        source_action.source_id = attachment == nullptr ? "pending-source" : attachment->source_id;
        source_action.action_kind = "source-recheck-pilot";
        source_action.action_label = "Approval-gated source recheck pilot";
        source_action.approval_ticket_id =
            approval == nullptr ? "approval-ticket:pending" : approval->approval_ticket_id;
        source_action.runbook_id = runbook.runbook_id;
        source_action.source_recheck_ref =
            "sourceRecheckRef:" + source_action.site_id + ":" + source_action.source_group +
            ":" + source_action.source_id;
        source_action.notice_queue_ref = "noticeQueueRef:not-selected";
        source_action.approval_gate_state =
            V370LimitedSafePilotGateState(approval, runbook);
        source_action.pilot_execution_status =
            source_action.approval_gate_state == "approval-gated-ready"
                ? "approval-gated-ready"
                : "approval-gated-not-run";
        source_action.execution_request_preview =
            "executionRequestPreview: source recheck only after approval; no request is executed by this read model";
        source_action.idempotency_key =
            "idempotencyKey:" + source_action.pilot_action_id + ":preview";
        source_action.expected_outcome_ref =
            "expectedOutcomeRef: source-health-recheck-result:not-run";
        source_action.blocker_refs = runbook.status_history;
        source_action.evidence_refs = runbook.evidence_refs;
        source_action.evidence_refs.push_back("/ops/api/site-operations/runbook-instance-ledger");
        source_action.evidence_refs.push_back("/ops/api/site-operations/approval-ticket-workflow");
        source_action.evidence_refs.push_back("/ops/api/site-operations/field-evidence-attachment");
        if (attachment != nullptr) {
            source_action.evidence_refs.push_back(attachment->field_evidence_attachment_id);
        }
        actions.push_back(std::move(source_action));

        if (notice != nullptr) {
            OpsV370LimitedSafeExecutionPilotAction notice_action;
            notice_action.pilot_action_id =
                "limitedSafeExecutionPilot:" + notice->site_id + ":" + notice->source_group +
                ":notice-queue:" + std::to_string(index + 1);
            notice_action.site_id = notice->site_id;
            notice_action.source_group = notice->source_group;
            notice_action.source_id = attachment == nullptr ? "pending-source" : attachment->source_id;
            notice_action.action_kind = "notice-queue-pilot";
            notice_action.action_label = "Approval-gated notice queue pilot";
            notice_action.approval_ticket_id =
                approval == nullptr ? "approval-ticket:pending" : approval->approval_ticket_id;
            notice_action.runbook_id = runbook.runbook_id;
            notice_action.source_recheck_ref = "sourceRecheckRef:not-selected";
            notice_action.notice_queue_ref =
                "noticeQueueRef:" + notice->notice_preview_id + ":preview-only";
            notice_action.approval_gate_state =
                V370LimitedSafePilotGateState(approval, runbook);
            notice_action.pilot_execution_status = "approval-gated-not-run";
            notice_action.execution_request_preview =
                "executionRequestPreview: notice queue preview only; no send or queue write is performed";
            notice_action.idempotency_key =
                "idempotencyKey:" + notice_action.pilot_action_id + ":preview";
            notice_action.expected_outcome_ref =
                "expectedOutcomeRef: notice-queue-delivery:not-run";
            notice_action.blocker_refs = {notice->delivery_queue_state, notice->delivery_state};
            notice_action.evidence_refs = notice->evidence_refs;
            notice_action.evidence_refs.push_back("/ops/api/site-operations/client-notice-by-site-view-group");
            notice_action.evidence_refs.push_back("/ops/api/site-operations/approval-ticket-workflow");
            actions.push_back(std::move(notice_action));
        }

        ++index;
        if (actions.size() >= 24U) {
            break;
        }
    }

    if (actions.empty()) {
        OpsV370LimitedSafeExecutionPilotAction action;
        action.pilot_action_id = "limitedSafeExecutionPilot:pending";
        action.site_id = "unassigned-site";
        action.source_group = "unassigned-source-group";
        action.source_id = "pending-source";
        action.action_kind = "source-recheck-pilot";
        action.action_label = "Approval-gated source recheck pilot";
        action.approval_ticket_id = "approval-ticket:pending";
        action.runbook_id = "runbook:pending";
        action.source_recheck_ref = "sourceRecheckRef:pending";
        action.notice_queue_ref = "noticeQueueRef:not-selected";
        action.execution_request_preview =
            "executionRequestPreview: no eligible runbook candidate exists; not-run";
        action.idempotency_key = "idempotencyKey:pending:preview";
        action.expected_outcome_ref = "expectedOutcomeRef:pending:not-run";
        action.blocker_refs = {"runbook-ledger-empty"};
        action.evidence_refs = {
            "/ops/api/site-operations/runbook-instance-ledger",
            "/ops/api/site-operations/approval-ticket-workflow",
        };
        actions.push_back(std::move(action));
    }
    return actions;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25399 function
OpsV370LimitedSafeExecutionPilotSummary BuildV370LimitedSafeExecutionPilotSummary(
    const std::vector<OpsV370LimitedSafeExecutionPilotAction>& actions) {
    OpsV370LimitedSafeExecutionPilotSummary summary;
    summary.derivation_sources = {
        "BuildV370RunbookInstanceLedgerEntries",
        "BuildV370ApprovalTicketWorkflowItems",
        "BuildV370FieldEvidenceAttachmentItems",
        "BuildV370ClientNoticeBySiteViewGroupItems",
    };
    summary.action_count = static_cast<int>(actions.size());
    for (const auto& action : actions) {
        if (action.action_kind == "source-recheck-pilot") {
            ++summary.source_recheck_pilot_count;
        } else if (action.action_kind == "notice-queue-pilot") {
            ++summary.notice_queue_pilot_count;
        }
        if (action.approval_gated) {
            ++summary.approval_gated_count;
        }
        if (action.pilot_execution_status == "approval-gated-ready") {
            ++summary.ready_to_pilot_count;
        } else {
            ++summary.not_run_count;
        }
        if (action.approval_gate_state == "hold" ||
            action.approval_gate_state == "field-needed") {
            ++summary.blocked_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25431 function
void AppendV370LimitedSafeExecutionPilotSummaryJson(
    std::ostringstream& out,
    const OpsV370LimitedSafeExecutionPilotSummary& summary) {
    out << "{"
        << "\"actionCount\":" << summary.action_count << ","
        << "\"sourceRecheckPilotCount\":" << summary.source_recheck_pilot_count << ","
        << "\"noticeQueuePilotCount\":" << summary.notice_queue_pilot_count << ","
        << "\"approvalGatedCount\":" << summary.approval_gated_count << ","
        << "\"readyToPilotCount\":" << summary.ready_to_pilot_count << ","
        << "\"notRunCount\":" << summary.not_run_count << ","
        << "\"blockedCount\":" << summary.blocked_count << ","
        << "\"derivationSources\":";
    AppendJsonStringArray(out, summary.derivation_sources);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25447 function
void AppendV370LimitedSafeExecutionPilotActionJson(
    std::ostringstream& out,
    const OpsV370LimitedSafeExecutionPilotAction& action) {
    out << "{"
        << "\"pilotActionId\":\"" << JsonEscape(action.pilot_action_id) << "\","
        << "\"siteId\":\"" << JsonEscape(action.site_id) << "\","
        << "\"sourceGroup\":\"" << JsonEscape(action.source_group) << "\","
        << "\"sourceId\":\"" << JsonEscape(action.source_id) << "\","
        << "\"actionKind\":\"" << JsonEscape(action.action_kind) << "\","
        << "\"actionLabel\":\"" << JsonEscape(action.action_label) << "\","
        << "\"approvalTicketId\":\"" << JsonEscape(action.approval_ticket_id) << "\","
        << "\"runbookId\":\"" << JsonEscape(action.runbook_id) << "\","
        << "\"sourceRecheckRef\":\"" << JsonEscape(action.source_recheck_ref) << "\","
        << "\"noticeQueueRef\":\"" << JsonEscape(action.notice_queue_ref) << "\","
        << "\"pilotExecutionStatus\":\"" << JsonEscape(action.pilot_execution_status) << "\","
        << "\"approvalGateState\":\"" << JsonEscape(action.approval_gate_state) << "\","
        << "\"executionRequestPreview\":\"" << JsonEscape(action.execution_request_preview) << "\","
        << "\"idempotencyKey\":\"" << JsonEscape(action.idempotency_key) << "\","
        << "\"expectedOutcomeRef\":\"" << JsonEscape(action.expected_outcome_ref) << "\","
        << "\"blockerRefs\":";
    AppendJsonStringArray(out, action.blocker_refs);
    out << ",\"evidenceRefs\":";
    AppendJsonStringArray(out, action.evidence_refs);
    out << ",\"lowestRisk\":" << JsonBool(action.lowest_risk)
        << ",\"approvalGated\":" << JsonBool(action.approval_gated)
        << ",\"readOnly\":" << JsonBool(action.read_only)
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25476 function
std::string OpsV370LimitedSafeExecutionPilotJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v370-limited-safe-execution-pilot.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans = BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto dryRunResults = BuildV360CommandPlanDryRunResults(commandPlanCandidates);
    const auto impactDiffs =
        BuildV360SourceRuleImpactDiffs(context, commandPlanCandidates, stagedChangePlans);
    const auto readinessItems = BuildV360SafeApplyReadinessItems(dryRunResults, impactDiffs);
    const auto v360InputPackItems =
        BuildV360SimulationInputPackItems(context, commandPlanCandidates, stagedChangePlans);
    const auto inputSummary = BuildV360SimulationInputPackSummary(v360InputPackItems);
    const auto simulationRunContract = BuildV360SimulationRunContract();
    const auto simulationResultEnvelope = BuildV360SimulationResultEnvelope(inputSummary);
    const auto simulationRunLedgerEntries =
        BuildV360SimulationRunLedgerEntries(context,
                                            v360InputPackItems,
                                            simulationRunContract,
                                            simulationResultEnvelope,
                                            dryRunResults,
                                            impactDiffs,
                                            readinessItems);
    const auto projection =
        BuildV370SiteAwareSourceRegistryProjectionItems(context.sources, context.views);
    const auto rollups =
        BuildV370SiteHealthRollupItems(context.sources, context.views, source_health_snapshot);
    const auto impactGraphNodes = BuildV370SiteImpactGraphNodes(context, projection, rollups);
    const auto impactGraphEdges = BuildV370SiteImpactGraphEdges(projection);
    const auto siteSimulationInputPackItems =
        BuildV370SiteSimulationInputPackItems(context,
                                             projection,
                                             rollups,
                                             impactGraphNodes,
                                             impactGraphEdges,
                                             v360InputPackItems);
    const auto crossSiteReadinessItems =
        BuildV370CrossSiteSafeApplyReadinessItems(projection,
                                                 siteSimulationInputPackItems,
                                                 readinessItems,
                                                 impactDiffs);
    const auto runbookTemplateContractItems =
        BuildV370RunbookTemplateContractItems(commandPlanCandidates,
                                             dryRunResults,
                                             impactDiffs,
                                             readinessItems,
                                             projection,
                                             siteSimulationInputPackItems,
                                             crossSiteReadinessItems);
    const auto runbookInstanceLedgerEntries =
        BuildV370RunbookInstanceLedgerEntries(runbookTemplateContractItems,
                                             crossSiteReadinessItems,
                                             simulationRunLedgerEntries);
    const auto approvalTicketWorkflowItems =
        BuildV370ApprovalTicketWorkflowItems(runbookTemplateContractItems,
                                            runbookInstanceLedgerEntries,
                                            crossSiteReadinessItems);
    const auto fieldBridgeConditionGates = BuildV340FieldBridgeConditionGates();
    const auto fieldEvidenceIntakeRecords =
        BuildV350FieldEvidenceIntakeRecords(fieldBridgeConditionGates);
    const auto fieldEvidenceExecutionConditions =
        BuildV350FieldEvidenceExecutionConditions(fieldEvidenceIntakeRecords);
    const auto fieldEvidenceAttachments =
        BuildV370FieldEvidenceAttachmentItems(projection,
                                             siteSimulationInputPackItems,
                                             runbookInstanceLedgerEntries,
                                             approvalTicketWorkflowItems,
                                             fieldEvidenceIntakeRecords,
                                             fieldEvidenceExecutionConditions);
    const auto noticeItems = BuildV370ClientNoticeBySiteViewGroupItems(
        projection,
        rollups,
        impactGraphNodes,
        runbookInstanceLedgerEntries,
        approvalTicketWorkflowItems);
    const auto actions =
        BuildV370LimitedSafeExecutionPilotActions(runbookInstanceLedgerEntries,
                                                 approvalTicketWorkflowItems,
                                                 fieldEvidenceAttachments,
                                                 noticeItems);
    const auto summary = BuildV370LimitedSafeExecutionPilotSummary(actions);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v370-limited-safe-execution-pilot.v1\","
        << "\"status\":\"limited-safe-execution-pilot\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"runbookInstanceLedgerRoute\":\"/ops/api/site-operations/runbook-instance-ledger\","
        << "\"approvalTicketWorkflowRoute\":\"/ops/api/site-operations/approval-ticket-workflow\","
        << "\"fieldEvidenceAttachmentRoute\":\"/ops/api/site-operations/field-evidence-attachment\","
        << "\"clientNoticeBySiteViewGroupRoute\":\"/ops/api/site-operations/client-notice-by-site-view-group\","
        << "\"lowestRiskOnly\":true,"
        << "\"approvalGateRequired\":true,"
        << "\"limitedSafeExecutionPilotSummary\":";
    AppendV370LimitedSafeExecutionPilotSummaryJson(out, summary);
    out << ",\"limitedSafeExecutionPilotActions\":[";
    for (std::size_t i = 0; i < actions.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV370LimitedSafeExecutionPilotActionJson(out, actions[i]);
    }
    out << "],\"executionPilotPolicy\":{"
        << "\"allowedActionKinds\":[\"source-recheck-pilot\",\"notice-queue-pilot\"],"
        << "\"approvalGateRequired\":true,"
        << "\"lowestRiskOnly\":true,"
        << "\"executionRequestPreview\":\"preview-only; no command is executed\","
        << "\"idempotencyKey\":\"required before any future execution endpoint\""
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"executionPilotOnly\":true,"
        << "\"lowestRiskOnly\":true,"
        << "\"approvalGateRequired\":true,"
        << "\"pilotExecutionPerformed\":false,"
        << "\"sourceRecheckExecuted\":false,"
        << "\"noticeQueueWritePerformed\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"runbookInstancePersisted\":false,"
        << "\"approvalTicketWritePerformed\":false,"
        << "\"approvalDecisionPersisted\":false,"
        << "\"operatorNoteWritePerformed\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"fieldSmokeExecuted\":false,"
        << "\"endpointProbePerformed\":false,"
        << "\"providerCallPerformed\":false,"
        << "\"viewerClientPayloadChanged\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"operatorMaterialIncluded\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25664 function
const OpsV360SourceRuleImpactDiff* V370ImpactDiffForOutcomeReconciliation(
    const std::vector<OpsV360SourceRuleImpactDiff>& impactDiffs,
    const OpsV370LimitedSafeExecutionPilotAction& action) {
    const auto action_kind_matches = [&](const OpsV360SourceRuleImpactDiff& diff) {
        return (action.action_kind == "source-recheck-pilot" &&
                (diff.candidate_type == "sourceRecheck" || diff.candidate_type == "recovery")) ||
               (action.action_kind == "notice-queue-pilot" &&
                diff.candidate_type == "clientNotice");
    };
    const auto exact_it =
        std::find_if(impactDiffs.begin(), impactDiffs.end(), [&](const auto& diff) {
            return diff.source_id == action.source_id && action_kind_matches(diff);
        });
    if (exact_it != impactDiffs.end()) {
        return &*exact_it;
    }
    const auto source_it =
        std::find_if(impactDiffs.begin(), impactDiffs.end(), [&](const auto& diff) {
            return diff.source_id == action.source_id;
        });
    if (source_it != impactDiffs.end()) {
        return &*source_it;
    }
    return impactDiffs.empty() ? nullptr : &impactDiffs.front();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25690 function
const OpsV370SiteSimulationInputPackItem* V370SimulationPackForOutcomeReconciliation(
    const std::vector<OpsV370SiteSimulationInputPackItem>& siteSimulationInputPackItems,
    const std::string& site_id,
    const std::string& source_group,
    const std::string& input_type) {
    const auto it =
        std::find_if(siteSimulationInputPackItems.begin(),
                     siteSimulationInputPackItems.end(),
                     [&](const auto& item) {
                         return item.site_id == site_id &&
                                item.source_group == source_group &&
                                item.input_type == input_type;
                     });
    return it == siteSimulationInputPackItems.end() ? nullptr : &*it;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25706 function
const OpsV370SiteImpactGraphNode* V370ImpactGraphNodeForOutcomeReconciliation(
    const std::vector<OpsV370SiteImpactGraphNode>& impactGraphNodes,
    const OpsV370LimitedSafeExecutionPilotAction& action) {
    const auto source_it =
        std::find_if(impactGraphNodes.begin(), impactGraphNodes.end(), [&](const auto& node) {
            return node.source_id == action.source_id && node.node_type == "sourceRegistry";
        });
    if (source_it != impactGraphNodes.end()) {
        return &*source_it;
    }
    const auto group_it =
        std::find_if(impactGraphNodes.begin(), impactGraphNodes.end(), [&](const auto& node) {
            return node.site_id == action.site_id &&
                   node.source_group == action.source_group &&
                   node.node_type == "sourceGroup";
        });
    return group_it == impactGraphNodes.end() ? nullptr : &*group_it;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25725 function
const OpsV370ClientNoticeBySiteViewGroupItem* V370ClientNoticeForOutcomeReconciliation(
    const std::vector<OpsV370ClientNoticeBySiteViewGroupItem>& noticeItems,
    const OpsV370LimitedSafeExecutionPilotAction& action) {
    const auto it =
        std::find_if(noticeItems.begin(), noticeItems.end(), [&](const auto& item) {
            return item.site_id == action.site_id && item.source_group == action.source_group;
        });
    return it == noticeItems.end() ? nullptr : &*it;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25735 function
std::vector<OpsV370OutcomeReconciliationItem> BuildV370OutcomeReconciliationItems(
    const std::vector<OpsV370LimitedSafeExecutionPilotAction>& actions,
    const std::vector<OpsV370SiteSimulationInputPackItem>& siteSimulationInputPackItems,
    const std::vector<OpsV360SourceRuleImpactDiff>& impactDiffs,
    const std::vector<OpsV370SiteImpactGraphNode>& impactGraphNodes,
    const std::vector<OpsV370ClientNoticeBySiteViewGroupItem>& noticeItems) {
    std::vector<OpsV370OutcomeReconciliationItem> items;
    int index = 0;
    for (const auto& action : actions) {
        const auto* source_pack =
            V370SimulationPackForOutcomeReconciliation(siteSimulationInputPackItems,
                                                       action.site_id,
                                                       action.source_group,
                                                       "SourceRegistry");
        const auto* event_pack =
            V370SimulationPackForOutcomeReconciliation(siteSimulationInputPackItems,
                                                       action.site_id,
                                                       action.source_group,
                                                       "EventRecord");
        const auto* client_pack =
            V370SimulationPackForOutcomeReconciliation(siteSimulationInputPackItems,
                                                       action.site_id,
                                                       action.source_group,
                                                       "PublishedView");
        const auto* impact_diff = V370ImpactDiffForOutcomeReconciliation(impactDiffs, action);
        const auto* impact_node =
            V370ImpactGraphNodeForOutcomeReconciliation(impactGraphNodes, action);
        const auto* notice = V370ClientNoticeForOutcomeReconciliation(noticeItems, action);

        OpsV370OutcomeReconciliationItem item;
        item.reconciliation_id =
            "outcomeReconciliation:" + action.site_id + ":" + action.source_group +
            ":" + std::to_string(index + 1);
        item.pilot_action_id = action.pilot_action_id;
        item.site_id = action.site_id;
        item.source_group = action.source_group;
        item.action_kind = action.action_kind;
        item.pre_simulation_ref =
            source_pack == nullptr ? "preSimulationRef:source-pack-pending"
                                   : source_pack->pack_id;
        item.post_execution_ref =
            "postExecutionRef:not-run:" + action.pilot_action_id;
        item.source_impact_before_ref =
            impact_node == nullptr ? item.pre_simulation_ref : impact_node->node_id;
        item.source_impact_after_ref =
            action.source_recheck_ref.empty() ? item.post_execution_ref
                                              : action.source_recheck_ref;
        item.source_impact_diff =
            "source-reconciliation: " +
            (impact_diff == nullptr ? std::string("pending impact diff")
                                    : impact_diff->source_health_diff);
        item.event_impact_before_ref =
            event_pack == nullptr ? "EventRecord:aggregate:pending" : event_pack->pack_id;
        item.event_impact_after_ref =
            "EventRecord:postExecution:not-run:" + action.pilot_action_id;
        item.event_impact_diff =
            "event-reconciliation: " +
            (impact_diff == nullptr ? std::string("pending EventRecord impact diff")
                                    : impact_diff->event_risk_diff);
        item.client_impact_before_ref =
            notice == nullptr
                ? (client_pack == nullptr ? "clientImpact:PublishedView:pending"
                                          : client_pack->pack_id)
                : notice->notice_preview_id;
        item.client_impact_after_ref =
            action.notice_queue_ref.empty() ? "noticeQueueRef:not-selected"
                                            : action.notice_queue_ref;
        item.client_impact_diff =
            "client-reconciliation: " +
            (impact_diff == nullptr
                 ? std::string("pending client impact diff")
                 : impact_diff->client_impact_diff);
        item.reconciliation_status =
            action.pilot_execution_status == "approval-gated-ready"
                ? "pending-approved-execution"
                : "pending-execution";
        item.pending_reason =
            "pilotExecutionStatus=" + action.pilot_execution_status +
            "; executionObserved=false; postExecutionRef=not-run";
        item.drift_signals = {
            "source-reconciliation:pending",
            "event-reconciliation:pending",
            "client-reconciliation:pending",
        };
        item.evidence_refs = {
            "/ops/api/site-operations/limited-safe-execution-pilot",
            "/ops/api/site-operations/simulation-input-pack",
            "/ops/api/live-operations/simulation/impact-diff",
            "/ops/api/site-operations/impact-graph",
            "/ops/api/site-operations/client-notice-by-site-view-group",
            action.pilot_action_id,
        };
        if (source_pack != nullptr) {
            item.evidence_refs.push_back(source_pack->pack_id);
        }
        if (event_pack != nullptr) {
            item.evidence_refs.push_back(event_pack->pack_id);
        }
        if (client_pack != nullptr) {
            item.evidence_refs.push_back(client_pack->pack_id);
        }
        if (impact_diff != nullptr) {
            item.evidence_refs.push_back(impact_diff->diff_id);
        }
        if (notice != nullptr) {
            item.evidence_refs.push_back(notice->notice_preview_id);
        }
        for (const auto& ref : action.evidence_refs) {
            AddV370UniqueString(&item.evidence_refs, ref);
        }
        items.push_back(std::move(item));
        ++index;
        if (items.size() >= 24U) {
            break;
        }
    }

    if (items.empty()) {
        OpsV370OutcomeReconciliationItem item;
        item.reconciliation_id = "outcomeReconciliation:pending";
        item.pilot_action_id = "limitedSafeExecutionPilot:pending";
        item.site_id = "unassigned-site";
        item.source_group = "unassigned-source-group";
        item.action_kind = "source-recheck-pilot";
        item.pre_simulation_ref = "preSimulationRef:pending";
        item.post_execution_ref = "postExecutionRef:not-run";
        item.source_impact_before_ref = "sourceImpactBeforeRef:pending";
        item.source_impact_after_ref = "sourceImpactAfterRef:not-run";
        item.source_impact_diff = "source-reconciliation: pending";
        item.event_impact_before_ref = "EventRecord:aggregate:pending";
        item.event_impact_after_ref = "EventRecord:postExecution:not-run";
        item.event_impact_diff = "event-reconciliation: pending";
        item.client_impact_before_ref = "clientImpactBeforeRef:pending";
        item.client_impact_after_ref = "clientImpactAfterRef:not-run";
        item.client_impact_diff = "client-reconciliation: pending";
        item.evidence_refs = {
            "/ops/api/site-operations/limited-safe-execution-pilot",
            "/ops/api/site-operations/simulation-input-pack",
            "/ops/api/live-operations/simulation/impact-diff",
        };
        item.drift_signals = {
            "source-reconciliation:pending",
            "event-reconciliation:pending",
            "client-reconciliation:pending",
        };
        items.push_back(std::move(item));
    }
    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25885 function
OpsV370OutcomeReconciliationSummary BuildV370OutcomeReconciliationSummary(
    const std::vector<OpsV370OutcomeReconciliationItem>& items) {
    OpsV370OutcomeReconciliationSummary summary;
    summary.derivation_sources = {
        "BuildV370LimitedSafeExecutionPilotActions",
        "BuildV370SiteSimulationInputPackItems",
        "BuildV360SourceRuleImpactDiffs",
        "BuildV370SiteImpactGraphNodes",
        "BuildV370ClientNoticeBySiteViewGroupItems",
    };
    summary.reconciliation_count = static_cast<int>(items.size());
    for (const auto& item : items) {
        if (!item.source_impact_diff.empty()) {
            ++summary.source_diff_count;
        }
        if (!item.event_impact_diff.empty()) {
            ++summary.event_diff_count;
        }
        if (!item.client_impact_diff.empty()) {
            ++summary.client_diff_count;
        }
        if (item.reconciliation_status.find("pending") != std::string::npos) {
            ++summary.pending_count;
        }
        if (item.execution_observed) {
            ++summary.execution_observed_count;
        } else {
            ++summary.not_run_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25918 function
void AppendV370OutcomeReconciliationSummaryJson(
    std::ostringstream& out,
    const OpsV370OutcomeReconciliationSummary& summary) {
    out << "{"
        << "\"reconciliationCount\":" << summary.reconciliation_count << ","
        << "\"sourceDiffCount\":" << summary.source_diff_count << ","
        << "\"eventDiffCount\":" << summary.event_diff_count << ","
        << "\"clientDiffCount\":" << summary.client_diff_count << ","
        << "\"pendingCount\":" << summary.pending_count << ","
        << "\"executionObservedCount\":" << summary.execution_observed_count << ","
        << "\"notRunCount\":" << summary.not_run_count << ","
        << "\"derivationSources\":";
    AppendJsonStringArray(out, summary.derivation_sources);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25934 function
void AppendV370OutcomeReconciliationItemJson(
    std::ostringstream& out,
    const OpsV370OutcomeReconciliationItem& item) {
    out << "{"
        << "\"reconciliationId\":\"" << JsonEscape(item.reconciliation_id) << "\","
        << "\"pilotActionId\":\"" << JsonEscape(item.pilot_action_id) << "\","
        << "\"siteId\":\"" << JsonEscape(item.site_id) << "\","
        << "\"sourceGroup\":\"" << JsonEscape(item.source_group) << "\","
        << "\"actionKind\":\"" << JsonEscape(item.action_kind) << "\","
        << "\"preSimulationRef\":\"" << JsonEscape(item.pre_simulation_ref) << "\","
        << "\"postExecutionRef\":\"" << JsonEscape(item.post_execution_ref) << "\","
        << "\"sourceImpactBeforeRef\":\"" << JsonEscape(item.source_impact_before_ref) << "\","
        << "\"sourceImpactAfterRef\":\"" << JsonEscape(item.source_impact_after_ref) << "\","
        << "\"sourceImpactDiff\":\"" << JsonEscape(item.source_impact_diff) << "\","
        << "\"eventImpactBeforeRef\":\"" << JsonEscape(item.event_impact_before_ref) << "\","
        << "\"eventImpactAfterRef\":\"" << JsonEscape(item.event_impact_after_ref) << "\","
        << "\"eventImpactDiff\":\"" << JsonEscape(item.event_impact_diff) << "\","
        << "\"clientImpactBeforeRef\":\"" << JsonEscape(item.client_impact_before_ref) << "\","
        << "\"clientImpactAfterRef\":\"" << JsonEscape(item.client_impact_after_ref) << "\","
        << "\"clientImpactDiff\":\"" << JsonEscape(item.client_impact_diff) << "\","
        << "\"reconciliationStatus\":\"" << JsonEscape(item.reconciliation_status) << "\","
        << "\"pendingReason\":\"" << JsonEscape(item.pending_reason) << "\","
        << "\"evidenceRefs\":";
    AppendJsonStringArray(out, item.evidence_refs);
    out << ",\"driftSignals\":";
    AppendJsonStringArray(out, item.drift_signals);
    out << ",\"sourceReconciled\":" << JsonBool(item.source_reconciled)
        << ",\"eventReconciled\":" << JsonBool(item.event_reconciled)
        << ",\"clientReconciled\":" << JsonBool(item.client_reconciled)
        << ",\"executionObserved\":" << JsonBool(item.execution_observed)
        << ",\"readOnly\":" << JsonBool(item.read_only)
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25968 function
std::string OpsV370OutcomeReconciliationJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v370-outcome-reconciliation.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans = BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto dryRunResults = BuildV360CommandPlanDryRunResults(commandPlanCandidates);
    const auto impactDiffs =
        BuildV360SourceRuleImpactDiffs(context, commandPlanCandidates, stagedChangePlans);
    const auto readinessItems = BuildV360SafeApplyReadinessItems(dryRunResults, impactDiffs);
    const auto v360InputPackItems =
        BuildV360SimulationInputPackItems(context, commandPlanCandidates, stagedChangePlans);
    const auto inputSummary = BuildV360SimulationInputPackSummary(v360InputPackItems);
    const auto simulationRunContract = BuildV360SimulationRunContract();
    const auto simulationResultEnvelope = BuildV360SimulationResultEnvelope(inputSummary);
    const auto simulationRunLedgerEntries =
        BuildV360SimulationRunLedgerEntries(context,
                                            v360InputPackItems,
                                            simulationRunContract,
                                            simulationResultEnvelope,
                                            dryRunResults,
                                            impactDiffs,
                                            readinessItems);
    const auto projection =
        BuildV370SiteAwareSourceRegistryProjectionItems(context.sources, context.views);
    const auto rollups =
        BuildV370SiteHealthRollupItems(context.sources, context.views, source_health_snapshot);
    const auto impactGraphNodes = BuildV370SiteImpactGraphNodes(context, projection, rollups);
    const auto impactGraphEdges = BuildV370SiteImpactGraphEdges(projection);
    const auto siteSimulationInputPackItems =
        BuildV370SiteSimulationInputPackItems(context,
                                             projection,
                                             rollups,
                                             impactGraphNodes,
                                             impactGraphEdges,
                                             v360InputPackItems);
    const auto crossSiteReadinessItems =
        BuildV370CrossSiteSafeApplyReadinessItems(projection,
                                                 siteSimulationInputPackItems,
                                                 readinessItems,
                                                 impactDiffs);
    const auto runbookTemplateContractItems =
        BuildV370RunbookTemplateContractItems(commandPlanCandidates,
                                             dryRunResults,
                                             impactDiffs,
                                             readinessItems,
                                             projection,
                                             siteSimulationInputPackItems,
                                             crossSiteReadinessItems);
    const auto runbookInstanceLedgerEntries =
        BuildV370RunbookInstanceLedgerEntries(runbookTemplateContractItems,
                                             crossSiteReadinessItems,
                                             simulationRunLedgerEntries);
    const auto approvalTicketWorkflowItems =
        BuildV370ApprovalTicketWorkflowItems(runbookTemplateContractItems,
                                            runbookInstanceLedgerEntries,
                                            crossSiteReadinessItems);
    const auto fieldBridgeConditionGates = BuildV340FieldBridgeConditionGates();
    const auto fieldEvidenceIntakeRecords =
        BuildV350FieldEvidenceIntakeRecords(fieldBridgeConditionGates);
    const auto fieldEvidenceExecutionConditions =
        BuildV350FieldEvidenceExecutionConditions(fieldEvidenceIntakeRecords);
    const auto fieldEvidenceAttachments =
        BuildV370FieldEvidenceAttachmentItems(projection,
                                             siteSimulationInputPackItems,
                                             runbookInstanceLedgerEntries,
                                             approvalTicketWorkflowItems,
                                             fieldEvidenceIntakeRecords,
                                             fieldEvidenceExecutionConditions);
    const auto noticeItems = BuildV370ClientNoticeBySiteViewGroupItems(
        projection,
        rollups,
        impactGraphNodes,
        runbookInstanceLedgerEntries,
        approvalTicketWorkflowItems);
    const auto actions =
        BuildV370LimitedSafeExecutionPilotActions(runbookInstanceLedgerEntries,
                                                 approvalTicketWorkflowItems,
                                                 fieldEvidenceAttachments,
                                                 noticeItems);
    const auto items =
        BuildV370OutcomeReconciliationItems(actions,
                                           siteSimulationInputPackItems,
                                           impactDiffs,
                                           impactGraphNodes,
                                           noticeItems);
    const auto summary = BuildV370OutcomeReconciliationSummary(items);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v370-outcome-reconciliation.v1\","
        << "\"status\":\"outcome-reconciliation\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"limitedSafeExecutionPilotRoute\":\"/ops/api/site-operations/limited-safe-execution-pilot\","
        << "\"siteSimulationInputPackRoute\":\"/ops/api/site-operations/simulation-input-pack\","
        << "\"sourceRuleImpactDiffRoute\":\"/ops/api/live-operations/simulation/impact-diff\","
        << "\"siteImpactGraphRoute\":\"/ops/api/site-operations/impact-graph\","
        << "\"clientNoticeBySiteViewGroupRoute\":\"/ops/api/site-operations/client-notice-by-site-view-group\","
        << "\"preSimulationCompared\":true,"
        << "\"postExecutionCompared\":true,"
        << "\"executionObserved\":false,"
        << "\"outcomeReconciliationSummary\":";
    AppendV370OutcomeReconciliationSummaryJson(out, summary);
    out << ",\"outcomeReconciliationItems\":[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV370OutcomeReconciliationItemJson(out, items[i]);
    }
    out << "],\"reconciliationPolicy\":{"
        << "\"comparisonAxes\":[\"source-reconciliation\",\"event-reconciliation\",\"client-reconciliation\"],"
        << "\"preSimulationRef\":\"required\","
        << "\"postExecutionRef\":\"not-run until approved pilot evidence exists\","
        << "\"executionObserved\":false,"
        << "\"pendingOutcomeBehavior\":\"preserve pending/not-run; do not synthesize success\""
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"outcomeReconciliationOnly\":true,"
        << "\"preSimulationCompared\":true,"
        << "\"postExecutionCompared\":true,"
        << "\"executionObserved\":false,"
        << "\"pilotExecutionPerformed\":false,"
        << "\"sourceRecheckExecuted\":false,"
        << "\"noticeQueueWritePerformed\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"runbookInstancePersisted\":false,"
        << "\"approvalTicketWritePerformed\":false,"
        << "\"operatorNoteWritePerformed\":false,"
        << "\"viewerClientPayloadChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}




// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26174 function
const OpsV370SiteAwareSourceRegistryProjectionItem* V370ProjectionForExportHandoff(
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection,
    const std::string& site_id,
    const std::string& source_group) {
    const auto it =
        std::find_if(projection.begin(), projection.end(), [&](const auto& item) {
            return item.site_id == site_id && item.source_group == source_group;
        });
    return it == projection.end() ? nullptr : &*it;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26185 function
const OpsV370RunbookInstanceLedgerEntry* V370RunbookForExportHandoff(
    const std::vector<OpsV370RunbookInstanceLedgerEntry>& runbookInstanceLedgerEntries,
    const std::string& site_id,
    const std::string& source_group) {
    const auto it =
        std::find_if(runbookInstanceLedgerEntries.begin(),
                     runbookInstanceLedgerEntries.end(),
                     [&](const auto& item) {
                         return item.site_id == site_id &&
                                item.source_group == source_group;
                     });
    return it == runbookInstanceLedgerEntries.end() ? nullptr : &*it;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26199 function
const OpsV370ApprovalTicketWorkflowItem* V370ApprovalForExportHandoff(
    const std::vector<OpsV370ApprovalTicketWorkflowItem>& approvalTicketWorkflowItems,
    const std::string& runbook_id,
    const std::string& site_id,
    const std::string& source_group) {
    const auto runbook_it =
        std::find_if(approvalTicketWorkflowItems.begin(),
                     approvalTicketWorkflowItems.end(),
                     [&](const auto& item) {
                         return !runbook_id.empty() && item.runbook_id == runbook_id;
                     });
    if (runbook_it != approvalTicketWorkflowItems.end()) {
        return &*runbook_it;
    }
    const auto scope_it =
        std::find_if(approvalTicketWorkflowItems.begin(),
                     approvalTicketWorkflowItems.end(),
                     [&](const auto& item) {
                         return item.site_id == site_id &&
                                item.source_group == source_group;
                     });
    return scope_it == approvalTicketWorkflowItems.end() ? nullptr : &*scope_it;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26223 function
const OpsV370FieldEvidenceAttachmentItem* V370EvidenceForExportHandoff(
    const std::vector<OpsV370FieldEvidenceAttachmentItem>& fieldEvidenceAttachments,
    const std::string& site_id,
    const std::string& source_group) {
    const auto it =
        std::find_if(fieldEvidenceAttachments.begin(),
                     fieldEvidenceAttachments.end(),
                     [&](const auto& item) {
                         return item.site_id == site_id &&
                                item.source_group == source_group;
                     });
    return it == fieldEvidenceAttachments.end() ? nullptr : &*it;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26237 function
std::vector<OpsV370ExportHandoffBundleItem> BuildV370ExportHandoffBundleItems(
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection,
    const std::vector<OpsV370RunbookInstanceLedgerEntry>& runbookInstanceLedgerEntries,
    const std::vector<OpsV370FieldEvidenceAttachmentItem>& fieldEvidenceAttachments,
    const std::vector<OpsV370ApprovalTicketWorkflowItem>& approvalTicketWorkflowItems,
    const std::vector<OpsV370OutcomeReconciliationItem>& outcomeReconciliationItems) {
    std::vector<OpsV370ExportHandoffBundleItem> items;
    int index = 0;
    for (const auto& outcome : outcomeReconciliationItems) {
        const auto* projected =
            V370ProjectionForExportHandoff(projection, outcome.site_id, outcome.source_group);
        const auto* runbook =
            V370RunbookForExportHandoff(runbookInstanceLedgerEntries,
                                        outcome.site_id,
                                        outcome.source_group);
        const auto* approval =
            V370ApprovalForExportHandoff(approvalTicketWorkflowItems,
                                         runbook == nullptr ? "" : runbook->runbook_id,
                                         outcome.site_id,
                                         outcome.source_group);
        const auto* evidence =
            V370EvidenceForExportHandoff(fieldEvidenceAttachments,
                                         outcome.site_id,
                                         outcome.source_group);

        OpsV370ExportHandoffBundleItem item;
        item.bundle_id =
            "exportHandoffBundle:" + outcome.site_id + ":" + outcome.source_group +
            ":" + std::to_string(index + 1);
        item.site_id = outcome.site_id;
        item.source_group = outcome.source_group;
        item.title = "Export / Handoff Bundle for " + item.site_id + " / " +
                     item.source_group;
        item.handoff_status =
            outcome.reconciliation_status.find("pending") == std::string::npos
                ? "handoff-ready"
                : "pending-handoff";
        item.handoff_ready = item.handoff_status == "handoff-ready";
        item.next_operator_role =
            approval == nullptr || approval->reviewer.empty()
                ? "ops-reviewer"
                : approval->reviewer;
        item.blocked_reason =
            approval == nullptr
                ? outcome.pending_reason
                : approval->reason + "; " + outcome.pending_reason;
        item.site_refs = {
            "/ops/api/site-operations/source-registry-projection",
            "site:" + item.site_id,
            "sourceGroup:" + item.source_group,
        };
        if (projected != nullptr) {
            for (const auto& source_id : projected->source_ids) {
                AddV370UniqueString(&item.site_refs, "source:" + source_id);
            }
            for (const auto& view_id : projected->view_ids) {
                AddV370UniqueString(&item.site_refs, "PublishedView:" + view_id);
            }
        }
        item.runbook_refs = {
            "/ops/api/site-operations/runbook-instance-ledger",
            runbook == nullptr ? "runbook:pending" : runbook->runbook_id,
        };
        item.evidence_refs = {
            "/ops/api/site-operations/field-evidence-attachment",
            evidence == nullptr ? "fieldEvidenceAttachment:pending"
                                : evidence->field_evidence_attachment_id,
        };
        item.approval_refs = {
            "/ops/api/site-operations/approval-ticket-workflow",
            approval == nullptr ? "approval-ticket:pending"
                                : approval->approval_ticket_id,
        };
        item.outcome_refs = {
            "/ops/api/site-operations/outcome-reconciliation",
            outcome.reconciliation_id,
            outcome.pre_simulation_ref,
            outcome.post_execution_ref,
        };
        for (const auto& ref : outcome.evidence_refs) {
            AddV370UniqueString(&item.evidence_refs, ref);
        }
        if (runbook != nullptr) {
            for (const auto& ref : runbook->evidence_refs) {
                AddV370UniqueString(&item.runbook_refs, ref);
            }
        }
        if (approval != nullptr) {
            for (const auto& ref : approval->evidence_refs) {
                AddV370UniqueString(&item.approval_refs, ref);
            }
        }
        if (evidence != nullptr) {
            for (const auto& ref : evidence->evidence_refs) {
                AddV370UniqueString(&item.evidence_refs, ref);
            }
        }
        item.handoff_map_refs = {
            "/ops/api/site-operations/export-handoff-bundle",
            item.bundle_id,
            item.handoff_status,
            item.next_operator_role,
            item.release_safe_label,
        };
        items.push_back(std::move(item));
        ++index;
        if (items.size() >= 24U) {
            break;
        }
    }

    if (items.empty()) {
        OpsV370ExportHandoffBundleItem item;
        item.bundle_id = "exportHandoffBundle:pending";
        item.site_id = "unassigned-site";
        item.source_group = "unassigned-source-group";
        item.title = "Export / Handoff Bundle pending";
        item.blocked_reason =
            "no outcome reconciliation items exist; handoff remains pending";
        item.site_refs = {
            "/ops/api/site-operations/source-registry-projection",
            "site:pending",
        };
        item.runbook_refs = {
            "/ops/api/site-operations/runbook-instance-ledger",
            "runbook:pending",
        };
        item.evidence_refs = {
            "/ops/api/site-operations/field-evidence-attachment",
            "fieldEvidenceAttachment:pending",
        };
        item.approval_refs = {
            "/ops/api/site-operations/approval-ticket-workflow",
            "approval-ticket:pending",
        };
        item.outcome_refs = {
            "/ops/api/site-operations/outcome-reconciliation",
            "outcomeReconciliation:pending",
        };
        item.handoff_map_refs = {
            "/ops/api/site-operations/export-handoff-bundle",
            item.bundle_id,
            item.handoff_status,
        };
        items.push_back(std::move(item));
    }
    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26386 function
std::vector<OpsV370ExportHandoffMapEntry> BuildV370ExportHandoffMapEntries(
    const std::vector<OpsV370ExportHandoffBundleItem>& bundleItems) {
    std::vector<OpsV370ExportHandoffMapEntry> entries;
    int index = 0;
    for (const auto& item : bundleItems) {
        OpsV370ExportHandoffMapEntry entry;
        entry.handoff_id =
            "exportHandoffMap:" + item.site_id + ":" + item.source_group + ":" +
            std::to_string(index + 1);
        entry.bundle_id = item.bundle_id;
        entry.site_id = item.site_id;
        entry.source_group = item.source_group;
        entry.handoff_status = item.handoff_status;
        entry.next_operator_role = item.next_operator_role;
        entry.blocked_reason = item.blocked_reason;
        entry.bundle_refs = item.handoff_map_refs;
        entry.release_safety_refs = {
            item.release_safe_label,
            "redactionReview",
            "artifactExportExecuted=false",
            "fileWritePerformed=false",
            "handoffWritePerformed=false",
        };
        entry.release_safe = item.release_safe;
        entries.push_back(std::move(entry));
        ++index;
    }
    return entries;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26416 function
OpsV370ExportHandoffBundleSummary BuildV370ExportHandoffBundleSummary(
    const std::vector<OpsV370ExportHandoffBundleItem>& bundleItems,
    const std::vector<OpsV370ExportHandoffMapEntry>& handoffMapEntries) {
    OpsV370ExportHandoffBundleSummary summary;
    summary.derivation_sources = {
        "BuildV370SiteAwareSourceRegistryProjectionItems",
        "BuildV370RunbookInstanceLedgerEntries",
        "BuildV370FieldEvidenceAttachmentItems",
        "BuildV370ApprovalTicketWorkflowItems",
        "BuildV370OutcomeReconciliationItems",
    };
    summary.bundle_count = static_cast<int>(bundleItems.size());
    summary.handoff_entry_count = static_cast<int>(handoffMapEntries.size());
    for (const auto& item : bundleItems) {
        summary.site_ref_count += static_cast<int>(item.site_refs.size());
        summary.runbook_ref_count += static_cast<int>(item.runbook_refs.size());
        summary.evidence_ref_count += static_cast<int>(item.evidence_refs.size());
        summary.approval_ref_count += static_cast<int>(item.approval_refs.size());
        summary.outcome_ref_count += static_cast<int>(item.outcome_refs.size());
        if (item.release_safe) {
            ++summary.release_safe_count;
        }
        if (!item.handoff_ready || item.handoff_status.find("pending") != std::string::npos) {
            ++summary.blocked_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26445 function
void AppendV370ExportHandoffBundleSummaryJson(
    std::ostringstream& out,
    const OpsV370ExportHandoffBundleSummary& summary) {
    out << "{"
        << "\"bundleCount\":" << summary.bundle_count << ","
        << "\"handoffEntryCount\":" << summary.handoff_entry_count << ","
        << "\"siteRefCount\":" << summary.site_ref_count << ","
        << "\"runbookRefCount\":" << summary.runbook_ref_count << ","
        << "\"evidenceRefCount\":" << summary.evidence_ref_count << ","
        << "\"approvalRefCount\":" << summary.approval_ref_count << ","
        << "\"outcomeRefCount\":" << summary.outcome_ref_count << ","
        << "\"releaseSafeCount\":" << summary.release_safe_count << ","
        << "\"blockedCount\":" << summary.blocked_count << ","
        << "\"derivationSources\":";
    AppendJsonStringArray(out, summary.derivation_sources);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26463 function
void AppendV370ExportHandoffBundleItemJson(
    std::ostringstream& out,
    const OpsV370ExportHandoffBundleItem& item) {
    out << "{"
        << "\"bundleId\":\"" << JsonEscape(item.bundle_id) << "\","
        << "\"siteId\":\"" << JsonEscape(item.site_id) << "\","
        << "\"sourceGroup\":\"" << JsonEscape(item.source_group) << "\","
        << "\"bundleKind\":\"" << JsonEscape(item.bundle_kind) << "\","
        << "\"title\":\"" << JsonEscape(item.title) << "\","
        << "\"handoffStatus\":\"" << JsonEscape(item.handoff_status) << "\","
        << "\"nextOperatorRole\":\"" << JsonEscape(item.next_operator_role) << "\","
        << "\"blockedReason\":\"" << JsonEscape(item.blocked_reason) << "\","
        << "\"releaseSafeLabel\":\"" << JsonEscape(item.release_safe_label) << "\","
        << "\"siteRefs\":";
    AppendJsonStringArray(out, item.site_refs);
    out << ",\"runbookRefs\":";
    AppendJsonStringArray(out, item.runbook_refs);
    out << ",\"evidenceRefs\":";
    AppendJsonStringArray(out, item.evidence_refs);
    out << ",\"approvalRefs\":";
    AppendJsonStringArray(out, item.approval_refs);
    out << ",\"outcomeRefs\":";
    AppendJsonStringArray(out, item.outcome_refs);
    out << ",\"handoffMapRefs\":";
    AppendJsonStringArray(out, item.handoff_map_refs);
    out << ",\"redactionReview\":";
    AppendJsonStringArray(out, item.redaction_review);
    out << ",\"releaseSafe\":" << JsonBool(item.release_safe)
        << ",\"handoffReady\":" << JsonBool(item.handoff_ready)
        << ",\"readOnly\":" << JsonBool(item.read_only)
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26496 function
void AppendV370ExportHandoffMapEntryJson(
    std::ostringstream& out,
    const OpsV370ExportHandoffMapEntry& entry) {
    out << "{"
        << "\"handoffId\":\"" << JsonEscape(entry.handoff_id) << "\","
        << "\"bundleId\":\"" << JsonEscape(entry.bundle_id) << "\","
        << "\"siteId\":\"" << JsonEscape(entry.site_id) << "\","
        << "\"sourceGroup\":\"" << JsonEscape(entry.source_group) << "\","
        << "\"handoffStatus\":\"" << JsonEscape(entry.handoff_status) << "\","
        << "\"nextOperatorRole\":\"" << JsonEscape(entry.next_operator_role) << "\","
        << "\"blockedReason\":\"" << JsonEscape(entry.blocked_reason) << "\","
        << "\"bundleRefs\":";
    AppendJsonStringArray(out, entry.bundle_refs);
    out << ",\"releaseSafetyRefs\":";
    AppendJsonStringArray(out, entry.release_safety_refs);
    out << ",\"releaseSafe\":" << JsonBool(entry.release_safe)
        << ",\"readOnly\":" << JsonBool(entry.read_only)
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26516 function
std::string OpsV370ExportHandoffBundleJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v370-export-handoff-bundle.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans = BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto dryRunResults = BuildV360CommandPlanDryRunResults(commandPlanCandidates);
    const auto impactDiffs =
        BuildV360SourceRuleImpactDiffs(context, commandPlanCandidates, stagedChangePlans);
    const auto readinessItems = BuildV360SafeApplyReadinessItems(dryRunResults, impactDiffs);
    const auto v360InputPackItems =
        BuildV360SimulationInputPackItems(context, commandPlanCandidates, stagedChangePlans);
    const auto inputSummary = BuildV360SimulationInputPackSummary(v360InputPackItems);
    const auto simulationRunContract = BuildV360SimulationRunContract();
    const auto simulationResultEnvelope = BuildV360SimulationResultEnvelope(inputSummary);
    const auto simulationRunLedgerEntries =
        BuildV360SimulationRunLedgerEntries(context,
                                            v360InputPackItems,
                                            simulationRunContract,
                                            simulationResultEnvelope,
                                            dryRunResults,
                                            impactDiffs,
                                            readinessItems);
    const auto projection =
        BuildV370SiteAwareSourceRegistryProjectionItems(context.sources, context.views);
    const auto rollups =
        BuildV370SiteHealthRollupItems(context.sources, context.views, source_health_snapshot);
    const auto impactGraphNodes = BuildV370SiteImpactGraphNodes(context, projection, rollups);
    const auto impactGraphEdges = BuildV370SiteImpactGraphEdges(projection);
    const auto siteSimulationInputPackItems =
        BuildV370SiteSimulationInputPackItems(context,
                                             projection,
                                             rollups,
                                             impactGraphNodes,
                                             impactGraphEdges,
                                             v360InputPackItems);
    const auto crossSiteReadinessItems =
        BuildV370CrossSiteSafeApplyReadinessItems(projection,
                                                 siteSimulationInputPackItems,
                                                 readinessItems,
                                                 impactDiffs);
    const auto runbookTemplateContractItems =
        BuildV370RunbookTemplateContractItems(commandPlanCandidates,
                                             dryRunResults,
                                             impactDiffs,
                                             readinessItems,
                                             projection,
                                             siteSimulationInputPackItems,
                                             crossSiteReadinessItems);
    const auto runbookInstanceLedgerEntries =
        BuildV370RunbookInstanceLedgerEntries(runbookTemplateContractItems,
                                             crossSiteReadinessItems,
                                             simulationRunLedgerEntries);
    const auto approvalTicketWorkflowItems =
        BuildV370ApprovalTicketWorkflowItems(runbookTemplateContractItems,
                                            runbookInstanceLedgerEntries,
                                            crossSiteReadinessItems);
    const auto fieldBridgeConditionGates = BuildV340FieldBridgeConditionGates();
    const auto fieldEvidenceIntakeRecords =
        BuildV350FieldEvidenceIntakeRecords(fieldBridgeConditionGates);
    const auto fieldEvidenceExecutionConditions =
        BuildV350FieldEvidenceExecutionConditions(fieldEvidenceIntakeRecords);
    const auto fieldEvidenceAttachments =
        BuildV370FieldEvidenceAttachmentItems(projection,
                                             siteSimulationInputPackItems,
                                             runbookInstanceLedgerEntries,
                                             approvalTicketWorkflowItems,
                                             fieldEvidenceIntakeRecords,
                                             fieldEvidenceExecutionConditions);
    const auto noticeItems = BuildV370ClientNoticeBySiteViewGroupItems(
        projection,
        rollups,
        impactGraphNodes,
        runbookInstanceLedgerEntries,
        approvalTicketWorkflowItems);
    const auto actions =
        BuildV370LimitedSafeExecutionPilotActions(runbookInstanceLedgerEntries,
                                                 approvalTicketWorkflowItems,
                                                 fieldEvidenceAttachments,
                                                 noticeItems);
    const auto outcomeItems =
        BuildV370OutcomeReconciliationItems(actions,
                                           siteSimulationInputPackItems,
                                           impactDiffs,
                                           impactGraphNodes,
                                           noticeItems);
    const auto bundleItems =
        BuildV370ExportHandoffBundleItems(projection,
                                         runbookInstanceLedgerEntries,
                                         fieldEvidenceAttachments,
                                         approvalTicketWorkflowItems,
                                         outcomeItems);
    const auto handoffMapEntries = BuildV370ExportHandoffMapEntries(bundleItems);
    const auto summary =
        BuildV370ExportHandoffBundleSummary(bundleItems, handoffMapEntries);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v370-export-handoff-bundle.v1\","
        << "\"status\":\"export-handoff-bundle\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"siteRegistryProjectionRoute\":\"/ops/api/site-operations/source-registry-projection\","
        << "\"runbookInstanceLedgerRoute\":\"/ops/api/site-operations/runbook-instance-ledger\","
        << "\"fieldEvidenceAttachmentRoute\":\"/ops/api/site-operations/field-evidence-attachment\","
        << "\"approvalTicketWorkflowRoute\":\"/ops/api/site-operations/approval-ticket-workflow\","
        << "\"outcomeReconciliationRoute\":\"/ops/api/site-operations/outcome-reconciliation\","
        << "\"redactedReleaseSafeExportBundle\":true,"
        << "\"releaseSafe\":true,"
        << "\"exportHandoffBundleSummary\":";
    AppendV370ExportHandoffBundleSummaryJson(out, summary);
    out << ",\"exportHandoffBundleItems\":[";
    for (std::size_t i = 0; i < bundleItems.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV370ExportHandoffBundleItemJson(out, bundleItems[i]);
    }
    out << "],\"exportHandoffMapEntries\":[";
    for (std::size_t i = 0; i < handoffMapEntries.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV370ExportHandoffMapEntryJson(out, handoffMapEntries[i]);
    }
    out << "],\"bundlePolicy\":{"
        << "\"redacted\":\"redacted-release-safe\","
        << "\"siteRefs\":\"site/source group ids and PublishedView ids only\","
        << "\"runbookRefs\":\"read-only runbook ledger refs\","
        << "\"evidenceRefs\":\"conditional/not-run evidence refs only\","
        << "\"approvalRefs\":\"approval ticket refs only\","
        << "\"outcomeRefs\":\"pre/post execution refs with post execution not-run preserved\","
        << "\"handoff\":\"release-safe handoff map only; no file or artifact export is performed\""
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"releaseSafe\":true,"
        << "\"redacted\":true,"
        << "\"exportHandoffOnly\":true,"
        << "\"artifactExportExecuted\":false,"
        << "\"bundlePersisted\":false,"
        << "\"fileWritePerformed\":false,"
        << "\"handoffWritePerformed\":false,"
        << "\"pilotExecutionPerformed\":false,"
        << "\"sourceRecheckExecuted\":false,"
        << "\"noticeQueueWritePerformed\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"fieldSmokeExecuted\":false,"
        << "\"endpointProbePerformed\":false,"
        << "\"providerCallPerformed\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"runbookInstancePersisted\":false,"
        << "\"approvalTicketWritePerformed\":false,"
        << "\"operatorNoteWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"viewerClientPayloadChanged\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"rawEndpointIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"rawProviderResponseIncluded\":false,"
        << "\"rawDiagnosticJsonIncluded\":false,"
        << "\"clientViewerRawMaterialIncluded\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26720 function
std::vector<OpsV360RuleVaWhatIfReplayCandidate> BuildV360RuleVaWhatIfReplayCandidates(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV360CommandPlanDryRunResult>& dryRunResults,
    const std::vector<OpsV360SourceRuleImpactDiff>& impactDiffs) {
    std::vector<OpsV360RuleVaWhatIfReplayCandidate> candidates;
    const int event_record_count = std::max(1, context.event_record_count);
    int index = 0;
    const auto append_candidate = [&](const std::string& candidate_id,
                                      const std::string& candidate_type,
                                      const std::string& source_id) {
        OpsV360RuleVaWhatIfReplayCandidate candidate;
        candidate.what_if_replay_id = "what-if-replay:" + candidate_id;
        candidate.event_record_ref =
            "EventRecord:aggregate:" + std::to_string((index % event_record_count) + 1);
        candidate.source_id = source_id.empty() ? "pending-source" : source_id;
        candidate.rule_candidate_id = candidate_id;
        candidate.rule_threshold_candidate =
            candidate_type == "ruleFollowUp" ? "thresholdCandidate:confidence+0.05"
                                             : "thresholdCandidate:sensitivity-review";
        candidate.preset_candidate =
            candidate_type == "ruleFollowUp" ? "presetCandidate:retail"
                                             : "presetCandidate:default";
        candidate.scenario_candidate =
            candidate_type == "ruleFollowUp" ? "scenarioCandidate:loitering"
                                             : "scenarioCandidate:presence";
        candidate.after_match_state =
            "afterMatchState: what-if threshold/preset/scenario projection";
        candidate.what_if_result_delta =
            "ruleThresholdDelta=" + candidate.rule_threshold_candidate +
            "; presetDelta=" + candidate.preset_candidate +
            "; scenarioDelta=" + candidate.scenario_candidate;
        candidate.changed_fields = {"ruleThresholdDelta", "presetDelta", "scenarioDelta"};
        candidate.evidence_refs = {
            "/ops/api/events/reviews",
            "/ops/api/live-operations/simulation/command-plan-dry-run",
            "/ops/api/live-operations/simulation/impact-diff",
            candidate_id,
        };
        for (const auto& diff : impactDiffs) {
            if (diff.candidate_id == candidate_id) {
                candidate.evidence_refs.push_back(diff.diff_id);
                break;
            }
        }
        candidates.push_back(std::move(candidate));
        ++index;
    };

    for (const auto& result : dryRunResults) {
        if (result.candidate_type == "ruleFollowUp" ||
            result.candidate_type == "sourceRecheck" ||
            result.candidate_type == "recovery") {
            append_candidate(result.candidate_id, result.candidate_type, result.source_id);
        }
        if (candidates.size() >= 12U) {
            break;
        }
    }
    if (candidates.empty()) {
        append_candidate("candidate:default:ruleFollowUp", "ruleFollowUp", "pending-source");
    }
    return candidates;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26784 function
OpsV360RuleVaWhatIfReplaySummary BuildV360RuleVaWhatIfReplaySummary(
    const std::vector<OpsV360RuleVaWhatIfReplayCandidate>& candidates) {
    OpsV360RuleVaWhatIfReplaySummary summary;
    summary.candidate_count = static_cast<int>(candidates.size());
    for (const auto& candidate : candidates) {
        if (!candidate.rule_threshold_candidate.empty()) {
            ++summary.threshold_candidate_count;
        }
        if (!candidate.preset_candidate.empty()) {
            ++summary.preset_candidate_count;
        }
        if (!candidate.scenario_candidate.empty()) {
            ++summary.scenario_candidate_count;
        }
        if (!candidate.event_record_ref.empty()) {
            ++summary.event_record_ref_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26805 function
void AppendV360RuleVaWhatIfReplaySummaryJson(
    std::ostringstream& out,
    const OpsV360RuleVaWhatIfReplaySummary& summary) {
    out << "{"
        << "\"candidateCount\":" << summary.candidate_count << ","
        << "\"thresholdCandidateCount\":" << summary.threshold_candidate_count << ","
        << "\"presetCandidateCount\":" << summary.preset_candidate_count << ","
        << "\"scenarioCandidateCount\":" << summary.scenario_candidate_count << ","
        << "\"eventRecordRefCount\":" << summary.event_record_ref_count
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26817 function
void AppendV360RuleVaWhatIfReplayCandidateJson(
    std::ostringstream& out,
    const OpsV360RuleVaWhatIfReplayCandidate& candidate) {
    out << "{"
        << "\"whatIfReplayId\":\"" << JsonEscape(candidate.what_if_replay_id) << "\","
        << "\"eventRecordRef\":\"" << JsonEscape(candidate.event_record_ref) << "\","
        << "\"vaFixtureRef\":\"" << JsonEscape(candidate.va_fixture_ref) << "\","
        << "\"sourceId\":\"" << JsonEscape(candidate.source_id) << "\","
        << "\"ruleCandidateId\":\"" << JsonEscape(candidate.rule_candidate_id) << "\","
        << "\"ruleThresholdCandidate\":\""
        << JsonEscape(candidate.rule_threshold_candidate) << "\","
        << "\"presetCandidate\":\"" << JsonEscape(candidate.preset_candidate) << "\","
        << "\"scenarioCandidate\":\"" << JsonEscape(candidate.scenario_candidate) << "\","
        << "\"beforeMatchState\":\"" << JsonEscape(candidate.before_match_state) << "\","
        << "\"afterMatchState\":\"" << JsonEscape(candidate.after_match_state) << "\","
        << "\"whatIfResultDelta\":\"" << JsonEscape(candidate.what_if_result_delta) << "\","
        << "\"changedFields\":";
    AppendV340RecoveryCandidateStringListJson(out, candidate.changed_fields);
    out << ",\"evidenceRefs\":";
    AppendV340RecoveryCandidateStringListJson(out, candidate.evidence_refs);
    out << ",\"readOnly\":" << (candidate.read_only ? "true" : "false") << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26840 function
std::string OpsV360RuleVaWhatIfReplayPackJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v360-rule-va-what-if-replay-pack.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans = BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto dryRunResults = BuildV360CommandPlanDryRunResults(commandPlanCandidates);
    const auto impactDiffs =
        BuildV360SourceRuleImpactDiffs(context, commandPlanCandidates, stagedChangePlans);
    const auto candidates =
        BuildV360RuleVaWhatIfReplayCandidates(context, dryRunResults, impactDiffs);
    const auto summary = BuildV360RuleVaWhatIfReplaySummary(candidates);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v360-rule-va-what-if-replay-pack.v1\","
        << "\"status\":\"rule-va-what-if-replay-pack\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"eventRecordRoute\":\"/ops/api/events/reviews\","
        << "\"commandPlanDryRunRoute\":\"/ops/api/live-operations/simulation/command-plan-dry-run\","
        << "\"impactDiffRoute\":\"/ops/api/live-operations/simulation/impact-diff\","
        << "\"replayPolicy\":{"
        << "\"whatIfOnly\":true,"
        << "\"EventRecord\":\"read-only aggregate input\","
        << "\"vaFixtureRef\":\"manual_ui_fulltest_va_seed_matrix\","
        << "\"thresholdCandidate\":\"computed-only\","
        << "\"presetCandidate\":\"computed-only\","
        << "\"scenarioCandidate\":\"computed-only\""
        << "},\"ruleVaWhatIfReplaySummary\":";
    AppendV360RuleVaWhatIfReplaySummaryJson(out, summary);
    out << ",\"whatIfReplayCandidates\":[";
    for (std::size_t i = 0; i < candidates.size(); ++i) {
        if (i != 0) out << ",";
        AppendV360RuleVaWhatIfReplayCandidateJson(out, candidates[i]);
    }
    out << "],\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"whatIfOnly\":true,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"ruleThresholdApplied\":false,"
        << "\"presetApplied\":false,"
        << "\"scenarioApplied\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawDiagnosticJsonIncluded\":false"
        << "}}";
    return out.str();
}




// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26937 function
std::vector<std::string> V360SimulationExportTakeRefs(
    const std::vector<std::string>& refs,
    std::size_t limit,
    const std::string& fallback) {
    std::vector<std::string> result;
    for (const auto& ref : refs) {
        if (!ref.empty()) {
            result.push_back(ref);
        }
        if (result.size() >= limit) {
            break;
        }
    }
    if (result.empty() && !fallback.empty()) {
        result.push_back(fallback);
    }
    return result;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26956 function
std::vector<OpsV360SimulationExportBundleItem> BuildV360SimulationExportBundleItems(
    const std::vector<OpsV360SimulationInputPackItem>& inputPackItems,
    const OpsV360SimulationRunContract& simulationRunContract,
    const OpsV360SimulationResultEnvelope& simulationResultEnvelope,
    const std::vector<OpsV360SimulationRunLedgerEntry>& ledgerEntries,
    const std::vector<OpsV360CommandPlanDryRunResult>& dryRunResults,
    const std::vector<OpsV360SourceRuleImpactDiff>& impactDiffs,
    const std::vector<OpsV360SafeApplyReadinessItem>& readinessItems,
    const std::vector<OpsV360RuleVaWhatIfReplayCandidate>& whatIfCandidates,
    const std::vector<OpsV360ClientNoticePreviewItem>& noticePreviewItems) {
    std::vector<std::string> input_refs;
    for (const auto& item : inputPackItems) {
        input_refs.push_back(item.input_id + "@" + item.source_route);
    }
    std::vector<std::string> output_refs = {
        simulationRunContract.simulation_run_id,
        "simulationResultEnvelope:" + simulationResultEnvelope.result_status,
        "/ops/api/live-operations/simulation/command-plan-dry-run",
        "/ops/api/live-operations/simulation/impact-diff",
    };
    for (const auto& entry : ledgerEntries) {
        output_refs.push_back(entry.simulation_run_id);
        if (output_refs.size() >= 12U) {
            break;
        }
    }
    for (const auto& result : dryRunResults) {
        output_refs.push_back(result.result_id);
        if (output_refs.size() >= 16U) {
            break;
        }
    }
    for (const auto& diff : impactDiffs) {
        output_refs.push_back(diff.diff_id);
        if (output_refs.size() >= 20U) {
            break;
        }
    }

    std::vector<std::string> blocker_refs = simulationResultEnvelope.blockers;
    for (const auto& readiness : readinessItems) {
        blocker_refs.push_back(readiness.readiness_id);
        for (const auto& blocker : readiness.blockers) {
            blocker_refs.push_back(readiness.readiness_id + ":" + blocker);
        }
        if (blocker_refs.size() >= 16U) {
            break;
        }
    }

    std::vector<std::string> handoff_refs;
    for (const auto& readiness : readinessItems) {
        handoff_refs.push_back("handoff:" + readiness.candidate_id);
        if (handoff_refs.size() >= 8U) {
            break;
        }
    }
    for (const auto& candidate : whatIfCandidates) {
        handoff_refs.push_back("what-if:" + candidate.what_if_replay_id);
        if (handoff_refs.size() >= 12U) {
            break;
        }
    }
    for (const auto& preview : noticePreviewItems) {
        handoff_refs.push_back("notice-preview:" + preview.notice_preview_id);
        if (handoff_refs.size() >= 16U) {
            break;
        }
    }

    std::vector<OpsV360SimulationExportBundleItem> items;
    OpsV360SimulationExportBundleItem input_output;
    input_output.bundle_item_id = "simulation-export-bundle:input-output";
    input_output.bundle_section = "simulation input/output";
    input_output.summary =
        "redacted release-safe bundle of simulation input refs and computed output refs";
    input_output.simulation_input_refs =
        V360SimulationExportTakeRefs(input_refs, 8, "/ops/api/live-operations/simulation/input-pack");
    input_output.simulation_output_refs =
        V360SimulationExportTakeRefs(output_refs, 12, simulationRunContract.simulation_run_id);
    input_output.readiness_blocker_refs =
        V360SimulationExportTakeRefs(blocker_refs, 6, "simulation-not-executed");
    input_output.handoff_map_refs =
        V360SimulationExportTakeRefs(handoff_refs, 6, "handoff:operator-review-required");
    input_output.evidence_refs = {
        "/ops/api/live-operations/simulation/input-pack",
        "/ops/api/live-operations/simulation/run-contract",
        "/ops/api/live-operations/simulation/run-ledger",
        "/ops/api/live-operations/simulation/command-plan-dry-run",
        "/ops/api/live-operations/simulation/impact-diff",
    };
    items.push_back(std::move(input_output));

    OpsV360SimulationExportBundleItem blocker_item;
    blocker_item.bundle_item_id = "simulation-export-bundle:blocker";
    blocker_item.bundle_section = "readiness blocker";
    blocker_item.summary =
        "redacted release-safe blocker map for simulation handoff review";
    blocker_item.simulation_input_refs =
        V360SimulationExportTakeRefs(input_refs, 4, "/ops/api/live-operations/simulation/input-pack");
    blocker_item.simulation_output_refs =
        V360SimulationExportTakeRefs(output_refs, 6, simulationRunContract.simulation_run_id);
    blocker_item.readiness_blocker_refs =
        V360SimulationExportTakeRefs(blocker_refs, 12, "safe-apply-readiness-not-approved");
    blocker_item.handoff_map_refs =
        V360SimulationExportTakeRefs(handoff_refs, 8, "handoff:blocker-review");
    blocker_item.evidence_refs = {
        "/ops/api/live-operations/simulation/safe-apply-readiness",
        "/ops/api/live-operations/simulation/impact-diff",
    };
    items.push_back(std::move(blocker_item));

    OpsV360SimulationExportBundleItem handoff_item;
    handoff_item.bundle_item_id = "simulation-export-bundle:handoff-map";
    handoff_item.bundle_section = "handoff map";
    handoff_item.summary =
        "redacted release-safe handoff map for operator review and release notes";
    handoff_item.simulation_input_refs =
        V360SimulationExportTakeRefs(input_refs, 4, "/ops/api/live-operations/simulation/input-pack");
    handoff_item.simulation_output_refs =
        V360SimulationExportTakeRefs(output_refs, 8, simulationRunContract.simulation_run_id);
    handoff_item.readiness_blocker_refs =
        V360SimulationExportTakeRefs(blocker_refs, 6, "simulation-not-executed");
    handoff_item.handoff_map_refs =
        V360SimulationExportTakeRefs(handoff_refs, 12, "handoff:operator-review-required");
    handoff_item.evidence_refs = {
        "/ops/api/live-operations/simulation/rule-va-what-if-replay-pack",
        "/ops/api/live-operations/simulation/client-notice-preview",
        "/ops/api/live-operations/simulation/safe-apply-readiness",
    };
    items.push_back(std::move(handoff_item));

    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27091 function
std::vector<OpsV360SimulationHandoffMapEntry> BuildV360SimulationHandoffMapEntries(
    const std::vector<OpsV360SafeApplyReadinessItem>& readinessItems,
    const std::vector<OpsV360SimulationExportBundleItem>& bundleItems) {
    std::vector<std::string> bundle_refs;
    for (const auto& item : bundleItems) {
        bundle_refs.push_back(item.bundle_item_id);
    }

    std::vector<OpsV360SimulationHandoffMapEntry> entries;
    for (const auto& readiness : readinessItems) {
        OpsV360SimulationHandoffMapEntry entry;
        entry.handoff_id = "simulation-handoff:" + readiness.candidate_id;
        entry.candidate_id = readiness.candidate_id;
        entry.handoff_status = readiness.readiness_state == "ready"
                                   ? "ready-for-operator-review"
                                   : "operator-review-required";
        entry.next_operator_role = readiness.field_evidence_required ? "field-operator"
                                  : (readiness.operator_approval_required ? "operator"
                                                                           : "ops-admin");
        entry.blocked_reason = readiness.blockers.empty()
                                   ? "none"
                                   : JoinV340ApprovalRecoveryStrings(readiness.blockers, ", ");
        entry.bundle_item_refs = V360SimulationExportTakeRefs(
            bundle_refs,
            6,
            "simulation-export-bundle:input-output");
        entry.evidence_refs = {
            "/ops/api/live-operations/simulation/export-bundle",
            "/ops/api/live-operations/simulation/safe-apply-readiness",
            readiness.readiness_id,
        };
        entries.push_back(std::move(entry));
        if (entries.size() >= 12U) {
            break;
        }
    }

    if (entries.empty()) {
        OpsV360SimulationHandoffMapEntry entry;
        entry.handoff_id = "simulation-handoff:pending";
        entry.candidate_id = "candidate:pending";
        entry.bundle_item_refs =
            V360SimulationExportTakeRefs(bundle_refs, 6, "simulation-export-bundle:input-output");
        entry.evidence_refs = {
            "/ops/api/live-operations/simulation/export-bundle",
            "/ops/api/live-operations/simulation/safe-apply-readiness",
        };
        entries.push_back(std::move(entry));
    }
    return entries;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27143 function
OpsV360SimulationExportBundleSummary BuildV360SimulationExportBundleSummary(
    const std::vector<OpsV360SimulationExportBundleItem>& items,
    const std::vector<OpsV360SimulationHandoffMapEntry>& handoffEntries) {
    OpsV360SimulationExportBundleSummary summary;
    summary.bundle_item_count = static_cast<int>(items.size());
    summary.handoff_entry_count = static_cast<int>(handoffEntries.size());
    for (const auto& item : items) {
        summary.simulation_input_ref_count += static_cast<int>(item.simulation_input_refs.size());
        summary.simulation_output_ref_count += static_cast<int>(item.simulation_output_refs.size());
        summary.readiness_blocker_ref_count +=
            static_cast<int>(item.readiness_blocker_refs.size());
        summary.evidence_ref_count += static_cast<int>(item.evidence_refs.size());
    }
    for (const auto& entry : handoffEntries) {
        summary.evidence_ref_count += static_cast<int>(entry.evidence_refs.size());
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27162 function
void AppendV360SimulationExportBundleSummaryJson(
    std::ostringstream& out,
    const OpsV360SimulationExportBundleSummary& summary) {
    out << "{"
        << "\"bundleItemCount\":" << summary.bundle_item_count << ","
        << "\"handoffEntryCount\":" << summary.handoff_entry_count << ","
        << "\"simulationInputRefCount\":" << summary.simulation_input_ref_count << ","
        << "\"simulationOutputRefCount\":" << summary.simulation_output_ref_count << ","
        << "\"readinessBlockerRefCount\":" << summary.readiness_blocker_ref_count << ","
        << "\"evidenceRefCount\":" << summary.evidence_ref_count
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27175 function
void AppendV360SimulationExportBundleItemJson(
    std::ostringstream& out,
    const OpsV360SimulationExportBundleItem& item) {
    out << "{"
        << "\"bundleItemId\":\"" << JsonEscape(item.bundle_item_id) << "\","
        << "\"bundleSection\":\"" << JsonEscape(item.bundle_section) << "\","
        << "\"summary\":\"" << JsonEscape(item.summary) << "\","
        << "\"simulationInputRefs\":";
    AppendV340RecoveryCandidateStringListJson(out, item.simulation_input_refs);
    out << ",\"simulationOutputRefs\":";
    AppendV340RecoveryCandidateStringListJson(out, item.simulation_output_refs);
    out << ",\"readinessBlockerRefs\":";
    AppendV340RecoveryCandidateStringListJson(out, item.readiness_blocker_refs);
    out << ",\"handoffMapRefs\":";
    AppendV340RecoveryCandidateStringListJson(out, item.handoff_map_refs);
    out << ",\"evidenceRefs\":";
    AppendV340RecoveryCandidateStringListJson(out, item.evidence_refs);
    out << ",\"redactionPolicy\":\"" << JsonEscape(item.redaction_policy) << "\","
        << "\"releaseSafe\":" << (item.release_safe ? "true" : "false") << ","
        << "\"readOnly\":" << (item.read_only ? "true" : "false")
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27198 function
void AppendV360SimulationHandoffMapEntryJson(
    std::ostringstream& out,
    const OpsV360SimulationHandoffMapEntry& entry) {
    out << "{"
        << "\"handoffId\":\"" << JsonEscape(entry.handoff_id) << "\","
        << "\"candidateId\":\"" << JsonEscape(entry.candidate_id) << "\","
        << "\"handoffStatus\":\"" << JsonEscape(entry.handoff_status) << "\","
        << "\"nextOperatorRole\":\"" << JsonEscape(entry.next_operator_role) << "\","
        << "\"blockedReason\":\"" << JsonEscape(entry.blocked_reason) << "\","
        << "\"bundleItemRefs\":";
    AppendV340RecoveryCandidateStringListJson(out, entry.bundle_item_refs);
    out << ",\"evidenceRefs\":";
    AppendV340RecoveryCandidateStringListJson(out, entry.evidence_refs);
    out << ",\"releaseSafe\":" << (entry.release_safe ? "true" : "false") << ","
        << "\"readOnly\":" << (entry.read_only ? "true" : "false")
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27216 function
std::string OpsV360SimulationExportBundleJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v360-simulation-export-bundle.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans = BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto inputPackItems =
        BuildV360SimulationInputPackItems(context, commandPlanCandidates, stagedChangePlans);
    const auto inputSummary = BuildV360SimulationInputPackSummary(inputPackItems);
    const auto simulationRunContract = BuildV360SimulationRunContract();
    const auto simulationResultEnvelope = BuildV360SimulationResultEnvelope(inputSummary);
    const auto dryRunResults = BuildV360CommandPlanDryRunResults(commandPlanCandidates);
    const auto impactDiffs =
        BuildV360SourceRuleImpactDiffs(context, commandPlanCandidates, stagedChangePlans);
    const auto readinessItems = BuildV360SafeApplyReadinessItems(dryRunResults, impactDiffs);
    const auto ledgerEntries =
        BuildV360SimulationRunLedgerEntries(context,
                                            inputPackItems,
                                            simulationRunContract,
                                            simulationResultEnvelope,
                                            dryRunResults,
                                            impactDiffs,
                                            readinessItems);
    const auto whatIfCandidates =
        BuildV360RuleVaWhatIfReplayCandidates(context, dryRunResults, impactDiffs);
    const auto noticePreviewItems =
        BuildV360ClientNoticePreviewItems(dryRunResults, impactDiffs, readinessItems);
    const auto bundleItems =
        BuildV360SimulationExportBundleItems(inputPackItems,
                                             simulationRunContract,
                                             simulationResultEnvelope,
                                             ledgerEntries,
                                             dryRunResults,
                                             impactDiffs,
                                             readinessItems,
                                             whatIfCandidates,
                                             noticePreviewItems);
    const auto handoffEntries =
        BuildV360SimulationHandoffMapEntries(readinessItems, bundleItems);
    const auto summary = BuildV360SimulationExportBundleSummary(bundleItems, handoffEntries);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v360-simulation-export-bundle.v1\","
        << "\"status\":\"simulation-export-bundle\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"inputPackRoute\":\"/ops/api/live-operations/simulation/input-pack\","
        << "\"runLedgerRoute\":\"/ops/api/live-operations/simulation/run-ledger\","
        << "\"readinessRoute\":\"/ops/api/live-operations/simulation/safe-apply-readiness\","
        << "\"whatIfReplayRoute\":\"/ops/api/live-operations/simulation/rule-va-what-if-replay-pack\","
        << "\"simulationExportBundle\":{"
        << "\"redactedReleaseSafeExportBundle\":true,"
        << "\"releaseSafe\":true,"
        << "\"redacted\":true,"
        << "\"artifactMode\":\"projection-only\","
        << "\"redactionPolicy\":\"redacted-release-safe\""
        << "},\"simulationExportBundleSummary\":";
    AppendV360SimulationExportBundleSummaryJson(out, summary);
    out << ",\"simulationExportBundleItems\":[";
    for (std::size_t i = 0; i < bundleItems.size(); ++i) {
        if (i != 0) out << ",";
        AppendV360SimulationExportBundleItemJson(out, bundleItems[i]);
    }
    out << "],\"simulationHandoffMapEntries\":[";
    for (std::size_t i = 0; i < handoffEntries.size(); ++i) {
        if (i != 0) out << ",";
        AppendV360SimulationHandoffMapEntryJson(out, handoffEntries[i]);
    }
    out << "],\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"releaseSafe\":true,"
        << "\"redacted\":true,"
        << "\"artifactExportExecuted\":false,"
        << "\"bundlePersisted\":false,"
        << "\"fileWritePerformed\":false,"
        << "\"handoffWritePerformed\":false,"
        << "\"simulationRunPersisted\":false,"
        << "\"simulationRunExecuted\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"rawProviderResponseIncluded\":false,"
        << "\"rawDiagnosticJsonIncluded\":false,"
        << "\"clientViewerRawMaterialIncluded\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27354 function
std::string V360FieldEvidenceSimulationReadinessRef(
    const OpsV350FieldEvidenceIntakeRecord& record,
    const std::vector<OpsV360SafeApplyReadinessItem>& readinessItems) {
    for (const auto& readiness : readinessItems) {
        if (readiness.field_evidence_required) {
            return readiness.readiness_id + ":" + record.bridge_kind;
        }
    }
    return "simulationReadinessBlockerRef:" + record.bridge_kind + ":conditional-not-run";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27365 function
std::vector<OpsV360FieldEvidenceSimulationAdapterItem>
BuildV360FieldEvidenceSimulationAdapterItems(
    const std::vector<OpsV350FieldEvidenceIntakeRecord>& fieldEvidenceIntakeRecords,
    const std::vector<OpsV350FieldEvidenceExecutionCondition>& fieldEvidenceExecutionConditions,
    const std::vector<OpsV360SafeApplyReadinessItem>& readinessItems) {
    std::vector<OpsV360FieldEvidenceSimulationAdapterItem> items;
    for (const auto& record : fieldEvidenceIntakeRecords) {
        OpsV360FieldEvidenceSimulationAdapterItem item;
        item.adapter_id = "field-evidence-adapter:" + record.bridge_kind;
        item.bridge_kind = record.bridge_kind;
        item.label = record.label;
        item.conditional_not_run_evidence =
            "conditional-not-run evidence for " + record.bridge_kind;
        if (record.bridge_kind == "onvif-real-device") {
            item.conditional_not_run_evidence =
                "ONVIF conditional-not-run evidence; no device contacted";
        } else if (record.bridge_kind == "external-whep-turn") {
            item.conditional_not_run_evidence =
                "external WHEP/TURN conditional-not-run evidence; no endpoint contacted";
        } else if (record.bridge_kind == "real-cloud-vlm-provider") {
            item.conditional_not_run_evidence =
                "cloud/VLM provider conditional-not-run evidence; no provider call";
        }
        item.execution_status = record.execution_status;
        item.field_smoke_status = record.field_smoke_status;
        item.not_run_reason = record.not_run_reason;
        item.redacted_field_evidence = record.redacted_field_evidence;
        item.simulation_input_ref =
            "/ops/api/live-operations/simulation/input-pack:fieldEvidenceAdapter:" +
            record.bridge_kind;
        item.simulation_readiness_blocker_ref =
            V360FieldEvidenceSimulationReadinessRef(record, readinessItems);
        item.endpoint_required = record.endpoint_required;
        item.credential_required = record.credential_required;
        item.operator_approval_required = record.operator_approval_required;
        for (const auto& condition : fieldEvidenceExecutionConditions) {
            if (condition.evidence_id == record.evidence_id) {
                item.condition_refs.push_back(condition.condition_id);
            }
        }
        item.evidence_refs = record.evidence_refs;
        item.evidence_refs.push_back("/ops/api/live-operations/simulation/safe-apply-readiness");
        item.evidence_refs.push_back("/ops/api/live-operations/simulation/export-bundle");
        items.push_back(std::move(item));
    }
    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27413 function
OpsV360FieldEvidenceSimulationAdapterSummary
BuildV360FieldEvidenceSimulationAdapterSummary(
    const std::vector<OpsV360FieldEvidenceSimulationAdapterItem>& items) {
    OpsV360FieldEvidenceSimulationAdapterSummary summary;
    summary.adapter_count = static_cast<int>(items.size());
    for (const auto& item : items) {
        if (item.bridge_kind == "onvif-real-device") {
            ++summary.onvif_condition_count;
        } else if (item.bridge_kind == "external-whep-turn") {
            ++summary.external_whep_turn_condition_count;
        } else if (item.bridge_kind == "real-cloud-vlm-provider") {
            ++summary.cloud_vlm_provider_condition_count;
        }
        if (item.execution_status == "not-run") {
            ++summary.not_run_count;
        }
        if (item.endpoint_required) {
            ++summary.endpoint_required_count;
        }
        if (item.credential_required) {
            ++summary.credential_required_count;
        }
        if (item.operator_approval_required) {
            ++summary.approval_required_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27442 function
void AppendV360FieldEvidenceSimulationAdapterSummaryJson(
    std::ostringstream& out,
    const OpsV360FieldEvidenceSimulationAdapterSummary& summary) {
    out << "{"
        << "\"adapterCount\":" << summary.adapter_count << ","
        << "\"onvifConditionCount\":" << summary.onvif_condition_count << ","
        << "\"externalWhepTurnConditionCount\":"
        << summary.external_whep_turn_condition_count << ","
        << "\"cloudVlmProviderConditionCount\":"
        << summary.cloud_vlm_provider_condition_count << ","
        << "\"notRunCount\":" << summary.not_run_count << ","
        << "\"endpointRequiredCount\":" << summary.endpoint_required_count << ","
        << "\"credentialRequiredCount\":" << summary.credential_required_count << ","
        << "\"approvalRequiredCount\":" << summary.approval_required_count
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27459 function
void AppendV360FieldEvidenceSimulationAdapterItemJson(
    std::ostringstream& out,
    const OpsV360FieldEvidenceSimulationAdapterItem& item) {
    out << "{"
        << "\"adapterId\":\"" << JsonEscape(item.adapter_id) << "\","
        << "\"bridgeKind\":\"" << JsonEscape(item.bridge_kind) << "\","
        << "\"label\":\"" << JsonEscape(item.label) << "\","
        << "\"fieldEvidenceAdapter\":\"" << JsonEscape(item.adapter_type) << "\","
        << "\"conditionalNotRunEvidence\":\""
        << JsonEscape(item.conditional_not_run_evidence) << "\","
        << "\"executionStatus\":\"" << JsonEscape(item.execution_status) << "\","
        << "\"fieldSmokeStatus\":\"" << JsonEscape(item.field_smoke_status) << "\","
        << "\"notRunReason\":\"" << JsonEscape(item.not_run_reason) << "\","
        << "\"redactedFieldEvidence\":\""
        << JsonEscape(item.redacted_field_evidence) << "\","
        << "\"simulationInputRef\":\"" << JsonEscape(item.simulation_input_ref) << "\","
        << "\"simulationReadinessBlockerRef\":\""
        << JsonEscape(item.simulation_readiness_blocker_ref) << "\","
        << "\"endpointRequired\":" << (item.endpoint_required ? "true" : "false") << ","
        << "\"credentialRequired\":" << (item.credential_required ? "true" : "false") << ","
        << "\"operatorApprovalRequired\":"
        << (item.operator_approval_required ? "true" : "false") << ","
        << "\"readOnly\":" << (item.read_only ? "true" : "false") << ","
        << "\"conditionRefs\":";
    AppendV340RecoveryCandidateStringListJson(out, item.condition_refs);
    out << ",\"evidenceRefs\":";
    AppendV340RecoveryCandidateStringListJson(out, item.evidence_refs);
    out << ",\"rawEndpointIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"rawTurnCredentialsIncluded\":false,"
        << "\"rawVlmPromptIncluded\":false,"
        << "\"rawProviderResponseIncluded\":false,"
        << "\"clientViewerMaterialIncluded\":false"
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27495 function
std::string OpsV360FieldEvidenceSimulationAdapterJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v360-field-evidence-simulation-adapter.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans = BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto dryRunResults = BuildV360CommandPlanDryRunResults(commandPlanCandidates);
    const auto impactDiffs =
        BuildV360SourceRuleImpactDiffs(context, commandPlanCandidates, stagedChangePlans);
    const auto readinessItems = BuildV360SafeApplyReadinessItems(dryRunResults, impactDiffs);
    const auto fieldBridgeConditionGates = BuildV340FieldBridgeConditionGates();
    const auto fieldEvidenceIntakeRecords =
        BuildV350FieldEvidenceIntakeRecords(fieldBridgeConditionGates);
    const auto fieldEvidenceExecutionConditions =
        BuildV350FieldEvidenceExecutionConditions(fieldEvidenceIntakeRecords);
    const auto adapterItems =
        BuildV360FieldEvidenceSimulationAdapterItems(fieldEvidenceIntakeRecords,
                                                     fieldEvidenceExecutionConditions,
                                                     readinessItems);
    const auto summary = BuildV360FieldEvidenceSimulationAdapterSummary(adapterItems);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v360-field-evidence-simulation-adapter.v1\","
        << "\"status\":\"field-evidence-simulation-adapter\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"fieldBridgeConditionGateRoute\":\"/ops/api/source-registry/field-bridge-condition-gates\","
        << "\"simulationReadinessRoute\":\"/ops/api/live-operations/simulation/safe-apply-readiness\","
        << "\"simulationExportBundleRoute\":\"/ops/api/live-operations/simulation/export-bundle\","
        << "\"fieldEvidenceSimulationAdapterSummary\":";
    AppendV360FieldEvidenceSimulationAdapterSummaryJson(out, summary);
    out << ",\"simulationAdapterConditions\":[";
    for (std::size_t i = 0; i < fieldEvidenceExecutionConditions.size(); ++i) {
        if (i != 0) out << ",";
        AppendV350FieldEvidenceExecutionConditionJson(out, fieldEvidenceExecutionConditions[i]);
    }
    out << "],\"fieldEvidenceSimulationAdapters\":[";
    for (std::size_t i = 0; i < adapterItems.size(); ++i) {
        if (i != 0) out << ",";
        AppendV360FieldEvidenceSimulationAdapterItemJson(out, adapterItems[i]);
    }
    out << "],\"adapterPolicy\":{"
        << "\"fieldEvidenceAdapter\":\"simulation-only\","
        << "\"conditionalNotRunEvidence\":true,"
        << "\"ONVIF\":\"conditional-not-run\","
        << "\"externalWhepTurn\":\"conditional-not-run\","
        << "\"cloudVlmProvider\":\"conditional-not-run\","
        << "\"fieldExecution\":\"not-run\","
        << "\"rawMaterial\":\"redacted\""
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"conditionalNotRunEvidence\":true,"
        << "\"fieldEvidencePersisted\":false,"
        << "\"fieldEvidenceWritePerformed\":false,"
        << "\"fieldSmokeExecuted\":false,"
        << "\"endpointProbePerformed\":false,"
        << "\"credentialProbePerformed\":false,"
        << "\"onvifDeviceContacted\":false,"
        << "\"externalWhepTurnContacted\":false,"
        << "\"cloudProviderContacted\":false,"
        << "\"vlmProviderCalled\":false,"
        << "\"simulationRunExecuted\":false,"
        << "\"simulationRunPersisted\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"artifactExportExecuted\":false,"
        << "\"rawEndpointIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"rawTurnCredentialsIncluded\":false,"
        << "\"rawVlmPromptIncluded\":false,"
        << "\"rawProviderResponseIncluded\":false,"
        << "\"clientViewerMaterialIncluded\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27610 function
std::vector<OpsV360VlmAssistedSimulationExplanationItem>
BuildV360VlmAssistedSimulationExplanationItems(
    const std::vector<OpsV360CommandPlanDryRunResult>& dryRunResults,
    const std::vector<OpsV360SourceRuleImpactDiff>& impactDiffs,
    const std::vector<OpsV360SafeApplyReadinessItem>& readinessItems,
    const std::vector<OpsV360FieldEvidenceSimulationAdapterItem>& fieldEvidenceAdapters) {
    std::vector<std::string> blockers;
    for (const auto& readiness : readinessItems) {
        blockers.insert(blockers.end(), readiness.blockers.begin(), readiness.blockers.end());
    }
    for (const auto& result : dryRunResults) {
        blockers.insert(blockers.end(), result.blockers.begin(), result.blockers.end());
    }

    const OpsV360SourceRuleImpactDiff* first_diff =
        impactDiffs.empty() ? nullptr : &impactDiffs.front();
    const std::string source_id =
        first_diff == nullptr || first_diff->source_id.empty() ? "simulation" : first_diff->source_id;
    const std::string blocker_text =
        blockers.empty() ? "no simulation-blocker currently projected"
                         : JoinV340ApprovalRecoveryStrings(blockers, ", ");
    const std::string impact_text =
        first_diff == nullptr
            ? "impact diff pending from BuildV360SourceRuleImpactDiffs"
            : first_diff->source_health_diff + "; " + first_diff->event_risk_diff + "; " +
                  first_diff->client_impact_diff;

    std::vector<OpsV360VlmAssistedSimulationExplanationItem> items;
    OpsV360VlmAssistedSimulationExplanationItem blocker_item;
    blocker_item.explanation_id = "vlm-simulation-explanation:simulation-blocker";
    blocker_item.explanation_type = "simulation-blocker";
    blocker_item.title = "Simulation Blocker Summary";
    blocker_item.source_id = source_id;
    blocker_item.simulation_blocker_summary =
        "simulation-blocker summary from BuildV360SafeApplyReadinessItems and BuildV360CommandPlanDryRunResults: " +
        blocker_text;
    blocker_item.impact_diff_summary =
        "impactDiffSummary remains deterministic and default-off for simulation-blocker review.";
    blocker_item.operator_review_hint =
        "operator review hint: review readiness blockers and dry-run blockers before any opt-in VLM assistance.";
    blocker_item.evidence_refs = {
        "/ops/api/live-operations/simulation/command-plan-dry-run",
        "/ops/api/live-operations/simulation/safe-apply-readiness",
    };
    items.push_back(std::move(blocker_item));

    OpsV360VlmAssistedSimulationExplanationItem impact_item;
    impact_item.explanation_id = "vlm-simulation-explanation:simulation-impact-diff";
    impact_item.explanation_type = "simulation-impact-diff";
    impact_item.title = "Simulation Impact Diff Summary";
    impact_item.source_id = source_id;
    impact_item.simulation_blocker_summary =
        "simulationBlockerSummary references " + std::to_string(blockers.size()) +
        " blocker signals without executing simulation.";
    impact_item.impact_diff_summary =
        "simulation-impact-diff summary from BuildV360SourceRuleImpactDiffs: " + impact_text;
    impact_item.operator_review_hint =
        "operator review hint: compare source health, event risk, and viewer-safe client impact diff before promotion.";
    impact_item.evidence_refs = {
        "/ops/api/live-operations/simulation/impact-diff",
        first_diff == nullptr ? "impact-diff:pending" : first_diff->diff_id,
    };
    items.push_back(std::move(impact_item));

    OpsV360VlmAssistedSimulationExplanationItem review_item;
    review_item.explanation_id = "vlm-simulation-explanation:operator-review-hint";
    review_item.explanation_type = "operator-review-hint";
    review_item.title = "Operator Review Hint";
    review_item.source_id = source_id;
    review_item.simulation_blocker_summary =
        "simulationBlockerSummary combines readiness and field evidence adapter not-run context.";
    review_item.impact_diff_summary =
        "impactDiffSummary is redacted release-safe and built from simulation read models only.";
    review_item.operator_review_hint =
        "operator review hint: VLM assistance is default-off; provider/runtime call is opt-in only and no operator review write is performed.";
    review_item.evidence_refs = {
        "/ops/api/live-operations/simulation/field-evidence-adapter",
        "/ops/api/live-operations/simulation/export-bundle",
        "fieldEvidenceAdapterCount:" + std::to_string(fieldEvidenceAdapters.size()),
    };
    items.push_back(std::move(review_item));

    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27695 function
OpsV360VlmAssistedSimulationExplanationSummary
BuildV360VlmAssistedSimulationExplanationSummary(
    const std::vector<OpsV360VlmAssistedSimulationExplanationItem>& items) {
    OpsV360VlmAssistedSimulationExplanationSummary summary;
    summary.explanation_count = static_cast<int>(items.size());
    for (const auto& item : items) {
        if (item.explanation_type == "simulation-blocker") {
            ++summary.blocker_summary_count;
        } else if (item.explanation_type == "simulation-impact-diff") {
            ++summary.impact_diff_summary_count;
        } else if (item.explanation_type == "operator-review-hint") {
            ++summary.operator_review_hint_count;
        }
        if (item.default_off && !item.default_enabled) {
            ++summary.default_off_count;
        }
        if (item.vlm_provider_call_performed || item.vlm_runtime_call_performed) {
            ++summary.provider_call_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27718 function
void AppendV360VlmAssistedSimulationExplanationItemJson(
    std::ostringstream& out,
    const OpsV360VlmAssistedSimulationExplanationItem& item) {
    out << "{"
        << "\"explanationId\":\"" << JsonEscape(item.explanation_id) << "\","
        << "\"explanationType\":\"" << JsonEscape(item.explanation_type) << "\","
        << "\"title\":\"" << JsonEscape(item.title) << "\","
        << "\"sourceId\":\"" << JsonEscape(item.source_id) << "\","
        << "\"simulationBlockerSummary\":\""
        << JsonEscape(item.simulation_blocker_summary) << "\","
        << "\"impactDiffSummary\":\"" << JsonEscape(item.impact_diff_summary) << "\","
        << "\"operatorReviewHint\":\"" << JsonEscape(item.operator_review_hint) << "\","
        << "\"defaultEnabled\":" << (item.default_enabled ? "true" : "false") << ","
        << "\"defaultOff\":" << (item.default_off ? "true" : "false") << ","
        << "\"runtimeOptInRequired\":"
        << (item.runtime_opt_in_required ? "true" : "false") << ","
        << "\"vlmProviderCallPerformed\":"
        << (item.vlm_provider_call_performed ? "true" : "false") << ","
        << "\"vlmRuntimeCallPerformed\":"
        << (item.vlm_runtime_call_performed ? "true" : "false") << ","
        << "\"rawVlmPromptIncluded\":false,"
        << "\"rawProviderResponseIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"evidenceRefs\":";
    AppendV340RecoveryCandidateStringListJson(out, item.evidence_refs);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27746 function
void AppendV360VlmAssistedSimulationExplanationSummaryJson(
    std::ostringstream& out,
    const OpsV360VlmAssistedSimulationExplanationSummary& summary) {
    out << "{"
        << "\"explanationCount\":" << summary.explanation_count << ","
        << "\"blockerSummaryCount\":" << summary.blocker_summary_count << ","
        << "\"impactDiffSummaryCount\":" << summary.impact_diff_summary_count << ","
        << "\"operatorReviewHintCount\":" << summary.operator_review_hint_count << ","
        << "\"defaultOffCount\":" << summary.default_off_count << ","
        << "\"providerCallCount\":" << summary.provider_call_count
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27759 function
std::string OpsV360VlmAssistedSimulationExplanationJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    const auto context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    if (!context.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v360-vlm-assisted-simulation-explanation.v1\",\"error\":\"" +
               JsonEscape(context.error) + "\"}";
    }
    const auto commandPlanCandidates = BuildV350CommandPlanCandidates(context);
    const auto stagedChangePlans = BuildV350StagedChangePlans(context, commandPlanCandidates);
    const auto dryRunResults = BuildV360CommandPlanDryRunResults(commandPlanCandidates);
    const auto impactDiffs =
        BuildV360SourceRuleImpactDiffs(context, commandPlanCandidates, stagedChangePlans);
    const auto readinessItems = BuildV360SafeApplyReadinessItems(dryRunResults, impactDiffs);
    const auto fieldBridgeConditionGates = BuildV340FieldBridgeConditionGates();
    const auto fieldEvidenceIntakeRecords =
        BuildV350FieldEvidenceIntakeRecords(fieldBridgeConditionGates);
    const auto fieldEvidenceExecutionConditions =
        BuildV350FieldEvidenceExecutionConditions(fieldEvidenceIntakeRecords);
    const auto fieldEvidenceAdapterItems =
        BuildV360FieldEvidenceSimulationAdapterItems(fieldEvidenceIntakeRecords,
                                                     fieldEvidenceExecutionConditions,
                                                     readinessItems);
    const auto explanations = BuildV360VlmAssistedSimulationExplanationItems(
        dryRunResults, impactDiffs, readinessItems, fieldEvidenceAdapterItems);
    const auto summary = BuildV360VlmAssistedSimulationExplanationSummary(explanations);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v360-vlm-assisted-simulation-explanation.v1\","
        << "\"status\":\"vlm-assisted-simulation-explanation\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"commandPlanDryRunRoute\":\"/ops/api/live-operations/simulation/command-plan-dry-run\","
        << "\"impactDiffRoute\":\"/ops/api/live-operations/simulation/impact-diff\","
        << "\"readinessRoute\":\"/ops/api/live-operations/simulation/safe-apply-readiness\","
        << "\"fieldEvidenceSimulationAdapterRoute\":\"/ops/api/live-operations/simulation/field-evidence-adapter\","
        << "\"defaultOff\":true,"
        << "\"defaultEnabled\":false,"
        << "\"runtimeOptInRequired\":true,"
        << "\"vlmAssistedSimulationExplanationSummary\":";
    AppendV360VlmAssistedSimulationExplanationSummaryJson(out, summary);
    out << ",\"vlmAssistedSimulationExplanations\":[";
    for (std::size_t i = 0; i < explanations.size(); ++i) {
        if (i != 0) out << ",";
        AppendV360VlmAssistedSimulationExplanationItemJson(out, explanations[i]);
    }
    out << "],\"vlmPolicy\":{"
        << "\"defaultOff\":true,"
        << "\"defaultEnabled\":false,"
        << "\"runtimeOptInRequired\":true,"
        << "\"summaryMode\":\"deterministic-simulation-read-model\","
        << "\"simulationBlockerSummary\":\"readiness and dry-run blockers only\","
        << "\"impactDiffSummary\":\"source/rule/client impact diff only\","
        << "\"operatorReviewHint\":\"operator review hint only; no automatic action\""
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"defaultOff\":true,"
        << "\"defaultEnabled\":false,"
        << "\"runtimeOptInRequired\":true,"
        << "\"vlmProviderCallPerformed\":false,"
        << "\"vlmRuntimeCallPerformed\":false,"
        << "\"rawVlmPromptIncluded\":false,"
        << "\"rawProviderResponseIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"simulationRunExecuted\":false,"
        << "\"simulationRunPersisted\":false,"
        << "\"fieldSmokeExecuted\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"operatorReviewWritePerformed\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}

}  // namespace webrtc_http_server_detail

}  // namespace ingress
