# 3D-3 B 전수 실행 행

독자는 구현·검토 담당자다. 현재 정책이 아닌 실행 보존 증적이며 중앙 결과 기록에서 연결한다.
원출력의 개별 assertion/등록기/정식 ID 판정을 추출했다. summary는 중복 합산하지 않는다.
최종 focused38, 구성 self-test22, 직접 영향 회귀657, 등록기35, 정식 ID 결과27을 구분한다.
정리 결과는 B-cleanup 표에 보존한다. 실제 브라우저/HTTP/장시간 결과가 아니다.

## Regression-FinalFocused

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [pass] D3B-01 actual V2 원본·문자열 UTC·독립 unplaced 응답 | PASS | [B-Regression-FinalFocused.log:1](B-Regression-FinalFocused.log) |
| 2 | [pass] D3B-14 mismatch/nonintegral mapping은 unplaced | PASS | [B-Regression-FinalFocused.log:2](B-Regression-FinalFocused.log) |
| 3 | [pass] D3B-14 mismatch/nonintegral mapping은 unplaced | PASS | [B-Regression-FinalFocused.log:3](B-Regression-FinalFocused.log) |
| 4 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-Regression-FinalFocused.log:4](B-Regression-FinalFocused.log) |
| 5 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-Regression-FinalFocused.log:5](B-Regression-FinalFocused.log) |
| 6 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-Regression-FinalFocused.log:6](B-Regression-FinalFocused.log) |
| 7 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-Regression-FinalFocused.log:7](B-Regression-FinalFocused.log) |
| 8 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-Regression-FinalFocused.log:8](B-Regression-FinalFocused.log) |
| 9 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-Regression-FinalFocused.log:9](B-Regression-FinalFocused.log) |
| 10 | [pass] D3B-02 권한 거부403 | PASS | [B-Regression-FinalFocused.log:10](B-Regression-FinalFocused.log) |
| 11 | [pass] D3B-13 Intent placeholder no file/null time | PASS | [B-Regression-FinalFocused.log:11](B-Regression-FinalFocused.log) |
| 12 | [pass] D3B-13 accepted/no-job 상태 보존 | PASS | [B-Regression-FinalFocused.log:12](B-Regression-FinalFocused.log) |
| 13 | [pass] D3B-05 Ready 출력 시간과 재생불가 분리 | PASS | [B-Regression-FinalFocused.log:13](B-Regression-FinalFocused.log) |
| 14 | [pass] D3B-05 Committed 출력 시간과 재생불가 분리 | PASS | [B-Regression-FinalFocused.log:14](B-Regression-FinalFocused.log) |
| 15 | [pass] D3B-05 실제 검증된 파생2출력 시간/파일 독립 | PASS | [B-Regression-FinalFocused.log:15](B-Regression-FinalFocused.log) |
| 16 | [pass] D3B-07 같은 UTC 다른 segment/epoch는 원본 숨김 없음 | PASS | [B-Regression-FinalFocused.log:16](B-Regression-FinalFocused.log) |
| 17 | [pass] D3B-13 출력 생성 뒤 job placeholder 없음 | PASS | [B-Regression-FinalFocused.log:17](B-Regression-FinalFocused.log) |
| 18 | [pass] D3B-07 page 밖 이벤트도 원본 전체 충족 판정 | PASS | [B-Regression-FinalFocused.log:18](B-Regression-FinalFocused.log) |
| 19 | [pass] D3B-06 일부 중첩 원본은 보존 | PASS | [B-Regression-FinalFocused.log:19](B-Regression-FinalFocused.log) |
| 20 | [pass] D3B-04 재조회 stable itemId/order | PASS | [B-Regression-FinalFocused.log:20](B-Regression-FinalFocused.log) |
| 21 | [pass] D3B-12 요청축/문자열/공개 whitelist | PASS | [B-Regression-FinalFocused.log:21](B-Regression-FinalFocused.log) |
| 22 | [pass] D3B-08 동일 size 변조 출력은 비재생 | PASS | [B-Regression-FinalFocused.log:22](B-Regression-FinalFocused.log) |
| 23 | [pass] D3B-08 파일 누락 Complete와 재생불가/숨김 분리 | PASS | [B-Regression-FinalFocused.log:23](B-Regression-FinalFocused.log) |
| 24 | [pass] D3B-08 실제 tombstone 출력 deleted 보존 | PASS | [B-Regression-FinalFocused.log:24](B-Regression-FinalFocused.log) |
| 25 | [pass] D3B-09 source tombstone 뒤 durable UTC 투영 | PASS | [B-Regression-FinalFocused.log:25](B-Regression-FinalFocused.log) |
| 26 | [pass] D3B-05 partial 요청 실제 출력 jobComplete | PASS | [B-Regression-FinalFocused.log:26](B-Regression-FinalFocused.log) |
| 27 | [pass] D3B-14 actual 출력 mismatch mapping은 unplaced·partial 파일 제공 분리 | PASS | [B-Regression-FinalFocused.log:27](B-Regression-FinalFocused.log) |
| 28 | [pass] D3B-13 Failed placeholder no file/null time | PASS | [B-Regression-FinalFocused.log:28](B-Regression-FinalFocused.log) |
| 29 | [pass] D3B-03/04 UTC0와 same-file 다중 mapping 독립 ID | PASS | [B-Regression-FinalFocused.log:29](B-Regression-FinalFocused.log) |
| 30 | [pass] D3B-03 int64 최대 UTC ns 문자열 정밀도 | PASS | [B-Regression-FinalFocused.log:30](B-Regression-FinalFocused.log) |
| 31 | [pass] D3B-11 관련 없는 known4352 누적은 짧은 질의 허용 | PASS | [B-Regression-FinalFocused.log:31](B-Regression-FinalFocused.log) |
| 32 | [pass] D3B-11 실제 관련4352 상한 명시 실패 | PASS | [B-Regression-FinalFocused.log:32](B-Regression-FinalFocused.log) |
| 33 | [pass] D3B-02/11 관련 상한503 | PASS | [B-Regression-FinalFocused.log:33](B-Regression-FinalFocused.log) |
| 34 | [pass] D3B-10/11 unknown4354 count와 bounded 첫 페이지 | PASS | [B-Regression-FinalFocused.log:34](B-Regression-FinalFocused.log) |
| 35 | [pass] D3B-10 known/unplaced 독립 동일 offset 페이지 | PASS | [B-Regression-FinalFocused.log:35](B-Regression-FinalFocused.log) |
| 36 | [pass] D3B-11 offset+limit overflow 명시 실패 | PASS | [B-Regression-FinalFocused.log:36](B-Regression-FinalFocused.log) |
| 37 | [pass] D3B-11 전체 unknown deep-copy 없이35074 첫 페이지 허용 | PASS | [B-Regression-FinalFocused.log:37](B-Regression-FinalFocused.log) |
| 38 | [pass] D3B-11 deep offset64MiB workspace 초과는 결과 없이 명시 실패 | PASS | [B-Regression-FinalFocused.log:38](B-Regression-FinalFocused.log) |

## Regression-LegacyTimeline

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [pass] V410-S06-I03 catalog timeline item 반환 | PASS | [B-Regression-LegacyTimeline.log:1](B-Regression-LegacyTimeline.log) |
| 2 | [pass] I09 opaque 재생 URL | PASS | [B-Regression-LegacyTimeline.log:2](B-Regression-LegacyTimeline.log) |
| 3 | [pass] I03 끝 경계 인접 제외 | PASS | [B-Regression-LegacyTimeline.log:3](B-Regression-LegacyTimeline.log) |
| 4 | [pass] I03 다른 채널 제외 | PASS | [B-Regression-LegacyTimeline.log:4](B-Regression-LegacyTimeline.log) |
| 5 | [pass] I04 음수 시간 거부 | PASS | [B-Regression-LegacyTimeline.log:5](B-Regression-LegacyTimeline.log) |
| 6 | [pass] I04 역전 시간 거부 | PASS | [B-Regression-LegacyTimeline.log:6](B-Regression-LegacyTimeline.log) |
| 7 | [pass] I04 빈 페이지 제한 거부 | PASS | [B-Regression-LegacyTimeline.log:7](B-Regression-LegacyTimeline.log) |
| 8 | [pass] I04 과대 페이지 거부 | PASS | [B-Regression-LegacyTimeline.log:8](B-Regression-LegacyTimeline.log) |
| 9 | [pass] I05 큰 offset overflow 없이 빈 페이지 | PASS | [B-Regression-LegacyTimeline.log:9](B-Regression-LegacyTimeline.log) |
| 10 | [pass] I16 다른 채널 media 거부 | PASS | [B-Regression-LegacyTimeline.log:10](B-Regression-LegacyTimeline.log) |
| 11 | [pass] I17 경로형 ID 거부 | PASS | [B-Regression-LegacyTimeline.log:11](B-Regression-LegacyTimeline.log) |
| 12 | [pass] I09 fd 크기 MIME 확인 | PASS | [B-Regression-LegacyTimeline.log:12](B-Regression-LegacyTimeline.log) |
| 13 | [pass] I25 재생 hold 중 삭제 거부 | PASS | [B-Regression-LegacyTimeline.log:13](B-Regression-LegacyTimeline.log) |
| 14 | [pass] I19 경로 교체 뒤 열린 fd 기존 byte 유지 | PASS | [B-Regression-LegacyTimeline.log:14](B-Regression-LegacyTimeline.log) |
| 15 | [pass] I18 leaf symlink 거부 | PASS | [B-Regression-LegacyTimeline.log:15](B-Regression-LegacyTimeline.log) |
| 16 | [pass] I09 누락 파일 거부 | PASS | [B-Regression-LegacyTimeline.log:16](B-Regression-LegacyTimeline.log) |
| 17 | [pass] I09 크기 불일치 거부 | PASS | [B-Regression-LegacyTimeline.log:17](B-Regression-LegacyTimeline.log) |
| 18 | [pass] I09 비일반 파일 거부 | PASS | [B-Regression-LegacyTimeline.log:18](B-Regression-LegacyTimeline.log) |
| 19 | [pass] I06 같은 시간 event 우선 | PASS | [B-Regression-LegacyTimeline.log:19](B-Regression-LegacyTimeline.log) |
| 20 | [pass] I07 정확한 이벤트 ID 연결 | PASS | [B-Regression-LegacyTimeline.log:20](B-Regression-LegacyTimeline.log) |
| 21 | [pass] I10 실제 범위와 요청 범위 분리 | PASS | [B-Regression-LegacyTimeline.log:21](B-Regression-LegacyTimeline.log) |
| 22 | [pass] I05 정렬 뒤 페이지 적용 | PASS | [B-Regression-LegacyTimeline.log:22](B-Regression-LegacyTimeline.log) |
| 23 | [pass] I25 모든 실패 경로 hold 반환 후 삭제 허용 | PASS | [B-Regression-LegacyTimeline.log:23](B-Regression-LegacyTimeline.log) |
| 24 | [pass] I08 deletion pending 거부 | PASS | [B-Regression-LegacyTimeline.log:24](B-Regression-LegacyTimeline.log) |
| 25 | [pass] I08 pending timeline 재생 불가 | PASS | [B-Regression-LegacyTimeline.log:25](B-Regression-LegacyTimeline.log) |
| 26 | [pass] I11 검증한 fallback 영상 fd 제공 | PASS | [B-Regression-LegacyTimeline.log:26](B-Regression-LegacyTimeline.log) |
| 27 | [pass] I11 JSON이 아닌 실제 media byte 반환 | PASS | [B-Regression-LegacyTimeline.log:27](B-Regression-LegacyTimeline.log) |
| 28 | [pass] I11 fallback timeline을 complete로 과장하지 않음 | PASS | [B-Regression-LegacyTimeline.log:28](B-Regression-LegacyTimeline.log) |
| 29 | [pass] I11 중복 key manifest 거부 | PASS | [B-Regression-LegacyTimeline.log:29](B-Regression-LegacyTimeline.log) |
| 30 | [pass] I11 event 바인딩 불일치 거부 | PASS | [B-Regression-LegacyTimeline.log:30](B-Regression-LegacyTimeline.log) |
| 31 | [pass] I11 byteSize 문자열 타입 거부 | PASS | [B-Regression-LegacyTimeline.log:31](B-Regression-LegacyTimeline.log) |
| 32 | [pass] I11 64KiB 초과 manifest 거부 | PASS | [B-Regression-LegacyTimeline.log:32](B-Regression-LegacyTimeline.log) |
| 33 | [pass] I18 fallback media symlink 거부 | PASS | [B-Regression-LegacyTimeline.log:33](B-Regression-LegacyTimeline.log) |
| 34 | [pass] I09 fallback media 크기 불일치 거부 | PASS | [B-Regression-LegacyTimeline.log:34](B-Regression-LegacyTimeline.log) |
| 35 | [pass] I19 fallback 교체 뒤 기존 fd byte 유지 | PASS | [B-Regression-LegacyTimeline.log:35](B-Regression-LegacyTimeline.log) |
| 36 | [pass] I17 다른 채널 fallback ID 충돌도 거부 | PASS | [B-Regression-LegacyTimeline.log:36](B-Regression-LegacyTimeline.log) |
| 37 | [pass] I03 기존 숫자형 channel ID 유지 | PASS | [B-Regression-LegacyTimeline.log:37](B-Regression-LegacyTimeline.log) |
| 38 | [pass] I08/I17 삭제 완료 ID의 fallback 재사용 거부 | PASS | [B-Regression-LegacyTimeline.log:38](B-Regression-LegacyTimeline.log) |
| 39 | [pass] I20 closed Range 시작과 길이 | PASS | [B-Regression-LegacyTimeline.log:39](B-Regression-LegacyTimeline.log) |
| 40 | [pass] I26 열린 gate 신규 요청 admission | PASS | [B-Regression-LegacyTimeline.log:40](B-Regression-LegacyTimeline.log) |
| 41 | [pass] I26 닫힌 gate 신규 요청 거부 | PASS | [B-Regression-LegacyTimeline.log:41](B-Regression-LegacyTimeline.log) |
| 42 | [pass] I26 active flight 이전 drain 완료 금지 | PASS | [B-Regression-LegacyTimeline.log:42](B-Regression-LegacyTimeline.log) |
| 43 | [pass] I26 마지막 flight 해제 뒤 drain 완료 | PASS | [B-Regression-LegacyTimeline.log:43](B-Regression-LegacyTimeline.log) |
| 44 | [pass] I26 활성 socket shutdown 확인 | PASS | [B-Regression-LegacyTimeline.log:44](B-Regression-LegacyTimeline.log) |
| 45 | [pass] I25 동시 삭제 경쟁 0 | PASS | [B-Regression-LegacyTimeline.log:45](B-Regression-LegacyTimeline.log) |
| 46 | [pass] I26 경쟁 뒤 fd 반환 0 | PASS | [B-Regression-LegacyTimeline.log:46](B-Regression-LegacyTimeline.log) |
| 47 | [pass] I25 동시 삭제 경쟁 1 | PASS | [B-Regression-LegacyTimeline.log:47](B-Regression-LegacyTimeline.log) |
| 48 | [pass] I26 경쟁 뒤 fd 반환 1 | PASS | [B-Regression-LegacyTimeline.log:48](B-Regression-LegacyTimeline.log) |
| 49 | [pass] I25 동시 삭제 경쟁 2 | PASS | [B-Regression-LegacyTimeline.log:49](B-Regression-LegacyTimeline.log) |
| 50 | [pass] I26 경쟁 뒤 fd 반환 2 | PASS | [B-Regression-LegacyTimeline.log:50](B-Regression-LegacyTimeline.log) |
| 51 | [pass] I25 동시 삭제 경쟁 3 | PASS | [B-Regression-LegacyTimeline.log:51](B-Regression-LegacyTimeline.log) |
| 52 | [pass] I26 경쟁 뒤 fd 반환 3 | PASS | [B-Regression-LegacyTimeline.log:52](B-Regression-LegacyTimeline.log) |
| 53 | [pass] I25 동시 삭제 경쟁 4 | PASS | [B-Regression-LegacyTimeline.log:53](B-Regression-LegacyTimeline.log) |
| 54 | [pass] I26 경쟁 뒤 fd 반환 4 | PASS | [B-Regression-LegacyTimeline.log:54](B-Regression-LegacyTimeline.log) |
| 55 | [pass] I25 동시 삭제 경쟁 5 | PASS | [B-Regression-LegacyTimeline.log:55](B-Regression-LegacyTimeline.log) |
| 56 | [pass] I26 경쟁 뒤 fd 반환 5 | PASS | [B-Regression-LegacyTimeline.log:56](B-Regression-LegacyTimeline.log) |
| 57 | [pass] I25 동시 삭제 경쟁 6 | PASS | [B-Regression-LegacyTimeline.log:57](B-Regression-LegacyTimeline.log) |
| 58 | [pass] I26 경쟁 뒤 fd 반환 6 | PASS | [B-Regression-LegacyTimeline.log:58](B-Regression-LegacyTimeline.log) |
| 59 | [pass] I25 동시 삭제 경쟁 7 | PASS | [B-Regression-LegacyTimeline.log:59](B-Regression-LegacyTimeline.log) |
| 60 | [pass] I26 경쟁 뒤 fd 반환 7 | PASS | [B-Regression-LegacyTimeline.log:60](B-Regression-LegacyTimeline.log) |
| 61 | [pass] I25 동시 삭제 경쟁 8 | PASS | [B-Regression-LegacyTimeline.log:61](B-Regression-LegacyTimeline.log) |
| 62 | [pass] I26 경쟁 뒤 fd 반환 8 | PASS | [B-Regression-LegacyTimeline.log:62](B-Regression-LegacyTimeline.log) |
| 63 | [pass] I25 동시 삭제 경쟁 9 | PASS | [B-Regression-LegacyTimeline.log:63](B-Regression-LegacyTimeline.log) |
| 64 | [pass] I26 경쟁 뒤 fd 반환 9 | PASS | [B-Regression-LegacyTimeline.log:64](B-Regression-LegacyTimeline.log) |
| 65 | [pass] I25 동시 삭제 경쟁 10 | PASS | [B-Regression-LegacyTimeline.log:65](B-Regression-LegacyTimeline.log) |
| 66 | [pass] I26 경쟁 뒤 fd 반환 10 | PASS | [B-Regression-LegacyTimeline.log:66](B-Regression-LegacyTimeline.log) |
| 67 | [pass] I25 동시 삭제 경쟁 11 | PASS | [B-Regression-LegacyTimeline.log:67](B-Regression-LegacyTimeline.log) |
| 68 | [pass] I26 경쟁 뒤 fd 반환 11 | PASS | [B-Regression-LegacyTimeline.log:68](B-Regression-LegacyTimeline.log) |
| 69 | [pass] I25 동시 삭제 경쟁 12 | PASS | [B-Regression-LegacyTimeline.log:69](B-Regression-LegacyTimeline.log) |
| 70 | [pass] I26 경쟁 뒤 fd 반환 12 | PASS | [B-Regression-LegacyTimeline.log:70](B-Regression-LegacyTimeline.log) |
| 71 | [pass] I25 동시 삭제 경쟁 13 | PASS | [B-Regression-LegacyTimeline.log:71](B-Regression-LegacyTimeline.log) |
| 72 | [pass] I26 경쟁 뒤 fd 반환 13 | PASS | [B-Regression-LegacyTimeline.log:72](B-Regression-LegacyTimeline.log) |
| 73 | [pass] I25 동시 삭제 경쟁 14 | PASS | [B-Regression-LegacyTimeline.log:73](B-Regression-LegacyTimeline.log) |
| 74 | [pass] I26 경쟁 뒤 fd 반환 14 | PASS | [B-Regression-LegacyTimeline.log:74](B-Regression-LegacyTimeline.log) |
| 75 | [pass] I25 동시 삭제 경쟁 15 | PASS | [B-Regression-LegacyTimeline.log:75](B-Regression-LegacyTimeline.log) |
| 76 | [pass] I26 경쟁 뒤 fd 반환 15 | PASS | [B-Regression-LegacyTimeline.log:76](B-Regression-LegacyTimeline.log) |
| 77 | [pass] I08 Writing lifecycle 재생 불가 | PASS | [B-Regression-LegacyTimeline.log:77](B-Regression-LegacyTimeline.log) |
| 78 | [pass] I08 Writing finalize 등록 거부 | PASS | [B-Regression-LegacyTimeline.log:78](B-Regression-LegacyTimeline.log) |
| 79 | [pass] I08 Writing 실제 파일 존재해도 media 거부 | PASS | [B-Regression-LegacyTimeline.log:79](B-Regression-LegacyTimeline.log) |
| 80 | [pass] I08 Writing timeline 재생 노출 없음 | PASS | [B-Regression-LegacyTimeline.log:80](B-Regression-LegacyTimeline.log) |
| 81 | [pass] I08 Corrupt 실제 catalog 전이 | PASS | [B-Regression-LegacyTimeline.log:81](B-Regression-LegacyTimeline.log) |
| 82 | [pass] I08 Corrupt 실제 파일 존재해도 media 거부 | PASS | [B-Regression-LegacyTimeline.log:82](B-Regression-LegacyTimeline.log) |
| 83 | [pass] I08 Corrupt timeline 불가 상태 | PASS | [B-Regression-LegacyTimeline.log:83](B-Regression-LegacyTimeline.log) |
| 84 | [pass] V410-S06-I03 catalog timeline item 반환 | PASS | [B-Regression-LegacyTimeline.log:84](B-Regression-LegacyTimeline.log) |
| 85 | [pass] I09 opaque 재생 URL | PASS | [B-Regression-LegacyTimeline.log:85](B-Regression-LegacyTimeline.log) |
| 86 | [pass] I03 끝 경계 인접 제외 | PASS | [B-Regression-LegacyTimeline.log:86](B-Regression-LegacyTimeline.log) |
| 87 | [pass] I03 다른 채널 제외 | PASS | [B-Regression-LegacyTimeline.log:87](B-Regression-LegacyTimeline.log) |
| 88 | [pass] I04 음수 시간 거부 | PASS | [B-Regression-LegacyTimeline.log:88](B-Regression-LegacyTimeline.log) |
| 89 | [pass] I04 역전 시간 거부 | PASS | [B-Regression-LegacyTimeline.log:89](B-Regression-LegacyTimeline.log) |
| 90 | [pass] I04 빈 페이지 제한 거부 | PASS | [B-Regression-LegacyTimeline.log:90](B-Regression-LegacyTimeline.log) |
| 91 | [pass] I04 과대 페이지 거부 | PASS | [B-Regression-LegacyTimeline.log:91](B-Regression-LegacyTimeline.log) |
| 92 | [pass] I05 큰 offset overflow 없이 빈 페이지 | PASS | [B-Regression-LegacyTimeline.log:92](B-Regression-LegacyTimeline.log) |
| 93 | [pass] I16 다른 채널 media 거부 | PASS | [B-Regression-LegacyTimeline.log:93](B-Regression-LegacyTimeline.log) |
| 94 | [pass] I17 경로형 ID 거부 | PASS | [B-Regression-LegacyTimeline.log:94](B-Regression-LegacyTimeline.log) |
| 95 | [pass] I09 fd 크기 MIME 확인 | PASS | [B-Regression-LegacyTimeline.log:95](B-Regression-LegacyTimeline.log) |
| 96 | [pass] I25 재생 hold 중 삭제 거부 | PASS | [B-Regression-LegacyTimeline.log:96](B-Regression-LegacyTimeline.log) |
| 97 | [pass] I19 경로 교체 뒤 열린 fd 기존 byte 유지 | PASS | [B-Regression-LegacyTimeline.log:97](B-Regression-LegacyTimeline.log) |
| 98 | [pass] I18 leaf symlink 거부 | PASS | [B-Regression-LegacyTimeline.log:98](B-Regression-LegacyTimeline.log) |
| 99 | [pass] I09 누락 파일 거부 | PASS | [B-Regression-LegacyTimeline.log:99](B-Regression-LegacyTimeline.log) |
| 100 | [pass] I09 크기 불일치 거부 | PASS | [B-Regression-LegacyTimeline.log:100](B-Regression-LegacyTimeline.log) |
| 101 | [pass] I09 비일반 파일 거부 | PASS | [B-Regression-LegacyTimeline.log:101](B-Regression-LegacyTimeline.log) |
| 102 | [pass] I06 같은 시간 event 우선 | PASS | [B-Regression-LegacyTimeline.log:102](B-Regression-LegacyTimeline.log) |
| 103 | [pass] I07 정확한 이벤트 ID 연결 | PASS | [B-Regression-LegacyTimeline.log:103](B-Regression-LegacyTimeline.log) |
| 104 | [pass] I10 실제 범위와 요청 범위 분리 | PASS | [B-Regression-LegacyTimeline.log:104](B-Regression-LegacyTimeline.log) |
| 105 | [pass] I05 정렬 뒤 페이지 적용 | PASS | [B-Regression-LegacyTimeline.log:105](B-Regression-LegacyTimeline.log) |
| 106 | [pass] I25 모든 실패 경로 hold 반환 후 삭제 허용 | PASS | [B-Regression-LegacyTimeline.log:106](B-Regression-LegacyTimeline.log) |
| 107 | [pass] I08 deletion pending 거부 | PASS | [B-Regression-LegacyTimeline.log:107](B-Regression-LegacyTimeline.log) |
| 108 | [pass] I08 pending timeline 재생 불가 | PASS | [B-Regression-LegacyTimeline.log:108](B-Regression-LegacyTimeline.log) |
| 109 | [pass] I11 검증한 fallback 영상 fd 제공 | PASS | [B-Regression-LegacyTimeline.log:109](B-Regression-LegacyTimeline.log) |
| 110 | [pass] I11 JSON이 아닌 실제 media byte 반환 | PASS | [B-Regression-LegacyTimeline.log:110](B-Regression-LegacyTimeline.log) |
| 111 | [pass] I11 fallback timeline을 complete로 과장하지 않음 | PASS | [B-Regression-LegacyTimeline.log:111](B-Regression-LegacyTimeline.log) |
| 112 | [pass] I11 중복 key manifest 거부 | PASS | [B-Regression-LegacyTimeline.log:112](B-Regression-LegacyTimeline.log) |
| 113 | [pass] I11 event 바인딩 불일치 거부 | PASS | [B-Regression-LegacyTimeline.log:113](B-Regression-LegacyTimeline.log) |
| 114 | [pass] I11 byteSize 문자열 타입 거부 | PASS | [B-Regression-LegacyTimeline.log:114](B-Regression-LegacyTimeline.log) |
| 115 | [pass] I11 64KiB 초과 manifest 거부 | PASS | [B-Regression-LegacyTimeline.log:115](B-Regression-LegacyTimeline.log) |
| 116 | [pass] I18 fallback media symlink 거부 | PASS | [B-Regression-LegacyTimeline.log:116](B-Regression-LegacyTimeline.log) |
| 117 | [pass] I09 fallback media 크기 불일치 거부 | PASS | [B-Regression-LegacyTimeline.log:117](B-Regression-LegacyTimeline.log) |
| 118 | [pass] I19 fallback 교체 뒤 기존 fd byte 유지 | PASS | [B-Regression-LegacyTimeline.log:118](B-Regression-LegacyTimeline.log) |
| 119 | [pass] I17 다른 채널 fallback ID 충돌도 거부 | PASS | [B-Regression-LegacyTimeline.log:119](B-Regression-LegacyTimeline.log) |
| 120 | [pass] I03 기존 숫자형 channel ID 유지 | PASS | [B-Regression-LegacyTimeline.log:120](B-Regression-LegacyTimeline.log) |
| 121 | [pass] I08/I17 삭제 완료 ID의 fallback 재사용 거부 | PASS | [B-Regression-LegacyTimeline.log:121](B-Regression-LegacyTimeline.log) |
| 122 | [pass] I20 closed Range 시작과 길이 | PASS | [B-Regression-LegacyTimeline.log:122](B-Regression-LegacyTimeline.log) |
| 123 | [pass] I26 열린 gate 신규 요청 admission | PASS | [B-Regression-LegacyTimeline.log:123](B-Regression-LegacyTimeline.log) |
| 124 | [pass] I26 닫힌 gate 신규 요청 거부 | PASS | [B-Regression-LegacyTimeline.log:124](B-Regression-LegacyTimeline.log) |
| 125 | [pass] I26 active flight 이전 drain 완료 금지 | PASS | [B-Regression-LegacyTimeline.log:125](B-Regression-LegacyTimeline.log) |
| 126 | [pass] I26 마지막 flight 해제 뒤 drain 완료 | PASS | [B-Regression-LegacyTimeline.log:126](B-Regression-LegacyTimeline.log) |
| 127 | [pass] I26 활성 socket shutdown 확인 | PASS | [B-Regression-LegacyTimeline.log:127](B-Regression-LegacyTimeline.log) |
| 128 | [pass] I25 동시 삭제 경쟁 0 | PASS | [B-Regression-LegacyTimeline.log:128](B-Regression-LegacyTimeline.log) |
| 129 | [pass] I26 경쟁 뒤 fd 반환 0 | PASS | [B-Regression-LegacyTimeline.log:129](B-Regression-LegacyTimeline.log) |
| 130 | [pass] I25 동시 삭제 경쟁 1 | PASS | [B-Regression-LegacyTimeline.log:130](B-Regression-LegacyTimeline.log) |
| 131 | [pass] I26 경쟁 뒤 fd 반환 1 | PASS | [B-Regression-LegacyTimeline.log:131](B-Regression-LegacyTimeline.log) |
| 132 | [pass] I25 동시 삭제 경쟁 2 | PASS | [B-Regression-LegacyTimeline.log:132](B-Regression-LegacyTimeline.log) |
| 133 | [pass] I26 경쟁 뒤 fd 반환 2 | PASS | [B-Regression-LegacyTimeline.log:133](B-Regression-LegacyTimeline.log) |
| 134 | [pass] I25 동시 삭제 경쟁 3 | PASS | [B-Regression-LegacyTimeline.log:134](B-Regression-LegacyTimeline.log) |
| 135 | [pass] I26 경쟁 뒤 fd 반환 3 | PASS | [B-Regression-LegacyTimeline.log:135](B-Regression-LegacyTimeline.log) |
| 136 | [pass] I25 동시 삭제 경쟁 4 | PASS | [B-Regression-LegacyTimeline.log:136](B-Regression-LegacyTimeline.log) |
| 137 | [pass] I26 경쟁 뒤 fd 반환 4 | PASS | [B-Regression-LegacyTimeline.log:137](B-Regression-LegacyTimeline.log) |
| 138 | [pass] I25 동시 삭제 경쟁 5 | PASS | [B-Regression-LegacyTimeline.log:138](B-Regression-LegacyTimeline.log) |
| 139 | [pass] I26 경쟁 뒤 fd 반환 5 | PASS | [B-Regression-LegacyTimeline.log:139](B-Regression-LegacyTimeline.log) |
| 140 | [pass] I25 동시 삭제 경쟁 6 | PASS | [B-Regression-LegacyTimeline.log:140](B-Regression-LegacyTimeline.log) |
| 141 | [pass] I26 경쟁 뒤 fd 반환 6 | PASS | [B-Regression-LegacyTimeline.log:141](B-Regression-LegacyTimeline.log) |
| 142 | [pass] I25 동시 삭제 경쟁 7 | PASS | [B-Regression-LegacyTimeline.log:142](B-Regression-LegacyTimeline.log) |
| 143 | [pass] I26 경쟁 뒤 fd 반환 7 | PASS | [B-Regression-LegacyTimeline.log:143](B-Regression-LegacyTimeline.log) |
| 144 | [pass] I25 동시 삭제 경쟁 8 | PASS | [B-Regression-LegacyTimeline.log:144](B-Regression-LegacyTimeline.log) |
| 145 | [pass] I26 경쟁 뒤 fd 반환 8 | PASS | [B-Regression-LegacyTimeline.log:145](B-Regression-LegacyTimeline.log) |
| 146 | [pass] I25 동시 삭제 경쟁 9 | PASS | [B-Regression-LegacyTimeline.log:146](B-Regression-LegacyTimeline.log) |
| 147 | [pass] I26 경쟁 뒤 fd 반환 9 | PASS | [B-Regression-LegacyTimeline.log:147](B-Regression-LegacyTimeline.log) |
| 148 | [pass] I25 동시 삭제 경쟁 10 | PASS | [B-Regression-LegacyTimeline.log:148](B-Regression-LegacyTimeline.log) |
| 149 | [pass] I26 경쟁 뒤 fd 반환 10 | PASS | [B-Regression-LegacyTimeline.log:149](B-Regression-LegacyTimeline.log) |
| 150 | [pass] I25 동시 삭제 경쟁 11 | PASS | [B-Regression-LegacyTimeline.log:150](B-Regression-LegacyTimeline.log) |
| 151 | [pass] I26 경쟁 뒤 fd 반환 11 | PASS | [B-Regression-LegacyTimeline.log:151](B-Regression-LegacyTimeline.log) |
| 152 | [pass] I25 동시 삭제 경쟁 12 | PASS | [B-Regression-LegacyTimeline.log:152](B-Regression-LegacyTimeline.log) |
| 153 | [pass] I26 경쟁 뒤 fd 반환 12 | PASS | [B-Regression-LegacyTimeline.log:153](B-Regression-LegacyTimeline.log) |
| 154 | [pass] I25 동시 삭제 경쟁 13 | PASS | [B-Regression-LegacyTimeline.log:154](B-Regression-LegacyTimeline.log) |
| 155 | [pass] I26 경쟁 뒤 fd 반환 13 | PASS | [B-Regression-LegacyTimeline.log:155](B-Regression-LegacyTimeline.log) |
| 156 | [pass] I25 동시 삭제 경쟁 14 | PASS | [B-Regression-LegacyTimeline.log:156](B-Regression-LegacyTimeline.log) |
| 157 | [pass] I26 경쟁 뒤 fd 반환 14 | PASS | [B-Regression-LegacyTimeline.log:157](B-Regression-LegacyTimeline.log) |
| 158 | [pass] I25 동시 삭제 경쟁 15 | PASS | [B-Regression-LegacyTimeline.log:158](B-Regression-LegacyTimeline.log) |
| 159 | [pass] I26 경쟁 뒤 fd 반환 15 | PASS | [B-Regression-LegacyTimeline.log:159](B-Regression-LegacyTimeline.log) |
| 160 | [pass] I08 Writing lifecycle 재생 불가 | PASS | [B-Regression-LegacyTimeline.log:160](B-Regression-LegacyTimeline.log) |
| 161 | [pass] I08 Writing finalize 등록 거부 | PASS | [B-Regression-LegacyTimeline.log:161](B-Regression-LegacyTimeline.log) |
| 162 | [pass] I08 Writing 실제 파일 존재해도 media 거부 | PASS | [B-Regression-LegacyTimeline.log:162](B-Regression-LegacyTimeline.log) |
| 163 | [pass] I08 Writing timeline 재생 노출 없음 | PASS | [B-Regression-LegacyTimeline.log:163](B-Regression-LegacyTimeline.log) |
| 164 | [pass] I08 Corrupt 실제 catalog 전이 | PASS | [B-Regression-LegacyTimeline.log:164](B-Regression-LegacyTimeline.log) |
| 165 | [pass] I08 Corrupt 실제 파일 존재해도 media 거부 | PASS | [B-Regression-LegacyTimeline.log:165](B-Regression-LegacyTimeline.log) |
| 166 | [pass] I08 Corrupt timeline 불가 상태 | PASS | [B-Regression-LegacyTimeline.log:166](B-Regression-LegacyTimeline.log) |

## Regression-Location

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [pass] LOC01 exact media location preserves identity and mapping | PASS | [B-Regression-Location.log:1](B-Regression-Location.log) |
| 2 | [pass] LOC02 unknown UTC does not discard exact media location | PASS | [B-Regression-Location.log:2](B-Regression-Location.log) |
| 3 | [pass] LOC03 UTC point returns both overlapping files | PASS | [B-Regression-Location.log:3](B-Regression-Location.log) |
| 4 | [pass] LOC04 UTC point preserves separate mappings in one file | PASS | [B-Regression-Location.log:4](B-Regression-Location.log) |
| 5 | [pass] LOC05 point lookup uses half-open bounds | PASS | [B-Regression-Location.log:5](B-Regression-Location.log) |
| 6 | [pass] LOC06 unknown mapping never extrapolates UTC | PASS | [B-Regression-Location.log:6](B-Regression-Location.log) |
| 7 | [pass] LOC07 known candidates coexist with unknown coverage | PASS | [B-Regression-Location.log:7](B-Regression-Location.log) |
| 8 | [pass] LOC08 rational conversion preserves exact non-nanosecond PTS | PASS | [B-Regression-Location.log:8](B-Regression-Location.log) |
| 9 | [pass] LOC09 fractional PTS remains unknown without rounding | PASS | [B-Regression-Location.log:9](B-Regression-Location.log) |
| 10 | [pass] LOC10 arithmetic extremes do not overflow | PASS | [B-Regression-Location.log:10](B-Regression-Location.log) |
| 11 | [pass] LOC11 deleted exact ID is channel scoped | PASS | [B-Regression-Location.log:11](B-Regression-Location.log) |
| 12 | [pass] LOC12 invalid input is rejected without mutation | PASS | [B-Regression-Location.log:12](B-Regression-Location.log) |
| 13 | [pass] LOC13 reopened JSONL and SQLite locations are identical | PASS | [B-Regression-Location.log:13](B-Regression-Location.log) |
| 14 | [pass] LOC14 metadata resolution does not require files or alter holds | PASS | [B-Regression-Location.log:14](B-Regression-Location.log) |

## Regression-SourceBinding

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [pass] S10-C301 결박 schema 왕복 | PASS | [B-Regression-SourceBinding.log:1](B-Regression-SourceBinding.log) |
| 2 | [pass] S10-C302 식별·ordinal 검증 | PASS | [B-Regression-SourceBinding.log:2](B-Regression-SourceBinding.log) |
| 3 | [pass] S10-C303 PTS 재정렬 보존 | PASS | [B-Regression-SourceBinding.log:3](B-Regression-SourceBinding.log) |
| 4 | [pass] S10-C304 미디어 범위·timebase | PASS | [B-Regression-SourceBinding.log:4](B-Regression-SourceBinding.log) |
| 5 | [pass] S10-C305 색인 상한·미색인 꼬리 | PASS | [B-Regression-SourceBinding.log:5](B-Regression-SourceBinding.log) |
| 6 | [pass] S10-C306 단일 bound mutation | PASS | [B-Regression-SourceBinding.log:6](B-Regression-SourceBinding.log) |
| 7 | [pass] S10-C307 source·저장 identity 결박 | PASS | [B-Regression-SourceBinding.log:7](B-Regression-SourceBinding.log) |
| 8 | [pass] S10-C308 불변·멱등 | PASS | [B-Regression-SourceBinding.log:8](B-Regression-SourceBinding.log) |
| 9 | [pass] S10-C309 소급·다운그레이드 금지 | PASS | [B-Regression-SourceBinding.log:9](B-Regression-SourceBinding.log) |
| 10 | [pass] S10-C310 정확한 원본 tuple 조회 | PASS | [B-Regression-SourceBinding.log:10](B-Regression-SourceBinding.log) |
| 11 | [pass] S10-C311 미색인·실제 부재 구분 | PASS | [B-Regression-SourceBinding.log:11](B-Regression-SourceBinding.log) |
| 12 | [pass] S10-C312 복수 segment 후보 | PASS | [B-Regression-SourceBinding.log:12](B-Regression-SourceBinding.log) |
| 13 | [pass] S10-C313 삭제·corrupt·pending 차단 | PASS | [B-Regression-SourceBinding.log:13](B-Regression-SourceBinding.log) |
| 14 | [pass] S10-C314 채널·조회 오류 경계 | PASS | [B-Regression-SourceBinding.log:14](B-Regression-SourceBinding.log) |
| 15 | [pass] S10-C315 SQL·JSONL 재시작 동등 | PASS | [B-Regression-SourceBinding.log:15](B-Regression-SourceBinding.log) |
| 16 | [pass] S10-C316 checkpoint 보존 | PASS | [B-Regression-SourceBinding.log:16](B-Regression-SourceBinding.log) |
| 17 | [pass] S10-C317 손상 원장 선차단 | PASS | [B-Regression-SourceBinding.log:17](B-Regression-SourceBinding.log) |
| 18 | [pass] S10-C318 예약·옵트인 경계 | PASS | [B-Regression-SourceBinding.log:18](B-Regression-SourceBinding.log) |
| 19 | [pass] S10-C319 기존 segment·조회 불변 | PASS | [B-Regression-SourceBinding.log:19](B-Regression-SourceBinding.log) |
| 20 | [pass] S10-C320 실제 finalize 수락 경계 | PASS | [B-Regression-SourceBinding.log:20](B-Regression-SourceBinding.log) |

## Regression-Reference

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [pass] C341 계약 왕복 | PASS | [B-Regression-Reference.log:1](B-Regression-Reference.log) |
| 2 | [pass] C342 unknown/중복 필드 거부 | PASS | [B-Regression-Reference.log:2](B-Regression-Reference.log) |
| 3 | [pass] C343 ID·종류·소유자 제약 | PASS | [B-Regression-Reference.log:3](B-Regression-Reference.log) |
| 4 | [pass] C344 품질·원본 nullable 조합 | PASS | [B-Regression-Reference.log:4](B-Regression-Reference.log) |
| 5 | [pass] C345 원본 수치·track 경계 | PASS | [B-Regression-Reference.log:5](B-Regression-Reference.log) |
| 6 | [pass] C346 event 요청·시간축 | PASS | [B-Regression-Reference.log:6](B-Regression-Reference.log) |
| 7 | [pass] C347 observation 요청 금지 | PASS | [B-Regression-Reference.log:7](B-Regression-Reference.log) |
| 8 | [pass] C348 요청 음수·역전·padding | PASS | [B-Regression-Reference.log:8](B-Regression-Reference.log) |
| 9 | [pass] C419 media-pts 초기 요청 원문 왕복 | PASS | [B-Regression-Reference.log:9](B-Regression-Reference.log) |
| 10 | [pass] C420 UTC 초기 요청 원문 왕복 | PASS | [B-Regression-Reference.log:10](B-Regression-Reference.log) |
| 11 | [pass] C421 0·최대 pre 요청 및 오류 경계 | PASS | [B-Regression-Reference.log:11](B-Regression-Reference.log) |
| 12 | [pass] C349 미지원 schema 거부 | PASS | [B-Regression-Reference.log:12](B-Regression-Reference.log) |
| 13 | [pass] C350 실제 원장 저장·조회 | PASS | [B-Regression-Reference.log:13](B-Regression-Reference.log) |
| 14 | [pass] C351 동일 참조 멱등 | PASS | [B-Regression-Reference.log:14](B-Regression-Reference.log) |
| 15 | [pass] C352 동일 ID 충돌 거부 | PASS | [B-Regression-Reference.log:15](B-Regression-Reference.log) |
| 16 | [pass] C353 opt-in·미open 거부 | PASS | [B-Regression-Reference.log:16](B-Regression-Reference.log) |
| 17 | [pass] C354 SQL·JSONL 재시작 동등 | PASS | [B-Regression-Reference.log:17](B-Regression-Reference.log) |
| 18 | [pass] C355 checkpoint 참조 보존 | PASS | [B-Regression-Reference.log:18](B-Regression-Reference.log) |
| 19 | [pass] C356 손상·충돌 replay 선차단 | PASS | [B-Regression-Reference.log:29](B-Regression-Reference.log) |

## Regression-Retention

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [pass] B01 V2 tombstone preserves immutable segment without legacy UTC range | PASS | [B-Regression-Retention.log:1](B-Regression-Retention.log) |
| 2 | [pass] B02 V2 state records reject malformed payload entity and duplicate conflicts | PASS | [B-Regression-Retention.log:2](B-Regression-Retention.log) |
| 3 | [pass] B03 V2 pending corrupt and deleted overlays never mutate finalized payload | PASS | [B-Regression-Retention.log:3](B-Regression-Retention.log) |
| 4 | [pass] B04 V2 invalid transitions and finalize retries cannot resurrect state | PASS | [B-Regression-Retention.log:4](B-Regression-Retention.log) |
| 5 | [pass] B05 V2 checkpoint and restart preserve overlay tombstone and SQLite parity | PASS | [B-Regression-Retention.log:5](B-Regression-Retention.log) |
| 6 | [pass] B06 V2 capacity deletion follows durable order despite reversed UTC | PASS | [B-Regression-Retention.log:6](B-Regression-Retention.log) |
| 7 | [pass] B07 mixed legacy and multiple stores use deterministic nonchronological ordering | PASS | [B-Regression-Retention.log:7](B-Regression-Retention.log) |
| 8 | [pass] B08 V2 age expiry uses all known mapping ends plus uncertainty rounded upward | PASS | [B-Regression-Retention.log:8](B-Regression-Retention.log) |
| 9 | [pass] B09 V2 unknown or overflowing age remains capacity eligible | PASS | [B-Regression-Retention.log:9](B-Regression-Retention.log) |
| 10 | [pass] B10 V2 class quotas and disk reserve remain separated | PASS | [B-Regression-Retention.log:10](B-Regression-Retention.log) |
| 11 | [pass] B11 V2 pin and hold protect deletion and corruption | PASS | [B-Regression-Retention.log:11](B-Regression-Retention.log) |
| 12 | [pass] B12 V2 pending and corrupt bytes remain charged but are not automatic victims | PASS | [B-Regression-Retention.log:12](B-Regression-Retention.log) |
| 13 | [pass] B13 V2 apply persists pending before unlink and tombstone after unlink | PASS | [B-Regression-Retention.log:13](B-Regression-Retention.log) |
| 14 | [pass] B14 V2 interrupted deletion recovers without resurrection | PASS | [B-Regression-Retention.log:14](B-Regression-Retention.log) |
| 15 | [pass] B15 V2 corrupt cleanup requires explicit manual reason | PASS | [B-Regression-Retention.log:15](B-Regression-Retention.log) |
| 16 | [pass] B16 V2 continuous media with unknown UTC resolves a healthy held fd | PASS | [B-Regression-Retention.log:16](B-Regression-Retention.log) |
| 17 | [pass] B17 V2 wrong channel event and fallback collision cannot expose media | PASS | [B-Regression-Retention.log:17](B-Regression-Retention.log) |
| 18 | [pass] B18 V2 missing symlink and multiple hardlink media reject without hold leak | PASS | [B-Regression-Retention.log:18](B-Regression-Retention.log) |
| 19 | [pass] B19 V2 same size corruption and invalid container reject without hold leak | PASS | [B-Regression-Retention.log:19](B-Regression-Retention.log) |
| 20 | [pass] B20 V2 deletion and playback hold races have one safe winner | PASS | [B-Regression-Retention.log:20](B-Regression-Retention.log) |
| 21 | [pass] B21 borrowed fd inspection preserves caller ownership and detects file changes | PASS | [B-Regression-Retention.log:21](B-Regression-Retention.log) |
| 22 | [pass] B23 legacy store port refuses unsupported V2 deletion | PASS | [B-Regression-Retention.log:22](B-Regression-Retention.log) |
| 23 | [pass] B22 V2 playback is unavailable without GStreamer | PASS | [B-Regression-Retention.log:24](B-Regression-Retention.log) |
| 24 | [pass] B23 legacy store port refuses unsupported V2 deletion | PASS | [B-Regression-Retention.log:25](B-Regression-Retention.log) |

## Regression-Finalize

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [pass] FR09 actual H264 packet fixture | PASS | [B-Regression-Finalize.log:1](B-Regression-Finalize.log) |
| 2 | [pass] FR09 writer start | PASS | [B-Regression-Finalize.log:2](B-Regression-Finalize.log) |
| 3 | [pass] FR09 callback observes durable ready | PASS | [B-Regression-Finalize.log:3](B-Regression-Finalize.log) |
| 4 | [pass] FR09 callback observes owned marker | PASS | [B-Regression-Finalize.log:4](B-Regression-Finalize.log) |
| 5 | [pass] FR09 exact final bytes metadata | PASS | [B-Regression-Finalize.log:5](B-Regression-Finalize.log) |
| 6 | [pass] FR09 completion actual bytes | PASS | [B-Regression-Finalize.log:6](B-Regression-Finalize.log) |
| 7 | [pass] FR09 exactly one finalized callback | PASS | [B-Regression-Finalize.log:7](B-Regression-Finalize.log) |
| 8 | [pass] FR09 successful cleanup and reservation completion | PASS | [B-Regression-Finalize.log:8](B-Regression-Finalize.log) |
| 9 | [pass] FR09 writer start | PASS | [B-Regression-Finalize.log:9](B-Regression-Finalize.log) |
| 10 | [pass] FR09 callback observes durable ready | PASS | [B-Regression-Finalize.log:10](B-Regression-Finalize.log) |
| 11 | [pass] FR09 callback observes owned marker | PASS | [B-Regression-Finalize.log:11](B-Regression-Finalize.log) |
| 12 | [pass] FR09 exact final bytes metadata | PASS | [B-Regression-Finalize.log:12](B-Regression-Finalize.log) |
| 13 | [pass] FR10 failure occurs during Push and blocks later packet admission before Stop | PASS | [B-Regression-Finalize.log:14](B-Regression-Finalize.log) |
| 14 | [pass] FR10 repeated Push while started cannot bypass recovery pending | PASS | [B-Regression-Finalize.log:15](B-Regression-Finalize.log) |
| 15 | [pass] FR09 exactly one finalized callback | PASS | [B-Regression-Finalize.log:16](B-Regression-Finalize.log) |
| 16 | [pass] FR10 failure blocks repeat admission and reservation release | PASS | [B-Regression-Finalize.log:17](B-Regression-Finalize.log) |
| 17 | [pass] FR10 Stop preserves media ready marker | PASS | [B-Regression-Finalize.log:18](B-Regression-Finalize.log) |
| 18 | [pass] FR10 recovery journal | PASS | [B-Regression-Finalize.log:19](B-Regression-Finalize.log) |
| 19 | [pass] FR10 recovery Open preserves ready | PASS | [B-Regression-Finalize.log:20](B-Regression-Finalize.log) |
| 20 | [pass] FR10 restart recovers callback failure original ID | PASS | [B-Regression-Finalize.log:21](B-Regression-Finalize.log) |
| 21 | [pass] FR06 known journal | PASS | [B-Regression-Finalize.log:22](B-Regression-Finalize.log) |
| 22 | [pass] FR06 known catalog | PASS | [B-Regression-Finalize.log:23](B-Regression-Finalize.log) |
| 23 | [pass] FR06 known original metadata | PASS | [B-Regression-Finalize.log:24](B-Regression-Finalize.log) |
| 24 | [pass] FR06 known ready | PASS | [B-Regression-Finalize.log:25](B-Regression-Finalize.log) |
| 25 | [pass] FR06 temporary hold fixture | PASS | [B-Regression-Finalize.log:26](B-Regression-Finalize.log) |
| 26 | [pass] FR06 durable diagnostic before rejected Mark preserves journal | PASS | [B-Regression-Finalize.log:27](B-Regression-Finalize.log) |
| 27 | [pass] FR06 release fixture hold | PASS | [B-Regression-Finalize.log:28](B-Regression-Finalize.log) |
| 28 | [pass] FR06 before Mark restart journal | PASS | [B-Regression-Finalize.log:29](B-Regression-Finalize.log) |
| 29 | [pass] FR06 before Mark restart catalog | PASS | [B-Regression-Finalize.log:30](B-Regression-Finalize.log) |
| 30 | [pass] FR06 diagnostic before Mark crash converges to Corrupt | PASS | [B-Regression-Finalize.log:31](B-Regression-Finalize.log) |
| 31 | [pass] FR06 after Mark restart journal | PASS | [B-Regression-Finalize.log:32](B-Regression-Finalize.log) |
| 32 | [pass] FR06 after Mark restart catalog | PASS | [B-Regression-Finalize.log:33](B-Regression-Finalize.log) |
| 33 | [pass] FR06 after Mark crash repeat no append | PASS | [B-Regression-Finalize.log:34](B-Regression-Finalize.log) |
| 34 | [pass] FR06 diagnostic conflict preserves original and journal | PASS | [B-Regression-Finalize.log:35](B-Regression-Finalize.log) |
| 35 | [pass] FR16 event journal open | PASS | [B-Regression-Finalize.log:36](B-Regression-Finalize.log) |
| 36 | [pass] FR16 event catalog open | PASS | [B-Regression-Finalize.log:37](B-Regression-Finalize.log) |
| 37 | [pass] FR16 actual catalog mode | PASS | [B-Regression-Finalize.log:38](B-Regression-Finalize.log) |
| 38 | [pass] FR12 original source registered | PASS | [B-Regression-Finalize.log:39](B-Regression-Finalize.log) |
| 39 | [pass] FR12 durable Pending precedes remux | PASS | [B-Regression-Finalize.log:40](B-Regression-Finalize.log) |
| 40 | [pass] FR11 actual MPEGTS remux ready | PASS | [B-Regression-Finalize.log:41](B-Regression-Finalize.log) |
| 41 | [pass] FR11 actual tsdemux healthy | PASS | [B-Regression-Finalize.log:42](B-Regression-Finalize.log) |
| 42 | [pass] FR12 ready contains derived epoch fixture | PASS | [B-Regression-Finalize.log:43](B-Regression-Finalize.log) |
| 43 | [pass] FR12 raw mismatched event epoch recovery rejects without registration | PASS | [B-Regression-Finalize.log:44](B-Regression-Finalize.log) |
| 44 | [pass] FR13 new event output recovered | PASS | [B-Regression-Finalize.log:45](B-Regression-Finalize.log) |
| 45 | [pass] FR13 source and new output holds exactly once | PASS | [B-Regression-Finalize.log:46](B-Regression-Finalize.log) |
| 46 | [pass] FR16 query contains source and recovered output | PASS | [B-Regression-Finalize.log:47](B-Regression-Finalize.log) |
| 47 | [pass] FR14 recreate exact postcommit stale ready | PASS | [B-Regression-Finalize.log:48](B-Regression-Finalize.log) |
| 48 | [pass] FR14 restart journal | PASS | [B-Regression-Finalize.log:49](B-Regression-Finalize.log) |
| 49 | [pass] FR14 restart catalog | PASS | [B-Regression-Finalize.log:50](B-Regression-Finalize.log) |
| 50 | [pass] FR14 Open restores source output holds | PASS | [B-Regression-Finalize.log:51](B-Regression-Finalize.log) |
| 51 | [pass] FR14 committed replay no journal append | PASS | [B-Regression-Finalize.log:52](B-Regression-Finalize.log) |
| 52 | [pass] FR14 committed recovery no duplicate holds | PASS | [B-Regression-Finalize.log:53](B-Regression-Finalize.log) |
| 53 | [pass] FR15 bridge quota policy | PASS | [B-Regression-Finalize.log:54](B-Regression-Finalize.log) |
| 54 | [pass] FR14 existing output terminal recovery no remux | PASS | [B-Regression-Finalize.log:55](B-Regression-Finalize.log) |
| 55 | [pass] FR14 existing terminal releases all restored holds | PASS | [B-Regression-Finalize.log:56](B-Regression-Finalize.log) |
| 56 | [pass] FR15 production bridge accepts event | PASS | [B-Regression-Finalize.log:57](B-Regression-Finalize.log) |
| 57 | [pass] FR15 every actual bridge request carries ready metadata and reservation | PASS | [B-Regression-Finalize.log:58](B-Regression-Finalize.log) |
| 58 | [pass] FR15 actual production bridge remux completes | PASS | [B-Regression-Finalize.log:59](B-Regression-Finalize.log) |
| 59 | [pass] FR15 production bridge clears ready before terminal | PASS | [B-Regression-Finalize.log:60](B-Regression-Finalize.log) |
| 60 | [pass] FR15 reservation exceed before ready emission | PASS | [B-Regression-Finalize.log:61](B-Regression-Finalize.log) |
| 61 | [pass] FR15 reservation exceed cleans owned output only | PASS | [B-Regression-Finalize.log:62](B-Regression-Finalize.log) |
| 62 | [pass] FR16 event journal open | PASS | [B-Regression-Finalize.log:63](B-Regression-Finalize.log) |
| 63 | [pass] FR16 event catalog open | PASS | [B-Regression-Finalize.log:64](B-Regression-Finalize.log) |
| 64 | [pass] FR16 actual catalog mode | PASS | [B-Regression-Finalize.log:65](B-Regression-Finalize.log) |
| 65 | [pass] FR12 original source registered | PASS | [B-Regression-Finalize.log:66](B-Regression-Finalize.log) |
| 66 | [pass] FR12 durable Pending precedes remux | PASS | [B-Regression-Finalize.log:67](B-Regression-Finalize.log) |
| 67 | [pass] FR11 actual MPEGTS remux ready | PASS | [B-Regression-Finalize.log:68](B-Regression-Finalize.log) |
| 68 | [pass] FR11 actual tsdemux healthy | PASS | [B-Regression-Finalize.log:69](B-Regression-Finalize.log) |
| 69 | [pass] FR12 ready contains derived epoch fixture | PASS | [B-Regression-Finalize.log:70](B-Regression-Finalize.log) |
| 70 | [pass] FR12 raw mismatched event epoch recovery rejects without registration | PASS | [B-Regression-Finalize.log:71](B-Regression-Finalize.log) |
| 71 | [pass] FR13 new event output recovered | PASS | [B-Regression-Finalize.log:72](B-Regression-Finalize.log) |
| 72 | [pass] FR13 source and new output holds exactly once | PASS | [B-Regression-Finalize.log:73](B-Regression-Finalize.log) |
| 73 | [pass] FR16 query contains source and recovered output | PASS | [B-Regression-Finalize.log:74](B-Regression-Finalize.log) |
| 74 | [pass] FR16 direct SQLite open | PASS | [B-Regression-Finalize.log:75](B-Regression-Finalize.log) |
| 75 | [pass] FR16 direct SQLite prepare | PASS | [B-Regression-Finalize.log:76](B-Regression-Finalize.log) |
| 76 | [pass] FR16 actual SQL lifecycle and exact codec metadata projection | PASS | [B-Regression-Finalize.log:77](B-Regression-Finalize.log) |
| 77 | [pass] FR14 recreate exact postcommit stale ready | PASS | [B-Regression-Finalize.log:78](B-Regression-Finalize.log) |
| 78 | [pass] FR14 restart journal | PASS | [B-Regression-Finalize.log:79](B-Regression-Finalize.log) |
| 79 | [pass] FR14 restart catalog | PASS | [B-Regression-Finalize.log:80](B-Regression-Finalize.log) |
| 80 | [pass] FR14 Open restores source output holds | PASS | [B-Regression-Finalize.log:81](B-Regression-Finalize.log) |
| 81 | [pass] FR14 committed replay no journal append | PASS | [B-Regression-Finalize.log:82](B-Regression-Finalize.log) |
| 82 | [pass] FR14 committed recovery no duplicate holds | PASS | [B-Regression-Finalize.log:83](B-Regression-Finalize.log) |
| 83 | [pass] FR15 bridge quota policy | PASS | [B-Regression-Finalize.log:84](B-Regression-Finalize.log) |
| 84 | [pass] FR14 existing output terminal recovery no remux | PASS | [B-Regression-Finalize.log:85](B-Regression-Finalize.log) |
| 85 | [pass] FR14 existing terminal releases all restored holds | PASS | [B-Regression-Finalize.log:86](B-Regression-Finalize.log) |
| 86 | [pass] FR15 production bridge accepts event | PASS | [B-Regression-Finalize.log:87](B-Regression-Finalize.log) |
| 87 | [pass] FR15 every actual bridge request carries ready metadata and reservation | PASS | [B-Regression-Finalize.log:88](B-Regression-Finalize.log) |
| 88 | [pass] FR15 actual production bridge remux completes | PASS | [B-Regression-Finalize.log:89](B-Regression-Finalize.log) |
| 89 | [pass] FR15 production bridge clears ready before terminal | PASS | [B-Regression-Finalize.log:90](B-Regression-Finalize.log) |
| 90 | [pass] FR15 reservation exceed before ready emission | PASS | [B-Regression-Finalize.log:91](B-Regression-Finalize.log) |
| 91 | [pass] FR15 reservation exceed cleans owned output only | PASS | [B-Regression-Finalize.log:92](B-Regression-Finalize.log) |
| 92 | [pass] FR15 failure journal | PASS | [B-Regression-Finalize.log:93](B-Regression-Finalize.log) |
| 93 | [pass] FR15 failure catalog | PASS | [B-Regression-Finalize.log:94](B-Regression-Finalize.log) |
| 94 | [pass] FR15 failure source | PASS | [B-Regression-Finalize.log:95](B-Regression-Finalize.log) |
| 95 | [pass] FR15 failure quota policy | PASS | [B-Regression-Finalize.log:96](B-Regression-Finalize.log) |
| 96 | [pass] FR15 failure request accepted | PASS | [B-Regression-Finalize.log:97](B-Regression-Finalize.log) |
| 97 | [pass] FR15 failed Pending append prevents remux and releases source lease | PASS | [B-Regression-Finalize.log:98](B-Regression-Finalize.log) |
| 98 | [pass] FR15 failed Pending append leaves original and replacement journal unchanged | PASS | [B-Regression-Finalize.log:99](B-Regression-Finalize.log) |
| 99 | [pass] FR15 failed Pending append creates no ready | PASS | [B-Regression-Finalize.log:100](B-Regression-Finalize.log) |
| 100 | [pass] FR15 failed Pending append released exact reservation for readmission | PASS | [B-Regression-Finalize.log:101](B-Regression-Finalize.log) |
| 101 | [pass] FR06 size ready fixture | PASS | [B-Regression-Finalize.log:102](B-Regression-Finalize.log) |
| 102 | [pass] FR06 size journal fixture | PASS | [B-Regression-Finalize.log:103](B-Regression-Finalize.log) |
| 103 | [pass] FR06 size catalog fixture | PASS | [B-Regression-Finalize.log:104](B-Regression-Finalize.log) |
| 104 | [pass] FR06 size definite corruption never finalized | PASS | [B-Regression-Finalize.log:105](B-Regression-Finalize.log) |
| 105 | [pass] FR06 size corrupt original and ticket retained | PASS | [B-Regression-Finalize.log:106](B-Regression-Finalize.log) |
| 106 | [pass] FR06 size repeat logical quarantine converges | PASS | [B-Regression-Finalize.log:107](B-Regression-Finalize.log) |
| 107 | [pass] FR06 container ready fixture | PASS | [B-Regression-Finalize.log:108](B-Regression-Finalize.log) |
| 108 | [pass] FR06 container journal fixture | PASS | [B-Regression-Finalize.log:109](B-Regression-Finalize.log) |
| 109 | [pass] FR06 container catalog fixture | PASS | [B-Regression-Finalize.log:110](B-Regression-Finalize.log) |
| 110 | [pass] FR06 container definite corruption never finalized | PASS | [B-Regression-Finalize.log:111](B-Regression-Finalize.log) |
| 111 | [pass] FR06 container corrupt original and ticket retained | PASS | [B-Regression-Finalize.log:112](B-Regression-Finalize.log) |
| 112 | [pass] FR06 container repeat logical quarantine converges | PASS | [B-Regression-Finalize.log:113](B-Regression-Finalize.log) |
| 113 | [pass] FR06 two-links ready fixture | PASS | [B-Regression-Finalize.log:114](B-Regression-Finalize.log) |
| 114 | [pass] FR06 two-links journal fixture | PASS | [B-Regression-Finalize.log:115](B-Regression-Finalize.log) |
| 115 | [pass] FR06 two-links catalog fixture | PASS | [B-Regression-Finalize.log:116](B-Regression-Finalize.log) |
| 116 | [pass] FR06 two-links definite corruption never finalized | PASS | [B-Regression-Finalize.log:117](B-Regression-Finalize.log) |
| 117 | [pass] FR06 two-links corrupt original and ticket retained | PASS | [B-Regression-Finalize.log:118](B-Regression-Finalize.log) |
| 118 | [pass] FR06 two-links repeat logical quarantine converges | PASS | [B-Regression-Finalize.log:119](B-Regression-Finalize.log) |
| 119 | [pass] FR12 missing link journal | PASS | [B-Regression-Finalize.log:120](B-Regression-Finalize.log) |
| 120 | [pass] FR12 missing link catalog | PASS | [B-Regression-Finalize.log:121](B-Regression-Finalize.log) |
| 121 | [pass] FR12 missing link source | PASS | [B-Regression-Finalize.log:122](B-Regression-Finalize.log) |
| 122 | [pass] FR12 missing durable link actual remux fixture | PASS | [B-Regression-Finalize.log:123](B-Regression-Finalize.log) |
| 123 | [pass] FR12 missing durable Pending prevents inferred event registration | PASS | [B-Regression-Finalize.log:124](B-Regression-Finalize.log) |
| 124 | [pass] FR12 mismatched durable event fixture | PASS | [B-Regression-Finalize.log:125](B-Regression-Finalize.log) |
| 125 | [pass] FR12 mismatched durable event preserves output and journal | PASS | [B-Regression-Finalize.log:126](B-Regression-Finalize.log) |
| 126 | [pass] FR11 unsupported MPEGTS codec metadata unavailable | PASS | [B-Regression-Finalize.log:127](B-Regression-Finalize.log) |
| 127 | [pass] FR11 actual MPEGTS changed bytes definitely corrupt | PASS | [B-Regression-Finalize.log:128](B-Regression-Finalize.log) |
| 128 | [pass] FR11 unclassified MPEGTS error unavailable preserves bytes and journal | PASS | [B-Regression-Finalize.log:130](B-Regression-Finalize.log) |
| 129 | [pass] FR06 path journal | PASS | [B-Regression-Finalize.log:131](B-Regression-Finalize.log) |
| 130 | [pass] FR06 path catalog | PASS | [B-Regression-Finalize.log:132](B-Regression-Finalize.log) |
| 131 | [pass] FR06 path known corrupt fixture | PASS | [B-Regression-Finalize.log:133](B-Regression-Finalize.log) |
| 132 | [pass] FR06 path foreign relative ready fixture | PASS | [B-Regression-Finalize.log:134](B-Regression-Finalize.log) |
| 133 | [pass] FR06 known Corrupt same metadata different stored path rejected | PASS | [B-Regression-Finalize.log:135](B-Regression-Finalize.log) |
| 134 | [pass] FR09 single packet writer start | PASS | [B-Regression-Finalize.log:136](B-Regression-Finalize.log) |
| 135 | [pass] FR09 single packet cleanup returns actual bytes | PASS | [B-Regression-Finalize.log:137](B-Regression-Finalize.log) |
| 136 | [pass] FR09 single packet invalid interval cleans before ready without callback | PASS | [B-Regression-Finalize.log:138](B-Regression-Finalize.log) |
| 137 | [pass] FR09 restart after incomplete single packet | PASS | [B-Regression-Finalize.log:139](B-Regression-Finalize.log) |
| 138 | [pass] FR09 recovered positive interval callback valid V1 | PASS | [B-Regression-Finalize.log:140](B-Regression-Finalize.log) |
| 139 | [pass] FR09 single packet cleanup returns actual bytes | PASS | [B-Regression-Finalize.log:141](B-Regression-Finalize.log) |
| 140 | [pass] FR09 positive interval after incomplete packet finalizes normally | PASS | [B-Regression-Finalize.log:142](B-Regression-Finalize.log) |

## Regression-Range

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [pass] S10-C201 미디어 구간 mapping 경계 | PASS | [B-Regression-Range.log:1](B-Regression-Range.log) |
| 2 | [pass] S10-C202 unknown UTC의 미디어 위치 | PASS | [B-Regression-Range.log:2](B-Regression-Range.log) |
| 3 | [pass] S10-C203 미디어 범위 밖 | PASS | [B-Regression-Range.log:3](B-Regression-Range.log) |
| 4 | [pass] S10-C204 미확정 끝 | PASS | [B-Regression-Range.log:4](B-Regression-Range.log) |
| 5 | [pass] S10-C205 UTC 중첩 mapping | PASS | [B-Regression-Range.log:5](B-Regression-Range.log) |
| 6 | [pass] S10-C206 저장소 경계·결정 순서 | PASS | [B-Regression-Range.log:6](B-Regression-Range.log) |
| 7 | [pass] S10-C207 정상 segment 분할 | PASS | [B-Regression-Range.log:7](B-Regression-Range.log) |
| 8 | [pass] S10-C208 반열린 구간 경계 | PASS | [B-Regression-Range.log:8](B-Regression-Range.log) |
| 9 | [pass] S10-C209 유리수·비정수 경계 | PASS | [B-Regression-Range.log:9](B-Regression-Range.log) |
| 10 | [pass] S10-C210 정수 범위 안전성 | PASS | [B-Regression-Range.log:10](B-Regression-Range.log) |
| 11 | [pass] S10-C211 UTC 공백·unplaced 구분 | PASS | [B-Regression-Range.log:11](B-Regression-Range.log) |
| 12 | [pass] S10-C212 입력 오류 초기화 | PASS | [B-Regression-Range.log:12](B-Regression-Range.log) |
| 13 | [pass] S10-C213 삭제·채널 경계 | PASS | [B-Regression-Range.log:13](B-Regression-Range.log) |
| 14 | [pass] S10-C214 재시작 SQL·JSONL 동등 | PASS | [B-Regression-Range.log:14](B-Regression-Range.log) |
| 15 | [pass] S10-C215 원본 mapping·조회 불변 | PASS | [B-Regression-Range.log:15](B-Regression-Range.log) |
| 16 | [pass] S10-C216 unknown 채널 격리 | PASS | [B-Regression-Range.log:16](B-Regression-Range.log) |

## Regression-Connection

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [pass] C401 관측·참조 원자 저장 | PASS | [B-Regression-Connection.log:1](B-Regression-Connection.log) |
| 2 | [pass] C402 쌍 identity 불일치 거부 | PASS | [B-Regression-Connection.log:2](B-Regression-Connection.log) |
| 3 | [pass] C403 동일 원본 재전달·event 병합 | PASS | [B-Regression-Connection.log:3](B-Regression-Connection.log) |
| 4 | [pass] C405 SQL·JSONL·checkpoint 쌍 복구 | PASS | [B-Regression-Connection.log:4](B-Regression-Connection.log) |
| 5 | [pass] C404 다른 원본 동일PTS 구분 | PASS | [B-Regression-Connection.log:5](B-Regression-Connection.log) |
| 6 | [pass] C406 실제 OnResult 원본 참조 저장 | PASS | [B-Regression-Connection.log:6](B-Regression-Connection.log) |
| 7 | [pass] C407 OnEvent 강제 표본 | PASS | [B-Regression-Connection.log:7](B-Regression-Connection.log) |
| 8 | [pass] C408 종료track 과거참조 보존 | PASS | [B-Regression-Connection.log:8](B-Regression-Connection.log) |
| 9 | [pass] C409 종료track 참조부재 unknown | PASS | [B-Regression-Connection.log:9](B-Regression-Connection.log) |
| 10 | [pass] C410 sampling·queue·StopAndDrain 회귀 | PASS | [B-Regression-Connection.log:10](B-Regression-Connection.log) |
| 11 | [pass] C411 exact·미색인 복수 후보 보존 | PASS | [B-Regression-Connection.log:11](B-Regression-Connection.log) |
| 12 | [pass] C412 nearest/ambiguous/unavailable 미승격 | PASS | [B-Regression-Connection.log:12](B-Regression-Connection.log) |
| 13 | [pass] C413 UTC unknown·삭제 상태 재판정 | PASS | [B-Regression-Connection.log:13](B-Regression-Connection.log) |
| 14 | [pass] C414 실제 TryResolve 요청참조 저장 | PASS | [B-Regression-Connection.log:14](B-Regression-Connection.log) |
| 15 | [pass] C415 event 재전달·확장·세대 구분 | PASS | [B-Regression-Connection.log:15](B-Regression-Connection.log) |
| 16 | [pass] C416 source/channel 충돌 거부 | PASS | [B-Regression-Connection.log:16](B-Regression-Connection.log) |
| 17 | [pass] C417 같은 원본 미디어 교집합 우선 | PASS | [B-Regression-Connection.log:17](B-Regression-Connection.log) |
| 18 | [pass] C418 공개 결과·구형 fallback 불변 | PASS | [B-Regression-Connection.log:18](B-Regression-Connection.log) |
| 19 | [pass] C422 실제 bridge 초기 pre-roll 수락·pending 유지 | PASS | [B-Regression-Connection.log:19](B-Regression-Connection.log) |
| 20 | [pass] C423 초기 요청 멱등·갱신·generation 분리 | PASS | [B-Regression-Connection.log:20](B-Regression-Connection.log) |
| 21 | [pass] C424 초기 요청 SQL·JSONL 복구 | PASS | [B-Regression-Connection.log:21](B-Regression-Connection.log) |
| 22 | [pass] C425 초기 요청 checkpoint 복구 | PASS | [B-Regression-Connection.log:22](B-Regression-Connection.log) |

## Regression-EventClosed

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [등록기 단위 테스트] PASS 정상 정식 등록 27개 | PASS | [B-Regression-EventClosed.log:2](B-Regression-EventClosed.log) |
| 2 | [등록기 단위 테스트] PASS 다른 등록군 추가와 일관된 총계 허용 | PASS | [B-Regression-EventClosed.log:3](B-Regression-EventClosed.log) |
| 3 | [등록기 단위 테스트] PASS 전체 총계 불일치 거부 | PASS | [B-Regression-EventClosed.log:4](B-Regression-EventClosed.log) |
| 4 | [등록기 단위 테스트] PASS canonical 등록 수 변경 거부 | PASS | [B-Regression-EventClosed.log:5](B-Regression-EventClosed.log) |
| 5 | [등록기 단위 테스트] PASS S05 등록 수 변경 거부 | PASS | [B-Regression-EventClosed.log:6](B-Regression-EventClosed.log) |
| 6 | [등록기 단위 테스트] PASS 등록군 중복 거부 | PASS | [B-Regression-EventClosed.log:7](B-Regression-EventClosed.log) |
| 7 | [등록기 단위 테스트] PASS 음수 등록 수 거부 | PASS | [B-Regression-EventClosed.log:8](B-Regression-EventClosed.log) |
| 8 | [등록기 단위 테스트] PASS 소수 등록 수 거부 | PASS | [B-Regression-EventClosed.log:9](B-Regression-EventClosed.log) |
| 9 | [등록기 단위 테스트] PASS 등록 범위 표 누락 거부 | PASS | [B-Regression-EventClosed.log:10](B-Regression-EventClosed.log) |
| 10 | [등록기 단위 테스트] PASS 누락 ID | PASS | [B-Regression-EventClosed.log:11](B-Regression-EventClosed.log) |
| 11 | [등록기 단위 테스트] PASS 중복 ID | PASS | [B-Regression-EventClosed.log:12](B-Regression-EventClosed.log) |
| 12 | [등록기 단위 테스트] PASS 추가 ID | PASS | [B-Regression-EventClosed.log:13](B-Regression-EventClosed.log) |
| 13 | [등록기 단위 테스트] PASS 빈 테스트 영역 | PASS | [B-Regression-EventClosed.log:14](B-Regression-EventClosed.log) |
| 14 | [등록기 단위 테스트] PASS 없는 구현 심볼 | PASS | [B-Regression-EventClosed.log:15](B-Regression-EventClosed.log) |
| 15 | [등록기 단위 테스트] PASS 없는 테스트 함수 | PASS | [B-Regression-EventClosed.log:16](B-Regression-EventClosed.log) |
| 16 | [등록기 단위 테스트] PASS 없는 check | PASS | [B-Regression-EventClosed.log:17](B-Regression-EventClosed.log) |
| 17 | [등록기 단위 테스트] PASS 중복 check ID | PASS | [B-Regression-EventClosed.log:18](B-Regression-EventClosed.log) |
| 18 | [등록기 단위 테스트] PASS 문서 행 누락 | PASS | [B-Regression-EventClosed.log:19](B-Regression-EventClosed.log) |
| 19 | [등록기 단위 테스트] PASS 실행 소비자 정상 합성 입력 | PASS | [B-Regression-EventClosed.log:20](B-Regression-EventClosed.log) |
| 20 | [등록기 단위 테스트] PASS 실제 check 결과 누락 | PASS | [B-Regression-EventClosed.log:21](B-Regression-EventClosed.log) |
| 21 | [등록기 단위 테스트] PASS EOS assertion 제거와 감소한 summary도 거부 | PASS | [B-Regression-EventClosed.log:22](B-Regression-EventClosed.log) |
| 22 | [등록기 단위 테스트] PASS 실패 summary | PASS | [B-Regression-EventClosed.log:23](B-Regression-EventClosed.log) |
| 23 | [등록기 단위 테스트] PASS 성공 summary만으로 PASS 금지 | PASS | [B-Regression-EventClosed.log:24](B-Regression-EventClosed.log) |
| 24 | [등록기 단위 테스트] PASS 중복 application 결과 | PASS | [B-Regression-EventClosed.log:25](B-Regression-EventClosed.log) |
| 25 | [등록기 단위 테스트] PASS runtime 로그 전체 누락 | PASS | [B-Regression-EventClosed.log:26](B-Regression-EventClosed.log) |
| 26 | [등록기 단위 테스트] PASS runtime 시나리오 누락 | PASS | [B-Regression-EventClosed.log:27](B-Regression-EventClosed.log) |
| 27 | [등록기 단위 테스트] PASS 종료 취소 runtime 시나리오 누락 | PASS | [B-Regression-EventClosed.log:28](B-Regression-EventClosed.log) |
| 28 | [등록기 단위 테스트] PASS runtime assertion 누락 및 감소 summary | PASS | [B-Regression-EventClosed.log:29](B-Regression-EventClosed.log) |
| 29 | [등록기 단위 테스트] PASS runtime assertion 중복 및 증가 summary | PASS | [B-Regression-EventClosed.log:30](B-Regression-EventClosed.log) |
| 30 | [등록기 단위 테스트] PASS runtime summary 실패 | PASS | [B-Regression-EventClosed.log:31](B-Regression-EventClosed.log) |
| 31 | [등록기 단위 테스트] PASS runtime summary 중복 | PASS | [B-Regression-EventClosed.log:32](B-Regression-EventClosed.log) |
| 32 | [등록기 단위 테스트] PASS runtime failure marker | PASS | [B-Regression-EventClosed.log:33](B-Regression-EventClosed.log) |
| 33 | [등록기 단위 테스트] PASS runtime mutation 결과 누락 | PASS | [B-Regression-EventClosed.log:34](B-Regression-EventClosed.log) |
| 34 | [등록기 단위 테스트] PASS runtime mutation 결과 중복 | PASS | [B-Regression-EventClosed.log:35](B-Regression-EventClosed.log) |
| 35 | [등록기 단위 테스트] PASS runtime negative summary 실패 | PASS | [B-Regression-EventClosed.log:36](B-Regression-EventClosed.log) |
| 36 | [s05-assert] "EQ journal open" | PASS | [B-Regression-EventClosed.log:38](B-Regression-EventClosed.log) |
| 37 | [s05-assert] "EQ catalog open" | PASS | [B-Regression-EventClosed.log:39](B-Regression-EventClosed.log) |
| 38 | [s05-assert] "EQ 실제 pending 등록" | PASS | [B-Regression-EventClosed.log:40](B-Regression-EventClosed.log) |
| 39 | [s05-assert] "EQ 각 event 실제 worker 최초 journal 기록 확인" | PASS | [B-Regression-EventClosed.log:41](B-Regression-EventClosed.log) |
| 40 | [s05-assert] "EQ deadline 이전 동일 event journal 증가 없음" | PASS | [B-Regression-EventClosed.log:43](B-Regression-EventClosed.log) |
| 41 | [s05-assert] "EQ 서로 다른 event link ID 보존" | PASS | [B-Regression-EventClosed.log:44](B-Regression-EventClosed.log) |
| 42 | [s05-assert] "EQ 미해석 PTS는 파생 비실행" | PASS | [B-Regression-EventClosed.log:45](B-Regression-EventClosed.log) |
| 43 | [s05-assert] "EQ journal open" | PASS | [B-Regression-EventClosed.log:46](B-Regression-EventClosed.log) |
| 44 | [s05-assert] "EQ catalog open" | PASS | [B-Regression-EventClosed.log:47](B-Regression-EventClosed.log) |
| 45 | [s05-assert] "EQ 실제 pending 등록" | PASS | [B-Regression-EventClosed.log:48](B-Regression-EventClosed.log) |
| 46 | [s05-assert] "EQ 실제 pending 등록" | PASS | [B-Regression-EventClosed.log:49](B-Regression-EventClosed.log) |
| 47 | [s05-assert] "EQ 각 event 실제 worker 최초 journal 기록 확인" | PASS | [B-Regression-EventClosed.log:50](B-Regression-EventClosed.log) |
| 48 | [s05-assert] "EQ deadline 이전 동일 event journal 증가 없음" | PASS | [B-Regression-EventClosed.log:52](B-Regression-EventClosed.log) |
| 49 | [s05-assert] "EQ 서로 다른 event link ID 보존" | PASS | [B-Regression-EventClosed.log:53](B-Regression-EventClosed.log) |
| 50 | [s05-assert] "EQ 미해석 PTS는 파생 비실행" | PASS | [B-Regression-EventClosed.log:54](B-Regression-EventClosed.log) |
| 51 | [s05-assert] "기본 pending event link가 유효해야 함: " | PASS | [B-Regression-EventClosed.log:55](B-Regression-EventClosed.log) |
| 52 | [s05-assert] "terminal 대기 UTC 확장 요청은 additive 계약으로 round-trip해야 함" | PASS | [B-Regression-EventClosed.log:56](B-Regression-EventClosed.log) |
| 53 | [s05-assert] "terminal 대기 요청이 현재 범위를 축소하면 거부해야 함" | PASS | [B-Regression-EventClosed.log:57](B-Regression-EventClosed.log) |
| 54 | [s05-assert] "미해석 후속 PTS는 기존 UTC 범위와 별도 field로 round-trip해야 함" | PASS | [B-Regression-EventClosed.log:58](B-Regression-EventClosed.log) |
| 55 | [s05-assert] "미해석 후속 PTS를 소비하지 않은 terminal 상태를 거부해야 함" | PASS | [B-Regression-EventClosed.log:59](B-Regression-EventClosed.log) |
| 56 | [s05-assert] "서로 겹치는 ordered overlap을 거부해야 함" | PASS | [B-Regression-EventClosed.log:60](B-Regression-EventClosed.log) |
| 57 | [s05-assert] "overlap/missing이 requested range를 정확히 분할하지 않으면 거부해야 함" | PASS | [B-Regression-EventClosed.log:61](B-Regression-EventClosed.log) |
| 58 | [s05-assert] "unknown link status를 영속 계약으로 허용하면 안 됨" | PASS | [B-Regression-EventClosed.log:62](B-Regression-EventClosed.log) |
| 59 | [s05-assert] "locator 없는 fallback evidence를 거부해야 함" | PASS | [B-Regression-EventClosed.log:63](B-Regression-EventClosed.log) |
| 60 | [s05-assert] "journal open 실패: " | PASS | [B-Regression-EventClosed.log:64](B-Regression-EventClosed.log) |
| 61 | [s05-assert] "catalog open 실패: " | PASS | [B-Regression-EventClosed.log:65](B-Regression-EventClosed.log) |
| 62 | [s05-assert] "event link 갱신은 SQLite primary projection에서 검증해야 함" | PASS | [B-Regression-EventClosed.log:66](B-Regression-EventClosed.log) |
| 63 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventClosed.log:67](B-Regression-EventClosed.log) |
| 64 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventClosed.log:68](B-Regression-EventClosed.log) |
| 65 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventClosed.log:69](B-Regression-EventClosed.log) |
| 66 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventClosed.log:70](B-Regression-EventClosed.log) |
| 67 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventClosed.log:71](B-Regression-EventClosed.log) |
| 68 | [s05-assert] "retention policy 실패: " | PASS | [B-Regression-EventClosed.log:72](B-Regression-EventClosed.log) |
| 69 | [s05-assert] "이벤트 저장 worker를 막지 않고 파생 job을 pending으로 enqueue해야 함" | PASS | [B-Regression-EventClosed.log:73](B-Regression-EventClosed.log) |
| 70 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventClosed.log:74](B-Regression-EventClosed.log) |
| 71 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventClosed.log:75](B-Regression-EventClosed.log) |
| 72 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventClosed.log:76](B-Regression-EventClosed.log) |
| 73 | [s05-assert] "완전한 archive 파생 완료 뒤 ready clip을 반환해야 함" | PASS | [B-Regression-EventClosed.log:77](B-Regression-EventClosed.log) |
| 74 | [s05-assert] "event link ID와 derived clip path가 반환되어야 함" | PASS | [B-Regression-EventClosed.log:78](B-Regression-EventClosed.log) |
| 75 | [s05-assert] "반개구간 overlap은 맞닿기만 한 segment를 제외해야 함" | PASS | [B-Regression-EventClosed.log:79](B-Regression-EventClosed.log) |
| 76 | [s05-assert] "media PTS event 범위가 segment epoch 기준 UTC로 변환되어야 함" | PASS | [B-Regression-EventClosed.log:80](B-Regression-EventClosed.log) |
| 77 | [s05-assert] "overlap segment가 UTC 순서로 전달되어야 함" | PASS | [B-Regression-EventClosed.log:81](B-Regression-EventClosed.log) |
| 78 | [s05-assert] "파생 성공 link가 catalog complete로 저장되어야 함" | PASS | [B-Regression-EventClosed.log:82](B-Regression-EventClosed.log) |
| 79 | [s05-assert] "파생 완료 뒤 원본 hold가 해제되어야 함" | PASS | [B-Regression-EventClosed.log:83](B-Regression-EventClosed.log) |
| 80 | [s05-assert] "파생 완료 뒤 원본 hold가 해제되어야 함" | PASS | [B-Regression-EventClosed.log:84](B-Regression-EventClosed.log) |
| 81 | [s05-assert] "파생 완료 뒤 원본 hold가 해제되어야 함" | PASS | [B-Regression-EventClosed.log:85](B-Regression-EventClosed.log) |
| 82 | [s05-assert] "같은 event update는 파생 clip을 중복 생성하지 않아야 함" | PASS | [B-Regression-EventClosed.log:86](B-Regression-EventClosed.log) |
| 83 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventClosed.log:87](B-Regression-EventClosed.log) |
| 84 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventClosed.log:88](B-Regression-EventClosed.log) |
| 85 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventClosed.log:89](B-Regression-EventClosed.log) |
| 86 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventClosed.log:90](B-Regression-EventClosed.log) |
| 87 | [s05-assert] "완료 event의 더 넓은 update는 range별 결정 ID로 다시 파생해야 함" | PASS | [B-Regression-EventClosed.log:91](B-Regression-EventClosed.log) |
| 88 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventClosed.log:92](B-Regression-EventClosed.log) |
| 89 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventClosed.log:93](B-Regression-EventClosed.log) |
| 90 | [s05-assert] "cam-b policy 실패: " | PASS | [B-Regression-EventClosed.log:94](B-Regression-EventClosed.log) |
| 91 | [s05-assert] "archive gap이 있으면 complete로 표시하면 안 됨" | PASS | [B-Regression-EventClosed.log:95](B-Regression-EventClosed.log) |
| 92 | [s05-assert] "link가 정확한 missing UTC range를 보존해야 함" | PASS | [B-Regression-EventClosed.log:96](B-Regression-EventClosed.log) |
| 93 | [s05-assert] "frame-buffer fallback 뒤 같은 link가 fallback evidence로 갱신되어야 함" | PASS | [B-Regression-EventClosed.log:97](B-Regression-EventClosed.log) |
| 94 | [s05-assert] "같은 event link의 overlap/fallback 갱신 뒤에도 SQLite projection을 유지해야 함" | PASS | [B-Regression-EventClosed.log:98](B-Regression-EventClosed.log) |
| 95 | [s05-assert] "cam-late policy 실패: " | PASS | [B-Regression-EventClosed.log:99](B-Regression-EventClosed.log) |
| 96 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventClosed.log:100](B-Regression-EventClosed.log) |
| 97 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventClosed.log:101](B-Regression-EventClosed.log) |
| 98 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventClosed.log:102](B-Regression-EventClosed.log) |
| 99 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventClosed.log:103](B-Regression-EventClosed.log) |
| 100 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventClosed.log:104](B-Regression-EventClosed.log) |
| 101 | [s05-assert] "anchor 없는 PTS를 finalized segment의 실제 PTS/UTC mapping으로 복구해야 함" | PASS | [B-Regression-EventClosed.log:105](B-Regression-EventClosed.log) |
| 102 | [s05-assert] "PTS epoch anchor가 없으면 임의 UTC 연결이나 파생을 하면 안 됨" | PASS | [B-Regression-EventClosed.log:106](B-Regression-EventClosed.log) |
| 103 | [s05-assert] "anchor 없는 PTS는 UTC field가 아니라 재해석 가능한 PTS range로 보존해야 함" | PASS | [B-Regression-EventClosed.log:107](B-Regression-EventClosed.log) |
| 104 | [s05-assert] "같은 긴 prefix의 event ID도 SHA-256 기반 결정 ID가 충돌하면 안 됨" | PASS | [B-Regression-EventClosed.log:108](B-Regression-EventClosed.log) |
| 105 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventClosed.log:109](B-Regression-EventClosed.log) |
| 106 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventClosed.log:110](B-Regression-EventClosed.log) |
| 107 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventClosed.log:111](B-Regression-EventClosed.log) |
| 108 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventClosed.log:112](B-Regression-EventClosed.log) |
| 109 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventClosed.log:113](B-Regression-EventClosed.log) |
| 110 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventClosed.log:114](B-Regression-EventClosed.log) |
| 111 | [s05-assert] "확장 회귀 journal open 실패: " | PASS | [B-Regression-EventClosed.log:115](B-Regression-EventClosed.log) |
| 112 | [s05-assert] "확장 회귀 initial catalog open 실패: " | PASS | [B-Regression-EventClosed.log:116](B-Regression-EventClosed.log) |
| 113 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventClosed.log:117](B-Regression-EventClosed.log) |
| 114 | [s05-assert] "cleanup 확장 fixture 저장 실패: " | PASS | [B-Regression-EventClosed.log:118](B-Regression-EventClosed.log) |
| 115 | [s05-assert] "cleanup 확장 fixture 저장 실패: " | PASS | [B-Regression-EventClosed.log:119](B-Regression-EventClosed.log) |
| 116 | [s05-assert] "확장 회귀 restart catalog open 실패: " | PASS | [B-Regression-EventClosed.log:120](B-Regression-EventClosed.log) |
| 117 | [s05-assert] "확장 policy 실패" | PASS | [B-Regression-EventClosed.log:121](B-Regression-EventClosed.log) |
| 118 | [s05-assert] "cleanup 확장 remux 실패는 한 번만 실행되어야 함" | PASS | [B-Regression-EventClosed.log:122](B-Regression-EventClosed.log) |
| 119 | [s05-assert] "실패/Partial도 보류 확장 요청을 현재 범위로 소비해 보존해야 함" | PASS | [B-Regression-EventClosed.log:123](B-Regression-EventClosed.log) |
| 120 | [s05-assert] "실패/Partial도 보류 확장 요청을 현재 범위로 소비해 보존해야 함" | PASS | [B-Regression-EventClosed.log:124](B-Regression-EventClosed.log) |
| 121 | [s05-assert] "PTS 확장은 다른 범위 ID를 사용해야 함" | PASS | [B-Regression-EventClosed.log:125](B-Regression-EventClosed.log) |
| 122 | [s05-assert] "미해석 PTS 확장을 이전 complete clip으로 응답하면 안 됨" | PASS | [B-Regression-EventClosed.log:126](B-Regression-EventClosed.log) |
| 123 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventClosed.log:127](B-Regression-EventClosed.log) |
| 124 | [s05-assert] "PTS 확장 2회는 최초 포함 총 3회 파생해야 함" | PASS | [B-Regression-EventClosed.log:128](B-Regression-EventClosed.log) |
| 125 | [s05-assert] "quota journal open 실패: " | PASS | [B-Regression-EventClosed.log:129](B-Regression-EventClosed.log) |
| 126 | [s05-assert] "quota catalog open 실패: " | PASS | [B-Regression-EventClosed.log:130](B-Regression-EventClosed.log) |
| 127 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventClosed.log:131](B-Regression-EventClosed.log) |
| 128 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventClosed.log:132](B-Regression-EventClosed.log) |
| 129 | [s05-assert] "quota policy 실패: " | PASS | [B-Regression-EventClosed.log:133](B-Regression-EventClosed.log) |
| 130 | [s05-assert] "event quota는 oldest event를 정리해 새 event write를 허용해야 함: ok" | PASS | [B-Regression-EventClosed.log:134](B-Regression-EventClosed.log) |
| 131 | [s05-assert] "event quota 충족을 위해 continuous를 삭제하면 안 됨" | PASS | [B-Regression-EventClosed.log:135](B-Regression-EventClosed.log) |
| 132 | [s05-assert] "event quota는 oldest eligible event를 삭제해야 함" | PASS | [B-Regression-EventClosed.log:136](B-Regression-EventClosed.log) |
| 133 | [s05-assert] "policy 재등록 실패: " | PASS | [B-Regression-EventClosed.log:137](B-Regression-EventClosed.log) |
| 134 | [s05-assert] "policy 제거가 진행 중 event reservation을 지우면 안 됨" | PASS | [B-Regression-EventClosed.log:138](B-Regression-EventClosed.log) |
| 135 | [s05-assert] "명시적 complete 뒤 event reservation ID를 재사용할 수 있어야 함" | PASS | [B-Regression-EventClosed.log:139](B-Regression-EventClosed.log) |
| 136 | [s05-assert] "queue journal open 실패: " | PASS | [B-Regression-EventClosed.log:140](B-Regression-EventClosed.log) |
| 137 | [s05-assert] "queue catalog open 실패: " | PASS | [B-Regression-EventClosed.log:141](B-Regression-EventClosed.log) |
| 138 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventClosed.log:142](B-Regression-EventClosed.log) |
| 139 | [s05-assert] "queue policy 실패: " | PASS | [B-Regression-EventClosed.log:143](B-Regression-EventClosed.log) |
| 140 | [s05-assert] "bounded queue 밖 durable pending도 완료 뒤 다시 흡수해야 함" | PASS | [B-Regression-EventClosed.log:144](B-Regression-EventClosed.log) |
| 141 | [s05-assert] "긴 event remux가 다른 이벤트의 durable link admission을 동기 차단하면 안 됨" | PASS | [B-Regression-EventClosed.log:145](B-Regression-EventClosed.log) |
| 142 | [s05-assert] "cleanup 실패 시 source hold와 event reservation을 성공처럼 해제하면 안 됨" | PASS | [B-Regression-EventClosed.log:146](B-Regression-EventClosed.log) |
| 143 | [s05-assert] "terminal marker unlink 실패 시 source/output hold를 유지해야 함" | PASS | [B-Regression-EventClosed.log:147](B-Regression-EventClosed.log) |
| 144 | [s05-assert] "terminal marker unlink 실패 시 event reservation을 유지해야 함" | PASS | [B-Regression-EventClosed.log:148](B-Regression-EventClosed.log) |
| 145 | [s05-assert] "marker 복구 중 event/fallback 갱신은 자원·단계를 보존하고 확장 요청을 내구 대기해야 함" | PASS | [B-Regression-EventClosed.log:149](B-Regression-EventClosed.log) |
| 146 | [s05-assert] "terminal hold 해제 실패를 Complete로 기록하면 안 됨" | PASS | [B-Regression-EventClosed.log:150](B-Regression-EventClosed.log) |
| 147 | [s05-assert] "terminal 복구 중 event/fallback 갱신이 release 단계를 덮어쓰면 안 됨" | PASS | [B-Regression-EventClosed.log:151](B-Regression-EventClosed.log) |
| 148 | [s05-assert] "복구 완료 뒤 내구 대기한 범위 확장은 같은 source epoch의 새 segment로 파생해야 함" | PASS | [B-Regression-EventClosed.log:152](B-Regression-EventClosed.log) |
| 149 | [s05-assert] "terminal complete commit retry fixture 저장 실패: " | PASS | [B-Regression-EventClosed.log:153](B-Regression-EventClosed.log) |
| 150 | [s05-assert] "complete commit 재시도는 다른 pending event의 source hold를 해제하면 안 됨" | PASS | [B-Regression-EventClosed.log:154](B-Regression-EventClosed.log) |
| 151 | [s05-assert] "overflow fixture 이전 hold_count가 저장 범위를 넘으면 안 됨" | PASS | [B-Regression-EventClosed.log:155](B-Regression-EventClosed.log) |
| 152 | [s05-assert] "hold overflow fixture 준비 실패: " | PASS | [B-Regression-EventClosed.log:156](B-Regression-EventClosed.log) |
| 153 | [s05-assert] "event source lease hold_count overflow를 사전에 거부해야 함" | PASS | [B-Regression-EventClosed.log:157](B-Regression-EventClosed.log) |
| 154 | [s05-assert] "hold fixture journal open 실패: " | PASS | [B-Regression-EventClosed.log:158](B-Regression-EventClosed.log) |
| 155 | [s05-assert] "hold fixture catalog open 실패: " | PASS | [B-Regression-EventClosed.log:159](B-Regression-EventClosed.log) |
| 156 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventClosed.log:160](B-Regression-EventClosed.log) |
| 157 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventClosed.log:161](B-Regression-EventClosed.log) |
| 158 | [s05-assert] "hold pending link 저장 실패: " | PASS | [B-Regression-EventClosed.log:162](B-Regression-EventClosed.log) |
| 159 | [s05-assert] "hold replay journal open 실패: " | PASS | [B-Regression-EventClosed.log:163](B-Regression-EventClosed.log) |
| 160 | [s05-assert] "hold replay catalog open 실패: " | PASS | [B-Regression-EventClosed.log:164](B-Regression-EventClosed.log) |
| 161 | [s05-assert] "재시작 replay가 terminal 전 output/source hold를 함께 복원해야 함" | PASS | [B-Regression-EventClosed.log:165](B-Regression-EventClosed.log) |
| 162 | [s05-assert] "terminal stage fixture event link 조회" | PASS | [B-Regression-EventClosed.log:166](B-Regression-EventClosed.log) |
| 163 | [s05-assert] "terminal stage fixture 저장 실패: " | PASS | [B-Regression-EventClosed.log:167](B-Regression-EventClosed.log) |
| 164 | [s05-assert] "terminal stage replay journal open: " | PASS | [B-Regression-EventClosed.log:168](B-Regression-EventClosed.log) |
| 165 | [s05-assert] "terminal stage catalog open: " | PASS | [B-Regression-EventClosed.log:169](B-Regression-EventClosed.log) |
| 166 | [s05-assert] "complete commit 단계 재시작은 이미 해제된 output/source hold를 복원하면 안 됨" | PASS | [B-Regression-EventClosed.log:170](B-Regression-EventClosed.log) |
| 167 | [s05-assert] "terminal Complete 기록 전 source 삭제 요청을 차단해야 함" | PASS | [B-Regression-EventClosed.log:171](B-Regression-EventClosed.log) |
| 168 | [s05-assert] "terminal Complete 기록 전 output 삭제 요청을 차단해야 함" | PASS | [B-Regression-EventClosed.log:172](B-Regression-EventClosed.log) |
| 169 | [s05-assert] "restart journal open 실패: " | PASS | [B-Regression-EventClosed.log:173](B-Regression-EventClosed.log) |
| 170 | [s05-assert] "restart catalog open 실패: " | PASS | [B-Regression-EventClosed.log:174](B-Regression-EventClosed.log) |
| 171 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventClosed.log:175](B-Regression-EventClosed.log) |
| 172 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventClosed.log:176](B-Regression-EventClosed.log) |
| 173 | [s05-assert] "restart pending link 저장 실패: " | PASS | [B-Regression-EventClosed.log:177](B-Regression-EventClosed.log) |
| 174 | [s05-assert] "재시작은 이미 finalized된 결정적 event segment를 재파생 없이 연결해야 함" | PASS | [B-Regression-EventClosed.log:178](B-Regression-EventClosed.log) |
| 175 | [s05-assert] "재시작 복구에서 event clip을 중복 파생하면 안 됨" | PASS | [B-Regression-EventClosed.log:179](B-Regression-EventClosed.log) |
| 176 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventClosed.log:180](B-Regression-EventClosed.log) |
| 177 | [s05-assert] "conflict pending link 저장 실패: " | PASS | [B-Regression-EventClosed.log:181](B-Regression-EventClosed.log) |
| 178 | [s05-assert] "다른 channel/class의 동일 segment ID를 event 결과로 오인하면 안 됨" | PASS | [B-Regression-EventClosed.log:182](B-Regression-EventClosed.log) |
| 179 | [s05-assert] "segment ID conflict에서 파생을 실행하면 안 됨" | PASS | [B-Regression-EventClosed.log:183](B-Regression-EventClosed.log) |
| 180 | [s05-assert] "실제 H264/MP4 source를 video 재인코딩 없이 remux해야 함: " | PASS | [B-Regression-EventClosed.log:184](B-Regression-EventClosed.log) |
| 181 | [s05-assert] "remux 결과 파일과 size가 일치해야 함" | PASS | [B-Regression-EventClosed.log:185](B-Regression-EventClosed.log) |
| 182 | [s05-assert] "event clip actual range는 keyframe 확대를 측정해 requested range와 분리해야 함" | PASS | [B-Regression-EventClosed.log:186](B-Regression-EventClosed.log) |
| 183 | [s05-assert] "event clip이 source segment 전체 단순 연결보다 작아야 함" | PASS | [B-Regression-EventClosed.log:187](B-Regression-EventClosed.log) |
| 184 | [s05-assert] "remux 결과 checksum과 crash cleanup marker를 남겨야 함" | PASS | [B-Regression-EventClosed.log:188](B-Regression-EventClosed.log) |
| 185 | [s05-assert] "동일 final은 소유 artifact가 없는 terminal 충돌로 거부하고 기존 clip을 보존해야 함" | PASS | [B-Regression-EventClosed.log:189](B-Regression-EventClosed.log) |
| 186 | [s05-assert] "파생 H264/MP4 clip이 끝까지 demux/parse 가능해야 함: " | PASS | [B-Regression-EventClosed.log:190](B-Regression-EventClosed.log) |
| 187 | [s05-assert] "nonce partial은 foreign 고정 partial을 보존하면서 독립 파생되어야 함" | PASS | [B-Regression-EventClosed.log:191](B-Regression-EventClosed.log) |
| 188 | [s05-assert] "event remux recovery journal open 실패: " | PASS | [B-Regression-EventClosed.log:192](B-Regression-EventClosed.log) |
| 189 | [s05-assert] "재시작은 marker nonce와 일치하는 owned crash partial만 정리해야 함: " | PASS | [B-Regression-EventClosed.log:193](B-Regression-EventClosed.log) |
| 190 | [s05-assert] "owned crash partial 복구 뒤 동일 event clip 재파생이 성공해야 함: " | PASS | [B-Regression-EventClosed.log:194](B-Regression-EventClosed.log) |
| 191 | [s05-assert] "VP8/WebM test source 생성 실패: " | PASS | [B-Regression-EventClosed.log:195](B-Regression-EventClosed.log) |
| 192 | [s05-assert] "VP8/WebM test source demux 실패: " | PASS | [B-Regression-EventClosed.log:196](B-Regression-EventClosed.log) |
| 193 | [s05-assert] "검증되지 않은 VP8/WebM event remux는 산출물 없이 fail-closed해야 함" | PASS | [B-Regression-EventClosed.log:197](B-Regression-EventClosed.log) |
| 194 | - PASS: application header is standard-only with exact DTO/default manifests | PASS | [B-Regression-EventClosed.log:199](B-Regression-EventClosed.log) |
| 195 | - PASS: application source owns exact canonical mapping and overwrite semantics | PASS | [B-Regression-EventClosed.log:200](B-Regression-EventClosed.log) |
| 196 | - PASS: transport has zero canonical bypass and exact projection/call ordering | PASS | [B-Regression-EventClosed.log:201](B-Regression-EventClosed.log) |
| 197 | - PASS: recording link is durably admitted before the bounded storage queue can drop an event | PASS | [B-Regression-EventClosed.log:202](B-Regression-EventClosed.log) |
| 198 | - PASS: event clip output remains fd-bound and measured before no-replace publication | PASS | [B-Regression-EventClosed.log:203](B-Regression-EventClosed.log) |
| 199 | - PASS: compiled fake canonical matrix preserves all fields failure/null outputs and lifecycle order | PASS | [B-Regression-EventClosed.log:204](B-Regression-EventClosed.log) |
| 200 | - PASS: S05 구성은 생산자 전에 bridge를 등록하고 의존성 종료 전에 drain한다 | PASS | [B-Regression-EventClosed.log:205](B-Regression-EventClosed.log) |
| 201 | [s05-runtime-assert] {"case":"disabled-admit","message":"실제 EventStorage worker 진입을 관찰한다"} | PASS | [B-Regression-EventClosed.log:207](B-Regression-EventClosed.log) |
| 202 | [s05-runtime-assert] {"case":"disabled-admit","message":"worker 처리 전에 첫 이벤트 연결이 내구 접수된다"} | PASS | [B-Regression-EventClosed.log:208](B-Regression-EventClosed.log) |
| 203 | [s05-runtime-assert] {"case":"disabled-admit","message":"실제 저장 큐 크기 2에서 다섯 접수 중 두 이벤트가 퇴출된다"} | PASS | [B-Regression-EventClosed.log:209](B-Regression-EventClosed.log) |
| 204 | [s05-runtime-assert] {"case":"disabled-admit","message":"퇴출 이벤트를 포함한 다섯 PTS 연결이 worker 해제 전에 보존된다"} | PASS | [B-Regression-EventClosed.log:210](B-Regression-EventClosed.log) |
| 205 | [s05-runtime-assert] {"case":"disabled-admit","message":"저장 worker drain 뒤에도 다섯 연결과 시간축이 보존된다"} | PASS | [B-Regression-EventClosed.log:211](B-Regression-EventClosed.log) |
| 206 | [s05-runtime-assert] {"case":"disabled-admit","message":"JSONL 설정에 따른 실제 저장 수와 빈 큐를 확인한다"} | PASS | [B-Regression-EventClosed.log:212](B-Regression-EventClosed.log) |
| 207 | [s05-runtime-assert] {"case":"disabled-admit","message":"JSONL 비활성은 파일 없음이고 활성은 생존 이벤트 세 개와 link ID가 일치한다"} | PASS | [B-Regression-EventClosed.log:213](B-Regression-EventClosed.log) |
| 208 | [s05-runtime-assert] {"case":"disabled-recover","message":"새 프로세스의 빈 SQLite를 journal로 재구축해 다섯 PTS 연결을 복구한다"} | PASS | [B-Regression-EventClosed.log:215](B-Regression-EventClosed.log) |
| 209 | [s05-runtime-assert] {"case":"disabled-recover","message":"퇴출 이벤트까지 UTC 매핑 후 다섯 실제 H264 파생 파일이 완료된다"} | PASS | [B-Regression-EventClosed.log:216](B-Regression-EventClosed.log) |
| 210 | [s05-runtime-assert] {"case":"disabled-recover","message":"같은 이벤트 재접수는 복구된 다섯 clip ID를 바꾸거나 추가하지 않는다"} | PASS | [B-Regression-EventClosed.log:217](B-Regression-EventClosed.log) |
| 211 | [s05-runtime-assert] {"case":"enabled-admit","message":"실제 EventStorage worker 진입을 관찰한다"} | PASS | [B-Regression-EventClosed.log:219](B-Regression-EventClosed.log) |
| 212 | [s05-runtime-assert] {"case":"enabled-admit","message":"worker 처리 전에 첫 이벤트 연결이 내구 접수된다"} | PASS | [B-Regression-EventClosed.log:220](B-Regression-EventClosed.log) |
| 213 | [s05-runtime-assert] {"case":"enabled-admit","message":"실제 저장 큐 크기 2에서 다섯 접수 중 두 이벤트가 퇴출된다"} | PASS | [B-Regression-EventClosed.log:221](B-Regression-EventClosed.log) |
| 214 | [s05-runtime-assert] {"case":"enabled-admit","message":"퇴출 이벤트를 포함한 다섯 PTS 연결이 worker 해제 전에 보존된다"} | PASS | [B-Regression-EventClosed.log:222](B-Regression-EventClosed.log) |
| 215 | [s05-runtime-assert] {"case":"enabled-admit","message":"저장 worker drain 뒤에도 다섯 연결과 시간축이 보존된다"} | PASS | [B-Regression-EventClosed.log:223](B-Regression-EventClosed.log) |
| 216 | [s05-runtime-assert] {"case":"enabled-admit","message":"JSONL 설정에 따른 실제 저장 수와 빈 큐를 확인한다"} | PASS | [B-Regression-EventClosed.log:224](B-Regression-EventClosed.log) |
| 217 | [s05-runtime-assert] {"case":"enabled-admit","message":"JSONL 비활성은 파일 없음이고 활성은 생존 이벤트 세 개와 link ID가 일치한다"} | PASS | [B-Regression-EventClosed.log:225](B-Regression-EventClosed.log) |
| 218 | [s05-runtime-assert] {"case":"enabled-recover","message":"새 프로세스의 빈 SQLite를 journal로 재구축해 다섯 PTS 연결을 복구한다"} | PASS | [B-Regression-EventClosed.log:227](B-Regression-EventClosed.log) |
| 219 | [s05-runtime-assert] {"case":"enabled-recover","message":"퇴출 이벤트까지 UTC 매핑 후 다섯 실제 H264 파생 파일이 완료된다"} | PASS | [B-Regression-EventClosed.log:228](B-Regression-EventClosed.log) |
| 220 | [s05-runtime-assert] {"case":"enabled-recover","message":"같은 이벤트 재접수는 복구된 다섯 clip ID를 바꾸거나 추가하지 않는다"} | PASS | [B-Regression-EventClosed.log:229](B-Regression-EventClosed.log) |
| 221 | [s05-runtime-assert] {"case":"shutdown-cancel","message":"post-event frame 대기 중인 실제 storage worker를 관찰한다"} | PASS | [B-Regression-EventClosed.log:231](B-Regression-EventClosed.log) |
| 222 | [s05-runtime-assert] {"case":"shutdown-cancel","message":"종료 신호가 post-event frame 대기를 깨워 1초 안에 worker를 drain한다"} | PASS | [B-Regression-EventClosed.log:232](B-Regression-EventClosed.log) |
| 223 | [s05-runtime-assert] {"case":"shutdown-cancel","message":"frame 대기 취소 뒤에도 EventRecord JSONL을 유실하지 않는다"} | PASS | [B-Regression-EventClosed.log:233](B-Regression-EventClosed.log) |
| 224 | [s05-runtime-mutation] disabled-guard: PASS (실제 assertion의 RED 확인) | PASS | [B-Regression-EventClosed.log:235](B-Regression-EventClosed.log) |
| 225 | [s05-runtime-mutation] prequeue-admission: PASS (실제 assertion의 RED 확인) | PASS | [B-Regression-EventClosed.log:236](B-Regression-EventClosed.log) |
| 226 | [s05-action] {"id":"V410-S05-I01","status":"PASS","checks":[{"id":"V410-S05-I01-C01","status":"PASS","executions":1},{"id":"V410-S05-I01-C02","status":"PASS","executions":1},{"id":"V410-S05-I01-C03","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:239](B-Regression-EventClosed.log) |
| 227 | [s05-action] {"id":"V410-S05-I02","status":"PASS","checks":[{"id":"V410-S05-I02-C01","status":"PASS","executions":1},{"id":"V410-S05-I02-C02","status":"PASS","executions":1},{"id":"V410-S05-I02-C03","status":"PASS","executions":1},{"id":"V410-S05-I02-C04","status":"PASS","executions":1},{"id":"V410-S05-I02-C05","status":"PASS","executions":1},{"id":"V410-S05-I02-C06","status":"PASS","executions":1},{"id":"V410-S05-I02-C07","status":"PASS","executions":1},{"id":"V410-S05-I02-C08","status":"PASS","executions":1},{"id":"V410-S05-I02-C09","status":"PASS","executions":1},{"id":"V410-S05-I02-C10","status":"PASS","executions":1},{"id":"V410-S05-I02-C11","status":"PASS","executions":1},{"id":"V410-S05-I02-C12","status":"PASS","executions":1},{"id":"V410-S05-I02-C13","status":"PASS","executions":1},{"id":"V410-S05-I02-C14","status":"PASS","executions":1},{"id":"V410-S05-I02-C15","status":"PASS","executions":1},{"id":"V410-S05-I02-C16","status":"PASS","executions":1},{"id":"V410-S05-I02-C17","status":"PASS","executions":1},{"id":"V410-S05-I02-C18","status":"PASS","executions":1},{"id":"V410-S05-I02-C19","status":"PASS","executions":1},{"id":"V410-S05-I02-C20","status":"PASS","executions":1},{"id":"V410-S05-I02-C21","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:240](B-Regression-EventClosed.log) |
| 228 | [s05-action] {"id":"V410-S05-I03","status":"PASS","checks":[{"id":"V410-S05-I03-C01","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:241](B-Regression-EventClosed.log) |
| 229 | [s05-action] {"id":"V410-S05-I04","status":"PASS","checks":[{"id":"V410-S05-I04-C01","status":"PASS","executions":1},{"id":"V410-S05-I04-C02","status":"PASS","executions":1},{"id":"V410-S05-I04-C03","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:242](B-Regression-EventClosed.log) |
| 230 | [s05-action] {"id":"V410-S05-I05","status":"PASS","checks":[{"id":"V410-S05-I05-C01","status":"PASS","executions":1},{"id":"V410-S05-I05-C02","status":"PASS","executions":1},{"id":"V410-S05-I05-C03","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:243](B-Regression-EventClosed.log) |
| 231 | [s05-action] {"id":"V410-S05-I06","status":"PASS","checks":[{"id":"V410-S05-I06-C01","status":"PASS","executions":1},{"id":"V410-S05-I06-C02","status":"PASS","executions":1},{"id":"V410-S05-I06-C03","status":"PASS","executions":1},{"id":"V410-S05-I06-C04","status":"PASS","executions":1},{"id":"V410-S05-I06-C05","status":"PASS","executions":1},{"id":"V410-S05-I06-C06","status":"PASS","executions":1},{"id":"V410-S05-I06-C07","status":"PASS","executions":1},{"id":"V410-S05-I06-C08","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:244](B-Regression-EventClosed.log) |
| 232 | [s05-action] {"id":"V410-S05-I07","status":"PASS","checks":[{"id":"V410-S05-I07-C01","status":"PASS","executions":1},{"id":"V410-S05-I07-C02","status":"PASS","executions":1},{"id":"V410-S05-I07-C03","status":"PASS","executions":1},{"id":"V410-S05-I07-C04","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:245](B-Regression-EventClosed.log) |
| 233 | [s05-action] {"id":"V410-S05-I08","status":"PASS","checks":[{"id":"V410-S05-I08-C01","status":"PASS","executions":17},{"id":"V410-S05-I08-C02","status":"PASS","executions":3}]} | PASS | [B-Regression-EventClosed.log:246](B-Regression-EventClosed.log) |
| 234 | [s05-action] {"id":"V410-S05-I09","status":"PASS","checks":[{"id":"V410-S05-I09-C01","status":"PASS","executions":1},{"id":"V410-S05-I09-C02","status":"PASS","executions":1},{"id":"V410-S05-I09-C03","status":"PASS","executions":1},{"id":"V410-S05-I09-C04","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:247](B-Regression-EventClosed.log) |
| 235 | [s05-action] {"id":"V410-S05-I10","status":"PASS","checks":[{"id":"V410-S05-I10-C01","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:248](B-Regression-EventClosed.log) |
| 236 | [s05-action] {"id":"V410-S05-I11","status":"PASS","checks":[{"id":"V410-S05-I11-C01","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:249](B-Regression-EventClosed.log) |
| 237 | [s05-action] {"id":"V410-S05-I12","status":"PASS","checks":[{"id":"V410-S05-I12-C01","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:250](B-Regression-EventClosed.log) |
| 238 | [s05-action] {"id":"V410-S05-I13","status":"PASS","checks":[{"id":"V410-S05-I13-C01","status":"PASS","executions":1},{"id":"V410-S05-I13-C02","status":"PASS","executions":1},{"id":"V410-S05-I13-C03","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:251](B-Regression-EventClosed.log) |
| 239 | [s05-action] {"id":"V410-S05-I14","status":"PASS","checks":[{"id":"V410-S05-I14-C01","status":"PASS","executions":1},{"id":"V410-S05-I14-C02","status":"PASS","executions":1},{"id":"V410-S05-I14-C03","status":"PASS","executions":1},{"id":"V410-S05-I14-C04","status":"PASS","executions":1},{"id":"V410-S05-I14-C05","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:252](B-Regression-EventClosed.log) |
| 240 | [s05-action] {"id":"V410-S05-I15","status":"PASS","checks":[{"id":"V410-S05-I15-C01","status":"PASS","executions":1},{"id":"V410-S05-I15-C02","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:253](B-Regression-EventClosed.log) |
| 241 | [s05-action] {"id":"V410-S05-I16","status":"PASS","checks":[{"id":"V410-S05-I16-C01","status":"PASS","executions":1},{"id":"V410-S05-I16-C02","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:254](B-Regression-EventClosed.log) |
| 242 | [s05-action] {"id":"V410-S05-I17","status":"PASS","checks":[{"id":"V410-S05-I17-C01","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:255](B-Regression-EventClosed.log) |
| 243 | [s05-action] {"id":"V410-S05-I18","status":"PASS","checks":[{"id":"V410-S05-I18-C01","status":"PASS","executions":1},{"id":"V410-S05-I18-C02","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:256](B-Regression-EventClosed.log) |
| 244 | [s05-action] {"id":"V410-S05-I19","status":"PASS","checks":[{"id":"V410-S05-I19-C01","status":"PASS","executions":1},{"id":"V410-S05-I19-C02","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:257](B-Regression-EventClosed.log) |
| 245 | [s05-action] {"id":"V410-S05-I20","status":"PASS","checks":[{"id":"V410-S05-I20-C01","status":"PASS","executions":1},{"id":"V410-S05-I20-C02","status":"PASS","executions":1},{"id":"V410-S05-I20-C03","status":"PASS","executions":1},{"id":"V410-S05-I20-C04","status":"PASS","executions":1},{"id":"V410-S05-I20-C05","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:258](B-Regression-EventClosed.log) |
| 246 | [s05-action] {"id":"V410-S05-I21","status":"PASS","checks":[{"id":"V410-S05-I21-C01","status":"PASS","executions":1},{"id":"V410-S05-I21-C02","status":"PASS","executions":2},{"id":"V410-S05-I21-C03","status":"PASS","executions":1},{"id":"V410-S05-I21-C04","status":"PASS","executions":1},{"id":"V410-S05-I21-C05","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:259](B-Regression-EventClosed.log) |
| 247 | [s05-action] {"id":"V410-S05-I22","status":"PASS","checks":[{"id":"V410-S05-I22-C01","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:260](B-Regression-EventClosed.log) |
| 248 | [s05-action] {"id":"V410-S05-I23","status":"PASS","checks":[{"id":"V410-S05-I23-C01","status":"PASS","executions":1},{"id":"V410-S05-I23-C02","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:261](B-Regression-EventClosed.log) |
| 249 | [s05-action] {"id":"V410-S05-I24","status":"PASS","checks":[{"id":"V410-S05-I24-C01","status":"PASS","executions":1},{"id":"V410-S05-I24-C02","status":"PASS","executions":1},{"id":"V410-S05-I24-C03","status":"PASS","executions":1},{"id":"V410-S05-I24-C04","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:262](B-Regression-EventClosed.log) |
| 250 | [s05-action] {"id":"V410-S05-I25","status":"PASS","checks":[{"id":"V410-S05-I25-C01","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:263](B-Regression-EventClosed.log) |
| 251 | [s05-action] {"id":"V410-S05-I26","status":"PASS","checks":[{"id":"V410-S05-I26-C01","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:264](B-Regression-EventClosed.log) |
| 252 | [s05-action] {"id":"V410-S05-I27","status":"PASS","checks":[{"id":"V410-S05-I27-C01","status":"PASS","executions":1},{"id":"V410-S05-I27-C02","status":"PASS","executions":1},{"id":"V410-S05-I27-C03","status":"PASS","executions":1},{"id":"V410-S05-I27-C04","status":"PASS","executions":1}]} | PASS | [B-Regression-EventClosed.log:265](B-Regression-EventClosed.log) |

## Regression-Identity

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [identity-pass] V410-IDMAP-I01 | PASS | [B-Regression-Identity.log:1](B-Regression-Identity.log) |
| 2 | [identity-pass] V410-IDMAP-I02 | PASS | [B-Regression-Identity.log:2](B-Regression-Identity.log) |
| 3 | [identity-pass] V410-IDMAP-I03 | PASS | [B-Regression-Identity.log:3](B-Regression-Identity.log) |
| 4 | [identity-pass] V410-IDMAP-I04 | PASS | [B-Regression-Identity.log:4](B-Regression-Identity.log) |
| 5 | [identity-pass] V410-IDMAP-I05 | PASS | [B-Regression-Identity.log:5](B-Regression-Identity.log) |
| 6 | [identity-pass] V410-IDMAP-I06 | PASS | [B-Regression-Identity.log:6](B-Regression-Identity.log) |
| 7 | [identity-pass] V410-IDMAP-I07 | PASS | [B-Regression-Identity.log:7](B-Regression-Identity.log) |
| 8 | [identity-pass] S07-time-session-start | PASS | [B-Regression-Identity.log:8](B-Regression-Identity.log) |
| 9 | [identity-pass] S07-time-session-input | PASS | [B-Regression-Identity.log:9](B-Regression-Identity.log) |
| 10 | [identity-pass] S07-time-session-range | PASS | [B-Regression-Identity.log:10](B-Regression-Identity.log) |
| 11 | [identity-pass] S07-time-session-accepted-gap-null | PASS | [B-Regression-Identity.log:11](B-Regression-Identity.log) |
| 12 | [identity-pass] S07-time-session-ambiguous-channel | PASS | [B-Regression-Identity.log:12](B-Regression-Identity.log) |
| 13 | [identity-pass] S07-time-finalize-success-observer-exception-isolated | PASS | [B-Regression-Identity.log:13](B-Regression-Identity.log) |
| 14 | [identity-pass] S07-time-session-restart | PASS | [B-Regression-Identity.log:14](B-Regression-Identity.log) |
| 15 | [identity-pass] S07-time-session-restart-null | PASS | [B-Regression-Identity.log:15](B-Regression-Identity.log) |
| 16 | [identity-pass] S07-time-finalize-failure-no-observer-stop-null | PASS | [B-Regression-Identity.log:16](B-Regression-Identity.log) |
| 17 | [identity-pass] V410-IDMAP-I08 | PASS | [B-Regression-Identity.log:17](B-Regression-Identity.log) |
| 18 | [identity-pass] V410-IDMAP-I09 | PASS | [B-Regression-Identity.log:18](B-Regression-Identity.log) |
| 19 | [identity-pass] V410-IDMAP-I10 | PASS | [B-Regression-Identity.log:19](B-Regression-Identity.log) |
| 20 | [identity-pass] V410-IDMAP-I11 | PASS | [B-Regression-Identity.log:20](B-Regression-Identity.log) |
| 21 | [identity-pass] V410-IDMAP-I12 | PASS | [B-Regression-Identity.log:21](B-Regression-Identity.log) |
| 22 | [identity-pass] V410-IDMAP-I13 | PASS | [B-Regression-Identity.log:22](B-Regression-Identity.log) |
| 23 | [identity-pass] S07-time-session-blocked-writer-null-nonblocking | PASS | [B-Regression-Identity.log:23](B-Regression-Identity.log) |

## Regression-Jobs

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [pass] J01 실제 선택→compact 내구 job 계약 왕복 | PASS | [B-Regression-Jobs.log:1](B-Regression-Jobs.log) |
| 2 | [pass] J17 무관source8개 추가에도 동일선택 jobID 유지 | PASS | [B-Regression-Jobs.log:3](B-Regression-Jobs.log) |
| 3 | [pass] J18 cleanup wall시계 역행 허용·순서는상태로검사 | PASS | [B-Regression-Jobs.log:4](B-Regression-Jobs.log) |
| 4 | [pass] J04 단일 Intent 원장·보호·예약 원자 가시성 | PASS | [B-Regression-Jobs.log:5](B-Regression-Jobs.log) |
| 5 | [pass] J19 후발 coordinator 일반·파생 admission 및 복구 차단 | PASS | [B-Regression-Jobs.log:6](B-Regression-Jobs.log) |
| 6 | [pass] J02 이후 시각 재Build ID 유지·선택 변경 새 ID | PASS | [B-Regression-Jobs.log:7](B-Regression-Jobs.log) |
| 7 | [pass] J03 unknown·중복·미지원 schema·불완전 JSON·4MiB·예약 상한·미구현 state 거부 | PASS | [B-Regression-Jobs.log:8](B-Regression-Jobs.log) |
| 8 | [pass] J16 소유 경로·attempt·order 계획 조작 거부 | PASS | [B-Regression-Jobs.log:9](B-Regression-Jobs.log) |
| 9 | [pass] J16 실제 2 source UUID 역순이어도 영속 order 순 출력 계획 | PASS | [B-Regression-Jobs.log:10](B-Regression-Jobs.log) |
| 10 | [pass] J08 나중 시각 재요청 최초 시각 유지·예약/경로 충돌·다른 catalog 거부 | PASS | [B-Regression-Jobs.log:11](B-Regression-Jobs.log) |
| 11 | [pass] J06 generic hold 감소로 job 보호 해제 불가·직접 삭제/corrupt 차단 | PASS | [B-Regression-Jobs.log:12](B-Regression-Jobs.log) |
| 12 | [pass] J14 cleanup Failed는 job 자원만 해제·wall 역행·terminal 자동 재시도 없음 | PASS | [B-Regression-Jobs.log:13](B-Regression-Jobs.log) |
| 13 | [pass] J05 pending·corrupt·tombstone·hash·binding 불일치 source 거부 | PASS | [B-Regression-Jobs.log:19](B-Regression-Jobs.log) |
| 14 | [pass] J07 실제 source 삭제/Intent 경쟁에서 둘 중 한 전이만 허용 | PASS | [B-Regression-Jobs.log:20](B-Regression-Jobs.log) |
| 15 | [pass] J10 checkpoint 전후 job·보호·예약 유지 | PASS | [B-Regression-Jobs.log:21](B-Regression-Jobs.log) |
| 16 | [pass] J09 SQLite·fallback·재build/reopen 내구 job 동등·중복 보호 가산 없음 | PASS | [B-Regression-Jobs.log:22](B-Regression-Jobs.log) |
| 17 | [pass] J10 replay 동일 중복 멱등·다른 내용/불완전/schema/전이/보호 상태 거부 | PASS | [B-Regression-Jobs.log:29](B-Regression-Jobs.log) |
| 18 | [pass] J11 같은 채널 memory+동시 durable 예약 합계 event quota 제한 | PASS | [B-Regression-Jobs.log:30](B-Regression-Jobs.log) |
| 19 | [pass] J12 durable outstanding을 continuous/event/derived disk 예약에 포함 | PASS | [B-Regression-Jobs.log:31](B-Regression-Jobs.log) |
| 20 | [pass] J13 snapshot/disk provider 실패는 생성·periodic·복구 삭제 차단 | PASS | [B-Regression-Jobs.log:32](B-Regression-Jobs.log) |
| 21 | [pass] J15 partial unknown·이유·후보·요청 시간축 그대로 보존 | PASS | [B-Regression-Jobs.log:33](B-Regression-Jobs.log) |
| 22 | [pass] J19 정확한 소유자 소멸 후 새 coordinator만 재결박 | PASS | [B-Regression-Jobs.log:34](B-Regression-Jobs.log) |
| 23 | [pass] J20 append 거부 후 원장 복원해도 공통 mutation 차단 | PASS | [B-Regression-Jobs.log:35](B-Regression-Jobs.log) |

## CompositionSelfTestFinal

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | - PASS: D3B-16 supervisor 시작 실패 승인된 종료 순서 | PASS | [B-CompositionSelfTestFinal.log:1](B-CompositionSelfTestFinal.log) |
| 2 | - PASS: D3B-16 supervisor 시작 실패 bridge 미호출 변형 거부 | PASS | [B-CompositionSelfTestFinal.log:2](B-CompositionSelfTestFinal.log) |
| 3 | - PASS: D3B-16 supervisor 시작 실패 early detach 변형 거부 | PASS | [B-CompositionSelfTestFinal.log:3](B-CompositionSelfTestFinal.log) |
| 4 | - PASS: D3B-16 supervisor 시작 실패 경로 누락 변형 거부 | PASS | [B-CompositionSelfTestFinal.log:4](B-CompositionSelfTestFinal.log) |
| 5 | - PASS: D3B-16 RTSP 시작 실패 승인된 종료 순서 | PASS | [B-CompositionSelfTestFinal.log:5](B-CompositionSelfTestFinal.log) |
| 6 | - PASS: D3B-16 RTSP 시작 실패 bridge 미호출 변형 거부 | PASS | [B-CompositionSelfTestFinal.log:6](B-CompositionSelfTestFinal.log) |
| 7 | - PASS: D3B-16 RTSP 시작 실패 early detach 변형 거부 | PASS | [B-CompositionSelfTestFinal.log:7](B-CompositionSelfTestFinal.log) |
| 8 | - PASS: D3B-16 RTSP 시작 실패 경로 누락 변형 거부 | PASS | [B-CompositionSelfTestFinal.log:8](B-CompositionSelfTestFinal.log) |
| 9 | - PASS: D3B-16 RTSP 시작 실패 recorder 역전 변형 거부 | PASS | [B-CompositionSelfTestFinal.log:9](B-CompositionSelfTestFinal.log) |
| 10 | - PASS: D3B-16 RTSP 시작 실패 storage 뒤 late drain 변형 거부 | PASS | [B-CompositionSelfTestFinal.log:10](B-CompositionSelfTestFinal.log) |
| 11 | - PASS: D3B-16 HTTP 시작 실패 승인된 종료 순서 | PASS | [B-CompositionSelfTestFinal.log:11](B-CompositionSelfTestFinal.log) |
| 12 | - PASS: D3B-16 HTTP 시작 실패 bridge 미호출 변형 거부 | PASS | [B-CompositionSelfTestFinal.log:12](B-CompositionSelfTestFinal.log) |
| 13 | - PASS: D3B-16 HTTP 시작 실패 early detach 변형 거부 | PASS | [B-CompositionSelfTestFinal.log:13](B-CompositionSelfTestFinal.log) |
| 14 | - PASS: D3B-16 HTTP 시작 실패 경로 누락 변형 거부 | PASS | [B-CompositionSelfTestFinal.log:14](B-CompositionSelfTestFinal.log) |
| 15 | - PASS: D3B-16 HTTP 시작 실패 recorder 역전 변형 거부 | PASS | [B-CompositionSelfTestFinal.log:15](B-CompositionSelfTestFinal.log) |
| 16 | - PASS: D3B-16 HTTP 시작 실패 storage 뒤 late drain 변형 거부 | PASS | [B-CompositionSelfTestFinal.log:16](B-CompositionSelfTestFinal.log) |
| 17 | - PASS: D3B-16 정상 종료 승인된 종료 순서 | PASS | [B-CompositionSelfTestFinal.log:17](B-CompositionSelfTestFinal.log) |
| 18 | - PASS: D3B-16 정상 종료 bridge 미호출 변형 거부 | PASS | [B-CompositionSelfTestFinal.log:18](B-CompositionSelfTestFinal.log) |
| 19 | - PASS: D3B-16 정상 종료 early detach 변형 거부 | PASS | [B-CompositionSelfTestFinal.log:19](B-CompositionSelfTestFinal.log) |
| 20 | - PASS: D3B-16 정상 종료 경로 누락 변형 거부 | PASS | [B-CompositionSelfTestFinal.log:20](B-CompositionSelfTestFinal.log) |
| 21 | - PASS: D3B-16 정상 종료 recorder 역전 변형 거부 | PASS | [B-CompositionSelfTestFinal.log:21](B-CompositionSelfTestFinal.log) |
| 22 | - PASS: D3B-16 정상 종료 storage 뒤 late drain 변형 거부 | PASS | [B-CompositionSelfTestFinal.log:22](B-CompositionSelfTestFinal.log) |

## 역사적 실행 ExpectedRedFixed

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [fail] D3B-01 actual V2 원본·문자열 UTC·독립 unplaced 응답 | FAIL | [B-ExpectedRedFixed.log:1](B-ExpectedRedFixed.log) |

## 역사적 실행 FirstGreen

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [pass] D3B-01 actual V2 원본·문자열 UTC·독립 unplaced 응답 | PASS | [B-FirstGreen.log:1](B-FirstGreen.log) |

## 역사적 실행 MappingRed

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [pass] D3B-01 actual V2 원본·문자열 UTC·독립 unplaced 응답 | PASS | [B-MappingRed.log:1](B-MappingRed.log) |
| 2 | [fail] D3B-14 mismatch/nonintegral mapping은 unplaced | FAIL | [B-MappingRed.log:2](B-MappingRed.log) |
| 3 | [fail] D3B-14 mismatch/nonintegral mapping은 unplaced | FAIL | [B-MappingRed.log:3](B-MappingRed.log) |

## 역사적 실행 Extended

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [pass] D3B-01 actual V2 원본·문자열 UTC·독립 unplaced 응답 | PASS | [B-Extended.log:1](B-Extended.log) |
| 2 | [pass] D3B-14 mismatch/nonintegral mapping은 unplaced | PASS | [B-Extended.log:2](B-Extended.log) |
| 3 | [pass] D3B-14 mismatch/nonintegral mapping은 unplaced | PASS | [B-Extended.log:3](B-Extended.log) |
| 4 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-Extended.log:4](B-Extended.log) |
| 5 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-Extended.log:5](B-Extended.log) |
| 6 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-Extended.log:6](B-Extended.log) |
| 7 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-Extended.log:7](B-Extended.log) |
| 8 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-Extended.log:8](B-Extended.log) |
| 9 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-Extended.log:9](B-Extended.log) |
| 10 | [pass] D3B-02 권한 거부403 | PASS | [B-Extended.log:10](B-Extended.log) |
| 11 | [pass] D3B-13 Intent placeholder no file/null time | PASS | [B-Extended.log:11](B-Extended.log) |
| 12 | [pass] D3B-13 accepted/no-job 상태 보존 | PASS | [B-Extended.log:12](B-Extended.log) |
| 13 | [pass] D3B-05 실제 검증된 파생2출력 시간/파일 독립 | PASS | [B-Extended.log:13](B-Extended.log) |
| 14 | [pass] D3B-13 출력 생성 뒤 job placeholder 없음 | PASS | [B-Extended.log:14](B-Extended.log) |
| 15 | [pass] D3B-07 page 밖 이벤트도 원본 전체 충족 판정 | PASS | [B-Extended.log:15](B-Extended.log) |
| 16 | [pass] D3B-06 일부 중첩 원본은 보존 | PASS | [B-Extended.log:16](B-Extended.log) |
| 17 | [pass] D3B-04 재조회 stable itemId/order | PASS | [B-Extended.log:17](B-Extended.log) |
| 18 | [pass] D3B-12 요청축/문자열/공개 whitelist | PASS | [B-Extended.log:18](B-Extended.log) |
| 19 | [pass] D3B-08 파일 누락 Complete와 재생불가/숨김 분리 | PASS | [B-Extended.log:19](B-Extended.log) |
| 20 | [pass] D3B-08 실제 tombstone 출력 deleted 보존 | PASS | [B-Extended.log:20](B-Extended.log) |
| 21 | [pass] D3B-09 source tombstone 뒤 durable UTC 투영 | PASS | [B-Extended.log:21](B-Extended.log) |

## 역사적 실행 Boundaries

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [pass] D3B-01 actual V2 원본·문자열 UTC·독립 unplaced 응답 | PASS | [B-Boundaries.log:1](B-Boundaries.log) |
| 2 | [pass] D3B-14 mismatch/nonintegral mapping은 unplaced | PASS | [B-Boundaries.log:2](B-Boundaries.log) |
| 3 | [pass] D3B-14 mismatch/nonintegral mapping은 unplaced | PASS | [B-Boundaries.log:3](B-Boundaries.log) |
| 4 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-Boundaries.log:4](B-Boundaries.log) |
| 5 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-Boundaries.log:5](B-Boundaries.log) |
| 6 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-Boundaries.log:6](B-Boundaries.log) |
| 7 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-Boundaries.log:7](B-Boundaries.log) |
| 8 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-Boundaries.log:8](B-Boundaries.log) |
| 9 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-Boundaries.log:9](B-Boundaries.log) |
| 10 | [pass] D3B-02 권한 거부403 | PASS | [B-Boundaries.log:10](B-Boundaries.log) |
| 11 | [pass] D3B-13 Intent placeholder no file/null time | PASS | [B-Boundaries.log:11](B-Boundaries.log) |
| 12 | [pass] D3B-13 accepted/no-job 상태 보존 | PASS | [B-Boundaries.log:12](B-Boundaries.log) |
| 13 | [pass] D3B-05 실제 검증된 파생2출력 시간/파일 독립 | PASS | [B-Boundaries.log:13](B-Boundaries.log) |
| 14 | [pass] D3B-13 출력 생성 뒤 job placeholder 없음 | PASS | [B-Boundaries.log:14](B-Boundaries.log) |
| 15 | [pass] D3B-07 page 밖 이벤트도 원본 전체 충족 판정 | PASS | [B-Boundaries.log:15](B-Boundaries.log) |
| 16 | [pass] D3B-06 일부 중첩 원본은 보존 | PASS | [B-Boundaries.log:16](B-Boundaries.log) |
| 17 | [pass] D3B-04 재조회 stable itemId/order | PASS | [B-Boundaries.log:17](B-Boundaries.log) |
| 18 | [pass] D3B-12 요청축/문자열/공개 whitelist | PASS | [B-Boundaries.log:18](B-Boundaries.log) |
| 19 | [pass] D3B-08 파일 누락 Complete와 재생불가/숨김 분리 | PASS | [B-Boundaries.log:19](B-Boundaries.log) |
| 20 | [pass] D3B-08 실제 tombstone 출력 deleted 보존 | PASS | [B-Boundaries.log:20](B-Boundaries.log) |
| 21 | [pass] D3B-09 source tombstone 뒤 durable UTC 투영 | PASS | [B-Boundaries.log:21](B-Boundaries.log) |
| 22 | [pass] D3B-03/04 UTC0와 same-file 다중 mapping 독립 ID | PASS | [B-Boundaries.log:22](B-Boundaries.log) |
| 23 | [pass] D3B-03 int64 최대 UTC ns 문자열 정밀도 | PASS | [B-Boundaries.log:23](B-Boundaries.log) |
| 24 | [pass] D3B-11 관련 없는 known4352 누적은 짧은 질의 허용 | PASS | [B-Boundaries.log:24](B-Boundaries.log) |
| 25 | [pass] D3B-11 실제 관련4352 상한 명시 실패 | PASS | [B-Boundaries.log:25](B-Boundaries.log) |
| 26 | [pass] D3B-02/11 관련 상한503 | PASS | [B-Boundaries.log:26](B-Boundaries.log) |
| 27 | [pass] D3B-10/11 unknown4354 count와 bounded 첫 페이지 | PASS | [B-Boundaries.log:27](B-Boundaries.log) |
| 28 | [pass] D3B-10 known/unplaced 독립 동일 offset 페이지 | PASS | [B-Boundaries.log:28](B-Boundaries.log) |
| 29 | [pass] D3B-11 offset+limit overflow 명시 실패 | PASS | [B-Boundaries.log:29](B-Boundaries.log) |

## 역사적 실행 OutputBoundariesFixed

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [pass] D3B-01 actual V2 원본·문자열 UTC·독립 unplaced 응답 | PASS | [B-OutputBoundariesFixed.log:1](B-OutputBoundariesFixed.log) |
| 2 | [pass] D3B-14 mismatch/nonintegral mapping은 unplaced | PASS | [B-OutputBoundariesFixed.log:2](B-OutputBoundariesFixed.log) |
| 3 | [pass] D3B-14 mismatch/nonintegral mapping은 unplaced | PASS | [B-OutputBoundariesFixed.log:3](B-OutputBoundariesFixed.log) |
| 4 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-OutputBoundariesFixed.log:4](B-OutputBoundariesFixed.log) |
| 5 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-OutputBoundariesFixed.log:5](B-OutputBoundariesFixed.log) |
| 6 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-OutputBoundariesFixed.log:6](B-OutputBoundariesFixed.log) |
| 7 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-OutputBoundariesFixed.log:7](B-OutputBoundariesFixed.log) |
| 8 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-OutputBoundariesFixed.log:8](B-OutputBoundariesFixed.log) |
| 9 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-OutputBoundariesFixed.log:9](B-OutputBoundariesFixed.log) |
| 10 | [pass] D3B-02 권한 거부403 | PASS | [B-OutputBoundariesFixed.log:10](B-OutputBoundariesFixed.log) |
| 11 | [pass] D3B-13 Intent placeholder no file/null time | PASS | [B-OutputBoundariesFixed.log:11](B-OutputBoundariesFixed.log) |
| 12 | [pass] D3B-13 accepted/no-job 상태 보존 | PASS | [B-OutputBoundariesFixed.log:12](B-OutputBoundariesFixed.log) |
| 13 | [pass] D3B-05 실제 검증된 파생2출력 시간/파일 독립 | PASS | [B-OutputBoundariesFixed.log:13](B-OutputBoundariesFixed.log) |
| 14 | [pass] D3B-07 같은 UTC 다른 segment/epoch는 원본 숨김 없음 | PASS | [B-OutputBoundariesFixed.log:14](B-OutputBoundariesFixed.log) |
| 15 | [pass] D3B-13 출력 생성 뒤 job placeholder 없음 | PASS | [B-OutputBoundariesFixed.log:15](B-OutputBoundariesFixed.log) |
| 16 | [pass] D3B-07 page 밖 이벤트도 원본 전체 충족 판정 | PASS | [B-OutputBoundariesFixed.log:16](B-OutputBoundariesFixed.log) |
| 17 | [pass] D3B-06 일부 중첩 원본은 보존 | PASS | [B-OutputBoundariesFixed.log:17](B-OutputBoundariesFixed.log) |
| 18 | [pass] D3B-04 재조회 stable itemId/order | PASS | [B-OutputBoundariesFixed.log:18](B-OutputBoundariesFixed.log) |
| 19 | [pass] D3B-12 요청축/문자열/공개 whitelist | PASS | [B-OutputBoundariesFixed.log:19](B-OutputBoundariesFixed.log) |
| 20 | [pass] D3B-08 동일 size 변조 출력은 비재생 | PASS | [B-OutputBoundariesFixed.log:20](B-OutputBoundariesFixed.log) |
| 21 | [pass] D3B-08 파일 누락 Complete와 재생불가/숨김 분리 | PASS | [B-OutputBoundariesFixed.log:21](B-OutputBoundariesFixed.log) |
| 22 | [pass] D3B-08 실제 tombstone 출력 deleted 보존 | PASS | [B-OutputBoundariesFixed.log:22](B-OutputBoundariesFixed.log) |
| 23 | [pass] D3B-09 source tombstone 뒤 durable UTC 투영 | PASS | [B-OutputBoundariesFixed.log:23](B-OutputBoundariesFixed.log) |
| 24 | [pass] D3B-05 partial 요청 실제 출력 jobComplete | PASS | [B-OutputBoundariesFixed.log:24](B-OutputBoundariesFixed.log) |
| 25 | [pass] D3B-14 actual 출력 mismatch mapping은 unplaced·partial 파일 제공 분리 | PASS | [B-OutputBoundariesFixed.log:25](B-OutputBoundariesFixed.log) |
| 26 | [pass] D3B-13 Failed placeholder no file/null time | PASS | [B-OutputBoundariesFixed.log:26](B-OutputBoundariesFixed.log) |
| 27 | [pass] D3B-03/04 UTC0와 same-file 다중 mapping 독립 ID | PASS | [B-OutputBoundariesFixed.log:27](B-OutputBoundariesFixed.log) |
| 28 | [pass] D3B-03 int64 최대 UTC ns 문자열 정밀도 | PASS | [B-OutputBoundariesFixed.log:28](B-OutputBoundariesFixed.log) |
| 29 | [pass] D3B-11 관련 없는 known4352 누적은 짧은 질의 허용 | PASS | [B-OutputBoundariesFixed.log:29](B-OutputBoundariesFixed.log) |
| 30 | [pass] D3B-11 실제 관련4352 상한 명시 실패 | PASS | [B-OutputBoundariesFixed.log:30](B-OutputBoundariesFixed.log) |
| 31 | [pass] D3B-02/11 관련 상한503 | PASS | [B-OutputBoundariesFixed.log:31](B-OutputBoundariesFixed.log) |
| 32 | [pass] D3B-10/11 unknown4354 count와 bounded 첫 페이지 | PASS | [B-OutputBoundariesFixed.log:32](B-OutputBoundariesFixed.log) |
| 33 | [pass] D3B-10 known/unplaced 독립 동일 offset 페이지 | PASS | [B-OutputBoundariesFixed.log:33](B-OutputBoundariesFixed.log) |
| 34 | [pass] D3B-11 offset+limit overflow 명시 실패 | PASS | [B-OutputBoundariesFixed.log:34](B-OutputBoundariesFixed.log) |

## 역사적 실행 BoundedFocused

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [pass] D3B-01 actual V2 원본·문자열 UTC·독립 unplaced 응답 | PASS | [B-BoundedFocused.log:1](B-BoundedFocused.log) |
| 2 | [pass] D3B-14 mismatch/nonintegral mapping은 unplaced | PASS | [B-BoundedFocused.log:2](B-BoundedFocused.log) |
| 3 | [pass] D3B-14 mismatch/nonintegral mapping은 unplaced | PASS | [B-BoundedFocused.log:3](B-BoundedFocused.log) |
| 4 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-BoundedFocused.log:4](B-BoundedFocused.log) |
| 5 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-BoundedFocused.log:5](B-BoundedFocused.log) |
| 6 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-BoundedFocused.log:6](B-BoundedFocused.log) |
| 7 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-BoundedFocused.log:7](B-BoundedFocused.log) |
| 8 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-BoundedFocused.log:8](B-BoundedFocused.log) |
| 9 | [pass] D3B-02 문법/범위 오류400 | PASS | [B-BoundedFocused.log:9](B-BoundedFocused.log) |
| 10 | [pass] D3B-02 권한 거부403 | PASS | [B-BoundedFocused.log:10](B-BoundedFocused.log) |
| 11 | [pass] D3B-13 Intent placeholder no file/null time | PASS | [B-BoundedFocused.log:11](B-BoundedFocused.log) |
| 12 | [pass] D3B-13 accepted/no-job 상태 보존 | PASS | [B-BoundedFocused.log:12](B-BoundedFocused.log) |
| 13 | [pass] D3B-05 실제 검증된 파생2출력 시간/파일 독립 | PASS | [B-BoundedFocused.log:13](B-BoundedFocused.log) |
| 14 | [pass] D3B-07 같은 UTC 다른 segment/epoch는 원본 숨김 없음 | PASS | [B-BoundedFocused.log:14](B-BoundedFocused.log) |
| 15 | [pass] D3B-13 출력 생성 뒤 job placeholder 없음 | PASS | [B-BoundedFocused.log:15](B-BoundedFocused.log) |
| 16 | [pass] D3B-07 page 밖 이벤트도 원본 전체 충족 판정 | PASS | [B-BoundedFocused.log:16](B-BoundedFocused.log) |
| 17 | [pass] D3B-06 일부 중첩 원본은 보존 | PASS | [B-BoundedFocused.log:17](B-BoundedFocused.log) |
| 18 | [pass] D3B-04 재조회 stable itemId/order | PASS | [B-BoundedFocused.log:18](B-BoundedFocused.log) |
| 19 | [pass] D3B-12 요청축/문자열/공개 whitelist | PASS | [B-BoundedFocused.log:19](B-BoundedFocused.log) |
| 20 | [pass] D3B-08 동일 size 변조 출력은 비재생 | PASS | [B-BoundedFocused.log:20](B-BoundedFocused.log) |
| 21 | [pass] D3B-08 파일 누락 Complete와 재생불가/숨김 분리 | PASS | [B-BoundedFocused.log:21](B-BoundedFocused.log) |
| 22 | [pass] D3B-08 실제 tombstone 출력 deleted 보존 | PASS | [B-BoundedFocused.log:22](B-BoundedFocused.log) |
| 23 | [pass] D3B-09 source tombstone 뒤 durable UTC 투영 | PASS | [B-BoundedFocused.log:23](B-BoundedFocused.log) |
| 24 | [pass] D3B-05 partial 요청 실제 출력 jobComplete | PASS | [B-BoundedFocused.log:24](B-BoundedFocused.log) |
| 25 | [pass] D3B-14 actual 출력 mismatch mapping은 unplaced·partial 파일 제공 분리 | PASS | [B-BoundedFocused.log:25](B-BoundedFocused.log) |
| 26 | [pass] D3B-13 Failed placeholder no file/null time | PASS | [B-BoundedFocused.log:26](B-BoundedFocused.log) |
| 27 | [pass] D3B-03/04 UTC0와 same-file 다중 mapping 독립 ID | PASS | [B-BoundedFocused.log:27](B-BoundedFocused.log) |
| 28 | [pass] D3B-03 int64 최대 UTC ns 문자열 정밀도 | PASS | [B-BoundedFocused.log:28](B-BoundedFocused.log) |
| 29 | [pass] D3B-11 관련 없는 known4352 누적은 짧은 질의 허용 | PASS | [B-BoundedFocused.log:29](B-BoundedFocused.log) |
| 30 | [pass] D3B-11 실제 관련4352 상한 명시 실패 | PASS | [B-BoundedFocused.log:30](B-BoundedFocused.log) |
| 31 | [pass] D3B-02/11 관련 상한503 | PASS | [B-BoundedFocused.log:31](B-BoundedFocused.log) |
| 32 | [pass] D3B-10/11 unknown4354 count와 bounded 첫 페이지 | PASS | [B-BoundedFocused.log:32](B-BoundedFocused.log) |
| 33 | [pass] D3B-10 known/unplaced 독립 동일 offset 페이지 | PASS | [B-BoundedFocused.log:33](B-BoundedFocused.log) |
| 34 | [pass] D3B-11 offset+limit overflow 명시 실패 | PASS | [B-BoundedFocused.log:34](B-BoundedFocused.log) |
| 35 | [pass] D3B-11 전체 unknown deep-copy 없이35074 첫 페이지 허용 | PASS | [B-BoundedFocused.log:35](B-BoundedFocused.log) |
| 36 | [pass] D3B-11 deep offset64MiB workspace 초과는 결과 없이 명시 실패 | PASS | [B-BoundedFocused.log:36](B-BoundedFocused.log) |

## 역사적 실행 Regression-Event

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [등록기 단위 테스트] PASS 정상 정식 등록 27개 | PASS | [B-Regression-Event.log:2](B-Regression-Event.log) |
| 2 | [등록기 단위 테스트] PASS 다른 등록군 추가와 일관된 총계 허용 | PASS | [B-Regression-Event.log:3](B-Regression-Event.log) |
| 3 | [등록기 단위 테스트] PASS 전체 총계 불일치 거부 | PASS | [B-Regression-Event.log:4](B-Regression-Event.log) |
| 4 | [등록기 단위 테스트] PASS canonical 등록 수 변경 거부 | PASS | [B-Regression-Event.log:5](B-Regression-Event.log) |
| 5 | [등록기 단위 테스트] PASS S05 등록 수 변경 거부 | PASS | [B-Regression-Event.log:6](B-Regression-Event.log) |
| 6 | [등록기 단위 테스트] PASS 등록군 중복 거부 | PASS | [B-Regression-Event.log:7](B-Regression-Event.log) |
| 7 | [등록기 단위 테스트] PASS 음수 등록 수 거부 | PASS | [B-Regression-Event.log:8](B-Regression-Event.log) |
| 8 | [등록기 단위 테스트] PASS 소수 등록 수 거부 | PASS | [B-Regression-Event.log:9](B-Regression-Event.log) |
| 9 | [등록기 단위 테스트] PASS 등록 범위 표 누락 거부 | PASS | [B-Regression-Event.log:10](B-Regression-Event.log) |
| 10 | [등록기 단위 테스트] PASS 누락 ID | PASS | [B-Regression-Event.log:11](B-Regression-Event.log) |
| 11 | [등록기 단위 테스트] PASS 중복 ID | PASS | [B-Regression-Event.log:12](B-Regression-Event.log) |
| 12 | [등록기 단위 테스트] PASS 추가 ID | PASS | [B-Regression-Event.log:13](B-Regression-Event.log) |
| 13 | [등록기 단위 테스트] PASS 빈 테스트 영역 | PASS | [B-Regression-Event.log:14](B-Regression-Event.log) |
| 14 | [등록기 단위 테스트] PASS 없는 구현 심볼 | PASS | [B-Regression-Event.log:15](B-Regression-Event.log) |
| 15 | [등록기 단위 테스트] PASS 없는 테스트 함수 | PASS | [B-Regression-Event.log:16](B-Regression-Event.log) |
| 16 | [등록기 단위 테스트] PASS 없는 check | PASS | [B-Regression-Event.log:17](B-Regression-Event.log) |
| 17 | [등록기 단위 테스트] PASS 중복 check ID | PASS | [B-Regression-Event.log:18](B-Regression-Event.log) |
| 18 | [등록기 단위 테스트] PASS 문서 행 누락 | PASS | [B-Regression-Event.log:19](B-Regression-Event.log) |
| 19 | [등록기 단위 테스트] PASS 실행 소비자 정상 합성 입력 | PASS | [B-Regression-Event.log:20](B-Regression-Event.log) |
| 20 | [등록기 단위 테스트] PASS 실제 check 결과 누락 | PASS | [B-Regression-Event.log:21](B-Regression-Event.log) |
| 21 | [등록기 단위 테스트] PASS EOS assertion 제거와 감소한 summary도 거부 | PASS | [B-Regression-Event.log:22](B-Regression-Event.log) |
| 22 | [등록기 단위 테스트] PASS 실패 summary | PASS | [B-Regression-Event.log:23](B-Regression-Event.log) |
| 23 | [등록기 단위 테스트] PASS 성공 summary만으로 PASS 금지 | PASS | [B-Regression-Event.log:24](B-Regression-Event.log) |
| 24 | [등록기 단위 테스트] PASS 중복 application 결과 | PASS | [B-Regression-Event.log:25](B-Regression-Event.log) |
| 25 | [등록기 단위 테스트] PASS runtime 로그 전체 누락 | PASS | [B-Regression-Event.log:26](B-Regression-Event.log) |
| 26 | [등록기 단위 테스트] PASS runtime 시나리오 누락 | PASS | [B-Regression-Event.log:27](B-Regression-Event.log) |
| 27 | [등록기 단위 테스트] PASS 종료 취소 runtime 시나리오 누락 | PASS | [B-Regression-Event.log:28](B-Regression-Event.log) |
| 28 | [등록기 단위 테스트] PASS runtime assertion 누락 및 감소 summary | PASS | [B-Regression-Event.log:29](B-Regression-Event.log) |
| 29 | [등록기 단위 테스트] PASS runtime assertion 중복 및 증가 summary | PASS | [B-Regression-Event.log:30](B-Regression-Event.log) |
| 30 | [등록기 단위 테스트] PASS runtime summary 실패 | PASS | [B-Regression-Event.log:31](B-Regression-Event.log) |
| 31 | [등록기 단위 테스트] PASS runtime summary 중복 | PASS | [B-Regression-Event.log:32](B-Regression-Event.log) |
| 32 | [등록기 단위 테스트] PASS runtime failure marker | PASS | [B-Regression-Event.log:33](B-Regression-Event.log) |
| 33 | [등록기 단위 테스트] PASS runtime mutation 결과 누락 | PASS | [B-Regression-Event.log:34](B-Regression-Event.log) |
| 34 | [등록기 단위 테스트] PASS runtime mutation 결과 중복 | PASS | [B-Regression-Event.log:35](B-Regression-Event.log) |
| 35 | [등록기 단위 테스트] PASS runtime negative summary 실패 | PASS | [B-Regression-Event.log:36](B-Regression-Event.log) |
| 36 | [s05-assert] "EQ journal open" | PASS | [B-Regression-Event.log:38](B-Regression-Event.log) |
| 37 | [s05-assert] "EQ catalog open" | PASS | [B-Regression-Event.log:39](B-Regression-Event.log) |
| 38 | [s05-assert] "EQ 실제 pending 등록" | PASS | [B-Regression-Event.log:40](B-Regression-Event.log) |
| 39 | [s05-assert] "EQ 각 event 실제 worker 최초 journal 기록 확인" | PASS | [B-Regression-Event.log:41](B-Regression-Event.log) |
| 40 | [s05-assert] "EQ deadline 이전 동일 event journal 증가 없음" | PASS | [B-Regression-Event.log:43](B-Regression-Event.log) |
| 41 | [s05-assert] "EQ 서로 다른 event link ID 보존" | PASS | [B-Regression-Event.log:44](B-Regression-Event.log) |
| 42 | [s05-assert] "EQ 미해석 PTS는 파생 비실행" | PASS | [B-Regression-Event.log:45](B-Regression-Event.log) |
| 43 | [s05-assert] "EQ journal open" | PASS | [B-Regression-Event.log:46](B-Regression-Event.log) |
| 44 | [s05-assert] "EQ catalog open" | PASS | [B-Regression-Event.log:47](B-Regression-Event.log) |
| 45 | [s05-assert] "EQ 실제 pending 등록" | PASS | [B-Regression-Event.log:48](B-Regression-Event.log) |
| 46 | [s05-assert] "EQ 실제 pending 등록" | PASS | [B-Regression-Event.log:49](B-Regression-Event.log) |
| 47 | [s05-assert] "EQ 각 event 실제 worker 최초 journal 기록 확인" | PASS | [B-Regression-Event.log:50](B-Regression-Event.log) |
| 48 | [s05-assert] "EQ deadline 이전 동일 event journal 증가 없음" | PASS | [B-Regression-Event.log:52](B-Regression-Event.log) |
| 49 | [s05-assert] "EQ 서로 다른 event link ID 보존" | PASS | [B-Regression-Event.log:53](B-Regression-Event.log) |
| 50 | [s05-assert] "EQ 미해석 PTS는 파생 비실행" | PASS | [B-Regression-Event.log:54](B-Regression-Event.log) |
| 51 | [s05-assert] "기본 pending event link가 유효해야 함: " | PASS | [B-Regression-Event.log:55](B-Regression-Event.log) |
| 52 | [s05-assert] "terminal 대기 UTC 확장 요청은 additive 계약으로 round-trip해야 함" | PASS | [B-Regression-Event.log:56](B-Regression-Event.log) |
| 53 | [s05-assert] "terminal 대기 요청이 현재 범위를 축소하면 거부해야 함" | PASS | [B-Regression-Event.log:57](B-Regression-Event.log) |
| 54 | [s05-assert] "미해석 후속 PTS는 기존 UTC 범위와 별도 field로 round-trip해야 함" | PASS | [B-Regression-Event.log:58](B-Regression-Event.log) |
| 55 | [s05-assert] "미해석 후속 PTS를 소비하지 않은 terminal 상태를 거부해야 함" | PASS | [B-Regression-Event.log:59](B-Regression-Event.log) |
| 56 | [s05-assert] "서로 겹치는 ordered overlap을 거부해야 함" | PASS | [B-Regression-Event.log:60](B-Regression-Event.log) |
| 57 | [s05-assert] "overlap/missing이 requested range를 정확히 분할하지 않으면 거부해야 함" | PASS | [B-Regression-Event.log:61](B-Regression-Event.log) |
| 58 | [s05-assert] "unknown link status를 영속 계약으로 허용하면 안 됨" | PASS | [B-Regression-Event.log:62](B-Regression-Event.log) |
| 59 | [s05-assert] "locator 없는 fallback evidence를 거부해야 함" | PASS | [B-Regression-Event.log:63](B-Regression-Event.log) |
| 60 | [s05-assert] "journal open 실패: " | PASS | [B-Regression-Event.log:64](B-Regression-Event.log) |
| 61 | [s05-assert] "catalog open 실패: " | PASS | [B-Regression-Event.log:65](B-Regression-Event.log) |
| 62 | [s05-assert] "event link 갱신은 SQLite primary projection에서 검증해야 함" | PASS | [B-Regression-Event.log:66](B-Regression-Event.log) |
| 63 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-Event.log:67](B-Regression-Event.log) |
| 64 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-Event.log:68](B-Regression-Event.log) |
| 65 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-Event.log:69](B-Regression-Event.log) |
| 66 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-Event.log:70](B-Regression-Event.log) |
| 67 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-Event.log:71](B-Regression-Event.log) |
| 68 | [s05-assert] "retention policy 실패: " | PASS | [B-Regression-Event.log:72](B-Regression-Event.log) |
| 69 | [s05-assert] "이벤트 저장 worker를 막지 않고 파생 job을 pending으로 enqueue해야 함" | PASS | [B-Regression-Event.log:73](B-Regression-Event.log) |
| 70 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-Event.log:74](B-Regression-Event.log) |
| 71 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-Event.log:75](B-Regression-Event.log) |
| 72 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-Event.log:76](B-Regression-Event.log) |
| 73 | [s05-assert] "완전한 archive 파생 완료 뒤 ready clip을 반환해야 함" | PASS | [B-Regression-Event.log:77](B-Regression-Event.log) |
| 74 | [s05-assert] "event link ID와 derived clip path가 반환되어야 함" | PASS | [B-Regression-Event.log:78](B-Regression-Event.log) |
| 75 | [s05-assert] "반개구간 overlap은 맞닿기만 한 segment를 제외해야 함" | PASS | [B-Regression-Event.log:79](B-Regression-Event.log) |
| 76 | [s05-assert] "media PTS event 범위가 segment epoch 기준 UTC로 변환되어야 함" | PASS | [B-Regression-Event.log:80](B-Regression-Event.log) |
| 77 | [s05-assert] "overlap segment가 UTC 순서로 전달되어야 함" | PASS | [B-Regression-Event.log:81](B-Regression-Event.log) |
| 78 | [s05-assert] "파생 성공 link가 catalog complete로 저장되어야 함" | PASS | [B-Regression-Event.log:82](B-Regression-Event.log) |
| 79 | [s05-assert] "파생 완료 뒤 원본 hold가 해제되어야 함" | PASS | [B-Regression-Event.log:83](B-Regression-Event.log) |
| 80 | [s05-assert] "파생 완료 뒤 원본 hold가 해제되어야 함" | PASS | [B-Regression-Event.log:84](B-Regression-Event.log) |
| 81 | [s05-assert] "파생 완료 뒤 원본 hold가 해제되어야 함" | PASS | [B-Regression-Event.log:85](B-Regression-Event.log) |
| 82 | [s05-assert] "같은 event update는 파생 clip을 중복 생성하지 않아야 함" | PASS | [B-Regression-Event.log:86](B-Regression-Event.log) |
| 83 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-Event.log:87](B-Regression-Event.log) |
| 84 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-Event.log:88](B-Regression-Event.log) |
| 85 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-Event.log:89](B-Regression-Event.log) |
| 86 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-Event.log:90](B-Regression-Event.log) |
| 87 | [s05-assert] "완료 event의 더 넓은 update는 range별 결정 ID로 다시 파생해야 함" | PASS | [B-Regression-Event.log:91](B-Regression-Event.log) |
| 88 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-Event.log:92](B-Regression-Event.log) |
| 89 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-Event.log:93](B-Regression-Event.log) |
| 90 | [s05-assert] "cam-b policy 실패: " | PASS | [B-Regression-Event.log:94](B-Regression-Event.log) |
| 91 | [s05-assert] "archive gap이 있으면 complete로 표시하면 안 됨" | PASS | [B-Regression-Event.log:95](B-Regression-Event.log) |
| 92 | [s05-assert] "link가 정확한 missing UTC range를 보존해야 함" | PASS | [B-Regression-Event.log:96](B-Regression-Event.log) |
| 93 | [s05-assert] "frame-buffer fallback 뒤 같은 link가 fallback evidence로 갱신되어야 함" | PASS | [B-Regression-Event.log:97](B-Regression-Event.log) |
| 94 | [s05-assert] "같은 event link의 overlap/fallback 갱신 뒤에도 SQLite projection을 유지해야 함" | PASS | [B-Regression-Event.log:98](B-Regression-Event.log) |
| 95 | [s05-assert] "cam-late policy 실패: " | PASS | [B-Regression-Event.log:99](B-Regression-Event.log) |
| 96 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-Event.log:100](B-Regression-Event.log) |
| 97 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-Event.log:101](B-Regression-Event.log) |
| 98 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-Event.log:102](B-Regression-Event.log) |
| 99 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-Event.log:103](B-Regression-Event.log) |
| 100 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-Event.log:104](B-Regression-Event.log) |
| 101 | [s05-assert] "anchor 없는 PTS를 finalized segment의 실제 PTS/UTC mapping으로 복구해야 함" | PASS | [B-Regression-Event.log:105](B-Regression-Event.log) |
| 102 | [s05-assert] "PTS epoch anchor가 없으면 임의 UTC 연결이나 파생을 하면 안 됨" | PASS | [B-Regression-Event.log:106](B-Regression-Event.log) |
| 103 | [s05-assert] "anchor 없는 PTS는 UTC field가 아니라 재해석 가능한 PTS range로 보존해야 함" | PASS | [B-Regression-Event.log:107](B-Regression-Event.log) |
| 104 | [s05-assert] "같은 긴 prefix의 event ID도 SHA-256 기반 결정 ID가 충돌하면 안 됨" | PASS | [B-Regression-Event.log:108](B-Regression-Event.log) |
| 105 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-Event.log:109](B-Regression-Event.log) |
| 106 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-Event.log:110](B-Regression-Event.log) |
| 107 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-Event.log:111](B-Regression-Event.log) |
| 108 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-Event.log:112](B-Regression-Event.log) |
| 109 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-Event.log:113](B-Regression-Event.log) |
| 110 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-Event.log:114](B-Regression-Event.log) |
| 111 | [s05-assert] "확장 회귀 journal open 실패: " | PASS | [B-Regression-Event.log:115](B-Regression-Event.log) |
| 112 | [s05-assert] "확장 회귀 initial catalog open 실패: " | PASS | [B-Regression-Event.log:116](B-Regression-Event.log) |
| 113 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-Event.log:117](B-Regression-Event.log) |
| 114 | [s05-assert] "cleanup 확장 fixture 저장 실패: " | PASS | [B-Regression-Event.log:118](B-Regression-Event.log) |
| 115 | [s05-assert] "cleanup 확장 fixture 저장 실패: " | PASS | [B-Regression-Event.log:119](B-Regression-Event.log) |
| 116 | [s05-assert] "확장 회귀 restart catalog open 실패: " | PASS | [B-Regression-Event.log:120](B-Regression-Event.log) |
| 117 | [s05-assert] "확장 policy 실패" | PASS | [B-Regression-Event.log:121](B-Regression-Event.log) |
| 118 | [s05-assert] "cleanup 확장 remux 실패는 한 번만 실행되어야 함" | PASS | [B-Regression-Event.log:122](B-Regression-Event.log) |
| 119 | [s05-assert] "실패/Partial도 보류 확장 요청을 현재 범위로 소비해 보존해야 함" | PASS | [B-Regression-Event.log:123](B-Regression-Event.log) |
| 120 | [s05-assert] "실패/Partial도 보류 확장 요청을 현재 범위로 소비해 보존해야 함" | PASS | [B-Regression-Event.log:124](B-Regression-Event.log) |
| 121 | [s05-assert] "PTS 확장은 다른 범위 ID를 사용해야 함" | PASS | [B-Regression-Event.log:125](B-Regression-Event.log) |
| 122 | [s05-assert] "미해석 PTS 확장을 이전 complete clip으로 응답하면 안 됨" | PASS | [B-Regression-Event.log:126](B-Regression-Event.log) |
| 123 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-Event.log:127](B-Regression-Event.log) |
| 124 | [s05-assert] "PTS 확장 2회는 최초 포함 총 3회 파생해야 함" | PASS | [B-Regression-Event.log:128](B-Regression-Event.log) |
| 125 | [s05-assert] "quota journal open 실패: " | PASS | [B-Regression-Event.log:129](B-Regression-Event.log) |
| 126 | [s05-assert] "quota catalog open 실패: " | PASS | [B-Regression-Event.log:130](B-Regression-Event.log) |
| 127 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-Event.log:131](B-Regression-Event.log) |
| 128 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-Event.log:132](B-Regression-Event.log) |
| 129 | [s05-assert] "quota policy 실패: " | PASS | [B-Regression-Event.log:133](B-Regression-Event.log) |
| 130 | [s05-assert] "event quota는 oldest event를 정리해 새 event write를 허용해야 함: ok" | PASS | [B-Regression-Event.log:134](B-Regression-Event.log) |
| 131 | [s05-assert] "event quota 충족을 위해 continuous를 삭제하면 안 됨" | PASS | [B-Regression-Event.log:135](B-Regression-Event.log) |
| 132 | [s05-assert] "event quota는 oldest eligible event를 삭제해야 함" | PASS | [B-Regression-Event.log:136](B-Regression-Event.log) |
| 133 | [s05-assert] "policy 재등록 실패: " | PASS | [B-Regression-Event.log:137](B-Regression-Event.log) |
| 134 | [s05-assert] "policy 제거가 진행 중 event reservation을 지우면 안 됨" | PASS | [B-Regression-Event.log:138](B-Regression-Event.log) |
| 135 | [s05-assert] "명시적 complete 뒤 event reservation ID를 재사용할 수 있어야 함" | PASS | [B-Regression-Event.log:139](B-Regression-Event.log) |
| 136 | [s05-assert] "queue journal open 실패: " | PASS | [B-Regression-Event.log:140](B-Regression-Event.log) |
| 137 | [s05-assert] "queue catalog open 실패: " | PASS | [B-Regression-Event.log:141](B-Regression-Event.log) |
| 138 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-Event.log:142](B-Regression-Event.log) |
| 139 | [s05-assert] "queue policy 실패: " | PASS | [B-Regression-Event.log:143](B-Regression-Event.log) |
| 140 | [s05-assert] "bounded queue 밖 durable pending도 완료 뒤 다시 흡수해야 함" | PASS | [B-Regression-Event.log:144](B-Regression-Event.log) |
| 141 | [s05-assert] "긴 event remux가 다른 이벤트의 durable link admission을 동기 차단하면 안 됨" | PASS | [B-Regression-Event.log:145](B-Regression-Event.log) |
| 142 | [s05-assert] "cleanup 실패 시 source hold와 event reservation을 성공처럼 해제하면 안 됨" | PASS | [B-Regression-Event.log:146](B-Regression-Event.log) |
| 143 | [s05-assert] "terminal marker unlink 실패 시 source/output hold를 유지해야 함" | PASS | [B-Regression-Event.log:147](B-Regression-Event.log) |
| 144 | [s05-assert] "terminal marker unlink 실패 시 event reservation을 유지해야 함" | PASS | [B-Regression-Event.log:148](B-Regression-Event.log) |
| 145 | [s05-assert] "marker 복구 중 event/fallback 갱신은 자원·단계를 보존하고 확장 요청을 내구 대기해야 함" | PASS | [B-Regression-Event.log:149](B-Regression-Event.log) |
| 146 | [s05-assert] "terminal hold 해제 실패를 Complete로 기록하면 안 됨" | PASS | [B-Regression-Event.log:150](B-Regression-Event.log) |
| 147 | [s05-assert] "terminal 복구 중 event/fallback 갱신이 release 단계를 덮어쓰면 안 됨" | PASS | [B-Regression-Event.log:151](B-Regression-Event.log) |
| 148 | [s05-assert] "복구 완료 뒤 내구 대기한 범위 확장은 같은 source epoch의 새 segment로 파생해야 함" | PASS | [B-Regression-Event.log:152](B-Regression-Event.log) |
| 149 | [s05-assert] "terminal complete commit retry fixture 저장 실패: " | PASS | [B-Regression-Event.log:153](B-Regression-Event.log) |
| 150 | [s05-assert] "complete commit 재시도는 다른 pending event의 source hold를 해제하면 안 됨" | PASS | [B-Regression-Event.log:154](B-Regression-Event.log) |
| 151 | [s05-assert] "overflow fixture 이전 hold_count가 저장 범위를 넘으면 안 됨" | PASS | [B-Regression-Event.log:155](B-Regression-Event.log) |
| 152 | [s05-assert] "hold overflow fixture 준비 실패: " | PASS | [B-Regression-Event.log:156](B-Regression-Event.log) |
| 153 | [s05-assert] "event source lease hold_count overflow를 사전에 거부해야 함" | PASS | [B-Regression-Event.log:157](B-Regression-Event.log) |
| 154 | [s05-assert] "hold fixture journal open 실패: " | PASS | [B-Regression-Event.log:158](B-Regression-Event.log) |
| 155 | [s05-assert] "hold fixture catalog open 실패: " | PASS | [B-Regression-Event.log:159](B-Regression-Event.log) |
| 156 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-Event.log:160](B-Regression-Event.log) |
| 157 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-Event.log:161](B-Regression-Event.log) |
| 158 | [s05-assert] "hold pending link 저장 실패: " | PASS | [B-Regression-Event.log:162](B-Regression-Event.log) |
| 159 | [s05-assert] "hold replay journal open 실패: " | PASS | [B-Regression-Event.log:163](B-Regression-Event.log) |
| 160 | [s05-assert] "hold replay catalog open 실패: " | PASS | [B-Regression-Event.log:164](B-Regression-Event.log) |
| 161 | [s05-assert] "재시작 replay가 terminal 전 output/source hold를 함께 복원해야 함" | PASS | [B-Regression-Event.log:165](B-Regression-Event.log) |
| 162 | [s05-assert] "terminal stage fixture event link 조회" | PASS | [B-Regression-Event.log:166](B-Regression-Event.log) |
| 163 | [s05-assert] "terminal stage fixture 저장 실패: " | PASS | [B-Regression-Event.log:167](B-Regression-Event.log) |
| 164 | [s05-assert] "terminal stage replay journal open: " | PASS | [B-Regression-Event.log:168](B-Regression-Event.log) |
| 165 | [s05-assert] "terminal stage catalog open: " | PASS | [B-Regression-Event.log:169](B-Regression-Event.log) |
| 166 | [s05-assert] "complete commit 단계 재시작은 이미 해제된 output/source hold를 복원하면 안 됨" | PASS | [B-Regression-Event.log:170](B-Regression-Event.log) |
| 167 | [s05-assert] "terminal Complete 기록 전 source 삭제 요청을 차단해야 함" | PASS | [B-Regression-Event.log:171](B-Regression-Event.log) |
| 168 | [s05-assert] "terminal Complete 기록 전 output 삭제 요청을 차단해야 함" | PASS | [B-Regression-Event.log:172](B-Regression-Event.log) |
| 169 | [s05-assert] "restart journal open 실패: " | PASS | [B-Regression-Event.log:173](B-Regression-Event.log) |
| 170 | [s05-assert] "restart catalog open 실패: " | PASS | [B-Regression-Event.log:174](B-Regression-Event.log) |
| 171 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-Event.log:175](B-Regression-Event.log) |
| 172 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-Event.log:176](B-Regression-Event.log) |
| 173 | [s05-assert] "restart pending link 저장 실패: " | PASS | [B-Regression-Event.log:177](B-Regression-Event.log) |
| 174 | [s05-assert] "재시작은 이미 finalized된 결정적 event segment를 재파생 없이 연결해야 함" | PASS | [B-Regression-Event.log:178](B-Regression-Event.log) |
| 175 | [s05-assert] "재시작 복구에서 event clip을 중복 파생하면 안 됨" | PASS | [B-Regression-Event.log:179](B-Regression-Event.log) |
| 176 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-Event.log:180](B-Regression-Event.log) |
| 177 | [s05-assert] "conflict pending link 저장 실패: " | PASS | [B-Regression-Event.log:181](B-Regression-Event.log) |
| 178 | [s05-assert] "다른 channel/class의 동일 segment ID를 event 결과로 오인하면 안 됨" | PASS | [B-Regression-Event.log:182](B-Regression-Event.log) |
| 179 | [s05-assert] "segment ID conflict에서 파생을 실행하면 안 됨" | PASS | [B-Regression-Event.log:183](B-Regression-Event.log) |
| 180 | [s05-assert] "실제 H264/MP4 source를 video 재인코딩 없이 remux해야 함: " | PASS | [B-Regression-Event.log:184](B-Regression-Event.log) |
| 181 | [s05-assert] "remux 결과 파일과 size가 일치해야 함" | PASS | [B-Regression-Event.log:185](B-Regression-Event.log) |
| 182 | [s05-assert] "event clip actual range는 keyframe 확대를 측정해 requested range와 분리해야 함" | PASS | [B-Regression-Event.log:186](B-Regression-Event.log) |
| 183 | [s05-assert] "event clip이 source segment 전체 단순 연결보다 작아야 함" | PASS | [B-Regression-Event.log:187](B-Regression-Event.log) |
| 184 | [s05-assert] "remux 결과 checksum과 crash cleanup marker를 남겨야 함" | PASS | [B-Regression-Event.log:188](B-Regression-Event.log) |
| 185 | [s05-assert] "동일 final은 소유 artifact가 없는 terminal 충돌로 거부하고 기존 clip을 보존해야 함" | PASS | [B-Regression-Event.log:189](B-Regression-Event.log) |
| 186 | [s05-assert] "파생 H264/MP4 clip이 끝까지 demux/parse 가능해야 함: " | PASS | [B-Regression-Event.log:190](B-Regression-Event.log) |
| 187 | [s05-assert] "nonce partial은 foreign 고정 partial을 보존하면서 독립 파생되어야 함" | PASS | [B-Regression-Event.log:191](B-Regression-Event.log) |
| 188 | [s05-assert] "event remux recovery journal open 실패: " | PASS | [B-Regression-Event.log:192](B-Regression-Event.log) |
| 189 | [s05-assert] "재시작은 marker nonce와 일치하는 owned crash partial만 정리해야 함: " | PASS | [B-Regression-Event.log:193](B-Regression-Event.log) |
| 190 | [s05-assert] "owned crash partial 복구 뒤 동일 event clip 재파생이 성공해야 함: " | PASS | [B-Regression-Event.log:194](B-Regression-Event.log) |
| 191 | [s05-assert] "VP8/WebM test source 생성 실패: " | PASS | [B-Regression-Event.log:195](B-Regression-Event.log) |
| 192 | [s05-assert] "VP8/WebM test source demux 실패: " | PASS | [B-Regression-Event.log:196](B-Regression-Event.log) |
| 193 | [s05-assert] "검증되지 않은 VP8/WebM event remux는 산출물 없이 fail-closed해야 함" | PASS | [B-Regression-Event.log:197](B-Regression-Event.log) |
| 194 | - PASS: application header is standard-only with exact DTO/default manifests | PASS | [B-Regression-Event.log:199](B-Regression-Event.log) |
| 195 | - PASS: application source owns exact canonical mapping and overwrite semantics | PASS | [B-Regression-Event.log:200](B-Regression-Event.log) |
| 196 | - PASS: transport has zero canonical bypass and exact projection/call ordering | PASS | [B-Regression-Event.log:201](B-Regression-Event.log) |
| 197 | - PASS: recording link is durably admitted before the bounded storage queue can drop an event | PASS | [B-Regression-Event.log:202](B-Regression-Event.log) |
| 198 | - PASS: event clip output remains fd-bound and measured before no-replace publication | PASS | [B-Regression-Event.log:203](B-Regression-Event.log) |
| 199 | - PASS: compiled fake canonical matrix preserves all fields failure/null outputs and lifecycle order | PASS | [B-Regression-Event.log:204](B-Regression-Event.log) |
| 200 | - FAIL: S05 composition starts the bridge before ingress and drains it after storage — storage → bridge drain → 해제 순서 불일치 | FAIL | [B-Regression-Event.log:205](B-Regression-Event.log) |

## 역사적 실행 CompositionFixed

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | - PASS: application header is standard-only with exact DTO/default manifests | PASS | [B-CompositionFixed.log:1](B-CompositionFixed.log) |
| 2 | - PASS: application source owns exact canonical mapping and overwrite semantics | PASS | [B-CompositionFixed.log:2](B-CompositionFixed.log) |
| 3 | - PASS: transport has zero canonical bypass and exact projection/call ordering | PASS | [B-CompositionFixed.log:3](B-CompositionFixed.log) |
| 4 | - PASS: recording link is durably admitted before the bounded storage queue can drop an event | PASS | [B-CompositionFixed.log:4](B-CompositionFixed.log) |
| 5 | - PASS: event clip output remains fd-bound and measured before no-replace publication | PASS | [B-CompositionFixed.log:5](B-CompositionFixed.log) |
| 6 | - PASS: compiled fake canonical matrix preserves all fields failure/null outputs and lifecycle order | PASS | [B-CompositionFixed.log:6](B-CompositionFixed.log) |
| 7 | - PASS: D3B-16 supervisor 시작 실패 승인된 종료 순서 | PASS | [B-CompositionFixed.log:7](B-CompositionFixed.log) |
| 8 | - PASS: D3B-16 supervisor 시작 실패 bridge 미호출 변형 거부 | PASS | [B-CompositionFixed.log:8](B-CompositionFixed.log) |
| 9 | - PASS: D3B-16 supervisor 시작 실패 early detach 변형 거부 | PASS | [B-CompositionFixed.log:9](B-CompositionFixed.log) |
| 10 | - PASS: D3B-16 supervisor 시작 실패 경로 누락 변형 거부 | PASS | [B-CompositionFixed.log:10](B-CompositionFixed.log) |
| 11 | - PASS: D3B-16 RTSP 시작 실패 승인된 종료 순서 | PASS | [B-CompositionFixed.log:11](B-CompositionFixed.log) |
| 12 | - PASS: D3B-16 RTSP 시작 실패 bridge 미호출 변형 거부 | PASS | [B-CompositionFixed.log:12](B-CompositionFixed.log) |
| 13 | - PASS: D3B-16 RTSP 시작 실패 early detach 변형 거부 | PASS | [B-CompositionFixed.log:13](B-CompositionFixed.log) |
| 14 | - PASS: D3B-16 RTSP 시작 실패 경로 누락 변형 거부 | PASS | [B-CompositionFixed.log:14](B-CompositionFixed.log) |
| 15 | - PASS: D3B-16 RTSP 시작 실패 recorder 역전 변형 거부 | PASS | [B-CompositionFixed.log:15](B-CompositionFixed.log) |
| 16 | - PASS: D3B-16 RTSP 시작 실패 storage 뒤 late drain 변형 거부 | PASS | [B-CompositionFixed.log:16](B-CompositionFixed.log) |
| 17 | - PASS: D3B-16 HTTP 시작 실패 승인된 종료 순서 | PASS | [B-CompositionFixed.log:17](B-CompositionFixed.log) |
| 18 | - PASS: D3B-16 HTTP 시작 실패 bridge 미호출 변형 거부 | PASS | [B-CompositionFixed.log:18](B-CompositionFixed.log) |
| 19 | - PASS: D3B-16 HTTP 시작 실패 early detach 변형 거부 | PASS | [B-CompositionFixed.log:19](B-CompositionFixed.log) |
| 20 | - PASS: D3B-16 HTTP 시작 실패 경로 누락 변형 거부 | PASS | [B-CompositionFixed.log:20](B-CompositionFixed.log) |
| 21 | - PASS: D3B-16 HTTP 시작 실패 recorder 역전 변형 거부 | PASS | [B-CompositionFixed.log:21](B-CompositionFixed.log) |
| 22 | - PASS: D3B-16 HTTP 시작 실패 storage 뒤 late drain 변형 거부 | PASS | [B-CompositionFixed.log:22](B-CompositionFixed.log) |
| 23 | - PASS: D3B-16 정상 종료 승인된 종료 순서 | PASS | [B-CompositionFixed.log:23](B-CompositionFixed.log) |
| 24 | - PASS: D3B-16 정상 종료 bridge 미호출 변형 거부 | PASS | [B-CompositionFixed.log:24](B-CompositionFixed.log) |
| 25 | - PASS: D3B-16 정상 종료 early detach 변형 거부 | PASS | [B-CompositionFixed.log:25](B-CompositionFixed.log) |
| 26 | - PASS: D3B-16 정상 종료 경로 누락 변형 거부 | PASS | [B-CompositionFixed.log:26](B-CompositionFixed.log) |
| 27 | - PASS: D3B-16 정상 종료 recorder 역전 변형 거부 | PASS | [B-CompositionFixed.log:27](B-CompositionFixed.log) |
| 28 | - PASS: D3B-16 정상 종료 storage 뒤 late drain 변형 거부 | PASS | [B-CompositionFixed.log:28](B-CompositionFixed.log) |

## 역사적 실행 CompositionSelfTest

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | - PASS: D3B-16 supervisor 시작 실패 승인된 종료 순서 | PASS | [B-CompositionSelfTest.log:1](B-CompositionSelfTest.log) |
| 2 | - PASS: D3B-16 supervisor 시작 실패 bridge 미호출 변형 거부 | PASS | [B-CompositionSelfTest.log:2](B-CompositionSelfTest.log) |
| 3 | - PASS: D3B-16 supervisor 시작 실패 early detach 변형 거부 | PASS | [B-CompositionSelfTest.log:3](B-CompositionSelfTest.log) |
| 4 | - PASS: D3B-16 supervisor 시작 실패 경로 누락 변형 거부 | PASS | [B-CompositionSelfTest.log:4](B-CompositionSelfTest.log) |
| 5 | - PASS: D3B-16 RTSP 시작 실패 승인된 종료 순서 | PASS | [B-CompositionSelfTest.log:5](B-CompositionSelfTest.log) |
| 6 | - PASS: D3B-16 RTSP 시작 실패 bridge 미호출 변형 거부 | PASS | [B-CompositionSelfTest.log:6](B-CompositionSelfTest.log) |
| 7 | - PASS: D3B-16 RTSP 시작 실패 early detach 변형 거부 | PASS | [B-CompositionSelfTest.log:7](B-CompositionSelfTest.log) |
| 8 | - PASS: D3B-16 RTSP 시작 실패 경로 누락 변형 거부 | PASS | [B-CompositionSelfTest.log:8](B-CompositionSelfTest.log) |
| 9 | - PASS: D3B-16 RTSP 시작 실패 recorder 역전 변형 거부 | PASS | [B-CompositionSelfTest.log:9](B-CompositionSelfTest.log) |
| 10 | - PASS: D3B-16 RTSP 시작 실패 storage 뒤 late drain 변형 거부 | PASS | [B-CompositionSelfTest.log:10](B-CompositionSelfTest.log) |
| 11 | - PASS: D3B-16 HTTP 시작 실패 승인된 종료 순서 | PASS | [B-CompositionSelfTest.log:11](B-CompositionSelfTest.log) |
| 12 | - PASS: D3B-16 HTTP 시작 실패 bridge 미호출 변형 거부 | PASS | [B-CompositionSelfTest.log:12](B-CompositionSelfTest.log) |
| 13 | - PASS: D3B-16 HTTP 시작 실패 early detach 변형 거부 | PASS | [B-CompositionSelfTest.log:13](B-CompositionSelfTest.log) |
| 14 | - PASS: D3B-16 HTTP 시작 실패 경로 누락 변형 거부 | PASS | [B-CompositionSelfTest.log:14](B-CompositionSelfTest.log) |
| 15 | - PASS: D3B-16 HTTP 시작 실패 recorder 역전 변형 거부 | PASS | [B-CompositionSelfTest.log:15](B-CompositionSelfTest.log) |
| 16 | - PASS: D3B-16 HTTP 시작 실패 storage 뒤 late drain 변형 거부 | PASS | [B-CompositionSelfTest.log:16](B-CompositionSelfTest.log) |
| 17 | - PASS: D3B-16 정상 종료 승인된 종료 순서 | PASS | [B-CompositionSelfTest.log:17](B-CompositionSelfTest.log) |
| 18 | - PASS: D3B-16 정상 종료 bridge 미호출 변형 거부 | PASS | [B-CompositionSelfTest.log:18](B-CompositionSelfTest.log) |
| 19 | - PASS: D3B-16 정상 종료 early detach 변형 거부 | PASS | [B-CompositionSelfTest.log:19](B-CompositionSelfTest.log) |
| 20 | - PASS: D3B-16 정상 종료 경로 누락 변형 거부 | PASS | [B-CompositionSelfTest.log:20](B-CompositionSelfTest.log) |
| 21 | - PASS: D3B-16 정상 종료 recorder 역전 변형 거부 | PASS | [B-CompositionSelfTest.log:21](B-CompositionSelfTest.log) |
| 22 | - PASS: D3B-16 정상 종료 storage 뒤 late drain 변형 거부 | PASS | [B-CompositionSelfTest.log:22](B-CompositionSelfTest.log) |

## 역사적 실행 CompositionFinal

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | - PASS: application header is standard-only with exact DTO/default manifests | PASS | [B-CompositionFinal.log:1](B-CompositionFinal.log) |
| 2 | - PASS: application source owns exact canonical mapping and overwrite semantics | PASS | [B-CompositionFinal.log:2](B-CompositionFinal.log) |
| 3 | - PASS: transport has zero canonical bypass and exact projection/call ordering | PASS | [B-CompositionFinal.log:3](B-CompositionFinal.log) |
| 4 | - PASS: recording link is durably admitted before the bounded storage queue can drop an event | PASS | [B-CompositionFinal.log:4](B-CompositionFinal.log) |
| 5 | - PASS: event clip output remains fd-bound and measured before no-replace publication | PASS | [B-CompositionFinal.log:5](B-CompositionFinal.log) |
| 6 | - PASS: compiled fake canonical matrix preserves all fields failure/null outputs and lifecycle order | PASS | [B-CompositionFinal.log:6](B-CompositionFinal.log) |
| 7 | - PASS: S05 구성은 생산자 전에 bridge를 등록하고 의존성 종료 전에 drain한다 | PASS | [B-CompositionFinal.log:7](B-CompositionFinal.log) |

## 역사적 실행 Regression-EventFinal

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [등록기 단위 테스트] PASS 정상 정식 등록 27개 | PASS | [B-Regression-EventFinal.log:2](B-Regression-EventFinal.log) |
| 2 | [등록기 단위 테스트] PASS 다른 등록군 추가와 일관된 총계 허용 | PASS | [B-Regression-EventFinal.log:3](B-Regression-EventFinal.log) |
| 3 | [등록기 단위 테스트] PASS 전체 총계 불일치 거부 | PASS | [B-Regression-EventFinal.log:4](B-Regression-EventFinal.log) |
| 4 | [등록기 단위 테스트] PASS canonical 등록 수 변경 거부 | PASS | [B-Regression-EventFinal.log:5](B-Regression-EventFinal.log) |
| 5 | [등록기 단위 테스트] PASS S05 등록 수 변경 거부 | PASS | [B-Regression-EventFinal.log:6](B-Regression-EventFinal.log) |
| 6 | [등록기 단위 테스트] PASS 등록군 중복 거부 | PASS | [B-Regression-EventFinal.log:7](B-Regression-EventFinal.log) |
| 7 | [등록기 단위 테스트] PASS 음수 등록 수 거부 | PASS | [B-Regression-EventFinal.log:8](B-Regression-EventFinal.log) |
| 8 | [등록기 단위 테스트] PASS 소수 등록 수 거부 | PASS | [B-Regression-EventFinal.log:9](B-Regression-EventFinal.log) |
| 9 | [등록기 단위 테스트] PASS 등록 범위 표 누락 거부 | PASS | [B-Regression-EventFinal.log:10](B-Regression-EventFinal.log) |
| 10 | [등록기 단위 테스트] PASS 누락 ID | PASS | [B-Regression-EventFinal.log:11](B-Regression-EventFinal.log) |
| 11 | [등록기 단위 테스트] PASS 중복 ID | PASS | [B-Regression-EventFinal.log:12](B-Regression-EventFinal.log) |
| 12 | [등록기 단위 테스트] PASS 추가 ID | PASS | [B-Regression-EventFinal.log:13](B-Regression-EventFinal.log) |
| 13 | [등록기 단위 테스트] PASS 빈 테스트 영역 | PASS | [B-Regression-EventFinal.log:14](B-Regression-EventFinal.log) |
| 14 | [등록기 단위 테스트] PASS 없는 구현 심볼 | PASS | [B-Regression-EventFinal.log:15](B-Regression-EventFinal.log) |
| 15 | [등록기 단위 테스트] PASS 없는 테스트 함수 | PASS | [B-Regression-EventFinal.log:16](B-Regression-EventFinal.log) |
| 16 | [등록기 단위 테스트] PASS 없는 check | PASS | [B-Regression-EventFinal.log:17](B-Regression-EventFinal.log) |
| 17 | [등록기 단위 테스트] PASS 중복 check ID | PASS | [B-Regression-EventFinal.log:18](B-Regression-EventFinal.log) |
| 18 | [등록기 단위 테스트] PASS 문서 행 누락 | PASS | [B-Regression-EventFinal.log:19](B-Regression-EventFinal.log) |
| 19 | [등록기 단위 테스트] PASS 실행 소비자 정상 합성 입력 | PASS | [B-Regression-EventFinal.log:20](B-Regression-EventFinal.log) |
| 20 | [등록기 단위 테스트] PASS 실제 check 결과 누락 | PASS | [B-Regression-EventFinal.log:21](B-Regression-EventFinal.log) |
| 21 | [등록기 단위 테스트] PASS EOS assertion 제거와 감소한 summary도 거부 | PASS | [B-Regression-EventFinal.log:22](B-Regression-EventFinal.log) |
| 22 | [등록기 단위 테스트] PASS 실패 summary | PASS | [B-Regression-EventFinal.log:23](B-Regression-EventFinal.log) |
| 23 | [등록기 단위 테스트] PASS 성공 summary만으로 PASS 금지 | PASS | [B-Regression-EventFinal.log:24](B-Regression-EventFinal.log) |
| 24 | [등록기 단위 테스트] PASS 중복 application 결과 | PASS | [B-Regression-EventFinal.log:25](B-Regression-EventFinal.log) |
| 25 | [등록기 단위 테스트] PASS runtime 로그 전체 누락 | PASS | [B-Regression-EventFinal.log:26](B-Regression-EventFinal.log) |
| 26 | [등록기 단위 테스트] PASS runtime 시나리오 누락 | PASS | [B-Regression-EventFinal.log:27](B-Regression-EventFinal.log) |
| 27 | [등록기 단위 테스트] PASS 종료 취소 runtime 시나리오 누락 | PASS | [B-Regression-EventFinal.log:28](B-Regression-EventFinal.log) |
| 28 | [등록기 단위 테스트] PASS runtime assertion 누락 및 감소 summary | PASS | [B-Regression-EventFinal.log:29](B-Regression-EventFinal.log) |
| 29 | [등록기 단위 테스트] PASS runtime assertion 중복 및 증가 summary | PASS | [B-Regression-EventFinal.log:30](B-Regression-EventFinal.log) |
| 30 | [등록기 단위 테스트] PASS runtime summary 실패 | PASS | [B-Regression-EventFinal.log:31](B-Regression-EventFinal.log) |
| 31 | [등록기 단위 테스트] PASS runtime summary 중복 | PASS | [B-Regression-EventFinal.log:32](B-Regression-EventFinal.log) |
| 32 | [등록기 단위 테스트] PASS runtime failure marker | PASS | [B-Regression-EventFinal.log:33](B-Regression-EventFinal.log) |
| 33 | [등록기 단위 테스트] PASS runtime mutation 결과 누락 | PASS | [B-Regression-EventFinal.log:34](B-Regression-EventFinal.log) |
| 34 | [등록기 단위 테스트] PASS runtime mutation 결과 중복 | PASS | [B-Regression-EventFinal.log:35](B-Regression-EventFinal.log) |
| 35 | [등록기 단위 테스트] PASS runtime negative summary 실패 | PASS | [B-Regression-EventFinal.log:36](B-Regression-EventFinal.log) |
| 36 | [s05-assert] "EQ journal open" | PASS | [B-Regression-EventFinal.log:38](B-Regression-EventFinal.log) |
| 37 | [s05-assert] "EQ catalog open" | PASS | [B-Regression-EventFinal.log:39](B-Regression-EventFinal.log) |
| 38 | [s05-assert] "EQ 실제 pending 등록" | PASS | [B-Regression-EventFinal.log:40](B-Regression-EventFinal.log) |
| 39 | [s05-assert] "EQ 각 event 실제 worker 최초 journal 기록 확인" | PASS | [B-Regression-EventFinal.log:41](B-Regression-EventFinal.log) |
| 40 | [s05-assert] "EQ deadline 이전 동일 event journal 증가 없음" | PASS | [B-Regression-EventFinal.log:43](B-Regression-EventFinal.log) |
| 41 | [s05-assert] "EQ 서로 다른 event link ID 보존" | PASS | [B-Regression-EventFinal.log:44](B-Regression-EventFinal.log) |
| 42 | [s05-assert] "EQ 미해석 PTS는 파생 비실행" | PASS | [B-Regression-EventFinal.log:45](B-Regression-EventFinal.log) |
| 43 | [s05-assert] "EQ journal open" | PASS | [B-Regression-EventFinal.log:46](B-Regression-EventFinal.log) |
| 44 | [s05-assert] "EQ catalog open" | PASS | [B-Regression-EventFinal.log:47](B-Regression-EventFinal.log) |
| 45 | [s05-assert] "EQ 실제 pending 등록" | PASS | [B-Regression-EventFinal.log:48](B-Regression-EventFinal.log) |
| 46 | [s05-assert] "EQ 실제 pending 등록" | PASS | [B-Regression-EventFinal.log:49](B-Regression-EventFinal.log) |
| 47 | [s05-assert] "EQ 각 event 실제 worker 최초 journal 기록 확인" | PASS | [B-Regression-EventFinal.log:50](B-Regression-EventFinal.log) |
| 48 | [s05-assert] "EQ deadline 이전 동일 event journal 증가 없음" | PASS | [B-Regression-EventFinal.log:52](B-Regression-EventFinal.log) |
| 49 | [s05-assert] "EQ 서로 다른 event link ID 보존" | PASS | [B-Regression-EventFinal.log:53](B-Regression-EventFinal.log) |
| 50 | [s05-assert] "EQ 미해석 PTS는 파생 비실행" | PASS | [B-Regression-EventFinal.log:54](B-Regression-EventFinal.log) |
| 51 | [s05-assert] "기본 pending event link가 유효해야 함: " | PASS | [B-Regression-EventFinal.log:55](B-Regression-EventFinal.log) |
| 52 | [s05-assert] "terminal 대기 UTC 확장 요청은 additive 계약으로 round-trip해야 함" | PASS | [B-Regression-EventFinal.log:56](B-Regression-EventFinal.log) |
| 53 | [s05-assert] "terminal 대기 요청이 현재 범위를 축소하면 거부해야 함" | PASS | [B-Regression-EventFinal.log:57](B-Regression-EventFinal.log) |
| 54 | [s05-assert] "미해석 후속 PTS는 기존 UTC 범위와 별도 field로 round-trip해야 함" | PASS | [B-Regression-EventFinal.log:58](B-Regression-EventFinal.log) |
| 55 | [s05-assert] "미해석 후속 PTS를 소비하지 않은 terminal 상태를 거부해야 함" | PASS | [B-Regression-EventFinal.log:59](B-Regression-EventFinal.log) |
| 56 | [s05-assert] "서로 겹치는 ordered overlap을 거부해야 함" | PASS | [B-Regression-EventFinal.log:60](B-Regression-EventFinal.log) |
| 57 | [s05-assert] "overlap/missing이 requested range를 정확히 분할하지 않으면 거부해야 함" | PASS | [B-Regression-EventFinal.log:61](B-Regression-EventFinal.log) |
| 58 | [s05-assert] "unknown link status를 영속 계약으로 허용하면 안 됨" | PASS | [B-Regression-EventFinal.log:62](B-Regression-EventFinal.log) |
| 59 | [s05-assert] "locator 없는 fallback evidence를 거부해야 함" | PASS | [B-Regression-EventFinal.log:63](B-Regression-EventFinal.log) |
| 60 | [s05-assert] "journal open 실패: " | PASS | [B-Regression-EventFinal.log:64](B-Regression-EventFinal.log) |
| 61 | [s05-assert] "catalog open 실패: " | PASS | [B-Regression-EventFinal.log:65](B-Regression-EventFinal.log) |
| 62 | [s05-assert] "event link 갱신은 SQLite primary projection에서 검증해야 함" | PASS | [B-Regression-EventFinal.log:66](B-Regression-EventFinal.log) |
| 63 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventFinal.log:67](B-Regression-EventFinal.log) |
| 64 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventFinal.log:68](B-Regression-EventFinal.log) |
| 65 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventFinal.log:69](B-Regression-EventFinal.log) |
| 66 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventFinal.log:70](B-Regression-EventFinal.log) |
| 67 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventFinal.log:71](B-Regression-EventFinal.log) |
| 68 | [s05-assert] "retention policy 실패: " | PASS | [B-Regression-EventFinal.log:72](B-Regression-EventFinal.log) |
| 69 | [s05-assert] "이벤트 저장 worker를 막지 않고 파생 job을 pending으로 enqueue해야 함" | PASS | [B-Regression-EventFinal.log:73](B-Regression-EventFinal.log) |
| 70 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventFinal.log:74](B-Regression-EventFinal.log) |
| 71 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventFinal.log:75](B-Regression-EventFinal.log) |
| 72 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventFinal.log:76](B-Regression-EventFinal.log) |
| 73 | [s05-assert] "완전한 archive 파생 완료 뒤 ready clip을 반환해야 함" | PASS | [B-Regression-EventFinal.log:77](B-Regression-EventFinal.log) |
| 74 | [s05-assert] "event link ID와 derived clip path가 반환되어야 함" | PASS | [B-Regression-EventFinal.log:78](B-Regression-EventFinal.log) |
| 75 | [s05-assert] "반개구간 overlap은 맞닿기만 한 segment를 제외해야 함" | PASS | [B-Regression-EventFinal.log:79](B-Regression-EventFinal.log) |
| 76 | [s05-assert] "media PTS event 범위가 segment epoch 기준 UTC로 변환되어야 함" | PASS | [B-Regression-EventFinal.log:80](B-Regression-EventFinal.log) |
| 77 | [s05-assert] "overlap segment가 UTC 순서로 전달되어야 함" | PASS | [B-Regression-EventFinal.log:81](B-Regression-EventFinal.log) |
| 78 | [s05-assert] "파생 성공 link가 catalog complete로 저장되어야 함" | PASS | [B-Regression-EventFinal.log:82](B-Regression-EventFinal.log) |
| 79 | [s05-assert] "파생 완료 뒤 원본 hold가 해제되어야 함" | PASS | [B-Regression-EventFinal.log:83](B-Regression-EventFinal.log) |
| 80 | [s05-assert] "파생 완료 뒤 원본 hold가 해제되어야 함" | PASS | [B-Regression-EventFinal.log:84](B-Regression-EventFinal.log) |
| 81 | [s05-assert] "파생 완료 뒤 원본 hold가 해제되어야 함" | PASS | [B-Regression-EventFinal.log:85](B-Regression-EventFinal.log) |
| 82 | [s05-assert] "같은 event update는 파생 clip을 중복 생성하지 않아야 함" | PASS | [B-Regression-EventFinal.log:86](B-Regression-EventFinal.log) |
| 83 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventFinal.log:87](B-Regression-EventFinal.log) |
| 84 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventFinal.log:88](B-Regression-EventFinal.log) |
| 85 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventFinal.log:89](B-Regression-EventFinal.log) |
| 86 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventFinal.log:90](B-Regression-EventFinal.log) |
| 87 | [s05-assert] "완료 event의 더 넓은 update는 range별 결정 ID로 다시 파생해야 함" | PASS | [B-Regression-EventFinal.log:91](B-Regression-EventFinal.log) |
| 88 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventFinal.log:92](B-Regression-EventFinal.log) |
| 89 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventFinal.log:93](B-Regression-EventFinal.log) |
| 90 | [s05-assert] "cam-b policy 실패: " | PASS | [B-Regression-EventFinal.log:94](B-Regression-EventFinal.log) |
| 91 | [s05-assert] "archive gap이 있으면 complete로 표시하면 안 됨" | PASS | [B-Regression-EventFinal.log:95](B-Regression-EventFinal.log) |
| 92 | [s05-assert] "link가 정확한 missing UTC range를 보존해야 함" | PASS | [B-Regression-EventFinal.log:96](B-Regression-EventFinal.log) |
| 93 | [s05-assert] "frame-buffer fallback 뒤 같은 link가 fallback evidence로 갱신되어야 함" | PASS | [B-Regression-EventFinal.log:97](B-Regression-EventFinal.log) |
| 94 | [s05-assert] "같은 event link의 overlap/fallback 갱신 뒤에도 SQLite projection을 유지해야 함" | PASS | [B-Regression-EventFinal.log:98](B-Regression-EventFinal.log) |
| 95 | [s05-assert] "cam-late policy 실패: " | PASS | [B-Regression-EventFinal.log:99](B-Regression-EventFinal.log) |
| 96 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventFinal.log:100](B-Regression-EventFinal.log) |
| 97 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventFinal.log:101](B-Regression-EventFinal.log) |
| 98 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventFinal.log:102](B-Regression-EventFinal.log) |
| 99 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventFinal.log:103](B-Regression-EventFinal.log) |
| 100 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventFinal.log:104](B-Regression-EventFinal.log) |
| 101 | [s05-assert] "anchor 없는 PTS를 finalized segment의 실제 PTS/UTC mapping으로 복구해야 함" | PASS | [B-Regression-EventFinal.log:105](B-Regression-EventFinal.log) |
| 102 | [s05-assert] "PTS epoch anchor가 없으면 임의 UTC 연결이나 파생을 하면 안 됨" | PASS | [B-Regression-EventFinal.log:106](B-Regression-EventFinal.log) |
| 103 | [s05-assert] "anchor 없는 PTS는 UTC field가 아니라 재해석 가능한 PTS range로 보존해야 함" | PASS | [B-Regression-EventFinal.log:107](B-Regression-EventFinal.log) |
| 104 | [s05-assert] "같은 긴 prefix의 event ID도 SHA-256 기반 결정 ID가 충돌하면 안 됨" | PASS | [B-Regression-EventFinal.log:108](B-Regression-EventFinal.log) |
| 105 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventFinal.log:109](B-Regression-EventFinal.log) |
| 106 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventFinal.log:110](B-Regression-EventFinal.log) |
| 107 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventFinal.log:111](B-Regression-EventFinal.log) |
| 108 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventFinal.log:112](B-Regression-EventFinal.log) |
| 109 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventFinal.log:113](B-Regression-EventFinal.log) |
| 110 | [s05-assert] "파생 중 원본 segment hold가 유지되어야 함" | PASS | [B-Regression-EventFinal.log:114](B-Regression-EventFinal.log) |
| 111 | [s05-assert] "확장 회귀 journal open 실패: " | PASS | [B-Regression-EventFinal.log:115](B-Regression-EventFinal.log) |
| 112 | [s05-assert] "확장 회귀 initial catalog open 실패: " | PASS | [B-Regression-EventFinal.log:116](B-Regression-EventFinal.log) |
| 113 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventFinal.log:117](B-Regression-EventFinal.log) |
| 114 | [s05-assert] "cleanup 확장 fixture 저장 실패: " | PASS | [B-Regression-EventFinal.log:118](B-Regression-EventFinal.log) |
| 115 | [s05-assert] "cleanup 확장 fixture 저장 실패: " | PASS | [B-Regression-EventFinal.log:119](B-Regression-EventFinal.log) |
| 116 | [s05-assert] "확장 회귀 restart catalog open 실패: " | PASS | [B-Regression-EventFinal.log:120](B-Regression-EventFinal.log) |
| 117 | [s05-assert] "확장 policy 실패" | PASS | [B-Regression-EventFinal.log:121](B-Regression-EventFinal.log) |
| 118 | [s05-assert] "cleanup 확장 remux 실패는 한 번만 실행되어야 함" | PASS | [B-Regression-EventFinal.log:122](B-Regression-EventFinal.log) |
| 119 | [s05-assert] "실패/Partial도 보류 확장 요청을 현재 범위로 소비해 보존해야 함" | PASS | [B-Regression-EventFinal.log:123](B-Regression-EventFinal.log) |
| 120 | [s05-assert] "실패/Partial도 보류 확장 요청을 현재 범위로 소비해 보존해야 함" | PASS | [B-Regression-EventFinal.log:124](B-Regression-EventFinal.log) |
| 121 | [s05-assert] "PTS 확장은 다른 범위 ID를 사용해야 함" | PASS | [B-Regression-EventFinal.log:125](B-Regression-EventFinal.log) |
| 122 | [s05-assert] "미해석 PTS 확장을 이전 complete clip으로 응답하면 안 됨" | PASS | [B-Regression-EventFinal.log:126](B-Regression-EventFinal.log) |
| 123 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventFinal.log:127](B-Regression-EventFinal.log) |
| 124 | [s05-assert] "PTS 확장 2회는 최초 포함 총 3회 파생해야 함" | PASS | [B-Regression-EventFinal.log:128](B-Regression-EventFinal.log) |
| 125 | [s05-assert] "quota journal open 실패: " | PASS | [B-Regression-EventFinal.log:129](B-Regression-EventFinal.log) |
| 126 | [s05-assert] "quota catalog open 실패: " | PASS | [B-Regression-EventFinal.log:130](B-Regression-EventFinal.log) |
| 127 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventFinal.log:131](B-Regression-EventFinal.log) |
| 128 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventFinal.log:132](B-Regression-EventFinal.log) |
| 129 | [s05-assert] "quota policy 실패: " | PASS | [B-Regression-EventFinal.log:133](B-Regression-EventFinal.log) |
| 130 | [s05-assert] "event quota는 oldest event를 정리해 새 event write를 허용해야 함: ok" | PASS | [B-Regression-EventFinal.log:134](B-Regression-EventFinal.log) |
| 131 | [s05-assert] "event quota 충족을 위해 continuous를 삭제하면 안 됨" | PASS | [B-Regression-EventFinal.log:135](B-Regression-EventFinal.log) |
| 132 | [s05-assert] "event quota는 oldest eligible event를 삭제해야 함" | PASS | [B-Regression-EventFinal.log:136](B-Regression-EventFinal.log) |
| 133 | [s05-assert] "policy 재등록 실패: " | PASS | [B-Regression-EventFinal.log:137](B-Regression-EventFinal.log) |
| 134 | [s05-assert] "policy 제거가 진행 중 event reservation을 지우면 안 됨" | PASS | [B-Regression-EventFinal.log:138](B-Regression-EventFinal.log) |
| 135 | [s05-assert] "명시적 complete 뒤 event reservation ID를 재사용할 수 있어야 함" | PASS | [B-Regression-EventFinal.log:139](B-Regression-EventFinal.log) |
| 136 | [s05-assert] "queue journal open 실패: " | PASS | [B-Regression-EventFinal.log:140](B-Regression-EventFinal.log) |
| 137 | [s05-assert] "queue catalog open 실패: " | PASS | [B-Regression-EventFinal.log:141](B-Regression-EventFinal.log) |
| 138 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventFinal.log:142](B-Regression-EventFinal.log) |
| 139 | [s05-assert] "queue policy 실패: " | PASS | [B-Regression-EventFinal.log:143](B-Regression-EventFinal.log) |
| 140 | [s05-assert] "bounded queue 밖 durable pending도 완료 뒤 다시 흡수해야 함" | PASS | [B-Regression-EventFinal.log:144](B-Regression-EventFinal.log) |
| 141 | [s05-assert] "긴 event remux가 다른 이벤트의 durable link admission을 동기 차단하면 안 됨" | PASS | [B-Regression-EventFinal.log:145](B-Regression-EventFinal.log) |
| 142 | [s05-assert] "cleanup 실패 시 source hold와 event reservation을 성공처럼 해제하면 안 됨" | PASS | [B-Regression-EventFinal.log:146](B-Regression-EventFinal.log) |
| 143 | [s05-assert] "terminal marker unlink 실패 시 source/output hold를 유지해야 함" | PASS | [B-Regression-EventFinal.log:147](B-Regression-EventFinal.log) |
| 144 | [s05-assert] "terminal marker unlink 실패 시 event reservation을 유지해야 함" | PASS | [B-Regression-EventFinal.log:148](B-Regression-EventFinal.log) |
| 145 | [s05-assert] "marker 복구 중 event/fallback 갱신은 자원·단계를 보존하고 확장 요청을 내구 대기해야 함" | PASS | [B-Regression-EventFinal.log:149](B-Regression-EventFinal.log) |
| 146 | [s05-assert] "terminal hold 해제 실패를 Complete로 기록하면 안 됨" | PASS | [B-Regression-EventFinal.log:150](B-Regression-EventFinal.log) |
| 147 | [s05-assert] "terminal 복구 중 event/fallback 갱신이 release 단계를 덮어쓰면 안 됨" | PASS | [B-Regression-EventFinal.log:151](B-Regression-EventFinal.log) |
| 148 | [s05-assert] "복구 완료 뒤 내구 대기한 범위 확장은 같은 source epoch의 새 segment로 파생해야 함" | PASS | [B-Regression-EventFinal.log:152](B-Regression-EventFinal.log) |
| 149 | [s05-assert] "terminal complete commit retry fixture 저장 실패: " | PASS | [B-Regression-EventFinal.log:153](B-Regression-EventFinal.log) |
| 150 | [s05-assert] "complete commit 재시도는 다른 pending event의 source hold를 해제하면 안 됨" | PASS | [B-Regression-EventFinal.log:154](B-Regression-EventFinal.log) |
| 151 | [s05-assert] "overflow fixture 이전 hold_count가 저장 범위를 넘으면 안 됨" | PASS | [B-Regression-EventFinal.log:155](B-Regression-EventFinal.log) |
| 152 | [s05-assert] "hold overflow fixture 준비 실패: " | PASS | [B-Regression-EventFinal.log:156](B-Regression-EventFinal.log) |
| 153 | [s05-assert] "event source lease hold_count overflow를 사전에 거부해야 함" | PASS | [B-Regression-EventFinal.log:157](B-Regression-EventFinal.log) |
| 154 | [s05-assert] "hold fixture journal open 실패: " | PASS | [B-Regression-EventFinal.log:158](B-Regression-EventFinal.log) |
| 155 | [s05-assert] "hold fixture catalog open 실패: " | PASS | [B-Regression-EventFinal.log:159](B-Regression-EventFinal.log) |
| 156 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventFinal.log:160](B-Regression-EventFinal.log) |
| 157 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventFinal.log:161](B-Regression-EventFinal.log) |
| 158 | [s05-assert] "hold pending link 저장 실패: " | PASS | [B-Regression-EventFinal.log:162](B-Regression-EventFinal.log) |
| 159 | [s05-assert] "hold replay journal open 실패: " | PASS | [B-Regression-EventFinal.log:163](B-Regression-EventFinal.log) |
| 160 | [s05-assert] "hold replay catalog open 실패: " | PASS | [B-Regression-EventFinal.log:164](B-Regression-EventFinal.log) |
| 161 | [s05-assert] "재시작 replay가 terminal 전 output/source hold를 함께 복원해야 함" | PASS | [B-Regression-EventFinal.log:165](B-Regression-EventFinal.log) |
| 162 | [s05-assert] "terminal stage fixture event link 조회" | PASS | [B-Regression-EventFinal.log:166](B-Regression-EventFinal.log) |
| 163 | [s05-assert] "terminal stage fixture 저장 실패: " | PASS | [B-Regression-EventFinal.log:167](B-Regression-EventFinal.log) |
| 164 | [s05-assert] "terminal stage replay journal open: " | PASS | [B-Regression-EventFinal.log:168](B-Regression-EventFinal.log) |
| 165 | [s05-assert] "terminal stage catalog open: " | PASS | [B-Regression-EventFinal.log:169](B-Regression-EventFinal.log) |
| 166 | [s05-assert] "complete commit 단계 재시작은 이미 해제된 output/source hold를 복원하면 안 됨" | PASS | [B-Regression-EventFinal.log:170](B-Regression-EventFinal.log) |
| 167 | [s05-assert] "terminal Complete 기록 전 source 삭제 요청을 차단해야 함" | PASS | [B-Regression-EventFinal.log:171](B-Regression-EventFinal.log) |
| 168 | [s05-assert] "terminal Complete 기록 전 output 삭제 요청을 차단해야 함" | PASS | [B-Regression-EventFinal.log:172](B-Regression-EventFinal.log) |
| 169 | [s05-assert] "restart journal open 실패: " | PASS | [B-Regression-EventFinal.log:173](B-Regression-EventFinal.log) |
| 170 | [s05-assert] "restart catalog open 실패: " | PASS | [B-Regression-EventFinal.log:174](B-Regression-EventFinal.log) |
| 171 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventFinal.log:175](B-Regression-EventFinal.log) |
| 172 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventFinal.log:176](B-Regression-EventFinal.log) |
| 173 | [s05-assert] "restart pending link 저장 실패: " | PASS | [B-Regression-EventFinal.log:177](B-Regression-EventFinal.log) |
| 174 | [s05-assert] "재시작은 이미 finalized된 결정적 event segment를 재파생 없이 연결해야 함" | PASS | [B-Regression-EventFinal.log:178](B-Regression-EventFinal.log) |
| 175 | [s05-assert] "재시작 복구에서 event clip을 중복 파생하면 안 됨" | PASS | [B-Regression-EventFinal.log:179](B-Regression-EventFinal.log) |
| 176 | [s05-assert] "segment finalize 실패: " | PASS | [B-Regression-EventFinal.log:180](B-Regression-EventFinal.log) |
| 177 | [s05-assert] "conflict pending link 저장 실패: " | PASS | [B-Regression-EventFinal.log:181](B-Regression-EventFinal.log) |
| 178 | [s05-assert] "다른 channel/class의 동일 segment ID를 event 결과로 오인하면 안 됨" | PASS | [B-Regression-EventFinal.log:182](B-Regression-EventFinal.log) |
| 179 | [s05-assert] "segment ID conflict에서 파생을 실행하면 안 됨" | PASS | [B-Regression-EventFinal.log:183](B-Regression-EventFinal.log) |
| 180 | [s05-assert] "실제 H264/MP4 source를 video 재인코딩 없이 remux해야 함: " | PASS | [B-Regression-EventFinal.log:184](B-Regression-EventFinal.log) |
| 181 | [s05-assert] "remux 결과 파일과 size가 일치해야 함" | PASS | [B-Regression-EventFinal.log:185](B-Regression-EventFinal.log) |
| 182 | [s05-assert] "event clip actual range는 keyframe 확대를 측정해 requested range와 분리해야 함" | PASS | [B-Regression-EventFinal.log:186](B-Regression-EventFinal.log) |
| 183 | [s05-assert] "event clip이 source segment 전체 단순 연결보다 작아야 함" | PASS | [B-Regression-EventFinal.log:187](B-Regression-EventFinal.log) |
| 184 | [s05-assert] "remux 결과 checksum과 crash cleanup marker를 남겨야 함" | PASS | [B-Regression-EventFinal.log:188](B-Regression-EventFinal.log) |
| 185 | [s05-assert] "동일 final은 소유 artifact가 없는 terminal 충돌로 거부하고 기존 clip을 보존해야 함" | PASS | [B-Regression-EventFinal.log:189](B-Regression-EventFinal.log) |
| 186 | [s05-assert] "파생 H264/MP4 clip이 끝까지 demux/parse 가능해야 함: " | PASS | [B-Regression-EventFinal.log:190](B-Regression-EventFinal.log) |
| 187 | [s05-assert] "nonce partial은 foreign 고정 partial을 보존하면서 독립 파생되어야 함" | PASS | [B-Regression-EventFinal.log:191](B-Regression-EventFinal.log) |
| 188 | [s05-assert] "event remux recovery journal open 실패: " | PASS | [B-Regression-EventFinal.log:192](B-Regression-EventFinal.log) |
| 189 | [s05-assert] "재시작은 marker nonce와 일치하는 owned crash partial만 정리해야 함: " | PASS | [B-Regression-EventFinal.log:193](B-Regression-EventFinal.log) |
| 190 | [s05-assert] "owned crash partial 복구 뒤 동일 event clip 재파생이 성공해야 함: " | PASS | [B-Regression-EventFinal.log:194](B-Regression-EventFinal.log) |
| 191 | [s05-assert] "VP8/WebM test source 생성 실패: " | PASS | [B-Regression-EventFinal.log:195](B-Regression-EventFinal.log) |
| 192 | [s05-assert] "VP8/WebM test source demux 실패: " | PASS | [B-Regression-EventFinal.log:196](B-Regression-EventFinal.log) |
| 193 | [s05-assert] "검증되지 않은 VP8/WebM event remux는 산출물 없이 fail-closed해야 함" | PASS | [B-Regression-EventFinal.log:197](B-Regression-EventFinal.log) |
| 194 | - PASS: application header is standard-only with exact DTO/default manifests | PASS | [B-Regression-EventFinal.log:199](B-Regression-EventFinal.log) |
| 195 | - PASS: application source owns exact canonical mapping and overwrite semantics | PASS | [B-Regression-EventFinal.log:200](B-Regression-EventFinal.log) |
| 196 | - PASS: transport has zero canonical bypass and exact projection/call ordering | PASS | [B-Regression-EventFinal.log:201](B-Regression-EventFinal.log) |
| 197 | - PASS: recording link is durably admitted before the bounded storage queue can drop an event | PASS | [B-Regression-EventFinal.log:202](B-Regression-EventFinal.log) |
| 198 | - PASS: event clip output remains fd-bound and measured before no-replace publication | PASS | [B-Regression-EventFinal.log:203](B-Regression-EventFinal.log) |
| 199 | - PASS: compiled fake canonical matrix preserves all fields failure/null outputs and lifecycle order | PASS | [B-Regression-EventFinal.log:204](B-Regression-EventFinal.log) |
| 200 | - PASS: S05 구성은 생산자 전에 bridge를 등록하고 의존성 종료 전에 drain한다 | PASS | [B-Regression-EventFinal.log:205](B-Regression-EventFinal.log) |

## 역사적 실행 EventRuntimeFixed

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [s05-runtime-assert] {"case":"disabled-admit","message":"실제 EventStorage worker 진입을 관찰한다"} | PASS | [B-EventRuntimeFixed.log:1](B-EventRuntimeFixed.log) |
| 2 | [s05-runtime-assert] {"case":"disabled-admit","message":"worker 처리 전에 첫 이벤트 연결이 내구 접수된다"} | PASS | [B-EventRuntimeFixed.log:2](B-EventRuntimeFixed.log) |
| 3 | [s05-runtime-assert] {"case":"disabled-admit","message":"실제 저장 큐 크기 2에서 다섯 접수 중 두 이벤트가 퇴출된다"} | PASS | [B-EventRuntimeFixed.log:3](B-EventRuntimeFixed.log) |
| 4 | [s05-runtime-assert] {"case":"disabled-admit","message":"퇴출 이벤트를 포함한 다섯 PTS 연결이 worker 해제 전에 보존된다"} | PASS | [B-EventRuntimeFixed.log:4](B-EventRuntimeFixed.log) |
| 5 | [s05-runtime-assert] {"case":"disabled-admit","message":"저장 worker drain 뒤에도 다섯 연결과 시간축이 보존된다"} | PASS | [B-EventRuntimeFixed.log:5](B-EventRuntimeFixed.log) |
| 6 | [s05-runtime-assert] {"case":"disabled-admit","message":"JSONL 설정에 따른 실제 저장 수와 빈 큐를 확인한다"} | PASS | [B-EventRuntimeFixed.log:6](B-EventRuntimeFixed.log) |
| 7 | [s05-runtime-assert] {"case":"disabled-admit","message":"JSONL 비활성은 파일 없음이고 활성은 생존 이벤트 세 개와 link ID가 일치한다"} | PASS | [B-EventRuntimeFixed.log:7](B-EventRuntimeFixed.log) |
| 8 | [s05-runtime-assert] {"case":"disabled-recover","message":"새 프로세스의 빈 SQLite를 journal로 재구축해 다섯 PTS 연결을 복구한다"} | PASS | [B-EventRuntimeFixed.log:9](B-EventRuntimeFixed.log) |
| 9 | [s05-runtime-assert] {"case":"disabled-recover","message":"퇴출 이벤트까지 UTC 매핑 후 다섯 실제 H264 파생 파일이 완료된다"} | PASS | [B-EventRuntimeFixed.log:10](B-EventRuntimeFixed.log) |
| 10 | [s05-runtime-assert] {"case":"disabled-recover","message":"같은 이벤트 재접수는 복구된 다섯 clip ID를 바꾸거나 추가하지 않는다"} | PASS | [B-EventRuntimeFixed.log:11](B-EventRuntimeFixed.log) |
| 11 | [s05-runtime-assert] {"case":"enabled-admit","message":"실제 EventStorage worker 진입을 관찰한다"} | PASS | [B-EventRuntimeFixed.log:25](B-EventRuntimeFixed.log) |
| 12 | [s05-runtime-assert] {"case":"enabled-admit","message":"worker 처리 전에 첫 이벤트 연결이 내구 접수된다"} | PASS | [B-EventRuntimeFixed.log:26](B-EventRuntimeFixed.log) |
| 13 | [s05-runtime-assert] {"case":"enabled-admit","message":"실제 저장 큐 크기 2에서 다섯 접수 중 두 이벤트가 퇴출된다"} | PASS | [B-EventRuntimeFixed.log:27](B-EventRuntimeFixed.log) |
| 14 | [s05-runtime-assert] {"case":"enabled-admit","message":"퇴출 이벤트를 포함한 다섯 PTS 연결이 worker 해제 전에 보존된다"} | PASS | [B-EventRuntimeFixed.log:28](B-EventRuntimeFixed.log) |
| 15 | [s05-runtime-assert] {"case":"enabled-admit","message":"저장 worker drain 뒤에도 다섯 연결과 시간축이 보존된다"} | PASS | [B-EventRuntimeFixed.log:29](B-EventRuntimeFixed.log) |
| 16 | [s05-runtime-assert] {"case":"enabled-admit","message":"JSONL 설정에 따른 실제 저장 수와 빈 큐를 확인한다"} | PASS | [B-EventRuntimeFixed.log:30](B-EventRuntimeFixed.log) |
| 17 | [s05-runtime-assert] {"case":"enabled-admit","message":"JSONL 비활성은 파일 없음이고 활성은 생존 이벤트 세 개와 link ID가 일치한다"} | PASS | [B-EventRuntimeFixed.log:31](B-EventRuntimeFixed.log) |
| 18 | [s05-runtime-assert] {"case":"enabled-recover","message":"새 프로세스의 빈 SQLite를 journal로 재구축해 다섯 PTS 연결을 복구한다"} | PASS | [B-EventRuntimeFixed.log:33](B-EventRuntimeFixed.log) |
| 19 | [s05-runtime-assert] {"case":"enabled-recover","message":"퇴출 이벤트까지 UTC 매핑 후 다섯 실제 H264 파생 파일이 완료된다"} | PASS | [B-EventRuntimeFixed.log:34](B-EventRuntimeFixed.log) |
| 20 | [s05-runtime-assert] {"case":"enabled-recover","message":"같은 이벤트 재접수는 복구된 다섯 clip ID를 바꾸거나 추가하지 않는다"} | PASS | [B-EventRuntimeFixed.log:35](B-EventRuntimeFixed.log) |
| 21 | [s05-runtime-assert] {"case":"shutdown-cancel","message":"post-event frame 대기 중인 실제 storage worker를 관찰한다"} | PASS | [B-EventRuntimeFixed.log:49](B-EventRuntimeFixed.log) |
| 22 | [s05-runtime-assert] {"case":"shutdown-cancel","message":"종료 신호가 post-event frame 대기를 깨워 1초 안에 worker를 drain한다"} | PASS | [B-EventRuntimeFixed.log:50](B-EventRuntimeFixed.log) |
| 23 | [s05-runtime-assert] {"case":"shutdown-cancel","message":"frame 대기 취소 뒤에도 EventRecord JSONL을 유실하지 않는다"} | PASS | [B-EventRuntimeFixed.log:51](B-EventRuntimeFixed.log) |
| 24 | [s05-runtime-mutation] disabled-guard: PASS (실제 assertion의 RED 확인) | PASS | [B-EventRuntimeFixed.log:53](B-EventRuntimeFixed.log) |
| 25 | [s05-runtime-mutation] prequeue-admission: PASS (실제 assertion의 RED 확인) | PASS | [B-EventRuntimeFixed.log:54](B-EventRuntimeFixed.log) |
