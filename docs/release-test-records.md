# Release Test Records

이 문서는 릴리즈 테스트의 저장소 보존형 기록입니다. `docs/release-evidence-index.md`는
색인이고, 실제 테스트 항목 상세/버전별 결과는 이 문서를 기준으로 갱신합니다.

## 기록 원칙

- `/tmp`, `/private/tmp`, `$TMPDIR` 경로는 최종 evidence가 아닙니다.
- 테스트가 만든 임시 summary/report/screenshot/evidence JSON은 필요한 값을 이 문서로
  옮긴 뒤 삭제합니다.
- 삭제하면 안 되는 증거물은 더 이상 임시 파일이 아닙니다. redaction, 크기, 보존
  사유를 확인한 뒤 `docs/release-artifacts/<version>/<run-id>/` 같은 저장소 보존
  위치로 옮기고 이 문서에 링크합니다.
- 새 기능이 추가되면 테스트 실행 전에 `테스트 항목 상세 기록`에 먼저 추가합니다.
- 버전 테스트를 실행하면 `버전별 테스트 결과 기록`에 개별 항목 결과를 남깁니다.
- 테스트 결과표의 `결과`는 `pass` 또는 `fail`만 사용합니다. 실행하지 않은 항목,
  사용자가 제외한 항목, 외부 조건이 없어 제외한 항목은 별도 미실행/제외 표에 둡니다.

## 테스트 항목 상세 기록

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| Release source-of-truth 확인 | VERSION, CMake, README/docs/release policy의 현재 버전과 published baseline 정합성 확인 | `./server.sh verify-release-metadata`를 실행하고 current source version, latest published release, current roadmap 문구가 서로 일치하는지 확인 | v1.8.0 |
| Docs link 확인 | 공개/내부 문서 링크가 끊기지 않는지 확인 | `./server.sh verify-docs-links` 실행 결과를 확인하고 깨진 link가 있으면 해당 문서 행을 `fail`로 기록 | v1.8.0 |
| Docs UI asset 확인 | README/docs 대표 이미지와 asset manifest가 현재 UI 기준과 맞는지 확인 | `./server.sh verify-docs-ui-assets`를 실행하고, 새 이미지가 있으면 잘림/흐림/source URL/debug/auth material 노출 여부를 직접 확인 | v1.8.0 |
| Feature inventory coverage | 새 기능 ID와 테스트 영역 매핑이 누락되지 않았는지 확인 | `./server.sh verify-feature-inventory-coverage`와 `docs/project-feature-test-inventory.md` 행을 확인. 신규 route/control/action이 있으면 테스트 전 등록 | v2.0.0 |
| Script inventory 확인 | 새 verifier/command가 server entrypoint와 script inventory에 등록됐는지 확인 | `./server.sh verify-script-inventory` 실행 결과와 `server.sh` dispatch 확인 | v2.0.0 |
| Build | C++/UI/static asset build가 통과하는지 확인 | `./server.sh build` exit code 0 확인. 실패 후 수정했다면 최초 fail과 최종 pass를 모두 결과 기록에 남김 | v1.8.0 |
| Auth bootstrap | 초기 admin setup과 auth bootstrap policy 확인 | auth 전용 환경변수 5개가 모두 설정된 상태에서 `./server.sh verify-auth-bootstrap` 실행 | v2.0.0 |
| Auth users | 사용자/role/password policy 확인 | auth 전용 환경변수 5개가 모두 설정된 상태에서 `./server.sh verify-auth-users` 실행 | v2.0.0 |
| Auth routes | route guard와 scope 제한 확인 | auth 전용 환경변수 5개가 모두 설정된 상태에서 `./server.sh verify-auth-routes` 실행 | v2.0.0 |
| Ops/Client static UI smoke | 주요 Ops/Client route가 렌더링되는지 확인 | auth-off throwaway 서버 또는 지정 서버에서 `./server.sh verify-ops-client-ui --browser-mode static --http-base <base>` 실행 | v2.0.0 |
| Ops/Client screenshot smoke | 주요 Ops/Client route screenshot smoke 확인 | 명시 Chrome fallback 또는 허용된 환경에서 `./server.sh verify-ops-client-ui --screenshots --http-base <base>` 실행. UI 풀테스트 PASS로 승격하지 않음 | v2.0.0 |
| Product native dialog guard | 브라우저 native alert/confirm/prompt가 제품 UI에 남지 않았는지 확인 | `./server.sh verify-product-ui-no-native-dialogs` 또는 UI wrapper의 native dialog guard step 실행 | v2.5.0 |
| Blocking dialog policy | 위험 action의 in-page 2단계 확인 정책 확인 | `./server.sh verify-ui-blocking-dialog-policy` 또는 UI wrapper guard step 실행. 첫 클릭 write 없음과 두 번째 클릭 반영 기준 확인 | v2.5.0 |
| Rule UI | `/ops/rules` shell, draft, preview, validation control 확인 | `MEDIA_SERVER_UI_BROWSER_MODE=chrome MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1 ./server.sh verify-rule-ui --http-base <base>` 또는 인앱 UI 직접 조작으로 확인 | v2.0.0 |
| Rules roundtrip | rule/profile 저장-조회-반영 roundtrip 확인 | `./server.sh verify-ops-rules-roundtrip --http-base <base>` 실행 결과와 registry 자동 write 여부 확인 | v2.0.0 |
| Tables layout | 주요 table/card가 320/390/760/1180 폭에서 overflow 없이 보이는지 확인 | `./server.sh verify-ops-tables-layout --http-base <base>` 또는 인앱 브라우저에서 폭별 `scrollWidth <= clientWidth` 재계산 | v2.5.0 |
| Ops click E2E core | auth-off core UI click flow 확인 | `./server.sh verify-ops-click-e2e --http-base <base>` 실행. route/control/action 단위 결과를 남김 | v2.5.0 |
| Ops click E2E auth | setup/login/password/invite/access request flow 확인 | `./server.sh verify-ops-click-e2e --auth-ui-flow --auth-users-file <path>` 또는 인앱 브라우저 직접 조작으로 확인 | v2.5.0 |
| Event POST schema | Event POST payload schema가 유지되는지 확인 | `./server.sh verify-event-post --mode schema|disabled --http-base <base>` 또는 30분/120분 iteration summary에서 schema check 확인 | v2.0.0 |
| Event POST recovery | Event POST 실패/복구 경로가 유지되는지 확인 | 30분/120분 `verify-predev` iteration의 recovery check 또는 전용 event-post verifier 결과 확인 | v2.0.0 |
| SSE metadata | SSE sidechannel metadata schema 확인 | `./server.sh verify-va-metadata-sidechannel` 또는 runtime console longrun의 SSE sidechannel result 확인 | v2.0.0 |
| WS metadata | WebSocket metadata schema 확인 | `./server.sh verify-ws-metadata --http-base <base>` 실행 결과 확인 | v2.0.0 |
| WebRTC metadata | WebRTC/DataChannel metadata schema 확인 | `./server.sh verify-webrtc-va-metadata` 실행 결과 확인. DataChannel failure를 media path failure로 임의 확대하지 않음 | v2.0.0 |
| Analysis state | analysis registry/runtime state 기본 동작 확인 | `./server.sh verify-analysis-state` 실행 결과 확인 | v2.0.0 |
| VA replay | VA replay fixture가 기존 이벤트/룰 동작을 재현하는지 확인 | `./server.sh verify-va-replay` 실행 결과 확인 | v2.0.0 |
| VA events | VA EventRecord/dispatch records가 저장되고 drop/fail이 없는지 확인 | `./server.sh verify-va-events` 또는 `--dispatch-records` 결과의 stored/failed/dropped 확인 | v2.0.0 |
| Release close-out dry-run | release close-out 순서와 manual action 경계를 확인 | `./server.sh verify-release-closeout-helper --dry-run` 실행. tag/push/GitHub Release를 수행한 것으로 기록하지 않음 | v2.0.0 |
| Release close-out one-shot dry-run | close-out helper one-shot dry-run schema 확인 | `./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run` 실행. localCommands/manualActions/gitStatusLines 확인 | v2.8.0 |
| Git clean/sync preflight | 브랜치/upstream/tag/head 상태 확인 | `git status --short --branch`, `git branch -vv`, `git tag --list <tag>`, `git ls-remote --tags origin <tag>`, `git ls-remote --heads origin main <branch>` 결과 확인 | v2.8.0 |
| CHANGELOG/NEWS 확인 | 변경 이력 파일 존재 여부 확인 | `rg --files -g 'CHANGELOG*' -g 'NEWS*'`로 루트 변경 이력 존재 여부 확인. fixture 전용 파일은 release changelog로 보지 않음 | v2.8.0 |
| 30분 predev soak | 30분 동안 통합 smoke와 반복 runtime check 유지 | `./server.sh verify-predev --soak-minutes 30 ...` 실행. duration, pass/fail/skip, iteration count, ports-clean, report generation 값을 결과 문서에 이관 | v2.0.0 |
| 120분 predev longrun | 120분 동안 통합 smoke와 반복 runtime check 유지 | `./server.sh verify-predev --soak-minutes 120 ...` 실행. 30분 결과로 대체하지 않고 별도 결과를 기록 | v2.0.0 |
| 120분 runtime console | VA runtime console/WebRTC/SSE/RTSP overlay 장시간 확인 | `./server.sh verify-va-runtime-console-longrun --duration-minutes 120 --include-rtsp ...` 실행. WebRTC client, SSE sidechannel, RTSP overlay, runtime cleanup, ports-clean, max RSS를 기록 | v2.7.0 |
| UI route 직접 확인 | 제품 route를 브라우저에서 직접 열고 화면 상태를 확인 | Codex 세션은 인앱 브라우저를 기본으로 사용. route, account/role, viewport/theme, 직접 조작 내용을 개별 행으로 기록 | v2.0.0 |
| UI auth flow 직접 확인 | setup/login/password change/access request/invite flow 확인 | 브라우저에서 입력/제출/redirect/guard 결과를 확인하고 raw JSON/API-only 결과를 UI PASS로 쓰지 않음 | v2.5.0 |
| UI responsive 확인 | 320/390/760/1180 폭에서 주요 table/control overflow 확인 | 브라우저 viewport 변경 후 시각 확인과 필요 시 DOM `scrollWidth/clientWidth` 값을 기록 | v2.5.0 |
| UI theme 확인 | light/dark theme 전환 후 주요 화면 깨짐 여부 확인 | theme toggle 후 route별 text overlap, contrast, table/card/control 표시를 직접 확인 | v2.5.0 |
| UI wrapper 구조 확인 | UI wrapper가 build/seed/server health/guard/smoke/click flow를 순서대로 수행하는지 확인 | `./server.sh verify-ui-fulltest-one-shot ...` summary 값을 이 문서에 이관. wrapper PASS만으로 UI 직접 조작 PASS를 주장하지 않음 | v2.5.0 |
| V250 incident text projection | Event/incident text projection redaction과 searchable terms 확인 | `./server.sh verify-v250-incident-text-projection`와 projection output에서 source URL/raw/debug/auth/provider material 비노출 확인 | v2.5.0 |
| V250 local incident memory index | SQLite FTS5 primary와 JSONL+BM25 fallback parity 확인 | `./server.sh verify-v250-incident-memory-index` 실행. deterministic ordering과 provider dependency false 확인 | v2.5.0 |
| V250 Ops events semantic search UI | `/ops/events` semantic search controls 확인 | verifier와 UI 풀테스트에서 query/filter/highlight rendering 확인 | v2.5.0 |
| V250 incident timeline graph | `/ops/events` timeline graph shell 확인 | verifier와 UI 풀테스트에서 graph node/edge/linkage label rendering 확인 | v2.5.0 |
| V250 explainable incident brief | deterministic incident brief slots 확인 | verifier와 UI 풀테스트에서 action/object/context/environment slot과 VLM default-off 상태 확인 | v2.5.0 |
| V250 similar incident lookup | deterministic similar incident scoring 확인 | `verify-v250-similar-incident-lookup`과 UI lookup 표시에서 score/explanation terms 확인 | v2.5.0 |
| V250 client-safe incident digest | viewer-safe digest와 redaction boundary 확인 | `/client/api/views/{id}/events`와 client route에서 source/raw/debug/provider/rule editor/action control 비노출 확인 | v2.5.0 |
| V250 redacted evidence bundle | release-safe bundle manifest와 redaction 확인 | `verify-v250-redacted-incident-evidence-bundle`, UI control, HTTP attachment follow-up에서 manifest schema와 raw/source/credential/provider/debug material excluded 확인 | v2.5.0 |
| V260 VLM summary candidate productization | VLM summary 후보를 Ops-only incident memory와 연결 | V260 verifier와 `/ops/events`/`/ops/vlm` UI에서 default-off, provider call 미수행, Ops-only exposure 확인 | v2.6.0 |
| V260 rule suggestion draft workflow | rule suggestion 후보 manual review/draft workflow 확인 | V260/VLM rule suggestion verifier와 `/ops/rules`에서 draft-only, manual review, no auto apply 확인 | v2.6.0 |
| V260 ONVIF credential binding gate | ONVIF credential binding/store redaction guard 확인 | V260 verifier와 credential redaction policy에서 credential 원문 비노출, 실기기 미수행 경계 확인 | v2.6.0 |
| V260 runtime dashboard trends | runtime dashboard baseline/sparkline 확인 | `verify-v260-runtime-dashboard-trends`와 dashboard UI smoke에서 trend 표시와 longrun substitute 아님을 확인 | v2.6.0 |
| V260 scenario cross-zone re-entry | ScenarioEngine cross-zone re-entry 후보 확인 | V260 verifier와 scenario/rule smoke에서 event boundary와 자동 action 미수행 확인 | v2.6.0 |
| V270 incident triage board | `/ops/events` incident triage board 확인 | `verify-v270-incident-triage-board`와 UI에서 triage card/list/status/redaction 확인 | v2.7.0 |
| V270 decision scorecard | incident decision scorecard 확인 | `verify-v270-incident-decision-scorecard`와 UI에서 score/reason/risk/status 확인 | v2.7.0 |
| V270 operational action pack | operational action pack 확인 | `verify-v270-operational-action-pack`와 UI에서 action candidates, dry-run/external delivery not-run 경계 확인 | v2.7.0 |
| V270 rule what-if preview | Rule What-if Preview 확인 | `verify-v270-rule-what-if-preview`, `/ops/events`, `/ops/rules`에서 draft context/no auto write 확인 | v2.7.0 |
| V270 operator outcome memory | operator outcome memory 확인 | `verify-v270-operator-outcome-memory`와 audit/persistence verifier에서 outcome 기록과 viewer redaction 확인 | v2.7.0 |
| V280 incident action readiness queue | operator 승인 가능한 follow-up 후보 readiness queue 확인 | `verify-v280-incident-action-readiness-queue`와 `/ops/events` UI에서 ready/blocked/field-smoke-needed/not-run 상태와 자동 write 없음 확인 | v2.8.0 |
| V280 approval-gated rule draft readiness | approval state, validation summary, staged draft 확인 | `verify-v280-approval-gated-rule-draft`, `/ops/rules` UI에서 no-auto-save/no-auto-apply와 registry 자동 write 없음 확인 | v2.8.0 |
| V280 evidence intake and field readiness | evidence/source health/field smoke precondition readiness 확인 | `verify-v280-evidence-intake-field-readiness`, `/ops/events` UI에서 passed/failed/blocked/not-run과 credential/endpoint required 상태 확인 | v2.8.0 |
| V280 runtime evidence window | bounded runtime/source/event evidence window 확인 | `verify-v280-runtime-evidence-window`, `/ops/events` UI에서 incident-linked short window와 장기 저장소 아님을 확인 | v2.8.0 |
| V280 client-safe follow-up digest | viewer-safe follow-up digest 확인 | `verify-v280-client-safe-followup-digest`, `/client/live`, `/client/dashboard`, `/client/events`에서 source/raw/debug/provider/rule editor/action control 비노출 확인 | v2.8.0 |
| V280 owner release readiness | v2.8.0 readiness coverage와 release boundary 확인 | `verify-v280-owner-release-readiness`와 companion local gates를 실행하고 UI/30분/120분/published metadata를 대체하지 않는 문구 확인 | v2.8.0 |
| V290 source-of-truth split | v2.9.0 source version과 latest published v2.8.0 기준 분리 확인 | `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets`, `./server.sh verify-feature-inventory-coverage`, `git diff --check`로 source `2.9.0`, latest published `v2.8.0`, current roadmap `v2.9.0 Final 2.x Closure & Compatibility Baseline`을 확인. published metadata, tag/push/GitHub Release, UI 풀테스트, 30분/120분 PASS로 승격하지 않음 | v2.9.0 |
| V290 final contract freeze | Event POST/WebRTC/SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload의 2.x 최종 freeze gate 확인 | `./server.sh verify-v290-final-contract-freeze`, `./server.sh verify-integrator-contract-artifact`, `./server.sh verify-script-inventory`, `./server.sh verify-feature-inventory-coverage`, `git diff --check`로 contract 문서, server command, feature inventory, freeze-baseline hash 연결을 확인. runtime smoke, UI 풀테스트, 30분/120분, published metadata PASS로 승격하지 않음 | v2.9.0 |
| V290 v2.8 regression bundle | v2.8 기능군 verifier를 v2.9 source tree에서 재실행했는지 확인 | `./server.sh verify-v290-v28-regression-bundle`이 `verify-v280-incident-action-readiness-queue`, `verify-v280-approval-gated-rule-draft`, `verify-v280-evidence-intake-field-readiness`, `verify-v280-runtime-evidence-window`, `verify-v280-client-safe-followup-digest`를 순차 실행하는지 확인. v2.8 완료 evidence, UI 풀테스트, 30분/120분, published metadata PASS로 승격하지 않음 | v2.9.0 |
| V290 2.x compatibility baseline | v2.5~v2.8 핵심 verifier를 v2.9 source tree에서 재실행했는지 확인 | `./server.sh verify-v290-2x-compatibility-baseline`이 v2.5 핵심 feature verifier 8개, v2.6 핵심 feature verifier 5개, v2.7 핵심 feature verifier 5개, `verify-v290-final-contract-freeze`, `verify-v290-v28-regression-bundle`을 순차 실행하는지 확인. owner release readiness, UI 풀테스트, 30분/120분, published metadata PASS로 승격하지 않음 | v2.9.0 |
| V290 release test records enforcement | v2.9 저장소 보존형 테스트 기록 체계가 항목/결과/deprecated/미실행/cleanup/token 경계를 분리하는지 확인 | `./server.sh verify-v290-release-test-records-enforcement`로 `docs/release-test-records.md`의 기록 원칙, 테스트 항목 상세 기록, deprecated 항목, v2.9 결과/미실행, token/time, cleanup 섹션과 `OPS-045`/`SAFE-075` inventory 연결을 확인. UI 풀테스트, 30분/120분, published metadata PASS로 승격하지 않음 | v2.9.0 |
| V290 UI fulltest criteria freeze | v2.9 UI 풀테스트 route/control/action/role/viewport/theme 기준이 manual UI 문서와 result template에 고정됐는지 확인 | `./server.sh verify-v290-ui-fulltest-criteria-freeze`와 `./server.sh verify-manual-ui-evidence`로 v2.9 current target, latest published v2.8 baseline, route/control/action/role/viewport/theme 기준, raw JSON/API-only/static smoke/screenshot-only/Chrome fallback 비승격 경계를 확인. 실제 UI 풀테스트 PASS로 승격하지 않음 | v2.9.0 |
| V290 release evidence hygiene | release evidence index, release test records, feature inventory, script inventory, manual UI evidence 연결과 PASS/FAIL vs 미실행/제외 경계를 확인 | `./server.sh verify-v290-release-evidence-hygiene`, `./server.sh verify-release-evidence-index`, `./server.sh verify-script-inventory`, `./server.sh verify-feature-inventory-coverage`로 evidence 색인/상세 기록/inventory/server command/manual UI criteria 연결을 확인. 실제 UI 풀테스트, 30분/120분, published metadata, tag/push/GitHub Release PASS로 승격하지 않음 | v2.9.0 |
| V290 public docs/assets refresh | README, README.en, docs index, release/version policy, stream verification, UI guide, docs asset policy가 v2.9 source와 v2.8 published baseline을 분리하는지 확인 | `./server.sh verify-v290-public-docs-assets-refresh`, `./server.sh verify-docs-ui-assets`, `./server.sh verify-docs-links`, `./server.sh verify-release-metadata`로 public docs와 managed UI asset set을 확인. 대표 이미지 직접 재캡처, 직접 브라우저 검수, UI 풀테스트, 30분/120분, published metadata PASS로 승격하지 않음 | v2.9.0 |
| V290 final stabilization run | v2.9 release 전 build/auth/Ops-Client UI/rule/event/metadata/media-schema/docs-inventory 안정화 묶음을 release 순서대로 실행했는지 확인 | `./server.sh build`, auth 3종, `verify-ops-client-ui`, `verify-rule-ui`, `verify-event-post`, metadata/media/schema/docs/inventory verifier, `./server.sh verify-v290-final-stabilization-run`, `git diff --check` 결과를 기록. UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, field smoke PASS로 승격하지 않음 | v2.9.0 |
| V290 owner release readiness | v2.9 owner handoff와 release close-out 준비 gate가 local evidence로 연결됐는지 확인 | `./server.sh verify-v290-owner-release-readiness`, `./server.sh build`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-manual-ui-evidence`, `./server.sh verify-release-evidence-index`, `./server.sh verify-release-closeout-helper --dry-run`, `./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run`, `./server.sh verify-script-inventory`, `git diff --check`를 실행하고 PR/tag/GitHub Release/published metadata와 UI/30분/120분/field smoke를 대체하지 않는 문구 확인 | v2.9.0 |
| V300 source-of-truth split | v3.0.0 source version과 latest published v2.9.0 기준 분리 확인 | `./server.sh verify-v300-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh build`, `git diff --check`로 source `3.0.0`, latest published `v2.9.0`, current roadmap `v3.0.0 Event Evidence Search MVP`을 확인. v3.0 기능 구현, published metadata, tag/push/GitHub Release, UI 풀테스트, 30분/120분 PASS로 승격하지 않음 | v3.0.0 |
| V300 Event Evidence Contract | EvidenceManifest, FrameRef, retention lifecycle, privacy/non-VMS boundary contract 확인 | `./server.sh verify-v300-event-evidence-contract`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh verify-docs-links`, `./server.sh build`, `git diff --check`로 `docs/event-evidence-contract.md`, `test/fixtures/event_evidence_contract/evidence_manifest_sample.json`, `OPS-052`, `SAFE-082`, server dispatch 연결을 확인. frame extraction, encoded clip/playback, VMS archive API, Search DSL, `/ops/events` UI, UI 풀테스트, 30분/120분, published metadata PASS로 승격하지 않음 | v3.0.0 |
| V300 Frame Bundle Extraction | EventRecord recorder frame cache에서 eventFrame, representativeImage selection, bboxCrop, pre/event/post frameBundle manifest, EvidenceManifest sidecar 확인 | `./server.sh verify-analysis-state`, `./server.sh build`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh verify-docs-links`, `git diff --check`로 `src/analysis/event_storage.cpp`, `scripts/internal/analysis_state_smoke.cpp`, `EVT-060`, `SAFE-084` 연결을 확인. encoded clip/playback, VMS/NVR archive API, Search DSL, `/ops/events` UI, UI 풀테스트, 30분/120분, published metadata PASS로 승격하지 않음 | v3.0.0 |
| V300 Feature Schema and Privacy Policy | FeatureSet envelope, namespace allowed/disallowed matrix, raw prompt/response non-retention, identity feature prohibition 확인 | `./server.sh verify-v300-feature-schema-privacy`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh verify-docs-links`, `./server.sh build`, `git diff --check`로 `docs/event-feature-schema-privacy.md`, `test/fixtures/event_feature_schema_privacy/feature_set_sample.json`, `LAB-083`, `SAFE-085`, `OPS-053`, server dispatch 연결을 확인. VLM queue/runtime/provider success, Search DSL, `/ops/events` UI, 얼굴 인식/신원 식별/model 품질 PASS, UI 풀테스트, 30분/120분, published metadata PASS로 승격하지 않음 | v3.0.0 |
| V300 VLM Feature Queue | Background queue, lazy trigger, missing-runtime/queue-timeout/invalid-output VLM-only failure, structured FeatureSet revision 확인 | `./server.sh verify-analysis-state`, `./server.sh verify-v300-vlm-feature-queue`, `./server.sh build`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh verify-docs-links`, `git diff --check`로 `include/analysis/vlm_feature_queue.h`, `src/analysis/vlm_feature_queue.cpp`, `scripts/internal/analysis_state_smoke.cpp`, `docs/v300-vlm-feature-queue.md`, `test/fixtures/v300_vlm_feature_queue/cases.json`, `LAB-084`, `SAFE-086`, `OPS-054`, server dispatch 연결을 확인. real provider success, Search DSL, `/ops/events` UI, UI 풀테스트, 30분/120분, published metadata PASS로 승격하지 않음 | v3.0.0 |
| V300 Feature-only Retention | Feature-only durable retention, raw prompt/response rejection, FeatureSet revision store, reanalysis revision policy 확인 | `./server.sh verify-analysis-state`, `./server.sh verify-v300-feature-only-retention`, `./server.sh build`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh verify-docs-links`, `git diff --check`로 `include/analysis/vlm_feature_retention.h`, `src/analysis/vlm_feature_retention.cpp`, `scripts/internal/analysis_state_smoke.cpp`, `docs/v300-feature-only-retention.md`, `test/fixtures/v300_feature_only_retention/cases.json`, `LAB-085`, `SAFE-087`, `OPS-055`, server dispatch 연결을 확인. Search DSL, `/ops/events` UI, Retention/Pin/Cleanup lifecycle, UI 풀테스트, 30분/120분, published metadata PASS로 승격하지 않음 | v3.0.0 |
| V310 Event Clip Encoder Pipeline | bounded EventRecord frame bundle에서 encoded clip artifact와 queue/status/cleanup manifest 확인 | `./server.sh verify-analysis-state`, `./server.sh build`, `./server.sh verify-feature-inventory-coverage`, `git diff --check`로 Event recorder media hook이 `media-server.va.encoded-event-clip.v1` manifest, `event-clip.avi` artifact, frameMap, queueName/status, partial cleanup, non-VMS boundary를 남기는지 확인. v3.1 baseline/S01 contract, replay UI, client digest, 24/7 recording, VMS/NVR archive API, UI 풀테스트, 30분/120분, published metadata PASS로 승격하지 않음 | v3.1.0 |

## Deprecated 테스트 항목

| 제목 | 수행내용 | 수행 상세 내용(확인방법) | 몇버전부터 deprecated되었는지 |
| --- | --- | --- | --- |
| `/tmp` 경로를 최종 evidence로 링크 | release 결과 행에서 `/tmp` 또는 `/private/tmp` summary/report/evidence JSON을 최종 증거로 링크 | 필요한 값은 저장소 문서로 이관하고 임시 파일은 cleanup 표에 삭제 결과를 남김. 보존 필요 시 `docs/release-artifacts/<version>/<run-id>/`로 이동 | v2.8.0 |
| UI 자동 smoke를 UI 풀테스트 직접 조작 PASS로 승격 | Chrome one-shot, static smoke, screenshot smoke만으로 UI 풀테스트 PASS라고 기록 | UI 자동 smoke는 보조 검증이다. Codex 인앱 브라우저 직접 조작 또는 승인된 직접 브라우저 evidence가 없으면 UI 직접 풀테스트 PASS가 아님 | v2.8.0 |
| 결과 요약만 남기기 | `pass 119/fail 0` 같은 summary만 남기고 개별 확인 항목을 생략 | 각 테스트 카테고리의 개별 command/route/control/action/check를 표로 남김 | v2.8.0 |
| 미실행 항목을 결과표 PASS/FAIL에 섞기 | 실행하지 않은 30분/120분/UI/field smoke를 결과표에 조건부 통과처럼 기록 | 결과표는 pass/fail만 쓰고, 미실행/제외는 별도 표에 사유와 완료 evidence로 쓸 수 없다는 경계를 기록 | v2.8.0 |

## 버전별 테스트 결과 기록

### v3.0.0

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| v300 S00 RED command precheck | 최초 `./server.sh verify-v300-entry-baseline`는 command 미구현으로 fail. V300-S00 verifier/entrypoint 추가 전 기대 실패로 확인 | fail |
| v300 S00 baseline wording fix | entrypoint 추가 후 `./server.sh verify-v300-entry-baseline`가 backlog의 기능 구현 완료 비승격 문구 누락으로 fail. 누락 문구를 추가하고 재검증 | fail |
| v300 S00 release metadata drift fix | `./server.sh verify-release-metadata` 최초 실행에서 versioning policy의 source-only/live-only 문구, backlog publish boundary, UI guide roadmap boundary 3개가 fail. 문서 경계를 수정하고 재검증 | fail |
| v300 S00 docs index fix | `./server.sh verify-docs-links` 최초 실행에서 v3/v3.1 roadmap design 문서의 docs index 항목 누락으로 fail. `docs/README.md` index를 갱신하고 재검증 | fail |
| v300 S00 inventory fixture fix | `./server.sh verify-project-inventory` 최초 실행에서 manual UI VA seed fixture가 `v2.9.0`에 고정되어 fail. seed fixture target을 `v3.0.0`으로 정렬하고 재검증 | fail |
| v300 S00 entry baseline final | `./server.sh verify-v300-entry-baseline` 최종 pass 7/fail 0. source `3.0.0`, latest published `v2.9.0`, current roadmap `v3.0.0 Event Evidence Search MVP` 확인. 기능 구현/UI/longrun/published metadata는 not-run으로 분리 | pass |
| v300 S00 release metadata final | `./server.sh verify-release-metadata` 최종 pass 16/fail 0. source version/current tag와 published release boundary 확인 | pass |
| v300 S00 docs links final | `./server.sh verify-docs-links` 최종 failures 0. markdown files 102, local links 571, images 22, anchors 96, indexed docs 67 확인 | pass |
| v300 S00 docs UI assets final | `./server.sh verify-docs-ui-assets` 최종 pass 10/fail 0. 이미지 재캡처는 실행하지 않고 manifest/sourceVersion/published baseline 정합성 확인 | pass |
| v300 S00 project inventory final | `./server.sh verify-project-inventory` 최종 pass 13/fail 0. featureRows 519와 seed fixture current release target 확인 | pass |
| v300 S00 feature inventory coverage final | `./server.sh verify-feature-inventory-coverage` 최종 pass 5/fail 0. covered 519/missing 0 확인 | pass |
| v300 S00 script inventory final | `./server.sh verify-script-inventory` 최종 pass 11/fail 0. `verify-v300-entry-baseline` dispatch/executable/documented command 정합성 확인 | pass |
| v300 S00 build final | `./server.sh build` 최종 exit 0. `build-gst-onnx/media_server` target built 확인 | pass |
| v300 S00 diff check final | `git diff --check` 최종 exit 0 확인 | pass |
| v300 S01 RED contract gate | 최초 `./server.sh verify-v300-event-evidence-contract`는 command 미구현으로 fail. V300-S01 verifier/entrypoint 추가 전 기대 실패로 확인 | fail |
| v300 S01 contract wording fix | 구현 후 첫 `./server.sh verify-v300-event-evidence-contract`는 문서의 `representativeImage` optional 문구가 verifier 기대와 줄바꿈 때문에 일치하지 않아 pass 6/fail 1로 fail. 문구를 정렬하고 재검증 | fail |
| v300 S01 baseline wording fix | S01 문서 반영 후 `./server.sh verify-v300-entry-baseline`은 backlog의 `기능 구현 완료 evidence가 아닙니다` 문구가 문장 개편 중 빠져 pass 6/fail 1로 fail. S00 baseline 비승격 문구를 복구하고 재검증 | fail |
| v300 S01 inventory range fix | S01 기능 ID 추가 후 첫 `./server.sh verify-project-inventory`는 verifier 기대 범위가 `SAFE-082`/`OPS-052`인데 inventory verifier coverage map 본문이 `SAFE-081`/`OPS-051`에 남아 fail. 범위 문구를 정렬하고 재검증 | fail |
| v300 S01 event evidence contract final | `./server.sh verify-v300-event-evidence-contract` 최종 pass 7/fail 0. EvidenceManifest/FrameRef/retention/privacy/non-VMS boundary, fixture, roadmap/docs/inventory/release records/server dispatch 확인. frame extraction/UI/longrun/published metadata는 not-run으로 분리 | pass |
| v300 S01 project inventory final | `./server.sh verify-project-inventory` 최종 pass 13/fail 0. featureRows 521와 `OPS-052`/`SAFE-082` 확인 | pass |
| v300 S01 feature inventory coverage final | `./server.sh verify-feature-inventory-coverage` 최종 pass 5/fail 0. covered 521/missing 0 확인 | pass |
| v300 S01 script inventory final | `./server.sh verify-script-inventory` 최종 pass 11/fail 0. `verify-v300-event-evidence-contract` dispatch/executable/documented command 정합성 확인 | pass |
| v300 S01 docs links final | `./server.sh verify-docs-links` 최종 failures 0. `docs/event-evidence-contract.md` 색인과 fixture/link 참조 확인 | pass |
| v300 S01 build final | `./server.sh build` 최종 exit 0. `build-gst-onnx/media_server` target built 확인 | pass |
| v300 S01 diff check final | `git diff --check` 최종 exit 0 확인 | pass |
| v300 S02 RED frame bundle extraction | 최초 `./server.sh verify-analysis-state`는 V300 evidence manifest와 frame bundle reference가 없어 `Event recorder metadata must include V300 evidence manifest and frame bundle references`로 fail. V300-S02 구현 전 기대 실패로 확인 | fail |
| v300 S02 analysis state final | 구현 후 `./server.sh verify-analysis-state` 재실행. Event recorder가 `evidence-manifest.json`, `frame-bundle-manifest.json`, required eventFrame, representativeImage selection, bboxCrop reference, pre/event/post FrameRef, privacy/non-VMS guard를 생성함을 확인. summary `pass=144 fail=0` | pass |
| v300 S02 project inventory final | `./server.sh verify-project-inventory` 실행. featureRows 525, pass 13/fail 0으로 `EVT-060`/`SAFE-084` inventory 연결 확인 | pass |
| v300 S02 feature inventory coverage final | `./server.sh verify-feature-inventory-coverage` 실행. featureRows 525, covered 525, missing 0, pass 5/fail 0 확인 | pass |
| v300 S02 entry baseline boundary recheck | `./server.sh verify-v300-entry-baseline` 실행. source `3.0.0`, latest published `v2.9.0`, current roadmap 경계 pass 7/fail 0 확인 | pass |
| v300 S02 event evidence contract boundary recheck | `./server.sh verify-v300-event-evidence-contract` 실행. V300-S01 contract gate pass 7/fail 0이며 frame extraction은 S02 evidence로만 분리되는지 확인 | pass |
| v300 S02 script inventory final | `./server.sh verify-script-inventory` 실행. server dispatch/script family guard pass 11/fail 0 확인 | pass |
| v300 S02 docs links final | `./server.sh verify-docs-links` 실행. markdown 103, local links 573, local images 22, local anchors 96, indexed docs 68, failures 0 확인 | pass |
| v300 S02 build final | `./server.sh build` 실행. `src/analysis/event_storage.cpp` 재빌드 후 `build-gst-onnx/media_server` target 생성 확인 | pass |
| v300 S02 diff check final | `git diff --check` 실행. whitespace error output 없음 확인 | pass |
| v300 S02 temp cleanup final | 이번 `verify-analysis-state` 실행에서 남은 `/tmp/media_server_analysis_state_smoke-96457`, `/tmp/media_server_analysis_state_smoke-99666`, `/tmp/media_server_analysis_state_smoke-9211` 각 약 3.8MB를 삭제하고, 같은 경로 재조회에서 미검출 확인 | pass |
| v300 S03 RED feature schema privacy gate | 최초 `node scripts/internal/verify_v300_feature_schema_privacy.mjs`는 `docs/event-feature-schema-privacy.md`가 없어 fail. V300-S03 문서/fixture/verifier wiring 추가 전 기대 실패로 확인 | fail |
| v300 S03 feature schema privacy final | `./server.sh verify-v300-feature-schema-privacy` 실행. FeatureSet envelope, allowed namespace matrix, disallowed identity matrix, raw prompt/response non-retention, privacy guard, docs/roadmap/inventory/release records/server dispatch 연결을 확인 | pass |
| v300 S04 RED VLM feature queue smoke | 최초 `./server.sh verify-analysis-state`는 `src/analysis/vlm_feature_queue.cpp`가 없어 fail. V300-S04 queue module 구현 전 기대 실패로 확인 | fail |
| v300 S04 analysis state final | `./server.sh verify-analysis-state` 실행. background queue, lazy trigger, missing-runtime, queue-timeout, invalid-output, FeatureSet revision smoke 포함 summary `pass=150 fail=0` 확인 | pass |
| v300 S04 verifier invariant matcher retry | 최초 `./server.sh verify-v300-vlm-feature-queue`는 C++ escaped string literal과 verifier source snippet 기대값 불일치로 `queue source missing invariant: rawPromptStored":false` fail. Runtime JSON false 여부는 analysis-state smoke가 확인하므로 verifier를 privacy field presence와 outcome false assignment 확인으로 수정 | fail |
| v300 S04 VLM feature queue final | `./server.sh verify-v300-vlm-feature-queue` 재실행. fixture, module, analysis-state smoke link, docs/roadmap/stream verification/inventory/release records/server dispatch 연결 summary `pass=6 fail=0` 확인 | pass |
| v300 S04 build final | `./server.sh build` 실행. `src/analysis/vlm_feature_queue.cpp` 빌드와 `build-gst-onnx/media_server` target 생성 확인 | pass |
| v300 S04 project inventory final | `./server.sh verify-project-inventory` 실행. featureRows 531, pass 13/fail 0으로 `LAB-084`/`SAFE-086`/`OPS-054` inventory 연결 확인 | pass |
| v300 S04 feature inventory coverage final | `./server.sh verify-feature-inventory-coverage` 실행. featureRows 531, covered 531, missing 0, pass 5/fail 0 확인 | pass |
| v300 S04 script inventory final | `./server.sh verify-script-inventory` 실행. server dispatch/script family guard pass 11/fail 0 확인 | pass |
| v300 S04 docs links final | `./server.sh verify-docs-links` 실행. markdown 105, local links 577, local images 22, local anchors 96, indexed docs 69, failures 0 확인 | pass |
| v300 S04 docs UI assets final | `./server.sh verify-docs-ui-assets` 실행. representative product UI screenshot policy pass 10/fail 0 확인 | pass |
| v300 S04 diff check final | `git diff --check` 실행. whitespace error output 없음 확인 | pass |
| v300 S04 temp cleanup final | `/tmp/media_server_analysis_state_smoke-*`와 `/tmp/media_server_analysis_state_dep_scan.txt` 재조회에서 미검출 확인. 삭제할 S04 임시 산출물 없음 | pass |
| v300 S05 RED feature-only retention gate | 최초 `node scripts/internal/verify_v300_feature_only_retention.mjs`는 `include/analysis/vlm_feature_retention.h` 부재로 fail. V300-S05 retention module 구현 전 기대 실패로 확인 | fail |
| v300 S05 review RED retention raw material guard | 코드 리뷰 후 추가한 `sourceEvidenceRefs` raw source URL, provider request body whitespace, stale reanalysis revision smoke 중 최초 `./server.sh verify-analysis-state`가 source evidence refs raw source URL 우회로 summary `pass=129 fail=1` 확인 | fail |
| v300 S05 analysis state final | `./server.sh verify-analysis-state` 실행. FeatureSet revision store, raw prompt rejection, raw provider response rejection, source evidence refs raw material rejection, provider request body whitespace rejection, provider replay 없는 reanalysis, stale reanalysis rejection, previous revision 보존 smoke 포함 summary `pass=158 fail=0` 확인 | pass |
| v300 S05 feature-only retention final | `./server.sh verify-v300-feature-only-retention` 실행. fixture, module, analysis-state smoke link, docs/roadmap/stream verification/inventory/release records/server dispatch 연결 summary `pass=6 fail=0` 확인 | pass |
| v300 S05 build final | `./server.sh build` 실행. `src/analysis/vlm_feature_retention.cpp` 빌드와 `build-gst-onnx/media_server` target 생성 확인 | pass |
| v300 S05 project inventory final | `./server.sh verify-project-inventory` 실행. featureRows 534, pass 13/fail 0으로 `LAB-085`/`SAFE-087`/`OPS-055` inventory 연결 확인 | pass |
| v300 S05 feature inventory coverage final | `./server.sh verify-feature-inventory-coverage` 실행. featureRows 534, covered 534, missing 0, pass 5/fail 0으로 `verify-v300-feature-only-retention` coverage 연결 확인 | pass |
| v300 S05 script inventory final | `./server.sh verify-script-inventory` 실행. server dispatch/script family guard pass 11/fail 0 확인 | pass |
| v300 S05 docs links final | `./server.sh verify-docs-links` 실행. markdown 106, local links 579, local images 22, local anchors 96, indexed docs 71, failures 0으로 `docs/v300-feature-only-retention.md` 색인과 fixture/link 참조 확인 | pass |
| v300 S05 diff check final | `git diff --check` 실행. whitespace error output 없음 확인 | pass |
| v300 S05 temp cleanup final | 이번 `verify-analysis-state` 실행에서 남은 `/tmp/media_server_analysis_state_smoke-81250`, `/tmp/media_server_analysis_state_smoke-2654`, `/tmp/media_server_analysis_state_smoke-4462` 각 3.9MB와 `/tmp/media_server_analysis_state_dep_scan.txt` 0B를 삭제하고, 같은 경로 재조회에서 미검출 확인 | pass |

미실행/제외:

| 제목 | 수행내용 | 사유 |
| --- | --- | --- |
| v300 S00 published metadata | `./server.sh verify-release-metadata --published` | GitHub Release publish 이후 외부 상태 확인용입니다. S00 local source-of-truth 완료 evidence로 사용하지 않음 |
| v300 S00 UI 풀테스트 | 인앱 브라우저 route/control/action 직접 조작 | S00은 문서/source metadata 정렬 범위입니다. UI 직접 조작 PASS로 대체하지 않음 |
| v300 S00 30분/120분 longrun | `verify-predev --soak-minutes 30`, `verify-predev --soak-minutes 120`, `verify-va-runtime-console-longrun --duration-minutes 120` | S00 source-of-truth 정렬 gate 자체에서는 실행하지 않음 |
| v300 S00 field smoke | real ONVIF, external TURN/WHEP, real cloud/VLM provider call | endpoint/credential/실기기 조건 미제공. S00 완료 evidence로 사용하지 않음 |
| v300 S01 frame extraction | Frame Bundle Extraction, event frame capture, representative image selection, bbox crop generation | V300-S02 범위입니다. S01은 contract/fixture/verifier만 확인하며 완료 evidence로 사용하지 않음 |
| v300 S01 encoded clip/playback | encoded MP4/WebM event clip, clip playback, replay timeline, VMS/NVR archive API | v3.0 S01 비범위이며 v3.1 후보입니다. S01 완료 evidence로 사용하지 않음 |
| v300 S01 Search/UI/longrun/published | Search DSL, `/ops/events` UI 직접 조작, UI 풀테스트, 30분/120분 longrun, `verify-release-metadata --published`, tag/push/GitHub Release | 사용자 별도 승인/후속 스텝 범위가 필요합니다. S01 완료 evidence로 사용하지 않음 |
| v300 S02 encoded clip/playback/VMS | encoded clip playback, replay timeline, VMS/NVR archive API | S02는 image/frame bundle extraction sidecar 범위입니다. encoded playback/archive 완료 evidence로 사용하지 않음 |
| v300 S02 Search/UI/longrun/published | Search DSL, `/ops/events` UI 직접 조작, UI 풀테스트, 30분/120분 longrun, `verify-release-metadata --published`, tag/push/GitHub Release | 사용자 별도 승인/후속 스텝 범위가 필요합니다. S02 완료 evidence로 사용하지 않음 |
| v300 S03 VLM queue/runtime/provider | VLM Feature Queue, lazy trigger, real VLM runtime/provider 호출, model 품질 PASS | S03은 feature schema/privacy policy 범위입니다. VLM queue/runtime/provider success 완료 evidence로 사용하지 않음 |
| v300 S03 Search/UI/longrun/published | Search DSL, `/ops/events` UI 직접 조작, 얼굴 인식/신원 식별/model 품질 PASS, UI 풀테스트, 30분/120분 longrun, `verify-release-metadata --published`, tag/push/GitHub Release | 사용자 별도 승인/후속 스텝 범위가 필요합니다. S03 완료 evidence로 사용하지 않음 |
| v300 S04 provider/search/UI/longrun/published | real VLM runtime/provider 호출, cloud provider success, model 품질 PASS, Search DSL, `/ops/events` UI 직접 조작, UI 풀테스트, 30분/120분 longrun, `verify-release-metadata --published`, tag/push/GitHub Release | S04는 feature queue/outcome contract 범위입니다. 실행하지 않았고 완료 evidence로 사용하지 않음 |
| v300 S05 search/UI/cleanup/longrun/published | Search DSL, `/ops/events` UI 직접 조작, Retention/Pin/Cleanup lifecycle delete/dry-run/audit, UI 풀테스트, 30분/120분 longrun, `verify-release-metadata --published`, tag/push/GitHub Release | S05는 feature-only retention contract 범위입니다. 실행하지 않았고 완료 evidence로 사용하지 않음 |

### v3.1.0

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| v310 S02 RED encoder pipeline | 최초 `./server.sh verify-analysis-state`는 기존 frame-bundle clip manifest에 encoded clip job status/non-VMS boundary가 없어 fail. V310-S02 구현 전 기대 실패로 확인 | fail |
| v310 S02 analysis state final | 구현 후 `./server.sh verify-analysis-state` 재실행. Event recorder media hook이 `media-server.va.encoded-event-clip.v1` manifest, `event-clip.avi`, frameMap, `queueName=event-clip-encoder`, `status=completed`, partial cleanup, non-VMS boundary를 생성함을 확인. summary `pass=142 fail=0` | pass |
| v310 S02 build final | `./server.sh build` 실행. `src/analysis/event_storage.cpp` 재빌드 후 `build-gst-onnx/media_server` target 생성 확인 | pass |
| v310 S02 project inventory final | `./server.sh verify-project-inventory` 실행. featureRows 523, pass 13/fail 0으로 `EVT-059`/`SAFE-083` inventory 연결 확인 | pass |
| v310 S02 feature inventory coverage final | `./server.sh verify-feature-inventory-coverage` 실행. featureRows 523, covered 523, missing 0, pass 5/fail 0 확인 | pass |
| v310 S02 script inventory final | `./server.sh verify-script-inventory` 실행. documented command/dispatch/script family guard pass 11/fail 0 확인 | pass |
| v310 S02 docs links final | `./server.sh verify-docs-links` 실행. markdown 103, local links 573, local images 22, local anchors 96, failures 0 확인 | pass |
| v310 S02 V300 contract boundary recheck | `./server.sh verify-v300-event-evidence-contract` 실행. V300-S01 contract gate pass 7/fail 0이며 encoded clip playback은 해당 명령에서 not-run-by-this-command로 남는지 확인 | pass |
| v310 S02 diff check final | `git diff --check` 실행. whitespace error output 없음 확인 | pass |
| v310 S02 temp cleanup final | 이번 `verify-analysis-state` 실행에서 남은 `/private/tmp/media_server_analysis_state_smoke-74278` 약 3.7MB와 `/private/tmp/media_server_analysis_state_smoke-74947` 약 3.8MB를 삭제하고, 같은 경로 재조회에서 미검출 확인. 다른 과거 `media_server*` 임시 산출물은 이번 스텝 산출물로 특정하지 않아 미삭제 | pass |

미실행/제외:

| 제목 | 수행내용 | 사유 |
| --- | --- | --- |
| v310 S02 v3.1 baseline/S01 contract | VERSION/CMake/README/docs/backlog source roadmap을 v3.1 기준으로 정렬하거나 MP4/WebM clip contract를 별도 완료 처리 | 이번 지시는 `V310-S02 Event Clip Encoder Pipeline` 범위입니다. V310-S00/S01 완료 evidence로 사용하지 않음 |
| v310 S02 replay UI/client digest/scoped API | `/ops/events` replay timeline UI, client-safe event digest, scoped integrator search API | V310-S03 이후 범위입니다. S02 완료 evidence로 사용하지 않음 |
| v310 S02 30분/120분/UI/published | UI 풀테스트 직접 조작, `verify-predev --soak-minutes 30`, `verify-predev --soak-minutes 120`, `verify-va-runtime-console-longrun --duration-minutes 120`, `verify-release-metadata --published`, PR/main/tag/GitHub Release | 사용자 별도 지시/승인 범위가 아닙니다. S02 안정화 PASS로 대체하지 않음 |

### v2.5.0

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| v250 release stability build/docs/inventory | build, release metadata/evidence, docs links/assets, script/project/feature inventory 확인 | pass |
| v250 manual UI seed dry-run | manual UI seed dry-run과 native/blocking dialog guard 확인 | pass |
| v250 auth gates | auth bootstrap/users/routes 확인 | pass |
| v250 feature verifiers | V250-S01~S09 verifier 실행 | pass |
| v250 manual UI evidence gate | manual UI evidence template/checklist 기준 확인 | pass |
| v250 release close-out dry-run | release closeout dry-run 확인 | pass |
| v250 predev quick | `verify-predev --quick` 최종 status pass, pass 14, fail 0, skip 1, durationSec 632, quickMode true, soakMinutes 1 | pass |
| v250 diff check | `git diff --check` 확인 | pass |
| v250 30분 server 유지 | 30분 predev 동안 서버 유지와 integrated smoke 확인 | pass |
| v250 30분 VA events | 22회 soak iteration에서 VA events 반복 확인 | pass |
| v250 30분 Event POST schema/recovery | 22회 soak iteration에서 Event POST schema/recovery 반복 확인 | pass |
| v250 30분 redaction/runtime idle | 22회 soak iteration에서 redaction/runtime idle 반복 확인 | pass |
| v250 30분 port/report cleanup | ports-clean과 report generation 확인. status pass, pass 119, fail 0, skip 1, durationSec 2370 | pass |
| v250 UI auth routes | `/setup`, `/login`, `/password/change`, `/invite/setup`, `/client/request-access` 직접 확인 | pass |
| v250 UI Ops routes | `/ops/home`, `/ops/dashboard`, `/ops/sources`, `/ops/rules`, `/ops/users`, `/ops/events`, `/ops/vlm` 직접 확인 | pass |
| v250 UI Client routes | `/client/live`, `/client/dashboard`, `/client/events` 직접 확인 | pass |
| v250 UI incident memory controls | semantic search, incident timeline action save, explainable brief, similar incident lookup, evidence filter 확인 | pass |
| v250 UI redacted evidence bundle control | release-safe bundle control/manifest policy 확인 | pass |
| v250 download follow-up | Chrome download event와 동일 UI payload의 HTTP 200 zip attachment/redacted manifest 확인 | pass |
| v250 publication | PR #28 checks/merge, signed annotated tag, source-only GitHub Release, published metadata 재검증 확인 | pass |

미실행/제외:

| 제목 | 수행내용 | 사유 |
| --- | --- | --- |
| v250 120분 longrun | `verify-predev --soak-minutes 120` | 실행 기록 없음. v250 release 결과 PASS로 대체하지 않음 |
| v250 runtime console 120분 | `verify-va-runtime-console-longrun --duration-minutes 120` | 실행 기록 없음 |
| v250 field smoke | real ONVIF, external WHEP/WHIP/TURN, real cloud provider call | endpoint/credential/실기기 조건 미제공 |

### v2.6.0

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| v260 owner readiness local gate | `verify-v260-owner-release-readiness`, release metadata, docs links/assets, feature/manual UI/evidence/closeout dry-run, diff check 확인 | pass |
| v260 release stability build/docs/inventory | build, release metadata/evidence, docs links/assets, script/project/feature inventory 확인 | pass |
| v260 feature verifiers | V260-S01~S06 verifier 실행 | pass |
| v260 auth gates | auth bootstrap/users/routes 확인 | pass |
| v260 Ops/Client static smoke | Ops/Client static smoke 확인 | pass |
| v260 closeout dry-run | release closeout dry-run 확인 | pass |
| v260 predev quick | `verify-predev --quick` 최종 status pass, pass 14, fail 0, skip 1, durationSec 610, quickMode true, soakMinutes 1 | pass |
| v260 diff check | `git diff --check` 확인 | pass |
| v260 30분 server 유지 | 30분 predev 동안 서버 유지와 integrated smoke 확인 | pass |
| v260 30분 VA events | 22회 soak iteration에서 VA events 반복 확인 | pass |
| v260 30분 Event POST schema/recovery | 22회 soak iteration에서 Event POST schema/recovery 반복 확인 | pass |
| v260 30분 redaction/runtime idle | 22회 soak iteration에서 redaction/runtime idle 반복 확인 | pass |
| v260 30분 port/report cleanup | ports-clean과 report generation 확인. status pass, pass 119, fail 0, skip 1, durationSec 2370 | pass |
| v260 UI auth routes | `/setup`, `/login`, `/password/change`, `/invite/setup`, `/client/request-access` 직접 확인 | pass |
| v260 UI Ops routes | `/ops/home`, `/ops/dashboard`, `/ops/sources`, `/ops/rules`, `/ops/users`, `/ops/events`, `/ops/vlm` 직접 확인 | pass |
| v260 UI Client routes | `/client/live`, `/client/dashboard`, `/client/events` 직접 확인 | pass |
| v260 UI wrapper | `verify-ui-fulltest-one-shot --browser-mode in-app --in-app-evidence ...` 최종 PASS 확인 | pass |
| v260 UI procedure retry | DOM click/value setter, verifier option, viewer denied 판정식 문제를 테스트 절차 이슈로 보정 후 재실행 | pass |

미실행/제외:

| 제목 | 수행내용 | 사유 |
| --- | --- | --- |
| v260 120분 longrun | `verify-predev --soak-minutes 120` | 실행 기록 없음 |
| v260 runtime console 120분 | `verify-va-runtime-console-longrun --duration-minutes 120` | 실행 기록 없음 |
| v260 publication | PR/main/tag/GitHub Release/published metadata | 이 UI/30분/stability run에서 실행하지 않음 |
| v260 field smoke | real ONVIF, external WHEP/WHIP/TURN, real cloud/VLM provider call | endpoint/credential/실기기 조건 미제공 |

### v2.7.0

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| v270 owner readiness local gate | `verify-v270-owner-release-readiness`, release metadata, docs links/assets, feature/manual UI/evidence/closeout dry-run, diff check 확인 | pass |
| v270 release stability build/docs/inventory | build, release metadata/evidence, docs links/assets, script/project/feature inventory 확인 | pass |
| v270 feature verifiers | V270-S01~S06 verifier 실행 | pass |
| v270 auth gates | auth bootstrap/users/routes 확인 | pass |
| v270 Ops/Client UI smoke+screenshot | Ops/Client UI smoke와 screenshot smoke 확인 | pass |
| v270 Event metadata gates | Event POST/WebRTC/SSE/WS metadata 확인 | pass |
| v270 Rule/action workflow gates | Rule UI, rules roundtrip, tables layout, event review, incident workflow, alert/VLM workflow 확인 | pass |
| v270 analysis/VA gates | analysis state, VA replay/events/dispatch records 확인 | pass |
| v270 predev quick | `verify-predev --quick` 최종 status pass, pass 14, fail 0, skip 1, durationSec 616, quickMode true, soakMinutes 1 | pass |
| v270 diff check | `git diff --check` 확인 | pass |
| v270 UI one-shot build/seed/server health | `verify-ui-fulltest-one-shot --browser-mode chrome`에서 build, manual UI seed dry-run, core/auth UI server health 확인 | pass |
| v270 UI one-shot guards | native/blocking dialog guards와 feature inventory coverage 확인 | pass |
| v270 UI one-shot smoke | Ops/Client UI smoke+screenshot, Rule UI, route boundaries, rules roundtrip, tables layout, ops click E2E core/auth 확인 | pass |
| v270 30분 server 유지 | 30분 predev 동안 서버 유지와 integrated smoke 확인 | pass |
| v270 30분 VA events | 22회 soak iteration에서 VA events 반복 확인 | pass |
| v270 30분 Event POST schema/recovery | 22회 soak iteration에서 Event POST schema/recovery 반복 확인 | pass |
| v270 30분 redaction/runtime idle | 22회 soak iteration에서 redaction/runtime idle 반복 확인 | pass |
| v270 30분 queue/port/report cleanup | event-post-queue, ports-clean, report generation 확인. status pass, pass 119, fail 0, skip 1, durationSec 2366 | pass |
| v270 120분 server 유지 | 120분 predev 동안 서버 유지와 integrated smoke 확인 | pass |
| v270 120분 VA events | 87회 soak iteration에서 VA events 반복 확인 | pass |
| v270 120분 Event POST schema/recovery | 87회 soak iteration에서 Event POST schema/recovery 반복 확인 | pass |
| v270 120분 redaction/runtime idle | 87회 soak iteration에서 redaction/runtime idle 반복 확인 | pass |
| v270 120분 queue/port/report cleanup | main-runtime-idle, event-post-queue, queue-runtime-idle, ports-clean, report generation 확인. status pass, pass 444, fail 0, skip 1, durationSec 7749 | pass |
| v270 runtime console WebRTC/SSE/RTSP | 120분 runtime console에서 WebRTC client, SSE sidechannel, RTSP overlay 확인 | pass |
| v270 runtime console cleanup | runtime cleanup, ports-clean, maxRssKb 509744, runtimeIdle true, portsClean true 확인. status pass, pass 11, fail 0, skip 0, durationSec 7200 | pass |

미실행/제외:

| 제목 | 수행내용 | 사유 |
| --- | --- | --- |
| v270 Codex 인앱 브라우저 UI 직접 풀테스트 | 인앱 브라우저 직접 route/control/action 검수 | `v270-release-ui-one-shot`은 Chrome 자동 UI smoke이며 `inAppEvidence`와 `manualResult`가 없으므로 직접 UI 풀테스트 PASS가 아님 |
| v270 publication | PR/main/tag/GitHub Release/published metadata | 이 release test run에서 실행하지 않음 |
| v270 field smoke | real ONVIF, external WHEP/WHIP/TURN, real cloud/VLM provider call | endpoint/credential/실기기 조건 미제공 |

### v2.9.0

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| v290 S00 build | `./server.sh build` 실행. build-gst-onnx configure/build exit 0, media_server target built | pass |
| v290 S00 release metadata | 최초 `./server.sh verify-release-metadata`는 backlog current roadmap drift로 fail. source `2.9.0`, latest published `v2.8.0`, current roadmap `v2.9.0 Final 2.x Closure & Compatibility Baseline` 분리 구현 후 재실행 pass 16/fail 0 | pass |
| v290 S00 docs links | `./server.sh verify-docs-links` 실행. markdown files 101, local links 548, images 22, anchors 96, failures 0 | pass |
| v290 S00 docs UI assets | 최초 `./server.sh verify-docs-ui-assets`는 docs UI asset manifest source version drift로 fail. manifest/verifier/policy를 source `2.9.0`, published `v2.8.0`으로 정렬 후 재실행 pass 10/fail 0 | pass |
| v290 S00 feature inventory coverage | `./server.sh verify-feature-inventory-coverage` 실행. featureRows 499, covered 499, missing 0, pass 5/fail 0 | pass |
| v290 S00 diff check | `git diff --check` 실행. whitespace error 없음 | pass |
| v290 S01 RED command precheck | 최초 `./server.sh verify-v290-final-contract-freeze`는 command 미구현으로 fail. S01 verifier/entrypoint 추가 전 기대 실패로 확인 | fail |
| v290 S01 verifier implementation correction | 구현 직후 첫 `./server.sh verify-v290-final-contract-freeze`는 auth source snippet 기대값이 실제 `DefaultScopesForRole()` 구현과 맞지 않아 pass 7/fail 1로 fail. verifier 기대값을 실제 함수 구조와 scope 값 기준으로 수정 | fail |
| v290 S01 integrator artifact correction | 첫 `./server.sh verify-integrator-contract-artifact`는 `freeze-baseline.json` checksum과 기존 `docs/media-server-architecture.md` freeze hash drift로 pass 9/fail 2. 현재 파일 기준 freeze baseline/checksum 갱신 후 재실행 필요 | fail |
| v290 S01 script inventory correction | 첫 `./server.sh verify-script-inventory`는 미구현 S03 후보 명령이 실제 server command처럼 문서화되어 pass 10/fail 1. 후보/미구현 표현으로 보정 후 재실행 필요 | fail |
| v290 S01 final contract freeze | `./server.sh verify-v290-final-contract-freeze` 재실행. contract 문서/freeze matrix/auth scope/server wiring/roadmap/stream/inventory/release records/freeze-baseline hash 확인, pass 8/fail 0 | pass |
| v290 S01 integrator contract artifact | `./server.sh verify-integrator-contract-artifact` 재실행. manifest, conformance, checksum, schema/sample identifier, exposure guard, freeze baseline 확인, pass 11/fail 0 | pass |
| v290 S01 script inventory | `./server.sh verify-script-inventory` 재실행. dispatch target executable, documented command resolution, script classification, option parser guard 확인, pass 11/fail 0 | pass |
| v290 S01 feature inventory coverage | `./server.sh verify-feature-inventory-coverage` 실행. featureRows 501, covered 501, missing 0, pass 5/fail 0 | pass |
| v290 S01 docs links | `./server.sh verify-docs-links` 실행. markdown files 101, local links 548, images 22, anchors 96, failures 0 | pass |
| v290 S01 build | `./server.sh build` 실행. build-gst-onnx configure/build exit 0, media_server target built | pass |
| v290 S01 diff check | `git diff --check` 실행. whitespace error 없음 | pass |
| v290 S02 RED command precheck | 최초 `./server.sh verify-v290-v28-regression-bundle`는 command 미구현으로 fail. S02 verifier/entrypoint 추가 전 기대 실패로 확인 | fail |
| v290 S02 v2.8 regression bundle | `./server.sh verify-v290-v28-regression-bundle` 실행. docPass 5/docFail 0, subcommandPass 5/subcommandFail 0 | pass |
| v290 S02 V280-S02 rerun | bundle 안에서 `verify-v280-incident-action-readiness-queue` 재실행, exit 0 | pass |
| v290 S02 V280-S03 rerun | bundle 안에서 `verify-v280-approval-gated-rule-draft` 재실행, exit 0 | pass |
| v290 S02 V280-S04 rerun | bundle 안에서 `verify-v280-evidence-intake-field-readiness` 재실행, exit 0 | pass |
| v290 S02 V280-S05 rerun | bundle 안에서 `verify-v280-runtime-evidence-window` 재실행, exit 0 | pass |
| v290 S02 V280-S06 rerun | bundle 안에서 `verify-v280-client-safe-followup-digest` 재실행, exit 0 | pass |
| v290 S02 project inventory correction | 첫 `./server.sh verify-project-inventory`는 verifier 기대 범위가 `SAFE-070`/`OPS-040`에 남고 manual UI seed fixture가 `v2.8.0` target이라 fail. `SAFE-073`/`OPS-043` 및 seed `v2.9.0`으로 보정 후 재실행 필요 | fail |
| v290 S02 project inventory | `./server.sh verify-project-inventory` 재실행. featureRows 503, seed fixture `v2.9.0`, pass 13/fail 0 | pass |
| v290 S02 feature inventory coverage | `./server.sh verify-feature-inventory-coverage` 실행. featureRows 503, covered 503, missing 0, pass 5/fail 0 | pass |
| v290 S02 script inventory | `./server.sh verify-script-inventory` 실행. pass 11/fail 0 | pass |
| v290 S02 docs links | `./server.sh verify-docs-links` 실행. markdown files 101, local links 548, images 22, anchors 96, failures 0 | pass |
| v290 S02 build | `./server.sh build` 실행. build-gst-onnx configure/build exit 0, media_server target built | pass |
| v290 S02 diff check | `git diff --check` 실행. whitespace error 없음 | pass |
| v290 S03 RED command precheck | 최초 `./server.sh verify-v290-2x-compatibility-baseline`는 command 미구현으로 fail. S03 verifier/entrypoint 추가 전 기대 실패로 확인 | fail |
| v290 S03 compatibility verifier correction | 구현 후 `./server.sh verify-v290-2x-compatibility-baseline` 재실행 중 v2.6/v2.7 하위 verifier 일부가 현재 archived roadmap 형식/분리된 roadmap evidence 문구를 읽지 못해 fail했고, S01/S02 bridge verifier가 S03 이후 feature inventory 총계/range 증가를 과거 고정값 drift로 fail 처리함. 제품 로직/API/schema/media path 변경 없이 verifier 기대값을 현재 문서 구조와 누적 inventory 기준으로 보정 | fail |
| v290 S03 2x compatibility baseline | `./server.sh verify-v290-2x-compatibility-baseline` 실행. docPass 5/docFail 0, subcommandPass 20/subcommandFail 0 | pass |
| v290 S03 v2.5 compatibility reruns | bundle 안에서 v2.5 핵심 verifier 8개(`verify-v250-incident-text-projection`, `verify-v250-incident-memory-index`, `verify-v250-ops-events-semantic-search-ui`, `verify-v250-incident-timeline-graph`, `verify-v250-explainable-incident-brief`, `verify-v250-similar-incident-lookup`, `verify-v250-client-safe-incident-digest`, `verify-v250-redacted-incident-evidence-bundle`) 재실행, 모두 exit 0 | pass |
| v290 S03 v2.6 compatibility reruns | bundle 안에서 v2.6 핵심 verifier 5개(`verify-v260-incident-memory-productization`, `verify-v260-rule-suggestion-review`, `verify-v260-onvif-credential-gate`, `verify-v260-runtime-dashboard-trends`, `verify-v260-scenario-cross-zone-reentry`) 재실행, 모두 exit 0 | pass |
| v290 S03 v2.7 compatibility reruns | bundle 안에서 v2.7 핵심 verifier 5개(`verify-v270-incident-triage-board`, `verify-v270-incident-decision-scorecard`, `verify-v270-operational-action-pack`, `verify-v270-rule-what-if-preview`, `verify-v270-operator-outcome-memory`) 재실행, 모두 exit 0 | pass |
| v290 S03 v2.9 bridge reruns | bundle 안에서 `verify-v290-final-contract-freeze`, `verify-v290-v28-regression-bundle` 재실행, 모두 exit 0 | pass |
| v290 S03 project inventory | `./server.sh verify-project-inventory` 실행. featureRows 505, seed fixture `v2.9.0`, pass 13/fail 0 | pass |
| v290 S03 feature inventory coverage | `./server.sh verify-feature-inventory-coverage` 실행. featureRows 505, covered 505, missing 0, pass 5/fail 0 | pass |
| v290 S03 script inventory | `./server.sh verify-script-inventory` 실행. pass 11/fail 0 | pass |
| v290 S03 docs links | `./server.sh verify-docs-links` 실행. markdown files 101, local links 548, images 22, anchors 96, failures 0 | pass |
| v290 S03 build | `./server.sh build` 실행. build-gst-onnx configure/build exit 0, media_server target built | pass |
| v290 S03 diff check | `git diff --check` 실행. whitespace error 없음 | pass |
| v290 S04 RED command precheck | 최초 `./server.sh verify-v290-release-test-records-enforcement`는 command 미구현으로 fail. S04 verifier/entrypoint 추가 전 기대 실패로 확인 | fail |
| v290 S04 verifier line-wrap correction | 구현 후 첫 `./server.sh verify-v290-release-test-records-enforcement`는 release records 원칙 문장 줄바꿈 때문에 pass 6/fail 1로 fail. Markdown 줄바꿈에 흔들리지 않도록 verifier 공백 정규화 후 재실행 | fail |
| v290 S04 release test records enforcement | `./server.sh verify-v290-release-test-records-enforcement` 재실행. roadmap/stream verification, records sections, deprecated guard, S04 RED/not-run boundary, `OPS-045`/`SAFE-075`, server entrypoint, pass/fail-only 결과표 확인, pass 7/fail 0 | pass |
| v290 S04 S03 compatibility guard rerun | S04 이후 누적 inventory 증가를 허용하도록 보정한 `./server.sh verify-v290-2x-compatibility-baseline` 재실행. docPass 5/docFail 0, subcommandPass 20/subcommandFail 0 | pass |
| v290 S04 project inventory | `./server.sh verify-project-inventory` 실행. featureRows 507, seed fixture `v2.9.0`, pass 13/fail 0 | pass |
| v290 S04 feature inventory coverage | `./server.sh verify-feature-inventory-coverage` 실행. featureRows 507, covered 507, missing 0, pass 5/fail 0 | pass |
| v290 S04 script inventory | `./server.sh verify-script-inventory` 실행. pass 11/fail 0 | pass |
| v290 S04 docs links | `./server.sh verify-docs-links` 실행. markdown files 101, local links 548, images 22, anchors 96, failures 0 | pass |
| v290 S04 build | `./server.sh build` 실행. build-gst-onnx configure/build exit 0, media_server target built | pass |
| v290 S04 diff check | `git diff --check` 실행. whitespace error 없음 | pass |
| v290 S05 RED command precheck | 최초 `./server.sh verify-v290-ui-fulltest-criteria-freeze`는 command 미구현으로 fail. S05 verifier/entrypoint 추가 전 기대 실패로 확인 | fail |
| v290 S05 manual UI baseline precheck | 최초 `./server.sh verify-manual-ui-evidence`는 manual UI 문서가 v2.8 기준이라 fail. v2.9 current target과 release UI gate drift를 확인 | fail |
| v290 S05 stream boundary correction | 구현 후 첫 `./server.sh verify-v290-ui-fulltest-criteria-freeze`는 stream verification이 S05 명령 PASS 자체가 실제 인앱 브라우저 직접 조작 PASS가 아님을 명시하지 않아 pass 6/fail 1로 fail. 경계 문구 보강 후 재실행 | fail |
| v290 S05 UI fulltest criteria freeze | `./server.sh verify-v290-ui-fulltest-criteria-freeze` 재실행. roadmap/stream verification, manual UI v2.9 baseline, route/control/action/role/viewport/theme freeze, automation 비승격, `OPS-046`/`SAFE-076`, release records, server entrypoint 확인, pass 7/fail 0 | pass |
| v290 S05 manual UI evidence | `./server.sh verify-manual-ui-evidence` 실행. template/checklist baseline, required screens, PASS/FAIL-only, direct browser evidence, auth env, exclusions, current release evidence index 확인, pass 23/fail 0 | pass |
| v290 S05 project inventory | `./server.sh verify-project-inventory` 실행. featureRows 509, seed fixture `v2.9.0`, pass 13/fail 0 | pass |
| v290 S05 feature inventory coverage | `./server.sh verify-feature-inventory-coverage` 실행. featureRows 509, covered 509, missing 0, pass 5/fail 0 | pass |
| v290 S05 script inventory | `./server.sh verify-script-inventory` 실행. pass 11/fail 0 | pass |
| v290 S05 release test records enforcement | `./server.sh verify-v290-release-test-records-enforcement` 실행. pass 7/fail 0 | pass |
| v290 S05 docs links | `./server.sh verify-docs-links` 실행. markdown files 101, local links 548, images 22, anchors 96, failures 0 | pass |
| v290 S05 build | `./server.sh build` 실행. build-gst-onnx configure/build exit 0, media_server target built | pass |
| v290 S05 diff check | `git diff --check` 실행. whitespace error 없음 | pass |
| v290 S06 RED command precheck | 최초 `./server.sh verify-v290-release-evidence-hygiene`는 command 미구현으로 fail. S06 verifier/entrypoint 추가 전 기대 실패로 확인 | fail |
| v290 S06 release evidence hygiene | `./server.sh verify-v290-release-evidence-hygiene` 실행. roadmap/stream verification, release evidence index, release records, release evidence verifier, `OPS-047`/`SAFE-077`, server entrypoint 확인, pass 6/fail 0 | pass |
| v290 S06 release evidence index | `./server.sh verify-release-evidence-index` 실행. required categories, detailed records, token ledger temporary path exclusion, skipped/unverified wording, token usage fields, public docs non-front-door, server entrypoint 확인, pass 8/fail 0 | pass |
| v290 S06 project inventory | `./server.sh verify-project-inventory` 실행. featureRows 511, seed fixture `v2.9.0`, pass 13/fail 0 | pass |
| v290 S06 feature inventory coverage | `./server.sh verify-feature-inventory-coverage` 실행. featureRows 511, covered 511, missing 0, pass 5/fail 0 | pass |
| v290 S06 script inventory | `./server.sh verify-script-inventory` 실행. pass 11/fail 0 | pass |
| v290 S06 S04 records gate rerun | `./server.sh verify-v290-release-test-records-enforcement` 실행. pass 7/fail 0 | pass |
| v290 S06 S05 UI criteria gate rerun | `./server.sh verify-v290-ui-fulltest-criteria-freeze` 실행. pass 7/fail 0 | pass |
| v290 S06 docs links | `./server.sh verify-docs-links` 실행. markdown files 101, local links 552, images 22, anchors 96, failures 0 | pass |
| v290 S06 build | `./server.sh build` 실행. build-gst-onnx configure/build exit 0, media_server target built | pass |
| v290 S06 diff check | `git diff --check` 실행. whitespace error 없음 | pass |
| v290 S07 RED command precheck | 최초 `./server.sh verify-v290-public-docs-assets-refresh`는 command 미구현으로 fail. S07 verifier/entrypoint 추가 전 기대 실패로 확인 | fail |
| v290 S07 public docs/assets refresh | `./server.sh verify-v290-public-docs-assets-refresh` 재실행. public README/docs index, UI guide, docs asset policy, release/version policy, docs UI asset verifier, `OPS-048`/`SAFE-078`, release records, server entrypoint 확인, pass 8/fail 0 | pass |
| v290 S07 docs UI assets | `./server.sh verify-docs-ui-assets` 실행. representative screenshots, English screenshots, UI guide shared asset set, asset manifest, capture script ownership, stale baseline guard, managed PNG files, VA image bounds 확인, pass 10/fail 0 | pass |
| v290 S07 docs links | `./server.sh verify-docs-links` 실행. markdown files 101, local links 553, images 22, anchors 96, failures 0 | pass |
| v290 S07 release metadata | `./server.sh verify-release-metadata` 실행. current version 2.9.0, current tag v2.9.0, pass 16/fail 0 | pass |
| v290 S07 project inventory | `./server.sh verify-project-inventory` 실행. featureRows 513, seed fixture `v2.9.0`, pass 13/fail 0 | pass |
| v290 S07 feature inventory coverage | `./server.sh verify-feature-inventory-coverage` 실행. featureRows 513, covered 513, missing 0, pass 5/fail 0 | pass |
| v290 S07 script inventory | `./server.sh verify-script-inventory` 실행. pass 11/fail 0 | pass |
| v290 S07 S06 hygiene gate rerun | `./server.sh verify-v290-release-evidence-hygiene` 실행. pass 6/fail 0 | pass |
| v290 S07 S05 UI criteria gate rerun | `./server.sh verify-v290-ui-fulltest-criteria-freeze` 실행. pass 7/fail 0 | pass |
| v290 S07 S04 records gate rerun | `./server.sh verify-v290-release-test-records-enforcement` 실행. pass 7/fail 0 | pass |
| v290 S07 build | `./server.sh build` 실행. build-gst-onnx configure/build exit 0, media_server target built | pass |
| v290 S07 diff check | `git diff --check` 실행. whitespace error 없음 | pass |
| v290 S08 RED command precheck | 최초 `./server.sh verify-v290-final-stabilization-run`는 command 미구현으로 fail. S08 verifier/entrypoint 추가 전 기대 실패로 확인 | fail |
| v290 S08 auth bootstrap sandbox precheck | 최초 `MEDIA_SERVER_VERIFY_AUTH_* ./server.sh verify-auth-bootstrap`는 sandbox RTSP bind `Operation not permitted`로 fail. 제품 회귀가 아니라 sandbox 포트 바인딩 제한으로 판정하고 권한 실행으로 재검증 | fail |
| v290 S08 ops/client UI default precheck | 최초 `./server.sh verify-ops-client-ui`는 실행 중인 server base와 Codex 인앱 evidence가 없어 fetch/in-app evidence 전제 미충족으로 fail. S08 안정화 범위에서는 throwaway server와 static mode로 재실행 | fail |
| v290 S08 ops/client UI sandbox precheck | `./server.sh verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081` 기본 sandbox 실행은 local fetch 제한으로 fail. 권한 실행으로 재검증 | fail |
| v290 S08 rule UI default precheck | `./server.sh verify-rule-ui --http-base http://127.0.0.1:8081` 기본 실행은 Codex 인앱 evidence 또는 명시 Chrome fallback 전제 미충족으로 fail. S08에서는 Chrome fallback 예외를 명시해 재실행 | fail |
| v290 S08 codec default-port precheck | `./server.sh verify-codecs --help`는 help가 아니라 기본 8554/8080 server check로 들어가 현재 S08 throwaway server 포트 8555/8081과 맞지 않아 fail. 포트 env를 명시해 재실행 | fail |
| v290 S08 build | `./server.sh build` 실행. build-gst-onnx configure/build exit 0, media_server target built | pass |
| v290 S08 auth bootstrap | throwaway auth password env 5개를 명령 환경에만 주입해 `./server.sh verify-auth-bootstrap` 권한 재실행. server health, setup/login/logout/session, password policy 확인, 통과 14/실패 0 | pass |
| v290 S08 auth users | throwaway auth password env 5개를 명령 환경에만 주입해 `./server.sh verify-auth-users` 권한 실행. user management, viewer scope, lockout, invite/request flow 확인, 통과 58/실패 0 | pass |
| v290 S08 auth routes | throwaway auth password env 5개를 명령 환경에만 주입해 `./server.sh verify-auth-routes` 권한 실행. route guard/scope/CORS/WebRTC capability/client wrapper 확인, 통과 135/실패 0 | pass |
| v290 S08 ops/client UI | auth-off S08 throwaway server `http://127.0.0.1:8081`에서 `./server.sh verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081` 권한 실행. route/API/redaction contract 확인, 통과 18/실패 0. static mode라 렌더링 검사는 skip이며 UI 풀테스트 PASS가 아님 | pass |
| v290 S08 rule UI | S08 throwaway server에서 `MEDIA_SERVER_UI_BROWSER_MODE=chrome MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1 ./server.sh verify-rule-ui --http-base http://127.0.0.1:8081` 권한 실행. `/ops/rules` native smoke, validation, draft workflow, nav return 확인, exit 0 | pass |
| v290 S08 event POST | S08 throwaway server에서 `./server.sh verify-event-post --mode disabled --http-base http://127.0.0.1:8081` 권한 실행. HTTP health와 dispatcher disabled 상태 확인, 통과 2/실패 0/건너뜀 0 | pass |
| v290 S08 codec/media matrix | S08 throwaway server 포트에 맞춰 `MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 ./server.sh verify-codecs` 권한 실행. file/http/hls/rtsp/webrtc publish local source와 RTSP profile/WebRTC signaling 확인, pass 67/fail 0/skip 3 | pass |
| v290 S08 WebRTC ICE | S08 throwaway server 포트에 맞춰 `./server.sh verify-webrtc-ice` 권한 실행. browser ICE config, WebRTC session, candidate 수집, policy, WHIP publish signaling 확인, pass 8/fail 0/skip 0 | pass |
| v290 S08 SSE metadata | S08 throwaway server에서 `./server.sh verify-va-metadata-sidechannel --http-base http://127.0.0.1:8081` 권한 실행. SSE schema/tracks/events/scenarios/metrics와 temp analysis tap cleanup 확인, summary pass 5/fail 0 | pass |
| v290 S08 WS metadata | S08 throwaway server에서 `./server.sh verify-ws-metadata --http-base http://127.0.0.1:8081` 권한 실행. handshake/open/schema/control ack/reset cleanup 확인, summary pass 9/fail 0 | pass |
| v290 S08 WebRTC VA metadata | S08 throwaway server에서 `./server.sh verify-webrtc-va-metadata --http-base http://127.0.0.1:8081` 권한 실행. video track, ICE connected, DataChannel open/label, metadata schema/tracks/events/sync diagnostics 확인, pass 8/fail 0 | pass |
| v290 S08 RTSP VA overlay policy | S08 throwaway server에서 `./server.sh verify-rtsp-va-overlay-policy --http-base http://127.0.0.1:8081 --rtsp-base rtsp://127.0.0.1:8555/dhseo` 권한 실행. raw/overlay/SSE 분리와 raw/overlay 짧은 decode 확인, pass 6/fail 0/skip 0 | pass |
| v290 S08 integrator contract artifact | `./server.sh verify-integrator-contract-artifact` 실행. manifest/checksum/sample/schema/freeze baseline 확인, pass 11/fail 0 | pass |
| v290 S08 docs/inventory gates | `./server.sh verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory` 실행. release metadata pass 16/fail 0, docs links markdown 101/local links 554/images 22/anchors 96/failures 0, docs UI assets pass 10/fail 0, project inventory featureRows 515/pass 13/fail 0, feature coverage 515/515/pass 5/fail 0, script inventory pass 11/fail 0 | pass |
| v290 S08 compatibility and records gates | `./server.sh verify-v290-2x-compatibility-baseline`, `verify-v290-release-test-records-enforcement`, `verify-v290-ui-fulltest-criteria-freeze`, `verify-v290-release-evidence-hygiene`, `verify-v290-public-docs-assets-refresh` 재실행. S03 docPass 5/docFail 0/subcommandPass 20/subcommandFail 0, S04 pass 7/fail 0, S05 pass 7/fail 0, S06 pass 6/fail 0, S07 pass 8/fail 0 | pass |
| v290 S08 final stabilization run | `./server.sh verify-v290-final-stabilization-run` 실행. roadmap/stream verification, `OPS-049`/`SAFE-079`, release records, not-run boundary, server entrypoint 확인, pass 5/fail 0 | pass |
| v290 S09 RED command precheck | 최초 `./server.sh verify-v290-owner-release-readiness`는 command 미구현으로 fail. S09 verifier/entrypoint 추가 전 기대 실패로 확인 | fail |
| v290 S09 owner release readiness | `./server.sh verify-v290-owner-release-readiness` 실행. roadmap/stream verification, `OPS-050`/`SAFE-080`, release policy/evidence/records, manual UI criteria, not-run boundary, server entrypoint 확인 | pass |
| v290 S09 local release gates | `./server.sh build`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-manual-ui-evidence`, `./server.sh verify-release-evidence-index`, `./server.sh verify-script-inventory` 실행. local source/readiness/docs/inventory/manual/evidence/script gate 확인 | pass |
| v290 S09 closeout dry-run | `./server.sh verify-release-closeout-helper --dry-run` 실행. local release close-out 순서와 manual action 경계를 dry-run으로 확인하고 tag/push/GitHub Release를 수행하지 않음 | pass |
| v290 S09 one-shot closeout dry-run | `./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run` 실행. one-shot dry-run schema, localCommands/manualActions/gitStatusLines, tag not created, push not performed 경계 확인 | pass |
| v290 S09 git/tag/remote preflight | `git status --short --branch`, `git branch -vv`, `git tag --list 'v2.9.0'`, `git ls-remote --tags origin v2.9.0`, `git ls-remote --heads origin main v2.9.0`, `rg --files -g 'CHANGELOG*' -g 'NEWS*'` 확인. 최초 변경 이력 검색은 glob 미인용으로 `zsh: no matches found: CHANGELOG*` fail 후 quoted glob로 재실행했고 fixture 전용 `test/fixtures/integrator_contract_artifact/CHANGELOG.md`만 확인. PR/main/tag/GitHub Release는 실행하지 않음 | pass |
| v290 release UI fulltest | auth 검증용 `MEDIA_SERVER_VERIFY_AUTH_*` password env 5개를 명령 환경에만 주입하고 `./server.sh verify-ui-fulltest-one-shot --output-dir /tmp/media_server_v290_ui_fulltest_wrapper_20260619_codex --core-http-port 18191 --core-rtsp-port 18691 --auth-http-port 18192 --auth-rtsp-port 18692 --debug-port-base 15100 --in-app-evidence /tmp/media_server_v290_ui_fulltest_20260619_codex/in-app-ui-evidence.json` 실행. Codex 인앱 브라우저 직접 evidence는 route 16개, interaction 17개, failingInteractions 0입니다. wrapper는 result PASS, widths 390/1180, visualWidths 320/390/760/1180, Chrome fallback 미사용, core/auth click E2E required steps PASS, manual-ui-result-structure와 장시간 run은 wrapper 범위 밖으로 skip/not-run입니다 | pass |
| v290 release 30분 soak | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-predev --soak-minutes 30 --rtsp-port 18693 --http-port 18193 --summary-file /tmp/media_server_v290_release_30min_20260619_summary.json --report-file /tmp/media_server_v290_release_30min_20260619_report.md --report-html-file /tmp/media_server_v290_release_30min_20260619_report.html --heartbeat-interval 120` 실행. status pass, pass 119/fail 0/skip 1, durationSec 2363, soakMinutes 30, includeRedaction true, ports clean 확인. External TURN hard gate는 요청하지 않아 skip이며 PASS로 대체하지 않음 | pass |
| v290 release 120분 predev | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-predev --soak-minutes 120 --rtsp-port 18694 --http-port 18194 --summary-file /tmp/media_server_v290_release_120min_20260619_summary.json --report-file /tmp/media_server_v290_release_120min_20260619_report.md --report-html-file /tmp/media_server_v290_release_120min_20260619_report.html --heartbeat-interval 300` 실행. status pass, pass 444/fail 0/skip 1, durationSec 7773, soakMinutes 120, 87회 soak iteration, main-runtime-idle/event-post-queue/queue-runtime-idle/ports-clean/report generation 확인. External TURN hard gate는 요청하지 않아 skip이며 PASS로 대체하지 않음 | pass |
| v290 release runtime console 120분 | `MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-va-runtime-console-longrun --duration-minutes 120 --rtsp-port 18695 --http-port 18195 --work-dir /tmp/media_server_v290_runtime_console_120min_20260619 --summary-file /tmp/media_server_v290_runtime_console_120min_20260619_summary.json --report-file /tmp/media_server_v290_runtime_console_120min_20260619_report.md --include-sidechannel --include-dashboard` 실행. status pass, pass 9/fail 0/skip 1, durationSec 7200, dashboard/sidechannel included, WebRTC metadata 57,204 messages, SSE 14,203 messages, runtimeIdle true, portsClean true, maxRssKb 457856. RTSP overlay는 resource 관리상 이번 run에서 포함하지 않아 skip이며 PASS로 대체하지 않음 | pass |
| v290 release publication | PR #37 `v2.9.0 -> main` 생성/CI/merge, SSH signed annotated tag `v2.9.0` 생성/푸시, GitHub Release 생성, PR #38 post-publish metadata correction merge, `./server.sh verify-release-metadata --published --release-branch main --report /tmp/media_server_v290_published_metadata_20260619_report.md --json-report /tmp/media_server_v290_published_metadata_20260619_report.json` 재실행. 최초 published metadata는 GitHub Latest가 `v2.9.0`인데 문서/verifier latest published 기준이 `v2.8.0`이라 pass 18/fail 3으로 실패했고, PR #38 correction 후 pass 21/fail 0으로 통과. PR #37 merge commit `f538b9f6d4878978da63dd4ece7a40c9ffabd34a`, release branch head commit `bfb7885fc40b9eff2881be0a40dbdb1292cb7089`, PR #38 merge commit `614799151a06ab4315ee93e4eda666d8e46804dd`, GitHub Release URL `https://github.com/dhseo90/MediaServer/releases/tag/v2.9.0` | pass |

미실행/제외:

| 제목 | 수행내용 | 사유 |
| --- | --- | --- |
| v290 S00 published metadata | `./server.sh verify-release-metadata --published` | GitHub Release publish 이후 외부 상태 확인용입니다. S00 local source-of-truth 완료 evidence로 사용하지 않음 |
| v290 S00 UI 풀테스트 | 인앱 브라우저 route/control/action 직접 조작 | S00은 문서/source metadata 정렬 범위입니다. UI 직접 조작 PASS로 대체하지 않음 |
| v290 S00 30분 soak | `verify-predev --soak-minutes 30` | S00 source-of-truth 정렬 gate 자체에서는 실행하지 않음. 이번 release cut의 30분 evidence는 `v290 release 30분 soak` 행에 별도로 기록했으며, S00 안정화 PASS와 서로 대체하지 않음 |
| v290 S00 120분 longrun | `verify-predev --soak-minutes 120`, `verify-va-runtime-console-longrun --duration-minutes 120` | S00 source-of-truth 정렬 gate 자체에서는 실행하지 않음. 이번 release cut의 120분 evidence는 `v290 release 120분 predev`, `v290 release runtime console 120분` 행에 별도로 기록했으며, S00 안정화 PASS와 서로 대체하지 않음 |
| v290 S00 field smoke | real ONVIF, external TURN/WHEP, real cloud/VLM provider call | endpoint/credential/실기기 조건 미제공. S00 완료 evidence로 사용하지 않음 |
| v290 S01 runtime smoke | `verify-event-post`, `verify-webrtc-va-metadata`, `verify-va-metadata-sidechannel`, `verify-ws-metadata`, `verify-codecs`, `verify-webrtc-ice`, `verify-rtsp-va-overlay-policy` | S01은 local static contract freeze gate입니다. runtime delivery/media smoke를 실행하지 않았고 S01 PASS로 대체하지 않음 |
| v290 S01 UI 풀테스트 | 인앱 브라우저 route/control/action 직접 조작 | S01은 UI 변경이 아닌 contract freeze 문서/verifier 범위입니다. UI 직접 조작 PASS로 대체하지 않음 |
| v290 S01 30분/120분 longrun | `verify-predev --soak-minutes 30`, `verify-predev --soak-minutes 120`, `verify-va-runtime-console-longrun --duration-minutes 120` | S01 local contract freeze gate 자체에서는 실행하지 않음. 이번 release cut의 30분/120분 evidence는 `v290 release *` 장시간 행에 별도로 기록했으며, S01 local gate PASS와 서로 대체하지 않음 |
| v290 S01 published metadata | `./server.sh verify-release-metadata --published`, tag/push/GitHub Release | S01은 local source tree gate입니다. published metadata, tag, push, GitHub Release evidence로 보지 않음 |
| v290 S02 UI 풀테스트 | 인앱 브라우저 route/control/action 직접 조작 | S02 bundle은 v2.8 S02~S06 verifier 재실행 범위입니다. UI 직접 조작 PASS로 대체하지 않음 |
| v290 S02 30분/120분 longrun | `verify-predev --soak-minutes 30`, `verify-predev --soak-minutes 120`, `verify-va-runtime-console-longrun --duration-minutes 120` | S02 regression bundle gate 자체에서는 실행하지 않음. 이번 release cut의 30분/120분 evidence는 `v290 release *` 장시간 행에 별도로 기록했으며, S02 regression bundle PASS와 서로 대체하지 않음 |
| v290 S02 published metadata | `./server.sh verify-release-metadata --published`, tag/push/GitHub Release | S02는 local source tree regression gate입니다. published metadata, tag, push, GitHub Release evidence로 보지 않음 |
| v290 S03 owner release readiness | `verify-v250-owner-release-readiness`, `verify-v260-owner-release-readiness`, `verify-v270-owner-release-readiness`, `verify-v280-owner-release-readiness` | S03 compatibility baseline은 핵심 feature verifier와 v2.9 S01/S02 gate 재실행 범위입니다. owner release readiness 묶음 PASS로 대체하지 않음 |
| v290 S03 UI 풀테스트 | 인앱 브라우저 route/control/action 직접 조작 | S03 compatibility baseline은 하위 verifier 재실행 범위입니다. UI 직접 조작 PASS로 대체하지 않음 |
| v290 S03 30분/120분 longrun | `verify-predev --soak-minutes 30`, `verify-predev --soak-minutes 120`, `verify-va-runtime-console-longrun --duration-minutes 120` | S03 compatibility baseline gate 자체에서는 실행하지 않음. 이번 release cut의 30분/120분 evidence는 `v290 release *` 장시간 행에 별도로 기록했으며, S03 compatibility baseline PASS와 서로 대체하지 않음 |
| v290 S03 published metadata | `./server.sh verify-release-metadata --published`, tag/push/GitHub Release | S03는 local source tree compatibility gate입니다. published metadata, tag, push, GitHub Release evidence로 보지 않음 |
| v290 S04 UI 풀테스트 | 인앱 브라우저 route/control/action 직접 조작 | S04는 저장소 보존형 테스트 기록 체계 enforcement입니다. UI 직접 조작 PASS로 대체하지 않음 |
| v290 S04 30분/120분 longrun | `verify-predev --soak-minutes 30`, `verify-predev --soak-minutes 120`, `verify-va-runtime-console-longrun --duration-minutes 120` | S04 records gate 자체에서는 실행하지 않음. 이번 release cut의 30분/120분 evidence는 `v290 release *` 장시간 행에 별도로 기록했으며, S04 records gate PASS와 서로 대체하지 않음 |
| v290 S04 published metadata | `./server.sh verify-release-metadata --published`, tag/push/GitHub Release | S04는 local source tree records gate입니다. published metadata, tag, push, GitHub Release evidence로 보지 않음 |
| v290 S05 UI 풀테스트 | 인앱 브라우저 route/control/action 직접 조작 | S05 UI fulltest criteria freeze gate 자체에서는 실행하지 않음. 이번 release cut의 실제 UI evidence는 `v290 release UI fulltest` 행에 별도로 기록했으며, S05 verifier PASS와 서로 대체하지 않음 |
| v290 S05 30분/120분 longrun | `verify-predev --soak-minutes 30`, `verify-predev --soak-minutes 120`, `verify-va-runtime-console-longrun --duration-minutes 120` | S05 criteria gate 자체에서는 실행하지 않음. 이번 release cut의 30분/120분 evidence는 `v290 release *` 장시간 행에 별도로 기록했으며, S05 criteria gate PASS와 서로 대체하지 않음 |
| v290 S05 published metadata | `./server.sh verify-release-metadata --published`, tag/push/GitHub Release | S05는 local source tree criteria gate입니다. published metadata, tag, push, GitHub Release evidence로 보지 않음 |
| v290 S06 UI 풀테스트 | 인앱 브라우저 route/control/action 직접 조작 | S06 release evidence hygiene gate 자체에서는 실행하지 않음. 이번 release cut의 실제 UI evidence는 `v290 release UI fulltest` 행에 별도로 기록했으며, S06 verifier PASS와 서로 대체하지 않음 |
| v290 S06 30분/120분 longrun | `verify-predev --soak-minutes 30`, `verify-predev --soak-minutes 120`, `verify-va-runtime-console-longrun --duration-minutes 120` | S06 evidence hygiene gate 자체에서는 실행하지 않음. 이번 release cut의 30분/120분 evidence는 `v290 release *` 장시간 행에 별도로 기록했으며, S06 evidence hygiene PASS와 서로 대체하지 않음 |
| v290 S06 published metadata | `./server.sh verify-release-metadata --published`, tag/push/GitHub Release | S06은 local source tree evidence hygiene gate입니다. published metadata, tag, push, GitHub Release evidence로 보지 않음 |
| v290 S07 image recapture | `capture_docs_ui_assets.mjs` 또는 브라우저 직접 재캡처 | S07은 public docs/assets 기준 정리입니다. 새 이미지 파일 교체나 직접 이미지 재검수 실행 승인/증거 없음. S07 verifier PASS로 대체하지 않음 |
| v290 S07 UI 풀테스트 | 인앱 브라우저 route/control/action 직접 조작 | S07 public docs/assets refresh gate 자체에서는 실행하지 않음. 이번 release cut의 실제 UI evidence는 `v290 release UI fulltest` 행에 별도로 기록했으며, S07 verifier PASS와 서로 대체하지 않음 |
| v290 S07 30분/120분 longrun | `verify-predev --soak-minutes 30`, `verify-predev --soak-minutes 120`, `verify-va-runtime-console-longrun --duration-minutes 120` | S07 docs/assets gate 자체에서는 실행하지 않음. 이번 release cut의 30분/120분 evidence는 `v290 release *` 장시간 행에 별도로 기록했으며, S07 docs/assets PASS와 서로 대체하지 않음 |
| v290 S07 published metadata | `./server.sh verify-release-metadata --published`, tag/push/GitHub Release | S07은 local source tree public docs/assets gate입니다. published metadata, tag, push, GitHub Release evidence로 보지 않음 |
| v290 S08 UI 풀테스트 | 인앱 브라우저 route/control/action 직접 조작, viewport/theme 전수 확인 | S08은 final stabilization script run입니다. `verify-ops-client-ui --browser-mode static`와 Rule UI Chrome fallback smoke는 UI 풀테스트 직접 조작 PASS가 아니며, S08 final stabilization PASS로 대체하지 않음 |
| v290 S08 30분/120분 longrun | `verify-predev --soak-minutes 30`, `verify-predev --soak-minutes 120`, `verify-va-runtime-console-longrun --duration-minutes 120` | S08 final stabilization run 자체에서는 실행하지 않음. 이번 release cut의 30분/120분 evidence는 `v290 release *` 장시간 행에 별도로 기록했으며, S08 final stabilization PASS와 서로 대체하지 않음 |
| v290 S08 published metadata | `./server.sh verify-release-metadata --published`, tag/push/GitHub Release | S08은 local source tree 안정화 run입니다. published metadata, tag, push, GitHub Release evidence로 보지 않음 |
| v290 S08 field smoke | external TURN/WHEP, real ONVIF device, real cloud/VLM provider call | endpoint/credential/실기기 조건 미제공. S08 final stabilization PASS로 대체하지 않음 |
| v290 S08 Event POST schema/recovery | `./server.sh verify-event-post --mode schema`, `./server.sh verify-event-post --mode recovery` | S08에서는 auth-off 기본 dispatcher disabled smoke만 실행했습니다. Event POST enabled schema/recovery는 별도 event-post enabled 서버 조건이 필요하며 S08 disabled smoke PASS로 대체하지 않음 |
| v290 S09 UI 풀테스트 | 인앱 브라우저 route/control/action 직접 조작, viewport/theme 전수 확인 | S09 owner release readiness local gate 자체에서는 실행하지 않음. 이번 release cut의 실제 UI fulltest evidence는 위 `v290 release UI fulltest` 행에 별도로 기록했으며, S09 local readiness PASS와 서로 대체하지 않음 |
| v290 S09 30분/120분 longrun | `verify-predev --soak-minutes 30`, `verify-predev --soak-minutes 120`, `verify-va-runtime-console-longrun --duration-minutes 120` | S09 owner release readiness local gate 자체에서는 실행하지 않음. 이번 release cut의 30분/120분 evidence는 위 `v290 release 30분 soak`, `v290 release 120분 predev`, `v290 release runtime console 120분` 행에 별도로 기록했으며, S09 local readiness PASS와 서로 대체하지 않음 |
| v290 S09 published metadata | `./server.sh verify-release-metadata --published` | S09 owner release readiness local gate 자체에서는 실행하지 않음. 실제 published metadata PASS는 위 `v290 release publication` 행에 별도로 기록했으며, S09 local readiness PASS와 서로 대체하지 않음 |
| v290 S09 PR/main/tag/GitHub Release | PR 생성/merge, main sync, release tag 생성, GitHub Release 생성/갱신 | S09 owner release readiness local gate 자체에서는 실행하지 않음. 실제 PR/main/tag/GitHub Release evidence는 위 `v290 release publication` 행에 별도로 기록했으며, S09 local readiness PASS와 서로 대체하지 않음 |
| v290 S09 field smoke | external TURN/WHEP, real ONVIF device, real cloud/VLM provider call | endpoint/credential/실기기 조건 미제공. S09 local readiness PASS로 대체하지 않음 |
| v290 release field smoke | real ONVIF device, external TURN/WHEP credential operation, external WHEP playback endpoint, real cloud/VLM provider call, YouTube real URL relay, external alert delivery | endpoint/credential/실기기 조건 미제공. 이번 release cut에서 실행하지 않았고 PASS로 대체하지 않음 |

### v2.8.0

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| v280 release local build | `./server.sh build` 실행 | pass |
| v280 release metadata | `./server.sh verify-release-metadata` 실행 | pass |
| v280 owner readiness | `./server.sh verify-v280-owner-release-readiness` 실행 | pass |
| v280 docs links/assets | `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` 실행 | pass |
| v280 feature/manual/evidence gates | `verify-feature-inventory-coverage`, `verify-manual-ui-evidence`, `verify-release-evidence-index` 실행. `verify-manual-ui-evidence`는 template/checklist 범위이며 UI 직접 조작 PASS가 아님 | pass |
| v280 closeout dry-runs | `verify-release-closeout-helper --dry-run`, `verify-release-closeout-helper --dry-run --one-shot-dry-run` 실행. one-shot dryRun true, localCommands 5, manualActions 10, gitStatusLines 2, tag not created, push not performed | pass |
| v280 script inventory | `./server.sh verify-script-inventory` 실행 | pass |
| v280 diff check | `git diff --check` 실행 | pass |
| v280 git/tag/remote preflight | status, branch tracking, tag list, remote tag/head, CHANGELOG/NEWS 확인 | pass |
| v280 UI Ops routes | `/ops/home`, `/ops/dashboard`, `/ops/sources`, `/ops/rules`, `/ops/users`, `/ops/events`, `/ops/vlm` 직접 확인 | pass |
| v280 UI Client routes | `/client/live`, `/client/dashboard`, `/client/events` 직접 확인 | pass |
| v280 UI auth flows | `/setup`, `/login`, `/password/change`, `/client/request-access`, `/invite/setup` auth flow 직접 확인 | pass |
| v280 UI screenshots | 인앱 evidence screenshot 32개와 route 10개 확인 | pass |
| v280 UI core/auth interactions | core/auth interaction 16개 pass 확인 | pass |
| v280 table layout recovery | 최초 wrapper `ops-tables-layout` noHorizontalOverflow 누락 fail 후 `/ops/sources`, `/ops/rules`, `/ops/users`를 320/390/760/1180 폭에서 재계산해 overflow 0 확인 | pass |
| v280 table layout verifier | `verify-ops-tables-layout` 단독 재실행 PASS 확인 | pass |
| v280 UI wrapper rerun | `verify-ui-fulltest-one-shot` 재실행 PASS 확인 | pass |

미실행/제외:

| 제목 | 수행내용 | 사유 |
| --- | --- | --- |
| v280 30분 soak | `verify-predev --soak-minutes 30` | 최신 실행 승인/실행 기록 없음. v280 local gates 또는 UI 풀테스트 PASS로 대체하지 않음 |
| v280 120분 predev | `verify-predev --soak-minutes 120` | v2.8.0 신규 기능 ID의 120분 직접 매핑 또는 high-risk signal 없음. 실행하지 않음 |
| v280 runtime console 120분 | `verify-va-runtime-console-longrun --duration-minutes 120` | 실행하지 않음 |
| v280 publication | PR/main/tag/GitHub Release/published metadata | 실행하지 않음 |
| v280 field smoke | real ONVIF, external TURN/WHEP, real cloud/VLM provider call, 외부 alert delivery | endpoint/credential/실기기 조건 미제공 |

### Pre-v2.0 Historical Imported Runs

아래 행은 버전별 release record 체계가 정착되기 전의 과거 run입니다. 당시 임시
경로는 최종 evidence로 쓰지 않고, 필요한 값만 이 문서에 보존합니다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| pre-v2 stability script smoke | build, manual UI seed dry-run, auth bootstrap/users/routes, Ops/Client UI smoke+screenshot, rule UI, rules roundtrip, analysis state, VA replay/events/runtime console, SSE/WS/WebRTC metadata, diff check 확인 | pass |
| pre-v2 30분 soak | 30분 predev, integrated smoke, 22회 VA events/Event POST schema/recovery/redaction/runtime idle, queue mode, port cleanup 확인 | pass |
| pre-v2 UI fulltest restart | `/setup`, `/login`, `/ops/*`, `/client/*`, responsive/theme screenshot, EventRecord history coverage, WHEP/source/rule/client/auth scope, native/blocking dialog policy 확인 | pass |

### v2.0.0~v2.4.0 Historical Imported Runs

아래 행은 기존 `docs/release-evidence-index.md`에 남아 있는 과거 run을 저장소 문서로
이관한 색인입니다. 당시 임시 경로는 최종 evidence로 쓰지 않고, 필요하면 별도
보존 위치로 재분류해야 합니다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| v200 closeout readiness | VLM close-out readiness report, S15~S17 readiness, release metadata/docs static verifier 확인 | pass |
| v200 restart stability | build, inventory, VLM S00~S18, release metadata/docs/script inventory, auth, Ops/Client smoke, Rule UI, analysis/VA/runtime/WebRTC/SSE/WS/Event POST, diff check 확인 | pass |
| v200 restart 30분 최초 | 30분 predev 중 Rule/Profile UI 선택 검증에서 Chrome executable not found로 실패 | fail |
| v200 restart 30분 retry | Chrome path/Event POST schema/code comment policy 수정 후 30분 predev 재실행 PASS | pass |
| v200 in-app policy stability | 인앱 브라우저 직접 evidence 정책 변경 후 build/static/VLM/auth/basic/Ops/Client/rules/analysis/VA/metadata/Event POST/diff check 확인 | pass |
| v200 in-app policy 30분 | 30분 predev, 22회 iteration, queue mode, ports-clean, summary-report 확인 | pass |
| v200 in-app policy UI fulltest | `/setup`, `/login`, `/ops/*`, `/client/*`, `/ops/vlm`, role guard, responsive/theme, EventRecord dispatch 확인 | pass |
| v200 in-app policy 120분 | 120분 predev, 87회 iteration, main runtime idle, Event POST queue mode, ports-clean 확인 | pass |
| v200 publication | PR #19/#20, tag, GitHub Release, published metadata, branch deletion/next branch sync 확인 | pass |
| v200 signed tag verification | signed annotated tag, GitHub tag verification, published metadata, v2.1.0 sync 확인 | pass |
| v210 UI fulltest | v2.1.0 인앱 UI fulltest, route/action/responsive/theme, VLM opt-in, rule/source/client reflection 확인 | pass |
| v220 UI fulltest | v2.2.0 F02~F06 인앱 UI fulltest, auth/Ops/Client/request/invite, VLM containment, viewer redaction 확인 | pass |
| v230 S01 EventRecord matrix | `/ops/events` 12개 row와 10개 event type, occurrence matrix, VA dispatch/replay 확인 | pass |
| v230 S02 evidence consistency | 4대 테스트 evidence 정합성 gate와 release/manual/longrun separation 확인 | pass |
| v230 S03 UI renderer decomposition | UI renderer/module decomposition, build, static/screenshot/rule smoke, docs/inventory gate 확인 | pass |
| v230 S04 conditional field evidence | ONVIF/external TURN/WHEP field gate가 approved environment only인지 확인 | pass |
| v230 S05 VLM opt-in evidence | VLM opt-in default-off, local runtime loopback, cloud provider not-run, privacy guard 확인 | pass |
| v230 S06 backup/recovery lifecycle | backup restore dry-run과 evidence retention cleanup dry-run/apply/audit 확인 | pass |
| v230 S07 integrator conformance | integrator contract artifact, Event POST/WebRTC/SSE/WS runtime delivery smoke 확인 | pass |
| v240 S07 evidence inventory mapping | Event review/action/alert/client/rule review loop을 feature inventory/manual UI/release evidence row에 연결 | pass |
| v240 release 30분 | 30분 soak 실행. 120분/UI/field/publish는 별도 | pass |
| v240 release UI fulltest | UI 풀테스트 실행. 30분/120분/field/publish는 별도 | pass |
| v240 release 120분 | 120분 longrun 실행. UI 직접 조작과 field/publish는 별도 | pass |

## 토큰/시간 사용량 기록

테스트 결과와 토큰 사용량은 서로 다른 값입니다. 토큰 값이 없으면 `미집계`와 사유를
남깁니다.

| 버전/run | 테스트 영역 | token start | token end | token consumed | elapsed | source |
| --- | --- | ---: | ---: | ---: | --- | --- |
| v250 release stability/30분/UI | 안정화/30분/UI 풀테스트 | 미집계 | 미집계 | 미집계 | 81m 14s | combined v2.5.0 release-test goal elapsed, per-area token split not captured |
| v260 release stability/30분/UI | 안정화/30분/UI 풀테스트 | 미집계 | 미집계 | 미집계 | 86m 19s | combined v2.6.0 release-test goal elapsed, per-area token split not captured |
| v270 release stability | 안정화 테스트 | 미집계 | 미집계 | 미집계 | durationSec 616 | command summary/report; token snapshot unavailable |
| v270 release 30분 | 30분 soak | 미집계 | 미집계 | 미집계 | durationSec 2366 | command summary/report; token snapshot unavailable |
| v270 release 120분 | 120분 longrun | 미집계 | 미집계 | 미집계 | durationSec 7749 | command summary/report; token snapshot unavailable |
| v270 runtime console 120분 | 120분 runtime console | 미집계 | 미집계 | 미집계 | durationSec 7200 | command summary/report; token snapshot unavailable |
| v290 S00 local source-of-truth | 안정화 테스트 | 미집계 | 211,496 | 미집계 | goal snapshot 444s | Codex goal usage snapshot after S00 local gates; token start not captured |
| v290 S04 local records gate | 안정화 테스트 | 미집계 | 미집계 | 미집계 | command summaries only | S04 command-level elapsed/token split not captured; final goal snapshot에서 별도 보고 |
| v290 S05 UI criteria gate | 안정화 테스트 | 미집계 | 미집계 | 미집계 | command summaries only | S05 command-level elapsed/token split not captured; final goal snapshot에서 별도 보고 |
| v290 S06 release evidence hygiene | 안정화 테스트 | 미집계 | 미집계 | 미집계 | command summaries only | S06 command-level elapsed/token split not captured; final goal snapshot에서 별도 보고 |
| v290 S07 public docs/assets refresh | 안정화 테스트 | 미집계 | 미집계 | 미집계 | command summaries only | S07 command-level elapsed/token split not captured; final goal snapshot에서 별도 보고 |
| v290 S08 final stabilization run | 안정화 테스트 | 미집계 | 미집계 | 미집계 | command summaries only | S08 command-level elapsed/token split not captured; final goal snapshot에서 별도 보고 |
| v290 S09 owner release readiness | 안정화 테스트 | 미집계 | 미집계 | 미집계 | command summaries only | S09 command-level elapsed/token split not captured; final goal snapshot에서 별도 보고 |
| v290 release UI fulltest | UI 풀테스트 | 183,063 | 400,310 | 217,247 | goal snapshot delta 1284s | Codex goal usage snapshots bracketing in-app browser evidence plus one-shot wrapper output |
| v290 release 30분 soak | 30분 soak | 400,310 | 450,665 | 50,355 | durationSec 2363 | command summary plus Codex goal usage snapshots around the 30분 run |
| v290 release 120분 predev | 120분 longrun | 450,665 | 691,961 | 241,296 | durationSec 7773 | command summary plus Codex goal usage snapshots around the 120분 predev run |
| v290 release runtime console 120분 | 120분 runtime console | 691,961 | 882,689 | 190,728 | durationSec 7200 | command summary plus Codex goal usage snapshots around the runtime console run |
| v280 release local gates | 안정화 테스트 | 미집계 | 320,781 | 미집계 | goal snapshot 683s | Codex goal usage end snapshot; token start not captured |
| v280 release UI fulltest | UI 풀테스트 | 320,781 | 649,423 | 328,642 | goal snapshot delta 1216s | Codex goal usage snapshots plus in-app evidence and wrapper output |
| v300 S00 baseline alignment | 안정화 테스트 | 미집계 | 미집계 | 미집계 | command summaries only | V300-S00 command-level verification; token snapshot not captured in this document |
| v300 S01 Event Evidence Contract | 안정화 테스트 | 142,050 | 219,879 | 77,829 | goal snapshot delta 409s | Codex goal usage snapshots around S01 verifier/docs/inventory/script/build/diff gates |

## 임시 산출물 정리 기록

| 버전/run | 경로 | 종류 | 조치 | 삭제/보존 결과 |
| --- | --- | --- | --- | --- |
| v2.8.0 UI fulltest | `/tmp/media_server_v280_ui_fulltest_20260618_codex` | 인앱 evidence/screenshot 임시 디렉터리, 삭제 전 8.2MB | 이 문서로 결과 이관 후 삭제 | 삭제 완료. 삭제 후 경로 없음 확인 |
| v2.9.0 S00 local gates | 없음 | `./server.sh build`, release/docs/inventory verifier, `git diff --check` 실행 중 최종 evidence로 보존할 `/tmp`/`/private/tmp` summary, screenshot, report를 생성하지 않음 | 삭제 대상 없음 | 없음 |
| v2.9.0 S04 local records gate | 없음 | `verify-v290-release-test-records-enforcement`, inventory/docs/script verifier, build, `git diff --check` 실행 중 최종 evidence로 보존할 `/tmp`/`/private/tmp` summary, screenshot, report를 생성하지 않음 | 삭제 대상 없음 | 없음 |
| v2.9.0 S05 UI criteria gate | 없음 | `verify-v290-ui-fulltest-criteria-freeze`, `verify-manual-ui-evidence`, inventory/docs/script verifier, build, `git diff --check` 실행 중 최종 evidence로 보존할 `/tmp`/`/private/tmp` summary, screenshot, report를 생성하지 않음 | 삭제 대상 없음 | 없음 |
| v2.9.0 S06 release evidence hygiene | 없음 | `verify-v290-release-evidence-hygiene`, release evidence/index/inventory/docs/script verifier, build, `git diff --check` 실행 중 최종 evidence로 보존할 `/tmp`/`/private/tmp` summary, screenshot, report를 생성하지 않음 | 삭제 대상 없음 | 없음 |
| v2.9.0 S07 public docs/assets refresh | 없음 | `verify-v290-public-docs-assets-refresh`, docs UI assets, release metadata, docs links, inventory/docs/script verifier, build, `git diff --check` 실행 중 최종 evidence로 보존할 `/tmp`/`/private/tmp` summary, screenshot, report를 생성하지 않음. image recapture도 실행하지 않음 | 삭제 대상 없음 | 없음 |
| v2.9.0 S08 final stabilization run | `$TMPDIR/media_server_webrtc_va_metadata_summary_1781876018818.json` | S08 WebRTC VA metadata summary JSON, 삭제 전 4KB. Event POST/ICE/RTSP overlay verifier가 출력한 임시 summary 경로와 codec launcher log는 cleanup scan에서 S08 신규 보존 대상 없음으로 확인 | 결과 수치를 이 문서로 이관 후 삭제 | 삭제 완료. 삭제 후 `$TMPDIR/media_server_webrtc_va_metadata_summary_1781876018818.json` 없음 확인 |
| v2.9.0 S09 owner release readiness | 없음 | S09 local readiness/docs/inventory/evidence/closeout dry-run verifier 실행 중 최종 evidence로 보존할 `/tmp`/`/private/tmp` summary, screenshot, report를 생성하지 않음 | 삭제 대상 없음 | 없음 |
| v3.0.0 S00 baseline alignment | 없음 | `verify-v300-entry-baseline`, release/docs/inventory/script verifier, `./server.sh build`, `git diff --check` 실행 중 최종 evidence로 보존할 `/tmp`/`/private/tmp` summary, screenshot, report를 생성하지 않음. UI screenshot recapture도 실행하지 않음 | 삭제 대상 없음 | 없음 |
| v3.0.0 S01 Event Evidence Contract | 없음 | `verify-v300-event-evidence-contract`, inventory/docs/script verifier, `./server.sh build`, `git diff --check` 실행 중 최종 evidence로 보존할 `/tmp`/`/private/tmp` summary, screenshot, report를 생성하지 않음. UI screenshot recapture도 실행하지 않음 | 삭제 대상 없음 | 없음 |
| v2.9.0 release UI fulltest | `/tmp/media_server_v290_ui_fulltest_20260619_codex`, `/tmp/media_server_v290_ui_fulltest_wrapper_20260619_codex` | Codex 인앱 evidence/screenshot/auth throwaway seed와 one-shot wrapper summary/screenshots 임시 디렉터리, 삭제 전 11M와 256K | 결과 수치를 이 문서와 release evidence index로 이관 후 삭제 | 삭제 완료. 삭제 후 대상 경로 없음 확인 |
| v2.9.0 release 30분 soak | `/tmp/media_server_v290_release_30min_20260619_summary.json`, `/tmp/media_server_v290_release_30min_20260619_report.md`, `/tmp/media_server_v290_release_30min_20260619_report.html`, `/tmp/media_server_predev-1781879587-1100` | 30분 predev summary/report/html/work dir, 삭제 전 56K/244K/268K/604K | 결과 수치를 이 문서와 release evidence index로 이관 후 삭제 | 삭제 완료. 삭제 후 대상 경로 없음 확인 |
| v2.9.0 release 120분 predev | `/tmp/media_server_v290_release_120min_20260619_summary.json`, `/tmp/media_server_v290_release_120min_20260619_report.md`, `/tmp/media_server_v290_release_120min_20260619_report.html`, `/tmp/media_server_predev-1781882126-48487` | 120분 predev summary/report/html/work dir, 삭제 전 200K/372K/408K/2.3M | 결과 수치를 이 문서와 release evidence index로 이관 후 삭제 | 삭제 완료. 삭제 후 대상 경로 없음 확인 |
| v2.9.0 release runtime console 120분 | `/tmp/media_server_v290_runtime_console_120min_20260619`, `/tmp/media_server_v290_runtime_console_120min_20260619_summary.json`, `/tmp/media_server_v290_runtime_console_120min_20260619_report.md` | 120분 runtime console work dir/summary/report, 삭제 전 28K/592K/8K | 결과 수치를 이 문서와 release evidence index로 이관 후 삭제 | 삭제 완료. 삭제 후 대상 경로 없음 확인 |
| v2.9.0 release publication | `/tmp/media_server_pr37_guardrails_annotations.json`, `/tmp/media_server_pr37_static_gates_annotations.json`, `/tmp/media_server_pr37_annotations.json`, `/tmp/media_server_pr38_guardrails_annotations.json`, `/tmp/media_server_pr38_static_gates_annotations.json`, `/tmp/media_server_pr38_annotations.json`, `/tmp/media_server_v290_published_metadata_20260619_report.md`, `/tmp/media_server_v290_published_metadata_20260619_report.json` | PR #37/#38 Actions annotation JSON과 published metadata report/json, 삭제 전 4K/4K/4K/4K/4K/4K/8K/16K | 결과 수치를 이 문서와 release evidence index로 이관 후 삭제 | 삭제 완료. 삭제 후 대상 경로 없음 확인 |
| v2.8.0 UI wrapper | `/private/tmp/media_server_v280_ui_fulltest_wrapper_20260618_codex`, `/tmp/media_server_v280_ui_fulltest_wrapper_20260618_codex_rerun` | wrapper summary 임시 디렉터리, 삭제 전 240KB와 252KB | 이 문서로 결과 이관 후 삭제 | 삭제 완료. 삭제 후 경로 없음 확인 |
| v2.7.0 release reports | `/tmp/media_server_v270_release_*`, `/tmp/media_server_v270_ui_fulltest_20260616`, `/private/tmp/media_server_v270*` | 과거 release summary/report/work dir, UI dir 삭제 전 3.2MB, runtime work dir 삭제 전 1.4MB, publication/closeout 임시 파일 합계 164KB | 이 문서로 결과 이관 후 삭제 | 삭제 완료. 확인한 report/summary/html/work/UI/publication/closeout 경로 없음 |
| v2.6.0 release reports | `/tmp/media_server_v260_release_*`, `/tmp/media_server_v260_ui_fulltest_20260615`, `/private/tmp/media_server_v260*` | 과거 release summary/report/UI dir, UI dir 삭제 전 9.7MB, publication/closeout/seed/evidence 임시 파일 합계 284KB | 이 문서로 결과 이관 후 삭제 | 삭제 완료. 확인한 report/summary/html/UI/publication/closeout/seed/evidence 경로 없음 |
| v2.5.0 release reports | `/private/tmp/media_server_v250*` | 과거 release metadata/closeout/helper/verifier/UI 임시 파일과 디렉터리, 삭제 전 파일 합계 48KB와 0B 임시 디렉터리들 | 이 문서로 결과 이관 후 삭제 | 삭제 완료. 삭제 후 `media_server_v250*` 경로 없음 확인 |
