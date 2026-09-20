## LP26 현행 검증 준비

### 합산 예산·자원 요약 최종 보완 결과

현재 유효 결과는 observer 자체60·실제 단기71, 기존 영향169·현행 통합 자체50·UI 준비86으로 합계436검사다.
서로 다른 묶음의 준비/회귀 assertion 총합이며 기능 전수나 제품 릴리즈 PASS 총계가 아니다.
이전57개 자체검사와 실제 단기는 보완 전 이력으로 보존하며, 아래 같은 소스의 최종 결과를 우선한다.
실제 단기 46.599초, 녹화 관측30.155초, 두 채널 각각14확정/12삭제 후 정상 disable·재시작·재활성 확인.
3프로세스 정상 exit0·모든 HTTP/RTSP 포트 반환·UDP 종료. 서버 진단 고정 오류분류0, raw 원문 공개 없음.
RSS 첫94,240,768B→마지막237,453,312B, FD31→31, thread29→25; warmup5분 미충족으로 자원추세 합격 판정은 하지 않았다.
30분/120분/실제UI는 미실행이다. 제품 실행파일·archive의 LP25 SHA가 유지되어 제품 빌드/실제156검사를 반복하지 않는다.

#### observer-shared-self

명령: `bash scripts/internal/verify_recording_current_observer.sh --self-test`, exit0. 원출력 [lp26-observer-shared-self.log](lp26-observer-shared-self.log), PASS 60·FAIL0.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 001 LP26-O02 final stopped tail must be complete and fully drained | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 002 LP26-O05 initial plus added channels exact disabled on restart | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 003 LP26-O01 actual managed writer fixture | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 004 LP26-O01 native exact row count and two channel segments | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 005 LP26-O01 compact excludes binding samples source URL and payload | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 006 LP26-O02 actual store read preserves original bytes | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 007 LP26-O05 actual deleted and survivor Catalog recovery twice | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 008 LP26-O01 known envelope segment_finalized | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 009 LP26-O01 known envelope event_link_created | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 010 LP26-O01 known envelope observation_put | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 011 LP26-O01 known envelope observation_v2_put | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 012 LP26-O01 known envelope deletion_requested | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 013 LP26-O01 known envelope deletion_completed | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 014 LP26-O01 known envelope corruption_detected | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 015 LP26-O01 known envelope consumer_reference_put | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 016 LP26-O01 known envelope derived_reference_accepted | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 017 LP26-O01 known envelope referenced_observation_put | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 018 LP26-O01 known envelope derived_job_intent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 019 LP26-O01 known envelope derived_job_files | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 020 LP26-O01 known envelope derived_job_ready | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 021 LP26-O01 known envelope derived_job_committed | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 022 LP26-O01 known envelope derived_job_complete | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 023 LP26-O01 known envelope derived_job_failed | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 024 LP26-O01 reject unknown | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 025 LP26-O01 reject duplicate-key | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 026 LP26-O01 reject invalid-json | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 027 LP26-O01 reject unsafe-id | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 028 LP26-O01 reject bad-segment | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 029 LP26-O01 reject bad-state | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 030 LP26-O01 reject bad-deleted | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 031 LP26-O02 partial line not consumed | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 032 LP26-O02 partial append consumed once | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 033 LP26-O02 exact checkpoint receipt prefix and suffix | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 034 LP26-O02 checkpoint changed refused | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 035 LP26-O02 checkpoint missing refused | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 036 LP26-O02 truncation latched | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 037 LP26-O02 duplicate mutation rejected | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 038 LP26-O02 symlink rejected | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 039 LP26-O02 observer and progress share one total identity budget | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 040 LP26-O02 total byte cap and invalid cap cannot be increased | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 041 LP26-O03 actual native order advances independent of UTC | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 042 LP26-O03 huge order unknown UTC new epoch PTS reset accepted | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 043 LP26-O03 duplicate segment rejected | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 044 LP26-O03 persistent order regression rejected | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 045 LP26-O03 completion without pending rejected | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 046 LP26-O03 pending completed physical target once | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 047 LP26-O03 changed tombstone rejected | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 048 LP26-O04 stall clock and shortened finish rejected | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 049 LP26-O04 exactly120 argument only | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 050 LP26-O04 monotonic sample independent wallclock | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 051 LP26-O04 pause time cannot satisfy 120 minutes | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 052 LP26-O04 current resources use monotonic not wallclock | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 053 LP26-O04 literal delta gap and insufficient warmup statistics | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 054 LP26-O04 invalid resource rss | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 055 LP26-O04 invalid resource fd | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 056 LP26-O04 invalid resource pid | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 057 LP26-O04 invalid resource identity | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 058 LP26-O04 invalid resource counter | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 059 LP26-O04 invalid resource clock | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 060 LP26-O05 current public dispatch avoids legacy longrun prelude | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |

#### observer-shared-app-final

명령: `bash scripts/internal/verify_recording_current_observer.sh --app-observe`, exit0. 원출력 [lp26-observer-shared-app-final.log](lp26-observer-shared-app-final.log), PASS 71·FAIL0.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 001 LP26-O05 fixed current executable | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 002 LP26-O05 original bounded retention fixture | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 003 LP26-O05 distinct canonical sources | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 004 LP26-O05 isolated server healthy | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 005 LP26-O05 independent initial channels | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 006 LP26-O05 active 9101 | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 007 LP26-O05 active 9201 | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 008 LP26-O05 active 9101 | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 009 LP26-O05 active 9201 | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 010 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 011 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 012 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 013 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 014 LP26-O05 active 9101 | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 015 LP26-O05 active 9201 | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 016 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 017 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 018 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 019 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 020 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 021 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 022 LP26-O05 active 9101 | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 023 LP26-O05 active 9201 | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 024 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 025 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 026 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 027 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 028 LP26-O05 active 9101 | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 029 LP26-O05 active 9201 | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 030 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 031 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 032 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 033 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 034 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 035 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 036 LP26-O05 active 9101 | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 037 LP26-O05 active 9201 | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 038 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 039 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 040 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 041 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 042 LP26-O04 sample coverage | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 043 LP26-O05 both channels retained and progressed | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 044 LP26-O05 setting 9101 false | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 045 LP26-O05 setting 9201 false | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 046 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 047 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 048 LP26-O02 closed journal no partial tail | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 049 LP26-O05 stopped copy native catalog recovery | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 050 LP26-O05 native surviving and deleted states | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 051 LP26-O05 original journal bytes unchanged | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 052 LP26-O05 recovery copy cleanup | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 053 LP26-O05 isolated server healthy | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 054 LP26-O05 disabled restart | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 055 LP26-O05 stopped copy native catalog recovery | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 056 LP26-O05 native surviving and deleted states | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 057 LP26-O05 original journal bytes unchanged | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 058 LP26-O05 recovery copy cleanup | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 059 LP26-O05 restart exact catalog media state | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 060 LP26-O05 isolated server healthy | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 061 LP26-O05 setting 9101 true | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 062 LP26-O05 setting 9201 true | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 063 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 064 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 065 LP26-O05 reenabled recording after restart | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 066 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 067 LP26-O02 final restart closed journal no partial tail | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 068 LP26-O05 stopped copy native catalog recovery | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 069 LP26-O05 native surviving and deleted states | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 070 LP26-O05 original journal bytes unchanged | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |
| 071 LP26-O05 recovery copy cleanup | 위 명령의 독립 assertion | PASS | 최종 합산 예산/자원 요약 코드 |

#### 최종 실행 정리

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-observer-FTcocG | 소유 실행/복제 root | 7724126B | 도구 삭제 | absent=true | self 로그 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-observer-4s2VCX | 소유 실행/복제 root | 293560500B | 도구 삭제 | absent=true | short-partial 로그 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-observer-copy-5NR9sp | 소유 실행/복제 root | 131463175B | 도구 삭제 | absent=true | short-final 로그 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-observer-copy-Y2RyxI | 소유 실행/복제 root | 131463175B | 도구 삭제 | absent=true | short-final 로그 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-observer-copy-PiFyKs | 소유 실행/복제 root | 158252429B | 도구 삭제 | absent=true | short-final 로그 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-observer-hIX9M5 | 소유 실행/복제 root | 291996645B | 도구 삭제 | absent=true | short-final 로그 |


### 마감 정합 확인

제품 src/include/CMake/VERSION 변경 없음. 현재 소스·기존 build/archive SHA는 [지문 기록](lp26-source-fingerprint.log)을 따른다.
관련 build는 재실행하지 않았고 새 C++ 검증 helper만 기존 runtime archive에 대해 -Werror로 컴파일했다.
전체 S11 준비 완료가 아니라 요청한 관측/seed 현행화와 실행 연결 대조의 마감이다. 초기 고정ID/복합 요구·ENV12/HW 영향·구형 정리·S10 고정은 남는다.
실제 browser/30분/120분·PR/merge/tag/Release·외부 실기기 실행 없음. 운영 데이터·패키지 삭제 없음.

#### script-inventory-final

명령 `./server.sh verify-script-inventory`, exit0. [원출력](lp26-script-inventory-final.log). 스크립트 검사는 신규 소스를 stage한 뒤 정식 사전등록에 따라 재실행했다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 dispatch parser recognizes explicit bash and node interpreters | 위 명령의 개별 정합 assertion | PASS | 실제 UI/제품 전수 판정 아님 |
| 2 server.sh dispatch targets exist and are executable | 위 명령의 개별 정합 assertion | PASS | 실제 UI/제품 전수 판정 아님 |
| 3 documented server.sh commands resolve to dispatch table | 위 명령의 개별 정합 assertion | PASS | 실제 UI/제품 전수 판정 아님 |
| 4 tracked scripts are classified and referenced | 위 명령의 개별 정합 assertion | PASS | 실제 UI/제품 전수 판정 아님 |
| 5 project inventory delegates script file inventory to this verifier | 위 명령의 개별 정합 assertion | PASS | 실제 UI/제품 전수 판정 아님 |
| 6 project inventory maps verifier families without duplicating dispatch details | 위 명령의 개별 정합 assertion | PASS | 실제 UI/제품 전수 판정 아님 |
| 7 CMake does not define a separate untracked CTest registry | 위 명령의 개별 정합 assertion | PASS | 실제 UI/제품 전수 판정 아님 |
| 8 test entry scripts are reachable from test_all | 위 명령의 개별 정합 assertion | PASS | 실제 UI/제품 전수 판정 아님 |
| 9 auth verifier has no hardcoded test password defaults | 위 명령의 개별 정합 assertion | PASS | 실제 UI/제품 전수 판정 아님 |
| 10 VA EventRecord dispatch verifier fails early and dispatches every poll by default | 위 명령의 개별 정합 assertion | PASS | 실제 UI/제품 전수 판정 아님 |
| 11 critical verifier pass output avoids grouped feature-result wording | 위 명령의 개별 정합 assertion | PASS | 실제 UI/제품 전수 판정 아님 |
| 12 user-facing JS option parsers reject unknown options | 위 명령의 개별 정합 assertion | PASS | 실제 UI/제품 전수 판정 아님 |

#### docs-assets-final

명령 `./server.sh verify-docs-ui-assets`, exit0. [원출력](lp26-docs-assets-final.log). 스크립트 검사는 신규 소스를 stage한 뒤 정식 사전등록에 따라 재실행했다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 1 README uses only representative product UI screenshots | 위 명령의 개별 정합 assertion | PASS | 실제 UI/제품 전수 판정 아님 |
| 2 English README uses English UI screenshots | 위 명령의 개별 정합 assertion | PASS | 실제 UI/제품 전수 판정 아님 |
| 3 UI guide keeps product screenshots in the shared asset set | 위 명령의 개별 정합 assertion | PASS | 실제 UI/제품 전수 판정 아님 |
| 4 docs UI asset policy documents capture rules | 위 명령의 개별 정합 assertion | PASS | 실제 UI/제품 전수 판정 아님 |
| 5 managed UI asset manifest stays complete | 위 명령의 개별 정합 assertion | PASS | 실제 UI/제품 전수 판정 아님 |
| 6 capture script owns every documented UI asset | 위 명령의 개별 정합 assertion | PASS | 실제 UI/제품 전수 판정 아님 |
| 7 docs capture covers current screenshots | 위 명령의 개별 정합 assertion | PASS | 실제 UI/제품 전수 판정 아님 |
| 8 representative screenshot docs do not point at stale visual baselines | 위 명령의 개별 정합 assertion | PASS | 실제 UI/제품 전수 판정 아님 |
| 9 docs UI asset directory contains managed PNG files | 위 명령의 개별 정합 assertion | PASS | 실제 UI/제품 전수 판정 아님 |
| 10 VA documentation images keep full video frame bounds | 위 명령의 개별 정합 assertion | PASS | 실제 UI/제품 전수 판정 아님 |

문서 링크 최신 결과는 [원출력](lp26-docs-links-final.log)에 보존한다. 모든 마감 기록 연결 뒤 exit0, md287/링크9325/이미지22/anchor132/index76/제외201/실패0을 확인했다.
`git diff --check` exit0, 소스14개와 기존 binary/archive2개 지문 일치(16개), 최신 실행root6개 부재를 확인했다.
지문 파일 설명3행은 shasum의 형식 경고이며16개 모두 OK였다. 제품/빌드 경고로 바꾸지 않는다. staged diffcheck는 커밋 직전에 다시 확인한다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 문서 링크 마감 | `./server.sh verify-docs-links`, exit0, 위9325링크 전수 | PASS | 실제UI 시각·제품기능 판정 아님 |
| 작업 diffcheck | `git diff --check`, exit0 | PASS | 제품 변경 없음 |
| 실행 소스/빌드 지문 | 기록된16파일 SHA-256 동일 | PASS | shasum 설명행 경고3개와 구분 |
| 최신 정리 부재 | shared self/partial/final 로그의 소유root6개 직접 조회, present0 | PASS | 초기 실행/담당자 정리 이력은 별도 표 보존 |
마감 정적 검사는 별도 서버/임시 미디어를 만들지 않는다. token start/end/consumed는 집계 API 미제공, elapsed는 원출력 제공 범위만 사용한다.

### 최초 실행 전 정의 및 진행 이력
<!-- 최초 정의와 실행 이력은 아래에 함께 보존하며 최신 판정은 메인 최종 실행 대조를 따른다. -->

독자: v4.1.0 개발·검증 담당자. 수명: 이번 준비 변경과 실행 이력. 정책은 AGENTS.md,
개별 결과는 중앙 기록이 기준이다. 시작 HEAD `ee1b7c4d`, clean/sync에서 시작했다.

승인 범위는 구형 observer/longrun·UI seed·기능 실행 연결의 현행화, 단기 자체검증,
통과 단위 커밋 및 개발 브랜치 푸시다. 제품·공개 API·저장 포맷·보존 정책 변경,
실제 브라우저·30분·120분·PR/merge/tag/Release 실행은 제외한다.
Superpowers 스킬은 현재 도구 목록에 없어 설계·반례·focused 검증을 직접 수행한다.
메인이 시간·식별·복구·관측 설계와 최종 검토를 맡고, 기존 단일 Astra/medium 담당자가 UI 준비만 구현한다.

### 불변 계약과 완료 기준

- 장시간 경과·stall·표본 간격은 monotonic clock, 녹화 진행은 영속 order와 세그먼트 ID,
  파일 확정·삭제 증거로 판정한다. UTC 역행/unknown/epoch 전환은 오류나 정확 UTC로 위장하지 않는다.
- managed 원장 읽기는 관측일 뿐 catalog 수용/내구성 PASS가 아니다. 제품 C++ parser를 재사용한
  bounded compact 관측과 실제 Catalog 복구 검사를 구분한다. checkpoint 교체는 기존 완료 prefix
  identity를 모두 대조한 경우만 재개한다. truncation/다른 내용/미지원/자원 상한은 실패한다.
- HTTP 4초, 관측 stall 30초, 표본 간격 15초, 공개 longrun 120분 조건을 완화하지 않는다.
  단기 자체검증은 별도 모드/결과로만 표시하며 120분 PASS를 반환할 수 없다.
- UI는 실제 managed writer/Catalog/job 출력에 연결한다. 임의 영상 파일을 가짜 event로 등록하지 않는다.
  known/unknown·불연속·다중 출력·우선순위·손상/삭제/미생성·페이지를 보존한다.
  10초 seek 대상은 managed 원본 MP4, 파생 event는 실제 출력 형식으로 분리한다.
- 기능 ID→현재 명령→oracle를 대조한다. 도구 준비와 실제 UI/장시간/릴리즈 완료를 혼동하지 않는다.
- 예상 RED는 신규 자체검사의 미구현 assertion만 허용한다. 환경/빌드 실패를 RED로 바꾸지 않는다.
- 원출력·개별 결과·cleanup·source/elapsed를 보존한다. token start/end/consumed는 전용 집계 없음으로 기록한다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| LP26-O01 | 현행 원장 종류·compact 변환 | 제품 파서로 알려진 종류 수용/unknown·손상 거부, 상세 payload 출력 금지 | v4.1.0 |
| LP26-O02 | 읽기 안전·상한·checkpoint | UTF8/부분행/상한/교체 prefix/손상·경로 escape/원본 불변 | v4.1.0 |
| LP26-O03 | 영속 녹화 진행 | 순서·ID/epoch·UTC 역행·unknown·큰 정수·범위 오류/삭제 전이 | v4.1.0 |
| LP26-O04 | 관측 시간·자원 | monotonic 120분/30초 stall/15초 표본·PID·RSS/FD/thread 수명 | v4.1.0 |
| LP26-O05 | 현행 실행 연결 | 구형 app 전제 제거·단기와120분 결과 분리·복구/종료/정리 경로 | v4.1.0 |
| LP26-U01 | UI seed 소유·옵션 | anchor/무anchor·격리/덮어쓰기 거부 | v4.1.0 |
| LP26-U02 | UI 시간 근거 | known/unknown/불연속·문자열/null 반환 | v4.1.0 |
| LP26-U03 | 실제 파생 출력 | complete/partial·두 출력·ID/hash/재생 결박 | v4.1.0 |
| LP26-U04 | UI 페이지·우선순위 | 100행 초과·원본 숨김/부분 중첩 | v4.1.0 |
| LP26-U05 | UI 오류 상태 | 손상·삭제·미생성 상태별 재생 차단 | v4.1.0 |
| LP26-U06 | UI 복구 | 재개방 timeline/상태 동일·원장 원본 불변 | v4.1.0 |
| LP26-U07 | 인증 준비 회귀 | UA01~08 난수/role/scope/handoff/cleanup | v4.1.0 |
| LP26-U08 | seek 준비 회귀 | SF01~06 실제 duration/codec/hash·소유 경로 | v4.1.0 |
| LP26-M01 | 기능 실행 연결 | 사전 매핑의 미결박·명령/옵션·oracle를 현재 파일과 대조 | v4.1.0 |

### 관측기 세부 실행 정의

합산예산/요약 보완 후 실제 단기는 exit0/71검사·46.638초였으나 도구 수신 한도가 낮아 일부 원출력이 잘렸다.
`lp26-observer-shared-app-partial.log`는 누락 표시를 그대로 보존하며 전수 evidence로 사용하지 않는다.
이는 제품 실패가 아니다. AGENTS7.6.1/7.6.2의 출력 누락 경계에 따라 수신 한도를 확보해 같은 단기 검사만 다시 기록한다.
제품/시간제한/합격 기준·기타 통과 단위를 변경하거나 전체 장시간/UI를 시작하지 않는다.

매핑 리뷰에서 현행 summary의 명시 delta/maxGap 누락과 observer/progress 각각32MiB가
이전 합산 상한과 다름을 확인했다. LP26-O02/O04에 합산 ID/byte 상한·실패 시 counter 불변,
delta/maxGap/불충분 warmup null의 literal 반례를 추가하고 동일 자체검사→실제 단기 순서로 확인한다.
하나의 공유100k/32MiB 예산을 두 구조가 함께 소비한다. prefix의 mutation/entity 위치와 segment ID를
반복도 포함해 보수적으로 세며, 실제 RSS 예산으로 오해하지 않는다. 저장 포맷·제품 정책 변경 없음.

LP26-M01의 실행 연결: current-integration은 현행5단계를 그대로 유지하고, remaining의
이미 구현된 observer 전환 항목만 코드/증거 고정·실제120분/자원 판정으로 정정한다.
`node scripts/internal/recording_current_integration.test.mjs`로 성공/실패·후속 중단·cleanup·총계 계약을 재확인한다.
요청/제품 코드와 HTTP seed 불변이므로 LP25 실제 통합156PASS 자체는 이 요약 변경만으로 재실행하지 않는다.

네 번째 actual short는30초 관측·채널별14확정/12삭제·복제 Catalog 복구까지 통과했지만
재기동 총채널2개 assertion에서 실패했다. SourceViewRegistry::EnsureLoadedLocked는 빈 registry에도
DefaultSourceRecords를 초기화하므로 기본 채널을 무시한 검증기 가정이었다. 관측 응답 원문은 당시 미보존으로 표시한다.
초기 API의 독립 ID 목록(녹화 비활성 검증)+명시 추가2개를 exact 대조하고 개수/중복/active 반례를 자체검사에 추가한다.
동시에 리뷰에서 마지막 종료 partial tail 검사 누락·복제 정리 오류 처리·서버 진단 소실을 확인했다.
마지막 tail/backlog+복구 확인, 크기 검사와 삭제 분리, 소유0600/4MiB private log의 byte/hash/고정 진단분류 보존을 보완한다.
private raw 로그는 원문/경로 노출 없이 root와 삭제한다. 원문을 공개 evidence로 보존했다고 주장하지 않는다.
4회차 두 서버 정상 종료·포트/UDP 반환·복제131991210B/실행265743522B 삭제 확인. lp26-observer-app-fourth.log 보존.

세 번째 actual short는 서버 정상 기동 뒤 두 번째 source POST가409로 거부됐다.
두 채널의 canonical file이 같았으며 SourceViewRegistry의 중복 source 거부(2185~2192행)에 해당한다.
제품 정책을 우회하지 않고 소유 입력을 채널별 독립 파일로 준비한다. 입력별96MiB·전체448MiB 상한은 유지한다.
서버 exit0·두 포트/UDP 반환·root84086407바이트 삭제 확인. 원출력 lp26-observer-app-third.log 보존.
재실행 전에 고정 실행파일, 서로 다른 canonical source, headless 캐시 링크의 제한적 취급,
설정 revision, 종료 후 복제본만 Catalog 접근, 재기동 비활성/재활성, 기존 시간·디스크 한도를 함께 읽기 대조했다.

두 번째 actual short는 server-start-failed/exit1이었다. foreground launcher는 ENABLE_AI=0일 때
build-gst를 선택하지만 현재 검증된 실행파일은 build-gst-onnx에 있다. 파일 존재와 launcher 분기를 읽기로 확인했다.
검증기에 현재 실행파일을 BIN_PATH로 명시하고 실행 권한 preflight를 추가한다. 제품/빌드는 변경하지 않는다.
이 단계의 raw stderr는 수집되지 않았으므로 관측한 오류 원문이라고 주장하지 않는다. 다음 실행으로 연결 수정의 유효성을 확인한다.
소유 root69871547바이트 삭제·두 포트 반환 확인. 원출력 lp26-observer-app-second.log에 보존.

첫 actual short exit1: 새 root walker가 관리 GStreamer 캐시의 정상 플러그인 symlink도 거부하여
준비 단계 `root-entry-bound`로 중단됐다. env_common.sh→gst_plugin_cache.py의 관리 링크 생성 경로를 확인했다.
소유 gst-cache 하위 링크만 lstat 크기를 세고 따라가지 않도록 보완한다. 녹화/input/state 영역은 symlink 금지 유지.
서버1 SIGTERM 종료는 정상 종료 PASS가 아니며 두 포트 폐쇄·UDP 종료·root69871547바이트 삭제/부재는 확인했다.
원출력은 lp26-observer-app-first.log에 보존한다. 실제 녹화 phase/장시간은 미실행이다.
Catalog 사후 관측은 정상 종료 확인 후 별도 소유 복제본에서 수행하도록 연결하며 원본 원장 hash 불변을 확인한다.
검증 대상 root448MiB 제한은 유지, 진단 복제 root도448MiB로 제한·즉시 삭제한다(일시 디스크 복제 비용은 제품 RSS와 별개).

LP26-O05 추가: native `--snapshot`으로 종료된 소유 저장소를 제품 Catalog로 재개방해
삭제·살아있는 영상과 원장 불변을 확인한다. actual short `bash scripts/internal/verify_recording_current_observer.sh --app-observe`는
30초 관측 + 정상 API disable/restart/reenable을 포함한 180초 상한의 준비 검사이며 30분/120분이 아니다.
시작부터 소유 root0700, loopback ICE/HTTP/RTSP, 입력96MiB·전체448MiB stop budget,4초 HTTP를 적용한다.
기존 실제 이벤트/두 출력 검사는 LP25 현행 통합 명령에 그대로 남기고, 장시간 관측기는 녹화·순환삭제·재기동 전용이다.
요구 기능을 삭제한 것이 아니라 단기 이벤트 통합과 120분 관측의 실행 역할을 분리한다.

첫 실행 exit1: 공용 fixture의 `Shift` 미사용 함수가 `-Werror`로 거부됐다. 예상 RED나 제품 실패가 아니다.
새 fixture에서 offset0 변환을 명시적으로 사용하도록 수정하고 동일 명령 재실행한다. 경고 옵션은 유지한다.
소유 root `media-server-current-observer-N72BSU`, 62691바이트, 삭제·부재 확인. 뒤 영향 회귀는 아직 실행하지 않았다.

첫 명령은 `bash scripts/internal/verify_recording_current_observer.sh --self-test`다.
LP26-O01~04의 실제 managed writer/parser, native compact 행, checkpoint receipt 대조,
부분행/손상/중복/경로/큰 정수/영속순서/삭제/monotonic 반례를 실행한다.
후속 영향 회귀는 `node scripts/internal/recording_journal_reader.test.mjs`,
`node scripts/internal/recording_foundation_observer.test.mjs`,
`node scripts/internal/recording_longrun_progress.test.mjs`,
`node scripts/internal/recording_longrun_summary.test.mjs`다. 구형 단위 검사는 역사적 계약 회귀이지 현행 장시간 PASS가 아니다.
실제 서버를 실행하지 않는 첫 검사에는 공개 longrun duration PASS가 없다. 자체검사 root는 wrapper가 생성·크기 측정·삭제한다.

단기 명령은 각 구현 단위 자체검사(Node/C++ wrapper), 기존 observer/longrun/UI/auth 준비 관련
자체검사, 문서 링크·자산·diffcheck다. 실제 서버 단기 준비 검사가 필요하면 동일 격리 root에 한정한다.
실행 전 세부 명령/ID를 이 기록 아래 추가하고, 실패 뒤 후속 단위 실행 금지 및 AGENTS3.3/8을 따른다.

### UI 세부 실행 정의

메인 리뷰 추가: UI seed wrapper의 GStreamer 환경 적용을 소유 root 생성/0700/trap 뒤로 옮기고
cache/registry를 그 root 아래에 명시한다. 저장소 공용 cache 변경을 피하고 성공/실패 함께 정리한다.
같은 seed self-test와 auth 준비를 한 번씩 재검증한다. 제품·HTTP oracle·UI 실행 범위는 그대로다.

담당 범위: 현행 UI seed와 인증 준비 자체검사. 실제 브라우저 PASS가 아니다.
RED 명령은 `node scripts/internal/verify_v410_recording_ui_auth_prep.test.mjs --lp26-contract-only`;
예상 실패는 `LP26-U01 current managed UI seed entry contract` 하나이며 현행 seed helper/연결 부재가 원인이다.

| ID | 자체검사 oracle | 승인 단기 명령 |
| --- | --- | --- |
| LP26-U01-A | 관리 소유 root·anchor/no-anchor·manifest 덮어쓰기 거부 | `bash scripts/internal/verify_recording_current_ui_seed.sh --self-test` |
| LP26-U02-A | 명시 anchor known·unknown null·불연속 mapping·정수 문자열 | 같은 seed self-test 및 auth 준비 |
| LP26-U03-A | 실제 job complete/partial 각각 두 출력·파일 SHA·재생 URL | 같은 seed self-test 및 auth 준비 |
| LP26-U04-A | 전체 100행 초과·페이지 ID 중복 없음·full-hide/partial overlap | 같은 seed self-test 및 auth 준비 |
| LP26-U05-A | 변조/삭제/accepted-only 비재생, 상태 그대로 | 같은 seed self-test 및 auth 준비 |
| LP26-U06-A | 실제 Catalog 재개방 전후 공개 응답/원장 hash 동일 | 같은 seed self-test |
| LP26-U07-A | 기존 UA01~08 난수/role/scope/handoff/정리 | `node scripts/internal/verify_v410_recording_ui_auth_prep.test.mjs` |
| LP26-U08-A | SF01~06 seek 입력과 실제 managed 10초 원본 MP4·이벤트 TS 분리 | 같은 auth 준비 명령 |
| LP26-U08-B | 실제 UI 스크립트 playback 상태 helper 회귀, 실제 UI 제외 | `node scripts/internal/recording_playback_status.test.mjs` |
| LP26-U07-B | UI Range proxy 기존 helper 회귀, 실제 UI 제외 | `node scripts/internal/recording_ui_range_proxy.test.mjs` |

원출력은 이 디렉터리 `lp26-ui-*.log`, 비밀 없는 summary/cleanup만 보존한다. 환경/빌드 오류는 RED가 아니다.


#### UI 준비 구현·실행 결과

현행 seed는 managed writer/Journal/Catalog, 실제 DerivedJobService 출력 4종과 공개 Timeline을 사용한다.
기본 mapping 단위는 유지하며, no-anchor 조회의 모든 영상 시각은 null이다. 101개 페이지용 파일 복제는
원본의 실제 size/SHA/매체 범위·시간 증거를 유지하고 각각 새 ID/order를 부여한다.
seek는 실제 4신 입력을 10초로 자른 뒤 managed 원본 MP4로 mux하며 파생 event는 실제 TS 출력 그대로다.
운영 mutation 시각은 명시 anchor 또는 실행 중 실제 wall clock이며 unknown 영상 UTC로 승격하지 않는다.

최초 실패: tombstone 후 위치 재조회는 정상적으로 위치가 없어 `manifest-location`으로 실패했다.
삭제 전 실제 metadata를 보존하도록 fixture만 수정했다. 이어 completeness oracle이 `full`을 잘못 기대해 실패했고
제품 공개값 `complete`를 확인하여 수정했다. 빌드/제품 회귀나 예상 RED로 재분류하지 않는다.
Range proxy 최초 실행은 sandbox loopback listen EPERM으로 1pass/9fail이었다. 같은 승인 명령의
권한 허용 후 10pass/0fail, 설정·검사 완화 없음. 초기 원출력도 아래에 보존한다.

작은 합성 입력에서는 optional file-evidence profile/bound 미수용 경고가 seed당 5회 관측됐다.
이를 삭제하거나 exact file-evidence PASS로 바꾸지 않는다. 실제 생성 파일/hash, Catalog 수용·복구,
공개 timeline와 media Resolve만 이번 oracle이며 프레임 정확도·브라우저 TS 지원은 별도 미확인이다.
테스트가 보존하는 경고 외 예상하지 못한 stderr는 준비 실패로 처리한다.

최종 명령: 위 정의의 seed/auth/playback/proxy 및 contract-only. 최종 seed 8pass/0fail(4초),
auth 20pass/0fail(14,623ms)와 내부 seed 18pass/0fail, playback 29pass/0fail(27ms),
proxy 10pass/0fail(59ms), contract-only 1pass/0fail. 모두 exit0.
원출력 전체 37277바이트를 최초 실패/수정/재검증 구분 목적으로 보존한다.
token start/end/consumed는 전용 집계가 없어 미집계; elapsed source는 각 원출력의 bash-SECONDS 또는 Date.now다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| LP26-U06-A managed Catalog reopen public timeline and journal unchanged | [최종 원출력](lp26-ui-seed-catalog-final.log); 실제 UI 제외 | pass |
| LP26-U01-A current managed UI seed oracle | [최종 원출력](lp26-ui-seed-catalog-final.log); 실제 UI 제외 | pass |
| LP26-U02-A current managed UI seed oracle | [최종 원출력](lp26-ui-seed-catalog-final.log); 실제 UI 제외 | pass |
| LP26-U03-A current managed UI seed oracle | [최종 원출력](lp26-ui-seed-catalog-final.log); 실제 UI 제외 | pass |
| LP26-U04-A current managed UI seed oracle | [최종 원출력](lp26-ui-seed-catalog-final.log); 실제 UI 제외 | pass |
| LP26-U05-A current managed UI seed oracle | [최종 원출력](lp26-ui-seed-catalog-final.log); 실제 UI 제외 | pass |
| LP26-U01-A owned initialized root and manifest refuse overwrite | [최종 원출력](lp26-ui-seed-catalog-final.log); 실제 UI 제외 | pass |
| LP26-U01-A invalid owned target rejected without new artifacts | [최종 원출력](lp26-ui-seed-catalog-final.log); 실제 UI 제외 | pass |
| SF01 optional seek fixture is accepted only with explicit UI anchor | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| UA01 anchor bounds and unknown options are rejected | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| UA05 inherited anchor and auth values are removed from seed environment | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| UA02 random temporary passwords are distinct with sufficient length | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| UA03 actual bootstrap function orders setup five logins and four users | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| UA04 one-time handoff is mode0600 and refuses overwrite | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| UA07 live source payload distinguishes active quota from blocked reservation | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| UA01 new auth direct mode rejects missing anchor before preparation | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| seed-anchored / LP26-U06-A managed Catalog reopen public timeline and journal unchanged | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| seed-anchored / LP26-U01-A current managed UI seed oracle | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| seed-anchored / LP26-U02-A current managed UI seed oracle | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| seed-anchored / LP26-U03-A current managed UI seed oracle | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| seed-anchored / LP26-U04-A current managed UI seed oracle | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| seed-anchored / LP26-U05-A current managed UI seed oracle | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| UA08-anchored current seed compile root cleanup | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| UA06 LP26-U02~06 actual managed catalog anchored scenarios and reopen | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| seed-unknown / LP26-U06-A managed Catalog reopen public timeline and journal unchanged | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| seed-unknown / LP26-U01-A current managed UI seed oracle | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| seed-unknown / LP26-U02-A current managed UI seed oracle | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| seed-unknown / LP26-U03-A current managed UI seed oracle | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| seed-unknown / LP26-U04-A current managed UI seed oracle | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| seed-unknown / LP26-U05-A current managed UI seed oracle | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| UA08-unknown current seed compile root cleanup | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| UA05 LP26-U02 no anchor remains unknown rather than fake 1970 UTC | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| LP26-U01~05 invalid anchor duplicate row hash and completeness rejected | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| SF02 bounded owned seek fixture generation completes | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| SF03 actual H264 silent 1280x720 ten-second first-keyframe fixture | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| SF06 malformed media metadata and symlink input directory are rejected | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| seed-seek / LP26-U06-A managed Catalog reopen public timeline and journal unchanged | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| seed-seek / LP26-U01-A current managed UI seed oracle | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| seed-seek / LP26-U02-A current managed UI seed oracle | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| seed-seek / LP26-U03-A current managed UI seed oracle | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| seed-seek / LP26-U04-A current managed UI seed oracle | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| seed-seek / LP26-U05-A current managed UI seed oracle | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| UA08-seek current seed compile root cleanup | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| SF04 LP26-U08 managed original seek file actual size SHA and duration | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| SF05 LP26-U08 other originals remain short and actual derived outputs remain TS | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| UA08 test root cleanup | [최종 원출력](lp26-ui-auth-catalog-final.log); 실제 UI 제외 | pass |
| LP26-U01 current managed UI seed entry contract | [최종 원출력](lp26-ui-contract-green.log); 실제 UI 제외 | pass |
| normal selected metadata updates visible support | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| I31-R01 failed timeline clears previous support | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| I31-R01 empty timeline clears previous support | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| I31-R01 unplayable selection clears previous support | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| I31-R02 late metadata cannot contaminate unselected state | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| unselected error preserves selection prompt | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| selected media error shows failure notice | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| D3C-01 UTC zero is a date, not unknown | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| D3C-02 null times stay in separate unplaced list | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| D3C-03 number is not guessed as a date | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| D3C-03 empty is not guessed as a date | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| D3C-03 fraction is not guessed as a date | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| D3C-03 date-range is not guessed as a date | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| D3C-03 unsafe is not guessed as a date | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| D3C-04 same file rows have independent selected item IDs | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| D3C-05 partial overlap preserves original | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| D3C-06 off-page event still hides fully covered original | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| D3C-07 original view restores hidden rows | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| D3C-08 next page uses independent unknown total | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| D3C-09 request media axis is shown without date conversion | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| D3C-10 estimated UTC preserves uncertainty label | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| D3C-11 selection never seeks by UTC and ended never auto-advances | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| D3C-12 unsupported type is only a warning | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| D3C-13 job completion and partial deleted output remain separate | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| D3C-14 late response cannot replace newer selection | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| D3C-15 unknown-only page remains selectable | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| D3C-16 invalid total -1 cannot enable paging | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| D3C-16 invalid total 9007199254740992 cannot enable paging | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| D3C-17 unknown debug fields are not rendered | [최종 원출력](lp26-ui-playback.log); 실제 UI 제외 | pass |
| RP01 fixed loopback upstream and origin-form target only | [최종 원출력](lp26-ui-range-proxy-permitted.log); 실제 UI 제외 | pass |
| RP01 same-origin POST preserves proxy Host and external Origin rejection | [최종 원출력](lp26-ui-range-proxy-permitted.log); 실제 UI 제외 | pass |
| RP02 streaming preserves 206 bytes and Range headers | [최종 원출력](lp26-ui-range-proxy-permitted.log); 실제 UI 제외 | pass |
| RP03 cookie forwarded but absent from observation | [최종 원출력](lp26-ui-range-proxy-permitted.log); 실제 UI 제외 | pass |
| RP04 nonmedia and invalid metadata never expose payload | [최종 원출력](lp26-ui-range-proxy-permitted.log); 실제 UI 제외 | pass |
| RP05 upstream failure records incomplete safely | [최종 원출력](lp26-ui-range-proxy-permitted.log); 실제 UI 제외 | pass |
| RP06 client disconnect closes upstream and records incomplete | [최종 원출력](lp26-ui-range-proxy-permitted.log); 실제 UI 제외 | pass |
| RP07 close drains or destroys sockets and releases port | [최종 원출력](lp26-ui-range-proxy-permitted.log); 실제 UI 제외 | pass |
| RP08 private log mode0600 bounded failure is latched | [최종 원출력](lp26-ui-range-proxy-permitted.log); 실제 UI 제외 | pass |
| RP09 harness proxy cleanup failure still runs owned server cleanup | [최종 원출력](lp26-ui-range-proxy-permitted.log); 실제 UI 제외 | pass |

| 실행 원출력 | 실제 상태·exit | 보존 이유 |
| --- | --- | --- |
| [lp26-ui-auth-accepted.log](lp26-ui-auth-accepted.log) | pass / 0; 6009B | 중간 통과; 이후 강화된 최종 결과와 구분 |
| [lp26-ui-auth-catalog-final.log](lp26-ui-auth-catalog-final.log) | pass / 0; 6009B | 최종 해당 범위 증거 |
| [lp26-ui-auth-final.log](lp26-ui-auth-final.log) | pass / 0; 5946B | 중간 통과; 이후 강화된 최종 결과와 구분 |
| [lp26-ui-auth-first.log](lp26-ui-auth-first.log) | pass / 0; 2405B | 중간 통과; 이후 강화된 최종 결과와 구분 |
| [lp26-ui-auth-fixed-final.log](lp26-ui-auth-fixed-final.log) | pass / 0; 6009B | 중간 통과; 이후 강화된 최종 결과와 구분 |
| [lp26-ui-contract-green.log](lp26-ui-contract-green.log) | pass / 0; 54B | 최종 해당 범위 증거 |
| [lp26-ui-playback.log](lp26-ui-playback.log) | pass / 0; 1622B | 최종 해당 범위 증거 |
| [lp26-ui-range-proxy-permitted.log](lp26-ui-range-proxy-permitted.log) | pass / 0; 803B | 최종 해당 범위 증거 |
| [lp26-ui-range-proxy.log](lp26-ui-range-proxy.log) | fail / 1; 910B | 환경 EPERM; 후속 동일 명령 권한 허용 재검증 |
| [lp26-ui-red.log](lp26-ui-red.log) | fail / 1; 54B | 예상 assertion 1개, 미구현 RED |
| [lp26-ui-seed-accepted.log](lp26-ui-seed-accepted.log) | pass / 0; 1118B | 중간 통과; 이후 강화된 최종 결과와 구분 |
| [lp26-ui-seed-catalog-final.log](lp26-ui-seed-catalog-final.log) | pass / 0; 1118B | 최종 해당 범위 증거 |
| [lp26-ui-self-test-after-completeness-fix.log](lp26-ui-self-test-after-completeness-fix.log) | pass / 0; 1049B | 중간 통과; 이후 강화된 최종 결과와 구분 |
| [lp26-ui-self-test-after-location-fix.log](lp26-ui-self-test-after-location-fix.log) | fail / 1; 680B | 삭제 위치 수정 후 completeness 잘못된 기대 발견 |
| [lp26-ui-self-test-diagnostic.log](lp26-ui-self-test-diagnostic.log) | fail / 1; 614B | 고정 코드 manifest-location 원인 확인 |
| [lp26-ui-self-test-final.log](lp26-ui-self-test-final.log) | pass / 0; 1118B | 중간 통과; 이후 강화된 최종 결과와 구분 |
| [lp26-ui-self-test-first.log](lp26-ui-self-test-first.log) | fail / 1; 641B | 최초 준비 실패; RED 아님 |
| [lp26-ui-self-test-fixed-final.log](lp26-ui-self-test-fixed-final.log) | pass / 0; 1118B | 중간 통과; 이후 강화된 최종 결과와 구분 |

| 최초 실패 개별 항목 | 최초 결과 | 수정·후속 결과 |
| --- | --- | --- |
| LP26-U01 current managed UI seed entry contract | fail | 예상 RED 후 contract-only pass |
| seed manifest-location | fail | tombstone 전 metadata 확보 후 pass |
| LP26-U03 completeness | fail | 공개 complete 값으로 oracle 수정 후 pass |
| RP01 fixed loopback upstream and origin-form target only | fail (EPERM) | 같은 명령 loopback 권한 허용 후 pass |
| RP01 same-origin POST preserves proxy Host and external Origin rejection | fail (EPERM) | 같은 명령 loopback 권한 허용 후 pass |
| RP02 streaming preserves 206 bytes and Range headers | fail (EPERM) | 같은 명령 loopback 권한 허용 후 pass |
| RP03 cookie forwarded but absent from observation | fail (EPERM) | 같은 명령 loopback 권한 허용 후 pass |
| RP04 nonmedia and invalid metadata never expose payload | fail (EPERM) | 같은 명령 loopback 권한 허용 후 pass |
| RP05 upstream failure records incomplete safely | fail (EPERM) | 같은 명령 loopback 권한 허용 후 pass |
| RP06 client disconnect closes upstream and records incomplete | fail (EPERM) | 같은 명령 loopback 권한 허용 후 pass |
| RP07 close drains or destroys sockets and releases port | fail (EPERM) | 같은 명령 loopback 권한 허용 후 pass |
| RP08 private log mode0600 bounded failure is latched | fail (ASSERT_OR_BOUNDARY) | 같은 명령 loopback 권한 허용 후 pass |

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.u98529` | 검증 소유 임시 root | 6810328B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-auth-accepted.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.tEHrwr` | 검증 소유 임시 root | 6810328B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-auth-accepted.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.QlmskL` | 검증 소유 임시 root | 6810328B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-auth-accepted.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.cNcjXZ` | 검증 소유 임시 root | 25829094B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-auth-accepted.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.LxG4Jg` | 검증 소유 임시 root | 6810328B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-auth-catalog-final.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.6H76Vi` | 검증 소유 임시 root | 6810328B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-auth-catalog-final.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.0aMenJ` | 검증 소유 임시 root | 6810328B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-auth-catalog-final.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.QBaJfc` | 검증 소유 임시 root | 25830370B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-auth-catalog-final.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.vv2ofO` | 검증 소유 임시 root | 6810184B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-auth-final.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.qB7pX9` | 검증 소유 임시 root | 6810184B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-auth-final.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.NqMfSV` | 검증 소유 임시 root | 6810184B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-auth-final.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.mzHLo3` | 검증 소유 임시 root | 25828245B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-auth-final.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.Hj6Xnz` | 검증 소유 임시 root | 6810184B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-auth-first.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.G9xiSl` | 검증 소유 임시 root | 6810184B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-auth-first.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.CZEDcy` | 검증 소유 임시 root | 6810184B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-auth-first.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.oBy2Kn` | 검증 소유 임시 root | 25828245B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-auth-first.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.26FM0X` | 검증 소유 임시 root | 6810184B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-auth-fixed-final.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.s5N5fQ` | 검증 소유 임시 root | 6810184B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-auth-fixed-final.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.ogwoKj` | 검증 소유 임시 root | 6810184B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-auth-fixed-final.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.iAnvk0` | 검증 소유 임시 root | 25828245B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-auth-fixed-final.log) |
| `/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/s09-range-proxy-test-8zyDkx` | 검증 소유 임시 root | 1720B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-range-proxy-permitted.log) |
| `/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/s09-range-proxy-test-xhuqE1` | 검증 소유 임시 root | 0B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-range-proxy.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.sY4ybn` | 검증 소유 임시 root | 9477546B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-seed-accepted.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.BwXpO8` | 검증 소유 임시 root | 9477978B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-seed-catalog-final.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.ohTVjW` | 검증 소유 임시 root | 9477024B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-self-test-after-completeness-fix.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.Va1TU9` | 검증 소유 임시 root | 9477024B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-self-test-after-location-fix.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.NrNl1X` | 검증 소유 임시 root | 9319103B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-self-test-diagnostic.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.RytJPI` | 검증 소유 임시 root | 9477024B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-self-test-final.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.q2bcba` | 검증 소유 임시 root | 9319103B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-self-test-first.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.bk8P3W` | 검증 소유 임시 root | 9477127B | 재귀 삭제, symlink 비추적 | 부재 확인 | [원출력](lp26-ui-self-test-fixed-final.log) |

미실행: 실제 브라우저/action·시각 증거, 실제 auth 서버 UI 전체, 30분/120분, 커밋/푸시.
HTTP seed·제품·공개 API·저장/권한 정책은 변경하지 않았다. 기존 I30 native seek 정의는 그대로이며,
구형 SF04 http-event 단일 MP4 결박은 이번 managed 원본 seek 정의로만 대체한다. 과거 결과는 소급 변경하지 않는다.

환경·소유 코드 SHA는 [lp26-ui-environment.log](lp26-ui-environment.log)에 보존했다:
HEAD ee1b7c4d15054da95d884c406dce020e875f5541, Node v24.13.0, Darwin27/arm64, GStreamer1.28.1.
소유 추적 파일 `git diff --check -- ...` exit0. 신규 파일의 `git diff --no-index --check /dev/null ...`는
신규 차이 존재로 exit1/진단 출력 없음이며 제품/테스트 실패로 분류하지 않는다.
기록된 소유 임시 root30개를 lstat으로 다시 확인한 결과 present0/exit0이다. 환경 로그는 실행 원출력 합계와 별도다.

### 메인 최종 실행 대조

LP26-M01 최종 명령 등록: `./server.sh verify-script-inventory`(dispatch/파일/문서상 명령 정합),
`./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets`, `git diff --check`.
첫 script-inventory는 개별 명령을 명시하기 전에 실행한 절차 누락으로 완료 evidence에서 제외한다.
AGENTS7.6.1에 따라 등록 뒤 동일 검사만 재실행한다. 다른 유효 단기 검사·제품 증거는 무효화하지 않는다.

관측 자체57/실제 단기71, 기존 reader40/observer33/progress45/summary51, 현행 통합 자체50 모두 exit0.
UI cache 격리 보완 후 seed8(5초)/auth20+내부18(17660ms) exit0이다. 앞 UI 개별 행의 같은 oracle를 재검증했으며
playback29/proxy10/contract1은 변경 없는 유효 증거를 유지한다. 이 시점 준비 검사 합계는433개였으며 이후 합산 예산 보완의 최종436개는 문서 상단을 따른다. 제품 전수/장시간/UI PASS 총계가 아니다.
관측 실제46.673초 중 녹화 phase30.126초, 채널별14확정/12삭제. 마지막 재활성화 후 새 녹화·세 프로세스 정상종료·6포트/UDP 정리,
복제본3개와 실행root 삭제를 확인했다. resourceTrendPass=false/reviewRequired=true, 실제120분과 브라우저는 미실행이다.
제품·공개 API·저장 계약 변경 없음. 메인은 diff와 실제 원출력 및 삭제 후 부재를 검토했다.
최초 준비 실패4회는 앞 절과 로그에 그대로 보존하며 다섯 번째 실제 단기 실행으로 동일 oracle를 통과했다.
HTTP4초/관측stall30초/루트448MiB 상한을 늘리지 않았다. 이전 stderr 원문 부재는 소급 복원하지 않는다.

#### observer-self-final

명령: `bash scripts/internal/verify_recording_current_observer.sh --self-test`, exit0. 원출력: [lp26-observer-self-final.log](lp26-observer-self-final.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 001 LP26-O02 final stopped tail must be complete and fully drained | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 002 LP26-O05 initial plus added channels exact disabled on restart | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 003 LP26-O01 actual managed writer fixture | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 004 LP26-O01 native exact row count and two channel segments | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 005 LP26-O01 compact excludes binding samples source URL and payload | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 006 LP26-O02 actual store read preserves original bytes | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 007 LP26-O05 actual deleted and survivor Catalog recovery twice | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 008 LP26-O01 known envelope segment_finalized | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 009 LP26-O01 known envelope event_link_created | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 010 LP26-O01 known envelope observation_put | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 011 LP26-O01 known envelope observation_v2_put | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 012 LP26-O01 known envelope deletion_requested | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 013 LP26-O01 known envelope deletion_completed | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 014 LP26-O01 known envelope corruption_detected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 015 LP26-O01 known envelope consumer_reference_put | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 016 LP26-O01 known envelope derived_reference_accepted | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 017 LP26-O01 known envelope referenced_observation_put | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 018 LP26-O01 known envelope derived_job_intent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 019 LP26-O01 known envelope derived_job_files | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 020 LP26-O01 known envelope derived_job_ready | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 021 LP26-O01 known envelope derived_job_committed | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 022 LP26-O01 known envelope derived_job_complete | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 023 LP26-O01 known envelope derived_job_failed | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 024 LP26-O01 reject unknown | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 025 LP26-O01 reject duplicate-key | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 026 LP26-O01 reject invalid-json | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 027 LP26-O01 reject unsafe-id | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 028 LP26-O01 reject bad-segment | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 029 LP26-O01 reject bad-state | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 030 LP26-O01 reject bad-deleted | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 031 LP26-O02 partial line not consumed | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 032 LP26-O02 partial append consumed once | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 033 LP26-O02 exact checkpoint receipt prefix and suffix | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 034 LP26-O02 checkpoint changed refused | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 035 LP26-O02 checkpoint missing refused | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 036 LP26-O02 truncation latched | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 037 LP26-O02 duplicate mutation rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 038 LP26-O02 symlink rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 039 LP26-O03 actual native order advances independent of UTC | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 040 LP26-O03 huge order unknown UTC new epoch PTS reset accepted | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 041 LP26-O03 duplicate segment rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 042 LP26-O03 persistent order regression rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 043 LP26-O03 completion without pending rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 044 LP26-O03 pending completed physical target once | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 045 LP26-O03 changed tombstone rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 046 LP26-O04 stall clock and shortened finish rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 047 LP26-O04 exactly120 argument only | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 048 LP26-O04 monotonic sample independent wallclock | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 049 LP26-O04 pause time cannot satisfy 120 minutes | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 050 LP26-O04 current resources use monotonic not wallclock | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 051 LP26-O04 invalid resource rss | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 052 LP26-O04 invalid resource fd | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 053 LP26-O04 invalid resource pid | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 054 LP26-O04 invalid resource identity | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 055 LP26-O04 invalid resource counter | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 056 LP26-O04 invalid resource clock | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 057 LP26-O05 current public dispatch avoids legacy longrun prelude | 위 명령의 독립 assertion | PASS | 단기 범위 |

#### observer-app-final

명령: `bash scripts/internal/verify_recording_current_observer.sh --app-observe`, exit0. 원출력: [lp26-observer-app-final.log](lp26-observer-app-final.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 001 LP26-O05 fixed current executable | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 002 LP26-O05 original bounded retention fixture | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 003 LP26-O05 distinct canonical sources | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 004 LP26-O05 isolated server healthy | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 005 LP26-O05 independent initial channels | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 006 LP26-O05 active 9101 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 007 LP26-O05 active 9201 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 008 LP26-O05 active 9101 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 009 LP26-O05 active 9201 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 010 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 011 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 012 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 013 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 014 LP26-O05 active 9101 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 015 LP26-O05 active 9201 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 016 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 017 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 018 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 019 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 020 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 021 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 022 LP26-O05 active 9101 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 023 LP26-O05 active 9201 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 024 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 025 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 026 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 027 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 028 LP26-O05 active 9101 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 029 LP26-O05 active 9201 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 030 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 031 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 032 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 033 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 034 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 035 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 036 LP26-O05 active 9101 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 037 LP26-O05 active 9201 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 038 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 039 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 040 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 041 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 042 LP26-O04 sample coverage | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 043 LP26-O05 both channels retained and progressed | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 044 LP26-O05 setting 9101 false | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 045 LP26-O05 setting 9201 false | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 046 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 047 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 048 LP26-O02 closed journal no partial tail | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 049 LP26-O05 stopped copy native catalog recovery | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 050 LP26-O05 native surviving and deleted states | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 051 LP26-O05 original journal bytes unchanged | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 052 LP26-O05 recovery copy cleanup | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 053 LP26-O05 isolated server healthy | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 054 LP26-O05 disabled restart | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 055 LP26-O05 stopped copy native catalog recovery | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 056 LP26-O05 native surviving and deleted states | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 057 LP26-O05 original journal bytes unchanged | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 058 LP26-O05 recovery copy cleanup | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 059 LP26-O05 restart exact catalog media state | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 060 LP26-O05 isolated server healthy | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 061 LP26-O05 setting 9101 true | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 062 LP26-O05 setting 9201 true | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 063 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 064 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 065 LP26-O05 reenabled recording after restart | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 066 LP26-O03 deleted media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 067 LP26-O02 final restart closed journal no partial tail | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 068 LP26-O05 stopped copy native catalog recovery | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 069 LP26-O05 native surviving and deleted states | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 070 LP26-O05 original journal bytes unchanged | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 071 LP26-O05 recovery copy cleanup | 위 명령의 독립 assertion | PASS | 단기 범위 |

#### journal

명령: `node scripts/internal/recording_journal_reader.test.mjs`, exit0. 원출력: [lp26-observer-regressions.log](lp26-observer-regressions.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 001 JR01 complete LF row emitted | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 002 JR01 repeated poll no duplicate | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 003 JR01 byte offset includes UTF8 bytes | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 004 JR01 append next row only | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 005 JR01 empty regular file | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 006 JR02 complete JSON without LF unconsumed | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 007 JR02 tail replacement reread without old concatenation | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 008 JR02 split UTF8 no premature decode | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 009 JR02 split UTF8 append recovered | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 010 JR02 repair after consumed prefix | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 011 JR03 poll byte budget and backlog | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 012 JR03 poll boundary partial distinguished from EOF | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 013 JR03 bounded poll progress and completion | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 014 JR03 bounded multi poll no missing duplicate | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 015 JR03 default 4MiB read ceiling | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 016 JR03 default ceiling complete second batch | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 017 JR03 default line bound | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 018 JR03 line error latched after file repaired | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 019 JR03 invalid limits rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 020 JR04 seven known types accepted | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 021 JR04 json rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 022 JR04 schema rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 023 JR04 type rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 024 JR04 field rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 025 JR04 payload rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 026 JR04 integer rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 027 JR04 invalid UTF8 rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 028 JR05 inode replacement latched | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 029 JR05 consumed prefix truncate rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 030 JR05 truncate latch prevents reset | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 031 JR05 leaf symlink rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 032 JR05 parent symlink rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 033 JR05 symlink root rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 034 JR05 parent replacement rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 035 JR05 root escape rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 036 JR05 nonregular directory rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 037 JR05 absent file rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 038 JR05 hardlink rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 039 JR05 read path error latch | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 040 JR05 closed poll rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |

#### observer-regression

명령: `node scripts/internal/recording_foundation_observer.test.mjs`, exit0. 원출력: [lp26-observer-regressions.log](lp26-observer-regressions.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 001 OBS01 first mutation counted | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 002 OBS01 no duplicate poll count | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 003 OBS02 raw rows distinct from unique IDs | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 004 OBS03 new PID distinct group same cursor | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 005 OBS01 all seven type counts | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 006 OBS04 initial absent journal pending not zero | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 007 OBS04 journal created later observed | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 008 OBS04 final unmeasured rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 009 OBS04 final pending rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 010 OBS02 total ID count bound | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 011 OBS02 UTF8 byte bound | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 012 OBS03 missing collector binary fails | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 013 OBS03 null sample rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 014 OBS03 invalid sample rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 015 OBS03 wrongpid sample rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 016 OBS03 missingfd sample rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 017 OBS03 rsszero sample rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 018 OBS03 live identity change rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 019 OBS03 identity error latched | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 020 OBS03 reader error not empty archive | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 021 OBS04 duplicate tick not launched | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 022 OBS04 pause waits active tick | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 023 OBS04 measured close returns groups not resource pass | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 024 OBS04 closed tick rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 025 OBS04 live partial observed without consuming tail | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 026 OBS04 final partial rejected and reader closed | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 027 OBS04 failure cleanup closes reader | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 028 OBS04 complete observation predicate positive | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 029 OBS04 failure completion rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 030 OBS04 process-unclosed completion rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 031 OBS04 no-final completion rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 032 OBS04 error completion rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 033 OBS04 disabled completion rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |

#### progress-regression

명령: `node scripts/internal/recording_longrun_progress.test.mjs`, exit0. 원출력: [lp26-observer-regressions.log](lp26-observer-regressions.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 001 explicit 120 minutes accepted | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 002 invalid CLI [] | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 003 invalid CLI ["120"] | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 004 invalid CLI ["--duration-minutes","30"] | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 005 invalid CLI ["--duration-minutes","120","extra"] | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 006 invalid CLI ["--unknown","120"] | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 007 two channels progress and ordered deletion | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 008 stall rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 009 duplicate rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 010 UTC regression rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 011 completion without request rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 012 invalid media metadata rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 013 duration cannot be shortened | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 014 unknown channel cannot satisfy progress | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 015 backward clock rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 016 sample continuous accepted | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 017 sample gap rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 018 sample wrong PID rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 019 sample wrong identity rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 020 sample missing beginning rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 021 sample missing end rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 022 sample insufficient rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 023 actual golden schema accepted | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 024 full duration distributed progress accepted | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 025 last moment only cannot pass | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 026 ID limit rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 027 UTF8 byte limit rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 028 queried revision advanced disable | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 029 missing source rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 030 duplicate source rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 031 invalid revision rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 032 public CLI rejects [] | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 033 public CLI rejects ["120"] | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 034 public CLI rejects ["--duration-minutes","30"] | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 035 public CLI rejects ["--duration-minutes","120","extra"] | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 036 public CLI rejects ["--unknown","120"] | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 037 completed batch returns media path once | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 038 missing media path rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 039 media path byte limit rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 040 ENOENT media absent | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 041 regular media present rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 042 dangling symlink present rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 043 media permission error rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 044 S09-LD01 invalid segment diagnostics are specific and redacted | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 045 S09-LD01 missing timestamp diagnostics remain specific and redacted | 위 명령의 독립 assertion | PASS | 단기 범위 |

#### summary-regression

명령: `node scripts/internal/recording_longrun_summary.test.mjs`, exit0. 원출력: [lp26-observer-regressions.log](lp26-observer-regressions.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 001 LS01 separate restart PID groups | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 002 LS01 literal first last max delta elapsed | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 003 LS01 postwarmup negative rate literal | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 004 LS01 new PID warmup resets and insufficient null | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 005 LS01 zero warmup rate separate PIDs | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 006 LS03 same PID gap explicitly measured | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 007 LS03 one sample gap and trend insufficient | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 008 LS02 FD zero valid | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 009 LS03 no resource or longrun pass | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 010 LS03 workload delta not reset by PID | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 011 LS03 raw input excluded from output | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 012 LS02 missing-rss rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 013 LS02 zero-rss rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 014 LS02 negative-rss rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 015 LS02 infinite-rss rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 016 LS02 nan-rss rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 017 LS02 zero-thread rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 018 LS02 negative-fd rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 019 LS02 missing-fd rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 020 LS02 zero-pid rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 021 LS02 zero-time rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 022 LS02 invalid-identity rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 023 LS02 missing-counter rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 024 LS02 missing-types rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 025 LS02 pending-journal rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 026 LS02 duplicate time rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 027 LS02 backward time rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 028 LS02 same PID identity change rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 029 LS02 global counters cannot reset at restart | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 030 LS02 cumulative segment_finalized decrease rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 031 LS02 cumulative event_link_created decrease rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 032 LS02 cumulative observation_put decrease rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 033 LS02 cumulative observation_v2_put decrease rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 034 LS02 cumulative deletion_requested decrease rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 035 LS02 cumulative deletion_completed decrease rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 036 LS02 cumulative corruption_detected decrease rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 037 LS02 cumulative mutationCount decrease rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 038 LS02 cumulative uniqueMutationIds decrease rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 039 LS02 cumulative uniqueEntityIds decrease rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 040 LS02 cumulative storedIdCount decrease rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 041 LS02 cumulative idUtf8Bytes decrease rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 042 LS02 cumulative consumedOffset decrease rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 043 LS02 invalid warmup undefined | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 044 LS02 invalid warmup -1 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 045 LS02 invalid warmup 0.5 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 046 LS02 invalid warmup Infinity | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 047 LS02 empty input rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 048 LS02 10000 samples accepted | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 049 LS02 over 10000 samples rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 050 LS02 64 PID groups accepted | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 051 LS02 over 64 groups rejected | 위 명령의 독립 assertion | PASS | 단기 범위 |

#### current-integration-unit

명령: `node scripts/internal/recording_current_integration.test.mjs`, exit0. 원출력: [lp26-current-integration-unit.log](lp26-current-integration-unit.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 001 S11-CI01 현행 다섯 단계 순서·실제 child 결과 결박 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 002 LP25-C10 http-auth 실제 producer 총계 수용·구형 및 불일치 거부 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 003 LP25-C10 http-lifecycle 실제 producer 총계 수용·구형 및 불일치 거부 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 004 LP20-X01 실제 종료 producer의 정상 두 결과를 수용 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 005 LP20-X02 schema 누락는 정상 종료로 승인하지 않음 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 006 LP20-X02 schema 불일치는 정상 종료로 승인하지 않음 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 007 LP20-X02 반복 종료는 정상 종료로 승인하지 않음 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 008 LP20-X02 PID 누락는 정상 종료로 승인하지 않음 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 009 LP20-X02 exit 비정상는 정상 종료로 승인하지 않음 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 010 LP20-X02 signal 관측는 정상 종료로 승인하지 않음 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 011 LP20-X02 종료 미관측는 정상 종료로 승인하지 않음 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 012 LP20-X02 stop 오류는 정상 종료로 승인하지 않음 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 013 LP20-X02 강제 종료는 정상 종료로 승인하지 않음 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 014 LP20-X02 강제 여부 미확인는 정상 종료로 승인하지 않음 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 015 LP20-X02 normalExit 실패는 정상 종료로 승인하지 않음 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 016 LP20-X02 normalShutdown 실패는 정상 종료로 승인하지 않음 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 017 LP20-X02 archive 불가는 정상 종료로 승인하지 않음 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 018 LP20-X02 ports 누락는 정상 종료로 승인하지 않음 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 019 LP20-X02 port 수 부족는 정상 종료로 승인하지 않음 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 020 LP20-X02 port kind 중복는 정상 종료로 승인하지 않음 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 021 LP20-X02 port 미해제는 정상 종료로 승인하지 않음 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 022 LP20-X02 port 상태 모순는 정상 종료로 승인하지 않음 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 023 LP20-X02 port 코드 모순는 정상 종료로 승인하지 않음 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 024 LP20-X02 port 범위 오류는 정상 종료로 승인하지 않음 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 025 LP20-X02 graceful-only 구형 결과는 정상 종료로 승인하지 않음 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 026 LP20-X02 정상 flag 누락는 정상 종료로 승인하지 않음 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 027 S11-CI04 기존 실제 dispatch 상관 정상·오래된ID·다른조건·복수ID 거부 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 028 S11-CI02 nonzero 실패 후 나머지 미실행 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 029 S11-CI02 signal 실패 후 나머지 미실행 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 030 S11-CI02 output-limit 실패 후 나머지 미실행 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 031 S11-CI02 summary-missing 실패 후 나머지 미실행 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 032 S11-CI02 summary-duplicate 실패 후 나머지 미실행 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 033 S11-CI02 cleanup-failed 실패 후 나머지 미실행 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 034 S11-CI02 port-missing 실패 후 나머지 미실행 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 035 S11-CI03 legacy 완료 필드 없음·전체 S11/UI/자원 PASS 분리 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 036 S11-CI07 기대 출력 수만 있거나 한 기동 관측 누락이면 완료 거부 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 037 S11-CI05 페이지 전체·unplaced 별도 total·동일file mapping dedup | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 038 S11-CI05 누락·중복item·불안정total·truncated·cap 거부 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 039 S11-CI05 첫출력/partial/다른reference/job/unsafe숫자 거부 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 040 S11-CI07 정확한 accepted placeholder만 미완료로 분류하고 lineage 모순은 거부 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 041 S11-CI06 기존ID/hash 보존과 새event/reference/job/output 분리 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 042 S11-CI05 점 이벤트 equal+padding 허용·역전/빈확장 거부 | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 043 LP25-O04 group members survive full collection and literal two output validation | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 044 LP25-O04 within group duplicate rejects grouped page before completion consumer | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 045 LP25-O04 across groups duplicate rejects grouped page before completion consumer | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 046 LP25-O04 member collides with outer ID rejects grouped page before completion consumer | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 047 LP25-O04 missing members rejects grouped page before completion consumer | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 048 LP25-O04 empty members rejects grouped page before completion consumer | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 049 LP25-O04 leaf cap rejects grouped page before completion consumer | 위 명령의 독립 assertion | PASS | 단기 범위 |
| 050 LP25-O04 members byte cap rejects grouped page before completion consumer | 위 명령의 독립 assertion | PASS | 단기 범위 |

#### ui-isolated-seed

명령: `bash scripts/internal/verify_recording_current_ui_seed.sh --self-test`, exit0. 원출력: [lp26-ui-isolated-seed.log](lp26-ui-isolated-seed.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 001 LP26-U06-A managed Catalog reopen public timeline and journal unchanged | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 002 LP26-U01-A current managed UI seed oracle | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 003 LP26-U02-A current managed UI seed oracle | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 004 LP26-U03-A current managed UI seed oracle | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 005 LP26-U04-A current managed UI seed oracle | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 006 LP26-U05-A current managed UI seed oracle | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 007 LP26-U01-A owned initialized root and manifest refuse overwrite | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 008 LP26-U01-A invalid owned target rejected without new artifacts | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |

#### ui-isolated-auth

명령: `node scripts/internal/verify_v410_recording_ui_auth_prep.test.mjs`, exit0. 원출력: [lp26-ui-isolated-auth.log](lp26-ui-isolated-auth.log).

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 001 SF01 optional seek fixture is accepted only with explicit UI anchor | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 002 UA01 anchor bounds and unknown options are rejected | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 003 UA05 inherited anchor and auth values are removed from seed environment | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 004 UA02 random temporary passwords are distinct with sufficient length | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 005 UA03 actual bootstrap function orders setup five logins and four users | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 006 UA04 one-time handoff is mode0600 and refuses overwrite | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 007 UA07 live source payload distinguishes active quota from blocked reservation | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 008 UA01 new auth direct mode rejects missing anchor before preparation | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 009 [seed-anchored] PASS: LP26-U06-A managed Catalog reopen public timeline and journal unchanged | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 010 [seed-anchored] PASS: LP26-U01-A current managed UI seed oracle | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 011 [seed-anchored] PASS: LP26-U02-A current managed UI seed oracle | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 012 [seed-anchored] PASS: LP26-U03-A current managed UI seed oracle | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 013 [seed-anchored] PASS: LP26-U04-A current managed UI seed oracle | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 014 [seed-anchored] PASS: LP26-U05-A current managed UI seed oracle | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 015 UA08-anchored current seed compile root cleanup | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 016 UA06 LP26-U02~06 actual managed catalog anchored scenarios and reopen | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 017 [seed-unknown] PASS: LP26-U06-A managed Catalog reopen public timeline and journal unchanged | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 018 [seed-unknown] PASS: LP26-U01-A current managed UI seed oracle | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 019 [seed-unknown] PASS: LP26-U02-A current managed UI seed oracle | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 020 [seed-unknown] PASS: LP26-U03-A current managed UI seed oracle | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 021 [seed-unknown] PASS: LP26-U04-A current managed UI seed oracle | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 022 [seed-unknown] PASS: LP26-U05-A current managed UI seed oracle | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 023 UA08-unknown current seed compile root cleanup | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 024 UA05 LP26-U02 no anchor remains unknown rather than fake 1970 UTC | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 025 LP26-U01~05 invalid anchor duplicate row hash and completeness rejected | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 026 SF02 bounded owned seek fixture generation completes | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 027 SF03 actual H264 silent 1280x720 ten-second first-keyframe fixture | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 028 SF06 malformed media metadata and symlink input directory are rejected | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 029 [seed-seek] PASS: LP26-U06-A managed Catalog reopen public timeline and journal unchanged | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 030 [seed-seek] PASS: LP26-U01-A current managed UI seed oracle | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 031 [seed-seek] PASS: LP26-U02-A current managed UI seed oracle | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 032 [seed-seek] PASS: LP26-U03-A current managed UI seed oracle | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 033 [seed-seek] PASS: LP26-U04-A current managed UI seed oracle | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 034 [seed-seek] PASS: LP26-U05-A current managed UI seed oracle | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 035 UA08-seek current seed compile root cleanup | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 036 SF04 LP26-U08 managed original seek file actual size SHA and duration | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 037 SF05 LP26-U08 other originals remain short and actual derived outputs remain TS | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |
| 038 UA08 test root cleanup | 위 명령의 독립 assertion | PASS | cache 격리 뒤 재검증 |

### 메인 정리 기록

아래 소유 경로만 실행 도구가 크기를 계측한 후 삭제했다. 운영 자료/공용 데이터 삭제 없음.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-observer-GEpaTT | 실행/복구 전용 임시root | 7723692 B | 삭제 | 부재 | observer-self-final 원출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-observer-copy-n72U3v | 실행/복구 전용 임시root | 129908999 B | 삭제 | 부재 | observer-app-final 원출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-observer-copy-FjoSzq | 실행/복구 전용 임시root | 129908999 B | 삭제 | 부재 | observer-app-final 원출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-observer-copy-7L0Iib | 실행/복구 전용 임시root | 154600157 B | 삭제 | 부재 | observer-app-final 원출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-observer-buJsHR | 실행/복구 전용 임시root | 288348469 B | 삭제 | 부재 | observer-app-final 원출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/s09-journal-reader-TpUZ3k | 단기 전용root | 4545807 B | 삭제 | 부재 | journal 원출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/s09-observer-h9qsX3 | 단기 전용root | 1932 B | 삭제 | 부재 | observer-regression 원출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.2tUgXJ | 실행/복구 전용 임시root | 11082126 B | 삭제 | 부재 | ui-isolated-seed 원출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.n8EeJ1 | 실행/복구 전용 임시root | 8414476 B | 삭제 | 부재 | ui-isolated-auth 원출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.ri52D0 | 실행/복구 전용 임시root | 8414476 B | 삭제 | 부재 | ui-isolated-auth 원출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.En3Gob | 실행/복구 전용 임시root | 8414476 B | 삭제 | 부재 | ui-isolated-auth 원출력 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-ui-seed.SpZshk | 단기 전용root | 25830370 B | 삭제 | 부재 | ui-isolated-auth 원출력 |

실패 실행의 정리표·UI 담당의30root 기록은 앞 이력과 각 로그를 함께 따른다. 서버 원문0600 파일도 소유root와 삭제했고
비민감 byte/hash/고정 오류 분류만 최종 로그에 보존한다. token start/end/consumed는 전용집계 미제공으로 미집계,
elapsed source는 원출력의 performance.now·Date.now·bash SECONDS다. 저장소 artifact는 작은 redacted 텍스트만 보존하며 영상/암호/개인데이터는 포함하지 않는다.
