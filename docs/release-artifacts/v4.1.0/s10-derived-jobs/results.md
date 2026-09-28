# S10 3C-5.3a 최종 개별 실행 결과

독자: 개발·검토 담당자. lifecycle: 이번 승인 단기 검증의 보존 증거. 중앙 정의/결과는 [release-test-records](../../../release-test-records.md), 상세 범위와 실패 이력은 [보고서](report.md)를 따른다. 동일 제목의 다른 빌드 프로파일 실행은 서로 다른 실제 실행 행이다.

제품/관련 회귀 최종 assertion 행 349개이며 build·diffcheck·원출력 보존/정리 검사는 별개다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1. J01 실제 선택→compact 내구 job 계약 왕복 | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) 1행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 2. J17 무관source8개 추가에도 동일선택 jobID 유지 | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) 3행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 3. J18 cleanup wall시계 역행 허용·순서는상태로검사 | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) 4행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 4. J04 단일 Intent 원장·보호·예약 원자 가시성 | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) 5행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 5. J19 후발 coordinator 일반·파생 admission 및 복구 차단 | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) 6행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 6. J02 이후 시각 재Build ID 유지·선택 변경 새 ID | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) 7행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 7. J03 unknown·중복·미지원 schema·불완전 JSON·4MiB·예약 상한·미구현 state 거부 | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) 8행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 8. J16 소유 경로·attempt·order 계획 조작 거부 | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) 9행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 9. J16 실제 2 source UUID 역순이어도 영속 order 순 출력 계획 | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) 10행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 10. J08 나중 시각 재요청 최초 시각 유지·예약/경로 충돌·다른 catalog 거부 | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) 11행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 11. J06 generic hold 감소로 job 보호 해제 불가·직접 삭제/corrupt 차단 | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) 12행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 12. J14 cleanup Failed는 job 자원만 해제·wall 역행·terminal 자동 재시도 없음 | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) 13행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 13. J05 pending·corrupt·tombstone·hash·binding 불일치 source 거부 | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) 19행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 14. J07 실제 source 삭제/Intent 경쟁에서 둘 중 한 전이만 허용 | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) 20행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 15. J10 checkpoint 전후 job·보호·예약 유지 | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) 21행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 16. J09 SQLite·fallback·재build/reopen 내구 job 동등·중복 보호 가산 없음 | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) 22행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 17. J10 replay 동일 중복 멱등·다른 내용/불완전/schema/전이/보호 상태 거부 | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) 29행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 18. J11 같은 채널 memory+동시 durable 예약 합계 event quota 제한 | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) 30행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 19. J12 durable outstanding을 continuous/event/derived disk 예약에 포함 | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) 31행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 20. J13 snapshot/disk provider 실패는 생성·periodic·복구 삭제 차단 | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) 32행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 21. J15 partial unknown·이유·후보·요청 시간축 그대로 보존 | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) 33행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 22. J19 정확한 소유자 소멸 후 새 coordinator만 재결박 | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) 34행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 23. J20 append 거부 후 원장 복원해도 공통 mutation 차단 | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) 35행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 24. journal open:  | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 1행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 25. fallback catalog open:  | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 2행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 26. SQLite off mode 표시 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 3행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 27. segment finalize journal+projection:  | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 4행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 28. fallback range query | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 5행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 29. event link FK 위반 거부 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 6행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 30. FK 위반 transaction/journal 전체 rollback | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 7행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 31. 최초 durable mutation 1개 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 8행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 32. 동일 mutation 중복 append | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 9행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 33. 손상 사이 정상 durable mutation 보존 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 10행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 34. 중간 corrupt line count | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 11행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 35. 마지막 truncated line skip | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 12행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 36. fallback replay open | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 13행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 37. 같은 mutation idempotent replay | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 14행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 38. 재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 15행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 39. 중복 replay row/합계 불증가 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 16행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 40. 추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구:  | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 17행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 41. writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 18행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 42. v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 19행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 43. SQLite catalog open/rebuild:  | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 20행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 44. SQLite primary mode 표시 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 21행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 45. SQLite on/off range query ID·순서 parity | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 22행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 46. journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 23행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 47. journal 없는 손상 media orphan 구분 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 24행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 48. projection failover journal open:  | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 25행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 49. projection failover catalog open:  | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 26행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 50. 실제 SQLite INSERT 실패 trigger 설치 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 27행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 51. SQLite 투영 실패 뒤 journal+memory finalize 유지:  | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 28행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 52. SQLite 투영 실패 즉시 JSONL fallback 전환 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 29행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 53. 재시작 rebuild 전 실패 trigger 제거 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 30행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 54. 투영 실패 직후 in-memory query 정합성 유지 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 31행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 55. projection failover 재시작 journal rebuild:  | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 32행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 56. 재시작 후 journal에서 누락 SQLite projection 복구 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 33행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 57. 재시작 후 SQLite primary 복귀 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 34행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 58. 재시작 journal rebuild가 실제 SQLite row 복원 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 35행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 59. tombstone journal open:  | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 36행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 60. tombstone catalog open:  | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 37행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 61. tombstone 대상 segment finalize:  | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 38행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 62. tombstone 대상 deletion request:  | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 39행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 63. tombstone 완료 기록:  | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 40행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 64. catalog finalize가 tombstone segment ID 재사용을 거부해야 함 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 41행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 65. 손상 SQLite 격리 후 journal rebuild:  | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 42행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 66. 손상 SQLite 원본 격리 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 43행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 67. 격리 SQLite 파일 보존 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 44행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 68. 격리 후 journal rebuild 결과 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 45행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 69. S10-3A future-schema journal read open | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 46행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 70. S10-3A future-schema unsupported classification | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 47행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 71. S10-3A future-schema catalog open denied | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 48행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 72. S10-3A future-schema catalog retry denied | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 49행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 73. S10-3A future-schema journal bytes preserved | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 50행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 74. S10-3A future-schema SQLite bytes preserved | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 51행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 75. S10-3A future-schema writer cleanup untouched | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 52행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 76. S10-3A arbitrary-schema journal read open | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 53행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 77. S10-3A arbitrary-schema unsupported classification | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 54행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 78. S10-3A arbitrary-schema catalog open denied | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 55행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 79. S10-3A arbitrary-schema catalog retry denied | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 56행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 80. S10-3A arbitrary-schema journal bytes preserved | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 57행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 81. S10-3A arbitrary-schema SQLite bytes preserved | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 58행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 82. S10-3A arbitrary-schema writer cleanup untouched | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 59행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 83. S10-3A empty-schema journal read open | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 60행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 84. S10-3A empty-schema unsupported classification | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 61행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 85. S10-3A empty-schema catalog open denied | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 62행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 86. S10-3A empty-schema catalog retry denied | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 63행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 87. S10-3A empty-schema journal bytes preserved | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 64행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 88. S10-3A empty-schema SQLite bytes preserved | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 65행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 89. S10-3A empty-schema writer cleanup untouched | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 66행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 90. S10-3A future-type journal read open | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 67행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 91. S10-3A future-type unsupported classification | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 68행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 92. S10-3A future-type catalog open denied | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 69행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 93. S10-3A future-type catalog retry denied | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 70행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 94. S10-3A future-type journal bytes preserved | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 71행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 95. S10-3A future-type SQLite bytes preserved | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 72행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 96. S10-3A future-type writer cleanup untouched | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 73행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 97. S10-3A malformed journal open | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 74행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 98. S10-3A malformed JSON missing fields and wrong types remain corrupt | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 75행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 99. S10-O01 reservation journal open | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 76행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 100. S10-O01 first reservation returns four IDs and sequence one | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 77행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 101. S10-O01 versioned reservation payload replays | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 78행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 102. S10-O01 new reservation records actual occurred time | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 79행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 103. S10-O02 identical retry preserves sequence and bytes | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 80행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 104. S10-O03 reopened instance allocates next sequence | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 81행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 105. S10-O03 new process resumes durable sequence | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 82행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 106. S10-O04 different store rejected | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 83행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 107. S10-O04 reused request with different segment rejected | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 84행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 108. S10-O04 reused request with different channel rejected | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 85행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 109. S10-O04 reused segment with different request rejected | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 86행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 110. S10-O04 conflicts preserve original bytes | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 87행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 111. S10-O05/O06 reject and preserve corrupt | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 88행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 112. S10-O05/O06 reject and preserve unsupported-schema | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 89행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 113. S10-O05/O06 reject and preserve unsupported-type | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 90행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 114. S10-O05/O06 reject and preserve tail | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 91행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 115. S10-O05/O06 reject and preserve payload-zero | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 92행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 116. S10-O05/O06 reject and preserve payload-negative | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 93행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 117. S10-O05/O06 reject and preserve payload-fraction | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 94행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 118. S10-O05/O06 reject and preserve payload-overflow | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 95행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 119. S10-O05/O06 reject and preserve duplicate-sequence | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 96행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 120. S10-O05/O06 reject and preserve decreasing-sequence | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 97행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 121. S10-O05/O06 reject and preserve duplicate-request | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 98행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 122. S10-O05/O06 reject and preserve duplicate-segment | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 99행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 123. S10-O05/O06 reject and preserve store-conflict | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 100행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 124. S10-O05/O06 reject and preserve ordinary-before | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 101행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 125. S10-O05/O06 reject and preserve ordinary-after | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 102행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 126. S10-O05/O06 reject and preserve line-cap | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 103행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 127. S10-O05 reservation entity envelope binding rejects mismatch | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 104행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 128. S10-O05 reservation request envelope binding rejects mismatch | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 105행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 129. S10-O01 strict reservation parser accepts versioned literal | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 106행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 130. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 107행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 131. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 108행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 132. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 109행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 133. S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 110행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 134. S10-O06 INT64_MAX identical retry remains valid | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 111행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 135. S10-O06 sequence overflow rejected without write | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 112행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 136. S10-O02 identical durable reservation duplicates remain idempotent | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 113행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 137. S10-O06 sequence gaps remain valid and allocate above maximum | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 114행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 138. S10-O07 four simultaneous processes finish reservations | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 115행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 139. S10-O07 concurrent sequences are unique and complete | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 116행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 140. S10-O07 next sequence follows concurrent reservations | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 117행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 141. S10-O08 ordinary Append cannot reserve orders | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 118행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 142. S10-O08 unopened journal rejected | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 119행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 143. S10-O08 null result rejected | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 120행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 144. S10-O08 invalid opaque ID rejected | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 121행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 145. S10-O08 failed reservation does not expose tentative result | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 122행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 146. S10-O09 unsafe file binding rejected and original preserved inode | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 123행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 147. S10-O09 unsafe file binding rejected and original preserved parent | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 124행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 148. S10-O09 unsafe file binding rejected and original preserved symlink | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 125행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 149. S10-O09 unsafe file binding rejected and original preserved hardlink | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 126행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 150. S10-O10 reservation and normal segment coexist in catalog | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 127행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 151. S10-O04 reserve then finalize permits identical retry | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 128행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 152. S10-O10 reservation survives catalog rebuild without changing segment query | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 129행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 153. S10-O04 legacy segment cannot acquire retroactive reservation | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 130행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 154. S10-M06 opened catalog accepts fresh exact reservation V2 finalize | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 131행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 155. S10-M07 V2 find preserves complete metadata | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 132행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 156. S10-M07 identical V2 recovery is idempotent | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 133행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 157. S10-M07 V2 is absent from V1 range query | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 134행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 158. S10-M07 V2 registered path is not orphan | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 135행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 159. S10-M07 SQLite exact V2 JSON and path match | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 136행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 160. S10-M07 JSONL restart preserves V2 exact payload | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 137행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 161. S10-M06 wrong reservation tuple rejected store | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 138행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 162. S10-M06 wrong reservation tuple rejected request | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 139행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 163. S10-M06 wrong reservation tuple rejected segment | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 140행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 164. S10-M06 wrong reservation tuple rejected channel | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 141행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 165. S10-M06 wrong reservation tuple rejected sequence | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 142행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 166. S10-M09 immutable V2 mapping mismatch rejected | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 143행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 167. S10-M09 bad V2 startup retry preserves original state bad-payload | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 144행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 168. S10-M09 bad V2 startup retry preserves original state missing-order | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 145행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 169. S10-M09 bad V2 startup retry preserves original state bad-order | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 146행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 170. S10-M09 bad V2 startup retry preserves original state conflicting-order | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 147행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 171. S10-M09 bad V2 startup retry preserves original state tail | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 148행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 172. S10-M09 bad V2 startup retry preserves original state corrupt | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 149행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 173. S10-M09 bad V2 startup retry preserves original state unsafe-path | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 150행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 174. S10-M09 default off rejects V2 before SQLite changes | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 151행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 175. S10-M09 V2 replay namespace and deletion duplicate | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 152행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 176. S10-M09 V2 replay namespace and deletion deleted | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 153행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 177. S10-M09 V2 replay namespace and deletion v1-before | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 154행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 178. S10-M09 V2 replay namespace and deletion v1-after | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 155행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 179. S10-M09 V2 replay namespace and deletion deleted-before | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 156행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 180. S10-M09 V2 replay namespace and deletion resurrection | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 157행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 181. S10-M09 V2 replay namespace and deletion mutation-collision | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 158행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 182. S10-M09 V2 finalize rejects missing media | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 159행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 183. S10-M09 V2 finalize rejects directory media | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 160행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 184. S10-M09 fresh candidate rejects mapping | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 161행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 185. S10-M09 fresh candidate rejects path | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 162행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 186. S10-M09 fresh candidate rejects tombstone | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 163행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 187. S10-SW01 managed empty root opens with lifetime lease | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 164행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 188. S10-SW02 same process second managed owner denied | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 165행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 189. S10-SW03 different process owner and inherited use denied | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 166행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 190. S10-SW12 managed duplicate descriptors are close-on-exec | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 167행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 191. S10-SW05 managed reserve append replay use owned descriptor | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 168행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 192. S10-SW06 raw managed access and legacy default path denied | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 169행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 193. S10-SW01 managed Reserve rejects different store identity | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 170행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 194. S10-SW10 catalog connection can inspect managed lease | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 171행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 195. S10-SW04 owner destruction releases lease | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 172행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 196. S10-SW01 managed reopen rejects different store identity | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 173행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 197. S10-SW11 managed incomplete tail rejects append without changing bytes | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 174행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 198. S10-SW07 legacy nonempty root preserved without conversion | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 175행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 199. S10-SW08 partial initialization retry validates exact state lease | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 176행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 200. S10-SW08 partial initialization retry validates exact state init | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 177행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 201. S10-SW08 partial initialization retry validates exact state barrier | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 178행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 202. S10-SW08 partial initialization retry validates exact state journal | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 179행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 203. S10-SW08 partial initialization retry validates exact state incomplete | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 180행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 204. S10-SW08 partial initialization retry validates exact state unknown | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 181행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 205. S10-SW09 symlink inode and malformed marker rejected journal | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 182행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 206. S10-SW09 symlink inode and malformed marker rejected marker | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 183행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 207. S10-SW09 symlink inode and malformed marker rejected barrier | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 184행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 208. S10-SW09 symlink inode and malformed marker rejected root-symlink | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 185행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 209. S10-SB01 second managed catalog is denied | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 186행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 210. S10-SB02 failed catalog cannot mutate journal or holds | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 187행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 211. S10-SB03 attached catalog blocks unowned append but permits reservation | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 188행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 212. S10-SB04 catalog destruction releases attachment | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 189행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 213. S10-SB05 managed catalog rejects unsafe options outside | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 190행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 214. S10-SB05 managed catalog rejects unsafe options dotdot | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 191행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 215. S10-SB05 managed catalog rejects unsafe options media-symlink | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 192행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 216. S10-SB05 managed catalog rejects unsafe options sqlite-symlink | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 193행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 217. S10-SB05 managed catalog rejects unsafe options sqlite-hardlink | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 194행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 218. S10-SB05 managed catalog rejects unsafe options disabled | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 195행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 219. S10-SB06 failed open releases catalog attachment | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 196행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 220. S10-SB07 managed SQLite sidecar rejected -wal symlink | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 197행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 221. S10-SB07 managed SQLite sidecar rejected -wal hardlink | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 198행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 222. S10-SB07 managed SQLite sidecar rejected -shm symlink | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 199행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 223. S10-SB07 managed SQLite sidecar rejected -shm hardlink | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 200행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 224. S10-SB07 managed SQLite sidecar rejected -journal symlink | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 201행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 225. S10-SB07 managed SQLite sidecar rejected -journal hardlink | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 202행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 226. S10-SC01 managed repeated event fixture is valid | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 203행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 227. S10-SC02 managed reservations avoid history reads | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 204행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 228. S10-SC03 managed V2 finalize avoids full replay | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 205행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 229. S10-SC04 checkpoint reduces superseded event payload bytes | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 206행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 230. S10-SC05 checkpoint preserves latest event and all record identities | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 207행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 231. S10-SC06 checkpoint is idempotent and preserves V2 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 208행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 232. S10-SC08 receipt preserves retry identity and rejects direct append | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 209행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 233. S10-SC09 checkpoint restart preserves SQLite and JSONL state sqlite | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 210행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 234. S10-SC09 managed checkpoint SQL V2 payload and path | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 211행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 235. S10-SC09 checkpoint restart preserves SQLite and JSONL state jsonl | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 212행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 236. S10-SC10 checkpoint prefix recovers before writes | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 213행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 237. S10-SC11 checkpoint mismatch preserves bytes and poisons owner | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 214행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 238. S10-SC12 first accepted mutation controls latest event | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 215행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 239. S10-SC16 automatic checkpoint uses accumulated growth | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 216행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 240. S10-SC07 raw checkpoint is rejected | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 217행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 241. S10-SC18 checkpoint syscall failure poisons and reopens write | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 218행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 242. S10-SC21 poison rejects hold mutation write | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 219행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 243. S10-SC18 checkpoint syscall failure poisons and reopens file-fsync | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 220행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 244. S10-SC21 poison rejects hold mutation file-fsync | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 221행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 245. S10-SC18 checkpoint syscall failure poisons and reopens rename | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 222행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 246. S10-SC21 poison rejects hold mutation rename | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 223행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 247. S10-SC18 checkpoint syscall failure poisons and reopens dir-fsync | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 224행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 248. S10-SC21 poison rejects hold mutation dir-fsync | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 225행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 249. S10-SC17 checkpoint preserves holds observations and deletion | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 226행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 250. S10-SC17 checkpoint SQL hold observation tombstone | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 227행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 251. S10-SC17 checkpoint preserves holds observations and deletion restart sqlite | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 228행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 252. S10-SC17 checkpoint SQL restart observation tombstone | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 229행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 253. S10-SC17 checkpoint preserves holds observations and deletion restart jsonl | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 230행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 254. S10-SC19 invalid managed history remains unchanged malformed | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 231행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 255. S10-SC19 invalid managed history remains unchanged unsupported | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 232행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 256. S10-SC19 invalid managed history remains unchanged conflict | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 233행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 257. S10-SC20 raw catalog rejects receipt before side effects | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 234행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 258. S10-SC13 crypto off raw remains usable | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 236행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 259. S10-SC14 crypto off checkpoint is rejected | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 237행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 260. S10-SC15 crypto off receipt reopen is rejected | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 238행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 261. source 저장 callback reconcile 연결 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 239행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 262. policy revision idempotency | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 240행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 263. 5초 safety reconcile | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 241행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 264. composition root journal 선행 open | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 242행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 265. composition root catalog rebuild/open | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 243행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 266. 서버 전 supervisor 시작 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 244행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 267. ingress 전 event bridge 등록 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 245행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 268. ingress 종료 뒤 recorder finalize | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 246행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 269. composition root 시작/종료 순서 | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) 247행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 270. continuous quota는 end_utc_ms, segment_id oldest-first | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 1행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 271. continuous/event quota가 자기 등급 artifact만 선택 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 2행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 272. continuous/event 보존 기간을 독립적으로 적용 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 3행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 273. continuous 보존 기간은 event와 독립적으로 적용 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 4행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 274. event 보존 기간은 continuous와 독립적으로 적용 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 5행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 275. 새 segment 예상 용량까지 continuous quota에 선반영 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 6행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 276. pinned event와 hold_count>0 continuous 자동 삭제 제외 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 7행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 277. disk reserve 부족은 eligible continuous부터 정리 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 8행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 278. journal 실패 시 media unlink와 tombstone 중단 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 9행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 279. unlink 실패는 deletion_pending 유지, 회수 byte 0 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 10행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 280. tombstone journal 실패는 pending으로 남겨 다음 tick 복구 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 11행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 281. channel retention policy 등록:  | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 12행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 282. 삭제 불가 시 해당 channel writer만 storage-blocked | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 13행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 283. 공간 회복 뒤 새 keyframe용 epoch 재발급 신호 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 14행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 284. 다중 channel reserve policy 등록 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 15행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 285. 동시 channel admission이 물리 여유 공간을 중복 예약하지 않음 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 16행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 286. segment finalize 후 in-flight reserve 반환으로 다른 channel 재개 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 17행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 287. segment hard bound policy 등록 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 18행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 288. 최소 packet보다 작은 continuous quota는 쓰기 전에 차단 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 19행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 289. 진행량 정산 policy 등록 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 20행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 290. 물리 free에 반영된 partial 쓰기량은 예약에서 이중 차감하지 않음 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 21행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 291. 실제 동시 admission policy 등록 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 22행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 292. 두 실제 thread의 동시 admission 중 하나만 reserve 획득 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 23행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 293. cleanup 미해결 reservation policy 등록 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 24행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 294. cleanup 미해결 channel 재활성화 policy 등록 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 25행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 295. 정책 비활성·재활성 뒤에도 미해결 파일 reservation을 유지해 fail-closed | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 26행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 296. stale free-space policy 등록 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 27행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 297. unlink 뒤에도 filesystem 여유 공간이 부족하면 회수량을 추정해 허용하지 않음 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 28행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 298. 통합 journal open:  | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 29행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 299. 통합 catalog open:  | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 30행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 300. 통합 segment finalize:  | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 31행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 301. tombstone은 남고 media path와 원본 bytes는 제거 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 32행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 302. hold overflow segment finalize:  | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 33행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 303. hold_count int64 최댓값 저장:  | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 34행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 304. hold_count int64 오버플로 거부 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 35행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 305. hold race segment finalize:  | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 36행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 306. hold_count 획득:  | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 37행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 307. 계획 뒤 획득된 hold도 삭제 transition에서 재검증 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 38행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 308. pending recovery segment finalize:  | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 39행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 309. pending recovery 삭제 요청:  | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 40행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 310. pending recovery media 사전 제거 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 41행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 311. unlink 뒤 tombstone 실패 상태를 다음 tick에서 idempotent 재완료 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 42행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 312. pending 복구 격리 policy 등록 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 43행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 313. 한 channel의 pending 복구 실패가 다른 channel admission/tick을 차단하지 않음 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 44행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 314. 정책이 없거나 비활성인 channel의 pending도 주기적으로 tombstone 완료 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 45행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 315. event 압력 독립 policy 등록 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 46행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 316. event 예상 회수량을 제외하고 continuous만으로 reserve와 admission 처리 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 47행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 317. malicious journal open:  | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 48행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 318. malicious mutation append:  | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 49행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 319. malicious catalog open:  | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 50행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 320. journal mediaRelpath가 root 밖이면 retention 후보에서 격리 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 51행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 321. unlink 직전 symlink 전환 준비 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 52행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 322. unlink 직전 root 밖 symlink 생성 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 53행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 323. journal 이후 unlink 직전 canonical root containment 재검증 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 54행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 324. dirfd에 결박된 unlink는 검증 뒤 상위 경로 교체에도 외부 파일을 보호 | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 55행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 325. storage root가 비어 있으면 안전 unlink를 fail-closed | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) 56행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 326. B01 V2 tombstone preserves immutable segment without legacy UTC range | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 1행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 327. B02 V2 state records reject malformed payload entity and duplicate conflicts | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 2행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 328. B03 V2 pending corrupt and deleted overlays never mutate finalized payload | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 3행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 329. B04 V2 invalid transitions and finalize retries cannot resurrect state | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 4행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 330. B05 V2 checkpoint and restart preserve overlay tombstone and SQLite parity | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 5행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 331. B06 V2 capacity deletion follows durable order despite reversed UTC | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 6행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 332. B07 mixed legacy and multiple stores use deterministic nonchronological ordering | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 7행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 333. B08 V2 age expiry uses all known mapping ends plus uncertainty rounded upward | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 8행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 334. B09 V2 unknown or overflowing age remains capacity eligible | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 9행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 335. B10 V2 class quotas and disk reserve remain separated | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 10행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 336. B11 V2 pin and hold protect deletion and corruption | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 11행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 337. B12 V2 pending and corrupt bytes remain charged but are not automatic victims | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 12행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 338. B13 V2 apply persists pending before unlink and tombstone after unlink | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 13행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 339. B14 V2 interrupted deletion recovers without resurrection | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 14행, 해당 명령 exit 0 | pass | 최초 FAIL 뒤 coordinator 수명 보정 후 PASS |
| 340. B15 V2 corrupt cleanup requires explicit manual reason | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 15행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 341. B16 V2 continuous media with unknown UTC resolves a healthy held fd | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 16행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 342. B17 V2 wrong channel event and fallback collision cannot expose media | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 17행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 343. B18 V2 missing symlink and multiple hardlink media reject without hold leak | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 18행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 344. B19 V2 same size corruption and invalid container reject without hold leak | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 19행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 345. B20 V2 deletion and playback hold races have one safe winner | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 20행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 346. B21 borrowed fd inspection preserves caller ownership and detects file changes | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 21행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 347. B23 legacy store port refuses unsupported V2 deletion | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 22행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 348. B22 V2 playback is unavailable without GStreamer | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 24행, 해당 명령 exit 0 | pass | 최종 유효 실행 |
| 349. B23 legacy store port refuses unsupported V2 deletion | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) 25행, 해당 명령 exit 0 | pass | 최종 유효 실행 |

## 실행 소유 임시물 정리 전수

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| <owned-temp>/media-server-derived-jobs.8xXx46 | 격리 fixture/바이너리/DB/원장 | 3740328 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [BoundaryGreenIntentRed.log](public-evidence-c8ad79129a5eb6b4.txt) |
| /tmp/media_server_v410_recording_catalog-94801 | 격리 fixture/바이너리/DB/원장 | 25670790 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [CatalogRegression.log](public-evidence-4bd3d878d17b70ef.txt) |
| <owned-temp>/media-server-derived-jobs.T6XOrQ | 격리 fixture/바이너리/DB/원장 | 3697720 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [ContractBoundaryRed.log](public-evidence-1a7c1fe05478b0ba.txt) |
| <owned-temp>/media-server-derived-jobs.egYFkT | 격리 fixture/바이너리/DB/원장 | 3605944 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [ContractGreen.log](public-evidence-23e8e5c0d7d42996.txt) |
| <owned-temp>/media-server-derived-jobs.BMXzyc | 격리 fixture/바이너리/DB/원장 | 3393912 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [ContractRed.log](public-evidence-07e46803f14495fe.txt) |
| <owned-temp>/media-server-derived-jobs.sQAWhx | 격리 fixture/바이너리/DB/원장 | 8045759 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [ExtendedGreen.log](public-evidence-4a8ac1d0937f8d1f.txt) |
| <owned-temp>/media-server-derived-jobs.NZDyAt | 격리 fixture/바이너리/DB/원장 | 8031823 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [ExtendedRed.log](public-evidence-7913058a9e426e12.txt) |
| <owned-temp>/media-server-derived-jobs.qyKt8D | 격리 fixture/바이너리/DB/원장 | 8045759 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [FinalFocused.log](public-evidence-71b5559d9310be45.txt) |
| <owned-temp>/media-server-derived-jobs.drTdt4 | 격리 fixture/바이너리/DB/원장 | 4111166 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [GuardExpectedRed.log](public-evidence-b5f13bbfe81b1620.txt) |
| <owned-temp>/media-server-derived-jobs.hLVMHT | 격리 fixture/바이너리/DB/원장 | 4111166 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [GuardIsolatedRed.log](public-evidence-be20b40f9e31ed43.txt) |
| <owned-temp>/media-server-derived-jobs.MuLTjr | 격리 fixture/바이너리/DB/원장 | 4101888 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [GuardRed.log](public-evidence-634f32d6f6e95f40.txt) |
| <owned-temp>/media-server-derived-jobs.UIvnaC | 격리 fixture/바이너리/DB/원장 | 3914261 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [IntentExpectedRed.log](public-evidence-481e1b8ee50a7c8c.txt) |
| <owned-temp>/media-server-derived-jobs.SVsY7O | 격리 fixture/바이너리/DB/원장 | 4070641 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [IntentGreen.log](public-evidence-c311f9d8051e4167.txt) |
| <owned-temp>/media-server-derived-jobs.Iqou5z | 격리 fixture/바이너리/DB/원장 | 3854831 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [IntentRed.log](public-evidence-f6e34d55bd751cb9.txt) |
| <owned-temp>/media-server-derived-jobs.RmM4Hw | 격리 fixture/바이너리/DB/원장 | 4098657 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [OwnerGreen.log](public-evidence-5fd121e41f93d4d8.txt) |
| <owned-temp>/media-server-derived-jobs.yc0BH7 | 격리 fixture/바이너리/DB/원장 | 4098129 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [OwnerRed.log](public-evidence-9d31166027e074e7.txt) |
| /tmp/media_server_v410_recording_retention-94879 | 격리 fixture/바이너리/DB/원장 | 3821596 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [RetentionRegression.log](public-evidence-e1458a05b740d50b.txt) |
| <owned-temp>/media-server-retention-v2.ia8ZuM | 격리 fixture/바이너리/DB/원장·자체 생성 media | 8774266 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [RetentionV2Final.log](public-evidence-78603d1835f7f0f2.txt) |
| <owned-temp>/media-server-retention-v2.VNEHqe | 격리 fixture/바이너리/DB/원장·자체 생성 media | 4906381 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [RetentionV2Regression.log](public-evidence-86df4f29285b3bee.txt) |
| <owned-temp>/media-server-retention-v2.gMPwzl | 격리 fixture/바이너리/DB/원장·자체 생성 media | 0 bytes | runner 소유 root 삭제 | removed=true, 최종 부재=true | [RetentionV2Verified.log](public-evidence-29ec041fb2c15d11.txt) |

서버·port·외부 서비스·비밀 임시물은 없음. source/build 정상 산출물은 기존 build 디렉터리에 유지하며 삭제 대상이 아니다. 위 삭제 전 필요한 원출력·실제 판정·실패 이력을 저장소에 직접 보존했고 source fingerprint는 별도 목록으로 보존한다.

