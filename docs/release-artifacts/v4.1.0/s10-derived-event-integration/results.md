# S10 3C-5.4 전수 실행 결과

독자: 구현·검토 담당자. lifecycle: 이번 격리 실행의 원출력 자동 추출 보존. 정책은 AGENTS, 중앙 기록은 release-test-records다. 현재 유효 최종 묶음과 historical 중간 실행을 구분한다. 원출력의 개별 assertion을 생략하지 않았으며 setup/build 오류는 assertion FAIL로 바꾸지 않는다.

## 현재 유효 결과

### FinalCompleteFocused.log

명령 exit 0, 56 pass / 0 fail. [원출력](FinalCompleteFocused.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| E17 accepted 후 resolver nullopt는 기존 소유 유지·신규 저장 없음 | FinalCompleteFocused.log:4 실제 assertion | pass | 원출력 직접 추출 |
| E17 accepted 후 resolver 불일치는 기존 소유 유지·신규 저장 없음 | FinalCompleteFocused.log:5 실제 assertion | pass | 원출력 직접 추출 |
| E17 accepted 후 resolver 예외는 기존 소유 유지·신규 저장 없음 | FinalCompleteFocused.log:6 실제 assertion | pass | 원출력 직접 추출 |
| E17 accepted 후 resolver 미주입는 기존 소유 유지·신규 저장 없음 | FinalCompleteFocused.log:7 실제 assertion | pass | 원출력 직접 추출 |
| E02 단일 출력도 clip_path 승격 없이 목록·직접 decode·fully satisfied | FinalCompleteFocused.log:9 실제 assertion | pass | 원출력 직접 추출 |
| E09 동일 reference/선택 재요청 job ID 멱등 | FinalCompleteFocused.log:10 실제 assertion | pass | 원출력 직접 추출 |
| E03 미확인 pre 구간을 유지한 verified partial 출력 | FinalCompleteFocused.log:11 실제 assertion | pass | 원출력 직접 추출 |
| E07 immutable start/end/pre/post/namespace 보존 | FinalCompleteFocused.log:12 실제 assertion | pass | 원출력 직접 추출 |
| E10 Event 출력이 누적되어도 원본 snapshot은 continuous만 | FinalCompleteFocused.log:13 실제 assertion | pass | 원출력 직접 추출 |
| E04 provider의 동일 실제 decoder 증거 업데이트로 postroll 요청 충족 | FinalCompleteFocused.log:14 실제 assertion | pass | 원출력 직접 추출 |
| E05 시간 경과만으로 coverage 없이 unknown 종료 | FinalCompleteFocused.log:15 실제 assertion | pass | 원출력 직접 추출 |
| E06 provider namespace 변경을 새 증거로 혼합하지 않음 | FinalCompleteFocused.log:16 실제 assertion | pass | 원출력 직접 추출 |
| E09 같은 immutable reference의 증거/선택 갱신은 새 job·이전 partial 보존 | FinalCompleteFocused.log:17 실제 assertion | pass | 원출력 직접 추출 |
| E18 4097 frame 증거는 queue 접수 전 명시 거부 | FinalCompleteFocused.log:18 실제 assertion | pass | 원출력 직접 추출 |
| E06/E18 provider generation 변경는 unknown 종료 | FinalCompleteFocused.log:19 실제 assertion | pass | 원출력 직접 추출 |
| E06/E18 provider source 불일치는 unknown 종료 | FinalCompleteFocused.log:20 실제 assertion | pass | 원출력 직접 추출 |
| E06/E18 provider 예외는 unknown 종료 | FinalCompleteFocused.log:21 실제 assertion | pass | 원출력 직접 추출 |
| E06/E18 provider track 불일치는 unknown 종료 | FinalCompleteFocused.log:22 실제 assertion | pass | 원출력 직접 추출 |
| E06/E18 provider channel 불일치는 unknown 종료 | FinalCompleteFocused.log:23 실제 assertion | pass | 원출력 직접 추출 |
| E12 event quota 부족은 Intent/파일/내구 예약 없이 명시 거부 | FinalCompleteFocused.log:24 실제 assertion | pass | 원출력 직접 추출 |
| E12 disk provider 실패를 가용량 0 성공으로 숨기지 않고 Intent 없이 거부 | FinalCompleteFocused.log:25 실제 assertion | pass | 원출력 직접 추출 |
| E18 누적 261개 원본에서도 현재 반개구간 관련 1개만 조회 | FinalCompleteFocused.log:26 실제 assertion | pass | 원출력 직접 추출 |
| E18 반개구간 끝 접점은 이전 원본과 비중첩 | FinalCompleteFocused.log:27 실제 assertion | pass | 원출력 직접 추출 |
| E11 관련 missing binding은 누락하지 않고 snapshot에 보존 | FinalCompleteFocused.log:28 실제 assertion | pass | 원출력 직접 추출 |
| E11 관련 corrupt lifecycle은 동일 snapshot에 보존 | FinalCompleteFocused.log:29 실제 assertion | pass | 원출력 직접 추출 |
| E18 실제 관련 257개는 명시 cap 실패·잘린 confirmed 목록 없음 | FinalCompleteFocused.log:30 실제 assertion | pass | 원출력 직접 추출 |
| E04 실제 writer 후행 finalize와 같은 요청 증거 갱신으로 2출력 완료 | FinalCompleteFocused.log:31 실제 assertion | pass | 원출력 직접 추출 |
| E20 canonical accepted 중복은 원장 mutation 추가 없이 멱등 | FinalCompleteFocused.log:33 실제 assertion | pass | 원출력 직접 추출 |
| E20 동일 reference ID 다른 immutable 내용의 accepted 거부 | FinalCompleteFocused.log:34 실제 assertion | pass | 원출력 직접 추출 |
| E20 SQLite accepted projection의 exact reference 일치 | FinalCompleteFocused.log:35 실제 assertion | pass | 원출력 직접 추출 |
| E20 accepted marker checkpoint projection 일치 | FinalCompleteFocused.log:36 실제 assertion | pass | 원출력 직접 추출 |
| E15/E20 재시작 JSONL fallback accepted/no-job은 증거 발명 없이 managed unknown | FinalCompleteFocused.log:37 실제 assertion | pass | 원출력 직접 추출 |
| E15/E20 재시작 SQLite rebuild accepted/no-job은 증거 발명 없이 managed unknown | FinalCompleteFocused.log:38 실제 assertion | pass | 원출력 직접 추출 |
| E20 replay accepted 선행 참조 없음 거부 | FinalCompleteFocused.log:39 실제 assertion | pass | 원출력 직접 추출 |
| E20 replay accepted unknown 필드 거부 | FinalCompleteFocused.log:40 실제 assertion | pass | 원출력 직접 추출 |
| E20 replay accepted canonical 충돌 거부 | FinalCompleteFocused.log:41 실제 assertion | pass | 원출력 직접 추출 |
| E20 replay accepted 불완전 payload 거부 | FinalCompleteFocused.log:42 실제 assertion | pass | 원출력 직접 추출 |
| E08 동일 원본 snapshot의 명시 UTC 요청→실제 출력·독립 output UTC unknown | FinalCompleteFocused.log:44 실제 assertion | pass | 원출력 직접 추출 |
| E08 같은 UTC의 복수 원본 후보를 자동 단일 선택하지 않음 | FinalCompleteFocused.log:45 실제 assertion | pass | 원출력 직접 추출 |
| E11 UTC confirmed mapping 하나가 보여도 관련 corrupt 원본을 숨기지 않음 | FinalCompleteFocused.log:46 실제 assertion | pass | 원출력 직접 추출 |
| E11 실제 UTC worker도 same-lock corrupt 원본을 available로 승격하지 않음 | FinalCompleteFocused.log:47 실제 assertion | pass | 원출력 직접 추출 |
| E08 UTC unplaced를 원본 snapshot/선택에 보존 | FinalCompleteFocused.log:48 실제 assertion | pass | 원출력 직접 추출 |
| E18 opt-in UTC 후보 예산 초과는 부분 confirmed 결과 없이 실패 | FinalCompleteFocused.log:49 실제 assertion | pass | 원출력 직접 추출 |
| E11 삭제 대기 lifecycle도 원본 snapshot에서 누락하지 않음 | FinalCompleteFocused.log:50 실제 assertion | pass | 원출력 직접 추출 |
| E01 실제 H264 decoder→EventRecord→reference→내구 job·2출력 Complete | FinalCompleteFocused.log:51 실제 assertion | pass | 원출력 직접 추출 |
| E17 무주입 bridge 재생성에도 내구 managed 소유권 유지 | FinalCompleteFocused.log:53 실제 assertion | pass | 원출력 직접 추출 |
| E13 Stop 이후 신규 reference 저장 없음 | FinalCompleteFocused.log:54 실제 assertion | pass | 원출력 직접 추출 |
| E20 비권위 원장 조회 실패는 legacy 억제 unknown | FinalCompleteFocused.log:55 실제 assertion | pass | 원출력 직접 추출 |
| E17 실제 EventStorage managed clip 억제 및 snapshot hook 유지 | FinalCompleteFocused.log:57 실제 assertion | pass | 원출력 직접 추출 |
| E17 실제 EventStorage 기본 clip fallback 유지 및 snapshot hook 유지 | FinalCompleteFocused.log:60 실제 assertion | pass | 원출력 직접 추출 |
| E15 별도 프로세스 Ready _exit 후 보호 복원→bridge reconcile→동일 2출력·decode·commit 1개 | FinalCompleteFocused.log:66 실제 assertion | pass | 원출력 직접 추출 |
| E16 historical Complete와 terminal tombstone 현재 unavailable·재생성 없음 | FinalCompleteFocused.log:67 실제 assertion | pass | 원출력 직접 추출 |
| E13 active 포함 queue cap 포화는 새 accepted/예약 없이 거부 | FinalCompleteFocused.log:69 실제 assertion | pass | 원출력 직접 추출 |
| E14 실제 Run 중 동시 Stop 두 번→취소·단일 join·Failed cleanup 후 자원 해제 | FinalCompleteFocused.log:70 실제 assertion | pass | 원출력 직접 추출 |
| E18 reference job top-8은 wall 역행/재시작에도 동일 ID subset·truncated unknown | FinalCompleteFocused.log:73 실제 assertion | pass | 원출력 직접 추출 |
| E15 startup bounded8 more는 blocker·남은 보호 유지·자동 무한 reconcile 없음 | FinalCompleteFocused.log:74 실제 assertion | pass | 원출력 직접 추출 |

### SelectionRegression.log

명령 exit 0, 27 pass / 0 fail. [원출력](SelectionRegression.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| D01 callback 누적·불변 snapshot | SelectionRegression.log:1 실제 assertion | pass | 원출력 직접 추출 |
| D02 유효0·fallback·duration/원본부재 | SelectionRegression.log:2 실제 assertion | pass | 원출력 직접 추출 |
| D04 exact union 정상 선택·파일식별 | SelectionRegression.log:3 실제 assertion | pass | 원출력 직접 추출 |
| D03 pre/post·음수요청 보존 | SelectionRegression.log:4 실제 assertion | pass | 원출력 직접 추출 |
| D03 ns 변환 overflow 거부 | SelectionRegression.log:5 실제 assertion | pass | 원출력 직접 추출 |
| D05 한점 외삽 금지 | SelectionRegression.log:6 실제 assertion | pass | 원출력 직접 추출 |
| D06 namespace 격리 | SelectionRegression.log:7 실제 assertion | pass | 원출력 직접 추출 |
| D06 generation 합성 금지 | SelectionRegression.log:8 실제 assertion | pass | 원출력 직접 추출 |
| D06 track 합성 금지 | SelectionRegression.log:9 실제 assertion | pass | 원출력 직접 추출 |
| D07 중복 PTS 모호성 | SelectionRegression.log:10 실제 assertion | pass | 원출력 직접 추출 |
| D07 복수 원본 후보 보존 | SelectionRegression.log:11 실제 assertion | pass | 원출력 직접 추출 |
| D08 cap 초과범위 미확인 | SelectionRegression.log:12 실제 assertion | pass | 원출력 직접 추출 |
| D09 삭제 원본 구분 | SelectionRegression.log:13 실제 assertion | pass | 원출력 직접 추출 |
| D09 불완전 mapping을 영상공백으로 승격 금지 | SelectionRegression.log:14 실제 assertion | pass | 원출력 직접 추출 |
| D09 epoch identity 유지 | SelectionRegression.log:15 실제 assertion | pass | 원출력 직접 추출 |
| D11 비표현 유리수 잔차 거부 | SelectionRegression.log:16 실제 assertion | pass | 원출력 직접 추출 |
| D12 watermark 없는 postroll 미확인 | SelectionRegression.log:17 실제 assertion | pass | 원출력 직접 추출 |
| D13 source/channel 결박 | SelectionRegression.log:18 실제 assertion | pass | 원출력 직접 추출 |
| D13 checksum 없는 원본 거부 | SelectionRegression.log:19 실제 assertion | pass | 원출력 직접 추출 |
| D10 UTC 품질·불확실성 유지 | SelectionRegression.log:20 실제 assertion | pass | 원출력 직접 추출 |
| D10 UTC 역행 복수후보 보존 | SelectionRegression.log:21 실제 assertion | pass | 원출력 직접 추출 |
| D10 UTC unplaced 차단 | SelectionRegression.log:22 실제 assertion | pass | 원출력 직접 추출 |
| D14 정상후보가 손상후보를 숨기지 않음 | SelectionRegression.log:23 실제 assertion | pass | 원출력 직접 추출 |
| D15 queued sequence 미래제외 | SelectionRegression.log:24 실제 assertion | pass | 원출력 직접 추출 |
| D16 namespace reset 과거eviction 격리 | SelectionRegression.log:25 실제 assertion | pass | 원출력 직접 추출 |
| D17 decoder exact duration·fallback 격리 | SelectionRegression.log:26 실제 assertion | pass | 원출력 직접 추출 |
| D21 namespace reset 이후 재eviction 최근작은구간 선택 | SelectionRegression.log:27 실제 assertion | pass | 원출력 직접 추출 |

### FinalConnectionRegression.log

명령 exit 0, 22 pass / 0 fail. [원출력](FinalConnectionRegression.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| C401 관측·참조 원자 저장 | FinalConnectionRegression.log:1 실제 assertion | pass | 원출력 직접 추출 |
| C402 쌍 identity 불일치 거부 | FinalConnectionRegression.log:2 실제 assertion | pass | 원출력 직접 추출 |
| C403 동일 원본 재전달·event 병합 | FinalConnectionRegression.log:3 실제 assertion | pass | 원출력 직접 추출 |
| C405 SQL·JSONL·checkpoint 쌍 복구 | FinalConnectionRegression.log:4 실제 assertion | pass | 원출력 직접 추출 |
| C404 다른 원본 동일PTS 구분 | FinalConnectionRegression.log:5 실제 assertion | pass | 원출력 직접 추출 |
| C406 실제 OnResult 원본 참조 저장 | FinalConnectionRegression.log:6 실제 assertion | pass | 원출력 직접 추출 |
| C407 OnEvent 강제 표본 | FinalConnectionRegression.log:7 실제 assertion | pass | 원출력 직접 추출 |
| C408 종료track 과거참조 보존 | FinalConnectionRegression.log:8 실제 assertion | pass | 원출력 직접 추출 |
| C409 종료track 참조부재 unknown | FinalConnectionRegression.log:9 실제 assertion | pass | 원출력 직접 추출 |
| C410 sampling·queue·StopAndDrain 회귀 | FinalConnectionRegression.log:10 실제 assertion | pass | 원출력 직접 추출 |
| C411 exact·미색인 복수 후보 보존 | FinalConnectionRegression.log:11 실제 assertion | pass | 원출력 직접 추출 |
| C412 nearest/ambiguous/unavailable 미승격 | FinalConnectionRegression.log:12 실제 assertion | pass | 원출력 직접 추출 |
| C413 UTC unknown·삭제 상태 재판정 | FinalConnectionRegression.log:13 실제 assertion | pass | 원출력 직접 추출 |
| C414 실제 TryResolve 요청참조 저장 | FinalConnectionRegression.log:14 실제 assertion | pass | 원출력 직접 추출 |
| C415 event 재전달·확장·세대 구분 | FinalConnectionRegression.log:15 실제 assertion | pass | 원출력 직접 추출 |
| C416 source/channel 충돌 거부 | FinalConnectionRegression.log:16 실제 assertion | pass | 원출력 직접 추출 |
| C417 같은 원본 미디어 교집합 우선 | FinalConnectionRegression.log:17 실제 assertion | pass | 원출력 직접 추출 |
| C418 공개 결과·구형 fallback 불변 | FinalConnectionRegression.log:18 실제 assertion | pass | 원출력 직접 추출 |
| C422 실제 bridge 초기 pre-roll 수락·pending 유지 | FinalConnectionRegression.log:19 실제 assertion | pass | 원출력 직접 추출 |
| C423 초기 요청 멱등·갱신·generation 분리 | FinalConnectionRegression.log:20 실제 assertion | pass | 원출력 직접 추출 |
| C424 초기 요청 SQL·JSONL 복구 | FinalConnectionRegression.log:21 실제 assertion | pass | 원출력 직접 추출 |
| C425 초기 요청 checkpoint 복구 | FinalConnectionRegression.log:22 실제 assertion | pass | 원출력 직접 추출 |

### ReferenceRegression.log

명령 exit 0, 19 pass / 0 fail. [원출력](ReferenceRegression.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| C341 계약 왕복 | ReferenceRegression.log:1 실제 assertion | pass | 원출력 직접 추출 |
| C342 unknown/중복 필드 거부 | ReferenceRegression.log:2 실제 assertion | pass | 원출력 직접 추출 |
| C343 ID·종류·소유자 제약 | ReferenceRegression.log:3 실제 assertion | pass | 원출력 직접 추출 |
| C344 품질·원본 nullable 조합 | ReferenceRegression.log:4 실제 assertion | pass | 원출력 직접 추출 |
| C345 원본 수치·track 경계 | ReferenceRegression.log:5 실제 assertion | pass | 원출력 직접 추출 |
| C346 event 요청·시간축 | ReferenceRegression.log:6 실제 assertion | pass | 원출력 직접 추출 |
| C347 observation 요청 금지 | ReferenceRegression.log:7 실제 assertion | pass | 원출력 직접 추출 |
| C348 요청 음수·역전·padding | ReferenceRegression.log:8 실제 assertion | pass | 원출력 직접 추출 |
| C419 media-pts 초기 요청 원문 왕복 | ReferenceRegression.log:9 실제 assertion | pass | 원출력 직접 추출 |
| C420 UTC 초기 요청 원문 왕복 | ReferenceRegression.log:10 실제 assertion | pass | 원출력 직접 추출 |
| C421 0·최대 pre 요청 및 오류 경계 | ReferenceRegression.log:11 실제 assertion | pass | 원출력 직접 추출 |
| C349 미지원 schema 거부 | ReferenceRegression.log:12 실제 assertion | pass | 원출력 직접 추출 |
| C350 실제 원장 저장·조회 | ReferenceRegression.log:13 실제 assertion | pass | 원출력 직접 추출 |
| C351 동일 참조 멱등 | ReferenceRegression.log:14 실제 assertion | pass | 원출력 직접 추출 |
| C352 동일 ID 충돌 거부 | ReferenceRegression.log:15 실제 assertion | pass | 원출력 직접 추출 |
| C353 opt-in·미open 거부 | ReferenceRegression.log:16 실제 assertion | pass | 원출력 직접 추출 |
| C354 SQL·JSONL 재시작 동등 | ReferenceRegression.log:17 실제 assertion | pass | 원출력 직접 추출 |
| C355 checkpoint 참조 보존 | ReferenceRegression.log:18 실제 assertion | pass | 원출력 직접 추출 |
| C356 손상·충돌 replay 선차단 | ReferenceRegression.log:29 실제 assertion | pass | 원출력 직접 추출 |

### RangeRegression.log

명령 exit 0, 16 pass / 0 fail. [원출력](RangeRegression.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| S10-C201 미디어 구간 mapping 경계 | RangeRegression.log:1 실제 assertion | pass | 원출력 직접 추출 |
| S10-C202 unknown UTC의 미디어 위치 | RangeRegression.log:2 실제 assertion | pass | 원출력 직접 추출 |
| S10-C203 미디어 범위 밖 | RangeRegression.log:3 실제 assertion | pass | 원출력 직접 추출 |
| S10-C204 미확정 끝 | RangeRegression.log:4 실제 assertion | pass | 원출력 직접 추출 |
| S10-C205 UTC 중첩 mapping | RangeRegression.log:5 실제 assertion | pass | 원출력 직접 추출 |
| S10-C206 저장소 경계·결정 순서 | RangeRegression.log:6 실제 assertion | pass | 원출력 직접 추출 |
| S10-C207 정상 segment 분할 | RangeRegression.log:7 실제 assertion | pass | 원출력 직접 추출 |
| S10-C208 반열린 구간 경계 | RangeRegression.log:8 실제 assertion | pass | 원출력 직접 추출 |
| S10-C209 유리수·비정수 경계 | RangeRegression.log:9 실제 assertion | pass | 원출력 직접 추출 |
| S10-C210 정수 범위 안전성 | RangeRegression.log:10 실제 assertion | pass | 원출력 직접 추출 |
| S10-C211 UTC 공백·unplaced 구분 | RangeRegression.log:11 실제 assertion | pass | 원출력 직접 추출 |
| S10-C212 입력 오류 초기화 | RangeRegression.log:12 실제 assertion | pass | 원출력 직접 추출 |
| S10-C213 삭제·채널 경계 | RangeRegression.log:13 실제 assertion | pass | 원출력 직접 추출 |
| S10-C214 재시작 SQL·JSONL 동등 | RangeRegression.log:14 실제 assertion | pass | 원출력 직접 추출 |
| S10-C215 원본 mapping·조회 불변 | RangeRegression.log:15 실제 assertion | pass | 원출력 직접 추출 |
| S10-C216 unknown 채널 격리 | RangeRegression.log:16 실제 assertion | pass | 원출력 직접 추출 |

### LegacyBridgeRegression.log

명령 exit 0, 144 pass / 0 fail. [원출력](LegacyBridgeRegression.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| EQ journal open | LegacyBridgeRegression.log:1 실제 assertion | pass | 원출력 직접 추출 |
| EQ catalog open | LegacyBridgeRegression.log:2 실제 assertion | pass | 원출력 직접 추출 |
| EQ 실제 pending 등록 | LegacyBridgeRegression.log:3 실제 assertion | pass | 원출력 직접 추출 |
| EQ 각 event 실제 worker 최초 journal 기록 확인 | LegacyBridgeRegression.log:4 실제 assertion | pass | 원출력 직접 추출 |
| EQ deadline 이전 동일 event journal 증가 없음 | LegacyBridgeRegression.log:6 실제 assertion | pass | 원출력 직접 추출 |
| EQ 서로 다른 event link ID 보존 | LegacyBridgeRegression.log:7 실제 assertion | pass | 원출력 직접 추출 |
| EQ 미해석 PTS는 파생 비실행 | LegacyBridgeRegression.log:8 실제 assertion | pass | 원출력 직접 추출 |
| EQ journal open | LegacyBridgeRegression.log:9 실제 assertion | pass | 원출력 직접 추출 |
| EQ catalog open | LegacyBridgeRegression.log:10 실제 assertion | pass | 원출력 직접 추출 |
| EQ 실제 pending 등록 | LegacyBridgeRegression.log:11 실제 assertion | pass | 원출력 직접 추출 |
| EQ 실제 pending 등록 | LegacyBridgeRegression.log:12 실제 assertion | pass | 원출력 직접 추출 |
| EQ 각 event 실제 worker 최초 journal 기록 확인 | LegacyBridgeRegression.log:13 실제 assertion | pass | 원출력 직접 추출 |
| EQ deadline 이전 동일 event journal 증가 없음 | LegacyBridgeRegression.log:15 실제 assertion | pass | 원출력 직접 추출 |
| EQ 서로 다른 event link ID 보존 | LegacyBridgeRegression.log:16 실제 assertion | pass | 원출력 직접 추출 |
| EQ 미해석 PTS는 파생 비실행 | LegacyBridgeRegression.log:17 실제 assertion | pass | 원출력 직접 추출 |
| 기본 pending event link가 유효해야 함:  | LegacyBridgeRegression.log:18 실제 assertion | pass | 원출력 직접 추출 |
| terminal 대기 UTC 확장 요청은 additive 계약으로 round-trip해야 함 | LegacyBridgeRegression.log:19 실제 assertion | pass | 원출력 직접 추출 |
| terminal 대기 요청이 현재 범위를 축소하면 거부해야 함 | LegacyBridgeRegression.log:20 실제 assertion | pass | 원출력 직접 추출 |
| 미해석 후속 PTS는 기존 UTC 범위와 별도 field로 round-trip해야 함 | LegacyBridgeRegression.log:21 실제 assertion | pass | 원출력 직접 추출 |
| 미해석 후속 PTS를 소비하지 않은 terminal 상태를 거부해야 함 | LegacyBridgeRegression.log:22 실제 assertion | pass | 원출력 직접 추출 |
| 서로 겹치는 ordered overlap을 거부해야 함 | LegacyBridgeRegression.log:23 실제 assertion | pass | 원출력 직접 추출 |
| overlap/missing이 requested range를 정확히 분할하지 않으면 거부해야 함 | LegacyBridgeRegression.log:24 실제 assertion | pass | 원출력 직접 추출 |
| unknown link status를 영속 계약으로 허용하면 안 됨 | LegacyBridgeRegression.log:25 실제 assertion | pass | 원출력 직접 추출 |
| locator 없는 fallback evidence를 거부해야 함 | LegacyBridgeRegression.log:26 실제 assertion | pass | 원출력 직접 추출 |
| journal open 실패:  | LegacyBridgeRegression.log:27 실제 assertion | pass | 원출력 직접 추출 |
| catalog open 실패:  | LegacyBridgeRegression.log:28 실제 assertion | pass | 원출력 직접 추출 |
| event link 갱신은 SQLite primary projection에서 검증해야 함 | LegacyBridgeRegression.log:29 실제 assertion | pass | 원출력 직접 추출 |
| segment finalize 실패:  | LegacyBridgeRegression.log:30 실제 assertion | pass | 원출력 직접 추출 |
| segment finalize 실패:  | LegacyBridgeRegression.log:31 실제 assertion | pass | 원출력 직접 추출 |
| segment finalize 실패:  | LegacyBridgeRegression.log:32 실제 assertion | pass | 원출력 직접 추출 |
| segment finalize 실패:  | LegacyBridgeRegression.log:33 실제 assertion | pass | 원출력 직접 추출 |
| segment finalize 실패:  | LegacyBridgeRegression.log:34 실제 assertion | pass | 원출력 직접 추출 |
| retention policy 실패:  | LegacyBridgeRegression.log:35 실제 assertion | pass | 원출력 직접 추출 |
| 이벤트 저장 worker를 막지 않고 파생 job을 pending으로 enqueue해야 함 | LegacyBridgeRegression.log:36 실제 assertion | pass | 원출력 직접 추출 |
| 파생 중 원본 segment hold가 유지되어야 함 | LegacyBridgeRegression.log:37 실제 assertion | pass | 원출력 직접 추출 |
| 파생 중 원본 segment hold가 유지되어야 함 | LegacyBridgeRegression.log:38 실제 assertion | pass | 원출력 직접 추출 |
| 파생 중 원본 segment hold가 유지되어야 함 | LegacyBridgeRegression.log:39 실제 assertion | pass | 원출력 직접 추출 |
| 완전한 archive 파생 완료 뒤 ready clip을 반환해야 함 | LegacyBridgeRegression.log:40 실제 assertion | pass | 원출력 직접 추출 |
| event link ID와 derived clip path가 반환되어야 함 | LegacyBridgeRegression.log:41 실제 assertion | pass | 원출력 직접 추출 |
| 반개구간 overlap은 맞닿기만 한 segment를 제외해야 함 | LegacyBridgeRegression.log:42 실제 assertion | pass | 원출력 직접 추출 |
| media PTS event 범위가 segment epoch 기준 UTC로 변환되어야 함 | LegacyBridgeRegression.log:43 실제 assertion | pass | 원출력 직접 추출 |
| overlap segment가 UTC 순서로 전달되어야 함 | LegacyBridgeRegression.log:44 실제 assertion | pass | 원출력 직접 추출 |
| 파생 성공 link가 catalog complete로 저장되어야 함 | LegacyBridgeRegression.log:45 실제 assertion | pass | 원출력 직접 추출 |
| 파생 완료 뒤 원본 hold가 해제되어야 함 | LegacyBridgeRegression.log:46 실제 assertion | pass | 원출력 직접 추출 |
| 파생 완료 뒤 원본 hold가 해제되어야 함 | LegacyBridgeRegression.log:47 실제 assertion | pass | 원출력 직접 추출 |
| 파생 완료 뒤 원본 hold가 해제되어야 함 | LegacyBridgeRegression.log:48 실제 assertion | pass | 원출력 직접 추출 |
| 같은 event update는 파생 clip을 중복 생성하지 않아야 함 | LegacyBridgeRegression.log:49 실제 assertion | pass | 원출력 직접 추출 |
| 파생 중 원본 segment hold가 유지되어야 함 | LegacyBridgeRegression.log:50 실제 assertion | pass | 원출력 직접 추출 |
| 파생 중 원본 segment hold가 유지되어야 함 | LegacyBridgeRegression.log:51 실제 assertion | pass | 원출력 직접 추출 |
| 파생 중 원본 segment hold가 유지되어야 함 | LegacyBridgeRegression.log:52 실제 assertion | pass | 원출력 직접 추출 |
| 파생 중 원본 segment hold가 유지되어야 함 | LegacyBridgeRegression.log:53 실제 assertion | pass | 원출력 직접 추출 |
| 완료 event의 더 넓은 update는 range별 결정 ID로 다시 파생해야 함 | LegacyBridgeRegression.log:54 실제 assertion | pass | 원출력 직접 추출 |
| segment finalize 실패:  | LegacyBridgeRegression.log:55 실제 assertion | pass | 원출력 직접 추출 |
| segment finalize 실패:  | LegacyBridgeRegression.log:56 실제 assertion | pass | 원출력 직접 추출 |
| cam-b policy 실패:  | LegacyBridgeRegression.log:57 실제 assertion | pass | 원출력 직접 추출 |
| archive gap이 있으면 complete로 표시하면 안 됨 | LegacyBridgeRegression.log:58 실제 assertion | pass | 원출력 직접 추출 |
| link가 정확한 missing UTC range를 보존해야 함 | LegacyBridgeRegression.log:59 실제 assertion | pass | 원출력 직접 추출 |
| frame-buffer fallback 뒤 같은 link가 fallback evidence로 갱신되어야 함 | LegacyBridgeRegression.log:60 실제 assertion | pass | 원출력 직접 추출 |
| 같은 event link의 overlap/fallback 갱신 뒤에도 SQLite projection을 유지해야 함 | LegacyBridgeRegression.log:61 실제 assertion | pass | 원출력 직접 추출 |
| cam-late policy 실패:  | LegacyBridgeRegression.log:62 실제 assertion | pass | 원출력 직접 추출 |
| segment finalize 실패:  | LegacyBridgeRegression.log:63 실제 assertion | pass | 원출력 직접 추출 |
| 파생 중 원본 segment hold가 유지되어야 함 | LegacyBridgeRegression.log:64 실제 assertion | pass | 원출력 직접 추출 |
| 파생 중 원본 segment hold가 유지되어야 함 | LegacyBridgeRegression.log:65 실제 assertion | pass | 원출력 직접 추출 |
| 파생 중 원본 segment hold가 유지되어야 함 | LegacyBridgeRegression.log:66 실제 assertion | pass | 원출력 직접 추출 |
| 파생 중 원본 segment hold가 유지되어야 함 | LegacyBridgeRegression.log:67 실제 assertion | pass | 원출력 직접 추출 |
| anchor 없는 PTS를 finalized segment의 실제 PTS/UTC mapping으로 복구해야 함 | LegacyBridgeRegression.log:68 실제 assertion | pass | 원출력 직접 추출 |
| PTS epoch anchor가 없으면 임의 UTC 연결이나 파생을 하면 안 됨 | LegacyBridgeRegression.log:69 실제 assertion | pass | 원출력 직접 추출 |
| anchor 없는 PTS는 UTC field가 아니라 재해석 가능한 PTS range로 보존해야 함 | LegacyBridgeRegression.log:70 실제 assertion | pass | 원출력 직접 추출 |
| 같은 긴 prefix의 event ID도 SHA-256 기반 결정 ID가 충돌하면 안 됨 | LegacyBridgeRegression.log:71 실제 assertion | pass | 원출력 직접 추출 |
| 파생 중 원본 segment hold가 유지되어야 함 | LegacyBridgeRegression.log:72 실제 assertion | pass | 원출력 직접 추출 |
| 파생 중 원본 segment hold가 유지되어야 함 | LegacyBridgeRegression.log:73 실제 assertion | pass | 원출력 직접 추출 |
| 파생 중 원본 segment hold가 유지되어야 함 | LegacyBridgeRegression.log:74 실제 assertion | pass | 원출력 직접 추출 |
| 파생 중 원본 segment hold가 유지되어야 함 | LegacyBridgeRegression.log:75 실제 assertion | pass | 원출력 직접 추출 |
| 파생 중 원본 segment hold가 유지되어야 함 | LegacyBridgeRegression.log:76 실제 assertion | pass | 원출력 직접 추출 |
| 파생 중 원본 segment hold가 유지되어야 함 | LegacyBridgeRegression.log:77 실제 assertion | pass | 원출력 직접 추출 |
| 확장 회귀 journal open 실패:  | LegacyBridgeRegression.log:78 실제 assertion | pass | 원출력 직접 추출 |
| 확장 회귀 initial catalog open 실패:  | LegacyBridgeRegression.log:79 실제 assertion | pass | 원출력 직접 추출 |
| segment finalize 실패:  | LegacyBridgeRegression.log:80 실제 assertion | pass | 원출력 직접 추출 |
| cleanup 확장 fixture 저장 실패:  | LegacyBridgeRegression.log:81 실제 assertion | pass | 원출력 직접 추출 |
| cleanup 확장 fixture 저장 실패:  | LegacyBridgeRegression.log:82 실제 assertion | pass | 원출력 직접 추출 |
| 확장 회귀 restart catalog open 실패:  | LegacyBridgeRegression.log:83 실제 assertion | pass | 원출력 직접 추출 |
| 확장 policy 실패 | LegacyBridgeRegression.log:84 실제 assertion | pass | 원출력 직접 추출 |
| cleanup 확장 remux 실패는 한 번만 실행되어야 함 | LegacyBridgeRegression.log:85 실제 assertion | pass | 원출력 직접 추출 |
| 실패/Partial도 보류 확장 요청을 현재 범위로 소비해 보존해야 함 | LegacyBridgeRegression.log:86 실제 assertion | pass | 원출력 직접 추출 |
| 실패/Partial도 보류 확장 요청을 현재 범위로 소비해 보존해야 함 | LegacyBridgeRegression.log:87 실제 assertion | pass | 원출력 직접 추출 |
| PTS 확장은 다른 범위 ID를 사용해야 함 | LegacyBridgeRegression.log:88 실제 assertion | pass | 원출력 직접 추출 |
| 미해석 PTS 확장을 이전 complete clip으로 응답하면 안 됨 | LegacyBridgeRegression.log:89 실제 assertion | pass | 원출력 직접 추출 |
| segment finalize 실패:  | LegacyBridgeRegression.log:90 실제 assertion | pass | 원출력 직접 추출 |
| PTS 확장 2회는 최초 포함 총 3회 파생해야 함 | LegacyBridgeRegression.log:91 실제 assertion | pass | 원출력 직접 추출 |
| quota journal open 실패:  | LegacyBridgeRegression.log:92 실제 assertion | pass | 원출력 직접 추출 |
| quota catalog open 실패:  | LegacyBridgeRegression.log:93 실제 assertion | pass | 원출력 직접 추출 |
| segment finalize 실패:  | LegacyBridgeRegression.log:94 실제 assertion | pass | 원출력 직접 추출 |
| segment finalize 실패:  | LegacyBridgeRegression.log:95 실제 assertion | pass | 원출력 직접 추출 |
| quota policy 실패:  | LegacyBridgeRegression.log:96 실제 assertion | pass | 원출력 직접 추출 |
| event quota는 oldest event를 정리해 새 event write를 허용해야 함: ok | LegacyBridgeRegression.log:97 실제 assertion | pass | 원출력 직접 추출 |
| event quota 충족을 위해 continuous를 삭제하면 안 됨 | LegacyBridgeRegression.log:98 실제 assertion | pass | 원출력 직접 추출 |
| event quota는 oldest eligible event를 삭제해야 함 | LegacyBridgeRegression.log:99 실제 assertion | pass | 원출력 직접 추출 |
| policy 재등록 실패:  | LegacyBridgeRegression.log:100 실제 assertion | pass | 원출력 직접 추출 |
| policy 제거가 진행 중 event reservation을 지우면 안 됨 | LegacyBridgeRegression.log:101 실제 assertion | pass | 원출력 직접 추출 |
| 명시적 complete 뒤 event reservation ID를 재사용할 수 있어야 함 | LegacyBridgeRegression.log:102 실제 assertion | pass | 원출력 직접 추출 |
| queue journal open 실패:  | LegacyBridgeRegression.log:103 실제 assertion | pass | 원출력 직접 추출 |
| queue catalog open 실패:  | LegacyBridgeRegression.log:104 실제 assertion | pass | 원출력 직접 추출 |
| segment finalize 실패:  | LegacyBridgeRegression.log:105 실제 assertion | pass | 원출력 직접 추출 |
| queue policy 실패:  | LegacyBridgeRegression.log:106 실제 assertion | pass | 원출력 직접 추출 |
| bounded queue 밖 durable pending도 완료 뒤 다시 흡수해야 함 | LegacyBridgeRegression.log:107 실제 assertion | pass | 원출력 직접 추출 |
| 긴 event remux가 다른 이벤트의 durable link admission을 동기 차단하면 안 됨 | LegacyBridgeRegression.log:108 실제 assertion | pass | 원출력 직접 추출 |
| cleanup 실패 시 source hold와 event reservation을 성공처럼 해제하면 안 됨 | LegacyBridgeRegression.log:109 실제 assertion | pass | 원출력 직접 추출 |
| terminal marker unlink 실패 시 source/output hold를 유지해야 함 | LegacyBridgeRegression.log:110 실제 assertion | pass | 원출력 직접 추출 |
| terminal marker unlink 실패 시 event reservation을 유지해야 함 | LegacyBridgeRegression.log:111 실제 assertion | pass | 원출력 직접 추출 |
| marker 복구 중 event/fallback 갱신은 자원·단계를 보존하고 확장 요청을 내구 대기해야 함 | LegacyBridgeRegression.log:112 실제 assertion | pass | 원출력 직접 추출 |
| terminal hold 해제 실패를 Complete로 기록하면 안 됨 | LegacyBridgeRegression.log:113 실제 assertion | pass | 원출력 직접 추출 |
| terminal 복구 중 event/fallback 갱신이 release 단계를 덮어쓰면 안 됨 | LegacyBridgeRegression.log:114 실제 assertion | pass | 원출력 직접 추출 |
| 복구 완료 뒤 내구 대기한 범위 확장은 같은 source epoch의 새 segment로 파생해야 함 | LegacyBridgeRegression.log:115 실제 assertion | pass | 원출력 직접 추출 |
| terminal complete commit retry fixture 저장 실패:  | LegacyBridgeRegression.log:116 실제 assertion | pass | 원출력 직접 추출 |
| complete commit 재시도는 다른 pending event의 source hold를 해제하면 안 됨 | LegacyBridgeRegression.log:117 실제 assertion | pass | 원출력 직접 추출 |
| overflow fixture 이전 hold_count가 저장 범위를 넘으면 안 됨 | LegacyBridgeRegression.log:118 실제 assertion | pass | 원출력 직접 추출 |
| hold overflow fixture 준비 실패:  | LegacyBridgeRegression.log:119 실제 assertion | pass | 원출력 직접 추출 |
| event source lease hold_count overflow를 사전에 거부해야 함 | LegacyBridgeRegression.log:120 실제 assertion | pass | 원출력 직접 추출 |
| hold fixture journal open 실패:  | LegacyBridgeRegression.log:121 실제 assertion | pass | 원출력 직접 추출 |
| hold fixture catalog open 실패:  | LegacyBridgeRegression.log:122 실제 assertion | pass | 원출력 직접 추출 |
| segment finalize 실패:  | LegacyBridgeRegression.log:123 실제 assertion | pass | 원출력 직접 추출 |
| segment finalize 실패:  | LegacyBridgeRegression.log:124 실제 assertion | pass | 원출력 직접 추출 |
| hold pending link 저장 실패:  | LegacyBridgeRegression.log:125 실제 assertion | pass | 원출력 직접 추출 |
| hold replay journal open 실패:  | LegacyBridgeRegression.log:126 실제 assertion | pass | 원출력 직접 추출 |
| hold replay catalog open 실패:  | LegacyBridgeRegression.log:127 실제 assertion | pass | 원출력 직접 추출 |
| 재시작 replay가 terminal 전 output/source hold를 함께 복원해야 함 | LegacyBridgeRegression.log:128 실제 assertion | pass | 원출력 직접 추출 |
| terminal stage fixture event link 조회 | LegacyBridgeRegression.log:129 실제 assertion | pass | 원출력 직접 추출 |
| terminal stage fixture 저장 실패:  | LegacyBridgeRegression.log:130 실제 assertion | pass | 원출력 직접 추출 |
| terminal stage replay journal open:  | LegacyBridgeRegression.log:131 실제 assertion | pass | 원출력 직접 추출 |
| terminal stage catalog open:  | LegacyBridgeRegression.log:132 실제 assertion | pass | 원출력 직접 추출 |
| complete commit 단계 재시작은 이미 해제된 output/source hold를 복원하면 안 됨 | LegacyBridgeRegression.log:133 실제 assertion | pass | 원출력 직접 추출 |
| terminal Complete 기록 전 source 삭제 요청을 차단해야 함 | LegacyBridgeRegression.log:134 실제 assertion | pass | 원출력 직접 추출 |
| terminal Complete 기록 전 output 삭제 요청을 차단해야 함 | LegacyBridgeRegression.log:135 실제 assertion | pass | 원출력 직접 추출 |
| restart journal open 실패:  | LegacyBridgeRegression.log:136 실제 assertion | pass | 원출력 직접 추출 |
| restart catalog open 실패:  | LegacyBridgeRegression.log:137 실제 assertion | pass | 원출력 직접 추출 |
| segment finalize 실패:  | LegacyBridgeRegression.log:138 실제 assertion | pass | 원출력 직접 추출 |
| segment finalize 실패:  | LegacyBridgeRegression.log:139 실제 assertion | pass | 원출력 직접 추출 |
| restart pending link 저장 실패:  | LegacyBridgeRegression.log:140 실제 assertion | pass | 원출력 직접 추출 |
| 재시작은 이미 finalized된 결정적 event segment를 재파생 없이 연결해야 함 | LegacyBridgeRegression.log:141 실제 assertion | pass | 원출력 직접 추출 |
| 재시작 복구에서 event clip을 중복 파생하면 안 됨 | LegacyBridgeRegression.log:142 실제 assertion | pass | 원출력 직접 추출 |
| segment finalize 실패:  | LegacyBridgeRegression.log:143 실제 assertion | pass | 원출력 직접 추출 |
| conflict pending link 저장 실패:  | LegacyBridgeRegression.log:144 실제 assertion | pass | 원출력 직접 추출 |
| 다른 channel/class의 동일 segment ID를 event 결과로 오인하면 안 됨 | LegacyBridgeRegression.log:145 실제 assertion | pass | 원출력 직접 추출 |
| segment ID conflict에서 파생을 실행하면 안 됨 | LegacyBridgeRegression.log:146 실제 assertion | pass | 원출력 직접 추출 |

### IdentityRegression.log

명령 exit 0, 23 pass / 0 fail. [원출력](IdentityRegression.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| V410-IDMAP-I01 | IdentityRegression.log:1 실제 assertion | pass | 원출력 직접 추출 |
| V410-IDMAP-I02 | IdentityRegression.log:2 실제 assertion | pass | 원출력 직접 추출 |
| V410-IDMAP-I03 | IdentityRegression.log:3 실제 assertion | pass | 원출력 직접 추출 |
| V410-IDMAP-I04 | IdentityRegression.log:4 실제 assertion | pass | 원출력 직접 추출 |
| V410-IDMAP-I05 | IdentityRegression.log:5 실제 assertion | pass | 원출력 직접 추출 |
| V410-IDMAP-I06 | IdentityRegression.log:6 실제 assertion | pass | 원출력 직접 추출 |
| V410-IDMAP-I07 | IdentityRegression.log:7 실제 assertion | pass | 원출력 직접 추출 |
| S07-time-session-start | IdentityRegression.log:8 실제 assertion | pass | 원출력 직접 추출 |
| S07-time-session-input | IdentityRegression.log:9 실제 assertion | pass | 원출력 직접 추출 |
| S07-time-session-range | IdentityRegression.log:10 실제 assertion | pass | 원출력 직접 추출 |
| S07-time-session-accepted-gap-null | IdentityRegression.log:11 실제 assertion | pass | 원출력 직접 추출 |
| S07-time-session-ambiguous-channel | IdentityRegression.log:12 실제 assertion | pass | 원출력 직접 추출 |
| S07-time-finalize-success-observer-exception-isolated | IdentityRegression.log:13 실제 assertion | pass | 원출력 직접 추출 |
| S07-time-session-restart | IdentityRegression.log:14 실제 assertion | pass | 원출력 직접 추출 |
| S07-time-session-restart-null | IdentityRegression.log:15 실제 assertion | pass | 원출력 직접 추출 |
| S07-time-finalize-failure-no-observer-stop-null | IdentityRegression.log:16 실제 assertion | pass | 원출력 직접 추출 |
| V410-IDMAP-I08 | IdentityRegression.log:17 실제 assertion | pass | 원출력 직접 추출 |
| V410-IDMAP-I09 | IdentityRegression.log:18 실제 assertion | pass | 원출력 직접 추출 |
| V410-IDMAP-I10 | IdentityRegression.log:19 실제 assertion | pass | 원출력 직접 추출 |
| V410-IDMAP-I11 | IdentityRegression.log:20 실제 assertion | pass | 원출력 직접 추출 |
| V410-IDMAP-I12 | IdentityRegression.log:21 실제 assertion | pass | 원출력 직접 추출 |
| V410-IDMAP-I13 | IdentityRegression.log:22 실제 assertion | pass | 원출력 직접 추출 |
| S07-time-session-blocked-writer-null-nonblocking | IdentityRegression.log:23 실제 assertion | pass | 원출력 직접 추출 |

### FinalizeIntegrationRegression.log

명령 exit 0, 140 pass / 0 fail. [원출력](FinalizeIntegrationRegression.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| FR09 actual H264 packet fixture | FinalizeIntegrationRegression.log:1 실제 assertion | pass | 원출력 직접 추출 |
| FR09 writer start | FinalizeIntegrationRegression.log:2 실제 assertion | pass | 원출력 직접 추출 |
| FR09 callback observes durable ready | FinalizeIntegrationRegression.log:3 실제 assertion | pass | 원출력 직접 추출 |
| FR09 callback observes owned marker | FinalizeIntegrationRegression.log:4 실제 assertion | pass | 원출력 직접 추출 |
| FR09 exact final bytes metadata | FinalizeIntegrationRegression.log:5 실제 assertion | pass | 원출력 직접 추출 |
| FR09 completion actual bytes | FinalizeIntegrationRegression.log:6 실제 assertion | pass | 원출력 직접 추출 |
| FR09 exactly one finalized callback | FinalizeIntegrationRegression.log:7 실제 assertion | pass | 원출력 직접 추출 |
| FR09 successful cleanup and reservation completion | FinalizeIntegrationRegression.log:8 실제 assertion | pass | 원출력 직접 추출 |
| FR09 writer start | FinalizeIntegrationRegression.log:9 실제 assertion | pass | 원출력 직접 추출 |
| FR09 callback observes durable ready | FinalizeIntegrationRegression.log:10 실제 assertion | pass | 원출력 직접 추출 |
| FR09 callback observes owned marker | FinalizeIntegrationRegression.log:11 실제 assertion | pass | 원출력 직접 추출 |
| FR09 exact final bytes metadata | FinalizeIntegrationRegression.log:12 실제 assertion | pass | 원출력 직접 추출 |
| FR10 failure occurs during Push and blocks later packet admission before Stop | FinalizeIntegrationRegression.log:14 실제 assertion | pass | 원출력 직접 추출 |
| FR10 repeated Push while started cannot bypass recovery pending | FinalizeIntegrationRegression.log:15 실제 assertion | pass | 원출력 직접 추출 |
| FR09 exactly one finalized callback | FinalizeIntegrationRegression.log:16 실제 assertion | pass | 원출력 직접 추출 |
| FR10 failure blocks repeat admission and reservation release | FinalizeIntegrationRegression.log:17 실제 assertion | pass | 원출력 직접 추출 |
| FR10 Stop preserves media ready marker | FinalizeIntegrationRegression.log:18 실제 assertion | pass | 원출력 직접 추출 |
| FR10 recovery journal | FinalizeIntegrationRegression.log:19 실제 assertion | pass | 원출력 직접 추출 |
| FR10 recovery Open preserves ready | FinalizeIntegrationRegression.log:20 실제 assertion | pass | 원출력 직접 추출 |
| FR10 restart recovers callback failure original ID | FinalizeIntegrationRegression.log:21 실제 assertion | pass | 원출력 직접 추출 |
| FR06 known journal | FinalizeIntegrationRegression.log:22 실제 assertion | pass | 원출력 직접 추출 |
| FR06 known catalog | FinalizeIntegrationRegression.log:23 실제 assertion | pass | 원출력 직접 추출 |
| FR06 known original metadata | FinalizeIntegrationRegression.log:24 실제 assertion | pass | 원출력 직접 추출 |
| FR06 known ready | FinalizeIntegrationRegression.log:25 실제 assertion | pass | 원출력 직접 추출 |
| FR06 temporary hold fixture | FinalizeIntegrationRegression.log:26 실제 assertion | pass | 원출력 직접 추출 |
| FR06 durable diagnostic before rejected Mark preserves journal | FinalizeIntegrationRegression.log:27 실제 assertion | pass | 원출력 직접 추출 |
| FR06 release fixture hold | FinalizeIntegrationRegression.log:28 실제 assertion | pass | 원출력 직접 추출 |
| FR06 before Mark restart journal | FinalizeIntegrationRegression.log:29 실제 assertion | pass | 원출력 직접 추출 |
| FR06 before Mark restart catalog | FinalizeIntegrationRegression.log:30 실제 assertion | pass | 원출력 직접 추출 |
| FR06 diagnostic before Mark crash converges to Corrupt | FinalizeIntegrationRegression.log:31 실제 assertion | pass | 원출력 직접 추출 |
| FR06 after Mark restart journal | FinalizeIntegrationRegression.log:32 실제 assertion | pass | 원출력 직접 추출 |
| FR06 after Mark restart catalog | FinalizeIntegrationRegression.log:33 실제 assertion | pass | 원출력 직접 추출 |
| FR06 after Mark crash repeat no append | FinalizeIntegrationRegression.log:34 실제 assertion | pass | 원출력 직접 추출 |
| FR06 diagnostic conflict preserves original and journal | FinalizeIntegrationRegression.log:35 실제 assertion | pass | 원출력 직접 추출 |
| FR16 event journal open | FinalizeIntegrationRegression.log:36 실제 assertion | pass | 원출력 직접 추출 |
| FR16 event catalog open | FinalizeIntegrationRegression.log:37 실제 assertion | pass | 원출력 직접 추출 |
| FR16 actual catalog mode | FinalizeIntegrationRegression.log:38 실제 assertion | pass | 원출력 직접 추출 |
| FR12 original source registered | FinalizeIntegrationRegression.log:39 실제 assertion | pass | 원출력 직접 추출 |
| FR12 durable Pending precedes remux | FinalizeIntegrationRegression.log:40 실제 assertion | pass | 원출력 직접 추출 |
| FR11 actual MPEGTS remux ready | FinalizeIntegrationRegression.log:41 실제 assertion | pass | 원출력 직접 추출 |
| FR11 actual tsdemux healthy | FinalizeIntegrationRegression.log:42 실제 assertion | pass | 원출력 직접 추출 |
| FR12 ready contains derived epoch fixture | FinalizeIntegrationRegression.log:43 실제 assertion | pass | 원출력 직접 추출 |
| FR12 raw mismatched event epoch recovery rejects without registration | FinalizeIntegrationRegression.log:44 실제 assertion | pass | 원출력 직접 추출 |
| FR13 new event output recovered | FinalizeIntegrationRegression.log:45 실제 assertion | pass | 원출력 직접 추출 |
| FR13 source and new output holds exactly once | FinalizeIntegrationRegression.log:46 실제 assertion | pass | 원출력 직접 추출 |
| FR16 query contains source and recovered output | FinalizeIntegrationRegression.log:47 실제 assertion | pass | 원출력 직접 추출 |
| FR14 recreate exact postcommit stale ready | FinalizeIntegrationRegression.log:48 실제 assertion | pass | 원출력 직접 추출 |
| FR14 restart journal | FinalizeIntegrationRegression.log:49 실제 assertion | pass | 원출력 직접 추출 |
| FR14 restart catalog | FinalizeIntegrationRegression.log:50 실제 assertion | pass | 원출력 직접 추출 |
| FR14 Open restores source output holds | FinalizeIntegrationRegression.log:51 실제 assertion | pass | 원출력 직접 추출 |
| FR14 committed replay no journal append | FinalizeIntegrationRegression.log:52 실제 assertion | pass | 원출력 직접 추출 |
| FR14 committed recovery no duplicate holds | FinalizeIntegrationRegression.log:53 실제 assertion | pass | 원출력 직접 추출 |
| FR15 bridge quota policy | FinalizeIntegrationRegression.log:54 실제 assertion | pass | 원출력 직접 추출 |
| FR14 existing output terminal recovery no remux | FinalizeIntegrationRegression.log:55 실제 assertion | pass | 원출력 직접 추출 |
| FR14 existing terminal releases all restored holds | FinalizeIntegrationRegression.log:56 실제 assertion | pass | 원출력 직접 추출 |
| FR15 production bridge accepts event | FinalizeIntegrationRegression.log:57 실제 assertion | pass | 원출력 직접 추출 |
| FR15 every actual bridge request carries ready metadata and reservation | FinalizeIntegrationRegression.log:58 실제 assertion | pass | 원출력 직접 추출 |
| FR15 actual production bridge remux completes | FinalizeIntegrationRegression.log:59 실제 assertion | pass | 원출력 직접 추출 |
| FR15 production bridge clears ready before terminal | FinalizeIntegrationRegression.log:60 실제 assertion | pass | 원출력 직접 추출 |
| FR15 reservation exceed before ready emission | FinalizeIntegrationRegression.log:61 실제 assertion | pass | 원출력 직접 추출 |
| FR15 reservation exceed cleans owned output only | FinalizeIntegrationRegression.log:62 실제 assertion | pass | 원출력 직접 추출 |
| FR16 event journal open | FinalizeIntegrationRegression.log:63 실제 assertion | pass | 원출력 직접 추출 |
| FR16 event catalog open | FinalizeIntegrationRegression.log:64 실제 assertion | pass | 원출력 직접 추출 |
| FR16 actual catalog mode | FinalizeIntegrationRegression.log:65 실제 assertion | pass | 원출력 직접 추출 |
| FR12 original source registered | FinalizeIntegrationRegression.log:66 실제 assertion | pass | 원출력 직접 추출 |
| FR12 durable Pending precedes remux | FinalizeIntegrationRegression.log:67 실제 assertion | pass | 원출력 직접 추출 |
| FR11 actual MPEGTS remux ready | FinalizeIntegrationRegression.log:68 실제 assertion | pass | 원출력 직접 추출 |
| FR11 actual tsdemux healthy | FinalizeIntegrationRegression.log:69 실제 assertion | pass | 원출력 직접 추출 |
| FR12 ready contains derived epoch fixture | FinalizeIntegrationRegression.log:70 실제 assertion | pass | 원출력 직접 추출 |
| FR12 raw mismatched event epoch recovery rejects without registration | FinalizeIntegrationRegression.log:71 실제 assertion | pass | 원출력 직접 추출 |
| FR13 new event output recovered | FinalizeIntegrationRegression.log:72 실제 assertion | pass | 원출력 직접 추출 |
| FR13 source and new output holds exactly once | FinalizeIntegrationRegression.log:73 실제 assertion | pass | 원출력 직접 추출 |
| FR16 query contains source and recovered output | FinalizeIntegrationRegression.log:74 실제 assertion | pass | 원출력 직접 추출 |
| FR16 direct SQLite open | FinalizeIntegrationRegression.log:75 실제 assertion | pass | 원출력 직접 추출 |
| FR16 direct SQLite prepare | FinalizeIntegrationRegression.log:76 실제 assertion | pass | 원출력 직접 추출 |
| FR16 actual SQL lifecycle and exact codec metadata projection | FinalizeIntegrationRegression.log:77 실제 assertion | pass | 원출력 직접 추출 |
| FR14 recreate exact postcommit stale ready | FinalizeIntegrationRegression.log:78 실제 assertion | pass | 원출력 직접 추출 |
| FR14 restart journal | FinalizeIntegrationRegression.log:79 실제 assertion | pass | 원출력 직접 추출 |
| FR14 restart catalog | FinalizeIntegrationRegression.log:80 실제 assertion | pass | 원출력 직접 추출 |
| FR14 Open restores source output holds | FinalizeIntegrationRegression.log:81 실제 assertion | pass | 원출력 직접 추출 |
| FR14 committed replay no journal append | FinalizeIntegrationRegression.log:82 실제 assertion | pass | 원출력 직접 추출 |
| FR14 committed recovery no duplicate holds | FinalizeIntegrationRegression.log:83 실제 assertion | pass | 원출력 직접 추출 |
| FR15 bridge quota policy | FinalizeIntegrationRegression.log:84 실제 assertion | pass | 원출력 직접 추출 |
| FR14 existing output terminal recovery no remux | FinalizeIntegrationRegression.log:85 실제 assertion | pass | 원출력 직접 추출 |
| FR14 existing terminal releases all restored holds | FinalizeIntegrationRegression.log:86 실제 assertion | pass | 원출력 직접 추출 |
| FR15 production bridge accepts event | FinalizeIntegrationRegression.log:87 실제 assertion | pass | 원출력 직접 추출 |
| FR15 every actual bridge request carries ready metadata and reservation | FinalizeIntegrationRegression.log:88 실제 assertion | pass | 원출력 직접 추출 |
| FR15 actual production bridge remux completes | FinalizeIntegrationRegression.log:89 실제 assertion | pass | 원출력 직접 추출 |
| FR15 production bridge clears ready before terminal | FinalizeIntegrationRegression.log:90 실제 assertion | pass | 원출력 직접 추출 |
| FR15 reservation exceed before ready emission | FinalizeIntegrationRegression.log:91 실제 assertion | pass | 원출력 직접 추출 |
| FR15 reservation exceed cleans owned output only | FinalizeIntegrationRegression.log:92 실제 assertion | pass | 원출력 직접 추출 |
| FR15 failure journal | FinalizeIntegrationRegression.log:93 실제 assertion | pass | 원출력 직접 추출 |
| FR15 failure catalog | FinalizeIntegrationRegression.log:94 실제 assertion | pass | 원출력 직접 추출 |
| FR15 failure source | FinalizeIntegrationRegression.log:95 실제 assertion | pass | 원출력 직접 추출 |
| FR15 failure quota policy | FinalizeIntegrationRegression.log:96 실제 assertion | pass | 원출력 직접 추출 |
| FR15 failure request accepted | FinalizeIntegrationRegression.log:97 실제 assertion | pass | 원출력 직접 추출 |
| FR15 failed Pending append prevents remux and releases source lease | FinalizeIntegrationRegression.log:98 실제 assertion | pass | 원출력 직접 추출 |
| FR15 failed Pending append leaves original and replacement journal unchanged | FinalizeIntegrationRegression.log:99 실제 assertion | pass | 원출력 직접 추출 |
| FR15 failed Pending append creates no ready | FinalizeIntegrationRegression.log:100 실제 assertion | pass | 원출력 직접 추출 |
| FR15 failed Pending append released exact reservation for readmission | FinalizeIntegrationRegression.log:101 실제 assertion | pass | 원출력 직접 추출 |
| FR06 size ready fixture | FinalizeIntegrationRegression.log:102 실제 assertion | pass | 원출력 직접 추출 |
| FR06 size journal fixture | FinalizeIntegrationRegression.log:103 실제 assertion | pass | 원출력 직접 추출 |
| FR06 size catalog fixture | FinalizeIntegrationRegression.log:104 실제 assertion | pass | 원출력 직접 추출 |
| FR06 size definite corruption never finalized | FinalizeIntegrationRegression.log:105 실제 assertion | pass | 원출력 직접 추출 |
| FR06 size corrupt original and ticket retained | FinalizeIntegrationRegression.log:106 실제 assertion | pass | 원출력 직접 추출 |
| FR06 size repeat logical quarantine converges | FinalizeIntegrationRegression.log:107 실제 assertion | pass | 원출력 직접 추출 |
| FR06 container ready fixture | FinalizeIntegrationRegression.log:108 실제 assertion | pass | 원출력 직접 추출 |
| FR06 container journal fixture | FinalizeIntegrationRegression.log:109 실제 assertion | pass | 원출력 직접 추출 |
| FR06 container catalog fixture | FinalizeIntegrationRegression.log:110 실제 assertion | pass | 원출력 직접 추출 |
| FR06 container definite corruption never finalized | FinalizeIntegrationRegression.log:111 실제 assertion | pass | 원출력 직접 추출 |
| FR06 container corrupt original and ticket retained | FinalizeIntegrationRegression.log:112 실제 assertion | pass | 원출력 직접 추출 |
| FR06 container repeat logical quarantine converges | FinalizeIntegrationRegression.log:113 실제 assertion | pass | 원출력 직접 추출 |
| FR06 two-links ready fixture | FinalizeIntegrationRegression.log:114 실제 assertion | pass | 원출력 직접 추출 |
| FR06 two-links journal fixture | FinalizeIntegrationRegression.log:115 실제 assertion | pass | 원출력 직접 추출 |
| FR06 two-links catalog fixture | FinalizeIntegrationRegression.log:116 실제 assertion | pass | 원출력 직접 추출 |
| FR06 two-links definite corruption never finalized | FinalizeIntegrationRegression.log:117 실제 assertion | pass | 원출력 직접 추출 |
| FR06 two-links corrupt original and ticket retained | FinalizeIntegrationRegression.log:118 실제 assertion | pass | 원출력 직접 추출 |
| FR06 two-links repeat logical quarantine converges | FinalizeIntegrationRegression.log:119 실제 assertion | pass | 원출력 직접 추출 |
| FR12 missing link journal | FinalizeIntegrationRegression.log:120 실제 assertion | pass | 원출력 직접 추출 |
| FR12 missing link catalog | FinalizeIntegrationRegression.log:121 실제 assertion | pass | 원출력 직접 추출 |
| FR12 missing link source | FinalizeIntegrationRegression.log:122 실제 assertion | pass | 원출력 직접 추출 |
| FR12 missing durable link actual remux fixture | FinalizeIntegrationRegression.log:123 실제 assertion | pass | 원출력 직접 추출 |
| FR12 missing durable Pending prevents inferred event registration | FinalizeIntegrationRegression.log:124 실제 assertion | pass | 원출력 직접 추출 |
| FR12 mismatched durable event fixture | FinalizeIntegrationRegression.log:125 실제 assertion | pass | 원출력 직접 추출 |
| FR12 mismatched durable event preserves output and journal | FinalizeIntegrationRegression.log:126 실제 assertion | pass | 원출력 직접 추출 |
| FR11 unsupported MPEGTS codec metadata unavailable | FinalizeIntegrationRegression.log:127 실제 assertion | pass | 원출력 직접 추출 |
| FR11 actual MPEGTS changed bytes definitely corrupt | FinalizeIntegrationRegression.log:128 실제 assertion | pass | 원출력 직접 추출 |
| FR11 unclassified MPEGTS error unavailable preserves bytes and journal | FinalizeIntegrationRegression.log:130 실제 assertion | pass | 원출력 직접 추출 |
| FR06 path journal | FinalizeIntegrationRegression.log:131 실제 assertion | pass | 원출력 직접 추출 |
| FR06 path catalog | FinalizeIntegrationRegression.log:132 실제 assertion | pass | 원출력 직접 추출 |
| FR06 path known corrupt fixture | FinalizeIntegrationRegression.log:133 실제 assertion | pass | 원출력 직접 추출 |
| FR06 path foreign relative ready fixture | FinalizeIntegrationRegression.log:134 실제 assertion | pass | 원출력 직접 추출 |
| FR06 known Corrupt same metadata different stored path rejected | FinalizeIntegrationRegression.log:135 실제 assertion | pass | 원출력 직접 추출 |
| FR09 single packet writer start | FinalizeIntegrationRegression.log:136 실제 assertion | pass | 원출력 직접 추출 |
| FR09 single packet cleanup returns actual bytes | FinalizeIntegrationRegression.log:137 실제 assertion | pass | 원출력 직접 추출 |
| FR09 single packet invalid interval cleans before ready without callback | FinalizeIntegrationRegression.log:138 실제 assertion | pass | 원출력 직접 추출 |
| FR09 restart after incomplete single packet | FinalizeIntegrationRegression.log:139 실제 assertion | pass | 원출력 직접 추출 |
| FR09 recovered positive interval callback valid V1 | FinalizeIntegrationRegression.log:140 실제 assertion | pass | 원출력 직접 추출 |
| FR09 single packet cleanup returns actual bytes | FinalizeIntegrationRegression.log:141 실제 assertion | pass | 원출력 직접 추출 |
| FR09 positive interval after incomplete packet finalizes normally | FinalizeIntegrationRegression.log:142 실제 assertion | pass | 원출력 직접 추출 |

### CatalogRegression.log

명령 exit 0, 246 pass / 0 fail. [원출력](CatalogRegression.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| journal open:  | CatalogRegression.log:1 실제 assertion | pass | 원출력 직접 추출 |
| fallback catalog open:  | CatalogRegression.log:2 실제 assertion | pass | 원출력 직접 추출 |
| SQLite off mode 표시 | CatalogRegression.log:3 실제 assertion | pass | 원출력 직접 추출 |
| segment finalize journal+projection:  | CatalogRegression.log:4 실제 assertion | pass | 원출력 직접 추출 |
| fallback range query | CatalogRegression.log:5 실제 assertion | pass | 원출력 직접 추출 |
| event link FK 위반 거부 | CatalogRegression.log:6 실제 assertion | pass | 원출력 직접 추출 |
| FK 위반 transaction/journal 전체 rollback | CatalogRegression.log:7 실제 assertion | pass | 원출력 직접 추출 |
| 최초 durable mutation 1개 | CatalogRegression.log:8 실제 assertion | pass | 원출력 직접 추출 |
| 동일 mutation 중복 append | CatalogRegression.log:9 실제 assertion | pass | 원출력 직접 추출 |
| 손상 사이 정상 durable mutation 보존 | CatalogRegression.log:10 실제 assertion | pass | 원출력 직접 추출 |
| 중간 corrupt line count | CatalogRegression.log:11 실제 assertion | pass | 원출력 직접 추출 |
| 마지막 truncated line skip | CatalogRegression.log:12 실제 assertion | pass | 원출력 직접 추출 |
| fallback replay open | CatalogRegression.log:13 실제 assertion | pass | 원출력 직접 추출 |
| 같은 mutation idempotent replay | CatalogRegression.log:14 실제 assertion | pass | 원출력 직접 추출 |
| 재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존 | CatalogRegression.log:15 실제 assertion | pass | 원출력 직접 추출 |
| 중복 replay row/합계 불증가 | CatalogRegression.log:16 실제 assertion | pass | 원출력 직접 추출 |
| 추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구:  | CatalogRegression.log:17 실제 assertion | pass | 원출력 직접 추출 |
| writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed | CatalogRegression.log:18 실제 assertion | pass | 원출력 직접 추출 |
| v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed | CatalogRegression.log:19 실제 assertion | pass | 원출력 직접 추출 |
| SQLite catalog open/rebuild:  | CatalogRegression.log:20 실제 assertion | pass | 원출력 직접 추출 |
| SQLite primary mode 표시 | CatalogRegression.log:21 실제 assertion | pass | 원출력 직접 추출 |
| SQLite on/off range query ID·순서 parity | CatalogRegression.log:22 실제 assertion | pass | 원출력 직접 추출 |
| journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분 | CatalogRegression.log:23 실제 assertion | pass | 원출력 직접 추출 |
| journal 없는 손상 media orphan 구분 | CatalogRegression.log:24 실제 assertion | pass | 원출력 직접 추출 |
| projection failover journal open:  | CatalogRegression.log:25 실제 assertion | pass | 원출력 직접 추출 |
| projection failover catalog open:  | CatalogRegression.log:26 실제 assertion | pass | 원출력 직접 추출 |
| 실제 SQLite INSERT 실패 trigger 설치 | CatalogRegression.log:27 실제 assertion | pass | 원출력 직접 추출 |
| SQLite 투영 실패 뒤 journal+memory finalize 유지:  | CatalogRegression.log:28 실제 assertion | pass | 원출력 직접 추출 |
| SQLite 투영 실패 즉시 JSONL fallback 전환 | CatalogRegression.log:29 실제 assertion | pass | 원출력 직접 추출 |
| 재시작 rebuild 전 실패 trigger 제거 | CatalogRegression.log:30 실제 assertion | pass | 원출력 직접 추출 |
| 투영 실패 직후 in-memory query 정합성 유지 | CatalogRegression.log:31 실제 assertion | pass | 원출력 직접 추출 |
| projection failover 재시작 journal rebuild:  | CatalogRegression.log:32 실제 assertion | pass | 원출력 직접 추출 |
| 재시작 후 journal에서 누락 SQLite projection 복구 | CatalogRegression.log:33 실제 assertion | pass | 원출력 직접 추출 |
| 재시작 후 SQLite primary 복귀 | CatalogRegression.log:34 실제 assertion | pass | 원출력 직접 추출 |
| 재시작 journal rebuild가 실제 SQLite row 복원 | CatalogRegression.log:35 실제 assertion | pass | 원출력 직접 추출 |
| tombstone journal open:  | CatalogRegression.log:36 실제 assertion | pass | 원출력 직접 추출 |
| tombstone catalog open:  | CatalogRegression.log:37 실제 assertion | pass | 원출력 직접 추출 |
| tombstone 대상 segment finalize:  | CatalogRegression.log:38 실제 assertion | pass | 원출력 직접 추출 |
| tombstone 대상 deletion request:  | CatalogRegression.log:39 실제 assertion | pass | 원출력 직접 추출 |
| tombstone 완료 기록:  | CatalogRegression.log:40 실제 assertion | pass | 원출력 직접 추출 |
| catalog finalize가 tombstone segment ID 재사용을 거부해야 함 | CatalogRegression.log:41 실제 assertion | pass | 원출력 직접 추출 |
| 손상 SQLite 격리 후 journal rebuild:  | CatalogRegression.log:42 실제 assertion | pass | 원출력 직접 추출 |
| 손상 SQLite 원본 격리 | CatalogRegression.log:43 실제 assertion | pass | 원출력 직접 추출 |
| 격리 SQLite 파일 보존 | CatalogRegression.log:44 실제 assertion | pass | 원출력 직접 추출 |
| 격리 후 journal rebuild 결과 | CatalogRegression.log:45 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A future-schema journal read open | CatalogRegression.log:46 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A future-schema unsupported classification | CatalogRegression.log:47 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A future-schema catalog open denied | CatalogRegression.log:48 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A future-schema catalog retry denied | CatalogRegression.log:49 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A future-schema journal bytes preserved | CatalogRegression.log:50 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A future-schema SQLite bytes preserved | CatalogRegression.log:51 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A future-schema writer cleanup untouched | CatalogRegression.log:52 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A arbitrary-schema journal read open | CatalogRegression.log:53 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A arbitrary-schema unsupported classification | CatalogRegression.log:54 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A arbitrary-schema catalog open denied | CatalogRegression.log:55 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A arbitrary-schema catalog retry denied | CatalogRegression.log:56 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A arbitrary-schema journal bytes preserved | CatalogRegression.log:57 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A arbitrary-schema SQLite bytes preserved | CatalogRegression.log:58 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A arbitrary-schema writer cleanup untouched | CatalogRegression.log:59 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A empty-schema journal read open | CatalogRegression.log:60 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A empty-schema unsupported classification | CatalogRegression.log:61 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A empty-schema catalog open denied | CatalogRegression.log:62 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A empty-schema catalog retry denied | CatalogRegression.log:63 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A empty-schema journal bytes preserved | CatalogRegression.log:64 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A empty-schema SQLite bytes preserved | CatalogRegression.log:65 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A empty-schema writer cleanup untouched | CatalogRegression.log:66 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A future-type journal read open | CatalogRegression.log:67 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A future-type unsupported classification | CatalogRegression.log:68 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A future-type catalog open denied | CatalogRegression.log:69 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A future-type catalog retry denied | CatalogRegression.log:70 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A future-type journal bytes preserved | CatalogRegression.log:71 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A future-type SQLite bytes preserved | CatalogRegression.log:72 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A future-type writer cleanup untouched | CatalogRegression.log:73 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A malformed journal open | CatalogRegression.log:74 실제 assertion | pass | 원출력 직접 추출 |
| S10-3A malformed JSON missing fields and wrong types remain corrupt | CatalogRegression.log:75 실제 assertion | pass | 원출력 직접 추출 |
| S10-O01 reservation journal open | CatalogRegression.log:76 실제 assertion | pass | 원출력 직접 추출 |
| S10-O01 first reservation returns four IDs and sequence one | CatalogRegression.log:77 실제 assertion | pass | 원출력 직접 추출 |
| S10-O01 versioned reservation payload replays | CatalogRegression.log:78 실제 assertion | pass | 원출력 직접 추출 |
| S10-O01 new reservation records actual occurred time | CatalogRegression.log:79 실제 assertion | pass | 원출력 직접 추출 |
| S10-O02 identical retry preserves sequence and bytes | CatalogRegression.log:80 실제 assertion | pass | 원출력 직접 추출 |
| S10-O03 reopened instance allocates next sequence | CatalogRegression.log:81 실제 assertion | pass | 원출력 직접 추출 |
| S10-O03 new process resumes durable sequence | CatalogRegression.log:82 실제 assertion | pass | 원출력 직접 추출 |
| S10-O04 different store rejected | CatalogRegression.log:83 실제 assertion | pass | 원출력 직접 추출 |
| S10-O04 reused request with different segment rejected | CatalogRegression.log:84 실제 assertion | pass | 원출력 직접 추출 |
| S10-O04 reused request with different channel rejected | CatalogRegression.log:85 실제 assertion | pass | 원출력 직접 추출 |
| S10-O04 reused segment with different request rejected | CatalogRegression.log:86 실제 assertion | pass | 원출력 직접 추출 |
| S10-O04 conflicts preserve original bytes | CatalogRegression.log:87 실제 assertion | pass | 원출력 직접 추출 |
| S10-O05/O06 reject and preserve corrupt | CatalogRegression.log:88 실제 assertion | pass | 원출력 직접 추출 |
| S10-O05/O06 reject and preserve unsupported-schema | CatalogRegression.log:89 실제 assertion | pass | 원출력 직접 추출 |
| S10-O05/O06 reject and preserve unsupported-type | CatalogRegression.log:90 실제 assertion | pass | 원출력 직접 추출 |
| S10-O05/O06 reject and preserve tail | CatalogRegression.log:91 실제 assertion | pass | 원출력 직접 추출 |
| S10-O05/O06 reject and preserve payload-zero | CatalogRegression.log:92 실제 assertion | pass | 원출력 직접 추출 |
| S10-O05/O06 reject and preserve payload-negative | CatalogRegression.log:93 실제 assertion | pass | 원출력 직접 추출 |
| S10-O05/O06 reject and preserve payload-fraction | CatalogRegression.log:94 실제 assertion | pass | 원출력 직접 추출 |
| S10-O05/O06 reject and preserve payload-overflow | CatalogRegression.log:95 실제 assertion | pass | 원출력 직접 추출 |
| S10-O05/O06 reject and preserve duplicate-sequence | CatalogRegression.log:96 실제 assertion | pass | 원출력 직접 추출 |
| S10-O05/O06 reject and preserve decreasing-sequence | CatalogRegression.log:97 실제 assertion | pass | 원출력 직접 추출 |
| S10-O05/O06 reject and preserve duplicate-request | CatalogRegression.log:98 실제 assertion | pass | 원출력 직접 추출 |
| S10-O05/O06 reject and preserve duplicate-segment | CatalogRegression.log:99 실제 assertion | pass | 원출력 직접 추출 |
| S10-O05/O06 reject and preserve store-conflict | CatalogRegression.log:100 실제 assertion | pass | 원출력 직접 추출 |
| S10-O05/O06 reject and preserve ordinary-before | CatalogRegression.log:101 실제 assertion | pass | 원출력 직접 추출 |
| S10-O05/O06 reject and preserve ordinary-after | CatalogRegression.log:102 실제 assertion | pass | 원출력 직접 추출 |
| S10-O05/O06 reject and preserve line-cap | CatalogRegression.log:103 실제 assertion | pass | 원출력 직접 추출 |
| S10-O05 reservation entity envelope binding rejects mismatch | CatalogRegression.log:104 실제 assertion | pass | 원출력 직접 추출 |
| S10-O05 reservation request envelope binding rejects mismatch | CatalogRegression.log:105 실제 assertion | pass | 원출력 직접 추출 |
| S10-O01 strict reservation parser accepts versioned literal | CatalogRegression.log:106 실제 assertion | pass | 원출력 직접 추출 |
| S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | CatalogRegression.log:107 실제 assertion | pass | 원출력 직접 추출 |
| S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | CatalogRegression.log:108 실제 assertion | pass | 원출력 직접 추출 |
| S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | CatalogRegression.log:109 실제 assertion | pass | 원출력 직접 추출 |
| S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | CatalogRegression.log:110 실제 assertion | pass | 원출력 직접 추출 |
| S10-O06 INT64_MAX identical retry remains valid | CatalogRegression.log:111 실제 assertion | pass | 원출력 직접 추출 |
| S10-O06 sequence overflow rejected without write | CatalogRegression.log:112 실제 assertion | pass | 원출력 직접 추출 |
| S10-O02 identical durable reservation duplicates remain idempotent | CatalogRegression.log:113 실제 assertion | pass | 원출력 직접 추출 |
| S10-O06 sequence gaps remain valid and allocate above maximum | CatalogRegression.log:114 실제 assertion | pass | 원출력 직접 추출 |
| S10-O07 four simultaneous processes finish reservations | CatalogRegression.log:115 실제 assertion | pass | 원출력 직접 추출 |
| S10-O07 concurrent sequences are unique and complete | CatalogRegression.log:116 실제 assertion | pass | 원출력 직접 추출 |
| S10-O07 next sequence follows concurrent reservations | CatalogRegression.log:117 실제 assertion | pass | 원출력 직접 추출 |
| S10-O08 ordinary Append cannot reserve orders | CatalogRegression.log:118 실제 assertion | pass | 원출력 직접 추출 |
| S10-O08 unopened journal rejected | CatalogRegression.log:119 실제 assertion | pass | 원출력 직접 추출 |
| S10-O08 null result rejected | CatalogRegression.log:120 실제 assertion | pass | 원출력 직접 추출 |
| S10-O08 invalid opaque ID rejected | CatalogRegression.log:121 실제 assertion | pass | 원출력 직접 추출 |
| S10-O08 failed reservation does not expose tentative result | CatalogRegression.log:122 실제 assertion | pass | 원출력 직접 추출 |
| S10-O09 unsafe file binding rejected and original preserved inode | CatalogRegression.log:123 실제 assertion | pass | 원출력 직접 추출 |
| S10-O09 unsafe file binding rejected and original preserved parent | CatalogRegression.log:124 실제 assertion | pass | 원출력 직접 추출 |
| S10-O09 unsafe file binding rejected and original preserved symlink | CatalogRegression.log:125 실제 assertion | pass | 원출력 직접 추출 |
| S10-O09 unsafe file binding rejected and original preserved hardlink | CatalogRegression.log:126 실제 assertion | pass | 원출력 직접 추출 |
| S10-O10 reservation and normal segment coexist in catalog | CatalogRegression.log:127 실제 assertion | pass | 원출력 직접 추출 |
| S10-O04 reserve then finalize permits identical retry | CatalogRegression.log:128 실제 assertion | pass | 원출력 직접 추출 |
| S10-O10 reservation survives catalog rebuild without changing segment query | CatalogRegression.log:129 실제 assertion | pass | 원출력 직접 추출 |
| S10-O04 legacy segment cannot acquire retroactive reservation | CatalogRegression.log:130 실제 assertion | pass | 원출력 직접 추출 |
| S10-M06 opened catalog accepts fresh exact reservation V2 finalize | CatalogRegression.log:131 실제 assertion | pass | 원출력 직접 추출 |
| S10-M07 V2 find preserves complete metadata | CatalogRegression.log:132 실제 assertion | pass | 원출력 직접 추출 |
| S10-M07 identical V2 recovery is idempotent | CatalogRegression.log:133 실제 assertion | pass | 원출력 직접 추출 |
| S10-M07 V2 is absent from V1 range query | CatalogRegression.log:134 실제 assertion | pass | 원출력 직접 추출 |
| S10-M07 V2 registered path is not orphan | CatalogRegression.log:135 실제 assertion | pass | 원출력 직접 추출 |
| S10-M07 SQLite exact V2 JSON and path match | CatalogRegression.log:136 실제 assertion | pass | 원출력 직접 추출 |
| S10-M07 JSONL restart preserves V2 exact payload | CatalogRegression.log:137 실제 assertion | pass | 원출력 직접 추출 |
| S10-M06 wrong reservation tuple rejected store | CatalogRegression.log:138 실제 assertion | pass | 원출력 직접 추출 |
| S10-M06 wrong reservation tuple rejected request | CatalogRegression.log:139 실제 assertion | pass | 원출력 직접 추출 |
| S10-M06 wrong reservation tuple rejected segment | CatalogRegression.log:140 실제 assertion | pass | 원출력 직접 추출 |
| S10-M06 wrong reservation tuple rejected channel | CatalogRegression.log:141 실제 assertion | pass | 원출력 직접 추출 |
| S10-M06 wrong reservation tuple rejected sequence | CatalogRegression.log:142 실제 assertion | pass | 원출력 직접 추출 |
| S10-M09 immutable V2 mapping mismatch rejected | CatalogRegression.log:143 실제 assertion | pass | 원출력 직접 추출 |
| S10-M09 bad V2 startup retry preserves original state bad-payload | CatalogRegression.log:144 실제 assertion | pass | 원출력 직접 추출 |
| S10-M09 bad V2 startup retry preserves original state missing-order | CatalogRegression.log:145 실제 assertion | pass | 원출력 직접 추출 |
| S10-M09 bad V2 startup retry preserves original state bad-order | CatalogRegression.log:146 실제 assertion | pass | 원출력 직접 추출 |
| S10-M09 bad V2 startup retry preserves original state conflicting-order | CatalogRegression.log:147 실제 assertion | pass | 원출력 직접 추출 |
| S10-M09 bad V2 startup retry preserves original state tail | CatalogRegression.log:148 실제 assertion | pass | 원출력 직접 추출 |
| S10-M09 bad V2 startup retry preserves original state corrupt | CatalogRegression.log:149 실제 assertion | pass | 원출력 직접 추출 |
| S10-M09 bad V2 startup retry preserves original state unsafe-path | CatalogRegression.log:150 실제 assertion | pass | 원출력 직접 추출 |
| S10-M09 default off rejects V2 before SQLite changes | CatalogRegression.log:151 실제 assertion | pass | 원출력 직접 추출 |
| S10-M09 V2 replay namespace and deletion duplicate | CatalogRegression.log:152 실제 assertion | pass | 원출력 직접 추출 |
| S10-M09 V2 replay namespace and deletion deleted | CatalogRegression.log:153 실제 assertion | pass | 원출력 직접 추출 |
| S10-M09 V2 replay namespace and deletion v1-before | CatalogRegression.log:154 실제 assertion | pass | 원출력 직접 추출 |
| S10-M09 V2 replay namespace and deletion v1-after | CatalogRegression.log:155 실제 assertion | pass | 원출력 직접 추출 |
| S10-M09 V2 replay namespace and deletion deleted-before | CatalogRegression.log:156 실제 assertion | pass | 원출력 직접 추출 |
| S10-M09 V2 replay namespace and deletion resurrection | CatalogRegression.log:157 실제 assertion | pass | 원출력 직접 추출 |
| S10-M09 V2 replay namespace and deletion mutation-collision | CatalogRegression.log:158 실제 assertion | pass | 원출력 직접 추출 |
| S10-M09 V2 finalize rejects missing media | CatalogRegression.log:159 실제 assertion | pass | 원출력 직접 추출 |
| S10-M09 V2 finalize rejects directory media | CatalogRegression.log:160 실제 assertion | pass | 원출력 직접 추출 |
| S10-M09 fresh candidate rejects mapping | CatalogRegression.log:161 실제 assertion | pass | 원출력 직접 추출 |
| S10-M09 fresh candidate rejects path | CatalogRegression.log:162 실제 assertion | pass | 원출력 직접 추출 |
| S10-M09 fresh candidate rejects tombstone | CatalogRegression.log:163 실제 assertion | pass | 원출력 직접 추출 |
| S10-SW01 managed empty root opens with lifetime lease | CatalogRegression.log:164 실제 assertion | pass | 원출력 직접 추출 |
| S10-SW02 same process second managed owner denied | CatalogRegression.log:165 실제 assertion | pass | 원출력 직접 추출 |
| S10-SW03 different process owner and inherited use denied | CatalogRegression.log:166 실제 assertion | pass | 원출력 직접 추출 |
| S10-SW12 managed duplicate descriptors are close-on-exec | CatalogRegression.log:167 실제 assertion | pass | 원출력 직접 추출 |
| S10-SW05 managed reserve append replay use owned descriptor | CatalogRegression.log:168 실제 assertion | pass | 원출력 직접 추출 |
| S10-SW06 raw managed access and legacy default path denied | CatalogRegression.log:169 실제 assertion | pass | 원출력 직접 추출 |
| S10-SW01 managed Reserve rejects different store identity | CatalogRegression.log:170 실제 assertion | pass | 원출력 직접 추출 |
| S10-SW10 catalog connection can inspect managed lease | CatalogRegression.log:171 실제 assertion | pass | 원출력 직접 추출 |
| S10-SW04 owner destruction releases lease | CatalogRegression.log:172 실제 assertion | pass | 원출력 직접 추출 |
| S10-SW01 managed reopen rejects different store identity | CatalogRegression.log:173 실제 assertion | pass | 원출력 직접 추출 |
| S10-SW11 managed incomplete tail rejects append without changing bytes | CatalogRegression.log:174 실제 assertion | pass | 원출력 직접 추출 |
| S10-SW07 legacy nonempty root preserved without conversion | CatalogRegression.log:175 실제 assertion | pass | 원출력 직접 추출 |
| S10-SW08 partial initialization retry validates exact state lease | CatalogRegression.log:176 실제 assertion | pass | 원출력 직접 추출 |
| S10-SW08 partial initialization retry validates exact state init | CatalogRegression.log:177 실제 assertion | pass | 원출력 직접 추출 |
| S10-SW08 partial initialization retry validates exact state barrier | CatalogRegression.log:178 실제 assertion | pass | 원출력 직접 추출 |
| S10-SW08 partial initialization retry validates exact state journal | CatalogRegression.log:179 실제 assertion | pass | 원출력 직접 추출 |
| S10-SW08 partial initialization retry validates exact state incomplete | CatalogRegression.log:180 실제 assertion | pass | 원출력 직접 추출 |
| S10-SW08 partial initialization retry validates exact state unknown | CatalogRegression.log:181 실제 assertion | pass | 원출력 직접 추출 |
| S10-SW09 symlink inode and malformed marker rejected journal | CatalogRegression.log:182 실제 assertion | pass | 원출력 직접 추출 |
| S10-SW09 symlink inode and malformed marker rejected marker | CatalogRegression.log:183 실제 assertion | pass | 원출력 직접 추출 |
| S10-SW09 symlink inode and malformed marker rejected barrier | CatalogRegression.log:184 실제 assertion | pass | 원출력 직접 추출 |
| S10-SW09 symlink inode and malformed marker rejected root-symlink | CatalogRegression.log:185 실제 assertion | pass | 원출력 직접 추출 |
| S10-SB01 second managed catalog is denied | CatalogRegression.log:186 실제 assertion | pass | 원출력 직접 추출 |
| S10-SB02 failed catalog cannot mutate journal or holds | CatalogRegression.log:187 실제 assertion | pass | 원출력 직접 추출 |
| S10-SB03 attached catalog blocks unowned append but permits reservation | CatalogRegression.log:188 실제 assertion | pass | 원출력 직접 추출 |
| S10-SB04 catalog destruction releases attachment | CatalogRegression.log:189 실제 assertion | pass | 원출력 직접 추출 |
| S10-SB05 managed catalog rejects unsafe options outside | CatalogRegression.log:190 실제 assertion | pass | 원출력 직접 추출 |
| S10-SB05 managed catalog rejects unsafe options dotdot | CatalogRegression.log:191 실제 assertion | pass | 원출력 직접 추출 |
| S10-SB05 managed catalog rejects unsafe options media-symlink | CatalogRegression.log:192 실제 assertion | pass | 원출력 직접 추출 |
| S10-SB05 managed catalog rejects unsafe options sqlite-symlink | CatalogRegression.log:193 실제 assertion | pass | 원출력 직접 추출 |
| S10-SB05 managed catalog rejects unsafe options sqlite-hardlink | CatalogRegression.log:194 실제 assertion | pass | 원출력 직접 추출 |
| S10-SB05 managed catalog rejects unsafe options disabled | CatalogRegression.log:195 실제 assertion | pass | 원출력 직접 추출 |
| S10-SB06 failed open releases catalog attachment | CatalogRegression.log:196 실제 assertion | pass | 원출력 직접 추출 |
| S10-SB07 managed SQLite sidecar rejected -wal symlink | CatalogRegression.log:197 실제 assertion | pass | 원출력 직접 추출 |
| S10-SB07 managed SQLite sidecar rejected -wal hardlink | CatalogRegression.log:198 실제 assertion | pass | 원출력 직접 추출 |
| S10-SB07 managed SQLite sidecar rejected -shm symlink | CatalogRegression.log:199 실제 assertion | pass | 원출력 직접 추출 |
| S10-SB07 managed SQLite sidecar rejected -shm hardlink | CatalogRegression.log:200 실제 assertion | pass | 원출력 직접 추출 |
| S10-SB07 managed SQLite sidecar rejected -journal symlink | CatalogRegression.log:201 실제 assertion | pass | 원출력 직접 추출 |
| S10-SB07 managed SQLite sidecar rejected -journal hardlink | CatalogRegression.log:202 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC01 managed repeated event fixture is valid | CatalogRegression.log:203 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC02 managed reservations avoid history reads | CatalogRegression.log:204 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC03 managed V2 finalize avoids full replay | CatalogRegression.log:205 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC04 checkpoint reduces superseded event payload bytes | CatalogRegression.log:206 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC05 checkpoint preserves latest event and all record identities | CatalogRegression.log:207 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC06 checkpoint is idempotent and preserves V2 | CatalogRegression.log:208 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC08 receipt preserves retry identity and rejects direct append | CatalogRegression.log:209 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC09 checkpoint restart preserves SQLite and JSONL state sqlite | CatalogRegression.log:210 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC09 managed checkpoint SQL V2 payload and path | CatalogRegression.log:211 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC09 checkpoint restart preserves SQLite and JSONL state jsonl | CatalogRegression.log:212 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC10 checkpoint prefix recovers before writes | CatalogRegression.log:213 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC11 checkpoint mismatch preserves bytes and poisons owner | CatalogRegression.log:214 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC12 first accepted mutation controls latest event | CatalogRegression.log:215 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC16 automatic checkpoint uses accumulated growth | CatalogRegression.log:216 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC07 raw checkpoint is rejected | CatalogRegression.log:217 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC18 checkpoint syscall failure poisons and reopens write | CatalogRegression.log:218 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC21 poison rejects hold mutation write | CatalogRegression.log:219 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC18 checkpoint syscall failure poisons and reopens file-fsync | CatalogRegression.log:220 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC21 poison rejects hold mutation file-fsync | CatalogRegression.log:221 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC18 checkpoint syscall failure poisons and reopens rename | CatalogRegression.log:222 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC21 poison rejects hold mutation rename | CatalogRegression.log:223 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC18 checkpoint syscall failure poisons and reopens dir-fsync | CatalogRegression.log:224 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC21 poison rejects hold mutation dir-fsync | CatalogRegression.log:225 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC17 checkpoint preserves holds observations and deletion | CatalogRegression.log:226 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC17 checkpoint SQL hold observation tombstone | CatalogRegression.log:227 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC17 checkpoint preserves holds observations and deletion restart sqlite | CatalogRegression.log:228 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC17 checkpoint SQL restart observation tombstone | CatalogRegression.log:229 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC17 checkpoint preserves holds observations and deletion restart jsonl | CatalogRegression.log:230 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC19 invalid managed history remains unchanged malformed | CatalogRegression.log:231 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC19 invalid managed history remains unchanged unsupported | CatalogRegression.log:232 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC19 invalid managed history remains unchanged conflict | CatalogRegression.log:233 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC20 raw catalog rejects receipt before side effects | CatalogRegression.log:234 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC13 crypto off raw remains usable | CatalogRegression.log:236 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC14 crypto off checkpoint is rejected | CatalogRegression.log:237 실제 assertion | pass | 원출력 직접 추출 |
| S10-SC15 crypto off receipt reopen is rejected | CatalogRegression.log:238 실제 assertion | pass | 원출력 직접 추출 |
| source 저장 callback reconcile 연결 | CatalogRegression.log:239 실제 assertion | pass | 원출력 직접 추출 |
| policy revision idempotency | CatalogRegression.log:240 실제 assertion | pass | 원출력 직접 추출 |
| 5초 safety reconcile | CatalogRegression.log:241 실제 assertion | pass | 원출력 직접 추출 |
| composition root journal 선행 open | CatalogRegression.log:242 실제 assertion | pass | 원출력 직접 추출 |
| composition root catalog rebuild/open | CatalogRegression.log:243 실제 assertion | pass | 원출력 직접 추출 |
| 서버 전 supervisor 시작 | CatalogRegression.log:244 실제 assertion | pass | 원출력 직접 추출 |
| ingress 전 event bridge 등록 | CatalogRegression.log:245 실제 assertion | pass | 원출력 직접 추출 |
| ingress 종료 뒤 recorder finalize | CatalogRegression.log:246 실제 assertion | pass | 원출력 직접 추출 |
| composition root 시작/종료 순서 | CatalogRegression.log:247 실제 assertion | pass | 원출력 직접 추출 |

### RetentionRegression.log

명령 exit 0, 24 pass / 0 fail. [원출력](RetentionRegression.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| B01 V2 tombstone preserves immutable segment without legacy UTC range | RetentionRegression.log:1 실제 assertion | pass | 원출력 직접 추출 |
| B02 V2 state records reject malformed payload entity and duplicate conflicts | RetentionRegression.log:2 실제 assertion | pass | 원출력 직접 추출 |
| B03 V2 pending corrupt and deleted overlays never mutate finalized payload | RetentionRegression.log:3 실제 assertion | pass | 원출력 직접 추출 |
| B04 V2 invalid transitions and finalize retries cannot resurrect state | RetentionRegression.log:4 실제 assertion | pass | 원출력 직접 추출 |
| B05 V2 checkpoint and restart preserve overlay tombstone and SQLite parity | RetentionRegression.log:5 실제 assertion | pass | 원출력 직접 추출 |
| B06 V2 capacity deletion follows durable order despite reversed UTC | RetentionRegression.log:6 실제 assertion | pass | 원출력 직접 추출 |
| B07 mixed legacy and multiple stores use deterministic nonchronological ordering | RetentionRegression.log:7 실제 assertion | pass | 원출력 직접 추출 |
| B08 V2 age expiry uses all known mapping ends plus uncertainty rounded upward | RetentionRegression.log:8 실제 assertion | pass | 원출력 직접 추출 |
| B09 V2 unknown or overflowing age remains capacity eligible | RetentionRegression.log:9 실제 assertion | pass | 원출력 직접 추출 |
| B10 V2 class quotas and disk reserve remain separated | RetentionRegression.log:10 실제 assertion | pass | 원출력 직접 추출 |
| B11 V2 pin and hold protect deletion and corruption | RetentionRegression.log:11 실제 assertion | pass | 원출력 직접 추출 |
| B12 V2 pending and corrupt bytes remain charged but are not automatic victims | RetentionRegression.log:12 실제 assertion | pass | 원출력 직접 추출 |
| B13 V2 apply persists pending before unlink and tombstone after unlink | RetentionRegression.log:13 실제 assertion | pass | 원출력 직접 추출 |
| B14 V2 interrupted deletion recovers without resurrection | RetentionRegression.log:14 실제 assertion | pass | 원출력 직접 추출 |
| B15 V2 corrupt cleanup requires explicit manual reason | RetentionRegression.log:15 실제 assertion | pass | 원출력 직접 추출 |
| B16 V2 continuous media with unknown UTC resolves a healthy held fd | RetentionRegression.log:16 실제 assertion | pass | 원출력 직접 추출 |
| B17 V2 wrong channel event and fallback collision cannot expose media | RetentionRegression.log:17 실제 assertion | pass | 원출력 직접 추출 |
| B18 V2 missing symlink and multiple hardlink media reject without hold leak | RetentionRegression.log:18 실제 assertion | pass | 원출력 직접 추출 |
| B19 V2 same size corruption and invalid container reject without hold leak | RetentionRegression.log:19 실제 assertion | pass | 원출력 직접 추출 |
| B20 V2 deletion and playback hold races have one safe winner | RetentionRegression.log:20 실제 assertion | pass | 원출력 직접 추출 |
| B21 borrowed fd inspection preserves caller ownership and detects file changes | RetentionRegression.log:21 실제 assertion | pass | 원출력 직접 추출 |
| B23 legacy store port refuses unsupported V2 deletion | RetentionRegression.log:22 실제 assertion | pass | 원출력 직접 추출 |
| B22 V2 playback is unavailable without GStreamer | RetentionRegression.log:24 실제 assertion | pass | 원출력 직접 추출 |
| B23 legacy store port refuses unsupported V2 deletion | RetentionRegression.log:25 실제 assertion | pass | 원출력 직접 추출 |

## Historical 실행 및 실패 이력

현재 완료 증거가 아닌 개발 중 당시 범위의 원출력이다. 최초 실패와 그 전에 실행한 PASS도 모두 보존한다.

### AdapterHookBehavior.log

실제 exit 0, 개별 assertion 19개. [원출력](AdapterHookBehavior.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| E02 단일 출력도 clip_path 승격 없이 목록·직접 decode·fully satisfied | AdapterHookBehavior.log:5 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E09 동일 reference/선택 재요청 job ID 멱등 | AdapterHookBehavior.log:6 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E03 미확인 pre 구간을 유지한 verified partial 출력 | AdapterHookBehavior.log:7 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E07 immutable start/end/pre/post/namespace 보존 | AdapterHookBehavior.log:8 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E10 Event 출력이 누적되어도 원본 snapshot은 continuous만 | AdapterHookBehavior.log:9 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E04 provider의 동일 실제 decoder 증거 업데이트로 postroll 요청 충족 | AdapterHookBehavior.log:10 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E05 시간 경과만으로 coverage 없이 unknown 종료 | AdapterHookBehavior.log:11 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06 provider namespace 변경을 새 증거로 혼합하지 않음 | AdapterHookBehavior.log:12 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 누적 261개 원본에서도 현재 반개구간 관련 1개만 조회 | AdapterHookBehavior.log:13 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 반개구간 끝 접점은 이전 원본과 비중첩 | AdapterHookBehavior.log:14 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 관련 missing binding은 누락하지 않고 snapshot에 보존 | AdapterHookBehavior.log:15 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 관련 corrupt lifecycle은 동일 snapshot에 보존 | AdapterHookBehavior.log:16 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 실제 관련 257개는 명시 cap 실패·잘린 confirmed 목록 없음 | AdapterHookBehavior.log:17 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E01 실제 H264 decoder→EventRecord→reference→내구 job·2출력 Complete | AdapterHookBehavior.log:18 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 무주입 bridge 재생성에도 내구 managed 소유권 유지 | AdapterHookBehavior.log:20 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E13 Stop 이후 신규 reference 저장 없음 | AdapterHookBehavior.log:21 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 비권위 원장 조회 실패는 legacy 억제 unknown | AdapterHookBehavior.log:22 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 실제 EventStorage managed clip 억제 및 snapshot hook 유지 | AdapterHookBehavior.log:24 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 실제 EventStorage 기본 clip fallback 유지 및 snapshot hook 유지 | AdapterHookBehavior.log:27 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |

### ClosingBehavior.log

실제 exit 2, 개별 assertion 30개. [원출력](ClosingBehavior.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| E02 단일 출력도 clip_path 승격 없이 목록·직접 decode·fully satisfied | ClosingBehavior.log:5 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E09 동일 reference/선택 재요청 job ID 멱등 | ClosingBehavior.log:6 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E03 미확인 pre 구간을 유지한 verified partial 출력 | ClosingBehavior.log:7 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E07 immutable start/end/pre/post/namespace 보존 | ClosingBehavior.log:8 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E10 Event 출력이 누적되어도 원본 snapshot은 continuous만 | ClosingBehavior.log:9 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E04 provider의 동일 실제 decoder 증거 업데이트로 postroll 요청 충족 | ClosingBehavior.log:10 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E05 시간 경과만으로 coverage 없이 unknown 종료 | ClosingBehavior.log:11 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06 provider namespace 변경을 새 증거로 혼합하지 않음 | ClosingBehavior.log:12 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E09 같은 immutable reference의 증거/선택 갱신은 새 job·이전 partial 보존 | ClosingBehavior.log:13 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 4097 frame 증거는 queue 접수 전 명시 거부 | ClosingBehavior.log:14 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06/E18 provider generation 변경는 unknown 종료 | ClosingBehavior.log:15 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06/E18 provider source 불일치는 unknown 종료 | ClosingBehavior.log:16 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06/E18 provider 예외는 unknown 종료 | ClosingBehavior.log:17 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E12 event quota 부족은 Intent/파일/내구 예약 없이 명시 거부 | ClosingBehavior.log:18 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 누적 261개 원본에서도 현재 반개구간 관련 1개만 조회 | ClosingBehavior.log:19 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 반개구간 끝 접점은 이전 원본과 비중첩 | ClosingBehavior.log:20 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 관련 missing binding은 누락하지 않고 snapshot에 보존 | ClosingBehavior.log:21 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 관련 corrupt lifecycle은 동일 snapshot에 보존 | ClosingBehavior.log:22 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 실제 관련 257개는 명시 cap 실패·잘린 confirmed 목록 없음 | ClosingBehavior.log:23 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E04 실제 writer 후행 finalize와 같은 요청 증거 갱신으로 2출력 완료 | ClosingBehavior.log:24 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 canonical accepted 중복은 원장 mutation 추가 없이 멱등 | ClosingBehavior.log:26 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 동일 reference ID 다른 immutable 내용의 accepted 거부 | ClosingBehavior.log:27 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 SQLite accepted projection의 exact reference 일치 | ClosingBehavior.log:28 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 accepted marker checkpoint projection 일치 | ClosingBehavior.log:29 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E15/E20 재시작 JSONL fallback accepted/no-job은 증거 발명 없이 managed unknown | ClosingBehavior.log:30 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E15/E20 재시작 SQLite rebuild accepted/no-job은 증거 발명 없이 managed unknown | ClosingBehavior.log:31 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted 선행 참조 없음 거부 | ClosingBehavior.log:32 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted unknown 필드 거부 | ClosingBehavior.log:33 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted canonical 충돌 거부 | ClosingBehavior.log:34 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted 불완전 payload 거부 | ClosingBehavior.log:35 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |

명령 전체는 fixture V1/V2 source 위치 accessor 준비 오류로 중단되었으며 위 선행 PASS만으로 suite PASS가 아니다.

### ClosingBehaviorRetry.log

실제 exit 1, 개별 assertion 40개. [원출력](ClosingBehaviorRetry.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| E02 단일 출력도 clip_path 승격 없이 목록·직접 decode·fully satisfied | ClosingBehaviorRetry.log:5 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E09 동일 reference/선택 재요청 job ID 멱등 | ClosingBehaviorRetry.log:6 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E03 미확인 pre 구간을 유지한 verified partial 출력 | ClosingBehaviorRetry.log:7 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E07 immutable start/end/pre/post/namespace 보존 | ClosingBehaviorRetry.log:8 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E10 Event 출력이 누적되어도 원본 snapshot은 continuous만 | ClosingBehaviorRetry.log:9 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E04 provider의 동일 실제 decoder 증거 업데이트로 postroll 요청 충족 | ClosingBehaviorRetry.log:10 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E05 시간 경과만으로 coverage 없이 unknown 종료 | ClosingBehaviorRetry.log:11 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06 provider namespace 변경을 새 증거로 혼합하지 않음 | ClosingBehaviorRetry.log:12 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E09 같은 immutable reference의 증거/선택 갱신은 새 job·이전 partial 보존 | ClosingBehaviorRetry.log:13 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 4097 frame 증거는 queue 접수 전 명시 거부 | ClosingBehaviorRetry.log:14 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06/E18 provider generation 변경는 unknown 종료 | ClosingBehaviorRetry.log:15 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06/E18 provider source 불일치는 unknown 종료 | ClosingBehaviorRetry.log:16 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06/E18 provider 예외는 unknown 종료 | ClosingBehaviorRetry.log:17 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E12 event quota 부족은 Intent/파일/내구 예약 없이 명시 거부 | ClosingBehaviorRetry.log:18 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 누적 261개 원본에서도 현재 반개구간 관련 1개만 조회 | ClosingBehaviorRetry.log:19 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 반개구간 끝 접점은 이전 원본과 비중첩 | ClosingBehaviorRetry.log:20 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 관련 missing binding은 누락하지 않고 snapshot에 보존 | ClosingBehaviorRetry.log:21 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 관련 corrupt lifecycle은 동일 snapshot에 보존 | ClosingBehaviorRetry.log:22 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 실제 관련 257개는 명시 cap 실패·잘린 confirmed 목록 없음 | ClosingBehaviorRetry.log:23 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E04 실제 writer 후행 finalize와 같은 요청 증거 갱신으로 2출력 완료 | ClosingBehaviorRetry.log:24 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 canonical accepted 중복은 원장 mutation 추가 없이 멱등 | ClosingBehaviorRetry.log:26 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 동일 reference ID 다른 immutable 내용의 accepted 거부 | ClosingBehaviorRetry.log:27 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 SQLite accepted projection의 exact reference 일치 | ClosingBehaviorRetry.log:28 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 accepted marker checkpoint projection 일치 | ClosingBehaviorRetry.log:29 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E15/E20 재시작 JSONL fallback accepted/no-job은 증거 발명 없이 managed unknown | ClosingBehaviorRetry.log:30 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E15/E20 재시작 SQLite rebuild accepted/no-job은 증거 발명 없이 managed unknown | ClosingBehaviorRetry.log:31 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted 선행 참조 없음 거부 | ClosingBehaviorRetry.log:32 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted unknown 필드 거부 | ClosingBehaviorRetry.log:33 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted canonical 충돌 거부 | ClosingBehaviorRetry.log:34 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted 불완전 payload 거부 | ClosingBehaviorRetry.log:35 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E08 동일 원본 snapshot의 명시 UTC 요청→실제 출력·독립 output UTC unknown | ClosingBehaviorRetry.log:37 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E08 같은 UTC의 복수 원본 후보를 자동 단일 선택하지 않음 | ClosingBehaviorRetry.log:38 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 UTC confirmed mapping 하나가 보여도 관련 corrupt 원본을 숨기지 않음 | ClosingBehaviorRetry.log:39 실제 assertion | fail | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E08 UTC unplaced를 원본 snapshot/선택에 보존 | ClosingBehaviorRetry.log:40 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 opt-in UTC 후보 예산 초과는 부분 confirmed 결과 없이 실패 | ClosingBehaviorRetry.log:41 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 삭제 대기 lifecycle도 원본 snapshot에서 누락하지 않음 | ClosingBehaviorRetry.log:42 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E01 실제 H264 decoder→EventRecord→reference→내구 job·2출력 Complete | ClosingBehaviorRetry.log:43 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 무주입 bridge 재생성에도 내구 managed 소유권 유지 | ClosingBehaviorRetry.log:45 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E13 Stop 이후 신규 reference 저장 없음 | ClosingBehaviorRetry.log:46 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 비권위 원장 조회 실패는 legacy 억제 unknown | ClosingBehaviorRetry.log:47 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |

### ConnectionRegression.log

실제 exit 1, 개별 assertion 22개. [원출력](ConnectionRegression.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| C401 관측·참조 원자 저장 | ConnectionRegression.log:1 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C402 쌍 identity 불일치 거부 | ConnectionRegression.log:2 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C403 동일 원본 재전달·event 병합 | ConnectionRegression.log:3 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C405 SQL·JSONL·checkpoint 쌍 복구 | ConnectionRegression.log:4 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C404 다른 원본 동일PTS 구분 | ConnectionRegression.log:5 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C406 실제 OnResult 원본 참조 저장 | ConnectionRegression.log:6 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C407 OnEvent 강제 표본 | ConnectionRegression.log:7 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C408 종료track 과거참조 보존 | ConnectionRegression.log:8 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C409 종료track 참조부재 unknown | ConnectionRegression.log:9 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C410 sampling·queue·StopAndDrain 회귀 | ConnectionRegression.log:10 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C411 exact·미색인 복수 후보 보존 | ConnectionRegression.log:11 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C412 nearest/ambiguous/unavailable 미승격 | ConnectionRegression.log:12 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C413 UTC unknown·삭제 상태 재판정 | ConnectionRegression.log:13 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C414 실제 TryResolve 요청참조 저장 | ConnectionRegression.log:14 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C415 event 재전달·확장·세대 구분 | ConnectionRegression.log:15 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C416 source/channel 충돌 거부 | ConnectionRegression.log:16 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C417 같은 원본 미디어 교집합 우선 | ConnectionRegression.log:17 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C418 공개 결과·구형 fallback 불변 | ConnectionRegression.log:18 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C422 실제 bridge 초기 pre-roll 수락·pending 유지 | ConnectionRegression.log:19 실제 assertion | fail | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C423 초기 요청 멱등·갱신·generation 분리 | ConnectionRegression.log:20 실제 assertion | fail | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C424 초기 요청 SQL·JSONL 복구 | ConnectionRegression.log:21 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C425 초기 요청 checkpoint 복구 | ConnectionRegression.log:22 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |

### ConnectionRegressionRetry.log

실제 exit 0, 개별 assertion 22개. [원출력](ConnectionRegressionRetry.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| C401 관측·참조 원자 저장 | ConnectionRegressionRetry.log:1 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C402 쌍 identity 불일치 거부 | ConnectionRegressionRetry.log:2 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C403 동일 원본 재전달·event 병합 | ConnectionRegressionRetry.log:3 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C405 SQL·JSONL·checkpoint 쌍 복구 | ConnectionRegressionRetry.log:4 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C404 다른 원본 동일PTS 구분 | ConnectionRegressionRetry.log:5 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C406 실제 OnResult 원본 참조 저장 | ConnectionRegressionRetry.log:6 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C407 OnEvent 강제 표본 | ConnectionRegressionRetry.log:7 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C408 종료track 과거참조 보존 | ConnectionRegressionRetry.log:8 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C409 종료track 참조부재 unknown | ConnectionRegressionRetry.log:9 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C410 sampling·queue·StopAndDrain 회귀 | ConnectionRegressionRetry.log:10 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C411 exact·미색인 복수 후보 보존 | ConnectionRegressionRetry.log:11 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C412 nearest/ambiguous/unavailable 미승격 | ConnectionRegressionRetry.log:12 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C413 UTC unknown·삭제 상태 재판정 | ConnectionRegressionRetry.log:13 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C414 실제 TryResolve 요청참조 저장 | ConnectionRegressionRetry.log:14 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C415 event 재전달·확장·세대 구분 | ConnectionRegressionRetry.log:15 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C416 source/channel 충돌 거부 | ConnectionRegressionRetry.log:16 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C417 같은 원본 미디어 교집합 우선 | ConnectionRegressionRetry.log:17 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C418 공개 결과·구형 fallback 불변 | ConnectionRegressionRetry.log:18 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C422 실제 bridge 초기 pre-roll 수락·pending 유지 | ConnectionRegressionRetry.log:19 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C423 초기 요청 멱등·갱신·generation 분리 | ConnectionRegressionRetry.log:20 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C424 초기 요청 SQL·JSONL 복구 | ConnectionRegressionRetry.log:21 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| C425 초기 요청 checkpoint 복구 | ConnectionRegressionRetry.log:22 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |

### EventBehaviorFirst.log

실제 exit 1, 개별 assertion 0개. [원출력](EventBehaviorFirst.log).

제품 assertion 미실행: archive freshness 선수조건이 실행을 차단했다. 예상 RED가 아니다.

### EventBehaviorRetry.log

실제 exit 0, 개별 assertion 12개. [원출력](EventBehaviorRetry.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| E02 단일 출력도 clip_path 승격 없이 목록·직접 decode·fully satisfied | EventBehaviorRetry.log:5 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E09 동일 reference/선택 재요청 job ID 멱등 | EventBehaviorRetry.log:6 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E03 미확인 pre 구간을 유지한 verified partial 출력 | EventBehaviorRetry.log:7 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E07 immutable start/end/pre/post/namespace 보존 | EventBehaviorRetry.log:8 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E10 Event 출력이 누적되어도 원본 snapshot은 continuous만 | EventBehaviorRetry.log:9 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E04 provider의 동일 실제 decoder 증거 업데이트로 postroll 요청 충족 | EventBehaviorRetry.log:10 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E05 시간 경과만으로 coverage 없이 unknown 종료 | EventBehaviorRetry.log:11 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06 provider namespace 변경을 새 증거로 혼합하지 않음 | EventBehaviorRetry.log:12 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E01 실제 H264 decoder→EventRecord→reference→내구 job·2출력 Complete | EventBehaviorRetry.log:13 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 무주입 bridge 재생성에도 내구 managed 소유권 유지 | EventBehaviorRetry.log:15 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E13 Stop 이후 신규 reference 저장 없음 | EventBehaviorRetry.log:16 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 비권위 원장 조회 실패는 legacy 억제 unknown | EventBehaviorRetry.log:17 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |

### FinalFocused.log

실제 exit 0, 개별 assertion 53개. [원출력](FinalFocused.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| E17 accepted 후 resolver nullopt는 기존 소유 유지·신규 저장 없음 | FinalFocused.log:4 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 accepted 후 resolver 불일치는 기존 소유 유지·신규 저장 없음 | FinalFocused.log:5 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 accepted 후 resolver 예외는 기존 소유 유지·신규 저장 없음 | FinalFocused.log:6 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 accepted 후 resolver 미주입는 기존 소유 유지·신규 저장 없음 | FinalFocused.log:7 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E02 단일 출력도 clip_path 승격 없이 목록·직접 decode·fully satisfied | FinalFocused.log:9 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E09 동일 reference/선택 재요청 job ID 멱등 | FinalFocused.log:10 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E03 미확인 pre 구간을 유지한 verified partial 출력 | FinalFocused.log:11 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E07 immutable start/end/pre/post/namespace 보존 | FinalFocused.log:12 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E10 Event 출력이 누적되어도 원본 snapshot은 continuous만 | FinalFocused.log:13 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E04 provider의 동일 실제 decoder 증거 업데이트로 postroll 요청 충족 | FinalFocused.log:14 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E05 시간 경과만으로 coverage 없이 unknown 종료 | FinalFocused.log:15 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06 provider namespace 변경을 새 증거로 혼합하지 않음 | FinalFocused.log:16 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E09 같은 immutable reference의 증거/선택 갱신은 새 job·이전 partial 보존 | FinalFocused.log:17 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 4097 frame 증거는 queue 접수 전 명시 거부 | FinalFocused.log:18 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06/E18 provider generation 변경는 unknown 종료 | FinalFocused.log:19 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06/E18 provider source 불일치는 unknown 종료 | FinalFocused.log:20 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06/E18 provider 예외는 unknown 종료 | FinalFocused.log:21 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E12 event quota 부족은 Intent/파일/내구 예약 없이 명시 거부 | FinalFocused.log:22 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 누적 261개 원본에서도 현재 반개구간 관련 1개만 조회 | FinalFocused.log:23 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 반개구간 끝 접점은 이전 원본과 비중첩 | FinalFocused.log:24 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 관련 missing binding은 누락하지 않고 snapshot에 보존 | FinalFocused.log:25 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 관련 corrupt lifecycle은 동일 snapshot에 보존 | FinalFocused.log:26 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 실제 관련 257개는 명시 cap 실패·잘린 confirmed 목록 없음 | FinalFocused.log:27 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E04 실제 writer 후행 finalize와 같은 요청 증거 갱신으로 2출력 완료 | FinalFocused.log:28 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 canonical accepted 중복은 원장 mutation 추가 없이 멱등 | FinalFocused.log:30 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 동일 reference ID 다른 immutable 내용의 accepted 거부 | FinalFocused.log:31 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 SQLite accepted projection의 exact reference 일치 | FinalFocused.log:32 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 accepted marker checkpoint projection 일치 | FinalFocused.log:33 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E15/E20 재시작 JSONL fallback accepted/no-job은 증거 발명 없이 managed unknown | FinalFocused.log:34 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E15/E20 재시작 SQLite rebuild accepted/no-job은 증거 발명 없이 managed unknown | FinalFocused.log:35 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted 선행 참조 없음 거부 | FinalFocused.log:36 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted unknown 필드 거부 | FinalFocused.log:37 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted canonical 충돌 거부 | FinalFocused.log:38 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted 불완전 payload 거부 | FinalFocused.log:39 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E08 동일 원본 snapshot의 명시 UTC 요청→실제 출력·독립 output UTC unknown | FinalFocused.log:41 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E08 같은 UTC의 복수 원본 후보를 자동 단일 선택하지 않음 | FinalFocused.log:42 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 UTC confirmed mapping 하나가 보여도 관련 corrupt 원본을 숨기지 않음 | FinalFocused.log:43 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 실제 UTC worker도 same-lock corrupt 원본을 available로 승격하지 않음 | FinalFocused.log:44 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E08 UTC unplaced를 원본 snapshot/선택에 보존 | FinalFocused.log:45 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 opt-in UTC 후보 예산 초과는 부분 confirmed 결과 없이 실패 | FinalFocused.log:46 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 삭제 대기 lifecycle도 원본 snapshot에서 누락하지 않음 | FinalFocused.log:47 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E01 실제 H264 decoder→EventRecord→reference→내구 job·2출력 Complete | FinalFocused.log:48 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 무주입 bridge 재생성에도 내구 managed 소유권 유지 | FinalFocused.log:50 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E13 Stop 이후 신규 reference 저장 없음 | FinalFocused.log:51 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 비권위 원장 조회 실패는 legacy 억제 unknown | FinalFocused.log:52 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 실제 EventStorage managed clip 억제 및 snapshot hook 유지 | FinalFocused.log:54 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 실제 EventStorage 기본 clip fallback 유지 및 snapshot hook 유지 | FinalFocused.log:57 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E15 별도 프로세스 Ready _exit 후 보호 복원→bridge reconcile→동일 2출력·decode·commit 1개 | FinalFocused.log:63 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E16 historical Complete와 terminal tombstone 현재 unavailable·재생성 없음 | FinalFocused.log:64 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E13 active 포함 queue cap 포화는 새 accepted/예약 없이 거부 | FinalFocused.log:66 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E14 실제 Run 중 동시 Stop 두 번→취소·단일 join·Failed cleanup 후 자원 해제 | FinalFocused.log:67 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 reference job top-8은 wall 역행/재시작에도 동일 ID subset·truncated unknown | FinalFocused.log:70 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E15 startup bounded8 more는 blocker·남은 보호 유지·자동 무한 reconcile 없음 | FinalFocused.log:71 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |

### FirstGreenAttempt.log

실제 exit 0, 개별 assertion 1개. [원출력](FirstGreenAttempt.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| E01 실제 H264 decoder→EventRecord→reference→내구 job·2출력 Complete | FirstGreenAttempt.log:1 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |

### HookBehavior.log

실제 exit 1, 개별 assertion 13개. [원출력](HookBehavior.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| E02 단일 출력도 clip_path 승격 없이 목록·직접 decode·fully satisfied | HookBehavior.log:5 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E09 동일 reference/선택 재요청 job ID 멱등 | HookBehavior.log:6 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E03 미확인 pre 구간을 유지한 verified partial 출력 | HookBehavior.log:7 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E07 immutable start/end/pre/post/namespace 보존 | HookBehavior.log:8 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E10 Event 출력이 누적되어도 원본 snapshot은 continuous만 | HookBehavior.log:9 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E04 provider의 동일 실제 decoder 증거 업데이트로 postroll 요청 충족 | HookBehavior.log:10 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E05 시간 경과만으로 coverage 없이 unknown 종료 | HookBehavior.log:11 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06 provider namespace 변경을 새 증거로 혼합하지 않음 | HookBehavior.log:12 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E01 실제 H264 decoder→EventRecord→reference→내구 job·2출력 Complete | HookBehavior.log:13 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 무주입 bridge 재생성에도 내구 managed 소유권 유지 | HookBehavior.log:15 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E13 Stop 이후 신규 reference 저장 없음 | HookBehavior.log:16 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 비권위 원장 조회 실패는 legacy 억제 unknown | HookBehavior.log:17 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 실제 EventStorage managed clip 억제 및 snapshot hook 유지 | HookBehavior.log:19 실제 assertion | fail | historical; 최종 결과로 과거 실패를 삭제하지 않음 |

### InitialRed.log

실제 exit 1, 개별 assertion 1개. [원출력](InitialRed.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| E01 실제 H264 decoder→EventRecord→reference→내구 job·2출력 Complete | InitialRed.log:1 실제 assertion | fail | historical; 최종 결과로 과거 실패를 삭제하지 않음 |

### LifecycleGreen.log

실제 exit 0, 개별 assertion 49개. [원출력](LifecycleGreen.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| E02 단일 출력도 clip_path 승격 없이 목록·직접 decode·fully satisfied | LifecycleGreen.log:5 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E09 동일 reference/선택 재요청 job ID 멱등 | LifecycleGreen.log:6 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E03 미확인 pre 구간을 유지한 verified partial 출력 | LifecycleGreen.log:7 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E07 immutable start/end/pre/post/namespace 보존 | LifecycleGreen.log:8 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E10 Event 출력이 누적되어도 원본 snapshot은 continuous만 | LifecycleGreen.log:9 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E04 provider의 동일 실제 decoder 증거 업데이트로 postroll 요청 충족 | LifecycleGreen.log:10 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E05 시간 경과만으로 coverage 없이 unknown 종료 | LifecycleGreen.log:11 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06 provider namespace 변경을 새 증거로 혼합하지 않음 | LifecycleGreen.log:12 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E09 같은 immutable reference의 증거/선택 갱신은 새 job·이전 partial 보존 | LifecycleGreen.log:13 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 4097 frame 증거는 queue 접수 전 명시 거부 | LifecycleGreen.log:14 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06/E18 provider generation 변경는 unknown 종료 | LifecycleGreen.log:15 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06/E18 provider source 불일치는 unknown 종료 | LifecycleGreen.log:16 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06/E18 provider 예외는 unknown 종료 | LifecycleGreen.log:17 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E12 event quota 부족은 Intent/파일/내구 예약 없이 명시 거부 | LifecycleGreen.log:18 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 누적 261개 원본에서도 현재 반개구간 관련 1개만 조회 | LifecycleGreen.log:19 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 반개구간 끝 접점은 이전 원본과 비중첩 | LifecycleGreen.log:20 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 관련 missing binding은 누락하지 않고 snapshot에 보존 | LifecycleGreen.log:21 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 관련 corrupt lifecycle은 동일 snapshot에 보존 | LifecycleGreen.log:22 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 실제 관련 257개는 명시 cap 실패·잘린 confirmed 목록 없음 | LifecycleGreen.log:23 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E04 실제 writer 후행 finalize와 같은 요청 증거 갱신으로 2출력 완료 | LifecycleGreen.log:24 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 canonical accepted 중복은 원장 mutation 추가 없이 멱등 | LifecycleGreen.log:26 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 동일 reference ID 다른 immutable 내용의 accepted 거부 | LifecycleGreen.log:27 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 SQLite accepted projection의 exact reference 일치 | LifecycleGreen.log:28 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 accepted marker checkpoint projection 일치 | LifecycleGreen.log:29 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E15/E20 재시작 JSONL fallback accepted/no-job은 증거 발명 없이 managed unknown | LifecycleGreen.log:30 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E15/E20 재시작 SQLite rebuild accepted/no-job은 증거 발명 없이 managed unknown | LifecycleGreen.log:31 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted 선행 참조 없음 거부 | LifecycleGreen.log:32 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted unknown 필드 거부 | LifecycleGreen.log:33 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted canonical 충돌 거부 | LifecycleGreen.log:34 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted 불완전 payload 거부 | LifecycleGreen.log:35 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E08 동일 원본 snapshot의 명시 UTC 요청→실제 출력·독립 output UTC unknown | LifecycleGreen.log:37 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E08 같은 UTC의 복수 원본 후보를 자동 단일 선택하지 않음 | LifecycleGreen.log:38 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 UTC confirmed mapping 하나가 보여도 관련 corrupt 원본을 숨기지 않음 | LifecycleGreen.log:39 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 실제 UTC worker도 same-lock corrupt 원본을 available로 승격하지 않음 | LifecycleGreen.log:40 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E08 UTC unplaced를 원본 snapshot/선택에 보존 | LifecycleGreen.log:41 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 opt-in UTC 후보 예산 초과는 부분 confirmed 결과 없이 실패 | LifecycleGreen.log:42 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 삭제 대기 lifecycle도 원본 snapshot에서 누락하지 않음 | LifecycleGreen.log:43 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E01 실제 H264 decoder→EventRecord→reference→내구 job·2출력 Complete | LifecycleGreen.log:44 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 무주입 bridge 재생성에도 내구 managed 소유권 유지 | LifecycleGreen.log:46 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E13 Stop 이후 신규 reference 저장 없음 | LifecycleGreen.log:47 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 비권위 원장 조회 실패는 legacy 억제 unknown | LifecycleGreen.log:48 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 실제 EventStorage managed clip 억제 및 snapshot hook 유지 | LifecycleGreen.log:50 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 실제 EventStorage 기본 clip fallback 유지 및 snapshot hook 유지 | LifecycleGreen.log:53 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E15 별도 프로세스 Ready _exit 후 보호 복원→bridge reconcile→동일 2출력·decode·commit 1개 | LifecycleGreen.log:59 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E16 historical Complete와 terminal tombstone 현재 unavailable·재생성 없음 | LifecycleGreen.log:60 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E13 active 포함 queue cap 포화는 새 accepted/예약 없이 거부 | LifecycleGreen.log:62 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E14 실제 Run 중 동시 Stop 두 번→취소·단일 join·Failed cleanup 후 자원 해제 | LifecycleGreen.log:63 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 reference job top-8은 wall 역행/재시작에도 동일 ID subset·truncated unknown | LifecycleGreen.log:66 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E15 startup bounded8 more는 blocker·남은 보호 유지·자동 무한 reconcile 없음 | LifecycleGreen.log:67 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |

### OwnershipGreen.log

실제 exit 0, 개별 assertion 3개. [원출력](OwnershipGreen.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| E01 실제 H264 decoder→EventRecord→reference→내구 job·2출력 Complete | OwnershipGreen.log:4 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 무주입 bridge 재생성에도 내구 managed 소유권 유지 | OwnershipGreen.log:6 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E13 Stop 이후 신규 reference 저장 없음 | OwnershipGreen.log:7 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |

### OwnershipRed.log

실제 exit 1, 개별 assertion 3개. [원출력](OwnershipRed.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| E01 실제 H264 decoder→EventRecord→reference→내구 job·2출력 Complete | OwnershipRed.log:1 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 무주입 bridge 재생성에도 내구 managed 소유권 유지 | OwnershipRed.log:3 실제 assertion | fail | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E13 Stop 이후 신규 reference 저장 없음 | OwnershipRed.log:4 실제 assertion | fail | historical; 최종 결과로 과거 실패를 삭제하지 않음 |

### RecoveryBehavior.log

실제 exit 0, 개별 assertion 40개. [원출력](RecoveryBehavior.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| E02 단일 출력도 clip_path 승격 없이 목록·직접 decode·fully satisfied | RecoveryBehavior.log:5 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E09 동일 reference/선택 재요청 job ID 멱등 | RecoveryBehavior.log:6 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E03 미확인 pre 구간을 유지한 verified partial 출력 | RecoveryBehavior.log:7 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E07 immutable start/end/pre/post/namespace 보존 | RecoveryBehavior.log:8 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E10 Event 출력이 누적되어도 원본 snapshot은 continuous만 | RecoveryBehavior.log:9 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E04 provider의 동일 실제 decoder 증거 업데이트로 postroll 요청 충족 | RecoveryBehavior.log:10 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E05 시간 경과만으로 coverage 없이 unknown 종료 | RecoveryBehavior.log:11 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06 provider namespace 변경을 새 증거로 혼합하지 않음 | RecoveryBehavior.log:12 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E09 같은 immutable reference의 증거/선택 갱신은 새 job·이전 partial 보존 | RecoveryBehavior.log:13 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 4097 frame 증거는 queue 접수 전 명시 거부 | RecoveryBehavior.log:14 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06/E18 provider generation 변경는 unknown 종료 | RecoveryBehavior.log:15 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06/E18 provider source 불일치는 unknown 종료 | RecoveryBehavior.log:16 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06/E18 provider 예외는 unknown 종료 | RecoveryBehavior.log:17 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E12 event quota 부족은 Intent/파일/내구 예약 없이 명시 거부 | RecoveryBehavior.log:18 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 누적 261개 원본에서도 현재 반개구간 관련 1개만 조회 | RecoveryBehavior.log:19 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 반개구간 끝 접점은 이전 원본과 비중첩 | RecoveryBehavior.log:20 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 관련 missing binding은 누락하지 않고 snapshot에 보존 | RecoveryBehavior.log:21 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 관련 corrupt lifecycle은 동일 snapshot에 보존 | RecoveryBehavior.log:22 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 실제 관련 257개는 명시 cap 실패·잘린 confirmed 목록 없음 | RecoveryBehavior.log:23 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E04 실제 writer 후행 finalize와 같은 요청 증거 갱신으로 2출력 완료 | RecoveryBehavior.log:24 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 canonical accepted 중복은 원장 mutation 추가 없이 멱등 | RecoveryBehavior.log:26 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 동일 reference ID 다른 immutable 내용의 accepted 거부 | RecoveryBehavior.log:27 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 SQLite accepted projection의 exact reference 일치 | RecoveryBehavior.log:28 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 accepted marker checkpoint projection 일치 | RecoveryBehavior.log:29 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E15/E20 재시작 JSONL fallback accepted/no-job은 증거 발명 없이 managed unknown | RecoveryBehavior.log:30 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E15/E20 재시작 SQLite rebuild accepted/no-job은 증거 발명 없이 managed unknown | RecoveryBehavior.log:31 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted 선행 참조 없음 거부 | RecoveryBehavior.log:32 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted unknown 필드 거부 | RecoveryBehavior.log:33 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted canonical 충돌 거부 | RecoveryBehavior.log:34 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted 불완전 payload 거부 | RecoveryBehavior.log:35 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E01 실제 H264 decoder→EventRecord→reference→내구 job·2출력 Complete | RecoveryBehavior.log:36 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 무주입 bridge 재생성에도 내구 managed 소유권 유지 | RecoveryBehavior.log:38 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E13 Stop 이후 신규 reference 저장 없음 | RecoveryBehavior.log:39 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 비권위 원장 조회 실패는 legacy 억제 unknown | RecoveryBehavior.log:40 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 실제 EventStorage managed clip 억제 및 snapshot hook 유지 | RecoveryBehavior.log:42 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 실제 EventStorage 기본 clip fallback 유지 및 snapshot hook 유지 | RecoveryBehavior.log:45 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E15 별도 프로세스 Ready _exit 후 보호 복원→bridge reconcile→동일 2출력·decode·commit 1개 | RecoveryBehavior.log:51 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E16 historical Complete와 terminal tombstone 현재 unavailable·재생성 없음 | RecoveryBehavior.log:52 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E13 active 포함 queue cap 포화는 새 accepted/예약 없이 거부 | RecoveryBehavior.log:54 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E14 실제 Run 중 동시 Stop 두 번→취소·단일 join·Failed cleanup 후 자원 해제 | RecoveryBehavior.log:55 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |

### RemainingBehavior.log

실제 exit 0, 개별 assertion 26개. [원출력](RemainingBehavior.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| E02 단일 출력도 clip_path 승격 없이 목록·직접 decode·fully satisfied | RemainingBehavior.log:5 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E09 동일 reference/선택 재요청 job ID 멱등 | RemainingBehavior.log:6 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E03 미확인 pre 구간을 유지한 verified partial 출력 | RemainingBehavior.log:7 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E07 immutable start/end/pre/post/namespace 보존 | RemainingBehavior.log:8 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E10 Event 출력이 누적되어도 원본 snapshot은 continuous만 | RemainingBehavior.log:9 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E04 provider의 동일 실제 decoder 증거 업데이트로 postroll 요청 충족 | RemainingBehavior.log:10 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E05 시간 경과만으로 coverage 없이 unknown 종료 | RemainingBehavior.log:11 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06 provider namespace 변경을 새 증거로 혼합하지 않음 | RemainingBehavior.log:12 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E09 같은 immutable reference의 증거/선택 갱신은 새 job·이전 partial 보존 | RemainingBehavior.log:13 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 4097 frame 증거는 queue 접수 전 명시 거부 | RemainingBehavior.log:14 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06/E18 provider generation 변경는 unknown 종료 | RemainingBehavior.log:15 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06/E18 provider source 불일치는 unknown 종료 | RemainingBehavior.log:16 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06/E18 provider 예외는 unknown 종료 | RemainingBehavior.log:17 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E12 event quota 부족은 Intent/파일/내구 예약 없이 명시 거부 | RemainingBehavior.log:18 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 누적 261개 원본에서도 현재 반개구간 관련 1개만 조회 | RemainingBehavior.log:19 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 반개구간 끝 접점은 이전 원본과 비중첩 | RemainingBehavior.log:20 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 관련 missing binding은 누락하지 않고 snapshot에 보존 | RemainingBehavior.log:21 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 관련 corrupt lifecycle은 동일 snapshot에 보존 | RemainingBehavior.log:22 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 실제 관련 257개는 명시 cap 실패·잘린 confirmed 목록 없음 | RemainingBehavior.log:23 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E04 실제 writer 후행 finalize와 같은 요청 증거 갱신으로 2출력 완료 | RemainingBehavior.log:24 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E01 실제 H264 decoder→EventRecord→reference→내구 job·2출력 Complete | RemainingBehavior.log:26 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 무주입 bridge 재생성에도 내구 managed 소유권 유지 | RemainingBehavior.log:28 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E13 Stop 이후 신규 reference 저장 없음 | RemainingBehavior.log:29 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 비권위 원장 조회 실패는 legacy 억제 unknown | RemainingBehavior.log:30 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 실제 EventStorage managed clip 억제 및 snapshot hook 유지 | RemainingBehavior.log:32 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 실제 EventStorage 기본 clip fallback 유지 및 snapshot hook 유지 | RemainingBehavior.log:35 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |

### ResolverOwnershipRed.log

실제 exit 1, 개별 assertion 44개. [원출력](ResolverOwnershipRed.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| E17 accepted 후 resolver nullopt는 기존 소유 유지·신규 저장 없음 | ResolverOwnershipRed.log:4 실제 assertion | fail | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 accepted 후 resolver 불일치는 기존 소유 유지·신규 저장 없음 | ResolverOwnershipRed.log:5 실제 assertion | fail | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 accepted 후 resolver 예외는 기존 소유 유지·신규 저장 없음 | ResolverOwnershipRed.log:6 실제 assertion | fail | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E02 단일 출력도 clip_path 승격 없이 목록·직접 decode·fully satisfied | ResolverOwnershipRed.log:8 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E09 동일 reference/선택 재요청 job ID 멱등 | ResolverOwnershipRed.log:9 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E03 미확인 pre 구간을 유지한 verified partial 출력 | ResolverOwnershipRed.log:10 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E07 immutable start/end/pre/post/namespace 보존 | ResolverOwnershipRed.log:11 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E10 Event 출력이 누적되어도 원본 snapshot은 continuous만 | ResolverOwnershipRed.log:12 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E04 provider의 동일 실제 decoder 증거 업데이트로 postroll 요청 충족 | ResolverOwnershipRed.log:13 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E05 시간 경과만으로 coverage 없이 unknown 종료 | ResolverOwnershipRed.log:14 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06 provider namespace 변경을 새 증거로 혼합하지 않음 | ResolverOwnershipRed.log:15 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E09 같은 immutable reference의 증거/선택 갱신은 새 job·이전 partial 보존 | ResolverOwnershipRed.log:16 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 4097 frame 증거는 queue 접수 전 명시 거부 | ResolverOwnershipRed.log:17 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06/E18 provider generation 변경는 unknown 종료 | ResolverOwnershipRed.log:18 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06/E18 provider source 불일치는 unknown 종료 | ResolverOwnershipRed.log:19 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E06/E18 provider 예외는 unknown 종료 | ResolverOwnershipRed.log:20 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E12 event quota 부족은 Intent/파일/내구 예약 없이 명시 거부 | ResolverOwnershipRed.log:21 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 누적 261개 원본에서도 현재 반개구간 관련 1개만 조회 | ResolverOwnershipRed.log:22 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 반개구간 끝 접점은 이전 원본과 비중첩 | ResolverOwnershipRed.log:23 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 관련 missing binding은 누락하지 않고 snapshot에 보존 | ResolverOwnershipRed.log:24 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 관련 corrupt lifecycle은 동일 snapshot에 보존 | ResolverOwnershipRed.log:25 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 실제 관련 257개는 명시 cap 실패·잘린 confirmed 목록 없음 | ResolverOwnershipRed.log:26 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E04 실제 writer 후행 finalize와 같은 요청 증거 갱신으로 2출력 완료 | ResolverOwnershipRed.log:27 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 canonical accepted 중복은 원장 mutation 추가 없이 멱등 | ResolverOwnershipRed.log:29 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 동일 reference ID 다른 immutable 내용의 accepted 거부 | ResolverOwnershipRed.log:30 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 SQLite accepted projection의 exact reference 일치 | ResolverOwnershipRed.log:31 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 accepted marker checkpoint projection 일치 | ResolverOwnershipRed.log:32 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E15/E20 재시작 JSONL fallback accepted/no-job은 증거 발명 없이 managed unknown | ResolverOwnershipRed.log:33 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E15/E20 재시작 SQLite rebuild accepted/no-job은 증거 발명 없이 managed unknown | ResolverOwnershipRed.log:34 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted 선행 참조 없음 거부 | ResolverOwnershipRed.log:35 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted unknown 필드 거부 | ResolverOwnershipRed.log:36 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted canonical 충돌 거부 | ResolverOwnershipRed.log:37 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 replay accepted 불완전 payload 거부 | ResolverOwnershipRed.log:38 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E08 동일 원본 snapshot의 명시 UTC 요청→실제 출력·독립 output UTC unknown | ResolverOwnershipRed.log:40 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E08 같은 UTC의 복수 원본 후보를 자동 단일 선택하지 않음 | ResolverOwnershipRed.log:41 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 UTC confirmed mapping 하나가 보여도 관련 corrupt 원본을 숨기지 않음 | ResolverOwnershipRed.log:42 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 실제 UTC worker도 same-lock corrupt 원본을 available로 승격하지 않음 | ResolverOwnershipRed.log:43 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E08 UTC unplaced를 원본 snapshot/선택에 보존 | ResolverOwnershipRed.log:44 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E18 opt-in UTC 후보 예산 초과는 부분 confirmed 결과 없이 실패 | ResolverOwnershipRed.log:45 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E11 삭제 대기 lifecycle도 원본 snapshot에서 누락하지 않음 | ResolverOwnershipRed.log:46 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E01 실제 H264 decoder→EventRecord→reference→내구 job·2출력 Complete | ResolverOwnershipRed.log:47 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 무주입 bridge 재생성에도 내구 managed 소유권 유지 | ResolverOwnershipRed.log:49 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E13 Stop 이후 신규 reference 저장 없음 | ResolverOwnershipRed.log:50 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 비권위 원장 조회 실패는 legacy 억제 unknown | ResolverOwnershipRed.log:51 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |

### UncertainOwnershipRed.log

실제 exit 1, 개별 assertion 4개. [원출력](UncertainOwnershipRed.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| E01 실제 H264 decoder→EventRecord→reference→내구 job·2출력 Complete | UncertainOwnershipRed.log:4 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E17 무주입 bridge 재생성에도 내구 managed 소유권 유지 | UncertainOwnershipRed.log:6 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E13 Stop 이후 신규 reference 저장 없음 | UncertainOwnershipRed.log:7 실제 assertion | pass | historical; 최종 결과로 과거 실패를 삭제하지 않음 |
| E20 비권위 원장 조회 실패는 legacy 억제 unknown | UncertainOwnershipRed.log:8 실제 assertion | fail | historical; 최종 결과로 과거 실패를 삭제하지 않음 |

## Cleanup 전수

검증 소유 임시 미디어·원장·SQLite·바이너리는 runner가 삭제했다. 로그의 삭제 전 크기와 현재 부재를 대조했다. 로그/문서만 저장소에 보존하며 실제 미디어는 보존하지 않는다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-event-integration.kB4Ktq` | 격리 fixture/미디어/원장/빌드 | 10317462 bytes | runner 삭제 | 현재 부재 확인 | [AdapterHookBehavior.log](AdapterHookBehavior.log):30 |
| `/private/tmp/media-server-s10-event-catalog.aGwhuy` | 격리 fixture/미디어/원장/빌드 | 26431806 bytes | runner 삭제 | 현재 부재 확인 | [CatalogRegression.log](CatalogRegression.log):248 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-event-integration.cBEl1i` | 격리 fixture/미디어/원장/빌드 | 11663333 bytes | runner 삭제 | 현재 부재 확인 | [ClosingBehavior.log](ClosingBehavior.log):37 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-event-integration.t18UJy` | 격리 fixture/미디어/원장/빌드 | 11794801 bytes | runner 삭제 | 현재 부재 확인 | [ClosingBehaviorRetry.log](ClosingBehaviorRetry.log):49 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-consumer-connection.mYtPiK` | 격리 fixture/미디어/원장/빌드 | 6170927 bytes | runner 삭제 | 현재 부재 확인 | [ConnectionRegression.log](ConnectionRegression.log):24 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-consumer-connection.GG6Fs6` | 격리 fixture/미디어/원장/빌드 | 6169508 bytes | runner 삭제 | 현재 부재 확인 | [ConnectionRegressionRetry.log](ConnectionRegressionRetry.log):24 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-event-integration.EokczT` | 격리 fixture/미디어/원장/빌드 | 7542945 bytes | runner 삭제 | 현재 부재 확인 | [EventBehaviorRetry.log](EventBehaviorRetry.log):19 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-event-integration.gTCQ3D` | 격리 fixture/미디어/원장/빌드 | 12919970 bytes | runner 삭제 | 현재 부재 확인 | [FinalCompleteFocused.log](FinalCompleteFocused.log):76 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-consumer-connection.TmJmVy` | 격리 fixture/미디어/원장/빌드 | 6170927 bytes | runner 삭제 | 현재 부재 확인 | [FinalConnectionRegression.log](FinalConnectionRegression.log):24 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-event-integration.ApzrWj` | 격리 fixture/미디어/원장/빌드 | 12908534 bytes | runner 삭제 | 현재 부재 확인 | [FinalFocused.log](FinalFocused.log):73 |
| `/private/tmp/media-server-finalize-YWLqkm` | 격리 fixture/미디어/원장/빌드 | 7754930 bytes | runner 삭제 | 현재 부재 확인 | [FinalizeIntegrationRegression.log](FinalizeIntegrationRegression.log):144 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-event-integration.oVQuiN` | 격리 fixture/미디어/원장/빌드 | 7070959 bytes | runner 삭제 | 현재 부재 확인 | [FirstGreenAttempt.log](FirstGreenAttempt.log):4 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-event-integration.L2qTtL` | 격리 fixture/미디어/원장/빌드 | 7572137 bytes | runner 삭제 | 현재 부재 확인 | [HookBehavior.log](HookBehavior.log):22 |
| `/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T//media-server-identity-unit.ycXqAa` | 격리 fixture/미디어/원장/빌드 | 7024481 bytes | runner 삭제 | 현재 부재 확인 | [IdentityRegression.log](IdentityRegression.log):25 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-event-integration.G35sw6` | 격리 fixture/미디어/원장/빌드 | 6573142 bytes | runner 삭제 | 현재 부재 확인 | [InitialRed.log](InitialRed.log):4 |
| `/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T//media_server_v410_event_recording.Ft02FK` | 격리 fixture/미디어/원장/빌드 | 6592101 bytes | runner 삭제 | 현재 부재 확인 | [LegacyBridgeRegression.log](LegacyBridgeRegression.log):148 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-event-integration.6UuXe1` | 격리 fixture/미디어/원장/빌드 | 12902518 bytes | runner 삭제 | 현재 부재 확인 | [LifecycleGreen.log](LifecycleGreen.log):69 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-event-integration.RGB5yL` | 격리 fixture/미디어/원장/빌드 | 7073615 bytes | runner 삭제 | 현재 부재 확인 | [OwnershipGreen.log](OwnershipGreen.log):9 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-event-integration.pbrhPe` | 격리 fixture/미디어/원장/빌드 | 7072044 bytes | runner 삭제 | 현재 부재 확인 | [OwnershipRed.log](OwnershipRed.log):6 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-range.yGNzFP` | 격리 fixture/미디어/원장/빌드 | 4907754 bytes | runner 삭제 | 현재 부재 확인 | [RangeRegression.log](RangeRegression.log):18 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-event-integration.Tx6Qlp` | 격리 fixture/미디어/원장/빌드 | 12050332 bytes | runner 삭제 | 현재 부재 확인 | [RecoveryBehavior.log](RecoveryBehavior.log):58 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-consumer-reference.6aUzQG` | 격리 fixture/미디어/원장/빌드 | 4676333 bytes | runner 삭제 | 현재 부재 확인 | [ReferenceRegression.log](ReferenceRegression.log):31 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-event-integration.xp1VaK` | 격리 fixture/미디어/원장/빌드 | 11047579 bytes | runner 삭제 | 현재 부재 확인 | [RemainingBehavior.log](RemainingBehavior.log):38 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-event-integration.Q77pYj` | 격리 fixture/미디어/원장/빌드 | 11802343 bytes | runner 삭제 | 현재 부재 확인 | [ResolverOwnershipRed.log](ResolverOwnershipRed.log):53 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-retention-v2.ciMC14` | 격리 fixture/미디어/원장/빌드 | 9958042 bytes | runner 삭제 | 현재 부재 확인 | [RetentionRegression.log](RetentionRegression.log):27 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-selection.eM4Kps` | 격리 fixture/미디어/원장/빌드 | 1015416 bytes | runner 삭제 | 현재 부재 확인 | [SelectionRegression.log](SelectionRegression.log):29 |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-event-integration.UIaXE9` | 격리 fixture/미디어/원장/빌드 | 7074945 bytes | runner 삭제 | 현재 부재 확인 | [UncertainOwnershipRed.log](UncertainOwnershipRed.log):10 |

최종 assertion 717개, historical assertion 382개, cleanup 경로 27개를 기계 대조했다. archive 선수조건 거부는 임시 경로 생성 전이다. build는 기존 build-gst-onnx 산출물을 보존하며 임시 운영 데이터/서버/port를 생성하지 않았다.
