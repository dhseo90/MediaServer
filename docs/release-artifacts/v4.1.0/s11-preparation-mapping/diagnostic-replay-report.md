# 보완 진단·독립 재현 기록

최종 문서검사: `git diff --check` exit0, `./server.sh verify-docs-links` exit0(282md/8655links/22images/110anchors,fail0). 실제root 부재도 별도 확인했다. 제품 전체빌드·UI/장시간·누적catalog·릴리즈 외부변경은미실행이다. 단기재현 준비와 실제 실패미재현을 분리해보고한다.

독자: 녹화 개발·검증 담당자. lifecycle: 이번 실행 historical evidence. 정책 AGENTS.md, 중앙 기록 release-test-records.md를 따른다.

## 범위와 상태
최종: 전체1~5 미완료. 실제1회 failed 미재현으로 실제실패입력 확보·독립재현·제품수정은 미수행이다. 준비검사를 제품완료로 판정하지 않는다. src/include 변경 없음. 푸시는5단계완료조건 미충족으로 미수행한다.

실제 명령 `node scripts/internal/verify_recording_current_app.mjs --latency-only`: exit0,31.709초,193timeline최대3590ms,partial1출력. actualEventPass/restartPass=false. 실제trigger 원본end8333333333ns/event8633333333ns. [원출력296HTTP](diagnostic-actual-output.txt).
실제 overlap은 ID dedup이 있던 수정전 helper이므로 '모든원본 관측' 증거는 무효다. timeline_projection.cpp:95~97 mapping별분할 반례(0!=2 예상RED) 후 slice별dedup·segmentCount·viewBasis로보완했다. 실제앱 재실행은안했으며 HTTP와partial관측은이결함의영향밖이다.

환경격리재검증11/11 PASS(exit0,7009.710291ms). synthetic failed 정상자료는 verifiedOutput=true/sameFailure=false로 실제제품실패재현과구분한다. [전수11개·cleanup](archive-probe-test-isolated-env.txt). 최초 mode부재RED와 plugin경고FAIL은 archive-replay-test-red.txt/green.txt에보존, focused보완후GREEN은green2.txt다. 이전실행의공유cache위치는미확인,공유cache삭제안함.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| LP05-06 RED | mode부재 status1 vs0 | fail | 예상RED |
| LP05-06 초기GREEN | plugin경고 stderr 출력 | fail | 출력범위·환경격리후수정 |
| LP05-06 GREEN | 정상자료를같은실패로오인하지않음 | pass | focused+환경격리후11개전수 |
| LP05-04 slice RED | 동일원본 mapping별중첩 | fail | 0!=2→최종helperGREEN |
| LP05-05 actual | HTTP/partial관측 | pass | 실제실패원인확정아님 |

## 정리

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-archive-probe-tests-irW1ve | 환경격리testroot | 18181668B | 삭제 | removed=true | isolated-env 원출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-integration-qROJ8g | 실제app fixture/DB/영상/cache | 53530030B | PID38900 exit0·HTTP51460/RTSP51461/UDP반환후삭제 | rootAbsent=true | actual 원출력 |

## 최종 helper33개

앞선4파일 node --test 명령과동일. exit0,33/33,47.076375ms. [원출력](diagnostic-helper-final-output.txt).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 최종helper-1 | P0-DIAG01 정상 header/body 시간·안전 route 분류와 비밀 미노출 (1.286792ms) | pass | 최종실행 |
| 최종helper-2 | P0-DIAG02 header timeout 고정 진단과 실패 유지 (0.329541ms) | pass | 최종실행 |
| 최종helper-3 | P0-DIAG03 body timeout 부분 수신 측정·완료 거부 (0.156292ms) | pass | 최종실행 |
| 최종helper-4 | S11-CI01 현행 다섯 단계 순서·실제 child 결과 결박 (1.254625ms) | pass | 최종실행 |
| 최종helper-5 | S11-CI04 기존 실제 dispatch 상관 정상·오래된ID·다른조건·복수ID 거부 (0.2025ms) | pass | 최종실행 |
| 최종helper-6 | S11-CI02 nonzero 실패 후 나머지 미실행 (0.074209ms) | pass | 최종실행 |
| 최종helper-7 | S11-CI02 signal 실패 후 나머지 미실행 (0.053792ms) | pass | 최종실행 |
| 최종helper-8 | S11-CI02 output-limit 실패 후 나머지 미실행 (0.053417ms) | pass | 최종실행 |
| 최종helper-9 | S11-CI02 summary-missing 실패 후 나머지 미실행 (0.052ms) | pass | 최종실행 |
| 최종helper-10 | S11-CI02 summary-duplicate 실패 후 나머지 미실행 (0.041375ms) | pass | 최종실행 |
| 최종helper-11 | S11-CI02 cleanup-failed 실패 후 나머지 미실행 (0.041333ms) | pass | 최종실행 |
| 최종helper-12 | S11-CI02 port-missing 실패 후 나머지 미실행 (0.044709ms) | pass | 최종실행 |
| 최종helper-13 | S11-CI03 legacy 완료 필드 없음·전체 S11/UI/자원 PASS 분리 (0.145542ms) | pass | 최종실행 |
| 최종helper-14 | S11-CI07 기대 출력 수만 있거나 한 기동 관측 누락이면 완료 거부 (0.298417ms) | pass | 최종실행 |
| 최종helper-15 | S11-CI05 페이지 전체·unplaced 별도 total·동일file mapping dedup (4.561375ms) | pass | 최종실행 |
| 최종helper-16 | S11-CI05 누락·중복item·불안정total·truncated·cap 거부 (0.307042ms) | pass | 최종실행 |
| 최종helper-17 | S11-CI05 첫출력/partial/다른reference/job/unsafe숫자 거부 (0.216042ms) | pass | 최종실행 |
| 최종helper-18 | S11-CI07 정확한 accepted placeholder만 미완료로 분류하고 lineage 모순은 거부 (0.25025ms) | pass | 최종실행 |
| 최종helper-19 | S11-CI06 기존ID/hash 보존과 새event/reference/job/output 분리 (0.161917ms) | pass | 최종실행 |
| 최종helper-20 | S11-CI05 점 이벤트 equal+padding 허용·역전/빈확장 거부 (0.07725ms) | pass | 최종실행 |
| 최종helper-21 | LP04-A 목표 이전은 대기하고 해당 구간만 선택 (0.754ms) | pass | 최종실행 |
| 최종helper-22 | LP04-A 경계와 프레임을 놓치면 다른 구간으로 대체 금지 (0.201917ms) | pass | 최종실행 |
| 최종helper-23 | LP04-A 실제 dispatch 정확 일치만 허용 (0.077792ms) | pass | 최종실행 |
| 최종helper-24 | LP03-A failed는 완료 대기 대신 즉시 중단 (0.0935ms) | pass | 최종실행 |
| 최종helper-25 | P0-HTTP01 pending은 전이 완료가 아님 (0.047333ms) | pass | 최종실행 |
| 최종helper-26 | P0-HTTP01 partial은 지연 관측만 가능 (0.046125ms) | pass | 최종실행 |
| 최종helper-27 | P0-HTTP01 다른 참조와 모순 파일은 거부 (0.081125ms) | pass | 최종실행 |
| 최종helper-28 | P0-HTTP01 원래 완전 출력 검사는 부분 출력 거부 유지 (0.09525ms) | pass | 최종실행 |
| 최종helper-29 | LP05-04 같은 원본의 앞선 비중첩 mapping 뒤 중첩 구간도 보존 (0.620292ms) | pass | 최종실행 |
| 최종helper-30 | LP05-04 겹치는 원본 전수·경계 제외·미상 분리·비밀 미노출 (0.475958ms) | pass | 최종실행 |
| 최종helper-31 | P0-STATE01 complete1 count와 기존 two-output 거부 구분 (0.228417ms) | pass | 최종실행 |
| 최종helper-32 | P0-STATE02 pending partial complete2 변화와 8개 상한 (0.939875ms) | pass | 최종실행 |
| 최종helper-33 | P0-STATE03 raw ID/path/unknown enum/request 비밀 미노출 (0.166791ms) | pass | 최종실행 |

## 실제 HTTP 개별 결과

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| HTTP-1 | GET health; status=null; header/body/total=null/null/4ms | fail | 기동중재시도 |
| HTTP-2 | GET health; status=null; header/body/total=null/null/1ms | fail | 기동중재시도 |
| HTTP-3 | GET health; status=null; header/body/total=null/null/1ms | fail | 기동중재시도 |
| HTTP-4 | GET health; status=null; header/body/total=null/null/1ms | fail | 기동중재시도 |
| HTTP-5 | GET health; status=null; header/body/total=null/null/1ms | fail | 기동중재시도 |
| HTTP-6 | GET health; status=null; header/body/total=null/null/1ms | fail | 기동중재시도 |
| HTTP-7 | GET health; status=null; header/body/total=null/null/1ms | fail | 기동중재시도 |
| HTTP-8 | GET health; status=null; header/body/total=null/null/1ms | fail | 기동중재시도 |
| HTTP-9 | GET health; status=null; header/body/total=null/null/0ms | fail | 기동중재시도 |
| HTTP-10 | GET health; status=null; header/body/total=null/null/1ms | fail | 기동중재시도 |
| HTTP-11 | GET health; status=null; header/body/total=null/null/0ms | fail | 기동중재시도 |
| HTTP-12 | GET health; status=null; header/body/total=null/null/0ms | fail | 기동중재시도 |
| HTTP-13 | GET health; status=null; header/body/total=null/null/0ms | fail | 기동중재시도 |
| HTTP-14 | GET health; status=200; header/body/total=5/1/6ms | pass | 개별응답 |
| HTTP-15 | GET ice; status=200; header/body/total=2/0/2ms | pass | 개별응답 |
| HTTP-16 | POST source; status=201; header/body/total=79/0/79ms | pass | 개별응답 |
| HTTP-17 | POST tap-create; status=200; header/body/total=49/0/49ms | pass | 개별응답 |
| HTTP-18 | GET tap; status=200; header/body/total=23/0/23ms | pass | 개별응답 |
| HTTP-19 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-20 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-21 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-22 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-23 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-24 | GET timeline; status=200; header/body/total=0/0/1ms | pass | 개별응답 |
| HTTP-25 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-26 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-27 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-28 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-29 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-30 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-31 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-32 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-33 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-34 | GET timeline; status=200; header/body/total=0/0/1ms | pass | 개별응답 |
| HTTP-35 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-36 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-37 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-38 | GET timeline; status=200; header/body/total=0/0/1ms | pass | 개별응답 |
| HTTP-39 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-40 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-41 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-42 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-43 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-44 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-45 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-46 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-47 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-48 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-49 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-50 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-51 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-52 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-53 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-54 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-55 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-56 | GET timeline; status=200; header/body/total=0/0/1ms | pass | 개별응답 |
| HTTP-57 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-58 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-59 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-60 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-61 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-62 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-63 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-64 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-65 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-66 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-67 | GET tap; status=200; header/body/total=2/0/2ms | pass | 개별응답 |
| HTTP-68 | GET timeline; status=200; header/body/total=2/0/2ms | pass | 개별응답 |
| HTTP-69 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-70 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-71 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-72 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-73 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-74 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-75 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-76 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-77 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-78 | GET timeline; status=200; header/body/total=0/0/1ms | pass | 개별응답 |
| HTTP-79 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-80 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-81 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-82 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-83 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-84 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-85 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-86 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-87 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-88 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-89 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-90 | GET timeline; status=200; header/body/total=0/0/1ms | pass | 개별응답 |
| HTTP-91 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-92 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-93 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-94 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-95 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-96 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-97 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-98 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-99 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-100 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-101 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-102 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-103 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-104 | GET timeline; status=200; header/body/total=0/0/1ms | pass | 개별응답 |
| HTTP-105 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-106 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-107 | GET tap; status=200; header/body/total=2/0/2ms | pass | 개별응답 |
| HTTP-108 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-109 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-110 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-111 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-112 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-113 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-114 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-115 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-116 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-117 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-118 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-119 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-120 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-121 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-122 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-123 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-124 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-125 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-126 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-127 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-128 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-129 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-130 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-131 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-132 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-133 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-134 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-135 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-136 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-137 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-138 | GET timeline; status=200; header/body/total=0/0/1ms | pass | 개별응답 |
| HTTP-139 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-140 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-141 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-142 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-143 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-144 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-145 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-146 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-147 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-148 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-149 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-150 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-151 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-152 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-153 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-154 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-155 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-156 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-157 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-158 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-159 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-160 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-161 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-162 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-163 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-164 | GET timeline; status=200; header/body/total=0/0/1ms | pass | 개별응답 |
| HTTP-165 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-166 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-167 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-168 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-169 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-170 | GET timeline; status=200; header/body/total=0/0/0ms | pass | 개별응답 |
| HTTP-171 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-172 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-173 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-174 | GET timeline; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-175 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-176 | GET timeline; status=200; header/body/total=12/0/13ms | pass | 개별응답 |
| HTTP-177 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-178 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-179 | GET timeline; status=200; header/body/total=12/0/13ms | pass | 개별응답 |
| HTTP-180 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-181 | GET tap; status=200; header/body/total=1/0/1ms | pass | 개별응답 |
| HTTP-182 | GET timeline; status=200; header/body/total=12/0/12ms | pass | 개별응답 |
| HTTP-183 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-184 | PUT rule; status=200; header/body/total=4/0/4ms | pass | 개별응답 |
| HTTP-185 | GET tap-events; status=200; header/body/total=9/0/9ms | pass | 개별응답 |
| HTTP-186 | PUT rule; status=200; header/body/total=2/0/2ms | pass | 개별응답 |
| HTTP-187 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-188 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-189 | GET timeline; status=200; header/body/total=12/0/13ms | pass | 개별응답 |
| HTTP-190 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-191 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-192 | GET timeline; status=200; header/body/total=13/0/14ms | pass | 개별응답 |
| HTTP-193 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-194 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-195 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-196 | GET timeline; status=200; header/body/total=14/0/14ms | pass | 개별응답 |
| HTTP-197 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-198 | GET timeline; status=200; header/body/total=14/0/14ms | pass | 개별응답 |
| HTTP-199 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-200 | GET timeline; status=200; header/body/total=13/0/14ms | pass | 개별응답 |
| HTTP-201 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-202 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-203 | GET timeline; status=200; header/body/total=12/0/13ms | pass | 개별응답 |
| HTTP-204 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-205 | GET timeline; status=200; header/body/total=14/0/14ms | pass | 개별응답 |
| HTTP-206 | GET timeline; status=200; header/body/total=14/0/14ms | pass | 개별응답 |
| HTTP-207 | GET timeline; status=200; header/body/total=12/0/13ms | pass | 개별응답 |
| HTTP-208 | GET timeline; status=200; header/body/total=13/0/14ms | pass | 개별응답 |
| HTTP-209 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-210 | GET timeline; status=200; header/body/total=13/0/14ms | pass | 개별응답 |
| HTTP-211 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-212 | GET timeline; status=200; header/body/total=14/0/14ms | pass | 개별응답 |
| HTTP-213 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-214 | GET timeline; status=200; header/body/total=14/0/14ms | pass | 개별응답 |
| HTTP-215 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-216 | GET timeline; status=200; header/body/total=14/0/14ms | pass | 개별응답 |
| HTTP-217 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-218 | GET timeline; status=200; header/body/total=13/0/14ms | pass | 개별응답 |
| HTTP-219 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-220 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-221 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-222 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-223 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-224 | GET timeline; status=200; header/body/total=14/0/14ms | pass | 개별응답 |
| HTTP-225 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-226 | GET timeline; status=200; header/body/total=14/0/14ms | pass | 개별응답 |
| HTTP-227 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-228 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-229 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-230 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-231 | GET timeline; status=200; header/body/total=12/0/12ms | pass | 개별응답 |
| HTTP-232 | GET timeline; status=200; header/body/total=13/0/14ms | pass | 개별응답 |
| HTTP-233 | GET timeline; status=200; header/body/total=12/0/12ms | pass | 개별응답 |
| HTTP-234 | GET timeline; status=200; header/body/total=14/0/14ms | pass | 개별응답 |
| HTTP-235 | GET timeline; status=200; header/body/total=12/0/13ms | pass | 개별응답 |
| HTTP-236 | GET timeline; status=200; header/body/total=14/0/14ms | pass | 개별응답 |
| HTTP-237 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-238 | GET timeline; status=200; header/body/total=14/0/14ms | pass | 개별응답 |
| HTTP-239 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-240 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-241 | GET timeline; status=200; header/body/total=12/0/12ms | pass | 개별응답 |
| HTTP-242 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-243 | GET timeline; status=200; header/body/total=12/0/12ms | pass | 개별응답 |
| HTTP-244 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-245 | GET timeline; status=200; header/body/total=163/0/163ms | pass | 개별응답 |
| HTTP-246 | GET timeline; status=200; header/body/total=377/0/377ms | pass | 개별응답 |
| HTTP-247 | GET timeline; status=200; header/body/total=12/0/12ms | pass | 개별응답 |
| HTTP-248 | GET timeline; status=200; header/body/total=14/0/14ms | pass | 개별응답 |
| HTTP-249 | GET timeline; status=200; header/body/total=12/0/12ms | pass | 개별응답 |
| HTTP-250 | GET timeline; status=200; header/body/total=14/0/14ms | pass | 개별응답 |
| HTTP-251 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-252 | GET timeline; status=200; header/body/total=13/0/14ms | pass | 개별응답 |
| HTTP-253 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-254 | GET timeline; status=200; header/body/total=14/0/14ms | pass | 개별응답 |
| HTTP-255 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-256 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-257 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-258 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-259 | GET timeline; status=200; header/body/total=12/0/13ms | pass | 개별응답 |
| HTTP-260 | GET timeline; status=200; header/body/total=14/0/14ms | pass | 개별응답 |
| HTTP-261 | GET timeline; status=200; header/body/total=13/0/14ms | pass | 개별응답 |
| HTTP-262 | GET timeline; status=200; header/body/total=14/0/14ms | pass | 개별응답 |
| HTTP-263 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-264 | GET timeline; status=200; header/body/total=13/0/14ms | pass | 개별응답 |
| HTTP-265 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-266 | GET timeline; status=200; header/body/total=15/0/15ms | pass | 개별응답 |
| HTTP-267 | GET timeline; status=200; header/body/total=12/0/13ms | pass | 개별응답 |
| HTTP-268 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-269 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-270 | GET timeline; status=200; header/body/total=13/0/13ms | pass | 개별응답 |
| HTTP-271 | GET timeline; status=200; header/body/total=707/0/707ms | pass | 개별응답 |
| HTTP-272 | GET timeline; status=200; header/body/total=17/0/18ms | pass | 개별응답 |
| HTTP-273 | GET timeline; status=200; header/body/total=2671/0/2672ms | pass | 개별응답 |
| HTTP-274 | GET timeline; status=200; header/body/total=34/0/34ms | pass | 개별응답 |
| HTTP-275 | GET timeline; status=200; header/body/total=607/0/608ms | pass | 개별응답 |
| HTTP-276 | GET timeline; status=200; header/body/total=153/0/153ms | pass | 개별응답 |
| HTTP-277 | GET timeline; status=200; header/body/total=162/0/162ms | pass | 개별응답 |
| HTTP-278 | GET timeline; status=200; header/body/total=40/0/40ms | pass | 개별응답 |
| HTTP-279 | GET timeline; status=200; header/body/total=30/0/30ms | pass | 개별응답 |
| HTTP-280 | GET timeline; status=200; header/body/total=30/0/30ms | pass | 개별응답 |
| HTTP-281 | GET timeline; status=200; header/body/total=151/0/151ms | pass | 개별응답 |
| HTTP-282 | GET timeline; status=200; header/body/total=168/0/168ms | pass | 개별응답 |
| HTTP-283 | GET timeline; status=200; header/body/total=181/0/181ms | pass | 개별응답 |
| HTTP-284 | GET timeline; status=200; header/body/total=41/0/41ms | pass | 개별응답 |
| HTTP-285 | GET timeline; status=200; header/body/total=31/0/31ms | pass | 개별응답 |
| HTTP-286 | GET timeline; status=200; header/body/total=30/0/30ms | pass | 개별응답 |
| HTTP-287 | GET timeline; status=200; header/body/total=154/0/154ms | pass | 개별응답 |
| HTTP-288 | GET timeline; status=200; header/body/total=152/0/152ms | pass | 개별응답 |
| HTTP-289 | GET timeline; status=200; header/body/total=163/0/163ms | pass | 개별응답 |
| HTTP-290 | GET timeline; status=200; header/body/total=40/0/41ms | pass | 개별응답 |
| HTTP-291 | GET timeline; status=200; header/body/total=30/0/30ms | pass | 개별응답 |
| HTTP-292 | GET timeline; status=200; header/body/total=720/0/720ms | pass | 개별응답 |
| HTTP-293 | GET timeline; status=200; header/body/total=3590/0/3590ms | pass | 개별응답 |
| HTTP-294 | GET timeline; status=200; header/body/total=198/0/198ms | pass | 개별응답 |
| HTTP-295 | GET timeline; status=200; header/body/total=1950/0/1950ms | pass | 개별응답 |
| HTTP-296 | DELETE tap; status=200; header/body/total=8/0/8ms | pass | 개별응답 |


사용자 승인1~5: 진단경로→겹치는원본→실패입력확보→독립재현→확정원인수정. 성공 전 제품 수정·전체완료·푸시 판정 금지. 실제분할/GStreamer/공개API/시간·ID 의미는 임의 변경하지 않는다.

1번은883783b3 커밋. known3/unknown2/state·원본index·symlink·hardlink10검사 통과; 상세 중앙기록 및 archive-probe-test-green2.txt. 2~4는 준비 중이며 실제앱 실행 전이다.

## helper 개별 결과

명령 `node --test scripts/internal/recording_current_latency.test.mjs scripts/internal/recording_current_state_diagnostics.test.mjs scripts/internal/recording_current_http_diagnostics.test.mjs scripts/internal/recording_current_integration.test.mjs`: exit0,32/32,52.016125ms. node --check runner 및 git diff --check exit0.
LP05-04는 사전등록 후 helper 부재로1FAIL/3PASS(exit1,33.791542ms) 예상RED→구현후4/4(exit0,31.817666ms)→아래32관련검사다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| LP05-04 RED | helper 부재 assertion | fail | 사전등록 예상RED, 후속GREEN |
| helper-1 | P0-DIAG01 정상 header/body 시간·안전 route 분류와 비밀 미노출 (1.337916ms) | pass | 실제 실행 |
| helper-2 | P0-DIAG02 header timeout 고정 진단과 실패 유지 (0.332333ms) | pass | 실제 실행 |
| helper-3 | P0-DIAG03 body timeout 부분 수신 측정·완료 거부 (0.144ms) | pass | 실제 실행 |
| helper-4 | S11-CI01 현행 다섯 단계 순서·실제 child 결과 결박 (1.309084ms) | pass | 실제 실행 |
| helper-5 | S11-CI04 기존 실제 dispatch 상관 정상·오래된ID·다른조건·복수ID 거부 (0.218375ms) | pass | 실제 실행 |
| helper-6 | S11-CI02 nonzero 실패 후 나머지 미실행 (0.08125ms) | pass | 실제 실행 |
| helper-7 | S11-CI02 signal 실패 후 나머지 미실행 (0.055834ms) | pass | 실제 실행 |
| helper-8 | S11-CI02 output-limit 실패 후 나머지 미실행 (0.04575ms) | pass | 실제 실행 |
| helper-9 | S11-CI02 summary-missing 실패 후 나머지 미실행 (0.042583ms) | pass | 실제 실행 |
| helper-10 | S11-CI02 summary-duplicate 실패 후 나머지 미실행 (0.039959ms) | pass | 실제 실행 |
| helper-11 | S11-CI02 cleanup-failed 실패 후 나머지 미실행 (0.040959ms) | pass | 실제 실행 |
| helper-12 | S11-CI02 port-missing 실패 후 나머지 미실행 (0.043458ms) | pass | 실제 실행 |
| helper-13 | S11-CI03 legacy 완료 필드 없음·전체 S11/UI/자원 PASS 분리 (0.177042ms) | pass | 실제 실행 |
| helper-14 | S11-CI07 기대 출력 수만 있거나 한 기동 관측 누락이면 완료 거부 (0.222208ms) | pass | 실제 실행 |
| helper-15 | S11-CI05 페이지 전체·unplaced 별도 total·동일file mapping dedup (5.281959ms) | pass | 실제 실행 |
| helper-16 | S11-CI05 누락·중복item·불안정total·truncated·cap 거부 (0.270417ms) | pass | 실제 실행 |
| helper-17 | S11-CI05 첫출력/partial/다른reference/job/unsafe숫자 거부 (0.203792ms) | pass | 실제 실행 |
| helper-18 | S11-CI07 정확한 accepted placeholder만 미완료로 분류하고 lineage 모순은 거부 (0.227416ms) | pass | 실제 실행 |
| helper-19 | S11-CI06 기존ID/hash 보존과 새event/reference/job/output 분리 (0.164375ms) | pass | 실제 실행 |
| helper-20 | S11-CI05 점 이벤트 equal+padding 허용·역전/빈확장 거부 (0.078167ms) | pass | 실제 실행 |
| helper-21 | LP04-A 목표 이전은 대기하고 해당 구간만 선택 (0.501083ms) | pass | 실제 실행 |
| helper-22 | LP04-A 경계와 프레임을 놓치면 다른 구간으로 대체 금지 (0.242708ms) | pass | 실제 실행 |
| helper-23 | LP04-A 실제 dispatch 정확 일치만 허용 (0.0875ms) | pass | 실제 실행 |
| helper-24 | LP03-A failed는 완료 대기 대신 즉시 중단 (0.101833ms) | pass | 실제 실행 |
| helper-25 | P0-HTTP01 pending은 전이 완료가 아님 (0.045875ms) | pass | 실제 실행 |
| helper-26 | P0-HTTP01 partial은 지연 관측만 가능 (0.043083ms) | pass | 실제 실행 |
| helper-27 | P0-HTTP01 다른 참조와 모순 파일은 거부 (0.072667ms) | pass | 실제 실행 |
| helper-28 | P0-HTTP01 원래 완전 출력 검사는 부분 출력 거부 유지 (0.100875ms) | pass | 실제 실행 |
| helper-29 | LP05-04 겹치는 원본 전수·경계 제외·미상 분리·비밀 미노출 (1.807292ms) | pass | 실제 실행 |
| helper-30 | P0-STATE01 complete1 count와 기존 two-output 거부 구분 (0.258125ms) | pass | 실제 실행 |
| helper-31 | P0-STATE02 pending partial complete2 변화와 8개 상한 (0.343958ms) | pass | 실제 실행 |
| helper-32 | P0-STATE03 raw ID/path/unknown enum/request 비밀 미노출 (0.052334ms) | pass | 실제 실행 |

[원출력](diagnostic-helper-output.txt). 자체검사는 임시산출물 없음. token start/end/consumed는 집계 source가 없어 미집계. 실행시간은 Node test 출력이다.
