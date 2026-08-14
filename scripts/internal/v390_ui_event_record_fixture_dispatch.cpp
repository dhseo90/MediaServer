// 파일 용도: exact UI acceptance가 product EventRecord application 경계로 test-owned record를 저장한다.
// 동작 요약: 격리된 helper process에서 dispatch/query/queue drain을 검증하고 process 종료로 runtime state를 폐기한다.
#include "analysis/event_storage.h"
#include "core/analysis_runtime_port.h"
#include "domain/strict_json.h"
#include "ingress/event_storage_application_service.h"

#include <chrono>
#include <iostream>
#include <string>
#include <thread>

namespace {

core::AnalysisRuntimeConfig g_config;

std::string JsonEscape(const std::string& value) {
    std::string escaped;
    escaped.reserve(value.size() + 8);
    for (const char ch : value) {
        switch (ch) {
            case '\\': escaped += "\\\\"; break;
            case '"': escaped += "\\\""; break;
            case '\n': escaped += "\\n"; break;
            case '\r': escaped += "\\r"; break;
            case '\t': escaped += "\\t"; break;
            default: escaped.push_back(ch); break;
        }
    }
    return escaped;
}

struct EventRecordIdentity {
    std::string event_id;
    std::string source_id;
    std::string stream_id;
    std::string route;
    std::string status;
    std::string snapshot_path;
    std::string clip_path;
};

bool ParseMetadataIdentity(const std::string& metadata_json,
                           std::string* source_id,
                           std::string* route) {
    ingress::StrictJsonObjectDocument metadata;
    std::string parse_error;
    if (!ingress::ParseStrictJsonObjectDocument(metadata_json, &metadata, &parse_error)) {
        return false;
    }
    const auto parsed_source_id = ingress::StrictJsonStringField(metadata, "sourceId");
    const auto parsed_route = ingress::StrictJsonStringField(metadata, "route");
    if (!parsed_source_id.has_value() || parsed_source_id->empty() ||
        !parsed_route.has_value() || parsed_route->empty()) {
        return false;
    }
    *source_id = *parsed_source_id;
    *route = *parsed_route;
    return true;
}

bool ParseCanonicalRecordIdentity(const std::string& record_json,
                                  EventRecordIdentity* identity) {
    if (identity == nullptr) {
        return false;
    }
    ingress::StrictJsonObjectDocument record;
    std::string parse_error;
    if (!ingress::ParseStrictJsonObjectDocument(record_json, &record, &parse_error)) {
        return false;
    }
    const auto event_id = ingress::StrictJsonStringField(record, "eventId");
    const auto stream_id = ingress::StrictJsonStringField(record, "streamId");
    const auto status = ingress::StrictJsonStringField(record, "status");
    const auto snapshot_path = ingress::StrictJsonStringField(record, "snapshotPath");
    const auto clip_path = ingress::StrictJsonStringField(record, "clipPath");
    const auto metadata_json = ingress::StrictJsonObjectField(record, "metadata");
    if (!event_id.has_value() || event_id->empty() ||
        !stream_id.has_value() || stream_id->empty() ||
        !status.has_value() || status->empty() ||
        !ingress::StrictJsonHasTopLevelField(record, "snapshotPath") ||
        !snapshot_path.has_value() || snapshot_path->empty() ||
        !ingress::StrictJsonHasTopLevelField(record, "clipPath") ||
        !clip_path.has_value() || clip_path->empty() ||
        !metadata_json.has_value() ||
        !ParseMetadataIdentity(*metadata_json, &identity->source_id, &identity->route)) {
        return false;
    }
    identity->event_id = *event_id;
    identity->stream_id = *stream_id;
    identity->status = *status;
    identity->snapshot_path = *snapshot_path;
    identity->clip_path = *clip_path;
    return true;
}

int Fail(const std::string& code) {
    analysis::StopEventStorage();
    std::cerr << code << "\n";
    return 1;
}

}  // namespace

namespace core {

const AnalysisRuntimeConfig& GetAnalysisRuntimeConfig() {
    return g_config;
}

}  // namespace core

int main(int argc, char** argv) {
    if (argc != 11) {
        std::cerr << "usage: fixture-dispatch <storage> <snapshots> <clips> <event-id> "
                     "<source-id> <stream-id> <status> <event-type> <route> <scenario>\n";
        return 2;
    }

    const std::string storage_path = argv[1];
    const std::string snapshot_dir = argv[2];
    const std::string clip_dir = argv[3];
    const std::string event_id = argv[4];
    const std::string source_id = argv[5];
    const std::string stream_id = argv[6];
    const std::string status = argv[7];
    const std::string event_type = argv[8];
    const std::string route = argv[9];
    const std::string scenario = argv[10];
    if (storage_path.empty() || snapshot_dir.empty() || clip_dir.empty() ||
        event_id.empty() || source_id.empty() || stream_id.empty() ||
        status.empty() || event_type.empty() || route.empty()) {
        return Fail("FIXTURE_DISPATCH_ARGUMENT_MISSING");
    }

    g_config.analysis_event_storage_enabled = true;
    g_config.analysis_event_storage_path = storage_path;
    g_config.analysis_event_storage_max_queue = 16;
    g_config.analysis_event_storage_max_file_bytes = 0;
    g_config.analysis_event_storage_max_archives = 0;
    g_config.analysis_event_storage_max_total_bytes = 0;
    g_config.analysis_event_snapshot_hook_enabled = true;
    g_config.analysis_event_snapshot_dir = snapshot_dir;
    g_config.analysis_event_clip_hook_enabled = true;
    g_config.analysis_event_clip_dir = clip_dir;
    g_config.analysis_event_pre_event_ms = 0;
    g_config.analysis_event_post_event_ms = 0;
    g_config.analysis_event_clip_buffer_ms = 0;

    const auto before = ingress::ObserveEventStorageForApplication();
    ingress::EventStorageApplicationDispatchRequest request;
    request.source.source_key = stream_id;
    request.source.profile_key = "v390-ui-exact-fixture";
    request.source.source_kind = "test-owned-event-record";
    request.source.route = route;
    request.source.client_id = "v390-ui-exact-fixture";
    request.source.pts = 1;

    ingress::EventStorageApplicationDispatchEvent event;
    event.event_id = event_id;
    event.rule_id = "v390-ui-exact-fixture-rule";
    event.event_type = event_type;
    event.track_id = 1;
    event.class_id = 0;
    event.label = "person";
    event.score = 0.9F;
    event.status = status;
    event.start_time_ms = 1;
    event.update_time_ms = 1;
    event.end_time_ms = 1;
    event.scenario_name = scenario;
    event.metadata_json =
        "{\"schema\":\"media-server.v390-ui-event-record-fixture.v1\","
        "\"fixtureOwner\":\"v390-self-contained-acceptance\","
        "\"sourceId\":\"" + JsonEscape(source_id) + "\","
        "\"route\":\"" + JsonEscape(route) + "\"}";
    request.events.push_back(event);

    EventRecordIdentity dispatched;
    dispatched.event_id = request.events.front().event_id;
    dispatched.stream_id = request.source.source_key;
    dispatched.status = request.events.front().status;
    if (!ParseMetadataIdentity(
            request.events.front().metadata_json, &dispatched.source_id, &dispatched.route)) {
        return Fail("FIXTURE_DISPATCH_REQUEST_IDENTITY_INVALID");
    }
    ingress::DispatchEventRecordsForApplication(request);

    const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(3);
    ingress::EventStorageApplicationSnapshot after;
    do {
        after = ingress::ObserveEventStorageForApplication();
        if (after.queue_size == 0 && after.stored_count >= before.stored_count + 1) {
            break;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    } while (std::chrono::steady_clock::now() < deadline);
    if (after.queue_size != 0 || after.stored_count != before.stored_count + 1 ||
        after.failed_count != before.failed_count || after.dropped_count != before.dropped_count) {
        return Fail("FIXTURE_DISPATCH_QUEUE_DRAIN_FAILED");
    }

    ingress::EventStorageApplicationQueryOptions query;
    query.event_id = event_id;
    query.include_archives = true;
    query.limit = 2;
    ingress::EventStorageApplicationQueryResult result;
    std::string error;
    if (!ingress::QueryEventRecordsForApplication(query, &result, &error)) {
        return Fail("FIXTURE_DISPATCH_QUERY_FAILED");
    }
    if (result.records_json.size() != 1 || result.matched_records != 1) {
        return Fail("FIXTURE_DISPATCH_QUERY_CARDINALITY_MISMATCH");
    }
    const std::string& record = result.records_json.front();
    EventRecordIdentity queried;
    if (!ParseCanonicalRecordIdentity(record, &queried)) {
        return Fail("FIXTURE_DISPATCH_QUERY_STRUCTURE_INVALID");
    }
    if (dispatched.event_id != event_id ||
        dispatched.source_id != source_id ||
        dispatched.stream_id != stream_id ||
        dispatched.route != route ||
        dispatched.status != status) {
        return Fail("FIXTURE_DISPATCH_REQUEST_IDENTITY_MISMATCH");
    }
    if (queried.event_id != event_id ||
        queried.source_id != source_id ||
        queried.stream_id != stream_id ||
        queried.route != route ||
        queried.status != status) {
        return Fail("FIXTURE_DISPATCH_QUERY_IDENTITY_MISMATCH");
    }

    analysis::StopEventStorage();
    std::cout << "{"
              << "\"schema\":\"media-server.v390-ui-event-record-fixture-dispatch.v1\","
              << "\"result\":\"PASS\","
              << "\"eventId\":\"" << JsonEscape(event_id) << "\","
              << "\"sourceId\":\"" << JsonEscape(source_id) << "\","
              << "\"streamId\":\"" << JsonEscape(stream_id) << "\","
              << "\"route\":\"" << JsonEscape(route) << "\","
              << "\"status\":\"" << JsonEscape(status) << "\","
              << "\"productDispatch\":{"
              << "\"sourceIdFieldPath\":\"metadata.sourceId\","
              << "\"streamIdFieldPath\":\"streamId\","
              << "\"routeFieldPath\":\"metadata.route\","
              << "\"statusFieldPath\":\"status\","
              << "\"observedEventId\":\"" << JsonEscape(dispatched.event_id) << "\","
              << "\"observedSourceId\":\"" << JsonEscape(dispatched.source_id) << "\","
              << "\"observedStreamId\":\"" << JsonEscape(dispatched.stream_id) << "\","
              << "\"observedRoute\":\"" << JsonEscape(dispatched.route) << "\","
              << "\"observedStatus\":\"" << JsonEscape(dispatched.status) << "\","
              << "\"storedDelta\":" << (after.stored_count - before.stored_count) << ","
              << "\"queueDrained\":" << (after.queue_size == 0 ? "true" : "false")
              << "},"
              << "\"canonicalQuery\":{"
              << "\"sourceIdFieldPath\":\"metadata.sourceId\","
              << "\"streamIdFieldPath\":\"streamId\","
              << "\"routeFieldPath\":\"metadata.route\","
              << "\"statusFieldPath\":\"status\","
              << "\"observedEventId\":\"" << JsonEscape(queried.event_id) << "\","
              << "\"observedSourceId\":\"" << JsonEscape(queried.source_id) << "\","
              << "\"observedStreamId\":\"" << JsonEscape(queried.stream_id) << "\","
              << "\"observedRoute\":\"" << JsonEscape(queried.route) << "\","
              << "\"observedStatus\":\"" << JsonEscape(queried.status) << "\","
              << "\"snapshotPathPresent\":true,"
              << "\"clipPathPresent\":true,"
              << "\"queryMatched\":" << result.matched_records
              << "},"
              << "\"storedDelta\":1,"
              << "\"queueDrained\":true,"
              << "\"queryMatched\":1,"
              << "\"processStateDisposed\":true"
              << "}\n";
    return 0;
}
