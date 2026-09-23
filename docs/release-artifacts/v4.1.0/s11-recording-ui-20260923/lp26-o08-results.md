# LP26-O08 개별 결과

> 독자: 릴리즈 검증 담당자. lifecycle: v4.1.0 S11 실행 기록. source-of-truth: `docs/release-test-records.md`의 LP26-O08; 원출력은 같은 디렉터리의 로그다.

| 제목 | 수행내용 | 결과(pass/fail) | 비고 |
| --- | --- | --- | --- |
| LP26-O02 final stopped tail must be complete and fully drained | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O05 initial plus added channels exact disabled on restart | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 actual managed writer fixture | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O08 physical archive fixture and logical native rows | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O08 bounded normalization retains count and order under accumulated physical input | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O08 later invalid row rejects the whole batch result | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 native exact row count and two channel segments | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 compact excludes binding samples source URL and payload | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O02 actual store read preserves original bytes | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O05 actual deleted and survivor Catalog recovery twice | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 known envelope segment_finalized | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 known envelope event_link_created | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 known envelope observation_put | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 known envelope observation_v2_put | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 known envelope deletion_requested | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 known envelope deletion_completed | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 known envelope corruption_detected | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 known envelope consumer_reference_put | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 known envelope derived_reference_accepted | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 known envelope referenced_observation_put | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 known envelope derived_job_intent | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 known envelope derived_job_files | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 known envelope derived_job_ready | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 known envelope derived_job_committed | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 known envelope derived_job_complete | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 known envelope derived_job_failed | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 reject unknown | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 reject duplicate-key | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 reject invalid-json | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 reject unsafe-id | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 reject bad-segment | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 reject bad-state | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O01 reject bad-deleted | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O02 partial line not consumed | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O02 partial append consumed once | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O02 exact checkpoint receipt prefix and suffix | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O02 checkpoint changed refused | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O02 checkpoint missing refused | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O02 truncation latched | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O02 duplicate mutation rejected | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O02 symlink rejected | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O02 observer and progress share one total identity budget | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O02 total byte cap and invalid cap cannot be increased | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O03 actual native order advances independent of UTC | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O03 huge order unknown UTC new epoch PTS reset accepted | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O03 duplicate segment rejected | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O03 persistent order regression rejected | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O03 completion without pending rejected | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O03 pending completed physical target once | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O03 changed tombstone rejected | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O04 stall clock and shortened finish rejected | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O04 exactly120 argument only | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O04 monotonic sample independent wallclock | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O04 pause time cannot satisfy 120 minutes | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O04 current resources use monotonic not wallclock | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O04 literal delta gap and insufficient warmup statistics | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O04 invalid resource rss | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O04 invalid resource fd | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O04 invalid resource pid | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O04 invalid resource identity | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O04 invalid resource counter | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O04 invalid resource clock | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O05 current public dispatch avoids legacy longrun prelude | 관측기 자기검사 | pass | lp26-o08-selftest.log 원출력 |
| LP26-O05 fixed current executable | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 original bounded retention fixture | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 distinct canonical sources | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 isolated server healthy | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 independent initial channels | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 active 9101 | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 active 9201 | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 active 9101 | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 active 9201 | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 active 9101 | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 active 9201 | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 active 9101 | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 active 9201 | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 active 9101 | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 active 9201 | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 active 9101 | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 active 9201 | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O04 sample coverage | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 both channels retained and progressed | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 setting 9101 false | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 setting 9201 false | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O02 closed journal no partial tail | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 stopped copy native catalog recovery | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 native surviving and deleted states | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 original journal bytes unchanged | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 recovery copy cleanup | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 isolated server healthy | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 disabled restart | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 stopped copy native catalog recovery | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 native surviving and deleted states | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 original journal bytes unchanged | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 recovery copy cleanup | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 restart exact catalog media state | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 isolated server healthy | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 setting 9101 true | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 setting 9201 true | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 reenabled recording after restart | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O03 deleted media absent | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O02 final restart closed journal no partial tail | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 stopped copy native catalog recovery | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 native surviving and deleted states | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 original journal bytes unchanged | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |
| LP26-O05 recovery copy cleanup | 격리 실제 앱 단기 검증 | pass | lp26-o08-short-app.log 원출력 |

| 녹화 120분 2차 | 누적 저장량·관측 | fail | `recording-120-attempt2.log`, 약 394초에서 `observer-native-rejected`; 용량 초과 아님 |
| 격리 실제 앱 첫 시도 | 입력 영상 생성 | fail | macOS 서비스 접근 제한에서 30초 timeout; 원출력 미보존, 실제 제품 서버 미기동. 권한을 맞춘 재검증은 위의 `lp26-o08-short-app.log` |

미완료·미확인: O08 변경 뒤 120분 장시간은 3차에서 FAIL, 영향받는 UI와 릴리즈 최종 판정은 미실행.
