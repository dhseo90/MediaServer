// 파일 용도: exact UI acceptance가 product EventRecord application 경계로 test-owned record를 저장한다.
// 동작 요약: 격리된 helper process에서 dispatch/query/queue drain을 검증하고 process 종료로 runtime state를 폐기한다.
#include "analysis/event_storage.h"
#include "core/analysis_runtime_port.h"
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

bool ContainsJsonString(const std::string& json,
                        const std::string& key,
                        const std::string& value) {
    return json.find("\"" + key + "\":\"" + JsonEscape(value) + "\"") != std::string::npos;
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
    if (!ContainsJsonString(record, "eventId", event_id) ||
        !ContainsJsonString(record, "streamId", stream_id) ||
        !ContainsJsonString(record, "status", status) ||
        !ContainsJsonString(record, "sourceId", source_id) ||
        !ContainsJsonString(record, "route", route)) {
        return Fail("FIXTURE_DISPATCH_QUERY_IDENTITY_MISMATCH");
    }
    if (record.find("\"snapshotPath\":\"\"") != std::string::npos ||
        record.find("\"clipPath\":\"\"") != std::string::npos) {
        return Fail("FIXTURE_DISPATCH_EVIDENCE_MISSING");
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
              << "\"storedDelta\":1,"
              << "\"queueDrained\":true,"
              << "\"queryMatched\":1,"
              << "\"processStateDisposed\":true"
              << "}\n";
    return 0;
}
