# 보완 진단·독립 재현 기록

## 2026-09-17 LP07 실제앱 재개 결과와 중단 판정

LP07-01 실제앱1회는 exit0,30.834초,5PASS/0FAIL. timeline187개 모두 기존4초이내(max2771ms), complete 상태의 partial 출력1개다. 최초 intent→failed는 재현되지 않아 LP07-02 원인미확정, 03 제품수정·04 누적/완전성/통합은 선행조건 미충족으로 건너뜀이다. 한 번 더 반복하거나 과거 실패를 해결로 바꾸지 않는다. 이 단계는 AGENTS 8장의 원인미확정 경계에서 중단하며 실제앱 단기 결과/기록만 커밋한다.

명령 `node scripts/internal/verify_recording_current_app.mjs --latency-only`, source HEAD8723ed90, 제품코드변경 없음. 기본권한 최초실행은 UDP bind EPERM(제품서버 미기동)으로 실패; 생성자료22,283,408B 정리. exit 도구직렬화오류로 미확보, summary 실패 명확. 동일명령 require_escalated 권한으로 실제앱1회 실행해 위 결과 확보. 추가 반복실행 없음. [환경선수실패 원출력](lp07-preflight-output.txt), [실제 원출력](lp07-actual-output.txt).

실제 event PTS8633333333ns, 요청 media-pts-ms8633±750 → [7883000000,9383000000)ns. 보완된 mapping slice 관측은 동일요청 주변 finalized/playable 원본이1개에서2개로 변화한 것을 기록했다. `temporalOnly=true`이며 stored job이 실제로 선택한 원본 목록·failure 당시 snapshot을 증명하지 않는다. trigger의 sourceEndPts8266666666ns는 timeline mapping item의 끝값이므로 전체파일 종료점으로 단정하지 않는다. 같은원본 mapping에는8333333333ns까지의 구간도 관측됐다. 원본확정지연/선택시점/정밀도 등 어느 것이 partial 원인인지 이관측만으로 확정하지 않는다.

failed 상태가 없어 basic/detail/replay 진단 분기는 실제앱에서 미실행이며 failure-UUID JSON 미생성이다. 실패입력이 없으므로 LP06 자체검증을 최초제품실패 원인확정으로 확대하지 않는다. 현재 worker는 complete 또는 제한대기소진 시 intent를 만들고 서비스 Run을 호출한다(src/recording/recording_derived_event_worker.cpp:163~185). 이코드와 관측은 부분결과 경로의 가능성을 설명하지만 최초 failed 원인의 직접증거는 아니다.

| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 실제앱 단기1회 | 완료 | latency pass, 부분출력1, 실패미재현 | 원출력·exit0 |
| 2 | 원인 확정 | 미완료 | 최초실패코드/입력 미확보 | failed 상태 없음 |
| 3 | 확정원인 수정 | 건너뜀 | 추정 수정 금지 | 2번 미충족 |
| 4 | 보류 작업 재개 | 건너뜀 | LP02·대기정책·통합 미실행 | 순차진행 선행조건 미충족 |
| 5 | 동일 개발방식 | 일부 수행 | 검증완료된1번의 실행기록을 별도커밋, 제품커밋없음 | git log |

### 실제 개별 결과

HTTP 총293개, sequence1~293 연속 누락없음=true. 모든 HTTP·5개검사 아래에 보존한다. token start/end/consumed는 집계 source 없어 미집계. elapsed는 runner 원출력 기준이다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 검사-1 | S11-CI09 product-1 healthy isolated ICE | pass | 실제 latency-only 범위 |
| 검사-2 | S11-CI07 run1 actual tuple EventRecord reference | pass | 실제 latency-only 범위 |
| 검사-3 | P0-HTTP02 same-reference durable transition observed (not completeness) | pass | 실제 latency-only 범위 |
| 검사-4 | P0-HTTP02 all timeline HTTP within unchanged 4000ms | pass | 실제 latency-only 범위 |
| 검사-5 | S11-CI08 product-1 exit0 ports returned | pass | 실제 latency-only 범위 |
| HTTP-1 | GET health; status=null; header/body/total=null/null/3ms; 0B | fail | 기동 대기중 실패, 이후 정상응답 |
| HTTP-2 | GET health; status=null; header/body/total=null/null/1ms; 0B | fail | 기동 대기중 실패, 이후 정상응답 |
| HTTP-3 | GET health; status=null; header/body/total=null/null/1ms; 0B | fail | 기동 대기중 실패, 이후 정상응답 |
| HTTP-4 | GET health; status=null; header/body/total=null/null/1ms; 0B | fail | 기동 대기중 실패, 이후 정상응답 |
| HTTP-5 | GET health; status=null; header/body/total=null/null/1ms; 0B | fail | 기동 대기중 실패, 이후 정상응답 |
| HTTP-6 | GET health; status=null; header/body/total=null/null/1ms; 0B | fail | 기동 대기중 실패, 이후 정상응답 |
| HTTP-7 | GET health; status=null; header/body/total=null/null/1ms; 0B | fail | 기동 대기중 실패, 이후 정상응답 |
| HTTP-8 | GET health; status=null; header/body/total=null/null/1ms; 0B | fail | 기동 대기중 실패, 이후 정상응답 |
| HTTP-9 | GET health; status=null; header/body/total=null/null/1ms; 0B | fail | 기동 대기중 실패, 이후 정상응답 |
| HTTP-10 | GET health; status=null; header/body/total=null/null/1ms; 0B | fail | 기동 대기중 실패, 이후 정상응답 |
| HTTP-11 | GET health; status=null; header/body/total=null/null/0ms; 0B | fail | 기동 대기중 실패, 이후 정상응답 |
| HTTP-12 | GET health; status=null; header/body/total=null/null/0ms; 0B | fail | 기동 대기중 실패, 이후 정상응답 |
| HTTP-13 | GET health; status=null; header/body/total=null/null/0ms; 0B | fail | 기동 대기중 실패, 이후 정상응답 |
| HTTP-14 | GET health; status=null; header/body/total=null/null/0ms; 0B | fail | 기동 대기중 실패, 이후 정상응답 |
| HTTP-15 | GET health; status=null; header/body/total=null/null/1ms; 0B | fail | 기동 대기중 실패, 이후 정상응답 |
| HTTP-16 | GET health; status=null; header/body/total=null/null/0ms; 0B | fail | 기동 대기중 실패, 이후 정상응답 |
| HTTP-17 | GET health; status=200; header/body/total=9/1/10ms; 15B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-18 | GET ice; status=200; header/body/total=2/0/2ms; 222B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-19 | POST source; status=201; header/body/total=83/0/84ms; 428B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-20 | POST tap-create; status=200; header/body/total=56/0/56ms; 1187B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-21 | GET tap; status=200; header/body/total=22/0/22ms; 4030B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-22 | GET tap; status=200; header/body/total=1/0/1ms; 5972B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-23 | GET timeline; status=200; header/body/total=1/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-24 | GET tap; status=200; header/body/total=1/0/1ms; 5974B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-25 | GET timeline; status=200; header/body/total=1/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-26 | GET tap; status=200; header/body/total=1/0/1ms; 6149B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-27 | GET timeline; status=200; header/body/total=1/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-28 | GET tap; status=200; header/body/total=1/0/1ms; 6282B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-29 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-30 | GET tap; status=200; header/body/total=1/0/1ms; 6416B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-31 | GET timeline; status=200; header/body/total=1/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-32 | GET tap; status=200; header/body/total=1/0/1ms; 6413B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-33 | GET timeline; status=200; header/body/total=0/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-34 | GET tap; status=200; header/body/total=1/0/1ms; 6552B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-35 | GET timeline; status=200; header/body/total=1/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-36 | GET tap; status=200; header/body/total=1/0/1ms; 6676B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-37 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-38 | GET tap; status=200; header/body/total=1/0/1ms; 6812B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-39 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-40 | GET tap; status=200; header/body/total=1/0/1ms; 6954B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-41 | GET timeline; status=200; header/body/total=1/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-42 | GET tap; status=200; header/body/total=1/0/1ms; 6944B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-43 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-44 | GET tap; status=200; header/body/total=1/0/1ms; 7088B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-45 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-46 | GET tap; status=200; header/body/total=1/0/1ms; 7230B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-47 | GET timeline; status=200; header/body/total=0/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-48 | GET tap; status=200; header/body/total=1/0/1ms; 7369B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-49 | GET timeline; status=200; header/body/total=0/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-50 | GET tap; status=200; header/body/total=1/0/1ms; 7497B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-51 | GET timeline; status=200; header/body/total=1/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-52 | GET tap; status=200; header/body/total=1/0/1ms; 7493B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-53 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-54 | GET tap; status=200; header/body/total=1/0/1ms; 7634B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-55 | GET timeline; status=200; header/body/total=1/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-56 | GET tap; status=200; header/body/total=1/0/1ms; 7763B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-57 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-58 | GET tap; status=200; header/body/total=1/0/1ms; 7899B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-59 | GET timeline; status=200; header/body/total=0/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-60 | GET tap; status=200; header/body/total=1/0/1ms; 8030B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-61 | GET timeline; status=200; header/body/total=1/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-62 | GET tap; status=200; header/body/total=1/0/1ms; 8032B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-63 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-64 | GET tap; status=200; header/body/total=1/0/1ms; 8162B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-65 | GET timeline; status=200; header/body/total=1/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-66 | GET tap; status=200; header/body/total=1/0/1ms; 8303B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-67 | GET timeline; status=200; header/body/total=1/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-68 | GET tap; status=200; header/body/total=1/0/1ms; 8437B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-69 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-70 | GET tap; status=200; header/body/total=4/0/4ms; 8569B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-71 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-72 | GET tap; status=200; header/body/total=1/0/1ms; 8571B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-73 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-74 | GET tap; status=200; header/body/total=1/0/1ms; 8708B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-75 | GET timeline; status=200; header/body/total=1/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-76 | GET tap; status=200; header/body/total=1/0/1ms; 8841B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-77 | GET timeline; status=200; header/body/total=1/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-78 | GET tap; status=200; header/body/total=1/0/1ms; 8978B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-79 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-80 | GET tap; status=200; header/body/total=1/0/1ms; 9107B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-81 | GET timeline; status=200; header/body/total=2/0/2ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-82 | GET tap; status=200; header/body/total=1/0/1ms; 9112B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-83 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-84 | GET tap; status=200; header/body/total=1/0/1ms; 9248B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-85 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-86 | GET tap; status=200; header/body/total=1/0/1ms; 9383B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-87 | GET timeline; status=200; header/body/total=1/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-88 | GET tap; status=200; header/body/total=1/0/1ms; 9513B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-89 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-90 | GET tap; status=200; header/body/total=2/0/2ms; 9650B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-91 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-92 | GET tap; status=200; header/body/total=1/0/1ms; 9648B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-93 | GET timeline; status=200; header/body/total=0/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-94 | GET tap; status=200; header/body/total=1/0/1ms; 10201B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-95 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-96 | GET tap; status=200; header/body/total=1/0/1ms; 10387B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-97 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-98 | GET tap; status=200; header/body/total=1/0/1ms; 10564B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-99 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-100 | GET tap; status=200; header/body/total=1/0/1ms; 10562B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-101 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-102 | GET tap; status=200; header/body/total=1/0/1ms; 10751B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-103 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-104 | GET tap; status=200; header/body/total=1/0/1ms; 10818B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-105 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-106 | GET tap; status=200; header/body/total=1/0/1ms; 10865B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-107 | GET timeline; status=200; header/body/total=0/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-108 | GET tap; status=200; header/body/total=1/0/1ms; 10921B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-109 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-110 | GET tap; status=200; header/body/total=1/0/1ms; 10916B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-111 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-112 | GET tap; status=200; header/body/total=1/0/1ms; 10969B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-113 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-114 | GET tap; status=200; header/body/total=1/0/1ms; 11013B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-115 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-116 | GET tap; status=200; header/body/total=1/0/1ms; 11066B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-117 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-118 | GET tap; status=200; header/body/total=1/0/1ms; 11119B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-119 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-120 | GET tap; status=200; header/body/total=1/0/1ms; 11117B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-121 | GET timeline; status=200; header/body/total=1/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-122 | GET tap; status=200; header/body/total=1/0/1ms; 11150B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-123 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-124 | GET tap; status=200; header/body/total=1/0/1ms; 11196B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-125 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-126 | GET tap; status=200; header/body/total=1/0/1ms; 11244B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-127 | GET timeline; status=200; header/body/total=1/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-128 | GET tap; status=200; header/body/total=1/0/1ms; 11298B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-129 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-130 | GET tap; status=200; header/body/total=1/0/1ms; 11298B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-131 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-132 | GET tap; status=200; header/body/total=1/0/1ms; 11334B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-133 | GET timeline; status=200; header/body/total=0/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-134 | GET tap; status=200; header/body/total=1/0/1ms; 11387B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-135 | GET timeline; status=200; header/body/total=1/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-136 | GET tap; status=200; header/body/total=1/0/1ms; 11435B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-137 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-138 | GET tap; status=200; header/body/total=1/0/1ms; 11474B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-139 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-140 | GET tap; status=200; header/body/total=1/0/1ms; 11478B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-141 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-142 | GET tap; status=200; header/body/total=1/0/1ms; 11521B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-143 | GET timeline; status=200; header/body/total=1/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-144 | GET tap; status=200; header/body/total=1/0/1ms; 11554B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-145 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-146 | GET tap; status=200; header/body/total=1/0/1ms; 11605B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-147 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-148 | GET tap; status=200; header/body/total=1/0/1ms; 11646B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-149 | GET timeline; status=200; header/body/total=0/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-150 | GET tap; status=200; header/body/total=1/0/1ms; 11650B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-151 | GET timeline; status=200; header/body/total=1/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-152 | GET tap; status=200; header/body/total=1/0/1ms; 11696B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-153 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-154 | GET tap; status=200; header/body/total=1/0/1ms; 11741B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-155 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-156 | GET tap; status=200; header/body/total=1/0/1ms; 11785B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-157 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-158 | GET tap; status=200; header/body/total=1/0/1ms; 11836B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-159 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-160 | GET tap; status=200; header/body/total=1/0/1ms; 11837B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-161 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-162 | GET tap; status=200; header/body/total=1/0/1ms; 11882B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-163 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-164 | GET tap; status=200; header/body/total=1/0/1ms; 11922B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-165 | GET timeline; status=200; header/body/total=0/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-166 | GET tap; status=200; header/body/total=1/0/1ms; 11969B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-167 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-168 | GET tap; status=200; header/body/total=2/0/2ms; 12012B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-169 | GET timeline; status=200; header/body/total=0/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-170 | GET tap; status=200; header/body/total=1/0/1ms; 12010B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-171 | GET timeline; status=200; header/body/total=0/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-172 | GET tap; status=200; header/body/total=1/0/1ms; 12062B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-173 | GET timeline; status=200; header/body/total=0/0/0ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-174 | GET tap; status=200; header/body/total=1/0/1ms; 12058B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-175 | GET timeline; status=200; header/body/total=1/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-176 | GET tap; status=200; header/body/total=1/0/1ms; 12062B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-177 | GET timeline; status=200; header/body/total=1/0/1ms; 82B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-178 | GET tap; status=200; header/body/total=5/0/5ms; 12055B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-179 | GET timeline; status=200; header/body/total=14/0/14ms; 83461B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-180 | GET timeline; status=200; header/body/total=11/0/11ms; 28135B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-181 | GET tap; status=200; header/body/total=1/0/1ms; 12058B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-182 | GET timeline; status=200; header/body/total=11/0/11ms; 83461B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-183 | GET timeline; status=200; header/body/total=11/0/11ms; 28135B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-184 | GET tap; status=200; header/body/total=3/0/3ms; 12054B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-185 | GET timeline; status=200; header/body/total=12/0/12ms; 83461B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-186 | GET timeline; status=200; header/body/total=12/0/12ms; 28135B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-187 | PUT rule; status=200; header/body/total=5/0/5ms; 520B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-188 | GET tap-events; status=200; header/body/total=8/0/8ms; 9901B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-189 | PUT rule; status=200; header/body/total=1/0/1ms; 521B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-190 | GET timeline; status=200; header/body/total=12/0/12ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-191 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-192 | GET timeline; status=200; header/body/total=12/0/12ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-193 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-194 | GET timeline; status=200; header/body/total=12/0/12ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-195 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-196 | GET timeline; status=200; header/body/total=12/0/12ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-197 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-198 | GET timeline; status=200; header/body/total=12/0/12ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-199 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-200 | GET timeline; status=200; header/body/total=12/0/12ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-201 | GET timeline; status=200; header/body/total=11/0/11ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-202 | GET timeline; status=200; header/body/total=12/0/12ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-203 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-204 | GET timeline; status=200; header/body/total=12/0/12ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-205 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-206 | GET timeline; status=200; header/body/total=12/0/12ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-207 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-208 | GET timeline; status=200; header/body/total=12/0/12ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-209 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-210 | GET timeline; status=200; header/body/total=12/0/12ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-211 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-212 | GET timeline; status=200; header/body/total=12/0/13ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-213 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-214 | GET timeline; status=200; header/body/total=12/0/12ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-215 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-216 | GET timeline; status=200; header/body/total=12/0/13ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-217 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-218 | GET timeline; status=200; header/body/total=13/0/13ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-219 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-220 | GET timeline; status=200; header/body/total=12/0/12ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-221 | GET timeline; status=200; header/body/total=13/0/13ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-222 | GET timeline; status=200; header/body/total=13/0/13ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-223 | GET timeline; status=200; header/body/total=13/0/13ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-224 | GET timeline; status=200; header/body/total=12/0/13ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-225 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-226 | GET timeline; status=200; header/body/total=12/0/12ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-227 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-228 | GET timeline; status=200; header/body/total=12/0/13ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-229 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-230 | GET timeline; status=200; header/body/total=12/0/12ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-231 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-232 | GET timeline; status=200; header/body/total=12/0/12ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-233 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-234 | GET timeline; status=200; header/body/total=12/0/12ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-235 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-236 | GET timeline; status=200; header/body/total=12/0/12ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-237 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-238 | GET timeline; status=200; header/body/total=12/0/13ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-239 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-240 | GET timeline; status=200; header/body/total=12/0/13ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-241 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-242 | GET timeline; status=200; header/body/total=12/0/12ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-243 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-244 | GET timeline; status=200; header/body/total=12/0/12ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-245 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-246 | GET timeline; status=200; header/body/total=13/0/13ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-247 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-248 | GET timeline; status=200; header/body/total=12/0/12ms; 83397B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-249 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-250 | GET timeline; status=200; header/body/total=55/0/55ms; 83438B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-251 | GET timeline; status=200; header/body/total=299/0/299ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-252 | GET timeline; status=200; header/body/total=12/0/13ms; 83438B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-253 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-254 | GET timeline; status=200; header/body/total=13/0/13ms; 83438B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-255 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-256 | GET timeline; status=200; header/body/total=12/0/13ms; 83438B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-257 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-258 | GET timeline; status=200; header/body/total=13/0/13ms; 83438B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-259 | GET timeline; status=200; header/body/total=13/0/13ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-260 | GET timeline; status=200; header/body/total=13/0/13ms; 83438B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-261 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-262 | GET timeline; status=200; header/body/total=12/0/12ms; 83438B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-263 | GET timeline; status=200; header/body/total=13/0/13ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-264 | GET timeline; status=200; header/body/total=12/0/13ms; 83438B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-265 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-266 | GET timeline; status=200; header/body/total=12/0/12ms; 83438B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-267 | GET timeline; status=200; header/body/total=13/0/13ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-268 | GET timeline; status=200; header/body/total=13/0/13ms; 83438B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-269 | GET timeline; status=200; header/body/total=13/0/13ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-270 | GET timeline; status=200; header/body/total=12/0/12ms; 83438B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-271 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-272 | GET timeline; status=200; header/body/total=30/0/30ms; 83438B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-273 | GET timeline; status=200; header/body/total=13/0/13ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-274 | GET timeline; status=200; header/body/total=12/0/12ms; 83438B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-275 | GET timeline; status=200; header/body/total=12/0/12ms; 31431B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-276 | GET timeline; status=200; header/body/total=1326/0/1326ms; 113642B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-277 | GET timeline; status=200; header/body/total=1660/0/1660ms; 112809B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-278 | GET timeline; status=200; header/body/total=554/0/554ms; 82508B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-279 | GET timeline; status=200; header/body/total=148/0/148ms; 126046B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-280 | GET timeline; status=200; header/body/total=151/0/152ms; 112809B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-281 | GET timeline; status=200; header/body/total=149/0/149ms; 82508B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-282 | GET timeline; status=200; header/body/total=149/0/149ms; 82611B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-283 | GET timeline; status=200; header/body/total=148/0/148ms; 65407B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-284 | GET timeline; status=200; header/body/total=147/0/147ms; 126046B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-285 | GET timeline; status=200; header/body/total=149/0/149ms; 112809B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-286 | GET timeline; status=200; header/body/total=149/0/149ms; 82508B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-287 | GET timeline; status=200; header/body/total=147/0/147ms; 82611B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-288 | GET timeline; status=200; header/body/total=727/0/728ms; 65407B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-289 | GET timeline; status=200; header/body/total=1457/0/1457ms; 129105B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-290 | GET timeline; status=200; header/body/total=2771/0/2771ms; 121854B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-291 | GET timeline; status=200; header/body/total=876/0/876ms; 121885B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-292 | GET timeline; status=200; header/body/total=282/0/282ms; 102171B | pass | HTTP 관측만, 완전성 PASS 아님 |
| HTTP-293 | DELETE tap; status=200; header/body/total=8/0/8ms; 26B | pass | HTTP 관측만, 완전성 PASS 아님 |

### 정리

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-integration-J53GFh | 기동 전 소유fixture/cache | 22283408B | 삭제 | rootAbsent=true,processes[] | preflight 출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-integration-WDi1pN | 실제앱fixture/영상/DB/cache | 52592619B | PID43099 exit0/HTTP52456·RTSP52457·UDP반환후삭제 | rootAbsent=true/failureCount0, 별도 test ! -e 성공 | actual 출력 |

안전요약 HTTP원출력/실행기록만 저장소보존. credentials/raw source URL/영상/원장본문은 이관하지 않았다. 후속진행 판단: 같은실패를무작정재시도하지 않고 과거미재현실패를 열린이슈로유지할지, 현재재현되는partial/대기정책을별도경로로먼저다룰지 사용자의 순서판단이필요하다. 이번 승인된순서를 임의변경하지 않는다.

## 2026-09-17 LP06-B 선보존 실행순서·정리 완료

사용자1~4는 진단도구 구현·자체검증 범위로 완료했다. 최초 실제제품실패 원인은 여전히 미확정이다. 실제앱1회(후속5), 제품수정, 누적catalog, 전체build, UI/30분/120분, 푸시는 미실행이다. C++ commit a9f48fb2 후 JS 연결을 별도 커밋한다.

변경: recording_failure_capture.mjs의 captureFailureEvidence/runDiagnosticProbe/removeDiagnosticRoot, verify_recording_current_app.mjs의 실패정리 분기. 기본 결과 → 0600 exclusive 원자파일 보존·fsync → 상세 결과 별도 보존 → fresh복제본 재현 → 재현요약 별도 보존 순서다. 1MiB 요약상한·exact field/type/code 검사·unknown/redaction 유지. 원본 영상/raw intent는 저장소로 복사하지 않는다. 기본/상세 수집·보존 실패는 재현 건너뜀 및 root 정리 차단(cleanup blocker)이다. 상세까지 안전요약을 보존했다면 재현실패를 기록하고 소유root를 정리한다. 이 자료는 재현 bundle이 아니며, 나중에 영상 재실행이 필요하면 별도 자료 확보가 필요하다.

안전요약은 실패 발생 시에만 docs/release-artifacts/v4.1.0/s11-preparation-mapping/failure-UUID.json(.details.json/.replay.json)에 남긴다. 이번 실제앱은 실행하지 않아 이러한 런타임 파일은 생성하지 않았다. 자체검사 증거 파일은 소유 임시root에 만들고 아래와 같이 삭제했다. 정리 실패 테스트는 증거미보존/소유권 불일치 거부를 검사했으며 OS permission/io-fault 강제주입은 미실행이다.

메인 리뷰에서 상세검사 전 basic 필요성을 발견해 A08로 보완했다. 단일 담당자 읽기 리뷰의 plugin 환경 선행/진단별 신규예산 지적도 반영했다. basic은 환경 준비 없이 직접 실행하고, 상세/replay 자식은 min(기존15000ms, 전체deadline 잔여시간)을 사용한다. 전체180000ms·HTTP4000ms는 변경하지 않았다. 동기복제/hash/cleanup을 강제선점하는 wallclock 보장은 아니며 stage 진입과 child 실행 상한만 확인했다. 리뷰 재확인에서 추가 중요 결함 없음.

### 명령과 실패 이력

- 최초 LP06-B01: `node --test --test-name-pattern='LP06-B01' scripts/internal/recording_failure_capture.test.mjs`, exit1, 1FAIL/33.254917ms. captureFailureEvidence 미구현 undefined≠function 예상 RED. 구현후10/10 PASS(161.456792ms).
- LP06-B07: `node --test --test-name-pattern='LP06-B07.*throw' scripts/internal/recording_failure_capture.test.mjs`, exit1, 1FAIL/36.11725ms. basic 선보존 미구현으로 not-run≠preserved 예상 RED, 구현후14/14 PASS.
- LP06-B08: `node --test --test-name-pattern='LP06-B08' scripts/internal/recording_failure_capture.test.mjs`, exit1, runDiagnosticProbe 미구현 예상 RED → 16/16 PASS.
- 최종: `node --test scripts/internal/recording_failure_capture.test.mjs scripts/internal/recording_current_state_diagnostics.test.mjs scripts/internal/recording_current_latency.test.mjs scripts/internal/recording_current_http_diagnostics.test.mjs scripts/internal/recording_current_integration.test.mjs`, exit0,49/49,449.344ms. 앞선43개는 기본10+기존33, 최종49개는 추가16+기존33이다.
- C++ 연결: `node --test --test-name-pattern='LP06-B10' scripts/internal/recording_current_archive_probe.test.mjs`, exit0,1/1,5248.255708ms. 이후 추가한 directory fsync는 최종49개 파일보존 검사로 영향 확인; C++ schema/호출 경로는 유지되어 연결 결과 재사용.
- `node --check scripts/internal/verify_recording_current_app.mjs`, `git diff --check`: exit0. `./server.sh verify-docs-links`: exit0,282md/8665links/22images/110anchors,fail0.

B01/B07 초기 RED와 첫10개 GREEN은 대화의 실제 출력에서 위 수치·assertion을 기록했으며 원출력 전문 파일은 없음을 명시한다. 이후 각 실행 원출력과 모든 결과는 [failure-capture-output.txt](failure-capture-output.txt)에 보존한다. token start/end/consumed는 실제 집계 source 부재로 미집계, elapsed는 Node 측정이다.

최종 staging 검사에서 신규 raw 출력의 assertion 공백행 두 곳에 trailing whitespace가 발견되어 `git diff --cached --check` exit2로 커밋 전 중단했다. 해당 공백만 정규화했으며 결과값·실패내역은 유지했다. Git 기본 실행은 index.lock 권한 오류(exit128)였고 승인된 권한 경로로 재시도했다. 제품/테스트 로직 변경은 없어 기능 재실행 대상이 아니다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| helper-초기43-1 | P0-DIAG01 정상 header/body 시간·안전 route 분류와 비밀 미노출 (0.701875ms) | pass | 실행 source에 한정 |
| helper-초기43-2 | P0-DIAG02 header timeout 고정 진단과 실패 유지 (0.309375ms) | pass | 실행 source에 한정 |
| helper-초기43-3 | P0-DIAG03 body timeout 부분 수신 측정·완료 거부 (0.136042ms) | pass | 실행 source에 한정 |
| helper-초기43-4 | S11-CI01 현행 다섯 단계 순서·실제 child 결과 결박 (2.137ms) | pass | 실행 source에 한정 |
| helper-초기43-5 | S11-CI04 기존 실제 dispatch 상관 정상·오래된ID·다른조건·복수ID 거부 (0.236666ms) | pass | 실행 source에 한정 |
| helper-초기43-6 | S11-CI02 nonzero 실패 후 나머지 미실행 (0.087542ms) | pass | 실행 source에 한정 |
| helper-초기43-7 | S11-CI02 signal 실패 후 나머지 미실행 (0.063542ms) | pass | 실행 source에 한정 |
| helper-초기43-8 | S11-CI02 output-limit 실패 후 나머지 미실행 (0.055167ms) | pass | 실행 source에 한정 |
| helper-초기43-9 | S11-CI02 summary-missing 실패 후 나머지 미실행 (0.054958ms) | pass | 실행 source에 한정 |
| helper-초기43-10 | S11-CI02 summary-duplicate 실패 후 나머지 미실행 (0.043958ms) | pass | 실행 source에 한정 |
| helper-초기43-11 | S11-CI02 cleanup-failed 실패 후 나머지 미실행 (0.044625ms) | pass | 실행 source에 한정 |
| helper-초기43-12 | S11-CI02 port-missing 실패 후 나머지 미실행 (0.049084ms) | pass | 실행 source에 한정 |
| helper-초기43-13 | S11-CI03 legacy 완료 필드 없음·전체 S11/UI/자원 PASS 분리 (0.207875ms) | pass | 실행 source에 한정 |
| helper-초기43-14 | S11-CI07 기대 출력 수만 있거나 한 기동 관측 누락이면 완료 거부 (0.232833ms) | pass | 실행 source에 한정 |
| helper-초기43-15 | S11-CI05 페이지 전체·unplaced 별도 total·동일file mapping dedup (4.840709ms) | pass | 실행 source에 한정 |
| helper-초기43-16 | S11-CI05 누락·중복item·불안정total·truncated·cap 거부 (0.1615ms) | pass | 실행 source에 한정 |
| helper-초기43-17 | S11-CI05 첫출력/partial/다른reference/job/unsafe숫자 거부 (0.151708ms) | pass | 실행 source에 한정 |
| helper-초기43-18 | S11-CI07 정확한 accepted placeholder만 미완료로 분류하고 lineage 모순은 거부 (0.205083ms) | pass | 실행 source에 한정 |
| helper-초기43-19 | S11-CI06 기존ID/hash 보존과 새event/reference/job/output 분리 (0.157458ms) | pass | 실행 source에 한정 |
| helper-초기43-20 | S11-CI05 점 이벤트 equal+padding 허용·역전/빈확장 거부 (0.078833ms) | pass | 실행 source에 한정 |
| helper-초기43-21 | LP04-A 목표 이전은 대기하고 해당 구간만 선택 (0.314542ms) | pass | 실행 source에 한정 |
| helper-초기43-22 | LP04-A 경계와 프레임을 놓치면 다른 구간으로 대체 금지 (0.158792ms) | pass | 실행 source에 한정 |
| helper-초기43-23 | LP04-A 실제 dispatch 정확 일치만 허용 (0.072333ms) | pass | 실행 source에 한정 |
| helper-초기43-24 | LP03-A failed는 완료 대기 대신 즉시 중단 (0.084667ms) | pass | 실행 source에 한정 |
| helper-초기43-25 | P0-HTTP01 pending은 전이 완료가 아님 (0.042542ms) | pass | 실행 source에 한정 |
| helper-초기43-26 | P0-HTTP01 partial은 지연 관측만 가능 (0.040209ms) | pass | 실행 source에 한정 |
| helper-초기43-27 | P0-HTTP01 다른 참조와 모순 파일은 거부 (0.070833ms) | pass | 실행 source에 한정 |
| helper-초기43-28 | P0-HTTP01 원래 완전 출력 검사는 부분 출력 거부 유지 (0.093125ms) | pass | 실행 source에 한정 |
| helper-초기43-29 | LP05-04 같은 원본의 앞선 비중첩 mapping 뒤 중첩 구간도 보존 (0.651875ms) | pass | 실행 source에 한정 |
| helper-초기43-30 | LP05-04 겹치는 원본 전수·경계 제외·미상 분리·비밀 미노출 (0.511334ms) | pass | 실행 source에 한정 |
| helper-초기43-31 | P0-STATE01 complete1 count와 기존 two-output 거부 구분 (0.241833ms) | pass | 실행 source에 한정 |
| helper-초기43-32 | P0-STATE02 pending partial complete2 변화와 8개 상한 (0.39275ms) | pass | 실행 source에 한정 |
| helper-초기43-33 | P0-STATE03 raw ID/path/unknown enum/request 비밀 미노출 (0.069125ms) | pass | 실행 source에 한정 |
| helper-초기43-34 | LP06-B01 진단 파일을 재현 전에 보존 (12.196875ms) | pass | 실행 source에 한정 |
| helper-초기43-35 | LP06-B02 실제 자식 exit 뒤 최초 증거 유지 (29.882875ms) | pass | 실행 source에 한정 |
| helper-초기43-36 | LP06-B02 실제 자식 timeout 뒤 최초 증거 유지 (61.972ms) | pass | 실행 source에 한정 |
| helper-초기43-37 | LP06-B03 진단 throw 시 재현·정리 거부 (0.377ms) | pass | 실행 source에 한정 |
| helper-초기43-38 | LP06-B03 진단 unsafe 시 재현·정리 거부 (0.240583ms) | pass | 실행 source에 한정 |
| helper-초기43-39 | LP06-B04 최초 보존 실패 시 재현 금지 (5.281125ms) | pass | 실행 source에 한정 |
| helper-초기43-40 | LP06-B04 후속 보존 실패 시 최초 파일 유지 (8.939459ms) | pass | 실행 source에 한정 |
| helper-초기43-41 | LP06-B05 진단 미보존 root 정리 금지·소유권 불일치 거부 (0.576916ms) | pass | 실행 source에 한정 |
| helper-초기43-42 | LP06-B06 symlink 증거 덮어쓰기 거부 (4.535833ms) | pass | 실행 source에 한정 |
| helper-초기43-43 | LP06-B06 성공 결과 분리 보존·미등록 필드 거부 (8.894125ms) | pass | 실행 source에 한정 |
| capture-상세14-1 | LP06-B01 진단 파일을 재현 전에 보존 (17.481709ms) | pass | 실행 source에 한정 |
| capture-상세14-2 | LP06-B02 실제 자식 exit 뒤 최초 증거 유지 (28.913916ms) | pass | 실행 source에 한정 |
| capture-상세14-3 | LP06-B02 실제 자식 timeout 뒤 최초 증거 유지 (65.626917ms) | pass | 실행 source에 한정 |
| capture-상세14-4 | LP06-B03 진단 throw 시 재현·정리 거부 (0.679334ms) | pass | 실행 source에 한정 |
| capture-상세14-5 | LP06-B03 진단 unsafe 시 재현·정리 거부 (0.268917ms) | pass | 실행 source에 한정 |
| capture-상세14-6 | LP06-B04 최초 보존 실패 시 재현 금지 (4.732792ms) | pass | 실행 source에 한정 |
| capture-상세14-7 | LP06-B04 후속 보존 실패 시 최초 파일 유지 (12.036167ms) | pass | 실행 source에 한정 |
| capture-상세14-8 | LP06-B05 진단 미보존 root 정리 금지·소유권 불일치 거부 (0.594875ms) | pass | 실행 source에 한정 |
| capture-상세14-9 | LP06-B06 symlink 증거 덮어쓰기 거부 (5.60425ms) | pass | 실행 source에 한정 |
| capture-상세14-10 | LP06-B06 성공 결과 분리 보존·미등록 필드 거부 (12.883625ms) | pass | 실행 source에 한정 |
| capture-상세14-11 | LP06-B07 상세 수집 throw 시 기본 진단 유지·재현 금지 (4.825042ms) | pass | 실행 source에 한정 |
| capture-상세14-12 | LP06-B07 상세 수집 timeout 시 기본 진단 유지·재현 금지 (57.716917ms) | pass | 실행 source에 한정 |
| capture-상세14-13 | LP06-B07 상세 수집 identity 시 기본 진단 유지·재현 금지 (5.432458ms) | pass | 실행 source에 한정 |
| capture-상세14-14 | LP06-B07 상세 수집 persist 시 기본 진단 유지·재현 금지 (8.744125ms) | pass | 실행 source에 한정 |
| 환경deadline-RED-1 | LP06-B08 기본 자식은 plugin 환경 준비 실패와 독립 (1.293ms) | fail | 예상 RED, 이후 GREEN |
| 환경deadline-RED-2 | failing tests: | fail | 예상 RED, 이후 GREEN |
| 환경deadline-RED-3 | LP06-B08 기본 자식은 plugin 환경 준비 실패와 독립 (1.293ms) | fail | 예상 RED, 이후 GREEN |
| capture-환경16-1 | LP06-B01 진단 파일을 재현 전에 보존 (15.437417ms) | pass | 실행 source에 한정 |
| capture-환경16-2 | LP06-B02 실제 자식 exit 뒤 최초 증거 유지 (31.912834ms) | pass | 실행 source에 한정 |
| capture-환경16-3 | LP06-B02 실제 자식 timeout 뒤 최초 증거 유지 (65.686583ms) | pass | 실행 source에 한정 |
| capture-환경16-4 | LP06-B03 진단 throw 시 재현·정리 거부 (0.366666ms) | pass | 실행 source에 한정 |
| capture-환경16-5 | LP06-B03 진단 unsafe 시 재현·정리 거부 (0.385917ms) | pass | 실행 source에 한정 |
| capture-환경16-6 | LP06-B04 최초 보존 실패 시 재현 금지 (4.889084ms) | pass | 실행 source에 한정 |
| capture-환경16-7 | LP06-B04 후속 보존 실패 시 최초 파일 유지 (12.973791ms) | pass | 실행 source에 한정 |
| capture-환경16-8 | LP06-B05 진단 미보존 root 정리 금지·소유권 불일치 거부 (0.559708ms) | pass | 실행 source에 한정 |
| capture-환경16-9 | LP06-B06 symlink 증거 덮어쓰기 거부 (4.739375ms) | pass | 실행 source에 한정 |
| capture-환경16-10 | LP06-B06 성공 결과 분리 보존·미등록 필드 거부 (12.831084ms) | pass | 실행 source에 한정 |
| capture-환경16-11 | LP06-B07 상세 수집 throw 시 기본 진단 유지·재현 금지 (3.732541ms) | pass | 실행 source에 한정 |
| capture-환경16-12 | LP06-B07 상세 수집 timeout 시 기본 진단 유지·재현 금지 (56.396167ms) | pass | 실행 source에 한정 |
| capture-환경16-13 | LP06-B07 상세 수집 identity 시 기본 진단 유지·재현 금지 (4.631166ms) | pass | 실행 source에 한정 |
| capture-환경16-14 | LP06-B07 상세 수집 persist 시 기본 진단 유지·재현 금지 (9.107292ms) | pass | 실행 source에 한정 |
| capture-환경16-15 | LP06-B08 기본 자식은 plugin 환경 준비 실패와 독립 (26.336ms) | pass | 실행 source에 한정 |
| capture-환경16-16 | LP06-B09 만료 시 자식 미기동·남은 시간만 대기 (102.358584ms) | pass | 실행 source에 한정 |
| helper-최종49-1 | P0-DIAG01 정상 header/body 시간·안전 route 분류와 비밀 미노출 (0.633542ms) | pass | 실행 source에 한정 |
| helper-최종49-2 | P0-DIAG02 header timeout 고정 진단과 실패 유지 (0.297166ms) | pass | 실행 source에 한정 |
| helper-최종49-3 | P0-DIAG03 body timeout 부분 수신 측정·완료 거부 (0.132625ms) | pass | 실행 source에 한정 |
| helper-최종49-4 | S11-CI01 현행 다섯 단계 순서·실제 child 결과 결박 (1.172375ms) | pass | 실행 source에 한정 |
| helper-최종49-5 | S11-CI04 기존 실제 dispatch 상관 정상·오래된ID·다른조건·복수ID 거부 (0.198833ms) | pass | 실행 source에 한정 |
| helper-최종49-6 | S11-CI02 nonzero 실패 후 나머지 미실행 (0.074333ms) | pass | 실행 source에 한정 |
| helper-최종49-7 | S11-CI02 signal 실패 후 나머지 미실행 (0.057167ms) | pass | 실행 source에 한정 |
| helper-최종49-8 | S11-CI02 output-limit 실패 후 나머지 미실행 (0.044125ms) | pass | 실행 source에 한정 |
| helper-최종49-9 | S11-CI02 summary-missing 실패 후 나머지 미실행 (0.058792ms) | pass | 실행 source에 한정 |
| helper-최종49-10 | S11-CI02 summary-duplicate 실패 후 나머지 미실행 (0.043792ms) | pass | 실행 source에 한정 |
| helper-최종49-11 | S11-CI02 cleanup-failed 실패 후 나머지 미실행 (0.041958ms) | pass | 실행 source에 한정 |
| helper-최종49-12 | S11-CI02 port-missing 실패 후 나머지 미실행 (0.047042ms) | pass | 실행 source에 한정 |
| helper-최종49-13 | S11-CI03 legacy 완료 필드 없음·전체 S11/UI/자원 PASS 분리 (0.234ms) | pass | 실행 source에 한정 |
| helper-최종49-14 | S11-CI07 기대 출력 수만 있거나 한 기동 관측 누락이면 완료 거부 (0.6265ms) | pass | 실행 source에 한정 |
| helper-최종49-15 | S11-CI05 페이지 전체·unplaced 별도 total·동일file mapping dedup (4.58925ms) | pass | 실행 source에 한정 |
| helper-최종49-16 | S11-CI05 누락·중복item·불안정total·truncated·cap 거부 (0.172416ms) | pass | 실행 source에 한정 |
| helper-최종49-17 | S11-CI05 첫출력/partial/다른reference/job/unsafe숫자 거부 (0.160125ms) | pass | 실행 source에 한정 |
| helper-최종49-18 | S11-CI07 정확한 accepted placeholder만 미완료로 분류하고 lineage 모순은 거부 (0.189792ms) | pass | 실행 source에 한정 |
| helper-최종49-19 | S11-CI06 기존ID/hash 보존과 새event/reference/job/output 분리 (0.154125ms) | pass | 실행 source에 한정 |
| helper-최종49-20 | S11-CI05 점 이벤트 equal+padding 허용·역전/빈확장 거부 (0.075459ms) | pass | 실행 source에 한정 |
| helper-최종49-21 | LP04-A 목표 이전은 대기하고 해당 구간만 선택 (0.2935ms) | pass | 실행 source에 한정 |
| helper-최종49-22 | LP04-A 경계와 프레임을 놓치면 다른 구간으로 대체 금지 (0.152208ms) | pass | 실행 source에 한정 |
| helper-최종49-23 | LP04-A 실제 dispatch 정확 일치만 허용 (0.067625ms) | pass | 실행 source에 한정 |
| helper-최종49-24 | LP03-A failed는 완료 대기 대신 즉시 중단 (0.082ms) | pass | 실행 source에 한정 |
| helper-최종49-25 | P0-HTTP01 pending은 전이 완료가 아님 (0.0415ms) | pass | 실행 source에 한정 |
| helper-최종49-26 | P0-HTTP01 partial은 지연 관측만 가능 (0.043292ms) | pass | 실행 source에 한정 |
| helper-최종49-27 | P0-HTTP01 다른 참조와 모순 파일은 거부 (0.063542ms) | pass | 실행 source에 한정 |
| helper-최종49-28 | P0-HTTP01 원래 완전 출력 검사는 부분 출력 거부 유지 (0.098083ms) | pass | 실행 source에 한정 |
| helper-최종49-29 | LP05-04 같은 원본의 앞선 비중첩 mapping 뒤 중첩 구간도 보존 (0.587875ms) | pass | 실행 source에 한정 |
| helper-최종49-30 | LP05-04 겹치는 원본 전수·경계 제외·미상 분리·비밀 미노출 (0.461458ms) | pass | 실행 source에 한정 |
| helper-최종49-31 | P0-STATE01 complete1 count와 기존 two-output 거부 구분 (0.226583ms) | pass | 실행 source에 한정 |
| helper-최종49-32 | P0-STATE02 pending partial complete2 변화와 8개 상한 (0.695875ms) | pass | 실행 source에 한정 |
| helper-최종49-33 | P0-STATE03 raw ID/path/unknown enum/request 비밀 미노출 (0.060916ms) | pass | 실행 source에 한정 |
| helper-최종49-34 | LP06-B01 진단 파일을 재현 전에 보존 (24.552834ms) | pass | 실행 source에 한정 |
| helper-최종49-35 | LP06-B02 실제 자식 exit 뒤 최초 증거 유지 (40.466041ms) | pass | 실행 source에 한정 |
| helper-최종49-36 | LP06-B02 실제 자식 timeout 뒤 최초 증거 유지 (73.862167ms) | pass | 실행 source에 한정 |
| helper-최종49-37 | LP06-B03 진단 throw 시 재현·정리 거부 (0.4055ms) | pass | 실행 source에 한정 |
| helper-최종49-38 | LP06-B03 진단 unsafe 시 재현·정리 거부 (0.467875ms) | pass | 실행 source에 한정 |
| helper-최종49-39 | LP06-B04 최초 보존 실패 시 재현 금지 (4.421ms) | pass | 실행 source에 한정 |
| helper-최종49-40 | LP06-B04 후속 보존 실패 시 최초 파일 유지 (18.74625ms) | pass | 실행 source에 한정 |
| helper-최종49-41 | LP06-B05 진단 미보존 root 정리 금지·소유권 불일치 거부 (0.739084ms) | pass | 실행 source에 한정 |
| helper-최종49-42 | LP06-B06 symlink 증거 덮어쓰기 거부 (3.350542ms) | pass | 실행 source에 한정 |
| helper-최종49-43 | LP06-B06 성공 결과 분리 보존·미등록 필드 거부 (23.628625ms) | pass | 실행 source에 한정 |
| helper-최종49-44 | LP06-B07 상세 수집 throw 시 기본 진단 유지·재현 금지 (7.0965ms) | pass | 실행 source에 한정 |
| helper-최종49-45 | LP06-B07 상세 수집 timeout 시 기본 진단 유지·재현 금지 (59.976625ms) | pass | 실행 source에 한정 |
| helper-최종49-46 | LP06-B07 상세 수집 identity 시 기본 진단 유지·재현 금지 (7.918208ms) | pass | 실행 source에 한정 |
| helper-최종49-47 | LP06-B07 상세 수집 persist 시 기본 진단 유지·재현 금지 (12.103583ms) | pass | 실행 source에 한정 |
| helper-최종49-48 | LP06-B08 기본 자식은 plugin 환경 준비 실패와 독립 (27.466125ms) | pass | 실행 source에 한정 |
| helper-최종49-49 | LP06-B09 만료 시 자식 미기동·남은 시간만 대기 (102.753708ms) | pass | 실행 source에 한정 |
| LP06-B10 | 실제 typed C++ basic/detail/replay → JS 선보존·별도복제본·원본 불변, exit0, 5248.255708ms | pass | 새 연결 focused1개; 최초 제품실패 재현 아님 |


### 임시 자료 정리

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/recording-capture-b2GAVT | 검증 소유 임시 증거/자식 fixture | 1619B | 삭제 | removed=true | 최종49 출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/recording-capture-0BBlhV | 검증 소유 임시 증거/자식 fixture | 1619B | 삭제 | removed=true | 최종49 출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/recording-capture-egFfZP | 검증 소유 임시 증거/자식 fixture | 1620B | 삭제 | removed=true | 최종49 출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/recording-capture-S7YB8X | 검증 소유 임시 증거/자식 fixture | 0B | 삭제 | removed=true | 최종49 출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/recording-capture-qCkYrK | 검증 소유 임시 증거/자식 fixture | 0B | 삭제 | removed=true | 최종49 출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/recording-capture-IkW63W | 검증 소유 임시 증거/자식 fixture | 8B | 삭제 | removed=true | 최종49 출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/recording-capture-lOKdH2 | 검증 소유 임시 증거/자식 fixture | 1601B | 삭제 | removed=true | 최종49 출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/recording-capture-xf4iL3 | 검증 소유 임시 증거/자식 fixture | 0B | 삭제 | removed=true | 최종49 출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/recording-capture-tBVw0a | 검증 소유 임시 증거/자식 fixture | 98B | 삭제 | removed=true | 최종49 출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/recording-capture-uWHNav | 검증 소유 임시 증거/자식 fixture | 1954B | 삭제 | removed=true | 최종49 출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/recording-capture-AMCFXy | 검증 소유 임시 증거/자식 fixture | 266B | 삭제 | removed=true | 최종49 출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/recording-capture-kSmsCv | 검증 소유 임시 증거/자식 fixture | 266B | 삭제 | removed=true | 최종49 출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/recording-capture-5IanNM | 검증 소유 임시 증거/자식 fixture | 266B | 삭제 | removed=true | 최종49 출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/recording-capture-p5vhGI | 검증 소유 임시 증거/자식 fixture | 274B | 삭제 | removed=true | 최종49 출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/recording-capture-fiPcPx | 검증 소유 임시 증거/자식 fixture | 97B | 삭제 | removed=true | 최종49 출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/recording-capture-gxy7YQ | 검증 소유 임시 증거/자식 fixture | 163B | 삭제 | removed=true | 최종49 출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-archive-probe-tests-XfPBy1 | 실제 C++ 연결 fixture/media/cache | 14965736B | 삭제 | removed=true | B10 출력 |


초기 helper 반복의 개별root 크기는 미계측이었다. 매 실행 finally의 root 삭제·부재 assertion은 수행했고, 최종16개부터 path/bytes/removed를 원출력에 추가했다. 네트워크 서버/포트는 이번 자체검사에서 기동하지 않았다. 오류·timeout용 자식은 spawnSync 종료 결과 확인, 최초/상세/재현 테스트 파일과 fake canary는 소유root에서 삭제했다.

### 요청 대조 및 잔여

| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 실패 진단과 독립 재현 분리 | 완료 | basic/detail/replay 독립보존 | LP06-A08/B01/B02/B10 |
| 2 | 안전 오류 분류 | 완료 | exact9개·suffix unknown | LP06-A05/A06 |
| 3 | 최소 증거/정리 | 완료 | 저장intent와파일측정구분·수집실패명시·cleanup차단 | LP06-A01~04/B04~07 |
| 4 | 자체검증 | 완료 | C++28 유효, JS49, 실제C++연결1 | 위 개별결과 |
| 5 | 분할커밋 | 수행 | C++ a9f48fb2, JS 연결·결과 기록은 이번 별도커밋 | git log |
| 6 | 종합보고/잔여목록 | 수행 | 실제앱→원인확정→확정원인수정 순서 | 이번 범위밖 후속 |

후속 P0: 보완 관측기의 실제앱 단기1회 → 실패코드/자료에 따른 원인확정(미재현이면그대로보고) → 확정원인만 수정·영향회귀. 이후 보류된 누적catalog16/32와 완전출력2개/재기동/전체통합을 재개한다. 이번 승인으로 실제앱·후속제품개발을 자동수행하지 않는다. 기존 누적 커밋의 푸시는 앞서 승인된 전체원인수정 완료조건 미충족으로 보류한다.


## 2026-09-17 LP06-A 기본·상세 진단 분리

이번 사용자 승인 1~4 중 C++ 진단 도구 보완이다. 제품 src/include 변경·실제 앱 실행·최초 제품 실패 원인 확정은 아니다. 기본 진단 `--diagnose-basic`은 typed 실패 상태와 intent SHA만 반환하고, 상세 `--diagnose-failed`에서 저장된 선택 원본 식별/시간/binding 요약과 파일 hash 확보 여부를 반환한다. live snapshot을 stored intent로 오인하지 않으며 파일 부재/손상은 ResolveMedia의 fail-closed `unavailable`로 남긴다. 원본 영상/raw intent를 담은 재현 bundle은 아니다.

오류 분류는 3개에서 exact 9개로 확장했다. 근거는 service.cpp 38/233/241, remux.cpp 44/232의 고정 상수다. 접미 원문은 unknown이며 임의 오류 원문은 출력하지 않는다. 기본 진단은 상세 파일검사보다 먼저 호출·보존하도록 다음 JS 작업에서 연결한다.

실행: `node --test scripts/internal/recording_current_archive_probe.test.mjs`. 최초 26개 중 17 PASS/9 FAIL(새 필드/분류 미구현 7개 expected RED, media 수량 3개를 2개로 가정한 fixture 준비 오류 2개). fixture만 바로잡아 missing/corrupt 2개 expected RED 확인 후 구현, 26/26 PASS. 추가 basic mode expected RED 1개 후 전체27/27 PASS, 손상 basic focused1/1 PASS. 유효 증거 28개이며 한 번에28개를 실행한 것으로 표현하지 않는다. raw 출력에 명령의 결과·elapsed·개별 검사를 보존한다. focused 필터는 LP06-A03|LP06-A04, LP06-A08, LP06-A08 basic accepts corrupt 순서다. token start/end/consumed는 집계 source 없음으로 미집계, elapsed는 Node 출력이다.

기존 제품 runtime archive의 source freshness를 확인한 뒤 진단/fixture를 -Wall/-Wextra/-Werror로 컴파일했다. 전체 제품 build는 제품 무변경으로 미실행. UI/30분/120분은 승인 범위 밖. 모든 실행 소유root는 아래 size/removed evidence대로 삭제되었으며 운영/공유 저장소는 건드리지 않았다. hash-error/mismatched race 강제검사는 미실행이며 해당 분기 검증을 주장하지 않는다.

### archive-diagnose-lp06-red.txt

[원출력](archive-diagnose-lp06-red.txt). ℹ tests 26; ℹ pass 17; ℹ fail 9; ℹ duration_ms 12862.169458.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| A-1 | LP06-A01-A02 stored safe evidence and validated file hashes without remux (2437.918625ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-2 | LP06-A03 missing copy media preserves failed diagnosis (184.477458ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-3 | LP06-A04 corrupt copy media preserves failed diagnosis (186.715125ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-4 | LP06-A05 code0 exact known (358.126833ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-5 | LP06-A06 code0 suffix unknown (373.359375ms) | pass | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-6 | LP06-A05 code1 exact known (355.121625ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-7 | LP06-A06 code1 suffix unknown (356.849791ms) | pass | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-8 | LP06-A05 code2 exact known (372.676958ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-9 | LP06-A06 code2 suffix unknown (357.405625ms) | pass | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-10 | LP06-A05 code3 exact known (352.605625ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-11 | LP06-A06 code3 suffix unknown (351.328709ms) | pass | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-12 | LP06-A05 code4 exact known (353.964125ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-13 | LP06-A06 code4 suffix unknown (349.799ms) | pass | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-14 | LP06-A05 code5 exact known (380.004958ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-15 | LP06-A06 code5 suffix unknown (349.575292ms) | pass | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-16 | LP05-01 typed failed known0 (352.651917ms) | pass | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-17 | LP05-01 typed failed known1 (352.996542ms) | pass | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-18 | LP05-01 typed failed known2 (353.109292ms) | pass | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-19 | LP05-02 typed failed unknown3 (352.026792ms) | pass | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-20 | LP05-02 typed failed unknown4 (354.121666ms) | pass | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-21 | LP05-03 complete mode still rejects failed job (350.57525ms) | pass | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-22 | LP05-03 diagnostic rejects nonfailed state safely (282.730916ms) | pass | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-23 | LP05-03 rejects original recordings index without mutation (271.912958ms) | pass | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-24 | LP05-06 valid media with synthetic failed reason does not reproduce failure (602.959833ms) | pass | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-25 | LP05-03 rejects symlink copy without original mutation (276.076166ms) | pass | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-26 | LP05-03 rejects hardlink copy without original mutation (277.362958ms) | pass | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-27 | failing tests: | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-28 | LP06-A01-A02 stored safe evidence and validated file hashes without remux (2437.918625ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-29 | LP06-A03 missing copy media preserves failed diagnosis (184.477458ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-30 | LP06-A04 corrupt copy media preserves failed diagnosis (186.715125ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-31 | LP06-A05 code0 exact known (358.126833ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-32 | LP06-A05 code1 exact known (355.121625ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-33 | LP06-A05 code2 exact known (372.676958ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-34 | LP06-A05 code3 exact known (352.605625ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-35 | LP06-A05 code4 exact known (353.964125ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-36 | LP06-A05 code5 exact known (380.004958ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |

`[cleanup] owned_root=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-archive-probe-tests-9O6kDj bytes=26189606 removed=true`

### archive-diagnose-lp06-red2.txt

[원출력](archive-diagnose-lp06-red2.txt). ℹ tests 2; ℹ pass 0; ℹ fail 2; ℹ duration_ms 3936.731416.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| A-1 | LP06-A03 missing copy media preserves failed diagnosis (1979.351084ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-2 | LP06-A04 corrupt copy media preserves failed diagnosis (353.95825ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-3 | failing tests: | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-4 | LP06-A03 missing copy media preserves failed diagnosis (1979.351084ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-5 | LP06-A04 corrupt copy media preserves failed diagnosis (353.95825ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |

`[cleanup] owned_root=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-archive-probe-tests-hOcNIF bytes=13603153 removed=true`

### archive-diagnose-lp06-green.txt

[원출력](archive-diagnose-lp06-green.txt). ℹ tests 26; ℹ pass 26; ℹ fail 0; ℹ duration_ms 13160.207291.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| A-1 | LP06-A01-A02 stored safe evidence and validated file hashes without remux (2279.472916ms) | pass | 해당 source/범위 검증 |
| A-2 | LP06-A03 missing copy media preserves failed diagnosis (368.994ms) | pass | 해당 source/범위 검증 |
| A-3 | LP06-A04 corrupt copy media preserves failed diagnosis (374.1075ms) | pass | 해당 source/범위 검증 |
| A-4 | LP06-A05 code0 exact known (390.430833ms) | pass | 해당 source/범위 검증 |
| A-5 | LP06-A06 code0 suffix unknown (371.967291ms) | pass | 해당 source/범위 검증 |
| A-6 | LP06-A05 code1 exact known (373.746875ms) | pass | 해당 source/범위 검증 |
| A-7 | LP06-A06 code1 suffix unknown (371.885583ms) | pass | 해당 source/범위 검증 |
| A-8 | LP06-A05 code2 exact known (374.020041ms) | pass | 해당 source/범위 검증 |
| A-9 | LP06-A06 code2 suffix unknown (373.855334ms) | pass | 해당 source/범위 검증 |
| A-10 | LP06-A05 code3 exact known (376.086542ms) | pass | 해당 source/범위 검증 |
| A-11 | LP06-A06 code3 suffix unknown (375.108292ms) | pass | 해당 source/범위 검증 |
| A-12 | LP06-A05 code4 exact known (373.918958ms) | pass | 해당 source/범위 검증 |
| A-13 | LP06-A06 code4 suffix unknown (376.797708ms) | pass | 해당 source/범위 검증 |
| A-14 | LP06-A05 code5 exact known (375.24025ms) | pass | 해당 source/범위 검증 |
| A-15 | LP06-A06 code5 suffix unknown (372.985333ms) | pass | 해당 source/범위 검증 |
| A-16 | LP05-01 typed failed known0 (373.983666ms) | pass | 해당 source/범위 검증 |
| A-17 | LP05-01 typed failed known1 (374.721ms) | pass | 해당 source/범위 검증 |
| A-18 | LP05-01 typed failed known2 (404.0955ms) | pass | 해당 source/범위 검증 |
| A-19 | LP05-02 typed failed unknown3 (372.908ms) | pass | 해당 source/범위 검증 |
| A-20 | LP05-02 typed failed unknown4 (375.986791ms) | pass | 해당 source/범위 검증 |
| A-21 | LP05-03 complete mode still rejects failed job (350.586709ms) | pass | 해당 source/범위 검증 |
| A-22 | LP05-03 diagnostic rejects nonfailed state safely (283.310167ms) | pass | 해당 source/범위 검증 |
| A-23 | LP05-03 rejects original recordings index without mutation (276.264708ms) | pass | 해당 source/범위 검증 |
| A-24 | LP05-06 valid media with synthetic failed reason does not reproduce failure (629.25775ms) | pass | 해당 source/범위 검증 |
| A-25 | LP05-03 rejects symlink copy without original mutation (275.041458ms) | pass | 해당 source/범위 검증 |
| A-26 | LP05-03 rejects hardlink copy without original mutation (282.20925ms) | pass | 해당 source/범위 검증 |

`[cleanup] owned_root=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-archive-probe-tests-a3Ko43 bytes=26141775 removed=true`

### archive-diagnose-basic-red.txt

[원출력](archive-diagnose-basic-red.txt). ℹ tests 1; ℹ pass 0; ℹ fail 1; ℹ duration_ms 3644.646667.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| A-1 | LP06-A08 basic failure survives missing media without file inspection (2050.081958ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-2 | failing tests: | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |
| A-3 | LP06-A08 basic failure survives missing media without file inspection (2050.081958ms) | fail | 초기 실패 보존; RED와 fixture 오류는 상단 참조 |

`[cleanup] owned_root=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-archive-probe-tests-QUCEss bytes=13120279 removed=true`

### archive-diagnose-basic-green.txt

[원출력](archive-diagnose-basic-green.txt). ℹ tests 27; ℹ pass 27; ℹ fail 0; ℹ duration_ms 13645.9.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| A-1 | LP06-A08 basic failure survives missing media without file inspection (2216.413375ms) | pass | 해당 source/범위 검증 |
| A-2 | LP06-A01-A02 stored safe evidence and validated file hashes without remux (562.863083ms) | pass | 해당 source/범위 검증 |
| A-3 | LP06-A03 missing copy media preserves failed diagnosis (382.6255ms) | pass | 해당 source/범위 검증 |
| A-4 | LP06-A04 corrupt copy media preserves failed diagnosis (374.787083ms) | pass | 해당 source/범위 검증 |
| A-5 | LP06-A05 code0 exact known (372.097458ms) | pass | 해당 source/범위 검증 |
| A-6 | LP06-A06 code0 suffix unknown (374.108916ms) | pass | 해당 source/범위 검증 |
| A-7 | LP06-A05 code1 exact known (375.667917ms) | pass | 해당 source/범위 검증 |
| A-8 | LP06-A06 code1 suffix unknown (372.19575ms) | pass | 해당 source/범위 검증 |
| A-9 | LP06-A05 code2 exact known (376.564334ms) | pass | 해당 source/범위 검증 |
| A-10 | LP06-A06 code2 suffix unknown (376.0125ms) | pass | 해당 source/범위 검증 |
| A-11 | LP06-A05 code3 exact known (375.63125ms) | pass | 해당 source/범위 검증 |
| A-12 | LP06-A06 code3 suffix unknown (373.574416ms) | pass | 해당 source/범위 검증 |
| A-13 | LP06-A05 code4 exact known (374.738125ms) | pass | 해당 source/범위 검증 |
| A-14 | LP06-A06 code4 suffix unknown (376.39975ms) | pass | 해당 source/범위 검증 |
| A-15 | LP06-A05 code5 exact known (373.490208ms) | pass | 해당 source/범위 검증 |
| A-16 | LP06-A06 code5 suffix unknown (373.584666ms) | pass | 해당 source/범위 검증 |
| A-17 | LP05-01 typed failed known0 (373.408791ms) | pass | 해당 source/범위 검증 |
| A-18 | LP05-01 typed failed known1 (374.539666ms) | pass | 해당 source/범위 검증 |
| A-19 | LP05-01 typed failed known2 (374.295375ms) | pass | 해당 source/범위 검증 |
| A-20 | LP05-02 typed failed unknown3 (376.933917ms) | pass | 해당 source/범위 검증 |
| A-21 | LP05-02 typed failed unknown4 (377.155209ms) | pass | 해당 source/범위 검증 |
| A-22 | LP05-03 complete mode still rejects failed job (354.517833ms) | pass | 해당 source/범위 검증 |
| A-23 | LP05-03 diagnostic rejects nonfailed state safely (283.18025ms) | pass | 해당 source/범위 검증 |
| A-24 | LP05-03 rejects original recordings index without mutation (279.051042ms) | pass | 해당 source/범위 검증 |
| A-25 | LP05-06 valid media with synthetic failed reason does not reproduce failure (620.866042ms) | pass | 해당 source/범위 검증 |
| A-26 | LP05-03 rejects symlink copy without original mutation (274.928583ms) | pass | 해당 source/범위 검증 |
| A-27 | LP05-03 rejects hardlink copy without original mutation (273.59425ms) | pass | 해당 source/범위 검증 |

`[cleanup] owned_root=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-archive-probe-tests-vyrkuU bytes=26642674 removed=true`

### archive-diagnose-basic-corrupt-green.txt

[원출력](archive-diagnose-basic-corrupt-green.txt). ℹ tests 1; ℹ pass 1; ℹ fail 0; ℹ duration_ms 3532.111834.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| A-1 | LP06-A08 basic failure survives corrupt media without file inspection (1892.549ms) | pass | 해당 source/범위 검증 |

`[cleanup] owned_root=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-archive-probe-tests-Xq4sAj bytes=13120318 removed=true`


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
