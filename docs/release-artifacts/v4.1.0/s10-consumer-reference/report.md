# S10 3C-3C 원본 참조 저장 검증
독자는 구현·검토 담당자다. AGENTS가 정책 원본이며 중앙 release-test-records의 C341~356을 실행한 보존 증거다.
원본 사실 저장만 검사했으며 분석/event 소비자나 실제 파생 미디어 완료가 아니다.
macOS 기존 C++17/SQLite/OpenSSL 환경 사용, GStreamer 비활성 compile 경로다. 외부·운영 데이터·포트·시스템 오류 주입 없음.

## 변경 및 경계

contracts의 RecordingConsumerReferenceV1/OriginalV1/RequestV1와 Validate/Serialize/Parse,
catalog의 PutConsumerReference/QueryConsumerReferences, journal consumer_reference_put을 연결했다.
13필드/null 엄격 parser는 원문 1MiB 상한, ID/track 및 정수·padding 검증을 수행한다.
동일 전체 참조는 append 없이 멱등이며 다른 owner/kind/original은 거부한다.
opt-in preflight는 SQLite와 cleanup 전에 손상/충돌을 거부하고 SQL projection 및 checkpoint signature에 참조가 포함된다.
segment 존재/후보/UTC 외삽/playable은 저장하지 않는다. 공개 DTO/소비자/S09 파일은 변경하지 않았다.

## 실행 이력

마감 diffcheck에서 Catalog.log의 원출력 행말 공백 15건을 발견했다. 의미·행수·판정은 유지하고 행말 공백만 제거한 뒤 재검사한다. 제품 테스트 재실행 사유는 아니다.

| 실행 | 명령·결과 | elapsed |
| --- | --- | --- |
| 최초 RED 82667 | bash scripts/internal/verify_recording_consumer_reference.sh, exit1, C341/C350 예상 assertion 2 FAIL | runner 4초 |
| 첫 GREEN 54538 | 같은 명령, exit0, 16 PASS/0 FAIL | runner 5초 |
| 최종 83355 | 같은 명령, exit0, 16 PASS/0 FAIL; C355 새 managed 객체 재시작/C356 세부 충돌 보강 | runner 4초 |
| 등록 보완 뒤 최종 30139 | 같은 명령, exit0, 16 PASS/0 FAIL; 제품·test 코드 불변 | runner 4초 |
| source-binding 95047 | bash scripts/internal/verify_recording_source_binding.sh, exit0, 20 PASS/0 FAIL | runner 5초 |
| catalog 60010 | ./server.sh verify-v410-recording-catalog, exit0, C++234 PASS, crypto-off3 PASS, 정적 연결9 PASS | 미집계: runner 시간 출력 없음, 시작/종료 총시각 수집하지 않음 |
| diff | git diff --check, exit0, 출력 없음 | 미집계 |

원출력은 [RED](Red.log), [첫 GREEN](Green.log), [최종 focused](Focused.log), [binding](Binding.log), [catalog](Catalog.log)에 전수 보존했다.
초기 2 FAIL은 선언/거부 stub의 미구현 예상 RED이며 컴파일/setup 실패는 없었다.
실행 중 apply_patch 한 번이 불완전 context로 거절돼 적용되지 않았으며 동일 파일의 정확한 문맥으로 재작성했다(테스트 실패 아님).
token start/end/consumed는 도구가 제공하지 않아 모두 미집계다.
메인이 UI checklist/template의 내부 기능 비대상 연결 누락을 보완한 뒤 동일 focused를 1회 재실행했다.
inventory/중앙 정의는 첫 실행 전 존재했으나 최종 채택 증거는 [Final.log](Final.log)의30139이다.
이전 실행은 이력으로 보존하고 source-binding/catalog는 기존 등록이 유효하여 반복하지 않았다.

## 최종 개별 결과와 실제 세부 oracle

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| C341 계약 왕복 | unavailable/original null/request null의 독립 literal parse→동일 JSON | pass | RED fail→pass |
| C342 unknown/중복 필드 거부 | extra top field, 중복 kind, 1MiB 초과 원문 거부 | pass | 첫 RED 미실행 |
| C343 ID·종류·소유자 제약 | reference 경로 escape, 빈 owner, 잘못된 kind 거부 | pass | |
| C344 품질·원본 nullable 조합 | timestamp-match 원본 필수/존재 수용, nearest 수용, ambiguous 원본 금지/null 수용 | pass | exact frame 증거 아님 |
| C345 원본 수치·track 경계 | generation/order0, ordinal0, UINT64_MAX PTS, 빈/control/1025B track 거부; PTS0/INT64_MAX 및 UINT64_MAX ordinal 왕복 | pass | |
| C346 event 요청·시간축 | utc-ms/media-pts-ms, 순간 start=end=0 수용; 잘못된 basis/요청 부재 거부 | pass | |
| C347 observation 요청 금지 | observation에 request를 붙이면 거부 | pass | |
| C348 요청 음수·역전·padding | 음수 start/pre/post, start>end, start-pre<0, end+post overflow 거부 | pass | |
| C349 미지원 schema 거부 | reference.v9 parse 거부 | pass | |
| C350 실제 원장 저장·조회 | finalized segment 없이 managed catalog 저장·channel/kind/owner query1건 | pass | RED fail→pass |
| C351 동일 참조 멱등 | 같은 전체 참조 재전달 후 원장 bytes 불변 | pass | |
| C352 동일 ID 충돌 거부 | kind/owner/original 각각 변경 Put 거부와 원장 bytes 불변 | pass | |
| C353 opt-in·미open 거부 | 미open Put 파일 미생성, opt-out Open 후 Put 거부/빈 원장 유지 | pass | |
| C354 SQL·JSONL 재시작 동등 | 실제 SQL payload SELECT literal 대조, 복사 원장 JSONL-only 새 catalog query 동일, wrong-channel 없음 | pass | |
| C355 checkpoint 참조 보존 | checkpoint 후 원문/조회 유지; 별도 managed store의 event 저장/checkpoint 뒤 journal/catalog 소멸, 새 객체 SQLite-off/on reopen 원문 참조 동일 | pass | |
| C356 손상·충돌 replay 선차단 | malformed payload, 같은 reference ID 충돌, 미래 envelope schema, truncated tail, opt-out, entity 불일치, extra payload field, 같은 mutation ID 다른 참조, ordinary/consumer ID 앞뒤 충돌 | pass | 10경우 각각 Open/retry 거부와 원장·기존 SQLite 원문 불변 detail=true |

## cleanup

| 실행 | 소유 경로 | 삭제 전 bytes | 결과 |
| --- | --- | ---: | --- |
| RED | /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-consumer-reference.Pguq3h | 3012796 | removed=true |
| 첫 GREEN | /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-consumer-reference.2HD2xU | 3176608 | removed=true |
| 최종 | /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-consumer-reference.B2h4iQ | 3347581 | removed=true |
| 등록 보완 최종 | /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-consumer-reference.2A0Udl | 3347581 | removed=true |
| binding | /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-binding.x7l4TF | 4599072 | removed=true |
| catalog | /tmp/media_server_v410_recording_catalog-71690 | 24692326 | removed=true |

원문 로그에는 비밀/영상이 없으며 최소 실패·성공 증적 보존 목적이다. .media_server.test/s10-3c3c의 RED/첫GREEN 복제는 메인 정리 대상이며 이 문서 로그로 이관했다.
제품 build/문서 links는 메인 담당. 이번 담당자는 wholebuild/UI/장시간/consumer 연결/커밋/푸시를 실행하지 않았다.

## 최종 제품 SHA256

```text
f8d065abfabb09fc17917efe0f024fe0bfc79dc3e2d39e3faafb7cd459ce4d0a  include/recording/recording_contracts.h
6cc54e251771285e61887d9a4e7334848a31966bb43dd2a53aa5119e83ddf27d  src/recording/recording_contracts.cpp
192fc051678249461c20dfd323b65295e7bdd662d82494580a58441fab0653d8  include/recording/recording_catalog.h
04ec55dc247edfc3a97996b49be4b3a61a1ab334530f13a908e87cabca950b2f  src/recording/recording_catalog.cpp
bc33310224150b71dec0e124ede34687024fa8aff822e8a2b754e8639c1c4471  include/recording/recording_journal.h
386b7ddf03cb3333081266d548b68be0dbb4efeade53b5b4c79c339d06f01c80  src/recording/recording_journal.cpp
```
