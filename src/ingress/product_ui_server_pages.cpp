// 파일 용도: Ops shell과 dashboard/rules/events/home/VLM 제품 페이지 HTML을 렌더링한다.
#include "ingress/product_ui_server_pages.h"

#include <sstream>
#include <string>

#include "ingress/product_ui_action_execution_deferral.h"
#include "ingress/product_ui_assets.h"
#include "ingress/product_ui_components.h"
#include "ingress/product_ui_css.h"
#include "ingress/product_ui_js.h"
#include "ingress/product_ui_page_scripts.h"

namespace ingress {

namespace {
std::string HtmlEscape(const std::string& value) {
    std::string out;
    out.reserve(value.size() + 8);
    for (const char ch : value) {
        switch (ch) {
            case '&':
                out += "&amp;";
                break;
            case '<':
                out += "&lt;";
                break;
            case '>':
                out += "&gt;";
                break;
            case '"':
                out += "&quot;";
                break;
            case '\'':
                out += "&#39;";
                break;
            default:
                out.push_back(ch);
                break;
        }
    }
    return out;
}

std::string RefreshIconSvgHtml() {
    return R"(<svg class="refresh-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M21 12a9 9 0 1 1-2.64-6.36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M21 3v6h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>)";
}

std::string RefreshIconButtonHtml(const std::string& id,
                                  const std::string& classes,
                                  const std::string& label) {
    std::ostringstream out;
    out << "<button id=\"" << id << "\" class=\"" << classes
        << " refresh-icon-button\" type=\"button\" aria-label=\"" << label
        << "\" title=\"" << label << "\">" << RefreshIconSvgHtml() << "</button>";
    return out.str();
}

void AppendProductAccountMenu(std::ostringstream& out,
                             const ProductUiPrincipalView& principal,
                             const std::string& secondary_action_href = std::string(),
                             const std::string& secondary_action_label = std::string()) {
    out << R"(        <div class="account-menu" data-sketch-account-menu="true" aria-label="현재 계정">
          <div class="account-menu-top">
            <span class="sketch-status-chip" aria-label="연결 상태"><span aria-hidden="true"></span>연결됨</span>
            <div class="account-identity">
              )" << ProductAccountAvatarSvg() << R"(
              <div class="account-copy">
                <div class="account-name">)" << HtmlEscape(principal.display_name) << R"(</div>
                <div class="account-meta">권한: )" << HtmlEscape(principal.role) << R"(</div>
              </div>
            </div>
            <div class="account-controls">
              )" << ProductThemeToggleButtonHtml() << ProductLanguageSelectHtml() << R"(
)";
    if (!secondary_action_href.empty() && !secondary_action_label.empty()) {
        out << R"(              <a class="button button-secondary account-shortcut" href=")"
            << HtmlEscape(secondary_action_href) << R"(">)"
            << HtmlEscape(secondary_action_label) << R"(</a>
)";
    }
    out << R"(            </div>
          </div>
          <form method="post" action="/logout"><button class="button-secondary" type="submit">로그아웃</button></form>
        </div>
)";
}

void AppendImageNavLink(std::ostringstream& out,
                        const std::string& href,
                        const std::string& key,
                        const std::string& label,
                        bool active,
                        const std::string& extra_attributes = "") {
    out << "        <a class=\"image-nav" << (active ? " active" : "") << "\" href=\""
        << HtmlEscape(href) << "\"";
    if (!extra_attributes.empty()) {
        out << " " << extra_attributes;
    }
    out << ">" << ProductNavIconSvg(key) << "<span>" << HtmlEscape(label) << "</span></a>\n";
}

void AppendOpsShellStartImpl(std::ostringstream& out,
                         const ProductUiPrincipalView& principal,
                         const std::string& active,
                         const std::string& subtitle) {
    (void)active;
    (void)subtitle;
    out << R"(<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>운영 콘솔</title>
)" << ProductThemeBootScript() << ProductUiCss() << ProductSharedUiScript() << R"(</head>
<body class="product-shell ops-shell sketch-shell">
  <main class="product-page">
    <header class="app-chrome sketch-topbar">
      <div class="app-header-top">
        <div class="app-nav-cluster sketch-nav-cluster">
          <div class="app-brand sketch-brand">
            )" << ProductBrandMarkSvg() << R"(
            <div class="brand-copy">
              <strong>Media Server</strong>
              <span>Ops</span>
            </div>
          </div>
          <nav class="image-nav-tabs" aria-label="운영 메뉴">
)";
    AppendImageNavLink(out, "/ops/home", "home", "홈", active == "home");
    AppendImageNavLink(out, "/ops/dashboard", "dashboard", "대시보드", active == "dashboard");
    AppendImageNavLink(out, "/ops/sources", "channels", "채널", active == "sources");
    AppendImageNavLink(out, "/ops/rules", "rules", "룰", active == "rules");
    if (principal.is_admin) {
        AppendImageNavLink(out, "/ops/users", "users", "사용자", active == "users", "data-admin-only");
    }
    AppendImageNavLink(out, "/client/live", "client", "클라이언트", false, R"(aria-label="클라이언트")");
    out << R"(          </nav>
        </div>
)";
    AppendProductAccountMenu(out, principal);
    out << R"(      </div>
    </header>
)";
}

void AppendOpsShellEndImpl(std::ostringstream& out) {
    AppendProductThemeScript(out);
    out << R"(  </main>
</body>
</html>)";
}

void AppendOpsDashboardPage(std::ostringstream& out) {
    out << R"(    <section class="panel ops-workspace ops-workspace-dashboard" data-ops-panel="dashboard" data-testid="ops-dashboard-page">
      <div class="ops-workspace-hero">
      )" << ProductUiToolbarHtml("운영 대시보드",
                                  "Source, runtime, event evidence를 같은 진단 흐름에서 판독합니다.",
                                  RefreshIconButtonHtml("opsDashboardRefresh", "button-secondary", "새로고침"),
                                  "panel-title-toolbar") << R"(
      </div>
      <div class="grid ops-metric-grid">
        <div class="metric-card"><span>활성 세션</span><strong id="dashActiveSessions">-</strong></div>
        <div class="metric-card"><span>활성 스트림</span><strong id="dashActiveStreams">-</strong></div>
        <div class="metric-card"><span>분석 탭</span><strong id="dashActiveTaps">-</strong></div>
        <div class="metric-card"><span>WHIP 소스</span><strong id="dashPublishSources">-</strong></div>
      </div>
      <div class="grid ops-dashboard-card-grid">
        )" << ProductUiSectionCardHtml("상태 요약",
                                        std::string(),
                                        ProductUiBadgeRowHtml({{"로딩 중", std::string()}},
                                                              std::string(),
                                                              "dashHealthBadges") +
                                            R"(<p id="dashHealthText">불러오는 중</p>)") << R"(
        <section class="section-card runtime-trend-card" data-testid="ops-runtime-trend-card" data-runtime-trend-scope="page-session-only" data-longrun-evidence="not-provided">
          <div>
            <h3>런타임 추세</h3>
            <p>현재 페이지 세션의 refresh sample만 baseline/sparkline 후보로 봅니다.</p>
          </div>
          <div id="dashRuntimeTrendBadges" class="badge-row"><span class="chip">sample 대기</span></div>
          <div id="dashRuntimeTrendSparkline" class="runtime-sparkline" aria-label="runtime trend sparkline"></div>
          <p id="dashRuntimeTrendText">장기 녹화 없이 현재 화면에서 수집한 sample을 기다립니다.</p>
          <p id="dashRuntimeTrendBaseline" class="runtime-trend-baseline">baseline: page-session-only · longrun evidence 아님</p>
        </section>
        )" << ProductUiSectionCardHtml("분석 재사용",
                                        std::string(),
                                        ProductUiBadgeRowHtml({{"로딩 중", std::string()}},
                                                              std::string(),
                                                              "dashRuntimeRows") +
                                            R"(<p id="dashRuntimeText">불러오는 중</p>)") << R"(
        )" << ProductUiSectionCardHtml("메타데이터 전송",
                                        std::string(),
                                        ProductUiBadgeRowHtml({{"로딩 중", std::string()}},
                                                              std::string(),
                                                              "dashBackpressureRows") +
                                            R"(<p id="dashBackpressureText">불러오는 중</p>)") << R"(
        )" << ProductUiSectionCardHtml("정리 상태",
                                        std::string(),
                                        ProductUiBadgeRowHtml({{"로딩 중", std::string()}},
                                                              std::string(),
                                                              "dashCleanupRows") +
                                            R"(<p id="dashCleanupText">불러오는 중</p>)") << R"(
      </div>
      <div class="ops-workspace-diagnostic-grid">
      <section class="section-card" data-testid="ops-root-cause-panel">
        <div class="toolbar">
          <div>
            <h3>문제 원인</h3>
          <p>소스 수명주기, 지연, 재연결, 권한/설정 상태와 다음 조치를 함께 봅니다.</p>
          </div>
        </div>
        <div id="dashRootCauseBadges" class="badge-row"><span class="chip">로딩 중</span></div>
        <p id="dashRootCauseText">불러오는 중</p>
        <div id="dashRootCauseList" class="root-cause-list">
          )" << ProductUiEmptyStateHtml("런타임 상태를 불러오는 중입니다.") << R"(
        </div>
        <div id="dashRootCauseActionOutput" class="root-cause-action-output" hidden></div>
      </section>
      <section class="section-card" data-testid="ops-incident-timeline-panel">
        <div class="toolbar">
          <div>
            <h3>최근 인시던트 흐름</h3>
            <p>문제 원인, EventRecord, source health, 로그 단서를 시간순으로 묶어 봅니다.</p>
          </div>
          <div class="actions incident-timeline-controls">
            <label>인시던트 검색
              <input id="dashIncidentTimelineSearch" placeholder="제목, 출처, incident/cid 검색" />
            </label>
            <label>출처
              <select id="dashIncidentTimelineSource" aria-label="출처">
                <option value="">전체 출처</option>
                <option value="root-cause">문제 원인</option>
                <option value="event-record">EventRecord</option>
                <option value="source-health">Source Health</option>
                <option value="rule-warning">Rule Warning</option>
                <option value="runtime-status">Runtime Status</option>
                <option value="log-tail">Log tail</option>
              </select>
            </label>
            <button type="button" class="secondary button-compact" id="dashIncidentTimelineShare" title="현재 인시던트 필터 링크 복사" aria-label="현재 인시던트 필터 링크 복사">링크 복사</button>
          </div>
        </div>
        <div id="dashIncidentTimelineBadges" class="badge-row"><span class="chip">로딩 중</span></div>
        <p id="dashIncidentTimelineText">불러오는 중</p>
        <div id="dashIncidentTimeline" class="root-cause-list">
          <div class="empty">최근 인시던트 단서를 불러오는 중입니다.</div>
        </div>
      </section>
      <section class="section-card ops-workspace-wide ops-command-workspace" data-testid="ops-command-workspace" data-v350-command-workspace="media-server.ops.v350-command-workspace-ui.v1">
        <div class="toolbar">
          <div>
            <h3>Command Workspace</h3>
            <p>incident, source, drill, staged plan, client impact를 하나의 read-only 흐름으로 봅니다.</p>
          </div>
        </div>
        <div id="dashCommandWorkspaceBadges" class="badge-row"><span class="chip">로딩 중</span></div>
        <p id="dashCommandWorkspaceText">command workspace read model을 불러오는 중입니다.</p>
        <div id="dashCommandWorkspaceFlow" class="ops-command-flow-grid" data-v350-command-workspace-flow="incident-source-drill-staged-plan-client-impact">
          <div class="empty">incident/source/drill/staged plan/client impact 흐름을 기다립니다.</div>
        </div>
        <div class="grid ops-command-workspace-detail-grid">
          <div>
            <h4>Staged Plans</h4>
            <div id="dashCommandWorkspacePlanList" class="ops-command-plan-list">
              <div class="empty">staged plan 후보를 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Client Impact</h4>
            <div id="dashCommandWorkspaceImpactList" class="ops-command-impact-list">
              <div class="empty">viewer-safe 영향 요약을 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Drill Ledger</h4>
            <div id="dashCommandWorkspaceLedgerList" class="ops-command-ledger-list" data-v350-drill-run-ledger="media-server.ops.v350-drill-run-ledger.v1">
              <div class="empty">drill run id, operator note, blocker, evidence refs, previous run diff를 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Operations Export Bundle</h4>
            <div id="dashCommandWorkspaceExportBundleMap" class="ops-export-bundle-list ops-handoff-map-list" data-v350-export-bundle-handoff-map="media-server.ops.v350-export-bundle-handoff-map.v1">
              <div class="empty">command plan refs, drill ledger refs, field evidence refs, client impact refs 기반 Handoff Map을 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Field Evidence Intake</h4>
            <div id="dashCommandWorkspaceFieldEvidenceIntake" class="ops-field-evidence-intake-list ops-field-evidence-condition-list" data-v350-field-evidence-intake="media-server.ops.v350-field-evidence-intake.v1">
              <div class="empty">ONVIF, external WHEP/TURN, cloud/VLM provider의 redacted field evidence와 execution conditions, not-run 상태를 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>VLM-assisted Ops Explanation</h4>
            <div id="dashCommandWorkspaceVlmAssistedExplanation" class="ops-vlm-assisted-explanation-list" data-v350-vlm-assisted-explanation="media-server.ops.v350-vlm-assisted-explanation.v1">
              <div class="empty">default-off VLM 보조 설명으로 command plan blocker, incident/source relation, operator review hint 요약을 기다립니다.</div>
            </div>
          </div>
        </div>
        <div id="dashCommandWorkspaceBoundary" class="ops-command-boundary">
          commandPlanExecuted=false · source/view/rule write=false · client/viewer raw material=false
        </div>
      </section>
      <section class="section-card ops-workspace-wide ops-simulation-workspace" data-testid="ops-simulation-workspace" data-v360-simulation-workspace="media-server.ops.v360-simulation-workspace-ui.v1">
        <div class="toolbar">
          <div>
            <h3>Simulation Workspace</h3>
            <p>simulation input, run, impact diff, readiness blocker를 read-only로 탐색합니다.</p>
          </div>
        </div>
        <div id="dashSimulationWorkspaceBadges" class="badge-row"><span class="chip">로딩 중</span></div>
        <p id="dashSimulationWorkspaceText">simulation workspace read model을 불러오는 중입니다.</p>
        <div class="grid ops-simulation-workspace-grid">
          <div>
            <h4>Simulation Input</h4>
            <div id="dashSimulationWorkspaceInputList" class="ops-simulation-workspace-list">
              <div class="empty">input pack 항목을 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Simulation Run</h4>
            <div id="dashSimulationWorkspaceRunList" class="ops-simulation-workspace-list">
              <div class="empty">simulation run envelope를 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Simulation Ledger</h4>
            <div id="dashSimulationWorkspaceLedgerList" class="ops-simulation-ledger-list" data-v360-simulation-run-ledger="media-server.ops.v360-simulation-run-ledger.v1">
              <div class="empty">simulation run id, input ref, result diff, operator note, previous run diff를 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Client Notice Preview</h4>
            <div id="dashSimulationWorkspaceNoticePreviewList" class="ops-simulation-notice-preview-list" data-v360-client-notice-preview="media-server.ops.v360-client-notice-preview.v1">
              <div class="empty">maintenance/degraded/recovering notice preview를 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Rule/VA What-if Replay</h4>
            <div id="dashSimulationWorkspaceWhatIfReplayList" class="ops-simulation-what-if-replay-list" data-v360-rule-va-what-if-replay-pack="media-server.ops.v360-rule-va-what-if-replay-pack.v1">
              <div class="empty">rule threshold, preset, scenario what-if 후보를 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Simulation Export Bundle</h4>
            <div id="dashSimulationWorkspaceExportBundleList" class="ops-simulation-export-bundle-list" data-v360-simulation-export-bundle="media-server.ops.v360-simulation-export-bundle.v1">
              <div class="empty">simulation input/output, blocker, handoff map 기반 redacted export bundle을 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Field Evidence Adapter</h4>
            <div id="dashSimulationWorkspaceFieldEvidenceAdapterList" class="ops-simulation-field-evidence-adapter-list" data-v360-field-evidence-simulation-adapter="media-server.ops.v360-field-evidence-simulation-adapter.v1">
              <div class="empty">ONVIF, external WHEP/TURN, cloud/VLM provider 조건부/not-run evidence를 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>VLM-assisted Simulation Explanation</h4>
            <div id="dashSimulationWorkspaceVlmAssistedExplanationList" class="ops-simulation-vlm-assisted-explanation-list" data-v360-vlm-assisted-simulation-explanation="media-server.ops.v360-vlm-assisted-simulation-explanation.v1">
              <div class="empty">default-off VLM 보조 설명으로 blocker, impact diff, operator review hint 요약을 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Impact Diff</h4>
            <div id="dashSimulationWorkspaceImpactList" class="ops-simulation-workspace-list">
              <div class="empty">source/rule impact diff를 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Readiness Blockers</h4>
            <div id="dashSimulationWorkspaceReadinessList" class="ops-simulation-workspace-list">
              <div class="empty">safe apply readiness blocker를 기다립니다.</div>
            </div>
          </div>
        </div>
        <div id="dashSimulationWorkspaceBoundary" class="ops-simulation-boundary">
          simulationRunExecuted=false · safeApplyPerformed=false · clientNoticeSent=false
        </div>
      </section>
      <section class="section-card ops-workspace-wide ops-site-operations-workspace" data-testid="ops-site-operations-workspace" data-v370-site-operations-workspace="media-server.ops.v370-site-operations-workspace-ui.v1">
        <div class="toolbar">
          <div>
            <h3>Site Operations Workspace</h3>
            <p>site list, health rollup, runbook queue, impact detail을 read-only로 탐색합니다.</p>
          </div>
        </div>
        <div id="dashSiteOperationsWorkspaceBadges" class="badge-row"><span class="chip">로딩 중</span></div>
        <p id="dashSiteOperationsWorkspaceText">site operations read model을 불러오는 중입니다.</p>
        <div class="grid ops-site-operations-grid">
          <div>
            <h4>Site List</h4>
            <div id="dashSiteOperationsSiteList" class="ops-site-operations-list">
              <div class="empty">site/source group projection을 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Health Rollup</h4>
            <div id="dashSiteOperationsHealthList" class="ops-site-operations-list">
              <div class="empty">site health rollup을 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Runbook Queue</h4>
            <div id="dashSiteOperationsRunbookQueue" class="ops-site-operations-list">
              <div class="empty">runbook instance ledger와 approval workflow를 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Impact Detail</h4>
            <div id="dashSiteOperationsImpactDetail" class="ops-site-operations-list">
              <div class="empty">site impact graph detail을 기다립니다.</div>
            </div>
          </div>
        </div>
        <div id="dashSiteOperationsBoundary" class="ops-site-operations-boundary">
          source/view/runbook/approval write=false · clientNoticeSent=false · media mutation=false
        </div>
      </section>
      <section class="section-card ops-workspace-wide ops-action-control-workspace" data-testid="ops-action-control-workspace" data-v380-action-control-workspace="media-server.ops.v380-action-control-workspace-ui.v1">
        <div class="toolbar">
          <div>
            <h3>Action Control Workspace</h3>
            <p>action request, approval state, readiness blocker, pilot candidate, receipt preview를 read-only 흐름으로 탐색합니다.</p>
          </div>
        </div>
        <div id="dashActionControlWorkspaceBadges" class="badge-row"><span class="chip">로딩 중</span></div>
        <p id="dashActionControlWorkspaceText">action control workspace read model을 불러오는 중입니다.</p>
        <div id="dashActionControlWorkspaceFlow" class="ops-action-control-flow-grid" data-v380-action-control-workspace-flow="request-approval-readiness-pilot-receipt">
          <div class="empty">request/approval/readiness/pilot/receipt 흐름을 기다립니다.</div>
        </div>
        <div class="grid ops-action-control-grid">
          <div>
            <h4>Request Ledger</h4>
            <div id="dashActionControlRequestList" class="ops-action-control-list">
              <div class="empty">action request ledger contract를 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Approval Gate</h4>
            <div id="dashActionControlApprovalList" class="ops-action-control-list">
              <div class="empty">approval decision state를 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Readiness Blockers</h4>
            <div id="dashActionControlReadinessList" class="ops-action-control-list">
              <div class="empty">readiness preflight blocker를 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Pilot Candidates</h4>
            <div id="dashActionControlPilotList" class="ops-action-control-list">
              <div class="empty">source recheck, notice draft, rule draft 후보를 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Receipt Preview</h4>
            <div id="dashActionControlReceiptList" class="ops-action-control-list">
              <div class="empty">future receipt bundle ref를 기다립니다.</div>
            </div>
          </div>
        </div>
        <div id="dashActionControlBoundary" class="ops-action-control-boundary">
          actionExecutionPerformed=false · actionRequestPersisted=false · approvalDecisionPersisted=false · readinessResultPersisted=false · sourceRecheckExecuted=false · clientNoticeSent=false
        </div>
      </section>
      <section class="section-card ops-workspace-wide ops-action-outcome-observer" data-testid="ops-action-outcome-observer" data-v380-outcome-observer-reconciliation="media-server.ops.v380-outcome-observer-reconciliation.v1">
        <div class="toolbar">
          <div>
            <h3>Outcome Observer</h3>
            <p>readiness, candidate, observed outcome diff를 not-run 상태로 비교합니다.</p>
          </div>
        </div>
        <div id="dashActionOutcomeObserverBadges" class="badge-row"><span class="chip">로딩 중</span></div>
        <p id="dashActionOutcomeObserverText">outcome observer read model을 불러오는 중입니다.</p>
        <div class="grid ops-action-outcome-grid">
          <div>
            <h4>Source Outcome</h4>
            <div id="dashActionOutcomeSourceList" class="ops-action-outcome-list">
              <div class="empty">source outcome diff를 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Event / Client Outcome</h4>
            <div id="dashActionOutcomeEventClientList" class="ops-action-outcome-list">
              <div class="empty">EventRecord/client outcome diff를 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Rule Draft Outcome</h4>
            <div id="dashActionOutcomeRuleList" class="ops-action-outcome-list">
              <div class="empty">rule draft outcome diff를 기다립니다.</div>
            </div>
          </div>
        </div>
        <div id="dashActionOutcomeBoundary" class="ops-action-outcome-boundary">
          actionExecutionPerformed=false · sourceRecheckExecuted=false · clientNoticeSent=false · ruleApplyPerformed=false · eventRecordWritePerformed=false
        </div>
      </section>
      <section class="section-card ops-workspace-wide ops-action-receipt-bundle" data-testid="ops-action-receipt-bundle" data-v380-action-receipt-bundle="media-server.ops.v380-action-receipt-bundle.v1">
        <div class="toolbar">
          <div>
            <h3>Action Receipt Bundle</h3>
            <p>request, approval, readiness, candidate, outcome diff를 redacted release-safe receipt로 묶습니다.</p>
          </div>
        </div>
        <div id="dashActionReceiptBundleBadges" class="badge-row"><span class="chip">로딩 중</span></div>
        <p id="dashActionReceiptBundleText">action receipt bundle read model을 불러오는 중입니다.</p>
        <div class="grid ops-action-receipt-grid">
          <div>
            <h4>Receipt Bundle</h4>
            <div id="dashActionReceiptBundleList" class="ops-action-receipt-list">
              <div class="empty">redacted receipt bundle 항목을 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Handoff Map</h4>
            <div id="dashActionReceiptHandoffList" class="ops-action-receipt-list">
              <div class="empty">release-safe handoff map을 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Redaction Review</h4>
            <div id="dashActionReceiptRedactionList" class="ops-action-receipt-list">
              <div class="empty">redaction review 항목을 기다립니다.</div>
            </div>
          </div>
        </div>
        <div id="dashActionReceiptBundleBoundary" class="ops-action-receipt-boundary">
          bundlePersisted=false · artifactFileWritePerformed=false · handoffWritePerformed=false · rawLocatorIncluded=false · credentialMaterialIncluded=false
        </div>
      </section>
      <section class="section-card ops-workspace-wide ops-field-connector-evidence-package" data-testid="ops-field-connector-evidence-package" data-v380-field-connector-evidence-package="media-server.ops.v380-field-connector-evidence-package.v1">
        <div class="toolbar">
          <div>
            <h3>Field Connector Evidence Package</h3>
            <p>ONVIF, external WHEP/TURN, cloud provider evidence 조건을 credential/endpoint 승인 기반 not-run package로 분리합니다.</p>
          </div>
        </div>
        <div id="dashFieldConnectorEvidenceBadges" class="badge-row"><span class="chip">로딩 중</span></div>
        <p id="dashFieldConnectorEvidenceText">field connector evidence package를 불러오는 중입니다.</p>
        <div class="grid ops-field-connector-grid">
          <div>
            <h4>Connector Evidence</h4>
            <div id="dashFieldConnectorEvidenceList" class="ops-field-connector-list">
              <div class="empty">connector evidence package 항목을 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Approval Conditions</h4>
            <div id="dashFieldConnectorConditionList" class="ops-field-connector-list">
              <div class="empty">credential/endpoint approval condition refs를 기다립니다.</div>
            </div>
          </div>
        </div>
        <div id="dashFieldConnectorBoundary" class="ops-field-connector-boundary">
          fieldSmokeExecuted=false · endpointProbePerformed=false · credentialProbePerformed=false · providerCallPerformed=false · media mutation=false
        </div>
      </section>
      <section class="section-card ops-workspace-wide ops-default-off-action-explanation" data-testid="ops-default-off-action-explanation" data-v380-default-off-action-explanation="media-server.ops.v380-default-off-action-explanation.v1">
        <div class="toolbar">
          <div>
            <h3>Default-off Action Explanation</h3>
            <p>approval blocker, readiness reason, outcome hint를 default-off VLM/runtime 설명 후보로 요약하되 provider/runtime call은 수행하지 않습니다.</p>
          </div>
        </div>
        <div id="dashDefaultOffActionExplanationBadges" class="badge-row"><span class="chip">로딩 중</span></div>
        <p id="dashDefaultOffActionExplanationText">default-off action explanation hints를 불러오는 중입니다.</p>
        <div id="dashDefaultOffActionExplanationList" class="ops-default-off-action-explanation-list">
          <div class="empty">default-off explanation 항목을 기다립니다.</div>
        </div>
        <div id="dashDefaultOffActionExplanationBoundary" class="ops-default-off-action-explanation-boundary">
          defaultEnabled=false · vlmProviderCallPerformed=false · vlmRuntimeCallPerformed=false · raw prompt/response=false · action execution=false
        </div>
      </section>
)" << OpsActionExecutionDeferralWorkspaceHtml() << R"(      <section class="section-card ops-workspace-wide ops-field-evidence-bridge-decision" data-testid="ops-field-evidence-bridge-decision" data-v390-field-evidence-bridge-decision="media-server.ops.v390-field-evidence-bridge-decision.v1">
        <div class="toolbar">
          <div>
            <h3>Field Evidence Bridge</h3>
            <p>external endpoint, credential, provider field evidence를 승인 기반 최소 evidence 계약으로만 분리합니다.</p>
          </div>
        </div>
        <div id="dashFieldEvidenceBridgeBadges" class="badge-row"><span class="chip">로딩 중</span></div>
        <p id="dashFieldEvidenceBridgeText">field evidence bridge decision을 불러오는 중입니다.</p>
        <div id="dashFieldEvidenceBridgeList" class="ops-field-connector-list">
          <div class="empty">field evidence bridge decision 항목을 기다립니다.</div>
        </div>
        <div id="dashFieldEvidenceBridgeBoundary" class="ops-field-connector-boundary">
          fieldSmokeExecuted=false · endpointProbePerformed=false · credentialProbePerformed=false · providerCallPerformed=false · releasePassClaimed=false
        </div>
      </section>
      <section class="section-card ops-workspace-wide ops-reid-assist-decision" data-testid="ops-reid-assist-decision" data-v390-reid-assist-decision="media-server.ops.v390-reid-assist-decision.v1">
        <div class="toolbar">
          <div>
            <h3>Re-ID Assist Decision</h3>
            <p>Re-ID assist를 명시 opt-in, model provenance, no-op fallback 기준으로 구분합니다.</p>
          </div>
        </div>
        <div id="dashReidAssistDecisionBadges" class="badge-row"><span class="chip">로딩 중</span></div>
        <p id="dashReidAssistDecisionText">Re-ID assist decision을 불러오는 중입니다.</p>
        <div id="dashReidAssistDecisionList" class="ops-action-control-list">
          <div class="empty">Re-ID assist gate 항목을 기다립니다.</div>
        </div>
        <div id="dashReidAssistDecisionBoundary" class="ops-action-control-boundary">
          explicitOptInRequired=true · modelBackedExecutionPerformed=false · embeddingSerialized=false · cropSerialized=false
        </div>
      </section>
      <section class="section-card ops-workspace-wide ops-site-client-notice-workspace" data-testid="ops-site-client-notice-workspace" data-v370-client-notice-by-site-view-group="media-server.ops.v370-client-notice-by-site-view-group.v1">
        <div class="toolbar">
          <div>
            <h3>Client Notice by Site/View Group</h3>
            <p>site/view group 기준 viewer-safe notice preview와 delivery queue 경계를 실제 발송 없이 확인합니다.</p>
          </div>
        </div>
        <div id="dashSiteClientNoticeBadges" class="badge-row"><span class="chip">로딩 중</span></div>
        <p id="dashSiteClientNoticeText">site/view group notice preview를 불러오는 중입니다.</p>
        <div class="grid ops-site-client-notice-grid">
          <div>
            <h4>Notice Preview</h4>
            <div id="dashSiteClientNoticePreviewList" class="ops-site-client-notice-list">
              <div class="empty">viewer-safe notice preview 항목을 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Delivery Queue Boundary</h4>
            <div id="dashSiteClientNoticeDeliveryQueue" class="ops-site-client-notice-list">
              <div class="empty">delivery-queue-preview 상태를 기다립니다.</div>
            </div>
          </div>
        </div>
        <div id="dashSiteClientNoticeBoundary" class="ops-site-client-notice-boundary">
          clientNoticeSent=false · viewerClientPayloadChanged=false · source/view write=false
        </div>
      </section>
      <section class="section-card ops-workspace-wide ops-site-rule-va-what-if-workspace" data-testid="ops-site-rule-va-what-if-workspace" data-v370-rule-va-what-if-by-site="media-server.ops.v370-rule-va-what-if-by-site.v1">
        <div class="toolbar">
          <div>
            <h3>Rule/VA What-if by Site</h3>
            <p>site 영향, EventRecord aggregate, VA fixture 기반 rule threshold/scenario 후보를 적용 없이 비교합니다.</p>
          </div>
        </div>
        <div id="dashSiteRuleVaWhatIfBadges" class="badge-row"><span class="chip">로딩 중</span></div>
        <p id="dashSiteRuleVaWhatIfText">site-scoped Rule/VA what-if 후보를 불러오는 중입니다.</p>
        <div class="grid ops-site-rule-va-what-if-grid">
          <div>
            <h4>What-if Candidates</h4>
            <div id="dashSiteRuleVaWhatIfCandidateList" class="ops-site-rule-va-what-if-list">
              <div class="empty">site-scoped Rule/VA what-if 후보를 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Site Impact Delta</h4>
            <div id="dashSiteRuleVaWhatIfImpactList" class="ops-site-rule-va-what-if-list">
              <div class="empty">site impact delta를 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>EventRecord / VA Fixture</h4>
            <div id="dashSiteRuleVaWhatIfFixtureList" class="ops-site-rule-va-what-if-list">
              <div class="empty">EventRecord aggregate와 VA fixture refs를 기다립니다.</div>
            </div>
          </div>
        </div>
        <div id="dashSiteRuleVaWhatIfBoundary" class="ops-site-rule-va-what-if-boundary">
          ruleRegistryWritePerformed=false · eventRecordWritePerformed=false · media mutation=false
        </div>
      </section>
      <section class="section-card ops-workspace-wide ops-site-field-evidence-attachment-workspace" data-testid="ops-site-field-evidence-attachment-workspace" data-v370-field-evidence-attachment="media-server.ops.v370-field-evidence-attachment.v1">
        <div class="toolbar">
          <div>
            <h3>Field Evidence Attachment</h3>
            <p>ONVIF, external WHEP/TURN, cloud/VLM 조건부 evidence를 site/runbook ref에 not-run 상태로 첨부합니다.</p>
          </div>
        </div>
        <div id="dashSiteFieldEvidenceAttachmentBadges" class="badge-row"><span class="chip">로딩 중</span></div>
        <p id="dashSiteFieldEvidenceAttachmentText">site/runbook field evidence attachment를 불러오는 중입니다.</p>
        <div class="grid ops-site-field-evidence-attachment-grid">
          <div>
            <h4>Attachment Refs</h4>
            <div id="dashSiteFieldEvidenceAttachmentList" class="ops-site-field-evidence-attachment-list">
              <div class="empty">site/runbook field evidence attachment를 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Condition Refs</h4>
            <div id="dashSiteFieldEvidenceAttachmentConditionList" class="ops-site-field-evidence-attachment-list">
              <div class="empty">conditional/not-run condition refs를 기다립니다.</div>
            </div>
          </div>
        </div>
        <div id="dashSiteFieldEvidenceAttachmentBoundary" class="ops-site-field-evidence-attachment-boundary">
          fieldSmokeExecuted=false · endpointProbePerformed=false · providerCallPerformed=false · media mutation=false
        </div>
      </section>
      <section class="section-card ops-workspace-wide ops-site-limited-safe-execution-pilot-workspace" data-testid="ops-site-limited-safe-execution-pilot-workspace" data-v370-limited-safe-execution-pilot="media-server.ops.v370-limited-safe-execution-pilot.v1">
        <div class="toolbar">
          <div>
            <h3>Limited Safe Execution Pilot</h3>
            <p>source recheck 또는 notice queue 후보만 approval-gated preview로 분리하고 실제 실행은 하지 않습니다.</p>
          </div>
        </div>
        <div id="dashSiteLimitedSafeExecutionPilotBadges" class="badge-row"><span class="chip">로딩 중</span></div>
        <p id="dashSiteLimitedSafeExecutionPilotText">limited safe execution pilot 후보를 불러오는 중입니다.</p>
        <div class="grid ops-site-limited-safe-execution-pilot-grid">
          <div>
            <h4>Pilot Candidates</h4>
            <div id="dashSiteLimitedSafeExecutionPilotList" class="ops-site-limited-safe-execution-pilot-list">
              <div class="empty">approval-gated pilot 후보를 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Approval Gates</h4>
            <div id="dashSiteLimitedSafeExecutionPilotGateList" class="ops-site-limited-safe-execution-pilot-list">
              <div class="empty">approval gate preview를 기다립니다.</div>
            </div>
          </div>
        </div>
        <div id="dashSiteLimitedSafeExecutionPilotBoundary" class="ops-site-limited-safe-execution-pilot-boundary">
          pilotExecutionPerformed=false · sourceRecheckExecuted=false · noticeQueueWritePerformed=false · clientNoticeSent=false
        </div>
      </section>
      <section class="section-card ops-workspace-wide ops-site-outcome-reconciliation-workspace" data-testid="ops-site-outcome-reconciliation-workspace" data-v370-outcome-reconciliation="media-server.ops.v370-outcome-reconciliation.v1">
        <div class="toolbar">
          <div>
            <h3>Outcome Reconciliation</h3>
            <p>pre-simulation ref와 post-execution ref를 source, EventRecord, client impact 축으로 비교하고 미실행 상태를 보존합니다.</p>
          </div>
        </div>
        <div id="dashSiteOutcomeReconciliationBadges" class="badge-row"><span class="chip">로딩 중</span></div>
        <p id="dashSiteOutcomeReconciliationText">outcome reconciliation diff를 불러오는 중입니다.</p>
        <div class="grid ops-site-outcome-reconciliation-grid">
          <div>
            <h4>Source Impact Diff</h4>
            <div id="dashSiteOutcomeReconciliationSourceList" class="ops-site-outcome-reconciliation-list">
              <div class="empty">source reconciliation diff를 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Event / Client Diff</h4>
            <div id="dashSiteOutcomeReconciliationEventClientList" class="ops-site-outcome-reconciliation-list">
              <div class="empty">EventRecord와 client impact diff를 기다립니다.</div>
            </div>
          </div>
        </div>
        <div id="dashSiteOutcomeReconciliationBoundary" class="ops-site-outcome-reconciliation-boundary">
          executionObserved=false · pilotExecutionPerformed=false · eventRecordWritePerformed=false · clientNoticeSent=false
        </div>
      </section>
      <section class="section-card ops-workspace-wide ops-site-export-handoff-bundle-workspace" data-testid="ops-site-export-handoff-bundle-workspace" data-v370-export-handoff-bundle="media-server.ops.v370-export-handoff-bundle.v1">
        <div class="toolbar">
          <div>
            <h3>Export / Handoff Bundle</h3>
            <p>site, runbook, evidence, approval, outcome ref를 redacted release-safe handoff bundle로 조합하고 실제 export/write는 하지 않습니다.</p>
          </div>
        </div>
        <div id="dashSiteExportHandoffBundleBadges" class="badge-row"><span class="chip">로딩 중</span></div>
        <p id="dashSiteExportHandoffBundleText">export handoff bundle을 불러오는 중입니다.</p>
        <div class="grid ops-site-export-handoff-bundle-grid">
          <div>
            <h4>Bundle Items</h4>
            <div id="dashSiteExportHandoffBundleList" class="ops-site-export-handoff-bundle-list">
              <div class="empty">release-safe bundle 항목을 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Handoff Map</h4>
            <div id="dashSiteExportHandoffMapList" class="ops-site-export-handoff-bundle-list">
              <div class="empty">handoff map entry를 기다립니다.</div>
            </div>
          </div>
          <div>
            <h4>Redaction Review</h4>
            <div id="dashSiteExportHandoffRedactionList" class="ops-site-export-handoff-bundle-list">
              <div class="empty">redaction review ref를 기다립니다.</div>
            </div>
          </div>
        </div>
        <div id="dashSiteExportHandoffBundleBoundary" class="ops-site-export-handoff-bundle-boundary">
          artifactExportExecuted=false · fileWritePerformed=false · handoffWritePerformed=false · raw material=false
        </div>
      </section>
      <section class="section-card ops-workspace-wide" data-testid="ops-runtime-operations-console">
        <div class="toolbar">
          <div>
            <h3>런타임 운영 판독</h3>
            <p>선택 tap의 scenario timeline, TrackHealth, recent EventRecord를 원인, 영향, 다음 조치 순서로 봅니다.</p>
          </div>
        </div>
        <div id="dashRuntimeOpsBadges" class="badge-row"><span class="chip">분석 탭 대기</span></div>
        <p id="dashRuntimeOpsText">활성 분석 탭이 있으면 운영 판독을 표시합니다.</p>
        <div id="dashRuntimeOpsList" class="root-cause-list">
          <div class="empty">런타임 운영 판독 대기 중입니다.</div>
        </div>
      </section>
      </div>
      <section class="section-card ops-workspace-wide">
        <div class="toolbar">
          <div>
            <h3>운영 상세</h3>
            <p>핵심 수치를 바로 봅니다.</p>
          </div>
        </div>
        <div class="status-stat-grid">
          <div class="status-stat"><span>송출</span><strong id="dashEgressCount">-</strong></div>
          <div class="status-stat"><span>발행</span><strong id="dashPublishCount">-</strong></div>
          <div class="status-stat"><span>재사용 그룹</span><strong id="dashReuseGroupCount">-</strong></div>
          <div class="status-stat"><span>메타데이터 채널</span><strong id="dashMetadataChannelCount">-</strong></div>
          <div class="status-stat"><span>SSE</span><strong id="dashSseClientCount">-</strong></div>
          <div class="status-stat"><span>WS</span><strong id="dashWsClientCount">-</strong></div>
        </div>
        <p id="dashDetailText">불러오는 중</p>
      </section>
      <section class="section-card ops-workspace-wide" data-testid="ops-va-quality-panel">
        <div class="toolbar">
          <div>
            <h3>라이브 VA 이벤트 품질</h3>
            <p>시나리오 타임라인, 트랙 상태 이슈, 룰 런타임 상태를 읽기 전용으로 봅니다.</p>
          </div>
          <div class="actions">
            <input id="dashVaQualityFilterInput" type="search" placeholder="시나리오, 룰, 트랙, 단계, 이슈" aria-label="라이브 VA 이벤트 품질 필터" />
          </div>
        </div>
        <div id="dashVaQualityBadges" class="badge-row"><span class="chip">분석 탭 대기</span></div>
        <p id="dashVaQualityText">활성 분석 탭이 있으면 타임라인과 트래킹 이슈를 표시합니다.</p>
        <div class="grid">
          <div>
            <h4>시나리오 타임라인</h4>
            <div id="dashScenarioTimeline" class="root-cause-list">
              <div class="empty">활성 시나리오 인스턴스가 없습니다.</div>
            </div>
          </div>
          <div>
            <h4>트래킹 이슈</h4>
            <div id="dashTrackingIssueGroups" class="root-cause-list">
              <div class="empty">트래킹 이슈 리포트가 없습니다.</div>
            </div>
          </div>
        </div>
      </section>
    </section>
)";
}

void AppendOpsRulesPage(std::ostringstream& out) {
    out << R"(    <section class="panel ops-workspace rules-workspace" data-ops-panel="rules" data-testid="ops-rules-page">
      <div class="toolbar panel-title-toolbar ops-workspace-hero">
        <div>
          <h2>룰 설정</h2>
          <p>종류를 고르고 목록을 관리합니다.</p>
        </div>
        )" << RefreshIconButtonHtml("opsRulesRefresh", "button-secondary", "새로고침") << R"(
      </div>
      <div id="opsRulesStatus" class="message" hidden></div>
      <div class="grid rules-metrics-grid">
        <div class="metric-card"><span>채널 분석 설정</span><strong id="rulesVaRuleCount">-</strong></div>
        <div class="metric-card"><span>이벤트 템플릿</span><strong id="rulesEventRuleCount">-</strong></div>
        <div class="metric-card"><span>프로파일</span><strong id="rulesProfileCount">-</strong></div>
        <div class="metric-card"><span>채널 연결</span><strong id="rulesViewBindingCount">-</strong></div>
      </div>
      <div class="rules-workspace-readiness-grid">
      <section class="section-card" data-testid="ops-rules-validation-panel">
        <div class="toolbar">
          <div>
            <h3>저장 전 검증</h3>
            <p id="opsRulesValidationSummary">룰 충돌과 누락을 확인합니다.</p>
          </div>
        </div>
        <div id="opsRulesValidationList" class="validation-list"></div>
      </section>
      <section class="section-card">
        <div class="toolbar">
          <div>
            <h3>먼저 준비할 항목</h3>
            <p id="opsRulesPrereqSummary">채널 분석 설정은 채널, 프로파일, 이벤트 템플릿을 준비한 뒤 만듭니다.</p>
          </div>
        </div>
        <div class="rules-prereq-grid">
          <article class="rules-prereq-card">
            <div class="badge-row">
              <span class="chip info">채널</span>
              <span id="opsRulesPrereqChannelsState" class="chip">확인 중</span>
            </div>
            <strong id="opsRulesPrereqChannelsCount">0개</strong>
            <p>채널 탭에서 입력 소스와 PublishedView를 먼저 준비합니다.</p>
            <div class="actions">
              <a class="button-secondary" href="/ops/sources">채널 열기</a>
            </div>
          </article>
          <article class="rules-prereq-card">
            <div class="badge-row">
              <span class="chip info">분석 프로파일</span>
              <span id="opsRulesPrereqProfilesState" class="chip">확인 중</span>
            </div>
            <strong id="opsRulesPrereqProfilesCount">0개</strong>
            <p>검출기, FPS, 신뢰도, 적응형 설정 같은 분석 엔진 설정을 먼저 만듭니다.</p>
            <div class="actions">
              <button id="opsRulesPrereqProfilesAction" class="button-secondary" type="button">프로파일 추가</button>
            </div>
          </article>
          <article class="rules-prereq-card">
            <div class="badge-row">
              <span class="chip info">이벤트 템플릿</span>
              <span id="opsRulesPrereqTemplatesState" class="chip">확인 중</span>
            </div>
            <strong id="opsRulesPrereqTemplatesCount">0개</strong>
            <p>이벤트 방식, 시나리오, 대상 객체, 조건값을 템플릿으로 먼저 정리합니다.</p>
            <div class="actions">
              <button id="opsRulesPrereqTemplatesAction" class="button-secondary" type="button">템플릿 추가</button>
            </div>
          </article>
          <article class="rules-prereq-card">
            <div class="badge-row">
              <span class="chip info">채널 분석 설정</span>
              <span id="opsRulesPrereqVaRulesState" class="chip">대기</span>
            </div>
            <strong id="opsRulesPrereqVaRulesCount">0개</strong>
            <p>채널에 이벤트 템플릿과 프로파일을 연결하고 영역/라인만 정하는 최종 조립 단계입니다.</p>
            <div class="actions">
              <button id="opsRulesPrereqVaRulesAction" class="button-primary" type="button">채널 분석 설정 추가</button>
            </div>
          </article>
        </div>
      </section>
      </div>
      <div class="rules-workspace-assist-grid">
      <section class="section-card ops-scenario-builder" data-testid="ops-scenario-builder" data-scenario-builder-contract="ui-only-no-engine-change">
        <div class="toolbar">
          <div>
            <h3>시나리오 빌더</h3>
            <p id="opsScenarioBuilderSummary">현장 preset과 대상 객체를 골라 이벤트 템플릿 초안을 만듭니다. 판단 엔진과 저장 payload 계약은 변경하지 않습니다.</p>
          </div>
          <div class="actions">
            <button id="opsScenarioBuilderApply" class="button-primary" type="button" data-scenario-builder-action="apply-event-template">템플릿 폼에 적용</button>
          </div>
        </div>
        <div class="scenario-builder-grid">
          <label>시나리오
            <select id="opsScenarioBuilderType" aria-label="시나리오">
              <option value="intrusion-dwell">침입 체류</option>
              <option value="re-entry">재진입</option>
              <option value="wrong-direction">역방향 이동</option>
              <option value="intrusion-after-line-crossing">라인 통과 후 침입</option>
              <option value="loitering">배회</option>
              <option value="zone-occupancy">구역 점유</option>
            </select>
          </label>
          <label>현장 preset
            <select id="opsScenarioBuilderPreset" aria-label="시나리오 빌더 현장 preset">
              <option value="default">기본</option>
              <option value="road">도로</option>
              <option value="retail">매장 통로</option>
              <option value="park">공원</option>
              <option value="indoor">실내</option>
              <option value="lobby">로비</option>
              <option value="platform">승강장</option>
              <option value="entrance">출입구</option>
              <option value="doorway">문 앞 정체</option>
              <option value="parking">주차장 가장자리</option>
              <option value="elevator">승강기 홀</option>
              <option value="custom">직접 설정</option>
            </select>
          </label>
          <label>대상 객체
            <input id="opsScenarioBuilderClasses" type="text" value="person, vehicle" placeholder="person, vehicle" />
          </label>
        </div>
        <div class="scenario-builder-review" aria-live="polite">
          <div>
            <strong id="opsScenarioBuilderBaselineTitle">초안 요약</strong>
            <p id="opsScenarioBuilderBaseline" class="form-note">시나리오와 preset을 고르면 시작값을 표시합니다.</p>
          </div>
          <details class="scenario-builder-draft-details">
            <summary>초안 payload 보기</summary>
            <pre id="opsScenarioBuilderDraft" class="scenario-builder-draft" data-redaction="no-source-or-raw-debug"></pre>
          </details>
        </div>
      </section>
      <section class="section-card ops-vlm-rule-draft-workflow" data-testid="ops-vlm-rule-draft-workflow" data-vlm-rule-draft-contract="draft-only-manual-save">
        <div class="toolbar">
          <div>
            <h3>VLM Rule draft</h3>
            <p id="opsVlmRuleDraftSummary">저장된 VLM observation 후보를 이벤트 템플릿 폼 초안으로만 가져옵니다.</p>
            <p id="opsVlmRuleDraftBridgeStatus" class="form-note">review-to-draft bridge: ops-review-to-rule-draft-bridge / provenance=incident-review-provenance / manual-save-only / autoApply=false / ruleRegistryWrite=false</p>
          </div>
          <div class="actions">
            <label>후보 종류
              <select id="opsVlmRuleDraftKindSelect" aria-label="VLM rule draft 후보 종류">
                <option value="">전체</option>
                <option value="line-crossing">라인 통과</option>
                <option value="intrusion-dwell">침입 체류</option>
                <option value="zone-occupancy">영역 점유</option>
              </select>
            </label>
            <button id="opsVlmRuleDraftRefresh" class="button-secondary" type="button">후보 새로고침</button>
          </div>
        </div>
        <div id="opsVlmRuleDraftList" class="ops-vlm-rule-draft-list" aria-live="polite">
          <div class="empty">후보를 불러오는 중입니다.</div>
        </div>
      </section>
      <section class="section-card ops-rule-what-if-draft-context" data-testid="ops-rule-what-if-preview-draft-context" data-rule-what-if-preview="draft-only-no-auto-save">
        <div class="toolbar">
          <div>
            <h3>Rule What-if draft context</h3>
            <p id="opsRuleWhatIfDraftContext">draftEventId와 whatIfPreview=1 query가 있으면 selected incident 저장 전 preview context를 표시합니다. 저장은 운영자가 수동으로 실행해야 합니다.</p>
          </div>
          <div class="badge-row"><span class="chip">draft-only</span><span class="chip">no auto apply</span></div>
        </div>
      </section>
      <section class="section-card ops-approval-gated-rule-draft-readiness" data-testid="ops-approval-gated-rule-draft-readiness" data-approval-gated-rule-draft="manual-approval-staged-only">
        <div class="toolbar">
          <div>
            <h3>Approval-gated Rule Draft Readiness</h3>
            <p id="opsApprovalGatedRuleDraftContext">approvalDraft=1 query가 있으면 저장 전 approval state, validation summary, staged draft context를 표시합니다.</p>
          </div>
          <div id="opsApprovalGatedRuleDraftBadges" class="badge-row"><span class="chip">no-auto-save</span><span class="chip">no-auto-apply</span></div>
        </div>
        <div id="opsApprovalGatedRuleDraftRows" class="ops-approval-gated-rule-draft-list">
          <p class="ops-rule-note">저장은 기존 `/ops/rules` 수동 저장 버튼에서만 수행됩니다.</p>
        </div>
      </section>
      </div>
      <div class="rules-workspace-catalog-grid">
      <section class="section-card rules-workspace-mode-panel">
        <div class="toolbar">
          <div>
            <h3>설정 종류</h3>
            <p id="opsRulesEditorSummary">무엇을 관리할지 고르고 같은 패턴으로 목록과 상세를 관리합니다.</p>
          </div>
          <div class="actions">
            <input id="opsRulesFilterInput" type="search" placeholder="이름, ID 검색" aria-label="룰 카탈로그 검색" />
          </div>
        </div>
        <div class="rule-mode-grid" role="group" aria-label="룰 설정 종류">
          <button id="opsAddVaRuleBtn" class="button-secondary rule-mode-button" type="button" aria-pressed="false">채널 분석 설정</button>
          <button id="opsAddEventRuleBtn" class="button-secondary rule-mode-button" type="button" aria-pressed="false">이벤트 템플릿</button>
          <button id="opsAddProfileBtn" class="button-secondary rule-mode-button" type="button" aria-pressed="false">분석 프로파일</button>
        </div>
      </section>
      <section id="opsVaRulesSection" class="section-card rules-workspace-table-panel">
        <div class="toolbar">
          <div>
            <h3>채널 분석 설정</h3>
            <p id="opsVaRuleSummary">저장된 항목입니다.</p>
          </div>
          <div class="actions">
            <button id="opsCreateVaRuleBtn" class="button-primary" type="button">채널 분석 설정 추가</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="ops-data-table ops-responsive-table ops-rules-table ops-rules-va-table">
            <colgroup>
              <col class="ops-rules-col-id" />
              <col class="ops-rules-col-source" />
              <col class="ops-rules-col-template" />
              <col class="ops-rules-col-profile" />
              <col class="ops-rules-col-tracking" />
              <col class="ops-rules-col-geometry" />
              <col class="ops-rules-col-output" />
              <col class="ops-rules-col-status" />
              <col class="ops-rules-col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>ID</th>
                <th>채널</th>
                <th>이벤트 템플릿</th>
                <th>분석 프로파일</th>
                <th>Tracker/Re-ID</th>
                <th>영역/라인</th>
                <th>URL 복사</th>
                <th>상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody id="opsVaRuleRows"><tr><td colspan="9">로딩 중</td></tr></tbody>
          </table>
        </div>
      </section>
      <section id="opsEventRulesSection" class="section-card rules-workspace-table-panel">
        <div class="toolbar">
          <div>
            <h3>이벤트 템플릿</h3>
            <p id="opsEventRuleSummary">저장된 항목입니다.</p>
          </div>
          <div class="actions">
            <button id="opsCreateEventRuleBtn" class="button-primary" type="button">이벤트 템플릿 추가</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="ops-data-table ops-responsive-table ops-rules-table ops-rules-event-table">
            <colgroup>
              <col class="ops-event-col-id" />
              <col class="ops-event-col-mode" />
              <col class="ops-event-col-analysis" />
              <col class="ops-event-col-target" />
              <col class="ops-event-col-condition" />
              <col class="ops-event-col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>ID</th>
                <th>구분</th>
                <th>종류</th>
                <th>대상</th>
                <th>조건</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody id="opsEventRuleRows"><tr><td colspan="6">로딩 중</td></tr></tbody>
          </table>
        </div>
      </section>
      <section id="opsProfileRulesSection" class="section-card rules-workspace-table-panel">
        <div class="toolbar">
          <div>
            <h3>분석 프로파일</h3>
            <p id="opsProfileSummary">저장된 항목입니다.</p>
          </div>
          <div class="actions">
            <button id="opsCreateProfileBtn" class="button-primary" type="button">분석 프로파일 추가</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="ops-data-table ops-responsive-table ops-rules-table ops-rules-profile-table">
            <colgroup>
              <col class="ops-profile-col-id" />
              <col class="ops-profile-col-detector" />
	              <col class="ops-profile-col-fps" />
	              <col class="ops-profile-col-input" />
	              <col class="ops-profile-col-target" />
	              <col class="ops-profile-col-usage" />
	              <col class="ops-profile-col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>ID</th>
	                <th>검출기</th>
	                <th>FPS</th>
	                <th>입력</th>
	                <th>추적 대상</th>
	                <th>사용처</th>
	                <th>작업</th>
	              </tr>
	            </thead>
	            <tbody id="opsProfileRows"><tr><td colspan="7">로딩 중</td></tr></tbody>
          </table>
        </div>
      </section>
      </div>
      <section id="opsRulesDetailPanel" class="section-card ops-detail-panel rules-workspace-detail-panel" hidden>
        <div class="toolbar">
          <div>
            <div class="badge-row"><span id="opsRulesDetailMode" class="chip info">상세</span><span id="opsRulesDetailId" class="chip">-</span></div>
            <h3 id="opsRulesComposerTitle">상세</h3>
            <p id="opsRulesComposerHint" class="form-note">저장된 내용입니다.</p>
          </div>
          <div class="actions">
            <button id="opsRulesComposerEdit" class="button-secondary" type="button">수정</button>
            <button id="opsRulesComposerSave" class="button-primary" type="button">저장</button>
            <button id="opsRulesComposerClose" class="button-secondary" type="button">닫기</button>
          </div>
        </div>
        <div id="opsRulesComposerSteps" class="rule-step-strip" aria-label="현재 작성 단계" hidden></div>
        <section id="opsRulesReviewLoop" class="ops-rule-review-loop" data-testid="ops-rule-scenario-review-loop" data-rule-review-contract="draft-only-no-schema-change" data-review-loop="expected-event-type-conflict-missing-reference-preset-eventrecord-coverage" hidden>
          <div class="toolbar compact-toolbar">
            <div>
              <strong>저장 전 검토</strong>
              <p id="opsRulesReviewSummary" class="form-note">예상 event type, 참조/충돌, preset 영향, EventRecord coverage 연결을 저장 전에 확인합니다.</p>
            </div>
            <a id="opsRulesReviewEventRecordLink" class="button-secondary" href="/ops/events" data-event-record-coverage-link="/ops/events">EventRecord 열기</a>
          </div>
          <div class="ops-rule-review-grid">
            <article class="ops-rule-review-item" data-rule-review-item="event-type">
              <span id="opsRulesReviewEventTypeChip" class="chip info">event</span>
              <strong id="opsRulesReviewEventTypeTitle">-</strong>
              <p id="opsRulesReviewEventTypeDetail">저장될 이벤트 종류를 계산합니다.</p>
            </article>
            <article class="ops-rule-review-item" data-rule-review-item="conflict">
              <span id="opsRulesReviewConflictChip" class="chip">conflict</span>
              <strong id="opsRulesReviewConflictTitle">-</strong>
              <p id="opsRulesReviewConflictDetail">중복 ID, priority, source/class 충돌을 확인합니다.</p>
            </article>
            <article class="ops-rule-review-item" data-rule-review-item="missing-reference">
              <span id="opsRulesReviewMissingChip" class="chip">reference</span>
              <strong id="opsRulesReviewMissingTitle">-</strong>
              <p id="opsRulesReviewMissingDetail">채널, PublishedView, 템플릿, 프로파일 참조를 확인합니다.</p>
            </article>
            <article class="ops-rule-review-item" data-rule-review-item="preset-impact">
              <span id="opsRulesReviewPresetChip" class="chip">preset</span>
              <strong id="opsRulesReviewPresetTitle">-</strong>
              <p id="opsRulesReviewPresetDetail">시나리오 preset이 숫자 조건에 주는 영향을 표시합니다.</p>
            </article>
            <article class="ops-rule-review-item" data-rule-review-item="event-record-coverage">
              <span id="opsRulesReviewCoverageChip" class="chip">coverage</span>
              <strong id="opsRulesReviewCoverageTitle">-</strong>
              <p id="opsRulesReviewCoverageDetail">EventRecord coverage 확인 위치를 연결합니다.</p>
            </article>
          </div>
        </section>
        <form id="opsVaRuleForm" hidden>
          <div class="row">
            <div class="generated-id-control">
              <span class="form-label">ID</span>
              <input id="opsVaRuleIdInput" type="hidden" />
              <span id="opsVaRuleIdDisplay" class="generated-id-field" data-generated-id="va-rule">자동 배정</span>
            </div>
            <label>이름<input id="opsVaRuleNameInput" type="text" placeholder="채널 분석 설정 이름" /></label>
            <label>상태
              <select id="opsVaRuleEnabledInput">
                <option value="true">활성</option>
                <option value="false">비활성</option>
              </select>
            </label>
          </div>
          <div class="row">
            <label>채널
              <select id="opsVaRuleChannelSelect"></select>
            </label>
            <label>이벤트 템플릿
              <select id="opsVaRuleTemplateSeedSelect"></select>
            </label>
            <label>분석 프로파일
              <select id="opsVaRuleProfileSelect"></select>
            </label>
          </div>
          <p id="opsVaRuleBindingSummary" class="form-note">이벤트 템플릿과 프로파일을 고른 뒤 선택한 채널의 source와 PublishedView에 연결합니다.</p>
          <section class="ops-selection-review" aria-labelledby="opsVaRuleTrackingHeading">
            <div>
              <strong id="opsVaRuleTrackingHeading">Tracker / Re-ID</strong>
              <p id="opsVaRuleTrackingSummary" class="form-note">Lite tracker · Re-ID off</p>
            </div>
            <div class="row">
              <label>Tracker
                <select id="opsVaRuleTrackerSelect" aria-label="Tracker">
                  <option value="lite">Lite</option>
                  <option value="none">사용 안 함</option>
                  <option value="kalman-lite">Kalman-lite</option>
                  <option value="bytetrack">ByteTrack</option>
                </select>
              </label>
              <label>Re-ID
                <select id="opsVaRuleReidSelect" aria-label="Re-ID">
                  <option value="off">Off</option>
                  <option value="assist">Assist</option>
                </select>
              </label>
            </div>
          </section>
          <section class="ops-selection-review" aria-labelledby="opsVaRuleTemplateSummaryHeading">
            <div>
              <strong id="opsVaRuleTemplateSummaryHeading">선택한 템플릿 요약</strong>
              <p id="opsVaRuleTemplateSummary" class="form-note">이벤트 템플릿을 고르면 시나리오와 대상 객체를 그대로 따릅니다.</p>
            </div>
          </section>
          <section class="ops-template-settings ops-va-stage-settings" aria-labelledby="opsVaRuleGeometryHeading">
            <div>
              <strong id="opsVaRuleGeometryHeading">채널 미리보기와 영역/라인 설정</strong>
              <p class="form-note">선택한 채널 영상을 보면서 같은 영역에서 영역/라인을 정합니다. 개발자용 좌표는 필요할 때만 아래에서 펼쳐 봅니다.</p>
            </div>
            <div class="ops-va-stage-grid ops-va-stage-grid-single">
              <section class="ops-va-stage-panel" aria-labelledby="opsVaRulePreviewHeading">
                <div class="toolbar compact-toolbar">
                  <div>
                    <strong id="opsVaRulePreviewHeading">영상 위 영역/라인 편집</strong>
                    <p id="opsVaRulePreviewSummary" class="form-note">채널을 고른 뒤 재생하고 같은 화면 위에 영역/라인을 그립니다.</p>
                  </div>
                  <div class="actions">
                    <button id="opsVaRulePreviewStartBtn" class="button-secondary" type="button">재생</button>
                    <button id="opsVaRulePreviewRestartBtn" class="button-secondary" type="button">재연결</button>
                    <button id="opsVaRulePreviewStopBtn" class="button-secondary" type="button">정지</button>
                  </div>
                </div>
                <div class="ops-geometry-status-grid" aria-label="영역 편집 상태">
                  <div class="ops-geometry-status-card">
                    <span>편집 모드</span>
                    <strong id="opsVaRuleGeometryModeText">영역</strong>
                  </div>
                  <div class="ops-geometry-status-card">
                    <span>점 개수</span>
                    <strong id="opsVaRuleGeometryPointCountText">0/12</strong>
                  </div>
                  <div class="ops-geometry-status-card">
                    <span>저장 조건</span>
                    <strong id="opsVaRuleGeometryMinimumText">최소 3점</strong>
                  </div>
                  <div class="ops-geometry-status-card">
                    <span>방향</span>
                    <strong id="opsVaRuleGeometryDirectionText">영역 내부</strong>
                  </div>
                </div>
                <div class="ops-rule-preview-stage">
                  <video id="opsVaRulePreviewVideo" playsinline muted></video>
                  <svg id="opsVaRuleGeometryPreview" class="ops-geometry-overlay" viewBox="0 0 100 56.25" aria-label="영역 미리보기"></svg>
                  <span id="opsVaRulePreviewPlaceholder">채널을 고른 뒤 재생하세요.</span>
                </div>
                <div class="toolbar compact-toolbar ops-geometry-toolbar">
                  <div>
                    <strong id="opsVaRuleGeometryCanvasHeading">영역/라인</strong>
                    <p id="opsVaRuleGeometrySummary" class="form-note">미리보기 영역을 눌러 점을 추가합니다. 라인은 2점, 영역은 3점 이상이 필요합니다.</p>
                  </div>
                  <div class="actions">
                    <button id="opsVaRuleGeometryDefaultBtn" class="button-secondary" type="button">기본 좌표</button>
                    <button id="opsVaRuleGeometryUndoBtn" class="button-secondary" type="button">되돌리기</button>
                    <button id="opsVaRuleGeometryDeleteLastBtn" class="button-secondary" type="button">마지막 점 삭제</button>
                    <button id="opsVaRuleGeometryClearBtn" class="button-secondary" type="button">비우기</button>
                  </div>
                </div>
              </section>
            </div>
            <details class="inline-details">
              <summary>개발자용 좌표 보기</summary>
              <div class="row">
                <label>형태
                  <input id="opsVaRuleGeometryKindText" type="text" readonly />
                </label>
                <label>좌표
                  <textarea id="opsVaRuleGeometryPointsInput" rows="5" placeholder="0.20,0.22&#10;0.80,0.22&#10;0.80,0.78&#10;0.20,0.78"></textarea>
                </label>
              </div>
            </details>
          </section>
        </form>
        <form id="opsEventRuleForm" hidden>
          <div class="row">
            <div class="generated-id-control">
              <span class="form-label">ID</span>
              <input id="opsEventRuleIdInput" type="hidden" />
              <span id="opsEventRuleIdDisplay" class="generated-id-field" data-generated-id="event-rule">자동 배정</span>
            </div>
          </div>
          <div class="row">
            <label>구성
              <select id="opsEventRuleModeSelect" aria-label="구성">
                <option value="event">이벤트</option>
                <option value="scenario">시나리오</option>
              </select>
            </label>
            <label>종류
              <select id="opsEventRuleTypeSelect" aria-label="종류"></select>
            </label>
            <label id="opsEventRulePresetField">현장 preset
              <select id="opsEventRulePresetSelect" aria-label="이벤트 템플릿 현장 preset">
                <option value="default">기본</option>
                <option value="road">도로</option>
                <option value="retail">매장 통로</option>
                <option value="park">공원</option>
                <option value="indoor">실내</option>
                <option value="lobby">로비</option>
                <option value="platform">승강장</option>
                <option value="entrance">출입구</option>
                <option value="doorway">문 앞 정체</option>
                <option value="parking">주차장 가장자리</option>
                <option value="elevator">승강기 홀</option>
                <option value="custom">직접 설정</option>
              </select>
            </label>
            <label>최소 신뢰도
              <input id="opsEventRuleConfidenceInput" type="number" min="0" max="1" step="0.01" placeholder="0.25" />
            </label>
            <label id="opsEventRuleMinDurationField">최소 지속 시간(ms)
              <input id="opsEventRuleMinDurationInput" type="number" min="0" step="100" placeholder="0" />
            </label>
          </div>
          <p id="opsEventRulePresetSummary" class="form-note">현장 preset은 시작값입니다. 저장 전 replay/현장 영상 기준으로 geometry와 숫자 조건을 확인하세요.</p>
          <section class="ops-category-section" aria-labelledby="opsEventRuleClassesHeading">
            <div class="ops-category-header">
              <div>
                <strong id="opsEventRuleClassesHeading">대상 객체</strong>
                <p class="form-note">템플릿에서 기본으로 제안할 객체를 고릅니다.</p>
              </div>
              <div class="ops-category-actions">
                <button id="opsEventRuleClassesDefaultBtn" class="button-secondary" type="button">기본</button>
                <button id="opsEventRuleClassesAllBtn" class="button-secondary" type="button">전체 선택</button>
                <button id="opsEventRuleClassesClearBtn" class="button-secondary" type="button">전체 해제</button>
              </div>
            </div>
            <div id="opsEventRuleClassChecks" class="ops-category-grid"></div>
            <p id="opsEventRuleClassesSummary" class="form-note">사람, 차량</p>
          </section>
          <section class="ops-template-settings" aria-labelledby="opsEventRuleSettingsHeading">
            <div>
              <strong id="opsEventRuleSettingsHeading">이벤트 조건</strong>
              <p class="form-note">템플릿이 담당하는 판단 조건과 재알림 규칙입니다.</p>
            </div>
            <div class="row">
              <label id="opsEventRuleLineDirectionField" hidden>라인 방향
                <select id="opsEventRuleLineDirectionSelect" aria-label="라인 방향">
                  <option value="any">양방향</option>
                  <option value="forward">정방향</option>
                  <option value="reverse">역방향</option>
                </select>
              </label>
              <label id="opsEventRuleCandidateField" hidden>후보 판단 시간(ms)
                <input id="opsEventRuleCandidateInput" type="number" min="0" step="500" placeholder="2000" />
              </label>
              <label id="opsEventRuleDwellField" hidden>확정/체류 시간(ms)
                <input id="opsEventRuleDwellInput" type="number" min="0" step="500" placeholder="10000" />
              </label>
            </div>
            <div class="row">
              <label id="opsEventRuleReEntryWindowField" hidden>재진입 허용 시간(ms)
                <input id="opsEventRuleReEntryWindowInput" type="number" min="0" step="1000" placeholder="10000" />
              </label>
              <label id="opsEventRuleReEntryModeField" hidden>재진입 기준
                <select id="opsEventRuleReEntryModeSelect" aria-label="재진입 기준">
                  <option value="same-zone">같은 영역</option>
                  <option value="configured-zones">지정 영역 A→B 후보</option>
                </select>
              </label>
              <label id="opsEventRuleLineDelayField" hidden>라인 후 최대 지연(ms)
                <input id="opsEventRuleLineDelayInput" type="number" min="0" step="1000" placeholder="10000" />
              </label>
            </div>
            <div class="row">
              <label id="opsEventRuleTriggerDirectionField" hidden>트리거 라인 방향
                <select id="opsEventRuleTriggerDirectionSelect" aria-label="트리거 라인 방향">
                  <option value="any">양방향</option>
                  <option value="forward">정방향</option>
                  <option value="reverse">역방향</option>
                </select>
              </label>
              <label id="opsEventRuleLoiteringRadiusField" hidden>최대 이동 반경
                <input id="opsEventRuleLoiteringRadiusInput" type="number" min="0.01" max="1" step="0.01" placeholder="0.08" />
              </label>
              <label id="opsEventRuleLoiteringPointsField" hidden>최소 이동 경로 점수
                <input id="opsEventRuleLoiteringPointsInput" type="number" min="2" step="1" placeholder="4" />
              </label>
              <label id="opsEventRuleLoiteringGroundPlaneField" hidden>Ground-plane 반경
                <input id="opsEventRuleLoiteringGroundPlaneToggle" type="checkbox" />
              </label>
            </div>
            <div class="row">
              <label id="opsEventRuleZoneThresholdField" hidden>점유 임계값
                <input id="opsEventRuleZoneThresholdInput" type="number" min="1" step="1" placeholder="4" />
              </label>
              <label id="opsEventRuleZoneDwellField" hidden>최소 점유 체류(ms)
                <input id="opsEventRuleZoneDwellInput" type="number" min="0" step="1000" placeholder="7000" />
              </label>
              <label id="opsEventRuleCooldownField">재알림 대기(ms)
                <input id="opsEventRuleCooldownInput" type="number" min="0" step="1000" placeholder="5000" />
              </label>
            </div>
            <div class="row">
              <label id="opsEventRuleTargetZonesField" hidden>대상 영역 ID
                <input id="opsEventRuleTargetZonesInput" type="text" placeholder="zone-entry, zone-core" />
              </label>
              <label id="opsEventRuleRestrictedZonesField" hidden>관찰/제한 영역 ID
                <input id="opsEventRuleRestrictedZonesInput" type="text" placeholder="zone-main, zone-restricted" />
              </label>
              <label id="opsEventRuleReEntryZonesField" hidden>재진입 영역 ID
                <input id="opsEventRuleReEntryZonesInput" type="text" placeholder="zone-a, zone-b" />
              </label>
            </div>
          </section>
          <p id="opsEventRuleFormNote" class="form-note">여러 채널 분석 설정에서 다시 고를 수 있는 공통 이벤트 템플릿입니다.</p>
        </form>
        <form id="opsProfileForm" hidden>
          <div class="row">
            <div class="generated-id-control">
              <span class="form-label">ID</span>
              <input id="opsProfileIdInput" type="hidden" />
              <span id="opsProfileIdDisplay" class="generated-id-field" data-generated-id="profile">자동 배정</span>
            </div>
            <label>검출기
              <select id="opsProfileDetectorSelect" aria-label="검출기">
                <option value="yolo">yolo</option>
                <option value="dummy">dummy</option>
                <option value="server-config">server-config</option>
              </select>
            </label>
            <label>FPS<input id="opsProfileFpsInput" type="number" min="1" step="1" placeholder="6" /></label>
          </div>
          <div class="row">
            <label>Queue<input id="opsProfileQueueInput" type="number" min="1" step="1" placeholder="1" /></label>
            <label>Confidence<input id="opsProfileConfidenceInput" type="number" min="0" max="1" step="0.01" placeholder="0.25" /></label>
            <label>NMS<input id="opsProfileNmsInput" type="number" min="0" max="1" step="0.01" placeholder="0.45" /></label>
          </div>
          <div class="row">
            <label>입력 폭<input id="opsProfileInputWidthInput" type="number" min="1" step="1" placeholder="640" /></label>
            <label>입력 높이<input id="opsProfileInputHeightInput" type="number" min="1" step="1" placeholder="640" /></label>
          </div>
	          <div class="checks">
	            <label><input id="opsProfileAdaptiveToggle" type="checkbox" checked /> 적응형 튜닝</label>
	          </div>
	          <section class="ops-category-section" aria-labelledby="opsProfileClassesHeading">
	            <div class="ops-category-header">
	              <div>
	                <strong id="opsProfileClassesHeading">추적 대상</strong>
	                <p class="form-note">이 프로파일의 tracker가 유지할 객체 범주를 고릅니다.</p>
	              </div>
	              <div class="ops-category-actions">
	                <button id="opsProfileClassesDefaultBtn" class="button-secondary" type="button">기본</button>
	                <button id="opsProfileClassesAllBtn" class="button-secondary" type="button">전체 선택</button>
	                <button id="opsProfileClassesClearBtn" class="button-secondary" type="button">전체 해제</button>
	              </div>
	            </div>
	            <div id="opsProfileClassChecks" class="ops-category-grid"></div>
	            <p id="opsProfileClassesSummary" class="form-note">사람, 차량</p>
	          </section>
	          <p id="opsProfileSummaryText" class="form-note">검출기, FPS, 신뢰도, 입력 크기와 추적 대상 같은 분석 엔진 설정을 정의합니다.</p>
        </form>
      </section>
      <section class="section-card ops-audit-panel rules-workspace-audit-panel">
        <div class="toolbar">
          <div>
            <h3>변경 이력</h3>
            <p>서버 감사 로그에서 룰 변경의 작업자, 전/후 값, 시각을 확인하고 룰 감사 JSON/CSV/Diff JSON export를 내려받습니다.</p>
          </div>
          <button id="opsRulesAuditRefresh" class="button-secondary" type="button">새로고침</button>
        </div>
        <div id="ops-rules-audit-list" class="audit-list" data-audit-area="rules"></div>
      </section>
    </section>
)";
}

void AppendOpsEventsPage(std::ostringstream& out) {
    out << R"(    <section class="panel ops-workspace ops-workspace-events" data-ops-panel="events" data-testid="ops-events-page" data-route-scope="operator-event-review" data-event-review-workflow="operator-inbox">
      <div class="toolbar panel-title-toolbar ops-workspace-hero">
        <div>
          <h2>Operator Event Review Inbox</h2>
          <p>Primary nav에는 표시하지 않는 운영자 event review direct route입니다. EventRecord list/detail, evidence refs, review state, operator note, false-positive/action target을 한 작업대에서 확인합니다.</p>
        </div>
        <div class="actions">
          <a class="button button-secondary" href="/ops/dashboard">대시보드</a>
          <a class="button button-secondary" href="/ops/rules">룰</a>
          )" << RefreshIconButtonHtml("opsEventsRefresh", "button-secondary", "새로고침") << R"(
        </div>
      </div>
      <div class="grid ops-workspace-event-grid">
        <section class="section-card">
          <h3>이벤트 저장소</h3>
          <div id="eventStorageBadges" class="badge-row"><span class="chip">로딩 중</span></div>
          <p id="eventStorageText">불러오는 중</p>
        </section>
        <section class="section-card">
          <h3>Event POST</h3>
          <div id="eventPostBadges" class="badge-row"><span class="chip">로딩 중</span></div>
          <p id="eventPostText">불러오는 중</p>
        </section>
        <section class="section-card">
          <h3>증거 정책</h3>
          <div id="eventEvidencePolicyBadges" class="badge-row"><span class="chip">로딩 중</span></div>
          <p id="eventEvidencePolicyText">이벤트 기반 짧은 증거 범위를 확인합니다.</p>
        </section>
        <section class="section-card">
          <h3>Export / 보존</h3>
          <div id="eventExportPolicyBadges" class="badge-row"><span class="chip">로딩 중</span></div>
          <p id="eventExportPolicyText">증거 export와 삭제 권한을 확인합니다.</p>
        </section>
      </div>
      <section class="section-card ops-workspace-wide incident-memory-search" data-testid="ops-events-semantic-search" data-incident-memory-search="local-index">
        <div class="toolbar">
          <div>
            <h3>Incident Memory Search</h3>
            <p id="opsIncidentSearchSummary">자연어/키워드 검색과 rule/source/status/time filter로 matched evidence highlight를 확인합니다.</p>
          </div>
          <div id="opsIncidentSearchBadges" class="badge-row"><span class="chip">local-only</span></div>
        </div>
        <div class="actions event-review-controls incident-memory-search-grid">
          <label>검색
            <input id="opsIncidentSearchInput" placeholder="loading bay acknowledged, stale metadata..." />
          </label>
          <label>Rule
            <input id="opsIncidentSearchRuleFilter" placeholder="ruleId" />
          </label>
          <label>Source
            <input id="opsIncidentSearchSourceFilter" placeholder="sourceId/streamId" />
          </label>
          <label>Incident 상태
            <select id="opsIncidentSearchStatusFilter">
              <option value="">전체</option>
              <option value="new">new</option>
              <option value="review-needed">review-needed</option>
              <option value="acknowledged">acknowledged</option>
              <option value="in-progress">in-progress</option>
              <option value="closed">closed</option>
              <option value="false-positive">false-positive</option>
            </select>
          </label>
          <label>시작(ms)
            <input id="opsIncidentSearchStartTime" inputmode="numeric" placeholder="startTimeMs" />
          </label>
          <label>종료(ms)
            <input id="opsIncidentSearchEndTime" inputmode="numeric" placeholder="endTimeMs" />
          </label>
        </div>
        <div id="opsIncidentSearchRows" class="incident-memory-results" data-incident-memory-results="matched-evidence-highlight">
          <p class="ops-rule-note">검색어를 입력하면 EventRecord/review projection의 matched evidence highlight가 표시됩니다.</p>
        </div>
        <div class="vlm-summary-candidate-review" data-testid="ops-vlm-summary-candidate-review" data-vlm-summary-candidate-review="ops-only-manual-review">
          <div class="toolbar">
            <div>
              <h4>VLM Summary Candidate Review</h4>
              <p id="opsVlmSummaryCandidateSummary">같은 검색어로 VLM summary candidate를 Ops-only manual review 후보로 확인합니다.</p>
            </div>
            <div id="opsVlmSummaryCandidateBadges" class="badge-row"><span class="chip">ops-only</span></div>
          </div>
          <div id="opsVlmSummaryCandidateRows" class="vlm-summary-candidate-list">
            <p class="ops-rule-note">검색어를 입력하면 sidecar summary candidate가 자동 적용 없이 표시됩니다.</p>
          </div>
        </div>
      </section>
      <section class="section-card ops-workspace-wide v300-event-evidence-search-ui" data-testid="ops-v300-event-evidence-search-ui" data-v300-ops-events-ui="event-evidence-search-detail">
        <div class="toolbar">
          <div>
            <h3>Feature/Search Evidence Detail</h3>
            <p id="opsV300EventEvidenceSearchSummary">V300 Feature/Search Index projection으로 evidence timeline, feature reasons, retry, pin, retention status를 확인합니다.</p>
          </div>
          <div id="opsV300EventEvidenceSearchBadges" class="badge-row"><span class="chip">media-server.ops.v300-event-evidence-search-ui.v1</span></div>
        </div>
        <div class="actions event-review-controls incident-memory-search-grid">
          <label>V300 검색
            <input id="opsV300EventEvidenceSearchInput" placeholder="tag:evidence:bboxcrop review:needs-review pinned..." />
          </label>
          <label>Retry
            <select id="opsV300EventEvidenceRetryFilter">
              <option value="">전체</option>
              <option value="retryable">retryable</option>
              <option value="blocked">blocked</option>
            </select>
          </label>
          <label class="check-inline"><input id="opsV300EventEvidencePinnedOnly" type="checkbox" /> pinned only</label>
        </div>
        <div id="opsV300EventEvidenceRows" class="v300-event-evidence-results">
          <p class="ops-rule-note">EventRecord, FeatureSet, EvidenceManifest, review state를 불러오면 V300 evidence detail이 표시됩니다.</p>
        </div>
      </section>
      <section class="section-card ops-workspace-wide v320-unified-events-workspace" data-testid="ops-v320-unified-events-workspace" data-v320-unified-events-workspace="resolution-queue-detail-timeline">
        <div class="toolbar">
          <div>
            <h3>Unified Resolution Workspace</h3>
            <p id="opsV320UnifiedWorkspaceSummary">resolution queue, resolution detail, resolution timeline을 `/ops/events` 안에서 Ops 전용으로 확인합니다.</p>
          </div>
          <div id="opsV320UnifiedWorkspaceBadges" class="badge-row"><span class="chip">media-server.ops.v320-unified-events-workspace.v1</span></div>
        </div>
        <div class="v320-resolution-workspace-grid">
          <div class="v320-resolution-workspace-column" data-v320-resolution-column="queue">
            <h4>resolution queue</h4>
            <div id="opsV320ResolutionQueue" class="v320-resolution-queue">
              <p class="ops-rule-note">EventRecord와 resolution state를 불러오면 queue가 표시됩니다.</p>
            </div>
          </div>
          <div class="v320-resolution-workspace-column" data-v320-resolution-column="detail">
            <h4>resolution detail</h4>
            <div id="opsV320ResolutionDetail" class="v320-resolution-detail">
              <p class="ops-rule-note">queue 첫 항목의 상태, reason, close/reopen lifecycle이 표시됩니다.</p>
            </div>
          </div>
          <div class="v320-resolution-workspace-column" data-v320-resolution-column="timeline">
            <h4>resolution timeline</h4>
            <div id="opsV320ResolutionTimeline" class="v320-resolution-timeline">
              <p class="ops-rule-note">event, review, resolution transition marker가 표시됩니다.</p>
            </div>
          </div>
        </div>
      </section>
      <section class="section-card ops-workspace-wide v310-replay-timeline-ui" data-testid="ops-v310-replay-timeline-ui" data-v310-replay-timeline-ui="event-frame-frame-bundle-encoded-clip">
        <div class="toolbar">
          <div>
            <h3>Encoded Clip Replay Timeline</h3>
            <p id="opsV310ReplayTimelineSummary">event frame, representative image, frame bundle, encoded clip timeline을 Ops 전용으로 확인합니다.</p>
          </div>
          <div id="opsV310ReplayTimelineBadges" class="badge-row"><span class="chip">media-server.ops.v310-replay-timeline-ui.v1</span></div>
        </div>
        <div id="opsV310ReplayTimelineRows" class="v310-replay-timeline-results">
          <p class="ops-rule-note">EventRecord evidence refs와 encoded clip manifest가 있으면 replay timeline이 표시됩니다.</p>
        </div>
      </section>
      <section class="section-card ops-workspace-wide v310-operator-feature-correction" data-testid="ops-v310-operator-feature-correction" data-v310-operator-feature-correction="ops-only-feature-alias-reanalysis">
        <div class="toolbar">
          <div>
            <h3>Operator Feature Correction</h3>
            <p id="opsV310OperatorFeatureCorrectionSummary">feature correction, aliases, reanalysis request를 Ops review state에만 저장합니다.</p>
          </div>
          <div id="opsV310OperatorFeatureCorrectionBadges" class="badge-row"><span class="chip">media-server.ops.operator-feature-correction.v1</span></div>
        </div>
        <div id="opsV310OperatorFeatureCorrectionRows" class="operator-feature-correction-list">
          <p class="ops-rule-note">운영자 feature correction 저장값과 reanalysis request가 있으면 표시됩니다.</p>
        </div>
      </section>
      <section class="section-card ops-workspace-wide incident-triage-board" data-testid="ops-incident-triage-board" data-incident-triage-board="lane-filter-sort">
        <div class="toolbar">
          <div>
            <h3>Incident Triage Board</h3>
            <p id="opsIncidentTriageBoardSummary">priority, review state, source, rule, scenario, similar incident, VLM candidate 기준으로 사건을 정렬합니다.</p>
          </div>
          <div id="opsIncidentTriageBoardBadges" class="badge-row"><span class="chip">media-server.ops.incident-triage-board.v1</span></div>
        </div>
        <div class="actions event-review-controls incident-triage-controls">
          <label>Lane
            <select id="opsIncidentTriageLaneFilter">
              <option value="all">전체</option>
              <option value="needs-triage">needs-triage</option>
              <option value="in-progress">in-progress</option>
              <option value="watchlist">watchlist</option>
              <option value="resolved">resolved</option>
            </select>
          </label>
          <label>Priority
            <select id="opsIncidentTriagePriorityFilter">
              <option value="all">전체</option>
              <option value="urgent">urgent</option>
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
          </label>
          <label>Sort
            <select id="opsIncidentTriageSort">
              <option value="priority">priority</option>
              <option value="review-age">review age</option>
              <option value="event-time">event time</option>
            </select>
          </label>
        </div>
        <div id="opsIncidentTriageBoardRows" class="incident-triage-board-lanes">
          <p class="ops-rule-note">EventRecord와 review state를 불러오면 Incident Triage Board가 표시됩니다.</p>
        </div>
      </section>
      <section class="section-card ops-workspace-wide incident-decision-scorecard" data-testid="ops-incident-decision-scorecard" data-incident-decision-scorecard="deterministic-priority-reasons">
        <div class="toolbar">
          <div>
            <h3>Decision Scorecard</h3>
            <p id="opsIncidentDecisionScorecardSummary">EventRecord, source health, similar incident, VLM candidate, operator review age를 deterministic priority reason으로 요약합니다.</p>
          </div>
          <div id="opsIncidentDecisionScorecardBadges" class="badge-row"><span class="chip">media-server.ops.incident-decision-scorecard.v1</span></div>
        </div>
        <div id="opsIncidentDecisionScorecardRows" class="incident-decision-scorecard-list">
          <p class="ops-rule-note">EventRecord와 review state를 불러오면 Decision Scorecard가 표시됩니다.</p>
        </div>
      </section>
      <section class="section-card ops-workspace-wide operational-action-pack" data-testid="ops-operational-action-pack" data-operational-action-pack="manual-workflow-links">
        <div class="toolbar">
          <div>
            <h3>Operational Action Pack</h3>
            <p id="opsOperationalActionPackSummary">release-safe evidence bundle, rule draft, alert dry-run, source health recheck를 수동 workflow로 묶습니다.</p>
          </div>
          <div id="opsOperationalActionPackBadges" class="badge-row"><span class="chip">media-server.ops.operational-action-pack.v1</span></div>
        </div>
        <div id="opsOperationalActionPackRows" class="operational-action-pack-list">
          <p class="ops-rule-note">EventRecord와 review state를 불러오면 Operational Action Pack이 표시됩니다.</p>
        </div>
      </section>
      <section class="section-card ops-workspace-wide incident-action-readiness-queue" data-testid="ops-incident-action-readiness-queue" data-incident-action-readiness-queue="operator-supervised-follow-ups">
        <div class="toolbar">
          <div>
            <h3>Incident Action Readiness Queue</h3>
            <p id="opsIncidentActionReadinessQueueSummary">operator 승인 전 follow-up 후보를 ready/blocked/field-smoke-needed/not-run 상태로 분리합니다.</p>
          </div>
          <div id="opsIncidentActionReadinessQueueBadges" class="badge-row"><span class="chip">media-server.ops.incident-action-readiness-queue.v1</span></div>
        </div>
        <div id="opsIncidentActionReadinessQueueRows" class="incident-action-readiness-queue-list">
          <p class="ops-rule-note">EventRecord와 review state를 불러오면 Incident Action Readiness Queue가 표시됩니다.</p>
        </div>
      </section>
      <section class="section-card ops-workspace-wide evidence-intake-field-readiness" data-testid="ops-evidence-intake-field-readiness" data-evidence-intake-field-readiness="redacted-field-preconditions">
        <div class="toolbar">
          <div>
            <h3>Evidence Intake and Field Readiness</h3>
            <p id="opsEvidenceIntakeFieldReadinessSummary">redacted evidence intake, source health recheck, field smoke precondition을 passed/failed/blocked/not-run으로 분리합니다.</p>
          </div>
          <div id="opsEvidenceIntakeFieldReadinessBadges" class="badge-row"><span class="chip">media-server.ops.evidence-intake-field-readiness.v1</span></div>
        </div>
        <div id="opsEvidenceIntakeFieldReadinessRows" class="evidence-intake-field-readiness-list">
          <p class="ops-rule-note">EventRecord와 review state를 불러오면 Evidence Intake and Field Readiness가 표시됩니다.</p>
        </div>
      </section>
      <section class="section-card ops-workspace-wide runtime-evidence-window" data-testid="ops-runtime-evidence-window" data-runtime-evidence-window="bounded-ops-only-packet">
        <div class="toolbar">
          <div>
            <h3>Runtime Evidence Window</h3>
            <p id="opsRuntimeEvidenceWindowSummary">incident-linked runtime/source/event evidence window를 bounded local buffer로 표시하며 longrun substitute나 persistent archive가 아닙니다.</p>
          </div>
          <div id="opsRuntimeEvidenceWindowBadges" class="badge-row"><span class="chip">media-server.ops.runtime-evidence-window.v1</span></div>
        </div>
        <div id="opsRuntimeEvidenceWindowRows" class="runtime-evidence-window-list">
          <p class="ops-rule-note">EventRecord와 review state를 불러오면 Runtime Evidence Window가 표시됩니다.</p>
        </div>
      </section>
      <section class="section-card ops-workspace-wide rule-what-if-preview" data-testid="ops-rule-what-if-preview" data-rule-what-if-preview="selected-incident-draft-only">
        <div class="toolbar">
          <div>
            <h3>Rule What-if Preview</h3>
            <p id="opsRuleWhatIfPreviewSummary">selected incident/EventRecord와 rule suggestion 후보를 저장 전 condition preview로 비교합니다.</p>
          </div>
          <div id="opsRuleWhatIfPreviewBadges" class="badge-row"><span class="chip">media-server.ops.rule-what-if-preview.v1</span></div>
        </div>
        <div id="opsRuleWhatIfPreviewRows" class="rule-what-if-preview-list">
          <p class="ops-rule-note">EventRecord와 review state를 불러오면 Rule What-if Preview가 표시됩니다.</p>
        </div>
      </section>
      <section class="section-card ops-workspace-wide approval-gated-rule-draft-readiness" data-testid="ops-approval-gated-rule-draft-readiness-events" data-approval-gated-rule-draft="events-to-rules-manual-approval">
        <div class="toolbar">
          <div>
            <h3>Approval-gated Rule Draft Readiness</h3>
            <p id="opsApprovalGatedRuleDraftReadinessSummary">incident-to-rule 후보를 approval state, validation summary, staged draft로 분리합니다.</p>
          </div>
          <div id="opsApprovalGatedRuleDraftReadinessBadges" class="badge-row"><span class="chip">media-server.ops.approval-gated-rule-draft-readiness.v1</span></div>
        </div>
        <div id="opsApprovalGatedRuleDraftReadinessRows" class="approval-gated-rule-draft-readiness-list">
          <p class="ops-rule-note">EventRecord와 review state를 불러오면 approval-gated staged draft readiness가 표시됩니다.</p>
        </div>
      </section>
      <section class="section-card ops-workspace-wide operator-outcome-memory" data-testid="ops-operator-outcome-memory" data-operator-outcome-memory="review-audit-history-hint">
        <div class="toolbar">
          <div>
            <h3>Operator Outcome Memory</h3>
            <p id="opsOperatorOutcomeMemorySummary">accept/dismiss/review-needed outcome을 review state와 audit action 기준 deterministic history hint로 요약합니다.</p>
          </div>
          <div id="opsOperatorOutcomeMemoryBadges" class="badge-row"><span class="chip">media-server.ops.operator-outcome-memory.v1</span></div>
        </div>
        <div id="opsOperatorOutcomeMemoryRows" class="operator-outcome-memory-list">
          <p class="ops-rule-note">EventRecord와 review state를 불러오면 Operator Outcome Memory가 표시됩니다.</p>
        </div>
      </section>
      <section class="section-card ops-workspace-wide similar-incident-panel" data-testid="ops-similar-incident-lookup" data-similar-incident-lookup="rule-scenario-source-status">
        <div class="toolbar">
          <div>
            <h3>Similar Incident Lookup</h3>
            <p id="opsSimilarIncidentSummary">같은 rule/scenario/source/status 패턴으로 재발 인시던트 후보를 확인합니다.</p>
          </div>
          <div id="opsSimilarIncidentBadges" class="badge-row"><span class="chip">deterministic</span></div>
        </div>
        <div id="opsSimilarIncidentRows" class="similar-incident-list">
          <p class="ops-rule-note">EventRecord와 review state를 불러오면 similar incident lookup이 표시됩니다.</p>
        </div>
      </section>
      <section class="section-card ops-workspace-wide incident-timeline-graph" data-testid="ops-incident-timeline-graph" data-incident-timeline-graph="source-event-action-alert-close">
        <div class="toolbar">
          <div>
            <h3>Incident Timeline Graph</h3>
            <p id="opsIncidentTimelineGraphSummary">source state → event → operator action → alert dry-run → close 상태 연결을 확인합니다.</p>
          </div>
          <div id="opsIncidentTimelineGraphBadges" class="badge-row"><span class="chip">timeline graph</span></div>
        </div>
        <div id="opsIncidentTimelineGraphRows" class="incident-timeline-graph-rail">
          <p class="ops-rule-note">EventRecord와 review state를 불러오면 incident timeline graph가 표시됩니다.</p>
        </div>
      </section>
      <section class="section-card ops-workspace-wide incident-brief-panel" data-testid="ops-explainable-incident-brief" data-incident-brief="action-object-context-environment">
        <div class="toolbar">
          <div>
            <h3>Explainable Incident Brief</h3>
            <p id="opsIncidentBriefSummary">action/object/context/environment slot으로 incident brief를 설명하고 VLM enrichment는 default-off로 유지합니다.</p>
          </div>
          <div id="opsIncidentBriefBadges" class="badge-row"><span class="chip">default-off</span></div>
        </div>
        <div id="opsIncidentBriefRows" class="incident-brief-list">
          <p class="ops-rule-note">EventRecord와 review state를 불러오면 explainable incident brief가 표시됩니다.</p>
        </div>
      </section>
      <section class="section-card ops-workspace-wide" data-testid="ops-alert-delivery-integrations" data-alert-contract="separate-from-event-post-payload" data-alert-dry-run="ops-only-no-external-delivery" data-delivery-attempt-log="ops-local-attempt-log">
        <div class="toolbar">
          <div>
            <h3>Alert Delivery Integrations</h3>
            <p id="alertDeliverySummary">Rule event 알림은 Event POST payload와 분리된 delivery state, retry policy, dry-run, audit로 관리합니다.</p>
          </div>
          <div id="alertDeliveryBadges" class="badge-row"><span class="chip">로딩 중</span></div>
        </div>
        <div class="actions event-review-controls">
          <label>검색 <input id="alertDeliveryFilter" placeholder="ID, 라벨, 대상" /></label>
          <label>종류
            <select id="alertDeliveryKindFilter">
              <option value="">전체</option>
              <option value="webhook">Webhook</option>
              <option value="email">Email</option>
              <option value="slack">Slack</option>
            </select>
          </label>
          <label>상태
            <select id="alertDeliveryEnabledFilter">
              <option value="">전체</option>
              <option value="enabled">활성</option>
              <option value="disabled">비활성</option>
            </select>
          </label>
        </div>
        <div class="ops-alert-delivery-form">
          <label>ID <input id="alertDeliveryId" value="default-webhook" /></label>
          <label>종류
            <select id="alertDeliveryKind">
              <option value="webhook">Webhook</option>
              <option value="email">Email</option>
              <option value="slack">Slack</option>
            </select>
          </label>
          <label>라벨 <input id="alertDeliveryLabel" value="Ops alert" /></label>
          <label>대상 <input id="alertDeliveryEndpoint" value="https://alerts.example.invalid/hook" /></label>
          <label>재시도 <input id="alertDeliveryRetryMax" type="number" min="0" max="8" value="3" /></label>
          <label>Backoff(ms) <input id="alertDeliveryRetryBackoff" type="number" min="250" max="60000" value="2000" /></label>
          <label class="check-inline"><input id="alertDeliveryEnabled" type="checkbox" checked /> 활성</label>
          <div class="actions">
            <button id="alertDeliverySave" class="button-primary" type="button">저장</button>
            <button id="alertDeliveryDryRun" class="button-secondary" type="button">Dry-run</button>
            <button id="alertDeliveryTest" class="button-secondary" type="button">Fixture 전송</button>
          </div>
        </div>
        <div class="alert-delivery-dry-run" data-testid="ops-alert-dry-run-result">
          <div class="alert-delivery-preview" data-alert-preview="payload">
            <div class="alert-delivery-preview-title">Payload Preview</div>
            <div id="alertDeliveryPayloadPreview" class="alert-delivery-preview-body">미실행</div>
          </div>
          <div class="alert-delivery-preview" data-alert-preview="result">
            <div class="alert-delivery-preview-title">Dry-run Result</div>
            <div id="alertDeliveryDryRunResult" class="alert-delivery-preview-body">미실행</div>
          </div>
        </div>
        <div class="table-wrap">
          <table class="ops-data-table alert-delivery-table">
            <thead>
              <tr>
                <th>Integration</th>
                <th>상태</th>
                <th>Retry</th>
                <th>최근 시도</th>
              </tr>
            </thead>
            <tbody id="alertDeliveryRows"><tr><td colspan="4">로딩 중</td></tr></tbody>
          </table>
        </div>
      </section>
      <section class="section-card ops-workspace-wide" data-testid="ops-event-review-inbox" data-event-review-workflow="operator-inbox" data-review-state="separate-from-event-post-payload" data-vlm-review-state="ops-only-event-record-evidence" data-vlm-review-action-workflow="ops-only-review-state" data-incident-action-workflow="ops-only-incident-state">
        <div class="toolbar">
          <div>
            <h3>Rule Event Review Inbox</h3>
            <p id="eventReviewSummary">Rule/Scenario 이벤트의 확인, 분류, 메모, incident/action 상태와 EventRecord evidence, VLM 설명/action을 Ops 전용 review state로 관리합니다.</p>
          </div>
          <div class="actions event-review-controls">
            <label>Review 상태
              <select id="eventReviewStatusFilter">
                <option value="">전체</option>
                <option value="new">new</option>
                <option value="reviewing">reviewing</option>
                <option value="confirmed">confirmed</option>
                <option value="dismissed">dismissed</option>
                <option value="needs-follow-up">needs-follow-up</option>
              </select>
            </label>
            <label>분류
              <select id="eventReviewClassFilter">
                <option value="">전체</option>
                <option value="unclassified">unclassified</option>
                <option value="true-positive">true-positive</option>
                <option value="false-positive">false-positive</option>
                <option value="duplicate">duplicate</option>
                <option value="needs-tuning">needs-tuning</option>
              </select>
            </label>
            <label>Incident 상태
              <select id="eventReviewIncidentStatusFilter">
                <option value="">전체</option>
                <option value="new">new</option>
                <option value="review-needed">review-needed</option>
                <option value="acknowledged">acknowledged</option>
                <option value="in-progress">in-progress</option>
                <option value="closed">closed</option>
                <option value="false-positive">false-positive</option>
              </select>
            </label>
          </div>
        </div>
        <div class="table-wrap">
          <table class="ops-data-table event-review-table">
            <thead>
              <tr>
                <th>이벤트</th>
                <th>리뷰</th>
                <th>분류</th>
                <th>Incident / Action</th>
                <th>메모</th>
                <th>Evidence / VLM</th>
                <th>업데이트</th>
              </tr>
            </thead>
            <tbody id="eventReviewRows"><tr><td colspan="7">로딩 중</td></tr></tbody>
          </table>
        </div>
      </section>
      <section class="section-card ops-audit-panel ops-workspace-wide" data-testid="ops-event-incident-workflow" data-incident-audit="events">
        <div class="toolbar">
          <div>
            <h3>Incident / Action Audit Trail</h3>
            <p>incident/action 상태 변경은 EventRecord payload와 분리된 Ops audit trail로 표시합니다.</p>
          </div>
          <button id="eventReviewAuditRefresh" class="button-secondary" type="button">새로고침</button>
        </div>
        <div id="event-review-audit-list" class="audit-list" data-audit-area="events"></div>
      </section>
      <section class="section-card ops-workspace-wide">
        <div class="toolbar">
          <div>
            <h3>최근 이벤트 기록</h3>
            <p id="eventRecordSummary">최근 25개 기록을 조회합니다.</p>
          </div>
          <div class="actions event-record-controls">
            <label>증거
              <select id="eventRecordsEvidenceSelect">
                <option value="">전체</option>
                <option value="any">증거 있음</option>
                <option value="both">snapshot + clip</option>
                <option value="snapshot">snapshot</option>
                <option value="clip">clip</option>
                <option value="missing">증거 없음</option>
              </select>
            </label>
            <label class="check-inline"><input id="eventRecordsIncludeArchives" type="checkbox" /> archive 포함</label>
            <button id="eventRecordsPrev" class="button button-secondary" type="button">이전</button>
            <button id="eventRecordsNext" class="button button-secondary" type="button">다음</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="ops-data-table event-record-table">
            <colgroup>
              <col class="event-record-col-event" />
              <col class="event-record-col-status" />
              <col class="event-record-col-stream" />
              <col class="event-record-col-track" />
              <col class="event-record-col-scenario" />
              <col class="event-record-col-evidence" />
              <col class="event-record-col-time" />
            </colgroup>
            <thead>
              <tr>
                <th>이벤트</th>
                <th>상태</th>
                <th>스트림</th>
                <th>트랙</th>
                <th>시나리오</th>
                <th>증거</th>
                <th>수정 시각</th>
              </tr>
            </thead>
            <tbody id="eventRecordRows"><tr><td colspan="7">로딩 중</td></tr></tbody>
          </table>
        </div>
      </section>
    </section>
)";
}

void AppendOpsHomePage(std::ostringstream& out) {
    out << R"(    <section class="panel ops-workspace ops-workspace-home" data-ops-panel="home" data-testid="ops-home-page">
      <div class="toolbar panel-title-toolbar ops-workspace-hero">
        <div>
          <h2>운영 홈</h2>
          <p>구성, 런타임 상태, 위험 신호와 다음 조치를 한 화면에서 선택합니다.</p>
        </div>
        )" << RefreshIconButtonHtml("opsHomeRefresh", "button-secondary", "새로고침") << R"(
      </div>
      <div class="ops-workspace-action-grid">
      <section class="section-card compact-card">
        <div class="toolbar">
          <div>
            <h3>운영 구성</h3>
            <p>등록된 구성입니다.</p>
          </div>
          <div id="homeConfigState" class="badge-row"><span class="chip">로딩 중</span></div>
        </div>
        <div class="grid">
          <div class="metric-card"><span>등록 채널</span><strong id="homeChannelCount">-</strong></div>
          <div class="metric-card"><span>VA 룰</span><strong id="homeVaRuleCount">-</strong></div>
          <div class="metric-card"><span>이벤트 룰</span><strong id="homeEventRuleCount">-</strong></div>
          <div class="metric-card"><span>사용자</span><strong id="homeUserCount">-</strong></div>
        </div>
        <p id="homeConfigText">불러오는 중</p>
      </section>
      <section class="section-card compact-card">
        <div class="toolbar">
          <div>
            <h3>실시간 상태</h3>
            <p>현재 상태입니다.</p>
          </div>
          <div id="homeRuntimeState" class="badge-row"><span class="chip">로딩 중</span></div>
        </div>
        <div class="status-stat-grid">
          <div class="status-stat"><span>세션</span><strong id="homeActiveSessions">-</strong></div>
          <div class="status-stat"><span>스트림</span><strong id="homeActiveStreams">-</strong></div>
          <div class="status-stat"><span>분석 탭</span><strong id="homeAnalysisTaps">-</strong></div>
          <div class="status-stat"><span>지연 탭</span><strong id="homeStaleTaps">-</strong></div>
        </div>
        <p id="homeRuntimeText">불러오는 중</p>
      </section>
      <section class="section-card compact-card" data-testid="ops-home-vlm-entry">
        <div class="toolbar">
          <div>
            <h3>VLM 설치/연결 준비</h3>
            <p>local runtime과 cloud opt-in 후보를 dry-run으로 비교합니다.</p>
          </div>
          <a class="button button-secondary" href="/ops/vlm">VLM 준비</a>
        </div>
        <div class="badge-row">
          <span class="chip info">dry-run only</span>
          <span class="chip">profile 저장 지원</span>
          <span class="chip">runtime 호출 없음</span>
        </div>
      </section>
      </div>
    </section>
)";
}

void AppendOpsVlmInstallConnectionPage(std::ostringstream& out) {
    out << R"(    <section class="panel ops-vlm-containment-workspace" data-ops-panel="vlm" data-testid="ops-vlm-page" data-vlm-containment="ops-aux-default-off">
      <div class="toolbar panel-title-toolbar ops-workspace-hero">
        <div>
          <h2>VLM 설치/연결 준비</h2>
          <p>Ops 보조 작업으로 유지하며 privacy, default-off, profile 상태를 읽기 전용 경계와 저장 경계로 분리합니다.</p>
        </div>
        )" << RefreshIconButtonHtml("opsVlmRefresh", "button-secondary", "새로고침") << R"(
      </div>
      <div id="opsVlmStatus" class="message" hidden></div>
      <section class="section-card ops-vlm-aux-panel" data-testid="ops-vlm-controls" data-vlm-task="ops-aux">
        <div class="toolbar">
          <div>
            <h3>입력 조건</h3>
            <p>운영자가 검토할 PC 등급과 privacy 조건입니다.</p>
          </div>
        </div>
        <div class="form-grid">
          <label>PC 등급
            <select id="opsVlmHardwareClass">
              <option value="local-unsupported">local-unsupported</option>
              <option value="local-low">local-low</option>
              <option value="local-standard" selected>local-standard</option>
              <option value="local-high">local-high</option>
            </select>
          </label>
          <label>Local runtime
            <select id="opsVlmRuntimeReadiness">
              <option value="ready">ready</option>
              <option value="missing" selected>missing</option>
            </select>
          </label>
          <label>Privacy mode
            <select id="opsVlmPrivacyMode">
              <option value="local-only">local-only</option>
              <option value="cloud-disabled">cloud-disabled</option>
              <option value="cloud-allowed">cloud-allowed</option>
            </select>
          </label>
          <label>Cloud opt-in
            <select id="opsVlmCloudOptIn">
              <option value="not-acknowledged" selected>not-acknowledged</option>
              <option value="acknowledged">acknowledged</option>
            </select>
          </label>
        </div>
      </section>
      <div class="grid ops-metric-grid ops-vlm-default-off-summary" data-vlm-task="default-off">
        <div class="metric-card"><span>상태</span><strong id="opsVlmDecisionStatus">-</strong></div>
        <div class="metric-card"><span>선택 후보</span><strong id="opsVlmSelectableCount">-</strong></div>
        <div class="metric-card"><span>PC 등급</span><strong id="opsVlmHardwareSummary">-</strong></div>
        <div class="metric-card"><span>외부 전송</span><strong id="opsVlmTransferSummary">-</strong></div>
      </div>
      <div class="ops-vlm-containment-grid">
      <section class="section-card ops-vlm-default-off-panel" data-testid="ops-vlm-runtime-status-panel" data-vlm-runtime-status="ops-only-default-off" data-vlm-task="default-off">
        <div class="toolbar">
          <div>
            <h3>VLM runtime status</h3>
            <p>provider 상태, runtime 연결 상태, 마지막 evaluation, 실패 사유, privacy mode, default-off 상태를 읽기 전용으로 표시합니다.</p>
          </div>
        </div>
        <div class="grid ops-metric-grid">
          <div class="metric-card"><span>Provider</span><strong id="opsVlmProviderStatus">-</strong></div>
          <div class="metric-card"><span>Runtime</span><strong id="opsVlmRuntimeConnectionStatus">-</strong></div>
          <div class="metric-card"><span>Last evaluation</span><strong id="opsVlmLastEvaluationStatus">-</strong></div>
          <div class="metric-card"><span>Failure</span><strong id="opsVlmFailureReason">-</strong></div>
          <div class="metric-card"><span>Privacy</span><strong id="opsVlmPrivacyModeStatus">-</strong></div>
          <div class="metric-card"><span>Default</span><strong id="opsVlmDefaultOffStatus">-</strong></div>
        </div>
        <div id="opsVlmRuntimeStatusBadges" class="badge-row">
          <span class="chip">runtime/status 로딩 중</span>
        </div>
        <div id="opsVlmRuntimeStatusList" class="root-cause-list">
          <div class="empty">VLM runtime status를 불러오는 중입니다.</div>
        </div>
      </section>
      <section class="section-card ops-vlm-aux-panel ops-vlm-evaluation-panel" data-testid="ops-vlm-evaluation-result-workflow" data-vlm-evaluation-workflow="fixture-result-profile-selection" data-vlm-task="ops-aux">
        <div class="toolbar">
          <div>
            <h3>Evaluation result workflow</h3>
            <p>sample event 평가 결과를 latency, JSON 안정성, 설명 품질, hallucination risk, 한국어/영어 품질 기준으로 비교하고 profile draft에 반영합니다.</p>
          </div>
        </div>
        <div class="grid ops-metric-grid">
          <div class="metric-card"><span>Workflow</span><strong id="opsVlmEvaluationWorkflowStatus">-</strong></div>
          <div class="metric-card"><span>Sample cases</span><strong id="opsVlmEvaluationCaseCount">-</strong></div>
          <div class="metric-card"><span>Candidates</span><strong id="opsVlmEvaluationCandidateCount">-</strong></div>
          <div class="metric-card"><span>Selected result</span><strong id="opsVlmEvaluationSelectedProfile">-</strong></div>
        </div>
        <div id="opsVlmEvaluationBadges" class="badge-row">
          <span class="chip">evaluation 결과 로딩 중</span>
        </div>
        <div class="ops-responsive-table">
          <table>
            <thead>
              <tr>
                <th>선택</th>
                <th>모델 / prompt</th>
                <th>품질 축</th>
                <th>운영 판정</th>
              </tr>
            </thead>
            <tbody id="opsVlmEvaluationRows"><tr><td colspan="4">평가 결과를 불러오는 중입니다.</td></tr></tbody>
          </table>
        </div>
        <p id="opsVlmEvaluationSelectionSummary">평가 후보를 profile draft에 반영하지 않았습니다.</p>
        <p id="opsVlmEvaluationPromotionGuardStatus" class="form-note" data-promotion-flow="operator-select-candidate-then-server-verify-save">promotion guard 로딩 중입니다.</p>
      </section>
      <section class="section-card ops-vlm-aux-panel ops-vlm-options-panel" data-testid="ops-vlm-options-panel" data-vlm-task="ops-aux">
        <div class="toolbar">
          <div>
            <h3>설치/연결 dry-run 후보</h3>
            <p id="opsVlmDecisionText">후보를 불러오는 중입니다.</p>
          </div>
        </div>
        <div id="opsVlmWarnings" class="badge-row"><span class="chip">로딩 중</span></div>
        <div class="ops-responsive-table">
          <table>
            <thead>
              <tr>
                <th>선택</th>
                <th>모델</th>
                <th>실행 위치</th>
                <th>영향</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody id="opsVlmOptionRows"><tr><td colspan="5">로딩 중</td></tr></tbody>
          </table>
        </div>
        <p id="opsVlmSelectionSummary">선택한 후보 없음</p>
      </section>
      <section class="section-card ops-vlm-privacy-panel" data-testid="ops-vlm-privacy-transfer-guard-panel" data-vlm-task="privacy">
        <div class="toolbar">
          <div>
            <h3>Privacy/전송 guard</h3>
            <p>Cloud 후보는 외부 전송 경고와 provider logging/retention 검토가 끝나야 profile 활성화 후보가 됩니다. credential, prompt, raw response, source URL, raw frame bytes는 profile, sidecar, viewer/client에 저장하거나 노출하지 않습니다.</p>
          </div>
        </div>
        <div id="opsVlmPrivacyGuardBadges" class="badge-row">
          <span class="chip">redaction 확인 대기</span>
        </div>
        <div class="form-grid">
          <label class="check-inline">
            <input id="opsVlmExternalTransferWarningAck" type="checkbox" disabled>
            외부 전송 경고 확인
          </label>
          <label class="check-inline">
            <input id="opsVlmProviderLoggingReviewed" type="checkbox" disabled>
            provider logging/retention 검토 완료
          </label>
        </div>
        <div id="opsVlmPrivacyGuardList" class="root-cause-list">
          <div class="empty">privacy guard를 불러오는 중입니다.</div>
        </div>
      </section>
      <section class="section-card ops-vlm-profile-state-panel" data-testid="ops-vlm-profile-panel" data-vlm-task="profile-state">
        <div class="toolbar">
          <div>
            <h3>VLM profile 저장</h3>
            <p>S05 저장 계약은 provider, model, runtime, prompt profile, privacy, 평가, 활성화 상태만 저장합니다.</p>
          </div>
          <button id="opsVlmSaveProfile" class="button-primary" type="button">profile 저장</button>
        </div>
        <div id="opsVlmProfileStatus" class="message" hidden></div>
        <div class="form-grid">
          <label>Profile ID
            <input id="opsVlmProfileId" value="vlm-primary-qwen3-vl-8b-instruct" autocomplete="off">
          </label>
          <label>Prompt profile
            <select id="opsVlmPromptProfile">
              <option value="event-review-default">event-review-default</option>
              <option value="false-positive-review">false-positive-review</option>
              <option value="operator-question-review">operator-question-review</option>
            </select>
          </label>
          <label>Evaluation (server verified)
            <input id="opsVlmEvaluationStatus" value="not-run" readonly aria-readonly="true">
          </label>
          <label>Activation
            <select id="opsVlmActivationStatus">
              <option value="pending-evaluation" selected>pending-evaluation</option>
              <option value="disabled">disabled</option>
              <option value="fallback">fallback</option>
              <option value="active">active</option>
            </select>
          </label>
          <label class="check-inline">
            <input id="opsVlmProfileEnabled" type="checkbox">
            enabled
          </label>
          <label>Fallback profile
            <input id="opsVlmFallbackProfileId" placeholder="fallback profile id" autocomplete="off">
          </label>
          <label>Disabled reason
            <input id="opsVlmDisabledReason" value="evaluation-not-run" autocomplete="off">
          </label>
        </div>
        <div class="ops-responsive-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>모델</th>
                <th>평가/활성화</th>
                <th>Fallback</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody id="opsVlmProfileRows"><tr><td colspan="5">저장된 VLM profile을 불러오는 중입니다.</td></tr></tbody>
          </table>
        </div>
      </section>
      <section class="section-card ops-vlm-boundary-containment-panel" data-testid="ops-vlm-boundary-panel" data-vlm-task="boundary">
        <div class="toolbar">
          <div>
            <h3>실행 경계</h3>
            <p>설치/연결 후보 선택과 profile 저장만 수행하며 runtime 호출과 sidecar 저장은 이후 단계입니다.</p>
          </div>
        </div>
        <div id="opsVlmBoundaryBadges" class="badge-row">
          <span class="chip">설치 없음</span>
          <span class="chip">credential 저장 없음</span>
          <span class="chip">VLM 호출 없음</span>
          <span class="chip">sidecar 저장 없음</span>
          <span class="chip">schema/media 변경 없음</span>
        </div>
        <div id="opsVlmDisabledList" class="root-cause-list">
          <div class="empty">비추천 후보를 불러오는 중입니다.</div>
        </div>
      </section>
      </div>
      <details id="opsVlmRawDetails" class="debug-details ops-vlm-raw-debug-panel" data-vlm-task="raw-debug">
        <summary>dry-run JSON</summary>
        <label class="check-inline"><input id="opsVlmPretty" type="checkbox" checked> pretty</label>
        <pre id="opsVlmRaw">{}</pre>
      </details>
    </section>
)";
}

std::string OpsShellPageHtmlImpl(const std::string& stream_route,
                                 int rtsp_listen_port,
                                 const ProductUiPrincipalView& principal,
                                 const std::string& active) {
    std::ostringstream out;
    AppendOpsShellStartImpl(out,
                        principal,
                        active,
                        "운영 상태, channel, rule, event, 계정 관리를 같은 제품 shell에서 확인합니다.");
    if (active == "dashboard") {
        AppendOpsDashboardPage(out);
    } else if (active == "events") {
        AppendOpsEventsPage(out);
    } else if (active == "rules") {
        AppendOpsRulesPage(out);
    } else if (active == "vlm") {
        AppendOpsVlmInstallConnectionPage(out);
    } else {
        AppendOpsHomePage(out);
    }
    AppendOpsShellScript(out, active, stream_route, rtsp_listen_port);
    AppendOpsShellEndImpl(out);
    return out.str();
}

// OPS_RENDERER_BYTE_BASELINE_END
}  // namespace

void AppendOpsShellStart(std::ostringstream& out,
                         const ProductUiPrincipalView& principal,
                         const std::string& active,
                         const std::string& subtitle) {
    AppendOpsShellStartImpl(out, principal, active, subtitle);
}

void AppendOpsShellEnd(std::ostringstream& out) {
    AppendOpsShellEndImpl(out);
}

std::string OpsShellPageHtml(const std::string& stream_route,
                             int rtsp_listen_port,
                             const ProductUiPrincipalView& principal,
                             const std::string& active) {
    return OpsShellPageHtmlImpl(stream_route, rtsp_listen_port, principal, active);
}

}  // namespace ingress
