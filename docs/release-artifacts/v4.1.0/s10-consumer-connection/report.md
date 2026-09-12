# S10 3C-4 실제 소비자 연결 검증 기록

개발·검토 담당자를 위한 실행 증적이다. 현재 정의는 `docs/release-test-records.md`의 C401~418이며 이 문서는 정책을 새로 정하지 않는다. 공개 사용 안내나 제품 UI 완료 증거가 아니다.

## 현재 상태

아래 입력 계약 판단 대기는 a05c15dd 이후 발견 당시의 기록이다. 사용자가 보완안을 승인하여
초기 요청 원문 수락·복구 검증을 완료했다. 최신 결과는 [보완 실행 기록](../s10-consumer-request-admission/report.md)을 따른다.
당시 원출력과 PASS 범위는 변경하지 않는다.

추가 정적 검토 정정: a05c15dd 이후 3C-5를 준비하며 `start_ms-pre_ms<0` 수락 거부가
초기 media-pts 이벤트의 요청 사실 저장까지 막는 경계를 발견했다. 기존18개/회귀 PASS는 해당 정의 범위에 한정된다.
요청 사실 보존과 미존재 coverage 분리로 바꾸는 안은 고정 계약 변경 판단이 필요해 사용자에게 제시하며,
3C-4 전체 입력 호환/최종 종료는 그 판단까지 보류한다. 별도 재현 검증이나 제품 수정은 아직 하지 않았다.

메인 최종 확인: 제품13개 파일 SHA 대조 일치, 원출력에 기록된 임시 경로16개 모두 부재.
`./server.sh verify-docs-links` exit0(236문서/1895링크/실패0), `git diff --check` exit0.
현재 작업 트리의 기존 S09 변경은 이번 커밋에서 제외한다. 푸시는 수행하지 않는다.
최초 staged diffcheck는 새 Build/BuildFinal 로그 끝의 여분 빈 줄 각1개를 지적해 exit2였다.
명령·출력 내용은 유지하고 해당 두 빈 줄만 제거했다. 제품 재검증 대상이 아닌 증적 형식 보완이다.

원자 쌍 저장, 실제 opt-in projector/bridge 및 내부 참조 해석을 구현했다. 최종 focused 18/0과 승인된 관련 회귀가 통과했다. 기존 event 회귀의 컴파일 실패는 메인이 optional 부재 기본 초기화를 명시한 뒤 같은 명령으로 재검증하여 해소했다. 메인이 전체 제품 빌드와 최종 통합을 담당하며 [Build.log](Build.log), [BuildFinal.log](BuildFinal.log)에 별도 보존했다. 담당자는 커밋·푸시를 수행하지 않았다.

## 구현 범위

- `recording_contracts.h/.cpp`: `ReferencedObservationV1`, 3필드 쌍 parser/serializer/validator. 쌍 2MiB, 각 nested 1MiB 제한. nearest의 original은 optional이며 확정 위치로 승격하지 않는다.
- `recording_journal.h/.cpp`: `ReferencedObservationPut` 이름/분류.
- `recording_catalog.h/.cpp`: `PutReferencedObservation`, `QueryReferencedObservations`, 별도 map/SQL projection, replay/preflight/checkpoint. 기존 event·selection·created_at 병합 상태로 SQL을 투영한다.
- `analysis_observation_projector.h/.cpp`: 기존 Options 마지막에 기본 false opt-in, 기존 sampling/queue/worker를 통한 쌍 저장, 종료 트랙 마지막 참조 보존, 동일 ID 원본·속성 충돌의 메모리 guard.
- `event_recording_bridge.h/.cpp`: opt-in 실제 TryResolve 요청 사실 저장. 구형 worker/deriver/fallback을 활성화하지 않고 공개 link/clip은 빈 값으로 유지한다.
- `recording_read_service.h/.cpp`: `ResolveConsumerReference`, exact와 미색인 후보 분리, 유효 timebase exact 변환 및 현재 상태 재판정. `IntersectConfirmedMediaIntervals`는 이미 확인된 동일 source/store/epoch/segment 구간만 교차한다.
- `scripts/internal/recording_consumer_connection_smoke.cpp`, `verify_recording_consumer_connection.sh`: 실제 class를 직접 링크하고 소유 mktemp 경로만 사용한다.

## 실행 이력

| 기록 | 명령 | exit | 실제 결과 | elapsed |
| --- | --- | ---: | --- | --- |
| [NearestRed.log](NearestRed.log) | `bash scripts/internal/verify_recording_consumer_connection.sh` | 1 | 실제 nearest/null 저장 assertion 0/1, 예상 RED | 4초 |
| [NearestGreen.log](NearestGreen.log) | 동일 focused | 0 | nearest/null 1/0 | 5초 |
| [Red.log](Red.log) | 동일 focused | 1 | C401/C406 예상 RED, 1/2 | 5초 |
| [PartialGreen.log](PartialGreen.log) | 동일 focused | 0 | 초기 3/0, 전체 판정 아님 | 4초 |
| [FixtureFailure.log](FixtureFailure.log) | 동일 focused | 2 | C401~403 PASS 뒤 직접 partial mutation ID 누락, 예상 RED 아님 | 6초 |
| [Green.log](Green.log) | 동일 focused | 0 | 전체 첫 18/0, queue 추가 경계 이전 | 5초 |
| [QueueRed.log](QueueRed.log) | 동일 focused | 1 | C410 같은 ID/다른 bbox silent merge 예상 RED, 17/1 | 6초 |
| [QueueGreen.log](QueueGreen.log) | 동일 focused | 0 | 메모리 guard 후 18/0 | 6초 |
| [Final.log](Final.log) | 동일 focused | 0 | 새 함수 가독성 정리 후 18/0 | 6초 |
| [Reference.log](Reference.log) | `bash scripts/internal/verify_recording_consumer_reference.sh` | 0 | 16/0 | 5초 |
| [Binding.log](Binding.log) | `bash scripts/internal/verify_recording_source_binding.sh` | 0 | 20/0 | 6초 |
| [Correlation.log](Correlation.log) | `bash scripts/internal/verify_recording_frame_correlation.sh` | 0 | 10/0 | 2초 |
| [Observations.log](Observations.log) | `bash scripts/internal/verify_v410_recording_observations.sh` | 0 | 기존 관측 71개, snapshot 10개, cleanup 1개 PASS | 미집계 |
| [Event.log](Event.log) | `bash scripts/internal/verify_v410_event_recording.sh` | 1 | 등록기 35/0, GST-on 컴파일 실패. C++/application/runtime 미실행 | 미집계 |
| [EventGreen.log](EventGreen.log) | `bash scripts/internal/verify_v410_event_recording.sh` | 0 | 등록기35/C++158/application7/runtime23/negative2/기능집계27 전부 PASS | 전체 미집계; negative 하위20,245ms |

`git diff --check`는 소스 동결 시 exit 0이었다. 비동기 도구 대기 시간은 전체 실행 시간과 달라 elapsed로 합산하지 않았다. token start/end/consumed는 담당자별 자동 집계 수단이 없어 미집계다. elapsed source는 해당 runner의 `bash SECONDS` 출력이다.

## 최종 focused 전수 항목

| 제목 | 실제 검사 세부 내용 | 결과 | 이력/한계 |
| --- | --- | --- | --- |
| C401 관측·참조 원자 저장 | 한 mutation 증가, 쌍 조회 1개, 구형 관측·단독 reference projection에 미혼입 | pass | stub RED 후 PASS |
| C402 쌍 identity 불일치 거부 | owner/source/channel/namespace/track/PTS/legacy epoch/locator reason 불일치 거부, 원장 바이트 불변, 2MiB 쌍·각 1MiB nested 상한, extra/중복 schema 거부 | pass | 실제 parser/Put 사용 |
| C403 동일 원본 재전달·event 병합 | 동일 입력 append 없음, event/selection union, 최초 created_at 유지, 동일 ID 다른 ordinal 거부·바이트 불변 | pass | 후보 snapshot 저장 없음 |
| C404 다른 원본 동일PTS 구분 | 실제 OnEvent의 같은 analysis PTS·다른 ordinal이 서로 다른 두 ID로 저장 | pass | sampling으로 모든 입력을 저장한다는 의미 아님 |
| C405 SQL·JSONL·checkpoint 쌍 복구 | 기존 event 뒤 raw 부분 event update replay, 최초 created_at/event union 보존, SQL payload SELECT 직접 대조, checkpoint와 SQL/JSONL 재시작 동등 | pass | 최초 fixture ID 누락 실패 보존 |
| C406 실제 OnResult 원본 참조 저장 | 실제 OnResult→queue→worker→catalog 원본 ordinal 저장 | pass | 초기 stub RED 후 PASS |
| C407 OnEvent 강제 표본 | interval 미도달 PTS11 event 강제 저장, event ID와 ordinal2 보존 | pass | 실제 projector |
| C408 종료track 과거참조 보존 | 현재 ordinal99가 아닌 마지막 PTS10/ordinal1을 종료 metadata와 병합 | pass | 같은 분석 트랙 수명 |
| C409 종료track 참조부재 unknown | 저장된 트랙 이력 없이 종료 시 unavailable/null | pass | 현재 association 임의 결박 금지 |
| C410 sampling·queue·StopAndDrain 회귀 | interval 미도달 입력의 마지막 종료 보존, max track 거부, drain 뒤 queue/track0, stop 후 거부, 같은 ID 다른 bbox event 거부·미저장 | pass | 추가 assertion RED17/1→guard 후 PASS; callback에 파일 조회 없음 |
| C411 exact·미색인 복수 후보 보존 | 서로 다른 파일 exact2 + cap tail1, ns와 1/10초 timebase의 PTS 각각 1000000000/10 | pass | binding 검증이 비정수 변환을 사전 거부하므로 무효 fixture를 삽입하지 않음 |
| C412 nearest/ambiguous/unavailable 미승격 | 실제 history.Resolve nearest/null 생성, 세 품질 저장 왕복 및 확정 후보0, nearest/original 존재해도 후보0 | pass | timestamp-match도 decoded frame 고유성 증명 아님 |
| C413 UTC unknown·삭제 상태 재판정 | unknown UTC exact 후보 유지, pending/corrupt 전이 후 exact 후보 제외, 미색인 후보 유지 | pass | 현재 catalog 상태 기준 |
| C414 실제 TryResolve 요청참조 저장 | 실제 bridge 호출의 요청 start100/end200/pre10/post20 저장 | pass | 파생 미디어 생성 없음 |
| C415 event 재전달·확장·세대 구분 | 동일 입력 원장 바이트 불변, 요청 end 확장 및 새 generation을 owner의 서로 다른 세 reference로 보존 | pass | 단일 association으로 요청 전체 coverage 추정 안 함 |
| C416 source/channel 충돌 거부 | record channel/source 충돌 및 context source 부재 거부, 원장 바이트 불변 | pass | 명시 resolver/context 비교 |
| C417 같은 원본 미디어 교집합 우선 | 실제 구간 [10,30)∩[20,40)=[20,30), source/store/epoch/segment/timebase 차이 및 빈 범위 거부 | pass | 내부 확정 구간 판정만. event clip/UI 우선 표시 완료 아님 |
| C418 공개 결과·구형 fallback 불변 | handled=true/derived=false/pending, clip/link 빈 값, deriver 호출0, RecordFallback·stop 원장 불변·구형 pending link 없음 | pass | 공개 serializer/schema 변경 없음 |

회귀의 각 원출력 행은 위 개별 로그에 전수 보존했다. 새로운 기능 범위의 완료와 기존 회귀 성공을 혼동하지 않는다.

## 관련 회귀 개별 결과 전수표

원출력의 실제 성공 행을 한 행씩 대조했다. 기능집계27행은 C++/runtime 검사들을 묶은 결과이므로 별도 테스트 수에 중복 가산하지 않는다. 최초 Event.log의 등록기35 PASS는 뒤 컴파일 실패를 없애거나 해당 suite를 PASS로 만드는 근거가 아니다.

| 제목 | 수행내용·원출력 위치 | 결과(pass/fail) |
| --- | --- | --- |
| C341 계약 왕복 | [Reference.log:2](Reference.log) — exit0 | pass |
| C342 unknown/중복 필드 거부 | [Reference.log:3](Reference.log) — exit0 | pass |
| C343 ID·종류·소유자 제약 | [Reference.log:4](Reference.log) — exit0 | pass |
| C344 품질·원본 nullable 조합 | [Reference.log:5](Reference.log) — exit0 | pass |
| C345 원본 수치·track 경계 | [Reference.log:6](Reference.log) — exit0 | pass |
| C346 event 요청·시간축 | [Reference.log:7](Reference.log) — exit0 | pass |
| C347 observation 요청 금지 | [Reference.log:8](Reference.log) — exit0 | pass |
| C348 요청 음수·역전·padding | [Reference.log:9](Reference.log) — exit0 | pass |
| C349 미지원 schema 거부 | [Reference.log:10](Reference.log) — exit0 | pass |
| C350 실제 원장 저장·조회 | [Reference.log:11](Reference.log) — exit0 | pass |
| C351 동일 참조 멱등 | [Reference.log:12](Reference.log) — exit0 | pass |
| C352 동일 ID 충돌 거부 | [Reference.log:13](Reference.log) — exit0 | pass |
| C353 opt-in·미open 거부 | [Reference.log:14](Reference.log) — exit0 | pass |
| C354 SQL·JSONL 재시작 동등 | [Reference.log:15](Reference.log) — exit0 | pass |
| C355 checkpoint 참조 보존 | [Reference.log:16](Reference.log) — exit0 | pass |
| C356 손상·충돌 replay 선차단 | [Reference.log:27](Reference.log) — exit0 | pass |
| S10-C301 결박 schema 왕복 | [Binding.log:2](Binding.log) — exit0 | pass |
| S10-C302 식별·ordinal 검증 | [Binding.log:3](Binding.log) — exit0 | pass |
| S10-C303 PTS 재정렬 보존 | [Binding.log:4](Binding.log) — exit0 | pass |
| S10-C304 미디어 범위·timebase | [Binding.log:5](Binding.log) — exit0 | pass |
| S10-C305 색인 상한·미색인 꼬리 | [Binding.log:6](Binding.log) — exit0 | pass |
| S10-C306 단일 bound mutation | [Binding.log:7](Binding.log) — exit0 | pass |
| S10-C307 source·저장 identity 결박 | [Binding.log:8](Binding.log) — exit0 | pass |
| S10-C308 불변·멱등 | [Binding.log:9](Binding.log) — exit0 | pass |
| S10-C309 소급·다운그레이드 금지 | [Binding.log:10](Binding.log) — exit0 | pass |
| S10-C310 정확한 원본 tuple 조회 | [Binding.log:11](Binding.log) — exit0 | pass |
| S10-C311 미색인·실제 부재 구분 | [Binding.log:12](Binding.log) — exit0 | pass |
| S10-C312 복수 segment 후보 | [Binding.log:13](Binding.log) — exit0 | pass |
| S10-C313 삭제·corrupt·pending 차단 | [Binding.log:14](Binding.log) — exit0 | pass |
| S10-C314 채널·조회 오류 경계 | [Binding.log:15](Binding.log) — exit0 | pass |
| S10-C315 SQL·JSONL 재시작 동등 | [Binding.log:16](Binding.log) — exit0 | pass |
| S10-C316 checkpoint 보존 | [Binding.log:17](Binding.log) — exit0 | pass |
| S10-C317 손상 원장 선차단 | [Binding.log:18](Binding.log) — exit0 | pass |
| S10-C318 예약·옵트인 경계 | [Binding.log:19](Binding.log) — exit0 | pass |
| S10-C319 기존 segment·조회 불변 | [Binding.log:20](Binding.log) — exit0 | pass |
| S10-C320 실제 finalize 수락 경계 | [Binding.log:21](Binding.log) — exit0 | pass |
| S10-C101 유일 timestamp 연관 | [Correlation.log:2](Correlation.log) — exit0 | pass |
| S10-C102 최근접 추정 분리 | [Correlation.log:3](Correlation.log) — exit0 | pass |
| S10-C103 중복 timestamp 모호성 | [Correlation.log:4](Correlation.log) — exit0 | pass |
| S10-C104 원본 미관측 | [Correlation.log:5](Correlation.log) — exit0 | pass |
| S10-C105 출력 PTS 부재 | [Correlation.log:6](Correlation.log) — exit0 | pass |
| S10-C106 원본 PTS 부재·범위 | [Correlation.log:7](Correlation.log) — exit0 | pass |
| S10-C107 bounded 이력 | [Correlation.log:8](Correlation.log) — exit0 | pass |
| S10-C108 충돌·동일 입력 재전달 | [Correlation.log:9](Correlation.log) — exit0 | pass |
| S10-C109 세대·track 분리 | [Correlation.log:10](Correlation.log) — exit0 | pass |
| S10-C110 자체 영상 실제 decoder | [Correlation.log:11](Correlation.log) — exit0 | pass |
| mutation-v2 | [Observations.log:2](Observations.log) — exit0 | pass |
| null-roundtrip | [Observations.log:3](Observations.log) — exit0 | pass |
| reference-roundtrip | [Observations.log:4](Observations.log) — exit0 | pass |
| negative-created-time | [Observations.log:5](Observations.log) — exit0 | pass |
| negative-reason | [Observations.log:6](Observations.log) — exit0 | pass |
| negative-summary | [Observations.log:7](Observations.log) — exit0 | pass |
| negative-observation-range | [Observations.log:8](Observations.log) — exit0 | pass |
| negative-bbox | [Observations.log:9](Observations.log) — exit0 | pass |
| journal-open | [Observations.log:10](Observations.log) — exit0 | pass |
| catalog-open | [Observations.log:11](Observations.log) — exit0 | pass |
| null-put | [Observations.log:12](Observations.log) — exit0 | pass |
| gap-null | [Observations.log:13](Observations.log) — exit0 | pass |
| missing-provenance-null | [Observations.log:14](Observations.log) — exit0 | pass |
| segment-finalize | [Observations.log:15](Observations.log) — exit0 | pass |
| pending-resolve | [Observations.log:16](Observations.log) — exit0 | pass |
| located-roundtrip | [Observations.log:17](Observations.log) — exit0 | pass |
| negative-locator-pts | [Observations.log:18](Observations.log) — exit0 | pass |
| locator-put-reject | [Observations.log:19](Observations.log) — exit0 | pass |
| located-put | [Observations.log:20](Observations.log) — exit0 | pass |
| identity-put-reject | [Observations.log:21](Observations.log) — exit0 | pass |
| identity-restore | [Observations.log:22](Observations.log) — exit0 | pass |
| event-put | [Observations.log:23](Observations.log) — exit0 | pass |
| reasons-merge | [Observations.log:24](Observations.log) — exit0 | pass |
| missing-media-null | [Observations.log:25](Observations.log) — exit0 | pass |
| v1-roundtrip | [Observations.log:26](Observations.log) — exit0 | pass |
| deletion-request | [Observations.log:27](Observations.log) — exit0 | pass |
| deleted-null | [Observations.log:28](Observations.log) — exit0 | pass |
| sqlite-reopen | [Observations.log:29](Observations.log) — exit0 | pass |
| journal-replay | [Observations.log:30](Observations.log) — exit0 | pass |
| jsonl-parity | [Observations.log:31](Observations.log) — exit0 | pass |
| sqlite-projection | [Observations.log:32](Observations.log) — exit0 | pass |
| sqlite-payload-parity | [Observations.log:33](Observations.log) — exit0 | pass |
| sampling-journal-open | [Observations.log:34](Observations.log) — exit0 | pass |
| sampling-catalog-open | [Observations.log:35](Observations.log) — exit0 | pass |
| stop-duration | [Observations.log:36](Observations.log) — exit0 | pass |
| sampling-start | [Observations.log:37](Observations.log) — exit0 | pass |
| sampling-60s-bound | [Observations.log:38](Observations.log) — exit0 | pass |
| stop-once | [Observations.log:39](Observations.log) — exit0 | pass |
| drain-bounded | [Observations.log:40](Observations.log) — exit0 | pass |
| jobs-journal-open | [Observations.log:41](Observations.log) — exit0 | pass |
| jobs-catalog-open | [Observations.log:42](Observations.log) — exit0 | pass |
| ended-state-reuse | [Observations.log:43](Observations.log) — exit0 | pass |
| pending-unrelated-finalize | [Observations.log:44](Observations.log) — exit0 | pass |
| tracker-start | [Observations.log:45](Observations.log) — exit0 | pass |
| runtime-journal-open | [Observations.log:46](Observations.log) — exit0 | pass |
| runtime-catalog-open | [Observations.log:47](Observations.log) — exit0 | pass |
| tracker-terminated-copy | [Observations.log:48](Observations.log) — exit0 | pass |
| tracker-terminated-once | [Observations.log:49](Observations.log) — exit0 | pass |
| observer-tracker-start-event-end | [Observations.log:50](Observations.log) — exit0 | pass |
| observer-event-provenance | [Observations.log:51](Observations.log) — exit0 | pass |
| late-journal-open | [Observations.log:52](Observations.log) — exit0 | pass |
| late-catalog-open | [Observations.log:53](Observations.log) — exit0 | pass |
| delayed-event-before-latest | [Observations.log:54](Observations.log) — exit0 | pass |
| delayed-event-after-end | [Observations.log:55](Observations.log) — exit0 | pass |
| config-zero-reject | [Observations.log:56](Observations.log) — exit0 | pass |
| config-positive | [Observations.log:57](Observations.log) — exit0 | pass |
| critical-overload-visible | [Observations.log:58](Observations.log) — exit0 | pass |
| queue-cap | [Observations.log:59](Observations.log) — exit0 | pass |
| concurrent-stop | [Observations.log:60](Observations.log) — exit0 | pass |
| multi-namespace | [Observations.log:61](Observations.log) — exit0 | pass |
| bounded-id | [Observations.log:62](Observations.log) — exit0 | pass |
| storage-failure-counter | [Observations.log:63](Observations.log) — exit0 | pass |
| pending-segment-finalize | [Observations.log:64](Observations.log) — exit0 | pass |
| pending-finalize-automatic | [Observations.log:65](Observations.log) — exit0 | pass |
| ambiguous-segment-finalize | [Observations.log:66](Observations.log) — exit0 | pass |
| ambiguous-null | [Observations.log:67](Observations.log) — exit0 | pass |
| corrupt-null | [Observations.log:68](Observations.log) — exit0 | pass |
| reference-overflow-visible | [Observations.log:69](Observations.log) — exit0 | pass |
| replay-identity-open | [Observations.log:70](Observations.log) — exit0 | pass |
| replay-identity-memory | [Observations.log:71](Observations.log) — exit0 | pass |
| replay-identity-sqlite | [Observations.log:72](Observations.log) — exit0 | pass |
| 입력 전 위치 없음 | [Observations.log:74](Observations.log) — exit0 | pass |
| 수락 packet anchor | [Observations.log:75](Observations.log) — exit0 | pass |
| 동일 epoch 범위 확장 | [Observations.log:76](Observations.log) — exit0 | pass |
| 캡처된 사본 불변 | [Observations.log:77](Observations.log) — exit0 | pass |
| accepted-pts-exact-membership | [Observations.log:78](Observations.log) — exit0 | pass |
| PTS 되감기 차단 | [Observations.log:79](Observations.log) — exit0 | pass |
| 모호성 이후 추정 복원 금지 | [Observations.log:80](Observations.log) — exit0 | pass |
| epoch 변경 차단 | [Observations.log:81](Observations.log) — exit0 | pass |
| 종료 사본 차단 | [Observations.log:82](Observations.log) — exit0 | pass |
| accepted-pts-history-bound | [Observations.log:83](Observations.log) — exit0 | pass |
| S07 temporary cleanup | [Observations.log:85](Observations.log) — exit0 | pass |
| 등록기: 정상 정식 등록 27개 | [Event.log:3](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: 다른 등록군 추가와 일관된 총계 허용 | [Event.log:4](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: 전체 총계 불일치 거부 | [Event.log:5](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: canonical 등록 수 변경 거부 | [Event.log:6](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: S05 등록 수 변경 거부 | [Event.log:7](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: 등록군 중복 거부 | [Event.log:8](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: 음수 등록 수 거부 | [Event.log:9](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: 소수 등록 수 거부 | [Event.log:10](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: 등록 범위 표 누락 거부 | [Event.log:11](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: 누락 ID | [Event.log:12](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: 중복 ID | [Event.log:13](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: 추가 ID | [Event.log:14](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: 빈 테스트 영역 | [Event.log:15](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: 없는 구현 심볼 | [Event.log:16](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: 없는 테스트 함수 | [Event.log:17](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: 없는 check | [Event.log:18](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: 중복 check ID | [Event.log:19](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: 문서 행 누락 | [Event.log:20](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: 실행 소비자 정상 합성 입력 | [Event.log:21](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: 실제 check 결과 누락 | [Event.log:22](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: EOS assertion 제거와 감소한 summary도 거부 | [Event.log:23](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: 실패 summary | [Event.log:24](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: 성공 summary만으로 PASS 금지 | [Event.log:25](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: 중복 application 결과 | [Event.log:26](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: runtime 로그 전체 누락 | [Event.log:27](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: runtime 시나리오 누락 | [Event.log:28](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: 종료 취소 runtime 시나리오 누락 | [Event.log:29](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: runtime assertion 누락 및 감소 summary | [Event.log:30](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: runtime assertion 중복 및 증가 summary | [Event.log:31](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: runtime summary 실패 | [Event.log:32](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: runtime summary 중복 | [Event.log:33](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: runtime failure marker | [Event.log:34](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: runtime mutation 결과 누락 | [Event.log:35](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: runtime mutation 결과 중복 | [Event.log:36](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: runtime negative summary 실패 | [Event.log:37](Event.log) — 뒤 컴파일 실패; 개별 등록기만 pass | pass |
| 등록기: 정상 정식 등록 27개 | [EventGreen.log:3](EventGreen.log) — exit0 | pass |
| 등록기: 다른 등록군 추가와 일관된 총계 허용 | [EventGreen.log:4](EventGreen.log) — exit0 | pass |
| 등록기: 전체 총계 불일치 거부 | [EventGreen.log:5](EventGreen.log) — exit0 | pass |
| 등록기: canonical 등록 수 변경 거부 | [EventGreen.log:6](EventGreen.log) — exit0 | pass |
| 등록기: S05 등록 수 변경 거부 | [EventGreen.log:7](EventGreen.log) — exit0 | pass |
| 등록기: 등록군 중복 거부 | [EventGreen.log:8](EventGreen.log) — exit0 | pass |
| 등록기: 음수 등록 수 거부 | [EventGreen.log:9](EventGreen.log) — exit0 | pass |
| 등록기: 소수 등록 수 거부 | [EventGreen.log:10](EventGreen.log) — exit0 | pass |
| 등록기: 등록 범위 표 누락 거부 | [EventGreen.log:11](EventGreen.log) — exit0 | pass |
| 등록기: 누락 ID | [EventGreen.log:12](EventGreen.log) — exit0 | pass |
| 등록기: 중복 ID | [EventGreen.log:13](EventGreen.log) — exit0 | pass |
| 등록기: 추가 ID | [EventGreen.log:14](EventGreen.log) — exit0 | pass |
| 등록기: 빈 테스트 영역 | [EventGreen.log:15](EventGreen.log) — exit0 | pass |
| 등록기: 없는 구현 심볼 | [EventGreen.log:16](EventGreen.log) — exit0 | pass |
| 등록기: 없는 테스트 함수 | [EventGreen.log:17](EventGreen.log) — exit0 | pass |
| 등록기: 없는 check | [EventGreen.log:18](EventGreen.log) — exit0 | pass |
| 등록기: 중복 check ID | [EventGreen.log:19](EventGreen.log) — exit0 | pass |
| 등록기: 문서 행 누락 | [EventGreen.log:20](EventGreen.log) — exit0 | pass |
| 등록기: 실행 소비자 정상 합성 입력 | [EventGreen.log:21](EventGreen.log) — exit0 | pass |
| 등록기: 실제 check 결과 누락 | [EventGreen.log:22](EventGreen.log) — exit0 | pass |
| 등록기: EOS assertion 제거와 감소한 summary도 거부 | [EventGreen.log:23](EventGreen.log) — exit0 | pass |
| 등록기: 실패 summary | [EventGreen.log:24](EventGreen.log) — exit0 | pass |
| 등록기: 성공 summary만으로 PASS 금지 | [EventGreen.log:25](EventGreen.log) — exit0 | pass |
| 등록기: 중복 application 결과 | [EventGreen.log:26](EventGreen.log) — exit0 | pass |
| 등록기: runtime 로그 전체 누락 | [EventGreen.log:27](EventGreen.log) — exit0 | pass |
| 등록기: runtime 시나리오 누락 | [EventGreen.log:28](EventGreen.log) — exit0 | pass |
| 등록기: 종료 취소 runtime 시나리오 누락 | [EventGreen.log:29](EventGreen.log) — exit0 | pass |
| 등록기: runtime assertion 누락 및 감소 summary | [EventGreen.log:30](EventGreen.log) — exit0 | pass |
| 등록기: runtime assertion 중복 및 증가 summary | [EventGreen.log:31](EventGreen.log) — exit0 | pass |
| 등록기: runtime summary 실패 | [EventGreen.log:32](EventGreen.log) — exit0 | pass |
| 등록기: runtime summary 중복 | [EventGreen.log:33](EventGreen.log) — exit0 | pass |
| 등록기: runtime failure marker | [EventGreen.log:34](EventGreen.log) — exit0 | pass |
| 등록기: runtime mutation 결과 누락 | [EventGreen.log:35](EventGreen.log) — exit0 | pass |
| 등록기: runtime mutation 결과 중복 | [EventGreen.log:36](EventGreen.log) — exit0 | pass |
| 등록기: runtime negative summary 실패 | [EventGreen.log:37](EventGreen.log) — exit0 | pass |
| C++: EQ journal open | [EventGreen.log:39](EventGreen.log) — exit0 | pass |
| C++: EQ catalog open | [EventGreen.log:40](EventGreen.log) — exit0 | pass |
| C++: EQ 실제 pending 등록 | [EventGreen.log:41](EventGreen.log) — exit0 | pass |
| C++: EQ 각 event 실제 worker 최초 journal 기록 확인 | [EventGreen.log:42](EventGreen.log) — exit0 | pass |
| C++: EQ deadline 이전 동일 event journal 증가 없음 | [EventGreen.log:44](EventGreen.log) — exit0 | pass |
| C++: EQ 서로 다른 event link ID 보존 | [EventGreen.log:45](EventGreen.log) — exit0 | pass |
| C++: EQ 미해석 PTS는 파생 비실행 | [EventGreen.log:46](EventGreen.log) — exit0 | pass |
| C++: EQ journal open | [EventGreen.log:47](EventGreen.log) — exit0 | pass |
| C++: EQ catalog open | [EventGreen.log:48](EventGreen.log) — exit0 | pass |
| C++: EQ 실제 pending 등록 | [EventGreen.log:49](EventGreen.log) — exit0 | pass |
| C++: EQ 실제 pending 등록 | [EventGreen.log:50](EventGreen.log) — exit0 | pass |
| C++: EQ 각 event 실제 worker 최초 journal 기록 확인 | [EventGreen.log:51](EventGreen.log) — exit0 | pass |
| C++: EQ deadline 이전 동일 event journal 증가 없음 | [EventGreen.log:53](EventGreen.log) — exit0 | pass |
| C++: EQ 서로 다른 event link ID 보존 | [EventGreen.log:54](EventGreen.log) — exit0 | pass |
| C++: EQ 미해석 PTS는 파생 비실행 | [EventGreen.log:55](EventGreen.log) — exit0 | pass |
| C++: 기본 pending event link가 유효해야 함: | [EventGreen.log:56](EventGreen.log) — exit0 | pass |
| C++: terminal 대기 UTC 확장 요청은 additive 계약으로 round-trip해야 함 | [EventGreen.log:57](EventGreen.log) — exit0 | pass |
| C++: terminal 대기 요청이 현재 범위를 축소하면 거부해야 함 | [EventGreen.log:58](EventGreen.log) — exit0 | pass |
| C++: 미해석 후속 PTS는 기존 UTC 범위와 별도 field로 round-trip해야 함 | [EventGreen.log:59](EventGreen.log) — exit0 | pass |
| C++: 미해석 후속 PTS를 소비하지 않은 terminal 상태를 거부해야 함 | [EventGreen.log:60](EventGreen.log) — exit0 | pass |
| C++: 서로 겹치는 ordered overlap을 거부해야 함 | [EventGreen.log:61](EventGreen.log) — exit0 | pass |
| C++: overlap/missing이 requested range를 정확히 분할하지 않으면 거부해야 함 | [EventGreen.log:62](EventGreen.log) — exit0 | pass |
| C++: unknown link status를 영속 계약으로 허용하면 안 됨 | [EventGreen.log:63](EventGreen.log) — exit0 | pass |
| C++: locator 없는 fallback evidence를 거부해야 함 | [EventGreen.log:64](EventGreen.log) — exit0 | pass |
| C++: journal open 실패: | [EventGreen.log:65](EventGreen.log) — exit0 | pass |
| C++: catalog open 실패: | [EventGreen.log:66](EventGreen.log) — exit0 | pass |
| C++: event link 갱신은 SQLite primary projection에서 검증해야 함 | [EventGreen.log:67](EventGreen.log) — exit0 | pass |
| C++: segment finalize 실패: | [EventGreen.log:68](EventGreen.log) — exit0 | pass |
| C++: segment finalize 실패: | [EventGreen.log:69](EventGreen.log) — exit0 | pass |
| C++: segment finalize 실패: | [EventGreen.log:70](EventGreen.log) — exit0 | pass |
| C++: segment finalize 실패: | [EventGreen.log:71](EventGreen.log) — exit0 | pass |
| C++: segment finalize 실패: | [EventGreen.log:72](EventGreen.log) — exit0 | pass |
| C++: retention policy 실패: | [EventGreen.log:73](EventGreen.log) — exit0 | pass |
| C++: 이벤트 저장 worker를 막지 않고 파생 job을 pending으로 enqueue해야 함 | [EventGreen.log:74](EventGreen.log) — exit0 | pass |
| C++: 파생 중 원본 segment hold가 유지되어야 함 | [EventGreen.log:75](EventGreen.log) — exit0 | pass |
| C++: 파생 중 원본 segment hold가 유지되어야 함 | [EventGreen.log:76](EventGreen.log) — exit0 | pass |
| C++: 파생 중 원본 segment hold가 유지되어야 함 | [EventGreen.log:77](EventGreen.log) — exit0 | pass |
| C++: 완전한 archive 파생 완료 뒤 ready clip을 반환해야 함 | [EventGreen.log:78](EventGreen.log) — exit0 | pass |
| C++: event link ID와 derived clip path가 반환되어야 함 | [EventGreen.log:79](EventGreen.log) — exit0 | pass |
| C++: 반개구간 overlap은 맞닿기만 한 segment를 제외해야 함 | [EventGreen.log:80](EventGreen.log) — exit0 | pass |
| C++: media PTS event 범위가 segment epoch 기준 UTC로 변환되어야 함 | [EventGreen.log:81](EventGreen.log) — exit0 | pass |
| C++: overlap segment가 UTC 순서로 전달되어야 함 | [EventGreen.log:82](EventGreen.log) — exit0 | pass |
| C++: 파생 성공 link가 catalog complete로 저장되어야 함 | [EventGreen.log:83](EventGreen.log) — exit0 | pass |
| C++: 파생 완료 뒤 원본 hold가 해제되어야 함 | [EventGreen.log:84](EventGreen.log) — exit0 | pass |
| C++: 파생 완료 뒤 원본 hold가 해제되어야 함 | [EventGreen.log:85](EventGreen.log) — exit0 | pass |
| C++: 파생 완료 뒤 원본 hold가 해제되어야 함 | [EventGreen.log:86](EventGreen.log) — exit0 | pass |
| C++: 같은 event update는 파생 clip을 중복 생성하지 않아야 함 | [EventGreen.log:87](EventGreen.log) — exit0 | pass |
| C++: 파생 중 원본 segment hold가 유지되어야 함 | [EventGreen.log:88](EventGreen.log) — exit0 | pass |
| C++: 파생 중 원본 segment hold가 유지되어야 함 | [EventGreen.log:89](EventGreen.log) — exit0 | pass |
| C++: 파생 중 원본 segment hold가 유지되어야 함 | [EventGreen.log:90](EventGreen.log) — exit0 | pass |
| C++: 파생 중 원본 segment hold가 유지되어야 함 | [EventGreen.log:91](EventGreen.log) — exit0 | pass |
| C++: 완료 event의 더 넓은 update는 range별 결정 ID로 다시 파생해야 함 | [EventGreen.log:92](EventGreen.log) — exit0 | pass |
| C++: segment finalize 실패: | [EventGreen.log:93](EventGreen.log) — exit0 | pass |
| C++: segment finalize 실패: | [EventGreen.log:94](EventGreen.log) — exit0 | pass |
| C++: cam-b policy 실패: | [EventGreen.log:95](EventGreen.log) — exit0 | pass |
| C++: archive gap이 있으면 complete로 표시하면 안 됨 | [EventGreen.log:96](EventGreen.log) — exit0 | pass |
| C++: link가 정확한 missing UTC range를 보존해야 함 | [EventGreen.log:97](EventGreen.log) — exit0 | pass |
| C++: frame-buffer fallback 뒤 같은 link가 fallback evidence로 갱신되어야 함 | [EventGreen.log:98](EventGreen.log) — exit0 | pass |
| C++: 같은 event link의 overlap/fallback 갱신 뒤에도 SQLite projection을 유지해야 함 | [EventGreen.log:99](EventGreen.log) — exit0 | pass |
| C++: cam-late policy 실패: | [EventGreen.log:100](EventGreen.log) — exit0 | pass |
| C++: segment finalize 실패: | [EventGreen.log:101](EventGreen.log) — exit0 | pass |
| C++: 파생 중 원본 segment hold가 유지되어야 함 | [EventGreen.log:102](EventGreen.log) — exit0 | pass |
| C++: 파생 중 원본 segment hold가 유지되어야 함 | [EventGreen.log:103](EventGreen.log) — exit0 | pass |
| C++: 파생 중 원본 segment hold가 유지되어야 함 | [EventGreen.log:104](EventGreen.log) — exit0 | pass |
| C++: 파생 중 원본 segment hold가 유지되어야 함 | [EventGreen.log:105](EventGreen.log) — exit0 | pass |
| C++: anchor 없는 PTS를 finalized segment의 실제 PTS/UTC mapping으로 복구해야 함 | [EventGreen.log:106](EventGreen.log) — exit0 | pass |
| C++: PTS epoch anchor가 없으면 임의 UTC 연결이나 파생을 하면 안 됨 | [EventGreen.log:107](EventGreen.log) — exit0 | pass |
| C++: anchor 없는 PTS는 UTC field가 아니라 재해석 가능한 PTS range로 보존해야 함 | [EventGreen.log:108](EventGreen.log) — exit0 | pass |
| C++: 같은 긴 prefix의 event ID도 SHA-256 기반 결정 ID가 충돌하면 안 됨 | [EventGreen.log:109](EventGreen.log) — exit0 | pass |
| C++: 파생 중 원본 segment hold가 유지되어야 함 | [EventGreen.log:110](EventGreen.log) — exit0 | pass |
| C++: 파생 중 원본 segment hold가 유지되어야 함 | [EventGreen.log:111](EventGreen.log) — exit0 | pass |
| C++: 파생 중 원본 segment hold가 유지되어야 함 | [EventGreen.log:112](EventGreen.log) — exit0 | pass |
| C++: 파생 중 원본 segment hold가 유지되어야 함 | [EventGreen.log:113](EventGreen.log) — exit0 | pass |
| C++: 파생 중 원본 segment hold가 유지되어야 함 | [EventGreen.log:114](EventGreen.log) — exit0 | pass |
| C++: 파생 중 원본 segment hold가 유지되어야 함 | [EventGreen.log:115](EventGreen.log) — exit0 | pass |
| C++: 확장 회귀 journal open 실패: | [EventGreen.log:116](EventGreen.log) — exit0 | pass |
| C++: 확장 회귀 initial catalog open 실패: | [EventGreen.log:117](EventGreen.log) — exit0 | pass |
| C++: segment finalize 실패: | [EventGreen.log:118](EventGreen.log) — exit0 | pass |
| C++: cleanup 확장 fixture 저장 실패: | [EventGreen.log:119](EventGreen.log) — exit0 | pass |
| C++: cleanup 확장 fixture 저장 실패: | [EventGreen.log:120](EventGreen.log) — exit0 | pass |
| C++: 확장 회귀 restart catalog open 실패: | [EventGreen.log:121](EventGreen.log) — exit0 | pass |
| C++: 확장 policy 실패 | [EventGreen.log:122](EventGreen.log) — exit0 | pass |
| C++: cleanup 확장 remux 실패는 한 번만 실행되어야 함 | [EventGreen.log:123](EventGreen.log) — exit0 | pass |
| C++: 실패/Partial도 보류 확장 요청을 현재 범위로 소비해 보존해야 함 | [EventGreen.log:124](EventGreen.log) — exit0 | pass |
| C++: 실패/Partial도 보류 확장 요청을 현재 범위로 소비해 보존해야 함 | [EventGreen.log:125](EventGreen.log) — exit0 | pass |
| C++: PTS 확장은 다른 범위 ID를 사용해야 함 | [EventGreen.log:126](EventGreen.log) — exit0 | pass |
| C++: 미해석 PTS 확장을 이전 complete clip으로 응답하면 안 됨 | [EventGreen.log:127](EventGreen.log) — exit0 | pass |
| C++: segment finalize 실패: | [EventGreen.log:128](EventGreen.log) — exit0 | pass |
| C++: PTS 확장 2회는 최초 포함 총 3회 파생해야 함 | [EventGreen.log:129](EventGreen.log) — exit0 | pass |
| C++: quota journal open 실패: | [EventGreen.log:130](EventGreen.log) — exit0 | pass |
| C++: quota catalog open 실패: | [EventGreen.log:131](EventGreen.log) — exit0 | pass |
| C++: segment finalize 실패: | [EventGreen.log:132](EventGreen.log) — exit0 | pass |
| C++: segment finalize 실패: | [EventGreen.log:133](EventGreen.log) — exit0 | pass |
| C++: quota policy 실패: | [EventGreen.log:134](EventGreen.log) — exit0 | pass |
| C++: event quota는 oldest event를 정리해 새 event write를 허용해야 함: ok | [EventGreen.log:135](EventGreen.log) — exit0 | pass |
| C++: event quota 충족을 위해 continuous를 삭제하면 안 됨 | [EventGreen.log:136](EventGreen.log) — exit0 | pass |
| C++: event quota는 oldest eligible event를 삭제해야 함 | [EventGreen.log:137](EventGreen.log) — exit0 | pass |
| C++: policy 재등록 실패: | [EventGreen.log:138](EventGreen.log) — exit0 | pass |
| C++: policy 제거가 진행 중 event reservation을 지우면 안 됨 | [EventGreen.log:139](EventGreen.log) — exit0 | pass |
| C++: 명시적 complete 뒤 event reservation ID를 재사용할 수 있어야 함 | [EventGreen.log:140](EventGreen.log) — exit0 | pass |
| C++: queue journal open 실패: | [EventGreen.log:141](EventGreen.log) — exit0 | pass |
| C++: queue catalog open 실패: | [EventGreen.log:142](EventGreen.log) — exit0 | pass |
| C++: segment finalize 실패: | [EventGreen.log:143](EventGreen.log) — exit0 | pass |
| C++: queue policy 실패: | [EventGreen.log:144](EventGreen.log) — exit0 | pass |
| C++: bounded queue 밖 durable pending도 완료 뒤 다시 흡수해야 함 | [EventGreen.log:145](EventGreen.log) — exit0 | pass |
| C++: 긴 event remux가 다른 이벤트의 durable link admission을 동기 차단하면 안 됨 | [EventGreen.log:146](EventGreen.log) — exit0 | pass |
| C++: cleanup 실패 시 source hold와 event reservation을 성공처럼 해제하면 안 됨 | [EventGreen.log:147](EventGreen.log) — exit0 | pass |
| C++: terminal marker unlink 실패 시 source/output hold를 유지해야 함 | [EventGreen.log:148](EventGreen.log) — exit0 | pass |
| C++: terminal marker unlink 실패 시 event reservation을 유지해야 함 | [EventGreen.log:149](EventGreen.log) — exit0 | pass |
| C++: marker 복구 중 event/fallback 갱신은 자원·단계를 보존하고 확장 요청을 내구 대기해야 함 | [EventGreen.log:150](EventGreen.log) — exit0 | pass |
| C++: terminal hold 해제 실패를 Complete로 기록하면 안 됨 | [EventGreen.log:151](EventGreen.log) — exit0 | pass |
| C++: terminal 복구 중 event/fallback 갱신이 release 단계를 덮어쓰면 안 됨 | [EventGreen.log:152](EventGreen.log) — exit0 | pass |
| C++: 복구 완료 뒤 내구 대기한 범위 확장은 같은 source epoch의 새 segment로 파생해야 함 | [EventGreen.log:153](EventGreen.log) — exit0 | pass |
| C++: terminal complete commit retry fixture 저장 실패: | [EventGreen.log:154](EventGreen.log) — exit0 | pass |
| C++: complete commit 재시도는 다른 pending event의 source hold를 해제하면 안 됨 | [EventGreen.log:155](EventGreen.log) — exit0 | pass |
| C++: overflow fixture 이전 hold_count가 저장 범위를 넘으면 안 됨 | [EventGreen.log:156](EventGreen.log) — exit0 | pass |
| C++: hold overflow fixture 준비 실패: | [EventGreen.log:157](EventGreen.log) — exit0 | pass |
| C++: event source lease hold_count overflow를 사전에 거부해야 함 | [EventGreen.log:158](EventGreen.log) — exit0 | pass |
| C++: hold fixture journal open 실패: | [EventGreen.log:159](EventGreen.log) — exit0 | pass |
| C++: hold fixture catalog open 실패: | [EventGreen.log:160](EventGreen.log) — exit0 | pass |
| C++: segment finalize 실패: | [EventGreen.log:161](EventGreen.log) — exit0 | pass |
| C++: segment finalize 실패: | [EventGreen.log:162](EventGreen.log) — exit0 | pass |
| C++: hold pending link 저장 실패: | [EventGreen.log:163](EventGreen.log) — exit0 | pass |
| C++: hold replay journal open 실패: | [EventGreen.log:164](EventGreen.log) — exit0 | pass |
| C++: hold replay catalog open 실패: | [EventGreen.log:165](EventGreen.log) — exit0 | pass |
| C++: 재시작 replay가 terminal 전 output/source hold를 함께 복원해야 함 | [EventGreen.log:166](EventGreen.log) — exit0 | pass |
| C++: terminal stage fixture event link 조회 | [EventGreen.log:167](EventGreen.log) — exit0 | pass |
| C++: terminal stage fixture 저장 실패: | [EventGreen.log:168](EventGreen.log) — exit0 | pass |
| C++: terminal stage replay journal open: | [EventGreen.log:169](EventGreen.log) — exit0 | pass |
| C++: terminal stage catalog open: | [EventGreen.log:170](EventGreen.log) — exit0 | pass |
| C++: complete commit 단계 재시작은 이미 해제된 output/source hold를 복원하면 안 됨 | [EventGreen.log:171](EventGreen.log) — exit0 | pass |
| C++: terminal Complete 기록 전 source 삭제 요청을 차단해야 함 | [EventGreen.log:172](EventGreen.log) — exit0 | pass |
| C++: terminal Complete 기록 전 output 삭제 요청을 차단해야 함 | [EventGreen.log:173](EventGreen.log) — exit0 | pass |
| C++: restart journal open 실패: | [EventGreen.log:174](EventGreen.log) — exit0 | pass |
| C++: restart catalog open 실패: | [EventGreen.log:175](EventGreen.log) — exit0 | pass |
| C++: segment finalize 실패: | [EventGreen.log:176](EventGreen.log) — exit0 | pass |
| C++: segment finalize 실패: | [EventGreen.log:177](EventGreen.log) — exit0 | pass |
| C++: restart pending link 저장 실패: | [EventGreen.log:178](EventGreen.log) — exit0 | pass |
| C++: 재시작은 이미 finalized된 결정적 event segment를 재파생 없이 연결해야 함 | [EventGreen.log:179](EventGreen.log) — exit0 | pass |
| C++: 재시작 복구에서 event clip을 중복 파생하면 안 됨 | [EventGreen.log:180](EventGreen.log) — exit0 | pass |
| C++: segment finalize 실패: | [EventGreen.log:181](EventGreen.log) — exit0 | pass |
| C++: conflict pending link 저장 실패: | [EventGreen.log:182](EventGreen.log) — exit0 | pass |
| C++: 다른 channel/class의 동일 segment ID를 event 결과로 오인하면 안 됨 | [EventGreen.log:183](EventGreen.log) — exit0 | pass |
| C++: segment ID conflict에서 파생을 실행하면 안 됨 | [EventGreen.log:184](EventGreen.log) — exit0 | pass |
| C++: 실제 H264/MP4 source를 video 재인코딩 없이 remux해야 함: | [EventGreen.log:185](EventGreen.log) — exit0 | pass |
| C++: remux 결과 파일과 size가 일치해야 함 | [EventGreen.log:186](EventGreen.log) — exit0 | pass |
| C++: event clip actual range는 keyframe 확대를 측정해 requested range와 분리해야 함 | [EventGreen.log:187](EventGreen.log) — exit0 | pass |
| C++: event clip이 source segment 전체 단순 연결보다 작아야 함 | [EventGreen.log:188](EventGreen.log) — exit0 | pass |
| C++: remux 결과 checksum과 crash cleanup marker를 남겨야 함 | [EventGreen.log:189](EventGreen.log) — exit0 | pass |
| C++: 동일 final은 소유 artifact가 없는 terminal 충돌로 거부하고 기존 clip을 보존해야 함 | [EventGreen.log:190](EventGreen.log) — exit0 | pass |
| C++: 파생 H264/MP4 clip이 끝까지 demux/parse 가능해야 함: | [EventGreen.log:191](EventGreen.log) — exit0 | pass |
| C++: nonce partial은 foreign 고정 partial을 보존하면서 독립 파생되어야 함 | [EventGreen.log:192](EventGreen.log) — exit0 | pass |
| C++: event remux recovery journal open 실패: | [EventGreen.log:193](EventGreen.log) — exit0 | pass |
| C++: 재시작은 marker nonce와 일치하는 owned crash partial만 정리해야 함: | [EventGreen.log:194](EventGreen.log) — exit0 | pass |
| C++: owned crash partial 복구 뒤 동일 event clip 재파생이 성공해야 함: | [EventGreen.log:195](EventGreen.log) — exit0 | pass |
| C++: VP8/WebM test source 생성 실패: | [EventGreen.log:196](EventGreen.log) — exit0 | pass |
| C++: VP8/WebM test source demux 실패: | [EventGreen.log:197](EventGreen.log) — exit0 | pass |
| C++: 검증되지 않은 VP8/WebM event remux는 산출물 없이 fail-closed해야 함 | [EventGreen.log:198](EventGreen.log) — exit0 | pass |
| application: application header is standard-only with exact DTO/default manifests | [EventGreen.log:200](EventGreen.log) — exit0 | pass |
| application: application source owns exact canonical mapping and overwrite semantics | [EventGreen.log:201](EventGreen.log) — exit0 | pass |
| application: transport has zero canonical bypass and exact projection/call ordering | [EventGreen.log:202](EventGreen.log) — exit0 | pass |
| application: recording link is durably admitted before the bounded storage queue can drop an event | [EventGreen.log:203](EventGreen.log) — exit0 | pass |
| application: event clip output remains fd-bound and measured before no-replace publication | [EventGreen.log:204](EventGreen.log) — exit0 | pass |
| application: compiled fake canonical matrix preserves all fields failure/null outputs and lifecycle order | [EventGreen.log:205](EventGreen.log) — exit0 | pass |
| application: S05 composition starts the bridge before ingress and drains it after storage | [EventGreen.log:206](EventGreen.log) — exit0 | pass |
| runtime disabled-admit: 실제 EventStorage worker 진입을 관찰한다 | [EventGreen.log:208](EventGreen.log) — exit0 | pass |
| runtime disabled-admit: worker 처리 전에 첫 이벤트 연결이 내구 접수된다 | [EventGreen.log:209](EventGreen.log) — exit0 | pass |
| runtime disabled-admit: 실제 저장 큐 크기 2에서 다섯 접수 중 두 이벤트가 퇴출된다 | [EventGreen.log:210](EventGreen.log) — exit0 | pass |
| runtime disabled-admit: 퇴출 이벤트를 포함한 다섯 PTS 연결이 worker 해제 전에 보존된다 | [EventGreen.log:211](EventGreen.log) — exit0 | pass |
| runtime disabled-admit: 저장 worker drain 뒤에도 다섯 연결과 시간축이 보존된다 | [EventGreen.log:212](EventGreen.log) — exit0 | pass |
| runtime disabled-admit: JSONL 설정에 따른 실제 저장 수와 빈 큐를 확인한다 | [EventGreen.log:213](EventGreen.log) — exit0 | pass |
| runtime disabled-admit: JSONL 비활성은 파일 없음이고 활성은 생존 이벤트 세 개와 link ID가 일치한다 | [EventGreen.log:214](EventGreen.log) — exit0 | pass |
| runtime disabled-recover: 새 프로세스의 빈 SQLite를 journal로 재구축해 다섯 PTS 연결을 복구한다 | [EventGreen.log:216](EventGreen.log) — exit0 | pass |
| runtime disabled-recover: 퇴출 이벤트까지 UTC 매핑 후 다섯 실제 H264 파생 파일이 완료된다 | [EventGreen.log:217](EventGreen.log) — exit0 | pass |
| runtime disabled-recover: 같은 이벤트 재접수는 복구된 다섯 clip ID를 바꾸거나 추가하지 않는다 | [EventGreen.log:218](EventGreen.log) — exit0 | pass |
| runtime enabled-admit: 실제 EventStorage worker 진입을 관찰한다 | [EventGreen.log:220](EventGreen.log) — exit0 | pass |
| runtime enabled-admit: worker 처리 전에 첫 이벤트 연결이 내구 접수된다 | [EventGreen.log:221](EventGreen.log) — exit0 | pass |
| runtime enabled-admit: 실제 저장 큐 크기 2에서 다섯 접수 중 두 이벤트가 퇴출된다 | [EventGreen.log:222](EventGreen.log) — exit0 | pass |
| runtime enabled-admit: 퇴출 이벤트를 포함한 다섯 PTS 연결이 worker 해제 전에 보존된다 | [EventGreen.log:223](EventGreen.log) — exit0 | pass |
| runtime enabled-admit: 저장 worker drain 뒤에도 다섯 연결과 시간축이 보존된다 | [EventGreen.log:224](EventGreen.log) — exit0 | pass |
| runtime enabled-admit: JSONL 설정에 따른 실제 저장 수와 빈 큐를 확인한다 | [EventGreen.log:225](EventGreen.log) — exit0 | pass |
| runtime enabled-admit: JSONL 비활성은 파일 없음이고 활성은 생존 이벤트 세 개와 link ID가 일치한다 | [EventGreen.log:226](EventGreen.log) — exit0 | pass |
| runtime enabled-recover: 새 프로세스의 빈 SQLite를 journal로 재구축해 다섯 PTS 연결을 복구한다 | [EventGreen.log:228](EventGreen.log) — exit0 | pass |
| runtime enabled-recover: 퇴출 이벤트까지 UTC 매핑 후 다섯 실제 H264 파생 파일이 완료된다 | [EventGreen.log:229](EventGreen.log) — exit0 | pass |
| runtime enabled-recover: 같은 이벤트 재접수는 복구된 다섯 clip ID를 바꾸거나 추가하지 않는다 | [EventGreen.log:230](EventGreen.log) — exit0 | pass |
| runtime shutdown-cancel: post-event frame 대기 중인 실제 storage worker를 관찰한다 | [EventGreen.log:232](EventGreen.log) — exit0 | pass |
| runtime shutdown-cancel: 종료 신호가 post-event frame 대기를 깨워 1초 안에 worker를 drain한다 | [EventGreen.log:233](EventGreen.log) — exit0 | pass |
| runtime shutdown-cancel: frame 대기 취소 뒤에도 EventRecord JSONL을 유실하지 않는다 | [EventGreen.log:234](EventGreen.log) — exit0 | pass |
| disabled-guard: PASS (실제 assertion의 RED 확인) | [EventGreen.log:236](EventGreen.log) — exit0 | pass |
| prequeue-admission: PASS (실제 assertion의 RED 확인) | [EventGreen.log:237](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I01 — V410-S05-I01-C01(1회), V410-S05-I01-C02(1회), V410-S05-I01-C03(1회) | [EventGreen.log:240](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I02 — V410-S05-I02-C01(1회), V410-S05-I02-C02(1회), V410-S05-I02-C03(1회), V410-S05-I02-C04(1회), V410-S05-I02-C05(1회), V410-S05-I02-C06(1회), V410-S05-I02-C07(1회), V410-S05-I02-C08(1회), V410-S05-I02-C09(1회), V410-S05-I02-C10(1회), V410-S05-I02-C11(1회), V410-S05-I02-C12(1회), V410-S05-I02-C13(1회), V410-S05-I02-C14(1회), V410-S05-I02-C15(1회), V410-S05-I02-C16(1회), V410-S05-I02-C17(1회), V410-S05-I02-C18(1회), V410-S05-I02-C19(1회), V410-S05-I02-C20(1회), V410-S05-I02-C21(1회) | [EventGreen.log:241](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I03 — V410-S05-I03-C01(1회) | [EventGreen.log:242](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I04 — V410-S05-I04-C01(1회), V410-S05-I04-C02(1회), V410-S05-I04-C03(1회) | [EventGreen.log:243](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I05 — V410-S05-I05-C01(1회), V410-S05-I05-C02(1회), V410-S05-I05-C03(1회) | [EventGreen.log:244](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I06 — V410-S05-I06-C01(1회), V410-S05-I06-C02(1회), V410-S05-I06-C03(1회), V410-S05-I06-C04(1회), V410-S05-I06-C05(1회), V410-S05-I06-C06(1회), V410-S05-I06-C07(1회), V410-S05-I06-C08(1회) | [EventGreen.log:245](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I07 — V410-S05-I07-C01(1회), V410-S05-I07-C02(1회), V410-S05-I07-C03(1회), V410-S05-I07-C04(1회) | [EventGreen.log:246](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I08 — V410-S05-I08-C01(17회), V410-S05-I08-C02(3회) | [EventGreen.log:247](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I09 — V410-S05-I09-C01(1회), V410-S05-I09-C02(1회), V410-S05-I09-C03(1회), V410-S05-I09-C04(1회) | [EventGreen.log:248](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I10 — V410-S05-I10-C01(1회) | [EventGreen.log:249](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I11 — V410-S05-I11-C01(1회) | [EventGreen.log:250](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I12 — V410-S05-I12-C01(1회) | [EventGreen.log:251](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I13 — V410-S05-I13-C01(1회), V410-S05-I13-C02(1회), V410-S05-I13-C03(1회) | [EventGreen.log:252](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I14 — V410-S05-I14-C01(1회), V410-S05-I14-C02(1회), V410-S05-I14-C03(1회), V410-S05-I14-C04(1회), V410-S05-I14-C05(1회) | [EventGreen.log:253](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I15 — V410-S05-I15-C01(1회), V410-S05-I15-C02(1회) | [EventGreen.log:254](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I16 — V410-S05-I16-C01(1회), V410-S05-I16-C02(1회) | [EventGreen.log:255](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I17 — V410-S05-I17-C01(1회) | [EventGreen.log:256](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I18 — V410-S05-I18-C01(1회), V410-S05-I18-C02(1회) | [EventGreen.log:257](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I19 — V410-S05-I19-C01(1회), V410-S05-I19-C02(1회) | [EventGreen.log:258](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I20 — V410-S05-I20-C01(1회), V410-S05-I20-C02(1회), V410-S05-I20-C03(1회), V410-S05-I20-C04(1회), V410-S05-I20-C05(1회) | [EventGreen.log:259](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I21 — V410-S05-I21-C01(1회), V410-S05-I21-C02(2회), V410-S05-I21-C03(1회), V410-S05-I21-C04(1회), V410-S05-I21-C05(1회) | [EventGreen.log:260](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I22 — V410-S05-I22-C01(1회) | [EventGreen.log:261](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I23 — V410-S05-I23-C01(1회), V410-S05-I23-C02(1회) | [EventGreen.log:262](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I24 — V410-S05-I24-C01(1회), V410-S05-I24-C02(1회), V410-S05-I24-C03(1회), V410-S05-I24-C04(1회) | [EventGreen.log:263](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I25 — V410-S05-I25-C01(1회) | [EventGreen.log:264](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I26 — V410-S05-I26-C01(1회) | [EventGreen.log:265](EventGreen.log) — exit0 | pass |
| 기능집계 V410-S05-I27 — V410-S05-I27-C01(1회), V410-S05-I27-C02(1회), V410-S05-I27-C03(1회), V410-S05-I27-C04(1회) | [EventGreen.log:266](EventGreen.log) — exit0 | pass |


## 실패·미실행

1. 패치 도구가 동일 파일 Delete+Add 조합을 거부했다. 파일 변경이나 테스트 실행 없이 실패했고 Update 방식으로 수정했다. 제품 실패로 분류하지 않는다.
2. C405 직접 raw mutation에 mutation_id를 넣지 않아 `opaque ID 길이 오류`로 exit2. 명시 ID를 넣고 재검증했다. 최초 실패 로그를 보존했다.
3. 기존 event 회귀의 GST-on 컴파일: `event_clip_deriver.cpp:582`에서 `FinalizeReadyTicket` aggregate에 `segment_v2` 초기화가 빠져 `-Werror,-Wmissing-field-initializers` 실패. 최초 실행의 뒤 C++/application/runtime은 건너뛰었다. 메인이 `recording_finalize_recovery.h`의 optional 선언을 `segment_v2{}`로 바꿔 동일 부재 초기화를 명시했다. 담당자는 승인된 같은 명령을 재실행하여 exit0을 확인했다. 최초 실패는 Event.log, 재실행 전체 원출력은 EventGreen.log에 남겼다. optional 초기화 표기 외 의미가 바뀌지 않아 메인 판단으로 앞선 유효 회귀는 재실행하지 않았다.
4. 실제 제품 UI/서버 기본 전환/3C-5 파생 clip/외부 네트워크/장시간은 미실행이며 이번 담당 범위 밖이다.

## 임시 산출물

모든 runner는 실행 소유 root를 종료 trap에서 삭제했다. 로그 원문에는 경로와 확인 결과가 있다. 영상 대신 12바이트 컨테이너 표식만 사용한 새 catalog fixture는 재생 가능성 증명이 아니며 삭제했다. correlation은 자체 영상→실제 decoder, event 회귀는 기존 실제 미디어 파생 경로를 별도로 검사한다.

| 경로 basename | 삭제 전 크기 | 조치/결과 |
| --- | ---: | --- |
| consumer-connection.jGE6tq | 3,040,696 B | removed=true |
| consumer-connection.XMQyFz | 3,040,696 B | removed=true |
| consumer-connection.8SeFW7 | 3,514,210 B | removed=true |
| consumer-connection.MFJk0p | 3,653,986 B | removed=true |
| consumer-connection.LnYMlP | 4,013,851 B | removed=true |
| consumer-connection.rTLB1T | 4,512,544 B | removed=true |
| consumer-connection.tWcJiI | 4,513,376 B | removed=true |
| consumer-connection.rjAhF9 | 4,512,389 B | removed=true |
| consumer-connection.3SgOxw | 4,513,808 B | removed=true |
| consumer-reference.rrt7pf | 3,504,621 B | removed=true |
| binding.A8lmA9 | 4,773,856 B | removed=true |
| frame-correlation.8Q3jCK | 273,176 B | removed=true |
| media-server-s07.K73c9i | 4,036 KiB (`du -sk`; byte 미집계) | temporary cleanup PASS |
| media_server_v410_event_recording.0Tajy3 | 0 B | removed=true |
| media_server_v410_event_recording.7ADEmK | 4,685,691 B | removed=true |
| media_server_s05_storage_runtime_zj430U | 14,564,374 B (47 files) | removed=true |

최종 증적 로그는 이 디렉터리에 보존한다. 자격증명·원본 URL·영상이 없는 자체 fixture 결과이며 재현 명령, 실패 이력, cleanup 검증을 보존하기 위한 목적이다.

## 동결 제품 SHA256

| 파일 | SHA256 |
| --- | --- |
| include/recording/analysis_observation_projector.h | 6644d80c4834d3e9f3ce0c4e07a1ffe4cb2add043c1530b0b233cef4794bb8f9 |
| include/recording/event_recording_bridge.h | de8846772e5d113ee3eed7d808364a1da6cc7524365b568b138eecefc8a5a4ff |
| include/recording/recording_catalog.h | 849936dc8b99664386c50d0af54c25c0759a671d09253124c14de0f114d22338 |
| include/recording/recording_contracts.h | 89a2b2773a04a6086f281074440d5f5aaefaa09ee29db3a46ebd2119a13d40e0 |
| include/recording/recording_journal.h | fc6da03fe6e7454f00191532f6c42dcca31416ef9c4a21388002cdfb6689ce5d |
| include/recording/recording_read_service.h | 25ffaae27fa1363e9448f5567d50b0c5b8bb612e3df1875e6cba393162e83714 |
| src/recording/analysis_observation_projector.cpp | dfce76d71bac202ec922f2d7b1960094731c882ee29c3acfdf59108dcf8ea39f |
| src/recording/event_recording_bridge.cpp | ac0ffc2c0311bb18a518dba41cb8b36b93272c98fbe9cd7055f8ea6a40b21c39 |
| src/recording/recording_catalog.cpp | cd3e9fb8962ad321acab26144137e5d803da1ca3125906b97768177ae53e9e21 |
| src/recording/recording_contracts.cpp | c68df8fdbfcacfc86a1ee51f9ac515e47751c51b9861af4080089aa1d74da0b0 |
| src/recording/recording_journal.cpp | a1a0a31c4c3e644bdb0c5d33b570ae5f317260a398809e9719f4387674508343 |
| src/recording/recording_read_service.cpp | 2f5d309d8b2ae020f418689b231ea4069204064f7e53e6ae22253f3063325d89 |
| include/recording/recording_finalize_recovery.h (메인의 optional 초기화 보완) | 49145922f006c10dada5effd9342a684ebea51f96cb0833769232342a7752ab0 |
