# LP26-O14 현행 5단계 통합 개별 결과

독자: v4.1.0 S11 검증 담당자. 수명: 릴리즈 검증 기록. 정책 기준은 AGENTS.md, 원출력은 [현행 5단계 로그](o14-full-integration.log)다. 이 표는 실제 출력된 개별 검사·정리 행을 빠짐없이 옮긴 것이다. 내부 카운트가 개별 행으로 출력되지 않은 것은 새 PASS로 만들어내지 않는다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 개별 검사-001 | D3D-01 actual managed 원본과 jobComplete2출력·physical 검증 | pass | 원출력 4행 |
| 정리-002 | 종료·임시 저장소 및 포트 정리 | pass | 원출력 5행 |
| 입력 준비-003 | D3D-01 generated2출력 manifest/containment/hash | pass | 원출력 7행 |
| HTTP-004 | I01 실제 status projection | pass | 원출력 8행 |
| HTTP-005 | I03/I06 실제 HTTP generated2출력·jobComplete timeline | pass | 원출력 9행 |
| HTTP-006 | I07 HTTP 전체/부분 중첩 원본 구별 | pass | 원출력 10행 |
| HTTP-007 | D3D-02 accepted 미확인 독립 목록 | pass | 원출력 11행 |
| HTTP-008 | D3D-02 문자열 시간·요청축 보존 | pass | 원출력 12행 |
| HTTP-009 | D3D-04 actual Event output 전체 byte/hash·MIME | pass | 원출력 13행 |
| HTTP-010 | D3D-04 actual Event output 전체 byte/hash·MIME | pass | 원출력 14행 |
| HTTP-011 | I17 HTTP 내부 path 비노출 | pass | 원출력 15행 |
| HTTP-012 | I04 HTTP 잘못된 query 거부 8 | pass | 원출력 16행 |
| HTTP-013 | I04 HTTP 잘못된 query 거부 9 | pass | 원출력 17행 |
| HTTP-014 | I04 HTTP 잘못된 query 거부 10 | pass | 원출력 18행 |
| HTTP-015 | I04 HTTP 잘못된 query 거부 11 | pass | 원출력 19행 |
| HTTP-016 | I04 HTTP 잘못된 query 거부 12 | pass | 원출력 20행 |
| HTTP-017 | I20 Range status expected=206 actual=206 | pass | 원출력 21행 |
| HTTP-018 | I20 Range Content-Range 일치 | pass | 원출력 22행 |
| HTTP-019 | I20 Range body expected=4 actual=4 byte 일치 | pass | 원출력 23행 |
| HTTP-020 | I20 range status expected=206 actual=206 | pass | 원출력 24행 |
| HTTP-021 | I20 range Content-Range 일치 | pass | 원출력 25행 |
| HTTP-022 | I20 range body expected=4 actual=4 byte 일치 | pass | 원출력 26행 |
| HTTP-023 | I20 rAnGe status expected=206 actual=206 | pass | 원출력 27행 |
| HTTP-024 | I20 rAnGe Content-Range 일치 | pass | 원출력 28행 |
| HTTP-025 | I20 rAnGe body expected=4 actual=4 byte 일치 | pass | 원출력 29행 |
| HTTP-026 | I20/I21 실제 Range bytes=2-5 | pass | 원출력 30행 |
| HTTP-027 | I20/I21 실제 Range bytes=10- | pass | 원출력 31행 |
| HTTP-028 | I20/I21 실제 Range bytes=-7 | pass | 원출력 32행 |
| HTTP-029 | I24 HTTP 전체 byte 일치 | pass | 원출력 33행 |
| HTTP-030 | I22 HTTP 범위 거부 bytes=1-0 | pass | 원출력 34행 |
| HTTP-031 | I22 HTTP 범위 거부 bytes=-0 | pass | 원출력 35행 |
| HTTP-032 | I22 HTTP 범위 거부 bytes=0-1,3-4 | pass | 원출력 36행 |
| HTTP-033 | I22 HTTP 범위 거부 bytes=18446744073709551616- | pass | 원출력 37행 |
| HTTP-034 | I22 HTTP 범위 거부 bytes=0-11002 | pass | 원출력 38행 |
| HTTP-035 | I22 HTTP 범위 거부 invalid | pass | 원출력 39행 |
| HTTP-036 | I23 실제 HEAD full | pass | 원출력 40행 |
| HTTP-037 | I23 실제 HEAD bytes=2-5 | pass | 원출력 41행 |
| HTTP-038 | I17 HTTP 없는 opaque ID 거부 | pass | 원출력 42행 |
| 정리-039 | 종료·임시 저장소 및 포트 정리 | pass | 원출력 44행 |
| 개별 검사-040 | D3D-01 actual managed 원본과 jobComplete2출력·physical 검증 | pass | 원출력 48행 |
| 정리-041 | 종료·임시 저장소 및 포트 정리 | pass | 원출력 49행 |
| 입력 준비-042 | D3D-01 generated2출력 manifest/containment/hash | pass | 원출력 51행 |
| 인증-043 | I12~I16 principal 0 route 0 expected=200 actual=200 | pass | 원출력 52행 |
| 인증-044 | I02 principal 0 허용 채널만 status 반환 | pass | 원출력 53행 |
| 인증-045 | I01 principal 0 실제 비녹화 상태 | pass | 원출력 54행 |
| 인증-046 | S07-http-observations-global | pass | 원출력 55행 |
| 인증-047 | I02/I17 principal 0 route 0 민감 field 비노출 | pass | 원출력 56행 |
| 인증-048 | I12~I16 principal 0 route 1 expected=200 actual=200 | pass | 원출력 57행 |
| 인증-049 | I02/I17 principal 0 route 1 민감 field 비노출 | pass | 원출력 58행 |
| 인증-050 | I12~I16 principal 0 route 2 expected=200 actual=200 | pass | 원출력 59행 |
| 인증-051 | I12~I16 principal 1 route 0 expected=200 actual=200 | pass | 원출력 60행 |
| 인증-052 | I02 principal 1 허용 채널만 status 반환 | pass | 원출력 61행 |
| 인증-053 | I01 principal 1 실제 비녹화 상태 | pass | 원출력 62행 |
| 인증-054 | S07-http-observations-limited principal 1 | pass | 원출력 63행 |
| 인증-055 | I02/I17 principal 1 route 0 민감 field 비노출 | pass | 원출력 64행 |
| 인증-056 | I12~I16 principal 1 route 1 expected=200 actual=200 | pass | 원출력 65행 |
| 인증-057 | I02/I17 principal 1 route 1 민감 field 비노출 | pass | 원출력 66행 |
| 인증-058 | I12~I16 principal 1 route 2 expected=200 actual=200 | pass | 원출력 67행 |
| 인증-059 | I12~I16 principal 2 route 0 expected=403 actual=403 | pass | 원출력 68행 |
| 인증-060 | I02/I17 principal 2 route 0 민감 field 비노출 | pass | 원출력 69행 |
| 인증-061 | I12~I16 principal 2 route 1 expected=403 actual=403 | pass | 원출력 70행 |
| 인증-062 | I02/I17 principal 2 route 1 민감 field 비노출 | pass | 원출력 71행 |
| 인증-063 | I12~I16 principal 2 route 2 expected=403 actual=403 | pass | 원출력 72행 |
| 인증-064 | I12~I16 principal 3 route 0 expected=200 actual=200 | pass | 원출력 73행 |
| 인증-065 | I02 principal 3 허용 채널만 status 반환 | pass | 원출력 74행 |
| 인증-066 | I01 principal 3 실제 비녹화 상태 | pass | 원출력 75행 |
| 인증-067 | S07-http-observations-limited principal 3 | pass | 원출력 76행 |
| 인증-068 | I02/I17 principal 3 route 0 민감 field 비노출 | pass | 원출력 77행 |
| 인증-069 | I12~I16 principal 3 route 1 expected=403 actual=403 | pass | 원출력 78행 |
| 인증-070 | I02/I17 principal 3 route 1 민감 field 비노출 | pass | 원출력 79행 |
| 인증-071 | I12~I16 principal 3 route 2 expected=404 actual=404 | pass | 원출력 80행 |
| 인증-072 | I12~I16 principal 4 route 0 expected=403 actual=403 | pass | 원출력 81행 |
| 인증-073 | I02/I17 principal 4 route 0 민감 field 비노출 | pass | 원출력 82행 |
| 인증-074 | I12~I16 principal 4 route 1 expected=403 actual=403 | pass | 원출력 83행 |
| 인증-075 | I02/I17 principal 4 route 1 민감 field 비노출 | pass | 원출력 84행 |
| 인증-076 | I12~I16 principal 4 route 2 expected=403 actual=403 | pass | 원출력 85행 |
| 인증-077 | I15 미인증 API expected=401 actual=401 | pass | 원출력 86행 |
| 인증-078 | I15 미인증 API expected=401 actual=401 | pass | 원출력 87행 |
| 인증-079 | I15 미인증 API expected=401 actual=401 | pass | 원출력 88행 |
| 인증-080 | I16 operator의 다른 채널 조회 거부 | pass | 원출력 89행 |
| 인증-081 | I34 viewer 녹화 화면 거부 status=403 | pass | 원출력 90행 |
| 인증-082 | I17 인증 fixture plaintext 저장 없음 | pass | 원출력 91행 |
| 정리-083 | 종료·임시 저장소 및 포트 정리 | pass | 원출력 93행 |
| 개별 검사-084 | D3D-01 actual managed 원본과 jobComplete2출력·physical 검증 | pass | 원출력 97행 |
| 개별 검사-085 | D3D-07 valid MP4 free atom64MiB·최종 physical/hash 검증 | pass | 원출력 98행 |
| 정리-086 | 종료·임시 저장소 및 포트 정리 | pass | 원출력 99행 |
| 입력 준비-087 | D3D-01 generated2출력 manifest/containment/hash | pass | 원출력 101행 |
| 수명주기-088 | I24 큰 파일 status/길이 | pass | 원출력 102행 |
| 수명주기-089 | I24 64MiB 전체 streaming hash 일치 | pass | 원출력 103행 |
| 수명주기-090 | I25 전체 응답 뒤 hold0 | pass | 원출력 104행 |
| 수명주기-091 | I24 256KiB 경계 Range byte 일치 | pass | 원출력 105행 |
| 수명주기-092 | I26 disconnect 전 실제 hold1 | pass | 원출력 106행 |
| 수명주기-093 | I26 disconnect 뒤 실제 hold0 | pass | 원출력 107행 |
| 수명주기-094 | I26 disconnect 뒤 서버 health200 | pass | 원출력 108행 |
| 수명주기-095 | I26 서버 종료 전 실제 hold1 | pass | 원출력 109행 |
| 수명주기-096 | I26 활성 전송 중 정상 종료 | pass | 원출력 110행 |
| 수명주기-097 | I26 정상 종료 후 영속 hold0 | pass | 원출력 111행 |
| 정리-098 | 종료·임시 저장소 및 포트 정리 | pass | 원출력 113행 |
| 개별 검사-099 | D02-03 동일 source/channel/ns immutable snapshot 전달 | pass | 원출력 114행 |
| 개별 검사-100 | D02-03 다른 channel 증거 혼합 거부 | pass | 원출력 115행 |
| 개별 검사-101 | D02-03 stop namespace 증거 삭제 | pass | 원출력 116행 |
| 개별 검사-102 | D02-03 cache capacity 이전 namespace eviction | pass | 원출력 117행 |
| 개별 검사-103 | D02-03 전체 stop 후 publication/query 거부 | pass | 원출력 118행 |
| 개별 검사-104 | D02-01 신규 root 자동 내구 store identity | pass | 원출력 119행 |
| 개별 검사-105 | D02-01 재개방 동일 store identity | pass | 원출력 120행 |
| 개별 검사-106 | D02-01 서로 다른 root 난수 identity 구별 | pass | 원출력 121행 |
| 개별 검사-107 | D02-02 managed lease 동시 소유 거부 | pass | 원출력 122행 |
| 개별 검사-108 | D02-01 명시 ID 기존 계약 유지 | pass | 원출력 123행 |
| 개별 검사-109 | D02-02 명시 ID 충돌 원본 marker 보존 | pass | 원출력 124행 |
| 개별 검사-110 | D02-02 같은 init 내구 ID 복구 | pass | 원출력 125행 |
| 개별 검사-111 | D02-02 legacy nonempty 변환·삭제 거부 | pass | 원출력 126행 |
| 개별 검사-112 | D02-02 손상/unknown marker 덮어쓰기 거부 | pass | 원출력 127행 |
| 개별 검사-113 | D02-06 실제 H264 입력 준비 | pass | 원출력 128행 |
| 개별 검사-114 | D02-05 실제 V2 finalized startup 미디어 전수 검사 | pass | 원출력 131행 |
| 개별 검사-115 | D02-05 실제 V2 size/hash 손상 감지·catalog Mark | pass | 원출력 132행 |
| 개별 검사-116 | D02-10 default 준비16s·500ms·33회 예산 | pass | 원출력 133행 |
| 개별 검사-117 | D02-10 overflow 요청은60s/121회 capped 사유 보존 | pass | 원출력 134행 |
| 개별 검사-118 | D02-06 on 구성의 동일 managed store/catalog writer 결박 | pass | 원출력 135행 |
| 개별 검사-119 | D02-07 빈 저장소 runtime 복구 함수 | pass | 원출력 136행 |
| 개별 검사-120 | D02-06 off managed 형식 유지·미디어 비생산 | pass | 원출력 137행 |
| 개별 검사-121 | D02-04/11 raw key→numeric 참조·history null provider 접수·공개 record 불변 | pass | 원출력 138행 |
| 개별 검사-122 | D02-11 raw stream/channel/sourcecontext 모순은 신규 저장·접수 없음 | pass | 원출력 139행 |
| 개별 검사-123 | D02-06 off/on 재개방 동일 store identity | pass | 원출력 142행 |
| 개별 검사-124 | D02-07 실제 producer 시작 전 runtime 복구 | pass | 원출력 143행 |
| 개별 검사-125 | D02-06 실제 supervisor/session off 생산0·기존 segment 보존 | pass | 원출력 144행 |
| 개별 검사-126 | D02-08 실제 source/session 종료 owner0 | pass | 원출력 145행 |
| 개별 검사-127 | D02-06 off/on 재개방 동일 store identity | pass | 원출력 146행 |
| 개별 검사-128 | D02-07 실제 producer 시작 전 runtime 복구 | pass | 원출력 147행 |
| 개별 검사-129 | D02-06 실제 supervisor/session on 숫자 채널 V2 파일 생성 | pass | 원출력 149행 |
| 개별 검사-130 | D02-08 실제 source/session 종료 owner0 | pass | 원출력 150행 |
| 개별 검사-131 | D02-06 off/on 재개방 동일 store identity | pass | 원출력 151행 |
| 개별 검사-132 | D02-07 실제 producer 시작 전 runtime 복구 | pass | 원출력 152행 |
| 개별 검사-133 | D02-06 실제 supervisor/session off 생산0·기존 segment 보존 | pass | 원출력 153행 |
| 개별 검사-134 | D02-08 실제 source/session 종료 owner0 | pass | 원출력 154행 |
| 개별 검사-135 | D02-06 off/on 재개방 동일 store identity | pass | 원출력 155행 |
| 개별 검사-136 | D02-07 실제 producer 시작 전 runtime 복구 | pass | 원출력 156행 |
| 개별 검사-137 | D02-06 실제 supervisor/session on 숫자 채널 V2 파일 생성 | pass | 원출력 158행 |
| 개별 검사-138 | D02-08 실제 source/session 종료 owner0 | pass | 원출력 159행 |
| 개별 검사-139 | D02-04/10 실제 default10s+post5s 후행 finalize·동시 실제decoder cache·2출력 decode | pass | 원출력 167행 |
| 개별 검사-140 | D02-01 crypto-off OS CSPRNG 생성/재개방 identity | pass | 원출력 169행 |
| 개별 검사-141 | D02-08 provider 조회 재진입·동시 멱등·Stop 후 Submit 재검사 | pass | 원출력 170행 |
| 개별 검사-142 | D02-07 runtime startup committed-parent recovery/보호/물리검사 순서 | pass | 원출력 173행 |
| 개별 검사-143 | D02-07 runtime startup blocked-parent recovery/보호/물리검사 순서 | pass | 원출력 176행 |
| 개별 검사-144 | D02-07 runtime startup intent recovery/보호/물리검사 순서 | pass | 원출력 178행 |
| 정리-145 | 종료·임시 저장소 및 포트 정리 | pass | 원출력 179행 |
| 개별 검사-146 | S11-CI09 product-1 healthy isolated ICE | pass | 원출력 199행 |
| 개별 검사-147 | S11-CI07 run1 actual tuple EventRecord reference | pass | 원출력 308행 |
| 개별 검사-148 | S11-CI07 run1 literal two output files all pages | pass | 원출력 634행 |
| 개별 검사-149 | S11-CI07 run1 output1 HTTP200 | pass | 원출력 636행 |
| 개별 검사-150 | S11-CI07 run1 output2 HTTP200 | pass | 원출력 638행 |
| 개별 검사-151 | S11-CI11 product-1 dispatch publications settled before archive | pass | 원출력 641행 |
| 개별 검사-152 | S11-CI08 product-1 exit0 ports returned | pass | 원출력 645행 |
| 개별 검사-153 | S11-CI11 copy1 bytes/hash exact before Open | pass | 원출력 646행 |
| 개별 검사-154 | S11-CI11 copy1 same-axis request two sources typed proof | pass | 원출력 647행 |
| 개별 검사-155 | S11-CI11 original1 unchanged by copy recovery | pass | 원출력 648행 |
| 개별 검사-156 | S11-CI07 output owned regular hash dj-9257aa65d1831705e33953c17d6a2e098d1d61f8d422fbb9f007dffe6c0597ff-o0 | pass | 원출력 649행 |
| 개별 검사-157 | S11-CI07 output owned regular hash dj-9257aa65d1831705e33953c17d6a2e098d1d61f8d422fbb9f007dffe6c0597ff-o1 | pass | 원출력 650행 |
| 개별 검사-158 | S11-CI09 product-2 healthy isolated ICE | pass | 원출력 701행 |
| 개별 검사-159 | S11-CI08 retained output HTTP200 | pass | 원출력 706행 |
| 개별 검사-160 | S11-CI08 retained output HTTP200 | pass | 원출력 708행 |
| 개별 검사-161 | S11-CI07 run2 actual tuple EventRecord reference | pass | 원출력 787행 |
| 개별 검사-162 | S11-CI07 run2 literal two output files all pages | pass | 원출력 839행 |
| 개별 검사-163 | S11-CI07 run2 output1 HTTP200 | pass | 원출력 841행 |
| 개별 검사-164 | S11-CI07 run2 output2 HTTP200 | pass | 원출력 843행 |
| 개별 검사-165 | S11-CI08 retained IDs/hash and new event/reference/job/output separated | pass | 원출력 845행 |
| 개별 검사-166 | S11-CI11 product-2 dispatch publications settled before archive | pass | 원출력 847행 |
| 개별 검사-167 | S11-CI08 product-2 exit0 ports returned | pass | 원출력 851행 |
| 개별 검사-168 | S11-CI11 copy2 bytes/hash exact before Open | pass | 원출력 852행 |
| 개별 검사-169 | S11-CI11 copy2 same-axis request two sources typed proof | pass | 원출력 853행 |
| 개별 검사-170 | S11-CI11 original2 unchanged by copy recovery | pass | 원출력 854행 |
| 개별 검사-171 | S11-CI07 output owned regular hash dj-23241cbb6e881acec4fd204702ceb79f8c1a0e24d90b0465b594f052ed165d6b-o0 | pass | 원출력 855행 |
| 개별 검사-172 | S11-CI07 output owned regular hash dj-23241cbb6e881acec4fd204702ceb79f8c1a0e24d90b0465b594f052ed165d6b-o1 | pass | 원출력 856행 |
| 정리-173 | 종료·임시 저장소 및 포트 정리 | pass | 원출력 1514행 |

원출력 개별 행 173개 = pass 77 + seed 3 + HTTP 35 + 인증 40 + 수명주기 10 + 정리 8. 실행기 집계는 HTTP API35·인증40·lifecycle10·default46·실제 앱27이며 currentIntegrationExecutionPass=true다. 두 집계의 의미가 다르므로 합산해 새로운 테스트 수를 만들지 않는다. fullFoundationPass=false, 자원·장시간·UI는 미검증이다.
