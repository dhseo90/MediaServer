# D01 전수 실행 결과

독자: 구현·검토 담당자. lifecycle: 원출력 자동 추출 보존. 정책은 AGENTS, 중앙 기록은 release-test-records다.

## D01-FinalFocused.log

명령 exit 0, 11 pass / 0 fail. [원출력](D01-FinalFocused.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| D01-01 consumer 숫자 참조 원문 왕복 | D01-FinalFocused.log:1 | pass | 실제 assertion |
| D01-02 빈 참조·경로 이탈 거부 | D01-FinalFocused.log:2 | pass | 실제 assertion |
| D01-10 숫자 참조 길이128/129·금지 문자·중간 경로 표현 | D01-FinalFocused.log:3 | pass | 실제 assertion |
| D01-03 생성 reference/owner/namespace 숫자-only 거부 유지 | D01-FinalFocused.log:4 | pass | 실제 assertion |
| D01-04 journal order 숫자 channel 왕복 | D01-FinalFocused.log:5 | pass | 실제 assertion |
| D01-05 order request/segment 숫자-only 거부 유지 | D01-FinalFocused.log:6 | pass | 실제 assertion |
| D01-06 실제 H264 writer→finalized segment/binding 숫자 원문 보존 | D01-FinalFocused.log:7 | pass | 실제 assertion |
| D01-11 segment/store/epoch/order/generation 생성 ID 숫자-only 거부 | D01-FinalFocused.log:8 | pass | 실제 assertion |
| D01-07 catalog consumer 숫자 채널 저장·조회 | D01-FinalFocused.log:9 | pass | 실제 assertion |
| D01-08 숫자 채널 media/UTC range·location 입력 허용 | D01-FinalFocused.log:10 | pass | 실제 assertion |
| D01-09 새 catalog/journal 재개방 숫자 참조 유지 | D01-FinalFocused.log:11 | pass | 실제 assertion |

## D01-Identity.log

명령 exit 0, 23 pass / 0 fail. [원출력](D01-Identity.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| V410-IDMAP-I01 | D01-Identity.log:1 | pass | 실제 assertion |
| V410-IDMAP-I02 | D01-Identity.log:2 | pass | 실제 assertion |
| V410-IDMAP-I03 | D01-Identity.log:3 | pass | 실제 assertion |
| V410-IDMAP-I04 | D01-Identity.log:4 | pass | 실제 assertion |
| V410-IDMAP-I05 | D01-Identity.log:5 | pass | 실제 assertion |
| V410-IDMAP-I06 | D01-Identity.log:6 | pass | 실제 assertion |
| V410-IDMAP-I07 | D01-Identity.log:7 | pass | 실제 assertion |
| S07-time-session-start | D01-Identity.log:8 | pass | 실제 assertion |
| S07-time-session-input | D01-Identity.log:9 | pass | 실제 assertion |
| S07-time-session-range | D01-Identity.log:10 | pass | 실제 assertion |
| S07-time-session-accepted-gap-null | D01-Identity.log:11 | pass | 실제 assertion |
| S07-time-session-ambiguous-channel | D01-Identity.log:12 | pass | 실제 assertion |
| S07-time-finalize-success-observer-exception-isolated | D01-Identity.log:13 | pass | 실제 assertion |
| S07-time-session-restart | D01-Identity.log:14 | pass | 실제 assertion |
| S07-time-session-restart-null | D01-Identity.log:15 | pass | 실제 assertion |
| S07-time-finalize-failure-no-observer-stop-null | D01-Identity.log:16 | pass | 실제 assertion |
| V410-IDMAP-I08 | D01-Identity.log:17 | pass | 실제 assertion |
| V410-IDMAP-I09 | D01-Identity.log:18 | pass | 실제 assertion |
| V410-IDMAP-I10 | D01-Identity.log:19 | pass | 실제 assertion |
| V410-IDMAP-I11 | D01-Identity.log:20 | pass | 실제 assertion |
| V410-IDMAP-I12 | D01-Identity.log:21 | pass | 실제 assertion |
| V410-IDMAP-I13 | D01-Identity.log:22 | pass | 실제 assertion |
| S07-time-session-blocked-writer-null-nonblocking | D01-Identity.log:23 | pass | 실제 assertion |

## D01-Reference.log

명령 exit 0, 19 pass / 0 fail. [원출력](D01-Reference.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| C341 계약 왕복 | D01-Reference.log:1 | pass | 실제 assertion |
| C342 unknown/중복 필드 거부 | D01-Reference.log:2 | pass | 실제 assertion |
| C343 ID·종류·소유자 제약 | D01-Reference.log:3 | pass | 실제 assertion |
| C344 품질·원본 nullable 조합 | D01-Reference.log:4 | pass | 실제 assertion |
| C345 원본 수치·track 경계 | D01-Reference.log:5 | pass | 실제 assertion |
| C346 event 요청·시간축 | D01-Reference.log:6 | pass | 실제 assertion |
| C347 observation 요청 금지 | D01-Reference.log:7 | pass | 실제 assertion |
| C348 요청 음수·역전·padding | D01-Reference.log:8 | pass | 실제 assertion |
| C419 media-pts 초기 요청 원문 왕복 | D01-Reference.log:9 | pass | 실제 assertion |
| C420 UTC 초기 요청 원문 왕복 | D01-Reference.log:10 | pass | 실제 assertion |
| C421 0·최대 pre 요청 및 오류 경계 | D01-Reference.log:11 | pass | 실제 assertion |
| C349 미지원 schema 거부 | D01-Reference.log:12 | pass | 실제 assertion |
| C350 실제 원장 저장·조회 | D01-Reference.log:13 | pass | 실제 assertion |
| C351 동일 참조 멱등 | D01-Reference.log:14 | pass | 실제 assertion |
| C352 동일 ID 충돌 거부 | D01-Reference.log:15 | pass | 실제 assertion |
| C353 opt-in·미open 거부 | D01-Reference.log:16 | pass | 실제 assertion |
| C354 SQL·JSONL 재시작 동등 | D01-Reference.log:17 | pass | 실제 assertion |
| C355 checkpoint 참조 보존 | D01-Reference.log:18 | pass | 실제 assertion |
| C356 손상·충돌 replay 선차단 | D01-Reference.log:29 | pass | 실제 assertion |

## D01-Connection.log

명령 exit 0, 22 pass / 0 fail. [원출력](D01-Connection.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| C401 관측·참조 원자 저장 | D01-Connection.log:1 | pass | 실제 assertion |
| C402 쌍 identity 불일치 거부 | D01-Connection.log:2 | pass | 실제 assertion |
| C403 동일 원본 재전달·event 병합 | D01-Connection.log:3 | pass | 실제 assertion |
| C405 SQL·JSONL·checkpoint 쌍 복구 | D01-Connection.log:4 | pass | 실제 assertion |
| C404 다른 원본 동일PTS 구분 | D01-Connection.log:5 | pass | 실제 assertion |
| C406 실제 OnResult 원본 참조 저장 | D01-Connection.log:6 | pass | 실제 assertion |
| C407 OnEvent 강제 표본 | D01-Connection.log:7 | pass | 실제 assertion |
| C408 종료track 과거참조 보존 | D01-Connection.log:8 | pass | 실제 assertion |
| C409 종료track 참조부재 unknown | D01-Connection.log:9 | pass | 실제 assertion |
| C410 sampling·queue·StopAndDrain 회귀 | D01-Connection.log:10 | pass | 실제 assertion |
| C411 exact·미색인 복수 후보 보존 | D01-Connection.log:11 | pass | 실제 assertion |
| C412 nearest/ambiguous/unavailable 미승격 | D01-Connection.log:12 | pass | 실제 assertion |
| C413 UTC unknown·삭제 상태 재판정 | D01-Connection.log:13 | pass | 실제 assertion |
| C414 실제 TryResolve 요청참조 저장 | D01-Connection.log:14 | pass | 실제 assertion |
| C415 event 재전달·확장·세대 구분 | D01-Connection.log:15 | pass | 실제 assertion |
| C416 source/channel 충돌 거부 | D01-Connection.log:16 | pass | 실제 assertion |
| C417 같은 원본 미디어 교집합 우선 | D01-Connection.log:17 | pass | 실제 assertion |
| C418 공개 결과·구형 fallback 불변 | D01-Connection.log:18 | pass | 실제 assertion |
| C422 실제 bridge 초기 pre-roll 수락·pending 유지 | D01-Connection.log:19 | pass | 실제 assertion |
| C423 초기 요청 멱등·갱신·generation 분리 | D01-Connection.log:20 | pass | 실제 assertion |
| C424 초기 요청 SQL·JSONL 복구 | D01-Connection.log:21 | pass | 실제 assertion |
| C425 초기 요청 checkpoint 복구 | D01-Connection.log:22 | pass | 실제 assertion |

## D01-Range.log

명령 exit 0, 16 pass / 0 fail. [원출력](D01-Range.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| S10-C201 미디어 구간 mapping 경계 | D01-Range.log:1 | pass | 실제 assertion |
| S10-C202 unknown UTC의 미디어 위치 | D01-Range.log:2 | pass | 실제 assertion |
| S10-C203 미디어 범위 밖 | D01-Range.log:3 | pass | 실제 assertion |
| S10-C204 미확정 끝 | D01-Range.log:4 | pass | 실제 assertion |
| S10-C205 UTC 중첩 mapping | D01-Range.log:5 | pass | 실제 assertion |
| S10-C206 저장소 경계·결정 순서 | D01-Range.log:6 | pass | 실제 assertion |
| S10-C207 정상 segment 분할 | D01-Range.log:7 | pass | 실제 assertion |
| S10-C208 반열린 구간 경계 | D01-Range.log:8 | pass | 실제 assertion |
| S10-C209 유리수·비정수 경계 | D01-Range.log:9 | pass | 실제 assertion |
| S10-C210 정수 범위 안전성 | D01-Range.log:10 | pass | 실제 assertion |
| S10-C211 UTC 공백·unplaced 구분 | D01-Range.log:11 | pass | 실제 assertion |
| S10-C212 입력 오류 초기화 | D01-Range.log:12 | pass | 실제 assertion |
| S10-C213 삭제·채널 경계 | D01-Range.log:13 | pass | 실제 assertion |
| S10-C214 재시작 SQL·JSONL 동등 | D01-Range.log:14 | pass | 실제 assertion |
| S10-C215 원본 mapping·조회 불변 | D01-Range.log:15 | pass | 실제 assertion |
| S10-C216 unknown 채널 격리 | D01-Range.log:16 | pass | 실제 assertion |

## D01-Catalog.log

명령 exit 0, 246 pass / 0 fail. [원출력](D01-Catalog.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| journal open:  | D01-Catalog.log:1 | pass | 실제 assertion |
| fallback catalog open:  | D01-Catalog.log:2 | pass | 실제 assertion |
| SQLite off mode 표시 | D01-Catalog.log:3 | pass | 실제 assertion |
| segment finalize journal+projection:  | D01-Catalog.log:4 | pass | 실제 assertion |
| fallback range query | D01-Catalog.log:5 | pass | 실제 assertion |
| event link FK 위반 거부 | D01-Catalog.log:6 | pass | 실제 assertion |
| FK 위반 transaction/journal 전체 rollback | D01-Catalog.log:7 | pass | 실제 assertion |
| 최초 durable mutation 1개 | D01-Catalog.log:8 | pass | 실제 assertion |
| 동일 mutation 중복 append | D01-Catalog.log:9 | pass | 실제 assertion |
| 손상 사이 정상 durable mutation 보존 | D01-Catalog.log:10 | pass | 실제 assertion |
| 중간 corrupt line count | D01-Catalog.log:11 | pass | 실제 assertion |
| 마지막 truncated line skip | D01-Catalog.log:12 | pass | 실제 assertion |
| fallback replay open | D01-Catalog.log:13 | pass | 실제 assertion |
| 같은 mutation idempotent replay | D01-Catalog.log:14 | pass | 실제 assertion |
| 재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존 | D01-Catalog.log:15 | pass | 실제 assertion |
| 중복 replay row/합계 불증가 | D01-Catalog.log:16 | pass | 실제 assertion |
| 추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구:  | D01-Catalog.log:17 | pass | 실제 assertion |
| writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed | D01-Catalog.log:18 | pass | 실제 assertion |
| v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed | D01-Catalog.log:19 | pass | 실제 assertion |
| SQLite catalog open/rebuild:  | D01-Catalog.log:20 | pass | 실제 assertion |
| SQLite primary mode 표시 | D01-Catalog.log:21 | pass | 실제 assertion |
| SQLite on/off range query ID·순서 parity | D01-Catalog.log:22 | pass | 실제 assertion |
| journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분 | D01-Catalog.log:23 | pass | 실제 assertion |
| journal 없는 손상 media orphan 구분 | D01-Catalog.log:24 | pass | 실제 assertion |
| projection failover journal open:  | D01-Catalog.log:25 | pass | 실제 assertion |
| projection failover catalog open:  | D01-Catalog.log:26 | pass | 실제 assertion |
| 실제 SQLite INSERT 실패 trigger 설치 | D01-Catalog.log:27 | pass | 실제 assertion |
| SQLite 투영 실패 뒤 journal+memory finalize 유지:  | D01-Catalog.log:28 | pass | 실제 assertion |
| SQLite 투영 실패 즉시 JSONL fallback 전환 | D01-Catalog.log:29 | pass | 실제 assertion |
| 재시작 rebuild 전 실패 trigger 제거 | D01-Catalog.log:30 | pass | 실제 assertion |
| 투영 실패 직후 in-memory query 정합성 유지 | D01-Catalog.log:31 | pass | 실제 assertion |
| projection failover 재시작 journal rebuild:  | D01-Catalog.log:32 | pass | 실제 assertion |
| 재시작 후 journal에서 누락 SQLite projection 복구 | D01-Catalog.log:33 | pass | 실제 assertion |
| 재시작 후 SQLite primary 복귀 | D01-Catalog.log:34 | pass | 실제 assertion |
| 재시작 journal rebuild가 실제 SQLite row 복원 | D01-Catalog.log:35 | pass | 실제 assertion |
| tombstone journal open:  | D01-Catalog.log:36 | pass | 실제 assertion |
| tombstone catalog open:  | D01-Catalog.log:37 | pass | 실제 assertion |
| tombstone 대상 segment finalize:  | D01-Catalog.log:38 | pass | 실제 assertion |
| tombstone 대상 deletion request:  | D01-Catalog.log:39 | pass | 실제 assertion |
| tombstone 완료 기록:  | D01-Catalog.log:40 | pass | 실제 assertion |
| catalog finalize가 tombstone segment ID 재사용을 거부해야 함 | D01-Catalog.log:41 | pass | 실제 assertion |
| 손상 SQLite 격리 후 journal rebuild:  | D01-Catalog.log:42 | pass | 실제 assertion |
| 손상 SQLite 원본 격리 | D01-Catalog.log:43 | pass | 실제 assertion |
| 격리 SQLite 파일 보존 | D01-Catalog.log:44 | pass | 실제 assertion |
| 격리 후 journal rebuild 결과 | D01-Catalog.log:45 | pass | 실제 assertion |
| S10-3A future-schema journal read open | D01-Catalog.log:46 | pass | 실제 assertion |
| S10-3A future-schema unsupported classification | D01-Catalog.log:47 | pass | 실제 assertion |
| S10-3A future-schema catalog open denied | D01-Catalog.log:48 | pass | 실제 assertion |
| S10-3A future-schema catalog retry denied | D01-Catalog.log:49 | pass | 실제 assertion |
| S10-3A future-schema journal bytes preserved | D01-Catalog.log:50 | pass | 실제 assertion |
| S10-3A future-schema SQLite bytes preserved | D01-Catalog.log:51 | pass | 실제 assertion |
| S10-3A future-schema writer cleanup untouched | D01-Catalog.log:52 | pass | 실제 assertion |
| S10-3A arbitrary-schema journal read open | D01-Catalog.log:53 | pass | 실제 assertion |
| S10-3A arbitrary-schema unsupported classification | D01-Catalog.log:54 | pass | 실제 assertion |
| S10-3A arbitrary-schema catalog open denied | D01-Catalog.log:55 | pass | 실제 assertion |
| S10-3A arbitrary-schema catalog retry denied | D01-Catalog.log:56 | pass | 실제 assertion |
| S10-3A arbitrary-schema journal bytes preserved | D01-Catalog.log:57 | pass | 실제 assertion |
| S10-3A arbitrary-schema SQLite bytes preserved | D01-Catalog.log:58 | pass | 실제 assertion |
| S10-3A arbitrary-schema writer cleanup untouched | D01-Catalog.log:59 | pass | 실제 assertion |
| S10-3A empty-schema journal read open | D01-Catalog.log:60 | pass | 실제 assertion |
| S10-3A empty-schema unsupported classification | D01-Catalog.log:61 | pass | 실제 assertion |
| S10-3A empty-schema catalog open denied | D01-Catalog.log:62 | pass | 실제 assertion |
| S10-3A empty-schema catalog retry denied | D01-Catalog.log:63 | pass | 실제 assertion |
| S10-3A empty-schema journal bytes preserved | D01-Catalog.log:64 | pass | 실제 assertion |
| S10-3A empty-schema SQLite bytes preserved | D01-Catalog.log:65 | pass | 실제 assertion |
| S10-3A empty-schema writer cleanup untouched | D01-Catalog.log:66 | pass | 실제 assertion |
| S10-3A future-type journal read open | D01-Catalog.log:67 | pass | 실제 assertion |
| S10-3A future-type unsupported classification | D01-Catalog.log:68 | pass | 실제 assertion |
| S10-3A future-type catalog open denied | D01-Catalog.log:69 | pass | 실제 assertion |
| S10-3A future-type catalog retry denied | D01-Catalog.log:70 | pass | 실제 assertion |
| S10-3A future-type journal bytes preserved | D01-Catalog.log:71 | pass | 실제 assertion |
| S10-3A future-type SQLite bytes preserved | D01-Catalog.log:72 | pass | 실제 assertion |
| S10-3A future-type writer cleanup untouched | D01-Catalog.log:73 | pass | 실제 assertion |
| S10-3A malformed journal open | D01-Catalog.log:74 | pass | 실제 assertion |
| S10-3A malformed JSON missing fields and wrong types remain corrupt | D01-Catalog.log:75 | pass | 실제 assertion |
| S10-O01 reservation journal open | D01-Catalog.log:76 | pass | 실제 assertion |
| S10-O01 first reservation returns four IDs and sequence one | D01-Catalog.log:77 | pass | 실제 assertion |
| S10-O01 versioned reservation payload replays | D01-Catalog.log:78 | pass | 실제 assertion |
| S10-O01 new reservation records actual occurred time | D01-Catalog.log:79 | pass | 실제 assertion |
| S10-O02 identical retry preserves sequence and bytes | D01-Catalog.log:80 | pass | 실제 assertion |
| S10-O03 reopened instance allocates next sequence | D01-Catalog.log:81 | pass | 실제 assertion |
| S10-O03 new process resumes durable sequence | D01-Catalog.log:82 | pass | 실제 assertion |
| S10-O04 different store rejected | D01-Catalog.log:83 | pass | 실제 assertion |
| S10-O04 reused request with different segment rejected | D01-Catalog.log:84 | pass | 실제 assertion |
| S10-O04 reused request with different channel rejected | D01-Catalog.log:85 | pass | 실제 assertion |
| S10-O04 reused segment with different request rejected | D01-Catalog.log:86 | pass | 실제 assertion |
| S10-O04 conflicts preserve original bytes | D01-Catalog.log:87 | pass | 실제 assertion |
| S10-O05/O06 reject and preserve corrupt | D01-Catalog.log:88 | pass | 실제 assertion |
| S10-O05/O06 reject and preserve unsupported-schema | D01-Catalog.log:89 | pass | 실제 assertion |
| S10-O05/O06 reject and preserve unsupported-type | D01-Catalog.log:90 | pass | 실제 assertion |
| S10-O05/O06 reject and preserve tail | D01-Catalog.log:91 | pass | 실제 assertion |
| S10-O05/O06 reject and preserve payload-zero | D01-Catalog.log:92 | pass | 실제 assertion |
| S10-O05/O06 reject and preserve payload-negative | D01-Catalog.log:93 | pass | 실제 assertion |
| S10-O05/O06 reject and preserve payload-fraction | D01-Catalog.log:94 | pass | 실제 assertion |
| S10-O05/O06 reject and preserve payload-overflow | D01-Catalog.log:95 | pass | 실제 assertion |
| S10-O05/O06 reject and preserve duplicate-sequence | D01-Catalog.log:96 | pass | 실제 assertion |
| S10-O05/O06 reject and preserve decreasing-sequence | D01-Catalog.log:97 | pass | 실제 assertion |
| S10-O05/O06 reject and preserve duplicate-request | D01-Catalog.log:98 | pass | 실제 assertion |
| S10-O05/O06 reject and preserve duplicate-segment | D01-Catalog.log:99 | pass | 실제 assertion |
| S10-O05/O06 reject and preserve store-conflict | D01-Catalog.log:100 | pass | 실제 assertion |
| S10-O05/O06 reject and preserve ordinary-before | D01-Catalog.log:101 | pass | 실제 assertion |
| S10-O05/O06 reject and preserve ordinary-after | D01-Catalog.log:102 | pass | 실제 assertion |
| S10-O05/O06 reject and preserve line-cap | D01-Catalog.log:103 | pass | 실제 assertion |
| S10-O05 reservation entity envelope binding rejects mismatch | D01-Catalog.log:104 | pass | 실제 assertion |
| S10-O05 reservation request envelope binding rejects mismatch | D01-Catalog.log:105 | pass | 실제 assertion |
| S10-O01 strict reservation parser accepts versioned literal | D01-Catalog.log:106 | pass | 실제 assertion |
| S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | D01-Catalog.log:107 | pass | 실제 assertion |
| S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | D01-Catalog.log:108 | pass | 실제 assertion |
| S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | D01-Catalog.log:109 | pass | 실제 assertion |
| S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | D01-Catalog.log:110 | pass | 실제 assertion |
| S10-O06 INT64_MAX identical retry remains valid | D01-Catalog.log:111 | pass | 실제 assertion |
| S10-O06 sequence overflow rejected without write | D01-Catalog.log:112 | pass | 실제 assertion |
| S10-O02 identical durable reservation duplicates remain idempotent | D01-Catalog.log:113 | pass | 실제 assertion |
| S10-O06 sequence gaps remain valid and allocate above maximum | D01-Catalog.log:114 | pass | 실제 assertion |
| S10-O07 four simultaneous processes finish reservations | D01-Catalog.log:115 | pass | 실제 assertion |
| S10-O07 concurrent sequences are unique and complete | D01-Catalog.log:116 | pass | 실제 assertion |
| S10-O07 next sequence follows concurrent reservations | D01-Catalog.log:117 | pass | 실제 assertion |
| S10-O08 ordinary Append cannot reserve orders | D01-Catalog.log:118 | pass | 실제 assertion |
| S10-O08 unopened journal rejected | D01-Catalog.log:119 | pass | 실제 assertion |
| S10-O08 null result rejected | D01-Catalog.log:120 | pass | 실제 assertion |
| S10-O08 invalid opaque ID rejected | D01-Catalog.log:121 | pass | 실제 assertion |
| S10-O08 failed reservation does not expose tentative result | D01-Catalog.log:122 | pass | 실제 assertion |
| S10-O09 unsafe file binding rejected and original preserved inode | D01-Catalog.log:123 | pass | 실제 assertion |
| S10-O09 unsafe file binding rejected and original preserved parent | D01-Catalog.log:124 | pass | 실제 assertion |
| S10-O09 unsafe file binding rejected and original preserved symlink | D01-Catalog.log:125 | pass | 실제 assertion |
| S10-O09 unsafe file binding rejected and original preserved hardlink | D01-Catalog.log:126 | pass | 실제 assertion |
| S10-O10 reservation and normal segment coexist in catalog | D01-Catalog.log:127 | pass | 실제 assertion |
| S10-O04 reserve then finalize permits identical retry | D01-Catalog.log:128 | pass | 실제 assertion |
| S10-O10 reservation survives catalog rebuild without changing segment query | D01-Catalog.log:129 | pass | 실제 assertion |
| S10-O04 legacy segment cannot acquire retroactive reservation | D01-Catalog.log:130 | pass | 실제 assertion |
| S10-M06 opened catalog accepts fresh exact reservation V2 finalize | D01-Catalog.log:131 | pass | 실제 assertion |
| S10-M07 V2 find preserves complete metadata | D01-Catalog.log:132 | pass | 실제 assertion |
| S10-M07 identical V2 recovery is idempotent | D01-Catalog.log:133 | pass | 실제 assertion |
| S10-M07 V2 is absent from V1 range query | D01-Catalog.log:134 | pass | 실제 assertion |
| S10-M07 V2 registered path is not orphan | D01-Catalog.log:135 | pass | 실제 assertion |
| S10-M07 SQLite exact V2 JSON and path match | D01-Catalog.log:136 | pass | 실제 assertion |
| S10-M07 JSONL restart preserves V2 exact payload | D01-Catalog.log:137 | pass | 실제 assertion |
| S10-M06 wrong reservation tuple rejected store | D01-Catalog.log:138 | pass | 실제 assertion |
| S10-M06 wrong reservation tuple rejected request | D01-Catalog.log:139 | pass | 실제 assertion |
| S10-M06 wrong reservation tuple rejected segment | D01-Catalog.log:140 | pass | 실제 assertion |
| S10-M06 wrong reservation tuple rejected channel | D01-Catalog.log:141 | pass | 실제 assertion |
| S10-M06 wrong reservation tuple rejected sequence | D01-Catalog.log:142 | pass | 실제 assertion |
| S10-M09 immutable V2 mapping mismatch rejected | D01-Catalog.log:143 | pass | 실제 assertion |
| S10-M09 bad V2 startup retry preserves original state bad-payload | D01-Catalog.log:144 | pass | 실제 assertion |
| S10-M09 bad V2 startup retry preserves original state missing-order | D01-Catalog.log:145 | pass | 실제 assertion |
| S10-M09 bad V2 startup retry preserves original state bad-order | D01-Catalog.log:146 | pass | 실제 assertion |
| S10-M09 bad V2 startup retry preserves original state conflicting-order | D01-Catalog.log:147 | pass | 실제 assertion |
| S10-M09 bad V2 startup retry preserves original state tail | D01-Catalog.log:148 | pass | 실제 assertion |
| S10-M09 bad V2 startup retry preserves original state corrupt | D01-Catalog.log:149 | pass | 실제 assertion |
| S10-M09 bad V2 startup retry preserves original state unsafe-path | D01-Catalog.log:150 | pass | 실제 assertion |
| S10-M09 default off rejects V2 before SQLite changes | D01-Catalog.log:151 | pass | 실제 assertion |
| S10-M09 V2 replay namespace and deletion duplicate | D01-Catalog.log:152 | pass | 실제 assertion |
| S10-M09 V2 replay namespace and deletion deleted | D01-Catalog.log:153 | pass | 실제 assertion |
| S10-M09 V2 replay namespace and deletion v1-before | D01-Catalog.log:154 | pass | 실제 assertion |
| S10-M09 V2 replay namespace and deletion v1-after | D01-Catalog.log:155 | pass | 실제 assertion |
| S10-M09 V2 replay namespace and deletion deleted-before | D01-Catalog.log:156 | pass | 실제 assertion |
| S10-M09 V2 replay namespace and deletion resurrection | D01-Catalog.log:157 | pass | 실제 assertion |
| S10-M09 V2 replay namespace and deletion mutation-collision | D01-Catalog.log:158 | pass | 실제 assertion |
| S10-M09 V2 finalize rejects missing media | D01-Catalog.log:159 | pass | 실제 assertion |
| S10-M09 V2 finalize rejects directory media | D01-Catalog.log:160 | pass | 실제 assertion |
| S10-M09 fresh candidate rejects mapping | D01-Catalog.log:161 | pass | 실제 assertion |
| S10-M09 fresh candidate rejects path | D01-Catalog.log:162 | pass | 실제 assertion |
| S10-M09 fresh candidate rejects tombstone | D01-Catalog.log:163 | pass | 실제 assertion |
| S10-SW01 managed empty root opens with lifetime lease | D01-Catalog.log:164 | pass | 실제 assertion |
| S10-SW02 same process second managed owner denied | D01-Catalog.log:165 | pass | 실제 assertion |
| S10-SW03 different process owner and inherited use denied | D01-Catalog.log:166 | pass | 실제 assertion |
| S10-SW12 managed duplicate descriptors are close-on-exec | D01-Catalog.log:167 | pass | 실제 assertion |
| S10-SW05 managed reserve append replay use owned descriptor | D01-Catalog.log:168 | pass | 실제 assertion |
| S10-SW06 raw managed access and legacy default path denied | D01-Catalog.log:169 | pass | 실제 assertion |
| S10-SW01 managed Reserve rejects different store identity | D01-Catalog.log:170 | pass | 실제 assertion |
| S10-SW10 catalog connection can inspect managed lease | D01-Catalog.log:171 | pass | 실제 assertion |
| S10-SW04 owner destruction releases lease | D01-Catalog.log:172 | pass | 실제 assertion |
| S10-SW01 managed reopen rejects different store identity | D01-Catalog.log:173 | pass | 실제 assertion |
| S10-SW11 managed incomplete tail rejects append without changing bytes | D01-Catalog.log:174 | pass | 실제 assertion |
| S10-SW07 legacy nonempty root preserved without conversion | D01-Catalog.log:175 | pass | 실제 assertion |
| S10-SW08 partial initialization retry validates exact state lease | D01-Catalog.log:176 | pass | 실제 assertion |
| S10-SW08 partial initialization retry validates exact state init | D01-Catalog.log:177 | pass | 실제 assertion |
| S10-SW08 partial initialization retry validates exact state barrier | D01-Catalog.log:178 | pass | 실제 assertion |
| S10-SW08 partial initialization retry validates exact state journal | D01-Catalog.log:179 | pass | 실제 assertion |
| S10-SW08 partial initialization retry validates exact state incomplete | D01-Catalog.log:180 | pass | 실제 assertion |
| S10-SW08 partial initialization retry validates exact state unknown | D01-Catalog.log:181 | pass | 실제 assertion |
| S10-SW09 symlink inode and malformed marker rejected journal | D01-Catalog.log:182 | pass | 실제 assertion |
| S10-SW09 symlink inode and malformed marker rejected marker | D01-Catalog.log:183 | pass | 실제 assertion |
| S10-SW09 symlink inode and malformed marker rejected barrier | D01-Catalog.log:184 | pass | 실제 assertion |
| S10-SW09 symlink inode and malformed marker rejected root-symlink | D01-Catalog.log:185 | pass | 실제 assertion |
| S10-SB01 second managed catalog is denied | D01-Catalog.log:186 | pass | 실제 assertion |
| S10-SB02 failed catalog cannot mutate journal or holds | D01-Catalog.log:187 | pass | 실제 assertion |
| S10-SB03 attached catalog blocks unowned append but permits reservation | D01-Catalog.log:188 | pass | 실제 assertion |
| S10-SB04 catalog destruction releases attachment | D01-Catalog.log:189 | pass | 실제 assertion |
| S10-SB05 managed catalog rejects unsafe options outside | D01-Catalog.log:190 | pass | 실제 assertion |
| S10-SB05 managed catalog rejects unsafe options dotdot | D01-Catalog.log:191 | pass | 실제 assertion |
| S10-SB05 managed catalog rejects unsafe options media-symlink | D01-Catalog.log:192 | pass | 실제 assertion |
| S10-SB05 managed catalog rejects unsafe options sqlite-symlink | D01-Catalog.log:193 | pass | 실제 assertion |
| S10-SB05 managed catalog rejects unsafe options sqlite-hardlink | D01-Catalog.log:194 | pass | 실제 assertion |
| S10-SB05 managed catalog rejects unsafe options disabled | D01-Catalog.log:195 | pass | 실제 assertion |
| S10-SB06 failed open releases catalog attachment | D01-Catalog.log:196 | pass | 실제 assertion |
| S10-SB07 managed SQLite sidecar rejected -wal symlink | D01-Catalog.log:197 | pass | 실제 assertion |
| S10-SB07 managed SQLite sidecar rejected -wal hardlink | D01-Catalog.log:198 | pass | 실제 assertion |
| S10-SB07 managed SQLite sidecar rejected -shm symlink | D01-Catalog.log:199 | pass | 실제 assertion |
| S10-SB07 managed SQLite sidecar rejected -shm hardlink | D01-Catalog.log:200 | pass | 실제 assertion |
| S10-SB07 managed SQLite sidecar rejected -journal symlink | D01-Catalog.log:201 | pass | 실제 assertion |
| S10-SB07 managed SQLite sidecar rejected -journal hardlink | D01-Catalog.log:202 | pass | 실제 assertion |
| S10-SC01 managed repeated event fixture is valid | D01-Catalog.log:203 | pass | 실제 assertion |
| S10-SC02 managed reservations avoid history reads | D01-Catalog.log:204 | pass | 실제 assertion |
| S10-SC03 managed V2 finalize avoids full replay | D01-Catalog.log:205 | pass | 실제 assertion |
| S10-SC04 checkpoint reduces superseded event payload bytes | D01-Catalog.log:206 | pass | 실제 assertion |
| S10-SC05 checkpoint preserves latest event and all record identities | D01-Catalog.log:207 | pass | 실제 assertion |
| S10-SC06 checkpoint is idempotent and preserves V2 | D01-Catalog.log:208 | pass | 실제 assertion |
| S10-SC08 receipt preserves retry identity and rejects direct append | D01-Catalog.log:209 | pass | 실제 assertion |
| S10-SC09 checkpoint restart preserves SQLite and JSONL state sqlite | D01-Catalog.log:210 | pass | 실제 assertion |
| S10-SC09 managed checkpoint SQL V2 payload and path | D01-Catalog.log:211 | pass | 실제 assertion |
| S10-SC09 checkpoint restart preserves SQLite and JSONL state jsonl | D01-Catalog.log:212 | pass | 실제 assertion |
| S10-SC10 checkpoint prefix recovers before writes | D01-Catalog.log:213 | pass | 실제 assertion |
| S10-SC11 checkpoint mismatch preserves bytes and poisons owner | D01-Catalog.log:214 | pass | 실제 assertion |
| S10-SC12 first accepted mutation controls latest event | D01-Catalog.log:215 | pass | 실제 assertion |
| S10-SC16 automatic checkpoint uses accumulated growth | D01-Catalog.log:216 | pass | 실제 assertion |
| S10-SC07 raw checkpoint is rejected | D01-Catalog.log:217 | pass | 실제 assertion |
| S10-SC18 checkpoint syscall failure poisons and reopens write | D01-Catalog.log:218 | pass | 실제 assertion |
| S10-SC21 poison rejects hold mutation write | D01-Catalog.log:219 | pass | 실제 assertion |
| S10-SC18 checkpoint syscall failure poisons and reopens file-fsync | D01-Catalog.log:220 | pass | 실제 assertion |
| S10-SC21 poison rejects hold mutation file-fsync | D01-Catalog.log:221 | pass | 실제 assertion |
| S10-SC18 checkpoint syscall failure poisons and reopens rename | D01-Catalog.log:222 | pass | 실제 assertion |
| S10-SC21 poison rejects hold mutation rename | D01-Catalog.log:223 | pass | 실제 assertion |
| S10-SC18 checkpoint syscall failure poisons and reopens dir-fsync | D01-Catalog.log:224 | pass | 실제 assertion |
| S10-SC21 poison rejects hold mutation dir-fsync | D01-Catalog.log:225 | pass | 실제 assertion |
| S10-SC17 checkpoint preserves holds observations and deletion | D01-Catalog.log:226 | pass | 실제 assertion |
| S10-SC17 checkpoint SQL hold observation tombstone | D01-Catalog.log:227 | pass | 실제 assertion |
| S10-SC17 checkpoint preserves holds observations and deletion restart sqlite | D01-Catalog.log:228 | pass | 실제 assertion |
| S10-SC17 checkpoint SQL restart observation tombstone | D01-Catalog.log:229 | pass | 실제 assertion |
| S10-SC17 checkpoint preserves holds observations and deletion restart jsonl | D01-Catalog.log:230 | pass | 실제 assertion |
| S10-SC19 invalid managed history remains unchanged malformed | D01-Catalog.log:231 | pass | 실제 assertion |
| S10-SC19 invalid managed history remains unchanged unsupported | D01-Catalog.log:232 | pass | 실제 assertion |
| S10-SC19 invalid managed history remains unchanged conflict | D01-Catalog.log:233 | pass | 실제 assertion |
| S10-SC20 raw catalog rejects receipt before side effects | D01-Catalog.log:234 | pass | 실제 assertion |
| S10-SC13 crypto off raw remains usable | D01-Catalog.log:236 | pass | 실제 assertion |
| S10-SC14 crypto off checkpoint is rejected | D01-Catalog.log:237 | pass | 실제 assertion |
| S10-SC15 crypto off receipt reopen is rejected | D01-Catalog.log:238 | pass | 실제 assertion |
| source 저장 callback reconcile 연결 | D01-Catalog.log:239 | pass | 실제 assertion |
| policy revision idempotency | D01-Catalog.log:240 | pass | 실제 assertion |
| 5초 safety reconcile | D01-Catalog.log:241 | pass | 실제 assertion |
| composition root journal 선행 open | D01-Catalog.log:242 | pass | 실제 assertion |
| composition root catalog rebuild/open | D01-Catalog.log:243 | pass | 실제 assertion |
| 서버 전 supervisor 시작 | D01-Catalog.log:244 | pass | 실제 assertion |
| ingress 전 event bridge 등록 | D01-Catalog.log:245 | pass | 실제 assertion |
| ingress 종료 뒤 recorder finalize | D01-Catalog.log:246 | pass | 실제 assertion |
| composition root 시작/종료 순서 | D01-Catalog.log:247 | pass | 실제 assertion |

## D01-Retention.log

명령 exit 0, 24 pass / 0 fail. [원출력](D01-Retention.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| B01 V2 tombstone preserves immutable segment without legacy UTC range | D01-Retention.log:1 | pass | 실제 assertion |
| B02 V2 state records reject malformed payload entity and duplicate conflicts | D01-Retention.log:2 | pass | 실제 assertion |
| B03 V2 pending corrupt and deleted overlays never mutate finalized payload | D01-Retention.log:3 | pass | 실제 assertion |
| B04 V2 invalid transitions and finalize retries cannot resurrect state | D01-Retention.log:4 | pass | 실제 assertion |
| B05 V2 checkpoint and restart preserve overlay tombstone and SQLite parity | D01-Retention.log:5 | pass | 실제 assertion |
| B06 V2 capacity deletion follows durable order despite reversed UTC | D01-Retention.log:6 | pass | 실제 assertion |
| B07 mixed legacy and multiple stores use deterministic nonchronological ordering | D01-Retention.log:7 | pass | 실제 assertion |
| B08 V2 age expiry uses all known mapping ends plus uncertainty rounded upward | D01-Retention.log:8 | pass | 실제 assertion |
| B09 V2 unknown or overflowing age remains capacity eligible | D01-Retention.log:9 | pass | 실제 assertion |
| B10 V2 class quotas and disk reserve remain separated | D01-Retention.log:10 | pass | 실제 assertion |
| B11 V2 pin and hold protect deletion and corruption | D01-Retention.log:11 | pass | 실제 assertion |
| B12 V2 pending and corrupt bytes remain charged but are not automatic victims | D01-Retention.log:12 | pass | 실제 assertion |
| B13 V2 apply persists pending before unlink and tombstone after unlink | D01-Retention.log:13 | pass | 실제 assertion |
| B14 V2 interrupted deletion recovers without resurrection | D01-Retention.log:14 | pass | 실제 assertion |
| B15 V2 corrupt cleanup requires explicit manual reason | D01-Retention.log:15 | pass | 실제 assertion |
| B16 V2 continuous media with unknown UTC resolves a healthy held fd | D01-Retention.log:16 | pass | 실제 assertion |
| B17 V2 wrong channel event and fallback collision cannot expose media | D01-Retention.log:17 | pass | 실제 assertion |
| B18 V2 missing symlink and multiple hardlink media reject without hold leak | D01-Retention.log:18 | pass | 실제 assertion |
| B19 V2 same size corruption and invalid container reject without hold leak | D01-Retention.log:19 | pass | 실제 assertion |
| B20 V2 deletion and playback hold races have one safe winner | D01-Retention.log:20 | pass | 실제 assertion |
| B21 borrowed fd inspection preserves caller ownership and detects file changes | D01-Retention.log:21 | pass | 실제 assertion |
| B23 legacy store port refuses unsupported V2 deletion | D01-Retention.log:22 | pass | 실제 assertion |
| B22 V2 playback is unavailable without GStreamer | D01-Retention.log:24 | pass | 실제 assertion |
| B23 legacy store port refuses unsupported V2 deletion | D01-Retention.log:25 | pass | 실제 assertion |

## Historical 실행

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| D01-01 consumer 숫자 참조 원문 왕복 | D01-ExpectedRed.log:2 | fail | historical |
| D01-02 빈 참조·경로 이탈 거부 | D01-ExpectedRed.log:3 | pass | historical |
| D01-03 생성 reference/owner/namespace 숫자-only 거부 유지 | D01-ExpectedRed.log:4 | pass | historical |
| D01-01 consumer 숫자 참조 원문 왕복 | D01-ExpectedRedFixed.log:1 | fail | historical |
| D01-02 빈 참조·경로 이탈 거부 | D01-ExpectedRedFixed.log:2 | pass | historical |
| D01-03 생성 reference/owner/namespace 숫자-only 거부 유지 | D01-ExpectedRedFixed.log:3 | pass | historical |
| D01-04 journal order 숫자 channel 왕복 | D01-ExpectedRedFixed.log:4 | fail | historical |
| D01-05 order request/segment 숫자-only 거부 유지 | D01-ExpectedRedFixed.log:5 | pass | historical |
| D01-06 실제 H264 writer→finalized segment/binding 숫자 원문 보존 | D01-ExpectedRedFixed.log:7 | fail | historical |
| D01-07 catalog consumer 숫자 채널 저장·조회 | D01-ExpectedRedFixed.log:8 | fail | historical |
| D01-08 숫자 채널 media/UTC range·location 입력 허용 | D01-ExpectedRedFixed.log:9 | fail | historical |
| D01-09 새 catalog/journal 재개방 숫자 참조 유지 | D01-ExpectedRedFixed.log:10 | fail | historical |
| D01-01 consumer 숫자 참조 원문 왕복 | D01-Green.log:1 | pass | historical |
| D01-02 빈 참조·경로 이탈 거부 | D01-Green.log:2 | pass | historical |
| D01-03 생성 reference/owner/namespace 숫자-only 거부 유지 | D01-Green.log:3 | pass | historical |
| D01-04 journal order 숫자 channel 왕복 | D01-Green.log:4 | pass | historical |
| D01-05 order request/segment 숫자-only 거부 유지 | D01-Green.log:5 | pass | historical |
| D01-06 실제 H264 writer→finalized segment/binding 숫자 원문 보존 | D01-Green.log:6 | pass | historical |
| D01-07 catalog consumer 숫자 채널 저장·조회 | D01-Green.log:7 | pass | historical |
| D01-08 숫자 채널 media/UTC range·location 입력 허용 | D01-Green.log:8 | pass | historical |
| D01-09 새 catalog/journal 재개방 숫자 참조 유지 | D01-Green.log:9 | pass | historical |

## 임시 산출물 정리

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `/private/tmp/media-server-d01-catalog.cJzQRn` | 소유 fixture/미디어/원장/빌드 | 26433702 bytes | runner 삭제 | 현재 부재 확인 | D01-Catalog.log:248 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-consumer-connection.s7nofg` | 소유 fixture/미디어/원장/빌드 | 6171300 bytes | runner 삭제 | 현재 부재 확인 | D01-Connection.log:24 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-numeric-reference.fdfUgp` | 소유 fixture/미디어/원장/빌드 | 4515848 bytes | runner 삭제 | 현재 부재 확인 | D01-ExpectedRed.log:6 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-numeric-reference.LPnvcW` | 소유 fixture/미디어/원장/빌드 | 4704430 bytes | runner 삭제 | 현재 부재 확인 | D01-ExpectedRedFixed.log:12 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-numeric-reference.lJF3AJ` | 소유 fixture/미디어/원장/빌드 | 4726561 bytes | runner 삭제 | 현재 부재 확인 | D01-FinalFocused.log:13 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-numeric-reference.kbUKZE` | 소유 fixture/미디어/원장/빌드 | 4726481 bytes | runner 삭제 | 현재 부재 확인 | D01-Green.log:11 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-range.OU1JU1` | 소유 fixture/미디어/원장/빌드 | 4909530 bytes | runner 삭제 | 현재 부재 확인 | D01-Range.log:18 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-numeric-reference.MRgwuh` | 소유 fixture/미디어/원장/빌드 | 0 bytes | runner 삭제 | 현재 부재 확인 | D01-Red.log:6 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-consumer-reference.ubVZXm` | 소유 fixture/미디어/원장/빌드 | 4678141 bytes | runner 삭제 | 현재 부재 확인 | D01-Reference.log:31 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-retention-v2.0VdxWT` | 소유 fixture/미디어/원장/빌드 | 9978170 bytes | runner 삭제 | 현재 부재 확인 | D01-Retention.log:27 |

| `/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T//media-server-identity-unit.tURvzL` | 소유 fixture/미디어/원장/빌드 | 7026289 bytes | runner 삭제 | 현재 부재 확인 | D01-Identity.log:25 |

최종 361개 pass / 0 fail, 정리 11행. 준비 오류 2건은 report에서 별도 보존하며 assertion 예상 RED로 바꾸지 않았다.
