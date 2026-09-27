# B12 S11 최종 로컬 게이트

- 독자: v4.1.0 릴리즈 검토자와 재감사 담당자
- 수명: v4.1.0 historical 실행 기록
- source-of-truth 관계: 정책은 `AGENTS.md`, 전수 결과는 `docs/release-test-records.md`를 따르며 이 문서는 B12 실행의 실패·재검증 근거를 보존한다.

## 범위와 제외

순서는 build → 현행 녹화 5단계 → auth bootstrap/users/routes → GStreamer 환경 →
기능·스크립트 inventory → 문서·버전·release evidence → close-out dry-run이다.
현재 diff가 RTSP/WebRTC codec·ICE 경로를 바꾸지 않아 기존 HW-03 증거는 재실행하지 않는다.
이미 통과한 30분·녹화 UI·녹화 120분도 다시 실행하지 않는다. 외부 서비스·실기기와
PR·병합·tag·GitHub Release는 사용자 제외 또는 미승인 범위다.

## 인증 사용자 검증의 실패·보완·재검증

| 제목 | 수행내용 | 결과(pass/fail) | 비고 |
| --- | --- | --- | --- |
| AUTH-B12-01 최초 실행 | `./server.sh verify-auth-users`; 사용자 생성 첫 POST 전까지 9개 통과 | fail | 포괄 `인증 HTTP transport 실패`만 남아 상태 분류 불가. 정상 종료·root 삭제 |
| AUTH-B12-02 안전 진단 RED | 가짜 curl HTTP400·connect 오류가 안전 분류를 남겨야 함 | fail | 17/18, 신규 assertion만 예상대로 실패 |
| AUTH-B12-03 안전 진단 GREEN | 원문 URL/token을 버리고 `http-NNN` 또는 allowlist 전송 종류만 기록 | pass | 자체검사 18/18, 비밀 marker 미노출 |
| AUTH-B12-04 두 번째 실제 실행 | 사용자 생성·reset 뒤 비밀번호 변경 POST까지 진행 | fail | 첫 실패는 미재현. 실제 상태를 잃는 `expect_eq` 경계에서 중단, 정상 종료·root 삭제 |
| AUTH-B12-05 임시 상태 경계 진단 | 비밀번호 변경 POST의 3자리 상태만 기록하는 한정 진단 | pass | 19/19. 이후 승인된 UI-004 readback 본문 hash를 바꾸는 과도한 영구 변경으로 판정해 원형 복원 |
| AUTH-B12-06 최종 실제 실행 | 동일 `verify-auth-users` | pass | 72/72, 비밀번호 생성·scope·reset·history·invite·access request, 정상 종료·root 삭제 |

최초 두 실패는 서로 다른 경계였고 최종 실행에서는 모두 재현되지 않았다. 따라서 제품
결함이나 해결 완료로 단정하지 않는다. 전송 오류는 비밀 원문 없이 HTTP 상태 또는 전송
종류를 보존하지만, 두 번째 assertion용 임시 상태 진단 제거 뒤에는 상태 유실이 다시
가능했다. 아래 B13에서 공통 helper에 한정 진단을 추가해 이 공백을 보완했다. 당시 임시 상태
진단은 최종 PASS 뒤 제거해 UI-004 승인 readback 결속을 유지했다. timeout·제품 인증
정책·API·payload는 변경하지 않았다.

## 원출력과 무결성

| 파일 | SHA-256 | 크기 | 내용 |
| --- | --- | ---: | --- |
| `b12-auth-users-attempt1.log.gz` | `1217610891136d651364a9748947fd2e1cd7228512699efba6a741fbf694cb6e` | 499B | 최초 전송 포괄 실패 |
| `b12-auth-users-attempt2.log.gz` | `396a5a4d93f0ebb60049c67b798957ba5225a9f5ef04ec90fd7f2756e6f26181` | 688B | 비밀번호 변경 assertion 실패 |
| `b12-auth-users-pass.log.gz` | `4383ef9c18aebaefe8e48e77438055bb239da8408f5189ebe6acfc6c61602add` | 1,403B | 최종 72/72 PASS |

원문에는 비밀번호·token·응답 body가 없다. 실행 소유 auth root는 세 실행 모두 삭제되어
부재하며 HTTP/RTSP 포트도 종료됐다. `/private/tmp` 원출력은 이관 무결성 확인 뒤 정리한다.

## UI-004 inventory 결속 복원

첫 `verify-project-inventory`는 986행을 모두 검사했으나 최상위 17/18로 실패했다. 직접
대조 결과 제품·UI source는 바뀌지 않았고, 임시 상태 진단이 UI-004의 승인된 readback
함수 `verify_password_change_lifecycle` 본문 hash만 바꿨다. 일회 진단을 위해 독립 승인
원장을 갱신하지 않고 해당 호출과 자체검사를 제거해 승인된 함수 본문을 그대로 복원했다.

복원 뒤 인증 준비 자체검사 18/18과 `verify-project-inventory` 18/18·featureRows986이
통과했다. 이는 inventory 정합 PASS이며 UI 실행 PASS를 새로 주장하지 않는다.

| 파일 | SHA-256 | 크기 | 내용 |
| --- | --- | ---: | --- |
| `b12-project-inventory-first.log.gz` | `dd4f5cce2453b0977aa437700e520d71ffa120928ab05c318f3003401a542d8c` | 16,638B | UI-004 readback trust drift 1건·17/18 |
| `b12-project-inventory-pass.log.gz` | `ec6a6f9e72fc1e7dd4e09e42fec5e447632437987f99e9a484f2b0db6dd6436f` | 16,573B | 원형 복원 뒤 최종 재검증 18/18·986행 |

## 현행 녹화 5단계 판정

샌드박스 첫 실행은 로컬 listen 권한 거부로 제품 기동 전에 실패했고 실행 root·포트를
정리했다. 동일 코드·상한을 권한 조정 환경에서 한 번 재실행해 35+40+10+46+27=158개
검사와 두 기동을 통과했다. 두 기동 모두 EventRecord와 같은 reference/job의 완전 출력
2개를 HTTP 200·파일 SHA-256으로 확인했고, 재기동 뒤 기존 출력 보존과 새 event/reference/
job/output 분리도 통과했다.

최종 JSON의 `terminalObservations[].fullOutputPass=false`는 실패가 아니다. 독립 terminal
관측기가 전체 페이지 적격 PASS를 대신하지 못하도록 `createTerminalObservation.status()`가
항상 false로 내보내는 안전 필드다. 실제 완전성은 전체 페이지의 `eventOutputs()`가 두 행
모두 `complete/finalized/playable`임을 검사하고 `requireCompletionEvidence()`가 독립
terminal 관측과 함께 결속했다. `latencyPass=false`와 `boundaryDiagnosticPass=false`도
각각 별도 실행 모드 전용 기본값이다. 이번 모드의 직접 합격 필드는 `failed=0`,
`actualEventPass=true`, `restartPass=true`, `observedOutputCounts=[2,2]`, cleanup PASS다.
wrapper의 `fullFoundationPass/resourceTrendPass/uiFulltestPass=false`도 현행 단기 통합을
30분·120분·UI 전체 PASS로 확대하지 않는 고정 경계이며, 각 영역의 별도 최종 증거를
대체하지 않는다.

## 최종 로컬 게이트 결과

| 제목 | 수행내용 | 결과(pass/fail) | 비고 |
| --- | --- | --- | --- |
| B12-G01 build | `./server.sh build` | pass | runtime·server 100%, exit 0 |
| B12-G02 현행 녹화 통합 | `verify-v410-recording-foundation --current-integration` | pass | 첫 샌드박스 listen 권한 실패 보존, 권한 조정 동일 검사 158개·두 기동·출력 2+2·정리 PASS |
| B12-G03 auth bootstrap | `verify-auth-bootstrap` | pass | 19/19, 실행 소유 root·포트 정리 |
| B12-G04 auth users | `verify-auth-users` | pass | 최종 72/72, 위 최초 두 실패 이력 보존 |
| B12-G05 auth routes | `verify-auth-routes` | pass | 146/146, 실행 소유 root·포트 정리 |
| B12-G06 GStreamer 환경 | `verify-gst-environment` | pass | 20/20, 실행별 temp root 제거 |
| B12-G07 project inventory | `verify-project-inventory` | pass | 승인 readback 복원 뒤 18/18·featureRows986 |
| B12-G08 feature coverage | `verify-feature-inventory-coverage` | pass | 8/8·986/986·missing0 |
| B12-G09 script inventory | `verify-script-inventory` | pass | 12/12 |
| B12-G10 v4.1 entry | `verify-v410-entry-baseline` | pass | 33/33 |
| B12-G11 release evidence | `verify-release-evidence-index` | pass | 8/8 |
| B12-G12 release metadata | `verify-release-metadata` | pass | 18/18, published는 외부 미확인 |
| B12-G13 주석 정책 | `verify-code-comments` | pass | 1,258파일·누락0·영문-only0 |
| B12-G14 문서 링크 | `verify-docs-links` | pass | markdown373·로컬 링크14,688·실패0 |
| B12-G15 UI 문서 자산 | `verify-docs-ui-assets` | pass | 10/10 |
| B12-G16 close-out | `verify-release-closeout-helper --dry-run` | pass | 첫 증거 커밋 뒤 clean 재실행 6/6·gitStatusLines0, tag·push·Release 미수행 |
| B12-G17 diff | `git diff --check` | pass | exit 0 |

## 추가 원출력과 무결성

| 파일 | SHA-256 | 크기 | 내용 |
| --- | --- | ---: | --- |
| `b12-build.log.gz` | `821fe22883416e79ebc99f392622d5cd7a0342343960f77b5fe43f1c2aa04c89` | 243B | 최종 build |
| `b12-recording-integration-sandbox-fail.log.gz` | `4c2bec19df6ec2a0c09c2f21dd1a44079ac3058d2e9d499ba31fd9497edf4038` | 863B | 제품 기동 전 로컬 listen 권한 실패·정리 |
| `b12-recording-integration-pass.log.gz` | `c9bc2e8406bbe511f464687805a07cbe221bb699a1a5a4b60690f64a56eeab56` | 32,295B | 동일 통합 158개·두 기동 PASS |
| `b12-auth-bootstrap.log.gz` | `e5cacddaaafb500ea8e8735c2a8e16e9dfb67a1907c3b1d7e2bc24005f8ec0b8` | 645B | auth bootstrap 19/19 |
| `b12-auth-routes.log.gz` | `19749eb7929e4af97f31c4a28edb8e96f6e3b0a9b2ce916021c92c4107616c17` | 2,163B | auth routes 146/146 |
| `b12-gst-environment.log.gz` | `39219e9686259db8d78c449b34a3650f4352ca10ed220eefcc0169276ccc6c54` | 834B | GStreamer 환경 20/20 |
| `b12-code-comments.log.gz` | `f77e56f911362f61bd73b0bc1167a284a0633bc92504049158aa9296a1b7c5b9` | 138B | 주석 정책 |
| `b12-feature-coverage.log.gz` | `e3169a2ac4d7fc02a247ac0a8470bd66606f2d2001d24e276f1ae91fea2183b3` | 401B | 기능 coverage |
| `b12-script-inventory.log.gz` | `bc2ce9e650d4248f6374e44b5ac5b94ff6906b6b30e5ea0badac0f1cb3004a1b` | 506B | 스크립트 inventory |
| `b12-entry-baseline.log.gz` | `b46c4bc98e2327904cce176986fdcc10afd3aca4448859d200a49345706ab237` | 394B | v4.1 entry |
| `b12-release-evidence-index.log.gz` | `cd0ba398a5624e98106e271579823606c045ab9ffe4580bbb10d8d08a601d30e` | 330B | release evidence index |
| `b12-release-metadata.log.gz` | `e8539f82c6e06449320fcaab0b7cad0d28e8e4e96ae77ddeb6730df3c92333a6` | 559B | release metadata |
| `b12-docs-links.log.gz` | `c9c1ec257c2526b25a61ef3168d6a7e1615e2460d4088d11f81532d867612345` | 187B | 문서 링크 |
| `b12-docs-ui-assets.log.gz` | `aa1db1202c66c2479d145f23e5f31f7b2b6f54cee118461890b6fbeb0aa5672d` | 364B | UI 문서 자산 |
| `b12-closeout.log.gz` | `b7bc6e3fe5a4e2718547d57a76fa22a21c627383eb80f8715491394f1f28ec07` | 335B | 첫 증거 커밋 뒤 clean close-out dry-run |

현행 통합이 생성한 latency 증거 2개와 process 종료 증거 2개도
`../s11-preparation-mapping/`에 보존한다. 각각의 SHA-256은 latency
`b9f7c239…26ff6`, `bbf6a6d0…673cb`, process `a37b8528…a4e21`,
`06c54340…ae6d`이며 raw media·자격증명은 포함하지 않는다.

## 정리와 최종 판정

현행 통합 root, auth root, GStreamer temp root는 모두 삭제됐다. 최종 확인에서
8080/8081/8554/8555 LISTEN과 `media-server-current-integration-*`,
`media-server-auth-*`, `media-server-gst-environment-*` 잔여 경로가 없다.
압축 이관 전 `/private/tmp` 로그는 최종 무결성 확인 뒤 삭제한다.

B12의 승인된 제품 로컬 검증 범위는 완료다. 최종30분·UI432·녹화120분과 이 로컬
게이트는 제품 검증 증거이며, 공개 준비 검사까지 모두 끝났다는 기존 표현은 B13에서
정정한다. dry-run은 공개 저장소·배포 실제 검사를 실행하지 않는다. 외부 서비스·
실기기는 사용자 지시에 따라 미실행·제외이며 PASS로 계산하지 않는다. PR·CI·main 병합·
서명 tag·GitHub Release·published 확인은 별도 승인 전 미실행이다. close-out 원출력의
`push: not performed`는 dry-run 자체가 push하지 않았다는 뜻이며, 승인된 `v4.1.0` 개발
branch push는 최종 clean 확인 뒤 별도로 수행했다. token start/end/consumed는 하위
명령별 전용 집계가 없어 미집계다.

## B13 재감사 후 마감

2026-09-28 사용자 승인으로 인증 진단, 최종 코드 증거 연결, 문서 정합, 공개 준비 검사를
순서대로 보완한다. 위 B12의 실행 PASS는 보존하되 `로컬 release blocker 해소`를 공개 준비
검사까지 완료했다는 뜻으로 사용하지 않는다. 최초 인증 두 실패의 원인은 여전히 미확정이다.
제품 인증 정책·API·timeout·비밀번호 수명은 변경하지 않는다. 공통 `expect_eq`의 한정된
실패 진단만 보완하고 승인된 `verify_password_change_lifecycle` 본문은 그대로 유지한다.

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일·행·기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 인증 집중·영향 안정화 | 진행 대상 | 진단 실패의 상태 누락 | AUTH-P10/P11·공통 expect_eq | 사용자 1번 개발 승인 |
| 증거·문서·공개 로컬 검사 | 진행 대상 | 최종 diff 연결과 현재 문서 불일치, 공개 gate 미실행 | B13-E02/D03/P04 | 사용자 2~4번 승인 |
| 30분·실제 UI·120분 재실행 | 조건부 진행 | 증거 대조로 기존 증거가 성립하지 않는 경계가 확인될 때만 필요성 재판정 | AGENTS 7.6.2 | 이번 자동 실행 제외 |
| 외부 서비스·실기기 | 미진행 | 사용자 명시 제외 | 현행 release 정책 | 제외 |
| PR·CI·병합·tag·Release | 미진행 | 이번은 개발 브랜치 푸시까지만 승인 | AGENTS 4·5 | 별도 승인 전 미실행 |

현재는 사전등록 상태다. 단계별 실제 exit·원출력·전수 결과·cleanup을 아래에 기록한다.
token start/end/consumed는 실행별 집계 도구가 없어 미집계이며 elapsed는 실제 실행에서 기록한다.

### B13 1번 인증 진단 완료

공통 `expect_eq`의 실패 분기에 고정 검사명·expected=302인 경우만 허용했다. 상태는
3자리 숫자 또는 `invalid`로 기록하며 임의 label·본문·비밀번호는 출력하지 않는다.
성공 출력·비교·실패 exit와 제품 코드는 불변이다. 메인이 diff와 실제 원출력을 직접 검토했다.
`verify_password_change_lifecycle`과 `fail`은 HEAD와 바이트 동일하다. 함수 시작부터 닫는
중괄호까지 SHA-256은 각각 `e99abc9ba9afbe39040ae46bfe165873b0b9189d82509ca9b4140d099286bb5b`,
`529d8aa687adb1346163f50d5f0dec517c5645fbd7fd55e4ec225091792abc7c`다.
AUTH-P10/P11 준비 행은 기존 기능 parser 대상이 아니며 기존 986행 및 승인 items SHA
`5e9263ee47dce850e383df69c74b6fb845d8d8524779f6530cc64b7efb729575`는 불변이다.
manifest 전체 재생성 없이 inventory 문서 SHA만 직접 대조 후 갱신했다.

| 제목 | 수행내용 | 결과(pass/fail) | 비고 |
| --- | --- | --- | --- |
| AUTH-P10/P11 예상 RED | `env -i PATH="$PATH" node --test scripts/internal/recording_auth_preparation.test.mjs`; exit1, 18/20 | fail | 신규 진단 2개만 실패; 1,509.707ms |
| AUTH-P10/P11 GREEN | 동일 명령; exit0, 20/20 | pass | 최종 1,638.770ms; 빈값·비밀 label·다른 expected 포함 |
| AUTH-P11 본문·승인 의미 | 두 함수 바이트·기능986행·승인 items 대조 | pass | 진단이 승인 readback 본문을 다시 바꾸지 않음 |
| AUTH-P11 inventory | `./server.sh verify-project-inventory`; exit0, 최상위18/18·featureRows986 | pass | 내부 출력5,081행 별도 전수 보존 |
| AUTH-P11 실제 users | `MEDIA_SERVER_VERIFY_AUTH_VISUAL=0 ./server.sh verify-auth-users`; exit0, 72/72 | pass | 새 임시값·격리 계정/포트, 종료·root1,968KiB 제거 |
| AUTH-P11 문법·공백 | `bash -n scripts/internal/verify_auth_workflow.sh`, `git diff --check`; exit0 | pass | 제품 빌드·실제 UI 재실행 아님 |

[자체검사 원출력 8묶음](b13-auth-unit-outputs.json.gz), [실제 users](b13-auth-users.log.gz),
[inventory](b13-inventory.log.gz), [개별 전수 결과표](b13-auth-items.md.gz)를 보존한다.
작업공간·사용자 임시 절대경로만 치환했고 비밀 원문은 없다. 자체검사 압축 SHA는
`5cc9bf02f308d93010d5c77a101ccbbfaa4151edfd786c2fd0695c9a59714c7d`, users는
`4be8026d0cf2bd00a9fe3efc3905acde7e7a3e04a228badfa76712bfb22a4487`, inventory는
`86e155f7aee99bd27c7df3677fa3afcd5b635b1e6fb3bfbea5fc5069a21a1459`다.
최초 RED 래퍼는 셸 예약 변수 사용으로 exit 수집이 실패했다. 원출력을 남기고 예약 변수를
제거한 동일 RED를 실행했으며 환경 실패를 제품 실패/예상 RED로 승격하지 않았다.
메인의 초기 manifest 전문 대조도 도구 출력 버퍼에서 중단돼, 내용을 바꾸지 않고 Git blob
동일성 비교로 확인했다. 실제 users/inventory의 총 elapsed는 별도 래퍼 계측 부재로 미집계다.
과거 AUTH-B12-01/04의 원인은 소급 확정하지 않는다. 이번 결과는 진단 공백 해소와 현행
회귀 PASS이며 과거 실패의 제품 원인 해결을 뜻하지 않는다.

진단 원출력 정리: 아래 소유 UID·일반 디렉터리·stdout/stderr 두 파일만 있는 것을 확인하고
원본 SHA와 압축본 내 원본 SHA를 대조한 뒤 삭제·부재를 확인했다. 압축 증거로 복구 가능하다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| /private/tmp/media-server-b13-auth-red.FhYbmo | 자체검사 원출력 | 4754B | SHA 대조 후 삭제 | 부재 | b13-auth-unit-outputs.json.gz 보존 |
| /private/tmp/media-server-b13-auth-red.cJbsOf | 자체검사 원출력 | 4747B | SHA 대조 후 삭제 | 부재 | b13-auth-unit-outputs.json.gz 보존 |
| /private/tmp/media-server-b13-auth-green.ChYPW2 | 자체검사 원출력 | 2409B | SHA 대조 후 삭제 | 부재 | b13-auth-unit-outputs.json.gz 보존 |
| /private/tmp/media-server-b13-auth-bashn.E7FlQd | 자체검사 원출력 | 0B | SHA 대조 후 삭제 | 부재 | b13-auth-unit-outputs.json.gz 보존 |
| /private/tmp/media-server-b13-auth-diffcheck.QP7agL | 자체검사 원출력 | 0B | SHA 대조 후 삭제 | 부재 | b13-auth-unit-outputs.json.gz 보존 |
| /private/tmp/media-server-b13-auth-green-final.63wHgm | 자체검사 원출력 | 2411B | SHA 대조 후 삭제 | 부재 | b13-auth-unit-outputs.json.gz 보존 |
| /private/tmp/media-server-b13-auth-bashn-final.bsv4M0 | 자체검사 원출력 | 0B | SHA 대조 후 삭제 | 부재 | b13-auth-unit-outputs.json.gz 보존 |
| /private/tmp/media-server-b13-auth-diffcheck-final.s9RDHS | 자체검사 원출력 | 0B | SHA 대조 후 삭제 | 부재 | b13-auth-unit-outputs.json.gz 보존 |

후속 문서 링크·자산·주석 검사는 모두 exit0(각 190.453ms·46.714ms·240.707ms)이다.
개별 결과표는 총5,233행(자체검사4회80행·inventory 내부5,081행·실제users72행)이다.
실패 상세의 반복 출력은 같은 검사를 중복 집계하지 않았다. 표 SHA-256은
`45b2c348a544807adbdd79581a5b4aabc2d26749c006eb7e3b251be4b178d127`이다.
[정적 검사 원출력](b13-stage1-gates.json.gz)을 보존한다. 메인 실행의 로그 전용 임시 경로는
2~4번 기록 이관까지 같은 작업에서 사용하며 서버·비밀 저장소는 남아 있지 않다.

### B13 2번 최종 소스와 증거 연결

제품의 마지막 변경은 `c4735579`이며 `c4735579..dae8f3ae`의 `src/`·`include/` diff는 없다.
UI 실행 source는 `0c14c340`, 최종30분은 `f9c80d1e`의 writer 보완 뒤 실행됐고,
녹화120분 10차와 B12 통합은 뒤의 두 제품 변경도 포함한다. 이 차이를 숨기고 모든 실행이
동일 HEAD였다고 표현하지 않는다. 아래 대조는 기존 증거 유지 판정이며 새 실행 PASS가 아니다.

| 변경 | 실제 경로·의미 | 후속 직접 증거 | 기존 영역 판정 |
| --- | --- | --- | --- |
| `f9c80d1e` | `recording_journal.cpp`·generation active의 큰 행 가역 저장/읽기. 논리 envelope·ID·DTO·미디어 바이트 불변 | append222·active4·cold4·checkpoint143·consumer268·observer33·계약135, build, 최종30분 및 120분10차 | 기존 녹화 UI 유지. 압축 표현 자체는 이후 focused·30분·120분으로 대조 |
| `aab14160` | `ResolveMediaWithContext`에서 권위 있는 삭제 ID를 먼저 거부. 기존 비삭제 재생·hold·파일 검사는 동일 | [8차 후속](b11-recording-120-attempt8.md)의 삭제/fallback/ID 거부 소비자·동일 자료 media 판정·실제앱73, 120분10차와 B12 통합 | I30 재생·탐색 및 I31 삭제/손상 UI의 응답 의미 유지. 30분의 공통 VA/Event POST/idle 반복도 불변 |
| `c4735579` | identity chain 공용 검증 결과에 archive descriptor 추가. Extension 호출은 검증 관측기에 한정, checkpoint 결과도 descriptor를 유지 | [9차 후속](b11-recording-120-attempt9.md)의 full/extension 동등성·손상·checkpoint/consumer, 120분10차·B12 통합 | UI DTO·media·권한 불변. 제품 소유 결과의 영향은 focused와 최종 장시간이 확인 |
| `679291af` | 임시 HTTP assertion을 원래 `expect_eq`로 복원. 비교는 동일한 `actual != expected` | 당시72 PASS는 복원 전 실행임을 정정. B13에서 복원된 본문+공통 진단 상태의 실제72 PASS·inventory18 PASS | UI-004 본문 바이트 유지, 최종 실제 회귀로 실행 순서 공백도 해소 |
| `dae8f3ae` | 공통 실패 진단만 한정 추가, 제품/API·성공 판정·승인 검사 본문 불변 | AUTH-P10/P11의20 PASS·실제users72·986행/승인 items 불변 | 공통 UI424와 녹화31 action의 정상·시각 증거 유지. 인증 제품을 수정한 것으로 확대하지 않음 |

공통 UI의 exact ID424 및 I27~I34의8 ID/31 action, 시각/역할/viewport는 기존 그대로다.
I27 필터/페이지·I28 우선순위·I29 원본 전환·I32 용량/활성/blocked·I33 이동·I34 권한/시각은
후속 diff에서 구현/표출 계약이 바뀌지 않았다. I30/I31은 위 삭제 조회 대조로 보강했다.
공통120분은 공통 미디어·분석·런타임 구성요소에 한정해 기존80회409 PASS를 유지하며
변경된 녹화 저장·삭제·복구의 장시간 증거는 녹화120분10차를 사용한다.

[기계 대조 영수증](b13-evidence-audit.json): 녹화 UI 압축본의 선언95 artifact를 모두
stream으로 읽어 SHA/크기를 대조했고31/0/0·브라우저 종료를 확인했다. B12 압축 로그20개도
SHA/크기 일치, 최종30분109/0·20회와 녹화120분10,093/0·종료/포트 원출력을 확인했다.
현재 보완은 UI/30분/120분 전체를 새로 실행할 근거가 아니며 기존 증거를 유지한다.
자원 gate는120분/해당 입력의 상한 준수까지만 인정하고 양의 RSS 기울기를 숨기지 않는다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| B13-E02 source | 마지막 제품 commit 이후 src/include 변경0, 후속3커밋의 호출·응답·저장 의미 대조 | pass |
| B13-E02 UI | 선언95 artifact hash/size·31 action·0 fail/notRun·browserClosed 대조 | pass |
| B13-E02 장시간 | 기존30분20회109 PASS와120분10,093 PASS·실제duration·정리 대조 | pass |
| B13-E02 B12 | 압축 로그20개 SHA·크기 일치 | pass |
| B13-E02 문서 | `./server.sh verify-docs-links`, `git diff --check`; exit0 | pass |

영수증의 대조 elapsed는15,958.171ms이며 기존 artifact를 메모리에서만 읽어 복구 임시
미디어·서버·포트를 만들지 않았다. token은 별도 집계 부재로 미집계다.

### B13 3번 문서 정합 완료

backlog의 UI/120분 미완료·versioning의 S00/live-only 설명을 현재 녹화 구현/제품 검증
상태와 맞췄다. source-only 배포와 제품 녹화 기능을 분리했고, source tag는 생성 목표라고
명시했다. roadmap·색인·전수표의 포괄적인 blocker0 표현을 공개 준비 검사와 분리했다.
v3.9.0 runner 설명은 당시 이력으로 한정했다. B12의 users72는 진단 복원 전, inventory18은
복원 후라는 실제 순서로 정정했으며 B13 users72를 과거 실행으로 소급하지 않았다.

| 제목 | 수행내용 | 결과(pass/fail) | 비고 |
| --- | --- | --- | --- |
| B13-D03 최초 metadata | `./server.sh verify-release-metadata`; exit1, 16/18 | fail | source tag/과거 source-only·live-only 식별 문구2개 누락. 뒤 명령 보류 |
| B13-D03 metadata 재검증 | 같은 명령; exit0, 18/18 | pass | 두 문구를 현재 사실·과거 이력으로 정확히 구분해 보존; 검증기/판정 수정 없음 |
| B13-D03 entry | `./server.sh verify-v410-entry-baseline`; exit0, 33/33 | pass | 소스·published·제외 범위 구분 |
| B13-D03 evidence | `./server.sh verify-release-evidence-index`; exit0, 8/8 | pass | 실행/미실행 경계 |
| B13-D03 reconciliation | `./server.sh verify-post-release-reconciliation`; exit0 | pass | 실행/판정 어휘 검사이며 실제 published 확인 아님 |
| B13-D03 링크·자산 | `./server.sh verify-docs-links`, `verify-docs-ui-assets`; exit0 | pass | 자산10/10·링크 오류0, 실제 새 UI 실행 아님 |

[2·3번 원출력·개별 결과](b13-document-gates.json.gz)에 최초 실패와 각 명령 elapsed를
보존했다. 문서 검사 외 새 서버·미디어·포트는 만들지 않았다. token은 별도 집계 부재로
미집계다. 이제 4번 공개 준비 실제 검사가 남으며 이를 위 단기 gate로 대체하지 않는다.
