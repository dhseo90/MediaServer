// 파일 요약: V390 action execution deferral decision route/body의 독립 owner다.
// 동작 요약: exact GET path만 기존 v1 JSON과 no-store 응답으로 처리하며 write/auth/media side effect가 없다.

#include "ingress/ops_action_execution_deferral.h"

#include <sstream>

namespace ingress::ops_actions {
namespace {

constexpr const char* kActionExecutionDeferralDecisionRoute =
    "/ops/api/actions/execution-deferral-decision";

std::string OpsV390ActionExecutionDeferralDecisionJson() {
    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v390-action-execution-deferral-decision.v1\","
        << "\"targetStep\":\"v3.9.0 (16)\","
        << "\"featureId\":\"V390-CAND-006\","
        << "\"selectedMode\":\"defer-all-action-writes\","
        << "\"route\":\"/ops/api/actions/execution-deferral-decision\","
        << "\"sourceRecheckActionPilotRoute\":\"/ops/api/actions/source-recheck-pilot\","
        << "\"clientNoticeDraftQueueRoute\":\"/ops/api/actions/client-notice-draft-queue\","
        << "\"ruleDraftActionPackageRoute\":\"/ops/api/actions/rule-draft-package\","
        << "\"approvalDecisionGateRoute\":\"/ops/api/actions/approval-decision-gate\","
        << "\"readinessPreflightRoute\":\"/ops/api/actions/readiness-preflight\","
        << "\"outcomeReconciliationRoute\":\"/ops/api/actions/outcome-reconciliation\","
        << "\"receiptBundleRoute\":\"/ops/api/actions/receipt-bundle\","
        << "\"defaultOffExplanationRoute\":\"/ops/api/actions/default-off-explanation\","
        << "\"actionExecutionDeferralDecisionSummary\":{"
        << "\"deferredActionCount\":3,"
        << "\"mutatingActionEnabledCount\":0,"
        << "\"approvalGatedExecutionEnabled\":false,"
        << "\"deferAllWrites\":true,"
        << "\"decisionStatus\":\"all-action-writes-deferred\","
        << "\"decisionReason\":\"v3.8 action pilot remains read-only; selected action types require a separate approved execution roadmap before any write or external side effect\""
        << "},\"deferredActionKinds\":["
        << "{\"actionKind\":\"source-recheck-execution\","
        << "\"decision\":\"deferred\","
        << "\"currentRoute\":\"/ops/api/actions/source-recheck-pilot\","
        << "\"requiredFutureGate\":\"source health recheck execution design with scope, dry-run/result evidence, rollback wording, and field smoke approval\","
        << "\"writeBoundary\":\"sourceRecheckExecuted=false; sourceRegistryWritePerformed=false; sourceHealthSnapshotPersisted=false\"},"
        << "{\"actionKind\":\"client-notice-send\","
        << "\"decision\":\"deferred\","
        << "\"currentRoute\":\"/ops/api/actions/client-notice-draft-queue\","
        << "\"requiredFutureGate\":\"viewer-safe notice delivery design with queue persistence, external delivery approval, redaction evidence, and rollback wording\","
        << "\"writeBoundary\":\"clientNoticeSent=false; noticeQueueWritePerformed=false; externalDeliveryPerformed=false\"},"
        << "{\"actionKind\":\"rule-apply\","
        << "\"decision\":\"deferred\","
        << "\"currentRoute\":\"/ops/api/actions/rule-draft-package\","
        << "\"requiredFutureGate\":\"operator approved rule apply design with rule registry write scope, dry-run/result evidence, and rollback wording\","
        << "\"writeBoundary\":\"ruleApplyPerformed=false; ruleRegistryWritePerformed=false; eventRecordWritePerformed=false\"}"
        << "],\"decisionEvidenceRefs\":["
        << "\"/ops/api/actions/route-boundary\","
        << "\"/ops/api/actions/capability-contract\","
        << "\"/ops/api/actions/request-ledger\","
        << "\"/ops/api/actions/approval-decision-gate\","
        << "\"/ops/api/actions/readiness-preflight\","
        << "\"/ops/api/actions/source-recheck-pilot\","
        << "\"/ops/api/actions/client-notice-draft-queue\","
        << "\"/ops/api/actions/rule-draft-package\","
        << "\"/ops/api/actions/outcome-reconciliation\","
        << "\"/ops/api/actions/receipt-bundle\","
        << "\"/ops/api/actions/default-off-explanation\""
        << "],\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"deferAllWrites\":true,"
        << "\"approvalGatedExecutionEnabled\":false,"
        << "\"actionExecutionPerformed\":false,"
        << "\"sourceRecheckExecuted\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"noticeQueueWritePerformed\":false,"
        << "\"ruleApplyPerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"actionRequestPersisted\":false,"
        << "\"approvalDecisionPersisted\":false,"
        << "\"readinessResultPersisted\":false,"
        << "\"outcomePersisted\":false,"
        << "\"receiptBundlePersisted\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"externalDeliveryPerformed\":false,"
        << "\"fieldSmokeExecuted\":false,"
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

}  // namespace

std::optional<ActionExecutionDeferralDecisionResponse>
TryHandleActionExecutionDeferralDecision(const std::string& method,
                                         const std::string& path) {
    if (path != kActionExecutionDeferralDecisionRoute || method != "GET") {
        return std::nullopt;
    }
    ActionExecutionDeferralDecisionResponse response;
    response.status = 200;
    response.reason = "OK";
    response.body = OpsV390ActionExecutionDeferralDecisionJson();
    response.cache_control = "no-store";
    return response;
}

}  // namespace ingress::ops_actions
