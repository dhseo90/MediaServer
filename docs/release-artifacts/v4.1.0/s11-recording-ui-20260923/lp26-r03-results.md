# LP26-R03 삭제 영수증 저장·복구 집중 검증

독자: v4.1.0 개발·검증 담당자. 수명: S11 최종 판정까지. 정책은 `AGENTS.md`, 최종 결과 기준은 `docs/release-test-records.md`다. 이 표는 개별 단기 검사이며 녹화 120분·UI PASS가 아니다.

최초 복구 빌드는 SQLite 비활성 분기의 미사용 함수 경고로 실패했다. 함수의 SQLite 조건부 컴파일을 명시한 뒤 동일 복구 검사가 40/40으로 통과했다. 최초 실패 [원출력](lp26-r03-recovery.log)을 보존한다. 기존 120분 `observation-root-cap` 실패도 별도 유지한다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 압축·소유-001 | LP18-O01 owner checked read view shares journal envelope | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-002 | LP18-O01 shared journal original candidate envelopes | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-003 | LP18-O01 public Replay value mutation remains isolated | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-004 | LP18-O01 retained prefix preserves sealed journal lineage and canonical value | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-005 | LP18-O01 full canonical and projection oracle | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-006 | LP18-O03 stale candidate after reservation rejected | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-007 | LP18-O03 foreign owner candidate rejected | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-008 | LP18-O04 exact field order or prefix mutation rejected schema | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-009 | LP18-O04 standalone candidate fields rejected without disk change schema | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-010 | LP18-O04 exact field order or prefix mutation rejected type | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-011 | LP18-O04 standalone candidate fields rejected without disk change type | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-012 | LP18-O04 exact field order or prefix mutation rejected id | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-013 | LP18-O04 standalone candidate fields rejected without disk change id | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-014 | LP18-O04 exact field order or prefix mutation rejected entity | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-015 | LP18-O04 standalone candidate fields rejected without disk change entity | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-016 | LP18-O04 exact field order or prefix mutation rejected time | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-017 | LP18-O04 standalone candidate fields rejected without disk change time | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-018 | LP18-O04 exact field order or prefix mutation rejected payload | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-019 | LP18-O04 standalone candidate fields rejected without disk change payload | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-020 | LP18-O04 exact field order or prefix mutation rejected reorder | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-021 | LP18-O04 standalone candidate fields rejected without disk change reorder | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-022 | LP18-O04 exact field order or prefix mutation rejected shrink | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-023 | LP18-O04 standalone candidate fields rejected without disk change shrink | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-024 | LP18-O04 null envelope safely rejected | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-025 | LP18-O02 only transformed receipts own new envelopes | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-026 | LP18-O02 prepared receipts preserve original canonical bytes | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-027 | LP18-O02 publication bytes and prior owned snapshot remain exact | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-028 | LP18-O02 published prefix preserves receipt evidence and unchanged row lineage | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-029 | LP18-O02 receipt independent full projection equality | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-030 | LP18-O03 stale candidate after ordinary append rejected | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-031 | LP18-O05 8192 logical records admitted | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-032 | LP18-O05 8193 aliases still rejected | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-033 | LP18-O05 64MiB logical bytes admitted | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-034 | LP18-O05 64MiB plus one rejected | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-035 | LP18-O07 append accepted preserves sealed journal lineage | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-036 | LP18-O09 successful append retry returns exact input envelope | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-037 | LP18-O09 failed append clears prior output handle | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-038 | LP18-O09 borrowed input survives aliased output reset | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-039 | LP18-O07 checkpoint accepted preserves sealed journal lineage | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-040 | LP18-O07 accepted full canonical and durable bytes unchanged | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-041 | LP18-O08 reopen accepted preserves sealed journal lineage sqlite | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-042 | LP18-O08 reopen canonical ordinal and projection preserved sqlite | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-043 | LP18-O08 SQLite rebuild requires canonical and ordinal gates | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-044 | LP18-O08 reopen accepted preserves sealed journal lineage fallback | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-045 | LP18-O08 reopen canonical ordinal and projection preserved fallback | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-046 | LP18-O09 supplied envelope mismatch rejected schema | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-047 | LP18-O09 supplied envelope mismatch rejected type | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-048 | LP18-O09 supplied envelope mismatch rejected id | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-049 | LP18-O09 supplied envelope mismatch rejected entity | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-050 | LP18-O09 supplied envelope mismatch rejected time | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-051 | LP18-O09 supplied envelope mismatch rejected payload | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-052 | LP18-O09 failed apply registers no accepted envelope | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-053 | LP18-O09 supplied exact envelope is retained | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-054 | LP18-O09 duplicate full canonical acceptance and collision rejection preserved | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-055 | LP18-O09 compacted receipt retry returns original input envelope | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-056 | LP18-O11 bound journal identity and canonical bytes preserved | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-057 | LP18-O11 public binding value mutation remains isolated | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-058 | LP18-O11 source snapshot binding mutation remains isolated | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-059 | LP18-O12 same ID changed binding rejected without mutation | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-060 | LP18-O12 strict bound identity rejection preserved | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-061 | LP18-O10 checkpoint shadow shares warm owned binding reader | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-062 | LP18-O13 independent full replay binding projection preserved | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-063 | LP18-O12 unusable binding pool falls back to independent strict value null | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-064 | LP18-O12 unusable binding pool falls back to independent strict value different-content | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-065 | LP18-O12 unusable binding pool falls back to independent strict value different-id | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-066 | LP18-O12 matching pool cannot bypass invalid binding input | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-067 | LP18-O12 matching pool cannot bypass missing order | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-068 | LP18-O10 binding survives source pool owner destruction | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-069 | LP18-O10 no-op checkpoint preserves owned readers without binding comparisons | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-070 | LP18-O10 duplicate mutation does not recompare existing binding | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-071 | LP18-O10 new bound ID compares only its matching pool entry | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-072 | LP26-R01 live SQLite binding retained before deletion | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-073 | LP26-R01 deleted SQLite duplicate removed atomically | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-074 | LP18-O12 deleted source hidden with internal binding preserved | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-075 | LP26-R02 deleted bound journal physical bytes shrink without dropping a row | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-076 | LP26-R03 deleted tombstone physical row archived | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-077 | LP26-R03 deleted tombstone logical evidence restored | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-078 | LP26-R03 deleted tombstone archive damage rejected | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-079 | LP26-R02 archive restores exact logical bound envelope | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-080 | LP26-R02 replay preserves order and logical source evidence | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-081 | LP26-R02 changed compressed bytes rejected | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-082 | LP26-R02 changed decompression length rejected | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-083 | LP26-R02 malformed base64 rejected | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-084 | LP18-O10 deleted checkpoint preserves independently owned canonical binding evidence | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-085 | LP18-O13 reopen deleted canonical binding preserved without SQLite duplicate sqlite | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-086 | LP18-O10 reopened checkpoint shares warm owned binding reader sqlite | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-087 | LP18-O13 reopen deleted canonical binding preserved without SQLite duplicate fallback | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 압축·소유-088 | LP18-O10 reopened checkpoint shares warm owned binding reader fallback | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-1.txt) |
| 자동 checkpoint-001 | LP20-C01 automatic checkpoint preserves exact bytes and full projection | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| 자동 checkpoint-002 | LP20-C01 automatic checkpoint still reads durable raw evidence | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| 자동 checkpoint-003 | LP20-C04 automatic checkpoint leaves inactive binding detail nonresident | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| 자동 checkpoint-004 | LP20-C01 canonical automatic checkpoint skips historical envelope Parse and Serialize | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| 자동 checkpoint-005 | LP20-C02 same-size raw tamper rejects automatic no-op | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| 자동 checkpoint-006 | LP20-C02 truncated raw evidence rejects automatic no-op | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| 자동 checkpoint-007 | LP20-C02 replaced inode rejects automatic no-op | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| 자동 checkpoint-008 | LP20-C02 foreign owner cannot claim automatic no-op | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| 자동 checkpoint-009 | LP20-C02 detached owner cannot claim automatic no-op | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| 자동 checkpoint-010 | LP20-C03 durable but unapplied mutation requires strict fallback | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| 자동 checkpoint-011 | LP20-C03 noncanonical envelope retains strict rewrite | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| 자동 checkpoint-012 | LP20-C03 blank lines retain strict rewrite | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| 자동 checkpoint-013 | LP20-C03 identical duplicate physical rows preserve ordinal bytes | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| 자동 checkpoint-014 | LP20-C03 latest single EventLink remains no-op eligible | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| 자동 checkpoint-015 | LP20-C03 superseded EventLink requires strict receipt candidate | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| 자동 checkpoint-016 | LP20-C03 committed receipt and latest EventLink regain no-op eligibility | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| 자동 checkpoint-017 | LP20-C03 pending prefix uses existing strict recovery | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| 자동 checkpoint-018 | LP20-C03 mismatched pending prefix preserves original and rejects | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| 자동 checkpoint-019 | LP20-C03 manual checkpoint remains strict | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| 자동 checkpoint-020 | LP20-C03 Apply exception preserves authority but disables automatic no-op | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| 자동 checkpoint-021 | LP20-C03 failed Apply disables automatic no-op without changing authority | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| 자동 checkpoint-022 | LP20-C03 failed Open retry remains strict on the same catalog instance | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| 자동 checkpoint-023 | LP20-C03 exceptional Open retry remains strict on the same catalog instance | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| 자동 checkpoint-024 | LP20-C03 oversized accepted row preserves resident strict fallback | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-2.txt) |
| checkpoint 스냅샷-001 | LP18-L17 snapshot baseline Replay preserves complete canonical value | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-002 | LP18-L17 checkpoint read snapshot capability exists | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-003 | LP18-L17 snapshot binds complete immutable original values | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-004 | LP18-L18 snapshot reads each cold original exactly once | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-005 | LP18-L17 external owned vector mutation cannot alter snapshot original | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-006 | LP18-L18 Prepare and Commit reuse snapshot without repeated cold reads | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-007 | LP18-L19 snapshot no-write checkpoint preserves exact bytes and tokens | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-008 | LP18-L19 recover-only snapshot cleanup retains generation and exact bytes | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-009 | LP18-L17 snapshot release leaves no journal or cache strong resident | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-010 | LP18-L18 null snapshot retains strict repeated-read fallback and exact receipt bytes | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-011 | LP18-L19 appended history invalidates snapshot and rejects stale candidate | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-012 | LP18-L19 reserved history invalidates snapshot and rejects stale candidate | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-013 | LP18-L19 detach and same-owner reattach require strict snapshot fallback | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-014 | LP18-L19 identical foreign journal snapshot uses strict local fallback | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-015 | LP18-L19 snapshot does not bypass complete candidate field and order comparison schema | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-016 | LP18-L19 snapshot does not bypass complete candidate field and order comparison id | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-017 | LP18-L19 snapshot does not bypass complete candidate field and order comparison entity | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-018 | LP18-L19 snapshot does not bypass complete candidate field and order comparison time | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-019 | LP18-L19 snapshot does not bypass complete candidate field and order comparison type | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-020 | LP18-L19 snapshot does not bypass complete candidate field and order comparison payload | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-021 | LP18-L19 snapshot does not bypass complete candidate field and order comparison order | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-022 | LP18-L19 snapshot does not bypass complete candidate field and order comparison count | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-023 | LP18-L19 snapshot does not bypass complete candidate field and order comparison null | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-024 | LP18-L19 receipt swap invalidates snapshot while old owned original survives | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-025 | LP18-L20 explicit Acquire rechecks same-size raw tamper despite owned snapshot | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-026 | LP18-L20 snapshot acquisition exception clears both outputs and poisons | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-027 | LP18-L17 snapshot preserves duplicate physical rows and noncanonical envelope bytes | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| checkpoint 스냅샷-028 | LP18-L18 catalog Checkpoint reuses one cold snapshot with exact bytes and projection | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-3.txt) |
| crypto-off-001 | LP18-L10 crypto-off managed append acquires exact resident value only | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-4.txt) |
| crypto-off-002 | LP18-L10 crypto-off retry preserves resident value and physical row count | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-4.txt) |
| crypto-off-003 | LP18-L10 crypto-off checkpoint remains rejected with owner and resident value intact | pass | [원출력](../s11-preparation-mapping/lp18-ownership-green-lp26-r03-4.txt) |
| catalog-001 | journal open: | pass | [원출력](lp26-r03-catalog.log) |
| catalog-002 | fallback catalog open: | pass | [원출력](lp26-r03-catalog.log) |
| catalog-003 | SQLite off mode 표시 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-004 | segment finalize journal+projection: | pass | [원출력](lp26-r03-catalog.log) |
| catalog-005 | fallback range query | pass | [원출력](lp26-r03-catalog.log) |
| catalog-006 | event link FK 위반 거부 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-007 | FK 위반 transaction/journal 전체 rollback | pass | [원출력](lp26-r03-catalog.log) |
| catalog-008 | 최초 durable mutation 1개 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-009 | 동일 mutation 중복 append | pass | [원출력](lp26-r03-catalog.log) |
| catalog-010 | 손상 사이 정상 durable mutation 보존 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-011 | 중간 corrupt line count | pass | [원출력](lp26-r03-catalog.log) |
| catalog-012 | 마지막 truncated line skip | pass | [원출력](lp26-r03-catalog.log) |
| catalog-013 | fallback replay open | pass | [원출력](lp26-r03-catalog.log) |
| catalog-014 | 같은 mutation idempotent replay | pass | [원출력](lp26-r03-catalog.log) |
| catalog-015 | 재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-016 | 중복 replay row/합계 불증가 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-017 | 추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구: | pass | [원출력](lp26-r03-catalog.log) |
| catalog-018 | writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed | pass | [원출력](lp26-r03-catalog.log) |
| catalog-019 | v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed | pass | [원출력](lp26-r03-catalog.log) |
| catalog-020 | SQLite catalog open/rebuild: | pass | [원출력](lp26-r03-catalog.log) |
| catalog-021 | SQLite primary mode 표시 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-022 | SQLite on/off range query ID·순서 parity | pass | [원출력](lp26-r03-catalog.log) |
| catalog-023 | journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-024 | journal 없는 손상 media orphan 구분 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-025 | projection failover journal open: | pass | [원출력](lp26-r03-catalog.log) |
| catalog-026 | projection failover catalog open: | pass | [원출력](lp26-r03-catalog.log) |
| catalog-027 | 실제 SQLite INSERT 실패 trigger 설치 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-028 | SQLite 투영 실패 뒤 journal+memory finalize 유지: | pass | [원출력](lp26-r03-catalog.log) |
| catalog-029 | SQLite 투영 실패 즉시 JSONL fallback 전환 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-030 | 재시작 rebuild 전 실패 trigger 제거 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-031 | 투영 실패 직후 in-memory query 정합성 유지 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-032 | projection failover 재시작 journal rebuild: | pass | [원출력](lp26-r03-catalog.log) |
| catalog-033 | 재시작 후 journal에서 누락 SQLite projection 복구 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-034 | 재시작 후 SQLite primary 복귀 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-035 | 재시작 journal rebuild가 실제 SQLite row 복원 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-036 | tombstone journal open: | pass | [원출력](lp26-r03-catalog.log) |
| catalog-037 | tombstone catalog open: | pass | [원출력](lp26-r03-catalog.log) |
| catalog-038 | tombstone 대상 segment finalize: | pass | [원출력](lp26-r03-catalog.log) |
| catalog-039 | tombstone 대상 deletion request: | pass | [원출력](lp26-r03-catalog.log) |
| catalog-040 | tombstone 완료 기록: | pass | [원출력](lp26-r03-catalog.log) |
| catalog-041 | catalog finalize가 tombstone segment ID 재사용을 거부해야 함 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-042 | 손상 SQLite 격리 후 journal rebuild: | pass | [원출력](lp26-r03-catalog.log) |
| catalog-043 | 손상 SQLite 원본 격리 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-044 | 격리 SQLite 파일 보존 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-045 | 격리 후 journal rebuild 결과 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-046 | S10-3A future-schema journal read open | pass | [원출력](lp26-r03-catalog.log) |
| catalog-047 | S10-3A future-schema unsupported classification | pass | [원출력](lp26-r03-catalog.log) |
| catalog-048 | S10-3A future-schema catalog open denied | pass | [원출력](lp26-r03-catalog.log) |
| catalog-049 | S10-3A future-schema catalog retry denied | pass | [원출력](lp26-r03-catalog.log) |
| catalog-050 | S10-3A future-schema journal bytes preserved | pass | [원출력](lp26-r03-catalog.log) |
| catalog-051 | S10-3A future-schema SQLite bytes preserved | pass | [원출력](lp26-r03-catalog.log) |
| catalog-052 | S10-3A future-schema writer cleanup untouched | pass | [원출력](lp26-r03-catalog.log) |
| catalog-053 | S10-3A arbitrary-schema journal read open | pass | [원출력](lp26-r03-catalog.log) |
| catalog-054 | S10-3A arbitrary-schema unsupported classification | pass | [원출력](lp26-r03-catalog.log) |
| catalog-055 | S10-3A arbitrary-schema catalog open denied | pass | [원출력](lp26-r03-catalog.log) |
| catalog-056 | S10-3A arbitrary-schema catalog retry denied | pass | [원출력](lp26-r03-catalog.log) |
| catalog-057 | S10-3A arbitrary-schema journal bytes preserved | pass | [원출력](lp26-r03-catalog.log) |
| catalog-058 | S10-3A arbitrary-schema SQLite bytes preserved | pass | [원출력](lp26-r03-catalog.log) |
| catalog-059 | S10-3A arbitrary-schema writer cleanup untouched | pass | [원출력](lp26-r03-catalog.log) |
| catalog-060 | S10-3A empty-schema journal read open | pass | [원출력](lp26-r03-catalog.log) |
| catalog-061 | S10-3A empty-schema unsupported classification | pass | [원출력](lp26-r03-catalog.log) |
| catalog-062 | S10-3A empty-schema catalog open denied | pass | [원출력](lp26-r03-catalog.log) |
| catalog-063 | S10-3A empty-schema catalog retry denied | pass | [원출력](lp26-r03-catalog.log) |
| catalog-064 | S10-3A empty-schema journal bytes preserved | pass | [원출력](lp26-r03-catalog.log) |
| catalog-065 | S10-3A empty-schema SQLite bytes preserved | pass | [원출력](lp26-r03-catalog.log) |
| catalog-066 | S10-3A empty-schema writer cleanup untouched | pass | [원출력](lp26-r03-catalog.log) |
| catalog-067 | S10-3A future-type journal read open | pass | [원출력](lp26-r03-catalog.log) |
| catalog-068 | S10-3A future-type unsupported classification | pass | [원출력](lp26-r03-catalog.log) |
| catalog-069 | S10-3A future-type catalog open denied | pass | [원출력](lp26-r03-catalog.log) |
| catalog-070 | S10-3A future-type catalog retry denied | pass | [원출력](lp26-r03-catalog.log) |
| catalog-071 | S10-3A future-type journal bytes preserved | pass | [원출력](lp26-r03-catalog.log) |
| catalog-072 | S10-3A future-type SQLite bytes preserved | pass | [원출력](lp26-r03-catalog.log) |
| catalog-073 | S10-3A future-type writer cleanup untouched | pass | [원출력](lp26-r03-catalog.log) |
| catalog-074 | S10-3A malformed journal open | pass | [원출력](lp26-r03-catalog.log) |
| catalog-075 | S10-3A malformed JSON missing fields and wrong types remain corrupt | pass | [원출력](lp26-r03-catalog.log) |
| catalog-076 | S10-O01 reservation journal open | pass | [원출력](lp26-r03-catalog.log) |
| catalog-077 | S10-O01 first reservation returns four IDs and sequence one | pass | [원출력](lp26-r03-catalog.log) |
| catalog-078 | S10-O01 versioned reservation payload replays | pass | [원출력](lp26-r03-catalog.log) |
| catalog-079 | S10-O01 new reservation records actual occurred time | pass | [원출력](lp26-r03-catalog.log) |
| catalog-080 | S10-O02 identical retry preserves sequence and bytes | pass | [원출력](lp26-r03-catalog.log) |
| catalog-081 | S10-O03 reopened instance allocates next sequence | pass | [원출력](lp26-r03-catalog.log) |
| catalog-082 | S10-O03 new process resumes durable sequence | pass | [원출력](lp26-r03-catalog.log) |
| catalog-083 | S10-O04 different store rejected | pass | [원출력](lp26-r03-catalog.log) |
| catalog-084 | S10-O04 reused request with different segment rejected | pass | [원출력](lp26-r03-catalog.log) |
| catalog-085 | S10-O04 reused request with different channel rejected | pass | [원출력](lp26-r03-catalog.log) |
| catalog-086 | S10-O04 reused segment with different request rejected | pass | [원출력](lp26-r03-catalog.log) |
| catalog-087 | S10-O04 conflicts preserve original bytes | pass | [원출력](lp26-r03-catalog.log) |
| catalog-088 | S10-O05/O06 reject and preserve corrupt | pass | [원출력](lp26-r03-catalog.log) |
| catalog-089 | S10-O05/O06 reject and preserve unsupported-schema | pass | [원출력](lp26-r03-catalog.log) |
| catalog-090 | S10-O05/O06 reject and preserve unsupported-type | pass | [원출력](lp26-r03-catalog.log) |
| catalog-091 | S10-O05/O06 reject and preserve tail | pass | [원출력](lp26-r03-catalog.log) |
| catalog-092 | S10-O05/O06 reject and preserve payload-zero | pass | [원출력](lp26-r03-catalog.log) |
| catalog-093 | S10-O05/O06 reject and preserve payload-negative | pass | [원출력](lp26-r03-catalog.log) |
| catalog-094 | S10-O05/O06 reject and preserve payload-fraction | pass | [원출력](lp26-r03-catalog.log) |
| catalog-095 | S10-O05/O06 reject and preserve payload-overflow | pass | [원출력](lp26-r03-catalog.log) |
| catalog-096 | S10-O05/O06 reject and preserve duplicate-sequence | pass | [원출력](lp26-r03-catalog.log) |
| catalog-097 | S10-O05/O06 reject and preserve decreasing-sequence | pass | [원출력](lp26-r03-catalog.log) |
| catalog-098 | S10-O05/O06 reject and preserve duplicate-request | pass | [원출력](lp26-r03-catalog.log) |
| catalog-099 | S10-O05/O06 reject and preserve duplicate-segment | pass | [원출력](lp26-r03-catalog.log) |
| catalog-100 | S10-O05/O06 reject and preserve store-conflict | pass | [원출력](lp26-r03-catalog.log) |
| catalog-101 | S10-O05/O06 reject and preserve ordinary-before | pass | [원출력](lp26-r03-catalog.log) |
| catalog-102 | S10-O05/O06 reject and preserve ordinary-after | pass | [원출력](lp26-r03-catalog.log) |
| catalog-103 | S10-O05/O06 reject and preserve line-cap | pass | [원출력](lp26-r03-catalog.log) |
| catalog-104 | S10-O05 reservation entity envelope binding rejects mismatch | pass | [원출력](lp26-r03-catalog.log) |
| catalog-105 | S10-O05 reservation request envelope binding rejects mismatch | pass | [원출력](lp26-r03-catalog.log) |
| catalog-106 | S10-O01 strict reservation parser accepts versioned literal | pass | [원출력](lp26-r03-catalog.log) |
| catalog-107 | S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | pass | [원출력](lp26-r03-catalog.log) |
| catalog-108 | S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | pass | [원출력](lp26-r03-catalog.log) |
| catalog-109 | S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | pass | [원출력](lp26-r03-catalog.log) |
| catalog-110 | S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | pass | [원출력](lp26-r03-catalog.log) |
| catalog-111 | S10-O06 INT64_MAX identical retry remains valid | pass | [원출력](lp26-r03-catalog.log) |
| catalog-112 | S10-O06 sequence overflow rejected without write | pass | [원출력](lp26-r03-catalog.log) |
| catalog-113 | S10-O02 identical durable reservation duplicates remain idempotent | pass | [원출력](lp26-r03-catalog.log) |
| catalog-114 | S10-O06 sequence gaps remain valid and allocate above maximum | pass | [원출력](lp26-r03-catalog.log) |
| catalog-115 | S10-O07 four simultaneous processes finish reservations | pass | [원출력](lp26-r03-catalog.log) |
| catalog-116 | S10-O07 concurrent sequences are unique and complete | pass | [원출력](lp26-r03-catalog.log) |
| catalog-117 | S10-O07 next sequence follows concurrent reservations | pass | [원출력](lp26-r03-catalog.log) |
| catalog-118 | S10-O08 ordinary Append cannot reserve orders | pass | [원출력](lp26-r03-catalog.log) |
| catalog-119 | S10-O08 unopened journal rejected | pass | [원출력](lp26-r03-catalog.log) |
| catalog-120 | S10-O08 null result rejected | pass | [원출력](lp26-r03-catalog.log) |
| catalog-121 | S10-O08 invalid opaque ID rejected | pass | [원출력](lp26-r03-catalog.log) |
| catalog-122 | S10-O08 failed reservation does not expose tentative result | pass | [원출력](lp26-r03-catalog.log) |
| catalog-123 | S10-O09 unsafe file binding rejected and original preserved inode | pass | [원출력](lp26-r03-catalog.log) |
| catalog-124 | S10-O09 unsafe file binding rejected and original preserved parent | pass | [원출력](lp26-r03-catalog.log) |
| catalog-125 | S10-O09 unsafe file binding rejected and original preserved symlink | pass | [원출력](lp26-r03-catalog.log) |
| catalog-126 | S10-O09 unsafe file binding rejected and original preserved hardlink | pass | [원출력](lp26-r03-catalog.log) |
| catalog-127 | S10-O10 reservation and normal segment coexist in catalog | pass | [원출력](lp26-r03-catalog.log) |
| catalog-128 | S10-O04 reserve then finalize permits identical retry | pass | [원출력](lp26-r03-catalog.log) |
| catalog-129 | S10-O10 reservation survives catalog rebuild without changing segment query | pass | [원출력](lp26-r03-catalog.log) |
| catalog-130 | S10-O04 legacy segment cannot acquire retroactive reservation | pass | [원출력](lp26-r03-catalog.log) |
| catalog-131 | S10-M06 opened catalog accepts fresh exact reservation V2 finalize | pass | [원출력](lp26-r03-catalog.log) |
| catalog-132 | S10-M07 V2 find preserves complete metadata | pass | [원출력](lp26-r03-catalog.log) |
| catalog-133 | S10-M07 identical V2 recovery is idempotent | pass | [원출력](lp26-r03-catalog.log) |
| catalog-134 | S10-M07 V2 is absent from V1 range query | pass | [원출력](lp26-r03-catalog.log) |
| catalog-135 | S10-M07 V2 registered path is not orphan | pass | [원출력](lp26-r03-catalog.log) |
| catalog-136 | S10-M07 SQLite exact V2 JSON and path match | pass | [원출력](lp26-r03-catalog.log) |
| catalog-137 | S10-M07 JSONL restart preserves V2 exact payload | pass | [원출력](lp26-r03-catalog.log) |
| catalog-138 | S10-M06 wrong reservation tuple rejected store | pass | [원출력](lp26-r03-catalog.log) |
| catalog-139 | S10-M06 wrong reservation tuple rejected request | pass | [원출력](lp26-r03-catalog.log) |
| catalog-140 | S10-M06 wrong reservation tuple rejected segment | pass | [원출력](lp26-r03-catalog.log) |
| catalog-141 | S10-M06 wrong reservation tuple rejected channel | pass | [원출력](lp26-r03-catalog.log) |
| catalog-142 | S10-M06 wrong reservation tuple rejected sequence | pass | [원출력](lp26-r03-catalog.log) |
| catalog-143 | S10-M09 immutable V2 mapping mismatch rejected | pass | [원출력](lp26-r03-catalog.log) |
| catalog-144 | S10-M09 bad V2 startup retry preserves original state bad-payload | pass | [원출력](lp26-r03-catalog.log) |
| catalog-145 | S10-M09 bad V2 startup retry preserves original state missing-order | pass | [원출력](lp26-r03-catalog.log) |
| catalog-146 | S10-M09 bad V2 startup retry preserves original state bad-order | pass | [원출력](lp26-r03-catalog.log) |
| catalog-147 | S10-M09 bad V2 startup retry preserves original state conflicting-order | pass | [원출력](lp26-r03-catalog.log) |
| catalog-148 | S10-M09 bad V2 startup retry preserves original state tail | pass | [원출력](lp26-r03-catalog.log) |
| catalog-149 | S10-M09 bad V2 startup retry preserves original state corrupt | pass | [원출력](lp26-r03-catalog.log) |
| catalog-150 | S10-M09 bad V2 startup retry preserves original state unsafe-path | pass | [원출력](lp26-r03-catalog.log) |
| catalog-151 | S10-M09 default off rejects V2 before SQLite changes | pass | [원출력](lp26-r03-catalog.log) |
| catalog-152 | S10-M09 V2 replay namespace and deletion duplicate | pass | [원출력](lp26-r03-catalog.log) |
| catalog-153 | S10-M09 V2 replay namespace and deletion deleted | pass | [원출력](lp26-r03-catalog.log) |
| catalog-154 | S10-M09 V2 replay namespace and deletion v1-before | pass | [원출력](lp26-r03-catalog.log) |
| catalog-155 | S10-M09 V2 replay namespace and deletion v1-after | pass | [원출력](lp26-r03-catalog.log) |
| catalog-156 | S10-M09 V2 replay namespace and deletion deleted-before | pass | [원출력](lp26-r03-catalog.log) |
| catalog-157 | S10-M09 V2 replay namespace and deletion resurrection | pass | [원출력](lp26-r03-catalog.log) |
| catalog-158 | S10-M09 V2 replay namespace and deletion mutation-collision | pass | [원출력](lp26-r03-catalog.log) |
| catalog-159 | S10-M09 V2 finalize rejects missing media | pass | [원출력](lp26-r03-catalog.log) |
| catalog-160 | S10-M09 V2 finalize rejects directory media | pass | [원출력](lp26-r03-catalog.log) |
| catalog-161 | S10-M09 fresh candidate rejects mapping | pass | [원출력](lp26-r03-catalog.log) |
| catalog-162 | S10-M09 fresh candidate rejects path | pass | [원출력](lp26-r03-catalog.log) |
| catalog-163 | S10-M09 fresh candidate rejects tombstone | pass | [원출력](lp26-r03-catalog.log) |
| catalog-164 | S10-SW01 managed empty root opens with lifetime lease | pass | [원출력](lp26-r03-catalog.log) |
| catalog-165 | S10-SW02 same process second managed owner denied | pass | [원출력](lp26-r03-catalog.log) |
| catalog-166 | S10-SW03 different process owner and inherited use denied | pass | [원출력](lp26-r03-catalog.log) |
| catalog-167 | S10-SW12 managed duplicate descriptors are close-on-exec | pass | [원출력](lp26-r03-catalog.log) |
| catalog-168 | S10-SW05 managed reserve append replay use owned descriptor | pass | [원출력](lp26-r03-catalog.log) |
| catalog-169 | S10-SW06 raw managed access and legacy default path denied | pass | [원출력](lp26-r03-catalog.log) |
| catalog-170 | S10-SW01 managed Reserve rejects different store identity | pass | [원출력](lp26-r03-catalog.log) |
| catalog-171 | S10-SW10 catalog connection can inspect managed lease | pass | [원출력](lp26-r03-catalog.log) |
| catalog-172 | S10-SW04 owner destruction releases lease | pass | [원출력](lp26-r03-catalog.log) |
| catalog-173 | S10-SW01 managed reopen rejects different store identity | pass | [원출력](lp26-r03-catalog.log) |
| catalog-174 | S10-SW11 managed incomplete tail rejects append without changing bytes | pass | [원출력](lp26-r03-catalog.log) |
| catalog-175 | S10-SW07 legacy nonempty root preserved without conversion | pass | [원출력](lp26-r03-catalog.log) |
| catalog-176 | S10-SW08 partial initialization retry validates exact state lease | pass | [원출력](lp26-r03-catalog.log) |
| catalog-177 | S10-SW08 partial initialization retry validates exact state init | pass | [원출력](lp26-r03-catalog.log) |
| catalog-178 | S10-SW08 partial initialization retry validates exact state barrier | pass | [원출력](lp26-r03-catalog.log) |
| catalog-179 | S10-SW08 partial initialization retry validates exact state journal | pass | [원출력](lp26-r03-catalog.log) |
| catalog-180 | S10-SW08 partial initialization retry validates exact state incomplete | pass | [원출력](lp26-r03-catalog.log) |
| catalog-181 | S10-SW08 partial initialization retry validates exact state unknown | pass | [원출력](lp26-r03-catalog.log) |
| catalog-182 | S10-SW09 symlink inode and malformed marker rejected journal | pass | [원출력](lp26-r03-catalog.log) |
| catalog-183 | S10-SW09 symlink inode and malformed marker rejected marker | pass | [원출력](lp26-r03-catalog.log) |
| catalog-184 | S10-SW09 symlink inode and malformed marker rejected barrier | pass | [원출력](lp26-r03-catalog.log) |
| catalog-185 | S10-SW09 symlink inode and malformed marker rejected root-symlink | pass | [원출력](lp26-r03-catalog.log) |
| catalog-186 | S10-SB01 second managed catalog is denied | pass | [원출력](lp26-r03-catalog.log) |
| catalog-187 | S10-SB02 failed catalog cannot mutate journal or holds | pass | [원출력](lp26-r03-catalog.log) |
| catalog-188 | S10-SB03 attached catalog blocks unowned append but permits reservation | pass | [원출력](lp26-r03-catalog.log) |
| catalog-189 | S10-SB04 catalog destruction releases attachment | pass | [원출력](lp26-r03-catalog.log) |
| catalog-190 | S10-SB05 managed catalog rejects unsafe options outside | pass | [원출력](lp26-r03-catalog.log) |
| catalog-191 | S10-SB05 managed catalog rejects unsafe options dotdot | pass | [원출력](lp26-r03-catalog.log) |
| catalog-192 | S10-SB05 managed catalog rejects unsafe options media-symlink | pass | [원출력](lp26-r03-catalog.log) |
| catalog-193 | S10-SB05 managed catalog rejects unsafe options sqlite-symlink | pass | [원출력](lp26-r03-catalog.log) |
| catalog-194 | S10-SB05 managed catalog rejects unsafe options sqlite-hardlink | pass | [원출력](lp26-r03-catalog.log) |
| catalog-195 | S10-SB05 managed catalog rejects unsafe options disabled | pass | [원출력](lp26-r03-catalog.log) |
| catalog-196 | S10-SB06 failed open releases catalog attachment | pass | [원출력](lp26-r03-catalog.log) |
| catalog-197 | S10-SB07 managed SQLite sidecar rejected -wal symlink | pass | [원출력](lp26-r03-catalog.log) |
| catalog-198 | S10-SB07 managed SQLite sidecar rejected -wal hardlink | pass | [원출력](lp26-r03-catalog.log) |
| catalog-199 | S10-SB07 managed SQLite sidecar rejected -shm symlink | pass | [원출력](lp26-r03-catalog.log) |
| catalog-200 | S10-SB07 managed SQLite sidecar rejected -shm hardlink | pass | [원출력](lp26-r03-catalog.log) |
| catalog-201 | S10-SB07 managed SQLite sidecar rejected -journal symlink | pass | [원출력](lp26-r03-catalog.log) |
| catalog-202 | S10-SB07 managed SQLite sidecar rejected -journal hardlink | pass | [원출력](lp26-r03-catalog.log) |
| catalog-203 | S10-SC01 managed repeated event fixture is valid | pass | [원출력](lp26-r03-catalog.log) |
| catalog-204 | S10-SC02 managed reservations avoid history reads | pass | [원출력](lp26-r03-catalog.log) |
| catalog-205 | S10-SC03 managed V2 finalize avoids full replay | pass | [원출력](lp26-r03-catalog.log) |
| catalog-206 | S10-SC04 checkpoint reduces superseded event payload bytes | pass | [원출력](lp26-r03-catalog.log) |
| catalog-207 | S10-SC05 checkpoint preserves latest event and all record identities | pass | [원출력](lp26-r03-catalog.log) |
| catalog-208 | S10-SC06 checkpoint is idempotent and preserves V2 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-209 | S10-SC08 receipt preserves retry identity and rejects direct append | pass | [원출력](lp26-r03-catalog.log) |
| catalog-210 | S10-SC09 checkpoint restart preserves SQLite and JSONL state sqlite | pass | [원출력](lp26-r03-catalog.log) |
| catalog-211 | S10-SC09 managed checkpoint SQL V2 payload and path | pass | [원출력](lp26-r03-catalog.log) |
| catalog-212 | S10-SC09 checkpoint restart preserves SQLite and JSONL state jsonl | pass | [원출력](lp26-r03-catalog.log) |
| catalog-213 | S10-SC10 checkpoint prefix recovers before writes | pass | [원출력](lp26-r03-catalog.log) |
| catalog-214 | S10-SC11 checkpoint mismatch preserves bytes and poisons owner | pass | [원출력](lp26-r03-catalog.log) |
| catalog-215 | S10-SC12 first accepted mutation controls latest event | pass | [원출력](lp26-r03-catalog.log) |
| catalog-216 | S10-SC16 automatic checkpoint uses accumulated growth | pass | [원출력](lp26-r03-catalog.log) |
| catalog-217 | S10-SC07 raw checkpoint is rejected | pass | [원출력](lp26-r03-catalog.log) |
| catalog-218 | S10-SC18 checkpoint syscall failure poisons and reopens write | pass | [원출력](lp26-r03-catalog.log) |
| catalog-219 | S10-SC21 poison rejects hold mutation write | pass | [원출력](lp26-r03-catalog.log) |
| catalog-220 | S10-SC18 checkpoint syscall failure poisons and reopens file-fsync | pass | [원출력](lp26-r03-catalog.log) |
| catalog-221 | S10-SC21 poison rejects hold mutation file-fsync | pass | [원출력](lp26-r03-catalog.log) |
| catalog-222 | S10-SC18 checkpoint syscall failure poisons and reopens rename | pass | [원출력](lp26-r03-catalog.log) |
| catalog-223 | S10-SC21 poison rejects hold mutation rename | pass | [원출력](lp26-r03-catalog.log) |
| catalog-224 | S10-SC18 checkpoint syscall failure poisons and reopens dir-fsync | pass | [원출력](lp26-r03-catalog.log) |
| catalog-225 | S10-SC21 poison rejects hold mutation dir-fsync | pass | [원출력](lp26-r03-catalog.log) |
| catalog-226 | S10-SC17 checkpoint preserves holds observations and deletion | pass | [원출력](lp26-r03-catalog.log) |
| catalog-227 | S10-SC17 checkpoint SQL hold observation tombstone | pass | [원출력](lp26-r03-catalog.log) |
| catalog-228 | S10-SC17 checkpoint preserves holds observations and deletion restart sqlite | pass | [원출력](lp26-r03-catalog.log) |
| catalog-229 | S10-SC17 checkpoint SQL restart observation tombstone | pass | [원출력](lp26-r03-catalog.log) |
| catalog-230 | S10-SC17 checkpoint preserves holds observations and deletion restart jsonl | pass | [원출력](lp26-r03-catalog.log) |
| catalog-231 | S10-SC19 invalid managed history remains unchanged malformed | pass | [원출력](lp26-r03-catalog.log) |
| catalog-232 | S10-SC19 invalid managed history remains unchanged unsupported | pass | [원출력](lp26-r03-catalog.log) |
| catalog-233 | S10-SC19 invalid managed history remains unchanged conflict | pass | [원출력](lp26-r03-catalog.log) |
| catalog-234 | S10-SC20 raw catalog rejects receipt before side effects | pass | [원출력](lp26-r03-catalog.log) |
| catalog-235 | S10-SC13 crypto off raw remains usable | pass | [원출력](lp26-r03-catalog.log) |
| catalog-236 | S10-SC14 crypto off checkpoint is rejected | pass | [원출력](lp26-r03-catalog.log) |
| catalog-237 | S10-SC15 crypto off receipt reopen is rejected | pass | [원출력](lp26-r03-catalog.log) |
| catalog-238 | source 저장 callback reconcile 연결 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-239 | policy revision idempotency | pass | [원출력](lp26-r03-catalog.log) |
| catalog-240 | 5초 safety reconcile | pass | [원출력](lp26-r03-catalog.log) |
| catalog-241 | composition root 관리 저장소 선행 open | pass | [원출력](lp26-r03-catalog.log) |
| catalog-242 | composition helper journal 다음 catalog rebuild/open | pass | [원출력](lp26-r03-catalog.log) |
| catalog-243 | 서버 전 supervisor 시작 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-244 | ingress 전 event bridge 등록 | pass | [원출력](lp26-r03-catalog.log) |
| catalog-245 | ingress 종료 뒤 recorder finalize | pass | [원출력](lp26-r03-catalog.log) |
| catalog-246 | composition root 시작/종료 순서 | pass | [원출력](lp26-r03-catalog.log) |
| 보존-001 | continuous quota는 end_utc_ms, segment_id oldest-first | pass | [원출력](lp26-r03-retention.log) |
| 보존-002 | continuous/event quota가 자기 등급 artifact만 선택 | pass | [원출력](lp26-r03-retention.log) |
| 보존-003 | continuous/event 보존 기간을 독립적으로 적용 | pass | [원출력](lp26-r03-retention.log) |
| 보존-004 | continuous 보존 기간은 event와 독립적으로 적용 | pass | [원출력](lp26-r03-retention.log) |
| 보존-005 | event 보존 기간은 continuous와 독립적으로 적용 | pass | [원출력](lp26-r03-retention.log) |
| 보존-006 | 새 segment 예상 용량까지 continuous quota에 선반영 | pass | [원출력](lp26-r03-retention.log) |
| 보존-007 | pinned event와 hold_count>0 continuous 자동 삭제 제외 | pass | [원출력](lp26-r03-retention.log) |
| 보존-008 | disk reserve 부족은 eligible continuous부터 정리 | pass | [원출력](lp26-r03-retention.log) |
| 보존-009 | journal 실패 시 media unlink와 tombstone 중단 | pass | [원출력](lp26-r03-retention.log) |
| 보존-010 | unlink 실패는 deletion_pending 유지, 회수 byte 0 | pass | [원출력](lp26-r03-retention.log) |
| 보존-011 | tombstone journal 실패는 pending으로 남겨 다음 tick 복구 | pass | [원출력](lp26-r03-retention.log) |
| 보존-012 | channel retention policy 등록: | pass | [원출력](lp26-r03-retention.log) |
| 보존-013 | 삭제 불가 시 해당 channel writer만 storage-blocked | pass | [원출력](lp26-r03-retention.log) |
| 보존-014 | 공간 회복 뒤 새 keyframe용 epoch 재발급 신호 | pass | [원출력](lp26-r03-retention.log) |
| 보존-015 | 다중 channel reserve policy 등록 | pass | [원출력](lp26-r03-retention.log) |
| 보존-016 | 동시 channel admission이 물리 여유 공간을 중복 예약하지 않음 | pass | [원출력](lp26-r03-retention.log) |
| 보존-017 | segment finalize 후 in-flight reserve 반환으로 다른 channel 재개 | pass | [원출력](lp26-r03-retention.log) |
| 보존-018 | segment hard bound policy 등록 | pass | [원출력](lp26-r03-retention.log) |
| 보존-019 | 최소 packet보다 작은 continuous quota는 쓰기 전에 차단 | pass | [원출력](lp26-r03-retention.log) |
| 보존-020 | 진행량 정산 policy 등록 | pass | [원출력](lp26-r03-retention.log) |
| 보존-021 | 물리 free에 반영된 partial 쓰기량은 예약에서 이중 차감하지 않음 | pass | [원출력](lp26-r03-retention.log) |
| 보존-022 | 실제 동시 admission policy 등록 | pass | [원출력](lp26-r03-retention.log) |
| 보존-023 | 두 실제 thread의 동시 admission 중 하나만 reserve 획득 | pass | [원출력](lp26-r03-retention.log) |
| 보존-024 | cleanup 미해결 reservation policy 등록 | pass | [원출력](lp26-r03-retention.log) |
| 보존-025 | cleanup 미해결 channel 재활성화 policy 등록 | pass | [원출력](lp26-r03-retention.log) |
| 보존-026 | 정책 비활성·재활성 뒤에도 미해결 파일 reservation을 유지해 fail-closed | pass | [원출력](lp26-r03-retention.log) |
| 보존-027 | stale free-space policy 등록 | pass | [원출력](lp26-r03-retention.log) |
| 보존-028 | unlink 뒤에도 filesystem 여유 공간이 부족하면 회수량을 추정해 허용하지 않음 | pass | [원출력](lp26-r03-retention.log) |
| 보존-029 | 통합 journal open: | pass | [원출력](lp26-r03-retention.log) |
| 보존-030 | 통합 catalog open: | pass | [원출력](lp26-r03-retention.log) |
| 보존-031 | 통합 segment finalize: | pass | [원출력](lp26-r03-retention.log) |
| 보존-032 | tombstone은 남고 media path와 원본 bytes는 제거 | pass | [원출력](lp26-r03-retention.log) |
| 보존-033 | hold overflow segment finalize: | pass | [원출력](lp26-r03-retention.log) |
| 보존-034 | hold_count int64 최댓값 저장: | pass | [원출력](lp26-r03-retention.log) |
| 보존-035 | hold_count int64 오버플로 거부 | pass | [원출력](lp26-r03-retention.log) |
| 보존-036 | hold race segment finalize: | pass | [원출력](lp26-r03-retention.log) |
| 보존-037 | hold_count 획득: | pass | [원출력](lp26-r03-retention.log) |
| 보존-038 | 계획 뒤 획득된 hold도 삭제 transition에서 재검증 | pass | [원출력](lp26-r03-retention.log) |
| 보존-039 | pending recovery segment finalize: | pass | [원출력](lp26-r03-retention.log) |
| 보존-040 | pending recovery 삭제 요청: | pass | [원출력](lp26-r03-retention.log) |
| 보존-041 | pending recovery media 사전 제거 | pass | [원출력](lp26-r03-retention.log) |
| 보존-042 | unlink 뒤 tombstone 실패 상태를 다음 tick에서 idempotent 재완료 | pass | [원출력](lp26-r03-retention.log) |
| 보존-043 | pending 복구 격리 policy 등록 | pass | [원출력](lp26-r03-retention.log) |
| 보존-044 | 한 channel의 pending 복구 실패가 다른 channel admission/tick을 차단하지 않음 | pass | [원출력](lp26-r03-retention.log) |
| 보존-045 | 정책이 없거나 비활성인 channel의 pending도 주기적으로 tombstone 완료 | pass | [원출력](lp26-r03-retention.log) |
| 보존-046 | event 압력 독립 policy 등록 | pass | [원출력](lp26-r03-retention.log) |
| 보존-047 | event 예상 회수량을 제외하고 continuous만으로 reserve와 admission 처리 | pass | [원출력](lp26-r03-retention.log) |
| 보존-048 | malicious journal open: | pass | [원출력](lp26-r03-retention.log) |
| 보존-049 | malicious mutation append: | pass | [원출력](lp26-r03-retention.log) |
| 보존-050 | malicious catalog open: | pass | [원출력](lp26-r03-retention.log) |
| 보존-051 | journal mediaRelpath가 root 밖이면 retention 후보에서 격리 | pass | [원출력](lp26-r03-retention.log) |
| 보존-052 | unlink 직전 symlink 전환 준비 | pass | [원출력](lp26-r03-retention.log) |
| 보존-053 | unlink 직전 root 밖 symlink 생성 | pass | [원출력](lp26-r03-retention.log) |
| 보존-054 | journal 이후 unlink 직전 canonical root containment 재검증 | pass | [원출력](lp26-r03-retention.log) |
| 보존-055 | dirfd에 결박된 unlink는 검증 뒤 상위 경로 교체에도 외부 파일을 보호 | pass | [원출력](lp26-r03-retention.log) |
| 보존-056 | storage root가 비어 있으면 안전 unlink를 fail-closed | pass | [원출력](lp26-r03-retention.log) |
| 복구-001 | truncated open | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-002 | truncated uncommitted before append | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-003 | truncated append: | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-004 | truncated valid2 and next ID preserved | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-005 | truncated quarantine byte exact | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-006 | truncated restart no mutation | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-007 | truncated second append retained | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-008 | truncated no redundant archive | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-009 | complete-no-lf open | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-010 | complete-no-lf uncommitted before append | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-011 | complete-no-lf append: | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-012 | complete-no-lf valid2 and next ID preserved | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-013 | complete-no-lf quarantine byte exact | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-014 | complete-no-lf restart no mutation | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-015 | complete-no-lf second append retained | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-016 | complete-no-lf no redundant archive | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-017 | empty journal is valid | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-018 | empty append retained | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-019 | large newline prefix byte preserved | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-020 | middle corrupt line preserved and valid entries read | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-021 | directory quarantine journal open | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-022 | directory quarantine failure original unchanged | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-023 | symlink quarantine journal open | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-024 | symlink quarantine failure original unchanged | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-025 | hardlink quarantine journal open | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-026 | hardlink quarantine failure original unchanged | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-027 | exact quarantine journal open | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-028 | existing exact quarantine restart reuse | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-029 | journal symlink refused | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-030 | journal hardlink refused | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-031 | inode pin open | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-032 | replacement inode append/reopen/replay refused | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-033 | catalog refuses failed journal Replay | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-034 | user parent symlink refused | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-035 | parent traversal refused | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-036 | deleted journal initial open | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-037 | deleted journal reopen does not recreate | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-038 | deleted parent reopen does not recreate | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-039 | macOS tmp system alias allowed | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 복구-040 | oversized tail fails closed with original bytes | pass | [원출력](lp26-r03-recovery-rerun.log) |
| 원본 결박-001 | S10-C301 결박 schema 왕복 | pass | [원출력](lp26-r03-source-binding.log) |
| 원본 결박-002 | S10-C302 식별·ordinal 검증 | pass | [원출력](lp26-r03-source-binding.log) |
| 원본 결박-003 | S10-C303 PTS 재정렬 보존 | pass | [원출력](lp26-r03-source-binding.log) |
| 원본 결박-004 | S10-C304 미디어 범위·timebase | pass | [원출력](lp26-r03-source-binding.log) |
| 원본 결박-005 | S10-C305 색인 상한·미색인 꼬리 | pass | [원출력](lp26-r03-source-binding.log) |
| 원본 결박-006 | S10-C306 단일 bound mutation | pass | [원출력](lp26-r03-source-binding.log) |
| 원본 결박-007 | S10-C307 source·저장 identity 결박 | pass | [원출력](lp26-r03-source-binding.log) |
| 원본 결박-008 | S10-C308 불변·멱등 | pass | [원출력](lp26-r03-source-binding.log) |
| 원본 결박-009 | S10-C309 소급·다운그레이드 금지 | pass | [원출력](lp26-r03-source-binding.log) |
| 원본 결박-010 | S10-C310 정확한 원본 tuple 조회 | pass | [원출력](lp26-r03-source-binding.log) |
| 원본 결박-011 | S10-C311 미색인·실제 부재 구분 | pass | [원출력](lp26-r03-source-binding.log) |
| 원본 결박-012 | S10-C312 복수 segment 후보 | pass | [원출력](lp26-r03-source-binding.log) |
| 원본 결박-013 | S10-C313 삭제·corrupt·pending 차단 | pass | [원출력](lp26-r03-source-binding.log) |
| 원본 결박-014 | S10-C314 채널·조회 오류 경계 | pass | [원출력](lp26-r03-source-binding.log) |
| 원본 결박-015 | S10-C315 SQL·JSONL 재시작 동등 | pass | [원출력](lp26-r03-source-binding.log) |
| 원본 결박-016 | S10-C316 checkpoint 보존 | pass | [원출력](lp26-r03-source-binding.log) |
| 원본 결박-017 | S10-C317 손상 원장 선차단 | pass | [원출력](lp26-r03-source-binding.log) |
| 원본 결박-018 | S10-C318 예약·옵트인 경계 | pass | [원출력](lp26-r03-source-binding.log) |
| 원본 결박-019 | S10-C319 기존 segment·조회 불변 | pass | [원출력](lp26-r03-source-binding.log) |
| 원본 결박-020 | S10-C320 실제 finalize 수락 경계 | pass | [원출력](lp26-r03-source-binding.log) |
| 실제 앱 단기-001 | LP26-O05 fixed current executable | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-002 | LP26-O05 original bounded retention fixture | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-003 | LP26-O05 distinct canonical sources | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-004 | LP26-O05 isolated server healthy | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-005 | LP26-O05 independent initial channels | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-006 | LP26-O05 active 9101 | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-007 | LP26-O05 active 9201 | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-008 | LP26-O05 active 9101 | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-009 | LP26-O05 active 9201 | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-010 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-011 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-012 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-013 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-014 | LP26-O05 active 9101 | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-015 | LP26-O05 active 9201 | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-016 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-017 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-018 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-019 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-020 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-021 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-022 | LP26-O05 active 9101 | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-023 | LP26-O05 active 9201 | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-024 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-025 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-026 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-027 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-028 | LP26-O05 active 9101 | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-029 | LP26-O05 active 9201 | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-030 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-031 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-032 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-033 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-034 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-035 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-036 | LP26-O05 active 9101 | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-037 | LP26-O05 active 9201 | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-038 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-039 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-040 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-041 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-042 | LP26-O04 sample coverage | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-043 | LP26-O05 both channels retained and progressed | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-044 | LP26-O05 setting 9101 false | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-045 | LP26-O05 setting 9201 false | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-046 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-047 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-048 | LP26-O02 closed journal no partial tail | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-049 | LP26-O05 stopped copy native catalog recovery | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-050 | LP26-O05 native surviving and deleted states | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-051 | LP26-O05 original journal bytes unchanged | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-052 | LP26-O05 recovery copy cleanup | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-053 | LP26-O05 isolated server healthy | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-054 | LP26-O05 disabled restart | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-055 | LP26-O05 stopped copy native catalog recovery | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-056 | LP26-O05 native surviving and deleted states | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-057 | LP26-O05 original journal bytes unchanged | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-058 | LP26-O05 recovery copy cleanup | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-059 | LP26-O05 restart exact catalog media state | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-060 | LP26-O05 isolated server healthy | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-061 | LP26-O05 setting 9101 true | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-062 | LP26-O05 setting 9201 true | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-063 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-064 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-065 | LP26-O05 reenabled recording after restart | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-066 | LP26-O03 deleted media absent | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-067 | LP26-O02 final restart closed journal no partial tail | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-068 | LP26-O05 stopped copy native catalog recovery | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-069 | LP26-O05 native surviving and deleted states | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-070 | LP26-O05 original journal bytes unchanged | pass | [원출력](lp26-r03-short-app.log) |
| 실제 앱 단기-071 | LP26-O05 recovery copy cleanup | pass | [원출력](lp26-r03-short-app.log) |
| 손상-001 | journal open | pass | [원출력](lp26-r03-corruption.log) |
| 손상-002 | catalog seed open | pass | [원출력](lp26-r03-corruption.log) |
| 손상-003 | seed finalized | pass | [원출력](lp26-r03-corruption.log) |
| 손상-004 | corruption durable append | pass | [원출력](lp26-r03-corruption.log) |
| 손상-005 | catalog replay open | pass | [원출력](lp26-r03-corruption.log) |
| 손상-006 | corruption replay lifecycle is Corrupt | pass | [원출력](lp26-r03-corruption.log) |
| 손상-007 | fallback journal open | pass | [원출력](lp26-r03-corruption.log) |
| 손상-008 | fallback catalog open | pass | [원출력](lp26-r03-corruption.log) |
| 손상-009 | fallback seed base | pass | [원출력](lp26-r03-corruption.log) |
| 손상-010 | fallback resolved locator literal segment UTC PTS | pass | [원출력](lp26-r03-corruption.log) |
| 손상-011 | fallback observation stored before corruption | pass | [원출력](lp26-r03-corruption.log) |
| 손상-012 | fallback observation locator initially available | pass | [원출력](lp26-r03-corruption.log) |
| 손상-013 | fallback unknown ID and reason refused noappend | pass | [원출력](lp26-r03-corruption.log) |
| 손상-014 | fallback acquire hold | pass | [원출력](lp26-r03-corruption.log) |
| 손상-015 | fallback held corruption refused noappend | pass | [원출력](lp26-r03-corruption.log) |
| 손상-016 | fallback release hold | pass | [원출력](lp26-r03-corruption.log) |
| 손상-017 | fallback mark corruption | pass | [원출력](lp26-r03-corruption.log) |
| 손상-018 | fallback repeat corruption noappend | pass | [원출력](lp26-r03-corruption.log) |
| 손상-019 | fallback only lifecycle changed bytes identity preserved | pass | [원출력](lp26-r03-corruption.log) |
| 손상-020 | fallback corrupt media location blocked | pass | [원출력](lp26-r03-corruption.log) |
| 손상-021 | fallback V2 locator revoked | pass | [원출력](lp26-r03-corruption.log) |
| 손상-022 | fallback pending link segments seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-023 | fallback pending link seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-024 | fallback pending source output refused noappend | pass | [원출력](lp26-r03-corruption.log) |
| 손상-025 | fallback event link metadata preserved | pass | [원출력](lp26-r03-corruption.log) |
| 손상-026 | fallback deletion-pending deletion seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-027 | fallback deletion-pending mark rejected noappend | pass | [원출력](lp26-r03-corruption.log) |
| 손상-028 | fallback deletion-done deletion seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-029 | fallback tombstone seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-030 | fallback deletion-done mark rejected noappend | pass | [원출력](lp26-r03-corruption.log) |
| 손상-031 | fallback identical finalized replay seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-032 | fallback conflicting finalized seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-033 | fallback entity mismatch seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-034 | fallback invalid first valid later same mutation ID seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-035 | fallback malformed and deletion-priority seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-036 | fallback same mutation ID different payload seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-037 | fallback restart | pass | [원출력](lp26-r03-corruption.log) |
| 손상-038 | fallback restart never resurrects corrupt identity | pass | [원출력](lp26-r03-corruption.log) |
| 손상-039 | fallback query keeps corrupt pending excludes deleted | pass | [원출력](lp26-r03-corruption.log) |
| 손상-040 | fallback deletion priority and unknown no creation | pass | [원출력](lp26-r03-corruption.log) |
| 손상-041 | fallback invalid mutations diagnosed exact count | pass | [원출력](lp26-r03-corruption.log) |
| 손상-042 | sqlite journal open | pass | [원출력](lp26-r03-corruption.log) |
| 손상-043 | sqlite catalog open | pass | [원출력](lp26-r03-corruption.log) |
| 손상-044 | sqlite seed base | pass | [원출력](lp26-r03-corruption.log) |
| 손상-045 | sqlite resolved locator literal segment UTC PTS | pass | [원출력](lp26-r03-corruption.log) |
| 손상-046 | sqlite observation stored before corruption | pass | [원출력](lp26-r03-corruption.log) |
| 손상-047 | sqlite observation locator initially available | pass | [원출력](lp26-r03-corruption.log) |
| 손상-048 | sqlite unknown ID and reason refused noappend | pass | [원출력](lp26-r03-corruption.log) |
| 손상-049 | sqlite acquire hold | pass | [원출력](lp26-r03-corruption.log) |
| 손상-050 | sqlite held corruption refused noappend | pass | [원출력](lp26-r03-corruption.log) |
| 손상-051 | sqlite release hold | pass | [원출력](lp26-r03-corruption.log) |
| 손상-052 | sqlite mark corruption | pass | [원출력](lp26-r03-corruption.log) |
| 손상-053 | sqlite repeat corruption noappend | pass | [원출력](lp26-r03-corruption.log) |
| 손상-054 | sqlite only lifecycle changed bytes identity preserved | pass | [원출력](lp26-r03-corruption.log) |
| 손상-055 | sqlite corrupt media location blocked | pass | [원출력](lp26-r03-corruption.log) |
| 손상-056 | sqlite V2 locator revoked | pass | [원출력](lp26-r03-corruption.log) |
| 손상-057 | sqlite SQL lifecycle corrupt | pass | [원출력](lp26-r03-corruption.log) |
| 손상-058 | sqlite SQL codecs_json original metadata | pass | [원출력](lp26-r03-corruption.log) |
| 손상-059 | sqlite pending link segments seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-060 | sqlite pending link seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-061 | sqlite pending source output refused noappend | pass | [원출력](lp26-r03-corruption.log) |
| 손상-062 | sqlite event link metadata preserved | pass | [원출력](lp26-r03-corruption.log) |
| 손상-063 | sqlite deletion-pending deletion seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-064 | sqlite deletion-pending mark rejected noappend | pass | [원출력](lp26-r03-corruption.log) |
| 손상-065 | sqlite deletion-done deletion seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-066 | sqlite tombstone seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-067 | sqlite deletion-done mark rejected noappend | pass | [원출력](lp26-r03-corruption.log) |
| 손상-068 | sqlite identical finalized replay seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-069 | sqlite conflicting finalized seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-070 | sqlite entity mismatch seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-071 | sqlite invalid first valid later same mutation ID seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-072 | sqlite malformed and deletion-priority seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-073 | sqlite same mutation ID different payload seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-074 | sqlite restart | pass | [원출력](lp26-r03-corruption.log) |
| 손상-075 | sqlite restart never resurrects corrupt identity | pass | [원출력](lp26-r03-corruption.log) |
| 손상-076 | sqlite query keeps corrupt pending excludes deleted | pass | [원출력](lp26-r03-corruption.log) |
| 손상-077 | sqlite deletion priority and unknown no creation | pass | [원출력](lp26-r03-corruption.log) |
| 손상-078 | sqlite invalid mutations diagnosed exact count | pass | [원출력](lp26-r03-corruption.log) |
| 손상-079 | sqlite restart SQL lifecycle parity | pass | [원출력](lp26-r03-corruption.log) |
| 손상-080 | sqlite SQL deletion precedence | pass | [원출력](lp26-r03-corruption.log) |
| 손상-081 | sqlite rebuild excludes rejected envelopes | pass | [원출력](lp26-r03-corruption.log) |
| 손상-082 | sqlite invalid first valid later SQL exact binding | pass | [원출력](lp26-r03-corruption.log) |
| 손상-083 | sqlite projection failover seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-084 | sqlite SQLite failure trigger | pass | [원출력](lp26-r03-corruption.log) |
| 손상-085 | sqlite projection failure keeps durable memory state | pass | [원출력](lp26-r03-corruption.log) |
| 손상-086 | sqlite remove projection trigger | pass | [원출력](lp26-r03-corruption.log) |
| 손상-087 | sqlite fallback restart SQL repaired | pass | [원출력](lp26-r03-corruption.log) |
| 손상-088 | order journal open | pass | [원출력](lp26-r03-corruption.log) |
| 손상-089 | order corruption-before-create-after seed | pass | [원출력](lp26-r03-corruption.log) |
| 손상-090 | order catalog open | pass | [원출력](lp26-r03-corruption.log) |
| 손상-091 | order memory corrupt | pass | [원출력](lp26-r03-corruption.log) |
| 손상-092 | identical envelope accepted ordinal SQL parity | pass | [원출력](lp26-r03-corruption.log) |
