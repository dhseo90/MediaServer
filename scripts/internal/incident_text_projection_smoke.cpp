// 파일 용도: v2.5.0 S01 incident text projection의 redaction/determinism 단위 smoke를 검증한다.
// 동작 요약: EventRecord/audit/source health/alert dry-run fixture를 검색 가능한 local text document로 투영한다.
#include "analysis/incident_memory.h"

#include <cstdlib>
#include <iostream>
#include <string>

namespace {

void Expect(bool condition, const std::string& message) {
    if (!condition) {
        std::cerr << "[fail] " << message << "\n";
        std::exit(1);
    }
}

void ExpectContains(const std::string& text, const std::string& needle, const std::string& label) {
    Expect(text.find(needle) != std::string::npos, label + " missing: " + needle);
}

void ExpectNotContains(const std::string& text, const std::string& needle, const std::string& label) {
    Expect(text.find(needle) == std::string::npos, label + " leaked: " + needle);
}

void ExpectNoForbiddenMaterial(const analysis::IncidentProjectionDocument& document,
                               const std::string& label) {
    const std::string json = analysis::IncidentProjectionDocumentJson(document);
    Expect(!analysis::IncidentProjectionContainsForbiddenMaterial(document.searchable_text),
           label + " searchable text has forbidden material");
    Expect(!analysis::IncidentProjectionContainsForbiddenMaterial(json),
           label + " JSON has forbidden material");
    for (const char* forbidden : {
             "rtsp://",
             "https://example.invalid",
             "sourceUrl",
             "developerUrl",
             "debugCounters",
             "password",
             "token",
             "secret",
             "modelPath",
             "modelChecksum",
             "rawPrompt",
             "rawResponse",
         }) {
        ExpectNotContains(document.searchable_text, forbidden, label + " searchable text");
        ExpectNotContains(json, forbidden, label + " JSON");
    }
}

void ExpectToken(const analysis::IncidentProjectionDocument& document,
                 const std::string& token,
                 const std::string& label) {
    for (const std::string& item : document.tokens) {
        if (item == token) {
            return;
        }
    }
    Expect(false, label + " missing token: " + token);
}

}  // namespace

int main() {
    const std::string event_record =
        R"({"schema":"media-server.va.event-record.v1","eventId":"evt-101","eventType":"intrusion-dwell","streamId":"dock-cam","channelId":"dock-view","trackId":7,"className":"person","status":"emitted","zoneId":"loading-bay","scenarioName":"loitering-watch","scenarioPhase":"dwell","confidence":0.91,"startTime":1710000000000,"metadata":{"sourceUrl":"rtsp://camera.local/secret","debugCounters":{"frames":10},"modelPath":"/models/yolo.onnx"}})";
    const std::string audit_record =
        R"({"id":"audit-101","at":"1710000001000","actor":"operator","role":"operator","area":"events","action":"incident-action-update","target":"incident:evt-101","summary":"Incident acknowledged by operator","before":{"endpoint":"https://example.invalid/webhook?token=secret"},"after":{"incidentStatus":"acknowledged","note":"confirmed in loading bay"}})";
    const std::string source_health =
        R"({"schema":"media-server.ops.source-health.item.v1","sourceId":"dock-cam","status":"stale","reason":"metadata-aged","summary":"metadata delay","lastFrameAgeMs":1200,"lastMetadataAgeMs":45000,"sourceUrl":"rtsp://camera.local/secret","developerUrl":"https://debug.invalid/source"})";
    const std::string alert_dry_run =
        R"({"schema":"media-server.ops.alert-delivery-dry-run.v1","id":"alert-dry-run-101","deliveryId":"alert-main","eventId":"evt-101","transport":"webhook","status":"dry-run","externalDeliveryPerformed":false,"payloadPreview":{"eventId":"evt-101","endpoint":"https://example.invalid/hook","token":"secret"},"audit":{"action":"alert-delivery-dry-run"}})";

    const auto event_doc = analysis::ProjectEventRecordIncidentText(event_record);
    Expect(event_doc.source_kind == "event-record", "event source kind");
    Expect(event_doc.document_id == "event-record:evt-101", "event document id");
    ExpectContains(event_doc.searchable_text, "intrusion-dwell", "event searchable text");
    ExpectContains(event_doc.searchable_text, "dock-cam", "event searchable text");
    ExpectContains(event_doc.searchable_text, "loading-bay", "event searchable text");
    ExpectToken(event_doc, "intrusion", "event tokens");
    ExpectToken(event_doc, "dwell", "event tokens");
    ExpectNoForbiddenMaterial(event_doc, "event projection");

    const auto audit_doc = analysis::ProjectOpsAuditIncidentText(audit_record);
    Expect(audit_doc.source_kind == "ops-audit", "audit source kind");
    Expect(audit_doc.incident_id == "incident:evt-101", "audit incident id");
    ExpectContains(audit_doc.searchable_text, "incident-action-update", "audit searchable text");
    ExpectContains(audit_doc.searchable_text, "acknowledged", "audit searchable text");
    ExpectNoForbiddenMaterial(audit_doc, "audit projection");

    const auto source_doc = analysis::ProjectSourceHealthIncidentText(source_health);
    Expect(source_doc.source_kind == "source-health", "source health source kind");
    Expect(source_doc.document_id == "source-health:dock-cam:stale:metadata-aged", "source health document id");
    ExpectContains(source_doc.searchable_text, "metadata-aged", "source health searchable text");
    ExpectContains(source_doc.searchable_text, "45000", "source health searchable text");
    ExpectNoForbiddenMaterial(source_doc, "source health projection");

    const auto alert_doc = analysis::ProjectAlertDryRunIncidentText(alert_dry_run);
    Expect(alert_doc.source_kind == "alert-dry-run", "alert source kind");
    Expect(alert_doc.event_id == "evt-101", "alert event id");
    ExpectContains(alert_doc.searchable_text, "alert-delivery-dry-run", "alert searchable text");
    ExpectContains(alert_doc.searchable_text, "externalDeliveryPerformed false", "alert searchable text");
    ExpectNoForbiddenMaterial(alert_doc, "alert projection");

    const auto event_doc_again = analysis::ProjectEventRecordIncidentText(event_record);
    Expect(analysis::IncidentProjectionDocumentJson(event_doc) ==
               analysis::IncidentProjectionDocumentJson(event_doc_again),
           "projection JSON must be deterministic");

    std::cout << "[pass] incident text projection smoke\n";
    return 0;
}
