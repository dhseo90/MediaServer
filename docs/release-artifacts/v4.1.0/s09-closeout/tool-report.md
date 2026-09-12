# S09 잔여 테스트·도구 정리 결과

독자: S09 잔여 변경 검토·커밋 담당자. 본 문서는 2026-09-13 단기 검증 증적이다. 정책·전체 S09 완료 판정은 중앙 기록을 따른다. 과거 장시간/UI 실패를 이번 검사로 PASS 승격하지 않는다.

## 읽기 검토 전수

현재 dirty/untracked인 아래 10개 파일 전문을 읽었다. 제품 core/UI 변경과 최종 build·commit은 메인 소유이며 담당자가 수정하지 않았다.

| 파일 | 전문 읽음 | 목적·현재 정합성 | 증거 재사용 경계 |
| --- | --- | --- | --- |
| recording_longrun_progress.mjs | 예 | V1 진행/삭제 판정 불변, 안전 진단만 추가 | LD01 기존44개 보존; timestamp 부재 diagnostic 누락은 이번 보완 |
| recording_longrun_progress.test.mjs | 예 | 진행·redaction·기존43개와 LD01 | 새 누락필드1행 추가하여45개; 실제120분 실행 아님 |
| recording_timeline_smoke.cpp | 예 | UI anchor/선택 큰파일/삭제·손상·미완결 event seed; Writing 내부안전성 | read-model은 메타데이터 fixture, 실제 영상/UI 아님 |
| verify_v410_recording_ui_contract.mjs | 예 | 격리 bootstrap·HTTP·UI hold/cleanup | 미선언 passwords 결함을 실제 auth 실행으로 수정·검증 |
| recording_playback_status.test.mjs | 예 | 실제 제품 JS의 clearPlayer/metadata 동작 VM 검사 | 기존7개·당시 실제브라우저 evidence와 구분; 이번 실행은 메인 담당 |
| recording_ui_range_proxy.mjs | 예 | 고정 loopback upstream·Host/Origin·안전 Range 관측 | UI 요청 상관관측 보조, 자체 UI PASS 아님 |
| recording_ui_range_proxy.test.mjs | 예 | 전달·cookie비기록·실패·disconnect·상한·cleanup | 이번10개; RP08은 실제 파일쓰기 오류가 아닌 상한 latch |
| stream_shutdown_lifecycle_smoke.cpp | 예 | 실제 core와 worker barrier로6수명 조건 | 기존6/6는 GST-off 단기; 실앱·장시간 대체 불가, 이번 실행 메인 |
| verify_stream_shutdown_lifecycle.sh | 예 | bounded subprocess6개/직접 compile/owned temp cleanup | 실제 core 수명 fixture이며 소유 binary만 정리 |
| verify_v410_recording_ui_auth_prep.test.mjs | 예 | 실제 seed·옵션·합성bootstrap·seek 미디어 준비 | 이번17개; bootstrap stub은 실제HTTP40과 별개, UI PASS 아님 |

위 파일의 경로는 모두 `scripts/internal/` 하위다. 기존 준비 로그의 proxy10/0, UA/SF17/0, harness40check, playback7/0, lifecycle6/0은 각각 당시 코드와 한정 범위의 evidence다. 새 HTTP auth 마지막 경로의 성공을 과거 static/harness 결과로 대체하지 않았다.

## 발견·수정 및 실패 이력

1. `verifyRecordingHttpAuth`의 bootstrap 인자로 inline `authPasswords()`를 쓰고 마지막에는 미선언 `passwords`를 참조했다. 실제 격리 실행에서 HTTP39개 통과 후 `passwords is not defined`를 확인했다. 로컬 `const passwords=authPasswords()`를 동일 bootstrap과 마지막 검사에 사용하는 최소 수정 후 HTTP40개 전부 통과했다. 제품 auth·공개 schema는 바꾸지 않았다.
2. longrun 오류 진단의 start/end 부재 처리에서 무조건 역참조가 TypeError를 만들었다. 실행 전 등록한 `S09-LD01 missing timestamp diagnostics remain specific and redacted`를 추가해44/1 RED를 확인하고 진단 작성 부분만 optional 접근으로 바꿨다. 기존 실패식은 유지하며45/0 GREEN이다. start/end 각각 부재에서 positive-metadata·null·비밀문자열 비노출을 직접 확인한다.
3. HTTP 최초 실행은 loopback listen EPERM로 서버 기동 전 실패했다. 환경 실패이며 예상 RED가 아니다. root cleanup 후 승인된 동일 명령을 승격 실행했다. 실패 로그를 삭제하지 않았다.

## 실행 전수 요약

| 로그 | 정확 명령/실행 | exit·결과 | 시간·출처 |
| --- | --- | --- | --- |
| [AuthEnvironment.log](AuthEnvironment.log) | HTTP auth 격리 최초 실행 | 1; loopback EPERM, 예상 RED 아님 | 4,702ms/메모리 wrapper Date.now |
| [AuthRed.log](AuthRed.log) | HTTP auth 승인 승격 재현 | 1; HTTP39 pass 뒤 미선언 passwords | 7,790ms/메모리 wrapper Date.now |
| [AuthGreen.log](AuthGreen.log) | HTTP auth 최소 보완 | 0; HTTP40/0 | 6,754ms/메모리 wrapper Date.now |
| [LdRed.log](LdRed.log) | node scripts/internal/recording_longrun_progress.test.mjs | 1; 44 pass/1 예상 fail | 47ms/test Date.now |
| [LdGreen.log](LdGreen.log) | node scripts/internal/recording_longrun_progress.test.mjs | 0;45/0 | 49ms/test Date.now |
| [Proxy.log](Proxy.log) | node scripts/internal/recording_ui_range_proxy.test.mjs | 0;10/0 | 58ms/test Date.now |
| [AuthPrep.log](AuthPrep.log) | node scripts/internal/verify_v410_recording_ui_auth_prep.test.mjs | 0;17/0 | 전체 경과 미집계(출력 미제공) |
| [Harness.log](Harness.log) | node scripts/internal/verify_v410_recording_harness.test.mjs all | 0;5cases/40checks/0fail | 26ms/test Date.now |
| [Timeline.log](Timeline.log) | ./server.sh verify-v410-recording-timeline --read-model | 0;166 assertions+cleanup1 pass | 전체 경과 미집계(출력 미제공) |

HTTP 세 실행의 대상 명령은 `node scripts/internal/verify_v410_recording_ui_contract.mjs --http-auth`다. 아래 실행 wrapper는 값을 command argv나 저장 파일에 포함하지 않고 CSPRNG5개를 자식 env에만 전달한다. 원출력에 값이 포함되면 출력하지 않고 redaction failure로 종료한다. 제품 users 파일은 hash만 저장되고 실제 plaintext 검사도 통과했다. 기존 auth-prep의 별도 테스트용0600 handoff 생성/삭제 검사는 UA04 범위이며 HTTP 실행 비밀번호를 사용하지 않는다.

```sh
node --input-type=module -e 'import crypto from "node:crypto";import {spawnSync} from "node:child_process";const env={};for(const k of ["HOME","PATH","TMPDIR","USER","LOGNAME","LANG","LC_ALL","LC_CTYPE"])if(process.env[k]!==undefined)env[k]=process.env[k];const names=["MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD","MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD","MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD","MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE","MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO"];const secrets=names.map(()=>crypto.randomBytes(24).toString("base64url"));names.forEach((n,i)=>env[n]=secrets[i]);const start=Date.now();const r=spawnSync(process.execPath,["scripts/internal/verify_v410_recording_ui_contract.mjs","--http-auth"],{env,encoding:"utf8",timeout:120000,maxBuffer:4194304});const out=(r.stdout||"")+(r.stderr||"");if(secrets.some(s=>out.includes(s))){console.log("[redaction-fail] secret suppressed");process.exitCode=2;}else{process.stdout.write(out);console.log(JSON.stringify({exit:r.status,signal:r.signal,errorCode:r.error?.code??null,elapsedMs:Date.now()-start,secretsPrinted:false}));process.exitCode=r.status??2;}'
```

token start/end/consumed는 작업별 사용량 계측 부재로 미집계다. elapsed가 없는 명령은 첫 poll 대기시간을 전체 경과로 꾸미지 않았다. 커밋·푸시·새 장시간·새 실제 UI·제품 수정은 담당자가 수행하지 않았다.

## 개별 결과 전수

### AuthEnvironment.log

| 제목 | 실제 실행 결과 | pass/fail |
| --- | --- | --- |
| 1. read-model 임시 root 삭제 확인: /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-s06-read.bdlzJv | AuthEnvironment.log 실제 출력 | pass |
| 2. [V410-S06 verifier] FAIL: listen EPERM: operation not permitted 127.0.0.1 | AuthEnvironment.log 실제 출력 | fail |
### AuthRed.log

| 제목 | 실제 실행 결과 | pass/fail |
| --- | --- | --- |
| 1. read-model 임시 root 삭제 확인: /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-s06-read.cwLebN | AuthRed.log 실제 출력 | pass |
| 2. I12~I16 principal 0 route 0 expected=200 actual=200 | AuthRed.log 실제 출력 | pass |
| 3. I02 principal 0 허용 채널만 status 반환 | AuthRed.log 실제 출력 | pass |
| 4. I01 principal 0 실제 비녹화 상태 | AuthRed.log 실제 출력 | pass |
| 5. S07-http-observations-global | AuthRed.log 실제 출력 | pass |
| 6. I02/I17 principal 0 route 0 민감 field 비노출 | AuthRed.log 실제 출력 | pass |
| 7. I12~I16 principal 0 route 1 expected=200 actual=200 | AuthRed.log 실제 출력 | pass |
| 8. I02/I17 principal 0 route 1 민감 field 비노출 | AuthRed.log 실제 출력 | pass |
| 9. I12~I16 principal 0 route 2 expected=200 actual=200 | AuthRed.log 실제 출력 | pass |
| 10. I12~I16 principal 1 route 0 expected=200 actual=200 | AuthRed.log 실제 출력 | pass |
| 11. I02 principal 1 허용 채널만 status 반환 | AuthRed.log 실제 출력 | pass |
| 12. I01 principal 1 실제 비녹화 상태 | AuthRed.log 실제 출력 | pass |
| 13. S07-http-observations-limited principal 1 | AuthRed.log 실제 출력 | pass |
| 14. I02/I17 principal 1 route 0 민감 field 비노출 | AuthRed.log 실제 출력 | pass |
| 15. I12~I16 principal 1 route 1 expected=200 actual=200 | AuthRed.log 실제 출력 | pass |
| 16. I02/I17 principal 1 route 1 민감 field 비노출 | AuthRed.log 실제 출력 | pass |
| 17. I12~I16 principal 1 route 2 expected=200 actual=200 | AuthRed.log 실제 출력 | pass |
| 18. I12~I16 principal 2 route 0 expected=403 actual=403 | AuthRed.log 실제 출력 | pass |
| 19. I02/I17 principal 2 route 0 민감 field 비노출 | AuthRed.log 실제 출력 | pass |
| 20. I12~I16 principal 2 route 1 expected=403 actual=403 | AuthRed.log 실제 출력 | pass |
| 21. I02/I17 principal 2 route 1 민감 field 비노출 | AuthRed.log 실제 출력 | pass |
| 22. I12~I16 principal 2 route 2 expected=403 actual=403 | AuthRed.log 실제 출력 | pass |
| 23. I12~I16 principal 3 route 0 expected=200 actual=200 | AuthRed.log 실제 출력 | pass |
| 24. I02 principal 3 허용 채널만 status 반환 | AuthRed.log 실제 출력 | pass |
| 25. I01 principal 3 실제 비녹화 상태 | AuthRed.log 실제 출력 | pass |
| 26. S07-http-observations-limited principal 3 | AuthRed.log 실제 출력 | pass |
| 27. I02/I17 principal 3 route 0 민감 field 비노출 | AuthRed.log 실제 출력 | pass |
| 28. I12~I16 principal 3 route 1 expected=403 actual=403 | AuthRed.log 실제 출력 | pass |
| 29. I02/I17 principal 3 route 1 민감 field 비노출 | AuthRed.log 실제 출력 | pass |
| 30. I12~I16 principal 3 route 2 expected=404 actual=404 | AuthRed.log 실제 출력 | pass |
| 31. I12~I16 principal 4 route 0 expected=403 actual=403 | AuthRed.log 실제 출력 | pass |
| 32. I02/I17 principal 4 route 0 민감 field 비노출 | AuthRed.log 실제 출력 | pass |
| 33. I12~I16 principal 4 route 1 expected=403 actual=403 | AuthRed.log 실제 출력 | pass |
| 34. I02/I17 principal 4 route 1 민감 field 비노출 | AuthRed.log 실제 출력 | pass |
| 35. I12~I16 principal 4 route 2 expected=403 actual=403 | AuthRed.log 실제 출력 | pass |
| 36. I15 미인증 API expected=401 actual=401 | AuthRed.log 실제 출력 | pass |
| 37. I15 미인증 API expected=401 actual=401 | AuthRed.log 실제 출력 | pass |
| 38. I15 미인증 API expected=401 actual=401 | AuthRed.log 실제 출력 | pass |
| 39. I16 operator의 다른 채널 조회 거부 | AuthRed.log 실제 출력 | pass |
| 40. I34 viewer 녹화 화면 거부 status=403 | AuthRed.log 실제 출력 | pass |
| 41. [V410-S06 verifier] FAIL: passwords is not defined | AuthRed.log 실제 출력 | fail |
### AuthGreen.log

| 제목 | 실제 실행 결과 | pass/fail |
| --- | --- | --- |
| 1. read-model 임시 root 삭제 확인: /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-s06-read.CypfVm | AuthGreen.log 실제 출력 | pass |
| 2. I12~I16 principal 0 route 0 expected=200 actual=200 | AuthGreen.log 실제 출력 | pass |
| 3. I02 principal 0 허용 채널만 status 반환 | AuthGreen.log 실제 출력 | pass |
| 4. I01 principal 0 실제 비녹화 상태 | AuthGreen.log 실제 출력 | pass |
| 5. S07-http-observations-global | AuthGreen.log 실제 출력 | pass |
| 6. I02/I17 principal 0 route 0 민감 field 비노출 | AuthGreen.log 실제 출력 | pass |
| 7. I12~I16 principal 0 route 1 expected=200 actual=200 | AuthGreen.log 실제 출력 | pass |
| 8. I02/I17 principal 0 route 1 민감 field 비노출 | AuthGreen.log 실제 출력 | pass |
| 9. I12~I16 principal 0 route 2 expected=200 actual=200 | AuthGreen.log 실제 출력 | pass |
| 10. I12~I16 principal 1 route 0 expected=200 actual=200 | AuthGreen.log 실제 출력 | pass |
| 11. I02 principal 1 허용 채널만 status 반환 | AuthGreen.log 실제 출력 | pass |
| 12. I01 principal 1 실제 비녹화 상태 | AuthGreen.log 실제 출력 | pass |
| 13. S07-http-observations-limited principal 1 | AuthGreen.log 실제 출력 | pass |
| 14. I02/I17 principal 1 route 0 민감 field 비노출 | AuthGreen.log 실제 출력 | pass |
| 15. I12~I16 principal 1 route 1 expected=200 actual=200 | AuthGreen.log 실제 출력 | pass |
| 16. I02/I17 principal 1 route 1 민감 field 비노출 | AuthGreen.log 실제 출력 | pass |
| 17. I12~I16 principal 1 route 2 expected=200 actual=200 | AuthGreen.log 실제 출력 | pass |
| 18. I12~I16 principal 2 route 0 expected=403 actual=403 | AuthGreen.log 실제 출력 | pass |
| 19. I02/I17 principal 2 route 0 민감 field 비노출 | AuthGreen.log 실제 출력 | pass |
| 20. I12~I16 principal 2 route 1 expected=403 actual=403 | AuthGreen.log 실제 출력 | pass |
| 21. I02/I17 principal 2 route 1 민감 field 비노출 | AuthGreen.log 실제 출력 | pass |
| 22. I12~I16 principal 2 route 2 expected=403 actual=403 | AuthGreen.log 실제 출력 | pass |
| 23. I12~I16 principal 3 route 0 expected=200 actual=200 | AuthGreen.log 실제 출력 | pass |
| 24. I02 principal 3 허용 채널만 status 반환 | AuthGreen.log 실제 출력 | pass |
| 25. I01 principal 3 실제 비녹화 상태 | AuthGreen.log 실제 출력 | pass |
| 26. S07-http-observations-limited principal 3 | AuthGreen.log 실제 출력 | pass |
| 27. I02/I17 principal 3 route 0 민감 field 비노출 | AuthGreen.log 실제 출력 | pass |
| 28. I12~I16 principal 3 route 1 expected=403 actual=403 | AuthGreen.log 실제 출력 | pass |
| 29. I02/I17 principal 3 route 1 민감 field 비노출 | AuthGreen.log 실제 출력 | pass |
| 30. I12~I16 principal 3 route 2 expected=404 actual=404 | AuthGreen.log 실제 출력 | pass |
| 31. I12~I16 principal 4 route 0 expected=403 actual=403 | AuthGreen.log 실제 출력 | pass |
| 32. I02/I17 principal 4 route 0 민감 field 비노출 | AuthGreen.log 실제 출력 | pass |
| 33. I12~I16 principal 4 route 1 expected=403 actual=403 | AuthGreen.log 실제 출력 | pass |
| 34. I02/I17 principal 4 route 1 민감 field 비노출 | AuthGreen.log 실제 출력 | pass |
| 35. I12~I16 principal 4 route 2 expected=403 actual=403 | AuthGreen.log 실제 출력 | pass |
| 36. I15 미인증 API expected=401 actual=401 | AuthGreen.log 실제 출력 | pass |
| 37. I15 미인증 API expected=401 actual=401 | AuthGreen.log 실제 출력 | pass |
| 38. I15 미인증 API expected=401 actual=401 | AuthGreen.log 실제 출력 | pass |
| 39. I16 operator의 다른 채널 조회 거부 | AuthGreen.log 실제 출력 | pass |
| 40. I34 viewer 녹화 화면 거부 status=403 | AuthGreen.log 실제 출력 | pass |
| 41. I17 인증 fixture plaintext 저장 없음 | AuthGreen.log 실제 출력 | pass |
### LdRed.log

| 제목 | 실제 실행 결과 | pass/fail |
| --- | --- | --- |
| 1. explicit 120 minutes accepted | LdRed.log 실제 출력 | pass |
| 2. invalid CLI [] | LdRed.log 실제 출력 | pass |
| 3. invalid CLI ["120"] | LdRed.log 실제 출력 | pass |
| 4. invalid CLI ["--duration-minutes","30"] | LdRed.log 실제 출력 | pass |
| 5. invalid CLI ["--duration-minutes","120","extra"] | LdRed.log 실제 출력 | pass |
| 6. invalid CLI ["--unknown","120"] | LdRed.log 실제 출력 | pass |
| 7. two channels progress and ordered deletion | LdRed.log 실제 출력 | pass |
| 8. stall rejected | LdRed.log 실제 출력 | pass |
| 9. duplicate rejected | LdRed.log 실제 출력 | pass |
| 10. UTC regression rejected | LdRed.log 실제 출력 | pass |
| 11. completion without request rejected | LdRed.log 실제 출력 | pass |
| 12. invalid media metadata rejected | LdRed.log 실제 출력 | pass |
| 13. duration cannot be shortened | LdRed.log 실제 출력 | pass |
| 14. unknown channel cannot satisfy progress | LdRed.log 실제 출력 | pass |
| 15. backward clock rejected | LdRed.log 실제 출력 | pass |
| 16. sample continuous accepted | LdRed.log 실제 출력 | pass |
| 17. sample gap rejected | LdRed.log 실제 출력 | pass |
| 18. sample wrong PID rejected | LdRed.log 실제 출력 | pass |
| 19. sample wrong identity rejected | LdRed.log 실제 출력 | pass |
| 20. sample missing beginning rejected | LdRed.log 실제 출력 | pass |
| 21. sample missing end rejected | LdRed.log 실제 출력 | pass |
| 22. sample insufficient rejected | LdRed.log 실제 출력 | pass |
| 23. actual golden schema accepted | LdRed.log 실제 출력 | pass |
| 24. full duration distributed progress accepted | LdRed.log 실제 출력 | pass |
| 25. last moment only cannot pass | LdRed.log 실제 출력 | pass |
| 26. ID limit rejected | LdRed.log 실제 출력 | pass |
| 27. UTF8 byte limit rejected | LdRed.log 실제 출력 | pass |
| 28. queried revision advanced disable | LdRed.log 실제 출력 | pass |
| 29. missing source rejected | LdRed.log 실제 출력 | pass |
| 30. duplicate source rejected | LdRed.log 실제 출력 | pass |
| 31. invalid revision rejected | LdRed.log 실제 출력 | pass |
| 32. public CLI rejects [] | LdRed.log 실제 출력 | pass |
| 33. public CLI rejects ["120"] | LdRed.log 실제 출력 | pass |
| 34. public CLI rejects ["--duration-minutes","30"] | LdRed.log 실제 출력 | pass |
| 35. public CLI rejects ["--duration-minutes","120","extra"] | LdRed.log 실제 출력 | pass |
| 36. public CLI rejects ["--unknown","120"] | LdRed.log 실제 출력 | pass |
| 37. completed batch returns media path once | LdRed.log 실제 출력 | pass |
| 38. missing media path rejected | LdRed.log 실제 출력 | pass |
| 39. media path byte limit rejected | LdRed.log 실제 출력 | pass |
| 40. ENOENT media absent | LdRed.log 실제 출력 | pass |
| 41. regular media present rejected | LdRed.log 실제 출력 | pass |
| 42. dangling symlink present rejected | LdRed.log 실제 출력 | pass |
| 43. media permission error rejected | LdRed.log 실제 출력 | pass |
| 44. S09-LD01 invalid segment diagnostics are specific and redacted | LdRed.log 실제 출력 | pass |
| 45. S09-LD01 missing timestamp diagnostics remain specific and redacted | LdRed.log 실제 출력 | fail |
### LdGreen.log

| 제목 | 실제 실행 결과 | pass/fail |
| --- | --- | --- |
| 1. explicit 120 minutes accepted | LdGreen.log 실제 출력 | pass |
| 2. invalid CLI [] | LdGreen.log 실제 출력 | pass |
| 3. invalid CLI ["120"] | LdGreen.log 실제 출력 | pass |
| 4. invalid CLI ["--duration-minutes","30"] | LdGreen.log 실제 출력 | pass |
| 5. invalid CLI ["--duration-minutes","120","extra"] | LdGreen.log 실제 출력 | pass |
| 6. invalid CLI ["--unknown","120"] | LdGreen.log 실제 출력 | pass |
| 7. two channels progress and ordered deletion | LdGreen.log 실제 출력 | pass |
| 8. stall rejected | LdGreen.log 실제 출력 | pass |
| 9. duplicate rejected | LdGreen.log 실제 출력 | pass |
| 10. UTC regression rejected | LdGreen.log 실제 출력 | pass |
| 11. completion without request rejected | LdGreen.log 실제 출력 | pass |
| 12. invalid media metadata rejected | LdGreen.log 실제 출력 | pass |
| 13. duration cannot be shortened | LdGreen.log 실제 출력 | pass |
| 14. unknown channel cannot satisfy progress | LdGreen.log 실제 출력 | pass |
| 15. backward clock rejected | LdGreen.log 실제 출력 | pass |
| 16. sample continuous accepted | LdGreen.log 실제 출력 | pass |
| 17. sample gap rejected | LdGreen.log 실제 출력 | pass |
| 18. sample wrong PID rejected | LdGreen.log 실제 출력 | pass |
| 19. sample wrong identity rejected | LdGreen.log 실제 출력 | pass |
| 20. sample missing beginning rejected | LdGreen.log 실제 출력 | pass |
| 21. sample missing end rejected | LdGreen.log 실제 출력 | pass |
| 22. sample insufficient rejected | LdGreen.log 실제 출력 | pass |
| 23. actual golden schema accepted | LdGreen.log 실제 출력 | pass |
| 24. full duration distributed progress accepted | LdGreen.log 실제 출력 | pass |
| 25. last moment only cannot pass | LdGreen.log 실제 출력 | pass |
| 26. ID limit rejected | LdGreen.log 실제 출력 | pass |
| 27. UTF8 byte limit rejected | LdGreen.log 실제 출력 | pass |
| 28. queried revision advanced disable | LdGreen.log 실제 출력 | pass |
| 29. missing source rejected | LdGreen.log 실제 출력 | pass |
| 30. duplicate source rejected | LdGreen.log 실제 출력 | pass |
| 31. invalid revision rejected | LdGreen.log 실제 출력 | pass |
| 32. public CLI rejects [] | LdGreen.log 실제 출력 | pass |
| 33. public CLI rejects ["120"] | LdGreen.log 실제 출력 | pass |
| 34. public CLI rejects ["--duration-minutes","30"] | LdGreen.log 실제 출력 | pass |
| 35. public CLI rejects ["--duration-minutes","120","extra"] | LdGreen.log 실제 출력 | pass |
| 36. public CLI rejects ["--unknown","120"] | LdGreen.log 실제 출력 | pass |
| 37. completed batch returns media path once | LdGreen.log 실제 출력 | pass |
| 38. missing media path rejected | LdGreen.log 실제 출력 | pass |
| 39. media path byte limit rejected | LdGreen.log 실제 출력 | pass |
| 40. ENOENT media absent | LdGreen.log 실제 출력 | pass |
| 41. regular media present rejected | LdGreen.log 실제 출력 | pass |
| 42. dangling symlink present rejected | LdGreen.log 실제 출력 | pass |
| 43. media permission error rejected | LdGreen.log 실제 출력 | pass |
| 44. S09-LD01 invalid segment diagnostics are specific and redacted | LdGreen.log 실제 출력 | pass |
| 45. S09-LD01 missing timestamp diagnostics remain specific and redacted | LdGreen.log 실제 출력 | pass |
### Proxy.log

| 제목 | 실제 실행 결과 | pass/fail |
| --- | --- | --- |
| 1. RP01 fixed loopback upstream and origin-form target only | Proxy.log 실제 출력 | pass |
| 2. RP01 same-origin POST preserves proxy Host and external Origin rejection | Proxy.log 실제 출력 | pass |
| 3. RP02 streaming preserves 206 bytes and Range headers | Proxy.log 실제 출력 | pass |
| 4. RP03 cookie forwarded but absent from observation | Proxy.log 실제 출력 | pass |
| 5. RP04 nonmedia and invalid metadata never expose payload | Proxy.log 실제 출력 | pass |
| 6. RP05 upstream failure records incomplete safely | Proxy.log 실제 출력 | pass |
| 7. RP06 client disconnect closes upstream and records incomplete | Proxy.log 실제 출력 | pass |
| 8. RP07 close drains or destroys sockets and releases port | Proxy.log 실제 출력 | pass |
| 9. RP08 private log mode0600 bounded failure is latched | Proxy.log 실제 출력 | pass |
| 10. RP09 harness proxy cleanup failure still runs owned server cleanup | Proxy.log 실제 출력 | pass |
### AuthPrep.log

| 제목 | 실제 실행 결과 | pass/fail |
| --- | --- | --- |
| 1. SF01 optional seek fixture is accepted only with explicit UI anchor | AuthPrep.log 실제 출력 | pass |
| 2. UA01 anchor bounds and unknown options are rejected | AuthPrep.log 실제 출력 | pass |
| 3. UA05 inherited anchor and auth values are removed from legacy seed environment | AuthPrep.log 실제 출력 | pass |
| 4. UA02 random temporary passwords are distinct with sufficient length | AuthPrep.log 실제 출력 | pass |
| 5. UA03 actual bootstrap function orders setup five logins and four users | AuthPrep.log 실제 출력 | pass |
| 6. UA04 one-time handoff is mode0600 and refuses overwrite | AuthPrep.log 실제 출력 | pass |
| 7. UA07 live source payload distinguishes active quota from blocked reservation | AuthPrep.log 실제 출력 | pass |
| 8. UA01 new auth direct mode rejects missing anchor before preparation | AuthPrep.log 실제 출력 | pass |
| 9. UA06 actual seed command completes | AuthPrep.log 실제 출력 | pass |
| 10. UA06 actual catalog preserves anchored corrupt deleted and pending states | AuthPrep.log 실제 출력 | pass |
| 11. UA05 legacy UI seed retains original time and excludes new states | AuthPrep.log 실제 출력 | pass |
| 12. SF02 bounded owned seek fixture generation completes | AuthPrep.log 실제 출력 | pass |
| 13. SF03 actual H264 silent 1280x720 ten-second first-keyframe fixture | AuthPrep.log 실제 출력 | pass |
| 14. SF06 malformed media metadata and symlink input directory are rejected | AuthPrep.log 실제 출력 | pass |
| 15. SF04 only http-event catalog binds actual seek fixture size and SHA | AuthPrep.log 실제 출력 | pass |
| 16. SF05 other seeded media retain small original bytes | AuthPrep.log 실제 출력 | pass |
| 17. UA08 test root cleanup | AuthPrep.log 실제 출력 | pass |
### Harness.log

| 제목 | 실제 실행 결과 | pass/fail |
| --- | --- | --- |
| 1. H01 elapsedMs=1 | Harness.log 실제 출력 | pass |
| 2. H02 elapsedMs=24 | Harness.log 실제 출력 | pass |
| 3. H03 elapsedMs=0 | Harness.log 실제 출력 | pass |
| 4. H03-R01 elapsedMs=0 | Harness.log 실제 출력 | pass |
| 5. H03-R02 elapsedMs=1 | Harness.log 실제 출력 | pass |
### Timeline.log

| 제목 | 실제 실행 결과 | pass/fail |
| --- | --- | --- |
| 1. V410-S06-I03 catalog timeline item 반환 | Timeline.log 실제 출력 | pass |
| 2. I09 opaque 재생 URL | Timeline.log 실제 출력 | pass |
| 3. I03 끝 경계 인접 제외 | Timeline.log 실제 출력 | pass |
| 4. I03 다른 채널 제외 | Timeline.log 실제 출력 | pass |
| 5. I04 음수 시간 거부 | Timeline.log 실제 출력 | pass |
| 6. I04 역전 시간 거부 | Timeline.log 실제 출력 | pass |
| 7. I04 빈 페이지 제한 거부 | Timeline.log 실제 출력 | pass |
| 8. I04 과대 페이지 거부 | Timeline.log 실제 출력 | pass |
| 9. I05 큰 offset overflow 없이 빈 페이지 | Timeline.log 실제 출력 | pass |
| 10. I16 다른 채널 media 거부 | Timeline.log 실제 출력 | pass |
| 11. I17 경로형 ID 거부 | Timeline.log 실제 출력 | pass |
| 12. I09 fd 크기 MIME 확인 | Timeline.log 실제 출력 | pass |
| 13. I25 재생 hold 중 삭제 거부 | Timeline.log 실제 출력 | pass |
| 14. I19 경로 교체 뒤 열린 fd 기존 byte 유지 | Timeline.log 실제 출력 | pass |
| 15. I18 leaf symlink 거부 | Timeline.log 실제 출력 | pass |
| 16. I09 누락 파일 거부 | Timeline.log 실제 출력 | pass |
| 17. I09 크기 불일치 거부 | Timeline.log 실제 출력 | pass |
| 18. I09 비일반 파일 거부 | Timeline.log 실제 출력 | pass |
| 19. I06 같은 시간 event 우선 | Timeline.log 실제 출력 | pass |
| 20. I07 정확한 이벤트 ID 연결 | Timeline.log 실제 출력 | pass |
| 21. I10 실제 범위와 요청 범위 분리 | Timeline.log 실제 출력 | pass |
| 22. I05 정렬 뒤 페이지 적용 | Timeline.log 실제 출력 | pass |
| 23. I25 모든 실패 경로 hold 반환 후 삭제 허용 | Timeline.log 실제 출력 | pass |
| 24. I08 deletion pending 거부 | Timeline.log 실제 출력 | pass |
| 25. I08 pending timeline 재생 불가 | Timeline.log 실제 출력 | pass |
| 26. I11 검증한 fallback 영상 fd 제공 | Timeline.log 실제 출력 | pass |
| 27. I11 JSON이 아닌 실제 media byte 반환 | Timeline.log 실제 출력 | pass |
| 28. I11 fallback timeline을 complete로 과장하지 않음 | Timeline.log 실제 출력 | pass |
| 29. I11 중복 key manifest 거부 | Timeline.log 실제 출력 | pass |
| 30. I11 event 바인딩 불일치 거부 | Timeline.log 실제 출력 | pass |
| 31. I11 byteSize 문자열 타입 거부 | Timeline.log 실제 출력 | pass |
| 32. I11 64KiB 초과 manifest 거부 | Timeline.log 실제 출력 | pass |
| 33. I18 fallback media symlink 거부 | Timeline.log 실제 출력 | pass |
| 34. I09 fallback media 크기 불일치 거부 | Timeline.log 실제 출력 | pass |
| 35. I19 fallback 교체 뒤 기존 fd byte 유지 | Timeline.log 실제 출력 | pass |
| 36. I17 다른 채널 fallback ID 충돌도 거부 | Timeline.log 실제 출력 | pass |
| 37. I03 기존 숫자형 channel ID 유지 | Timeline.log 실제 출력 | pass |
| 38. I08/I17 삭제 완료 ID의 fallback 재사용 거부 | Timeline.log 실제 출력 | pass |
| 39. I20 closed Range 시작과 길이 | Timeline.log 실제 출력 | pass |
| 40. I26 열린 gate 신규 요청 admission | Timeline.log 실제 출력 | pass |
| 41. I26 닫힌 gate 신규 요청 거부 | Timeline.log 실제 출력 | pass |
| 42. I26 active flight 이전 drain 완료 금지 | Timeline.log 실제 출력 | pass |
| 43. I26 마지막 flight 해제 뒤 drain 완료 | Timeline.log 실제 출력 | pass |
| 44. I26 활성 socket shutdown 확인 | Timeline.log 실제 출력 | pass |
| 45. I25 동시 삭제 경쟁 0 | Timeline.log 실제 출력 | pass |
| 46. I26 경쟁 뒤 fd 반환 0 | Timeline.log 실제 출력 | pass |
| 47. I25 동시 삭제 경쟁 1 | Timeline.log 실제 출력 | pass |
| 48. I26 경쟁 뒤 fd 반환 1 | Timeline.log 실제 출력 | pass |
| 49. I25 동시 삭제 경쟁 2 | Timeline.log 실제 출력 | pass |
| 50. I26 경쟁 뒤 fd 반환 2 | Timeline.log 실제 출력 | pass |
| 51. I25 동시 삭제 경쟁 3 | Timeline.log 실제 출력 | pass |
| 52. I26 경쟁 뒤 fd 반환 3 | Timeline.log 실제 출력 | pass |
| 53. I25 동시 삭제 경쟁 4 | Timeline.log 실제 출력 | pass |
| 54. I26 경쟁 뒤 fd 반환 4 | Timeline.log 실제 출력 | pass |
| 55. I25 동시 삭제 경쟁 5 | Timeline.log 실제 출력 | pass |
| 56. I26 경쟁 뒤 fd 반환 5 | Timeline.log 실제 출력 | pass |
| 57. I25 동시 삭제 경쟁 6 | Timeline.log 실제 출력 | pass |
| 58. I26 경쟁 뒤 fd 반환 6 | Timeline.log 실제 출력 | pass |
| 59. I25 동시 삭제 경쟁 7 | Timeline.log 실제 출력 | pass |
| 60. I26 경쟁 뒤 fd 반환 7 | Timeline.log 실제 출력 | pass |
| 61. I25 동시 삭제 경쟁 8 | Timeline.log 실제 출력 | pass |
| 62. I26 경쟁 뒤 fd 반환 8 | Timeline.log 실제 출력 | pass |
| 63. I25 동시 삭제 경쟁 9 | Timeline.log 실제 출력 | pass |
| 64. I26 경쟁 뒤 fd 반환 9 | Timeline.log 실제 출력 | pass |
| 65. I25 동시 삭제 경쟁 10 | Timeline.log 실제 출력 | pass |
| 66. I26 경쟁 뒤 fd 반환 10 | Timeline.log 실제 출력 | pass |
| 67. I25 동시 삭제 경쟁 11 | Timeline.log 실제 출력 | pass |
| 68. I26 경쟁 뒤 fd 반환 11 | Timeline.log 실제 출력 | pass |
| 69. I25 동시 삭제 경쟁 12 | Timeline.log 실제 출력 | pass |
| 70. I26 경쟁 뒤 fd 반환 12 | Timeline.log 실제 출력 | pass |
| 71. I25 동시 삭제 경쟁 13 | Timeline.log 실제 출력 | pass |
| 72. I26 경쟁 뒤 fd 반환 13 | Timeline.log 실제 출력 | pass |
| 73. I25 동시 삭제 경쟁 14 | Timeline.log 실제 출력 | pass |
| 74. I26 경쟁 뒤 fd 반환 14 | Timeline.log 실제 출력 | pass |
| 75. I25 동시 삭제 경쟁 15 | Timeline.log 실제 출력 | pass |
| 76. I26 경쟁 뒤 fd 반환 15 | Timeline.log 실제 출력 | pass |
| 77. I08 Writing lifecycle 재생 불가 | Timeline.log 실제 출력 | pass |
| 78. I08 Writing finalize 등록 거부 | Timeline.log 실제 출력 | pass |
| 79. I08 Writing 실제 파일 존재해도 media 거부 | Timeline.log 실제 출력 | pass |
| 80. I08 Writing timeline 재생 노출 없음 | Timeline.log 실제 출력 | pass |
| 81. I08 Corrupt 실제 catalog 전이 | Timeline.log 실제 출력 | pass |
| 82. I08 Corrupt 실제 파일 존재해도 media 거부 | Timeline.log 실제 출력 | pass |
| 83. I08 Corrupt timeline 불가 상태 | Timeline.log 실제 출력 | pass |
| 84. V410-S06-I03 catalog timeline item 반환 | Timeline.log 실제 출력 | pass |
| 85. I09 opaque 재생 URL | Timeline.log 실제 출력 | pass |
| 86. I03 끝 경계 인접 제외 | Timeline.log 실제 출력 | pass |
| 87. I03 다른 채널 제외 | Timeline.log 실제 출력 | pass |
| 88. I04 음수 시간 거부 | Timeline.log 실제 출력 | pass |
| 89. I04 역전 시간 거부 | Timeline.log 실제 출력 | pass |
| 90. I04 빈 페이지 제한 거부 | Timeline.log 실제 출력 | pass |
| 91. I04 과대 페이지 거부 | Timeline.log 실제 출력 | pass |
| 92. I05 큰 offset overflow 없이 빈 페이지 | Timeline.log 실제 출력 | pass |
| 93. I16 다른 채널 media 거부 | Timeline.log 실제 출력 | pass |
| 94. I17 경로형 ID 거부 | Timeline.log 실제 출력 | pass |
| 95. I09 fd 크기 MIME 확인 | Timeline.log 실제 출력 | pass |
| 96. I25 재생 hold 중 삭제 거부 | Timeline.log 실제 출력 | pass |
| 97. I19 경로 교체 뒤 열린 fd 기존 byte 유지 | Timeline.log 실제 출력 | pass |
| 98. I18 leaf symlink 거부 | Timeline.log 실제 출력 | pass |
| 99. I09 누락 파일 거부 | Timeline.log 실제 출력 | pass |
| 100. I09 크기 불일치 거부 | Timeline.log 실제 출력 | pass |
| 101. I09 비일반 파일 거부 | Timeline.log 실제 출력 | pass |
| 102. I06 같은 시간 event 우선 | Timeline.log 실제 출력 | pass |
| 103. I07 정확한 이벤트 ID 연결 | Timeline.log 실제 출력 | pass |
| 104. I10 실제 범위와 요청 범위 분리 | Timeline.log 실제 출력 | pass |
| 105. I05 정렬 뒤 페이지 적용 | Timeline.log 실제 출력 | pass |
| 106. I25 모든 실패 경로 hold 반환 후 삭제 허용 | Timeline.log 실제 출력 | pass |
| 107. I08 deletion pending 거부 | Timeline.log 실제 출력 | pass |
| 108. I08 pending timeline 재생 불가 | Timeline.log 실제 출력 | pass |
| 109. I11 검증한 fallback 영상 fd 제공 | Timeline.log 실제 출력 | pass |
| 110. I11 JSON이 아닌 실제 media byte 반환 | Timeline.log 실제 출력 | pass |
| 111. I11 fallback timeline을 complete로 과장하지 않음 | Timeline.log 실제 출력 | pass |
| 112. I11 중복 key manifest 거부 | Timeline.log 실제 출력 | pass |
| 113. I11 event 바인딩 불일치 거부 | Timeline.log 실제 출력 | pass |
| 114. I11 byteSize 문자열 타입 거부 | Timeline.log 실제 출력 | pass |
| 115. I11 64KiB 초과 manifest 거부 | Timeline.log 실제 출력 | pass |
| 116. I18 fallback media symlink 거부 | Timeline.log 실제 출력 | pass |
| 117. I09 fallback media 크기 불일치 거부 | Timeline.log 실제 출력 | pass |
| 118. I19 fallback 교체 뒤 기존 fd byte 유지 | Timeline.log 실제 출력 | pass |
| 119. I17 다른 채널 fallback ID 충돌도 거부 | Timeline.log 실제 출력 | pass |
| 120. I03 기존 숫자형 channel ID 유지 | Timeline.log 실제 출력 | pass |
| 121. I08/I17 삭제 완료 ID의 fallback 재사용 거부 | Timeline.log 실제 출력 | pass |
| 122. I20 closed Range 시작과 길이 | Timeline.log 실제 출력 | pass |
| 123. I26 열린 gate 신규 요청 admission | Timeline.log 실제 출력 | pass |
| 124. I26 닫힌 gate 신규 요청 거부 | Timeline.log 실제 출력 | pass |
| 125. I26 active flight 이전 drain 완료 금지 | Timeline.log 실제 출력 | pass |
| 126. I26 마지막 flight 해제 뒤 drain 완료 | Timeline.log 실제 출력 | pass |
| 127. I26 활성 socket shutdown 확인 | Timeline.log 실제 출력 | pass |
| 128. I25 동시 삭제 경쟁 0 | Timeline.log 실제 출력 | pass |
| 129. I26 경쟁 뒤 fd 반환 0 | Timeline.log 실제 출력 | pass |
| 130. I25 동시 삭제 경쟁 1 | Timeline.log 실제 출력 | pass |
| 131. I26 경쟁 뒤 fd 반환 1 | Timeline.log 실제 출력 | pass |
| 132. I25 동시 삭제 경쟁 2 | Timeline.log 실제 출력 | pass |
| 133. I26 경쟁 뒤 fd 반환 2 | Timeline.log 실제 출력 | pass |
| 134. I25 동시 삭제 경쟁 3 | Timeline.log 실제 출력 | pass |
| 135. I26 경쟁 뒤 fd 반환 3 | Timeline.log 실제 출력 | pass |
| 136. I25 동시 삭제 경쟁 4 | Timeline.log 실제 출력 | pass |
| 137. I26 경쟁 뒤 fd 반환 4 | Timeline.log 실제 출력 | pass |
| 138. I25 동시 삭제 경쟁 5 | Timeline.log 실제 출력 | pass |
| 139. I26 경쟁 뒤 fd 반환 5 | Timeline.log 실제 출력 | pass |
| 140. I25 동시 삭제 경쟁 6 | Timeline.log 실제 출력 | pass |
| 141. I26 경쟁 뒤 fd 반환 6 | Timeline.log 실제 출력 | pass |
| 142. I25 동시 삭제 경쟁 7 | Timeline.log 실제 출력 | pass |
| 143. I26 경쟁 뒤 fd 반환 7 | Timeline.log 실제 출력 | pass |
| 144. I25 동시 삭제 경쟁 8 | Timeline.log 실제 출력 | pass |
| 145. I26 경쟁 뒤 fd 반환 8 | Timeline.log 실제 출력 | pass |
| 146. I25 동시 삭제 경쟁 9 | Timeline.log 실제 출력 | pass |
| 147. I26 경쟁 뒤 fd 반환 9 | Timeline.log 실제 출력 | pass |
| 148. I25 동시 삭제 경쟁 10 | Timeline.log 실제 출력 | pass |
| 149. I26 경쟁 뒤 fd 반환 10 | Timeline.log 실제 출력 | pass |
| 150. I25 동시 삭제 경쟁 11 | Timeline.log 실제 출력 | pass |
| 151. I26 경쟁 뒤 fd 반환 11 | Timeline.log 실제 출력 | pass |
| 152. I25 동시 삭제 경쟁 12 | Timeline.log 실제 출력 | pass |
| 153. I26 경쟁 뒤 fd 반환 12 | Timeline.log 실제 출력 | pass |
| 154. I25 동시 삭제 경쟁 13 | Timeline.log 실제 출력 | pass |
| 155. I26 경쟁 뒤 fd 반환 13 | Timeline.log 실제 출력 | pass |
| 156. I25 동시 삭제 경쟁 14 | Timeline.log 실제 출력 | pass |
| 157. I26 경쟁 뒤 fd 반환 14 | Timeline.log 실제 출력 | pass |
| 158. I25 동시 삭제 경쟁 15 | Timeline.log 실제 출력 | pass |
| 159. I26 경쟁 뒤 fd 반환 15 | Timeline.log 실제 출력 | pass |
| 160. I08 Writing lifecycle 재생 불가 | Timeline.log 실제 출력 | pass |
| 161. I08 Writing finalize 등록 거부 | Timeline.log 실제 출력 | pass |
| 162. I08 Writing 실제 파일 존재해도 media 거부 | Timeline.log 실제 출력 | pass |
| 163. I08 Writing timeline 재생 노출 없음 | Timeline.log 실제 출력 | pass |
| 164. I08 Corrupt 실제 catalog 전이 | Timeline.log 실제 출력 | pass |
| 165. I08 Corrupt 실제 파일 존재해도 media 거부 | Timeline.log 실제 출력 | pass |
| 166. I08 Corrupt timeline 불가 상태 | Timeline.log 실제 출력 | pass |
| 167. read-model 임시 root 삭제 확인: /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-s06-read.KZtJ9V | Timeline.log 실제 출력 | pass |

## cleanup·보존

모든 출력 chunk를 보존했고 shell seed의 `du -sk` 출력은 논리 bytes가 아닌 KiB 할당량이다. 숫자를 bytes로 오인하지 않는다.

| 실행 | 소유 경로 | 크기·결과 |
| --- | --- | --- |
| AuthEnvironment.log | `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-s06-read.bdlzJv` | du -sk 3324 KiB; 후속 삭제 확인행 pass |
| AuthEnvironment.log | `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v410-s06-W9Tl7B` | 854546 bytes, rootAbsent=true; process not-started, ports 없음 |
| AuthRed.log | `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-s06-read.cwLebN` | du -sk 3324 KiB; 후속 삭제 확인행 pass |
| AuthRed.log | `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v410-s06-MXprjT` | 2470456 bytes, rootAbsent=true; process 0, ports 57532:ECONNREFUSED,57533:ECONNREFUSED |
| AuthGreen.log | `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-s06-read.CypfVm` | du -sk 3324 KiB; 후속 삭제 확인행 pass |
| AuthGreen.log | `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v410-s06-JgVfdi` | 2470456 bytes, rootAbsent=true; process 0, ports 57597:ECONNREFUSED,57598:ECONNREFUSED |
| Proxy.log | `/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/s09-range-proxy-test-LkOu2n` | 1720 bytes, absent=true |
| AuthPrep.log | `/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/s09-ui-auth-prep-test-Zcs3z3` | 53932785 bytes, absent=true |
| Harness.log | `/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v410-s06-h01-V2o44u` | 107 bytes, helperRootAbsent=true, 후속 finalRootAbsent=true |
| Timeline.log | `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-s06-read.KZtJ9V` | du -sk 3724 KiB; 후속 삭제 확인행 pass |

auth-prep 내부 seed subprocess의 stdout은 기존 test가 수집 후 출력하지 않으므로 그 내부 compile root 개별 이름/크기는 이번 최상위 로그에 미보존이다. 해당 seed exit0 및 기존 trap 실행, outer owned root 삭제는 확인했지만 미출력 내부 경로를 추정 복원하지 않는다. 로그에 직접 나온 소유 경로는 읽기 전용 부재 확인으로 대조한다. proxy/harness의 가짜 정리 실패와 실제 정리 결과는 분리한다.
마감 시 위 담당 로그에서 추출한 소유 경로 10개 전부 `absent=true`를 직접 확인했다(exit0). 메인 소유 검사·과거 증거 정리는 [main-review.md](main-review.md)를 참조한다.

## 동결 해시·범위

- UI verifier SHA256: `8be257bdd973d0795aac4d1fe65d1c4b306c908b493747fa3f11d78eed95e38b`
- longrun helper SHA256: `7ed2a490f027023fa24dd43f948fbc01a30c8348261d45cf1ae74b45ef9b3a98`
- longrun test SHA256: `e2ee8f2b1826d908c59fb74ec0572038fc0378738da9b1327ca8100b63d18bae`
- `git diff --check` exit0. 담당 소스 동결.
- 과거 S09 미완료 장시간을 완료로 바꾸지 않으며 이번은 코드 정리·단기검증이다. 메인 build/VM/core/identity·최종 문서·커밋 판정은 메인이 별도 기록한다.


## UA08 내부 compile root 증거 보완 — 44701

최초 AuthPrep.log의 내부 root 이름·크기 미보존 이력은 유지한다. 동일 도구 정리 범위에서 UA08-A/B/C를 실행 전 중앙에 등록하고 test만 보완했다. seed subprocess의 전체 stdout은 출력하지 않으며 canonical tmp 부모·소유 basename·두 안전행 일치를 검증한 뒤 du -sk/삭제 확인행만 출력하고 lstat ENOENT를 직접 확인한다. 제품/seed 코드와 기존17기능은 변경하지 않았다.

명령 `node scripts/internal/verify_v410_recording_ui_auth_prep.test.mjs`, exit0, 기존17+cleanup3=20 pass/0 fail. [AuthPrepFinal.log](AuthPrepFinal.log)에 전체 원출력을 보존했다. 관찰 elapsed 22.872초는 functions Date.now 실행요청→최종출력 보존 간격으로 polling/처리 지연을 포함하며 순수 실행시간은 별도 미집계다. 토큰도 미집계다.

| 제목 | 실제 검사 | pass/fail |
| --- | --- | --- |
| SF01 optional seek fixture is accepted only with explicit UI anchor | 최종 auth-prep 실제 출력 | pass |
| UA01 anchor bounds and unknown options are rejected | 최종 auth-prep 실제 출력 | pass |
| UA05 inherited anchor and auth values are removed from legacy seed environment | 최종 auth-prep 실제 출력 | pass |
| UA02 random temporary passwords are distinct with sufficient length | 최종 auth-prep 실제 출력 | pass |
| UA03 actual bootstrap function orders setup five logins and four users | 최종 auth-prep 실제 출력 | pass |
| UA04 one-time handoff is mode0600 and refuses overwrite | 최종 auth-prep 실제 출력 | pass |
| UA07 live source payload distinguishes active quota from blocked reservation | 최종 auth-prep 실제 출력 | pass |
| UA01 new auth direct mode rejects missing anchor before preparation | 최종 auth-prep 실제 출력 | pass |
| UA08-A anchored seed compile root cleanup | 최종 auth-prep 실제 출력 | pass |
| UA06 actual seed command completes | 최종 auth-prep 실제 출력 | pass |
| UA06 actual catalog preserves anchored corrupt deleted and pending states | 최종 auth-prep 실제 출력 | pass |
| UA08-B legacy seed compile root cleanup | 최종 auth-prep 실제 출력 | pass |
| UA05 legacy UI seed retains original time and excludes new states | 최종 auth-prep 실제 출력 | pass |
| SF02 bounded owned seek fixture generation completes | 최종 auth-prep 실제 출력 | pass |
| SF03 actual H264 silent 1280x720 ten-second first-keyframe fixture | 최종 auth-prep 실제 출력 | pass |
| SF06 malformed media metadata and symlink input directory are rejected | 최종 auth-prep 실제 출력 | pass |
| UA08-C seek seed compile root cleanup | 최종 auth-prep 실제 출력 | pass |
| SF04 only http-event catalog binds actual seek fixture size and SHA | 최종 auth-prep 실제 출력 | pass |
| SF05 other seeded media retain small original bytes | 최종 auth-prep 실제 출력 | pass |
| UA08 test root cleanup | 최종 auth-prep 실제 출력 | pass |

| 소유 경로 | 크기 | 정리 |
| --- | ---: | --- |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-s06-read.TWLwwu` | 3324 KiB (du -sk 할당량) | 삭제 확인 안전행 및 lstat ENOENT |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-s06-read.yP1jjb` | 3324 KiB (du -sk 할당량) | 삭제 확인 안전행 및 lstat ENOENT |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-s06-read.rqfBvx` | 3324 KiB (du -sk 할당량) | 삭제 확인 안전행 및 lstat ENOENT |
| `/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/s09-ui-auth-prep-test-QaXzKG` | 53932785 bytes | outer root absent=true |

최종 test SHA256: `9604f78798e073d98375fff3c725f122b94705ea1480b4e3951cb044fba2e724`. `git diff --check` exit0. 소스·기록 동결, 다른 suite 추가 재실행 및 커밋·푸시 없음.
