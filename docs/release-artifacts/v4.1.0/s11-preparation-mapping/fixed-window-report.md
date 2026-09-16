# 실패 구간 지정 재현 결과

독자: 녹화 개발·검증 담당자. lifecycle: historical 실행 증거. 정책 AGENTS.md, 중앙 기록 release-test-records.md에 종속한다.

기존 변경은 e0fc9687(진단·관측기록), b8298a6e(미실행 LP02 초안 보존)로 분할하여 origin/v4.1.0에 push 완료했다. LP02 준비 초안 보존은 완료/PASS 판정이 아니다. 이후 이번 LP04 변경은 미커밋이다.

## 지시 및 판정

후속 정정: 아래 '목표 원본 경계가 없어'는 전체 원본 부재의 증명이 아니다. runner는 최신 원본 하나만 비교했으므로 정확한 결론은 '관측 최신 종료점이 목표를 넘어서 중단'이다. 절대 PTS 일치는 제품 오류 발생의 필수조건으로 입증되지 않았다. 후속 LP05에서 관련 원본 전수 관측·실패 입력 독립재현으로 대체한다.

| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 기존 미커밋 분할 커밋 후 푸시 | 완료 | 두 커밋 push | Git 출력 |
| 2 | 재현 조건·검증기 보완 | 구현·자체검사 수행 | 제품/API/시계/timeout 무변경 | helper·runner diff |
| 3 | 실제 단기1회 | 조건 미충족으로 중단 | reproduction-boundary-missed | 원출력 |
| 4 | 실패 코드로 수정범위 판단 | 미완료 | 이벤트 dispatch 전 중단, 기존 오류 원인 미확정 | 원출력 |

`node --test` latency/http_diagnostics/state_diagnostics/integration: 최초 새3개 helper 부재 예상 RED(exit1,5pass/3fail), 구현 후31/31(exit0,42.145333ms).
`node scripts/internal/verify_recording_current_app.mjs --reproduce-failed-window`: exit1,20.386초. 실제1회만 실행. target end16500000000ns, dispatch16900000000ns. 관측 end8200000000→16666666666ns, 마지막 tap16633333333ns. 목표 원본 경계가 없어 이벤트 발생 전에 거부. 이전 제품 failed를 재현했다고 하지 않는다.

[원출력](fixed-window-output.txt). HTTP325행을 보존했다. token start/end/consumed는 집계 source 부재로 미집계. elapsed는 Node performance.now다. 제품 바이너리는 기존679273d8 코드, 검증기 기준은 b8298a6e + 이번 diff.

다음 제안: 실제 writer 시작/분할 시점과 fixture 입력 대응을 읽기 검토해 경계가 달라지는 원인을 먼저 확인하고, 결정적으로 재생 가능한 입력·분할 증거를 갖춘 재현 경로를 설계한다. 경계를 억지 수정하거나 반복 실행하지 않는다. 제품 실패 코드 수집, 누적16/32, 제품 수정, 장시간/UI는 미실행이다.

## 정리

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-integration-vc1uXF | 실행 소유 root | 32845008B | PID36582 exit0·HTTP50480/RTSP50481/UDP 반환 후 삭제 | rootAbsent=true | 원출력 cleanup |

## 개별 결과

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| LP04-A RED1 | 목표 이전 대기 helper 부재 | fail | 사전 정의 RED 후 GREEN |
| LP04-A RED2 | 놓친 경계 거부 helper 부재 | fail | 사전 정의 RED 후 GREEN |
| LP04-A RED3 | 정확 dispatch helper 부재 | fail | 사전 정의 RED 후 GREEN |
| 자체-1 | P0-DIAG01 정상 header/body 시간·안전 route 분류와 비밀 미노출 (0.664083ms) | pass | exit0 |
| 자체-2 | P0-DIAG02 header timeout 고정 진단과 실패 유지 (0.280959ms) | pass | exit0 |
| 자체-3 | P0-DIAG03 body timeout 부분 수신 측정·완료 거부 (0.132583ms) | pass | exit0 |
| 자체-4 | S11-CI01 현행 다섯 단계 순서·실제 child 결과 결박 (0.74925ms) | pass | exit0 |
| 자체-5 | S11-CI04 기존 실제 dispatch 상관 정상·오래된ID·다른조건·복수ID 거부 (0.194958ms) | pass | exit0 |
| 자체-6 | S11-CI02 nonzero 실패 후 나머지 미실행 (0.074375ms) | pass | exit0 |
| 자체-7 | S11-CI02 signal 실패 후 나머지 미실행 (0.058208ms) | pass | exit0 |
| 자체-8 | S11-CI02 output-limit 실패 후 나머지 미실행 (0.047833ms) | pass | exit0 |
| 자체-9 | S11-CI02 summary-missing 실패 후 나머지 미실행 (0.040542ms) | pass | exit0 |
| 자체-10 | S11-CI02 summary-duplicate 실패 후 나머지 미실행 (0.042792ms) | pass | exit0 |
| 자체-11 | S11-CI02 cleanup-failed 실패 후 나머지 미실행 (0.04325ms) | pass | exit0 |
| 자체-12 | S11-CI02 port-missing 실패 후 나머지 미실행 (0.049625ms) | pass | exit0 |
| 자체-13 | S11-CI03 legacy 완료 필드 없음·전체 S11/UI/자원 PASS 분리 (0.144834ms) | pass | exit0 |
| 자체-14 | S11-CI07 기대 출력 수만 있거나 한 기동 관측 누락이면 완료 거부 (0.684041ms) | pass | exit0 |
| 자체-15 | S11-CI05 페이지 전체·unplaced 별도 total·동일file mapping dedup (4.443458ms) | pass | exit0 |
| 자체-16 | S11-CI05 누락·중복item·불안정total·truncated·cap 거부 (0.171667ms) | pass | exit0 |
| 자체-17 | S11-CI05 첫출력/partial/다른reference/job/unsafe숫자 거부 (0.148291ms) | pass | exit0 |
| 자체-18 | S11-CI07 정확한 accepted placeholder만 미완료로 분류하고 lineage 모순은 거부 (0.1905ms) | pass | exit0 |
| 자체-19 | S11-CI06 기존ID/hash 보존과 새event/reference/job/output 분리 (0.143292ms) | pass | exit0 |
| 자체-20 | S11-CI05 점 이벤트 equal+padding 허용·역전/빈확장 거부 (0.070792ms) | pass | exit0 |
| 자체-21 | LP04-A 목표 이전은 대기하고 해당 구간만 선택 (0.322084ms) | pass | exit0 |
| 자체-22 | LP04-A 경계와 프레임을 놓치면 다른 구간으로 대체 금지 (0.151041ms) | pass | exit0 |
| 자체-23 | LP04-A 실제 dispatch 정확 일치만 허용 (0.06825ms) | pass | exit0 |
| 자체-24 | LP03-A failed는 완료 대기 대신 즉시 중단 (0.484916ms) | pass | exit0 |
| 자체-25 | P0-HTTP01 pending은 전이 완료가 아님 (0.05025ms) | pass | exit0 |
| 자체-26 | P0-HTTP01 partial은 지연 관측만 가능 (0.041417ms) | pass | exit0 |
| 자체-27 | P0-HTTP01 다른 참조와 모순 파일은 거부 (0.064292ms) | pass | exit0 |
| 자체-28 | P0-HTTP01 원래 완전 출력 검사는 부분 출력 거부 유지 (0.097958ms) | pass | exit0 |
| 자체-29 | P0-STATE01 complete1 count와 기존 two-output 거부 구분 (0.570584ms) | pass | exit0 |
| 자체-30 | P0-STATE02 pending partial complete2 변화와 8개 상한 (0.315416ms) | pass | exit0 |
| 자체-31 | P0-STATE03 raw ID/path/unknown enum/request 비밀 미노출 (0.053875ms) | pass | exit0 |
| LP04-B | 실제 구간 지정 실행 | fail | 경계 미충족; 기존 job실패와 다른 사유 |
| cleanup | 서버·포트·UDP·root | pass | 원출력 및 부재 직접 확인 |
| HTTP-1 | GET health; status=null; header/body/total=null/null/3ms | fail | 기동 중 재시도 |
| HTTP-2 | GET health; status=null; header/body/total=null/null/1ms | fail | 기동 중 재시도 |
| HTTP-3 | GET health; status=null; header/body/total=null/null/1ms | fail | 기동 중 재시도 |
| HTTP-4 | GET health; status=null; header/body/total=null/null/1ms | fail | 기동 중 재시도 |
| HTTP-5 | GET health; status=null; header/body/total=null/null/1ms | fail | 기동 중 재시도 |
| HTTP-6 | GET health; status=null; header/body/total=null/null/1ms | fail | 기동 중 재시도 |
| HTTP-7 | GET health; status=null; header/body/total=null/null/1ms | fail | 기동 중 재시도 |
| HTTP-8 | GET health; status=null; header/body/total=null/null/1ms | fail | 기동 중 재시도 |
| HTTP-9 | GET health; status=null; header/body/total=null/null/1ms | fail | 기동 중 재시도 |
| HTTP-10 | GET health; status=null; header/body/total=null/null/1ms | fail | 기동 중 재시도 |
| HTTP-11 | GET health; status=null; header/body/total=null/null/1ms | fail | 기동 중 재시도 |
| HTTP-12 | GET health; status=null; header/body/total=null/null/0ms | fail | 기동 중 재시도 |
| HTTP-13 | GET health; status=null; header/body/total=null/null/0ms | fail | 기동 중 재시도 |
| HTTP-14 | GET health; status=null; header/body/total=null/null/0ms | fail | 기동 중 재시도 |
| HTTP-15 | GET health; status=null; header/body/total=null/null/0ms | fail | 기동 중 재시도 |
| HTTP-16 | GET health; status=null; header/body/total=null/null/0ms | fail | 기동 중 재시도 |
| HTTP-17 | GET health; status=200; header/body/total=5/1/6ms | pass | 개별 응답만 판정 |
| HTTP-18 | GET ice; status=200; header/body/total=2/0/2ms | pass | 개별 응답만 판정 |
| HTTP-19 | POST source; status=201; header/body/total=103/0/103ms | pass | 개별 응답만 판정 |
| HTTP-20 | POST tap-create; status=200; header/body/total=55/0/55ms | pass | 개별 응답만 판정 |
| HTTP-21 | GET tap; status=200; header/body/total=23/0/23ms | pass | 개별 응답만 판정 |
| HTTP-22 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-23 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-24 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-25 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-26 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-27 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-28 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-29 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-30 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-31 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-32 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-33 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-34 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-35 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-36 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-37 | GET timeline; status=200; header/body/total=0/0/1ms | pass | 개별 응답만 판정 |
| HTTP-38 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-39 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-40 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-41 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-42 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-43 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-44 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-45 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-46 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-47 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-48 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-49 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-50 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-51 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-52 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-53 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-54 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-55 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-56 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-57 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-58 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-59 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-60 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-61 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-62 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-63 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-64 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-65 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-66 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-67 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-68 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-69 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-70 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-71 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-72 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-73 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-74 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-75 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-76 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-77 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-78 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-79 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-80 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-81 | GET timeline; status=200; header/body/total=0/0/1ms | pass | 개별 응답만 판정 |
| HTTP-82 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-83 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-84 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-85 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-86 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-87 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-88 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-89 | GET timeline; status=200; header/body/total=0/0/1ms | pass | 개별 응답만 판정 |
| HTTP-90 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-91 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-92 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-93 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-94 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-95 | GET timeline; status=200; header/body/total=0/0/1ms | pass | 개별 응답만 판정 |
| HTTP-96 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-97 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-98 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-99 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-100 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-101 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-102 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-103 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-104 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-105 | GET timeline; status=200; header/body/total=0/0/1ms | pass | 개별 응답만 판정 |
| HTTP-106 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-107 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-108 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-109 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-110 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-111 | GET timeline; status=200; header/body/total=0/0/1ms | pass | 개별 응답만 판정 |
| HTTP-112 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-113 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-114 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-115 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-116 | GET tap; status=200; header/body/total=2/0/2ms | pass | 개별 응답만 판정 |
| HTTP-117 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-118 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-119 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-120 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-121 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-122 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-123 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-124 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-125 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-126 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-127 | GET timeline; status=200; header/body/total=0/0/1ms | pass | 개별 응답만 판정 |
| HTTP-128 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-129 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-130 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-131 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-132 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-133 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-134 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-135 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-136 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-137 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-138 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-139 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-140 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-141 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-142 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-143 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-144 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-145 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-146 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-147 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-148 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-149 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-150 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-151 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-152 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-153 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-154 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-155 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-156 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-157 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-158 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-159 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-160 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-161 | GET timeline; status=200; header/body/total=0/0/1ms | pass | 개별 응답만 판정 |
| HTTP-162 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-163 | GET timeline; status=200; header/body/total=0/0/1ms | pass | 개별 응답만 판정 |
| HTTP-164 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-165 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-166 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-167 | GET timeline; status=200; header/body/total=0/0/1ms | pass | 개별 응답만 판정 |
| HTTP-168 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-169 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-170 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-171 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-172 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-173 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별 응답만 판정 |
| HTTP-174 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-175 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-176 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-177 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-178 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-179 | GET timeline; status=200; header/body/total=12/0/12ms | pass | 개별 응답만 판정 |
| HTTP-180 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-181 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-182 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-183 | GET timeline; status=200; header/body/total=10/0/10ms | pass | 개별 응답만 판정 |
| HTTP-184 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-185 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-186 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-187 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-188 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-189 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-190 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-191 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-192 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-193 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-194 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-195 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-196 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-197 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-198 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-199 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-200 | GET tap; status=200; header/body/total=4/0/4ms | pass | 개별 응답만 판정 |
| HTTP-201 | GET timeline; status=200; header/body/total=12/0/12ms | pass | 개별 응답만 판정 |
| HTTP-202 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-203 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-204 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-205 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-206 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-207 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-208 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-209 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-210 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-211 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-212 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-213 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-214 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-215 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-216 | GET tap; status=200; header/body/total=5/0/5ms | pass | 개별 응답만 판정 |
| HTTP-217 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-218 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-219 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-220 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-221 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-222 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-223 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-224 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-225 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-226 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-227 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-228 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-229 | GET timeline; status=200; header/body/total=10/0/11ms | pass | 개별 응답만 판정 |
| HTTP-230 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-231 | GET timeline; status=200; header/body/total=10/0/10ms | pass | 개별 응답만 판정 |
| HTTP-232 | GET tap; status=200; header/body/total=2/0/2ms | pass | 개별 응답만 판정 |
| HTTP-233 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-234 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-235 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-236 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-237 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-238 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-239 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-240 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-241 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-242 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-243 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-244 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-245 | GET timeline; status=200; header/body/total=10/0/10ms | pass | 개별 응답만 판정 |
| HTTP-246 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-247 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-248 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-249 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-250 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-251 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-252 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-253 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-254 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-255 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-256 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-257 | GET timeline; status=200; header/body/total=12/0/12ms | pass | 개별 응답만 판정 |
| HTTP-258 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-259 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-260 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-261 | GET timeline; status=200; header/body/total=10/0/10ms | pass | 개별 응답만 판정 |
| HTTP-262 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-263 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-264 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-265 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-266 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-267 | GET timeline; status=200; header/body/total=12/0/12ms | pass | 개별 응답만 판정 |
| HTTP-268 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-269 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-270 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-271 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-272 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-273 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-274 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-275 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-276 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-277 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-278 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-279 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-280 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-281 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-282 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-283 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-284 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-285 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-286 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-287 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-288 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-289 | GET timeline; status=200; header/body/total=11/0/12ms | pass | 개별 응답만 판정 |
| HTTP-290 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-291 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-292 | GET tap; status=200; header/body/total=5/0/5ms | pass | 개별 응답만 판정 |
| HTTP-293 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-294 | GET tap; status=200; header/body/total=4/0/4ms | pass | 개별 응답만 판정 |
| HTTP-295 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-296 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-297 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-298 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-299 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-300 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-301 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-302 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-303 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-304 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-305 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-306 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-307 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-308 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-309 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-310 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-311 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-312 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-313 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-314 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-315 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-316 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-317 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-318 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-319 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-320 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-321 | GET timeline; status=200; header/body/total=11/0/11ms | pass | 개별 응답만 판정 |
| HTTP-322 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별 응답만 판정 |
| HTTP-323 | GET timeline; status=200; header/body/total=22/0/22ms | pass | 개별 응답만 판정 |
| HTTP-324 | GET timeline; status=200; header/body/total=12/0/12ms | pass | 개별 응답만 판정 |
| HTTP-325 | DELETE tap; status=200; header/body/total=82/0/82ms | pass | 개별 응답만 판정 |
