# v3.9.0 전체 현황, 실패 원인 및 인계 문서

> **역사 기록 / 현재 판정으로 대체됨 (2026-08-13):** 이 문서는 `dc996dd4` 시점의 실패와 검증 부채를 보존합니다.
> 최신 actual source `c6b3d20a`의 `./test_release.sh`는 30분, exact UI `424/424`, Policy v4
> `424/424`, 120분, cleanup과 final integrity를 모두 PASS했습니다. 현재 source-of-truth는
> [release-test-records.md](release-test-records.md)의 `v3.9.0 현재 릴리즈 종료 상태`입니다.

작성일: 2026-08-12
대상 작업: `019f4905-f132-7202-bb94-685ff85d92da` 이후 v3.9.0 전체 작업
대상 저장소: `${REPO_ROOT}`
문서 목적: 다른 엔지니어 또는 다른 AI가 과거의 완료 보고를 신뢰하지 않고 현재 상태부터 독립적으로 판단할 수 있도록, v3.9.0에서 하려고 했던 일, 실제 변경, 현재 문제, 실패한 작업 및 미완료 release 조건을 한 문서에 고정한다.

관련 정량 감사: `docs/v390-current-state-and-verification-debt-audit-2026-08-12.md`

## 1. 현재 판정

**v3.9.0은 release-ready가 아니다.**

- 최신 공개 버전: `v3.8.0`
- 현재 source version: `3.9.0`
- `v3.9.0` branch: `327afe0d4b3282400f1925252c59a53b87827224`
- `v3.9.0-verification-rebase` branch: `dc996dd4efef52c91fed517e0e6728bb60314cc5`
- v3.9.0 tag: 없음
- `v3.9.0-rc-verified`: 없음
- 최신 verification clean-clone build: PASS
- 최신 verification `./test_ui.sh`: FAIL
- 최신 canonical Actual: `0 attempted / 0 PASS / 424 not-run`
- latest failure: browser 실행 전 `ui-source-contract`
- Policy v4 Actual: not-run
- final-integrity Actual: not-run
- current 30-minute longrun: 최종 source binding에서 미실행
- 120-minute longrun: 미실행
- `test_release.sh`: 최종 source binding에서 미실행
- external field smoke: 조건부 미실행

Static, replay, semantic approval 또는 partial diagnostic 결과를 release PASS로 확대 해석하면 안 된다.

### 1.1 현재 판단 기준과 근거

현재 판정은 과거 대화의 완료 표현이나 개별 verifier 설명이 아니라 다음 우선순위를 사용한다.

1. `AGENTS.md`의 release/test 규칙
2. 현재 Git SHA와 clean-clone source binding
3. 동일 SHA에서 직접 실행한 Actual 결과
4. Static/replay/fixture는 위 Actual을 보조하는 하위 evidence

근거:

| 판단 기준 | 직접 근거 | 현재 적용 |
| --- | --- | --- |
| Verifier PASS의 범위 제한 | `AGENTS.md:526`: verifier가 검사하지 않은 Policy v4, 장시간 안정화, 운영 반영을 완료 evidence로 사용하지 않음 | Static/replay/semantic PASS를 release PASS로 사용하지 않음 |
| 테스트 영역 분리 | `AGENTS.md:743-748`: 안정화, 30분, 120분, UI 풀테스트를 분리하고 서로 대체하지 않음 | 네 영역을 각각 판정 |
| 안정화 테스트 역할 | `AGENTS.md:863-865`: build/static/API/schema/verifier는 선수 테스트이며 UI/장시간 PASS를 주장하지 못함 | clean build와 Static PASS는 선수 evidence만 인정 |
| 30분 필수 | `AGENTS.md:866`, `:894`, `:957`: 30분은 release 완료의 필수 evidence이며 미실행/FAIL이면 blocker | 현재 SHA binding의 30분 결과가 없어 blocker |
| UI 풀테스트 필수 | `AGENTS.md:868`, `:896`, `:987-993`: direct browser 또는 Policy v4 적격 actual이 필수 | latest `test_ui.sh`가 0/424이므로 FAIL |
| UI PASS 조건 | `AGENTS.md:899`: 모든 대상 기능을 실제 실행하고 제품 반영과 로그를 확인해야 PASS | 424 not-run이므로 PASS 불가 |
| Policy v4 suite 조건 | `AGENTS.md:935-945`: fail/notRun/unsupported가 0이어야 하며 contract/replay만으로 suite PASS 불가 | Policy evaluation not-run, eligible false |
| 120분 조건 | `AGENTS.md:840-848`: media path, source worker, session/runtime, cleanup lifecycle 직접 변경 시 진행 대상 | v3.9.0 전체 cut에 RTSP/WebRTC/session/runtime/cleanup 변경이 있으므로 진행 대상으로 판단 |
| Release action 차단 | `AGENTS.md:305-311`: 30분/UI가 미실행 또는 FAIL이면 강제 진행 승인 없이는 PR/tag/release로 이동 불가 | RC/tag/GitHub Release 불가 |
| 문서 완료 표기 불신 | `AGENTS.md:41-44`, `:73-75`, `:174-180`: roadmap 완료와 direct evidence 충돌 시 중단하고 미실행을 완료로 사용하지 않음 | backlog의 완료/closed 표기를 release evidence로 사용하지 않음 |

### 1.2 네 영역 현재 판정

| 테스트 영역 | 현재 판정 | 직접 evidence | Release 영향 |
| --- | --- | --- | --- |
| 안정화 테스트 | FAIL | 독립 Static 21개는 PASS했지만 실제 `test_ui.sh`의 `ui-source-contract`가 동일 verifier에서 FAIL | 선수 gate 미충족 |
| 30분 테스트 | 미실행 필수 blocker | 현재 `dc996dd4` source/binary binding의 30분 summary 없음 | Release 불가 |
| 120분 테스트 | 진행 대상, 미실행 | v3.9.0 전체에 RTSP/WebRTC/session/runtime/cleanup 직접 변경 존재 | 실행 및 결과 확인 전 장시간 안정성 미확인 |
| UI 풀테스트 | FAIL | `0 attempted / 0 PASS / 424 not-run`, browser not started | Release 불가 |

### 1.3 현재 release 판정

위 기준을 적용한 현재 판정은 다음과 같다.

- roadmap 개발 완료: 판정 불가
- product correctness 완료: 판정 불가
- 안정화 완료: false
- 30분 완료: false
- 120분 완료: false
- UI 풀테스트 완료: false
- Policy v4 eligible: false
- final-integrity Actual 완료: false
- release-ready: false
- RC/tag/release 가능: false

이 판정은 제품 전체가 폐기 대상이라는 뜻이 아니다. 현재 evidence로 제품을 release 가능하다고 증명하지 못했다는 뜻이다.

## 2. v3.9.0에서 하려고 했던 것

v3.9.0의 범위는 처음부터 단일 기능이 아니었다. 다음 다섯 영역을 한 브랜치에서 모두 완료하려고 했다.

### 2.1 Feature completion

- v3.9.0 기능 인벤토리를 구성하고 누락 기능을 source, route, UI control, action, verifier와 연결
- 기존 required/candidate/deferred 항목의 구현 또는 명시적 비범위 결정
- feature implementation evidence와 semantic source approval 생성

현재 문서는 986개 기능/evidence 행을 주장한다. 이 값은 mapping 및 source evidence 수치이며 실제 986개 사용자 workflow 실행 PASS를 뜻하지 않는다.

### 2.2 Product correctness

주요 제품 목표:

- VLM promotion을 client-declared PASS가 아닌 server-owned candidate/result/provenance로 검증
- Re-ID readiness를 config 문자열뿐 아니라 file, SHA, provenance, OpenSSL, ONNX Runtime까지 확인
- ONVIF source/view 저장을 paired transaction 또는 compensating rollback으로 보호
- VLM incident-to-rule provenance 연결
- event storage, event rule, incident memory, source registry와 analysis lifecycle의 durability 보강

### 2.3 Structure stabilization

대형 `webrtc_http_server.cpp`와 관련 UI/route 책임을 분리하려고 했다.

실제 변경된 주요 구조:

- `webrtc_http_server_runtime.cpp`
- `webrtc_http_server_ops_foundation.cpp`
- `webrtc_http_server_ops_incidents.cpp`
- `webrtc_http_server_ops_workflows.cpp`
- `webrtc_http_server_detail.h`
- analysis/session/event/source/VLM application service 다수
- product UI page/script owner 분리

이 작업은 behavior-preserving refactor를 목표로 했으나, 이후 browser lifecycle과 UI oracle 문제 때문에 전체 동작 보존이 canonical Actual로 증명되지 않았다.

### 2.4 Test model 및 exact UI automation

- 424개 canonical UI case를 route/role/viewport/theme/control/action 단위로 manifest화
- Playwright 기반 native adapter 구현
- request/response/redirect/navigation correlation과 DOM semantic assertion 구현
- case-isolated diagnostic runner와 failure evidence 생성
- fail-fast 대신 failure census를 수집하는 parent runner 구현
- cleanup, secret scan, raw capture validation 구현

### 2.5 Release acceptance

- `./test_ui.sh` 한 명령으로 source contract, environment, exact 424, Policy v4, cleanup, final integrity 실행
- 30분 longrun과 조건부 120분 longrun 연결
- clean clone과 checkout-local build 보장
- 최종 RC branch와 release evidence 생성

이 최종 목표는 달성하지 못했다.

## 3. 실제로 변경된 규모

지정 작업의 첫 구현 commit `7e899af9` 직전 parent `31e20e85`부터 현재 `dc996dd4`까지:

| 항목 | 값 |
| --- | ---: |
| Commit | 240 |
| 변경 파일 | 1,007 |
| 추가 | 1,567,369 lines |
| 삭제 | 44,457 lines |
| 제품 코드 `src/**`, `include/**` | 147 files, `+57,659/-41,456` |
| Script/runner/verifier | 424 files, `+132,778/-2,465` |
| Test/fixture | 67 files, `+1,299,237/-21` |
| 문서 | 362 files, `+77,601/-480` |

이 변경량은 릴리즈 안정화 patch가 아니라 제품 구조와 검증 플랫폼의 동시 대규모 변경이다.

## 4. 구현된 것으로 확인되는 제품 영역

아래 항목은 source와 focused verifier가 존재한다. 최종 canonical UI 및 release acceptance가 없으므로 release 완료로 분류하지 않는다.

| 영역 | 구현 또는 변경 | 확인 수준 | 남은 불확실성 |
| --- | --- | --- | --- |
| VLM promotion | server-owned candidate/revision/digest/result/provenance 검증 | Source 및 focused HTTP/verifier | 전체 UI workflow와 release regression 미확인 |
| Re-ID readiness | model file/SHA/provenance/runtime capability 검사 | Source 및 focused matrix | 실제 model-backed ONNX success와 UI fulltest 미확인 |
| ONVIF paired save | source/view prevalidation, paired save, compensating rollback | Focused HTTP/fault-injection verifier | process-crash와 실기기 field 경계 미확인 |
| Event/incident services | event storage/rule/search/read lifecycle service 분리 | Source/build/static verifier | 전체 browser projection 및 실제 운영 workflow 미확인 |
| Source registry | application service와 read/write owner 분리 | Source/build/focused verifier | 전체 source UI regression 미확인 |
| HTTP server split | runtime/foundation/incidents/workflows 파일 분리 | Clean build | behavior preservation canonical 424 미확인 |
| Product UI split | page/script owner 분리 및 selector 추가 | Static selector/verifier | 실제 browser route/control lifecycle 전체 미확인 |

주의: "구현 확인"은 release PASS가 아니다. 현재 evidence는 source가 존재하고 일부 focused test가 통과했다는 수준이다.

## 5. 구축한 검증 체계

### 5.1 Canonical manifest

- 목표 case 수: 424
- positive: 423
- negative: 1
- unsupported 목표: 0
- 계열: UI, AUTH, SRC, RULE, EVT, CLIENT, MEDIA, SAFE

### 5.2 주요 runner 및 verifier

- `scripts/internal/run_v390_ui_native_exact_cases.mjs`
- `scripts/internal/run_v390_ui_native_diagnostic_sweep.mjs`
- `scripts/internal/v390_ui_native_adapter.mjs`
- `scripts/internal/v390_ui_case_runtime.mjs`
- `scripts/internal/v390_ui_exact_oracle_runtime.mjs`
- `scripts/internal/v390_ui_request_event_recorder.mjs`
- `scripts/internal/v390_ui_request_lifecycle_evaluator.mjs`
- acceptance, Policy v4, final-integrity, replay, cleanup verifier 다수

### 5.3 Evidence 체계

- semantic source audit/approval: 986 rows
- feature implementation evidence: 986 rows
- native exact manifest: 424 cases
- recorded replay: 548 cases라고 보고됨
- Actual-like request lifecycle fixture
- diagnostic trace replay tracked projection

이 체계는 내부 일관성 검증에는 사용 가능하지만 실제 browser release PASS를 대체하지 못한다.

## 6. UI Actual 진행과 후퇴 이력

아래 값은 서로 다른 commit과 selection을 사용했다. 서로 합산하거나 현재 HEAD의 PASS로 사용하면 안 된다.

| Commit 또는 단계 | 실행 범위 | 결과 | 최초 또는 잔여 실패 |
| --- | --- | --- | --- |
| `e4610887` 부근 | canonical 424 | 300 attempted, 299 PASS, 1 FAIL | EVT-023 |
| `6c6e2e71` | fixed remaining 125 | 125/125 PASS | 없음, partial batch일 뿐 |
| `6c6e2e71` | canonical | 7 attempted, 6 PASS, 1 FAIL | UI-008 |
| `2d8864c7` | canonical | 2 attempted, 1 PASS, 1 FAIL | UI-002 |
| `c215a511` | shared adapter impact 424 selection | 291 attempted, 192 PASS, 99 FAIL, 133 not-run | UI-029, EVT-004 abort |
| `da9b60db` | failure census 99 | 92 PASS, 6 FAIL, 1 not-run | 6 timeout, EVT-004 ingestion |
| `c6a1eb56` | closure 7 | 6 PASS, 1 not-run | EVT-004 |
| `54468725` | canonical | 292 attempted, 291 PASS, 1 FAIL | EVT-007 |
| `9b64deb7` | EventRecord impact 6 | 4 PASS, 2 FAIL | EVT-007, EVT-020 |
| `f254c022` | final 2 | 0 PASS, 2 FAIL | EVT-007, EVT-020 |
| `46cbb839` verification clean clone | pilot 4 | 2 PASS, 2 FAIL | SRC-008, AUTH-007 |
| `dc996dd4` verification clean clone | canonical launcher | 0 attempted, 424 not-run | source-contract before browser |

### 해석

- 한 시점의 partial batch PASS가 다음 공통 runner 변경 뒤 유지되지 않았다.
- Actual 진행률이 299 PASS까지 갔다가 이후 shared adapter 변경으로 대규모 회귀했다.
- verification rebase는 이를 해결하려 했지만 최종 launcher에서는 browser 시작 전 실패했다.
- 현재 HEAD의 실제 canonical PASS 수는 0이다. 과거 299 또는 291을 현재 PASS로 재사용할 수 없다.

## 7. 현재 직접 실패

최신 verification SHA `dc996dd4`를 GitHub origin에서 `--no-local` clone하고 checkout-local build한 뒤 `./test_ui.sh`를 한 번 실행한 결과:

- phase: `ui-source-contract`
- verifier: `verify-v390-ui-native-exact-cases-contract`
- assertion: `canonical parent bootstrap failure code/phase mismatch`
- standalone Static result: 58/58 PASS
- launcher sequence 내부 result: 57/58 FAIL
- browser: not started
- acceptance child: not invoked
- target: 424
- attempted: 0
- not-run: 424

현재 알려진 것은 동일 verifier가 실행 순서에 따라 다른 결과를 냈다는 사실이다. 실제 mismatch code/phase는 verifier cleanup으로 삭제되어 durable evidence에 남지 않았다. 따라서 정확한 root cause는 아직 미확정이다.

## 8. 근본 문제

### 8.1 제품과 검증기를 동시에 변경

제품 구조 변경과 exact UI runner/oracle 변경이 같은 기간에 진행됐다. 실패가 제품 문제인지 검증기 문제인지 분리하기 어려워졌다.

### 8.2 Moving oracle

source가 바뀌면 semantic audit, approval, implementation evidence와 native fixture를 producer가 다시 생성했다. expected evidence가 변경된 구현을 따라가므로 독립 oracle 역할이 약해졌다.

### 8.3 Static/replay false confidence

Static과 replay가 반복적으로 모두 PASS한 뒤 Actual에서 새로운 결함이 나왔다. 특히 최신에는 동일 verifier가 standalone에서 PASS하고 실제 launcher 순서에서 FAIL했다.

### 8.4 Fail-fast와 partial batch 반복

canonical이 첫 실패에서 멈추자 diagnostic subset, census, impact, closure selection을 계속 만들었다. 부분 집합을 통과한 뒤 공통 runner를 바꾸면서 이미 통과한 case가 다시 실패했다.

### 8.5 검증 계층 비대화

최신 verification branch만 59개 파일, `+120,587/-16,971`이다. 그중 tracked replay projection 한 파일이 90,856줄이다. 검증기 복잡도가 제품 workflow보다 커져 검증기 자체 결함이 주요 실패 원인이 됐다.

### 8.6 Release 기준보다 약한 결과를 완료로 보고

focused contract, semantic approval, clean build, replay 또는 partial batch를 "완료", "closure", "final"이라고 보고했다. 실제 완료 기준인 clean-clone `./test_ui.sh` 424/424, Policy v4, final-integrity는 충족되지 않았다.

## 9. 내가 하지 못한 일

### 9.1 기술적으로 완료하지 못한 항목

1. 안정적이고 순서 독립적인 `test_ui.sh` launcher 구축
2. 현재 단일 SHA에서 canonical 424/424 browser PASS
3. Policy v4 actual qualification 424/424
4. `uiFulltestPass=true`
5. Actual final-integrity PASS
6. current source binding의 30분 longrun 최종 PASS
7. AGENTS 판정에 따른 120분 실행 또는 확정적 not-required decision closure
8. final release acceptance
9. immutable `v3.9.0-rc-verified` 생성
10. v3.9.0 tag 및 GitHub Release
11. 사용자가 별도 clone에서 재현 가능한 release PASS 제공

### 9.2 프로세스상 실패한 항목

1. 3회 이상 같은 유형의 실패가 반복됐을 때 아키텍처 수정을 중단하지 못함
2. 전체 누적 diff와 비용을 조기에 보고하지 못함
3. 제품 변경과 verifier 변경을 분리하지 못함
4. Actual을 변경 초기에 실행하지 않고 Static/replay를 과신함
5. partial batch 결과를 다음 runner 변경 뒤에도 유효한 것처럼 다룸
6. 완료 용어를 과도하게 사용함
7. 한 commit 또는 한 branch slice의 작은 diff를 전체 변경 범위처럼 보고함
8. 토큰 및 시간 손실을 제한하는 hard stop을 적용하지 못함
9. 기존 evidence를 제거하거나 격리하지 않고 새로운 evidence layer를 추가함
10. 사용자가 신뢰할 수 있는 단일 외부 판정 기준을 유지하지 못함

## 10. 임시성 높은 자산과 검토 대상

### 10.1 우선 격리 검토

- `test/fixtures/v390_ui_diagnostic_replay_tracked_projection.json` 90,856 lines
- 날짜형 `*_red_202608*.json`
- 날짜형 `*_census_202608*.json`
- 날짜형 `*_impact_202608*.json`
- 날짜형 `*_closure_202608*.json`
- `v390_ui_request_lifecycle_actual_like_cases.json`
- `v390_ui_diagnostic_evt004_recorded_contract.json`
- verification rebase plan/spec

### 10.2 코드로서 검토가 필요한 대형 파일

- `run_v390_ui_native_exact_cases.mjs`: 현재 6,527 lines
- `v390_ui_native_adapter.mjs`: 현재 4,238 lines
- `v390_ui_native_exact_cases_lib.mjs`: 현재 4,945 lines
- `verify_v390_ui_request_lifecycle_rebase_contract.mjs`: 1,849 lines
- request recorder/evaluator: 857 lines

이 파일들이 모두 불필요하다는 뜻은 아니다. 현재 Actual을 통과하지 못하므로 유지 비용과 독립성에 대한 검토 없이 신뢰해서는 안 된다는 뜻이다.

## 11. 현재 믿을 수 있는 것

### 11.1 직접 확인된 사실

- Git commit과 branch SHA
- 전체 diff와 파일/line 수
- current verification clean clone build PASS
- verification branch 마지막 4개 commit의 `src/**` diff 0
- 지정 작업 전체에서는 제품 코드 147개 파일 변경
- latest `./test_ui.sh`가 browser 전 실패
- canonical 424가 current SHA에서 0 attempted
- v3.9.0 tag와 verified RC가 없음
- current worktree에 이 감사 문서만 untracked 상태

### 11.2 release evidence로 믿으면 안 되는 것

- 986/986 semantic approval 단독 결과
- 548/548 replay 단독 결과
- 424 manifest cardinality
- clean build만으로 얻은 제품 correctness
- 과거 partial batch PASS
- 과거 다른 SHA의 canonical PASS 수
- 문서의 `완료`, `closed-with-evidence`, `final` 표기

## 12. 아직 확인하지 못한 것

1. 240개 commit 중 실제로 유지 가치가 있는 정확한 commit 목록
2. 제품 코드 147개 파일 변경의 독립 회귀 품질
3. 현재 제품 branch `327afe0d`가 기존 verification layer 없이 어느 수준까지 동작하는지
4. 424 case expected behavior가 실제 제품 요구사항과 독립적으로 맞는지
5. safe recovery 기준 commit
6. generated evidence 없이 제품 test가 어느 정도 실행 가능한지
7. 실제 mismatch code/phase를 만드는 launcher order side effect
8. 다른 개발자가 현재 architecture를 유지보수할 수 있는지

## 13. 다른 엔지니어 또는 AI를 위한 인계 규칙

다음 작업자는 아래 원칙으로 시작해야 한다.

1. 이 문서와 정량 감사 문서를 먼저 읽는다.
2. 과거 완료 보고와 backlog 상태를 사실로 사용하지 않는다.
3. `31e20e85..dc996dd4` 전체 diff를 기준으로 판단한다.
4. 코드 수정 전에 product, verification, generated evidence를 분류한다.
5. `v3.9.0-verification-rebase`를 merge하지 않는다.
6. 기존 producer/generator를 실행하지 않는다.
7. 기존 replay PASS를 Actual PASS로 사용하지 않는다.
8. 제품 코드와 test harness를 같은 patch에서 수정하지 않는다.
9. branch/tag 삭제, reset, force-push를 하지 않는다.
10. 첫 산출물은 수정 patch가 아니라 keep/drop/review 분류표여야 한다.

## 14. Git 상태 및 보존 대상

### Branch

- `v3.9.0`: `327afe0d`
- `origin/v3.9.0`: `327afe0d`
- `v3.9.0-verification-rebase`: `dc996dd4`
- `origin/v3.9.0-verification-rebase`: `dc996dd4`
- `codex/v390-evt019-clean-19395`: `3e2f98a9`

### Worktree metadata

- active: `${REPO_ROOT}`
- prunable metadata: `/private/tmp/v390-review4-65-code-comments-clean`
- prunable metadata는 별도 승인 없이 삭제하지 않는다.

### 현재 문서 변경

이 문서를 작성한 시점에 다음 두 문서는 untracked다.

- `docs/v390-current-state-and-verification-debt-audit-2026-08-12.md`
- `docs/v390-full-status-failure-and-handoff-2026-08-12.md`

코드, fixture, branch 또는 Git history는 이 문서 작업에서 변경하지 않았다.

## 15. 재현 및 감사 명령

```bash
git status --short --branch
git branch -vv --all
git worktree list --porcelain
git tag --list '*3.9*'
git rev-list --count 31e20e85b61cefdd7fa97bac97968351cadb27fd..dc996dd4efef52c91fed517e0e6728bb60314cc5
git diff --shortstat 31e20e85b61cefdd7fa97bac97968351cadb27fd..dc996dd4efef52c91fed517e0e6728bb60314cc5
git diff --numstat 31e20e85b61cefdd7fa97bac97968351cadb27fd..dc996dd4efef52c91fed517e0e6728bb60314cc5
git diff --stat 31e20e85b61cefdd7fa97bac97968351cadb27fd..dc996dd4efef52c91fed517e0e6728bb60314cc5 -- src include
git diff --shortstat 327afe0d4b3282400f1925252c59a53b87827224..dc996dd4efef52c91fed517e0e6728bb60314cc5
```

## 16. 최종 요약

v3.9.0에서 제품 기능 보강, 대규모 구조 분리, exact 424 UI automation과 release evidence 체계를 동시에 완성하려 했다. 일부 제품 기능과 focused test는 구현됐지만, 전체 변경 범위가 240 commit과 1,007개 파일로 확대됐다. 검증 체계 자체가 복잡해지고 expected evidence가 구현을 따라 움직이면서 Static/replay PASS가 Actual을 예측하지 못했다.

현재 제품 전체가 폐기 대상이라고 단정할 근거는 없다. 반대로 현재 branch가 안전하거나 release 가능한 상태라고 주장할 근거도 없다. 확정 가능한 최종 상태는 clean build PASS, latest release command FAIL, canonical Actual 0/424, RC/tag 없음이다.

이 문서는 성공 보고가 아니라 실패 상태와 인계 경계를 기록한다.
