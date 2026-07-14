// 파일 용도: Action Execution Deferral dashboard HTML과 renderer script fragment를 소유한다.
// 동작 요약: 기존 shared action-control CSS를 재사용하며 GET readback만 수행하는 UI fragment를 byte-exact 반환한다.
#include "ingress/product_ui_action_execution_deferral.h"

#include <sstream>

namespace ingress {

std::string OpsActionExecutionDeferralWorkspaceHtml() {
    return R"DEFERRALHTML(      <section class="section-card ops-workspace-wide ops-action-execution-deferral-decision" data-testid="ops-action-execution-deferral-decision" data-v390-action-execution-deferral-decision="media-server.ops.v390-action-execution-deferral-decision.v1">
        <div class="toolbar">
          <div>
            <h3>Action Execution Deferral</h3>
            <p>source recheck, client notice send, rule apply 실행을 별도 승인 전까지 모두 deferred 상태로 고정합니다.</p>
          </div>
        </div>
        <div id="dashActionExecutionDeferralBadges" class="badge-row"><span class="chip">로딩 중</span></div>
        <p id="dashActionExecutionDeferralText">action execution deferral decision을 불러오는 중입니다.</p>
        <div id="dashActionExecutionDeferralList" class="ops-action-control-list">
          <div class="empty">deferred action decision 항목을 기다립니다.</div>
        </div>
        <div id="dashActionExecutionDeferralBoundary" class="ops-action-control-boundary">
          approvalGatedExecutionEnabled=false · sourceRecheckExecuted=false · clientNoticeSent=false · ruleApplyPerformed=false
        </div>
      </section>
)DEFERRALHTML";
}

void AppendOpsActionExecutionDeferralWorkspaceScript(std::ostringstream& out) {
    out << R"DEFERRALSCRIPT(      let v390ActionExecutionDeferralDecisionState = {};
      const v390ActionExecutionDeferralDecisionList = value => Array.isArray(value) ? value : [];
      const v390ActionExecutionDeferralEntry = (kind, title, detail, meta, tone = '') =>
        `<p class="ops-action-control-entry ${escapeHtml(tone)}" data-v390-action-execution-deferral-entry="${escapeHtml(kind)}">
          <strong>${escapeHtml(display(title))}</strong>
          <span>${escapeHtml(display(detail))}</span>
          <small>${escapeHtml(display(meta))}</small>
        </p>`;
      const renderV390ActionExecutionDeferralDecision = (payload = {}) => {
        const decision = payload.actionExecutionDeferralDecision || {};
        const summary = decision.actionExecutionDeferralDecisionSummary || {};
        const deferredActionKinds =
          v390ActionExecutionDeferralDecisionList(decision.deferredActionKinds);
        const boundaryOk =
          decision.boundaries?.approvalGatedExecutionEnabled === false &&
          decision.boundaries?.actionExecutionPerformed === false &&
          decision.boundaries?.sourceRecheckExecuted === false &&
          decision.boundaries?.clientNoticeSent === false &&
          decision.boundaries?.ruleApplyPerformed === false &&
          decision.boundaries?.ruleRegistryWritePerformed === false &&
          decision.boundaries?.externalDeliveryPerformed === false &&
          decision.boundaries?.eventRecordWritePerformed === false &&
          decision.boundaries?.rtspOrWebrtcMediaPathChanged === false;
        v390ActionExecutionDeferralDecisionState = {
          actionExecutionDeferralDecision: decision,
          actionExecutionDeferralRoute: payload.actionExecutionDeferralRoute || '/ops/api/actions/execution-deferral-decision'
        };
        renderBadges('dashActionExecutionDeferralBadges', [
          { text: `deferred ${summary.deferredActionCount ?? deferredActionKinds.length}` },
          { text: `enabled ${summary.mutatingActionEnabledCount ?? 0}` },
          { text: summary.deferAllWrites === true ? 'defer-all-action-writes' : 'decision 확인 필요', tone: summary.deferAllWrites === true ? 'info' : 'warn' },
          { text: boundaryOk ? 'no action execution' : 'boundary 확인 필요', tone: boundaryOk ? 'info' : 'warn' }
        ]);
        setText('dashActionExecutionDeferralText',
          payload.error
            ? `Action Execution Deferral 로드 실패: ${payload.error}`
            : `decision ${display(summary.decisionStatus || decision.selectedMode || 'defer-all-action-writes')} · approvalGatedExecutionEnabled=${summary.approvalGatedExecutionEnabled === false ? 'false' : '확인 필요'}`);
        const list = document.getElementById('dashActionExecutionDeferralList');
        if (list) {
          const rows = deferredActionKinds.length > 0 ? deferredActionKinds : [
            { actionKind: 'source-recheck-execution', decision: 'deferred', currentRoute: '/ops/api/actions/source-recheck-pilot', writeBoundary: 'sourceRecheckExecuted=false' },
            { actionKind: 'client-notice-send', decision: 'deferred', currentRoute: '/ops/api/actions/client-notice-draft-queue', writeBoundary: 'clientNoticeSent=false' },
            { actionKind: 'rule-apply', decision: 'deferred', currentRoute: '/ops/api/actions/rule-draft-package', writeBoundary: 'ruleApplyPerformed=false' }
          ];
          list.innerHTML = rows.slice(0, 8).map(item =>
            v390ActionExecutionDeferralEntry(
              item.actionKind || 'action-deferral',
              item.actionKind || 'deferred action',
              item.decision || 'deferred',
              `${display(item.currentRoute || '-')} · ${display(item.writeBoundary || item.requiredFutureGate || '-')}`,
              'warn'))
            .join('');
        }
        setText('dashActionExecutionDeferralBoundary',
          `decision=${display(v390ActionExecutionDeferralDecisionState.actionExecutionDeferralRoute)} · sourceRecheck=${display(decision.sourceRecheckActionPilotRoute)} · notice=${display(decision.clientNoticeDraftQueueRoute)} · rule=${display(decision.ruleDraftActionPackageRoute)} · approvalGatedExecutionEnabled=${decision.boundaries?.approvalGatedExecutionEnabled === false ? 'false' : '확인 필요'} · actionExecutionPerformed=${decision.boundaries?.actionExecutionPerformed === false ? 'false' : '확인 필요'} · sourceRecheckExecuted=${decision.boundaries?.sourceRecheckExecuted === false ? 'false' : '확인 필요'} · clientNoticeSent=${decision.boundaries?.clientNoticeSent === false ? 'false' : '확인 필요'} · ruleApplyPerformed=${decision.boundaries?.ruleApplyPerformed === false ? 'false' : '확인 필요'} · externalDeliveryPerformed=${decision.boundaries?.externalDeliveryPerformed === false ? 'false' : '확인 필요'} · rtspOrWebrtcMediaPathChanged=${decision.boundaries?.rtspOrWebrtcMediaPathChanged === false ? 'false' : '확인 필요'}`);
      };
      const refreshV390ActionExecutionDeferralDecision = async ({
        actionExecutionDeferralRoute = '/ops/api/actions/execution-deferral-decision'
      } = {}) => {
        const actionExecutionDeferralDecision = await requestJson(actionExecutionDeferralRoute);
        renderV390ActionExecutionDeferralDecision({
          actionExecutionDeferralDecision,
          actionExecutionDeferralRoute
        });
      };
)DEFERRALSCRIPT";
}

}  // namespace ingress
