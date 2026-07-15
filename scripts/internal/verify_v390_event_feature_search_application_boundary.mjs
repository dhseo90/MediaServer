#!/usr/bin/env node
// REVIEW4-64 Slice 27: Event Feature/Search Index and DSL behind an application boundary.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const args = process.argv.slice(2);
if (hasHelpFlag(args)) printUsageAndExit(`V390 Event Feature Search application boundary verification

Usage:
  ./server.sh verify-v390-event-feature-search-application-boundary
`);
assertKnownOptions(args, ["h", "help"]);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const headerPath = "include/ingress/event_feature_search_application_service.h";
const sourcePath = "src/ingress/event_feature_search_application_service.cpp";
const detailPath = "src/ingress/webrtc_http_server_detail.h";
const incidentsPath = "src/ingress/webrtc_http_server_ops_incidents.cpp";
const transportPaths = [
  "include/ingress/http_auth.h", "include/ingress/webrtc_http_runtime_config.h",
  "src/ingress/http_auth.cpp", "include/ingress/webrtc_http_server.h",
  "src/ingress/webrtc_http_server.cpp", "src/ingress/webrtc_http_server_ops_foundation.cpp",
  "src/ingress/webrtc_http_server_ops_workflows.cpp", incidentsPath,
  "src/ingress/webrtc_http_server_runtime.cpp", detailPath,
  "include/ingress/webrtc_http_analysis_rule_declarations.h",
];
const checks = [];
function assert(value, message) { if (!value) throw new Error(message); }
function check(name, fn) { try { fn(); checks.push({name,status:"PASS"}); } catch (error) { checks.push({name,status:"FAIL",detail:error.message}); } }
function exactCount(text, pattern) { return (text.match(pattern) || []).length; }
function compact(text) { return text.replace(/\/\/[^\n]*/g, "").replace(/\s+/g, " ").trim(); }
function functionBody(text, name) {
  const match = new RegExp(`\\b${name}\\s*\\([^)]*\\)\\s*\\{`, "s").exec(text);
  assert(match, `function body missing: ${name}`);
  const open = text.indexOf("{", match.index); let depth = 0;
  for (let index = open; index < text.length; ++index) {
    if (text[index] === "{") ++depth;
    if (text[index] === "}" && --depth === 0) return text.slice(open + 1, index);
  }
  throw new Error(`unterminated function: ${name}`);
}
function ordered(text, tokens) {
  let cursor = 0;
  for (const token of tokens) {
    const index = text.indexOf(token, cursor);
    if (index < 0) return false;
    cursor = index + token.length;
  }
  return true;
}
function exactFragment(text, fragment, label) {
  assert(exactCount(compact(text), new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) === 1,
    `${label} exact fragment drift: ${fragment}`);
}
function replaceExact(text, before, after, label) {
  assert(exactCount(text, new RegExp(before.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) === 1,
    `${label} mutation anchor drift: ${before}`);
  return text.replace(before, after);
}
function assertRejected(label, fn) {
  let rejected = false;
  try { fn(); } catch { rejected = true; }
  assert(rejected, `${label} mutation produced false PASS`);
}
function assertBooleanAssignment(body, target, expected) {
  const writes = [...body.matchAll(new RegExp(`\\b${target.replaceAll(".", "\\.")}\\s*=\\s*(true|false)\\s*;`, "g"))];
  assert(writes.length === 1 && writes[0][1] === expected,
    `unsafe boolean write drift: ${target} expected=${expected} writes=${writes.map(item => item[1]).join(",")}`);
}

const safeBooleanAssignments = [
  ["event.event_post_payload_changed", "false"], ["event.webrtc_data_channel_schema_changed", "false"],
  ["event.sse_ws_metadata_schema_changed", "false"], ["event.rtsp_webrtc_media_path_changed", "false"],
  ["event.viewer_client_exposure_added", "false"], ["feature.searchable", "true"],
  ["feature.identity_feature", "false"], ["feature.raw_prompt_fragment_stored", "false"],
  ["feature.raw_provider_response_fragment_stored", "false"], ["feature_set.raw_prompt_stored", "false"],
  ["feature_set.raw_provider_response_stored", "false"], ["feature_set.provider_request_body_stored", "false"],
  ["feature_set.credential_stored", "false"], ["feature_set.source_url_stored", "false"],
  ["feature_set.raw_frame_bytes_stored", "false"], ["feature_set.identity_features_allowed", "false"],
  ["evidence.raw_prompt_stored", "false"], ["evidence.raw_provider_response_stored", "false"],
  ["evidence.identity_features_allowed", "false"], ["evidence.archive_api", "false"],
];

function assertApplicationSourceContract(source) {
  assert(source.includes('#include "analysis/event_feature_search_index.h"'), "canonical owner include missing");
  assert(exactCount(source, /analysis::EventFeatureSearchIndex\s+index\s*;/g) === 1 &&
    exactCount(source, /index\.Rebuild\(input\)/g) === 1 &&
    exactCount(source, /analysis::ConvertEventSearchQueryToDsl\(/g) === 1 &&
    exactCount(source, /index\.Search\(dsl\)/g) === 1,
  "canonical rebuild/DSL/search ownership drift");
  assert(ordered(source, [
    "analysis::EventFeatureSearchIndex index", "index.Rebuild(input)", "BuildSearchDsl(query)",
    "dsl.valid ? index.Search(dsl)", "output.search_dsl_valid", "output.hits.push_back(ProjectEntry(hit))",
  ]), "canonical execution order drift");
  const searchBody = functionBody(source, "SearchEventFeaturesForApplication");
  for (const [target, expected] of safeBooleanAssignments) assertBooleanAssignment(searchBody, target, expected);
  for (const fragment of [
    "event.event_id = record.event_id", "event.source_id = record.source_id",
    "event.channel_id = record.channel_id", "event.event_type = record.event_type",
    "event.scenario = record.scenario", "event.status = record.status",
    "event.zone_id = record.zone_id", "event.line_id = record.line_id",
    "event.class_name = record.class_name", "event.timestamp_ms = record.timestamp_ms",
    "feature_set.event_id = record.event_id", "feature_set.feature_set_id = record.feature_set_id",
    "feature_set.feature_revision = record.feature_revision", "feature.namespace_name = source.namespace_name",
    "feature.name = source.name", "feature.value = source.value", "feature.evidence_ref = source.evidence_ref",
    "evidence.event_id = record.event_id", "evidence.manifest_path = record.manifest_path",
    "evidence.event_frame_present = record.event_frame_present",
    "evidence.representative_image_present = record.representative_image_present",
    "evidence.bbox_crop_count = record.bbox_crop_count", "evidence.frame_bundle_present = record.frame_bundle_present",
    "review.event_id = record.event_id", "review.review_state = record.review_state",
    "review.classification = record.classification", "review.incident_status = record.incident_status",
    "review.pinned = record.pinned",
  ]) exactFragment(searchBody, fragment, "canonical input mapping");
  const projectBody = functionBody(source, "ProjectEntry");
  for (const fragment of [
    "output.event_id = source.event_id", "output.feature_revision = source.feature_revision",
    "output.has_event_record = source.has_event_record", "output.has_feature_set = source.has_feature_set",
    "output.has_evidence_manifest = source.has_evidence_manifest", "output.has_review_state = source.has_review_state",
    "output.document.event_id = source.document.event_id", "output.document.source_id = source.document.source_id",
    "output.document.channel_id = source.document.channel_id", "output.document.event_type = source.document.event_type",
    "output.document.scenario = source.document.scenario", "output.document.status = source.document.status",
    "output.document.zone_id = source.document.zone_id", "output.document.line_id = source.document.line_id",
    "output.document.class_name = source.document.class_name",
    "output.document.review_state = source.document.review_state",
    "output.document.timestamp_ms = source.document.timestamp_ms", "output.document.pinned = source.document.pinned",
    "output.document.features.push_back({feature.field, feature.value})",
    "output.evidence_refs = source.evidence_refs",
  ]) exactFragment(projectBody, fragment, "application output mapping");
  const dslBody = functionBody(source, "BuildSearchDsl");
  for (const fragment of [
    "options.default_limit = query.default_limit", "options.max_limit = query.max_limit",
    "options.max_offset = query.max_offset", "analysis::ConvertEventSearchQueryToDsl(query.query, options)",
    "dsl.limit = *query.forced_limit", "dsl.offset = *query.forced_offset",
    "dsl.limit = ParseRequestedSize(query.requested_limit, dsl.limit, 1, query.max_limit)",
    "dsl.offset = ParseRequestedSize(query.requested_offset, dsl.offset, 0, query.max_offset)",
    "dsl.search_index_required = query.search_index_required",
    "dsl.ops_events_ui_required = query.ops_events_ui_required",
    'dsl.filters.push_back({"pinned", "eq", "true"})',
  ]) exactFragment(dslBody, fragment, "query resolution mapping");
  assert(ordered(dslBody, ["ConvertEventSearchQueryToDsl", "forced_limit", "forced_offset",
    "requested_limit", "requested_offset", "search_index_required", "ops_events_ui_required", "pinned_only"]),
  "query precedence drift");
}

function assertTransportContract(incidents) {
  const ops = functionBody(incidents, "OpsV300EventEvidenceSearchUiJson");
  for (const fragment of [
    'OpsV300EventEvidenceSearchQueryValue(query, "v300Q", "q")',
    "search.default_limit = 12", "search.max_limit = 24", "search.forced_limit = 12",
    "search.pinned_only = pinned_only", "search.search_index_required = true",
    "search.ops_events_ui_required = true", "SearchEventFeaturesForApplication(records, search)",
    '"\\\"searchDslValid\\\":" << (search_result.search_dsl_valid ? "true" : "false")',
    '"\\\"rejectionReason\\\":\\\"" << JsonEscape(search_result.rejection_reason)',
    '"\\\"generation\\\":" << search_result.generation',
    '"\\\"indexedEntries\\\":" << search_result.indexed_entries',
  ]) exactFragment(ops, fragment, "Ops transport contract");
  const opsEnvelopeFields = ["schema", "status", "query", "pinnedOnly", "retryFilter",
    "featureSearchIndexBacked", "searchDslValid", "rejectionReason", "generation", "indexedEntries",
    "hitCount", "modelProviderDependency", "vectorSearchPerformed", "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged", "sseMetadataSchemaChanged", "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged", "viewerClientExposureAdded", "retentionCleanupExecuted",
    "s09RetentionLifecycleRequired", "items"];
  assert(ordered(ops, opsEnvelopeFields.map(field => `\\\"${field}\\\"`)), "Ops envelope field order drift");
  for (const field of opsEnvelopeFields) assert(exactCount(ops, new RegExp(`\\\\\\\"${field}\\\\\\\"`, "g")) === 1,
    `Ops envelope field count drift: ${field}`);

  const integrator = functionBody(incidents, "IntegratorScopedEventSearchJson");
  for (const fragment of [
    'OpsV300EventEvidenceSearchQueryValue(query, "q", "search")',
    "search.default_limit = 10", "search.max_limit = 25", "search.max_offset = 500",
    'if (const auto it = query.find("limit"); it != query.end()) { search.requested_limit = it->second; }',
    'if (const auto it = query.find("offset"); it != query.end()) { search.requested_offset = it->second; }',
    "const auto search_resolution = ResolveEventFeatureSearchQueryForApplication(search)",
    "LoadIntegratorScopedEventSearchSource(access, search_resolution.limit + search_resolution.offset)",
    "SearchEventFeaturesForApplication(records, search)",
    '"\\\"limit\\\":" << search_result.limit', '"\\\"offset\\\":" << search_result.offset',
    '"\\\"searchDslValid\\\":" << (search_result.search_dsl_valid ? "true" : "false")',
    '"\\\"rejectionReason\\\":\\\"" << JsonEscape(search_result.rejection_reason)',
  ]) exactFragment(integrator, fragment, "Integrator transport contract");
  assert(ordered(integrator, ["search.query = search_query", "search.default_limit = 10",
    'query.find("limit")', 'query.find("offset")', "ResolveEventFeatureSearchQueryForApplication(search)",
    "LoadIntegratorScopedEventSearchSource", "SearchEventFeaturesForApplication(records, search)",
    '"\\\"limit\\\":"', '"\\\"offset\\\":"']), "Integrator query/read/response order drift");
  const integratorEnvelopeFields = ["ok", "schema", "status", "route", "role", "integratorOnly",
    "publishedViewScoped", "scopeGate", "scope", "query", "limit", "offset", "searchDslValid",
    "rejectionReason", "featureSearchIndexBacked", "indexedEntries", "modelProviderDependency",
    "runtimeProviderCallPerformed", "vectorSearchPerformed", "sourceUrlIncluded", "rawEvidenceIncluded",
    "debugMaterialIncluded", "providerMaterialIncluded", "featureProvenanceIncluded", "internalEvidenceIncluded",
    "encodedClipPathIncluded", "ruleEditorIncluded", "actionControlsIncluded", "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged", "sseMetadataSchemaChanged", "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged", "view", "storage", "provided", "storageEnabled", "hasMore", "error",
    "hitCount", "results"];
  assert(ordered(integrator, integratorEnvelopeFields.map(field => `\\\"${field}\\\"`)),
    "Integrator envelope field order drift");
  for (const field of integratorEnvelopeFields)
    assert(exactCount(integrator, new RegExp(`\\\\\\\"${field}\\\\\\\"`, "g")) === 1,
      `Integrator envelope field count drift: ${field}`);

  const eventBody = functionBody(incidents, "OpsV300IndexEventRecordFromJson");
  exactFragment(eventBody,
    'for (const char* key : {"timestampMs", "createdAtMs", "receivedAtMs"})',
    "timestamp precedence");
  for (const fragment of [
    'event.event_id = Trim(ParseStringField(event_json, "eventId").value_or(""))',
    'event.event_id = "event-" + std::to_string(index + 1)',
    "event.source_id = OpsIncidentTriageBoardSourceId(event_json)", 'event.source_id = "unknown-source"',
    'event.channel_id = Trim(ParseStringField(event_json, "channelId").value_or(""))',
    'event.event_type = Trim(ParseStringField(event_json, "eventType").value_or(""))',
    'event.event_type = Trim(ParseStringField(event_json, "className").value_or("event"))',
    "event.scenario = OpsIncidentTriageBoardScenario(event_json)",
    'event.status = Trim(ParseStringField(event_json, "status").value_or("recorded"))',
    'event.zone_id = Trim(ParseStringField(event_json, "zoneId").value_or(""))',
    'event.line_id = Trim(ParseStringField(event_json, "lineId").value_or(""))',
    'event.class_name = Trim(ParseStringField(event_json, "className").value_or(""))',
  ]) exactFragment(eventBody, fragment, "event record mapping");

  const featureBody = functionBody(incidents, "OpsV300ApplyIndexFeatureSetFromJson");
  const exactFeatures = [
    'OpsV300AddIndexFeature(record, "event", "eventType", record->event_type, evidence_ref)',
    'OpsV300AddIndexFeature(record, "event", "status", record->status, evidence_ref)',
    'OpsV300AddIndexFeature(record, "scene", "source", record->source_id, evidence_ref)',
    'OpsV300AddIndexFeature(record, "scene", "scenario", record->scenario, evidence_ref)',
    'OpsV300AddIndexFeature(record, "action", "rule", OpsIncidentMemoryEventRuleId(event_json), evidence_ref)',
    'OpsV300AddIndexFeature(record, "operator", "reviewState", review.review_status, evidence_ref)',
    'OpsV300AddIndexFeature(record, "operator", "incidentStatus", review.incident_status, evidence_ref)',
  ];
  assert(exactCount(featureBody, /OpsV300AddIndexFeature\(/g) === exactFeatures.length && ordered(featureBody, exactFeatures),
    "seven feature exact count/order/RHS drift");
  for (const fragment of exactFeatures) exactFragment(featureBody, fragment, "seven feature mapping");
  for (const fragment of [
    'record->feature_set_id = "ops-v300-ui-" + record->event_id', "record->feature_revision = 1",
    'OpsV300EvidenceRefPath(event_json, "evidenceManifest").empty()',
    '? OpsV300EvidenceRefPath(event_json, "snapshotPath")',
    ': OpsV300EvidenceRefPath(event_json, "evidenceManifest")',
  ]) exactFragment(featureBody, fragment, "feature-set metadata mapping");

  const evidenceBody = functionBody(incidents, "OpsV300ApplyIndexEvidenceManifestFromJson");
  for (const fragment of [
    'const std::string snapshot_path = OpsV300EvidenceRefPath(event_json, "snapshotPath")',
    'const std::string evidence_manifest = OpsV300EvidenceRefPath(event_json, "evidenceManifest")',
    'const std::string frame_bundle_manifest = OpsV300EvidenceRefPath(event_json, "frameBundleManifest")',
    'const std::string bbox_crop = OpsV300EvidenceRefPath(event_json, "bboxCrop")',
    'record->manifest_path = evidence_manifest.empty() ? "ops-v300-ui-derived:" + record->event_id : evidence_manifest',
    "record->event_frame_present = !snapshot_path.empty() || !evidence_manifest.empty()",
    "record->representative_image_present = !snapshot_path.empty()",
    "record->bbox_crop_count = bbox_crop.empty() ? 0 : 1",
    "record->frame_bundle_present = !frame_bundle_manifest.empty()",
  ]) exactFragment(evidenceBody, fragment, "evidence mapping");
  const reviewBody = functionBody(incidents, "OpsV300ApplyIndexReviewStateFromReview");
  for (const fragment of [
    'record->review_state = review.review_status.empty() ? "new" : review.review_status',
    'record->classification = review.classification.empty() ? "unclassified" : review.classification',
    'record->incident_status = review.incident_status.empty() ? "new" : review.incident_status',
    'record->pinned = ParseBoolField(event_json, "pinned").value_or(false)',
  ]) exactFragment(reviewBody, fragment, "review mapping");

  const opsItem = functionBody(incidents, "OpsV300EventEvidenceSearchItemJson");
  const opsFields = ["eventId", "sourceId", "eventType", "scenario", "reviewState", "featureRevision",
    "featureReasons", "evidenceTimeline", "retryActions", "pinStatus", "retentionStatus", "evidenceRefs",
    "rawPromptStored", "rawProviderResponseStored", "sourceUrlExposed", "debugMaterialExposed"];
  assert(ordered(opsItem, opsFields.map(field => `\\\"${field}\\\"`)), "Ops serializer field order drift");
  for (const field of opsFields) assert(exactCount(opsItem, new RegExp(`\\\\\\\"${field}\\\\\\\"`, "g")) === 1,
    `Ops serializer field count drift: ${field}`);
  for (const fragment of [
    '"\\\"rawPromptStored\\\":false,"', '"\\\"rawProviderResponseStored\\\":false,"',
    '"\\\"sourceUrlExposed\\\":false,"', '"\\\"debugMaterialExposed\\\":false"',
  ]) exactFragment(opsItem, fragment, "Ops serializer privacy");
  const integratorItem = functionBody(incidents, "IntegratorScopedEventSearchItemJson");
  const integratorItemFields = ["eventId", "viewId", "digest", "digestId", "summaryText", "eventType",
    "status", "severity", "timelineHint", "time"];
  assert(ordered(integratorItem, integratorItemFields.map(field => `\\\"${field}\\\"`)),
    "Integrator item serializer field order drift");
  for (const field of integratorItemFields) assert(exactCount(integratorItem, new RegExp(`\\\\\\\"${field}\\\\\\\"`, "g")) === 1,
    `Integrator item serializer field count drift: ${field}`);
  for (const field of ["modelProviderDependency", "runtimeProviderCallPerformed", "vectorSearchPerformed",
    "sourceUrlIncluded", "rawEvidenceIncluded", "debugMaterialIncluded", "providerMaterialIncluded",
    "featureProvenanceIncluded", "internalEvidenceIncluded", "encodedClipPathIncluded", "ruleEditorIncluded",
    "actionControlsIncluded", "eventPostPayloadChanged", "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged", "wsMetadataSchemaChanged", "rtspOrWebrtcMediaPathChanged"])
    exactFragment(integrator, `"\\\"${field}\\\":false,"`, "Integrator serializer privacy");
  assert(!integrator.includes("evidenceRefs"), "Integrator evidence refs leaked");
}

function compileAndRunApplicationCase(temp, sourceText, harnessText, name) {
  const sourceFile = path.join(temp, `${name}-service.cpp`);
  const harnessFile = path.join(temp, `${name}-harness.cpp`);
  const binary = path.join(temp, name);
  fs.writeFileSync(sourceFile, sourceText);
  fs.writeFileSync(harnessFile, harnessText);
  const compile = spawnSync(process.env.CXX || "c++", ["-std=c++17", `-I${path.join(root,"include")}`,
    sourceFile, path.join(root,"src/analysis/event_feature_search_index.cpp"),
    path.join(root,"src/analysis/event_search_query.cpp"), harnessFile, "-o", binary], {encoding:"utf8"});
  assert(compile.status === 0,
    `${name} compile exit=${compile.status} stdout=${compile.stdout.trim()} stderr=${compile.stderr.trim()}`);
  return spawnSync(binary, [], {encoding:"utf8"});
}

check("application contract is standard-only and cannot express unsafe search material", () => {
  const header = read(headerPath);
  const includes = [...header.matchAll(/^\s*#\s*include\s*([<"][^>"]+[>"])/gm)].map(item => item[1]);
  assert(JSON.stringify(includes) === JSON.stringify([
    "<cstddef>", "<cstdint>", "<optional>", "<string>", "<vector>",
  ]), "application header include set drift");
  assert(!/^\s*#\s*include\s*"/m.test(header) && !/\b(?:analysis|core|domain|media)::/.test(header),
    "implementation dependency leaked into application contract");
  for (const token of [
    "raw_prompt", "raw_provider", "provider_request", "credential", "source_url", "raw_frame",
    "identity_feature", "archive_api", "event_post_payload_changed", "webrtc_data_channel_schema_changed",
    "sse_ws_metadata_schema_changed", "rtsp_webrtc_media_path_changed", "viewer_client_exposure_added",
  ]) assert(!header.includes(token), `unsafe input field leaked into contract: ${token}`);
  for (const name of [
    "EventFeatureSearchApplicationFeature", "EventFeatureSearchApplicationRecord",
    "EventFeatureSearchApplicationQuery", "EventFeatureSearchApplicationDocument",
    "EventFeatureSearchApplicationEntry", "EventFeatureSearchApplicationResult",
    "EventFeatureSearchApplicationQueryResolution",
  ]) assert(exactCount(header, new RegExp(`struct\\s+${name}\\b`, "g")) === 1,
    `application DTO drift: ${name}`);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v390-feature-search-header-"));
  try {
    const harness = path.join(temp, "header.cpp");
    fs.writeFileSync(harness, '#include "ingress/event_feature_search_application_service.h"\nint main(){return 0;}\n');
    execFileSync(process.env.CXX || "c++", ["-std=c++17", `-I${path.join(root,"include")}`, "-fsyntax-only", harness]);
  } finally { fs.rmSync(temp, {recursive:true,force:true}); }
});

check("application source owns canonical rebuild DSL search and safe projection", () => {
  const source = read(sourcePath);
  assertApplicationSourceContract(source);
  const mutations = [
    ["conditional feature identity privacy overwrite",
      "feature.identity_feature = false;",
      'feature.identity_feature = false; if (source.name == "rule") feature.identity_feature = true;'],
    ["evidence raw prompt privacy overwrite", "evidence.raw_prompt_stored = false;",
      "evidence.raw_prompt_stored = false; evidence.raw_prompt_stored = true;"],
    ["event viewer exposure overwrite", "event.viewer_client_exposure_added = false;",
      "event.viewer_client_exposure_added = false; event.viewer_client_exposure_added = true;"],
    ["projected channel/source swap", "output.document.channel_id = source.document.channel_id;",
      "output.document.channel_id = source.document.source_id;"],
    ["query requested limit/offset swap",
      "dsl.limit = ParseRequestedSize(query.requested_limit, dsl.limit, 1, query.max_limit);",
      "dsl.limit = ParseRequestedSize(query.requested_offset, dsl.limit, 1, query.max_limit);"],
  ];
  for (const [label, before, after] of mutations) {
    const mutated = replaceExact(source, before, after, label);
    assertRejected(label, () => assertApplicationSourceContract(mutated));
  }
});

check("transport builds exact safe records and two distinct query profiles", () => {
  const incidents = read(incidentsPath);
  const transport = transportPaths.map(read).join("\n");
  assert(read(detailPath).includes('#include "ingress/event_feature_search_application_service.h"'),
    "application include missing from transport detail");
  for (const token of [
    '"analysis/event_feature_search_index.h"', '"analysis/event_search_query.h"',
    "analysis::EventFeatureSearchIndex", "analysis::EventFeatureSearchIndexRebuildInput",
    "analysis::EventSearchIndexEntry", "analysis::EventSearchQueryOptions",
    "analysis::EventSearchDsl", "ConvertEventSearchQueryToDsl",
  ]) assert(!transport.includes(token), `transport canonical bypass remains: ${token}`);
  assert(exactCount(incidents, /SearchEventFeaturesForApplication\(/g) === 2 &&
    exactCount(incidents, /ResolveEventFeatureSearchQueryForApplication\(/g) === 1,
  "application search delegation count drift");
  assertTransportContract(incidents);
  const mutations = [
    ["URL limit assigned to offset", "search.requested_limit = it->second;", "search.requested_offset = it->second;"],
    ["URL offset assigned to limit", "search.requested_offset = it->second;", "search.requested_limit = it->second;"],
    ["read limit drops offset", "search_resolution.limit + search_resolution.offset", "search_resolution.limit"],
    ["response limit emits offset", '<< "\\\"limit\\\":" << search_result.limit',
      '<< "\\\"limit\\\":" << search_result.offset'],
    ["timestamp precedence reversal",
      'event.class_name = Trim(ParseStringField(event_json, "className").value_or(""));\n    for (const char* key : {"timestampMs", "createdAtMs", "receivedAtMs"})',
      'event.class_name = Trim(ParseStringField(event_json, "className").value_or(""));\n    for (const char* key : {"receivedAtMs", "createdAtMs", "timestampMs"})'],
    ["event status feature wrong RHS",
      'OpsV300AddIndexFeature(record, "event", "status", record->status, evidence_ref);',
      'OpsV300AddIndexFeature(record, "event", "status", record->event_type, evidence_ref);'],
    ["Integrator evidence refs leak", '<< ",\\\"results\\\":[";',
      '<< ",\\\"evidenceRefs\\\":[],\\\"results\\\":[";'],
  ];
  for (const [label, before, after] of mutations) {
    const mutated = replaceExact(incidents, before, after, label);
    assertRejected(label, () => assertTransportContract(mutated));
  }
});

check("compiled application matrix preserves every DTO field ordering query precedence and privacy RED mutations", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v390-feature-search-app-"));
  try {
    const source = read(sourcePath);
    const harness = `
#include "ingress/event_feature_search_application_service.h"
#include <string>
#include <utility>
#include <vector>
using ingress::EventFeatureSearchApplicationEntry;
using ingress::EventFeatureSearchApplicationQuery;
using ingress::EventFeatureSearchApplicationRecord;
bool FieldsEqual(const EventFeatureSearchApplicationEntry& e,
                 const std::vector<std::pair<std::string,std::string>>& expected){
  if(e.document.features.size()!=expected.size())return false;
  for(std::size_t i=0;i<expected.size();++i){
    if(e.document.features[i].field!=expected[i].first||e.document.features[i].value!=expected[i].second)return false;
  }
  return true;
}
EventFeatureSearchApplicationRecord MakeRecord(const std::string& id,const std::string& suffix,
                                               std::int64_t timestamp,bool pinned){
  EventFeatureSearchApplicationRecord r;
  r.event_id=id;r.source_id="source-"+suffix;r.channel_id="channel-"+suffix;
  r.event_type="type-"+suffix;r.scenario="scenario-"+suffix;r.status="status-"+suffix;
  r.zone_id="zone-"+suffix;r.line_id="line-"+suffix;r.class_name="class-"+suffix;r.timestamp_ms=timestamp;
  r.feature_set_id="feature-set-"+suffix;r.feature_revision=suffix=="a"?3:4;
  const std::string ref="feature-ref-"+suffix;
  r.features={{"event","eventType",r.event_type,ref},{"event","status",r.status,ref},
    {"scene","source",r.source_id,ref},{"scene","scenario",r.scenario,ref},
    {"action","rule","rule-"+suffix,ref},{"operator","reviewState","review-"+suffix,ref},
    {"operator","incidentStatus","incident-"+suffix,ref}};
  r.manifest_path="manifest-"+suffix;r.event_frame_present=true;r.representative_image_present=true;
  r.bbox_crop_count=suffix=="a"?1:2;r.frame_bundle_present=true;r.review_state="review-"+suffix;
  r.classification="classification-"+suffix;r.incident_status="incident-"+suffix;r.pinned=pinned;
  return r;
}
bool EntryEqual(const EventFeatureSearchApplicationEntry& e,const std::string& id,const std::string& suffix,
                std::int64_t timestamp,bool pinned){
  const std::vector<std::pair<std::string,std::string>> fields={
    {"evidenceManifest","manifest-"+suffix},{"evidence.eventFrame","present"},
    {"evidence.representativeImage","present"},{"evidence.bboxCrop",suffix=="a"?"1":"2"},
    {"evidence.frameBundle","present"},{"featureSetId","feature-set-"+suffix},
    {"featureRevision",suffix=="a"?"3":"4"},{"event.eventType","type-"+suffix},
    {"event.status","status-"+suffix},{"scene.source","source-"+suffix},
    {"scene.scenario","scenario-"+suffix},{"action.rule","rule-"+suffix},
    {"operator.reviewState","review-"+suffix},{"operator.incidentStatus","incident-"+suffix},
    {"classification","classification-"+suffix},{"incidentStatus","incident-"+suffix}};
  return e.event_id==id&&e.feature_revision==(suffix=="a"?3:4)&&e.has_event_record&&e.has_feature_set&&
    e.has_evidence_manifest&&e.has_review_state&&e.document.event_id==id&&
    e.document.source_id=="source-"+suffix&&e.document.channel_id=="channel-"+suffix&&
    e.document.event_type=="type-"+suffix&&e.document.scenario=="scenario-"+suffix&&
    e.document.status=="status-"+suffix&&e.document.zone_id=="zone-"+suffix&&
    e.document.line_id=="line-"+suffix&&e.document.class_name=="class-"+suffix&&
    e.document.review_state=="review-"+suffix&&e.document.timestamp_ms==timestamp&&
    e.document.pinned==pinned&&e.evidence_refs==std::vector<std::string>{"manifest-"+suffix}&&FieldsEqual(e,fields);
}
int main(){
  const auto a=MakeRecord("event-a","a",10,false);const auto b=MakeRecord("event-b","b",20,true);
  EventFeatureSearchApplicationQuery q;q.default_limit=10;q.max_limit=25;q.max_offset=500;
  auto out=ingress::SearchEventFeaturesForApplication({a,b},q);
  if(!out.search_dsl_valid||out.generation!=1||out.indexed_entries!=2||out.privacy_rejected_records!=0||
     out.limit!=10||out.offset!=0||out.hits.size()!=2||!EntryEqual(out.hits[0],"event-b","b",20,true)||
     !EntryEqual(out.hits[1],"event-a","a",10,false))return 1;
  q.query="sort:oldest limit:2";out=ingress::SearchEventFeaturesForApplication({a,b},q);
  if(out.hits.size()!=2||out.hits[0].event_id!="event-a"||out.hits[1].event_id!="event-b")return 2;
  q.query="limit:1 offset:1";out=ingress::SearchEventFeaturesForApplication({a,b},q);
  if(out.hits.size()!=1||out.hits[0].event_id!="event-a"||out.limit!=1||out.offset!=1)return 3;
  q=EventFeatureSearchApplicationQuery{};q.query="status:status-b";q.default_limit=10;q.max_limit=25;
  q.max_offset=500;q.forced_limit=12;q.pinned_only=true;q.ops_events_ui_required=true;
  out=ingress::SearchEventFeaturesForApplication({a,b},q);
  if(out.limit!=12||out.offset!=0||out.hits.size()!=1||out.hits[0].event_id!="event-b")return 4;
  EventFeatureSearchApplicationQuery w;w.query="status:status-a limit:7 offset:4";
  w.default_limit=10;w.max_limit=25;w.max_offset=500;
  auto resolved=ingress::ResolveEventFeatureSearchQueryForApplication(w);
  if(!resolved.search_dsl_valid||resolved.limit!=7||resolved.offset!=4)return 5;
  w.requested_limit="2";w.requested_offset="1";resolved=ingress::ResolveEventFeatureSearchQueryForApplication(w);
  if(resolved.limit!=2||resolved.offset!=1)return 6;
  w.requested_limit="broken";w.requested_offset="broken";resolved=ingress::ResolveEventFeatureSearchQueryForApplication(w);
  if(resolved.limit!=7||resolved.offset!=4)return 7;
  w.requested_limit="-1";w.requested_offset="-1";resolved=ingress::ResolveEventFeatureSearchQueryForApplication(w);
  if(resolved.limit!=1||resolved.offset!=0)return 8;
  w.requested_limit="9999999999";w.requested_offset="9999999999";
  resolved=ingress::ResolveEventFeatureSearchQueryForApplication(w);
  if(resolved.limit!=7||resolved.offset!=4)return 9;
  w.requested_limit="3junk";w.requested_offset="2tail";resolved=ingress::ResolveEventFeatureSearchQueryForApplication(w);
  if(resolved.limit!=3||resolved.offset!=2)return 10;
  w.query="face recognition";w.requested_limit="2";w.requested_offset="1";
  out=ingress::SearchEventFeaturesForApplication({a,b},w);
  if(out.search_dsl_valid||out.rejection_reason!="identity-search-disallowed"||!out.hits.empty()||
     out.limit!=2||out.offset!=1)return 11;
  return 0;
}
`;
    const run = compileAndRunApplicationCase(temp, source, harness, "canonical");
    assert(run.status === 0,
      `canonical harness exit=${run.status} stdout=${run.stdout.trim()} stderr=${run.stderr.trim()}`);
    const runtimeMutations = [
      ["conditional-feature-identity",
        "feature.identity_feature = false;",
        'feature.identity_feature = (source.name == "rule");'],
      ["evidence-raw-prompt", "evidence.raw_prompt_stored = false;", "evidence.raw_prompt_stored = true;"],
      ["event-viewer-exposure", "event.viewer_client_exposure_added = false;",
        "event.viewer_client_exposure_added = true;"],
    ];
    for (const [name, before, after] of runtimeMutations) {
      const mutated = replaceExact(source, before, after, name);
      const mutationRun = compileAndRunApplicationCase(temp, mutated, harness, name);
      assert(mutationRun.status !== 0,
        `${name} runtime mutation produced false PASS stdout=${mutationRun.stdout.trim()} stderr=${mutationRun.stderr.trim()}`);
    }
  } finally { fs.rmSync(temp, {recursive:true,force:true}); }
});

check("CMake dispatch and current graph bind the exact Slice 27 successor", () => {
  assert(exactCount(read("CMakeLists.txt"), /src\/ingress\/event_feature_search_application_service\.cpp/g) === 1,
    "CMake source count drift");
  assert(exactCount(read("server.sh"), /verify-v390-event-feature-search-application-boundary/g) === 3,
    "dispatch count drift");
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  const classifier = id => graph.moduleClassifiers.find(item => item.id === id);
  const edge = direction => graph.observedModuleEdges.find(item => item.direction === direction);
  assert(graph.expectedProductionFiles === 208 && graph.expectedCppFiles === 101 &&
    classifier("application-service-interfaces")?.expectedFileCount === 41 &&
    classifier("application-service-interfaces")?.expectedCppCount === 17 &&
    edge("transport-and-auth-adapter -> analysis-services")?.witnessCount === 1 &&
    edge("transport-and-auth-adapter -> analysis-services")?.witnessSha256 ===
      "65f056e8ec5e09a639a15d98920884535929f2470a6beac11ffa9869eba796a7" &&
    edge("application-service-interfaces -> analysis-services")?.witnessCount === 20 &&
    edge("application-service-interfaces -> analysis-services")?.witnessSha256 ===
      "369be0731233c3c320103811ced13f27110508063e7cb6b82ab49d2431ade21a" &&
    edge("transport-and-auth-adapter -> application-service-interfaces")?.witnessCount === 20 &&
    edge("transport-and-auth-adapter -> application-service-interfaces")?.witnessSha256 ===
      "59d642796881167f557cde11ce4304ee67adacbccfda8bbd90a70bb62259d52e" &&
    edge("transport-and-auth-adapter -> core-media-interfaces")?.witnessCount === 4 &&
    edge("composition-root -> application-service-interfaces")?.witnessCount === 1 &&
    edge("composition-root -> application-service-interfaces")?.witnessSha256 ===
      "a5971a04521df447b33a9be009aa7e2e8ffeec5d23dfc0ac26fb95404d8af9fb" &&
    graph.observedModuleEdges.length === 17 &&
    graph.observedModuleEdges.filter(item => !item.allowedByTarget).length === 2 &&
    graph.stronglyConnectedComponents.length === 0 &&
    graph.boundary.includes("Analysis Session read application boundary"), "graph successor drift");
});

check("current structure gate accepts the exact non-final successor", () => {
  const output = execFileSync(path.join(root,"server.sh"),
    ["verify-v390-review4-structure-stabilization-execution"], {cwd:root,encoding:"utf8"});
  assert(output.includes("summary: pass=15 fail=0"), "structure successor gate failed");
});

for (const item of checks) console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
const failed = checks.filter(item => item.status === "FAIL").length;
console.log(`- summary: pass=${checks.length-failed} fail=${failed}`);
process.exit(failed ? 1 : 0);
