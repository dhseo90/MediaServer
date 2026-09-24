# v4.1.0 S11 O25 현행 통합 개별 결과

독자: S11 통합 검증 담당자. 수명: v4.1.0 검증 기록. source-of-truth는 `docs/release-test-records.md`이며 이 표는 원출력의 개별 성공 assertion을 기계적으로 전사한 보조 자료다. 원출력: `o25-current-integration-final.log.gz`. 같은 fixture 준비 assertion도 포함하므로 현행 5단계 요약의 고유 검사 158개와 이 표의 행 수는 다르다. 실패·정리·미실행은 중앙 기록과 원출력을 함께 본다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| O25-001 | D3D-01 actual managed 원본과 jobComplete2출력·physical 검증 | pass | HTTP API; 원출력 4행 |
| O25-002 | I01 실제 status projection | pass | HTTP API; 원출력 8행 |
| O25-003 | I03/I06 실제 HTTP generated2출력·jobComplete timeline | pass | HTTP API; 원출력 9행 |
| O25-004 | I07 HTTP 전체/부분 중첩 원본 구별 | pass | HTTP API; 원출력 10행 |
| O25-005 | D3D-02 accepted 미확인 독립 목록 | pass | HTTP API; 원출력 11행 |
| O25-006 | D3D-02 문자열 시간·요청축 보존 | pass | HTTP API; 원출력 12행 |
| O25-007 | D3D-04 actual Event output 전체 byte/hash·MIME | pass | HTTP API; 원출력 13행 |
| O25-008 | D3D-04 actual Event output 전체 byte/hash·MIME | pass | HTTP API; 원출력 14행 |
| O25-009 | I17 HTTP 내부 path 비노출 | pass | HTTP API; 원출력 15행 |
| O25-010 | I04 HTTP 잘못된 query 거부 8 | pass | HTTP API; 원출력 16행 |
| O25-011 | I04 HTTP 잘못된 query 거부 9 | pass | HTTP API; 원출력 17행 |
| O25-012 | I04 HTTP 잘못된 query 거부 10 | pass | HTTP API; 원출력 18행 |
| O25-013 | I04 HTTP 잘못된 query 거부 11 | pass | HTTP API; 원출력 19행 |
| O25-014 | I04 HTTP 잘못된 query 거부 12 | pass | HTTP API; 원출력 20행 |
| O25-015 | I20 Range status expected=206 actual=206 | pass | HTTP API; 원출력 21행 |
| O25-016 | I20 Range Content-Range 일치 | pass | HTTP API; 원출력 22행 |
| O25-017 | I20 Range body expected=4 actual=4 byte 일치 | pass | HTTP API; 원출력 23행 |
| O25-018 | I20 range status expected=206 actual=206 | pass | HTTP API; 원출력 24행 |
| O25-019 | I20 range Content-Range 일치 | pass | HTTP API; 원출력 25행 |
| O25-020 | I20 range body expected=4 actual=4 byte 일치 | pass | HTTP API; 원출력 26행 |
| O25-021 | I20 rAnGe status expected=206 actual=206 | pass | HTTP API; 원출력 27행 |
| O25-022 | I20 rAnGe Content-Range 일치 | pass | HTTP API; 원출력 28행 |
| O25-023 | I20 rAnGe body expected=4 actual=4 byte 일치 | pass | HTTP API; 원출력 29행 |
| O25-024 | I20/I21 실제 Range bytes=2-5 | pass | HTTP API; 원출력 30행 |
| O25-025 | I20/I21 실제 Range bytes=10- | pass | HTTP API; 원출력 31행 |
| O25-026 | I20/I21 실제 Range bytes=-7 | pass | HTTP API; 원출력 32행 |
| O25-027 | I24 HTTP 전체 byte 일치 | pass | HTTP API; 원출력 33행 |
| O25-028 | I22 HTTP 범위 거부 bytes=1-0 | pass | HTTP API; 원출력 34행 |
| O25-029 | I22 HTTP 범위 거부 bytes=-0 | pass | HTTP API; 원출력 35행 |
| O25-030 | I22 HTTP 범위 거부 bytes=0-1,3-4 | pass | HTTP API; 원출력 36행 |
| O25-031 | I22 HTTP 범위 거부 bytes=18446744073709551616- | pass | HTTP API; 원출력 37행 |
| O25-032 | I22 HTTP 범위 거부 bytes=0-11002 | pass | HTTP API; 원출력 38행 |
| O25-033 | I22 HTTP 범위 거부 invalid | pass | HTTP API; 원출력 39행 |
| O25-034 | I23 실제 HEAD full | pass | HTTP API; 원출력 40행 |
| O25-035 | I23 실제 HEAD bytes=2-5 | pass | HTTP API; 원출력 41행 |
| O25-036 | I17 HTTP 없는 opaque ID 거부 | pass | HTTP API; 원출력 42행 |
| O25-037 | D3D-01 actual managed 원본과 jobComplete2출력·physical 검증 | pass | HTTP 인증; 원출력 48행 |
| O25-038 | I12~I16 principal 0 route 0 expected=200 actual=200 | pass | HTTP 인증; 원출력 52행 |
| O25-039 | I02 principal 0 허용 채널만 status 반환 | pass | HTTP 인증; 원출력 53행 |
| O25-040 | I01 principal 0 실제 비녹화 상태 | pass | HTTP 인증; 원출력 54행 |
| O25-041 | S07-http-observations-global | pass | HTTP 인증; 원출력 55행 |
| O25-042 | I02/I17 principal 0 route 0 민감 field 비노출 | pass | HTTP 인증; 원출력 56행 |
| O25-043 | I12~I16 principal 0 route 1 expected=200 actual=200 | pass | HTTP 인증; 원출력 57행 |
| O25-044 | I02/I17 principal 0 route 1 민감 field 비노출 | pass | HTTP 인증; 원출력 58행 |
| O25-045 | I12~I16 principal 0 route 2 expected=200 actual=200 | pass | HTTP 인증; 원출력 59행 |
| O25-046 | I12~I16 principal 1 route 0 expected=200 actual=200 | pass | HTTP 인증; 원출력 60행 |
| O25-047 | I02 principal 1 허용 채널만 status 반환 | pass | HTTP 인증; 원출력 61행 |
| O25-048 | I01 principal 1 실제 비녹화 상태 | pass | HTTP 인증; 원출력 62행 |
| O25-049 | S07-http-observations-limited principal 1 | pass | HTTP 인증; 원출력 63행 |
| O25-050 | I02/I17 principal 1 route 0 민감 field 비노출 | pass | HTTP 인증; 원출력 64행 |
| O25-051 | I12~I16 principal 1 route 1 expected=200 actual=200 | pass | HTTP 인증; 원출력 65행 |
| O25-052 | I02/I17 principal 1 route 1 민감 field 비노출 | pass | HTTP 인증; 원출력 66행 |
| O25-053 | I12~I16 principal 1 route 2 expected=200 actual=200 | pass | HTTP 인증; 원출력 67행 |
| O25-054 | I12~I16 principal 2 route 0 expected=403 actual=403 | pass | HTTP 인증; 원출력 68행 |
| O25-055 | I02/I17 principal 2 route 0 민감 field 비노출 | pass | HTTP 인증; 원출력 69행 |
| O25-056 | I12~I16 principal 2 route 1 expected=403 actual=403 | pass | HTTP 인증; 원출력 70행 |
| O25-057 | I02/I17 principal 2 route 1 민감 field 비노출 | pass | HTTP 인증; 원출력 71행 |
| O25-058 | I12~I16 principal 2 route 2 expected=403 actual=403 | pass | HTTP 인증; 원출력 72행 |
| O25-059 | I12~I16 principal 3 route 0 expected=200 actual=200 | pass | HTTP 인증; 원출력 73행 |
| O25-060 | I02 principal 3 허용 채널만 status 반환 | pass | HTTP 인증; 원출력 74행 |
| O25-061 | I01 principal 3 실제 비녹화 상태 | pass | HTTP 인증; 원출력 75행 |
| O25-062 | S07-http-observations-limited principal 3 | pass | HTTP 인증; 원출력 76행 |
| O25-063 | I02/I17 principal 3 route 0 민감 field 비노출 | pass | HTTP 인증; 원출력 77행 |
| O25-064 | I12~I16 principal 3 route 1 expected=403 actual=403 | pass | HTTP 인증; 원출력 78행 |
| O25-065 | I02/I17 principal 3 route 1 민감 field 비노출 | pass | HTTP 인증; 원출력 79행 |
| O25-066 | I12~I16 principal 3 route 2 expected=404 actual=404 | pass | HTTP 인증; 원출력 80행 |
| O25-067 | I12~I16 principal 4 route 0 expected=403 actual=403 | pass | HTTP 인증; 원출력 81행 |
| O25-068 | I02/I17 principal 4 route 0 민감 field 비노출 | pass | HTTP 인증; 원출력 82행 |
| O25-069 | I12~I16 principal 4 route 1 expected=403 actual=403 | pass | HTTP 인증; 원출력 83행 |
| O25-070 | I02/I17 principal 4 route 1 민감 field 비노출 | pass | HTTP 인증; 원출력 84행 |
| O25-071 | I12~I16 principal 4 route 2 expected=403 actual=403 | pass | HTTP 인증; 원출력 85행 |
| O25-072 | I15 미인증 API expected=401 actual=401 | pass | HTTP 인증; 원출력 86행 |
| O25-073 | I15 미인증 API expected=401 actual=401 | pass | HTTP 인증; 원출력 87행 |
| O25-074 | I15 미인증 API expected=401 actual=401 | pass | HTTP 인증; 원출력 88행 |
| O25-075 | I16 operator의 다른 채널 조회 거부 | pass | HTTP 인증; 원출력 89행 |
| O25-076 | I34 viewer 녹화 화면 거부 status=403 | pass | HTTP 인증; 원출력 90행 |
| O25-077 | I17 인증 fixture plaintext 저장 없음 | pass | HTTP 인증; 원출력 91행 |
| O25-078 | D3D-01 actual managed 원본과 jobComplete2출력·physical 검증 | pass | HTTP 수명; 원출력 97행 |
| O25-079 | D3D-07 valid MP4 free atom64MiB·최종 physical/hash 검증 | pass | HTTP 수명; 원출력 98행 |
| O25-080 | I24 큰 파일 status/길이 | pass | HTTP 수명; 원출력 102행 |
| O25-081 | I24 64MiB 전체 streaming hash 일치 | pass | HTTP 수명; 원출력 103행 |
| O25-082 | I25 전체 응답 뒤 hold0 | pass | HTTP 수명; 원출력 104행 |
| O25-083 | I24 256KiB 경계 Range byte 일치 | pass | HTTP 수명; 원출력 105행 |
| O25-084 | I26 disconnect 전 실제 hold1 | pass | HTTP 수명; 원출력 106행 |
| O25-085 | I26 disconnect 뒤 실제 hold0 | pass | HTTP 수명; 원출력 107행 |
| O25-086 | I26 disconnect 뒤 서버 health200 | pass | HTTP 수명; 원출력 108행 |
| O25-087 | I26 서버 종료 전 실제 hold1 | pass | HTTP 수명; 원출력 109행 |
| O25-088 | I26 활성 전송 중 정상 종료 | pass | HTTP 수명; 원출력 110행 |
| O25-089 | I26 정상 종료 후 영속 hold0 | pass | HTTP 수명; 원출력 111행 |
| O25-090 | D02-03 동일 source/channel/ns immutable snapshot 전달 | pass | 기본 구성; 원출력 114행 |
| O25-091 | D02-03 다른 channel 증거 혼합 거부 | pass | 기본 구성; 원출력 115행 |
| O25-092 | D02-03 stop namespace 증거 삭제 | pass | 기본 구성; 원출력 116행 |
| O25-093 | D02-03 cache capacity 이전 namespace eviction | pass | 기본 구성; 원출력 117행 |
| O25-094 | D02-03 전체 stop 후 publication/query 거부 | pass | 기본 구성; 원출력 118행 |
| O25-095 | D02-01 신규 root 자동 내구 store identity | pass | 기본 구성; 원출력 119행 |
| O25-096 | D02-01 재개방 동일 store identity | pass | 기본 구성; 원출력 120행 |
| O25-097 | D02-01 서로 다른 root 난수 identity 구별 | pass | 기본 구성; 원출력 121행 |
| O25-098 | D02-02 managed lease 동시 소유 거부 | pass | 기본 구성; 원출력 122행 |
| O25-099 | D02-01 명시 ID 기존 계약 유지 | pass | 기본 구성; 원출력 123행 |
| O25-100 | D02-02 명시 ID 충돌 원본 marker 보존 | pass | 기본 구성; 원출력 124행 |
| O25-101 | D02-02 같은 init 내구 ID 복구 | pass | 기본 구성; 원출력 125행 |
| O25-102 | D02-02 legacy nonempty 변환·삭제 거부 | pass | 기본 구성; 원출력 126행 |
| O25-103 | D02-02 손상/unknown marker 덮어쓰기 거부 | pass | 기본 구성; 원출력 127행 |
| O25-104 | D02-06 실제 H264 입력 준비 | pass | 기본 구성; 원출력 128행 |
| O25-105 | D02-05 실제 V2 finalized startup 미디어 전수 검사 | pass | 기본 구성; 원출력 131행 |
| O25-106 | D02-05 실제 V2 size/hash 손상 감지·catalog Mark | pass | 기본 구성; 원출력 132행 |
| O25-107 | D02-10 default 준비16s·500ms·33회 예산 | pass | 기본 구성; 원출력 133행 |
| O25-108 | D02-10 overflow 요청은60s/121회 capped 사유 보존 | pass | 기본 구성; 원출력 134행 |
| O25-109 | D02-06 on 구성의 동일 managed store/catalog writer 결박 | pass | 기본 구성; 원출력 135행 |
| O25-110 | D02-07 빈 저장소 runtime 복구 함수 | pass | 기본 구성; 원출력 136행 |
| O25-111 | D02-06 off managed 형식 유지·미디어 비생산 | pass | 기본 구성; 원출력 137행 |
| O25-112 | D02-04/11 raw key→numeric 참조·history null provider 접수·공개 record 불변 | pass | 기본 구성; 원출력 138행 |
| O25-113 | D02-11 raw stream/channel/sourcecontext 모순은 신규 저장·접수 없음 | pass | 기본 구성; 원출력 139행 |
| O25-114 | D02-06 off/on 재개방 동일 store identity | pass | 기본 구성; 원출력 142행 |
| O25-115 | D02-07 실제 producer 시작 전 runtime 복구 | pass | 기본 구성; 원출력 143행 |
| O25-116 | D02-06 실제 supervisor/session off 생산0·기존 segment 보존 | pass | 기본 구성; 원출력 144행 |
| O25-117 | D02-08 실제 source/session 종료 owner0 | pass | 기본 구성; 원출력 145행 |
| O25-118 | D02-06 off/on 재개방 동일 store identity | pass | 기본 구성; 원출력 146행 |
| O25-119 | D02-07 실제 producer 시작 전 runtime 복구 | pass | 기본 구성; 원출력 147행 |
| O25-120 | D02-06 실제 supervisor/session on 숫자 채널 V2 파일 생성 | pass | 기본 구성; 원출력 149행 |
| O25-121 | D02-08 실제 source/session 종료 owner0 | pass | 기본 구성; 원출력 150행 |
| O25-122 | D02-06 off/on 재개방 동일 store identity | pass | 기본 구성; 원출력 151행 |
| O25-123 | D02-07 실제 producer 시작 전 runtime 복구 | pass | 기본 구성; 원출력 152행 |
| O25-124 | D02-06 실제 supervisor/session off 생산0·기존 segment 보존 | pass | 기본 구성; 원출력 153행 |
| O25-125 | D02-08 실제 source/session 종료 owner0 | pass | 기본 구성; 원출력 154행 |
| O25-126 | D02-06 off/on 재개방 동일 store identity | pass | 기본 구성; 원출력 155행 |
| O25-127 | D02-07 실제 producer 시작 전 runtime 복구 | pass | 기본 구성; 원출력 156행 |
| O25-128 | D02-06 실제 supervisor/session on 숫자 채널 V2 파일 생성 | pass | 기본 구성; 원출력 158행 |
| O25-129 | D02-08 실제 source/session 종료 owner0 | pass | 기본 구성; 원출력 159행 |
| O25-130 | D02-04/10 실제 default10s+post5s 후행 finalize·동시 실제decoder cache·2출력 decode | pass | 기본 구성; 원출력 167행 |
| O25-131 | D02-01 crypto-off OS CSPRNG 생성/재개방 identity | pass | 기본 구성; 원출력 169행 |
| O25-132 | D02-08 provider 조회 재진입·동시 멱등·Stop 후 Submit 재검사 | pass | 기본 구성; 원출력 170행 |
| O25-133 | D02-07 runtime startup committed-parent recovery/보호/물리검사 순서 | pass | 기본 구성; 원출력 173행 |
| O25-134 | D02-07 runtime startup blocked-parent recovery/보호/물리검사 순서 | pass | 기본 구성; 원출력 176행 |
| O25-135 | D02-07 runtime startup intent recovery/보호/물리검사 순서 | pass | 기본 구성; 원출력 178행 |
| O25-136 | S11-CI09 product-1 healthy isolated ICE | pass | 실제 앱; 원출력 199행 |
| O25-137 | S11-CI07 run1 actual tuple EventRecord reference | pass | 실제 앱; 원출력 308행 |
| O25-138 | S11-CI07 run1 literal two output files all pages and independent terminal observation | pass | 실제 앱; 원출력 648행 |
| O25-139 | S11-CI07 run1 output1 HTTP200 | pass | 실제 앱; 원출력 650행 |
| O25-140 | S11-CI07 run1 output2 HTTP200 | pass | 실제 앱; 원출력 652행 |
| O25-141 | S11-CI11 product-1 dispatch publications settled before archive | pass | 실제 앱; 원출력 655행 |
| O25-142 | S11-CI08 product-1 exit0 ports returned | pass | 실제 앱; 원출력 659행 |
| O25-143 | S11-CI11 copy1 bytes/hash exact before Open | pass | 실제 앱; 원출력 660행 |
| O25-144 | S11-CI11 copy1 same-axis request two sources typed proof | pass | 실제 앱; 원출력 661행 |
| O25-145 | S11-CI11 original1 unchanged by copy recovery | pass | 실제 앱; 원출력 662행 |
| O25-146 | S11-CI07 output owned regular hash dj-baab35b94abef8ff5ed30681fe0d0944b3c8ce1019c06d37ed08dadc298f4d13-o0 | pass | 실제 앱; 원출력 663행 |
| O25-147 | S11-CI07 output owned regular hash dj-baab35b94abef8ff5ed30681fe0d0944b3c8ce1019c06d37ed08dadc298f4d13-o1 | pass | 실제 앱; 원출력 664행 |
| O25-148 | S11-CI09 product-2 healthy isolated ICE | pass | 실제 앱; 원출력 713행 |
| O25-149 | S11-CI08 retained output HTTP200 | pass | 실제 앱; 원출력 718행 |
| O25-150 | S11-CI08 retained output HTTP200 | pass | 실제 앱; 원출력 720행 |
| O25-151 | S11-CI07 run2 actual tuple EventRecord reference | pass | 실제 앱; 원출력 801행 |
| O25-152 | S11-CI07 run2 literal two output files all pages and independent terminal observation | pass | 실제 앱; 원출력 847행 |
| O25-153 | S11-CI07 run2 output1 HTTP200 | pass | 실제 앱; 원출력 849행 |
| O25-154 | S11-CI07 run2 output2 HTTP200 | pass | 실제 앱; 원출력 851행 |
| O25-155 | S11-CI08 retained IDs/hash and new event/reference/job/output separated | pass | 실제 앱; 원출력 853행 |
| O25-156 | S11-CI11 product-2 dispatch publications settled before archive | pass | 실제 앱; 원출력 855행 |
| O25-157 | S11-CI08 product-2 exit0 ports returned | pass | 실제 앱; 원출력 859행 |
| O25-158 | S11-CI11 copy2 bytes/hash exact before Open | pass | 실제 앱; 원출력 860행 |
| O25-159 | S11-CI11 copy2 same-axis request two sources typed proof | pass | 실제 앱; 원출력 861행 |
| O25-160 | S11-CI11 original2 unchanged by copy recovery | pass | 실제 앱; 원출력 862행 |
| O25-161 | S11-CI07 output owned regular hash dj-6358919945077e63ee9a0ad38f47160e975147b0395647b3d76cd8d58c41ff1d-o0 | pass | 실제 앱; 원출력 863행 |
| O25-162 | S11-CI07 output owned regular hash dj-6358919945077e63ee9a0ad38f47160e975147b0395647b3d76cd8d58c41ff1d-o1 | pass | 실제 앱; 원출력 864행 |

개별 성공 assertion 162행. 현행 5단계: 35 + 40 + 10 + 46 + 27 = 158개, 모두 exit 0·정리 통과. token start/end/consumed: 전용 집계 없어 미집계.

## 실패·수정·재검증 경계

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 초기 현행 통합 | 두 번째 기동의 그룹 구성원 4,111개를 단일 4,096개 경계로 거부 | fail | `o25-current-integration.log.gz`; 앞 4단계는 통과 |
| 페이지 집중 예상 RED | 새 대용량 허용·초과 거부 반례 52개 중 2개 실패 | fail | `o25-page-bound-red.log` |
| 영향 검사 추가 보완 | 기존 관측기의 명시적 작은 구성원 상한을 갱신하지 않아 83개 중 1개 실패 | fail | `o25-page-bound-green.log` |
| 페이지 집중 재검증 | 83/83·exit 0 | pass | `o25-page-bound-green2.log` |
| 페이지 수정 뒤 실제 앱 | 페이지 경계는 통과, 첫 접수 작업이 준비 후에도 뒤 세 작업보다 늦게 렌더되어 종료 때 취소 | fail | `o25-actual-app-after-bound.log.gz`; 30초 상한 변경 없음 |
| 격리 권한 선수조건 | sandbox localhost bind `EPERM`, 제품 기동 전 종료 | fail | `o25-actual-app-after-order.log`; 제품 회귀 아님 |
| 이벤트 렌더 순서 집중 회귀 | build와 실제 H.264 이벤트 통합·정렬/동시각/node 보존 검사 통과 | pass | `o25-worker-order.log`, exit 0 |
| 실제 앱 재확인 | 두 기동의 출력 2개씩·HTTP/해시·재기동·정리, 27/27 | pass | `o25-actual-app-after-order-escalated.log.gz`, exit 0 |
| 현행 5단계 최종 | API 35·인증 40·수명 10·기본 46·실제 앱 27, 전체 158개 | pass | `o25-current-integration-final.log.gz`, exit 0·146,779ms; HTTP 최대 3,392ms/4,000ms |

## 작업 소유 임시 산출물 정리

검증기가 소유한 정확한 임시 root만 확인했다. 실패 자료의 비민감 진단 JSON과 압축 원출력은 저장소에 보존하며 원본 영상·임시 registry는 보존하지 않았다. 아래 여섯 root는 실행 로그의 삭제 결과와 사후 파일시스템 부재를 대조했다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-integration-YH9lwg` | 첫 현행 통합 실패 | 395,549,318바이트 | 검증기 소유 root 삭제 | 부재, 실패 0·두 프로세스 정리 | `o25-current-integration.log.gz` |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-integration-Zqflrm` | 페이지 보완 뒤 작업 실패 | 373,862,968바이트 | 검증기 소유 root 삭제 | 부재, 실패 0·두 프로세스 정리 | `o25-actual-app-after-bound.log.gz` |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-integration-7K8m1P` | sandbox 권한 실패 | 23,309,952바이트 | 검증기 소유 root 삭제 | 부재, 실패 0·제품 미기동 | `o25-actual-app-after-order.log` |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-event-integration.TzxoRG` | 이벤트 집중 회귀 | 16,548,641바이트 | 검증기 소유 root 삭제 | 부재 | `o25-worker-order.log` |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-integration-Ee3Nog` | 실제 앱 재확인 | 399,405,928바이트 | 검증기 소유 root 삭제 | 부재, 실패 0·두 프로세스 정리 | `o25-actual-app-after-order-escalated.log.gz` |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-integration-0P8xGH` | 현행 5단계 실제 앱 | 395,045,654바이트 | 검증기 소유 root 삭제 | 부재, 실패 0·두 프로세스 정리 | `o25-current-integration-final.log.gz` |
