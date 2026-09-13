# 3D-3 D 전수 실행 행

독자는 구현·검토 담당자다. 중앙 기록에서 연결하는 실행 증적이며 정책 문서가 아니다.
최종 HTTP85행, harness5시나리오(내부40checks), seed 준비8행을 구분한다. cleanup은 별도다.
실제 브라우저/서버 두 번째 기동/장시간 PASS가 아니다.

## D-SeedGreen.log

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [pass] D3D-01 actual managed 원본과 jobComplete2출력·physical 검증 | PASS | [D-SeedGreen.log:1](D-SeedGreen.log) |

## D-HttpApiAuthorized.log

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [pass] D3D-01 actual managed 원본과 jobComplete2출력·physical 검증 | PASS | [D-HttpApiAuthorized.log:1](D-HttpApiAuthorized.log) |
| 2 | [seed-subcheck] PASS D3D-01 generated2출력 manifest/containment/hash | PASS | [D-HttpApiAuthorized.log:4](D-HttpApiAuthorized.log) |
| 3 | [http-subcheck] PASS I01 실제 status projection | PASS | [D-HttpApiAuthorized.log:5](D-HttpApiAuthorized.log) |
| 4 | [http-subcheck] PASS I03/I06 실제 HTTP generated2출력·jobComplete timeline | PASS | [D-HttpApiAuthorized.log:6](D-HttpApiAuthorized.log) |
| 5 | [http-subcheck] PASS I07 HTTP 전체/부분 중첩 원본 구별 | PASS | [D-HttpApiAuthorized.log:7](D-HttpApiAuthorized.log) |
| 6 | [http-subcheck] PASS D3D-02 accepted 미확인 독립 목록 | PASS | [D-HttpApiAuthorized.log:8](D-HttpApiAuthorized.log) |
| 7 | [http-subcheck] PASS D3D-02 문자열 시간·요청축 보존 | PASS | [D-HttpApiAuthorized.log:9](D-HttpApiAuthorized.log) |
| 8 | [http-subcheck] PASS D3D-04 actual Event output 전체 byte/hash·MIME | PASS | [D-HttpApiAuthorized.log:10](D-HttpApiAuthorized.log) |
| 9 | [http-subcheck] PASS D3D-04 actual Event output 전체 byte/hash·MIME | PASS | [D-HttpApiAuthorized.log:11](D-HttpApiAuthorized.log) |
| 10 | [http-subcheck] PASS I17 HTTP 내부 path 비노출 | PASS | [D-HttpApiAuthorized.log:12](D-HttpApiAuthorized.log) |
| 11 | [http-subcheck] PASS I04 HTTP 잘못된 query 거부 8 | PASS | [D-HttpApiAuthorized.log:13](D-HttpApiAuthorized.log) |
| 12 | [http-subcheck] PASS I04 HTTP 잘못된 query 거부 9 | PASS | [D-HttpApiAuthorized.log:14](D-HttpApiAuthorized.log) |
| 13 | [http-subcheck] PASS I04 HTTP 잘못된 query 거부 10 | PASS | [D-HttpApiAuthorized.log:15](D-HttpApiAuthorized.log) |
| 14 | [http-subcheck] PASS I04 HTTP 잘못된 query 거부 11 | PASS | [D-HttpApiAuthorized.log:16](D-HttpApiAuthorized.log) |
| 15 | [http-subcheck] PASS I04 HTTP 잘못된 query 거부 12 | PASS | [D-HttpApiAuthorized.log:17](D-HttpApiAuthorized.log) |
| 16 | [http-subcheck] PASS I20 Range status expected=206 actual=206 | PASS | [D-HttpApiAuthorized.log:18](D-HttpApiAuthorized.log) |
| 17 | [http-subcheck] PASS I20 Range Content-Range 일치 | PASS | [D-HttpApiAuthorized.log:19](D-HttpApiAuthorized.log) |
| 18 | [http-subcheck] PASS I20 Range body expected=4 actual=4 byte 일치 | PASS | [D-HttpApiAuthorized.log:20](D-HttpApiAuthorized.log) |
| 19 | [http-subcheck] PASS I20 range status expected=206 actual=206 | PASS | [D-HttpApiAuthorized.log:21](D-HttpApiAuthorized.log) |
| 20 | [http-subcheck] PASS I20 range Content-Range 일치 | PASS | [D-HttpApiAuthorized.log:22](D-HttpApiAuthorized.log) |
| 21 | [http-subcheck] PASS I20 range body expected=4 actual=4 byte 일치 | PASS | [D-HttpApiAuthorized.log:23](D-HttpApiAuthorized.log) |
| 22 | [http-subcheck] PASS I20 rAnGe status expected=206 actual=206 | PASS | [D-HttpApiAuthorized.log:24](D-HttpApiAuthorized.log) |
| 23 | [http-subcheck] PASS I20 rAnGe Content-Range 일치 | PASS | [D-HttpApiAuthorized.log:25](D-HttpApiAuthorized.log) |
| 24 | [http-subcheck] PASS I20 rAnGe body expected=4 actual=4 byte 일치 | PASS | [D-HttpApiAuthorized.log:26](D-HttpApiAuthorized.log) |
| 25 | [http-subcheck] PASS I20/I21 실제 Range bytes=2-5 | PASS | [D-HttpApiAuthorized.log:27](D-HttpApiAuthorized.log) |
| 26 | [http-subcheck] PASS I20/I21 실제 Range bytes=10- | PASS | [D-HttpApiAuthorized.log:28](D-HttpApiAuthorized.log) |
| 27 | [http-subcheck] PASS I20/I21 실제 Range bytes=-7 | PASS | [D-HttpApiAuthorized.log:29](D-HttpApiAuthorized.log) |
| 28 | [http-subcheck] PASS I24 HTTP 전체 byte 일치 | PASS | [D-HttpApiAuthorized.log:30](D-HttpApiAuthorized.log) |
| 29 | [http-subcheck] PASS I22 HTTP 범위 거부 bytes=1-0 | PASS | [D-HttpApiAuthorized.log:31](D-HttpApiAuthorized.log) |
| 30 | [http-subcheck] PASS I22 HTTP 범위 거부 bytes=-0 | PASS | [D-HttpApiAuthorized.log:32](D-HttpApiAuthorized.log) |
| 31 | [http-subcheck] PASS I22 HTTP 범위 거부 bytes=0-1,3-4 | PASS | [D-HttpApiAuthorized.log:33](D-HttpApiAuthorized.log) |
| 32 | [http-subcheck] PASS I22 HTTP 범위 거부 bytes=18446744073709551616- | PASS | [D-HttpApiAuthorized.log:34](D-HttpApiAuthorized.log) |
| 33 | [http-subcheck] PASS I22 HTTP 범위 거부 bytes=0-14476 | PASS | [D-HttpApiAuthorized.log:35](D-HttpApiAuthorized.log) |
| 34 | [http-subcheck] PASS I22 HTTP 범위 거부 invalid | PASS | [D-HttpApiAuthorized.log:36](D-HttpApiAuthorized.log) |
| 35 | [http-subcheck] PASS I23 실제 HEAD full | PASS | [D-HttpApiAuthorized.log:37](D-HttpApiAuthorized.log) |
| 36 | [http-subcheck] PASS I23 실제 HEAD bytes=2-5 | PASS | [D-HttpApiAuthorized.log:38](D-HttpApiAuthorized.log) |
| 37 | [http-subcheck] PASS I17 HTTP 없는 opaque ID 거부 | PASS | [D-HttpApiAuthorized.log:39](D-HttpApiAuthorized.log) |

## D-HttpAuth.log

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [pass] D3D-01 actual managed 원본과 jobComplete2출력·physical 검증 | PASS | [D-HttpAuth.log:1](D-HttpAuth.log) |
| 2 | [seed-subcheck] PASS D3D-01 generated2출력 manifest/containment/hash | PASS | [D-HttpAuth.log:4](D-HttpAuth.log) |
| 3 | [auth-subcheck] PASS I12~I16 principal 0 route 0 expected=200 actual=200 | PASS | [D-HttpAuth.log:5](D-HttpAuth.log) |
| 4 | [auth-subcheck] PASS I02 principal 0 허용 채널만 status 반환 | PASS | [D-HttpAuth.log:6](D-HttpAuth.log) |
| 5 | [auth-subcheck] PASS I01 principal 0 실제 비녹화 상태 | PASS | [D-HttpAuth.log:7](D-HttpAuth.log) |
| 6 | [auth-subcheck] PASS S07-http-observations-global | PASS | [D-HttpAuth.log:8](D-HttpAuth.log) |
| 7 | [auth-subcheck] PASS I02/I17 principal 0 route 0 민감 field 비노출 | PASS | [D-HttpAuth.log:9](D-HttpAuth.log) |
| 8 | [auth-subcheck] PASS I12~I16 principal 0 route 1 expected=200 actual=200 | PASS | [D-HttpAuth.log:10](D-HttpAuth.log) |
| 9 | [auth-subcheck] PASS I02/I17 principal 0 route 1 민감 field 비노출 | PASS | [D-HttpAuth.log:11](D-HttpAuth.log) |
| 10 | [auth-subcheck] PASS I12~I16 principal 0 route 2 expected=200 actual=200 | PASS | [D-HttpAuth.log:12](D-HttpAuth.log) |
| 11 | [auth-subcheck] PASS I12~I16 principal 1 route 0 expected=200 actual=200 | PASS | [D-HttpAuth.log:13](D-HttpAuth.log) |
| 12 | [auth-subcheck] PASS I02 principal 1 허용 채널만 status 반환 | PASS | [D-HttpAuth.log:14](D-HttpAuth.log) |
| 13 | [auth-subcheck] PASS I01 principal 1 실제 비녹화 상태 | PASS | [D-HttpAuth.log:15](D-HttpAuth.log) |
| 14 | [auth-subcheck] PASS S07-http-observations-limited principal 1 | PASS | [D-HttpAuth.log:16](D-HttpAuth.log) |
| 15 | [auth-subcheck] PASS I02/I17 principal 1 route 0 민감 field 비노출 | PASS | [D-HttpAuth.log:17](D-HttpAuth.log) |
| 16 | [auth-subcheck] PASS I12~I16 principal 1 route 1 expected=200 actual=200 | PASS | [D-HttpAuth.log:18](D-HttpAuth.log) |
| 17 | [auth-subcheck] PASS I02/I17 principal 1 route 1 민감 field 비노출 | PASS | [D-HttpAuth.log:19](D-HttpAuth.log) |
| 18 | [auth-subcheck] PASS I12~I16 principal 1 route 2 expected=200 actual=200 | PASS | [D-HttpAuth.log:20](D-HttpAuth.log) |
| 19 | [auth-subcheck] PASS I12~I16 principal 2 route 0 expected=403 actual=403 | PASS | [D-HttpAuth.log:21](D-HttpAuth.log) |
| 20 | [auth-subcheck] PASS I02/I17 principal 2 route 0 민감 field 비노출 | PASS | [D-HttpAuth.log:22](D-HttpAuth.log) |
| 21 | [auth-subcheck] PASS I12~I16 principal 2 route 1 expected=403 actual=403 | PASS | [D-HttpAuth.log:23](D-HttpAuth.log) |
| 22 | [auth-subcheck] PASS I02/I17 principal 2 route 1 민감 field 비노출 | PASS | [D-HttpAuth.log:24](D-HttpAuth.log) |
| 23 | [auth-subcheck] PASS I12~I16 principal 2 route 2 expected=403 actual=403 | PASS | [D-HttpAuth.log:25](D-HttpAuth.log) |
| 24 | [auth-subcheck] PASS I12~I16 principal 3 route 0 expected=200 actual=200 | PASS | [D-HttpAuth.log:26](D-HttpAuth.log) |
| 25 | [auth-subcheck] PASS I02 principal 3 허용 채널만 status 반환 | PASS | [D-HttpAuth.log:27](D-HttpAuth.log) |
| 26 | [auth-subcheck] PASS I01 principal 3 실제 비녹화 상태 | PASS | [D-HttpAuth.log:28](D-HttpAuth.log) |
| 27 | [auth-subcheck] PASS S07-http-observations-limited principal 3 | PASS | [D-HttpAuth.log:29](D-HttpAuth.log) |
| 28 | [auth-subcheck] PASS I02/I17 principal 3 route 0 민감 field 비노출 | PASS | [D-HttpAuth.log:30](D-HttpAuth.log) |
| 29 | [auth-subcheck] PASS I12~I16 principal 3 route 1 expected=403 actual=403 | PASS | [D-HttpAuth.log:31](D-HttpAuth.log) |
| 30 | [auth-subcheck] PASS I02/I17 principal 3 route 1 민감 field 비노출 | PASS | [D-HttpAuth.log:32](D-HttpAuth.log) |
| 31 | [auth-subcheck] PASS I12~I16 principal 3 route 2 expected=404 actual=404 | PASS | [D-HttpAuth.log:33](D-HttpAuth.log) |
| 32 | [auth-subcheck] PASS I12~I16 principal 4 route 0 expected=403 actual=403 | PASS | [D-HttpAuth.log:34](D-HttpAuth.log) |
| 33 | [auth-subcheck] PASS I02/I17 principal 4 route 0 민감 field 비노출 | PASS | [D-HttpAuth.log:35](D-HttpAuth.log) |
| 34 | [auth-subcheck] PASS I12~I16 principal 4 route 1 expected=403 actual=403 | PASS | [D-HttpAuth.log:36](D-HttpAuth.log) |
| 35 | [auth-subcheck] PASS I02/I17 principal 4 route 1 민감 field 비노출 | PASS | [D-HttpAuth.log:37](D-HttpAuth.log) |
| 36 | [auth-subcheck] PASS I12~I16 principal 4 route 2 expected=403 actual=403 | PASS | [D-HttpAuth.log:38](D-HttpAuth.log) |
| 37 | [auth-subcheck] PASS I15 미인증 API expected=401 actual=401 | PASS | [D-HttpAuth.log:39](D-HttpAuth.log) |
| 38 | [auth-subcheck] PASS I15 미인증 API expected=401 actual=401 | PASS | [D-HttpAuth.log:40](D-HttpAuth.log) |
| 39 | [auth-subcheck] PASS I15 미인증 API expected=401 actual=401 | PASS | [D-HttpAuth.log:41](D-HttpAuth.log) |
| 40 | [auth-subcheck] PASS I16 operator의 다른 채널 조회 거부 | PASS | [D-HttpAuth.log:42](D-HttpAuth.log) |
| 41 | [auth-subcheck] PASS I34 viewer 녹화 화면 거부 status=403 | PASS | [D-HttpAuth.log:43](D-HttpAuth.log) |
| 42 | [auth-subcheck] PASS I17 인증 fixture plaintext 저장 없음 | PASS | [D-HttpAuth.log:44](D-HttpAuth.log) |

## D-HttpLifecycle.log

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [pass] D3D-01 actual managed 원본과 jobComplete2출력·physical 검증 | PASS | [D-HttpLifecycle.log:1](D-HttpLifecycle.log) |
| 2 | [pass] D3D-07 valid MP4 free atom64MiB·최종 physical/hash 검증 | PASS | [D-HttpLifecycle.log:2](D-HttpLifecycle.log) |
| 3 | [seed-subcheck] PASS D3D-01 generated2출력 manifest/containment/hash | PASS | [D-HttpLifecycle.log:5](D-HttpLifecycle.log) |
| 4 | [lifecycle-subcheck] PASS I24 큰 파일 status/길이 | PASS | [D-HttpLifecycle.log:6](D-HttpLifecycle.log) |
| 5 | [lifecycle-subcheck] PASS I24 64MiB 전체 streaming hash 일치 | PASS | [D-HttpLifecycle.log:7](D-HttpLifecycle.log) |
| 6 | [lifecycle-subcheck] PASS I25 전체 응답 뒤 hold0 | PASS | [D-HttpLifecycle.log:8](D-HttpLifecycle.log) |
| 7 | [lifecycle-subcheck] PASS I24 256KiB 경계 Range byte 일치 | PASS | [D-HttpLifecycle.log:9](D-HttpLifecycle.log) |
| 8 | [lifecycle-subcheck] PASS I26 disconnect 전 실제 hold1 | PASS | [D-HttpLifecycle.log:10](D-HttpLifecycle.log) |
| 9 | [lifecycle-subcheck] PASS I26 disconnect 뒤 실제 hold0 | PASS | [D-HttpLifecycle.log:11](D-HttpLifecycle.log) |
| 10 | [lifecycle-subcheck] PASS I26 disconnect 뒤 서버 health200 | PASS | [D-HttpLifecycle.log:12](D-HttpLifecycle.log) |
| 11 | [lifecycle-subcheck] PASS I26 서버 종료 전 실제 hold1 | PASS | [D-HttpLifecycle.log:13](D-HttpLifecycle.log) |
| 12 | [lifecycle-subcheck] PASS I26 활성 전송 중 정상 종료 | PASS | [D-HttpLifecycle.log:14](D-HttpLifecycle.log) |
| 13 | [lifecycle-subcheck] PASS I26 정상 종료 후 영속 hold0 | PASS | [D-HttpLifecycle.log:15](D-HttpLifecycle.log) |

## D-Harness.log

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [v410-s06-harness-unit] PASS H01 elapsedMs=1 | PASS | [D-Harness.log:3](D-Harness.log) |
| 2 | [v410-s06-harness-unit] PASS H02 elapsedMs=29 | PASS | [D-Harness.log:5](D-Harness.log) |
| 3 | [v410-s06-harness-unit] PASS H03 elapsedMs=0 | PASS | [D-Harness.log:6](D-Harness.log) |
| 4 | [v410-s06-harness-unit] PASS H03-R01 elapsedMs=1 | PASS | [D-Harness.log:7](D-Harness.log) |
| 5 | [v410-s06-harness-unit] PASS H03-R02 elapsedMs=0 | PASS | [D-Harness.log:8](D-Harness.log) |

## 역사적 실행 D-SeedExpectedRedFixed.log

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [fail] D3D-01 actual managed 원본과 jobComplete2출력 fixture 부재 | FAIL | [D-SeedExpectedRedFixed.log:1](D-SeedExpectedRedFixed.log) |

## 역사적 실행 D-HttpApi.log

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 | [pass] D3D-01 actual managed 원본과 jobComplete2출력·physical 검증 | PASS | [D-HttpApi.log:1](D-HttpApi.log) |
| 2 | [seed-subcheck] PASS D3D-01 generated2출력 manifest/containment/hash | PASS | [D-HttpApi.log:4](D-HttpApi.log) |
