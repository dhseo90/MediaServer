# S10 3C-5.3a 최종 개별 실행 결과

독자: 개발·검토 담당자. lifecycle: 이번 승인 단기 검증의 보존 증거. 중앙 정의/결과는 [release-test-records](../../../release-test-records.md), 상세 범위와 실패 이력은 [보고서](report.md)를 따른다. 동일 제목의 다른 빌드 프로파일 실행은 서로 다른 실제 실행 행이다.

제품/관련 회귀 최종 assertion 행 349개이며 build·diffcheck·원출력 보존/정리 검사는 별개다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. J01 실제 선택→compact 내구 job 계약 왕복 | [FinalFocused.log](FinalFocused.log) 1행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 2. J17 무관source8개 추가에도 동일선택 jobID 유지 | [FinalFocused.log](FinalFocused.log) 3행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 3. J18 cleanup wall시계 역행 허용·순서는상태로검사 | [FinalFocused.log](FinalFocused.log) 4행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 4. J04 단일 Intent 원장·보호·예약 원자 가시성 | [FinalFocused.log](FinalFocused.log) 5행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 5. J19 후발 coordinator 일반·파생 admission 및 복구 차단 | [FinalFocused.log](FinalFocused.log) 6행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 6. J02 이후 시각 재Build ID 유지·선택 변경 새 ID | [FinalFocused.log](FinalFocused.log) 7행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 7. J03 unknown·중복·미지원 schema·불완전 JSON·4MiB·예약 상한·미구현 state 거부 | [FinalFocused.log](FinalFocused.log) 8행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 8. J16 소유 경로·attempt·order 계획 조작 거부 | [FinalFocused.log](FinalFocused.log) 9행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 9. J16 실제 2 source UUID 역순이어도 영속 order 순 출력 계획 | [FinalFocused.log](FinalFocused.log) 10행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 10. J08 나중 시각 재요청 최초 시각 유지·예약/경로 충돌·다른 catalog 거부 | [FinalFocused.log](FinalFocused.log) 11행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 11. J06 generic hold 감소로 job 보호 해제 불가·직접 삭제/corrupt 차단 | [FinalFocused.log](FinalFocused.log) 12행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 12. J14 cleanup Failed는 job 자원만 해제·wall 역행·terminal 자동 재시도 없음 | [FinalFocused.log](FinalFocused.log) 13행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 13. J05 pending·corrupt·tombstone·hash·binding 불일치 source 거부 | [FinalFocused.log](FinalFocused.log) 19행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 14. J07 실제 source 삭제/Intent 경쟁에서 둘 중 한 전이만 허용 | [FinalFocused.log](FinalFocused.log) 20행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 15. J10 checkpoint 전후 job·보호·예약 유지 | [FinalFocused.log](FinalFocused.log) 21행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 16. J09 SQLite·fallback·재build/reopen 내구 job 동등·중복 보호 가산 없음 | [FinalFocused.log](FinalFocused.log) 22행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 17. J10 replay 동일 중복 멱등·다른 내용/불완전/schema/전이/보호 상태 거부 | [FinalFocused.log](FinalFocused.log) 29행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 18. J11 같은 채널 memory+동시 durable 예약 합계 event quota 제한 | [FinalFocused.log](FinalFocused.log) 30행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 19. J12 durable outstanding을 continuous/event/derived disk 예약에 포함 | [FinalFocused.log](FinalFocused.log) 31행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 20. J13 snapshot/disk provider 실패는 생성·periodic·복구 삭제 차단 | [FinalFocused.log](FinalFocused.log) 32행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 21. J15 partial unknown·이유·후보·요청 시간축 그대로 보존 | [FinalFocused.log](FinalFocused.log) 33행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 22. J19 정확한 소유자 소멸 후 새 coordinator만 재결박 | [FinalFocused.log](FinalFocused.log) 34행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 23. J20 append 거부 후 원장 복원해도 공통 mutation 차단 | [FinalFocused.log](FinalFocused.log) 35행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 24. journal open:  | [CatalogRegression.log](CatalogRegression.log) 1행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 25. fallback catalog open:  | [CatalogRegression.log](CatalogRegression.log) 2행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 26. SQLite off mode 표시 | [CatalogRegression.log](CatalogRegression.log) 3행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 27. segment finalize journal+projection:  | [CatalogRegression.log](CatalogRegression.log) 4행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 28. fallback range query | [CatalogRegression.log](CatalogRegression.log) 5행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 29. event link FK 위반 거부 | [CatalogRegression.log](CatalogRegression.log) 6행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 30. FK 위반 transaction/journal 전체 rollback | [CatalogRegression.log](CatalogRegression.log) 7행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 31. 최초 durable mutation 1개 | [CatalogRegression.log](CatalogRegression.log) 8행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 32. 동일 mutation 중복 append | [CatalogRegression.log](CatalogRegression.log) 9행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 33. 손상 사이 정상 durable mutation 보존 | [CatalogRegression.log](CatalogRegression.log) 10행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 34. 중간 corrupt line count | [CatalogRegression.log](CatalogRegression.log) 11행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 35. 마지막 truncated line skip | [CatalogRegression.log](CatalogRegression.log) 12행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 36. fallback replay open | [CatalogRegression.log](CatalogRegression.log) 13행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 37. 같은 mutation idempotent replay | [CatalogRegression.log](CatalogRegression.log) 14행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 38. 재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존 | [CatalogRegression.log](CatalogRegression.log) 15행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 39. 중복 replay row/합계 불증가 | [CatalogRegression.log](CatalogRegression.log) 16행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 40. 추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구:  | [CatalogRegression.log](CatalogRegression.log) 17행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 41. writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed | [CatalogRegression.log](CatalogRegression.log) 18행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 42. v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed | [CatalogRegression.log](CatalogRegression.log) 19행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 43. SQLite catalog open/rebuild:  | [CatalogRegression.log](CatalogRegression.log) 20행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 44. SQLite primary mode 표시 | [CatalogRegression.log](CatalogRegression.log) 21행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 45. SQLite on/off range query ID·순서 parity | [CatalogRegression.log](CatalogRegression.log) 22행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 46. journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분 | [CatalogRegression.log](CatalogRegression.log) 23행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 47. journal 없는 손상 media orphan 구분 | [CatalogRegression.log](CatalogRegression.log) 24행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 48. projection failover journal open:  | [CatalogRegression.log](CatalogRegression.log) 25행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 49. projection failover catalog open:  | [CatalogRegression.log](CatalogRegression.log) 26행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 50. 실제 SQLite INSERT 실패 trigger 설치 | [CatalogRegression.log](CatalogRegression.log) 27행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 51. SQLite 투영 실패 뒤 journal+memory finalize 유지:  | [CatalogRegression.log](CatalogRegression.log) 28행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 52. SQLite 투영 실패 즉시 JSONL fallback 전환 | [CatalogRegression.log](CatalogRegression.log) 29행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 53. 재시작 rebuild 전 실패 trigger 제거 | [CatalogRegression.log](CatalogRegression.log) 30행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 54. 투영 실패 직후 in-memory query 정합성 유지 | [CatalogRegression.log](CatalogRegression.log) 31행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 55. projection failover 재시작 journal rebuild:  | [CatalogRegression.log](CatalogRegression.log) 32행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 56. 재시작 후 journal에서 누락 SQLite projection 복구 | [CatalogRegression.log](CatalogRegression.log) 33행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 57. 재시작 후 SQLite primary 복귀 | [CatalogRegression.log](CatalogRegression.log) 34행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 58. 재시작 journal rebuild가 실제 SQLite row 복원 | [CatalogRegression.log](CatalogRegression.log) 35행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 59. tombstone journal open:  | [CatalogRegression.log](CatalogRegression.log) 36행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 60. tombstone catalog open:  | [CatalogRegression.log](CatalogRegression.log) 37행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 61. tombstone 대상 segment finalize:  | [CatalogRegression.log](CatalogRegression.log) 38행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 62. tombstone 대상 deletion request:  | [CatalogRegression.log](CatalogRegression.log) 39행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 63. tombstone 완료 기록:  | [CatalogRegression.log](CatalogRegression.log) 40행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 64. catalog finalize가 tombstone segment ID 재사용을 거부해야 함 | [CatalogRegression.log](CatalogRegression.log) 41행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 65. 손상 SQLite 격리 후 journal rebuild:  | [CatalogRegression.log](CatalogRegression.log) 42행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 66. 손상 SQLite 원본 격리 | [CatalogRegression.log](CatalogRegression.log) 43행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 67. 격리 SQLite 파일 보존 | [CatalogRegression.log](CatalogRegression.log) 44행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 68. 격리 후 journal rebuild 결과 | [CatalogRegression.log](CatalogRegression.log) 45행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 69. S10-3A future-schema journal read open | [CatalogRegression.log](CatalogRegression.log) 46행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 70. S10-3A future-schema unsupported classification | [CatalogRegression.log](CatalogRegression.log) 47행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 71. S10-3A future-schema catalog open denied | [CatalogRegression.log](CatalogRegression.log) 48행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 72. S10-3A future-schema catalog retry denied | [CatalogRegression.log](CatalogRegression.log) 49행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 73. S10-3A future-schema journal bytes preserved | [CatalogRegression.log](CatalogRegression.log) 50행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 74. S10-3A future-schema SQLite bytes preserved | [CatalogRegression.log](CatalogRegression.log) 51행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 75. S10-3A future-schema writer cleanup untouched | [CatalogRegression.log](CatalogRegression.log) 52행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 76. S10-3A arbitrary-schema journal read open | [CatalogRegression.log](CatalogRegression.log) 53행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 77. S10-3A arbitrary-schema unsupported classification | [CatalogRegression.log](CatalogRegression.log) 54행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 78. S10-3A arbitrary-schema catalog open denied | [CatalogRegression.log](CatalogRegression.log) 55행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 79. S10-3A arbitrary-schema catalog retry denied | [CatalogRegression.log](CatalogRegression.log) 56행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 80. S10-3A arbitrary-schema journal bytes preserved | [CatalogRegression.log](CatalogRegression.log) 57행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 81. S10-3A arbitrary-schema SQLite bytes preserved | [CatalogRegression.log](CatalogRegression.log) 58행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 82. S10-3A arbitrary-schema writer cleanup untouched | [CatalogRegression.log](CatalogRegression.log) 59행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 83. S10-3A empty-schema journal read open | [CatalogRegression.log](CatalogRegression.log) 60행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 84. S10-3A empty-schema unsupported classification | [CatalogRegression.log](CatalogRegression.log) 61행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 85. S10-3A empty-schema catalog open denied | [CatalogRegression.log](CatalogRegression.log) 62행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 86. S10-3A empty-schema catalog retry denied | [CatalogRegression.log](CatalogRegression.log) 63행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 87. S10-3A empty-schema journal bytes preserved | [CatalogRegression.log](CatalogRegression.log) 64행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 88. S10-3A empty-schema SQLite bytes preserved | [CatalogRegression.log](CatalogRegression.log) 65행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 89. S10-3A empty-schema writer cleanup untouched | [CatalogRegression.log](CatalogRegression.log) 66행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 90. S10-3A future-type journal read open | [CatalogRegression.log](CatalogRegression.log) 67행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 91. S10-3A future-type unsupported classification | [CatalogRegression.log](CatalogRegression.log) 68행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 92. S10-3A future-type catalog open denied | [CatalogRegression.log](CatalogRegression.log) 69행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 93. S10-3A future-type catalog retry denied | [CatalogRegression.log](CatalogRegression.log) 70행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 94. S10-3A future-type journal bytes preserved | [CatalogRegression.log](CatalogRegression.log) 71행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 95. S10-3A future-type SQLite bytes preserved | [CatalogRegression.log](CatalogRegression.log) 72행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 96. S10-3A future-type writer cleanup untouched | [CatalogRegression.log](CatalogRegression.log) 73행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 97. S10-3A malformed journal open | [CatalogRegression.log](CatalogRegression.log) 74행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 98. S10-3A malformed JSON missing fields and wrong types remain corrupt | [CatalogRegression.log](CatalogRegression.log) 75행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 99. S10-O01 reservation journal open | [CatalogRegression.log](CatalogRegression.log) 76행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 100. S10-O01 first reservation returns four IDs and sequence one | [CatalogRegression.log](CatalogRegression.log) 77행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 101. S10-O01 versioned reservation payload replays | [CatalogRegression.log](CatalogRegression.log) 78행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 102. S10-O01 new reservation records actual occurred time | [CatalogRegression.log](CatalogRegression.log) 79행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 103. S10-O02 identical retry preserves sequence and bytes | [CatalogRegression.log](CatalogRegression.log) 80행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 104. S10-O03 reopened instance allocates next sequence | [CatalogRegression.log](CatalogRegression.log) 81행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 105. S10-O03 new process resumes durable sequence | [CatalogRegression.log](CatalogRegression.log) 82행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 106. S10-O04 different store rejected | [CatalogRegression.log](CatalogRegression.log) 83행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 107. S10-O04 reused request with different segment rejected | [CatalogRegression.log](CatalogRegression.log) 84행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 108. S10-O04 reused request with different channel rejected | [CatalogRegression.log](CatalogRegression.log) 85행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 109. S10-O04 reused segment with different request rejected | [CatalogRegression.log](CatalogRegression.log) 86행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 110. S10-O04 conflicts preserve original bytes | [CatalogRegression.log](CatalogRegression.log) 87행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 111. S10-O05/O06 reject and preserve corrupt | [CatalogRegression.log](CatalogRegression.log) 88행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 112. S10-O05/O06 reject and preserve unsupported-schema | [CatalogRegression.log](CatalogRegression.log) 89행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 113. S10-O05/O06 reject and preserve unsupported-type | [CatalogRegression.log](CatalogRegression.log) 90행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 114. S10-O05/O06 reject and preserve tail | [CatalogRegression.log](CatalogRegression.log) 91행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 115. S10-O05/O06 reject and preserve payload-zero | [CatalogRegression.log](CatalogRegression.log) 92행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 116. S10-O05/O06 reject and preserve payload-negative | [CatalogRegression.log](CatalogRegression.log) 93행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 117. S10-O05/O06 reject and preserve payload-fraction | [CatalogRegression.log](CatalogRegression.log) 94행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 118. S10-O05/O06 reject and preserve payload-overflow | [CatalogRegression.log](CatalogRegression.log) 95행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 119. S10-O05/O06 reject and preserve duplicate-sequence | [CatalogRegression.log](CatalogRegression.log) 96행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 120. S10-O05/O06 reject and preserve decreasing-sequence | [CatalogRegression.log](CatalogRegression.log) 97행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 121. S10-O05/O06 reject and preserve duplicate-request | [CatalogRegression.log](CatalogRegression.log) 98행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 122. S10-O05/O06 reject and preserve duplicate-segment | [CatalogRegression.log](CatalogRegression.log) 99행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 123. S10-O05/O06 reject and preserve store-conflict | [CatalogRegression.log](CatalogRegression.log) 100행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 124. S10-O05/O06 reject and preserve ordinary-before | [CatalogRegression.log](CatalogRegression.log) 101행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 125. S10-O05/O06 reject and preserve ordinary-after | [CatalogRegression.log](CatalogRegression.log) 102행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 126. S10-O05/O06 reject and preserve line-cap | [CatalogRegression.log](CatalogRegression.log) 103행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 127. S10-O05 reservation entity envelope binding rejects mismatch | [CatalogRegression.log](CatalogRegression.log) 104행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 128. S10-O05 reservation request envelope binding rejects mismatch | [CatalogRegression.log](CatalogRegression.log) 105행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 129. S10-O01 strict reservation parser accepts versioned literal | [CatalogRegression.log](CatalogRegression.log) 106행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 130. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | [CatalogRegression.log](CatalogRegression.log) 107행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 131. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | [CatalogRegression.log](CatalogRegression.log) 108행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 132. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | [CatalogRegression.log](CatalogRegression.log) 109행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 133. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | [CatalogRegression.log](CatalogRegression.log) 110행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 134. S10-O06 INT64_MAX identical retry remains valid | [CatalogRegression.log](CatalogRegression.log) 111행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 135. S10-O06 sequence overflow rejected without write | [CatalogRegression.log](CatalogRegression.log) 112행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 136. S10-O02 identical durable reservation duplicates remain idempotent | [CatalogRegression.log](CatalogRegression.log) 113행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 137. S10-O06 sequence gaps remain valid and allocate above maximum | [CatalogRegression.log](CatalogRegression.log) 114행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 138. S10-O07 four simultaneous processes finish reservations | [CatalogRegression.log](CatalogRegression.log) 115행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 139. S10-O07 concurrent sequences are unique and complete | [CatalogRegression.log](CatalogRegression.log) 116행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 140. S10-O07 next sequence follows concurrent reservations | [CatalogRegression.log](CatalogRegression.log) 117행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 141. S10-O08 ordinary Append cannot reserve orders | [CatalogRegression.log](CatalogRegression.log) 118행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 142. S10-O08 unopened journal rejected | [CatalogRegression.log](CatalogRegression.log) 119행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 143. S10-O08 null result rejected | [CatalogRegression.log](CatalogRegression.log) 120행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 144. S10-O08 invalid opaque ID rejected | [CatalogRegression.log](CatalogRegression.log) 121행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 145. S10-O08 failed reservation does not expose tentative result | [CatalogRegression.log](CatalogRegression.log) 122행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 146. S10-O09 unsafe file binding rejected and original preserved inode | [CatalogRegression.log](CatalogRegression.log) 123행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 147. S10-O09 unsafe file binding rejected and original preserved parent | [CatalogRegression.log](CatalogRegression.log) 124행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 148. S10-O09 unsafe file binding rejected and original preserved symlink | [CatalogRegression.log](CatalogRegression.log) 125행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 149. S10-O09 unsafe file binding rejected and original preserved hardlink | [CatalogRegression.log](CatalogRegression.log) 126행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 150. S10-O10 reservation and normal segment coexist in catalog | [CatalogRegression.log](CatalogRegression.log) 127행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 151. S10-O04 reserve then finalize permits identical retry | [CatalogRegression.log](CatalogRegression.log) 128행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 152. S10-O10 reservation survives catalog rebuild without changing segment query | [CatalogRegression.log](CatalogRegression.log) 129행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 153. S10-O04 legacy segment cannot acquire retroactive reservation | [CatalogRegression.log](CatalogRegression.log) 130행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 154. S10-M06 opened catalog accepts fresh exact reservation V2 finalize | [CatalogRegression.log](CatalogRegression.log) 131행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 155. S10-M07 V2 find preserves complete metadata | [CatalogRegression.log](CatalogRegression.log) 132행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 156. S10-M07 identical V2 recovery is idempotent | [CatalogRegression.log](CatalogRegression.log) 133행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 157. S10-M07 V2 is absent from V1 range query | [CatalogRegression.log](CatalogRegression.log) 134행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 158. S10-M07 V2 registered path is not orphan | [CatalogRegression.log](CatalogRegression.log) 135행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 159. S10-M07 SQLite exact V2 JSON and path match | [CatalogRegression.log](CatalogRegression.log) 136행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 160. S10-M07 JSONL restart preserves V2 exact payload | [CatalogRegression.log](CatalogRegression.log) 137행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 161. S10-M06 wrong reservation tuple rejected store | [CatalogRegression.log](CatalogRegression.log) 138행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 162. S10-M06 wrong reservation tuple rejected request | [CatalogRegression.log](CatalogRegression.log) 139행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 163. S10-M06 wrong reservation tuple rejected segment | [CatalogRegression.log](CatalogRegression.log) 140행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 164. S10-M06 wrong reservation tuple rejected channel | [CatalogRegression.log](CatalogRegression.log) 141행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 165. S10-M06 wrong reservation tuple rejected sequence | [CatalogRegression.log](CatalogRegression.log) 142행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 166. S10-M09 immutable V2 mapping mismatch rejected | [CatalogRegression.log](CatalogRegression.log) 143행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 167. S10-M09 bad V2 startup retry preserves original state bad-payload | [CatalogRegression.log](CatalogRegression.log) 144행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 168. S10-M09 bad V2 startup retry preserves original state missing-order | [CatalogRegression.log](CatalogRegression.log) 145행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 169. S10-M09 bad V2 startup retry preserves original state bad-order | [CatalogRegression.log](CatalogRegression.log) 146행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 170. S10-M09 bad V2 startup retry preserves original state conflicting-order | [CatalogRegression.log](CatalogRegression.log) 147행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 171. S10-M09 bad V2 startup retry preserves original state tail | [CatalogRegression.log](CatalogRegression.log) 148행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 172. S10-M09 bad V2 startup retry preserves original state corrupt | [CatalogRegression.log](CatalogRegression.log) 149행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 173. S10-M09 bad V2 startup retry preserves original state unsafe-path | [CatalogRegression.log](CatalogRegression.log) 150행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 174. S10-M09 default off rejects V2 before SQLite changes | [CatalogRegression.log](CatalogRegression.log) 151행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 175. S10-M09 V2 replay namespace and deletion duplicate | [CatalogRegression.log](CatalogRegression.log) 152행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 176. S10-M09 V2 replay namespace and deletion deleted | [CatalogRegression.log](CatalogRegression.log) 153행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 177. S10-M09 V2 replay namespace and deletion v1-before | [CatalogRegression.log](CatalogRegression.log) 154행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 178. S10-M09 V2 replay namespace and deletion v1-after | [CatalogRegression.log](CatalogRegression.log) 155행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 179. S10-M09 V2 replay namespace and deletion deleted-before | [CatalogRegression.log](CatalogRegression.log) 156행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 180. S10-M09 V2 replay namespace and deletion resurrection | [CatalogRegression.log](CatalogRegression.log) 157행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 181. S10-M09 V2 replay namespace and deletion mutation-collision | [CatalogRegression.log](CatalogRegression.log) 158행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 182. S10-M09 V2 finalize rejects missing media | [CatalogRegression.log](CatalogRegression.log) 159행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 183. S10-M09 V2 finalize rejects directory media | [CatalogRegression.log](CatalogRegression.log) 160행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 184. S10-M09 fresh candidate rejects mapping | [CatalogRegression.log](CatalogRegression.log) 161행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 185. S10-M09 fresh candidate rejects path | [CatalogRegression.log](CatalogRegression.log) 162행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 186. S10-M09 fresh candidate rejects tombstone | [CatalogRegression.log](CatalogRegression.log) 163행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 187. S10-SW01 managed empty root opens with lifetime lease | [CatalogRegression.log](CatalogRegression.log) 164행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 188. S10-SW02 same process second managed owner denied | [CatalogRegression.log](CatalogRegression.log) 165행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 189. S10-SW03 different process owner and inherited use denied | [CatalogRegression.log](CatalogRegression.log) 166행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 190. S10-SW12 managed duplicate descriptors are close-on-exec | [CatalogRegression.log](CatalogRegression.log) 167행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 191. S10-SW05 managed reserve append replay use owned descriptor | [CatalogRegression.log](CatalogRegression.log) 168행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 192. S10-SW06 raw managed access and legacy default path denied | [CatalogRegression.log](CatalogRegression.log) 169행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 193. S10-SW01 managed Reserve rejects different store identity | [CatalogRegression.log](CatalogRegression.log) 170행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 194. S10-SW10 catalog connection can inspect managed lease | [CatalogRegression.log](CatalogRegression.log) 171행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 195. S10-SW04 owner destruction releases lease | [CatalogRegression.log](CatalogRegression.log) 172행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 196. S10-SW01 managed reopen rejects different store identity | [CatalogRegression.log](CatalogRegression.log) 173행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 197. S10-SW11 managed incomplete tail rejects append without changing bytes | [CatalogRegression.log](CatalogRegression.log) 174행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 198. S10-SW07 legacy nonempty root preserved without conversion | [CatalogRegression.log](CatalogRegression.log) 175행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 199. S10-SW08 partial initialization retry validates exact state lease | [CatalogRegression.log](CatalogRegression.log) 176행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 200. S10-SW08 partial initialization retry validates exact state init | [CatalogRegression.log](CatalogRegression.log) 177행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 201. S10-SW08 partial initialization retry validates exact state barrier | [CatalogRegression.log](CatalogRegression.log) 178행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 202. S10-SW08 partial initialization retry validates exact state journal | [CatalogRegression.log](CatalogRegression.log) 179행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 203. S10-SW08 partial initialization retry validates exact state incomplete | [CatalogRegression.log](CatalogRegression.log) 180행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 204. S10-SW08 partial initialization retry validates exact state unknown | [CatalogRegression.log](CatalogRegression.log) 181행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 205. S10-SW09 symlink inode and malformed marker rejected journal | [CatalogRegression.log](CatalogRegression.log) 182행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 206. S10-SW09 symlink inode and malformed marker rejected marker | [CatalogRegression.log](CatalogRegression.log) 183행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 207. S10-SW09 symlink inode and malformed marker rejected barrier | [CatalogRegression.log](CatalogRegression.log) 184행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 208. S10-SW09 symlink inode and malformed marker rejected root-symlink | [CatalogRegression.log](CatalogRegression.log) 185행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 209. S10-SB01 second managed catalog is denied | [CatalogRegression.log](CatalogRegression.log) 186행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 210. S10-SB02 failed catalog cannot mutate journal or holds | [CatalogRegression.log](CatalogRegression.log) 187행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 211. S10-SB03 attached catalog blocks unowned append but permits reservation | [CatalogRegression.log](CatalogRegression.log) 188행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 212. S10-SB04 catalog destruction releases attachment | [CatalogRegression.log](CatalogRegression.log) 189행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 213. S10-SB05 managed catalog rejects unsafe options outside | [CatalogRegression.log](CatalogRegression.log) 190행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 214. S10-SB05 managed catalog rejects unsafe options dotdot | [CatalogRegression.log](CatalogRegression.log) 191행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 215. S10-SB05 managed catalog rejects unsafe options media-symlink | [CatalogRegression.log](CatalogRegression.log) 192행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 216. S10-SB05 managed catalog rejects unsafe options sqlite-symlink | [CatalogRegression.log](CatalogRegression.log) 193행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 217. S10-SB05 managed catalog rejects unsafe options sqlite-hardlink | [CatalogRegression.log](CatalogRegression.log) 194행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 218. S10-SB05 managed catalog rejects unsafe options disabled | [CatalogRegression.log](CatalogRegression.log) 195행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 219. S10-SB06 failed open releases catalog attachment | [CatalogRegression.log](CatalogRegression.log) 196행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 220. S10-SB07 managed SQLite sidecar rejected -wal symlink | [CatalogRegression.log](CatalogRegression.log) 197행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 221. S10-SB07 managed SQLite sidecar rejected -wal hardlink | [CatalogRegression.log](CatalogRegression.log) 198행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 222. S10-SB07 managed SQLite sidecar rejected -shm symlink | [CatalogRegression.log](CatalogRegression.log) 199행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 223. S10-SB07 managed SQLite sidecar rejected -shm hardlink | [CatalogRegression.log](CatalogRegression.log) 200행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 224. S10-SB07 managed SQLite sidecar rejected -journal symlink | [CatalogRegression.log](CatalogRegression.log) 201행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 225. S10-SB07 managed SQLite sidecar rejected -journal hardlink | [CatalogRegression.log](CatalogRegression.log) 202행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 226. S10-SC01 managed repeated event fixture is valid | [CatalogRegression.log](CatalogRegression.log) 203행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 227. S10-SC02 managed reservations avoid history reads | [CatalogRegression.log](CatalogRegression.log) 204행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 228. S10-SC03 managed V2 finalize avoids full replay | [CatalogRegression.log](CatalogRegression.log) 205행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 229. S10-SC04 checkpoint reduces superseded event payload bytes | [CatalogRegression.log](CatalogRegression.log) 206행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 230. S10-SC05 checkpoint preserves latest event and all record identities | [CatalogRegression.log](CatalogRegression.log) 207행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 231. S10-SC06 checkpoint is idempotent and preserves V2 | [CatalogRegression.log](CatalogRegression.log) 208행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 232. S10-SC08 receipt preserves retry identity and rejects direct append | [CatalogRegression.log](CatalogRegression.log) 209행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 233. S10-SC09 checkpoint restart preserves SQLite and JSONL state sqlite | [CatalogRegression.log](CatalogRegression.log) 210행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 234. S10-SC09 managed checkpoint SQL V2 payload and path | [CatalogRegression.log](CatalogRegression.log) 211행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 235. S10-SC09 checkpoint restart preserves SQLite and JSONL state jsonl | [CatalogRegression.log](CatalogRegression.log) 212행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 236. S10-SC10 checkpoint prefix recovers before writes | [CatalogRegression.log](CatalogRegression.log) 213행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 237. S10-SC11 checkpoint mismatch preserves bytes and poisons owner | [CatalogRegression.log](CatalogRegression.log) 214행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 238. S10-SC12 first accepted mutation controls latest event | [CatalogRegression.log](CatalogRegression.log) 215행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 239. S10-SC16 automatic checkpoint uses accumulated growth | [CatalogRegression.log](CatalogRegression.log) 216행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 240. S10-SC07 raw checkpoint is rejected | [CatalogRegression.log](CatalogRegression.log) 217행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 241. S10-SC18 checkpoint syscall failure poisons and reopens write | [CatalogRegression.log](CatalogRegression.log) 218행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 242. S10-SC21 poison rejects hold mutation write | [CatalogRegression.log](CatalogRegression.log) 219행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 243. S10-SC18 checkpoint syscall failure poisons and reopens file-fsync | [CatalogRegression.log](CatalogRegression.log) 220행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 244. S10-SC21 poison rejects hold mutation file-fsync | [CatalogRegression.log](CatalogRegression.log) 221행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 245. S10-SC18 checkpoint syscall failure poisons and reopens rename | [CatalogRegression.log](CatalogRegression.log) 222행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 246. S10-SC21 poison rejects hold mutation rename | [CatalogRegression.log](CatalogRegression.log) 223행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 247. S10-SC18 checkpoint syscall failure poisons and reopens dir-fsync | [CatalogRegression.log](CatalogRegression.log) 224행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 248. S10-SC21 poison rejects hold mutation dir-fsync | [CatalogRegression.log](CatalogRegression.log) 225행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 249. S10-SC17 checkpoint preserves holds observations and deletion | [CatalogRegression.log](CatalogRegression.log) 226행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 250. S10-SC17 checkpoint SQL hold observation tombstone | [CatalogRegression.log](CatalogRegression.log) 227행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 251. S10-SC17 checkpoint preserves holds observations and deletion restart sqlite | [CatalogRegression.log](CatalogRegression.log) 228행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 252. S10-SC17 checkpoint SQL restart observation tombstone | [CatalogRegression.log](CatalogRegression.log) 229행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 253. S10-SC17 checkpoint preserves holds observations and deletion restart jsonl | [CatalogRegression.log](CatalogRegression.log) 230행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 254. S10-SC19 invalid managed history remains unchanged malformed | [CatalogRegression.log](CatalogRegression.log) 231행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 255. S10-SC19 invalid managed history remains unchanged unsupported | [CatalogRegression.log](CatalogRegression.log) 232행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 256. S10-SC19 invalid managed history remains unchanged conflict | [CatalogRegression.log](CatalogRegression.log) 233행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 257. S10-SC20 raw catalog rejects receipt before side effects | [CatalogRegression.log](CatalogRegression.log) 234행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 258. S10-SC13 crypto off raw remains usable | [CatalogRegression.log](CatalogRegression.log) 236행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 259. S10-SC14 crypto off checkpoint is rejected | [CatalogRegression.log](CatalogRegression.log) 237행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 260. S10-SC15 crypto off receipt reopen is rejected | [CatalogRegression.log](CatalogRegression.log) 238행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 261. source 저장 callback reconcile 연결 | [CatalogRegression.log](CatalogRegression.log) 239행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 262. policy revision idempotency | [CatalogRegression.log](CatalogRegression.log) 240행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 263. 5초 safety reconcile | [CatalogRegression.log](CatalogRegression.log) 241행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 264. composition root journal 선행 open | [CatalogRegression.log](CatalogRegression.log) 242행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 265. composition root catalog rebuild/open | [CatalogRegression.log](CatalogRegression.log) 243행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 266. 서버 전 supervisor 시작 | [CatalogRegression.log](CatalogRegression.log) 244행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 267. ingress 전 event bridge 등록 | [CatalogRegression.log](CatalogRegression.log) 245행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 268. ingress 종료 뒤 recorder finalize | [CatalogRegression.log](CatalogRegression.log) 246행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 269. composition root 시작/종료 순서 | [CatalogRegression.log](CatalogRegression.log) 247행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 270. continuous quota는 end_utc_ms, segment_id oldest-first | [RetentionRegression.log](RetentionRegression.log) 1행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 271. continuous/event quota가 자기 등급 artifact만 선택 | [RetentionRegression.log](RetentionRegression.log) 2행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 272. continuous/event 보존 기간을 독립적으로 적용 | [RetentionRegression.log](RetentionRegression.log) 3행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 273. continuous 보존 기간은 event와 독립적으로 적용 | [RetentionRegression.log](RetentionRegression.log) 4행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 274. event 보존 기간은 continuous와 독립적으로 적용 | [RetentionRegression.log](RetentionRegression.log) 5행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 275. 새 segment 예상 용량까지 continuous quota에 선반영 | [RetentionRegression.log](RetentionRegression.log) 6행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 276. pinned event와 hold_count>0 continuous 자동 삭제 제외 | [RetentionRegression.log](RetentionRegression.log) 7행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 277. disk reserve 부족은 eligible continuous부터 정리 | [RetentionRegression.log](RetentionRegression.log) 8행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 278. journal 실패 시 media unlink와 tombstone 중단 | [RetentionRegression.log](RetentionRegression.log) 9행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 279. unlink 실패는 deletion_pending 유지, 회수 byte 0 | [RetentionRegression.log](RetentionRegression.log) 10행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 280. tombstone journal 실패는 pending으로 남겨 다음 tick 복구 | [RetentionRegression.log](RetentionRegression.log) 11행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 281. channel retention policy 등록:  | [RetentionRegression.log](RetentionRegression.log) 12행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 282. 삭제 불가 시 해당 channel writer만 storage-blocked | [RetentionRegression.log](RetentionRegression.log) 13행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 283. 공간 회복 뒤 새 keyframe용 epoch 재발급 신호 | [RetentionRegression.log](RetentionRegression.log) 14행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 284. 다중 channel reserve policy 등록 | [RetentionRegression.log](RetentionRegression.log) 15행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 285. 동시 channel admission이 물리 여유 공간을 중복 예약하지 않음 | [RetentionRegression.log](RetentionRegression.log) 16행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 286. segment finalize 후 in-flight reserve 반환으로 다른 channel 재개 | [RetentionRegression.log](RetentionRegression.log) 17행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 287. segment hard bound policy 등록 | [RetentionRegression.log](RetentionRegression.log) 18행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 288. 최소 packet보다 작은 continuous quota는 쓰기 전에 차단 | [RetentionRegression.log](RetentionRegression.log) 19행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 289. 진행량 정산 policy 등록 | [RetentionRegression.log](RetentionRegression.log) 20행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 290. 물리 free에 반영된 partial 쓰기량은 예약에서 이중 차감하지 않음 | [RetentionRegression.log](RetentionRegression.log) 21행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 291. 실제 동시 admission policy 등록 | [RetentionRegression.log](RetentionRegression.log) 22행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 292. 두 실제 thread의 동시 admission 중 하나만 reserve 획득 | [RetentionRegression.log](RetentionRegression.log) 23행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 293. cleanup 미해결 reservation policy 등록 | [RetentionRegression.log](RetentionRegression.log) 24행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 294. cleanup 미해결 channel 재활성화 policy 등록 | [RetentionRegression.log](RetentionRegression.log) 25행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 295. 정책 비활성·재활성 뒤에도 미해결 파일 reservation을 유지해 fail-closed | [RetentionRegression.log](RetentionRegression.log) 26행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 296. stale free-space policy 등록 | [RetentionRegression.log](RetentionRegression.log) 27행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 297. unlink 뒤에도 filesystem 여유 공간이 부족하면 회수량을 추정해 허용하지 않음 | [RetentionRegression.log](RetentionRegression.log) 28행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 298. 통합 journal open:  | [RetentionRegression.log](RetentionRegression.log) 29행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 299. 통합 catalog open:  | [RetentionRegression.log](RetentionRegression.log) 30행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 300. 통합 segment finalize:  | [RetentionRegression.log](RetentionRegression.log) 31행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 301. tombstone은 남고 media path와 원본 bytes는 제거 | [RetentionRegression.log](RetentionRegression.log) 32행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 302. hold overflow segment finalize:  | [RetentionRegression.log](RetentionRegression.log) 33행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 303. hold_count int64 최댓값 저장:  | [RetentionRegression.log](RetentionRegression.log) 34행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 304. hold_count int64 오버플로 거부 | [RetentionRegression.log](RetentionRegression.log) 35행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 305. hold race segment finalize:  | [RetentionRegression.log](RetentionRegression.log) 36행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 306. hold_count 획득:  | [RetentionRegression.log](RetentionRegression.log) 37행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 307. 계획 뒤 획득된 hold도 삭제 transition에서 재검증 | [RetentionRegression.log](RetentionRegression.log) 38행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 308. pending recovery segment finalize:  | [RetentionRegression.log](RetentionRegression.log) 39행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 309. pending recovery 삭제 요청:  | [RetentionRegression.log](RetentionRegression.log) 40행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 310. pending recovery media 사전 제거 | [RetentionRegression.log](RetentionRegression.log) 41행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 311. unlink 뒤 tombstone 실패 상태를 다음 tick에서 idempotent 재완료 | [RetentionRegression.log](RetentionRegression.log) 42행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 312. pending 복구 격리 policy 등록 | [RetentionRegression.log](RetentionRegression.log) 43행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 313. 한 channel의 pending 복구 실패가 다른 channel admission/tick을 차단하지 않음 | [RetentionRegression.log](RetentionRegression.log) 44행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 314. 정책이 없거나 비활성인 channel의 pending도 주기적으로 tombstone 완료 | [RetentionRegression.log](RetentionRegression.log) 45행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 315. event 압력 독립 policy 등록 | [RetentionRegression.log](RetentionRegression.log) 46행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 316. event 예상 회수량을 제외하고 continuous만으로 reserve와 admission 처리 | [RetentionRegression.log](RetentionRegression.log) 47행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 317. malicious journal open:  | [RetentionRegression.log](RetentionRegression.log) 48행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 318. malicious mutation append:  | [RetentionRegression.log](RetentionRegression.log) 49행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 319. malicious catalog open:  | [RetentionRegression.log](RetentionRegression.log) 50행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 320. journal mediaRelpath가 root 밖이면 retention 후보에서 격리 | [RetentionRegression.log](RetentionRegression.log) 51행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 321. unlink 직전 symlink 전환 준비 | [RetentionRegression.log](RetentionRegression.log) 52행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 322. unlink 직전 root 밖 symlink 생성 | [RetentionRegression.log](RetentionRegression.log) 53행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 323. journal 이후 unlink 직전 canonical root containment 재검증 | [RetentionRegression.log](RetentionRegression.log) 54행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 324. dirfd에 결박된 unlink는 검증 뒤 상위 경로 교체에도 외부 파일을 보호 | [RetentionRegression.log](RetentionRegression.log) 55행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 325. storage root가 비어 있으면 안전 unlink를 fail-closed | [RetentionRegression.log](RetentionRegression.log) 56행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 326. B01 V2 tombstone preserves immutable segment without legacy UTC range | [RetentionV2Final.log](RetentionV2Final.log) 1행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 327. B02 V2 state records reject malformed payload entity and duplicate conflicts | [RetentionV2Final.log](RetentionV2Final.log) 2행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 328. B03 V2 pending corrupt and deleted overlays never mutate finalized payload | [RetentionV2Final.log](RetentionV2Final.log) 3행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 329. B04 V2 invalid transitions and finalize retries cannot resurrect state | [RetentionV2Final.log](RetentionV2Final.log) 4행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 330. B05 V2 checkpoint and restart preserve overlay tombstone and SQLite parity | [RetentionV2Final.log](RetentionV2Final.log) 5행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 331. B06 V2 capacity deletion follows durable order despite reversed UTC | [RetentionV2Final.log](RetentionV2Final.log) 6행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 332. B07 mixed legacy and multiple stores use deterministic nonchronological ordering | [RetentionV2Final.log](RetentionV2Final.log) 7행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 333. B08 V2 age expiry uses all known mapping ends plus uncertainty rounded upward | [RetentionV2Final.log](RetentionV2Final.log) 8행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 334. B09 V2 unknown or overflowing age remains capacity eligible | [RetentionV2Final.log](RetentionV2Final.log) 9행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 335. B10 V2 class quotas and disk reserve remain separated | [RetentionV2Final.log](RetentionV2Final.log) 10행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 336. B11 V2 pin and hold protect deletion and corruption | [RetentionV2Final.log](RetentionV2Final.log) 11행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 337. B12 V2 pending and corrupt bytes remain charged but are not automatic victims | [RetentionV2Final.log](RetentionV2Final.log) 12행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 338. B13 V2 apply persists pending before unlink and tombstone after unlink | [RetentionV2Final.log](RetentionV2Final.log) 13행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 339. B14 V2 interrupted deletion recovers without resurrection | [RetentionV2Final.log](RetentionV2Final.log) 14행, 해당 명령 exit 0 | pass | 최초 FAIL 뒤 coordinator 수명 보정 후 PASS |
| 340. B15 V2 corrupt cleanup requires explicit manual reason | [RetentionV2Final.log](RetentionV2Final.log) 15행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 341. B16 V2 continuous media with unknown UTC resolves a healthy held fd | [RetentionV2Final.log](RetentionV2Final.log) 16행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 342. B17 V2 wrong channel event and fallback collision cannot expose media | [RetentionV2Final.log](RetentionV2Final.log) 17행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 343. B18 V2 missing symlink and multiple hardlink media reject without hold leak | [RetentionV2Final.log](RetentionV2Final.log) 18행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 344. B19 V2 same size corruption and invalid container reject without hold leak | [RetentionV2Final.log](RetentionV2Final.log) 19행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 345. B20 V2 deletion and playback hold races have one safe winner | [RetentionV2Final.log](RetentionV2Final.log) 20행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 346. B21 borrowed fd inspection preserves caller ownership and detects file changes | [RetentionV2Final.log](RetentionV2Final.log) 21행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 347. B23 legacy store port refuses unsupported V2 deletion | [RetentionV2Final.log](RetentionV2Final.log) 22행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 348. B22 V2 playback is unavailable without GStreamer | [RetentionV2Final.log](RetentionV2Final.log) 24행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 349. B23 legacy store port refuses unsupported V2 deletion | [RetentionV2Final.log](RetentionV2Final.log) 25행, 해당 명령 exit 0 | pass | 최종 유효 실행 |

## 실행 소유 임시물 정리 전수

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-jobs.8xXx46 | 격리 fixture/바이너리/DB/원장 | 3740328 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [BoundaryGreenIntentRed.log](BoundaryGreenIntentRed.log) |
| /tmp/media_server_v410_recording_catalog-94801 | 격리 fixture/바이너리/DB/원장 | 25670790 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [CatalogRegression.log](CatalogRegression.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-jobs.T6XOrQ | 격리 fixture/바이너리/DB/원장 | 3697720 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [ContractBoundaryRed.log](ContractBoundaryRed.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-jobs.egYFkT | 격리 fixture/바이너리/DB/원장 | 3605944 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [ContractGreen.log](ContractGreen.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-jobs.BMXzyc | 격리 fixture/바이너리/DB/원장 | 3393912 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [ContractRed.log](ContractRed.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-jobs.sQAWhx | 격리 fixture/바이너리/DB/원장 | 8045759 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [ExtendedGreen.log](ExtendedGreen.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-jobs.NZDyAt | 격리 fixture/바이너리/DB/원장 | 8031823 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [ExtendedRed.log](ExtendedRed.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-jobs.qyKt8D | 격리 fixture/바이너리/DB/원장 | 8045759 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [FinalFocused.log](FinalFocused.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-jobs.drTdt4 | 격리 fixture/바이너리/DB/원장 | 4111166 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [GuardExpectedRed.log](GuardExpectedRed.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-jobs.hLVMHT | 격리 fixture/바이너리/DB/원장 | 4111166 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [GuardIsolatedRed.log](GuardIsolatedRed.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-jobs.MuLTjr | 격리 fixture/바이너리/DB/원장 | 4101888 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [GuardRed.log](GuardRed.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-jobs.UIvnaC | 격리 fixture/바이너리/DB/원장 | 3914261 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [IntentExpectedRed.log](IntentExpectedRed.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-jobs.SVsY7O | 격리 fixture/바이너리/DB/원장 | 4070641 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [IntentGreen.log](IntentGreen.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-jobs.Iqou5z | 격리 fixture/바이너리/DB/원장 | 3854831 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [IntentRed.log](IntentRed.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-jobs.RmM4Hw | 격리 fixture/바이너리/DB/원장 | 4098657 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [OwnerGreen.log](OwnerGreen.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-jobs.yc0BH7 | 격리 fixture/바이너리/DB/원장 | 4098129 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [OwnerRed.log](OwnerRed.log) |
| /tmp/media_server_v410_recording_retention-94879 | 격리 fixture/바이너리/DB/원장 | 3821596 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [RetentionRegression.log](RetentionRegression.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-retention-v2.ia8ZuM | 격리 fixture/바이너리/DB/원장·자체 생성 media | 8774266 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [RetentionV2Final.log](RetentionV2Final.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-retention-v2.VNEHqe | 격리 fixture/바이너리/DB/원장·자체 생성 media | 4906381 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [RetentionV2Regression.log](RetentionV2Regression.log) |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-retention-v2.gMPwzl | 격리 fixture/바이너리/DB/원장·자체 생성 media | 0 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [RetentionV2Verified.log](RetentionV2Verified.log) |

서버·port·외부 서비스·비밀 임시물은 없음. source/build 정상 산출물은 기존 build 디렉터리에 유지하며 삭제 대상이 아니다. 위 삭제 전 필요한 원출력·실제 판정·실패 이력을 저장소에 직접 보존했고 source fingerprint는 별도 목록으로 보존한다.

