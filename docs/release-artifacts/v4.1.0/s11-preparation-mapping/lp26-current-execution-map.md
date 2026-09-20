# LP26 — 현행 기능별 실행 연결 선택

독자: v4.1.0 S11 검증 준비 담당자. 수명: LP26 코드 고정 및 최종 검증 선택까지.
정책은 AGENTS.md, 기능 등록·결과는 inventory/중앙 기록이 기준이다. 이 문서는 현재 소스를 읽어
명령과 oracle를 선택한 문서이며 신규 기능 ID 등록, 전수 coverage 또는 릴리즈 8표를 대체하지 않는다.
초기 [S00~09 매핑](s00-s09-mapping.md), [S10 매핑](s10-mapping.md),
[재사용 결정](reuse-decision.md)의 과거 실패·등록 공백을 삭제하지 않고 현재 연결만 보완한다.

## 1. 판독 기준과 실제 실행 상태

- 아래 `S01/…` 같은 이름은 **이 문서의 요구 위치 키**다. 중앙에 정식 등록된 신규 고정 ID가 아니다.
- 소스 행은 LP26 작성 시점 locator이며 assertion 문구/함수와 함께 찾는다. 한 줄의 조건·파일 존재는 복합 요구 전체 PASS가 아니다.
- 직접 focused runner 존재, 5단계 통합 포함, 실제 장시간/UI 실행을 별도 열로 취급한다.
- legacy V1 compatibility 검사와 현재 managed V2 생산 검사를 이어 붙여 단일 동일 실행 PASS로 만들지 않는다.
- 이번 매핑 작업에서는 수정 대상 문서 두 개 외 코드 변경·테스트·빌드·브라우저·커밋·푸시를 수행하지 않았다.

| 범위 | 확인된 현재 상태 | 직접 근거·한계 |
| --- | --- | --- |
| 현행 5단계 통합 | 기존 LP25 실행에서 각 child exit0, currentIntegrationExecutionPass=true | [LP25 실제 로그](lp25-current-integration-02.txt): 35/40/10/46/25 checks. 이번 매핑에서 재실행하지 않음 |
| 현행 observer 자체검사·실제 단기 준비 | LP26 최종 자체검사60, 실제 단기71 PASS 기록 존재 | [자체검사](lp26-observer-shared-self.log), [실제 단기](lp26-observer-shared-app-final.log). 실제 실행46.599초·관측30.155초이며 30분/120분이 아님 |
| 현행 UI seed/auth 준비 | managed seed·20개 auth 준비·관련 helper 결과 기록 존재 | [LP26 준비 결과](lp26-verifier-preparation.md). wrapper 환경 격리 보완의 최종 유효성은 메인의 해당 재검증 기록 기준 |
| 30분/120분 | LP26 실제 미실행 | 명령 연결과 `finish()` 단위시험은 실제 duration/자원 추세 증거가 아님 |
| 실제 브라우저 | LP26 미실행 | seed, VM, HTTP API, native media 생성은 control/action·시각 증거가 아님 |
| ENV12 실제 플랫폼 검사 | 이번 미실행·영속 통합 runner 공백 | 과거 cold/warm·44 factory·READY/decode 결과를 현재 PASS로 승격하지 않음 |

## 2. 초기 S01~04 prose → 직접 assertion

명령 별칭은 아래와 같다. 모두 실제 존재하는 직접 진입점이며 이 표 자체는 실행 승인이 아니다.

| 별칭 | 정확한 명령 | 소스 |
| --- | --- | --- |
| C | `bash scripts/internal/verify_v410_recording_contracts.sh` | [recording_contract_smoke.cpp](../../../../scripts/internal/recording_contract_smoke.cpp) |
| W | `bash scripts/internal/verify_v410_recording_recorder.sh` | [recording_segment_writer_smoke.cpp](../../../../scripts/internal/recording_segment_writer_smoke.cpp) |
| J | `bash scripts/internal/verify_v410_recording_catalog.sh` | [recording_catalog_smoke.cpp](../../../../scripts/internal/recording_catalog_smoke.cpp) |
| R | `bash scripts/internal/verify_v410_recording_retention.sh` | [recording_retention_smoke.cpp](../../../../scripts/internal/recording_retention_smoke.cpp) |
| MW | `bash scripts/internal/verify_recording_managed_writer.sh` | [recording_managed_writer_smoke.cpp](../../../../scripts/internal/recording_managed_writer_smoke.cpp) |
| RV2 | `bash scripts/internal/verify_recording_retention_v2.sh` | [recording_retention_v2_smoke.cpp](../../../../scripts/internal/recording_retention_v2_smoke.cpp) |
| DC | `bash scripts/internal/verify_recording_default_composition.sh` | [recording_default_composition_smoke.cpp](../../../../scripts/internal/recording_default_composition_smoke.cpp) |

초기 요구 원문은 [계획 Task1~4](../../../superpowers/plans/2026-09-02-v410-recording-foundation-implementation-plan.md)의
548/674/792/901행 이후 RED 요구다. 아래는 정식 ID를 새로 발급하지 않고 각각의 현재 검사와 남는 경계를 결박한다.

| 요구 위치 키·초기 요구 | runner·현재 assertion 근거 | 현행 계약/공백 |
| --- | --- | --- |
| S01/opaque: 빈 값·path·rowid 거부 | C 175~178행 `ValidateOpaqueId` | 생성 opaque ID. 숫자 source/channel은 별도 numeric-reference runner; 혼동 금지 |
| S01/time: UTC 반개구간·PTS/timebase | C 180~182행 반개구간, 193~216행 semantic/round-trip | V1 기준; C `V2Cases` 97~109행은 후퇴 mapping·int64·null·UTC0 추가 검사 |
| S01/additive: optional field 후 known 보존 | C `ExpectCanonicalRoundTrip` 55~58행, 203행 | V1 호환성. V2의 strict 필드 정책을 이 요구로 완화하지 않음 |
| S01/lifecycle: unknown 비재생 | C 223~227행 parse/Unknown/IsPlayable | 직접 검사 존재 |
| S01/golden: serialize/parse semantic parity | C `ExpectCanonicalRoundTrip` 42~83행, 네 golden 파일 호출 | golden 성공은 actual writer/current app 성공과 별도 |
| S01/tombstone: 삭제 ID 재사용 거부 | C 289~292행 `CanCreateSegmentId` | V1 함수 계약; managed 예약/원장 재사용은 J의 S10-O/SW와 추가 결박 필요 |
| S02/disabled: global/channel off 생산0 | W 138행 `ShouldStartRecording`; DC 195행 실제 supervisor off 생산0 | 순수 시작 predicate와 실제 managed 생산0을 구분 |
| S02/policy: quota0·root 중복/쓰기 불가 | W 136~137행 quota0/root 중복, 199~206행 잘못된 정책 저장400 | 쓰기 불가 전체 분기는 이 두 assertion으로 충족 주장하지 않음; 별도 exact 음성 필요 |
| S02/H264: MP4 finalize | W 250~286행 codec loop·final callback·파일 존재 | 실제 legacy writer 출력. MW의 managed H264 검사와 별도 실행 |
| S02/VP8: WebM finalize | W 같은 codec loop의 VP8 분기 | codec별 실행 결과를 합치지 않음 |
| S02/GOP: delta 거부·cached 첫 keyframe | W 266행 delta-start 차단 | cached GOP 전체 선택까지 동일 assertion으로 입증하지 않음: 남는 exact 매핑 공백 |
| S02/split: 10초 뒤 다음 keyframe | W 285행 `10초 뒤 다음 keyframe 분할` | 직접 검사 존재 |
| S02/rollback: 새 stream epoch | W 420~421행 legacy PTS rollback; MW 273행 WR06 explicit generation reset | current는 generation·PTS/DTS·UTC 분리. 구형 UTC 증가 규칙으로 대체 금지 |
| S02/queue: recorder overflow와 client 분리 | W 151~160행 slow recorder/fast client | 실제 queue 검사; UI/live 전체 안정성 PASS 아님 |
| S02/partial: callback 전후 파일 경계 | W 257~258행 final 존재/partial 제거, 276행 열린 partial 한 개 | managed ownership/복구는 MW/J 별도 |
| S03/idempotency: 동일 mutation replay | J 885/936/949행 duplicate append·idempotent·row 불증가 | legacy 회귀와 managed J의 S10-SC checkpoint 검사를 구분 |
| S03/tail: 마지막 불완전 line | J 924/929행 truncated skip | raw legacy 정책; managed 손상을 skip해 PASS로 만들면 안 됨 |
| S03/corruption: 중간 corrupt 정상 행 보존 | J 927~929행 normal durable/count | 동일 legacy 경계; current observer는 손상 fail-closed |
| S03/sqlite: on/off ID·순서·상태 | J 1024행 range ID/order parity | 단일 assertion은 상태 전수까지 보장하지 않음; 상태 요구는 RV2/managed 복구 추가 검사 |
| S03/FK: 위반 transaction rollback | J 879행 journal 전체 rollback | 직접 검사 존재 |
| S03/orphan: 정상/손상 구분 | J 1026~1031행 실제 header/broken 파일 | owned finalize-recovery와 단순 orphan 분류를 혼동하지 않음 |
| S03/rebuild: 손상 SQLite 격리 | J 1157~1161행 quarantine 보존/rebuild | 현재 managed SQLite 경계·lease·sidecar는 같은 파일의 S10-SB/SC 별도 정의 |
| S04/oldest: endUTC/ID 순서 | R 135행 legacy oldest-first; RV2 140행 B06 영속 order | **current V2를 endUTC 순서로 검사하지 않음**; UTC 후퇴/unknown 허용 |
| S04/class: event/continuous 분리 | R 158행; RV2 156행 B10 | 두 직접 검사 존재, V1/V2 구분 |
| S04/protection: pin/hold 제외 | R 231행; RV2 158행 B11 | hold/pin 이후 삭제·손상 차단 |
| S04/unlink: 실패 pending·회수0 | R 284행 | current 전이는 RV2 B13/B14 및 실제 observer 삭제 파일 부재와 별도 결박 |
| S04/journal: 실패 시 unlink 없음 | R 266행 | 직접 음성 oracle 존재 |
| S04/free: reserve 부족 continuous 우선 | R 249행, RV2 B10 | 제품 quotas를 관측기 root budget으로 대체하지 않음 |
| S04/blocked: 해당 channel만 차단 | R 324행 | live/analysis 정상 전체는 이 검사로 미충족; 독립 runtime/실제 관측 필요 |
| S04/resume: 회복 후 keyframe·새 epoch | R 329행은 epoch 재발급 신호; W 471~476행 admission 재개 | signal과 실제 media 생산을 구분; current restart 후 생산은 LP26-O05 |
| S04/tombstone: media 제거·ID 남음 | RV2 176/186행 B13/B14; native observer `--snapshot` | 실제 파일 부재·재생 불가·복구는 별도 확인 |
| S04/expected: 새 파일 예상량 quota 포함 | R 212행 | 직접 검사 존재 |
| S04/inflight: 다중채널 예약·반환 | R 361/432행 finalize 반환/동시 thread 1승자 | 직접 검사 존재 |
| S04/retry: tombstone 실패 다음 tick | R 303/586행 pending/idempotent 재완료 | RV2 B14 interrupted deletion과 별도 |
| S04/path: replay/unlink canonical containment | R 708/751행 root 밖 격리/직전 재검증 | 실제 경로 음성 |
| S04/invalid: 음수 quota/기간 | W 199~206행 source policy400 | R runner 단독 전수 커버로 세지 않음 |
| S04/dirfd: 검사 후 상위 경로 교체 | R 773행 외부 파일 보호 | 직접 음성 oracle |
| S04/isolation: 다른 channel pending 실패 | R 621행 admission/tick 비차단 | 직접 검사 존재 |
| S04/partial-reserve: 이중 차감 금지 | R 399행 | 직접 검사 존재 |
| S04/event-admission: event 초과와 continuous 독립 | R 677행 continuous만 reserve/admission | event actual job quota는 derived-jobs 추가 범위 |
| S04/projection: live SQLite 실패→fallback→재시작 | J의 rebuild와 R의 projection 오류 격리는 각각 존재 | 이 둘을 이어 붙여 **실시간 실패부터 동일 archive 재시작까지 단일 시나리오**로 승격하지 않음; exact 연결 공백 |

고정 ID 공백은 위 설명표로 소급 해소되지 않는다. 초기 요구별 정식 등록/최종 manifest와의 결박은 남아 있으며,
현재 구현과 충돌하는 legacy 기대는 역사적 compatibility 전용으로 분리한다.

## 3. S10 D/J 이름 충돌 — 문맥 키가 실행 단위

`S10-D01`만으로 검색/집계하지 않는다. 기존 정의를 바꾸지 않고 `selection-3C5.1/…`,
`spec-3D/…`, `jobs-3C5.3a/…`, `journal-3A/…`를 함께 사용한다.

| 문맥 키 | 실제 파일·assertion | 정확한 직접 명령 | 연결·한계 |
| --- | --- | --- | --- |
| selection-3C5.1/S10-D01 | derived_selection_smoke 36행 `D01 callback 누적·불변 snapshot` | `bash scripts/internal/verify_recording_derived_selection.sh` | focused, 5단계 child 아님 |
| selection-3C5.1/S10-D02 | 같은 파일44행 유효0/fallback/duration/원본부재 | 같은 selection 명령 | spec-D02 default 구성과 별개 |
| selection-3C5.1/S10-D03 | 같은 파일151/153행 pre/post·overflow | 같은 selection 명령 | spec-D03 HTTP권한과 별개 |
| selection-3C5.1/S10-D04 | 같은 파일148행 exact union·파일식별 | 같은 selection 명령 | spec-D04 시간 JSON과 별개 |
| selection-3C5.1/S10-D05 | 같은 파일154행 한점 외삽 금지 | 같은 selection 명령 | spec-D05 UI 다중출력과 별개 |
| selection-3C5.1/S10-D06 | 같은 파일156~160행 namespace/generation/track | 같은 selection 명령 | spec-D06 원본표시와 별개 |
| selection-3C5.1/S10-D07 | 같은 파일164/166행 중복PTS/복수 후보 모호성 | 같은 selection 명령 | spec-D07 media권한과 별개 |
| selection-3C5.1/S10-D08 | 같은 파일169행 4096 cap 미확인 | 같은 selection 명령 | spec-D08 실제 UI와 별개 |
| spec-3D/S10-D01 | numeric_reference_smoke D01-01~03 원문 숫자참조/opaque 분리 | `bash scripts/internal/verify_recording_numeric_reference.sh` | 직접 focused; selection D01과 합산 금지 |
| spec-3D/S10-D02 | default_composition_smoke D02-02/06/08 lease/off/on/owner0 | DC | 통합4단계 포함, 모든 public UI 대체 아님 |
| spec-3D/S10-D03 | public_timeline_smoke D3B-02 + ui_contract `verifyRecordingHttpAuth` | `bash scripts/internal/verify_recording_public_timeline.sh`; `node scripts/internal/verify_v410_recording_ui_contract.mjs --http-api`; 동일 Node `--http-auth` | HTTP 두 모드만 통합1/2 포함 |
| spec-3D/S10-D04 | public_timeline D3B-03 + playback_status D3C-01~03 | 위 public timeline; `node scripts/internal/recording_playback_status.test.mjs` | int64 문자열/null/유효0; VM은 UI 아님 |
| spec-3D/S10-D05 | public_timeline D3B-04/05/07 + playback D3C-04/08 | 위 timeline/VM | 다중 itemId/출력/페이지, LP25 file-group은 opt-in 별도 |
| spec-3D/S10-D06 | public_timeline D3B-06/07 + playback D3C-05~07 | 위 timeline/VM | 부분 overlap 원본 보존·전체 hide |
| spec-3D/S10-D07 | public_media D3A-03/06/07, timeline D3B-08 | `bash scripts/internal/verify_recording_public_media.sh`; 위 timeline | 파일권한/hold/손상; HTTP 수명 child와 별도 |
| spec-3D/S10-D08 | 실제 UI seed 준비 + 제품 브라우저 action | 아래 UI 명령 | 준비만 현행화. 실제 브라우저 이번 미실행 |
| jobs-3C5.3a/S10-J01 | derived_jobs_smoke 243행 `J01 실제 선택→compact 내구 job 계약 왕복` | `bash scripts/internal/verify_recording_derived_jobs.sh` | focused; journal-J01 future schema와 별개 |
| jobs-3C5.3a/S10-J02 | 같은 파일66행 시각 독립 멱등ID/선택변경 새ID | 같은 jobs 명령 | journal-J02 future type과 별개 |
| jobs-3C5.3a/S10-J03 | 같은 파일78행 strict schema/JSON/4MiB/reservation | 같은 jobs 명령 | journal-J03 부분복구 거부와 별개 |
| jobs-3C5.3a/S10-J04 | 같은 파일280행 Intent/보호/예약 원자가시성 | 같은 jobs 명령 | journal-J04 원문보존과 별개 |
| journal-3A/S10-J01 | catalog_smoke 151~156행 future schema unsupported/Open 거부 | J | `S10-3A` assertion label, raw 문자 J01 출력만 찾으면 누락 |
| journal-3A/S10-J02 | 같은 loop의 future type | J | 별도 입력 variant |
| journal-3A/S10-J03 | 같은 loop 156~157행 Open 및 retry 거부 | J | 앞선 durable 일부만 정상 수용하지 않음 |
| journal-3A/S10-J04 | 같은 loop 158~160행 journal/SQLite/cleanup bytes 보존 | J | 스냅샷/복구 부작용 경계 |

소스: [selection](../../../../scripts/internal/recording_derived_selection_smoke.cpp),
[jobs](../../../../scripts/internal/recording_derived_jobs_smoke.cpp), [numeric](../../../../scripts/internal/recording_numeric_reference_smoke.cpp),
[timeline](../../../../scripts/internal/recording_public_timeline_smoke.cpp), [media](../../../../scripts/internal/recording_public_media_smoke.cpp),
[playback VM](../../../../scripts/internal/recording_playback_status.test.mjs).

## 4. 현행 통합의 정확한 5단계

진입점: `bash scripts/internal/verify_v410_recording_foundation.sh --current-integration`.
[wrapper](../../../../scripts/internal/verify_v410_recording_foundation.sh) 5~7행 →
[currentSteps / completedCurrentStep / runCurrentIntegration](../../../../scripts/internal/recording_current_integration_suite.mjs) 7/24/51행.
`--all`은 여전히 별도 legacy foundation suite이며 같은 의미가 아니다.

| 순서·ID | 실제 child 명령 | 독립 oracle·cleanup | 범위 한계 |
| --- | --- | --- | --- |
| 1 http-api | `node scripts/internal/verify_v410_recording_ui_contract.mjs --http-api` | literal35 checks, managed seed2출력, UTC/null·페이지·GET/Range/HEAD, root/정상종료/포트 | 합성 seed HTTP, 실제 EventRecord 생성 아님 |
| 2 http-auth | 같은 Node `--http-auth` | literal40, 5 role/scope 계정,401/403/허용, 메모리 난수, cleanup | 실제 UI 로그인 조작 아님 |
| 3 http-lifecycle | 같은 Node `--http-lifecycle` | literal10,64MiB MP4 전송/hold 해제·정상종료 | free atom 크기 fixture,64MiB writer 생성 아님 |
| 4 default-composition | DC | pass46 및24/16/1 summary exact, committed/blocked child exit23, cleanup | focused 실제 구성, OS서버 두 번째 기동과 별도 |
| 5 actual-app | `node scripts/internal/verify_recording_current_app.mjs` | literal25, 실제 tuple/EventRecord→동일 reference/job→정확2출력 HTTP, 두 번째 기동 보존ID/hash+새생산, 2프로세스 정상 cleanup | currentIntegrationExecutionPass만; fullFoundation/resource/UI false |

[실제 앱](../../../../scripts/internal/verify_recording_current_app.mjs)의 `collectEvent` 152~202행,
`archiveProbe` 206~213행, 재기동226~229행과
[helper](../../../../scripts/internal/recording_current_app_helpers.mjs)의 `allTimelinePages`/`eventOutputs`/`verifyRestart`가 oracle다.
LP25 strict page consumer의 terminal 관측은 total 변화 때도 보존하지만 전체2출력/fullness PASS를 대신하지 않는다.
`unplacedUnit=file`, leaf4096/JSON64MiB, HTTP4초·완료관측30초·실제앱180초 제한을 유지한다.
suite의 `remaining`은 LP26에서 코드/증거 고정·30분/120분/UI·자원 판정으로 정정했다.
자체50검사로 완료/실패 경계를 재확인했다. 문자열 변경만으로 실제120분/UI를 완료 처리하지 않는다.

## 5. OBS/LR/LS와 UI 준비의 교체 범위

| 기존 요구 | 현행 실행 연결·함수/assertion | 충족 범위·남은 차이 |
| --- | --- | --- |
| OBS 원장 종류/ID/UTF8·증분 관측 | `bash scripts/internal/verify_recording_current_observer.sh --self-test`; current_observer `normalizeCurrentRows`/`poll`, native `Normalize` | 제품 parser를 쓰는 compact 관측. old7 집합으로 current mutation을 거부하지 않음; catalog 수용은 별도 |
| OBS checkpoint/부분행/중복/경로·OBS04 마지막 tail | 동일 self-test의 LP26-O02; `closedJournalComplete`, `poll` prefix 대조 | 완결 line만 소비, 마지막 stop tail/backlog 거부. 실제 단기 로그의 최종 restart tail 검사 확인 |
| OBS 실제 PID RSS/FD/thread·재기동 | `bash scripts/internal/verify_recording_current_observer.sh --app-observe`; current_longrun `sample`/`snapshot` | collector 실제 사용·종료 복제본 Catalog Open·원본 hash 불변. 실제 약30초 관측, UI/장시간 아님 |
| LR01 정확120 옵션 | `bash scripts/internal/verify_v410_recording_longrun.sh --duration-minutes 120` → current observer wrapper | 환경/root 생성 전 인자 거부, LP26-O04 exactly120 자체검사. 실제120분 이번 미실행 |
| LR02 진행/30초 stall/삭제상관 | CurrentLongrunProgress `consume`/`status`/`finish`, LP26-O03/O04 | UTC 증가가 아니라 store/order·metadataHash·pending→deleted·실제 파일 부재. UTC 후퇴/unknown/epoch·큰 정수 반례 |
| LR03 API revision·disable/restart/reenable | current_longrun `settings`, `disabledChannelsExact`, `snapshot`, 재활성화 `until` | 초기 기본채널 집합+명시2개를 exact 대조. 3프로세스 실제 단기 수행과120분 별개 |
| LR04 PID 표본/duration/정리 | `sampleContinuity` 15초 gap, monotonic elapsed, 정상종료/포트/root, LP26-O04 | 실제 장시간 sample/resource 판정은 미실행 |
| LS01 first/last/max/delta/elapsed·warmup | `summarizeCurrentSamples`와 LP26-O04 resource 검사 | 매핑 리뷰 후 명시 delta와 warmup 부족 시 null을 보완. 모두 monotonic 시간이며 literal 단기 반례로 확인 |
| LS02 invalid/시각/identity/counter·상한 | 같은 summary와 LP26-O04 invalid resource 검사 | 10000표본/64 PID그룹·monotonic·identity/counter 감소 거부. old51개 단위 PASS가 current 모든 반례 동일 coverage 증거는 아님 |
| LS03 gap 실측·추세 false/review true | `sampleContinuity`, summary `resourceTrendPass:false/reviewRequired:true` | 매핑 리뷰 후 maxGapMs 명시 출력을 보완. 실제 장시간 자원 정상 판정은 여전히 미실행 |
| OBS 합산 고유ID/UTF8 예산 | `CurrentObservationBudget`, observer/progress 공유100000/32MiB | 두 구조 합산 상한으로 보완. prefix mutation/entity 위치와 segment ID를 반복도 포함해 보수적 계상; 합산 초과·원자 counter 반례 확인. 논리 예산은 RSS가 아님 |
| UA01 anchor/options | `node scripts/internal/verify_v410_recording_ui_auth_prep.test.mjs`; `uiAuthPreparationOptions` | 명시 anchor bounds·오류 옵션·미지정 거부 |
| UA02/05 임시 암호·상속 env | 같은 test의 `createUiAuthPasswords`/`uiSeedEnvironment` | 서로 다른 메모리 난수5개, 상속 암호/seed override 제거 |
| UA03 role/scope | 같은 test의 `bootstrapRecordingUiAuth` mock10route, 실제 UI 준비 시 해당 함수 호출 | 단위 route/body/cookie 검사와 실제 브라우저 로그인 구분 |
| UA04/08 handoff·정리 | 같은 test `writeUiLoginHandoff`0600/no-overwrite·seedCase cleanup | 비밀없는 크기/부재 evidence; 운영 사용자 변경 아님 |
| UA06/07 상태 seed·live 정책 | 같은 test `validateCurrentUiSeed`, `uiLiveSource` | 실제 managed corrupt/deleted/accepted-only, mock source active/blocked quota. 브라우저 상태/라이브 전체 PASS 아님 |
| SF01~03/06 입력 영상 | 같은 test `createUiSeekFixture`/`validateUiSeekProbe` | 명시 opt-in, 소유 bounded H264·1280×720·10초·무음·첫 keyframe, 잘못된 probe/링크 거부 |
| SF04/05 출력 결박·다른 영상 보존 | 같은 test의 SF04/SF05, native `ReadSeek`/`Write` | **기존 http-event 임의MP4 덮어쓰기는 폐기**, 실제 managed 원본 MP4 size/SHA/ffprobe; event2출력은 실제 TS 유지 |
| UI known/null·불연속·두output·페이지·priority·오류·reopen | `bash scripts/internal/verify_recording_current_ui_seed.sh --self-test`; native `Derive`/`Snapshot`, JS `validateCurrentUiSeed` | LP26-U01~06 실제 준비 oracle. LP26-U07/08은 위 auth/seek. 정확 시간/브라우저지원 PASS와 별개 |
| 실제 I27~34/spec-D08 UI | `node scripts/internal/verify_v410_recording_ui_contract.mjs --ui-direct`; 또는 `--ui-auth-direct --ui-anchor-utc-ms 1789084800000 --ui-seek-fixture` | 준비 후 승인된 실제 browser action 필요. --ui-direct는 no-anchor unknown, auth mode만 명시 anchor/seek. 이번 미실행 |

소스: [observer](../../../../scripts/internal/recording_current_observer.mjs),
[native](../../../../scripts/internal/recording_current_observer_native.cpp),
[self-test](../../../../scripts/internal/recording_current_observer.test.mjs),
[실제 longrun](../../../../scripts/internal/verify_recording_current_longrun.mjs),
[auth 준비](../../../../scripts/internal/verify_v410_recording_ui_auth_prep.test.mjs),
[UI native seed](../../../../scripts/internal/recording_current_ui_seed.cpp),
[UI seed oracle](../../../../scripts/internal/recording_current_ui_seed.mjs).
구형 journal/observer/progress/summary 단위는 legacy 영향 회귀로 남으며 current 앱 oracle로 실행하지 않는다.

## 6. ENV12 영속 runner 공백

| 등록 요구 | 현재 근거 | 선택·공백 |
| --- | --- | --- |
| cold/warm 실제 새 registry 검색·동일 feature·GTK/GI stderr0 | 중앙 ENV-12 cold/warm 정의36310행, 과거 결과36534행 | 재현 가능한 단일 영속 ENV12 runner 없음. 기존1525 개수를 현재 환경 결과로 추정하지 않음 |
| 44 factory 각각 inspect 및 실제 factory_make | 중앙 ENV-12 factory36311행, PKG-F 목록36627행 | 44개 명칭은 등록 존재. 몇 개 codec 생성 seed 성공으로44개 전수 PASS 대체 금지 |
| 실제 webrtcbin READY | 중앙36312행, 과거36536행 | 실제 GStreamer 상태 전환 별도 필요. loopback ICE config 검사나 mock plugin tree와 다름 |
| 실제 무음 H264 decode EOS | 중앙36312행, 과거36537행 | 일부 writer/seek 입력이 H264를 사용하는 것은 지정 ENV12 환경·stderr/decode oracle와 동일하지 않음 |
| ENV01~11 fixture 환경 | `bash scripts/internal/verify_gst_environment.sh` → `gst_environment_test.py` | wrapper3~16행에 명시된 격리 fixture. ENV12의 대체 runner로 선정하지 않음 |
| ENV13 회귀 묶음 | event-recording/build/inventory/docs 기존 명령 | 단일 oracle 공백이 아니라 공유 묶음. ENV12 신규 실제검사 공백과 구분 |

[중앙 기록](../../../release-test-records.md), [환경 wrapper](../../../../scripts/internal/verify_gst_environment.sh).
이 문서에서는 일회성 플랫폼 probe를 재작성하거나 실행하지 않는다. 향후 필요하면 실행 전 정의에 맞춘
소유 cache·각 factory 개별 결과·READY/decode·원출력·cleanup을 가진 영속 runner 또는 정확 수동 절차를 확정해야 한다.

## 7. 남는 mapping/runner 공백과 제외

| 항목 | 현재 판정 | 다음 조건 |
| --- | --- | --- |
| S01~04 고정 ID | 초기 prose→assertion 선택은 위 표, 공식 ID 공백은 남음 | 중앙/inventory 정식 등록 및 exact manifest 결박. 임의 ID 총계 증가 금지 |
| S02 cached GOP/쓰기불가, S03 상태 parity, S04 live/analysis·실시간 fallback 연속성 | 관련 focused는 존재하나 표의 특정 요구 전부에 충분한 exact 연결은 미확정 | 해당 제품/기존 test의 최소 추가 대조 후 필요성 판정; 자동 신규 구현/전수 재실행 금지 |
| LS 명시 delta/gap, OBS 합산 상한 | 매핑 발견 후 같은 준비 범위에서 보완 | 자체60검사와 최신 실제 단기 로그로 한정. 전체 구형 case/제품 전수 coverage 주장 금지 |
| ENV12 | 영속 runner 공백·현재 실제검사 미실행 | 별도 준비·승인 후 실제 플랫폼 evidence |
| 모든 focused→S11 단일 manifest | 5단계에 없는 focused 다수 | 영향 기반 최종 선택/전수 결과는 메인의 S11 계획·릴리즈8표에서 확정 |
| 실제120분·자원 review·실제UI | 명령/seed 준비와 실제 완료가 분리됨 | 승인된 실행, 전수 증거·review 해소·cleanup 필요 |
| 구형 제거 | 현재 새 진입점은 구형 runtime/app/seed 기본 연결을 우회 | 이 문서는 삭제 승인·호환 회귀 폐기 근거가 아님 |

변경: 이 문서와 준비 디렉터리 README의 최신 요약만. 코드/테스트/운영 데이터 변경 없음.
실행 명령·exit: 테스트/빌드 실행 없음. 위 결과는 연결된 기존 원출력의 읽기 대조다.
cleanup: 이번 문서 작업에서 임시 서버·영상·계정/root 생성 없음. token/전체 elapsed는 전용 집계 없음.
커밋·푸시: 담당자가 수행하지 않음. 메인 최종 대조 및 필요한 문서 검증 전 완료 범위를 확대하지 않는다.
