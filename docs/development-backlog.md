# Development Backlog

이 문서는 현재 source tree의 roadmap 요약을 보관합니다. 여기서 `완료`라고 표시한
항목은 해당 source 기능과 local verifier 기준을 뜻합니다. GitHub Release publish,
UI 풀테스트, 30분, 120분 evidence는 해당 실행 증거가 있을 때만 별도로 완료로 씁니다.

- 현재 버전/비범위 기준: [versioning-policy.md](./versioning-policy.md)
- release 정책: [release-policy.md](./release-policy.md)
- 검증 명령 기준: [stream-verification.md](./stream-verification.md)

## 현재 공개 상태

- 현재 소스 버전: `2.8.0`
- 최신 공개 GitHub Release: `v2.7.0`
- `v2.7.0` 공개 상태: source-only GitHub Release. Binary, runtime, model bundle은
  포함하지 않습니다.
- 현재 source roadmap: `v2.8.0 Operator-Supervised Action Readiness`

## 현재 source roadmap: v2.8.0 Operator-Supervised Action Readiness

v2.8.0은 v2.7.0 source-only Operational Incident Command Loop 위에서 새 media path,
장기 녹화, 외부 provider 성공 보장, 자동 실행형 rule 적용을 만들지 않습니다. 이번
source tree의 범위는 2.x 라인을 `2.8.0`과 `2.9.0`까지만 유지한다는 전제에서,
3.0.0의 대대적인 route/API/config/schema/storage/auth/media 변경 전에 운영자가
직접 승인할 수 있는 action 준비 상태를 제품과 evidence 경계로 분리하는 것입니다.

직접 답: v2.8.0의 1차 선택값은 `Operator-Supervised Action Readiness`입니다.
fallback 또는 축소 대안은 `Runtime Evidence Window`입니다. 즉시 자동 적용 가능한
실행 플랫폼으로 키우지 않고, `/ops/events`와 `/ops/rules` 안에서 “무엇을 할 준비가
됐는가, 무엇은 아직 승인/field smoke/credential이 필요한가”를 명확히 보여주는
방향을 선택합니다.

2.x runway:

- `2.8.0`: 기존 Event POST/WebRTC/SSE/WS metadata, RTSP/WebRTC media path,
  Auth/Role/Scope, Rule/Profile payload schema를 유지한 operator-supervised action
  readiness입니다.
- `2.9.0`: 2.x의 마지막 안정화, release evidence 정리, 3.0 migration/readiness
  설계 준비입니다.
- `3.0.0`: route/API/config/schema, registry/storage, auth/scope, evidence 저장 형식,
  RTSP/WebRTC media path 같은 대규모 변경을 별도 3.0 설계와 명시 승인 후 다루는
  major line입니다.

v2.8.0 제외 대상과 사유:

- 자동 Rule/Profile 저장/적용: 3.0 전에는 operator approval 없는 write path를 늘리지 않습니다.
- 외부 alert 실제 발송 성공 보장: endpoint/credential/field smoke가 필요한 운영 항목입니다.
- VLM default-on 또는 provider 재호출/rerank: privacy/provider 비용과 evidence 경계가 큽니다.
- ONVIF persistent credential store 완료 선언: 별도 credential provider 설계와 field evidence가 필요합니다.
- Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path 변경: 2.x 호환성 유지 조건입니다.
- runtime/model bundle default 배포: source-only release 기본 정책을 유지합니다.

license/provenance/privacy/운영 제약:

- 기본 공개 형태는 source-only이며 FFmpeg/GStreamer/ONNX/VLM/YOLO runtime/model binary를 release asset에 포함하지 않습니다.
- provider credential, prompt/raw response/source URL/raw frame bytes는 문서, UI, client, event payload, release evidence에 원문 노출하지 않습니다.
- external TURN/WHEP, ONVIF 실기기, real cloud/VLM provider는 endpoint/credential/명시 승인 없이는 field PASS 근거가 아닙니다.
- 안정화, UI 풀테스트, 30분, 120분, published metadata는 서로 대체하지 않습니다.

불변 조건:

- Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload schema를 요청 없이 바꾸지 않습니다.
- 외부 TURN/WHEP, ONVIF 실기기, real cloud/VLM provider는 사용자 endpoint/credential/승인 없이는 PASS 근거가 아닙니다.
- 기존 네 영역인 안정화 테스트, 30분 테스트, 120분 테스트, UI 풀테스트는 서로 대체하지 않습니다.
- 실제 tag/push는 수동 승인 후에만 수행합니다.

| Step | ID | Priority | 상태 | 묶음 | 개발 내용 | 완료 산출물 | 검증/evidence 경계 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | V280-S00 | P0 | 완료 | v2.8.0 baseline | v2.8.0 branch/source-of-truth 정렬 | VERSION/CMake/README/docs index/release metadata가 source `2.8.0`, latest published `v2.7.0`, current roadmap `v2.8.0 Operator-Supervised Action Readiness` 기준으로 정렬됨 | roadmap review, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`, `git diff --check`; UI/30분/120분/published metadata는 별도 |
| 1 | V280-S01 | P0 | 예정 | 2.x runway boundary | `2.8.0`/`2.9.0`까지만 2.x를 유지하고 `3.0.0` major-change line을 별도 설계/승인 대상으로 분리 | roadmap/version/release/inventory가 2.x runway와 3.0 boundary를 같은 문구로 설명 | 문서 gate 기준. 3.0 설계 완료나 migration 구현 evidence가 아님 |
| 2 | V280-S02 | P0 | 완료 | Incident Action Readiness Queue | `/ops/events`에서 operator가 승인 가능한 follow-up 후보를 readiness queue로 묶고, ready/blocked/field-smoke-needed/not-run 상태를 분리 | Ops-only action readiness view model/UI, external delivery 미수행 상태, 자동 action write 없음 | verifier `verify-v280-incident-action-readiness-queue`; UI 풀테스트 직접 조작과 외부 alert 성공은 별도 |
| 3 | V280-S03 | P0 | 완료 | Approval-gated Rule Draft Readiness | Rule What-if/incident-to-rule 후보를 저장 전 approval state, validation summary, staged draft로 분리 | `/ops/rules` 수동 draft context, no-auto-save/no-auto-apply boundary, rule registry 자동 write 없음 | verifier `verify-v280-approval-gated-rule-draft`; full replay/자동 저장/자동 적용 evidence가 아님 |
| 4 | V280-S04 | P1 | 완료 | Evidence Intake and Field Readiness | redacted evidence/source health/field smoke precondition을 준비 상태로 모아 passed/failed/blocked/not-run을 분리 | field readiness panel, credential/endpoint required 상태, release-safe evidence intake 기준, `media-server.ops.evidence-intake-field-readiness.v1` | verifier `verify-v280-evidence-intake-field-readiness`; endpoint/credential 없는 field PASS가 아님 |
| 5 | V280-S05 | P1 | 완료 | Runtime Evidence Window | 기존 runtime/source/event buffer에서 incident-linked 짧은 evidence window를 보여주되 장기 저장소를 만들지 않음 | Ops-only runtime evidence packet, page/session or bounded local buffer, bounded runtime/source/event evidence window, `media-server.ops.runtime-evidence-window.v1`, longrun substitute 아님 표기 | verifier `verify-v280-runtime-evidence-window`; 30분/120분/장기 녹화 evidence가 아님 |
| 6 | V280-S06 | P2 | 완료 | Client-safe Follow-up Digest | viewer에게 허용된 PublishedView 범위에서 후속 조치 상태만 redacted digest로 표시 | `/client/api/views/{id}/events`의 `followUpDigest`, `media-server.client.follow-up-digest.v1`, source/raw/debug/provider/rule editor/action control 비노출 | verifier `verify-v280-client-safe-followup-digest`; viewer 브라우저 직접 확인 전 UI PASS가 아님 |
| 7 | V280-S07 | P2 | 예정 | 릴리즈 준비 | v2.8.0 소유권 분리/릴리즈 준비 | feature inventory, manual UI criteria, release readiness gate, not-run/excluded 경계 정리 | 후보 verifier `verify-v280-owner-release-readiness`; UI/30분/120분/published metadata/tag/push/GitHub Release evidence는 별도 승인/evidence |

## v2.8.0 publish/test 제외 경계

- `V280-S00` source-of-truth 정렬은 2.8.0 GitHub Release publish 완료가 아닙니다.
- 예정 항목은 구현과 직접 evidence가 생기기 전까지 완료로 쓰지 않습니다.
- 후보 verifier 이름은 구현 전 PASS 근거가 아니며, 각 스텝 구현 시 `server.sh` wiring과 script inventory를 함께 추가해야 합니다.
- UI 풀테스트 직접 조작 미실행은 local verifier PASS로 대체하지 않습니다.
- 30분 테스트 미실행은 `verify-predev --soak-minutes 30` PASS로 보고하지 않습니다.
- 120분 테스트 미실행은 `verify-predev --soak-minutes 120` 또는 `verify-va-runtime-console-longrun --duration-minutes 120` PASS로 보고하지 않습니다.
- `v2.8.0` GitHub Release publish 완료는 tag, GitHub Release, `verify-release-metadata --published` evidence가 있을 때만 기록합니다.
- PR merge/main sync/next branch sync는 별도 명시 승인과 실제 실행 evidence가 있기 전까지 완료로 쓰지 않습니다.

## v2.8.0 S02 개발 기록

- `src/ingress/webrtc_http_server.cpp`: `OpsIncidentActionReadinessQueueViewJson`, `OpsIncidentActionReadinessQueueItemJson`, `OpsIncidentActionReadinessFollowUpJson`를 추가해 `/ops/api/events/reviews` 응답에 `incidentActionReadinessQueue` Ops-only view model을 붙였습니다. 이 view model은 기존 EventRecord/review state를 `media-server.ops.incident-action-readiness-queue.v1` schema, ready/blocked/field-smoke-needed/not-run count, blocker reason, field smoke 필요 여부, operator approval required follow-up 후보로 요약하며 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata/RTSP/WebRTC media path schema를 바꾸지 않습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/events` HTML에 `data-testid="ops-incident-action-readiness-queue"`, `data-incident-action-readiness-queue="operator-supervised-follow-ups"`, `opsIncidentActionReadinessQueueSummary`, `opsIncidentActionReadinessQueueBadges`, `opsIncidentActionReadinessQueueRows`를 추가해 Incident Action Readiness Queue shell을 제공했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderIncidentActionReadinessQueue`를 추가해 `incidentActionReadinessQueue` payload의 `readinessStatus`, `blockerReasons`, `fieldSmokeRequired`, `manualApprovalRequired`, `autoActionWritePerformed:false`, `externalDeliveryPerformed:false`, follow-up route/status를 렌더링합니다. 이 UI는 준비 상태와 수동 승인 필요성을 표시하며 외부 발송, 자동 action write, rule/source registry write를 실행하지 않습니다.
- `src/ingress/product_ui_css.cpp`: `.incident-action-readiness-queue`, `.incident-action-readiness-queue-list`, `.incident-action-readiness-queue-card`, `.incident-action-readiness-blockers`, `.incident-action-readiness-followups`, `.incident-action-readiness-followup` 스타일을 추가해 긴 event/source/rule/follow-up 문자열이 `/ops/events` layout을 밀어내지 않게 했습니다.
- `scripts/internal/verify_v280_incident_action_readiness_queue.mjs`, `server.sh`: S02 static verifier와 `verify-v280-incident-action-readiness-queue` command를 추가했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`, `docs/project-feature-test-inventory.md`, `docs/manual-ui-checklist.md`, `docs/stream-verification.md`: S02 coverage `UI-055`/`EVT-055`/`LAB-079`/`SAFE-065`, static smoke marker, 수동 UI 기준, stream verification command 연결을 정렬했습니다.
- 검증: `./server.sh build`, `verify-v280-incident-action-readiness-queue`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-docs-links`, `verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081`, `verify-ops-client-ui --browser-mode chrome --allow-chrome-fallback=1 --screenshots --http-base http://127.0.0.1:8081`, `verify-event-post --mode disabled --http-base http://127.0.0.1:8081`, `verify-ws-metadata --http-base http://127.0.0.1:8081`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `MEDIA_SERVER_UI_BROWSER_MODE=chrome MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1 ./server.sh verify-rule-ui --http-base http://127.0.0.1:8081`, `git diff --check`를 실행했고 재검증 기준 PASS입니다.
- 수정한 이슈: 최초 `verify-ops-client-ui --browser-mode static`은 서버 미기동으로 fetch 실패했습니다. sandbox 서버 기동은 RTSP bind `Operation not permitted`, sandbox Node fetch는 `connect EPERM`, auth-on 서버는 `/login`/401로 실패했으며, auth-off throwaway 서버와 unrestricted verifier로 재실행해 PASS했습니다. 최초 `verify-auth-bootstrap`은 `MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD` 계열 env 누락으로 실패했고, 일회성 테스트 operator env를 명시해 `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`를 재실행해 PASS했습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 외부 alert 실제 성공, 30분/120분 장시간 테스트, cloud/provider 호출, client/viewer 노출 검수의 브라우저 직접 조작, GitHub Release publish는 S02 완료 근거가 아닙니다.

## v2.8.0 S03 개발 기록

- `src/ingress/webrtc_http_server.cpp`: `OpsApprovalGatedRuleDraftReadinessViewJson`, `OpsApprovalGatedRuleDraftReadinessItemJson`, `OpsApprovalGatedRuleDraftValidationState`를 추가해 `/ops/api/events/reviews` 응답에 `approvalGatedRuleDraftReadiness` Ops-only view model을 붙였습니다. 이 view model은 Rule What-if/incident-to-rule 후보를 `media-server.ops.approval-gated-rule-draft-readiness.v1` schema, approval state, validation summary, staged draft로 분리하며 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata/RTSP/WebRTC media path schema를 바꾸지 않습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/events` HTML에 `data-testid="ops-approval-gated-rule-draft-readiness-events"`, `opsApprovalGatedRuleDraftReadinessSummary`, `opsApprovalGatedRuleDraftReadinessBadges`, `opsApprovalGatedRuleDraftReadinessRows`를 추가해 incident-to-rule 후보의 staged draft readiness 목록을 제공합니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/rules` HTML에 `data-testid="ops-approval-gated-rule-draft-readiness"`, `data-approval-gated-rule-draft="manual-approval-staged-only"`, `opsApprovalGatedRuleDraftContext`, `opsApprovalGatedRuleDraftBadges`, `opsApprovalGatedRuleDraftRows`를 추가해 `approvalDraft=1` query 기반 수동 draft context를 표시합니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderApprovalGatedRuleDraftReadiness`를 추가해 `/ops/events`에서 `approvalState`, `validationSummary`, `stagedDraft`, `noAutoSave:true`, `noAutoApply:true`, `ruleRegistryWritePerformed:false`, `fullReplayEngineExecuted:false`를 렌더링합니다. `renderOpsApprovalGatedRuleDraftContext`는 `/ops/rules?draftEventId=<id>&whatIfPreview=1&approvalDraft=1`에서 수동 승인 context만 표시하며 저장 API를 호출하지 않습니다.
- `src/ingress/product_ui_css.cpp`: `.approval-gated-rule-draft-readiness`, `.approval-gated-rule-draft-readiness-list`, `.approval-gated-rule-draft-readiness-card`, `.approval-gated-rule-draft-grid`, `.ops-approval-gated-rule-draft-list`, `.ops-approval-gated-rule-draft-card` 스타일을 추가해 validation summary와 staged draft 문자열을 responsive layout 안에 유지합니다.
- `scripts/internal/verify_v280_approval_gated_rule_draft.mjs`, `server.sh`: S03 static verifier와 `verify-v280-approval-gated-rule-draft` command를 추가했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`, `docs/project-feature-test-inventory.md`, `docs/manual-ui-checklist.md`, `docs/stream-verification.md`: S03 coverage `UI-056`/`RULE-104`/`EVT-056`/`LAB-080`/`SAFE-066`, static smoke marker, 수동 UI 기준, stream verification command 연결을 정렬했습니다.
- 검증: `./server.sh build`, `verify-v280-approval-gated-rule-draft`, `verify-v280-incident-action-readiness-queue`, `verify-v270-rule-what-if-preview`, `verify-vlm-rule-suggestion-draft-workflow`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-docs-links`, `verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081`, `verify-ops-client-ui --browser-mode chrome --allow-chrome-fallback=1 --screenshots --http-base http://127.0.0.1:8081`, `verify-event-post --mode disabled --http-base http://127.0.0.1:8081`, `verify-ws-metadata --http-base http://127.0.0.1:8081`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `MEDIA_SERVER_UI_BROWSER_MODE=chrome MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1 ./server.sh verify-rule-ui --http-base http://127.0.0.1:8081`, `git diff --check`를 실행했고 재검증 기준 PASS입니다. 로컬 UI/API verifier는 auth-off throwaway 서버와 unrestricted localhost/Chrome 실행으로 확인했습니다.
- 수정한 이슈: 최초 `verify-v270-rule-what-if-preview`는 v2.7 완료 roadmap이 현재 backlog의 completed baseline 표로 이동한 문서 구조를 인식하지 못해 실패했습니다. `scripts/internal/verify_v270_rule_what_if_preview.mjs`가 active 상세 행과 completed baseline 행을 모두 허용하고, 상세 snippet은 backlog/inventory/manual UI evidence set에서 확인하도록 보정한 뒤 재실행해 PASS했습니다.
- 미실행/비대체: full replay 실행, rule/profile registry 자동 저장, 자동 적용, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, cloud/provider 호출, GitHub Release publish는 S03 완료 근거가 아닙니다.

## v2.8.0 S04 개발 기록

- 범위: P1 `V280-S04 Evidence Intake and Field Readiness`.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/events/reviews` 응답에 `evidenceIntakeFieldReadiness`를 추가하고 `OpsEvidenceIntakeFieldReadinessViewJson`, `OpsEvidenceIntakeFieldReadinessItemJson`, `OpsEvidenceIntakeFieldPreconditionJson`으로 redacted evidence intake, source health recheck, field smoke precondition을 `passed`/`failed`/`blocked`/`not-run`으로 분리했습니다. endpoint/credential 없는 field PASS는 `endpointCredentialFieldPassClaimed:false`로 고정하고 credential/source/raw/debug/provider material은 노출하지 않습니다.
- `src/ingress/webrtc_http_server.cpp`, `src/ingress/product_ui_page_scripts.cpp`, `src/ingress/product_ui_css.cpp`: `/ops/events`에 Evidence Intake and Field Readiness panel, `opsEvidenceIntakeFieldReadinessRows`, `renderEvidenceIntakeFieldReadiness`, status badge, precondition cards, redaction chips를 추가했습니다.
- `scripts/internal/verify_v280_evidence_intake_field_readiness.mjs`, `server.sh`, `scripts/internal/verify_ops_client_ui_smoke.mjs`: S04 static verifier와 UI smoke marker, `verify-v280-evidence-intake-field-readiness` command를 추가했습니다.
- 검증: `./server.sh build`, `verify-v280-evidence-intake-field-readiness`, `verify-v280-approval-gated-rule-draft`, `verify-v280-incident-action-readiness-queue`, `verify-v250-redacted-incident-evidence-bundle`, `verify-ops-source-health-bulk`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081`, `verify-ops-client-ui --browser-mode chrome --allow-chrome-fallback=1 --screenshots --http-base http://127.0.0.1:8081`, `verify-event-post --mode disabled --http-base http://127.0.0.1:8081`, `verify-ws-metadata --http-base http://127.0.0.1:8081`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `MEDIA_SERVER_UI_BROWSER_MODE=chrome MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1 ./server.sh verify-rule-ui --http-base http://127.0.0.1:8081`, `git diff --check`를 실행했고 재검증 기준 PASS입니다. 로컬 UI/API verifier는 auth-off throwaway 서버와 unrestricted localhost/Chrome 실행으로 확인했습니다.
- 수정한 이슈: TDD RED에서 최초 `verify-v280-evidence-intake-field-readiness`는 roadmap/API/UI/smoke marker 누락으로 실패했습니다. 구현 후 inventory의 `SRC-032`, `EVT-057` 라벨이 verifier 기대 명칭과 달라 재실패했고, S04 실제 source health/readiness view model 이름으로 정렬한 뒤 PASS했습니다. 최초 `verify-auth-*` 3종은 sandbox RTSP bind `Operation not permitted`로 실패했으며 같은 일회성 auth env를 유지하고 unrestricted 실행으로 재검증해 PASS했습니다.
- 비범위: 실제 endpoint/credential field smoke PASS, 외부 provider 호출, EventRecord/Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path, viewer/client 노출 변경은 하지 않았습니다.

## v2.8.0 S05 개발 기록

- 범위: P1 `V280-S05 Runtime Evidence Window`.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/events/reviews` 응답에 `runtimeEvidenceWindow`를 추가하고 `OpsRuntimeEvidenceWindowViewJson`, `OpsRuntimeEvidenceWindowItemJson`, `OpsRuntimeEvidenceWindowPacketJson`으로 EventRecord/review state 기준 incident-linked runtime/source/event evidence packet을 구성했습니다. packet은 `boundedLocalBuffer:true`, `pageSessionOnly:true`, `eventWindowMs:15000`, `persistentArchiveCreated:false`, `longrunSubstitute:false`, `thirtyMinutePassClaimed:false`, `oneHundredTwentyMinutePassClaimed:false`를 고정합니다.
- `src/ingress/webrtc_http_server.cpp`, `src/ingress/product_ui_page_scripts.cpp`, `src/ingress/product_ui_css.cpp`: `/ops/events`에 Runtime Evidence Window panel, `opsRuntimeEvidenceWindowRows`, `renderRuntimeEvidenceWindow`, bounded window badges, runtime/source/event packet summary, no-longrun/no-archive chips를 추가했습니다.
- `scripts/internal/verify_v280_runtime_evidence_window.mjs`, `server.sh`, `scripts/internal/verify_ops_client_ui_smoke.mjs`: S05 static verifier와 UI smoke marker, `verify-v280-runtime-evidence-window` command를 추가했습니다.
- 검증: `./server.sh build`, `verify-v280-runtime-evidence-window`, `verify-v280-evidence-intake-field-readiness`, `verify-v280-approval-gated-rule-draft`, `verify-v280-incident-action-readiness-queue`, `verify-v260-runtime-dashboard-trends`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081`, `verify-ops-client-ui --browser-mode chrome --allow-chrome-fallback=1 --screenshots --http-base http://127.0.0.1:8081`, `verify-event-post --mode disabled --http-base http://127.0.0.1:8081`, `verify-ws-metadata --http-base http://127.0.0.1:8081`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `MEDIA_SERVER_UI_BROWSER_MODE=chrome MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1 ./server.sh verify-rule-ui --http-base http://127.0.0.1:8081`, `git diff --check`를 실행했고 재검증 기준 PASS입니다. 로컬 UI/API verifier는 auth-off throwaway 서버와 unrestricted localhost/Chrome 실행으로 확인했습니다.
- 수정한 이슈: TDD RED에서 최초 `verify-v280-runtime-evidence-window`는 roadmap/API/UI/smoke marker 누락으로 실패했습니다. 구현 후 인접 회귀 `verify-v260-runtime-dashboard-trends`가 현재 backlog의 v2.6 완료 baseline 구조를 인식하지 못해 실패했고, `scripts/internal/verify_v260_runtime_dashboard_trends.mjs`의 roadmap evidence 인식을 active table 또는 completed baseline table 모두 허용하도록 보정한 뒤 PASS했습니다.
- 비범위: persistent archive, 장기 녹화, 30분/120분 PASS claim, EventRecord/Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path, viewer/client 노출 변경은 하지 않았습니다.

## v2.8.0 S06 개발 기록

- 범위: P2 `V280-S06 Client-safe Follow-up Digest`.
- `src/ingress/webrtc_http_server.cpp`: `/client/api/views/{id}/events`의 기존 PublishedView-scoped `ClientEventSummary` 응답에 `followUpDigest`를 추가하고 `AppendClientSafeFollowUpDigestJson`, `ClientSafeFollowUpDigestStatus`로 `media-server.client.follow-up-digest.v1` viewer-safe digest를 구성했습니다. digest item은 `followUpStatus`, `severity`, `time`만 노출하며 `sourceUrlIncluded:false`, `rawEvidenceIncluded:false`, `debugMaterialIncluded:false`, `providerMaterialIncluded:false`, `ruleEditorIncluded:false`, `actionControlsIncluded:false`, `eventPostPayloadChanged:false`, `eventSchemaChanged:false`, `mediaPathChanged:false`를 고정합니다.
- `src/ingress/product_ui_client_scripts.cpp`, `src/ingress/product_ui_css.cpp`: `/client/live`, `/client/dashboard`, `/client/events`에 `renderClientSafeFollowUpDigest`, `data-testid="client-safe-followup-digest"`, `data-client-followup-digest="viewer-safe"`를 추가해 status/severity/time만 렌더링하고 raw/source/debug/provider/rule editor/action control 값을 읽지 않습니다.
- `scripts/internal/verify_v280_client_safe_followup_digest.mjs`, `server.sh`, `scripts/internal/verify_ops_client_ui_smoke.mjs`: S06 static verifier와 client smoke marker, `verify-v280-client-safe-followup-digest` command를 추가했습니다.
- 검증: `verify-v280-client-safe-followup-digest` 최초 RED는 API/renderer/smoke marker 누락으로 실패했습니다. 구현 후 GREEN 재실행 기준 PASS이며, S06 안정화 묶음에서는 `./server.sh build`, 인접 client-safe verifier, feature inventory/docs/UI/API/auth verifier와 `git diff --check`를 별도 기록합니다.
- 비범위: viewer role 브라우저 직접 조작, UI 풀테스트 PASS, 30분/120분 장시간 테스트, 외부 provider 호출, EventRecord/Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path, rule editor/action control 노출, GitHub Release publish는 S06 완료 근거가 아닙니다.

## 직전 공개 기준: v2.7.0 Source Release Baseline

v2.7.0은 source-only/live-only 제품 경계를 유지하면서 Operational Incident Command
Loop를 닫은 최신 공개 릴리즈입니다. 이 기준은 v2.8.0의 시작 baseline이며,
v2.8.0의 예정 항목 완료 evidence로 재사용하지 않습니다.

## 완료 roadmap: v2.7.0 Operational Incident Command Loop

| ID | 상태 | 요약 | 현재 해석 |
| --- | --- | --- | --- |
| V270-S00 | 완료 | v2.7.0 baseline/source-of-truth 정렬 | 최신 published baseline, v2.8.0 완료 근거 아님 |
| V270-S01 | 완료 | Incident Triage Board | 최신 published baseline, v2.8.0 완료 근거 아님 |
| V270-S02 | 완료 | Incident Decision Scorecard | 최신 published baseline, v2.8.0 완료 근거 아님 |
| V270-S03 | 완료 | Operational Action Pack | 최신 published baseline, v2.8.0 완료 근거 아님 |
| V270-S04 | 완료 | Rule What-if Preview | 최신 published baseline, v2.8.0 완료 근거 아님 |
| V270-S05 | 완료 | Operator outcome memory | 최신 published baseline, v2.8.0 완료 근거 아님 |
| V270-S06 | 완료 | v2.7.0 owner release readiness local gate | 최신 published baseline, v2.8.0 완료 근거 아님 |

## v2.7.0 S01 개발 기록

- `src/ingress/webrtc_http_server.cpp`: `OpsIncidentTriageBoardViewJson`, `OpsIncidentTriageBoardCardJson`, `OpsIncidentTriageBoardLane`, `OpsIncidentTriageBoardPriority`를 추가해 `/ops/api/events/reviews` 응답에 `incidentTriageBoard` Ops-only view model을 붙였습니다. 이 view model은 기존 EventRecord/review state와 sidecar rule suggestion 상태를 priority, review state, source, rule, scenario, similar incident key, VLM candidate status 기준 card로 요약하며 EventRecord/Event POST/WebRTC/SSE/WS/RTSP/WebRTC media path schema를 바꾸지 않습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/events` HTML에 `data-testid="ops-incident-triage-board"`, `opsIncidentTriageLaneFilter`, `opsIncidentTriagePriorityFilter`, `opsIncidentTriageSort`, `opsIncidentTriageBoardRows`를 추가해 lane/filter/sort board shell을 제공했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderIncidentTriageBoard`를 추가해 `media-server.ops.incident-triage-board.v1` card를 lane별로 렌더링하고 priority/review-age/event-time sort와 lane/priority filter 변경 시 refresh를 연결했습니다.
- `src/ingress/product_ui_css.cpp`: `.incident-triage-board`, `.incident-triage-board-lanes`, `.incident-triage-lane`, `.incident-triage-card` 스타일을 추가해 `/ops/events` 안에서 compact board layout을 유지합니다.
- `scripts/internal/verify_v270_incident_triage_board.mjs`, `server.sh`: S01 static verifier와 `verify-v270-incident-triage-board` command를 추가했습니다. 최초 RED는 API/UI/smoke marker 누락으로 실패했고 구현 후 GREEN으로 재실행했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/manual-ui-checklist.md`, `test/fixtures/manual_ui_fulltest_va_seed_matrix.json`: S01 coverage `UI-050`/`EVT-050`/`LAB-074`/`SAFE-058`, static smoke marker, current `v2.7.0` seed target, 수동 UI 기준을 연결했습니다.
- 검증: `./server.sh build`, `verify-v270-incident-triage-board`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081`, `verify-event-post --mode disabled --http-base http://127.0.0.1:8081`, `verify-ws-metadata --http-base http://127.0.0.1:8081`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `git diff --check`.
- 수정한 이슈: `verify-project-inventory`는 manual UI seed fixture가 `v2.6.0`으로 남아 최초 실패했고 `v2.7.0`으로 정렬 후 재실행했습니다. `./server.sh build`는 helper 선언 순서 문제로 최초 실패했고 forward declaration 추가 후 재실행했습니다. localhost UI/Event POST/WS/Auth verifier는 sandbox 포트/네트워크 제한과 auth 기본값 때문에 최초 실패했으며, auth-off throwaway 서버와 승인 실행, auth verifier용 일회성 test operator env로 재검증했습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, provider/cloud 호출, client/viewer 노출 검수의 브라우저 직접 조작, GitHub Release publish는 S01 완료 근거가 아닙니다.

## v2.7.0 S02 개발 기록

- `src/ingress/webrtc_http_server.cpp`: `OpsIncidentDecisionScorecardViewJson`, `OpsIncidentDecisionScorecardJson`, `OpsIncidentDecisionScorecardReasonChipsJson`를 추가해 `/ops/api/events/reviews` 응답에 `incidentDecisionScorecard` Ops-only view model을 붙였습니다. 이 view model은 기존 EventRecord/review state, source id, rule/scenario, similar incident key, VLM rule candidate 상태, operator review age를 deterministic priority reason chip으로 요약하며 EventRecord/Event POST/WebRTC/SSE/WS/RTSP/WebRTC media path schema를 바꾸지 않습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/events` HTML에 `data-testid="ops-incident-decision-scorecard"`, `data-incident-decision-scorecard="deterministic-priority-reasons"`, `opsIncidentDecisionScorecardSummary`, `opsIncidentDecisionScorecardBadges`, `opsIncidentDecisionScorecardRows`를 추가해 Decision Scorecard shell을 제공했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderIncidentDecisionScorecard`를 추가해 `media-server.ops.incident-decision-scorecard.v1` scorecard, priority reason chip, EventRecord basis, source health basis, similar incident basis, VLM summary/rule candidate status, operator review age를 렌더링합니다. raw payload/source URL 노출 여부는 badge로 확인하지만 raw payload 자체나 source locator는 화면에 표시하지 않습니다.
- `src/ingress/product_ui_css.cpp`: `.incident-decision-scorecard`, `.incident-decision-scorecard-list`, `.incident-decision-scorecard-card`, `.priority-reason-chip`, `.incident-decision-basis-grid` 스타일을 추가해 `/ops/events` 안에서 긴 reason/source/rule 문자열도 layout을 밀어내지 않게 했습니다.
- `scripts/internal/verify_v270_incident_decision_scorecard.mjs`, `server.sh`: S02 static verifier와 `verify-v270-incident-decision-scorecard` command를 추가했습니다. 최초 RED는 API view model/UI marker/static smoke marker 누락으로 실패했고 구현 후 GREEN으로 재실행했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `docs/project-feature-test-inventory.md`, `docs/manual-ui-checklist.md`: S02 coverage `UI-051`/`EVT-051`/`LAB-075`/`SAFE-059`, static smoke marker, 수동 UI 기준을 연결했습니다.
- 검증: `./server.sh build`, `verify-v270-incident-decision-scorecard`, `verify-v270-incident-triage-board`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-docs-links`, `verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081`, `verify-event-post --mode disabled --http-base http://127.0.0.1:8081`, `verify-ws-metadata --http-base http://127.0.0.1:8081`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `git diff --check`.
- 수정한 이슈: `/ops` static UI smoke가 visible copy의 `raw JSON` 문구를 forbidden copy로 판정해 실패했고, Decision Scorecard badge 문구를 `raw payload hidden`으로 바꾼 뒤 UI/Event POST/WS/Auth verifier를 재실행했습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, provider/cloud 호출, client/viewer 노출 검수의 브라우저 직접 조작, GitHub Release publish는 S02 완료 근거가 아닙니다.

## v2.7.0 S03 개발 기록

- `src/ingress/webrtc_http_server.cpp`: `OpsOperationalActionPackViewJson`, `OpsOperationalActionPackItemJson`, `OpsOperationalActionPackActionsJson`를 추가해 `/ops/api/events/reviews` 응답에 `operationalActionPack` Ops-only view model을 붙였습니다. 이 view model은 기존 EventRecord/review state를 release-safe evidence bundle, `/ops/rules` manual draft route, `/ops/api/alerts/deliveries/dry-run`, `/ops/api/source-health` recheck link로 묶으며 EventRecord/Event POST/WebRTC/SSE/WS/RTSP/WebRTC media path schema를 바꾸지 않습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/events` HTML에 `data-testid="ops-operational-action-pack"`, `data-operational-action-pack="manual-workflow-links"`, `opsOperationalActionPackBadges`, `opsOperationalActionPackRows`를 추가해 Operational Action Pack shell을 제공했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderOperationalActionPack`를 추가해 `media-server.ops.operational-action-pack.v1` card, release-safe bundle button, rule draft link, alert dry-run button, source health recheck link를 렌더링합니다. alert dry-run은 기존 dry-run route를 사용하며 외부 실제 발송을 수행하지 않고, rule draft는 `/ops/rules` 수동 경로만 노출합니다.
- `src/ingress/product_ui_css.cpp`: `.operational-action-pack`, `.operational-action-pack-list`, `.operational-action-pack-card`, `.operational-action-pack-actions` 스타일을 추가해 `/ops/events` 안에서 action button과 상태 badge가 줄바꿈되도록 했습니다.
- `scripts/internal/verify_v270_operational_action_pack.mjs`, `server.sh`: S03 static verifier와 `verify-v270-operational-action-pack` command를 추가했습니다. 최초 RED는 API view model/UI marker 누락으로 실패했고 구현 후 GREEN으로 재실행했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `docs/project-feature-test-inventory.md`, `docs/manual-ui-checklist.md`: S03 coverage `UI-052`/`EVT-052`/`LAB-076`/`SAFE-060`, static smoke marker, 수동 UI 기준을 연결했습니다.
- `scripts/internal/verify_ops_source_health_bulk.mjs`: 현재 `/ops/sources` 스크립트가 `src/ingress/product_ui_ops_sources_script.cpp`로 분리된 구조를 반영하도록 verifier range를 갱신했습니다. 이는 source health bulk 제품 로직 변경이 아니라 stale verifier 수정입니다.
- 검증: `./server.sh build`, `verify-v270-operational-action-pack`, `verify-v270-incident-triage-board`, `verify-v270-incident-decision-scorecard`, `verify-v250-redacted-incident-evidence-bundle`, `verify-ops-alert-delivery-integrations`, `verify-ops-source-health-bulk`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-docs-links`, `verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081`, `verify-event-post --mode disabled --http-base http://127.0.0.1:8081`, `verify-ws-metadata --http-base http://127.0.0.1:8081`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `MEDIA_SERVER_UI_BROWSER_MODE=chrome MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1 ./server.sh verify-rule-ui --http-base http://127.0.0.1:8081`, `git diff --check`.
- 수정한 이슈: `./server.sh build`는 `OpsEventReviewState`의 실제 필드가 `incident_status`인데 `review.incident.status`로 참조해 최초 실패했고 필드 참조를 고친 뒤 재실행했습니다. `verify-ops-client-ui --browser-mode static`은 서버 없이 실행해 fetch 실패가 났고 auth-off throwaway 서버를 띄운 뒤 재실행했습니다. `verify-rule-ui`는 인앱 evidence 파일 없는 환경에서 기본 실행과 잘못된 `--in-app-evidence` 단독 실행이 실패했고, 프로젝트 verifier가 요구하는 명시적 Chrome fallback 환경으로 재실행했습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, provider/cloud 호출, 실제 외부 alert delivery, 자동 rule registry write, source registry write, GitHub Release publish는 S03 완료 근거가 아닙니다.

## v2.7.0 S04 개발 기록

- `src/ingress/webrtc_http_server.cpp`: `OpsRuleWhatIfPreviewViewJson`, `OpsRuleWhatIfPreviewItemJson`, `OpsRuleWhatIfPreviewDraftJson`를 추가해 `/ops/api/events/reviews` 응답에 `ruleWhatIfPreview` Ops-only view model을 붙였습니다. 이 view model은 기존 EventRecord/review state와 matching VLM rule suggestion 후보를 selected incident condition preview, draft comparison, `/ops/rules?draftEventId=<eventId>&whatIfPreview=1` manual draft route로 요약하며 EventRecord/Event POST/WebRTC/SSE/WS/RTSP/WebRTC media path schema를 바꾸지 않습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/events` HTML에 `data-testid="ops-rule-what-if-preview"`, `data-rule-what-if-preview="selected-incident-draft-only"`, `opsRuleWhatIfPreviewBadges`, `opsRuleWhatIfPreviewRows`를 추가해 Rule What-if Preview shell을 제공했습니다. `/ops/rules`에는 `data-testid="ops-rule-what-if-preview-draft-context"`, `opsRuleWhatIfDraftContext`를 추가해 `draftEventId`와 `whatIfPreview=1` query가 있을 때 수동 저장 전 context를 표시합니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderRuleWhatIfPreview`를 추가해 `media-server.ops.rule-what-if-preview.v1` card, `draftComparison`, `conditionPreview`, `/ops/rules` draft-only link, no full replay/no auto apply/no rule write badge를 렌더링합니다. `opsRuleWhatIfDraftContextFromLocation`와 `renderOpsRuleWhatIfDraftContext`는 `/ops/rules` query context만 표시하며 저장 API나 rule registry write를 호출하지 않습니다.
- `src/ingress/product_ui_css.cpp`: `.rule-what-if-preview`, `.rule-what-if-preview-list`, `.rule-what-if-preview-card`, `.rule-what-if-preview-comparison` 스타일을 추가해 `/ops/events` 안에서 condition preview와 draft comparison이 줄바꿈 가능한 compact card로 표시되게 했습니다.
- `scripts/internal/verify_v270_rule_what_if_preview.mjs`, `server.sh`: S04 static verifier와 `verify-v270-rule-what-if-preview` command를 추가했습니다. 최초 RED는 API view model, `/ops/events` UI marker, `/ops/rules` draft context marker 누락으로 실패했고 구현 후 GREEN으로 재실행했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `docs/project-feature-test-inventory.md`, `docs/manual-ui-checklist.md`: S04 coverage `UI-053`/`EVT-053`/`LAB-077`/`SAFE-061`, static smoke marker, 수동 UI 기준을 연결했습니다.
- 검증: `./server.sh build`, `verify-v270-rule-what-if-preview`, `verify-v270-incident-triage-board`, `verify-v270-incident-decision-scorecard`, `verify-v270-operational-action-pack`, `verify-vlm-rule-suggestion-draft-workflow`, `verify-ops-rules-roundtrip --http-base http://127.0.0.1:8081`, `verify-analysis-state`, `verify-va-replay`, `verify-va-events`, `verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081`, `verify-event-post --mode disabled --http-base http://127.0.0.1:8081`, `verify-ws-metadata --http-base http://127.0.0.1:8081`, `verify-rule-ui --http-base http://127.0.0.1:8081` with explicit Chrome fallback, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `git diff --check`.
- 수정한 이슈: `verify-vlm-rule-suggestion-draft-workflow`는 backlog의 과거 수정 이슈 문장에 남은 client/VLM route 결합 금지 패턴 문자열 때문에 최초 실패했고, 문장 의미는 유지하되 금지 패턴 직접 표기를 제거한 뒤 재실행했습니다. 서버 연동 verifier는 sandbox localhost EPERM 또는 auth 기본값 401로 최초 실패해 auth-off throwaway 서버와 승인 실행으로 재검증했습니다. `verify-va-events --http-base ...`는 지원하지 않는 옵션으로 실패했고, 기본 포트 방식으로 단독 재실행했습니다. `verify-auth-routes`는 병렬 실행 중 RTSP port 충돌로 실패해 단독 재실행했습니다.
- 임시 산출물 정리: S04 검증에서 생성된 `media_server_evtpost-1781616589-97688*`, `media_server_vaevt-1781616656-1241*`, `media_server_va_replay_baselines`, `media_server_analysis_state_smoke-92319`, `media_server_va_metadata_replay-*` 현재 run 출력은 삭제 후 동일 패턴으로 남은 항목이 없음을 확인했습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, provider/cloud 호출, full replay engine, 자동 rule/profile 저장, 자동 적용, GitHub Release publish는 S04 완료 근거가 아닙니다.

## v2.7.0 S05 개발 기록

- `src/ingress/webrtc_http_server.cpp`: `OpsOperatorOutcomeMemoryViewJson`, `OpsOperatorOutcomeMemoryItemJson`, `OpsOperatorOutcomeMemoryHistoryHintJson`, `OpsOperatorOutcomeMemoryCountsJson`를 추가해 `/ops/api/events/reviews` 응답에 `operatorOutcomeMemory` Ops-only view model을 붙였습니다. 이 view model은 기존 EventRecord와 Ops review state/audit action reference를 읽어 accept/dismiss/review-needed/not-reviewed outcome, `similarIncidentKey`별 outcome count, `deterministicHistoryHint`, `reviewStateBasis`, `auditActionRefs`를 요약하며 EventRecord/Event POST/WebRTC/SSE/WS/RTSP/WebRTC media path schema를 바꾸지 않습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/events` HTML에 `data-testid="ops-operator-outcome-memory"`, `data-operator-outcome-memory="review-audit-history-hint"`, `opsOperatorOutcomeMemoryBadges`, `opsOperatorOutcomeMemoryRows`를 추가해 Operator Outcome Memory shell을 제공했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderOperatorOutcomeMemory`를 추가해 `media-server.ops.operator-outcome-memory.v1` card, accept/dismiss/review-needed count, deterministic history hint, review state basis, audit action reference를 렌더링하고 `refreshEvents`와 raw debug payload에 `operatorOutcomeMemory`를 연결했습니다.
- `src/ingress/product_ui_css.cpp`: `.operator-outcome-memory`, `.operator-outcome-memory-list`, `.operator-outcome-memory-card`, `.operator-outcome-memory-hint` 스타일을 추가해 `/ops/events` 안에서 outcome count와 hint가 compact card로 표시되게 했습니다.
- `scripts/internal/verify_v270_operator_outcome_memory.mjs`, `server.sh`: S05 static verifier와 `verify-v270-operator-outcome-memory` command를 추가했습니다. 최초 RED는 API view model과 `/ops/events` UI marker 누락으로 실패했고 구현 후 GREEN으로 재실행했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `docs/project-feature-test-inventory.md`, `docs/manual-ui-checklist.md`: S05 coverage `UI-054`/`EVT-054`/`LAB-078`/`SAFE-062`, static smoke marker, 수동 UI 기준을 연결했습니다.
- 검증: `./server.sh build`, `verify-v270-operator-outcome-memory`, `verify-v270-incident-triage-board`, `verify-v270-incident-decision-scorecard`, `verify-v270-operational-action-pack`, `verify-v270-rule-what-if-preview`, `verify-vlm-review-action-workflow`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-docs-links`, `verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081`, `verify-ops-client-ui --browser-mode chrome --allow-chrome-fallback=1 --screenshots --http-base http://127.0.0.1:8081`, `verify-event-post --mode disabled --http-base http://127.0.0.1:8081`, `verify-ws-metadata --http-base http://127.0.0.1:8081`, `MEDIA_SERVER_UI_BROWSER_MODE=chrome MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1 ./server.sh verify-rule-ui --http-base http://127.0.0.1:8081`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `verify-ops-event-action-incident-workflow`, `verify-ops-audit-trail`, `verify-ops-audit-persistence`, `git diff --check`.
- 수정한 이슈: `verify-ops-client-ui --browser-mode static`은 sandbox localhost fetch 제한으로 최초 실패했고 승인 실행으로 재시도했습니다. auth-on 서버에서는 인증 요구로 shell marker 확인이 실패해 auth-off throwaway 서버로 재실행했고 최종 PASS를 확인했습니다. `verify-script-inventory`는 문서에 S06 `verify-v270-owner-release-readiness`가 선반영됐지만 command가 아직 없어 실패했으며, 이는 S05 제품 회귀가 아니라 S06에서 닫아야 하는 릴리즈 준비 wiring 누락입니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, provider/cloud 호출, 새 persistent outcome store, 자동 학습/자동 적용, client/viewer route 노출, GitHub Release publish는 S05 완료 근거가 아닙니다.

## v2.7.0 S06 개발 기록

- `scripts/internal/verify_v270_owner_release_readiness.mjs`, `server.sh`: S06 local release readiness verifier와 `verify-v270-owner-release-readiness` command를 추가했습니다. 최초 RED는 S06 feature inventory mapping, manual UI criteria, backlog/evidence 진행 기록 누락으로 실패했습니다.
- `docs/project-feature-test-inventory.md`: V270-S06 mapping을 `UI-050`~`UI-054`, `OPS-038`, `SAFE-063`으로 연결하고 summary count를 473개 기능 ID, UI 비대상 163개, 테스트 필요 473개, 안정화 대상 463개로 갱신했습니다. `OPS-038`은 v2.7.0 릴리즈 준비 게이트, `SAFE-063`은 local readiness PASS를 UI/30분/120분/published/tag/push evidence로 승격하지 않는 boundary입니다.
- `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`: 새 `OPS-038`/`SAFE-063` required row와 `verify-v270-owner-release-readiness` coverage 연결을 추가했습니다.
- `docs/manual-ui-fulltest.md`, `docs/manual-ui-checklist.md`: S06가 직접 UI PASS가 아니라 S01~S05 UI criteria와 release evidence/not-run boundary를 묶는 기준 정리임을 기록했습니다.
- `docs/release-policy.md`, `docs/release-evidence-index.md`, `docs/stream-verification.md`: `media-server.v270-owner-release-readiness.v1`, companion local gates, not-run/excluded/published metadata boundary를 연결했습니다.
- Companion local gates: `verify-v270-owner-release-readiness`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-feature-inventory-coverage`, `verify-manual-ui-evidence`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run`, `git diff --check`.
- 검증: `verify-v270-owner-release-readiness` 최초 RED는 S06 feature inventory mapping, manual UI criteria, backlog/evidence 진행 기록 누락으로 실패했고, 문서/inventory/server wiring 반영 후 GREEN으로 재실행했습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, `verify-release-metadata --published`, tag/push/GitHub Release, PR merge/main sync/후속 브랜치 생성, 실기기 ONVIF, external TURN/WHEP, real cloud/VLM provider 호출은 S06 local readiness 완료 근거가 아닙니다.

## 직전 공개 기준: v2.6.0 Source Release Baseline

v2.6.0은 source-only/live-only 제품 경계를 유지하면서 Operational Hardening &
Incident Memory Productization을 닫은 직전 공개 릴리즈입니다. 이 기준은 v2.7.0의
시작 baseline이며, v2.7.0의 예정 항목 완료 evidence로 재사용하지 않습니다.

## 완료 roadmap: v2.6.0 Operational Hardening & Incident Memory Productization

| ID | 상태 | 요약 | 현재 해석 |
| --- | --- | --- | --- |
| V260-S00 | 완료 | v2.6.0 baseline/source-of-truth 정렬 | 직전 published baseline, v2.7.0 완료 근거 아님 |
| V260-S01 | 완료 | VLM summary candidate의 Ops-only incident memory productization | 직전 published baseline, v2.7.0 완료 근거 아님 |
| V260-S02 | 완료 | Rule suggestion 후보의 manual review/draft workflow 연결 | 직전 published baseline, v2.7.0 완료 근거 아님 |
| V260-S03 | 완료 | ONVIF credential binding/store gate 설계와 redaction guard | 직전 published baseline, v2.7.0 완료 근거 아님 |
| V260-S04 | 완료 | Runtime dashboard baseline/sparkline 고도화 후보 | 직전 published baseline, v2.7.0 완료 근거 아님 |
| V260-S05 | 완료 | ScenarioEngine cross-zone re-entry 후보 | 직전 published baseline, v2.7.0 완료 근거 아님 |
| V260-S06 | 완료 | v2.6.0 owner release readiness local gate | 직전 published baseline, v2.7.0 완료 근거 아님 |

## v2.6.0 S01 개발 기록

- `src/ingress/webrtc_http_server.cpp`: `OpsVlmSummaryCandidateReviewJson`를 추가해 기존 VLM summary search candidate report를 `/ops/api/events/reviews`의 `memorySearch.vlmSummaryCandidateReview` Ops-only wrapper로 연결하고, `/ops/events` HTML에 candidate review panel shell을 추가했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderVlmSummaryCandidateReview`가 `sourceCandidateReport.candidates`, matched terms, manual review route, no-auto-apply 상태를 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: `/ops/events` candidate review panel/list/card 스타일을 추가했습니다.
- `scripts/internal/verify_v260_incident_memory_productization.mjs`, `server.sh`: S01 schema/wrapper/UI marker/docs/inventory/static smoke wiring guard를 추가했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`, `docs/project-feature-test-inventory.md`: `/ops/events` S01 UI marker와 `UI-045`/`EVT-046`/`LAB-069`/`SAFE-052` coverage를 추가했습니다.
- 검증: `./server.sh build`, `verify-v260-incident-memory-productization`, `verify-vlm-summary-search-candidates`, `verify-ops-client-ui --browser-mode static`, `verify-rule-ui --in-app-evidence`, `verify-event-post --mode disabled`, `verify-ws-metadata`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `git diff --check`.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, provider/cloud 호출, 자동 Rule/Profile 적용은 S01 완료 근거가 아닙니다.

## v2.6.0 S02 개발 기록

- `src/ingress/webrtc_http_server.cpp`: `OpsIncidentRuleSuggestionReviewJson`를 추가해 `/ops/api/events/reviews` item마다 matching VLM sidecar `ruleSuggestion`과 기존 `media-server.vlm-rule-suggestion-candidates.v1` candidate report를 `media-server.ops.incident-rule-suggestion-review.v1` Ops-only wrapper로 감쌌습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderIncidentRuleSuggestionReview`가 `/ops/events` review row 안에 incident-to-rule 검토 카드, candidate status, source candidate count, `/ops/rules` draft-only 링크를 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: incident-to-rule 검토 카드를 기존 event review/VLM review 카드와 같은 밀도로 보이도록 스타일을 추가했습니다.
- `scripts/internal/verify_v260_rule_suggestion_review.mjs`, `server.sh`: S02 wrapper schema, matching `ruleSuggestion`, `/ops/events` marker, `/ops/rules` draft-only 링크, docs/inventory wiring, client/provider/auto-rule 비범위를 검증하는 verifier를 추가했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `docs/project-feature-test-inventory.md`: S02 UI/API marker와 `UI-046`/`EVT-047`/`LAB-070`/`SAFE-053` coverage를 추가했습니다.
- 검증: `./server.sh build`, `verify-v260-rule-suggestion-review`, `verify-vlm-rule-suggestion-candidates`, `verify-vlm-rule-suggestion-draft-workflow`, `verify-ops-client-ui --browser-mode static`, `verify-ops-client-ui --browser-mode static --screenshots`, `verify-rule-ui --in-app-evidence`, `verify-event-post --mode disabled`, `verify-ws-metadata`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-docs-links`, `verify-docs-ui-assets`, `git diff --check`.
- 수정한 이슈: 기존 inventory 요약 문구가 S08 verifier의 client와 VLM route 결합 금지 패턴에 걸려 false positive가 발생했으므로, 의미를 유지한 채 `auth, Ops, Client, VLM, v250` 문구로 정리했습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, provider/cloud 호출, 자동 Rule/Profile 저장, GitHub Release publish는 S02 완료 근거가 아닙니다.

## v2.6.0 S03 개발 기록

- `src/ingress/onvif_live_import.cpp`: `UriContainsAuthorityCredential`와 `OnvifCredentialGateJson`를 추가해 `/ops/api/onvif/import-draft` draft response에 `credentialGate` summary를 붙이고, 선택 profile `streamUri` authority에 username/password가 있으면 draft 생성을 거부합니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/sources` ONVIF probe draft tool에 `data-testid="onvif-credential-gate"` 패널과 `source:write`, `primaryStoreProvider: none`, `reference-only`, secret store off 상태를 표시했습니다.
- `src/ingress/product_ui_ops_sources_script.cpp`: `renderOnvifCredentialGate`와 form validation을 추가해 ONVIF stream URI의 URL credential 입력을 제품 UI에서 차단하고, draft 적용 후 redacted `credentialGate` 상태만 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: `/ops/sources` credential gate panel의 compact status/card 스타일을 추가했습니다.
- `test/fixtures/onvif_credential_binding_gate.json`: 1차 선택값 `none`, fallback `in-memory-fixture`, 제외 대상 `local-encrypted`/`external-secret-manager`, license/provenance/privacy/운영 제약, redaction guard를 기록했습니다.
- `scripts/internal/verify_v260_onvif_credential_gate.mjs`, `server.sh`: S03 fixture, C++ gate, `/ops/sources` marker, URL credential reject, docs/inventory/command wiring, persistent store/client/schema/media 비범위 guard를 검증하는 명령을 추가했습니다.
- `scripts/internal/verify_onvif_import_draft_api.mjs`, `scripts/internal/verify_onvif_probe_draft_api.mjs`: `rtsp://user:pass@...` profile URL credential negative case를 추가했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`, `docs/project-feature-test-inventory.md`: `/ops/sources` static smoke marker와 `UI-047`/`SRC-031`/`LAB-071`/`SAFE-054` feature coverage를 추가했습니다.
- `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`: S03 feature inventory coverage와 row/range 검증 기준을 갱신했습니다.
- 검증: `./server.sh build`, `verify-v260-onvif-credential-gate`, `verify-onvif-credential-reference-policy`, `verify-onvif-auth-injection-design`, `verify-onvif-field-smoke-redaction`, `verify-onvif-auth-injection-loopback`, `verify-onvif-import-draft-api`, `verify-onvif-probe-draft-api`, `verify-ops-client-ui --browser-mode static`, `verify-ops-client-ui --browser-mode static --screenshots`, `verify-rule-ui --in-app-evidence`, `verify-event-post --mode disabled`, `verify-ws-metadata`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `verify-onvif-live-import-contract`, `verify-onvif-probe-fixture-contract`, `verify-onvif-protocol-support-matrix`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-docs-links`, `verify-docs-ui-assets`, `git diff --check`.
- 수정한 이슈: 최초 S03 verifier는 fixture/코드/UI marker가 없어 실패했고, 구현 후 재실행했습니다. 이후 `SRC-030` 중복과 inventory range verifier 불일치를 확인해 S03 source row를 `SRC-031`로 옮기고 verifier range를 갱신한 뒤 관련 inventory 검증을 다시 실행했습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, 실기기 ONVIF credential field smoke, persistent credential store 구현, external secret manager 연동, GitHub Release publish는 S03 완료 근거가 아닙니다.

## v2.6.0 S04 개발 기록

- `src/ingress/webrtc_http_server.cpp`: `/ops/dashboard` card grid에 `data-testid="ops-runtime-trend-card"` runtime trend card를 추가하고 `data-runtime-trend-scope="page-session-only"`, `data-longrun-evidence="not-provided"`로 장기 evidence가 아님을 표시했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `dashboardRuntimeTrendSamples`, `runtimeTrendSampleFrom`, `runtimeTrendSparklineHtml`, `renderDashboardRuntimeTrend`를 추가해 `/ops/api/runtime/status`, source health, events status 응답을 browser page session 안에서만 최대 12개 sample로 요약합니다.
- `src/ingress/product_ui_css.cpp`: `.runtime-sparkline`, `.runtime-spark-bar`, `.runtime-trend-baseline` 스타일을 추가해 compact dashboard card 안에서 layout shift 없이 sparkline 후보를 표시합니다.
- `scripts/internal/verify_v260_runtime_dashboard_trends.mjs`, `server.sh`: S04 dashboard marker, page-local sample buffer, CSS/UI smoke/docs/inventory wiring, longrun/schema/media/client 비범위를 검증하는 명령을 추가했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`, `docs/project-feature-test-inventory.md`: `/ops/dashboard` static smoke marker와 `UI-048`/`EVT-048`/`LAB-072`/`SAFE-055` coverage를 추가했습니다.
- `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`: S04 feature inventory coverage와 row/range 검증 기준을 갱신했습니다.
- 검증: `./server.sh build`, `verify-v260-runtime-dashboard-trends`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-ops-client-ui --browser-mode static`, `verify-ops-client-ui --browser-mode static --screenshots`, `verify-va-runtime-console`, `verify-ws-metadata`, `verify-va-metadata-sidechannel`, `verify-webrtc-va-metadata`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `git diff --check`.
- 수정한 이슈: 최초 S04 verifier는 roadmap/UI/script/CSS/inventory wiring 누락으로 실패했습니다. verifier의 `120분 PASS` 금지 패턴이 “PASS로 보고하지 않는다” 문구까지 잡는 오탐을 내서 금지 문구를 정확히 좁힌 뒤 다시 RED를 확인했습니다. auth verifier는 최초 env 미지정으로 시작 전 실패했고, 일회성 test operator env를 넣은 뒤 sandbox 포트 바인딩 실패가 발생해 승인 실행으로 재검증했습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, Runtime Dashboard longrun/cycle evidence, persistent trend store, server trend API, client/viewer trend 노출, GitHub Release publish는 S04 완료 근거가 아닙니다.

## v2.6.0 S05 개발 기록

- `include/analysis/re_entry_scenario.h`, `src/analysis/re_entry_scenario.cpp`: `re_entry_mode`, `re_entry_zone_ids`, source/destination zone 필터를 추가해 기본 `same-zone`은 유지하고 `configured-zones`에서 source zone A 이탈 후 destination zone B 진입 후보를 기존 `re-entry` event type으로 확정합니다.
- `src/analysis/event_rule_engine.cpp`: 저장 rule scenario payload의 기존 `reEntryMode`와 `reEntryZoneIds`를 ReEntryScenario runtime option으로 연결했습니다.
- `scripts/internal/analysis_state_smoke.cpp`: `configured-zones` A→B positive case와 destination 밖 negative case를 추가했습니다.
- `test/fixtures/va_replay/re_entry_cross_zone_*`, `scripts/internal/verify_va_replay_baselines.sh`: A→B cross-zone replay fixture와 expected EventRecord `zoneId=destination-zone` case를 `verify-va-replay` baseline에 추가했습니다.
- `src/ingress/webrtc_http_server.cpp`, `src/ingress/product_ui_page_scripts.cpp`: `/ops/rules` ReEntry 기준 select/condition summary/preset warning에 `지정 영역 A→B 후보`와 source/destination 기준을 표시했습니다.
- `scripts/internal/verify_v260_scenario_cross_zone_reentry.mjs`, `server.sh`: S05 C++ option/parser, analysis-state, va-replay fixture, UI/docs/inventory wiring, schema/media/client 비범위를 검증하는 명령을 추가했습니다.
- `docs/video-analysis.md`, `docs/ui-guide.md`, `docs/config-reference.md`, `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`: S05 candidate 범위, UI 기준, inventory `UI-049`/`RULE-103`/`EVT-049`/`LAB-073`/`SAFE-056`, command catalog를 갱신했습니다.
- 검증: `verify-analysis-state` RED 후 구현, `./server.sh build`, `verify-v260-scenario-cross-zone-reentry`, `verify-analysis-state`, `verify-va-replay`, `verify-rule-ui` Chrome fallback smoke, `verify-event-post --mode schema`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-docs-links`, `git diff --check`를 실행했습니다.
- 수정한 이슈: 새 replay fixture는 EventRuleEngine output은 정상 생성했지만 direct ScenarioEngine metric까지 expected로 요구해 최초 실패했습니다. S05 evidence 범위가 rule replay EventRecord 후보임을 반영해 expected에서 direct metric 요구를 제거하고 재검증했습니다. `verify-rule-ui` 기본 실행은 Codex 인앱 evidence 파일이 없어 시작 전 실패했고, 실행 중인 auth-off 서버와 명시 Chrome fallback으로 보조 smoke를 재실행해 통과했습니다. `verify-event-post --mode schema`는 dispatcher disabled 서버에서 사전조건 실패 후 `MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1` 서버로 재실행해 통과했습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, 새 event type, Event POST/WebRTC/SSE/WS schema 변경, RTSP/WebRTC media path 변경, client/viewer 노출, GitHub Release publish는 S05 완료 근거가 아닙니다.

## v2.6.0 S06 개발 기록

- `scripts/internal/verify_v260_owner_release_readiness.mjs`, `server.sh`: `media-server.v260-owner-release-readiness.v1` local readiness verifier와 `verify-v260-owner-release-readiness` command dispatch를 추가했습니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`: S06 mapping row, `OPS-037` release readiness gate, `SAFE-057` release boundary, `SAFE-001`~`SAFE-057`/`OPS-035`~`OPS-037` coverage range를 추가했습니다.
- `docs/manual-ui-checklist.md`, `docs/manual-ui-fulltest.md`: `UI-045`~`UI-049` Operational Hardening UI 기준을 수동 UI 풀테스트 항목으로 묶고 raw JSON/API-only/static smoke/Chrome fallback이 UI 풀테스트 PASS가 아님을 명시했습니다.
- `docs/release-policy.md`, `docs/release-evidence-index.md`, `docs/stream-verification.md`: S06 local readiness companion gate와 UI 풀테스트 직접 조작, 30분/120분, published metadata, tag/push/GitHub Release, PR/main/후속 브랜치 미실행 경계를 분리했습니다.
- 검증: `verify-v260-owner-release-readiness` RED 후 문서/스크립트 연결을 구현했고, `verify-v260-owner-release-readiness`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-feature-inventory-coverage`, `verify-manual-ui-evidence`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run`, `verify-project-inventory`, `verify-script-inventory`, `git diff --check`를 실행했습니다.
- 수정한 이슈: 최초 `verify-v260-owner-release-readiness`는 S06 inventory/manual UI/release evidence/stream command 연결이 없어 실패했습니다. `verify-manual-ui-evidence`는 current release UI gate 문구와 `## v2.6.0 Release Evidence Index` 템플릿이 없어 실패했고, manual UI checklist/result template/backlog cross-reference를 보강한 뒤 재실행 PASS했습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, `verify-release-metadata --published`, tag/push/GitHub Release, PR merge/main sync/후속 브랜치 생성은 S06 local readiness 완료 근거가 아닙니다.

## v2.6.0 publish/test 제외 경계

- `V260-S00` source-of-truth 정렬은 2.6.0 GitHub Release publish 완료가 아닙니다.
- 예정 항목은 구현과 직접 evidence가 생기기 전까지 완료로 쓰지 않습니다.
- UI 풀테스트 직접 조작 미실행은 local verifier PASS로 대체하지 않습니다.
- 30분 테스트 미실행은 `verify-predev --soak-minutes 30` PASS로 보고하지 않습니다.
- 120분 테스트 미실행은 `verify-predev --soak-minutes 120` 또는 `verify-va-runtime-console-longrun --duration-minutes 120` PASS로 보고하지 않습니다.
- `v2.6.0` GitHub Release publish 완료는 tag, GitHub Release, `verify-release-metadata --published` evidence가 있을 때만 기록합니다.
- PR merge/main sync/next branch sync는 별도 명시 승인과 실제 실행 evidence가 있기 전까지 완료로 쓰지 않습니다.

## Historical UI Evidence Gate Cross-reference

아래 행은 현재 v2.7.0 개발 범위가 아니라 `verify-manual-ui-evidence` 호환을 위한
과거 UI evidence gate 참조입니다. 실행 evidence나 현재 release 완료 근거가 아닙니다.

| ID | verifier | 경계 |
| --- | --- | --- |
| V180-P0-03 | Manual UI evidence checklist hardening / `verify-manual-ui-evidence` | `/setup`, `/login`, `/ops`, `/client`, `/ops/rules`, `/client/live` evidence index 문서가 PASS/FAIL, 제외 기록, raw JSON/API-only 비대체 경계를 유지하는지 확인 |
| V180-P1-03 | Release evidence index / `verify-release-evidence-index` | longrun, UI evidence, PR checks, release notes, skipped tests를 evidence index review 대상으로 묶되 실행하지 않은 release action을 PASS로 승격하지 않음 |

## 이전 공개 기준: v2.5.0 Source Release Baseline

v2.5.0은 source-only/live-only 제품 경계를 유지하면서 Semantic Incident Memory를 닫은
이전 공개 릴리즈입니다. 이 기준은 v2.6.0의 시작 baseline이며, v2.7.0의 예정 항목
완료 evidence로 재사용하지 않습니다.

## 완료 roadmap: v2.5.0 Semantic Incident Memory

| ID | 상태 | 요약 | 현재 해석 |
| --- | --- | --- | --- |
| V250-S00 | 완료 | v2.5.0 baseline/source-of-truth 정렬 | 이전 published baseline, v2.7.0 완료 근거 아님 |
| V250-S01 | 완료 | Event/incident text projection | 이전 published baseline, v2.7.0 완료 근거 아님 |
| V250-S02 | 완료 | Local incident memory index | 이전 published baseline, v2.7.0 완료 근거 아님 |
| V250-S03 | 완료 | `/ops/events` semantic search UI | 이전 published baseline, v2.7.0 완료 근거 아님 |
| V250-S04 | 완료 | Incident timeline graph | 이전 published baseline, v2.7.0 완료 근거 아님 |
| V250-S05 | 완료 | Explainable incident brief | 이전 published baseline, v2.7.0 완료 근거 아님 |
| V250-S06 | 완료 | Similar incident lookup | 이전 published baseline, v2.7.0 완료 근거 아님 |
| V250-S07 | 완료 | Client-safe incident digest | 이전 published baseline, v2.7.0 완료 근거 아님 |
| V250-S08 | 완료 | Redacted incident evidence bundle | 이전 published baseline, v2.7.0 완료 근거 아님 |
| V250-S09 | 완료 | Owner decomposition/release readiness | 이전 published baseline, v2.7.0 완료 근거 아님 |

## 이전 공개 기준: v2.4.0 Source Release Baseline

v2.4.0은 source-only/live-only 제품 경계를 유지하면서 Operator Event Review & Action
Workflow를 닫은 이전 공개 릴리즈입니다. 이 기준은 historical baseline이며,
v2.7.0의 예정 항목 완료 evidence로 재사용하지 않습니다.

## 완료 roadmap: v2.4.0 Operator Event Review & Action Workflow

| ID | 상태 | 요약 | 현재 해석 |
| --- | --- | --- | --- |
| V240-S01 | 완료 | Operator Event Review Inbox | 과거 baseline, v2.7.0 완료 근거 아님 |
| V240-S02 | 완료 | Event Action and Incident Workflow | 과거 baseline, v2.7.0 완료 근거 아님 |
| V240-S03 | 완료 | Alert Dry-run and Delivery Attempt Log | 과거 baseline, v2.7.0 완료 근거 아님 |
| V240-S04 | 완료 | Client-safe Event and Status Summary | 과거 baseline, v2.7.0 완료 근거 아님 |
| V240-S05 | 완료 | Rule and Scenario Review Loop | 과거 baseline, v2.7.0 완료 근거 아님 |
| V240-S08 | 완료 | release readiness gate | `verify-v240-release-readiness-gate` local readiness이며 publish evidence가 아님 |

## 후속 이슈 추천 규칙

후속 이슈는 현재 `2.8.0` source tree와 현재 스텝 범위 안에서 실제로 처리 가능한 항목만
기록합니다. 다음 버전 후보, 별도 Phase 후보, 사용자 승인이 필요한 새 제품 범위는 이
문서에 추천하지 않습니다.
