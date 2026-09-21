# LP28 PREP 개별 판정 전수

독자: 릴리즈 증적 검토자. lifecycle: LP28 고정 실행 이력에서 기계 추출한 개별 판정표. 현재 정책이나 실제 UI PASS가 아니다.
중앙 source-of-truth는 release-test-records이며 요약·한계는 lp28-locator-closure다. 큰 전수표를 요약 문서와 분리했다.

## feature-01

명령: `./server.sh verify-feature-implementation-evidence --json-report /private/tmp/media-server-lp28.K2YANY/prep-feature-report.json`. exit1, 633266ms. [전체 원출력](lp28-prep-feature-01.log).

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| MEDIA-003 verifierEvidence file is not tracked: scripts/internal/verify_whep_local_signaling.mjs | 위 명령·원출력 2행 | FAIL |
| negative fixture missing-id | 위 명령·원출력 3행 | PASS |
| negative fixture duplicate-id | 위 명령·원출력 4행 | PASS |
| negative fixture wrong-section-prefix | 위 명령·원출력 5행 | PASS |
| negative fixture missing-source-file | 위 명령·원출력 6행 | PASS |
| negative fixture missing-source-anchor | 위 명령·원출력 7행 | PASS |
| negative fixture missing-ui-control-anchor | 위 명령·원출력 8행 | PASS |
| negative fixture missing-ui-screen-route | 위 명령·원출력 9행 | PASS |
| negative fixture unknown-verifier-command | 위 명령·원출력 10행 | PASS |
| negative fixture missing-verifier-assertion | 위 명령·원출력 11행 | PASS |
| negative fixture legacy-longrun-command | 위 명령·원출력 12행 | PASS |
| negative fixture inventory-hash-drift | 위 명령·원출력 13행 | PASS |
| negative fixture missing-reviewed-call-chain | 위 명령·원출력 14행 | PASS |
| negative fixture bulk-review-reason | 위 명령·원출력 15행 | PASS |
| negative fixture safe-140-unrelated-owner | 위 명령·원출력 16행 | PASS |
| negative fixture rule-017-generic-json-owner | 위 명령·원출력 17행 | PASS |

## feature-02

명령: `./server.sh verify-feature-implementation-evidence --json-report /private/tmp/media-server-lp28.K2YANY/prep-feature-report-02.json`. exit0, 627113ms. [전체 원출력](lp28-prep-feature-02.log).

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| negative fixture missing-id | 위 명령·원출력 2행 | PASS |
| negative fixture duplicate-id | 위 명령·원출력 3행 | PASS |
| negative fixture wrong-section-prefix | 위 명령·원출력 4행 | PASS |
| negative fixture missing-source-file | 위 명령·원출력 5행 | PASS |
| negative fixture missing-source-anchor | 위 명령·원출력 6행 | PASS |
| negative fixture missing-ui-control-anchor | 위 명령·원출력 7행 | PASS |
| negative fixture missing-ui-screen-route | 위 명령·원출력 8행 | PASS |
| negative fixture unknown-verifier-command | 위 명령·원출력 9행 | PASS |
| negative fixture missing-verifier-assertion | 위 명령·원출력 10행 | PASS |
| negative fixture legacy-longrun-command | 위 명령·원출력 11행 | PASS |
| negative fixture inventory-hash-drift | 위 명령·원출력 12행 | PASS |
| negative fixture missing-reviewed-call-chain | 위 명령·원출력 13행 | PASS |
| negative fixture bulk-review-reason | 위 명령·원출력 14행 | PASS |
| negative fixture safe-140-unrelated-owner | 위 명령·원출력 15행 | PASS |
| negative fixture rule-017-generic-json-owner | 위 명령·원출력 16행 | PASS |

## inventory

명령: `./server.sh verify-project-inventory`. exit0, 42678ms. [전체 원출력](lp28-prep-inventory.log).

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| S05 개별 동작 등록 exact 연결 (실행 증거 아님) | 위 명령·원출력 2행 | PASS |
| public docs index excludes internal feature inventory | 위 명령·원출력 3행 | PASS |
| feature inventory pins current release scope | 위 명령·원출력 4행 | PASS |
| required sections exist | 위 명령·원출력 5행 | PASS |
| historical V280 source-of-truth keeps the 2.x runway boundary explicit | 위 명령·원출력 6행 | PASS |
| historical V290 source-of-truth keeps source, published, and roadmap distinct | 위 명령·원출력 7행 | PASS |
| inventory summary count 전체 기능 항목 986 | 위 명령·원출력 8행 | PASS |
| inventory summary count UI 직접 필요 400 | 위 명령·원출력 9행 | PASS |
| inventory summary count UI 간접 필요 36 | 위 명령·원출력 10행 | PASS |
| inventory summary count UI 비대상 550 | 위 명령·원출력 11행 | PASS |
| inventory summary count 테스트 필요 986 | 위 명령·원출력 12행 | PASS |
| inventory summary count 안정화 대상 976 | 위 명령·원출력 13행 | PASS |
| inventory summary count UI 풀테스트 대상 424 | 위 명령·원출력 14행 | PASS |
| inventory summary count 30분 soak 대상 50 | 위 명령·원출력 15행 | PASS |
| inventory summary count 120분 대상 7 | 위 명령·원출력 16행 | PASS |
| summary counts match current feature IDs | 위 명령·원출력 17행 | PASS |
| implementation evidence manifest matches all feature rows | 위 명령·원출력 18행 | PASS |
| feature UI-001 name present | 위 명령·원출력 19행 | PASS |
| feature UI-001 UI need 필요 | 위 명령·원출력 20행 | PASS |
| feature UI-001 test need 필요 | 위 명령·원출력 21행 | PASS |
| feature UI-001 test area assigned | 위 명령·원출력 22행 | PASS |
| feature UI-001 pass criteria present | 위 명령·원출력 23행 | PASS |
| feature UI-002 name present | 위 명령·원출력 24행 | PASS |
| feature UI-002 UI need 필요 | 위 명령·원출력 25행 | PASS |
| feature UI-002 test need 필요 | 위 명령·원출력 26행 | PASS |
| feature UI-002 test area assigned | 위 명령·원출력 27행 | PASS |
| feature UI-002 pass criteria present | 위 명령·원출력 28행 | PASS |
| feature UI-003 name present | 위 명령·원출력 29행 | PASS |
| feature UI-003 UI need 필요 | 위 명령·원출력 30행 | PASS |
| feature UI-003 test need 필요 | 위 명령·원출력 31행 | PASS |
| feature UI-003 test area assigned | 위 명령·원출력 32행 | PASS |
| feature UI-003 pass criteria present | 위 명령·원출력 33행 | PASS |
| feature UI-004 name present | 위 명령·원출력 34행 | PASS |
| feature UI-004 UI need 필요 | 위 명령·원출력 35행 | PASS |
| feature UI-004 test need 필요 | 위 명령·원출력 36행 | PASS |
| feature UI-004 test area assigned | 위 명령·원출력 37행 | PASS |
| feature UI-004 pass criteria present | 위 명령·원출력 38행 | PASS |
| feature UI-005 name present | 위 명령·원출력 39행 | PASS |
| feature UI-005 UI need 간접 | 위 명령·원출력 40행 | PASS |
| feature UI-005 test need 필요 | 위 명령·원출력 41행 | PASS |
| feature UI-005 test area assigned | 위 명령·원출력 42행 | PASS |
| feature UI-005 pass criteria present | 위 명령·원출력 43행 | PASS |
| feature UI-006 name present | 위 명령·원출력 44행 | PASS |
| feature UI-006 UI need 간접 | 위 명령·원출력 45행 | PASS |
| feature UI-006 test need 필요 | 위 명령·원출력 46행 | PASS |
| feature UI-006 test area assigned | 위 명령·원출력 47행 | PASS |
| feature UI-006 pass criteria present | 위 명령·원출력 48행 | PASS |
| feature UI-007 name present | 위 명령·원출력 49행 | PASS |
| feature UI-007 UI need 필요 | 위 명령·원출력 50행 | PASS |
| feature UI-007 test need 필요 | 위 명령·원출력 51행 | PASS |
| feature UI-007 test area assigned | 위 명령·원출력 52행 | PASS |
| feature UI-007 pass criteria present | 위 명령·원출력 53행 | PASS |
| feature UI-008 name present | 위 명령·원출력 54행 | PASS |
| feature UI-008 UI need 필요 | 위 명령·원출력 55행 | PASS |
| feature UI-008 test need 필요 | 위 명령·원출력 56행 | PASS |
| feature UI-008 test area assigned | 위 명령·원출력 57행 | PASS |
| feature UI-008 pass criteria present | 위 명령·원출력 58행 | PASS |
| feature UI-009 name present | 위 명령·원출력 59행 | PASS |
| feature UI-009 UI need 필요 | 위 명령·원출력 60행 | PASS |
| feature UI-009 test need 필요 | 위 명령·원출력 61행 | PASS |
| feature UI-009 test area assigned | 위 명령·원출력 62행 | PASS |
| feature UI-009 pass criteria present | 위 명령·원출력 63행 | PASS |
| feature UI-010 name present | 위 명령·원출력 64행 | PASS |
| feature UI-010 UI need 필요 | 위 명령·원출력 65행 | PASS |
| feature UI-010 test need 필요 | 위 명령·원출력 66행 | PASS |
| feature UI-010 test area assigned | 위 명령·원출력 67행 | PASS |
| feature UI-010 pass criteria present | 위 명령·원출력 68행 | PASS |
| feature UI-011 name present | 위 명령·원출력 69행 | PASS |
| feature UI-011 UI need 필요 | 위 명령·원출력 70행 | PASS |
| feature UI-011 test need 필요 | 위 명령·원출력 71행 | PASS |
| feature UI-011 test area assigned | 위 명령·원출력 72행 | PASS |
| feature UI-011 pass criteria present | 위 명령·원출력 73행 | PASS |
| feature UI-012 name present | 위 명령·원출력 74행 | PASS |
| feature UI-012 UI need 필요 | 위 명령·원출력 75행 | PASS |
| feature UI-012 test need 필요 | 위 명령·원출력 76행 | PASS |
| feature UI-012 test area assigned | 위 명령·원출력 77행 | PASS |
| feature UI-012 pass criteria present | 위 명령·원출력 78행 | PASS |
| feature UI-013 name present | 위 명령·원출력 79행 | PASS |
| feature UI-013 UI need 필요 | 위 명령·원출력 80행 | PASS |
| feature UI-013 test need 필요 | 위 명령·원출력 81행 | PASS |
| feature UI-013 test area assigned | 위 명령·원출력 82행 | PASS |
| feature UI-013 pass criteria present | 위 명령·원출력 83행 | PASS |
| feature UI-014 name present | 위 명령·원출력 84행 | PASS |
| feature UI-014 UI need 필요 | 위 명령·원출력 85행 | PASS |
| feature UI-014 test need 필요 | 위 명령·원출력 86행 | PASS |
| feature UI-014 test area assigned | 위 명령·원출력 87행 | PASS |
| feature UI-014 pass criteria present | 위 명령·원출력 88행 | PASS |
| feature UI-015 name present | 위 명령·원출력 89행 | PASS |
| feature UI-015 UI need 필요 | 위 명령·원출력 90행 | PASS |
| feature UI-015 test need 필요 | 위 명령·원출력 91행 | PASS |
| feature UI-015 test area assigned | 위 명령·원출력 92행 | PASS |
| feature UI-015 pass criteria present | 위 명령·원출력 93행 | PASS |
| feature UI-016 name present | 위 명령·원출력 94행 | PASS |
| feature UI-016 UI need 필요 | 위 명령·원출력 95행 | PASS |
| feature UI-016 test need 필요 | 위 명령·원출력 96행 | PASS |
| feature UI-016 test area assigned | 위 명령·원출력 97행 | PASS |
| feature UI-016 pass criteria present | 위 명령·원출력 98행 | PASS |
| feature UI-017 name present | 위 명령·원출력 99행 | PASS |
| feature UI-017 UI need 필요 | 위 명령·원출력 100행 | PASS |
| feature UI-017 test need 필요 | 위 명령·원출력 101행 | PASS |
| feature UI-017 test area assigned | 위 명령·원출력 102행 | PASS |
| feature UI-017 pass criteria present | 위 명령·원출력 103행 | PASS |
| feature UI-018 name present | 위 명령·원출력 104행 | PASS |
| feature UI-018 UI need 비대상 | 위 명령·원출력 105행 | PASS |
| feature UI-018 test need 필요 | 위 명령·원출력 106행 | PASS |
| feature UI-018 test area assigned | 위 명령·원출력 107행 | PASS |
| feature UI-018 pass criteria present | 위 명령·원출력 108행 | PASS |
| feature UI-019 name present | 위 명령·원출력 109행 | PASS |
| feature UI-019 UI need 필요 | 위 명령·원출력 110행 | PASS |
| feature UI-019 test need 필요 | 위 명령·원출력 111행 | PASS |
| feature UI-019 test area assigned | 위 명령·원출력 112행 | PASS |
| feature UI-019 pass criteria present | 위 명령·원출력 113행 | PASS |
| feature UI-020 name present | 위 명령·원출력 114행 | PASS |
| feature UI-020 UI need 필요 | 위 명령·원출력 115행 | PASS |
| feature UI-020 test need 필요 | 위 명령·원출력 116행 | PASS |
| feature UI-020 test area assigned | 위 명령·원출력 117행 | PASS |
| feature UI-020 pass criteria present | 위 명령·원출력 118행 | PASS |
| feature UI-021 name present | 위 명령·원출력 119행 | PASS |
| feature UI-021 UI need 필요 | 위 명령·원출력 120행 | PASS |
| feature UI-021 test need 필요 | 위 명령·원출력 121행 | PASS |
| feature UI-021 test area assigned | 위 명령·원출력 122행 | PASS |
| feature UI-021 pass criteria present | 위 명령·원출력 123행 | PASS |
| feature UI-022 name present | 위 명령·원출력 124행 | PASS |
| feature UI-022 UI need 필요 | 위 명령·원출력 125행 | PASS |
| feature UI-022 test need 필요 | 위 명령·원출력 126행 | PASS |
| feature UI-022 test area assigned | 위 명령·원출력 127행 | PASS |
| feature UI-022 pass criteria present | 위 명령·원출력 128행 | PASS |
| feature UI-023 name present | 위 명령·원출력 129행 | PASS |
| feature UI-023 UI need 필요 | 위 명령·원출력 130행 | PASS |
| feature UI-023 test need 필요 | 위 명령·원출력 131행 | PASS |
| feature UI-023 test area assigned | 위 명령·원출력 132행 | PASS |
| feature UI-023 pass criteria present | 위 명령·원출력 133행 | PASS |
| feature UI-024 name present | 위 명령·원출력 134행 | PASS |
| feature UI-024 UI need 필요 | 위 명령·원출력 135행 | PASS |
| feature UI-024 test need 필요 | 위 명령·원출력 136행 | PASS |
| feature UI-024 test area assigned | 위 명령·원출력 137행 | PASS |
| feature UI-024 pass criteria present | 위 명령·원출력 138행 | PASS |
| feature UI-025 name present | 위 명령·원출력 139행 | PASS |
| feature UI-025 UI need 필요 | 위 명령·원출력 140행 | PASS |
| feature UI-025 test need 필요 | 위 명령·원출력 141행 | PASS |
| feature UI-025 test area assigned | 위 명령·원출력 142행 | PASS |
| feature UI-025 pass criteria present | 위 명령·원출력 143행 | PASS |
| feature UI-026 name present | 위 명령·원출력 144행 | PASS |
| feature UI-026 UI need 필요 | 위 명령·원출력 145행 | PASS |
| feature UI-026 test need 필요 | 위 명령·원출력 146행 | PASS |
| feature UI-026 test area assigned | 위 명령·원출력 147행 | PASS |
| feature UI-026 pass criteria present | 위 명령·원출력 148행 | PASS |
| feature UI-027 name present | 위 명령·원출력 149행 | PASS |
| feature UI-027 UI need 필요 | 위 명령·원출력 150행 | PASS |
| feature UI-027 test need 필요 | 위 명령·원출력 151행 | PASS |
| feature UI-027 test area assigned | 위 명령·원출력 152행 | PASS |
| feature UI-027 pass criteria present | 위 명령·원출력 153행 | PASS |
| feature UI-028 name present | 위 명령·원출력 154행 | PASS |
| feature UI-028 UI need 필요 | 위 명령·원출력 155행 | PASS |
| feature UI-028 test need 필요 | 위 명령·원출력 156행 | PASS |
| feature UI-028 test area assigned | 위 명령·원출력 157행 | PASS |
| feature UI-028 pass criteria present | 위 명령·원출력 158행 | PASS |
| feature UI-029 name present | 위 명령·원출력 159행 | PASS |
| feature UI-029 UI need 필요 | 위 명령·원출력 160행 | PASS |
| feature UI-029 test need 필요 | 위 명령·원출력 161행 | PASS |
| feature UI-029 test area assigned | 위 명령·원출력 162행 | PASS |
| feature UI-029 pass criteria present | 위 명령·원출력 163행 | PASS |
| feature UI-030 name present | 위 명령·원출력 164행 | PASS |
| feature UI-030 UI need 필요 | 위 명령·원출력 165행 | PASS |
| feature UI-030 test need 필요 | 위 명령·원출력 166행 | PASS |
| feature UI-030 test area assigned | 위 명령·원출력 167행 | PASS |
| feature UI-030 pass criteria present | 위 명령·원출력 168행 | PASS |
| feature UI-031 name present | 위 명령·원출력 169행 | PASS |
| feature UI-031 UI need 필요 | 위 명령·원출력 170행 | PASS |
| feature UI-031 test need 필요 | 위 명령·원출력 171행 | PASS |
| feature UI-031 test area assigned | 위 명령·원출력 172행 | PASS |
| feature UI-031 pass criteria present | 위 명령·원출력 173행 | PASS |
| feature UI-032 name present | 위 명령·원출력 174행 | PASS |
| feature UI-032 UI need 필요 | 위 명령·원출력 175행 | PASS |
| feature UI-032 test need 필요 | 위 명령·원출력 176행 | PASS |
| feature UI-032 test area assigned | 위 명령·원출력 177행 | PASS |
| feature UI-032 pass criteria present | 위 명령·원출력 178행 | PASS |
| feature UI-033 name present | 위 명령·원출력 179행 | PASS |
| feature UI-033 UI need 필요 | 위 명령·원출력 180행 | PASS |
| feature UI-033 test need 필요 | 위 명령·원출력 181행 | PASS |
| feature UI-033 test area assigned | 위 명령·원출력 182행 | PASS |
| feature UI-033 pass criteria present | 위 명령·원출력 183행 | PASS |
| feature UI-034 name present | 위 명령·원출력 184행 | PASS |
| feature UI-034 UI need 필요 | 위 명령·원출력 185행 | PASS |
| feature UI-034 test need 필요 | 위 명령·원출력 186행 | PASS |
| feature UI-034 test area assigned | 위 명령·원출력 187행 | PASS |
| feature UI-034 pass criteria present | 위 명령·원출력 188행 | PASS |
| feature UI-035 name present | 위 명령·원출력 189행 | PASS |
| feature UI-035 UI need 필요 | 위 명령·원출력 190행 | PASS |
| feature UI-035 test need 필요 | 위 명령·원출력 191행 | PASS |
| feature UI-035 test area assigned | 위 명령·원출력 192행 | PASS |
| feature UI-035 pass criteria present | 위 명령·원출력 193행 | PASS |
| feature UI-036 name present | 위 명령·원출력 194행 | PASS |
| feature UI-036 UI need 필요 | 위 명령·원출력 195행 | PASS |
| feature UI-036 test need 필요 | 위 명령·원출력 196행 | PASS |
| feature UI-036 test area assigned | 위 명령·원출력 197행 | PASS |
| feature UI-036 pass criteria present | 위 명령·원출력 198행 | PASS |
| feature UI-037 name present | 위 명령·원출력 199행 | PASS |
| feature UI-037 UI need 필요 | 위 명령·원출력 200행 | PASS |
| feature UI-037 test need 필요 | 위 명령·원출력 201행 | PASS |
| feature UI-037 test area assigned | 위 명령·원출력 202행 | PASS |
| feature UI-037 pass criteria present | 위 명령·원출력 203행 | PASS |
| feature UI-038 name present | 위 명령·원출력 204행 | PASS |
| feature UI-038 UI need 필요 | 위 명령·원출력 205행 | PASS |
| feature UI-038 test need 필요 | 위 명령·원출력 206행 | PASS |
| feature UI-038 test area assigned | 위 명령·원출력 207행 | PASS |
| feature UI-038 pass criteria present | 위 명령·원출력 208행 | PASS |
| feature UI-039 name present | 위 명령·원출력 209행 | PASS |
| feature UI-039 UI need 필요 | 위 명령·원출력 210행 | PASS |
| feature UI-039 test need 필요 | 위 명령·원출력 211행 | PASS |
| feature UI-039 test area assigned | 위 명령·원출력 212행 | PASS |
| feature UI-039 pass criteria present | 위 명령·원출력 213행 | PASS |
| feature UI-040 name present | 위 명령·원출력 214행 | PASS |
| feature UI-040 UI need 필요 | 위 명령·원출력 215행 | PASS |
| feature UI-040 test need 필요 | 위 명령·원출력 216행 | PASS |
| feature UI-040 test area assigned | 위 명령·원출력 217행 | PASS |
| feature UI-040 pass criteria present | 위 명령·원출력 218행 | PASS |
| feature UI-041 name present | 위 명령·원출력 219행 | PASS |
| feature UI-041 UI need 필요 | 위 명령·원출력 220행 | PASS |
| feature UI-041 test need 필요 | 위 명령·원출력 221행 | PASS |
| feature UI-041 test area assigned | 위 명령·원출력 222행 | PASS |
| feature UI-041 pass criteria present | 위 명령·원출력 223행 | PASS |
| feature UI-042 name present | 위 명령·원출력 224행 | PASS |
| feature UI-042 UI need 필요 | 위 명령·원출력 225행 | PASS |
| feature UI-042 test need 필요 | 위 명령·원출력 226행 | PASS |
| feature UI-042 test area assigned | 위 명령·원출력 227행 | PASS |
| feature UI-042 pass criteria present | 위 명령·원출력 228행 | PASS |
| feature UI-043 name present | 위 명령·원출력 229행 | PASS |
| feature UI-043 UI need 필요 | 위 명령·원출력 230행 | PASS |
| feature UI-043 test need 필요 | 위 명령·원출력 231행 | PASS |
| feature UI-043 test area assigned | 위 명령·원출력 232행 | PASS |
| feature UI-043 pass criteria present | 위 명령·원출력 233행 | PASS |
| feature UI-044 name present | 위 명령·원출력 234행 | PASS |
| feature UI-044 UI need 필요 | 위 명령·원출력 235행 | PASS |
| feature UI-044 test need 필요 | 위 명령·원출력 236행 | PASS |
| feature UI-044 test area assigned | 위 명령·원출력 237행 | PASS |
| feature UI-044 pass criteria present | 위 명령·원출력 238행 | PASS |
| feature UI-045 name present | 위 명령·원출력 239행 | PASS |
| feature UI-045 UI need 필요 | 위 명령·원출력 240행 | PASS |
| feature UI-045 test need 필요 | 위 명령·원출력 241행 | PASS |
| feature UI-045 test area assigned | 위 명령·원출력 242행 | PASS |
| feature UI-045 pass criteria present | 위 명령·원출력 243행 | PASS |
| feature UI-046 name present | 위 명령·원출력 244행 | PASS |
| feature UI-046 UI need 필요 | 위 명령·원출력 245행 | PASS |
| feature UI-046 test need 필요 | 위 명령·원출력 246행 | PASS |
| feature UI-046 test area assigned | 위 명령·원출력 247행 | PASS |
| feature UI-046 pass criteria present | 위 명령·원출력 248행 | PASS |
| feature UI-047 name present | 위 명령·원출력 249행 | PASS |
| feature UI-047 UI need 필요 | 위 명령·원출력 250행 | PASS |
| feature UI-047 test need 필요 | 위 명령·원출력 251행 | PASS |
| feature UI-047 test area assigned | 위 명령·원출력 252행 | PASS |
| feature UI-047 pass criteria present | 위 명령·원출력 253행 | PASS |
| feature UI-048 name present | 위 명령·원출력 254행 | PASS |
| feature UI-048 UI need 필요 | 위 명령·원출력 255행 | PASS |
| feature UI-048 test need 필요 | 위 명령·원출력 256행 | PASS |
| feature UI-048 test area assigned | 위 명령·원출력 257행 | PASS |
| feature UI-048 pass criteria present | 위 명령·원출력 258행 | PASS |
| feature UI-049 name present | 위 명령·원출력 259행 | PASS |
| feature UI-049 UI need 필요 | 위 명령·원출력 260행 | PASS |
| feature UI-049 test need 필요 | 위 명령·원출력 261행 | PASS |
| feature UI-049 test area assigned | 위 명령·원출력 262행 | PASS |
| feature UI-049 pass criteria present | 위 명령·원출력 263행 | PASS |
| feature UI-050 name present | 위 명령·원출력 264행 | PASS |
| feature UI-050 UI need 필요 | 위 명령·원출력 265행 | PASS |
| feature UI-050 test need 필요 | 위 명령·원출력 266행 | PASS |
| feature UI-050 test area assigned | 위 명령·원출력 267행 | PASS |
| feature UI-050 pass criteria present | 위 명령·원출력 268행 | PASS |
| feature UI-051 name present | 위 명령·원출력 269행 | PASS |
| feature UI-051 UI need 필요 | 위 명령·원출력 270행 | PASS |
| feature UI-051 test need 필요 | 위 명령·원출력 271행 | PASS |
| feature UI-051 test area assigned | 위 명령·원출력 272행 | PASS |
| feature UI-051 pass criteria present | 위 명령·원출력 273행 | PASS |
| feature UI-052 name present | 위 명령·원출력 274행 | PASS |
| feature UI-052 UI need 필요 | 위 명령·원출력 275행 | PASS |
| feature UI-052 test need 필요 | 위 명령·원출력 276행 | PASS |
| feature UI-052 test area assigned | 위 명령·원출력 277행 | PASS |
| feature UI-052 pass criteria present | 위 명령·원출력 278행 | PASS |
| feature UI-053 name present | 위 명령·원출력 279행 | PASS |
| feature UI-053 UI need 필요 | 위 명령·원출력 280행 | PASS |
| feature UI-053 test need 필요 | 위 명령·원출력 281행 | PASS |
| feature UI-053 test area assigned | 위 명령·원출력 282행 | PASS |
| feature UI-053 pass criteria present | 위 명령·원출력 283행 | PASS |
| feature UI-054 name present | 위 명령·원출력 284행 | PASS |
| feature UI-054 UI need 필요 | 위 명령·원출력 285행 | PASS |
| feature UI-054 test need 필요 | 위 명령·원출력 286행 | PASS |
| feature UI-054 test area assigned | 위 명령·원출력 287행 | PASS |
| feature UI-054 pass criteria present | 위 명령·원출력 288행 | PASS |
| feature UI-055 name present | 위 명령·원출력 289행 | PASS |
| feature UI-055 UI need 필요 | 위 명령·원출력 290행 | PASS |
| feature UI-055 test need 필요 | 위 명령·원출력 291행 | PASS |
| feature UI-055 test area assigned | 위 명령·원출력 292행 | PASS |
| feature UI-055 pass criteria present | 위 명령·원출력 293행 | PASS |
| feature UI-056 name present | 위 명령·원출력 294행 | PASS |
| feature UI-056 UI need 필요 | 위 명령·원출력 295행 | PASS |
| feature UI-056 test need 필요 | 위 명령·원출력 296행 | PASS |
| feature UI-056 test area assigned | 위 명령·원출력 297행 | PASS |
| feature UI-056 pass criteria present | 위 명령·원출력 298행 | PASS |
| feature UI-057 name present | 위 명령·원출력 299행 | PASS |
| feature UI-057 UI need 필요 | 위 명령·원출력 300행 | PASS |
| feature UI-057 test need 필요 | 위 명령·원출력 301행 | PASS |
| feature UI-057 test area assigned | 위 명령·원출력 302행 | PASS |
| feature UI-057 pass criteria present | 위 명령·원출력 303행 | PASS |
| feature UI-058 name present | 위 명령·원출력 304행 | PASS |
| feature UI-058 UI need 필요 | 위 명령·원출력 305행 | PASS |
| feature UI-058 test need 필요 | 위 명령·원출력 306행 | PASS |
| feature UI-058 test area assigned | 위 명령·원출력 307행 | PASS |
| feature UI-058 pass criteria present | 위 명령·원출력 308행 | PASS |
| feature UI-059 name present | 위 명령·원출력 309행 | PASS |
| feature UI-059 UI need 필요 | 위 명령·원출력 310행 | PASS |
| feature UI-059 test need 필요 | 위 명령·원출력 311행 | PASS |
| feature UI-059 test area assigned | 위 명령·원출력 312행 | PASS |
| feature UI-059 pass criteria present | 위 명령·원출력 313행 | PASS |
| feature UI-060 name present | 위 명령·원출력 314행 | PASS |
| feature UI-060 UI need 필요 | 위 명령·원출력 315행 | PASS |
| feature UI-060 test need 필요 | 위 명령·원출력 316행 | PASS |
| feature UI-060 test area assigned | 위 명령·원출력 317행 | PASS |
| feature UI-060 pass criteria present | 위 명령·원출력 318행 | PASS |
| feature UI-061 name present | 위 명령·원출력 319행 | PASS |
| feature UI-061 UI need 필요 | 위 명령·원출력 320행 | PASS |
| feature UI-061 test need 필요 | 위 명령·원출력 321행 | PASS |
| feature UI-061 test area assigned | 위 명령·원출력 322행 | PASS |
| feature UI-061 pass criteria present | 위 명령·원출력 323행 | PASS |
| feature UI-062 name present | 위 명령·원출력 324행 | PASS |
| feature UI-062 UI need 필요 | 위 명령·원출력 325행 | PASS |
| feature UI-062 test need 필요 | 위 명령·원출력 326행 | PASS |
| feature UI-062 test area assigned | 위 명령·원출력 327행 | PASS |
| feature UI-062 pass criteria present | 위 명령·원출력 328행 | PASS |
| feature UI-063 name present | 위 명령·원출력 329행 | PASS |
| feature UI-063 UI need 필요 | 위 명령·원출력 330행 | PASS |
| feature UI-063 test need 필요 | 위 명령·원출력 331행 | PASS |
| feature UI-063 test area assigned | 위 명령·원출력 332행 | PASS |
| feature UI-063 pass criteria present | 위 명령·원출력 333행 | PASS |
| feature UI-064 name present | 위 명령·원출력 334행 | PASS |
| feature UI-064 UI need 필요 | 위 명령·원출력 335행 | PASS |
| feature UI-064 test need 필요 | 위 명령·원출력 336행 | PASS |
| feature UI-064 test area assigned | 위 명령·원출력 337행 | PASS |
| feature UI-064 pass criteria present | 위 명령·원출력 338행 | PASS |
| feature UI-065 name present | 위 명령·원출력 339행 | PASS |
| feature UI-065 UI need 필요 | 위 명령·원출력 340행 | PASS |
| feature UI-065 test need 필요 | 위 명령·원출력 341행 | PASS |
| feature UI-065 test area assigned | 위 명령·원출력 342행 | PASS |
| feature UI-065 pass criteria present | 위 명령·원출력 343행 | PASS |
| feature UI-066 name present | 위 명령·원출력 344행 | PASS |
| feature UI-066 UI need 필요 | 위 명령·원출력 345행 | PASS |
| feature UI-066 test need 필요 | 위 명령·원출력 346행 | PASS |
| feature UI-066 test area assigned | 위 명령·원출력 347행 | PASS |
| feature UI-066 pass criteria present | 위 명령·원출력 348행 | PASS |
| feature UI-067 name present | 위 명령·원출력 349행 | PASS |
| feature UI-067 UI need 필요 | 위 명령·원출력 350행 | PASS |
| feature UI-067 test need 필요 | 위 명령·원출력 351행 | PASS |
| feature UI-067 test area assigned | 위 명령·원출력 352행 | PASS |
| feature UI-067 pass criteria present | 위 명령·원출력 353행 | PASS |
| feature UI-068 name present | 위 명령·원출력 354행 | PASS |
| feature UI-068 UI need 필요 | 위 명령·원출력 355행 | PASS |
| feature UI-068 test need 필요 | 위 명령·원출력 356행 | PASS |
| feature UI-068 test area assigned | 위 명령·원출력 357행 | PASS |
| feature UI-068 pass criteria present | 위 명령·원출력 358행 | PASS |
| feature UI-069 name present | 위 명령·원출력 359행 | PASS |
| feature UI-069 UI need 필요 | 위 명령·원출력 360행 | PASS |
| feature UI-069 test need 필요 | 위 명령·원출력 361행 | PASS |
| feature UI-069 test area assigned | 위 명령·원출력 362행 | PASS |
| feature UI-069 pass criteria present | 위 명령·원출력 363행 | PASS |
| feature UI-070 name present | 위 명령·원출력 364행 | PASS |
| feature UI-070 UI need 필요 | 위 명령·원출력 365행 | PASS |
| feature UI-070 test need 필요 | 위 명령·원출력 366행 | PASS |
| feature UI-070 test area assigned | 위 명령·원출력 367행 | PASS |
| feature UI-070 pass criteria present | 위 명령·원출력 368행 | PASS |
| feature UI-071 name present | 위 명령·원출력 369행 | PASS |
| feature UI-071 UI need 필요 | 위 명령·원출력 370행 | PASS |
| feature UI-071 test need 필요 | 위 명령·원출력 371행 | PASS |
| feature UI-071 test area assigned | 위 명령·원출력 372행 | PASS |
| feature UI-071 pass criteria present | 위 명령·원출력 373행 | PASS |
| feature UI-072 name present | 위 명령·원출력 374행 | PASS |
| feature UI-072 UI need 필요 | 위 명령·원출력 375행 | PASS |
| feature UI-072 test need 필요 | 위 명령·원출력 376행 | PASS |
| feature UI-072 test area assigned | 위 명령·원출력 377행 | PASS |
| feature UI-072 pass criteria present | 위 명령·원출력 378행 | PASS |
| feature UI-073 name present | 위 명령·원출력 379행 | PASS |
| feature UI-073 UI need 필요 | 위 명령·원출력 380행 | PASS |
| feature UI-073 test need 필요 | 위 명령·원출력 381행 | PASS |
| feature UI-073 test area assigned | 위 명령·원출력 382행 | PASS |
| feature UI-073 pass criteria present | 위 명령·원출력 383행 | PASS |
| feature UI-074 name present | 위 명령·원출력 384행 | PASS |
| feature UI-074 UI need 필요 | 위 명령·원출력 385행 | PASS |
| feature UI-074 test need 필요 | 위 명령·원출력 386행 | PASS |
| feature UI-074 test area assigned | 위 명령·원출력 387행 | PASS |
| feature UI-074 pass criteria present | 위 명령·원출력 388행 | PASS |
| feature UI-075 name present | 위 명령·원출력 389행 | PASS |
| feature UI-075 UI need 필요 | 위 명령·원출력 390행 | PASS |
| feature UI-075 test need 필요 | 위 명령·원출력 391행 | PASS |
| feature UI-075 test area assigned | 위 명령·원출력 392행 | PASS |
| feature UI-075 pass criteria present | 위 명령·원출력 393행 | PASS |
| feature UI-076 name present | 위 명령·원출력 394행 | PASS |
| feature UI-076 UI need 필요 | 위 명령·원출력 395행 | PASS |
| feature UI-076 test need 필요 | 위 명령·원출력 396행 | PASS |
| feature UI-076 test area assigned | 위 명령·원출력 397행 | PASS |
| feature UI-076 pass criteria present | 위 명령·원출력 398행 | PASS |
| feature UI-077 name present | 위 명령·원출력 399행 | PASS |
| feature UI-077 UI need 필요 | 위 명령·원출력 400행 | PASS |
| feature UI-077 test need 필요 | 위 명령·원출력 401행 | PASS |
| feature UI-077 test area assigned | 위 명령·원출력 402행 | PASS |
| feature UI-077 pass criteria present | 위 명령·원출력 403행 | PASS |
| feature UI-078 name present | 위 명령·원출력 404행 | PASS |
| feature UI-078 UI need 필요 | 위 명령·원출력 405행 | PASS |
| feature UI-078 test need 필요 | 위 명령·원출력 406행 | PASS |
| feature UI-078 test area assigned | 위 명령·원출력 407행 | PASS |
| feature UI-078 pass criteria present | 위 명령·원출력 408행 | PASS |
| feature UI-079 name present | 위 명령·원출력 409행 | PASS |
| feature UI-079 UI need 필요 | 위 명령·원출력 410행 | PASS |
| feature UI-079 test need 필요 | 위 명령·원출력 411행 | PASS |
| feature UI-079 test area assigned | 위 명령·원출력 412행 | PASS |
| feature UI-079 pass criteria present | 위 명령·원출력 413행 | PASS |
| feature UI-080 name present | 위 명령·원출력 414행 | PASS |
| feature UI-080 UI need 필요 | 위 명령·원출력 415행 | PASS |
| feature UI-080 test need 필요 | 위 명령·원출력 416행 | PASS |
| feature UI-080 test area assigned | 위 명령·원출력 417행 | PASS |
| feature UI-080 pass criteria present | 위 명령·원출력 418행 | PASS |
| feature UI-081 name present | 위 명령·원출력 419행 | PASS |
| feature UI-081 UI need 필요 | 위 명령·원출력 420행 | PASS |
| feature UI-081 test need 필요 | 위 명령·원출력 421행 | PASS |
| feature UI-081 test area assigned | 위 명령·원출력 422행 | PASS |
| feature UI-081 pass criteria present | 위 명령·원출력 423행 | PASS |
| feature UI-082 name present | 위 명령·원출력 424행 | PASS |
| feature UI-082 UI need 필요 | 위 명령·원출력 425행 | PASS |
| feature UI-082 test need 필요 | 위 명령·원출력 426행 | PASS |
| feature UI-082 test area assigned | 위 명령·원출력 427행 | PASS |
| feature UI-082 pass criteria present | 위 명령·원출력 428행 | PASS |
| feature UI-083 name present | 위 명령·원출력 429행 | PASS |
| feature UI-083 UI need 필요 | 위 명령·원출력 430행 | PASS |
| feature UI-083 test need 필요 | 위 명령·원출력 431행 | PASS |
| feature UI-083 test area assigned | 위 명령·원출력 432행 | PASS |
| feature UI-083 pass criteria present | 위 명령·원출력 433행 | PASS |
| feature UI-084 name present | 위 명령·원출력 434행 | PASS |
| feature UI-084 UI need 필요 | 위 명령·원출력 435행 | PASS |
| feature UI-084 test need 필요 | 위 명령·원출력 436행 | PASS |
| feature UI-084 test area assigned | 위 명령·원출력 437행 | PASS |
| feature UI-084 pass criteria present | 위 명령·원출력 438행 | PASS |
| feature UI-085 name present | 위 명령·원출력 439행 | PASS |
| feature UI-085 UI need 필요 | 위 명령·원출력 440행 | PASS |
| feature UI-085 test need 필요 | 위 명령·원출력 441행 | PASS |
| feature UI-085 test area assigned | 위 명령·원출력 442행 | PASS |
| feature UI-085 pass criteria present | 위 명령·원출력 443행 | PASS |
| feature UI-086 name present | 위 명령·원출력 444행 | PASS |
| feature UI-086 UI need 필요 | 위 명령·원출력 445행 | PASS |
| feature UI-086 test need 필요 | 위 명령·원출력 446행 | PASS |
| feature UI-086 test area assigned | 위 명령·원출력 447행 | PASS |
| feature UI-086 pass criteria present | 위 명령·원출력 448행 | PASS |
| feature UI-087 name present | 위 명령·원출력 449행 | PASS |
| feature UI-087 UI need 필요 | 위 명령·원출력 450행 | PASS |
| feature UI-087 test need 필요 | 위 명령·원출력 451행 | PASS |
| feature UI-087 test area assigned | 위 명령·원출력 452행 | PASS |
| feature UI-087 pass criteria present | 위 명령·원출력 453행 | PASS |
| feature UI-088 name present | 위 명령·원출력 454행 | PASS |
| feature UI-088 UI need 필요 | 위 명령·원출력 455행 | PASS |
| feature UI-088 test need 필요 | 위 명령·원출력 456행 | PASS |
| feature UI-088 test area assigned | 위 명령·원출력 457행 | PASS |
| feature UI-088 pass criteria present | 위 명령·원출력 458행 | PASS |
| feature UI-089 name present | 위 명령·원출력 459행 | PASS |
| feature UI-089 UI need 필요 | 위 명령·원출력 460행 | PASS |
| feature UI-089 test need 필요 | 위 명령·원출력 461행 | PASS |
| feature UI-089 test area assigned | 위 명령·원출력 462행 | PASS |
| feature UI-089 pass criteria present | 위 명령·원출력 463행 | PASS |
| feature UI-090 name present | 위 명령·원출력 464행 | PASS |
| feature UI-090 UI need 필요 | 위 명령·원출력 465행 | PASS |
| feature UI-090 test need 필요 | 위 명령·원출력 466행 | PASS |
| feature UI-090 test area assigned | 위 명령·원출력 467행 | PASS |
| feature UI-090 pass criteria present | 위 명령·원출력 468행 | PASS |
| feature UI-091 name present | 위 명령·원출력 469행 | PASS |
| feature UI-091 UI need 필요 | 위 명령·원출력 470행 | PASS |
| feature UI-091 test need 필요 | 위 명령·원출력 471행 | PASS |
| feature UI-091 test area assigned | 위 명령·원출력 472행 | PASS |
| feature UI-091 pass criteria present | 위 명령·원출력 473행 | PASS |
| feature UI-092 name present | 위 명령·원출력 474행 | PASS |
| feature UI-092 UI need 필요 | 위 명령·원출력 475행 | PASS |
| feature UI-092 test need 필요 | 위 명령·원출력 476행 | PASS |
| feature UI-092 test area assigned | 위 명령·원출력 477행 | PASS |
| feature UI-092 pass criteria present | 위 명령·원출력 478행 | PASS |
| feature UI-093 name present | 위 명령·원출력 479행 | PASS |
| feature UI-093 UI need 필요 | 위 명령·원출력 480행 | PASS |
| feature UI-093 test need 필요 | 위 명령·원출력 481행 | PASS |
| feature UI-093 test area assigned | 위 명령·원출력 482행 | PASS |
| feature UI-093 pass criteria present | 위 명령·원출력 483행 | PASS |
| feature UI-094 name present | 위 명령·원출력 484행 | PASS |
| feature UI-094 UI need 필요 | 위 명령·원출력 485행 | PASS |
| feature UI-094 test need 필요 | 위 명령·원출력 486행 | PASS |
| feature UI-094 test area assigned | 위 명령·원출력 487행 | PASS |
| feature UI-094 pass criteria present | 위 명령·원출력 488행 | PASS |
| feature UI-095 name present | 위 명령·원출력 489행 | PASS |
| feature UI-095 UI need 필요 | 위 명령·원출력 490행 | PASS |
| feature UI-095 test need 필요 | 위 명령·원출력 491행 | PASS |
| feature UI-095 test area assigned | 위 명령·원출력 492행 | PASS |
| feature UI-095 pass criteria present | 위 명령·원출력 493행 | PASS |
| feature UI-096 name present | 위 명령·원출력 494행 | PASS |
| feature UI-096 UI need 필요 | 위 명령·원출력 495행 | PASS |
| feature UI-096 test need 필요 | 위 명령·원출력 496행 | PASS |
| feature UI-096 test area assigned | 위 명령·원출력 497행 | PASS |
| feature UI-096 pass criteria present | 위 명령·원출력 498행 | PASS |
| feature UI-097 name present | 위 명령·원출력 499행 | PASS |
| feature UI-097 UI need 필요 | 위 명령·원출력 500행 | PASS |
| feature UI-097 test need 필요 | 위 명령·원출력 501행 | PASS |
| feature UI-097 test area assigned | 위 명령·원출력 502행 | PASS |
| feature UI-097 pass criteria present | 위 명령·원출력 503행 | PASS |
| feature UI-098 name present | 위 명령·원출력 504행 | PASS |
| feature UI-098 UI need 필요 | 위 명령·원출력 505행 | PASS |
| feature UI-098 test need 필요 | 위 명령·원출력 506행 | PASS |
| feature UI-098 test area assigned | 위 명령·원출력 507행 | PASS |
| feature UI-098 pass criteria present | 위 명령·원출력 508행 | PASS |
| feature UI-099 name present | 위 명령·원출력 509행 | PASS |
| feature UI-099 UI need 필요 | 위 명령·원출력 510행 | PASS |
| feature UI-099 test need 필요 | 위 명령·원출력 511행 | PASS |
| feature UI-099 test area assigned | 위 명령·원출력 512행 | PASS |
| feature UI-099 pass criteria present | 위 명령·원출력 513행 | PASS |
| feature UI-100 name present | 위 명령·원출력 514행 | PASS |
| feature UI-100 UI need 필요 | 위 명령·원출력 515행 | PASS |
| feature UI-100 test need 필요 | 위 명령·원출력 516행 | PASS |
| feature UI-100 test area assigned | 위 명령·원출력 517행 | PASS |
| feature UI-100 pass criteria present | 위 명령·원출력 518행 | PASS |
| feature UI-101 name present | 위 명령·원출력 519행 | PASS |
| feature UI-101 UI need 필요 | 위 명령·원출력 520행 | PASS |
| feature UI-101 test need 필요 | 위 명령·원출력 521행 | PASS |
| feature UI-101 test area assigned | 위 명령·원출력 522행 | PASS |
| feature UI-101 pass criteria present | 위 명령·원출력 523행 | PASS |
| feature UI-102 name present | 위 명령·원출력 524행 | PASS |
| feature UI-102 UI need 필요 | 위 명령·원출력 525행 | PASS |
| feature UI-102 test need 필요 | 위 명령·원출력 526행 | PASS |
| feature UI-102 test area assigned | 위 명령·원출력 527행 | PASS |
| feature UI-102 pass criteria present | 위 명령·원출력 528행 | PASS |
| feature UI-103 name present | 위 명령·원출력 529행 | PASS |
| feature UI-103 UI need 필요 | 위 명령·원출력 530행 | PASS |
| feature UI-103 test need 필요 | 위 명령·원출력 531행 | PASS |
| feature UI-103 test area assigned | 위 명령·원출력 532행 | PASS |
| feature UI-103 pass criteria present | 위 명령·원출력 533행 | PASS |
| feature UI-104 name present | 위 명령·원출력 534행 | PASS |
| feature UI-104 UI need 필요 | 위 명령·원출력 535행 | PASS |
| feature UI-104 test need 필요 | 위 명령·원출력 536행 | PASS |
| feature UI-104 test area assigned | 위 명령·원출력 537행 | PASS |
| feature UI-104 pass criteria present | 위 명령·원출력 538행 | PASS |
| feature UI-105 name present | 위 명령·원출력 539행 | PASS |
| feature UI-105 UI need 필요 | 위 명령·원출력 540행 | PASS |
| feature UI-105 test need 필요 | 위 명령·원출력 541행 | PASS |
| feature UI-105 test area assigned | 위 명령·원출력 542행 | PASS |
| feature UI-105 pass criteria present | 위 명령·원출력 543행 | PASS |
| feature UI-106 name present | 위 명령·원출력 544행 | PASS |
| feature UI-106 UI need 필요 | 위 명령·원출력 545행 | PASS |
| feature UI-106 test need 필요 | 위 명령·원출력 546행 | PASS |
| feature UI-106 test area assigned | 위 명령·원출력 547행 | PASS |
| feature UI-106 pass criteria present | 위 명령·원출력 548행 | PASS |
| feature UI-107 name present | 위 명령·원출력 549행 | PASS |
| feature UI-107 UI need 필요 | 위 명령·원출력 550행 | PASS |
| feature UI-107 test need 필요 | 위 명령·원출력 551행 | PASS |
| feature UI-107 test area assigned | 위 명령·원출력 552행 | PASS |
| feature UI-107 pass criteria present | 위 명령·원출력 553행 | PASS |
| feature UI-108 name present | 위 명령·원출력 554행 | PASS |
| feature UI-108 UI need 필요 | 위 명령·원출력 555행 | PASS |
| feature UI-108 test need 필요 | 위 명령·원출력 556행 | PASS |
| feature UI-108 test area assigned | 위 명령·원출력 557행 | PASS |
| feature UI-108 pass criteria present | 위 명령·원출력 558행 | PASS |
| feature UI-109 name present | 위 명령·원출력 559행 | PASS |
| feature UI-109 UI need 필요 | 위 명령·원출력 560행 | PASS |
| feature UI-109 test need 필요 | 위 명령·원출력 561행 | PASS |
| feature UI-109 test area assigned | 위 명령·원출력 562행 | PASS |
| feature UI-109 pass criteria present | 위 명령·원출력 563행 | PASS |
| feature UI-110 name present | 위 명령·원출력 564행 | PASS |
| feature UI-110 UI need 필요 | 위 명령·원출력 565행 | PASS |
| feature UI-110 test need 필요 | 위 명령·원출력 566행 | PASS |
| feature UI-110 test area assigned | 위 명령·원출력 567행 | PASS |
| feature UI-110 pass criteria present | 위 명령·원출력 568행 | PASS |
| feature UI-111 name present | 위 명령·원출력 569행 | PASS |
| feature UI-111 UI need 필요 | 위 명령·원출력 570행 | PASS |
| feature UI-111 test need 필요 | 위 명령·원출력 571행 | PASS |
| feature UI-111 test area assigned | 위 명령·원출력 572행 | PASS |
| feature UI-111 pass criteria present | 위 명령·원출력 573행 | PASS |
| feature UI-112 name present | 위 명령·원출력 574행 | PASS |
| feature UI-112 UI need 필요 | 위 명령·원출력 575행 | PASS |
| feature UI-112 test need 필요 | 위 명령·원출력 576행 | PASS |
| feature UI-112 test area assigned | 위 명령·원출력 577행 | PASS |
| feature UI-112 pass criteria present | 위 명령·원출력 578행 | PASS |
| feature UI-113 name present | 위 명령·원출력 579행 | PASS |
| feature UI-113 UI need 필요 | 위 명령·원출력 580행 | PASS |
| feature UI-113 test need 필요 | 위 명령·원출력 581행 | PASS |
| feature UI-113 test area assigned | 위 명령·원출력 582행 | PASS |
| feature UI-113 pass criteria present | 위 명령·원출력 583행 | PASS |
| feature UI-114 name present | 위 명령·원출력 584행 | PASS |
| feature UI-114 UI need 필요 | 위 명령·원출력 585행 | PASS |
| feature UI-114 test need 필요 | 위 명령·원출력 586행 | PASS |
| feature UI-114 test area assigned | 위 명령·원출력 587행 | PASS |
| feature UI-114 pass criteria present | 위 명령·원출력 588행 | PASS |
| feature UI-115 name present | 위 명령·원출력 589행 | PASS |
| feature UI-115 UI need 필요 | 위 명령·원출력 590행 | PASS |
| feature UI-115 test need 필요 | 위 명령·원출력 591행 | PASS |
| feature UI-115 test area assigned | 위 명령·원출력 592행 | PASS |
| feature UI-115 pass criteria present | 위 명령·원출력 593행 | PASS |
| feature AUTH-001 name present | 위 명령·원출력 594행 | PASS |
| feature AUTH-001 UI need 간접 | 위 명령·원출력 595행 | PASS |
| feature AUTH-001 test need 필요 | 위 명령·원출력 596행 | PASS |
| feature AUTH-001 test area assigned | 위 명령·원출력 597행 | PASS |
| feature AUTH-001 pass criteria present | 위 명령·원출력 598행 | PASS |
| feature AUTH-002 name present | 위 명령·원출력 599행 | PASS |
| feature AUTH-002 UI need 비대상 | 위 명령·원출력 600행 | PASS |
| feature AUTH-002 test need 필요 | 위 명령·원출력 601행 | PASS |
| feature AUTH-002 test area assigned | 위 명령·원출력 602행 | PASS |
| feature AUTH-002 pass criteria present | 위 명령·원출력 603행 | PASS |
| feature AUTH-003 name present | 위 명령·원출력 604행 | PASS |
| feature AUTH-003 UI need 비대상 | 위 명령·원출력 605행 | PASS |
| feature AUTH-003 test need 필요 | 위 명령·원출력 606행 | PASS |
| feature AUTH-003 test area assigned | 위 명령·원출력 607행 | PASS |
| feature AUTH-003 pass criteria present | 위 명령·원출력 608행 | PASS |
| feature AUTH-004 name present | 위 명령·원출력 609행 | PASS |
| feature AUTH-004 UI need 간접 | 위 명령·원출력 610행 | PASS |
| feature AUTH-004 test need 필요 | 위 명령·원출력 611행 | PASS |
| feature AUTH-004 test area assigned | 위 명령·원출력 612행 | PASS |
| feature AUTH-004 pass criteria present | 위 명령·원출력 613행 | PASS |
| feature AUTH-005 name present | 위 명령·원출력 614행 | PASS |
| feature AUTH-005 UI need 필요 | 위 명령·원출력 615행 | PASS |
| feature AUTH-005 test need 필요 | 위 명령·원출력 616행 | PASS |
| feature AUTH-005 test area assigned | 위 명령·원출력 617행 | PASS |
| feature AUTH-005 pass criteria present | 위 명령·원출력 618행 | PASS |
| feature AUTH-006 name present | 위 명령·원출력 619행 | PASS |
| feature AUTH-006 UI need 필요 | 위 명령·원출력 620행 | PASS |
| feature AUTH-006 test need 필요 | 위 명령·원출력 621행 | PASS |
| feature AUTH-006 test area assigned | 위 명령·원출력 622행 | PASS |
| feature AUTH-006 pass criteria present | 위 명령·원출력 623행 | PASS |
| feature AUTH-007 name present | 위 명령·원출력 624행 | PASS |
| feature AUTH-007 UI need 필요 | 위 명령·원출력 625행 | PASS |
| feature AUTH-007 test need 필요 | 위 명령·원출력 626행 | PASS |
| feature AUTH-007 test area assigned | 위 명령·원출력 627행 | PASS |
| feature AUTH-007 pass criteria present | 위 명령·원출력 628행 | PASS |
| feature AUTH-008 name present | 위 명령·원출력 629행 | PASS |
| feature AUTH-008 UI need 비대상 | 위 명령·원출력 630행 | PASS |
| feature AUTH-008 test need 필요 | 위 명령·원출력 631행 | PASS |
| feature AUTH-008 test area assigned | 위 명령·원출력 632행 | PASS |
| feature AUTH-008 pass criteria present | 위 명령·원출력 633행 | PASS |
| feature AUTH-009 name present | 위 명령·원출력 634행 | PASS |
| feature AUTH-009 UI need 비대상 | 위 명령·원출력 635행 | PASS |
| feature AUTH-009 test need 필요 | 위 명령·원출력 636행 | PASS |
| feature AUTH-009 test area assigned | 위 명령·원출력 637행 | PASS |
| feature AUTH-009 pass criteria present | 위 명령·원출력 638행 | PASS |
| feature AUTH-010 name present | 위 명령·원출력 639행 | PASS |
| feature AUTH-010 UI need 비대상 | 위 명령·원출력 640행 | PASS |
| feature AUTH-010 test need 필요 | 위 명령·원출력 641행 | PASS |
| feature AUTH-010 test area assigned | 위 명령·원출력 642행 | PASS |
| feature AUTH-010 pass criteria present | 위 명령·원출력 643행 | PASS |
| feature AUTH-011 name present | 위 명령·원출력 644행 | PASS |
| feature AUTH-011 UI need 비대상 | 위 명령·원출력 645행 | PASS |
| feature AUTH-011 test need 필요 | 위 명령·원출력 646행 | PASS |
| feature AUTH-011 test area assigned | 위 명령·원출력 647행 | PASS |
| feature AUTH-011 pass criteria present | 위 명령·원출력 648행 | PASS |
| feature AUTH-012 name present | 위 명령·원출력 649행 | PASS |
| feature AUTH-012 UI need 비대상 | 위 명령·원출력 650행 | PASS |
| feature AUTH-012 test need 필요 | 위 명령·원출력 651행 | PASS |
| feature AUTH-012 test area assigned | 위 명령·원출력 652행 | PASS |
| feature AUTH-012 pass criteria present | 위 명령·원출력 653행 | PASS |
| feature AUTH-013 name present | 위 명령·원출력 654행 | PASS |
| feature AUTH-013 UI need 비대상 | 위 명령·원출력 655행 | PASS |
| feature AUTH-013 test need 필요 | 위 명령·원출력 656행 | PASS |
| feature AUTH-013 test area assigned | 위 명령·원출력 657행 | PASS |
| feature AUTH-013 pass criteria present | 위 명령·원출력 658행 | PASS |
| feature AUTH-014 name present | 위 명령·원출력 659행 | PASS |
| feature AUTH-014 UI need 비대상 | 위 명령·원출력 660행 | PASS |
| feature AUTH-014 test need 필요 | 위 명령·원출력 661행 | PASS |
| feature AUTH-014 test area assigned | 위 명령·원출력 662행 | PASS |
| feature AUTH-014 pass criteria present | 위 명령·원출력 663행 | PASS |
| feature AUTH-015 name present | 위 명령·원출력 664행 | PASS |
| feature AUTH-015 UI need 비대상 | 위 명령·원출력 665행 | PASS |
| feature AUTH-015 test need 필요 | 위 명령·원출력 666행 | PASS |
| feature AUTH-015 test area assigned | 위 명령·원출력 667행 | PASS |
| feature AUTH-015 pass criteria present | 위 명령·원출력 668행 | PASS |
| feature AUTH-016 name present | 위 명령·원출력 669행 | PASS |
| feature AUTH-016 UI need 간접 | 위 명령·원출력 670행 | PASS |
| feature AUTH-016 test need 필요 | 위 명령·원출력 671행 | PASS |
| feature AUTH-016 test area assigned | 위 명령·원출력 672행 | PASS |
| feature AUTH-016 pass criteria present | 위 명령·원출력 673행 | PASS |
| feature AUTH-017 name present | 위 명령·원출력 674행 | PASS |
| feature AUTH-017 UI need 간접 | 위 명령·원출력 675행 | PASS |
| feature AUTH-017 test need 필요 | 위 명령·원출력 676행 | PASS |
| feature AUTH-017 test area assigned | 위 명령·원출력 677행 | PASS |
| feature AUTH-017 pass criteria present | 위 명령·원출력 678행 | PASS |
| feature AUTH-018 name present | 위 명령·원출력 679행 | PASS |
| feature AUTH-018 UI need 필요 | 위 명령·원출력 680행 | PASS |
| feature AUTH-018 test need 필요 | 위 명령·원출력 681행 | PASS |
| feature AUTH-018 test area assigned | 위 명령·원출력 682행 | PASS |
| feature AUTH-018 pass criteria present | 위 명령·원출력 683행 | PASS |
| feature AUTH-019 name present | 위 명령·원출력 684행 | PASS |
| feature AUTH-019 UI need 필요 | 위 명령·원출력 685행 | PASS |
| feature AUTH-019 test need 필요 | 위 명령·원출력 686행 | PASS |
| feature AUTH-019 test area assigned | 위 명령·원출력 687행 | PASS |
| feature AUTH-019 pass criteria present | 위 명령·원출력 688행 | PASS |
| feature AUTH-020 name present | 위 명령·원출력 689행 | PASS |
| feature AUTH-020 UI need 필요 | 위 명령·원출력 690행 | PASS |
| feature AUTH-020 test need 필요 | 위 명령·원출력 691행 | PASS |
| feature AUTH-020 test area assigned | 위 명령·원출력 692행 | PASS |
| feature AUTH-020 pass criteria present | 위 명령·원출력 693행 | PASS |
| feature AUTH-021 name present | 위 명령·원출력 694행 | PASS |
| feature AUTH-021 UI need 필요 | 위 명령·원출력 695행 | PASS |
| feature AUTH-021 test need 필요 | 위 명령·원출력 696행 | PASS |
| feature AUTH-021 test area assigned | 위 명령·원출력 697행 | PASS |
| feature AUTH-021 pass criteria present | 위 명령·원출력 698행 | PASS |
| feature AUTH-022 name present | 위 명령·원출력 699행 | PASS |
| feature AUTH-022 UI need 필요 | 위 명령·원출력 700행 | PASS |
| feature AUTH-022 test need 필요 | 위 명령·원출력 701행 | PASS |
| feature AUTH-022 test area assigned | 위 명령·원출력 702행 | PASS |
| feature AUTH-022 pass criteria present | 위 명령·원출력 703행 | PASS |
| feature AUTH-023 name present | 위 명령·원출력 704행 | PASS |
| feature AUTH-023 UI need 필요 | 위 명령·원출력 705행 | PASS |
| feature AUTH-023 test need 필요 | 위 명령·원출력 706행 | PASS |
| feature AUTH-023 test area assigned | 위 명령·원출력 707행 | PASS |
| feature AUTH-023 pass criteria present | 위 명령·원출력 708행 | PASS |
| feature AUTH-024 name present | 위 명령·원출력 709행 | PASS |
| feature AUTH-024 UI need 필요 | 위 명령·원출력 710행 | PASS |
| feature AUTH-024 test need 필요 | 위 명령·원출력 711행 | PASS |
| feature AUTH-024 test area assigned | 위 명령·원출력 712행 | PASS |
| feature AUTH-024 pass criteria present | 위 명령·원출력 713행 | PASS |
| feature AUTH-025 name present | 위 명령·원출력 714행 | PASS |
| feature AUTH-025 UI need 필요 | 위 명령·원출력 715행 | PASS |
| feature AUTH-025 test need 필요 | 위 명령·원출력 716행 | PASS |
| feature AUTH-025 test area assigned | 위 명령·원출력 717행 | PASS |
| feature AUTH-025 pass criteria present | 위 명령·원출력 718행 | PASS |
| feature AUTH-026 name present | 위 명령·원출력 719행 | PASS |
| feature AUTH-026 UI need 필요 | 위 명령·원출력 720행 | PASS |
| feature AUTH-026 test need 필요 | 위 명령·원출력 721행 | PASS |
| feature AUTH-026 test area assigned | 위 명령·원출력 722행 | PASS |
| feature AUTH-026 pass criteria present | 위 명령·원출력 723행 | PASS |
| feature AUTH-027 name present | 위 명령·원출력 724행 | PASS |
| feature AUTH-027 UI need 필요 | 위 명령·원출력 725행 | PASS |
| feature AUTH-027 test need 필요 | 위 명령·원출력 726행 | PASS |
| feature AUTH-027 test area assigned | 위 명령·원출력 727행 | PASS |
| feature AUTH-027 pass criteria present | 위 명령·원출력 728행 | PASS |
| feature AUTH-028 name present | 위 명령·원출력 729행 | PASS |
| feature AUTH-028 UI need 간접 | 위 명령·원출력 730행 | PASS |
| feature AUTH-028 test need 필요 | 위 명령·원출력 731행 | PASS |
| feature AUTH-028 test area assigned | 위 명령·원출력 732행 | PASS |
| feature AUTH-028 pass criteria present | 위 명령·원출력 733행 | PASS |
| feature AUTH-029 name present | 위 명령·원출력 734행 | PASS |
| feature AUTH-029 UI need 간접 | 위 명령·원출력 735행 | PASS |
| feature AUTH-029 test need 필요 | 위 명령·원출력 736행 | PASS |
| feature AUTH-029 test area assigned | 위 명령·원출력 737행 | PASS |
| feature AUTH-029 pass criteria present | 위 명령·원출력 738행 | PASS |
| feature AUTH-030 name present | 위 명령·원출력 739행 | PASS |
| feature AUTH-030 UI need 간접 | 위 명령·원출력 740행 | PASS |
| feature AUTH-030 test need 필요 | 위 명령·원출력 741행 | PASS |
| feature AUTH-030 test area assigned | 위 명령·원출력 742행 | PASS |
| feature AUTH-030 pass criteria present | 위 명령·원출력 743행 | PASS |
| feature AUTH-031 name present | 위 명령·원출력 744행 | PASS |
| feature AUTH-031 UI need 비대상 | 위 명령·원출력 745행 | PASS |
| feature AUTH-031 test need 필요 | 위 명령·원출력 746행 | PASS |
| feature AUTH-031 test area assigned | 위 명령·원출력 747행 | PASS |
| feature AUTH-031 pass criteria present | 위 명령·원출력 748행 | PASS |
| feature AUTH-032 name present | 위 명령·원출력 749행 | PASS |
| feature AUTH-032 UI need 비대상 | 위 명령·원출력 750행 | PASS |
| feature AUTH-032 test need 필요 | 위 명령·원출력 751행 | PASS |
| feature AUTH-032 test area assigned | 위 명령·원출력 752행 | PASS |
| feature AUTH-032 pass criteria present | 위 명령·원출력 753행 | PASS |
| feature AUTH-033 name present | 위 명령·원출력 754행 | PASS |
| feature AUTH-033 UI need 필요 | 위 명령·원출력 755행 | PASS |
| feature AUTH-033 test need 필요 | 위 명령·원출력 756행 | PASS |
| feature AUTH-033 test area assigned | 위 명령·원출력 757행 | PASS |
| feature AUTH-033 pass criteria present | 위 명령·원출력 758행 | PASS |
| feature AUTH-034 name present | 위 명령·원출력 759행 | PASS |
| feature AUTH-034 UI need 필요 | 위 명령·원출력 760행 | PASS |
| feature AUTH-034 test need 필요 | 위 명령·원출력 761행 | PASS |
| feature AUTH-034 test area assigned | 위 명령·원출력 762행 | PASS |
| feature AUTH-034 pass criteria present | 위 명령·원출력 763행 | PASS |
| feature AUTH-035 name present | 위 명령·원출력 764행 | PASS |
| feature AUTH-035 UI need 간접 | 위 명령·원출력 765행 | PASS |
| feature AUTH-035 test need 필요 | 위 명령·원출력 766행 | PASS |
| feature AUTH-035 test area assigned | 위 명령·원출력 767행 | PASS |
| feature AUTH-035 pass criteria present | 위 명령·원출력 768행 | PASS |
| feature AUTH-036 name present | 위 명령·원출력 769행 | PASS |
| feature AUTH-036 UI need 필요 | 위 명령·원출력 770행 | PASS |
| feature AUTH-036 test need 필요 | 위 명령·원출력 771행 | PASS |
| feature AUTH-036 test area assigned | 위 명령·원출력 772행 | PASS |
| feature AUTH-036 pass criteria present | 위 명령·원출력 773행 | PASS |
| feature AUTH-037 name present | 위 명령·원출력 774행 | PASS |
| feature AUTH-037 UI need 필요 | 위 명령·원출력 775행 | PASS |
| feature AUTH-037 test need 필요 | 위 명령·원출력 776행 | PASS |
| feature AUTH-037 test area assigned | 위 명령·원출력 777행 | PASS |
| feature AUTH-037 pass criteria present | 위 명령·원출력 778행 | PASS |
| feature AUTH-038 name present | 위 명령·원출력 779행 | PASS |
| feature AUTH-038 UI need 필요 | 위 명령·원출력 780행 | PASS |
| feature AUTH-038 test need 필요 | 위 명령·원출력 781행 | PASS |
| feature AUTH-038 test area assigned | 위 명령·원출력 782행 | PASS |
| feature AUTH-038 pass criteria present | 위 명령·원출력 783행 | PASS |
| feature AUTH-039 name present | 위 명령·원출력 784행 | PASS |
| feature AUTH-039 UI need 간접 | 위 명령·원출력 785행 | PASS |
| feature AUTH-039 test need 필요 | 위 명령·원출력 786행 | PASS |
| feature AUTH-039 test area assigned | 위 명령·원출력 787행 | PASS |
| feature AUTH-039 pass criteria present | 위 명령·원출력 788행 | PASS |
| feature AUTH-040 name present | 위 명령·원출력 789행 | PASS |
| feature AUTH-040 UI need 간접 | 위 명령·원출력 790행 | PASS |
| feature AUTH-040 test need 필요 | 위 명령·원출력 791행 | PASS |
| feature AUTH-040 test area assigned | 위 명령·원출력 792행 | PASS |
| feature AUTH-040 pass criteria present | 위 명령·원출력 793행 | PASS |
| feature AUTH-041 name present | 위 명령·원출력 794행 | PASS |
| feature AUTH-041 UI need 비대상 | 위 명령·원출력 795행 | PASS |
| feature AUTH-041 test need 필요 | 위 명령·원출력 796행 | PASS |
| feature AUTH-041 test area assigned | 위 명령·원출력 797행 | PASS |
| feature AUTH-041 pass criteria present | 위 명령·원출력 798행 | PASS |
| feature AUTH-042 name present | 위 명령·원출력 799행 | PASS |
| feature AUTH-042 UI need 비대상 | 위 명령·원출력 800행 | PASS |
| feature AUTH-042 test need 필요 | 위 명령·원출력 801행 | PASS |
| feature AUTH-042 test area assigned | 위 명령·원출력 802행 | PASS |
| feature AUTH-042 pass criteria present | 위 명령·원출력 803행 | PASS |
| feature SRC-001 name present | 위 명령·원출력 804행 | PASS |
| feature SRC-001 UI need 필요 | 위 명령·원출력 805행 | PASS |
| feature SRC-001 test need 필요 | 위 명령·원출력 806행 | PASS |
| feature SRC-001 test area assigned | 위 명령·원출력 807행 | PASS |
| feature SRC-001 pass criteria present | 위 명령·원출력 808행 | PASS |
| feature SRC-002 name present | 위 명령·원출력 809행 | PASS |
| feature SRC-002 UI need 필요 | 위 명령·원출력 810행 | PASS |
| feature SRC-002 test need 필요 | 위 명령·원출력 811행 | PASS |
| feature SRC-002 test area assigned | 위 명령·원출력 812행 | PASS |
| feature SRC-002 pass criteria present | 위 명령·원출력 813행 | PASS |
| feature SRC-003 name present | 위 명령·원출력 814행 | PASS |
| feature SRC-003 UI need 필요 | 위 명령·원출력 815행 | PASS |
| feature SRC-003 test need 필요 | 위 명령·원출력 816행 | PASS |
| feature SRC-003 test area assigned | 위 명령·원출력 817행 | PASS |
| feature SRC-003 pass criteria present | 위 명령·원출력 818행 | PASS |
| feature SRC-004 name present | 위 명령·원출력 819행 | PASS |
| feature SRC-004 UI need 필요 | 위 명령·원출력 820행 | PASS |
| feature SRC-004 test need 필요 | 위 명령·원출력 821행 | PASS |
| feature SRC-004 test area assigned | 위 명령·원출력 822행 | PASS |
| feature SRC-004 pass criteria present | 위 명령·원출력 823행 | PASS |
| feature SRC-005 name present | 위 명령·원출력 824행 | PASS |
| feature SRC-005 UI need 필요 | 위 명령·원출력 825행 | PASS |
| feature SRC-005 test need 필요 | 위 명령·원출력 826행 | PASS |
| feature SRC-005 test area assigned | 위 명령·원출력 827행 | PASS |
| feature SRC-005 pass criteria present | 위 명령·원출력 828행 | PASS |
| feature SRC-006 name present | 위 명령·원출력 829행 | PASS |
| feature SRC-006 UI need 필요 | 위 명령·원출력 830행 | PASS |
| feature SRC-006 test need 필요 | 위 명령·원출력 831행 | PASS |
| feature SRC-006 test area assigned | 위 명령·원출력 832행 | PASS |
| feature SRC-006 pass criteria present | 위 명령·원출력 833행 | PASS |
| feature SRC-007 name present | 위 명령·원출력 834행 | PASS |
| feature SRC-007 UI need 필요 | 위 명령·원출력 835행 | PASS |
| feature SRC-007 test need 필요 | 위 명령·원출력 836행 | PASS |
| feature SRC-007 test area assigned | 위 명령·원출력 837행 | PASS |
| feature SRC-007 pass criteria present | 위 명령·원출력 838행 | PASS |
| feature SRC-008 name present | 위 명령·원출력 839행 | PASS |
| feature SRC-008 UI need 필요 | 위 명령·원출력 840행 | PASS |
| feature SRC-008 test need 필요 | 위 명령·원출력 841행 | PASS |
| feature SRC-008 test area assigned | 위 명령·원출력 842행 | PASS |
| feature SRC-008 pass criteria present | 위 명령·원출력 843행 | PASS |
| feature SRC-009 name present | 위 명령·원출력 844행 | PASS |
| feature SRC-009 UI need 필요 | 위 명령·원출력 845행 | PASS |
| feature SRC-009 test need 필요 | 위 명령·원출력 846행 | PASS |
| feature SRC-009 test area assigned | 위 명령·원출력 847행 | PASS |
| feature SRC-009 pass criteria present | 위 명령·원출력 848행 | PASS |
| feature SRC-010 name present | 위 명령·원출력 849행 | PASS |
| feature SRC-010 UI need 필요 | 위 명령·원출력 850행 | PASS |
| feature SRC-010 test need 필요 | 위 명령·원출력 851행 | PASS |
| feature SRC-010 test area assigned | 위 명령·원출력 852행 | PASS |
| feature SRC-010 pass criteria present | 위 명령·원출력 853행 | PASS |
| feature SRC-011 name present | 위 명령·원출력 854행 | PASS |
| feature SRC-011 UI need 필요 | 위 명령·원출력 855행 | PASS |
| feature SRC-011 test need 필요 | 위 명령·원출력 856행 | PASS |
| feature SRC-011 test area assigned | 위 명령·원출력 857행 | PASS |
| feature SRC-011 pass criteria present | 위 명령·원출력 858행 | PASS |
| feature SRC-012 name present | 위 명령·원출력 859행 | PASS |
| feature SRC-012 UI need 필요 | 위 명령·원출력 860행 | PASS |
| feature SRC-012 test need 필요 | 위 명령·원출력 861행 | PASS |
| feature SRC-012 test area assigned | 위 명령·원출력 862행 | PASS |
| feature SRC-012 pass criteria present | 위 명령·원출력 863행 | PASS |
| feature SRC-013 name present | 위 명령·원출력 864행 | PASS |
| feature SRC-013 UI need 간접 | 위 명령·원출력 865행 | PASS |
| feature SRC-013 test need 필요 | 위 명령·원출력 866행 | PASS |
| feature SRC-013 test area assigned | 위 명령·원출력 867행 | PASS |
| feature SRC-013 pass criteria present | 위 명령·원출력 868행 | PASS |
| feature SRC-014 name present | 위 명령·원출력 869행 | PASS |
| feature SRC-014 UI need 필요 | 위 명령·원출력 870행 | PASS |
| feature SRC-014 test need 필요 | 위 명령·원출력 871행 | PASS |
| feature SRC-014 test area assigned | 위 명령·원출력 872행 | PASS |
| feature SRC-014 pass criteria present | 위 명령·원출력 873행 | PASS |
| feature SRC-015 name present | 위 명령·원출력 874행 | PASS |
| feature SRC-015 UI need 비대상 | 위 명령·원출력 875행 | PASS |
| feature SRC-015 test need 필요 | 위 명령·원출력 876행 | PASS |
| feature SRC-015 test area assigned | 위 명령·원출력 877행 | PASS |
| feature SRC-015 pass criteria present | 위 명령·원출력 878행 | PASS |
| feature SRC-016 name present | 위 명령·원출력 879행 | PASS |
| feature SRC-016 UI need 필요 | 위 명령·원출력 880행 | PASS |
| feature SRC-016 test need 필요 | 위 명령·원출력 881행 | PASS |
| feature SRC-016 test area assigned | 위 명령·원출력 882행 | PASS |
| feature SRC-016 pass criteria present | 위 명령·원출력 883행 | PASS |
| feature SRC-017 name present | 위 명령·원출력 884행 | PASS |
| feature SRC-017 UI need 필요 | 위 명령·원출력 885행 | PASS |
| feature SRC-017 test need 필요 | 위 명령·원출력 886행 | PASS |
| feature SRC-017 test area assigned | 위 명령·원출력 887행 | PASS |
| feature SRC-017 pass criteria present | 위 명령·원출력 888행 | PASS |
| feature SRC-018 name present | 위 명령·원출력 889행 | PASS |
| feature SRC-018 UI need 필요 | 위 명령·원출력 890행 | PASS |
| feature SRC-018 test need 필요 | 위 명령·원출력 891행 | PASS |
| feature SRC-018 test area assigned | 위 명령·원출력 892행 | PASS |
| feature SRC-018 pass criteria present | 위 명령·원출력 893행 | PASS |
| feature SRC-019 name present | 위 명령·원출력 894행 | PASS |
| feature SRC-019 UI need 필요 | 위 명령·원출력 895행 | PASS |
| feature SRC-019 test need 필요 | 위 명령·원출력 896행 | PASS |
| feature SRC-019 test area assigned | 위 명령·원출력 897행 | PASS |
| feature SRC-019 pass criteria present | 위 명령·원출력 898행 | PASS |
| feature SRC-020 name present | 위 명령·원출력 899행 | PASS |
| feature SRC-020 UI need 필요 | 위 명령·원출력 900행 | PASS |
| feature SRC-020 test need 필요 | 위 명령·원출력 901행 | PASS |
| feature SRC-020 test area assigned | 위 명령·원출력 902행 | PASS |
| feature SRC-020 pass criteria present | 위 명령·원출력 903행 | PASS |
| feature SRC-021 name present | 위 명령·원출력 904행 | PASS |
| feature SRC-021 UI need 필요 | 위 명령·원출력 905행 | PASS |
| feature SRC-021 test need 필요 | 위 명령·원출력 906행 | PASS |
| feature SRC-021 test area assigned | 위 명령·원출력 907행 | PASS |
| feature SRC-021 pass criteria present | 위 명령·원출력 908행 | PASS |
| feature SRC-022 name present | 위 명령·원출력 909행 | PASS |
| feature SRC-022 UI need 필요 | 위 명령·원출력 910행 | PASS |
| feature SRC-022 test need 필요 | 위 명령·원출력 911행 | PASS |
| feature SRC-022 test area assigned | 위 명령·원출력 912행 | PASS |
| feature SRC-022 pass criteria present | 위 명령·원출력 913행 | PASS |
| feature SRC-023 name present | 위 명령·원출력 914행 | PASS |
| feature SRC-023 UI need 필요 | 위 명령·원출력 915행 | PASS |
| feature SRC-023 test need 필요 | 위 명령·원출력 916행 | PASS |
| feature SRC-023 test area assigned | 위 명령·원출력 917행 | PASS |
| feature SRC-023 pass criteria present | 위 명령·원출력 918행 | PASS |
| feature SRC-024 name present | 위 명령·원출력 919행 | PASS |
| feature SRC-024 UI need 간접 | 위 명령·원출력 920행 | PASS |
| feature SRC-024 test need 필요 | 위 명령·원출력 921행 | PASS |
| feature SRC-024 test area assigned | 위 명령·원출력 922행 | PASS |
| feature SRC-024 pass criteria present | 위 명령·원출력 923행 | PASS |
| feature SRC-025 name present | 위 명령·원출력 924행 | PASS |
| feature SRC-025 UI need 필요 | 위 명령·원출력 925행 | PASS |
| feature SRC-025 test need 필요 | 위 명령·원출력 926행 | PASS |
| feature SRC-025 test area assigned | 위 명령·원출력 927행 | PASS |
| feature SRC-025 pass criteria present | 위 명령·원출력 928행 | PASS |
| feature SRC-026 name present | 위 명령·원출력 929행 | PASS |
| feature SRC-026 UI need 필요 | 위 명령·원출력 930행 | PASS |
| feature SRC-026 test need 필요 | 위 명령·원출력 931행 | PASS |
| feature SRC-026 test area assigned | 위 명령·원출력 932행 | PASS |
| feature SRC-026 pass criteria present | 위 명령·원출력 933행 | PASS |
| feature SRC-027 name present | 위 명령·원출력 934행 | PASS |
| feature SRC-027 UI need 간접 | 위 명령·원출력 935행 | PASS |
| feature SRC-027 test need 필요 | 위 명령·원출력 936행 | PASS |
| feature SRC-027 test area assigned | 위 명령·원출력 937행 | PASS |
| feature SRC-027 pass criteria present | 위 명령·원출력 938행 | PASS |
| feature SRC-028 name present | 위 명령·원출력 939행 | PASS |
| feature SRC-028 UI need 필요 | 위 명령·원출력 940행 | PASS |
| feature SRC-028 test need 필요 | 위 명령·원출력 941행 | PASS |
| feature SRC-028 test area assigned | 위 명령·원출력 942행 | PASS |
| feature SRC-028 pass criteria present | 위 명령·원출력 943행 | PASS |
| feature SRC-029 name present | 위 명령·원출력 944행 | PASS |
| feature SRC-029 UI need 필요 | 위 명령·원출력 945행 | PASS |
| feature SRC-029 test need 필요 | 위 명령·원출력 946행 | PASS |
| feature SRC-029 test area assigned | 위 명령·원출력 947행 | PASS |
| feature SRC-029 pass criteria present | 위 명령·원출력 948행 | PASS |
| feature SRC-030 name present | 위 명령·원출력 949행 | PASS |
| feature SRC-030 UI need 필요 | 위 명령·원출력 950행 | PASS |
| feature SRC-030 test need 필요 | 위 명령·원출력 951행 | PASS |
| feature SRC-030 test area assigned | 위 명령·원출력 952행 | PASS |
| feature SRC-030 pass criteria present | 위 명령·원출력 953행 | PASS |
| feature SRC-031 name present | 위 명령·원출력 954행 | PASS |
| feature SRC-031 UI need 간접 | 위 명령·원출력 955행 | PASS |
| feature SRC-031 test need 필요 | 위 명령·원출력 956행 | PASS |
| feature SRC-031 test area assigned | 위 명령·원출력 957행 | PASS |
| feature SRC-031 pass criteria present | 위 명령·원출력 958행 | PASS |
| feature SRC-032 name present | 위 명령·원출력 959행 | PASS |
| feature SRC-032 UI need 간접 | 위 명령·원출력 960행 | PASS |
| feature SRC-032 test need 필요 | 위 명령·원출력 961행 | PASS |
| feature SRC-032 test area assigned | 위 명령·원출력 962행 | PASS |
| feature SRC-032 pass criteria present | 위 명령·원출력 963행 | PASS |
| feature SRC-033 name present | 위 명령·원출력 964행 | PASS |
| feature SRC-033 UI need 비대상 | 위 명령·원출력 965행 | PASS |
| feature SRC-033 test need 필요 | 위 명령·원출력 966행 | PASS |
| feature SRC-033 test area assigned | 위 명령·원출력 967행 | PASS |
| feature SRC-033 pass criteria present | 위 명령·원출력 968행 | PASS |
| feature SRC-034 name present | 위 명령·원출력 969행 | PASS |
| feature SRC-034 UI need 필요 | 위 명령·원출력 970행 | PASS |
| feature SRC-034 test need 필요 | 위 명령·원출력 971행 | PASS |
| feature SRC-034 test area assigned | 위 명령·원출력 972행 | PASS |
| feature SRC-034 pass criteria present | 위 명령·원출력 973행 | PASS |
| feature SRC-035 name present | 위 명령·원출력 974행 | PASS |
| feature SRC-035 UI need 필요 | 위 명령·원출력 975행 | PASS |
| feature SRC-035 test need 필요 | 위 명령·원출력 976행 | PASS |
| feature SRC-035 test area assigned | 위 명령·원출력 977행 | PASS |
| feature SRC-035 pass criteria present | 위 명령·원출력 978행 | PASS |
| feature SRC-036 name present | 위 명령·원출력 979행 | PASS |
| feature SRC-036 UI need 필요 | 위 명령·원출력 980행 | PASS |
| feature SRC-036 test need 필요 | 위 명령·원출력 981행 | PASS |
| feature SRC-036 test area assigned | 위 명령·원출력 982행 | PASS |
| feature SRC-036 pass criteria present | 위 명령·원출력 983행 | PASS |
| feature SRC-037 name present | 위 명령·원출력 984행 | PASS |
| feature SRC-037 UI need 필요 | 위 명령·원출력 985행 | PASS |
| feature SRC-037 test need 필요 | 위 명령·원출력 986행 | PASS |
| feature SRC-037 test area assigned | 위 명령·원출력 987행 | PASS |
| feature SRC-037 pass criteria present | 위 명령·원출력 988행 | PASS |
| feature SRC-038 name present | 위 명령·원출력 989행 | PASS |
| feature SRC-038 UI need 필요 | 위 명령·원출력 990행 | PASS |
| feature SRC-038 test need 필요 | 위 명령·원출력 991행 | PASS |
| feature SRC-038 test area assigned | 위 명령·원출력 992행 | PASS |
| feature SRC-038 pass criteria present | 위 명령·원출력 993행 | PASS |
| feature SRC-039 name present | 위 명령·원출력 994행 | PASS |
| feature SRC-039 UI need 필요 | 위 명령·원출력 995행 | PASS |
| feature SRC-039 test need 필요 | 위 명령·원출력 996행 | PASS |
| feature SRC-039 test area assigned | 위 명령·원출력 997행 | PASS |
| feature SRC-039 pass criteria present | 위 명령·원출력 998행 | PASS |
| feature SRC-040 name present | 위 명령·원출력 999행 | PASS |
| feature SRC-040 UI need 필요 | 위 명령·원출력 1000행 | PASS |
| feature SRC-040 test need 필요 | 위 명령·원출력 1001행 | PASS |
| feature SRC-040 test area assigned | 위 명령·원출력 1002행 | PASS |
| feature SRC-040 pass criteria present | 위 명령·원출력 1003행 | PASS |
| feature SRC-041 name present | 위 명령·원출력 1004행 | PASS |
| feature SRC-041 UI need 비대상 | 위 명령·원출력 1005행 | PASS |
| feature SRC-041 test need 필요 | 위 명령·원출력 1006행 | PASS |
| feature SRC-041 test area assigned | 위 명령·원출력 1007행 | PASS |
| feature SRC-041 pass criteria present | 위 명령·원출력 1008행 | PASS |
| feature SRC-042 name present | 위 명령·원출력 1009행 | PASS |
| feature SRC-042 UI need 비대상 | 위 명령·원출력 1010행 | PASS |
| feature SRC-042 test need 필요 | 위 명령·원출력 1011행 | PASS |
| feature SRC-042 test area assigned | 위 명령·원출력 1012행 | PASS |
| feature SRC-042 pass criteria present | 위 명령·원출력 1013행 | PASS |
| feature SRC-043 name present | 위 명령·원출력 1014행 | PASS |
| feature SRC-043 UI need 비대상 | 위 명령·원출력 1015행 | PASS |
| feature SRC-043 test need 필요 | 위 명령·원출력 1016행 | PASS |
| feature SRC-043 test area assigned | 위 명령·원출력 1017행 | PASS |
| feature SRC-043 pass criteria present | 위 명령·원출력 1018행 | PASS |
| feature SRC-044 name present | 위 명령·원출력 1019행 | PASS |
| feature SRC-044 UI need 비대상 | 위 명령·원출력 1020행 | PASS |
| feature SRC-044 test need 필요 | 위 명령·원출력 1021행 | PASS |
| feature SRC-044 test area assigned | 위 명령·원출력 1022행 | PASS |
| feature SRC-044 pass criteria present | 위 명령·원출력 1023행 | PASS |
| feature SRC-045 name present | 위 명령·원출력 1024행 | PASS |
| feature SRC-045 UI need 비대상 | 위 명령·원출력 1025행 | PASS |
| feature SRC-045 test need 필요 | 위 명령·원출력 1026행 | PASS |
| feature SRC-045 test area assigned | 위 명령·원출력 1027행 | PASS |
| feature SRC-045 pass criteria present | 위 명령·원출력 1028행 | PASS |
| feature SRC-046 name present | 위 명령·원출력 1029행 | PASS |
| feature SRC-046 UI need 비대상 | 위 명령·원출력 1030행 | PASS |
| feature SRC-046 test need 필요 | 위 명령·원출력 1031행 | PASS |
| feature SRC-046 test area assigned | 위 명령·원출력 1032행 | PASS |
| feature SRC-046 pass criteria present | 위 명령·원출력 1033행 | PASS |
| feature SRC-047 name present | 위 명령·원출력 1034행 | PASS |
| feature SRC-047 UI need 비대상 | 위 명령·원출력 1035행 | PASS |
| feature SRC-047 test need 필요 | 위 명령·원출력 1036행 | PASS |
| feature SRC-047 test area assigned | 위 명령·원출력 1037행 | PASS |
| feature SRC-047 pass criteria present | 위 명령·원출력 1038행 | PASS |
| feature SRC-048 name present | 위 명령·원출력 1039행 | PASS |
| feature SRC-048 UI need 비대상 | 위 명령·원출력 1040행 | PASS |
| feature SRC-048 test need 필요 | 위 명령·원출력 1041행 | PASS |
| feature SRC-048 test area assigned | 위 명령·원출력 1042행 | PASS |
| feature SRC-048 pass criteria present | 위 명령·원출력 1043행 | PASS |
| feature SRC-049 name present | 위 명령·원출력 1044행 | PASS |
| feature SRC-049 UI need 비대상 | 위 명령·원출력 1045행 | PASS |
| feature SRC-049 test need 필요 | 위 명령·원출력 1046행 | PASS |
| feature SRC-049 test area assigned | 위 명령·원출력 1047행 | PASS |
| feature SRC-049 pass criteria present | 위 명령·원출력 1048행 | PASS |
| feature SRC-050 name present | 위 명령·원출력 1049행 | PASS |
| feature SRC-050 UI need 비대상 | 위 명령·원출력 1050행 | PASS |
| feature SRC-050 test need 필요 | 위 명령·원출력 1051행 | PASS |
| feature SRC-050 test area assigned | 위 명령·원출력 1052행 | PASS |
| feature SRC-050 pass criteria present | 위 명령·원출력 1053행 | PASS |
| feature SRC-051 name present | 위 명령·원출력 1054행 | PASS |
| feature SRC-051 UI need 비대상 | 위 명령·원출력 1055행 | PASS |
| feature SRC-051 test need 필요 | 위 명령·원출력 1056행 | PASS |
| feature SRC-051 test area assigned | 위 명령·원출력 1057행 | PASS |
| feature SRC-051 pass criteria present | 위 명령·원출력 1058행 | PASS |
| feature SRC-052 name present | 위 명령·원출력 1059행 | PASS |
| feature SRC-052 UI need 비대상 | 위 명령·원출력 1060행 | PASS |
| feature SRC-052 test need 필요 | 위 명령·원출력 1061행 | PASS |
| feature SRC-052 test area assigned | 위 명령·원출력 1062행 | PASS |
| feature SRC-052 pass criteria present | 위 명령·원출력 1063행 | PASS |
| feature SRC-053 name present | 위 명령·원출력 1064행 | PASS |
| feature SRC-053 UI need 비대상 | 위 명령·원출력 1065행 | PASS |
| feature SRC-053 test need 필요 | 위 명령·원출력 1066행 | PASS |
| feature SRC-053 test area assigned | 위 명령·원출력 1067행 | PASS |
| feature SRC-053 pass criteria present | 위 명령·원출력 1068행 | PASS |
| feature SRC-054 name present | 위 명령·원출력 1069행 | PASS |
| feature SRC-054 UI need 비대상 | 위 명령·원출력 1070행 | PASS |
| feature SRC-054 test need 필요 | 위 명령·원출력 1071행 | PASS |
| feature SRC-054 test area assigned | 위 명령·원출력 1072행 | PASS |
| feature SRC-054 pass criteria present | 위 명령·원출력 1073행 | PASS |
| feature SRC-055 name present | 위 명령·원출력 1074행 | PASS |
| feature SRC-055 UI need 비대상 | 위 명령·원출력 1075행 | PASS |
| feature SRC-055 test need 필요 | 위 명령·원출력 1076행 | PASS |
| feature SRC-055 test area assigned | 위 명령·원출력 1077행 | PASS |
| feature SRC-055 pass criteria present | 위 명령·원출력 1078행 | PASS |
| feature SRC-056 name present | 위 명령·원출력 1079행 | PASS |
| feature SRC-056 UI need 비대상 | 위 명령·원출력 1080행 | PASS |
| feature SRC-056 test need 필요 | 위 명령·원출력 1081행 | PASS |
| feature SRC-056 test area assigned | 위 명령·원출력 1082행 | PASS |
| feature SRC-056 pass criteria present | 위 명령·원출력 1083행 | PASS |
| feature SRC-057 name present | 위 명령·원출력 1084행 | PASS |
| feature SRC-057 UI need 비대상 | 위 명령·원출력 1085행 | PASS |
| feature SRC-057 test need 필요 | 위 명령·원출력 1086행 | PASS |
| feature SRC-057 test area assigned | 위 명령·원출력 1087행 | PASS |
| feature SRC-057 pass criteria present | 위 명령·원출력 1088행 | PASS |
| feature SRC-058 name present | 위 명령·원출력 1089행 | PASS |
| feature SRC-058 UI need 비대상 | 위 명령·원출력 1090행 | PASS |
| feature SRC-058 test need 필요 | 위 명령·원출력 1091행 | PASS |
| feature SRC-058 test area assigned | 위 명령·원출력 1092행 | PASS |
| feature SRC-058 pass criteria present | 위 명령·원출력 1093행 | PASS |
| feature SRC-059 name present | 위 명령·원출력 1094행 | PASS |
| feature SRC-059 UI need 비대상 | 위 명령·원출력 1095행 | PASS |
| feature SRC-059 test need 필요 | 위 명령·원출력 1096행 | PASS |
| feature SRC-059 test area assigned | 위 명령·원출력 1097행 | PASS |
| feature SRC-059 pass criteria present | 위 명령·원출력 1098행 | PASS |
| feature SRC-060 name present | 위 명령·원출력 1099행 | PASS |
| feature SRC-060 UI need 비대상 | 위 명령·원출력 1100행 | PASS |
| feature SRC-060 test need 필요 | 위 명령·원출력 1101행 | PASS |
| feature SRC-060 test area assigned | 위 명령·원출력 1102행 | PASS |
| feature SRC-060 pass criteria present | 위 명령·원출력 1103행 | PASS |
| feature SRC-061 name present | 위 명령·원출력 1104행 | PASS |
| feature SRC-061 UI need 비대상 | 위 명령·원출력 1105행 | PASS |
| feature SRC-061 test need 필요 | 위 명령·원출력 1106행 | PASS |
| feature SRC-061 test area assigned | 위 명령·원출력 1107행 | PASS |
| feature SRC-061 pass criteria present | 위 명령·원출력 1108행 | PASS |
| feature SRC-062 name present | 위 명령·원출력 1109행 | PASS |
| feature SRC-062 UI need 비대상 | 위 명령·원출력 1110행 | PASS |
| feature SRC-062 test need 필요 | 위 명령·원출력 1111행 | PASS |
| feature SRC-062 test area assigned | 위 명령·원출력 1112행 | PASS |
| feature SRC-062 pass criteria present | 위 명령·원출력 1113행 | PASS |
| feature SRC-063 name present | 위 명령·원출력 1114행 | PASS |
| feature SRC-063 UI need 비대상 | 위 명령·원출력 1115행 | PASS |
| feature SRC-063 test need 필요 | 위 명령·원출력 1116행 | PASS |
| feature SRC-063 test area assigned | 위 명령·원출력 1117행 | PASS |
| feature SRC-063 pass criteria present | 위 명령·원출력 1118행 | PASS |
| feature SRC-064 name present | 위 명령·원출력 1119행 | PASS |
| feature SRC-064 UI need 비대상 | 위 명령·원출력 1120행 | PASS |
| feature SRC-064 test need 필요 | 위 명령·원출력 1121행 | PASS |
| feature SRC-064 test area assigned | 위 명령·원출력 1122행 | PASS |
| feature SRC-064 pass criteria present | 위 명령·원출력 1123행 | PASS |
| feature SRC-065 name present | 위 명령·원출력 1124행 | PASS |
| feature SRC-065 UI need 간접 | 위 명령·원출력 1125행 | PASS |
| feature SRC-065 test need 필요 | 위 명령·원출력 1126행 | PASS |
| feature SRC-065 test area assigned | 위 명령·원출력 1127행 | PASS |
| feature SRC-065 pass criteria present | 위 명령·원출력 1128행 | PASS |
| feature SRC-066 name present | 위 명령·원출력 1129행 | PASS |
| feature SRC-066 UI need 간접 | 위 명령·원출력 1130행 | PASS |
| feature SRC-066 test need 필요 | 위 명령·원출력 1131행 | PASS |
| feature SRC-066 test area assigned | 위 명령·원출력 1132행 | PASS |
| feature SRC-066 pass criteria present | 위 명령·원출력 1133행 | PASS |
| feature SRC-067 name present | 위 명령·원출력 1134행 | PASS |
| feature SRC-067 UI need 간접 | 위 명령·원출력 1135행 | PASS |
| feature SRC-067 test need 필요 | 위 명령·원출력 1136행 | PASS |
| feature SRC-067 test area assigned | 위 명령·원출력 1137행 | PASS |
| feature SRC-067 pass criteria present | 위 명령·원출력 1138행 | PASS |
| feature SRC-068 name present | 위 명령·원출력 1139행 | PASS |
| feature SRC-068 UI need 간접 | 위 명령·원출력 1140행 | PASS |
| feature SRC-068 test need 필요 | 위 명령·원출력 1141행 | PASS |
| feature SRC-068 test area assigned | 위 명령·원출력 1142행 | PASS |
| feature SRC-068 pass criteria present | 위 명령·원출력 1143행 | PASS |
| feature RULE-001 name present | 위 명령·원출력 1144행 | PASS |
| feature RULE-001 UI need 필요 | 위 명령·원출력 1145행 | PASS |
| feature RULE-001 test need 필요 | 위 명령·원출력 1146행 | PASS |
| feature RULE-001 test area assigned | 위 명령·원출력 1147행 | PASS |
| feature RULE-001 pass criteria present | 위 명령·원출력 1148행 | PASS |
| feature RULE-002 name present | 위 명령·원출력 1149행 | PASS |
| feature RULE-002 UI need 필요 | 위 명령·원출력 1150행 | PASS |
| feature RULE-002 test need 필요 | 위 명령·원출력 1151행 | PASS |
| feature RULE-002 test area assigned | 위 명령·원출력 1152행 | PASS |
| feature RULE-002 pass criteria present | 위 명령·원출력 1153행 | PASS |
| feature RULE-003 name present | 위 명령·원출력 1154행 | PASS |
| feature RULE-003 UI need 필요 | 위 명령·원출력 1155행 | PASS |
| feature RULE-003 test need 필요 | 위 명령·원출력 1156행 | PASS |
| feature RULE-003 test area assigned | 위 명령·원출력 1157행 | PASS |
| feature RULE-003 pass criteria present | 위 명령·원출력 1158행 | PASS |
| feature RULE-004 name present | 위 명령·원출력 1159행 | PASS |
| feature RULE-004 UI need 필요 | 위 명령·원출력 1160행 | PASS |
| feature RULE-004 test need 필요 | 위 명령·원출력 1161행 | PASS |
| feature RULE-004 test area assigned | 위 명령·원출력 1162행 | PASS |
| feature RULE-004 pass criteria present | 위 명령·원출력 1163행 | PASS |
| feature RULE-005 name present | 위 명령·원출력 1164행 | PASS |
| feature RULE-005 UI need 필요 | 위 명령·원출력 1165행 | PASS |
| feature RULE-005 test need 필요 | 위 명령·원출력 1166행 | PASS |
| feature RULE-005 test area assigned | 위 명령·원출력 1167행 | PASS |
| feature RULE-005 pass criteria present | 위 명령·원출력 1168행 | PASS |
| feature RULE-006 name present | 위 명령·원출력 1169행 | PASS |
| feature RULE-006 UI need 필요 | 위 명령·원출력 1170행 | PASS |
| feature RULE-006 test need 필요 | 위 명령·원출력 1171행 | PASS |
| feature RULE-006 test area assigned | 위 명령·원출력 1172행 | PASS |
| feature RULE-006 pass criteria present | 위 명령·원출력 1173행 | PASS |
| feature RULE-007 name present | 위 명령·원출력 1174행 | PASS |
| feature RULE-007 UI need 필요 | 위 명령·원출력 1175행 | PASS |
| feature RULE-007 test need 필요 | 위 명령·원출력 1176행 | PASS |
| feature RULE-007 test area assigned | 위 명령·원출력 1177행 | PASS |
| feature RULE-007 pass criteria present | 위 명령·원출력 1178행 | PASS |
| feature RULE-008 name present | 위 명령·원출력 1179행 | PASS |
| feature RULE-008 UI need 필요 | 위 명령·원출력 1180행 | PASS |
| feature RULE-008 test need 필요 | 위 명령·원출력 1181행 | PASS |
| feature RULE-008 test area assigned | 위 명령·원출력 1182행 | PASS |
| feature RULE-008 pass criteria present | 위 명령·원출력 1183행 | PASS |
| feature RULE-009 name present | 위 명령·원출력 1184행 | PASS |
| feature RULE-009 UI need 필요 | 위 명령·원출력 1185행 | PASS |
| feature RULE-009 test need 필요 | 위 명령·원출력 1186행 | PASS |
| feature RULE-009 test area assigned | 위 명령·원출력 1187행 | PASS |
| feature RULE-009 pass criteria present | 위 명령·원출력 1188행 | PASS |
| feature RULE-010 name present | 위 명령·원출력 1189행 | PASS |
| feature RULE-010 UI need 필요 | 위 명령·원출력 1190행 | PASS |
| feature RULE-010 test need 필요 | 위 명령·원출력 1191행 | PASS |
| feature RULE-010 test area assigned | 위 명령·원출력 1192행 | PASS |
| feature RULE-010 pass criteria present | 위 명령·원출력 1193행 | PASS |
| feature RULE-011 name present | 위 명령·원출력 1194행 | PASS |
| feature RULE-011 UI need 필요 | 위 명령·원출력 1195행 | PASS |
| feature RULE-011 test need 필요 | 위 명령·원출력 1196행 | PASS |
| feature RULE-011 test area assigned | 위 명령·원출력 1197행 | PASS |
| feature RULE-011 pass criteria present | 위 명령·원출력 1198행 | PASS |
| feature RULE-012 name present | 위 명령·원출력 1199행 | PASS |
| feature RULE-012 UI need 필요 | 위 명령·원출력 1200행 | PASS |
| feature RULE-012 test need 필요 | 위 명령·원출력 1201행 | PASS |
| feature RULE-012 test area assigned | 위 명령·원출력 1202행 | PASS |
| feature RULE-012 pass criteria present | 위 명령·원출력 1203행 | PASS |
| feature RULE-013 name present | 위 명령·원출력 1204행 | PASS |
| feature RULE-013 UI need 필요 | 위 명령·원출력 1205행 | PASS |
| feature RULE-013 test need 필요 | 위 명령·원출력 1206행 | PASS |
| feature RULE-013 test area assigned | 위 명령·원출력 1207행 | PASS |
| feature RULE-013 pass criteria present | 위 명령·원출력 1208행 | PASS |
| feature RULE-014 name present | 위 명령·원출력 1209행 | PASS |
| feature RULE-014 UI need 필요 | 위 명령·원출력 1210행 | PASS |
| feature RULE-014 test need 필요 | 위 명령·원출력 1211행 | PASS |
| feature RULE-014 test area assigned | 위 명령·원출력 1212행 | PASS |
| feature RULE-014 pass criteria present | 위 명령·원출력 1213행 | PASS |
| feature RULE-015 name present | 위 명령·원출력 1214행 | PASS |
| feature RULE-015 UI need 필요 | 위 명령·원출력 1215행 | PASS |
| feature RULE-015 test need 필요 | 위 명령·원출력 1216행 | PASS |
| feature RULE-015 test area assigned | 위 명령·원출력 1217행 | PASS |
| feature RULE-015 pass criteria present | 위 명령·원출력 1218행 | PASS |
| feature RULE-016 name present | 위 명령·원출력 1219행 | PASS |
| feature RULE-016 UI need 필요 | 위 명령·원출력 1220행 | PASS |
| feature RULE-016 test need 필요 | 위 명령·원출력 1221행 | PASS |
| feature RULE-016 test area assigned | 위 명령·원출력 1222행 | PASS |
| feature RULE-016 pass criteria present | 위 명령·원출력 1223행 | PASS |
| feature RULE-017 name present | 위 명령·원출력 1224행 | PASS |
| feature RULE-017 UI need 필요 | 위 명령·원출력 1225행 | PASS |
| feature RULE-017 test need 필요 | 위 명령·원출력 1226행 | PASS |
| feature RULE-017 test area assigned | 위 명령·원출력 1227행 | PASS |
| feature RULE-017 pass criteria present | 위 명령·원출력 1228행 | PASS |
| feature RULE-018 name present | 위 명령·원출력 1229행 | PASS |
| feature RULE-018 UI need 필요 | 위 명령·원출력 1230행 | PASS |
| feature RULE-018 test need 필요 | 위 명령·원출력 1231행 | PASS |
| feature RULE-018 test area assigned | 위 명령·원출력 1232행 | PASS |
| feature RULE-018 pass criteria present | 위 명령·원출력 1233행 | PASS |
| feature RULE-019 name present | 위 명령·원출력 1234행 | PASS |
| feature RULE-019 UI need 필요 | 위 명령·원출력 1235행 | PASS |
| feature RULE-019 test need 필요 | 위 명령·원출력 1236행 | PASS |
| feature RULE-019 test area assigned | 위 명령·원출력 1237행 | PASS |
| feature RULE-019 pass criteria present | 위 명령·원출력 1238행 | PASS |
| feature RULE-020 name present | 위 명령·원출력 1239행 | PASS |
| feature RULE-020 UI need 필요 | 위 명령·원출력 1240행 | PASS |
| feature RULE-020 test need 필요 | 위 명령·원출력 1241행 | PASS |
| feature RULE-020 test area assigned | 위 명령·원출력 1242행 | PASS |
| feature RULE-020 pass criteria present | 위 명령·원출력 1243행 | PASS |
| feature RULE-021 name present | 위 명령·원출력 1244행 | PASS |
| feature RULE-021 UI need 필요 | 위 명령·원출력 1245행 | PASS |
| feature RULE-021 test need 필요 | 위 명령·원출력 1246행 | PASS |
| feature RULE-021 test area assigned | 위 명령·원출력 1247행 | PASS |
| feature RULE-021 pass criteria present | 위 명령·원출력 1248행 | PASS |
| feature RULE-022 name present | 위 명령·원출력 1249행 | PASS |
| feature RULE-022 UI need 필요 | 위 명령·원출력 1250행 | PASS |
| feature RULE-022 test need 필요 | 위 명령·원출력 1251행 | PASS |
| feature RULE-022 test area assigned | 위 명령·원출력 1252행 | PASS |
| feature RULE-022 pass criteria present | 위 명령·원출력 1253행 | PASS |
| feature RULE-023 name present | 위 명령·원출력 1254행 | PASS |
| feature RULE-023 UI need 필요 | 위 명령·원출력 1255행 | PASS |
| feature RULE-023 test need 필요 | 위 명령·원출력 1256행 | PASS |
| feature RULE-023 test area assigned | 위 명령·원출력 1257행 | PASS |
| feature RULE-023 pass criteria present | 위 명령·원출력 1258행 | PASS |
| feature RULE-024 name present | 위 명령·원출력 1259행 | PASS |
| feature RULE-024 UI need 필요 | 위 명령·원출력 1260행 | PASS |
| feature RULE-024 test need 필요 | 위 명령·원출력 1261행 | PASS |
| feature RULE-024 test area assigned | 위 명령·원출력 1262행 | PASS |
| feature RULE-024 pass criteria present | 위 명령·원출력 1263행 | PASS |
| feature RULE-025 name present | 위 명령·원출력 1264행 | PASS |
| feature RULE-025 UI need 필요 | 위 명령·원출력 1265행 | PASS |
| feature RULE-025 test need 필요 | 위 명령·원출력 1266행 | PASS |
| feature RULE-025 test area assigned | 위 명령·원출력 1267행 | PASS |
| feature RULE-025 pass criteria present | 위 명령·원출력 1268행 | PASS |
| feature RULE-026 name present | 위 명령·원출력 1269행 | PASS |
| feature RULE-026 UI need 필요 | 위 명령·원출력 1270행 | PASS |
| feature RULE-026 test need 필요 | 위 명령·원출력 1271행 | PASS |
| feature RULE-026 test area assigned | 위 명령·원출력 1272행 | PASS |
| feature RULE-026 pass criteria present | 위 명령·원출력 1273행 | PASS |
| feature RULE-027 name present | 위 명령·원출력 1274행 | PASS |
| feature RULE-027 UI need 필요 | 위 명령·원출력 1275행 | PASS |
| feature RULE-027 test need 필요 | 위 명령·원출력 1276행 | PASS |
| feature RULE-027 test area assigned | 위 명령·원출력 1277행 | PASS |
| feature RULE-027 pass criteria present | 위 명령·원출력 1278행 | PASS |
| feature RULE-028 name present | 위 명령·원출력 1279행 | PASS |
| feature RULE-028 UI need 필요 | 위 명령·원출력 1280행 | PASS |
| feature RULE-028 test need 필요 | 위 명령·원출력 1281행 | PASS |
| feature RULE-028 test area assigned | 위 명령·원출력 1282행 | PASS |
| feature RULE-028 pass criteria present | 위 명령·원출력 1283행 | PASS |
| feature RULE-029 name present | 위 명령·원출력 1284행 | PASS |
| feature RULE-029 UI need 필요 | 위 명령·원출력 1285행 | PASS |
| feature RULE-029 test need 필요 | 위 명령·원출력 1286행 | PASS |
| feature RULE-029 test area assigned | 위 명령·원출력 1287행 | PASS |
| feature RULE-029 pass criteria present | 위 명령·원출력 1288행 | PASS |
| feature RULE-030 name present | 위 명령·원출력 1289행 | PASS |
| feature RULE-030 UI need 필요 | 위 명령·원출력 1290행 | PASS |
| feature RULE-030 test need 필요 | 위 명령·원출력 1291행 | PASS |
| feature RULE-030 test area assigned | 위 명령·원출력 1292행 | PASS |
| feature RULE-030 pass criteria present | 위 명령·원출력 1293행 | PASS |
| feature RULE-031 name present | 위 명령·원출력 1294행 | PASS |
| feature RULE-031 UI need 필요 | 위 명령·원출력 1295행 | PASS |
| feature RULE-031 test need 필요 | 위 명령·원출력 1296행 | PASS |
| feature RULE-031 test area assigned | 위 명령·원출력 1297행 | PASS |
| feature RULE-031 pass criteria present | 위 명령·원출력 1298행 | PASS |
| feature RULE-032 name present | 위 명령·원출력 1299행 | PASS |
| feature RULE-032 UI need 필요 | 위 명령·원출력 1300행 | PASS |
| feature RULE-032 test need 필요 | 위 명령·원출력 1301행 | PASS |
| feature RULE-032 test area assigned | 위 명령·원출력 1302행 | PASS |
| feature RULE-032 pass criteria present | 위 명령·원출력 1303행 | PASS |
| feature RULE-033 name present | 위 명령·원출력 1304행 | PASS |
| feature RULE-033 UI need 필요 | 위 명령·원출력 1305행 | PASS |
| feature RULE-033 test need 필요 | 위 명령·원출력 1306행 | PASS |
| feature RULE-033 test area assigned | 위 명령·원출력 1307행 | PASS |
| feature RULE-033 pass criteria present | 위 명령·원출력 1308행 | PASS |
| feature RULE-034 name present | 위 명령·원출력 1309행 | PASS |
| feature RULE-034 UI need 필요 | 위 명령·원출력 1310행 | PASS |
| feature RULE-034 test need 필요 | 위 명령·원출력 1311행 | PASS |
| feature RULE-034 test area assigned | 위 명령·원출력 1312행 | PASS |
| feature RULE-034 pass criteria present | 위 명령·원출력 1313행 | PASS |
| feature RULE-035 name present | 위 명령·원출력 1314행 | PASS |
| feature RULE-035 UI need 필요 | 위 명령·원출력 1315행 | PASS |
| feature RULE-035 test need 필요 | 위 명령·원출력 1316행 | PASS |
| feature RULE-035 test area assigned | 위 명령·원출력 1317행 | PASS |
| feature RULE-035 pass criteria present | 위 명령·원출력 1318행 | PASS |
| feature RULE-036 name present | 위 명령·원출력 1319행 | PASS |
| feature RULE-036 UI need 필요 | 위 명령·원출력 1320행 | PASS |
| feature RULE-036 test need 필요 | 위 명령·원출력 1321행 | PASS |
| feature RULE-036 test area assigned | 위 명령·원출력 1322행 | PASS |
| feature RULE-036 pass criteria present | 위 명령·원출력 1323행 | PASS |
| feature RULE-037 name present | 위 명령·원출력 1324행 | PASS |
| feature RULE-037 UI need 필요 | 위 명령·원출력 1325행 | PASS |
| feature RULE-037 test need 필요 | 위 명령·원출력 1326행 | PASS |
| feature RULE-037 test area assigned | 위 명령·원출력 1327행 | PASS |
| feature RULE-037 pass criteria present | 위 명령·원출력 1328행 | PASS |
| feature RULE-038 name present | 위 명령·원출력 1329행 | PASS |
| feature RULE-038 UI need 필요 | 위 명령·원출력 1330행 | PASS |
| feature RULE-038 test need 필요 | 위 명령·원출력 1331행 | PASS |
| feature RULE-038 test area assigned | 위 명령·원출력 1332행 | PASS |
| feature RULE-038 pass criteria present | 위 명령·원출력 1333행 | PASS |
| feature RULE-039 name present | 위 명령·원출력 1334행 | PASS |
| feature RULE-039 UI need 필요 | 위 명령·원출력 1335행 | PASS |
| feature RULE-039 test need 필요 | 위 명령·원출력 1336행 | PASS |
| feature RULE-039 test area assigned | 위 명령·원출력 1337행 | PASS |
| feature RULE-039 pass criteria present | 위 명령·원출력 1338행 | PASS |
| feature RULE-040 name present | 위 명령·원출력 1339행 | PASS |
| feature RULE-040 UI need 필요 | 위 명령·원출력 1340행 | PASS |
| feature RULE-040 test need 필요 | 위 명령·원출력 1341행 | PASS |
| feature RULE-040 test area assigned | 위 명령·원출력 1342행 | PASS |
| feature RULE-040 pass criteria present | 위 명령·원출력 1343행 | PASS |
| feature RULE-041 name present | 위 명령·원출력 1344행 | PASS |
| feature RULE-041 UI need 필요 | 위 명령·원출력 1345행 | PASS |
| feature RULE-041 test need 필요 | 위 명령·원출력 1346행 | PASS |
| feature RULE-041 test area assigned | 위 명령·원출력 1347행 | PASS |
| feature RULE-041 pass criteria present | 위 명령·원출력 1348행 | PASS |
| feature RULE-042 name present | 위 명령·원출력 1349행 | PASS |
| feature RULE-042 UI need 필요 | 위 명령·원출력 1350행 | PASS |
| feature RULE-042 test need 필요 | 위 명령·원출력 1351행 | PASS |
| feature RULE-042 test area assigned | 위 명령·원출력 1352행 | PASS |
| feature RULE-042 pass criteria present | 위 명령·원출력 1353행 | PASS |
| feature RULE-043 name present | 위 명령·원출력 1354행 | PASS |
| feature RULE-043 UI need 필요 | 위 명령·원출력 1355행 | PASS |
| feature RULE-043 test need 필요 | 위 명령·원출력 1356행 | PASS |
| feature RULE-043 test area assigned | 위 명령·원출력 1357행 | PASS |
| feature RULE-043 pass criteria present | 위 명령·원출력 1358행 | PASS |
| feature RULE-044 name present | 위 명령·원출력 1359행 | PASS |
| feature RULE-044 UI need 필요 | 위 명령·원출력 1360행 | PASS |
| feature RULE-044 test need 필요 | 위 명령·원출력 1361행 | PASS |
| feature RULE-044 test area assigned | 위 명령·원출력 1362행 | PASS |
| feature RULE-044 pass criteria present | 위 명령·원출력 1363행 | PASS |
| feature RULE-045 name present | 위 명령·원출력 1364행 | PASS |
| feature RULE-045 UI need 필요 | 위 명령·원출력 1365행 | PASS |
| feature RULE-045 test need 필요 | 위 명령·원출력 1366행 | PASS |
| feature RULE-045 test area assigned | 위 명령·원출력 1367행 | PASS |
| feature RULE-045 pass criteria present | 위 명령·원출력 1368행 | PASS |
| feature RULE-046 name present | 위 명령·원출력 1369행 | PASS |
| feature RULE-046 UI need 필요 | 위 명령·원출력 1370행 | PASS |
| feature RULE-046 test need 필요 | 위 명령·원출력 1371행 | PASS |
| feature RULE-046 test area assigned | 위 명령·원출력 1372행 | PASS |
| feature RULE-046 pass criteria present | 위 명령·원출력 1373행 | PASS |
| feature RULE-047 name present | 위 명령·원출력 1374행 | PASS |
| feature RULE-047 UI need 필요 | 위 명령·원출력 1375행 | PASS |
| feature RULE-047 test need 필요 | 위 명령·원출력 1376행 | PASS |
| feature RULE-047 test area assigned | 위 명령·원출력 1377행 | PASS |
| feature RULE-047 pass criteria present | 위 명령·원출력 1378행 | PASS |
| feature RULE-048 name present | 위 명령·원출력 1379행 | PASS |
| feature RULE-048 UI need 필요 | 위 명령·원출력 1380행 | PASS |
| feature RULE-048 test need 필요 | 위 명령·원출력 1381행 | PASS |
| feature RULE-048 test area assigned | 위 명령·원출력 1382행 | PASS |
| feature RULE-048 pass criteria present | 위 명령·원출력 1383행 | PASS |
| feature RULE-049 name present | 위 명령·원출력 1384행 | PASS |
| feature RULE-049 UI need 필요 | 위 명령·원출력 1385행 | PASS |
| feature RULE-049 test need 필요 | 위 명령·원출력 1386행 | PASS |
| feature RULE-049 test area assigned | 위 명령·원출력 1387행 | PASS |
| feature RULE-049 pass criteria present | 위 명령·원출력 1388행 | PASS |
| feature RULE-050 name present | 위 명령·원출력 1389행 | PASS |
| feature RULE-050 UI need 필요 | 위 명령·원출력 1390행 | PASS |
| feature RULE-050 test need 필요 | 위 명령·원출력 1391행 | PASS |
| feature RULE-050 test area assigned | 위 명령·원출력 1392행 | PASS |
| feature RULE-050 pass criteria present | 위 명령·원출력 1393행 | PASS |
| feature RULE-051 name present | 위 명령·원출력 1394행 | PASS |
| feature RULE-051 UI need 필요 | 위 명령·원출력 1395행 | PASS |
| feature RULE-051 test need 필요 | 위 명령·원출력 1396행 | PASS |
| feature RULE-051 test area assigned | 위 명령·원출력 1397행 | PASS |
| feature RULE-051 pass criteria present | 위 명령·원출력 1398행 | PASS |
| feature RULE-052 name present | 위 명령·원출력 1399행 | PASS |
| feature RULE-052 UI need 필요 | 위 명령·원출력 1400행 | PASS |
| feature RULE-052 test need 필요 | 위 명령·원출력 1401행 | PASS |
| feature RULE-052 test area assigned | 위 명령·원출력 1402행 | PASS |
| feature RULE-052 pass criteria present | 위 명령·원출력 1403행 | PASS |
| feature RULE-053 name present | 위 명령·원출력 1404행 | PASS |
| feature RULE-053 UI need 필요 | 위 명령·원출력 1405행 | PASS |
| feature RULE-053 test need 필요 | 위 명령·원출력 1406행 | PASS |
| feature RULE-053 test area assigned | 위 명령·원출력 1407행 | PASS |
| feature RULE-053 pass criteria present | 위 명령·원출력 1408행 | PASS |
| feature RULE-054 name present | 위 명령·원출력 1409행 | PASS |
| feature RULE-054 UI need 필요 | 위 명령·원출력 1410행 | PASS |
| feature RULE-054 test need 필요 | 위 명령·원출력 1411행 | PASS |
| feature RULE-054 test area assigned | 위 명령·원출력 1412행 | PASS |
| feature RULE-054 pass criteria present | 위 명령·원출력 1413행 | PASS |
| feature RULE-055 name present | 위 명령·원출력 1414행 | PASS |
| feature RULE-055 UI need 필요 | 위 명령·원출력 1415행 | PASS |
| feature RULE-055 test need 필요 | 위 명령·원출력 1416행 | PASS |
| feature RULE-055 test area assigned | 위 명령·원출력 1417행 | PASS |
| feature RULE-055 pass criteria present | 위 명령·원출력 1418행 | PASS |
| feature RULE-056 name present | 위 명령·원출력 1419행 | PASS |
| feature RULE-056 UI need 필요 | 위 명령·원출력 1420행 | PASS |
| feature RULE-056 test need 필요 | 위 명령·원출력 1421행 | PASS |
| feature RULE-056 test area assigned | 위 명령·원출력 1422행 | PASS |
| feature RULE-056 pass criteria present | 위 명령·원출력 1423행 | PASS |
| feature RULE-057 name present | 위 명령·원출력 1424행 | PASS |
| feature RULE-057 UI need 필요 | 위 명령·원출력 1425행 | PASS |
| feature RULE-057 test need 필요 | 위 명령·원출력 1426행 | PASS |
| feature RULE-057 test area assigned | 위 명령·원출력 1427행 | PASS |
| feature RULE-057 pass criteria present | 위 명령·원출력 1428행 | PASS |
| feature RULE-058 name present | 위 명령·원출력 1429행 | PASS |
| feature RULE-058 UI need 필요 | 위 명령·원출력 1430행 | PASS |
| feature RULE-058 test need 필요 | 위 명령·원출력 1431행 | PASS |
| feature RULE-058 test area assigned | 위 명령·원출력 1432행 | PASS |
| feature RULE-058 pass criteria present | 위 명령·원출력 1433행 | PASS |
| feature RULE-059 name present | 위 명령·원출력 1434행 | PASS |
| feature RULE-059 UI need 필요 | 위 명령·원출력 1435행 | PASS |
| feature RULE-059 test need 필요 | 위 명령·원출력 1436행 | PASS |
| feature RULE-059 test area assigned | 위 명령·원출력 1437행 | PASS |
| feature RULE-059 pass criteria present | 위 명령·원출력 1438행 | PASS |
| feature RULE-060 name present | 위 명령·원출력 1439행 | PASS |
| feature RULE-060 UI need 필요 | 위 명령·원출력 1440행 | PASS |
| feature RULE-060 test need 필요 | 위 명령·원출력 1441행 | PASS |
| feature RULE-060 test area assigned | 위 명령·원출력 1442행 | PASS |
| feature RULE-060 pass criteria present | 위 명령·원출력 1443행 | PASS |
| feature RULE-061 name present | 위 명령·원출력 1444행 | PASS |
| feature RULE-061 UI need 필요 | 위 명령·원출력 1445행 | PASS |
| feature RULE-061 test need 필요 | 위 명령·원출력 1446행 | PASS |
| feature RULE-061 test area assigned | 위 명령·원출력 1447행 | PASS |
| feature RULE-061 pass criteria present | 위 명령·원출력 1448행 | PASS |
| feature RULE-062 name present | 위 명령·원출력 1449행 | PASS |
| feature RULE-062 UI need 필요 | 위 명령·원출력 1450행 | PASS |
| feature RULE-062 test need 필요 | 위 명령·원출력 1451행 | PASS |
| feature RULE-062 test area assigned | 위 명령·원출력 1452행 | PASS |
| feature RULE-062 pass criteria present | 위 명령·원출력 1453행 | PASS |
| feature RULE-063 name present | 위 명령·원출력 1454행 | PASS |
| feature RULE-063 UI need 필요 | 위 명령·원출력 1455행 | PASS |
| feature RULE-063 test need 필요 | 위 명령·원출력 1456행 | PASS |
| feature RULE-063 test area assigned | 위 명령·원출력 1457행 | PASS |
| feature RULE-063 pass criteria present | 위 명령·원출력 1458행 | PASS |
| feature RULE-064 name present | 위 명령·원출력 1459행 | PASS |
| feature RULE-064 UI need 필요 | 위 명령·원출력 1460행 | PASS |
| feature RULE-064 test need 필요 | 위 명령·원출력 1461행 | PASS |
| feature RULE-064 test area assigned | 위 명령·원출력 1462행 | PASS |
| feature RULE-064 pass criteria present | 위 명령·원출력 1463행 | PASS |
| feature RULE-065 name present | 위 명령·원출력 1464행 | PASS |
| feature RULE-065 UI need 필요 | 위 명령·원출력 1465행 | PASS |
| feature RULE-065 test need 필요 | 위 명령·원출력 1466행 | PASS |
| feature RULE-065 test area assigned | 위 명령·원출력 1467행 | PASS |
| feature RULE-065 pass criteria present | 위 명령·원출력 1468행 | PASS |
| feature RULE-066 name present | 위 명령·원출력 1469행 | PASS |
| feature RULE-066 UI need 필요 | 위 명령·원출력 1470행 | PASS |
| feature RULE-066 test need 필요 | 위 명령·원출력 1471행 | PASS |
| feature RULE-066 test area assigned | 위 명령·원출력 1472행 | PASS |
| feature RULE-066 pass criteria present | 위 명령·원출력 1473행 | PASS |
| feature RULE-067 name present | 위 명령·원출력 1474행 | PASS |
| feature RULE-067 UI need 필요 | 위 명령·원출력 1475행 | PASS |
| feature RULE-067 test need 필요 | 위 명령·원출력 1476행 | PASS |
| feature RULE-067 test area assigned | 위 명령·원출력 1477행 | PASS |
| feature RULE-067 pass criteria present | 위 명령·원출력 1478행 | PASS |
| feature RULE-068 name present | 위 명령·원출력 1479행 | PASS |
| feature RULE-068 UI need 필요 | 위 명령·원출력 1480행 | PASS |
| feature RULE-068 test need 필요 | 위 명령·원출력 1481행 | PASS |
| feature RULE-068 test area assigned | 위 명령·원출력 1482행 | PASS |
| feature RULE-068 pass criteria present | 위 명령·원출력 1483행 | PASS |
| feature RULE-069 name present | 위 명령·원출력 1484행 | PASS |
| feature RULE-069 UI need 필요 | 위 명령·원출력 1485행 | PASS |
| feature RULE-069 test need 필요 | 위 명령·원출력 1486행 | PASS |
| feature RULE-069 test area assigned | 위 명령·원출력 1487행 | PASS |
| feature RULE-069 pass criteria present | 위 명령·원출력 1488행 | PASS |
| feature RULE-070 name present | 위 명령·원출력 1489행 | PASS |
| feature RULE-070 UI need 필요 | 위 명령·원출력 1490행 | PASS |
| feature RULE-070 test need 필요 | 위 명령·원출력 1491행 | PASS |
| feature RULE-070 test area assigned | 위 명령·원출력 1492행 | PASS |
| feature RULE-070 pass criteria present | 위 명령·원출력 1493행 | PASS |
| feature RULE-071 name present | 위 명령·원출력 1494행 | PASS |
| feature RULE-071 UI need 필요 | 위 명령·원출력 1495행 | PASS |
| feature RULE-071 test need 필요 | 위 명령·원출력 1496행 | PASS |
| feature RULE-071 test area assigned | 위 명령·원출력 1497행 | PASS |
| feature RULE-071 pass criteria present | 위 명령·원출력 1498행 | PASS |
| feature RULE-072 name present | 위 명령·원출력 1499행 | PASS |
| feature RULE-072 UI need 필요 | 위 명령·원출력 1500행 | PASS |
| feature RULE-072 test need 필요 | 위 명령·원출력 1501행 | PASS |
| feature RULE-072 test area assigned | 위 명령·원출력 1502행 | PASS |
| feature RULE-072 pass criteria present | 위 명령·원출력 1503행 | PASS |
| feature RULE-073 name present | 위 명령·원출력 1504행 | PASS |
| feature RULE-073 UI need 필요 | 위 명령·원출력 1505행 | PASS |
| feature RULE-073 test need 필요 | 위 명령·원출력 1506행 | PASS |
| feature RULE-073 test area assigned | 위 명령·원출력 1507행 | PASS |
| feature RULE-073 pass criteria present | 위 명령·원출력 1508행 | PASS |
| feature RULE-074 name present | 위 명령·원출력 1509행 | PASS |
| feature RULE-074 UI need 필요 | 위 명령·원출력 1510행 | PASS |
| feature RULE-074 test need 필요 | 위 명령·원출력 1511행 | PASS |
| feature RULE-074 test area assigned | 위 명령·원출력 1512행 | PASS |
| feature RULE-074 pass criteria present | 위 명령·원출력 1513행 | PASS |
| feature RULE-075 name present | 위 명령·원출력 1514행 | PASS |
| feature RULE-075 UI need 필요 | 위 명령·원출력 1515행 | PASS |
| feature RULE-075 test need 필요 | 위 명령·원출력 1516행 | PASS |
| feature RULE-075 test area assigned | 위 명령·원출력 1517행 | PASS |
| feature RULE-075 pass criteria present | 위 명령·원출력 1518행 | PASS |
| feature RULE-076 name present | 위 명령·원출력 1519행 | PASS |
| feature RULE-076 UI need 필요 | 위 명령·원출력 1520행 | PASS |
| feature RULE-076 test need 필요 | 위 명령·원출력 1521행 | PASS |
| feature RULE-076 test area assigned | 위 명령·원출력 1522행 | PASS |
| feature RULE-076 pass criteria present | 위 명령·원출력 1523행 | PASS |
| feature RULE-077 name present | 위 명령·원출력 1524행 | PASS |
| feature RULE-077 UI need 필요 | 위 명령·원출력 1525행 | PASS |
| feature RULE-077 test need 필요 | 위 명령·원출력 1526행 | PASS |
| feature RULE-077 test area assigned | 위 명령·원출력 1527행 | PASS |
| feature RULE-077 pass criteria present | 위 명령·원출력 1528행 | PASS |
| feature RULE-078 name present | 위 명령·원출력 1529행 | PASS |
| feature RULE-078 UI need 필요 | 위 명령·원출력 1530행 | PASS |
| feature RULE-078 test need 필요 | 위 명령·원출력 1531행 | PASS |
| feature RULE-078 test area assigned | 위 명령·원출력 1532행 | PASS |
| feature RULE-078 pass criteria present | 위 명령·원출력 1533행 | PASS |
| feature RULE-079 name present | 위 명령·원출력 1534행 | PASS |
| feature RULE-079 UI need 필요 | 위 명령·원출력 1535행 | PASS |
| feature RULE-079 test need 필요 | 위 명령·원출력 1536행 | PASS |
| feature RULE-079 test area assigned | 위 명령·원출력 1537행 | PASS |
| feature RULE-079 pass criteria present | 위 명령·원출력 1538행 | PASS |
| feature RULE-080 name present | 위 명령·원출력 1539행 | PASS |
| feature RULE-080 UI need 필요 | 위 명령·원출력 1540행 | PASS |
| feature RULE-080 test need 필요 | 위 명령·원출력 1541행 | PASS |
| feature RULE-080 test area assigned | 위 명령·원출력 1542행 | PASS |
| feature RULE-080 pass criteria present | 위 명령·원출력 1543행 | PASS |
| feature RULE-081 name present | 위 명령·원출력 1544행 | PASS |
| feature RULE-081 UI need 필요 | 위 명령·원출력 1545행 | PASS |
| feature RULE-081 test need 필요 | 위 명령·원출력 1546행 | PASS |
| feature RULE-081 test area assigned | 위 명령·원출력 1547행 | PASS |
| feature RULE-081 pass criteria present | 위 명령·원출력 1548행 | PASS |
| feature RULE-082 name present | 위 명령·원출력 1549행 | PASS |
| feature RULE-082 UI need 필요 | 위 명령·원출력 1550행 | PASS |
| feature RULE-082 test need 필요 | 위 명령·원출력 1551행 | PASS |
| feature RULE-082 test area assigned | 위 명령·원출력 1552행 | PASS |
| feature RULE-082 pass criteria present | 위 명령·원출력 1553행 | PASS |
| feature RULE-083 name present | 위 명령·원출력 1554행 | PASS |
| feature RULE-083 UI need 필요 | 위 명령·원출력 1555행 | PASS |
| feature RULE-083 test need 필요 | 위 명령·원출력 1556행 | PASS |
| feature RULE-083 test area assigned | 위 명령·원출력 1557행 | PASS |
| feature RULE-083 pass criteria present | 위 명령·원출력 1558행 | PASS |
| feature RULE-084 name present | 위 명령·원출력 1559행 | PASS |
| feature RULE-084 UI need 필요 | 위 명령·원출력 1560행 | PASS |
| feature RULE-084 test need 필요 | 위 명령·원출력 1561행 | PASS |
| feature RULE-084 test area assigned | 위 명령·원출력 1562행 | PASS |
| feature RULE-084 pass criteria present | 위 명령·원출력 1563행 | PASS |
| feature RULE-085 name present | 위 명령·원출력 1564행 | PASS |
| feature RULE-085 UI need 필요 | 위 명령·원출력 1565행 | PASS |
| feature RULE-085 test need 필요 | 위 명령·원출력 1566행 | PASS |
| feature RULE-085 test area assigned | 위 명령·원출력 1567행 | PASS |
| feature RULE-085 pass criteria present | 위 명령·원출력 1568행 | PASS |
| feature RULE-086 name present | 위 명령·원출력 1569행 | PASS |
| feature RULE-086 UI need 필요 | 위 명령·원출력 1570행 | PASS |
| feature RULE-086 test need 필요 | 위 명령·원출력 1571행 | PASS |
| feature RULE-086 test area assigned | 위 명령·원출력 1572행 | PASS |
| feature RULE-086 pass criteria present | 위 명령·원출력 1573행 | PASS |
| feature RULE-087 name present | 위 명령·원출력 1574행 | PASS |
| feature RULE-087 UI need 필요 | 위 명령·원출력 1575행 | PASS |
| feature RULE-087 test need 필요 | 위 명령·원출력 1576행 | PASS |
| feature RULE-087 test area assigned | 위 명령·원출력 1577행 | PASS |
| feature RULE-087 pass criteria present | 위 명령·원출력 1578행 | PASS |
| feature RULE-088 name present | 위 명령·원출력 1579행 | PASS |
| feature RULE-088 UI need 필요 | 위 명령·원출력 1580행 | PASS |
| feature RULE-088 test need 필요 | 위 명령·원출력 1581행 | PASS |
| feature RULE-088 test area assigned | 위 명령·원출력 1582행 | PASS |
| feature RULE-088 pass criteria present | 위 명령·원출력 1583행 | PASS |
| feature RULE-089 name present | 위 명령·원출력 1584행 | PASS |
| feature RULE-089 UI need 필요 | 위 명령·원출력 1585행 | PASS |
| feature RULE-089 test need 필요 | 위 명령·원출력 1586행 | PASS |
| feature RULE-089 test area assigned | 위 명령·원출력 1587행 | PASS |
| feature RULE-089 pass criteria present | 위 명령·원출력 1588행 | PASS |
| feature RULE-090 name present | 위 명령·원출력 1589행 | PASS |
| feature RULE-090 UI need 필요 | 위 명령·원출력 1590행 | PASS |
| feature RULE-090 test need 필요 | 위 명령·원출력 1591행 | PASS |
| feature RULE-090 test area assigned | 위 명령·원출력 1592행 | PASS |
| feature RULE-090 pass criteria present | 위 명령·원출력 1593행 | PASS |
| feature RULE-091 name present | 위 명령·원출력 1594행 | PASS |
| feature RULE-091 UI need 필요 | 위 명령·원출력 1595행 | PASS |
| feature RULE-091 test need 필요 | 위 명령·원출력 1596행 | PASS |
| feature RULE-091 test area assigned | 위 명령·원출력 1597행 | PASS |
| feature RULE-091 pass criteria present | 위 명령·원출력 1598행 | PASS |
| feature RULE-092 name present | 위 명령·원출력 1599행 | PASS |
| feature RULE-092 UI need 필요 | 위 명령·원출력 1600행 | PASS |
| feature RULE-092 test need 필요 | 위 명령·원출력 1601행 | PASS |
| feature RULE-092 test area assigned | 위 명령·원출력 1602행 | PASS |
| feature RULE-092 pass criteria present | 위 명령·원출력 1603행 | PASS |
| feature RULE-093 name present | 위 명령·원출력 1604행 | PASS |
| feature RULE-093 UI need 필요 | 위 명령·원출력 1605행 | PASS |
| feature RULE-093 test need 필요 | 위 명령·원출력 1606행 | PASS |
| feature RULE-093 test area assigned | 위 명령·원출력 1607행 | PASS |
| feature RULE-093 pass criteria present | 위 명령·원출력 1608행 | PASS |
| feature RULE-094 name present | 위 명령·원출력 1609행 | PASS |
| feature RULE-094 UI need 필요 | 위 명령·원출력 1610행 | PASS |
| feature RULE-094 test need 필요 | 위 명령·원출력 1611행 | PASS |
| feature RULE-094 test area assigned | 위 명령·원출력 1612행 | PASS |
| feature RULE-094 pass criteria present | 위 명령·원출력 1613행 | PASS |
| feature RULE-095 name present | 위 명령·원출력 1614행 | PASS |
| feature RULE-095 UI need 필요 | 위 명령·원출력 1615행 | PASS |
| feature RULE-095 test need 필요 | 위 명령·원출력 1616행 | PASS |
| feature RULE-095 test area assigned | 위 명령·원출력 1617행 | PASS |
| feature RULE-095 pass criteria present | 위 명령·원출력 1618행 | PASS |
| feature RULE-096 name present | 위 명령·원출력 1619행 | PASS |
| feature RULE-096 UI need 필요 | 위 명령·원출력 1620행 | PASS |
| feature RULE-096 test need 필요 | 위 명령·원출력 1621행 | PASS |
| feature RULE-096 test area assigned | 위 명령·원출력 1622행 | PASS |
| feature RULE-096 pass criteria present | 위 명령·원출력 1623행 | PASS |
| feature RULE-097 name present | 위 명령·원출력 1624행 | PASS |
| feature RULE-097 UI need 필요 | 위 명령·원출력 1625행 | PASS |
| feature RULE-097 test need 필요 | 위 명령·원출력 1626행 | PASS |
| feature RULE-097 test area assigned | 위 명령·원출력 1627행 | PASS |
| feature RULE-097 pass criteria present | 위 명령·원출력 1628행 | PASS |
| feature RULE-098 name present | 위 명령·원출력 1629행 | PASS |
| feature RULE-098 UI need 필요 | 위 명령·원출력 1630행 | PASS |
| feature RULE-098 test need 필요 | 위 명령·원출력 1631행 | PASS |
| feature RULE-098 test area assigned | 위 명령·원출력 1632행 | PASS |
| feature RULE-098 pass criteria present | 위 명령·원출력 1633행 | PASS |
| feature RULE-099 name present | 위 명령·원출력 1634행 | PASS |
| feature RULE-099 UI need 간접 | 위 명령·원출력 1635행 | PASS |
| feature RULE-099 test need 필요 | 위 명령·원출력 1636행 | PASS |
| feature RULE-099 test area assigned | 위 명령·원출력 1637행 | PASS |
| feature RULE-099 pass criteria present | 위 명령·원출력 1638행 | PASS |
| feature RULE-100 name present | 위 명령·원출력 1639행 | PASS |
| feature RULE-100 UI need 필요 | 위 명령·원출력 1640행 | PASS |
| feature RULE-100 test need 필요 | 위 명령·원출력 1641행 | PASS |
| feature RULE-100 test area assigned | 위 명령·원출력 1642행 | PASS |
| feature RULE-100 pass criteria present | 위 명령·원출력 1643행 | PASS |
| feature RULE-101 name present | 위 명령·원출력 1644행 | PASS |
| feature RULE-101 UI need 필요 | 위 명령·원출력 1645행 | PASS |
| feature RULE-101 test need 필요 | 위 명령·원출력 1646행 | PASS |
| feature RULE-101 test area assigned | 위 명령·원출력 1647행 | PASS |
| feature RULE-101 pass criteria present | 위 명령·원출력 1648행 | PASS |
| feature RULE-102 name present | 위 명령·원출력 1649행 | PASS |
| feature RULE-102 UI need 필요 | 위 명령·원출력 1650행 | PASS |
| feature RULE-102 test need 필요 | 위 명령·원출력 1651행 | PASS |
| feature RULE-102 test area assigned | 위 명령·원출력 1652행 | PASS |
| feature RULE-102 pass criteria present | 위 명령·원출력 1653행 | PASS |
| feature RULE-103 name present | 위 명령·원출력 1654행 | PASS |
| feature RULE-103 UI need 필요 | 위 명령·원출력 1655행 | PASS |
| feature RULE-103 test need 필요 | 위 명령·원출력 1656행 | PASS |
| feature RULE-103 test area assigned | 위 명령·원출력 1657행 | PASS |
| feature RULE-103 pass criteria present | 위 명령·원출력 1658행 | PASS |
| feature RULE-104 name present | 위 명령·원출력 1659행 | PASS |
| feature RULE-104 UI need 필요 | 위 명령·원출력 1660행 | PASS |
| feature RULE-104 test need 필요 | 위 명령·원출력 1661행 | PASS |
| feature RULE-104 test area assigned | 위 명령·원출력 1662행 | PASS |
| feature RULE-104 pass criteria present | 위 명령·원출력 1663행 | PASS |
| feature RULE-105 name present | 위 명령·원출력 1664행 | PASS |
| feature RULE-105 UI need 비대상 | 위 명령·원출력 1665행 | PASS |
| feature RULE-105 test need 필요 | 위 명령·원출력 1666행 | PASS |
| feature RULE-105 test area assigned | 위 명령·원출력 1667행 | PASS |
| feature RULE-105 pass criteria present | 위 명령·원출력 1668행 | PASS |
| feature RULE-106 name present | 위 명령·원출력 1669행 | PASS |
| feature RULE-106 UI need 비대상 | 위 명령·원출력 1670행 | PASS |
| feature RULE-106 test need 필요 | 위 명령·원출력 1671행 | PASS |
| feature RULE-106 test area assigned | 위 명령·원출력 1672행 | PASS |
| feature RULE-106 pass criteria present | 위 명령·원출력 1673행 | PASS |
| feature RULE-107 name present | 위 명령·원출력 1674행 | PASS |
| feature RULE-107 UI need 비대상 | 위 명령·원출력 1675행 | PASS |
| feature RULE-107 test need 필요 | 위 명령·원출력 1676행 | PASS |
| feature RULE-107 test area assigned | 위 명령·원출력 1677행 | PASS |
| feature RULE-107 pass criteria present | 위 명령·원출력 1678행 | PASS |
| feature RULE-108 name present | 위 명령·원출력 1679행 | PASS |
| feature RULE-108 UI need 비대상 | 위 명령·원출력 1680행 | PASS |
| feature RULE-108 test need 필요 | 위 명령·원출력 1681행 | PASS |
| feature RULE-108 test area assigned | 위 명령·원출력 1682행 | PASS |
| feature RULE-108 pass criteria present | 위 명령·원출력 1683행 | PASS |
| feature RULE-109 name present | 위 명령·원출력 1684행 | PASS |
| feature RULE-109 UI need 비대상 | 위 명령·원출력 1685행 | PASS |
| feature RULE-109 test need 필요 | 위 명령·원출력 1686행 | PASS |
| feature RULE-109 test area assigned | 위 명령·원출력 1687행 | PASS |
| feature RULE-109 pass criteria present | 위 명령·원출력 1688행 | PASS |
| feature RULE-110 name present | 위 명령·원출력 1689행 | PASS |
| feature RULE-110 UI need 비대상 | 위 명령·원출력 1690행 | PASS |
| feature RULE-110 test need 필요 | 위 명령·원출력 1691행 | PASS |
| feature RULE-110 test area assigned | 위 명령·원출력 1692행 | PASS |
| feature RULE-110 pass criteria present | 위 명령·원출력 1693행 | PASS |
| feature RULE-111 name present | 위 명령·원출력 1694행 | PASS |
| feature RULE-111 UI need 필요 | 위 명령·원출력 1695행 | PASS |
| feature RULE-111 test need 필요 | 위 명령·원출력 1696행 | PASS |
| feature RULE-111 test area assigned | 위 명령·원출력 1697행 | PASS |
| feature RULE-111 pass criteria present | 위 명령·원출력 1698행 | PASS |
| feature RULE-112 name present | 위 명령·원출력 1699행 | PASS |
| feature RULE-112 UI need 간접 | 위 명령·원출력 1700행 | PASS |
| feature RULE-112 test need 필요 | 위 명령·원출력 1701행 | PASS |
| feature RULE-112 test area assigned | 위 명령·원출력 1702행 | PASS |
| feature RULE-112 pass criteria present | 위 명령·원출력 1703행 | PASS |
| feature EVT-001 name present | 위 명령·원출력 1704행 | PASS |
| feature EVT-001 UI need 필요 | 위 명령·원출력 1705행 | PASS |
| feature EVT-001 test need 필요 | 위 명령·원출력 1706행 | PASS |
| feature EVT-001 test area assigned | 위 명령·원출력 1707행 | PASS |
| feature EVT-001 pass criteria present | 위 명령·원출력 1708행 | PASS |
| feature EVT-002 name present | 위 명령·원출력 1709행 | PASS |
| feature EVT-002 UI need 비대상 | 위 명령·원출력 1710행 | PASS |
| feature EVT-002 test need 필요 | 위 명령·원출력 1711행 | PASS |
| feature EVT-002 test area assigned | 위 명령·원출력 1712행 | PASS |
| feature EVT-002 pass criteria present | 위 명령·원출력 1713행 | PASS |
| feature EVT-003 name present | 위 명령·원출력 1714행 | PASS |
| feature EVT-003 UI need 필요 | 위 명령·원출력 1715행 | PASS |
| feature EVT-003 test need 필요 | 위 명령·원출력 1716행 | PASS |
| feature EVT-003 test area assigned | 위 명령·원출력 1717행 | PASS |
| feature EVT-003 pass criteria present | 위 명령·원출력 1718행 | PASS |
| feature EVT-004 name present | 위 명령·원출력 1719행 | PASS |
| feature EVT-004 UI need 필요 | 위 명령·원출력 1720행 | PASS |
| feature EVT-004 test need 필요 | 위 명령·원출력 1721행 | PASS |
| feature EVT-004 test area assigned | 위 명령·원출력 1722행 | PASS |
| feature EVT-004 pass criteria present | 위 명령·원출력 1723행 | PASS |
| feature EVT-005 name present | 위 명령·원출력 1724행 | PASS |
| feature EVT-005 UI need 간접 | 위 명령·원출력 1725행 | PASS |
| feature EVT-005 test need 필요 | 위 명령·원출력 1726행 | PASS |
| feature EVT-005 test area assigned | 위 명령·원출력 1727행 | PASS |
| feature EVT-005 pass criteria present | 위 명령·원출력 1728행 | PASS |
| feature EVT-006 name present | 위 명령·원출력 1729행 | PASS |
| feature EVT-006 UI need 간접 | 위 명령·원출력 1730행 | PASS |
| feature EVT-006 test need 필요 | 위 명령·원출력 1731행 | PASS |
| feature EVT-006 test area assigned | 위 명령·원출력 1732행 | PASS |
| feature EVT-006 pass criteria present | 위 명령·원출력 1733행 | PASS |
| feature EVT-007 name present | 위 명령·원출력 1734행 | PASS |
| feature EVT-007 UI need 필요 | 위 명령·원출력 1735행 | PASS |
| feature EVT-007 test need 필요 | 위 명령·원출력 1736행 | PASS |
| feature EVT-007 test area assigned | 위 명령·원출력 1737행 | PASS |
| feature EVT-007 pass criteria present | 위 명령·원출력 1738행 | PASS |
| feature EVT-008 name present | 위 명령·원출력 1739행 | PASS |
| feature EVT-008 UI need 비대상 | 위 명령·원출력 1740행 | PASS |
| feature EVT-008 test need 필요 | 위 명령·원출력 1741행 | PASS |
| feature EVT-008 test area assigned | 위 명령·원출력 1742행 | PASS |
| feature EVT-008 pass criteria present | 위 명령·원출력 1743행 | PASS |
| feature EVT-009 name present | 위 명령·원출력 1744행 | PASS |
| feature EVT-009 UI need 비대상 | 위 명령·원출력 1745행 | PASS |
| feature EVT-009 test need 필요 | 위 명령·원출력 1746행 | PASS |
| feature EVT-009 test area assigned | 위 명령·원출력 1747행 | PASS |
| feature EVT-009 pass criteria present | 위 명령·원출력 1748행 | PASS |
| feature EVT-010 name present | 위 명령·원출력 1749행 | PASS |
| feature EVT-010 UI need 비대상 | 위 명령·원출력 1750행 | PASS |
| feature EVT-010 test need 필요 | 위 명령·원출력 1751행 | PASS |
| feature EVT-010 test area assigned | 위 명령·원출력 1752행 | PASS |
| feature EVT-010 pass criteria present | 위 명령·원출력 1753행 | PASS |
| feature EVT-011 name present | 위 명령·원출력 1754행 | PASS |
| feature EVT-011 UI need 비대상 | 위 명령·원출력 1755행 | PASS |
| feature EVT-011 test need 필요 | 위 명령·원출력 1756행 | PASS |
| feature EVT-011 test area assigned | 위 명령·원출력 1757행 | PASS |
| feature EVT-011 pass criteria present | 위 명령·원출력 1758행 | PASS |
| feature EVT-012 name present | 위 명령·원출력 1759행 | PASS |
| feature EVT-012 UI need 비대상 | 위 명령·원출력 1760행 | PASS |
| feature EVT-012 test need 필요 | 위 명령·원출력 1761행 | PASS |
| feature EVT-012 test area assigned | 위 명령·원출력 1762행 | PASS |
| feature EVT-012 pass criteria present | 위 명령·원출력 1763행 | PASS |
| feature EVT-013 name present | 위 명령·원출력 1764행 | PASS |
| feature EVT-013 UI need 비대상 | 위 명령·원출력 1765행 | PASS |
| feature EVT-013 test need 필요 | 위 명령·원출력 1766행 | PASS |
| feature EVT-013 test area assigned | 위 명령·원출력 1767행 | PASS |
| feature EVT-013 pass criteria present | 위 명령·원출력 1768행 | PASS |
| feature EVT-014 name present | 위 명령·원출력 1769행 | PASS |
| feature EVT-014 UI need 간접 | 위 명령·원출력 1770행 | PASS |
| feature EVT-014 test need 필요 | 위 명령·원출력 1771행 | PASS |
| feature EVT-014 test area assigned | 위 명령·원출력 1772행 | PASS |
| feature EVT-014 pass criteria present | 위 명령·원출력 1773행 | PASS |
| feature EVT-015 name present | 위 명령·원출력 1774행 | PASS |
| feature EVT-015 UI need 비대상 | 위 명령·원출력 1775행 | PASS |
| feature EVT-015 test need 필요 | 위 명령·원출력 1776행 | PASS |
| feature EVT-015 test area assigned | 위 명령·원출력 1777행 | PASS |
| feature EVT-015 pass criteria present | 위 명령·원출력 1778행 | PASS |
| feature EVT-016 name present | 위 명령·원출력 1779행 | PASS |
| feature EVT-016 UI need 필요 | 위 명령·원출력 1780행 | PASS |
| feature EVT-016 test need 필요 | 위 명령·원출력 1781행 | PASS |
| feature EVT-016 test area assigned | 위 명령·원출력 1782행 | PASS |
| feature EVT-016 pass criteria present | 위 명령·원출력 1783행 | PASS |
| feature EVT-017 name present | 위 명령·원출력 1784행 | PASS |
| feature EVT-017 UI need 필요 | 위 명령·원출력 1785행 | PASS |
| feature EVT-017 test need 필요 | 위 명령·원출력 1786행 | PASS |
| feature EVT-017 test area assigned | 위 명령·원출력 1787행 | PASS |
| feature EVT-017 pass criteria present | 위 명령·원출력 1788행 | PASS |
| feature EVT-018 name present | 위 명령·원출력 1789행 | PASS |
| feature EVT-018 UI need 필요 | 위 명령·원출력 1790행 | PASS |
| feature EVT-018 test need 필요 | 위 명령·원출력 1791행 | PASS |
| feature EVT-018 test area assigned | 위 명령·원출력 1792행 | PASS |
| feature EVT-018 pass criteria present | 위 명령·원출력 1793행 | PASS |
| feature EVT-019 name present | 위 명령·원출력 1794행 | PASS |
| feature EVT-019 UI need 필요 | 위 명령·원출력 1795행 | PASS |
| feature EVT-019 test need 필요 | 위 명령·원출력 1796행 | PASS |
| feature EVT-019 test area assigned | 위 명령·원출력 1797행 | PASS |
| feature EVT-019 pass criteria present | 위 명령·원출력 1798행 | PASS |
| feature EVT-020 name present | 위 명령·원출력 1799행 | PASS |
| feature EVT-020 UI need 필요 | 위 명령·원출력 1800행 | PASS |
| feature EVT-020 test need 필요 | 위 명령·원출력 1801행 | PASS |
| feature EVT-020 test area assigned | 위 명령·원출력 1802행 | PASS |
| feature EVT-020 pass criteria present | 위 명령·원출력 1803행 | PASS |
| feature EVT-021 name present | 위 명령·원출력 1804행 | PASS |
| feature EVT-021 UI need 필요 | 위 명령·원출력 1805행 | PASS |
| feature EVT-021 test need 필요 | 위 명령·원출력 1806행 | PASS |
| feature EVT-021 test area assigned | 위 명령·원출력 1807행 | PASS |
| feature EVT-021 pass criteria present | 위 명령·원출력 1808행 | PASS |
| feature EVT-022 name present | 위 명령·원출력 1809행 | PASS |
| feature EVT-022 UI need 필요 | 위 명령·원출력 1810행 | PASS |
| feature EVT-022 test need 필요 | 위 명령·원출력 1811행 | PASS |
| feature EVT-022 test area assigned | 위 명령·원출력 1812행 | PASS |
| feature EVT-022 pass criteria present | 위 명령·원출력 1813행 | PASS |
| feature EVT-023 name present | 위 명령·원출력 1814행 | PASS |
| feature EVT-023 UI need 필요 | 위 명령·원출력 1815행 | PASS |
| feature EVT-023 test need 필요 | 위 명령·원출력 1816행 | PASS |
| feature EVT-023 test area assigned | 위 명령·원출력 1817행 | PASS |
| feature EVT-023 pass criteria present | 위 명령·원출력 1818행 | PASS |
| feature EVT-024 name present | 위 명령·원출력 1819행 | PASS |
| feature EVT-024 UI need 필요 | 위 명령·원출력 1820행 | PASS |
| feature EVT-024 test need 필요 | 위 명령·원출력 1821행 | PASS |
| feature EVT-024 test area assigned | 위 명령·원출력 1822행 | PASS |
| feature EVT-024 pass criteria present | 위 명령·원출력 1823행 | PASS |
| feature EVT-025 name present | 위 명령·원출력 1824행 | PASS |
| feature EVT-025 UI need 필요 | 위 명령·원출력 1825행 | PASS |
| feature EVT-025 test need 필요 | 위 명령·원출력 1826행 | PASS |
| feature EVT-025 test area assigned | 위 명령·원출력 1827행 | PASS |
| feature EVT-025 pass criteria present | 위 명령·원출력 1828행 | PASS |
| feature EVT-026 name present | 위 명령·원출력 1829행 | PASS |
| feature EVT-026 UI need 필요 | 위 명령·원출력 1830행 | PASS |
| feature EVT-026 test need 필요 | 위 명령·원출력 1831행 | PASS |
| feature EVT-026 test area assigned | 위 명령·원출력 1832행 | PASS |
| feature EVT-026 pass criteria present | 위 명령·원출력 1833행 | PASS |
| feature EVT-027 name present | 위 명령·원출력 1834행 | PASS |
| feature EVT-027 UI need 비대상 | 위 명령·원출력 1835행 | PASS |
| feature EVT-027 test need 필요 | 위 명령·원출력 1836행 | PASS |
| feature EVT-027 test area assigned | 위 명령·원출력 1837행 | PASS |
| feature EVT-027 pass criteria present | 위 명령·원출력 1838행 | PASS |
| feature EVT-028 name present | 위 명령·원출력 1839행 | PASS |
| feature EVT-028 UI need 필요 | 위 명령·원출력 1840행 | PASS |
| feature EVT-028 test need 필요 | 위 명령·원출력 1841행 | PASS |
| feature EVT-028 test area assigned | 위 명령·원출력 1842행 | PASS |
| feature EVT-028 pass criteria present | 위 명령·원출력 1843행 | PASS |
| feature EVT-029 name present | 위 명령·원출력 1844행 | PASS |
| feature EVT-029 UI need 비대상 | 위 명령·원출력 1845행 | PASS |
| feature EVT-029 test need 필요 | 위 명령·원출력 1846행 | PASS |
| feature EVT-029 test area assigned | 위 명령·원출력 1847행 | PASS |
| feature EVT-029 pass criteria present | 위 명령·원출력 1848행 | PASS |
| feature EVT-030 name present | 위 명령·원출력 1849행 | PASS |
| feature EVT-030 UI need 필요 | 위 명령·원출력 1850행 | PASS |
| feature EVT-030 test need 필요 | 위 명령·원출력 1851행 | PASS |
| feature EVT-030 test area assigned | 위 명령·원출력 1852행 | PASS |
| feature EVT-030 pass criteria present | 위 명령·원출력 1853행 | PASS |
| feature EVT-031 name present | 위 명령·원출력 1854행 | PASS |
| feature EVT-031 UI need 필요 | 위 명령·원출력 1855행 | PASS |
| feature EVT-031 test need 필요 | 위 명령·원출력 1856행 | PASS |
| feature EVT-031 test area assigned | 위 명령·원출력 1857행 | PASS |
| feature EVT-031 pass criteria present | 위 명령·원출력 1858행 | PASS |
| feature EVT-032 name present | 위 명령·원출력 1859행 | PASS |
| feature EVT-032 UI need 비대상 | 위 명령·원출력 1860행 | PASS |
| feature EVT-032 test need 필요 | 위 명령·원출력 1861행 | PASS |
| feature EVT-032 test area assigned | 위 명령·원출력 1862행 | PASS |
| feature EVT-032 pass criteria present | 위 명령·원출력 1863행 | PASS |
| feature EVT-033 name present | 위 명령·원출력 1864행 | PASS |
| feature EVT-033 UI need 비대상 | 위 명령·원출력 1865행 | PASS |
| feature EVT-033 test need 필요 | 위 명령·원출력 1866행 | PASS |
| feature EVT-033 test area assigned | 위 명령·원출력 1867행 | PASS |
| feature EVT-033 pass criteria present | 위 명령·원출력 1868행 | PASS |
| feature EVT-034 name present | 위 명령·원출력 1869행 | PASS |
| feature EVT-034 UI need 비대상 | 위 명령·원출력 1870행 | PASS |
| feature EVT-034 test need 필요 | 위 명령·원출력 1871행 | PASS |
| feature EVT-034 test area assigned | 위 명령·원출력 1872행 | PASS |
| feature EVT-034 pass criteria present | 위 명령·원출력 1873행 | PASS |
| feature EVT-035 name present | 위 명령·원출력 1874행 | PASS |
| feature EVT-035 UI need 간접 | 위 명령·원출력 1875행 | PASS |
| feature EVT-035 test need 필요 | 위 명령·원출력 1876행 | PASS |
| feature EVT-035 test area assigned | 위 명령·원출력 1877행 | PASS |
| feature EVT-035 pass criteria present | 위 명령·원출력 1878행 | PASS |
| feature EVT-036 name present | 위 명령·원출력 1879행 | PASS |
| feature EVT-036 UI need 간접 | 위 명령·원출력 1880행 | PASS |
| feature EVT-036 test need 필요 | 위 명령·원출력 1881행 | PASS |
| feature EVT-036 test area assigned | 위 명령·원출력 1882행 | PASS |
| feature EVT-036 pass criteria present | 위 명령·원출력 1883행 | PASS |
| feature EVT-037 name present | 위 명령·원출력 1884행 | PASS |
| feature EVT-037 UI need 필요 | 위 명령·원출력 1885행 | PASS |
| feature EVT-037 test need 필요 | 위 명령·원출력 1886행 | PASS |
| feature EVT-037 test area assigned | 위 명령·원출력 1887행 | PASS |
| feature EVT-037 pass criteria present | 위 명령·원출력 1888행 | PASS |
| feature EVT-038 name present | 위 명령·원출력 1889행 | PASS |
| feature EVT-038 UI need 필요 | 위 명령·원출력 1890행 | PASS |
| feature EVT-038 test need 필요 | 위 명령·원출력 1891행 | PASS |
| feature EVT-038 test area assigned | 위 명령·원출력 1892행 | PASS |
| feature EVT-038 pass criteria present | 위 명령·원출력 1893행 | PASS |
| feature EVT-039 name present | 위 명령·원출력 1894행 | PASS |
| feature EVT-039 UI need 비대상 | 위 명령·원출력 1895행 | PASS |
| feature EVT-039 test need 필요 | 위 명령·원출력 1896행 | PASS |
| feature EVT-039 test area assigned | 위 명령·원출력 1897행 | PASS |
| feature EVT-039 pass criteria present | 위 명령·원출력 1898행 | PASS |
| feature EVT-040 name present | 위 명령·원출력 1899행 | PASS |
| feature EVT-040 UI need 비대상 | 위 명령·원출력 1900행 | PASS |
| feature EVT-040 test need 필요 | 위 명령·원출력 1901행 | PASS |
| feature EVT-040 test area assigned | 위 명령·원출력 1902행 | PASS |
| feature EVT-040 pass criteria present | 위 명령·원출력 1903행 | PASS |
| feature EVT-041 name present | 위 명령·원출력 1904행 | PASS |
| feature EVT-041 UI need 필요 | 위 명령·원출력 1905행 | PASS |
| feature EVT-041 test need 필요 | 위 명령·원출력 1906행 | PASS |
| feature EVT-041 test area assigned | 위 명령·원출력 1907행 | PASS |
| feature EVT-041 pass criteria present | 위 명령·원출력 1908행 | PASS |
| feature EVT-042 name present | 위 명령·원출력 1909행 | PASS |
| feature EVT-042 UI need 필요 | 위 명령·원출력 1910행 | PASS |
| feature EVT-042 test need 필요 | 위 명령·원출력 1911행 | PASS |
| feature EVT-042 test area assigned | 위 명령·원출력 1912행 | PASS |
| feature EVT-042 pass criteria present | 위 명령·원출력 1913행 | PASS |
| feature EVT-043 name present | 위 명령·원출력 1914행 | PASS |
| feature EVT-043 UI need 필요 | 위 명령·원출력 1915행 | PASS |
| feature EVT-043 test need 필요 | 위 명령·원출력 1916행 | PASS |
| feature EVT-043 test area assigned | 위 명령·원출력 1917행 | PASS |
| feature EVT-043 pass criteria present | 위 명령·원출력 1918행 | PASS |
| feature EVT-044 name present | 위 명령·원출력 1919행 | PASS |
| feature EVT-044 UI need 필요 | 위 명령·원출력 1920행 | PASS |
| feature EVT-044 test need 필요 | 위 명령·원출력 1921행 | PASS |
| feature EVT-044 test area assigned | 위 명령·원출력 1922행 | PASS |
| feature EVT-044 pass criteria present | 위 명령·원출력 1923행 | PASS |
| feature EVT-045 name present | 위 명령·원출력 1924행 | PASS |
| feature EVT-045 UI need 비대상 | 위 명령·원출력 1925행 | PASS |
| feature EVT-045 test need 필요 | 위 명령·원출력 1926행 | PASS |
| feature EVT-045 test area assigned | 위 명령·원출력 1927행 | PASS |
| feature EVT-045 pass criteria present | 위 명령·원출력 1928행 | PASS |
| feature EVT-046 name present | 위 명령·원출력 1929행 | PASS |
| feature EVT-046 UI need 필요 | 위 명령·원출력 1930행 | PASS |
| feature EVT-046 test need 필요 | 위 명령·원출력 1931행 | PASS |
| feature EVT-046 test area assigned | 위 명령·원출력 1932행 | PASS |
| feature EVT-046 pass criteria present | 위 명령·원출력 1933행 | PASS |
| feature EVT-047 name present | 위 명령·원출력 1934행 | PASS |
| feature EVT-047 UI need 필요 | 위 명령·원출력 1935행 | PASS |
| feature EVT-047 test need 필요 | 위 명령·원출력 1936행 | PASS |
| feature EVT-047 test area assigned | 위 명령·원출력 1937행 | PASS |
| feature EVT-047 pass criteria present | 위 명령·원출력 1938행 | PASS |
| feature EVT-048 name present | 위 명령·원출력 1939행 | PASS |
| feature EVT-048 UI need 필요 | 위 명령·원출력 1940행 | PASS |
| feature EVT-048 test need 필요 | 위 명령·원출력 1941행 | PASS |
| feature EVT-048 test area assigned | 위 명령·원출력 1942행 | PASS |
| feature EVT-048 pass criteria present | 위 명령·원출력 1943행 | PASS |
| feature EVT-049 name present | 위 명령·원출력 1944행 | PASS |
| feature EVT-049 UI need 필요 | 위 명령·원출력 1945행 | PASS |
| feature EVT-049 test need 필요 | 위 명령·원출력 1946행 | PASS |
| feature EVT-049 test area assigned | 위 명령·원출력 1947행 | PASS |
| feature EVT-049 pass criteria present | 위 명령·원출력 1948행 | PASS |
| feature EVT-050 name present | 위 명령·원출력 1949행 | PASS |
| feature EVT-050 UI need 필요 | 위 명령·원출력 1950행 | PASS |
| feature EVT-050 test need 필요 | 위 명령·원출력 1951행 | PASS |
| feature EVT-050 test area assigned | 위 명령·원출력 1952행 | PASS |
| feature EVT-050 pass criteria present | 위 명령·원출력 1953행 | PASS |
| feature EVT-051 name present | 위 명령·원출력 1954행 | PASS |
| feature EVT-051 UI need 필요 | 위 명령·원출력 1955행 | PASS |
| feature EVT-051 test need 필요 | 위 명령·원출력 1956행 | PASS |
| feature EVT-051 test area assigned | 위 명령·원출력 1957행 | PASS |
| feature EVT-051 pass criteria present | 위 명령·원출력 1958행 | PASS |
| feature EVT-052 name present | 위 명령·원출력 1959행 | PASS |
| feature EVT-052 UI need 필요 | 위 명령·원출력 1960행 | PASS |
| feature EVT-052 test need 필요 | 위 명령·원출력 1961행 | PASS |
| feature EVT-052 test area assigned | 위 명령·원출력 1962행 | PASS |
| feature EVT-052 pass criteria present | 위 명령·원출력 1963행 | PASS |
| feature EVT-053 name present | 위 명령·원출력 1964행 | PASS |
| feature EVT-053 UI need 필요 | 위 명령·원출력 1965행 | PASS |
| feature EVT-053 test need 필요 | 위 명령·원출력 1966행 | PASS |
| feature EVT-053 test area assigned | 위 명령·원출력 1967행 | PASS |
| feature EVT-053 pass criteria present | 위 명령·원출력 1968행 | PASS |
| feature EVT-054 name present | 위 명령·원출력 1969행 | PASS |
| feature EVT-054 UI need 필요 | 위 명령·원출력 1970행 | PASS |
| feature EVT-054 test need 필요 | 위 명령·원출력 1971행 | PASS |
| feature EVT-054 test area assigned | 위 명령·원출력 1972행 | PASS |
| feature EVT-054 pass criteria present | 위 명령·원출력 1973행 | PASS |
| feature EVT-055 name present | 위 명령·원출력 1974행 | PASS |
| feature EVT-055 UI need 필요 | 위 명령·원출력 1975행 | PASS |
| feature EVT-055 test need 필요 | 위 명령·원출력 1976행 | PASS |
| feature EVT-055 test area assigned | 위 명령·원출력 1977행 | PASS |
| feature EVT-055 pass criteria present | 위 명령·원출력 1978행 | PASS |
| feature EVT-056 name present | 위 명령·원출력 1979행 | PASS |
| feature EVT-056 UI need 필요 | 위 명령·원출력 1980행 | PASS |
| feature EVT-056 test need 필요 | 위 명령·원출력 1981행 | PASS |
| feature EVT-056 test area assigned | 위 명령·원출력 1982행 | PASS |
| feature EVT-056 pass criteria present | 위 명령·원출력 1983행 | PASS |
| feature EVT-057 name present | 위 명령·원출력 1984행 | PASS |
| feature EVT-057 UI need 필요 | 위 명령·원출력 1985행 | PASS |
| feature EVT-057 test need 필요 | 위 명령·원출력 1986행 | PASS |
| feature EVT-057 test area assigned | 위 명령·원출력 1987행 | PASS |
| feature EVT-057 pass criteria present | 위 명령·원출력 1988행 | PASS |
| feature EVT-058 name present | 위 명령·원출력 1989행 | PASS |
| feature EVT-058 UI need 필요 | 위 명령·원출력 1990행 | PASS |
| feature EVT-058 test need 필요 | 위 명령·원출력 1991행 | PASS |
| feature EVT-058 test area assigned | 위 명령·원출력 1992행 | PASS |
| feature EVT-058 pass criteria present | 위 명령·원출력 1993행 | PASS |
| feature EVT-059 name present | 위 명령·원출력 1994행 | PASS |
| feature EVT-059 UI need 비대상 | 위 명령·원출력 1995행 | PASS |
| feature EVT-059 test need 필요 | 위 명령·원출력 1996행 | PASS |
| feature EVT-059 test area assigned | 위 명령·원출력 1997행 | PASS |
| feature EVT-059 pass criteria present | 위 명령·원출력 1998행 | PASS |
| feature EVT-060 name present | 위 명령·원출력 1999행 | PASS |
| feature EVT-060 UI need 비대상 | 위 명령·원출력 2000행 | PASS |
| feature EVT-060 test need 필요 | 위 명령·원출력 2001행 | PASS |
| feature EVT-060 test area assigned | 위 명령·원출력 2002행 | PASS |
| feature EVT-060 pass criteria present | 위 명령·원출력 2003행 | PASS |
| feature EVT-061 name present | 위 명령·원출력 2004행 | PASS |
| feature EVT-061 UI need 필요 | 위 명령·원출력 2005행 | PASS |
| feature EVT-061 test need 필요 | 위 명령·원출력 2006행 | PASS |
| feature EVT-061 test area assigned | 위 명령·원출력 2007행 | PASS |
| feature EVT-061 pass criteria present | 위 명령·원출력 2008행 | PASS |
| feature EVT-062 name present | 위 명령·원출력 2009행 | PASS |
| feature EVT-062 UI need 비대상 | 위 명령·원출력 2010행 | PASS |
| feature EVT-062 test need 필요 | 위 명령·원출력 2011행 | PASS |
| feature EVT-062 test area assigned | 위 명령·원출력 2012행 | PASS |
| feature EVT-062 pass criteria present | 위 명령·원출력 2013행 | PASS |
| feature EVT-063 name present | 위 명령·원출력 2014행 | PASS |
| feature EVT-063 UI need 비대상 | 위 명령·원출력 2015행 | PASS |
| feature EVT-063 test need 필요 | 위 명령·원출력 2016행 | PASS |
| feature EVT-063 test area assigned | 위 명령·원출력 2017행 | PASS |
| feature EVT-063 pass criteria present | 위 명령·원출력 2018행 | PASS |
| feature EVT-064 name present | 위 명령·원출력 2019행 | PASS |
| feature EVT-064 UI need 필요 | 위 명령·원출력 2020행 | PASS |
| feature EVT-064 test need 필요 | 위 명령·원출력 2021행 | PASS |
| feature EVT-064 test area assigned | 위 명령·원출력 2022행 | PASS |
| feature EVT-064 pass criteria present | 위 명령·원출력 2023행 | PASS |
| feature EVT-065 name present | 위 명령·원출력 2024행 | PASS |
| feature EVT-065 UI need 필요 | 위 명령·원출력 2025행 | PASS |
| feature EVT-065 test need 필요 | 위 명령·원출력 2026행 | PASS |
| feature EVT-065 test area assigned | 위 명령·원출력 2027행 | PASS |
| feature EVT-065 pass criteria present | 위 명령·원출력 2028행 | PASS |
| feature EVT-066 name present | 위 명령·원출력 2029행 | PASS |
| feature EVT-066 UI need 필요 | 위 명령·원출력 2030행 | PASS |
| feature EVT-066 test need 필요 | 위 명령·원출력 2031행 | PASS |
| feature EVT-066 test area assigned | 위 명령·원출력 2032행 | PASS |
| feature EVT-066 pass criteria present | 위 명령·원출력 2033행 | PASS |
| feature EVT-067 name present | 위 명령·원출력 2034행 | PASS |
| feature EVT-067 UI need 필요 | 위 명령·원출력 2035행 | PASS |
| feature EVT-067 test need 필요 | 위 명령·원출력 2036행 | PASS |
| feature EVT-067 test area assigned | 위 명령·원출력 2037행 | PASS |
| feature EVT-067 pass criteria present | 위 명령·원출력 2038행 | PASS |
| feature EVT-068 name present | 위 명령·원출력 2039행 | PASS |
| feature EVT-068 UI need 필요 | 위 명령·원출력 2040행 | PASS |
| feature EVT-068 test need 필요 | 위 명령·원출력 2041행 | PASS |
| feature EVT-068 test area assigned | 위 명령·원출력 2042행 | PASS |
| feature EVT-068 pass criteria present | 위 명령·원출력 2043행 | PASS |
| feature EVT-069 name present | 위 명령·원출력 2044행 | PASS |
| feature EVT-069 UI need 필요 | 위 명령·원출력 2045행 | PASS |
| feature EVT-069 test need 필요 | 위 명령·원출력 2046행 | PASS |
| feature EVT-069 test area assigned | 위 명령·원출력 2047행 | PASS |
| feature EVT-069 pass criteria present | 위 명령·원출력 2048행 | PASS |
| feature EVT-070 name present | 위 명령·원출력 2049행 | PASS |
| feature EVT-070 UI need 필요 | 위 명령·원출력 2050행 | PASS |
| feature EVT-070 test need 필요 | 위 명령·원출력 2051행 | PASS |
| feature EVT-070 test area assigned | 위 명령·원출력 2052행 | PASS |
| feature EVT-070 pass criteria present | 위 명령·원출력 2053행 | PASS |
| feature EVT-071 name present | 위 명령·원출력 2054행 | PASS |
| feature EVT-071 UI need 필요 | 위 명령·원출력 2055행 | PASS |
| feature EVT-071 test need 필요 | 위 명령·원출력 2056행 | PASS |
| feature EVT-071 test area assigned | 위 명령·원출력 2057행 | PASS |
| feature EVT-071 pass criteria present | 위 명령·원출력 2058행 | PASS |
| feature EVT-072 name present | 위 명령·원출력 2059행 | PASS |
| feature EVT-072 UI need 필요 | 위 명령·원출력 2060행 | PASS |
| feature EVT-072 test need 필요 | 위 명령·원출력 2061행 | PASS |
| feature EVT-072 test area assigned | 위 명령·원출력 2062행 | PASS |
| feature EVT-072 pass criteria present | 위 명령·원출력 2063행 | PASS |
| feature EVT-073 name present | 위 명령·원출력 2064행 | PASS |
| feature EVT-073 UI need 비대상 | 위 명령·원출력 2065행 | PASS |
| feature EVT-073 test need 필요 | 위 명령·원출력 2066행 | PASS |
| feature EVT-073 test area assigned | 위 명령·원출력 2067행 | PASS |
| feature EVT-073 pass criteria present | 위 명령·원출력 2068행 | PASS |
| feature EVT-074 name present | 위 명령·원출력 2069행 | PASS |
| feature EVT-074 UI need 비대상 | 위 명령·원출력 2070행 | PASS |
| feature EVT-074 test need 필요 | 위 명령·원출력 2071행 | PASS |
| feature EVT-074 test area assigned | 위 명령·원출력 2072행 | PASS |
| feature EVT-074 pass criteria present | 위 명령·원출력 2073행 | PASS |
| feature EVT-075 name present | 위 명령·원출력 2074행 | PASS |
| feature EVT-075 UI need 필요 | 위 명령·원출력 2075행 | PASS |
| feature EVT-075 test need 필요 | 위 명령·원출력 2076행 | PASS |
| feature EVT-075 test area assigned | 위 명령·원출력 2077행 | PASS |
| feature EVT-075 pass criteria present | 위 명령·원출력 2078행 | PASS |
| feature EVT-076 name present | 위 명령·원출력 2079행 | PASS |
| feature EVT-076 UI need 비대상 | 위 명령·원출력 2080행 | PASS |
| feature EVT-076 test need 필요 | 위 명령·원출력 2081행 | PASS |
| feature EVT-076 test area assigned | 위 명령·원출력 2082행 | PASS |
| feature EVT-076 pass criteria present | 위 명령·원출력 2083행 | PASS |
| feature EVT-077 name present | 위 명령·원출력 2084행 | PASS |
| feature EVT-077 UI need 비대상 | 위 명령·원출력 2085행 | PASS |
| feature EVT-077 test need 필요 | 위 명령·원출력 2086행 | PASS |
| feature EVT-077 test area assigned | 위 명령·원출력 2087행 | PASS |
| feature EVT-077 pass criteria present | 위 명령·원출력 2088행 | PASS |
| feature EVT-078 name present | 위 명령·원출력 2089행 | PASS |
| feature EVT-078 UI need 비대상 | 위 명령·원출력 2090행 | PASS |
| feature EVT-078 test need 필요 | 위 명령·원출력 2091행 | PASS |
| feature EVT-078 test area assigned | 위 명령·원출력 2092행 | PASS |
| feature EVT-078 pass criteria present | 위 명령·원출력 2093행 | PASS |
| feature EVT-079 name present | 위 명령·원출력 2094행 | PASS |
| feature EVT-079 UI need 비대상 | 위 명령·원출력 2095행 | PASS |
| feature EVT-079 test need 필요 | 위 명령·원출력 2096행 | PASS |
| feature EVT-079 test area assigned | 위 명령·원출력 2097행 | PASS |
| feature EVT-079 pass criteria present | 위 명령·원출력 2098행 | PASS |
| feature EVT-080 name present | 위 명령·원출력 2099행 | PASS |
| feature EVT-080 UI need 비대상 | 위 명령·원출력 2100행 | PASS |
| feature EVT-080 test need 필요 | 위 명령·원출력 2101행 | PASS |
| feature EVT-080 test area assigned | 위 명령·원출력 2102행 | PASS |
| feature EVT-080 pass criteria present | 위 명령·원출력 2103행 | PASS |
| feature EVT-081 name present | 위 명령·원출력 2104행 | PASS |
| feature EVT-081 UI need 비대상 | 위 명령·원출력 2105행 | PASS |
| feature EVT-081 test need 필요 | 위 명령·원출력 2106행 | PASS |
| feature EVT-081 test area assigned | 위 명령·원출력 2107행 | PASS |
| feature EVT-081 pass criteria present | 위 명령·원출력 2108행 | PASS |
| feature EVT-082 name present | 위 명령·원출력 2109행 | PASS |
| feature EVT-082 UI need 비대상 | 위 명령·원출력 2110행 | PASS |
| feature EVT-082 test need 필요 | 위 명령·원출력 2111행 | PASS |
| feature EVT-082 test area assigned | 위 명령·원출력 2112행 | PASS |
| feature EVT-082 pass criteria present | 위 명령·원출력 2113행 | PASS |
| feature EVT-083 name present | 위 명령·원출력 2114행 | PASS |
| feature EVT-083 UI need 비대상 | 위 명령·원출력 2115행 | PASS |
| feature EVT-083 test need 필요 | 위 명령·원출력 2116행 | PASS |
| feature EVT-083 test area assigned | 위 명령·원출력 2117행 | PASS |
| feature EVT-083 pass criteria present | 위 명령·원출력 2118행 | PASS |
| feature EVT-084 name present | 위 명령·원출력 2119행 | PASS |
| feature EVT-084 UI need 비대상 | 위 명령·원출력 2120행 | PASS |
| feature EVT-084 test need 필요 | 위 명령·원출력 2121행 | PASS |
| feature EVT-084 test area assigned | 위 명령·원출력 2122행 | PASS |
| feature EVT-084 pass criteria present | 위 명령·원출력 2123행 | PASS |
| feature EVT-085 name present | 위 명령·원출력 2124행 | PASS |
| feature EVT-085 UI need 비대상 | 위 명령·원출력 2125행 | PASS |
| feature EVT-085 test need 필요 | 위 명령·원출력 2126행 | PASS |
| feature EVT-085 test area assigned | 위 명령·원출력 2127행 | PASS |
| feature EVT-085 pass criteria present | 위 명령·원출력 2128행 | PASS |
| feature EVT-086 name present | 위 명령·원출력 2129행 | PASS |
| feature EVT-086 UI need 비대상 | 위 명령·원출력 2130행 | PASS |
| feature EVT-086 test need 필요 | 위 명령·원출력 2131행 | PASS |
| feature EVT-086 test area assigned | 위 명령·원출력 2132행 | PASS |
| feature EVT-086 pass criteria present | 위 명령·원출력 2133행 | PASS |
| feature EVT-087 name present | 위 명령·원출력 2134행 | PASS |
| feature EVT-087 UI need 비대상 | 위 명령·원출력 2135행 | PASS |
| feature EVT-087 test need 필요 | 위 명령·원출력 2136행 | PASS |
| feature EVT-087 test area assigned | 위 명령·원출력 2137행 | PASS |
| feature EVT-087 pass criteria present | 위 명령·원출력 2138행 | PASS |
| feature CLIENT-001 name present | 위 명령·원출력 2139행 | PASS |
| feature CLIENT-001 UI need 필요 | 위 명령·원출력 2140행 | PASS |
| feature CLIENT-001 test need 필요 | 위 명령·원출력 2141행 | PASS |
| feature CLIENT-001 test area assigned | 위 명령·원출력 2142행 | PASS |
| feature CLIENT-001 pass criteria present | 위 명령·원출력 2143행 | PASS |
| feature CLIENT-002 name present | 위 명령·원출력 2144행 | PASS |
| feature CLIENT-002 UI need 필요 | 위 명령·원출력 2145행 | PASS |
| feature CLIENT-002 test need 필요 | 위 명령·원출력 2146행 | PASS |
| feature CLIENT-002 test area assigned | 위 명령·원출력 2147행 | PASS |
| feature CLIENT-002 pass criteria present | 위 명령·원출력 2148행 | PASS |
| feature CLIENT-003 name present | 위 명령·원출력 2149행 | PASS |
| feature CLIENT-003 UI need 간접 | 위 명령·원출력 2150행 | PASS |
| feature CLIENT-003 test need 필요 | 위 명령·원출력 2151행 | PASS |
| feature CLIENT-003 test area assigned | 위 명령·원출력 2152행 | PASS |
| feature CLIENT-003 pass criteria present | 위 명령·원출력 2153행 | PASS |
| feature CLIENT-004 name present | 위 명령·원출력 2154행 | PASS |
| feature CLIENT-004 UI need 간접 | 위 명령·원출력 2155행 | PASS |
| feature CLIENT-004 test need 필요 | 위 명령·원출력 2156행 | PASS |
| feature CLIENT-004 test area assigned | 위 명령·원출력 2157행 | PASS |
| feature CLIENT-004 pass criteria present | 위 명령·원출력 2158행 | PASS |
| feature CLIENT-005 name present | 위 명령·원출력 2159행 | PASS |
| feature CLIENT-005 UI need 필요 | 위 명령·원출력 2160행 | PASS |
| feature CLIENT-005 test need 필요 | 위 명령·원출력 2161행 | PASS |
| feature CLIENT-005 test area assigned | 위 명령·원출력 2162행 | PASS |
| feature CLIENT-005 pass criteria present | 위 명령·원출력 2163행 | PASS |
| feature CLIENT-006 name present | 위 명령·원출력 2164행 | PASS |
| feature CLIENT-006 UI need 필요 | 위 명령·원출력 2165행 | PASS |
| feature CLIENT-006 test need 필요 | 위 명령·원출력 2166행 | PASS |
| feature CLIENT-006 test area assigned | 위 명령·원출력 2167행 | PASS |
| feature CLIENT-006 pass criteria present | 위 명령·원출력 2168행 | PASS |
| feature CLIENT-007 name present | 위 명령·원출력 2169행 | PASS |
| feature CLIENT-007 UI need 필요 | 위 명령·원출력 2170행 | PASS |
| feature CLIENT-007 test need 필요 | 위 명령·원출력 2171행 | PASS |
| feature CLIENT-007 test area assigned | 위 명령·원출력 2172행 | PASS |
| feature CLIENT-007 pass criteria present | 위 명령·원출력 2173행 | PASS |
| feature CLIENT-008 name present | 위 명령·원출력 2174행 | PASS |
| feature CLIENT-008 UI need 간접 | 위 명령·원출력 2175행 | PASS |
| feature CLIENT-008 test need 필요 | 위 명령·원출력 2176행 | PASS |
| feature CLIENT-008 test area assigned | 위 명령·원출력 2177행 | PASS |
| feature CLIENT-008 pass criteria present | 위 명령·원출력 2178행 | PASS |
| feature CLIENT-009 name present | 위 명령·원출력 2179행 | PASS |
| feature CLIENT-009 UI need 필요 | 위 명령·원출력 2180행 | PASS |
| feature CLIENT-009 test need 필요 | 위 명령·원출력 2181행 | PASS |
| feature CLIENT-009 test area assigned | 위 명령·원출력 2182행 | PASS |
| feature CLIENT-009 pass criteria present | 위 명령·원출력 2183행 | PASS |
| feature CLIENT-010 name present | 위 명령·원출력 2184행 | PASS |
| feature CLIENT-010 UI need 필요 | 위 명령·원출력 2185행 | PASS |
| feature CLIENT-010 test need 필요 | 위 명령·원출력 2186행 | PASS |
| feature CLIENT-010 test area assigned | 위 명령·원출력 2187행 | PASS |
| feature CLIENT-010 pass criteria present | 위 명령·원출력 2188행 | PASS |
| feature CLIENT-011 name present | 위 명령·원출력 2189행 | PASS |
| feature CLIENT-011 UI need 필요 | 위 명령·원출력 2190행 | PASS |
| feature CLIENT-011 test need 필요 | 위 명령·원출력 2191행 | PASS |
| feature CLIENT-011 test area assigned | 위 명령·원출력 2192행 | PASS |
| feature CLIENT-011 pass criteria present | 위 명령·원출력 2193행 | PASS |
| feature CLIENT-012 name present | 위 명령·원출력 2194행 | PASS |
| feature CLIENT-012 UI need 필요 | 위 명령·원출력 2195행 | PASS |
| feature CLIENT-012 test need 필요 | 위 명령·원출력 2196행 | PASS |
| feature CLIENT-012 test area assigned | 위 명령·원출력 2197행 | PASS |
| feature CLIENT-012 pass criteria present | 위 명령·원출력 2198행 | PASS |
| feature CLIENT-013 name present | 위 명령·원출력 2199행 | PASS |
| feature CLIENT-013 UI need 필요 | 위 명령·원출력 2200행 | PASS |
| feature CLIENT-013 test need 필요 | 위 명령·원출력 2201행 | PASS |
| feature CLIENT-013 test area assigned | 위 명령·원출력 2202행 | PASS |
| feature CLIENT-013 pass criteria present | 위 명령·원출력 2203행 | PASS |
| feature CLIENT-014 name present | 위 명령·원출력 2204행 | PASS |
| feature CLIENT-014 UI need 필요 | 위 명령·원출력 2205행 | PASS |
| feature CLIENT-014 test need 필요 | 위 명령·원출력 2206행 | PASS |
| feature CLIENT-014 test area assigned | 위 명령·원출력 2207행 | PASS |
| feature CLIENT-014 pass criteria present | 위 명령·원출력 2208행 | PASS |
| feature CLIENT-015 name present | 위 명령·원출력 2209행 | PASS |
| feature CLIENT-015 UI need 필요 | 위 명령·원출력 2210행 | PASS |
| feature CLIENT-015 test need 필요 | 위 명령·원출력 2211행 | PASS |
| feature CLIENT-015 test area assigned | 위 명령·원출력 2212행 | PASS |
| feature CLIENT-015 pass criteria present | 위 명령·원출력 2213행 | PASS |
| feature CLIENT-016 name present | 위 명령·원출력 2214행 | PASS |
| feature CLIENT-016 UI need 필요 | 위 명령·원출력 2215행 | PASS |
| feature CLIENT-016 test need 필요 | 위 명령·원출력 2216행 | PASS |
| feature CLIENT-016 test area assigned | 위 명령·원출력 2217행 | PASS |
| feature CLIENT-016 pass criteria present | 위 명령·원출력 2218행 | PASS |
| feature CLIENT-017 name present | 위 명령·원출력 2219행 | PASS |
| feature CLIENT-017 UI need 필요 | 위 명령·원출력 2220행 | PASS |
| feature CLIENT-017 test need 필요 | 위 명령·원출력 2221행 | PASS |
| feature CLIENT-017 test area assigned | 위 명령·원출력 2222행 | PASS |
| feature CLIENT-017 pass criteria present | 위 명령·원출력 2223행 | PASS |
| feature CLIENT-018 name present | 위 명령·원출력 2224행 | PASS |
| feature CLIENT-018 UI need 필요 | 위 명령·원출력 2225행 | PASS |
| feature CLIENT-018 test need 필요 | 위 명령·원출력 2226행 | PASS |
| feature CLIENT-018 test area assigned | 위 명령·원출력 2227행 | PASS |
| feature CLIENT-018 pass criteria present | 위 명령·원출력 2228행 | PASS |
| feature CLIENT-019 name present | 위 명령·원출력 2229행 | PASS |
| feature CLIENT-019 UI need 필요 | 위 명령·원출력 2230행 | PASS |
| feature CLIENT-019 test need 필요 | 위 명령·원출력 2231행 | PASS |
| feature CLIENT-019 test area assigned | 위 명령·원출력 2232행 | PASS |
| feature CLIENT-019 pass criteria present | 위 명령·원출력 2233행 | PASS |
| feature CLIENT-020 name present | 위 명령·원출력 2234행 | PASS |
| feature CLIENT-020 UI need 필요 | 위 명령·원출력 2235행 | PASS |
| feature CLIENT-020 test need 필요 | 위 명령·원출력 2236행 | PASS |
| feature CLIENT-020 test area assigned | 위 명령·원출력 2237행 | PASS |
| feature CLIENT-020 pass criteria present | 위 명령·원출력 2238행 | PASS |
| feature CLIENT-021 name present | 위 명령·원출력 2239행 | PASS |
| feature CLIENT-021 UI need 필요 | 위 명령·원출력 2240행 | PASS |
| feature CLIENT-021 test need 필요 | 위 명령·원출력 2241행 | PASS |
| feature CLIENT-021 test area assigned | 위 명령·원출력 2242행 | PASS |
| feature CLIENT-021 pass criteria present | 위 명령·원출력 2243행 | PASS |
| feature CLIENT-022 name present | 위 명령·원출력 2244행 | PASS |
| feature CLIENT-022 UI need 필요 | 위 명령·원출력 2245행 | PASS |
| feature CLIENT-022 test need 필요 | 위 명령·원출력 2246행 | PASS |
| feature CLIENT-022 test area assigned | 위 명령·원출력 2247행 | PASS |
| feature CLIENT-022 pass criteria present | 위 명령·원출력 2248행 | PASS |
| feature CLIENT-023 name present | 위 명령·원출력 2249행 | PASS |
| feature CLIENT-023 UI need 필요 | 위 명령·원출력 2250행 | PASS |
| feature CLIENT-023 test need 필요 | 위 명령·원출력 2251행 | PASS |
| feature CLIENT-023 test area assigned | 위 명령·원출력 2252행 | PASS |
| feature CLIENT-023 pass criteria present | 위 명령·원출력 2253행 | PASS |
| feature CLIENT-024 name present | 위 명령·원출력 2254행 | PASS |
| feature CLIENT-024 UI need 필요 | 위 명령·원출력 2255행 | PASS |
| feature CLIENT-024 test need 필요 | 위 명령·원출력 2256행 | PASS |
| feature CLIENT-024 test area assigned | 위 명령·원출력 2257행 | PASS |
| feature CLIENT-024 pass criteria present | 위 명령·원출력 2258행 | PASS |
| feature CLIENT-025 name present | 위 명령·원출력 2259행 | PASS |
| feature CLIENT-025 UI need 필요 | 위 명령·원출력 2260행 | PASS |
| feature CLIENT-025 test need 필요 | 위 명령·원출력 2261행 | PASS |
| feature CLIENT-025 test area assigned | 위 명령·원출력 2262행 | PASS |
| feature CLIENT-025 pass criteria present | 위 명령·원출력 2263행 | PASS |
| feature CLIENT-026 name present | 위 명령·원출력 2264행 | PASS |
| feature CLIENT-026 UI need 비대상 | 위 명령·원출력 2265행 | PASS |
| feature CLIENT-026 test need 필요 | 위 명령·원출력 2266행 | PASS |
| feature CLIENT-026 test area assigned | 위 명령·원출력 2267행 | PASS |
| feature CLIENT-026 pass criteria present | 위 명령·원출력 2268행 | PASS |
| feature CLIENT-027 name present | 위 명령·원출력 2269행 | PASS |
| feature CLIENT-027 UI need 필요 | 위 명령·원출력 2270행 | PASS |
| feature CLIENT-027 test need 필요 | 위 명령·원출력 2271행 | PASS |
| feature CLIENT-027 test area assigned | 위 명령·원출력 2272행 | PASS |
| feature CLIENT-027 pass criteria present | 위 명령·원출력 2273행 | PASS |
| feature CLIENT-028 name present | 위 명령·원출력 2274행 | PASS |
| feature CLIENT-028 UI need 필요 | 위 명령·원출력 2275행 | PASS |
| feature CLIENT-028 test need 필요 | 위 명령·원출력 2276행 | PASS |
| feature CLIENT-028 test area assigned | 위 명령·원출력 2277행 | PASS |
| feature CLIENT-028 pass criteria present | 위 명령·원출력 2278행 | PASS |
| feature CLIENT-029 name present | 위 명령·원출력 2279행 | PASS |
| feature CLIENT-029 UI need 필요 | 위 명령·원출력 2280행 | PASS |
| feature CLIENT-029 test need 필요 | 위 명령·원출력 2281행 | PASS |
| feature CLIENT-029 test area assigned | 위 명령·원출력 2282행 | PASS |
| feature CLIENT-029 pass criteria present | 위 명령·원출력 2283행 | PASS |
| feature CLIENT-030 name present | 위 명령·원출력 2284행 | PASS |
| feature CLIENT-030 UI need 비대상 | 위 명령·원출력 2285행 | PASS |
| feature CLIENT-030 test need 필요 | 위 명령·원출력 2286행 | PASS |
| feature CLIENT-030 test area assigned | 위 명령·원출력 2287행 | PASS |
| feature CLIENT-030 pass criteria present | 위 명령·원출력 2288행 | PASS |
| feature CLIENT-031 name present | 위 명령·원출력 2289행 | PASS |
| feature CLIENT-031 UI need 필요 | 위 명령·원출력 2290행 | PASS |
| feature CLIENT-031 test need 필요 | 위 명령·원출력 2291행 | PASS |
| feature CLIENT-031 test area assigned | 위 명령·원출력 2292행 | PASS |
| feature CLIENT-031 pass criteria present | 위 명령·원출력 2293행 | PASS |
| feature CLIENT-032 name present | 위 명령·원출력 2294행 | PASS |
| feature CLIENT-032 UI need 필요 | 위 명령·원출력 2295행 | PASS |
| feature CLIENT-032 test need 필요 | 위 명령·원출력 2296행 | PASS |
| feature CLIENT-032 test area assigned | 위 명령·원출력 2297행 | PASS |
| feature CLIENT-032 pass criteria present | 위 명령·원출력 2298행 | PASS |
| feature CLIENT-033 name present | 위 명령·원출력 2299행 | PASS |
| feature CLIENT-033 UI need 비대상 | 위 명령·원출력 2300행 | PASS |
| feature CLIENT-033 test need 필요 | 위 명령·원출력 2301행 | PASS |
| feature CLIENT-033 test area assigned | 위 명령·원출력 2302행 | PASS |
| feature CLIENT-033 pass criteria present | 위 명령·원출력 2303행 | PASS |
| feature CLIENT-034 name present | 위 명령·원출력 2304행 | PASS |
| feature CLIENT-034 UI need 비대상 | 위 명령·원출력 2305행 | PASS |
| feature CLIENT-034 test need 필요 | 위 명령·원출력 2306행 | PASS |
| feature CLIENT-034 test area assigned | 위 명령·원출력 2307행 | PASS |
| feature CLIENT-034 pass criteria present | 위 명령·원출력 2308행 | PASS |
| feature CLIENT-035 name present | 위 명령·원출력 2309행 | PASS |
| feature CLIENT-035 UI need 비대상 | 위 명령·원출력 2310행 | PASS |
| feature CLIENT-035 test need 필요 | 위 명령·원출력 2311행 | PASS |
| feature CLIENT-035 test area assigned | 위 명령·원출력 2312행 | PASS |
| feature CLIENT-035 pass criteria present | 위 명령·원출력 2313행 | PASS |
| feature CLIENT-036 name present | 위 명령·원출력 2314행 | PASS |
| feature CLIENT-036 UI need 비대상 | 위 명령·원출력 2315행 | PASS |
| feature CLIENT-036 test need 필요 | 위 명령·원출력 2316행 | PASS |
| feature CLIENT-036 test area assigned | 위 명령·원출력 2317행 | PASS |
| feature CLIENT-036 pass criteria present | 위 명령·원출력 2318행 | PASS |
| feature CLIENT-037 name present | 위 명령·원출력 2319행 | PASS |
| feature CLIENT-037 UI need 비대상 | 위 명령·원출력 2320행 | PASS |
| feature CLIENT-037 test need 필요 | 위 명령·원출력 2321행 | PASS |
| feature CLIENT-037 test area assigned | 위 명령·원출력 2322행 | PASS |
| feature CLIENT-037 pass criteria present | 위 명령·원출력 2323행 | PASS |
| feature CLIENT-038 name present | 위 명령·원출력 2324행 | PASS |
| feature CLIENT-038 UI need 비대상 | 위 명령·원출력 2325행 | PASS |
| feature CLIENT-038 test need 필요 | 위 명령·원출력 2326행 | PASS |
| feature CLIENT-038 test area assigned | 위 명령·원출력 2327행 | PASS |
| feature CLIENT-038 pass criteria present | 위 명령·원출력 2328행 | PASS |
| feature CLIENT-039 name present | 위 명령·원출력 2329행 | PASS |
| feature CLIENT-039 UI need 비대상 | 위 명령·원출력 2330행 | PASS |
| feature CLIENT-039 test need 필요 | 위 명령·원출력 2331행 | PASS |
| feature CLIENT-039 test area assigned | 위 명령·원출력 2332행 | PASS |
| feature CLIENT-039 pass criteria present | 위 명령·원출력 2333행 | PASS |
| feature CLIENT-040 name present | 위 명령·원출력 2334행 | PASS |
| feature CLIENT-040 UI need 필요 | 위 명령·원출력 2335행 | PASS |
| feature CLIENT-040 test need 필요 | 위 명령·원출력 2336행 | PASS |
| feature CLIENT-040 test area assigned | 위 명령·원출력 2337행 | PASS |
| feature CLIENT-040 pass criteria present | 위 명령·원출력 2338행 | PASS |
| feature CLIENT-041 name present | 위 명령·원출력 2339행 | PASS |
| feature CLIENT-041 UI need 필요 | 위 명령·원출력 2340행 | PASS |
| feature CLIENT-041 test need 필요 | 위 명령·원출력 2341행 | PASS |
| feature CLIENT-041 test area assigned | 위 명령·원출력 2342행 | PASS |
| feature CLIENT-041 pass criteria present | 위 명령·원출력 2343행 | PASS |
| feature CLIENT-042 name present | 위 명령·원출력 2344행 | PASS |
| feature CLIENT-042 UI need 필요 | 위 명령·원출력 2345행 | PASS |
| feature CLIENT-042 test need 필요 | 위 명령·원출력 2346행 | PASS |
| feature CLIENT-042 test area assigned | 위 명령·원출력 2347행 | PASS |
| feature CLIENT-042 pass criteria present | 위 명령·원출력 2348행 | PASS |
| feature MEDIA-001 name present | 위 명령·원출력 2349행 | PASS |
| feature MEDIA-001 UI need 비대상 | 위 명령·원출력 2350행 | PASS |
| feature MEDIA-001 test need 필요 | 위 명령·원출력 2351행 | PASS |
| feature MEDIA-001 test area assigned | 위 명령·원출력 2352행 | PASS |
| feature MEDIA-001 pass criteria present | 위 명령·원출력 2353행 | PASS |
| feature MEDIA-002 name present | 위 명령·원출력 2354행 | PASS |
| feature MEDIA-002 UI need 비대상 | 위 명령·원출력 2355행 | PASS |
| feature MEDIA-002 test need 필요 | 위 명령·원출력 2356행 | PASS |
| feature MEDIA-002 test area assigned | 위 명령·원출력 2357행 | PASS |
| feature MEDIA-002 pass criteria present | 위 명령·원출력 2358행 | PASS |
| feature MEDIA-003 name present | 위 명령·원출력 2359행 | PASS |
| feature MEDIA-003 UI need 비대상 | 위 명령·원출력 2360행 | PASS |
| feature MEDIA-003 test need 필요 | 위 명령·원출력 2361행 | PASS |
| feature MEDIA-003 test area assigned | 위 명령·원출력 2362행 | PASS |
| feature MEDIA-003 pass criteria present | 위 명령·원출력 2363행 | PASS |
| feature MEDIA-004 name present | 위 명령·원출력 2364행 | PASS |
| feature MEDIA-004 UI need 비대상 | 위 명령·원출력 2365행 | PASS |
| feature MEDIA-004 test need 필요 | 위 명령·원출력 2366행 | PASS |
| feature MEDIA-004 test area assigned | 위 명령·원출력 2367행 | PASS |
| feature MEDIA-004 pass criteria present | 위 명령·원출력 2368행 | PASS |
| feature MEDIA-005 name present | 위 명령·원출력 2369행 | PASS |
| feature MEDIA-005 UI need 비대상 | 위 명령·원출력 2370행 | PASS |
| feature MEDIA-005 test need 필요 | 위 명령·원출력 2371행 | PASS |
| feature MEDIA-005 test area assigned | 위 명령·원출력 2372행 | PASS |
| feature MEDIA-005 pass criteria present | 위 명령·원출력 2373행 | PASS |
| feature MEDIA-006 name present | 위 명령·원출력 2374행 | PASS |
| feature MEDIA-006 UI need 비대상 | 위 명령·원출력 2375행 | PASS |
| feature MEDIA-006 test need 필요 | 위 명령·원출력 2376행 | PASS |
| feature MEDIA-006 test area assigned | 위 명령·원출력 2377행 | PASS |
| feature MEDIA-006 pass criteria present | 위 명령·원출력 2378행 | PASS |
| feature MEDIA-007 name present | 위 명령·원출력 2379행 | PASS |
| feature MEDIA-007 UI need 비대상 | 위 명령·원출력 2380행 | PASS |
| feature MEDIA-007 test need 필요 | 위 명령·원출력 2381행 | PASS |
| feature MEDIA-007 test area assigned | 위 명령·원출력 2382행 | PASS |
| feature MEDIA-007 pass criteria present | 위 명령·원출력 2383행 | PASS |
| feature MEDIA-008 name present | 위 명령·원출력 2384행 | PASS |
| feature MEDIA-008 UI need 비대상 | 위 명령·원출력 2385행 | PASS |
| feature MEDIA-008 test need 필요 | 위 명령·원출력 2386행 | PASS |
| feature MEDIA-008 test area assigned | 위 명령·원출력 2387행 | PASS |
| feature MEDIA-008 pass criteria present | 위 명령·원출력 2388행 | PASS |
| feature MEDIA-009 name present | 위 명령·원출력 2389행 | PASS |
| feature MEDIA-009 UI need 간접 | 위 명령·원출력 2390행 | PASS |
| feature MEDIA-009 test need 필요 | 위 명령·원출력 2391행 | PASS |
| feature MEDIA-009 test area assigned | 위 명령·원출력 2392행 | PASS |
| feature MEDIA-009 pass criteria present | 위 명령·원출력 2393행 | PASS |
| feature MEDIA-010 name present | 위 명령·원출력 2394행 | PASS |
| feature MEDIA-010 UI need 간접 | 위 명령·원출력 2395행 | PASS |
| feature MEDIA-010 test need 필요 | 위 명령·원출력 2396행 | PASS |
| feature MEDIA-010 test area assigned | 위 명령·원출력 2397행 | PASS |
| feature MEDIA-010 pass criteria present | 위 명령·원출력 2398행 | PASS |
| feature MEDIA-011 name present | 위 명령·원출력 2399행 | PASS |
| feature MEDIA-011 UI need 비대상 | 위 명령·원출력 2400행 | PASS |
| feature MEDIA-011 test need 필요 | 위 명령·원출력 2401행 | PASS |
| feature MEDIA-011 test area assigned | 위 명령·원출력 2402행 | PASS |
| feature MEDIA-011 pass criteria present | 위 명령·원출력 2403행 | PASS |
| feature MEDIA-012 name present | 위 명령·원출력 2404행 | PASS |
| feature MEDIA-012 UI need 비대상 | 위 명령·원출력 2405행 | PASS |
| feature MEDIA-012 test need 필요 | 위 명령·원출력 2406행 | PASS |
| feature MEDIA-012 test area assigned | 위 명령·원출력 2407행 | PASS |
| feature MEDIA-012 pass criteria present | 위 명령·원출력 2408행 | PASS |
| feature MEDIA-013 name present | 위 명령·원출력 2409행 | PASS |
| feature MEDIA-013 UI need 비대상 | 위 명령·원출력 2410행 | PASS |
| feature MEDIA-013 test need 필요 | 위 명령·원출력 2411행 | PASS |
| feature MEDIA-013 test area assigned | 위 명령·원출력 2412행 | PASS |
| feature MEDIA-013 pass criteria present | 위 명령·원출력 2413행 | PASS |
| feature MEDIA-014 name present | 위 명령·원출력 2414행 | PASS |
| feature MEDIA-014 UI need 비대상 | 위 명령·원출력 2415행 | PASS |
| feature MEDIA-014 test need 필요 | 위 명령·원출력 2416행 | PASS |
| feature MEDIA-014 test area assigned | 위 명령·원출력 2417행 | PASS |
| feature MEDIA-014 pass criteria present | 위 명령·원출력 2418행 | PASS |
| feature MEDIA-015 name present | 위 명령·원출력 2419행 | PASS |
| feature MEDIA-015 UI need 비대상 | 위 명령·원출력 2420행 | PASS |
| feature MEDIA-015 test need 필요 | 위 명령·원출력 2421행 | PASS |
| feature MEDIA-015 test area assigned | 위 명령·원출력 2422행 | PASS |
| feature MEDIA-015 pass criteria present | 위 명령·원출력 2423행 | PASS |
| feature MEDIA-016 name present | 위 명령·원출력 2424행 | PASS |
| feature MEDIA-016 UI need 필요 | 위 명령·원출력 2425행 | PASS |
| feature MEDIA-016 test need 필요 | 위 명령·원출력 2426행 | PASS |
| feature MEDIA-016 test area assigned | 위 명령·원출력 2427행 | PASS |
| feature MEDIA-016 pass criteria present | 위 명령·원출력 2428행 | PASS |
| feature MEDIA-017 name present | 위 명령·원출력 2429행 | PASS |
| feature MEDIA-017 UI need 필요 | 위 명령·원출력 2430행 | PASS |
| feature MEDIA-017 test need 필요 | 위 명령·원출력 2431행 | PASS |
| feature MEDIA-017 test area assigned | 위 명령·원출력 2432행 | PASS |
| feature MEDIA-017 pass criteria present | 위 명령·원출력 2433행 | PASS |
| feature MEDIA-018 name present | 위 명령·원출력 2434행 | PASS |
| feature MEDIA-018 UI need 비대상 | 위 명령·원출력 2435행 | PASS |
| feature MEDIA-018 test need 필요 | 위 명령·원출력 2436행 | PASS |
| feature MEDIA-018 test area assigned | 위 명령·원출력 2437행 | PASS |
| feature MEDIA-018 pass criteria present | 위 명령·원출력 2438행 | PASS |
| feature MEDIA-019 name present | 위 명령·원출력 2439행 | PASS |
| feature MEDIA-019 UI need 간접 | 위 명령·원출력 2440행 | PASS |
| feature MEDIA-019 test need 필요 | 위 명령·원출력 2441행 | PASS |
| feature MEDIA-019 test area assigned | 위 명령·원출력 2442행 | PASS |
| feature MEDIA-019 pass criteria present | 위 명령·원출력 2443행 | PASS |
| feature MEDIA-020 name present | 위 명령·원출력 2444행 | PASS |
| feature MEDIA-020 UI need 비대상 | 위 명령·원출력 2445행 | PASS |
| feature MEDIA-020 test need 필요 | 위 명령·원출력 2446행 | PASS |
| feature MEDIA-020 test area assigned | 위 명령·원출력 2447행 | PASS |
| feature MEDIA-020 pass criteria present | 위 명령·원출력 2448행 | PASS |
| feature MEDIA-021 name present | 위 명령·원출력 2449행 | PASS |
| feature MEDIA-021 UI need 비대상 | 위 명령·원출력 2450행 | PASS |
| feature MEDIA-021 test need 필요 | 위 명령·원출력 2451행 | PASS |
| feature MEDIA-021 test area assigned | 위 명령·원출력 2452행 | PASS |
| feature MEDIA-021 pass criteria present | 위 명령·원출력 2453행 | PASS |
| feature MEDIA-022 name present | 위 명령·원출력 2454행 | PASS |
| feature MEDIA-022 UI need 비대상 | 위 명령·원출력 2455행 | PASS |
| feature MEDIA-022 test need 필요 | 위 명령·원출력 2456행 | PASS |
| feature MEDIA-022 test area assigned | 위 명령·원출력 2457행 | PASS |
| feature MEDIA-022 pass criteria present | 위 명령·원출력 2458행 | PASS |
| feature MEDIA-023 name present | 위 명령·원출력 2459행 | PASS |
| feature MEDIA-023 UI need 비대상 | 위 명령·원출력 2460행 | PASS |
| feature MEDIA-023 test need 필요 | 위 명령·원출력 2461행 | PASS |
| feature MEDIA-023 test area assigned | 위 명령·원출력 2462행 | PASS |
| feature MEDIA-023 pass criteria present | 위 명령·원출력 2463행 | PASS |
| feature MEDIA-024 name present | 위 명령·원출력 2464행 | PASS |
| feature MEDIA-024 UI need 비대상 | 위 명령·원출력 2465행 | PASS |
| feature MEDIA-024 test need 필요 | 위 명령·원출력 2466행 | PASS |
| feature MEDIA-024 test area assigned | 위 명령·원출력 2467행 | PASS |
| feature MEDIA-024 pass criteria present | 위 명령·원출력 2468행 | PASS |
| feature MEDIA-025 name present | 위 명령·원출력 2469행 | PASS |
| feature MEDIA-025 UI need 비대상 | 위 명령·원출력 2470행 | PASS |
| feature MEDIA-025 test need 필요 | 위 명령·원출력 2471행 | PASS |
| feature MEDIA-025 test area assigned | 위 명령·원출력 2472행 | PASS |
| feature MEDIA-025 pass criteria present | 위 명령·원출력 2473행 | PASS |
| feature MEDIA-026 name present | 위 명령·원출력 2474행 | PASS |
| feature MEDIA-026 UI need 비대상 | 위 명령·원출력 2475행 | PASS |
| feature MEDIA-026 test need 필요 | 위 명령·원출력 2476행 | PASS |
| feature MEDIA-026 test area assigned | 위 명령·원출력 2477행 | PASS |
| feature MEDIA-026 pass criteria present | 위 명령·원출력 2478행 | PASS |
| feature MEDIA-027 name present | 위 명령·원출력 2479행 | PASS |
| feature MEDIA-027 UI need 비대상 | 위 명령·원출력 2480행 | PASS |
| feature MEDIA-027 test need 필요 | 위 명령·원출력 2481행 | PASS |
| feature MEDIA-027 test area assigned | 위 명령·원출력 2482행 | PASS |
| feature MEDIA-027 pass criteria present | 위 명령·원출력 2483행 | PASS |
| feature LAB-001 name present | 위 명령·원출력 2484행 | PASS |
| feature LAB-001 UI need 비대상 | 위 명령·원출력 2485행 | PASS |
| feature LAB-001 test need 필요 | 위 명령·원출력 2486행 | PASS |
| feature LAB-001 test area assigned | 위 명령·원출력 2487행 | PASS |
| feature LAB-001 pass criteria present | 위 명령·원출력 2488행 | PASS |
| feature LAB-002 name present | 위 명령·원출력 2489행 | PASS |
| feature LAB-002 UI need 비대상 | 위 명령·원출력 2490행 | PASS |
| feature LAB-002 test need 필요 | 위 명령·원출력 2491행 | PASS |
| feature LAB-002 test area assigned | 위 명령·원출력 2492행 | PASS |
| feature LAB-002 pass criteria present | 위 명령·원출력 2493행 | PASS |
| feature LAB-003 name present | 위 명령·원출력 2494행 | PASS |
| feature LAB-003 UI need 비대상 | 위 명령·원출력 2495행 | PASS |
| feature LAB-003 test need 필요 | 위 명령·원출력 2496행 | PASS |
| feature LAB-003 test area assigned | 위 명령·원출력 2497행 | PASS |
| feature LAB-003 pass criteria present | 위 명령·원출력 2498행 | PASS |
| feature LAB-004 name present | 위 명령·원출력 2499행 | PASS |
| feature LAB-004 UI need 비대상 | 위 명령·원출력 2500행 | PASS |
| feature LAB-004 test need 필요 | 위 명령·원출력 2501행 | PASS |
| feature LAB-004 test area assigned | 위 명령·원출력 2502행 | PASS |
| feature LAB-004 pass criteria present | 위 명령·원출력 2503행 | PASS |
| feature LAB-005 name present | 위 명령·원출력 2504행 | PASS |
| feature LAB-005 UI need 비대상 | 위 명령·원출력 2505행 | PASS |
| feature LAB-005 test need 필요 | 위 명령·원출력 2506행 | PASS |
| feature LAB-005 test area assigned | 위 명령·원출력 2507행 | PASS |
| feature LAB-005 pass criteria present | 위 명령·원출력 2508행 | PASS |
| feature LAB-006 name present | 위 명령·원출력 2509행 | PASS |
| feature LAB-006 UI need 비대상 | 위 명령·원출력 2510행 | PASS |
| feature LAB-006 test need 필요 | 위 명령·원출력 2511행 | PASS |
| feature LAB-006 test area assigned | 위 명령·원출력 2512행 | PASS |
| feature LAB-006 pass criteria present | 위 명령·원출력 2513행 | PASS |
| feature LAB-007 name present | 위 명령·원출력 2514행 | PASS |
| feature LAB-007 UI need 비대상 | 위 명령·원출력 2515행 | PASS |
| feature LAB-007 test need 필요 | 위 명령·원출력 2516행 | PASS |
| feature LAB-007 test area assigned | 위 명령·원출력 2517행 | PASS |
| feature LAB-007 pass criteria present | 위 명령·원출력 2518행 | PASS |
| feature LAB-008 name present | 위 명령·원출력 2519행 | PASS |
| feature LAB-008 UI need 비대상 | 위 명령·원출력 2520행 | PASS |
| feature LAB-008 test need 필요 | 위 명령·원출력 2521행 | PASS |
| feature LAB-008 test area assigned | 위 명령·원출력 2522행 | PASS |
| feature LAB-008 pass criteria present | 위 명령·원출력 2523행 | PASS |
| feature LAB-009 name present | 위 명령·원출력 2524행 | PASS |
| feature LAB-009 UI need 비대상 | 위 명령·원출력 2525행 | PASS |
| feature LAB-009 test need 필요 | 위 명령·원출력 2526행 | PASS |
| feature LAB-009 test area assigned | 위 명령·원출력 2527행 | PASS |
| feature LAB-009 pass criteria present | 위 명령·원출력 2528행 | PASS |
| feature LAB-010 name present | 위 명령·원출력 2529행 | PASS |
| feature LAB-010 UI need 비대상 | 위 명령·원출력 2530행 | PASS |
| feature LAB-010 test need 필요 | 위 명령·원출력 2531행 | PASS |
| feature LAB-010 test area assigned | 위 명령·원출력 2532행 | PASS |
| feature LAB-010 pass criteria present | 위 명령·원출력 2533행 | PASS |
| feature LAB-011 name present | 위 명령·원출력 2534행 | PASS |
| feature LAB-011 UI need 비대상 | 위 명령·원출력 2535행 | PASS |
| feature LAB-011 test need 필요 | 위 명령·원출력 2536행 | PASS |
| feature LAB-011 test area assigned | 위 명령·원출력 2537행 | PASS |
| feature LAB-011 pass criteria present | 위 명령·원출력 2538행 | PASS |
| feature LAB-012 name present | 위 명령·원출력 2539행 | PASS |
| feature LAB-012 UI need 비대상 | 위 명령·원출력 2540행 | PASS |
| feature LAB-012 test need 필요 | 위 명령·원출력 2541행 | PASS |
| feature LAB-012 test area assigned | 위 명령·원출력 2542행 | PASS |
| feature LAB-012 pass criteria present | 위 명령·원출력 2543행 | PASS |
| feature LAB-013 name present | 위 명령·원출력 2544행 | PASS |
| feature LAB-013 UI need 비대상 | 위 명령·원출력 2545행 | PASS |
| feature LAB-013 test need 필요 | 위 명령·원출력 2546행 | PASS |
| feature LAB-013 test area assigned | 위 명령·원출력 2547행 | PASS |
| feature LAB-013 pass criteria present | 위 명령·원출력 2548행 | PASS |
| feature LAB-014 name present | 위 명령·원출력 2549행 | PASS |
| feature LAB-014 UI need 비대상 | 위 명령·원출력 2550행 | PASS |
| feature LAB-014 test need 필요 | 위 명령·원출력 2551행 | PASS |
| feature LAB-014 test area assigned | 위 명령·원출력 2552행 | PASS |
| feature LAB-014 pass criteria present | 위 명령·원출력 2553행 | PASS |
| feature LAB-015 name present | 위 명령·원출력 2554행 | PASS |
| feature LAB-015 UI need 비대상 | 위 명령·원출력 2555행 | PASS |
| feature LAB-015 test need 필요 | 위 명령·원출력 2556행 | PASS |
| feature LAB-015 test area assigned | 위 명령·원출력 2557행 | PASS |
| feature LAB-015 pass criteria present | 위 명령·원출력 2558행 | PASS |
| feature LAB-016 name present | 위 명령·원출력 2559행 | PASS |
| feature LAB-016 UI need 비대상 | 위 명령·원출력 2560행 | PASS |
| feature LAB-016 test need 필요 | 위 명령·원출력 2561행 | PASS |
| feature LAB-016 test area assigned | 위 명령·원출력 2562행 | PASS |
| feature LAB-016 pass criteria present | 위 명령·원출력 2563행 | PASS |
| feature LAB-017 name present | 위 명령·원출력 2564행 | PASS |
| feature LAB-017 UI need 비대상 | 위 명령·원출력 2565행 | PASS |
| feature LAB-017 test need 필요 | 위 명령·원출력 2566행 | PASS |
| feature LAB-017 test area assigned | 위 명령·원출력 2567행 | PASS |
| feature LAB-017 pass criteria present | 위 명령·원출력 2568행 | PASS |
| feature LAB-018 name present | 위 명령·원출력 2569행 | PASS |
| feature LAB-018 UI need 비대상 | 위 명령·원출력 2570행 | PASS |
| feature LAB-018 test need 필요 | 위 명령·원출력 2571행 | PASS |
| feature LAB-018 test area assigned | 위 명령·원출력 2572행 | PASS |
| feature LAB-018 pass criteria present | 위 명령·원출력 2573행 | PASS |
| feature LAB-019 name present | 위 명령·원출력 2574행 | PASS |
| feature LAB-019 UI need 비대상 | 위 명령·원출력 2575행 | PASS |
| feature LAB-019 test need 필요 | 위 명령·원출력 2576행 | PASS |
| feature LAB-019 test area assigned | 위 명령·원출력 2577행 | PASS |
| feature LAB-019 pass criteria present | 위 명령·원출력 2578행 | PASS |
| feature LAB-020 name present | 위 명령·원출력 2579행 | PASS |
| feature LAB-020 UI need 비대상 | 위 명령·원출력 2580행 | PASS |
| feature LAB-020 test need 필요 | 위 명령·원출력 2581행 | PASS |
| feature LAB-020 test area assigned | 위 명령·원출력 2582행 | PASS |
| feature LAB-020 pass criteria present | 위 명령·원출력 2583행 | PASS |
| feature LAB-021 name present | 위 명령·원출력 2584행 | PASS |
| feature LAB-021 UI need 비대상 | 위 명령·원출력 2585행 | PASS |
| feature LAB-021 test need 필요 | 위 명령·원출력 2586행 | PASS |
| feature LAB-021 test area assigned | 위 명령·원출력 2587행 | PASS |
| feature LAB-021 pass criteria present | 위 명령·원출력 2588행 | PASS |
| feature LAB-022 name present | 위 명령·원출력 2589행 | PASS |
| feature LAB-022 UI need 비대상 | 위 명령·원출력 2590행 | PASS |
| feature LAB-022 test need 필요 | 위 명령·원출력 2591행 | PASS |
| feature LAB-022 test area assigned | 위 명령·원출력 2592행 | PASS |
| feature LAB-022 pass criteria present | 위 명령·원출력 2593행 | PASS |
| feature LAB-023 name present | 위 명령·원출력 2594행 | PASS |
| feature LAB-023 UI need 비대상 | 위 명령·원출력 2595행 | PASS |
| feature LAB-023 test need 필요 | 위 명령·원출력 2596행 | PASS |
| feature LAB-023 test area assigned | 위 명령·원출력 2597행 | PASS |
| feature LAB-023 pass criteria present | 위 명령·원출력 2598행 | PASS |
| feature LAB-024 name present | 위 명령·원출력 2599행 | PASS |
| feature LAB-024 UI need 비대상 | 위 명령·원출력 2600행 | PASS |
| feature LAB-024 test need 필요 | 위 명령·원출력 2601행 | PASS |
| feature LAB-024 test area assigned | 위 명령·원출력 2602행 | PASS |
| feature LAB-024 pass criteria present | 위 명령·원출력 2603행 | PASS |
| feature LAB-025 name present | 위 명령·원출력 2604행 | PASS |
| feature LAB-025 UI need 비대상 | 위 명령·원출력 2605행 | PASS |
| feature LAB-025 test need 필요 | 위 명령·원출력 2606행 | PASS |
| feature LAB-025 test area assigned | 위 명령·원출력 2607행 | PASS |
| feature LAB-025 pass criteria present | 위 명령·원출력 2608행 | PASS |
| feature LAB-026 name present | 위 명령·원출력 2609행 | PASS |
| feature LAB-026 UI need 비대상 | 위 명령·원출력 2610행 | PASS |
| feature LAB-026 test need 필요 | 위 명령·원출력 2611행 | PASS |
| feature LAB-026 test area assigned | 위 명령·원출력 2612행 | PASS |
| feature LAB-026 pass criteria present | 위 명령·원출력 2613행 | PASS |
| feature LAB-027 name present | 위 명령·원출력 2614행 | PASS |
| feature LAB-027 UI need 비대상 | 위 명령·원출력 2615행 | PASS |
| feature LAB-027 test need 필요 | 위 명령·원출력 2616행 | PASS |
| feature LAB-027 test area assigned | 위 명령·원출력 2617행 | PASS |
| feature LAB-027 pass criteria present | 위 명령·원출력 2618행 | PASS |
| feature LAB-028 name present | 위 명령·원출력 2619행 | PASS |
| feature LAB-028 UI need 비대상 | 위 명령·원출력 2620행 | PASS |
| feature LAB-028 test need 필요 | 위 명령·원출력 2621행 | PASS |
| feature LAB-028 test area assigned | 위 명령·원출력 2622행 | PASS |
| feature LAB-028 pass criteria present | 위 명령·원출력 2623행 | PASS |
| feature LAB-029 name present | 위 명령·원출력 2624행 | PASS |
| feature LAB-029 UI need 비대상 | 위 명령·원출력 2625행 | PASS |
| feature LAB-029 test need 필요 | 위 명령·원출력 2626행 | PASS |
| feature LAB-029 test area assigned | 위 명령·원출력 2627행 | PASS |
| feature LAB-029 pass criteria present | 위 명령·원출력 2628행 | PASS |
| feature LAB-030 name present | 위 명령·원출력 2629행 | PASS |
| feature LAB-030 UI need 비대상 | 위 명령·원출력 2630행 | PASS |
| feature LAB-030 test need 필요 | 위 명령·원출력 2631행 | PASS |
| feature LAB-030 test area assigned | 위 명령·원출력 2632행 | PASS |
| feature LAB-030 pass criteria present | 위 명령·원출력 2633행 | PASS |
| feature LAB-031 name present | 위 명령·원출력 2634행 | PASS |
| feature LAB-031 UI need 비대상 | 위 명령·원출력 2635행 | PASS |
| feature LAB-031 test need 필요 | 위 명령·원출력 2636행 | PASS |
| feature LAB-031 test area assigned | 위 명령·원출력 2637행 | PASS |
| feature LAB-031 pass criteria present | 위 명령·원출력 2638행 | PASS |
| feature LAB-032 name present | 위 명령·원출력 2639행 | PASS |
| feature LAB-032 UI need 비대상 | 위 명령·원출력 2640행 | PASS |
| feature LAB-032 test need 필요 | 위 명령·원출력 2641행 | PASS |
| feature LAB-032 test area assigned | 위 명령·원출력 2642행 | PASS |
| feature LAB-032 pass criteria present | 위 명령·원출력 2643행 | PASS |
| feature LAB-033 name present | 위 명령·원출력 2644행 | PASS |
| feature LAB-033 UI need 비대상 | 위 명령·원출력 2645행 | PASS |
| feature LAB-033 test need 필요 | 위 명령·원출력 2646행 | PASS |
| feature LAB-033 test area assigned | 위 명령·원출력 2647행 | PASS |
| feature LAB-033 pass criteria present | 위 명령·원출력 2648행 | PASS |
| feature LAB-034 name present | 위 명령·원출력 2649행 | PASS |
| feature LAB-034 UI need 비대상 | 위 명령·원출력 2650행 | PASS |
| feature LAB-034 test need 필요 | 위 명령·원출력 2651행 | PASS |
| feature LAB-034 test area assigned | 위 명령·원출력 2652행 | PASS |
| feature LAB-034 pass criteria present | 위 명령·원출력 2653행 | PASS |
| feature LAB-035 name present | 위 명령·원출력 2654행 | PASS |
| feature LAB-035 UI need 비대상 | 위 명령·원출력 2655행 | PASS |
| feature LAB-035 test need 필요 | 위 명령·원출력 2656행 | PASS |
| feature LAB-035 test area assigned | 위 명령·원출력 2657행 | PASS |
| feature LAB-035 pass criteria present | 위 명령·원출력 2658행 | PASS |
| feature LAB-036 name present | 위 명령·원출력 2659행 | PASS |
| feature LAB-036 UI need 비대상 | 위 명령·원출력 2660행 | PASS |
| feature LAB-036 test need 필요 | 위 명령·원출력 2661행 | PASS |
| feature LAB-036 test area assigned | 위 명령·원출력 2662행 | PASS |
| feature LAB-036 pass criteria present | 위 명령·원출력 2663행 | PASS |
| feature LAB-037 name present | 위 명령·원출력 2664행 | PASS |
| feature LAB-037 UI need 비대상 | 위 명령·원출력 2665행 | PASS |
| feature LAB-037 test need 필요 | 위 명령·원출력 2666행 | PASS |
| feature LAB-037 test area assigned | 위 명령·원출력 2667행 | PASS |
| feature LAB-037 pass criteria present | 위 명령·원출력 2668행 | PASS |
| feature LAB-038 name present | 위 명령·원출력 2669행 | PASS |
| feature LAB-038 UI need 비대상 | 위 명령·원출력 2670행 | PASS |
| feature LAB-038 test need 필요 | 위 명령·원출력 2671행 | PASS |
| feature LAB-038 test area assigned | 위 명령·원출력 2672행 | PASS |
| feature LAB-038 pass criteria present | 위 명령·원출력 2673행 | PASS |
| feature LAB-039 name present | 위 명령·원출력 2674행 | PASS |
| feature LAB-039 UI need 비대상 | 위 명령·원출력 2675행 | PASS |
| feature LAB-039 test need 필요 | 위 명령·원출력 2676행 | PASS |
| feature LAB-039 test area assigned | 위 명령·원출력 2677행 | PASS |
| feature LAB-039 pass criteria present | 위 명령·원출력 2678행 | PASS |
| feature LAB-040 name present | 위 명령·원출력 2679행 | PASS |
| feature LAB-040 UI need 비대상 | 위 명령·원출력 2680행 | PASS |
| feature LAB-040 test need 필요 | 위 명령·원출력 2681행 | PASS |
| feature LAB-040 test area assigned | 위 명령·원출력 2682행 | PASS |
| feature LAB-040 pass criteria present | 위 명령·원출력 2683행 | PASS |
| feature LAB-041 name present | 위 명령·원출력 2684행 | PASS |
| feature LAB-041 UI need 비대상 | 위 명령·원출력 2685행 | PASS |
| feature LAB-041 test need 필요 | 위 명령·원출력 2686행 | PASS |
| feature LAB-041 test area assigned | 위 명령·원출력 2687행 | PASS |
| feature LAB-041 pass criteria present | 위 명령·원출력 2688행 | PASS |
| feature LAB-042 name present | 위 명령·원출력 2689행 | PASS |
| feature LAB-042 UI need 비대상 | 위 명령·원출력 2690행 | PASS |
| feature LAB-042 test need 필요 | 위 명령·원출력 2691행 | PASS |
| feature LAB-042 test area assigned | 위 명령·원출력 2692행 | PASS |
| feature LAB-042 pass criteria present | 위 명령·원출력 2693행 | PASS |
| feature LAB-043 name present | 위 명령·원출력 2694행 | PASS |
| feature LAB-043 UI need 비대상 | 위 명령·원출력 2695행 | PASS |
| feature LAB-043 test need 필요 | 위 명령·원출력 2696행 | PASS |
| feature LAB-043 test area assigned | 위 명령·원출력 2697행 | PASS |
| feature LAB-043 pass criteria present | 위 명령·원출력 2698행 | PASS |
| feature LAB-044 name present | 위 명령·원출력 2699행 | PASS |
| feature LAB-044 UI need 비대상 | 위 명령·원출력 2700행 | PASS |
| feature LAB-044 test need 필요 | 위 명령·원출력 2701행 | PASS |
| feature LAB-044 test area assigned | 위 명령·원출력 2702행 | PASS |
| feature LAB-044 pass criteria present | 위 명령·원출력 2703행 | PASS |
| feature LAB-045 name present | 위 명령·원출력 2704행 | PASS |
| feature LAB-045 UI need 비대상 | 위 명령·원출력 2705행 | PASS |
| feature LAB-045 test need 필요 | 위 명령·원출력 2706행 | PASS |
| feature LAB-045 test area assigned | 위 명령·원출력 2707행 | PASS |
| feature LAB-045 pass criteria present | 위 명령·원출력 2708행 | PASS |
| feature LAB-046 name present | 위 명령·원출력 2709행 | PASS |
| feature LAB-046 UI need 비대상 | 위 명령·원출력 2710행 | PASS |
| feature LAB-046 test need 필요 | 위 명령·원출력 2711행 | PASS |
| feature LAB-046 test area assigned | 위 명령·원출력 2712행 | PASS |
| feature LAB-046 pass criteria present | 위 명령·원출력 2713행 | PASS |
| feature LAB-047 name present | 위 명령·원출력 2714행 | PASS |
| feature LAB-047 UI need 비대상 | 위 명령·원출력 2715행 | PASS |
| feature LAB-047 test need 필요 | 위 명령·원출력 2716행 | PASS |
| feature LAB-047 test area assigned | 위 명령·원출력 2717행 | PASS |
| feature LAB-047 pass criteria present | 위 명령·원출력 2718행 | PASS |
| feature LAB-048 name present | 위 명령·원출력 2719행 | PASS |
| feature LAB-048 UI need 비대상 | 위 명령·원출력 2720행 | PASS |
| feature LAB-048 test need 필요 | 위 명령·원출력 2721행 | PASS |
| feature LAB-048 test area assigned | 위 명령·원출력 2722행 | PASS |
| feature LAB-048 pass criteria present | 위 명령·원출력 2723행 | PASS |
| feature LAB-049 name present | 위 명령·원출력 2724행 | PASS |
| feature LAB-049 UI need 비대상 | 위 명령·원출력 2725행 | PASS |
| feature LAB-049 test need 필요 | 위 명령·원출력 2726행 | PASS |
| feature LAB-049 test area assigned | 위 명령·원출력 2727행 | PASS |
| feature LAB-049 pass criteria present | 위 명령·원출력 2728행 | PASS |
| feature LAB-050 name present | 위 명령·원출력 2729행 | PASS |
| feature LAB-050 UI need 비대상 | 위 명령·원출력 2730행 | PASS |
| feature LAB-050 test need 필요 | 위 명령·원출력 2731행 | PASS |
| feature LAB-050 test area assigned | 위 명령·원출력 2732행 | PASS |
| feature LAB-050 pass criteria present | 위 명령·원출력 2733행 | PASS |
| feature LAB-051 name present | 위 명령·원출력 2734행 | PASS |
| feature LAB-051 UI need 비대상 | 위 명령·원출력 2735행 | PASS |
| feature LAB-051 test need 필요 | 위 명령·원출력 2736행 | PASS |
| feature LAB-051 test area assigned | 위 명령·원출력 2737행 | PASS |
| feature LAB-051 pass criteria present | 위 명령·원출력 2738행 | PASS |
| feature LAB-052 name present | 위 명령·원출력 2739행 | PASS |
| feature LAB-052 UI need 비대상 | 위 명령·원출력 2740행 | PASS |
| feature LAB-052 test need 필요 | 위 명령·원출력 2741행 | PASS |
| feature LAB-052 test area assigned | 위 명령·원출력 2742행 | PASS |
| feature LAB-052 pass criteria present | 위 명령·원출력 2743행 | PASS |
| feature LAB-053 name present | 위 명령·원출력 2744행 | PASS |
| feature LAB-053 UI need 비대상 | 위 명령·원출력 2745행 | PASS |
| feature LAB-053 test need 필요 | 위 명령·원출력 2746행 | PASS |
| feature LAB-053 test area assigned | 위 명령·원출력 2747행 | PASS |
| feature LAB-053 pass criteria present | 위 명령·원출력 2748행 | PASS |
| feature LAB-054 name present | 위 명령·원출력 2749행 | PASS |
| feature LAB-054 UI need 비대상 | 위 명령·원출력 2750행 | PASS |
| feature LAB-054 test need 필요 | 위 명령·원출력 2751행 | PASS |
| feature LAB-054 test area assigned | 위 명령·원출력 2752행 | PASS |
| feature LAB-054 pass criteria present | 위 명령·원출력 2753행 | PASS |
| feature LAB-055 name present | 위 명령·원출력 2754행 | PASS |
| feature LAB-055 UI need 비대상 | 위 명령·원출력 2755행 | PASS |
| feature LAB-055 test need 필요 | 위 명령·원출력 2756행 | PASS |
| feature LAB-055 test area assigned | 위 명령·원출력 2757행 | PASS |
| feature LAB-055 pass criteria present | 위 명령·원출력 2758행 | PASS |
| feature LAB-056 name present | 위 명령·원출력 2759행 | PASS |
| feature LAB-056 UI need 비대상 | 위 명령·원출력 2760행 | PASS |
| feature LAB-056 test need 필요 | 위 명령·원출력 2761행 | PASS |
| feature LAB-056 test area assigned | 위 명령·원출력 2762행 | PASS |
| feature LAB-056 pass criteria present | 위 명령·원출력 2763행 | PASS |
| feature LAB-057 name present | 위 명령·원출력 2764행 | PASS |
| feature LAB-057 UI need 비대상 | 위 명령·원출력 2765행 | PASS |
| feature LAB-057 test need 필요 | 위 명령·원출력 2766행 | PASS |
| feature LAB-057 test area assigned | 위 명령·원출력 2767행 | PASS |
| feature LAB-057 pass criteria present | 위 명령·원출력 2768행 | PASS |
| feature LAB-058 name present | 위 명령·원출력 2769행 | PASS |
| feature LAB-058 UI need 비대상 | 위 명령·원출력 2770행 | PASS |
| feature LAB-058 test need 필요 | 위 명령·원출력 2771행 | PASS |
| feature LAB-058 test area assigned | 위 명령·원출력 2772행 | PASS |
| feature LAB-058 pass criteria present | 위 명령·원출력 2773행 | PASS |
| feature LAB-059 name present | 위 명령·원출력 2774행 | PASS |
| feature LAB-059 UI need 비대상 | 위 명령·원출력 2775행 | PASS |
| feature LAB-059 test need 필요 | 위 명령·원출력 2776행 | PASS |
| feature LAB-059 test area assigned | 위 명령·원출력 2777행 | PASS |
| feature LAB-059 pass criteria present | 위 명령·원출력 2778행 | PASS |
| feature LAB-060 name present | 위 명령·원출력 2779행 | PASS |
| feature LAB-060 UI need 비대상 | 위 명령·원출력 2780행 | PASS |
| feature LAB-060 test need 필요 | 위 명령·원출력 2781행 | PASS |
| feature LAB-060 test area assigned | 위 명령·원출력 2782행 | PASS |
| feature LAB-060 pass criteria present | 위 명령·원출력 2783행 | PASS |
| feature LAB-061 name present | 위 명령·원출력 2784행 | PASS |
| feature LAB-061 UI need 비대상 | 위 명령·원출력 2785행 | PASS |
| feature LAB-061 test need 필요 | 위 명령·원출력 2786행 | PASS |
| feature LAB-061 test area assigned | 위 명령·원출력 2787행 | PASS |
| feature LAB-061 pass criteria present | 위 명령·원출력 2788행 | PASS |
| feature LAB-062 name present | 위 명령·원출력 2789행 | PASS |
| feature LAB-062 UI need 비대상 | 위 명령·원출력 2790행 | PASS |
| feature LAB-062 test need 필요 | 위 명령·원출력 2791행 | PASS |
| feature LAB-062 test area assigned | 위 명령·원출력 2792행 | PASS |
| feature LAB-062 pass criteria present | 위 명령·원출력 2793행 | PASS |
| feature LAB-063 name present | 위 명령·원출력 2794행 | PASS |
| feature LAB-063 UI need 비대상 | 위 명령·원출력 2795행 | PASS |
| feature LAB-063 test need 필요 | 위 명령·원출력 2796행 | PASS |
| feature LAB-063 test area assigned | 위 명령·원출력 2797행 | PASS |
| feature LAB-063 pass criteria present | 위 명령·원출력 2798행 | PASS |
| feature LAB-064 name present | 위 명령·원출력 2799행 | PASS |
| feature LAB-064 UI need 비대상 | 위 명령·원출력 2800행 | PASS |
| feature LAB-064 test need 필요 | 위 명령·원출력 2801행 | PASS |
| feature LAB-064 test area assigned | 위 명령·원출력 2802행 | PASS |
| feature LAB-064 pass criteria present | 위 명령·원출력 2803행 | PASS |
| feature LAB-065 name present | 위 명령·원출력 2804행 | PASS |
| feature LAB-065 UI need 비대상 | 위 명령·원출력 2805행 | PASS |
| feature LAB-065 test need 필요 | 위 명령·원출력 2806행 | PASS |
| feature LAB-065 test area assigned | 위 명령·원출력 2807행 | PASS |
| feature LAB-065 pass criteria present | 위 명령·원출력 2808행 | PASS |
| feature LAB-066 name present | 위 명령·원출력 2809행 | PASS |
| feature LAB-066 UI need 비대상 | 위 명령·원출력 2810행 | PASS |
| feature LAB-066 test need 필요 | 위 명령·원출력 2811행 | PASS |
| feature LAB-066 test area assigned | 위 명령·원출력 2812행 | PASS |
| feature LAB-066 pass criteria present | 위 명령·원출력 2813행 | PASS |
| feature LAB-067 name present | 위 명령·원출력 2814행 | PASS |
| feature LAB-067 UI need 비대상 | 위 명령·원출력 2815행 | PASS |
| feature LAB-067 test need 필요 | 위 명령·원출력 2816행 | PASS |
| feature LAB-067 test area assigned | 위 명령·원출력 2817행 | PASS |
| feature LAB-067 pass criteria present | 위 명령·원출력 2818행 | PASS |
| feature LAB-068 name present | 위 명령·원출력 2819행 | PASS |
| feature LAB-068 UI need 비대상 | 위 명령·원출력 2820행 | PASS |
| feature LAB-068 test need 필요 | 위 명령·원출력 2821행 | PASS |
| feature LAB-068 test area assigned | 위 명령·원출력 2822행 | PASS |
| feature LAB-068 pass criteria present | 위 명령·원출력 2823행 | PASS |
| feature LAB-069 name present | 위 명령·원출력 2824행 | PASS |
| feature LAB-069 UI need 비대상 | 위 명령·원출력 2825행 | PASS |
| feature LAB-069 test need 필요 | 위 명령·원출력 2826행 | PASS |
| feature LAB-069 test area assigned | 위 명령·원출력 2827행 | PASS |
| feature LAB-069 pass criteria present | 위 명령·원출력 2828행 | PASS |
| feature LAB-070 name present | 위 명령·원출력 2829행 | PASS |
| feature LAB-070 UI need 비대상 | 위 명령·원출력 2830행 | PASS |
| feature LAB-070 test need 필요 | 위 명령·원출력 2831행 | PASS |
| feature LAB-070 test area assigned | 위 명령·원출력 2832행 | PASS |
| feature LAB-070 pass criteria present | 위 명령·원출력 2833행 | PASS |
| feature LAB-071 name present | 위 명령·원출력 2834행 | PASS |
| feature LAB-071 UI need 비대상 | 위 명령·원출력 2835행 | PASS |
| feature LAB-071 test need 필요 | 위 명령·원출력 2836행 | PASS |
| feature LAB-071 test area assigned | 위 명령·원출력 2837행 | PASS |
| feature LAB-071 pass criteria present | 위 명령·원출력 2838행 | PASS |
| feature LAB-072 name present | 위 명령·원출력 2839행 | PASS |
| feature LAB-072 UI need 비대상 | 위 명령·원출력 2840행 | PASS |
| feature LAB-072 test need 필요 | 위 명령·원출력 2841행 | PASS |
| feature LAB-072 test area assigned | 위 명령·원출력 2842행 | PASS |
| feature LAB-072 pass criteria present | 위 명령·원출력 2843행 | PASS |
| feature LAB-073 name present | 위 명령·원출력 2844행 | PASS |
| feature LAB-073 UI need 비대상 | 위 명령·원출력 2845행 | PASS |
| feature LAB-073 test need 필요 | 위 명령·원출력 2846행 | PASS |
| feature LAB-073 test area assigned | 위 명령·원출력 2847행 | PASS |
| feature LAB-073 pass criteria present | 위 명령·원출력 2848행 | PASS |
| feature LAB-074 name present | 위 명령·원출력 2849행 | PASS |
| feature LAB-074 UI need 비대상 | 위 명령·원출력 2850행 | PASS |
| feature LAB-074 test need 필요 | 위 명령·원출력 2851행 | PASS |
| feature LAB-074 test area assigned | 위 명령·원출력 2852행 | PASS |
| feature LAB-074 pass criteria present | 위 명령·원출력 2853행 | PASS |
| feature LAB-075 name present | 위 명령·원출력 2854행 | PASS |
| feature LAB-075 UI need 비대상 | 위 명령·원출력 2855행 | PASS |
| feature LAB-075 test need 필요 | 위 명령·원출력 2856행 | PASS |
| feature LAB-075 test area assigned | 위 명령·원출력 2857행 | PASS |
| feature LAB-075 pass criteria present | 위 명령·원출력 2858행 | PASS |
| feature LAB-076 name present | 위 명령·원출력 2859행 | PASS |
| feature LAB-076 UI need 비대상 | 위 명령·원출력 2860행 | PASS |
| feature LAB-076 test need 필요 | 위 명령·원출력 2861행 | PASS |
| feature LAB-076 test area assigned | 위 명령·원출력 2862행 | PASS |
| feature LAB-076 pass criteria present | 위 명령·원출력 2863행 | PASS |
| feature LAB-077 name present | 위 명령·원출력 2864행 | PASS |
| feature LAB-077 UI need 비대상 | 위 명령·원출력 2865행 | PASS |
| feature LAB-077 test need 필요 | 위 명령·원출력 2866행 | PASS |
| feature LAB-077 test area assigned | 위 명령·원출력 2867행 | PASS |
| feature LAB-077 pass criteria present | 위 명령·원출력 2868행 | PASS |
| feature LAB-078 name present | 위 명령·원출력 2869행 | PASS |
| feature LAB-078 UI need 비대상 | 위 명령·원출력 2870행 | PASS |
| feature LAB-078 test need 필요 | 위 명령·원출력 2871행 | PASS |
| feature LAB-078 test area assigned | 위 명령·원출력 2872행 | PASS |
| feature LAB-078 pass criteria present | 위 명령·원출력 2873행 | PASS |
| feature LAB-079 name present | 위 명령·원출력 2874행 | PASS |
| feature LAB-079 UI need 비대상 | 위 명령·원출력 2875행 | PASS |
| feature LAB-079 test need 필요 | 위 명령·원출력 2876행 | PASS |
| feature LAB-079 test area assigned | 위 명령·원출력 2877행 | PASS |
| feature LAB-079 pass criteria present | 위 명령·원출력 2878행 | PASS |
| feature LAB-080 name present | 위 명령·원출력 2879행 | PASS |
| feature LAB-080 UI need 비대상 | 위 명령·원출력 2880행 | PASS |
| feature LAB-080 test need 필요 | 위 명령·원출력 2881행 | PASS |
| feature LAB-080 test area assigned | 위 명령·원출력 2882행 | PASS |
| feature LAB-080 pass criteria present | 위 명령·원출력 2883행 | PASS |
| feature LAB-081 name present | 위 명령·원출력 2884행 | PASS |
| feature LAB-081 UI need 비대상 | 위 명령·원출력 2885행 | PASS |
| feature LAB-081 test need 필요 | 위 명령·원출력 2886행 | PASS |
| feature LAB-081 test area assigned | 위 명령·원출력 2887행 | PASS |
| feature LAB-081 pass criteria present | 위 명령·원출력 2888행 | PASS |
| feature LAB-082 name present | 위 명령·원출력 2889행 | PASS |
| feature LAB-082 UI need 비대상 | 위 명령·원출력 2890행 | PASS |
| feature LAB-082 test need 필요 | 위 명령·원출력 2891행 | PASS |
| feature LAB-082 test area assigned | 위 명령·원출력 2892행 | PASS |
| feature LAB-082 pass criteria present | 위 명령·원출력 2893행 | PASS |
| feature LAB-083 name present | 위 명령·원출력 2894행 | PASS |
| feature LAB-083 UI need 비대상 | 위 명령·원출력 2895행 | PASS |
| feature LAB-083 test need 필요 | 위 명령·원출력 2896행 | PASS |
| feature LAB-083 test area assigned | 위 명령·원출력 2897행 | PASS |
| feature LAB-083 pass criteria present | 위 명령·원출력 2898행 | PASS |
| feature LAB-084 name present | 위 명령·원출력 2899행 | PASS |
| feature LAB-084 UI need 비대상 | 위 명령·원출력 2900행 | PASS |
| feature LAB-084 test need 필요 | 위 명령·원출력 2901행 | PASS |
| feature LAB-084 test area assigned | 위 명령·원출력 2902행 | PASS |
| feature LAB-084 pass criteria present | 위 명령·원출력 2903행 | PASS |
| feature LAB-085 name present | 위 명령·원출력 2904행 | PASS |
| feature LAB-085 UI need 비대상 | 위 명령·원출력 2905행 | PASS |
| feature LAB-085 test need 필요 | 위 명령·원출력 2906행 | PASS |
| feature LAB-085 test area assigned | 위 명령·원출력 2907행 | PASS |
| feature LAB-085 pass criteria present | 위 명령·원출력 2908행 | PASS |
| feature LAB-086 name present | 위 명령·원출력 2909행 | PASS |
| feature LAB-086 UI need 비대상 | 위 명령·원출력 2910행 | PASS |
| feature LAB-086 test need 필요 | 위 명령·원출력 2911행 | PASS |
| feature LAB-086 test area assigned | 위 명령·원출력 2912행 | PASS |
| feature LAB-086 pass criteria present | 위 명령·원출력 2913행 | PASS |
| feature LAB-087 name present | 위 명령·원출력 2914행 | PASS |
| feature LAB-087 UI need 비대상 | 위 명령·원출력 2915행 | PASS |
| feature LAB-087 test need 필요 | 위 명령·원출력 2916행 | PASS |
| feature LAB-087 test area assigned | 위 명령·원출력 2917행 | PASS |
| feature LAB-087 pass criteria present | 위 명령·원출력 2918행 | PASS |
| feature LAB-088 name present | 위 명령·원출력 2919행 | PASS |
| feature LAB-088 UI need 비대상 | 위 명령·원출력 2920행 | PASS |
| feature LAB-088 test need 필요 | 위 명령·원출력 2921행 | PASS |
| feature LAB-088 test area assigned | 위 명령·원출력 2922행 | PASS |
| feature LAB-088 pass criteria present | 위 명령·원출력 2923행 | PASS |
| feature LAB-089 name present | 위 명령·원출력 2924행 | PASS |
| feature LAB-089 UI need 비대상 | 위 명령·원출력 2925행 | PASS |
| feature LAB-089 test need 필요 | 위 명령·원출력 2926행 | PASS |
| feature LAB-089 test area assigned | 위 명령·원출력 2927행 | PASS |
| feature LAB-089 pass criteria present | 위 명령·원출력 2928행 | PASS |
| feature LAB-090 name present | 위 명령·원출력 2929행 | PASS |
| feature LAB-090 UI need 비대상 | 위 명령·원출력 2930행 | PASS |
| feature LAB-090 test need 필요 | 위 명령·원출력 2931행 | PASS |
| feature LAB-090 test area assigned | 위 명령·원출력 2932행 | PASS |
| feature LAB-090 pass criteria present | 위 명령·원출력 2933행 | PASS |
| feature LAB-091 name present | 위 명령·원출력 2934행 | PASS |
| feature LAB-091 UI need 비대상 | 위 명령·원출력 2935행 | PASS |
| feature LAB-091 test need 필요 | 위 명령·원출력 2936행 | PASS |
| feature LAB-091 test area assigned | 위 명령·원출력 2937행 | PASS |
| feature LAB-091 pass criteria present | 위 명령·원출력 2938행 | PASS |
| feature LAB-092 name present | 위 명령·원출력 2939행 | PASS |
| feature LAB-092 UI need 비대상 | 위 명령·원출력 2940행 | PASS |
| feature LAB-092 test need 필요 | 위 명령·원출력 2941행 | PASS |
| feature LAB-092 test area assigned | 위 명령·원출력 2942행 | PASS |
| feature LAB-092 pass criteria present | 위 명령·원출력 2943행 | PASS |
| feature LAB-093 name present | 위 명령·원출력 2944행 | PASS |
| feature LAB-093 UI need 비대상 | 위 명령·원출력 2945행 | PASS |
| feature LAB-093 test need 필요 | 위 명령·원출력 2946행 | PASS |
| feature LAB-093 test area assigned | 위 명령·원출력 2947행 | PASS |
| feature LAB-093 pass criteria present | 위 명령·원출력 2948행 | PASS |
| feature LAB-094 name present | 위 명령·원출력 2949행 | PASS |
| feature LAB-094 UI need 비대상 | 위 명령·원출력 2950행 | PASS |
| feature LAB-094 test need 필요 | 위 명령·원출력 2951행 | PASS |
| feature LAB-094 test area assigned | 위 명령·원출력 2952행 | PASS |
| feature LAB-094 pass criteria present | 위 명령·원출력 2953행 | PASS |
| feature LAB-095 name present | 위 명령·원출력 2954행 | PASS |
| feature LAB-095 UI need 비대상 | 위 명령·원출력 2955행 | PASS |
| feature LAB-095 test need 필요 | 위 명령·원출력 2956행 | PASS |
| feature LAB-095 test area assigned | 위 명령·원출력 2957행 | PASS |
| feature LAB-095 pass criteria present | 위 명령·원출력 2958행 | PASS |
| feature LAB-096 name present | 위 명령·원출력 2959행 | PASS |
| feature LAB-096 UI need 비대상 | 위 명령·원출력 2960행 | PASS |
| feature LAB-096 test need 필요 | 위 명령·원출력 2961행 | PASS |
| feature LAB-096 test area assigned | 위 명령·원출력 2962행 | PASS |
| feature LAB-096 pass criteria present | 위 명령·원출력 2963행 | PASS |
| feature LAB-097 name present | 위 명령·원출력 2964행 | PASS |
| feature LAB-097 UI need 비대상 | 위 명령·원출력 2965행 | PASS |
| feature LAB-097 test need 필요 | 위 명령·원출력 2966행 | PASS |
| feature LAB-097 test area assigned | 위 명령·원출력 2967행 | PASS |
| feature LAB-097 pass criteria present | 위 명령·원출력 2968행 | PASS |
| feature LAB-098 name present | 위 명령·원출력 2969행 | PASS |
| feature LAB-098 UI need 비대상 | 위 명령·원출력 2970행 | PASS |
| feature LAB-098 test need 필요 | 위 명령·원출력 2971행 | PASS |
| feature LAB-098 test area assigned | 위 명령·원출력 2972행 | PASS |
| feature LAB-098 pass criteria present | 위 명령·원출력 2973행 | PASS |
| feature LAB-099 name present | 위 명령·원출력 2974행 | PASS |
| feature LAB-099 UI need 비대상 | 위 명령·원출력 2975행 | PASS |
| feature LAB-099 test need 필요 | 위 명령·원출력 2976행 | PASS |
| feature LAB-099 test area assigned | 위 명령·원출력 2977행 | PASS |
| feature LAB-099 pass criteria present | 위 명령·원출력 2978행 | PASS |
| feature LAB-100 name present | 위 명령·원출력 2979행 | PASS |
| feature LAB-100 UI need 비대상 | 위 명령·원출력 2980행 | PASS |
| feature LAB-100 test need 필요 | 위 명령·원출력 2981행 | PASS |
| feature LAB-100 test area assigned | 위 명령·원출력 2982행 | PASS |
| feature LAB-100 pass criteria present | 위 명령·원출력 2983행 | PASS |
| feature LAB-101 name present | 위 명령·원출력 2984행 | PASS |
| feature LAB-101 UI need 비대상 | 위 명령·원출력 2985행 | PASS |
| feature LAB-101 test need 필요 | 위 명령·원출력 2986행 | PASS |
| feature LAB-101 test area assigned | 위 명령·원출력 2987행 | PASS |
| feature LAB-101 pass criteria present | 위 명령·원출력 2988행 | PASS |
| feature LAB-102 name present | 위 명령·원출력 2989행 | PASS |
| feature LAB-102 UI need 비대상 | 위 명령·원출력 2990행 | PASS |
| feature LAB-102 test need 필요 | 위 명령·원출력 2991행 | PASS |
| feature LAB-102 test area assigned | 위 명령·원출력 2992행 | PASS |
| feature LAB-102 pass criteria present | 위 명령·원출력 2993행 | PASS |
| feature LAB-103 name present | 위 명령·원출력 2994행 | PASS |
| feature LAB-103 UI need 비대상 | 위 명령·원출력 2995행 | PASS |
| feature LAB-103 test need 필요 | 위 명령·원출력 2996행 | PASS |
| feature LAB-103 test area assigned | 위 명령·원출력 2997행 | PASS |
| feature LAB-103 pass criteria present | 위 명령·원출력 2998행 | PASS |
| feature LAB-104 name present | 위 명령·원출력 2999행 | PASS |
| feature LAB-104 UI need 비대상 | 위 명령·원출력 3000행 | PASS |
| feature LAB-104 test need 필요 | 위 명령·원출력 3001행 | PASS |
| feature LAB-104 test area assigned | 위 명령·원출력 3002행 | PASS |
| feature LAB-104 pass criteria present | 위 명령·원출력 3003행 | PASS |
| feature LAB-105 name present | 위 명령·원출력 3004행 | PASS |
| feature LAB-105 UI need 비대상 | 위 명령·원출력 3005행 | PASS |
| feature LAB-105 test need 필요 | 위 명령·원출력 3006행 | PASS |
| feature LAB-105 test area assigned | 위 명령·원출력 3007행 | PASS |
| feature LAB-105 pass criteria present | 위 명령·원출력 3008행 | PASS |
| feature LAB-106 name present | 위 명령·원출력 3009행 | PASS |
| feature LAB-106 UI need 비대상 | 위 명령·원출력 3010행 | PASS |
| feature LAB-106 test need 필요 | 위 명령·원출력 3011행 | PASS |
| feature LAB-106 test area assigned | 위 명령·원출력 3012행 | PASS |
| feature LAB-106 pass criteria present | 위 명령·원출력 3013행 | PASS |
| feature LAB-107 name present | 위 명령·원출력 3014행 | PASS |
| feature LAB-107 UI need 비대상 | 위 명령·원출력 3015행 | PASS |
| feature LAB-107 test need 필요 | 위 명령·원출력 3016행 | PASS |
| feature LAB-107 test area assigned | 위 명령·원출력 3017행 | PASS |
| feature LAB-107 pass criteria present | 위 명령·원출력 3018행 | PASS |
| feature LAB-108 name present | 위 명령·원출력 3019행 | PASS |
| feature LAB-108 UI need 비대상 | 위 명령·원출력 3020행 | PASS |
| feature LAB-108 test need 필요 | 위 명령·원출력 3021행 | PASS |
| feature LAB-108 test area assigned | 위 명령·원출력 3022행 | PASS |
| feature LAB-108 pass criteria present | 위 명령·원출력 3023행 | PASS |
| feature LAB-109 name present | 위 명령·원출력 3024행 | PASS |
| feature LAB-109 UI need 비대상 | 위 명령·원출력 3025행 | PASS |
| feature LAB-109 test need 필요 | 위 명령·원출력 3026행 | PASS |
| feature LAB-109 test area assigned | 위 명령·원출력 3027행 | PASS |
| feature LAB-109 pass criteria present | 위 명령·원출력 3028행 | PASS |
| feature LAB-110 name present | 위 명령·원출력 3029행 | PASS |
| feature LAB-110 UI need 비대상 | 위 명령·원출력 3030행 | PASS |
| feature LAB-110 test need 필요 | 위 명령·원출력 3031행 | PASS |
| feature LAB-110 test area assigned | 위 명령·원출력 3032행 | PASS |
| feature LAB-110 pass criteria present | 위 명령·원출력 3033행 | PASS |
| feature LAB-111 name present | 위 명령·원출력 3034행 | PASS |
| feature LAB-111 UI need 비대상 | 위 명령·원출력 3035행 | PASS |
| feature LAB-111 test need 필요 | 위 명령·원출력 3036행 | PASS |
| feature LAB-111 test area assigned | 위 명령·원출력 3037행 | PASS |
| feature LAB-111 pass criteria present | 위 명령·원출력 3038행 | PASS |
| feature LAB-112 name present | 위 명령·원출력 3039행 | PASS |
| feature LAB-112 UI need 비대상 | 위 명령·원출력 3040행 | PASS |
| feature LAB-112 test need 필요 | 위 명령·원출력 3041행 | PASS |
| feature LAB-112 test area assigned | 위 명령·원출력 3042행 | PASS |
| feature LAB-112 pass criteria present | 위 명령·원출력 3043행 | PASS |
| feature LAB-113 name present | 위 명령·원출력 3044행 | PASS |
| feature LAB-113 UI need 비대상 | 위 명령·원출력 3045행 | PASS |
| feature LAB-113 test need 필요 | 위 명령·원출력 3046행 | PASS |
| feature LAB-113 test area assigned | 위 명령·원출력 3047행 | PASS |
| feature LAB-113 pass criteria present | 위 명령·원출력 3048행 | PASS |
| feature LAB-114 name present | 위 명령·원출력 3049행 | PASS |
| feature LAB-114 UI need 비대상 | 위 명령·원출력 3050행 | PASS |
| feature LAB-114 test need 필요 | 위 명령·원출력 3051행 | PASS |
| feature LAB-114 test area assigned | 위 명령·원출력 3052행 | PASS |
| feature LAB-114 pass criteria present | 위 명령·원출력 3053행 | PASS |
| feature LAB-115 name present | 위 명령·원출력 3054행 | PASS |
| feature LAB-115 UI need 비대상 | 위 명령·원출력 3055행 | PASS |
| feature LAB-115 test need 필요 | 위 명령·원출력 3056행 | PASS |
| feature LAB-115 test area assigned | 위 명령·원출력 3057행 | PASS |
| feature LAB-115 pass criteria present | 위 명령·원출력 3058행 | PASS |
| feature LAB-116 name present | 위 명령·원출력 3059행 | PASS |
| feature LAB-116 UI need 비대상 | 위 명령·원출력 3060행 | PASS |
| feature LAB-116 test need 필요 | 위 명령·원출력 3061행 | PASS |
| feature LAB-116 test area assigned | 위 명령·원출력 3062행 | PASS |
| feature LAB-116 pass criteria present | 위 명령·원출력 3063행 | PASS |
| feature LAB-117 name present | 위 명령·원출력 3064행 | PASS |
| feature LAB-117 UI need 비대상 | 위 명령·원출력 3065행 | PASS |
| feature LAB-117 test need 필요 | 위 명령·원출력 3066행 | PASS |
| feature LAB-117 test area assigned | 위 명령·원출력 3067행 | PASS |
| feature LAB-117 pass criteria present | 위 명령·원출력 3068행 | PASS |
| feature LAB-118 name present | 위 명령·원출력 3069행 | PASS |
| feature LAB-118 UI need 비대상 | 위 명령·원출력 3070행 | PASS |
| feature LAB-118 test need 필요 | 위 명령·원출력 3071행 | PASS |
| feature LAB-118 test area assigned | 위 명령·원출력 3072행 | PASS |
| feature LAB-118 pass criteria present | 위 명령·원출력 3073행 | PASS |
| feature LAB-119 name present | 위 명령·원출력 3074행 | PASS |
| feature LAB-119 UI need 비대상 | 위 명령·원출력 3075행 | PASS |
| feature LAB-119 test need 필요 | 위 명령·원출력 3076행 | PASS |
| feature LAB-119 test area assigned | 위 명령·원출력 3077행 | PASS |
| feature LAB-119 pass criteria present | 위 명령·원출력 3078행 | PASS |
| feature LAB-120 name present | 위 명령·원출력 3079행 | PASS |
| feature LAB-120 UI need 비대상 | 위 명령·원출력 3080행 | PASS |
| feature LAB-120 test need 필요 | 위 명령·원출력 3081행 | PASS |
| feature LAB-120 test area assigned | 위 명령·원출력 3082행 | PASS |
| feature LAB-120 pass criteria present | 위 명령·원출력 3083행 | PASS |
| feature LAB-121 name present | 위 명령·원출력 3084행 | PASS |
| feature LAB-121 UI need 비대상 | 위 명령·원출력 3085행 | PASS |
| feature LAB-121 test need 필요 | 위 명령·원출력 3086행 | PASS |
| feature LAB-121 test area assigned | 위 명령·원출력 3087행 | PASS |
| feature LAB-121 pass criteria present | 위 명령·원출력 3088행 | PASS |
| feature LAB-122 name present | 위 명령·원출력 3089행 | PASS |
| feature LAB-122 UI need 비대상 | 위 명령·원출력 3090행 | PASS |
| feature LAB-122 test need 필요 | 위 명령·원출력 3091행 | PASS |
| feature LAB-122 test area assigned | 위 명령·원출력 3092행 | PASS |
| feature LAB-122 pass criteria present | 위 명령·원출력 3093행 | PASS |
| feature LAB-123 name present | 위 명령·원출력 3094행 | PASS |
| feature LAB-123 UI need 비대상 | 위 명령·원출력 3095행 | PASS |
| feature LAB-123 test need 필요 | 위 명령·원출력 3096행 | PASS |
| feature LAB-123 test area assigned | 위 명령·원출력 3097행 | PASS |
| feature LAB-123 pass criteria present | 위 명령·원출력 3098행 | PASS |
| feature LAB-124 name present | 위 명령·원출력 3099행 | PASS |
| feature LAB-124 UI need 비대상 | 위 명령·원출력 3100행 | PASS |
| feature LAB-124 test need 필요 | 위 명령·원출력 3101행 | PASS |
| feature LAB-124 test area assigned | 위 명령·원출력 3102행 | PASS |
| feature LAB-124 pass criteria present | 위 명령·원출력 3103행 | PASS |
| feature LAB-125 name present | 위 명령·원출력 3104행 | PASS |
| feature LAB-125 UI need 비대상 | 위 명령·원출력 3105행 | PASS |
| feature LAB-125 test need 필요 | 위 명령·원출력 3106행 | PASS |
| feature LAB-125 test area assigned | 위 명령·원출력 3107행 | PASS |
| feature LAB-125 pass criteria present | 위 명령·원출력 3108행 | PASS |
| feature LAB-126 name present | 위 명령·원출력 3109행 | PASS |
| feature LAB-126 UI need 비대상 | 위 명령·원출력 3110행 | PASS |
| feature LAB-126 test need 필요 | 위 명령·원출력 3111행 | PASS |
| feature LAB-126 test area assigned | 위 명령·원출력 3112행 | PASS |
| feature LAB-126 pass criteria present | 위 명령·원출력 3113행 | PASS |
| feature SAFE-001 name present | 위 명령·원출력 3114행 | PASS |
| feature SAFE-001 UI need 비대상 | 위 명령·원출력 3115행 | PASS |
| feature SAFE-001 test need 필요 | 위 명령·원출력 3116행 | PASS |
| feature SAFE-001 test area assigned | 위 명령·원출력 3117행 | PASS |
| feature SAFE-001 pass criteria present | 위 명령·원출력 3118행 | PASS |
| feature SAFE-002 name present | 위 명령·원출력 3119행 | PASS |
| feature SAFE-002 UI need 비대상 | 위 명령·원출력 3120행 | PASS |
| feature SAFE-002 test need 필요 | 위 명령·원출력 3121행 | PASS |
| feature SAFE-002 test area assigned | 위 명령·원출력 3122행 | PASS |
| feature SAFE-002 pass criteria present | 위 명령·원출력 3123행 | PASS |
| feature SAFE-003 name present | 위 명령·원출력 3124행 | PASS |
| feature SAFE-003 UI need 비대상 | 위 명령·원출력 3125행 | PASS |
| feature SAFE-003 test need 필요 | 위 명령·원출력 3126행 | PASS |
| feature SAFE-003 test area assigned | 위 명령·원출력 3127행 | PASS |
| feature SAFE-003 pass criteria present | 위 명령·원출력 3128행 | PASS |
| feature SAFE-004 name present | 위 명령·원출력 3129행 | PASS |
| feature SAFE-004 UI need 비대상 | 위 명령·원출력 3130행 | PASS |
| feature SAFE-004 test need 필요 | 위 명령·원출력 3131행 | PASS |
| feature SAFE-004 test area assigned | 위 명령·원출력 3132행 | PASS |
| feature SAFE-004 pass criteria present | 위 명령·원출력 3133행 | PASS |
| feature SAFE-005 name present | 위 명령·원출력 3134행 | PASS |
| feature SAFE-005 UI need 비대상 | 위 명령·원출력 3135행 | PASS |
| feature SAFE-005 test need 필요 | 위 명령·원출력 3136행 | PASS |
| feature SAFE-005 test area assigned | 위 명령·원출력 3137행 | PASS |
| feature SAFE-005 pass criteria present | 위 명령·원출력 3138행 | PASS |
| feature SAFE-006 name present | 위 명령·원출력 3139행 | PASS |
| feature SAFE-006 UI need 비대상 | 위 명령·원출력 3140행 | PASS |
| feature SAFE-006 test need 필요 | 위 명령·원출력 3141행 | PASS |
| feature SAFE-006 test area assigned | 위 명령·원출력 3142행 | PASS |
| feature SAFE-006 pass criteria present | 위 명령·원출력 3143행 | PASS |
| feature SAFE-007 name present | 위 명령·원출력 3144행 | PASS |
| feature SAFE-007 UI need 비대상 | 위 명령·원출력 3145행 | PASS |
| feature SAFE-007 test need 필요 | 위 명령·원출력 3146행 | PASS |
| feature SAFE-007 test area assigned | 위 명령·원출력 3147행 | PASS |
| feature SAFE-007 pass criteria present | 위 명령·원출력 3148행 | PASS |
| feature SAFE-008 name present | 위 명령·원출력 3149행 | PASS |
| feature SAFE-008 UI need 비대상 | 위 명령·원출력 3150행 | PASS |
| feature SAFE-008 test need 필요 | 위 명령·원출력 3151행 | PASS |
| feature SAFE-008 test area assigned | 위 명령·원출력 3152행 | PASS |
| feature SAFE-008 pass criteria present | 위 명령·원출력 3153행 | PASS |
| feature SAFE-009 name present | 위 명령·원출력 3154행 | PASS |
| feature SAFE-009 UI need 비대상 | 위 명령·원출력 3155행 | PASS |
| feature SAFE-009 test need 필요 | 위 명령·원출력 3156행 | PASS |
| feature SAFE-009 test area assigned | 위 명령·원출력 3157행 | PASS |
| feature SAFE-009 pass criteria present | 위 명령·원출력 3158행 | PASS |
| feature SAFE-010 name present | 위 명령·원출력 3159행 | PASS |
| feature SAFE-010 UI need 비대상 | 위 명령·원출력 3160행 | PASS |
| feature SAFE-010 test need 필요 | 위 명령·원출력 3161행 | PASS |
| feature SAFE-010 test area assigned | 위 명령·원출력 3162행 | PASS |
| feature SAFE-010 pass criteria present | 위 명령·원출력 3163행 | PASS |
| feature SAFE-011 name present | 위 명령·원출력 3164행 | PASS |
| feature SAFE-011 UI need 비대상 | 위 명령·원출력 3165행 | PASS |
| feature SAFE-011 test need 필요 | 위 명령·원출력 3166행 | PASS |
| feature SAFE-011 test area assigned | 위 명령·원출력 3167행 | PASS |
| feature SAFE-011 pass criteria present | 위 명령·원출력 3168행 | PASS |
| feature SAFE-012 name present | 위 명령·원출력 3169행 | PASS |
| feature SAFE-012 UI need 비대상 | 위 명령·원출력 3170행 | PASS |
| feature SAFE-012 test need 필요 | 위 명령·원출력 3171행 | PASS |
| feature SAFE-012 test area assigned | 위 명령·원출력 3172행 | PASS |
| feature SAFE-012 pass criteria present | 위 명령·원출력 3173행 | PASS |
| feature SAFE-013 name present | 위 명령·원출력 3174행 | PASS |
| feature SAFE-013 UI need 비대상 | 위 명령·원출력 3175행 | PASS |
| feature SAFE-013 test need 필요 | 위 명령·원출력 3176행 | PASS |
| feature SAFE-013 test area assigned | 위 명령·원출력 3177행 | PASS |
| feature SAFE-013 pass criteria present | 위 명령·원출력 3178행 | PASS |
| feature SAFE-014 name present | 위 명령·원출력 3179행 | PASS |
| feature SAFE-014 UI need 비대상 | 위 명령·원출력 3180행 | PASS |
| feature SAFE-014 test need 필요 | 위 명령·원출력 3181행 | PASS |
| feature SAFE-014 test area assigned | 위 명령·원출력 3182행 | PASS |
| feature SAFE-014 pass criteria present | 위 명령·원출력 3183행 | PASS |
| feature SAFE-015 name present | 위 명령·원출력 3184행 | PASS |
| feature SAFE-015 UI need 필요 | 위 명령·원출력 3185행 | PASS |
| feature SAFE-015 test need 필요 | 위 명령·원출력 3186행 | PASS |
| feature SAFE-015 test area assigned | 위 명령·원출력 3187행 | PASS |
| feature SAFE-015 pass criteria present | 위 명령·원출력 3188행 | PASS |
| feature SAFE-016 name present | 위 명령·원출력 3189행 | PASS |
| feature SAFE-016 UI need 간접 | 위 명령·원출력 3190행 | PASS |
| feature SAFE-016 test need 필요 | 위 명령·원출력 3191행 | PASS |
| feature SAFE-016 test area assigned | 위 명령·원출력 3192행 | PASS |
| feature SAFE-016 pass criteria present | 위 명령·원출력 3193행 | PASS |
| feature SAFE-017 name present | 위 명령·원출력 3194행 | PASS |
| feature SAFE-017 UI need 간접 | 위 명령·원출력 3195행 | PASS |
| feature SAFE-017 test need 필요 | 위 명령·원출력 3196행 | PASS |
| feature SAFE-017 test area assigned | 위 명령·원출력 3197행 | PASS |
| feature SAFE-017 pass criteria present | 위 명령·원출력 3198행 | PASS |
| feature SAFE-018 name present | 위 명령·원출력 3199행 | PASS |
| feature SAFE-018 UI need 필요 | 위 명령·원출력 3200행 | PASS |
| feature SAFE-018 test need 필요 | 위 명령·원출력 3201행 | PASS |
| feature SAFE-018 test area assigned | 위 명령·원출력 3202행 | PASS |
| feature SAFE-018 pass criteria present | 위 명령·원출력 3203행 | PASS |
| feature SAFE-019 name present | 위 명령·원출력 3204행 | PASS |
| feature SAFE-019 UI need 필요 | 위 명령·원출력 3205행 | PASS |
| feature SAFE-019 test need 필요 | 위 명령·원출력 3206행 | PASS |
| feature SAFE-019 test area assigned | 위 명령·원출력 3207행 | PASS |
| feature SAFE-019 pass criteria present | 위 명령·원출력 3208행 | PASS |
| feature SAFE-020 name present | 위 명령·원출력 3209행 | PASS |
| feature SAFE-020 UI need 필요 | 위 명령·원출력 3210행 | PASS |
| feature SAFE-020 test need 필요 | 위 명령·원출력 3211행 | PASS |
| feature SAFE-020 test area assigned | 위 명령·원출력 3212행 | PASS |
| feature SAFE-020 pass criteria present | 위 명령·원출력 3213행 | PASS |
| feature SAFE-021 name present | 위 명령·원출력 3214행 | PASS |
| feature SAFE-021 UI need 필요 | 위 명령·원출력 3215행 | PASS |
| feature SAFE-021 test need 필요 | 위 명령·원출력 3216행 | PASS |
| feature SAFE-021 test area assigned | 위 명령·원출력 3217행 | PASS |
| feature SAFE-021 pass criteria present | 위 명령·원출력 3218행 | PASS |
| feature SAFE-022 name present | 위 명령·원출력 3219행 | PASS |
| feature SAFE-022 UI need 비대상 | 위 명령·원출력 3220행 | PASS |
| feature SAFE-022 test need 필요 | 위 명령·원출력 3221행 | PASS |
| feature SAFE-022 test area assigned | 위 명령·원출력 3222행 | PASS |
| feature SAFE-022 pass criteria present | 위 명령·원출력 3223행 | PASS |
| feature SAFE-023 name present | 위 명령·원출력 3224행 | PASS |
| feature SAFE-023 UI need 비대상 | 위 명령·원출력 3225행 | PASS |
| feature SAFE-023 test need 필요 | 위 명령·원출력 3226행 | PASS |
| feature SAFE-023 test area assigned | 위 명령·원출력 3227행 | PASS |
| feature SAFE-023 pass criteria present | 위 명령·원출력 3228행 | PASS |
| feature SAFE-024 name present | 위 명령·원출력 3229행 | PASS |
| feature SAFE-024 UI need 필요 | 위 명령·원출력 3230행 | PASS |
| feature SAFE-024 test need 필요 | 위 명령·원출력 3231행 | PASS |
| feature SAFE-024 test area assigned | 위 명령·원출력 3232행 | PASS |
| feature SAFE-024 pass criteria present | 위 명령·원출력 3233행 | PASS |
| feature SAFE-025 name present | 위 명령·원출력 3234행 | PASS |
| feature SAFE-025 UI need 비대상 | 위 명령·원출력 3235행 | PASS |
| feature SAFE-025 test need 필요 | 위 명령·원출력 3236행 | PASS |
| feature SAFE-025 test area assigned | 위 명령·원출력 3237행 | PASS |
| feature SAFE-025 pass criteria present | 위 명령·원출력 3238행 | PASS |
| feature SAFE-026 name present | 위 명령·원출력 3239행 | PASS |
| feature SAFE-026 UI need 비대상 | 위 명령·원출력 3240행 | PASS |
| feature SAFE-026 test need 필요 | 위 명령·원출력 3241행 | PASS |
| feature SAFE-026 test area assigned | 위 명령·원출력 3242행 | PASS |
| feature SAFE-026 pass criteria present | 위 명령·원출력 3243행 | PASS |
| feature SAFE-027 name present | 위 명령·원출력 3244행 | PASS |
| feature SAFE-027 UI need 비대상 | 위 명령·원출력 3245행 | PASS |
| feature SAFE-027 test need 필요 | 위 명령·원출력 3246행 | PASS |
| feature SAFE-027 test area assigned | 위 명령·원출력 3247행 | PASS |
| feature SAFE-027 pass criteria present | 위 명령·원출력 3248행 | PASS |
| feature SAFE-028 name present | 위 명령·원출력 3249행 | PASS |
| feature SAFE-028 UI need 필요 | 위 명령·원출력 3250행 | PASS |
| feature SAFE-028 test need 필요 | 위 명령·원출력 3251행 | PASS |
| feature SAFE-028 test area assigned | 위 명령·원출력 3252행 | PASS |
| feature SAFE-028 pass criteria present | 위 명령·원출력 3253행 | PASS |
| feature SAFE-029 name present | 위 명령·원출력 3254행 | PASS |
| feature SAFE-029 UI need 비대상 | 위 명령·원출력 3255행 | PASS |
| feature SAFE-029 test need 필요 | 위 명령·원출력 3256행 | PASS |
| feature SAFE-029 test area assigned | 위 명령·원출력 3257행 | PASS |
| feature SAFE-029 pass criteria present | 위 명령·원출력 3258행 | PASS |
| feature SAFE-030 name present | 위 명령·원출력 3259행 | PASS |
| feature SAFE-030 UI need 비대상 | 위 명령·원출력 3260행 | PASS |
| feature SAFE-030 test need 필요 | 위 명령·원출력 3261행 | PASS |
| feature SAFE-030 test area assigned | 위 명령·원출력 3262행 | PASS |
| feature SAFE-030 pass criteria present | 위 명령·원출력 3263행 | PASS |
| feature SAFE-031 name present | 위 명령·원출력 3264행 | PASS |
| feature SAFE-031 UI need 필요 | 위 명령·원출력 3265행 | PASS |
| feature SAFE-031 test need 필요 | 위 명령·원출력 3266행 | PASS |
| feature SAFE-031 test area assigned | 위 명령·원출력 3267행 | PASS |
| feature SAFE-031 pass criteria present | 위 명령·원출력 3268행 | PASS |
| feature SAFE-032 name present | 위 명령·원출력 3269행 | PASS |
| feature SAFE-032 UI need 비대상 | 위 명령·원출력 3270행 | PASS |
| feature SAFE-032 test need 필요 | 위 명령·원출력 3271행 | PASS |
| feature SAFE-032 test area assigned | 위 명령·원출력 3272행 | PASS |
| feature SAFE-032 pass criteria present | 위 명령·원출력 3273행 | PASS |
| feature SAFE-033 name present | 위 명령·원출력 3274행 | PASS |
| feature SAFE-033 UI need 필요 | 위 명령·원출력 3275행 | PASS |
| feature SAFE-033 test need 필요 | 위 명령·원출력 3276행 | PASS |
| feature SAFE-033 test area assigned | 위 명령·원출력 3277행 | PASS |
| feature SAFE-033 pass criteria present | 위 명령·원출력 3278행 | PASS |
| feature SAFE-034 name present | 위 명령·원출력 3279행 | PASS |
| feature SAFE-034 UI need 비대상 | 위 명령·원출력 3280행 | PASS |
| feature SAFE-034 test need 필요 | 위 명령·원출력 3281행 | PASS |
| feature SAFE-034 test area assigned | 위 명령·원출력 3282행 | PASS |
| feature SAFE-034 pass criteria present | 위 명령·원출력 3283행 | PASS |
| feature SAFE-035 name present | 위 명령·원출력 3284행 | PASS |
| feature SAFE-035 UI need 비대상 | 위 명령·원출력 3285행 | PASS |
| feature SAFE-035 test need 필요 | 위 명령·원출력 3286행 | PASS |
| feature SAFE-035 test area assigned | 위 명령·원출력 3287행 | PASS |
| feature SAFE-035 pass criteria present | 위 명령·원출력 3288행 | PASS |
| feature SAFE-036 name present | 위 명령·원출력 3289행 | PASS |
| feature SAFE-036 UI need 비대상 | 위 명령·원출력 3290행 | PASS |
| feature SAFE-036 test need 필요 | 위 명령·원출력 3291행 | PASS |
| feature SAFE-036 test area assigned | 위 명령·원출력 3292행 | PASS |
| feature SAFE-036 pass criteria present | 위 명령·원출력 3293행 | PASS |
| feature SAFE-037 name present | 위 명령·원출력 3294행 | PASS |
| feature SAFE-037 UI need 비대상 | 위 명령·원출력 3295행 | PASS |
| feature SAFE-037 test need 필요 | 위 명령·원출력 3296행 | PASS |
| feature SAFE-037 test area assigned | 위 명령·원출력 3297행 | PASS |
| feature SAFE-037 pass criteria present | 위 명령·원출력 3298행 | PASS |
| feature SAFE-038 name present | 위 명령·원출력 3299행 | PASS |
| feature SAFE-038 UI need 필요 | 위 명령·원출력 3300행 | PASS |
| feature SAFE-038 test need 필요 | 위 명령·원출력 3301행 | PASS |
| feature SAFE-038 test area assigned | 위 명령·원출력 3302행 | PASS |
| feature SAFE-038 pass criteria present | 위 명령·원출력 3303행 | PASS |
| feature SAFE-039 name present | 위 명령·원출력 3304행 | PASS |
| feature SAFE-039 UI need 비대상 | 위 명령·원출력 3305행 | PASS |
| feature SAFE-039 test need 필요 | 위 명령·원출력 3306행 | PASS |
| feature SAFE-039 test area assigned | 위 명령·원출력 3307행 | PASS |
| feature SAFE-039 pass criteria present | 위 명령·원출력 3308행 | PASS |
| feature SAFE-040 name present | 위 명령·원출력 3309행 | PASS |
| feature SAFE-040 UI need 비대상 | 위 명령·원출력 3310행 | PASS |
| feature SAFE-040 test need 필요 | 위 명령·원출력 3311행 | PASS |
| feature SAFE-040 test area assigned | 위 명령·원출력 3312행 | PASS |
| feature SAFE-040 pass criteria present | 위 명령·원출력 3313행 | PASS |
| feature SAFE-041 name present | 위 명령·원출력 3314행 | PASS |
| feature SAFE-041 UI need 필요 | 위 명령·원출력 3315행 | PASS |
| feature SAFE-041 test need 필요 | 위 명령·원출력 3316행 | PASS |
| feature SAFE-041 test area assigned | 위 명령·원출력 3317행 | PASS |
| feature SAFE-041 pass criteria present | 위 명령·원출력 3318행 | PASS |
| feature SAFE-042 name present | 위 명령·원출력 3319행 | PASS |
| feature SAFE-042 UI need 필요 | 위 명령·원출력 3320행 | PASS |
| feature SAFE-042 test need 필요 | 위 명령·원출력 3321행 | PASS |
| feature SAFE-042 test area assigned | 위 명령·원출력 3322행 | PASS |
| feature SAFE-042 pass criteria present | 위 명령·원출력 3323행 | PASS |
| feature SAFE-043 name present | 위 명령·원출력 3324행 | PASS |
| feature SAFE-043 UI need 비대상 | 위 명령·원출력 3325행 | PASS |
| feature SAFE-043 test need 필요 | 위 명령·원출력 3326행 | PASS |
| feature SAFE-043 test area assigned | 위 명령·원출력 3327행 | PASS |
| feature SAFE-043 pass criteria present | 위 명령·원출력 3328행 | PASS |
| feature SAFE-044 name present | 위 명령·원출력 3329행 | PASS |
| feature SAFE-044 UI need 비대상 | 위 명령·원출력 3330행 | PASS |
| feature SAFE-044 test need 필요 | 위 명령·원출력 3331행 | PASS |
| feature SAFE-044 test area assigned | 위 명령·원출력 3332행 | PASS |
| feature SAFE-044 pass criteria present | 위 명령·원출력 3333행 | PASS |
| feature SAFE-045 name present | 위 명령·원출력 3334행 | PASS |
| feature SAFE-045 UI need 필요 | 위 명령·원출력 3335행 | PASS |
| feature SAFE-045 test need 필요 | 위 명령·원출력 3336행 | PASS |
| feature SAFE-045 test area assigned | 위 명령·원출력 3337행 | PASS |
| feature SAFE-045 pass criteria present | 위 명령·원출력 3338행 | PASS |
| feature SAFE-046 name present | 위 명령·원출력 3339행 | PASS |
| feature SAFE-046 UI need 필요 | 위 명령·원출력 3340행 | PASS |
| feature SAFE-046 test need 필요 | 위 명령·원출력 3341행 | PASS |
| feature SAFE-046 test area assigned | 위 명령·원출력 3342행 | PASS |
| feature SAFE-046 pass criteria present | 위 명령·원출력 3343행 | PASS |
| feature SAFE-047 name present | 위 명령·원출력 3344행 | PASS |
| feature SAFE-047 UI need 필요 | 위 명령·원출력 3345행 | PASS |
| feature SAFE-047 test need 필요 | 위 명령·원출력 3346행 | PASS |
| feature SAFE-047 test area assigned | 위 명령·원출력 3347행 | PASS |
| feature SAFE-047 pass criteria present | 위 명령·원출력 3348행 | PASS |
| feature SAFE-048 name present | 위 명령·원출력 3349행 | PASS |
| feature SAFE-048 UI need 필요 | 위 명령·원출력 3350행 | PASS |
| feature SAFE-048 test need 필요 | 위 명령·원출력 3351행 | PASS |
| feature SAFE-048 test area assigned | 위 명령·원출력 3352행 | PASS |
| feature SAFE-048 pass criteria present | 위 명령·원출력 3353행 | PASS |
| feature SAFE-049 name present | 위 명령·원출력 3354행 | PASS |
| feature SAFE-049 UI need 필요 | 위 명령·원출력 3355행 | PASS |
| feature SAFE-049 test need 필요 | 위 명령·원출력 3356행 | PASS |
| feature SAFE-049 test area assigned | 위 명령·원출력 3357행 | PASS |
| feature SAFE-049 pass criteria present | 위 명령·원출력 3358행 | PASS |
| feature SAFE-050 name present | 위 명령·원출력 3359행 | PASS |
| feature SAFE-050 UI need 필요 | 위 명령·원출력 3360행 | PASS |
| feature SAFE-050 test need 필요 | 위 명령·원출력 3361행 | PASS |
| feature SAFE-050 test area assigned | 위 명령·원출력 3362행 | PASS |
| feature SAFE-050 pass criteria present | 위 명령·원출력 3363행 | PASS |
| feature SAFE-051 name present | 위 명령·원출력 3364행 | PASS |
| feature SAFE-051 UI need 비대상 | 위 명령·원출력 3365행 | PASS |
| feature SAFE-051 test need 필요 | 위 명령·원출력 3366행 | PASS |
| feature SAFE-051 test area assigned | 위 명령·원출력 3367행 | PASS |
| feature SAFE-051 pass criteria present | 위 명령·원출력 3368행 | PASS |
| feature SAFE-052 name present | 위 명령·원출력 3369행 | PASS |
| feature SAFE-052 UI need 필요 | 위 명령·원출력 3370행 | PASS |
| feature SAFE-052 test need 필요 | 위 명령·원출력 3371행 | PASS |
| feature SAFE-052 test area assigned | 위 명령·원출력 3372행 | PASS |
| feature SAFE-052 pass criteria present | 위 명령·원출력 3373행 | PASS |
| feature SAFE-053 name present | 위 명령·원출력 3374행 | PASS |
| feature SAFE-053 UI need 필요 | 위 명령·원출력 3375행 | PASS |
| feature SAFE-053 test need 필요 | 위 명령·원출력 3376행 | PASS |
| feature SAFE-053 test area assigned | 위 명령·원출력 3377행 | PASS |
| feature SAFE-053 pass criteria present | 위 명령·원출력 3378행 | PASS |
| feature SAFE-054 name present | 위 명령·원출력 3379행 | PASS |
| feature SAFE-054 UI need 필요 | 위 명령·원출력 3380행 | PASS |
| feature SAFE-054 test need 필요 | 위 명령·원출력 3381행 | PASS |
| feature SAFE-054 test area assigned | 위 명령·원출력 3382행 | PASS |
| feature SAFE-054 pass criteria present | 위 명령·원출력 3383행 | PASS |
| feature SAFE-055 name present | 위 명령·원출력 3384행 | PASS |
| feature SAFE-055 UI need 필요 | 위 명령·원출력 3385행 | PASS |
| feature SAFE-055 test need 필요 | 위 명령·원출력 3386행 | PASS |
| feature SAFE-055 test area assigned | 위 명령·원출력 3387행 | PASS |
| feature SAFE-055 pass criteria present | 위 명령·원출력 3388행 | PASS |
| feature SAFE-056 name present | 위 명령·원출력 3389행 | PASS |
| feature SAFE-056 UI need 필요 | 위 명령·원출력 3390행 | PASS |
| feature SAFE-056 test need 필요 | 위 명령·원출력 3391행 | PASS |
| feature SAFE-056 test area assigned | 위 명령·원출력 3392행 | PASS |
| feature SAFE-056 pass criteria present | 위 명령·원출력 3393행 | PASS |
| feature SAFE-057 name present | 위 명령·원출력 3394행 | PASS |
| feature SAFE-057 UI need 비대상 | 위 명령·원출력 3395행 | PASS |
| feature SAFE-057 test need 필요 | 위 명령·원출력 3396행 | PASS |
| feature SAFE-057 test area assigned | 위 명령·원출력 3397행 | PASS |
| feature SAFE-057 pass criteria present | 위 명령·원출력 3398행 | PASS |
| feature SAFE-058 name present | 위 명령·원출력 3399행 | PASS |
| feature SAFE-058 UI need 필요 | 위 명령·원출력 3400행 | PASS |
| feature SAFE-058 test need 필요 | 위 명령·원출력 3401행 | PASS |
| feature SAFE-058 test area assigned | 위 명령·원출력 3402행 | PASS |
| feature SAFE-058 pass criteria present | 위 명령·원출력 3403행 | PASS |
| feature SAFE-059 name present | 위 명령·원출력 3404행 | PASS |
| feature SAFE-059 UI need 필요 | 위 명령·원출력 3405행 | PASS |
| feature SAFE-059 test need 필요 | 위 명령·원출력 3406행 | PASS |
| feature SAFE-059 test area assigned | 위 명령·원출력 3407행 | PASS |
| feature SAFE-059 pass criteria present | 위 명령·원출력 3408행 | PASS |
| feature SAFE-060 name present | 위 명령·원출력 3409행 | PASS |
| feature SAFE-060 UI need 필요 | 위 명령·원출력 3410행 | PASS |
| feature SAFE-060 test need 필요 | 위 명령·원출력 3411행 | PASS |
| feature SAFE-060 test area assigned | 위 명령·원출력 3412행 | PASS |
| feature SAFE-060 pass criteria present | 위 명령·원출력 3413행 | PASS |
| feature SAFE-061 name present | 위 명령·원출력 3414행 | PASS |
| feature SAFE-061 UI need 필요 | 위 명령·원출력 3415행 | PASS |
| feature SAFE-061 test need 필요 | 위 명령·원출력 3416행 | PASS |
| feature SAFE-061 test area assigned | 위 명령·원출력 3417행 | PASS |
| feature SAFE-061 pass criteria present | 위 명령·원출력 3418행 | PASS |
| feature SAFE-062 name present | 위 명령·원출력 3419행 | PASS |
| feature SAFE-062 UI need 필요 | 위 명령·원출력 3420행 | PASS |
| feature SAFE-062 test need 필요 | 위 명령·원출력 3421행 | PASS |
| feature SAFE-062 test area assigned | 위 명령·원출력 3422행 | PASS |
| feature SAFE-062 pass criteria present | 위 명령·원출력 3423행 | PASS |
| feature SAFE-063 name present | 위 명령·원출력 3424행 | PASS |
| feature SAFE-063 UI need 비대상 | 위 명령·원출력 3425행 | PASS |
| feature SAFE-063 test need 필요 | 위 명령·원출력 3426행 | PASS |
| feature SAFE-063 test area assigned | 위 명령·원출력 3427행 | PASS |
| feature SAFE-063 pass criteria present | 위 명령·원출력 3428행 | PASS |
| feature SAFE-064 name present | 위 명령·원출력 3429행 | PASS |
| feature SAFE-064 UI need 비대상 | 위 명령·원출력 3430행 | PASS |
| feature SAFE-064 test need 필요 | 위 명령·원출력 3431행 | PASS |
| feature SAFE-064 test area assigned | 위 명령·원출력 3432행 | PASS |
| feature SAFE-064 pass criteria present | 위 명령·원출력 3433행 | PASS |
| feature SAFE-065 name present | 위 명령·원출력 3434행 | PASS |
| feature SAFE-065 UI need 필요 | 위 명령·원출력 3435행 | PASS |
| feature SAFE-065 test need 필요 | 위 명령·원출력 3436행 | PASS |
| feature SAFE-065 test area assigned | 위 명령·원출력 3437행 | PASS |
| feature SAFE-065 pass criteria present | 위 명령·원출력 3438행 | PASS |
| feature SAFE-066 name present | 위 명령·원출력 3439행 | PASS |
| feature SAFE-066 UI need 필요 | 위 명령·원출력 3440행 | PASS |
| feature SAFE-066 test need 필요 | 위 명령·원출력 3441행 | PASS |
| feature SAFE-066 test area assigned | 위 명령·원출력 3442행 | PASS |
| feature SAFE-066 pass criteria present | 위 명령·원출력 3443행 | PASS |
| feature SAFE-067 name present | 위 명령·원출력 3444행 | PASS |
| feature SAFE-067 UI need 필요 | 위 명령·원출력 3445행 | PASS |
| feature SAFE-067 test need 필요 | 위 명령·원출력 3446행 | PASS |
| feature SAFE-067 test area assigned | 위 명령·원출력 3447행 | PASS |
| feature SAFE-067 pass criteria present | 위 명령·원출력 3448행 | PASS |
| feature SAFE-068 name present | 위 명령·원출력 3449행 | PASS |
| feature SAFE-068 UI need 필요 | 위 명령·원출력 3450행 | PASS |
| feature SAFE-068 test need 필요 | 위 명령·원출력 3451행 | PASS |
| feature SAFE-068 test area assigned | 위 명령·원출력 3452행 | PASS |
| feature SAFE-068 pass criteria present | 위 명령·원출력 3453행 | PASS |
| feature SAFE-069 name present | 위 명령·원출력 3454행 | PASS |
| feature SAFE-069 UI need 필요 | 위 명령·원출력 3455행 | PASS |
| feature SAFE-069 test need 필요 | 위 명령·원출력 3456행 | PASS |
| feature SAFE-069 test area assigned | 위 명령·원출력 3457행 | PASS |
| feature SAFE-069 pass criteria present | 위 명령·원출력 3458행 | PASS |
| feature SAFE-070 name present | 위 명령·원출력 3459행 | PASS |
| feature SAFE-070 UI need 비대상 | 위 명령·원출력 3460행 | PASS |
| feature SAFE-070 test need 필요 | 위 명령·원출력 3461행 | PASS |
| feature SAFE-070 test area assigned | 위 명령·원출력 3462행 | PASS |
| feature SAFE-070 pass criteria present | 위 명령·원출력 3463행 | PASS |
| feature SAFE-071 name present | 위 명령·원출력 3464행 | PASS |
| feature SAFE-071 UI need 비대상 | 위 명령·원출력 3465행 | PASS |
| feature SAFE-071 test need 필요 | 위 명령·원출력 3466행 | PASS |
| feature SAFE-071 test area assigned | 위 명령·원출력 3467행 | PASS |
| feature SAFE-071 pass criteria present | 위 명령·원출력 3468행 | PASS |
| feature SAFE-072 name present | 위 명령·원출력 3469행 | PASS |
| feature SAFE-072 UI need 비대상 | 위 명령·원출력 3470행 | PASS |
| feature SAFE-072 test need 필요 | 위 명령·원출력 3471행 | PASS |
| feature SAFE-072 test area assigned | 위 명령·원출력 3472행 | PASS |
| feature SAFE-072 pass criteria present | 위 명령·원출력 3473행 | PASS |
| feature SAFE-073 name present | 위 명령·원출력 3474행 | PASS |
| feature SAFE-073 UI need 비대상 | 위 명령·원출력 3475행 | PASS |
| feature SAFE-073 test need 필요 | 위 명령·원출력 3476행 | PASS |
| feature SAFE-073 test area assigned | 위 명령·원출력 3477행 | PASS |
| feature SAFE-073 pass criteria present | 위 명령·원출력 3478행 | PASS |
| feature SAFE-074 name present | 위 명령·원출력 3479행 | PASS |
| feature SAFE-074 UI need 비대상 | 위 명령·원출력 3480행 | PASS |
| feature SAFE-074 test need 필요 | 위 명령·원출력 3481행 | PASS |
| feature SAFE-074 test area assigned | 위 명령·원출력 3482행 | PASS |
| feature SAFE-074 pass criteria present | 위 명령·원출력 3483행 | PASS |
| feature SAFE-075 name present | 위 명령·원출력 3484행 | PASS |
| feature SAFE-075 UI need 비대상 | 위 명령·원출력 3485행 | PASS |
| feature SAFE-075 test need 필요 | 위 명령·원출력 3486행 | PASS |
| feature SAFE-075 test area assigned | 위 명령·원출력 3487행 | PASS |
| feature SAFE-075 pass criteria present | 위 명령·원출력 3488행 | PASS |
| feature SAFE-076 name present | 위 명령·원출력 3489행 | PASS |
| feature SAFE-076 UI need 비대상 | 위 명령·원출력 3490행 | PASS |
| feature SAFE-076 test need 필요 | 위 명령·원출력 3491행 | PASS |
| feature SAFE-076 test area assigned | 위 명령·원출력 3492행 | PASS |
| feature SAFE-076 pass criteria present | 위 명령·원출력 3493행 | PASS |
| feature SAFE-077 name present | 위 명령·원출력 3494행 | PASS |
| feature SAFE-077 UI need 비대상 | 위 명령·원출력 3495행 | PASS |
| feature SAFE-077 test need 필요 | 위 명령·원출력 3496행 | PASS |
| feature SAFE-077 test area assigned | 위 명령·원출력 3497행 | PASS |
| feature SAFE-077 pass criteria present | 위 명령·원출력 3498행 | PASS |
| feature SAFE-078 name present | 위 명령·원출력 3499행 | PASS |
| feature SAFE-078 UI need 비대상 | 위 명령·원출력 3500행 | PASS |
| feature SAFE-078 test need 필요 | 위 명령·원출력 3501행 | PASS |
| feature SAFE-078 test area assigned | 위 명령·원출력 3502행 | PASS |
| feature SAFE-078 pass criteria present | 위 명령·원출력 3503행 | PASS |
| feature SAFE-079 name present | 위 명령·원출력 3504행 | PASS |
| feature SAFE-079 UI need 비대상 | 위 명령·원출력 3505행 | PASS |
| feature SAFE-079 test need 필요 | 위 명령·원출력 3506행 | PASS |
| feature SAFE-079 test area assigned | 위 명령·원출력 3507행 | PASS |
| feature SAFE-079 pass criteria present | 위 명령·원출력 3508행 | PASS |
| feature SAFE-080 name present | 위 명령·원출력 3509행 | PASS |
| feature SAFE-080 UI need 비대상 | 위 명령·원출력 3510행 | PASS |
| feature SAFE-080 test need 필요 | 위 명령·원출력 3511행 | PASS |
| feature SAFE-080 test area assigned | 위 명령·원출력 3512행 | PASS |
| feature SAFE-080 pass criteria present | 위 명령·원출력 3513행 | PASS |
| feature SAFE-081 name present | 위 명령·원출력 3514행 | PASS |
| feature SAFE-081 UI need 비대상 | 위 명령·원출력 3515행 | PASS |
| feature SAFE-081 test need 필요 | 위 명령·원출력 3516행 | PASS |
| feature SAFE-081 test area assigned | 위 명령·원출력 3517행 | PASS |
| feature SAFE-081 pass criteria present | 위 명령·원출력 3518행 | PASS |
| feature SAFE-082 name present | 위 명령·원출력 3519행 | PASS |
| feature SAFE-082 UI need 비대상 | 위 명령·원출력 3520행 | PASS |
| feature SAFE-082 test need 필요 | 위 명령·원출력 3521행 | PASS |
| feature SAFE-082 test area assigned | 위 명령·원출력 3522행 | PASS |
| feature SAFE-082 pass criteria present | 위 명령·원출력 3523행 | PASS |
| feature SAFE-083 name present | 위 명령·원출력 3524행 | PASS |
| feature SAFE-083 UI need 비대상 | 위 명령·원출력 3525행 | PASS |
| feature SAFE-083 test need 필요 | 위 명령·원출력 3526행 | PASS |
| feature SAFE-083 test area assigned | 위 명령·원출력 3527행 | PASS |
| feature SAFE-083 pass criteria present | 위 명령·원출력 3528행 | PASS |
| feature SAFE-084 name present | 위 명령·원출력 3529행 | PASS |
| feature SAFE-084 UI need 비대상 | 위 명령·원출력 3530행 | PASS |
| feature SAFE-084 test need 필요 | 위 명령·원출력 3531행 | PASS |
| feature SAFE-084 test area assigned | 위 명령·원출력 3532행 | PASS |
| feature SAFE-084 pass criteria present | 위 명령·원출력 3533행 | PASS |
| feature SAFE-085 name present | 위 명령·원출력 3534행 | PASS |
| feature SAFE-085 UI need 비대상 | 위 명령·원출력 3535행 | PASS |
| feature SAFE-085 test need 필요 | 위 명령·원출력 3536행 | PASS |
| feature SAFE-085 test area assigned | 위 명령·원출력 3537행 | PASS |
| feature SAFE-085 pass criteria present | 위 명령·원출력 3538행 | PASS |
| feature SAFE-086 name present | 위 명령·원출력 3539행 | PASS |
| feature SAFE-086 UI need 비대상 | 위 명령·원출력 3540행 | PASS |
| feature SAFE-086 test need 필요 | 위 명령·원출력 3541행 | PASS |
| feature SAFE-086 test area assigned | 위 명령·원출력 3542행 | PASS |
| feature SAFE-086 pass criteria present | 위 명령·원출력 3543행 | PASS |
| feature SAFE-087 name present | 위 명령·원출력 3544행 | PASS |
| feature SAFE-087 UI need 비대상 | 위 명령·원출력 3545행 | PASS |
| feature SAFE-087 test need 필요 | 위 명령·원출력 3546행 | PASS |
| feature SAFE-087 test area assigned | 위 명령·원출력 3547행 | PASS |
| feature SAFE-087 pass criteria present | 위 명령·원출력 3548행 | PASS |
| feature SAFE-088 name present | 위 명령·원출력 3549행 | PASS |
| feature SAFE-088 UI need 비대상 | 위 명령·원출력 3550행 | PASS |
| feature SAFE-088 test need 필요 | 위 명령·원출력 3551행 | PASS |
| feature SAFE-088 test area assigned | 위 명령·원출력 3552행 | PASS |
| feature SAFE-088 pass criteria present | 위 명령·원출력 3553행 | PASS |
| feature SAFE-089 name present | 위 명령·원출력 3554행 | PASS |
| feature SAFE-089 UI need 비대상 | 위 명령·원출력 3555행 | PASS |
| feature SAFE-089 test need 필요 | 위 명령·원출력 3556행 | PASS |
| feature SAFE-089 test area assigned | 위 명령·원출력 3557행 | PASS |
| feature SAFE-089 pass criteria present | 위 명령·원출력 3558행 | PASS |
| feature SAFE-090 name present | 위 명령·원출력 3559행 | PASS |
| feature SAFE-090 UI need 비대상 | 위 명령·원출력 3560행 | PASS |
| feature SAFE-090 test need 필요 | 위 명령·원출력 3561행 | PASS |
| feature SAFE-090 test area assigned | 위 명령·원출력 3562행 | PASS |
| feature SAFE-090 pass criteria present | 위 명령·원출력 3563행 | PASS |
| feature SAFE-091 name present | 위 명령·원출력 3564행 | PASS |
| feature SAFE-091 UI need 비대상 | 위 명령·원출력 3565행 | PASS |
| feature SAFE-091 test need 필요 | 위 명령·원출력 3566행 | PASS |
| feature SAFE-091 test area assigned | 위 명령·원출력 3567행 | PASS |
| feature SAFE-091 pass criteria present | 위 명령·원출력 3568행 | PASS |
| feature SAFE-092 name present | 위 명령·원출력 3569행 | PASS |
| feature SAFE-092 UI need 비대상 | 위 명령·원출력 3570행 | PASS |
| feature SAFE-092 test need 필요 | 위 명령·원출력 3571행 | PASS |
| feature SAFE-092 test area assigned | 위 명령·원출력 3572행 | PASS |
| feature SAFE-092 pass criteria present | 위 명령·원출력 3573행 | PASS |
| feature SAFE-093 name present | 위 명령·원출력 3574행 | PASS |
| feature SAFE-093 UI need 비대상 | 위 명령·원출력 3575행 | PASS |
| feature SAFE-093 test need 필요 | 위 명령·원출력 3576행 | PASS |
| feature SAFE-093 test area assigned | 위 명령·원출력 3577행 | PASS |
| feature SAFE-093 pass criteria present | 위 명령·원출력 3578행 | PASS |
| feature SAFE-094 name present | 위 명령·원출력 3579행 | PASS |
| feature SAFE-094 UI need 비대상 | 위 명령·원출력 3580행 | PASS |
| feature SAFE-094 test need 필요 | 위 명령·원출력 3581행 | PASS |
| feature SAFE-094 test area assigned | 위 명령·원출력 3582행 | PASS |
| feature SAFE-094 pass criteria present | 위 명령·원출력 3583행 | PASS |
| feature SAFE-095 name present | 위 명령·원출력 3584행 | PASS |
| feature SAFE-095 UI need 비대상 | 위 명령·원출력 3585행 | PASS |
| feature SAFE-095 test need 필요 | 위 명령·원출력 3586행 | PASS |
| feature SAFE-095 test area assigned | 위 명령·원출력 3587행 | PASS |
| feature SAFE-095 pass criteria present | 위 명령·원출력 3588행 | PASS |
| feature SAFE-096 name present | 위 명령·원출력 3589행 | PASS |
| feature SAFE-096 UI need 비대상 | 위 명령·원출력 3590행 | PASS |
| feature SAFE-096 test need 필요 | 위 명령·원출력 3591행 | PASS |
| feature SAFE-096 test area assigned | 위 명령·원출력 3592행 | PASS |
| feature SAFE-096 pass criteria present | 위 명령·원출력 3593행 | PASS |
| feature SAFE-097 name present | 위 명령·원출력 3594행 | PASS |
| feature SAFE-097 UI need 비대상 | 위 명령·원출력 3595행 | PASS |
| feature SAFE-097 test need 필요 | 위 명령·원출력 3596행 | PASS |
| feature SAFE-097 test area assigned | 위 명령·원출력 3597행 | PASS |
| feature SAFE-097 pass criteria present | 위 명령·원출력 3598행 | PASS |
| feature SAFE-098 name present | 위 명령·원출력 3599행 | PASS |
| feature SAFE-098 UI need 필요 | 위 명령·원출력 3600행 | PASS |
| feature SAFE-098 test need 필요 | 위 명령·원출력 3601행 | PASS |
| feature SAFE-098 test area assigned | 위 명령·원출력 3602행 | PASS |
| feature SAFE-098 pass criteria present | 위 명령·원출력 3603행 | PASS |
| feature SAFE-099 name present | 위 명령·원출력 3604행 | PASS |
| feature SAFE-099 UI need 비대상 | 위 명령·원출력 3605행 | PASS |
| feature SAFE-099 test need 필요 | 위 명령·원출력 3606행 | PASS |
| feature SAFE-099 test area assigned | 위 명령·원출력 3607행 | PASS |
| feature SAFE-099 pass criteria present | 위 명령·원출력 3608행 | PASS |
| feature SAFE-100 name present | 위 명령·원출력 3609행 | PASS |
| feature SAFE-100 UI need 비대상 | 위 명령·원출력 3610행 | PASS |
| feature SAFE-100 test need 필요 | 위 명령·원출력 3611행 | PASS |
| feature SAFE-100 test area assigned | 위 명령·원출력 3612행 | PASS |
| feature SAFE-100 pass criteria present | 위 명령·원출력 3613행 | PASS |
| feature SAFE-101 name present | 위 명령·원출력 3614행 | PASS |
| feature SAFE-101 UI need 비대상 | 위 명령·원출력 3615행 | PASS |
| feature SAFE-101 test need 필요 | 위 명령·원출력 3616행 | PASS |
| feature SAFE-101 test area assigned | 위 명령·원출력 3617행 | PASS |
| feature SAFE-101 pass criteria present | 위 명령·원출력 3618행 | PASS |
| feature SAFE-102 name present | 위 명령·원출력 3619행 | PASS |
| feature SAFE-102 UI need 비대상 | 위 명령·원출력 3620행 | PASS |
| feature SAFE-102 test need 필요 | 위 명령·원출력 3621행 | PASS |
| feature SAFE-102 test area assigned | 위 명령·원출력 3622행 | PASS |
| feature SAFE-102 pass criteria present | 위 명령·원출력 3623행 | PASS |
| feature SAFE-103 name present | 위 명령·원출력 3624행 | PASS |
| feature SAFE-103 UI need 비대상 | 위 명령·원출력 3625행 | PASS |
| feature SAFE-103 test need 필요 | 위 명령·원출력 3626행 | PASS |
| feature SAFE-103 test area assigned | 위 명령·원출력 3627행 | PASS |
| feature SAFE-103 pass criteria present | 위 명령·원출력 3628행 | PASS |
| feature SAFE-104 name present | 위 명령·원출력 3629행 | PASS |
| feature SAFE-104 UI need 필요 | 위 명령·원출력 3630행 | PASS |
| feature SAFE-104 test need 필요 | 위 명령·원출력 3631행 | PASS |
| feature SAFE-104 test area assigned | 위 명령·원출력 3632행 | PASS |
| feature SAFE-104 pass criteria present | 위 명령·원출력 3633행 | PASS |
| feature SAFE-105 name present | 위 명령·원출력 3634행 | PASS |
| feature SAFE-105 UI need 필요 | 위 명령·원출력 3635행 | PASS |
| feature SAFE-105 test need 필요 | 위 명령·원출력 3636행 | PASS |
| feature SAFE-105 test area assigned | 위 명령·원출력 3637행 | PASS |
| feature SAFE-105 pass criteria present | 위 명령·원출력 3638행 | PASS |
| feature SAFE-106 name present | 위 명령·원출력 3639행 | PASS |
| feature SAFE-106 UI need 필요 | 위 명령·원출력 3640행 | PASS |
| feature SAFE-106 test need 필요 | 위 명령·원출력 3641행 | PASS |
| feature SAFE-106 test area assigned | 위 명령·원출력 3642행 | PASS |
| feature SAFE-106 pass criteria present | 위 명령·원출력 3643행 | PASS |
| feature SAFE-107 name present | 위 명령·원출력 3644행 | PASS |
| feature SAFE-107 UI need 필요 | 위 명령·원출력 3645행 | PASS |
| feature SAFE-107 test need 필요 | 위 명령·원출력 3646행 | PASS |
| feature SAFE-107 test area assigned | 위 명령·원출력 3647행 | PASS |
| feature SAFE-107 pass criteria present | 위 명령·원출력 3648행 | PASS |
| feature SAFE-108 name present | 위 명령·원출력 3649행 | PASS |
| feature SAFE-108 UI need 필요 | 위 명령·원출력 3650행 | PASS |
| feature SAFE-108 test need 필요 | 위 명령·원출력 3651행 | PASS |
| feature SAFE-108 test area assigned | 위 명령·원출력 3652행 | PASS |
| feature SAFE-108 pass criteria present | 위 명령·원출력 3653행 | PASS |
| feature SAFE-109 name present | 위 명령·원출력 3654행 | PASS |
| feature SAFE-109 UI need 필요 | 위 명령·원출력 3655행 | PASS |
| feature SAFE-109 test need 필요 | 위 명령·원출력 3656행 | PASS |
| feature SAFE-109 test area assigned | 위 명령·원출력 3657행 | PASS |
| feature SAFE-109 pass criteria present | 위 명령·원출력 3658행 | PASS |
| feature SAFE-110 name present | 위 명령·원출력 3659행 | PASS |
| feature SAFE-110 UI need 필요 | 위 명령·원출력 3660행 | PASS |
| feature SAFE-110 test need 필요 | 위 명령·원출력 3661행 | PASS |
| feature SAFE-110 test area assigned | 위 명령·원출력 3662행 | PASS |
| feature SAFE-110 pass criteria present | 위 명령·원출력 3663행 | PASS |
| feature SAFE-111 name present | 위 명령·원출력 3664행 | PASS |
| feature SAFE-111 UI need 필요 | 위 명령·원출력 3665행 | PASS |
| feature SAFE-111 test need 필요 | 위 명령·원출력 3666행 | PASS |
| feature SAFE-111 test area assigned | 위 명령·원출력 3667행 | PASS |
| feature SAFE-111 pass criteria present | 위 명령·원출력 3668행 | PASS |
| feature SAFE-112 name present | 위 명령·원출력 3669행 | PASS |
| feature SAFE-112 UI need 비대상 | 위 명령·원출력 3670행 | PASS |
| feature SAFE-112 test need 필요 | 위 명령·원출력 3671행 | PASS |
| feature SAFE-112 test area assigned | 위 명령·원출력 3672행 | PASS |
| feature SAFE-112 pass criteria present | 위 명령·원출력 3673행 | PASS |
| feature SAFE-113 name present | 위 명령·원출력 3674행 | PASS |
| feature SAFE-113 UI need 비대상 | 위 명령·원출력 3675행 | PASS |
| feature SAFE-113 test need 필요 | 위 명령·원출력 3676행 | PASS |
| feature SAFE-113 test area assigned | 위 명령·원출력 3677행 | PASS |
| feature SAFE-113 pass criteria present | 위 명령·원출력 3678행 | PASS |
| feature SAFE-114 name present | 위 명령·원출력 3679행 | PASS |
| feature SAFE-114 UI need 비대상 | 위 명령·원출력 3680행 | PASS |
| feature SAFE-114 test need 필요 | 위 명령·원출력 3681행 | PASS |
| feature SAFE-114 test area assigned | 위 명령·원출력 3682행 | PASS |
| feature SAFE-114 pass criteria present | 위 명령·원출력 3683행 | PASS |
| feature SAFE-115 name present | 위 명령·원출력 3684행 | PASS |
| feature SAFE-115 UI need 비대상 | 위 명령·원출력 3685행 | PASS |
| feature SAFE-115 test need 필요 | 위 명령·원출력 3686행 | PASS |
| feature SAFE-115 test area assigned | 위 명령·원출력 3687행 | PASS |
| feature SAFE-115 pass criteria present | 위 명령·원출력 3688행 | PASS |
| feature SAFE-116 name present | 위 명령·원출력 3689행 | PASS |
| feature SAFE-116 UI need 비대상 | 위 명령·원출력 3690행 | PASS |
| feature SAFE-116 test need 필요 | 위 명령·원출력 3691행 | PASS |
| feature SAFE-116 test area assigned | 위 명령·원출력 3692행 | PASS |
| feature SAFE-116 pass criteria present | 위 명령·원출력 3693행 | PASS |
| feature SAFE-117 name present | 위 명령·원출력 3694행 | PASS |
| feature SAFE-117 UI need 필요 | 위 명령·원출력 3695행 | PASS |
| feature SAFE-117 test need 필요 | 위 명령·원출력 3696행 | PASS |
| feature SAFE-117 test area assigned | 위 명령·원출력 3697행 | PASS |
| feature SAFE-117 pass criteria present | 위 명령·원출력 3698행 | PASS |
| feature SAFE-118 name present | 위 명령·원출력 3699행 | PASS |
| feature SAFE-118 UI need 필요 | 위 명령·원출력 3700행 | PASS |
| feature SAFE-118 test need 필요 | 위 명령·원출력 3701행 | PASS |
| feature SAFE-118 test area assigned | 위 명령·원출력 3702행 | PASS |
| feature SAFE-118 pass criteria present | 위 명령·원출력 3703행 | PASS |
| feature SAFE-119 name present | 위 명령·원출력 3704행 | PASS |
| feature SAFE-119 UI need 필요 | 위 명령·원출력 3705행 | PASS |
| feature SAFE-119 test need 필요 | 위 명령·원출력 3706행 | PASS |
| feature SAFE-119 test area assigned | 위 명령·원출력 3707행 | PASS |
| feature SAFE-119 pass criteria present | 위 명령·원출력 3708행 | PASS |
| feature SAFE-120 name present | 위 명령·원출력 3709행 | PASS |
| feature SAFE-120 UI need 비대상 | 위 명령·원출력 3710행 | PASS |
| feature SAFE-120 test need 필요 | 위 명령·원출력 3711행 | PASS |
| feature SAFE-120 test area assigned | 위 명령·원출력 3712행 | PASS |
| feature SAFE-120 pass criteria present | 위 명령·원출력 3713행 | PASS |
| feature SAFE-121 name present | 위 명령·원출력 3714행 | PASS |
| feature SAFE-121 UI need 필요 | 위 명령·원출력 3715행 | PASS |
| feature SAFE-121 test need 필요 | 위 명령·원출력 3716행 | PASS |
| feature SAFE-121 test area assigned | 위 명령·원출력 3717행 | PASS |
| feature SAFE-121 pass criteria present | 위 명령·원출력 3718행 | PASS |
| feature SAFE-122 name present | 위 명령·원출력 3719행 | PASS |
| feature SAFE-122 UI need 필요 | 위 명령·원출력 3720행 | PASS |
| feature SAFE-122 test need 필요 | 위 명령·원출력 3721행 | PASS |
| feature SAFE-122 test area assigned | 위 명령·원출력 3722행 | PASS |
| feature SAFE-122 pass criteria present | 위 명령·원출력 3723행 | PASS |
| feature SAFE-123 name present | 위 명령·원출력 3724행 | PASS |
| feature SAFE-123 UI need 비대상 | 위 명령·원출력 3725행 | PASS |
| feature SAFE-123 test need 필요 | 위 명령·원출력 3726행 | PASS |
| feature SAFE-123 test area assigned | 위 명령·원출력 3727행 | PASS |
| feature SAFE-123 pass criteria present | 위 명령·원출력 3728행 | PASS |
| feature SAFE-124 name present | 위 명령·원출력 3729행 | PASS |
| feature SAFE-124 UI need 비대상 | 위 명령·원출력 3730행 | PASS |
| feature SAFE-124 test need 필요 | 위 명령·원출력 3731행 | PASS |
| feature SAFE-124 test area assigned | 위 명령·원출력 3732행 | PASS |
| feature SAFE-124 pass criteria present | 위 명령·원출력 3733행 | PASS |
| feature SAFE-125 name present | 위 명령·원출력 3734행 | PASS |
| feature SAFE-125 UI need 비대상 | 위 명령·원출력 3735행 | PASS |
| feature SAFE-125 test need 필요 | 위 명령·원출력 3736행 | PASS |
| feature SAFE-125 test area assigned | 위 명령·원출력 3737행 | PASS |
| feature SAFE-125 pass criteria present | 위 명령·원출력 3738행 | PASS |
| feature SAFE-126 name present | 위 명령·원출력 3739행 | PASS |
| feature SAFE-126 UI need 비대상 | 위 명령·원출력 3740행 | PASS |
| feature SAFE-126 test need 필요 | 위 명령·원출력 3741행 | PASS |
| feature SAFE-126 test area assigned | 위 명령·원출력 3742행 | PASS |
| feature SAFE-126 pass criteria present | 위 명령·원출력 3743행 | PASS |
| feature SAFE-127 name present | 위 명령·원출력 3744행 | PASS |
| feature SAFE-127 UI need 비대상 | 위 명령·원출력 3745행 | PASS |
| feature SAFE-127 test need 필요 | 위 명령·원출력 3746행 | PASS |
| feature SAFE-127 test area assigned | 위 명령·원출력 3747행 | PASS |
| feature SAFE-127 pass criteria present | 위 명령·원출력 3748행 | PASS |
| feature SAFE-128 name present | 위 명령·원출력 3749행 | PASS |
| feature SAFE-128 UI need 비대상 | 위 명령·원출력 3750행 | PASS |
| feature SAFE-128 test need 필요 | 위 명령·원출력 3751행 | PASS |
| feature SAFE-128 test area assigned | 위 명령·원출력 3752행 | PASS |
| feature SAFE-128 pass criteria present | 위 명령·원출력 3753행 | PASS |
| feature SAFE-129 name present | 위 명령·원출력 3754행 | PASS |
| feature SAFE-129 UI need 필요 | 위 명령·원출력 3755행 | PASS |
| feature SAFE-129 test need 필요 | 위 명령·원출력 3756행 | PASS |
| feature SAFE-129 test area assigned | 위 명령·원출력 3757행 | PASS |
| feature SAFE-129 pass criteria present | 위 명령·원출력 3758행 | PASS |
| feature SAFE-130 name present | 위 명령·원출력 3759행 | PASS |
| feature SAFE-130 UI need 필요 | 위 명령·원출력 3760행 | PASS |
| feature SAFE-130 test need 필요 | 위 명령·원출력 3761행 | PASS |
| feature SAFE-130 test area assigned | 위 명령·원출력 3762행 | PASS |
| feature SAFE-130 pass criteria present | 위 명령·원출력 3763행 | PASS |
| feature SAFE-131 name present | 위 명령·원출력 3764행 | PASS |
| feature SAFE-131 UI need 필요 | 위 명령·원출력 3765행 | PASS |
| feature SAFE-131 test need 필요 | 위 명령·원출력 3766행 | PASS |
| feature SAFE-131 test area assigned | 위 명령·원출력 3767행 | PASS |
| feature SAFE-131 pass criteria present | 위 명령·원출력 3768행 | PASS |
| feature SAFE-132 name present | 위 명령·원출력 3769행 | PASS |
| feature SAFE-132 UI need 필요 | 위 명령·원출력 3770행 | PASS |
| feature SAFE-132 test need 필요 | 위 명령·원출력 3771행 | PASS |
| feature SAFE-132 test area assigned | 위 명령·원출력 3772행 | PASS |
| feature SAFE-132 pass criteria present | 위 명령·원출력 3773행 | PASS |
| feature SAFE-133 name present | 위 명령·원출력 3774행 | PASS |
| feature SAFE-133 UI need 비대상 | 위 명령·원출력 3775행 | PASS |
| feature SAFE-133 test need 필요 | 위 명령·원출력 3776행 | PASS |
| feature SAFE-133 test area assigned | 위 명령·원출력 3777행 | PASS |
| feature SAFE-133 pass criteria present | 위 명령·원출력 3778행 | PASS |
| feature SAFE-134 name present | 위 명령·원출력 3779행 | PASS |
| feature SAFE-134 UI need 비대상 | 위 명령·원출력 3780행 | PASS |
| feature SAFE-134 test need 필요 | 위 명령·원출력 3781행 | PASS |
| feature SAFE-134 test area assigned | 위 명령·원출력 3782행 | PASS |
| feature SAFE-134 pass criteria present | 위 명령·원출력 3783행 | PASS |
| feature SAFE-135 name present | 위 명령·원출력 3784행 | PASS |
| feature SAFE-135 UI need 비대상 | 위 명령·원출력 3785행 | PASS |
| feature SAFE-135 test need 필요 | 위 명령·원출력 3786행 | PASS |
| feature SAFE-135 test area assigned | 위 명령·원출력 3787행 | PASS |
| feature SAFE-135 pass criteria present | 위 명령·원출력 3788행 | PASS |
| feature SAFE-136 name present | 위 명령·원출력 3789행 | PASS |
| feature SAFE-136 UI need 비대상 | 위 명령·원출력 3790행 | PASS |
| feature SAFE-136 test need 필요 | 위 명령·원출력 3791행 | PASS |
| feature SAFE-136 test area assigned | 위 명령·원출력 3792행 | PASS |
| feature SAFE-136 pass criteria present | 위 명령·원출력 3793행 | PASS |
| feature SAFE-137 name present | 위 명령·원출력 3794행 | PASS |
| feature SAFE-137 UI need 비대상 | 위 명령·원출력 3795행 | PASS |
| feature SAFE-137 test need 필요 | 위 명령·원출력 3796행 | PASS |
| feature SAFE-137 test area assigned | 위 명령·원출력 3797행 | PASS |
| feature SAFE-137 pass criteria present | 위 명령·원출력 3798행 | PASS |
| feature SAFE-138 name present | 위 명령·원출력 3799행 | PASS |
| feature SAFE-138 UI need 필요 | 위 명령·원출력 3800행 | PASS |
| feature SAFE-138 test need 필요 | 위 명령·원출력 3801행 | PASS |
| feature SAFE-138 test area assigned | 위 명령·원출력 3802행 | PASS |
| feature SAFE-138 pass criteria present | 위 명령·원출력 3803행 | PASS |
| feature SAFE-139 name present | 위 명령·원출력 3804행 | PASS |
| feature SAFE-139 UI need 비대상 | 위 명령·원출력 3805행 | PASS |
| feature SAFE-139 test need 필요 | 위 명령·원출력 3806행 | PASS |
| feature SAFE-139 test area assigned | 위 명령·원출력 3807행 | PASS |
| feature SAFE-139 pass criteria present | 위 명령·원출력 3808행 | PASS |
| feature SAFE-140 name present | 위 명령·원출력 3809행 | PASS |
| feature SAFE-140 UI need 필요 | 위 명령·원출력 3810행 | PASS |
| feature SAFE-140 test need 필요 | 위 명령·원출력 3811행 | PASS |
| feature SAFE-140 test area assigned | 위 명령·원출력 3812행 | PASS |
| feature SAFE-140 pass criteria present | 위 명령·원출력 3813행 | PASS |
| feature SAFE-141 name present | 위 명령·원출력 3814행 | PASS |
| feature SAFE-141 UI need 비대상 | 위 명령·원출력 3815행 | PASS |
| feature SAFE-141 test need 필요 | 위 명령·원출력 3816행 | PASS |
| feature SAFE-141 test area assigned | 위 명령·원출력 3817행 | PASS |
| feature SAFE-141 pass criteria present | 위 명령·원출력 3818행 | PASS |
| feature SAFE-142 name present | 위 명령·원출력 3819행 | PASS |
| feature SAFE-142 UI need 비대상 | 위 명령·원출력 3820행 | PASS |
| feature SAFE-142 test need 필요 | 위 명령·원출력 3821행 | PASS |
| feature SAFE-142 test area assigned | 위 명령·원출력 3822행 | PASS |
| feature SAFE-142 pass criteria present | 위 명령·원출력 3823행 | PASS |
| feature SAFE-143 name present | 위 명령·원출력 3824행 | PASS |
| feature SAFE-143 UI need 비대상 | 위 명령·원출력 3825행 | PASS |
| feature SAFE-143 test need 필요 | 위 명령·원출력 3826행 | PASS |
| feature SAFE-143 test area assigned | 위 명령·원출력 3827행 | PASS |
| feature SAFE-143 pass criteria present | 위 명령·원출력 3828행 | PASS |
| feature SAFE-144 name present | 위 명령·원출력 3829행 | PASS |
| feature SAFE-144 UI need 비대상 | 위 명령·원출력 3830행 | PASS |
| feature SAFE-144 test need 필요 | 위 명령·원출력 3831행 | PASS |
| feature SAFE-144 test area assigned | 위 명령·원출력 3832행 | PASS |
| feature SAFE-144 pass criteria present | 위 명령·원출력 3833행 | PASS |
| feature SAFE-145 name present | 위 명령·원출력 3834행 | PASS |
| feature SAFE-145 UI need 비대상 | 위 명령·원출력 3835행 | PASS |
| feature SAFE-145 test need 필요 | 위 명령·원출력 3836행 | PASS |
| feature SAFE-145 test area assigned | 위 명령·원출력 3837행 | PASS |
| feature SAFE-145 pass criteria present | 위 명령·원출력 3838행 | PASS |
| feature SAFE-146 name present | 위 명령·원출력 3839행 | PASS |
| feature SAFE-146 UI need 비대상 | 위 명령·원출력 3840행 | PASS |
| feature SAFE-146 test need 필요 | 위 명령·원출력 3841행 | PASS |
| feature SAFE-146 test area assigned | 위 명령·원출력 3842행 | PASS |
| feature SAFE-146 pass criteria present | 위 명령·원출력 3843행 | PASS |
| feature SAFE-147 name present | 위 명령·원출력 3844행 | PASS |
| feature SAFE-147 UI need 비대상 | 위 명령·원출력 3845행 | PASS |
| feature SAFE-147 test need 필요 | 위 명령·원출력 3846행 | PASS |
| feature SAFE-147 test area assigned | 위 명령·원출력 3847행 | PASS |
| feature SAFE-147 pass criteria present | 위 명령·원출력 3848행 | PASS |
| feature SAFE-148 name present | 위 명령·원출력 3849행 | PASS |
| feature SAFE-148 UI need 비대상 | 위 명령·원출력 3850행 | PASS |
| feature SAFE-148 test need 필요 | 위 명령·원출력 3851행 | PASS |
| feature SAFE-148 test area assigned | 위 명령·원출력 3852행 | PASS |
| feature SAFE-148 pass criteria present | 위 명령·원출력 3853행 | PASS |
| feature SAFE-149 name present | 위 명령·원출력 3854행 | PASS |
| feature SAFE-149 UI need 비대상 | 위 명령·원출력 3855행 | PASS |
| feature SAFE-149 test need 필요 | 위 명령·원출력 3856행 | PASS |
| feature SAFE-149 test area assigned | 위 명령·원출력 3857행 | PASS |
| feature SAFE-149 pass criteria present | 위 명령·원출력 3858행 | PASS |
| feature SAFE-150 name present | 위 명령·원출력 3859행 | PASS |
| feature SAFE-150 UI need 비대상 | 위 명령·원출력 3860행 | PASS |
| feature SAFE-150 test need 필요 | 위 명령·원출력 3861행 | PASS |
| feature SAFE-150 test area assigned | 위 명령·원출력 3862행 | PASS |
| feature SAFE-150 pass criteria present | 위 명령·원출력 3863행 | PASS |
| feature SAFE-151 name present | 위 명령·원출력 3864행 | PASS |
| feature SAFE-151 UI need 비대상 | 위 명령·원출력 3865행 | PASS |
| feature SAFE-151 test need 필요 | 위 명령·원출력 3866행 | PASS |
| feature SAFE-151 test area assigned | 위 명령·원출력 3867행 | PASS |
| feature SAFE-151 pass criteria present | 위 명령·원출력 3868행 | PASS |
| feature SAFE-152 name present | 위 명령·원출력 3869행 | PASS |
| feature SAFE-152 UI need 비대상 | 위 명령·원출력 3870행 | PASS |
| feature SAFE-152 test need 필요 | 위 명령·원출력 3871행 | PASS |
| feature SAFE-152 test area assigned | 위 명령·원출력 3872행 | PASS |
| feature SAFE-152 pass criteria present | 위 명령·원출력 3873행 | PASS |
| feature SAFE-153 name present | 위 명령·원출력 3874행 | PASS |
| feature SAFE-153 UI need 비대상 | 위 명령·원출력 3875행 | PASS |
| feature SAFE-153 test need 필요 | 위 명령·원출력 3876행 | PASS |
| feature SAFE-153 test area assigned | 위 명령·원출력 3877행 | PASS |
| feature SAFE-153 pass criteria present | 위 명령·원출력 3878행 | PASS |
| feature SAFE-154 name present | 위 명령·원출력 3879행 | PASS |
| feature SAFE-154 UI need 비대상 | 위 명령·원출력 3880행 | PASS |
| feature SAFE-154 test need 필요 | 위 명령·원출력 3881행 | PASS |
| feature SAFE-154 test area assigned | 위 명령·원출력 3882행 | PASS |
| feature SAFE-154 pass criteria present | 위 명령·원출력 3883행 | PASS |
| feature SAFE-155 name present | 위 명령·원출력 3884행 | PASS |
| feature SAFE-155 UI need 비대상 | 위 명령·원출력 3885행 | PASS |
| feature SAFE-155 test need 필요 | 위 명령·원출력 3886행 | PASS |
| feature SAFE-155 test area assigned | 위 명령·원출력 3887행 | PASS |
| feature SAFE-155 pass criteria present | 위 명령·원출력 3888행 | PASS |
| feature SAFE-156 name present | 위 명령·원출력 3889행 | PASS |
| feature SAFE-156 UI need 비대상 | 위 명령·원출력 3890행 | PASS |
| feature SAFE-156 test need 필요 | 위 명령·원출력 3891행 | PASS |
| feature SAFE-156 test area assigned | 위 명령·원출력 3892행 | PASS |
| feature SAFE-156 pass criteria present | 위 명령·원출력 3893행 | PASS |
| feature SAFE-157 name present | 위 명령·원출력 3894행 | PASS |
| feature SAFE-157 UI need 비대상 | 위 명령·원출력 3895행 | PASS |
| feature SAFE-157 test need 필요 | 위 명령·원출력 3896행 | PASS |
| feature SAFE-157 test area assigned | 위 명령·원출력 3897행 | PASS |
| feature SAFE-157 pass criteria present | 위 명령·원출력 3898행 | PASS |
| feature SAFE-158 name present | 위 명령·원출력 3899행 | PASS |
| feature SAFE-158 UI need 비대상 | 위 명령·원출력 3900행 | PASS |
| feature SAFE-158 test need 필요 | 위 명령·원출력 3901행 | PASS |
| feature SAFE-158 test area assigned | 위 명령·원출력 3902행 | PASS |
| feature SAFE-158 pass criteria present | 위 명령·원출력 3903행 | PASS |
| feature SAFE-159 name present | 위 명령·원출력 3904행 | PASS |
| feature SAFE-159 UI need 비대상 | 위 명령·원출력 3905행 | PASS |
| feature SAFE-159 test need 필요 | 위 명령·원출력 3906행 | PASS |
| feature SAFE-159 test area assigned | 위 명령·원출력 3907행 | PASS |
| feature SAFE-159 pass criteria present | 위 명령·원출력 3908행 | PASS |
| feature SAFE-160 name present | 위 명령·원출력 3909행 | PASS |
| feature SAFE-160 UI need 비대상 | 위 명령·원출력 3910행 | PASS |
| feature SAFE-160 test need 필요 | 위 명령·원출력 3911행 | PASS |
| feature SAFE-160 test area assigned | 위 명령·원출력 3912행 | PASS |
| feature SAFE-160 pass criteria present | 위 명령·원출력 3913행 | PASS |
| feature SAFE-161 name present | 위 명령·원출력 3914행 | PASS |
| feature SAFE-161 UI need 비대상 | 위 명령·원출력 3915행 | PASS |
| feature SAFE-161 test need 필요 | 위 명령·원출력 3916행 | PASS |
| feature SAFE-161 test area assigned | 위 명령·원출력 3917행 | PASS |
| feature SAFE-161 pass criteria present | 위 명령·원출력 3918행 | PASS |
| feature SAFE-162 name present | 위 명령·원출력 3919행 | PASS |
| feature SAFE-162 UI need 비대상 | 위 명령·원출력 3920행 | PASS |
| feature SAFE-162 test need 필요 | 위 명령·원출력 3921행 | PASS |
| feature SAFE-162 test area assigned | 위 명령·원출력 3922행 | PASS |
| feature SAFE-162 pass criteria present | 위 명령·원출력 3923행 | PASS |
| feature SAFE-163 name present | 위 명령·원출력 3924행 | PASS |
| feature SAFE-163 UI need 비대상 | 위 명령·원출력 3925행 | PASS |
| feature SAFE-163 test need 필요 | 위 명령·원출력 3926행 | PASS |
| feature SAFE-163 test area assigned | 위 명령·원출력 3927행 | PASS |
| feature SAFE-163 pass criteria present | 위 명령·원출력 3928행 | PASS |
| feature SAFE-164 name present | 위 명령·원출력 3929행 | PASS |
| feature SAFE-164 UI need 비대상 | 위 명령·원출력 3930행 | PASS |
| feature SAFE-164 test need 필요 | 위 명령·원출력 3931행 | PASS |
| feature SAFE-164 test area assigned | 위 명령·원출력 3932행 | PASS |
| feature SAFE-164 pass criteria present | 위 명령·원출력 3933행 | PASS |
| feature SAFE-165 name present | 위 명령·원출력 3934행 | PASS |
| feature SAFE-165 UI need 비대상 | 위 명령·원출력 3935행 | PASS |
| feature SAFE-165 test need 필요 | 위 명령·원출력 3936행 | PASS |
| feature SAFE-165 test area assigned | 위 명령·원출력 3937행 | PASS |
| feature SAFE-165 pass criteria present | 위 명령·원출력 3938행 | PASS |
| feature SAFE-166 name present | 위 명령·원출력 3939행 | PASS |
| feature SAFE-166 UI need 비대상 | 위 명령·원출력 3940행 | PASS |
| feature SAFE-166 test need 필요 | 위 명령·원출력 3941행 | PASS |
| feature SAFE-166 test area assigned | 위 명령·원출력 3942행 | PASS |
| feature SAFE-166 pass criteria present | 위 명령·원출력 3943행 | PASS |
| feature SAFE-167 name present | 위 명령·원출력 3944행 | PASS |
| feature SAFE-167 UI need 비대상 | 위 명령·원출력 3945행 | PASS |
| feature SAFE-167 test need 필요 | 위 명령·원출력 3946행 | PASS |
| feature SAFE-167 test area assigned | 위 명령·원출력 3947행 | PASS |
| feature SAFE-167 pass criteria present | 위 명령·원출력 3948행 | PASS |
| feature SAFE-168 name present | 위 명령·원출력 3949행 | PASS |
| feature SAFE-168 UI need 비대상 | 위 명령·원출력 3950행 | PASS |
| feature SAFE-168 test need 필요 | 위 명령·원출력 3951행 | PASS |
| feature SAFE-168 test area assigned | 위 명령·원출력 3952행 | PASS |
| feature SAFE-168 pass criteria present | 위 명령·원출력 3953행 | PASS |
| feature SAFE-169 name present | 위 명령·원출력 3954행 | PASS |
| feature SAFE-169 UI need 비대상 | 위 명령·원출력 3955행 | PASS |
| feature SAFE-169 test need 필요 | 위 명령·원출력 3956행 | PASS |
| feature SAFE-169 test area assigned | 위 명령·원출력 3957행 | PASS |
| feature SAFE-169 pass criteria present | 위 명령·원출력 3958행 | PASS |
| feature SAFE-170 name present | 위 명령·원출력 3959행 | PASS |
| feature SAFE-170 UI need 비대상 | 위 명령·원출력 3960행 | PASS |
| feature SAFE-170 test need 필요 | 위 명령·원출력 3961행 | PASS |
| feature SAFE-170 test area assigned | 위 명령·원출력 3962행 | PASS |
| feature SAFE-170 pass criteria present | 위 명령·원출력 3963행 | PASS |
| feature SAFE-171 name present | 위 명령·원출력 3964행 | PASS |
| feature SAFE-171 UI need 비대상 | 위 명령·원출력 3965행 | PASS |
| feature SAFE-171 test need 필요 | 위 명령·원출력 3966행 | PASS |
| feature SAFE-171 test area assigned | 위 명령·원출력 3967행 | PASS |
| feature SAFE-171 pass criteria present | 위 명령·원출력 3968행 | PASS |
| feature SAFE-172 name present | 위 명령·원출력 3969행 | PASS |
| feature SAFE-172 UI need 비대상 | 위 명령·원출력 3970행 | PASS |
| feature SAFE-172 test need 필요 | 위 명령·원출력 3971행 | PASS |
| feature SAFE-172 test area assigned | 위 명령·원출력 3972행 | PASS |
| feature SAFE-172 pass criteria present | 위 명령·원출력 3973행 | PASS |
| feature SAFE-173 name present | 위 명령·원출력 3974행 | PASS |
| feature SAFE-173 UI need 비대상 | 위 명령·원출력 3975행 | PASS |
| feature SAFE-173 test need 필요 | 위 명령·원출력 3976행 | PASS |
| feature SAFE-173 test area assigned | 위 명령·원출력 3977행 | PASS |
| feature SAFE-173 pass criteria present | 위 명령·원출력 3978행 | PASS |
| feature SAFE-174 name present | 위 명령·원출력 3979행 | PASS |
| feature SAFE-174 UI need 비대상 | 위 명령·원출력 3980행 | PASS |
| feature SAFE-174 test need 필요 | 위 명령·원출력 3981행 | PASS |
| feature SAFE-174 test area assigned | 위 명령·원출력 3982행 | PASS |
| feature SAFE-174 pass criteria present | 위 명령·원출력 3983행 | PASS |
| feature SAFE-175 name present | 위 명령·원출력 3984행 | PASS |
| feature SAFE-175 UI need 비대상 | 위 명령·원출력 3985행 | PASS |
| feature SAFE-175 test need 필요 | 위 명령·원출력 3986행 | PASS |
| feature SAFE-175 test area assigned | 위 명령·원출력 3987행 | PASS |
| feature SAFE-175 pass criteria present | 위 명령·원출력 3988행 | PASS |
| feature SAFE-176 name present | 위 명령·원출력 3989행 | PASS |
| feature SAFE-176 UI need 비대상 | 위 명령·원출력 3990행 | PASS |
| feature SAFE-176 test need 필요 | 위 명령·원출력 3991행 | PASS |
| feature SAFE-176 test area assigned | 위 명령·원출력 3992행 | PASS |
| feature SAFE-176 pass criteria present | 위 명령·원출력 3993행 | PASS |
| feature SAFE-177 name present | 위 명령·원출력 3994행 | PASS |
| feature SAFE-177 UI need 비대상 | 위 명령·원출력 3995행 | PASS |
| feature SAFE-177 test need 필요 | 위 명령·원출력 3996행 | PASS |
| feature SAFE-177 test area assigned | 위 명령·원출력 3997행 | PASS |
| feature SAFE-177 pass criteria present | 위 명령·원출력 3998행 | PASS |
| feature SAFE-178 name present | 위 명령·원출력 3999행 | PASS |
| feature SAFE-178 UI need 비대상 | 위 명령·원출력 4000행 | PASS |
| feature SAFE-178 test need 필요 | 위 명령·원출력 4001행 | PASS |
| feature SAFE-178 test area assigned | 위 명령·원출력 4002행 | PASS |
| feature SAFE-178 pass criteria present | 위 명령·원출력 4003행 | PASS |
| feature SAFE-179 name present | 위 명령·원출력 4004행 | PASS |
| feature SAFE-179 UI need 비대상 | 위 명령·원출력 4005행 | PASS |
| feature SAFE-179 test need 필요 | 위 명령·원출력 4006행 | PASS |
| feature SAFE-179 test area assigned | 위 명령·원출력 4007행 | PASS |
| feature SAFE-179 pass criteria present | 위 명령·원출력 4008행 | PASS |
| feature SAFE-180 name present | 위 명령·원출력 4009행 | PASS |
| feature SAFE-180 UI need 비대상 | 위 명령·원출력 4010행 | PASS |
| feature SAFE-180 test need 필요 | 위 명령·원출력 4011행 | PASS |
| feature SAFE-180 test area assigned | 위 명령·원출력 4012행 | PASS |
| feature SAFE-180 pass criteria present | 위 명령·원출력 4013행 | PASS |
| feature SAFE-181 name present | 위 명령·원출력 4014행 | PASS |
| feature SAFE-181 UI need 비대상 | 위 명령·원출력 4015행 | PASS |
| feature SAFE-181 test need 필요 | 위 명령·원출력 4016행 | PASS |
| feature SAFE-181 test area assigned | 위 명령·원출력 4017행 | PASS |
| feature SAFE-181 pass criteria present | 위 명령·원출력 4018행 | PASS |
| feature SAFE-182 name present | 위 명령·원출력 4019행 | PASS |
| feature SAFE-182 UI need 비대상 | 위 명령·원출력 4020행 | PASS |
| feature SAFE-182 test need 필요 | 위 명령·원출력 4021행 | PASS |
| feature SAFE-182 test area assigned | 위 명령·원출력 4022행 | PASS |
| feature SAFE-182 pass criteria present | 위 명령·원출력 4023행 | PASS |
| feature SAFE-183 name present | 위 명령·원출력 4024행 | PASS |
| feature SAFE-183 UI need 비대상 | 위 명령·원출력 4025행 | PASS |
| feature SAFE-183 test need 필요 | 위 명령·원출력 4026행 | PASS |
| feature SAFE-183 test area assigned | 위 명령·원출력 4027행 | PASS |
| feature SAFE-183 pass criteria present | 위 명령·원출력 4028행 | PASS |
| feature SAFE-184 name present | 위 명령·원출력 4029행 | PASS |
| feature SAFE-184 UI need 비대상 | 위 명령·원출력 4030행 | PASS |
| feature SAFE-184 test need 필요 | 위 명령·원출력 4031행 | PASS |
| feature SAFE-184 test area assigned | 위 명령·원출력 4032행 | PASS |
| feature SAFE-184 pass criteria present | 위 명령·원출력 4033행 | PASS |
| feature SAFE-185 name present | 위 명령·원출력 4034행 | PASS |
| feature SAFE-185 UI need 비대상 | 위 명령·원출력 4035행 | PASS |
| feature SAFE-185 test need 필요 | 위 명령·원출력 4036행 | PASS |
| feature SAFE-185 test area assigned | 위 명령·원출력 4037행 | PASS |
| feature SAFE-185 pass criteria present | 위 명령·원출력 4038행 | PASS |
| feature SAFE-186 name present | 위 명령·원출력 4039행 | PASS |
| feature SAFE-186 UI need 비대상 | 위 명령·원출력 4040행 | PASS |
| feature SAFE-186 test need 필요 | 위 명령·원출력 4041행 | PASS |
| feature SAFE-186 test area assigned | 위 명령·원출력 4042행 | PASS |
| feature SAFE-186 pass criteria present | 위 명령·원출력 4043행 | PASS |
| feature SAFE-187 name present | 위 명령·원출력 4044행 | PASS |
| feature SAFE-187 UI need 비대상 | 위 명령·원출력 4045행 | PASS |
| feature SAFE-187 test need 필요 | 위 명령·원출력 4046행 | PASS |
| feature SAFE-187 test area assigned | 위 명령·원출력 4047행 | PASS |
| feature SAFE-187 pass criteria present | 위 명령·원출력 4048행 | PASS |
| feature SAFE-188 name present | 위 명령·원출력 4049행 | PASS |
| feature SAFE-188 UI need 비대상 | 위 명령·원출력 4050행 | PASS |
| feature SAFE-188 test need 필요 | 위 명령·원출력 4051행 | PASS |
| feature SAFE-188 test area assigned | 위 명령·원출력 4052행 | PASS |
| feature SAFE-188 pass criteria present | 위 명령·원출력 4053행 | PASS |
| feature SAFE-189 name present | 위 명령·원출력 4054행 | PASS |
| feature SAFE-189 UI need 비대상 | 위 명령·원출력 4055행 | PASS |
| feature SAFE-189 test need 필요 | 위 명령·원출력 4056행 | PASS |
| feature SAFE-189 test area assigned | 위 명령·원출력 4057행 | PASS |
| feature SAFE-189 pass criteria present | 위 명령·원출력 4058행 | PASS |
| feature SAFE-190 name present | 위 명령·원출력 4059행 | PASS |
| feature SAFE-190 UI need 비대상 | 위 명령·원출력 4060행 | PASS |
| feature SAFE-190 test need 필요 | 위 명령·원출력 4061행 | PASS |
| feature SAFE-190 test area assigned | 위 명령·원출력 4062행 | PASS |
| feature SAFE-190 pass criteria present | 위 명령·원출력 4063행 | PASS |
| feature SAFE-191 name present | 위 명령·원출력 4064행 | PASS |
| feature SAFE-191 UI need 비대상 | 위 명령·원출력 4065행 | PASS |
| feature SAFE-191 test need 필요 | 위 명령·원출력 4066행 | PASS |
| feature SAFE-191 test area assigned | 위 명령·원출력 4067행 | PASS |
| feature SAFE-191 pass criteria present | 위 명령·원출력 4068행 | PASS |
| feature SAFE-192 name present | 위 명령·원출력 4069행 | PASS |
| feature SAFE-192 UI need 비대상 | 위 명령·원출력 4070행 | PASS |
| feature SAFE-192 test need 필요 | 위 명령·원출력 4071행 | PASS |
| feature SAFE-192 test area assigned | 위 명령·원출력 4072행 | PASS |
| feature SAFE-192 pass criteria present | 위 명령·원출력 4073행 | PASS |
| feature SAFE-193 name present | 위 명령·원출력 4074행 | PASS |
| feature SAFE-193 UI need 비대상 | 위 명령·원출력 4075행 | PASS |
| feature SAFE-193 test need 필요 | 위 명령·원출력 4076행 | PASS |
| feature SAFE-193 test area assigned | 위 명령·원출력 4077행 | PASS |
| feature SAFE-193 pass criteria present | 위 명령·원출력 4078행 | PASS |
| feature SAFE-194 name present | 위 명령·원출력 4079행 | PASS |
| feature SAFE-194 UI need 비대상 | 위 명령·원출력 4080행 | PASS |
| feature SAFE-194 test need 필요 | 위 명령·원출력 4081행 | PASS |
| feature SAFE-194 test area assigned | 위 명령·원출력 4082행 | PASS |
| feature SAFE-194 pass criteria present | 위 명령·원출력 4083행 | PASS |
| feature SAFE-195 name present | 위 명령·원출력 4084행 | PASS |
| feature SAFE-195 UI need 비대상 | 위 명령·원출력 4085행 | PASS |
| feature SAFE-195 test need 필요 | 위 명령·원출력 4086행 | PASS |
| feature SAFE-195 test area assigned | 위 명령·원출력 4087행 | PASS |
| feature SAFE-195 pass criteria present | 위 명령·원출력 4088행 | PASS |
| feature SAFE-196 name present | 위 명령·원출력 4089행 | PASS |
| feature SAFE-196 UI need 비대상 | 위 명령·원출력 4090행 | PASS |
| feature SAFE-196 test need 필요 | 위 명령·원출력 4091행 | PASS |
| feature SAFE-196 test area assigned | 위 명령·원출력 4092행 | PASS |
| feature SAFE-196 pass criteria present | 위 명령·원출력 4093행 | PASS |
| feature SAFE-197 name present | 위 명령·원출력 4094행 | PASS |
| feature SAFE-197 UI need 비대상 | 위 명령·원출력 4095행 | PASS |
| feature SAFE-197 test need 필요 | 위 명령·원출력 4096행 | PASS |
| feature SAFE-197 test area assigned | 위 명령·원출력 4097행 | PASS |
| feature SAFE-197 pass criteria present | 위 명령·원출력 4098행 | PASS |
| feature SAFE-198 name present | 위 명령·원출력 4099행 | PASS |
| feature SAFE-198 UI need 비대상 | 위 명령·원출력 4100행 | PASS |
| feature SAFE-198 test need 필요 | 위 명령·원출력 4101행 | PASS |
| feature SAFE-198 test area assigned | 위 명령·원출력 4102행 | PASS |
| feature SAFE-198 pass criteria present | 위 명령·원출력 4103행 | PASS |
| feature SAFE-199 name present | 위 명령·원출력 4104행 | PASS |
| feature SAFE-199 UI need 비대상 | 위 명령·원출력 4105행 | PASS |
| feature SAFE-199 test need 필요 | 위 명령·원출력 4106행 | PASS |
| feature SAFE-199 test area assigned | 위 명령·원출력 4107행 | PASS |
| feature SAFE-199 pass criteria present | 위 명령·원출력 4108행 | PASS |
| feature SAFE-200 name present | 위 명령·원출력 4109행 | PASS |
| feature SAFE-200 UI need 비대상 | 위 명령·원출력 4110행 | PASS |
| feature SAFE-200 test need 필요 | 위 명령·원출력 4111행 | PASS |
| feature SAFE-200 test area assigned | 위 명령·원출력 4112행 | PASS |
| feature SAFE-200 pass criteria present | 위 명령·원출력 4113행 | PASS |
| feature SAFE-201 name present | 위 명령·원출력 4114행 | PASS |
| feature SAFE-201 UI need 비대상 | 위 명령·원출력 4115행 | PASS |
| feature SAFE-201 test need 필요 | 위 명령·원출력 4116행 | PASS |
| feature SAFE-201 test area assigned | 위 명령·원출력 4117행 | PASS |
| feature SAFE-201 pass criteria present | 위 명령·원출력 4118행 | PASS |
| feature SAFE-202 name present | 위 명령·원출력 4119행 | PASS |
| feature SAFE-202 UI need 비대상 | 위 명령·원출력 4120행 | PASS |
| feature SAFE-202 test need 필요 | 위 명령·원출력 4121행 | PASS |
| feature SAFE-202 test area assigned | 위 명령·원출력 4122행 | PASS |
| feature SAFE-202 pass criteria present | 위 명령·원출력 4123행 | PASS |
| feature SAFE-203 name present | 위 명령·원출력 4124행 | PASS |
| feature SAFE-203 UI need 비대상 | 위 명령·원출력 4125행 | PASS |
| feature SAFE-203 test need 필요 | 위 명령·원출력 4126행 | PASS |
| feature SAFE-203 test area assigned | 위 명령·원출력 4127행 | PASS |
| feature SAFE-203 pass criteria present | 위 명령·원출력 4128행 | PASS |
| feature SAFE-204 name present | 위 명령·원출력 4129행 | PASS |
| feature SAFE-204 UI need 비대상 | 위 명령·원출력 4130행 | PASS |
| feature SAFE-204 test need 필요 | 위 명령·원출력 4131행 | PASS |
| feature SAFE-204 test area assigned | 위 명령·원출력 4132행 | PASS |
| feature SAFE-204 pass criteria present | 위 명령·원출력 4133행 | PASS |
| feature SAFE-205 name present | 위 명령·원출력 4134행 | PASS |
| feature SAFE-205 UI need 비대상 | 위 명령·원출력 4135행 | PASS |
| feature SAFE-205 test need 필요 | 위 명령·원출력 4136행 | PASS |
| feature SAFE-205 test area assigned | 위 명령·원출력 4137행 | PASS |
| feature SAFE-205 pass criteria present | 위 명령·원출력 4138행 | PASS |
| feature SAFE-206 name present | 위 명령·원출력 4139행 | PASS |
| feature SAFE-206 UI need 비대상 | 위 명령·원출력 4140행 | PASS |
| feature SAFE-206 test need 필요 | 위 명령·원출력 4141행 | PASS |
| feature SAFE-206 test area assigned | 위 명령·원출력 4142행 | PASS |
| feature SAFE-206 pass criteria present | 위 명령·원출력 4143행 | PASS |
| feature SAFE-207 name present | 위 명령·원출력 4144행 | PASS |
| feature SAFE-207 UI need 비대상 | 위 명령·원출력 4145행 | PASS |
| feature SAFE-207 test need 필요 | 위 명령·원출력 4146행 | PASS |
| feature SAFE-207 test area assigned | 위 명령·원출력 4147행 | PASS |
| feature SAFE-207 pass criteria present | 위 명령·원출력 4148행 | PASS |
| feature SAFE-208 name present | 위 명령·원출력 4149행 | PASS |
| feature SAFE-208 UI need 비대상 | 위 명령·원출력 4150행 | PASS |
| feature SAFE-208 test need 필요 | 위 명령·원출력 4151행 | PASS |
| feature SAFE-208 test area assigned | 위 명령·원출력 4152행 | PASS |
| feature SAFE-208 pass criteria present | 위 명령·원출력 4153행 | PASS |
| feature SAFE-209 name present | 위 명령·원출력 4154행 | PASS |
| feature SAFE-209 UI need 비대상 | 위 명령·원출력 4155행 | PASS |
| feature SAFE-209 test need 필요 | 위 명령·원출력 4156행 | PASS |
| feature SAFE-209 test area assigned | 위 명령·원출력 4157행 | PASS |
| feature SAFE-209 pass criteria present | 위 명령·원출력 4158행 | PASS |
| feature SAFE-210 name present | 위 명령·원출력 4159행 | PASS |
| feature SAFE-210 UI need 비대상 | 위 명령·원출력 4160행 | PASS |
| feature SAFE-210 test need 필요 | 위 명령·원출력 4161행 | PASS |
| feature SAFE-210 test area assigned | 위 명령·원출력 4162행 | PASS |
| feature SAFE-210 pass criteria present | 위 명령·원출력 4163행 | PASS |
| feature SAFE-211 name present | 위 명령·원출력 4164행 | PASS |
| feature SAFE-211 UI need 비대상 | 위 명령·원출력 4165행 | PASS |
| feature SAFE-211 test need 필요 | 위 명령·원출력 4166행 | PASS |
| feature SAFE-211 test area assigned | 위 명령·원출력 4167행 | PASS |
| feature SAFE-211 pass criteria present | 위 명령·원출력 4168행 | PASS |
| feature SAFE-212 name present | 위 명령·원출력 4169행 | PASS |
| feature SAFE-212 UI need 비대상 | 위 명령·원출력 4170행 | PASS |
| feature SAFE-212 test need 필요 | 위 명령·원출력 4171행 | PASS |
| feature SAFE-212 test area assigned | 위 명령·원출력 4172행 | PASS |
| feature SAFE-212 pass criteria present | 위 명령·원출력 4173행 | PASS |
| feature SAFE-213 name present | 위 명령·원출력 4174행 | PASS |
| feature SAFE-213 UI need 비대상 | 위 명령·원출력 4175행 | PASS |
| feature SAFE-213 test need 필요 | 위 명령·원출력 4176행 | PASS |
| feature SAFE-213 test area assigned | 위 명령·원출력 4177행 | PASS |
| feature SAFE-213 pass criteria present | 위 명령·원출력 4178행 | PASS |
| feature SAFE-214 name present | 위 명령·원출력 4179행 | PASS |
| feature SAFE-214 UI need 비대상 | 위 명령·원출력 4180행 | PASS |
| feature SAFE-214 test need 필요 | 위 명령·원출력 4181행 | PASS |
| feature SAFE-214 test area assigned | 위 명령·원출력 4182행 | PASS |
| feature SAFE-214 pass criteria present | 위 명령·원출력 4183행 | PASS |
| feature SAFE-215 name present | 위 명령·원출력 4184행 | PASS |
| feature SAFE-215 UI need 비대상 | 위 명령·원출력 4185행 | PASS |
| feature SAFE-215 test need 필요 | 위 명령·원출력 4186행 | PASS |
| feature SAFE-215 test area assigned | 위 명령·원출력 4187행 | PASS |
| feature SAFE-215 pass criteria present | 위 명령·원출력 4188행 | PASS |
| feature SAFE-216 name present | 위 명령·원출력 4189행 | PASS |
| feature SAFE-216 UI need 비대상 | 위 명령·원출력 4190행 | PASS |
| feature SAFE-216 test need 필요 | 위 명령·원출력 4191행 | PASS |
| feature SAFE-216 test area assigned | 위 명령·원출력 4192행 | PASS |
| feature SAFE-216 pass criteria present | 위 명령·원출력 4193행 | PASS |
| feature SAFE-217 name present | 위 명령·원출력 4194행 | PASS |
| feature SAFE-217 UI need 비대상 | 위 명령·원출력 4195행 | PASS |
| feature SAFE-217 test need 필요 | 위 명령·원출력 4196행 | PASS |
| feature SAFE-217 test area assigned | 위 명령·원출력 4197행 | PASS |
| feature SAFE-217 pass criteria present | 위 명령·원출력 4198행 | PASS |
| feature OPS-035 name present | 위 명령·원출력 4199행 | PASS |
| feature OPS-035 UI need 비대상 | 위 명령·원출력 4200행 | PASS |
| feature OPS-035 test need 필요 | 위 명령·원출력 4201행 | PASS |
| feature OPS-035 test area assigned | 위 명령·원출력 4202행 | PASS |
| feature OPS-035 pass criteria present | 위 명령·원출력 4203행 | PASS |
| feature OPS-036 name present | 위 명령·원출력 4204행 | PASS |
| feature OPS-036 UI need 비대상 | 위 명령·원출력 4205행 | PASS |
| feature OPS-036 test need 필요 | 위 명령·원출력 4206행 | PASS |
| feature OPS-036 test area assigned | 위 명령·원출력 4207행 | PASS |
| feature OPS-036 pass criteria present | 위 명령·원출력 4208행 | PASS |
| feature OPS-037 name present | 위 명령·원출력 4209행 | PASS |
| feature OPS-037 UI need 비대상 | 위 명령·원출력 4210행 | PASS |
| feature OPS-037 test need 필요 | 위 명령·원출력 4211행 | PASS |
| feature OPS-037 test area assigned | 위 명령·원출력 4212행 | PASS |
| feature OPS-037 pass criteria present | 위 명령·원출력 4213행 | PASS |
| feature OPS-038 name present | 위 명령·원출력 4214행 | PASS |
| feature OPS-038 UI need 비대상 | 위 명령·원출력 4215행 | PASS |
| feature OPS-038 test need 필요 | 위 명령·원출력 4216행 | PASS |
| feature OPS-038 test area assigned | 위 명령·원출력 4217행 | PASS |
| feature OPS-038 pass criteria present | 위 명령·원출력 4218행 | PASS |
| feature OPS-039 name present | 위 명령·원출력 4219행 | PASS |
| feature OPS-039 UI need 비대상 | 위 명령·원출력 4220행 | PASS |
| feature OPS-039 test need 필요 | 위 명령·원출력 4221행 | PASS |
| feature OPS-039 test area assigned | 위 명령·원출력 4222행 | PASS |
| feature OPS-039 pass criteria present | 위 명령·원출력 4223행 | PASS |
| feature OPS-040 name present | 위 명령·원출력 4224행 | PASS |
| feature OPS-040 UI need 비대상 | 위 명령·원출력 4225행 | PASS |
| feature OPS-040 test need 필요 | 위 명령·원출력 4226행 | PASS |
| feature OPS-040 test area assigned | 위 명령·원출력 4227행 | PASS |
| feature OPS-040 pass criteria present | 위 명령·원출력 4228행 | PASS |
| feature OPS-041 name present | 위 명령·원출력 4229행 | PASS |
| feature OPS-041 UI need 비대상 | 위 명령·원출력 4230행 | PASS |
| feature OPS-041 test need 필요 | 위 명령·원출력 4231행 | PASS |
| feature OPS-041 test area assigned | 위 명령·원출력 4232행 | PASS |
| feature OPS-041 pass criteria present | 위 명령·원출력 4233행 | PASS |
| feature OPS-042 name present | 위 명령·원출력 4234행 | PASS |
| feature OPS-042 UI need 비대상 | 위 명령·원출력 4235행 | PASS |
| feature OPS-042 test need 필요 | 위 명령·원출력 4236행 | PASS |
| feature OPS-042 test area assigned | 위 명령·원출력 4237행 | PASS |
| feature OPS-042 pass criteria present | 위 명령·원출력 4238행 | PASS |
| feature OPS-043 name present | 위 명령·원출력 4239행 | PASS |
| feature OPS-043 UI need 비대상 | 위 명령·원출력 4240행 | PASS |
| feature OPS-043 test need 필요 | 위 명령·원출력 4241행 | PASS |
| feature OPS-043 test area assigned | 위 명령·원출력 4242행 | PASS |
| feature OPS-043 pass criteria present | 위 명령·원출력 4243행 | PASS |
| feature OPS-044 name present | 위 명령·원출력 4244행 | PASS |
| feature OPS-044 UI need 비대상 | 위 명령·원출력 4245행 | PASS |
| feature OPS-044 test need 필요 | 위 명령·원출력 4246행 | PASS |
| feature OPS-044 test area assigned | 위 명령·원출력 4247행 | PASS |
| feature OPS-044 pass criteria present | 위 명령·원출력 4248행 | PASS |
| feature OPS-045 name present | 위 명령·원출력 4249행 | PASS |
| feature OPS-045 UI need 비대상 | 위 명령·원출력 4250행 | PASS |
| feature OPS-045 test need 필요 | 위 명령·원출력 4251행 | PASS |
| feature OPS-045 test area assigned | 위 명령·원출력 4252행 | PASS |
| feature OPS-045 pass criteria present | 위 명령·원출력 4253행 | PASS |
| feature OPS-046 name present | 위 명령·원출력 4254행 | PASS |
| feature OPS-046 UI need 비대상 | 위 명령·원출력 4255행 | PASS |
| feature OPS-046 test need 필요 | 위 명령·원출력 4256행 | PASS |
| feature OPS-046 test area assigned | 위 명령·원출력 4257행 | PASS |
| feature OPS-046 pass criteria present | 위 명령·원출력 4258행 | PASS |
| feature OPS-047 name present | 위 명령·원출력 4259행 | PASS |
| feature OPS-047 UI need 비대상 | 위 명령·원출력 4260행 | PASS |
| feature OPS-047 test need 필요 | 위 명령·원출력 4261행 | PASS |
| feature OPS-047 test area assigned | 위 명령·원출력 4262행 | PASS |
| feature OPS-047 pass criteria present | 위 명령·원출력 4263행 | PASS |
| feature OPS-048 name present | 위 명령·원출력 4264행 | PASS |
| feature OPS-048 UI need 비대상 | 위 명령·원출력 4265행 | PASS |
| feature OPS-048 test need 필요 | 위 명령·원출력 4266행 | PASS |
| feature OPS-048 test area assigned | 위 명령·원출력 4267행 | PASS |
| feature OPS-048 pass criteria present | 위 명령·원출력 4268행 | PASS |
| feature OPS-049 name present | 위 명령·원출력 4269행 | PASS |
| feature OPS-049 UI need 비대상 | 위 명령·원출력 4270행 | PASS |
| feature OPS-049 test need 필요 | 위 명령·원출력 4271행 | PASS |
| feature OPS-049 test area assigned | 위 명령·원출력 4272행 | PASS |
| feature OPS-049 pass criteria present | 위 명령·원출력 4273행 | PASS |
| feature OPS-050 name present | 위 명령·원출력 4274행 | PASS |
| feature OPS-050 UI need 비대상 | 위 명령·원출력 4275행 | PASS |
| feature OPS-050 test need 필요 | 위 명령·원출력 4276행 | PASS |
| feature OPS-050 test area assigned | 위 명령·원출력 4277행 | PASS |
| feature OPS-050 pass criteria present | 위 명령·원출력 4278행 | PASS |
| feature OPS-051 name present | 위 명령·원출력 4279행 | PASS |
| feature OPS-051 UI need 비대상 | 위 명령·원출력 4280행 | PASS |
| feature OPS-051 test need 필요 | 위 명령·원출력 4281행 | PASS |
| feature OPS-051 test area assigned | 위 명령·원출력 4282행 | PASS |
| feature OPS-051 pass criteria present | 위 명령·원출력 4283행 | PASS |
| feature OPS-052 name present | 위 명령·원출력 4284행 | PASS |
| feature OPS-052 UI need 비대상 | 위 명령·원출력 4285행 | PASS |
| feature OPS-052 test need 필요 | 위 명령·원출력 4286행 | PASS |
| feature OPS-052 test area assigned | 위 명령·원출력 4287행 | PASS |
| feature OPS-052 pass criteria present | 위 명령·원출력 4288행 | PASS |
| feature OPS-053 name present | 위 명령·원출력 4289행 | PASS |
| feature OPS-053 UI need 비대상 | 위 명령·원출력 4290행 | PASS |
| feature OPS-053 test need 필요 | 위 명령·원출력 4291행 | PASS |
| feature OPS-053 test area assigned | 위 명령·원출력 4292행 | PASS |
| feature OPS-053 pass criteria present | 위 명령·원출력 4293행 | PASS |
| feature OPS-054 name present | 위 명령·원출력 4294행 | PASS |
| feature OPS-054 UI need 비대상 | 위 명령·원출력 4295행 | PASS |
| feature OPS-054 test need 필요 | 위 명령·원출력 4296행 | PASS |
| feature OPS-054 test area assigned | 위 명령·원출력 4297행 | PASS |
| feature OPS-054 pass criteria present | 위 명령·원출력 4298행 | PASS |
| feature OPS-055 name present | 위 명령·원출력 4299행 | PASS |
| feature OPS-055 UI need 비대상 | 위 명령·원출력 4300행 | PASS |
| feature OPS-055 test need 필요 | 위 명령·원출력 4301행 | PASS |
| feature OPS-055 test area assigned | 위 명령·원출력 4302행 | PASS |
| feature OPS-055 pass criteria present | 위 명령·원출력 4303행 | PASS |
| feature OPS-056 name present | 위 명령·원출력 4304행 | PASS |
| feature OPS-056 UI need 비대상 | 위 명령·원출력 4305행 | PASS |
| feature OPS-056 test need 필요 | 위 명령·원출력 4306행 | PASS |
| feature OPS-056 test area assigned | 위 명령·원출력 4307행 | PASS |
| feature OPS-056 pass criteria present | 위 명령·원출력 4308행 | PASS |
| feature OPS-057 name present | 위 명령·원출력 4309행 | PASS |
| feature OPS-057 UI need 비대상 | 위 명령·원출력 4310행 | PASS |
| feature OPS-057 test need 필요 | 위 명령·원출력 4311행 | PASS |
| feature OPS-057 test area assigned | 위 명령·원출력 4312행 | PASS |
| feature OPS-057 pass criteria present | 위 명령·원출력 4313행 | PASS |
| feature OPS-058 name present | 위 명령·원출력 4314행 | PASS |
| feature OPS-058 UI need 비대상 | 위 명령·원출력 4315행 | PASS |
| feature OPS-058 test need 필요 | 위 명령·원출력 4316행 | PASS |
| feature OPS-058 test area assigned | 위 명령·원출력 4317행 | PASS |
| feature OPS-058 pass criteria present | 위 명령·원출력 4318행 | PASS |
| feature OPS-059 name present | 위 명령·원출력 4319행 | PASS |
| feature OPS-059 UI need 비대상 | 위 명령·원출력 4320행 | PASS |
| feature OPS-059 test need 필요 | 위 명령·원출력 4321행 | PASS |
| feature OPS-059 test area assigned | 위 명령·원출력 4322행 | PASS |
| feature OPS-059 pass criteria present | 위 명령·원출력 4323행 | PASS |
| feature OPS-060 name present | 위 명령·원출력 4324행 | PASS |
| feature OPS-060 UI need 비대상 | 위 명령·원출력 4325행 | PASS |
| feature OPS-060 test need 필요 | 위 명령·원출력 4326행 | PASS |
| feature OPS-060 test area assigned | 위 명령·원출력 4327행 | PASS |
| feature OPS-060 pass criteria present | 위 명령·원출력 4328행 | PASS |
| feature OPS-061 name present | 위 명령·원출력 4329행 | PASS |
| feature OPS-061 UI need 비대상 | 위 명령·원출력 4330행 | PASS |
| feature OPS-061 test need 필요 | 위 명령·원출력 4331행 | PASS |
| feature OPS-061 test area assigned | 위 명령·원출력 4332행 | PASS |
| feature OPS-061 pass criteria present | 위 명령·원출력 4333행 | PASS |
| feature OPS-062 name present | 위 명령·원출력 4334행 | PASS |
| feature OPS-062 UI need 비대상 | 위 명령·원출력 4335행 | PASS |
| feature OPS-062 test need 필요 | 위 명령·원출력 4336행 | PASS |
| feature OPS-062 test area assigned | 위 명령·원출력 4337행 | PASS |
| feature OPS-062 pass criteria present | 위 명령·원출력 4338행 | PASS |
| feature OPS-063 name present | 위 명령·원출력 4339행 | PASS |
| feature OPS-063 UI need 비대상 | 위 명령·원출력 4340행 | PASS |
| feature OPS-063 test need 필요 | 위 명령·원출력 4341행 | PASS |
| feature OPS-063 test area assigned | 위 명령·원출력 4342행 | PASS |
| feature OPS-063 pass criteria present | 위 명령·원출력 4343행 | PASS |
| feature OPS-064 name present | 위 명령·원출력 4344행 | PASS |
| feature OPS-064 UI need 비대상 | 위 명령·원출력 4345행 | PASS |
| feature OPS-064 test need 필요 | 위 명령·원출력 4346행 | PASS |
| feature OPS-064 test area assigned | 위 명령·원출력 4347행 | PASS |
| feature OPS-064 pass criteria present | 위 명령·원출력 4348행 | PASS |
| feature OPS-065 name present | 위 명령·원출력 4349행 | PASS |
| feature OPS-065 UI need 비대상 | 위 명령·원출력 4350행 | PASS |
| feature OPS-065 test need 필요 | 위 명령·원출력 4351행 | PASS |
| feature OPS-065 test area assigned | 위 명령·원출력 4352행 | PASS |
| feature OPS-065 pass criteria present | 위 명령·원출력 4353행 | PASS |
| feature OPS-066 name present | 위 명령·원출력 4354행 | PASS |
| feature OPS-066 UI need 비대상 | 위 명령·원출력 4355행 | PASS |
| feature OPS-066 test need 필요 | 위 명령·원출력 4356행 | PASS |
| feature OPS-066 test area assigned | 위 명령·원출력 4357행 | PASS |
| feature OPS-066 pass criteria present | 위 명령·원출력 4358행 | PASS |
| feature OPS-067 name present | 위 명령·원출력 4359행 | PASS |
| feature OPS-067 UI need 비대상 | 위 명령·원출력 4360행 | PASS |
| feature OPS-067 test need 필요 | 위 명령·원출력 4361행 | PASS |
| feature OPS-067 test area assigned | 위 명령·원출력 4362행 | PASS |
| feature OPS-067 pass criteria present | 위 명령·원출력 4363행 | PASS |
| feature OPS-068 name present | 위 명령·원출력 4364행 | PASS |
| feature OPS-068 UI need 비대상 | 위 명령·원출력 4365행 | PASS |
| feature OPS-068 test need 필요 | 위 명령·원출력 4366행 | PASS |
| feature OPS-068 test area assigned | 위 명령·원출력 4367행 | PASS |
| feature OPS-068 pass criteria present | 위 명령·원출력 4368행 | PASS |
| feature OPS-069 name present | 위 명령·원출력 4369행 | PASS |
| feature OPS-069 UI need 비대상 | 위 명령·원출력 4370행 | PASS |
| feature OPS-069 test need 필요 | 위 명령·원출력 4371행 | PASS |
| feature OPS-069 test area assigned | 위 명령·원출력 4372행 | PASS |
| feature OPS-069 pass criteria present | 위 명령·원출력 4373행 | PASS |
| feature OPS-070 name present | 위 명령·원출력 4374행 | PASS |
| feature OPS-070 UI need 비대상 | 위 명령·원출력 4375행 | PASS |
| feature OPS-070 test need 필요 | 위 명령·원출력 4376행 | PASS |
| feature OPS-070 test area assigned | 위 명령·원출력 4377행 | PASS |
| feature OPS-070 pass criteria present | 위 명령·원출력 4378행 | PASS |
| feature OPS-071 name present | 위 명령·원출력 4379행 | PASS |
| feature OPS-071 UI need 비대상 | 위 명령·원출력 4380행 | PASS |
| feature OPS-071 test need 필요 | 위 명령·원출력 4381행 | PASS |
| feature OPS-071 test area assigned | 위 명령·원출력 4382행 | PASS |
| feature OPS-071 pass criteria present | 위 명령·원출력 4383행 | PASS |
| feature OPS-072 name present | 위 명령·원출력 4384행 | PASS |
| feature OPS-072 UI need 비대상 | 위 명령·원출력 4385행 | PASS |
| feature OPS-072 test need 필요 | 위 명령·원출력 4386행 | PASS |
| feature OPS-072 test area assigned | 위 명령·원출력 4387행 | PASS |
| feature OPS-072 pass criteria present | 위 명령·원출력 4388행 | PASS |
| feature OPS-073 name present | 위 명령·원출력 4389행 | PASS |
| feature OPS-073 UI need 비대상 | 위 명령·원출력 4390행 | PASS |
| feature OPS-073 test need 필요 | 위 명령·원출력 4391행 | PASS |
| feature OPS-073 test area assigned | 위 명령·원출력 4392행 | PASS |
| feature OPS-073 pass criteria present | 위 명령·원출력 4393행 | PASS |
| feature OPS-074 name present | 위 명령·원출력 4394행 | PASS |
| feature OPS-074 UI need 비대상 | 위 명령·원출력 4395행 | PASS |
| feature OPS-074 test need 필요 | 위 명령·원출력 4396행 | PASS |
| feature OPS-074 test area assigned | 위 명령·원출력 4397행 | PASS |
| feature OPS-074 pass criteria present | 위 명령·원출력 4398행 | PASS |
| feature OPS-075 name present | 위 명령·원출력 4399행 | PASS |
| feature OPS-075 UI need 비대상 | 위 명령·원출력 4400행 | PASS |
| feature OPS-075 test need 필요 | 위 명령·원출력 4401행 | PASS |
| feature OPS-075 test area assigned | 위 명령·원출력 4402행 | PASS |
| feature OPS-075 pass criteria present | 위 명령·원출력 4403행 | PASS |
| feature OPS-076 name present | 위 명령·원출력 4404행 | PASS |
| feature OPS-076 UI need 비대상 | 위 명령·원출력 4405행 | PASS |
| feature OPS-076 test need 필요 | 위 명령·원출력 4406행 | PASS |
| feature OPS-076 test area assigned | 위 명령·원출력 4407행 | PASS |
| feature OPS-076 pass criteria present | 위 명령·원출력 4408행 | PASS |
| feature OPS-077 name present | 위 명령·원출력 4409행 | PASS |
| feature OPS-077 UI need 비대상 | 위 명령·원출력 4410행 | PASS |
| feature OPS-077 test need 필요 | 위 명령·원출력 4411행 | PASS |
| feature OPS-077 test area assigned | 위 명령·원출력 4412행 | PASS |
| feature OPS-077 pass criteria present | 위 명령·원출력 4413행 | PASS |
| feature OPS-078 name present | 위 명령·원출력 4414행 | PASS |
| feature OPS-078 UI need 비대상 | 위 명령·원출력 4415행 | PASS |
| feature OPS-078 test need 필요 | 위 명령·원출력 4416행 | PASS |
| feature OPS-078 test area assigned | 위 명령·원출력 4417행 | PASS |
| feature OPS-078 pass criteria present | 위 명령·원출력 4418행 | PASS |
| feature OPS-079 name present | 위 명령·원출력 4419행 | PASS |
| feature OPS-079 UI need 비대상 | 위 명령·원출력 4420행 | PASS |
| feature OPS-079 test need 필요 | 위 명령·원출력 4421행 | PASS |
| feature OPS-079 test area assigned | 위 명령·원출력 4422행 | PASS |
| feature OPS-079 pass criteria present | 위 명령·원출력 4423행 | PASS |
| feature OPS-080 name present | 위 명령·원출력 4424행 | PASS |
| feature OPS-080 UI need 비대상 | 위 명령·원출력 4425행 | PASS |
| feature OPS-080 test need 필요 | 위 명령·원출력 4426행 | PASS |
| feature OPS-080 test area assigned | 위 명령·원출력 4427행 | PASS |
| feature OPS-080 pass criteria present | 위 명령·원출력 4428행 | PASS |
| feature OPS-081 name present | 위 명령·원출력 4429행 | PASS |
| feature OPS-081 UI need 비대상 | 위 명령·원출력 4430행 | PASS |
| feature OPS-081 test need 필요 | 위 명령·원출력 4431행 | PASS |
| feature OPS-081 test area assigned | 위 명령·원출력 4432행 | PASS |
| feature OPS-081 pass criteria present | 위 명령·원출력 4433행 | PASS |
| feature OPS-082 name present | 위 명령·원출력 4434행 | PASS |
| feature OPS-082 UI need 비대상 | 위 명령·원출력 4435행 | PASS |
| feature OPS-082 test need 필요 | 위 명령·원출력 4436행 | PASS |
| feature OPS-082 test area assigned | 위 명령·원출력 4437행 | PASS |
| feature OPS-082 pass criteria present | 위 명령·원출력 4438행 | PASS |
| feature OPS-083 name present | 위 명령·원출력 4439행 | PASS |
| feature OPS-083 UI need 비대상 | 위 명령·원출력 4440행 | PASS |
| feature OPS-083 test need 필요 | 위 명령·원출력 4441행 | PASS |
| feature OPS-083 test area assigned | 위 명령·원출력 4442행 | PASS |
| feature OPS-083 pass criteria present | 위 명령·원출력 4443행 | PASS |
| feature OPS-084 name present | 위 명령·원출력 4444행 | PASS |
| feature OPS-084 UI need 비대상 | 위 명령·원출력 4445행 | PASS |
| feature OPS-084 test need 필요 | 위 명령·원출력 4446행 | PASS |
| feature OPS-084 test area assigned | 위 명령·원출력 4447행 | PASS |
| feature OPS-084 pass criteria present | 위 명령·원출력 4448행 | PASS |
| feature OPS-085 name present | 위 명령·원출력 4449행 | PASS |
| feature OPS-085 UI need 비대상 | 위 명령·원출력 4450행 | PASS |
| feature OPS-085 test need 필요 | 위 명령·원출력 4451행 | PASS |
| feature OPS-085 test area assigned | 위 명령·원출력 4452행 | PASS |
| feature OPS-085 pass criteria present | 위 명령·원출력 4453행 | PASS |
| feature OPS-086 name present | 위 명령·원출력 4454행 | PASS |
| feature OPS-086 UI need 비대상 | 위 명령·원출력 4455행 | PASS |
| feature OPS-086 test need 필요 | 위 명령·원출력 4456행 | PASS |
| feature OPS-086 test area assigned | 위 명령·원출력 4457행 | PASS |
| feature OPS-086 pass criteria present | 위 명령·원출력 4458행 | PASS |
| feature OPS-087 name present | 위 명령·원출력 4459행 | PASS |
| feature OPS-087 UI need 비대상 | 위 명령·원출력 4460행 | PASS |
| feature OPS-087 test need 필요 | 위 명령·원출력 4461행 | PASS |
| feature OPS-087 test area assigned | 위 명령·원출력 4462행 | PASS |
| feature OPS-087 pass criteria present | 위 명령·원출력 4463행 | PASS |
| feature OPS-088 name present | 위 명령·원출력 4464행 | PASS |
| feature OPS-088 UI need 비대상 | 위 명령·원출력 4465행 | PASS |
| feature OPS-088 test need 필요 | 위 명령·원출력 4466행 | PASS |
| feature OPS-088 test area assigned | 위 명령·원출력 4467행 | PASS |
| feature OPS-088 pass criteria present | 위 명령·원출력 4468행 | PASS |
| feature OPS-089 name present | 위 명령·원출력 4469행 | PASS |
| feature OPS-089 UI need 비대상 | 위 명령·원출력 4470행 | PASS |
| feature OPS-089 test need 필요 | 위 명령·원출력 4471행 | PASS |
| feature OPS-089 test area assigned | 위 명령·원출력 4472행 | PASS |
| feature OPS-089 pass criteria present | 위 명령·원출력 4473행 | PASS |
| feature OPS-090 name present | 위 명령·원출력 4474행 | PASS |
| feature OPS-090 UI need 비대상 | 위 명령·원출력 4475행 | PASS |
| feature OPS-090 test need 필요 | 위 명령·원출력 4476행 | PASS |
| feature OPS-090 test area assigned | 위 명령·원출력 4477행 | PASS |
| feature OPS-090 pass criteria present | 위 명령·원출력 4478행 | PASS |
| feature OPS-091 name present | 위 명령·원출력 4479행 | PASS |
| feature OPS-091 UI need 비대상 | 위 명령·원출력 4480행 | PASS |
| feature OPS-091 test need 필요 | 위 명령·원출력 4481행 | PASS |
| feature OPS-091 test area assigned | 위 명령·원출력 4482행 | PASS |
| feature OPS-091 pass criteria present | 위 명령·원출력 4483행 | PASS |
| feature OPS-092 name present | 위 명령·원출력 4484행 | PASS |
| feature OPS-092 UI need 비대상 | 위 명령·원출력 4485행 | PASS |
| feature OPS-092 test need 필요 | 위 명령·원출력 4486행 | PASS |
| feature OPS-092 test area assigned | 위 명령·원출력 4487행 | PASS |
| feature OPS-092 pass criteria present | 위 명령·원출력 4488행 | PASS |
| feature OPS-093 name present | 위 명령·원출력 4489행 | PASS |
| feature OPS-093 UI need 비대상 | 위 명령·원출력 4490행 | PASS |
| feature OPS-093 test need 필요 | 위 명령·원출력 4491행 | PASS |
| feature OPS-093 test area assigned | 위 명령·원출력 4492행 | PASS |
| feature OPS-093 pass criteria present | 위 명령·원출력 4493행 | PASS |
| feature OPS-094 name present | 위 명령·원출력 4494행 | PASS |
| feature OPS-094 UI need 비대상 | 위 명령·원출력 4495행 | PASS |
| feature OPS-094 test need 필요 | 위 명령·원출력 4496행 | PASS |
| feature OPS-094 test area assigned | 위 명령·원출력 4497행 | PASS |
| feature OPS-094 pass criteria present | 위 명령·원출력 4498행 | PASS |
| feature OPS-095 name present | 위 명령·원출력 4499행 | PASS |
| feature OPS-095 UI need 비대상 | 위 명령·원출력 4500행 | PASS |
| feature OPS-095 test need 필요 | 위 명령·원출력 4501행 | PASS |
| feature OPS-095 test area assigned | 위 명령·원출력 4502행 | PASS |
| feature OPS-095 pass criteria present | 위 명령·원출력 4503행 | PASS |
| feature OPS-096 name present | 위 명령·원출력 4504행 | PASS |
| feature OPS-096 UI need 비대상 | 위 명령·원출력 4505행 | PASS |
| feature OPS-096 test need 필요 | 위 명령·원출력 4506행 | PASS |
| feature OPS-096 test area assigned | 위 명령·원출력 4507행 | PASS |
| feature OPS-096 pass criteria present | 위 명령·원출력 4508행 | PASS |
| feature OPS-097 name present | 위 명령·원출력 4509행 | PASS |
| feature OPS-097 UI need 비대상 | 위 명령·원출력 4510행 | PASS |
| feature OPS-097 test need 필요 | 위 명령·원출력 4511행 | PASS |
| feature OPS-097 test area assigned | 위 명령·원출력 4512행 | PASS |
| feature OPS-097 pass criteria present | 위 명령·원출력 4513행 | PASS |
| feature OPS-098 name present | 위 명령·원출력 4514행 | PASS |
| feature OPS-098 UI need 비대상 | 위 명령·원출력 4515행 | PASS |
| feature OPS-098 test need 필요 | 위 명령·원출력 4516행 | PASS |
| feature OPS-098 test area assigned | 위 명령·원출력 4517행 | PASS |
| feature OPS-098 pass criteria present | 위 명령·원출력 4518행 | PASS |
| feature OPS-099 name present | 위 명령·원출력 4519행 | PASS |
| feature OPS-099 UI need 비대상 | 위 명령·원출력 4520행 | PASS |
| feature OPS-099 test need 필요 | 위 명령·원출력 4521행 | PASS |
| feature OPS-099 test area assigned | 위 명령·원출력 4522행 | PASS |
| feature OPS-099 pass criteria present | 위 명령·원출력 4523행 | PASS |
| feature OPS-100 name present | 위 명령·원출력 4524행 | PASS |
| feature OPS-100 UI need 비대상 | 위 명령·원출력 4525행 | PASS |
| feature OPS-100 test need 필요 | 위 명령·원출력 4526행 | PASS |
| feature OPS-100 test area assigned | 위 명령·원출력 4527행 | PASS |
| feature OPS-100 pass criteria present | 위 명령·원출력 4528행 | PASS |
| feature OPS-101 name present | 위 명령·원출력 4529행 | PASS |
| feature OPS-101 UI need 비대상 | 위 명령·원출력 4530행 | PASS |
| feature OPS-101 test need 필요 | 위 명령·원출력 4531행 | PASS |
| feature OPS-101 test area assigned | 위 명령·원출력 4532행 | PASS |
| feature OPS-101 pass criteria present | 위 명령·원출력 4533행 | PASS |
| feature OPS-102 name present | 위 명령·원출력 4534행 | PASS |
| feature OPS-102 UI need 비대상 | 위 명령·원출력 4535행 | PASS |
| feature OPS-102 test need 필요 | 위 명령·원출력 4536행 | PASS |
| feature OPS-102 test area assigned | 위 명령·원출력 4537행 | PASS |
| feature OPS-102 pass criteria present | 위 명령·원출력 4538행 | PASS |
| feature OPS-103 name present | 위 명령·원출력 4539행 | PASS |
| feature OPS-103 UI need 비대상 | 위 명령·원출력 4540행 | PASS |
| feature OPS-103 test need 필요 | 위 명령·원출력 4541행 | PASS |
| feature OPS-103 test area assigned | 위 명령·원출력 4542행 | PASS |
| feature OPS-103 pass criteria present | 위 명령·원출력 4543행 | PASS |
| feature OPS-104 name present | 위 명령·원출력 4544행 | PASS |
| feature OPS-104 UI need 비대상 | 위 명령·원출력 4545행 | PASS |
| feature OPS-104 test need 필요 | 위 명령·원출력 4546행 | PASS |
| feature OPS-104 test area assigned | 위 명령·원출력 4547행 | PASS |
| feature OPS-104 pass criteria present | 위 명령·원출력 4548행 | PASS |
| feature OPS-105 name present | 위 명령·원출력 4549행 | PASS |
| feature OPS-105 UI need 비대상 | 위 명령·원출력 4550행 | PASS |
| feature OPS-105 test need 필요 | 위 명령·원출력 4551행 | PASS |
| feature OPS-105 test area assigned | 위 명령·원출력 4552행 | PASS |
| feature OPS-105 pass criteria present | 위 명령·원출력 4553행 | PASS |
| feature OPS-106 name present | 위 명령·원출력 4554행 | PASS |
| feature OPS-106 UI need 비대상 | 위 명령·원출력 4555행 | PASS |
| feature OPS-106 test need 필요 | 위 명령·원출력 4556행 | PASS |
| feature OPS-106 test area assigned | 위 명령·원출력 4557행 | PASS |
| feature OPS-106 pass criteria present | 위 명령·원출력 4558행 | PASS |
| feature OPS-107 name present | 위 명령·원출력 4559행 | PASS |
| feature OPS-107 UI need 비대상 | 위 명령·원출력 4560행 | PASS |
| feature OPS-107 test need 필요 | 위 명령·원출력 4561행 | PASS |
| feature OPS-107 test area assigned | 위 명령·원출력 4562행 | PASS |
| feature OPS-107 pass criteria present | 위 명령·원출력 4563행 | PASS |
| feature OPS-108 name present | 위 명령·원출력 4564행 | PASS |
| feature OPS-108 UI need 비대상 | 위 명령·원출력 4565행 | PASS |
| feature OPS-108 test need 필요 | 위 명령·원출력 4566행 | PASS |
| feature OPS-108 test area assigned | 위 명령·원출력 4567행 | PASS |
| feature OPS-108 pass criteria present | 위 명령·원출력 4568행 | PASS |
| feature OPS-109 name present | 위 명령·원출력 4569행 | PASS |
| feature OPS-109 UI need 비대상 | 위 명령·원출력 4570행 | PASS |
| feature OPS-109 test need 필요 | 위 명령·원출력 4571행 | PASS |
| feature OPS-109 test area assigned | 위 명령·원출력 4572행 | PASS |
| feature OPS-109 pass criteria present | 위 명령·원출력 4573행 | PASS |
| feature OPS-110 name present | 위 명령·원출력 4574행 | PASS |
| feature OPS-110 UI need 비대상 | 위 명령·원출력 4575행 | PASS |
| feature OPS-110 test need 필요 | 위 명령·원출력 4576행 | PASS |
| feature OPS-110 test area assigned | 위 명령·원출력 4577행 | PASS |
| feature OPS-110 pass criteria present | 위 명령·원출력 4578행 | PASS |
| feature OPS-111 name present | 위 명령·원출력 4579행 | PASS |
| feature OPS-111 UI need 비대상 | 위 명령·원출력 4580행 | PASS |
| feature OPS-111 test need 필요 | 위 명령·원출력 4581행 | PASS |
| feature OPS-111 test area assigned | 위 명령·원출력 4582행 | PASS |
| feature OPS-111 pass criteria present | 위 명령·원출력 4583행 | PASS |
| feature OPS-112 name present | 위 명령·원출력 4584행 | PASS |
| feature OPS-112 UI need 비대상 | 위 명령·원출력 4585행 | PASS |
| feature OPS-112 test need 필요 | 위 명령·원출력 4586행 | PASS |
| feature OPS-112 test area assigned | 위 명령·원출력 4587행 | PASS |
| feature OPS-112 pass criteria present | 위 명령·원출력 4588행 | PASS |
| feature OPS-113 name present | 위 명령·원출력 4589행 | PASS |
| feature OPS-113 UI need 비대상 | 위 명령·원출력 4590행 | PASS |
| feature OPS-113 test need 필요 | 위 명령·원출력 4591행 | PASS |
| feature OPS-113 test area assigned | 위 명령·원출력 4592행 | PASS |
| feature OPS-113 pass criteria present | 위 명령·원출력 4593행 | PASS |
| feature OPS-114 name present | 위 명령·원출력 4594행 | PASS |
| feature OPS-114 UI need 비대상 | 위 명령·원출력 4595행 | PASS |
| feature OPS-114 test need 필요 | 위 명령·원출력 4596행 | PASS |
| feature OPS-114 test area assigned | 위 명령·원출력 4597행 | PASS |
| feature OPS-114 pass criteria present | 위 명령·원출력 4598행 | PASS |
| feature OPS-115 name present | 위 명령·원출력 4599행 | PASS |
| feature OPS-115 UI need 비대상 | 위 명령·원출력 4600행 | PASS |
| feature OPS-115 test need 필요 | 위 명령·원출력 4601행 | PASS |
| feature OPS-115 test area assigned | 위 명령·원출력 4602행 | PASS |
| feature OPS-115 pass criteria present | 위 명령·원출력 4603행 | PASS |
| feature OPS-116 name present | 위 명령·원출력 4604행 | PASS |
| feature OPS-116 UI need 비대상 | 위 명령·원출력 4605행 | PASS |
| feature OPS-116 test need 필요 | 위 명령·원출력 4606행 | PASS |
| feature OPS-116 test area assigned | 위 명령·원출력 4607행 | PASS |
| feature OPS-116 pass criteria present | 위 명령·원출력 4608행 | PASS |
| feature OPS-117 name present | 위 명령·원출력 4609행 | PASS |
| feature OPS-117 UI need 비대상 | 위 명령·원출력 4610행 | PASS |
| feature OPS-117 test need 필요 | 위 명령·원출력 4611행 | PASS |
| feature OPS-117 test area assigned | 위 명령·원출력 4612행 | PASS |
| feature OPS-117 pass criteria present | 위 명령·원출력 4613행 | PASS |
| feature OPS-118 name present | 위 명령·원출력 4614행 | PASS |
| feature OPS-118 UI need 비대상 | 위 명령·원출력 4615행 | PASS |
| feature OPS-118 test need 필요 | 위 명령·원출력 4616행 | PASS |
| feature OPS-118 test area assigned | 위 명령·원출력 4617행 | PASS |
| feature OPS-118 pass criteria present | 위 명령·원출력 4618행 | PASS |
| feature OPS-119 name present | 위 명령·원출력 4619행 | PASS |
| feature OPS-119 UI need 비대상 | 위 명령·원출력 4620행 | PASS |
| feature OPS-119 test need 필요 | 위 명령·원출력 4621행 | PASS |
| feature OPS-119 test area assigned | 위 명령·원출력 4622행 | PASS |
| feature OPS-119 pass criteria present | 위 명령·원출력 4623행 | PASS |
| feature OPS-120 name present | 위 명령·원출력 4624행 | PASS |
| feature OPS-120 UI need 비대상 | 위 명령·원출력 4625행 | PASS |
| feature OPS-120 test need 필요 | 위 명령·원출력 4626행 | PASS |
| feature OPS-120 test area assigned | 위 명령·원출력 4627행 | PASS |
| feature OPS-120 pass criteria present | 위 명령·원출력 4628행 | PASS |
| feature OPS-121 name present | 위 명령·원출력 4629행 | PASS |
| feature OPS-121 UI need 비대상 | 위 명령·원출력 4630행 | PASS |
| feature OPS-121 test need 필요 | 위 명령·원출력 4631행 | PASS |
| feature OPS-121 test area assigned | 위 명령·원출력 4632행 | PASS |
| feature OPS-121 pass criteria present | 위 명령·원출력 4633행 | PASS |
| feature OPS-122 name present | 위 명령·원출력 4634행 | PASS |
| feature OPS-122 UI need 비대상 | 위 명령·원출력 4635행 | PASS |
| feature OPS-122 test need 필요 | 위 명령·원출력 4636행 | PASS |
| feature OPS-122 test area assigned | 위 명령·원출력 4637행 | PASS |
| feature OPS-122 pass criteria present | 위 명령·원출력 4638행 | PASS |
| feature OPS-123 name present | 위 명령·원출력 4639행 | PASS |
| feature OPS-123 UI need 비대상 | 위 명령·원출력 4640행 | PASS |
| feature OPS-123 test need 필요 | 위 명령·원출력 4641행 | PASS |
| feature OPS-123 test area assigned | 위 명령·원출력 4642행 | PASS |
| feature OPS-123 pass criteria present | 위 명령·원출력 4643행 | PASS |
| feature OPS-124 name present | 위 명령·원출력 4644행 | PASS |
| feature OPS-124 UI need 비대상 | 위 명령·원출력 4645행 | PASS |
| feature OPS-124 test need 필요 | 위 명령·원출력 4646행 | PASS |
| feature OPS-124 test area assigned | 위 명령·원출력 4647행 | PASS |
| feature OPS-124 pass criteria present | 위 명령·원출력 4648행 | PASS |
| feature OPS-125 name present | 위 명령·원출력 4649행 | PASS |
| feature OPS-125 UI need 비대상 | 위 명령·원출력 4650행 | PASS |
| feature OPS-125 test need 필요 | 위 명령·원출력 4651행 | PASS |
| feature OPS-125 test area assigned | 위 명령·원출력 4652행 | PASS |
| feature OPS-125 pass criteria present | 위 명령·원출력 4653행 | PASS |
| feature OPS-126 name present | 위 명령·원출력 4654행 | PASS |
| feature OPS-126 UI need 비대상 | 위 명령·원출력 4655행 | PASS |
| feature OPS-126 test need 필요 | 위 명령·원출력 4656행 | PASS |
| feature OPS-126 test area assigned | 위 명령·원출력 4657행 | PASS |
| feature OPS-126 pass criteria present | 위 명령·원출력 4658행 | PASS |
| feature OPS-127 name present | 위 명령·원출력 4659행 | PASS |
| feature OPS-127 UI need 비대상 | 위 명령·원출력 4660행 | PASS |
| feature OPS-127 test need 필요 | 위 명령·원출력 4661행 | PASS |
| feature OPS-127 test area assigned | 위 명령·원출력 4662행 | PASS |
| feature OPS-127 pass criteria present | 위 명령·원출력 4663행 | PASS |
| feature OPS-128 name present | 위 명령·원출력 4664행 | PASS |
| feature OPS-128 UI need 비대상 | 위 명령·원출력 4665행 | PASS |
| feature OPS-128 test need 필요 | 위 명령·원출력 4666행 | PASS |
| feature OPS-128 test area assigned | 위 명령·원출력 4667행 | PASS |
| feature OPS-128 pass criteria present | 위 명령·원출력 4668행 | PASS |
| feature OPS-129 name present | 위 명령·원출력 4669행 | PASS |
| feature OPS-129 UI need 비대상 | 위 명령·원출력 4670행 | PASS |
| feature OPS-129 test need 필요 | 위 명령·원출력 4671행 | PASS |
| feature OPS-129 test area assigned | 위 명령·원출력 4672행 | PASS |
| feature OPS-129 pass criteria present | 위 명령·원출력 4673행 | PASS |
| feature OPS-130 name present | 위 명령·원출력 4674행 | PASS |
| feature OPS-130 UI need 비대상 | 위 명령·원출력 4675행 | PASS |
| feature OPS-130 test need 필요 | 위 명령·원출력 4676행 | PASS |
| feature OPS-130 test area assigned | 위 명령·원출력 4677행 | PASS |
| feature OPS-130 pass criteria present | 위 명령·원출력 4678행 | PASS |
| feature OPS-131 name present | 위 명령·원출력 4679행 | PASS |
| feature OPS-131 UI need 비대상 | 위 명령·원출력 4680행 | PASS |
| feature OPS-131 test need 필요 | 위 명령·원출력 4681행 | PASS |
| feature OPS-131 test area assigned | 위 명령·원출력 4682행 | PASS |
| feature OPS-131 pass criteria present | 위 명령·원출력 4683행 | PASS |
| feature OPS-132 name present | 위 명령·원출력 4684행 | PASS |
| feature OPS-132 UI need 비대상 | 위 명령·원출력 4685행 | PASS |
| feature OPS-132 test need 필요 | 위 명령·원출력 4686행 | PASS |
| feature OPS-132 test area assigned | 위 명령·원출력 4687행 | PASS |
| feature OPS-132 pass criteria present | 위 명령·원출력 4688행 | PASS |
| feature OPS-133 name present | 위 명령·원출력 4689행 | PASS |
| feature OPS-133 UI need 비대상 | 위 명령·원출력 4690행 | PASS |
| feature OPS-133 test need 필요 | 위 명령·원출력 4691행 | PASS |
| feature OPS-133 test area assigned | 위 명령·원출력 4692행 | PASS |
| feature OPS-133 pass criteria present | 위 명령·원출력 4693행 | PASS |
| feature OPS-134 name present | 위 명령·원출력 4694행 | PASS |
| feature OPS-134 UI need 비대상 | 위 명령·원출력 4695행 | PASS |
| feature OPS-134 test need 필요 | 위 명령·원출력 4696행 | PASS |
| feature OPS-134 test area assigned | 위 명령·원출력 4697행 | PASS |
| feature OPS-134 pass criteria present | 위 명령·원출력 4698행 | PASS |
| feature OPS-135 name present | 위 명령·원출력 4699행 | PASS |
| feature OPS-135 UI need 비대상 | 위 명령·원출력 4700행 | PASS |
| feature OPS-135 test need 필요 | 위 명령·원출력 4701행 | PASS |
| feature OPS-135 test area assigned | 위 명령·원출력 4702행 | PASS |
| feature OPS-135 pass criteria present | 위 명령·원출력 4703행 | PASS |
| feature OPS-136 name present | 위 명령·원출력 4704행 | PASS |
| feature OPS-136 UI need 비대상 | 위 명령·원출력 4705행 | PASS |
| feature OPS-136 test need 필요 | 위 명령·원출력 4706행 | PASS |
| feature OPS-136 test area assigned | 위 명령·원출력 4707행 | PASS |
| feature OPS-136 pass criteria present | 위 명령·원출력 4708행 | PASS |
| feature OPS-137 name present | 위 명령·원출력 4709행 | PASS |
| feature OPS-137 UI need 비대상 | 위 명령·원출력 4710행 | PASS |
| feature OPS-137 test need 필요 | 위 명령·원출력 4711행 | PASS |
| feature OPS-137 test area assigned | 위 명령·원출력 4712행 | PASS |
| feature OPS-137 pass criteria present | 위 명령·원출력 4713행 | PASS |
| feature OPS-138 name present | 위 명령·원출력 4714행 | PASS |
| feature OPS-138 UI need 비대상 | 위 명령·원출력 4715행 | PASS |
| feature OPS-138 test need 필요 | 위 명령·원출력 4716행 | PASS |
| feature OPS-138 test area assigned | 위 명령·원출력 4717행 | PASS |
| feature OPS-138 pass criteria present | 위 명령·원출력 4718행 | PASS |
| feature OPS-139 name present | 위 명령·원출력 4719행 | PASS |
| feature OPS-139 UI need 비대상 | 위 명령·원출력 4720행 | PASS |
| feature OPS-139 test need 필요 | 위 명령·원출력 4721행 | PASS |
| feature OPS-139 test area assigned | 위 명령·원출력 4722행 | PASS |
| feature OPS-139 pass criteria present | 위 명령·원출력 4723행 | PASS |
| feature OPS-140 name present | 위 명령·원출력 4724행 | PASS |
| feature OPS-140 UI need 비대상 | 위 명령·원출력 4725행 | PASS |
| feature OPS-140 test need 필요 | 위 명령·원출력 4726행 | PASS |
| feature OPS-140 test area assigned | 위 명령·원출력 4727행 | PASS |
| feature OPS-140 pass criteria present | 위 명령·원출력 4728행 | PASS |
| feature OPS-141 name present | 위 명령·원출력 4729행 | PASS |
| feature OPS-141 UI need 비대상 | 위 명령·원출력 4730행 | PASS |
| feature OPS-141 test need 필요 | 위 명령·원출력 4731행 | PASS |
| feature OPS-141 test area assigned | 위 명령·원출력 4732행 | PASS |
| feature OPS-141 pass criteria present | 위 명령·원출력 4733행 | PASS |
| feature OPS-142 name present | 위 명령·원출력 4734행 | PASS |
| feature OPS-142 UI need 비대상 | 위 명령·원출력 4735행 | PASS |
| feature OPS-142 test need 필요 | 위 명령·원출력 4736행 | PASS |
| feature OPS-142 test area assigned | 위 명령·원출력 4737행 | PASS |
| feature OPS-142 pass criteria present | 위 명령·원출력 4738행 | PASS |
| feature OPS-143 name present | 위 명령·원출력 4739행 | PASS |
| feature OPS-143 UI need 비대상 | 위 명령·원출력 4740행 | PASS |
| feature OPS-143 test need 필요 | 위 명령·원출력 4741행 | PASS |
| feature OPS-143 test area assigned | 위 명령·원출력 4742행 | PASS |
| feature OPS-143 pass criteria present | 위 명령·원출력 4743행 | PASS |
| feature OPS-144 name present | 위 명령·원출력 4744행 | PASS |
| feature OPS-144 UI need 비대상 | 위 명령·원출력 4745행 | PASS |
| feature OPS-144 test need 필요 | 위 명령·원출력 4746행 | PASS |
| feature OPS-144 test area assigned | 위 명령·원출력 4747행 | PASS |
| feature OPS-144 pass criteria present | 위 명령·원출력 4748행 | PASS |
| feature OPS-145 name present | 위 명령·원출력 4749행 | PASS |
| feature OPS-145 UI need 비대상 | 위 명령·원출력 4750행 | PASS |
| feature OPS-145 test need 필요 | 위 명령·원출력 4751행 | PASS |
| feature OPS-145 test area assigned | 위 명령·원출력 4752행 | PASS |
| feature OPS-145 pass criteria present | 위 명령·원출력 4753행 | PASS |
| feature OPS-146 name present | 위 명령·원출력 4754행 | PASS |
| feature OPS-146 UI need 비대상 | 위 명령·원출력 4755행 | PASS |
| feature OPS-146 test need 필요 | 위 명령·원출력 4756행 | PASS |
| feature OPS-146 test area assigned | 위 명령·원출력 4757행 | PASS |
| feature OPS-146 pass criteria present | 위 명령·원출력 4758행 | PASS |
| feature OPS-147 name present | 위 명령·원출력 4759행 | PASS |
| feature OPS-147 UI need 비대상 | 위 명령·원출력 4760행 | PASS |
| feature OPS-147 test need 필요 | 위 명령·원출력 4761행 | PASS |
| feature OPS-147 test area assigned | 위 명령·원출력 4762행 | PASS |
| feature OPS-147 pass criteria present | 위 명령·원출력 4763행 | PASS |
| feature OPS-148 name present | 위 명령·원출력 4764행 | PASS |
| feature OPS-148 UI need 비대상 | 위 명령·원출력 4765행 | PASS |
| feature OPS-148 test need 필요 | 위 명령·원출력 4766행 | PASS |
| feature OPS-148 test area assigned | 위 명령·원출력 4767행 | PASS |
| feature OPS-148 pass criteria present | 위 명령·원출력 4768행 | PASS |
| feature OPS-149 name present | 위 명령·원출력 4769행 | PASS |
| feature OPS-149 UI need 비대상 | 위 명령·원출력 4770행 | PASS |
| feature OPS-149 test need 필요 | 위 명령·원출력 4771행 | PASS |
| feature OPS-149 test area assigned | 위 명령·원출력 4772행 | PASS |
| feature OPS-149 pass criteria present | 위 명령·원출력 4773행 | PASS |
| feature OPS-150 name present | 위 명령·원출력 4774행 | PASS |
| feature OPS-150 UI need 비대상 | 위 명령·원출력 4775행 | PASS |
| feature OPS-150 test need 필요 | 위 명령·원출력 4776행 | PASS |
| feature OPS-150 test area assigned | 위 명령·원출력 4777행 | PASS |
| feature OPS-150 pass criteria present | 위 명령·원출력 4778행 | PASS |
| feature OPS-151 name present | 위 명령·원출력 4779행 | PASS |
| feature OPS-151 UI need 비대상 | 위 명령·원출력 4780행 | PASS |
| feature OPS-151 test need 필요 | 위 명령·원출력 4781행 | PASS |
| feature OPS-151 test area assigned | 위 명령·원출력 4782행 | PASS |
| feature OPS-151 pass criteria present | 위 명령·원출력 4783행 | PASS |
| feature OPS-152 name present | 위 명령·원출력 4784행 | PASS |
| feature OPS-152 UI need 비대상 | 위 명령·원출력 4785행 | PASS |
| feature OPS-152 test need 필요 | 위 명령·원출력 4786행 | PASS |
| feature OPS-152 test area assigned | 위 명령·원출력 4787행 | PASS |
| feature OPS-152 pass criteria present | 위 명령·원출력 4788행 | PASS |
| feature OPS-153 name present | 위 명령·원출력 4789행 | PASS |
| feature OPS-153 UI need 비대상 | 위 명령·원출력 4790행 | PASS |
| feature OPS-153 test need 필요 | 위 명령·원출력 4791행 | PASS |
| feature OPS-153 test area assigned | 위 명령·원출력 4792행 | PASS |
| feature OPS-153 pass criteria present | 위 명령·원출력 4793행 | PASS |
| feature OPS-154 name present | 위 명령·원출력 4794행 | PASS |
| feature OPS-154 UI need 비대상 | 위 명령·원출력 4795행 | PASS |
| feature OPS-154 test need 필요 | 위 명령·원출력 4796행 | PASS |
| feature OPS-154 test area assigned | 위 명령·원출력 4797행 | PASS |
| feature OPS-154 pass criteria present | 위 명령·원출력 4798행 | PASS |
| feature OPS-155 name present | 위 명령·원출력 4799행 | PASS |
| feature OPS-155 UI need 비대상 | 위 명령·원출력 4800행 | PASS |
| feature OPS-155 test need 필요 | 위 명령·원출력 4801행 | PASS |
| feature OPS-155 test area assigned | 위 명령·원출력 4802행 | PASS |
| feature OPS-155 pass criteria present | 위 명령·원출력 4803행 | PASS |
| feature OPS-156 name present | 위 명령·원출력 4804행 | PASS |
| feature OPS-156 UI need 비대상 | 위 명령·원출력 4805행 | PASS |
| feature OPS-156 test need 필요 | 위 명령·원출력 4806행 | PASS |
| feature OPS-156 test area assigned | 위 명령·원출력 4807행 | PASS |
| feature OPS-156 pass criteria present | 위 명령·원출력 4808행 | PASS |
| feature OPS-157 name present | 위 명령·원출력 4809행 | PASS |
| feature OPS-157 UI need 비대상 | 위 명령·원출력 4810행 | PASS |
| feature OPS-157 test need 필요 | 위 명령·원출력 4811행 | PASS |
| feature OPS-157 test area assigned | 위 명령·원출력 4812행 | PASS |
| feature OPS-157 pass criteria present | 위 명령·원출력 4813행 | PASS |
| feature OPS-158 name present | 위 명령·원출력 4814행 | PASS |
| feature OPS-158 UI need 비대상 | 위 명령·원출력 4815행 | PASS |
| feature OPS-158 test need 필요 | 위 명령·원출력 4816행 | PASS |
| feature OPS-158 test area assigned | 위 명령·원출력 4817행 | PASS |
| feature OPS-158 pass criteria present | 위 명령·원출력 4818행 | PASS |
| feature OPS-159 name present | 위 명령·원출력 4819행 | PASS |
| feature OPS-159 UI need 비대상 | 위 명령·원출력 4820행 | PASS |
| feature OPS-159 test need 필요 | 위 명령·원출력 4821행 | PASS |
| feature OPS-159 test area assigned | 위 명령·원출력 4822행 | PASS |
| feature OPS-159 pass criteria present | 위 명령·원출력 4823행 | PASS |
| feature OPS-160 name present | 위 명령·원출력 4824행 | PASS |
| feature OPS-160 UI need 비대상 | 위 명령·원출력 4825행 | PASS |
| feature OPS-160 test need 필요 | 위 명령·원출력 4826행 | PASS |
| feature OPS-160 test area assigned | 위 명령·원출력 4827행 | PASS |
| feature OPS-160 pass criteria present | 위 명령·원출력 4828행 | PASS |
| feature OPS-161 name present | 위 명령·원출력 4829행 | PASS |
| feature OPS-161 UI need 비대상 | 위 명령·원출력 4830행 | PASS |
| feature OPS-161 test need 필요 | 위 명령·원출력 4831행 | PASS |
| feature OPS-161 test area assigned | 위 명령·원출력 4832행 | PASS |
| feature OPS-161 pass criteria present | 위 명령·원출력 4833행 | PASS |
| feature OPS-162 name present | 위 명령·원출력 4834행 | PASS |
| feature OPS-162 UI need 비대상 | 위 명령·원출력 4835행 | PASS |
| feature OPS-162 test need 필요 | 위 명령·원출력 4836행 | PASS |
| feature OPS-162 test area assigned | 위 명령·원출력 4837행 | PASS |
| feature OPS-162 pass criteria present | 위 명령·원출력 4838행 | PASS |
| feature OPS-163 name present | 위 명령·원출력 4839행 | PASS |
| feature OPS-163 UI need 비대상 | 위 명령·원출력 4840행 | PASS |
| feature OPS-163 test need 필요 | 위 명령·원출력 4841행 | PASS |
| feature OPS-163 test area assigned | 위 명령·원출력 4842행 | PASS |
| feature OPS-163 pass criteria present | 위 명령·원출력 4843행 | PASS |
| feature OPS-164 name present | 위 명령·원출력 4844행 | PASS |
| feature OPS-164 UI need 비대상 | 위 명령·원출력 4845행 | PASS |
| feature OPS-164 test need 필요 | 위 명령·원출력 4846행 | PASS |
| feature OPS-164 test area assigned | 위 명령·원출력 4847행 | PASS |
| feature OPS-164 pass criteria present | 위 명령·원출력 4848행 | PASS |
| feature OPS-165 name present | 위 명령·원출력 4849행 | PASS |
| feature OPS-165 UI need 비대상 | 위 명령·원출력 4850행 | PASS |
| feature OPS-165 test need 필요 | 위 명령·원출력 4851행 | PASS |
| feature OPS-165 test area assigned | 위 명령·원출력 4852행 | PASS |
| feature OPS-165 pass criteria present | 위 명령·원출력 4853행 | PASS |
| feature OPS-166 name present | 위 명령·원출력 4854행 | PASS |
| feature OPS-166 UI need 비대상 | 위 명령·원출력 4855행 | PASS |
| feature OPS-166 test need 필요 | 위 명령·원출력 4856행 | PASS |
| feature OPS-166 test area assigned | 위 명령·원출력 4857행 | PASS |
| feature OPS-166 pass criteria present | 위 명령·원출력 4858행 | PASS |
| feature OPS-167 name present | 위 명령·원출력 4859행 | PASS |
| feature OPS-167 UI need 비대상 | 위 명령·원출력 4860행 | PASS |
| feature OPS-167 test need 필요 | 위 명령·원출력 4861행 | PASS |
| feature OPS-167 test area assigned | 위 명령·원출력 4862행 | PASS |
| feature OPS-167 pass criteria present | 위 명령·원출력 4863행 | PASS |
| feature OPS-168 name present | 위 명령·원출력 4864행 | PASS |
| feature OPS-168 UI need 비대상 | 위 명령·원출력 4865행 | PASS |
| feature OPS-168 test need 필요 | 위 명령·원출력 4866행 | PASS |
| feature OPS-168 test area assigned | 위 명령·원출력 4867행 | PASS |
| feature OPS-168 pass criteria present | 위 명령·원출력 4868행 | PASS |
| feature OPS-169 name present | 위 명령·원출력 4869행 | PASS |
| feature OPS-169 UI need 비대상 | 위 명령·원출력 4870행 | PASS |
| feature OPS-169 test need 필요 | 위 명령·원출력 4871행 | PASS |
| feature OPS-169 test area assigned | 위 명령·원출력 4872행 | PASS |
| feature OPS-169 pass criteria present | 위 명령·원출력 4873행 | PASS |
| feature OPS-170 name present | 위 명령·원출력 4874행 | PASS |
| feature OPS-170 UI need 비대상 | 위 명령·원출력 4875행 | PASS |
| feature OPS-170 test need 필요 | 위 명령·원출력 4876행 | PASS |
| feature OPS-170 test area assigned | 위 명령·원출력 4877행 | PASS |
| feature OPS-170 pass criteria present | 위 명령·원출력 4878행 | PASS |
| feature OPS-171 name present | 위 명령·원출력 4879행 | PASS |
| feature OPS-171 UI need 비대상 | 위 명령·원출력 4880행 | PASS |
| feature OPS-171 test need 필요 | 위 명령·원출력 4881행 | PASS |
| feature OPS-171 test area assigned | 위 명령·원출력 4882행 | PASS |
| feature OPS-171 pass criteria present | 위 명령·원출력 4883행 | PASS |
| feature OPS-172 name present | 위 명령·원출력 4884행 | PASS |
| feature OPS-172 UI need 비대상 | 위 명령·원출력 4885행 | PASS |
| feature OPS-172 test need 필요 | 위 명령·원출력 4886행 | PASS |
| feature OPS-172 test area assigned | 위 명령·원출력 4887행 | PASS |
| feature OPS-172 pass criteria present | 위 명령·원출력 4888행 | PASS |
| feature OPS-173 name present | 위 명령·원출력 4889행 | PASS |
| feature OPS-173 UI need 비대상 | 위 명령·원출력 4890행 | PASS |
| feature OPS-173 test need 필요 | 위 명령·원출력 4891행 | PASS |
| feature OPS-173 test area assigned | 위 명령·원출력 4892행 | PASS |
| feature OPS-173 pass criteria present | 위 명령·원출력 4893행 | PASS |
| feature OPS-174 name present | 위 명령·원출력 4894행 | PASS |
| feature OPS-174 UI need 비대상 | 위 명령·원출력 4895행 | PASS |
| feature OPS-174 test need 필요 | 위 명령·원출력 4896행 | PASS |
| feature OPS-174 test area assigned | 위 명령·원출력 4897행 | PASS |
| feature OPS-174 pass criteria present | 위 명령·원출력 4898행 | PASS |
| feature OPS-175 name present | 위 명령·원출력 4899행 | PASS |
| feature OPS-175 UI need 비대상 | 위 명령·원출력 4900행 | PASS |
| feature OPS-175 test need 필요 | 위 명령·원출력 4901행 | PASS |
| feature OPS-175 test area assigned | 위 명령·원출력 4902행 | PASS |
| feature OPS-175 pass criteria present | 위 명령·원출력 4903행 | PASS |
| feature OPS-176 name present | 위 명령·원출력 4904행 | PASS |
| feature OPS-176 UI need 비대상 | 위 명령·원출력 4905행 | PASS |
| feature OPS-176 test need 필요 | 위 명령·원출력 4906행 | PASS |
| feature OPS-176 test area assigned | 위 명령·원출력 4907행 | PASS |
| feature OPS-176 pass criteria present | 위 명령·원출력 4908행 | PASS |
| feature OPS-177 name present | 위 명령·원출력 4909행 | PASS |
| feature OPS-177 UI need 비대상 | 위 명령·원출력 4910행 | PASS |
| feature OPS-177 test need 필요 | 위 명령·원출력 4911행 | PASS |
| feature OPS-177 test area assigned | 위 명령·원출력 4912행 | PASS |
| feature OPS-177 pass criteria present | 위 명령·원출력 4913행 | PASS |
| feature OPS-178 name present | 위 명령·원출력 4914행 | PASS |
| feature OPS-178 UI need 비대상 | 위 명령·원출력 4915행 | PASS |
| feature OPS-178 test need 필요 | 위 명령·원출력 4916행 | PASS |
| feature OPS-178 test area assigned | 위 명령·원출력 4917행 | PASS |
| feature OPS-178 pass criteria present | 위 명령·원출력 4918행 | PASS |
| feature OPS-179 name present | 위 명령·원출력 4919행 | PASS |
| feature OPS-179 UI need 비대상 | 위 명령·원출력 4920행 | PASS |
| feature OPS-179 test need 필요 | 위 명령·원출력 4921행 | PASS |
| feature OPS-179 test area assigned | 위 명령·원출력 4922행 | PASS |
| feature OPS-179 pass criteria present | 위 명령·원출력 4923행 | PASS |
| feature OPS-180 name present | 위 명령·원출력 4924행 | PASS |
| feature OPS-180 UI need 비대상 | 위 명령·원출력 4925행 | PASS |
| feature OPS-180 test need 필요 | 위 명령·원출력 4926행 | PASS |
| feature OPS-180 test area assigned | 위 명령·원출력 4927행 | PASS |
| feature OPS-180 pass criteria present | 위 명령·원출력 4928행 | PASS |
| feature OPS-181 name present | 위 명령·원출력 4929행 | PASS |
| feature OPS-181 UI need 비대상 | 위 명령·원출력 4930행 | PASS |
| feature OPS-181 test need 필요 | 위 명령·원출력 4931행 | PASS |
| feature OPS-181 test area assigned | 위 명령·원출력 4932행 | PASS |
| feature OPS-181 pass criteria present | 위 명령·원출력 4933행 | PASS |
| feature OPS-182 name present | 위 명령·원출력 4934행 | PASS |
| feature OPS-182 UI need 비대상 | 위 명령·원출력 4935행 | PASS |
| feature OPS-182 test need 필요 | 위 명령·원출력 4936행 | PASS |
| feature OPS-182 test area assigned | 위 명령·원출력 4937행 | PASS |
| feature OPS-182 pass criteria present | 위 명령·원출력 4938행 | PASS |
| feature OPS-183 name present | 위 명령·원출력 4939행 | PASS |
| feature OPS-183 UI need 비대상 | 위 명령·원출력 4940행 | PASS |
| feature OPS-183 test need 필요 | 위 명령·원출력 4941행 | PASS |
| feature OPS-183 test area assigned | 위 명령·원출력 4942행 | PASS |
| feature OPS-183 pass criteria present | 위 명령·원출력 4943행 | PASS |
| feature OPS-184 name present | 위 명령·원출력 4944행 | PASS |
| feature OPS-184 UI need 비대상 | 위 명령·원출력 4945행 | PASS |
| feature OPS-184 test need 필요 | 위 명령·원출력 4946행 | PASS |
| feature OPS-184 test area assigned | 위 명령·원출력 4947행 | PASS |
| feature OPS-184 pass criteria present | 위 명령·원출력 4948행 | PASS |
| feature rows have required matrix columns | 위 명령·원출력 4949행 | PASS |
| inventory rejects separate test-area labels | 위 명령·원출력 4950행 | PASS |
| coverage wording separates mapping from execution | 위 명령·원출력 4951행 | PASS |
| current feature expansion rows exist | 위 명령·원출력 4952행 | PASS |
| manual UI docs reference inventory | 위 명령·원출력 4953행 | PASS |
| manual checklist references seed fixture | 위 명령·원출력 4954행 | PASS |
| manual result template references seed fixture | 위 명령·원출력 4955행 | PASS |
| VA seed inventory commands select the latest published baseline explicitly | 위 명령·원출력 4956행 | PASS |
| AGENTS requires individual future feature test rows | 위 명령·원출력 4957행 | PASS |
| manual UI seed account role admin | 위 명령·원출력 4958행 | PASS |
| manual UI seed account role operator | 위 명령·원출력 4959행 | PASS |
| manual UI seed account role viewer | 위 명령·원출력 4960행 | PASS |
| manual UI seed account role integrator | 위 명령·원출력 4961행 | PASS |
| manual UI seed profile 9101 numeric id | 위 명령·원출력 4962행 | PASS |
| manual UI seed profile 9101 tracking classes present | 위 명령·원출력 4963행 | PASS |
| manual UI seed profile 9102 numeric id | 위 명령·원출력 4964행 | PASS |
| manual UI seed profile 9102 tracking classes present | 위 명령·원출력 4965행 | PASS |
| manual UI seed profile 9103 numeric id | 위 명령·원출력 4966행 | PASS |
| manual UI seed profile 9103 tracking classes present | 위 명령·원출력 4967행 | PASS |
| manual UI seed profile 9104 numeric id | 위 명령·원출력 4968행 | PASS |
| manual UI seed profile 9104 tracking classes present | 위 명령·원출력 4969행 | PASS |
| manual UI seed profile 9105 numeric id | 위 명령·원출력 4970행 | PASS |
| manual UI seed profile 9105 tracking classes present | 위 명령·원출력 4971행 | PASS |
| manual UI seed profile 9106 numeric id | 위 명령·원출력 4972행 | PASS |
| manual UI seed profile 9106 tracking classes present | 위 명령·원출력 4973행 | PASS |
| manual UI seed profile 9107 numeric id | 위 명령·원출력 4974행 | PASS |
| manual UI seed profile 9107 tracking classes present | 위 명령·원출력 4975행 | PASS |
| manual UI seed event type presence | 위 명령·원출력 4976행 | PASS |
| manual UI seed event type enter | 위 명령·원출력 4977행 | PASS |
| manual UI seed event type exit | 위 명령·원출력 4978행 | PASS |
| manual UI seed event type line-crossing | 위 명령·원출력 4979행 | PASS |
| manual UI seed event type intrusion-dwell | 위 명령·원출력 4980행 | PASS |
| manual UI seed event type re-entry | 위 명령·원출력 4981행 | PASS |
| manual UI seed event type wrong-direction | 위 명령·원출력 4982행 | PASS |
| manual UI seed event type intrusion-after-line-crossing | 위 명령·원출력 4983행 | PASS |
| manual UI seed event type loitering | 위 명령·원출력 4984행 | PASS |
| manual UI seed event type zone-occupancy | 위 명령·원출력 4985행 | PASS |
| manual UI seed event template 9201 numeric id | 위 명령·원출력 4986행 | PASS |
| manual UI seed event template 9201 event type presence | 위 명령·원출력 4987행 | PASS |
| manual UI seed event template 9201 profile reference | 위 명령·원출력 4988행 | PASS |
| manual UI seed event template 9202 numeric id | 위 명령·원출력 4989행 | PASS |
| manual UI seed event template 9202 event type enter | 위 명령·원출력 4990행 | PASS |
| manual UI seed event template 9202 profile reference | 위 명령·원출력 4991행 | PASS |
| manual UI seed event template 9203 numeric id | 위 명령·원출력 4992행 | PASS |
| manual UI seed event template 9203 event type exit | 위 명령·원출력 4993행 | PASS |
| manual UI seed event template 9203 profile reference | 위 명령·원출력 4994행 | PASS |
| manual UI seed event template 9204 numeric id | 위 명령·원출력 4995행 | PASS |
| manual UI seed event template 9204 event type line-crossing | 위 명령·원출력 4996행 | PASS |
| manual UI seed event template 9204 profile reference | 위 명령·원출력 4997행 | PASS |
| manual UI seed event template 9205 numeric id | 위 명령·원출력 4998행 | PASS |
| manual UI seed event template 9205 event type line-crossing | 위 명령·원출력 4999행 | PASS |
| manual UI seed event template 9205 profile reference | 위 명령·원출력 5000행 | PASS |
| manual UI seed event template 9206 numeric id | 위 명령·원출력 5001행 | PASS |
| manual UI seed event template 9206 event type line-crossing | 위 명령·원출력 5002행 | PASS |
| manual UI seed event template 9206 profile reference | 위 명령·원출력 5003행 | PASS |
| manual UI seed event template 9207 numeric id | 위 명령·원출력 5004행 | PASS |
| manual UI seed event template 9207 event type intrusion-dwell | 위 명령·원출력 5005행 | PASS |
| manual UI seed event template 9207 profile reference | 위 명령·원출력 5006행 | PASS |
| manual UI seed event template 9208 numeric id | 위 명령·원출력 5007행 | PASS |
| manual UI seed event template 9208 event type re-entry | 위 명령·원출력 5008행 | PASS |
| manual UI seed event template 9208 profile reference | 위 명령·원출력 5009행 | PASS |
| manual UI seed event template 9209 numeric id | 위 명령·원출력 5010행 | PASS |
| manual UI seed event template 9209 event type wrong-direction | 위 명령·원출력 5011행 | PASS |
| manual UI seed event template 9209 profile reference | 위 명령·원출력 5012행 | PASS |
| manual UI seed event template 9210 numeric id | 위 명령·원출력 5013행 | PASS |
| manual UI seed event template 9210 event type intrusion-after-line-crossing | 위 명령·원출력 5014행 | PASS |
| manual UI seed event template 9210 profile reference | 위 명령·원출력 5015행 | PASS |
| manual UI seed event template 9211 numeric id | 위 명령·원출력 5016행 | PASS |
| manual UI seed event template 9211 event type loitering | 위 명령·원출력 5017행 | PASS |
| manual UI seed event template 9211 profile reference | 위 명령·원출력 5018행 | PASS |
| manual UI seed event template 9212 numeric id | 위 명령·원출력 5019행 | PASS |
| manual UI seed event template 9212 event type zone-occupancy | 위 명령·원출력 5020행 | PASS |
| manual UI seed event template 9212 profile reference | 위 명령·원출력 5021행 | PASS |
| manual UI seed line direction any | 위 명령·원출력 5022행 | PASS |
| manual UI seed line direction forward | 위 명령·원출력 5023행 | PASS |
| manual UI seed line direction reverse | 위 명령·원출력 5024행 | PASS |
| manual UI seed scenario preset default | 위 명령·원출력 5025행 | PASS |
| manual UI seed scenario preset road | 위 명령·원출력 5026행 | PASS |
| manual UI seed scenario preset retail | 위 명령·원출력 5027행 | PASS |
| manual UI seed scenario preset park | 위 명령·원출력 5028행 | PASS |
| manual UI seed scenario preset indoor | 위 명령·원출력 5029행 | PASS |
| manual UI seed scenario preset lobby | 위 명령·원출력 5030행 | PASS |
| manual UI seed scenario preset platform | 위 명령·원출력 5031행 | PASS |
| manual UI seed scenario preset entrance | 위 명령·원출력 5032행 | PASS |
| manual UI seed scenario preset doorway | 위 명령·원출력 5033행 | PASS |
| manual UI seed scenario preset parking | 위 명령·원출력 5034행 | PASS |
| manual UI seed scenario preset elevator | 위 명령·원출력 5035행 | PASS |
| manual UI seed scenario preset custom | 위 명령·원출력 5036행 | PASS |
| manual UI seed vaRule 9301 numeric id | 위 명령·원출력 5037행 | PASS |
| manual UI seed vaRule 9301 profile reference | 위 명령·원출력 5038행 | PASS |
| manual UI seed vaRule 9301 event template reference | 위 명령·원출력 5039행 | PASS |
| manual UI seed vaRule 9302 numeric id | 위 명령·원출력 5040행 | PASS |
| manual UI seed vaRule 9302 profile reference | 위 명령·원출력 5041행 | PASS |
| manual UI seed vaRule 9302 event template reference | 위 명령·원출력 5042행 | PASS |
| manual UI seed vaRule 9303 numeric id | 위 명령·원출력 5043행 | PASS |
| manual UI seed vaRule 9303 profile reference | 위 명령·원출력 5044행 | PASS |
| manual UI seed vaRule 9303 event template reference | 위 명령·원출력 5045행 | PASS |
| manual UI seed vaRule 9304 numeric id | 위 명령·원출력 5046행 | PASS |
| manual UI seed vaRule 9304 profile reference | 위 명령·원출력 5047행 | PASS |
| manual UI seed vaRule 9304 event template reference | 위 명령·원출력 5048행 | PASS |
| manual UI seed vaRule 9305 numeric id | 위 명령·원출력 5049행 | PASS |
| manual UI seed vaRule 9305 profile reference | 위 명령·원출력 5050행 | PASS |
| manual UI seed vaRule 9305 event template reference | 위 명령·원출력 5051행 | PASS |
| manual UI seed vaRule 9306 numeric id | 위 명령·원출력 5052행 | PASS |
| manual UI seed vaRule 9306 profile reference | 위 명령·원출력 5053행 | PASS |
| manual UI seed vaRule 9306 event template reference | 위 명령·원출력 5054행 | PASS |
| manual UI seed vaRule 9307 numeric id | 위 명령·원출력 5055행 | PASS |
| manual UI seed vaRule 9307 profile reference | 위 명령·원출력 5056행 | PASS |
| manual UI seed vaRule 9307 event template reference | 위 명령·원출력 5057행 | PASS |
| manual UI seed vaRule 9308 numeric id | 위 명령·원출력 5058행 | PASS |
| manual UI seed vaRule 9308 profile reference | 위 명령·원출력 5059행 | PASS |
| manual UI seed vaRule 9308 event template reference | 위 명령·원출력 5060행 | PASS |
| manual UI seed vaRule 9309 numeric id | 위 명령·원출력 5061행 | PASS |
| manual UI seed vaRule 9309 profile reference | 위 명령·원출력 5062행 | PASS |
| manual UI seed vaRule 9309 event template reference | 위 명령·원출력 5063행 | PASS |
| manual UI seed vaRule 9310 numeric id | 위 명령·원출력 5064행 | PASS |
| manual UI seed vaRule 9310 profile reference | 위 명령·원출력 5065행 | PASS |
| manual UI seed vaRule 9310 event template reference | 위 명령·원출력 5066행 | PASS |
| manual UI seed vaRule 9311 numeric id | 위 명령·원출력 5067행 | PASS |
| manual UI seed vaRule 9311 profile reference | 위 명령·원출력 5068행 | PASS |
| manual UI seed vaRule 9311 event template reference | 위 명령·원출력 5069행 | PASS |
| manual UI seed vaRule 9312 numeric id | 위 명령·원출력 5070행 | PASS |
| manual UI seed vaRule 9312 profile reference | 위 명령·원출력 5071행 | PASS |
| manual UI seed vaRule 9312 event template reference | 위 명령·원출력 5072행 | PASS |
| manual UI seed tracker Re-ID pair none/off | 위 명령·원출력 5073행 | PASS |
| manual UI seed tracker Re-ID pair lite/off | 위 명령·원출력 5074행 | PASS |
| manual UI seed tracker Re-ID pair kalman-lite/off | 위 명령·원출력 5075행 | PASS |
| manual UI seed tracker Re-ID pair bytetrack/off | 위 명령·원출력 5076행 | PASS |
| manual UI seed tracker Re-ID pair lite/assist | 위 명령·원출력 5077행 | PASS |
| manual UI seed tracker Re-ID pair kalman-lite/assist | 위 명령·원출력 5078행 | PASS |
| manual UI seed tracker Re-ID pair bytetrack/assist | 위 명령·원출력 5079행 | PASS |
| manual UI seed invalid policy tracker none Re-ID assist | 위 명령·원출력 5080행 | PASS |
| manual UI seed final state minimum vaRules | 위 명령·원출력 5081행 | PASS |
| manual UI VA seed matrix covers required current release cases | 위 명령·원출력 5082행 | PASS |

## core

명령: `./server.sh verify-v390-ui-exact-core-oracles-contract`. exit0, 2061ms. [전체 원출력](lp28-prep-core.log).

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| catalog covers every canonical UI/AUTH/SRC/RULE case in exact order | 위 명령·원출력 2행 | PASS |
| catalog and every returned oracle are deeply immutable | 위 명령·원출력 3행 | PASS |
| approval-envelope-only drift leaves every runtime oracle projection unchanged | 위 명령·원출력 4행 | PASS |
| row-local semantic inputs invalidate exactly their affected runtime oracle | 위 명령·원출력 5행 | PASS |
| runtime semantic binding contains only functional row-local inputs | 위 명령·원출력 6행 | PASS |
| runner-facing route/role/control/request/DOM/network/state/cleanup shape is exact | 위 명령·원출력 7행 | PASS |
| owner/action anchors and visible controls resolve in product source | 위 명령·원출력 8행 | PASS |
| runtime response paths/tokens resolve to product JSON or HTML output anchors | 위 명령·원출력 9행 | PASS |
| every exact API path is owned by ingress source and has semantic body assertions | 위 명령·원출력 10행 | PASS |
| negative boundaries use the same structured-material rule for response and DOM | 위 명령·원출력 11행 | PASS |
| state mutations bind exact request bodies, changed state, and authoritative cleanup | 위 명령·원출력 12행 | PASS |
| read, preview POST, and negative cases forbid writes and require independent before/after readback | 위 명령·원출력 13행 | PASS |
| corrected AUTH disable and client-view bindings match executable product routes | 위 명령·원출력 14행 | PASS |
| RULE-092~104 and RULE-111 delegate to existing specialized exact oracles | 위 명령·원출력 15행 | PASS |
| validator rejects missing, duplicate, route/role drift, and weak source ownership | 위 명령·원출력 16행 | PASS |
| validator rejects generic GET200, exists-only DOM, uncorrelated network, and state self-comparison | 위 명령·원출력 17행 | PASS |
| validator rejects absent API payload, forbidden fields, cleanup, and specialized link | 위 명령·원출력 18행 | PASS |

## combined

명령: `./server.sh verify-v390-ui-exact-oracle-catalog-contract`. exit0, 356ms. [전체 원출력](lp28-prep-combined.log).

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| integrated catalog covers 424 unique exact runtime oracles | 위 명령·원출력 2행 | PASS |
| every exact ID resolves to its immutable group-owned runtime oracle | 위 명령·원출력 3행 | PASS |
| unknown exact IDs fail closed | 위 명령·원출력 4행 | PASS |

## native-02

명령: `./server.sh verify-v390-ui-native-exact-cases-contract`. exit0, 16294ms. [전체 원출력](lp28-prep-native-02.log).

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| generated manifest validates against canonical exact ordered 424 | 위 명령·원출력 2행 | PASS |
| event typed fixtures select one row and preserve request-derived identities | 위 명령·원출력 3행 | PASS |
| incident memory search fixtures bind every product filter and searchable query | 위 명령·원출력 4행 | PASS |
| event review seed receipts bind PUT response, storage readback, and EventRecord identity | 위 명령·원출력 5행 | PASS |
| event review authoritative readback selects one exact nested event/review identity | 위 명령·원출력 6행 | PASS |
| EVT-038 binds one dry-run response to one attempt, audit row, and DOM projection | 위 명령·원출력 7행 | PASS |
| event review note evidence survives the production failure rewrap and parent aggregation | 위 명령·원출력 8행 | PASS |
| builder is deterministic and preserves exact case order | 위 명령·원출력 9행 | PASS |
| all 424 completion modes separate document navigation from application requests | 위 명령·원출력 10행 | PASS |
| all 424 failure lifecycles retain the initial manifest navigation binding | 위 명령·원출력 11행 | PASS |
| independent readback passes one coordinator ownership context and always ends it | 위 명령·원출력 12행 | PASS |
| RULE-097 callback receives only its declared explicit argument projection | 위 명령·원출력 13행 | PASS |
| bounded ownership cleanup precedes physical close without changing close truth | 위 명령·원출력 14행 | PASS |
| EVT-004 reuses one document navigation and correlates only the authoritative API fetch | 위 명령·원출력 15행 | PASS |
| canonical and native generator writes are one validated atomic transaction | 위 명령·원출력 16행 | PASS |
| RULE relationship fixtures use one collision-free numeric identity contract | 위 명령·원출력 17행 | PASS |
| workflow distribution is owned by the shared exact 424 contract | 위 명령·원출력 18행 | PASS |
| declared exact runtime seeds materialize through the shared deterministic fixture registry | 위 명령·원출력 19행 | PASS |
| every exact EVT seed.kind has a declarative store and join materializer | 위 명령·원출력 20행 | PASS |
| event review mutation cleanup validates an empty 200 collection and byte restore | 위 명령·원출력 21행 | PASS |
| event review seed keeps the official top-level note schema and uses structured reload | 위 명령·원출력 22행 | PASS |
| records.records fixture family uses product dispatch with exact readback and cleanup | 위 명령·원출력 23행 | PASS |
| fixture-safe incident digests bind one authoritative event to one safe summary | 위 명령·원출력 24행 | PASS |
| EVT-023/026 expected digest binds one materialized EventRecord identity before browser startup | 위 명령·원출력 25행 | PASS |
| EVT-004 diagnostic log evidence is redacted and byte-restored before native execution | 위 명령·원출력 26행 | PASS |
| audited route-local primary controls match their exact runtime oracles | 위 명령·원출력 27행 | PASS |
| endpoint source fixtures intentionally cross the published canonical-media baseline without bypassing sourceId identity | 위 명령·원출력 28행 | PASS |
| inactive-or-equal-before cleanup accepts absent or disabled state and rejects enabled residue | 위 명령·원출력 29행 | PASS |
| non-canonical implementation review metadata does not invalidate the exact 424 manifest | 위 명령·원출력 30행 | PASS |
| exact-case implementation projection drift and whole-file fallback are rejected | 위 명령·원출력 31행 | PASS |
| endpoint action execution inputs retain full runtime values but trace inputs are release-safe digests | 위 명령·원출력 32행 | PASS |
| admin-only ops users cases and runtime role schema stay authoritative | 위 명령·원출력 33행 | PASS |
| API ownership routes normalize to product screens | 위 명령·원출력 34행 | PASS |
| UI-017 binds the client events read model instead of a dashboard-only preset status | 위 명령·원출력 35행 | PASS |
| UI-018 remains a dedicated negative route case | 위 명령·원출력 36행 | PASS |
| SAFE-017 keeps its cross-route negative behavior without changing UI-018 classification | 위 명령·원출력 37행 | PASS |
| MEDIA/SAFE client cases and SAFE-016 negative route use one exact route lifecycle | 위 명령·원출력 38행 | PASS |
| remaining client-safe batch clusters bind dynamic identities and owned lifecycle endpoints | 위 명령·원출력 39행 | PASS |
| actual read-only and hidden-boundary completion requests use exact runtime oracle paths | 위 명령·원출력 40행 | PASS |
| all cases declare native action, oracle seed, and artifact plan | 위 명령·원출력 41행 | PASS |
| REVIEW4-56 requires exact typed product workflows for all 424 cases | 위 명령·원출력 42행 | PASS |
| REVIEW4-56 rejects fallback no-submit generic and self-comparison workflows | 위 명령·원출력 43행 | PASS |
| runner owns native execution, role state, first-fail, and artifact fields | 위 명령·원출력 44행 | PASS |
| self-contained runtime closes invite, auth readback, preference, and visual-session gaps | 위 명령·원출력 45행 | PASS |
| case runtime keeps generated secrets ephemeral and rejects state path escape | 위 명령·원출력 46행 | PASS |
| authoritative cleanup readback restores state after success and failure | 위 명령·원출력 47행 | PASS |
| SRC-010 and SRC-019 use a fresh fixture-scoped viewer and restore auth bytes | 위 명령·원출력 48행 | PASS |
| fresh role session restores login audit writes before a read-only case | 위 명령·원출력 49행 | PASS |
| fresh viewer session uses scope and client view readback instead of a nonexistent whoami viewId | 위 명령·원출력 50행 | PASS |
| canonical requested route and runtime screen route are explicit projections | 위 명령·원출력 51행 | PASS |
| runner and producer share typed capture schema while qualifier is independently implemented | 위 명령·원출력 52행 | PASS |
| missing, reordered, unsupported, API-screen, and field drift are rejected | 위 명령·원출력 53행 | PASS |
| stale implementation binding writes a fail-closed 0/424 pre-execution summary | 위 명령·원출력 54행 | PASS |
| canonical parent bootstrap failure writes a fail-closed 0/424 summary | 위 명령·원출력 55행 | PASS |
| pre-execution failure cannot become UI PASS, Policy v4 eligible, or cleanup evidence | 위 명령·원출력 56행 | PASS |
| raw capture success and UI qualification remain separate lifecycle states | 위 명령·원출력 57행 | PASS |
| evidence producer failure always leaves an exact 424 failure ledger | 위 명령·원출력 58행 | PASS |
| full exact failure ledger preserves the typed EVT-004 lifecycle envelope | 위 명령·원출력 59행 | PASS |
| failed case partial artifacts are referenced, deduplicated, and orphan-free | 위 명령·원출력 60행 | PASS |
| canonical case children bind duplicate screenshots to one prior artifact | 위 명령·원출력 61행 | PASS |

## scripts

명령: `./server.sh verify-script-inventory`. exit0, 33836ms. [전체 원출력](lp28-prep-scripts.log).

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| dispatch parser recognizes explicit bash and node interpreters | 위 명령·원출력 2행 | PASS |
| server.sh dispatch targets exist and are executable | 위 명령·원출력 3행 | PASS |
| documented server.sh commands resolve to dispatch table | 위 명령·원출력 4행 | PASS |
| tracked scripts are classified and referenced | 위 명령·원출력 5행 | PASS |
| project inventory delegates script file inventory to this verifier | 위 명령·원출력 6행 | PASS |
| project inventory maps verifier families without duplicating dispatch details | 위 명령·원출력 7행 | PASS |
| CMake does not define a separate untracked CTest registry | 위 명령·원출력 8행 | PASS |
| test entry scripts are reachable from test_all | 위 명령·원출력 9행 | PASS |
| auth verifier has no hardcoded test password defaults | 위 명령·원출력 10행 | PASS |
| VA EventRecord dispatch verifier fails early and dispatches every poll by default | 위 명령·원출력 11행 | PASS |
| critical verifier pass output avoids grouped feature-result wording | 위 명령·원출력 12행 | PASS |
| user-facing JS option parsers reject unknown options | 위 명령·원출력 13행 | PASS |

원출력 판정 5204행 전수. inventory의 상위 check18개와 내부 개별 assert5081행은 서로 다른 계수다. 최초 미추적1FAIL 이력은 최종 PASS로 지우지 않았다.
