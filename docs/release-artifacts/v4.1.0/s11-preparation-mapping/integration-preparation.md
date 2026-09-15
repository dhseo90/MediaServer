# S11 현행 통합 연결 준비 — 내부 전달 보완·통합 미완료

## P0-STATE01~03 실행 전 정의

### 실행 결과와 중단

메인 후속 읽기 판단: runtime event budget은 segment_ms+post+1000으로 현재3750ms지만, fixture 원본 GOP250frames/약8.33초라 target segment2초가 실제 finalize2초를 보장하지 않는다. 첫 end8.2초 뒤 다음 finalize가 예산을 넘으면 source1/partial는 기존 유한대기 정책의 정상 결과일 수 있다. 설정 target을 실제 구간 길이로 취급한 fixture 준비 문제를 재검토한다. 이 가설 때문에 제품 timeout을 올리거나 2출력 oracle를 낮추지 않는다. 실제 재실행·추가 코드 수정은 메인 회수 판단으로 중단했다. canonical 중복 제거의 독립 성능 향상만으로 전체 P0가 완료되지 않았다.

[최초 import 준비실패](p0-state-red.log) exit1은 제품/assertion RED가 아니다. 빈 helper stub의 [behavior RED](p0-state-assertion-red.log) exit1/0pass3fail 후 구현, [GREEN](p0-state-green.log) exit0/3pass0fail. 기존 integration17와 HTTP3도 exit0, 아래23개 전수행이다. helper는 공개값에서 whitelist 상태·count와 최대8개 숫자request만 만든다. 실제 oracle·제품·호출순서는 바꾸지 않았다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| P0-STATE01 complete1 count와 기존 two-output 거부 구분 (0.523292ms) | [green](p0-state-green.log) exit0 | pass | 자체검사 |
| P0-STATE02 pending partial complete2 변화와 8개 상한 (0.285875ms) | [green](p0-state-green.log) exit0 | pass | 자체검사 |
| P0-STATE03 raw ID/path/unknown enum/request 비밀 미노출 (0.052709ms) | [green](p0-state-green.log) exit0 | pass | 자체검사 |
| S11-CI01 현행 다섯 단계 순서·실제 child 결과 결박 (0.867833ms) | [integration](p0-state-integration.log) exit0 | pass | 자체검사 |
| S11-CI04 기존 실제 dispatch 상관 정상·오래된ID·다른조건·복수ID 거부 (0.192166ms) | [integration](p0-state-integration.log) exit0 | pass | 자체검사 |
| S11-CI02 nonzero 실패 후 나머지 미실행 (0.068708ms) | [integration](p0-state-integration.log) exit0 | pass | 자체검사 |
| S11-CI02 signal 실패 후 나머지 미실행 (0.078709ms) | [integration](p0-state-integration.log) exit0 | pass | 자체검사 |
| S11-CI02 output-limit 실패 후 나머지 미실행 (0.055625ms) | [integration](p0-state-integration.log) exit0 | pass | 자체검사 |
| S11-CI02 summary-missing 실패 후 나머지 미실행 (0.03975ms) | [integration](p0-state-integration.log) exit0 | pass | 자체검사 |
| S11-CI02 summary-duplicate 실패 후 나머지 미실행 (0.042625ms) | [integration](p0-state-integration.log) exit0 | pass | 자체검사 |
| S11-CI02 cleanup-failed 실패 후 나머지 미실행 (0.038125ms) | [integration](p0-state-integration.log) exit0 | pass | 자체검사 |
| S11-CI02 port-missing 실패 후 나머지 미실행 (0.045458ms) | [integration](p0-state-integration.log) exit0 | pass | 자체검사 |
| S11-CI03 legacy 완료 필드 없음·전체 S11/UI/자원 PASS 분리 (0.1875ms) | [integration](p0-state-integration.log) exit0 | pass | 자체검사 |
| S11-CI07 기대 출력 수만 있거나 한 기동 관측 누락이면 완료 거부 (0.279125ms) | [integration](p0-state-integration.log) exit0 | pass | 자체검사 |
| S11-CI05 페이지 전체·unplaced 별도 total·동일file mapping dedup (4.8725ms) | [integration](p0-state-integration.log) exit0 | pass | 자체검사 |
| S11-CI05 누락·중복item·불안정total·truncated·cap 거부 (0.216542ms) | [integration](p0-state-integration.log) exit0 | pass | 자체검사 |
| S11-CI05 첫출력/partial/다른reference/job/unsafe숫자 거부 (0.138041ms) | [integration](p0-state-integration.log) exit0 | pass | 자체검사 |
| S11-CI07 정확한 accepted placeholder만 미완료로 분류하고 lineage 모순은 거부 (0.171375ms) | [integration](p0-state-integration.log) exit0 | pass | 자체검사 |
| S11-CI06 기존ID/hash 보존과 새event/reference/job/output 분리 (0.149375ms) | [integration](p0-state-integration.log) exit0 | pass | 자체검사 |
| S11-CI05 점 이벤트 equal+padding 허용·역전/빈확장 거부 (0.069542ms) | [integration](p0-state-integration.log) exit0 | pass | 자체검사 |
| P0-DIAG01 정상 header/body 시간·안전 route 분류와 비밀 미노출 (0.755875ms) | [http](p0-state-http.log) exit0 | pass | 자체검사 |
| P0-DIAG02 header timeout 고정 진단과 실패 유지 (0.306125ms) | [http](p0-state-http.log) exit0 | pass | 자체검사 |
| P0-DIAG03 body timeout 부분 수신 측정·완료 거부 (0.131458ms) | [http](p0-state-http.log) exit0 | pass | 자체검사 |

실제 명령은 위 P0-ACTUAL01과 동일 env-i+node runner이며 출력 대상만 p0-state-actual.log이다. exit1/31697ms. [원출력](p0-state-actual.log)의 새로운 관측은 **완전2출력 아닌 complete job/partial1출력**이다. 이후 HTTP header timeout도 재발했다. 따라서 최소 순수검증 최적화만으로 HTTP P0를 완전히 해결했다고 주장하지 않는다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| S11-CI09 product1 | health·격리 ICE | pass | 실제앱1회 |
| S11-CI07 run1 | 실제 tuple→EventRecord reference | pass | internal evidence 전달 유지 |
| P0-STATE actual | literal2 complete 대기 중 HTTP | fail | http-header-timeout; 뒤suite 건너뜀 |
| S11-CI08 product1 | exit0·포트반환 | pass | PID62303 |

trigger sourceEndPts=8200000000/tapPts=8566666666/delta=366666666ns, dispatchPts=8566666666이었다. 이번 실행에서는 tap→dispatch PTS 차이가 없었다. 요청은 media-pts-ms start=end8566/pre=post750, 즉 expanded[7816,9316)ms다. 상태는 not-created→intent→complete/partial/playabletrue, unique job1/output1로 변했다. timeline row167 중 앞8개 상태만 기록되어 truncated=true이며, 전체 row count와 unique output count는 구분했다. 원본·선택의 정확한 미충족 근거는 공개 state만으로 확정할 수 없다. callback/provider snapshot·generation/coverage 및 내구 selection 분석은 후속 메인 판단 대상이다.

HTTP 총287개/timeline184개, 성공 timeline header최대3153ms/timeout1. 마지막 안전상태도 partial1이다. observedOutputCounts=[]는 성공한2출력 검증이 없다는 뜻이며 진단 outputCount1을 소거하지 않는다. 실제 출력HTTP/hash·archivecopy·두번째제품기동·전체suite는 미실행이다. 추가 actual/제품수정은 중단했다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| /private/tmp/media-server-current-integration-i32sA5 | 소유 input/archive/state/temp | 51957805B | 제품exit0·54638/54639반환·UDPclose 후 삭제 | rootAbsent=true/failureCount0 | actual cleanup |

자체검사23개는 temp/server/port 생성 없음. raw 서버로그/미디어/응답본문은 보존하지 않았다. token은 집계소스부재로 미집계, actual elapsed는 performance.now다.

제품/oracle/HTTP4초/전체180초/2출력 기대는 불변이다. 안전 state helper를 추가하여 같은reference의 상태 변화와 timeout 마지막상태를 fixed enum/count/최대8개 decimal media request만 기록한다. trigger의 source end/tap/delta 및 dispatch PTS를 숫자문자열로 추가하되 기존 호출 순서는 바꾸지 않는다. `node --test scripts/internal/recording_current_state_diagnostics.test.mjs`: complete1의 count와 기존 거부, pending→partial→complete2·8상한, raw ID/path/비정상request 미노출3검사. helper미구현 import 실패는 준비 RED이며 성능/제품 assertion RED와 구분한다. 이후 기존 integration17/HTTP3 통과 뒤 동일 actual1회 승인. 각 env-i PATH/HOME=/tmp/TMPDIR=/tmp, p0-state-{red,green,integration,http,actual}.log로 직접 capture. 실패 뒤 suite는 보류한다.

## P0-ACTUAL01 실행 전 정의

### 실행 결과 — 2출력 대기 실패, 후속 중지

[p0-actual-fixed.log](p0-actual-fixed.log) 실제 exit1, elapsed43735ms. 아래3pass/1fail이며 actualEventPass=false/restartPass=false/observedOutputCounts=[]다. expectedOutputCount=2는 고정 기대이지 관측이 아니다. 기존 HTTP4초 abort는 이번 실행에서 발생하지 않았지만 timeline 최대 header3913ms로 상한에 가까워, 모든 부하에서 해결됐다고 단정하지 않는다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| S11-CI09 product1 | 정상 health·격리 loopback ICE | pass | 실제 첫 제품기동 |
| S11-CI07 run1 reference | 실제 tap tuple→EventRecord reference 상관 | pass | 내부 증거 전달 fix 경계 유지 |
| P0-ACTUAL01 2출력 | complete-two-outputs 30초 bounded polling | fail | complete-two-outputs-timeout; HTTP timeout 아님 |
| S11-CI08 product1 종료 | exit0·HTTP/RTSP 포트반환 | pass | PID61964, ports54256/54257 closed |

안전 관측: HTTP307요청 중 timeline197개 모두200, timeout0, 최대 header3913ms/body0ms. 마지막 timeline seq306은187ms/14955B였다. 최초 이벤트 상태는 referenceMatches=true/jobPresent=false/jobState=not-created/segmentPresent=false/completeness=unknown/catalogState=absent/playable=false였다. 현재 runner는 pendingLogged로 **최초 상태만 기록**하므로 이것을 최종 상태로 해석하지 않는다. 이후 응답 byte크기만으로 job/출력 개수·완료·실패를 추정할 수 없다.

읽기 분석: collectEvent의 until은 event-absent/event-not-complete/page-total-changed/expected-two-output-files만 대기 대상으로 삼고, 끝까지 literal2 완전출력이 없으면 고정 timeout을 반환한다. 현재 원출력으로 어느 대기 사유가 마지막인지 구분할 수 없어 추가 원인은 미확정이다. 다음 진단에는 동일reference의 최종 안전 enum·출력unique count·job상태별count 및 마지막 retry reason만 보존할 필요가 있다. 승인 없이 새 실행·제품/시간상한/기대값 수정은 하지 않았다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `/private/tmp/media-server-current-integration-00dutg` | 이번 소유 input/archive/state/temp root | 44255158B | 정상 제품종료·포트반환·UDPclose 뒤 containment cleanup | rootAbsent=true/failureCount0 | actual 원출력 |

복제본 catalog 검사·모든 출력 HTTP/hash·실제 두 번째 제품기동·새생산분리·전체 suite는 실패 뒤 건너뛰었다. 원본 미디어/원응답/raw서버로그는 보존하지 않았다. token start/end/consumed 미집계(집계소스부재), elapsed는 runner performance.now다. 결과 문서 patch 첫 도구호출은 JS문법 준비오류로 적용되지 않았고 다음 호출에서 기록했으며 제품/테스트 실패와 별개다.

최소 순수검증 최적화·계측 제거·build/185개 영향검증 후 메인 승인된 실제 앱 **1회**다. 명령은 `env -i PATH="$PATH" HOME=/tmp TMPDIR=/tmp node scripts/internal/verify_recording_current_app.mjs`, 원출력은 p0-actual-fixed.log에 직접 보존한다. 기존 HTTP4초/전체steady180초, literal2출력, 동일 요청의 원본교차·epoch/generation/시간축, 모든 출력 HTTP/hash, 정상종료·포트반환 후 원본archive불변 복제 검사와 실제 두 번째 제품기동 조건을 변경하지 않는다. DIAG에서 source1을 관측했어도 기대를1로 낮추지 않는다. 소유root/process/UDP/port cleanup은 성공·실패 모두 수행한다. 실패 시 동일원인 재실행·timeout 확대·판정 완화 없이 안전 enum/숫자와 기존 원출력으로 보고한다. 성공해도 전체 current suite는 메인 후속 지시 전 미실행이다.

## P0 최소 수정 후 영향검증 결과

[제품 빌드](p0-fix-build.log) exit0. 지정 순차 회귀 EV15/J23/F43/D3A46/D3B38와 HTTP3/integration17 자체검사 모두 exit0이다. 아래185행을 각 원출력과 대조했다. HTTP 자체검사30.688625ms, integration 자체검사38.500375ms. 별도 실제 current integration 실행이나 제품2차기동 PASS가 아니다. 임시 product 계측을 제거한 catalog/read/projection은 HEAD와 diff0, sample helper/test도 제거했으며 역사DIAG04 로그는 유지했다. 최종 diffcheck exit0.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| EV01 canonical application 왕복 같은 녹화 증거 | [evidence](p0-fix-evidence.log) exit0 | pass | 원출력 개별 행 |
| EV01 전체 관측 context 및 원본 timestamp 연관 literal 보존 | [evidence](p0-fix-evidence.log) exit0 | pass | 원출력 개별 행 |
| EV02 실제 rule 평가 왕복 증거 보존 | [evidence](p0-fix-evidence.log) exit0 | pass | 원출력 개별 행 |
| EV02 평가 application annotated 결과 재복원 증거 | [evidence](p0-fix-evidence.log) exit0 | pass | 원출력 개별 행 |
| EV03 canonical projection 실제 storage bridge 입력 증거 | [evidence](p0-fix-evidence.log) exit0 | pass | 원출력 개별 행 |
| EV03 application projection 실제 storage bridge 입력 증거 | [evidence](p0-fix-evidence.log) exit0 | pass | 원출력 개별 행 |
| EV04 dispatch frame 충돌 증거 복원 거부 | [evidence](p0-fix-evidence.log) exit0 | pass | 원출력 개별 행 |
| EV04 source 충돌 거부 | [evidence](p0-fix-evidence.log) exit0 | pass | 원출력 개별 행 |
| EV04 PTS 충돌 거부 | [evidence](p0-fix-evidence.log) exit0 | pass | 원출력 개별 행 |
| EV04 frame 충돌 거부 | [evidence](p0-fix-evidence.log) exit0 | pass | 원출력 개별 행 |
| EV04 증거 부재 발명 금지 | [evidence](p0-fix-evidence.log) exit0 | pass | 원출력 개별 행 |
| EV05 history snapshot null 보존 | [evidence](p0-fix-evidence.log) exit0 | pass | 원출력 개별 행 |
| EV05 원본 해제 뒤 동일 4096 snapshot 수명 유지 | [evidence](p0-fix-evidence.log) exit0 | pass | 원출력 개별 행 |
| EV05 마지막 carrier 해제 뒤 snapshot 해제 | [evidence](p0-fix-evidence.log) exit0 | pass | 원출력 개별 행 |
| EV06 실제 공개 result serializer 내부 증거 비노출 불변 | [evidence](p0-fix-evidence.log) exit0 | pass | 원출력 개별 행 |
| J01 실제 선택→compact 내구 job 계약 왕복 | [jobs](p0-fix-jobs.log) exit0 | pass | 원출력 개별 행 |
| J17 무관source8개 추가에도 동일선택 jobID 유지 | [jobs](p0-fix-jobs.log) exit0 | pass | 원출력 개별 행 |
| J18 cleanup wall시계 역행 허용·순서는상태로검사 | [jobs](p0-fix-jobs.log) exit0 | pass | 원출력 개별 행 |
| J04 단일 Intent 원장·보호·예약 원자 가시성 | [jobs](p0-fix-jobs.log) exit0 | pass | 원출력 개별 행 |
| J19 후발 coordinator 일반·파생 admission 및 복구 차단 | [jobs](p0-fix-jobs.log) exit0 | pass | 원출력 개별 행 |
| J02 이후 시각 재Build ID 유지·선택 변경 새 ID | [jobs](p0-fix-jobs.log) exit0 | pass | 원출력 개별 행 |
| J03 unknown·중복·미지원 schema·불완전 JSON·4MiB·예약 상한·미구현 state 거부 | [jobs](p0-fix-jobs.log) exit0 | pass | 원출력 개별 행 |
| J16 소유 경로·attempt·order 계획 조작 거부 | [jobs](p0-fix-jobs.log) exit0 | pass | 원출력 개별 행 |
| J16 실제 2 source UUID 역순이어도 영속 order 순 출력 계획 | [jobs](p0-fix-jobs.log) exit0 | pass | 원출력 개별 행 |
| J08 나중 시각 재요청 최초 시각 유지·예약/경로 충돌·다른 catalog 거부 | [jobs](p0-fix-jobs.log) exit0 | pass | 원출력 개별 행 |
| J06 generic hold 감소로 job 보호 해제 불가·직접 삭제/corrupt 차단 | [jobs](p0-fix-jobs.log) exit0 | pass | 원출력 개별 행 |
| J14 cleanup Failed는 job 자원만 해제·wall 역행·terminal 자동 재시도 없음 | [jobs](p0-fix-jobs.log) exit0 | pass | 원출력 개별 행 |
| J05 pending·corrupt·tombstone·hash·binding 불일치 source 거부 | [jobs](p0-fix-jobs.log) exit0 | pass | 원출력 개별 행 |
| J07 실제 source 삭제/Intent 경쟁에서 둘 중 한 전이만 허용 | [jobs](p0-fix-jobs.log) exit0 | pass | 원출력 개별 행 |
| J10 checkpoint 전후 job·보호·예약 유지 | [jobs](p0-fix-jobs.log) exit0 | pass | 원출력 개별 행 |
| J09 SQLite·fallback·재build/reopen 내구 job 동등·중복 보호 가산 없음 | [jobs](p0-fix-jobs.log) exit0 | pass | 원출력 개별 행 |
| J10 replay 동일 중복 멱등·다른 내용/불완전/schema/전이/보호 상태 거부 | [jobs](p0-fix-jobs.log) exit0 | pass | 원출력 개별 행 |
| J11 같은 채널 memory+동시 durable 예약 합계 event quota 제한 | [jobs](p0-fix-jobs.log) exit0 | pass | 원출력 개별 행 |
| J12 durable outstanding을 continuous/event/derived disk 예약에 포함 | [jobs](p0-fix-jobs.log) exit0 | pass | 원출력 개별 행 |
| J13 snapshot/disk provider 실패는 생성·periodic·복구 삭제 차단 | [jobs](p0-fix-jobs.log) exit0 | pass | 원출력 개별 행 |
| J15 partial unknown·이유·후보·요청 시간축 그대로 보존 | [jobs](p0-fix-jobs.log) exit0 | pass | 원출력 개별 행 |
| J19 정확한 소유자 소멸 후 새 coordinator만 재결박 | [jobs](p0-fix-jobs.log) exit0 | pass | 원출력 개별 행 |
| J20 append 거부 후 원장 복원해도 공통 mutation 차단 | [jobs](p0-fix-jobs.log) exit0 | pass | 원출력 개별 행 |
| F12 실제 remux의 다른 selection 결박 거부 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F12 실제 remux provenance의 요청 범위 위조 거부 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F12 실제 remux의 foreign unfulfilled 범위 거부 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F01 실제 writer→선택→Intent→파생 파일→게시→Complete | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F01 실제 catalog/file/hash/단일 commit/hold 해제/cleanup 및 직접 decode | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F15 단일 service·동시 Run·외부 terminal release 거부 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F16 active source 삭제 거부·동일 사유 비보호 원본 삭제 positive control | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F02 두 출력 독립 epoch·unknown UTC·실제 AU/visible 출처 보존 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F12 Complete 출처 전수 canonical roundtrip | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F12 Ready 포함 Intent 잘못된 상태 거부 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F12 미지원 필드 엄격 거부 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F14 Ready JSON 4MiB 명시 상한 거부 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F12 출력 receipt inode 별칭 거부 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F03 Intent 생성 전 프로세스 중단 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F04 receipt 전 실물의 소유권 미확인 보호 유지 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F05 receipt 이후 Intent 중단 소유물 정리 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F06 Ready 중단 뒤 재렌더 없이 완료 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F07 첫 출력 link 중단 쌍 복구 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F07 두 번째 출력 link 중단 쌍 복구 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F08 전체 publish 후 commit 전 중단 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F09 원자 commit 후 cleanup 전 중단 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F10 첫 temp 삭제 중단 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F10 두 번째 temp 삭제 중단 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F10 attempt 디렉터리 삭제 중단 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F10 job 디렉터리 삭제 중단 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F10 Complete mutation 직전 중단 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F10 Failed cleanup attempt 삭제 중단 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F10 Failed cleanup job 삭제 중단 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F10 Failed mutation 직전 중단 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F11 hash 오류 거부·보호/예약 유지 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F11 missing 오류 거부·보호/예약 유지 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F11 foreign 오류 거부·보호/예약 유지 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F11 symlink 오류 거부·보호/예약 유지 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F11 fifo 오류 거부·보호/예약 유지 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F11 hardlink 오류 거부·보호/예약 유지 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F11 parent 오류 거부·보호/예약 유지 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F14 cancel-before-create 생성 중단·소유 cleanup·예약 해제 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F14 cancel 생성 중단·소유 cleanup·예약 해제 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F14 small 생성 중단·소유 cleanup·예약 해제 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F14 deadline 생성 중단·소유 cleanup·예약 해제 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F12 SQLite projection·journal fallback job/output 일치 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F12 SQLite rebuild·checkpoint 재개방 job/output 일치 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| F13 Complete output tombstone 뒤 재생성 없음 | [service](p0-fix-service.log) exit0 | pass | 원출력 개별 행 |
| D3A-05 미완료 출력 거부 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-05 미완료 출력 거부 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-05 미완료 출력 거부 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-05 미완료 출력 거부 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-02 요청 충족 상태 구분 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-01 실제 검증된 Event 출력 제공 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-03 권한/다른 채널 거부 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-01 application V2 채널 권한 후 제공 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-06 제공 중 삭제 거부 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-06 fd 해제 후 hold0 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-01 실제 검증된 Event 출력 제공 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-03 권한/다른 채널 거부 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-01 application V2 채널 권한 후 제공 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-06 제공 중 삭제 거부 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-06 fd 해제 후 hold0 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-04 실제 파일 있는 manual Event 거부 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-07 immutable metadata 다른 결박 거부 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-08 원본 보존 삭제 완료 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-08 원본 보존 삭제 완료 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-08 원본 삭제 뒤 검증된 출력 제공 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-07 실제 파일 크기 변조 거부·hold0 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-07 동일 크기 파일 내용 변조 거부·hold0 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-06 hold 해제 후 삭제 전이·새 제공 거부 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-05 미완료 출력 거부 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-05 미완료 출력 거부 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-05 미완료 출력 거부 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-05 미완료 출력 거부 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-02 요청 충족 상태 구분 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-02 partial 출력 제공 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-03 권한/다른 채널 거부 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-01 application V2 채널 권한 후 제공 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-06 제공 중 삭제 거부 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-06 fd 해제 후 hold0 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-02 partial 출력 제공 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-03 권한/다른 채널 거부 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-01 application V2 채널 권한 후 제공 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-06 제공 중 삭제 거부 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-06 fd 해제 후 hold0 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-04 실제 파일 있는 manual Event 거부 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-07 immutable metadata 다른 결박 거부 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-08 원본 보존 삭제 완료 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-08 원본 보존 삭제 완료 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-08 원본 삭제 뒤 검증된 출력 제공 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-07 실제 파일 크기 변조 거부·hold0 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-07 동일 크기 파일 내용 변조 거부·hold0 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3A-06 hold 해제 후 삭제 전이·새 제공 거부 | [media](p0-fix-media.log) exit0 | pass | 원출력 개별 행 |
| D3B-01 actual V2 원본·문자열 UTC·독립 unplaced 응답 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-14 mismatch/nonintegral mapping은 unplaced | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-14 mismatch/nonintegral mapping은 unplaced | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-02 문법/범위 오류400 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-02 문법/범위 오류400 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-02 문법/범위 오류400 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-02 문법/범위 오류400 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-02 문법/범위 오류400 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-02 문법/범위 오류400 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-02 권한 거부403 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-13 Intent placeholder no file/null time | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-13 accepted/no-job 상태 보존 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-05 Ready 출력 시간과 재생불가 분리 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-05 Committed 출력 시간과 재생불가 분리 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-05 실제 검증된 파생2출력 시간/파일 독립 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-07 같은 UTC 다른 segment/epoch는 원본 숨김 없음 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-13 출력 생성 뒤 job placeholder 없음 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-07 page 밖 이벤트도 원본 전체 충족 판정 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-06 일부 중첩 원본은 보존 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-04 재조회 stable itemId/order | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-12 요청축/문자열/공개 whitelist | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-08 동일 size 변조 출력은 비재생 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-08 파일 누락 Complete와 재생불가/숨김 분리 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-08 실제 tombstone 출력 deleted 보존 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-09 source tombstone 뒤 durable UTC 투영 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-05 partial 요청 실제 출력 jobComplete | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-14 actual 출력 mismatch mapping은 unplaced·partial 파일 제공 분리 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-13 Failed placeholder no file/null time | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-03/04 UTC0와 same-file 다중 mapping 독립 ID | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-03 int64 최대 UTC ns 문자열 정밀도 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-11 관련 없는 known4352 누적은 짧은 질의 허용 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-11 실제 관련4352 상한 명시 실패 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-02/11 관련 상한503 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-10/11 unknown4354 count와 bounded 첫 페이지 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-10 known/unplaced 독립 동일 offset 페이지 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-11 offset+limit overflow 명시 실패 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-11 전체 unknown deep-copy 없이35074 첫 페이지 허용 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| D3B-11 deep offset64MiB workspace 초과는 결과 없이 명시 실패 | [timeline](p0-fix-timeline.log) exit0 | pass | 원출력 개별 행 |
| P0-DIAG01 정상 header/body 시간·안전 route 분류와 비밀 미노출 (0.61625ms) | [http-unit](p0-fix-http-unit.log) exit0 | pass | 원출력 개별 행 |
| P0-DIAG02 header timeout 고정 진단과 실패 유지 (0.271708ms) | [http-unit](p0-fix-http-unit.log) exit0 | pass | 원출력 개별 행 |
| P0-DIAG03 body timeout 부분 수신 측정·완료 거부 (0.12375ms) | [http-unit](p0-fix-http-unit.log) exit0 | pass | 원출력 개별 행 |
| S11-CI01 현행 다섯 단계 순서·실제 child 결과 결박 (0.74025ms) | [integration-unit](p0-fix-integration-unit.log) exit0 | pass | 원출력 개별 행 |
| S11-CI04 기존 실제 dispatch 상관 정상·오래된ID·다른조건·복수ID 거부 (0.193208ms) | [integration-unit](p0-fix-integration-unit.log) exit0 | pass | 원출력 개별 행 |
| S11-CI02 nonzero 실패 후 나머지 미실행 (0.068042ms) | [integration-unit](p0-fix-integration-unit.log) exit0 | pass | 원출력 개별 행 |
| S11-CI02 signal 실패 후 나머지 미실행 (0.068875ms) | [integration-unit](p0-fix-integration-unit.log) exit0 | pass | 원출력 개별 행 |
| S11-CI02 output-limit 실패 후 나머지 미실행 (0.053208ms) | [integration-unit](p0-fix-integration-unit.log) exit0 | pass | 원출력 개별 행 |
| S11-CI02 summary-missing 실패 후 나머지 미실행 (0.045958ms) | [integration-unit](p0-fix-integration-unit.log) exit0 | pass | 원출력 개별 행 |
| S11-CI02 summary-duplicate 실패 후 나머지 미실행 (0.042208ms) | [integration-unit](p0-fix-integration-unit.log) exit0 | pass | 원출력 개별 행 |
| S11-CI02 cleanup-failed 실패 후 나머지 미실행 (0.041708ms) | [integration-unit](p0-fix-integration-unit.log) exit0 | pass | 원출력 개별 행 |
| S11-CI02 port-missing 실패 후 나머지 미실행 (0.051625ms) | [integration-unit](p0-fix-integration-unit.log) exit0 | pass | 원출력 개별 행 |
| S11-CI03 legacy 완료 필드 없음·전체 S11/UI/자원 PASS 분리 (0.476584ms) | [integration-unit](p0-fix-integration-unit.log) exit0 | pass | 원출력 개별 행 |
| S11-CI07 기대 출력 수만 있거나 한 기동 관측 누락이면 완료 거부 (0.290875ms) | [integration-unit](p0-fix-integration-unit.log) exit0 | pass | 원출력 개별 행 |
| S11-CI05 페이지 전체·unplaced 별도 total·동일file mapping dedup (4.681083ms) | [integration-unit](p0-fix-integration-unit.log) exit0 | pass | 원출력 개별 행 |
| S11-CI05 누락·중복item·불안정total·truncated·cap 거부 (0.148958ms) | [integration-unit](p0-fix-integration-unit.log) exit0 | pass | 원출력 개별 행 |
| S11-CI05 첫출력/partial/다른reference/job/unsafe숫자 거부 (0.147917ms) | [integration-unit](p0-fix-integration-unit.log) exit0 | pass | 원출력 개별 행 |
| S11-CI07 정확한 accepted placeholder만 미완료로 분류하고 lineage 모순은 거부 (0.190667ms) | [integration-unit](p0-fix-integration-unit.log) exit0 | pass | 원출력 개별 행 |
| S11-CI06 기존ID/hash 보존과 새event/reference/job/output 분리 (0.163333ms) | [integration-unit](p0-fix-integration-unit.log) exit0 | pass | 원출력 개별 행 |
| S11-CI05 점 이벤트 equal+padding 허용·역전/빈확장 거부 (0.077625ms) | [integration-unit](p0-fix-integration-unit.log) exit0 | pass | 원출력 개별 행 |

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| /private/tmp/media-server-application-evidence.DHHpVC | EV owned root | 21638411B | runner cleanup | absent=true | evidence raw |
| /private/tmp/media-server-derived-jobs.pyFJjW | J owned root | 9017167B | runner cleanup | removed=true | jobs raw |
| /private/tmp/media-server-derived-job-service.rIbUCa | F owned root | 15561408B | runner cleanup | removed=true | service raw |
| /private/tmp/media-server-public-media.IbOVL3 | D3A owned root | 6330448B | runner cleanup | removed=true | media raw |
| /private/tmp/media-server-public-timeline.M8qcU0 | D3B owned root | 32444983B | runner cleanup | removed=true | timeline raw |

Node 두 자체검사는 temp/server/port를 만들지 않는다. build-gst-onnx는 기존 제품 빌드 산출물로 보존한다. token start/end/consumed는 집계 도구 부재로 미집계다. 실제 앱 재실행은 메인 후속 지시 전 보류한다.

## P0-PERF01 실행 전 독립 기준 측정 정의

### 최소 수정 후 영향검증 실행 전 정의

메인 승인 순서대로 아래 명령을 실행하며 첫 실패 뒤 후속은 건너뛴다. 기존 EV/J/F/D3A/D3B 개별 정의를 재사용한다. 임시 product timing header/Scope/LockGuard를 제거하여 기존 std::lock_guard와 원래 검사 순서를 복원하고 runner의 opt-in/sample 실행 잔여도 제거한다. HTTP 안전 timing 자체는 유지한다.

| 순서 | 정확 명령 | 범위 / 원출력 |
| --- | --- | --- |
| 1 | `./server.sh build` | 제품 archive/executable 일치 / p0-fix-build.log |
| 2 | `bash scripts/internal/verify_recording_application_evidence.sh` | EV15·추가된 freshness guard / p0-fix-evidence.log |
| 3 | `bash scripts/internal/verify_recording_derived_jobs.sh` | J 계약·원장·보호·예약 / p0-fix-jobs.log |
| 4 | `bash scripts/internal/verify_recording_derived_job_service.sh` | F 실제 생성·복구 / p0-fix-service.log |
| 5 | `bash scripts/internal/verify_recording_public_media.sh` | D3A 제공·보호 / p0-fix-media.log |
| 6 | `bash scripts/internal/verify_recording_public_timeline.sh` | D3B 투영 / p0-fix-timeline.log |

각 명령은 env-i의 PATH/HOME=/tmp/TMPDIR=/tmp 환경에서 실행하고 원출력을 파일에 직접 보존한다. 다른 boundary는 불변의 유효 증거를 유지한다. actual 앱은 이 묶음 뒤에도 별도 메인 지시 전 미실행이다.

추가 메인 승인: 폐기된 sample helper와 전용 DIAG04 테스트를 제거하되 역사 원출력을 유지한다. `node --test scripts/internal/recording_current_http_diagnostics.test.mjs`의 원래 DIAG01~03 세 검사, `node --test scripts/internal/recording_current_integration.test.mjs`의17검사를 같은 최소 env로 실행한다. 제품 재빌드 불필요, 각각 p0-fix-http-unit.log/p0-fix-integration-unit.log에 직접 보존한다.

### P0-PERF02 실행 전 최소 최적화 정의

메인 승인된 변경은 Validate에서 unique segment ID당 canonical serialize 1회와, Validate가 이미 복원한 selection을 RestoreDerivedJobSelection에 반환·재사용하는 두 곳뿐이다. Ready 검증/상한/checkpoint/잠금은 유지한다. `bash scripts/internal/verify_recording_derived_job_validation.sh --performance-budget`는 현 host·동일 기본 최적화에서 Record serialize 3회 중앙값<=60000μs를 요구한다(기존81837μs). 기존5검사와 baseline hash literal 일치도 유지한다. 구형 코드 예상 RED는 성능 행 한 개이며, 다른 환경의 일반 성능 보장은 아니다. 명시 flag 없는 실행에는 시간 합격선을 적용하지 않는다.

### P0-PERF02 RED→최소 수정→GREEN

실제 두 명령은 `env -i PATH="$PATH" HOME=/tmp TMPDIR=/tmp bash scripts/internal/verify_recording_derived_job_validation.sh --performance-budget`이며 stdout/stderr를 각각 [expected-red](p0-perf-expected-red.log), [green](p0-perf-green.log)에 직접 저장했다. RED exit1/6pass1fail은 등록한 성능행만 실패했다. GREEN exit0/7pass0fail, `git diff --check` exit0. 제품 변경은 recording_derived_job.cpp의 위 두 곳뿐이며 임시 DIAG 계측은 아직 남아 있다. 실제 앱·HTTP·checkpoint 성능 해결 판정은 미실행이다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| P0-PERF01 크기·coverage | source1/sample250/slice45/complete | pass | RED/GREEN 모두 유지 |
| P0-PERF01 canonical | Record parse→serialize 동일 | pass | RED/GREEN 모두 유지 |
| P0-PERF02 고정 hash | baseline SHA256 literal 동일 | pass | RED/GREEN 모두 유지, 144206B |
| P0-PERF02 시간 RED | Record serialize 중앙값<=60000μs | fail | 82077μs, 예상 RED |
| P0-PERF02 시간 GREEN | 동일 host/runner/fixture 중앙값 | pass | 28804μs |
| P0-PERF01 source mapping | source table 변조 거부 | pass | RED/GREEN 모두 유지 |
| P0-PERF01 selection mapping | compact table 변조 거부 | pass | RED/GREEN 모두 유지 |
| P0-PERF01 identity | job ID 위조 거부 | pass | RED/GREEN 모두 유지 |

| GREEN operation | 1회 μs | 2회 μs | 3회 μs |
| --- | --- | --- | --- |
| SerializeIntent | 14799 | 15118 | 15003 |
| SerializeRecord(Intent) | 29159 | 28804 | 28669 |
| ParseRecord | 61479 | 61055 | 61223 |
| RestoreSelection | 14088 | 14089 | 14172 |

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `/private/tmp/media-server-job-validation.jZC0CD` | RED 소유 executable root | 4713592B | EXIT containment cleanup | removed=true | expected-red 원출력 |
| `/private/tmp/media-server-job-validation.xSwmoG` | GREEN 소유 executable root | 4713608B | EXIT containment cleanup | removed=true | green 원출력 |

기존 실패·진단 원출력은 유지했다. Ready 최적화/전역 cache/무검사 API/성능 합격선 확대는 하지 않았다. 다음 단계는 메인 diff 검토·임시 계측 제거와 영향검증 판단이며 이번 독립 결과만으로 복수 출력·재기동·통합 완료를 주장하지 않는다.

제품 수정 전 characterization이다. 성능 합격선/RED는 아직 정하지 않았다. 실제 SelectDerivedRecording→BuildDerivedJobIntent에 source 1개, 40ms 간격 250 samples/UTC mappings, 요청 [3000,4800)ms를 넣어 손계산한 45 confirmed slices를 확인한다. media/hash는 합성 metadata이며 실제 영상·catalog·서버 검증이 아니다.

빌드 대조: 실제 `build-gst-onnx/CMakeCache.txt`의 CMAKE_BUILD_TYPE은 빈 문자열이고 runtime flags.make의 CXX_FLAGS는 `-std=c++17`이다. 독립 runner도 최적화/NDEBUG 옵션을 추가하지 않는다. GStreamer=0 직접 source 링크라는 차이는 남으며 절대 시간으로 HTTP 합격을 대신하지 않고 동일 fixture 전후 비교에 사용한다.

명령: `bash scripts/internal/verify_recording_derived_job_validation.sh`. SerializeIntent/SerializeRecord(Intent)/ParseRecord/Restore를 각각 steady clock 3회 측정하고 canonical SHA256·bytes·count만 보존한다. canonical 왕복 일치, source mapping 변조, selection table mapping 변조, job identity 변조 거부를 독립 행으로 기록한다. owned 임시 executable root는 EXIT cleanup으로 크기·부재를 확인한다. 실제 앱은 실행하지 않는다. token은 도구 집계가 없어 미집계다.

### P0-PERF01 기준 측정 결과

실제 명령: `env -i PATH="$PATH" HOME=/tmp TMPDIR=/tmp bash scripts/internal/verify_recording_derived_job_validation.sh > docs/release-artifacts/v4.1.0/s11-preparation-mapping/p0-perf-baseline.log 2>&1`, exit0. [원출력](p0-perf-baseline.log) 5 pass/0 fail. 이는 characterization이며 성능 RED/GREEN이나 HTTP 해결 PASS가 아니다. 영구 제품 변경은 아직 없다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| P0-PERF01 크기·coverage | 실제 selector/builder, literal source1/sample250/slice45/complete | pass | selection72752B, intent144078B, record144206B |
| P0-PERF01 canonical | Record parse→serialize byte 동일 | pass | SHA256 `529aff50132395c790a05ad68d735381b174966dc3099f00ba022a8ead494d5b` |
| P0-PERF01 source mapping | source table와 다른 UTC start metadata 거부 | pass | SerializeIntent 빈 결과 |
| P0-PERF01 selection mapping | compact selection segment table의 UTC start 변조 거부 | pass | SerializeIntent 빈 결과 |
| P0-PERF01 identity | job ID 위조 거부 | pass | SerializeIntent 빈 결과 |

| 실제 operation | 1회 μs | 2회 μs | 3회 μs |
| --- | --- | --- | --- |
| SerializeIntent | 41240 | 41144 | 41193 |
| SerializeRecord(Intent) | 81837 | 82181 | 81804 |
| ParseRecord | 140596 | 141243 | 140924 |
| RestoreSelection | 51391 | 51390 | 51361 |

steady_clock으로 각 호출을 측정했다. DIAG07 actual은 Ready payload 약283KB/selection61KB인 반면 이번은 Intent144KB/selection72KB이므로 동일 입력이라고 주장하지 않는다. 동일 source/sample 규모의 많은 slice에 대한 순수 검증 기준이다. 다음 최적화 판정은 동일 fixture/build와 위 고정 hash를 기준으로 하며, 아직 성능 threshold를 정하지 않았다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `/private/tmp/media-server-job-validation.lty1RZ` | 이번 실행 소유 executable root | 4712872B | EXIT trap containment 확인 후 삭제 | removed=true | baseline 원출력 cleanup |

실제 서버·포트·미디어 생성은 없었다. token start/end/consumed는 계측 소스 부재로 미집계이며 시간 소스는 C++ steady_clock이다. 최초 기본 build 경로 읽기(`build/`)는 부재 exit1이었고 실제 `build-gst-onnx`를 확인했다. 테스트/제품 실패가 아닌 읽기 준비 경로 오류다.

## P0 HTTP 경계 계측 재개 사전 정의

### P0-DIAG07 실행 전 data-only 비용 계측

결과: [build](p0-data-build.log) exit0, [actual1회](p0-data-diagnostic-actual.log) exit1/26,781ms. 긴 UpdateDerivedJob은 held4459ms, 그 중 appendApply3846ms로 분해됐다. 단일new serializer만이4초를 소비한 것은 아니다. 각 구간은 중첩돼 있으므로 아래 값들을 단순합산하지 않는다.

| stage | 최대 관측 ms | 입력 크기·의미 |
| --- | --- | --- |
| update-serialize-new | 102 | source1/sample250/selection61180bytes/payload283371bytes |
| update-serialize-old | 99 | payload283375bytes |
| update-preflight | 416 | 같은 source/sample/selection 크기 |
| update-append-apply | 3846 | 긴 전이 payload283386bytes |
| apply-parse | 200 | payload283371bytes |
| apply-intent-compare | 40 | payload283371bytes |
| apply-record-compare | 201 | payload283375bytes |
| sqlite-parse | 165 | payload283371bytes |
| sqlite-serialize | 100 | payload283371bytes |

appendApply 중 이전record의 apply-parse가 약73ms씩 여러 번 관측된다. checkpoint/replay 등의 호출구조와 순수검증 반복의 기여를 메인이 대조 중이다. 원문 job을 보존하지 않았으므로 독립smoke는 위 입력크기·기존 typed fixture를 근거로 명시적인 합성입력을 만들며 실record 그대로라고 주장하지 않아야 한다. actual reference·healthy·정상종료3 PASS, HTTP header4001ms FAIL, 출력관측[] 및 재기동/suite미실행은 유지한다.

| 소유 root | 삭제 전 bytes | 정리 |
| --- | --- | --- |
| `/private/tmp/media-server-current-integration-tDqEEQ` | 42,561,423 | PID60490 exit0, HTTP53685/RTSP53686반환, UDP닫힘/rootAbsenttrue/failure0 |

메인 승인: UpdateDerivedJob의 new/old Serialize·preflight·appendApply, ApplyDerivedJobMutationLocked의 parse·intent/record/ready compare, SQLite derived parse/serialize를 각각20ms 이상일 때만 고정 stage 및 numeric trace/thread/elapsed/payload bytes/source 수/source sample 수/selection bytes로 출력한다. 내용·ID·경로는 보존하지 않는다. 이 계측에서 캐시/검사완화/락해제 위치변경은 하지 않는다.

`./server.sh build`의 `p0-data-build.log` 뒤 동일격리 actual1회의 `p0-data-diagnostic-actual.log`를 보존한다. 이번 관측 목적은 독립 record fixture에 필요한 입력크기와 hotspot을 확정하는 것이며 이후 실제앱 무작정 반복 대신 독립smoke TDD로 전환한다.

### P0-DIAG06 실행 전 catalog lock 계측

결과: [계측 build](p0-lock-build.log) exit0, [실제1회](p0-lock-diagnostic-actual.log) exit1/26,930ms. 긴 mutex 소유 함수는 `UpdateDerivedJob`로 확인했다. 다음 값은 원출력의 같은 run/thread 상관이며 시간 상한을 늘리지 않았다.

| 함수 | wait ms | held ms | 직접 의미 |
| --- | --- | --- | --- |
| UpdateDerivedJob | 0 | 1366 | 긴 catalog mutex 소유 |
| ValidateMediaV2 | 1362 | 1 | 조회 thread의 대기 |
| UpdateDerivedJob | 4 | 4556 | 4초 초과 mutex 소유 |
| AdjustHoldCount | 4563 | 0 | 조회의 release-hold 대기 |
| RetentionSnapshot | 4560 | 0 | retention 대기 |
| RecoverBoundSegmentV2 | 4552 | 31 | writer 복구/확정 경계 대기 |
| PutReferencedObservation | 4443 | 1 | 관측 적재 대기 |
| SnapshotTimelineV2 | 1058 | 31 | 앞선 snapshot 지연 대부분 mutex 획득 대기 |

`UpdateDerivedJob`352~376은 mutex 안에서 새/기존 record 직렬화, `ApplyDerivedJobMutationLocked`의 parse·전이검증·재직렬화, `AppendAndApplyLocked`를 실행한다. owner 함수는 확정됐지만 각 하위 작업의 비용 분리는 아직 미확정이다. 제품 근본fix는 메인 설계 대상이며 이번에 임의 적용하지 않았다. healthy/ICE·실제 reference·정상종료3개 PASS, actual HTTP FAIL이고 출력관측은 빈 배열이다.

| 소유 root | 삭제 전 bytes | 정리 |
| --- | --- | --- |
| `/private/tmp/media-server-current-integration-Nhlf4I` | 42,736,894 | PID60050 exit0, HTTP53324/RTSP53325반환, UDP닫힘/rootAbsenttrue/failure0 |

메인 승인: catalog 및 timeline snapshot의 동일 `mu_` lock_guard64개 경계를 `std::unique_lock<std::mutex>` member의 임시 RAII guard로 치환한다. 획득 위치/범위/해제시점은 동일하며 wait 또는 held가50ms 이상인 경우만 unlock 후 `__func__` 함수명·숫자thread/trace·wait_ms/held_ms를 출력한다. ID/path/내용은 출력하지 않는다. 기본 opt-in꺼짐, 실제 진단환경만 켜고 기존4MiB log/HTTP4초/전체180초를 유지한다.

명령은 `./server.sh build` → 동일격리 actual1회이며 로그는 `p0-lock-build.log`와 `p0-lock-diagnostic-actual.log`. 긴 소유 함수를 확인한 뒤 근본 원인분석을 메인에 반환하고 임의 제품fix는 하지 않는다. DIAG05와 DIAG06의 임시 계측은 진단 종료 뒤 모두 제거/rebuild 대상이다.

### P0-DIAG05 실행 전 임시 내부 계측

실제 결과: 계측빌드 두 번 모두 exit0. [최종 stage 진단](p0-stage-diagnostic-actual.log) 실제1회 exit1/27,628ms. HTTP sequence282는 header이전4003ms에 실패했고, 동시에 진행 중인 query trace178의 snapshot4642ms/finish261ms/query4904ms가 소유 서버 정상 drain 중 끝났다. 이번 자료는 지연 주요 경계를 SnapshotTimelineV2로 좁히며 physical inspector를 주원인으로 단정했던 추정을 지지하지 않는다. 다만 snapshot 함수 내 mutex 대기와 잠금 안 연산은 아직 분리되지 않았다.

| trace | stage | exit elapsed ms | 의미 |
| --- | --- | --- | --- |
| 148 | snapshot/query | 507/520 | 앞선 지연 관측 |
| 176 | snapshot | 1103 | catalog snapshot 경계 |
| 176 | validate/resolve | 1354/1368 | 같은 run의 별도 catalog 검증 지연 |
| 176 | finish/query | 1375/2478 | 정상 완료 query |
| 178 | snapshot | 4642 | HTTP4초를 넘긴 주 경계 |
| 178 | finish/query | 261/4904 | 늦은 응답 계산 완료; 클라이언트는 이미 실패 |

모든 stage enter/exit와 HTTP 행은 원출력에 보존했다. source/reference 실제 연결 PASS, 앱 healthy/ICE PASS, 앱 종료 PASS, current actual HTTP FAIL(3/1)이며 출력관측빈배열·재기동·suite미실행이다. sample은 재실행하지 않았다. 임시 계측은 아직 제품파일에 남아 있으며 근본fix 단계에서 제거/rebuild해야 한다.

| 소유 root | bytes | 정리 |
| --- | --- | --- |
| `/private/tmp/media-server-current-integration-dvN7Ac` | 43,059,560 | PID59615 exit0/signalnull, HTTP52979/RTSP52980반환, UDP닫힘/rootAbsenttrue/failure0 |

메인 승인한 임시 opt-in `MEDIA_SERVER_RECORDING_DIAGNOSTIC_TIMING=1`에서만 QueryTimeline/snapshot/FinishTimelineV2/ResolveMedia의 FindV1·FindV2·AllLinks·Acquire·physicalInspect·Validate enter/exit를 숫자 trace/thread와 고정 stage·elapsed로 출력한다. 기본꺼짐이며 ID/path/URL/metadata는 넣지 않는다. actualrunner는 해당 prefix의 전체 화이트리스트 형식 일치행만 보존한다. 제품 검증/미디어 보호/조회 순서/HTTP4초/전체180초는 불변이다.

명령: `./server.sh build` → 동일 격리 `node scripts/internal/verify_recording_current_app.mjs` 실제1회. 로그는 `p0-stage-build.log`, `p0-stage-diagnostic-actual.log`. sample 재실행은 없다. 이후 원인분석 후 계측코드를 제거하고 근본fix만 TDD/rebuild한다. 이번 계측빌드·실행은 수정 합격 PASS가 아니라 원인 관측 자료다.

실행 전 메인 보완으로 destructor의 `release-hold` enter/exit도 포함했다. 첫 계측빌드 완료 뒤 추가돼 `p0-stage-release-build.log`로 incremental rebuild하며 실제 실행은 최종계측1회만 한다.

### P0-DIAG04 실행 전 추가 정의

실행 결과: [RED](p0-stack-diagnostic-red.log) exit1 0/1 → [자체 GREEN](p0-stack-diagnostic-green.log) exit0 4/0. 실제 [stack 진단](p0-stack-diagnostic-actual.log)은 exit1/26,890ms이다. sample PID59143은 exit0/signalnull로 종료했고 원문1,612,340bytes를 임시 root에서 즉시 삭제했다. 주소·thread·경로 없는 추출10행만 원출력에 보존했다.

| 관측 | 실측 | 판정 경계 |
| --- | --- | --- |
| sequence279 timeline | header1020ms/200, 이 요청 대기1000ms에 sample 시작 | 지연된 정상 요청이며 실패 요청 스택이 아님 |
| sequence280 timeline | header227ms/200 | 정상 |
| sequence281 timeline | header 이전4002ms timeout/statusnull/bytes0 | 실제 FAIL, sample과 다른 요청 |
| sample 안전 frames | `gst_bus_timed_pop_filtered`→`poll` 두 쌍 및 `__psynch_mutexwait`6행 | 제품 Recording 함수가 추출되지 않아 timeline 원인/스레드를 단정하지 않음 |
| 실제 EventRecord reference | 연결 성공 | PASS |
| product1 healthy/ICE 및 종료 | 각 정상 | PASS |

sample의 제품 함수 미추출은 심볼 부재인지 mangled symbol의 word-boundary 필터 누락인지 현재 자료로 구분할 수 없다. 원문은 정책대로 삭제했으므로 재구성하지 않는다. 후속 진단 설계는 메인이 판단하며 자동 재실행하지 않았다. sample 관측 자체를 원인확정 PASS로 사용하지 않는다.

| 소유 경로 | bytes | 정리 결과 |
| --- | --- | --- |
| `/private/tmp/media-server-current-integration-vyjQnC/timeline.sample` | 1,612,340 | sample 종료 후 원문삭제/부재 |
| `/private/tmp/media-server-current-integration-vyjQnC` | 43,035,303 | product PID59089 exit0, HTTP52629/RTSP52630 반환, UDP닫힘, root부재/failure0 |

메인 승인: GET timeline의 header가1000ms 뒤에도 미수신일 때 현재 소유 spawned PID만 `/usr/bin/sample <pid> 1 -file <ownedroot>/timeline.sample`로 실행 전체1회 관측한다. 동일 HTTP4초/전체180초를 유지한다. sample child는 종료를 await하고5초 자체 cleanup 상한에서 SIGTERM 후 종료확인하며, 원문은 저장소에 보존하지 않는다. 안전 추출은 고정 알려진 함수 이름·원문 행순서·들여쓰기 깊이만; 주소/thread명/파일경로/raw source는 제외한다. 샘플 request sequence와 HTTP timeout sequence가 같은지 구분하며 정상2348ms 요청을 포착해도 실패 request로 바꾸지 않는다.

자체검사 명령은 기존 diagnostics Node test에 P0-DIAG04를 추가해 source/path/address sentinel 제거와 알려진 stack만 남음을 확인한다. 실제 명령은 동일 actual1회, 원출력 `p0-stack-diagnostic-actual.log`. sample 실행불가/known stack 부재도 미확인으로 보고하고 자동 재시도하지 않는다.

### 진단1회 결과

자체검사는 [예상 RED](p0-http-diagnostic-red.log) exit1 0/3 후 [GREEN](p0-http-diagnostic-green.log) exit0 3/0(28.829833ms)이다. 원문 sentinel은 테스트용 문자열이며 실제 자격증명은 사용하지 않았다. Node 자체검사는 임시 파일·서버를 생성하지 않았다.

| 개별 검사 | 확인 내용 | 결과 |
| --- | --- | --- |
| P0-DIAG01 | 정상 header20ms/body35ms/total55ms/3bytes, route/query sentinel 미노출 | PASS |
| P0-DIAG02 | header 이전 timeout4000ms/status·header/body null, 고정 오류코드와 원문 미전달 | PASS |
| P0-DIAG03 | header15ms 뒤 body3985ms/3bytes 수신 후 timeout, 완료 거부 | PASS |

실제 승인1회는 [p0-http-diagnostic-actual.log](p0-http-diagnostic-actual.log) exit1, 전체33,823ms이다. 모든259개 요청의 개별 timing은 원출력에 보존한다. health13회 초기 접속 실패는 기존 startup polling 범위이며 endpoint 성공이나 timeout으로 바꾸지 않았다.

| route class | 요청 수 | 정상 응답 수 | 성공 header 최대ms | 성공 body 최대ms | 관측 |
| --- | --- | --- | --- | --- | --- |
| health | 14 | 1 | 6 | 2 | startup 초기13회 error 뒤 정상 |
| ice | 1 | 1 | 1 | 0 | 200 |
| source | 1 | 1 | 89 | 0 | 정상 source 설정 |
| tap-create | 1 | 1 | 27 | 0 | 정상 |
| tap | 82 | 82 | 23 | 0 | read와 최종 DELETE 포함 |
| timeline | 157 | 156 | 2348 | 0 | sequence258 header 이전4001ms timeout |
| rule | 2 | 2 | 1 | 0 | 설정·비활성 |
| tap-events | 1 | 1 | 5 | 0 | 실제 dispatch |

| 실제 개별 판정 | 내용 | 결과 |
| --- | --- | --- |
| S11-CI09 product1 | healthy 및 isolated ICE | PASS |
| S11-CI07 run1 | 실제 tuple→EventRecord reference | PASS |
| current actual app | GET timeline header 이전 timeout, status null/bytes0/4001ms | FAIL |
| S11-CI08 product1 | 정상 exit0 및 HTTP/RTSP 반환 | PASS |

직전 timeline 응답 두 개는227/228ms, timeout 뒤 tap DELETE는23ms였다. 이번 자료는 HTTP header 대기 지연을 확정하지만 catalog 잠금·physical inspector 중 내부 원인은 아직 특정하지 않는다. 본문 수신이 느렸다고 해석하지 않는다. 기대 출력2, 실제 관측 배열은 빈 값이며 복수 출력·두 번째 제품 기동·통합 suite는 미실행이다. 추가 실행·timeout 확대·제품 수정을 하지 않고 메인 판단으로 넘겼다.

| 소유 경로 | 종류 | 삭제 전 bytes | 종료·정리 |
| --- | --- | --- | --- |
| `/private/tmp/media-server-current-integration-255vCX` | 진단 앱·상태·미디어 root | 52,006,523 | PID58796 exit0/signalnull, HTTP52303/RTSP52304 반환, UDP닫힘, rootAbsenttrue/failure0 |

계측만 helper에 추가했고 기존4초 signal·180초 전체·64MiB 응답 cap은 동일하다. sample 프로세스 수집은 실행하지 않았다. 기존 focused runner freshness guard의 별도 실행 미확인도 그대로다. token은 집계 수단이 없어 미집계이며 실제 앱 시간은 performance.now 원출력값이다.

메인 승인 범위는 제품 변경 없이 HTTP4초/전체180초/body64MiB를 유지한 계측이다. 아래 세 자체검사 후 동일 actual1회만 실행한다. sample 도구는 macOS에 존재함만 읽기 확인했고 프로세스 sample은 실행하지 않는다.

| ID | 실행 전 정의·oracle | 명령 |
| --- | --- | --- |
| P0-DIAG01 | 정상 응답 header/body/total 실측 구분, bytes/status, route/query/비밀 sentinel 원문 미출력 | `env -i PATH="$PATH" HOME=/tmp TMPDIR=/tmp node --test scripts/internal/recording_current_http_diagnostics.test.mjs` |
| P0-DIAG02 | header 이전 TimeoutError를 header phase/nullable status·header/body·고정 timeout으로 기록하고 원래 실패 유지 | 같은 명령 |
| P0-DIAG03 | header 이후 body TimeoutError를 body phase·기확인 status/header elapsed/partial bytes로 기록, 완료로 승격 금지 | 같은 명령 |

자체검사 예상 RED는 기존 진단 미구현으로 보고 객체 부재다. fake fetch/수동 monotonic clock은 측정 oracle만 격리하며 서버 동작 PASS가 아니다. 실제 단기 명령은 `env -i PATH="$PATH" HOME=/tmp TMPDIR=/tmp node scripts/internal/verify_recording_current_app.mjs`, 로그는 `p0-http-diagnostic-actual.log`. 안전 출력은 sequence/method fixed enum/route class/status/phase/outcome 및 숫자 elapsed·bytes뿐이다. URL·query·식별자·body·header원문·error원문을 포함하지 않는다. 실제1회 이후 원인 자료를 메인에 반환하고 임의 재시도하지 않는다.

독자: 이번 내부 증거 전달/현행 통합 검토자. lifecycle: 개발·실패 이력 보존. AGENTS.md 및 중앙 개별 정의가 기준이다. **현재 전체 통합 미완료, 추가 실행·커밋·푸시 보류**다. 아래 전수표는 실행 이력을 보존하며 상세 현재 판정은 이어지는 본문에서 구분한다.

메인 최종 기록 대조: `./server.sh verify-docs-links` exit0(270md/8298links/실패0), `git diff --check` exit0. 전수·cleanup·후속 표까지 반영한 문서 검사이며 제품 통합 실패를 대체하지 않는다. token start/end/consumed는 집계 도구 미제공으로 미집계이며 테스트시간은 각 원출력 측정만 인정한다.

### 재개 명령 결과 보충

| 원출력 | 명령 | exit·결과 |
| --- | --- | --- |
| evidence-build.log | `./server.sh build` | 2, 인접 EventPost projection에 잘못 삽입한 compile 오류; 제품검증 미실행 |
| evidence-build-retry.log | `./server.sh build` | 0, 실제 EventStorage projection으로 정정 후 전체 빌드 |
| evidence-first-green.log | 동일 evidence focused shell | 134, EV01 PASS 후 fixture rule service 미구성; 예상 RED 아님 |
| evidence-roundtrip-green.log | 동일 evidence focused shell | 0, 7/0 |
| evidence-dispatch-green.log | 동일 evidence focused shell | 0, 10/0; 이후 강화 oracle에서 race 발견돼 최종15/0이 현행 증거 |
| evidence-focused-green.log | 동일 evidence focused shell | 1, 14/1; spy 비동기 observed 덮어쓰기 |
| evidence-focused-final.log | 동일 evidence focused shell | 0, 15/0; dispatch 스레드 정확1회 입력 분리 |
| evidence-read-boundary.log | `node scripts/internal/verify_v390_analysis_session_read_application_boundary.mjs` | 1, 2/4; 구형 graph/constructor 및 carrier static oracle 준비 차이 |
| evidence-rule-boundary.log | `node scripts/internal/verify_v390_event_rule_application_boundary.mjs` | 1, 4/2; 구형 graph2 실패 |
| evidence-placeholder-red.log | `node --test --test-name-pattern='exact\|정확한 accepted' scripts/internal/recording_current_integration.test.mjs` | 1, 0/1; exact pending 분류 예상 RED |

모든 직접 Node/bash 검사는 `env -i PATH="$PATH" HOME=/tmp TMPDIR=/tmp`를 앞에 두었다. approved runner freshness guard를 마지막에 추가했으며 그 guard 추가 뒤 focused를 재실행하지 않았다. 실제 제품/header/TU는 최종15/0과 동일하다. boundary 임시물의 개별경로/크기는 출력하지 않는 기존 구조로 미기록이며 finally cleanup 범위를 유지했다. exit134의 별도 시스템 crash/core 파일은 수집·조회하지 않아 없음으로 단정하지 않는다. 검증 소유 root 부재는 아래 직접 확인한 범위다.

## 재개 소유 임시물 정리 전수

개별 경로는 원출력에서만 추출했으며 현재 부재를 읽기 확인했다. boundary verifier 내부 mkdtemp는 finally 삭제되지만 경로/삭제 전 크기가 원출력에 없으므로 아래 표에 추정 복원하지 않는다.

| 로그 | 경로 | 삭제 전 bytes | 현재 확인 |
| --- | --- | --- | --- |
| [evidence-actual-placeholder.log](evidence-actual-placeholder.log) | /private/tmp/media-server-current-integration-285AtP | 42739351 | 부재 |
| [evidence-actual-retry.log](evidence-actual-retry.log) | /private/tmp/media-server-current-integration-lwLFau | 28430719 | 부재 |
| [evidence-consumer-connection.log](evidence-consumer-connection.log) | /private/tmp/media-server-consumer-connection.2KX3Km | 6416452 | 부재 |
| [evidence-dispatch-green.log](evidence-dispatch-green.log) | /private/tmp/media-server-application-evidence.mag2ir | 21617803 | 부재 |
| [evidence-expected-red.log](evidence-expected-red.log) | /private/tmp/media-server-application-evidence.eJg6iy | 7151179 | 부재 |
| [evidence-first-green.log](evidence-first-green.log) | /private/tmp/media-server-application-evidence.1GPbsa | 7359291 | 부재 |
| [evidence-focused-final.log](evidence-focused-final.log) | /private/tmp/media-server-application-evidence.9kTy4I | 21638379 | 부재 |
| [evidence-focused-green.log](evidence-focused-green.log) | /private/tmp/media-server-application-evidence.RJOY4j | 21621291 | 부재 |
| [evidence-roundtrip-green.log](evidence-roundtrip-green.log) | /private/tmp/media-server-application-evidence.nlZmi7 | 7376731 | 부재 |


## 재개 원출력 개별 결과 전수

아래는 보존된 evidence 로그의 개별 판정행을 그대로 분류한 역사 포함 전수표다. 동일 검사의 재실행은 별도 행이며 unique 기능 수나 전체 PASS 합계가 아니다. historical graph의 내부 실패행도 숨기지 않는다.

| 로그·행 | 테스트 내용 | 결과 |
| --- | --- | --- |
| [evidence-actual-placeholder.log](evidence-actual-placeholder.log) · 1 | S11-CI09 product-1 healthy isolated ICE | PASS |
| [evidence-actual-placeholder.log](evidence-actual-placeholder.log) · 2 | S11-CI07 run1 actual tuple EventRecord reference | PASS |
| [evidence-actual-placeholder.log](evidence-actual-placeholder.log) · 4 | current actual app: The operation was aborted due to timeout | FAIL |
| [evidence-actual-placeholder.log](evidence-actual-placeholder.log) · 5 | S11-CI08 product-1 exit0 ports returned | PASS |
| [evidence-actual-retry.log](evidence-actual-retry.log) · 1 | S11-CI09 product-1 healthy isolated ICE | PASS |
| [evidence-actual-retry.log](evidence-actual-retry.log) · 2 | S11-CI07 run1 actual tuple EventRecord reference | PASS |
| [evidence-actual-retry.log](evidence-actual-retry.log) · 3 | current actual app: event-lineage | FAIL |
| [evidence-actual-retry.log](evidence-actual-retry.log) · 4 | S11-CI08 product-1 exit0 ports returned | PASS |
| [evidence-consumer-connection.log](evidence-consumer-connection.log) · 1 | C401 관측·참조 원자 저장 | PASS |
| [evidence-consumer-connection.log](evidence-consumer-connection.log) · 2 | C402 쌍 identity 불일치 거부 | PASS |
| [evidence-consumer-connection.log](evidence-consumer-connection.log) · 3 | C403 동일 원본 재전달·event 병합 | PASS |
| [evidence-consumer-connection.log](evidence-consumer-connection.log) · 4 | C405 SQL·JSONL·checkpoint 쌍 복구 | PASS |
| [evidence-consumer-connection.log](evidence-consumer-connection.log) · 5 | C404 다른 원본 동일PTS 구분 | PASS |
| [evidence-consumer-connection.log](evidence-consumer-connection.log) · 6 | C406 실제 OnResult 원본 참조 저장 | PASS |
| [evidence-consumer-connection.log](evidence-consumer-connection.log) · 7 | C407 OnEvent 강제 표본 | PASS |
| [evidence-consumer-connection.log](evidence-consumer-connection.log) · 8 | C408 종료track 과거참조 보존 | PASS |
| [evidence-consumer-connection.log](evidence-consumer-connection.log) · 9 | C409 종료track 참조부재 unknown | PASS |
| [evidence-consumer-connection.log](evidence-consumer-connection.log) · 10 | C410 sampling·queue·StopAndDrain 회귀 | PASS |
| [evidence-consumer-connection.log](evidence-consumer-connection.log) · 11 | C411 exact·미색인 복수 후보 보존 | PASS |
| [evidence-consumer-connection.log](evidence-consumer-connection.log) · 12 | C412 nearest/ambiguous/unavailable 미승격 | PASS |
| [evidence-consumer-connection.log](evidence-consumer-connection.log) · 13 | C413 UTC unknown·삭제 상태 재판정 | PASS |
| [evidence-consumer-connection.log](evidence-consumer-connection.log) · 14 | C414 실제 TryResolve 요청참조 저장 | PASS |
| [evidence-consumer-connection.log](evidence-consumer-connection.log) · 15 | C415 event 재전달·확장·세대 구분 | PASS |
| [evidence-consumer-connection.log](evidence-consumer-connection.log) · 16 | C416 source/channel 충돌 거부 | PASS |
| [evidence-consumer-connection.log](evidence-consumer-connection.log) · 17 | C417 같은 원본 미디어 교집합 우선 | PASS |
| [evidence-consumer-connection.log](evidence-consumer-connection.log) · 18 | C418 공개 결과·구형 fallback 불변 | PASS |
| [evidence-consumer-connection.log](evidence-consumer-connection.log) · 19 | C422 실제 bridge 초기 pre-roll 수락·pending 유지 | PASS |
| [evidence-consumer-connection.log](evidence-consumer-connection.log) · 20 | C423 초기 요청 멱등·갱신·generation 분리 | PASS |
| [evidence-consumer-connection.log](evidence-consumer-connection.log) · 21 | C424 초기 요청 SQL·JSONL 복구 | PASS |
| [evidence-consumer-connection.log](evidence-consumer-connection.log) · 22 | C425 초기 요청 checkpoint 복구 | PASS |
| [evidence-dispatch-green.log](evidence-dispatch-green.log) · 1 | EV01 canonical application 왕복 같은 녹화 증거 | PASS |
| [evidence-dispatch-green.log](evidence-dispatch-green.log) · 2 | EV02 실제 rule 평가 왕복 증거 보존 | PASS |
| [evidence-dispatch-green.log](evidence-dispatch-green.log) · 3 | EV03 canonical projection 실제 storage bridge 입력 증거 | PASS |
| [evidence-dispatch-green.log](evidence-dispatch-green.log) · 4 | EV03 application projection 실제 storage bridge 입력 증거 | PASS |
| [evidence-dispatch-green.log](evidence-dispatch-green.log) · 5 | EV04 dispatch frame 충돌 증거 복원 거부 | PASS |
| [evidence-dispatch-green.log](evidence-dispatch-green.log) · 6 | EV04 source 충돌 거부 | PASS |
| [evidence-dispatch-green.log](evidence-dispatch-green.log) · 7 | EV04 PTS 충돌 거부 | PASS |
| [evidence-dispatch-green.log](evidence-dispatch-green.log) · 8 | EV04 frame 충돌 거부 | PASS |
| [evidence-dispatch-green.log](evidence-dispatch-green.log) · 9 | EV04 증거 부재 발명 금지 | PASS |
| [evidence-dispatch-green.log](evidence-dispatch-green.log) · 10 | EV05 history snapshot null 보존 | PASS |
| [evidence-expected-red.log](evidence-expected-red.log) · 1 | EV01 canonical application 왕복 같은 녹화 증거 | FAIL |
| [evidence-first-green.log](evidence-first-green.log) · 2 | EV01 canonical application 왕복 같은 녹화 증거 | PASS |
| [evidence-focused-final.log](evidence-focused-final.log) · 1 | EV01 canonical application 왕복 같은 녹화 증거 | PASS |
| [evidence-focused-final.log](evidence-focused-final.log) · 2 | EV01 전체 관측 context 및 원본 timestamp 연관 literal 보존 | PASS |
| [evidence-focused-final.log](evidence-focused-final.log) · 3 | EV02 실제 rule 평가 왕복 증거 보존 | PASS |
| [evidence-focused-final.log](evidence-focused-final.log) · 4 | EV02 평가 application annotated 결과 재복원 증거 | PASS |
| [evidence-focused-final.log](evidence-focused-final.log) · 5 | EV03 canonical projection 실제 storage bridge 입력 증거 | PASS |
| [evidence-focused-final.log](evidence-focused-final.log) · 6 | EV03 application projection 실제 storage bridge 입력 증거 | PASS |
| [evidence-focused-final.log](evidence-focused-final.log) · 7 | EV04 dispatch frame 충돌 증거 복원 거부 | PASS |
| [evidence-focused-final.log](evidence-focused-final.log) · 8 | EV04 source 충돌 거부 | PASS |
| [evidence-focused-final.log](evidence-focused-final.log) · 9 | EV04 PTS 충돌 거부 | PASS |
| [evidence-focused-final.log](evidence-focused-final.log) · 10 | EV04 frame 충돌 거부 | PASS |
| [evidence-focused-final.log](evidence-focused-final.log) · 11 | EV04 증거 부재 발명 금지 | PASS |
| [evidence-focused-final.log](evidence-focused-final.log) · 12 | EV05 history snapshot null 보존 | PASS |
| [evidence-focused-final.log](evidence-focused-final.log) · 13 | EV05 원본 해제 뒤 동일 4096 snapshot 수명 유지 | PASS |
| [evidence-focused-final.log](evidence-focused-final.log) · 14 | EV05 마지막 carrier 해제 뒤 snapshot 해제 | PASS |
| [evidence-focused-final.log](evidence-focused-final.log) · 15 | EV06 실제 공개 result serializer 내부 증거 비노출 불변 | PASS |
| [evidence-focused-green.log](evidence-focused-green.log) · 1 | EV01 canonical application 왕복 같은 녹화 증거 | PASS |
| [evidence-focused-green.log](evidence-focused-green.log) · 2 | EV01 전체 관측 context 및 원본 timestamp 연관 literal 보존 | PASS |
| [evidence-focused-green.log](evidence-focused-green.log) · 3 | EV02 실제 rule 평가 왕복 증거 보존 | PASS |
| [evidence-focused-green.log](evidence-focused-green.log) · 4 | EV02 평가 application annotated 결과 재복원 증거 | PASS |
| [evidence-focused-green.log](evidence-focused-green.log) · 5 | EV03 canonical projection 실제 storage bridge 입력 증거 | PASS |
| [evidence-focused-green.log](evidence-focused-green.log) · 6 | EV03 application projection 실제 storage bridge 입력 증거 | PASS |
| [evidence-focused-green.log](evidence-focused-green.log) · 7 | EV04 dispatch frame 충돌 증거 복원 거부 | FAIL |
| [evidence-focused-green.log](evidence-focused-green.log) · 8 | EV04 source 충돌 거부 | PASS |
| [evidence-focused-green.log](evidence-focused-green.log) · 9 | EV04 PTS 충돌 거부 | PASS |
| [evidence-focused-green.log](evidence-focused-green.log) · 10 | EV04 frame 충돌 거부 | PASS |
| [evidence-focused-green.log](evidence-focused-green.log) · 11 | EV04 증거 부재 발명 금지 | PASS |
| [evidence-focused-green.log](evidence-focused-green.log) · 12 | EV05 history snapshot null 보존 | PASS |
| [evidence-focused-green.log](evidence-focused-green.log) · 13 | EV05 원본 해제 뒤 동일 4096 snapshot 수명 유지 | PASS |
| [evidence-focused-green.log](evidence-focused-green.log) · 14 | EV05 마지막 carrier 해제 뒤 snapshot 해제 | PASS |
| [evidence-focused-green.log](evidence-focused-green.log) · 15 | EV06 실제 공개 result serializer 내부 증거 비노출 불변 | PASS |
| [evidence-integration-unit.log](evidence-integration-unit.log) · 1 | S11-CI01 현행 다섯 단계 순서·실제 child 결과 결박 (0.857959ms) | PASS |
| [evidence-integration-unit.log](evidence-integration-unit.log) · 2 | S11-CI04 기존 실제 dispatch 상관 정상·오래된ID·다른조건·복수ID 거부 (0.198958ms) | PASS |
| [evidence-integration-unit.log](evidence-integration-unit.log) · 3 | S11-CI02 nonzero 실패 후 나머지 미실행 (0.069167ms) | PASS |
| [evidence-integration-unit.log](evidence-integration-unit.log) · 4 | S11-CI02 signal 실패 후 나머지 미실행 (0.080208ms) | PASS |
| [evidence-integration-unit.log](evidence-integration-unit.log) · 5 | S11-CI02 output-limit 실패 후 나머지 미실행 (0.056042ms) | PASS |
| [evidence-integration-unit.log](evidence-integration-unit.log) · 6 | S11-CI02 summary-missing 실패 후 나머지 미실행 (0.038916ms) | PASS |
| [evidence-integration-unit.log](evidence-integration-unit.log) · 7 | S11-CI02 summary-duplicate 실패 후 나머지 미실행 (0.03775ms) | PASS |
| [evidence-integration-unit.log](evidence-integration-unit.log) · 8 | S11-CI02 cleanup-failed 실패 후 나머지 미실행 (0.040542ms) | PASS |
| [evidence-integration-unit.log](evidence-integration-unit.log) · 9 | S11-CI02 port-missing 실패 후 나머지 미실행 (0.044291ms) | PASS |
| [evidence-integration-unit.log](evidence-integration-unit.log) · 10 | S11-CI03 legacy 완료 필드 없음·전체 S11/UI/자원 PASS 분리 (0.153708ms) | PASS |
| [evidence-integration-unit.log](evidence-integration-unit.log) · 11 | S11-CI07 기대 출력 수만 있거나 한 기동 관측 누락이면 완료 거부 (0.637792ms) | PASS |
| [evidence-integration-unit.log](evidence-integration-unit.log) · 12 | S11-CI05 페이지 전체·unplaced 별도 total·동일file mapping dedup (4.597041ms) | PASS |
| [evidence-integration-unit.log](evidence-integration-unit.log) · 13 | S11-CI05 누락·중복item·불안정total·truncated·cap 거부 (0.105042ms) | PASS |
| [evidence-integration-unit.log](evidence-integration-unit.log) · 14 | S11-CI05 첫출력/partial/다른reference/job/unsafe숫자 거부 (0.136ms) | PASS |
| [evidence-integration-unit.log](evidence-integration-unit.log) · 15 | S11-CI06 기존ID/hash 보존과 새event/reference/job/output 분리 (0.134708ms) | PASS |
| [evidence-integration-unit.log](evidence-integration-unit.log) · 16 | S11-CI05 점 이벤트 equal+padding 허용·역전/빈확장 거부 (0.063417ms) | PASS |
| [evidence-placeholder-green.log](evidence-placeholder-green.log) · 1 | S11-CI01 현행 다섯 단계 순서·실제 child 결과 결박 (0.874667ms) | PASS |
| [evidence-placeholder-green.log](evidence-placeholder-green.log) · 2 | S11-CI04 기존 실제 dispatch 상관 정상·오래된ID·다른조건·복수ID 거부 (0.208959ms) | PASS |
| [evidence-placeholder-green.log](evidence-placeholder-green.log) · 3 | S11-CI02 nonzero 실패 후 나머지 미실행 (0.067917ms) | PASS |
| [evidence-placeholder-green.log](evidence-placeholder-green.log) · 4 | S11-CI02 signal 실패 후 나머지 미실행 (0.068833ms) | PASS |
| [evidence-placeholder-green.log](evidence-placeholder-green.log) · 5 | S11-CI02 output-limit 실패 후 나머지 미실행 (0.046417ms) | PASS |
| [evidence-placeholder-green.log](evidence-placeholder-green.log) · 6 | S11-CI02 summary-missing 실패 후 나머지 미실행 (0.039084ms) | PASS |
| [evidence-placeholder-green.log](evidence-placeholder-green.log) · 7 | S11-CI02 summary-duplicate 실패 후 나머지 미실행 (0.04925ms) | PASS |
| [evidence-placeholder-green.log](evidence-placeholder-green.log) · 8 | S11-CI02 cleanup-failed 실패 후 나머지 미실행 (0.042542ms) | PASS |
| [evidence-placeholder-green.log](evidence-placeholder-green.log) · 9 | S11-CI02 port-missing 실패 후 나머지 미실행 (0.045833ms) | PASS |
| [evidence-placeholder-green.log](evidence-placeholder-green.log) · 10 | S11-CI03 legacy 완료 필드 없음·전체 S11/UI/자원 PASS 분리 (2.641208ms) | PASS |
| [evidence-placeholder-green.log](evidence-placeholder-green.log) · 11 | S11-CI07 기대 출력 수만 있거나 한 기동 관측 누락이면 완료 거부 (0.284ms) | PASS |
| [evidence-placeholder-green.log](evidence-placeholder-green.log) · 12 | S11-CI05 페이지 전체·unplaced 별도 total·동일file mapping dedup (4.427167ms) | PASS |
| [evidence-placeholder-green.log](evidence-placeholder-green.log) · 13 | S11-CI05 누락·중복item·불안정total·truncated·cap 거부 (0.146542ms) | PASS |
| [evidence-placeholder-green.log](evidence-placeholder-green.log) · 14 | S11-CI05 첫출력/partial/다른reference/job/unsafe숫자 거부 (0.1355ms) | PASS |
| [evidence-placeholder-green.log](evidence-placeholder-green.log) · 15 | S11-CI07 정확한 accepted placeholder만 미완료로 분류하고 lineage 모순은 거부 (0.173792ms) | PASS |
| [evidence-placeholder-green.log](evidence-placeholder-green.log) · 16 | S11-CI06 기존ID/hash 보존과 새event/reference/job/output 분리 (0.135084ms) | PASS |
| [evidence-placeholder-green.log](evidence-placeholder-green.log) · 17 | S11-CI05 점 이벤트 equal+padding 허용·역전/빈확장 거부 (0.076917ms) | PASS |
| [evidence-placeholder-red.log](evidence-placeholder-red.log) · 1 | S11-CI07 정확한 accepted placeholder만 미완료로 분류하고 lineage 모순은 거부 (0.717542ms) | FAIL |
| [evidence-placeholder-red.log](evidence-placeholder-red.log) · 11 | failing tests: | FAIL |
| [evidence-placeholder-red.log](evidence-placeholder-red.log) · 14 | S11-CI07 정확한 accepted placeholder만 미완료로 분류하고 lineage 모순은 거부 (0.717542ms) | FAIL |
| [evidence-read-boundary.log](evidence-read-boundary.log) · 1 | historical approval is separate from actual execution: current branch mismatch | FAIL |
| [evidence-read-boundary.log](evidence-read-boundary.log) · 2 | slice order and completion frontier are fail-closed: unclassified production file: include/ingress/recording_application_service.h | FAIL |
| [evidence-read-boundary.log](evidence-read-boundary.log) · 3 | current graph hash and metrics are exact: unclassified production file: include/ingress/recording_application_service.h | FAIL |
| [evidence-read-boundary.log](evidence-read-boundary.log) · 4 | current graph negative mutations reject forbidden edge and cycle: unclassified production file: include/ingress/recording_application_service.h | FAIL |
| [evidence-read-boundary.log](evidence-read-boundary.log) · 5 | Slice 32 completion and current graph separation is fail-closed: unclassified production file: include/ingress/recording_application_service.h | FAIL |
| [evidence-read-boundary.log](evidence-read-boundary.log) · 6 | composition root extraction preserves lifecycle ownership: composition source missing lifecycle anchor: analysis::AnalysisSessionService analysis_sessions(session_manager); | FAIL |
| [evidence-read-boundary.log](evidence-read-boundary.log) · 7 | negative mutations reject false progress: unclassified production file: include/ingress/recording_application_service.h | FAIL |
| [evidence-read-boundary.log](evidence-read-boundary.log) · 8 | public read contract uses only standard headers plus the approved application frame leaf | PASS |
| [evidence-read-boundary.log](evidence-read-boundary.log) · 9 | adapter owns every canonical field, optional, list order, timeout, and exception semantic — AnalysisSessionApplicationResult.recording_evidence canonical read count/order drift expected=2 | FAIL |
| [evidence-read-boundary.log](evidence-read-boundary.log) · 10 | compiled fake canonical provider rejects mapping, null, timeout, order, and lifecycle false PASS | PASS |
| [evidence-read-boundary.log](evidence-read-boundary.log) · 11 | transport read and lifecycle calls use their injected application ports — composition canonical -> adapter -> HTTP injection/lifetime order drift | FAIL |
| [evidence-read-boundary.log](evidence-read-boundary.log) · 12 | CMake, server dispatch, and graph register the exact non-final Slice30A successor — graph successor is pending or drifted; register Slice30B current graph before completion | FAIL |
| [evidence-read-boundary.log](evidence-read-boundary.log) · 13 | current structure gate accepts the exact non-final Slice30A frontier — Command failed: /Users/dhseo/Workspace/mediaServer/server.sh verify-v390-review4-structure-stabilization-execution | FAIL |
| [evidence-read-boundary.log](evidence-read-boundary.log) · 14 | historical approval is separate from actual execution: current branch mismatch | FAIL |
| [evidence-read-boundary.log](evidence-read-boundary.log) · 15 | slice order and completion frontier are fail-closed: unclassified production file: include/ingress/recording_application_service.h | FAIL |
| [evidence-read-boundary.log](evidence-read-boundary.log) · 16 | current graph hash and metrics are exact: unclassified production file: include/ingress/recording_application_service.h | FAIL |
| [evidence-read-boundary.log](evidence-read-boundary.log) · 17 | current graph negative mutations reject forbidden edge and cycle: unclassified production file: include/ingress/recording_application_service.h | FAIL |
| [evidence-read-boundary.log](evidence-read-boundary.log) · 18 | Slice 32 completion and current graph separation is fail-closed: unclassified production file: include/ingress/recording_application_service.h | FAIL |
| [evidence-read-boundary.log](evidence-read-boundary.log) · 19 | composition root extraction preserves lifecycle ownership: composition source missing lifecycle anchor: analysis::AnalysisSessionService analysis_sessions(session_manager); | FAIL |
| [evidence-read-boundary.log](evidence-read-boundary.log) · 20 | negative mutations reject false progress: unclassified production file: include/ingress/recording_application_service.h | FAIL |
| [evidence-read-scoped.log](evidence-read-scoped.log) · 1 | public read contract uses only standard headers plus the approved application frame leaf | PASS |
| [evidence-read-scoped.log](evidence-read-scoped.log) · 2 | adapter owns every canonical field, optional, list order, timeout, and exception semantic | PASS |
| [evidence-read-scoped.log](evidence-read-scoped.log) · 3 | compiled fake canonical provider rejects mapping, null, timeout, order, and lifecycle false PASS | PASS |
| [evidence-read-scoped.log](evidence-read-scoped.log) · 4 | transport read and lifecycle calls use their injected application ports | PASS |
| [evidence-roundtrip-green.log](evidence-roundtrip-green.log) · 1 | EV01 canonical application 왕복 같은 녹화 증거 | PASS |
| [evidence-roundtrip-green.log](evidence-roundtrip-green.log) · 2 | EV02 실제 rule 평가 왕복 증거 보존 | PASS |
| [evidence-roundtrip-green.log](evidence-roundtrip-green.log) · 3 | EV04 source 충돌 거부 | PASS |
| [evidence-roundtrip-green.log](evidence-roundtrip-green.log) · 4 | EV04 PTS 충돌 거부 | PASS |
| [evidence-roundtrip-green.log](evidence-roundtrip-green.log) · 5 | EV04 frame 충돌 거부 | PASS |
| [evidence-roundtrip-green.log](evidence-roundtrip-green.log) · 6 | EV04 증거 부재 발명 금지 | PASS |
| [evidence-roundtrip-green.log](evidence-roundtrip-green.log) · 7 | EV05 history snapshot null 보존 | PASS |
| [evidence-rule-boundary.log](evidence-rule-boundary.log) · 1 | historical approval is separate from actual execution: current branch mismatch | FAIL |
| [evidence-rule-boundary.log](evidence-rule-boundary.log) · 2 | slice order and completion frontier are fail-closed: unclassified production file: include/ingress/recording_application_service.h | FAIL |
| [evidence-rule-boundary.log](evidence-rule-boundary.log) · 3 | current graph hash and metrics are exact: unclassified production file: include/ingress/recording_application_service.h | FAIL |
| [evidence-rule-boundary.log](evidence-rule-boundary.log) · 4 | current graph negative mutations reject forbidden edge and cycle: unclassified production file: include/ingress/recording_application_service.h | FAIL |
| [evidence-rule-boundary.log](evidence-rule-boundary.log) · 5 | Slice 32 completion and current graph separation is fail-closed: unclassified production file: include/ingress/recording_application_service.h | FAIL |
| [evidence-rule-boundary.log](evidence-rule-boundary.log) · 6 | composition root extraction preserves lifecycle ownership: composition source missing lifecycle anchor: analysis::AnalysisSessionService analysis_sessions(session_manager); | FAIL |
| [evidence-rule-boundary.log](evidence-rule-boundary.log) · 7 | negative mutations reject false progress: unclassified production file: include/ingress/recording_application_service.h | FAIL |
| [evidence-rule-boundary.log](evidence-rule-boundary.log) · 8 | application header is standard-only, standalone, and has no repository dependency closure | PASS |
| [evidence-rule-boundary.log](evidence-rule-boundary.log) · 9 | application source owns canonical snapshot, opaque mapping, and keyed lifecycle | PASS |
| [evidence-rule-boundary.log](evidence-rule-boundary.log) · 10 | compiled fake canonical harness binds full mapping, null/exception semantics, and runtime identity | PASS |
| [evidence-rule-boundary.log](evidence-rule-boundary.log) · 11 | transport has zero canonical bypass and exact runtime/action lifecycle | PASS |
| [evidence-rule-boundary.log](evidence-rule-boundary.log) · 12 | CMake, server dispatch, and current graph bind exact Slice 29 successor — exact Event Rule graph successor drift | FAIL |
| [evidence-rule-boundary.log](evidence-rule-boundary.log) · 13 | current structure gate accepts exact non-final Event Rule successor — Command failed: /Users/dhseo/Workspace/mediaServer/server.sh verify-v390-review4-structure-stabilization-execution | FAIL |
| [evidence-rule-boundary.log](evidence-rule-boundary.log) · 14 | historical approval is separate from actual execution: current branch mismatch | FAIL |
| [evidence-rule-boundary.log](evidence-rule-boundary.log) · 15 | slice order and completion frontier are fail-closed: unclassified production file: include/ingress/recording_application_service.h | FAIL |
| [evidence-rule-boundary.log](evidence-rule-boundary.log) · 16 | current graph hash and metrics are exact: unclassified production file: include/ingress/recording_application_service.h | FAIL |
| [evidence-rule-boundary.log](evidence-rule-boundary.log) · 17 | current graph negative mutations reject forbidden edge and cycle: unclassified production file: include/ingress/recording_application_service.h | FAIL |
| [evidence-rule-boundary.log](evidence-rule-boundary.log) · 18 | Slice 32 completion and current graph separation is fail-closed: unclassified production file: include/ingress/recording_application_service.h | FAIL |
| [evidence-rule-boundary.log](evidence-rule-boundary.log) · 19 | composition root extraction preserves lifecycle ownership: composition source missing lifecycle anchor: analysis::AnalysisSessionService analysis_sessions(session_manager); | FAIL |
| [evidence-rule-boundary.log](evidence-rule-boundary.log) · 20 | negative mutations reject false progress: unclassified production file: include/ingress/recording_application_service.h | FAIL |
| [evidence-rule-scoped.log](evidence-rule-scoped.log) · 1 | application header is standard-only, standalone, and has no repository dependency closure | PASS |
| [evidence-rule-scoped.log](evidence-rule-scoped.log) · 2 | application source owns canonical snapshot, opaque mapping, and keyed lifecycle | PASS |
| [evidence-rule-scoped.log](evidence-rule-scoped.log) · 3 | compiled fake canonical harness binds full mapping, null/exception semantics, and runtime identity | PASS |
| [evidence-rule-scoped.log](evidence-rule-scoped.log) · 4 | transport has zero canonical bypass and exact runtime/action lifecycle | PASS |
| [evidence-script-inventory.log](evidence-script-inventory.log) · 1 | dispatch parser recognizes explicit bash and node interpreters | PASS |
| [evidence-script-inventory.log](evidence-script-inventory.log) · 2 | server.sh dispatch targets exist and are executable | PASS |
| [evidence-script-inventory.log](evidence-script-inventory.log) · 3 | documented server.sh commands resolve to dispatch table | PASS |
| [evidence-script-inventory.log](evidence-script-inventory.log) · 4 | tracked scripts are classified and referenced | PASS |
| [evidence-script-inventory.log](evidence-script-inventory.log) · 5 | project inventory delegates script file inventory to this verifier | PASS |
| [evidence-script-inventory.log](evidence-script-inventory.log) · 6 | project inventory maps verifier families without duplicating dispatch details | PASS |
| [evidence-script-inventory.log](evidence-script-inventory.log) · 7 | CMake does not define a separate untracked CTest registry | PASS |
| [evidence-script-inventory.log](evidence-script-inventory.log) · 8 | test entry scripts are reachable from test_all | PASS |
| [evidence-script-inventory.log](evidence-script-inventory.log) · 9 | auth verifier has no hardcoded test password defaults | PASS |
| [evidence-script-inventory.log](evidence-script-inventory.log) · 10 | VA EventRecord dispatch verifier fails early and dispatches every poll by default | PASS |
| [evidence-script-inventory.log](evidence-script-inventory.log) · 11 | critical verifier pass output avoids grouped feature-result wording | PASS |
| [evidence-script-inventory.log](evidence-script-inventory.log) · 12 | user-facing JS option parsers reject unknown options | PASS |
| [evidence-storage-boundary.log](evidence-storage-boundary.log) · 1 | application header is standard-only with exact DTO/default manifests | PASS |
| [evidence-storage-boundary.log](evidence-storage-boundary.log) · 2 | application source owns exact canonical mapping and overwrite semantics | PASS |
| [evidence-storage-boundary.log](evidence-storage-boundary.log) · 3 | transport has zero canonical bypass and exact projection/call ordering | PASS |
| [evidence-storage-boundary.log](evidence-storage-boundary.log) · 4 | recording link is durably admitted before the bounded storage queue can drop an event | PASS |
| [evidence-storage-boundary.log](evidence-storage-boundary.log) · 5 | event clip output remains fd-bound and measured before no-replace publication | PASS |
| [evidence-storage-boundary.log](evidence-storage-boundary.log) · 6 | compiled fake canonical matrix preserves all fields failure/null outputs and lifecycle order | PASS |
| [evidence-storage-boundary.log](evidence-storage-boundary.log) · 7 | S05 구성은 생산자 전에 bridge를 등록하고 의존성 종료 전에 drain한다 | PASS |


이전 중단 시점 문서 검사 이력: 메인 `./server.sh verify-docs-links` exit0(Markdown270개·로컬 링크8,093개·실패0), `git diff --check` exit0. 이번 재개 후 최종 문서 검사가 아니며 제품 통합 검증을 대체하지 않는다. 당시 인증·링크 정리 커밋2개는 로컬에 있었고 통합 초안은 미커밋이었다. 이번 미해결 통합 단계는 커밋·푸시하지 않았다.

독자: S11 준비 구현 검토자. lifecycle: 이번 2번 개발 증적. 정책은 AGENTS.md, 재사용 결정은 [reuse-decision.md](reuse-decision.md), 개별 사전등록은 중앙 기록의 S11-CI01~11이 기준이다. 이 문서는 최종 S11 PASS가 아니다.

## 현재 판정

내부 application 증거 전달 fix는 제품 빌드 및 focused15/0, read4/0·rule4/0·storage7/0·consumer22/0에 통과했고 실제 앱의 EventRecord 녹화 reference 연결 성공까지 확인했다. 그러나 후속 timeline HTTP 요청의 기존4초 상한에서 실패했다. 두 번째 실제 제품 기동·모든 출력 HTTP·현행 다섯 stage suite는 미실행이다. 메인이 이 별도 조회 경계를 회수하여 추가 실제 실행/timeout 확대/제품 수정을 중단했다. 전체 integration은 미완료이며 커밋·푸시 가능 상태가 아니다.

### 내부 증거 전달 보완 재개 사전 정의

현재 후속 순서는 아래와 같다. S11 준비 범위의 목록이며 릴리즈 전수 감사나 실행 승인이 아니다.

| 순서 | 우선순위 | 해야 할 일·이유 | 예상 검증·완료 기준 | 범위 근거 |
| --- | --- | --- | --- | --- |
| 1 | P0 | 타임라인 HTTP 지연 경계 계측. 내부 전달 누락과 별개인 지연 원인 확정 | 안전한 요청 종류·header/body elapsed와 서버 조회 경계 대조. 원인 없는 timeout 확대 금지, 제품 조회 수정 필요 시 범위 승인 | 마지막 실제 앱 실패; 진단 실행 범위 확인 필요 |
| 2 | P0 | 동일 실제 앱·복수 출력·두 번째 기동·현행 통합 연결 마무리 | 출력2개 전체 HTTP/hash, 기존 자료 유지·새 생산 구분,5단계 실제 suite 및 정리. runner 최종 freshness guard도 재검증 | S11-CI01~11; 현재 미해결 단계 |
| 3 | P0 | observer/longrun 관측기를 현행 시간·저장 계약에 연결 | 내구 순서·epoch·UTC unknown·현재 job/output 양성/음성 자체검사.120분 실행 아님 | 기존 준비3번 |
| 4 | P0 | UI seed와 action/상태 정의를 현행 계약에 맞춤 | managed seed·문자열/null·복수 출력·손상/삭제 상태 검증. 브라우저 실행 제외 유지 | 기존 준비5번 |
| 5 | P1 | 대체 검증 확인 후 구형 검증·데이터 정리 | 현재 필요한 검사와 역사 graph/default 실패를 분류, 필요한 대체 검사 누락 없음 확인 | 기존 준비6번·이번 역사 graph 실패 |
| 6 | P0 | 준비 종료 후 코드·유효 증거 고정 | 신규 파일 inventory 대조, 유지/무효 증거 및 최종 검증 범위 보고. 이후 승인된 최종 검증 | 기존 준비7번 |

아래는 이미 실행한 보완의 사전 정의와 결과다.

사용자 승인 후 메인이 EV01~06을 중앙에 등록했다. 이전 중단/실패는 보존하고 제품 내부 typed 전달만 보완한다. 초기 제안 EI01은 EV01, EI02는 EV02/03, EI03은 EV04, EI04는 EV05/06에 대응한다.

| ID | 실행 전 exact 검사 | 명령/예상 |
| --- | --- | --- |
| EV01 | 실제 FromCanonical→ToCanonical context/namespace/association/snapshot pointer 동일, source/PTS/frame 결박 | `bash scripts/internal/verify_recording_application_evidence.sh`; 최초 namespace/context 소실 RED |
| EV02 | application rule evaluation 왕복의 동일 snapshot 보존 | 같은 focused; 새 최신 snapshot 조회 없음 |
| EV03 | canonical/application 두 projection overload→실제 dispatch bridge spy 입력의 4증거 | 같은 focused; spy는 관측까지, 실제 bridge 승인 판정 아님 |
| EV04 | missing/history-null 및 source/PTS/frame 불일치에 증거 비움·failclosed | 같은 focused |
| EV05 | 4096 frame snapshot 복제 없는 shared const lifetime, DTO 소멸 후 release | 같은 focused·경량 DTO boundary |
| EV06 | 공개 serializer/metadata/Event POST 변화 없음, exact dependency-free 허용 필드 | focused 및 직접 application boundary verifier |

순서는 예상 RED→최소 fix→focused GREEN/영향 회귀→실패 실제 앱→현행 integration이다. 브라우저/soak/외부 호출은 제외다. 실제 실패 summary도 고정 기대2와 관측 수를 분리한다.

### 재개 구현·단기 checkpoint

`recording_evidence_application_mapping.h`는 네 증거와 source/PTS/frame 결박만 담는 shared const carrier를 정의한다. application header에는 `<memory>`와 opaque forward declaration만 추가했다. read 왕복, rule의 기존 왕복 경로, 두 storage projection 및 dispatch 재구성에 연결했으며 공개 serializer와 history snapshot reset은 변경하지 않았다. 제품 빌드는 `evidence-build.log`의 잘못된 인접 projection 편집 compile 실패 뒤, 실제 storage projection으로 정정한 `evidence-build-retry.log`에서 exit0이다.

| 실행 | 실제 결과 | 이력·범위 |
| --- | --- | --- |
| `env -i PATH="$PATH" HOME=/tmp TMPDIR=/tmp bash scripts/internal/verify_recording_application_evidence.sh` | 최초 exit1 0/1 → 최종 exit0 15/0 | [예상 RED](evidence-expected-red.log), [최종 focused](evidence-focused-final.log). 중간 rule callback 미구성 exit134는 fixture 준비 오류, spy의 비동기 덮어쓰기 14/1은 oracle race로 각각 보존 |
| `node scripts/internal/verify_v390_analysis_session_read_application_boundary.mjs --application-only` | exit0 4/0 | [원출력](evidence-read-scoped.log). 기존 전체 모드 2/4 실패는 구형 graph/constructor 및 carrier field oracle 준비 불일치. default 모드는 유지하고 마지막 historical graph2개만 scoped 제외 |
| `node scripts/internal/verify_v390_event_rule_application_boundary.mjs --application-only` | exit0 4/0 | [원출력](evidence-rule-scoped.log). 기존 전체 4/2는 historical graph만 실패, 동일하게 보존 |
| `node scripts/internal/verify_v390_event_storage_application_boundary.mjs --application-only` | exit0 7/0 | [원출력](evidence-storage-boundary.log). 기존 계약/컴파일/수명 검사 유지 |
| `bash scripts/internal/verify_recording_consumer_connection.sh` | exit0 22/0 | [원출력](evidence-consumer-connection.log). 실제 기존 bridge 참조 연결 회귀 |
| `node --test scripts/internal/recording_current_integration.test.mjs` | exit0 16/0 | [원출력](evidence-integration-unit.log). 기대2만 있고 각 기동 관측 수가 없으면 실패 |

표의 Node/bash 명령도 모두 동일 `env -i PATH="$PATH" HOME=/tmp TMPDIR=/tmp`로 실행했다. focused의 15행은 실제 원출력에 전수 보존하며 bridge spy는 dispatch 호출 스레드의 정확한 1회 입력만 포착한다. worker 후속 callback과 섞어 이전 observed를 재사용하지 않는다. snapshot4096 수명 검사는 pointer 동일성과 마지막 carrier 해제 후 weak_ptr 소멸을 확인한다. 실제 브라우저인 `verify-webrtc-va-metadata`는 실행하지 않았다. 실제 앱 재시도는 이 checkpoint 뒤 진행 중이며 통합 suite 완료를 아직 주장하지 않는다.

### 실제 앱 재시도·현재 회수 경계

동일 명령 `env -i PATH="$PATH" HOME=/tmp TMPDIR=/tmp node scripts/internal/verify_recording_current_app.mjs`의 두 재시도는 모두 exit1이다. 전체 integration stage는 아직 실행하지 않았다.

| 실행 | 실제 관측 | 결과·한계 |
| --- | --- | --- |
| [evidence-actual-retry.log](evidence-actual-retry.log) | 13,504ms, 실제 EventRecord reference 연결 PASS, event-lineage FAIL | accepted/no-job의 정확한 placeholder를 helper가 nonempty jobId 검사로 먼저 거부하는 준비 결함. 출력 관측 배열은 빈 값 |
| [evidence-placeholder-red.log](evidence-placeholder-red.log) → [evidence-placeholder-green.log](evidence-placeholder-green.log) | exact accepted-only 분류 RED0/1 → 전체 자체검사17/0 | wrong ref/kind/complete/실제 segment 모순은 hard fail 유지. 정상 unknown 대기를 완료로 승격하지 않음 |
| [evidence-actual-placeholder.log](evidence-actual-placeholder.log) | 26,531ms, actual reference PASS, 정확 accepted placeholder 실관측, HTTP timeout FAIL | kind=event/ref일치/job없음/not-created/segment없음/unknown/absent/not-playable. 기대2와 관측빈배열 분리. 두 번째 제품 기동 미실행 |

마지막 실패는 메인이 회수해 읽기 진단 중이다. 로그와 호출순서상 `complete-two-outputs` polling 내부 `GET /ops/api/recordings/timeline`의 하위 HTTP timeout이다. `response()`의 4초 signal은 fetch와 body 소비 양쪽에 걸려 있어 header 대기/본문 소비 중 어느 쪽인지는 미확인이다. until 자체 30초 소진은 별도 `complete-two-outputs-timeout` 문구이므로 이를 정상 polling timeout과 혼동하지 않는다. 제품 timeline은 `SnapshotTimelineV2` 뒤 `FinishTimelineV2`에서 각 대상 `ResolveMedia`를 수행하지만 현재 로그만으로 그 실행시간/잠금 원인을 단정하지 않는다. 상한 확대·제품 수정·추가 실제 재실행은 보류했다.

| 소유 경로 | 종류 | 삭제 전 bytes | 결과 |
| --- | --- | --- | --- |
| `/private/tmp/media-server-current-integration-lwLFau` | actual 재시도 앱/미디어/상태 root | 28,430,719 | PID57548 exit0, HTTP51397/RTSP51398 반환, UDP 닫힘, root 부재 |
| `/private/tmp/media-server-current-integration-285AtP` | placeholder 재시도 앱/미디어/상태 root | 42,739,351 | PID57768 exit0, HTTP51639/RTSP51640 반환, UDP 닫힘, root 부재 |

script inventory는 `./server.sh verify-script-inventory` exit0 12/0([원출력](evidence-script-inventory.log))이다. tracked-file 검사이므로 아직 untracked 신규 파일까지 검사됐다고 확대하지 않는다. 신규 focused runner/fixture는 본문과 중앙 정의에서 참조되며 stage 후 메인의 최종 inventory 대조 대상이다.

다음 문단과 아래 최초 실행 기록은 내부 전달 보완 전 이력이다. 현행 전용 실행 entry와 공개 DTO 페이지/출력 상관 helper, 종료 archive 복제본 관측 adapter를 구현했다. 당시 자체검사16개는 통과했으나 실제 앱 첫 실행은 EventRecord의 recordingLinkId 부재로 실패했다. 이 최초 실패는 후속 reference 성공으로 삭제하지 않는다.

실패 원인을 읽기로 확인했다. `/lab/analysis/taps/<id>/events?dispatch=1`은 `webrtc_http_server_runtime.cpp:4619`의 `ProjectEventStorageDispatchRequest`를 거친다. `webrtc_http_server_ops_incidents.cpp:606`은 source/profile/context/PTS만 전달하고, `event_storage_application_service.cpp:86`은 새 AnalysisResult에 이 필드만 복원한다. 녹화 `observation_context`, `observation_namespace`, `source_association`, `decoded_intervals`가 전달되지 않아 bridge의 빈 context 거부에 이른다. `event_recording_bridge.cpp:325`의 거부는 현재 안전 계약을 지킨 것이며, fixture가 정보 부재를 성공으로 처리해서는 안 된다. 제품 수정 금지 범위라 메인에 회수·판단 요청했다.

## 구현 파일과 경계

| 파일 | 내용 | 현재 한계 |
| --- | --- | --- |
| recording_current_integration_suite.mjs | API→auth→lifecycle→default composition→actual app 순차 실행, exact summary/cleanup·뒤 notRun | 실제 다섯 stage 실행은 미실행 |
| verify_v410_recording_foundation.sh | 명시 `--current-integration` 분기 | 기존 `--all` 및 integrationExecutionPass 의미 불변 |
| recording_current_app_helpers.mjs | total/unplacedTotal 전체 페이지, itemId 중복과 segment dedup 분리, literal 출력2개, 정밀 문자열, restart 비교 | 새 JS 원장 engine 아님 |
| recording_event_correlation.mjs | 기존 dispatchTuple/correlatedEvent 본문 그대로 공유 | legacy 음성 경로 유지 |
| verify_v410_recording_foundation.mjs | 위 두 함수를 import | legacy 원장/observer/longrun 로직 변경 없음 |
| verify_recording_current_app.mjs | 소유 입력 실제 앱·bounded 이벤트 JSONL·HTTP·정상 종료/2기동·복제관측 구성 | 첫 reference assertion에서 중지 |
| recording_current_archive_probe.cpp | 복제본 Catalog Open, typed reference/job/source 축·선택·2출력 확인 | 복제본 복구 쓰기 가능. live/원본 Catalog Open 없음. 정상 실제 archive 경로 아직 미실행 |
| build_recording_current_archive_probe.sh | 동일 runtime archive 링크·공유 header/실행 TU 신선도 검사 | 제품 빌드 변경 없음 |
| recording_current_integration.test.mjs / recording_current_archive_probe.test.mjs | 자체검사 및 실제 adapter compile·소유 원본/alias 거부 | 서버/네트워크 없는 검사 |

실제 앱은 소유 0700 root, 기존 H264 입력의 소유 복사, 고정 기존 YOLO model/labels 읽기를 사용한다. 환경 allowlist, loopback 소유 UDP STUN, 외부 TURN/POST 비활성, 180초 monotonic 작업 상한, root512MiB/4096 entries, eventJSONL4MiB/8192 완결행, HTTP64MiB 및 페이지4096개/64MiB 상한이다. 소유 UDP·프로세스/HTTP/RTSP 정리와 원본 archive 불변을 별도 판정한다. 제한 초과는 성공이 아니다.

## 실행 명령·실패 이력

| 제목 | 명령 / 결과 | 판정 |
| --- | --- | --- |
| CI01 최초 RED | `env -i PATH="$PATH" node --test scripts/internal/recording_current_integration.test.mjs`; exit1, 0/1,28.726ms. 호출목록 actual[] vs 고정5단계 | 예상 RED |
| CI01 GREEN | 같은 명령; exit0,1/0,28.054375ms | PASS |
| DTO 묶음 RED | 같은 명령; exit1,10/3,31.981875ms. page/output/restart not-implemented 정상 oracle3개 실패 | 예상 RED; 당시 throw 음성 검사는 독립 구현 증거 아님 |
| DTO GREEN | 같은 명령; exit0,13/0,35.839708ms | PASS |
| 상관 공유 후 | 같은 명령; exit0,14/0,36.526667ms | PASS |
| adapter 최초 | `env -i PATH="$PATH" node --test scripts/internal/recording_current_archive_probe.test.mjs`; exit0,1/0,1421.071875ms | [원출력](integration-adapter.log) |
| equal+padding RED | `env -i PATH="$PATH" node --test --test-name-pattern='점 이벤트' scripts/internal/recording_current_integration.test.mjs`; exit1,0/1,31.485042ms | [원출력](integration-point-red.log); 제품은 end==start+padding 허용 |
| 최종 자체 묶음 | `env -i PATH="$PATH" node --test scripts/internal/recording_current_integration.test.mjs scripts/internal/recording_current_archive_probe.test.mjs`; exit0,16/0,1254.102208ms | [원출력](integration-unit-green.log) |
| 기존 상관 영향 회귀 | `env -i PATH="$PATH" node scripts/internal/verify_v410_recording_foundation.mjs --event-selection-negative`; exit0,14/0 | 실제 서버 없음. 14행과 summary counts 확인; 도구 반환의 큰 legacy authRemainingCases 부분은 잘림 |
| 실제 앱 최초 | `env -i PATH="$PATH" HOME=/tmp TMPDIR=/tmp node scripts/internal/verify_recording_current_app.mjs`; exit1,2PASS/1FAIL,13576ms | [원출력](integration-actual-first.log), 예상 RED로 소급하지 않음 |

초기 자체검사 원출력은 도구 반환으로 확인했으며 파일 직접 capture는 adapter 이후부터다. 파일 없는 과거 출력을 추정 복원하지 않는다. 기존 상관의 잘린 큰 미실행 목록으로 완료를 주장하지 않는다.

## 자체검사 전수 16행

| 제목 | 테스트내용 | 결과 |
| --- | --- | --- |
| S11-CI11 adapter | 원본 선택·symlink·hardlink 거부, 원본 bytes/inode 불변 | PASS |
| S11-CI01 순서 | 현행 다섯 단계 고정 순서와 결과 | PASS |
| S11-CI04 상관 | 실제 tuple 정상, 이전ID/다른tap/source/rule/track/PTS/복수ID 거부 | PASS |
| S11-CI02 nonzero | 뒤 단계 notRun | PASS |
| S11-CI02 signal | 뒤 단계 notRun | PASS |
| S11-CI02 output-limit | 한도 실패 뒤 notRun | PASS |
| S11-CI02 summary-missing | 누락 거부 | PASS |
| S11-CI02 summary-duplicate | 중복 거부 | PASS |
| S11-CI02 cleanup-failed | root 부재 실패 거부 | PASS |
| S11-CI02 port-missing | HTTP/RTSP 미확인 거부 | PASS |
| S11-CI03 범위 | legacy 필드 불변, S11/UI/자원 PASS 분리 | PASS |
| S11-CI05 페이지 | 전체 페이지/unknown 별도 total, 동일file 다중mapping dedup | PASS |
| S11-CI05 페이지 오류 | 누락·중복item·truncated·상한 거부 | PASS |
| S11-CI05 출력 오류 | 첫파일만/partial/다른reference/job/비정밀 숫자 거부 | PASS |
| S11-CI06 restart | 기존ID/hash 보존, 새event/reference/job/output 비중복 | PASS |
| S11-CI05 점 이벤트 | equal+양수padding 허용, 역전/빈확장 거부 | PASS |

## 실제 최초 실행 전수

기존 `--event-selection-negative`의 14개 실제 결과도 다음과 같이 보존한다(모두 PASS). 이들은 새 actual 앱 성공을 대체하지 않는다.

| 제목 | 테스트내용(원출력 label) | 결과 |
| --- | --- | --- |
| AP11-01 | deterministic first response minimum track | PASS |
| AP11-02 | exact new dispatch tuple | PASS |
| AP11-03 | old ID newer update rejected | PASS |
| AP11-04 | unrelated tap response rejected | PASS |
| AP11-05 | unrelated durable rule rejected | PASS |
| AP11-06 | unrelated durable updateTime rejected | PASS |
| AP11-07 | unrelated durable track rejected | PASS |
| AP11-08 | unrelated durable source rejected | PASS |
| AP11-09 | same ID repeated rows accepted | PASS |
| AP11-10 | distinct matching IDs rejected | PASS |
| AP11-11 | base metadata exact time accepted | PASS |
| AP11-12 | base metadata wrong PTS rejected | PASS |
| AP11-13 | unknown metadata schema rejected | PASS |
| AP11-14 | absent metadata rejected | PASS |

| 제목 | 테스트내용 | 결과 |
| --- | --- | --- |
| S11-CI09 product1 | 정상 health·실제 소유 loopback ICE config | PASS |
| S11-CI07 run1 | 실제 dispatch와 EventRecord 상관 뒤 recordingLinkId 부재 | FAIL |
| S11-CI08 cleanup product1 | PID54514 정상exit0, HTTP50720/RTSP50721 반환 | PASS |

실패 summary의 `outputCount:2`는 코드의 고정 기대값이며 관측 성공 출력 수가 아니다. actualEventPass/restartPass=false다. 출력2개 생성·다운로드 성공으로 읽지 않는다.

## 재사용 실행/미실행 대조

| S11-CI10 대상 | 이번 실행 상태 | 남은 경계 |
| --- | --- | --- |
| managed HTTP API/auth/lifecycle | 미실행 | 신규 entry 실제 연결 실행 대기; 과거 D결과를 이번 실행으로 승격 안 함 |
| default composition | 미실행 | 과거46개와 신규 앱 흐름을 이어붙여 PASS 안 함 |
| accepted-only | 기존 HTTP API unplaced oracle, 이번 미실행 | actual 앱 accepted projection 전체의 공개 관측 없음 |
| partial/full | public_media_smoke.cpp D3A-02 기존 focused, 이번 미실행 | 이번 정상 목표는 literal2 complete |
| corrupt/metadata/hold | D3A-07 기존 focused, 이번 미실행 | 실제 앱 손상 주입 안 함 |
| 원본 삭제후 출력 | D3A-08 및 public_timeline D3B-09, 이번 미실행 | durable provenance와 출력의 구분 유지 |
| 실제 app restart | 미실행 | 첫 참조 경계 실패 뒤 건너뜀 |
| observer/longrun/UI seed/브라우저 | 범위 밖·미실행 | 후속 준비/별도 승인, 최종 S11 PASS 아님 |

## 정리

| 경로 | 종류 | 삭제 전 크기 | 조치/결과 |
| --- | --- | --- | --- |
| /private/tmp/media-server-current-integration-unit-ciZu4W | adapter compile/음성 | 4028902bytes | finally 제거·부재 |
| /private/tmp/media-server-current-integration-unit-Pk3FDU | 최종 adapter compile/음성 | 4028902bytes | finally 제거·부재 |
| /private/tmp/media-server-current-integration-FCq7O8 | 실제 앱 입력/상태/archive/cache | 44617344bytes | 제품exit0·2port확인·UDP종료 후 제거·부재 |

비밀/원문 source URL·raw EventRecord·서버 로그는 보존하지 않았다. 제품·테스트 커밋/푸시는 미수행, 메인 전담이다. token start/end/consumed는 신뢰할 전용 계측이 없어 미집계, elapsed는 위 Node/runner 반환값이다. 이 단계는 미완료이며 실패 해소 전 완료 커밋 대상으로 보고하지 않는다.

메인이 제품 projection 경계를 직접 대조하여 중단을 확정했다. 후속은 application result→event dispatch 내부 typed 증거 보존의 수정 설계·영향 범위 승인, 같은 focused 실제 앱 재검증, 현행 5stage 통합 순서다. 공개 API/schema 추가를 기본 해결책으로 제안하지 않으며 내부 경계의 읽기 검토가 먼저다. 추가 코드 수정·실제 재실행·통합 suite·커밋/푸시는 하지 않았다. 마지막 확인한 diffcheck는 exit0이며 이후 보고서만 추가했다.
