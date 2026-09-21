# LP30 보조 이동 진단·단기 검증 전수

독자: 검증 유지보수자. lifecycle: 실행 이력. 정책은 AGENTS.md, 중앙 기록은 docs/release-test-records.md다.

원출력·명령·exit·시각·최초 준비 실패·등록 전 실행은 [구조화 결과](lp30-navigation-result.json)와 [전체 보존물](lp30-navigation-evidence.json.gz)에 보존한다. 아래는 등록 후 현재 소스의 개별 단기 검사이며 실제 UI 전체 PASS가 아니다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| nav-registered-green: LD-path-auth diagnostic path omission preserves authoritative evaluation | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: LD-path-case-variants diagnostic path omission preserves authoritative evaluation | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: LD-path-correlation diagnostic path omission preserves authoritative evaluation | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: LD-path-raw-request diagnostic path omission preserves authoritative evaluation | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: LD-path-raw-response diagnostic path omission preserves authoritative evaluation | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: LD-path-normal diagnostic path omission preserves authoritative evaluation | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: LD-path-parent full child validator accepts omission and rejects raw sensitive path | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: LD-mapped lifecycle diagnostic identity terminal and seal evidence | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: LD-finished lifecycle diagnostic identity terminal and seal evidence | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: LD-failed lifecycle diagnostic identity terminal and seal evidence | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: LD-unmapped diagnostic missing mapping remains explicit and method is restricted | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: LD-diagnostic-error cannot prevent authoritative capture or change failure | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: native callbacks use the capture-only recorder as lifecycle authority | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: theme init script persists preference without touching an unparsed document | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: local link actions bind one owned document navigation | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: browser role roundtrip follows application redirects to terminal response | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: successful case settles the cleanup request snapshot before physical browser close | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: request-first and route-first exact action binding fail closed without global fallback | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: legacy request evidence preserves every exact tuple without evaluator authority | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: invocation begin/end events use one independent case-local total order | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: constant clocks still produce strictly monotonic cross-kind invocation timestamps | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: request capture timestamps advance the invocation watermark before end | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: navigation and action capture projections exclude load subresources by exact request kind | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: active action scopes claim only exact request owners and their document redirects | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: missing invite runtime-secret sink keeps failure evidence and a safe fallback shape | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: adapter lifecycle ledger is exact-object, sealed, memoized, and JSON-safe | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: adapter integration carries the four actual-like lifecycle graphs end to end | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: request lifecycle invocation identity separates phases for one semantic action | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: bundled Playwright module resolves with provenance | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: explicit missing module fails without fallback | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: Playwright timeout attestation uses class identity instead of mutable error name | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: selector owner reveal keeps plain CSS in the Playwright locator engine | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: UI-008 Playwright has-text selector never reaches native querySelector | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: selector owner reveal opens only the selected target closed details owner | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: selector owner reveal waits for dynamic attachment before owner evaluation | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: selector owner reveal fails closed for zero candidates and preserves first of many | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: selector owner reveal preserves exact text selector identity and rejects wrong text | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: shared adapter impact census covers all canonical 424 cases and the fixed remaining 125 | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: navigation completion binds post-action visuals to the declared final document | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: all redirecting document cases bind destination controls and forbid stale source rewait | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: UI-002 through UI-007 existing canonical cases have explicit post-action lifecycle coverage | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: post-action lifecycle separates UI-002 source control from the redirect destination | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: legacy destination wait helper remains redirect-scoped | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: runtime control observation separates canonical identity from fixture-qualified owner | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: post-action lifecycle fails closed for missing destination and wrong destination route | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: post-action lifecycle waits only for the destination selector after redirect | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: post-action destination wait failures retain structured fail-closed evidence | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: post-action visual measurement never re-waits a detached source owner | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: exact runner preserves visible same-route source owners and binds all destination owners | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: canonical selector dialect audit leaves no Playwright selector path in native DOM APIs | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: adapter exposes native wait click fill type select screenshot | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: route-injected application correlation survives request-start to response binding | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: explicit inner correlation precedence is registry-bound and leak-free | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: Playwright response events bind only to the exact initiating request object | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: document form responses bind exact request identity and redirect chain | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: fixture responses use an exact opaque initiating request handle | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: whoami observation keeps setup-required and unauthorized sessions anonymous | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: native browser child strips acceptance secrets | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: issued invite tokens are registered and redacted at every evidence boundary | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: endpoint-owned response fixtures cover the product response fields | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: endpoint-owned full product responses are projected only through the Playwright response listener | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: Ops timeline response projection preserves only safe EventRecord identity | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: client WebRTC session responses retain only the safe protocol completion shape | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: client WebRTC session projections reject wrong status and malformed success shapes | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: endpoint-owned non-success responses fail before success-shape projection with redacted status diagnostics | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: endpoint-owned sensitive response fields fail closed with redacted field-path diagnostics | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: AUTH public lifecycle fields accept exact public types and reject type drift | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: live session evidence preserves request view and response session identity | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: visual focus sampling preserves exact DOM identity and stops before a repeated owner | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: live visual sampling keeps serializable video evidence separate from the DOM element | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: live visual capture scrolls the target and tile union by the minimum bounded delta | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: browser resource console errors bind one exact Playwright response and fail closed on duplicates | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: UI runner selects native Playwright and rejects CDP promotion | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: server dispatch and docs expose reproducible native commands | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: historical action record consistency matches retained summary report and PNG | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: current UI suite state does not reuse stale native evidence | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: dashboard marker response projection keeps only digests and fails closed | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: NAV01 auxiliary readback navigation awaits pending snapshot before goto | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: NAV02 auxiliary snapshot timeout prevents goto | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: NAV03 user navigation bypasses auxiliary snapshot wait | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: NAV04 missing response and unfinished safe body remain failures | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: NAV05 unsealed auxiliary snapshot preserves next document capture and cleanup seal | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| nav-registered-green: NAV06 snapshot preserves default observation quiet period and timeout | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: event review renderer materializes the exact product query envelope | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: event review renderer owns and awaits one dedicated product fetch | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: page-owned refresh does not require an unused action context | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: fixture-derived literals use one serializable non-RegExp matcher | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: canonical exact runtime has zero dynamic RegExp constructors | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: owner/provenance baseline registration rejects duplicate declared owners | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: EVT-025 response provenance selects one fixture row only inside sourceHealth | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: EVT-041 typed owner uses documentId and preserves sourceId type/value | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: EVT-041 DOM projection binds one typed memorySearch hit to one rendered node | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: EVT-041 product refresh binds one initiating request/response to the rendered owner | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: EVT-070 request provenance binds one Playwright request/response identity and exact query map | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: incident memory search response evidence is typed, identity-bound, and digest-only | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: event review descendant capture reaches the semantic evaluator and mutations fail closed | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: EVT-004 marker lifecycle distinguishes hook, file, response, timeline, and DOM failures | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: declared visible-control values are applied by the exact runtime before observation | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: EVT-004 test-owned marker digest reaches the DOM evaluator without EventRecord lifecycle crossover | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: EVT-004 removes only acceptance-owned canonical timeline residue | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: EVT-004 marker isolation accepts an already-drained prior-case residue | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: EVT-004 correlation is request-scoped to one authoritative log-tail fetch | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: EVT-004 marker flow binds one authoritative response row to one visible timeline node | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: EVT-004 marker evaluator is single-shot after correlation and DOM readiness | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: EVT DOM semantic composite distinguishes safe failure evidence without raw values | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: missing legacy DOM baselines use strict response-derived renderer projection | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: declared fixed remaining owners replace missing baselines without recursive field search | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: EVT-003 source-health baseline is row-local to the acceptance-owned source | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: response-backed DOM targets do not inherit unrelated whole-response baselines | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: request semantic assertion evidence contains only bound digests and typed metadata | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: EVT-003 API row and DOM identity bind to the same degraded source | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: EVT-023 binds one authoritative event row to one Ops timeline row | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: EVT-026 reuses the exact EventRecord lifecycle preservation contract | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: EVT-026 owned refresh reads the adapter renderObservation lifecycle | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: exact DOM attributes bind to the selected event row and fail closed | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: response pseudo-fields include status and reject an invalid status assertion | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: GET response correlation, debug leaf policy, and nested attribute owners fail closed | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: EVT-001 actual response counts and DOM projections pass | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: EVT-024 executes all three bounded samples with authoritative baseline binding | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: requested EVT binding scope is complete and excludes specialized mutation paths | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: cross-route primary action verifies source catalog and restores destination | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: cross-route source and restore navigation failures are fail-closed | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: API source assertions use one fetch on the current screen without document navigation | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: API fetch and screen preparation failures remain fail-closed without duplicate requests | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: already executed primary action is not dispatched twice | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: native primary control binding is enforced independently of route root | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: required current-route primary control waits before its snapshot | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: required hidden primary control waits for attachment without demanding visibility | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: required current-route primary control keeps timeout and post-wait failures fail-closed | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: required current-route primary control still rejects hidden and disabled snapshots | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: route mismatch and not-applicable primary controls do not wait or replay | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: source-route navigation waits for async primary control and restores on success and failure | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: core object-form requiredAttributes are enforced | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: HTML redaction code is distinct from embedded forbidden response fields | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: response redaction separates UI-068 narrative labels from structured material | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: endpoint-owned mutation requires the actual method/path/status/correlation response | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: catalog runtime mutation binds the declared action request object instead of a path peer | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: DOM redaction labels are distinct from exposed credential values | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: client/viewer boundary labels are distinct from enabled exposure material | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: no-write/provider labels are distinct from enabled capability material | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: all negative-boundary families distinguish narrative, inactive, and active material | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: status and response semantic drift are rejected | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: DOM response mismatch and forbidden network are rejected | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: CLIENT fixture materialization binds assigned and blocked views independently | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: client media readiness and nullable fields preserve their product ownership | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: SAFE DOM structure/material and external capability boundaries are enforced | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: CLIENT control sequence binds POST session id to DELETE and DOM history | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: CLIENT composed sessions are UI-created and VA sample bindings fail closed | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: CLIENT-021 waits for bound product VA event projection and fails closed | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R01: EVT-048 binds a deterministic response-derived baseline to current catalog state | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R02: latest runner-start RED is bound before canonical case execution | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R02: latest actual UI-002 RED is SHA-bound | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R02: canonical 424/391/11 lifecycle census is exhaustive | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R02: request facts select exactly one authoritative tuple | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R02: UI-001 bootstrap redirect is an actual-like initial page-load chain | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R02: 9 redirects and 2 same-route rejections keep primary POST 1/1 | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R02: wrong tuple object action mixing duplicate and leak fail closed | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R02: latest actual trace passes the common ledger binding | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R02: runtime-materialized primary path binds without changing action identity | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R02: runtime response evidence preserves the primary action request template | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R02: implementation has no case or path allowlist | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R03: latest SHA-bound UI-009 actual remains the focused RED | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R03: canonical 424 cases have one exact non-nested ownership sequence | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R03: missing, duplicate, nested, stale, wrong binding, and cleanup fail closed | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |
| R03: runner/runtime/adapter callsites use explicit begin-register-end-cleanup ownership | 해당 명령의 실제 assertion, 원출력 연결 | PASS | 등록 후 실행 |

| 경로 | 종류 | 삭제 전 크기 | 조치 | 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| /private/tmp/media-server-lp30.lgFabk | 실행 소유 자료·임시 cache | 3292411B | 필요한 증거 보존 후 삭제 | 부재 확인 | 소유 PID 종료·포트 재바인딩·277링크 대상 유지 |
| /Users/dhseo/Workspace/mediaServer/.media_server.test/v3.9.0/ui-diagnostic-sweep/lp30-evt058-a | 실행 소유 자료·임시 cache | 14915500B | 필요한 증거 보존 후 삭제 | 부재 확인 | 소유 PID 종료·포트 재바인딩·0링크 대상 유지 |
