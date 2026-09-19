# LP18 공유 소유 focused 개별 결과

독자: 녹화 구현·검증 담당. 수명: 이번 단기 검사의 실패/RED/GREEN 보존형 전수 결과. 정책은 AGENTS.md이며 해석은 [중앙 기록](../../../release-test-records.md)의 LP18을 따른다.
예상 RED의 assertion은 실제 FAIL로 남기며 제품 PASS로 바꾸지 않는다.

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
