# PF 단기 검사 전수 결과

독자: LP30 검증·증거 마감 담당자. 수명: 이번 실행 기록. 원출력 및 AGENTS 정책을 대체하지 않는다. 실제 UI·제품 전체·장시간 PASS가 아니다.

최종 6로그의 217개 개별 행은 모두 PASS다. 이전 70행과 미진입 1건, 구문/공백 7명령은 별도로 보존한다. 최초 실패를 최종 PASS로 삭제하지 않는다.

문서 마감 첫 `verify-docs-links`는 exit1/145.742ms, 신규 색인의 절 anchor 오기1건이었다.
대상 파일 링크로 보완하고 동일 검사를 재개한다. 제품·검증 기준 변경이 아니며 단기217개 결과를 바꾸지 않는다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 문서 링크 최초 | `./server.sh verify-docs-links`, exit1/145.742ms, 신규 anchor 오류1 | FAIL | 잘못된 절 링크를 파일 링크로 수정 |
| 문서 링크 재개 | 동일 명령 exit0/148.335ms, 문서300/링크9698/이미지22/anchor164/index76/제외215/오류0 | PASS | 앞 실패를 삭제하지 않음 |
| 최종 공백 | `git diff --check`, exit0·출력 없음 | PASS | 준비 변경·기록 범위 |

## 명령·메타 전수

| 원출력 / 메타 | 명령 | exit | 시작 UTC | 종료 UTC | elapsed ms |
| --- | --- | --- | --- | --- | --- |
| pf-red.log / pf-red.json | 명령 메타 없음: 당시 실행은 node scripts/internal/verify_ui_fulltest_evidence_policy_v4_contract.mjs | 1 | 2026-09-21T23:06:22.113Z | 미기록 | 19485.228583 |
| pf-policy-green.log / pf-policy-green.json | /Users/dhseo/.nvm/versions/node/v24.13.0/bin/node scripts/internal/verify_ui_fulltest_evidence_policy_v4_contract.mjs | 1 | 2026-09-21T23:08:19.208Z | 2026-09-21T23:08:19.300Z | 91.606625 |
| pf-final-1.log / pf-final-1.json | /Users/dhseo/.nvm/versions/node/v24.13.0/bin/node scripts/internal/verify_v390_ui_exact_core_oracles_contract.mjs | 0 | 2026-09-21T23:17:10.488Z | 2026-09-21T23:17:12.201Z | 1712.486917 |
| pf-final-2.log / pf-final-2.json | /Users/dhseo/.nvm/versions/node/v24.13.0/bin/node scripts/internal/verify_v390_ui_exact_oracle_catalog_contract.mjs | 0 | 2026-09-21T23:17:12.202Z | 2026-09-21T23:17:12.309Z | 106.870583 |
| pf-final-3.log / pf-final-3.json | /Users/dhseo/.nvm/versions/node/v24.13.0/bin/node scripts/internal/verify_v390_ui_native_exact_cases_contract.mjs | 0 | 2026-09-21T23:17:12.309Z | 2026-09-21T23:17:28.787Z | 16478.188833 |
| pf-final-4.log / pf-final-4.json | /Users/dhseo/.nvm/versions/node/v24.13.0/bin/node scripts/internal/verify_ui_fulltest_evidence_policy_v4_contract.mjs | 0 | 2026-09-21T23:17:28.787Z | 2026-09-21T23:17:49.166Z | 20378.763458 |
| pf-final-5.log / pf-final-5.json | /Users/dhseo/.nvm/versions/node/v24.13.0/bin/node scripts/internal/verify_v390_test_acceptance_bundle_contract.mjs | 1 | 2026-09-21T23:17:49.166Z | 2026-09-21T23:17:58.256Z | 9089.241917 |
| pf06-bundle.log / pf06-bundle.json | /Users/dhseo/.nvm/versions/node/v24.13.0/bin/node scripts/internal/verify_v390_test_acceptance_bundle_contract.mjs | 0 | 2026-09-21T23:19:42.272Z | 2026-09-21T23:19:51.285Z | 9012.637833 |
| pf06-runtime.log / pf06-runtime.json | /Users/dhseo/.nvm/versions/node/v24.13.0/bin/node scripts/internal/verify_v390_ui_exact_oracle_runtime_contract.mjs | 0 | 2026-09-21T23:19:51.286Z | 2026-09-21T23:19:52.050Z | 763.621209 |
| pf06-syntax-0.log / pf06-syntax-0.json | /Users/dhseo/.nvm/versions/node/v24.13.0/bin/node --check scripts/internal/ui_fulltest_evidence_policy_v4_lib.mjs | 0 | 2026-09-21T23:19:52.050Z | 2026-09-21T23:19:52.078Z | 27.51175 |
| pf06-syntax-1.log / pf06-syntax-1.json | /Users/dhseo/.nvm/versions/node/v24.13.0/bin/node --check scripts/internal/verify_v390_test_acceptance_bundle.mjs | 0 | 2026-09-21T23:19:52.078Z | 2026-09-21T23:19:52.101Z | 23.159791 |
| pf06-syntax-2.log / pf06-syntax-2.json | /Users/dhseo/.nvm/versions/node/v24.13.0/bin/node --check scripts/internal/verify_ui_fulltest_evidence_policy_v4_contract.mjs | 0 | 2026-09-21T23:19:52.101Z | 2026-09-21T23:19:52.123Z | 21.553083 |
| pf06-syntax-3.log / pf06-syntax-3.json | /Users/dhseo/.nvm/versions/node/v24.13.0/bin/node --check scripts/internal/verify_v390_test_acceptance_bundle_contract.mjs | 0 | 2026-09-21T23:19:52.123Z | 2026-09-21T23:19:52.144Z | 21.150583 |
| pf06-syntax-4.log / pf06-syntax-4.json | /Users/dhseo/.nvm/versions/node/v24.13.0/bin/node --check scripts/internal/v390_ui_exact_core_oracles.mjs | 0 | 2026-09-21T23:19:52.144Z | 2026-09-21T23:19:52.165Z | 20.09275 |
| pf06-syntax-5.log / pf06-syntax-5.json | /Users/dhseo/.nvm/versions/node/v24.13.0/bin/node --check scripts/internal/verify_v390_ui_exact_core_oracles_contract.mjs | 0 | 2026-09-21T23:19:52.165Z | 2026-09-21T23:19:52.184Z | 19.11475 |
| pf06-diff.log / pf06-diff.json | git diff --check | 0 | 2026-09-21T23:19:52.184Z | 2026-09-21T23:19:52.244Z | 59.814958 |

## 최종 개별 217행

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| catalog covers every canonical UI/AUTH/SRC/RULE case in exact order | 해당 제목의 독립 계약 검사; pf-final-1.log:1, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| catalog and every returned oracle are deeply immutable | 해당 제목의 독립 계약 검사; pf-final-1.log:2, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| approval-envelope-only drift leaves every runtime oracle projection unchanged | 해당 제목의 독립 계약 검사; pf-final-1.log:3, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| row-local semantic inputs invalidate exactly their affected runtime oracle | 해당 제목의 독립 계약 검사; pf-final-1.log:4, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| runtime semantic binding contains only functional row-local inputs | 해당 제목의 독립 계약 검사; pf-final-1.log:5, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| runner-facing route/role/control/request/DOM/network/state/cleanup shape is exact | 해당 제목의 독립 계약 검사; pf-final-1.log:6, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| owner/action anchors and visible controls resolve in product source | 해당 제목의 독립 계약 검사; pf-final-1.log:7, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| runtime response paths/tokens resolve to product JSON or HTML output anchors | 해당 제목의 독립 계약 검사; pf-final-1.log:8, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| every exact API path is owned by ingress source and has semantic body assertions | 해당 제목의 독립 계약 검사; pf-final-1.log:9, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| negative boundaries use the same structured-material rule for response and DOM | 해당 제목의 독립 계약 검사; pf-final-1.log:10, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| state mutations bind exact request bodies, changed state, and authoritative cleanup | 해당 제목의 독립 계약 검사; pf-final-1.log:11, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| read, preview POST, and negative cases forbid writes and require independent before/after readback | 해당 제목의 독립 계약 검사; pf-final-1.log:12, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| corrected AUTH disable and client-view bindings match executable product routes | 해당 제목의 독립 계약 검사; pf-final-1.log:13, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| RULE-092~104 and RULE-111 delegate to existing specialized exact oracles | 해당 제목의 독립 계약 검사; pf-final-1.log:14, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| validator rejects missing, duplicate, route/role drift, and weak source ownership | 해당 제목의 독립 계약 검사; pf-final-1.log:15, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| validator rejects generic GET200, exists-only DOM, uncorrelated network, and state self-comparison | 해당 제목의 독립 계약 검사; pf-final-1.log:16, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| validator rejects absent API payload, forbidden fields, cleanup, and specialized link | 해당 제목의 독립 계약 검사; pf-final-1.log:17, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| integrated catalog covers 424 unique exact runtime oracles | 해당 제목의 독립 계약 검사; pf-final-2.log:1, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| every exact ID resolves to its immutable group-owned runtime oracle | 해당 제목의 독립 계약 검사; pf-final-2.log:2, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| unknown exact IDs fail closed | 해당 제목의 독립 계약 검사; pf-final-2.log:3, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| generated manifest validates against canonical exact ordered 424 | 해당 제목의 독립 계약 검사; pf-final-3.log:1, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| event typed fixtures select one row and preserve request-derived identities | 해당 제목의 독립 계약 검사; pf-final-3.log:2, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| incident memory search fixtures bind every product filter and searchable query | 해당 제목의 독립 계약 검사; pf-final-3.log:3, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| event review seed receipts bind PUT response, storage readback, and EventRecord identity | 해당 제목의 독립 계약 검사; pf-final-3.log:4, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| event review authoritative readback selects one exact nested event/review identity | 해당 제목의 독립 계약 검사; pf-final-3.log:5, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-038 binds one dry-run response to one attempt, audit row, and DOM projection | 해당 제목의 독립 계약 검사; pf-final-3.log:6, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| event review note evidence survives the production failure rewrap and parent aggregation | 해당 제목의 독립 계약 검사; pf-final-3.log:7, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| builder is deterministic and preserves exact case order | 해당 제목의 독립 계약 검사; pf-final-3.log:8, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| all 424 completion modes separate document navigation from application requests | 해당 제목의 독립 계약 검사; pf-final-3.log:9, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| all 424 failure lifecycles retain the initial manifest navigation binding | 해당 제목의 독립 계약 검사; pf-final-3.log:10, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| independent readback passes one coordinator ownership context and always ends it | 해당 제목의 독립 계약 검사; pf-final-3.log:11, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| RULE-097 callback receives only its declared explicit argument projection | 해당 제목의 독립 계약 검사; pf-final-3.log:12, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| bounded ownership cleanup precedes physical close without changing close truth | 해당 제목의 독립 계약 검사; pf-final-3.log:13, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-004 reuses one document navigation and correlates only the authoritative API fetch | 해당 제목의 독립 계약 검사; pf-final-3.log:14, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| canonical and native generator writes are one validated atomic transaction | 해당 제목의 독립 계약 검사; pf-final-3.log:15, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| RULE relationship fixtures use one collision-free numeric identity contract | 해당 제목의 독립 계약 검사; pf-final-3.log:16, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| workflow distribution is owned by the shared exact 424 contract | 해당 제목의 독립 계약 검사; pf-final-3.log:17, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| declared exact runtime seeds materialize through the shared deterministic fixture registry | 해당 제목의 독립 계약 검사; pf-final-3.log:18, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| every exact EVT seed.kind has a declarative store and join materializer | 해당 제목의 독립 계약 검사; pf-final-3.log:19, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| event review mutation cleanup validates an empty 200 collection and byte restore | 해당 제목의 독립 계약 검사; pf-final-3.log:20, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| event review seed keeps the official top-level note schema and uses structured reload | 해당 제목의 독립 계약 검사; pf-final-3.log:21, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| records.records fixture family uses product dispatch with exact readback and cleanup | 해당 제목의 독립 계약 검사; pf-final-3.log:22, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| fixture-safe incident digests bind one authoritative event to one safe summary | 해당 제목의 독립 계약 검사; pf-final-3.log:23, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-023/026 expected digest binds one materialized EventRecord identity before browser startup | 해당 제목의 독립 계약 검사; pf-final-3.log:24, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-004 diagnostic log evidence is redacted and byte-restored before native execution | 해당 제목의 독립 계약 검사; pf-final-3.log:25, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| audited route-local primary controls match their exact runtime oracles | 해당 제목의 독립 계약 검사; pf-final-3.log:26, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| endpoint source fixtures intentionally cross the published canonical-media baseline without bypassing sourceId identity | 해당 제목의 독립 계약 검사; pf-final-3.log:27, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| inactive-or-equal-before cleanup accepts absent or disabled state and rejects enabled residue | 해당 제목의 독립 계약 검사; pf-final-3.log:28, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| non-canonical implementation review metadata does not invalidate the exact 424 manifest | 해당 제목의 독립 계약 검사; pf-final-3.log:29, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| exact-case implementation projection drift and whole-file fallback are rejected | 해당 제목의 독립 계약 검사; pf-final-3.log:30, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| endpoint action execution inputs retain full runtime values but trace inputs are release-safe digests | 해당 제목의 독립 계약 검사; pf-final-3.log:31, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| admin-only ops users cases and runtime role schema stay authoritative | 해당 제목의 독립 계약 검사; pf-final-3.log:32, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| API ownership routes normalize to product screens | 해당 제목의 독립 계약 검사; pf-final-3.log:33, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| UI-017 binds the client events read model instead of a dashboard-only preset status | 해당 제목의 독립 계약 검사; pf-final-3.log:34, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| UI-018 remains a dedicated negative route case | 해당 제목의 독립 계약 검사; pf-final-3.log:35, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| SAFE-017 keeps its cross-route negative behavior without changing UI-018 classification | 해당 제목의 독립 계약 검사; pf-final-3.log:36, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| MEDIA/SAFE client cases and SAFE-016 negative route use one exact route lifecycle | 해당 제목의 독립 계약 검사; pf-final-3.log:37, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| remaining client-safe batch clusters bind dynamic identities and owned lifecycle endpoints | 해당 제목의 독립 계약 검사; pf-final-3.log:38, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| actual read-only and hidden-boundary completion requests use exact runtime oracle paths | 해당 제목의 독립 계약 검사; pf-final-3.log:39, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| all cases declare native action, oracle seed, and artifact plan | 해당 제목의 독립 계약 검사; pf-final-3.log:40, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| REVIEW4-56 requires exact typed product workflows for all 424 cases | 해당 제목의 독립 계약 검사; pf-final-3.log:41, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| REVIEW4-56 rejects fallback no-submit generic and self-comparison workflows | 해당 제목의 독립 계약 검사; pf-final-3.log:42, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| runner owns native execution, role state, first-fail, and artifact fields | 해당 제목의 독립 계약 검사; pf-final-3.log:43, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| self-contained runtime closes invite, auth readback, preference, and visual-session gaps | 해당 제목의 독립 계약 검사; pf-final-3.log:44, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| case runtime keeps generated secrets ephemeral and rejects state path escape | 해당 제목의 독립 계약 검사; pf-final-3.log:45, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| authoritative cleanup readback restores state after success and failure | 해당 제목의 독립 계약 검사; pf-final-3.log:46, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| SRC-010 and SRC-019 use a fresh fixture-scoped viewer and restore auth bytes | 해당 제목의 독립 계약 검사; pf-final-3.log:47, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| fresh role session restores login audit writes before a read-only case | 해당 제목의 독립 계약 검사; pf-final-3.log:48, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| fresh viewer session uses scope and client view readback instead of a nonexistent whoami viewId | 해당 제목의 독립 계약 검사; pf-final-3.log:49, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| canonical requested route and runtime screen route are explicit projections | 해당 제목의 독립 계약 검사; pf-final-3.log:50, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| runner and producer share typed capture schema while qualifier is independently implemented | 해당 제목의 독립 계약 검사; pf-final-3.log:51, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| missing, reordered, unsupported, API-screen, and field drift are rejected | 해당 제목의 독립 계약 검사; pf-final-3.log:52, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| stale implementation binding writes a fail-closed 0/424 pre-execution summary | 해당 제목의 독립 계약 검사; pf-final-3.log:53, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| canonical parent bootstrap failure writes a fail-closed 0/424 summary | 해당 제목의 독립 계약 검사; pf-final-3.log:54, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| pre-execution failure cannot become UI PASS, Policy v4 eligible, or cleanup evidence | 해당 제목의 독립 계약 검사; pf-final-3.log:55, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| raw capture success and UI qualification remain separate lifecycle states | 해당 제목의 독립 계약 검사; pf-final-3.log:56, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| evidence producer failure always leaves an exact 424 failure ledger | 해당 제목의 독립 계약 검사; pf-final-3.log:57, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| full exact failure ledger preserves the typed EVT-004 lifecycle envelope | 해당 제목의 독립 계약 검사; pf-final-3.log:58, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| failed case partial artifacts are referenced, deduplicated, and orphan-free | 해당 제목의 독립 계약 검사; pf-final-3.log:59, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| canonical case children bind duplicate screenshots to one prior artifact | 해당 제목의 독립 계약 검사; pf-final-3.log:60, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| PF01 canonical input preflight reuses qualifier validation | 해당 제목의 독립 계약 검사; pf-final-4.log:2, 명령은 위 메타표, exit 0 | PASS | 최초 실패 후 PASS (pf-red.log). 신규 미구현 예상 RED |
| PF02 stale anchor selector and projection hash reject before execution | 해당 제목의 독립 계약 검사; pf-final-4.log:4, 명령은 위 메타표, exit 0 | PASS | 최초 실패 후 PASS (pf-red.log). 신규 미구현 예상 RED |
| PF03 missing order and route drift reject before execution | 해당 제목의 독립 계약 검사; pf-final-4.log:6, 명령은 위 메타표, exit 0 | PASS | 최초 실패 후 PASS (pf-red.log). 신규 미구현 예상 RED |
| policy schema fixes four categories and three UI evidence modes | 해당 제목의 독립 계약 검사; pf-final-4.log:8, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| qualified scoped case is case-equivalent but not full-suite PASS | 해당 제목의 독립 계약 검사; pf-final-4.log:10, 명령은 위 메타표, exit 0 | PASS | 최초 실패 후 PASS (pf-red.log). 기존 정합/기대값 실패; 예상 RED 아님 |
| producer completion PASS claims are ignored when raw evidence qualifies | 해당 제목의 독립 계약 검사; pf-final-4.log:12, 명령은 위 메타표, exit 0 | PASS | 최초 실패 후 PASS (pf-red.log). 기존 정합/기대값 실패; 예상 RED 아님 |
| contract-only exact 424 closure satisfies suite algorithm | 해당 제목의 독립 계약 검사; pf-final-4.log:14, 명령은 위 메타표, exit 0 | PASS | 최초 실패 후 PASS (pf-red.log). 기존 정합/기대값 실패; 예상 RED 아님 |
| arbitrary synthetic 424 IDs are rejected by canonical case binding | 해당 제목의 독립 계약 검사; pf-final-4.log:16, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| canonical feature route role viewport theme and control action drift are rejected | 해당 제목의 독립 계약 검사; pf-final-4.log:18, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| requested observed aliases missing fields and copied control claims are rejected | 해당 제목의 독립 계약 검사; pf-final-4.log:20, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| hash-valid canonical manifest content drift is rejected | 해당 제목의 독립 계약 검사; pf-final-4.log:22, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| canonical source binding ignores unrelated review metadata and rejects exact projection drift | 해당 제목의 독립 계약 검사; pf-final-4.log:24, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| source file hashes remain mandatory when git source comparison is disabled | 해당 제목의 독립 계약 검사; pf-final-4.log:26, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| self-declared evidence refs and redaction PASS are not attested evidence | 해당 제목의 독립 계약 검사; pf-final-4.log:28, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| decode schema correlation payload and independent redaction negatives are rejected | 해당 제목의 독립 계약 검사; pf-final-4.log:30, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| self-declared visual and responsive matrix PASS are rejected after metric recalculation | 해당 제목의 독립 계약 검사; pf-final-4.log:32, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| self-declared console approval is recalculated from exact trace and source contract | 해당 제목의 독립 계약 검사; pf-final-4.log:34, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| legacy and actual-mode contract fixture are ineligible | 해당 제목의 독립 계약 검사; pf-final-4.log:36, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| fallback and manual intervention are rejected | 해당 제목의 독립 계약 검사; pf-final-4.log:38, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| partial coverage and unsupported work block suite PASS | 해당 제목의 독립 계약 검사; pf-final-4.log:40, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| verifier rejects missing exact coverage fields without zero or case-length defaults | 해당 제목의 독립 계약 검사; pf-final-4.log:42, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| pre-existing state without a fresh raw readback is rejected | 해당 제목의 독립 계약 검사; pf-final-4.log:44, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| post-readback document visual ownership remains independently qualified | 해당 제목의 독립 계약 검사; pf-final-4.log:46, 명령은 위 메타표, exit 0 | PASS | 최초 실패 후 PASS (pf-red.log). 기존 정합/기대값 실패; 예상 RED 아님 |
| request qualification filters by exact contract before requiring one request object pair | 해당 제목의 독립 계약 검사; pf-final-4.log:48, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| response must be the same Playwright request object as the exact initiating request | 해당 제목의 독립 계약 검사; pf-final-4.log:50, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| native document form submission uses its exact source-owned request binding | 해당 제목의 독립 계약 검사; pf-final-4.log:52, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| dynamic execution-owner selectors and hidden controls remain exact and fail closed | 해당 제목의 독립 계약 검사; pf-final-4.log:54, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| independent qualifier covers every runner semantic readback expectation shape | 해당 제목의 독립 계약 검사; pf-final-4.log:56, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| REVIEW4-58 primary action ID correlation and exact selector are required | 해당 제목의 독립 계약 검사; pf-final-4.log:58, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| role theme and viewport claims must match observed browser state | 해당 제목의 독립 계약 검사; pf-final-4.log:60, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| artifact path escape hash mismatch and fake PNG are rejected | 해당 제목의 독립 계약 검사; pf-final-4.log:62, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| producer result/replay/visual booleans are ignored but cleanup remains fail-closed | 해당 제목의 독립 계약 검사; pf-final-4.log:64, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| acceptance public archive contract is summary and hash based | 해당 제목의 독립 계약 검사; pf06-bundle.log:1, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| canonical parent acceptance validator exists before legacy evidence can be consumed | 해당 제목의 독립 계약 검사; pf06-bundle.log:2, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| ordinary canonical parent failure is strictly validated before Policy stays ineligible | 해당 제목의 독립 계약 검사; pf06-bundle.log:3, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| acceptance rescans every post-producer retained artifact before releasing secrets | 해당 제목의 독립 계약 검사; pf06-bundle.log:4, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| UI final integrity rereads parent bytes and outer-finalizes retained secrets on every path | 해당 제목의 독립 계약 검사; pf06-bundle.log:5, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| UI final integrity reads source files through a defined root-owned helper | 해당 제목의 독립 계약 검사; pf06-bundle.log:6, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| canonical parent acceptance is exact-424, census-complete, and fail-closed | 해당 제목의 독립 계약 검사; pf06-bundle.log:7, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| source-contract and actual-case failures materialize distinct current first-failure records | 해당 제목의 독립 계약 검사; pf06-bundle.log:8, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| acceptance first-failure summary report and root artifact share the suite command | 해당 제목의 독립 계약 검사; pf06-bundle.log:9, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| current final actual preflight keeps 120 conditional and requires a clean worktree | 해당 제목의 독립 계약 검사; pf06-bundle.log:10, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| Policy source binding excludes only the acceptance-owned artifact root | 해당 제목의 독립 계약 검사; pf06-bundle.log:11, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| canonical artifact dirtiness is allowed without masking source dirtiness | 해당 제목의 독립 계약 검사; pf06-bundle.log:12, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| artifact scan distinguishes verifier prose from a real video placeholder | 해당 제목의 독립 계약 검사; pf06-bundle.log:13, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| canonical source removes legacy 8-case and external summary injection | 해당 제목의 독립 계약 검사; pf06-bundle.log:14, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| no-option launcher owns output and conditional 120 authorization | 해당 제목의 독립 계약 검사; pf06-bundle.log:15, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| canonical actual command owns the complete throwaway UI environment | 해당 제목의 독립 계약 검사; pf06-bundle.log:16, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| published seed baseline is explicit, policy-bound, and rejects mismatched fixtures | 해당 제목의 독립 계약 검사; pf06-bundle.log:17, 명령은 위 메타표, exit 0 | PASS | 최초 실패 후 PASS (pf-final-5.log). 기존 정합/기대값 실패; 예상 RED 아님 |
| listener ownership parser rejects trailing blank and zero pseudo-PIDs | 해당 제목의 독립 계약 검사; pf06-bundle.log:18, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| acceptance child environments and artifacts exclude retained secrets | 해당 제목의 독립 계약 검사; pf06-bundle.log:19, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| server.sh and script inventory expose R3 acceptance bundle commands | 해당 제목의 독립 계약 검사; pf06-bundle.log:20, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| dry-run writes replayable acceptance summary without executing gated suites | 해당 제목의 독립 계약 검사; pf06-bundle.log:21, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| actual-mode fixture executes the fixed stage order and conditional 120 decision | 해당 제목의 독립 계약 검사; pf06-bundle.log:22, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| actual-mode fixture stops on first failure and still runs cleanup/report | 해당 제목의 독립 계약 검사; pf06-bundle.log:23, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| acceptance report normalization cannot rewrite nested attested evidence | 해당 제목의 독립 계약 검사; pf06-bundle.log:24, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| final acceptance drops retained secret from ui-final-integrity | 해당 제목의 독립 계약 검사; pf06-bundle.log:25, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| final acceptance drops retained secret from evaluation | 해당 제목의 독립 계약 검사; pf06-bundle.log:26, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| final acceptance drops retained secret from report | 해당 제목의 독립 계약 검사; pf06-bundle.log:27, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| final acceptance drops retained secret from first-failure | 해당 제목의 독립 계약 검사; pf06-bundle.log:28, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| final acceptance drops retained secret from post-producer | 해당 제목의 독립 계약 검사; pf06-bundle.log:29, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| final acceptance drops retained secret from child-artifact | 해당 제목의 독립 계약 검사; pf06-bundle.log:30, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| standalone UI suite builds the current source before bootstrap and binds the binary | 해당 제목의 독립 계약 검사; pf06-bundle.log:31, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| standalone UI build failure stops bootstrap, exact cases, and qualification | 해당 제목의 독립 계약 검사; pf06-bundle.log:32, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| code-comments is the first and unique feature gate, with a fail-closed user-facing failure record | 해당 제목의 독립 계약 검사; pf06-bundle.log:33, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| native exact manifest contract is a unique 36th-set early feature gate | 해당 제목의 독립 계약 검사; pf06-bundle.log:34, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| rerun preserves the earliest first failure after canonical output replacement | 해당 제목의 독립 계약 검사; pf06-bundle.log:35, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| actual-mode fixture runs explicit 120 and rejects cleanup failure | 해당 제목의 독립 계약 검사; pf06-bundle.log:36, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| docs and release evidence record R3 without overclaiming gated tests | 해당 제목의 독립 계약 검사; pf06-bundle.log:37, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| PF04 actual preflight rejects canonical drift before artifact setup or later stages | 해당 제목의 독립 계약 검사; pf06-bundle.log:38, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| event review renderer materializes the exact product query envelope | 해당 제목의 독립 계약 검사; pf06-runtime.log:1, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| event review renderer owns and awaits one dedicated product fetch | 해당 제목의 독립 계약 검사; pf06-runtime.log:2, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| page-owned refresh does not require an unused action context | 해당 제목의 독립 계약 검사; pf06-runtime.log:3, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| fixture-derived literals use one serializable non-RegExp matcher | 해당 제목의 독립 계약 검사; pf06-runtime.log:4, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| canonical exact runtime has zero dynamic RegExp constructors | 해당 제목의 독립 계약 검사; pf06-runtime.log:5, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| owner/provenance baseline registration rejects duplicate declared owners | 해당 제목의 독립 계약 검사; pf06-runtime.log:6, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-025 response provenance selects one fixture row only inside sourceHealth | 해당 제목의 독립 계약 검사; pf06-runtime.log:7, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-041 typed owner uses documentId and preserves sourceId type/value | 해당 제목의 독립 계약 검사; pf06-runtime.log:8, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-041 DOM projection binds one typed memorySearch hit to one rendered node | 해당 제목의 독립 계약 검사; pf06-runtime.log:9, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-041 product refresh binds one initiating request/response to the rendered owner | 해당 제목의 독립 계약 검사; pf06-runtime.log:10, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-070 request provenance binds one Playwright request/response identity and exact query map | 해당 제목의 독립 계약 검사; pf06-runtime.log:11, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| incident memory search response evidence is typed, identity-bound, and digest-only | 해당 제목의 독립 계약 검사; pf06-runtime.log:12, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| event review descendant capture reaches the semantic evaluator and mutations fail closed | 해당 제목의 독립 계약 검사; pf06-runtime.log:13, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-004 marker lifecycle distinguishes hook, file, response, timeline, and DOM failures | 해당 제목의 독립 계약 검사; pf06-runtime.log:14, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| declared visible-control values are applied by the exact runtime before observation | 해당 제목의 독립 계약 검사; pf06-runtime.log:15, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-004 test-owned marker digest reaches the DOM evaluator without EventRecord lifecycle crossover | 해당 제목의 독립 계약 검사; pf06-runtime.log:16, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-004 removes only acceptance-owned canonical timeline residue | 해당 제목의 독립 계약 검사; pf06-runtime.log:17, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-004 marker isolation accepts an already-drained prior-case residue | 해당 제목의 독립 계약 검사; pf06-runtime.log:18, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-004 correlation is request-scoped to one authoritative log-tail fetch | 해당 제목의 독립 계약 검사; pf06-runtime.log:19, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-004 marker flow binds one authoritative response row to one visible timeline node | 해당 제목의 독립 계약 검사; pf06-runtime.log:20, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-004 marker evaluator is single-shot after correlation and DOM readiness | 해당 제목의 독립 계약 검사; pf06-runtime.log:21, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT DOM semantic composite distinguishes safe failure evidence without raw values | 해당 제목의 독립 계약 검사; pf06-runtime.log:22, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| missing legacy DOM baselines use strict response-derived renderer projection | 해당 제목의 독립 계약 검사; pf06-runtime.log:23, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| declared fixed remaining owners replace missing baselines without recursive field search | 해당 제목의 독립 계약 검사; pf06-runtime.log:24, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-003 source-health baseline is row-local to the acceptance-owned source | 해당 제목의 독립 계약 검사; pf06-runtime.log:25, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| response-backed DOM targets do not inherit unrelated whole-response baselines | 해당 제목의 독립 계약 검사; pf06-runtime.log:26, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| request semantic assertion evidence contains only bound digests and typed metadata | 해당 제목의 독립 계약 검사; pf06-runtime.log:27, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-003 API row and DOM identity bind to the same degraded source | 해당 제목의 독립 계약 검사; pf06-runtime.log:28, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-023 binds one authoritative event row to one Ops timeline row | 해당 제목의 독립 계약 검사; pf06-runtime.log:29, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-026 reuses the exact EventRecord lifecycle preservation contract | 해당 제목의 독립 계약 검사; pf06-runtime.log:30, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-026 owned refresh reads the adapter renderObservation lifecycle | 해당 제목의 독립 계약 검사; pf06-runtime.log:31, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| exact DOM attributes bind to the selected event row and fail closed | 해당 제목의 독립 계약 검사; pf06-runtime.log:32, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| response pseudo-fields include status and reject an invalid status assertion | 해당 제목의 독립 계약 검사; pf06-runtime.log:33, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| GET response correlation, debug leaf policy, and nested attribute owners fail closed | 해당 제목의 독립 계약 검사; pf06-runtime.log:34, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-001 actual response counts and DOM projections pass | 해당 제목의 독립 계약 검사; pf06-runtime.log:35, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-024 executes all three bounded samples with authoritative baseline binding | 해당 제목의 독립 계약 검사; pf06-runtime.log:36, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| requested EVT binding scope is complete and excludes specialized mutation paths | 해당 제목의 독립 계약 검사; pf06-runtime.log:37, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| cross-route primary action verifies source catalog and restores destination | 해당 제목의 독립 계약 검사; pf06-runtime.log:38, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| cross-route source and restore navigation failures are fail-closed | 해당 제목의 독립 계약 검사; pf06-runtime.log:39, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| API source assertions use one fetch on the current screen without document navigation | 해당 제목의 독립 계약 검사; pf06-runtime.log:40, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| API fetch and screen preparation failures remain fail-closed without duplicate requests | 해당 제목의 독립 계약 검사; pf06-runtime.log:41, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| already executed primary action is not dispatched twice | 해당 제목의 독립 계약 검사; pf06-runtime.log:42, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| native primary control binding is enforced independently of route root | 해당 제목의 독립 계약 검사; pf06-runtime.log:43, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| required current-route primary control waits before its snapshot | 해당 제목의 독립 계약 검사; pf06-runtime.log:44, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| required hidden primary control waits for attachment without demanding visibility | 해당 제목의 독립 계약 검사; pf06-runtime.log:45, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| required current-route primary control keeps timeout and post-wait failures fail-closed | 해당 제목의 독립 계약 검사; pf06-runtime.log:46, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| required current-route primary control still rejects hidden and disabled snapshots | 해당 제목의 독립 계약 검사; pf06-runtime.log:47, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| route mismatch and not-applicable primary controls do not wait or replay | 해당 제목의 독립 계약 검사; pf06-runtime.log:48, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| source-route navigation waits for async primary control and restores on success and failure | 해당 제목의 독립 계약 검사; pf06-runtime.log:49, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| core object-form requiredAttributes are enforced | 해당 제목의 독립 계약 검사; pf06-runtime.log:50, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| HTML redaction code is distinct from embedded forbidden response fields | 해당 제목의 독립 계약 검사; pf06-runtime.log:51, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| response redaction separates UI-068 narrative labels from structured material | 해당 제목의 독립 계약 검사; pf06-runtime.log:52, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| endpoint-owned mutation requires the actual method/path/status/correlation response | 해당 제목의 독립 계약 검사; pf06-runtime.log:53, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| catalog runtime mutation binds the declared action request object instead of a path peer | 해당 제목의 독립 계약 검사; pf06-runtime.log:54, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| DOM redaction labels are distinct from exposed credential values | 해당 제목의 독립 계약 검사; pf06-runtime.log:55, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| client/viewer boundary labels are distinct from enabled exposure material | 해당 제목의 독립 계약 검사; pf06-runtime.log:56, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| no-write/provider labels are distinct from enabled capability material | 해당 제목의 독립 계약 검사; pf06-runtime.log:57, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| all negative-boundary families distinguish narrative, inactive, and active material | 해당 제목의 독립 계약 검사; pf06-runtime.log:58, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| status and response semantic drift are rejected | 해당 제목의 독립 계약 검사; pf06-runtime.log:59, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| DOM response mismatch and forbidden network are rejected | 해당 제목의 독립 계약 검사; pf06-runtime.log:60, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| CLIENT fixture materialization binds assigned and blocked views independently | 해당 제목의 독립 계약 검사; pf06-runtime.log:61, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| client media readiness and nullable fields preserve their product ownership | 해당 제목의 독립 계약 검사; pf06-runtime.log:62, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| SAFE DOM structure/material and external capability boundaries are enforced | 해당 제목의 독립 계약 검사; pf06-runtime.log:63, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| CLIENT control sequence binds POST session id to DELETE and DOM history | 해당 제목의 독립 계약 검사; pf06-runtime.log:64, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| CLIENT composed sessions are UI-created and VA sample bindings fail closed | 해당 제목의 독립 계약 검사; pf06-runtime.log:65, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| CLIENT-021 waits for bound product VA event projection and fails closed | 해당 제목의 독립 계약 검사; pf06-runtime.log:66, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |
| EVT-048 binds a deterministic response-derived baseline to current catalog state | 해당 제목의 독립 계약 검사; pf06-runtime.log:67, 명령은 위 메타표, exit 0 | PASS | 해당 최종 원출력에서 PASS |

## 최초 실행 이력 70행

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| PF01 canonical input preflight reuses qualifier validation: canonical input preflight validator missing | pf-red.log:2; 위 명령; exit 1 | FAIL | 신규 validator 부재 예상 RED; 후속 pf-final-4 PASS |
| PF02 stale anchor selector and projection hash reject before execution: policyLibrary.validateCanonicalCaseInputs is not a function | pf-red.log:4; 위 명령; exit 1 | FAIL | 신규 validator 부재 예상 RED; 후속 pf-final-4 PASS |
| PF03 missing order and route drift reject before execution: policyLibrary.validateCanonicalCaseInputs is not a function | pf-red.log:6; 위 명령; exit 1 | FAIL | 신규 validator 부재 예상 RED; 후속 pf-final-4 PASS |
| policy schema fixes four categories and three UI evidence modes | pf-red.log:8; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| qualified scoped case is case-equivalent but not full-suite PASS: canonical-case-manifest-implementation-controlAction-drift; canonical-implementation-evidence-projection-drift | pf-red.log:10; 위 명령; exit 1 | FAIL | 기존 canonical 정합 실패; 예상 RED 아님; 후속 pf-final-4 PASS |
| producer completion PASS claims are ignored when raw evidence qualifies: canonical-case-manifest-implementation-controlAction-drift; canonical-implementation-evidence-projection-drift | pf-red.log:12; 위 명령; exit 1 | FAIL | 기존 canonical 정합 실패; 예상 RED 아님; 후속 pf-final-4 PASS |
| contract-only exact 424 closure satisfies suite algorithm: canonical-case-manifest-implementation-controlAction-drift; canonical-implementation-evidence-projection-drift | pf-red.log:14; 위 명령; exit 1 | FAIL | 기존 canonical 정합 실패; 예상 RED 아님; 후속 pf-final-4 PASS |
| arbitrary synthetic 424 IDs are rejected by canonical case binding | pf-red.log:16; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| canonical feature route role viewport theme and control action drift are rejected | pf-red.log:18; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| requested observed aliases missing fields and copied control claims are rejected | pf-red.log:20; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| hash-valid canonical manifest content drift is rejected | pf-red.log:22; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| canonical source binding ignores unrelated review metadata and rejects exact projection drift | pf-red.log:24; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| source file hashes remain mandatory when git source comparison is disabled | pf-red.log:26; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| self-declared evidence refs and redaction PASS are not attested evidence | pf-red.log:28; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| decode schema correlation payload and independent redaction negatives are rejected | pf-red.log:30; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| self-declared visual and responsive matrix PASS are rejected after metric recalculation | pf-red.log:32; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| self-declared console approval is recalculated from exact trace and source contract | pf-red.log:34; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| legacy and actual-mode contract fixture are ineligible | pf-red.log:36; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| fallback and manual intervention are rejected | pf-red.log:38; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| partial coverage and unsupported work block suite PASS | pf-red.log:40; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| verifier rejects missing exact coverage fields without zero or case-length defaults | pf-red.log:42; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| pre-existing state without a fresh raw readback is rejected | pf-red.log:44; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| post-readback document visual ownership remains independently qualified: canonical-case-manifest-implementation-controlAction-drift; canonical-implementation-evidence-projection-drift | pf-red.log:46; 위 명령; exit 1 | FAIL | 기존 canonical 정합 실패; 예상 RED 아님; 후속 pf-final-4 PASS |
| request qualification filters by exact contract before requiring one request object pair | pf-red.log:48; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| response must be the same Playwright request object as the exact initiating request | pf-red.log:50; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| native document form submission uses its exact source-owned request binding | pf-red.log:52; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| dynamic execution-owner selectors and hidden controls remain exact and fail closed | pf-red.log:54; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| independent qualifier covers every runner semantic readback expectation shape | pf-red.log:56; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| REVIEW4-58 primary action ID correlation and exact selector are required | pf-red.log:58; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| role theme and viewport claims must match observed browser state | pf-red.log:60; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| artifact path escape hash mismatch and fake PNG are rejected | pf-red.log:62; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| producer result/replay/visual booleans are ignored but cleanup remains fail-closed | pf-red.log:64; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| acceptance public archive contract is summary and hash based | pf-final-5.log:1; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| canonical parent acceptance validator exists before legacy evidence can be consumed | pf-final-5.log:2; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| ordinary canonical parent failure is strictly validated before Policy stays ineligible | pf-final-5.log:3; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| acceptance rescans every post-producer retained artifact before releasing secrets | pf-final-5.log:4; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| UI final integrity rereads parent bytes and outer-finalizes retained secrets on every path | pf-final-5.log:5; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| UI final integrity reads source files through a defined root-owned helper | pf-final-5.log:6; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| canonical parent acceptance is exact-424, census-complete, and fail-closed | pf-final-5.log:7; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| source-contract and actual-case failures materialize distinct current first-failure records | pf-final-5.log:8; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| acceptance first-failure summary report and root artifact share the suite command | pf-final-5.log:9; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| current final actual preflight keeps 120 conditional and requires a clean worktree | pf-final-5.log:10; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| Policy source binding excludes only the acceptance-owned artifact root | pf-final-5.log:11; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| canonical artifact dirtiness is allowed without masking source dirtiness | pf-final-5.log:12; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| artifact scan distinguishes verifier prose from a real video placeholder | pf-final-5.log:13; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| canonical source removes legacy 8-case and external summary injection | pf-final-5.log:14; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| no-option launcher owns output and conditional 120 authorization | pf-final-5.log:15; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| canonical actual command owns the complete throwaway UI environment | pf-final-5.log:16; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| published seed baseline is explicit, policy-bound, and rejects mismatched fixtures: default seed preparation is not bound to the current source and published baseline | pf-final-5.log:17; 위 명령; exit 1 | FAIL | 기존 버전 고정 기대값 실패; 예상 RED 아님; 후속 pf06-bundle PASS |
| listener ownership parser rejects trailing blank and zero pseudo-PIDs | pf-final-5.log:18; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| acceptance child environments and artifacts exclude retained secrets | pf-final-5.log:19; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| server.sh and script inventory expose R3 acceptance bundle commands | pf-final-5.log:20; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| dry-run writes replayable acceptance summary without executing gated suites | pf-final-5.log:21; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| actual-mode fixture executes the fixed stage order and conditional 120 decision | pf-final-5.log:22; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| actual-mode fixture stops on first failure and still runs cleanup/report | pf-final-5.log:23; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| acceptance report normalization cannot rewrite nested attested evidence | pf-final-5.log:24; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| final acceptance drops retained secret from ui-final-integrity | pf-final-5.log:25; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| final acceptance drops retained secret from evaluation | pf-final-5.log:26; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| final acceptance drops retained secret from report | pf-final-5.log:27; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| final acceptance drops retained secret from first-failure | pf-final-5.log:28; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| final acceptance drops retained secret from post-producer | pf-final-5.log:29; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| final acceptance drops retained secret from child-artifact | pf-final-5.log:30; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| standalone UI suite builds the current source before bootstrap and binds the binary | pf-final-5.log:31; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| standalone UI build failure stops bootstrap, exact cases, and qualification | pf-final-5.log:32; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| code-comments is the first and unique feature gate, with a fail-closed user-facing failure record | pf-final-5.log:33; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| native exact manifest contract is a unique 36th-set early feature gate | pf-final-5.log:34; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| rerun preserves the earliest first failure after canonical output replacement | pf-final-5.log:35; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| actual-mode fixture runs explicit 120 and rejects cleanup failure | pf-final-5.log:36; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| docs and release evidence record R3 without overclaiming gated tests | pf-final-5.log:37; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |
| PF04 actual preflight rejects canonical drift before artifact setup or later stages | pf-final-5.log:38; 위 명령; exit 1 | PASS | 이전 실행 관측; 최종 집계에 중복 합산하지 않음 |

## 검사 미진입 및 무출력 명령

| 항목 | 상태 | 근거 | 한계 |
| --- | --- | --- | --- |
| Policy 재개 첫 시도 | 검사 미진입, exit 1 | pf-policy-green.log / json: core canonical/source semantic binding drift | 개별 검사 0개; FAIL assertion 개수를 만들어내지 않음 |
| pf06-syntax-0 | 명령 PASS, exit 0 | pf06-syntax-0.log / json | 원출력 비어 있음; 개별 assertion 수 미집계 |
| pf06-syntax-1 | 명령 PASS, exit 0 | pf06-syntax-1.log / json | 원출력 비어 있음; 개별 assertion 수 미집계 |
| pf06-syntax-2 | 명령 PASS, exit 0 | pf06-syntax-2.log / json | 원출력 비어 있음; 개별 assertion 수 미집계 |
| pf06-syntax-3 | 명령 PASS, exit 0 | pf06-syntax-3.log / json | 원출력 비어 있음; 개별 assertion 수 미집계 |
| pf06-syntax-4 | 명령 PASS, exit 0 | pf06-syntax-4.log / json | 원출력 비어 있음; 개별 assertion 수 미집계 |
| pf06-syntax-5 | 명령 PASS, exit 0 | pf06-syntax-5.log / json | 원출력 비어 있음; 개별 assertion 수 미집계 |
| pf06-diff | 명령 PASS, exit 0 | pf06-diff.log / json | 원출력 비어 있음; 개별 assertion 수 미집계 |

## 수량·정리·미실행

입력 16로그 = 최종 6 + 이전 2 + 미진입 1 + 구문/공백 7. 개별 원출력 287행 = 최종 217 + 이전 70. 모든 summary pass/fail 수치와 개별 행 수를 대조했다. 상세 표는 295행 = 217 + 70 + 1 + 7이며 명령 메타표 16행은 별도다.

새 검증은 실행하지 않고 기존 로그만 읽었다. 이번 문서 작성에서 소유 fixture 정리 크기·부재를 별도 측정하지 않았으므로 cleanup 완료를 새로 주장하지 않는다. 로그·이 초안은 메인 소유 output에 보존하며 삭제하지 않았다. 실제 UI/서버/장시간/제품 전체 PASS·커밋·푸시는 이 기록의 범위가 아니다. token start/end/consumed는 실행 도구 계수 미제공으로 미집계다.
