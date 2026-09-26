# S11 최종 30분·UI·장시간 증거 결속

독자: v4.1.0 검증·릴리즈 담당자. 수명: S11 최종 실행과 공개 판정까지.
정책 source-of-truth는 `AGENTS.md`, 실행 전 기능·UI 정의는 중앙 테스트 기록과
`docs/manual-ui-checklist.md`다. 이 문서는 실제 실행 결과와 미실행을 구분한다.

## 실행 범위와 증거 영향

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일·기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화·30분 | 진행 대상 | 사용자 1번 지시·S11 필수 gate | `verify-predev --soak-minutes 30`, B09-F01 | 승인·실행 |
| UI baseline 424 | 실행 완료·PASS | 과거 424/424는 source `8fa98a99`에 결속; 현재 source `5aed4af1`에서 전수 재실행 | `./test_ui.sh`, [개별 결과](ui-baseline-items.md) | 승인·424개 적격 및 cleanup PASS; 녹화 8 ID는 별도 |
| 녹화 UI 8 ID·31 action·시각 교차 | 진행 대상 | 현재 릴리즈 432 ID의 신규 영역; 기존 I30 재생은 범위 한정 PASS와 전체 적격을 구분 | `docs/manual-ui-result-template.md`의 I27~I34 | 승인; 현재 소스에서 실행 필요 |
| 공통 120분 | 증거 범위 판정 | 과거 80회·409 PASS는 이전 바이너리; RTSP/WebRTC 경로 불변과 녹화 저장 변경을 구분 | `common-120-pass.md`, B08-R/C/Q | 현재 소스의 전체 PASS 자동 승계 금지 |
| 녹화 전용 120분·자원 | 진행 대상 | 사용자 2번 지시·저장/삭제/복구 직접 변경·과거 세 차례 FAIL | `verify-v410-recording-longrun --duration-minutes 120` | 승인; 1번 통과 뒤 실행 |
| 외부 서비스·실기기 | 미진행 | 사용자 명시 제외 | AGENTS 7.6 | 제외, PASS 아님 |

이전 UI 424/424·시각80은 실제 실행 이력으로 보존한다. 그러나 현재 소스의
`/ops/events` 녹화 초기 선택 로직과 저장·재생 조회 경계가 바뀌었으므로
이를 현재 432개 전체 적격으로 소급 승격하지 않는다. RTSP/WebRTC decoder·ICE
경로의 기존 codec67/ICE8 단기 증거는 해당 경계에 한정해 유지한다.

## 30분 실행과 최초 실패

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 첫 실행: 서버 시작 | 같은 30분 명령의 `server-start-queue-256` | fail | 로컬 RTSP bind `Operation not permitted`; soak 미진입·제품 실패 미판정. 3 pass/1 fail, 나머지 건너뜀. 원문 서버 로그에는 source URL이 있어 저장소에 보존하지 않음 |
| 권한 조정 후 통합 smoke | 로컬 소켓 권한의 같은 명령, `integrated-smoke` | fail | 71개 파일의 상단 용도 주석 누락·영어 전용 주석 1개. 4 pass/1 fail, soak 미진입. [실패 요약](predev-30-comment-fail-summary.json), [정적 실패 원출력](predev-30-comment-fail.log.gz) |
| 한정 수정·집중 검증 | 71개 파일의 한글 용도 주석과 영어 주석 1개 번역, `verify-code-comments` | pass | 1,253파일·누락0·영어전용0; 변경은 주석뿐, 제품 로직·합격 기준 불변 |
| 최종 30분 | `./server.sh verify-predev --soak-minutes 30 --fail-fast --heartbeat-interval 60` | pass | exit0, 2,437초·실제 반복20회, 109 pass/0 fail/0 notRun. 외부 TURN 1건 skip은 제외 범위. [전수 109행](predev-30-items.md)·[구조화 요약](predev-30-summary.json)·[보고](predev-30-report.md)·[원출력](predev-30.log.gz) |
| 종료·정리 | 정상 종료 원장의 서버 2개 PID와 TCP 8081/8555 | pass | 양 PID aliveAfter=false, LISTEN 없음, ports-clean. [민감 서버 로그 제외 개별 로그](predev-30-steps.tar.gz) 278파일 |

최종 요약 SHA-256은 `7fa011bd59a8933ff2f0db7251b85932b0807dce48ca57d9a340918ce2662371`,
로그 묶음은 `a70f0e8fa1c2f7b5e85b0fda19ab64d8a28d2fe0984538d180b19f8ae1c4ba4b`다.
압축 원출력은 복원 후 임시 원본과 byte 비교했고, 민감할 수 있는 `server.log`는
묶음에서 제외했다. 요약의 110 step 중 109개 실행 PASS와 외부 TURN skip 1개를
분리했다. 최종 실행 당시 제품 소스는 `3bf07716`, 작업 트리의 추가 수정은 주석뿐이다.
token start/end/consumed는 전용 집계가 없어 미집계이며 source는 로컬 명령의
원출력·구조화 요약이다.

## 임시 산출물 정리

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| `/tmp/media_server_predev-1790382503-53822` | 첫 권한 실패 실행 로그 | 24 KiB | 실패 원인·포트 확인 후 정확한 root 삭제 | 부재 | 첫 실행 로그·직접 stat |
| `/tmp/media_server_predev-1790382557-54079` | 주석 gate 실패 로그 | 44 KiB | 안전한 요약·정적 로그 이관 후 삭제 | 부재 | 위 실패 보존물·직접 stat |
| `/tmp/media_server_predev-1790383000-55400` | 최종 30분 개별 로그 | 1,064 KiB | `server.log` 제외 278파일 압축·대조 후 삭제 | 부재 | SHA·archive 목록·직접 stat |
| 실행 소유 `.media_server` 2개 및 `.media_server.test` 2개 | 격리 상태·통합 상세 자료 | 각각 64/64 KiB·20/104 KiB | 당시 생성·소유권·포트 확인 뒤 정확한 root만 정리 | 부재 | 사전 Git clean, 소유 UID·inode·종료 원장 |
| `/private/tmp/media-server-s11-final-ZiYEMh` | 보고서·캡처 임시 경로 | 220 KiB | 필요한 결과 이관·byte 대조 후 정확한 root 삭제 | 부재 | 저장소 보존물·직접 `test ! -e` |

## 실제 브라우저 공통 UI 424개

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 공통 424개 exact | `./test_ui.sh`의 실제 Playwright 브라우저 action 424개 | pass | exit 0, selected/attempted/pass 424/424/424, fail/notRun/unsupported/runnerAbort 0. [개별 424행](ui-baseline-items.md) |
| Policy v4 적격 | 실제 DOM·action·완료 oracle·시각 교차·출처·redaction | pass | policyEligible/Qualified 및 uiFulltestPass true, manualIntervention=false, failedInteraction=0, unapproved console 0, final integrity PASS |
| 서버·임시 자원 | PID 86985 종료, 포트 53967/53968 해제·재바인딩, 격리 fixture 삭제 | pass | 실행 summary cleanup PASS; 브라우저 증거 원본은 아래 압축 보존 |

실행 source는 `5aed4af1`, 제품 바이너리 SHA-256은
`6c2149d468bb7f86cb29f1d683eec6cb21c7f2b383e0c4619fe4f35db2a6aabc`다.
[전체 424개 상세 증거](ui-baseline-full.tar.xz)는 4,564파일·원본 약 343 MiB를
압축한 약 16 MiB 자료이며 SHA-256은
`90c9f628de5776770f4c3c7dfc74976270f3e830839f2ef0101d816835d8c28c`다.
archive 자체 검사와 저장소 사본 hash 대조를 통과했다. [실행 로그](ui-baseline.log.gz)와
원출력의 최종 summary도 압축본 안에 있다. 메인은 320 dark와 1180 dark 대표 화면을
직접 확인했고 전체 visual/action 적격은 Policy v4 독립 판정에 근거한다.

이 PASS는 기존 공통 424개에 한한다. 녹화 I27~I34 8개 ID·31개 세부 action의
현재 실행은 아직 완료되지 않았으므로 v4.1.0 전체 432개 UI PASS가 아니다.
녹화 전용 120분·자원 검사는 1번 UI 완료 뒤 실행한다. PR·병합·태그·Release는 이번
개발·푸시 승인에 포함되지 않는다.
