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
결함이나 해결 완료로 단정하지 않는다. 재발 시에는 비밀 원문 없이 HTTP 상태 또는 전송
종류를 보존하므로 같은 포괄 전송 실패를 반복하지 않는다. 두 번째 assertion용 임시 상태
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

B12와 S11의 승인된 로컬 검증 범위는 완료다. 최종30분·UI432·녹화120분과 이 로컬
게이트를 결합해 v4.1.0 개발 브랜치의 로컬 release blocker는 해소됐다. 외부 서비스·
실기기는 사용자 지시에 따라 미실행·제외이며 PASS로 계산하지 않는다. PR·CI·main 병합·
서명 tag·GitHub Release·published 확인은 별도 승인 전 미실행이다. token start/end/
consumed는 하위 명령별 전용 집계가 없어 미집계다.
