# Project Feature / UI / Test Inventory

이 문서는 현재 release 목표 `v1.8.0` 기준으로 코드상 존재하는 기능, 제품 UI에서
접근 가능한 기능, 현재 검증 명령이 확인하는 사항을 비교한 전면 재검토 기록입니다.
버전별 과거 변경 이력은 [development-backlog.md](./development-backlog.md)와
[history/](./history/)에만 두며, 이 문서는 현재 제품 기준만 다룹니다.

이 문서는 자동/정적 inventory입니다. 인앱 브라우저에서 모든 기능을 직접 클릭하고
타이핑한 UI 풀테스트 완료 evidence가 아닙니다. UI 풀테스트 완료 여부는
[manual-ui-fulltest.md](./manual-ui-fulltest.md)와
[manual-ui-result-template.md](./manual-ui-result-template.md)의 실제 결과 문서로만
판정합니다.

## Evidence Sources

- Code routes: `src/ingress/webrtc_http_server.cpp`,
  `src/ingress/product_ui_page_scripts.cpp`
- UI ownership: [ui-guide.md](./ui-guide.md)
- Verification command set: `server.sh`, [stream-verification.md](./stream-verification.md),
  `scripts/internal/verify_script_inventory.mjs`
- Release boundary: [development-backlog.md](./development-backlog.md),
  [release-policy.md](./release-policy.md),
  [versioning-policy.md](./versioning-policy.md)

## Code Feature Inventory

| 영역 | 코드상 기능 | 주요 구현/API | UI 접근 | 대표 검증 |
| --- | --- | --- | --- | --- |
| Server lifecycle/config | install/build/start/foreground/stop/status/diagnose, env override, source-only release guard | `server.sh`, `src/main.cpp`, `src/app_config.cpp` | 없음. CLI/로그 중심 | `build`, `verify-server-start-modes`, `verify-release-metadata`, `verify-bundle-policy` |
| Source ingest | file, RTSP pull, HTTP/HLS URI, WHEP pull, WHIP publish, Published WebRTC source | `source_factory.*`, `/ops/api/sources`, `/ops/api/views`, `/whip/publish`, `/whep` | `/ops/sources`, `/client/live` | `verify-codecs`, `verify-uri-longrun`, `verify-ops-source-lifecycle`, `verify-ops-client-ui` |
| RTSP output | 기본 route RTSP egress, VA overlay route, codec matrix | `gstreamer_rtsp_server.*`, `rtsp_egress_session.*` | URL copy만 UI 제공 | `verify-codecs`, `verify-va`, `verify-rtsp-va-overlay-policy` |
| WebRTC output | session create/answer/ICE/delete, WHEP, client scoped session proxy, DataChannel metadata | `/webrtc/session`, `/whep`, `/client/api/views/{viewId}/webrtc/session` | `/client/live`, `/ops/rules` preview | `verify-webrtc-ice`, `verify-webrtc-va-metadata`, `verify-ops-client-ui` |
| WHIP publish | external publisher ingest session/ICE/delete | `/whip/publish`, `/whip/publish/session/{id}` | 직접 제품 UI 없음. Published WebRTC source 연결은 `/ops/sources` | `verify-codecs`, `browser_webrtc_publish_consume_check.mjs` |
| Auth/session | setup, login, logout, must-change password, password policy/history, lockout, invite setup | `/setup`, `/login`, `/password/change`, `/invite/setup`, `/auth/whoami` | Auth shell | `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes` |
| Role/scope | admin/operator/viewer/integrator, view/event/metadata/dashboard scopes, route guard | `http_auth.*`, route guard in `webrtc_http_server.cpp` | `/ops/users`, route redirects/403 | `verify-auth-users`, `verify-auth-routes`, `verify-ops-client-ui` |
| Client access request | pending request submit, admin approve/reject, invite setup before account/session access | `/client/api/access-requests`, `/ops/api/access-requests/*` | `/client/request-access`, `/ops/users` | `verify-auth-users`, `verify-auth-routes`, `verify-ops-click-e2e` |
| Ops shell | Home, Dashboard, Sources, Rules, Users, Client Preview nav | `/ops/home`, `/ops/dashboard`, `/ops/sources`, `/ops/rules`, `/ops/users` | Ops UI | `verify-ops-client-ui`, `verify-ops-click-e2e`, `verify-ops-tables-layout` |
| Ops dashboard | runtime status, source health, root cause, incident timeline, VA quality, log tail | `/ops/api/runtime/status`, `/ops/api/source-health`, `/ops/api/diagnostics/log-tail` | `/ops/dashboard` | `verify-ops-root-cause-panel`, `verify-ops-operator-incident-timeline`, `verify-va-runtime-console` |
| Source/channel management | source/view CRUD, bulk channel actions, URL copy, audit panel, ONVIF import draft | `/ops/api/sources`, `/ops/api/views`, `/ops/api/channels/bulk`, `/ops/api/onvif/import-draft` | `/ops/sources` | `verify-ops-source-group-site-management`, `verify-ops-channel-bulk`, `verify-onvif-ops-sources-ui` |
| Rule/profile/scenario management | VA rules, event templates, profiles, scenario presets/builder, save validation, preview | `/ops/api/rules/catalog`, `/lab/analysis/rules`, `/lab/analysis/profiles`, `/lab/analysis/va-rules` | `/ops/rules` | `verify-rule-ui`, `verify-ops-rules-roundtrip`, `verify-ops-scenario-builder-ui`, `verify-ops-scenario-presets` |
| User management | create/edit/disable/restore/reset password, viewer scope, last admin guard, audit export | `/ops/api/users`, `/ops/api/invites`, `/ops/api/audit` | `/ops/users` | `verify-auth-users`, `verify-ops-audit-trail`, `verify-ops-audit-persistence` |
| Event review/evidence | EventRecord status, evidence filter, archive include, review state, bundle token/export | `/ops/api/events/status`, `/ops/api/events/reviews`, `/lab/analysis/events/evidence*` | `/ops/events`, Dashboard links | `verify-ops-event-records-scope`, `verify-ops-event-review-inbox`, `verify-event-post` |
| Alert delivery | delivery config/list, test delivery fixture, retry/audit separation | `/ops/api/alerts/deliveries`, `/ops/api/alerts/deliveries/test` | `/ops/events` | `verify-ops-alert-delivery-integrations` |
| Client live workspace | source tree, drag/drop assignment, grid/density, tile play/reconnect/stop, info overlay, dock side, saved layout | `/client/api/views`, `/client/api/preferences/live-layout`, scoped WebRTC APIs | `/client/live` | `verify-client-live-workspace`, `verify-client-source-dock-events`, `verify-client-tile-disconnect`, `verify-client-tile-info-overlay-health`, `verify-client-saved-views-layout-presets` |
| Client dashboard | assigned view health/event summary, multi-view comparison, filter/sort/copy | `/client/api/views/{viewId}/dashboard`, `/client/api/views/{viewId}/events` | `/client/dashboard` | `verify-client-dashboard-polish`, `verify-ops-client-ui` |
| VA detector/runtime | dummy/YOLO detector, ONNX layout, adaptive fps/queue, redaction overlay, static image analysis | `/lab/analysis/image`, `/lab/analysis/taps` | Ops Rules preview and dashboard consume 일부. Full lab UI 없음 | `verify-yolo-layouts`, `verify-adaptive`, `verify-image-analysis`, `verify-redaction` |
| Tracking/scenarios | object tracker, TrackStateManager, SceneContextBuilder, intrusion, line crossing, dwell, loitering, zone occupancy, re-entry, wrong direction, intrusion-after-line-crossing | `src/analysis/*scenario*`, `event_rule_engine.*`, `scenario_engine.*` | `/ops/rules` configuration, `/ops/dashboard` quality summary | `verify-analysis-state`, `verify-va-events`, `verify-va-replay`, `replay-va-metadata` |
| Runtime metadata | WebRTC DataChannel, SSE side-channel, WebSocket side-channel, metrics/state dump | `/lab/analysis/metadata/stream`, `/ws/va-metadata`, `/lab/analysis/taps/{id}/state-dump`, `/metrics` | Ops dashboard consumes summary; direct API is dev/integrator | `verify-webrtc-va-metadata`, `verify-va-metadata-sidechannel`, `verify-ws-metadata`, `verify-va-runtime-console` |
| Event POST/storage | event dispatcher, disabled/schema/recovery modes, storage status, compaction/cleanup | `/lab/analysis/event-post/status`, `/lab/analysis/event-storage/status`, `/lab/analysis/events/records*` | `/ops/events` and dashboard consume status | `verify-event-post`, `verify-event-post-longrun`, `verify-ops-evidence-retention-cleanup` |
| ONVIF support | live import draft, probe parser/adapter, HTTP SOAP, local simulator/no-device suite, RTSPS candidate, TLS/credential reference policy | `onvif_live_import.*`, `onvif_credential_provider.*`, `/ops/api/onvif/import-draft` | `/ops/sources` ONVIF source type/import flow | `verify-onvif-*`, especially `verify-onvif-ops-sources-ui`, `verify-onvif-no-device-suite` |
| Integrator contract | Event POST/WebRTC/SSE/WS schema samples and redaction contract | `test/fixtures/integrator_contract_artifact/*` | 직접 UI 없음 | `verify-integrator-contract-artifact`, metadata/event verifiers |
| Release/public repo | source-only release, dependency notice/snapshot, bundle policy, public readiness, actions security | docs/config/scripts | 직접 UI 없음 | `verify-release-metadata`, `verify-actions-security`, `verify-public-repo-readiness`, `verify-release-closeout-helper` |
| Research boundaries | Re-ID default-off, OC-SORT sandbox, BoT-SORT/DeepSORT research, YouTube lab-only import/source | analysis hooks, docs, fixtures | Re-ID/tracker options in rules; YouTube UI 없음 | `verify-reid-advanced-tracking`, `verify-oc-sort-benchmark-boundary`, `verify-bot-sort-deepsort-research-boundary` |
| Closed product routes | `/lab`, `/lab/rules`, `/lab/import`, `/webrtc/test` product UI closure | route guard/404 | 열리면 안 됨 | `verify-auth-routes`, `verify-ops-route-boundaries`, `verify-multichannel` skip notice |

## UI-Accessible Feature Inventory

| UI route | 접근 role | 기능 | 자동 검증 | 수동 풀테스트 상태 |
| --- | --- | --- | --- | --- |
| `/` | all | setup/login/role landing redirect | `verify-auth-routes` | 이 문서 기준 미수행 |
| `/setup` | setup required | admin password bootstrap, weak/strong password validation | `verify-auth-bootstrap` | 이 문서 기준 미수행 |
| `/login` | unauthenticated | login, lockout message, role landing | `verify-auth-bootstrap`, `verify-auth-routes` | 이 문서 기준 미수행 |
| `/password/change` | must-change session | password history/reuse rejection, session reset | `verify-auth-users`, `verify-auth-routes` | 이 문서 기준 미수행 |
| `/invite/setup` | invite token | invite password setup, token redaction boundary | `verify-auth-users` | 이 문서 기준 미수행 |
| `/client/request-access` | public | pending access request submit | `verify-auth-users`, `verify-ops-click-e2e` | 이 문서 기준 미수행 |
| `/ops/home` | admin/operator | operational summary, primary nav | `verify-ops-client-ui`, `verify-ops-click-e2e` | 이 문서 기준 미수행 |
| `/ops/dashboard` | admin/operator | runtime/source health/root cause/incident/VA quality panels | `verify-ops-root-cause-panel`, `verify-ops-operator-incident-timeline` | 이 문서 기준 미수행 |
| `/ops/sources` | admin/operator | source/view CRUD, file/RTSP/HTTP/WHEP/Published WebRTC/ONVIF input, bulk action, audit, URL copy | `verify-ops-client-ui`, `verify-ops-source-group-site-management`, `verify-onvif-ops-sources-ui` | 이 문서 기준 미수행 |
| `/ops/rules` | admin/operator | VA rule, event template, profile, scenario builder, preview play/reconnect/stop, save validation | `verify-rule-ui`, `verify-ops-rules-roundtrip`, `verify-ops-scenario-builder-ui` | 이 문서 기준 미수행 |
| `/ops/users` | admin | user create/edit/disable/restore/reset, viewer scope, pending request approve/reject | `verify-auth-users`, `verify-ops-click-e2e` | 이 문서 기준 미수행 |
| `/ops/events` | admin/operator direct diagnostic route | EventRecord filters, review inbox, evidence/export, alert delivery | `verify-ops-event-records-scope`, `verify-ops-event-review-inbox`, `verify-ops-alert-delivery-integrations` | 이 문서 기준 미수행 |
| `/client/live` | viewer/operator/admin preview | source tree, live workspace, tile controls, dock event feed, saved layout, viewer-safe redaction | `verify-ops-client-ui`, `verify-client-live-workspace`, `verify-client-tile-disconnect` | 이 문서 기준 미수행 |
| `/client/dashboard` | viewer/operator/admin preview | assigned view dashboard, filter/sort/copy, multi-view comparison | `verify-client-dashboard-polish`, `verify-ops-client-ui` | 이 문서 기준 미수행 |
| `/lab`, `/lab/rules`, `/lab/import` | none as product UI | closed route boundary | `verify-auth-routes`, `verify-ops-route-boundaries` | 열리면 실패 |
| `/webrtc/test` | none as product UI | removed browser harness boundary | `verify-multichannel`, `verify-ops-route-boundaries` | 열리면 실패 |

## Current Verification Inventory

### 운영/점검/개발 진입 명령

- `install`, `build`, `start`, `stop`, `restart`, `foreground`, `run`
- `status`, `check`, `diagnose`, `urls`, `external-urls`
- `ops-bundle`, `ops-evidence-cleanup`, `auth-user`
- `test`, `test --basic`, `test --full`, `test --external`, `test --stable`

### UI/Auth/Ops/Client 검증

- `verify-auth-bootstrap`
- `verify-auth-users`
- `verify-auth-routes`
- `verify-auth-workflow`는 내부 스크립트로 유지되며 server.sh 공개 명령은 위 세 명령을 기준으로 함
- `verify-ops-client-ui`
- `verify-ops-client-ui --screenshots`
- `verify-ops-click-e2e`
- `verify-ops-tables-layout`
- `verify-rule-ui`
- `verify-ops-rules-roundtrip`
- `verify-ops-rule-relationships`
- `verify-ops-rule-conflict-ui`
- `verify-ops-rule-validation-matrix`
- `verify-ops-scenario-presets`
- `verify-ops-source-lifecycle`
- `verify-ops-source-health-bulk`
- `verify-ops-channel-bulk`
- `verify-ops-event-records-scope`
- `verify-fixture-cleanup-contracts`
- `verify-flaky-verifiers`
- `verify-ops-event-review-inbox`
- `verify-ops-alert-delivery-integrations`
- `verify-ops-scenario-builder-ui`
- `verify-ops-client-shared-declutter`
- `verify-ops-source-group-site-management`
- `verify-ops-operator-incident-timeline`
- `verify-ops-root-cause-panel`
- `verify-ops-audit-trail`
- `verify-ops-audit-persistence`
- `verify-ops-diagnostics-bundle`
- `verify-ops-backup-recovery-guide`
- `verify-ops-backup-restore-dry-run`
- `verify-client-dashboard-polish`
- `verify-client-action-reduction`
- `verify-client-live-workspace`
- `verify-client-source-dock-events`
- `verify-client-tile-disconnect`
- `verify-client-tile-info-overlay-health`
- `verify-client-saved-views-layout-presets`
- `verify-ui-copy-matrix`
- `verify-ui-copy-i18n-parity`
- `verify-product-ui-token-drift`
- `verify-product-shell-examples`
- `verify-ops-route-boundaries`
- `verify-ui-visual-artifact-index`
- `verify-ui-release-baseline-approval-log`
- `compare-ui-visual-baseline`
- `write-ui-visual-qa-issue-links`
- `write-ui-visual-baseline-comment`
- `ui-visual-artifact-maintenance`

### Media/VA/metadata 검증

- `verify-codecs`
- `verify-webrtc-ice`
- `verify-multichannel` 현재는 제거된 `/webrtc/test` harness를 명시 skip하고 제품 UI smoke 사용을 안내
- `verify-uri-longrun`
- `verify-va`
- `verify-redaction`
- `verify-va-events`
- `verify-va-category-samples`
- `verify-route-profiles`
- `verify-tracker-stability`
- `compare-close-object-tracker`
- `verify-close-object-fixture-matrix`
- `verify-reid-advanced-tracking`
- `verify-oc-sort-benchmark-boundary`
- `verify-bot-sort-deepsort-research-boundary`
- `verify-yolo-layouts`
- `verify-adaptive`
- `verify-image-analysis`
- `verify-analysis-state`
- `verify-sse-metadata`
- `verify-va-metadata-sidechannel`
- `verify-webrtc-va-metadata`
- `verify-va-runtime-console`
- `verify-va-runtime-console-longrun`
- `verify-va-runtime-console-cycles`
- `verify-rtsp-va-overlay-policy`
- `verify-ws-metadata`
- `replay-va-metadata`
- `verify-va-replay`
- `verify-event-post`
- `verify-event-post-longrun`
- `verify-longrun-separation`
- `verify-runtime-dashboard-longrun-template`
- `verify-rc-release-gate`
- `verify-predev`

### ONVIF 검증

- `verify-onvif-live-import-contract`
- `verify-onvif-protocol-support-matrix`
- `verify-onvif-rtsps-draft-policy`
- `verify-onvif-https-soap-transport-design`
- `verify-onvif-https-tls-fixture`
- `verify-onvif-auth-injection-design`
- `verify-onvif-auth-injection-loopback`
- `verify-onvif-ws-discovery-ux`
- `verify-onvif-unsupported-api-guard`
- `verify-onvif-probe-fixture-contract`
- `verify-onvif-probe-profile-variants`
- `verify-onvif-synthetic-vendor-fixtures`
- `verify-onvif-probe-parser`
- `verify-onvif-probe-adapter`
- `verify-onvif-probe-error-wording`
- `verify-onvif-soap-fault-matrix`
- `verify-onvif-no-device-suite`
- `verify-onvif-no-device-mode`
- `verify-onvif-no-device-completion`
- `verify-onvif-field-smoke-redaction`
- `verify-onvif-field-smoke-gate`
- `verify-onvif-field-http-probe`
- `verify-onvif-closed-loopback-failure-matrix`
- `verify-onvif-tls-transport-policy`
- `verify-onvif-credential-reference-policy`
- `verify-onvif-field-smoke-sample-bundle`
- `verify-onvif-http-transport`
- `verify-onvif-local-simulator`
- `verify-onvif-probe-draft-api`
- `verify-onvif-import-draft-api`
- `verify-onvif-rtsp-downstream`
- `verify-onvif-ops-sources-ui`

### Docs/release/security/bundle 검증

- `verify-code-comments`
- `verify-script-inventory`
- `verify-project-inventory`
- `verify-docs-links`
- `verify-docs-ui-assets`
- `verify-manual-ui-evidence`
- `verify-release-metadata`
- `verify-release-evidence-index`
- `verify-feature-scope-gate`
- `verify-actions-security`
- `verify-public-repo-readiness`
- `verify-post-release-reconciliation`
- `verify-release-closeout-helper`
- `verify-integrator-contract-artifact`
- `rc-release-checklist`
- `rc-artifact-archive`
- `write-dependency-notice`
- `dependency-snapshot`
- `verify-bundle-policy`
- `verify-release-bundle-dry-run`
- `source-offer-checklist`
- `summarize-reports`

## Comparison Result

| 판정 | 항목 | 근거 | 필요한 후속 |
| --- | --- | --- | --- |
| Code + UI + automated tests 있음 | Auth setup/login/password/invite/request, Ops shell, Sources, Rules, Users, Events, Client Live/Dashboard | UI route와 server.sh verifier가 모두 존재 | UI 풀테스트 evidence는 별도 수행 필요 |
| Code + UI + automated tests 있음 | Client Live workspace, source tree, tile disconnect, overlay, saved layout | `/client/live` script와 `verify-client-*` verifier 존재 | 실제 브라우저에서 role별 클릭/타이핑 evidence 필요 |
| Code + UI + automated tests 있음 | Ops Event review/alert delivery/evidence export | `/ops/events`, `/ops/api/events/*`, alert APIs와 verifier 존재 | 실제 이벤트 발생부터 review/export까지 수동 evidence 필요 |
| Code + UI + automated tests 있음 | ONVIF import draft and source save flow | `/ops/sources` ONVIF flow와 no-device/ops-sources verifiers 존재 | 실장비 ONVIF 성공은 미확인/field smoke 범위 |
| Code + tests 있음, 제품 UI 없음 | WHIP publish ingest | `/whip/publish` API와 publisher test 존재 | 제품 UI 직접 publish 화면은 없음. Published source 연결만 UI 제공 |
| Code + tests 있음, 제품 UI 없음 | `/lab/analysis/*` tap/image/rule/profile/event APIs | dev/integrator API와 verifier 존재 | `/lab` 제품 화면은 닫힌 route가 정상 |
| Code + tests 있음, 제품 UI 없음 | SSE/WS metadata side-channel | `/lab/analysis/metadata/stream`, `/ws/va-metadata`와 verifier 존재 | Ops dashboard는 summary만 소비. raw stream UI 없음 |
| Code + tests 있음, 제품 UI 없음 | Release/bundle/public readiness | release/docs scripts 존재 | 제품 웹 UI 대상 아님 |
| Code + tests 있음, UI 노출 제한 | Re-ID/advanced tracker, OC-SORT/BoT-SORT/DeepSORT | default-off/research boundary verifier 존재 | 제품 default-on 또는 runtime tracker 승격은 비범위 |
| UI + tests 있음, 실제 full manual evidence 없음 | `/setup`, `/login`, `/ops/*`, `/client/*` 전체 | 자동 smoke는 존재하지만 이 문서 작성 시 인앱 브라우저 전수 클릭은 수행하지 않음 | [manual-ui-checklist.md](./manual-ui-checklist.md)에 따라 별도 evidence 작성 |
| Tests 있음, 현재 제품 기능 아님 | `verify-multichannel` | 제거된 `/webrtc/test` harness skip 안내 | 현재 다채널 UI 검증은 `verify-ops-client-ui`와 수동 UI evidence로 대체 |
| Tests 있음, 환경/field gate | external RTSP/WHEP/TURN, 실장비 ONVIF, 장시간 soak | command와 문서 gate 존재 | 사용자 명시 요청 또는 field endpoint 없으면 미실행으로 보고 |

## Current Gaps

1. Manual UI full test evidence는 아직 없음.
   `verify-ops-client-ui --screenshots` 같은 자동 screenshot은 UI 풀테스트 완료를
   증명하지 않습니다.
2. 모든 VA scenario가 실제 브라우저 UI에서 실제 이벤트 발생까지 확인됐다는 증거는
   아직 없음. 현재는 replay/smoke/fixture 중심 검증이 존재합니다.
3. 실장비 ONVIF, 외부 WHEP/TURN, 장시간 soak는 기본 release gate가 아니며
   명시 실행 전까지 `미실행`입니다.
4. Integrator role은 API/scope 중심으로 구현되어 있으며 별도 제품 UI landing이
   없습니다.
5. `/lab/analysis/*`, metadata side-channel, WHIP publish처럼 code/test는 있으나
   제품 UI가 없는 기능은 UI 풀테스트 대상이 아니라 API/integrator 검증 대상으로
   분리해야 합니다.
6. 과거 version-named standalone close-out 문서는 제거했고, 남은 과거 버전 언급은
   [development-backlog.md](./development-backlog.md) archive와 [history/](./history/)
   문서에만 둡니다.

## Maintenance Rules

- 새 기능을 추가하면 이 문서의 Code/UI/Test 비교표를 함께 갱신합니다.
- 새 제품 UI route를 추가하면 [manual-ui-checklist.md](./manual-ui-checklist.md)의
  수동 확인 범위도 갱신합니다.
- 새 verifier를 추가하면 `server.sh`, [stream-verification.md](./stream-verification.md),
  이 문서의 Verification Inventory를 함께 갱신합니다.
- 구버전 전용 `verify-v*` / `verify_v*` 명령과 script는 현재 command set에 다시
  추가하지 않습니다. `./server.sh verify-script-inventory`가 이를 막아야 합니다.
- 이 문서 자체의 route/command coverage는 `./server.sh verify-project-inventory`로
  확인합니다.
