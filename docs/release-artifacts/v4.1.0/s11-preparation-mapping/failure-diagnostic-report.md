# 실패 사유 제한 진단 — 2026-09-16

독자: 현재 녹화 개발·검증 담당자. lifecycle: 이번 실행의 historical evidence. 정책은 AGENTS.md, 중앙 기록은 release-test-records.md다.

## 결과

원인 미확정: 승인된 동일 앱 검사 1회에서 이전 failed가 재현되지 않았다. 제품 변경 없이 complete/partial 출력 1개. 지연 전이 검사만 PASS이며 완전 출력 2개·재기동·누적 catalog 완료가 아니다.

명령: `node scripts/internal/verify_recording_current_app.mjs --latency-only`; exit=0, elapsed=27202ms. 기존 제품 679273d8, 검증기만 수정. 실제 이벤트 시점은 이전16900ms와 달리8233ms다. 동일 검증 명령이지 동일 샘플 재현은 아니므로 이전 실패를 해결했다고 판정하지 않는다.

[보존 원출력](failure-diagnostic-output.txt): 도구 출력의 254개 HTTP 행을 순서대로 보존. 민감 URL·비밀번호·원문 서버 로그 없음. token start/end/consumed는 집계 source 부재로 미집계.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| LP03-A RED | node --test recording_current_latency.test.mjs; exit1; 4 pass/1 fail | fail | failed 입력이 예외를 발생시키지 않음; 사전 정의 예상 RED |
| LP03-A GREEN | latency/http_diagnostics/state_diagnostics/integration 4개 node --test; exit0; 28/28 | pass | failed 즉시 중단 보완 후, 아래 개별 테스트 결과 참조 |
| LP03-C | 실제 앱 1회 exit0; timeline150개 max2036ms; 출력1 partial | pass | 지연 검사만 통과; 과거 failed 원인 미확정 |
| cleanup | 서버 exit0, HTTP64831/RTSP64832/UDP 반환, rootAbsent=true | pass | 51,695,201bytes 임시 산출물 삭제 |

## 미실행 경계

LP03-B C++ 진단은 실제 실행 전 컴파일됐으나 failed가 없어 분기 미실행. whitelist 반환·복제본 회복·원본 불변의 실제 결과는 미확인이다. 16/32 누적, 제품 수정, 장시간/UI, 커밋·푸시 모두 미실행.

## 정리

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-integration-aI1syd | 이번 실행 소유 fixture/DB/영상/adapter | 51695201B | 프로세스·포트 반환 후 삭제 | rootAbsent=true | 원출력 cleanup |

## HTTP 개별 결과

관련 자체검사 명령: `node --test scripts/internal/recording_current_latency.test.mjs scripts/internal/recording_current_http_diagnostics.test.mjs scripts/internal/recording_current_state_diagnostics.test.mjs scripts/internal/recording_current_integration.test.mjs`; exit0, 28/28, 41.875584ms. 아래는 도구 출력의 개별 결과 전수 전사이며 원출력 파일은 별도 보존하지 않았다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 자체-1 | P0-DIAG01 정상 header/body 시간·안전 route 분류와 비밀 미노출 | pass | 이번 실행 |
| 자체-2 | P0-DIAG02 header timeout 고정 진단과 실패 유지 | pass | 이번 실행 |
| 자체-3 | P0-DIAG03 body timeout 부분 수신 측정·완료 거부 | pass | 이번 실행 |
| 자체-4 | S11-CI01 현행 다섯 단계 순서·실제 child 결과 결박 | pass | 이번 실행 |
| 자체-5 | S11-CI04 실제 dispatch 상관 정상·오래된ID·다른조건·복수ID 거부 | pass | 이번 실행 |
| 자체-6 | S11-CI02 nonzero 실패 뒤 미실행 | pass | 이번 실행 |
| 자체-7 | S11-CI02 signal 실패 뒤 미실행 | pass | 이번 실행 |
| 자체-8 | S11-CI02 output-limit 실패 뒤 미실행 | pass | 이번 실행 |
| 자체-9 | S11-CI02 summary-missing 실패 뒤 미실행 | pass | 이번 실행 |
| 자체-10 | S11-CI02 summary-duplicate 실패 뒤 미실행 | pass | 이번 실행 |
| 자체-11 | S11-CI02 cleanup-failed 실패 뒤 미실행 | pass | 이번 실행 |
| 자체-12 | S11-CI02 port-missing 실패 뒤 미실행 | pass | 이번 실행 |
| 자체-13 | S11-CI03 legacy 완료 필드 없음·전체 S11/UI/자원 PASS 분리 | pass | 이번 실행 |
| 자체-14 | S11-CI07 출력 수만 있거나 기동 관측 누락이면 완료 거부 | pass | 이번 실행 |
| 자체-15 | S11-CI05 전체 페이지·unplaced total·파일 dedup | pass | 이번 실행 |
| 자체-16 | S11-CI05 누락·중복·불안정 total·truncated·cap 거부 | pass | 이번 실행 |
| 자체-17 | S11-CI05 첫출력/partial/다른 reference/job/unsafe숫자 거부 | pass | 이번 실행 |
| 자체-18 | S11-CI07 accepted placeholder와 lineage 모순 구분 | pass | 이번 실행 |
| 자체-19 | S11-CI06 기존 ID/hash 보존·새 event/reference/job/output 분리 | pass | 이번 실행 |
| 자체-20 | S11-CI05 equal+padding 허용·역전/빈확장 거부 | pass | 이번 실행 |
| 자체-21 | LP03-A failed 즉시 중단 | pass | 최초 예상 RED 후 GREEN |
| 자체-22 | P0-HTTP01 pending 미완료 | pass | 이번 실행 |
| 자체-23 | P0-HTTP01 partial 지연 관측 | pass | 이번 실행 |
| 자체-24 | P0-HTTP01 다른 참조와 모순 파일 거부 | pass | 이번 실행 |
| 자체-25 | P0-HTTP01 원래 완전 출력 검사 partial 거부 | pass | 이번 실행 |
| 자체-26 | P0-STATE01 complete1 count와 two-output 거부 구분 | pass | 이번 실행 |
| 자체-27 | P0-STATE02 상태 변화와 8개 상한 | pass | 이번 실행 |
| 자체-28 | P0-STATE03 raw ID/path/unknown enum/request 비밀 미노출 | pass | 이번 실행 |

`git diff --check`, JS 구문 검사, 실행 root 부재 확인 exit0. 제품 빌드는 미실행(제품 무변경); adapter는 실제 명령 내부 빌드 성공.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| HTTP-1 | GET health; status=null; header/body/total=null/null/3ms; bytes=0 | fail | 기동 중 재시도; 회귀 판정 아님 |
| HTTP-2 | GET health; status=null; header/body/total=null/null/1ms; bytes=0 | fail | 기동 중 재시도; 회귀 판정 아님 |
| HTTP-3 | GET health; status=null; header/body/total=null/null/1ms; bytes=0 | fail | 기동 중 재시도; 회귀 판정 아님 |
| HTTP-4 | GET health; status=null; header/body/total=null/null/1ms; bytes=0 | fail | 기동 중 재시도; 회귀 판정 아님 |
| HTTP-5 | GET health; status=null; header/body/total=null/null/1ms; bytes=0 | fail | 기동 중 재시도; 회귀 판정 아님 |
| HTTP-6 | GET health; status=null; header/body/total=null/null/1ms; bytes=0 | fail | 기동 중 재시도; 회귀 판정 아님 |
| HTTP-7 | GET health; status=null; header/body/total=null/null/1ms; bytes=0 | fail | 기동 중 재시도; 회귀 판정 아님 |
| HTTP-8 | GET health; status=null; header/body/total=null/null/1ms; bytes=0 | fail | 기동 중 재시도; 회귀 판정 아님 |
| HTTP-9 | GET health; status=null; header/body/total=null/null/1ms; bytes=0 | fail | 기동 중 재시도; 회귀 판정 아님 |
| HTTP-10 | GET health; status=null; header/body/total=null/null/1ms; bytes=0 | fail | 기동 중 재시도; 회귀 판정 아님 |
| HTTP-11 | GET health; status=null; header/body/total=null/null/1ms; bytes=0 | fail | 기동 중 재시도; 회귀 판정 아님 |
| HTTP-12 | GET health; status=null; header/body/total=null/null/1ms; bytes=0 | fail | 기동 중 재시도; 회귀 판정 아님 |
| HTTP-13 | GET health; status=null; header/body/total=null/null/0ms; bytes=0 | fail | 기동 중 재시도; 회귀 판정 아님 |
| HTTP-14 | GET health; status=null; header/body/total=null/null/0ms; bytes=0 | fail | 기동 중 재시도; 회귀 판정 아님 |
| HTTP-15 | GET health; status=null; header/body/total=null/null/0ms; bytes=0 | fail | 기동 중 재시도; 회귀 판정 아님 |
| HTTP-16 | GET health; status=null; header/body/total=null/null/0ms; bytes=0 | fail | 기동 중 재시도; 회귀 판정 아님 |
| HTTP-17 | GET health; status=200; header/body/total=4/1/5ms; bytes=15 | pass | 해당 요청만 판정 |
| HTTP-18 | GET ice; status=200; header/body/total=2/0/2ms; bytes=222 | pass | 해당 요청만 판정 |
| HTTP-19 | POST source; status=201; header/body/total=80/0/80ms; bytes=428 | pass | 해당 요청만 판정 |
| HTTP-20 | POST tap-create; status=200; header/body/total=52/0/52ms; bytes=1187 | pass | 해당 요청만 판정 |
| HTTP-21 | GET tap; status=200; header/body/total=22/0/22ms; bytes=4030 | pass | 해당 요청만 판정 |
| HTTP-22 | GET tap; status=200; header/body/total=1/0/1ms; bytes=5970 | pass | 해당 요청만 판정 |
| HTTP-23 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-24 | GET tap; status=200; header/body/total=1/0/1ms; bytes=5974 | pass | 해당 요청만 판정 |
| HTTP-25 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-26 | GET tap; status=200; header/body/total=1/0/1ms; bytes=6150 | pass | 해당 요청만 판정 |
| HTTP-27 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-28 | GET tap; status=200; header/body/total=1/0/1ms; bytes=6280 | pass | 해당 요청만 판정 |
| HTTP-29 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-30 | GET tap; status=200; header/body/total=1/0/1ms; bytes=6405 | pass | 해당 요청만 판정 |
| HTTP-31 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-32 | GET tap; status=200; header/body/total=1/0/1ms; bytes=6410 | pass | 해당 요청만 판정 |
| HTTP-33 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-34 | GET tap; status=200; header/body/total=1/0/1ms; bytes=6550 | pass | 해당 요청만 판정 |
| HTTP-35 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-36 | GET tap; status=200; header/body/total=1/0/1ms; bytes=6679 | pass | 해당 요청만 판정 |
| HTTP-37 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-38 | GET tap; status=200; header/body/total=1/0/1ms; bytes=6815 | pass | 해당 요청만 판정 |
| HTTP-39 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-40 | GET tap; status=200; header/body/total=1/0/1ms; bytes=6952 | pass | 해당 요청만 판정 |
| HTTP-41 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-42 | GET tap; status=200; header/body/total=1/0/1ms; bytes=6942 | pass | 해당 요청만 판정 |
| HTTP-43 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-44 | GET tap; status=200; header/body/total=1/0/1ms; bytes=7091 | pass | 해당 요청만 판정 |
| HTTP-45 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-46 | GET tap; status=200; header/body/total=1/0/1ms; bytes=7225 | pass | 해당 요청만 판정 |
| HTTP-47 | GET timeline; status=200; header/body/total=0/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-48 | GET tap; status=200; header/body/total=1/0/1ms; bytes=7363 | pass | 해당 요청만 판정 |
| HTTP-49 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-50 | GET tap; status=200; header/body/total=6/0/6ms; bytes=7493 | pass | 해당 요청만 판정 |
| HTTP-51 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-52 | GET tap; status=200; header/body/total=1/0/1ms; bytes=7496 | pass | 해당 요청만 판정 |
| HTTP-53 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-54 | GET tap; status=200; header/body/total=1/0/1ms; bytes=7633 | pass | 해당 요청만 판정 |
| HTTP-55 | GET timeline; status=200; header/body/total=0/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-56 | GET tap; status=200; header/body/total=1/0/1ms; bytes=7764 | pass | 해당 요청만 판정 |
| HTTP-57 | GET timeline; status=200; header/body/total=0/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-58 | GET tap; status=200; header/body/total=1/0/1ms; bytes=7900 | pass | 해당 요청만 판정 |
| HTTP-59 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-60 | GET tap; status=200; header/body/total=1/0/1ms; bytes=7900 | pass | 해당 요청만 판정 |
| HTTP-61 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-62 | GET tap; status=200; header/body/total=1/0/1ms; bytes=8027 | pass | 해당 요청만 판정 |
| HTTP-63 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-64 | GET tap; status=200; header/body/total=1/0/1ms; bytes=8157 | pass | 해당 요청만 판정 |
| HTTP-65 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-66 | GET tap; status=200; header/body/total=1/0/1ms; bytes=8298 | pass | 해당 요청만 판정 |
| HTTP-67 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-68 | GET tap; status=200; header/body/total=1/0/1ms; bytes=8433 | pass | 해당 요청만 판정 |
| HTTP-69 | GET timeline; status=200; header/body/total=0/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-70 | GET tap; status=200; header/body/total=1/0/1ms; bytes=8435 | pass | 해당 요청만 판정 |
| HTTP-71 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-72 | GET tap; status=200; header/body/total=1/0/1ms; bytes=8568 | pass | 해당 요청만 판정 |
| HTTP-73 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-74 | GET tap; status=200; header/body/total=1/0/1ms; bytes=8706 | pass | 해당 요청만 판정 |
| HTTP-75 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-76 | GET tap; status=200; header/body/total=1/0/1ms; bytes=8840 | pass | 해당 요청만 판정 |
| HTTP-77 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-78 | GET tap; status=200; header/body/total=1/0/1ms; bytes=8966 | pass | 해당 요청만 판정 |
| HTTP-79 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-80 | GET tap; status=200; header/body/total=1/0/1ms; bytes=8972 | pass | 해당 요청만 판정 |
| HTTP-81 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-82 | GET tap; status=200; header/body/total=1/0/1ms; bytes=9110 | pass | 해당 요청만 판정 |
| HTTP-83 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-84 | GET tap; status=200; header/body/total=1/0/1ms; bytes=9247 | pass | 해당 요청만 판정 |
| HTTP-85 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-86 | GET tap; status=200; header/body/total=1/0/1ms; bytes=9384 | pass | 해당 요청만 판정 |
| HTTP-87 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-88 | GET tap; status=200; header/body/total=1/0/1ms; bytes=9516 | pass | 해당 요청만 판정 |
| HTTP-89 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-90 | GET tap; status=200; header/body/total=1/0/1ms; bytes=9516 | pass | 해당 요청만 판정 |
| HTTP-91 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-92 | GET tap; status=200; header/body/total=1/0/1ms; bytes=9648 | pass | 해당 요청만 판정 |
| HTTP-93 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-94 | GET tap; status=200; header/body/total=1/0/1ms; bytes=10193 | pass | 해당 요청만 판정 |
| HTTP-95 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-96 | GET tap; status=200; header/body/total=1/0/1ms; bytes=10379 | pass | 해당 요청만 판정 |
| HTTP-97 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-98 | GET tap; status=200; header/body/total=1/0/1ms; bytes=10385 | pass | 해당 요청만 판정 |
| HTTP-99 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-100 | GET tap; status=200; header/body/total=1/0/1ms; bytes=10561 | pass | 해당 요청만 판정 |
| HTTP-101 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-102 | GET tap; status=200; header/body/total=1/0/1ms; bytes=10746 | pass | 해당 요청만 판정 |
| HTTP-103 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-104 | GET tap; status=200; header/body/total=1/0/1ms; bytes=10818 | pass | 해당 요청만 판정 |
| HTTP-105 | GET timeline; status=200; header/body/total=0/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-106 | GET tap; status=200; header/body/total=1/0/1ms; bytes=10864 | pass | 해당 요청만 판정 |
| HTTP-107 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-108 | GET tap; status=200; header/body/total=1/0/1ms; bytes=10866 | pass | 해당 요청만 판정 |
| HTTP-109 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-110 | GET tap; status=200; header/body/total=1/0/1ms; bytes=10919 | pass | 해당 요청만 판정 |
| HTTP-111 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-112 | GET tap; status=200; header/body/total=1/0/1ms; bytes=10966 | pass | 해당 요청만 판정 |
| HTTP-113 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-114 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11015 | pass | 해당 요청만 판정 |
| HTTP-115 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-116 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11066 | pass | 해당 요청만 판정 |
| HTTP-117 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-118 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11066 | pass | 해당 요청만 판정 |
| HTTP-119 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-120 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11117 | pass | 해당 요청만 판정 |
| HTTP-121 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-122 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11150 | pass | 해당 요청만 판정 |
| HTTP-123 | GET timeline; status=200; header/body/total=0/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-124 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11195 | pass | 해당 요청만 판정 |
| HTTP-125 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-126 | GET tap; status=200; header/body/total=5/0/5ms; bytes=11240 | pass | 해당 요청만 판정 |
| HTTP-127 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-128 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11241 | pass | 해당 요청만 판정 |
| HTTP-129 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-130 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11297 | pass | 해당 요청만 판정 |
| HTTP-131 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-132 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11338 | pass | 해당 요청만 판정 |
| HTTP-133 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-134 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11385 | pass | 해당 요청만 판정 |
| HTTP-135 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-136 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11383 | pass | 해당 요청만 판정 |
| HTTP-137 | GET timeline; status=200; header/body/total=0/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-138 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11431 | pass | 해당 요청만 판정 |
| HTTP-139 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-140 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11476 | pass | 해당 요청만 판정 |
| HTTP-141 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-142 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11522 | pass | 해당 요청만 판정 |
| HTTP-143 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-144 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11561 | pass | 해당 요청만 판정 |
| HTTP-145 | GET timeline; status=200; header/body/total=0/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-146 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11562 | pass | 해당 요청만 판정 |
| HTTP-147 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-148 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11613 | pass | 해당 요청만 판정 |
| HTTP-149 | GET timeline; status=200; header/body/total=0/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-150 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11651 | pass | 해당 요청만 판정 |
| HTTP-151 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-152 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11695 | pass | 해당 요청만 판정 |
| HTTP-153 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-154 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11744 | pass | 해당 요청만 판정 |
| HTTP-155 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-156 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11742 | pass | 해당 요청만 판정 |
| HTTP-157 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-158 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11783 | pass | 해당 요청만 판정 |
| HTTP-159 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-160 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11837 | pass | 해당 요청만 판정 |
| HTTP-161 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-162 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11882 | pass | 해당 요청만 판정 |
| HTTP-163 | GET timeline; status=200; header/body/total=0/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-164 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11921 | pass | 해당 요청만 판정 |
| HTTP-165 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-166 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11922 | pass | 해당 요청만 판정 |
| HTTP-167 | GET timeline; status=200; header/body/total=0/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-168 | GET tap; status=200; header/body/total=1/0/1ms; bytes=11962 | pass | 해당 요청만 판정 |
| HTTP-169 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-170 | GET tap; status=200; header/body/total=1/0/1ms; bytes=12011 | pass | 해당 요청만 판정 |
| HTTP-171 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-172 | GET tap; status=200; header/body/total=1/0/1ms; bytes=12060 | pass | 해당 요청만 판정 |
| HTTP-173 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-174 | GET tap; status=200; header/body/total=1/0/1ms; bytes=12060 | pass | 해당 요청만 판정 |
| HTTP-175 | GET timeline; status=200; header/body/total=0/0/0ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-176 | GET tap; status=200; header/body/total=1/0/1ms; bytes=12054 | pass | 해당 요청만 판정 |
| HTTP-177 | GET timeline; status=200; header/body/total=1/0/1ms; bytes=82 | pass | 해당 요청만 판정 |
| HTTP-178 | GET tap; status=200; header/body/total=1/0/1ms; bytes=12062 | pass | 해당 요청만 판정 |
| HTTP-179 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=34030 | pass | 해당 요청만 판정 |
| HTTP-180 | PUT rule; status=200; header/body/total=2/0/2ms; bytes=520 | pass | 해당 요청만 판정 |
| HTTP-181 | GET tap-events; status=200; header/body/total=8/0/8ms; bytes=9911 | pass | 해당 요청만 판정 |
| HTTP-182 | PUT rule; status=200; header/body/total=2/0/2ms; bytes=521 | pass | 해당 요청만 판정 |
| HTTP-183 | GET timeline; status=200; header/body/total=10/0/11ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-184 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-185 | GET timeline; status=200; header/body/total=10/0/10ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-186 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-187 | GET timeline; status=200; header/body/total=10/0/10ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-188 | GET timeline; status=200; header/body/total=10/0/10ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-189 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-190 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-191 | GET timeline; status=200; header/body/total=12/0/12ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-192 | GET timeline; status=200; header/body/total=10/0/11ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-193 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-194 | GET timeline; status=200; header/body/total=10/0/10ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-195 | GET timeline; status=200; header/body/total=10/0/10ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-196 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-197 | GET timeline; status=200; header/body/total=10/0/10ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-198 | GET timeline; status=200; header/body/total=10/0/10ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-199 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-200 | GET timeline; status=200; header/body/total=10/0/11ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-201 | GET timeline; status=200; header/body/total=10/0/10ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-202 | GET timeline; status=200; header/body/total=10/0/10ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-203 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-204 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-205 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-206 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-207 | GET timeline; status=200; header/body/total=10/0/10ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-208 | GET timeline; status=200; header/body/total=10/0/10ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-209 | GET timeline; status=200; header/body/total=12/0/12ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-210 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-211 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-212 | GET timeline; status=200; header/body/total=10/0/11ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-213 | GET timeline; status=200; header/body/total=10/0/10ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-214 | GET timeline; status=200; header/body/total=10/0/10ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-215 | GET timeline; status=200; header/body/total=10/0/10ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-216 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=37262 | pass | 해당 요청만 판정 |
| HTTP-217 | GET timeline; status=200; header/body/total=133/0/133ms; bytes=37303 | pass | 해당 요청만 판정 |
| HTTP-218 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=37303 | pass | 해당 요청만 판정 |
| HTTP-219 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=37303 | pass | 해당 요청만 판정 |
| HTTP-220 | GET timeline; status=200; header/body/total=10/0/10ms; bytes=37303 | pass | 해당 요청만 판정 |
| HTTP-221 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=37303 | pass | 해당 요청만 판정 |
| HTTP-222 | GET timeline; status=200; header/body/total=10/0/10ms; bytes=37303 | pass | 해당 요청만 판정 |
| HTTP-223 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=37303 | pass | 해당 요청만 판정 |
| HTTP-224 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=37303 | pass | 해당 요청만 판정 |
| HTTP-225 | GET timeline; status=200; header/body/total=11/0/12ms; bytes=37303 | pass | 해당 요청만 판정 |
| HTTP-226 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=37303 | pass | 해당 요청만 판정 |
| HTTP-227 | GET timeline; status=200; header/body/total=10/0/10ms; bytes=37303 | pass | 해당 요청만 판정 |
| HTTP-228 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=37303 | pass | 해당 요청만 판정 |
| HTTP-229 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=37303 | pass | 해당 요청만 판정 |
| HTTP-230 | GET timeline; status=200; header/body/total=11/0/11ms; bytes=37303 | pass | 해당 요청만 판정 |
| HTTP-231 | GET timeline; status=200; header/body/total=886/0/886ms; bytes=120378 | pass | 해당 요청만 판정 |
| HTTP-232 | GET timeline; status=200; header/body/total=611/0/611ms; bytes=39096 | pass | 해당 요청만 판정 |
| HTTP-233 | GET timeline; status=200; header/body/total=126/0/126ms; bytes=133343 | pass | 해당 요청만 판정 |
| HTTP-234 | GET timeline; status=200; header/body/total=89/0/89ms; bytes=39096 | pass | 해당 요청만 판정 |
| HTTP-235 | GET timeline; status=200; header/body/total=91/0/91ms; bytes=133343 | pass | 해당 요청만 판정 |
| HTTP-236 | GET timeline; status=200; header/body/total=91/0/91ms; bytes=39096 | pass | 해당 요청만 판정 |
| HTTP-237 | GET timeline; status=200; header/body/total=91/0/92ms; bytes=133343 | pass | 해당 요청만 판정 |
| HTTP-238 | GET timeline; status=200; header/body/total=91/0/91ms; bytes=39096 | pass | 해당 요청만 판정 |
| HTTP-239 | GET timeline; status=200; header/body/total=89/0/90ms; bytes=133343 | pass | 해당 요청만 판정 |
| HTTP-240 | GET timeline; status=200; header/body/total=89/0/89ms; bytes=39096 | pass | 해당 요청만 판정 |
| HTTP-241 | GET timeline; status=200; header/body/total=96/0/96ms; bytes=133343 | pass | 해당 요청만 판정 |
| HTTP-242 | GET timeline; status=200; header/body/total=101/0/101ms; bytes=68813 | pass | 해당 요청만 판정 |
| HTTP-243 | GET timeline; status=200; header/body/total=102/0/102ms; bytes=134373 | pass | 해당 요청만 판정 |
| HTTP-244 | GET timeline; status=200; header/body/total=100/0/100ms; bytes=68813 | pass | 해당 요청만 판정 |
| HTTP-245 | GET timeline; status=200; header/body/total=2036/0/2036ms; bytes=144172 | pass | 해당 요청만 판정 |
| HTTP-246 | GET timeline; status=200; header/body/total=302/1/303ms; bytes=121825 | pass | 해당 요청만 판정 |
| HTTP-247 | GET timeline; status=200; header/body/total=174/0/174ms; bytes=70032 | pass | 해당 요청만 판정 |
| HTTP-248 | GET timeline; status=200; header/body/total=174/0/174ms; bytes=146234 | pass | 해당 요청만 판정 |
| HTTP-249 | GET timeline; status=200; header/body/total=173/0/174ms; bytes=121825 | pass | 해당 요청만 판정 |
| HTTP-250 | GET timeline; status=200; header/body/total=174/0/174ms; bytes=70032 | pass | 해당 요청만 판정 |
| HTTP-251 | GET timeline; status=200; header/body/total=176/0/176ms; bytes=146234 | pass | 해당 요청만 판정 |
| HTTP-252 | GET timeline; status=200; header/body/total=174/0/175ms; bytes=121825 | pass | 해당 요청만 판정 |
| HTTP-253 | GET timeline; status=200; header/body/total=542/0/543ms; bytes=70032 | pass | 해당 요청만 판정 |
| HTTP-254 | DELETE tap; status=200; header/body/total=9/0/9ms; bytes=26 | pass | 해당 요청만 판정 |
