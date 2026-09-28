# LP17 비교 실행 개별 결과

독자: 녹화 검증 담당. 수명: 2026-09-19 진단 원출력의 보존형 전수 표.
정책은 AGENTS.md, 판정 해석과 최초 실패→수정은 [중앙 기록](../../../release-test-records.md#2026-09-19-lp17-비교-도구-구현과-원인-측정)이 기준이다.
원출력의 명령·전이·해시·자원 관측을 대체하지 않는다. 아래 PASS는 해당 assertion/phase만이며 제품·HTTP·릴리즈 PASS가 아니다.
H11의 guard-02~04 출력은 역사 관측으로 보존하고 명명/사전등록 정정 후 guard-05만 유효 증거로 사용한다.

## lp17-environment-observe-01

[원출력](lp17-environment-observe-01.txt) · 2009B · SHA-256 `1e99c8cfceb5356f07f6f1be3a1c606aa0fefc779c4b00d65aa247a29a9d4c1c`

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| environment-observation 실행 | exit=0; signal=null; 1151ms; phase 종료 검사 | PASS | 원출력 22행; stop=null; observation=null; semantic=null; historicalRssPass=null; cleanup=true |
| 실행 묶음 | phases=1; elapsed=1300ms; productPass=false | PASS | 원출력 25행; failure=null; 실패 뒤 단계는 미실행 |
| 소유 root 정리 | 삭제 전 62691B, removed=true | PASS | 원출력 24행; 자식 그룹 종료 확인 후 삭제 |
| 소스 불변 | true | PASS | 원출력 23행 |

### 개별 검사

개별 본문 assertion 출력 없음. 위 phase 실패/환경 단독 실행 상태와 구분한다.

## lp17-full-comparison-01

[원출력](lp17-full-comparison-01.txt) · 2074051B · SHA-256 `baf0e077aa6b1c415a336d1f7eac38e9b9599f02081bb9f542f09bedd332bed0`

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| runtime-freshness 실행 | exit=0; signal=null; 343ms; phase 종료 검사 | PASS | 원출력 22행; stop=null; observation=null; semantic=null; historicalRssPass=null; cleanup=true |
| compile 실행 | exit=0; signal=null; 4087ms; phase 종료 검사 | PASS | 원출력 54행; stop=null; observation=null; semantic=null; historicalRssPass=null; cleanup=true |
| prepare 실행 | exit=0; signal=null; 4117ms; assertion 6/0 | PASS | 원출력 84행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| scale-A 실행 | exit=0; signal=null; 29391ms; assertion 111/0 | PASS | 원출력 3201행; stop=null; observation=true; semantic=true; historicalRssPass=false; cleanup=true |
| reopen-A-sqlite 실행 | exit=0; signal=null; 23656ms; assertion 67/0 | PASS | 원출력 3524행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| reopen-A-jsonl 실행 | exit=0; signal=null; 16185ms; assertion 67/0 | PASS | 원출력 3839행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| scale-B 실행 | exit=0; signal=null; 29326ms; assertion 111/0 | PASS | 원출력 6956행; stop=null; observation=true; semantic=true; historicalRssPass=false; cleanup=true |
| reopen-B-sqlite 실행 | exit=0; signal=null; 23574ms; assertion 67/0 | PASS | 원출력 7279행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| reopen-B-jsonl 실행 | exit=0; signal=null; 16145ms; assertion 67/0 | PASS | 원출력 7594행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| scale-C 실행 | exit=0; signal=null; 91496ms; assertion 111/0 | PASS | 원출력 10803행; stop=null; observation=true; semantic=true; historicalRssPass=false; cleanup=true |
| reopen-C-sqlite 실행 | exit=0; signal=null; 23467ms; assertion 67/0 | PASS | 원출력 11126행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| reopen-C-jsonl 실행 | exit=0; signal=null; 16164ms; assertion 67/0 | PASS | 원출력 11441행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| job-B 실행 | exit=1; signal=null; 3255ms; phase 종료 검사 | FAIL | 원출력 11601행; stop=null; observation=false; semantic=false; historicalRssPass=true; cleanup=true |
| 실행 묶음 | phases=13; elapsed=281813ms; productPass=false | FAIL | 원출력 11605행; failure=phase-failed; 실패 뒤 단계는 미실행 |
| <owned-root>/store-A 정리 | 삭제 전 184356502B, removed=true | PASS | 원출력 3840행; 자식 그룹 종료 확인 후 삭제 |
| <owned-root>/store-B 정리 | 삭제 전 184356502B, removed=true | PASS | 원출력 7595행; 자식 그룹 종료 확인 후 삭제 |
| <owned-root>/store-C 정리 | 삭제 전 184356502B, removed=true | PASS | 원출력 11442행; 자식 그룹 종료 확인 후 삭제 |
| 소유 root 정리 | 삭제 전 66134810B, removed=true | PASS | 원출력 11604행; 자식 그룹 종료 확인 후 삭제 |
| 소스 불변 | true | PASS | 원출력 11603행 |

### 개별 검사

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| compile/1 | FC01 exact insertion checks count=95 | PASS | 원출력 28행 |
| prepare/2 | recorded FE02 writer start | PASS | 원출력 57행 |
| prepare/3 | recorded FE04 bound finalized mutation segment0 | PASS | 원출력 58행 |
| prepare/4 | LP17/prepare LP02.actual4096-prerequisite | PASS | 원출력 60행 |
| prepare/5 | LP17/prepare seed.input-count | PASS | 원출력 61행 |
| prepare/6 | LP17/prepare seed.input-identity-all-samples | PASS | 원출력 62행 |
| prepare/7 | LP17/prepare seed.physical-evidence | PASS | 원출력 63행 |
| scale-A/8 | LP17/commit1 LP02.reserve | PASS | 원출력 102행 |
| scale-A/9 | LP17/commit1 LP02.actual-file-outside-catalog | PASS | 원출력 103행 |
| scale-A/10 | LP17/commit1 LP02.commit | PASS | 원출력 171행 |
| scale-A/11 | LP17/commit2 LP02.reserve | PASS | 원출력 186행 |
| scale-A/12 | LP17/commit2 LP02.actual-file-outside-catalog | PASS | 원출력 187행 |
| scale-A/13 | LP17/commit2 LP02.commit | PASS | 원출력 255행 |
| scale-A/14 | LP17/commit3 LP02.reserve | PASS | 원출력 270행 |
| scale-A/15 | LP17/commit3 LP02.actual-file-outside-catalog | PASS | 원출력 271행 |
| scale-A/16 | LP17/commit3 LP02.commit | PASS | 원출력 339행 |
| scale-A/17 | LP17/commit4 LP02.reserve | PASS | 원출력 354행 |
| scale-A/18 | LP17/commit4 LP02.actual-file-outside-catalog | PASS | 원출력 355행 |
| scale-A/19 | LP17/commit4 LP02.commit | PASS | 원출력 423행 |
| scale-A/20 | LP17/commit5 LP02.reserve | PASS | 원출력 438행 |
| scale-A/21 | LP17/commit5 LP02.actual-file-outside-catalog | PASS | 원출력 439행 |
| scale-A/22 | LP17/commit5 LP02.commit | PASS | 원출력 507행 |
| scale-A/23 | LP17/commit6 LP02.reserve | PASS | 원출력 522행 |
| scale-A/24 | LP17/commit6 LP02.actual-file-outside-catalog | PASS | 원출력 523행 |
| scale-A/25 | LP17/commit6 LP02.commit | PASS | 원출력 591행 |
| scale-A/26 | LP17/commit7 LP02.reserve | PASS | 원출력 606행 |
| scale-A/27 | LP17/commit7 LP02.actual-file-outside-catalog | PASS | 원출력 607행 |
| scale-A/28 | LP17/commit7 LP02.commit | PASS | 원출력 675행 |
| scale-A/29 | LP17/commit8 LP02.reserve | PASS | 원출력 690행 |
| scale-A/30 | LP17/commit8 LP02.actual-file-outside-catalog | PASS | 원출력 691행 |
| scale-A/31 | LP17/commit8 LP02.commit | PASS | 원출력 759행 |
| scale-A/32 | LP17/commit9 LP02.reserve | PASS | 원출력 774행 |
| scale-A/33 | LP17/commit9 LP02.actual-file-outside-catalog | PASS | 원출력 775행 |
| scale-A/34 | LP17/commit9 LP02.commit | PASS | 원출력 843행 |
| scale-A/35 | LP17/commit10 LP02.reserve | PASS | 원출력 858행 |
| scale-A/36 | LP17/commit10 LP02.actual-file-outside-catalog | PASS | 원출력 859행 |
| scale-A/37 | LP17/commit10 LP02.commit | PASS | 원출력 927행 |
| scale-A/38 | LP17/commit11 LP02.reserve | PASS | 원출력 942행 |
| scale-A/39 | LP17/commit11 LP02.actual-file-outside-catalog | PASS | 원출력 943행 |
| scale-A/40 | LP17/commit11 LP02.commit | PASS | 원출력 1011행 |
| scale-A/41 | LP17/commit12 LP02.reserve | PASS | 원출력 1026행 |
| scale-A/42 | LP17/commit12 LP02.actual-file-outside-catalog | PASS | 원출력 1027행 |
| scale-A/43 | LP17/commit12 LP02.commit | PASS | 원출력 1095행 |
| scale-A/44 | LP17/commit13 LP02.reserve | PASS | 원출력 1110행 |
| scale-A/45 | LP17/commit13 LP02.actual-file-outside-catalog | PASS | 원출력 1111행 |
| scale-A/46 | LP17/commit13 LP02.commit | PASS | 원출력 1179행 |
| scale-A/47 | LP17/commit14 LP02.reserve | PASS | 원출력 1194행 |
| scale-A/48 | LP17/commit14 LP02.actual-file-outside-catalog | PASS | 원출력 1195행 |
| scale-A/49 | LP17/commit14 LP02.commit | PASS | 원출력 1263행 |
| scale-A/50 | LP17/commit15 LP02.reserve | PASS | 원출력 1278행 |
| scale-A/51 | LP17/commit15 LP02.actual-file-outside-catalog | PASS | 원출력 1279행 |
| scale-A/52 | LP17/commit15 LP02.commit | PASS | 원출력 1347행 |
| scale-A/53 | LP17/commit16 LP02.reserve | PASS | 원출력 1362행 |
| scale-A/54 | LP17/commit16 LP02.actual-file-outside-catalog | PASS | 원출력 1363행 |
| scale-A/55 | LP17/commit16 LP02.commit | PASS | 원출력 1431행 |
| scale-A/56 | LP17/snapshot16 LP02.snapshot-exact-count | PASS | 원출력 1452행 |
| scale-A/57 | LP17/snapshot16 snapshot.canonical-all | PASS | 원출력 1507행 |
| scale-A/58 | LP17/snapshot16 LP02.explicit-checkpoint | PASS | 원출력 1535행 |
| scale-A/59 | LP17/snapshot16 LP02.reservation-bound-mutation-count | PASS | 원출력 1541행 |
| scale-A/60 | LP17/commit17 LP02.reserve | PASS | 원출력 1550행 |
| scale-A/61 | LP17/commit17 LP02.actual-file-outside-catalog | PASS | 원출력 1551행 |
| scale-A/62 | LP17/commit17 LP02.commit | PASS | 원출력 1619행 |
| scale-A/63 | LP17/commit18 LP02.reserve | PASS | 원출력 1634행 |
| scale-A/64 | LP17/commit18 LP02.actual-file-outside-catalog | PASS | 원출력 1635행 |
| scale-A/65 | LP17/commit18 LP02.commit | PASS | 원출력 1703행 |
| scale-A/66 | LP17/commit19 LP02.reserve | PASS | 원출력 1718행 |
| scale-A/67 | LP17/commit19 LP02.actual-file-outside-catalog | PASS | 원출력 1719행 |
| scale-A/68 | LP17/commit19 LP02.commit | PASS | 원출력 1787행 |
| scale-A/69 | LP17/commit20 LP02.reserve | PASS | 원출력 1802행 |
| scale-A/70 | LP17/commit20 LP02.actual-file-outside-catalog | PASS | 원출력 1803행 |
| scale-A/71 | LP17/commit20 LP02.commit | PASS | 원출력 1871행 |
| scale-A/72 | LP17/commit21 LP02.reserve | PASS | 원출력 1886행 |
| scale-A/73 | LP17/commit21 LP02.actual-file-outside-catalog | PASS | 원출력 1887행 |
| scale-A/74 | LP17/commit21 LP02.commit | PASS | 원출력 1955행 |
| scale-A/75 | LP17/commit22 LP02.reserve | PASS | 원출력 1970행 |
| scale-A/76 | LP17/commit22 LP02.actual-file-outside-catalog | PASS | 원출력 1971행 |
| scale-A/77 | LP17/commit22 LP02.commit | PASS | 원출력 2039행 |
| scale-A/78 | LP17/commit23 LP02.reserve | PASS | 원출력 2054행 |
| scale-A/79 | LP17/commit23 LP02.actual-file-outside-catalog | PASS | 원출력 2055행 |
| scale-A/80 | LP17/commit23 LP02.commit | PASS | 원출력 2123행 |
| scale-A/81 | LP17/commit24 LP02.reserve | PASS | 원출력 2138행 |
| scale-A/82 | LP17/commit24 LP02.actual-file-outside-catalog | PASS | 원출력 2139행 |
| scale-A/83 | LP17/commit24 LP02.commit | PASS | 원출력 2207행 |
| scale-A/84 | LP17/commit25 LP02.reserve | PASS | 원출력 2222행 |
| scale-A/85 | LP17/commit25 LP02.actual-file-outside-catalog | PASS | 원출력 2223행 |
| scale-A/86 | LP17/commit25 LP02.commit | PASS | 원출력 2291행 |
| scale-A/87 | LP17/commit26 LP02.reserve | PASS | 원출력 2306행 |
| scale-A/88 | LP17/commit26 LP02.actual-file-outside-catalog | PASS | 원출력 2307행 |
| scale-A/89 | LP17/commit26 LP02.commit | PASS | 원출력 2375행 |
| scale-A/90 | LP17/commit27 LP02.reserve | PASS | 원출력 2390행 |
| scale-A/91 | LP17/commit27 LP02.actual-file-outside-catalog | PASS | 원출력 2391행 |
| scale-A/92 | LP17/commit27 LP02.commit | PASS | 원출력 2459행 |
| scale-A/93 | LP17/commit28 LP02.reserve | PASS | 원출력 2474행 |
| scale-A/94 | LP17/commit28 LP02.actual-file-outside-catalog | PASS | 원출력 2475행 |
| scale-A/95 | LP17/commit28 LP02.commit | PASS | 원출력 2543행 |
| scale-A/96 | LP17/commit29 LP02.reserve | PASS | 원출력 2558행 |
| scale-A/97 | LP17/commit29 LP02.actual-file-outside-catalog | PASS | 원출력 2559행 |
| scale-A/98 | LP17/commit29 LP02.commit | PASS | 원출력 2627행 |
| scale-A/99 | LP17/commit30 LP02.reserve | PASS | 원출력 2642행 |
| scale-A/100 | LP17/commit30 LP02.actual-file-outside-catalog | PASS | 원출력 2643행 |
| scale-A/101 | LP17/commit30 LP02.commit | PASS | 원출력 2711행 |
| scale-A/102 | LP17/commit31 LP02.reserve | PASS | 원출력 2726행 |
| scale-A/103 | LP17/commit31 LP02.actual-file-outside-catalog | PASS | 원출력 2727행 |
| scale-A/104 | LP17/commit31 LP02.commit | PASS | 원출력 2795행 |
| scale-A/105 | LP17/commit32 LP02.reserve | PASS | 원출력 2810행 |
| scale-A/106 | LP17/commit32 LP02.actual-file-outside-catalog | PASS | 원출력 2811행 |
| scale-A/107 | LP17/commit32 LP02.commit | PASS | 원출력 2879행 |
| scale-A/108 | LP17/snapshot32 LP02.snapshot-exact-count | PASS | 원출력 2900행 |
| scale-A/109 | LP17/snapshot32 snapshot.canonical-all | PASS | 원출력 3003행 |
| scale-A/110 | LP17/snapshot32 LP02.explicit-checkpoint | PASS | 원출력 3031행 |
| scale-A/111 | LP17/snapshot32 LP02.reservation-bound-mutation-count | PASS | 원출력 3037행 |
| scale-A/112 | LP17/delete delete.original-canonical | PASS | 원출력 3046행 |
| scale-A/113 | LP17/delete delete.pending | PASS | 원출력 3063행 |
| scale-A/114 | LP17/delete delete.unlink | PASS | 원출력 3064행 |
| scale-A/115 | LP17/delete delete.tombstone | PASS | 원출력 3080행 |
| scale-A/116 | LP17/delete delete.checkpoint | PASS | 원출력 3104행 |
| scale-A/117 | LP17/delete delete.binding-preserved | PASS | 원출력 3105행 |
| scale-A/118 | LP17/delete deleted.public-hidden | PASS | 원출력 3106행 |
| reopen-A-sqlite/119 | LP17/reopen/sqlite LP02.journal-reopen | PASS | 원출력 3305행 |
| reopen-A-sqlite/120 | LP17/reopen/sqlite LP02.catalog-reopen | PASS | 원출력 3329행 |
| reopen-A-sqlite/121 | LP17/reopen/sqlite/0 LP02.exact-source | PASS | 원출력 3335행 |
| reopen-A-sqlite/122 | LP17/reopen/sqlite/0 deleted.public-hidden | PASS | 원출력 3336행 |
| reopen-A-sqlite/123 | LP17/reopen/sqlite/0 reopen.deleted-state | PASS | 원출력 3338행 |
| reopen-A-sqlite/124 | LP17/reopen/sqlite/1 LP02.exact-source | PASS | 원출력 3339행 |
| reopen-A-sqlite/125 | LP17/reopen/sqlite/1 reopen.remaining-media | PASS | 원출력 3341행 |
| reopen-A-sqlite/126 | LP17/reopen/sqlite/2 LP02.exact-source | PASS | 원출력 3342행 |
| reopen-A-sqlite/127 | LP17/reopen/sqlite/2 reopen.remaining-media | PASS | 원출력 3344행 |
| reopen-A-sqlite/128 | LP17/reopen/sqlite/3 LP02.exact-source | PASS | 원출력 3345행 |
| reopen-A-sqlite/129 | LP17/reopen/sqlite/3 reopen.remaining-media | PASS | 원출력 3347행 |
| reopen-A-sqlite/130 | LP17/reopen/sqlite/4 LP02.exact-source | PASS | 원출력 3348행 |
| reopen-A-sqlite/131 | LP17/reopen/sqlite/4 reopen.remaining-media | PASS | 원출력 3350행 |
| reopen-A-sqlite/132 | LP17/reopen/sqlite/5 LP02.exact-source | PASS | 원출력 3351행 |
| reopen-A-sqlite/133 | LP17/reopen/sqlite/5 reopen.remaining-media | PASS | 원출력 3353행 |
| reopen-A-sqlite/134 | LP17/reopen/sqlite/6 LP02.exact-source | PASS | 원출력 3354행 |
| reopen-A-sqlite/135 | LP17/reopen/sqlite/6 reopen.remaining-media | PASS | 원출력 3356행 |
| reopen-A-sqlite/136 | LP17/reopen/sqlite/7 LP02.exact-source | PASS | 원출력 3357행 |
| reopen-A-sqlite/137 | LP17/reopen/sqlite/7 reopen.remaining-media | PASS | 원출력 3359행 |
| reopen-A-sqlite/138 | LP17/reopen/sqlite/8 LP02.exact-source | PASS | 원출력 3360행 |
| reopen-A-sqlite/139 | LP17/reopen/sqlite/8 reopen.remaining-media | PASS | 원출력 3362행 |
| reopen-A-sqlite/140 | LP17/reopen/sqlite/9 LP02.exact-source | PASS | 원출력 3363행 |
| reopen-A-sqlite/141 | LP17/reopen/sqlite/9 reopen.remaining-media | PASS | 원출력 3365행 |
| reopen-A-sqlite/142 | LP17/reopen/sqlite/10 LP02.exact-source | PASS | 원출력 3366행 |
| reopen-A-sqlite/143 | LP17/reopen/sqlite/10 reopen.remaining-media | PASS | 원출력 3368행 |
| reopen-A-sqlite/144 | LP17/reopen/sqlite/11 LP02.exact-source | PASS | 원출력 3369행 |
| reopen-A-sqlite/145 | LP17/reopen/sqlite/11 reopen.remaining-media | PASS | 원출력 3371행 |
| reopen-A-sqlite/146 | LP17/reopen/sqlite/12 LP02.exact-source | PASS | 원출력 3372행 |
| reopen-A-sqlite/147 | LP17/reopen/sqlite/12 reopen.remaining-media | PASS | 원출력 3374행 |
| reopen-A-sqlite/148 | LP17/reopen/sqlite/13 LP02.exact-source | PASS | 원출력 3375행 |
| reopen-A-sqlite/149 | LP17/reopen/sqlite/13 reopen.remaining-media | PASS | 원출력 3377행 |
| reopen-A-sqlite/150 | LP17/reopen/sqlite/14 LP02.exact-source | PASS | 원출력 3378행 |
| reopen-A-sqlite/151 | LP17/reopen/sqlite/14 reopen.remaining-media | PASS | 원출력 3380행 |
| reopen-A-sqlite/152 | LP17/reopen/sqlite/15 LP02.exact-source | PASS | 원출력 3381행 |
| reopen-A-sqlite/153 | LP17/reopen/sqlite/15 reopen.remaining-media | PASS | 원출력 3383행 |
| reopen-A-sqlite/154 | LP17/reopen/sqlite/16 LP02.exact-source | PASS | 원출력 3384행 |
| reopen-A-sqlite/155 | LP17/reopen/sqlite/16 reopen.remaining-media | PASS | 원출력 3386행 |
| reopen-A-sqlite/156 | LP17/reopen/sqlite/17 LP02.exact-source | PASS | 원출력 3387행 |
| reopen-A-sqlite/157 | LP17/reopen/sqlite/17 reopen.remaining-media | PASS | 원출력 3389행 |
| reopen-A-sqlite/158 | LP17/reopen/sqlite/18 LP02.exact-source | PASS | 원출력 3390행 |
| reopen-A-sqlite/159 | LP17/reopen/sqlite/18 reopen.remaining-media | PASS | 원출력 3392행 |
| reopen-A-sqlite/160 | LP17/reopen/sqlite/19 LP02.exact-source | PASS | 원출력 3393행 |
| reopen-A-sqlite/161 | LP17/reopen/sqlite/19 reopen.remaining-media | PASS | 원출력 3395행 |
| reopen-A-sqlite/162 | LP17/reopen/sqlite/20 LP02.exact-source | PASS | 원출력 3396행 |
| reopen-A-sqlite/163 | LP17/reopen/sqlite/20 reopen.remaining-media | PASS | 원출력 3398행 |
| reopen-A-sqlite/164 | LP17/reopen/sqlite/21 LP02.exact-source | PASS | 원출력 3399행 |
| reopen-A-sqlite/165 | LP17/reopen/sqlite/21 reopen.remaining-media | PASS | 원출력 3401행 |
| reopen-A-sqlite/166 | LP17/reopen/sqlite/22 LP02.exact-source | PASS | 원출력 3402행 |
| reopen-A-sqlite/167 | LP17/reopen/sqlite/22 reopen.remaining-media | PASS | 원출력 3404행 |
| reopen-A-sqlite/168 | LP17/reopen/sqlite/23 LP02.exact-source | PASS | 원출력 3405행 |
| reopen-A-sqlite/169 | LP17/reopen/sqlite/23 reopen.remaining-media | PASS | 원출력 3407행 |
| reopen-A-sqlite/170 | LP17/reopen/sqlite/24 LP02.exact-source | PASS | 원출력 3408행 |
| reopen-A-sqlite/171 | LP17/reopen/sqlite/24 reopen.remaining-media | PASS | 원출력 3410행 |
| reopen-A-sqlite/172 | LP17/reopen/sqlite/25 LP02.exact-source | PASS | 원출력 3411행 |
| reopen-A-sqlite/173 | LP17/reopen/sqlite/25 reopen.remaining-media | PASS | 원출력 3413행 |
| reopen-A-sqlite/174 | LP17/reopen/sqlite/26 LP02.exact-source | PASS | 원출력 3414행 |
| reopen-A-sqlite/175 | LP17/reopen/sqlite/26 reopen.remaining-media | PASS | 원출력 3416행 |
| reopen-A-sqlite/176 | LP17/reopen/sqlite/27 LP02.exact-source | PASS | 원출력 3417행 |
| reopen-A-sqlite/177 | LP17/reopen/sqlite/27 reopen.remaining-media | PASS | 원출력 3419행 |
| reopen-A-sqlite/178 | LP17/reopen/sqlite/28 LP02.exact-source | PASS | 원출력 3420행 |
| reopen-A-sqlite/179 | LP17/reopen/sqlite/28 reopen.remaining-media | PASS | 원출력 3422행 |
| reopen-A-sqlite/180 | LP17/reopen/sqlite/29 LP02.exact-source | PASS | 원출력 3423행 |
| reopen-A-sqlite/181 | LP17/reopen/sqlite/29 reopen.remaining-media | PASS | 원출력 3425행 |
| reopen-A-sqlite/182 | LP17/reopen/sqlite/30 LP02.exact-source | PASS | 원출력 3426행 |
| reopen-A-sqlite/183 | LP17/reopen/sqlite/30 reopen.remaining-media | PASS | 원출력 3428행 |
| reopen-A-sqlite/184 | LP17/reopen/sqlite/31 LP02.exact-source | PASS | 원출력 3429행 |
| reopen-A-sqlite/185 | LP17/reopen/sqlite/31 reopen.remaining-media | PASS | 원출력 3431행 |
| reopen-A-jsonl/186 | LP17/reopen/jsonl LP02.journal-reopen | PASS | 원출력 3628행 |
| reopen-A-jsonl/187 | LP17/reopen/jsonl LP02.catalog-reopen | PASS | 원출력 3644행 |
| reopen-A-jsonl/188 | LP17/reopen/jsonl/0 LP02.exact-source | PASS | 원출력 3650행 |
| reopen-A-jsonl/189 | LP17/reopen/jsonl/0 deleted.public-hidden | PASS | 원출력 3651행 |
| reopen-A-jsonl/190 | LP17/reopen/jsonl/0 reopen.deleted-state | PASS | 원출력 3653행 |
| reopen-A-jsonl/191 | LP17/reopen/jsonl/1 LP02.exact-source | PASS | 원출력 3654행 |
| reopen-A-jsonl/192 | LP17/reopen/jsonl/1 reopen.remaining-media | PASS | 원출력 3656행 |
| reopen-A-jsonl/193 | LP17/reopen/jsonl/2 LP02.exact-source | PASS | 원출력 3657행 |
| reopen-A-jsonl/194 | LP17/reopen/jsonl/2 reopen.remaining-media | PASS | 원출력 3659행 |
| reopen-A-jsonl/195 | LP17/reopen/jsonl/3 LP02.exact-source | PASS | 원출력 3660행 |
| reopen-A-jsonl/196 | LP17/reopen/jsonl/3 reopen.remaining-media | PASS | 원출력 3662행 |
| reopen-A-jsonl/197 | LP17/reopen/jsonl/4 LP02.exact-source | PASS | 원출력 3663행 |
| reopen-A-jsonl/198 | LP17/reopen/jsonl/4 reopen.remaining-media | PASS | 원출력 3665행 |
| reopen-A-jsonl/199 | LP17/reopen/jsonl/5 LP02.exact-source | PASS | 원출력 3666행 |
| reopen-A-jsonl/200 | LP17/reopen/jsonl/5 reopen.remaining-media | PASS | 원출력 3668행 |
| reopen-A-jsonl/201 | LP17/reopen/jsonl/6 LP02.exact-source | PASS | 원출력 3669행 |
| reopen-A-jsonl/202 | LP17/reopen/jsonl/6 reopen.remaining-media | PASS | 원출력 3671행 |
| reopen-A-jsonl/203 | LP17/reopen/jsonl/7 LP02.exact-source | PASS | 원출력 3672행 |
| reopen-A-jsonl/204 | LP17/reopen/jsonl/7 reopen.remaining-media | PASS | 원출력 3674행 |
| reopen-A-jsonl/205 | LP17/reopen/jsonl/8 LP02.exact-source | PASS | 원출력 3675행 |
| reopen-A-jsonl/206 | LP17/reopen/jsonl/8 reopen.remaining-media | PASS | 원출력 3677행 |
| reopen-A-jsonl/207 | LP17/reopen/jsonl/9 LP02.exact-source | PASS | 원출력 3678행 |
| reopen-A-jsonl/208 | LP17/reopen/jsonl/9 reopen.remaining-media | PASS | 원출력 3680행 |
| reopen-A-jsonl/209 | LP17/reopen/jsonl/10 LP02.exact-source | PASS | 원출력 3681행 |
| reopen-A-jsonl/210 | LP17/reopen/jsonl/10 reopen.remaining-media | PASS | 원출력 3683행 |
| reopen-A-jsonl/211 | LP17/reopen/jsonl/11 LP02.exact-source | PASS | 원출력 3684행 |
| reopen-A-jsonl/212 | LP17/reopen/jsonl/11 reopen.remaining-media | PASS | 원출력 3686행 |
| reopen-A-jsonl/213 | LP17/reopen/jsonl/12 LP02.exact-source | PASS | 원출력 3687행 |
| reopen-A-jsonl/214 | LP17/reopen/jsonl/12 reopen.remaining-media | PASS | 원출력 3689행 |
| reopen-A-jsonl/215 | LP17/reopen/jsonl/13 LP02.exact-source | PASS | 원출력 3690행 |
| reopen-A-jsonl/216 | LP17/reopen/jsonl/13 reopen.remaining-media | PASS | 원출력 3692행 |
| reopen-A-jsonl/217 | LP17/reopen/jsonl/14 LP02.exact-source | PASS | 원출력 3693행 |
| reopen-A-jsonl/218 | LP17/reopen/jsonl/14 reopen.remaining-media | PASS | 원출력 3695행 |
| reopen-A-jsonl/219 | LP17/reopen/jsonl/15 LP02.exact-source | PASS | 원출력 3696행 |
| reopen-A-jsonl/220 | LP17/reopen/jsonl/15 reopen.remaining-media | PASS | 원출력 3698행 |
| reopen-A-jsonl/221 | LP17/reopen/jsonl/16 LP02.exact-source | PASS | 원출력 3699행 |
| reopen-A-jsonl/222 | LP17/reopen/jsonl/16 reopen.remaining-media | PASS | 원출력 3701행 |
| reopen-A-jsonl/223 | LP17/reopen/jsonl/17 LP02.exact-source | PASS | 원출력 3702행 |
| reopen-A-jsonl/224 | LP17/reopen/jsonl/17 reopen.remaining-media | PASS | 원출력 3704행 |
| reopen-A-jsonl/225 | LP17/reopen/jsonl/18 LP02.exact-source | PASS | 원출력 3705행 |
| reopen-A-jsonl/226 | LP17/reopen/jsonl/18 reopen.remaining-media | PASS | 원출력 3707행 |
| reopen-A-jsonl/227 | LP17/reopen/jsonl/19 LP02.exact-source | PASS | 원출력 3708행 |
| reopen-A-jsonl/228 | LP17/reopen/jsonl/19 reopen.remaining-media | PASS | 원출력 3710행 |
| reopen-A-jsonl/229 | LP17/reopen/jsonl/20 LP02.exact-source | PASS | 원출력 3711행 |
| reopen-A-jsonl/230 | LP17/reopen/jsonl/20 reopen.remaining-media | PASS | 원출력 3713행 |
| reopen-A-jsonl/231 | LP17/reopen/jsonl/21 LP02.exact-source | PASS | 원출력 3714행 |
| reopen-A-jsonl/232 | LP17/reopen/jsonl/21 reopen.remaining-media | PASS | 원출력 3716행 |
| reopen-A-jsonl/233 | LP17/reopen/jsonl/22 LP02.exact-source | PASS | 원출력 3717행 |
| reopen-A-jsonl/234 | LP17/reopen/jsonl/22 reopen.remaining-media | PASS | 원출력 3719행 |
| reopen-A-jsonl/235 | LP17/reopen/jsonl/23 LP02.exact-source | PASS | 원출력 3720행 |
| reopen-A-jsonl/236 | LP17/reopen/jsonl/23 reopen.remaining-media | PASS | 원출력 3722행 |
| reopen-A-jsonl/237 | LP17/reopen/jsonl/24 LP02.exact-source | PASS | 원출력 3723행 |
| reopen-A-jsonl/238 | LP17/reopen/jsonl/24 reopen.remaining-media | PASS | 원출력 3725행 |
| reopen-A-jsonl/239 | LP17/reopen/jsonl/25 LP02.exact-source | PASS | 원출력 3726행 |
| reopen-A-jsonl/240 | LP17/reopen/jsonl/25 reopen.remaining-media | PASS | 원출력 3728행 |
| reopen-A-jsonl/241 | LP17/reopen/jsonl/26 LP02.exact-source | PASS | 원출력 3729행 |
| reopen-A-jsonl/242 | LP17/reopen/jsonl/26 reopen.remaining-media | PASS | 원출력 3731행 |
| reopen-A-jsonl/243 | LP17/reopen/jsonl/27 LP02.exact-source | PASS | 원출력 3732행 |
| reopen-A-jsonl/244 | LP17/reopen/jsonl/27 reopen.remaining-media | PASS | 원출력 3734행 |
| reopen-A-jsonl/245 | LP17/reopen/jsonl/28 LP02.exact-source | PASS | 원출력 3735행 |
| reopen-A-jsonl/246 | LP17/reopen/jsonl/28 reopen.remaining-media | PASS | 원출력 3737행 |
| reopen-A-jsonl/247 | LP17/reopen/jsonl/29 LP02.exact-source | PASS | 원출력 3738행 |
| reopen-A-jsonl/248 | LP17/reopen/jsonl/29 reopen.remaining-media | PASS | 원출력 3740행 |
| reopen-A-jsonl/249 | LP17/reopen/jsonl/30 LP02.exact-source | PASS | 원출력 3741행 |
| reopen-A-jsonl/250 | LP17/reopen/jsonl/30 reopen.remaining-media | PASS | 원출력 3743행 |
| reopen-A-jsonl/251 | LP17/reopen/jsonl/31 LP02.exact-source | PASS | 원출력 3744행 |
| reopen-A-jsonl/252 | LP17/reopen/jsonl/31 reopen.remaining-media | PASS | 원출력 3746행 |
| scale-B/253 | LP17/commit1 LP02.reserve | PASS | 원출력 3857행 |
| scale-B/254 | LP17/commit1 LP02.actual-file-outside-catalog | PASS | 원출력 3858행 |
| scale-B/255 | LP17/commit1 LP02.commit | PASS | 원출력 3926행 |
| scale-B/256 | LP17/commit2 LP02.reserve | PASS | 원출력 3941행 |
| scale-B/257 | LP17/commit2 LP02.actual-file-outside-catalog | PASS | 원출력 3942행 |
| scale-B/258 | LP17/commit2 LP02.commit | PASS | 원출력 4010행 |
| scale-B/259 | LP17/commit3 LP02.reserve | PASS | 원출력 4025행 |
| scale-B/260 | LP17/commit3 LP02.actual-file-outside-catalog | PASS | 원출력 4026행 |
| scale-B/261 | LP17/commit3 LP02.commit | PASS | 원출력 4094행 |
| scale-B/262 | LP17/commit4 LP02.reserve | PASS | 원출력 4109행 |
| scale-B/263 | LP17/commit4 LP02.actual-file-outside-catalog | PASS | 원출력 4110행 |
| scale-B/264 | LP17/commit4 LP02.commit | PASS | 원출력 4178행 |
| scale-B/265 | LP17/commit5 LP02.reserve | PASS | 원출력 4193행 |
| scale-B/266 | LP17/commit5 LP02.actual-file-outside-catalog | PASS | 원출력 4194행 |
| scale-B/267 | LP17/commit5 LP02.commit | PASS | 원출력 4262행 |
| scale-B/268 | LP17/commit6 LP02.reserve | PASS | 원출력 4277행 |
| scale-B/269 | LP17/commit6 LP02.actual-file-outside-catalog | PASS | 원출력 4278행 |
| scale-B/270 | LP17/commit6 LP02.commit | PASS | 원출력 4346행 |
| scale-B/271 | LP17/commit7 LP02.reserve | PASS | 원출력 4361행 |
| scale-B/272 | LP17/commit7 LP02.actual-file-outside-catalog | PASS | 원출력 4362행 |
| scale-B/273 | LP17/commit7 LP02.commit | PASS | 원출력 4430행 |
| scale-B/274 | LP17/commit8 LP02.reserve | PASS | 원출력 4445행 |
| scale-B/275 | LP17/commit8 LP02.actual-file-outside-catalog | PASS | 원출력 4446행 |
| scale-B/276 | LP17/commit8 LP02.commit | PASS | 원출력 4514행 |
| scale-B/277 | LP17/commit9 LP02.reserve | PASS | 원출력 4529행 |
| scale-B/278 | LP17/commit9 LP02.actual-file-outside-catalog | PASS | 원출력 4530행 |
| scale-B/279 | LP17/commit9 LP02.commit | PASS | 원출력 4598행 |
| scale-B/280 | LP17/commit10 LP02.reserve | PASS | 원출력 4613행 |
| scale-B/281 | LP17/commit10 LP02.actual-file-outside-catalog | PASS | 원출력 4614행 |
| scale-B/282 | LP17/commit10 LP02.commit | PASS | 원출력 4682행 |
| scale-B/283 | LP17/commit11 LP02.reserve | PASS | 원출력 4697행 |
| scale-B/284 | LP17/commit11 LP02.actual-file-outside-catalog | PASS | 원출력 4698행 |
| scale-B/285 | LP17/commit11 LP02.commit | PASS | 원출력 4766행 |
| scale-B/286 | LP17/commit12 LP02.reserve | PASS | 원출력 4781행 |
| scale-B/287 | LP17/commit12 LP02.actual-file-outside-catalog | PASS | 원출력 4782행 |
| scale-B/288 | LP17/commit12 LP02.commit | PASS | 원출력 4850행 |
| scale-B/289 | LP17/commit13 LP02.reserve | PASS | 원출력 4865행 |
| scale-B/290 | LP17/commit13 LP02.actual-file-outside-catalog | PASS | 원출력 4866행 |
| scale-B/291 | LP17/commit13 LP02.commit | PASS | 원출력 4934행 |
| scale-B/292 | LP17/commit14 LP02.reserve | PASS | 원출력 4949행 |
| scale-B/293 | LP17/commit14 LP02.actual-file-outside-catalog | PASS | 원출력 4950행 |
| scale-B/294 | LP17/commit14 LP02.commit | PASS | 원출력 5018행 |
| scale-B/295 | LP17/commit15 LP02.reserve | PASS | 원출력 5033행 |
| scale-B/296 | LP17/commit15 LP02.actual-file-outside-catalog | PASS | 원출력 5034행 |
| scale-B/297 | LP17/commit15 LP02.commit | PASS | 원출력 5102행 |
| scale-B/298 | LP17/commit16 LP02.reserve | PASS | 원출력 5117행 |
| scale-B/299 | LP17/commit16 LP02.actual-file-outside-catalog | PASS | 원출력 5118행 |
| scale-B/300 | LP17/commit16 LP02.commit | PASS | 원출력 5186행 |
| scale-B/301 | LP17/snapshot16 LP02.snapshot-exact-count | PASS | 원출력 5207행 |
| scale-B/302 | LP17/snapshot16 snapshot.canonical-all | PASS | 원출력 5262행 |
| scale-B/303 | LP17/snapshot16 LP02.explicit-checkpoint | PASS | 원출력 5290행 |
| scale-B/304 | LP17/snapshot16 LP02.reservation-bound-mutation-count | PASS | 원출력 5296행 |
| scale-B/305 | LP17/commit17 LP02.reserve | PASS | 원출력 5305행 |
| scale-B/306 | LP17/commit17 LP02.actual-file-outside-catalog | PASS | 원출력 5306행 |
| scale-B/307 | LP17/commit17 LP02.commit | PASS | 원출력 5374행 |
| scale-B/308 | LP17/commit18 LP02.reserve | PASS | 원출력 5389행 |
| scale-B/309 | LP17/commit18 LP02.actual-file-outside-catalog | PASS | 원출력 5390행 |
| scale-B/310 | LP17/commit18 LP02.commit | PASS | 원출력 5458행 |
| scale-B/311 | LP17/commit19 LP02.reserve | PASS | 원출력 5473행 |
| scale-B/312 | LP17/commit19 LP02.actual-file-outside-catalog | PASS | 원출력 5474행 |
| scale-B/313 | LP17/commit19 LP02.commit | PASS | 원출력 5542행 |
| scale-B/314 | LP17/commit20 LP02.reserve | PASS | 원출력 5557행 |
| scale-B/315 | LP17/commit20 LP02.actual-file-outside-catalog | PASS | 원출력 5558행 |
| scale-B/316 | LP17/commit20 LP02.commit | PASS | 원출력 5626행 |
| scale-B/317 | LP17/commit21 LP02.reserve | PASS | 원출력 5641행 |
| scale-B/318 | LP17/commit21 LP02.actual-file-outside-catalog | PASS | 원출력 5642행 |
| scale-B/319 | LP17/commit21 LP02.commit | PASS | 원출력 5710행 |
| scale-B/320 | LP17/commit22 LP02.reserve | PASS | 원출력 5725행 |
| scale-B/321 | LP17/commit22 LP02.actual-file-outside-catalog | PASS | 원출력 5726행 |
| scale-B/322 | LP17/commit22 LP02.commit | PASS | 원출력 5794행 |
| scale-B/323 | LP17/commit23 LP02.reserve | PASS | 원출력 5809행 |
| scale-B/324 | LP17/commit23 LP02.actual-file-outside-catalog | PASS | 원출력 5810행 |
| scale-B/325 | LP17/commit23 LP02.commit | PASS | 원출력 5878행 |
| scale-B/326 | LP17/commit24 LP02.reserve | PASS | 원출력 5893행 |
| scale-B/327 | LP17/commit24 LP02.actual-file-outside-catalog | PASS | 원출력 5894행 |
| scale-B/328 | LP17/commit24 LP02.commit | PASS | 원출력 5962행 |
| scale-B/329 | LP17/commit25 LP02.reserve | PASS | 원출력 5977행 |
| scale-B/330 | LP17/commit25 LP02.actual-file-outside-catalog | PASS | 원출력 5978행 |
| scale-B/331 | LP17/commit25 LP02.commit | PASS | 원출력 6046행 |
| scale-B/332 | LP17/commit26 LP02.reserve | PASS | 원출력 6061행 |
| scale-B/333 | LP17/commit26 LP02.actual-file-outside-catalog | PASS | 원출력 6062행 |
| scale-B/334 | LP17/commit26 LP02.commit | PASS | 원출력 6130행 |
| scale-B/335 | LP17/commit27 LP02.reserve | PASS | 원출력 6145행 |
| scale-B/336 | LP17/commit27 LP02.actual-file-outside-catalog | PASS | 원출력 6146행 |
| scale-B/337 | LP17/commit27 LP02.commit | PASS | 원출력 6214행 |
| scale-B/338 | LP17/commit28 LP02.reserve | PASS | 원출력 6229행 |
| scale-B/339 | LP17/commit28 LP02.actual-file-outside-catalog | PASS | 원출력 6230행 |
| scale-B/340 | LP17/commit28 LP02.commit | PASS | 원출력 6298행 |
| scale-B/341 | LP17/commit29 LP02.reserve | PASS | 원출력 6313행 |
| scale-B/342 | LP17/commit29 LP02.actual-file-outside-catalog | PASS | 원출력 6314행 |
| scale-B/343 | LP17/commit29 LP02.commit | PASS | 원출력 6382행 |
| scale-B/344 | LP17/commit30 LP02.reserve | PASS | 원출력 6397행 |
| scale-B/345 | LP17/commit30 LP02.actual-file-outside-catalog | PASS | 원출력 6398행 |
| scale-B/346 | LP17/commit30 LP02.commit | PASS | 원출력 6466행 |
| scale-B/347 | LP17/commit31 LP02.reserve | PASS | 원출력 6481행 |
| scale-B/348 | LP17/commit31 LP02.actual-file-outside-catalog | PASS | 원출력 6482행 |
| scale-B/349 | LP17/commit31 LP02.commit | PASS | 원출력 6550행 |
| scale-B/350 | LP17/commit32 LP02.reserve | PASS | 원출력 6565행 |
| scale-B/351 | LP17/commit32 LP02.actual-file-outside-catalog | PASS | 원출력 6566행 |
| scale-B/352 | LP17/commit32 LP02.commit | PASS | 원출력 6634행 |
| scale-B/353 | LP17/snapshot32 LP02.snapshot-exact-count | PASS | 원출력 6655행 |
| scale-B/354 | LP17/snapshot32 snapshot.canonical-all | PASS | 원출력 6758행 |
| scale-B/355 | LP17/snapshot32 LP02.explicit-checkpoint | PASS | 원출력 6786행 |
| scale-B/356 | LP17/snapshot32 LP02.reservation-bound-mutation-count | PASS | 원출력 6792행 |
| scale-B/357 | LP17/delete delete.original-canonical | PASS | 원출력 6801행 |
| scale-B/358 | LP17/delete delete.pending | PASS | 원출력 6818행 |
| scale-B/359 | LP17/delete delete.unlink | PASS | 원출력 6819행 |
| scale-B/360 | LP17/delete delete.tombstone | PASS | 원출력 6835행 |
| scale-B/361 | LP17/delete delete.checkpoint | PASS | 원출력 6859행 |
| scale-B/362 | LP17/delete delete.binding-preserved | PASS | 원출력 6860행 |
| scale-B/363 | LP17/delete deleted.public-hidden | PASS | 원출력 6861행 |
| reopen-B-sqlite/364 | LP17/reopen/sqlite LP02.journal-reopen | PASS | 원출력 6964행 |
| reopen-B-sqlite/365 | LP17/reopen/sqlite LP02.catalog-reopen | PASS | 원출력 6988행 |
| reopen-B-sqlite/366 | LP17/reopen/sqlite/0 LP02.exact-source | PASS | 원출력 6997행 |
| reopen-B-sqlite/367 | LP17/reopen/sqlite/0 deleted.public-hidden | PASS | 원출력 6998행 |
| reopen-B-sqlite/368 | LP17/reopen/sqlite/0 reopen.deleted-state | PASS | 원출력 7000행 |
| reopen-B-sqlite/369 | LP17/reopen/sqlite/1 LP02.exact-source | PASS | 원출력 7004행 |
| reopen-B-sqlite/370 | LP17/reopen/sqlite/1 reopen.remaining-media | PASS | 원출력 7006행 |
| reopen-B-sqlite/371 | LP17/reopen/sqlite/2 LP02.exact-source | PASS | 원출력 7010행 |
| reopen-B-sqlite/372 | LP17/reopen/sqlite/2 reopen.remaining-media | PASS | 원출력 7012행 |
| reopen-B-sqlite/373 | LP17/reopen/sqlite/3 LP02.exact-source | PASS | 원출력 7016행 |
| reopen-B-sqlite/374 | LP17/reopen/sqlite/3 reopen.remaining-media | PASS | 원출력 7018행 |
| reopen-B-sqlite/375 | LP17/reopen/sqlite/4 LP02.exact-source | PASS | 원출력 7022행 |
| reopen-B-sqlite/376 | LP17/reopen/sqlite/4 reopen.remaining-media | PASS | 원출력 7024행 |
| reopen-B-sqlite/377 | LP17/reopen/sqlite/5 LP02.exact-source | PASS | 원출력 7028행 |
| reopen-B-sqlite/378 | LP17/reopen/sqlite/5 reopen.remaining-media | PASS | 원출력 7030행 |
| reopen-B-sqlite/379 | LP17/reopen/sqlite/6 LP02.exact-source | PASS | 원출력 7034행 |
| reopen-B-sqlite/380 | LP17/reopen/sqlite/6 reopen.remaining-media | PASS | 원출력 7036행 |
| reopen-B-sqlite/381 | LP17/reopen/sqlite/7 LP02.exact-source | PASS | 원출력 7040행 |
| reopen-B-sqlite/382 | LP17/reopen/sqlite/7 reopen.remaining-media | PASS | 원출력 7042행 |
| reopen-B-sqlite/383 | LP17/reopen/sqlite/8 LP02.exact-source | PASS | 원출력 7046행 |
| reopen-B-sqlite/384 | LP17/reopen/sqlite/8 reopen.remaining-media | PASS | 원출력 7048행 |
| reopen-B-sqlite/385 | LP17/reopen/sqlite/9 LP02.exact-source | PASS | 원출력 7052행 |
| reopen-B-sqlite/386 | LP17/reopen/sqlite/9 reopen.remaining-media | PASS | 원출력 7054행 |
| reopen-B-sqlite/387 | LP17/reopen/sqlite/10 LP02.exact-source | PASS | 원출력 7058행 |
| reopen-B-sqlite/388 | LP17/reopen/sqlite/10 reopen.remaining-media | PASS | 원출력 7060행 |
| reopen-B-sqlite/389 | LP17/reopen/sqlite/11 LP02.exact-source | PASS | 원출력 7064행 |
| reopen-B-sqlite/390 | LP17/reopen/sqlite/11 reopen.remaining-media | PASS | 원출력 7066행 |
| reopen-B-sqlite/391 | LP17/reopen/sqlite/12 LP02.exact-source | PASS | 원출력 7070행 |
| reopen-B-sqlite/392 | LP17/reopen/sqlite/12 reopen.remaining-media | PASS | 원출력 7072행 |
| reopen-B-sqlite/393 | LP17/reopen/sqlite/13 LP02.exact-source | PASS | 원출력 7076행 |
| reopen-B-sqlite/394 | LP17/reopen/sqlite/13 reopen.remaining-media | PASS | 원출력 7078행 |
| reopen-B-sqlite/395 | LP17/reopen/sqlite/14 LP02.exact-source | PASS | 원출력 7082행 |
| reopen-B-sqlite/396 | LP17/reopen/sqlite/14 reopen.remaining-media | PASS | 원출력 7084행 |
| reopen-B-sqlite/397 | LP17/reopen/sqlite/15 LP02.exact-source | PASS | 원출력 7088행 |
| reopen-B-sqlite/398 | LP17/reopen/sqlite/15 reopen.remaining-media | PASS | 원출력 7090행 |
| reopen-B-sqlite/399 | LP17/reopen/sqlite/16 LP02.exact-source | PASS | 원출력 7094행 |
| reopen-B-sqlite/400 | LP17/reopen/sqlite/16 reopen.remaining-media | PASS | 원출력 7096행 |
| reopen-B-sqlite/401 | LP17/reopen/sqlite/17 LP02.exact-source | PASS | 원출력 7100행 |
| reopen-B-sqlite/402 | LP17/reopen/sqlite/17 reopen.remaining-media | PASS | 원출력 7102행 |
| reopen-B-sqlite/403 | LP17/reopen/sqlite/18 LP02.exact-source | PASS | 원출력 7106행 |
| reopen-B-sqlite/404 | LP17/reopen/sqlite/18 reopen.remaining-media | PASS | 원출력 7108행 |
| reopen-B-sqlite/405 | LP17/reopen/sqlite/19 LP02.exact-source | PASS | 원출력 7112행 |
| reopen-B-sqlite/406 | LP17/reopen/sqlite/19 reopen.remaining-media | PASS | 원출력 7114행 |
| reopen-B-sqlite/407 | LP17/reopen/sqlite/20 LP02.exact-source | PASS | 원출력 7118행 |
| reopen-B-sqlite/408 | LP17/reopen/sqlite/20 reopen.remaining-media | PASS | 원출력 7120행 |
| reopen-B-sqlite/409 | LP17/reopen/sqlite/21 LP02.exact-source | PASS | 원출력 7124행 |
| reopen-B-sqlite/410 | LP17/reopen/sqlite/21 reopen.remaining-media | PASS | 원출력 7126행 |
| reopen-B-sqlite/411 | LP17/reopen/sqlite/22 LP02.exact-source | PASS | 원출력 7130행 |
| reopen-B-sqlite/412 | LP17/reopen/sqlite/22 reopen.remaining-media | PASS | 원출력 7132행 |
| reopen-B-sqlite/413 | LP17/reopen/sqlite/23 LP02.exact-source | PASS | 원출력 7136행 |
| reopen-B-sqlite/414 | LP17/reopen/sqlite/23 reopen.remaining-media | PASS | 원출력 7138행 |
| reopen-B-sqlite/415 | LP17/reopen/sqlite/24 LP02.exact-source | PASS | 원출력 7142행 |
| reopen-B-sqlite/416 | LP17/reopen/sqlite/24 reopen.remaining-media | PASS | 원출력 7144행 |
| reopen-B-sqlite/417 | LP17/reopen/sqlite/25 LP02.exact-source | PASS | 원출력 7148행 |
| reopen-B-sqlite/418 | LP17/reopen/sqlite/25 reopen.remaining-media | PASS | 원출력 7150행 |
| reopen-B-sqlite/419 | LP17/reopen/sqlite/26 LP02.exact-source | PASS | 원출력 7154행 |
| reopen-B-sqlite/420 | LP17/reopen/sqlite/26 reopen.remaining-media | PASS | 원출력 7156행 |
| reopen-B-sqlite/421 | LP17/reopen/sqlite/27 LP02.exact-source | PASS | 원출력 7160행 |
| reopen-B-sqlite/422 | LP17/reopen/sqlite/27 reopen.remaining-media | PASS | 원출력 7162행 |
| reopen-B-sqlite/423 | LP17/reopen/sqlite/28 LP02.exact-source | PASS | 원출력 7166행 |
| reopen-B-sqlite/424 | LP17/reopen/sqlite/28 reopen.remaining-media | PASS | 원출력 7168행 |
| reopen-B-sqlite/425 | LP17/reopen/sqlite/29 LP02.exact-source | PASS | 원출력 7172행 |
| reopen-B-sqlite/426 | LP17/reopen/sqlite/29 reopen.remaining-media | PASS | 원출력 7174행 |
| reopen-B-sqlite/427 | LP17/reopen/sqlite/30 LP02.exact-source | PASS | 원출력 7178행 |
| reopen-B-sqlite/428 | LP17/reopen/sqlite/30 reopen.remaining-media | PASS | 원출력 7180행 |
| reopen-B-sqlite/429 | LP17/reopen/sqlite/31 LP02.exact-source | PASS | 원출력 7184행 |
| reopen-B-sqlite/430 | LP17/reopen/sqlite/31 reopen.remaining-media | PASS | 원출력 7186행 |
| reopen-B-jsonl/431 | LP17/reopen/jsonl LP02.journal-reopen | PASS | 원출력 7287행 |
| reopen-B-jsonl/432 | LP17/reopen/jsonl LP02.catalog-reopen | PASS | 원출력 7303행 |
| reopen-B-jsonl/433 | LP17/reopen/jsonl/0 LP02.exact-source | PASS | 원출력 7312행 |
| reopen-B-jsonl/434 | LP17/reopen/jsonl/0 deleted.public-hidden | PASS | 원출력 7313행 |
| reopen-B-jsonl/435 | LP17/reopen/jsonl/0 reopen.deleted-state | PASS | 원출력 7315행 |
| reopen-B-jsonl/436 | LP17/reopen/jsonl/1 LP02.exact-source | PASS | 원출력 7319행 |
| reopen-B-jsonl/437 | LP17/reopen/jsonl/1 reopen.remaining-media | PASS | 원출력 7321행 |
| reopen-B-jsonl/438 | LP17/reopen/jsonl/2 LP02.exact-source | PASS | 원출력 7325행 |
| reopen-B-jsonl/439 | LP17/reopen/jsonl/2 reopen.remaining-media | PASS | 원출력 7327행 |
| reopen-B-jsonl/440 | LP17/reopen/jsonl/3 LP02.exact-source | PASS | 원출력 7331행 |
| reopen-B-jsonl/441 | LP17/reopen/jsonl/3 reopen.remaining-media | PASS | 원출력 7333행 |
| reopen-B-jsonl/442 | LP17/reopen/jsonl/4 LP02.exact-source | PASS | 원출력 7337행 |
| reopen-B-jsonl/443 | LP17/reopen/jsonl/4 reopen.remaining-media | PASS | 원출력 7339행 |
| reopen-B-jsonl/444 | LP17/reopen/jsonl/5 LP02.exact-source | PASS | 원출력 7343행 |
| reopen-B-jsonl/445 | LP17/reopen/jsonl/5 reopen.remaining-media | PASS | 원출력 7345행 |
| reopen-B-jsonl/446 | LP17/reopen/jsonl/6 LP02.exact-source | PASS | 원출력 7349행 |
| reopen-B-jsonl/447 | LP17/reopen/jsonl/6 reopen.remaining-media | PASS | 원출력 7351행 |
| reopen-B-jsonl/448 | LP17/reopen/jsonl/7 LP02.exact-source | PASS | 원출력 7355행 |
| reopen-B-jsonl/449 | LP17/reopen/jsonl/7 reopen.remaining-media | PASS | 원출력 7357행 |
| reopen-B-jsonl/450 | LP17/reopen/jsonl/8 LP02.exact-source | PASS | 원출력 7361행 |
| reopen-B-jsonl/451 | LP17/reopen/jsonl/8 reopen.remaining-media | PASS | 원출력 7363행 |
| reopen-B-jsonl/452 | LP17/reopen/jsonl/9 LP02.exact-source | PASS | 원출력 7367행 |
| reopen-B-jsonl/453 | LP17/reopen/jsonl/9 reopen.remaining-media | PASS | 원출력 7369행 |
| reopen-B-jsonl/454 | LP17/reopen/jsonl/10 LP02.exact-source | PASS | 원출력 7373행 |
| reopen-B-jsonl/455 | LP17/reopen/jsonl/10 reopen.remaining-media | PASS | 원출력 7375행 |
| reopen-B-jsonl/456 | LP17/reopen/jsonl/11 LP02.exact-source | PASS | 원출력 7379행 |
| reopen-B-jsonl/457 | LP17/reopen/jsonl/11 reopen.remaining-media | PASS | 원출력 7381행 |
| reopen-B-jsonl/458 | LP17/reopen/jsonl/12 LP02.exact-source | PASS | 원출력 7385행 |
| reopen-B-jsonl/459 | LP17/reopen/jsonl/12 reopen.remaining-media | PASS | 원출력 7387행 |
| reopen-B-jsonl/460 | LP17/reopen/jsonl/13 LP02.exact-source | PASS | 원출력 7391행 |
| reopen-B-jsonl/461 | LP17/reopen/jsonl/13 reopen.remaining-media | PASS | 원출력 7393행 |
| reopen-B-jsonl/462 | LP17/reopen/jsonl/14 LP02.exact-source | PASS | 원출력 7397행 |
| reopen-B-jsonl/463 | LP17/reopen/jsonl/14 reopen.remaining-media | PASS | 원출력 7399행 |
| reopen-B-jsonl/464 | LP17/reopen/jsonl/15 LP02.exact-source | PASS | 원출력 7403행 |
| reopen-B-jsonl/465 | LP17/reopen/jsonl/15 reopen.remaining-media | PASS | 원출력 7405행 |
| reopen-B-jsonl/466 | LP17/reopen/jsonl/16 LP02.exact-source | PASS | 원출력 7409행 |
| reopen-B-jsonl/467 | LP17/reopen/jsonl/16 reopen.remaining-media | PASS | 원출력 7411행 |
| reopen-B-jsonl/468 | LP17/reopen/jsonl/17 LP02.exact-source | PASS | 원출력 7415행 |
| reopen-B-jsonl/469 | LP17/reopen/jsonl/17 reopen.remaining-media | PASS | 원출력 7417행 |
| reopen-B-jsonl/470 | LP17/reopen/jsonl/18 LP02.exact-source | PASS | 원출력 7421행 |
| reopen-B-jsonl/471 | LP17/reopen/jsonl/18 reopen.remaining-media | PASS | 원출력 7423행 |
| reopen-B-jsonl/472 | LP17/reopen/jsonl/19 LP02.exact-source | PASS | 원출력 7427행 |
| reopen-B-jsonl/473 | LP17/reopen/jsonl/19 reopen.remaining-media | PASS | 원출력 7429행 |
| reopen-B-jsonl/474 | LP17/reopen/jsonl/20 LP02.exact-source | PASS | 원출력 7433행 |
| reopen-B-jsonl/475 | LP17/reopen/jsonl/20 reopen.remaining-media | PASS | 원출력 7435행 |
| reopen-B-jsonl/476 | LP17/reopen/jsonl/21 LP02.exact-source | PASS | 원출력 7439행 |
| reopen-B-jsonl/477 | LP17/reopen/jsonl/21 reopen.remaining-media | PASS | 원출력 7441행 |
| reopen-B-jsonl/478 | LP17/reopen/jsonl/22 LP02.exact-source | PASS | 원출력 7445행 |
| reopen-B-jsonl/479 | LP17/reopen/jsonl/22 reopen.remaining-media | PASS | 원출력 7447행 |
| reopen-B-jsonl/480 | LP17/reopen/jsonl/23 LP02.exact-source | PASS | 원출력 7451행 |
| reopen-B-jsonl/481 | LP17/reopen/jsonl/23 reopen.remaining-media | PASS | 원출력 7453행 |
| reopen-B-jsonl/482 | LP17/reopen/jsonl/24 LP02.exact-source | PASS | 원출력 7457행 |
| reopen-B-jsonl/483 | LP17/reopen/jsonl/24 reopen.remaining-media | PASS | 원출력 7459행 |
| reopen-B-jsonl/484 | LP17/reopen/jsonl/25 LP02.exact-source | PASS | 원출력 7463행 |
| reopen-B-jsonl/485 | LP17/reopen/jsonl/25 reopen.remaining-media | PASS | 원출력 7465행 |
| reopen-B-jsonl/486 | LP17/reopen/jsonl/26 LP02.exact-source | PASS | 원출력 7469행 |
| reopen-B-jsonl/487 | LP17/reopen/jsonl/26 reopen.remaining-media | PASS | 원출력 7471행 |
| reopen-B-jsonl/488 | LP17/reopen/jsonl/27 LP02.exact-source | PASS | 원출력 7475행 |
| reopen-B-jsonl/489 | LP17/reopen/jsonl/27 reopen.remaining-media | PASS | 원출력 7477행 |
| reopen-B-jsonl/490 | LP17/reopen/jsonl/28 LP02.exact-source | PASS | 원출력 7481행 |
| reopen-B-jsonl/491 | LP17/reopen/jsonl/28 reopen.remaining-media | PASS | 원출력 7483행 |
| reopen-B-jsonl/492 | LP17/reopen/jsonl/29 LP02.exact-source | PASS | 원출력 7487행 |
| reopen-B-jsonl/493 | LP17/reopen/jsonl/29 reopen.remaining-media | PASS | 원출력 7489행 |
| reopen-B-jsonl/494 | LP17/reopen/jsonl/30 LP02.exact-source | PASS | 원출력 7493행 |
| reopen-B-jsonl/495 | LP17/reopen/jsonl/30 reopen.remaining-media | PASS | 원출력 7495행 |
| reopen-B-jsonl/496 | LP17/reopen/jsonl/31 LP02.exact-source | PASS | 원출력 7499행 |
| reopen-B-jsonl/497 | LP17/reopen/jsonl/31 reopen.remaining-media | PASS | 원출력 7501행 |
| scale-C/498 | LP17/commit1 LP02.reserve | PASS | 원출력 7612행 |
| scale-C/499 | LP17/commit1 LP02.actual-file-outside-catalog | PASS | 원출력 7613행 |
| scale-C/500 | LP17/commit1 LP02.commit | PASS | 원출력 7683행 |
| scale-C/501 | LP17/commit2 LP02.reserve | PASS | 원출력 7698행 |
| scale-C/502 | LP17/commit2 LP02.actual-file-outside-catalog | PASS | 원출력 7699행 |
| scale-C/503 | LP17/commit2 LP02.commit | PASS | 원출력 7769행 |
| scale-C/504 | LP17/commit3 LP02.reserve | PASS | 원출력 7784행 |
| scale-C/505 | LP17/commit3 LP02.actual-file-outside-catalog | PASS | 원출력 7785행 |
| scale-C/506 | LP17/commit3 LP02.commit | PASS | 원출력 7855행 |
| scale-C/507 | LP17/commit4 LP02.reserve | PASS | 원출력 7870행 |
| scale-C/508 | LP17/commit4 LP02.actual-file-outside-catalog | PASS | 원출력 7871행 |
| scale-C/509 | LP17/commit4 LP02.commit | PASS | 원출력 7941행 |
| scale-C/510 | LP17/commit5 LP02.reserve | PASS | 원출력 7956행 |
| scale-C/511 | LP17/commit5 LP02.actual-file-outside-catalog | PASS | 원출력 7957행 |
| scale-C/512 | LP17/commit5 LP02.commit | PASS | 원출력 8027행 |
| scale-C/513 | LP17/commit6 LP02.reserve | PASS | 원출력 8042행 |
| scale-C/514 | LP17/commit6 LP02.actual-file-outside-catalog | PASS | 원출력 8043행 |
| scale-C/515 | LP17/commit6 LP02.commit | PASS | 원출력 8113행 |
| scale-C/516 | LP17/commit7 LP02.reserve | PASS | 원출력 8128행 |
| scale-C/517 | LP17/commit7 LP02.actual-file-outside-catalog | PASS | 원출력 8129행 |
| scale-C/518 | LP17/commit7 LP02.commit | PASS | 원출력 8199행 |
| scale-C/519 | LP17/commit8 LP02.reserve | PASS | 원출력 8214행 |
| scale-C/520 | LP17/commit8 LP02.actual-file-outside-catalog | PASS | 원출력 8215행 |
| scale-C/521 | LP17/commit8 LP02.commit | PASS | 원출력 8285행 |
| scale-C/522 | LP17/commit9 LP02.reserve | PASS | 원출력 8300행 |
| scale-C/523 | LP17/commit9 LP02.actual-file-outside-catalog | PASS | 원출력 8301행 |
| scale-C/524 | LP17/commit9 LP02.commit | PASS | 원출력 8371행 |
| scale-C/525 | LP17/commit10 LP02.reserve | PASS | 원출력 8386행 |
| scale-C/526 | LP17/commit10 LP02.actual-file-outside-catalog | PASS | 원출력 8387행 |
| scale-C/527 | LP17/commit10 LP02.commit | PASS | 원출력 8457행 |
| scale-C/528 | LP17/commit11 LP02.reserve | PASS | 원출력 8472행 |
| scale-C/529 | LP17/commit11 LP02.actual-file-outside-catalog | PASS | 원출력 8473행 |
| scale-C/530 | LP17/commit11 LP02.commit | PASS | 원출력 8543행 |
| scale-C/531 | LP17/commit12 LP02.reserve | PASS | 원출력 8558행 |
| scale-C/532 | LP17/commit12 LP02.actual-file-outside-catalog | PASS | 원출력 8559행 |
| scale-C/533 | LP17/commit12 LP02.commit | PASS | 원출력 8629행 |
| scale-C/534 | LP17/commit13 LP02.reserve | PASS | 원출력 8644행 |
| scale-C/535 | LP17/commit13 LP02.actual-file-outside-catalog | PASS | 원출력 8645행 |
| scale-C/536 | LP17/commit13 LP02.commit | PASS | 원출력 8715행 |
| scale-C/537 | LP17/commit14 LP02.reserve | PASS | 원출력 8730행 |
| scale-C/538 | LP17/commit14 LP02.actual-file-outside-catalog | PASS | 원출력 8731행 |
| scale-C/539 | LP17/commit14 LP02.commit | PASS | 원출력 8801행 |
| scale-C/540 | LP17/commit15 LP02.reserve | PASS | 원출력 8816행 |
| scale-C/541 | LP17/commit15 LP02.actual-file-outside-catalog | PASS | 원출력 8817행 |
| scale-C/542 | LP17/commit15 LP02.commit | PASS | 원출력 8887행 |
| scale-C/543 | LP17/commit16 LP02.reserve | PASS | 원출력 8902행 |
| scale-C/544 | LP17/commit16 LP02.actual-file-outside-catalog | PASS | 원출력 8903행 |
| scale-C/545 | LP17/commit16 LP02.commit | PASS | 원출력 8973행 |
| scale-C/546 | LP17/snapshot16 LP02.snapshot-exact-count | PASS | 원출력 8994행 |
| scale-C/547 | LP17/snapshot16 snapshot.canonical-all | PASS | 원출력 9049행 |
| scale-C/548 | LP17/snapshot16 LP02.explicit-checkpoint | PASS | 원출력 9087행 |
| scale-C/549 | LP17/snapshot16 LP02.reservation-bound-mutation-count | PASS | 원출력 9093행 |
| scale-C/550 | LP17/commit17 LP02.reserve | PASS | 원출력 9102행 |
| scale-C/551 | LP17/commit17 LP02.actual-file-outside-catalog | PASS | 원출력 9103행 |
| scale-C/552 | LP17/commit17 LP02.commit | PASS | 원출력 9173행 |
| scale-C/553 | LP17/commit18 LP02.reserve | PASS | 원출력 9188행 |
| scale-C/554 | LP17/commit18 LP02.actual-file-outside-catalog | PASS | 원출력 9189행 |
| scale-C/555 | LP17/commit18 LP02.commit | PASS | 원출력 9259행 |
| scale-C/556 | LP17/commit19 LP02.reserve | PASS | 원출력 9274행 |
| scale-C/557 | LP17/commit19 LP02.actual-file-outside-catalog | PASS | 원출력 9275행 |
| scale-C/558 | LP17/commit19 LP02.commit | PASS | 원출력 9345행 |
| scale-C/559 | LP17/commit20 LP02.reserve | PASS | 원출력 9360행 |
| scale-C/560 | LP17/commit20 LP02.actual-file-outside-catalog | PASS | 원출력 9361행 |
| scale-C/561 | LP17/commit20 LP02.commit | PASS | 원출력 9431행 |
| scale-C/562 | LP17/commit21 LP02.reserve | PASS | 원출력 9446행 |
| scale-C/563 | LP17/commit21 LP02.actual-file-outside-catalog | PASS | 원출력 9447행 |
| scale-C/564 | LP17/commit21 LP02.commit | PASS | 원출력 9517행 |
| scale-C/565 | LP17/commit22 LP02.reserve | PASS | 원출력 9532행 |
| scale-C/566 | LP17/commit22 LP02.actual-file-outside-catalog | PASS | 원출력 9533행 |
| scale-C/567 | LP17/commit22 LP02.commit | PASS | 원출력 9603행 |
| scale-C/568 | LP17/commit23 LP02.reserve | PASS | 원출력 9618행 |
| scale-C/569 | LP17/commit23 LP02.actual-file-outside-catalog | PASS | 원출력 9619행 |
| scale-C/570 | LP17/commit23 LP02.commit | PASS | 원출력 9689행 |
| scale-C/571 | LP17/commit24 LP02.reserve | PASS | 원출력 9704행 |
| scale-C/572 | LP17/commit24 LP02.actual-file-outside-catalog | PASS | 원출력 9705행 |
| scale-C/573 | LP17/commit24 LP02.commit | PASS | 원출력 9775행 |
| scale-C/574 | LP17/commit25 LP02.reserve | PASS | 원출력 9790행 |
| scale-C/575 | LP17/commit25 LP02.actual-file-outside-catalog | PASS | 원출력 9791행 |
| scale-C/576 | LP17/commit25 LP02.commit | PASS | 원출력 9861행 |
| scale-C/577 | LP17/commit26 LP02.reserve | PASS | 원출력 9876행 |
| scale-C/578 | LP17/commit26 LP02.actual-file-outside-catalog | PASS | 원출력 9877행 |
| scale-C/579 | LP17/commit26 LP02.commit | PASS | 원출력 9947행 |
| scale-C/580 | LP17/commit27 LP02.reserve | PASS | 원출력 9962행 |
| scale-C/581 | LP17/commit27 LP02.actual-file-outside-catalog | PASS | 원출력 9963행 |
| scale-C/582 | LP17/commit27 LP02.commit | PASS | 원출력 10033행 |
| scale-C/583 | LP17/commit28 LP02.reserve | PASS | 원출력 10048행 |
| scale-C/584 | LP17/commit28 LP02.actual-file-outside-catalog | PASS | 원출력 10049행 |
| scale-C/585 | LP17/commit28 LP02.commit | PASS | 원출력 10119행 |
| scale-C/586 | LP17/commit29 LP02.reserve | PASS | 원출력 10134행 |
| scale-C/587 | LP17/commit29 LP02.actual-file-outside-catalog | PASS | 원출력 10135행 |
| scale-C/588 | LP17/commit29 LP02.commit | PASS | 원출력 10205행 |
| scale-C/589 | LP17/commit30 LP02.reserve | PASS | 원출력 10220행 |
| scale-C/590 | LP17/commit30 LP02.actual-file-outside-catalog | PASS | 원출력 10221행 |
| scale-C/591 | LP17/commit30 LP02.commit | PASS | 원출력 10291행 |
| scale-C/592 | LP17/commit31 LP02.reserve | PASS | 원출력 10306행 |
| scale-C/593 | LP17/commit31 LP02.actual-file-outside-catalog | PASS | 원출력 10307행 |
| scale-C/594 | LP17/commit31 LP02.commit | PASS | 원출력 10377행 |
| scale-C/595 | LP17/commit32 LP02.reserve | PASS | 원출력 10392행 |
| scale-C/596 | LP17/commit32 LP02.actual-file-outside-catalog | PASS | 원출력 10393행 |
| scale-C/597 | LP17/commit32 LP02.commit | PASS | 원출력 10463행 |
| scale-C/598 | LP17/snapshot32 LP02.snapshot-exact-count | PASS | 원출력 10484행 |
| scale-C/599 | LP17/snapshot32 snapshot.canonical-all | PASS | 원출력 10587행 |
| scale-C/600 | LP17/snapshot32 LP02.explicit-checkpoint | PASS | 원출력 10625행 |
| scale-C/601 | LP17/snapshot32 LP02.reservation-bound-mutation-count | PASS | 원출력 10631행 |
| scale-C/602 | LP17/delete delete.original-canonical | PASS | 원출력 10640행 |
| scale-C/603 | LP17/delete delete.pending | PASS | 원출력 10657행 |
| scale-C/604 | LP17/delete delete.unlink | PASS | 원출력 10658행 |
| scale-C/605 | LP17/delete delete.tombstone | PASS | 원출력 10674행 |
| scale-C/606 | LP17/delete delete.checkpoint | PASS | 원출력 10706행 |
| scale-C/607 | LP17/delete delete.binding-preserved | PASS | 원출력 10707행 |
| scale-C/608 | LP17/delete deleted.public-hidden | PASS | 원출력 10708행 |
| reopen-C-sqlite/609 | LP17/reopen/sqlite LP02.journal-reopen | PASS | 원출력 10811행 |
| reopen-C-sqlite/610 | LP17/reopen/sqlite LP02.catalog-reopen | PASS | 원출력 10835행 |
| reopen-C-sqlite/611 | LP17/reopen/sqlite/0 LP02.exact-source | PASS | 원출력 10844행 |
| reopen-C-sqlite/612 | LP17/reopen/sqlite/0 deleted.public-hidden | PASS | 원출력 10845행 |
| reopen-C-sqlite/613 | LP17/reopen/sqlite/0 reopen.deleted-state | PASS | 원출력 10847행 |
| reopen-C-sqlite/614 | LP17/reopen/sqlite/1 LP02.exact-source | PASS | 원출력 10851행 |
| reopen-C-sqlite/615 | LP17/reopen/sqlite/1 reopen.remaining-media | PASS | 원출력 10853행 |
| reopen-C-sqlite/616 | LP17/reopen/sqlite/2 LP02.exact-source | PASS | 원출력 10857행 |
| reopen-C-sqlite/617 | LP17/reopen/sqlite/2 reopen.remaining-media | PASS | 원출력 10859행 |
| reopen-C-sqlite/618 | LP17/reopen/sqlite/3 LP02.exact-source | PASS | 원출력 10863행 |
| reopen-C-sqlite/619 | LP17/reopen/sqlite/3 reopen.remaining-media | PASS | 원출력 10865행 |
| reopen-C-sqlite/620 | LP17/reopen/sqlite/4 LP02.exact-source | PASS | 원출력 10869행 |
| reopen-C-sqlite/621 | LP17/reopen/sqlite/4 reopen.remaining-media | PASS | 원출력 10871행 |
| reopen-C-sqlite/622 | LP17/reopen/sqlite/5 LP02.exact-source | PASS | 원출력 10875행 |
| reopen-C-sqlite/623 | LP17/reopen/sqlite/5 reopen.remaining-media | PASS | 원출력 10877행 |
| reopen-C-sqlite/624 | LP17/reopen/sqlite/6 LP02.exact-source | PASS | 원출력 10881행 |
| reopen-C-sqlite/625 | LP17/reopen/sqlite/6 reopen.remaining-media | PASS | 원출력 10883행 |
| reopen-C-sqlite/626 | LP17/reopen/sqlite/7 LP02.exact-source | PASS | 원출력 10887행 |
| reopen-C-sqlite/627 | LP17/reopen/sqlite/7 reopen.remaining-media | PASS | 원출력 10889행 |
| reopen-C-sqlite/628 | LP17/reopen/sqlite/8 LP02.exact-source | PASS | 원출력 10893행 |
| reopen-C-sqlite/629 | LP17/reopen/sqlite/8 reopen.remaining-media | PASS | 원출력 10895행 |
| reopen-C-sqlite/630 | LP17/reopen/sqlite/9 LP02.exact-source | PASS | 원출력 10899행 |
| reopen-C-sqlite/631 | LP17/reopen/sqlite/9 reopen.remaining-media | PASS | 원출력 10901행 |
| reopen-C-sqlite/632 | LP17/reopen/sqlite/10 LP02.exact-source | PASS | 원출력 10905행 |
| reopen-C-sqlite/633 | LP17/reopen/sqlite/10 reopen.remaining-media | PASS | 원출력 10907행 |
| reopen-C-sqlite/634 | LP17/reopen/sqlite/11 LP02.exact-source | PASS | 원출력 10911행 |
| reopen-C-sqlite/635 | LP17/reopen/sqlite/11 reopen.remaining-media | PASS | 원출력 10913행 |
| reopen-C-sqlite/636 | LP17/reopen/sqlite/12 LP02.exact-source | PASS | 원출력 10917행 |
| reopen-C-sqlite/637 | LP17/reopen/sqlite/12 reopen.remaining-media | PASS | 원출력 10919행 |
| reopen-C-sqlite/638 | LP17/reopen/sqlite/13 LP02.exact-source | PASS | 원출력 10923행 |
| reopen-C-sqlite/639 | LP17/reopen/sqlite/13 reopen.remaining-media | PASS | 원출력 10925행 |
| reopen-C-sqlite/640 | LP17/reopen/sqlite/14 LP02.exact-source | PASS | 원출력 10929행 |
| reopen-C-sqlite/641 | LP17/reopen/sqlite/14 reopen.remaining-media | PASS | 원출력 10931행 |
| reopen-C-sqlite/642 | LP17/reopen/sqlite/15 LP02.exact-source | PASS | 원출력 10935행 |
| reopen-C-sqlite/643 | LP17/reopen/sqlite/15 reopen.remaining-media | PASS | 원출력 10937행 |
| reopen-C-sqlite/644 | LP17/reopen/sqlite/16 LP02.exact-source | PASS | 원출력 10941행 |
| reopen-C-sqlite/645 | LP17/reopen/sqlite/16 reopen.remaining-media | PASS | 원출력 10943행 |
| reopen-C-sqlite/646 | LP17/reopen/sqlite/17 LP02.exact-source | PASS | 원출력 10947행 |
| reopen-C-sqlite/647 | LP17/reopen/sqlite/17 reopen.remaining-media | PASS | 원출력 10949행 |
| reopen-C-sqlite/648 | LP17/reopen/sqlite/18 LP02.exact-source | PASS | 원출력 10953행 |
| reopen-C-sqlite/649 | LP17/reopen/sqlite/18 reopen.remaining-media | PASS | 원출력 10955행 |
| reopen-C-sqlite/650 | LP17/reopen/sqlite/19 LP02.exact-source | PASS | 원출력 10959행 |
| reopen-C-sqlite/651 | LP17/reopen/sqlite/19 reopen.remaining-media | PASS | 원출력 10961행 |
| reopen-C-sqlite/652 | LP17/reopen/sqlite/20 LP02.exact-source | PASS | 원출력 10965행 |
| reopen-C-sqlite/653 | LP17/reopen/sqlite/20 reopen.remaining-media | PASS | 원출력 10967행 |
| reopen-C-sqlite/654 | LP17/reopen/sqlite/21 LP02.exact-source | PASS | 원출력 10971행 |
| reopen-C-sqlite/655 | LP17/reopen/sqlite/21 reopen.remaining-media | PASS | 원출력 10973행 |
| reopen-C-sqlite/656 | LP17/reopen/sqlite/22 LP02.exact-source | PASS | 원출력 10977행 |
| reopen-C-sqlite/657 | LP17/reopen/sqlite/22 reopen.remaining-media | PASS | 원출력 10979행 |
| reopen-C-sqlite/658 | LP17/reopen/sqlite/23 LP02.exact-source | PASS | 원출력 10983행 |
| reopen-C-sqlite/659 | LP17/reopen/sqlite/23 reopen.remaining-media | PASS | 원출력 10985행 |
| reopen-C-sqlite/660 | LP17/reopen/sqlite/24 LP02.exact-source | PASS | 원출력 10989행 |
| reopen-C-sqlite/661 | LP17/reopen/sqlite/24 reopen.remaining-media | PASS | 원출력 10991행 |
| reopen-C-sqlite/662 | LP17/reopen/sqlite/25 LP02.exact-source | PASS | 원출력 10995행 |
| reopen-C-sqlite/663 | LP17/reopen/sqlite/25 reopen.remaining-media | PASS | 원출력 10997행 |
| reopen-C-sqlite/664 | LP17/reopen/sqlite/26 LP02.exact-source | PASS | 원출력 11001행 |
| reopen-C-sqlite/665 | LP17/reopen/sqlite/26 reopen.remaining-media | PASS | 원출력 11003행 |
| reopen-C-sqlite/666 | LP17/reopen/sqlite/27 LP02.exact-source | PASS | 원출력 11007행 |
| reopen-C-sqlite/667 | LP17/reopen/sqlite/27 reopen.remaining-media | PASS | 원출력 11009행 |
| reopen-C-sqlite/668 | LP17/reopen/sqlite/28 LP02.exact-source | PASS | 원출력 11013행 |
| reopen-C-sqlite/669 | LP17/reopen/sqlite/28 reopen.remaining-media | PASS | 원출력 11015행 |
| reopen-C-sqlite/670 | LP17/reopen/sqlite/29 LP02.exact-source | PASS | 원출력 11019행 |
| reopen-C-sqlite/671 | LP17/reopen/sqlite/29 reopen.remaining-media | PASS | 원출력 11021행 |
| reopen-C-sqlite/672 | LP17/reopen/sqlite/30 LP02.exact-source | PASS | 원출력 11025행 |
| reopen-C-sqlite/673 | LP17/reopen/sqlite/30 reopen.remaining-media | PASS | 원출력 11027행 |
| reopen-C-sqlite/674 | LP17/reopen/sqlite/31 LP02.exact-source | PASS | 원출력 11031행 |
| reopen-C-sqlite/675 | LP17/reopen/sqlite/31 reopen.remaining-media | PASS | 원출력 11033행 |
| reopen-C-jsonl/676 | LP17/reopen/jsonl LP02.journal-reopen | PASS | 원출력 11134행 |
| reopen-C-jsonl/677 | LP17/reopen/jsonl LP02.catalog-reopen | PASS | 원출력 11150행 |
| reopen-C-jsonl/678 | LP17/reopen/jsonl/0 LP02.exact-source | PASS | 원출력 11159행 |
| reopen-C-jsonl/679 | LP17/reopen/jsonl/0 deleted.public-hidden | PASS | 원출력 11160행 |
| reopen-C-jsonl/680 | LP17/reopen/jsonl/0 reopen.deleted-state | PASS | 원출력 11162행 |
| reopen-C-jsonl/681 | LP17/reopen/jsonl/1 LP02.exact-source | PASS | 원출력 11166행 |
| reopen-C-jsonl/682 | LP17/reopen/jsonl/1 reopen.remaining-media | PASS | 원출력 11168행 |
| reopen-C-jsonl/683 | LP17/reopen/jsonl/2 LP02.exact-source | PASS | 원출력 11172행 |
| reopen-C-jsonl/684 | LP17/reopen/jsonl/2 reopen.remaining-media | PASS | 원출력 11174행 |
| reopen-C-jsonl/685 | LP17/reopen/jsonl/3 LP02.exact-source | PASS | 원출력 11178행 |
| reopen-C-jsonl/686 | LP17/reopen/jsonl/3 reopen.remaining-media | PASS | 원출력 11180행 |
| reopen-C-jsonl/687 | LP17/reopen/jsonl/4 LP02.exact-source | PASS | 원출력 11184행 |
| reopen-C-jsonl/688 | LP17/reopen/jsonl/4 reopen.remaining-media | PASS | 원출력 11186행 |
| reopen-C-jsonl/689 | LP17/reopen/jsonl/5 LP02.exact-source | PASS | 원출력 11190행 |
| reopen-C-jsonl/690 | LP17/reopen/jsonl/5 reopen.remaining-media | PASS | 원출력 11192행 |
| reopen-C-jsonl/691 | LP17/reopen/jsonl/6 LP02.exact-source | PASS | 원출력 11196행 |
| reopen-C-jsonl/692 | LP17/reopen/jsonl/6 reopen.remaining-media | PASS | 원출력 11198행 |
| reopen-C-jsonl/693 | LP17/reopen/jsonl/7 LP02.exact-source | PASS | 원출력 11202행 |
| reopen-C-jsonl/694 | LP17/reopen/jsonl/7 reopen.remaining-media | PASS | 원출력 11204행 |
| reopen-C-jsonl/695 | LP17/reopen/jsonl/8 LP02.exact-source | PASS | 원출력 11208행 |
| reopen-C-jsonl/696 | LP17/reopen/jsonl/8 reopen.remaining-media | PASS | 원출력 11210행 |
| reopen-C-jsonl/697 | LP17/reopen/jsonl/9 LP02.exact-source | PASS | 원출력 11214행 |
| reopen-C-jsonl/698 | LP17/reopen/jsonl/9 reopen.remaining-media | PASS | 원출력 11216행 |
| reopen-C-jsonl/699 | LP17/reopen/jsonl/10 LP02.exact-source | PASS | 원출력 11220행 |
| reopen-C-jsonl/700 | LP17/reopen/jsonl/10 reopen.remaining-media | PASS | 원출력 11222행 |
| reopen-C-jsonl/701 | LP17/reopen/jsonl/11 LP02.exact-source | PASS | 원출력 11226행 |
| reopen-C-jsonl/702 | LP17/reopen/jsonl/11 reopen.remaining-media | PASS | 원출력 11228행 |
| reopen-C-jsonl/703 | LP17/reopen/jsonl/12 LP02.exact-source | PASS | 원출력 11232행 |
| reopen-C-jsonl/704 | LP17/reopen/jsonl/12 reopen.remaining-media | PASS | 원출력 11234행 |
| reopen-C-jsonl/705 | LP17/reopen/jsonl/13 LP02.exact-source | PASS | 원출력 11238행 |
| reopen-C-jsonl/706 | LP17/reopen/jsonl/13 reopen.remaining-media | PASS | 원출력 11240행 |
| reopen-C-jsonl/707 | LP17/reopen/jsonl/14 LP02.exact-source | PASS | 원출력 11244행 |
| reopen-C-jsonl/708 | LP17/reopen/jsonl/14 reopen.remaining-media | PASS | 원출력 11246행 |
| reopen-C-jsonl/709 | LP17/reopen/jsonl/15 LP02.exact-source | PASS | 원출력 11250행 |
| reopen-C-jsonl/710 | LP17/reopen/jsonl/15 reopen.remaining-media | PASS | 원출력 11252행 |
| reopen-C-jsonl/711 | LP17/reopen/jsonl/16 LP02.exact-source | PASS | 원출력 11256행 |
| reopen-C-jsonl/712 | LP17/reopen/jsonl/16 reopen.remaining-media | PASS | 원출력 11258행 |
| reopen-C-jsonl/713 | LP17/reopen/jsonl/17 LP02.exact-source | PASS | 원출력 11262행 |
| reopen-C-jsonl/714 | LP17/reopen/jsonl/17 reopen.remaining-media | PASS | 원출력 11264행 |
| reopen-C-jsonl/715 | LP17/reopen/jsonl/18 LP02.exact-source | PASS | 원출력 11268행 |
| reopen-C-jsonl/716 | LP17/reopen/jsonl/18 reopen.remaining-media | PASS | 원출력 11270행 |
| reopen-C-jsonl/717 | LP17/reopen/jsonl/19 LP02.exact-source | PASS | 원출력 11274행 |
| reopen-C-jsonl/718 | LP17/reopen/jsonl/19 reopen.remaining-media | PASS | 원출력 11276행 |
| reopen-C-jsonl/719 | LP17/reopen/jsonl/20 LP02.exact-source | PASS | 원출력 11280행 |
| reopen-C-jsonl/720 | LP17/reopen/jsonl/20 reopen.remaining-media | PASS | 원출력 11282행 |
| reopen-C-jsonl/721 | LP17/reopen/jsonl/21 LP02.exact-source | PASS | 원출력 11286행 |
| reopen-C-jsonl/722 | LP17/reopen/jsonl/21 reopen.remaining-media | PASS | 원출력 11288행 |
| reopen-C-jsonl/723 | LP17/reopen/jsonl/22 LP02.exact-source | PASS | 원출력 11292행 |
| reopen-C-jsonl/724 | LP17/reopen/jsonl/22 reopen.remaining-media | PASS | 원출력 11294행 |
| reopen-C-jsonl/725 | LP17/reopen/jsonl/23 LP02.exact-source | PASS | 원출력 11298행 |
| reopen-C-jsonl/726 | LP17/reopen/jsonl/23 reopen.remaining-media | PASS | 원출력 11300행 |
| reopen-C-jsonl/727 | LP17/reopen/jsonl/24 LP02.exact-source | PASS | 원출력 11304행 |
| reopen-C-jsonl/728 | LP17/reopen/jsonl/24 reopen.remaining-media | PASS | 원출력 11306행 |
| reopen-C-jsonl/729 | LP17/reopen/jsonl/25 LP02.exact-source | PASS | 원출력 11310행 |
| reopen-C-jsonl/730 | LP17/reopen/jsonl/25 reopen.remaining-media | PASS | 원출력 11312행 |
| reopen-C-jsonl/731 | LP17/reopen/jsonl/26 LP02.exact-source | PASS | 원출력 11316행 |
| reopen-C-jsonl/732 | LP17/reopen/jsonl/26 reopen.remaining-media | PASS | 원출력 11318행 |
| reopen-C-jsonl/733 | LP17/reopen/jsonl/27 LP02.exact-source | PASS | 원출력 11322행 |
| reopen-C-jsonl/734 | LP17/reopen/jsonl/27 reopen.remaining-media | PASS | 원출력 11324행 |
| reopen-C-jsonl/735 | LP17/reopen/jsonl/28 LP02.exact-source | PASS | 원출력 11328행 |
| reopen-C-jsonl/736 | LP17/reopen/jsonl/28 reopen.remaining-media | PASS | 원출력 11330행 |
| reopen-C-jsonl/737 | LP17/reopen/jsonl/29 LP02.exact-source | PASS | 원출력 11334행 |
| reopen-C-jsonl/738 | LP17/reopen/jsonl/29 reopen.remaining-media | PASS | 원출력 11336행 |
| reopen-C-jsonl/739 | LP17/reopen/jsonl/30 LP02.exact-source | PASS | 원출력 11340행 |
| reopen-C-jsonl/740 | LP17/reopen/jsonl/30 reopen.remaining-media | PASS | 원출력 11342행 |
| reopen-C-jsonl/741 | LP17/reopen/jsonl/31 LP02.exact-source | PASS | 원출력 11346행 |
| reopen-C-jsonl/742 | LP17/reopen/jsonl/31 reopen.remaining-media | PASS | 원출력 11348행 |
| job-B/743 | D08.input-keyframes | PASS | 원출력 11445행 |
| job-B/744 | D08.source-shape | PASS | 원출력 11447행 |
| job-B/745 | D08.selection-complete | PASS | 원출력 11448행 |
| job-B/746 | D08.expected-intent-built | PASS | 원출력 11449행 |
| job-B/747 | D08.admission | PASS | 원출력 11450행 |
| job-B/748 | D08.expected-state | PASS | 원출력 11495행 |
| job-B/749 | D08.canonical-intent | PASS | 원출력 11496행 |
| job-B/750 | D08.canonical-record-roundtrip | PASS | 원출력 11497행 |
| job-B/751 | D08.expected-state | PASS | 원출력 11534행 |
| job-B/752 | D08.canonical-intent | PASS | 원출력 11535행 |
| job-B/753 | D08.files-receipt | PASS | 원출력 11536행 |
| job-B/754 | D08.canonical-record-roundtrip | PASS | 원출력 11537행 |
| job-B/755 | D08.expected-state | PASS | 원출력 11578행 |
| job-B/756 | D08.canonical-intent | PASS | 원출력 11579행 |
| job-B/757 | D08.files-receipt | PASS | 원출력 11580행 |
| job-B/758 | D08.canonical-record-roundtrip | PASS | 원출력 11581행 |
| job-B/759 | {"kind":"error","code":"LP17_JOB_ORACLE_OR_SETUP"} | FAIL | 원출력 11582행 |

## lp17-jobs-comparison-01

[원출력](lp17-jobs-comparison-01.txt) · 201177B · SHA-256 `cd2bef1c441b2a2c158b2d2f7660bd7bc8a81ee1675c6ac99f08ea3221d19c6f`

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| runtime-freshness 실행 | exit=0; signal=null; 351ms; phase 종료 검사 | PASS | 원출력 22행; stop=null; observation=null; semantic=null; historicalRssPass=null; cleanup=true |
| compile 실행 | exit=0; signal=null; 4134ms; phase 종료 검사 | PASS | 원출력 54행; stop=null; observation=null; semantic=null; historicalRssPass=null; cleanup=true |
| job-B 실행 | exit=0; signal=null; 12182ms; assertion 60/0 | PASS | 원출력 625행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| job-C 실행 | exit=0; signal=null; 11624ms; assertion 60/0 | PASS | 원출력 1201행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| 실행 묶음 | phases=4; elapsed=28534ms; productPass=false | PASS | 원출력 1206행; failure=null; 실패 뒤 단계는 미실행 |
| <owned-root>/job-B 정리 | 삭제 전 5147594B, removed=true | PASS | 원출력 626행; 자식 그룹 종료 확인 후 삭제 |
| <owned-root>/job-C 정리 | 삭제 전 5147594B, removed=true | PASS | 원출력 1202행; 자식 그룹 종료 확인 후 삭제 |
| 소유 root 정리 | 삭제 전 17923801B, removed=true | PASS | 원출력 1205행; 자식 그룹 종료 확인 후 삭제 |
| B/C 작업 입력 동등 | true | PASS | 원출력 1203행 |
| 소스 불변 | true | PASS | 원출력 1204행 |

### 개별 검사

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| compile/1 | FC01 exact insertion checks count=95 | PASS | 원출력 28행 |
| job-B/2 | D08.input-keyframes | PASS | 원출력 57행 |
| job-B/3 | D08.source-shape | PASS | 원출력 59행 |
| job-B/4 | D08.selection-complete | PASS | 원출력 60행 |
| job-B/5 | D08.expected-intent-built | PASS | 원출력 61행 |
| job-B/6 | D08.admission | PASS | 원출력 62행 |
| job-B/7 | D08.expected-state | PASS | 원출력 107행 |
| job-B/8 | D08.canonical-intent | PASS | 원출력 108행 |
| job-B/9 | D08.canonical-record-roundtrip | PASS | 원출력 109행 |
| job-B/10 | D08.expected-state | PASS | 원출력 146행 |
| job-B/11 | D08.canonical-intent | PASS | 원출력 147행 |
| job-B/12 | D08.files-receipt | PASS | 원출력 148행 |
| job-B/13 | D08.canonical-record-roundtrip | PASS | 원출력 149행 |
| job-B/14 | D08.expected-state | PASS | 원출력 190행 |
| job-B/15 | D08.canonical-intent | PASS | 원출력 191행 |
| job-B/16 | D08.files-receipt | PASS | 원출력 192행 |
| job-B/17 | D08.canonical-record-roundtrip | PASS | 원출력 193행 |
| job-B/18 | D08.ready-verified-proof | PASS | 원출력 194행 |
| job-B/19 | D08.expected-state | PASS | 원출력 270행 |
| job-B/20 | D08.canonical-intent | PASS | 원출력 271행 |
| job-B/21 | D08.files-receipt | PASS | 원출력 272행 |
| job-B/22 | D08.canonical-record-roundtrip | PASS | 원출력 273행 |
| job-B/23 | D08.canonical-ready-preserved | PASS | 원출력 274행 |
| job-B/24 | D08.expected-state | PASS | 원출력 305행 |
| job-B/25 | D08.canonical-intent | PASS | 원출력 306행 |
| job-B/26 | D08.files-receipt | PASS | 원출력 307행 |
| job-B/27 | D08.canonical-record-roundtrip | PASS | 원출력 308행 |
| job-B/28 | D08.canonical-ready-preserved | PASS | 원출력 309행 |
| job-B/29 | D08.protection-released | PASS | 원출력 310행 |
| job-B/30 | D08.run-complete | PASS | 원출력 318행 |
| job-B/31 | D08.actual-output-hash | PASS | 원출력 319행 |
| job-B/32 | D08.selection-complete | PASS | 원출력 320행 |
| job-B/33 | D08.expected-intent-built | PASS | 원출력 321행 |
| job-B/34 | D08.admission | PASS | 원출력 322행 |
| job-B/35 | D08.expected-state | PASS | 원출력 367행 |
| job-B/36 | D08.canonical-intent | PASS | 원출력 368행 |
| job-B/37 | D08.canonical-record-roundtrip | PASS | 원출력 369행 |
| job-B/38 | D08.expected-state | PASS | 원출력 406행 |
| job-B/39 | D08.canonical-intent | PASS | 원출력 407행 |
| job-B/40 | D08.files-receipt | PASS | 원출력 408행 |
| job-B/41 | D08.canonical-record-roundtrip | PASS | 원출력 409행 |
| job-B/42 | D08.expected-state | PASS | 원출력 450행 |
| job-B/43 | D08.canonical-intent | PASS | 원출력 451행 |
| job-B/44 | D08.files-receipt | PASS | 원출력 452행 |
| job-B/45 | D08.canonical-record-roundtrip | PASS | 원출력 453행 |
| job-B/46 | D08.ready-verified-proof | PASS | 원출력 454행 |
| job-B/47 | D08.expected-state | PASS | 원출력 530행 |
| job-B/48 | D08.canonical-intent | PASS | 원출력 531행 |
| job-B/49 | D08.files-receipt | PASS | 원출력 532행 |
| job-B/50 | D08.canonical-record-roundtrip | PASS | 원출력 533행 |
| job-B/51 | D08.canonical-ready-preserved | PASS | 원출력 534행 |
| job-B/52 | D08.expected-state | PASS | 원출력 565행 |
| job-B/53 | D08.canonical-intent | PASS | 원출력 566행 |
| job-B/54 | D08.files-receipt | PASS | 원출력 567행 |
| job-B/55 | D08.canonical-record-roundtrip | PASS | 원출력 568행 |
| job-B/56 | D08.canonical-ready-preserved | PASS | 원출력 569행 |
| job-B/57 | D08.protection-released | PASS | 원출력 570행 |
| job-B/58 | D08.run-complete | PASS | 원출력 578행 |
| job-B/59 | D08.actual-output-hash | PASS | 원출력 579행 |
| job-B/60 | CP01.actual-ready-complete-shape-canonical-files-reservation | PASS | 원출력 580행 |
| job-B/61 | CP02.two-jobs-over-1MiB-canonical-transitions | PASS | 원출력 581행 |
| job-C/62 | D08.input-keyframes | PASS | 원출력 629행 |
| job-C/63 | D08.source-shape | PASS | 원출력 631행 |
| job-C/64 | D08.selection-complete | PASS | 원출력 632행 |
| job-C/65 | D08.expected-intent-built | PASS | 원출력 633행 |
| job-C/66 | D08.admission | PASS | 원출력 634행 |
| job-C/67 | D08.expected-state | PASS | 원출력 679행 |
| job-C/68 | D08.canonical-intent | PASS | 원출력 680행 |
| job-C/69 | D08.canonical-record-roundtrip | PASS | 원출력 681행 |
| job-C/70 | D08.expected-state | PASS | 원출력 718행 |
| job-C/71 | D08.canonical-intent | PASS | 원출력 719행 |
| job-C/72 | D08.files-receipt | PASS | 원출력 720행 |
| job-C/73 | D08.canonical-record-roundtrip | PASS | 원출력 721행 |
| job-C/74 | D08.expected-state | PASS | 원출력 762행 |
| job-C/75 | D08.canonical-intent | PASS | 원출력 763행 |
| job-C/76 | D08.files-receipt | PASS | 원출력 764행 |
| job-C/77 | D08.canonical-record-roundtrip | PASS | 원출력 765행 |
| job-C/78 | D08.ready-verified-proof | PASS | 원출력 766행 |
| job-C/79 | D08.expected-state | PASS | 원출력 844행 |
| job-C/80 | D08.canonical-intent | PASS | 원출력 845행 |
| job-C/81 | D08.files-receipt | PASS | 원출력 846행 |
| job-C/82 | D08.canonical-record-roundtrip | PASS | 원출력 847행 |
| job-C/83 | D08.canonical-ready-preserved | PASS | 원출력 848행 |
| job-C/84 | D08.expected-state | PASS | 원출력 879행 |
| job-C/85 | D08.canonical-intent | PASS | 원출력 880행 |
| job-C/86 | D08.files-receipt | PASS | 원출력 881행 |
| job-C/87 | D08.canonical-record-roundtrip | PASS | 원출력 882행 |
| job-C/88 | D08.canonical-ready-preserved | PASS | 원출력 883행 |
| job-C/89 | D08.protection-released | PASS | 원출력 884행 |
| job-C/90 | D08.run-complete | PASS | 원출력 892행 |
| job-C/91 | D08.actual-output-hash | PASS | 원출력 893행 |
| job-C/92 | D08.selection-complete | PASS | 원출력 894행 |
| job-C/93 | D08.expected-intent-built | PASS | 원출력 895행 |
| job-C/94 | D08.admission | PASS | 원출력 896행 |
| job-C/95 | D08.expected-state | PASS | 원출력 941행 |
| job-C/96 | D08.canonical-intent | PASS | 원출력 942행 |
| job-C/97 | D08.canonical-record-roundtrip | PASS | 원출력 943행 |
| job-C/98 | D08.expected-state | PASS | 원출력 980행 |
| job-C/99 | D08.canonical-intent | PASS | 원출력 981행 |
| job-C/100 | D08.files-receipt | PASS | 원출력 982행 |
| job-C/101 | D08.canonical-record-roundtrip | PASS | 원출력 983행 |
| job-C/102 | D08.expected-state | PASS | 원출력 1024행 |
| job-C/103 | D08.canonical-intent | PASS | 원출력 1025행 |
| job-C/104 | D08.files-receipt | PASS | 원출력 1026행 |
| job-C/105 | D08.canonical-record-roundtrip | PASS | 원출력 1027행 |
| job-C/106 | D08.ready-verified-proof | PASS | 원출력 1028행 |
| job-C/107 | D08.expected-state | PASS | 원출력 1106행 |
| job-C/108 | D08.canonical-intent | PASS | 원출력 1107행 |
| job-C/109 | D08.files-receipt | PASS | 원출력 1108행 |
| job-C/110 | D08.canonical-record-roundtrip | PASS | 원출력 1109행 |
| job-C/111 | D08.canonical-ready-preserved | PASS | 원출력 1110행 |
| job-C/112 | D08.expected-state | PASS | 원출력 1141행 |
| job-C/113 | D08.canonical-intent | PASS | 원출력 1142행 |
| job-C/114 | D08.files-receipt | PASS | 원출력 1143행 |
| job-C/115 | D08.canonical-record-roundtrip | PASS | 원출력 1144행 |
| job-C/116 | D08.canonical-ready-preserved | PASS | 원출력 1145행 |
| job-C/117 | D08.protection-released | PASS | 원출력 1146행 |
| job-C/118 | D08.run-complete | PASS | 원출력 1154행 |
| job-C/119 | D08.actual-output-hash | PASS | 원출력 1155행 |
| job-C/120 | CP01.actual-ready-complete-shape-canonical-files-reservation | PASS | 원출력 1156행 |
| job-C/121 | CP02.two-jobs-over-1MiB-canonical-transitions | PASS | 원출력 1157행 |

## lp17-selftest-guard-01

[원출력](lp17-selftest-guard-01.txt) · 2073B · SHA-256 `bec2faaee5e69ce1ff69d73abe6aa8a2b39af5a654b0e75dacd3d674dbdfae57`

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| runner-selftest 실행 | exit=1; signal=null; 22ms; phase 종료 검사 | FAIL | 원출력 22행; stop=null; observation=null; semantic=null; historicalRssPass=null; cleanup=true |
| 실행 묶음 | phases=1; elapsed=154ms; productPass=false | FAIL | 원출력 26행; failure=phase-failed; 실패 뒤 단계는 미실행 |
| 소유 root 정리 | 삭제 전 0B, removed=true | PASS | 원출력 25행; 자식 그룹 종료 확인 후 삭제 |
| 소스 불변 | true | PASS | 원출력 24행 |

### 개별 검사

개별 본문 assertion 출력 없음. 위 phase 실패/환경 단독 실행 상태와 구분한다.

## lp17-selftest-guard-02

[원출력](lp17-selftest-guard-02.txt) · 3365B · SHA-256 `99487d072cd0bde8f24de34483a180ef7aa3ba82411bd33f15efaa60e36c1ed8`

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| runner-selftest 실행 | exit=0; signal=null; 614ms; phase 종료 검사 | PASS | 원출력 47행; stop=null; observation=null; semantic=null; historicalRssPass=null; cleanup=true |
| 실행 묶음 | phases=1; elapsed=746ms; productPass=false | FAIL | 원출력 51행; failure=phase-failed; 실패 뒤 단계는 미실행 |
| 소유 root 정리 | 삭제 전 62691B, removed=true | PASS | 원출력 50행; 자식 그룹 종료 확인 후 삭제 |
| 소스 불변 | true | PASS | 원출력 49행 |

### 개별 검사

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| runner-selftest/1 | LP17-H01 기존 RSS 실패와 유효 진단 분리 | PASS | 원출력 3행 |
| runner-selftest/2 | LP17-H02 관측 누락·손상·역행·잘못된 owner 거부 | PASS | 원출력 4행 |
| runner-selftest/3 | LP17-H03 완료 summary 누락·중복·다른 작업·실패 거부 | PASS | 원출력 5행 |
| runner-selftest/4 | LP17-H04 process group 단위와 외부·zombie 제외 | PASS | 원출력 6행 |
| runner-selftest/5 | LP17-H05 실행 안전 상한·기능 실패·정리 실패 분리 | PASS | 원출력 7행 |
| 소유 자식 정리/6 | bytes=0, removed=true | PASS | 원출력 8행 |
| runner-selftest/7 | LP17-H06 실제 소유 자식 exit0/7와 그룹 종료 확인 | PASS | 원출력 9행 |
| 소유 자식 정리/8 | bytes=0, removed=true | PASS | 원출력 10행 |
| runner-selftest/9 | LP17-H07 실제 timeout 자식 종료와 뒤 단계 차단 | PASS | 원출력 11행 |
| 소유 자식 정리/10 | bytes=0, removed=true | PASS | 원출력 12행 |
| 소유 자식 정리/11 | bytes=89, removed=true | PASS | 원출력 13행 |
| 소유 자식 정리/12 | bytes=9, removed=true | PASS | 원출력 14행 |
| 소유 자식 정리/13 | bytes=101, removed=true | PASS | 원출력 15행 |
| runner-selftest/14 | LP17-H08 출력 초과 종료와 보존량 상한 | PASS | 원출력 16행 |
| runner-selftest/15 | LP17-H09 정리 소유권·symlink target 보존 | PASS | 원출력 17행 |
| runner-selftest/16 | LP17-H10 입력 manifest 변조와 symlink 거부 | PASS | 원출력 18행 |
| 소유 자식 정리/17 | bytes=0, removed=true | PASS | 원출력 19행 |
| runner-selftest/18 | LP17-H11 자식만 남긴 종료를 정상 완료로 오인하지 않음 | PASS | 원출력 20행 |

## lp17-selftest-guard-03

[원출력](lp17-selftest-guard-03.txt) · 4539B · SHA-256 `37b94f639a3eab98ffa29ac64867ecfad2ebd23cbc3c093839634eb663cd660e`

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| runner-selftest 실행 | exit=0; signal=null; 557ms; phase 종료 검사 | PASS | 원출력 104행; stop=null; observation=null; semantic=null; historicalRssPass=null; cleanup=true |
| 실행 묶음 | phases=1; elapsed=684ms; productPass=false | PASS | 원출력 107행; failure=null; 실패 뒤 단계는 미실행 |
| 소유 root 정리 | 삭제 전 62691B, removed=true | PASS | 원출력 106행; 자식 그룹 종료 확인 후 삭제 |
| 소스 불변 | true | PASS | 원출력 105행 |

### 개별 검사

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| runner-selftest/1 | LP17-H01 기존 RSS 실패와 유효 진단 분리 | PASS | 원출력 5행 |
| runner-selftest/2 | LP17-H02 관측 누락·손상·역행·잘못된 owner 거부 | PASS | 원출력 11행 |
| runner-selftest/3 | LP17-H03 완료 summary 누락·중복·다른 작업·실패 거부 | PASS | 원출력 17행 |
| runner-selftest/4 | LP17-H04 process group 단위와 외부·zombie 제외 | PASS | 원출력 23행 |
| runner-selftest/5 | LP17-H05 실행 안전 상한·기능 실패·정리 실패 분리 | PASS | 원출력 29행 |
| 소유 자식 정리/6 | bytes=0, removed=true | PASS | 원출력 34행 |
| runner-selftest/7 | LP17-H06 실제 소유 자식 exit0/7와 그룹 종료 확인 | PASS | 원출력 36행 |
| 소유 자식 정리/8 | bytes=0, removed=true | PASS | 원출력 41행 |
| runner-selftest/9 | LP17-H07 실제 timeout 자식 종료와 뒤 단계 차단 | PASS | 원출력 43행 |
| 소유 자식 정리/10 | bytes=0, removed=true | PASS | 원출력 48행 |
| 소유 자식 정리/11 | bytes=89, removed=true | PASS | 원출력 49행 |
| 소유 자식 정리/12 | bytes=9, removed=true | PASS | 원출력 50행 |
| 소유 자식 정리/13 | bytes=101, removed=true | PASS | 원출력 51행 |
| runner-selftest/14 | LP17-H08 출력 초과 종료와 보존량 상한 | PASS | 원출력 53행 |
| runner-selftest/15 | LP17-H09 정리 소유권·symlink target 보존 | PASS | 원출력 59행 |
| runner-selftest/16 | LP17-H10 입력 manifest 변조와 symlink 거부 | PASS | 원출력 65행 |
| 소유 자식 정리/17 | bytes=0, removed=true | PASS | 원출력 70행 |
| runner-selftest/18 | LP17-H11 자식만 남긴 종료를 정상 완료로 오인하지 않음 | PASS | 원출력 72행 |

## lp17-selftest-guard-04

[원출력](lp17-selftest-guard-04.txt) · 4571B · SHA-256 `d2d43d12ca06379877a71fe2c2495eaaae103bb95f1e401f14b9d5b4943537ac`

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| runner-selftest 실행 | exit=0; signal=null; 567ms; phase 종료 검사 | PASS | 원출력 104행; stop=null; observation=null; semantic=null; historicalRssPass=null; cleanup=true |
| 실행 묶음 | phases=1; elapsed=699ms; productPass=false | PASS | 원출력 107행; failure=null; 실패 뒤 단계는 미실행 |
| 소유 root 정리 | 삭제 전 62691B, removed=true | PASS | 원출력 106행; 자식 그룹 종료 확인 후 삭제 |
| 소스 불변 | true | PASS | 원출력 105행 |

### 개별 검사

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| runner-selftest/1 | LP17-H01 기존 RSS 실패와 유효 진단 분리 | PASS | 원출력 5행 |
| runner-selftest/2 | LP17-H02 관측 누락·손상·역행·잘못된 owner 거부 | PASS | 원출력 11행 |
| runner-selftest/3 | LP17-H03 완료 summary 누락·중복·다른 작업·실패 거부 | PASS | 원출력 17행 |
| runner-selftest/4 | LP17-H04 process group 단위와 외부·zombie 제외 | PASS | 원출력 23행 |
| runner-selftest/5 | LP17-H05 실행 안전 상한·기능 실패·정리 실패 분리 | PASS | 원출력 29행 |
| 소유 자식 정리/6 | bytes=0, removed=true | PASS | 원출력 34행 |
| runner-selftest/7 | LP17-H06 실제 소유 자식 exit0/7와 그룹 종료 확인 | PASS | 원출력 36행 |
| 소유 자식 정리/8 | bytes=0, removed=true | PASS | 원출력 41행 |
| runner-selftest/9 | LP17-H07 실제 timeout 자식 종료와 뒤 단계 차단 | PASS | 원출력 43행 |
| 소유 자식 정리/10 | bytes=0, removed=true | PASS | 원출력 48행 |
| 소유 자식 정리/11 | bytes=89, removed=true | PASS | 원출력 49행 |
| 소유 자식 정리/12 | bytes=9, removed=true | PASS | 원출력 50행 |
| 소유 자식 정리/13 | bytes=101, removed=true | PASS | 원출력 51행 |
| runner-selftest/14 | LP17-H08 출력 초과 종료와 보존량 상한 | PASS | 원출력 53행 |
| runner-selftest/15 | LP17-H09 정리 소유권·symlink target 보존 | PASS | 원출력 59행 |
| runner-selftest/16 | LP17-H10 입력 manifest 변조와 symlink 거부 | PASS | 원출력 65행 |
| 소유 자식 정리/17 | bytes=0, removed=true | PASS | 원출력 70행 |
| runner-selftest/18 | LP17-H11 자식만 남긴 종료를 정상 완료로 오인하지 않음 | PASS | 원출력 72행 |

## lp17-selftest-guard-05

[원출력](lp17-selftest-guard-05.txt) · 4571B · SHA-256 `c13f15a5dc35a49cad56ff29a4dd0b7f5328b5079554404c105c1b5f194d8c90`

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| runner-selftest 실행 | exit=0; signal=null; 567ms; phase 종료 검사 | PASS | 원출력 104행; stop=null; observation=null; semantic=null; historicalRssPass=null; cleanup=true |
| 실행 묶음 | phases=1; elapsed=697ms; productPass=false | PASS | 원출력 107행; failure=null; 실패 뒤 단계는 미실행 |
| 소유 root 정리 | 삭제 전 62691B, removed=true | PASS | 원출력 106행; 자식 그룹 종료 확인 후 삭제 |
| 소스 불변 | true | PASS | 원출력 105행 |

### 개별 검사

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| runner-selftest/1 | LP17-H01 기존 RSS 실패와 유효 진단 분리 | PASS | 원출력 5행 |
| runner-selftest/2 | LP17-H02 관측 누락·손상·역행·잘못된 owner 거부 | PASS | 원출력 11행 |
| runner-selftest/3 | LP17-H03 완료 summary 누락·중복·다른 작업·실패 거부 | PASS | 원출력 17행 |
| runner-selftest/4 | LP17-H04 process group 단위와 외부·zombie 제외 | PASS | 원출력 23행 |
| runner-selftest/5 | LP17-H05 실행 안전 상한·기능 실패·정리 실패 분리 | PASS | 원출력 29행 |
| 소유 자식 정리/6 | bytes=0, removed=true | PASS | 원출력 34행 |
| runner-selftest/7 | LP17-H06 실제 소유 자식 exit0/7와 그룹 종료 확인 | PASS | 원출력 36행 |
| 소유 자식 정리/8 | bytes=0, removed=true | PASS | 원출력 41행 |
| runner-selftest/9 | LP17-H07 실제 timeout 자식 종료와 뒤 단계 차단 | PASS | 원출력 43행 |
| 소유 자식 정리/10 | bytes=0, removed=true | PASS | 원출력 48행 |
| 소유 자식 정리/11 | bytes=89, removed=true | PASS | 원출력 49행 |
| 소유 자식 정리/12 | bytes=9, removed=true | PASS | 원출력 50행 |
| 소유 자식 정리/13 | bytes=101, removed=true | PASS | 원출력 51행 |
| runner-selftest/14 | LP17-H08 출력 초과 종료와 보존량 상한 | PASS | 원출력 53행 |
| runner-selftest/15 | LP17-H09 정리 소유권·symlink target 보존 | PASS | 원출력 59행 |
| runner-selftest/16 | LP17-H10 입력 manifest 변조와 symlink 거부 | PASS | 원출력 65행 |
| 소유 자식 정리/17 | bytes=0, removed=true | PASS | 원출력 70행 |
| runner-selftest/18 | LP17-H11 자식만 남긴 종료를 정상 완료로 오인하지 않음 | PASS | 원출력 72행 |

## lp17-small-fixture-01

[원출력](lp17-small-fixture-01.txt) · 1493B · SHA-256 `3b954e638a1bf712c554d0109642ba3135d9373f651880d9852ec54a6368ff35`

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| runtime-freshness 실행 | exit=null; signal=SIGTERM; 530ms; phase 종료 검사 | FAIL | 원출력 7행; stop=resource-observation; observation=null; semantic=null; historicalRssPass=null; cleanup=true |
| 실행 묶음 | phases=1; elapsed=626ms; productPass=false | FAIL | 원출력 11행; failure=phase-failed; 실패 뒤 단계는 미실행 |
| 소유 root 정리 | 삭제 전 62691B, removed=true | PASS | 원출력 10행; 자식 그룹 종료 확인 후 삭제 |
| 소스 불변 | true | PASS | 원출력 9행 |

### 개별 검사

개별 본문 assertion 출력 없음. 위 phase 실패/환경 단독 실행 상태와 구분한다.

## lp17-small-fixture-02

[원출력](lp17-small-fixture-02.txt) · 54657B · SHA-256 `e57b28c53a41968908e80937b643c01def8c82782c00a438ba4471f8a4af1009`

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| runtime-freshness 실행 | exit=0; signal=null; 359ms; phase 종료 검사 | PASS | 원출력 22행; stop=null; observation=null; semantic=null; historicalRssPass=null; cleanup=true |
| compile 실행 | exit=0; signal=null; 4146ms; phase 종료 검사 | PASS | 원출력 54행; stop=null; observation=null; semantic=null; historicalRssPass=null; cleanup=true |
| prepare 실행 | exit=0; signal=null; 1909ms; assertion 6/0 | PASS | 원출력 84행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| scale-A 실행 | exit=1; signal=null; 275ms; phase 종료 검사 | FAIL | 원출력 366행; stop=null; observation=false; semantic=false; historicalRssPass=true; cleanup=true |
| 실행 묶음 | phases=4; elapsed=6888ms; productPass=false | FAIL | 원출력 370행; failure=phase-failed; 실패 뒤 단계는 미실행 |
| 소유 root 정리 | 삭제 전 18459460B, removed=true | PASS | 원출력 369행; 자식 그룹 종료 확인 후 삭제 |
| 소스 불변 | true | PASS | 원출력 368행 |

### 개별 검사

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| compile/1 | FC01 exact insertion checks count=95 | PASS | 원출력 28행 |
| prepare/2 | recorded FE02 writer start | PASS | 원출력 57행 |
| prepare/3 | recorded FE04 bound finalized mutation segment0 | PASS | 원출력 58행 |
| prepare/4 | LP17/prepare LP02.actual4096-prerequisite | PASS | 원출력 60행 |
| prepare/5 | LP17/prepare seed.input-count | PASS | 원출력 61행 |
| prepare/6 | LP17/prepare seed.input-identity-all-samples | PASS | 원출력 62행 |
| prepare/7 | LP17/prepare seed.physical-evidence | PASS | 원출력 63행 |
| scale-A/8 | LP17/commit1 LP02.reserve | PASS | 원출력 102행 |
| scale-A/9 | LP17/commit1 LP02.actual-file-outside-catalog | PASS | 원출력 103행 |
| scale-A/10 | LP17/commit1 LP02.commit | PASS | 원출력 145행 |
| scale-A/11 | LP17/commit2 LP02.reserve | PASS | 원출력 160행 |
| scale-A/12 | LP17/commit2 LP02.actual-file-outside-catalog | PASS | 원출력 161행 |
| scale-A/13 | LP17/commit2 LP02.commit | PASS | 원출력 203행 |
| scale-A/14 | LP17/snapshot2 LP02.snapshot-exact-count | PASS | 원출력 224행 |
| scale-A/15 | LP17/snapshot2 snapshot.canonical-all | PASS | 원출력 237행 |
| scale-A/16 | LP17/snapshot2 LP02.explicit-checkpoint | PASS | 원출력 273행 |
| scale-A/17 | LP17/snapshot2 LP02.reservation-bound-mutation-count | PASS | 원출력 279행 |
| scale-A/18 | LP17/delete delete.original-canonical | PASS | 원출력 288행 |
| scale-A/19 | LP17/delete delete.pending | PASS | 원출력 305행 |
| scale-A/20 | LP17/delete delete.unlink | PASS | 원출력 306행 |
| scale-A/21 | LP17/delete delete.tombstone | PASS | 원출력 322행 |
| scale-A/22 | LP17/delete delete.checkpoint | PASS | 원출력 346행 |
| scale-A/23 | {"kind":"error","code":"LP17_ORACLE_OR_SETUP"} | FAIL | 원출력 347행 |

## lp17-small-fixture-03

[원출력](lp17-small-fixture-03.txt) · 136688B · SHA-256 `b854cdc6209a611f4e34140c74119ac1d3769c4c5e8644ffdbc4c086be176448`

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| runtime-freshness 실행 | exit=0; signal=null; 344ms; phase 종료 검사 | PASS | 원출력 22행; stop=null; observation=null; semantic=null; historicalRssPass=null; cleanup=true |
| compile 실행 | exit=0; signal=null; 4070ms; phase 종료 검사 | PASS | 원출력 54행; stop=null; observation=null; semantic=null; historicalRssPass=null; cleanup=true |
| prepare 실행 | exit=0; signal=null; 1684ms; assertion 6/0 | PASS | 원출력 84행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| scale-A 실행 | exit=0; signal=null; 277ms; assertion 17/0 | PASS | 원출력 383행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| reopen-A-sqlite 실행 | exit=0; signal=null; 274ms; assertion 7/0 | PASS | 원출력 466행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| reopen-A-jsonl 실행 | exit=0; signal=null; 253ms; assertion 7/0 | PASS | 원출력 541행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| scale-B 실행 | exit=0; signal=null; 276ms; assertion 17/0 | PASS | 원출력 840행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| reopen-B-sqlite 실행 | exit=0; signal=null; 273ms; assertion 7/0 | FAIL | 원출력 923행; stop=resource-observation; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| 실행 묶음 | phases=8; elapsed=7782ms; productPass=false | FAIL | 원출력 927행; failure=phase-failed; 실패 뒤 단계는 미실행 |
| <owned-root>/store-A 정리 | 삭제 전 256627B, removed=true | PASS | 원출력 542행; 자식 그룹 종료 확인 후 삭제 |
| 소유 root 정리 | 삭제 전 18478948B, removed=true | PASS | 원출력 926행; 자식 그룹 종료 확인 후 삭제 |
| 소스 불변 | true | PASS | 원출력 925행 |

### 개별 검사

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| compile/1 | FC01 exact insertion checks count=95 | PASS | 원출력 28행 |
| prepare/2 | recorded FE02 writer start | PASS | 원출력 57행 |
| prepare/3 | recorded FE04 bound finalized mutation segment0 | PASS | 원출력 58행 |
| prepare/4 | LP17/prepare LP02.actual4096-prerequisite | PASS | 원출력 60행 |
| prepare/5 | LP17/prepare seed.input-count | PASS | 원출력 61행 |
| prepare/6 | LP17/prepare seed.input-identity-all-samples | PASS | 원출력 62행 |
| prepare/7 | LP17/prepare seed.physical-evidence | PASS | 원출력 63행 |
| scale-A/8 | LP17/commit1 LP02.reserve | PASS | 원출력 102행 |
| scale-A/9 | LP17/commit1 LP02.actual-file-outside-catalog | PASS | 원출력 103행 |
| scale-A/10 | LP17/commit1 LP02.commit | PASS | 원출력 145행 |
| scale-A/11 | LP17/commit2 LP02.reserve | PASS | 원출력 160행 |
| scale-A/12 | LP17/commit2 LP02.actual-file-outside-catalog | PASS | 원출력 161행 |
| scale-A/13 | LP17/commit2 LP02.commit | PASS | 원출력 203행 |
| scale-A/14 | LP17/snapshot2 LP02.snapshot-exact-count | PASS | 원출력 224행 |
| scale-A/15 | LP17/snapshot2 snapshot.canonical-all | PASS | 원출력 237행 |
| scale-A/16 | LP17/snapshot2 LP02.explicit-checkpoint | PASS | 원출력 273행 |
| scale-A/17 | LP17/snapshot2 LP02.reservation-bound-mutation-count | PASS | 원출력 279행 |
| scale-A/18 | LP17/delete delete.original-canonical | PASS | 원출력 288행 |
| scale-A/19 | LP17/delete delete.pending | PASS | 원출력 305행 |
| scale-A/20 | LP17/delete delete.unlink | PASS | 원출력 306행 |
| scale-A/21 | LP17/delete delete.tombstone | PASS | 원출력 322행 |
| scale-A/22 | LP17/delete delete.checkpoint | PASS | 원출력 346행 |
| scale-A/23 | LP17/delete delete.binding-preserved | PASS | 원출력 347행 |
| scale-A/24 | LP17/delete deleted.public-hidden | PASS | 원출력 348행 |
| reopen-A-sqlite/25 | LP17/reopen/sqlite LP02.journal-reopen | PASS | 원출력 397행 |
| reopen-A-sqlite/26 | LP17/reopen/sqlite LP02.catalog-reopen | PASS | 원출력 421행 |
| reopen-A-sqlite/27 | LP17/reopen/sqlite/0 LP02.exact-source | PASS | 원출력 427행 |
| reopen-A-sqlite/28 | LP17/reopen/sqlite/0 deleted.public-hidden | PASS | 원출력 428행 |
| reopen-A-sqlite/29 | LP17/reopen/sqlite/0 reopen.deleted-state | PASS | 원출력 430행 |
| reopen-A-sqlite/30 | LP17/reopen/sqlite/1 LP02.exact-source | PASS | 원출력 431행 |
| reopen-A-sqlite/31 | LP17/reopen/sqlite/1 reopen.remaining-media | PASS | 원출력 433행 |
| reopen-A-jsonl/32 | LP17/reopen/jsonl LP02.journal-reopen | PASS | 원출력 480행 |
| reopen-A-jsonl/33 | LP17/reopen/jsonl LP02.catalog-reopen | PASS | 원출력 496행 |
| reopen-A-jsonl/34 | LP17/reopen/jsonl/0 LP02.exact-source | PASS | 원출력 502행 |
| reopen-A-jsonl/35 | LP17/reopen/jsonl/0 deleted.public-hidden | PASS | 원출력 503행 |
| reopen-A-jsonl/36 | LP17/reopen/jsonl/0 reopen.deleted-state | PASS | 원출력 505행 |
| reopen-A-jsonl/37 | LP17/reopen/jsonl/1 LP02.exact-source | PASS | 원출력 506행 |
| reopen-A-jsonl/38 | LP17/reopen/jsonl/1 reopen.remaining-media | PASS | 원출력 508행 |
| scale-B/39 | LP17/commit1 LP02.reserve | PASS | 원출력 559행 |
| scale-B/40 | LP17/commit1 LP02.actual-file-outside-catalog | PASS | 원출력 560행 |
| scale-B/41 | LP17/commit1 LP02.commit | PASS | 원출력 602행 |
| scale-B/42 | LP17/commit2 LP02.reserve | PASS | 원출력 617행 |
| scale-B/43 | LP17/commit2 LP02.actual-file-outside-catalog | PASS | 원출력 618행 |
| scale-B/44 | LP17/commit2 LP02.commit | PASS | 원출력 660행 |
| scale-B/45 | LP17/snapshot2 LP02.snapshot-exact-count | PASS | 원출력 681행 |
| scale-B/46 | LP17/snapshot2 snapshot.canonical-all | PASS | 원출력 694행 |
| scale-B/47 | LP17/snapshot2 LP02.explicit-checkpoint | PASS | 원출력 730행 |
| scale-B/48 | LP17/snapshot2 LP02.reservation-bound-mutation-count | PASS | 원출력 736행 |
| scale-B/49 | LP17/delete delete.original-canonical | PASS | 원출력 745행 |
| scale-B/50 | LP17/delete delete.pending | PASS | 원출력 762행 |
| scale-B/51 | LP17/delete delete.unlink | PASS | 원출력 763행 |
| scale-B/52 | LP17/delete delete.tombstone | PASS | 원출력 779행 |
| scale-B/53 | LP17/delete delete.checkpoint | PASS | 원출력 803행 |
| scale-B/54 | LP17/delete delete.binding-preserved | PASS | 원출력 804행 |
| scale-B/55 | LP17/delete deleted.public-hidden | PASS | 원출력 805행 |
| reopen-B-sqlite/56 | LP17/reopen/sqlite LP02.journal-reopen | PASS | 원출력 848행 |
| reopen-B-sqlite/57 | LP17/reopen/sqlite LP02.catalog-reopen | PASS | 원출력 872행 |
| reopen-B-sqlite/58 | LP17/reopen/sqlite/0 LP02.exact-source | PASS | 원출력 881행 |
| reopen-B-sqlite/59 | LP17/reopen/sqlite/0 deleted.public-hidden | PASS | 원출력 882행 |
| reopen-B-sqlite/60 | LP17/reopen/sqlite/0 reopen.deleted-state | PASS | 원출력 884행 |
| reopen-B-sqlite/61 | LP17/reopen/sqlite/1 LP02.exact-source | PASS | 원출력 888행 |
| reopen-B-sqlite/62 | LP17/reopen/sqlite/1 reopen.remaining-media | PASS | 원출력 890행 |

## lp17-small-fixture-04

[원출력](lp17-small-fixture-04.txt) · 216408B · SHA-256 `cc2163142a1d5ae5c9b26b7f77f2cf3d66b478203abba1cf86622cbe0f0f892a`

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| runtime-freshness 실행 | exit=0; signal=null; 348ms; phase 종료 검사 | PASS | 원출력 22행; stop=null; observation=null; semantic=null; historicalRssPass=null; cleanup=true |
| compile 실행 | exit=0; signal=null; 4055ms; phase 종료 검사 | PASS | 원출력 54행; stop=null; observation=null; semantic=null; historicalRssPass=null; cleanup=true |
| prepare 실행 | exit=0; signal=null; 1509ms; assertion 6/0 | PASS | 원출력 84행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| scale-A 실행 | exit=0; signal=null; 278ms; assertion 17/0 | PASS | 원출력 383행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| reopen-A-sqlite 실행 | exit=0; signal=null; 275ms; assertion 7/0 | PASS | 원출력 466행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| reopen-A-jsonl 실행 | exit=0; signal=null; 250ms; assertion 7/0 | PASS | 원출력 541행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| scale-B 실행 | exit=0; signal=null; 276ms; assertion 17/0 | PASS | 원출력 840행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| reopen-B-sqlite 실행 | exit=0; signal=null; 275ms; assertion 7/0 | PASS | 원출력 923행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| reopen-B-jsonl 실행 | exit=0; signal=null; 255ms; assertion 7/0 | PASS | 원출력 998행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| scale-C 실행 | exit=0; signal=null; 275ms; assertion 17/0 | PASS | 원출력 1307행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| reopen-C-sqlite 실행 | exit=0; signal=null; 273ms; assertion 7/0 | PASS | 원출력 1390행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| reopen-C-jsonl 실행 | exit=0; signal=null; 251ms; assertion 7/0 | PASS | 원출력 1465행; stop=null; observation=true; semantic=true; historicalRssPass=true; cleanup=true |
| 실행 묶음 | phases=12; elapsed=8792ms; productPass=false | PASS | 원출력 1469행; failure=null; 실패 뒤 단계는 미실행 |
| <owned-root>/store-A 정리 | 삭제 전 256627B, removed=true | PASS | 원출력 542행; 자식 그룹 종료 확인 후 삭제 |
| <owned-root>/store-B 정리 | 삭제 전 256627B, removed=true | PASS | 원출력 999행; 자식 그룹 종료 확인 후 삭제 |
| <owned-root>/store-C 정리 | 삭제 전 256627B, removed=true | PASS | 원출력 1466행; 자식 그룹 종료 확인 후 삭제 |
| 소유 root 정리 | 삭제 전 18222321B, removed=true | PASS | 원출력 1468행; 자식 그룹 종료 확인 후 삭제 |
| 소스 불변 | true | PASS | 원출력 1467행 |

### 개별 검사

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| compile/1 | FC01 exact insertion checks count=95 | PASS | 원출력 28행 |
| prepare/2 | recorded FE02 writer start | PASS | 원출력 57행 |
| prepare/3 | recorded FE04 bound finalized mutation segment0 | PASS | 원출력 58행 |
| prepare/4 | LP17/prepare LP02.actual4096-prerequisite | PASS | 원출력 60행 |
| prepare/5 | LP17/prepare seed.input-count | PASS | 원출력 61행 |
| prepare/6 | LP17/prepare seed.input-identity-all-samples | PASS | 원출력 62행 |
| prepare/7 | LP17/prepare seed.physical-evidence | PASS | 원출력 63행 |
| scale-A/8 | LP17/commit1 LP02.reserve | PASS | 원출력 102행 |
| scale-A/9 | LP17/commit1 LP02.actual-file-outside-catalog | PASS | 원출력 103행 |
| scale-A/10 | LP17/commit1 LP02.commit | PASS | 원출력 145행 |
| scale-A/11 | LP17/commit2 LP02.reserve | PASS | 원출력 160행 |
| scale-A/12 | LP17/commit2 LP02.actual-file-outside-catalog | PASS | 원출력 161행 |
| scale-A/13 | LP17/commit2 LP02.commit | PASS | 원출력 203행 |
| scale-A/14 | LP17/snapshot2 LP02.snapshot-exact-count | PASS | 원출력 224행 |
| scale-A/15 | LP17/snapshot2 snapshot.canonical-all | PASS | 원출력 237행 |
| scale-A/16 | LP17/snapshot2 LP02.explicit-checkpoint | PASS | 원출력 273행 |
| scale-A/17 | LP17/snapshot2 LP02.reservation-bound-mutation-count | PASS | 원출력 279행 |
| scale-A/18 | LP17/delete delete.original-canonical | PASS | 원출력 288행 |
| scale-A/19 | LP17/delete delete.pending | PASS | 원출력 305행 |
| scale-A/20 | LP17/delete delete.unlink | PASS | 원출력 306행 |
| scale-A/21 | LP17/delete delete.tombstone | PASS | 원출력 322행 |
| scale-A/22 | LP17/delete delete.checkpoint | PASS | 원출력 346행 |
| scale-A/23 | LP17/delete delete.binding-preserved | PASS | 원출력 347행 |
| scale-A/24 | LP17/delete deleted.public-hidden | PASS | 원출력 348행 |
| reopen-A-sqlite/25 | LP17/reopen/sqlite LP02.journal-reopen | PASS | 원출력 397행 |
| reopen-A-sqlite/26 | LP17/reopen/sqlite LP02.catalog-reopen | PASS | 원출력 421행 |
| reopen-A-sqlite/27 | LP17/reopen/sqlite/0 LP02.exact-source | PASS | 원출력 427행 |
| reopen-A-sqlite/28 | LP17/reopen/sqlite/0 deleted.public-hidden | PASS | 원출력 428행 |
| reopen-A-sqlite/29 | LP17/reopen/sqlite/0 reopen.deleted-state | PASS | 원출력 430행 |
| reopen-A-sqlite/30 | LP17/reopen/sqlite/1 LP02.exact-source | PASS | 원출력 431행 |
| reopen-A-sqlite/31 | LP17/reopen/sqlite/1 reopen.remaining-media | PASS | 원출력 433행 |
| reopen-A-jsonl/32 | LP17/reopen/jsonl LP02.journal-reopen | PASS | 원출력 480행 |
| reopen-A-jsonl/33 | LP17/reopen/jsonl LP02.catalog-reopen | PASS | 원출력 496행 |
| reopen-A-jsonl/34 | LP17/reopen/jsonl/0 LP02.exact-source | PASS | 원출력 502행 |
| reopen-A-jsonl/35 | LP17/reopen/jsonl/0 deleted.public-hidden | PASS | 원출력 503행 |
| reopen-A-jsonl/36 | LP17/reopen/jsonl/0 reopen.deleted-state | PASS | 원출력 505행 |
| reopen-A-jsonl/37 | LP17/reopen/jsonl/1 LP02.exact-source | PASS | 원출력 506행 |
| reopen-A-jsonl/38 | LP17/reopen/jsonl/1 reopen.remaining-media | PASS | 원출력 508행 |
| scale-B/39 | LP17/commit1 LP02.reserve | PASS | 원출력 559행 |
| scale-B/40 | LP17/commit1 LP02.actual-file-outside-catalog | PASS | 원출력 560행 |
| scale-B/41 | LP17/commit1 LP02.commit | PASS | 원출력 602행 |
| scale-B/42 | LP17/commit2 LP02.reserve | PASS | 원출력 617행 |
| scale-B/43 | LP17/commit2 LP02.actual-file-outside-catalog | PASS | 원출력 618행 |
| scale-B/44 | LP17/commit2 LP02.commit | PASS | 원출력 660행 |
| scale-B/45 | LP17/snapshot2 LP02.snapshot-exact-count | PASS | 원출력 681행 |
| scale-B/46 | LP17/snapshot2 snapshot.canonical-all | PASS | 원출력 694행 |
| scale-B/47 | LP17/snapshot2 LP02.explicit-checkpoint | PASS | 원출력 730행 |
| scale-B/48 | LP17/snapshot2 LP02.reservation-bound-mutation-count | PASS | 원출력 736행 |
| scale-B/49 | LP17/delete delete.original-canonical | PASS | 원출력 745행 |
| scale-B/50 | LP17/delete delete.pending | PASS | 원출력 762행 |
| scale-B/51 | LP17/delete delete.unlink | PASS | 원출력 763행 |
| scale-B/52 | LP17/delete delete.tombstone | PASS | 원출력 779행 |
| scale-B/53 | LP17/delete delete.checkpoint | PASS | 원출력 803행 |
| scale-B/54 | LP17/delete delete.binding-preserved | PASS | 원출력 804행 |
| scale-B/55 | LP17/delete deleted.public-hidden | PASS | 원출력 805행 |
| reopen-B-sqlite/56 | LP17/reopen/sqlite LP02.journal-reopen | PASS | 원출력 848행 |
| reopen-B-sqlite/57 | LP17/reopen/sqlite LP02.catalog-reopen | PASS | 원출력 872행 |
| reopen-B-sqlite/58 | LP17/reopen/sqlite/0 LP02.exact-source | PASS | 원출력 881행 |
| reopen-B-sqlite/59 | LP17/reopen/sqlite/0 deleted.public-hidden | PASS | 원출력 882행 |
| reopen-B-sqlite/60 | LP17/reopen/sqlite/0 reopen.deleted-state | PASS | 원출력 884행 |
| reopen-B-sqlite/61 | LP17/reopen/sqlite/1 LP02.exact-source | PASS | 원출력 888행 |
| reopen-B-sqlite/62 | LP17/reopen/sqlite/1 reopen.remaining-media | PASS | 원출력 890행 |
| reopen-B-jsonl/63 | LP17/reopen/jsonl LP02.journal-reopen | PASS | 원출력 931행 |
| reopen-B-jsonl/64 | LP17/reopen/jsonl LP02.catalog-reopen | PASS | 원출력 947행 |
| reopen-B-jsonl/65 | LP17/reopen/jsonl/0 LP02.exact-source | PASS | 원출력 956행 |
| reopen-B-jsonl/66 | LP17/reopen/jsonl/0 deleted.public-hidden | PASS | 원출력 957행 |
| reopen-B-jsonl/67 | LP17/reopen/jsonl/0 reopen.deleted-state | PASS | 원출력 959행 |
| reopen-B-jsonl/68 | LP17/reopen/jsonl/1 LP02.exact-source | PASS | 원출력 963행 |
| reopen-B-jsonl/69 | LP17/reopen/jsonl/1 reopen.remaining-media | PASS | 원출력 965행 |
| scale-C/70 | LP17/commit1 LP02.reserve | PASS | 원출력 1016행 |
| scale-C/71 | LP17/commit1 LP02.actual-file-outside-catalog | PASS | 원출력 1017행 |
| scale-C/72 | LP17/commit1 LP02.commit | PASS | 원출력 1059행 |
| scale-C/73 | LP17/commit2 LP02.reserve | PASS | 원출력 1074행 |
| scale-C/74 | LP17/commit2 LP02.actual-file-outside-catalog | PASS | 원출력 1075행 |
| scale-C/75 | LP17/commit2 LP02.commit | PASS | 원출력 1117행 |
| scale-C/76 | LP17/snapshot2 LP02.snapshot-exact-count | PASS | 원출력 1138행 |
| scale-C/77 | LP17/snapshot2 snapshot.canonical-all | PASS | 원출력 1151행 |
| scale-C/78 | LP17/snapshot2 LP02.explicit-checkpoint | PASS | 원출력 1189행 |
| scale-C/79 | LP17/snapshot2 LP02.reservation-bound-mutation-count | PASS | 원출력 1195행 |
| scale-C/80 | LP17/delete delete.original-canonical | PASS | 원출력 1204행 |
| scale-C/81 | LP17/delete delete.pending | PASS | 원출력 1221행 |
| scale-C/82 | LP17/delete delete.unlink | PASS | 원출력 1222행 |
| scale-C/83 | LP17/delete delete.tombstone | PASS | 원출력 1238행 |
| scale-C/84 | LP17/delete delete.checkpoint | PASS | 원출력 1270행 |
| scale-C/85 | LP17/delete delete.binding-preserved | PASS | 원출력 1271행 |
| scale-C/86 | LP17/delete deleted.public-hidden | PASS | 원출력 1272행 |
| reopen-C-sqlite/87 | LP17/reopen/sqlite LP02.journal-reopen | PASS | 원출력 1315행 |
| reopen-C-sqlite/88 | LP17/reopen/sqlite LP02.catalog-reopen | PASS | 원출력 1339행 |
| reopen-C-sqlite/89 | LP17/reopen/sqlite/0 LP02.exact-source | PASS | 원출력 1348행 |
| reopen-C-sqlite/90 | LP17/reopen/sqlite/0 deleted.public-hidden | PASS | 원출력 1349행 |
| reopen-C-sqlite/91 | LP17/reopen/sqlite/0 reopen.deleted-state | PASS | 원출력 1351행 |
| reopen-C-sqlite/92 | LP17/reopen/sqlite/1 LP02.exact-source | PASS | 원출력 1355행 |
| reopen-C-sqlite/93 | LP17/reopen/sqlite/1 reopen.remaining-media | PASS | 원출력 1357행 |
| reopen-C-jsonl/94 | LP17/reopen/jsonl LP02.journal-reopen | PASS | 원출력 1398행 |
| reopen-C-jsonl/95 | LP17/reopen/jsonl LP02.catalog-reopen | PASS | 원출력 1414행 |
| reopen-C-jsonl/96 | LP17/reopen/jsonl/0 LP02.exact-source | PASS | 원출력 1423행 |
| reopen-C-jsonl/97 | LP17/reopen/jsonl/0 deleted.public-hidden | PASS | 원출력 1424행 |
| reopen-C-jsonl/98 | LP17/reopen/jsonl/0 reopen.deleted-state | PASS | 원출력 1426행 |
| reopen-C-jsonl/99 | LP17/reopen/jsonl/1 LP02.exact-source | PASS | 원출력 1430행 |
| reopen-C-jsonl/100 | LP17/reopen/jsonl/1 reopen.remaining-media | PASS | 원출력 1432행 |

전수 대조: 개별 출력/정리 행 1137개. C++ summary가 존재한 각 phase의 `[pass]` 행 수와 summary.pass는 모두 일치한다.
원출력이 없는 미실행 assertion을 추가하지 않았고 실패한 실행 묶음의 일부 PASS를 전체 PASS로 승격하지 않았다.
