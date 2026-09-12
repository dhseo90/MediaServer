# S10 초기 pre-roll 요청 수락 보완 결과

독자: 녹화 소비자 계약 개발·검토 담당자. 이 문서는 실행 증적이며 정책이 아니다. 요구사항 source-of-truth는 중앙 C419~425와 승인된 초기 요청 원문 보존 계약이다.

## 범위와 결론

승인된 validator 조건 한 곳만 제거했다. `start_ms-pre_ms<0`이어도 요청의 start/end/pre/post를 변경하지 않고 수락한다. 음수 필드, 역전 구간, end+post overflow, ID·품질·schema 검사는 유지한다. 실제 영상 존재/coverage/missing 판단, UTC 외삽, 공개 schema, bridge 로직은 변경하지 않았다. 초기 요청은 pending이며 파생 clip을 생성하지 않는다. 새 수락 레코드의 구형 바이너리 downgrade 호환은 보장하지 않는다.

TDD 스킬에 따라 검사 먼저 작성했고 예상 7개 실패를 직접 관찰한 뒤 최소 수정했다. 기존 16개 reference/18개 connection 회귀는 RED에서도 모두 통과했다. C348의 start0/pre1 거부 기대만 승인 계약으로 C421 수락 검사에 옮겼으며 다른 5개 오류 검사는 유지했다. 최종 focused 41개 및 승인된 이벤트 회귀가 통과했다. 제품 build는 메인이 실행해 exit0을 전달하고 [Build.log](Build.log)에 보존했다.

## 명령·최초 실패·재검증

| 실행 | 명령 | exit | 개별 결과 | elapsed/source |
| --- | --- | --- | --- | --- |
| Reference RED | `bash scripts/internal/verify_recording_consumer_reference.sh` | 1 | 16 pass/3 fail: C419~421 예상 거부 | 5초/bash SECONDS |
| Connection RED | `bash scripts/internal/verify_recording_consumer_connection.sh` | 1 | 18 pass/4 fail: C422~425 초기 요청 미수락에 따른 예상 실패 | 7초/bash SECONDS |
| Reference GREEN | 같은 reference 명령 | 0 | 19 pass/0 fail | 4초/bash SECONDS |
| Connection GREEN | 같은 connection 명령 | 0 | 22 pass/0 fail | 7초/bash SECONDS |
| Event 회귀 | `bash scripts/internal/verify_v410_event_recording.sh` | 0 | inventory 35/0, assertion 158/0, application 7/0, runtime 23/0, negative 2/0, exact action 27/0 | 40.55초/functions Date.now dispatch→최종 poll, 대기 지연 포함 |
| Build(메인 실행) | `./server.sh build` | 0 | session46438, Build.log | 전체 경과 미집계; 첫 poll 1초를 전체 시간으로 사용하지 않음 |
| diff/정리 확인 | `git diff --check`, 소유 temp 부재 직접 검사 | 0 | 변경 공백 오류 없음·임시 경로 부재 | 별도 미집계 |

새 빌드·환경·회귀 실패는 없었다. RED는 예상 assertion 실패이며 성공 증거가 아니다. 이벤트 runner의 negative 2개는 기존 검증기가 오류 탐지력을 확인하는 정상 검사이며 이번 제품 실패로 바꾸지 않는다. token start/end/consumed는 담당 작업 단위 계측이 없어 미집계다.

## 신규 검사 상세

| 제목 | 실제 확인한 경계 | pass/fail | 이력 |
| --- | --- | --- | --- |
| C419 media-pts 초기 요청 원문 왕복 | media-pts-ms/start100/end200/pre5000/post3000, 실제 Validate/Serialize/Parse 뒤 5개 값과 직렬화 재왕복 그대로 | pass | RED fail→GREEN pass |
| C420 UTC 초기 요청 원문 왕복 | utc-ms의 같은 초기 요청 필드 그대로 왕복, UTC coverage 추론 없음 | pass | RED fail→GREEN pass |
| C421 0·최대 pre 요청 및 오류 경계 | (start,end,pre,post)=(0,0,0,0),(0,0,1,0),(0,0,INT64_MAX,0),(0,0,INT64_MAX,INT64_MAX),(MAX,MAX,MAX,0) 수락·원문 왕복; 음수 start/pre/post, 역전, end+post overflow 거부 | pass | RED fail→GREEN pass; 이전 C348 오류 의미 중 초기 pre만 변경 |
| C422 실제 bridge 초기 pre-roll 수락·pending 유지 | 실제 opt-in TryResolve의 start100/end200/pre5000/post3000 저장; handled/error없음/pending, derived_clip_ready=false, clip/link 경로 없음, deriver 호출0·output root 없음·구형 pending link 없음 | pass | RED fail→GREEN pass |
| C423 초기 요청 멱등·갱신·generation 분리 | 동일 전달 journal bytes 불변; end200→300 확장과 generation-one/order1→early-generation-two/order2 분리, 총3참조. 각 PTS0/ordinal1/track video/0 및 초기 원문 필드 직접 대조 | pass | RED fail→GREEN pass |
| C424 초기 요청 SQL·JSONL 복구 | 실제 recording_consumer_references.payload_json SELECT, catalog/journal 파괴 뒤 JSONL fallback reopen 및 SQLite reopen; literal로 확인한3참조 전체직렬화 동등 | pass | RED fail→GREEN pass |
| C425 초기 요청 checkpoint 복구 | 실제 managed Checkpoint 뒤 객체 파괴·JSONL/SQLite reopen, 전체3참조와 실제 SQL payload 동등 | pass | RED fail→GREEN pass |

C424/425는 후보가 없는 원본 요청 사실 저장을 확인하며 미디어 생성·재생 가능성을 증명하지 않는다. retention fixture는 catalog reopen 전에 소멸시켜 stale 참조를 남기지 않는다.

## focused 전수 결과

### ReferenceGreen.log

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| C341 계약 왕복 | 해당 실제 fixture 실행, 상세 원출력 [ReferenceGreen.log](ReferenceGreen.log) | pass | RED/GREEN 모두 pass |
| C342 unknown/중복 필드 거부 | 해당 실제 fixture 실행, 상세 원출력 [ReferenceGreen.log](ReferenceGreen.log) | pass | RED/GREEN 모두 pass |
| C343 ID·종류·소유자 제약 | 해당 실제 fixture 실행, 상세 원출력 [ReferenceGreen.log](ReferenceGreen.log) | pass | RED/GREEN 모두 pass |
| C344 품질·원본 nullable 조합 | 해당 실제 fixture 실행, 상세 원출력 [ReferenceGreen.log](ReferenceGreen.log) | pass | RED/GREEN 모두 pass |
| C345 원본 수치·track 경계 | 해당 실제 fixture 실행, 상세 원출력 [ReferenceGreen.log](ReferenceGreen.log) | pass | RED/GREEN 모두 pass |
| C346 event 요청·시간축 | 해당 실제 fixture 실행, 상세 원출력 [ReferenceGreen.log](ReferenceGreen.log) | pass | RED/GREEN 모두 pass |
| C347 observation 요청 금지 | 해당 실제 fixture 실행, 상세 원출력 [ReferenceGreen.log](ReferenceGreen.log) | pass | RED/GREEN 모두 pass |
| C348 요청 음수·역전·padding | 해당 실제 fixture 실행, 상세 원출력 [ReferenceGreen.log](ReferenceGreen.log) | pass | RED/GREEN 모두 pass |
| C419 media-pts 초기 요청 원문 왕복 | 해당 실제 fixture 실행, 상세 원출력 [ReferenceGreen.log](ReferenceGreen.log) | pass | 최초 예상 fail 후 pass |
| C420 UTC 초기 요청 원문 왕복 | 해당 실제 fixture 실행, 상세 원출력 [ReferenceGreen.log](ReferenceGreen.log) | pass | 최초 예상 fail 후 pass |
| C421 0·최대 pre 요청 및 오류 경계 | 해당 실제 fixture 실행, 상세 원출력 [ReferenceGreen.log](ReferenceGreen.log) | pass | 최초 예상 fail 후 pass |
| C349 미지원 schema 거부 | 해당 실제 fixture 실행, 상세 원출력 [ReferenceGreen.log](ReferenceGreen.log) | pass | RED/GREEN 모두 pass |
| C350 실제 원장 저장·조회 | 해당 실제 fixture 실행, 상세 원출력 [ReferenceGreen.log](ReferenceGreen.log) | pass | RED/GREEN 모두 pass |
| C351 동일 참조 멱등 | 해당 실제 fixture 실행, 상세 원출력 [ReferenceGreen.log](ReferenceGreen.log) | pass | RED/GREEN 모두 pass |
| C352 동일 ID 충돌 거부 | 해당 실제 fixture 실행, 상세 원출력 [ReferenceGreen.log](ReferenceGreen.log) | pass | RED/GREEN 모두 pass |
| C353 opt-in·미open 거부 | 해당 실제 fixture 실행, 상세 원출력 [ReferenceGreen.log](ReferenceGreen.log) | pass | RED/GREEN 모두 pass |
| C354 SQL·JSONL 재시작 동등 | 해당 실제 fixture 실행, 상세 원출력 [ReferenceGreen.log](ReferenceGreen.log) | pass | RED/GREEN 모두 pass |
| C355 checkpoint 참조 보존 | 해당 실제 fixture 실행, 상세 원출력 [ReferenceGreen.log](ReferenceGreen.log) | pass | RED/GREEN 모두 pass |
| C356 손상·충돌 replay 선차단 | 해당 실제 fixture 실행, 상세 원출력 [ReferenceGreen.log](ReferenceGreen.log) | pass | RED/GREEN 모두 pass |

### ConnectionGreen.log

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| C401 관측·참조 원자 저장 | 해당 실제 fixture 실행, 상세 원출력 [ConnectionGreen.log](ConnectionGreen.log) | pass | RED/GREEN 모두 pass |
| C402 쌍 identity 불일치 거부 | 해당 실제 fixture 실행, 상세 원출력 [ConnectionGreen.log](ConnectionGreen.log) | pass | RED/GREEN 모두 pass |
| C403 동일 원본 재전달·event 병합 | 해당 실제 fixture 실행, 상세 원출력 [ConnectionGreen.log](ConnectionGreen.log) | pass | RED/GREEN 모두 pass |
| C405 SQL·JSONL·checkpoint 쌍 복구 | 해당 실제 fixture 실행, 상세 원출력 [ConnectionGreen.log](ConnectionGreen.log) | pass | RED/GREEN 모두 pass |
| C404 다른 원본 동일PTS 구분 | 해당 실제 fixture 실행, 상세 원출력 [ConnectionGreen.log](ConnectionGreen.log) | pass | RED/GREEN 모두 pass |
| C406 실제 OnResult 원본 참조 저장 | 해당 실제 fixture 실행, 상세 원출력 [ConnectionGreen.log](ConnectionGreen.log) | pass | RED/GREEN 모두 pass |
| C407 OnEvent 강제 표본 | 해당 실제 fixture 실행, 상세 원출력 [ConnectionGreen.log](ConnectionGreen.log) | pass | RED/GREEN 모두 pass |
| C408 종료track 과거참조 보존 | 해당 실제 fixture 실행, 상세 원출력 [ConnectionGreen.log](ConnectionGreen.log) | pass | RED/GREEN 모두 pass |
| C409 종료track 참조부재 unknown | 해당 실제 fixture 실행, 상세 원출력 [ConnectionGreen.log](ConnectionGreen.log) | pass | RED/GREEN 모두 pass |
| C410 sampling·queue·StopAndDrain 회귀 | 해당 실제 fixture 실행, 상세 원출력 [ConnectionGreen.log](ConnectionGreen.log) | pass | RED/GREEN 모두 pass |
| C411 exact·미색인 복수 후보 보존 | 해당 실제 fixture 실행, 상세 원출력 [ConnectionGreen.log](ConnectionGreen.log) | pass | RED/GREEN 모두 pass |
| C412 nearest/ambiguous/unavailable 미승격 | 해당 실제 fixture 실행, 상세 원출력 [ConnectionGreen.log](ConnectionGreen.log) | pass | RED/GREEN 모두 pass |
| C413 UTC unknown·삭제 상태 재판정 | 해당 실제 fixture 실행, 상세 원출력 [ConnectionGreen.log](ConnectionGreen.log) | pass | RED/GREEN 모두 pass |
| C414 실제 TryResolve 요청참조 저장 | 해당 실제 fixture 실행, 상세 원출력 [ConnectionGreen.log](ConnectionGreen.log) | pass | RED/GREEN 모두 pass |
| C415 event 재전달·확장·세대 구분 | 해당 실제 fixture 실행, 상세 원출력 [ConnectionGreen.log](ConnectionGreen.log) | pass | RED/GREEN 모두 pass |
| C416 source/channel 충돌 거부 | 해당 실제 fixture 실행, 상세 원출력 [ConnectionGreen.log](ConnectionGreen.log) | pass | RED/GREEN 모두 pass |
| C417 같은 원본 미디어 교집합 우선 | 해당 실제 fixture 실행, 상세 원출력 [ConnectionGreen.log](ConnectionGreen.log) | pass | RED/GREEN 모두 pass |
| C418 공개 결과·구형 fallback 불변 | 해당 실제 fixture 실행, 상세 원출력 [ConnectionGreen.log](ConnectionGreen.log) | pass | RED/GREEN 모두 pass |
| C422 실제 bridge 초기 pre-roll 수락·pending 유지 | 해당 실제 fixture 실행, 상세 원출력 [ConnectionGreen.log](ConnectionGreen.log) | pass | 최초 예상 fail 후 pass |
| C423 초기 요청 멱등·갱신·generation 분리 | 해당 실제 fixture 실행, 상세 원출력 [ConnectionGreen.log](ConnectionGreen.log) | pass | 최초 예상 fail 후 pass |
| C424 초기 요청 SQL·JSONL 복구 | 해당 실제 fixture 실행, 상세 원출력 [ConnectionGreen.log](ConnectionGreen.log) | pass | 최초 예상 fail 후 pass |
| C425 초기 요청 checkpoint 복구 | 해당 실제 fixture 실행, 상세 원출력 [ConnectionGreen.log](ConnectionGreen.log) | pass | 최초 예상 fail 후 pass |

## 이벤트 회귀 전수 결과

기존 verifier의 실행 행을 아래에 보존한다. 중복 제목도 실행 횟수대로 남겼다. exact action 표는 하위 check ID와 executions도 함께 보존한다. 전체 표의 원출력은 [Event.log](Event.log)다.

| 제목 | 테스트내용 | pass/fail |
| --- | --- | --- |
| 1. 등록기: 정상 정식 등록 27개 | 기존 승인 event runner 실제 검사 | pass |
| 2. 등록기: 다른 등록군 추가와 일관된 총계 허용 | 기존 승인 event runner 실제 검사 | pass |
| 3. 등록기: 전체 총계 불일치 거부 | 기존 승인 event runner 실제 검사 | pass |
| 4. 등록기: canonical 등록 수 변경 거부 | 기존 승인 event runner 실제 검사 | pass |
| 5. 등록기: S05 등록 수 변경 거부 | 기존 승인 event runner 실제 검사 | pass |
| 6. 등록기: 등록군 중복 거부 | 기존 승인 event runner 실제 검사 | pass |
| 7. 등록기: 음수 등록 수 거부 | 기존 승인 event runner 실제 검사 | pass |
| 8. 등록기: 소수 등록 수 거부 | 기존 승인 event runner 실제 검사 | pass |
| 9. 등록기: 등록 범위 표 누락 거부 | 기존 승인 event runner 실제 검사 | pass |
| 10. 등록기: 누락 ID | 기존 승인 event runner 실제 검사 | pass |
| 11. 등록기: 중복 ID | 기존 승인 event runner 실제 검사 | pass |
| 12. 등록기: 추가 ID | 기존 승인 event runner 실제 검사 | pass |
| 13. 등록기: 빈 테스트 영역 | 기존 승인 event runner 실제 검사 | pass |
| 14. 등록기: 없는 구현 심볼 | 기존 승인 event runner 실제 검사 | pass |
| 15. 등록기: 없는 테스트 함수 | 기존 승인 event runner 실제 검사 | pass |
| 16. 등록기: 없는 check | 기존 승인 event runner 실제 검사 | pass |
| 17. 등록기: 중복 check ID | 기존 승인 event runner 실제 검사 | pass |
| 18. 등록기: 문서 행 누락 | 기존 승인 event runner 실제 검사 | pass |
| 19. 등록기: 실행 소비자 정상 합성 입력 | 기존 승인 event runner 실제 검사 | pass |
| 20. 등록기: 실제 check 결과 누락 | 기존 승인 event runner 실제 검사 | pass |
| 21. 등록기: EOS assertion 제거와 감소한 summary도 거부 | 기존 승인 event runner 실제 검사 | pass |
| 22. 등록기: 실패 summary | 기존 승인 event runner 실제 검사 | pass |
| 23. 등록기: 성공 summary만으로 PASS 금지 | 기존 승인 event runner 실제 검사 | pass |
| 24. 등록기: 중복 application 결과 | 기존 승인 event runner 실제 검사 | pass |
| 25. 등록기: runtime 로그 전체 누락 | 기존 승인 event runner 실제 검사 | pass |
| 26. 등록기: runtime 시나리오 누락 | 기존 승인 event runner 실제 검사 | pass |
| 27. 등록기: 종료 취소 runtime 시나리오 누락 | 기존 승인 event runner 실제 검사 | pass |
| 28. 등록기: runtime assertion 누락 및 감소 summary | 기존 승인 event runner 실제 검사 | pass |
| 29. 등록기: runtime assertion 중복 및 증가 summary | 기존 승인 event runner 실제 검사 | pass |
| 30. 등록기: runtime summary 실패 | 기존 승인 event runner 실제 검사 | pass |
| 31. 등록기: runtime summary 중복 | 기존 승인 event runner 실제 검사 | pass |
| 32. 등록기: runtime failure marker | 기존 승인 event runner 실제 검사 | pass |
| 33. 등록기: runtime mutation 결과 누락 | 기존 승인 event runner 실제 검사 | pass |
| 34. 등록기: runtime mutation 결과 중복 | 기존 승인 event runner 실제 검사 | pass |
| 35. 등록기: runtime negative summary 실패 | 기존 승인 event runner 실제 검사 | pass |
| 36. 실제 assertion: EQ journal open | 기존 승인 event runner 실제 검사 | pass |
| 37. 실제 assertion: EQ catalog open | 기존 승인 event runner 실제 검사 | pass |
| 38. 실제 assertion: EQ 실제 pending 등록 | 기존 승인 event runner 실제 검사 | pass |
| 39. 실제 assertion: EQ 각 event 실제 worker 최초 journal 기록 확인 | 기존 승인 event runner 실제 검사 | pass |
| 40. 실제 assertion: EQ deadline 이전 동일 event journal 증가 없음 | 기존 승인 event runner 실제 검사 | pass |
| 41. 실제 assertion: EQ 서로 다른 event link ID 보존 | 기존 승인 event runner 실제 검사 | pass |
| 42. 실제 assertion: EQ 미해석 PTS는 파생 비실행 | 기존 승인 event runner 실제 검사 | pass |
| 43. 실제 assertion: EQ journal open | 기존 승인 event runner 실제 검사 | pass |
| 44. 실제 assertion: EQ catalog open | 기존 승인 event runner 실제 검사 | pass |
| 45. 실제 assertion: EQ 실제 pending 등록 | 기존 승인 event runner 실제 검사 | pass |
| 46. 실제 assertion: EQ 실제 pending 등록 | 기존 승인 event runner 실제 검사 | pass |
| 47. 실제 assertion: EQ 각 event 실제 worker 최초 journal 기록 확인 | 기존 승인 event runner 실제 검사 | pass |
| 48. 실제 assertion: EQ deadline 이전 동일 event journal 증가 없음 | 기존 승인 event runner 실제 검사 | pass |
| 49. 실제 assertion: EQ 서로 다른 event link ID 보존 | 기존 승인 event runner 실제 검사 | pass |
| 50. 실제 assertion: EQ 미해석 PTS는 파생 비실행 | 기존 승인 event runner 실제 검사 | pass |
| 51. 실제 assertion: 기본 pending event link가 유효해야 함:  | 기존 승인 event runner 실제 검사 | pass |
| 52. 실제 assertion: terminal 대기 UTC 확장 요청은 additive 계약으로 round-trip해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 53. 실제 assertion: terminal 대기 요청이 현재 범위를 축소하면 거부해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 54. 실제 assertion: 미해석 후속 PTS는 기존 UTC 범위와 별도 field로 round-trip해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 55. 실제 assertion: 미해석 후속 PTS를 소비하지 않은 terminal 상태를 거부해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 56. 실제 assertion: 서로 겹치는 ordered overlap을 거부해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 57. 실제 assertion: overlap/missing이 requested range를 정확히 분할하지 않으면 거부해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 58. 실제 assertion: unknown link status를 영속 계약으로 허용하면 안 됨 | 기존 승인 event runner 실제 검사 | pass |
| 59. 실제 assertion: locator 없는 fallback evidence를 거부해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 60. 실제 assertion: journal open 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 61. 실제 assertion: catalog open 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 62. 실제 assertion: event link 갱신은 SQLite primary projection에서 검증해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 63. 실제 assertion: segment finalize 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 64. 실제 assertion: segment finalize 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 65. 실제 assertion: segment finalize 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 66. 실제 assertion: segment finalize 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 67. 실제 assertion: segment finalize 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 68. 실제 assertion: retention policy 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 69. 실제 assertion: 이벤트 저장 worker를 막지 않고 파생 job을 pending으로 enqueue해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 70. 실제 assertion: 파생 중 원본 segment hold가 유지되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 71. 실제 assertion: 파생 중 원본 segment hold가 유지되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 72. 실제 assertion: 파생 중 원본 segment hold가 유지되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 73. 실제 assertion: 완전한 archive 파생 완료 뒤 ready clip을 반환해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 74. 실제 assertion: event link ID와 derived clip path가 반환되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 75. 실제 assertion: 반개구간 overlap은 맞닿기만 한 segment를 제외해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 76. 실제 assertion: media PTS event 범위가 segment epoch 기준 UTC로 변환되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 77. 실제 assertion: overlap segment가 UTC 순서로 전달되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 78. 실제 assertion: 파생 성공 link가 catalog complete로 저장되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 79. 실제 assertion: 파생 완료 뒤 원본 hold가 해제되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 80. 실제 assertion: 파생 완료 뒤 원본 hold가 해제되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 81. 실제 assertion: 파생 완료 뒤 원본 hold가 해제되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 82. 실제 assertion: 같은 event update는 파생 clip을 중복 생성하지 않아야 함 | 기존 승인 event runner 실제 검사 | pass |
| 83. 실제 assertion: 파생 중 원본 segment hold가 유지되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 84. 실제 assertion: 파생 중 원본 segment hold가 유지되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 85. 실제 assertion: 파생 중 원본 segment hold가 유지되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 86. 실제 assertion: 파생 중 원본 segment hold가 유지되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 87. 실제 assertion: 완료 event의 더 넓은 update는 range별 결정 ID로 다시 파생해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 88. 실제 assertion: segment finalize 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 89. 실제 assertion: segment finalize 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 90. 실제 assertion: cam-b policy 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 91. 실제 assertion: archive gap이 있으면 complete로 표시하면 안 됨 | 기존 승인 event runner 실제 검사 | pass |
| 92. 실제 assertion: link가 정확한 missing UTC range를 보존해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 93. 실제 assertion: frame-buffer fallback 뒤 같은 link가 fallback evidence로 갱신되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 94. 실제 assertion: 같은 event link의 overlap/fallback 갱신 뒤에도 SQLite projection을 유지해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 95. 실제 assertion: cam-late policy 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 96. 실제 assertion: segment finalize 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 97. 실제 assertion: 파생 중 원본 segment hold가 유지되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 98. 실제 assertion: 파생 중 원본 segment hold가 유지되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 99. 실제 assertion: 파생 중 원본 segment hold가 유지되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 100. 실제 assertion: 파생 중 원본 segment hold가 유지되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 101. 실제 assertion: anchor 없는 PTS를 finalized segment의 실제 PTS/UTC mapping으로 복구해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 102. 실제 assertion: PTS epoch anchor가 없으면 임의 UTC 연결이나 파생을 하면 안 됨 | 기존 승인 event runner 실제 검사 | pass |
| 103. 실제 assertion: anchor 없는 PTS는 UTC field가 아니라 재해석 가능한 PTS range로 보존해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 104. 실제 assertion: 같은 긴 prefix의 event ID도 SHA-256 기반 결정 ID가 충돌하면 안 됨 | 기존 승인 event runner 실제 검사 | pass |
| 105. 실제 assertion: 파생 중 원본 segment hold가 유지되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 106. 실제 assertion: 파생 중 원본 segment hold가 유지되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 107. 실제 assertion: 파생 중 원본 segment hold가 유지되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 108. 실제 assertion: 파생 중 원본 segment hold가 유지되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 109. 실제 assertion: 파생 중 원본 segment hold가 유지되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 110. 실제 assertion: 파생 중 원본 segment hold가 유지되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 111. 실제 assertion: 확장 회귀 journal open 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 112. 실제 assertion: 확장 회귀 initial catalog open 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 113. 실제 assertion: segment finalize 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 114. 실제 assertion: cleanup 확장 fixture 저장 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 115. 실제 assertion: cleanup 확장 fixture 저장 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 116. 실제 assertion: 확장 회귀 restart catalog open 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 117. 실제 assertion: 확장 policy 실패 | 기존 승인 event runner 실제 검사 | pass |
| 118. 실제 assertion: cleanup 확장 remux 실패는 한 번만 실행되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 119. 실제 assertion: 실패/Partial도 보류 확장 요청을 현재 범위로 소비해 보존해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 120. 실제 assertion: 실패/Partial도 보류 확장 요청을 현재 범위로 소비해 보존해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 121. 실제 assertion: PTS 확장은 다른 범위 ID를 사용해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 122. 실제 assertion: 미해석 PTS 확장을 이전 complete clip으로 응답하면 안 됨 | 기존 승인 event runner 실제 검사 | pass |
| 123. 실제 assertion: segment finalize 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 124. 실제 assertion: PTS 확장 2회는 최초 포함 총 3회 파생해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 125. 실제 assertion: quota journal open 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 126. 실제 assertion: quota catalog open 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 127. 실제 assertion: segment finalize 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 128. 실제 assertion: segment finalize 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 129. 실제 assertion: quota policy 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 130. 실제 assertion: event quota는 oldest event를 정리해 새 event write를 허용해야 함: ok | 기존 승인 event runner 실제 검사 | pass |
| 131. 실제 assertion: event quota 충족을 위해 continuous를 삭제하면 안 됨 | 기존 승인 event runner 실제 검사 | pass |
| 132. 실제 assertion: event quota는 oldest eligible event를 삭제해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 133. 실제 assertion: policy 재등록 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 134. 실제 assertion: policy 제거가 진행 중 event reservation을 지우면 안 됨 | 기존 승인 event runner 실제 검사 | pass |
| 135. 실제 assertion: 명시적 complete 뒤 event reservation ID를 재사용할 수 있어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 136. 실제 assertion: queue journal open 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 137. 실제 assertion: queue catalog open 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 138. 실제 assertion: segment finalize 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 139. 실제 assertion: queue policy 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 140. 실제 assertion: bounded queue 밖 durable pending도 완료 뒤 다시 흡수해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 141. 실제 assertion: 긴 event remux가 다른 이벤트의 durable link admission을 동기 차단하면 안 됨 | 기존 승인 event runner 실제 검사 | pass |
| 142. 실제 assertion: cleanup 실패 시 source hold와 event reservation을 성공처럼 해제하면 안 됨 | 기존 승인 event runner 실제 검사 | pass |
| 143. 실제 assertion: terminal marker unlink 실패 시 source/output hold를 유지해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 144. 실제 assertion: terminal marker unlink 실패 시 event reservation을 유지해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 145. 실제 assertion: marker 복구 중 event/fallback 갱신은 자원·단계를 보존하고 확장 요청을 내구 대기해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 146. 실제 assertion: terminal hold 해제 실패를 Complete로 기록하면 안 됨 | 기존 승인 event runner 실제 검사 | pass |
| 147. 실제 assertion: terminal 복구 중 event/fallback 갱신이 release 단계를 덮어쓰면 안 됨 | 기존 승인 event runner 실제 검사 | pass |
| 148. 실제 assertion: 복구 완료 뒤 내구 대기한 범위 확장은 같은 source epoch의 새 segment로 파생해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 149. 실제 assertion: terminal complete commit retry fixture 저장 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 150. 실제 assertion: complete commit 재시도는 다른 pending event의 source hold를 해제하면 안 됨 | 기존 승인 event runner 실제 검사 | pass |
| 151. 실제 assertion: overflow fixture 이전 hold_count가 저장 범위를 넘으면 안 됨 | 기존 승인 event runner 실제 검사 | pass |
| 152. 실제 assertion: hold overflow fixture 준비 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 153. 실제 assertion: event source lease hold_count overflow를 사전에 거부해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 154. 실제 assertion: hold fixture journal open 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 155. 실제 assertion: hold fixture catalog open 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 156. 실제 assertion: segment finalize 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 157. 실제 assertion: segment finalize 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 158. 실제 assertion: hold pending link 저장 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 159. 실제 assertion: hold replay journal open 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 160. 실제 assertion: hold replay catalog open 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 161. 실제 assertion: 재시작 replay가 terminal 전 output/source hold를 함께 복원해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 162. 실제 assertion: terminal stage fixture event link 조회 | 기존 승인 event runner 실제 검사 | pass |
| 163. 실제 assertion: terminal stage fixture 저장 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 164. 실제 assertion: terminal stage replay journal open:  | 기존 승인 event runner 실제 검사 | pass |
| 165. 실제 assertion: terminal stage catalog open:  | 기존 승인 event runner 실제 검사 | pass |
| 166. 실제 assertion: complete commit 단계 재시작은 이미 해제된 output/source hold를 복원하면 안 됨 | 기존 승인 event runner 실제 검사 | pass |
| 167. 실제 assertion: terminal Complete 기록 전 source 삭제 요청을 차단해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 168. 실제 assertion: terminal Complete 기록 전 output 삭제 요청을 차단해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 169. 실제 assertion: restart journal open 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 170. 실제 assertion: restart catalog open 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 171. 실제 assertion: segment finalize 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 172. 실제 assertion: segment finalize 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 173. 실제 assertion: restart pending link 저장 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 174. 실제 assertion: 재시작은 이미 finalized된 결정적 event segment를 재파생 없이 연결해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 175. 실제 assertion: 재시작 복구에서 event clip을 중복 파생하면 안 됨 | 기존 승인 event runner 실제 검사 | pass |
| 176. 실제 assertion: segment finalize 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 177. 실제 assertion: conflict pending link 저장 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 178. 실제 assertion: 다른 channel/class의 동일 segment ID를 event 결과로 오인하면 안 됨 | 기존 승인 event runner 실제 검사 | pass |
| 179. 실제 assertion: segment ID conflict에서 파생을 실행하면 안 됨 | 기존 승인 event runner 실제 검사 | pass |
| 180. 실제 assertion: 실제 H264/MP4 source를 video 재인코딩 없이 remux해야 함:  | 기존 승인 event runner 실제 검사 | pass |
| 181. 실제 assertion: remux 결과 파일과 size가 일치해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 182. 실제 assertion: event clip actual range는 keyframe 확대를 측정해 requested range와 분리해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 183. 실제 assertion: event clip이 source segment 전체 단순 연결보다 작아야 함 | 기존 승인 event runner 실제 검사 | pass |
| 184. 실제 assertion: remux 결과 checksum과 crash cleanup marker를 남겨야 함 | 기존 승인 event runner 실제 검사 | pass |
| 185. 실제 assertion: 동일 final은 소유 artifact가 없는 terminal 충돌로 거부하고 기존 clip을 보존해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 186. 실제 assertion: 파생 H264/MP4 clip이 끝까지 demux/parse 가능해야 함:  | 기존 승인 event runner 실제 검사 | pass |
| 187. 실제 assertion: nonce partial은 foreign 고정 partial을 보존하면서 독립 파생되어야 함 | 기존 승인 event runner 실제 검사 | pass |
| 188. 실제 assertion: event remux recovery journal open 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 189. 실제 assertion: 재시작은 marker nonce와 일치하는 owned crash partial만 정리해야 함:  | 기존 승인 event runner 실제 검사 | pass |
| 190. 실제 assertion: owned crash partial 복구 뒤 동일 event clip 재파생이 성공해야 함:  | 기존 승인 event runner 실제 검사 | pass |
| 191. 실제 assertion: VP8/WebM test source 생성 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 192. 실제 assertion: VP8/WebM test source demux 실패:  | 기존 승인 event runner 실제 검사 | pass |
| 193. 실제 assertion: 검증되지 않은 VP8/WebM event remux는 산출물 없이 fail-closed해야 함 | 기존 승인 event runner 실제 검사 | pass |
| 194. application: application header is standard-only with exact DTO/default manifests | 기존 승인 event runner 실제 검사 | pass |
| 195. application: application source owns exact canonical mapping and overwrite semantics | 기존 승인 event runner 실제 검사 | pass |
| 196. application: transport has zero canonical bypass and exact projection/call ordering | 기존 승인 event runner 실제 검사 | pass |
| 197. application: recording link is durably admitted before the bounded storage queue can drop an event | 기존 승인 event runner 실제 검사 | pass |
| 198. application: event clip output remains fd-bound and measured before no-replace publication | 기존 승인 event runner 실제 검사 | pass |
| 199. application: compiled fake canonical matrix preserves all fields failure/null outputs and lifecycle order | 기존 승인 event runner 실제 검사 | pass |
| 200. application: S05 composition starts the bridge before ingress and drains it after storage | 기존 승인 event runner 실제 검사 | pass |
| 201. runtime disabled-admit: 실제 EventStorage worker 진입을 관찰한다 | 기존 승인 event runner 실제 검사 | pass |
| 202. runtime disabled-admit: worker 처리 전에 첫 이벤트 연결이 내구 접수된다 | 기존 승인 event runner 실제 검사 | pass |
| 203. runtime disabled-admit: 실제 저장 큐 크기 2에서 다섯 접수 중 두 이벤트가 퇴출된다 | 기존 승인 event runner 실제 검사 | pass |
| 204. runtime disabled-admit: 퇴출 이벤트를 포함한 다섯 PTS 연결이 worker 해제 전에 보존된다 | 기존 승인 event runner 실제 검사 | pass |
| 205. runtime disabled-admit: 저장 worker drain 뒤에도 다섯 연결과 시간축이 보존된다 | 기존 승인 event runner 실제 검사 | pass |
| 206. runtime disabled-admit: JSONL 설정에 따른 실제 저장 수와 빈 큐를 확인한다 | 기존 승인 event runner 실제 검사 | pass |
| 207. runtime disabled-admit: JSONL 비활성은 파일 없음이고 활성은 생존 이벤트 세 개와 link ID가 일치한다 | 기존 승인 event runner 실제 검사 | pass |
| 208. runtime disabled-recover: 새 프로세스의 빈 SQLite를 journal로 재구축해 다섯 PTS 연결을 복구한다 | 기존 승인 event runner 실제 검사 | pass |
| 209. runtime disabled-recover: 퇴출 이벤트까지 UTC 매핑 후 다섯 실제 H264 파생 파일이 완료된다 | 기존 승인 event runner 실제 검사 | pass |
| 210. runtime disabled-recover: 같은 이벤트 재접수는 복구된 다섯 clip ID를 바꾸거나 추가하지 않는다 | 기존 승인 event runner 실제 검사 | pass |
| 211. runtime enabled-admit: 실제 EventStorage worker 진입을 관찰한다 | 기존 승인 event runner 실제 검사 | pass |
| 212. runtime enabled-admit: worker 처리 전에 첫 이벤트 연결이 내구 접수된다 | 기존 승인 event runner 실제 검사 | pass |
| 213. runtime enabled-admit: 실제 저장 큐 크기 2에서 다섯 접수 중 두 이벤트가 퇴출된다 | 기존 승인 event runner 실제 검사 | pass |
| 214. runtime enabled-admit: 퇴출 이벤트를 포함한 다섯 PTS 연결이 worker 해제 전에 보존된다 | 기존 승인 event runner 실제 검사 | pass |
| 215. runtime enabled-admit: 저장 worker drain 뒤에도 다섯 연결과 시간축이 보존된다 | 기존 승인 event runner 실제 검사 | pass |
| 216. runtime enabled-admit: JSONL 설정에 따른 실제 저장 수와 빈 큐를 확인한다 | 기존 승인 event runner 실제 검사 | pass |
| 217. runtime enabled-admit: JSONL 비활성은 파일 없음이고 활성은 생존 이벤트 세 개와 link ID가 일치한다 | 기존 승인 event runner 실제 검사 | pass |
| 218. runtime enabled-recover: 새 프로세스의 빈 SQLite를 journal로 재구축해 다섯 PTS 연결을 복구한다 | 기존 승인 event runner 실제 검사 | pass |
| 219. runtime enabled-recover: 퇴출 이벤트까지 UTC 매핑 후 다섯 실제 H264 파생 파일이 완료된다 | 기존 승인 event runner 실제 검사 | pass |
| 220. runtime enabled-recover: 같은 이벤트 재접수는 복구된 다섯 clip ID를 바꾸거나 추가하지 않는다 | 기존 승인 event runner 실제 검사 | pass |
| 221. runtime shutdown-cancel: post-event frame 대기 중인 실제 storage worker를 관찰한다 | 기존 승인 event runner 실제 검사 | pass |
| 222. runtime shutdown-cancel: 종료 신호가 post-event frame 대기를 깨워 1초 안에 worker를 drain한다 | 기존 승인 event runner 실제 검사 | pass |
| 223. runtime shutdown-cancel: frame 대기 취소 뒤에도 EventRecord JSONL을 유실하지 않는다 | 기존 승인 event runner 실제 검사 | pass |
| 224. disabled-guard: PASS (실제 assertion의 RED 확인) | 기존 승인 event runner 실제 검사 | pass |
| 225. prequeue-admission: PASS (실제 assertion의 RED 확인) | 기존 승인 event runner 실제 검사 | pass |
| 226. V410-S05-I01: V410-S05-I01-C01 PASS executions=1; V410-S05-I01-C02 PASS executions=1; V410-S05-I01-C03 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 227. V410-S05-I02: V410-S05-I02-C01 PASS executions=1; V410-S05-I02-C02 PASS executions=1; V410-S05-I02-C03 PASS executions=1; V410-S05-I02-C04 PASS executions=1; V410-S05-I02-C05 PASS executions=1; V410-S05-I02-C06 PASS executions=1; V410-S05-I02-C07 PASS executions=1; V410-S05-I02-C08 PASS executions=1; V410-S05-I02-C09 PASS executions=1; V410-S05-I02-C10 PASS executions=1; V410-S05-I02-C11 PASS executions=1; V410-S05-I02-C12 PASS executions=1; V410-S05-I02-C13 PASS executions=1; V410-S05-I02-C14 PASS executions=1; V410-S05-I02-C15 PASS executions=1; V410-S05-I02-C16 PASS executions=1; V410-S05-I02-C17 PASS executions=1; V410-S05-I02-C18 PASS executions=1; V410-S05-I02-C19 PASS executions=1; V410-S05-I02-C20 PASS executions=1; V410-S05-I02-C21 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 228. V410-S05-I03: V410-S05-I03-C01 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 229. V410-S05-I04: V410-S05-I04-C01 PASS executions=1; V410-S05-I04-C02 PASS executions=1; V410-S05-I04-C03 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 230. V410-S05-I05: V410-S05-I05-C01 PASS executions=1; V410-S05-I05-C02 PASS executions=1; V410-S05-I05-C03 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 231. V410-S05-I06: V410-S05-I06-C01 PASS executions=1; V410-S05-I06-C02 PASS executions=1; V410-S05-I06-C03 PASS executions=1; V410-S05-I06-C04 PASS executions=1; V410-S05-I06-C05 PASS executions=1; V410-S05-I06-C06 PASS executions=1; V410-S05-I06-C07 PASS executions=1; V410-S05-I06-C08 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 232. V410-S05-I07: V410-S05-I07-C01 PASS executions=1; V410-S05-I07-C02 PASS executions=1; V410-S05-I07-C03 PASS executions=1; V410-S05-I07-C04 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 233. V410-S05-I08: V410-S05-I08-C01 PASS executions=17; V410-S05-I08-C02 PASS executions=3 | 기존 승인 event runner 실제 검사 | pass |
| 234. V410-S05-I09: V410-S05-I09-C01 PASS executions=1; V410-S05-I09-C02 PASS executions=1; V410-S05-I09-C03 PASS executions=1; V410-S05-I09-C04 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 235. V410-S05-I10: V410-S05-I10-C01 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 236. V410-S05-I11: V410-S05-I11-C01 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 237. V410-S05-I12: V410-S05-I12-C01 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 238. V410-S05-I13: V410-S05-I13-C01 PASS executions=1; V410-S05-I13-C02 PASS executions=1; V410-S05-I13-C03 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 239. V410-S05-I14: V410-S05-I14-C01 PASS executions=1; V410-S05-I14-C02 PASS executions=1; V410-S05-I14-C03 PASS executions=1; V410-S05-I14-C04 PASS executions=1; V410-S05-I14-C05 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 240. V410-S05-I15: V410-S05-I15-C01 PASS executions=1; V410-S05-I15-C02 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 241. V410-S05-I16: V410-S05-I16-C01 PASS executions=1; V410-S05-I16-C02 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 242. V410-S05-I17: V410-S05-I17-C01 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 243. V410-S05-I18: V410-S05-I18-C01 PASS executions=1; V410-S05-I18-C02 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 244. V410-S05-I19: V410-S05-I19-C01 PASS executions=1; V410-S05-I19-C02 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 245. V410-S05-I20: V410-S05-I20-C01 PASS executions=1; V410-S05-I20-C02 PASS executions=1; V410-S05-I20-C03 PASS executions=1; V410-S05-I20-C04 PASS executions=1; V410-S05-I20-C05 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 246. V410-S05-I21: V410-S05-I21-C01 PASS executions=1; V410-S05-I21-C02 PASS executions=2; V410-S05-I21-C03 PASS executions=1; V410-S05-I21-C04 PASS executions=1; V410-S05-I21-C05 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 247. V410-S05-I22: V410-S05-I22-C01 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 248. V410-S05-I23: V410-S05-I23-C01 PASS executions=1; V410-S05-I23-C02 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 249. V410-S05-I24: V410-S05-I24-C01 PASS executions=1; V410-S05-I24-C02 PASS executions=1; V410-S05-I24-C03 PASS executions=1; V410-S05-I24-C04 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 250. V410-S05-I25: V410-S05-I25-C01 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 251. V410-S05-I26: V410-S05-I26-C01 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |
| 252. V410-S05-I27: V410-S05-I27-C01 PASS executions=1; V410-S05-I27-C02 PASS executions=1; V410-S05-I27-C03 PASS executions=1; V410-S05-I27-C04 PASS executions=1 | 기존 승인 event runner 실제 검사 | pass |

## 원출력·cleanup

모든 반환 chunk를 합쳐 보존했다. 각 로그는 명령·exit를 포함하며 event 로그의 행말 공백만 의미 보존 정규화했다. 로그는 비밀·미디어가 아닌 격리 fixture 검사 증거다.

| 로그 | 소유 임시 경로 | 삭제 전 bytes | 결과 |
| --- | --- | ---: | --- |
| [ReferenceRed.log](ReferenceRed.log) | `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-consumer-reference.8w1Y40` | 3504765 | removed=true·부재 직접 확인 |
| [ConnectionRed.log](ConnectionRed.log) | `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-consumer-connection.8JteiK` | 4550944 | removed=true·부재 직접 확인 |
| [ReferenceGreen.log](ReferenceGreen.log) | `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-consumer-reference.OVtQYW` | 3504765 | removed=true·부재 직접 확인 |
| [ConnectionGreen.log](ConnectionGreen.log) | `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-consumer-connection.ACfr27` | 4560372 | removed=true·부재 직접 확인 |
| [Event.log](Event.log) | `/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_s05_storage_runtime_yUs9JP` | 14564374 | 47개 파일, removed=true·부재 직접 확인 |
| [Event.log](Event.log) | `/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T//media_server_v410_event_recording.6vKRoD` | 4685691 | removed=true·부재 직접 확인 |

Build는 신규 임시 root/서버 기동 없이 기존 build output을 유지했다(메인 보고). 원출력은 재현·실패 이력 비교용으로 이 저장소 증적 디렉터리에 보존하며 외부 endpoint·운영 파일·비밀번호를 포함하지 않는다.

## 동결 및 미실행

- 담당 변경: `src/recording/recording_contracts.cpp` 조건 제거+주석, `scripts/internal/recording_consumer_reference_smoke.cpp`, `scripts/internal/recording_consumer_connection_smoke.cpp`, 본 증적만.
- 기존 S09 dirty는 보존했으며 bridge/public schema/시간 변환/원장 schema는 변경하지 않았다.
- 기준 HEAD: `cbbe0500ad882dce4156af0f5b41e6ab691b0cc4`.
- contracts SHA256: `82c13c18ee031bf86450f3724af146fa9bcebe312c415ed6ee5b4567108b1a67`.
- reference test SHA256: `9694af540d61beff8c3757ebad6ae3158d75f69e9ec2527ba092e2fdcbabf73c`.
- connection test SHA256: `3a72d266c6738f4d17686c5f6e82005125f981f8fab490cf85a6ab3bc38bd3c4`.
- 메인 Build.log SHA256: `70661cedeef36044b0651f566ab6b256f25bdfd2d3a94152ae7be14e7547254c`.
- 실행 환경은 현재 macOS이며 Linux 실행·구형 바이너리 downgrade·실제 UI·장시간·새 파생 기능은 미실행이다.
- 소스 동결 후 메인에게 검토 인계한다. 담당자 커밋·푸시는 수행하지 않았다.

## 메인 최종 대조

제품 한 조건 제거와 두 테스트 diff를 직접 검토했다. 위 소스3개·Build.log SHA256은 실제 파일과 일치한다.
원출력의 소유 임시 경로6개는 메인도 다시 읽어 모두 부재를 확인했다. 기존 S09 변경은 커밋 대상에서 제외한다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| 문서 링크 | ./server.sh verify-docs-links exit0; 문서238/링크1951/이미지22/anchor108/색인76/제외153/실패0 | pass |
| 공백 대조 | git diff --check exit0 | pass |
| 인계 무결성 | SHA256 4개 일치·소유 임시 경로6개 부재, 직접 대조 exit0 | pass |

메인 대조의 elapsed/token은 별도 계측하지 않았다. 커밋 결과는 최종 대화/실제 Git 이력으로 구분하며 푸시는 이번 범위 밖이다.
