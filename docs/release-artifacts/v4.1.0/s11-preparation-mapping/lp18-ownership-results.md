# LP18 공유 소유 focused 개별 결과

독자: 녹화 구현·검증 담당. 수명: 이번 단기 검사의 실패/RED/GREEN 보존형 전수 결과. 정책은 AGENTS.md이며 해석은 [중앙 기록](../../../release-test-records.md)의 LP18을 따른다.
예상 RED의 assertion은 실제 FAIL로 남기며 제품 PASS로 바꾸지 않는다.

## 위치 기반: RED·GREEN·writer 영향 실패

### lp18-location-build-01.txt

[원출력](lp18-location-build-01.txt)

개별 assertion 출력 없음. 실제 명령·exit는 원출력과 중앙 기록에 보존하며 결과를 추정 생성하지 않는다.

### lp18-location-cache-01.txt

[원출력](lp18-location-cache-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP15-C01 cold full applied=1 expected=1 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 2. LP15-C01 unchanged prefix applied=0 expected=0 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 3. LP15-C01 exact prefix suffix only applied=1 expected=1 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 4. LP15-C01 independent prefix shadow/full projection equality | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 5. LP15-C01 full fallback schema applied=2 expected=2 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 6. LP15-C01 full fallback type applied=2 expected=2 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 7. LP15-C01 full fallback id applied=2 expected=2 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 8. LP15-C01 full fallback entity applied=2 expected=2 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 9. LP15-C01 full fallback time applied=2 expected=2 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 10. LP15-C01 full fallback payload applied=2 expected=2 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 11. LP15-C01 full fallback reorder applied=2 expected=2 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 12. LP15-C01 full fallback shrink applied=2 expected=2 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 13. LP15-C01 full fallback null-shadow applied=2 expected=2 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 14. LP15-C01 full fallback null-handle applied=2 expected=2 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 15. LP15-C01 Open clears cache applied=2 expected=2 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 16. LP15-C03 recover full/no-cache | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 17. LP15-C03 after recover full applied=2 expected=2 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 18. LP15-C03 injected commit refusal discards cache | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 19. LP15-C03 after commit refusal full applied=2 expected=2 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 20. LP15-C03 suffix exception discards cache | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 21. LP15-C03 after exception full applied=3 expected=3 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 22. LP15-C03 public poisoned entry discards cache | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 23. LP15-C03 after restored fixture full applied=3 expected=3 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 24. LP15-C04 exact byte charge boundary | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 25. LP15-C04 overflow charge rejected | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 26. LP15-C04 8192 records admitted | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 27. LP15-C04 8193 records rejected | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 28. LP15-C04 64MiB record charge admitted | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 29. LP15-C04 64MiB plus one rejected | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 30. LP15-C03 changed candidate prime applied=1 expected=1 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 31. LP15-C03 changed candidate suffix12 plus full candidate13 applied=25 expected=25 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 32. LP15-C03 changed candidate cache equals independent full projection | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 33. LP15-C03 compacted candidate prefix reused applied=0 expected=0 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 34. LP15-C03 forced projection mismatch discards cache | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 35. LP15-C04 overlimit prime applied=1 expected=1 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 36. LP15-C04 existing cache ignored for oversized original applied=8193 expected=8193 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 37. LP15-C04 oversized candidate not retained | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 38. LP15-C04 next oversized checkpoint full applied=8193 expected=8193 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 39. CP01 actual Ready Complete shape canonical files reservation | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 40. CP02 bounded two jobs over 1MiB canonical transitions | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 41. LP15-C02 bounded automatic checkpoint and whole transition measurement | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 42. LP15-C02 reopened full applied=18 expected=18 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 43. LP15-C02 actual unchanged prefix applied=0 expected=0 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 44. LP15-C02 actual suffix only applied=1 expected=1 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 45. LP15-C02 actual job shadow/full projection equality | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 46. LP15-C03 illegal Ready after Complete suffix rejected by cached/full paths | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 47. LP15-C04 peakRSS bytes=162611200 cap=536870912 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |

### lp18-location-catalog-01.txt

[원출력](lp18-location-catalog-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. journal open:  | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 2. fallback catalog open:  | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 3. SQLite off mode 표시 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 4. segment finalize journal+projection:  | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 5. fallback range query | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 6. event link FK 위반 거부 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 7. FK 위반 transaction/journal 전체 rollback | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 8. 최초 durable mutation 1개 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 9. 동일 mutation 중복 append | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 10. 손상 사이 정상 durable mutation 보존 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 11. 중간 corrupt line count | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 12. 마지막 truncated line skip | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 13. fallback replay open | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 14. 같은 mutation idempotent replay | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 15. 재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 16. 중복 replay row/합계 불증가 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 17. 추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구:  | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 18. writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 19. v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 20. SQLite catalog open/rebuild:  | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 21. SQLite primary mode 표시 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 22. SQLite on/off range query ID·순서 parity | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 23. journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 24. journal 없는 손상 media orphan 구분 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 25. projection failover journal open:  | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 26. projection failover catalog open:  | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 27. 실제 SQLite INSERT 실패 trigger 설치 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 28. SQLite 투영 실패 뒤 journal+memory finalize 유지:  | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 29. SQLite 투영 실패 즉시 JSONL fallback 전환 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 30. 재시작 rebuild 전 실패 trigger 제거 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 31. 투영 실패 직후 in-memory query 정합성 유지 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 32. projection failover 재시작 journal rebuild:  | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 33. 재시작 후 journal에서 누락 SQLite projection 복구 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 34. 재시작 후 SQLite primary 복귀 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 35. 재시작 journal rebuild가 실제 SQLite row 복원 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 36. tombstone journal open:  | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 37. tombstone catalog open:  | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 38. tombstone 대상 segment finalize:  | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 39. tombstone 대상 deletion request:  | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 40. tombstone 완료 기록:  | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 41. catalog finalize가 tombstone segment ID 재사용을 거부해야 함 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 42. 손상 SQLite 격리 후 journal rebuild:  | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 43. 손상 SQLite 원본 격리 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 44. 격리 SQLite 파일 보존 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 45. 격리 후 journal rebuild 결과 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 46. S10-3A future-schema journal read open | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 47. S10-3A future-schema unsupported classification | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 48. S10-3A future-schema catalog open denied | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 49. S10-3A future-schema catalog retry denied | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 50. S10-3A future-schema journal bytes preserved | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 51. S10-3A future-schema SQLite bytes preserved | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 52. S10-3A future-schema writer cleanup untouched | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 53. S10-3A arbitrary-schema journal read open | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 54. S10-3A arbitrary-schema unsupported classification | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 55. S10-3A arbitrary-schema catalog open denied | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 56. S10-3A arbitrary-schema catalog retry denied | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 57. S10-3A arbitrary-schema journal bytes preserved | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 58. S10-3A arbitrary-schema SQLite bytes preserved | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 59. S10-3A arbitrary-schema writer cleanup untouched | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 60. S10-3A empty-schema journal read open | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 61. S10-3A empty-schema unsupported classification | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 62. S10-3A empty-schema catalog open denied | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 63. S10-3A empty-schema catalog retry denied | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 64. S10-3A empty-schema journal bytes preserved | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 65. S10-3A empty-schema SQLite bytes preserved | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 66. S10-3A empty-schema writer cleanup untouched | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 67. S10-3A future-type journal read open | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 68. S10-3A future-type unsupported classification | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 69. S10-3A future-type catalog open denied | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 70. S10-3A future-type catalog retry denied | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 71. S10-3A future-type journal bytes preserved | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 72. S10-3A future-type SQLite bytes preserved | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 73. S10-3A future-type writer cleanup untouched | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 74. S10-3A malformed journal open | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 75. S10-3A malformed JSON missing fields and wrong types remain corrupt | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 76. S10-O01 reservation journal open | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 77. S10-O01 first reservation returns four IDs and sequence one | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 78. S10-O01 versioned reservation payload replays | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 79. S10-O01 new reservation records actual occurred time | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 80. S10-O02 identical retry preserves sequence and bytes | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 81. S10-O03 reopened instance allocates next sequence | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 82. S10-O03 new process resumes durable sequence | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 83. S10-O04 different store rejected | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 84. S10-O04 reused request with different segment rejected | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 85. S10-O04 reused request with different channel rejected | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 86. S10-O04 reused segment with different request rejected | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 87. S10-O04 conflicts preserve original bytes | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 88. S10-O05/O06 reject and preserve corrupt | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 89. S10-O05/O06 reject and preserve unsupported-schema | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 90. S10-O05/O06 reject and preserve unsupported-type | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 91. S10-O05/O06 reject and preserve tail | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 92. S10-O05/O06 reject and preserve payload-zero | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 93. S10-O05/O06 reject and preserve payload-negative | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 94. S10-O05/O06 reject and preserve payload-fraction | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 95. S10-O05/O06 reject and preserve payload-overflow | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 96. S10-O05/O06 reject and preserve duplicate-sequence | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 97. S10-O05/O06 reject and preserve decreasing-sequence | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 98. S10-O05/O06 reject and preserve duplicate-request | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 99. S10-O05/O06 reject and preserve duplicate-segment | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 100. S10-O05/O06 reject and preserve store-conflict | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 101. S10-O05/O06 reject and preserve ordinary-before | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 102. S10-O05/O06 reject and preserve ordinary-after | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 103. S10-O05/O06 reject and preserve line-cap | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 104. S10-O05 reservation entity envelope binding rejects mismatch | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 105. S10-O05 reservation request envelope binding rejects mismatch | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 106. S10-O01 strict reservation parser accepts versioned literal | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 107. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 108. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 109. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 110. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 111. S10-O06 INT64_MAX identical retry remains valid | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 112. S10-O06 sequence overflow rejected without write | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 113. S10-O02 identical durable reservation duplicates remain idempotent | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 114. S10-O06 sequence gaps remain valid and allocate above maximum | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 115. S10-O07 four simultaneous processes finish reservations | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 116. S10-O07 concurrent sequences are unique and complete | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 117. S10-O07 next sequence follows concurrent reservations | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 118. S10-O08 ordinary Append cannot reserve orders | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 119. S10-O08 unopened journal rejected | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 120. S10-O08 null result rejected | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 121. S10-O08 invalid opaque ID rejected | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 122. S10-O08 failed reservation does not expose tentative result | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 123. S10-O09 unsafe file binding rejected and original preserved inode | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 124. S10-O09 unsafe file binding rejected and original preserved parent | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 125. S10-O09 unsafe file binding rejected and original preserved symlink | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 126. S10-O09 unsafe file binding rejected and original preserved hardlink | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 127. S10-O10 reservation and normal segment coexist in catalog | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 128. S10-O04 reserve then finalize permits identical retry | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 129. S10-O10 reservation survives catalog rebuild without changing segment query | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 130. S10-O04 legacy segment cannot acquire retroactive reservation | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 131. S10-M06 opened catalog accepts fresh exact reservation V2 finalize | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 132. S10-M07 V2 find preserves complete metadata | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 133. S10-M07 identical V2 recovery is idempotent | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 134. S10-M07 V2 is absent from V1 range query | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 135. S10-M07 V2 registered path is not orphan | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 136. S10-M07 SQLite exact V2 JSON and path match | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 137. S10-M07 JSONL restart preserves V2 exact payload | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 138. S10-M06 wrong reservation tuple rejected store | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 139. S10-M06 wrong reservation tuple rejected request | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 140. S10-M06 wrong reservation tuple rejected segment | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 141. S10-M06 wrong reservation tuple rejected channel | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 142. S10-M06 wrong reservation tuple rejected sequence | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 143. S10-M09 immutable V2 mapping mismatch rejected | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 144. S10-M09 bad V2 startup retry preserves original state bad-payload | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 145. S10-M09 bad V2 startup retry preserves original state missing-order | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 146. S10-M09 bad V2 startup retry preserves original state bad-order | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 147. S10-M09 bad V2 startup retry preserves original state conflicting-order | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 148. S10-M09 bad V2 startup retry preserves original state tail | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 149. S10-M09 bad V2 startup retry preserves original state corrupt | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 150. S10-M09 bad V2 startup retry preserves original state unsafe-path | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 151. S10-M09 default off rejects V2 before SQLite changes | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 152. S10-M09 V2 replay namespace and deletion duplicate | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 153. S10-M09 V2 replay namespace and deletion deleted | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 154. S10-M09 V2 replay namespace and deletion v1-before | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 155. S10-M09 V2 replay namespace and deletion v1-after | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 156. S10-M09 V2 replay namespace and deletion deleted-before | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 157. S10-M09 V2 replay namespace and deletion resurrection | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 158. S10-M09 V2 replay namespace and deletion mutation-collision | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 159. S10-M09 V2 finalize rejects missing media | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 160. S10-M09 V2 finalize rejects directory media | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 161. S10-M09 fresh candidate rejects mapping | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 162. S10-M09 fresh candidate rejects path | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 163. S10-M09 fresh candidate rejects tombstone | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 164. S10-SW01 managed empty root opens with lifetime lease | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 165. S10-SW02 same process second managed owner denied | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 166. S10-SW03 different process owner and inherited use denied | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 167. S10-SW12 managed duplicate descriptors are close-on-exec | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 168. S10-SW05 managed reserve append replay use owned descriptor | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 169. S10-SW06 raw managed access and legacy default path denied | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 170. S10-SW01 managed Reserve rejects different store identity | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 171. S10-SW10 catalog connection can inspect managed lease | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 172. S10-SW04 owner destruction releases lease | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 173. S10-SW01 managed reopen rejects different store identity | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 174. S10-SW11 managed incomplete tail rejects append without changing bytes | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 175. S10-SW07 legacy nonempty root preserved without conversion | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 176. S10-SW08 partial initialization retry validates exact state lease | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 177. S10-SW08 partial initialization retry validates exact state init | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 178. S10-SW08 partial initialization retry validates exact state barrier | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 179. S10-SW08 partial initialization retry validates exact state journal | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 180. S10-SW08 partial initialization retry validates exact state incomplete | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 181. S10-SW08 partial initialization retry validates exact state unknown | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 182. S10-SW09 symlink inode and malformed marker rejected journal | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 183. S10-SW09 symlink inode and malformed marker rejected marker | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 184. S10-SW09 symlink inode and malformed marker rejected barrier | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 185. S10-SW09 symlink inode and malformed marker rejected root-symlink | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 186. S10-SB01 second managed catalog is denied | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 187. S10-SB02 failed catalog cannot mutate journal or holds | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 188. S10-SB03 attached catalog blocks unowned append but permits reservation | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 189. S10-SB04 catalog destruction releases attachment | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 190. S10-SB05 managed catalog rejects unsafe options outside | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 191. S10-SB05 managed catalog rejects unsafe options dotdot | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 192. S10-SB05 managed catalog rejects unsafe options media-symlink | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 193. S10-SB05 managed catalog rejects unsafe options sqlite-symlink | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 194. S10-SB05 managed catalog rejects unsafe options sqlite-hardlink | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 195. S10-SB05 managed catalog rejects unsafe options disabled | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 196. S10-SB06 failed open releases catalog attachment | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 197. S10-SB07 managed SQLite sidecar rejected -wal symlink | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 198. S10-SB07 managed SQLite sidecar rejected -wal hardlink | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 199. S10-SB07 managed SQLite sidecar rejected -shm symlink | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 200. S10-SB07 managed SQLite sidecar rejected -shm hardlink | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 201. S10-SB07 managed SQLite sidecar rejected -journal symlink | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 202. S10-SB07 managed SQLite sidecar rejected -journal hardlink | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 203. S10-SC01 managed repeated event fixture is valid | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 204. S10-SC02 managed reservations avoid history reads | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 205. S10-SC03 managed V2 finalize avoids full replay | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 206. S10-SC04 checkpoint reduces superseded event payload bytes | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 207. S10-SC05 checkpoint preserves latest event and all record identities | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 208. S10-SC06 checkpoint is idempotent and preserves V2 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 209. S10-SC08 receipt preserves retry identity and rejects direct append | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 210. S10-SC09 checkpoint restart preserves SQLite and JSONL state sqlite | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 211. S10-SC09 managed checkpoint SQL V2 payload and path | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 212. S10-SC09 checkpoint restart preserves SQLite and JSONL state jsonl | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 213. S10-SC10 checkpoint prefix recovers before writes | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 214. S10-SC11 checkpoint mismatch preserves bytes and poisons owner | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 215. S10-SC12 first accepted mutation controls latest event | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 216. S10-SC16 automatic checkpoint uses accumulated growth | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 217. S10-SC07 raw checkpoint is rejected | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 218. S10-SC18 checkpoint syscall failure poisons and reopens write | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 219. S10-SC21 poison rejects hold mutation write | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 220. S10-SC18 checkpoint syscall failure poisons and reopens file-fsync | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 221. S10-SC21 poison rejects hold mutation file-fsync | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 222. S10-SC18 checkpoint syscall failure poisons and reopens rename | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 223. S10-SC21 poison rejects hold mutation rename | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 224. S10-SC18 checkpoint syscall failure poisons and reopens dir-fsync | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 225. S10-SC21 poison rejects hold mutation dir-fsync | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 226. S10-SC17 checkpoint preserves holds observations and deletion | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 227. S10-SC17 checkpoint SQL hold observation tombstone | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 228. S10-SC17 checkpoint preserves holds observations and deletion restart sqlite | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 229. S10-SC17 checkpoint SQL restart observation tombstone | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 230. S10-SC17 checkpoint preserves holds observations and deletion restart jsonl | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 231. S10-SC19 invalid managed history remains unchanged malformed | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 232. S10-SC19 invalid managed history remains unchanged unsupported | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 233. S10-SC19 invalid managed history remains unchanged conflict | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 234. S10-SC20 raw catalog rejects receipt before side effects | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 235. S10-SC13 crypto off raw remains usable | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 236. S10-SC14 crypto off checkpoint is rejected | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 237. S10-SC15 crypto off receipt reopen is rejected | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 238. source 저장 callback reconcile 연결 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 239. policy revision idempotency | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 240. 5초 safety reconcile | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 241. composition root 관리 저장소 선행 open | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 242. composition helper journal 다음 catalog rebuild/open | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 243. 서버 전 supervisor 시작 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 244. ingress 전 event bridge 등록 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 245. ingress 종료 뒤 recorder finalize | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 246. composition root 시작/종료 순서 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |

### lp18-location-prepared-01.txt

[원출력](lp18-location-prepared-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP14-C01 state=1 updates=1 full_parse=1 expected=1 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 2. LP14-C01 state=2 updates=1 full_parse=1 expected=1 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 3. LP14-C01 state=3 updates=1 full_parse=1 expected=1 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 4. LP14-C03 memory/sqlite canonical bytes and CompletedOracle | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 5. LP14-C02 binding=payload rejected without apply | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 6. LP14-C02 binding=type rejected without apply | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 7. LP14-C02 binding=entity rejected without apply | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 8. LP14-C02 binding=owner rejected without apply | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 9. LP14-C02 binding=prior rejected without apply | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 10. LP14-C02 duplicate envelope no-apply/conflict rejection | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 11. LP14-C02 one-shot apply/reuse rejection | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |

### lp18-location-writer-01.txt

[원출력](lp18-location-writer-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. WR01 h264 managed segments decode all frames without legacy callback or snapshot | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 2. S10-C321 h264 실제 수락 원본 tuple과 segment 결박 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 3. WR01 vp8 managed segments decode all frames without legacy callback or snapshot | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 4. S10-C321 vp8 실제 수락 원본 tuple과 segment 결박 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 5. WR02 UTC-only change preserves media splits frames and independent mapping | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 6. WR03 UTC-only change preserves media splits frames and independent mapping | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 7. WR04 UTC-only change preserves media splits frames and independent mapping | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 8. WR05 duplicate PTS with advancing DTS preserves media and unknown mapping | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 9. WR06 explicit generation reset creates a new media epoch | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 10. S10-C326 세대별 원본 결박 분리 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 11. WR07 repeated observations and processing UTC do not duplicate media | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 12. S10-C325 분할·재전달의 segment별 수락 범위 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 13. S10-C322 keyframe 대기·다른 track·빈 입력·replay 제외 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 14. S10-C324 색인 상한 뒤에도 실제4100프레임 저장·미색인 꼬리 표시 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 15. WR08 missing final duration preserves media with unknown end | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 16. WR09 mapping budget retains bounded unknown tail and all frames | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 17. WR01 invalid binding rejects before writes journal | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 18. WR01 invalid binding rejects before writes catalog | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 19. WR01 invalid binding rejects before writes root | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 20. WR01 invalid binding rejects before writes store | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 21. WR01 invalid binding rejects before writes lease | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 22. WR01 invalid binding rejects before writes incomplete | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 23. WR08 clock process change preserves same-generation media with unknown comparison | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 24. WR08 invalid duration leaves unknown end zero | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 25. WR08 invalid duration leaves unknown end overflow | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 26. WR08 unsafe original input cannot become finalized observation | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 27. WR08 unsafe original input cannot become finalized pts | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 28. WR08 unsafe original input cannot become finalized range | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 29. WR07 older generation cache cannot switch media backwards | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 30. WR07 unrelated video track cannot change selected track identity | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 31. WR06 reopened store allocates fresh IDs and increasing durable order | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 32. WR05 actual H264 reordering preserves decode timestamps and mux origin | 원출력의 개별 assertion | FAIL | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 33. WR05 reordered segment end covers maximum presented frame end | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 34. S10-C327 실제 B-frame 원본PTS·ordinal 보존 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 35. WR08 missing maximum PTS frame duration keeps reordered end unknown | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 36. WR09 failed active commit preserves ready order and quota reservation | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 37. WR09 restart recovers the same durable segment and all frames | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 38. WR08 excessive clock width preserves media as unknown | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 39. WR08 zero generation order cannot become finalized | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 40. WR08 media observation quality normal | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 41. WR08 media observation quality fast | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 42. WR08 media observation quality drift | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 43. WR08 media observation quality fast-step | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 44. WR01 actual appsink observation flows through managed writer and decode | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |

### lp18-location-writer-diagnostic-01.txt

[원출력](lp18-location-writer-diagnostic-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. WR01 h264 managed segments decode all frames without legacy callback or snapshot | 원출력의 개별 assertion | FAIL | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 2. S10-C321 h264 실제 수락 원본 tuple과 segment 결박 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 3. WR01 vp8 managed segments decode all frames without legacy callback or snapshot | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 4. S10-C321 vp8 실제 수락 원본 tuple과 segment 결박 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 5. WR02 UTC-only change preserves media splits frames and independent mapping | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 6. WR03 UTC-only change preserves media splits frames and independent mapping | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 7. WR04 UTC-only change preserves media splits frames and independent mapping | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 8. WR05 duplicate PTS with advancing DTS preserves media and unknown mapping | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 9. WR06 explicit generation reset creates a new media epoch | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 10. S10-C326 세대별 원본 결박 분리 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 11. WR07 repeated observations and processing UTC do not duplicate media | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 12. S10-C325 분할·재전달의 segment별 수락 범위 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 13. S10-C322 keyframe 대기·다른 track·빈 입력·replay 제외 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 14. S10-C324 색인 상한 뒤에도 실제4100프레임 저장·미색인 꼬리 표시 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 15. WR08 missing final duration preserves media with unknown end | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 16. WR09 mapping budget retains bounded unknown tail and all frames | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 17. WR01 invalid binding rejects before writes journal | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 18. WR01 invalid binding rejects before writes catalog | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 19. WR01 invalid binding rejects before writes root | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 20. WR01 invalid binding rejects before writes store | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 21. WR01 invalid binding rejects before writes lease | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 22. WR01 invalid binding rejects before writes incomplete | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 23. WR08 clock process change preserves same-generation media with unknown comparison | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 24. WR08 invalid duration leaves unknown end zero | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 25. WR08 invalid duration leaves unknown end overflow | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 26. WR08 unsafe original input cannot become finalized observation | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 27. WR08 unsafe original input cannot become finalized pts | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 28. WR08 unsafe original input cannot become finalized range | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 29. WR07 older generation cache cannot switch media backwards | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 30. WR07 unrelated video track cannot change selected track identity | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 31. WR06 reopened store allocates fresh IDs and increasing durable order | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 32. WR05 actual H264 reordering preserves decode timestamps and mux origin | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 33. WR05 reordered segment end covers maximum presented frame end | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 34. S10-C327 실제 B-frame 원본PTS·ordinal 보존 | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 35. WR08 missing maximum PTS frame duration keeps reordered end unknown | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 36. WR09 failed active commit preserves ready order and quota reservation | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 37. WR09 restart recovers the same durable segment and all frames | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 38. WR08 excessive clock width preserves media as unknown | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 39. WR08 zero generation order cannot become finalized | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 40. WR08 media observation quality normal | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 41. WR08 media observation quality fast | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 42. WR08 media observation quality drift | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 43. WR08 media observation quality fast-step | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 44. WR01 actual appsink observation flows through managed writer and decode | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |

### lp18-ownership-green-location-01.txt

[원출력](lp18-ownership-green-location-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-L01 baseline managed Replay preserves full canonical record | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 2. LP18-L01 journal located record capability exists | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 3. LP18-L02 acquired record retains complete canonical value | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 4. LP18-L02 public Replay mutation cannot alter acquired immutable value | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 5. LP18-L03 Append retry preserves physical row count and original value | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 6. LP18-L03 Reserve retry preserves physical row count and sequence | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 7. LP18-L02 reopen reconstructs located original and reservation records | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 8. LP18-L04 blank lines whitespace and 64KiB crossing retain exact row order | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 9. LP18-L04 repeated mutation ID retains separate physical row tokens | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 10. LP18-L04 located reads preserve accepted noncanonical envelope bytes | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 11. LP18-L05 no-write checkpoint keeps existing location generation usable | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 12. LP18-L05 recover-only pending cleanup keeps existing generation usable | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 13. LP18-L05 receipt swap rebinds all locations to exact committed bytes | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 14. LP18-L05 stale location rejects and clears output without poisoning current journal | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 15. LP18-L05 previously acquired owned record survives receipt file replacement | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 16. LP18-L05 retry after receipt returns original type without new location | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 17. LP18-L06 null token clears output without poisoning | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 18. LP18-L06 foreign or null owner rejects without poisoning | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 19. LP18-L06 other journal token rejects without poisoning | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 20. LP18-L06 fork rejects located access while parent retains valid ownership | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 21. LP18-L07 same-size raw tamper poisons and clears output despite resident handle | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 22. LP18-L07 truncation poisons and clears output | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 23. LP18-L07 inode replacement poisons and clears output | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |

### lp18-ownership-green-location-02.txt

[원출력](lp18-ownership-green-location-02.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-L01 baseline managed Replay preserves full canonical record | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 2. LP18-L01 journal located record capability exists | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 3. LP18-L02 acquired record retains complete canonical value | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 4. LP18-L02 public Replay mutation cannot alter acquired immutable value | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 5. LP18-L03 Append retry preserves physical row count and original value | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 6. LP18-L03 Reserve retry preserves physical row count and sequence | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 7. LP18-L02 reopen reconstructs located original and reservation records | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 8. LP18-L04 blank lines whitespace and 64KiB crossing retain exact row order | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 9. LP18-L04 repeated mutation ID retains separate physical row tokens | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 10. LP18-L04 located reads preserve accepted noncanonical envelope bytes | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 11. LP18-L05 no-write checkpoint keeps existing location generation usable | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 12. LP18-L05 recover-only pending cleanup keeps existing generation usable | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 13. LP18-L05 receipt swap rebinds all locations to exact committed bytes | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 14. LP18-L05 stale location rejects and clears output without poisoning current journal | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 15. LP18-L05 previously acquired owned record survives receipt file replacement | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 16. LP18-L05 retry after receipt returns original type without new location | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 17. LP18-L06 null token clears output without poisoning | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 18. LP18-L06 foreign or null owner rejects without poisoning | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 19. LP18-L06 other journal token rejects without poisoning | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 20. LP18-L06 fork rejects located access while parent retains valid ownership | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 21. LP18-L07 same-size raw tamper poisons and clears output despite resident handle | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 22. LP18-L07 truncation poisons and clears output | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 23. LP18-L07 inode replacement poisons and clears output | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 24. LP18-L08 oversized append remains available through resident fallback only | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 25. LP18-L08 oversized retry preserves original value and durable row count | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 26. LP18-L09 append location exception clears output and poisons after durable write | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 27. LP18-L09 append exception reopens exactly one durable original record | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 28. LP18-L09 reserve location exception withholds result and poisons after durable write | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 29. LP18-L09 reserve exception reopens reservation and retry does not duplicate it | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 30. LP18-L09 checkpoint location exception preserves bytes and usable generation without poison | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 31. LP18-L09 checkpoint retries successfully after location preparation exception | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 32. LP18-L09 acquire allocation exception poisons clears output and retains old owned value | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |

### lp18-ownership-green-location-crypto-off-01.txt

[원출력](lp18-ownership-green-location-crypto-off-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-L10 crypto-off managed append acquires exact resident value only | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 2. LP18-L10 crypto-off retry preserves resident value and physical row count | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 3. LP18-L10 crypto-off checkpoint remains rejected with owner and resident value intact | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |

### lp18-ownership-green-location-envelope-01.txt

[원출력](lp18-ownership-green-location-envelope-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-E01 independent value and owned sequences compare equal | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 2. LP18-E01 full field mismatch rejected schema | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 3. LP18-E01 full field mismatch rejected type | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 4. LP18-E01 full field mismatch rejected id | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 5. LP18-E01 full field mismatch rejected entity | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 6. LP18-E01 full field mismatch rejected time | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 7. LP18-E01 full field mismatch rejected payload | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 8. LP18-E01 sequence order remains significant | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 9. LP18-E01 sequence count remains significant | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 10. LP18-E01 null on either side remains rejected | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 11. LP18-E01 identical invalid schema retains comparison result | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 12. LP18-E01 identical invalid enum retains comparison result | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 13. LP18-E01 enum canonical collision remains rejected | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 14. LP18-E01 escape and control bytes retain exact comparison | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 15. LP18-E01 int64 boundaries retain exact comparison | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 16. LP18-E01 payload whitespace remains significant | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 17. LP18-E02 SameSequence performs zero envelope serializations | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 18. LP18-E03 receipt candidate preparation preserves original bytes | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 19. LP18-E04 CommitCheckpoint builds JournalBytes exactly once | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 20. LP18-E03 independent candidate publishes exact bytes and preserves prior owner | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 21. LP18-E03 compacted bytes retain independent full projection | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 22. LP18-E03 invalid candidate rejected before byte building schema | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 23. LP18-E03 invalid candidate rejected before byte building type | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 24. LP18-E03 invalid candidate rejected before byte building id | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 25. LP18-E03 invalid candidate rejected before byte building entity | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 26. LP18-E03 invalid candidate rejected before byte building time | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 27. LP18-E03 invalid candidate rejected before byte building payload | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 28. LP18-E03 invalid candidate rejected before byte building order | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 29. LP18-E03 invalid candidate rejected before byte building count | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 30. LP18-E03 invalid candidate rejected before byte building null | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |

### lp18-ownership-green-location-owned-01.txt

[원출력](lp18-ownership-green-location-owned-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-O01 owner checked read view shares journal envelope | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 2. LP18-O01 shared journal original candidate envelopes | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 3. LP18-O01 public Replay value mutation remains isolated | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 4. LP18-O01 retained prefix shares journal envelope | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 5. LP18-O01 full canonical and projection oracle | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 6. LP18-O03 stale candidate after reservation rejected | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 7. LP18-O03 foreign owner candidate rejected | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 8. LP18-O04 exact field order or prefix mutation rejected schema | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 9. LP18-O04 standalone candidate fields rejected without disk change schema | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 10. LP18-O04 exact field order or prefix mutation rejected type | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 11. LP18-O04 standalone candidate fields rejected without disk change type | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 12. LP18-O04 exact field order or prefix mutation rejected id | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 13. LP18-O04 standalone candidate fields rejected without disk change id | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 14. LP18-O04 exact field order or prefix mutation rejected entity | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 15. LP18-O04 standalone candidate fields rejected without disk change entity | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 16. LP18-O04 exact field order or prefix mutation rejected time | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 17. LP18-O04 standalone candidate fields rejected without disk change time | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 18. LP18-O04 exact field order or prefix mutation rejected payload | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 19. LP18-O04 standalone candidate fields rejected without disk change payload | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 20. LP18-O04 exact field order or prefix mutation rejected reorder | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 21. LP18-O04 standalone candidate fields rejected without disk change reorder | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 22. LP18-O04 exact field order or prefix mutation rejected shrink | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 23. LP18-O04 standalone candidate fields rejected without disk change shrink | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 24. LP18-O04 null envelope safely rejected | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 25. LP18-O02 only transformed receipts own new envelopes | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 26. LP18-O02 prepared receipts preserve original canonical bytes | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 27. LP18-O02 publication bytes and prior owned snapshot remain exact | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 28. LP18-O02 published journal and prefix share transformed receipt envelopes | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 29. LP18-O02 receipt independent full projection equality | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 30. LP18-O03 stale candidate after ordinary append rejected | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 31. LP18-O05 8192 logical records admitted | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 32. LP18-O05 8193 aliases still rejected | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 33. LP18-O05 64MiB logical bytes admitted | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 34. LP18-O05 64MiB plus one rejected | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |

### lp18-ownership-red-location-01.txt

[원출력](lp18-ownership-red-location-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-L01 baseline managed Replay preserves full canonical record | 원출력의 개별 assertion | PASS | 실행 범위·과거 실패·정리 한계는 중앙 기록 |
| 2. LP18-L01 journal located record capability exists | 원출력의 개별 assertion | FAIL | 실행 범위·과거 실패·정리 한계는 중앙 기록 |

## Intent 대조: 준비 실패·RED·GREEN 및 영향 회귀

### lp18-ownership-red-intent-01.txt

[원출력](lp18-ownership-red-intent-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-T01 actual Complete retains file hash commit and protection release | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 2. LP18-T01 five normal updates retain exactly one public Parse each | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 3. LP18-T02 normal Update serializes only incoming record | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 4. LP18-T02 normal Apply skips impossible duplicate Record serialization | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 5. LP18-C01 normal transitions validate and restore incoming Intent once | 실제 assertion | FAIL | 최초 검증 준비 실패 보존 |
| 6. LP18-C01 normal transitions retain three full Intent canonical generations | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 7. LP18-T03 identical public retry retains full comparison without append | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 8. LP18-T03 same-shape different canonical terminal transition remains rejected | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 9. LP18-T03 Ready after Complete remains rejected without state or bytes change | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 10. LP18-T03 malformed receipt closure rejected by incoming strict serialization | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 11. LP18-T03 direct identical Apply keeps prior owner and strict Parse | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 12. LP18-T02 identical Apply serializes only prior record | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 13. LP18-T03 direct changed-state Apply preserves full terminal canonical | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 14. LP18-T02 changed-state direct Apply performs zero Record serializations | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 15. LP18-C01 changed-state direct Apply validates and restores incoming Intent once | 실제 assertion | FAIL | 최초 검증 준비 실패 보존 |
| 16. LP18-C01 changed-state direct Apply retains three full Intent canonical generations | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 17. LP18-T03 different-state pool preserves incoming canonical | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 18. LP18-T02 different-state pool performs zero Record serializations | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 19. LP18-T03 different-files pool preserves incoming canonical | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 20. LP18-T02 different-files pool performs zero Record serializations | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 21. LP18-T03 equal-shape identical pool retains full canonical comparison and alias | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 22. LP18-T03 equal-shape changed pool retains full comparison without alias | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 23. LP18-T03 null and absent pool entries remain independent without serialization | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 24. LP18-T03 malformed direct payload still passes through strict rejection | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 25. LP18-T03 state and files prefilter cannot bypass immutable Intent collision | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 26. LP18-C02 noncanonical payload rejects without owner or durable byte change | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |
| 27. LP18-C02 modified public Intent copy cannot change immutable current job | 실제 assertion | FAIL | 최초 검증 준비 실패 보존 |
| 28. LP18-C02 null prior rejects after incoming strict Parse without publication | 실제 assertion | PASS | 최초 검증 준비 실패 보존 |

### lp18-ownership-red-intent-02.txt

[원출력](lp18-ownership-red-intent-02.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-T01 actual Complete retains file hash commit and protection release | 실제 assertion | PASS | 예상 RED 보존 |
| 2. LP18-T01 five normal updates retain exactly one public Parse each | 실제 assertion | PASS | 예상 RED 보존 |
| 3. LP18-T02 normal Update serializes only incoming record | 실제 assertion | PASS | 예상 RED 보존 |
| 4. LP18-T02 normal Apply skips impossible duplicate Record serialization | 실제 assertion | PASS | 예상 RED 보존 |
| 5. LP18-C01 normal transitions validate and restore incoming Intent once | 실제 assertion | FAIL | 예상 RED 보존 |
| 6. LP18-C01 normal transitions retain three full Intent canonical generations | 실제 assertion | PASS | 예상 RED 보존 |
| 7. LP18-T03 identical public retry retains full comparison without append | 실제 assertion | PASS | 예상 RED 보존 |
| 8. LP18-T03 same-shape different canonical terminal transition remains rejected | 실제 assertion | PASS | 예상 RED 보존 |
| 9. LP18-T03 Ready after Complete remains rejected without state or bytes change | 실제 assertion | PASS | 예상 RED 보존 |
| 10. LP18-T03 malformed receipt closure rejected by incoming strict serialization | 실제 assertion | PASS | 예상 RED 보존 |
| 11. LP18-T03 direct identical Apply keeps prior owner and strict Parse | 실제 assertion | PASS | 예상 RED 보존 |
| 12. LP18-T02 identical Apply serializes only prior record | 실제 assertion | PASS | 예상 RED 보존 |
| 13. LP18-T03 direct changed-state Apply preserves full terminal canonical | 실제 assertion | PASS | 예상 RED 보존 |
| 14. LP18-T02 changed-state direct Apply performs zero Record serializations | 실제 assertion | PASS | 예상 RED 보존 |
| 15. LP18-C01 changed-state direct Apply validates and restores incoming Intent once | 실제 assertion | FAIL | 예상 RED 보존 |
| 16. LP18-C01 changed-state direct Apply retains three full Intent canonical generations | 실제 assertion | PASS | 예상 RED 보존 |
| 17. LP18-T03 different-state pool preserves incoming canonical | 실제 assertion | PASS | 예상 RED 보존 |
| 18. LP18-T02 different-state pool performs zero Record serializations | 실제 assertion | PASS | 예상 RED 보존 |
| 19. LP18-T03 different-files pool preserves incoming canonical | 실제 assertion | PASS | 예상 RED 보존 |
| 20. LP18-T02 different-files pool performs zero Record serializations | 실제 assertion | PASS | 예상 RED 보존 |
| 21. LP18-T03 equal-shape identical pool retains full canonical comparison and alias | 실제 assertion | PASS | 예상 RED 보존 |
| 22. LP18-T03 equal-shape changed pool retains full comparison without alias | 실제 assertion | PASS | 예상 RED 보존 |
| 23. LP18-T03 null and absent pool entries remain independent without serialization | 실제 assertion | PASS | 예상 RED 보존 |
| 24. LP18-T03 malformed direct payload still passes through strict rejection | 실제 assertion | PASS | 예상 RED 보존 |
| 25. LP18-T03 state and files prefilter cannot bypass immutable Intent collision | 실제 assertion | PASS | 예상 RED 보존 |
| 26. LP18-C02 noncanonical payload rejects without owner or durable byte change | 실제 assertion | PASS | 예상 RED 보존 |
| 27. LP18-C02 modified public Intent copy cannot change immutable current job | 실제 assertion | PASS | 예상 RED 보존 |
| 28. LP18-C02 null prior rejects after incoming strict Parse without publication | 실제 assertion | PASS | 예상 RED 보존 |

### lp18-ownership-green-intent-01.txt

[원출력](lp18-ownership-green-intent-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-T01 actual Complete retains file hash commit and protection release | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. LP18-T01 five normal updates retain exactly one public Parse each | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. LP18-T02 normal Update serializes only incoming record | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. LP18-T02 normal Apply skips impossible duplicate Record serialization | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. LP18-C01 normal transitions validate and restore incoming Intent once | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. LP18-C01 normal transitions retain three full Intent canonical generations | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. LP18-T03 identical public retry retains full comparison without append | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. LP18-T03 same-shape different canonical terminal transition remains rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. LP18-T03 Ready after Complete remains rejected without state or bytes change | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. LP18-T03 malformed receipt closure rejected by incoming strict serialization | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. LP18-T03 direct identical Apply keeps prior owner and strict Parse | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 12. LP18-T02 identical Apply serializes only prior record | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 13. LP18-T03 direct changed-state Apply preserves full terminal canonical | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 14. LP18-T02 changed-state direct Apply performs zero Record serializations | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 15. LP18-C01 changed-state direct Apply validates and restores incoming Intent once | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 16. LP18-C01 changed-state direct Apply retains three full Intent canonical generations | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 17. LP18-T03 different-state pool preserves incoming canonical | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 18. LP18-T02 different-state pool performs zero Record serializations | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 19. LP18-T03 different-files pool preserves incoming canonical | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 20. LP18-T02 different-files pool performs zero Record serializations | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 21. LP18-T03 equal-shape identical pool retains full canonical comparison and alias | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 22. LP18-T03 equal-shape changed pool retains full comparison without alias | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 23. LP18-T03 null and absent pool entries remain independent without serialization | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 24. LP18-T03 malformed direct payload still passes through strict rejection | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 25. LP18-T03 state and files prefilter cannot bypass immutable Intent collision | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 26. LP18-C02 noncanonical payload rejects without owner or durable byte change | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 27. LP18-C02 modified public Intent copy cannot change immutable current job | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 28. LP18-C02 null prior rejects after incoming strict Parse without publication | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp18-ownership-green-intent-context-01.txt

[원출력](lp18-ownership-green-intent-context-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-I01 actual Complete retains files hashes commit and protection release | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. LP18-I01 actual BuildReady executes nonzero strict work once | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. LP18-I02 single strict context build-ready | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. LP18-I01 public Intent canonical roundtrip preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. LP18-I02 single strict context serialize-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. LP18-I02 single strict context parse-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. LP18-I01 record canonical roundtrip intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. LP18-I02 single strict context serialize-record-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. LP18-I02 single strict context parse-record-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. LP18-I01 record canonical roundtrip failed | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. LP18-I02 single strict context serialize-record-failed | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 12. LP18-I02 single strict context parse-record-failed | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 13. LP18-I01 record canonical roundtrip ready | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 14. LP18-I02 single strict context serialize-record-ready | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 15. LP18-I02 single strict context parse-record-ready | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 16. LP18-I01 record canonical roundtrip committed | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 17. LP18-I02 single strict context serialize-record-committed | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 18. LP18-I02 single strict context parse-record-committed | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 19. LP18-I01 record canonical roundtrip complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 20. LP18-I02 single strict context serialize-record-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 21. LP18-I02 single strict context parse-record-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 22. LP18-I01 every measured public call retains first strict work | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 23. LP18-I03 same-address changed Intent cannot reuse prior validation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 24. LP18-I03 same-address manifest change rejects and Parse clears output | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 25. LP18-I03 receipt alias remains rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 26. LP18-I03 reconstructed actual remux retains Ready canonical positive control | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 27. LP18-I03 BuildReady rejects altered au and clears output | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 28. LP18-I03 BuildReady rejects altered coverage and clears output | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 29. LP18-I03 BuildReady input shape failure precedes selection validation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 30. LP18-I03 BuildReady selection mismatch preserves failure mapping | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 31. LP18-I03 public Intent parse preserves strict error and clears output | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp18-ownership-green-intent-proof-01.txt

[원출력](lp18-ownership-green-intent-proof-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-V03 valid content proof cannot bypass output reservation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. LP18-V03 valid content proof cannot bypass source deletion state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. LP18-V03 valid content proof cannot bypass source media binding | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. LP18-V02 minted proof reuses owned content after state validation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. LP18-V02 schema mismatch retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. LP18-V02 type mismatch retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. LP18-V02 mutation ID mismatch retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. LP18-V02 entity mismatch retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. LP18-V02 time mismatch retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. LP18-V02 payload bytes mismatch retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. LP18-V03 invalid content rejects through strict fallback | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 12. LP18-V02 null owner retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 13. LP18-V02 null envelope retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 14. LP18-V02 null record retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 15. LP18-V02 foreign owner retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 16. LP18-V02 equal-content replacement invalidates current proof ownership | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 17. LP18-V02 equal-envelope replacement invalidates accepted proof ownership | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 18. LP18-V03 valid content proof cannot bypass missing prior transition | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 19. CP01 actual Ready Complete shape canonical files reservation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 20. CP02 bounded two jobs over 1MiB canonical transitions | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 21. LP18-V01 every normal update strictly parses content once | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 22. LP18-V01 automatic checkpoint applies current update payload | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 23. LP18-V01 automatic checkpoint reuses current validated content without parsing | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 24. LP18-V04 managed reopen retains strict content parsing | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 25. LP18-V04 manual checkpoint retains strict content parsing | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp18-intent-prepared-01.txt

[원출력](lp18-intent-prepared-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP14-C01 state=1 updates=1 full_parse=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. LP14-C01 state=2 updates=1 full_parse=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. LP14-C01 state=3 updates=1 full_parse=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. LP14-C03 memory/sqlite canonical bytes and CompletedOracle | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. LP14-C02 binding=payload rejected without apply | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. LP14-C02 binding=type rejected without apply | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. LP14-C02 binding=entity rejected without apply | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. LP14-C02 binding=owner rejected without apply | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. LP14-C02 binding=prior rejected without apply | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. LP14-C02 duplicate envelope no-apply/conflict rejection | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. LP14-C02 one-shot apply/reuse rejection | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp18-intent-jobs-01.txt

[원출력](lp18-intent-jobs-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. J01 실제 선택→compact 내구 job 계약 왕복 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. J17 무관source8개 추가에도 동일선택 jobID 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. J18 cleanup wall시계 역행 허용·순서는상태로검사 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. J04 단일 Intent 원장·보호·예약 원자 가시성 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. J19 후발 coordinator 일반·파생 admission 및 복구 차단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. J02 이후 시각 재Build ID 유지·선택 변경 새 ID | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. J03 unknown·중복·미지원 schema·불완전 JSON·4MiB·예약 상한·미구현 state 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. J16 소유 경로·attempt·order 계획 조작 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. J16 실제 2 source UUID 역순이어도 영속 order 순 출력 계획 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. J08 나중 시각 재요청 최초 시각 유지·예약/경로 충돌·다른 catalog 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. J06 generic hold 감소로 job 보호 해제 불가·직접 삭제/corrupt 차단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 12. J14 cleanup Failed는 job 자원만 해제·wall 역행·terminal 자동 재시도 없음 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 13. J05 pending·corrupt·tombstone·hash·binding 불일치 source 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 14. J07 실제 source 삭제/Intent 경쟁에서 둘 중 한 전이만 허용 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 15. J10 checkpoint 전후 job·보호·예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 16. J09 SQLite·fallback·재build/reopen 내구 job 동등·중복 보호 가산 없음 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 17. J10 replay 동일 중복 멱등·다른 내용/불완전/schema/전이/보호 상태 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 18. J11 같은 채널 memory+동시 durable 예약 합계 event quota 제한 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 19. J12 durable outstanding을 continuous/event/derived disk 예약에 포함 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 20. J13 snapshot/disk provider 실패는 생성·periodic·복구 삭제 차단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 21. J15 partial unknown·이유·후보·요청 시간축 그대로 보존 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 22. J19 정확한 소유자 소멸 후 새 coordinator만 재결박 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 23. J20 append 거부 후 원장 복원해도 공통 mutation 차단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp18-intent-service-01.txt

[원출력](lp18-intent-service-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. F12 실제 remux의 다른 selection 결박 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. F12 실제 remux provenance의 요청 범위 위조 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. F12 실제 remux의 foreign unfulfilled 범위 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. F01 실제 writer→선택→Intent→파생 파일→게시→Complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. F01 실제 catalog/file/hash/단일 commit/hold 해제/cleanup 및 직접 decode | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. F15 단일 service·동시 Run·외부 terminal release 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. F16 active source 삭제 거부·동일 사유 비보호 원본 삭제 positive control | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. F02 두 출력 독립 epoch·unknown UTC·실제 AU/visible 출처 보존 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. F12 Complete 출처 전수 canonical roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. F12 Ready 포함 Intent 잘못된 상태 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. F12 미지원 필드 엄격 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 12. F14 Ready JSON 4MiB 명시 상한 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 13. F12 출력 receipt inode 별칭 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 14. F03 Intent 생성 전 프로세스 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 15. F04 receipt 전 실물의 소유권 미확인 보호 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 16. F05 receipt 이후 Intent 중단 소유물 정리 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 17. F06 Ready 중단 뒤 재렌더 없이 완료 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 18. F07 첫 출력 link 중단 쌍 복구 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 19. F07 두 번째 출력 link 중단 쌍 복구 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 20. F08 전체 publish 후 commit 전 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 21. F09 원자 commit 후 cleanup 전 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 22. F10 첫 temp 삭제 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 23. F10 두 번째 temp 삭제 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 24. F10 attempt 디렉터리 삭제 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 25. F10 job 디렉터리 삭제 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 26. F10 Complete mutation 직전 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 27. F10 Failed cleanup attempt 삭제 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 28. F10 Failed cleanup job 삭제 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 29. F10 Failed mutation 직전 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 30. F11 hash 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 31. F11 missing 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 32. F11 foreign 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 33. F11 symlink 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 34. F11 fifo 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 35. F11 hardlink 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 36. F11 parent 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 37. F14 cancel-before-create 생성 중단·소유 cleanup·예약 해제 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 38. F14 cancel 생성 중단·소유 cleanup·예약 해제 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 39. F14 small 생성 중단·소유 cleanup·예약 해제 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 40. F14 deadline 생성 중단·소유 cleanup·예약 해제 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 41. F12 SQLite projection·journal fallback job/output 일치 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 42. F12 SQLite rebuild·checkpoint 재개방 job/output 일치 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 43. F13 Complete output tombstone 뒤 재생성 없음 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp18-intent-cache-01.txt

[원출력](lp18-intent-cache-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP15-C01 cold full applied=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. LP15-C01 unchanged prefix applied=0 expected=0 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. LP15-C01 exact prefix suffix only applied=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. LP15-C01 independent prefix shadow/full projection equality | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. LP15-C01 full fallback schema applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. LP15-C01 full fallback type applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. LP15-C01 full fallback id applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. LP15-C01 full fallback entity applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. LP15-C01 full fallback time applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. LP15-C01 full fallback payload applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. LP15-C01 full fallback reorder applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 12. LP15-C01 full fallback shrink applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 13. LP15-C01 full fallback null-shadow applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 14. LP15-C01 full fallback null-handle applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 15. LP15-C01 Open clears cache applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 16. LP15-C03 recover full/no-cache | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 17. LP15-C03 after recover full applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 18. LP15-C03 injected commit refusal discards cache | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 19. LP15-C03 after commit refusal full applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 20. LP15-C03 suffix exception discards cache | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 21. LP15-C03 after exception full applied=3 expected=3 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 22. LP15-C03 public poisoned entry discards cache | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 23. LP15-C03 after restored fixture full applied=3 expected=3 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 24. LP15-C04 exact byte charge boundary | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 25. LP15-C04 overflow charge rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 26. LP15-C04 8192 records admitted | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 27. LP15-C04 8193 records rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 28. LP15-C04 64MiB record charge admitted | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 29. LP15-C04 64MiB plus one rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 30. LP15-C03 changed candidate prime applied=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 31. LP15-C03 changed candidate suffix12 plus full candidate13 applied=25 expected=25 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 32. LP15-C03 changed candidate cache equals independent full projection | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 33. LP15-C03 compacted candidate prefix reused applied=0 expected=0 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 34. LP15-C03 forced projection mismatch discards cache | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 35. LP15-C04 overlimit prime applied=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 36. LP15-C04 existing cache ignored for oversized original applied=8193 expected=8193 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 37. LP15-C04 oversized candidate not retained | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 38. LP15-C04 next oversized checkpoint full applied=8193 expected=8193 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 39. CP01 actual Ready Complete shape canonical files reservation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 40. CP02 bounded two jobs over 1MiB canonical transitions | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 41. LP15-C02 bounded automatic checkpoint and whole transition measurement | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 42. LP15-C02 reopened full applied=18 expected=18 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 43. LP15-C02 actual unchanged prefix applied=0 expected=0 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 44. LP15-C02 actual suffix only applied=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 45. LP15-C02 actual job shadow/full projection equality | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 46. LP15-C03 illegal Ready after Complete suffix rejected by cached/full paths | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 47. LP15-C04 peakRSS bytes=166739968 cap=536870912 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp18-intent-catalog-01.txt

[원출력](lp18-intent-catalog-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. journal open:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. fallback catalog open:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. SQLite off mode 표시 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. segment finalize journal+projection:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. fallback range query | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. event link FK 위반 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. FK 위반 transaction/journal 전체 rollback | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. 최초 durable mutation 1개 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. 동일 mutation 중복 append | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. 손상 사이 정상 durable mutation 보존 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. 중간 corrupt line count | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 12. 마지막 truncated line skip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 13. fallback replay open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 14. 같은 mutation idempotent replay | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 15. 재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 16. 중복 replay row/합계 불증가 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 17. 추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 18. writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 19. v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 20. SQLite catalog open/rebuild:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 21. SQLite primary mode 표시 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 22. SQLite on/off range query ID·순서 parity | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 23. journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 24. journal 없는 손상 media orphan 구분 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 25. projection failover journal open:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 26. projection failover catalog open:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 27. 실제 SQLite INSERT 실패 trigger 설치 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 28. SQLite 투영 실패 뒤 journal+memory finalize 유지:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 29. SQLite 투영 실패 즉시 JSONL fallback 전환 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 30. 재시작 rebuild 전 실패 trigger 제거 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 31. 투영 실패 직후 in-memory query 정합성 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 32. projection failover 재시작 journal rebuild:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 33. 재시작 후 journal에서 누락 SQLite projection 복구 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 34. 재시작 후 SQLite primary 복귀 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 35. 재시작 journal rebuild가 실제 SQLite row 복원 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 36. tombstone journal open:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 37. tombstone catalog open:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 38. tombstone 대상 segment finalize:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 39. tombstone 대상 deletion request:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 40. tombstone 완료 기록:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 41. catalog finalize가 tombstone segment ID 재사용을 거부해야 함 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 42. 손상 SQLite 격리 후 journal rebuild:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 43. 손상 SQLite 원본 격리 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 44. 격리 SQLite 파일 보존 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 45. 격리 후 journal rebuild 결과 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 46. S10-3A future-schema journal read open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 47. S10-3A future-schema unsupported classification | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 48. S10-3A future-schema catalog open denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 49. S10-3A future-schema catalog retry denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 50. S10-3A future-schema journal bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 51. S10-3A future-schema SQLite bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 52. S10-3A future-schema writer cleanup untouched | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 53. S10-3A arbitrary-schema journal read open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 54. S10-3A arbitrary-schema unsupported classification | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 55. S10-3A arbitrary-schema catalog open denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 56. S10-3A arbitrary-schema catalog retry denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 57. S10-3A arbitrary-schema journal bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 58. S10-3A arbitrary-schema SQLite bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 59. S10-3A arbitrary-schema writer cleanup untouched | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 60. S10-3A empty-schema journal read open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 61. S10-3A empty-schema unsupported classification | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 62. S10-3A empty-schema catalog open denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 63. S10-3A empty-schema catalog retry denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 64. S10-3A empty-schema journal bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 65. S10-3A empty-schema SQLite bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 66. S10-3A empty-schema writer cleanup untouched | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 67. S10-3A future-type journal read open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 68. S10-3A future-type unsupported classification | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 69. S10-3A future-type catalog open denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 70. S10-3A future-type catalog retry denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 71. S10-3A future-type journal bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 72. S10-3A future-type SQLite bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 73. S10-3A future-type writer cleanup untouched | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 74. S10-3A malformed journal open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 75. S10-3A malformed JSON missing fields and wrong types remain corrupt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 76. S10-O01 reservation journal open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 77. S10-O01 first reservation returns four IDs and sequence one | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 78. S10-O01 versioned reservation payload replays | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 79. S10-O01 new reservation records actual occurred time | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 80. S10-O02 identical retry preserves sequence and bytes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 81. S10-O03 reopened instance allocates next sequence | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 82. S10-O03 new process resumes durable sequence | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 83. S10-O04 different store rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 84. S10-O04 reused request with different segment rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 85. S10-O04 reused request with different channel rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 86. S10-O04 reused segment with different request rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 87. S10-O04 conflicts preserve original bytes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 88. S10-O05/O06 reject and preserve corrupt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 89. S10-O05/O06 reject and preserve unsupported-schema | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 90. S10-O05/O06 reject and preserve unsupported-type | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 91. S10-O05/O06 reject and preserve tail | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 92. S10-O05/O06 reject and preserve payload-zero | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 93. S10-O05/O06 reject and preserve payload-negative | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 94. S10-O05/O06 reject and preserve payload-fraction | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 95. S10-O05/O06 reject and preserve payload-overflow | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 96. S10-O05/O06 reject and preserve duplicate-sequence | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 97. S10-O05/O06 reject and preserve decreasing-sequence | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 98. S10-O05/O06 reject and preserve duplicate-request | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 99. S10-O05/O06 reject and preserve duplicate-segment | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 100. S10-O05/O06 reject and preserve store-conflict | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 101. S10-O05/O06 reject and preserve ordinary-before | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 102. S10-O05/O06 reject and preserve ordinary-after | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 103. S10-O05/O06 reject and preserve line-cap | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 104. S10-O05 reservation entity envelope binding rejects mismatch | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 105. S10-O05 reservation request envelope binding rejects mismatch | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 106. S10-O01 strict reservation parser accepts versioned literal | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 107. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 108. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 109. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 110. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 111. S10-O06 INT64_MAX identical retry remains valid | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 112. S10-O06 sequence overflow rejected without write | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 113. S10-O02 identical durable reservation duplicates remain idempotent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 114. S10-O06 sequence gaps remain valid and allocate above maximum | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 115. S10-O07 four simultaneous processes finish reservations | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 116. S10-O07 concurrent sequences are unique and complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 117. S10-O07 next sequence follows concurrent reservations | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 118. S10-O08 ordinary Append cannot reserve orders | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 119. S10-O08 unopened journal rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 120. S10-O08 null result rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 121. S10-O08 invalid opaque ID rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 122. S10-O08 failed reservation does not expose tentative result | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 123. S10-O09 unsafe file binding rejected and original preserved inode | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 124. S10-O09 unsafe file binding rejected and original preserved parent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 125. S10-O09 unsafe file binding rejected and original preserved symlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 126. S10-O09 unsafe file binding rejected and original preserved hardlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 127. S10-O10 reservation and normal segment coexist in catalog | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 128. S10-O04 reserve then finalize permits identical retry | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 129. S10-O10 reservation survives catalog rebuild without changing segment query | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 130. S10-O04 legacy segment cannot acquire retroactive reservation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 131. S10-M06 opened catalog accepts fresh exact reservation V2 finalize | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 132. S10-M07 V2 find preserves complete metadata | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 133. S10-M07 identical V2 recovery is idempotent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 134. S10-M07 V2 is absent from V1 range query | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 135. S10-M07 V2 registered path is not orphan | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 136. S10-M07 SQLite exact V2 JSON and path match | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 137. S10-M07 JSONL restart preserves V2 exact payload | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 138. S10-M06 wrong reservation tuple rejected store | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 139. S10-M06 wrong reservation tuple rejected request | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 140. S10-M06 wrong reservation tuple rejected segment | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 141. S10-M06 wrong reservation tuple rejected channel | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 142. S10-M06 wrong reservation tuple rejected sequence | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 143. S10-M09 immutable V2 mapping mismatch rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 144. S10-M09 bad V2 startup retry preserves original state bad-payload | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 145. S10-M09 bad V2 startup retry preserves original state missing-order | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 146. S10-M09 bad V2 startup retry preserves original state bad-order | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 147. S10-M09 bad V2 startup retry preserves original state conflicting-order | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 148. S10-M09 bad V2 startup retry preserves original state tail | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 149. S10-M09 bad V2 startup retry preserves original state corrupt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 150. S10-M09 bad V2 startup retry preserves original state unsafe-path | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 151. S10-M09 default off rejects V2 before SQLite changes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 152. S10-M09 V2 replay namespace and deletion duplicate | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 153. S10-M09 V2 replay namespace and deletion deleted | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 154. S10-M09 V2 replay namespace and deletion v1-before | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 155. S10-M09 V2 replay namespace and deletion v1-after | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 156. S10-M09 V2 replay namespace and deletion deleted-before | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 157. S10-M09 V2 replay namespace and deletion resurrection | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 158. S10-M09 V2 replay namespace and deletion mutation-collision | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 159. S10-M09 V2 finalize rejects missing media | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 160. S10-M09 V2 finalize rejects directory media | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 161. S10-M09 fresh candidate rejects mapping | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 162. S10-M09 fresh candidate rejects path | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 163. S10-M09 fresh candidate rejects tombstone | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 164. S10-SW01 managed empty root opens with lifetime lease | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 165. S10-SW02 same process second managed owner denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 166. S10-SW03 different process owner and inherited use denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 167. S10-SW12 managed duplicate descriptors are close-on-exec | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 168. S10-SW05 managed reserve append replay use owned descriptor | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 169. S10-SW06 raw managed access and legacy default path denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 170. S10-SW01 managed Reserve rejects different store identity | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 171. S10-SW10 catalog connection can inspect managed lease | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 172. S10-SW04 owner destruction releases lease | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 173. S10-SW01 managed reopen rejects different store identity | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 174. S10-SW11 managed incomplete tail rejects append without changing bytes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 175. S10-SW07 legacy nonempty root preserved without conversion | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 176. S10-SW08 partial initialization retry validates exact state lease | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 177. S10-SW08 partial initialization retry validates exact state init | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 178. S10-SW08 partial initialization retry validates exact state barrier | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 179. S10-SW08 partial initialization retry validates exact state journal | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 180. S10-SW08 partial initialization retry validates exact state incomplete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 181. S10-SW08 partial initialization retry validates exact state unknown | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 182. S10-SW09 symlink inode and malformed marker rejected journal | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 183. S10-SW09 symlink inode and malformed marker rejected marker | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 184. S10-SW09 symlink inode and malformed marker rejected barrier | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 185. S10-SW09 symlink inode and malformed marker rejected root-symlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 186. S10-SB01 second managed catalog is denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 187. S10-SB02 failed catalog cannot mutate journal or holds | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 188. S10-SB03 attached catalog blocks unowned append but permits reservation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 189. S10-SB04 catalog destruction releases attachment | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 190. S10-SB05 managed catalog rejects unsafe options outside | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 191. S10-SB05 managed catalog rejects unsafe options dotdot | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 192. S10-SB05 managed catalog rejects unsafe options media-symlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 193. S10-SB05 managed catalog rejects unsafe options sqlite-symlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 194. S10-SB05 managed catalog rejects unsafe options sqlite-hardlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 195. S10-SB05 managed catalog rejects unsafe options disabled | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 196. S10-SB06 failed open releases catalog attachment | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 197. S10-SB07 managed SQLite sidecar rejected -wal symlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 198. S10-SB07 managed SQLite sidecar rejected -wal hardlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 199. S10-SB07 managed SQLite sidecar rejected -shm symlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 200. S10-SB07 managed SQLite sidecar rejected -shm hardlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 201. S10-SB07 managed SQLite sidecar rejected -journal symlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 202. S10-SB07 managed SQLite sidecar rejected -journal hardlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 203. S10-SC01 managed repeated event fixture is valid | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 204. S10-SC02 managed reservations avoid history reads | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 205. S10-SC03 managed V2 finalize avoids full replay | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 206. S10-SC04 checkpoint reduces superseded event payload bytes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 207. S10-SC05 checkpoint preserves latest event and all record identities | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 208. S10-SC06 checkpoint is idempotent and preserves V2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 209. S10-SC08 receipt preserves retry identity and rejects direct append | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 210. S10-SC09 checkpoint restart preserves SQLite and JSONL state sqlite | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 211. S10-SC09 managed checkpoint SQL V2 payload and path | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 212. S10-SC09 checkpoint restart preserves SQLite and JSONL state jsonl | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 213. S10-SC10 checkpoint prefix recovers before writes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 214. S10-SC11 checkpoint mismatch preserves bytes and poisons owner | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 215. S10-SC12 first accepted mutation controls latest event | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 216. S10-SC16 automatic checkpoint uses accumulated growth | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 217. S10-SC07 raw checkpoint is rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 218. S10-SC18 checkpoint syscall failure poisons and reopens write | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 219. S10-SC21 poison rejects hold mutation write | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 220. S10-SC18 checkpoint syscall failure poisons and reopens file-fsync | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 221. S10-SC21 poison rejects hold mutation file-fsync | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 222. S10-SC18 checkpoint syscall failure poisons and reopens rename | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 223. S10-SC21 poison rejects hold mutation rename | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 224. S10-SC18 checkpoint syscall failure poisons and reopens dir-fsync | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 225. S10-SC21 poison rejects hold mutation dir-fsync | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 226. S10-SC17 checkpoint preserves holds observations and deletion | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 227. S10-SC17 checkpoint SQL hold observation tombstone | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 228. S10-SC17 checkpoint preserves holds observations and deletion restart sqlite | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 229. S10-SC17 checkpoint SQL restart observation tombstone | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 230. S10-SC17 checkpoint preserves holds observations and deletion restart jsonl | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 231. S10-SC19 invalid managed history remains unchanged malformed | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 232. S10-SC19 invalid managed history remains unchanged unsupported | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 233. S10-SC19 invalid managed history remains unchanged conflict | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 234. S10-SC20 raw catalog rejects receipt before side effects | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 235. S10-SC13 crypto off raw remains usable | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 236. S10-SC14 crypto off checkpoint is rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 237. S10-SC15 crypto off receipt reopen is rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 238. source 저장 callback reconcile 연결 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 239. policy revision idempotency | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 240. 5초 safety reconcile | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 241. composition root 관리 저장소 선행 open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 242. composition helper journal 다음 catalog rebuild/open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 243. 서버 전 supervisor 시작 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 244. ingress 전 event bridge 등록 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 245. ingress 종료 뒤 recorder finalize | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 246. composition root 시작/종료 순서 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp17-jobs-lp18-intent-01.txt

[원출력](lp17-jobs-lp18-intent-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. FC01 exact insertion checks count=97 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. D08.input-keyframes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. D08.source-shape | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. D08.selection-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. D08.expected-intent-built | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. D08.admission | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 12. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 13. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 14. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 15. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 16. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 17. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 18. D08.ready-verified-proof | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 19. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 20. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 21. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 22. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 23. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 24. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 25. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 26. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 27. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 28. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 29. D08.protection-released | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 30. D08.run-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 31. D08.actual-output-hash | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 32. D08.selection-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 33. D08.expected-intent-built | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 34. D08.admission | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 35. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 36. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 37. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 38. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 39. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 40. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 41. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 42. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 43. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 44. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 45. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 46. D08.ready-verified-proof | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 47. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 48. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 49. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 50. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 51. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 52. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 53. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 54. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 55. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 56. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 57. D08.protection-released | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 58. D08.run-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 59. D08.actual-output-hash | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 60. CP01.actual-ready-complete-shape-canonical-files-reservation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 61. CP02.two-jobs-over-1MiB-canonical-transitions | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 62. D08.input-keyframes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 63. D08.source-shape | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 64. D08.selection-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 65. D08.expected-intent-built | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 66. D08.admission | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 67. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 68. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 69. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 70. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 71. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 72. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 73. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 74. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 75. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 76. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 77. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 78. D08.ready-verified-proof | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 79. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 80. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 81. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 82. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 83. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 84. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 85. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 86. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 87. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 88. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 89. D08.protection-released | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 90. D08.run-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 91. D08.actual-output-hash | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 92. D08.selection-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 93. D08.expected-intent-built | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 94. D08.admission | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 95. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 96. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 97. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 98. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 99. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 100. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 101. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 102. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 103. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 104. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 105. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 106. D08.ready-verified-proof | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 107. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 108. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 109. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 110. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 111. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 112. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 113. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 114. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 115. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 116. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 117. D08.protection-released | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 118. D08.run-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 119. D08.actual-output-hash | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 120. CP01.actual-ready-complete-shape-canonical-files-reservation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 121. CP02.two-jobs-over-1MiB-canonical-transitions | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

## 전이 동등성 비교: 최초 준비 실패·RED·GREEN

첫 빌드 실패(<fstream> 누락)는 [원출력](lp18-ownership-red-transition-01.txt)에 보존했다. 당시 focused는 미실행이다. 아래는 수정 후 모든 실제 assertion이다.

### lp18-ownership-red-transition-02.txt

[원출력](lp18-ownership-red-transition-02.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-T01 actual Complete retains file hash commit and protection release | 실제 assertion | PASS | 예상 RED 보존 |
| 2. LP18-T01 five normal updates retain exactly one public Parse each | 실제 assertion | PASS | 예상 RED 보존 |
| 3. LP18-T02 normal Update serializes only incoming record | 실제 assertion | FAIL | 예상 RED 보존 |
| 4. LP18-T02 normal Apply skips impossible duplicate Record serialization | 실제 assertion | FAIL | 예상 RED 보존 |
| 5. LP18-T03 identical public retry retains full comparison without append | 실제 assertion | PASS | 예상 RED 보존 |
| 6. LP18-T03 same-shape different canonical terminal transition remains rejected | 실제 assertion | PASS | 예상 RED 보존 |
| 7. LP18-T03 Ready after Complete remains rejected without state or bytes change | 실제 assertion | PASS | 예상 RED 보존 |
| 8. LP18-T03 malformed receipt closure rejected by incoming strict serialization | 실제 assertion | PASS | 예상 RED 보존 |
| 9. LP18-T03 direct identical Apply keeps prior owner and strict Parse | 실제 assertion | PASS | 예상 RED 보존 |
| 10. LP18-T02 identical Apply serializes only prior record | 실제 assertion | FAIL | 예상 RED 보존 |
| 11. LP18-T03 direct changed-state Apply preserves full terminal canonical | 실제 assertion | PASS | 예상 RED 보존 |
| 12. LP18-T02 changed-state direct Apply performs zero Record serializations | 실제 assertion | FAIL | 예상 RED 보존 |
| 13. LP18-T03 different-state pool preserves incoming canonical | 실제 assertion | PASS | 예상 RED 보존 |
| 14. LP18-T02 different-state pool performs zero Record serializations | 실제 assertion | FAIL | 예상 RED 보존 |
| 15. LP18-T03 different-files pool preserves incoming canonical | 실제 assertion | PASS | 예상 RED 보존 |
| 16. LP18-T02 different-files pool performs zero Record serializations | 실제 assertion | FAIL | 예상 RED 보존 |
| 17. LP18-T03 equal-shape identical pool retains full canonical comparison and alias | 실제 assertion | PASS | 예상 RED 보존 |
| 18. LP18-T03 equal-shape changed pool retains full comparison without alias | 실제 assertion | PASS | 예상 RED 보존 |
| 19. LP18-T03 null and absent pool entries remain independent without serialization | 실제 assertion | PASS | 예상 RED 보존 |
| 20. LP18-T03 malformed direct payload still passes through strict rejection | 실제 assertion | PASS | 예상 RED 보존 |
| 21. LP18-T03 state and files prefilter cannot bypass immutable Intent collision | 실제 assertion | PASS | 예상 RED 보존 |

### lp18-ownership-green-transition-01.txt

[원출력](lp18-ownership-green-transition-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-T01 actual Complete retains file hash commit and protection release | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. LP18-T01 five normal updates retain exactly one public Parse each | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. LP18-T02 normal Update serializes only incoming record | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. LP18-T02 normal Apply skips impossible duplicate Record serialization | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. LP18-T03 identical public retry retains full comparison without append | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. LP18-T03 same-shape different canonical terminal transition remains rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. LP18-T03 Ready after Complete remains rejected without state or bytes change | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. LP18-T03 malformed receipt closure rejected by incoming strict serialization | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. LP18-T03 direct identical Apply keeps prior owner and strict Parse | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. LP18-T02 identical Apply serializes only prior record | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. LP18-T03 direct changed-state Apply preserves full terminal canonical | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 12. LP18-T02 changed-state direct Apply performs zero Record serializations | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 13. LP18-T03 different-state pool preserves incoming canonical | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 14. LP18-T02 different-state pool performs zero Record serializations | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 15. LP18-T03 different-files pool preserves incoming canonical | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 16. LP18-T02 different-files pool performs zero Record serializations | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 17. LP18-T03 equal-shape identical pool retains full canonical comparison and alias | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 18. LP18-T03 equal-shape changed pool retains full comparison without alias | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 19. LP18-T03 null and absent pool entries remain independent without serialization | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 20. LP18-T03 malformed direct payload still passes through strict rejection | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 21. LP18-T03 state and files prefilter cannot bypass immutable Intent collision | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp18-ownership-green-transition-job-01.txt

[원출력](lp18-ownership-green-transition-job-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-J03 initial canonical and active source protection preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. LP18-J03 FindDerivedJob returns independent value | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. LP18-J03 full and active snapshots return independent values | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. LP18-J03 foreign Prepared owner rejected without transition | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. LP18-J02 validated record is published as the same owned object | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. LP18-J02 Prepared prior retains pre-publication canonical value | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. LP18-J03 consumed Prepared cannot apply twice | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. LP18-J03 invalid terminal transition preserves state and bytes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. LP18-J03 terminal protection and service owner released | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. LP18-J01 checkpoint shares current live job object | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. LP18-J03 null job pool uses independent strict value | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 12. LP18-J03 different-content job pool uses independent strict value | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 13. LP18-J03 different-id job pool uses independent strict value | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 14. LP18-J02 equal-content replacement invalidates Prepared prior ownership | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 15. LP18-J01 shared job survives pool owner destruction | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 16. LP18-J01 no-op checkpoint preserves job handles without pool comparisons | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 17. LP18-J01 newly applied job compares only matching current pool entry | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 18. LP18-J01 duplicate job mutation performs no pool comparison | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 19. LP18-J03 latest terminal pool cannot replace historical Intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 20. LP18-J03 matching job pool cannot bypass strict state validation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 21. LP18-J03 null resident job rejects snapshots and retention authority | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 22. LP18-J04 full journal bytes and terminal record roundtrip preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 23. LP18-J04 SQLite reopen preserves terminal canonical and release | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 24. LP18-J04 JSONL reopen preserves terminal canonical and release | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp18-transition-prepared-02.txt

[원출력](lp18-transition-prepared-02.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP14-C01 state=1 updates=1 full_parse=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. LP14-C01 state=2 updates=1 full_parse=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. LP14-C01 state=3 updates=1 full_parse=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. LP14-C03 memory/sqlite canonical bytes and CompletedOracle | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. LP14-C02 binding=payload rejected without apply | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. LP14-C02 binding=type rejected without apply | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. LP14-C02 binding=entity rejected without apply | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. LP14-C02 binding=owner rejected without apply | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. LP14-C02 binding=prior rejected without apply | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. LP14-C02 duplicate envelope no-apply/conflict rejection | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. LP14-C02 one-shot apply/reuse rejection | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp18-transition-jobs-02.txt

[원출력](lp18-transition-jobs-02.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. J01 실제 선택→compact 내구 job 계약 왕복 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. J17 무관source8개 추가에도 동일선택 jobID 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. J18 cleanup wall시계 역행 허용·순서는상태로검사 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. J04 단일 Intent 원장·보호·예약 원자 가시성 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. J19 후발 coordinator 일반·파생 admission 및 복구 차단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. J02 이후 시각 재Build ID 유지·선택 변경 새 ID | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. J03 unknown·중복·미지원 schema·불완전 JSON·4MiB·예약 상한·미구현 state 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. J16 소유 경로·attempt·order 계획 조작 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. J16 실제 2 source UUID 역순이어도 영속 order 순 출력 계획 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. J08 나중 시각 재요청 최초 시각 유지·예약/경로 충돌·다른 catalog 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. J06 generic hold 감소로 job 보호 해제 불가·직접 삭제/corrupt 차단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 12. J14 cleanup Failed는 job 자원만 해제·wall 역행·terminal 자동 재시도 없음 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 13. J05 pending·corrupt·tombstone·hash·binding 불일치 source 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 14. J07 실제 source 삭제/Intent 경쟁에서 둘 중 한 전이만 허용 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 15. J10 checkpoint 전후 job·보호·예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 16. J09 SQLite·fallback·재build/reopen 내구 job 동등·중복 보호 가산 없음 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 17. J10 replay 동일 중복 멱등·다른 내용/불완전/schema/전이/보호 상태 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 18. J11 같은 채널 memory+동시 durable 예약 합계 event quota 제한 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 19. J12 durable outstanding을 continuous/event/derived disk 예약에 포함 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 20. J13 snapshot/disk provider 실패는 생성·periodic·복구 삭제 차단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 21. J15 partial unknown·이유·후보·요청 시간축 그대로 보존 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 22. J19 정확한 소유자 소멸 후 새 coordinator만 재결박 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 23. J20 append 거부 후 원장 복원해도 공통 mutation 차단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp18-transition-service-02.txt

[원출력](lp18-transition-service-02.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. F12 실제 remux의 다른 selection 결박 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. F12 실제 remux provenance의 요청 범위 위조 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. F12 실제 remux의 foreign unfulfilled 범위 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. F01 실제 writer→선택→Intent→파생 파일→게시→Complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. F01 실제 catalog/file/hash/단일 commit/hold 해제/cleanup 및 직접 decode | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. F15 단일 service·동시 Run·외부 terminal release 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. F16 active source 삭제 거부·동일 사유 비보호 원본 삭제 positive control | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. F02 두 출력 독립 epoch·unknown UTC·실제 AU/visible 출처 보존 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. F12 Complete 출처 전수 canonical roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. F12 Ready 포함 Intent 잘못된 상태 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. F12 미지원 필드 엄격 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 12. F14 Ready JSON 4MiB 명시 상한 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 13. F12 출력 receipt inode 별칭 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 14. F03 Intent 생성 전 프로세스 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 15. F04 receipt 전 실물의 소유권 미확인 보호 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 16. F05 receipt 이후 Intent 중단 소유물 정리 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 17. F06 Ready 중단 뒤 재렌더 없이 완료 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 18. F07 첫 출력 link 중단 쌍 복구 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 19. F07 두 번째 출력 link 중단 쌍 복구 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 20. F08 전체 publish 후 commit 전 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 21. F09 원자 commit 후 cleanup 전 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 22. F10 첫 temp 삭제 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 23. F10 두 번째 temp 삭제 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 24. F10 attempt 디렉터리 삭제 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 25. F10 job 디렉터리 삭제 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 26. F10 Complete mutation 직전 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 27. F10 Failed cleanup attempt 삭제 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 28. F10 Failed cleanup job 삭제 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 29. F10 Failed mutation 직전 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 30. F11 hash 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 31. F11 missing 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 32. F11 foreign 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 33. F11 symlink 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 34. F11 fifo 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 35. F11 hardlink 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 36. F11 parent 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 37. F14 cancel-before-create 생성 중단·소유 cleanup·예약 해제 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 38. F14 cancel 생성 중단·소유 cleanup·예약 해제 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 39. F14 small 생성 중단·소유 cleanup·예약 해제 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 40. F14 deadline 생성 중단·소유 cleanup·예약 해제 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 41. F12 SQLite projection·journal fallback job/output 일치 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 42. F12 SQLite rebuild·checkpoint 재개방 job/output 일치 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 43. F13 Complete output tombstone 뒤 재생성 없음 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp18-ownership-green-transition-proof-01.txt

[원출력](lp18-ownership-green-transition-proof-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-V03 valid content proof cannot bypass output reservation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. LP18-V03 valid content proof cannot bypass source deletion state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. LP18-V03 valid content proof cannot bypass source media binding | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. LP18-V02 minted proof reuses owned content after state validation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. LP18-V02 schema mismatch retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. LP18-V02 type mismatch retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. LP18-V02 mutation ID mismatch retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. LP18-V02 entity mismatch retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. LP18-V02 time mismatch retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. LP18-V02 payload bytes mismatch retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. LP18-V03 invalid content rejects through strict fallback | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 12. LP18-V02 null owner retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 13. LP18-V02 null envelope retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 14. LP18-V02 null record retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 15. LP18-V02 foreign owner retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 16. LP18-V02 equal-content replacement invalidates current proof ownership | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 17. LP18-V02 equal-envelope replacement invalidates accepted proof ownership | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 18. LP18-V03 valid content proof cannot bypass missing prior transition | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 19. CP01 actual Ready Complete shape canonical files reservation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 20. CP02 bounded two jobs over 1MiB canonical transitions | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 21. LP18-V01 every normal update strictly parses content once | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 22. LP18-V01 automatic checkpoint applies current update payload | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 23. LP18-V01 automatic checkpoint reuses current validated content without parsing | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 24. LP18-V04 managed reopen retains strict content parsing | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 25. LP18-V04 manual checkpoint retains strict content parsing | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp18-transition-cache-02.txt

[원출력](lp18-transition-cache-02.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP15-C01 cold full applied=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. LP15-C01 unchanged prefix applied=0 expected=0 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. LP15-C01 exact prefix suffix only applied=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. LP15-C01 independent prefix shadow/full projection equality | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. LP15-C01 full fallback schema applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. LP15-C01 full fallback type applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. LP15-C01 full fallback id applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. LP15-C01 full fallback entity applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. LP15-C01 full fallback time applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. LP15-C01 full fallback payload applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. LP15-C01 full fallback reorder applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 12. LP15-C01 full fallback shrink applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 13. LP15-C01 full fallback null-shadow applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 14. LP15-C01 full fallback null-handle applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 15. LP15-C01 Open clears cache applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 16. LP15-C03 recover full/no-cache | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 17. LP15-C03 after recover full applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 18. LP15-C03 injected commit refusal discards cache | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 19. LP15-C03 after commit refusal full applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 20. LP15-C03 suffix exception discards cache | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 21. LP15-C03 after exception full applied=3 expected=3 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 22. LP15-C03 public poisoned entry discards cache | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 23. LP15-C03 after restored fixture full applied=3 expected=3 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 24. LP15-C04 exact byte charge boundary | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 25. LP15-C04 overflow charge rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 26. LP15-C04 8192 records admitted | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 27. LP15-C04 8193 records rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 28. LP15-C04 64MiB record charge admitted | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 29. LP15-C04 64MiB plus one rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 30. LP15-C03 changed candidate prime applied=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 31. LP15-C03 changed candidate suffix12 plus full candidate13 applied=25 expected=25 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 32. LP15-C03 changed candidate cache equals independent full projection | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 33. LP15-C03 compacted candidate prefix reused applied=0 expected=0 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 34. LP15-C03 forced projection mismatch discards cache | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 35. LP15-C04 overlimit prime applied=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 36. LP15-C04 existing cache ignored for oversized original applied=8193 expected=8193 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 37. LP15-C04 oversized candidate not retained | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 38. LP15-C04 next oversized checkpoint full applied=8193 expected=8193 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 39. CP01 actual Ready Complete shape canonical files reservation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 40. CP02 bounded two jobs over 1MiB canonical transitions | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 41. LP15-C02 bounded automatic checkpoint and whole transition measurement | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 42. LP15-C02 reopened full applied=18 expected=18 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 43. LP15-C02 actual unchanged prefix applied=0 expected=0 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 44. LP15-C02 actual suffix only applied=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 45. LP15-C02 actual job shadow/full projection equality | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 46. LP15-C03 illegal Ready after Complete suffix rejected by cached/full paths | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 47. LP15-C04 peakRSS bytes=166887424 cap=536870912 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp18-transition-catalog-02.txt

[원출력](lp18-transition-catalog-02.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. journal open:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. fallback catalog open:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. SQLite off mode 표시 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. segment finalize journal+projection:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. fallback range query | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. event link FK 위반 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. FK 위반 transaction/journal 전체 rollback | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. 최초 durable mutation 1개 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. 동일 mutation 중복 append | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. 손상 사이 정상 durable mutation 보존 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. 중간 corrupt line count | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 12. 마지막 truncated line skip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 13. fallback replay open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 14. 같은 mutation idempotent replay | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 15. 재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 16. 중복 replay row/합계 불증가 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 17. 추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 18. writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 19. v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 20. SQLite catalog open/rebuild:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 21. SQLite primary mode 표시 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 22. SQLite on/off range query ID·순서 parity | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 23. journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 24. journal 없는 손상 media orphan 구분 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 25. projection failover journal open:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 26. projection failover catalog open:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 27. 실제 SQLite INSERT 실패 trigger 설치 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 28. SQLite 투영 실패 뒤 journal+memory finalize 유지:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 29. SQLite 투영 실패 즉시 JSONL fallback 전환 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 30. 재시작 rebuild 전 실패 trigger 제거 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 31. 투영 실패 직후 in-memory query 정합성 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 32. projection failover 재시작 journal rebuild:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 33. 재시작 후 journal에서 누락 SQLite projection 복구 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 34. 재시작 후 SQLite primary 복귀 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 35. 재시작 journal rebuild가 실제 SQLite row 복원 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 36. tombstone journal open:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 37. tombstone catalog open:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 38. tombstone 대상 segment finalize:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 39. tombstone 대상 deletion request:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 40. tombstone 완료 기록:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 41. catalog finalize가 tombstone segment ID 재사용을 거부해야 함 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 42. 손상 SQLite 격리 후 journal rebuild:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 43. 손상 SQLite 원본 격리 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 44. 격리 SQLite 파일 보존 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 45. 격리 후 journal rebuild 결과 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 46. S10-3A future-schema journal read open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 47. S10-3A future-schema unsupported classification | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 48. S10-3A future-schema catalog open denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 49. S10-3A future-schema catalog retry denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 50. S10-3A future-schema journal bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 51. S10-3A future-schema SQLite bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 52. S10-3A future-schema writer cleanup untouched | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 53. S10-3A arbitrary-schema journal read open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 54. S10-3A arbitrary-schema unsupported classification | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 55. S10-3A arbitrary-schema catalog open denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 56. S10-3A arbitrary-schema catalog retry denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 57. S10-3A arbitrary-schema journal bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 58. S10-3A arbitrary-schema SQLite bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 59. S10-3A arbitrary-schema writer cleanup untouched | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 60. S10-3A empty-schema journal read open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 61. S10-3A empty-schema unsupported classification | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 62. S10-3A empty-schema catalog open denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 63. S10-3A empty-schema catalog retry denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 64. S10-3A empty-schema journal bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 65. S10-3A empty-schema SQLite bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 66. S10-3A empty-schema writer cleanup untouched | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 67. S10-3A future-type journal read open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 68. S10-3A future-type unsupported classification | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 69. S10-3A future-type catalog open denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 70. S10-3A future-type catalog retry denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 71. S10-3A future-type journal bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 72. S10-3A future-type SQLite bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 73. S10-3A future-type writer cleanup untouched | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 74. S10-3A malformed journal open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 75. S10-3A malformed JSON missing fields and wrong types remain corrupt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 76. S10-O01 reservation journal open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 77. S10-O01 first reservation returns four IDs and sequence one | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 78. S10-O01 versioned reservation payload replays | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 79. S10-O01 new reservation records actual occurred time | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 80. S10-O02 identical retry preserves sequence and bytes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 81. S10-O03 reopened instance allocates next sequence | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 82. S10-O03 new process resumes durable sequence | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 83. S10-O04 different store rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 84. S10-O04 reused request with different segment rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 85. S10-O04 reused request with different channel rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 86. S10-O04 reused segment with different request rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 87. S10-O04 conflicts preserve original bytes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 88. S10-O05/O06 reject and preserve corrupt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 89. S10-O05/O06 reject and preserve unsupported-schema | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 90. S10-O05/O06 reject and preserve unsupported-type | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 91. S10-O05/O06 reject and preserve tail | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 92. S10-O05/O06 reject and preserve payload-zero | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 93. S10-O05/O06 reject and preserve payload-negative | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 94. S10-O05/O06 reject and preserve payload-fraction | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 95. S10-O05/O06 reject and preserve payload-overflow | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 96. S10-O05/O06 reject and preserve duplicate-sequence | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 97. S10-O05/O06 reject and preserve decreasing-sequence | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 98. S10-O05/O06 reject and preserve duplicate-request | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 99. S10-O05/O06 reject and preserve duplicate-segment | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 100. S10-O05/O06 reject and preserve store-conflict | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 101. S10-O05/O06 reject and preserve ordinary-before | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 102. S10-O05/O06 reject and preserve ordinary-after | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 103. S10-O05/O06 reject and preserve line-cap | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 104. S10-O05 reservation entity envelope binding rejects mismatch | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 105. S10-O05 reservation request envelope binding rejects mismatch | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 106. S10-O01 strict reservation parser accepts versioned literal | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 107. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 108. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 109. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 110. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 111. S10-O06 INT64_MAX identical retry remains valid | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 112. S10-O06 sequence overflow rejected without write | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 113. S10-O02 identical durable reservation duplicates remain idempotent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 114. S10-O06 sequence gaps remain valid and allocate above maximum | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 115. S10-O07 four simultaneous processes finish reservations | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 116. S10-O07 concurrent sequences are unique and complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 117. S10-O07 next sequence follows concurrent reservations | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 118. S10-O08 ordinary Append cannot reserve orders | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 119. S10-O08 unopened journal rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 120. S10-O08 null result rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 121. S10-O08 invalid opaque ID rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 122. S10-O08 failed reservation does not expose tentative result | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 123. S10-O09 unsafe file binding rejected and original preserved inode | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 124. S10-O09 unsafe file binding rejected and original preserved parent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 125. S10-O09 unsafe file binding rejected and original preserved symlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 126. S10-O09 unsafe file binding rejected and original preserved hardlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 127. S10-O10 reservation and normal segment coexist in catalog | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 128. S10-O04 reserve then finalize permits identical retry | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 129. S10-O10 reservation survives catalog rebuild without changing segment query | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 130. S10-O04 legacy segment cannot acquire retroactive reservation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 131. S10-M06 opened catalog accepts fresh exact reservation V2 finalize | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 132. S10-M07 V2 find preserves complete metadata | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 133. S10-M07 identical V2 recovery is idempotent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 134. S10-M07 V2 is absent from V1 range query | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 135. S10-M07 V2 registered path is not orphan | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 136. S10-M07 SQLite exact V2 JSON and path match | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 137. S10-M07 JSONL restart preserves V2 exact payload | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 138. S10-M06 wrong reservation tuple rejected store | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 139. S10-M06 wrong reservation tuple rejected request | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 140. S10-M06 wrong reservation tuple rejected segment | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 141. S10-M06 wrong reservation tuple rejected channel | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 142. S10-M06 wrong reservation tuple rejected sequence | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 143. S10-M09 immutable V2 mapping mismatch rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 144. S10-M09 bad V2 startup retry preserves original state bad-payload | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 145. S10-M09 bad V2 startup retry preserves original state missing-order | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 146. S10-M09 bad V2 startup retry preserves original state bad-order | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 147. S10-M09 bad V2 startup retry preserves original state conflicting-order | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 148. S10-M09 bad V2 startup retry preserves original state tail | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 149. S10-M09 bad V2 startup retry preserves original state corrupt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 150. S10-M09 bad V2 startup retry preserves original state unsafe-path | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 151. S10-M09 default off rejects V2 before SQLite changes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 152. S10-M09 V2 replay namespace and deletion duplicate | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 153. S10-M09 V2 replay namespace and deletion deleted | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 154. S10-M09 V2 replay namespace and deletion v1-before | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 155. S10-M09 V2 replay namespace and deletion v1-after | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 156. S10-M09 V2 replay namespace and deletion deleted-before | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 157. S10-M09 V2 replay namespace and deletion resurrection | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 158. S10-M09 V2 replay namespace and deletion mutation-collision | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 159. S10-M09 V2 finalize rejects missing media | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 160. S10-M09 V2 finalize rejects directory media | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 161. S10-M09 fresh candidate rejects mapping | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 162. S10-M09 fresh candidate rejects path | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 163. S10-M09 fresh candidate rejects tombstone | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 164. S10-SW01 managed empty root opens with lifetime lease | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 165. S10-SW02 same process second managed owner denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 166. S10-SW03 different process owner and inherited use denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 167. S10-SW12 managed duplicate descriptors are close-on-exec | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 168. S10-SW05 managed reserve append replay use owned descriptor | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 169. S10-SW06 raw managed access and legacy default path denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 170. S10-SW01 managed Reserve rejects different store identity | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 171. S10-SW10 catalog connection can inspect managed lease | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 172. S10-SW04 owner destruction releases lease | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 173. S10-SW01 managed reopen rejects different store identity | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 174. S10-SW11 managed incomplete tail rejects append without changing bytes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 175. S10-SW07 legacy nonempty root preserved without conversion | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 176. S10-SW08 partial initialization retry validates exact state lease | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 177. S10-SW08 partial initialization retry validates exact state init | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 178. S10-SW08 partial initialization retry validates exact state barrier | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 179. S10-SW08 partial initialization retry validates exact state journal | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 180. S10-SW08 partial initialization retry validates exact state incomplete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 181. S10-SW08 partial initialization retry validates exact state unknown | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 182. S10-SW09 symlink inode and malformed marker rejected journal | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 183. S10-SW09 symlink inode and malformed marker rejected marker | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 184. S10-SW09 symlink inode and malformed marker rejected barrier | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 185. S10-SW09 symlink inode and malformed marker rejected root-symlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 186. S10-SB01 second managed catalog is denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 187. S10-SB02 failed catalog cannot mutate journal or holds | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 188. S10-SB03 attached catalog blocks unowned append but permits reservation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 189. S10-SB04 catalog destruction releases attachment | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 190. S10-SB05 managed catalog rejects unsafe options outside | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 191. S10-SB05 managed catalog rejects unsafe options dotdot | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 192. S10-SB05 managed catalog rejects unsafe options media-symlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 193. S10-SB05 managed catalog rejects unsafe options sqlite-symlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 194. S10-SB05 managed catalog rejects unsafe options sqlite-hardlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 195. S10-SB05 managed catalog rejects unsafe options disabled | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 196. S10-SB06 failed open releases catalog attachment | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 197. S10-SB07 managed SQLite sidecar rejected -wal symlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 198. S10-SB07 managed SQLite sidecar rejected -wal hardlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 199. S10-SB07 managed SQLite sidecar rejected -shm symlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 200. S10-SB07 managed SQLite sidecar rejected -shm hardlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 201. S10-SB07 managed SQLite sidecar rejected -journal symlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 202. S10-SB07 managed SQLite sidecar rejected -journal hardlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 203. S10-SC01 managed repeated event fixture is valid | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 204. S10-SC02 managed reservations avoid history reads | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 205. S10-SC03 managed V2 finalize avoids full replay | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 206. S10-SC04 checkpoint reduces superseded event payload bytes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 207. S10-SC05 checkpoint preserves latest event and all record identities | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 208. S10-SC06 checkpoint is idempotent and preserves V2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 209. S10-SC08 receipt preserves retry identity and rejects direct append | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 210. S10-SC09 checkpoint restart preserves SQLite and JSONL state sqlite | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 211. S10-SC09 managed checkpoint SQL V2 payload and path | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 212. S10-SC09 checkpoint restart preserves SQLite and JSONL state jsonl | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 213. S10-SC10 checkpoint prefix recovers before writes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 214. S10-SC11 checkpoint mismatch preserves bytes and poisons owner | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 215. S10-SC12 first accepted mutation controls latest event | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 216. S10-SC16 automatic checkpoint uses accumulated growth | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 217. S10-SC07 raw checkpoint is rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 218. S10-SC18 checkpoint syscall failure poisons and reopens write | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 219. S10-SC21 poison rejects hold mutation write | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 220. S10-SC18 checkpoint syscall failure poisons and reopens file-fsync | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 221. S10-SC21 poison rejects hold mutation file-fsync | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 222. S10-SC18 checkpoint syscall failure poisons and reopens rename | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 223. S10-SC21 poison rejects hold mutation rename | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 224. S10-SC18 checkpoint syscall failure poisons and reopens dir-fsync | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 225. S10-SC21 poison rejects hold mutation dir-fsync | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 226. S10-SC17 checkpoint preserves holds observations and deletion | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 227. S10-SC17 checkpoint SQL hold observation tombstone | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 228. S10-SC17 checkpoint preserves holds observations and deletion restart sqlite | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 229. S10-SC17 checkpoint SQL restart observation tombstone | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 230. S10-SC17 checkpoint preserves holds observations and deletion restart jsonl | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 231. S10-SC19 invalid managed history remains unchanged malformed | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 232. S10-SC19 invalid managed history remains unchanged unsupported | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 233. S10-SC19 invalid managed history remains unchanged conflict | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 234. S10-SC20 raw catalog rejects receipt before side effects | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 235. S10-SC13 crypto off raw remains usable | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 236. S10-SC14 crypto off checkpoint is rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 237. S10-SC15 crypto off receipt reopen is rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 238. source 저장 callback reconcile 연결 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 239. policy revision idempotency | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 240. 5초 safety reconcile | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 241. composition root 관리 저장소 선행 open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 242. composition helper journal 다음 catalog rebuild/open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 243. 서버 전 supervisor 시작 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 244. ingress 전 event bridge 등록 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 245. ingress 종료 뒤 recorder finalize | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 246. composition root 시작/종료 순서 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp17-jobs-lp18-transition-01.txt

[원출력](lp17-jobs-lp18-transition-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. FC01 exact insertion checks count=97 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. D08.input-keyframes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. D08.source-shape | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. D08.selection-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. D08.expected-intent-built | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. D08.admission | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 12. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 13. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 14. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 15. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 16. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 17. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 18. D08.ready-verified-proof | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 19. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 20. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 21. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 22. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 23. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 24. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 25. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 26. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 27. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 28. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 29. D08.protection-released | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 30. D08.run-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 31. D08.actual-output-hash | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 32. D08.selection-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 33. D08.expected-intent-built | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 34. D08.admission | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 35. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 36. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 37. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 38. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 39. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 40. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 41. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 42. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 43. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 44. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 45. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 46. D08.ready-verified-proof | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 47. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 48. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 49. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 50. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 51. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 52. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 53. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 54. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 55. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 56. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 57. D08.protection-released | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 58. D08.run-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 59. D08.actual-output-hash | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 60. CP01.actual-ready-complete-shape-canonical-files-reservation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 61. CP02.two-jobs-over-1MiB-canonical-transitions | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 62. D08.input-keyframes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 63. D08.source-shape | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 64. D08.selection-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 65. D08.expected-intent-built | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 66. D08.admission | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 67. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 68. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 69. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 70. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 71. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 72. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 73. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 74. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 75. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 76. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 77. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 78. D08.ready-verified-proof | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 79. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 80. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 81. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 82. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 83. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 84. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 85. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 86. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 87. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 88. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 89. D08.protection-released | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 90. D08.run-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 91. D08.actual-output-hash | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 92. D08.selection-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 93. D08.expected-intent-built | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 94. D08.admission | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 95. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 96. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 97. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 98. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 99. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 100. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 101. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 102. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 103. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 104. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 105. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 106. D08.ready-verified-proof | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 107. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 108. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 109. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 110. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 111. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 112. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 113. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 114. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 115. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 116. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 117. D08.protection-released | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 118. D08.run-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 119. D08.actual-output-hash | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 120. CP01.actual-ready-complete-shape-canonical-files-reservation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 121. CP02.two-jobs-over-1MiB-canonical-transitions | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

## Intent 호출 내부 Context: RED·GREEN·영향 회귀

기존 RED28개를 보존하고 오류 순서3개 추가 등록 후 GREEN31개를 실행했다. 아래는 원출력의 모든 assertion이며 실제 HTTP/누적 catalog/장시간/UI 판정이 아니다.

### lp18-ownership-red-context-01.txt

[원출력](lp18-ownership-red-context-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-I01 actual Complete retains files hashes commit and protection release | 실제 assertion | PASS | 예상 RED 원출력 보존 |
| 2. LP18-I01 actual BuildReady executes nonzero strict work once | 실제 assertion | PASS | 예상 RED 원출력 보존 |
| 3. LP18-I02 single strict context build-ready | 실제 assertion | FAIL | 예상 RED 원출력 보존 |
| 4. LP18-I01 public Intent canonical roundtrip preserved | 실제 assertion | PASS | 예상 RED 원출력 보존 |
| 5. LP18-I02 single strict context serialize-intent | 실제 assertion | FAIL | 예상 RED 원출력 보존 |
| 6. LP18-I02 single strict context parse-intent | 실제 assertion | FAIL | 예상 RED 원출력 보존 |
| 7. LP18-I01 record canonical roundtrip intent | 실제 assertion | PASS | 예상 RED 원출력 보존 |
| 8. LP18-I02 single strict context serialize-record-intent | 실제 assertion | FAIL | 예상 RED 원출력 보존 |
| 9. LP18-I02 single strict context parse-record-intent | 실제 assertion | FAIL | 예상 RED 원출력 보존 |
| 10. LP18-I01 record canonical roundtrip failed | 실제 assertion | PASS | 예상 RED 원출력 보존 |
| 11. LP18-I02 single strict context serialize-record-failed | 실제 assertion | FAIL | 예상 RED 원출력 보존 |
| 12. LP18-I02 single strict context parse-record-failed | 실제 assertion | FAIL | 예상 RED 원출력 보존 |
| 13. LP18-I01 record canonical roundtrip ready | 실제 assertion | PASS | 예상 RED 원출력 보존 |
| 14. LP18-I02 single strict context serialize-record-ready | 실제 assertion | FAIL | 예상 RED 원출력 보존 |
| 15. LP18-I02 single strict context parse-record-ready | 실제 assertion | FAIL | 예상 RED 원출력 보존 |
| 16. LP18-I01 record canonical roundtrip committed | 실제 assertion | PASS | 예상 RED 원출력 보존 |
| 17. LP18-I02 single strict context serialize-record-committed | 실제 assertion | FAIL | 예상 RED 원출력 보존 |
| 18. LP18-I02 single strict context parse-record-committed | 실제 assertion | FAIL | 예상 RED 원출력 보존 |
| 19. LP18-I01 record canonical roundtrip complete | 실제 assertion | PASS | 예상 RED 원출력 보존 |
| 20. LP18-I02 single strict context serialize-record-complete | 실제 assertion | FAIL | 예상 RED 원출력 보존 |
| 21. LP18-I02 single strict context parse-record-complete | 실제 assertion | FAIL | 예상 RED 원출력 보존 |
| 22. LP18-I01 every measured public call retains first strict work | 실제 assertion | PASS | 예상 RED 원출력 보존 |
| 23. LP18-I03 same-address changed Intent cannot reuse prior validation | 실제 assertion | PASS | 예상 RED 원출력 보존 |
| 24. LP18-I03 same-address manifest change rejects and Parse clears output | 실제 assertion | PASS | 예상 RED 원출력 보존 |
| 25. LP18-I03 receipt alias remains rejected | 실제 assertion | PASS | 예상 RED 원출력 보존 |
| 26. LP18-I03 reconstructed actual remux retains Ready canonical positive control | 실제 assertion | PASS | 예상 RED 원출력 보존 |
| 27. LP18-I03 BuildReady rejects altered au and clears output | 실제 assertion | PASS | 예상 RED 원출력 보존 |
| 28. LP18-I03 BuildReady rejects altered coverage and clears output | 실제 assertion | PASS | 예상 RED 원출력 보존 |

### lp18-ownership-green-context-01.txt

[원출력](lp18-ownership-green-context-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-I01 actual Complete retains files hashes commit and protection release | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. LP18-I01 actual BuildReady executes nonzero strict work once | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. LP18-I02 single strict context build-ready | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. LP18-I01 public Intent canonical roundtrip preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. LP18-I02 single strict context serialize-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. LP18-I02 single strict context parse-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. LP18-I01 record canonical roundtrip intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. LP18-I02 single strict context serialize-record-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. LP18-I02 single strict context parse-record-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. LP18-I01 record canonical roundtrip failed | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. LP18-I02 single strict context serialize-record-failed | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 12. LP18-I02 single strict context parse-record-failed | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 13. LP18-I01 record canonical roundtrip ready | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 14. LP18-I02 single strict context serialize-record-ready | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 15. LP18-I02 single strict context parse-record-ready | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 16. LP18-I01 record canonical roundtrip committed | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 17. LP18-I02 single strict context serialize-record-committed | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 18. LP18-I02 single strict context parse-record-committed | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 19. LP18-I01 record canonical roundtrip complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 20. LP18-I02 single strict context serialize-record-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 21. LP18-I02 single strict context parse-record-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 22. LP18-I01 every measured public call retains first strict work | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 23. LP18-I03 same-address changed Intent cannot reuse prior validation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 24. LP18-I03 same-address manifest change rejects and Parse clears output | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 25. LP18-I03 receipt alias remains rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 26. LP18-I03 reconstructed actual remux retains Ready canonical positive control | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 27. LP18-I03 BuildReady rejects altered au and clears output | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 28. LP18-I03 BuildReady rejects altered coverage and clears output | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 29. LP18-I03 BuildReady input shape failure precedes selection validation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 30. LP18-I03 BuildReady selection mismatch preserves failure mapping | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 31. LP18-I03 public Intent parse preserves strict error and clears output | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp18-context-validation-01.txt

[원출력](lp18-context-validation-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. P0-PERF01 literal source1 sample250 slice45 complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. P0-PERF01 canonical record roundtrip unchanged | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. P0-PERF02 baseline canonical hash literal unchanged | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. P0-PERF01 source mapping conflict rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. P0-PERF01 selection table mapping conflict rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. P0-PERF01 job identity forgery rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. LP09-S03a native exact selection and proof survive job roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. LP09-S03a noncontiguous exact slices rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. LP09-S03a observed identity and native interval mismatch rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. LP09-S03a native profile cannot drop file evidence | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. LP09-S03a overlapping substitute AU cannot replace selected identity | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp18-context-prepared-01.txt

[원출력](lp18-context-prepared-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP14-C01 state=1 updates=1 full_parse=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. LP14-C01 state=2 updates=1 full_parse=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. LP14-C01 state=3 updates=1 full_parse=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. LP14-C03 memory/sqlite canonical bytes and CompletedOracle | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. LP14-C02 binding=payload rejected without apply | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. LP14-C02 binding=type rejected without apply | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. LP14-C02 binding=entity rejected without apply | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. LP14-C02 binding=owner rejected without apply | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. LP14-C02 binding=prior rejected without apply | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. LP14-C02 duplicate envelope no-apply/conflict rejection | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. LP14-C02 one-shot apply/reuse rejection | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp18-context-jobs-01.txt

[원출력](lp18-context-jobs-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. J01 실제 선택→compact 내구 job 계약 왕복 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. J17 무관source8개 추가에도 동일선택 jobID 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. J18 cleanup wall시계 역행 허용·순서는상태로검사 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. J04 단일 Intent 원장·보호·예약 원자 가시성 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. J19 후발 coordinator 일반·파생 admission 및 복구 차단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. J02 이후 시각 재Build ID 유지·선택 변경 새 ID | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. J03 unknown·중복·미지원 schema·불완전 JSON·4MiB·예약 상한·미구현 state 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. J16 소유 경로·attempt·order 계획 조작 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. J16 실제 2 source UUID 역순이어도 영속 order 순 출력 계획 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. J08 나중 시각 재요청 최초 시각 유지·예약/경로 충돌·다른 catalog 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. J06 generic hold 감소로 job 보호 해제 불가·직접 삭제/corrupt 차단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 12. J14 cleanup Failed는 job 자원만 해제·wall 역행·terminal 자동 재시도 없음 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 13. J05 pending·corrupt·tombstone·hash·binding 불일치 source 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 14. J07 실제 source 삭제/Intent 경쟁에서 둘 중 한 전이만 허용 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 15. J10 checkpoint 전후 job·보호·예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 16. J09 SQLite·fallback·재build/reopen 내구 job 동등·중복 보호 가산 없음 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 17. J10 replay 동일 중복 멱등·다른 내용/불완전/schema/전이/보호 상태 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 18. J11 같은 채널 memory+동시 durable 예약 합계 event quota 제한 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 19. J12 durable outstanding을 continuous/event/derived disk 예약에 포함 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 20. J13 snapshot/disk provider 실패는 생성·periodic·복구 삭제 차단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 21. J15 partial unknown·이유·후보·요청 시간축 그대로 보존 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 22. J19 정확한 소유자 소멸 후 새 coordinator만 재결박 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 23. J20 append 거부 후 원장 복원해도 공통 mutation 차단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp18-context-service-01.txt

[원출력](lp18-context-service-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. F12 실제 remux의 다른 selection 결박 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. F12 실제 remux provenance의 요청 범위 위조 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. F12 실제 remux의 foreign unfulfilled 범위 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. F01 실제 writer→선택→Intent→파생 파일→게시→Complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. F01 실제 catalog/file/hash/단일 commit/hold 해제/cleanup 및 직접 decode | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. F15 단일 service·동시 Run·외부 terminal release 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. F16 active source 삭제 거부·동일 사유 비보호 원본 삭제 positive control | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. F02 두 출력 독립 epoch·unknown UTC·실제 AU/visible 출처 보존 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. F12 Complete 출처 전수 canonical roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. F12 Ready 포함 Intent 잘못된 상태 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. F12 미지원 필드 엄격 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 12. F14 Ready JSON 4MiB 명시 상한 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 13. F12 출력 receipt inode 별칭 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 14. F03 Intent 생성 전 프로세스 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 15. F04 receipt 전 실물의 소유권 미확인 보호 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 16. F05 receipt 이후 Intent 중단 소유물 정리 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 17. F06 Ready 중단 뒤 재렌더 없이 완료 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 18. F07 첫 출력 link 중단 쌍 복구 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 19. F07 두 번째 출력 link 중단 쌍 복구 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 20. F08 전체 publish 후 commit 전 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 21. F09 원자 commit 후 cleanup 전 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 22. F10 첫 temp 삭제 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 23. F10 두 번째 temp 삭제 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 24. F10 attempt 디렉터리 삭제 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 25. F10 job 디렉터리 삭제 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 26. F10 Complete mutation 직전 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 27. F10 Failed cleanup attempt 삭제 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 28. F10 Failed cleanup job 삭제 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 29. F10 Failed mutation 직전 중단 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 30. F11 hash 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 31. F11 missing 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 32. F11 foreign 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 33. F11 symlink 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 34. F11 fifo 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 35. F11 hardlink 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 36. F11 parent 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 37. F14 cancel-before-create 생성 중단·소유 cleanup·예약 해제 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 38. F14 cancel 생성 중단·소유 cleanup·예약 해제 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 39. F14 small 생성 중단·소유 cleanup·예약 해제 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 40. F14 deadline 생성 중단·소유 cleanup·예약 해제 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 41. F12 SQLite projection·journal fallback job/output 일치 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 42. F12 SQLite rebuild·checkpoint 재개방 job/output 일치 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 43. F13 Complete output tombstone 뒤 재생성 없음 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp18-ownership-green-context-proof-01.txt

[원출력](lp18-ownership-green-context-proof-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-V03 valid content proof cannot bypass output reservation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. LP18-V03 valid content proof cannot bypass source deletion state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. LP18-V03 valid content proof cannot bypass source media binding | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. LP18-V02 minted proof reuses owned content after state validation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. LP18-V02 schema mismatch retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. LP18-V02 type mismatch retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. LP18-V02 mutation ID mismatch retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. LP18-V02 entity mismatch retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. LP18-V02 time mismatch retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. LP18-V02 payload bytes mismatch retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. LP18-V03 invalid content rejects through strict fallback | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 12. LP18-V02 null owner retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 13. LP18-V02 null envelope retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 14. LP18-V02 null record retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 15. LP18-V02 foreign owner retains strict outcome | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 16. LP18-V02 equal-content replacement invalidates current proof ownership | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 17. LP18-V02 equal-envelope replacement invalidates accepted proof ownership | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 18. LP18-V03 valid content proof cannot bypass missing prior transition | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 19. CP01 actual Ready Complete shape canonical files reservation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 20. CP02 bounded two jobs over 1MiB canonical transitions | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 21. LP18-V01 every normal update strictly parses content once | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 22. LP18-V01 automatic checkpoint applies current update payload | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 23. LP18-V01 automatic checkpoint reuses current validated content without parsing | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 24. LP18-V04 managed reopen retains strict content parsing | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 25. LP18-V04 manual checkpoint retains strict content parsing | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp18-context-cache-01.txt

[원출력](lp18-context-cache-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP15-C01 cold full applied=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. LP15-C01 unchanged prefix applied=0 expected=0 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. LP15-C01 exact prefix suffix only applied=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. LP15-C01 independent prefix shadow/full projection equality | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. LP15-C01 full fallback schema applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. LP15-C01 full fallback type applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. LP15-C01 full fallback id applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. LP15-C01 full fallback entity applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. LP15-C01 full fallback time applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. LP15-C01 full fallback payload applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. LP15-C01 full fallback reorder applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 12. LP15-C01 full fallback shrink applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 13. LP15-C01 full fallback null-shadow applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 14. LP15-C01 full fallback null-handle applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 15. LP15-C01 Open clears cache applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 16. LP15-C03 recover full/no-cache | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 17. LP15-C03 after recover full applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 18. LP15-C03 injected commit refusal discards cache | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 19. LP15-C03 after commit refusal full applied=2 expected=2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 20. LP15-C03 suffix exception discards cache | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 21. LP15-C03 after exception full applied=3 expected=3 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 22. LP15-C03 public poisoned entry discards cache | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 23. LP15-C03 after restored fixture full applied=3 expected=3 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 24. LP15-C04 exact byte charge boundary | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 25. LP15-C04 overflow charge rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 26. LP15-C04 8192 records admitted | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 27. LP15-C04 8193 records rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 28. LP15-C04 64MiB record charge admitted | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 29. LP15-C04 64MiB plus one rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 30. LP15-C03 changed candidate prime applied=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 31. LP15-C03 changed candidate suffix12 plus full candidate13 applied=25 expected=25 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 32. LP15-C03 changed candidate cache equals independent full projection | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 33. LP15-C03 compacted candidate prefix reused applied=0 expected=0 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 34. LP15-C03 forced projection mismatch discards cache | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 35. LP15-C04 overlimit prime applied=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 36. LP15-C04 existing cache ignored for oversized original applied=8193 expected=8193 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 37. LP15-C04 oversized candidate not retained | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 38. LP15-C04 next oversized checkpoint full applied=8193 expected=8193 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 39. CP01 actual Ready Complete shape canonical files reservation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 40. CP02 bounded two jobs over 1MiB canonical transitions | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 41. LP15-C02 bounded automatic checkpoint and whole transition measurement | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 42. LP15-C02 reopened full applied=18 expected=18 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 43. LP15-C02 actual unchanged prefix applied=0 expected=0 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 44. LP15-C02 actual suffix only applied=1 expected=1 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 45. LP15-C02 actual job shadow/full projection equality | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 46. LP15-C03 illegal Ready after Complete suffix rejected by cached/full paths | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 47. LP15-C04 peakRSS bytes=166543360 cap=536870912 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp18-context-catalog-01.txt

[원출력](lp18-context-catalog-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. journal open:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. fallback catalog open:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. SQLite off mode 표시 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. segment finalize journal+projection:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. fallback range query | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. event link FK 위반 거부 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. FK 위반 transaction/journal 전체 rollback | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. 최초 durable mutation 1개 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. 동일 mutation 중복 append | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. 손상 사이 정상 durable mutation 보존 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. 중간 corrupt line count | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 12. 마지막 truncated line skip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 13. fallback replay open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 14. 같은 mutation idempotent replay | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 15. 재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 16. 중복 replay row/합계 불증가 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 17. 추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 18. writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 19. v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 20. SQLite catalog open/rebuild:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 21. SQLite primary mode 표시 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 22. SQLite on/off range query ID·순서 parity | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 23. journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 24. journal 없는 손상 media orphan 구분 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 25. projection failover journal open:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 26. projection failover catalog open:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 27. 실제 SQLite INSERT 실패 trigger 설치 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 28. SQLite 투영 실패 뒤 journal+memory finalize 유지:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 29. SQLite 투영 실패 즉시 JSONL fallback 전환 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 30. 재시작 rebuild 전 실패 trigger 제거 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 31. 투영 실패 직후 in-memory query 정합성 유지 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 32. projection failover 재시작 journal rebuild:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 33. 재시작 후 journal에서 누락 SQLite projection 복구 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 34. 재시작 후 SQLite primary 복귀 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 35. 재시작 journal rebuild가 실제 SQLite row 복원 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 36. tombstone journal open:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 37. tombstone catalog open:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 38. tombstone 대상 segment finalize:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 39. tombstone 대상 deletion request:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 40. tombstone 완료 기록:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 41. catalog finalize가 tombstone segment ID 재사용을 거부해야 함 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 42. 손상 SQLite 격리 후 journal rebuild:  | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 43. 손상 SQLite 원본 격리 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 44. 격리 SQLite 파일 보존 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 45. 격리 후 journal rebuild 결과 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 46. S10-3A future-schema journal read open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 47. S10-3A future-schema unsupported classification | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 48. S10-3A future-schema catalog open denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 49. S10-3A future-schema catalog retry denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 50. S10-3A future-schema journal bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 51. S10-3A future-schema SQLite bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 52. S10-3A future-schema writer cleanup untouched | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 53. S10-3A arbitrary-schema journal read open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 54. S10-3A arbitrary-schema unsupported classification | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 55. S10-3A arbitrary-schema catalog open denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 56. S10-3A arbitrary-schema catalog retry denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 57. S10-3A arbitrary-schema journal bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 58. S10-3A arbitrary-schema SQLite bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 59. S10-3A arbitrary-schema writer cleanup untouched | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 60. S10-3A empty-schema journal read open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 61. S10-3A empty-schema unsupported classification | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 62. S10-3A empty-schema catalog open denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 63. S10-3A empty-schema catalog retry denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 64. S10-3A empty-schema journal bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 65. S10-3A empty-schema SQLite bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 66. S10-3A empty-schema writer cleanup untouched | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 67. S10-3A future-type journal read open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 68. S10-3A future-type unsupported classification | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 69. S10-3A future-type catalog open denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 70. S10-3A future-type catalog retry denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 71. S10-3A future-type journal bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 72. S10-3A future-type SQLite bytes preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 73. S10-3A future-type writer cleanup untouched | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 74. S10-3A malformed journal open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 75. S10-3A malformed JSON missing fields and wrong types remain corrupt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 76. S10-O01 reservation journal open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 77. S10-O01 first reservation returns four IDs and sequence one | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 78. S10-O01 versioned reservation payload replays | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 79. S10-O01 new reservation records actual occurred time | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 80. S10-O02 identical retry preserves sequence and bytes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 81. S10-O03 reopened instance allocates next sequence | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 82. S10-O03 new process resumes durable sequence | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 83. S10-O04 different store rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 84. S10-O04 reused request with different segment rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 85. S10-O04 reused request with different channel rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 86. S10-O04 reused segment with different request rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 87. S10-O04 conflicts preserve original bytes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 88. S10-O05/O06 reject and preserve corrupt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 89. S10-O05/O06 reject and preserve unsupported-schema | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 90. S10-O05/O06 reject and preserve unsupported-type | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 91. S10-O05/O06 reject and preserve tail | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 92. S10-O05/O06 reject and preserve payload-zero | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 93. S10-O05/O06 reject and preserve payload-negative | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 94. S10-O05/O06 reject and preserve payload-fraction | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 95. S10-O05/O06 reject and preserve payload-overflow | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 96. S10-O05/O06 reject and preserve duplicate-sequence | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 97. S10-O05/O06 reject and preserve decreasing-sequence | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 98. S10-O05/O06 reject and preserve duplicate-request | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 99. S10-O05/O06 reject and preserve duplicate-segment | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 100. S10-O05/O06 reject and preserve store-conflict | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 101. S10-O05/O06 reject and preserve ordinary-before | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 102. S10-O05/O06 reject and preserve ordinary-after | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 103. S10-O05/O06 reject and preserve line-cap | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 104. S10-O05 reservation entity envelope binding rejects mismatch | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 105. S10-O05 reservation request envelope binding rejects mismatch | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 106. S10-O01 strict reservation parser accepts versioned literal | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 107. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 108. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 109. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 110. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 111. S10-O06 INT64_MAX identical retry remains valid | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 112. S10-O06 sequence overflow rejected without write | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 113. S10-O02 identical durable reservation duplicates remain idempotent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 114. S10-O06 sequence gaps remain valid and allocate above maximum | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 115. S10-O07 four simultaneous processes finish reservations | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 116. S10-O07 concurrent sequences are unique and complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 117. S10-O07 next sequence follows concurrent reservations | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 118. S10-O08 ordinary Append cannot reserve orders | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 119. S10-O08 unopened journal rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 120. S10-O08 null result rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 121. S10-O08 invalid opaque ID rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 122. S10-O08 failed reservation does not expose tentative result | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 123. S10-O09 unsafe file binding rejected and original preserved inode | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 124. S10-O09 unsafe file binding rejected and original preserved parent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 125. S10-O09 unsafe file binding rejected and original preserved symlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 126. S10-O09 unsafe file binding rejected and original preserved hardlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 127. S10-O10 reservation and normal segment coexist in catalog | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 128. S10-O04 reserve then finalize permits identical retry | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 129. S10-O10 reservation survives catalog rebuild without changing segment query | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 130. S10-O04 legacy segment cannot acquire retroactive reservation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 131. S10-M06 opened catalog accepts fresh exact reservation V2 finalize | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 132. S10-M07 V2 find preserves complete metadata | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 133. S10-M07 identical V2 recovery is idempotent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 134. S10-M07 V2 is absent from V1 range query | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 135. S10-M07 V2 registered path is not orphan | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 136. S10-M07 SQLite exact V2 JSON and path match | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 137. S10-M07 JSONL restart preserves V2 exact payload | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 138. S10-M06 wrong reservation tuple rejected store | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 139. S10-M06 wrong reservation tuple rejected request | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 140. S10-M06 wrong reservation tuple rejected segment | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 141. S10-M06 wrong reservation tuple rejected channel | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 142. S10-M06 wrong reservation tuple rejected sequence | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 143. S10-M09 immutable V2 mapping mismatch rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 144. S10-M09 bad V2 startup retry preserves original state bad-payload | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 145. S10-M09 bad V2 startup retry preserves original state missing-order | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 146. S10-M09 bad V2 startup retry preserves original state bad-order | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 147. S10-M09 bad V2 startup retry preserves original state conflicting-order | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 148. S10-M09 bad V2 startup retry preserves original state tail | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 149. S10-M09 bad V2 startup retry preserves original state corrupt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 150. S10-M09 bad V2 startup retry preserves original state unsafe-path | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 151. S10-M09 default off rejects V2 before SQLite changes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 152. S10-M09 V2 replay namespace and deletion duplicate | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 153. S10-M09 V2 replay namespace and deletion deleted | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 154. S10-M09 V2 replay namespace and deletion v1-before | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 155. S10-M09 V2 replay namespace and deletion v1-after | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 156. S10-M09 V2 replay namespace and deletion deleted-before | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 157. S10-M09 V2 replay namespace and deletion resurrection | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 158. S10-M09 V2 replay namespace and deletion mutation-collision | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 159. S10-M09 V2 finalize rejects missing media | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 160. S10-M09 V2 finalize rejects directory media | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 161. S10-M09 fresh candidate rejects mapping | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 162. S10-M09 fresh candidate rejects path | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 163. S10-M09 fresh candidate rejects tombstone | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 164. S10-SW01 managed empty root opens with lifetime lease | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 165. S10-SW02 same process second managed owner denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 166. S10-SW03 different process owner and inherited use denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 167. S10-SW12 managed duplicate descriptors are close-on-exec | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 168. S10-SW05 managed reserve append replay use owned descriptor | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 169. S10-SW06 raw managed access and legacy default path denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 170. S10-SW01 managed Reserve rejects different store identity | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 171. S10-SW10 catalog connection can inspect managed lease | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 172. S10-SW04 owner destruction releases lease | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 173. S10-SW01 managed reopen rejects different store identity | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 174. S10-SW11 managed incomplete tail rejects append without changing bytes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 175. S10-SW07 legacy nonempty root preserved without conversion | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 176. S10-SW08 partial initialization retry validates exact state lease | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 177. S10-SW08 partial initialization retry validates exact state init | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 178. S10-SW08 partial initialization retry validates exact state barrier | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 179. S10-SW08 partial initialization retry validates exact state journal | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 180. S10-SW08 partial initialization retry validates exact state incomplete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 181. S10-SW08 partial initialization retry validates exact state unknown | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 182. S10-SW09 symlink inode and malformed marker rejected journal | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 183. S10-SW09 symlink inode and malformed marker rejected marker | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 184. S10-SW09 symlink inode and malformed marker rejected barrier | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 185. S10-SW09 symlink inode and malformed marker rejected root-symlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 186. S10-SB01 second managed catalog is denied | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 187. S10-SB02 failed catalog cannot mutate journal or holds | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 188. S10-SB03 attached catalog blocks unowned append but permits reservation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 189. S10-SB04 catalog destruction releases attachment | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 190. S10-SB05 managed catalog rejects unsafe options outside | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 191. S10-SB05 managed catalog rejects unsafe options dotdot | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 192. S10-SB05 managed catalog rejects unsafe options media-symlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 193. S10-SB05 managed catalog rejects unsafe options sqlite-symlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 194. S10-SB05 managed catalog rejects unsafe options sqlite-hardlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 195. S10-SB05 managed catalog rejects unsafe options disabled | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 196. S10-SB06 failed open releases catalog attachment | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 197. S10-SB07 managed SQLite sidecar rejected -wal symlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 198. S10-SB07 managed SQLite sidecar rejected -wal hardlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 199. S10-SB07 managed SQLite sidecar rejected -shm symlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 200. S10-SB07 managed SQLite sidecar rejected -shm hardlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 201. S10-SB07 managed SQLite sidecar rejected -journal symlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 202. S10-SB07 managed SQLite sidecar rejected -journal hardlink | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 203. S10-SC01 managed repeated event fixture is valid | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 204. S10-SC02 managed reservations avoid history reads | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 205. S10-SC03 managed V2 finalize avoids full replay | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 206. S10-SC04 checkpoint reduces superseded event payload bytes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 207. S10-SC05 checkpoint preserves latest event and all record identities | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 208. S10-SC06 checkpoint is idempotent and preserves V2 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 209. S10-SC08 receipt preserves retry identity and rejects direct append | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 210. S10-SC09 checkpoint restart preserves SQLite and JSONL state sqlite | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 211. S10-SC09 managed checkpoint SQL V2 payload and path | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 212. S10-SC09 checkpoint restart preserves SQLite and JSONL state jsonl | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 213. S10-SC10 checkpoint prefix recovers before writes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 214. S10-SC11 checkpoint mismatch preserves bytes and poisons owner | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 215. S10-SC12 first accepted mutation controls latest event | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 216. S10-SC16 automatic checkpoint uses accumulated growth | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 217. S10-SC07 raw checkpoint is rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 218. S10-SC18 checkpoint syscall failure poisons and reopens write | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 219. S10-SC21 poison rejects hold mutation write | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 220. S10-SC18 checkpoint syscall failure poisons and reopens file-fsync | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 221. S10-SC21 poison rejects hold mutation file-fsync | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 222. S10-SC18 checkpoint syscall failure poisons and reopens rename | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 223. S10-SC21 poison rejects hold mutation rename | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 224. S10-SC18 checkpoint syscall failure poisons and reopens dir-fsync | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 225. S10-SC21 poison rejects hold mutation dir-fsync | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 226. S10-SC17 checkpoint preserves holds observations and deletion | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 227. S10-SC17 checkpoint SQL hold observation tombstone | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 228. S10-SC17 checkpoint preserves holds observations and deletion restart sqlite | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 229. S10-SC17 checkpoint SQL restart observation tombstone | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 230. S10-SC17 checkpoint preserves holds observations and deletion restart jsonl | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 231. S10-SC19 invalid managed history remains unchanged malformed | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 232. S10-SC19 invalid managed history remains unchanged unsupported | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 233. S10-SC19 invalid managed history remains unchanged conflict | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 234. S10-SC20 raw catalog rejects receipt before side effects | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 235. S10-SC13 crypto off raw remains usable | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 236. S10-SC14 crypto off checkpoint is rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 237. S10-SC15 crypto off receipt reopen is rejected | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 238. source 저장 callback reconcile 연결 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 239. policy revision idempotency | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 240. 5초 safety reconcile | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 241. composition root 관리 저장소 선행 open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 242. composition helper journal 다음 catalog rebuild/open | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 243. 서버 전 supervisor 시작 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 244. ingress 전 event bridge 등록 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 245. ingress 종료 뒤 recorder finalize | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 246. composition root 시작/종료 순서 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

### lp17-jobs-lp18-context-01.txt

[원출력](lp17-jobs-lp18-context-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. FC01 exact insertion checks count=97 | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 2. D08.input-keyframes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 3. D08.source-shape | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 4. D08.selection-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 5. D08.expected-intent-built | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 6. D08.admission | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 7. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 8. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 9. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 10. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 11. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 12. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 13. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 14. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 15. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 16. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 17. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 18. D08.ready-verified-proof | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 19. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 20. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 21. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 22. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 23. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 24. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 25. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 26. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 27. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 28. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 29. D08.protection-released | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 30. D08.run-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 31. D08.actual-output-hash | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 32. D08.selection-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 33. D08.expected-intent-built | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 34. D08.admission | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 35. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 36. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 37. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 38. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 39. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 40. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 41. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 42. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 43. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 44. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 45. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 46. D08.ready-verified-proof | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 47. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 48. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 49. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 50. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 51. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 52. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 53. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 54. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 55. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 56. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 57. D08.protection-released | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 58. D08.run-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 59. D08.actual-output-hash | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 60. CP01.actual-ready-complete-shape-canonical-files-reservation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 61. CP02.two-jobs-over-1MiB-canonical-transitions | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 62. D08.input-keyframes | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 63. D08.source-shape | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 64. D08.selection-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 65. D08.expected-intent-built | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 66. D08.admission | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 67. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 68. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 69. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 70. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 71. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 72. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 73. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 74. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 75. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 76. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 77. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 78. D08.ready-verified-proof | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 79. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 80. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 81. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 82. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 83. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 84. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 85. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 86. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 87. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 88. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 89. D08.protection-released | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 90. D08.run-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 91. D08.actual-output-hash | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 92. D08.selection-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 93. D08.expected-intent-built | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 94. D08.admission | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 95. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 96. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 97. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 98. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 99. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 100. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 101. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 102. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 103. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 104. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 105. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 106. D08.ready-verified-proof | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 107. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 108. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 109. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 110. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 111. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 112. D08.expected-state | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 113. D08.canonical-intent | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 114. D08.files-receipt | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 115. D08.canonical-record-roundtrip | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 116. D08.canonical-ready-preserved | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 117. D08.protection-released | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 118. D08.run-complete | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 119. D08.actual-output-hash | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 120. CP01.actual-ready-complete-shape-canonical-files-reservation | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |
| 121. CP02.two-jobs-over-1MiB-canonical-transitions | 실제 assertion | PASS | 명령·source·정리·한계는 중앙 기록 및 원출력 |

## Envelope 중복 생성 제거: 최초 실패·수정·검증

첫 RED의 oracle 오류와 재검증/최종 GREEN을 각각 보존한다. 실제 HTTP·장시간/UI 판정이 아니다.

### lp18-ownership-red-envelope-cost-01.txt

[원출력](lp18-ownership-red-envelope-cost-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-E01 independent value and owned sequences compare equal | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 2. LP18-E01 full field mismatch rejected schema | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 3. LP18-E01 full field mismatch rejected type | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 4. LP18-E01 full field mismatch rejected id | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 5. LP18-E01 full field mismatch rejected entity | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 6. LP18-E01 full field mismatch rejected time | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 7. LP18-E01 full field mismatch rejected payload | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 8. LP18-E01 sequence order remains significant | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 9. LP18-E01 sequence count remains significant | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 10. LP18-E01 null on either side remains rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 11. LP18-E01 identical invalid schema retains comparison result | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 12. LP18-E01 identical invalid enum retains comparison result | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 13. LP18-E01 enum canonical collision remains rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 14. LP18-E01 escape and control bytes retain exact comparison | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 15. LP18-E01 int64 boundaries retain exact comparison | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 16. LP18-E01 payload whitespace remains significant | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 17. LP18-E02 SameSequence performs zero envelope serializations | 실제 assertion | FAIL | 최초 실패 보존·해석은 중앙 기록 |
| 18. LP18-E03 receipt candidate preparation preserves original bytes | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 19. LP18-E04 CommitCheckpoint builds JournalBytes exactly once | 실제 assertion | FAIL | 최초 실패 보존·해석은 중앙 기록 |
| 20. LP18-E03 independent candidate publishes exact bytes and preserves prior owner | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 21. LP18-E03 compacted bytes retain independent full projection | 실제 assertion | FAIL | 최초 실패 보존·해석은 중앙 기록 |
| 22. LP18-E03 invalid candidate rejected before byte building schema | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 23. LP18-E03 invalid candidate rejected before byte building type | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 24. LP18-E03 invalid candidate rejected before byte building id | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 25. LP18-E03 invalid candidate rejected before byte building entity | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 26. LP18-E03 invalid candidate rejected before byte building time | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 27. LP18-E03 invalid candidate rejected before byte building payload | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 28. LP18-E03 invalid candidate rejected before byte building order | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 29. LP18-E03 invalid candidate rejected before byte building count | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 30. LP18-E03 invalid candidate rejected before byte building null | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |

개별 assertion 30행 대조. 명령·elapsed·source·cleanup은 원출력 및 중앙 기록을 따른다.

### lp18-ownership-red-envelope-cost-02.txt

[원출력](lp18-ownership-red-envelope-cost-02.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-E01 independent value and owned sequences compare equal | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 2. LP18-E01 full field mismatch rejected schema | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 3. LP18-E01 full field mismatch rejected type | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 4. LP18-E01 full field mismatch rejected id | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 5. LP18-E01 full field mismatch rejected entity | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 6. LP18-E01 full field mismatch rejected time | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 7. LP18-E01 full field mismatch rejected payload | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 8. LP18-E01 sequence order remains significant | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 9. LP18-E01 sequence count remains significant | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 10. LP18-E01 null on either side remains rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 11. LP18-E01 identical invalid schema retains comparison result | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 12. LP18-E01 identical invalid enum retains comparison result | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 13. LP18-E01 enum canonical collision remains rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 14. LP18-E01 escape and control bytes retain exact comparison | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 15. LP18-E01 int64 boundaries retain exact comparison | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 16. LP18-E01 payload whitespace remains significant | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 17. LP18-E02 SameSequence performs zero envelope serializations | 실제 assertion | FAIL | 최초 실패 보존·해석은 중앙 기록 |
| 18. LP18-E03 receipt candidate preparation preserves original bytes | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 19. LP18-E04 CommitCheckpoint builds JournalBytes exactly once | 실제 assertion | FAIL | 최초 실패 보존·해석은 중앙 기록 |
| 20. LP18-E03 independent candidate publishes exact bytes and preserves prior owner | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 21. LP18-E03 compacted bytes retain independent full projection | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 22. LP18-E03 invalid candidate rejected before byte building schema | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 23. LP18-E03 invalid candidate rejected before byte building type | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 24. LP18-E03 invalid candidate rejected before byte building id | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 25. LP18-E03 invalid candidate rejected before byte building entity | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 26. LP18-E03 invalid candidate rejected before byte building time | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 27. LP18-E03 invalid candidate rejected before byte building payload | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 28. LP18-E03 invalid candidate rejected before byte building order | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 29. LP18-E03 invalid candidate rejected before byte building count | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 30. LP18-E03 invalid candidate rejected before byte building null | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |

개별 assertion 30행 대조. 명령·elapsed·source·cleanup은 원출력 및 중앙 기록을 따른다.

### lp18-ownership-green-envelope-cost-01.txt

[원출력](lp18-ownership-green-envelope-cost-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-E01 independent value and owned sequences compare equal | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 2. LP18-E01 full field mismatch rejected schema | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 3. LP18-E01 full field mismatch rejected type | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 4. LP18-E01 full field mismatch rejected id | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 5. LP18-E01 full field mismatch rejected entity | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 6. LP18-E01 full field mismatch rejected time | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 7. LP18-E01 full field mismatch rejected payload | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 8. LP18-E01 sequence order remains significant | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 9. LP18-E01 sequence count remains significant | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 10. LP18-E01 null on either side remains rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 11. LP18-E01 identical invalid schema retains comparison result | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 12. LP18-E01 identical invalid enum retains comparison result | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 13. LP18-E01 enum canonical collision remains rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 14. LP18-E01 escape and control bytes retain exact comparison | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 15. LP18-E01 int64 boundaries retain exact comparison | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 16. LP18-E01 payload whitespace remains significant | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 17. LP18-E02 SameSequence performs zero envelope serializations | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 18. LP18-E03 receipt candidate preparation preserves original bytes | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 19. LP18-E04 CommitCheckpoint builds JournalBytes exactly once | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 20. LP18-E03 independent candidate publishes exact bytes and preserves prior owner | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 21. LP18-E03 compacted bytes retain independent full projection | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 22. LP18-E03 invalid candidate rejected before byte building schema | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 23. LP18-E03 invalid candidate rejected before byte building type | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 24. LP18-E03 invalid candidate rejected before byte building id | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 25. LP18-E03 invalid candidate rejected before byte building entity | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 26. LP18-E03 invalid candidate rejected before byte building time | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 27. LP18-E03 invalid candidate rejected before byte building payload | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 28. LP18-E03 invalid candidate rejected before byte building order | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 29. LP18-E03 invalid candidate rejected before byte building count | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 30. LP18-E03 invalid candidate rejected before byte building null | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |

개별 assertion 30행 대조. 명령·elapsed·source·cleanup은 원출력 및 중앙 기록을 따른다.

### lp18-ownership-green-envelope-compat-01.txt

[원출력](lp18-ownership-green-envelope-compat-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-O01 owner checked read view shares journal envelope | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 2. LP18-O01 shared journal original candidate envelopes | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 3. LP18-O01 public Replay value mutation remains isolated | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 4. LP18-O01 retained prefix shares journal envelope | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 5. LP18-O01 full canonical and projection oracle | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 6. LP18-O03 stale candidate after reservation rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 7. LP18-O03 foreign owner candidate rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 8. LP18-O04 exact field order or prefix mutation rejected schema | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 9. LP18-O04 standalone candidate fields rejected without disk change schema | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 10. LP18-O04 exact field order or prefix mutation rejected type | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 11. LP18-O04 standalone candidate fields rejected without disk change type | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 12. LP18-O04 exact field order or prefix mutation rejected id | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 13. LP18-O04 standalone candidate fields rejected without disk change id | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 14. LP18-O04 exact field order or prefix mutation rejected entity | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 15. LP18-O04 standalone candidate fields rejected without disk change entity | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 16. LP18-O04 exact field order or prefix mutation rejected time | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 17. LP18-O04 standalone candidate fields rejected without disk change time | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 18. LP18-O04 exact field order or prefix mutation rejected payload | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 19. LP18-O04 standalone candidate fields rejected without disk change payload | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 20. LP18-O04 exact field order or prefix mutation rejected reorder | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 21. LP18-O04 standalone candidate fields rejected without disk change reorder | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 22. LP18-O04 exact field order or prefix mutation rejected shrink | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 23. LP18-O04 standalone candidate fields rejected without disk change shrink | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 24. LP18-O04 null envelope safely rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 25. LP18-O02 only transformed receipts own new envelopes | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 26. LP18-O02 prepared receipts preserve original canonical bytes | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 27. LP18-O02 publication bytes and prior owned snapshot remain exact | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 28. LP18-O02 published journal and prefix share transformed receipt envelopes | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 29. LP18-O02 receipt independent full projection equality | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 30. LP18-O03 stale candidate after ordinary append rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 31. LP18-O05 8192 logical records admitted | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 32. LP18-O05 8193 aliases still rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 33. LP18-O05 64MiB logical bytes admitted | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 34. LP18-O05 64MiB plus one rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |

개별 assertion 34행 대조. 명령·elapsed·source·cleanup은 원출력 및 중앙 기록을 따른다.

### lp18-envelope-identity-01.txt

[원출력](lp18-envelope-identity-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. CP06 exact canonical sequence equality | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 2. CP06 same length different payload rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 3. CP06 reordered sequence rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 4. CP06 different count rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 5. CP06 different schema despite canonical equality rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 6. CP06 different enum despite canonical equality rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |

개별 assertion 6행 대조. 명령·elapsed·source·cleanup은 원출력 및 중앙 기록을 따른다.

### lp18-envelope-cache-01.txt

[원출력](lp18-envelope-cache-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP15-C01 cold full applied=1 expected=1 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 2. LP15-C01 unchanged prefix applied=0 expected=0 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 3. LP15-C01 exact prefix suffix only applied=1 expected=1 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 4. LP15-C01 independent prefix shadow/full projection equality | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 5. LP15-C01 full fallback schema applied=2 expected=2 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 6. LP15-C01 full fallback type applied=2 expected=2 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 7. LP15-C01 full fallback id applied=2 expected=2 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 8. LP15-C01 full fallback entity applied=2 expected=2 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 9. LP15-C01 full fallback time applied=2 expected=2 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 10. LP15-C01 full fallback payload applied=2 expected=2 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 11. LP15-C01 full fallback reorder applied=2 expected=2 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 12. LP15-C01 full fallback shrink applied=2 expected=2 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 13. LP15-C01 full fallback null-shadow applied=2 expected=2 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 14. LP15-C01 full fallback null-handle applied=2 expected=2 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 15. LP15-C01 Open clears cache applied=2 expected=2 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 16. LP15-C03 recover full/no-cache | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 17. LP15-C03 after recover full applied=2 expected=2 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 18. LP15-C03 injected commit refusal discards cache | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 19. LP15-C03 after commit refusal full applied=2 expected=2 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 20. LP15-C03 suffix exception discards cache | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 21. LP15-C03 after exception full applied=3 expected=3 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 22. LP15-C03 public poisoned entry discards cache | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 23. LP15-C03 after restored fixture full applied=3 expected=3 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 24. LP15-C04 exact byte charge boundary | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 25. LP15-C04 overflow charge rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 26. LP15-C04 8192 records admitted | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 27. LP15-C04 8193 records rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 28. LP15-C04 64MiB record charge admitted | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 29. LP15-C04 64MiB plus one rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 30. LP15-C03 changed candidate prime applied=1 expected=1 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 31. LP15-C03 changed candidate suffix12 plus full candidate13 applied=25 expected=25 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 32. LP15-C03 changed candidate cache equals independent full projection | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 33. LP15-C03 compacted candidate prefix reused applied=0 expected=0 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 34. LP15-C03 forced projection mismatch discards cache | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 35. LP15-C04 overlimit prime applied=1 expected=1 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 36. LP15-C04 existing cache ignored for oversized original applied=8193 expected=8193 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 37. LP15-C04 oversized candidate not retained | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 38. LP15-C04 next oversized checkpoint full applied=8193 expected=8193 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 39. CP01 actual Ready Complete shape canonical files reservation | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 40. CP02 bounded two jobs over 1MiB canonical transitions | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 41. LP15-C02 bounded automatic checkpoint and whole transition measurement | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 42. LP15-C02 reopened full applied=18 expected=18 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 43. LP15-C02 actual unchanged prefix applied=0 expected=0 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 44. LP15-C02 actual suffix only applied=1 expected=1 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 45. LP15-C02 actual job shadow/full projection equality | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 46. LP15-C03 illegal Ready after Complete suffix rejected by cached/full paths | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 47. LP15-C04 peakRSS bytes=167329792 cap=536870912 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |

개별 assertion 47행 대조. 명령·elapsed·source·cleanup은 원출력 및 중앙 기록을 따른다.

### lp18-envelope-catalog-01.txt

[원출력](lp18-envelope-catalog-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. journal open:  | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 2. fallback catalog open:  | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 3. SQLite off mode 표시 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 4. segment finalize journal+projection:  | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 5. fallback range query | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 6. event link FK 위반 거부 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 7. FK 위반 transaction/journal 전체 rollback | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 8. 최초 durable mutation 1개 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 9. 동일 mutation 중복 append | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 10. 손상 사이 정상 durable mutation 보존 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 11. 중간 corrupt line count | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 12. 마지막 truncated line skip | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 13. fallback replay open | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 14. 같은 mutation idempotent replay | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 15. 재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 16. 중복 replay row/합계 불증가 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 17. 추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구:  | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 18. writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 19. v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 20. SQLite catalog open/rebuild:  | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 21. SQLite primary mode 표시 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 22. SQLite on/off range query ID·순서 parity | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 23. journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 24. journal 없는 손상 media orphan 구분 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 25. projection failover journal open:  | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 26. projection failover catalog open:  | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 27. 실제 SQLite INSERT 실패 trigger 설치 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 28. SQLite 투영 실패 뒤 journal+memory finalize 유지:  | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 29. SQLite 투영 실패 즉시 JSONL fallback 전환 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 30. 재시작 rebuild 전 실패 trigger 제거 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 31. 투영 실패 직후 in-memory query 정합성 유지 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 32. projection failover 재시작 journal rebuild:  | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 33. 재시작 후 journal에서 누락 SQLite projection 복구 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 34. 재시작 후 SQLite primary 복귀 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 35. 재시작 journal rebuild가 실제 SQLite row 복원 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 36. tombstone journal open:  | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 37. tombstone catalog open:  | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 38. tombstone 대상 segment finalize:  | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 39. tombstone 대상 deletion request:  | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 40. tombstone 완료 기록:  | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 41. catalog finalize가 tombstone segment ID 재사용을 거부해야 함 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 42. 손상 SQLite 격리 후 journal rebuild:  | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 43. 손상 SQLite 원본 격리 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 44. 격리 SQLite 파일 보존 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 45. 격리 후 journal rebuild 결과 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 46. S10-3A future-schema journal read open | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 47. S10-3A future-schema unsupported classification | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 48. S10-3A future-schema catalog open denied | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 49. S10-3A future-schema catalog retry denied | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 50. S10-3A future-schema journal bytes preserved | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 51. S10-3A future-schema SQLite bytes preserved | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 52. S10-3A future-schema writer cleanup untouched | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 53. S10-3A arbitrary-schema journal read open | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 54. S10-3A arbitrary-schema unsupported classification | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 55. S10-3A arbitrary-schema catalog open denied | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 56. S10-3A arbitrary-schema catalog retry denied | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 57. S10-3A arbitrary-schema journal bytes preserved | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 58. S10-3A arbitrary-schema SQLite bytes preserved | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 59. S10-3A arbitrary-schema writer cleanup untouched | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 60. S10-3A empty-schema journal read open | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 61. S10-3A empty-schema unsupported classification | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 62. S10-3A empty-schema catalog open denied | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 63. S10-3A empty-schema catalog retry denied | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 64. S10-3A empty-schema journal bytes preserved | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 65. S10-3A empty-schema SQLite bytes preserved | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 66. S10-3A empty-schema writer cleanup untouched | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 67. S10-3A future-type journal read open | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 68. S10-3A future-type unsupported classification | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 69. S10-3A future-type catalog open denied | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 70. S10-3A future-type catalog retry denied | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 71. S10-3A future-type journal bytes preserved | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 72. S10-3A future-type SQLite bytes preserved | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 73. S10-3A future-type writer cleanup untouched | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 74. S10-3A malformed journal open | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 75. S10-3A malformed JSON missing fields and wrong types remain corrupt | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 76. S10-O01 reservation journal open | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 77. S10-O01 first reservation returns four IDs and sequence one | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 78. S10-O01 versioned reservation payload replays | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 79. S10-O01 new reservation records actual occurred time | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 80. S10-O02 identical retry preserves sequence and bytes | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 81. S10-O03 reopened instance allocates next sequence | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 82. S10-O03 new process resumes durable sequence | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 83. S10-O04 different store rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 84. S10-O04 reused request with different segment rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 85. S10-O04 reused request with different channel rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 86. S10-O04 reused segment with different request rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 87. S10-O04 conflicts preserve original bytes | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 88. S10-O05/O06 reject and preserve corrupt | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 89. S10-O05/O06 reject and preserve unsupported-schema | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 90. S10-O05/O06 reject and preserve unsupported-type | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 91. S10-O05/O06 reject and preserve tail | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 92. S10-O05/O06 reject and preserve payload-zero | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 93. S10-O05/O06 reject and preserve payload-negative | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 94. S10-O05/O06 reject and preserve payload-fraction | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 95. S10-O05/O06 reject and preserve payload-overflow | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 96. S10-O05/O06 reject and preserve duplicate-sequence | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 97. S10-O05/O06 reject and preserve decreasing-sequence | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 98. S10-O05/O06 reject and preserve duplicate-request | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 99. S10-O05/O06 reject and preserve duplicate-segment | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 100. S10-O05/O06 reject and preserve store-conflict | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 101. S10-O05/O06 reject and preserve ordinary-before | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 102. S10-O05/O06 reject and preserve ordinary-after | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 103. S10-O05/O06 reject and preserve line-cap | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 104. S10-O05 reservation entity envelope binding rejects mismatch | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 105. S10-O05 reservation request envelope binding rejects mismatch | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 106. S10-O01 strict reservation parser accepts versioned literal | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 107. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 108. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 109. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 110. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 111. S10-O06 INT64_MAX identical retry remains valid | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 112. S10-O06 sequence overflow rejected without write | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 113. S10-O02 identical durable reservation duplicates remain idempotent | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 114. S10-O06 sequence gaps remain valid and allocate above maximum | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 115. S10-O07 four simultaneous processes finish reservations | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 116. S10-O07 concurrent sequences are unique and complete | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 117. S10-O07 next sequence follows concurrent reservations | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 118. S10-O08 ordinary Append cannot reserve orders | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 119. S10-O08 unopened journal rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 120. S10-O08 null result rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 121. S10-O08 invalid opaque ID rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 122. S10-O08 failed reservation does not expose tentative result | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 123. S10-O09 unsafe file binding rejected and original preserved inode | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 124. S10-O09 unsafe file binding rejected and original preserved parent | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 125. S10-O09 unsafe file binding rejected and original preserved symlink | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 126. S10-O09 unsafe file binding rejected and original preserved hardlink | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 127. S10-O10 reservation and normal segment coexist in catalog | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 128. S10-O04 reserve then finalize permits identical retry | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 129. S10-O10 reservation survives catalog rebuild without changing segment query | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 130. S10-O04 legacy segment cannot acquire retroactive reservation | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 131. S10-M06 opened catalog accepts fresh exact reservation V2 finalize | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 132. S10-M07 V2 find preserves complete metadata | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 133. S10-M07 identical V2 recovery is idempotent | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 134. S10-M07 V2 is absent from V1 range query | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 135. S10-M07 V2 registered path is not orphan | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 136. S10-M07 SQLite exact V2 JSON and path match | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 137. S10-M07 JSONL restart preserves V2 exact payload | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 138. S10-M06 wrong reservation tuple rejected store | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 139. S10-M06 wrong reservation tuple rejected request | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 140. S10-M06 wrong reservation tuple rejected segment | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 141. S10-M06 wrong reservation tuple rejected channel | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 142. S10-M06 wrong reservation tuple rejected sequence | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 143. S10-M09 immutable V2 mapping mismatch rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 144. S10-M09 bad V2 startup retry preserves original state bad-payload | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 145. S10-M09 bad V2 startup retry preserves original state missing-order | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 146. S10-M09 bad V2 startup retry preserves original state bad-order | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 147. S10-M09 bad V2 startup retry preserves original state conflicting-order | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 148. S10-M09 bad V2 startup retry preserves original state tail | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 149. S10-M09 bad V2 startup retry preserves original state corrupt | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 150. S10-M09 bad V2 startup retry preserves original state unsafe-path | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 151. S10-M09 default off rejects V2 before SQLite changes | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 152. S10-M09 V2 replay namespace and deletion duplicate | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 153. S10-M09 V2 replay namespace and deletion deleted | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 154. S10-M09 V2 replay namespace and deletion v1-before | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 155. S10-M09 V2 replay namespace and deletion v1-after | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 156. S10-M09 V2 replay namespace and deletion deleted-before | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 157. S10-M09 V2 replay namespace and deletion resurrection | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 158. S10-M09 V2 replay namespace and deletion mutation-collision | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 159. S10-M09 V2 finalize rejects missing media | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 160. S10-M09 V2 finalize rejects directory media | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 161. S10-M09 fresh candidate rejects mapping | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 162. S10-M09 fresh candidate rejects path | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 163. S10-M09 fresh candidate rejects tombstone | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 164. S10-SW01 managed empty root opens with lifetime lease | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 165. S10-SW02 same process second managed owner denied | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 166. S10-SW03 different process owner and inherited use denied | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 167. S10-SW12 managed duplicate descriptors are close-on-exec | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 168. S10-SW05 managed reserve append replay use owned descriptor | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 169. S10-SW06 raw managed access and legacy default path denied | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 170. S10-SW01 managed Reserve rejects different store identity | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 171. S10-SW10 catalog connection can inspect managed lease | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 172. S10-SW04 owner destruction releases lease | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 173. S10-SW01 managed reopen rejects different store identity | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 174. S10-SW11 managed incomplete tail rejects append without changing bytes | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 175. S10-SW07 legacy nonempty root preserved without conversion | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 176. S10-SW08 partial initialization retry validates exact state lease | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 177. S10-SW08 partial initialization retry validates exact state init | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 178. S10-SW08 partial initialization retry validates exact state barrier | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 179. S10-SW08 partial initialization retry validates exact state journal | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 180. S10-SW08 partial initialization retry validates exact state incomplete | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 181. S10-SW08 partial initialization retry validates exact state unknown | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 182. S10-SW09 symlink inode and malformed marker rejected journal | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 183. S10-SW09 symlink inode and malformed marker rejected marker | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 184. S10-SW09 symlink inode and malformed marker rejected barrier | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 185. S10-SW09 symlink inode and malformed marker rejected root-symlink | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 186. S10-SB01 second managed catalog is denied | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 187. S10-SB02 failed catalog cannot mutate journal or holds | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 188. S10-SB03 attached catalog blocks unowned append but permits reservation | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 189. S10-SB04 catalog destruction releases attachment | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 190. S10-SB05 managed catalog rejects unsafe options outside | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 191. S10-SB05 managed catalog rejects unsafe options dotdot | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 192. S10-SB05 managed catalog rejects unsafe options media-symlink | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 193. S10-SB05 managed catalog rejects unsafe options sqlite-symlink | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 194. S10-SB05 managed catalog rejects unsafe options sqlite-hardlink | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 195. S10-SB05 managed catalog rejects unsafe options disabled | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 196. S10-SB06 failed open releases catalog attachment | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 197. S10-SB07 managed SQLite sidecar rejected -wal symlink | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 198. S10-SB07 managed SQLite sidecar rejected -wal hardlink | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 199. S10-SB07 managed SQLite sidecar rejected -shm symlink | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 200. S10-SB07 managed SQLite sidecar rejected -shm hardlink | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 201. S10-SB07 managed SQLite sidecar rejected -journal symlink | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 202. S10-SB07 managed SQLite sidecar rejected -journal hardlink | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 203. S10-SC01 managed repeated event fixture is valid | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 204. S10-SC02 managed reservations avoid history reads | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 205. S10-SC03 managed V2 finalize avoids full replay | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 206. S10-SC04 checkpoint reduces superseded event payload bytes | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 207. S10-SC05 checkpoint preserves latest event and all record identities | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 208. S10-SC06 checkpoint is idempotent and preserves V2 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 209. S10-SC08 receipt preserves retry identity and rejects direct append | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 210. S10-SC09 checkpoint restart preserves SQLite and JSONL state sqlite | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 211. S10-SC09 managed checkpoint SQL V2 payload and path | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 212. S10-SC09 checkpoint restart preserves SQLite and JSONL state jsonl | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 213. S10-SC10 checkpoint prefix recovers before writes | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 214. S10-SC11 checkpoint mismatch preserves bytes and poisons owner | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 215. S10-SC12 first accepted mutation controls latest event | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 216. S10-SC16 automatic checkpoint uses accumulated growth | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 217. S10-SC07 raw checkpoint is rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 218. S10-SC18 checkpoint syscall failure poisons and reopens write | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 219. S10-SC21 poison rejects hold mutation write | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 220. S10-SC18 checkpoint syscall failure poisons and reopens file-fsync | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 221. S10-SC21 poison rejects hold mutation file-fsync | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 222. S10-SC18 checkpoint syscall failure poisons and reopens rename | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 223. S10-SC21 poison rejects hold mutation rename | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 224. S10-SC18 checkpoint syscall failure poisons and reopens dir-fsync | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 225. S10-SC21 poison rejects hold mutation dir-fsync | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 226. S10-SC17 checkpoint preserves holds observations and deletion | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 227. S10-SC17 checkpoint SQL hold observation tombstone | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 228. S10-SC17 checkpoint preserves holds observations and deletion restart sqlite | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 229. S10-SC17 checkpoint SQL restart observation tombstone | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 230. S10-SC17 checkpoint preserves holds observations and deletion restart jsonl | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 231. S10-SC19 invalid managed history remains unchanged malformed | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 232. S10-SC19 invalid managed history remains unchanged unsupported | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 233. S10-SC19 invalid managed history remains unchanged conflict | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 234. S10-SC20 raw catalog rejects receipt before side effects | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 235. S10-SC13 crypto off raw remains usable | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 236. S10-SC14 crypto off checkpoint is rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 237. S10-SC15 crypto off receipt reopen is rejected | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 238. source 저장 callback reconcile 연결 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 239. policy revision idempotency | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 240. 5초 safety reconcile | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 241. composition root 관리 저장소 선행 open | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 242. composition helper journal 다음 catalog rebuild/open | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 243. 서버 전 supervisor 시작 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 244. ingress 전 event bridge 등록 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 245. ingress 종료 뒤 recorder finalize | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |
| 246. composition root 시작/종료 순서 | 실제 assertion | PASS | 최초 실패 보존·해석은 중앙 기록 |

개별 assertion 246행 대조. 명령·elapsed·source·cleanup은 원출력 및 중앙 기록을 따른다.

### lp17-jobs-lp18-envelope-01.txt

[원출력](lp17-jobs-lp18-envelope-01.txt) — B/C 캐시 on/off, 기능120/계측1. 구·신코드 개선율 또는 실제 HTTP 판정이 아님.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. FC01 exact insertion checks count=97 | 실제 assertion | PASS | 원출력 순서 |
| 2. D08.input-keyframes | 실제 assertion | PASS | 원출력 순서 |
| 3. D08.source-shape | 실제 assertion | PASS | 원출력 순서 |
| 4. D08.selection-complete | 실제 assertion | PASS | 원출력 순서 |
| 5. D08.expected-intent-built | 실제 assertion | PASS | 원출력 순서 |
| 6. D08.admission | 실제 assertion | PASS | 원출력 순서 |
| 7. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 8. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 9. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 10. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 11. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 12. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 13. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 14. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 15. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 16. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 17. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 18. D08.ready-verified-proof | 실제 assertion | PASS | 원출력 순서 |
| 19. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 20. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 21. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 22. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 23. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 순서 |
| 24. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 25. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 26. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 27. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 28. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 순서 |
| 29. D08.protection-released | 실제 assertion | PASS | 원출력 순서 |
| 30. D08.run-complete | 실제 assertion | PASS | 원출력 순서 |
| 31. D08.actual-output-hash | 실제 assertion | PASS | 원출력 순서 |
| 32. D08.selection-complete | 실제 assertion | PASS | 원출력 순서 |
| 33. D08.expected-intent-built | 실제 assertion | PASS | 원출력 순서 |
| 34. D08.admission | 실제 assertion | PASS | 원출력 순서 |
| 35. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 36. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 37. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 38. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 39. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 40. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 41. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 42. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 43. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 44. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 45. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 46. D08.ready-verified-proof | 실제 assertion | PASS | 원출력 순서 |
| 47. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 48. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 49. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 50. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 51. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 순서 |
| 52. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 53. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 54. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 55. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 56. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 순서 |
| 57. D08.protection-released | 실제 assertion | PASS | 원출력 순서 |
| 58. D08.run-complete | 실제 assertion | PASS | 원출력 순서 |
| 59. D08.actual-output-hash | 실제 assertion | PASS | 원출력 순서 |
| 60. CP01.actual-ready-complete-shape-canonical-files-reservation | 실제 assertion | PASS | 원출력 순서 |
| 61. CP02.two-jobs-over-1MiB-canonical-transitions | 실제 assertion | PASS | 원출력 순서 |
| 62. D08.input-keyframes | 실제 assertion | PASS | 원출력 순서 |
| 63. D08.source-shape | 실제 assertion | PASS | 원출력 순서 |
| 64. D08.selection-complete | 실제 assertion | PASS | 원출력 순서 |
| 65. D08.expected-intent-built | 실제 assertion | PASS | 원출력 순서 |
| 66. D08.admission | 실제 assertion | PASS | 원출력 순서 |
| 67. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 68. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 69. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 70. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 71. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 72. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 73. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 74. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 75. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 76. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 77. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 78. D08.ready-verified-proof | 실제 assertion | PASS | 원출력 순서 |
| 79. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 80. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 81. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 82. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 83. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 순서 |
| 84. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 85. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 86. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 87. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 88. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 순서 |
| 89. D08.protection-released | 실제 assertion | PASS | 원출력 순서 |
| 90. D08.run-complete | 실제 assertion | PASS | 원출력 순서 |
| 91. D08.actual-output-hash | 실제 assertion | PASS | 원출력 순서 |
| 92. D08.selection-complete | 실제 assertion | PASS | 원출력 순서 |
| 93. D08.expected-intent-built | 실제 assertion | PASS | 원출력 순서 |
| 94. D08.admission | 실제 assertion | PASS | 원출력 순서 |
| 95. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 96. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 97. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 98. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 99. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 100. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 101. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 102. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 103. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 104. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 105. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 106. D08.ready-verified-proof | 실제 assertion | PASS | 원출력 순서 |
| 107. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 108. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 109. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 110. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 111. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 순서 |
| 112. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 113. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 114. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 115. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 116. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 순서 |
| 117. D08.protection-released | 실제 assertion | PASS | 원출력 순서 |
| 118. D08.run-complete | 실제 assertion | PASS | 원출력 순서 |
| 119. D08.actual-output-hash | 실제 assertion | PASS | 원출력 순서 |
| 120. CP01.actual-ready-complete-shape-canonical-files-reservation | 실제 assertion | PASS | 원출력 순서 |
| 121. CP02.two-jobs-over-1MiB-canonical-transitions | 실제 assertion | PASS | 원출력 순서 |

개별121행 대조, 실제 명령·시각·정리/비용은 원출력에 보존했다.

## 호출-local 내용 증명 예상 RED

[원출력](lp18-ownership-red-content-01.txt) — build exit0, focused exit1; 6PASS/1FAIL, source 불변·그룹 종료·root13567669B 삭제. elapsed30962ms, token 집계 미제공. 제품 PASS 아님.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. CP01 actual Ready Complete shape canonical files reservation | 실제 assertion | PASS | 사전등록한 RED 실제 결과 |
| 2. CP02 bounded two jobs over 1MiB canonical transitions | 실제 assertion | PASS | 사전등록한 RED 실제 결과 |
| 3. LP18-V01 every normal update strictly parses content once | 실제 assertion | PASS | 사전등록한 RED 실제 결과 |
| 4. LP18-V01 automatic checkpoint applies current update payload | 실제 assertion | PASS | 사전등록한 RED 실제 결과 |
| 5. LP18-V01 automatic checkpoint reuses current validated content without parsing | 실제 assertion | FAIL | 사전등록한 RED 실제 결과 |
| 6. LP18-V04 managed reopen retains strict content parsing | 실제 assertion | PASS | 사전등록한 RED 실제 결과 |
| 7. LP18-V04 manual checkpoint retains strict content parsing | 실제 assertion | PASS | 사전등록한 RED 실제 결과 |

개별 assertion7행 대조. 원출력의 관측 카운터는 중앙 기록을 따른다.


## 호출-local 내용 증명과 영향 회귀 전수 결과

실제 개별 assertion과 원출력을 대조했다. token은 미집계(사용량 집계 미제공), 실제 HTTP·장시간/UI는 미실행이다.

### lp18-ownership-green-content-01.txt

[원출력](lp18-ownership-green-content-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-V03 valid content proof cannot bypass output reservation | 실제 assertion | PASS | 원출력 판정 |
| 2. LP18-V03 valid content proof cannot bypass source deletion state | 실제 assertion | PASS | 원출력 판정 |
| 3. LP18-V03 valid content proof cannot bypass source media binding | 실제 assertion | PASS | 원출력 판정 |
| 4. LP18-V02 minted proof reuses owned content after state validation | 실제 assertion | PASS | 원출력 판정 |
| 5. LP18-V02 schema mismatch retains strict outcome | 실제 assertion | PASS | 원출력 판정 |
| 6. LP18-V02 type mismatch retains strict outcome | 실제 assertion | PASS | 원출력 판정 |
| 7. LP18-V02 mutation ID mismatch retains strict outcome | 실제 assertion | PASS | 원출력 판정 |
| 8. LP18-V02 entity mismatch retains strict outcome | 실제 assertion | PASS | 원출력 판정 |
| 9. LP18-V02 time mismatch retains strict outcome | 실제 assertion | PASS | 원출력 판정 |
| 10. LP18-V02 payload bytes mismatch retains strict outcome | 실제 assertion | PASS | 원출력 판정 |
| 11. LP18-V03 invalid content rejects through strict fallback | 실제 assertion | PASS | 원출력 판정 |
| 12. LP18-V02 null owner retains strict outcome | 실제 assertion | PASS | 원출력 판정 |
| 13. LP18-V02 null envelope retains strict outcome | 실제 assertion | PASS | 원출력 판정 |
| 14. LP18-V02 null record retains strict outcome | 실제 assertion | PASS | 원출력 판정 |
| 15. LP18-V02 foreign owner retains strict outcome | 실제 assertion | PASS | 원출력 판정 |
| 16. LP18-V02 equal-content replacement invalidates current proof ownership | 실제 assertion | PASS | 원출력 판정 |
| 17. LP18-V02 equal-envelope replacement invalidates accepted proof ownership | 실제 assertion | PASS | 원출력 판정 |
| 18. LP18-V03 valid content proof cannot bypass missing prior transition | 실제 assertion | PASS | 원출력 판정 |
| 19. CP01 actual Ready Complete shape canonical files reservation | 실제 assertion | PASS | 원출력 판정 |
| 20. CP02 bounded two jobs over 1MiB canonical transitions | 실제 assertion | PASS | 원출력 판정 |
| 21. LP18-V01 every normal update strictly parses content once | 실제 assertion | PASS | 원출력 판정 |
| 22. LP18-V01 automatic checkpoint applies current update payload | 실제 assertion | PASS | 원출력 판정 |
| 23. LP18-V01 automatic checkpoint reuses current validated content without parsing | 실제 assertion | PASS | 원출력 판정 |
| 24. LP18-V04 managed reopen retains strict content parsing | 실제 assertion | PASS | 원출력 판정 |
| 25. LP18-V04 manual checkpoint retains strict content parsing | 실제 assertion | PASS | 원출력 판정 |

개별 assertion 25행 대조. 명령·elapsed·source·cleanup은 원출력 및 중앙 기록을 따른다.

### lp18-ownership-green-content-job-01.txt

[원출력](lp18-ownership-green-content-job-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-J03 initial canonical and active source protection preserved | 실제 assertion | PASS | 원출력 판정 |
| 2. LP18-J03 FindDerivedJob returns independent value | 실제 assertion | PASS | 원출력 판정 |
| 3. LP18-J03 full and active snapshots return independent values | 실제 assertion | PASS | 원출력 판정 |
| 4. LP18-J03 foreign Prepared owner rejected without transition | 실제 assertion | PASS | 원출력 판정 |
| 5. LP18-J02 validated record is published as the same owned object | 실제 assertion | PASS | 원출력 판정 |
| 6. LP18-J02 Prepared prior retains pre-publication canonical value | 실제 assertion | PASS | 원출력 판정 |
| 7. LP18-J03 consumed Prepared cannot apply twice | 실제 assertion | PASS | 원출력 판정 |
| 8. LP18-J03 invalid terminal transition preserves state and bytes | 실제 assertion | PASS | 원출력 판정 |
| 9. LP18-J03 terminal protection and service owner released | 실제 assertion | PASS | 원출력 판정 |
| 10. LP18-J01 checkpoint shares current live job object | 실제 assertion | PASS | 원출력 판정 |
| 11. LP18-J03 null job pool uses independent strict value | 실제 assertion | PASS | 원출력 판정 |
| 12. LP18-J03 different-content job pool uses independent strict value | 실제 assertion | PASS | 원출력 판정 |
| 13. LP18-J03 different-id job pool uses independent strict value | 실제 assertion | PASS | 원출력 판정 |
| 14. LP18-J02 equal-content replacement invalidates Prepared prior ownership | 실제 assertion | PASS | 원출력 판정 |
| 15. LP18-J01 shared job survives pool owner destruction | 실제 assertion | PASS | 원출력 판정 |
| 16. LP18-J01 no-op checkpoint preserves job handles without pool comparisons | 실제 assertion | PASS | 원출력 판정 |
| 17. LP18-J01 newly applied job compares only matching current pool entry | 실제 assertion | PASS | 원출력 판정 |
| 18. LP18-J01 duplicate job mutation performs no pool comparison | 실제 assertion | PASS | 원출력 판정 |
| 19. LP18-J03 latest terminal pool cannot replace historical Intent | 실제 assertion | PASS | 원출력 판정 |
| 20. LP18-J03 matching job pool cannot bypass strict state validation | 실제 assertion | PASS | 원출력 판정 |
| 21. LP18-J03 null resident job rejects snapshots and retention authority | 실제 assertion | PASS | 원출력 판정 |
| 22. LP18-J04 full journal bytes and terminal record roundtrip preserved | 실제 assertion | PASS | 원출력 판정 |
| 23. LP18-J04 SQLite reopen preserves terminal canonical and release | 실제 assertion | PASS | 원출력 판정 |
| 24. LP18-J04 JSONL reopen preserves terminal canonical and release | 실제 assertion | PASS | 원출력 판정 |

개별 assertion 24행 대조. 명령·elapsed·source·cleanup은 원출력 및 중앙 기록을 따른다.

### lp18-content-prepared-01.txt

[원출력](lp18-content-prepared-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP14-C01 state=1 updates=1 full_parse=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 2. LP14-C01 state=2 updates=1 full_parse=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 3. LP14-C01 state=3 updates=1 full_parse=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 4. LP14-C03 memory/sqlite canonical bytes and CompletedOracle | 실제 assertion | PASS | 원출력 판정 |
| 5. LP14-C02 binding=payload rejected without apply | 실제 assertion | PASS | 원출력 판정 |
| 6. LP14-C02 binding=type rejected without apply | 실제 assertion | PASS | 원출력 판정 |
| 7. LP14-C02 binding=entity rejected without apply | 실제 assertion | PASS | 원출력 판정 |
| 8. LP14-C02 binding=owner rejected without apply | 실제 assertion | PASS | 원출력 판정 |
| 9. LP14-C02 binding=prior rejected without apply | 실제 assertion | PASS | 원출력 판정 |
| 10. LP14-C02 duplicate envelope no-apply/conflict rejection | 실제 assertion | PASS | 원출력 판정 |
| 11. LP14-C02 one-shot apply/reuse rejection | 실제 assertion | PASS | 원출력 판정 |

개별 assertion 11행 대조. 명령·elapsed·source·cleanup은 원출력 및 중앙 기록을 따른다.

### lp18-content-cache-01.txt

[원출력](lp18-content-cache-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP15-C01 cold full applied=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 2. LP15-C01 unchanged prefix applied=0 expected=0 | 실제 assertion | PASS | 원출력 판정 |
| 3. LP15-C01 exact prefix suffix only applied=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 4. LP15-C01 independent prefix shadow/full projection equality | 실제 assertion | PASS | 원출력 판정 |
| 5. LP15-C01 full fallback schema applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 6. LP15-C01 full fallback type applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 7. LP15-C01 full fallback id applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 8. LP15-C01 full fallback entity applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 9. LP15-C01 full fallback time applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 10. LP15-C01 full fallback payload applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 11. LP15-C01 full fallback reorder applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 12. LP15-C01 full fallback shrink applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 13. LP15-C01 full fallback null-shadow applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 14. LP15-C01 full fallback null-handle applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 15. LP15-C01 Open clears cache applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 16. LP15-C03 recover full/no-cache | 실제 assertion | PASS | 원출력 판정 |
| 17. LP15-C03 after recover full applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 18. LP15-C03 injected commit refusal discards cache | 실제 assertion | PASS | 원출력 판정 |
| 19. LP15-C03 after commit refusal full applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 20. LP15-C03 suffix exception discards cache | 실제 assertion | PASS | 원출력 판정 |
| 21. LP15-C03 after exception full applied=3 expected=3 | 실제 assertion | PASS | 원출력 판정 |
| 22. LP15-C03 public poisoned entry discards cache | 실제 assertion | PASS | 원출력 판정 |
| 23. LP15-C03 after restored fixture full applied=3 expected=3 | 실제 assertion | PASS | 원출력 판정 |
| 24. LP15-C04 exact byte charge boundary | 실제 assertion | PASS | 원출력 판정 |
| 25. LP15-C04 overflow charge rejected | 실제 assertion | PASS | 원출력 판정 |
| 26. LP15-C04 8192 records admitted | 실제 assertion | PASS | 원출력 판정 |
| 27. LP15-C04 8193 records rejected | 실제 assertion | PASS | 원출력 판정 |
| 28. LP15-C04 64MiB record charge admitted | 실제 assertion | PASS | 원출력 판정 |
| 29. LP15-C04 64MiB plus one rejected | 실제 assertion | PASS | 원출력 판정 |
| 30. LP15-C03 changed candidate prime applied=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 31. LP15-C03 changed candidate suffix12 plus full candidate13 applied=25 expected=25 | 실제 assertion | PASS | 원출력 판정 |
| 32. LP15-C03 changed candidate cache equals independent full projection | 실제 assertion | PASS | 원출력 판정 |
| 33. LP15-C03 compacted candidate prefix reused applied=0 expected=0 | 실제 assertion | PASS | 원출력 판정 |
| 34. LP15-C03 forced projection mismatch discards cache | 실제 assertion | PASS | 원출력 판정 |
| 35. LP15-C04 overlimit prime applied=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 36. LP15-C04 existing cache ignored for oversized original applied=8193 expected=8193 | 실제 assertion | PASS | 원출력 판정 |
| 37. LP15-C04 oversized candidate not retained | 실제 assertion | PASS | 원출력 판정 |
| 38. LP15-C04 next oversized checkpoint full applied=8193 expected=8193 | 실제 assertion | PASS | 원출력 판정 |
| 39. CP01 actual Ready Complete shape canonical files reservation | 실제 assertion | PASS | 원출력 판정 |
| 40. CP02 bounded two jobs over 1MiB canonical transitions | 실제 assertion | PASS | 원출력 판정 |
| 41. LP15-C02 bounded automatic checkpoint and whole transition measurement | 실제 assertion | PASS | 원출력 판정 |
| 42. LP15-C02 reopened full applied=18 expected=18 | 실제 assertion | PASS | 원출력 판정 |
| 43. LP15-C02 actual unchanged prefix applied=0 expected=0 | 실제 assertion | PASS | 원출력 판정 |
| 44. LP15-C02 actual suffix only applied=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 45. LP15-C02 actual job shadow/full projection equality | 실제 assertion | PASS | 원출력 판정 |
| 46. LP15-C03 illegal Ready after Complete suffix rejected by cached/full paths | 실제 assertion | PASS | 원출력 판정 |
| 47. LP15-C04 peakRSS bytes=164626432 cap=536870912 | 실제 assertion | PASS | 원출력 판정 |

개별 assertion 47행 대조. 명령·elapsed·source·cleanup은 원출력 및 중앙 기록을 따른다.

### lp18-content-catalog-01.txt

[원출력](lp18-content-catalog-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. journal open:  | 실제 assertion | PASS | 원출력 판정 |
| 2. fallback catalog open:  | 실제 assertion | PASS | 원출력 판정 |
| 3. SQLite off mode 표시 | 실제 assertion | PASS | 원출력 판정 |
| 4. segment finalize journal+projection:  | 실제 assertion | PASS | 원출력 판정 |
| 5. fallback range query | 실제 assertion | PASS | 원출력 판정 |
| 6. event link FK 위반 거부 | 실제 assertion | PASS | 원출력 판정 |
| 7. FK 위반 transaction/journal 전체 rollback | 실제 assertion | PASS | 원출력 판정 |
| 8. 최초 durable mutation 1개 | 실제 assertion | PASS | 원출력 판정 |
| 9. 동일 mutation 중복 append | 실제 assertion | PASS | 원출력 판정 |
| 10. 손상 사이 정상 durable mutation 보존 | 실제 assertion | PASS | 원출력 판정 |
| 11. 중간 corrupt line count | 실제 assertion | PASS | 원출력 판정 |
| 12. 마지막 truncated line skip | 실제 assertion | PASS | 원출력 판정 |
| 13. fallback replay open | 실제 assertion | PASS | 원출력 판정 |
| 14. 같은 mutation idempotent replay | 실제 assertion | PASS | 원출력 판정 |
| 15. 재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존 | 실제 assertion | PASS | 원출력 판정 |
| 16. 중복 replay row/합계 불증가 | 실제 assertion | PASS | 원출력 판정 |
| 17. 추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구:  | 실제 assertion | PASS | 원출력 판정 |
| 18. writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed | 실제 assertion | PASS | 원출력 판정 |
| 19. v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed | 실제 assertion | PASS | 원출력 판정 |
| 20. SQLite catalog open/rebuild:  | 실제 assertion | PASS | 원출력 판정 |
| 21. SQLite primary mode 표시 | 실제 assertion | PASS | 원출력 판정 |
| 22. SQLite on/off range query ID·순서 parity | 실제 assertion | PASS | 원출력 판정 |
| 23. journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분 | 실제 assertion | PASS | 원출력 판정 |
| 24. journal 없는 손상 media orphan 구분 | 실제 assertion | PASS | 원출력 판정 |
| 25. projection failover journal open:  | 실제 assertion | PASS | 원출력 판정 |
| 26. projection failover catalog open:  | 실제 assertion | PASS | 원출력 판정 |
| 27. 실제 SQLite INSERT 실패 trigger 설치 | 실제 assertion | PASS | 원출력 판정 |
| 28. SQLite 투영 실패 뒤 journal+memory finalize 유지:  | 실제 assertion | PASS | 원출력 판정 |
| 29. SQLite 투영 실패 즉시 JSONL fallback 전환 | 실제 assertion | PASS | 원출력 판정 |
| 30. 재시작 rebuild 전 실패 trigger 제거 | 실제 assertion | PASS | 원출력 판정 |
| 31. 투영 실패 직후 in-memory query 정합성 유지 | 실제 assertion | PASS | 원출력 판정 |
| 32. projection failover 재시작 journal rebuild:  | 실제 assertion | PASS | 원출력 판정 |
| 33. 재시작 후 journal에서 누락 SQLite projection 복구 | 실제 assertion | PASS | 원출력 판정 |
| 34. 재시작 후 SQLite primary 복귀 | 실제 assertion | PASS | 원출력 판정 |
| 35. 재시작 journal rebuild가 실제 SQLite row 복원 | 실제 assertion | PASS | 원출력 판정 |
| 36. tombstone journal open:  | 실제 assertion | PASS | 원출력 판정 |
| 37. tombstone catalog open:  | 실제 assertion | PASS | 원출력 판정 |
| 38. tombstone 대상 segment finalize:  | 실제 assertion | PASS | 원출력 판정 |
| 39. tombstone 대상 deletion request:  | 실제 assertion | PASS | 원출력 판정 |
| 40. tombstone 완료 기록:  | 실제 assertion | PASS | 원출력 판정 |
| 41. catalog finalize가 tombstone segment ID 재사용을 거부해야 함 | 실제 assertion | PASS | 원출력 판정 |
| 42. 손상 SQLite 격리 후 journal rebuild:  | 실제 assertion | PASS | 원출력 판정 |
| 43. 손상 SQLite 원본 격리 | 실제 assertion | PASS | 원출력 판정 |
| 44. 격리 SQLite 파일 보존 | 실제 assertion | PASS | 원출력 판정 |
| 45. 격리 후 journal rebuild 결과 | 실제 assertion | PASS | 원출력 판정 |
| 46. S10-3A future-schema journal read open | 실제 assertion | PASS | 원출력 판정 |
| 47. S10-3A future-schema unsupported classification | 실제 assertion | PASS | 원출력 판정 |
| 48. S10-3A future-schema catalog open denied | 실제 assertion | PASS | 원출력 판정 |
| 49. S10-3A future-schema catalog retry denied | 실제 assertion | PASS | 원출력 판정 |
| 50. S10-3A future-schema journal bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 51. S10-3A future-schema SQLite bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 52. S10-3A future-schema writer cleanup untouched | 실제 assertion | PASS | 원출력 판정 |
| 53. S10-3A arbitrary-schema journal read open | 실제 assertion | PASS | 원출력 판정 |
| 54. S10-3A arbitrary-schema unsupported classification | 실제 assertion | PASS | 원출력 판정 |
| 55. S10-3A arbitrary-schema catalog open denied | 실제 assertion | PASS | 원출력 판정 |
| 56. S10-3A arbitrary-schema catalog retry denied | 실제 assertion | PASS | 원출력 판정 |
| 57. S10-3A arbitrary-schema journal bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 58. S10-3A arbitrary-schema SQLite bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 59. S10-3A arbitrary-schema writer cleanup untouched | 실제 assertion | PASS | 원출력 판정 |
| 60. S10-3A empty-schema journal read open | 실제 assertion | PASS | 원출력 판정 |
| 61. S10-3A empty-schema unsupported classification | 실제 assertion | PASS | 원출력 판정 |
| 62. S10-3A empty-schema catalog open denied | 실제 assertion | PASS | 원출력 판정 |
| 63. S10-3A empty-schema catalog retry denied | 실제 assertion | PASS | 원출력 판정 |
| 64. S10-3A empty-schema journal bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 65. S10-3A empty-schema SQLite bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 66. S10-3A empty-schema writer cleanup untouched | 실제 assertion | PASS | 원출력 판정 |
| 67. S10-3A future-type journal read open | 실제 assertion | PASS | 원출력 판정 |
| 68. S10-3A future-type unsupported classification | 실제 assertion | PASS | 원출력 판정 |
| 69. S10-3A future-type catalog open denied | 실제 assertion | PASS | 원출력 판정 |
| 70. S10-3A future-type catalog retry denied | 실제 assertion | PASS | 원출력 판정 |
| 71. S10-3A future-type journal bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 72. S10-3A future-type SQLite bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 73. S10-3A future-type writer cleanup untouched | 실제 assertion | PASS | 원출력 판정 |
| 74. S10-3A malformed journal open | 실제 assertion | PASS | 원출력 판정 |
| 75. S10-3A malformed JSON missing fields and wrong types remain corrupt | 실제 assertion | PASS | 원출력 판정 |
| 76. S10-O01 reservation journal open | 실제 assertion | PASS | 원출력 판정 |
| 77. S10-O01 first reservation returns four IDs and sequence one | 실제 assertion | PASS | 원출력 판정 |
| 78. S10-O01 versioned reservation payload replays | 실제 assertion | PASS | 원출력 판정 |
| 79. S10-O01 new reservation records actual occurred time | 실제 assertion | PASS | 원출력 판정 |
| 80. S10-O02 identical retry preserves sequence and bytes | 실제 assertion | PASS | 원출력 판정 |
| 81. S10-O03 reopened instance allocates next sequence | 실제 assertion | PASS | 원출력 판정 |
| 82. S10-O03 new process resumes durable sequence | 실제 assertion | PASS | 원출력 판정 |
| 83. S10-O04 different store rejected | 실제 assertion | PASS | 원출력 판정 |
| 84. S10-O04 reused request with different segment rejected | 실제 assertion | PASS | 원출력 판정 |
| 85. S10-O04 reused request with different channel rejected | 실제 assertion | PASS | 원출력 판정 |
| 86. S10-O04 reused segment with different request rejected | 실제 assertion | PASS | 원출력 판정 |
| 87. S10-O04 conflicts preserve original bytes | 실제 assertion | PASS | 원출력 판정 |
| 88. S10-O05/O06 reject and preserve corrupt | 실제 assertion | PASS | 원출력 판정 |
| 89. S10-O05/O06 reject and preserve unsupported-schema | 실제 assertion | PASS | 원출력 판정 |
| 90. S10-O05/O06 reject and preserve unsupported-type | 실제 assertion | PASS | 원출력 판정 |
| 91. S10-O05/O06 reject and preserve tail | 실제 assertion | PASS | 원출력 판정 |
| 92. S10-O05/O06 reject and preserve payload-zero | 실제 assertion | PASS | 원출력 판정 |
| 93. S10-O05/O06 reject and preserve payload-negative | 실제 assertion | PASS | 원출력 판정 |
| 94. S10-O05/O06 reject and preserve payload-fraction | 실제 assertion | PASS | 원출력 판정 |
| 95. S10-O05/O06 reject and preserve payload-overflow | 실제 assertion | PASS | 원출력 판정 |
| 96. S10-O05/O06 reject and preserve duplicate-sequence | 실제 assertion | PASS | 원출력 판정 |
| 97. S10-O05/O06 reject and preserve decreasing-sequence | 실제 assertion | PASS | 원출력 판정 |
| 98. S10-O05/O06 reject and preserve duplicate-request | 실제 assertion | PASS | 원출력 판정 |
| 99. S10-O05/O06 reject and preserve duplicate-segment | 실제 assertion | PASS | 원출력 판정 |
| 100. S10-O05/O06 reject and preserve store-conflict | 실제 assertion | PASS | 원출력 판정 |
| 101. S10-O05/O06 reject and preserve ordinary-before | 실제 assertion | PASS | 원출력 판정 |
| 102. S10-O05/O06 reject and preserve ordinary-after | 실제 assertion | PASS | 원출력 판정 |
| 103. S10-O05/O06 reject and preserve line-cap | 실제 assertion | PASS | 원출력 판정 |
| 104. S10-O05 reservation entity envelope binding rejects mismatch | 실제 assertion | PASS | 원출력 판정 |
| 105. S10-O05 reservation request envelope binding rejects mismatch | 실제 assertion | PASS | 원출력 판정 |
| 106. S10-O01 strict reservation parser accepts versioned literal | 실제 assertion | PASS | 원출력 판정 |
| 107. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 원출력 판정 |
| 108. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 원출력 판정 |
| 109. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 원출력 판정 |
| 110. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 원출력 판정 |
| 111. S10-O06 INT64_MAX identical retry remains valid | 실제 assertion | PASS | 원출력 판정 |
| 112. S10-O06 sequence overflow rejected without write | 실제 assertion | PASS | 원출력 판정 |
| 113. S10-O02 identical durable reservation duplicates remain idempotent | 실제 assertion | PASS | 원출력 판정 |
| 114. S10-O06 sequence gaps remain valid and allocate above maximum | 실제 assertion | PASS | 원출력 판정 |
| 115. S10-O07 four simultaneous processes finish reservations | 실제 assertion | PASS | 원출력 판정 |
| 116. S10-O07 concurrent sequences are unique and complete | 실제 assertion | PASS | 원출력 판정 |
| 117. S10-O07 next sequence follows concurrent reservations | 실제 assertion | PASS | 원출력 판정 |
| 118. S10-O08 ordinary Append cannot reserve orders | 실제 assertion | PASS | 원출력 판정 |
| 119. S10-O08 unopened journal rejected | 실제 assertion | PASS | 원출력 판정 |
| 120. S10-O08 null result rejected | 실제 assertion | PASS | 원출력 판정 |
| 121. S10-O08 invalid opaque ID rejected | 실제 assertion | PASS | 원출력 판정 |
| 122. S10-O08 failed reservation does not expose tentative result | 실제 assertion | PASS | 원출력 판정 |
| 123. S10-O09 unsafe file binding rejected and original preserved inode | 실제 assertion | PASS | 원출력 판정 |
| 124. S10-O09 unsafe file binding rejected and original preserved parent | 실제 assertion | PASS | 원출력 판정 |
| 125. S10-O09 unsafe file binding rejected and original preserved symlink | 실제 assertion | PASS | 원출력 판정 |
| 126. S10-O09 unsafe file binding rejected and original preserved hardlink | 실제 assertion | PASS | 원출력 판정 |
| 127. S10-O10 reservation and normal segment coexist in catalog | 실제 assertion | PASS | 원출력 판정 |
| 128. S10-O04 reserve then finalize permits identical retry | 실제 assertion | PASS | 원출력 판정 |
| 129. S10-O10 reservation survives catalog rebuild without changing segment query | 실제 assertion | PASS | 원출력 판정 |
| 130. S10-O04 legacy segment cannot acquire retroactive reservation | 실제 assertion | PASS | 원출력 판정 |
| 131. S10-M06 opened catalog accepts fresh exact reservation V2 finalize | 실제 assertion | PASS | 원출력 판정 |
| 132. S10-M07 V2 find preserves complete metadata | 실제 assertion | PASS | 원출력 판정 |
| 133. S10-M07 identical V2 recovery is idempotent | 실제 assertion | PASS | 원출력 판정 |
| 134. S10-M07 V2 is absent from V1 range query | 실제 assertion | PASS | 원출력 판정 |
| 135. S10-M07 V2 registered path is not orphan | 실제 assertion | PASS | 원출력 판정 |
| 136. S10-M07 SQLite exact V2 JSON and path match | 실제 assertion | PASS | 원출력 판정 |
| 137. S10-M07 JSONL restart preserves V2 exact payload | 실제 assertion | PASS | 원출력 판정 |
| 138. S10-M06 wrong reservation tuple rejected store | 실제 assertion | PASS | 원출력 판정 |
| 139. S10-M06 wrong reservation tuple rejected request | 실제 assertion | PASS | 원출력 판정 |
| 140. S10-M06 wrong reservation tuple rejected segment | 실제 assertion | PASS | 원출력 판정 |
| 141. S10-M06 wrong reservation tuple rejected channel | 실제 assertion | PASS | 원출력 판정 |
| 142. S10-M06 wrong reservation tuple rejected sequence | 실제 assertion | PASS | 원출력 판정 |
| 143. S10-M09 immutable V2 mapping mismatch rejected | 실제 assertion | PASS | 원출력 판정 |
| 144. S10-M09 bad V2 startup retry preserves original state bad-payload | 실제 assertion | PASS | 원출력 판정 |
| 145. S10-M09 bad V2 startup retry preserves original state missing-order | 실제 assertion | PASS | 원출력 판정 |
| 146. S10-M09 bad V2 startup retry preserves original state bad-order | 실제 assertion | PASS | 원출력 판정 |
| 147. S10-M09 bad V2 startup retry preserves original state conflicting-order | 실제 assertion | PASS | 원출력 판정 |
| 148. S10-M09 bad V2 startup retry preserves original state tail | 실제 assertion | PASS | 원출력 판정 |
| 149. S10-M09 bad V2 startup retry preserves original state corrupt | 실제 assertion | PASS | 원출력 판정 |
| 150. S10-M09 bad V2 startup retry preserves original state unsafe-path | 실제 assertion | PASS | 원출력 판정 |
| 151. S10-M09 default off rejects V2 before SQLite changes | 실제 assertion | PASS | 원출력 판정 |
| 152. S10-M09 V2 replay namespace and deletion duplicate | 실제 assertion | PASS | 원출력 판정 |
| 153. S10-M09 V2 replay namespace and deletion deleted | 실제 assertion | PASS | 원출력 판정 |
| 154. S10-M09 V2 replay namespace and deletion v1-before | 실제 assertion | PASS | 원출력 판정 |
| 155. S10-M09 V2 replay namespace and deletion v1-after | 실제 assertion | PASS | 원출력 판정 |
| 156. S10-M09 V2 replay namespace and deletion deleted-before | 실제 assertion | PASS | 원출력 판정 |
| 157. S10-M09 V2 replay namespace and deletion resurrection | 실제 assertion | PASS | 원출력 판정 |
| 158. S10-M09 V2 replay namespace and deletion mutation-collision | 실제 assertion | PASS | 원출력 판정 |
| 159. S10-M09 V2 finalize rejects missing media | 실제 assertion | PASS | 원출력 판정 |
| 160. S10-M09 V2 finalize rejects directory media | 실제 assertion | PASS | 원출력 판정 |
| 161. S10-M09 fresh candidate rejects mapping | 실제 assertion | PASS | 원출력 판정 |
| 162. S10-M09 fresh candidate rejects path | 실제 assertion | PASS | 원출력 판정 |
| 163. S10-M09 fresh candidate rejects tombstone | 실제 assertion | PASS | 원출력 판정 |
| 164. S10-SW01 managed empty root opens with lifetime lease | 실제 assertion | PASS | 원출력 판정 |
| 165. S10-SW02 same process second managed owner denied | 실제 assertion | PASS | 원출력 판정 |
| 166. S10-SW03 different process owner and inherited use denied | 실제 assertion | PASS | 원출력 판정 |
| 167. S10-SW12 managed duplicate descriptors are close-on-exec | 실제 assertion | PASS | 원출력 판정 |
| 168. S10-SW05 managed reserve append replay use owned descriptor | 실제 assertion | PASS | 원출력 판정 |
| 169. S10-SW06 raw managed access and legacy default path denied | 실제 assertion | PASS | 원출력 판정 |
| 170. S10-SW01 managed Reserve rejects different store identity | 실제 assertion | PASS | 원출력 판정 |
| 171. S10-SW10 catalog connection can inspect managed lease | 실제 assertion | PASS | 원출력 판정 |
| 172. S10-SW04 owner destruction releases lease | 실제 assertion | PASS | 원출력 판정 |
| 173. S10-SW01 managed reopen rejects different store identity | 실제 assertion | PASS | 원출력 판정 |
| 174. S10-SW11 managed incomplete tail rejects append without changing bytes | 실제 assertion | PASS | 원출력 판정 |
| 175. S10-SW07 legacy nonempty root preserved without conversion | 실제 assertion | PASS | 원출력 판정 |
| 176. S10-SW08 partial initialization retry validates exact state lease | 실제 assertion | PASS | 원출력 판정 |
| 177. S10-SW08 partial initialization retry validates exact state init | 실제 assertion | PASS | 원출력 판정 |
| 178. S10-SW08 partial initialization retry validates exact state barrier | 실제 assertion | PASS | 원출력 판정 |
| 179. S10-SW08 partial initialization retry validates exact state journal | 실제 assertion | PASS | 원출력 판정 |
| 180. S10-SW08 partial initialization retry validates exact state incomplete | 실제 assertion | PASS | 원출력 판정 |
| 181. S10-SW08 partial initialization retry validates exact state unknown | 실제 assertion | PASS | 원출력 판정 |
| 182. S10-SW09 symlink inode and malformed marker rejected journal | 실제 assertion | PASS | 원출력 판정 |
| 183. S10-SW09 symlink inode and malformed marker rejected marker | 실제 assertion | PASS | 원출력 판정 |
| 184. S10-SW09 symlink inode and malformed marker rejected barrier | 실제 assertion | PASS | 원출력 판정 |
| 185. S10-SW09 symlink inode and malformed marker rejected root-symlink | 실제 assertion | PASS | 원출력 판정 |
| 186. S10-SB01 second managed catalog is denied | 실제 assertion | PASS | 원출력 판정 |
| 187. S10-SB02 failed catalog cannot mutate journal or holds | 실제 assertion | PASS | 원출력 판정 |
| 188. S10-SB03 attached catalog blocks unowned append but permits reservation | 실제 assertion | PASS | 원출력 판정 |
| 189. S10-SB04 catalog destruction releases attachment | 실제 assertion | PASS | 원출력 판정 |
| 190. S10-SB05 managed catalog rejects unsafe options outside | 실제 assertion | PASS | 원출력 판정 |
| 191. S10-SB05 managed catalog rejects unsafe options dotdot | 실제 assertion | PASS | 원출력 판정 |
| 192. S10-SB05 managed catalog rejects unsafe options media-symlink | 실제 assertion | PASS | 원출력 판정 |
| 193. S10-SB05 managed catalog rejects unsafe options sqlite-symlink | 실제 assertion | PASS | 원출력 판정 |
| 194. S10-SB05 managed catalog rejects unsafe options sqlite-hardlink | 실제 assertion | PASS | 원출력 판정 |
| 195. S10-SB05 managed catalog rejects unsafe options disabled | 실제 assertion | PASS | 원출력 판정 |
| 196. S10-SB06 failed open releases catalog attachment | 실제 assertion | PASS | 원출력 판정 |
| 197. S10-SB07 managed SQLite sidecar rejected -wal symlink | 실제 assertion | PASS | 원출력 판정 |
| 198. S10-SB07 managed SQLite sidecar rejected -wal hardlink | 실제 assertion | PASS | 원출력 판정 |
| 199. S10-SB07 managed SQLite sidecar rejected -shm symlink | 실제 assertion | PASS | 원출력 판정 |
| 200. S10-SB07 managed SQLite sidecar rejected -shm hardlink | 실제 assertion | PASS | 원출력 판정 |
| 201. S10-SB07 managed SQLite sidecar rejected -journal symlink | 실제 assertion | PASS | 원출력 판정 |
| 202. S10-SB07 managed SQLite sidecar rejected -journal hardlink | 실제 assertion | PASS | 원출력 판정 |
| 203. S10-SC01 managed repeated event fixture is valid | 실제 assertion | PASS | 원출력 판정 |
| 204. S10-SC02 managed reservations avoid history reads | 실제 assertion | PASS | 원출력 판정 |
| 205. S10-SC03 managed V2 finalize avoids full replay | 실제 assertion | PASS | 원출력 판정 |
| 206. S10-SC04 checkpoint reduces superseded event payload bytes | 실제 assertion | PASS | 원출력 판정 |
| 207. S10-SC05 checkpoint preserves latest event and all record identities | 실제 assertion | PASS | 원출력 판정 |
| 208. S10-SC06 checkpoint is idempotent and preserves V2 | 실제 assertion | PASS | 원출력 판정 |
| 209. S10-SC08 receipt preserves retry identity and rejects direct append | 실제 assertion | PASS | 원출력 판정 |
| 210. S10-SC09 checkpoint restart preserves SQLite and JSONL state sqlite | 실제 assertion | PASS | 원출력 판정 |
| 211. S10-SC09 managed checkpoint SQL V2 payload and path | 실제 assertion | PASS | 원출력 판정 |
| 212. S10-SC09 checkpoint restart preserves SQLite and JSONL state jsonl | 실제 assertion | PASS | 원출력 판정 |
| 213. S10-SC10 checkpoint prefix recovers before writes | 실제 assertion | PASS | 원출력 판정 |
| 214. S10-SC11 checkpoint mismatch preserves bytes and poisons owner | 실제 assertion | PASS | 원출력 판정 |
| 215. S10-SC12 first accepted mutation controls latest event | 실제 assertion | PASS | 원출력 판정 |
| 216. S10-SC16 automatic checkpoint uses accumulated growth | 실제 assertion | PASS | 원출력 판정 |
| 217. S10-SC07 raw checkpoint is rejected | 실제 assertion | PASS | 원출력 판정 |
| 218. S10-SC18 checkpoint syscall failure poisons and reopens write | 실제 assertion | PASS | 원출력 판정 |
| 219. S10-SC21 poison rejects hold mutation write | 실제 assertion | PASS | 원출력 판정 |
| 220. S10-SC18 checkpoint syscall failure poisons and reopens file-fsync | 실제 assertion | PASS | 원출력 판정 |
| 221. S10-SC21 poison rejects hold mutation file-fsync | 실제 assertion | PASS | 원출력 판정 |
| 222. S10-SC18 checkpoint syscall failure poisons and reopens rename | 실제 assertion | PASS | 원출력 판정 |
| 223. S10-SC21 poison rejects hold mutation rename | 실제 assertion | PASS | 원출력 판정 |
| 224. S10-SC18 checkpoint syscall failure poisons and reopens dir-fsync | 실제 assertion | PASS | 원출력 판정 |
| 225. S10-SC21 poison rejects hold mutation dir-fsync | 실제 assertion | PASS | 원출력 판정 |
| 226. S10-SC17 checkpoint preserves holds observations and deletion | 실제 assertion | PASS | 원출력 판정 |
| 227. S10-SC17 checkpoint SQL hold observation tombstone | 실제 assertion | PASS | 원출력 판정 |
| 228. S10-SC17 checkpoint preserves holds observations and deletion restart sqlite | 실제 assertion | PASS | 원출력 판정 |
| 229. S10-SC17 checkpoint SQL restart observation tombstone | 실제 assertion | PASS | 원출력 판정 |
| 230. S10-SC17 checkpoint preserves holds observations and deletion restart jsonl | 실제 assertion | PASS | 원출력 판정 |
| 231. S10-SC19 invalid managed history remains unchanged malformed | 실제 assertion | PASS | 원출력 판정 |
| 232. S10-SC19 invalid managed history remains unchanged unsupported | 실제 assertion | PASS | 원출력 판정 |
| 233. S10-SC19 invalid managed history remains unchanged conflict | 실제 assertion | PASS | 원출력 판정 |
| 234. S10-SC20 raw catalog rejects receipt before side effects | 실제 assertion | PASS | 원출력 판정 |
| 235. S10-SC13 crypto off raw remains usable | 실제 assertion | PASS | 원출력 판정 |
| 236. S10-SC14 crypto off checkpoint is rejected | 실제 assertion | PASS | 원출력 판정 |
| 237. S10-SC15 crypto off receipt reopen is rejected | 실제 assertion | PASS | 원출력 판정 |
| 238. source 저장 callback reconcile 연결 | 실제 assertion | PASS | 원출력 판정 |
| 239. policy revision idempotency | 실제 assertion | PASS | 원출력 판정 |
| 240. 5초 safety reconcile | 실제 assertion | PASS | 원출력 판정 |
| 241. composition root 관리 저장소 선행 open | 실제 assertion | PASS | 원출력 판정 |
| 242. composition helper journal 다음 catalog rebuild/open | 실제 assertion | PASS | 원출력 판정 |
| 243. 서버 전 supervisor 시작 | 실제 assertion | PASS | 원출력 판정 |
| 244. ingress 전 event bridge 등록 | 실제 assertion | PASS | 원출력 판정 |
| 245. ingress 종료 뒤 recorder finalize | 실제 assertion | PASS | 원출력 판정 |
| 246. composition root 시작/종료 순서 | 실제 assertion | PASS | 원출력 판정 |

개별 assertion 246행 대조. 명령·elapsed·source·cleanup은 원출력 및 중앙 기록을 따른다.

## 내용 proof 실제2-job 영향 확인

[원출력](lp17-jobs-lp18-content-01.txt) — B/C는 캐시 on/off이며 구·신코드 비교가 아니다. 실제 HTTP·누적32원본 판정 아님.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. FC01 exact insertion checks count=97 | 실제 assertion | PASS | 원출력 순서 |
| 2. D08.input-keyframes | 실제 assertion | PASS | 원출력 순서 |
| 3. D08.source-shape | 실제 assertion | PASS | 원출력 순서 |
| 4. D08.selection-complete | 실제 assertion | PASS | 원출력 순서 |
| 5. D08.expected-intent-built | 실제 assertion | PASS | 원출력 순서 |
| 6. D08.admission | 실제 assertion | PASS | 원출력 순서 |
| 7. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 8. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 9. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 10. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 11. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 12. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 13. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 14. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 15. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 16. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 17. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 18. D08.ready-verified-proof | 실제 assertion | PASS | 원출력 순서 |
| 19. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 20. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 21. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 22. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 23. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 순서 |
| 24. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 25. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 26. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 27. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 28. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 순서 |
| 29. D08.protection-released | 실제 assertion | PASS | 원출력 순서 |
| 30. D08.run-complete | 실제 assertion | PASS | 원출력 순서 |
| 31. D08.actual-output-hash | 실제 assertion | PASS | 원출력 순서 |
| 32. D08.selection-complete | 실제 assertion | PASS | 원출력 순서 |
| 33. D08.expected-intent-built | 실제 assertion | PASS | 원출력 순서 |
| 34. D08.admission | 실제 assertion | PASS | 원출력 순서 |
| 35. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 36. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 37. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 38. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 39. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 40. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 41. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 42. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 43. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 44. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 45. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 46. D08.ready-verified-proof | 실제 assertion | PASS | 원출력 순서 |
| 47. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 48. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 49. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 50. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 51. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 순서 |
| 52. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 53. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 54. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 55. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 56. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 순서 |
| 57. D08.protection-released | 실제 assertion | PASS | 원출력 순서 |
| 58. D08.run-complete | 실제 assertion | PASS | 원출력 순서 |
| 59. D08.actual-output-hash | 실제 assertion | PASS | 원출력 순서 |
| 60. CP01.actual-ready-complete-shape-canonical-files-reservation | 실제 assertion | PASS | 원출력 순서 |
| 61. CP02.two-jobs-over-1MiB-canonical-transitions | 실제 assertion | PASS | 원출력 순서 |
| 62. D08.input-keyframes | 실제 assertion | PASS | 원출력 순서 |
| 63. D08.source-shape | 실제 assertion | PASS | 원출력 순서 |
| 64. D08.selection-complete | 실제 assertion | PASS | 원출력 순서 |
| 65. D08.expected-intent-built | 실제 assertion | PASS | 원출력 순서 |
| 66. D08.admission | 실제 assertion | PASS | 원출력 순서 |
| 67. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 68. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 69. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 70. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 71. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 72. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 73. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 74. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 75. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 76. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 77. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 78. D08.ready-verified-proof | 실제 assertion | PASS | 원출력 순서 |
| 79. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 80. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 81. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 82. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 83. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 순서 |
| 84. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 85. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 86. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 87. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 88. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 순서 |
| 89. D08.protection-released | 실제 assertion | PASS | 원출력 순서 |
| 90. D08.run-complete | 실제 assertion | PASS | 원출력 순서 |
| 91. D08.actual-output-hash | 실제 assertion | PASS | 원출력 순서 |
| 92. D08.selection-complete | 실제 assertion | PASS | 원출력 순서 |
| 93. D08.expected-intent-built | 실제 assertion | PASS | 원출력 순서 |
| 94. D08.admission | 실제 assertion | PASS | 원출력 순서 |
| 95. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 96. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 97. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 98. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 99. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 100. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 101. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 102. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 103. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 104. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 105. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 106. D08.ready-verified-proof | 실제 assertion | PASS | 원출력 순서 |
| 107. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 108. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 109. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 110. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 111. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 순서 |
| 112. D08.expected-state | 실제 assertion | PASS | 원출력 순서 |
| 113. D08.canonical-intent | 실제 assertion | PASS | 원출력 순서 |
| 114. D08.files-receipt | 실제 assertion | PASS | 원출력 순서 |
| 115. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 순서 |
| 116. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 순서 |
| 117. D08.protection-released | 실제 assertion | PASS | 원출력 순서 |
| 118. D08.run-complete | 실제 assertion | PASS | 원출력 순서 |
| 119. D08.actual-output-hash | 실제 assertion | PASS | 원출력 순서 |
| 120. CP01.actual-ready-complete-shape-canonical-files-reservation | 실제 assertion | PASS | 원출력 순서 |
| 121. CP02.two-jobs-over-1MiB-canonical-transitions | 실제 assertion | PASS | 원출력 순서 |

개별121행(기능120/계측1)을 원출력과 대조했다. 명령/시각/정리/비용은 원출력, 요약 판정은 중앙 기록을 따른다.

## job 공유 최종 실행 전수 결과

각 원출력에 명령·source/환경·시간·정리를 보존했다. 실제 scope만 PASS이며 실제 HTTP·장시간/UI 판정이 아니다. token은 집계 미제공이다.

### lp18-ownership-green-job-01.txt

[원출력](lp18-ownership-green-job-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-J03 initial canonical and active source protection preserved | 실제 assertion | PASS | 원출력 판정 |
| 2. LP18-J03 FindDerivedJob returns independent value | 실제 assertion | PASS | 원출력 판정 |
| 3. LP18-J03 full and active snapshots return independent values | 실제 assertion | PASS | 원출력 판정 |
| 4. LP18-J03 foreign Prepared owner rejected without transition | 실제 assertion | PASS | 원출력 판정 |
| 5. LP18-J02 validated record is published as the same owned object | 실제 assertion | PASS | 원출력 판정 |
| 6. LP18-J02 Prepared prior retains pre-publication canonical value | 실제 assertion | PASS | 원출력 판정 |
| 7. LP18-J03 consumed Prepared cannot apply twice | 실제 assertion | PASS | 원출력 판정 |
| 8. LP18-J03 invalid terminal transition preserves state and bytes | 실제 assertion | PASS | 원출력 판정 |
| 9. LP18-J03 terminal protection and service owner released | 실제 assertion | PASS | 원출력 판정 |
| 10. LP18-J01 checkpoint shares current live job object | 실제 assertion | PASS | 원출력 판정 |
| 11. LP18-J03 null job pool uses independent strict value | 실제 assertion | PASS | 원출력 판정 |
| 12. LP18-J03 different-content job pool uses independent strict value | 실제 assertion | PASS | 원출력 판정 |
| 13. LP18-J03 different-id job pool uses independent strict value | 실제 assertion | PASS | 원출력 판정 |
| 14. LP18-J02 equal-content replacement invalidates Prepared prior ownership | 실제 assertion | PASS | 원출력 판정 |
| 15. LP18-J01 shared job survives pool owner destruction | 실제 assertion | PASS | 원출력 판정 |
| 16. LP18-J01 no-op checkpoint preserves job handles without pool comparisons | 실제 assertion | PASS | 원출력 판정 |
| 17. LP18-J01 newly applied job compares only matching current pool entry | 실제 assertion | PASS | 원출력 판정 |
| 18. LP18-J01 duplicate job mutation performs no pool comparison | 실제 assertion | PASS | 원출력 판정 |
| 19. LP18-J03 latest terminal pool cannot replace historical Intent | 실제 assertion | PASS | 원출력 판정 |
| 20. LP18-J03 matching job pool cannot bypass strict state validation | 실제 assertion | PASS | 원출력 판정 |
| 21. LP18-J03 null resident job rejects snapshots and retention authority | 실제 assertion | PASS | 원출력 판정 |
| 22. LP18-J04 full journal bytes and terminal record roundtrip preserved | 실제 assertion | PASS | 원출력 판정 |
| 23. LP18-J04 SQLite reopen preserves terminal canonical and release | 실제 assertion | PASS | 원출력 판정 |
| 24. LP18-J04 JSONL reopen preserves terminal canonical and release | 실제 assertion | PASS | 원출력 판정 |
| build | {"kind":"phase","label":"build","exit":0,"signal":null,"stopReason":null,"cleanup":true,"elapsedMs":2954,"groupPeakRssBytes":309952512} | PASS | 실행 경계·정리 |
| focused | {"kind":"phase","label":"focused","exit":0,"signal":null,"stopReason":null,"cleanup":true,"elapsedMs":753,"groupPeakRssBytes":2523136} | PASS | 실행 경계·정리 |
| oracle | {"kind":"oracle","mode":"green","expectedRed":false,"productPass":true,"matched":true} | PASS | 실행 경계·정리 |
| source-unchanged | {"kind":"source-unchanged","unchanged":true} | PASS | 실행 경계·정리 |
| cleanup | {"kind":"cleanup","bytes":6199685,"removed":true} | PASS | 실행 경계·정리 |
| result | {"kind":"result","utc":"2026-09-19T14:18:21.343Z","mode":"green","matched":true,"productPass":true,"elapsedMs":3723} | PASS | 실행 경계·정리 |

개별 assertion 24행을 원출력과 대조했다.

### lp18-job-prepared-01.txt

[원출력](lp18-job-prepared-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP14-C01 state=1 updates=1 full_parse=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 2. LP14-C01 state=2 updates=1 full_parse=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 3. LP14-C01 state=3 updates=1 full_parse=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 4. LP14-C03 memory/sqlite canonical bytes and CompletedOracle | 실제 assertion | PASS | 원출력 판정 |
| 5. LP14-C02 binding=payload rejected without apply | 실제 assertion | PASS | 원출력 판정 |
| 6. LP14-C02 binding=type rejected without apply | 실제 assertion | PASS | 원출력 판정 |
| 7. LP14-C02 binding=entity rejected without apply | 실제 assertion | PASS | 원출력 판정 |
| 8. LP14-C02 binding=owner rejected without apply | 실제 assertion | PASS | 원출력 판정 |
| 9. LP14-C02 binding=prior rejected without apply | 실제 assertion | PASS | 원출력 판정 |
| 10. LP14-C02 duplicate envelope no-apply/conflict rejection | 실제 assertion | PASS | 원출력 판정 |
| 11. LP14-C02 one-shot apply/reuse rejection | 실제 assertion | PASS | 원출력 판정 |

개별 assertion 11행을 원출력과 대조했다.

### lp18-job-jobs-01.txt

[원출력](lp18-job-jobs-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. J01 실제 선택→compact 내구 job 계약 왕복 | 실제 assertion | PASS | 원출력 판정 |
| 2. J17 무관source8개 추가에도 동일선택 jobID 유지 | 실제 assertion | PASS | 원출력 판정 |
| 3. J18 cleanup wall시계 역행 허용·순서는상태로검사 | 실제 assertion | PASS | 원출력 판정 |
| 4. J04 단일 Intent 원장·보호·예약 원자 가시성 | 실제 assertion | PASS | 원출력 판정 |
| 5. J19 후발 coordinator 일반·파생 admission 및 복구 차단 | 실제 assertion | PASS | 원출력 판정 |
| 6. J02 이후 시각 재Build ID 유지·선택 변경 새 ID | 실제 assertion | PASS | 원출력 판정 |
| 7. J03 unknown·중복·미지원 schema·불완전 JSON·4MiB·예약 상한·미구현 state 거부 | 실제 assertion | PASS | 원출력 판정 |
| 8. J16 소유 경로·attempt·order 계획 조작 거부 | 실제 assertion | PASS | 원출력 판정 |
| 9. J16 실제 2 source UUID 역순이어도 영속 order 순 출력 계획 | 실제 assertion | PASS | 원출력 판정 |
| 10. J08 나중 시각 재요청 최초 시각 유지·예약/경로 충돌·다른 catalog 거부 | 실제 assertion | PASS | 원출력 판정 |
| 11. J06 generic hold 감소로 job 보호 해제 불가·직접 삭제/corrupt 차단 | 실제 assertion | PASS | 원출력 판정 |
| 12. J14 cleanup Failed는 job 자원만 해제·wall 역행·terminal 자동 재시도 없음 | 실제 assertion | PASS | 원출력 판정 |
| 13. J05 pending·corrupt·tombstone·hash·binding 불일치 source 거부 | 실제 assertion | PASS | 원출력 판정 |
| 14. J07 실제 source 삭제/Intent 경쟁에서 둘 중 한 전이만 허용 | 실제 assertion | PASS | 원출력 판정 |
| 15. J10 checkpoint 전후 job·보호·예약 유지 | 실제 assertion | PASS | 원출력 판정 |
| 16. J09 SQLite·fallback·재build/reopen 내구 job 동등·중복 보호 가산 없음 | 실제 assertion | PASS | 원출력 판정 |
| 17. J10 replay 동일 중복 멱등·다른 내용/불완전/schema/전이/보호 상태 거부 | 실제 assertion | PASS | 원출력 판정 |
| 18. J11 같은 채널 memory+동시 durable 예약 합계 event quota 제한 | 실제 assertion | PASS | 원출력 판정 |
| 19. J12 durable outstanding을 continuous/event/derived disk 예약에 포함 | 실제 assertion | PASS | 원출력 판정 |
| 20. J13 snapshot/disk provider 실패는 생성·periodic·복구 삭제 차단 | 실제 assertion | PASS | 원출력 판정 |
| 21. J15 partial unknown·이유·후보·요청 시간축 그대로 보존 | 실제 assertion | PASS | 원출력 판정 |
| 22. J19 정확한 소유자 소멸 후 새 coordinator만 재결박 | 실제 assertion | PASS | 원출력 판정 |
| 23. J20 append 거부 후 원장 복원해도 공통 mutation 차단 | 실제 assertion | PASS | 원출력 판정 |

개별 assertion 23행을 원출력과 대조했다.

### lp18-job-validation-01.txt

[원출력](lp18-job-validation-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. P0-PERF01 literal source1 sample250 slice45 complete | 실제 assertion | PASS | 원출력 판정 |
| 2. P0-PERF01 canonical record roundtrip unchanged | 실제 assertion | PASS | 원출력 판정 |
| 3. P0-PERF02 baseline canonical hash literal unchanged | 실제 assertion | PASS | 원출력 판정 |
| 4. P0-PERF01 source mapping conflict rejected | 실제 assertion | PASS | 원출력 판정 |
| 5. P0-PERF01 selection table mapping conflict rejected | 실제 assertion | PASS | 원출력 판정 |
| 6. P0-PERF01 job identity forgery rejected | 실제 assertion | PASS | 원출력 판정 |
| 7. LP09-S03a native exact selection and proof survive job roundtrip | 실제 assertion | PASS | 원출력 판정 |
| 8. LP09-S03a noncontiguous exact slices rejected | 실제 assertion | PASS | 원출력 판정 |
| 9. LP09-S03a observed identity and native interval mismatch rejected | 실제 assertion | PASS | 원출력 판정 |
| 10. LP09-S03a native profile cannot drop file evidence | 실제 assertion | PASS | 원출력 판정 |
| 11. LP09-S03a overlapping substitute AU cannot replace selected identity | 실제 assertion | PASS | 원출력 판정 |

개별 assertion 11행을 원출력과 대조했다.

### lp18-job-service-01.txt

[원출력](lp18-job-service-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. F12 실제 remux의 다른 selection 결박 거부 | 실제 assertion | PASS | 원출력 판정 |
| 2. F12 실제 remux provenance의 요청 범위 위조 거부 | 실제 assertion | PASS | 원출력 판정 |
| 3. F12 실제 remux의 foreign unfulfilled 범위 거부 | 실제 assertion | PASS | 원출력 판정 |
| 4. F01 실제 writer→선택→Intent→파생 파일→게시→Complete | 실제 assertion | PASS | 원출력 판정 |
| 5. F01 실제 catalog/file/hash/단일 commit/hold 해제/cleanup 및 직접 decode | 실제 assertion | PASS | 원출력 판정 |
| 6. F15 단일 service·동시 Run·외부 terminal release 거부 | 실제 assertion | PASS | 원출력 판정 |
| 7. F16 active source 삭제 거부·동일 사유 비보호 원본 삭제 positive control | 실제 assertion | PASS | 원출력 판정 |
| 8. F02 두 출력 독립 epoch·unknown UTC·실제 AU/visible 출처 보존 | 실제 assertion | PASS | 원출력 판정 |
| 9. F12 Complete 출처 전수 canonical roundtrip | 실제 assertion | PASS | 원출력 판정 |
| 10. F12 Ready 포함 Intent 잘못된 상태 거부 | 실제 assertion | PASS | 원출력 판정 |
| 11. F12 미지원 필드 엄격 거부 | 실제 assertion | PASS | 원출력 판정 |
| 12. F14 Ready JSON 4MiB 명시 상한 거부 | 실제 assertion | PASS | 원출력 판정 |
| 13. F12 출력 receipt inode 별칭 거부 | 실제 assertion | PASS | 원출력 판정 |
| 14. F03 Intent 생성 전 프로세스 중단 | 실제 assertion | PASS | 원출력 판정 |
| 15. F04 receipt 전 실물의 소유권 미확인 보호 유지 | 실제 assertion | PASS | 원출력 판정 |
| 16. F05 receipt 이후 Intent 중단 소유물 정리 | 실제 assertion | PASS | 원출력 판정 |
| 17. F06 Ready 중단 뒤 재렌더 없이 완료 | 실제 assertion | PASS | 원출력 판정 |
| 18. F07 첫 출력 link 중단 쌍 복구 | 실제 assertion | PASS | 원출력 판정 |
| 19. F07 두 번째 출력 link 중단 쌍 복구 | 실제 assertion | PASS | 원출력 판정 |
| 20. F08 전체 publish 후 commit 전 중단 | 실제 assertion | PASS | 원출력 판정 |
| 21. F09 원자 commit 후 cleanup 전 중단 | 실제 assertion | PASS | 원출력 판정 |
| 22. F10 첫 temp 삭제 중단 | 실제 assertion | PASS | 원출력 판정 |
| 23. F10 두 번째 temp 삭제 중단 | 실제 assertion | PASS | 원출력 판정 |
| 24. F10 attempt 디렉터리 삭제 중단 | 실제 assertion | PASS | 원출력 판정 |
| 25. F10 job 디렉터리 삭제 중단 | 실제 assertion | PASS | 원출력 판정 |
| 26. F10 Complete mutation 직전 중단 | 실제 assertion | PASS | 원출력 판정 |
| 27. F10 Failed cleanup attempt 삭제 중단 | 실제 assertion | PASS | 원출력 판정 |
| 28. F10 Failed cleanup job 삭제 중단 | 실제 assertion | PASS | 원출력 판정 |
| 29. F10 Failed mutation 직전 중단 | 실제 assertion | PASS | 원출력 판정 |
| 30. F11 hash 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 원출력 판정 |
| 31. F11 missing 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 원출력 판정 |
| 32. F11 foreign 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 원출력 판정 |
| 33. F11 symlink 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 원출력 판정 |
| 34. F11 fifo 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 원출력 판정 |
| 35. F11 hardlink 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 원출력 판정 |
| 36. F11 parent 오류 거부·보호/예약 유지 | 실제 assertion | PASS | 원출력 판정 |
| 37. F14 cancel-before-create 생성 중단·소유 cleanup·예약 해제 | 실제 assertion | PASS | 원출력 판정 |
| 38. F14 cancel 생성 중단·소유 cleanup·예약 해제 | 실제 assertion | PASS | 원출력 판정 |
| 39. F14 small 생성 중단·소유 cleanup·예약 해제 | 실제 assertion | PASS | 원출력 판정 |
| 40. F14 deadline 생성 중단·소유 cleanup·예약 해제 | 실제 assertion | PASS | 원출력 판정 |
| 41. F12 SQLite projection·journal fallback job/output 일치 | 실제 assertion | PASS | 원출력 판정 |
| 42. F12 SQLite rebuild·checkpoint 재개방 job/output 일치 | 실제 assertion | PASS | 원출력 판정 |
| 43. F13 Complete output tombstone 뒤 재생성 없음 | 실제 assertion | PASS | 원출력 판정 |

개별 assertion 43행을 원출력과 대조했다.

### lp18-job-timeline-01.txt

[원출력](lp18-job-timeline-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. D3B-01 actual V2 원본·문자열 UTC·독립 unplaced 응답 | 실제 assertion | PASS | 원출력 판정 |
| 2. D3B-14 mismatch/nonintegral mapping은 unplaced | 실제 assertion | PASS | 원출력 판정 |
| 3. D3B-14 mismatch/nonintegral mapping은 unplaced | 실제 assertion | PASS | 원출력 판정 |
| 4. D3B-02 문법/범위 오류400 | 실제 assertion | PASS | 원출력 판정 |
| 5. D3B-02 문법/범위 오류400 | 실제 assertion | PASS | 원출력 판정 |
| 6. D3B-02 문법/범위 오류400 | 실제 assertion | PASS | 원출력 판정 |
| 7. D3B-02 문법/범위 오류400 | 실제 assertion | PASS | 원출력 판정 |
| 8. D3B-02 문법/범위 오류400 | 실제 assertion | PASS | 원출력 판정 |
| 9. D3B-02 문법/범위 오류400 | 실제 assertion | PASS | 원출력 판정 |
| 10. D3B-02 권한 거부403 | 실제 assertion | PASS | 원출력 판정 |
| 11. D3B-13 Intent placeholder no file/null time | 실제 assertion | PASS | 원출력 판정 |
| 12. D3B-13 accepted/no-job 상태 보존 | 실제 assertion | PASS | 원출력 판정 |
| 13. D3B-05 Ready 출력 시간과 재생불가 분리 | 실제 assertion | PASS | 원출력 판정 |
| 14. D3B-05 Committed 출력 시간과 재생불가 분리 | 실제 assertion | PASS | 원출력 판정 |
| 15. D3B-05 실제 검증된 파생2출력 시간/파일 독립 | 실제 assertion | PASS | 원출력 판정 |
| 16. D3B-07 같은 UTC 다른 segment/epoch는 원본 숨김 없음 | 실제 assertion | PASS | 원출력 판정 |
| 17. D3B-13 출력 생성 뒤 job placeholder 없음 | 실제 assertion | PASS | 원출력 판정 |
| 18. D3B-07 page 밖 이벤트도 원본 전체 충족 판정 | 실제 assertion | PASS | 원출력 판정 |
| 19. D3B-06 일부 중첩 원본은 보존 | 실제 assertion | PASS | 원출력 판정 |
| 20. D3B-04 재조회 stable itemId/order | 실제 assertion | PASS | 원출력 판정 |
| 21. D3B-12 요청축/문자열/공개 whitelist | 실제 assertion | PASS | 원출력 판정 |
| 22. D3B-08 동일 size 변조 출력은 비재생 | 실제 assertion | PASS | 원출력 판정 |
| 23. D3B-08 파일 누락 Complete와 재생불가/숨김 분리 | 실제 assertion | PASS | 원출력 판정 |
| 24. D3B-08 실제 tombstone 출력 deleted 보존 | 실제 assertion | PASS | 원출력 판정 |
| 25. D3B-09 source tombstone 뒤 durable UTC 투영 | 실제 assertion | PASS | 원출력 판정 |
| 26. D3B-05 partial 요청 실제 출력 jobComplete | 실제 assertion | PASS | 원출력 판정 |
| 27. D3B-14 actual 출력 mismatch mapping은 unplaced·partial 파일 제공 분리 | 실제 assertion | PASS | 원출력 판정 |
| 28. D3B-13 Failed placeholder no file/null time | 실제 assertion | PASS | 원출력 판정 |
| 29. D3B-03/04 UTC0와 same-file 다중 mapping 독립 ID | 실제 assertion | PASS | 원출력 판정 |
| 30. D3B-03 int64 최대 UTC ns 문자열 정밀도 | 실제 assertion | PASS | 원출력 판정 |
| 31. D3B-11 관련 없는 known4352 누적은 짧은 질의 허용 | 실제 assertion | PASS | 원출력 판정 |
| 32. D3B-11 실제 관련4352 상한 명시 실패 | 실제 assertion | PASS | 원출력 판정 |
| 33. D3B-02/11 관련 상한503 | 실제 assertion | PASS | 원출력 판정 |
| 34. D3B-10/11 unknown4354 count와 bounded 첫 페이지 | 실제 assertion | PASS | 원출력 판정 |
| 35. D3B-10 known/unplaced 독립 동일 offset 페이지 | 실제 assertion | PASS | 원출력 판정 |
| 36. D3B-11 offset+limit overflow 명시 실패 | 실제 assertion | PASS | 원출력 판정 |
| 37. D3B-11 전체 unknown deep-copy 없이35074 첫 페이지 허용 | 실제 assertion | PASS | 원출력 판정 |
| 38. D3B-11 deep offset64MiB workspace 초과는 결과 없이 명시 실패 | 실제 assertion | PASS | 원출력 판정 |

개별 assertion 38행을 원출력과 대조했다.

### lp18-job-media-01.txt

[원출력](lp18-job-media-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. D3A-05 미완료 출력 거부 | 실제 assertion | PASS | 원출력 판정 |
| 2. D3A-05 미완료 출력 거부 | 실제 assertion | PASS | 원출력 판정 |
| 3. D3A-05 미완료 출력 거부 | 실제 assertion | PASS | 원출력 판정 |
| 4. D3A-05 미완료 출력 거부 | 실제 assertion | PASS | 원출력 판정 |
| 5. D3A-02 요청 충족 상태 구분 | 실제 assertion | PASS | 원출력 판정 |
| 6. D3A-01 실제 검증된 Event 출력 제공 | 실제 assertion | PASS | 원출력 판정 |
| 7. D3A-03 권한/다른 채널 거부 | 실제 assertion | PASS | 원출력 판정 |
| 8. D3A-01 application V2 채널 권한 후 제공 | 실제 assertion | PASS | 원출력 판정 |
| 9. D3A-06 제공 중 삭제 거부 | 실제 assertion | PASS | 원출력 판정 |
| 10. D3A-06 fd 해제 후 hold0 | 실제 assertion | PASS | 원출력 판정 |
| 11. D3A-01 실제 검증된 Event 출력 제공 | 실제 assertion | PASS | 원출력 판정 |
| 12. D3A-03 권한/다른 채널 거부 | 실제 assertion | PASS | 원출력 판정 |
| 13. D3A-01 application V2 채널 권한 후 제공 | 실제 assertion | PASS | 원출력 판정 |
| 14. D3A-06 제공 중 삭제 거부 | 실제 assertion | PASS | 원출력 판정 |
| 15. D3A-06 fd 해제 후 hold0 | 실제 assertion | PASS | 원출력 판정 |
| 16. D3A-04 실제 파일 있는 manual Event 거부 | 실제 assertion | PASS | 원출력 판정 |
| 17. D3A-07 immutable metadata 다른 결박 거부 | 실제 assertion | PASS | 원출력 판정 |
| 18. D3A-08 원본 보존 삭제 완료 | 실제 assertion | PASS | 원출력 판정 |
| 19. D3A-08 원본 보존 삭제 완료 | 실제 assertion | PASS | 원출력 판정 |
| 20. D3A-08 원본 삭제 뒤 검증된 출력 제공 | 실제 assertion | PASS | 원출력 판정 |
| 21. D3A-07 실제 파일 크기 변조 거부·hold0 | 실제 assertion | PASS | 원출력 판정 |
| 22. D3A-07 동일 크기 파일 내용 변조 거부·hold0 | 실제 assertion | PASS | 원출력 판정 |
| 23. D3A-06 hold 해제 후 삭제 전이·새 제공 거부 | 실제 assertion | PASS | 원출력 판정 |
| 24. D3A-05 미완료 출력 거부 | 실제 assertion | PASS | 원출력 판정 |
| 25. D3A-05 미완료 출력 거부 | 실제 assertion | PASS | 원출력 판정 |
| 26. D3A-05 미완료 출력 거부 | 실제 assertion | PASS | 원출력 판정 |
| 27. D3A-05 미완료 출력 거부 | 실제 assertion | PASS | 원출력 판정 |
| 28. D3A-02 요청 충족 상태 구분 | 실제 assertion | PASS | 원출력 판정 |
| 29. D3A-02 partial 출력 제공 | 실제 assertion | PASS | 원출력 판정 |
| 30. D3A-03 권한/다른 채널 거부 | 실제 assertion | PASS | 원출력 판정 |
| 31. D3A-01 application V2 채널 권한 후 제공 | 실제 assertion | PASS | 원출력 판정 |
| 32. D3A-06 제공 중 삭제 거부 | 실제 assertion | PASS | 원출력 판정 |
| 33. D3A-06 fd 해제 후 hold0 | 실제 assertion | PASS | 원출력 판정 |
| 34. D3A-02 partial 출력 제공 | 실제 assertion | PASS | 원출력 판정 |
| 35. D3A-03 권한/다른 채널 거부 | 실제 assertion | PASS | 원출력 판정 |
| 36. D3A-01 application V2 채널 권한 후 제공 | 실제 assertion | PASS | 원출력 판정 |
| 37. D3A-06 제공 중 삭제 거부 | 실제 assertion | PASS | 원출력 판정 |
| 38. D3A-06 fd 해제 후 hold0 | 실제 assertion | PASS | 원출력 판정 |
| 39. D3A-04 실제 파일 있는 manual Event 거부 | 실제 assertion | PASS | 원출력 판정 |
| 40. D3A-07 immutable metadata 다른 결박 거부 | 실제 assertion | PASS | 원출력 판정 |
| 41. D3A-08 원본 보존 삭제 완료 | 실제 assertion | PASS | 원출력 판정 |
| 42. D3A-08 원본 보존 삭제 완료 | 실제 assertion | PASS | 원출력 판정 |
| 43. D3A-08 원본 삭제 뒤 검증된 출력 제공 | 실제 assertion | PASS | 원출력 판정 |
| 44. D3A-07 실제 파일 크기 변조 거부·hold0 | 실제 assertion | PASS | 원출력 판정 |
| 45. D3A-07 동일 크기 파일 내용 변조 거부·hold0 | 실제 assertion | PASS | 원출력 판정 |
| 46. D3A-06 hold 해제 후 삭제 전이·새 제공 거부 | 실제 assertion | PASS | 원출력 판정 |

개별 assertion 46행을 원출력과 대조했다.

### lp18-job-retention-01.txt

[원출력](lp18-job-retention-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. B01 V2 tombstone preserves immutable segment without legacy UTC range | 실제 assertion | PASS | 원출력 판정 |
| 2. B02 V2 state records reject malformed payload entity and duplicate conflicts | 실제 assertion | PASS | 원출력 판정 |
| 3. B03 V2 pending corrupt and deleted overlays never mutate finalized payload | 실제 assertion | PASS | 원출력 판정 |
| 4. B04 V2 invalid transitions and finalize retries cannot resurrect state | 실제 assertion | PASS | 원출력 판정 |
| 5. B05 V2 checkpoint and restart preserve overlay tombstone and SQLite parity | 실제 assertion | PASS | 원출력 판정 |
| 6. B06 V2 capacity deletion follows durable order despite reversed UTC | 실제 assertion | PASS | 원출력 판정 |
| 7. B07 mixed legacy and multiple stores use deterministic nonchronological ordering | 실제 assertion | PASS | 원출력 판정 |
| 8. B08 V2 age expiry uses all known mapping ends plus uncertainty rounded upward | 실제 assertion | PASS | 원출력 판정 |
| 9. B09 V2 unknown or overflowing age remains capacity eligible | 실제 assertion | PASS | 원출력 판정 |
| 10. B10 V2 class quotas and disk reserve remain separated | 실제 assertion | PASS | 원출력 판정 |
| 11. B11 V2 pin and hold protect deletion and corruption | 실제 assertion | PASS | 원출력 판정 |
| 12. B12 V2 pending and corrupt bytes remain charged but are not automatic victims | 실제 assertion | PASS | 원출력 판정 |
| 13. B13 V2 apply persists pending before unlink and tombstone after unlink | 실제 assertion | PASS | 원출력 판정 |
| 14. B14 V2 interrupted deletion recovers without resurrection | 실제 assertion | PASS | 원출력 판정 |
| 15. B15 V2 corrupt cleanup requires explicit manual reason | 실제 assertion | PASS | 원출력 판정 |
| 16. B16 V2 continuous media with unknown UTC resolves a healthy held fd | 실제 assertion | PASS | 원출력 판정 |
| 17. B17 V2 wrong channel event and fallback collision cannot expose media | 실제 assertion | PASS | 원출력 판정 |
| 18. B18 V2 missing symlink and multiple hardlink media reject without hold leak | 실제 assertion | PASS | 원출력 판정 |
| 19. B19 V2 same size corruption and invalid container reject without hold leak | 실제 assertion | PASS | 원출력 판정 |
| 20. B20 V2 deletion and playback hold races have one safe winner | 실제 assertion | PASS | 원출력 판정 |
| 21. B21 borrowed fd inspection preserves caller ownership and detects file changes | 실제 assertion | PASS | 원출력 판정 |
| 22. B23 legacy store port refuses unsupported V2 deletion | 실제 assertion | PASS | 원출력 판정 |
| 23. B22 V2 playback is unavailable without GStreamer | 실제 assertion | PASS | 원출력 판정 |
| 24. B23 legacy store port refuses unsupported V2 deletion | 실제 assertion | PASS | 원출력 판정 |

개별 assertion 24행을 원출력과 대조했다.

### lp18-job-cache-01.txt

[원출력](lp18-job-cache-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP15-C01 cold full applied=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 2. LP15-C01 unchanged prefix applied=0 expected=0 | 실제 assertion | PASS | 원출력 판정 |
| 3. LP15-C01 exact prefix suffix only applied=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 4. LP15-C01 independent prefix shadow/full projection equality | 실제 assertion | PASS | 원출력 판정 |
| 5. LP15-C01 full fallback schema applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 6. LP15-C01 full fallback type applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 7. LP15-C01 full fallback id applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 8. LP15-C01 full fallback entity applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 9. LP15-C01 full fallback time applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 10. LP15-C01 full fallback payload applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 11. LP15-C01 full fallback reorder applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 12. LP15-C01 full fallback shrink applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 13. LP15-C01 full fallback null-shadow applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 14. LP15-C01 full fallback null-handle applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 15. LP15-C01 Open clears cache applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 16. LP15-C03 recover full/no-cache | 실제 assertion | PASS | 원출력 판정 |
| 17. LP15-C03 after recover full applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 18. LP15-C03 injected commit refusal discards cache | 실제 assertion | PASS | 원출력 판정 |
| 19. LP15-C03 after commit refusal full applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 20. LP15-C03 suffix exception discards cache | 실제 assertion | PASS | 원출력 판정 |
| 21. LP15-C03 after exception full applied=3 expected=3 | 실제 assertion | PASS | 원출력 판정 |
| 22. LP15-C03 public poisoned entry discards cache | 실제 assertion | PASS | 원출력 판정 |
| 23. LP15-C03 after restored fixture full applied=3 expected=3 | 실제 assertion | PASS | 원출력 판정 |
| 24. LP15-C04 exact byte charge boundary | 실제 assertion | PASS | 원출력 판정 |
| 25. LP15-C04 overflow charge rejected | 실제 assertion | PASS | 원출력 판정 |
| 26. LP15-C04 8192 records admitted | 실제 assertion | PASS | 원출력 판정 |
| 27. LP15-C04 8193 records rejected | 실제 assertion | PASS | 원출력 판정 |
| 28. LP15-C04 64MiB record charge admitted | 실제 assertion | PASS | 원출력 판정 |
| 29. LP15-C04 64MiB plus one rejected | 실제 assertion | PASS | 원출력 판정 |
| 30. LP15-C03 changed candidate prime applied=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 31. LP15-C03 changed candidate suffix12 plus full candidate13 applied=25 expected=25 | 실제 assertion | PASS | 원출력 판정 |
| 32. LP15-C03 changed candidate cache equals independent full projection | 실제 assertion | PASS | 원출력 판정 |
| 33. LP15-C03 compacted candidate prefix reused applied=0 expected=0 | 실제 assertion | PASS | 원출력 판정 |
| 34. LP15-C03 forced projection mismatch discards cache | 실제 assertion | PASS | 원출력 판정 |
| 35. LP15-C04 overlimit prime applied=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 36. LP15-C04 existing cache ignored for oversized original applied=8193 expected=8193 | 실제 assertion | PASS | 원출력 판정 |
| 37. LP15-C04 oversized candidate not retained | 실제 assertion | PASS | 원출력 판정 |
| 38. LP15-C04 next oversized checkpoint full applied=8193 expected=8193 | 실제 assertion | PASS | 원출력 판정 |
| 39. CP01 actual Ready Complete shape canonical files reservation | 실제 assertion | PASS | 원출력 판정 |
| 40. CP02 bounded two jobs over 1MiB canonical transitions | 실제 assertion | PASS | 원출력 판정 |
| 41. LP15-C02 bounded automatic checkpoint and whole transition measurement | 실제 assertion | PASS | 원출력 판정 |
| 42. LP15-C02 reopened full applied=18 expected=18 | 실제 assertion | PASS | 원출력 판정 |
| 43. LP15-C02 actual unchanged prefix applied=0 expected=0 | 실제 assertion | PASS | 원출력 판정 |
| 44. LP15-C02 actual suffix only applied=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 45. LP15-C02 actual job shadow/full projection equality | 실제 assertion | PASS | 원출력 판정 |
| 46. LP15-C03 illegal Ready after Complete suffix rejected by cached/full paths | 실제 assertion | PASS | 원출력 판정 |
| 47. LP15-C04 peakRSS bytes=164823040 cap=536870912 | 실제 assertion | PASS | 원출력 판정 |

개별 assertion 47행을 원출력과 대조했다.

### lp18-job-catalog-01.txt

[원출력](lp18-job-catalog-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. journal open: | 실제 assertion | PASS | 원출력 판정 |
| 2. fallback catalog open: | 실제 assertion | PASS | 원출력 판정 |
| 3. SQLite off mode 표시 | 실제 assertion | PASS | 원출력 판정 |
| 4. segment finalize journal+projection: | 실제 assertion | PASS | 원출력 판정 |
| 5. fallback range query | 실제 assertion | PASS | 원출력 판정 |
| 6. event link FK 위반 거부 | 실제 assertion | PASS | 원출력 판정 |
| 7. FK 위반 transaction/journal 전체 rollback | 실제 assertion | PASS | 원출력 판정 |
| 8. 최초 durable mutation 1개 | 실제 assertion | PASS | 원출력 판정 |
| 9. 동일 mutation 중복 append | 실제 assertion | PASS | 원출력 판정 |
| 10. 손상 사이 정상 durable mutation 보존 | 실제 assertion | PASS | 원출력 판정 |
| 11. 중간 corrupt line count | 실제 assertion | PASS | 원출력 판정 |
| 12. 마지막 truncated line skip | 실제 assertion | PASS | 원출력 판정 |
| 13. fallback replay open | 실제 assertion | PASS | 원출력 판정 |
| 14. 같은 mutation idempotent replay | 실제 assertion | PASS | 원출력 판정 |
| 15. 재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존 | 실제 assertion | PASS | 원출력 판정 |
| 16. 중복 replay row/합계 불증가 | 실제 assertion | PASS | 원출력 판정 |
| 17. 추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구: | 실제 assertion | PASS | 원출력 판정 |
| 18. writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed | 실제 assertion | PASS | 원출력 판정 |
| 19. v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed | 실제 assertion | PASS | 원출력 판정 |
| 20. SQLite catalog open/rebuild: | 실제 assertion | PASS | 원출력 판정 |
| 21. SQLite primary mode 표시 | 실제 assertion | PASS | 원출력 판정 |
| 22. SQLite on/off range query ID·순서 parity | 실제 assertion | PASS | 원출력 판정 |
| 23. journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분 | 실제 assertion | PASS | 원출력 판정 |
| 24. journal 없는 손상 media orphan 구분 | 실제 assertion | PASS | 원출력 판정 |
| 25. projection failover journal open: | 실제 assertion | PASS | 원출력 판정 |
| 26. projection failover catalog open: | 실제 assertion | PASS | 원출력 판정 |
| 27. 실제 SQLite INSERT 실패 trigger 설치 | 실제 assertion | PASS | 원출력 판정 |
| 28. SQLite 투영 실패 뒤 journal+memory finalize 유지: | 실제 assertion | PASS | 원출력 판정 |
| 29. SQLite 투영 실패 즉시 JSONL fallback 전환 | 실제 assertion | PASS | 원출력 판정 |
| 30. 재시작 rebuild 전 실패 trigger 제거 | 실제 assertion | PASS | 원출력 판정 |
| 31. 투영 실패 직후 in-memory query 정합성 유지 | 실제 assertion | PASS | 원출력 판정 |
| 32. projection failover 재시작 journal rebuild: | 실제 assertion | PASS | 원출력 판정 |
| 33. 재시작 후 journal에서 누락 SQLite projection 복구 | 실제 assertion | PASS | 원출력 판정 |
| 34. 재시작 후 SQLite primary 복귀 | 실제 assertion | PASS | 원출력 판정 |
| 35. 재시작 journal rebuild가 실제 SQLite row 복원 | 실제 assertion | PASS | 원출력 판정 |
| 36. tombstone journal open: | 실제 assertion | PASS | 원출력 판정 |
| 37. tombstone catalog open: | 실제 assertion | PASS | 원출력 판정 |
| 38. tombstone 대상 segment finalize: | 실제 assertion | PASS | 원출력 판정 |
| 39. tombstone 대상 deletion request: | 실제 assertion | PASS | 원출력 판정 |
| 40. tombstone 완료 기록: | 실제 assertion | PASS | 원출력 판정 |
| 41. catalog finalize가 tombstone segment ID 재사용을 거부해야 함 | 실제 assertion | PASS | 원출력 판정 |
| 42. 손상 SQLite 격리 후 journal rebuild: | 실제 assertion | PASS | 원출력 판정 |
| 43. 손상 SQLite 원본 격리 | 실제 assertion | PASS | 원출력 판정 |
| 44. 격리 SQLite 파일 보존 | 실제 assertion | PASS | 원출력 판정 |
| 45. 격리 후 journal rebuild 결과 | 실제 assertion | PASS | 원출력 판정 |
| 46. S10-3A future-schema journal read open | 실제 assertion | PASS | 원출력 판정 |
| 47. S10-3A future-schema unsupported classification | 실제 assertion | PASS | 원출력 판정 |
| 48. S10-3A future-schema catalog open denied | 실제 assertion | PASS | 원출력 판정 |
| 49. S10-3A future-schema catalog retry denied | 실제 assertion | PASS | 원출력 판정 |
| 50. S10-3A future-schema journal bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 51. S10-3A future-schema SQLite bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 52. S10-3A future-schema writer cleanup untouched | 실제 assertion | PASS | 원출력 판정 |
| 53. S10-3A arbitrary-schema journal read open | 실제 assertion | PASS | 원출력 판정 |
| 54. S10-3A arbitrary-schema unsupported classification | 실제 assertion | PASS | 원출력 판정 |
| 55. S10-3A arbitrary-schema catalog open denied | 실제 assertion | PASS | 원출력 판정 |
| 56. S10-3A arbitrary-schema catalog retry denied | 실제 assertion | PASS | 원출력 판정 |
| 57. S10-3A arbitrary-schema journal bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 58. S10-3A arbitrary-schema SQLite bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 59. S10-3A arbitrary-schema writer cleanup untouched | 실제 assertion | PASS | 원출력 판정 |
| 60. S10-3A empty-schema journal read open | 실제 assertion | PASS | 원출력 판정 |
| 61. S10-3A empty-schema unsupported classification | 실제 assertion | PASS | 원출력 판정 |
| 62. S10-3A empty-schema catalog open denied | 실제 assertion | PASS | 원출력 판정 |
| 63. S10-3A empty-schema catalog retry denied | 실제 assertion | PASS | 원출력 판정 |
| 64. S10-3A empty-schema journal bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 65. S10-3A empty-schema SQLite bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 66. S10-3A empty-schema writer cleanup untouched | 실제 assertion | PASS | 원출력 판정 |
| 67. S10-3A future-type journal read open | 실제 assertion | PASS | 원출력 판정 |
| 68. S10-3A future-type unsupported classification | 실제 assertion | PASS | 원출력 판정 |
| 69. S10-3A future-type catalog open denied | 실제 assertion | PASS | 원출력 판정 |
| 70. S10-3A future-type catalog retry denied | 실제 assertion | PASS | 원출력 판정 |
| 71. S10-3A future-type journal bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 72. S10-3A future-type SQLite bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 73. S10-3A future-type writer cleanup untouched | 실제 assertion | PASS | 원출력 판정 |
| 74. S10-3A malformed journal open | 실제 assertion | PASS | 원출력 판정 |
| 75. S10-3A malformed JSON missing fields and wrong types remain corrupt | 실제 assertion | PASS | 원출력 판정 |
| 76. S10-O01 reservation journal open | 실제 assertion | PASS | 원출력 판정 |
| 77. S10-O01 first reservation returns four IDs and sequence one | 실제 assertion | PASS | 원출력 판정 |
| 78. S10-O01 versioned reservation payload replays | 실제 assertion | PASS | 원출력 판정 |
| 79. S10-O01 new reservation records actual occurred time | 실제 assertion | PASS | 원출력 판정 |
| 80. S10-O02 identical retry preserves sequence and bytes | 실제 assertion | PASS | 원출력 판정 |
| 81. S10-O03 reopened instance allocates next sequence | 실제 assertion | PASS | 원출력 판정 |
| 82. S10-O03 new process resumes durable sequence | 실제 assertion | PASS | 원출력 판정 |
| 83. S10-O04 different store rejected | 실제 assertion | PASS | 원출력 판정 |
| 84. S10-O04 reused request with different segment rejected | 실제 assertion | PASS | 원출력 판정 |
| 85. S10-O04 reused request with different channel rejected | 실제 assertion | PASS | 원출력 판정 |
| 86. S10-O04 reused segment with different request rejected | 실제 assertion | PASS | 원출력 판정 |
| 87. S10-O04 conflicts preserve original bytes | 실제 assertion | PASS | 원출력 판정 |
| 88. S10-O05/O06 reject and preserve corrupt | 실제 assertion | PASS | 원출력 판정 |
| 89. S10-O05/O06 reject and preserve unsupported-schema | 실제 assertion | PASS | 원출력 판정 |
| 90. S10-O05/O06 reject and preserve unsupported-type | 실제 assertion | PASS | 원출력 판정 |
| 91. S10-O05/O06 reject and preserve tail | 실제 assertion | PASS | 원출력 판정 |
| 92. S10-O05/O06 reject and preserve payload-zero | 실제 assertion | PASS | 원출력 판정 |
| 93. S10-O05/O06 reject and preserve payload-negative | 실제 assertion | PASS | 원출력 판정 |
| 94. S10-O05/O06 reject and preserve payload-fraction | 실제 assertion | PASS | 원출력 판정 |
| 95. S10-O05/O06 reject and preserve payload-overflow | 실제 assertion | PASS | 원출력 판정 |
| 96. S10-O05/O06 reject and preserve duplicate-sequence | 실제 assertion | PASS | 원출력 판정 |
| 97. S10-O05/O06 reject and preserve decreasing-sequence | 실제 assertion | PASS | 원출력 판정 |
| 98. S10-O05/O06 reject and preserve duplicate-request | 실제 assertion | PASS | 원출력 판정 |
| 99. S10-O05/O06 reject and preserve duplicate-segment | 실제 assertion | PASS | 원출력 판정 |
| 100. S10-O05/O06 reject and preserve store-conflict | 실제 assertion | PASS | 원출력 판정 |
| 101. S10-O05/O06 reject and preserve ordinary-before | 실제 assertion | PASS | 원출력 판정 |
| 102. S10-O05/O06 reject and preserve ordinary-after | 실제 assertion | PASS | 원출력 판정 |
| 103. S10-O05/O06 reject and preserve line-cap | 실제 assertion | PASS | 원출력 판정 |
| 104. S10-O05 reservation entity envelope binding rejects mismatch | 실제 assertion | PASS | 원출력 판정 |
| 105. S10-O05 reservation request envelope binding rejects mismatch | 실제 assertion | PASS | 원출력 판정 |
| 106. S10-O01 strict reservation parser accepts versioned literal | 실제 assertion | PASS | 원출력 판정 |
| 107. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 원출력 판정 |
| 108. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 원출력 판정 |
| 109. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 원출력 판정 |
| 110. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 원출력 판정 |
| 111. S10-O06 INT64_MAX identical retry remains valid | 실제 assertion | PASS | 원출력 판정 |
| 112. S10-O06 sequence overflow rejected without write | 실제 assertion | PASS | 원출력 판정 |
| 113. S10-O02 identical durable reservation duplicates remain idempotent | 실제 assertion | PASS | 원출력 판정 |
| 114. S10-O06 sequence gaps remain valid and allocate above maximum | 실제 assertion | PASS | 원출력 판정 |
| 115. S10-O07 four simultaneous processes finish reservations | 실제 assertion | PASS | 원출력 판정 |
| 116. S10-O07 concurrent sequences are unique and complete | 실제 assertion | PASS | 원출력 판정 |
| 117. S10-O07 next sequence follows concurrent reservations | 실제 assertion | PASS | 원출력 판정 |
| 118. S10-O08 ordinary Append cannot reserve orders | 실제 assertion | PASS | 원출력 판정 |
| 119. S10-O08 unopened journal rejected | 실제 assertion | PASS | 원출력 판정 |
| 120. S10-O08 null result rejected | 실제 assertion | PASS | 원출력 판정 |
| 121. S10-O08 invalid opaque ID rejected | 실제 assertion | PASS | 원출력 판정 |
| 122. S10-O08 failed reservation does not expose tentative result | 실제 assertion | PASS | 원출력 판정 |
| 123. S10-O09 unsafe file binding rejected and original preserved inode | 실제 assertion | PASS | 원출력 판정 |
| 124. S10-O09 unsafe file binding rejected and original preserved parent | 실제 assertion | PASS | 원출력 판정 |
| 125. S10-O09 unsafe file binding rejected and original preserved symlink | 실제 assertion | PASS | 원출력 판정 |
| 126. S10-O09 unsafe file binding rejected and original preserved hardlink | 실제 assertion | PASS | 원출력 판정 |
| 127. S10-O10 reservation and normal segment coexist in catalog | 실제 assertion | PASS | 원출력 판정 |
| 128. S10-O04 reserve then finalize permits identical retry | 실제 assertion | PASS | 원출력 판정 |
| 129. S10-O10 reservation survives catalog rebuild without changing segment query | 실제 assertion | PASS | 원출력 판정 |
| 130. S10-O04 legacy segment cannot acquire retroactive reservation | 실제 assertion | PASS | 원출력 판정 |
| 131. S10-M06 opened catalog accepts fresh exact reservation V2 finalize | 실제 assertion | PASS | 원출력 판정 |
| 132. S10-M07 V2 find preserves complete metadata | 실제 assertion | PASS | 원출력 판정 |
| 133. S10-M07 identical V2 recovery is idempotent | 실제 assertion | PASS | 원출력 판정 |
| 134. S10-M07 V2 is absent from V1 range query | 실제 assertion | PASS | 원출력 판정 |
| 135. S10-M07 V2 registered path is not orphan | 실제 assertion | PASS | 원출력 판정 |
| 136. S10-M07 SQLite exact V2 JSON and path match | 실제 assertion | PASS | 원출력 판정 |
| 137. S10-M07 JSONL restart preserves V2 exact payload | 실제 assertion | PASS | 원출력 판정 |
| 138. S10-M06 wrong reservation tuple rejected store | 실제 assertion | PASS | 원출력 판정 |
| 139. S10-M06 wrong reservation tuple rejected request | 실제 assertion | PASS | 원출력 판정 |
| 140. S10-M06 wrong reservation tuple rejected segment | 실제 assertion | PASS | 원출력 판정 |
| 141. S10-M06 wrong reservation tuple rejected channel | 실제 assertion | PASS | 원출력 판정 |
| 142. S10-M06 wrong reservation tuple rejected sequence | 실제 assertion | PASS | 원출력 판정 |
| 143. S10-M09 immutable V2 mapping mismatch rejected | 실제 assertion | PASS | 원출력 판정 |
| 144. S10-M09 bad V2 startup retry preserves original state bad-payload | 실제 assertion | PASS | 원출력 판정 |
| 145. S10-M09 bad V2 startup retry preserves original state missing-order | 실제 assertion | PASS | 원출력 판정 |
| 146. S10-M09 bad V2 startup retry preserves original state bad-order | 실제 assertion | PASS | 원출력 판정 |
| 147. S10-M09 bad V2 startup retry preserves original state conflicting-order | 실제 assertion | PASS | 원출력 판정 |
| 148. S10-M09 bad V2 startup retry preserves original state tail | 실제 assertion | PASS | 원출력 판정 |
| 149. S10-M09 bad V2 startup retry preserves original state corrupt | 실제 assertion | PASS | 원출력 판정 |
| 150. S10-M09 bad V2 startup retry preserves original state unsafe-path | 실제 assertion | PASS | 원출력 판정 |
| 151. S10-M09 default off rejects V2 before SQLite changes | 실제 assertion | PASS | 원출력 판정 |
| 152. S10-M09 V2 replay namespace and deletion duplicate | 실제 assertion | PASS | 원출력 판정 |
| 153. S10-M09 V2 replay namespace and deletion deleted | 실제 assertion | PASS | 원출력 판정 |
| 154. S10-M09 V2 replay namespace and deletion v1-before | 실제 assertion | PASS | 원출력 판정 |
| 155. S10-M09 V2 replay namespace and deletion v1-after | 실제 assertion | PASS | 원출력 판정 |
| 156. S10-M09 V2 replay namespace and deletion deleted-before | 실제 assertion | PASS | 원출력 판정 |
| 157. S10-M09 V2 replay namespace and deletion resurrection | 실제 assertion | PASS | 원출력 판정 |
| 158. S10-M09 V2 replay namespace and deletion mutation-collision | 실제 assertion | PASS | 원출력 판정 |
| 159. S10-M09 V2 finalize rejects missing media | 실제 assertion | PASS | 원출력 판정 |
| 160. S10-M09 V2 finalize rejects directory media | 실제 assertion | PASS | 원출력 판정 |
| 161. S10-M09 fresh candidate rejects mapping | 실제 assertion | PASS | 원출력 판정 |
| 162. S10-M09 fresh candidate rejects path | 실제 assertion | PASS | 원출력 판정 |
| 163. S10-M09 fresh candidate rejects tombstone | 실제 assertion | PASS | 원출력 판정 |
| 164. S10-SW01 managed empty root opens with lifetime lease | 실제 assertion | PASS | 원출력 판정 |
| 165. S10-SW02 same process second managed owner denied | 실제 assertion | PASS | 원출력 판정 |
| 166. S10-SW03 different process owner and inherited use denied | 실제 assertion | PASS | 원출력 판정 |
| 167. S10-SW12 managed duplicate descriptors are close-on-exec | 실제 assertion | PASS | 원출력 판정 |
| 168. S10-SW05 managed reserve append replay use owned descriptor | 실제 assertion | PASS | 원출력 판정 |
| 169. S10-SW06 raw managed access and legacy default path denied | 실제 assertion | PASS | 원출력 판정 |
| 170. S10-SW01 managed Reserve rejects different store identity | 실제 assertion | PASS | 원출력 판정 |
| 171. S10-SW10 catalog connection can inspect managed lease | 실제 assertion | PASS | 원출력 판정 |
| 172. S10-SW04 owner destruction releases lease | 실제 assertion | PASS | 원출력 판정 |
| 173. S10-SW01 managed reopen rejects different store identity | 실제 assertion | PASS | 원출력 판정 |
| 174. S10-SW11 managed incomplete tail rejects append without changing bytes | 실제 assertion | PASS | 원출력 판정 |
| 175. S10-SW07 legacy nonempty root preserved without conversion | 실제 assertion | PASS | 원출력 판정 |
| 176. S10-SW08 partial initialization retry validates exact state lease | 실제 assertion | PASS | 원출력 판정 |
| 177. S10-SW08 partial initialization retry validates exact state init | 실제 assertion | PASS | 원출력 판정 |
| 178. S10-SW08 partial initialization retry validates exact state barrier | 실제 assertion | PASS | 원출력 판정 |
| 179. S10-SW08 partial initialization retry validates exact state journal | 실제 assertion | PASS | 원출력 판정 |
| 180. S10-SW08 partial initialization retry validates exact state incomplete | 실제 assertion | PASS | 원출력 판정 |
| 181. S10-SW08 partial initialization retry validates exact state unknown | 실제 assertion | PASS | 원출력 판정 |
| 182. S10-SW09 symlink inode and malformed marker rejected journal | 실제 assertion | PASS | 원출력 판정 |
| 183. S10-SW09 symlink inode and malformed marker rejected marker | 실제 assertion | PASS | 원출력 판정 |
| 184. S10-SW09 symlink inode and malformed marker rejected barrier | 실제 assertion | PASS | 원출력 판정 |
| 185. S10-SW09 symlink inode and malformed marker rejected root-symlink | 실제 assertion | PASS | 원출력 판정 |
| 186. S10-SB01 second managed catalog is denied | 실제 assertion | PASS | 원출력 판정 |
| 187. S10-SB02 failed catalog cannot mutate journal or holds | 실제 assertion | PASS | 원출력 판정 |
| 188. S10-SB03 attached catalog blocks unowned append but permits reservation | 실제 assertion | PASS | 원출력 판정 |
| 189. S10-SB04 catalog destruction releases attachment | 실제 assertion | PASS | 원출력 판정 |
| 190. S10-SB05 managed catalog rejects unsafe options outside | 실제 assertion | PASS | 원출력 판정 |
| 191. S10-SB05 managed catalog rejects unsafe options dotdot | 실제 assertion | PASS | 원출력 판정 |
| 192. S10-SB05 managed catalog rejects unsafe options media-symlink | 실제 assertion | PASS | 원출력 판정 |
| 193. S10-SB05 managed catalog rejects unsafe options sqlite-symlink | 실제 assertion | PASS | 원출력 판정 |
| 194. S10-SB05 managed catalog rejects unsafe options sqlite-hardlink | 실제 assertion | PASS | 원출력 판정 |
| 195. S10-SB05 managed catalog rejects unsafe options disabled | 실제 assertion | PASS | 원출력 판정 |
| 196. S10-SB06 failed open releases catalog attachment | 실제 assertion | PASS | 원출력 판정 |
| 197. S10-SB07 managed SQLite sidecar rejected -wal symlink | 실제 assertion | PASS | 원출력 판정 |
| 198. S10-SB07 managed SQLite sidecar rejected -wal hardlink | 실제 assertion | PASS | 원출력 판정 |
| 199. S10-SB07 managed SQLite sidecar rejected -shm symlink | 실제 assertion | PASS | 원출력 판정 |
| 200. S10-SB07 managed SQLite sidecar rejected -shm hardlink | 실제 assertion | PASS | 원출력 판정 |
| 201. S10-SB07 managed SQLite sidecar rejected -journal symlink | 실제 assertion | PASS | 원출력 판정 |
| 202. S10-SB07 managed SQLite sidecar rejected -journal hardlink | 실제 assertion | PASS | 원출력 판정 |
| 203. S10-SC01 managed repeated event fixture is valid | 실제 assertion | PASS | 원출력 판정 |
| 204. S10-SC02 managed reservations avoid history reads | 실제 assertion | PASS | 원출력 판정 |
| 205. S10-SC03 managed V2 finalize avoids full replay | 실제 assertion | PASS | 원출력 판정 |
| 206. S10-SC04 checkpoint reduces superseded event payload bytes | 실제 assertion | PASS | 원출력 판정 |
| 207. S10-SC05 checkpoint preserves latest event and all record identities | 실제 assertion | PASS | 원출력 판정 |
| 208. S10-SC06 checkpoint is idempotent and preserves V2 | 실제 assertion | PASS | 원출력 판정 |
| 209. S10-SC08 receipt preserves retry identity and rejects direct append | 실제 assertion | PASS | 원출력 판정 |
| 210. S10-SC09 checkpoint restart preserves SQLite and JSONL state sqlite | 실제 assertion | PASS | 원출력 판정 |
| 211. S10-SC09 managed checkpoint SQL V2 payload and path | 실제 assertion | PASS | 원출력 판정 |
| 212. S10-SC09 checkpoint restart preserves SQLite and JSONL state jsonl | 실제 assertion | PASS | 원출력 판정 |
| 213. S10-SC10 checkpoint prefix recovers before writes | 실제 assertion | PASS | 원출력 판정 |
| 214. S10-SC11 checkpoint mismatch preserves bytes and poisons owner | 실제 assertion | PASS | 원출력 판정 |
| 215. S10-SC12 first accepted mutation controls latest event | 실제 assertion | PASS | 원출력 판정 |
| 216. S10-SC16 automatic checkpoint uses accumulated growth | 실제 assertion | PASS | 원출력 판정 |
| 217. S10-SC07 raw checkpoint is rejected | 실제 assertion | PASS | 원출력 판정 |
| 218. S10-SC18 checkpoint syscall failure poisons and reopens write | 실제 assertion | PASS | 원출력 판정 |
| 219. S10-SC21 poison rejects hold mutation write | 실제 assertion | PASS | 원출력 판정 |
| 220. S10-SC18 checkpoint syscall failure poisons and reopens file-fsync | 실제 assertion | PASS | 원출력 판정 |
| 221. S10-SC21 poison rejects hold mutation file-fsync | 실제 assertion | PASS | 원출력 판정 |
| 222. S10-SC18 checkpoint syscall failure poisons and reopens rename | 실제 assertion | PASS | 원출력 판정 |
| 223. S10-SC21 poison rejects hold mutation rename | 실제 assertion | PASS | 원출력 판정 |
| 224. S10-SC18 checkpoint syscall failure poisons and reopens dir-fsync | 실제 assertion | PASS | 원출력 판정 |
| 225. S10-SC21 poison rejects hold mutation dir-fsync | 실제 assertion | PASS | 원출력 판정 |
| 226. S10-SC17 checkpoint preserves holds observations and deletion | 실제 assertion | PASS | 원출력 판정 |
| 227. S10-SC17 checkpoint SQL hold observation tombstone | 실제 assertion | PASS | 원출력 판정 |
| 228. S10-SC17 checkpoint preserves holds observations and deletion restart sqlite | 실제 assertion | PASS | 원출력 판정 |
| 229. S10-SC17 checkpoint SQL restart observation tombstone | 실제 assertion | PASS | 원출력 판정 |
| 230. S10-SC17 checkpoint preserves holds observations and deletion restart jsonl | 실제 assertion | PASS | 원출력 판정 |
| 231. S10-SC19 invalid managed history remains unchanged malformed | 실제 assertion | PASS | 원출력 판정 |
| 232. S10-SC19 invalid managed history remains unchanged unsupported | 실제 assertion | PASS | 원출력 판정 |
| 233. S10-SC19 invalid managed history remains unchanged conflict | 실제 assertion | PASS | 원출력 판정 |
| 234. S10-SC20 raw catalog rejects receipt before side effects | 실제 assertion | PASS | 원출력 판정 |
| 235. S10-SC13 crypto off raw remains usable | 실제 assertion | PASS | 원출력 판정 |
| 236. S10-SC14 crypto off checkpoint is rejected | 실제 assertion | PASS | 원출력 판정 |
| 237. S10-SC15 crypto off receipt reopen is rejected | 실제 assertion | PASS | 원출력 판정 |
| 238. source 저장 callback reconcile 연결 | 실제 assertion | PASS | 원출력 판정 |
| 239. policy revision idempotency | 실제 assertion | PASS | 원출력 판정 |
| 240. 5초 safety reconcile | 실제 assertion | PASS | 원출력 판정 |
| 241. composition root 관리 저장소 선행 open | 실제 assertion | PASS | 원출력 판정 |
| 242. composition helper journal 다음 catalog rebuild/open | 실제 assertion | PASS | 원출력 판정 |
| 243. 서버 전 supervisor 시작 | 실제 assertion | PASS | 원출력 판정 |
| 244. ingress 전 event bridge 등록 | 실제 assertion | PASS | 원출력 판정 |
| 245. ingress 종료 뒤 recorder finalize | 실제 assertion | PASS | 원출력 판정 |
| 246. composition root 시작/종료 순서 | 실제 assertion | PASS | 원출력 판정 |

개별 assertion 246행을 원출력과 대조했다.

### lp17-jobs-lp18-job-01.txt

[원출력](lp17-jobs-lp18-job-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. FC01 exact insertion checks count=97 | 실제 assertion | PASS | 원출력 판정 |
| 2. D08.input-keyframes | 실제 assertion | PASS | 원출력 판정 |
| 3. D08.source-shape | 실제 assertion | PASS | 원출력 판정 |
| 4. D08.selection-complete | 실제 assertion | PASS | 원출력 판정 |
| 5. D08.expected-intent-built | 실제 assertion | PASS | 원출력 판정 |
| 6. D08.admission | 실제 assertion | PASS | 원출력 판정 |
| 7. D08.expected-state | 실제 assertion | PASS | 원출력 판정 |
| 8. D08.canonical-intent | 실제 assertion | PASS | 원출력 판정 |
| 9. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 판정 |
| 10. D08.expected-state | 실제 assertion | PASS | 원출력 판정 |
| 11. D08.canonical-intent | 실제 assertion | PASS | 원출력 판정 |
| 12. D08.files-receipt | 실제 assertion | PASS | 원출력 판정 |
| 13. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 판정 |
| 14. D08.expected-state | 실제 assertion | PASS | 원출력 판정 |
| 15. D08.canonical-intent | 실제 assertion | PASS | 원출력 판정 |
| 16. D08.files-receipt | 실제 assertion | PASS | 원출력 판정 |
| 17. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 판정 |
| 18. D08.ready-verified-proof | 실제 assertion | PASS | 원출력 판정 |
| 19. D08.expected-state | 실제 assertion | PASS | 원출력 판정 |
| 20. D08.canonical-intent | 실제 assertion | PASS | 원출력 판정 |
| 21. D08.files-receipt | 실제 assertion | PASS | 원출력 판정 |
| 22. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 판정 |
| 23. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 판정 |
| 24. D08.expected-state | 실제 assertion | PASS | 원출력 판정 |
| 25. D08.canonical-intent | 실제 assertion | PASS | 원출력 판정 |
| 26. D08.files-receipt | 실제 assertion | PASS | 원출력 판정 |
| 27. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 판정 |
| 28. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 판정 |
| 29. D08.protection-released | 실제 assertion | PASS | 원출력 판정 |
| 30. D08.run-complete | 실제 assertion | PASS | 원출력 판정 |
| 31. D08.actual-output-hash | 실제 assertion | PASS | 원출력 판정 |
| 32. D08.selection-complete | 실제 assertion | PASS | 원출력 판정 |
| 33. D08.expected-intent-built | 실제 assertion | PASS | 원출력 판정 |
| 34. D08.admission | 실제 assertion | PASS | 원출력 판정 |
| 35. D08.expected-state | 실제 assertion | PASS | 원출력 판정 |
| 36. D08.canonical-intent | 실제 assertion | PASS | 원출력 판정 |
| 37. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 판정 |
| 38. D08.expected-state | 실제 assertion | PASS | 원출력 판정 |
| 39. D08.canonical-intent | 실제 assertion | PASS | 원출력 판정 |
| 40. D08.files-receipt | 실제 assertion | PASS | 원출력 판정 |
| 41. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 판정 |
| 42. D08.expected-state | 실제 assertion | PASS | 원출력 판정 |
| 43. D08.canonical-intent | 실제 assertion | PASS | 원출력 판정 |
| 44. D08.files-receipt | 실제 assertion | PASS | 원출력 판정 |
| 45. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 판정 |
| 46. D08.ready-verified-proof | 실제 assertion | PASS | 원출력 판정 |
| 47. D08.expected-state | 실제 assertion | PASS | 원출력 판정 |
| 48. D08.canonical-intent | 실제 assertion | PASS | 원출력 판정 |
| 49. D08.files-receipt | 실제 assertion | PASS | 원출력 판정 |
| 50. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 판정 |
| 51. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 판정 |
| 52. D08.expected-state | 실제 assertion | PASS | 원출력 판정 |
| 53. D08.canonical-intent | 실제 assertion | PASS | 원출력 판정 |
| 54. D08.files-receipt | 실제 assertion | PASS | 원출력 판정 |
| 55. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 판정 |
| 56. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 판정 |
| 57. D08.protection-released | 실제 assertion | PASS | 원출력 판정 |
| 58. D08.run-complete | 실제 assertion | PASS | 원출력 판정 |
| 59. D08.actual-output-hash | 실제 assertion | PASS | 원출력 판정 |
| 60. CP01.actual-ready-complete-shape-canonical-files-reservation | 실제 assertion | PASS | 원출력 판정 |
| 61. CP02.two-jobs-over-1MiB-canonical-transitions | 실제 assertion | PASS | 원출력 판정 |
| 62. D08.input-keyframes | 실제 assertion | PASS | 원출력 판정 |
| 63. D08.source-shape | 실제 assertion | PASS | 원출력 판정 |
| 64. D08.selection-complete | 실제 assertion | PASS | 원출력 판정 |
| 65. D08.expected-intent-built | 실제 assertion | PASS | 원출력 판정 |
| 66. D08.admission | 실제 assertion | PASS | 원출력 판정 |
| 67. D08.expected-state | 실제 assertion | PASS | 원출력 판정 |
| 68. D08.canonical-intent | 실제 assertion | PASS | 원출력 판정 |
| 69. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 판정 |
| 70. D08.expected-state | 실제 assertion | PASS | 원출력 판정 |
| 71. D08.canonical-intent | 실제 assertion | PASS | 원출력 판정 |
| 72. D08.files-receipt | 실제 assertion | PASS | 원출력 판정 |
| 73. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 판정 |
| 74. D08.expected-state | 실제 assertion | PASS | 원출력 판정 |
| 75. D08.canonical-intent | 실제 assertion | PASS | 원출력 판정 |
| 76. D08.files-receipt | 실제 assertion | PASS | 원출력 판정 |
| 77. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 판정 |
| 78. D08.ready-verified-proof | 실제 assertion | PASS | 원출력 판정 |
| 79. D08.expected-state | 실제 assertion | PASS | 원출력 판정 |
| 80. D08.canonical-intent | 실제 assertion | PASS | 원출력 판정 |
| 81. D08.files-receipt | 실제 assertion | PASS | 원출력 판정 |
| 82. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 판정 |
| 83. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 판정 |
| 84. D08.expected-state | 실제 assertion | PASS | 원출력 판정 |
| 85. D08.canonical-intent | 실제 assertion | PASS | 원출력 판정 |
| 86. D08.files-receipt | 실제 assertion | PASS | 원출력 판정 |
| 87. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 판정 |
| 88. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 판정 |
| 89. D08.protection-released | 실제 assertion | PASS | 원출력 판정 |
| 90. D08.run-complete | 실제 assertion | PASS | 원출력 판정 |
| 91. D08.actual-output-hash | 실제 assertion | PASS | 원출력 판정 |
| 92. D08.selection-complete | 실제 assertion | PASS | 원출력 판정 |
| 93. D08.expected-intent-built | 실제 assertion | PASS | 원출력 판정 |
| 94. D08.admission | 실제 assertion | PASS | 원출력 판정 |
| 95. D08.expected-state | 실제 assertion | PASS | 원출력 판정 |
| 96. D08.canonical-intent | 실제 assertion | PASS | 원출력 판정 |
| 97. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 판정 |
| 98. D08.expected-state | 실제 assertion | PASS | 원출력 판정 |
| 99. D08.canonical-intent | 실제 assertion | PASS | 원출력 판정 |
| 100. D08.files-receipt | 실제 assertion | PASS | 원출력 판정 |
| 101. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 판정 |
| 102. D08.expected-state | 실제 assertion | PASS | 원출력 판정 |
| 103. D08.canonical-intent | 실제 assertion | PASS | 원출력 판정 |
| 104. D08.files-receipt | 실제 assertion | PASS | 원출력 판정 |
| 105. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 판정 |
| 106. D08.ready-verified-proof | 실제 assertion | PASS | 원출력 판정 |
| 107. D08.expected-state | 실제 assertion | PASS | 원출력 판정 |
| 108. D08.canonical-intent | 실제 assertion | PASS | 원출력 판정 |
| 109. D08.files-receipt | 실제 assertion | PASS | 원출력 판정 |
| 110. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 판정 |
| 111. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 판정 |
| 112. D08.expected-state | 실제 assertion | PASS | 원출력 판정 |
| 113. D08.canonical-intent | 실제 assertion | PASS | 원출력 판정 |
| 114. D08.files-receipt | 실제 assertion | PASS | 원출력 판정 |
| 115. D08.canonical-record-roundtrip | 실제 assertion | PASS | 원출력 판정 |
| 116. D08.canonical-ready-preserved | 실제 assertion | PASS | 원출력 판정 |
| 117. D08.protection-released | 실제 assertion | PASS | 원출력 판정 |
| 118. D08.run-complete | 실제 assertion | PASS | 원출력 판정 |
| 119. D08.actual-output-hash | 실제 assertion | PASS | 원출력 판정 |
| 120. CP01.actual-ready-complete-shape-canonical-files-reservation | 실제 assertion | PASS | 원출력 판정 |
| 121. CP02.two-jobs-over-1MiB-canonical-transitions | 실제 assertion | PASS | 원출력 판정 |
| runtime-freshness | {"kind":"phase-result","label":"runtime-freshness","diagnosticPass":true,"historicalRssPass":null,"observationValid":null,"semanticPass":null,"cleanupPass":true,"exitCode":0,"signal":null,"stopReason":null,"elapsedMs":622,"groupPeakRssBytes":102875136,"observationFailure":null,"outputBytes":818} | PASS | 실행 경계·정리 |
| compile | {"kind":"phase-result","label":"compile","diagnosticPass":true,"historicalRssPass":null,"observationValid":null,"semanticPass":null,"cleanupPass":true,"exitCode":0,"signal":null,"stopReason":null,"elapsedMs":4306,"groupPeakRssBytes":380059648,"observationFailure":null,"outputBytes":2905} | PASS | 실행 경계·정리 |
| job-B | {"kind":"phase-result","label":"job-B","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":157351936,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"job","arm":"B","samples":501,"count":2,"pass":60,"fail":0},"elapsedMs":13298,"groupPeakRssBytes":182910976,"observationFailure":null,"outputBytes":105364} | PASS | 실행 경계·정리 |
| store-cleanup | {"kind":"store-cleanup","store":"<owned-root>/job-B","bytes":5147594,"removed":true} | PASS | 실행 경계·정리 |
| job-C | {"kind":"phase-result","label":"job-C","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":108920832,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"job","arm":"C","samples":501,"count":2,"pass":60,"fail":0},"elapsedMs":13283,"groupPeakRssBytes":109641728,"observationFailure":null,"outputBytes":105765} | PASS | 실행 경계·정리 |
| store-cleanup | {"kind":"store-cleanup","store":"<owned-root>/job-C","bytes":5147594,"removed":true} | PASS | 실행 경계·정리 |
| job-input-equality | {"kind":"job-input-equality","sha256":"f8de1cd44038e7433d0c24b3f250f63704b80ba86b468178beb607f0e68ce82e","equal":true} | PASS | 실행 경계·정리 |
| source-unchanged | {"kind":"source-unchanged","unchanged":true} | PASS | 실행 경계·정리 |
| cleanup | {"kind":"cleanup","bytes":18598600,"removed":true} | PASS | 실행 경계·정리 |
| run-result | {"kind":"run-result","mode":"jobs","id":"lp18-job-01","diagnosticPass":true,"failure":null,"phases":4,"elapsedMs":31761,"productPass":false,"tokenConsumed":null} | PASS | 실행 경계·정리 |

개별 assertion 121행을 원출력과 대조했다.


## job 예상 RED

[원출력](lp18-ownership-red-job-01.txt) — build exit0, focused exit1; 10PASS/3FAIL. wrapper exit0는 예상 RED 일치만 뜻한다. source 불변, process group 정리, root6155212B 삭제 확인. elapsed3598ms. token은 집계 미제공.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-J03 initial canonical and active source protection preserved | 실제 assertion | PASS | 사전등록한 RED의 실제 판정 |
| 2. LP18-J03 FindDerivedJob returns independent value | 실제 assertion | PASS | 사전등록한 RED의 실제 판정 |
| 3. LP18-J03 full and active snapshots return independent values | 실제 assertion | PASS | 사전등록한 RED의 실제 판정 |
| 4. LP18-J03 foreign Prepared owner rejected without transition | 실제 assertion | PASS | 사전등록한 RED의 실제 판정 |
| 5. LP18-J02 validated record is published as the same owned object | 실제 assertion | FAIL | 사전등록한 RED의 실제 판정 |
| 6. LP18-J02 Prepared prior retains pre-publication canonical value | 실제 assertion | FAIL | 사전등록한 RED의 실제 판정 |
| 7. LP18-J03 consumed Prepared cannot apply twice | 실제 assertion | PASS | 사전등록한 RED의 실제 판정 |
| 8. LP18-J03 invalid terminal transition preserves state and bytes | 실제 assertion | PASS | 사전등록한 RED의 실제 판정 |
| 9. LP18-J03 terminal protection and service owner released | 실제 assertion | PASS | 사전등록한 RED의 실제 판정 |
| 10. LP18-J01 checkpoint shares current live job object | 실제 assertion | FAIL | 사전등록한 RED의 실제 판정 |
| 11. LP18-J04 full journal bytes and terminal record roundtrip preserved | 실제 assertion | PASS | 사전등록한 RED의 실제 판정 |
| 12. LP18-J04 SQLite reopen preserves terminal canonical and release | 실제 assertion | PASS | 사전등록한 RED의 실제 판정 |
| 13. LP18-J04 JSONL reopen preserves terminal canonical and release | 실제 assertion | PASS | 사전등록한 RED의 실제 판정 |

원출력 개별 assertion 13행 대조 완료.


## binding 결과: lp18-ownership-green-binding-01.txt

[원출력](lp18-ownership-green-binding-01.txt) — 명령·source·환경·상한·정리는 원출력과 중앙 LP18에 보존한다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| build | {"kind":"phase","label":"build","exit":1,"signal":null,"stopReason":null,"cleanup":true,"elapsedMs":2216,"groupPeakRssBytes":307347456} | FAIL | 준비 실패를 제품 PASS로 확대하지 않음 |
| failure | {"kind":"failure","code":"LP18_BUILD"} | FAIL | 준비 실패를 제품 PASS로 확대하지 않음 |
| source-unchanged | {"kind":"source-unchanged","unchanged":true} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |
| cleanup | {"kind":"cleanup","bytes":335407,"removed":true} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |
| result | {"kind":"result","utc":"2026-09-19T13:58:38.892Z","mode":"green","matched":false,"productPass":false,"elapsedMs":2229} | FAIL | 준비 실패를 제품 PASS로 확대하지 않음 |

원출력 개별 assertion 0행 대조 완료.

## binding 결과: lp18-ownership-green-binding-02.txt

[원출력](lp18-ownership-green-binding-02.txt) — 명령·source·환경·상한·정리는 원출력과 중앙 LP18에 보존한다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| build | {"kind":"phase","label":"build","exit":0,"signal":null,"stopReason":null,"cleanup":true,"elapsedMs":2367,"groupPeakRssBytes":312672256} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |
| 1. LP18-O01 owner checked read view shares journal envelope | 실제 assertion | PASS | 원출력 판정 |
| 2. LP18-O01 shared journal original candidate envelopes | 실제 assertion | PASS | 원출력 판정 |
| 3. LP18-O01 public Replay value mutation remains isolated | 실제 assertion | PASS | 원출력 판정 |
| 4. LP18-O01 retained prefix shares journal envelope | 실제 assertion | PASS | 원출력 판정 |
| 5. LP18-O01 full canonical and projection oracle | 실제 assertion | PASS | 원출력 판정 |
| 6. LP18-O03 stale candidate after reservation rejected | 실제 assertion | PASS | 원출력 판정 |
| 7. LP18-O03 foreign owner candidate rejected | 실제 assertion | PASS | 원출력 판정 |
| 8. LP18-O04 exact field order or prefix mutation rejected schema | 실제 assertion | PASS | 원출력 판정 |
| 9. LP18-O04 standalone candidate fields rejected without disk change schema | 실제 assertion | PASS | 원출력 판정 |
| 10. LP18-O04 exact field order or prefix mutation rejected type | 실제 assertion | PASS | 원출력 판정 |
| 11. LP18-O04 standalone candidate fields rejected without disk change type | 실제 assertion | PASS | 원출력 판정 |
| 12. LP18-O04 exact field order or prefix mutation rejected id | 실제 assertion | PASS | 원출력 판정 |
| 13. LP18-O04 standalone candidate fields rejected without disk change id | 실제 assertion | PASS | 원출력 판정 |
| 14. LP18-O04 exact field order or prefix mutation rejected entity | 실제 assertion | PASS | 원출력 판정 |
| 15. LP18-O04 standalone candidate fields rejected without disk change entity | 실제 assertion | PASS | 원출력 판정 |
| 16. LP18-O04 exact field order or prefix mutation rejected time | 실제 assertion | PASS | 원출력 판정 |
| 17. LP18-O04 standalone candidate fields rejected without disk change time | 실제 assertion | PASS | 원출력 판정 |
| 18. LP18-O04 exact field order or prefix mutation rejected payload | 실제 assertion | PASS | 원출력 판정 |
| 19. LP18-O04 standalone candidate fields rejected without disk change payload | 실제 assertion | PASS | 원출력 판정 |
| 20. LP18-O04 exact field order or prefix mutation rejected reorder | 실제 assertion | PASS | 원출력 판정 |
| 21. LP18-O04 standalone candidate fields rejected without disk change reorder | 실제 assertion | PASS | 원출력 판정 |
| 22. LP18-O04 exact field order or prefix mutation rejected shrink | 실제 assertion | PASS | 원출력 판정 |
| 23. LP18-O04 standalone candidate fields rejected without disk change shrink | 실제 assertion | PASS | 원출력 판정 |
| 24. LP18-O04 null envelope safely rejected | 실제 assertion | PASS | 원출력 판정 |
| 25. LP18-O02 only transformed receipts own new envelopes | 실제 assertion | PASS | 원출력 판정 |
| 26. LP18-O02 prepared receipts preserve original canonical bytes | 실제 assertion | PASS | 원출력 판정 |
| 27. LP18-O02 publication bytes and prior owned snapshot remain exact | 실제 assertion | PASS | 원출력 판정 |
| 28. LP18-O02 published journal and prefix share transformed receipt envelopes | 실제 assertion | PASS | 원출력 판정 |
| 29. LP18-O02 receipt independent full projection equality | 실제 assertion | PASS | 원출력 판정 |
| 30. LP18-O03 stale candidate after ordinary append rejected | 실제 assertion | PASS | 원출력 판정 |
| 31. LP18-O05 8192 logical records admitted | 실제 assertion | PASS | 원출력 판정 |
| 32. LP18-O05 8193 aliases still rejected | 실제 assertion | PASS | 원출력 판정 |
| 33. LP18-O05 64MiB logical bytes admitted | 실제 assertion | PASS | 원출력 판정 |
| 34. LP18-O05 64MiB plus one rejected | 실제 assertion | PASS | 원출력 판정 |
| 35. LP18-O07 append accepted shares journal envelope | 실제 assertion | PASS | 원출력 판정 |
| 36. LP18-O09 successful append retry returns exact input envelope | 실제 assertion | PASS | 원출력 판정 |
| 37. LP18-O09 failed append clears prior output handle | 실제 assertion | PASS | 원출력 판정 |
| 38. LP18-O09 borrowed input survives aliased output reset | 실제 assertion | PASS | 원출력 판정 |
| 39. LP18-O07 checkpoint accepted shares live journal envelope | 실제 assertion | PASS | 원출력 판정 |
| 40. LP18-O07 accepted full canonical and durable bytes unchanged | 실제 assertion | PASS | 원출력 판정 |
| 41. LP18-O08 reopen accepted shares journal envelope sqlite | 실제 assertion | PASS | 원출력 판정 |
| 42. LP18-O08 reopen canonical ordinal and projection preserved sqlite | 실제 assertion | PASS | 원출력 판정 |
| 43. LP18-O08 SQLite rebuild requires canonical and ordinal gates | 실제 assertion | PASS | 원출력 판정 |
| 44. LP18-O08 reopen accepted shares journal envelope fallback | 실제 assertion | PASS | 원출력 판정 |
| 45. LP18-O08 reopen canonical ordinal and projection preserved fallback | 실제 assertion | PASS | 원출력 판정 |
| 46. LP18-O09 supplied envelope mismatch rejected schema | 실제 assertion | PASS | 원출력 판정 |
| 47. LP18-O09 supplied envelope mismatch rejected type | 실제 assertion | PASS | 원출력 판정 |
| 48. LP18-O09 supplied envelope mismatch rejected id | 실제 assertion | PASS | 원출력 판정 |
| 49. LP18-O09 supplied envelope mismatch rejected entity | 실제 assertion | PASS | 원출력 판정 |
| 50. LP18-O09 supplied envelope mismatch rejected time | 실제 assertion | PASS | 원출력 판정 |
| 51. LP18-O09 supplied envelope mismatch rejected payload | 실제 assertion | PASS | 원출력 판정 |
| 52. LP18-O09 failed apply registers no accepted envelope | 실제 assertion | PASS | 원출력 판정 |
| 53. LP18-O09 supplied exact envelope is retained | 실제 assertion | PASS | 원출력 판정 |
| 54. LP18-O09 duplicate full canonical acceptance and collision rejection preserved | 실제 assertion | PASS | 원출력 판정 |
| 55. LP18-O09 compacted receipt retry returns original input envelope | 실제 assertion | PASS | 원출력 판정 |
| 56. LP18-O11 bound journal identity and canonical bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 57. LP18-O11 public binding value mutation remains isolated | 실제 assertion | PASS | 원출력 판정 |
| 58. LP18-O11 source snapshot binding mutation remains isolated | 실제 assertion | PASS | 원출력 판정 |
| 59. LP18-O12 same ID changed binding rejected without mutation | 실제 assertion | PASS | 원출력 판정 |
| 60. LP18-O12 strict bound identity rejection preserved | 실제 assertion | PASS | 원출력 판정 |
| 61. LP18-O10 checkpoint shadow shares current live binding | 실제 assertion | PASS | 원출력 판정 |
| 62. LP18-O13 independent full replay binding projection preserved | 실제 assertion | PASS | 원출력 판정 |
| 63. LP18-O12 unusable binding pool falls back to independent strict value null | 실제 assertion | PASS | 원출력 판정 |
| 64. LP18-O12 unusable binding pool falls back to independent strict value different-content | 실제 assertion | PASS | 원출력 판정 |
| 65. LP18-O12 unusable binding pool falls back to independent strict value different-id | 실제 assertion | PASS | 원출력 판정 |
| 66. LP18-O12 matching pool cannot bypass invalid binding input | 실제 assertion | PASS | 원출력 판정 |
| 67. LP18-O12 matching pool cannot bypass missing order | 실제 assertion | PASS | 원출력 판정 |
| 68. LP18-O10 binding survives source pool owner destruction | 실제 assertion | PASS | 원출력 판정 |
| 69. LP18-O10 no-op checkpoint preserves handles without binding comparisons | 실제 assertion | PASS | 원출력 판정 |
| 70. LP18-O10 duplicate mutation does not recompare existing binding | 실제 assertion | PASS | 원출력 판정 |
| 71. LP18-O10 new bound ID compares only its matching pool entry | 실제 assertion | PASS | 원출력 판정 |
| 72. LP18-O12 deleted source hidden with internal binding preserved | 실제 assertion | PASS | 원출력 판정 |
| 73. LP18-O10 deleted checkpoint retains shared binding evidence | 실제 assertion | PASS | 원출력 판정 |
| 74. LP18-O13 reopen deleted canonical binding preserved sqlite | 실제 assertion | PASS | 원출력 판정 |
| 75. LP18-O10 reopened checkpoint shares live binding sqlite | 실제 assertion | PASS | 원출력 판정 |
| 76. LP18-O13 reopen deleted canonical binding preserved fallback | 실제 assertion | PASS | 원출력 판정 |
| 77. LP18-O10 reopened checkpoint shares live binding fallback | 실제 assertion | PASS | 원출력 판정 |
| 실행 관측 | [summary] LP18 pass=77 fail=0 | PASS | 위 assertion과 command exit 함께 확인 |
| focused | {"kind":"phase","label":"focused","exit":0,"signal":null,"stopReason":null,"cleanup":true,"elapsedMs":695,"groupPeakRssBytes":2441216} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |
| source-unchanged | {"kind":"source-unchanged","unchanged":true} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |
| cleanup | {"kind":"cleanup","bytes":6059283,"removed":true} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |
| result | {"kind":"result","utc":"2026-09-19T13:59:33.868Z","mode":"green","matched":true,"productPass":true,"elapsedMs":3078} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |

원출력 개별 assertion 77행 대조 완료.

## binding 결과: lp18-binding-source-01.txt

[원출력](lp18-binding-source-01.txt) — 명령·source·환경·상한·정리는 원출력과 중앙 LP18에 보존한다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. S10-C301 결박 schema 왕복 | 실제 assertion | PASS | 원출력 판정 |
| 2. S10-C302 식별·ordinal 검증 | 실제 assertion | PASS | 원출력 판정 |
| 3. S10-C303 PTS 재정렬 보존 | 실제 assertion | PASS | 원출력 판정 |
| 4. S10-C304 미디어 범위·timebase | 실제 assertion | PASS | 원출력 판정 |
| 5. S10-C305 색인 상한·미색인 꼬리 | 실제 assertion | PASS | 원출력 판정 |
| 6. S10-C306 단일 bound mutation | 실제 assertion | PASS | 원출력 판정 |
| 7. S10-C307 source·저장 identity 결박 | 실제 assertion | PASS | 원출력 판정 |
| 8. S10-C308 불변·멱등 | 실제 assertion | PASS | 원출력 판정 |
| 9. S10-C309 소급·다운그레이드 금지 | 실제 assertion | PASS | 원출력 판정 |
| 10. S10-C310 정확한 원본 tuple 조회 | 실제 assertion | PASS | 원출력 판정 |
| 11. S10-C311 미색인·실제 부재 구분 | 실제 assertion | PASS | 원출력 판정 |
| 12. S10-C312 복수 segment 후보 | 실제 assertion | PASS | 원출력 판정 |
| 13. S10-C313 삭제·corrupt·pending 차단 | 실제 assertion | PASS | 원출력 판정 |
| 14. S10-C314 채널·조회 오류 경계 | 실제 assertion | PASS | 원출력 판정 |
| 15. S10-C315 SQL·JSONL 재시작 동등 | 실제 assertion | PASS | 원출력 판정 |
| 16. S10-C316 checkpoint 보존 | 실제 assertion | PASS | 원출력 판정 |
| 17. S10-C317 손상 원장 선차단 | 실제 assertion | PASS | 원출력 판정 |
| 18. S10-C318 예약·옵트인 경계 | 실제 assertion | PASS | 원출력 판정 |
| 19. S10-C319 기존 segment·조회 불변 | 실제 assertion | PASS | 원출력 판정 |
| 20. S10-C320 실제 finalize 수락 경계 | 실제 assertion | PASS | 원출력 판정 |
| 실행 관측 | [summary] pass=20 fail=0 | PASS | 위 assertion과 command exit 함께 확인 |
| 실행 관측 | [cleanup] path=<owned-root> bytes=6591488 removed=true | PASS | 위 assertion과 command exit 함께 확인 |
| 실행 관측 | [elapsed] seconds=7 source=bash-SECONDS | PASS | 위 assertion과 command exit 함께 확인 |

원출력 개별 assertion 20행 대조 완료.

## binding 결과: lp18-binding-cache-01.txt

[원출력](lp18-binding-cache-01.txt) — 명령·source·환경·상한·정리는 원출력과 중앙 LP18에 보존한다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP15-C01 cold full applied=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 2. LP15-C01 unchanged prefix applied=0 expected=0 | 실제 assertion | PASS | 원출력 판정 |
| 3. LP15-C01 exact prefix suffix only applied=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 4. LP15-C01 independent prefix shadow/full projection equality | 실제 assertion | PASS | 원출력 판정 |
| 5. LP15-C01 full fallback schema applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 6. LP15-C01 full fallback type applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 7. LP15-C01 full fallback id applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 8. LP15-C01 full fallback entity applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 9. LP15-C01 full fallback time applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 10. LP15-C01 full fallback payload applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 11. LP15-C01 full fallback reorder applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 12. LP15-C01 full fallback shrink applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 13. LP15-C01 full fallback null-shadow applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 14. LP15-C01 full fallback null-handle applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 15. LP15-C01 Open clears cache applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 16. LP15-C03 recover full/no-cache | 실제 assertion | PASS | 원출력 판정 |
| 17. LP15-C03 after recover full applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 18. LP15-C03 injected commit refusal discards cache | 실제 assertion | PASS | 원출력 판정 |
| 19. LP15-C03 after commit refusal full applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 |
| 20. LP15-C03 suffix exception discards cache | 실제 assertion | PASS | 원출력 판정 |
| 21. LP15-C03 after exception full applied=3 expected=3 | 실제 assertion | PASS | 원출력 판정 |
| 22. LP15-C03 public poisoned entry discards cache | 실제 assertion | PASS | 원출력 판정 |
| 23. LP15-C03 after restored fixture full applied=3 expected=3 | 실제 assertion | PASS | 원출력 판정 |
| 24. LP15-C04 exact byte charge boundary | 실제 assertion | PASS | 원출력 판정 |
| 25. LP15-C04 overflow charge rejected | 실제 assertion | PASS | 원출력 판정 |
| 26. LP15-C04 8192 records admitted | 실제 assertion | PASS | 원출력 판정 |
| 27. LP15-C04 8193 records rejected | 실제 assertion | PASS | 원출력 판정 |
| 28. LP15-C04 64MiB record charge admitted | 실제 assertion | PASS | 원출력 판정 |
| 29. LP15-C04 64MiB plus one rejected | 실제 assertion | PASS | 원출력 판정 |
| 30. LP15-C03 changed candidate prime applied=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 31. LP15-C03 changed candidate suffix12 plus full candidate13 applied=25 expected=25 | 실제 assertion | PASS | 원출력 판정 |
| 32. LP15-C03 changed candidate cache equals independent full projection | 실제 assertion | PASS | 원출력 판정 |
| 33. LP15-C03 compacted candidate prefix reused applied=0 expected=0 | 실제 assertion | PASS | 원출력 판정 |
| 34. LP15-C03 forced projection mismatch discards cache | 실제 assertion | PASS | 원출력 판정 |
| 35. LP15-C04 overlimit prime applied=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 36. LP15-C04 existing cache ignored for oversized original applied=8193 expected=8193 | 실제 assertion | PASS | 원출력 판정 |
| 37. LP15-C04 oversized candidate not retained | 실제 assertion | PASS | 원출력 판정 |
| 38. LP15-C04 next oversized checkpoint full applied=8193 expected=8193 | 실제 assertion | PASS | 원출력 판정 |
| 39. CP01 actual Ready Complete shape canonical files reservation | 실제 assertion | PASS | 원출력 판정 |
| 40. CP02 bounded two jobs over 1MiB canonical transitions | 실제 assertion | PASS | 원출력 판정 |
| 41. LP15-C02 bounded automatic checkpoint and whole transition measurement | 실제 assertion | PASS | 원출력 판정 |
| 42. LP15-C02 reopened full applied=18 expected=18 | 실제 assertion | PASS | 원출력 판정 |
| 43. LP15-C02 actual unchanged prefix applied=0 expected=0 | 실제 assertion | PASS | 원출력 판정 |
| 44. LP15-C02 actual suffix only applied=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 45. LP15-C02 actual job shadow/full projection equality | 실제 assertion | PASS | 원출력 판정 |
| 46. LP15-C03 illegal Ready after Complete suffix rejected by cached/full paths | 실제 assertion | PASS | 원출력 판정 |
| 실행 관측 | [summary] LP15 pass=44 fail=0 | PASS | 위 assertion과 command exit 함께 확인 |
| 47. LP15-C04 peakRSS bytes=164560896 cap=536870912 | 실제 assertion | PASS | 원출력 판정 |
| 실행 관측 | [cleanup] {"root":"<owned-root>","bytes":16846887,"removed":true} | PASS | 위 assertion과 command exit 함께 확인 |
| 실행 관측 | [exit] code=0 elapsed_seconds=33 source=bash-SECONDS | PASS | 위 assertion과 command exit 함께 확인 |

원출력 개별 assertion 47행 대조 완료.

## binding 결과: lp18-binding-catalog-01.txt

[원출력](lp18-binding-catalog-01.txt) — 명령·source·환경·상한·정리는 원출력과 중앙 LP18에 보존한다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. journal open:  | 실제 assertion | PASS | 원출력 판정 |
| 2. fallback catalog open:  | 실제 assertion | PASS | 원출력 판정 |
| 3. SQLite off mode 표시 | 실제 assertion | PASS | 원출력 판정 |
| 4. segment finalize journal+projection:  | 실제 assertion | PASS | 원출력 판정 |
| 5. fallback range query | 실제 assertion | PASS | 원출력 판정 |
| 6. event link FK 위반 거부 | 실제 assertion | PASS | 원출력 판정 |
| 7. FK 위반 transaction/journal 전체 rollback | 실제 assertion | PASS | 원출력 판정 |
| 8. 최초 durable mutation 1개 | 실제 assertion | PASS | 원출력 판정 |
| 9. 동일 mutation 중복 append | 실제 assertion | PASS | 원출력 판정 |
| 10. 손상 사이 정상 durable mutation 보존 | 실제 assertion | PASS | 원출력 판정 |
| 11. 중간 corrupt line count | 실제 assertion | PASS | 원출력 판정 |
| 12. 마지막 truncated line skip | 실제 assertion | PASS | 원출력 판정 |
| 13. fallback replay open | 실제 assertion | PASS | 원출력 판정 |
| 14. 같은 mutation idempotent replay | 실제 assertion | PASS | 원출력 판정 |
| 15. 재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존 | 실제 assertion | PASS | 원출력 판정 |
| 16. 중복 replay row/합계 불증가 | 실제 assertion | PASS | 원출력 판정 |
| 17. 추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구:  | 실제 assertion | PASS | 원출력 판정 |
| 18. writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed | 실제 assertion | PASS | 원출력 판정 |
| 19. v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed | 실제 assertion | PASS | 원출력 판정 |
| 20. SQLite catalog open/rebuild:  | 실제 assertion | PASS | 원출력 판정 |
| 21. SQLite primary mode 표시 | 실제 assertion | PASS | 원출력 판정 |
| 22. SQLite on/off range query ID·순서 parity | 실제 assertion | PASS | 원출력 판정 |
| 23. journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분 | 실제 assertion | PASS | 원출력 판정 |
| 24. journal 없는 손상 media orphan 구분 | 실제 assertion | PASS | 원출력 판정 |
| 25. projection failover journal open:  | 실제 assertion | PASS | 원출력 판정 |
| 26. projection failover catalog open:  | 실제 assertion | PASS | 원출력 판정 |
| 27. 실제 SQLite INSERT 실패 trigger 설치 | 실제 assertion | PASS | 원출력 판정 |
| 28. SQLite 투영 실패 뒤 journal+memory finalize 유지:  | 실제 assertion | PASS | 원출력 판정 |
| 29. SQLite 투영 실패 즉시 JSONL fallback 전환 | 실제 assertion | PASS | 원출력 판정 |
| 30. 재시작 rebuild 전 실패 trigger 제거 | 실제 assertion | PASS | 원출력 판정 |
| 31. 투영 실패 직후 in-memory query 정합성 유지 | 실제 assertion | PASS | 원출력 판정 |
| 32. projection failover 재시작 journal rebuild:  | 실제 assertion | PASS | 원출력 판정 |
| 33. 재시작 후 journal에서 누락 SQLite projection 복구 | 실제 assertion | PASS | 원출력 판정 |
| 34. 재시작 후 SQLite primary 복귀 | 실제 assertion | PASS | 원출력 판정 |
| 35. 재시작 journal rebuild가 실제 SQLite row 복원 | 실제 assertion | PASS | 원출력 판정 |
| 36. tombstone journal open:  | 실제 assertion | PASS | 원출력 판정 |
| 37. tombstone catalog open:  | 실제 assertion | PASS | 원출력 판정 |
| 38. tombstone 대상 segment finalize:  | 실제 assertion | PASS | 원출력 판정 |
| 39. tombstone 대상 deletion request:  | 실제 assertion | PASS | 원출력 판정 |
| 40. tombstone 완료 기록:  | 실제 assertion | PASS | 원출력 판정 |
| 41. catalog finalize가 tombstone segment ID 재사용을 거부해야 함 | 실제 assertion | PASS | 원출력 판정 |
| 42. 손상 SQLite 격리 후 journal rebuild:  | 실제 assertion | PASS | 원출력 판정 |
| 43. 손상 SQLite 원본 격리 | 실제 assertion | PASS | 원출력 판정 |
| 44. 격리 SQLite 파일 보존 | 실제 assertion | PASS | 원출력 판정 |
| 45. 격리 후 journal rebuild 결과 | 실제 assertion | PASS | 원출력 판정 |
| 46. S10-3A future-schema journal read open | 실제 assertion | PASS | 원출력 판정 |
| 47. S10-3A future-schema unsupported classification | 실제 assertion | PASS | 원출력 판정 |
| 48. S10-3A future-schema catalog open denied | 실제 assertion | PASS | 원출력 판정 |
| 49. S10-3A future-schema catalog retry denied | 실제 assertion | PASS | 원출력 판정 |
| 50. S10-3A future-schema journal bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 51. S10-3A future-schema SQLite bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 52. S10-3A future-schema writer cleanup untouched | 실제 assertion | PASS | 원출력 판정 |
| 53. S10-3A arbitrary-schema journal read open | 실제 assertion | PASS | 원출력 판정 |
| 54. S10-3A arbitrary-schema unsupported classification | 실제 assertion | PASS | 원출력 판정 |
| 55. S10-3A arbitrary-schema catalog open denied | 실제 assertion | PASS | 원출력 판정 |
| 56. S10-3A arbitrary-schema catalog retry denied | 실제 assertion | PASS | 원출력 판정 |
| 57. S10-3A arbitrary-schema journal bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 58. S10-3A arbitrary-schema SQLite bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 59. S10-3A arbitrary-schema writer cleanup untouched | 실제 assertion | PASS | 원출력 판정 |
| 60. S10-3A empty-schema journal read open | 실제 assertion | PASS | 원출력 판정 |
| 61. S10-3A empty-schema unsupported classification | 실제 assertion | PASS | 원출력 판정 |
| 62. S10-3A empty-schema catalog open denied | 실제 assertion | PASS | 원출력 판정 |
| 63. S10-3A empty-schema catalog retry denied | 실제 assertion | PASS | 원출력 판정 |
| 64. S10-3A empty-schema journal bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 65. S10-3A empty-schema SQLite bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 66. S10-3A empty-schema writer cleanup untouched | 실제 assertion | PASS | 원출력 판정 |
| 67. S10-3A future-type journal read open | 실제 assertion | PASS | 원출력 판정 |
| 68. S10-3A future-type unsupported classification | 실제 assertion | PASS | 원출력 판정 |
| 69. S10-3A future-type catalog open denied | 실제 assertion | PASS | 원출력 판정 |
| 70. S10-3A future-type catalog retry denied | 실제 assertion | PASS | 원출력 판정 |
| 71. S10-3A future-type journal bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 72. S10-3A future-type SQLite bytes preserved | 실제 assertion | PASS | 원출력 판정 |
| 73. S10-3A future-type writer cleanup untouched | 실제 assertion | PASS | 원출력 판정 |
| 74. S10-3A malformed journal open | 실제 assertion | PASS | 원출력 판정 |
| 75. S10-3A malformed JSON missing fields and wrong types remain corrupt | 실제 assertion | PASS | 원출력 판정 |
| 76. S10-O01 reservation journal open | 실제 assertion | PASS | 원출력 판정 |
| 77. S10-O01 first reservation returns four IDs and sequence one | 실제 assertion | PASS | 원출력 판정 |
| 78. S10-O01 versioned reservation payload replays | 실제 assertion | PASS | 원출력 판정 |
| 79. S10-O01 new reservation records actual occurred time | 실제 assertion | PASS | 원출력 판정 |
| 80. S10-O02 identical retry preserves sequence and bytes | 실제 assertion | PASS | 원출력 판정 |
| 81. S10-O03 reopened instance allocates next sequence | 실제 assertion | PASS | 원출력 판정 |
| 82. S10-O03 new process resumes durable sequence | 실제 assertion | PASS | 원출력 판정 |
| 83. S10-O04 different store rejected | 실제 assertion | PASS | 원출력 판정 |
| 84. S10-O04 reused request with different segment rejected | 실제 assertion | PASS | 원출력 판정 |
| 85. S10-O04 reused request with different channel rejected | 실제 assertion | PASS | 원출력 판정 |
| 86. S10-O04 reused segment with different request rejected | 실제 assertion | PASS | 원출력 판정 |
| 87. S10-O04 conflicts preserve original bytes | 실제 assertion | PASS | 원출력 판정 |
| 88. S10-O05/O06 reject and preserve corrupt | 실제 assertion | PASS | 원출력 판정 |
| 89. S10-O05/O06 reject and preserve unsupported-schema | 실제 assertion | PASS | 원출력 판정 |
| 90. S10-O05/O06 reject and preserve unsupported-type | 실제 assertion | PASS | 원출력 판정 |
| 91. S10-O05/O06 reject and preserve tail | 실제 assertion | PASS | 원출력 판정 |
| 92. S10-O05/O06 reject and preserve payload-zero | 실제 assertion | PASS | 원출력 판정 |
| 93. S10-O05/O06 reject and preserve payload-negative | 실제 assertion | PASS | 원출력 판정 |
| 94. S10-O05/O06 reject and preserve payload-fraction | 실제 assertion | PASS | 원출력 판정 |
| 95. S10-O05/O06 reject and preserve payload-overflow | 실제 assertion | PASS | 원출력 판정 |
| 96. S10-O05/O06 reject and preserve duplicate-sequence | 실제 assertion | PASS | 원출력 판정 |
| 97. S10-O05/O06 reject and preserve decreasing-sequence | 실제 assertion | PASS | 원출력 판정 |
| 98. S10-O05/O06 reject and preserve duplicate-request | 실제 assertion | PASS | 원출력 판정 |
| 99. S10-O05/O06 reject and preserve duplicate-segment | 실제 assertion | PASS | 원출력 판정 |
| 100. S10-O05/O06 reject and preserve store-conflict | 실제 assertion | PASS | 원출력 판정 |
| 101. S10-O05/O06 reject and preserve ordinary-before | 실제 assertion | PASS | 원출력 판정 |
| 102. S10-O05/O06 reject and preserve ordinary-after | 실제 assertion | PASS | 원출력 판정 |
| 103. S10-O05/O06 reject and preserve line-cap | 실제 assertion | PASS | 원출력 판정 |
| 104. S10-O05 reservation entity envelope binding rejects mismatch | 실제 assertion | PASS | 원출력 판정 |
| 105. S10-O05 reservation request envelope binding rejects mismatch | 실제 assertion | PASS | 원출력 판정 |
| 106. S10-O01 strict reservation parser accepts versioned literal | 실제 assertion | PASS | 원출력 판정 |
| 107. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 원출력 판정 |
| 108. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 원출력 판정 |
| 109. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 원출력 판정 |
| 110. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 원출력 판정 |
| 111. S10-O06 INT64_MAX identical retry remains valid | 실제 assertion | PASS | 원출력 판정 |
| 112. S10-O06 sequence overflow rejected without write | 실제 assertion | PASS | 원출력 판정 |
| 113. S10-O02 identical durable reservation duplicates remain idempotent | 실제 assertion | PASS | 원출력 판정 |
| 114. S10-O06 sequence gaps remain valid and allocate above maximum | 실제 assertion | PASS | 원출력 판정 |
| 115. S10-O07 four simultaneous processes finish reservations | 실제 assertion | PASS | 원출력 판정 |
| 116. S10-O07 concurrent sequences are unique and complete | 실제 assertion | PASS | 원출력 판정 |
| 117. S10-O07 next sequence follows concurrent reservations | 실제 assertion | PASS | 원출력 판정 |
| 118. S10-O08 ordinary Append cannot reserve orders | 실제 assertion | PASS | 원출력 판정 |
| 119. S10-O08 unopened journal rejected | 실제 assertion | PASS | 원출력 판정 |
| 120. S10-O08 null result rejected | 실제 assertion | PASS | 원출력 판정 |
| 121. S10-O08 invalid opaque ID rejected | 실제 assertion | PASS | 원출력 판정 |
| 122. S10-O08 failed reservation does not expose tentative result | 실제 assertion | PASS | 원출력 판정 |
| 123. S10-O09 unsafe file binding rejected and original preserved inode | 실제 assertion | PASS | 원출력 판정 |
| 124. S10-O09 unsafe file binding rejected and original preserved parent | 실제 assertion | PASS | 원출력 판정 |
| 125. S10-O09 unsafe file binding rejected and original preserved symlink | 실제 assertion | PASS | 원출력 판정 |
| 126. S10-O09 unsafe file binding rejected and original preserved hardlink | 실제 assertion | PASS | 원출력 판정 |
| 127. S10-O10 reservation and normal segment coexist in catalog | 실제 assertion | PASS | 원출력 판정 |
| 128. S10-O04 reserve then finalize permits identical retry | 실제 assertion | PASS | 원출력 판정 |
| 129. S10-O10 reservation survives catalog rebuild without changing segment query | 실제 assertion | PASS | 원출력 판정 |
| 130. S10-O04 legacy segment cannot acquire retroactive reservation | 실제 assertion | PASS | 원출력 판정 |
| 131. S10-M06 opened catalog accepts fresh exact reservation V2 finalize | 실제 assertion | PASS | 원출력 판정 |
| 132. S10-M07 V2 find preserves complete metadata | 실제 assertion | PASS | 원출력 판정 |
| 133. S10-M07 identical V2 recovery is idempotent | 실제 assertion | PASS | 원출력 판정 |
| 134. S10-M07 V2 is absent from V1 range query | 실제 assertion | PASS | 원출력 판정 |
| 135. S10-M07 V2 registered path is not orphan | 실제 assertion | PASS | 원출력 판정 |
| 136. S10-M07 SQLite exact V2 JSON and path match | 실제 assertion | PASS | 원출력 판정 |
| 137. S10-M07 JSONL restart preserves V2 exact payload | 실제 assertion | PASS | 원출력 판정 |
| 138. S10-M06 wrong reservation tuple rejected store | 실제 assertion | PASS | 원출력 판정 |
| 139. S10-M06 wrong reservation tuple rejected request | 실제 assertion | PASS | 원출력 판정 |
| 140. S10-M06 wrong reservation tuple rejected segment | 실제 assertion | PASS | 원출력 판정 |
| 141. S10-M06 wrong reservation tuple rejected channel | 실제 assertion | PASS | 원출력 판정 |
| 142. S10-M06 wrong reservation tuple rejected sequence | 실제 assertion | PASS | 원출력 판정 |
| 143. S10-M09 immutable V2 mapping mismatch rejected | 실제 assertion | PASS | 원출력 판정 |
| 144. S10-M09 bad V2 startup retry preserves original state bad-payload | 실제 assertion | PASS | 원출력 판정 |
| 145. S10-M09 bad V2 startup retry preserves original state missing-order | 실제 assertion | PASS | 원출력 판정 |
| 146. S10-M09 bad V2 startup retry preserves original state bad-order | 실제 assertion | PASS | 원출력 판정 |
| 147. S10-M09 bad V2 startup retry preserves original state conflicting-order | 실제 assertion | PASS | 원출력 판정 |
| 148. S10-M09 bad V2 startup retry preserves original state tail | 실제 assertion | PASS | 원출력 판정 |
| 149. S10-M09 bad V2 startup retry preserves original state corrupt | 실제 assertion | PASS | 원출력 판정 |
| 150. S10-M09 bad V2 startup retry preserves original state unsafe-path | 실제 assertion | PASS | 원출력 판정 |
| 151. S10-M09 default off rejects V2 before SQLite changes | 실제 assertion | PASS | 원출력 판정 |
| 152. S10-M09 V2 replay namespace and deletion duplicate | 실제 assertion | PASS | 원출력 판정 |
| 153. S10-M09 V2 replay namespace and deletion deleted | 실제 assertion | PASS | 원출력 판정 |
| 154. S10-M09 V2 replay namespace and deletion v1-before | 실제 assertion | PASS | 원출력 판정 |
| 155. S10-M09 V2 replay namespace and deletion v1-after | 실제 assertion | PASS | 원출력 판정 |
| 156. S10-M09 V2 replay namespace and deletion deleted-before | 실제 assertion | PASS | 원출력 판정 |
| 157. S10-M09 V2 replay namespace and deletion resurrection | 실제 assertion | PASS | 원출력 판정 |
| 158. S10-M09 V2 replay namespace and deletion mutation-collision | 실제 assertion | PASS | 원출력 판정 |
| 159. S10-M09 V2 finalize rejects missing media | 실제 assertion | PASS | 원출력 판정 |
| 160. S10-M09 V2 finalize rejects directory media | 실제 assertion | PASS | 원출력 판정 |
| 161. S10-M09 fresh candidate rejects mapping | 실제 assertion | PASS | 원출력 판정 |
| 162. S10-M09 fresh candidate rejects path | 실제 assertion | PASS | 원출력 판정 |
| 163. S10-M09 fresh candidate rejects tombstone | 실제 assertion | PASS | 원출력 판정 |
| 164. S10-SW01 managed empty root opens with lifetime lease | 실제 assertion | PASS | 원출력 판정 |
| 165. S10-SW02 same process second managed owner denied | 실제 assertion | PASS | 원출력 판정 |
| 166. S10-SW03 different process owner and inherited use denied | 실제 assertion | PASS | 원출력 판정 |
| 167. S10-SW12 managed duplicate descriptors are close-on-exec | 실제 assertion | PASS | 원출력 판정 |
| 168. S10-SW05 managed reserve append replay use owned descriptor | 실제 assertion | PASS | 원출력 판정 |
| 169. S10-SW06 raw managed access and legacy default path denied | 실제 assertion | PASS | 원출력 판정 |
| 170. S10-SW01 managed Reserve rejects different store identity | 실제 assertion | PASS | 원출력 판정 |
| 171. S10-SW10 catalog connection can inspect managed lease | 실제 assertion | PASS | 원출력 판정 |
| 172. S10-SW04 owner destruction releases lease | 실제 assertion | PASS | 원출력 판정 |
| 173. S10-SW01 managed reopen rejects different store identity | 실제 assertion | PASS | 원출력 판정 |
| 174. S10-SW11 managed incomplete tail rejects append without changing bytes | 실제 assertion | PASS | 원출력 판정 |
| 175. S10-SW07 legacy nonempty root preserved without conversion | 실제 assertion | PASS | 원출력 판정 |
| 176. S10-SW08 partial initialization retry validates exact state lease | 실제 assertion | PASS | 원출력 판정 |
| 177. S10-SW08 partial initialization retry validates exact state init | 실제 assertion | PASS | 원출력 판정 |
| 178. S10-SW08 partial initialization retry validates exact state barrier | 실제 assertion | PASS | 원출력 판정 |
| 179. S10-SW08 partial initialization retry validates exact state journal | 실제 assertion | PASS | 원출력 판정 |
| 180. S10-SW08 partial initialization retry validates exact state incomplete | 실제 assertion | PASS | 원출력 판정 |
| 181. S10-SW08 partial initialization retry validates exact state unknown | 실제 assertion | PASS | 원출력 판정 |
| 182. S10-SW09 symlink inode and malformed marker rejected journal | 실제 assertion | PASS | 원출력 판정 |
| 183. S10-SW09 symlink inode and malformed marker rejected marker | 실제 assertion | PASS | 원출력 판정 |
| 184. S10-SW09 symlink inode and malformed marker rejected barrier | 실제 assertion | PASS | 원출력 판정 |
| 185. S10-SW09 symlink inode and malformed marker rejected root-symlink | 실제 assertion | PASS | 원출력 판정 |
| 186. S10-SB01 second managed catalog is denied | 실제 assertion | PASS | 원출력 판정 |
| 187. S10-SB02 failed catalog cannot mutate journal or holds | 실제 assertion | PASS | 원출력 판정 |
| 188. S10-SB03 attached catalog blocks unowned append but permits reservation | 실제 assertion | PASS | 원출력 판정 |
| 189. S10-SB04 catalog destruction releases attachment | 실제 assertion | PASS | 원출력 판정 |
| 190. S10-SB05 managed catalog rejects unsafe options outside | 실제 assertion | PASS | 원출력 판정 |
| 191. S10-SB05 managed catalog rejects unsafe options dotdot | 실제 assertion | PASS | 원출력 판정 |
| 192. S10-SB05 managed catalog rejects unsafe options media-symlink | 실제 assertion | PASS | 원출력 판정 |
| 193. S10-SB05 managed catalog rejects unsafe options sqlite-symlink | 실제 assertion | PASS | 원출력 판정 |
| 194. S10-SB05 managed catalog rejects unsafe options sqlite-hardlink | 실제 assertion | PASS | 원출력 판정 |
| 195. S10-SB05 managed catalog rejects unsafe options disabled | 실제 assertion | PASS | 원출력 판정 |
| 196. S10-SB06 failed open releases catalog attachment | 실제 assertion | PASS | 원출력 판정 |
| 197. S10-SB07 managed SQLite sidecar rejected -wal symlink | 실제 assertion | PASS | 원출력 판정 |
| 198. S10-SB07 managed SQLite sidecar rejected -wal hardlink | 실제 assertion | PASS | 원출력 판정 |
| 199. S10-SB07 managed SQLite sidecar rejected -shm symlink | 실제 assertion | PASS | 원출력 판정 |
| 200. S10-SB07 managed SQLite sidecar rejected -shm hardlink | 실제 assertion | PASS | 원출력 판정 |
| 201. S10-SB07 managed SQLite sidecar rejected -journal symlink | 실제 assertion | PASS | 원출력 판정 |
| 202. S10-SB07 managed SQLite sidecar rejected -journal hardlink | 실제 assertion | PASS | 원출력 판정 |
| 203. S10-SC01 managed repeated event fixture is valid | 실제 assertion | PASS | 원출력 판정 |
| 204. S10-SC02 managed reservations avoid history reads | 실제 assertion | PASS | 원출력 판정 |
| 205. S10-SC03 managed V2 finalize avoids full replay | 실제 assertion | PASS | 원출력 판정 |
| 206. S10-SC04 checkpoint reduces superseded event payload bytes | 실제 assertion | PASS | 원출력 판정 |
| 207. S10-SC05 checkpoint preserves latest event and all record identities | 실제 assertion | PASS | 원출력 판정 |
| 208. S10-SC06 checkpoint is idempotent and preserves V2 | 실제 assertion | PASS | 원출력 판정 |
| 209. S10-SC08 receipt preserves retry identity and rejects direct append | 실제 assertion | PASS | 원출력 판정 |
| 210. S10-SC09 checkpoint restart preserves SQLite and JSONL state sqlite | 실제 assertion | PASS | 원출력 판정 |
| 211. S10-SC09 managed checkpoint SQL V2 payload and path | 실제 assertion | PASS | 원출력 판정 |
| 212. S10-SC09 checkpoint restart preserves SQLite and JSONL state jsonl | 실제 assertion | PASS | 원출력 판정 |
| 213. S10-SC10 checkpoint prefix recovers before writes | 실제 assertion | PASS | 원출력 판정 |
| 214. S10-SC11 checkpoint mismatch preserves bytes and poisons owner | 실제 assertion | PASS | 원출력 판정 |
| 215. S10-SC12 first accepted mutation controls latest event | 실제 assertion | PASS | 원출력 판정 |
| 216. S10-SC16 automatic checkpoint uses accumulated growth | 실제 assertion | PASS | 원출력 판정 |
| 217. S10-SC07 raw checkpoint is rejected | 실제 assertion | PASS | 원출력 판정 |
| 218. S10-SC18 checkpoint syscall failure poisons and reopens write | 실제 assertion | PASS | 원출력 판정 |
| 219. S10-SC21 poison rejects hold mutation write | 실제 assertion | PASS | 원출력 판정 |
| 220. S10-SC18 checkpoint syscall failure poisons and reopens file-fsync | 실제 assertion | PASS | 원출력 판정 |
| 221. S10-SC21 poison rejects hold mutation file-fsync | 실제 assertion | PASS | 원출력 판정 |
| 222. S10-SC18 checkpoint syscall failure poisons and reopens rename | 실제 assertion | PASS | 원출력 판정 |
| 223. S10-SC21 poison rejects hold mutation rename | 실제 assertion | PASS | 원출력 판정 |
| 224. S10-SC18 checkpoint syscall failure poisons and reopens dir-fsync | 실제 assertion | PASS | 원출력 판정 |
| 225. S10-SC21 poison rejects hold mutation dir-fsync | 실제 assertion | PASS | 원출력 판정 |
| 226. S10-SC17 checkpoint preserves holds observations and deletion | 실제 assertion | PASS | 원출력 판정 |
| 227. S10-SC17 checkpoint SQL hold observation tombstone | 실제 assertion | PASS | 원출력 판정 |
| 228. S10-SC17 checkpoint preserves holds observations and deletion restart sqlite | 실제 assertion | PASS | 원출력 판정 |
| 229. S10-SC17 checkpoint SQL restart observation tombstone | 실제 assertion | PASS | 원출력 판정 |
| 230. S10-SC17 checkpoint preserves holds observations and deletion restart jsonl | 실제 assertion | PASS | 원출력 판정 |
| 231. S10-SC19 invalid managed history remains unchanged malformed | 실제 assertion | PASS | 원출력 판정 |
| 232. S10-SC19 invalid managed history remains unchanged unsupported | 실제 assertion | PASS | 원출력 판정 |
| 233. S10-SC19 invalid managed history remains unchanged conflict | 실제 assertion | PASS | 원출력 판정 |
| 234. S10-SC20 raw catalog rejects receipt before side effects | 실제 assertion | PASS | 원출력 판정 |
| 실행 관측 | [verify-v410-recording-catalog] pass=234 fail=0 | PASS | 위 assertion과 command exit 함께 확인 |
| 235. S10-SC13 crypto off raw remains usable | 실제 assertion | PASS | 원출력 판정 |
| 236. S10-SC14 crypto off checkpoint is rejected | 실제 assertion | PASS | 원출력 판정 |
| 237. S10-SC15 crypto off receipt reopen is rejected | 실제 assertion | PASS | 원출력 판정 |
| 238. source 저장 callback reconcile 연결 | 실제 assertion | PASS | 원출력 판정 |
| 239. policy revision idempotency | 실제 assertion | PASS | 원출력 판정 |
| 240. 5초 safety reconcile | 실제 assertion | PASS | 원출력 판정 |
| 241. composition root 관리 저장소 선행 open | 실제 assertion | PASS | 원출력 판정 |
| 242. composition helper journal 다음 catalog rebuild/open | 실제 assertion | PASS | 원출력 판정 |
| 243. 서버 전 supervisor 시작 | 실제 assertion | PASS | 원출력 판정 |
| 244. ingress 전 event bridge 등록 | 실제 assertion | PASS | 원출력 판정 |
| 245. ingress 종료 뒤 recorder finalize | 실제 assertion | PASS | 원출력 판정 |
| 246. composition root 시작/종료 순서 | 실제 assertion | PASS | 원출력 판정 |
| 실행 관측 | [cleanup] path=<owned-root> bytes=26917814 removed=true | PASS | 위 assertion과 command exit 함께 확인 |

원출력 개별 assertion 246행 대조 완료.

## binding 결과: lp18-binding-prepared-01.txt

[원출력](lp18-binding-prepared-01.txt) — 명령·source·환경·상한·정리는 원출력과 중앙 LP18에 보존한다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP14-C01 state=1 updates=1 full_parse=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 2. LP14-C01 state=2 updates=1 full_parse=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 3. LP14-C01 state=3 updates=1 full_parse=1 expected=1 | 실제 assertion | PASS | 원출력 판정 |
| 4. LP14-C03 memory/sqlite canonical bytes and CompletedOracle | 실제 assertion | PASS | 원출력 판정 |
| 5. LP14-C02 binding=payload rejected without apply | 실제 assertion | PASS | 원출력 판정 |
| 6. LP14-C02 binding=type rejected without apply | 실제 assertion | PASS | 원출력 판정 |
| 7. LP14-C02 binding=entity rejected without apply | 실제 assertion | PASS | 원출력 판정 |
| 8. LP14-C02 binding=owner rejected without apply | 실제 assertion | PASS | 원출력 판정 |
| 9. LP14-C02 binding=prior rejected without apply | 실제 assertion | PASS | 원출력 판정 |
| 10. LP14-C02 duplicate envelope no-apply/conflict rejection | 실제 assertion | PASS | 원출력 판정 |
| 11. LP14-C02 one-shot apply/reuse rejection | 실제 assertion | PASS | 원출력 판정 |
| 실행 관측 | [cleanup] {"root":"<owned-root>","bytes":9002186,"removed":true} | PASS | 위 assertion과 command exit 함께 확인 |
| 실행 관측 | [exit] code=0 elapsed_seconds=5 source=bash-SECONDS | PASS | 위 assertion과 command exit 함께 확인 |

원출력 개별 assertion 11행 대조 완료.

## binding 결과: lp17-small-lp18-binding-01.txt

[원출력](lp17-small-lp18-binding-01.txt) — 명령·source·환경·상한·정리는 원출력과 중앙 LP18에 보존한다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| runtime-freshness | {"kind":"phase-result","label":"runtime-freshness","diagnosticPass":true,"historicalRssPass":null,"observationValid":null,"semanticPass":null,"cleanupPass":true,"exitCode":0,"signal":null,"stopReason":null,"elapsedMs":611,"groupPeakRssBytes":77971456,"observationFailure":null,"outputBytes":818} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |
| 1. FC01 exact insertion checks count=97 | 실제 assertion | PASS | 원출력 판정 |
| compile | {"kind":"phase-result","label":"compile","diagnosticPass":true,"historicalRssPass":null,"observationValid":null,"semanticPass":null,"cleanupPass":true,"exitCode":0,"signal":null,"stopReason":null,"elapsedMs":4253,"groupPeakRssBytes":376930304,"observationFailure":null,"outputBytes":2905} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |
| 2. recorded FE02 writer start | 실제 assertion | PASS | 원출력 판정 |
| 3. recorded FE04 bound finalized mutation segment0 | 실제 assertion | PASS | 원출력 판정 |
| 4. LP17/prepare LP02.actual4096-prerequisite | 실제 assertion | PASS | 원출력 판정 |
| 5. LP17/prepare seed.input-count | 실제 assertion | PASS | 원출력 판정 |
| 6. LP17/prepare seed.input-identity-all-samples | 실제 assertion | PASS | 원출력 판정 |
| 7. LP17/prepare seed.physical-evidence | 실제 assertion | PASS | 원출력 판정 |
| prepare | {"kind":"phase-result","label":"prepare","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":157155328,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"prepare","arm":"seed","samples":32,"count":2,"pass":6,"fail":0},"elapsedMs":1729,"groupPeakRssBytes":180748288,"observationFailure":null,"outputBytes":1433} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |
| 8. LP17/commit1 LP02.reserve | 실제 assertion | PASS | 원출력 판정 |
| 9. LP17/commit1 LP02.actual-file-outside-catalog | 실제 assertion | PASS | 원출력 판정 |
| 10. LP17/commit1 LP02.commit | 실제 assertion | PASS | 원출력 판정 |
| 11. LP17/commit2 LP02.reserve | 실제 assertion | PASS | 원출력 판정 |
| 12. LP17/commit2 LP02.actual-file-outside-catalog | 실제 assertion | PASS | 원출력 판정 |
| 13. LP17/commit2 LP02.commit | 실제 assertion | PASS | 원출력 판정 |
| 14. LP17/snapshot2 LP02.snapshot-exact-count | 실제 assertion | PASS | 원출력 판정 |
| 15. LP17/snapshot2 snapshot.canonical-all | 실제 assertion | PASS | 원출력 판정 |
| 16. LP17/snapshot2 LP02.explicit-checkpoint | 실제 assertion | PASS | 원출력 판정 |
| 17. LP17/snapshot2 LP02.reservation-bound-mutation-count | 실제 assertion | PASS | 원출력 판정 |
| 18. LP17/delete delete.original-canonical | 실제 assertion | PASS | 원출력 판정 |
| 19. LP17/delete delete.pending | 실제 assertion | PASS | 원출력 판정 |
| 20. LP17/delete delete.unlink | 실제 assertion | PASS | 원출력 판정 |
| 21. LP17/delete delete.tombstone | 실제 assertion | PASS | 원출력 판정 |
| 22. LP17/delete delete.checkpoint | 실제 assertion | PASS | 원출력 판정 |
| 23. LP17/delete delete.binding-preserved | 실제 assertion | PASS | 원출력 판정 |
| 24. LP17/delete deleted.public-hidden | 실제 assertion | PASS | 원출력 판정 |
| scale-A | {"kind":"phase-result","label":"scale-A","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":42090496,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"scale","arm":"A","samples":32,"count":2,"pass":17,"fail":0},"elapsedMs":277,"groupPeakRssBytes":43286528,"observationFailure":null,"outputBytes":56169} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |
| 25. LP17/reopen/sqlite LP02.journal-reopen | 실제 assertion | PASS | 원출력 판정 |
| 26. LP17/reopen/sqlite LP02.catalog-reopen | 실제 assertion | PASS | 원출력 판정 |
| 27. LP17/reopen/sqlite/0 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 |
| 28. LP17/reopen/sqlite/0 deleted.public-hidden | 실제 assertion | PASS | 원출력 판정 |
| 29. LP17/reopen/sqlite/0 reopen.deleted-state | 실제 assertion | PASS | 원출력 판정 |
| 30. LP17/reopen/sqlite/1 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 |
| 31. LP17/reopen/sqlite/1 reopen.remaining-media | 실제 assertion | PASS | 원출력 판정 |
| reopen-A-sqlite | {"kind":"phase-result","label":"reopen-A-sqlite","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":41435136,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"reopen","arm":"A","samples":32,"count":2,"pass":7,"fail":0},"elapsedMs":276,"groupPeakRssBytes":0,"observationFailure":null,"outputBytes":10990} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |
| 32. LP17/reopen/jsonl LP02.journal-reopen | 실제 assertion | PASS | 원출력 판정 |
| 33. LP17/reopen/jsonl LP02.catalog-reopen | 실제 assertion | PASS | 원출력 판정 |
| 34. LP17/reopen/jsonl/0 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 |
| 35. LP17/reopen/jsonl/0 deleted.public-hidden | 실제 assertion | PASS | 원출력 판정 |
| 36. LP17/reopen/jsonl/0 reopen.deleted-state | 실제 assertion | PASS | 원출력 판정 |
| 37. LP17/reopen/jsonl/1 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 |
| 38. LP17/reopen/jsonl/1 reopen.remaining-media | 실제 assertion | PASS | 원출력 판정 |
| reopen-A-jsonl | {"kind":"phase-result","label":"reopen-A-jsonl","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":40796160,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"reopen","arm":"A","samples":32,"count":2,"pass":7,"fail":0},"elapsedMs":255,"groupPeakRssBytes":0,"observationFailure":null,"outputBytes":9367} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |
| store-cleanup | {"kind":"store-cleanup","store":"<owned-root>/store-A","bytes":256627,"removed":true} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |
| 39. LP17/commit1 LP02.reserve | 실제 assertion | PASS | 원출력 판정 |
| 40. LP17/commit1 LP02.actual-file-outside-catalog | 실제 assertion | PASS | 원출력 판정 |
| 41. LP17/commit1 LP02.commit | 실제 assertion | PASS | 원출력 판정 |
| 42. LP17/commit2 LP02.reserve | 실제 assertion | PASS | 원출력 판정 |
| 43. LP17/commit2 LP02.actual-file-outside-catalog | 실제 assertion | PASS | 원출력 판정 |
| 44. LP17/commit2 LP02.commit | 실제 assertion | PASS | 원출력 판정 |
| 45. LP17/snapshot2 LP02.snapshot-exact-count | 실제 assertion | PASS | 원출력 판정 |
| 46. LP17/snapshot2 snapshot.canonical-all | 실제 assertion | PASS | 원출력 판정 |
| 47. LP17/snapshot2 LP02.explicit-checkpoint | 실제 assertion | PASS | 원출력 판정 |
| 48. LP17/snapshot2 LP02.reservation-bound-mutation-count | 실제 assertion | PASS | 원출력 판정 |
| 49. LP17/delete delete.original-canonical | 실제 assertion | PASS | 원출력 판정 |
| 50. LP17/delete delete.pending | 실제 assertion | PASS | 원출력 판정 |
| 51. LP17/delete delete.unlink | 실제 assertion | PASS | 원출력 판정 |
| 52. LP17/delete delete.tombstone | 실제 assertion | PASS | 원출력 판정 |
| 53. LP17/delete delete.checkpoint | 실제 assertion | PASS | 원출력 판정 |
| 54. LP17/delete delete.binding-preserved | 실제 assertion | PASS | 원출력 판정 |
| 55. LP17/delete deleted.public-hidden | 실제 assertion | PASS | 원출력 판정 |
| scale-B | {"kind":"phase-result","label":"scale-B","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":41779200,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"scale","arm":"B","samples":32,"count":2,"pass":17,"fail":0},"elapsedMs":276,"groupPeakRssBytes":42991616,"observationFailure":null,"outputBytes":56146} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |
| 56. LP17/reopen/sqlite LP02.journal-reopen | 실제 assertion | PASS | 원출력 판정 |
| 57. LP17/reopen/sqlite LP02.catalog-reopen | 실제 assertion | PASS | 원출력 판정 |
| 58. LP17/reopen/sqlite/0 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 |
| 59. LP17/reopen/sqlite/0 deleted.public-hidden | 실제 assertion | PASS | 원출력 판정 |
| 60. LP17/reopen/sqlite/0 reopen.deleted-state | 실제 assertion | PASS | 원출력 판정 |
| 61. LP17/reopen/sqlite/1 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 |
| 62. LP17/reopen/sqlite/1 reopen.remaining-media | 실제 assertion | PASS | 원출력 판정 |
| reopen-B-sqlite | {"kind":"phase-result","label":"reopen-B-sqlite","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":41418752,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"reopen","arm":"B","samples":32,"count":2,"pass":7,"fail":0},"elapsedMs":274,"groupPeakRssBytes":0,"observationFailure":null,"outputBytes":10979} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |
| 63. LP17/reopen/jsonl LP02.journal-reopen | 실제 assertion | PASS | 원출력 판정 |
| 64. LP17/reopen/jsonl LP02.catalog-reopen | 실제 assertion | PASS | 원출력 판정 |
| 65. LP17/reopen/jsonl/0 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 |
| 66. LP17/reopen/jsonl/0 deleted.public-hidden | 실제 assertion | PASS | 원출력 판정 |
| 67. LP17/reopen/jsonl/0 reopen.deleted-state | 실제 assertion | PASS | 원출력 판정 |
| 68. LP17/reopen/jsonl/1 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 |
| 69. LP17/reopen/jsonl/1 reopen.remaining-media | 실제 assertion | PASS | 원출력 판정 |
| reopen-B-jsonl | {"kind":"phase-result","label":"reopen-B-jsonl","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":40747008,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"reopen","arm":"B","samples":32,"count":2,"pass":7,"fail":0},"elapsedMs":254,"groupPeakRssBytes":0,"observationFailure":null,"outputBytes":9355} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |
| store-cleanup | {"kind":"store-cleanup","store":"<owned-root>/store-B","bytes":256627,"removed":true} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |
| 70. LP17/commit1 LP02.reserve | 실제 assertion | PASS | 원출력 판정 |
| 71. LP17/commit1 LP02.actual-file-outside-catalog | 실제 assertion | PASS | 원출력 판정 |
| 72. LP17/commit1 LP02.commit | 실제 assertion | PASS | 원출력 판정 |
| 73. LP17/commit2 LP02.reserve | 실제 assertion | PASS | 원출력 판정 |
| 74. LP17/commit2 LP02.actual-file-outside-catalog | 실제 assertion | PASS | 원출력 판정 |
| 75. LP17/commit2 LP02.commit | 실제 assertion | PASS | 원출력 판정 |
| 76. LP17/snapshot2 LP02.snapshot-exact-count | 실제 assertion | PASS | 원출력 판정 |
| 77. LP17/snapshot2 snapshot.canonical-all | 실제 assertion | PASS | 원출력 판정 |
| 78. LP17/snapshot2 LP02.explicit-checkpoint | 실제 assertion | PASS | 원출력 판정 |
| 79. LP17/snapshot2 LP02.reservation-bound-mutation-count | 실제 assertion | PASS | 원출력 판정 |
| 80. LP17/delete delete.original-canonical | 실제 assertion | PASS | 원출력 판정 |
| 81. LP17/delete delete.pending | 실제 assertion | PASS | 원출력 판정 |
| 82. LP17/delete delete.unlink | 실제 assertion | PASS | 원출력 판정 |
| 83. LP17/delete delete.tombstone | 실제 assertion | PASS | 원출력 판정 |
| 84. LP17/delete delete.checkpoint | 실제 assertion | PASS | 원출력 판정 |
| 85. LP17/delete delete.binding-preserved | 실제 assertion | PASS | 원출력 판정 |
| 86. LP17/delete deleted.public-hidden | 실제 assertion | PASS | 원출력 판정 |
| scale-C | {"kind":"phase-result","label":"scale-C","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":42041344,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"scale","arm":"C","samples":32,"count":2,"pass":17,"fail":0},"elapsedMs":278,"groupPeakRssBytes":43253760,"observationFailure":null,"outputBytes":59150} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |
| 87. LP17/reopen/sqlite LP02.journal-reopen | 실제 assertion | PASS | 원출력 판정 |
| 88. LP17/reopen/sqlite LP02.catalog-reopen | 실제 assertion | PASS | 원출력 판정 |
| 89. LP17/reopen/sqlite/0 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 |
| 90. LP17/reopen/sqlite/0 deleted.public-hidden | 실제 assertion | PASS | 원출력 판정 |
| 91. LP17/reopen/sqlite/0 reopen.deleted-state | 실제 assertion | PASS | 원출력 판정 |
| 92. LP17/reopen/sqlite/1 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 |
| 93. LP17/reopen/sqlite/1 reopen.remaining-media | 실제 assertion | PASS | 원출력 판정 |
| reopen-C-sqlite | {"kind":"phase-result","label":"reopen-C-sqlite","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":41500672,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"reopen","arm":"C","samples":32,"count":2,"pass":7,"fail":0},"elapsedMs":275,"groupPeakRssBytes":0,"observationFailure":null,"outputBytes":10980} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |
| 94. LP17/reopen/jsonl LP02.journal-reopen | 실제 assertion | PASS | 원출력 판정 |
| 95. LP17/reopen/jsonl LP02.catalog-reopen | 실제 assertion | PASS | 원출력 판정 |
| 96. LP17/reopen/jsonl/0 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 |
| 97. LP17/reopen/jsonl/0 deleted.public-hidden | 실제 assertion | PASS | 원출력 판정 |
| 98. LP17/reopen/jsonl/0 reopen.deleted-state | 실제 assertion | PASS | 원출력 판정 |
| 99. LP17/reopen/jsonl/1 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 |
| 100. LP17/reopen/jsonl/1 reopen.remaining-media | 실제 assertion | PASS | 원출력 판정 |
| reopen-C-jsonl | {"kind":"phase-result","label":"reopen-C-jsonl","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":40812544,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"reopen","arm":"C","samples":32,"count":2,"pass":7,"fail":0},"elapsedMs":253,"groupPeakRssBytes":0,"observationFailure":null,"outputBytes":9360} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |
| store-cleanup | {"kind":"store-cleanup","store":"<owned-root>/store-C","bytes":256627,"removed":true} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |
| source-unchanged | {"kind":"source-unchanged","unchanged":true} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |
| cleanup | {"kind":"cleanup","bytes":18771696,"removed":true} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |
| run-result | {"kind":"run-result","mode":"small","id":"lp18-binding-01","diagnosticPass":true,"failure":null,"phases":12,"elapsedMs":9492,"productPass":false,"tokenConsumed":null} | PASS | 준비 실패를 제품 PASS로 확대하지 않음 |

원출력 개별 assertion 100행 대조 완료.

## typed binding 예상 RED

원출력: [준비 실패](lp18-ownership-red-binding-01.txt), [예상 RED](lp18-ownership-red-binding-02.txt).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| binding-01 build | exit1, 미사용 adapter 경고 | FAIL | 제품 실패/예상 RED 아님. 153124B 삭제·그룹 종료 |
| 1. LP18-O01 owner checked read view shares journal envelope | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 2. LP18-O01 shared journal original candidate envelopes | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 3. LP18-O01 public Replay value mutation remains isolated | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 4. LP18-O01 retained prefix shares journal envelope | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 5. LP18-O01 full canonical and projection oracle | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 6. LP18-O03 stale candidate after reservation rejected | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 7. LP18-O03 foreign owner candidate rejected | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 8. LP18-O04 exact field order or prefix mutation rejected schema | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 9. LP18-O04 standalone candidate fields rejected without disk change schema | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 10. LP18-O04 exact field order or prefix mutation rejected type | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 11. LP18-O04 standalone candidate fields rejected without disk change type | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 12. LP18-O04 exact field order or prefix mutation rejected id | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 13. LP18-O04 standalone candidate fields rejected without disk change id | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 14. LP18-O04 exact field order or prefix mutation rejected entity | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 15. LP18-O04 standalone candidate fields rejected without disk change entity | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 16. LP18-O04 exact field order or prefix mutation rejected time | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 17. LP18-O04 standalone candidate fields rejected without disk change time | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 18. LP18-O04 exact field order or prefix mutation rejected payload | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 19. LP18-O04 standalone candidate fields rejected without disk change payload | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 20. LP18-O04 exact field order or prefix mutation rejected reorder | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 21. LP18-O04 standalone candidate fields rejected without disk change reorder | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 22. LP18-O04 exact field order or prefix mutation rejected shrink | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 23. LP18-O04 standalone candidate fields rejected without disk change shrink | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 24. LP18-O04 null envelope safely rejected | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 25. LP18-O02 only transformed receipts own new envelopes | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 26. LP18-O02 prepared receipts preserve original canonical bytes | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 27. LP18-O02 publication bytes and prior owned snapshot remain exact | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 28. LP18-O02 published journal and prefix share transformed receipt envelopes | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 29. LP18-O02 receipt independent full projection equality | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 30. LP18-O03 stale candidate after ordinary append rejected | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 31. LP18-O05 8192 logical records admitted | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 32. LP18-O05 8193 aliases still rejected | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 33. LP18-O05 64MiB logical bytes admitted | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 34. LP18-O05 64MiB plus one rejected | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 35. LP18-O07 append accepted shares journal envelope | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 36. LP18-O09 successful append retry returns exact input envelope | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 37. LP18-O09 failed append clears prior output handle | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 38. LP18-O09 borrowed input survives aliased output reset | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 39. LP18-O07 checkpoint accepted shares live journal envelope | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 40. LP18-O07 accepted full canonical and durable bytes unchanged | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 41. LP18-O08 reopen accepted shares journal envelope sqlite | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 42. LP18-O08 reopen canonical ordinal and projection preserved sqlite | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 43. LP18-O08 SQLite rebuild requires canonical and ordinal gates | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 44. LP18-O08 reopen accepted shares journal envelope fallback | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 45. LP18-O08 reopen canonical ordinal and projection preserved fallback | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 46. LP18-O09 supplied envelope mismatch rejected schema | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 47. LP18-O09 supplied envelope mismatch rejected type | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 48. LP18-O09 supplied envelope mismatch rejected id | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 49. LP18-O09 supplied envelope mismatch rejected entity | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 50. LP18-O09 supplied envelope mismatch rejected time | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 51. LP18-O09 supplied envelope mismatch rejected payload | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 52. LP18-O09 failed apply registers no accepted envelope | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 53. LP18-O09 supplied exact envelope is retained | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 54. LP18-O09 duplicate full canonical acceptance and collision rejection preserved | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 55. LP18-O09 compacted receipt retry returns original input envelope | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 56. LP18-O11 bound journal identity and canonical bytes preserved | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 57. LP18-O11 public binding value mutation remains isolated | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 58. LP18-O11 source snapshot binding mutation remains isolated | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 59. LP18-O12 same ID changed binding rejected without mutation | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 60. LP18-O12 strict bound identity rejection preserved | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 61. LP18-O10 checkpoint shadow shares current live binding | binding-02 focused assertion | FAIL | 사전등록한 소유 공유 미구현 RED |
| 62. LP18-O13 independent full replay binding projection preserved | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 63. LP18-O12 deleted source hidden with internal binding preserved | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 64. LP18-O10 deleted checkpoint retains shared binding evidence | binding-02 focused assertion | FAIL | 사전등록한 소유 공유 미구현 RED |
| 65. LP18-O13 reopen deleted canonical binding preserved sqlite | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 66. LP18-O10 reopened checkpoint shares live binding sqlite | binding-02 focused assertion | FAIL | 사전등록한 소유 공유 미구현 RED |
| 67. LP18-O13 reopen deleted canonical binding preserved fallback | binding-02 focused assertion | PASS | 기존/안전 경계 유지 |
| 68. LP18-O10 reopened checkpoint shares live binding fallback | binding-02 focused assertion | FAIL | 사전등록한 소유 공유 미구현 RED |

실행 결과: build exit0/2315ms, focused exit1/686ms; 64PASS/4FAIL, runner0은 예상 RED 일치만 뜻한다.
source 불변·그룹 종료·5803849B 임시 root 삭제 완료. 전체3017ms, token 집계 미제공.

## lp18-ownership-red-baseline-01.txt

[원출력](lp18-ownership-red-baseline-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| build 실행 | exit1, 152ms, signal=null, stop=null | FAIL | 자식 그룹 정리=true |
| 소스 불변 | source manifest 대조 | PASS | 실행 전후 |
| 임시 root 정리 | 삭제 전 149344B, removed=true | PASS | 소유 프로세스 종료 뒤 |
| runner oracle | mode=red, matched=false, productPass=false, 166ms | FAIL | RED matched는 제품 PASS 아님 |

## lp18-ownership-red-baseline-02.txt

[원출력](lp18-ownership-red-baseline-02.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| build 실행 | exit1, 2134ms, signal=null, stop=null | FAIL | 자식 그룹 정리=true |
| 소스 불변 | source manifest 대조 | PASS | 실행 전후 |
| 임시 root 정리 | 삭제 전 149344B, removed=true | PASS | 소유 프로세스 종료 뒤 |
| runner oracle | mode=red, matched=false, productPass=false, 2147ms | FAIL | RED matched는 제품 PASS 아님 |

## lp18-ownership-red-baseline-03.txt

[원출력](lp18-ownership-red-baseline-03.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| build 실행 | exit0, 2144ms, signal=null, stop=null | PASS | 자식 그룹 정리=true |
| 1. LP18-O01 shared journal original candidate envelopes | focused assertion | FAIL | 최초 원출력 판정 보존 |
| 2. LP18-O01 public Replay value mutation remains isolated | focused assertion | PASS | 최초 원출력 판정 보존 |
| 3. LP18-O01 retained prefix shares journal envelope | focused assertion | FAIL | 최초 원출력 판정 보존 |
| 4. LP18-O01 full canonical and projection oracle | focused assertion | PASS | 최초 원출력 판정 보존 |
| 5. LP18-O03 stale candidate after reservation rejected | focused assertion | PASS | 최초 원출력 판정 보존 |
| 6. LP18-O03 foreign owner candidate rejected | focused assertion | PASS | 최초 원출력 판정 보존 |
| 7. LP18-O04 exact field order or prefix mutation rejected / schema | focused assertion | PASS | 최초 원출력 판정 보존 |
| 8. LP18-O04 exact field order or prefix mutation rejected / type | focused assertion | PASS | 최초 원출력 판정 보존 |
| 9. LP18-O04 exact field order or prefix mutation rejected / id | focused assertion | PASS | 최초 원출력 판정 보존 |
| 10. LP18-O04 exact field order or prefix mutation rejected / entity | focused assertion | PASS | 최초 원출력 판정 보존 |
| 11. LP18-O04 exact field order or prefix mutation rejected / time | focused assertion | PASS | 최초 원출력 판정 보존 |
| 12. LP18-O04 exact field order or prefix mutation rejected / payload | focused assertion | PASS | 최초 원출력 판정 보존 |
| 13. LP18-O04 exact field order or prefix mutation rejected / reorder | focused assertion | PASS | 최초 원출력 판정 보존 |
| 14. LP18-O04 exact field order or prefix mutation rejected / shrink | focused assertion | PASS | 최초 원출력 판정 보존 |
| 15. LP18-O02 only transformed receipts own new envelopes | focused assertion | FAIL | 최초 원출력 판정 보존 |
| 16. LP18-O02 prepared receipts preserve original canonical bytes | focused assertion | PASS | 최초 원출력 판정 보존 |
| 17. LP18-O02 publication bytes and prior owned snapshot remain exact | focused assertion | PASS | 최초 원출력 판정 보존 |
| 18. LP18-O02 receipt independent full projection equality | focused assertion | PASS | 최초 원출력 판정 보존 |
| 19. LP18-O03 stale candidate after ordinary append rejected | focused assertion | PASS | 최초 원출력 판정 보존 |
| 20. LP18-O05 8192 logical records admitted | focused assertion | PASS | 최초 원출력 판정 보존 |
| 21. LP18-O05 8193 aliases still rejected | focused assertion | PASS | 최초 원출력 판정 보존 |
| 22. LP18-O05 64MiB logical bytes admitted | focused assertion | PASS | 최초 원출력 판정 보존 |
| 23. LP18-O05 64MiB plus one rejected | focused assertion | PASS | 최초 원출력 판정 보존 |
| focused 실행 | exit1, 651ms, signal=null, stop=null | FAIL | 자식 그룹 정리=true |
| 소스 불변 | source manifest 대조 | PASS | 실행 전후 |
| 임시 root 정리 | 삭제 전 5059907B, removed=true | PASS | 소유 프로세스 종료 뒤 |
| runner oracle | mode=red, matched=true, productPass=false, 2809ms | PASS | RED matched는 제품 PASS 아님 |

## lp18-build-01.txt

[원출력](lp18-build-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 전체 제품 빌드 | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh build, exit0 | PASS | 전체 elapsed 미집계 |

원출력 assertion 행수: 0개. 이 결과는 해당 단기 범위만 인정하며 HTTP/전체 RAM 수명/최종 S11 PASS가 아니다.

## lp18-ownership-green-shared-01.txt

[원출력](lp18-ownership-green-shared-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP18-O01 owner checked read view shares journal envelope | 원출력 assertion | PASS | 기존 oracle 유지 |
| 2. LP18-O01 shared journal original candidate envelopes | 원출력 assertion | PASS | 기존 oracle 유지 |
| 3. LP18-O01 public Replay value mutation remains isolated | 원출력 assertion | PASS | 기존 oracle 유지 |
| 4. LP18-O01 retained prefix shares journal envelope | 원출력 assertion | PASS | 기존 oracle 유지 |
| 5. LP18-O01 full canonical and projection oracle | 원출력 assertion | PASS | 기존 oracle 유지 |
| 6. LP18-O03 stale candidate after reservation rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 7. LP18-O03 foreign owner candidate rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 8. LP18-O04 exact field order or prefix mutation rejected schema | 원출력 assertion | PASS | 기존 oracle 유지 |
| 9. LP18-O04 standalone candidate fields rejected without disk change schema | 원출력 assertion | PASS | 기존 oracle 유지 |
| 10. LP18-O04 exact field order or prefix mutation rejected type | 원출력 assertion | PASS | 기존 oracle 유지 |
| 11. LP18-O04 standalone candidate fields rejected without disk change type | 원출력 assertion | PASS | 기존 oracle 유지 |
| 12. LP18-O04 exact field order or prefix mutation rejected id | 원출력 assertion | PASS | 기존 oracle 유지 |
| 13. LP18-O04 standalone candidate fields rejected without disk change id | 원출력 assertion | PASS | 기존 oracle 유지 |
| 14. LP18-O04 exact field order or prefix mutation rejected entity | 원출력 assertion | PASS | 기존 oracle 유지 |
| 15. LP18-O04 standalone candidate fields rejected without disk change entity | 원출력 assertion | PASS | 기존 oracle 유지 |
| 16. LP18-O04 exact field order or prefix mutation rejected time | 원출력 assertion | PASS | 기존 oracle 유지 |
| 17. LP18-O04 standalone candidate fields rejected without disk change time | 원출력 assertion | PASS | 기존 oracle 유지 |
| 18. LP18-O04 exact field order or prefix mutation rejected payload | 원출력 assertion | PASS | 기존 oracle 유지 |
| 19. LP18-O04 standalone candidate fields rejected without disk change payload | 원출력 assertion | PASS | 기존 oracle 유지 |
| 20. LP18-O04 exact field order or prefix mutation rejected reorder | 원출력 assertion | PASS | 기존 oracle 유지 |
| 21. LP18-O04 standalone candidate fields rejected without disk change reorder | 원출력 assertion | PASS | 기존 oracle 유지 |
| 22. LP18-O04 exact field order or prefix mutation rejected shrink | 원출력 assertion | PASS | 기존 oracle 유지 |
| 23. LP18-O04 standalone candidate fields rejected without disk change shrink | 원출력 assertion | PASS | 기존 oracle 유지 |
| 24. LP18-O04 null envelope safely rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 25. LP18-O02 only transformed receipts own new envelopes | 원출력 assertion | PASS | 기존 oracle 유지 |
| 26. LP18-O02 prepared receipts preserve original canonical bytes | 원출력 assertion | PASS | 기존 oracle 유지 |
| 27. LP18-O02 publication bytes and prior owned snapshot remain exact | 원출력 assertion | PASS | 기존 oracle 유지 |
| 28. LP18-O02 published journal and prefix share transformed receipt envelopes | 원출력 assertion | PASS | 기존 oracle 유지 |
| 29. LP18-O02 receipt independent full projection equality | 원출력 assertion | PASS | 기존 oracle 유지 |
| 30. LP18-O03 stale candidate after ordinary append rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 31. LP18-O05 8192 logical records admitted | 원출력 assertion | PASS | 기존 oracle 유지 |
| 32. LP18-O05 8193 aliases still rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 33. LP18-O05 64MiB logical bytes admitted | 원출력 assertion | PASS | 기존 oracle 유지 |
| 34. LP18-O05 64MiB plus one rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 실행/정리 관측 | [summary] LP18 pass=34 fail=0 | PASS | exit0 원출력에 대응 |
| source-unchanged | {"kind":"source-unchanged","unchanged":true} | PASS | 실제 관측 |
| cleanup | {"kind":"cleanup","bytes":5110669,"removed":true} | PASS | 실제 관측 |

원출력 assertion 행수: 34개. 이 결과는 해당 단기 범위만 인정하며 HTTP/전체 RAM 수명/최종 S11 PASS가 아니다.

## lp18-cache-01.txt

[원출력](lp18-cache-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP15-C01 cold full applied=1 expected=1 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 2. LP15-C01 unchanged prefix applied=0 expected=0 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 3. LP15-C01 exact prefix suffix only applied=1 expected=1 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 4. LP15-C01 independent prefix shadow/full projection equality | 원출력 assertion | PASS | 기존 oracle 유지 |
| 5. LP15-C01 full fallback schema applied=2 expected=2 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 6. LP15-C01 full fallback type applied=2 expected=2 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 7. LP15-C01 full fallback id applied=2 expected=2 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 8. LP15-C01 full fallback entity applied=2 expected=2 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 9. LP15-C01 full fallback time applied=2 expected=2 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 10. LP15-C01 full fallback payload applied=2 expected=2 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 11. LP15-C01 full fallback reorder applied=2 expected=2 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 12. LP15-C01 full fallback shrink applied=2 expected=2 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 13. LP15-C01 full fallback null-shadow applied=2 expected=2 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 14. LP15-C01 full fallback null-handle applied=2 expected=2 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 15. LP15-C01 Open clears cache applied=2 expected=2 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 16. LP15-C03 recover full/no-cache | 원출력 assertion | PASS | 기존 oracle 유지 |
| 17. LP15-C03 after recover full applied=2 expected=2 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 18. LP15-C03 injected commit refusal discards cache | 원출력 assertion | PASS | 기존 oracle 유지 |
| 19. LP15-C03 after commit refusal full applied=2 expected=2 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 20. LP15-C03 suffix exception discards cache | 원출력 assertion | PASS | 기존 oracle 유지 |
| 21. LP15-C03 after exception full applied=3 expected=3 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 22. LP15-C03 public poisoned entry discards cache | 원출력 assertion | PASS | 기존 oracle 유지 |
| 23. LP15-C03 after restored fixture full applied=3 expected=3 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 24. LP15-C04 exact byte charge boundary | 원출력 assertion | PASS | 기존 oracle 유지 |
| 25. LP15-C04 overflow charge rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 26. LP15-C04 8192 records admitted | 원출력 assertion | PASS | 기존 oracle 유지 |
| 27. LP15-C04 8193 records rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 28. LP15-C04 64MiB record charge admitted | 원출력 assertion | PASS | 기존 oracle 유지 |
| 29. LP15-C04 64MiB plus one rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 30. LP15-C03 changed candidate prime applied=1 expected=1 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 31. LP15-C03 changed candidate suffix12 plus full candidate13 applied=25 expected=25 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 32. LP15-C03 changed candidate cache equals independent full projection | 원출력 assertion | PASS | 기존 oracle 유지 |
| 33. LP15-C03 compacted candidate prefix reused applied=0 expected=0 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 34. LP15-C03 forced projection mismatch discards cache | 원출력 assertion | PASS | 기존 oracle 유지 |
| 35. LP15-C04 overlimit prime applied=1 expected=1 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 36. LP15-C04 existing cache ignored for oversized original applied=8193 expected=8193 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 37. LP15-C04 oversized candidate not retained | 원출력 assertion | PASS | 기존 oracle 유지 |
| 38. LP15-C04 next oversized checkpoint full applied=8193 expected=8193 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 39. CP01 actual Ready Complete shape canonical files reservation | 원출력 assertion | PASS | 기존 oracle 유지 |
| 40. CP02 bounded two jobs over 1MiB canonical transitions | 원출력 assertion | PASS | 기존 oracle 유지 |
| 41. LP15-C02 bounded automatic checkpoint and whole transition measurement | 원출력 assertion | PASS | 기존 oracle 유지 |
| 42. LP15-C02 reopened full applied=18 expected=18 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 43. LP15-C02 actual unchanged prefix applied=0 expected=0 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 44. LP15-C02 actual suffix only applied=1 expected=1 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 45. LP15-C02 actual job shadow/full projection equality | 원출력 assertion | PASS | 기존 oracle 유지 |
| 46. LP15-C03 illegal Ready after Complete suffix rejected by cached/full paths | 원출력 assertion | PASS | 기존 oracle 유지 |
| 실행/정리 관측 | [summary] LP15 pass=44 fail=0 | PASS | exit0 원출력에 대응 |
| 47. LP15-C04 peakRSS bytes=167362560 cap=536870912 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 실행/정리 관측 | [cleanup] {"root":"/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-checkpoint-cache.hyZkPr","bytes":16778539,"removed":true} | PASS | exit0 원출력에 대응 |
| 실행/정리 관측 | [exit] code=0 elapsed_seconds=33 source=bash-SECONDS | PASS | exit0 원출력에 대응 |

원출력 assertion 행수: 47개. 이 결과는 해당 단기 범위만 인정하며 HTTP/전체 RAM 수명/최종 S11 PASS가 아니다.

## lp18-catalog-01.txt

[원출력](lp18-catalog-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. journal open:  | 원출력 assertion | PASS | 기존 oracle 유지 |
| 2. fallback catalog open:  | 원출력 assertion | PASS | 기존 oracle 유지 |
| 3. SQLite off mode 표시 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 4. segment finalize journal+projection:  | 원출력 assertion | PASS | 기존 oracle 유지 |
| 5. fallback range query | 원출력 assertion | PASS | 기존 oracle 유지 |
| 6. event link FK 위반 거부 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 7. FK 위반 transaction/journal 전체 rollback | 원출력 assertion | PASS | 기존 oracle 유지 |
| 8. 최초 durable mutation 1개 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 9. 동일 mutation 중복 append | 원출력 assertion | PASS | 기존 oracle 유지 |
| 10. 손상 사이 정상 durable mutation 보존 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 11. 중간 corrupt line count | 원출력 assertion | PASS | 기존 oracle 유지 |
| 12. 마지막 truncated line skip | 원출력 assertion | PASS | 기존 oracle 유지 |
| 13. fallback replay open | 원출력 assertion | PASS | 기존 oracle 유지 |
| 14. 같은 mutation idempotent replay | 원출력 assertion | PASS | 기존 oracle 유지 |
| 15. 재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 16. 중복 replay row/합계 불증가 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 17. 추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구:  | 원출력 assertion | PASS | 기존 oracle 유지 |
| 18. writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed | 원출력 assertion | PASS | 기존 oracle 유지 |
| 19. v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed | 원출력 assertion | PASS | 기존 oracle 유지 |
| 20. SQLite catalog open/rebuild:  | 원출력 assertion | PASS | 기존 oracle 유지 |
| 21. SQLite primary mode 표시 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 22. SQLite on/off range query ID·순서 parity | 원출력 assertion | PASS | 기존 oracle 유지 |
| 23. journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 24. journal 없는 손상 media orphan 구분 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 25. projection failover journal open:  | 원출력 assertion | PASS | 기존 oracle 유지 |
| 26. projection failover catalog open:  | 원출력 assertion | PASS | 기존 oracle 유지 |
| 27. 실제 SQLite INSERT 실패 trigger 설치 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 28. SQLite 투영 실패 뒤 journal+memory finalize 유지:  | 원출력 assertion | PASS | 기존 oracle 유지 |
| 29. SQLite 투영 실패 즉시 JSONL fallback 전환 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 30. 재시작 rebuild 전 실패 trigger 제거 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 31. 투영 실패 직후 in-memory query 정합성 유지 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 32. projection failover 재시작 journal rebuild:  | 원출력 assertion | PASS | 기존 oracle 유지 |
| 33. 재시작 후 journal에서 누락 SQLite projection 복구 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 34. 재시작 후 SQLite primary 복귀 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 35. 재시작 journal rebuild가 실제 SQLite row 복원 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 36. tombstone journal open:  | 원출력 assertion | PASS | 기존 oracle 유지 |
| 37. tombstone catalog open:  | 원출력 assertion | PASS | 기존 oracle 유지 |
| 38. tombstone 대상 segment finalize:  | 원출력 assertion | PASS | 기존 oracle 유지 |
| 39. tombstone 대상 deletion request:  | 원출력 assertion | PASS | 기존 oracle 유지 |
| 40. tombstone 완료 기록:  | 원출력 assertion | PASS | 기존 oracle 유지 |
| 41. catalog finalize가 tombstone segment ID 재사용을 거부해야 함 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 42. 손상 SQLite 격리 후 journal rebuild:  | 원출력 assertion | PASS | 기존 oracle 유지 |
| 43. 손상 SQLite 원본 격리 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 44. 격리 SQLite 파일 보존 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 45. 격리 후 journal rebuild 결과 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 46. S10-3A future-schema journal read open | 원출력 assertion | PASS | 기존 oracle 유지 |
| 47. S10-3A future-schema unsupported classification | 원출력 assertion | PASS | 기존 oracle 유지 |
| 48. S10-3A future-schema catalog open denied | 원출력 assertion | PASS | 기존 oracle 유지 |
| 49. S10-3A future-schema catalog retry denied | 원출력 assertion | PASS | 기존 oracle 유지 |
| 50. S10-3A future-schema journal bytes preserved | 원출력 assertion | PASS | 기존 oracle 유지 |
| 51. S10-3A future-schema SQLite bytes preserved | 원출력 assertion | PASS | 기존 oracle 유지 |
| 52. S10-3A future-schema writer cleanup untouched | 원출력 assertion | PASS | 기존 oracle 유지 |
| 53. S10-3A arbitrary-schema journal read open | 원출력 assertion | PASS | 기존 oracle 유지 |
| 54. S10-3A arbitrary-schema unsupported classification | 원출력 assertion | PASS | 기존 oracle 유지 |
| 55. S10-3A arbitrary-schema catalog open denied | 원출력 assertion | PASS | 기존 oracle 유지 |
| 56. S10-3A arbitrary-schema catalog retry denied | 원출력 assertion | PASS | 기존 oracle 유지 |
| 57. S10-3A arbitrary-schema journal bytes preserved | 원출력 assertion | PASS | 기존 oracle 유지 |
| 58. S10-3A arbitrary-schema SQLite bytes preserved | 원출력 assertion | PASS | 기존 oracle 유지 |
| 59. S10-3A arbitrary-schema writer cleanup untouched | 원출력 assertion | PASS | 기존 oracle 유지 |
| 60. S10-3A empty-schema journal read open | 원출력 assertion | PASS | 기존 oracle 유지 |
| 61. S10-3A empty-schema unsupported classification | 원출력 assertion | PASS | 기존 oracle 유지 |
| 62. S10-3A empty-schema catalog open denied | 원출력 assertion | PASS | 기존 oracle 유지 |
| 63. S10-3A empty-schema catalog retry denied | 원출력 assertion | PASS | 기존 oracle 유지 |
| 64. S10-3A empty-schema journal bytes preserved | 원출력 assertion | PASS | 기존 oracle 유지 |
| 65. S10-3A empty-schema SQLite bytes preserved | 원출력 assertion | PASS | 기존 oracle 유지 |
| 66. S10-3A empty-schema writer cleanup untouched | 원출력 assertion | PASS | 기존 oracle 유지 |
| 67. S10-3A future-type journal read open | 원출력 assertion | PASS | 기존 oracle 유지 |
| 68. S10-3A future-type unsupported classification | 원출력 assertion | PASS | 기존 oracle 유지 |
| 69. S10-3A future-type catalog open denied | 원출력 assertion | PASS | 기존 oracle 유지 |
| 70. S10-3A future-type catalog retry denied | 원출력 assertion | PASS | 기존 oracle 유지 |
| 71. S10-3A future-type journal bytes preserved | 원출력 assertion | PASS | 기존 oracle 유지 |
| 72. S10-3A future-type SQLite bytes preserved | 원출력 assertion | PASS | 기존 oracle 유지 |
| 73. S10-3A future-type writer cleanup untouched | 원출력 assertion | PASS | 기존 oracle 유지 |
| 74. S10-3A malformed journal open | 원출력 assertion | PASS | 기존 oracle 유지 |
| 75. S10-3A malformed JSON missing fields and wrong types remain corrupt | 원출력 assertion | PASS | 기존 oracle 유지 |
| 76. S10-O01 reservation journal open | 원출력 assertion | PASS | 기존 oracle 유지 |
| 77. S10-O01 first reservation returns four IDs and sequence one | 원출력 assertion | PASS | 기존 oracle 유지 |
| 78. S10-O01 versioned reservation payload replays | 원출력 assertion | PASS | 기존 oracle 유지 |
| 79. S10-O01 new reservation records actual occurred time | 원출력 assertion | PASS | 기존 oracle 유지 |
| 80. S10-O02 identical retry preserves sequence and bytes | 원출력 assertion | PASS | 기존 oracle 유지 |
| 81. S10-O03 reopened instance allocates next sequence | 원출력 assertion | PASS | 기존 oracle 유지 |
| 82. S10-O03 new process resumes durable sequence | 원출력 assertion | PASS | 기존 oracle 유지 |
| 83. S10-O04 different store rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 84. S10-O04 reused request with different segment rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 85. S10-O04 reused request with different channel rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 86. S10-O04 reused segment with different request rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 87. S10-O04 conflicts preserve original bytes | 원출력 assertion | PASS | 기존 oracle 유지 |
| 88. S10-O05/O06 reject and preserve corrupt | 원출력 assertion | PASS | 기존 oracle 유지 |
| 89. S10-O05/O06 reject and preserve unsupported-schema | 원출력 assertion | PASS | 기존 oracle 유지 |
| 90. S10-O05/O06 reject and preserve unsupported-type | 원출력 assertion | PASS | 기존 oracle 유지 |
| 91. S10-O05/O06 reject and preserve tail | 원출력 assertion | PASS | 기존 oracle 유지 |
| 92. S10-O05/O06 reject and preserve payload-zero | 원출력 assertion | PASS | 기존 oracle 유지 |
| 93. S10-O05/O06 reject and preserve payload-negative | 원출력 assertion | PASS | 기존 oracle 유지 |
| 94. S10-O05/O06 reject and preserve payload-fraction | 원출력 assertion | PASS | 기존 oracle 유지 |
| 95. S10-O05/O06 reject and preserve payload-overflow | 원출력 assertion | PASS | 기존 oracle 유지 |
| 96. S10-O05/O06 reject and preserve duplicate-sequence | 원출력 assertion | PASS | 기존 oracle 유지 |
| 97. S10-O05/O06 reject and preserve decreasing-sequence | 원출력 assertion | PASS | 기존 oracle 유지 |
| 98. S10-O05/O06 reject and preserve duplicate-request | 원출력 assertion | PASS | 기존 oracle 유지 |
| 99. S10-O05/O06 reject and preserve duplicate-segment | 원출력 assertion | PASS | 기존 oracle 유지 |
| 100. S10-O05/O06 reject and preserve store-conflict | 원출력 assertion | PASS | 기존 oracle 유지 |
| 101. S10-O05/O06 reject and preserve ordinary-before | 원출력 assertion | PASS | 기존 oracle 유지 |
| 102. S10-O05/O06 reject and preserve ordinary-after | 원출력 assertion | PASS | 기존 oracle 유지 |
| 103. S10-O05/O06 reject and preserve line-cap | 원출력 assertion | PASS | 기존 oracle 유지 |
| 104. S10-O05 reservation entity envelope binding rejects mismatch | 원출력 assertion | PASS | 기존 oracle 유지 |
| 105. S10-O05 reservation request envelope binding rejects mismatch | 원출력 assertion | PASS | 기존 oracle 유지 |
| 106. S10-O01 strict reservation parser accepts versioned literal | 원출력 assertion | PASS | 기존 oracle 유지 |
| 107. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 원출력 assertion | PASS | 기존 oracle 유지 |
| 108. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 원출력 assertion | PASS | 기존 oracle 유지 |
| 109. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 원출력 assertion | PASS | 기존 oracle 유지 |
| 110. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 원출력 assertion | PASS | 기존 oracle 유지 |
| 111. S10-O06 INT64_MAX identical retry remains valid | 원출력 assertion | PASS | 기존 oracle 유지 |
| 112. S10-O06 sequence overflow rejected without write | 원출력 assertion | PASS | 기존 oracle 유지 |
| 113. S10-O02 identical durable reservation duplicates remain idempotent | 원출력 assertion | PASS | 기존 oracle 유지 |
| 114. S10-O06 sequence gaps remain valid and allocate above maximum | 원출력 assertion | PASS | 기존 oracle 유지 |
| 115. S10-O07 four simultaneous processes finish reservations | 원출력 assertion | PASS | 기존 oracle 유지 |
| 116. S10-O07 concurrent sequences are unique and complete | 원출력 assertion | PASS | 기존 oracle 유지 |
| 117. S10-O07 next sequence follows concurrent reservations | 원출력 assertion | PASS | 기존 oracle 유지 |
| 118. S10-O08 ordinary Append cannot reserve orders | 원출력 assertion | PASS | 기존 oracle 유지 |
| 119. S10-O08 unopened journal rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 120. S10-O08 null result rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 121. S10-O08 invalid opaque ID rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 122. S10-O08 failed reservation does not expose tentative result | 원출력 assertion | PASS | 기존 oracle 유지 |
| 123. S10-O09 unsafe file binding rejected and original preserved inode | 원출력 assertion | PASS | 기존 oracle 유지 |
| 124. S10-O09 unsafe file binding rejected and original preserved parent | 원출력 assertion | PASS | 기존 oracle 유지 |
| 125. S10-O09 unsafe file binding rejected and original preserved symlink | 원출력 assertion | PASS | 기존 oracle 유지 |
| 126. S10-O09 unsafe file binding rejected and original preserved hardlink | 원출력 assertion | PASS | 기존 oracle 유지 |
| 127. S10-O10 reservation and normal segment coexist in catalog | 원출력 assertion | PASS | 기존 oracle 유지 |
| 128. S10-O04 reserve then finalize permits identical retry | 원출력 assertion | PASS | 기존 oracle 유지 |
| 129. S10-O10 reservation survives catalog rebuild without changing segment query | 원출력 assertion | PASS | 기존 oracle 유지 |
| 130. S10-O04 legacy segment cannot acquire retroactive reservation | 원출력 assertion | PASS | 기존 oracle 유지 |
| 131. S10-M06 opened catalog accepts fresh exact reservation V2 finalize | 원출력 assertion | PASS | 기존 oracle 유지 |
| 132. S10-M07 V2 find preserves complete metadata | 원출력 assertion | PASS | 기존 oracle 유지 |
| 133. S10-M07 identical V2 recovery is idempotent | 원출력 assertion | PASS | 기존 oracle 유지 |
| 134. S10-M07 V2 is absent from V1 range query | 원출력 assertion | PASS | 기존 oracle 유지 |
| 135. S10-M07 V2 registered path is not orphan | 원출력 assertion | PASS | 기존 oracle 유지 |
| 136. S10-M07 SQLite exact V2 JSON and path match | 원출력 assertion | PASS | 기존 oracle 유지 |
| 137. S10-M07 JSONL restart preserves V2 exact payload | 원출력 assertion | PASS | 기존 oracle 유지 |
| 138. S10-M06 wrong reservation tuple rejected store | 원출력 assertion | PASS | 기존 oracle 유지 |
| 139. S10-M06 wrong reservation tuple rejected request | 원출력 assertion | PASS | 기존 oracle 유지 |
| 140. S10-M06 wrong reservation tuple rejected segment | 원출력 assertion | PASS | 기존 oracle 유지 |
| 141. S10-M06 wrong reservation tuple rejected channel | 원출력 assertion | PASS | 기존 oracle 유지 |
| 142. S10-M06 wrong reservation tuple rejected sequence | 원출력 assertion | PASS | 기존 oracle 유지 |
| 143. S10-M09 immutable V2 mapping mismatch rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 144. S10-M09 bad V2 startup retry preserves original state bad-payload | 원출력 assertion | PASS | 기존 oracle 유지 |
| 145. S10-M09 bad V2 startup retry preserves original state missing-order | 원출력 assertion | PASS | 기존 oracle 유지 |
| 146. S10-M09 bad V2 startup retry preserves original state bad-order | 원출력 assertion | PASS | 기존 oracle 유지 |
| 147. S10-M09 bad V2 startup retry preserves original state conflicting-order | 원출력 assertion | PASS | 기존 oracle 유지 |
| 148. S10-M09 bad V2 startup retry preserves original state tail | 원출력 assertion | PASS | 기존 oracle 유지 |
| 149. S10-M09 bad V2 startup retry preserves original state corrupt | 원출력 assertion | PASS | 기존 oracle 유지 |
| 150. S10-M09 bad V2 startup retry preserves original state unsafe-path | 원출력 assertion | PASS | 기존 oracle 유지 |
| 151. S10-M09 default off rejects V2 before SQLite changes | 원출력 assertion | PASS | 기존 oracle 유지 |
| 152. S10-M09 V2 replay namespace and deletion duplicate | 원출력 assertion | PASS | 기존 oracle 유지 |
| 153. S10-M09 V2 replay namespace and deletion deleted | 원출력 assertion | PASS | 기존 oracle 유지 |
| 154. S10-M09 V2 replay namespace and deletion v1-before | 원출력 assertion | PASS | 기존 oracle 유지 |
| 155. S10-M09 V2 replay namespace and deletion v1-after | 원출력 assertion | PASS | 기존 oracle 유지 |
| 156. S10-M09 V2 replay namespace and deletion deleted-before | 원출력 assertion | PASS | 기존 oracle 유지 |
| 157. S10-M09 V2 replay namespace and deletion resurrection | 원출력 assertion | PASS | 기존 oracle 유지 |
| 158. S10-M09 V2 replay namespace and deletion mutation-collision | 원출력 assertion | PASS | 기존 oracle 유지 |
| 159. S10-M09 V2 finalize rejects missing media | 원출력 assertion | PASS | 기존 oracle 유지 |
| 160. S10-M09 V2 finalize rejects directory media | 원출력 assertion | PASS | 기존 oracle 유지 |
| 161. S10-M09 fresh candidate rejects mapping | 원출력 assertion | PASS | 기존 oracle 유지 |
| 162. S10-M09 fresh candidate rejects path | 원출력 assertion | PASS | 기존 oracle 유지 |
| 163. S10-M09 fresh candidate rejects tombstone | 원출력 assertion | PASS | 기존 oracle 유지 |
| 164. S10-SW01 managed empty root opens with lifetime lease | 원출력 assertion | PASS | 기존 oracle 유지 |
| 165. S10-SW02 same process second managed owner denied | 원출력 assertion | PASS | 기존 oracle 유지 |
| 166. S10-SW03 different process owner and inherited use denied | 원출력 assertion | PASS | 기존 oracle 유지 |
| 167. S10-SW12 managed duplicate descriptors are close-on-exec | 원출력 assertion | PASS | 기존 oracle 유지 |
| 168. S10-SW05 managed reserve append replay use owned descriptor | 원출력 assertion | PASS | 기존 oracle 유지 |
| 169. S10-SW06 raw managed access and legacy default path denied | 원출력 assertion | PASS | 기존 oracle 유지 |
| 170. S10-SW01 managed Reserve rejects different store identity | 원출력 assertion | PASS | 기존 oracle 유지 |
| 171. S10-SW10 catalog connection can inspect managed lease | 원출력 assertion | PASS | 기존 oracle 유지 |
| 172. S10-SW04 owner destruction releases lease | 원출력 assertion | PASS | 기존 oracle 유지 |
| 173. S10-SW01 managed reopen rejects different store identity | 원출력 assertion | PASS | 기존 oracle 유지 |
| 174. S10-SW11 managed incomplete tail rejects append without changing bytes | 원출력 assertion | PASS | 기존 oracle 유지 |
| 175. S10-SW07 legacy nonempty root preserved without conversion | 원출력 assertion | PASS | 기존 oracle 유지 |
| 176. S10-SW08 partial initialization retry validates exact state lease | 원출력 assertion | PASS | 기존 oracle 유지 |
| 177. S10-SW08 partial initialization retry validates exact state init | 원출력 assertion | PASS | 기존 oracle 유지 |
| 178. S10-SW08 partial initialization retry validates exact state barrier | 원출력 assertion | PASS | 기존 oracle 유지 |
| 179. S10-SW08 partial initialization retry validates exact state journal | 원출력 assertion | PASS | 기존 oracle 유지 |
| 180. S10-SW08 partial initialization retry validates exact state incomplete | 원출력 assertion | PASS | 기존 oracle 유지 |
| 181. S10-SW08 partial initialization retry validates exact state unknown | 원출력 assertion | PASS | 기존 oracle 유지 |
| 182. S10-SW09 symlink inode and malformed marker rejected journal | 원출력 assertion | PASS | 기존 oracle 유지 |
| 183. S10-SW09 symlink inode and malformed marker rejected marker | 원출력 assertion | PASS | 기존 oracle 유지 |
| 184. S10-SW09 symlink inode and malformed marker rejected barrier | 원출력 assertion | PASS | 기존 oracle 유지 |
| 185. S10-SW09 symlink inode and malformed marker rejected root-symlink | 원출력 assertion | PASS | 기존 oracle 유지 |
| 186. S10-SB01 second managed catalog is denied | 원출력 assertion | PASS | 기존 oracle 유지 |
| 187. S10-SB02 failed catalog cannot mutate journal or holds | 원출력 assertion | PASS | 기존 oracle 유지 |
| 188. S10-SB03 attached catalog blocks unowned append but permits reservation | 원출력 assertion | PASS | 기존 oracle 유지 |
| 189. S10-SB04 catalog destruction releases attachment | 원출력 assertion | PASS | 기존 oracle 유지 |
| 190. S10-SB05 managed catalog rejects unsafe options outside | 원출력 assertion | PASS | 기존 oracle 유지 |
| 191. S10-SB05 managed catalog rejects unsafe options dotdot | 원출력 assertion | PASS | 기존 oracle 유지 |
| 192. S10-SB05 managed catalog rejects unsafe options media-symlink | 원출력 assertion | PASS | 기존 oracle 유지 |
| 193. S10-SB05 managed catalog rejects unsafe options sqlite-symlink | 원출력 assertion | PASS | 기존 oracle 유지 |
| 194. S10-SB05 managed catalog rejects unsafe options sqlite-hardlink | 원출력 assertion | PASS | 기존 oracle 유지 |
| 195. S10-SB05 managed catalog rejects unsafe options disabled | 원출력 assertion | PASS | 기존 oracle 유지 |
| 196. S10-SB06 failed open releases catalog attachment | 원출력 assertion | PASS | 기존 oracle 유지 |
| 197. S10-SB07 managed SQLite sidecar rejected -wal symlink | 원출력 assertion | PASS | 기존 oracle 유지 |
| 198. S10-SB07 managed SQLite sidecar rejected -wal hardlink | 원출력 assertion | PASS | 기존 oracle 유지 |
| 199. S10-SB07 managed SQLite sidecar rejected -shm symlink | 원출력 assertion | PASS | 기존 oracle 유지 |
| 200. S10-SB07 managed SQLite sidecar rejected -shm hardlink | 원출력 assertion | PASS | 기존 oracle 유지 |
| 201. S10-SB07 managed SQLite sidecar rejected -journal symlink | 원출력 assertion | PASS | 기존 oracle 유지 |
| 202. S10-SB07 managed SQLite sidecar rejected -journal hardlink | 원출력 assertion | PASS | 기존 oracle 유지 |
| 203. S10-SC01 managed repeated event fixture is valid | 원출력 assertion | PASS | 기존 oracle 유지 |
| 204. S10-SC02 managed reservations avoid history reads | 원출력 assertion | PASS | 기존 oracle 유지 |
| 205. S10-SC03 managed V2 finalize avoids full replay | 원출력 assertion | PASS | 기존 oracle 유지 |
| 206. S10-SC04 checkpoint reduces superseded event payload bytes | 원출력 assertion | PASS | 기존 oracle 유지 |
| 207. S10-SC05 checkpoint preserves latest event and all record identities | 원출력 assertion | PASS | 기존 oracle 유지 |
| 208. S10-SC06 checkpoint is idempotent and preserves V2 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 209. S10-SC08 receipt preserves retry identity and rejects direct append | 원출력 assertion | PASS | 기존 oracle 유지 |
| 210. S10-SC09 checkpoint restart preserves SQLite and JSONL state sqlite | 원출력 assertion | PASS | 기존 oracle 유지 |
| 211. S10-SC09 managed checkpoint SQL V2 payload and path | 원출력 assertion | PASS | 기존 oracle 유지 |
| 212. S10-SC09 checkpoint restart preserves SQLite and JSONL state jsonl | 원출력 assertion | PASS | 기존 oracle 유지 |
| 213. S10-SC10 checkpoint prefix recovers before writes | 원출력 assertion | PASS | 기존 oracle 유지 |
| 214. S10-SC11 checkpoint mismatch preserves bytes and poisons owner | 원출력 assertion | PASS | 기존 oracle 유지 |
| 215. S10-SC12 first accepted mutation controls latest event | 원출력 assertion | PASS | 기존 oracle 유지 |
| 216. S10-SC16 automatic checkpoint uses accumulated growth | 원출력 assertion | PASS | 기존 oracle 유지 |
| 217. S10-SC07 raw checkpoint is rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 218. S10-SC18 checkpoint syscall failure poisons and reopens write | 원출력 assertion | PASS | 기존 oracle 유지 |
| 219. S10-SC21 poison rejects hold mutation write | 원출력 assertion | PASS | 기존 oracle 유지 |
| 220. S10-SC18 checkpoint syscall failure poisons and reopens file-fsync | 원출력 assertion | PASS | 기존 oracle 유지 |
| 221. S10-SC21 poison rejects hold mutation file-fsync | 원출력 assertion | PASS | 기존 oracle 유지 |
| 222. S10-SC18 checkpoint syscall failure poisons and reopens rename | 원출력 assertion | PASS | 기존 oracle 유지 |
| 223. S10-SC21 poison rejects hold mutation rename | 원출력 assertion | PASS | 기존 oracle 유지 |
| 224. S10-SC18 checkpoint syscall failure poisons and reopens dir-fsync | 원출력 assertion | PASS | 기존 oracle 유지 |
| 225. S10-SC21 poison rejects hold mutation dir-fsync | 원출력 assertion | PASS | 기존 oracle 유지 |
| 226. S10-SC17 checkpoint preserves holds observations and deletion | 원출력 assertion | PASS | 기존 oracle 유지 |
| 227. S10-SC17 checkpoint SQL hold observation tombstone | 원출력 assertion | PASS | 기존 oracle 유지 |
| 228. S10-SC17 checkpoint preserves holds observations and deletion restart sqlite | 원출력 assertion | PASS | 기존 oracle 유지 |
| 229. S10-SC17 checkpoint SQL restart observation tombstone | 원출력 assertion | PASS | 기존 oracle 유지 |
| 230. S10-SC17 checkpoint preserves holds observations and deletion restart jsonl | 원출력 assertion | PASS | 기존 oracle 유지 |
| 231. S10-SC19 invalid managed history remains unchanged malformed | 원출력 assertion | PASS | 기존 oracle 유지 |
| 232. S10-SC19 invalid managed history remains unchanged unsupported | 원출력 assertion | PASS | 기존 oracle 유지 |
| 233. S10-SC19 invalid managed history remains unchanged conflict | 원출력 assertion | PASS | 기존 oracle 유지 |
| 234. S10-SC20 raw catalog rejects receipt before side effects | 원출력 assertion | PASS | 기존 oracle 유지 |
| 235. S10-SC13 crypto off raw remains usable | 원출력 assertion | PASS | 기존 oracle 유지 |
| 236. S10-SC14 crypto off checkpoint is rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 237. S10-SC15 crypto off receipt reopen is rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 238. source 저장 callback reconcile 연결 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 239. policy revision idempotency | 원출력 assertion | PASS | 기존 oracle 유지 |
| 240. 5초 safety reconcile | 원출력 assertion | PASS | 기존 oracle 유지 |
| 241. composition root 관리 저장소 선행 open | 원출력 assertion | PASS | 기존 oracle 유지 |
| 242. composition helper journal 다음 catalog rebuild/open | 원출력 assertion | PASS | 기존 oracle 유지 |
| 243. 서버 전 supervisor 시작 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 244. ingress 전 event bridge 등록 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 245. ingress 종료 뒤 recorder finalize | 원출력 assertion | PASS | 기존 oracle 유지 |
| 246. composition root 시작/종료 순서 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 실행/정리 관측 | [cleanup] path=/tmp/media_server_v410_recording_catalog-51713 bytes=26849718 removed=true | PASS | exit0 원출력에 대응 |

원출력 assertion 행수: 246개. 이 결과는 해당 단기 범위만 인정하며 HTTP/전체 RAM 수명/최종 S11 PASS가 아니다.

## lp18-writer-01.txt

[원출력](lp18-writer-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. WR01 h264 managed segments decode all frames without legacy callback or snapshot | 원출력 assertion | PASS | 기존 oracle 유지 |
| 2. S10-C321 h264 실제 수락 원본 tuple과 segment 결박 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 3. WR01 vp8 managed segments decode all frames without legacy callback or snapshot | 원출력 assertion | PASS | 기존 oracle 유지 |
| 4. S10-C321 vp8 실제 수락 원본 tuple과 segment 결박 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 5. WR02 UTC-only change preserves media splits frames and independent mapping | 원출력 assertion | PASS | 기존 oracle 유지 |
| 6. WR03 UTC-only change preserves media splits frames and independent mapping | 원출력 assertion | PASS | 기존 oracle 유지 |
| 7. WR04 UTC-only change preserves media splits frames and independent mapping | 원출력 assertion | PASS | 기존 oracle 유지 |
| 8. WR05 duplicate PTS with advancing DTS preserves media and unknown mapping | 원출력 assertion | PASS | 기존 oracle 유지 |
| 9. WR06 explicit generation reset creates a new media epoch | 원출력 assertion | PASS | 기존 oracle 유지 |
| 10. S10-C326 세대별 원본 결박 분리 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 11. WR07 repeated observations and processing UTC do not duplicate media | 원출력 assertion | PASS | 기존 oracle 유지 |
| 12. S10-C325 분할·재전달의 segment별 수락 범위 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 13. S10-C322 keyframe 대기·다른 track·빈 입력·replay 제외 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 14. S10-C324 색인 상한 뒤에도 실제4100프레임 저장·미색인 꼬리 표시 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 15. WR08 missing final duration preserves media with unknown end | 원출력 assertion | PASS | 기존 oracle 유지 |
| 16. WR09 mapping budget retains bounded unknown tail and all frames | 원출력 assertion | PASS | 기존 oracle 유지 |
| 17. WR01 invalid binding rejects before writes journal | 원출력 assertion | PASS | 기존 oracle 유지 |
| 18. WR01 invalid binding rejects before writes catalog | 원출력 assertion | PASS | 기존 oracle 유지 |
| 19. WR01 invalid binding rejects before writes root | 원출력 assertion | PASS | 기존 oracle 유지 |
| 20. WR01 invalid binding rejects before writes store | 원출력 assertion | PASS | 기존 oracle 유지 |
| 21. WR01 invalid binding rejects before writes lease | 원출력 assertion | PASS | 기존 oracle 유지 |
| 22. WR01 invalid binding rejects before writes incomplete | 원출력 assertion | PASS | 기존 oracle 유지 |
| 23. WR08 clock process change preserves same-generation media with unknown comparison | 원출력 assertion | PASS | 기존 oracle 유지 |
| 24. WR08 invalid duration leaves unknown end zero | 원출력 assertion | PASS | 기존 oracle 유지 |
| 25. WR08 invalid duration leaves unknown end overflow | 원출력 assertion | PASS | 기존 oracle 유지 |
| 26. WR08 unsafe original input cannot become finalized observation | 원출력 assertion | PASS | 기존 oracle 유지 |
| 27. WR08 unsafe original input cannot become finalized pts | 원출력 assertion | PASS | 기존 oracle 유지 |
| 28. WR08 unsafe original input cannot become finalized range | 원출력 assertion | PASS | 기존 oracle 유지 |
| 29. WR07 older generation cache cannot switch media backwards | 원출력 assertion | PASS | 기존 oracle 유지 |
| 30. WR07 unrelated video track cannot change selected track identity | 원출력 assertion | PASS | 기존 oracle 유지 |
| 31. WR06 reopened store allocates fresh IDs and increasing durable order | 원출력 assertion | PASS | 기존 oracle 유지 |
| 32. WR05 actual H264 reordering preserves decode timestamps and mux origin | 원출력 assertion | PASS | 기존 oracle 유지 |
| 33. WR05 reordered segment end covers maximum presented frame end | 원출력 assertion | PASS | 기존 oracle 유지 |
| 34. S10-C327 실제 B-frame 원본PTS·ordinal 보존 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 35. WR08 missing maximum PTS frame duration keeps reordered end unknown | 원출력 assertion | PASS | 기존 oracle 유지 |
| 36. WR09 failed active commit preserves ready order and quota reservation | 원출력 assertion | PASS | 기존 oracle 유지 |
| 37. WR09 restart recovers the same durable segment and all frames | 원출력 assertion | PASS | 기존 oracle 유지 |
| 38. WR08 excessive clock width preserves media as unknown | 원출력 assertion | PASS | 기존 oracle 유지 |
| 39. WR08 zero generation order cannot become finalized | 원출력 assertion | PASS | 기존 oracle 유지 |
| 40. WR08 media observation quality normal | 원출력 assertion | PASS | 기존 oracle 유지 |
| 41. WR08 media observation quality fast | 원출력 assertion | PASS | 기존 oracle 유지 |
| 42. WR08 media observation quality drift | 원출력 assertion | PASS | 기존 oracle 유지 |
| 43. WR08 media observation quality fast-step | 원출력 assertion | PASS | 기존 oracle 유지 |
| 44. WR01 actual appsink observation flows through managed writer and decode | 원출력 assertion | PASS | 기존 oracle 유지 |
| 실행/정리 관측 | [summary] pass=44 fail=0 | PASS | exit0 원출력에 대응 |
| 실행/정리 관측 | [cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-managed-writer.Ed3hhv bytes=16596907 removed=true | PASS | exit0 원출력에 대응 |
| 실행/정리 관측 | [elapsed] seconds=10 source=bash-SECONDS | PASS | exit0 원출력에 대응 |

원출력 assertion 행수: 44개. 이 결과는 해당 단기 범위만 인정하며 HTTP/전체 RAM 수명/최종 S11 PASS가 아니다.

## lp18-transition-01.txt

[원출력](lp18-transition-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP14-C01 state=1 updates=1 full_parse=1 expected=1 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 2. LP14-C01 state=2 updates=1 full_parse=1 expected=1 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 3. LP14-C01 state=3 updates=1 full_parse=1 expected=1 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 4. LP14-C03 memory/sqlite canonical bytes and CompletedOracle | 원출력 assertion | PASS | 기존 oracle 유지 |
| 5. LP14-C02 binding=payload rejected without apply | 원출력 assertion | PASS | 기존 oracle 유지 |
| 6. LP14-C02 binding=type rejected without apply | 원출력 assertion | PASS | 기존 oracle 유지 |
| 7. LP14-C02 binding=entity rejected without apply | 원출력 assertion | PASS | 기존 oracle 유지 |
| 8. LP14-C02 binding=owner rejected without apply | 원출력 assertion | PASS | 기존 oracle 유지 |
| 9. LP14-C02 binding=prior rejected without apply | 원출력 assertion | PASS | 기존 oracle 유지 |
| 10. LP14-C02 duplicate envelope no-apply/conflict rejection | 원출력 assertion | PASS | 기존 oracle 유지 |
| 11. LP14-C02 one-shot apply/reuse rejection | 원출력 assertion | PASS | 기존 oracle 유지 |
| 실행/정리 관측 | [cleanup] {"root":"/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-transition-reuse.t0QH2L","bytes":8921774,"removed":true} | PASS | exit0 원출력에 대응 |
| 실행/정리 관측 | [exit] code=0 elapsed_seconds=5 source=bash-SECONDS | PASS | exit0 원출력에 대응 |

원출력 assertion 행수: 11개. 이 결과는 해당 단기 범위만 인정하며 HTTP/전체 RAM 수명/최종 S11 PASS가 아니다.

## lp18-identity-01.txt

[원출력](lp18-identity-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. CP06 exact canonical sequence equality | 원출력 assertion | PASS | 기존 oracle 유지 |
| 2. CP06 same length different payload rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 3. CP06 reordered sequence rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 4. CP06 different count rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 5. CP06 different schema despite canonical equality rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 6. CP06 different enum despite canonical equality rejected | 원출력 assertion | PASS | 기존 oracle 유지 |
| 실행/정리 관측 | [summary] pass=6 fail=0 | PASS | exit0 원출력에 대응 |
| 실행/정리 관측 | [cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-checkpoint-reproduction.vZhAqI bytes=1013691 removed=true | PASS | exit0 원출력에 대응 |
| 실행/정리 관측 | [elapsed] seconds=1 source=bash-SECONDS | PASS | exit0 원출력에 대응 |

원출력 assertion 행수: 6개. 이 결과는 해당 단기 범위만 인정하며 HTTP/전체 RAM 수명/최종 S11 PASS가 아니다.

## lp17-small-lp18-shared-01.txt

[원출력](lp17-small-lp18-shared-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| runtime-freshness | {"kind":"phase-result","label":"runtime-freshness","diagnosticPass":true,"historicalRssPass":null,"observationValid":null,"semanticPass":null,"cleanupPass":true,"exitCode":0,"signal":null,"stopReason":null,"elapsedMs":612,"groupPeakRssBytes":103022592,"observationFailure":null,"outputBytes":818} | PASS | 실제 관측 |
| 1. FC01 exact insertion checks count=97 | 원출력 assertion | PASS | 기존 oracle 유지 |
| compile | {"kind":"phase-result","label":"compile","diagnosticPass":true,"historicalRssPass":null,"observationValid":null,"semanticPass":null,"cleanupPass":true,"exitCode":0,"signal":null,"stopReason":null,"elapsedMs":4181,"groupPeakRssBytes":369213440,"observationFailure":null,"outputBytes":2905} | PASS | 실제 관측 |
| 2. recorded FE02 writer start | 원출력 assertion | PASS | 기존 oracle 유지 |
| 3. recorded FE04 bound finalized mutation segment0 | 원출력 assertion | PASS | 기존 oracle 유지 |
| 4. LP17/prepare LP02.actual4096-prerequisite | 원출력 assertion | PASS | 기존 oracle 유지 |
| 5. LP17/prepare seed.input-count | 원출력 assertion | PASS | 기존 oracle 유지 |
| 6. LP17/prepare seed.input-identity-all-samples | 원출력 assertion | PASS | 기존 oracle 유지 |
| 7. LP17/prepare seed.physical-evidence | 원출력 assertion | PASS | 기존 oracle 유지 |
| prepare | {"kind":"phase-result","label":"prepare","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":157138944,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"prepare","arm":"seed","samples":32,"count":2,"pass":6,"fail":0},"elapsedMs":1689,"groupPeakRssBytes":183369728,"observationFailure":null,"outputBytes":1433} | PASS | 실제 관측 |
| 8. LP17/commit1 LP02.reserve | 원출력 assertion | PASS | 기존 oracle 유지 |
| 9. LP17/commit1 LP02.actual-file-outside-catalog | 원출력 assertion | PASS | 기존 oracle 유지 |
| 10. LP17/commit1 LP02.commit | 원출력 assertion | PASS | 기존 oracle 유지 |
| 11. LP17/commit2 LP02.reserve | 원출력 assertion | PASS | 기존 oracle 유지 |
| 12. LP17/commit2 LP02.actual-file-outside-catalog | 원출력 assertion | PASS | 기존 oracle 유지 |
| 13. LP17/commit2 LP02.commit | 원출력 assertion | PASS | 기존 oracle 유지 |
| 14. LP17/snapshot2 LP02.snapshot-exact-count | 원출력 assertion | PASS | 기존 oracle 유지 |
| 15. LP17/snapshot2 snapshot.canonical-all | 원출력 assertion | PASS | 기존 oracle 유지 |
| 16. LP17/snapshot2 LP02.explicit-checkpoint | 원출력 assertion | PASS | 기존 oracle 유지 |
| 17. LP17/snapshot2 LP02.reservation-bound-mutation-count | 원출력 assertion | PASS | 기존 oracle 유지 |
| 18. LP17/delete delete.original-canonical | 원출력 assertion | PASS | 기존 oracle 유지 |
| 19. LP17/delete delete.pending | 원출력 assertion | PASS | 기존 oracle 유지 |
| 20. LP17/delete delete.unlink | 원출력 assertion | PASS | 기존 oracle 유지 |
| 21. LP17/delete delete.tombstone | 원출력 assertion | PASS | 기존 oracle 유지 |
| 22. LP17/delete delete.checkpoint | 원출력 assertion | PASS | 기존 oracle 유지 |
| 23. LP17/delete delete.binding-preserved | 원출력 assertion | PASS | 기존 oracle 유지 |
| 24. LP17/delete deleted.public-hidden | 원출력 assertion | PASS | 기존 oracle 유지 |
| scale-A | {"kind":"phase-result","label":"scale-A","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":41926656,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"scale","arm":"A","samples":32,"count":2,"pass":17,"fail":0},"elapsedMs":276,"groupPeakRssBytes":43122688,"observationFailure":null,"outputBytes":52700} | PASS | 실제 관측 |
| 25. LP17/reopen/sqlite LP02.journal-reopen | 원출력 assertion | PASS | 기존 oracle 유지 |
| 26. LP17/reopen/sqlite LP02.catalog-reopen | 원출력 assertion | PASS | 기존 oracle 유지 |
| 27. LP17/reopen/sqlite/0 LP02.exact-source | 원출력 assertion | PASS | 기존 oracle 유지 |
| 28. LP17/reopen/sqlite/0 deleted.public-hidden | 원출력 assertion | PASS | 기존 oracle 유지 |
| 29. LP17/reopen/sqlite/0 reopen.deleted-state | 원출력 assertion | PASS | 기존 oracle 유지 |
| 30. LP17/reopen/sqlite/1 LP02.exact-source | 원출력 assertion | PASS | 기존 oracle 유지 |
| 31. LP17/reopen/sqlite/1 reopen.remaining-media | 원출력 assertion | PASS | 기존 oracle 유지 |
| reopen-A-sqlite | {"kind":"phase-result","label":"reopen-A-sqlite","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":41451520,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"reopen","arm":"A","samples":32,"count":2,"pass":7,"fail":0},"elapsedMs":273,"groupPeakRssBytes":0,"observationFailure":null,"outputBytes":10421} | PASS | 실제 관측 |
| 32. LP17/reopen/jsonl LP02.journal-reopen | 원출력 assertion | PASS | 기존 oracle 유지 |
| 33. LP17/reopen/jsonl LP02.catalog-reopen | 원출력 assertion | PASS | 기존 oracle 유지 |
| 34. LP17/reopen/jsonl/0 LP02.exact-source | 원출력 assertion | PASS | 기존 oracle 유지 |
| 35. LP17/reopen/jsonl/0 deleted.public-hidden | 원출력 assertion | PASS | 기존 oracle 유지 |
| 36. LP17/reopen/jsonl/0 reopen.deleted-state | 원출력 assertion | PASS | 기존 oracle 유지 |
| 37. LP17/reopen/jsonl/1 LP02.exact-source | 원출력 assertion | PASS | 기존 oracle 유지 |
| 38. LP17/reopen/jsonl/1 reopen.remaining-media | 원출력 assertion | PASS | 기존 oracle 유지 |
| reopen-A-jsonl | {"kind":"phase-result","label":"reopen-A-jsonl","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":40828928,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"reopen","arm":"A","samples":32,"count":2,"pass":7,"fail":0},"elapsedMs":252,"groupPeakRssBytes":0,"observationFailure":null,"outputBytes":8802} | PASS | 실제 관측 |
| store-cleanup | {"kind":"store-cleanup","store":"<owned-root>/store-A","bytes":256627,"removed":true} | PASS | 실제 관측 |
| 39. LP17/commit1 LP02.reserve | 원출력 assertion | PASS | 기존 oracle 유지 |
| 40. LP17/commit1 LP02.actual-file-outside-catalog | 원출력 assertion | PASS | 기존 oracle 유지 |
| 41. LP17/commit1 LP02.commit | 원출력 assertion | PASS | 기존 oracle 유지 |
| 42. LP17/commit2 LP02.reserve | 원출력 assertion | PASS | 기존 oracle 유지 |
| 43. LP17/commit2 LP02.actual-file-outside-catalog | 원출력 assertion | PASS | 기존 oracle 유지 |
| 44. LP17/commit2 LP02.commit | 원출력 assertion | PASS | 기존 oracle 유지 |
| 45. LP17/snapshot2 LP02.snapshot-exact-count | 원출력 assertion | PASS | 기존 oracle 유지 |
| 46. LP17/snapshot2 snapshot.canonical-all | 원출력 assertion | PASS | 기존 oracle 유지 |
| 47. LP17/snapshot2 LP02.explicit-checkpoint | 원출력 assertion | PASS | 기존 oracle 유지 |
| 48. LP17/snapshot2 LP02.reservation-bound-mutation-count | 원출력 assertion | PASS | 기존 oracle 유지 |
| 49. LP17/delete delete.original-canonical | 원출력 assertion | PASS | 기존 oracle 유지 |
| 50. LP17/delete delete.pending | 원출력 assertion | PASS | 기존 oracle 유지 |
| 51. LP17/delete delete.unlink | 원출력 assertion | PASS | 기존 oracle 유지 |
| 52. LP17/delete delete.tombstone | 원출력 assertion | PASS | 기존 oracle 유지 |
| 53. LP17/delete delete.checkpoint | 원출력 assertion | PASS | 기존 oracle 유지 |
| 54. LP17/delete delete.binding-preserved | 원출력 assertion | PASS | 기존 oracle 유지 |
| 55. LP17/delete deleted.public-hidden | 원출력 assertion | PASS | 기존 oracle 유지 |
| scale-B | {"kind":"phase-result","label":"scale-B","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":41926656,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"scale","arm":"B","samples":32,"count":2,"pass":17,"fail":0},"elapsedMs":276,"groupPeakRssBytes":43155456,"observationFailure":null,"outputBytes":52676} | PASS | 실제 관측 |
| 56. LP17/reopen/sqlite LP02.journal-reopen | 원출력 assertion | PASS | 기존 oracle 유지 |
| 57. LP17/reopen/sqlite LP02.catalog-reopen | 원출력 assertion | PASS | 기존 oracle 유지 |
| 58. LP17/reopen/sqlite/0 LP02.exact-source | 원출력 assertion | PASS | 기존 oracle 유지 |
| 59. LP17/reopen/sqlite/0 deleted.public-hidden | 원출력 assertion | PASS | 기존 oracle 유지 |
| 60. LP17/reopen/sqlite/0 reopen.deleted-state | 원출력 assertion | PASS | 기존 oracle 유지 |
| 61. LP17/reopen/sqlite/1 LP02.exact-source | 원출력 assertion | PASS | 기존 oracle 유지 |
| 62. LP17/reopen/sqlite/1 reopen.remaining-media | 원출력 assertion | PASS | 기존 oracle 유지 |
| reopen-B-sqlite | {"kind":"phase-result","label":"reopen-B-sqlite","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":41451520,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"reopen","arm":"B","samples":32,"count":2,"pass":7,"fail":0},"elapsedMs":274,"groupPeakRssBytes":0,"observationFailure":null,"outputBytes":10409} | PASS | 실제 관측 |
| 63. LP17/reopen/jsonl LP02.journal-reopen | 원출력 assertion | PASS | 기존 oracle 유지 |
| 64. LP17/reopen/jsonl LP02.catalog-reopen | 원출력 assertion | PASS | 기존 oracle 유지 |
| 65. LP17/reopen/jsonl/0 LP02.exact-source | 원출력 assertion | PASS | 기존 oracle 유지 |
| 66. LP17/reopen/jsonl/0 deleted.public-hidden | 원출력 assertion | PASS | 기존 oracle 유지 |
| 67. LP17/reopen/jsonl/0 reopen.deleted-state | 원출력 assertion | PASS | 기존 oracle 유지 |
| 68. LP17/reopen/jsonl/1 LP02.exact-source | 원출력 assertion | PASS | 기존 oracle 유지 |
| 69. LP17/reopen/jsonl/1 reopen.remaining-media | 원출력 assertion | PASS | 기존 oracle 유지 |
| reopen-B-jsonl | {"kind":"phase-result","label":"reopen-B-jsonl","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":40828928,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"reopen","arm":"B","samples":32,"count":2,"pass":7,"fail":0},"elapsedMs":250,"groupPeakRssBytes":0,"observationFailure":null,"outputBytes":8786} | PASS | 실제 관측 |
| store-cleanup | {"kind":"store-cleanup","store":"<owned-root>/store-B","bytes":256627,"removed":true} | PASS | 실제 관측 |
| 70. LP17/commit1 LP02.reserve | 원출력 assertion | PASS | 기존 oracle 유지 |
| 71. LP17/commit1 LP02.actual-file-outside-catalog | 원출력 assertion | PASS | 기존 oracle 유지 |
| 72. LP17/commit1 LP02.commit | 원출력 assertion | PASS | 기존 oracle 유지 |
| 73. LP17/commit2 LP02.reserve | 원출력 assertion | PASS | 기존 oracle 유지 |
| 74. LP17/commit2 LP02.actual-file-outside-catalog | 원출력 assertion | PASS | 기존 oracle 유지 |
| 75. LP17/commit2 LP02.commit | 원출력 assertion | PASS | 기존 oracle 유지 |
| 76. LP17/snapshot2 LP02.snapshot-exact-count | 원출력 assertion | PASS | 기존 oracle 유지 |
| 77. LP17/snapshot2 snapshot.canonical-all | 원출력 assertion | PASS | 기존 oracle 유지 |
| 78. LP17/snapshot2 LP02.explicit-checkpoint | 원출력 assertion | PASS | 기존 oracle 유지 |
| 79. LP17/snapshot2 LP02.reservation-bound-mutation-count | 원출력 assertion | PASS | 기존 oracle 유지 |
| 80. LP17/delete delete.original-canonical | 원출력 assertion | PASS | 기존 oracle 유지 |
| 81. LP17/delete delete.pending | 원출력 assertion | PASS | 기존 oracle 유지 |
| 82. LP17/delete delete.unlink | 원출력 assertion | PASS | 기존 oracle 유지 |
| 83. LP17/delete delete.tombstone | 원출력 assertion | PASS | 기존 oracle 유지 |
| 84. LP17/delete delete.checkpoint | 원출력 assertion | PASS | 기존 oracle 유지 |
| 85. LP17/delete delete.binding-preserved | 원출력 assertion | PASS | 기존 oracle 유지 |
| 86. LP17/delete deleted.public-hidden | 원출력 assertion | PASS | 기존 oracle 유지 |
| scale-C | {"kind":"phase-result","label":"scale-C","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":41811968,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"scale","arm":"C","samples":32,"count":2,"pass":17,"fail":0},"elapsedMs":277,"groupPeakRssBytes":42958848,"observationFailure":null,"outputBytes":54856} | PASS | 실제 관측 |
| 87. LP17/reopen/sqlite LP02.journal-reopen | 원출력 assertion | PASS | 기존 oracle 유지 |
| 88. LP17/reopen/sqlite LP02.catalog-reopen | 원출력 assertion | PASS | 기존 oracle 유지 |
| 89. LP17/reopen/sqlite/0 LP02.exact-source | 원출력 assertion | PASS | 기존 oracle 유지 |
| 90. LP17/reopen/sqlite/0 deleted.public-hidden | 원출력 assertion | PASS | 기존 oracle 유지 |
| 91. LP17/reopen/sqlite/0 reopen.deleted-state | 원출력 assertion | PASS | 기존 oracle 유지 |
| 92. LP17/reopen/sqlite/1 LP02.exact-source | 원출력 assertion | PASS | 기존 oracle 유지 |
| 93. LP17/reopen/sqlite/1 reopen.remaining-media | 원출력 assertion | PASS | 기존 oracle 유지 |
| reopen-C-sqlite | {"kind":"phase-result","label":"reopen-C-sqlite","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":41402368,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"reopen","arm":"C","samples":32,"count":2,"pass":7,"fail":0},"elapsedMs":261,"groupPeakRssBytes":0,"observationFailure":null,"outputBytes":10409} | PASS | 실제 관측 |
| 94. LP17/reopen/jsonl LP02.journal-reopen | 원출력 assertion | PASS | 기존 oracle 유지 |
| 95. LP17/reopen/jsonl LP02.catalog-reopen | 원출력 assertion | PASS | 기존 oracle 유지 |
| 96. LP17/reopen/jsonl/0 LP02.exact-source | 원출력 assertion | PASS | 기존 oracle 유지 |
| 97. LP17/reopen/jsonl/0 deleted.public-hidden | 원출력 assertion | PASS | 기존 oracle 유지 |
| 98. LP17/reopen/jsonl/0 reopen.deleted-state | 원출력 assertion | PASS | 기존 oracle 유지 |
| 99. LP17/reopen/jsonl/1 LP02.exact-source | 원출력 assertion | PASS | 기존 oracle 유지 |
| 100. LP17/reopen/jsonl/1 reopen.remaining-media | 원출력 assertion | PASS | 기존 oracle 유지 |
| reopen-C-jsonl | {"kind":"phase-result","label":"reopen-C-jsonl","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":40697856,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"reopen","arm":"C","samples":32,"count":2,"pass":7,"fail":0},"elapsedMs":252,"groupPeakRssBytes":0,"observationFailure":null,"outputBytes":8790} | PASS | 실제 관측 |
| store-cleanup | {"kind":"store-cleanup","store":"<owned-root>/store-C","bytes":256627,"removed":true} | PASS | 실제 관측 |
| source-unchanged | {"kind":"source-unchanged","unchanged":true} | PASS | 실제 관측 |
| cleanup | {"kind":"cleanup","bytes":18468398,"removed":true} | PASS | 실제 관측 |
| run-result | {"kind":"run-result","mode":"small","id":"lp18-shared-01","diagnosticPass":true,"failure":null,"phases":12,"elapsedMs":9346,"productPass":false,"tokenConsumed":null} | PASS | 실제 관측 |

원출력 assertion 행수: 100개. 이 결과는 해당 단기 범위만 인정하며 HTTP/전체 RAM 수명/최종 S11 PASS가 아니다.

## accepted 공유 단위

예상 RED와 최종 GREEN을 구분하며, catalog 최초 수집 누락은 별도 FAIL로 보존한다.

### lp18-ownership-red-accepted-01.txt

[원출력](lp18-ownership-red-accepted-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| build | {"kind":"phase","label":"build","exit":0,"signal":null,"stopReason":null,"cleanup":true,"elapsedMs":2238,"groupPeakRssBytes":300793856} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| 1. LP18-O01 owner checked read view shares journal envelope | 실제 assertion | PASS | 원출력 판정 보존 |
| 2. LP18-O01 shared journal original candidate envelopes | 실제 assertion | PASS | 원출력 판정 보존 |
| 3. LP18-O01 public Replay value mutation remains isolated | 실제 assertion | PASS | 원출력 판정 보존 |
| 4. LP18-O01 retained prefix shares journal envelope | 실제 assertion | PASS | 원출력 판정 보존 |
| 5. LP18-O01 full canonical and projection oracle | 실제 assertion | PASS | 원출력 판정 보존 |
| 6. LP18-O03 stale candidate after reservation rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 7. LP18-O03 foreign owner candidate rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 8. LP18-O04 exact field order or prefix mutation rejected schema | 실제 assertion | PASS | 원출력 판정 보존 |
| 9. LP18-O04 standalone candidate fields rejected without disk change schema | 실제 assertion | PASS | 원출력 판정 보존 |
| 10. LP18-O04 exact field order or prefix mutation rejected type | 실제 assertion | PASS | 원출력 판정 보존 |
| 11. LP18-O04 standalone candidate fields rejected without disk change type | 실제 assertion | PASS | 원출력 판정 보존 |
| 12. LP18-O04 exact field order or prefix mutation rejected id | 실제 assertion | PASS | 원출력 판정 보존 |
| 13. LP18-O04 standalone candidate fields rejected without disk change id | 실제 assertion | PASS | 원출력 판정 보존 |
| 14. LP18-O04 exact field order or prefix mutation rejected entity | 실제 assertion | PASS | 원출력 판정 보존 |
| 15. LP18-O04 standalone candidate fields rejected without disk change entity | 실제 assertion | PASS | 원출력 판정 보존 |
| 16. LP18-O04 exact field order or prefix mutation rejected time | 실제 assertion | PASS | 원출력 판정 보존 |
| 17. LP18-O04 standalone candidate fields rejected without disk change time | 실제 assertion | PASS | 원출력 판정 보존 |
| 18. LP18-O04 exact field order or prefix mutation rejected payload | 실제 assertion | PASS | 원출력 판정 보존 |
| 19. LP18-O04 standalone candidate fields rejected without disk change payload | 실제 assertion | PASS | 원출력 판정 보존 |
| 20. LP18-O04 exact field order or prefix mutation rejected reorder | 실제 assertion | PASS | 원출력 판정 보존 |
| 21. LP18-O04 standalone candidate fields rejected without disk change reorder | 실제 assertion | PASS | 원출력 판정 보존 |
| 22. LP18-O04 exact field order or prefix mutation rejected shrink | 실제 assertion | PASS | 원출력 판정 보존 |
| 23. LP18-O04 standalone candidate fields rejected without disk change shrink | 실제 assertion | PASS | 원출력 판정 보존 |
| 24. LP18-O04 null envelope safely rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 25. LP18-O02 only transformed receipts own new envelopes | 실제 assertion | PASS | 원출력 판정 보존 |
| 26. LP18-O02 prepared receipts preserve original canonical bytes | 실제 assertion | PASS | 원출력 판정 보존 |
| 27. LP18-O02 publication bytes and prior owned snapshot remain exact | 실제 assertion | PASS | 원출력 판정 보존 |
| 28. LP18-O02 published journal and prefix share transformed receipt envelopes | 실제 assertion | PASS | 원출력 판정 보존 |
| 29. LP18-O02 receipt independent full projection equality | 실제 assertion | PASS | 원출력 판정 보존 |
| 30. LP18-O03 stale candidate after ordinary append rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 31. LP18-O05 8192 logical records admitted | 실제 assertion | PASS | 원출력 판정 보존 |
| 32. LP18-O05 8193 aliases still rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 33. LP18-O05 64MiB logical bytes admitted | 실제 assertion | PASS | 원출력 판정 보존 |
| 34. LP18-O05 64MiB plus one rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 35. LP18-O07 append accepted shares journal envelope | 실제 assertion | FAIL | 원출력 판정 보존 |
| 36. LP18-O07 checkpoint accepted shares live journal envelope | 실제 assertion | FAIL | 원출력 판정 보존 |
| 37. LP18-O07 accepted full canonical and durable bytes unchanged | 실제 assertion | PASS | 원출력 판정 보존 |
| 38. LP18-O08 reopen accepted shares journal envelope sqlite | 실제 assertion | FAIL | 원출력 판정 보존 |
| 39. LP18-O08 reopen canonical ordinal and projection preserved sqlite | 실제 assertion | PASS | 원출력 판정 보존 |
| 40. LP18-O08 SQLite rebuild requires canonical and ordinal gates | 실제 assertion | PASS | 원출력 판정 보존 |
| 41. LP18-O08 reopen accepted shares journal envelope fallback | 실제 assertion | FAIL | 원출력 판정 보존 |
| 42. LP18-O08 reopen canonical ordinal and projection preserved fallback | 실제 assertion | PASS | 원출력 판정 보존 |
| 43. LP18-O09 supplied envelope mismatch rejected schema | 실제 assertion | FAIL | 원출력 판정 보존 |
| 44. LP18-O09 supplied envelope mismatch rejected type | 실제 assertion | FAIL | 원출력 판정 보존 |
| 45. LP18-O09 supplied envelope mismatch rejected id | 실제 assertion | FAIL | 원출력 판정 보존 |
| 46. LP18-O09 supplied envelope mismatch rejected entity | 실제 assertion | FAIL | 원출력 판정 보존 |
| 47. LP18-O09 supplied envelope mismatch rejected time | 실제 assertion | FAIL | 원출력 판정 보존 |
| 48. LP18-O09 supplied envelope mismatch rejected payload | 실제 assertion | FAIL | 원출력 판정 보존 |
| 49. LP18-O09 failed apply registers no accepted envelope | 실제 assertion | PASS | 원출력 판정 보존 |
| 50. LP18-O09 supplied exact envelope is retained | 실제 assertion | FAIL | 원출력 판정 보존 |
| 51. LP18-O09 duplicate full canonical acceptance and collision rejection preserved | 실제 assertion | PASS | 원출력 판정 보존 |
| focused summary | [summary] LP18 pass=40 fail=11 | FAIL | focused exit1의 예상 RED. runner의 RED 일치 PASS와 구분 |
| focused | {"kind":"phase","label":"focused","exit":1,"signal":null,"stopReason":null,"cleanup":true,"elapsedMs":644,"groupPeakRssBytes":4227072} | FAIL | RED focused의 exit1은 실제 FAIL로 보존 |
| oracle | {"kind":"oracle","mode":"red","expectedRed":true,"productPass":false,"matched":true} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| source-unchanged | {"kind":"source-unchanged","unchanged":true} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| cleanup | {"kind":"cleanup","bytes":5325801,"removed":true} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| result | {"kind":"result","utc":"2026-09-19T13:27:10.736Z","mode":"red","matched":true,"productPass":false,"elapsedMs":2897} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |

원출력 assertion 행수: 51개. 실행 범위/한계는 중앙 LP18 기록을 따른다.

### lp18-accepted-build-01.txt

[원출력](lp18-accepted-build-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 제품 빌드 | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh build, exit0 | PASS | 이후 소스 수정으로 최종 evidence는02 사용 |

원출력 assertion 행수: 0개. 실행 범위/한계는 중앙 LP18 기록을 따른다.

### lp18-accepted-build-02.txt

[원출력](lp18-accepted-build-02.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 제품 빌드 | MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh build, exit0 | PASS | output alias 수명 보완 포함 |

원출력 assertion 행수: 0개. 실행 범위/한계는 중앙 LP18 기록을 따른다.

### lp18-ownership-green-accepted-01.txt

[원출력](lp18-ownership-green-accepted-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| build | {"kind":"phase","label":"build","exit":0,"signal":null,"stopReason":null,"cleanup":true,"elapsedMs":2263,"groupPeakRssBytes":306233344} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| 1. LP18-O01 owner checked read view shares journal envelope | 실제 assertion | PASS | 원출력 판정 보존 |
| 2. LP18-O01 shared journal original candidate envelopes | 실제 assertion | PASS | 원출력 판정 보존 |
| 3. LP18-O01 public Replay value mutation remains isolated | 실제 assertion | PASS | 원출력 판정 보존 |
| 4. LP18-O01 retained prefix shares journal envelope | 실제 assertion | PASS | 원출력 판정 보존 |
| 5. LP18-O01 full canonical and projection oracle | 실제 assertion | PASS | 원출력 판정 보존 |
| 6. LP18-O03 stale candidate after reservation rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 7. LP18-O03 foreign owner candidate rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 8. LP18-O04 exact field order or prefix mutation rejected schema | 실제 assertion | PASS | 원출력 판정 보존 |
| 9. LP18-O04 standalone candidate fields rejected without disk change schema | 실제 assertion | PASS | 원출력 판정 보존 |
| 10. LP18-O04 exact field order or prefix mutation rejected type | 실제 assertion | PASS | 원출력 판정 보존 |
| 11. LP18-O04 standalone candidate fields rejected without disk change type | 실제 assertion | PASS | 원출력 판정 보존 |
| 12. LP18-O04 exact field order or prefix mutation rejected id | 실제 assertion | PASS | 원출력 판정 보존 |
| 13. LP18-O04 standalone candidate fields rejected without disk change id | 실제 assertion | PASS | 원출력 판정 보존 |
| 14. LP18-O04 exact field order or prefix mutation rejected entity | 실제 assertion | PASS | 원출력 판정 보존 |
| 15. LP18-O04 standalone candidate fields rejected without disk change entity | 실제 assertion | PASS | 원출력 판정 보존 |
| 16. LP18-O04 exact field order or prefix mutation rejected time | 실제 assertion | PASS | 원출력 판정 보존 |
| 17. LP18-O04 standalone candidate fields rejected without disk change time | 실제 assertion | PASS | 원출력 판정 보존 |
| 18. LP18-O04 exact field order or prefix mutation rejected payload | 실제 assertion | PASS | 원출력 판정 보존 |
| 19. LP18-O04 standalone candidate fields rejected without disk change payload | 실제 assertion | PASS | 원출력 판정 보존 |
| 20. LP18-O04 exact field order or prefix mutation rejected reorder | 실제 assertion | PASS | 원출력 판정 보존 |
| 21. LP18-O04 standalone candidate fields rejected without disk change reorder | 실제 assertion | PASS | 원출력 판정 보존 |
| 22. LP18-O04 exact field order or prefix mutation rejected shrink | 실제 assertion | PASS | 원출력 판정 보존 |
| 23. LP18-O04 standalone candidate fields rejected without disk change shrink | 실제 assertion | PASS | 원출력 판정 보존 |
| 24. LP18-O04 null envelope safely rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 25. LP18-O02 only transformed receipts own new envelopes | 실제 assertion | PASS | 원출력 판정 보존 |
| 26. LP18-O02 prepared receipts preserve original canonical bytes | 실제 assertion | PASS | 원출력 판정 보존 |
| 27. LP18-O02 publication bytes and prior owned snapshot remain exact | 실제 assertion | PASS | 원출력 판정 보존 |
| 28. LP18-O02 published journal and prefix share transformed receipt envelopes | 실제 assertion | PASS | 원출력 판정 보존 |
| 29. LP18-O02 receipt independent full projection equality | 실제 assertion | PASS | 원출력 판정 보존 |
| 30. LP18-O03 stale candidate after ordinary append rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 31. LP18-O05 8192 logical records admitted | 실제 assertion | PASS | 원출력 판정 보존 |
| 32. LP18-O05 8193 aliases still rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 33. LP18-O05 64MiB logical bytes admitted | 실제 assertion | PASS | 원출력 판정 보존 |
| 34. LP18-O05 64MiB plus one rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 35. LP18-O07 append accepted shares journal envelope | 실제 assertion | PASS | 원출력 판정 보존 |
| 36. LP18-O09 successful append retry returns exact input envelope | 실제 assertion | PASS | 원출력 판정 보존 |
| 37. LP18-O09 failed append clears prior output handle | 실제 assertion | PASS | 원출력 판정 보존 |
| 38. LP18-O09 borrowed input survives aliased output reset | 실제 assertion | PASS | 원출력 판정 보존 |
| 39. LP18-O07 checkpoint accepted shares live journal envelope | 실제 assertion | PASS | 원출력 판정 보존 |
| 40. LP18-O07 accepted full canonical and durable bytes unchanged | 실제 assertion | PASS | 원출력 판정 보존 |
| 41. LP18-O08 reopen accepted shares journal envelope sqlite | 실제 assertion | PASS | 원출력 판정 보존 |
| 42. LP18-O08 reopen canonical ordinal and projection preserved sqlite | 실제 assertion | PASS | 원출력 판정 보존 |
| 43. LP18-O08 SQLite rebuild requires canonical and ordinal gates | 실제 assertion | PASS | 원출력 판정 보존 |
| 44. LP18-O08 reopen accepted shares journal envelope fallback | 실제 assertion | PASS | 원출력 판정 보존 |
| 45. LP18-O08 reopen canonical ordinal and projection preserved fallback | 실제 assertion | PASS | 원출력 판정 보존 |
| 46. LP18-O09 supplied envelope mismatch rejected schema | 실제 assertion | PASS | 원출력 판정 보존 |
| 47. LP18-O09 supplied envelope mismatch rejected type | 실제 assertion | PASS | 원출력 판정 보존 |
| 48. LP18-O09 supplied envelope mismatch rejected id | 실제 assertion | PASS | 원출력 판정 보존 |
| 49. LP18-O09 supplied envelope mismatch rejected entity | 실제 assertion | PASS | 원출력 판정 보존 |
| 50. LP18-O09 supplied envelope mismatch rejected time | 실제 assertion | PASS | 원출력 판정 보존 |
| 51. LP18-O09 supplied envelope mismatch rejected payload | 실제 assertion | PASS | 원출력 판정 보존 |
| 52. LP18-O09 failed apply registers no accepted envelope | 실제 assertion | PASS | 원출력 판정 보존 |
| 53. LP18-O09 supplied exact envelope is retained | 실제 assertion | PASS | 원출력 판정 보존 |
| 54. LP18-O09 duplicate full canonical acceptance and collision rejection preserved | 실제 assertion | PASS | 원출력 판정 보존 |
| 55. LP18-O09 compacted receipt retry returns original input envelope | 실제 assertion | PASS | 원출력 판정 보존 |
| 실행/정리 관측 | [summary] LP18 pass=55 fail=0 | PASS | 정상 exit0 명령에 대응 |
| focused | {"kind":"phase","label":"focused","exit":0,"signal":null,"stopReason":null,"cleanup":true,"elapsedMs":646,"groupPeakRssBytes":4227072} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| oracle | {"kind":"oracle","mode":"green","expectedRed":false,"productPass":true,"matched":true} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| source-unchanged | {"kind":"source-unchanged","unchanged":true} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| cleanup | {"kind":"cleanup","bytes":5580337,"removed":true} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| result | {"kind":"result","utc":"2026-09-19T13:35:38.676Z","mode":"green","matched":true,"productPass":true,"elapsedMs":2924} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |

원출력 assertion 행수: 55개. 실행 범위/한계는 중앙 LP18 기록을 따른다.

### lp18-accepted-prepared-01.txt

[원출력](lp18-accepted-prepared-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP14-C01 state=1 updates=1 full_parse=1 expected=1 | 실제 assertion | PASS | 원출력 판정 보존 |
| 2. LP14-C01 state=2 updates=1 full_parse=1 expected=1 | 실제 assertion | PASS | 원출력 판정 보존 |
| 3. LP14-C01 state=3 updates=1 full_parse=1 expected=1 | 실제 assertion | PASS | 원출력 판정 보존 |
| 4. LP14-C03 memory/sqlite canonical bytes and CompletedOracle | 실제 assertion | PASS | 원출력 판정 보존 |
| 5. LP14-C02 binding=payload rejected without apply | 실제 assertion | PASS | 원출력 판정 보존 |
| 6. LP14-C02 binding=type rejected without apply | 실제 assertion | PASS | 원출력 판정 보존 |
| 7. LP14-C02 binding=entity rejected without apply | 실제 assertion | PASS | 원출력 판정 보존 |
| 8. LP14-C02 binding=owner rejected without apply | 실제 assertion | PASS | 원출력 판정 보존 |
| 9. LP14-C02 binding=prior rejected without apply | 실제 assertion | PASS | 원출력 판정 보존 |
| 10. LP14-C02 duplicate envelope no-apply/conflict rejection | 실제 assertion | PASS | 원출력 판정 보존 |
| 11. LP14-C02 one-shot apply/reuse rejection | 실제 assertion | PASS | 원출력 판정 보존 |
| 실행/정리 관측 | [cleanup] {"root":"/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-transition-reuse.nzX9Rc","bytes":8987448,"removed":true} | PASS | 정상 exit0 명령에 대응 |
| 실행/정리 관측 | [exit] code=0 elapsed_seconds=5 source=bash-SECONDS | PASS | 정상 exit0 명령에 대응 |

원출력 assertion 행수: 11개. 실행 범위/한계는 중앙 LP18 기록을 따른다.

### lp18-accepted-cache-01.txt

[원출력](lp18-accepted-cache-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. LP15-C01 cold full applied=1 expected=1 | 실제 assertion | PASS | 원출력 판정 보존 |
| 2. LP15-C01 unchanged prefix applied=0 expected=0 | 실제 assertion | PASS | 원출력 판정 보존 |
| 3. LP15-C01 exact prefix suffix only applied=1 expected=1 | 실제 assertion | PASS | 원출력 판정 보존 |
| 4. LP15-C01 independent prefix shadow/full projection equality | 실제 assertion | PASS | 원출력 판정 보존 |
| 5. LP15-C01 full fallback schema applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 보존 |
| 6. LP15-C01 full fallback type applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 보존 |
| 7. LP15-C01 full fallback id applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 보존 |
| 8. LP15-C01 full fallback entity applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 보존 |
| 9. LP15-C01 full fallback time applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 보존 |
| 10. LP15-C01 full fallback payload applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 보존 |
| 11. LP15-C01 full fallback reorder applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 보존 |
| 12. LP15-C01 full fallback shrink applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 보존 |
| 13. LP15-C01 full fallback null-shadow applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 보존 |
| 14. LP15-C01 full fallback null-handle applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 보존 |
| 15. LP15-C01 Open clears cache applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 보존 |
| 16. LP15-C03 recover full/no-cache | 실제 assertion | PASS | 원출력 판정 보존 |
| 17. LP15-C03 after recover full applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 보존 |
| 18. LP15-C03 injected commit refusal discards cache | 실제 assertion | PASS | 원출력 판정 보존 |
| 19. LP15-C03 after commit refusal full applied=2 expected=2 | 실제 assertion | PASS | 원출력 판정 보존 |
| 20. LP15-C03 suffix exception discards cache | 실제 assertion | PASS | 원출력 판정 보존 |
| 21. LP15-C03 after exception full applied=3 expected=3 | 실제 assertion | PASS | 원출력 판정 보존 |
| 22. LP15-C03 public poisoned entry discards cache | 실제 assertion | PASS | 원출력 판정 보존 |
| 23. LP15-C03 after restored fixture full applied=3 expected=3 | 실제 assertion | PASS | 원출력 판정 보존 |
| 24. LP15-C04 exact byte charge boundary | 실제 assertion | PASS | 원출력 판정 보존 |
| 25. LP15-C04 overflow charge rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 26. LP15-C04 8192 records admitted | 실제 assertion | PASS | 원출력 판정 보존 |
| 27. LP15-C04 8193 records rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 28. LP15-C04 64MiB record charge admitted | 실제 assertion | PASS | 원출력 판정 보존 |
| 29. LP15-C04 64MiB plus one rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 30. LP15-C03 changed candidate prime applied=1 expected=1 | 실제 assertion | PASS | 원출력 판정 보존 |
| 31. LP15-C03 changed candidate suffix12 plus full candidate13 applied=25 expected=25 | 실제 assertion | PASS | 원출력 판정 보존 |
| 32. LP15-C03 changed candidate cache equals independent full projection | 실제 assertion | PASS | 원출력 판정 보존 |
| 33. LP15-C03 compacted candidate prefix reused applied=0 expected=0 | 실제 assertion | PASS | 원출력 판정 보존 |
| 34. LP15-C03 forced projection mismatch discards cache | 실제 assertion | PASS | 원출력 판정 보존 |
| 35. LP15-C04 overlimit prime applied=1 expected=1 | 실제 assertion | PASS | 원출력 판정 보존 |
| 36. LP15-C04 existing cache ignored for oversized original applied=8193 expected=8193 | 실제 assertion | PASS | 원출력 판정 보존 |
| 37. LP15-C04 oversized candidate not retained | 실제 assertion | PASS | 원출력 판정 보존 |
| 38. LP15-C04 next oversized checkpoint full applied=8193 expected=8193 | 실제 assertion | PASS | 원출력 판정 보존 |
| 39. CP01 actual Ready Complete shape canonical files reservation | 실제 assertion | PASS | 원출력 판정 보존 |
| 40. CP02 bounded two jobs over 1MiB canonical transitions | 실제 assertion | PASS | 원출력 판정 보존 |
| 41. LP15-C02 bounded automatic checkpoint and whole transition measurement | 실제 assertion | PASS | 원출력 판정 보존 |
| 42. LP15-C02 reopened full applied=18 expected=18 | 실제 assertion | PASS | 원출력 판정 보존 |
| 43. LP15-C02 actual unchanged prefix applied=0 expected=0 | 실제 assertion | PASS | 원출력 판정 보존 |
| 44. LP15-C02 actual suffix only applied=1 expected=1 | 실제 assertion | PASS | 원출력 판정 보존 |
| 45. LP15-C02 actual job shadow/full projection equality | 실제 assertion | PASS | 원출력 판정 보존 |
| 46. LP15-C03 illegal Ready after Complete suffix rejected by cached/full paths | 실제 assertion | PASS | 원출력 판정 보존 |
| 실행/정리 관측 | [summary] LP15 pass=44 fail=0 | PASS | 정상 exit0 명령에 대응 |
| 47. LP15-C04 peakRSS bytes=173670400 cap=536870912 | 실제 assertion | PASS | 원출력 판정 보존 |
| 실행/정리 관측 | [cleanup] {"root":"/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-checkpoint-cache.rRENn7","bytes":16832133,"removed":true} | PASS | 정상 exit0 명령에 대응 |
| 실행/정리 관측 | [exit] code=0 elapsed_seconds=33 source=bash-SECONDS | PASS | 정상 exit0 명령에 대응 |

원출력 assertion 행수: 47개. 실행 범위/한계는 중앙 LP18 기록을 따른다.

### lp18-accepted-catalog-01.txt

[원출력](lp18-accepted-catalog-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. journal open:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 2. fallback catalog open:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 3. SQLite off mode 표시 | 실제 assertion | PASS | 원출력 판정 보존 |
| 4. segment finalize journal+projection:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 5. fallback range query | 실제 assertion | PASS | 원출력 판정 보존 |
| 6. event link FK 위반 거부 | 실제 assertion | PASS | 원출력 판정 보존 |
| 7. FK 위반 transaction/journal 전체 rollback | 실제 assertion | PASS | 원출력 판정 보존 |
| 8. 최초 durable mutation 1개 | 실제 assertion | PASS | 원출력 판정 보존 |
| 9. 동일 mutation 중복 append | 실제 assertion | PASS | 원출력 판정 보존 |
| 10. 손상 사이 정상 durable mutation 보존 | 실제 assertion | PASS | 원출력 판정 보존 |
| 11. 중간 corrupt line count | 실제 assertion | PASS | 원출력 판정 보존 |
| 12. 마지막 truncated line skip | 실제 assertion | PASS | 원출력 판정 보존 |
| 13. fallback replay open | 실제 assertion | PASS | 원출력 판정 보존 |
| 14. 같은 mutation idempotent replay | 실제 assertion | PASS | 원출력 판정 보존 |
| 15. 재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존 | 실제 assertion | PASS | 원출력 판정 보존 |
| 16. 중복 replay row/합계 불증가 | 실제 assertion | PASS | 원출력 판정 보존 |
| 17. 추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 18. writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed | 실제 assertion | PASS | 원출력 판정 보존 |
| 19. v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed | 실제 assertion | PASS | 원출력 판정 보존 |
| 20. SQLite catalog open/rebuild:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 21. SQLite primary mode 표시 | 실제 assertion | PASS | 원출력 판정 보존 |
| 22. SQLite on/off range query ID·순서 parity | 실제 assertion | PASS | 원출력 판정 보존 |
| 23. journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분 | 실제 assertion | PASS | 원출력 판정 보존 |
| 24. journal 없는 손상 media orphan 구분 | 실제 assertion | PASS | 원출력 판정 보존 |
| 25. projection failover journal open:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 26. projection failover catalog open:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 27. 실제 SQLite INSERT 실패 trigger 설치 | 실제 assertion | PASS | 원출력 판정 보존 |
| 28. SQLite 투영 실패 뒤 journal+memory finalize 유지:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 29. SQLite 투영 실패 즉시 JSONL fallback 전환 | 실제 assertion | PASS | 원출력 판정 보존 |
| 30. 재시작 rebuild 전 실패 trigger 제거 | 실제 assertion | PASS | 원출력 판정 보존 |
| 31. 투영 실패 직후 in-memory query 정합성 유지 | 실제 assertion | PASS | 원출력 판정 보존 |
| 32. projection failover 재시작 journal rebuild:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 33. 재시작 후 journal에서 누락 SQLite projection 복구 | 실제 assertion | PASS | 원출력 판정 보존 |
| 34. 재시작 후 SQLite primary 복귀 | 실제 assertion | PASS | 원출력 판정 보존 |
| 35. 재시작 journal rebuild가 실제 SQLite row 복원 | 실제 assertion | PASS | 원출력 판정 보존 |
| 36. tombstone journal open:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 37. tombstone catalog open:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 38. tombstone 대상 segment finalize:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 39. tombstone 대상 deletion request:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 40. tombstone 완료 기록:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 41. catalog finalize가 tombstone segment ID 재사용을 거부해야 함 | 실제 assertion | PASS | 원출력 판정 보존 |
| 42. 손상 SQLite 격리 후 journal rebuild:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 43. 손상 SQLite 원본 격리 | 실제 assertion | PASS | 원출력 판정 보존 |
| 44. 격리 SQLite 파일 보존 | 실제 assertion | PASS | 원출력 판정 보존 |
| 45. 격리 후 journal rebuild 결과 | 실제 assertion | PASS | 원출력 판정 보존 |
| 46. S10-3A future-schema journal read open | 실제 assertion | PASS | 원출력 판정 보존 |
| 47. S10-3A future-schema unsupported classification | 실제 assertion | PASS | 원출력 판정 보존 |
| 48. S10-3A future-schema catalog open denied | 실제 assertion | PASS | 원출력 판정 보존 |
| 49. S10-3A future-schema catalog retry denied | 실제 assertion | PASS | 원출력 판정 보존 |
| 50. S10-3A future-schema journal bytes preserved | 실제 assertion | PASS | 원출력 판정 보존 |
| 51. S10-3A future-schema SQLite bytes preserved | 실제 assertion | PASS | 원출력 판정 보존 |
| 52. S10-3A future-schema writer cleanup untouched | 실제 assertion | PASS | 원출력 판정 보존 |
| 53. S10-3A arbitrary-schema journal read open | 실제 assertion | PASS | 원출력 판정 보존 |
| 54. S10-3A arbitrary-schema unsupported classification | 실제 assertion | PASS | 원출력 판정 보존 |
| 55. S10-3A arbitrary-schema catalog open denied | 실제 assertion | PASS | 원출력 판정 보존 |
| 56. S10-3A arbitrary-schema catalog retry denied | 실제 assertion | PASS | 원출력 판정 보존 |
| 57. S10-3A arbitrary-schema journal bytes preserved | 실제 assertion | PASS | 원출력 판정 보존 |
| 58. S10-3A arbitrary-schema SQLite bytes preserved | 실제 assertion | PASS | 원출력 판정 보존 |
| 59. S10-3A arbitrary-schema writer cleanup untouched | 실제 assertion | PASS | 원출력 판정 보존 |
| 60. S10-3A empty-schema journal read open | 실제 assertion | PASS | 원출력 판정 보존 |
| 61. S10-3A empty-schema unsuppo…2079 tokens truncated…[pass] S10-SB07 managed SQLite sidecar rejected -shm symlink | 실제 assertion | PASS | 원출력 판정 보존 |
| 62. S10-SB07 managed SQLite sidecar rejected -shm hardlink | 실제 assertion | PASS | 원출력 판정 보존 |
| 63. S10-SB07 managed SQLite sidecar rejected -journal symlink | 실제 assertion | PASS | 원출력 판정 보존 |
| 64. S10-SB07 managed SQLite sidecar rejected -journal hardlink | 실제 assertion | PASS | 원출력 판정 보존 |
| 65. S10-SC01 managed repeated event fixture is valid | 실제 assertion | PASS | 원출력 판정 보존 |
| 66. S10-SC02 managed reservations avoid history reads | 실제 assertion | PASS | 원출력 판정 보존 |
| 67. S10-SC03 managed V2 finalize avoids full replay | 실제 assertion | PASS | 원출력 판정 보존 |
| 68. S10-SC04 checkpoint reduces superseded event payload bytes | 실제 assertion | PASS | 원출력 판정 보존 |
| 69. S10-SC05 checkpoint preserves latest event and all record identities | 실제 assertion | PASS | 원출력 판정 보존 |
| 70. S10-SC06 checkpoint is idempotent and preserves V2 | 실제 assertion | PASS | 원출력 판정 보존 |
| 71. S10-SC08 receipt preserves retry identity and rejects direct append | 실제 assertion | PASS | 원출력 판정 보존 |
| 72. S10-SC09 checkpoint restart preserves SQLite and JSONL state sqlite | 실제 assertion | PASS | 원출력 판정 보존 |
| 73. S10-SC09 managed checkpoint SQL V2 payload and path | 실제 assertion | PASS | 원출력 판정 보존 |
| 74. S10-SC09 checkpoint restart preserves SQLite and JSONL state jsonl | 실제 assertion | PASS | 원출력 판정 보존 |
| 75. S10-SC10 checkpoint prefix recovers before writes | 실제 assertion | PASS | 원출력 판정 보존 |
| 76. S10-SC11 checkpoint mismatch preserves bytes and poisons owner | 실제 assertion | PASS | 원출력 판정 보존 |
| 77. S10-SC12 first accepted mutation controls latest event | 실제 assertion | PASS | 원출력 판정 보존 |
| 78. S10-SC16 automatic checkpoint uses accumulated growth | 실제 assertion | PASS | 원출력 판정 보존 |
| 79. S10-SC07 raw checkpoint is rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 80. S10-SC18 checkpoint syscall failure poisons and reopens write | 실제 assertion | PASS | 원출력 판정 보존 |
| 81. S10-SC21 poison rejects hold mutation write | 실제 assertion | PASS | 원출력 판정 보존 |
| 82. S10-SC18 checkpoint syscall failure poisons and reopens file-fsync | 실제 assertion | PASS | 원출력 판정 보존 |
| 83. S10-SC21 poison rejects hold mutation file-fsync | 실제 assertion | PASS | 원출력 판정 보존 |
| 84. S10-SC18 checkpoint syscall failure poisons and reopens rename | 실제 assertion | PASS | 원출력 판정 보존 |
| 85. S10-SC21 poison rejects hold mutation rename | 실제 assertion | PASS | 원출력 판정 보존 |
| 86. S10-SC18 checkpoint syscall failure poisons and reopens dir-fsync | 실제 assertion | PASS | 원출력 판정 보존 |
| 87. S10-SC21 poison rejects hold mutation dir-fsync | 실제 assertion | PASS | 원출력 판정 보존 |
| 88. S10-SC17 checkpoint preserves holds observations and deletion | 실제 assertion | PASS | 원출력 판정 보존 |
| 89. S10-SC17 checkpoint SQL hold observation tombstone | 실제 assertion | PASS | 원출력 판정 보존 |
| 90. S10-SC17 checkpoint preserves holds observations and deletion restart sqlite | 실제 assertion | PASS | 원출력 판정 보존 |
| 91. S10-SC17 checkpoint SQL restart observation tombstone | 실제 assertion | PASS | 원출력 판정 보존 |
| 92. S10-SC17 checkpoint preserves holds observations and deletion restart jsonl | 실제 assertion | PASS | 원출력 판정 보존 |
| 93. S10-SC19 invalid managed history remains unchanged malformed | 실제 assertion | PASS | 원출력 판정 보존 |
| 94. S10-SC19 invalid managed history remains unchanged unsupported | 실제 assertion | PASS | 원출력 판정 보존 |
| 95. S10-SC19 invalid managed history remains unchanged conflict | 실제 assertion | PASS | 원출력 판정 보존 |
| 96. S10-SC20 raw catalog rejects receipt before side effects | 실제 assertion | PASS | 원출력 판정 보존 |
| 97. S10-SC13 crypto off raw remains usable | 실제 assertion | PASS | 원출력 판정 보존 |
| 98. S10-SC14 crypto off checkpoint is rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 99. S10-SC15 crypto off receipt reopen is rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 100. source 저장 callback reconcile 연결 | 실제 assertion | PASS | 원출력 판정 보존 |
| 101. policy revision idempotency | 실제 assertion | PASS | 원출력 판정 보존 |
| 102. 5초 safety reconcile | 실제 assertion | PASS | 원출력 판정 보존 |
| 103. composition root 관리 저장소 선행 open | 실제 assertion | PASS | 원출력 판정 보존 |
| 104. composition helper journal 다음 catalog rebuild/open | 실제 assertion | PASS | 원출력 판정 보존 |
| 105. 서버 전 supervisor 시작 | 실제 assertion | PASS | 원출력 판정 보존 |
| 106. ingress 전 event bridge 등록 | 실제 assertion | PASS | 원출력 판정 보존 |
| 107. ingress 종료 뒤 recorder finalize | 실제 assertion | PASS | 원출력 판정 보존 |
| 108. composition root 시작/종료 순서 | 실제 assertion | PASS | 원출력 판정 보존 |
| 실행/정리 관측 | [cleanup] path=/tmp/media_server_v410_recording_catalog-54013 bytes=26904486 removed=true | PASS | 정상 exit0 명령에 대응 |
| 전수 원출력 수집 | 도구 상한으로 246개 중108개만 보존 | FAIL | 제품 exit0과 구분. 02에서 동일 명령 재수집 |

원출력 assertion 행수: 108개. 실행 범위/한계는 중앙 LP18 기록을 따른다.

### lp18-accepted-writer-01.txt

[원출력](lp18-accepted-writer-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. WR01 h264 managed segments decode all frames without legacy callback or snapshot | 실제 assertion | PASS | 원출력 판정 보존 |
| 2. S10-C321 h264 실제 수락 원본 tuple과 segment 결박 | 실제 assertion | PASS | 원출력 판정 보존 |
| 3. WR01 vp8 managed segments decode all frames without legacy callback or snapshot | 실제 assertion | PASS | 원출력 판정 보존 |
| 4. S10-C321 vp8 실제 수락 원본 tuple과 segment 결박 | 실제 assertion | PASS | 원출력 판정 보존 |
| 5. WR02 UTC-only change preserves media splits frames and independent mapping | 실제 assertion | PASS | 원출력 판정 보존 |
| 6. WR03 UTC-only change preserves media splits frames and independent mapping | 실제 assertion | PASS | 원출력 판정 보존 |
| 7. WR04 UTC-only change preserves media splits frames and independent mapping | 실제 assertion | PASS | 원출력 판정 보존 |
| 8. WR05 duplicate PTS with advancing DTS preserves media and unknown mapping | 실제 assertion | PASS | 원출력 판정 보존 |
| 9. WR06 explicit generation reset creates a new media epoch | 실제 assertion | PASS | 원출력 판정 보존 |
| 10. S10-C326 세대별 원본 결박 분리 | 실제 assertion | PASS | 원출력 판정 보존 |
| 11. WR07 repeated observations and processing UTC do not duplicate media | 실제 assertion | PASS | 원출력 판정 보존 |
| 12. S10-C325 분할·재전달의 segment별 수락 범위 | 실제 assertion | PASS | 원출력 판정 보존 |
| 13. S10-C322 keyframe 대기·다른 track·빈 입력·replay 제외 | 실제 assertion | PASS | 원출력 판정 보존 |
| 14. S10-C324 색인 상한 뒤에도 실제4100프레임 저장·미색인 꼬리 표시 | 실제 assertion | PASS | 원출력 판정 보존 |
| 15. WR08 missing final duration preserves media with unknown end | 실제 assertion | PASS | 원출력 판정 보존 |
| 16. WR09 mapping budget retains bounded unknown tail and all frames | 실제 assertion | PASS | 원출력 판정 보존 |
| 17. WR01 invalid binding rejects before writes journal | 실제 assertion | PASS | 원출력 판정 보존 |
| 18. WR01 invalid binding rejects before writes catalog | 실제 assertion | PASS | 원출력 판정 보존 |
| 19. WR01 invalid binding rejects before writes root | 실제 assertion | PASS | 원출력 판정 보존 |
| 20. WR01 invalid binding rejects before writes store | 실제 assertion | PASS | 원출력 판정 보존 |
| 21. WR01 invalid binding rejects before writes lease | 실제 assertion | PASS | 원출력 판정 보존 |
| 22. WR01 invalid binding rejects before writes incomplete | 실제 assertion | PASS | 원출력 판정 보존 |
| 23. WR08 clock process change preserves same-generation media with unknown comparison | 실제 assertion | PASS | 원출력 판정 보존 |
| 24. WR08 invalid duration leaves unknown end zero | 실제 assertion | PASS | 원출력 판정 보존 |
| 25. WR08 invalid duration leaves unknown end overflow | 실제 assertion | PASS | 원출력 판정 보존 |
| 26. WR08 unsafe original input cannot become finalized observation | 실제 assertion | PASS | 원출력 판정 보존 |
| 27. WR08 unsafe original input cannot become finalized pts | 실제 assertion | PASS | 원출력 판정 보존 |
| 28. WR08 unsafe original input cannot become finalized range | 실제 assertion | PASS | 원출력 판정 보존 |
| 29. WR07 older generation cache cannot switch media backwards | 실제 assertion | PASS | 원출력 판정 보존 |
| 30. WR07 unrelated video track cannot change selected track identity | 실제 assertion | PASS | 원출력 판정 보존 |
| 31. WR06 reopened store allocates fresh IDs and increasing durable order | 실제 assertion | PASS | 원출력 판정 보존 |
| 32. WR05 actual H264 reordering preserves decode timestamps and mux origin | 실제 assertion | PASS | 원출력 판정 보존 |
| 33. WR05 reordered segment end covers maximum presented frame end | 실제 assertion | PASS | 원출력 판정 보존 |
| 34. S10-C327 실제 B-frame 원본PTS·ordinal 보존 | 실제 assertion | PASS | 원출력 판정 보존 |
| 35. WR08 missing maximum PTS frame duration keeps reordered end unknown | 실제 assertion | PASS | 원출력 판정 보존 |
| 36. WR09 failed active commit preserves ready order and quota reservation | 실제 assertion | PASS | 원출력 판정 보존 |
| 37. WR09 restart recovers the same durable segment and all frames | 실제 assertion | PASS | 원출력 판정 보존 |
| 38. WR08 excessive clock width preserves media as unknown | 실제 assertion | PASS | 원출력 판정 보존 |
| 39. WR08 zero generation order cannot become finalized | 실제 assertion | PASS | 원출력 판정 보존 |
| 40. WR08 media observation quality normal | 실제 assertion | PASS | 원출력 판정 보존 |
| 41. WR08 media observation quality fast | 실제 assertion | PASS | 원출력 판정 보존 |
| 42. WR08 media observation quality drift | 실제 assertion | PASS | 원출력 판정 보존 |
| 43. WR08 media observation quality fast-step | 실제 assertion | PASS | 원출력 판정 보존 |
| 44. WR01 actual appsink observation flows through managed writer and decode | 실제 assertion | PASS | 원출력 판정 보존 |
| 실행/정리 관측 | [summary] pass=44 fail=0 | PASS | 정상 exit0 명령에 대응 |
| 실행/정리 관측 | [cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-managed-writer.NOM7KO bytes=16649067 removed=true | PASS | 정상 exit0 명령에 대응 |
| 실행/정리 관측 | [elapsed] seconds=10 source=bash-SECONDS | PASS | 정상 exit0 명령에 대응 |

원출력 assertion 행수: 44개. 실행 범위/한계는 중앙 LP18 기록을 따른다.

### lp18-accepted-catalog-02.txt

[원출력](lp18-accepted-catalog-02.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. journal open:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 2. fallback catalog open:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 3. SQLite off mode 표시 | 실제 assertion | PASS | 원출력 판정 보존 |
| 4. segment finalize journal+projection:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 5. fallback range query | 실제 assertion | PASS | 원출력 판정 보존 |
| 6. event link FK 위반 거부 | 실제 assertion | PASS | 원출력 판정 보존 |
| 7. FK 위반 transaction/journal 전체 rollback | 실제 assertion | PASS | 원출력 판정 보존 |
| 8. 최초 durable mutation 1개 | 실제 assertion | PASS | 원출력 판정 보존 |
| 9. 동일 mutation 중복 append | 실제 assertion | PASS | 원출력 판정 보존 |
| 10. 손상 사이 정상 durable mutation 보존 | 실제 assertion | PASS | 원출력 판정 보존 |
| 11. 중간 corrupt line count | 실제 assertion | PASS | 원출력 판정 보존 |
| 12. 마지막 truncated line skip | 실제 assertion | PASS | 원출력 판정 보존 |
| 13. fallback replay open | 실제 assertion | PASS | 원출력 판정 보존 |
| 14. 같은 mutation idempotent replay | 실제 assertion | PASS | 원출력 판정 보존 |
| 15. 재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존 | 실제 assertion | PASS | 원출력 판정 보존 |
| 16. 중복 replay row/합계 불증가 | 실제 assertion | PASS | 원출력 판정 보존 |
| 17. 추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 18. writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed | 실제 assertion | PASS | 원출력 판정 보존 |
| 19. v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed | 실제 assertion | PASS | 원출력 판정 보존 |
| 20. SQLite catalog open/rebuild:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 21. SQLite primary mode 표시 | 실제 assertion | PASS | 원출력 판정 보존 |
| 22. SQLite on/off range query ID·순서 parity | 실제 assertion | PASS | 원출력 판정 보존 |
| 23. journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분 | 실제 assertion | PASS | 원출력 판정 보존 |
| 24. journal 없는 손상 media orphan 구분 | 실제 assertion | PASS | 원출력 판정 보존 |
| 25. projection failover journal open:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 26. projection failover catalog open:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 27. 실제 SQLite INSERT 실패 trigger 설치 | 실제 assertion | PASS | 원출력 판정 보존 |
| 28. SQLite 투영 실패 뒤 journal+memory finalize 유지:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 29. SQLite 투영 실패 즉시 JSONL fallback 전환 | 실제 assertion | PASS | 원출력 판정 보존 |
| 30. 재시작 rebuild 전 실패 trigger 제거 | 실제 assertion | PASS | 원출력 판정 보존 |
| 31. 투영 실패 직후 in-memory query 정합성 유지 | 실제 assertion | PASS | 원출력 판정 보존 |
| 32. projection failover 재시작 journal rebuild:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 33. 재시작 후 journal에서 누락 SQLite projection 복구 | 실제 assertion | PASS | 원출력 판정 보존 |
| 34. 재시작 후 SQLite primary 복귀 | 실제 assertion | PASS | 원출력 판정 보존 |
| 35. 재시작 journal rebuild가 실제 SQLite row 복원 | 실제 assertion | PASS | 원출력 판정 보존 |
| 36. tombstone journal open:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 37. tombstone catalog open:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 38. tombstone 대상 segment finalize:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 39. tombstone 대상 deletion request:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 40. tombstone 완료 기록:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 41. catalog finalize가 tombstone segment ID 재사용을 거부해야 함 | 실제 assertion | PASS | 원출력 판정 보존 |
| 42. 손상 SQLite 격리 후 journal rebuild:  | 실제 assertion | PASS | 원출력 판정 보존 |
| 43. 손상 SQLite 원본 격리 | 실제 assertion | PASS | 원출력 판정 보존 |
| 44. 격리 SQLite 파일 보존 | 실제 assertion | PASS | 원출력 판정 보존 |
| 45. 격리 후 journal rebuild 결과 | 실제 assertion | PASS | 원출력 판정 보존 |
| 46. S10-3A future-schema journal read open | 실제 assertion | PASS | 원출력 판정 보존 |
| 47. S10-3A future-schema unsupported classification | 실제 assertion | PASS | 원출력 판정 보존 |
| 48. S10-3A future-schema catalog open denied | 실제 assertion | PASS | 원출력 판정 보존 |
| 49. S10-3A future-schema catalog retry denied | 실제 assertion | PASS | 원출력 판정 보존 |
| 50. S10-3A future-schema journal bytes preserved | 실제 assertion | PASS | 원출력 판정 보존 |
| 51. S10-3A future-schema SQLite bytes preserved | 실제 assertion | PASS | 원출력 판정 보존 |
| 52. S10-3A future-schema writer cleanup untouched | 실제 assertion | PASS | 원출력 판정 보존 |
| 53. S10-3A arbitrary-schema journal read open | 실제 assertion | PASS | 원출력 판정 보존 |
| 54. S10-3A arbitrary-schema unsupported classification | 실제 assertion | PASS | 원출력 판정 보존 |
| 55. S10-3A arbitrary-schema catalog open denied | 실제 assertion | PASS | 원출력 판정 보존 |
| 56. S10-3A arbitrary-schema catalog retry denied | 실제 assertion | PASS | 원출력 판정 보존 |
| 57. S10-3A arbitrary-schema journal bytes preserved | 실제 assertion | PASS | 원출력 판정 보존 |
| 58. S10-3A arbitrary-schema SQLite bytes preserved | 실제 assertion | PASS | 원출력 판정 보존 |
| 59. S10-3A arbitrary-schema writer cleanup untouched | 실제 assertion | PASS | 원출력 판정 보존 |
| 60. S10-3A empty-schema journal read open | 실제 assertion | PASS | 원출력 판정 보존 |
| 61. S10-3A empty-schema unsupported classification | 실제 assertion | PASS | 원출력 판정 보존 |
| 62. S10-3A empty-schema catalog open denied | 실제 assertion | PASS | 원출력 판정 보존 |
| 63. S10-3A empty-schema catalog retry denied | 실제 assertion | PASS | 원출력 판정 보존 |
| 64. S10-3A empty-schema journal bytes preserved | 실제 assertion | PASS | 원출력 판정 보존 |
| 65. S10-3A empty-schema SQLite bytes preserved | 실제 assertion | PASS | 원출력 판정 보존 |
| 66. S10-3A empty-schema writer cleanup untouched | 실제 assertion | PASS | 원출력 판정 보존 |
| 67. S10-3A future-type journal read open | 실제 assertion | PASS | 원출력 판정 보존 |
| 68. S10-3A future-type unsupported classification | 실제 assertion | PASS | 원출력 판정 보존 |
| 69. S10-3A future-type catalog open denied | 실제 assertion | PASS | 원출력 판정 보존 |
| 70. S10-3A future-type catalog retry denied | 실제 assertion | PASS | 원출력 판정 보존 |
| 71. S10-3A future-type journal bytes preserved | 실제 assertion | PASS | 원출력 판정 보존 |
| 72. S10-3A future-type SQLite bytes preserved | 실제 assertion | PASS | 원출력 판정 보존 |
| 73. S10-3A future-type writer cleanup untouched | 실제 assertion | PASS | 원출력 판정 보존 |
| 74. S10-3A malformed journal open | 실제 assertion | PASS | 원출력 판정 보존 |
| 75. S10-3A malformed JSON missing fields and wrong types remain corrupt | 실제 assertion | PASS | 원출력 판정 보존 |
| 76. S10-O01 reservation journal open | 실제 assertion | PASS | 원출력 판정 보존 |
| 77. S10-O01 first reservation returns four IDs and sequence one | 실제 assertion | PASS | 원출력 판정 보존 |
| 78. S10-O01 versioned reservation payload replays | 실제 assertion | PASS | 원출력 판정 보존 |
| 79. S10-O01 new reservation records actual occurred time | 실제 assertion | PASS | 원출력 판정 보존 |
| 80. S10-O02 identical retry preserves sequence and bytes | 실제 assertion | PASS | 원출력 판정 보존 |
| 81. S10-O03 reopened instance allocates next sequence | 실제 assertion | PASS | 원출력 판정 보존 |
| 82. S10-O03 new process resumes durable sequence | 실제 assertion | PASS | 원출력 판정 보존 |
| 83. S10-O04 different store rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 84. S10-O04 reused request with different segment rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 85. S10-O04 reused request with different channel rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 86. S10-O04 reused segment with different request rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 87. S10-O04 conflicts preserve original bytes | 실제 assertion | PASS | 원출력 판정 보존 |
| 88. S10-O05/O06 reject and preserve corrupt | 실제 assertion | PASS | 원출력 판정 보존 |
| 89. S10-O05/O06 reject and preserve unsupported-schema | 실제 assertion | PASS | 원출력 판정 보존 |
| 90. S10-O05/O06 reject and preserve unsupported-type | 실제 assertion | PASS | 원출력 판정 보존 |
| 91. S10-O05/O06 reject and preserve tail | 실제 assertion | PASS | 원출력 판정 보존 |
| 92. S10-O05/O06 reject and preserve payload-zero | 실제 assertion | PASS | 원출력 판정 보존 |
| 93. S10-O05/O06 reject and preserve payload-negative | 실제 assertion | PASS | 원출력 판정 보존 |
| 94. S10-O05/O06 reject and preserve payload-fraction | 실제 assertion | PASS | 원출력 판정 보존 |
| 95. S10-O05/O06 reject and preserve payload-overflow | 실제 assertion | PASS | 원출력 판정 보존 |
| 96. S10-O05/O06 reject and preserve duplicate-sequence | 실제 assertion | PASS | 원출력 판정 보존 |
| 97. S10-O05/O06 reject and preserve decreasing-sequence | 실제 assertion | PASS | 원출력 판정 보존 |
| 98. S10-O05/O06 reject and preserve duplicate-request | 실제 assertion | PASS | 원출력 판정 보존 |
| 99. S10-O05/O06 reject and preserve duplicate-segment | 실제 assertion | PASS | 원출력 판정 보존 |
| 100. S10-O05/O06 reject and preserve store-conflict | 실제 assertion | PASS | 원출력 판정 보존 |
| 101. S10-O05/O06 reject and preserve ordinary-before | 실제 assertion | PASS | 원출력 판정 보존 |
| 102. S10-O05/O06 reject and preserve ordinary-after | 실제 assertion | PASS | 원출력 판정 보존 |
| 103. S10-O05/O06 reject and preserve line-cap | 실제 assertion | PASS | 원출력 판정 보존 |
| 104. S10-O05 reservation entity envelope binding rejects mismatch | 실제 assertion | PASS | 원출력 판정 보존 |
| 105. S10-O05 reservation request envelope binding rejects mismatch | 실제 assertion | PASS | 원출력 판정 보존 |
| 106. S10-O01 strict reservation parser accepts versioned literal | 실제 assertion | PASS | 원출력 판정 보존 |
| 107. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 원출력 판정 보존 |
| 108. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 원출력 판정 보존 |
| 109. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 원출력 판정 보존 |
| 110. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | 실제 assertion | PASS | 원출력 판정 보존 |
| 111. S10-O06 INT64_MAX identical retry remains valid | 실제 assertion | PASS | 원출력 판정 보존 |
| 112. S10-O06 sequence overflow rejected without write | 실제 assertion | PASS | 원출력 판정 보존 |
| 113. S10-O02 identical durable reservation duplicates remain idempotent | 실제 assertion | PASS | 원출력 판정 보존 |
| 114. S10-O06 sequence gaps remain valid and allocate above maximum | 실제 assertion | PASS | 원출력 판정 보존 |
| 115. S10-O07 four simultaneous processes finish reservations | 실제 assertion | PASS | 원출력 판정 보존 |
| 116. S10-O07 concurrent sequences are unique and complete | 실제 assertion | PASS | 원출력 판정 보존 |
| 117. S10-O07 next sequence follows concurrent reservations | 실제 assertion | PASS | 원출력 판정 보존 |
| 118. S10-O08 ordinary Append cannot reserve orders | 실제 assertion | PASS | 원출력 판정 보존 |
| 119. S10-O08 unopened journal rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 120. S10-O08 null result rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 121. S10-O08 invalid opaque ID rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 122. S10-O08 failed reservation does not expose tentative result | 실제 assertion | PASS | 원출력 판정 보존 |
| 123. S10-O09 unsafe file binding rejected and original preserved inode | 실제 assertion | PASS | 원출력 판정 보존 |
| 124. S10-O09 unsafe file binding rejected and original preserved parent | 실제 assertion | PASS | 원출력 판정 보존 |
| 125. S10-O09 unsafe file binding rejected and original preserved symlink | 실제 assertion | PASS | 원출력 판정 보존 |
| 126. S10-O09 unsafe file binding rejected and original preserved hardlink | 실제 assertion | PASS | 원출력 판정 보존 |
| 127. S10-O10 reservation and normal segment coexist in catalog | 실제 assertion | PASS | 원출력 판정 보존 |
| 128. S10-O04 reserve then finalize permits identical retry | 실제 assertion | PASS | 원출력 판정 보존 |
| 129. S10-O10 reservation survives catalog rebuild without changing segment query | 실제 assertion | PASS | 원출력 판정 보존 |
| 130. S10-O04 legacy segment cannot acquire retroactive reservation | 실제 assertion | PASS | 원출력 판정 보존 |
| 131. S10-M06 opened catalog accepts fresh exact reservation V2 finalize | 실제 assertion | PASS | 원출력 판정 보존 |
| 132. S10-M07 V2 find preserves complete metadata | 실제 assertion | PASS | 원출력 판정 보존 |
| 133. S10-M07 identical V2 recovery is idempotent | 실제 assertion | PASS | 원출력 판정 보존 |
| 134. S10-M07 V2 is absent from V1 range query | 실제 assertion | PASS | 원출력 판정 보존 |
| 135. S10-M07 V2 registered path is not orphan | 실제 assertion | PASS | 원출력 판정 보존 |
| 136. S10-M07 SQLite exact V2 JSON and path match | 실제 assertion | PASS | 원출력 판정 보존 |
| 137. S10-M07 JSONL restart preserves V2 exact payload | 실제 assertion | PASS | 원출력 판정 보존 |
| 138. S10-M06 wrong reservation tuple rejected store | 실제 assertion | PASS | 원출력 판정 보존 |
| 139. S10-M06 wrong reservation tuple rejected request | 실제 assertion | PASS | 원출력 판정 보존 |
| 140. S10-M06 wrong reservation tuple rejected segment | 실제 assertion | PASS | 원출력 판정 보존 |
| 141. S10-M06 wrong reservation tuple rejected channel | 실제 assertion | PASS | 원출력 판정 보존 |
| 142. S10-M06 wrong reservation tuple rejected sequence | 실제 assertion | PASS | 원출력 판정 보존 |
| 143. S10-M09 immutable V2 mapping mismatch rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 144. S10-M09 bad V2 startup retry preserves original state bad-payload | 실제 assertion | PASS | 원출력 판정 보존 |
| 145. S10-M09 bad V2 startup retry preserves original state missing-order | 실제 assertion | PASS | 원출력 판정 보존 |
| 146. S10-M09 bad V2 startup retry preserves original state bad-order | 실제 assertion | PASS | 원출력 판정 보존 |
| 147. S10-M09 bad V2 startup retry preserves original state conflicting-order | 실제 assertion | PASS | 원출력 판정 보존 |
| 148. S10-M09 bad V2 startup retry preserves original state tail | 실제 assertion | PASS | 원출력 판정 보존 |
| 149. S10-M09 bad V2 startup retry preserves original state corrupt | 실제 assertion | PASS | 원출력 판정 보존 |
| 150. S10-M09 bad V2 startup retry preserves original state unsafe-path | 실제 assertion | PASS | 원출력 판정 보존 |
| 151. S10-M09 default off rejects V2 before SQLite changes | 실제 assertion | PASS | 원출력 판정 보존 |
| 152. S10-M09 V2 replay namespace and deletion duplicate | 실제 assertion | PASS | 원출력 판정 보존 |
| 153. S10-M09 V2 replay namespace and deletion deleted | 실제 assertion | PASS | 원출력 판정 보존 |
| 154. S10-M09 V2 replay namespace and deletion v1-before | 실제 assertion | PASS | 원출력 판정 보존 |
| 155. S10-M09 V2 replay namespace and deletion v1-after | 실제 assertion | PASS | 원출력 판정 보존 |
| 156. S10-M09 V2 replay namespace and deletion deleted-before | 실제 assertion | PASS | 원출력 판정 보존 |
| 157. S10-M09 V2 replay namespace and deletion resurrection | 실제 assertion | PASS | 원출력 판정 보존 |
| 158. S10-M09 V2 replay namespace and deletion mutation-collision | 실제 assertion | PASS | 원출력 판정 보존 |
| 159. S10-M09 V2 finalize rejects missing media | 실제 assertion | PASS | 원출력 판정 보존 |
| 160. S10-M09 V2 finalize rejects directory media | 실제 assertion | PASS | 원출력 판정 보존 |
| 161. S10-M09 fresh candidate rejects mapping | 실제 assertion | PASS | 원출력 판정 보존 |
| 162. S10-M09 fresh candidate rejects path | 실제 assertion | PASS | 원출력 판정 보존 |
| 163. S10-M09 fresh candidate rejects tombstone | 실제 assertion | PASS | 원출력 판정 보존 |
| 164. S10-SW01 managed empty root opens with lifetime lease | 실제 assertion | PASS | 원출력 판정 보존 |
| 165. S10-SW02 same process second managed owner denied | 실제 assertion | PASS | 원출력 판정 보존 |
| 166. S10-SW03 different process owner and inherited use denied | 실제 assertion | PASS | 원출력 판정 보존 |
| 167. S10-SW12 managed duplicate descriptors are close-on-exec | 실제 assertion | PASS | 원출력 판정 보존 |
| 168. S10-SW05 managed reserve append replay use owned descriptor | 실제 assertion | PASS | 원출력 판정 보존 |
| 169. S10-SW06 raw managed access and legacy default path denied | 실제 assertion | PASS | 원출력 판정 보존 |
| 170. S10-SW01 managed Reserve rejects different store identity | 실제 assertion | PASS | 원출력 판정 보존 |
| 171. S10-SW10 catalog connection can inspect managed lease | 실제 assertion | PASS | 원출력 판정 보존 |
| 172. S10-SW04 owner destruction releases lease | 실제 assertion | PASS | 원출력 판정 보존 |
| 173. S10-SW01 managed reopen rejects different store identity | 실제 assertion | PASS | 원출력 판정 보존 |
| 174. S10-SW11 managed incomplete tail rejects append without changing bytes | 실제 assertion | PASS | 원출력 판정 보존 |
| 175. S10-SW07 legacy nonempty root preserved without conversion | 실제 assertion | PASS | 원출력 판정 보존 |
| 176. S10-SW08 partial initialization retry validates exact state lease | 실제 assertion | PASS | 원출력 판정 보존 |
| 177. S10-SW08 partial initialization retry validates exact state init | 실제 assertion | PASS | 원출력 판정 보존 |
| 178. S10-SW08 partial initialization retry validates exact state barrier | 실제 assertion | PASS | 원출력 판정 보존 |
| 179. S10-SW08 partial initialization retry validates exact state journal | 실제 assertion | PASS | 원출력 판정 보존 |
| 180. S10-SW08 partial initialization retry validates exact state incomplete | 실제 assertion | PASS | 원출력 판정 보존 |
| 181. S10-SW08 partial initialization retry validates exact state unknown | 실제 assertion | PASS | 원출력 판정 보존 |
| 182. S10-SW09 symlink inode and malformed marker rejected journal | 실제 assertion | PASS | 원출력 판정 보존 |
| 183. S10-SW09 symlink inode and malformed marker rejected marker | 실제 assertion | PASS | 원출력 판정 보존 |
| 184. S10-SW09 symlink inode and malformed marker rejected barrier | 실제 assertion | PASS | 원출력 판정 보존 |
| 185. S10-SW09 symlink inode and malformed marker rejected root-symlink | 실제 assertion | PASS | 원출력 판정 보존 |
| 186. S10-SB01 second managed catalog is denied | 실제 assertion | PASS | 원출력 판정 보존 |
| 187. S10-SB02 failed catalog cannot mutate journal or holds | 실제 assertion | PASS | 원출력 판정 보존 |
| 188. S10-SB03 attached catalog blocks unowned append but permits reservation | 실제 assertion | PASS | 원출력 판정 보존 |
| 189. S10-SB04 catalog destruction releases attachment | 실제 assertion | PASS | 원출력 판정 보존 |
| 190. S10-SB05 managed catalog rejects unsafe options outside | 실제 assertion | PASS | 원출력 판정 보존 |
| 191. S10-SB05 managed catalog rejects unsafe options dotdot | 실제 assertion | PASS | 원출력 판정 보존 |
| 192. S10-SB05 managed catalog rejects unsafe options media-symlink | 실제 assertion | PASS | 원출력 판정 보존 |
| 193. S10-SB05 managed catalog rejects unsafe options sqlite-symlink | 실제 assertion | PASS | 원출력 판정 보존 |
| 194. S10-SB05 managed catalog rejects unsafe options sqlite-hardlink | 실제 assertion | PASS | 원출력 판정 보존 |
| 195. S10-SB05 managed catalog rejects unsafe options disabled | 실제 assertion | PASS | 원출력 판정 보존 |
| 196. S10-SB06 failed open releases catalog attachment | 실제 assertion | PASS | 원출력 판정 보존 |
| 197. S10-SB07 managed SQLite sidecar rejected -wal symlink | 실제 assertion | PASS | 원출력 판정 보존 |
| 198. S10-SB07 managed SQLite sidecar rejected -wal hardlink | 실제 assertion | PASS | 원출력 판정 보존 |
| 199. S10-SB07 managed SQLite sidecar rejected -shm symlink | 실제 assertion | PASS | 원출력 판정 보존 |
| 200. S10-SB07 managed SQLite sidecar rejected -shm hardlink | 실제 assertion | PASS | 원출력 판정 보존 |
| 201. S10-SB07 managed SQLite sidecar rejected -journal symlink | 실제 assertion | PASS | 원출력 판정 보존 |
| 202. S10-SB07 managed SQLite sidecar rejected -journal hardlink | 실제 assertion | PASS | 원출력 판정 보존 |
| 203. S10-SC01 managed repeated event fixture is valid | 실제 assertion | PASS | 원출력 판정 보존 |
| 204. S10-SC02 managed reservations avoid history reads | 실제 assertion | PASS | 원출력 판정 보존 |
| 205. S10-SC03 managed V2 finalize avoids full replay | 실제 assertion | PASS | 원출력 판정 보존 |
| 206. S10-SC04 checkpoint reduces superseded event payload bytes | 실제 assertion | PASS | 원출력 판정 보존 |
| 207. S10-SC05 checkpoint preserves latest event and all record identities | 실제 assertion | PASS | 원출력 판정 보존 |
| 208. S10-SC06 checkpoint is idempotent and preserves V2 | 실제 assertion | PASS | 원출력 판정 보존 |
| 209. S10-SC08 receipt preserves retry identity and rejects direct append | 실제 assertion | PASS | 원출력 판정 보존 |
| 210. S10-SC09 checkpoint restart preserves SQLite and JSONL state sqlite | 실제 assertion | PASS | 원출력 판정 보존 |
| 211. S10-SC09 managed checkpoint SQL V2 payload and path | 실제 assertion | PASS | 원출력 판정 보존 |
| 212. S10-SC09 checkpoint restart preserves SQLite and JSONL state jsonl | 실제 assertion | PASS | 원출력 판정 보존 |
| 213. S10-SC10 checkpoint prefix recovers before writes | 실제 assertion | PASS | 원출력 판정 보존 |
| 214. S10-SC11 checkpoint mismatch preserves bytes and poisons owner | 실제 assertion | PASS | 원출력 판정 보존 |
| 215. S10-SC12 first accepted mutation controls latest event | 실제 assertion | PASS | 원출력 판정 보존 |
| 216. S10-SC16 automatic checkpoint uses accumulated growth | 실제 assertion | PASS | 원출력 판정 보존 |
| 217. S10-SC07 raw checkpoint is rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 218. S10-SC18 checkpoint syscall failure poisons and reopens write | 실제 assertion | PASS | 원출력 판정 보존 |
| 219. S10-SC21 poison rejects hold mutation write | 실제 assertion | PASS | 원출력 판정 보존 |
| 220. S10-SC18 checkpoint syscall failure poisons and reopens file-fsync | 실제 assertion | PASS | 원출력 판정 보존 |
| 221. S10-SC21 poison rejects hold mutation file-fsync | 실제 assertion | PASS | 원출력 판정 보존 |
| 222. S10-SC18 checkpoint syscall failure poisons and reopens rename | 실제 assertion | PASS | 원출력 판정 보존 |
| 223. S10-SC21 poison rejects hold mutation rename | 실제 assertion | PASS | 원출력 판정 보존 |
| 224. S10-SC18 checkpoint syscall failure poisons and reopens dir-fsync | 실제 assertion | PASS | 원출력 판정 보존 |
| 225. S10-SC21 poison rejects hold mutation dir-fsync | 실제 assertion | PASS | 원출력 판정 보존 |
| 226. S10-SC17 checkpoint preserves holds observations and deletion | 실제 assertion | PASS | 원출력 판정 보존 |
| 227. S10-SC17 checkpoint SQL hold observation tombstone | 실제 assertion | PASS | 원출력 판정 보존 |
| 228. S10-SC17 checkpoint preserves holds observations and deletion restart sqlite | 실제 assertion | PASS | 원출력 판정 보존 |
| 229. S10-SC17 checkpoint SQL restart observation tombstone | 실제 assertion | PASS | 원출력 판정 보존 |
| 230. S10-SC17 checkpoint preserves holds observations and deletion restart jsonl | 실제 assertion | PASS | 원출력 판정 보존 |
| 231. S10-SC19 invalid managed history remains unchanged malformed | 실제 assertion | PASS | 원출력 판정 보존 |
| 232. S10-SC19 invalid managed history remains unchanged unsupported | 실제 assertion | PASS | 원출력 판정 보존 |
| 233. S10-SC19 invalid managed history remains unchanged conflict | 실제 assertion | PASS | 원출력 판정 보존 |
| 234. S10-SC20 raw catalog rejects receipt before side effects | 실제 assertion | PASS | 원출력 판정 보존 |
| 235. S10-SC13 crypto off raw remains usable | 실제 assertion | PASS | 원출력 판정 보존 |
| 236. S10-SC14 crypto off checkpoint is rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 237. S10-SC15 crypto off receipt reopen is rejected | 실제 assertion | PASS | 원출력 판정 보존 |
| 238. source 저장 callback reconcile 연결 | 실제 assertion | PASS | 원출력 판정 보존 |
| 239. policy revision idempotency | 실제 assertion | PASS | 원출력 판정 보존 |
| 240. 5초 safety reconcile | 실제 assertion | PASS | 원출력 판정 보존 |
| 241. composition root 관리 저장소 선행 open | 실제 assertion | PASS | 원출력 판정 보존 |
| 242. composition helper journal 다음 catalog rebuild/open | 실제 assertion | PASS | 원출력 판정 보존 |
| 243. 서버 전 supervisor 시작 | 실제 assertion | PASS | 원출력 판정 보존 |
| 244. ingress 전 event bridge 등록 | 실제 assertion | PASS | 원출력 판정 보존 |
| 245. ingress 종료 뒤 recorder finalize | 실제 assertion | PASS | 원출력 판정 보존 |
| 246. composition root 시작/종료 순서 | 실제 assertion | PASS | 원출력 판정 보존 |
| 실행/정리 관측 | [cleanup] path=/tmp/media_server_v410_recording_catalog-54209 bytes=26904486 removed=true | PASS | 정상 exit0 명령에 대응 |

원출력 assertion 행수: 246개. 실행 범위/한계는 중앙 LP18 기록을 따른다.

### lp17-small-lp18-accepted-01.txt

[원출력](lp17-small-lp18-accepted-01.txt)

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| runtime-freshness | {"kind":"phase-result","label":"runtime-freshness","diagnosticPass":true,"historicalRssPass":null,"observationValid":null,"semanticPass":null,"cleanupPass":true,"exitCode":0,"signal":null,"stopReason":null,"elapsedMs":602,"groupPeakRssBytes":93044736,"observationFailure":null,"outputBytes":818} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| 1. FC01 exact insertion checks count=97 | 실제 assertion | PASS | 원출력 판정 보존 |
| compile | {"kind":"phase-result","label":"compile","diagnosticPass":true,"historicalRssPass":null,"observationValid":null,"semanticPass":null,"cleanupPass":true,"exitCode":0,"signal":null,"stopReason":null,"elapsedMs":4218,"groupPeakRssBytes":373145600,"observationFailure":null,"outputBytes":2905} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| 2. recorded FE02 writer start | 실제 assertion | PASS | 원출력 판정 보존 |
| 3. recorded FE04 bound finalized mutation segment0 | 실제 assertion | PASS | 원출력 판정 보존 |
| 4. LP17/prepare LP02.actual4096-prerequisite | 실제 assertion | PASS | 원출력 판정 보존 |
| 5. LP17/prepare seed.input-count | 실제 assertion | PASS | 원출력 판정 보존 |
| 6. LP17/prepare seed.input-identity-all-samples | 실제 assertion | PASS | 원출력 판정 보존 |
| 7. LP17/prepare seed.physical-evidence | 실제 assertion | PASS | 원출력 판정 보존 |
| prepare | {"kind":"phase-result","label":"prepare","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":157188096,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"prepare","arm":"seed","samples":32,"count":2,"pass":6,"fail":0},"elapsedMs":1721,"groupPeakRssBytes":185434112,"observationFailure":null,"outputBytes":1433} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| 8. LP17/commit1 LP02.reserve | 실제 assertion | PASS | 원출력 판정 보존 |
| 9. LP17/commit1 LP02.actual-file-outside-catalog | 실제 assertion | PASS | 원출력 판정 보존 |
| 10. LP17/commit1 LP02.commit | 실제 assertion | PASS | 원출력 판정 보존 |
| 11. LP17/commit2 LP02.reserve | 실제 assertion | PASS | 원출력 판정 보존 |
| 12. LP17/commit2 LP02.actual-file-outside-catalog | 실제 assertion | PASS | 원출력 판정 보존 |
| 13. LP17/commit2 LP02.commit | 실제 assertion | PASS | 원출력 판정 보존 |
| 14. LP17/snapshot2 LP02.snapshot-exact-count | 실제 assertion | PASS | 원출력 판정 보존 |
| 15. LP17/snapshot2 snapshot.canonical-all | 실제 assertion | PASS | 원출력 판정 보존 |
| 16. LP17/snapshot2 LP02.explicit-checkpoint | 실제 assertion | PASS | 원출력 판정 보존 |
| 17. LP17/snapshot2 LP02.reservation-bound-mutation-count | 실제 assertion | PASS | 원출력 판정 보존 |
| 18. LP17/delete delete.original-canonical | 실제 assertion | PASS | 원출력 판정 보존 |
| 19. LP17/delete delete.pending | 실제 assertion | PASS | 원출력 판정 보존 |
| 20. LP17/delete delete.unlink | 실제 assertion | PASS | 원출력 판정 보존 |
| 21. LP17/delete delete.tombstone | 실제 assertion | PASS | 원출력 판정 보존 |
| 22. LP17/delete delete.checkpoint | 실제 assertion | PASS | 원출력 판정 보존 |
| 23. LP17/delete delete.binding-preserved | 실제 assertion | PASS | 원출력 판정 보존 |
| 24. LP17/delete deleted.public-hidden | 실제 assertion | PASS | 원출력 판정 보존 |
| scale-A | {"kind":"phase-result","label":"scale-A","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":41877504,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"scale","arm":"A","samples":32,"count":2,"pass":17,"fail":0},"elapsedMs":276,"groupPeakRssBytes":43089920,"observationFailure":null,"outputBytes":51485} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| 25. LP17/reopen/sqlite LP02.journal-reopen | 실제 assertion | PASS | 원출력 판정 보존 |
| 26. LP17/reopen/sqlite LP02.catalog-reopen | 실제 assertion | PASS | 원출력 판정 보존 |
| 27. LP17/reopen/sqlite/0 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 보존 |
| 28. LP17/reopen/sqlite/0 deleted.public-hidden | 실제 assertion | PASS | 원출력 판정 보존 |
| 29. LP17/reopen/sqlite/0 reopen.deleted-state | 실제 assertion | PASS | 원출력 판정 보존 |
| 30. LP17/reopen/sqlite/1 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 보존 |
| 31. LP17/reopen/sqlite/1 reopen.remaining-media | 실제 assertion | PASS | 원출력 판정 보존 |
| reopen-A-sqlite | {"kind":"phase-result","label":"reopen-A-sqlite","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":41353216,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"reopen","arm":"A","samples":32,"count":2,"pass":7,"fail":0},"elapsedMs":273,"groupPeakRssBytes":0,"observationFailure":null,"outputBytes":10277} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| 32. LP17/reopen/jsonl LP02.journal-reopen | 실제 assertion | PASS | 원출력 판정 보존 |
| 33. LP17/reopen/jsonl LP02.catalog-reopen | 실제 assertion | PASS | 원출력 판정 보존 |
| 34. LP17/reopen/jsonl/0 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 보존 |
| 35. LP17/reopen/jsonl/0 deleted.public-hidden | 실제 assertion | PASS | 원출력 판정 보존 |
| 36. LP17/reopen/jsonl/0 reopen.deleted-state | 실제 assertion | PASS | 원출력 판정 보존 |
| 37. LP17/reopen/jsonl/1 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 보존 |
| 38. LP17/reopen/jsonl/1 reopen.remaining-media | 실제 assertion | PASS | 원출력 판정 보존 |
| reopen-A-jsonl | {"kind":"phase-result","label":"reopen-A-jsonl","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":40648704,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"reopen","arm":"A","samples":32,"count":2,"pass":7,"fail":0},"elapsedMs":250,"groupPeakRssBytes":0,"observationFailure":null,"outputBytes":8657} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| store-cleanup | {"kind":"store-cleanup","store":"<owned-root>/store-A","bytes":256627,"removed":true} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| 39. LP17/commit1 LP02.reserve | 실제 assertion | PASS | 원출력 판정 보존 |
| 40. LP17/commit1 LP02.actual-file-outside-catalog | 실제 assertion | PASS | 원출력 판정 보존 |
| 41. LP17/commit1 LP02.commit | 실제 assertion | PASS | 원출력 판정 보존 |
| 42. LP17/commit2 LP02.reserve | 실제 assertion | PASS | 원출력 판정 보존 |
| 43. LP17/commit2 LP02.actual-file-outside-catalog | 실제 assertion | PASS | 원출력 판정 보존 |
| 44. LP17/commit2 LP02.commit | 실제 assertion | PASS | 원출력 판정 보존 |
| 45. LP17/snapshot2 LP02.snapshot-exact-count | 실제 assertion | PASS | 원출력 판정 보존 |
| 46. LP17/snapshot2 snapshot.canonical-all | 실제 assertion | PASS | 원출력 판정 보존 |
| 47. LP17/snapshot2 LP02.explicit-checkpoint | 실제 assertion | PASS | 원출력 판정 보존 |
| 48. LP17/snapshot2 LP02.reservation-bound-mutation-count | 실제 assertion | PASS | 원출력 판정 보존 |
| 49. LP17/delete delete.original-canonical | 실제 assertion | PASS | 원출력 판정 보존 |
| 50. LP17/delete delete.pending | 실제 assertion | PASS | 원출력 판정 보존 |
| 51. LP17/delete delete.unlink | 실제 assertion | PASS | 원출력 판정 보존 |
| 52. LP17/delete delete.tombstone | 실제 assertion | PASS | 원출력 판정 보존 |
| 53. LP17/delete delete.checkpoint | 실제 assertion | PASS | 원출력 판정 보존 |
| 54. LP17/delete delete.binding-preserved | 실제 assertion | PASS | 원출력 판정 보존 |
| 55. LP17/delete deleted.public-hidden | 실제 assertion | PASS | 원출력 판정 보존 |
| scale-B | {"kind":"phase-result","label":"scale-B","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":41861120,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"scale","arm":"B","samples":32,"count":2,"pass":17,"fail":0},"elapsedMs":277,"groupPeakRssBytes":42991616,"observationFailure":null,"outputBytes":51454} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| 56. LP17/reopen/sqlite LP02.journal-reopen | 실제 assertion | PASS | 원출력 판정 보존 |
| 57. LP17/reopen/sqlite LP02.catalog-reopen | 실제 assertion | PASS | 원출력 판정 보존 |
| 58. LP17/reopen/sqlite/0 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 보존 |
| 59. LP17/reopen/sqlite/0 deleted.public-hidden | 실제 assertion | PASS | 원출력 판정 보존 |
| 60. LP17/reopen/sqlite/0 reopen.deleted-state | 실제 assertion | PASS | 원출력 판정 보존 |
| 61. LP17/reopen/sqlite/1 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 보존 |
| 62. LP17/reopen/sqlite/1 reopen.remaining-media | 실제 assertion | PASS | 원출력 판정 보존 |
| reopen-B-sqlite | {"kind":"phase-result","label":"reopen-B-sqlite","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":41418752,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"reopen","arm":"B","samples":32,"count":2,"pass":7,"fail":0},"elapsedMs":275,"groupPeakRssBytes":0,"observationFailure":null,"outputBytes":10269} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| 63. LP17/reopen/jsonl LP02.journal-reopen | 실제 assertion | PASS | 원출력 판정 보존 |
| 64. LP17/reopen/jsonl LP02.catalog-reopen | 실제 assertion | PASS | 원출력 판정 보존 |
| 65. LP17/reopen/jsonl/0 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 보존 |
| 66. LP17/reopen/jsonl/0 deleted.public-hidden | 실제 assertion | PASS | 원출력 판정 보존 |
| 67. LP17/reopen/jsonl/0 reopen.deleted-state | 실제 assertion | PASS | 원출력 판정 보존 |
| 68. LP17/reopen/jsonl/1 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 보존 |
| 69. LP17/reopen/jsonl/1 reopen.remaining-media | 실제 assertion | PASS | 원출력 판정 보존 |
| reopen-B-jsonl | {"kind":"phase-result","label":"reopen-B-jsonl","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":40812544,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"reopen","arm":"B","samples":32,"count":2,"pass":7,"fail":0},"elapsedMs":253,"groupPeakRssBytes":0,"observationFailure":null,"outputBytes":8644} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| store-cleanup | {"kind":"store-cleanup","store":"<owned-root>/store-B","bytes":256627,"removed":true} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| 70. LP17/commit1 LP02.reserve | 실제 assertion | PASS | 원출력 판정 보존 |
| 71. LP17/commit1 LP02.actual-file-outside-catalog | 실제 assertion | PASS | 원출력 판정 보존 |
| 72. LP17/commit1 LP02.commit | 실제 assertion | PASS | 원출력 판정 보존 |
| 73. LP17/commit2 LP02.reserve | 실제 assertion | PASS | 원출력 판정 보존 |
| 74. LP17/commit2 LP02.actual-file-outside-catalog | 실제 assertion | PASS | 원출력 판정 보존 |
| 75. LP17/commit2 LP02.commit | 실제 assertion | PASS | 원출력 판정 보존 |
| 76. LP17/snapshot2 LP02.snapshot-exact-count | 실제 assertion | PASS | 원출력 판정 보존 |
| 77. LP17/snapshot2 snapshot.canonical-all | 실제 assertion | PASS | 원출력 판정 보존 |
| 78. LP17/snapshot2 LP02.explicit-checkpoint | 실제 assertion | PASS | 원출력 판정 보존 |
| 79. LP17/snapshot2 LP02.reservation-bound-mutation-count | 실제 assertion | PASS | 원출력 판정 보존 |
| 80. LP17/delete delete.original-canonical | 실제 assertion | PASS | 원출력 판정 보존 |
| 81. LP17/delete delete.pending | 실제 assertion | PASS | 원출력 판정 보존 |
| 82. LP17/delete delete.unlink | 실제 assertion | PASS | 원출력 판정 보존 |
| 83. LP17/delete delete.tombstone | 실제 assertion | PASS | 원출력 판정 보존 |
| 84. LP17/delete delete.checkpoint | 실제 assertion | PASS | 원출력 판정 보존 |
| 85. LP17/delete delete.binding-preserved | 실제 assertion | PASS | 원출력 판정 보존 |
| 86. LP17/delete deleted.public-hidden | 실제 assertion | PASS | 원출력 판정 보존 |
| scale-C | {"kind":"phase-result","label":"scale-C","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":41893888,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"scale","arm":"C","samples":32,"count":2,"pass":17,"fail":0},"elapsedMs":276,"groupPeakRssBytes":43106304,"observationFailure":null,"outputBytes":53626} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| 87. LP17/reopen/sqlite LP02.journal-reopen | 실제 assertion | PASS | 원출력 판정 보존 |
| 88. LP17/reopen/sqlite LP02.catalog-reopen | 실제 assertion | PASS | 원출력 판정 보존 |
| 89. LP17/reopen/sqlite/0 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 보존 |
| 90. LP17/reopen/sqlite/0 deleted.public-hidden | 실제 assertion | PASS | 원출력 판정 보존 |
| 91. LP17/reopen/sqlite/0 reopen.deleted-state | 실제 assertion | PASS | 원출력 판정 보존 |
| 92. LP17/reopen/sqlite/1 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 보존 |
| 93. LP17/reopen/sqlite/1 reopen.remaining-media | 실제 assertion | PASS | 원출력 판정 보존 |
| reopen-C-sqlite | {"kind":"phase-result","label":"reopen-C-sqlite","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":41418752,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"reopen","arm":"C","samples":32,"count":2,"pass":7,"fail":0},"elapsedMs":274,"groupPeakRssBytes":0,"observationFailure":null,"outputBytes":10266} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| 94. LP17/reopen/jsonl LP02.journal-reopen | 실제 assertion | PASS | 원출력 판정 보존 |
| 95. LP17/reopen/jsonl LP02.catalog-reopen | 실제 assertion | PASS | 원출력 판정 보존 |
| 96. LP17/reopen/jsonl/0 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 보존 |
| 97. LP17/reopen/jsonl/0 deleted.public-hidden | 실제 assertion | PASS | 원출력 판정 보존 |
| 98. LP17/reopen/jsonl/0 reopen.deleted-state | 실제 assertion | PASS | 원출력 판정 보존 |
| 99. LP17/reopen/jsonl/1 LP02.exact-source | 실제 assertion | PASS | 원출력 판정 보존 |
| 100. LP17/reopen/jsonl/1 reopen.remaining-media | 실제 assertion | PASS | 원출력 판정 보존 |
| reopen-C-jsonl | {"kind":"phase-result","label":"reopen-C-jsonl","historicalRssPass":true,"observationValid":true,"semanticPass":true,"cleanupPass":true,"diagnosticPass":true,"peakRssBytes":40632320,"stopReason":null,"exitCode":0,"signal":null,"summary":{"kind":"summary","mode":"reopen","arm":"C","samples":32,"count":2,"pass":7,"fail":0},"elapsedMs":253,"groupPeakRssBytes":0,"observationFailure":null,"outputBytes":8642} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| store-cleanup | {"kind":"store-cleanup","store":"<owned-root>/store-C","bytes":256627,"removed":true} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| source-unchanged | {"kind":"source-unchanged","unchanged":true} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| cleanup | {"kind":"cleanup","bytes":18665182,"removed":true} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |
| run-result | {"kind":"run-result","mode":"small","id":"lp18-accepted-01","diagnosticPass":true,"failure":null,"phases":12,"elapsedMs":9420,"productPass":false,"tokenConsumed":null} | PASS | RED focused의 exit1은 실제 FAIL로 보존 |

원출력 assertion 행수: 100개. 실행 범위/한계는 중앙 LP18 기록을 따른다.
