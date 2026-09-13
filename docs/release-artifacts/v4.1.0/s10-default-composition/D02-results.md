# S10 3D-2 D02 개별 결과

독자: 구현·검토 담당자. lifecycle: 격리 실행 증거 보존. 중앙 release-test-records의 상세 전수표이며 현재 제품 정책이 아니다. [보고서](D02-report.md)의 명령·exit·한계를 함께 대조한다.

## 현재 유효 결과

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| D02 결과 1 | [pass] D02-03 동일 source/channel/ns immutable snapshot 전달 | pass | [D02-ActualRuntimeIdleFixed.log:1](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 2 | [pass] D02-03 다른 channel 증거 혼합 거부 | pass | [D02-ActualRuntimeIdleFixed.log:2](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 3 | [pass] D02-03 stop namespace 증거 삭제 | pass | [D02-ActualRuntimeIdleFixed.log:3](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 4 | [pass] D02-03 cache capacity 이전 namespace eviction | pass | [D02-ActualRuntimeIdleFixed.log:4](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 5 | [pass] D02-03 전체 stop 후 publication/query 거부 | pass | [D02-ActualRuntimeIdleFixed.log:5](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 6 | [pass] D02-01 신규 root 자동 내구 store identity | pass | [D02-ActualRuntimeIdleFixed.log:6](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 7 | [pass] D02-01 재개방 동일 store identity | pass | [D02-ActualRuntimeIdleFixed.log:7](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 8 | [pass] D02-01 서로 다른 root 난수 identity 구별 | pass | [D02-ActualRuntimeIdleFixed.log:8](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 9 | [pass] D02-02 managed lease 동시 소유 거부 | pass | [D02-ActualRuntimeIdleFixed.log:9](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 10 | [pass] D02-01 명시 ID 기존 계약 유지 | pass | [D02-ActualRuntimeIdleFixed.log:10](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 11 | [pass] D02-02 명시 ID 충돌 원본 marker 보존 | pass | [D02-ActualRuntimeIdleFixed.log:11](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 12 | [pass] D02-02 같은 init 내구 ID 복구 | pass | [D02-ActualRuntimeIdleFixed.log:12](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 13 | [pass] D02-02 legacy nonempty 변환·삭제 거부 | pass | [D02-ActualRuntimeIdleFixed.log:13](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 14 | [pass] D02-02 손상/unknown marker 덮어쓰기 거부 | pass | [D02-ActualRuntimeIdleFixed.log:14](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 15 | [pass] D02-06 실제 H264 입력 준비 | pass | [D02-ActualRuntimeIdleFixed.log:15](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 16 | [pass] D02-05 실제 V2 finalized startup 미디어 전수 검사 | pass | [D02-ActualRuntimeIdleFixed.log:16](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 17 | [pass] D02-05 실제 V2 size/hash 손상 감지·catalog Mark | pass | [D02-ActualRuntimeIdleFixed.log:17](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 18 | [pass] D02-10 default 준비16s·500ms·33회 예산 | pass | [D02-ActualRuntimeIdleFixed.log:18](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 19 | [pass] D02-10 overflow 요청은60s/121회 capped 사유 보존 | pass | [D02-ActualRuntimeIdleFixed.log:19](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 20 | [pass] D02-06 on 구성의 동일 managed store/catalog writer 결박 | pass | [D02-ActualRuntimeIdleFixed.log:20](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 21 | [pass] D02-07 빈 저장소 runtime 복구 함수 | pass | [D02-ActualRuntimeIdleFixed.log:21](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 22 | [pass] D02-06 off managed 형식 유지·미디어 비생산 | pass | [D02-ActualRuntimeIdleFixed.log:22](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 23 | [pass] D02-04/11 raw key→numeric 참조·history null provider 접수·공개 record 불변 | pass | [D02-ActualRuntimeIdleFixed.log:23](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 24 | [pass] D02-11 raw stream/channel/sourcecontext 모순은 신규 저장·접수 없음 | pass | [D02-ActualRuntimeIdleFixed.log:24](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 25 | [pass] D02-06 off/on 재개방 동일 store identity | pass | [D02-ActualRuntimeIdleFixed.log:26](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 26 | [pass] D02-07 실제 producer 시작 전 runtime 복구 | pass | [D02-ActualRuntimeIdleFixed.log:27](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 27 | [pass] D02-06 실제 supervisor/session off 생산0·기존 segment 보존 | pass | [D02-ActualRuntimeIdleFixed.log:28](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 28 | [pass] D02-08 실제 source/session 종료 owner0 | pass | [D02-ActualRuntimeIdleFixed.log:29](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 29 | [pass] D02-06 off/on 재개방 동일 store identity | pass | [D02-ActualRuntimeIdleFixed.log:30](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 30 | [pass] D02-07 실제 producer 시작 전 runtime 복구 | pass | [D02-ActualRuntimeIdleFixed.log:31](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 31 | [pass] D02-06 실제 supervisor/session on 숫자 채널 V2 파일 생성 | pass | [D02-ActualRuntimeIdleFixed.log:32](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 32 | [pass] D02-08 실제 source/session 종료 owner0 | pass | [D02-ActualRuntimeIdleFixed.log:33](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 33 | [pass] D02-06 off/on 재개방 동일 store identity | pass | [D02-ActualRuntimeIdleFixed.log:34](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 34 | [pass] D02-07 실제 producer 시작 전 runtime 복구 | pass | [D02-ActualRuntimeIdleFixed.log:35](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 35 | [pass] D02-06 실제 supervisor/session off 생산0·기존 segment 보존 | pass | [D02-ActualRuntimeIdleFixed.log:36](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 36 | [pass] D02-08 실제 source/session 종료 owner0 | pass | [D02-ActualRuntimeIdleFixed.log:37](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 37 | [pass] D02-06 off/on 재개방 동일 store identity | pass | [D02-ActualRuntimeIdleFixed.log:38](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 38 | [pass] D02-07 실제 producer 시작 전 runtime 복구 | pass | [D02-ActualRuntimeIdleFixed.log:39](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 39 | [pass] D02-06 실제 supervisor/session on 숫자 채널 V2 파일 생성 | pass | [D02-ActualRuntimeIdleFixed.log:40](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 40 | [pass] D02-08 실제 source/session 종료 owner0 | pass | [D02-ActualRuntimeIdleFixed.log:41](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 41 | [pass] D02-04/10 실제 default10s+post5s 후행 finalize·동시 실제decoder cache·2출력 decode | pass | [D02-ActualRuntimeIdleFixed.log:46](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 42 | [pass] D02-01 crypto-off OS CSPRNG 생성/재개방 identity | pass | [D02-ActualRuntimeIdleFixed.log:48](D02-ActualRuntimeIdleFixed.log) |
| D02 결과 43 | [pass] D02-08 provider 조회 재진입·동시 멱등·Stop 후 Submit 재검사 | pass | [D02-ClosingActual.log:49](D02-ClosingActual.log) — child 준비 오류 전 완료된 독립 provider 검사만 유지 |
| D02 결과 44 | [pass] D02-07 runtime startup committed-parent recovery/보호/물리검사 순서 | pass | [D02-RecoveryOnly.log:2](D02-RecoveryOnly.log) |
| D02 결과 45 | [pass] D02-07 runtime startup blocked-parent recovery/보호/물리검사 순서 | pass | [D02-RecoveryOnly.log:4](D02-RecoveryOnly.log) |
| D02 결과 46 | [pass] D02-07 runtime startup intent recovery/보호/물리검사 순서 | pass | [D02-RecoveryOnly.log:5](D02-RecoveryOnly.log) |
| D02 결과 47 | [pass] journal open:  | pass | [D02-CatalogRegression.log:1](D02-CatalogRegression.log) |
| D02 결과 48 | [pass] fallback catalog open:  | pass | [D02-CatalogRegression.log:2](D02-CatalogRegression.log) |
| D02 결과 49 | [pass] SQLite off mode 표시 | pass | [D02-CatalogRegression.log:3](D02-CatalogRegression.log) |
| D02 결과 50 | [pass] segment finalize journal+projection:  | pass | [D02-CatalogRegression.log:4](D02-CatalogRegression.log) |
| D02 결과 51 | [pass] fallback range query | pass | [D02-CatalogRegression.log:5](D02-CatalogRegression.log) |
| D02 결과 52 | [pass] event link FK 위반 거부 | pass | [D02-CatalogRegression.log:6](D02-CatalogRegression.log) |
| D02 결과 53 | [pass] FK 위반 transaction/journal 전체 rollback | pass | [D02-CatalogRegression.log:7](D02-CatalogRegression.log) |
| D02 결과 54 | [pass] 최초 durable mutation 1개 | pass | [D02-CatalogRegression.log:8](D02-CatalogRegression.log) |
| D02 결과 55 | [pass] 동일 mutation 중복 append | pass | [D02-CatalogRegression.log:9](D02-CatalogRegression.log) |
| D02 결과 56 | [pass] 손상 사이 정상 durable mutation 보존 | pass | [D02-CatalogRegression.log:10](D02-CatalogRegression.log) |
| D02 결과 57 | [pass] 중간 corrupt line count | pass | [D02-CatalogRegression.log:11](D02-CatalogRegression.log) |
| D02 결과 58 | [pass] 마지막 truncated line skip | pass | [D02-CatalogRegression.log:12](D02-CatalogRegression.log) |
| D02 결과 59 | [pass] fallback replay open | pass | [D02-CatalogRegression.log:13](D02-CatalogRegression.log) |
| D02 결과 60 | [pass] 같은 mutation idempotent replay | pass | [D02-CatalogRegression.log:14](D02-CatalogRegression.log) |
| D02 결과 61 | [pass] 재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존 | pass | [D02-CatalogRegression.log:15](D02-CatalogRegression.log) |
| D02 결과 62 | [pass] 중복 replay row/합계 불증가 | pass | [D02-CatalogRegression.log:16](D02-CatalogRegression.log) |
| D02 결과 63 | [pass] 추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구:  | pass | [D02-CatalogRegression.log:17](D02-CatalogRegression.log) |
| D02 결과 64 | [pass] writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed | pass | [D02-CatalogRegression.log:18](D02-CatalogRegression.log) |
| D02 결과 65 | [pass] v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed | pass | [D02-CatalogRegression.log:19](D02-CatalogRegression.log) |
| D02 결과 66 | [pass] SQLite catalog open/rebuild:  | pass | [D02-CatalogRegression.log:20](D02-CatalogRegression.log) |
| D02 결과 67 | [pass] SQLite primary mode 표시 | pass | [D02-CatalogRegression.log:21](D02-CatalogRegression.log) |
| D02 결과 68 | [pass] SQLite on/off range query ID·순서 parity | pass | [D02-CatalogRegression.log:22](D02-CatalogRegression.log) |
| D02 결과 69 | [pass] journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분 | pass | [D02-CatalogRegression.log:23](D02-CatalogRegression.log) |
| D02 결과 70 | [pass] journal 없는 손상 media orphan 구분 | pass | [D02-CatalogRegression.log:24](D02-CatalogRegression.log) |
| D02 결과 71 | [pass] projection failover journal open:  | pass | [D02-CatalogRegression.log:25](D02-CatalogRegression.log) |
| D02 결과 72 | [pass] projection failover catalog open:  | pass | [D02-CatalogRegression.log:26](D02-CatalogRegression.log) |
| D02 결과 73 | [pass] 실제 SQLite INSERT 실패 trigger 설치 | pass | [D02-CatalogRegression.log:27](D02-CatalogRegression.log) |
| D02 결과 74 | [pass] SQLite 투영 실패 뒤 journal+memory finalize 유지:  | pass | [D02-CatalogRegression.log:28](D02-CatalogRegression.log) |
| D02 결과 75 | [pass] SQLite 투영 실패 즉시 JSONL fallback 전환 | pass | [D02-CatalogRegression.log:29](D02-CatalogRegression.log) |
| D02 결과 76 | [pass] 재시작 rebuild 전 실패 trigger 제거 | pass | [D02-CatalogRegression.log:30](D02-CatalogRegression.log) |
| D02 결과 77 | [pass] 투영 실패 직후 in-memory query 정합성 유지 | pass | [D02-CatalogRegression.log:31](D02-CatalogRegression.log) |
| D02 결과 78 | [pass] projection failover 재시작 journal rebuild:  | pass | [D02-CatalogRegression.log:32](D02-CatalogRegression.log) |
| D02 결과 79 | [pass] 재시작 후 journal에서 누락 SQLite projection 복구 | pass | [D02-CatalogRegression.log:33](D02-CatalogRegression.log) |
| D02 결과 80 | [pass] 재시작 후 SQLite primary 복귀 | pass | [D02-CatalogRegression.log:34](D02-CatalogRegression.log) |
| D02 결과 81 | [pass] 재시작 journal rebuild가 실제 SQLite row 복원 | pass | [D02-CatalogRegression.log:35](D02-CatalogRegression.log) |
| D02 결과 82 | [pass] tombstone journal open:  | pass | [D02-CatalogRegression.log:36](D02-CatalogRegression.log) |
| D02 결과 83 | [pass] tombstone catalog open:  | pass | [D02-CatalogRegression.log:37](D02-CatalogRegression.log) |
| D02 결과 84 | [pass] tombstone 대상 segment finalize:  | pass | [D02-CatalogRegression.log:38](D02-CatalogRegression.log) |
| D02 결과 85 | [pass] tombstone 대상 deletion request:  | pass | [D02-CatalogRegression.log:39](D02-CatalogRegression.log) |
| D02 결과 86 | [pass] tombstone 완료 기록:  | pass | [D02-CatalogRegression.log:40](D02-CatalogRegression.log) |
| D02 결과 87 | [pass] catalog finalize가 tombstone segment ID 재사용을 거부해야 함 | pass | [D02-CatalogRegression.log:41](D02-CatalogRegression.log) |
| D02 결과 88 | [pass] 손상 SQLite 격리 후 journal rebuild:  | pass | [D02-CatalogRegression.log:42](D02-CatalogRegression.log) |
| D02 결과 89 | [pass] 손상 SQLite 원본 격리 | pass | [D02-CatalogRegression.log:43](D02-CatalogRegression.log) |
| D02 결과 90 | [pass] 격리 SQLite 파일 보존 | pass | [D02-CatalogRegression.log:44](D02-CatalogRegression.log) |
| D02 결과 91 | [pass] 격리 후 journal rebuild 결과 | pass | [D02-CatalogRegression.log:45](D02-CatalogRegression.log) |
| D02 결과 92 | [pass] S10-3A future-schema journal read open | pass | [D02-CatalogRegression.log:46](D02-CatalogRegression.log) |
| D02 결과 93 | [pass] S10-3A future-schema unsupported classification | pass | [D02-CatalogRegression.log:47](D02-CatalogRegression.log) |
| D02 결과 94 | [pass] S10-3A future-schema catalog open denied | pass | [D02-CatalogRegression.log:48](D02-CatalogRegression.log) |
| D02 결과 95 | [pass] S10-3A future-schema catalog retry denied | pass | [D02-CatalogRegression.log:49](D02-CatalogRegression.log) |
| D02 결과 96 | [pass] S10-3A future-schema journal bytes preserved | pass | [D02-CatalogRegression.log:50](D02-CatalogRegression.log) |
| D02 결과 97 | [pass] S10-3A future-schema SQLite bytes preserved | pass | [D02-CatalogRegression.log:51](D02-CatalogRegression.log) |
| D02 결과 98 | [pass] S10-3A future-schema writer cleanup untouched | pass | [D02-CatalogRegression.log:52](D02-CatalogRegression.log) |
| D02 결과 99 | [pass] S10-3A arbitrary-schema journal read open | pass | [D02-CatalogRegression.log:53](D02-CatalogRegression.log) |
| D02 결과 100 | [pass] S10-3A arbitrary-schema unsupported classification | pass | [D02-CatalogRegression.log:54](D02-CatalogRegression.log) |
| D02 결과 101 | [pass] S10-3A arbitrary-schema catalog open denied | pass | [D02-CatalogRegression.log:55](D02-CatalogRegression.log) |
| D02 결과 102 | [pass] S10-3A arbitrary-schema catalog retry denied | pass | [D02-CatalogRegression.log:56](D02-CatalogRegression.log) |
| D02 결과 103 | [pass] S10-3A arbitrary-schema journal bytes preserved | pass | [D02-CatalogRegression.log:57](D02-CatalogRegression.log) |
| D02 결과 104 | [pass] S10-3A arbitrary-schema SQLite bytes preserved | pass | [D02-CatalogRegression.log:58](D02-CatalogRegression.log) |
| D02 결과 105 | [pass] S10-3A arbitrary-schema writer cleanup untouched | pass | [D02-CatalogRegression.log:59](D02-CatalogRegression.log) |
| D02 결과 106 | [pass] S10-3A empty-schema journal read open | pass | [D02-CatalogRegression.log:60](D02-CatalogRegression.log) |
| D02 결과 107 | [pass] S10-3A empty-schema unsupported classification | pass | [D02-CatalogRegression.log:61](D02-CatalogRegression.log) |
| D02 결과 108 | [pass] S10-3A empty-schema catalog open denied | pass | [D02-CatalogRegression.log:62](D02-CatalogRegression.log) |
| D02 결과 109 | [pass] S10-3A empty-schema catalog retry denied | pass | [D02-CatalogRegression.log:63](D02-CatalogRegression.log) |
| D02 결과 110 | [pass] S10-3A empty-schema journal bytes preserved | pass | [D02-CatalogRegression.log:64](D02-CatalogRegression.log) |
| D02 결과 111 | [pass] S10-3A empty-schema SQLite bytes preserved | pass | [D02-CatalogRegression.log:65](D02-CatalogRegression.log) |
| D02 결과 112 | [pass] S10-3A empty-schema writer cleanup untouched | pass | [D02-CatalogRegression.log:66](D02-CatalogRegression.log) |
| D02 결과 113 | [pass] S10-3A future-type journal read open | pass | [D02-CatalogRegression.log:67](D02-CatalogRegression.log) |
| D02 결과 114 | [pass] S10-3A future-type unsupported classification | pass | [D02-CatalogRegression.log:68](D02-CatalogRegression.log) |
| D02 결과 115 | [pass] S10-3A future-type catalog open denied | pass | [D02-CatalogRegression.log:69](D02-CatalogRegression.log) |
| D02 결과 116 | [pass] S10-3A future-type catalog retry denied | pass | [D02-CatalogRegression.log:70](D02-CatalogRegression.log) |
| D02 결과 117 | [pass] S10-3A future-type journal bytes preserved | pass | [D02-CatalogRegression.log:71](D02-CatalogRegression.log) |
| D02 결과 118 | [pass] S10-3A future-type SQLite bytes preserved | pass | [D02-CatalogRegression.log:72](D02-CatalogRegression.log) |
| D02 결과 119 | [pass] S10-3A future-type writer cleanup untouched | pass | [D02-CatalogRegression.log:73](D02-CatalogRegression.log) |
| D02 결과 120 | [pass] S10-3A malformed journal open | pass | [D02-CatalogRegression.log:74](D02-CatalogRegression.log) |
| D02 결과 121 | [pass] S10-3A malformed JSON missing fields and wrong types remain corrupt | pass | [D02-CatalogRegression.log:75](D02-CatalogRegression.log) |
| D02 결과 122 | [pass] S10-O01 reservation journal open | pass | [D02-CatalogRegression.log:76](D02-CatalogRegression.log) |
| D02 결과 123 | [pass] S10-O01 first reservation returns four IDs and sequence one | pass | [D02-CatalogRegression.log:77](D02-CatalogRegression.log) |
| D02 결과 124 | [pass] S10-O01 versioned reservation payload replays | pass | [D02-CatalogRegression.log:78](D02-CatalogRegression.log) |
| D02 결과 125 | [pass] S10-O01 new reservation records actual occurred time | pass | [D02-CatalogRegression.log:79](D02-CatalogRegression.log) |
| D02 결과 126 | [pass] S10-O02 identical retry preserves sequence and bytes | pass | [D02-CatalogRegression.log:80](D02-CatalogRegression.log) |
| D02 결과 127 | [pass] S10-O03 reopened instance allocates next sequence | pass | [D02-CatalogRegression.log:81](D02-CatalogRegression.log) |
| D02 결과 128 | [pass] S10-O03 new process resumes durable sequence | pass | [D02-CatalogRegression.log:82](D02-CatalogRegression.log) |
| D02 결과 129 | [pass] S10-O04 different store rejected | pass | [D02-CatalogRegression.log:83](D02-CatalogRegression.log) |
| D02 결과 130 | [pass] S10-O04 reused request with different segment rejected | pass | [D02-CatalogRegression.log:84](D02-CatalogRegression.log) |
| D02 결과 131 | [pass] S10-O04 reused request with different channel rejected | pass | [D02-CatalogRegression.log:85](D02-CatalogRegression.log) |
| D02 결과 132 | [pass] S10-O04 reused segment with different request rejected | pass | [D02-CatalogRegression.log:86](D02-CatalogRegression.log) |
| D02 결과 133 | [pass] S10-O04 conflicts preserve original bytes | pass | [D02-CatalogRegression.log:87](D02-CatalogRegression.log) |
| D02 결과 134 | [pass] S10-O05/O06 reject and preserve corrupt | pass | [D02-CatalogRegression.log:88](D02-CatalogRegression.log) |
| D02 결과 135 | [pass] S10-O05/O06 reject and preserve unsupported-schema | pass | [D02-CatalogRegression.log:89](D02-CatalogRegression.log) |
| D02 결과 136 | [pass] S10-O05/O06 reject and preserve unsupported-type | pass | [D02-CatalogRegression.log:90](D02-CatalogRegression.log) |
| D02 결과 137 | [pass] S10-O05/O06 reject and preserve tail | pass | [D02-CatalogRegression.log:91](D02-CatalogRegression.log) |
| D02 결과 138 | [pass] S10-O05/O06 reject and preserve payload-zero | pass | [D02-CatalogRegression.log:92](D02-CatalogRegression.log) |
| D02 결과 139 | [pass] S10-O05/O06 reject and preserve payload-negative | pass | [D02-CatalogRegression.log:93](D02-CatalogRegression.log) |
| D02 결과 140 | [pass] S10-O05/O06 reject and preserve payload-fraction | pass | [D02-CatalogRegression.log:94](D02-CatalogRegression.log) |
| D02 결과 141 | [pass] S10-O05/O06 reject and preserve payload-overflow | pass | [D02-CatalogRegression.log:95](D02-CatalogRegression.log) |
| D02 결과 142 | [pass] S10-O05/O06 reject and preserve duplicate-sequence | pass | [D02-CatalogRegression.log:96](D02-CatalogRegression.log) |
| D02 결과 143 | [pass] S10-O05/O06 reject and preserve decreasing-sequence | pass | [D02-CatalogRegression.log:97](D02-CatalogRegression.log) |
| D02 결과 144 | [pass] S10-O05/O06 reject and preserve duplicate-request | pass | [D02-CatalogRegression.log:98](D02-CatalogRegression.log) |
| D02 결과 145 | [pass] S10-O05/O06 reject and preserve duplicate-segment | pass | [D02-CatalogRegression.log:99](D02-CatalogRegression.log) |
| D02 결과 146 | [pass] S10-O05/O06 reject and preserve store-conflict | pass | [D02-CatalogRegression.log:100](D02-CatalogRegression.log) |
| D02 결과 147 | [pass] S10-O05/O06 reject and preserve ordinary-before | pass | [D02-CatalogRegression.log:101](D02-CatalogRegression.log) |
| D02 결과 148 | [pass] S10-O05/O06 reject and preserve ordinary-after | pass | [D02-CatalogRegression.log:102](D02-CatalogRegression.log) |
| D02 결과 149 | [pass] S10-O05/O06 reject and preserve line-cap | pass | [D02-CatalogRegression.log:103](D02-CatalogRegression.log) |
| D02 결과 150 | [pass] S10-O05 reservation entity envelope binding rejects mismatch | pass | [D02-CatalogRegression.log:104](D02-CatalogRegression.log) |
| D02 결과 151 | [pass] S10-O05 reservation request envelope binding rejects mismatch | pass | [D02-CatalogRegression.log:105](D02-CatalogRegression.log) |
| D02 결과 152 | [pass] S10-O01 strict reservation parser accepts versioned literal | pass | [D02-CatalogRegression.log:106](D02-CatalogRegression.log) |
| D02 결과 153 | [pass] S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | pass | [D02-CatalogRegression.log:107](D02-CatalogRegression.log) |
| D02 결과 154 | [pass] S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | pass | [D02-CatalogRegression.log:108](D02-CatalogRegression.log) |
| D02 결과 155 | [pass] S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | pass | [D02-CatalogRegression.log:109](D02-CatalogRegression.log) |
| D02 결과 156 | [pass] S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | pass | [D02-CatalogRegression.log:110](D02-CatalogRegression.log) |
| D02 결과 157 | [pass] S10-O06 INT64_MAX identical retry remains valid | pass | [D02-CatalogRegression.log:111](D02-CatalogRegression.log) |
| D02 결과 158 | [pass] S10-O06 sequence overflow rejected without write | pass | [D02-CatalogRegression.log:112](D02-CatalogRegression.log) |
| D02 결과 159 | [pass] S10-O02 identical durable reservation duplicates remain idempotent | pass | [D02-CatalogRegression.log:113](D02-CatalogRegression.log) |
| D02 결과 160 | [pass] S10-O06 sequence gaps remain valid and allocate above maximum | pass | [D02-CatalogRegression.log:114](D02-CatalogRegression.log) |
| D02 결과 161 | [pass] S10-O07 four simultaneous processes finish reservations | pass | [D02-CatalogRegression.log:115](D02-CatalogRegression.log) |
| D02 결과 162 | [pass] S10-O07 concurrent sequences are unique and complete | pass | [D02-CatalogRegression.log:116](D02-CatalogRegression.log) |
| D02 결과 163 | [pass] S10-O07 next sequence follows concurrent reservations | pass | [D02-CatalogRegression.log:117](D02-CatalogRegression.log) |
| D02 결과 164 | [pass] S10-O08 ordinary Append cannot reserve orders | pass | [D02-CatalogRegression.log:118](D02-CatalogRegression.log) |
| D02 결과 165 | [pass] S10-O08 unopened journal rejected | pass | [D02-CatalogRegression.log:119](D02-CatalogRegression.log) |
| D02 결과 166 | [pass] S10-O08 null result rejected | pass | [D02-CatalogRegression.log:120](D02-CatalogRegression.log) |
| D02 결과 167 | [pass] S10-O08 invalid opaque ID rejected | pass | [D02-CatalogRegression.log:121](D02-CatalogRegression.log) |
| D02 결과 168 | [pass] S10-O08 failed reservation does not expose tentative result | pass | [D02-CatalogRegression.log:122](D02-CatalogRegression.log) |
| D02 결과 169 | [pass] S10-O09 unsafe file binding rejected and original preserved inode | pass | [D02-CatalogRegression.log:123](D02-CatalogRegression.log) |
| D02 결과 170 | [pass] S10-O09 unsafe file binding rejected and original preserved parent | pass | [D02-CatalogRegression.log:124](D02-CatalogRegression.log) |
| D02 결과 171 | [pass] S10-O09 unsafe file binding rejected and original preserved symlink | pass | [D02-CatalogRegression.log:125](D02-CatalogRegression.log) |
| D02 결과 172 | [pass] S10-O09 unsafe file binding rejected and original preserved hardlink | pass | [D02-CatalogRegression.log:126](D02-CatalogRegression.log) |
| D02 결과 173 | [pass] S10-O10 reservation and normal segment coexist in catalog | pass | [D02-CatalogRegression.log:127](D02-CatalogRegression.log) |
| D02 결과 174 | [pass] S10-O04 reserve then finalize permits identical retry | pass | [D02-CatalogRegression.log:128](D02-CatalogRegression.log) |
| D02 결과 175 | [pass] S10-O10 reservation survives catalog rebuild without changing segment query | pass | [D02-CatalogRegression.log:129](D02-CatalogRegression.log) |
| D02 결과 176 | [pass] S10-O04 legacy segment cannot acquire retroactive reservation | pass | [D02-CatalogRegression.log:130](D02-CatalogRegression.log) |
| D02 결과 177 | [pass] S10-M06 opened catalog accepts fresh exact reservation V2 finalize | pass | [D02-CatalogRegression.log:131](D02-CatalogRegression.log) |
| D02 결과 178 | [pass] S10-M07 V2 find preserves complete metadata | pass | [D02-CatalogRegression.log:132](D02-CatalogRegression.log) |
| D02 결과 179 | [pass] S10-M07 identical V2 recovery is idempotent | pass | [D02-CatalogRegression.log:133](D02-CatalogRegression.log) |
| D02 결과 180 | [pass] S10-M07 V2 is absent from V1 range query | pass | [D02-CatalogRegression.log:134](D02-CatalogRegression.log) |
| D02 결과 181 | [pass] S10-M07 V2 registered path is not orphan | pass | [D02-CatalogRegression.log:135](D02-CatalogRegression.log) |
| D02 결과 182 | [pass] S10-M07 SQLite exact V2 JSON and path match | pass | [D02-CatalogRegression.log:136](D02-CatalogRegression.log) |
| D02 결과 183 | [pass] S10-M07 JSONL restart preserves V2 exact payload | pass | [D02-CatalogRegression.log:137](D02-CatalogRegression.log) |
| D02 결과 184 | [pass] S10-M06 wrong reservation tuple rejected store | pass | [D02-CatalogRegression.log:138](D02-CatalogRegression.log) |
| D02 결과 185 | [pass] S10-M06 wrong reservation tuple rejected request | pass | [D02-CatalogRegression.log:139](D02-CatalogRegression.log) |
| D02 결과 186 | [pass] S10-M06 wrong reservation tuple rejected segment | pass | [D02-CatalogRegression.log:140](D02-CatalogRegression.log) |
| D02 결과 187 | [pass] S10-M06 wrong reservation tuple rejected channel | pass | [D02-CatalogRegression.log:141](D02-CatalogRegression.log) |
| D02 결과 188 | [pass] S10-M06 wrong reservation tuple rejected sequence | pass | [D02-CatalogRegression.log:142](D02-CatalogRegression.log) |
| D02 결과 189 | [pass] S10-M09 immutable V2 mapping mismatch rejected | pass | [D02-CatalogRegression.log:143](D02-CatalogRegression.log) |
| D02 결과 190 | [pass] S10-M09 bad V2 startup retry preserves original state bad-payload | pass | [D02-CatalogRegression.log:144](D02-CatalogRegression.log) |
| D02 결과 191 | [pass] S10-M09 bad V2 startup retry preserves original state missing-order | pass | [D02-CatalogRegression.log:145](D02-CatalogRegression.log) |
| D02 결과 192 | [pass] S10-M09 bad V2 startup retry preserves original state bad-order | pass | [D02-CatalogRegression.log:146](D02-CatalogRegression.log) |
| D02 결과 193 | [pass] S10-M09 bad V2 startup retry preserves original state conflicting-order | pass | [D02-CatalogRegression.log:147](D02-CatalogRegression.log) |
| D02 결과 194 | [pass] S10-M09 bad V2 startup retry preserves original state tail | pass | [D02-CatalogRegression.log:148](D02-CatalogRegression.log) |
| D02 결과 195 | [pass] S10-M09 bad V2 startup retry preserves original state corrupt | pass | [D02-CatalogRegression.log:149](D02-CatalogRegression.log) |
| D02 결과 196 | [pass] S10-M09 bad V2 startup retry preserves original state unsafe-path | pass | [D02-CatalogRegression.log:150](D02-CatalogRegression.log) |
| D02 결과 197 | [pass] S10-M09 default off rejects V2 before SQLite changes | pass | [D02-CatalogRegression.log:151](D02-CatalogRegression.log) |
| D02 결과 198 | [pass] S10-M09 V2 replay namespace and deletion duplicate | pass | [D02-CatalogRegression.log:152](D02-CatalogRegression.log) |
| D02 결과 199 | [pass] S10-M09 V2 replay namespace and deletion deleted | pass | [D02-CatalogRegression.log:153](D02-CatalogRegression.log) |
| D02 결과 200 | [pass] S10-M09 V2 replay namespace and deletion v1-before | pass | [D02-CatalogRegression.log:154](D02-CatalogRegression.log) |
| D02 결과 201 | [pass] S10-M09 V2 replay namespace and deletion v1-after | pass | [D02-CatalogRegression.log:155](D02-CatalogRegression.log) |
| D02 결과 202 | [pass] S10-M09 V2 replay namespace and deletion deleted-before | pass | [D02-CatalogRegression.log:156](D02-CatalogRegression.log) |
| D02 결과 203 | [pass] S10-M09 V2 replay namespace and deletion resurrection | pass | [D02-CatalogRegression.log:157](D02-CatalogRegression.log) |
| D02 결과 204 | [pass] S10-M09 V2 replay namespace and deletion mutation-collision | pass | [D02-CatalogRegression.log:158](D02-CatalogRegression.log) |
| D02 결과 205 | [pass] S10-M09 V2 finalize rejects missing media | pass | [D02-CatalogRegression.log:159](D02-CatalogRegression.log) |
| D02 결과 206 | [pass] S10-M09 V2 finalize rejects directory media | pass | [D02-CatalogRegression.log:160](D02-CatalogRegression.log) |
| D02 결과 207 | [pass] S10-M09 fresh candidate rejects mapping | pass | [D02-CatalogRegression.log:161](D02-CatalogRegression.log) |
| D02 결과 208 | [pass] S10-M09 fresh candidate rejects path | pass | [D02-CatalogRegression.log:162](D02-CatalogRegression.log) |
| D02 결과 209 | [pass] S10-M09 fresh candidate rejects tombstone | pass | [D02-CatalogRegression.log:163](D02-CatalogRegression.log) |
| D02 결과 210 | [pass] S10-SW01 managed empty root opens with lifetime lease | pass | [D02-CatalogRegression.log:164](D02-CatalogRegression.log) |
| D02 결과 211 | [pass] S10-SW02 same process second managed owner denied | pass | [D02-CatalogRegression.log:165](D02-CatalogRegression.log) |
| D02 결과 212 | [pass] S10-SW03 different process owner and inherited use denied | pass | [D02-CatalogRegression.log:166](D02-CatalogRegression.log) |
| D02 결과 213 | [pass] S10-SW12 managed duplicate descriptors are close-on-exec | pass | [D02-CatalogRegression.log:167](D02-CatalogRegression.log) |
| D02 결과 214 | [pass] S10-SW05 managed reserve append replay use owned descriptor | pass | [D02-CatalogRegression.log:168](D02-CatalogRegression.log) |
| D02 결과 215 | [pass] S10-SW06 raw managed access and legacy default path denied | pass | [D02-CatalogRegression.log:169](D02-CatalogRegression.log) |
| D02 결과 216 | [pass] S10-SW01 managed Reserve rejects different store identity | pass | [D02-CatalogRegression.log:170](D02-CatalogRegression.log) |
| D02 결과 217 | [pass] S10-SW10 catalog connection can inspect managed lease | pass | [D02-CatalogRegression.log:171](D02-CatalogRegression.log) |
| D02 결과 218 | [pass] S10-SW04 owner destruction releases lease | pass | [D02-CatalogRegression.log:172](D02-CatalogRegression.log) |
| D02 결과 219 | [pass] S10-SW01 managed reopen rejects different store identity | pass | [D02-CatalogRegression.log:173](D02-CatalogRegression.log) |
| D02 결과 220 | [pass] S10-SW11 managed incomplete tail rejects append without changing bytes | pass | [D02-CatalogRegression.log:174](D02-CatalogRegression.log) |
| D02 결과 221 | [pass] S10-SW07 legacy nonempty root preserved without conversion | pass | [D02-CatalogRegression.log:175](D02-CatalogRegression.log) |
| D02 결과 222 | [pass] S10-SW08 partial initialization retry validates exact state lease | pass | [D02-CatalogRegression.log:176](D02-CatalogRegression.log) |
| D02 결과 223 | [pass] S10-SW08 partial initialization retry validates exact state init | pass | [D02-CatalogRegression.log:177](D02-CatalogRegression.log) |
| D02 결과 224 | [pass] S10-SW08 partial initialization retry validates exact state barrier | pass | [D02-CatalogRegression.log:178](D02-CatalogRegression.log) |
| D02 결과 225 | [pass] S10-SW08 partial initialization retry validates exact state journal | pass | [D02-CatalogRegression.log:179](D02-CatalogRegression.log) |
| D02 결과 226 | [pass] S10-SW08 partial initialization retry validates exact state incomplete | pass | [D02-CatalogRegression.log:180](D02-CatalogRegression.log) |
| D02 결과 227 | [pass] S10-SW08 partial initialization retry validates exact state unknown | pass | [D02-CatalogRegression.log:181](D02-CatalogRegression.log) |
| D02 결과 228 | [pass] S10-SW09 symlink inode and malformed marker rejected journal | pass | [D02-CatalogRegression.log:182](D02-CatalogRegression.log) |
| D02 결과 229 | [pass] S10-SW09 symlink inode and malformed marker rejected marker | pass | [D02-CatalogRegression.log:183](D02-CatalogRegression.log) |
| D02 결과 230 | [pass] S10-SW09 symlink inode and malformed marker rejected barrier | pass | [D02-CatalogRegression.log:184](D02-CatalogRegression.log) |
| D02 결과 231 | [pass] S10-SW09 symlink inode and malformed marker rejected root-symlink | pass | [D02-CatalogRegression.log:185](D02-CatalogRegression.log) |
| D02 결과 232 | [pass] S10-SB01 second managed catalog is denied | pass | [D02-CatalogRegression.log:186](D02-CatalogRegression.log) |
| D02 결과 233 | [pass] S10-SB02 failed catalog cannot mutate journal or holds | pass | [D02-CatalogRegression.log:187](D02-CatalogRegression.log) |
| D02 결과 234 | [pass] S10-SB03 attached catalog blocks unowned append but permits reservation | pass | [D02-CatalogRegression.log:188](D02-CatalogRegression.log) |
| D02 결과 235 | [pass] S10-SB04 catalog destruction releases attachment | pass | [D02-CatalogRegression.log:189](D02-CatalogRegression.log) |
| D02 결과 236 | [pass] S10-SB05 managed catalog rejects unsafe options outside | pass | [D02-CatalogRegression.log:190](D02-CatalogRegression.log) |
| D02 결과 237 | [pass] S10-SB05 managed catalog rejects unsafe options dotdot | pass | [D02-CatalogRegression.log:191](D02-CatalogRegression.log) |
| D02 결과 238 | [pass] S10-SB05 managed catalog rejects unsafe options media-symlink | pass | [D02-CatalogRegression.log:192](D02-CatalogRegression.log) |
| D02 결과 239 | [pass] S10-SB05 managed catalog rejects unsafe options sqlite-symlink | pass | [D02-CatalogRegression.log:193](D02-CatalogRegression.log) |
| D02 결과 240 | [pass] S10-SB05 managed catalog rejects unsafe options sqlite-hardlink | pass | [D02-CatalogRegression.log:194](D02-CatalogRegression.log) |
| D02 결과 241 | [pass] S10-SB05 managed catalog rejects unsafe options disabled | pass | [D02-CatalogRegression.log:195](D02-CatalogRegression.log) |
| D02 결과 242 | [pass] S10-SB06 failed open releases catalog attachment | pass | [D02-CatalogRegression.log:196](D02-CatalogRegression.log) |
| D02 결과 243 | [pass] S10-SB07 managed SQLite sidecar rejected -wal symlink | pass | [D02-CatalogRegression.log:197](D02-CatalogRegression.log) |
| D02 결과 244 | [pass] S10-SB07 managed SQLite sidecar rejected -wal hardlink | pass | [D02-CatalogRegression.log:198](D02-CatalogRegression.log) |
| D02 결과 245 | [pass] S10-SB07 managed SQLite sidecar rejected -shm symlink | pass | [D02-CatalogRegression.log:199](D02-CatalogRegression.log) |
| D02 결과 246 | [pass] S10-SB07 managed SQLite sidecar rejected -shm hardlink | pass | [D02-CatalogRegression.log:200](D02-CatalogRegression.log) |
| D02 결과 247 | [pass] S10-SB07 managed SQLite sidecar rejected -journal symlink | pass | [D02-CatalogRegression.log:201](D02-CatalogRegression.log) |
| D02 결과 248 | [pass] S10-SB07 managed SQLite sidecar rejected -journal hardlink | pass | [D02-CatalogRegression.log:202](D02-CatalogRegression.log) |
| D02 결과 249 | [pass] S10-SC01 managed repeated event fixture is valid | pass | [D02-CatalogRegression.log:203](D02-CatalogRegression.log) |
| D02 결과 250 | [pass] S10-SC02 managed reservations avoid history reads | pass | [D02-CatalogRegression.log:204](D02-CatalogRegression.log) |
| D02 결과 251 | [pass] S10-SC03 managed V2 finalize avoids full replay | pass | [D02-CatalogRegression.log:205](D02-CatalogRegression.log) |
| D02 결과 252 | [pass] S10-SC04 checkpoint reduces superseded event payload bytes | pass | [D02-CatalogRegression.log:206](D02-CatalogRegression.log) |
| D02 결과 253 | [pass] S10-SC05 checkpoint preserves latest event and all record identities | pass | [D02-CatalogRegression.log:207](D02-CatalogRegression.log) |
| D02 결과 254 | [pass] S10-SC06 checkpoint is idempotent and preserves V2 | pass | [D02-CatalogRegression.log:208](D02-CatalogRegression.log) |
| D02 결과 255 | [pass] S10-SC08 receipt preserves retry identity and rejects direct append | pass | [D02-CatalogRegression.log:209](D02-CatalogRegression.log) |
| D02 결과 256 | [pass] S10-SC09 checkpoint restart preserves SQLite and JSONL state sqlite | pass | [D02-CatalogRegression.log:210](D02-CatalogRegression.log) |
| D02 결과 257 | [pass] S10-SC09 managed checkpoint SQL V2 payload and path | pass | [D02-CatalogRegression.log:211](D02-CatalogRegression.log) |
| D02 결과 258 | [pass] S10-SC09 checkpoint restart preserves SQLite and JSONL state jsonl | pass | [D02-CatalogRegression.log:212](D02-CatalogRegression.log) |
| D02 결과 259 | [pass] S10-SC10 checkpoint prefix recovers before writes | pass | [D02-CatalogRegression.log:213](D02-CatalogRegression.log) |
| D02 결과 260 | [pass] S10-SC11 checkpoint mismatch preserves bytes and poisons owner | pass | [D02-CatalogRegression.log:214](D02-CatalogRegression.log) |
| D02 결과 261 | [pass] S10-SC12 first accepted mutation controls latest event | pass | [D02-CatalogRegression.log:215](D02-CatalogRegression.log) |
| D02 결과 262 | [pass] S10-SC16 automatic checkpoint uses accumulated growth | pass | [D02-CatalogRegression.log:216](D02-CatalogRegression.log) |
| D02 결과 263 | [pass] S10-SC07 raw checkpoint is rejected | pass | [D02-CatalogRegression.log:217](D02-CatalogRegression.log) |
| D02 결과 264 | [pass] S10-SC18 checkpoint syscall failure poisons and reopens write | pass | [D02-CatalogRegression.log:218](D02-CatalogRegression.log) |
| D02 결과 265 | [pass] S10-SC21 poison rejects hold mutation write | pass | [D02-CatalogRegression.log:219](D02-CatalogRegression.log) |
| D02 결과 266 | [pass] S10-SC18 checkpoint syscall failure poisons and reopens file-fsync | pass | [D02-CatalogRegression.log:220](D02-CatalogRegression.log) |
| D02 결과 267 | [pass] S10-SC21 poison rejects hold mutation file-fsync | pass | [D02-CatalogRegression.log:221](D02-CatalogRegression.log) |
| D02 결과 268 | [pass] S10-SC18 checkpoint syscall failure poisons and reopens rename | pass | [D02-CatalogRegression.log:222](D02-CatalogRegression.log) |
| D02 결과 269 | [pass] S10-SC21 poison rejects hold mutation rename | pass | [D02-CatalogRegression.log:223](D02-CatalogRegression.log) |
| D02 결과 270 | [pass] S10-SC18 checkpoint syscall failure poisons and reopens dir-fsync | pass | [D02-CatalogRegression.log:224](D02-CatalogRegression.log) |
| D02 결과 271 | [pass] S10-SC21 poison rejects hold mutation dir-fsync | pass | [D02-CatalogRegression.log:225](D02-CatalogRegression.log) |
| D02 결과 272 | [pass] S10-SC17 checkpoint preserves holds observations and deletion | pass | [D02-CatalogRegression.log:226](D02-CatalogRegression.log) |
| D02 결과 273 | [pass] S10-SC17 checkpoint SQL hold observation tombstone | pass | [D02-CatalogRegression.log:227](D02-CatalogRegression.log) |
| D02 결과 274 | [pass] S10-SC17 checkpoint preserves holds observations and deletion restart sqlite | pass | [D02-CatalogRegression.log:228](D02-CatalogRegression.log) |
| D02 결과 275 | [pass] S10-SC17 checkpoint SQL restart observation tombstone | pass | [D02-CatalogRegression.log:229](D02-CatalogRegression.log) |
| D02 결과 276 | [pass] S10-SC17 checkpoint preserves holds observations and deletion restart jsonl | pass | [D02-CatalogRegression.log:230](D02-CatalogRegression.log) |
| D02 결과 277 | [pass] S10-SC19 invalid managed history remains unchanged malformed | pass | [D02-CatalogRegression.log:231](D02-CatalogRegression.log) |
| D02 결과 278 | [pass] S10-SC19 invalid managed history remains unchanged unsupported | pass | [D02-CatalogRegression.log:232](D02-CatalogRegression.log) |
| D02 결과 279 | [pass] S10-SC19 invalid managed history remains unchanged conflict | pass | [D02-CatalogRegression.log:233](D02-CatalogRegression.log) |
| D02 결과 280 | [pass] S10-SC20 raw catalog rejects receipt before side effects | pass | [D02-CatalogRegression.log:234](D02-CatalogRegression.log) |
| D02 결과 281 | [pass] S10-SC13 crypto off raw remains usable | pass | [D02-CatalogRegression.log:236](D02-CatalogRegression.log) |
| D02 결과 282 | [pass] S10-SC14 crypto off checkpoint is rejected | pass | [D02-CatalogRegression.log:237](D02-CatalogRegression.log) |
| D02 결과 283 | [pass] S10-SC15 crypto off receipt reopen is rejected | pass | [D02-CatalogRegression.log:238](D02-CatalogRegression.log) |
| D02 결과 284 | [pass] source 저장 callback reconcile 연결 | pass | [D02-CatalogRegression.log:239](D02-CatalogRegression.log) |
| D02 결과 285 | [pass] policy revision idempotency | pass | [D02-CatalogRegression.log:240](D02-CatalogRegression.log) |
| D02 결과 286 | [pass] 5초 safety reconcile | pass | [D02-CatalogRegression.log:241](D02-CatalogRegression.log) |
| D02 결과 287 | [pass] composition root 관리 저장소 선행 open | pass | [D02-CatalogRegression.log:242](D02-CatalogRegression.log) |
| D02 결과 288 | [pass] composition helper journal 다음 catalog rebuild/open | pass | [D02-CatalogRegression.log:243](D02-CatalogRegression.log) |
| D02 결과 289 | [pass] 서버 전 supervisor 시작 | pass | [D02-CatalogRegression.log:244](D02-CatalogRegression.log) |
| D02 결과 290 | [pass] ingress 전 event bridge 등록 | pass | [D02-CatalogRegression.log:245](D02-CatalogRegression.log) |
| D02 결과 291 | [pass] ingress 종료 뒤 recorder finalize | pass | [D02-CatalogRegression.log:246](D02-CatalogRegression.log) |
| D02 결과 292 | [pass] composition root 시작/종료 순서 | pass | [D02-CatalogRegression.log:247](D02-CatalogRegression.log) |
| D02 결과 293 | [pass] fallback ST02 healthy noappend | pass | [D02-StartupRegression.log:1](D02-StartupRegression.log) |
| D02 결과 294 | [pass] fallback ST11 actual mode | pass | [D02-StartupRegression.log:2](D02-StartupRegression.log) |
| D02 결과 295 | [pass] fallback ST01/11 missing Corrupt memory | pass | [D02-StartupRegression.log:3](D02-StartupRegression.log) |
| D02 결과 296 | [pass] fallback ST11 missing query Corrupt and media location blocked | pass | [D02-StartupRegression.log:4](D02-StartupRegression.log) |
| D02 결과 297 | [pass] fallback ST10/11 missing restart no resurrection/append | pass | [D02-StartupRegression.log:5](D02-StartupRegression.log) |
| D02 결과 298 | [pass] fallback ST01/11 checksum Corrupt memory | pass | [D02-StartupRegression.log:6](D02-StartupRegression.log) |
| D02 결과 299 | [pass] fallback ST11 checksum query Corrupt and media location blocked | pass | [D02-StartupRegression.log:7](D02-StartupRegression.log) |
| D02 결과 300 | [pass] fallback ST10/11 checksum restart no resurrection/append | pass | [D02-StartupRegression.log:8](D02-StartupRegression.log) |
| D02 결과 301 | [pass] fallback ST01/11 size Corrupt memory | pass | [D02-StartupRegression.log:9](D02-StartupRegression.log) |
| D02 결과 302 | [pass] fallback ST11 size query Corrupt and media location blocked | pass | [D02-StartupRegression.log:10](D02-StartupRegression.log) |
| D02 결과 303 | [pass] fallback ST10/11 size restart no resurrection/append | pass | [D02-StartupRegression.log:11](D02-StartupRegression.log) |
| D02 결과 304 | [pass] fallback ST09 held corruption fails startup/noappend | pass | [D02-StartupRegression.log:12](D02-StartupRegression.log) |
| D02 결과 305 | [pass] fallback ST09 Pending source restart protects corruption | pass | [D02-StartupRegression.log:13](D02-StartupRegression.log) |
| D02 결과 306 | [pass] fallback ST09 Pending link unchanged | pass | [D02-StartupRegression.log:14](D02-StartupRegression.log) |
| D02 결과 307 | [pass] fallback ST09 Pending output restart protects corruption | pass | [D02-StartupRegression.log:15](D02-StartupRegression.log) |
| D02 결과 308 | [pass] fallback ST09 Pending link unchanged | pass | [D02-StartupRegression.log:16](D02-StartupRegression.log) |
| D02 결과 309 | [pass] fallback ST08 unavailable timeout noappend | pass | [D02-StartupRegression.log:17](D02-StartupRegression.log) |
| D02 결과 310 | [pass] fallback ST12 unsafe path remains in metadata snapshot | pass | [D02-StartupRegression.log:18](D02-StartupRegression.log) |
| D02 결과 311 | [pass] fallback ST12 unsafe path startup fails | pass | [D02-StartupRegression.log:19](D02-StartupRegression.log) |
| D02 결과 312 | [pass] sqlite ST02 healthy noappend | pass | [D02-StartupRegression.log:20](D02-StartupRegression.log) |
| D02 결과 313 | [pass] sqlite ST11 actual mode | pass | [D02-StartupRegression.log:21](D02-StartupRegression.log) |
| D02 결과 314 | [pass] sqlite ST01/11 missing Corrupt memory | pass | [D02-StartupRegression.log:22](D02-StartupRegression.log) |
| D02 결과 315 | [pass] sqlite ST11 missing query Corrupt and media location blocked | pass | [D02-StartupRegression.log:23](D02-StartupRegression.log) |
| D02 결과 316 | [pass] sqlite ST11 missing SQL actual lifecycle | pass | [D02-StartupRegression.log:24](D02-StartupRegression.log) |
| D02 결과 317 | [pass] sqlite ST11 original codec metadata preserved | pass | [D02-StartupRegression.log:25](D02-StartupRegression.log) |
| D02 결과 318 | [pass] sqlite ST10/11 missing restart no resurrection/append | pass | [D02-StartupRegression.log:26](D02-StartupRegression.log) |
| D02 결과 319 | [pass] sqlite ST01/11 checksum Corrupt memory | pass | [D02-StartupRegression.log:27](D02-StartupRegression.log) |
| D02 결과 320 | [pass] sqlite ST11 checksum query Corrupt and media location blocked | pass | [D02-StartupRegression.log:28](D02-StartupRegression.log) |
| D02 결과 321 | [pass] sqlite ST11 checksum SQL actual lifecycle | pass | [D02-StartupRegression.log:29](D02-StartupRegression.log) |
| D02 결과 322 | [pass] sqlite ST11 original codec metadata preserved | pass | [D02-StartupRegression.log:30](D02-StartupRegression.log) |
| D02 결과 323 | [pass] sqlite ST10/11 checksum restart no resurrection/append | pass | [D02-StartupRegression.log:31](D02-StartupRegression.log) |
| D02 결과 324 | [pass] sqlite ST01/11 size Corrupt memory | pass | [D02-StartupRegression.log:32](D02-StartupRegression.log) |
| D02 결과 325 | [pass] sqlite ST11 size query Corrupt and media location blocked | pass | [D02-StartupRegression.log:33](D02-StartupRegression.log) |
| D02 결과 326 | [pass] sqlite ST11 size SQL actual lifecycle | pass | [D02-StartupRegression.log:34](D02-StartupRegression.log) |
| D02 결과 327 | [pass] sqlite ST11 original codec metadata preserved | pass | [D02-StartupRegression.log:35](D02-StartupRegression.log) |
| D02 결과 328 | [pass] sqlite ST10/11 size restart no resurrection/append | pass | [D02-StartupRegression.log:36](D02-StartupRegression.log) |
| D02 결과 329 | [pass] sqlite ST09 held corruption fails startup/noappend | pass | [D02-StartupRegression.log:37](D02-StartupRegression.log) |
| D02 결과 330 | [pass] sqlite ST09 Pending source restart protects corruption | pass | [D02-StartupRegression.log:38](D02-StartupRegression.log) |
| D02 결과 331 | [pass] sqlite ST09 Pending link unchanged | pass | [D02-StartupRegression.log:39](D02-StartupRegression.log) |
| D02 결과 332 | [pass] sqlite ST09 Pending output restart protects corruption | pass | [D02-StartupRegression.log:40](D02-StartupRegression.log) |
| D02 결과 333 | [pass] sqlite ST09 Pending link unchanged | pass | [D02-StartupRegression.log:41](D02-StartupRegression.log) |
| D02 결과 334 | [pass] sqlite ST08 unavailable timeout noappend | pass | [D02-StartupRegression.log:42](D02-StartupRegression.log) |
| D02 결과 335 | [pass] sqlite ST12 unsafe path remains in metadata snapshot | pass | [D02-StartupRegression.log:43](D02-StartupRegression.log) |
| D02 결과 336 | [pass] sqlite ST12 unsafe path startup fails | pass | [D02-StartupRegression.log:44](D02-StartupRegression.log) |
| D02 결과 337 | [pass] WR01 h264 managed segments decode all frames without legacy callback or snapshot | pass | [D02-ManagedWriterRegression.log:1](D02-ManagedWriterRegression.log) |
| D02 결과 338 | [pass] S10-C321 h264 실제 수락 원본 tuple과 segment 결박 | pass | [D02-ManagedWriterRegression.log:2](D02-ManagedWriterRegression.log) |
| D02 결과 339 | [pass] WR01 vp8 managed segments decode all frames without legacy callback or snapshot | pass | [D02-ManagedWriterRegression.log:3](D02-ManagedWriterRegression.log) |
| D02 결과 340 | [pass] S10-C321 vp8 실제 수락 원본 tuple과 segment 결박 | pass | [D02-ManagedWriterRegression.log:4](D02-ManagedWriterRegression.log) |
| D02 결과 341 | [pass] WR02 UTC-only change preserves media splits frames and independent mapping | pass | [D02-ManagedWriterRegression.log:5](D02-ManagedWriterRegression.log) |
| D02 결과 342 | [pass] WR03 UTC-only change preserves media splits frames and independent mapping | pass | [D02-ManagedWriterRegression.log:6](D02-ManagedWriterRegression.log) |
| D02 결과 343 | [pass] WR04 UTC-only change preserves media splits frames and independent mapping | pass | [D02-ManagedWriterRegression.log:7](D02-ManagedWriterRegression.log) |
| D02 결과 344 | [pass] WR05 duplicate PTS with advancing DTS preserves media and unknown mapping | pass | [D02-ManagedWriterRegression.log:8](D02-ManagedWriterRegression.log) |
| D02 결과 345 | [pass] WR06 explicit generation reset creates a new media epoch | pass | [D02-ManagedWriterRegression.log:9](D02-ManagedWriterRegression.log) |
| D02 결과 346 | [pass] S10-C326 세대별 원본 결박 분리 | pass | [D02-ManagedWriterRegression.log:10](D02-ManagedWriterRegression.log) |
| D02 결과 347 | [pass] WR07 repeated observations and processing UTC do not duplicate media | pass | [D02-ManagedWriterRegression.log:11](D02-ManagedWriterRegression.log) |
| D02 결과 348 | [pass] S10-C325 분할·재전달의 segment별 수락 범위 | pass | [D02-ManagedWriterRegression.log:12](D02-ManagedWriterRegression.log) |
| D02 결과 349 | [pass] S10-C322 keyframe 대기·다른 track·빈 입력·replay 제외 | pass | [D02-ManagedWriterRegression.log:13](D02-ManagedWriterRegression.log) |
| D02 결과 350 | [pass] S10-C324 색인 상한 뒤에도 실제4100프레임 저장·미색인 꼬리 표시 | pass | [D02-ManagedWriterRegression.log:14](D02-ManagedWriterRegression.log) |
| D02 결과 351 | [pass] WR08 missing final duration preserves media with unknown end | pass | [D02-ManagedWriterRegression.log:15](D02-ManagedWriterRegression.log) |
| D02 결과 352 | [pass] WR09 mapping budget retains bounded unknown tail and all frames | pass | [D02-ManagedWriterRegression.log:16](D02-ManagedWriterRegression.log) |
| D02 결과 353 | [pass] WR01 invalid binding rejects before writes journal | pass | [D02-ManagedWriterRegression.log:17](D02-ManagedWriterRegression.log) |
| D02 결과 354 | [pass] WR01 invalid binding rejects before writes catalog | pass | [D02-ManagedWriterRegression.log:18](D02-ManagedWriterRegression.log) |
| D02 결과 355 | [pass] WR01 invalid binding rejects before writes root | pass | [D02-ManagedWriterRegression.log:19](D02-ManagedWriterRegression.log) |
| D02 결과 356 | [pass] WR01 invalid binding rejects before writes store | pass | [D02-ManagedWriterRegression.log:20](D02-ManagedWriterRegression.log) |
| D02 결과 357 | [pass] WR01 invalid binding rejects before writes lease | pass | [D02-ManagedWriterRegression.log:21](D02-ManagedWriterRegression.log) |
| D02 결과 358 | [pass] WR01 invalid binding rejects before writes incomplete | pass | [D02-ManagedWriterRegression.log:22](D02-ManagedWriterRegression.log) |
| D02 결과 359 | [pass] WR08 clock process change preserves same-generation media with unknown comparison | pass | [D02-ManagedWriterRegression.log:23](D02-ManagedWriterRegression.log) |
| D02 결과 360 | [pass] WR08 invalid duration leaves unknown end zero | pass | [D02-ManagedWriterRegression.log:24](D02-ManagedWriterRegression.log) |
| D02 결과 361 | [pass] WR08 invalid duration leaves unknown end overflow | pass | [D02-ManagedWriterRegression.log:25](D02-ManagedWriterRegression.log) |
| D02 결과 362 | [pass] WR08 unsafe original input cannot become finalized observation | pass | [D02-ManagedWriterRegression.log:27](D02-ManagedWriterRegression.log) |
| D02 결과 363 | [pass] WR08 unsafe original input cannot become finalized pts | pass | [D02-ManagedWriterRegression.log:29](D02-ManagedWriterRegression.log) |
| D02 결과 364 | [pass] WR08 unsafe original input cannot become finalized range | pass | [D02-ManagedWriterRegression.log:31](D02-ManagedWriterRegression.log) |
| D02 결과 365 | [pass] WR07 older generation cache cannot switch media backwards | pass | [D02-ManagedWriterRegression.log:32](D02-ManagedWriterRegression.log) |
| D02 결과 366 | [pass] WR07 unrelated video track cannot change selected track identity | pass | [D02-ManagedWriterRegression.log:33](D02-ManagedWriterRegression.log) |
| D02 결과 367 | [pass] WR06 reopened store allocates fresh IDs and increasing durable order | pass | [D02-ManagedWriterRegression.log:34](D02-ManagedWriterRegression.log) |
| D02 결과 368 | [pass] WR05 actual H264 reordering preserves decode timestamps and mux origin | pass | [D02-ManagedWriterRegression.log:35](D02-ManagedWriterRegression.log) |
| D02 결과 369 | [pass] WR05 reordered segment end covers maximum presented frame end | pass | [D02-ManagedWriterRegression.log:36](D02-ManagedWriterRegression.log) |
| D02 결과 370 | [pass] S10-C327 실제 B-frame 원본PTS·ordinal 보존 | pass | [D02-ManagedWriterRegression.log:37](D02-ManagedWriterRegression.log) |
| D02 결과 371 | [pass] WR08 missing maximum PTS frame duration keeps reordered end unknown | pass | [D02-ManagedWriterRegression.log:39](D02-ManagedWriterRegression.log) |
| D02 결과 372 | [pass] WR09 failed active commit preserves ready order and quota reservation | pass | [D02-ManagedWriterRegression.log:41](D02-ManagedWriterRegression.log) |
| D02 결과 373 | [pass] WR09 restart recovers the same durable segment and all frames | pass | [D02-ManagedWriterRegression.log:42](D02-ManagedWriterRegression.log) |
| D02 결과 374 | [pass] WR08 excessive clock width preserves media as unknown | pass | [D02-ManagedWriterRegression.log:43](D02-ManagedWriterRegression.log) |
| D02 결과 375 | [pass] WR08 zero generation order cannot become finalized | pass | [D02-ManagedWriterRegression.log:45](D02-ManagedWriterRegression.log) |
| D02 결과 376 | [pass] WR08 media observation quality normal | pass | [D02-ManagedWriterRegression.log:46](D02-ManagedWriterRegression.log) |
| D02 결과 377 | [pass] WR08 media observation quality fast | pass | [D02-ManagedWriterRegression.log:47](D02-ManagedWriterRegression.log) |
| D02 결과 378 | [pass] WR08 media observation quality drift | pass | [D02-ManagedWriterRegression.log:48](D02-ManagedWriterRegression.log) |
| D02 결과 379 | [pass] WR08 media observation quality fast-step | pass | [D02-ManagedWriterRegression.log:49](D02-ManagedWriterRegression.log) |
| D02 결과 380 | [pass] WR01 actual appsink observation flows through managed writer and decode | pass | [D02-ManagedWriterRegression.log:50](D02-ManagedWriterRegression.log) |
| D02 결과 381 | [pass] C401 관측·참조 원자 저장 | pass | [D02-ConnectionRegression.log:1](D02-ConnectionRegression.log) |
| D02 결과 382 | [pass] C402 쌍 identity 불일치 거부 | pass | [D02-ConnectionRegression.log:2](D02-ConnectionRegression.log) |
| D02 결과 383 | [pass] C403 동일 원본 재전달·event 병합 | pass | [D02-ConnectionRegression.log:3](D02-ConnectionRegression.log) |
| D02 결과 384 | [pass] C405 SQL·JSONL·checkpoint 쌍 복구 | pass | [D02-ConnectionRegression.log:4](D02-ConnectionRegression.log) |
| D02 결과 385 | [pass] C404 다른 원본 동일PTS 구분 | pass | [D02-ConnectionRegression.log:5](D02-ConnectionRegression.log) |
| D02 결과 386 | [pass] C406 실제 OnResult 원본 참조 저장 | pass | [D02-ConnectionRegression.log:6](D02-ConnectionRegression.log) |
| D02 결과 387 | [pass] C407 OnEvent 강제 표본 | pass | [D02-ConnectionRegression.log:7](D02-ConnectionRegression.log) |
| D02 결과 388 | [pass] C408 종료track 과거참조 보존 | pass | [D02-ConnectionRegression.log:8](D02-ConnectionRegression.log) |
| D02 결과 389 | [pass] C409 종료track 참조부재 unknown | pass | [D02-ConnectionRegression.log:9](D02-ConnectionRegression.log) |
| D02 결과 390 | [pass] C410 sampling·queue·StopAndDrain 회귀 | pass | [D02-ConnectionRegression.log:10](D02-ConnectionRegression.log) |
| D02 결과 391 | [pass] C411 exact·미색인 복수 후보 보존 | pass | [D02-ConnectionRegression.log:11](D02-ConnectionRegression.log) |
| D02 결과 392 | [pass] C412 nearest/ambiguous/unavailable 미승격 | pass | [D02-ConnectionRegression.log:12](D02-ConnectionRegression.log) |
| D02 결과 393 | [pass] C413 UTC unknown·삭제 상태 재판정 | pass | [D02-ConnectionRegression.log:13](D02-ConnectionRegression.log) |
| D02 결과 394 | [pass] C414 실제 TryResolve 요청참조 저장 | pass | [D02-ConnectionRegression.log:14](D02-ConnectionRegression.log) |
| D02 결과 395 | [pass] C415 event 재전달·확장·세대 구분 | pass | [D02-ConnectionRegression.log:15](D02-ConnectionRegression.log) |
| D02 결과 396 | [pass] C416 source/channel 충돌 거부 | pass | [D02-ConnectionRegression.log:16](D02-ConnectionRegression.log) |
| D02 결과 397 | [pass] C417 같은 원본 미디어 교집합 우선 | pass | [D02-ConnectionRegression.log:17](D02-ConnectionRegression.log) |
| D02 결과 398 | [pass] C418 공개 결과·구형 fallback 불변 | pass | [D02-ConnectionRegression.log:18](D02-ConnectionRegression.log) |
| D02 결과 399 | [pass] C422 실제 bridge 초기 pre-roll 수락·pending 유지 | pass | [D02-ConnectionRegression.log:19](D02-ConnectionRegression.log) |
| D02 결과 400 | [pass] C423 초기 요청 멱등·갱신·generation 분리 | pass | [D02-ConnectionRegression.log:20](D02-ConnectionRegression.log) |
| D02 결과 401 | [pass] C424 초기 요청 SQL·JSONL 복구 | pass | [D02-ConnectionRegression.log:21](D02-ConnectionRegression.log) |
| D02 결과 402 | [pass] C425 초기 요청 checkpoint 복구 | pass | [D02-ConnectionRegression.log:22](D02-ConnectionRegression.log) |
| D02 결과 403 | [pass] C341 계약 왕복 | pass | [D02-ReferenceRegression.log:1](D02-ReferenceRegression.log) |
| D02 결과 404 | [pass] C342 unknown/중복 필드 거부 | pass | [D02-ReferenceRegression.log:2](D02-ReferenceRegression.log) |
| D02 결과 405 | [pass] C343 ID·종류·소유자 제약 | pass | [D02-ReferenceRegression.log:3](D02-ReferenceRegression.log) |
| D02 결과 406 | [pass] C344 품질·원본 nullable 조합 | pass | [D02-ReferenceRegression.log:4](D02-ReferenceRegression.log) |
| D02 결과 407 | [pass] C345 원본 수치·track 경계 | pass | [D02-ReferenceRegression.log:5](D02-ReferenceRegression.log) |
| D02 결과 408 | [pass] C346 event 요청·시간축 | pass | [D02-ReferenceRegression.log:6](D02-ReferenceRegression.log) |
| D02 결과 409 | [pass] C347 observation 요청 금지 | pass | [D02-ReferenceRegression.log:7](D02-ReferenceRegression.log) |
| D02 결과 410 | [pass] C348 요청 음수·역전·padding | pass | [D02-ReferenceRegression.log:8](D02-ReferenceRegression.log) |
| D02 결과 411 | [pass] C419 media-pts 초기 요청 원문 왕복 | pass | [D02-ReferenceRegression.log:9](D02-ReferenceRegression.log) |
| D02 결과 412 | [pass] C420 UTC 초기 요청 원문 왕복 | pass | [D02-ReferenceRegression.log:10](D02-ReferenceRegression.log) |
| D02 결과 413 | [pass] C421 0·최대 pre 요청 및 오류 경계 | pass | [D02-ReferenceRegression.log:11](D02-ReferenceRegression.log) |
| D02 결과 414 | [pass] C349 미지원 schema 거부 | pass | [D02-ReferenceRegression.log:12](D02-ReferenceRegression.log) |
| D02 결과 415 | [pass] C350 실제 원장 저장·조회 | pass | [D02-ReferenceRegression.log:13](D02-ReferenceRegression.log) |
| D02 결과 416 | [pass] C351 동일 참조 멱등 | pass | [D02-ReferenceRegression.log:14](D02-ReferenceRegression.log) |
| D02 결과 417 | [pass] C352 동일 ID 충돌 거부 | pass | [D02-ReferenceRegression.log:15](D02-ReferenceRegression.log) |
| D02 결과 418 | [pass] C353 opt-in·미open 거부 | pass | [D02-ReferenceRegression.log:16](D02-ReferenceRegression.log) |
| D02 결과 419 | [pass] C354 SQL·JSONL 재시작 동등 | pass | [D02-ReferenceRegression.log:17](D02-ReferenceRegression.log) |
| D02 결과 420 | [pass] C355 checkpoint 참조 보존 | pass | [D02-ReferenceRegression.log:18](D02-ReferenceRegression.log) |
| D02 결과 421 | [pass] C356 손상·충돌 replay 선차단 | pass | [D02-ReferenceRegression.log:29](D02-ReferenceRegression.log) |
| D02 결과 422 | [pass] B01 V2 tombstone preserves immutable segment without legacy UTC range | pass | [D02-RetentionRegression.log:1](D02-RetentionRegression.log) |
| D02 결과 423 | [pass] B02 V2 state records reject malformed payload entity and duplicate conflicts | pass | [D02-RetentionRegression.log:2](D02-RetentionRegression.log) |
| D02 결과 424 | [pass] B03 V2 pending corrupt and deleted overlays never mutate finalized payload | pass | [D02-RetentionRegression.log:3](D02-RetentionRegression.log) |
| D02 결과 425 | [pass] B04 V2 invalid transitions and finalize retries cannot resurrect state | pass | [D02-RetentionRegression.log:4](D02-RetentionRegression.log) |
| D02 결과 426 | [pass] B05 V2 checkpoint and restart preserve overlay tombstone and SQLite parity | pass | [D02-RetentionRegression.log:5](D02-RetentionRegression.log) |
| D02 결과 427 | [pass] B06 V2 capacity deletion follows durable order despite reversed UTC | pass | [D02-RetentionRegression.log:6](D02-RetentionRegression.log) |
| D02 결과 428 | [pass] B07 mixed legacy and multiple stores use deterministic nonchronological ordering | pass | [D02-RetentionRegression.log:7](D02-RetentionRegression.log) |
| D02 결과 429 | [pass] B08 V2 age expiry uses all known mapping ends plus uncertainty rounded upward | pass | [D02-RetentionRegression.log:8](D02-RetentionRegression.log) |
| D02 결과 430 | [pass] B09 V2 unknown or overflowing age remains capacity eligible | pass | [D02-RetentionRegression.log:9](D02-RetentionRegression.log) |
| D02 결과 431 | [pass] B10 V2 class quotas and disk reserve remain separated | pass | [D02-RetentionRegression.log:10](D02-RetentionRegression.log) |
| D02 결과 432 | [pass] B11 V2 pin and hold protect deletion and corruption | pass | [D02-RetentionRegression.log:11](D02-RetentionRegression.log) |
| D02 결과 433 | [pass] B12 V2 pending and corrupt bytes remain charged but are not automatic victims | pass | [D02-RetentionRegression.log:12](D02-RetentionRegression.log) |
| D02 결과 434 | [pass] B13 V2 apply persists pending before unlink and tombstone after unlink | pass | [D02-RetentionRegression.log:13](D02-RetentionRegression.log) |
| D02 결과 435 | [pass] B14 V2 interrupted deletion recovers without resurrection | pass | [D02-RetentionRegression.log:14](D02-RetentionRegression.log) |
| D02 결과 436 | [pass] B15 V2 corrupt cleanup requires explicit manual reason | pass | [D02-RetentionRegression.log:15](D02-RetentionRegression.log) |
| D02 결과 437 | [pass] B16 V2 continuous media with unknown UTC resolves a healthy held fd | pass | [D02-RetentionRegression.log:16](D02-RetentionRegression.log) |
| D02 결과 438 | [pass] B17 V2 wrong channel event and fallback collision cannot expose media | pass | [D02-RetentionRegression.log:17](D02-RetentionRegression.log) |
| D02 결과 439 | [pass] B18 V2 missing symlink and multiple hardlink media reject without hold leak | pass | [D02-RetentionRegression.log:18](D02-RetentionRegression.log) |
| D02 결과 440 | [pass] B19 V2 same size corruption and invalid container reject without hold leak | pass | [D02-RetentionRegression.log:19](D02-RetentionRegression.log) |
| D02 결과 441 | [pass] B20 V2 deletion and playback hold races have one safe winner | pass | [D02-RetentionRegression.log:20](D02-RetentionRegression.log) |
| D02 결과 442 | [pass] B21 borrowed fd inspection preserves caller ownership and detects file changes | pass | [D02-RetentionRegression.log:21](D02-RetentionRegression.log) |
| D02 결과 443 | [pass] B23 legacy store port refuses unsupported V2 deletion | pass | [D02-RetentionRegression.log:22](D02-RetentionRegression.log) |
| D02 결과 444 | [pass] B22 V2 playback is unavailable without GStreamer | pass | [D02-RetentionRegression.log:24](D02-RetentionRegression.log) |
| D02 결과 445 | [pass] B23 legacy store port refuses unsupported V2 deletion | pass | [D02-RetentionRegression.log:25](D02-RetentionRegression.log) |
| D02 결과 446 | [pass] E17 accepted 후 resolver nullopt는 기존 소유 유지·신규 저장 없음 | pass | [D02-EventIntegrationRegression.log:4](D02-EventIntegrationRegression.log) |
| D02 결과 447 | [pass] E17 accepted 후 resolver 불일치는 기존 소유 유지·신규 저장 없음 | pass | [D02-EventIntegrationRegression.log:5](D02-EventIntegrationRegression.log) |
| D02 결과 448 | [pass] E17 accepted 후 resolver 예외는 기존 소유 유지·신규 저장 없음 | pass | [D02-EventIntegrationRegression.log:6](D02-EventIntegrationRegression.log) |
| D02 결과 449 | [pass] E17 accepted 후 resolver 미주입는 기존 소유 유지·신규 저장 없음 | pass | [D02-EventIntegrationRegression.log:7](D02-EventIntegrationRegression.log) |
| D02 결과 450 | [pass] E02 단일 출력도 clip_path 승격 없이 목록·직접 decode·fully satisfied | pass | [D02-EventIntegrationRegression.log:9](D02-EventIntegrationRegression.log) |
| D02 결과 451 | [pass] E09 동일 reference/선택 재요청 job ID 멱등 | pass | [D02-EventIntegrationRegression.log:10](D02-EventIntegrationRegression.log) |
| D02 결과 452 | [pass] E03 미확인 pre 구간을 유지한 verified partial 출력 | pass | [D02-EventIntegrationRegression.log:11](D02-EventIntegrationRegression.log) |
| D02 결과 453 | [pass] E07 immutable start/end/pre/post/namespace 보존 | pass | [D02-EventIntegrationRegression.log:12](D02-EventIntegrationRegression.log) |
| D02 결과 454 | [pass] E10 Event 출력이 누적되어도 원본 snapshot은 continuous만 | pass | [D02-EventIntegrationRegression.log:13](D02-EventIntegrationRegression.log) |
| D02 결과 455 | [pass] E04 provider의 동일 실제 decoder 증거 업데이트로 postroll 요청 충족 | pass | [D02-EventIntegrationRegression.log:14](D02-EventIntegrationRegression.log) |
| D02 결과 456 | [pass] E05 시간 경과만으로 coverage 없이 unknown 종료 | pass | [D02-EventIntegrationRegression.log:15](D02-EventIntegrationRegression.log) |
| D02 결과 457 | [pass] E06 provider namespace 변경을 새 증거로 혼합하지 않음 | pass | [D02-EventIntegrationRegression.log:16](D02-EventIntegrationRegression.log) |
| D02 결과 458 | [pass] E09 같은 immutable reference의 증거/선택 갱신은 새 job·이전 partial 보존 | pass | [D02-EventIntegrationRegression.log:17](D02-EventIntegrationRegression.log) |
| D02 결과 459 | [pass] E18 4097 frame 증거는 queue 접수 전 명시 거부 | pass | [D02-EventIntegrationRegression.log:18](D02-EventIntegrationRegression.log) |
| D02 결과 460 | [pass] E06/E18 provider generation 변경는 unknown 종료 | pass | [D02-EventIntegrationRegression.log:19](D02-EventIntegrationRegression.log) |
| D02 결과 461 | [pass] E06/E18 provider source 불일치는 unknown 종료 | pass | [D02-EventIntegrationRegression.log:20](D02-EventIntegrationRegression.log) |
| D02 결과 462 | [pass] E06/E18 provider 예외는 unknown 종료 | pass | [D02-EventIntegrationRegression.log:21](D02-EventIntegrationRegression.log) |
| D02 결과 463 | [pass] E06/E18 provider track 불일치는 unknown 종료 | pass | [D02-EventIntegrationRegression.log:22](D02-EventIntegrationRegression.log) |
| D02 결과 464 | [pass] E06/E18 provider channel 불일치는 unknown 종료 | pass | [D02-EventIntegrationRegression.log:23](D02-EventIntegrationRegression.log) |
| D02 결과 465 | [pass] E12 event quota 부족은 Intent/파일/내구 예약 없이 명시 거부 | pass | [D02-EventIntegrationRegression.log:24](D02-EventIntegrationRegression.log) |
| D02 결과 466 | [pass] E12 disk provider 실패를 가용량 0 성공으로 숨기지 않고 Intent 없이 거부 | pass | [D02-EventIntegrationRegression.log:25](D02-EventIntegrationRegression.log) |
| D02 결과 467 | [pass] E18 누적 261개 원본에서도 현재 반개구간 관련 1개만 조회 | pass | [D02-EventIntegrationRegression.log:26](D02-EventIntegrationRegression.log) |
| D02 결과 468 | [pass] E18 반개구간 끝 접점은 이전 원본과 비중첩 | pass | [D02-EventIntegrationRegression.log:27](D02-EventIntegrationRegression.log) |
| D02 결과 469 | [pass] E11 관련 missing binding은 누락하지 않고 snapshot에 보존 | pass | [D02-EventIntegrationRegression.log:28](D02-EventIntegrationRegression.log) |
| D02 결과 470 | [pass] E11 관련 corrupt lifecycle은 동일 snapshot에 보존 | pass | [D02-EventIntegrationRegression.log:29](D02-EventIntegrationRegression.log) |
| D02 결과 471 | [pass] E18 실제 관련 257개는 명시 cap 실패·잘린 confirmed 목록 없음 | pass | [D02-EventIntegrationRegression.log:30](D02-EventIntegrationRegression.log) |
| D02 결과 472 | [pass] E04 실제 writer 후행 finalize와 같은 요청 증거 갱신으로 2출력 완료 | pass | [D02-EventIntegrationRegression.log:31](D02-EventIntegrationRegression.log) |
| D02 결과 473 | [pass] E20 canonical accepted 중복은 원장 mutation 추가 없이 멱등 | pass | [D02-EventIntegrationRegression.log:33](D02-EventIntegrationRegression.log) |
| D02 결과 474 | [pass] E20 동일 reference ID 다른 immutable 내용의 accepted 거부 | pass | [D02-EventIntegrationRegression.log:34](D02-EventIntegrationRegression.log) |
| D02 결과 475 | [pass] E20 SQLite accepted projection의 exact reference 일치 | pass | [D02-EventIntegrationRegression.log:35](D02-EventIntegrationRegression.log) |
| D02 결과 476 | [pass] E20 accepted marker checkpoint projection 일치 | pass | [D02-EventIntegrationRegression.log:36](D02-EventIntegrationRegression.log) |
| D02 결과 477 | [pass] E15/E20 재시작 JSONL fallback accepted/no-job은 증거 발명 없이 managed unknown | pass | [D02-EventIntegrationRegression.log:37](D02-EventIntegrationRegression.log) |
| D02 결과 478 | [pass] E15/E20 재시작 SQLite rebuild accepted/no-job은 증거 발명 없이 managed unknown | pass | [D02-EventIntegrationRegression.log:38](D02-EventIntegrationRegression.log) |
| D02 결과 479 | [pass] E20 replay accepted 선행 참조 없음 거부 | pass | [D02-EventIntegrationRegression.log:39](D02-EventIntegrationRegression.log) |
| D02 결과 480 | [pass] E20 replay accepted unknown 필드 거부 | pass | [D02-EventIntegrationRegression.log:40](D02-EventIntegrationRegression.log) |
| D02 결과 481 | [pass] E20 replay accepted canonical 충돌 거부 | pass | [D02-EventIntegrationRegression.log:41](D02-EventIntegrationRegression.log) |
| D02 결과 482 | [pass] E20 replay accepted 불완전 payload 거부 | pass | [D02-EventIntegrationRegression.log:42](D02-EventIntegrationRegression.log) |
| D02 결과 483 | [pass] E08 동일 원본 snapshot의 명시 UTC 요청→실제 출력·독립 output UTC unknown | pass | [D02-EventIntegrationRegression.log:44](D02-EventIntegrationRegression.log) |
| D02 결과 484 | [pass] E08 같은 UTC의 복수 원본 후보를 자동 단일 선택하지 않음 | pass | [D02-EventIntegrationRegression.log:45](D02-EventIntegrationRegression.log) |
| D02 결과 485 | [pass] E11 UTC confirmed mapping 하나가 보여도 관련 corrupt 원본을 숨기지 않음 | pass | [D02-EventIntegrationRegression.log:46](D02-EventIntegrationRegression.log) |
| D02 결과 486 | [pass] E11 실제 UTC worker도 same-lock corrupt 원본을 available로 승격하지 않음 | pass | [D02-EventIntegrationRegression.log:47](D02-EventIntegrationRegression.log) |
| D02 결과 487 | [pass] E08 UTC unplaced를 원본 snapshot/선택에 보존 | pass | [D02-EventIntegrationRegression.log:48](D02-EventIntegrationRegression.log) |
| D02 결과 488 | [pass] E18 opt-in UTC 후보 예산 초과는 부분 confirmed 결과 없이 실패 | pass | [D02-EventIntegrationRegression.log:49](D02-EventIntegrationRegression.log) |
| D02 결과 489 | [pass] E11 삭제 대기 lifecycle도 원본 snapshot에서 누락하지 않음 | pass | [D02-EventIntegrationRegression.log:50](D02-EventIntegrationRegression.log) |
| D02 결과 490 | [pass] E01 실제 H264 decoder→EventRecord→reference→내구 job·2출력 Complete | pass | [D02-EventIntegrationRegression.log:51](D02-EventIntegrationRegression.log) |
| D02 결과 491 | [pass] E17 무주입 bridge 재생성에도 내구 managed 소유권 유지 | pass | [D02-EventIntegrationRegression.log:53](D02-EventIntegrationRegression.log) |
| D02 결과 492 | [pass] E13 Stop 이후 신규 reference 저장 없음 | pass | [D02-EventIntegrationRegression.log:54](D02-EventIntegrationRegression.log) |
| D02 결과 493 | [pass] E20 비권위 원장 조회 실패는 legacy 억제 unknown | pass | [D02-EventIntegrationRegression.log:55](D02-EventIntegrationRegression.log) |
| D02 결과 494 | [pass] E17 실제 EventStorage managed clip 억제 및 snapshot hook 유지 | pass | [D02-EventIntegrationRegression.log:57](D02-EventIntegrationRegression.log) |
| D02 결과 495 | [pass] E17 실제 EventStorage 기본 clip fallback 유지 및 snapshot hook 유지 | pass | [D02-EventIntegrationRegression.log:60](D02-EventIntegrationRegression.log) |
| D02 결과 496 | [pass] E15 별도 프로세스 Ready _exit 후 보호 복원→bridge reconcile→동일 2출력·decode·commit 1개 | pass | [D02-EventIntegrationRegression.log:66](D02-EventIntegrationRegression.log) |
| D02 결과 497 | [pass] E16 historical Complete와 terminal tombstone 현재 unavailable·재생성 없음 | pass | [D02-EventIntegrationRegression.log:67](D02-EventIntegrationRegression.log) |
| D02 결과 498 | [pass] E13 active 포함 queue cap 포화는 새 accepted/예약 없이 거부 | pass | [D02-EventIntegrationRegression.log:69](D02-EventIntegrationRegression.log) |
| D02 결과 499 | [pass] E14 실제 Run 중 동시 Stop 두 번→취소·단일 join·Failed cleanup 후 자원 해제 | pass | [D02-EventIntegrationRegression.log:70](D02-EventIntegrationRegression.log) |
| D02 결과 500 | [pass] E18 reference job top-8은 wall 역행/재시작에도 동일 ID subset·truncated unknown | pass | [D02-EventIntegrationRegression.log:73](D02-EventIntegrationRegression.log) |
| D02 결과 501 | [pass] E15 startup bounded8 more는 blocker·남은 보호 유지·자동 무한 reconcile 없음 | pass | [D02-EventIntegrationRegression.log:74](D02-EventIntegrationRegression.log) |
| D02 결과 502 | [identity-pass] V410-IDMAP-I01 | pass | [D02-IdentityRegression.log:1](D02-IdentityRegression.log) |
| D02 결과 503 | [identity-pass] V410-IDMAP-I02 | pass | [D02-IdentityRegression.log:2](D02-IdentityRegression.log) |
| D02 결과 504 | [identity-pass] V410-IDMAP-I03 | pass | [D02-IdentityRegression.log:3](D02-IdentityRegression.log) |
| D02 결과 505 | [identity-pass] V410-IDMAP-I04 | pass | [D02-IdentityRegression.log:4](D02-IdentityRegression.log) |
| D02 결과 506 | [identity-pass] V410-IDMAP-I05 | pass | [D02-IdentityRegression.log:5](D02-IdentityRegression.log) |
| D02 결과 507 | [identity-pass] V410-IDMAP-I06 | pass | [D02-IdentityRegression.log:6](D02-IdentityRegression.log) |
| D02 결과 508 | [identity-pass] V410-IDMAP-I07 | pass | [D02-IdentityRegression.log:7](D02-IdentityRegression.log) |
| D02 결과 509 | [identity-pass] S07-time-session-start | pass | [D02-IdentityRegression.log:8](D02-IdentityRegression.log) |
| D02 결과 510 | [identity-pass] S07-time-session-input | pass | [D02-IdentityRegression.log:9](D02-IdentityRegression.log) |
| D02 결과 511 | [identity-pass] S07-time-session-range | pass | [D02-IdentityRegression.log:10](D02-IdentityRegression.log) |
| D02 결과 512 | [identity-pass] S07-time-session-accepted-gap-null | pass | [D02-IdentityRegression.log:11](D02-IdentityRegression.log) |
| D02 결과 513 | [identity-pass] S07-time-session-ambiguous-channel | pass | [D02-IdentityRegression.log:12](D02-IdentityRegression.log) |
| D02 결과 514 | [identity-pass] S07-time-finalize-success-observer-exception-isolated | pass | [D02-IdentityRegression.log:13](D02-IdentityRegression.log) |
| D02 결과 515 | [identity-pass] S07-time-session-restart | pass | [D02-IdentityRegression.log:14](D02-IdentityRegression.log) |
| D02 결과 516 | [identity-pass] S07-time-session-restart-null | pass | [D02-IdentityRegression.log:15](D02-IdentityRegression.log) |
| D02 결과 517 | [identity-pass] S07-time-finalize-failure-no-observer-stop-null | pass | [D02-IdentityRegression.log:16](D02-IdentityRegression.log) |
| D02 결과 518 | [identity-pass] V410-IDMAP-I08 | pass | [D02-IdentityRegression.log:17](D02-IdentityRegression.log) |
| D02 결과 519 | [identity-pass] V410-IDMAP-I09 | pass | [D02-IdentityRegression.log:18](D02-IdentityRegression.log) |
| D02 결과 520 | [identity-pass] V410-IDMAP-I10 | pass | [D02-IdentityRegression.log:19](D02-IdentityRegression.log) |
| D02 결과 521 | [identity-pass] V410-IDMAP-I11 | pass | [D02-IdentityRegression.log:20](D02-IdentityRegression.log) |
| D02 결과 522 | [identity-pass] V410-IDMAP-I12 | pass | [D02-IdentityRegression.log:21](D02-IdentityRegression.log) |
| D02 결과 523 | [identity-pass] V410-IDMAP-I13 | pass | [D02-IdentityRegression.log:22](D02-IdentityRegression.log) |
| D02 결과 524 | [identity-pass] S07-time-session-blocked-writer-null-nonblocking | pass | [D02-IdentityRegression.log:23](D02-IdentityRegression.log) |

현재 유효 524행. child 종료 코드·build·문서 검사는 제품 assertion 수에 합산하지 않는다.

## historical 실행 이력

최초 실패·예상 RED·중간 PASS는 현재 완료를 대체하지 않는다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 이력 1 | [pass] D02-03 동일 source/channel/ns immutable snapshot 전달 | pass | [D02-ActualRuntimeFixed.log:1](D02-ActualRuntimeFixed.log) |
| 이력 2 | [pass] D02-03 다른 channel 증거 혼합 거부 | pass | [D02-ActualRuntimeFixed.log:2](D02-ActualRuntimeFixed.log) |
| 이력 3 | [pass] D02-03 stop namespace 증거 삭제 | pass | [D02-ActualRuntimeFixed.log:3](D02-ActualRuntimeFixed.log) |
| 이력 4 | [pass] D02-03 cache capacity 이전 namespace eviction | pass | [D02-ActualRuntimeFixed.log:4](D02-ActualRuntimeFixed.log) |
| 이력 5 | [pass] D02-03 전체 stop 후 publication/query 거부 | pass | [D02-ActualRuntimeFixed.log:5](D02-ActualRuntimeFixed.log) |
| 이력 6 | [pass] D02-01 신규 root 자동 내구 store identity | pass | [D02-ActualRuntimeFixed.log:6](D02-ActualRuntimeFixed.log) |
| 이력 7 | [pass] D02-01 재개방 동일 store identity | pass | [D02-ActualRuntimeFixed.log:7](D02-ActualRuntimeFixed.log) |
| 이력 8 | [pass] D02-01 서로 다른 root 난수 identity 구별 | pass | [D02-ActualRuntimeFixed.log:8](D02-ActualRuntimeFixed.log) |
| 이력 9 | [pass] D02-02 managed lease 동시 소유 거부 | pass | [D02-ActualRuntimeFixed.log:9](D02-ActualRuntimeFixed.log) |
| 이력 10 | [pass] D02-01 명시 ID 기존 계약 유지 | pass | [D02-ActualRuntimeFixed.log:10](D02-ActualRuntimeFixed.log) |
| 이력 11 | [pass] D02-02 명시 ID 충돌 원본 marker 보존 | pass | [D02-ActualRuntimeFixed.log:11](D02-ActualRuntimeFixed.log) |
| 이력 12 | [pass] D02-02 같은 init 내구 ID 복구 | pass | [D02-ActualRuntimeFixed.log:12](D02-ActualRuntimeFixed.log) |
| 이력 13 | [pass] D02-02 legacy nonempty 변환·삭제 거부 | pass | [D02-ActualRuntimeFixed.log:13](D02-ActualRuntimeFixed.log) |
| 이력 14 | [pass] D02-02 손상/unknown marker 덮어쓰기 거부 | pass | [D02-ActualRuntimeFixed.log:14](D02-ActualRuntimeFixed.log) |
| 이력 15 | [pass] D02-06 실제 H264 입력 준비 | pass | [D02-ActualRuntimeFixed.log:15](D02-ActualRuntimeFixed.log) |
| 이력 16 | [pass] D02-05 실제 V2 finalized startup 미디어 전수 검사 | pass | [D02-ActualRuntimeFixed.log:16](D02-ActualRuntimeFixed.log) |
| 이력 17 | [pass] D02-05 실제 V2 size/hash 손상 감지·catalog Mark | pass | [D02-ActualRuntimeFixed.log:17](D02-ActualRuntimeFixed.log) |
| 이력 18 | [pass] D02-10 default 준비16s·500ms·33회 예산 | pass | [D02-ActualRuntimeFixed.log:18](D02-ActualRuntimeFixed.log) |
| 이력 19 | [pass] D02-06 on 구성의 동일 managed store/catalog writer 결박 | pass | [D02-ActualRuntimeFixed.log:19](D02-ActualRuntimeFixed.log) |
| 이력 20 | [pass] D02-07 빈 저장소 runtime 복구 함수 | pass | [D02-ActualRuntimeFixed.log:20](D02-ActualRuntimeFixed.log) |
| 이력 21 | [pass] D02-06 off managed 형식 유지·미디어 비생산 | pass | [D02-ActualRuntimeFixed.log:21](D02-ActualRuntimeFixed.log) |
| 이력 22 | [pass] D02-04/11 raw key→numeric 참조·history null provider 접수·공개 record 불변 | pass | [D02-ActualRuntimeFixed.log:22](D02-ActualRuntimeFixed.log) |
| 이력 23 | [pass] D02-06 off/on 재개방 동일 store identity | pass | [D02-ActualRuntimeFixed.log:24](D02-ActualRuntimeFixed.log) |
| 이력 24 | [pass] D02-07 실제 producer 시작 전 runtime 복구 | pass | [D02-ActualRuntimeFixed.log:25](D02-ActualRuntimeFixed.log) |
| 이력 25 | [pass] D02-06 실제 supervisor/session off 생산0·기존 segment 보존 | pass | [D02-ActualRuntimeFixed.log:26](D02-ActualRuntimeFixed.log) |
| 이력 26 | [pass] D02-08 실제 source/session 종료 owner0 | pass | [D02-ActualRuntimeFixed.log:27](D02-ActualRuntimeFixed.log) |
| 이력 27 | [pass] D02-06 off/on 재개방 동일 store identity | pass | [D02-ActualRuntimeFixed.log:28](D02-ActualRuntimeFixed.log) |
| 이력 28 | [pass] D02-07 실제 producer 시작 전 runtime 복구 | pass | [D02-ActualRuntimeFixed.log:29](D02-ActualRuntimeFixed.log) |
| 이력 29 | [pass] D02-06 실제 supervisor/session on 숫자 채널 V2 파일 생성 | pass | [D02-ActualRuntimeFixed.log:30](D02-ActualRuntimeFixed.log) |
| 이력 30 | [fail] D02-08 실제 source/session 종료 owner0 | fail | [D02-ActualRuntimeFixed.log:31](D02-ActualRuntimeFixed.log) |
| 이력 31 | [pass] D02-06 off/on 재개방 동일 store identity | pass | [D02-ActualRuntimeFixed.log:32](D02-ActualRuntimeFixed.log) |
| 이력 32 | [pass] D02-07 실제 producer 시작 전 runtime 복구 | pass | [D02-ActualRuntimeFixed.log:33](D02-ActualRuntimeFixed.log) |
| 이력 33 | [pass] D02-06 실제 supervisor/session off 생산0·기존 segment 보존 | pass | [D02-ActualRuntimeFixed.log:34](D02-ActualRuntimeFixed.log) |
| 이력 34 | [pass] D02-08 실제 source/session 종료 owner0 | pass | [D02-ActualRuntimeFixed.log:35](D02-ActualRuntimeFixed.log) |
| 이력 35 | [pass] D02-06 off/on 재개방 동일 store identity | pass | [D02-ActualRuntimeFixed.log:36](D02-ActualRuntimeFixed.log) |
| 이력 36 | [pass] D02-07 실제 producer 시작 전 runtime 복구 | pass | [D02-ActualRuntimeFixed.log:37](D02-ActualRuntimeFixed.log) |
| 이력 37 | [pass] D02-06 실제 supervisor/session on 숫자 채널 V2 파일 생성 | pass | [D02-ActualRuntimeFixed.log:38](D02-ActualRuntimeFixed.log) |
| 이력 38 | [fail] D02-08 실제 source/session 종료 owner0 | fail | [D02-ActualRuntimeFixed.log:39](D02-ActualRuntimeFixed.log) |
| 이력 39 | [fail] D02-03 동일 source/channel/ns immutable snapshot 전달 | fail | [D02-CacheRedIdentityGreenFixed.log:1](D02-CacheRedIdentityGreenFixed.log) |
| 이력 40 | [pass] D02-03 다른 channel 증거 혼합 거부 | pass | [D02-CacheRedIdentityGreenFixed.log:2](D02-CacheRedIdentityGreenFixed.log) |
| 이력 41 | [pass] D02-03 stop namespace 증거 삭제 | pass | [D02-CacheRedIdentityGreenFixed.log:3](D02-CacheRedIdentityGreenFixed.log) |
| 이력 42 | [fail] D02-03 cache capacity 이전 namespace eviction | fail | [D02-CacheRedIdentityGreenFixed.log:4](D02-CacheRedIdentityGreenFixed.log) |
| 이력 43 | [pass] D02-03 전체 stop 후 publication/query 거부 | pass | [D02-CacheRedIdentityGreenFixed.log:5](D02-CacheRedIdentityGreenFixed.log) |
| 이력 44 | [pass] D02-01 신규 root 자동 내구 store identity | pass | [D02-CacheRedIdentityGreenFixed.log:6](D02-CacheRedIdentityGreenFixed.log) |
| 이력 45 | [pass] D02-01 재개방 동일 store identity | pass | [D02-CacheRedIdentityGreenFixed.log:7](D02-CacheRedIdentityGreenFixed.log) |
| 이력 46 | [pass] D02-01 서로 다른 root 난수 identity 구별 | pass | [D02-CacheRedIdentityGreenFixed.log:8](D02-CacheRedIdentityGreenFixed.log) |
| 이력 47 | [pass] D02-02 managed lease 동시 소유 거부 | pass | [D02-CacheRedIdentityGreenFixed.log:9](D02-CacheRedIdentityGreenFixed.log) |
| 이력 48 | [pass] D02-01 명시 ID 기존 계약 유지 | pass | [D02-CacheRedIdentityGreenFixed.log:10](D02-CacheRedIdentityGreenFixed.log) |
| 이력 49 | [pass] D02-02 명시 ID 충돌 원본 marker 보존 | pass | [D02-CacheRedIdentityGreenFixed.log:11](D02-CacheRedIdentityGreenFixed.log) |
| 이력 50 | [pass] D02-02 같은 init 내구 ID 복구 | pass | [D02-CacheRedIdentityGreenFixed.log:12](D02-CacheRedIdentityGreenFixed.log) |
| 이력 51 | [pass] D02-02 legacy nonempty 변환·삭제 거부 | pass | [D02-CacheRedIdentityGreenFixed.log:13](D02-CacheRedIdentityGreenFixed.log) |
| 이력 52 | [pass] D02-02 손상/unknown marker 덮어쓰기 거부 | pass | [D02-CacheRedIdentityGreenFixed.log:14](D02-CacheRedIdentityGreenFixed.log) |
| 이력 53 | [pass] D02-06 실제 H264 입력 준비 | pass | [D02-CacheRedIdentityGreenFixed.log:15](D02-CacheRedIdentityGreenFixed.log) |
| 이력 54 | [pass] D02-03 동일 source/channel/ns immutable snapshot 전달 | pass | [D02-CompositionFirstFixed.log:1](D02-CompositionFirstFixed.log) |
| 이력 55 | [pass] D02-03 다른 channel 증거 혼합 거부 | pass | [D02-CompositionFirstFixed.log:2](D02-CompositionFirstFixed.log) |
| 이력 56 | [pass] D02-03 stop namespace 증거 삭제 | pass | [D02-CompositionFirstFixed.log:3](D02-CompositionFirstFixed.log) |
| 이력 57 | [pass] D02-03 cache capacity 이전 namespace eviction | pass | [D02-CompositionFirstFixed.log:4](D02-CompositionFirstFixed.log) |
| 이력 58 | [pass] D02-03 전체 stop 후 publication/query 거부 | pass | [D02-CompositionFirstFixed.log:5](D02-CompositionFirstFixed.log) |
| 이력 59 | [pass] D02-01 신규 root 자동 내구 store identity | pass | [D02-CompositionFirstFixed.log:6](D02-CompositionFirstFixed.log) |
| 이력 60 | [pass] D02-01 재개방 동일 store identity | pass | [D02-CompositionFirstFixed.log:7](D02-CompositionFirstFixed.log) |
| 이력 61 | [pass] D02-01 서로 다른 root 난수 identity 구별 | pass | [D02-CompositionFirstFixed.log:8](D02-CompositionFirstFixed.log) |
| 이력 62 | [pass] D02-02 managed lease 동시 소유 거부 | pass | [D02-CompositionFirstFixed.log:9](D02-CompositionFirstFixed.log) |
| 이력 63 | [pass] D02-01 명시 ID 기존 계약 유지 | pass | [D02-CompositionFirstFixed.log:10](D02-CompositionFirstFixed.log) |
| 이력 64 | [pass] D02-02 명시 ID 충돌 원본 marker 보존 | pass | [D02-CompositionFirstFixed.log:11](D02-CompositionFirstFixed.log) |
| 이력 65 | [pass] D02-02 같은 init 내구 ID 복구 | pass | [D02-CompositionFirstFixed.log:12](D02-CompositionFirstFixed.log) |
| 이력 66 | [pass] D02-02 legacy nonempty 변환·삭제 거부 | pass | [D02-CompositionFirstFixed.log:13](D02-CompositionFirstFixed.log) |
| 이력 67 | [pass] D02-02 손상/unknown marker 덮어쓰기 거부 | pass | [D02-CompositionFirstFixed.log:14](D02-CompositionFirstFixed.log) |
| 이력 68 | [pass] D02-06 실제 H264 입력 준비 | pass | [D02-CompositionFirstFixed.log:15](D02-CompositionFirstFixed.log) |
| 이력 69 | [pass] D02-05 실제 V2 finalized startup 미디어 전수 검사 | pass | [D02-CompositionFirstFixed.log:16](D02-CompositionFirstFixed.log) |
| 이력 70 | [pass] D02-05 실제 V2 size/hash 손상 감지·catalog Mark | pass | [D02-CompositionFirstFixed.log:17](D02-CompositionFirstFixed.log) |
| 이력 71 | [pass] D02-10 default 준비16s·500ms·33회 예산 | pass | [D02-CompositionFirstFixed.log:18](D02-CompositionFirstFixed.log) |
| 이력 72 | [pass] D02-06 on 구성의 동일 managed store/catalog writer 결박 | pass | [D02-CompositionFirstFixed.log:19](D02-CompositionFirstFixed.log) |
| 이력 73 | [pass] D02-07 빈 저장소 runtime 복구 함수 | pass | [D02-CompositionFirstFixed.log:20](D02-CompositionFirstFixed.log) |
| 이력 74 | [pass] D02-06 off managed 형식 유지·미디어 비생산 | pass | [D02-CompositionFirstFixed.log:21](D02-CompositionFirstFixed.log) |
| 이력 75 | [pass] D02-04/11 raw key→numeric 참조·history null provider 접수·공개 record 불변 | pass | [D02-CompositionFirstFixed.log:22](D02-CompositionFirstFixed.log) |
| 이력 76 | [fail] D02-01 신규 root 자동 내구 store identity | fail | [D02-IdentityRed.log:1](D02-IdentityRed.log) |
| 이력 77 | [fail] D02-01 재개방 동일 store identity | fail | [D02-IdentityRed.log:2](D02-IdentityRed.log) |
| 이력 78 | [fail] D02-01 서로 다른 root 난수 identity 구별 | fail | [D02-IdentityRed.log:3](D02-IdentityRed.log) |
| 이력 79 | [pass] D02-02 managed lease 동시 소유 거부 | pass | [D02-IdentityRed.log:4](D02-IdentityRed.log) |
| 이력 80 | [pass] D02-06 실제 H264 입력 준비 | pass | [D02-IdentityRed.log:5](D02-IdentityRed.log) |
| 이력 81 | [pass] D02-03 동일 source/channel/ns immutable snapshot 전달 | pass | [D02-ProviderBudgetRed.log:1](D02-ProviderBudgetRed.log) |
| 이력 82 | [pass] D02-03 다른 channel 증거 혼합 거부 | pass | [D02-ProviderBudgetRed.log:2](D02-ProviderBudgetRed.log) |
| 이력 83 | [pass] D02-03 stop namespace 증거 삭제 | pass | [D02-ProviderBudgetRed.log:3](D02-ProviderBudgetRed.log) |
| 이력 84 | [pass] D02-03 cache capacity 이전 namespace eviction | pass | [D02-ProviderBudgetRed.log:4](D02-ProviderBudgetRed.log) |
| 이력 85 | [pass] D02-03 전체 stop 후 publication/query 거부 | pass | [D02-ProviderBudgetRed.log:5](D02-ProviderBudgetRed.log) |
| 이력 86 | [pass] D02-01 신규 root 자동 내구 store identity | pass | [D02-ProviderBudgetRed.log:6](D02-ProviderBudgetRed.log) |
| 이력 87 | [pass] D02-01 재개방 동일 store identity | pass | [D02-ProviderBudgetRed.log:7](D02-ProviderBudgetRed.log) |
| 이력 88 | [pass] D02-01 서로 다른 root 난수 identity 구별 | pass | [D02-ProviderBudgetRed.log:8](D02-ProviderBudgetRed.log) |
| 이력 89 | [pass] D02-02 managed lease 동시 소유 거부 | pass | [D02-ProviderBudgetRed.log:9](D02-ProviderBudgetRed.log) |
| 이력 90 | [pass] D02-01 명시 ID 기존 계약 유지 | pass | [D02-ProviderBudgetRed.log:10](D02-ProviderBudgetRed.log) |
| 이력 91 | [pass] D02-02 명시 ID 충돌 원본 marker 보존 | pass | [D02-ProviderBudgetRed.log:11](D02-ProviderBudgetRed.log) |
| 이력 92 | [pass] D02-02 같은 init 내구 ID 복구 | pass | [D02-ProviderBudgetRed.log:12](D02-ProviderBudgetRed.log) |
| 이력 93 | [pass] D02-02 legacy nonempty 변환·삭제 거부 | pass | [D02-ProviderBudgetRed.log:13](D02-ProviderBudgetRed.log) |
| 이력 94 | [pass] D02-02 손상/unknown marker 덮어쓰기 거부 | pass | [D02-ProviderBudgetRed.log:14](D02-ProviderBudgetRed.log) |
| 이력 95 | [pass] D02-06 실제 H264 입력 준비 | pass | [D02-ProviderBudgetRed.log:15](D02-ProviderBudgetRed.log) |
| 이력 96 | [fail] D02-10 default 준비16s·500ms·33회 예산 | fail | [D02-ProviderBudgetRed.log:16](D02-ProviderBudgetRed.log) |
| 이력 97 | [fail] D02-04/11 raw key→numeric 참조·history null provider 접수·공개 record 불변 | fail | [D02-ProviderBudgetRed.log:17](D02-ProviderBudgetRed.log) |
| 이력 98 | [pass] D02-03 동일 source/channel/ns immutable snapshot 전달 | pass | [D02-RuntimeStartupRed.log:1](D02-RuntimeStartupRed.log) |
| 이력 99 | [pass] D02-03 다른 channel 증거 혼합 거부 | pass | [D02-RuntimeStartupRed.log:2](D02-RuntimeStartupRed.log) |
| 이력 100 | [pass] D02-03 stop namespace 증거 삭제 | pass | [D02-RuntimeStartupRed.log:3](D02-RuntimeStartupRed.log) |
| 이력 101 | [pass] D02-03 cache capacity 이전 namespace eviction | pass | [D02-RuntimeStartupRed.log:4](D02-RuntimeStartupRed.log) |
| 이력 102 | [pass] D02-03 전체 stop 후 publication/query 거부 | pass | [D02-RuntimeStartupRed.log:5](D02-RuntimeStartupRed.log) |
| 이력 103 | [pass] D02-01 신규 root 자동 내구 store identity | pass | [D02-RuntimeStartupRed.log:6](D02-RuntimeStartupRed.log) |
| 이력 104 | [pass] D02-01 재개방 동일 store identity | pass | [D02-RuntimeStartupRed.log:7](D02-RuntimeStartupRed.log) |
| 이력 105 | [pass] D02-01 서로 다른 root 난수 identity 구별 | pass | [D02-RuntimeStartupRed.log:8](D02-RuntimeStartupRed.log) |
| 이력 106 | [pass] D02-02 managed lease 동시 소유 거부 | pass | [D02-RuntimeStartupRed.log:9](D02-RuntimeStartupRed.log) |
| 이력 107 | [pass] D02-01 명시 ID 기존 계약 유지 | pass | [D02-RuntimeStartupRed.log:10](D02-RuntimeStartupRed.log) |
| 이력 108 | [pass] D02-02 명시 ID 충돌 원본 marker 보존 | pass | [D02-RuntimeStartupRed.log:11](D02-RuntimeStartupRed.log) |
| 이력 109 | [pass] D02-02 같은 init 내구 ID 복구 | pass | [D02-RuntimeStartupRed.log:12](D02-RuntimeStartupRed.log) |
| 이력 110 | [pass] D02-02 legacy nonempty 변환·삭제 거부 | pass | [D02-RuntimeStartupRed.log:13](D02-RuntimeStartupRed.log) |
| 이력 111 | [pass] D02-02 손상/unknown marker 덮어쓰기 거부 | pass | [D02-RuntimeStartupRed.log:14](D02-RuntimeStartupRed.log) |
| 이력 112 | [pass] D02-06 실제 H264 입력 준비 | pass | [D02-RuntimeStartupRed.log:15](D02-RuntimeStartupRed.log) |
| 이력 113 | [fail] D02-05 실제 V2 finalized startup 미디어 전수 검사 | fail | [D02-RuntimeStartupRed.log:16](D02-RuntimeStartupRed.log) |
| 이력 114 | [fail] D02-05 실제 V2 size/hash 손상 감지·catalog Mark | fail | [D02-RuntimeStartupRed.log:17](D02-RuntimeStartupRed.log) |
| 이력 115 | [pass] D02-10 default 준비16s·500ms·33회 예산 | pass | [D02-RuntimeStartupRed.log:18](D02-RuntimeStartupRed.log) |
| 이력 116 | [fail] D02-06 on 구성의 동일 managed store/catalog writer 결박 | fail | [D02-RuntimeStartupRed.log:19](D02-RuntimeStartupRed.log) |
| 이력 117 | [fail] D02-07 빈 저장소 runtime 복구 함수 | fail | [D02-RuntimeStartupRed.log:20](D02-RuntimeStartupRed.log) |
| 이력 118 | [pass] D02-06 off 기존 비녹화 저장소 구성 유지 | pass | [D02-RuntimeStartupRed.log:21](D02-RuntimeStartupRed.log) |
| 이력 119 | [pass] D02-04/11 raw key→numeric 참조·history null provider 접수·공개 record 불변 | pass | [D02-RuntimeStartupRed.log:22](D02-RuntimeStartupRed.log) |

ClosingActual 중복 42개 정상 결과와 child exit134는 원출력 그대로 보존하며 중복 합산하지 않았다. assertion 없는 빌드·준비 실패는 보고서 실행 이력에 구분한다. 전수 추출 최초 시도는 provider 문자열이 두 행에 있어 예상 1행 guard가 문서 생성을 중단했다(exit1). 정확한 D02-08 행으로 좁힌 뒤 재추출했으며 제품 결과는 변경·재실행하지 않았다.

## 정리 전수

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-default-composition.sdCdy2 | 소유 격리 fixture/media/binary | 0 bytes | 실행 trap 삭제·현재 부재 재확인 | 삭제 완료 | [D02-ActualRuntime.log:5](D02-ActualRuntime.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-default-composition.vx7ath | 소유 격리 fixture/media/binary | 10150543 bytes | 실행 trap 삭제·현재 부재 재확인 | 삭제 완료 | [D02-ActualRuntimeFixed.log:41](D02-ActualRuntimeFixed.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-default-composition.P2UonH | 소유 격리 fixture/media/binary | 12200638 bytes | 실행 trap 삭제·현재 부재 재확인 | 삭제 완료 | [D02-ActualRuntimeIdleFixed.log:49](D02-ActualRuntimeIdleFixed.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-default-composition.eQxMEK | 소유 격리 fixture/media/binary | 0 bytes | 실행 trap 삭제·현재 부재 재확인 | 삭제 완료 | [D02-CacheRedIdentityGreen.log:211](D02-CacheRedIdentityGreen.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-default-composition.me5d13 | 소유 격리 fixture/media/binary | 1054990 bytes | 실행 trap 삭제·현재 부재 재확인 | 삭제 완료 | [D02-CacheRedIdentityGreenFixed.log:17](D02-CacheRedIdentityGreenFixed.log) |
| /tmp/media_server_v410_recording_catalog-13761 | 소유 격리 fixture/media/binary | 26454758 bytes | 실행 trap 삭제·현재 부재 재확인 | 삭제 완료 | [D02-CatalogRegression.log:248](D02-CatalogRegression.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-default-composition.lHfjQr | 소유 격리 fixture/media/binary | 12960569 bytes | 실행 trap 삭제·현재 부재 재확인 | 삭제 완료 | [D02-ClosingActual.log:53](D02-ClosingActual.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-default-composition.c8S02G | 소유 격리 fixture/media/binary | 6665148 bytes | 실행 trap 삭제·현재 부재 재확인 | 삭제 완료 | [D02-CompositionFirstFixed.log:24](D02-CompositionFirstFixed.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-consumer-connection.2cJxCR | 소유 격리 fixture/media/binary | 6173631 bytes | 실행 trap 삭제·현재 부재 재확인 | 삭제 완료 | [D02-ConnectionRegression.log:24](D02-ConnectionRegression.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-event-integration.kHa4E5 | 소유 격리 fixture/media/binary | 12939084 bytes | 실행 trap 삭제·현재 부재 재확인 | 삭제 완료 | [D02-EventIntegrationRegression.log:76](D02-EventIntegrationRegression.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-default-composition.27GF8e | 소유 격리 fixture/media/binary | 939704 bytes | 실행 trap 삭제·현재 부재 재확인 | 삭제 완료 | [D02-IdentityRed.log:7](D02-IdentityRed.log) |
| /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T//media-server-identity-unit.zOBxkI | 소유 격리 fixture/media/binary | 7027217 bytes | 실행 trap 삭제·현재 부재 재확인 | 삭제 완료 | [D02-IdentityRegression.log:25](D02-IdentityRegression.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-managed-writer.zxkhIi | 소유 격리 fixture/media/binary | 14416303 bytes | 실행 trap 삭제·현재 부재 재확인 | 삭제 완료 | [D02-ManagedWriterRegression.log:52](D02-ManagedWriterRegression.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-default-composition.aeG3tq | 소유 격리 fixture/media/binary | 5877796 bytes | 실행 trap 삭제·현재 부재 재확인 | 삭제 완료 | [D02-ProviderBudgetRed.log:19](D02-ProviderBudgetRed.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-default-composition.B6iMSi | 소유 격리 fixture/media/binary | 9715439 bytes | 실행 trap 삭제·현재 부재 재확인 | 삭제 완료 | [D02-RecoveryOnly.log:6](D02-RecoveryOnly.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-consumer-reference.CJuYkr | 소유 격리 fixture/media/binary | 4678941 bytes | 실행 trap 삭제·현재 부재 재확인 | 삭제 완료 | [D02-ReferenceRegression.log:31](D02-ReferenceRegression.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-retention-v2.6dNSlC | 소유 격리 fixture/media/binary | 9979914 bytes | 실행 trap 삭제·현재 부재 재확인 | 삭제 완료 | [D02-RetentionRegression.log:27](D02-RetentionRegression.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-default-composition.azWMsZ | 소유 격리 fixture/media/binary | 6660864 bytes | 실행 trap 삭제·현재 부재 재확인 | 삭제 완료 | [D02-RuntimeStartupRed.log:24](D02-RuntimeStartupRed.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-startup-unit.ZPWGB7 | 소유 격리 fixture/media/binary | 7626663 bytes | 실행 trap 삭제·현재 부재 재확인 | 삭제 완료 | [D02-StartupRegression.log:46](D02-StartupRegression.log) |

소유 임시 root 19개 삭제·부재 확인. /cores/core.13548은 부재였고 공유 시스템 crash 자료는 삭제하지 않았다. freshness 거부는 temp 생성 전이다. 기존 build directory는 재사용 제품 build 산출물로 보존한다. 저장소 텍스트 로그·해시·전수표는 재현·검토 근거로 보존하고 실제 media는 정리했다.
