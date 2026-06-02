# Project Feature Test Inventory

이 문서는 현재 release 목표 `v2.0.0` 기준의 기능별 테스트 분류
source-of-truth입니다.

중요한 경계:

- 이 문서는 **테스트 실행 결과 문서가 아닙니다**.
- 이 문서는 **현재 테스트가 존재한다는 증거가 아닙니다**.
- 이 문서는 각 기능에 대해 `UI 필요 여부`, `테스트 필요 여부`, `테스트 영역`,
  `PASS 판정 기준`을 먼저 고정합니다.
- 실제 coverage는 별도 대조에서 `코드 로직`, `제품 UI`, `안정화`, `30분`,
  `120분`, `UI 풀테스트 evidence` 존재 여부를 확인해야 합니다.
- raw JSON/API-only 확인은 UI 풀테스트 evidence가 아닙니다.
- 실기기/외부 endpoint가 필요한 항목은 기본 안정화/30분/120분/UI 요구 목록에서
  제외하고 field smoke로만 판정합니다.

## Test Area Roles

| 영역 | 역할 | PASS evidence | 대체 불가 |
| --- | --- | --- | --- |
| 안정화 | build, static, API/schema, auth route, media path, verifier 중심의 선수 테스트 | 실제 명령, exit code 0, summary/report fail 0, 실패/skip 사유 | 30분/120분 장시간 PASS, UI 직접 조작 evidence |
| 30분 | 장기간 테스트 지시 시 기본 soak, 버전 로드맵 완료 후 soak | `verify-predev --soak-minutes 30` 또는 해당 long session report | 안정화, 120분, UI 풀테스트 |
| 120분 조건부 | 메모리 릭, 장시간 누수, runtime drift 감시 | 사용자 승인 후 120분 longrun report | 안정화, 30분, UI 풀테스트 |
| UI | 인앱 브라우저에서 직접 클릭/타이핑/선택/반응형/시각 품질/role guard 확인 | route, 계정/권한, viewport/theme, 직접 조작, screenshot/artifact, 재검수 결과 | 스크립트 smoke, raw JSON/API-only 확인 |
| 필드 별도 | 실기기/외부 endpoint가 있어야 성공 판정 가능한 항목 | 장비/endpoint/credential 조건을 명시한 field smoke 결과 | no-device/static verifier |

## Summary

| 항목 | 수 |
| --- | ---: |
| 전체 기능 항목 | 369 |
| UI 직접 필요 | 221 |
| UI 간접 필요 | 27 |
| UI 비대상 | 121 |
| 테스트 필요 | 369 |
| 안정화 대상 | 359 |
| UI 풀테스트 대상 | 238 |
| 30분 soak 대상 | 45 |
| 120분 조건부 대상 | 7 |
| 필드 별도 조건 포함 | 1 |

## Current Coverage Status

이 절은 inventory 문서 자체의 coverage 상태입니다. 실제 안정화 테스트,
30분 soak, 120분 longrun, UI 풀테스트를 실행했다는 뜻이 아닙니다. v2.0.0 release
close-out에서 실제 실행한 evidence는 [release-evidence-index.md](release-evidence-index.md),
[v200-test-record-2026-05-31.md](v200-test-record-2026-05-31.md),
[manual-ui-result-2026-06-01-v200-inapp-fulltest.md](manual-ui-result-2026-06-01-v200-inapp-fulltest.md)를
함께 보되, inventory 자체는 현재 release UI gate를 대체하지 않습니다.

| 항목 | 현재 상태 | 결론 |
| --- | --- | --- |
| 기능 ID 목록 | 369개 기능 ID를 `UI-*`, `AUTH-*`, `SRC-*`, `RULE-*`, `EVT-*`, `CLIENT-*`, `MEDIA-*`, `LAB-*`, `SAFE-*`로 분리 | 기준표 작성 완료 |
| 코드 로직 위치 | ID prefix별 owner source를 지정했지만, 각 행의 line-level 증적은 별도 대조 필요 | 실행 증거 아님 |
| 제품 UI 위치 | UI 필요/간접/비대상을 분리했지만, inventory 자체는 브라우저 직접 조작 evidence를 보관하지 않음 | inventory 단독으로 UI PASS 판정 불가 |
| 안정화 테스트 매핑 | verifier family를 ID prefix별로 지정 | 기준표 작성 완료 |
| 30분 테스트 매핑 | 30분 대상 기능을 media/session/runtime 중심으로 분리 | 기준표 작성 완료 |
| 120분 테스트 매핑 | memory leak/runtime drift 조건부 대상 7개 분리 | 기준표 작성 완료 |
| VA seed 데이터 | `test/fixtures/manual_ui_fulltest_va_seed_matrix.json`로 numeric ID/API payload 기준 full UI seed matrix를 고정 | 준비 기준일 뿐 실행 증거 아님 |
| UI 풀테스트 evidence | 기능 ID별 result template 기록란 추가. 실행 결과는 release evidence 문서에서 관리 | evidence 문서 없이 inventory만으로 UI PASS 판정 불가 |
| UI evidence runner | `./server.sh verify-manual-ui-evidence-runner`가 `media-server.manual-ui-evidence-input.v1` 입력을 받아 UI 대상 기능 ID별 PASS/FAIL report를 생성 | runner 입력 없이 inventory만으로 UI PASS 판정 불가. 누락된 UI 대상 기능 ID는 `FAIL`, 제외 항목은 판정표 밖 |
| UI fulltest one-shot wrapper | `./server.sh verify-ui-fulltest-one-shot`이 throwaway core/auth 서버와 UI verifier 묶음을 순차 실행 | 30분/120분 longrun은 실행하지 않으며, wrapper PASS만으로 장시간 안정화 PASS가 되지 않음 |
| Coverage gate | `./server.sh verify-feature-inventory-coverage`가 `media-server.feature-inventory-coverage.v1` report로 기능 ID별 verifier/UI evidence/longrun/field exclusion 연결을 점검 | `missing coverage target` 누락 ID는 release gate에서 FAIL |
| VLM route, control, action, runtime state, sidecar, privacy guard | V200-S14 기준으로 `/ops/vlm`, `/ops/events` VLM review, VLMObservation sidecar, summary/rule suggestion 후보, privacy/redaction/no-auto-apply 경계를 기능 ID 단위로 확장 | 실행 evidence가 아니며, 실제 UI 풀테스트와 장시간 안정화는 별도 단계에서 PASS/FAIL로 기록 |
| v2.0.0 pre-test update list | 안정화/30분/120분/UI 풀테스트 실행 전 V200-S00~S18 변경분을 아래 `v2.0.0 Pre-Test Update List`에 반영 | 테스트 실행 결과가 아니며, 실제 실행 전 누락 방지용 목록 |

브라우저 선택 기준: Codex 세션에서는 인앱 브라우저 evidence를 기본으로 하며, 자동
Chrome/CDP는 `MEDIA_SERVER_UI_BROWSER_MODE=chrome`과
`MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1`을 함께 지정한 명시 예외일 때만 사용합니다.
Codex 밖에서 사용자가 직접 실행하는 자동 검수는 Chrome/CDP를 사용할 수 있습니다.

## Owner Source Map

| ID prefix | 코드 로직 owner | 제품 UI owner | 대표 verifier family |
| --- | --- | --- | --- |
| `UI-*` | `src/ingress/webrtc_http_server.cpp`, `src/ingress/product_ui_page_scripts.cpp` | Auth/Ops/Client shell | `verify-auth-bootstrap`, `verify-auth-routes`, `verify-ops-client-ui`, `verify-ops-click-e2e`, `verify-ops-route-boundaries`, `verify-vlm-install-connection-ui`, `verify-vlm-profile-storage`, `verify-vlm-ops-event-review-ui`, `verify-vlm-privacy-transfer-guard` |
| `AUTH-*` | `src/ingress/http_auth.cpp`, `src/ingress/webrtc_http_server.cpp` | `/setup`, `/login`, `/password/change`, `/invite/setup`, `/ops/users` | `verify-auth-regression-matrix`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `verify-auth-ui-smoke`, `verify-auth-scope-picker`, `verify-ops-click-e2e` |
| `SRC-*` | `src/ingress/source_view_registry.cpp`, `src/core/source_factory.cpp`, `src/ingress/onvif_live_import.cpp` | `/ops/sources`, `/client/live`, `/client/dashboard` | `verify-ops-source-lifecycle`, `verify-ops-client-ui`, `verify-onvif-*`, `verify-ops-source-health-bulk` |
| `RULE-*` | `src/ingress/analysis_query.cpp`, `src/analysis/*scenario.cpp`, `src/analysis/event_rule_engine.cpp` | `/ops/rules`, `/client/live` overlay | `verify-rule-ui`, `verify-ops-rules-roundtrip`, `verify-ops-scenario-builder-ui`, `verify-ops-scenario-presets`, `verify-va-event-coverage-report`, `verify-va-replay`, `verify-analysis-state` |
| `EVT-*` | `src/analysis/event_manager.cpp`, `src/analysis/event_storage.cpp`, `src/ingress/webrtc_http_server.cpp` | `/ops/dashboard`, `/ops/events`, `/ops/home` | `verify-va-event-coverage-report`, `verify-va-events`, `verify-ops-event-review-inbox`, `verify-ops-event-records-scope`, `verify-ops-alert-delivery-integrations`, `verify-va-runtime-console`, `verify-vlm-event-evidence-extraction`, `verify-vlm-observation-sidecar`, `verify-vlm-event-explanation-hints`, `verify-vlm-ops-event-review-ui`, `verify-vlm-summary-search-candidates`, `verify-vlm-rule-suggestion-candidates` |
| `CLIENT-*` | `src/ingress/product_ui_page_scripts.cpp`, `src/ingress/webrtc_http_server.cpp`, `src/ingress/webrtc_egress_session.cpp` | `/client/live`, `/client/dashboard`, `/client/request-access` | `verify-client-live-workspace`, `verify-client-dashboard-polish`, `verify-client-source-dock-events`, `verify-client-tile-*`, `verify-ops-client-ui`, `verify-ops-click-e2e` |
| `MEDIA-*` | `src/core/session_manager.cpp`, `src/core/source_factory.cpp`, `src/core/stream_registry.cpp`, `src/ingress/webrtc_egress_session.cpp`, `src/ingress/rtsp_adapter.cpp` | `/client/live` only where video is visible | `verify-codecs`, `verify-webrtc-ice`, `verify-webrtc-va-metadata`, `verify-uri-source-longrun`, `verify-predev` |
| `LAB-*` | `src/ingress/analysis_query.cpp`, `src/ingress/webrtc_http_server.cpp`, `src/analysis/vlm_observation_store.cpp`, local detector/recommendation/evaluation scripts | 비대상 | `verify-analysis-state`, `verify-va-metadata-sidechannel`, `verify-ws-metadata`, `verify-image-analysis`, `verify-vlm-boundary`, `verify-vlm-selection-decision`, `verify-vlm-pc-capability`, `verify-vlm-recommendation-engine`, `verify-vlm-install-connection-dry-run`, `verify-vlm-profile-storage`, `verify-vlm-evaluation-harness`, `verify-vlm-observation-sidecar`, `verify-vlm-event-explanation-hints`, `verify-vlm-privacy-transfer-guard`, `verify-vlm-summary-search-candidates`, `verify-vlm-rule-suggestion-candidates` |
| `SAFE-*` | schema/payload/media/auth/UI test 경계 owner 전체 | route guard와 client 비노출 화면 | `verify-auth-routes`, `verify-ops-client-ui`, `verify-ui-blocking-dialog-policy`, `verify-integrator-contract-artifact`, `verify-webrtc-va-metadata`, `verify-ws-metadata`, `verify-event-post-*`, `verify-vlm-boundary`, `verify-vlm-install-connection-scope-gate`, `verify-vlm-profile-storage`, `verify-vlm-observation-sidecar`, `verify-vlm-privacy-transfer-guard`, `verify-vlm-summary-search-candidates`, `verify-vlm-rule-suggestion-candidates` |

## Verifier Coverage Map

| 기능 ID 범위 | 안정화 verifier 후보 | 비고 |
| --- | --- | --- |
| `UI-001`~`UI-018`, `UI-022`~`UI-032` | `verify-auth-bootstrap`, `verify-auth-routes`, `verify-ops-client-ui`, `verify-ops-route-boundaries`, `verify-vlm-install-connection-ui`, `verify-vlm-profile-storage`, `verify-vlm-ops-event-review-ui`, `verify-vlm-privacy-transfer-guard` | route/shell/404/VLM dry-run/profile/privacy/event review guard UI 경계 |
| `UI-019`~`UI-021` | Codex 인앱 브라우저 evidence, 인앱 브라우저 부재 외부 환경의 `verify-ops-client-ui --screenshots`, `verify-docs-ui-assets`, `verify-product-ui-token-drift` | 시각 품질은 수동 UI evidence 필요 |
| `AUTH-001`~`AUTH-042` | `verify-auth-regression-matrix`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `verify-auth-ui-smoke`, `verify-auth-scope-picker` | role/scope별 브라우저 증거는 별도 |
| `SRC-001`~`SRC-030` | `verify-ops-source-lifecycle`, `verify-ops-source-health-bulk`, `verify-ops-channel-bulk`, `verify-onvif-*`, `verify-ops-client-ui` | ONVIF field success는 제외 |
| `RULE-001`~`RULE-101` | `verify-rule-ui`, `verify-ops-rules-roundtrip`, `verify-ops-rule-validation-matrix`, `verify-ops-scenario-builder-ui`, `verify-ops-scenario-presets`, `verify-va-event-coverage-report`, `verify-va-replay`, `verify-analysis-state`, `verify-reid-advanced-tracking`, `verify-tracker-stability` | 실제 UI 이벤트 발생 전수 evidence 없음. 실제 UI 이벤트 발생 전수 evidence 없으면 FAIL |
| `EVT-001`~`EVT-034` | `verify-va-event-coverage-report`, `verify-va-events`, `verify-ops-event-review-inbox`, `verify-ops-event-records-scope`, `verify-ops-alert-delivery-integrations`, `verify-va-runtime-console`, `verify-vlm-event-evidence-extraction`, `verify-vlm-observation-sidecar`, `verify-vlm-event-explanation-hints`, `verify-vlm-ops-event-review-ui`, `verify-vlm-summary-search-candidates`, `verify-vlm-rule-suggestion-candidates` | event log 육안 확인은 UI 풀테스트 |
| `CLIENT-001`~`CLIENT-022` | `verify-client-live-workspace`, `verify-client-dashboard-polish`, `verify-client-source-dock-events`, `verify-client-tile-disconnect-contract`, `verify-client-tile-info-overlay-health`, `verify-ops-client-ui` | viewer 비노출은 브라우저 확인 필요 |
| `MEDIA-001`~`MEDIA-020` | `verify-codecs`, `verify-webrtc-ice`, `verify-webrtc-va-metadata`, `verify-uri-source-longrun`, `verify-predev` | 30분/120분은 실행 지시 필요 |
| `LAB-001`~`LAB-055` | `verify-analysis-state`, `verify-va-metadata-sidechannel`, `verify-ws-metadata`, `verify-image-analysis`, `verify-vlm-boundary`, `verify-vlm-selection-decision`, `verify-vlm-pc-capability`, `verify-vlm-recommendation-engine`, `verify-vlm-install-connection-dry-run`, `verify-vlm-profile-storage`, `verify-vlm-evaluation-harness`, `verify-vlm-observation-sidecar`, `verify-vlm-event-explanation-hints`, `verify-vlm-privacy-transfer-guard`, `verify-vlm-summary-search-candidates`, `verify-vlm-rule-suggestion-candidates` | 제품 UI 비대상 |
| `SAFE-001`~`SAFE-033` | `verify-integrator-contract-artifact`, `verify-auth-routes`, `verify-ops-client-ui`, `verify-ui-blocking-dialog-policy`, `verify-event-post-dispatch`, `verify-webrtc-va-metadata`, `verify-ws-metadata`, `verify-rtsp-va-overlay-policy`, `verify-vlm-boundary`, `verify-vlm-install-connection-scope-gate`, `verify-vlm-profile-storage`, `verify-vlm-observation-sidecar`, `verify-vlm-privacy-transfer-guard`, `verify-vlm-summary-search-candidates`, `verify-vlm-rule-suggestion-candidates` | schema/media/auth/UI automation 불변 조건 |

## VA Manual UI Seed Matrix

UI 풀테스트 데이터는 운영 데이터가 아니라 throwaway fixture로만 준비합니다.
최종 상태는 event log 육안 확인을 위해 삭제하지 않고 남겨야 하며, Rule CRUD와
Rule scenario/event 발생 검수는 분리합니다.

| 항목 | 기준 |
| --- | --- |
| fixture | `test/fixtures/manual_ui_fulltest_va_seed_matrix.json` |
| dry-run 준비 | `./server.sh prepare-manual-ui-fulltest-seed --dry-run`은 HTTP 요청 없이 numeric ID, payload 참조, media file 존재, coverage를 확인합니다. 이 결과는 UI/event evidence가 아닙니다. 상태 표기는 `dry-run 준비 가능, 서버 적용 evidence 없음`으로 남깁니다. |
| registry 파일 준비 | `./server.sh prepare-manual-ui-fulltest-seed --dry-run --emit-registry-dir <dir>`은 `sources.json`, `views.json`, `analysis.json`, `preconditions.json`을 같은 throwaway 디렉터리에 생성합니다. 이 결과도 UI/event evidence가 아닙니다. |
| apply 경계 | 실제 서버 적용은 사용자 지시 후 `--apply --confirm-throwaway-data --http-base <url>`로만 수행하며, 적용 후에도 인앱 브라우저 확인 전에는 UI PASS가 아닙니다. |
| ID 정책 | profile/rule/vaRule registry id는 numeric string만 사용하며 built-in profile `1`~`5`는 쓰지 않습니다. |
| 기본 event template | `presence`, `enter`, `exit`, `line-crossing:any`, `line-crossing:forward`, `line-crossing:reverse` |
| scenario template | `intrusion-dwell`, `re-entry`, `wrong-direction`, `intrusion-after-line-crossing`, `loitering`, `zone-occupancy` |
| scenario preset | `default`, `road`, `retail`, `park`, `indoor`, `lobby`, `platform`, `entrance`, `doorway`, `parking`, `elevator`, `custom` |
| tracker policy | `none/off`, `lite/off`, `kalman-lite/off`, `bytetrack/off`, `lite/assist`, `kalman-lite/assist`, `bytetrack/assist` |
| invalid policy | `tracker=none` + `reid=assist`는 저장 거부 또는 `reid=off` 정규화 |
| final state | profiles, event templates, VA rules가 모두 남아 있어야 하며 event log 확인 전 삭제하지 않음 |
| 제외 | OC-SORT, BoT-SORT, DeepSORT, Re-ID default-on, 실제 Re-ID model bundle은 v1.9.0 제품 UI seed가 아님 |

## 30-Minute And 120-Minute Mapping

| 영역 | 대상 기능 | 실행 기준 |
| --- | --- | --- |
| 30분 soak | `UI-015`, `SRC-002`~`SRC-005`, `SRC-012`, `SRC-024`, `RULE-035`~`RULE-037`, `RULE-039`, `RULE-099`, `EVT-001`~`EVT-003`, `EVT-006`, `EVT-024`, `EVT-026`, `CLIENT-002`~`CLIENT-005`, `CLIENT-019`, `CLIENT-021`, `MEDIA-001`~`MEDIA-004`, `MEDIA-008`~`MEDIA-013`, `MEDIA-016`~`MEDIA-020`, `LAB-015`, `LAB-016`, `LAB-020`, VLM queue/backpressure 또는 runtime cache 변경 시 `LAB-038`~`LAB-044`, `SAFE-032` | 사용자 장기간 테스트 지시, 버전 로드맵 완료, VLM queue/backpressure/runtime cache/media non-blocking 변경 후 `verify-predev --soak-minutes 30` 계열 |
| 120분 조건부 | `MEDIA-001`~`MEDIA-004`, `MEDIA-011`, `MEDIA-012`, `SAFE-014`, VLM memory/runtime cache 또는 queue drift 고위험 변경 시 `SAFE-032` | memory growth, runtime drift, fanout/media path 고위험 변경, VLM active RSS high-water 또는 queue cleanup drift 시 사용자에게 먼저 말하고 승인 후 실행 |
| 필드 별도 | `SRC-014` | ONVIF 실기기/endpoint/credential 준비 시 별도 field smoke |

## v2.0.0 Pre-Test Update List

이 절은 안정화/30분/120분/UI 풀테스트를 실제로 실행하기 전에 v2.0.0에서 늘어난
검수 대상을 누락하지 않기 위한 목록입니다. 아래 행은 테스트 실행 결과가 아니며,
`PASS` 증거로 쓰지 않습니다. 기존 기능 ID 표의 상세 PASS 기준은 그대로 유지하고,
여기서는 어떤 테스트 영역에 포함해야 하는지만 고정합니다.

| v2.0.0 변경 묶음 | 연결 기능 ID/문서 | 안정화 리스트 반영 | 30분 리스트 반영 | 120분 리스트 반영 | UI 풀테스트 리스트 반영 | 실행 전 기록 |
| --- | --- | --- | --- | --- | --- | --- |
| VLM 도입 경계, 모델 선택, PC capability, recommendation | `LAB-035`~`LAB-049`, `SAFE-025`~`SAFE-027`, [vlm-model-selection.md](./vlm-model-selection.md), [vlm-recommendation-engine.md](./vlm-recommendation-engine.md) | `verify-vlm-boundary`, `verify-vlm-selection-decision`, `verify-vlm-pc-capability`, `verify-vlm-recommendation-engine`, bundle/privacy guard | runtime/queue/cache/media 변경이 없으면 미실행 | high-risk signal 없으면 미실행 | UI 변경 없음. `/ops/vlm` 요약 copy가 바뀐 경우 `UI-025` 확인 | 모델/runtime download, provider credential, cloud call은 제외 또는 field smoke로 분리 |
| `/ops/vlm` install/profile/privacy controls | `UI-022`~`UI-031`, `LAB-037`, `LAB-038`, `LAB-050`, `LAB-051`, `SAFE-022`~`SAFE-024`, `SAFE-028`, `SAFE-033` | `verify-vlm-install-connection-ui`, `verify-vlm-install-connection-dry-run`, `verify-vlm-profile-storage`, `verify-vlm-privacy-transfer-guard`, auth/ops shell guard | queue/backpressure/runtime cache 변경이 있거나 release close-out에서 지시되면 포함 | provider retry/queue drift, active RSS high-water, memory ownership 변경 시 승인 후 포함 | `/ops/vlm` local/cloud dry-run, opt-in guard, profile save/activate/fallback/disable/delete, raw details 접힘 영역을 직접 조작 | 실제 provider 호출, credential 저장, model install은 실행 전 제외/미실행 사유 기록 |
| VLM evidence extraction, sidecar, event explanation, Ops review | `UI-032`, `EVT-027`~`EVT-031`, `LAB-039`~`LAB-042`, `LAB-052`, `LAB-053`, `SAFE-028`, `SAFE-029`, `SAFE-031` | `verify-vlm-evaluation-harness`, `verify-vlm-event-evidence-extraction`, `verify-vlm-observation-sidecar`, `verify-vlm-event-explanation-hints`, `verify-vlm-ops-event-review-ui`, Event POST/WebRTC/SSE/WS metadata guard | EventRecord storage/fanout 또는 runtime queue 변경 시 포함 | metadata fanout/media path 고위험 변경 시 승인 후 포함 | `/ops/events` VLM review detail, evidence availability, sidecar matching/missing state를 확인하고 `/client/live`, `/client/dashboard`, `/client/events` 비노출 확인 | raw prompt/response/source URL/credential/raw media 비저장과 schema/media path 불변 조건 기록 |
| VLM summary search 후보와 Rule 추천 보조 후보 | `EVT-032`, `EVT-033`, `LAB-043`~`LAB-055`, `SAFE-030` | `verify-vlm-summary-search-candidates`, `verify-vlm-rule-suggestion-candidates`, `verify-rule-ui` no-auto-apply guard | runtime queue/cache 또는 rule/event fanout 변경 시 포함 | high-risk rule/event fanout 변경 시 승인 후 포함 | 제품 검색 UI나 자동 적용 UI가 없어야 정상. `/ops/events` 후보 표시가 생기면 개별 UI 행으로 기록 | 후보 단계, 수동 저장 전 registry write 없음, 자동 적용 금지 기록 |
| VLM runtime disabled, missing-model, cloud-disabled, provider timeout | `EVT-034`, `SAFE-025`, `SAFE-027`, `SAFE-032`, [vlm-test-rehearsal.md](./vlm-test-rehearsal.md) | `verify-vlm-test-rehearsal`, side-effect verifier, media/metadata guard | queue/backpressure/timeout worker 또는 media non-blocking 변경 시 포함 | provider retry queue drift, active RSS high-water, cleanup drift 발생 시 승인 후 포함 | `/ops/vlm` missing-model/cloud-disabled/provider-timeout copy가 바뀌면 직접 확인 | missing model/provider disabled는 media path FAIL이 아니며 provider field smoke와 분리 |
| S15 간이 테스트 리허설 | [vlm-test-rehearsal.md](./vlm-test-rehearsal.md), `media-server.vlm-test-rehearsal-report.v1` | 안정화 실행 전 짧은 rehearsal 목록에 포함 | 미실행. 30분 PASS 대체 금지 | 미실행. 120분 PASS 대체 금지 | 미실행. UI PASS 대체 금지 | fixture-only 리허설이며 runtime/provider/UI/longrun evidence가 아님 |
| S16 기존 테스트 side effect 점검 | [development-backlog.md](./development-backlog.md) S16 evidence | build/auth/Ops/Client/Rule/VA/WebRTC/SSE/WS/Event POST/media path verifier를 안정화 선수 목록에 포함 | VLM 변경이 media/runtime에 닿았거나 release close-out에서 지시되면 포함 | schema/media path 고위험 회귀 신호가 있으면 승인 후 포함 | side-effect script PASS는 UI 직접 조작 PASS가 아님. UI 변경 route는 별도 클릭 대상 | verifier가 검사하지 않은 UI/장시간/provider 범위는 미확인으로 남김 |
| S17 안정화/장시간/UI 기준 | [vlm-stabilization-longrun-ui-criteria.md](./vlm-stabilization-longrun-ui-criteria.md) | `verify-runtime-media-longrun-trigger-matrix`, `verify-longrun-separation`, `verify-manual-ui-evidence`를 사전 목록에 포함 | trigger matrix상 필요 또는 버전 close-out 지시 시 포함 | RC/high-risk/user approval 시 포함 | VLM UI 변경이 있으면 `/ops/vlm`, `/ops/events`, client redaction route를 직접 확인 | 실행하지 않은 장시간/UI 항목은 `미실행`으로 기록 |
| S18 close-out readiness/evidence 분리 | [vlm-close-out-readiness.md](./vlm-close-out-readiness.md), [release-evidence-index.md](./release-evidence-index.md) | `verify-vlm-closeout-readiness`, `verify-release-evidence-index`, `verify-release-metadata`, docs/index guard를 목록에 포함 | 실제 실행 지시가 없으면 미실행으로 기록 | 실제 승인 없으면 미실행으로 기록 | 직접 브라우저 조작 없으면 UI 풀테스트 PASS로 쓰지 않음 | release tag, main merge, GitHub Release publish와 구분 |

## Longrun/UI Fail-Fast Preflight

30분, 120분, UI 풀테스트는 실패 후 재시작 비용이 크므로 아래 항목이 먼저
`PASS` 또는 명시 제외로 정리되지 않으면 시작하지 않습니다. 이 절은 긴 테스트를
실행했다는 증거가 아니라, 긴 테스트 시작 전 중단 기준입니다.

| preflight 항목 | 긴 테스트 전 확인 | 실패 시 처리 | 재시작 경계 |
| --- | --- | --- | --- |
| 기능/route 목록 freeze | `v2.0.0 Pre-Test Update List`, `UI-022`~`UI-032`, `/ops/vlm`, `/client/events`, client redaction route가 결과 템플릿에 있음 | 리스트/템플릿 수정 후 긴 테스트 시작 전 재검수 | 긴 테스트 미시작 상태이므로 30분/120분/UI 재시작 없음 |
| 짧은 VLM rehearsal | `verify-vlm-test-rehearsal`과 missing-model/cloud-disabled/invalid-output/queue-timeout fixture가 먼저 준비됨 | fixture 또는 harness 수정 후 short gate만 재확인 | rehearsal 실패는 30분/120분/UI PASS/FAIL로 기록하지 않음 |
| side-effect 선수 gate | build/auth/Ops/Client/Rule/VA/WebRTC/SSE/WS/Event POST/media path verifier 목록이 실행 계획에 있음 | 선수 gate 실패를 제품 회귀/환경 문제로 분리하고 긴 테스트 중단 | 선수 gate 실패 후에는 30분/120분/UI를 시작하지 않음 |
| throwaway fixture와 auth env | users/source/view/analysis/event/snapshot/clip 경로, auth test password env `SET/MISSING`, seed dry-run/registry dir가 결과 템플릿에 있음 | fixture/env 누락이면 긴 테스트 시작 전 중단 | env/fixture 누락은 120분 재시작 사유가 아니라 preflight 실패 |
| output artifact 보존 | summary/report/log/screenshot/evidence JSON output dir가 시작 전에 정해짐 | artifact 경로 누락이면 시작 전 중단 | 결과 파일만 누락된 경우 기존 raw evidence가 요구 범위를 증명하지 못하면 PASS 금지 |
| native/blocking dialog guard | `verify-product-ui-no-native-dialogs`, `verify-ui-blocking-dialog-policy`가 UI 전 선수로 계획됨 | native dialog가 남으면 UI 풀테스트 시작 전 수정 | dialog guard 실패는 UI 전체 재시작 전 early failure로 기록 |
| 30분 선행 조건 | 안정화 gate PASS, VLM queue/runtime/media 변경 여부, 제외/미실행 사유가 기록됨 | 안정화 실패 또는 범위 미정이면 30분 시작 금지 | 30분 실행 중 제품 runtime 수정이 있으면 같은 30분 범위 재실행 |
| 120분 선행 조건 | 30분 또는 해당 high-risk short gate PASS, 사용자 승인, RC/high-risk 사유, memory/runtime 측정 항목이 기록됨 | 승인/사유/측정 항목 누락이면 120분 시작 금지 | 문서/리포트 누락만으로는 120분 재실행하지 않고 retained artifact가 범위를 증명하는지 먼저 확인 |
| UI phase order | Auth/setup, route/nav, fixture seed, VLM redaction, VA EventRecord, responsive/theme 순서로 early failure를 앞에 둠 | 앞 phase 실패 시 뒤 phase로 진행하지 않음 | shared auth/session/registry/media 수정이면 영향 phase부터 재검수, 전체 PASS는 모든 기능 ID evidence가 있을 때만 |

## Classification Rules

| 값 | 의미 |
| --- | --- |
| UI 필요: 필요 | 제품 화면에서 사용자가 직접 조작하거나 확인해야 합니다. |
| UI 필요: 간접 | 별도 제품 화면은 아니지만 화면 상태, redirect, nav, scope, session 결과로 확인되어야 합니다. |
| UI 필요: 비대상 | 제품 UI를 만들면 안 되거나 API/정책/backend/계약 기능입니다. |
| 테스트 필요: 필요 | 해당 기능은 하나 이상의 테스트 영역에 반드시 들어갑니다. |
| PASS 기준 | 이 문서의 PASS 기준은 요구 조건입니다. 실제 PASS 보고는 실행 evidence가 있을 때만 가능합니다. |

## A. Screen And Route

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| UI-001 | `/` 진입 후 제품 시작 route로 이동 | 필요 | 필요 | 안정화, UI | auth/setup 상태별 redirect가 실제 route와 브라우저 화면에서 일치 |
| UI-002 | `/setup` 최초 관리자 설정 화면 | 필요 | 필요 | 안정화, UI | setup form 표시, weak/strong password flow 직접 확인 |
| UI-003 | `/login` 로그인 화면 | 필요 | 필요 | 안정화, UI | credential 입력 후 role landing 확인 |
| UI-004 | `/password/change` 비밀번호 변경 화면 | 필요 | 필요 | 안정화, UI | 사용자 지정 테스트 pw -> 임시 pw 변경 성공, 임시 pw 로그인, 즉시 원래 pw 재사용 거부, history count 기준 복원 후 최종 로그인 확인 |
| UI-005 | `/logout` 세션 종료 | 간접 | 필요 | 안정화, UI | logout action 후 세션 종료와 보호 route 재접근 차단 확인 |
| UI-006 | `/auth/whoami` 현재 세션 확인 | 간접 | 필요 | 안정화 | principal/schema가 role/scope와 일치 |
| UI-007 | `/invite/setup` 초대 기반 계정 설정 | 필요 | 필요 | 안정화, UI | invite setup 전후 login/client 접근 경계 확인 |
| UI-008 | `/client/request-access` 시청자 접근 요청 | 필요 | 필요 | 안정화, UI | request submit, pending copy, 승인 전 접근 차단 확인 |
| UI-009 | `/ops/home` 운영 Home | 필요 | 필요 | 안정화, UI | home summary/nav/status가 표시되고 overflow 없음 |
| UI-010 | `/ops/dashboard` 운영 Dashboard | 필요 | 필요 | 안정화, UI | filter/search/copy/refresh와 주요 panel 표시 확인 |
| UI-011 | `/ops/sources` 채널 / 소스 관리 | 필요 | 필요 | 안정화, UI | source/view CRUD와 validation을 직접 조작 |
| UI-012 | `/ops/rules` VA 룰 / 프로파일 / 이벤트 템플릿 관리 | 필요 | 필요 | 안정화, UI | rule/template/profile CRUD, validation, preview 확인 |
| UI-013 | `/ops/users` 사용자 관리 | 필요 | 필요 | 안정화, UI | user/invite/access request/role/scope flow 확인 |
| UI-014 | `/ops/events` 이벤트 진단 route | 필요 | 필요 | 안정화, UI | event filter/pagination/evidence action 확인 |
| UI-015 | `/client/live` 시청자 Live | 필요 | 필요 | 안정화, UI, 30분 | video viewport/control/status/overlay와 session 지속성 확인 |
| UI-016 | `/client/dashboard` 시청자 Dashboard | 필요 | 필요 | 안정화, UI | viewer scope 내 dashboard/filter/sort/copy 확인 |
| UI-017 | `/client/events` 시청자 이벤트 route | 필요 | 필요 | 안정화, UI | viewer scope 내 events 표시와 비노출 경계 확인 |
| UI-018 | `/lab`, `/lab/rules`, `/lab/import`, `/webrtc/test` 제품 UI 미제공 / 404 | 비대상 | 필요 | 안정화, UI | 이전 제품 UI route와 임의 route가 제품 UI로 열리지 않음 |
| UI-019 | light/dark theme-aware 공통 UI | 필요 | 필요 | UI | 주요 화면에서 contrast/token/상태 색상 일관성 확인 |
| UI-020 | desktop 반응형 화면 | 필요 | 필요 | UI | 1180px 이상에서 nav/table/form/video 겹침 없음 |
| UI-021 | mobile 반응형 화면 | 필요 | 필요 | UI | 320px/390px에서 text/control/video overflow 없음 |
| UI-022 | `/ops/vlm` VLM 설치/연결 준비 | 필요 | 필요 | 안정화, UI | Ops-only route에서 local/cloud dry-run 후보, cloud opt-in guard, 단일 선택 상태, 실행/저장 없음 boundary가 표시되고 viewer/client에는 노출되지 않음 |
| UI-023 | `/ops/vlm` VLM profile 저장 | 필요 | 필요 | 안정화, UI | 선택한 dry-run 후보를 profile ID, prompt profile, 평가 상태, 활성화/fallback/disable 상태와 함께 저장하고 저장 목록/삭제가 Ops-only로 동작 |
| UI-024 | `/ops/vlm` VLM Privacy/전송 guard | 필요 | 필요 | 안정화, UI | Cloud 후보에서 외부 전송 경고 확인과 provider logging/retention 검토가 profile 저장 전 guard로 표시되고, local 후보는 provider 전송 없음 상태로 표시 |
| UI-025 | `/ops/vlm` PC capability/recommendation 요약 | 필요 | 필요 | 안정화, UI | hardware class, runtime readiness, 추천/대안/비추천 사유가 Ops-only로 표시되고 자동 설치/호출/저장 action은 발생하지 않음 |
| UI-026 | `/ops/vlm` local model dry-run 후보 선택 | 필요 | 필요 | 안정화, UI | local 후보 선택 버튼이 단일 선택 상태를 반영하고 model download, runtime install, profile 저장 없이 dry-run 상태만 갱신 |
| UI-027 | `/ops/vlm` cloud connection dry-run 후보 선택 | 필요 | 필요 | 안정화, UI | cloud opt-in 전 후보가 disabled 상태이며 opt-in 확인 후에도 provider API 호출/credential 저장 없이 dry-run 선택만 반영 |
| UI-028 | `/ops/vlm` profile 활성화/fallback/disable control | 필요 | 필요 | 안정화, UI | profile row의 active/fallback/disabled 상태가 저장 목록과 상세 copy에 반영되고 VLM runtime 호출은 발생하지 않음 |
| UI-029 | `/ops/vlm` profile 삭제 action | 필요 | 필요 | 안정화, UI | 삭제 버튼이 Ops-only로 동작하고 삭제 후 목록에서 제거되며 EventRecord, sidecar, media path에는 영향 없음 |
| UI-030 | `/ops/vlm` evaluation/prompt profile 표시 | 필요 | 필요 | 안정화, UI | 평가 상태, prompt profile, language/JSON stability planning 값이 저장 profile에 표시되고 benchmark PASS로 과장하지 않음 |
| UI-031 | `/ops/vlm` raw details 접힘 영역 | 필요 | 필요 | 안정화, UI | dry-run/profile diagnostic JSON은 Ops debug details 안에만 접혀 있고 viewer/client 화면에는 노출되지 않음 |
| UI-032 | `/ops/events` VLM review detail control | 필요 | 필요 | 안정화, UI | VLM summary, explanation, false-positive hints, operator questions, evidence availability가 Ops event review 안에서만 열리고 client/viewer에는 노출되지 않음 |

## B. Auth, Account, Role, Scope

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| AUTH-001 | auth mode `auto` | 간접 | 필요 | 안정화 | users/admin 상태별 setup/login/role gate 결정 일치 |
| AUTH-002 | auth mode `off` 개발/검증 모드 | 비대상 | 필요 | 안정화 | dev principal만 허용되고 제품 기본값으로 문서화되지 않음 |
| AUTH-003 | auth mode `token` | 비대상 | 필요 | 안정화 | bearer principal과 scope guard가 계약대로 동작 |
| AUTH-004 | auth mode `session` | 간접 | 필요 | 안정화, UI | login cookie 기반 보호 route 접근/차단 확인 |
| AUTH-005 | users file 없음 또는 admin passwordHash 없음 시 setup 유도 | 필요 | 필요 | 안정화, UI | `/setup` redirect와 bootstrap 후 `/login` redirect 확인 |
| AUTH-006 | 기본 admin username `admin` | 필요 | 필요 | 안정화, UI | setup/login/user 화면에서 기본 admin 정책 일치 |
| AUTH-007 | passwordless admin login 금지 | 필요 | 필요 | 안정화, UI | 빈 password 또는 hash 없는 admin으로 login 불가 |
| AUTH-008 | password hash 저장 | 비대상 | 필요 | 안정화 | 평문/단순 hash 저장 없음 |
| AUTH-009 | password history 저장 | 비대상 | 필요 | 안정화 | reuse rejection에 필요한 history가 저장/검증됨 |
| AUTH-010 | token hash 저장 | 비대상 | 필요 | 안정화 | token 원문이 저장/API 응답에 노출되지 않음 |
| AUTH-011 | invite token hash 저장 | 비대상 | 필요 | 안정화 | invite token 원문 저장/API 노출 없음 |
| AUTH-012 | passwordHash API/UI 비노출 | 비대상 | 필요 | 안정화, UI | API 응답과 admin/user UI에 hash가 보이지 않음 |
| AUTH-013 | passwordHistory API/UI 비노출 | 비대상 | 필요 | 안정화, UI | API 응답과 admin/user UI에 history가 보이지 않음 |
| AUTH-014 | tokenHash API/UI 비노출 | 비대상 | 필요 | 안정화, UI | API 응답과 UI에 tokenHash가 보이지 않음 |
| AUTH-015 | invite tokenHash API/UI 비노출 | 비대상 | 필요 | 안정화, UI | invite list/detail에 hash가 보이지 않음 |
| AUTH-016 | session cookie 로그인 | 간접 | 필요 | 안정화, UI | cookie 세션으로 role landing과 logout이 동작 |
| AUTH-017 | 현재 사용자 whoami 조회 | 간접 | 필요 | 안정화 | username/role/scopes/view scope가 세션과 일치 |
| AUTH-018 | 사용자 생성 | 필요 | 필요 | 안정화, UI | `/ops/users`에서 create 성공과 validation 확인 |
| AUTH-019 | 사용자 수정 | 필요 | 필요 | 안정화, UI | role/scope/status 수정 후 목록/detail 반영 |
| AUTH-020 | 사용자 삭제 또는 비활성화 | 필요 | 필요 | 안정화, UI | disable/delete action 후 login/access 차단 |
| AUTH-021 | 사용자 활성화 | 필요 | 필요 | 안정화, UI | disabled user restore 후 의도된 접근 복구 |
| AUTH-022 | 사용자 비밀번호 초기화 | 필요 | 필요 | 안정화, UI | reset은 password history 우회가 아님을 확인하고, reset 성공 시 must-change/password flow와 session revoke 확인 |
| AUTH-023 | 마지막 admin 비활성화 방지 | 필요 | 필요 | 안정화, UI | 마지막 admin disable/role change가 거부 copy를 표시 |
| AUTH-024 | role: admin | 필요 | 필요 | 안정화, UI | ops/users/rules/sources 접근과 admin action 허용 |
| AUTH-025 | role: operator | 필요 | 필요 | 안정화, UI | ops 운영 범위 접근과 admin-only action 차단 |
| AUTH-026 | role: viewer | 필요 | 필요 | 안정화, UI | client만 접근, ops/lab 차단 |
| AUTH-027 | role: integrator | 필요 | 필요 | 안정화, UI | API/scope 중심 접근과 제품 UI 경계 확인 |
| AUTH-028 | scope: ops 읽기 | 간접 | 필요 | 안정화, UI | read-only route/API 허용, write action 차단 |
| AUTH-029 | scope: ops 쓰기 | 간접 | 필요 | 안정화, UI | permitted write action만 성공 |
| AUTH-030 | scope: client/view 접근 | 간접 | 필요 | 안정화, UI | assigned view만 client 화면에 표시 |
| AUTH-031 | scope: lab 읽기 | 비대상 | 필요 | 안정화 | lab API read guard가 scope와 일치 |
| AUTH-032 | scope: lab 쓰기 | 비대상 | 필요 | 안정화 | lab API write guard가 scope와 일치 |
| AUTH-033 | 초대 생성 | 필요 | 필요 | 안정화, UI | invite 생성 UI/API 성공, 원문 token 기록 금지 |
| AUTH-034 | 초대 수락 | 필요 | 필요 | 안정화, UI | invite setup 후 login/client 접근 확인 |
| AUTH-035 | 초대 만료/무효 처리 | 간접 | 필요 | 안정화, UI | expired/consumed token이 거부됨 |
| AUTH-036 | client 접근 요청 생성 | 필요 | 필요 | 안정화, UI | public request 제출 후 pending 상태 확인 |
| AUTH-037 | client 접근 요청 승인 | 필요 | 필요 | 안정화, UI | approve 후 invite/view scope 생성 확인 |
| AUTH-038 | client 접근 요청 거절 | 필요 | 필요 | 안정화, UI | reject 후 invite/session/view scope 미생성 확인 |
| AUTH-039 | 승인 전 client self-signup scope 미부여 | 간접 | 필요 | 안정화, UI | pending 상태에서 user/session/view 접근 없음 |
| AUTH-040 | route guard | 간접 | 필요 | 안정화, UI | role별 보호 route 접근/차단이 브라우저와 API에서 일치 |
| AUTH-041 | API 권한 guard | 비대상 | 필요 | 안정화 | unauthorized/forbidden status와 payload redaction 확인 |
| AUTH-042 | CORS / origin guard | 비대상 | 필요 | 안정화 | 허용되지 않은 origin이 차단됨 |

## C. Channel, Source, Published View

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| SRC-001 | file source 등록 | 필요 | 필요 | 안정화, UI | file source form save 후 목록/view에서 사용 가능 |
| SRC-002 | RTSP pull source 등록 | 필요 | 필요 | 안정화, UI, 30분 | RTSP URL 저장, health/session 지속성 확인 |
| SRC-003 | HTTP/HLS URI source 등록 | 필요 | 필요 | 안정화, UI, 30분 | URI 저장, 재생/health 상태 확인 |
| SRC-004 | external WHEP playback URL source 등록 | 필요 | 필요 | 안정화, UI, 30분 | WHEP URL 저장, client wrapper session 생성/삭제, WHEP source sample ready 확인 |
| SRC-005 | internal WHIP published source 등록 | 필요 | 필요 | 안정화, UI, 30분 | WHIP publish sourceId가 view/source registry에 반영 |
| SRC-006 | source 목록 조회 | 필요 | 필요 | 안정화, UI | 목록 row/count/status가 API와 일치 |
| SRC-007 | source 상세 조회 | 필요 | 필요 | 안정화, UI | detail panel/route가 source fields를 표시 |
| SRC-008 | source 생성 | 필요 | 필요 | 안정화, UI | create validation, 빈 채널 이름 거부, 성공 row 반영 |
| SRC-009 | source 수정 | 필요 | 필요 | 안정화, UI | edit save 후 변경 값 반영 |
| SRC-010 | source 삭제 | 필요 | 필요 | 안정화, UI | delete 후 목록/view 참조 정리 확인 |
| SRC-011 | source 활성/비활성 상태 | 필요 | 필요 | 안정화, UI | disabled source가 view/session/rule에서 차단됨 |
| SRC-012 | source health 조회 | 필요 | 필요 | 안정화, UI, 30분 | health status가 dashboard/list에 반영 |
| SRC-013 | source health bulk 조회 | 간접 | 필요 | 안정화 | bulk response schema와 status 집계 확인 |
| SRC-014 | ONVIF import draft | 필요 | 필요 | 안정화, UI, 필드 별도 | no-device 경계와 field smoke 조건을 분리 기록 |
| SRC-015 | channel bulk API | 비대상 | 필요 | 안정화 | 제품 `/ops/sources`에는 channel bulk UI가 없어야 정상이며, `/ops/api/channels/bulk` payload/schema/status/partial failure/rollback/retry 계약이 `verify-ops-channel-bulk`에서 통과 |
| SRC-016 | PublishedView 목록 조회 | 필요 | 필요 | 안정화, UI | view 목록/count/scope 표시 확인 |
| SRC-017 | PublishedView 생성 | 필요 | 필요 | 안정화, UI | create 후 client/viewer scope에서 선택 가능 |
| SRC-018 | PublishedView 수정 | 필요 | 필요 | 안정화, UI | source/rule/scope 변경 후 반영 |
| SRC-019 | PublishedView 삭제 | 필요 | 필요 | 안정화, UI | 삭제 후 client view와 session 접근 차단 |
| SRC-020 | PublishedView 활성/비활성 | 필요 | 필요 | 안정화, UI | inactive view가 client/rule/session에서 차단 |
| SRC-021 | View별 source 연결 | 필요 | 필요 | 안정화, UI | view-source mapping이 client live에 반영 |
| SRC-022 | View별 allowed rule list | 필요 | 필요 | 안정화, UI | PublishedView `allowedRuleIds`가 client list/detail API에 유지되고 허용 rule만 client session/metadata에 반영 |
| SRC-023 | View별 viewer 접근 범위 | 필요 | 필요 | 안정화, UI | viewer별 assigned view만 노출 |
| SRC-024 | View별 WebRTC client wrapper | 간접 | 필요 | 안정화, UI, 30분 | wrapper session 생성/종료와 media path 확인 |
| SRC-025 | View별 dashboard | 필요 | 필요 | 안정화, UI | view-scoped dashboard가 assigned data만 표시 |
| SRC-026 | View별 events | 필요 | 필요 | 안정화, UI | view-scoped events가 assigned data만 표시 |
| SRC-027 | View별 metadata | 간접 | 필요 | 안정화 | metadata endpoint/schema가 view scope와 일치 |
| SRC-028 | Client preview as admin 표시 | 필요 | 필요 | UI | admin client 화면에 preview 상태가 명확히 표시 |
| SRC-029 | viewer에게 source URL 비노출 | 필요 | 필요 | 안정화, UI | client 화면/API에 source URL이 보이지 않음 |
| SRC-030 | viewer에게 developer URL 비노출 | 필요 | 필요 | 안정화, UI | client 화면에 Developer URL이 보이지 않음 |

## D. Rule, Profile, Scenario, Tracker

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| RULE-001 | `/ops/rules` VA rule/channel analysis setting 목록 | 필요 | 필요 | 안정화, UI | list count/status/source/type/profile이 표시됨 |
| RULE-002 | `/ops/rules` event template 목록 | 필요 | 필요 | 안정화, UI | template 목록과 type/scenario summary 표시 |
| RULE-003 | `/ops/rules` analysis profile 목록 | 필요 | 필요 | 안정화, UI | profile 목록과 detector/FPS/tracking summary 표시 |
| RULE-004 | channel analysis setting 생성 | 필요 | 필요 | 안정화, UI | source/template/profile/geometry 선택 후 저장 성공 |
| RULE-005 | channel analysis setting 수정 | 필요 | 필요 | 안정화, UI | 변경 값 저장 후 list/detail 반영 |
| RULE-006 | channel analysis setting 삭제 | 필요 | 필요 | 안정화, UI | 삭제 후 allowed rule/session에서 제거 |
| RULE-007 | channel analysis setting 상세 보기 | 필요 | 필요 | 안정화, UI | detail에 source/template/profile/geometry/status 표시 |
| RULE-008 | channel analysis setting apply/active 상태 | 필요 | 필요 | 안정화, UI | active/inactive 전환과 적용 상태 반영 |
| RULE-009 | channel analysis setting source 선택 | 필요 | 필요 | 안정화, UI | source select와 validation 동작 |
| RULE-010 | channel analysis setting event template 연결 | 필요 | 필요 | 안정화, UI | template 선택과 저장 payload 반영 |
| RULE-011 | channel analysis setting analysis profile 연결 | 필요 | 필요 | 안정화, UI | profile 선택과 저장 payload 반영 |
| RULE-012 | channel analysis setting region geometry 설정 | 필요 | 필요 | 안정화, UI | polygon/region 값 입력/초기화/저장 |
| RULE-013 | channel analysis setting line geometry 설정 | 필요 | 필요 | 안정화, UI | line points/direction 입력/저장 |
| RULE-014 | channel analysis setting output URL 표시 | 필요 | 필요 | UI | output URL/copy 표시가 role 정책과 일치 |
| RULE-015 | channel analysis setting status 표시 | 필요 | 필요 | 안정화, UI | status badge/copy가 runtime/API와 일치 |
| RULE-016 | vaRule numeric id 자동 생성 | 필요 | 필요 | 안정화, UI | 사용자가 직접 id 입력하지 않고 다음 번호가 부여 |
| RULE-017 | vaRule id 직접 입력 방지 | 필요 | 필요 | 안정화, UI | id field가 노출/수정되지 않음 |
| RULE-018 | event template 생성 | 필요 | 필요 | 안정화, UI | basic/scenario template 생성 성공 |
| RULE-019 | event template 수정 | 필요 | 필요 | 안정화, UI | type/condition 변경 저장 후 반영 |
| RULE-020 | event template 삭제 | 필요 | 필요 | 안정화, UI | 삭제 후 참조 rule validation 확인 |
| RULE-021 | event template 상세 보기 | 필요 | 필요 | 안정화, UI | condition/geometry/cooldown summary 표시 |
| RULE-022 | analysis profile 생성 | 필요 | 필요 | 안정화, UI | detector/FPS/queue/input/tracker 설정 저장 |
| RULE-023 | analysis profile 수정 | 필요 | 필요 | 안정화, UI | profile field 변경 후 반영 |
| RULE-024 | analysis profile 삭제 | 필요 | 필요 | 안정화, UI | 삭제 후 참조 rule validation 확인 |
| RULE-025 | analysis profile 상세 보기 | 필요 | 필요 | 안정화, UI | detector/FPS/queue/tracker/Re-ID 표시 |
| RULE-026 | detector: YOLO/ONNX | 필요 | 필요 | 안정화, UI | detector 선택과 payload 저장 |
| RULE-027 | detector: dummy | 필요 | 필요 | 안정화, UI | dummy detector 선택과 payload 저장 |
| RULE-028 | profile FPS 설정 | 필요 | 필요 | 안정화, UI | numeric input validation과 저장 |
| RULE-029 | profile queue 설정 | 필요 | 필요 | 안정화, UI | queue input validation과 저장 |
| RULE-030 | profile confidence 설정 | 필요 | 필요 | 안정화, UI | confidence range validation과 저장 |
| RULE-031 | profile NMS 설정 | 필요 | 필요 | 안정화, UI | NMS range validation과 저장 |
| RULE-032 | profile input size 설정 | 필요 | 필요 | 안정화, UI | width/height validation과 저장 |
| RULE-033 | profile tracking category 표시 | 필요 | 필요 | UI | tracking category summary가 선택 값과 일치 |
| RULE-034 | tracker `none` | 필요 | 필요 | 안정화, UI | tracker none 저장과 Re-ID off 정책 확인 |
| RULE-035 | tracker `lite` | 필요 | 필요 | 안정화, UI, 30분 | lite 저장과 runtime 안정성 확인 |
| RULE-036 | tracker `kalman-lite` | 필요 | 필요 | 안정화, UI, 30분 | kalman-lite 저장과 runtime 안정성 확인 |
| RULE-037 | tracker `bytetrack` | 필요 | 필요 | 안정화, UI, 30분 | bytetrack 저장과 runtime 안정성 확인 |
| RULE-038 | Re-ID `off` | 필요 | 필요 | 안정화, UI | Re-ID off 저장과 metadata policy 확인 |
| RULE-039 | Re-ID `assist` | 필요 | 필요 | 안정화, UI, 30분 | assist 저장과 tracker 조합 정책 확인 |
| RULE-040 | `tracker=none`이면 Re-ID off 강제 또는 거부 | 필요 | 필요 | 안정화, UI | invalid 조합이 저장되지 않거나 off로 정규화 |
| RULE-041 | basic event: presence | 필요 | 필요 | 안정화, UI | template 생성과 최종 EventRecord `presence` 발생 이력 확인 |
| RULE-042 | basic event: enter | 필요 | 필요 | 안정화, UI | template 생성과 최종 EventRecord `enter` 발생 이력 확인 |
| RULE-043 | basic event: exit | 필요 | 필요 | 안정화, UI | template 생성과 최종 EventRecord `exit` 발생 이력 확인 |
| RULE-044 | basic event: line-crossing | 필요 | 필요 | 안정화, UI | line geometry/direction 저장과 최종 EventRecord `line-crossing` 발생 이력 확인 |
| RULE-045 | line direction: any | 필요 | 필요 | 안정화, UI | any direction 저장과 적용 확인 |
| RULE-046 | line direction: forward | 필요 | 필요 | 안정화, UI | forward 저장과 적용 확인 |
| RULE-047 | line direction: reverse | 필요 | 필요 | 안정화, UI | reverse 저장과 적용 확인 |
| RULE-048 | scenario: intrusion-dwell | 필요 | 필요 | 안정화, UI | scenario UI 저장과 최종 EventRecord `intrusion-dwell` 발생 이력 확인 |
| RULE-049 | scenario: re-entry | 필요 | 필요 | 안정화, UI | scenario UI 저장과 최종 EventRecord `re-entry` 발생 이력 확인 |
| RULE-050 | scenario: wrong-direction | 필요 | 필요 | 안정화, UI | scenario UI 저장과 최종 EventRecord `wrong-direction` 발생 이력 확인 |
| RULE-051 | scenario: intrusion-after-line-crossing | 필요 | 필요 | 안정화, UI | scenario UI 저장과 최종 EventRecord `intrusion-after-line-crossing` 발생 이력 확인 |
| RULE-052 | scenario: loitering | 필요 | 필요 | 안정화, UI | scenario UI 저장과 최종 EventRecord `loitering` 발생 이력 확인 |
| RULE-053 | scenario: zone-occupancy | 필요 | 필요 | 안정화, UI | scenario UI 저장과 최종 EventRecord `zone-occupancy` 발생 이력 확인 |
| RULE-054 | scenario preset: default | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-055 | scenario preset: road | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-056 | scenario preset: retail | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-057 | scenario preset: park | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-058 | scenario preset: indoor | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-059 | scenario preset: lobby | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-060 | scenario preset: platform | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-061 | scenario preset: entrance | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-062 | scenario preset: doorway | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-063 | scenario preset: parking | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-064 | scenario preset: elevator | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-065 | scenario preset: custom | 필요 | 필요 | 안정화, UI | custom value 입력과 저장 확인 |
| RULE-066 | intrusion-dwell zone 설정 | 필요 | 필요 | 안정화, UI | zone geometry 저장과 payload 반영 |
| RULE-067 | intrusion-dwell candidate time 설정 | 필요 | 필요 | 안정화, UI | candidateTime validation과 저장 |
| RULE-068 | intrusion-dwell dwell time 설정 | 필요 | 필요 | 안정화, UI | dwellTime validation과 저장 |
| RULE-069 | intrusion-dwell cooldown 설정 | 필요 | 필요 | 안정화, UI | cooldown validation과 저장 |
| RULE-070 | re-entry polygon zone 설정 | 필요 | 필요 | 안정화, UI | polygon zone 저장 |
| RULE-071 | re-entry window 설정 | 필요 | 필요 | 안정화, UI | reEntryWindow validation과 저장 |
| RULE-072 | re-entry cooldown 설정 | 필요 | 필요 | 안정화, UI | cooldown validation과 저장 |
| RULE-073 | wrong-direction line geometry 설정 | 필요 | 필요 | 안정화, UI | line geometry 저장 |
| RULE-074 | wrong-direction allowed direction 설정 | 필요 | 필요 | 안정화, UI | allowed direction에서 `any` 제외 정책 확인 |
| RULE-075 | wrong-direction cooldown 설정 | 필요 | 필요 | 안정화, UI | cooldown validation과 저장 |
| RULE-076 | intrusion-after-line-crossing trigger line 설정 | 필요 | 필요 | 안정화, UI | trigger line 저장 |
| RULE-077 | intrusion-after-line-crossing crossing direction 설정 | 필요 | 필요 | 안정화, UI | any/forward/reverse 저장 |
| RULE-078 | intrusion-after-line-crossing target zone 설정 | 필요 | 필요 | 안정화, UI | target zone 저장 |
| RULE-079 | intrusion-after-line-crossing max delay 설정 | 필요 | 필요 | 안정화, UI | maxDelayAfterCrossingMs validation과 저장 |
| RULE-080 | intrusion-after-line-crossing dwell 설정 | 필요 | 필요 | 안정화, UI | dwell validation과 저장 |
| RULE-081 | intrusion-after-line-crossing cooldown 설정 | 필요 | 필요 | 안정화, UI | cooldown validation과 저장 |
| RULE-082 | loitering target zone 설정 | 필요 | 필요 | 안정화, UI | target zone 저장 |
| RULE-083 | loitering min dwell 설정 | 필요 | 필요 | 안정화, UI | min dwell validation과 저장 |
| RULE-084 | loitering movement radius 설정 | 필요 | 필요 | 안정화, UI | radius validation과 저장 |
| RULE-085 | loitering trajectory points 설정 | 필요 | 필요 | 안정화, UI | min points validation과 저장 |
| RULE-086 | loitering cooldown 설정 | 필요 | 필요 | 안정화, UI | cooldown validation과 저장 |
| RULE-087 | loitering ground-plane 옵션 | 필요 | 필요 | 안정화, UI | `/ops/rules` loitering form의 ground-plane toggle이 표시되고 `scenario.useGroundPlaneMovementRadius` 저장/재조회에 반영 |
| RULE-088 | zone-occupancy target zone 설정 | 필요 | 필요 | 안정화, UI | target zone 저장 |
| RULE-089 | zone-occupancy threshold 설정 | 필요 | 필요 | 안정화, UI | threshold validation과 저장 |
| RULE-090 | zone-occupancy min dwell 설정 | 필요 | 필요 | 안정화, UI | min dwell validation과 저장 |
| RULE-091 | zone-occupancy cooldown 설정 | 필요 | 필요 | 안정화, UI | cooldown validation과 저장 |
| RULE-092 | duplicate id 검증 | 필요 | 필요 | 안정화, UI | `/ops/rules` validation panel이 VA rule/event template/profile 중복 ID를 표시하고, 서버 create API가 기존 event template/VA rule ID 재생성을 거부 |
| RULE-093 | missing template/profile 검증 | 필요 | 필요 | 안정화, UI | `/ops/rules` 저장 전 missing profile과 missing template을 각각 차단하고, 서버가 `analysis.profileId`/`templateStart.ruleId` missing reference 저장을 거부 |
| RULE-094 | inactive template/profile 검증 | 필요 | 필요 | 안정화, UI | `/ops/rules` 저장 전 inactive profile과 inactive template을 각각 차단하고, 서버가 inactive `analysis.profileId`/`templateStart.ruleId` 저장을 거부 |
| RULE-095 | source mismatch 검증 | 필요 | 필요 | 안정화, UI | `/ops/rules` validation matrix가 source mismatch를 표시하고, mismatched PublishedView `va-rule` session apply가 `vaRule source must match PublishedView source`로 거부 |
| RULE-096 | inactive channel/View 검증 | 필요 | 필요 | 안정화, UI | `/ops/rules` validation matrix가 inactive channel/view를 표시하고, inactive PublishedView와 inactive source의 `va-rule` session apply가 각각 404로 거부 |
| RULE-097 | client view 권한 없음 검증 | 필요 | 필요 | 안정화, UI | viewer가 권한 없는 rule/view를 보지 못함 |
| RULE-098 | va-rule not allowed 검증 | 필요 | 필요 | 안정화, UI | source는 일치하지만 PublishedView `allowedRuleIds` 밖인 VA rule이 `/ops/rules`에서 표시되고 client `va-rule` session이 `allowed vaRule is required for va-rule mode`로 거부 |
| RULE-099 | existing connection allowed rule 검증 | 간접 | 필요 | 안정화, 30분 | 연결 생성 후 PublishedView `allowedRuleIds`에서 해당 rule을 제거해도 기존 client session ICE/DELETE는 200으로 유지되고, 같은 rule의 신규 `va-rule` session은 `allowed vaRule is required for va-rule mode`로 거부 |
| RULE-100 | same channel/priority conflict 검증 | 필요 | 필요 | 안정화, UI | `/ops/rules` validation matrix가 `priority-conflict`를 표시하고, 같은 source+priority의 두 번째 VA rule 저장 API가 `vaRule priority conflicts with existing rule on same source`로 거부 |
| RULE-101 | class mismatch 검증 | 필요 | 필요 | 안정화, UI | `/ops/rules` 저장 전 검증이 profile/template class mismatch를 쓰기 없이 차단하고, 서버가 `analysis.classes`/profile classes가 template classes를 포함하지 않는 VA rule 저장을 각각 거부 |

## E. Runtime, Dashboard, Events

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| EVT-001 | ops runtime status 조회 | 필요 | 필요 | 안정화, UI, 30분 | runtime status가 dashboard/home에 반영되고 drift 없음 |
| EVT-002 | lab runtime status 조회 | 비대상 | 필요 | 안정화, 30분 | lab runtime API schema와 counters 확인 |
| EVT-003 | ops source health 표시 | 필요 | 필요 | 안정화, UI, 30분 | source health list/dashboard 표시가 상태와 일치 |
| EVT-004 | ops diagnostics log tail | 필요 | 필요 | 안정화, UI | log tail 표시와 redaction 확인 |
| EVT-005 | event post status | 간접 | 필요 | 안정화 | event POST status schema와 실패/성공 상태 확인 |
| EVT-006 | event storage status | 간접 | 필요 | 안정화, 30분 | storage status/counters 안정성 확인 |
| EVT-007 | event records 조회 | 필요 | 필요 | 안정화, UI | `/ops/events` rows/filter/pagination/archive 상태가 표시되고 최종 rule/scenario별 EventRecord 발생 이력과 대조됨 |
| EVT-008 | event records compact | 비대상 | 필요 | 안정화 | compaction command/API 결과와 artifact 확인 |
| EVT-009 | event records compaction 목록 | 비대상 | 필요 | 안정화 | compaction list schema 확인 |
| EVT-010 | event records compaction cleanup | 비대상 | 필요 | 안정화 | cleanup 정책과 삭제 결과 확인 |
| EVT-011 | event records compaction file 조회 | 비대상 | 필요 | 안정화 | file fetch와 redaction 확인 |
| EVT-012 | evidence bundle token 발급 | 비대상 | 필요 | 안정화 | signed/limited token 발급과 원문 노출 없음 |
| EVT-013 | evidence bundle 조회 | 비대상 | 필요 | 안정화 | bundle 다운로드/권한/만료 확인 |
| EVT-014 | evidence 조회 | 간접 | 필요 | 안정화 | evidence metadata/file access 정책 확인 |
| EVT-015 | evidence 삭제 | 비대상 | 필요 | 안정화 | retention/delete 정책 확인 |
| EVT-016 | ops events status | 필요 | 필요 | 안정화, UI | events status panel/API 일치 |
| EVT-017 | alert deliveries 조회 | 필요 | 필요 | 안정화, UI | `/ops/events` Alert Delivery list에서 검색/kind/status filter와 empty filter 상태를 표시 |
| EVT-018 | alert delivery test | 필요 | 필요 | 안정화, UI | `/ops/events` Alert Delivery에서 integration 저장 후 Fixture/test action을 클릭하면 최근 시도에 `delivered · fixture`가 표시되고 endpoint token은 redacted 상태로 유지 |
| EVT-019 | event review 목록 | 필요 | 필요 | 안정화, UI | review inbox list 표시 |
| EVT-020 | event review 상세 | 필요 | 필요 | 안정화, UI | review detail/status 표시 |
| EVT-021 | event review 상태 변경 | 필요 | 필요 | 안정화, UI | status change 저장과 audit 반영 |
| EVT-022 | audit log 조회 | 필요 | 필요 | 안정화, UI | audit list/filter/export 표시 |
| EVT-023 | dashboard event 요약 | 필요 | 필요 | 안정화, UI | event summary count/status 표시 |
| EVT-024 | dashboard runtime 요약 | 필요 | 필요 | 안정화, UI, 30분 | runtime summary가 장시간 drift 없이 유지 |
| EVT-025 | dashboard source/channel 요약 | 필요 | 필요 | 안정화, UI | source/channel summary count/status 표시 |
| EVT-026 | dashboard VA 상태 요약 | 필요 | 필요 | 안정화, UI, 30분 | VA status/tap/event summary 표시와 안정성 확인 |
| EVT-027 | VLM event evidence refs extraction | 비대상 | 필요 | 안정화 | EventRecord `metadata.vlmEvidenceRefs`가 snapshot, bbox crop, clip manifest, previous/event/next frame refs를 reference-only로 제공하고 raw media/source URL/credential 노출 없음 |
| EVT-028 | VLM Ops event review evidence panel | 필요 | 필요 | 안정화, UI | `/ops/events` review inbox가 EventRecord, snapshot/short clip evidence, VLM explanation, false-positive hints, operator questions를 Ops 전용으로 표시하고 viewer/client 비노출, Event POST/WebRTC/SSE/WS schema와 media path 불변 확인 |
| EVT-029 | VLM evidence availability runtime state | 비대상 | 필요 | 안정화 | EventRecord review item이 snapshot, bbox crop, clip, previous/event/next frame ref 존재 여부를 상태값으로 제공하되 raw media/source URL/credential은 노출하지 않음 |
| EVT-030 | VLMObservation sidecar correlation state | 필요 | 필요 | 안정화, UI | sidecar observation은 `eventId`로만 EventRecord와 상관되고 Ops review UI는 matching/missing 상태를 표시하며 EventRecord top-level schema는 변경하지 않음 |
| EVT-031 | VLM explanation/hint review state | 필요 | 필요 | 안정화, UI | summary, eventExplanation, falsePositiveHints, operatorReviewQuestions가 Ops review 상태에 표시되고 provider raw response/prompt는 표시하지 않음 |
| EVT-032 | VLM summary search candidate state | 비대상 | 필요 | 안정화 | summary search 후보는 sidecar summary와 EventRecord `eventId` correlation만 사용하고 제품 검색 UI, vector index, provider rerank는 만들지 않음 |
| EVT-033 | VLM rule suggestion candidate state | 비대상 | 필요 | 안정화 | line/intrusion/zone rule suggestion 후보는 manual review 상태로만 산출하고 rule/profile registry write와 auto-apply는 발생하지 않음 |
| EVT-034 | VLM runtime disabled/queue readiness state | 비대상 | 필요 | 안정화 | profile/recommendation 상태가 runtime disabled, missing model, queue not started를 명확히 표시하고 media path나 Event POST dispatch를 block하지 않음 |

## F. Client And Viewer

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| CLIENT-001 | viewer live view 목록 조회 | 필요 | 필요 | 안정화, UI | assigned view만 source tree에 표시 |
| CLIENT-002 | viewer live WebRTC session 생성 | 필요 | 필요 | 안정화, UI, 30분 | tile start 후 video/status/session 생성 확인 |
| CLIENT-003 | viewer live SDP answer 처리 | 간접 | 필요 | 안정화, 30분 | answer exchange와 session state 확인 |
| CLIENT-004 | viewer live ICE candidate 처리 | 간접 | 필요 | 안정화, 30분 | ICE candidate 처리와 media path 확인 |
| CLIENT-005 | viewer live session 종료 | 필요 | 필요 | 안정화, UI, 30분 | stop/reconnect/logout 후 session cleanup 확인 |
| CLIENT-006 | viewer dashboard 조회 | 필요 | 필요 | 안정화, UI | dashboard가 viewer scope 안의 data만 표시 |
| CLIENT-007 | viewer events 조회 | 필요 | 필요 | 안정화, UI | events가 viewer scope 안의 data만 표시 |
| CLIENT-008 | viewer metadata 조회 | 간접 | 필요 | 안정화 | metadata schema와 scope filtering 확인 |
| CLIENT-009 | live layout preference 저장 | 필요 | 필요 | 안정화, UI | grid/density/dock preference 저장 |
| CLIENT-010 | live layout preference 조회 | 필요 | 필요 | 안정화, UI | reload 후 preference 복원 |
| CLIENT-011 | viewer 권한 없는 view 숨김 | 필요 | 필요 | 안정화, UI | unassigned view가 목록/API/UI에 보이지 않음 |
| CLIENT-012 | viewer에게 Ops navigation 숨김 | 필요 | 필요 | 안정화, UI | client shell에 Ops nav 없음 |
| CLIENT-013 | viewer에게 Lab navigation 숨김 | 필요 | 필요 | 안정화, UI | client shell에 Lab nav 없음 |
| CLIENT-014 | viewer에게 raw JSON 비노출 | 필요 | 필요 | 안정화, UI | raw JSON/debug details가 client에 보이지 않음 |
| CLIENT-015 | viewer에게 debugCounters 비노출 | 필요 | 필요 | 안정화, UI | debug counters가 client에 보이지 않음 |
| CLIENT-016 | viewer에게 BBox diagnostics 비노출 | 필요 | 필요 | 안정화, UI | bbox diagnostics가 client에 보이지 않음 |
| CLIENT-017 | viewer에게 rule/profile editor 비노출 | 필요 | 필요 | 안정화, UI | editor controls가 client에 보이지 않음 |
| CLIENT-018 | admin client preview 표시 | 필요 | 필요 | UI | admin preview banner/state 표시 |
| CLIENT-019 | video viewport 표시 | 필요 | 필요 | UI, 30분 | video viewport가 재생되고 잘리지 않음 |
| CLIENT-020 | video control 표시 | 필요 | 필요 | UI | start/stop/reconnect/control 조작 확인 |
| CLIENT-021 | VA overlay 표시 | 필요 | 필요 | 안정화, UI, 30분 | overlay toggle/status/metadata 일치 |
| CLIENT-022 | status/caption 표시 | 필요 | 필요 | UI | caption/status가 viewport를 가리지 않고 표시 |

## G. Media And Streaming

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| MEDIA-001 | RTSP egress | 비대상 | 필요 | 안정화, 30분, 120분 조건부 | RTSP playback/session이 안정적으로 유지 |
| MEDIA-002 | generic WebRTC session | 비대상 | 필요 | 안정화, 30분, 120분 조건부 | generic session SDP/ICE/delete 계약 유지 |
| MEDIA-003 | WHEP session | 비대상 | 필요 | 안정화, 30분, 120분 조건부 | WHEP offer/answer/session lifecycle 유지 |
| MEDIA-004 | WHIP publish session | 비대상 | 필요 | 안정화, 30분, 120분 조건부 | WHIP publish/source registry lifecycle 유지 |
| MEDIA-005 | WebRTC SDP offer 생성 | 비대상 | 필요 | 안정화 | offer response schema와 codec/ICE 정보 확인 |
| MEDIA-006 | WebRTC SDP answer 수신 | 비대상 | 필요 | 안정화 | answer 처리와 session state 확인 |
| MEDIA-007 | WebRTC ICE candidate 수신 | 비대상 | 필요 | 안정화 | candidate 처리와 invalid payload guard 확인 |
| MEDIA-008 | WebRTC session 삭제 | 비대상 | 필요 | 안정화, 30분 | delete 후 cleanup/counter 감소 확인 |
| MEDIA-009 | WHIP published source registry | 간접 | 필요 | 안정화, 30분 | publish source가 registry/view에 반영되고 cleanup됨 |
| MEDIA-010 | external WHEP playback source | 간접 | 필요 | 안정화, 30분 | WHEP source registry와 session wrapper 확인 |
| MEDIA-011 | shared stream reuse | 비대상 | 필요 | 안정화, 30분, 120분 조건부 | 다중 session이 source worker를 재사용 |
| MEDIA-012 | source worker lifecycle | 비대상 | 필요 | 안정화, 30분, 120분 조건부 | start/stop/reconnect 후 worker leak 없음 |
| MEDIA-013 | stream registry | 비대상 | 필요 | 안정화, 30분 | registry add/remove/counter 일치 |
| MEDIA-014 | RTSP TCP 강제 옵션 | 비대상 | 필요 | 안정화 | TCP 옵션 적용과 기존 path 유지 |
| MEDIA-015 | codec capability | 비대상 | 필요 | 안정화 | codec capability response와 negotiation 유지 |
| MEDIA-016 | H.264 sample playback | 필요 | 필요 | 안정화, UI, 30분 | sample 영상 표시. 단, 모든 VA 이벤트 검증으로 쓰지 않음 |
| MEDIA-017 | multi-channel playback | 필요 | 필요 | 안정화, UI, 30분 | 여러 tile/channel 동시 재생과 layout 안정성 확인 |
| MEDIA-018 | media path와 metadata path 분리 | 비대상 | 필요 | 안정화, 30분 | metadata 실패가 media path를 막지 않음 |
| MEDIA-019 | DataChannel metadata 송신 | 간접 | 필요 | 안정화, 30분 | metadata schema와 delivery 확인 |
| MEDIA-020 | WebRTC media 실패와 DataChannel 실패 분리 | 비대상 | 필요 | 안정화, 30분 | 한 경로 실패가 다른 경로 실패로 전파되지 않음 |

## H. Lab, Development API, Metadata

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| LAB-001 | `/lab/analysis/capabilities` 조회 | 비대상 | 필요 | 안정화 | capabilities schema 확인 |
| LAB-002 | lab analysis profile 목록 | 비대상 | 필요 | 안정화 | profile list schema 확인 |
| LAB-003 | lab analysis profile 생성 | 비대상 | 필요 | 안정화 | create API schema/validation 확인 |
| LAB-004 | lab analysis profile 수정 | 비대상 | 필요 | 안정화 | update API schema/validation 확인 |
| LAB-005 | lab analysis profile 삭제 | 비대상 | 필요 | 안정화 | delete API와 reference cleanup 확인 |
| LAB-006 | lab analysis rule 목록 | 비대상 | 필요 | 안정화 | rule list schema 확인 |
| LAB-007 | lab analysis rule 생성 | 비대상 | 필요 | 안정화 | create API schema/validation 확인 |
| LAB-008 | lab analysis rule 수정 | 비대상 | 필요 | 안정화 | update API schema/validation 확인 |
| LAB-009 | lab analysis rule 삭제 | 비대상 | 필요 | 안정화 | delete API와 reference cleanup 확인 |
| LAB-010 | lab va-rule 목록 | 비대상 | 필요 | 안정화 | va-rule list schema 확인 |
| LAB-011 | lab va-rule 생성 | 비대상 | 필요 | 안정화 | create API schema/validation 확인 |
| LAB-012 | lab va-rule 수정 | 비대상 | 필요 | 안정화 | update API schema/validation 확인 |
| LAB-013 | lab va-rule 삭제 | 비대상 | 필요 | 안정화 | delete API와 reference cleanup 확인 |
| LAB-014 | analysis image endpoint | 비대상 | 필요 | 안정화 | image endpoint response/redaction 확인 |
| LAB-015 | metadata stream | 비대상 | 필요 | 안정화, 30분 | SSE metadata stream schema와 지속성 확인 |
| LAB-016 | WS VA metadata `/ws/va-metadata` | 비대상 | 필요 | 안정화, 30분 | WS schema와 지속성 확인 |
| LAB-017 | analysis tap 목록 | 비대상 | 필요 | 안정화 | tap list schema 확인 |
| LAB-018 | analysis tap 생성 | 비대상 | 필요 | 안정화 | tap create API와 source/rule 연결 확인 |
| LAB-019 | analysis tap 삭제 | 비대상 | 필요 | 안정화 | tap cleanup 확인 |
| LAB-020 | tap metadata stream | 비대상 | 필요 | 안정화, 30분 | tap stream schema와 지속성 확인 |
| LAB-021 | tap metadata endpoint | 비대상 | 필요 | 안정화 | tap metadata schema 확인 |
| LAB-022 | tap bbox diagnostics | 비대상 | 필요 | 안정화 | diagnostics schema와 redaction 확인 |
| LAB-023 | tap state dump | 비대상 | 필요 | 안정화 | state dump schema와 redaction 확인 |
| LAB-024 | tap metrics dump | 비대상 | 필요 | 안정화 | metrics schema 확인 |
| LAB-025 | tap events | 비대상 | 필요 | 안정화 | tap event list/schema 확인 |
| LAB-026 | tap snapshot jpg | 비대상 | 필요 | 안정화 | jpg response/content-type 확인 |
| LAB-027 | tap overlay jpg | 비대상 | 필요 | 안정화 | overlay response/content-type 확인 |
| LAB-028 | global metadata endpoint | 비대상 | 필요 | 안정화 | global metadata schema 확인 |
| LAB-029 | global bbox diagnostics | 비대상 | 필요 | 안정화 | diagnostics schema와 redaction 확인 |
| LAB-030 | global state dump | 비대상 | 필요 | 안정화 | state schema와 redaction 확인 |
| LAB-031 | global metrics dump | 비대상 | 필요 | 안정화 | metrics schema 확인 |
| LAB-032 | lab files 조회 | 비대상 | 필요 | 안정화 | lab files listing schema 확인 |
| LAB-033 | lab reports 조회 | 비대상 | 필요 | 안정화 | report list schema 확인 |
| LAB-034 | lab report content 조회 | 비대상 | 필요 | 안정화 | report content fetch와 path guard 확인 |
| LAB-035 | VLM PC capability detector | 비대상 | 필요 | 안정화 | `media-server.vlm-pc-capability.v1` schema, macOS/Linux fixture, missing-tool fixture, no recommendation/install/runtime-call boundary, loopback-only probe 확인 |
| LAB-036 | VLM recommendation engine | 비대상 | 필요 | 안정화 | `media-server.vlm-recommendation.v1` schema, low/standard/high/unsupported fixture, local-only/cloud-disabled/cloud-allowed policy, recommendation/alternative/not-recommended/resource estimate, no install/profile/runtime-call/sidecar boundary 확인 |
| LAB-037 | VLM install/connection dry-run contract | 비대상 | 필요 | 안정화 | `media-server.vlm-install-connection-dry-run.v1` schema, local/cloud/unsupported/missing-runtime/cloud-opt-in fixture, dry-run-only side-effect false invariant, no profile/runtime-call/sidecar/cloud-provider-call boundary 확인 |
| LAB-038 | VLM profile storage API contract | 비대상 | 필요 | 안정화 | `media-server.vlm-profile.v1` schema, `/ops/api/vlm/profiles` CRUD, invalid profile fixture, provider/model/runtime/prompt/evaluation/activation/runtimeContract validation, no runtime-call/sidecar/schema/media path boundary 확인 |
| LAB-039 | VLM evaluation harness fixture report | 비대상 | 필요 | 안정화 | `media-server.vlm-evaluation-report.v1` schema, event frame/bbox crop/previous-next frame refs, prompt profile A/B, latency/explanation/hallucination/JSON/한국어/영어 scoring, fixture-only no runtime/provider/sidecar/schema/media path boundary 확인 |
| LAB-040 | VLMObservation sidecar storage | 비대상 | 필요 | 안정화 | `media-server.vlm-observation.v1` schema, 별도 JSONL 저장, EventRecord `eventId` correlation report, raw prompt/response/source URL/credential/raw media 비저장, Event POST/WebRTC/SSE/WS schema와 RTSP/WebRTC media path 불변 확인 |
| LAB-041 | VLM event explanation and false-positive hints | 비대상 | 필요 | 안정화 | `media-server.vlm-event-explanation-report.v1` schema, 사람/차량/영역 관계 설명, `falsePositiveHints`, `operatorReviewQuestions`, byte-stable JSON, runtime/provider/client/schema/media path/auto-rule boundary 확인 |
| LAB-042 | VLM privacy transfer guard contract | 비대상 | 필요 | 안정화 | `media-server.vlm-privacy-transfer-guard.v1` schema, local/cloud fixture, external transfer warning, provider logging/retention review, credential/prompt/raw response/source URL/raw frame bytes 비저장 확인 |
| LAB-043 | VLM summary search candidates | 비대상 | 필요 | 안정화 | `media-server.vlm-summary-search-candidates.v1` schema, sidecar summary token 후보, EventRecord `eventId` correlation, excluded candidate/reason, no runtime/provider/client/schema/media path/auto-rule boundary 확인 |
| LAB-044 | VLM Rule suggestion candidates | 비대상 | 필요 | 안정화 | `media-server.vlm-rule-suggestion-candidates.v1` schema, line/intrusion/zone 수동 저장 후보, EventRecord `eventId` correlation, rejected auto-apply candidate, no runtime/provider/client/schema/media path/rule registry write boundary 확인 |
| LAB-045 | VLM boundary contract gate | 비대상 | 필요 | 안정화 | `verify-vlm-boundary`가 VLM을 YOLO 대체가 아닌 이벤트 해석 보조 계층으로 고정하고 Event POST/WebRTC/SSE/WS/media path 불변 조건을 확인 |
| LAB-046 | VLM model selection decision fixture | 비대상 | 필요 | 안정화 | `media-server.vlm-selection-decision.v1`이 1차 local standard, low-spec fallback, cloud opt-in fallback, 제외/조건부 후보와 license/provenance/privacy 판정을 보존 |
| LAB-047 | VLM model artifact/bundle exclusion | 비대상 | 필요 | 안정화 | model weight, runtime package, credential, download token이 repo/release/bundle/container image에 포함되지 않음을 selection/bundle gate가 확인 |
| LAB-048 | VLM PC capability hardware-class matrix | 비대상 | 필요 | 안정화 | Apple Silicon, Linux NVIDIA, CPU-only, missing runtime case가 hardware class만 산출하고 추천/설치/profile/runtime/sidecar 결과를 만들지 않음 |
| LAB-049 | VLM recommendation privacy-mode matrix | 비대상 | 필요 | 안정화 | local-only, cloud-disabled, cloud-allowed별 추천/대안/비추천/resource estimate가 산출되고 cloud 후보는 opt-in 전 실행 가능 상태가 아님 |
| LAB-050 | VLM install dry-run disabled-option matrix | 비대상 | 필요 | 안정화 | unsupported, missing-runtime, cloud-opt-in-required 후보가 disabled reason을 보존하고 install/profile/runtime/provider call side effect를 만들지 않음 |
| LAB-051 | VLM profile invalid-case matrix | 비대상 | 필요 | 안정화 | provider/model/runtime/prompt/evaluation/activation/privacyGuard/runtimeContract invalid profile이 저장 전 거부되고 credential/prompt/raw response/source URL 저장 없음 |
| LAB-052 | VLM evaluation scoring-axis matrix | 비대상 | 필요 | 안정화 | latency, explanation quality, hallucination, JSON stability, Korean/English scoring 축이 fixture report에 분리되고 실제 benchmark PASS로 보고하지 않음 |
| LAB-053 | VLM sidecar JSONL redaction invariant | 비대상 | 필요 | 안정화 | observation JSONL에는 raw prompt, raw provider response, credential, source URL, raw frame bytes가 저장되지 않고 별도 sidecar scope만 유지 |
| LAB-054 | VLM summary search query builder | 비대상 | 필요 | 안정화 | sidecar summary token 후보가 queryTerms, matchedTerms, matchScore, eventId correlation을 산출하되 제품 검색 UI나 external rerank를 만들지 않음 |
| LAB-055 | VLM rule suggestion no-auto-apply builder | 비대상 | 필요 | 안정화 | rule suggestion 후보가 manualSaveRoute와 autoApply=false를 고정하고 `/ops/rules` 수동 저장 전 registry write를 수행하지 않음 |

## I. Safety, Boundary, Invariant Contract

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| SAFE-001 | Event POST payload schema 유지 | 비대상 | 필요 | 안정화 | payload field/type 호환과 freeze baseline SHA-256 유지 |
| SAFE-002 | WebRTC DataChannel schema 유지 | 비대상 | 필요 | 안정화 | 기존 client metadata consumer 호환과 freeze baseline 유지 |
| SAFE-003 | SSE metadata schema 유지 | 비대상 | 필요 | 안정화 | SSE event/schema 호환과 freeze baseline 유지 |
| SAFE-004 | WS metadata schema 유지 | 비대상 | 필요 | 안정화 | WS payload/schema 호환과 freeze baseline 유지 |
| SAFE-005 | 기존 Intrusion event type 유지 | 비대상 | 필요 | 안정화 | existing event type string 유지 |
| SAFE-006 | 기존 LineCrossing event type 유지 | 비대상 | 필요 | 안정화 | existing event type string 유지 |
| SAFE-007 | scenario 판단 로직 유지 | 비대상 | 필요 | 안정화 | replay/scenario fixture 결과 유지 |
| SAFE-008 | RTSP media path 유지 | 비대상 | 필요 | 안정화, 30분 | RTSP playback path 회귀 없음 |
| SAFE-009 | WebRTC media path 유지 | 비대상 | 필요 | 안정화, 30분 | WebRTC playback path 회귀 없음 |
| SAFE-010 | SourceRegistry API 계약 유지 | 비대상 | 필요 | 안정화 | registry schema/semantics 호환과 freeze baseline 유지 |
| SAFE-011 | PublishedView API 계약 유지 | 비대상 | 필요 | 안정화 | view schema/semantics 호환과 freeze baseline 유지 |
| SAFE-012 | Rule/Profile 저장 payload 계약 유지 | 비대상 | 필요 | 안정화 | 저장 payload/schema 호환과 freeze baseline 유지 |
| SAFE-013 | `vaRule=<id>` 호출 정책 유지 | 비대상 | 필요 | 안정화 | allowed rule/session policy 유지 |
| SAFE-014 | media pipeline non-blocking 정책 | 비대상 | 필요 | 안정화, 30분, 120분 조건부 | VA/metadata 실패가 media path를 막지 않음 |
| SAFE-015 | lab 개발 UI 제품 화면 embed 금지 | 필요 | 필요 | 안정화, UI | ops/client 제품 화면에 lab editor가 없음 |
| SAFE-016 | undefined route 404 처리 | 간접 | 필요 | 안정화, UI | 정의하지 않은 route가 404 처리됨 |
| SAFE-017 | 구 `/lab` 제품 UI route 404 처리 | 간접 | 필요 | 안정화, UI | `/lab` 구 UI route가 제품 UI로 열리지 않음 |
| SAFE-018 | client/viewer debug 정보 비노출 | 필요 | 필요 | 안정화, UI | client 화면/API에 debug/source/raw 정보 없음 |
| SAFE-019 | auth material 비노출 | 필요 | 필요 | 안정화, UI | password/token/session material이 artifact/UI/API에 없음 |
| SAFE-020 | 운영 UI와 client UI 권한 경계 분리 | 필요 | 필요 | 안정화, UI | ops/client nav, route, action guard가 role별로 분리 |
| SAFE-021 | UI blocking dialog policy | 필요 | 필요 | 안정화, UI | native alert/confirm/prompt와 blocking beforeunload는 금지하고, allowlisted read-only dialog와 제품 화면 안 2회 확인 흐름만 허용 |
| SAFE-022 | VLM 설치/연결 UI scope gate | 비대상 | 필요 | 안정화 | `verify-vlm-install-connection-scope-gate`가 Ops-only S04 UI 준비 허용, profile 저장/VLM runtime 호출/sidecar 저장/cloud provider API 호출/schema/media path 변경 금지, viewer/client 비노출 경계를 확인 |
| SAFE-023 | VLM profile 저장 scope gate | 비대상 | 필요 | 안정화 | `verify-vlm-profile-storage`가 S05 profile 저장만 허용하고 VLM runtime 호출, sidecar 저장, cloud provider API 호출, credential/prompt/raw response/source URL 저장, Event/WebRTC/SSE/WS schema와 media path 변경을 금지 |
| SAFE-024 | VLM Privacy/전송 guard | 필요 | 필요 | 안정화, UI | `verify-vlm-privacy-transfer-guard`와 Ops/Client UI leak guard가 cloud 외부 전송 경고, provider logging/retention accepted review, credential/prompt/raw response/source URL/raw frame bytes 비노출을 확인 |
| SAFE-025 | VLM default-off / no runtime auto-start | 비대상 | 필요 | 안정화 | `verify-vlm-runtime-opt-in-contract`가 VLM profile이나 recommendation이 있어도 `defaultEnabled=false`, runtime call, queue start, provider API call이 자동으로 발생하지 않음을 확인 |
| SAFE-026 | VLM model/runtime bundle 금지 | 비대상 | 필요 | 안정화 | Qwen/Gemini/Gemma 등 model weight, GGUF/safetensors/ckpt, runtime package, credential, download token이 repo/release/bundle에 포함되지 않음 |
| SAFE-027 | VLM cloud external transfer opt-in 필수 | 비대상 | 필요 | 안정화 | cloud 후보는 privacy mode와 외부 전송 경고, provider logging/retention review, runtimeContract `cloud-provider`/`providerFieldSmokeRequired=true`가 충족되기 전 전송 가능 상태가 되지 않음 |
| SAFE-028 | VLM prompt/raw response/credential/source redaction | 필요 | 필요 | 안정화, UI | profile, sidecar, Ops review, debug details, viewer/client, Event POST/WebRTC/SSE/WS payload에 prompt/raw response/credential/source URL/raw frame bytes가 노출되지 않음 |
| SAFE-029 | VLM sidecar와 외부 event/metadata 분리 | 비대상 | 필요 | 안정화 | VLMObservation, summary search, rule suggestion 결과는 sidecar/candidate contract에만 있고 EventRecord top-level, Event POST, WebRTC DataChannel, SSE/WS metadata에 섞이지 않음 |
| SAFE-030 | VLM 자동 rule/profile 적용 금지 | 비대상 | 필요 | 안정화 | rule suggestion 후보가 있어도 Rule/Profile registry write, auto apply, viewer/client suggestion 노출이 발생하지 않음 |
| SAFE-031 | VLM viewer/client 비노출 | 필요 | 필요 | 안정화, UI | viewer/client route/nav/API/UI에 VLM model, prompt, raw response, provider, internal review card, source/debug JSON이 노출되지 않음 |
| SAFE-032 | VLM queue/media path non-blocking | 비대상 | 필요 | 안정화 | VLM disabled/missing-model/invalid-output/timeout 상태가 RTSP/WebRTC media path, VA metadata, Event POST dispatch 실패로 전파되지 않음 |
| SAFE-033 | VLM Ops-only debug details boundary | 필요 | 필요 | 안정화, UI | VLM diagnostic JSON과 dry-run raw details는 Ops debug details 접힘 영역 안에만 있으며 제품 client 화면과 public evidence에는 노출되지 않음 |

## Coverage Review To Do

이 문서 다음 단계는 실행이 아니라 대조입니다.

| 작업 | 산출물 |
| --- | --- |
| 코드 로직 존재 대조 | 기능 ID별 source/API/route 위치 |
| 제품 UI 존재 대조 | 기능 ID별 route/control/state 위치 |
| 안정화 테스트 존재 대조 | 기능 ID별 verifier/script/API smoke 존재 여부 |
| 30분 테스트 존재 대조 | 기능 ID별 soak/long session 포함 여부 |
| 120분 조건부 대조 | 기능 ID별 longrun 필요 조건과 사용자 승인 기준 |
| UI 풀테스트 항목 대조 | 기능 ID별 직접 클릭/타이핑/viewport/theme evidence 항목 |

coverage 대조 전에는 `테스트 있음`, `UI 있음`, `완료`라고 보고하지 않습니다.
정적 대조는 `./server.sh verify-feature-inventory-coverage`로 수행하며, 새 기능 ID가
안정화 verifier, UI evidence runner, 장시간 승인 gate, field exclusion 중 어디에도
연결되지 않으면 누락 ID는 release gate에서 FAIL입니다.

## Script Inventory Boundary

이 문서는 기능별 UI 필요 여부와 테스트 영역을 관리합니다. `server.sh` command
dispatch, `scripts/internal/*`, `scripts/examples/*`, helper script 전체 목록은
`./server.sh verify-script-inventory`가 source-of-truth입니다. script 파일 하나하나를
기능 row로 다시 나열하지 않습니다.
