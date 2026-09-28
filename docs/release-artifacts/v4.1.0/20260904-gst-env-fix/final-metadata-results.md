# 환경 보완 최종 등록·문서 정합성 결과

이 문서는 제한 범위 정적 검증 결과다. 기능 실행·UI·장시간·다른 PC 검증을 대체하지 않는다.
원문은 `final-metadata-results.json`에 보존한다. 중앙 인벤토리는 첫 실행의 도구 출력이
잘려 동일 명령을 다시 실행하고, 출력 5088줄을 기능 ID별 5개 검사의 통과/실패 수와
나머지 출력으로 집계했다. 제품 검사와 달리 이 인벤토리는 등록 정합성만 확인한다.

| 제목 | 명령 | 결과 |
| --- | --- | --- |
| 소스 감사 및 승인된 manifest 반영 | `./server.sh verify-v390-review4-feature-semantic-source-audit --apply-approved-manifest` | PASS |
| 등록기 최신 단위 재검증 | `node scripts/internal/v410_s05_inventory.test.mjs` | PASS |
| 스크립트 인벤토리 | `./server.sh verify-script-inventory` | PASS |
| 문서 링크(최종 문서 갱신 전) | `./server.sh verify-docs-links` | PASS |
| 문서 UI asset 정합성 | `./server.sh verify-docs-ui-assets` | PASS |
| 중앙 인벤토리 재실행 | `./server.sh verify-project-inventory` | PASS: 986행, summary 18/0 |

## 최초 진단 실패와 재분류

manifest의 inventorySha256만 변경될 것이라는 자체 진단은 FAIL했다. 정식 source audit는
51/0이며 승인 986개를 유지했다. 전수 비교에서 바뀐 값은 총 5917개(상단 hash 1개와
986행별 locator·파생 digest 6개)였다. server.sh의 행 위치가 971개는 +16, 15개는 +2
이동했으며 원본 source line/context·ID/순서·sourceFlowDigest·기존 승인 envelope 및
나머지 모든 값은 동일하다. edge digest 986개는 해당 proof의 SHA256과 일치하고
semanticDigest 쌍도 일치한다. 해시 계산의 의미적 정당성은 정식 감사 결과로 확인했다.
독립 검토자 1명의 읽기 전용 비교도 같은 결론이다. 새 기능 승인을 부여한 것이 아니다.

## 개별 검사 결과

### 소스 감사 및 승인된 manifest 반영

| 번호 | 검사 | 결과 |
| --- | --- | --- |
| 1 | candidate covers the exact 986 inventory IDs without using REVIEW3 claims | PASS |
| 2 | every row has an independently dispatched verifier | PASS |
| 3 | all rows are source-resolved before REVIEW4 approval | PASS |
| 4 | source proof roles and independent readback are exact | PASS |
| 5 | known REVIEW3 false mappings are replaced by actual source owners | PASS |
| 6 | UI-001 through UI-050 remain strict and VLM mutations use independent readback | PASS |
| 7 | UI-051 through UI-100 remain strict on canonical functional verifiers | PASS |
| 8 | stored approvals are external to candidate generation and cover all rows | PASS |
| 9 | negative fixtures reject unrelated, shared, self-comparison, invented-edge, and generator approval | PASS |
| 10 | outside-3-line function/blob mutation invalidates source-flow digest | PASS |
| 11 | unrelated product file mutation outside bound body preserves source-flow digest | PASS |
| 12 | require-only or basename-mention dispatch is rejected | PASS |
| 13 | stored audit body tamper invalidates canonical candidate digest | PASS |
| 14 | apply-time proof tamper is rejected by source-flow recomputation | PASS |
| 15 | unrelated proof row swap is rejected by typed obligation | PASS |
| 16 | fake def-use edge without shared symbol or variable is rejected | PASS |
| 17 | comparison and arrow operators cannot impersonate assignment def-use | PASS |
| 18 | generic canonical role labels cannot satisfy def-use sharing | PASS |
| 19 | same-body assignment def-use rejects reverse source order | PASS |
| 20 | reviewer symbols and consumer-only returned calls cannot impersonate directional def-use | PASS |
| 21 | co-asserted boundary requires both ordered values in one canonical assertion | PASS |
| 22 | static source-string assertion cannot satisfy mutation runtime readback | PASS |
| 23 | static source-string assertion cannot satisfy non-mutation runtime-readback edge | PASS |
| 24 | witness-only token and primary mutation response cannot satisfy independent readback | PASS |
| 25 | explicit REVIEW4 proof-only scaffold cannot satisfy source semantics | PASS |
| 26 | authored edge ranges and generated proof narratives are rejected before normalization | PASS |
| 27 | typed requirement honors explicit deferral without corrupting positive mutations | PASS |
| 28 | Python runtime assertions and case-normalized field identifiers preserve exact semantic binding | PASS |
| 29 | typed negative boundaries recognize exact false field names | PASS |
| 30 | comparison-only body cannot impersonate authoritative mutation | PASS |
| 31 | generic condition cannot hide static source provenance in its enclosing body | PASS |
| 32 | semantic readback labels bind their enclosing check callback instead of a later regex test call | PASS |
| 33 | runtime artifact write then separate file read remains eligible readback | PASS |
| 34 | default object argument brace resolves the real enclosing function body | PASS |
| 35 | same-check token in a different assertion loop cannot satisfy readback | PASS |
| 36 | generic snippet loop cannot satisfy a structural readback token | PASS |
| 37 | whole-file anywhere assertion cannot satisfy structural product readback | PASS |
| 38 | whole-file aliases cannot disguise an anywhere assertion | PASS |
| 39 | literal objects and fixture files cannot impersonate runtime observations | PASS |
| 40 | approval envelope rejects generator-shaped per-row approval claims | PASS |
| 41 | same-route proof row swap cannot bypass strong outcome binding | PASS |
| 42 | mixed positive UI keeps allow outcome and binds explicit negative boundaries | PASS |
| 43 | negative boundary words in assertion messages cannot satisfy the condition oracle | PASS |
| 44 | negative boundaries do not cross unrelated positive save clauses | PASS |
| 45 | same negative condition with different messages is shared ambiguity | PASS |
| 46 | outcome obligation cardinality is possible and stale ledger requires regeneration | PASS |
| 47 | self-declared reports and fixture-derived outcomes are not product runtime readbacks | PASS |
| 48 | auth wrapper fixed mode reaches only its selected workflow oracle | PASS |
| 49 | multiline destructured arrow brace resolves the real enclosing function body | PASS |
| 50 | positive oracle cannot approve deny or redact obligation | PASS |
| 51 | token or adjacent-line changes cannot bypass canonical shared flow detection | PASS |
| 52 | applied independently approved REVIEW4 source flows to canonical implementation manifest | PASS |

### 등록기 최신 단위 재검증

| 번호 | 검사 | 결과 |
| --- | --- | --- |
| 1 | 정상 정식 등록 27개 | PASS |
| 2 | 다른 등록군 추가와 일관된 총계 허용 | PASS |
| 3 | 전체 총계 불일치 거부 | PASS |
| 4 | canonical 등록 수 변경 거부 | PASS |
| 5 | S05 등록 수 변경 거부 | PASS |
| 6 | 등록군 중복 거부 | PASS |
| 7 | 음수 등록 수 거부 | PASS |
| 8 | 소수 등록 수 거부 | PASS |
| 9 | 등록 범위 표 누락 거부 | PASS |
| 10 | 누락 ID | PASS |
| 11 | 중복 ID | PASS |
| 12 | 추가 ID | PASS |
| 13 | 빈 테스트 영역 | PASS |
| 14 | 없는 구현 심볼 | PASS |
| 15 | 없는 테스트 함수 | PASS |
| 16 | 없는 check | PASS |
| 17 | 중복 check ID | PASS |
| 18 | 문서 행 누락 | PASS |
| 19 | 실행 소비자 정상 합성 입력 | PASS |
| 20 | 실제 check 결과 누락 | PASS |
| 21 | EOS assertion 제거와 감소한 summary도 거부 | PASS |
| 22 | 실패 summary | PASS |
| 23 | 성공 summary만으로 PASS 금지 | PASS |
| 24 | 중복 application 결과 | PASS |
| 25 | runtime 로그 전체 누락 | PASS |
| 26 | runtime 시나리오 누락 | PASS |
| 27 | runtime assertion 누락 및 감소 summary | PASS |
| 28 | runtime assertion 중복 및 증가 summary | PASS |
| 29 | runtime summary 실패 | PASS |
| 30 | runtime summary 중복 | PASS |
| 31 | runtime failure marker | PASS |
| 32 | runtime mutation 결과 누락 | PASS |
| 33 | runtime mutation 결과 중복 | PASS |
| 34 | runtime negative summary 실패 | PASS |

### 스크립트 인벤토리

| 번호 | 검사 | 결과 |
| --- | --- | --- |
| 1 | server.sh dispatch targets exist and are executable | PASS |
| 2 | documented server.sh commands resolve to dispatch table | PASS |
| 3 | tracked scripts are classified and referenced | PASS |
| 4 | project inventory delegates script file inventory to this verifier | PASS |
| 5 | project inventory maps verifier families without duplicating dispatch details | PASS |
| 6 | CMake does not define a separate untracked CTest registry | PASS |
| 7 | test entry scripts are reachable from test_all | PASS |
| 8 | auth verifier has no hardcoded test password defaults | PASS |
| 9 | VA EventRecord dispatch verifier fails early and dispatches every poll by default | PASS |
| 10 | critical verifier pass output avoids grouped feature-result wording | PASS |
| 11 | user-facing JS option parsers reject unknown options | PASS |

### 문서 링크(최종 문서 갱신 전)

| 번호 | 검사 | 결과 |
| --- | --- | --- |
| 1 | == Docs link verification summary == - markdown files: 221 - local links: 1003 - local images: 22 - local anchors: 100 - indexed docs: 76 - index coverage exclusions: 134 - failures: 0 | PASS |

### 문서 UI asset 정합성

| 번호 | 검사 | 결과 |
| --- | --- | --- |
| 1 | README uses only representative product UI screenshots | PASS |
| 2 | English README uses English UI screenshots | PASS |
| 3 | UI guide keeps product screenshots in the shared asset set | PASS |
| 4 | docs UI asset policy documents capture rules | PASS |
| 5 | managed UI asset manifest stays complete | PASS |
| 6 | capture script owns every documented UI asset | PASS |
| 7 | docs capture covers current screenshots | PASS |
| 8 | representative screenshot docs do not point at stale visual baselines | PASS |
| 9 | docs UI asset directory contains managed PNG files | PASS |
| 10 | VA documentation images keep full video frame bounds | PASS |

### 중앙 인벤토리의 개별 ID

각 행의 다섯 검사는 이름 존재, UI 필요성 값, 테스트 필요성 값, 테스트 영역 배정,
통과 기준 존재다. 실행 여부는 검사하지 않는다.

| ID | 5개 검사 통과 | 실패 | 결과 |
| --- | ---: | ---: | --- |
| UI-001 | 5 | 0 | PASS |
| UI-002 | 5 | 0 | PASS |
| UI-003 | 5 | 0 | PASS |
| UI-004 | 5 | 0 | PASS |
| UI-005 | 5 | 0 | PASS |
| UI-006 | 5 | 0 | PASS |
| UI-007 | 5 | 0 | PASS |
| UI-008 | 5 | 0 | PASS |
| UI-009 | 5 | 0 | PASS |
| UI-010 | 5 | 0 | PASS |
| UI-011 | 5 | 0 | PASS |
| UI-012 | 5 | 0 | PASS |
| UI-013 | 5 | 0 | PASS |
| UI-014 | 5 | 0 | PASS |
| UI-015 | 5 | 0 | PASS |
| UI-016 | 5 | 0 | PASS |
| UI-017 | 5 | 0 | PASS |
| UI-018 | 5 | 0 | PASS |
| UI-019 | 5 | 0 | PASS |
| UI-020 | 5 | 0 | PASS |
| UI-021 | 5 | 0 | PASS |
| UI-022 | 5 | 0 | PASS |
| UI-023 | 5 | 0 | PASS |
| UI-024 | 5 | 0 | PASS |
| UI-025 | 5 | 0 | PASS |
| UI-026 | 5 | 0 | PASS |
| UI-027 | 5 | 0 | PASS |
| UI-028 | 5 | 0 | PASS |
| UI-029 | 5 | 0 | PASS |
| UI-030 | 5 | 0 | PASS |
| UI-031 | 5 | 0 | PASS |
| UI-032 | 5 | 0 | PASS |
| UI-033 | 5 | 0 | PASS |
| UI-034 | 5 | 0 | PASS |
| UI-035 | 5 | 0 | PASS |
| UI-036 | 5 | 0 | PASS |
| UI-037 | 5 | 0 | PASS |
| UI-038 | 5 | 0 | PASS |
| UI-039 | 5 | 0 | PASS |
| UI-040 | 5 | 0 | PASS |
| UI-041 | 5 | 0 | PASS |
| UI-042 | 5 | 0 | PASS |
| UI-043 | 5 | 0 | PASS |
| UI-044 | 5 | 0 | PASS |
| UI-045 | 5 | 0 | PASS |
| UI-046 | 5 | 0 | PASS |
| UI-047 | 5 | 0 | PASS |
| UI-048 | 5 | 0 | PASS |
| UI-049 | 5 | 0 | PASS |
| UI-050 | 5 | 0 | PASS |
| UI-051 | 5 | 0 | PASS |
| UI-052 | 5 | 0 | PASS |
| UI-053 | 5 | 0 | PASS |
| UI-054 | 5 | 0 | PASS |
| UI-055 | 5 | 0 | PASS |
| UI-056 | 5 | 0 | PASS |
| UI-057 | 5 | 0 | PASS |
| UI-058 | 5 | 0 | PASS |
| UI-059 | 5 | 0 | PASS |
| UI-060 | 5 | 0 | PASS |
| UI-061 | 5 | 0 | PASS |
| UI-062 | 5 | 0 | PASS |
| UI-063 | 5 | 0 | PASS |
| UI-064 | 5 | 0 | PASS |
| UI-065 | 5 | 0 | PASS |
| UI-066 | 5 | 0 | PASS |
| UI-067 | 5 | 0 | PASS |
| UI-068 | 5 | 0 | PASS |
| UI-069 | 5 | 0 | PASS |
| UI-070 | 5 | 0 | PASS |
| UI-071 | 5 | 0 | PASS |
| UI-072 | 5 | 0 | PASS |
| UI-073 | 5 | 0 | PASS |
| UI-074 | 5 | 0 | PASS |
| UI-075 | 5 | 0 | PASS |
| UI-076 | 5 | 0 | PASS |
| UI-077 | 5 | 0 | PASS |
| UI-078 | 5 | 0 | PASS |
| UI-079 | 5 | 0 | PASS |
| UI-080 | 5 | 0 | PASS |
| UI-081 | 5 | 0 | PASS |
| UI-082 | 5 | 0 | PASS |
| UI-083 | 5 | 0 | PASS |
| UI-084 | 5 | 0 | PASS |
| UI-085 | 5 | 0 | PASS |
| UI-086 | 5 | 0 | PASS |
| UI-087 | 5 | 0 | PASS |
| UI-088 | 5 | 0 | PASS |
| UI-089 | 5 | 0 | PASS |
| UI-090 | 5 | 0 | PASS |
| UI-091 | 5 | 0 | PASS |
| UI-092 | 5 | 0 | PASS |
| UI-093 | 5 | 0 | PASS |
| UI-094 | 5 | 0 | PASS |
| UI-095 | 5 | 0 | PASS |
| UI-096 | 5 | 0 | PASS |
| UI-097 | 5 | 0 | PASS |
| UI-098 | 5 | 0 | PASS |
| UI-099 | 5 | 0 | PASS |
| UI-100 | 5 | 0 | PASS |
| UI-101 | 5 | 0 | PASS |
| UI-102 | 5 | 0 | PASS |
| UI-103 | 5 | 0 | PASS |
| UI-104 | 5 | 0 | PASS |
| UI-105 | 5 | 0 | PASS |
| UI-106 | 5 | 0 | PASS |
| UI-107 | 5 | 0 | PASS |
| UI-108 | 5 | 0 | PASS |
| UI-109 | 5 | 0 | PASS |
| UI-110 | 5 | 0 | PASS |
| UI-111 | 5 | 0 | PASS |
| UI-112 | 5 | 0 | PASS |
| UI-113 | 5 | 0 | PASS |
| UI-114 | 5 | 0 | PASS |
| UI-115 | 5 | 0 | PASS |
| AUTH-001 | 5 | 0 | PASS |
| AUTH-002 | 5 | 0 | PASS |
| AUTH-003 | 5 | 0 | PASS |
| AUTH-004 | 5 | 0 | PASS |
| AUTH-005 | 5 | 0 | PASS |
| AUTH-006 | 5 | 0 | PASS |
| AUTH-007 | 5 | 0 | PASS |
| AUTH-008 | 5 | 0 | PASS |
| AUTH-009 | 5 | 0 | PASS |
| AUTH-010 | 5 | 0 | PASS |
| AUTH-011 | 5 | 0 | PASS |
| AUTH-012 | 5 | 0 | PASS |
| AUTH-013 | 5 | 0 | PASS |
| AUTH-014 | 5 | 0 | PASS |
| AUTH-015 | 5 | 0 | PASS |
| AUTH-016 | 5 | 0 | PASS |
| AUTH-017 | 5 | 0 | PASS |
| AUTH-018 | 5 | 0 | PASS |
| AUTH-019 | 5 | 0 | PASS |
| AUTH-020 | 5 | 0 | PASS |
| AUTH-021 | 5 | 0 | PASS |
| AUTH-022 | 5 | 0 | PASS |
| AUTH-023 | 5 | 0 | PASS |
| AUTH-024 | 5 | 0 | PASS |
| AUTH-025 | 5 | 0 | PASS |
| AUTH-026 | 5 | 0 | PASS |
| AUTH-027 | 5 | 0 | PASS |
| AUTH-028 | 5 | 0 | PASS |
| AUTH-029 | 5 | 0 | PASS |
| AUTH-030 | 5 | 0 | PASS |
| AUTH-031 | 5 | 0 | PASS |
| AUTH-032 | 5 | 0 | PASS |
| AUTH-033 | 5 | 0 | PASS |
| AUTH-034 | 5 | 0 | PASS |
| AUTH-035 | 5 | 0 | PASS |
| AUTH-036 | 5 | 0 | PASS |
| AUTH-037 | 5 | 0 | PASS |
| AUTH-038 | 5 | 0 | PASS |
| AUTH-039 | 5 | 0 | PASS |
| AUTH-040 | 5 | 0 | PASS |
| AUTH-041 | 5 | 0 | PASS |
| AUTH-042 | 5 | 0 | PASS |
| SRC-001 | 5 | 0 | PASS |
| SRC-002 | 5 | 0 | PASS |
| SRC-003 | 5 | 0 | PASS |
| SRC-004 | 5 | 0 | PASS |
| SRC-005 | 5 | 0 | PASS |
| SRC-006 | 5 | 0 | PASS |
| SRC-007 | 5 | 0 | PASS |
| SRC-008 | 5 | 0 | PASS |
| SRC-009 | 5 | 0 | PASS |
| SRC-010 | 5 | 0 | PASS |
| SRC-011 | 5 | 0 | PASS |
| SRC-012 | 5 | 0 | PASS |
| SRC-013 | 5 | 0 | PASS |
| SRC-014 | 5 | 0 | PASS |
| SRC-015 | 5 | 0 | PASS |
| SRC-016 | 5 | 0 | PASS |
| SRC-017 | 5 | 0 | PASS |
| SRC-018 | 5 | 0 | PASS |
| SRC-019 | 5 | 0 | PASS |
| SRC-020 | 5 | 0 | PASS |
| SRC-021 | 5 | 0 | PASS |
| SRC-022 | 5 | 0 | PASS |
| SRC-023 | 5 | 0 | PASS |
| SRC-024 | 5 | 0 | PASS |
| SRC-025 | 5 | 0 | PASS |
| SRC-026 | 5 | 0 | PASS |
| SRC-027 | 5 | 0 | PASS |
| SRC-028 | 5 | 0 | PASS |
| SRC-029 | 5 | 0 | PASS |
| SRC-030 | 5 | 0 | PASS |
| SRC-031 | 5 | 0 | PASS |
| SRC-032 | 5 | 0 | PASS |
| SRC-033 | 5 | 0 | PASS |
| SRC-034 | 5 | 0 | PASS |
| SRC-035 | 5 | 0 | PASS |
| SRC-036 | 5 | 0 | PASS |
| SRC-037 | 5 | 0 | PASS |
| SRC-038 | 5 | 0 | PASS |
| SRC-039 | 5 | 0 | PASS |
| SRC-040 | 5 | 0 | PASS |
| SRC-041 | 5 | 0 | PASS |
| SRC-042 | 5 | 0 | PASS |
| SRC-043 | 5 | 0 | PASS |
| SRC-044 | 5 | 0 | PASS |
| SRC-045 | 5 | 0 | PASS |
| SRC-046 | 5 | 0 | PASS |
| SRC-047 | 5 | 0 | PASS |
| SRC-048 | 5 | 0 | PASS |
| SRC-049 | 5 | 0 | PASS |
| SRC-050 | 5 | 0 | PASS |
| SRC-051 | 5 | 0 | PASS |
| SRC-052 | 5 | 0 | PASS |
| SRC-053 | 5 | 0 | PASS |
| SRC-054 | 5 | 0 | PASS |
| SRC-055 | 5 | 0 | PASS |
| SRC-056 | 5 | 0 | PASS |
| SRC-057 | 5 | 0 | PASS |
| SRC-058 | 5 | 0 | PASS |
| SRC-059 | 5 | 0 | PASS |
| SRC-060 | 5 | 0 | PASS |
| SRC-061 | 5 | 0 | PASS |
| SRC-062 | 5 | 0 | PASS |
| SRC-063 | 5 | 0 | PASS |
| SRC-064 | 5 | 0 | PASS |
| SRC-065 | 5 | 0 | PASS |
| SRC-066 | 5 | 0 | PASS |
| SRC-067 | 5 | 0 | PASS |
| SRC-068 | 5 | 0 | PASS |
| RULE-001 | 5 | 0 | PASS |
| RULE-002 | 5 | 0 | PASS |
| RULE-003 | 5 | 0 | PASS |
| RULE-004 | 5 | 0 | PASS |
| RULE-005 | 5 | 0 | PASS |
| RULE-006 | 5 | 0 | PASS |
| RULE-007 | 5 | 0 | PASS |
| RULE-008 | 5 | 0 | PASS |
| RULE-009 | 5 | 0 | PASS |
| RULE-010 | 5 | 0 | PASS |
| RULE-011 | 5 | 0 | PASS |
| RULE-012 | 5 | 0 | PASS |
| RULE-013 | 5 | 0 | PASS |
| RULE-014 | 5 | 0 | PASS |
| RULE-015 | 5 | 0 | PASS |
| RULE-016 | 5 | 0 | PASS |
| RULE-017 | 5 | 0 | PASS |
| RULE-018 | 5 | 0 | PASS |
| RULE-019 | 5 | 0 | PASS |
| RULE-020 | 5 | 0 | PASS |
| RULE-021 | 5 | 0 | PASS |
| RULE-022 | 5 | 0 | PASS |
| RULE-023 | 5 | 0 | PASS |
| RULE-024 | 5 | 0 | PASS |
| RULE-025 | 5 | 0 | PASS |
| RULE-026 | 5 | 0 | PASS |
| RULE-027 | 5 | 0 | PASS |
| RULE-028 | 5 | 0 | PASS |
| RULE-029 | 5 | 0 | PASS |
| RULE-030 | 5 | 0 | PASS |
| RULE-031 | 5 | 0 | PASS |
| RULE-032 | 5 | 0 | PASS |
| RULE-033 | 5 | 0 | PASS |
| RULE-034 | 5 | 0 | PASS |
| RULE-035 | 5 | 0 | PASS |
| RULE-036 | 5 | 0 | PASS |
| RULE-037 | 5 | 0 | PASS |
| RULE-038 | 5 | 0 | PASS |
| RULE-039 | 5 | 0 | PASS |
| RULE-040 | 5 | 0 | PASS |
| RULE-041 | 5 | 0 | PASS |
| RULE-042 | 5 | 0 | PASS |
| RULE-043 | 5 | 0 | PASS |
| RULE-044 | 5 | 0 | PASS |
| RULE-045 | 5 | 0 | PASS |
| RULE-046 | 5 | 0 | PASS |
| RULE-047 | 5 | 0 | PASS |
| RULE-048 | 5 | 0 | PASS |
| RULE-049 | 5 | 0 | PASS |
| RULE-050 | 5 | 0 | PASS |
| RULE-051 | 5 | 0 | PASS |
| RULE-052 | 5 | 0 | PASS |
| RULE-053 | 5 | 0 | PASS |
| RULE-054 | 5 | 0 | PASS |
| RULE-055 | 5 | 0 | PASS |
| RULE-056 | 5 | 0 | PASS |
| RULE-057 | 5 | 0 | PASS |
| RULE-058 | 5 | 0 | PASS |
| RULE-059 | 5 | 0 | PASS |
| RULE-060 | 5 | 0 | PASS |
| RULE-061 | 5 | 0 | PASS |
| RULE-062 | 5 | 0 | PASS |
| RULE-063 | 5 | 0 | PASS |
| RULE-064 | 5 | 0 | PASS |
| RULE-065 | 5 | 0 | PASS |
| RULE-066 | 5 | 0 | PASS |
| RULE-067 | 5 | 0 | PASS |
| RULE-068 | 5 | 0 | PASS |
| RULE-069 | 5 | 0 | PASS |
| RULE-070 | 5 | 0 | PASS |
| RULE-071 | 5 | 0 | PASS |
| RULE-072 | 5 | 0 | PASS |
| RULE-073 | 5 | 0 | PASS |
| RULE-074 | 5 | 0 | PASS |
| RULE-075 | 5 | 0 | PASS |
| RULE-076 | 5 | 0 | PASS |
| RULE-077 | 5 | 0 | PASS |
| RULE-078 | 5 | 0 | PASS |
| RULE-079 | 5 | 0 | PASS |
| RULE-080 | 5 | 0 | PASS |
| RULE-081 | 5 | 0 | PASS |
| RULE-082 | 5 | 0 | PASS |
| RULE-083 | 5 | 0 | PASS |
| RULE-084 | 5 | 0 | PASS |
| RULE-085 | 5 | 0 | PASS |
| RULE-086 | 5 | 0 | PASS |
| RULE-087 | 5 | 0 | PASS |
| RULE-088 | 5 | 0 | PASS |
| RULE-089 | 5 | 0 | PASS |
| RULE-090 | 5 | 0 | PASS |
| RULE-091 | 5 | 0 | PASS |
| RULE-092 | 5 | 0 | PASS |
| RULE-093 | 5 | 0 | PASS |
| RULE-094 | 5 | 0 | PASS |
| RULE-095 | 5 | 0 | PASS |
| RULE-096 | 5 | 0 | PASS |
| RULE-097 | 5 | 0 | PASS |
| RULE-098 | 5 | 0 | PASS |
| RULE-099 | 5 | 0 | PASS |
| RULE-100 | 5 | 0 | PASS |
| RULE-101 | 5 | 0 | PASS |
| RULE-102 | 5 | 0 | PASS |
| RULE-103 | 5 | 0 | PASS |
| RULE-104 | 5 | 0 | PASS |
| RULE-105 | 5 | 0 | PASS |
| RULE-106 | 5 | 0 | PASS |
| RULE-107 | 5 | 0 | PASS |
| RULE-108 | 5 | 0 | PASS |
| RULE-109 | 5 | 0 | PASS |
| RULE-110 | 5 | 0 | PASS |
| RULE-111 | 5 | 0 | PASS |
| RULE-112 | 5 | 0 | PASS |
| EVT-001 | 5 | 0 | PASS |
| EVT-002 | 5 | 0 | PASS |
| EVT-003 | 5 | 0 | PASS |
| EVT-004 | 5 | 0 | PASS |
| EVT-005 | 5 | 0 | PASS |
| EVT-006 | 5 | 0 | PASS |
| EVT-007 | 5 | 0 | PASS |
| EVT-008 | 5 | 0 | PASS |
| EVT-009 | 5 | 0 | PASS |
| EVT-010 | 5 | 0 | PASS |
| EVT-011 | 5 | 0 | PASS |
| EVT-012 | 5 | 0 | PASS |
| EVT-013 | 5 | 0 | PASS |
| EVT-014 | 5 | 0 | PASS |
| EVT-015 | 5 | 0 | PASS |
| EVT-016 | 5 | 0 | PASS |
| EVT-017 | 5 | 0 | PASS |
| EVT-018 | 5 | 0 | PASS |
| EVT-019 | 5 | 0 | PASS |
| EVT-020 | 5 | 0 | PASS |
| EVT-021 | 5 | 0 | PASS |
| EVT-022 | 5 | 0 | PASS |
| EVT-023 | 5 | 0 | PASS |
| EVT-024 | 5 | 0 | PASS |
| EVT-025 | 5 | 0 | PASS |
| EVT-026 | 5 | 0 | PASS |
| EVT-027 | 5 | 0 | PASS |
| EVT-028 | 5 | 0 | PASS |
| EVT-029 | 5 | 0 | PASS |
| EVT-030 | 5 | 0 | PASS |
| EVT-031 | 5 | 0 | PASS |
| EVT-032 | 5 | 0 | PASS |
| EVT-033 | 5 | 0 | PASS |
| EVT-034 | 5 | 0 | PASS |
| EVT-035 | 5 | 0 | PASS |
| EVT-036 | 5 | 0 | PASS |
| EVT-037 | 5 | 0 | PASS |
| EVT-038 | 5 | 0 | PASS |
| EVT-039 | 5 | 0 | PASS |
| EVT-040 | 5 | 0 | PASS |
| EVT-041 | 5 | 0 | PASS |
| EVT-042 | 5 | 0 | PASS |
| EVT-043 | 5 | 0 | PASS |
| EVT-044 | 5 | 0 | PASS |
| EVT-045 | 5 | 0 | PASS |
| EVT-046 | 5 | 0 | PASS |
| EVT-047 | 5 | 0 | PASS |
| EVT-048 | 5 | 0 | PASS |
| EVT-049 | 5 | 0 | PASS |
| EVT-050 | 5 | 0 | PASS |
| EVT-051 | 5 | 0 | PASS |
| EVT-052 | 5 | 0 | PASS |
| EVT-053 | 5 | 0 | PASS |
| EVT-054 | 5 | 0 | PASS |
| EVT-055 | 5 | 0 | PASS |
| EVT-056 | 5 | 0 | PASS |
| EVT-057 | 5 | 0 | PASS |
| EVT-058 | 5 | 0 | PASS |
| EVT-059 | 5 | 0 | PASS |
| EVT-060 | 5 | 0 | PASS |
| EVT-061 | 5 | 0 | PASS |
| EVT-062 | 5 | 0 | PASS |
| EVT-063 | 5 | 0 | PASS |
| EVT-064 | 5 | 0 | PASS |
| EVT-065 | 5 | 0 | PASS |
| EVT-066 | 5 | 0 | PASS |
| EVT-067 | 5 | 0 | PASS |
| EVT-068 | 5 | 0 | PASS |
| EVT-069 | 5 | 0 | PASS |
| EVT-070 | 5 | 0 | PASS |
| EVT-071 | 5 | 0 | PASS |
| EVT-072 | 5 | 0 | PASS |
| EVT-073 | 5 | 0 | PASS |
| EVT-074 | 5 | 0 | PASS |
| EVT-075 | 5 | 0 | PASS |
| EVT-076 | 5 | 0 | PASS |
| EVT-077 | 5 | 0 | PASS |
| EVT-078 | 5 | 0 | PASS |
| EVT-079 | 5 | 0 | PASS |
| EVT-080 | 5 | 0 | PASS |
| EVT-081 | 5 | 0 | PASS |
| EVT-082 | 5 | 0 | PASS |
| EVT-083 | 5 | 0 | PASS |
| EVT-084 | 5 | 0 | PASS |
| EVT-085 | 5 | 0 | PASS |
| EVT-086 | 5 | 0 | PASS |
| EVT-087 | 5 | 0 | PASS |
| CLIENT-001 | 5 | 0 | PASS |
| CLIENT-002 | 5 | 0 | PASS |
| CLIENT-003 | 5 | 0 | PASS |
| CLIENT-004 | 5 | 0 | PASS |
| CLIENT-005 | 5 | 0 | PASS |
| CLIENT-006 | 5 | 0 | PASS |
| CLIENT-007 | 5 | 0 | PASS |
| CLIENT-008 | 5 | 0 | PASS |
| CLIENT-009 | 5 | 0 | PASS |
| CLIENT-010 | 5 | 0 | PASS |
| CLIENT-011 | 5 | 0 | PASS |
| CLIENT-012 | 5 | 0 | PASS |
| CLIENT-013 | 5 | 0 | PASS |
| CLIENT-014 | 5 | 0 | PASS |
| CLIENT-015 | 5 | 0 | PASS |
| CLIENT-016 | 5 | 0 | PASS |
| CLIENT-017 | 5 | 0 | PASS |
| CLIENT-018 | 5 | 0 | PASS |
| CLIENT-019 | 5 | 0 | PASS |
| CLIENT-020 | 5 | 0 | PASS |
| CLIENT-021 | 5 | 0 | PASS |
| CLIENT-022 | 5 | 0 | PASS |
| CLIENT-023 | 5 | 0 | PASS |
| CLIENT-024 | 5 | 0 | PASS |
| CLIENT-025 | 5 | 0 | PASS |
| CLIENT-026 | 5 | 0 | PASS |
| CLIENT-027 | 5 | 0 | PASS |
| CLIENT-028 | 5 | 0 | PASS |
| CLIENT-029 | 5 | 0 | PASS |
| CLIENT-030 | 5 | 0 | PASS |
| CLIENT-031 | 5 | 0 | PASS |
| CLIENT-032 | 5 | 0 | PASS |
| CLIENT-033 | 5 | 0 | PASS |
| CLIENT-034 | 5 | 0 | PASS |
| CLIENT-035 | 5 | 0 | PASS |
| CLIENT-036 | 5 | 0 | PASS |
| CLIENT-037 | 5 | 0 | PASS |
| CLIENT-038 | 5 | 0 | PASS |
| CLIENT-039 | 5 | 0 | PASS |
| CLIENT-040 | 5 | 0 | PASS |
| CLIENT-041 | 5 | 0 | PASS |
| CLIENT-042 | 5 | 0 | PASS |
| MEDIA-001 | 5 | 0 | PASS |
| MEDIA-002 | 5 | 0 | PASS |
| MEDIA-003 | 5 | 0 | PASS |
| MEDIA-004 | 5 | 0 | PASS |
| MEDIA-005 | 5 | 0 | PASS |
| MEDIA-006 | 5 | 0 | PASS |
| MEDIA-007 | 5 | 0 | PASS |
| MEDIA-008 | 5 | 0 | PASS |
| MEDIA-009 | 5 | 0 | PASS |
| MEDIA-010 | 5 | 0 | PASS |
| MEDIA-011 | 5 | 0 | PASS |
| MEDIA-012 | 5 | 0 | PASS |
| MEDIA-013 | 5 | 0 | PASS |
| MEDIA-014 | 5 | 0 | PASS |
| MEDIA-015 | 5 | 0 | PASS |
| MEDIA-016 | 5 | 0 | PASS |
| MEDIA-017 | 5 | 0 | PASS |
| MEDIA-018 | 5 | 0 | PASS |
| MEDIA-019 | 5 | 0 | PASS |
| MEDIA-020 | 5 | 0 | PASS |
| MEDIA-021 | 5 | 0 | PASS |
| MEDIA-022 | 5 | 0 | PASS |
| MEDIA-023 | 5 | 0 | PASS |
| MEDIA-024 | 5 | 0 | PASS |
| MEDIA-025 | 5 | 0 | PASS |
| MEDIA-026 | 5 | 0 | PASS |
| MEDIA-027 | 5 | 0 | PASS |
| LAB-001 | 5 | 0 | PASS |
| LAB-002 | 5 | 0 | PASS |
| LAB-003 | 5 | 0 | PASS |
| LAB-004 | 5 | 0 | PASS |
| LAB-005 | 5 | 0 | PASS |
| LAB-006 | 5 | 0 | PASS |
| LAB-007 | 5 | 0 | PASS |
| LAB-008 | 5 | 0 | PASS |
| LAB-009 | 5 | 0 | PASS |
| LAB-010 | 5 | 0 | PASS |
| LAB-011 | 5 | 0 | PASS |
| LAB-012 | 5 | 0 | PASS |
| LAB-013 | 5 | 0 | PASS |
| LAB-014 | 5 | 0 | PASS |
| LAB-015 | 5 | 0 | PASS |
| LAB-016 | 5 | 0 | PASS |
| LAB-017 | 5 | 0 | PASS |
| LAB-018 | 5 | 0 | PASS |
| LAB-019 | 5 | 0 | PASS |
| LAB-020 | 5 | 0 | PASS |
| LAB-021 | 5 | 0 | PASS |
| LAB-022 | 5 | 0 | PASS |
| LAB-023 | 5 | 0 | PASS |
| LAB-024 | 5 | 0 | PASS |
| LAB-025 | 5 | 0 | PASS |
| LAB-026 | 5 | 0 | PASS |
| LAB-027 | 5 | 0 | PASS |
| LAB-028 | 5 | 0 | PASS |
| LAB-029 | 5 | 0 | PASS |
| LAB-030 | 5 | 0 | PASS |
| LAB-031 | 5 | 0 | PASS |
| LAB-032 | 5 | 0 | PASS |
| LAB-033 | 5 | 0 | PASS |
| LAB-034 | 5 | 0 | PASS |
| LAB-035 | 5 | 0 | PASS |
| LAB-036 | 5 | 0 | PASS |
| LAB-037 | 5 | 0 | PASS |
| LAB-038 | 5 | 0 | PASS |
| LAB-039 | 5 | 0 | PASS |
| LAB-040 | 5 | 0 | PASS |
| LAB-041 | 5 | 0 | PASS |
| LAB-042 | 5 | 0 | PASS |
| LAB-043 | 5 | 0 | PASS |
| LAB-044 | 5 | 0 | PASS |
| LAB-045 | 5 | 0 | PASS |
| LAB-046 | 5 | 0 | PASS |
| LAB-047 | 5 | 0 | PASS |
| LAB-048 | 5 | 0 | PASS |
| LAB-049 | 5 | 0 | PASS |
| LAB-050 | 5 | 0 | PASS |
| LAB-051 | 5 | 0 | PASS |
| LAB-052 | 5 | 0 | PASS |
| LAB-053 | 5 | 0 | PASS |
| LAB-054 | 5 | 0 | PASS |
| LAB-055 | 5 | 0 | PASS |
| LAB-056 | 5 | 0 | PASS |
| LAB-057 | 5 | 0 | PASS |
| LAB-058 | 5 | 0 | PASS |
| LAB-059 | 5 | 0 | PASS |
| LAB-060 | 5 | 0 | PASS |
| LAB-061 | 5 | 0 | PASS |
| LAB-062 | 5 | 0 | PASS |
| LAB-063 | 5 | 0 | PASS |
| LAB-064 | 5 | 0 | PASS |
| LAB-065 | 5 | 0 | PASS |
| LAB-066 | 5 | 0 | PASS |
| LAB-067 | 5 | 0 | PASS |
| LAB-068 | 5 | 0 | PASS |
| LAB-069 | 5 | 0 | PASS |
| LAB-070 | 5 | 0 | PASS |
| LAB-071 | 5 | 0 | PASS |
| LAB-072 | 5 | 0 | PASS |
| LAB-073 | 5 | 0 | PASS |
| LAB-074 | 5 | 0 | PASS |
| LAB-075 | 5 | 0 | PASS |
| LAB-076 | 5 | 0 | PASS |
| LAB-077 | 5 | 0 | PASS |
| LAB-078 | 5 | 0 | PASS |
| LAB-079 | 5 | 0 | PASS |
| LAB-080 | 5 | 0 | PASS |
| LAB-081 | 5 | 0 | PASS |
| LAB-082 | 5 | 0 | PASS |
| LAB-083 | 5 | 0 | PASS |
| LAB-084 | 5 | 0 | PASS |
| LAB-085 | 5 | 0 | PASS |
| LAB-086 | 5 | 0 | PASS |
| LAB-087 | 5 | 0 | PASS |
| LAB-088 | 5 | 0 | PASS |
| LAB-089 | 5 | 0 | PASS |
| LAB-090 | 5 | 0 | PASS |
| LAB-091 | 5 | 0 | PASS |
| LAB-092 | 5 | 0 | PASS |
| LAB-093 | 5 | 0 | PASS |
| LAB-094 | 5 | 0 | PASS |
| LAB-095 | 5 | 0 | PASS |
| LAB-096 | 5 | 0 | PASS |
| LAB-097 | 5 | 0 | PASS |
| LAB-098 | 5 | 0 | PASS |
| LAB-099 | 5 | 0 | PASS |
| LAB-100 | 5 | 0 | PASS |
| LAB-101 | 5 | 0 | PASS |
| LAB-102 | 5 | 0 | PASS |
| LAB-103 | 5 | 0 | PASS |
| LAB-104 | 5 | 0 | PASS |
| LAB-105 | 5 | 0 | PASS |
| LAB-106 | 5 | 0 | PASS |
| LAB-107 | 5 | 0 | PASS |
| LAB-108 | 5 | 0 | PASS |
| LAB-109 | 5 | 0 | PASS |
| LAB-110 | 5 | 0 | PASS |
| LAB-111 | 5 | 0 | PASS |
| LAB-112 | 5 | 0 | PASS |
| LAB-113 | 5 | 0 | PASS |
| LAB-114 | 5 | 0 | PASS |
| LAB-115 | 5 | 0 | PASS |
| LAB-116 | 5 | 0 | PASS |
| LAB-117 | 5 | 0 | PASS |
| LAB-118 | 5 | 0 | PASS |
| LAB-119 | 5 | 0 | PASS |
| LAB-120 | 5 | 0 | PASS |
| LAB-121 | 5 | 0 | PASS |
| LAB-122 | 5 | 0 | PASS |
| LAB-123 | 5 | 0 | PASS |
| LAB-124 | 5 | 0 | PASS |
| LAB-125 | 5 | 0 | PASS |
| LAB-126 | 5 | 0 | PASS |
| SAFE-001 | 5 | 0 | PASS |
| SAFE-002 | 5 | 0 | PASS |
| SAFE-003 | 5 | 0 | PASS |
| SAFE-004 | 5 | 0 | PASS |
| SAFE-005 | 5 | 0 | PASS |
| SAFE-006 | 5 | 0 | PASS |
| SAFE-007 | 5 | 0 | PASS |
| SAFE-008 | 5 | 0 | PASS |
| SAFE-009 | 5 | 0 | PASS |
| SAFE-010 | 5 | 0 | PASS |
| SAFE-011 | 5 | 0 | PASS |
| SAFE-012 | 5 | 0 | PASS |
| SAFE-013 | 5 | 0 | PASS |
| SAFE-014 | 5 | 0 | PASS |
| SAFE-015 | 5 | 0 | PASS |
| SAFE-016 | 5 | 0 | PASS |
| SAFE-017 | 5 | 0 | PASS |
| SAFE-018 | 5 | 0 | PASS |
| SAFE-019 | 5 | 0 | PASS |
| SAFE-020 | 5 | 0 | PASS |
| SAFE-021 | 5 | 0 | PASS |
| SAFE-022 | 5 | 0 | PASS |
| SAFE-023 | 5 | 0 | PASS |
| SAFE-024 | 5 | 0 | PASS |
| SAFE-025 | 5 | 0 | PASS |
| SAFE-026 | 5 | 0 | PASS |
| SAFE-027 | 5 | 0 | PASS |
| SAFE-028 | 5 | 0 | PASS |
| SAFE-029 | 5 | 0 | PASS |
| SAFE-030 | 5 | 0 | PASS |
| SAFE-031 | 5 | 0 | PASS |
| SAFE-032 | 5 | 0 | PASS |
| SAFE-033 | 5 | 0 | PASS |
| SAFE-034 | 5 | 0 | PASS |
| SAFE-035 | 5 | 0 | PASS |
| SAFE-036 | 5 | 0 | PASS |
| SAFE-037 | 5 | 0 | PASS |
| SAFE-038 | 5 | 0 | PASS |
| SAFE-039 | 5 | 0 | PASS |
| SAFE-040 | 5 | 0 | PASS |
| SAFE-041 | 5 | 0 | PASS |
| SAFE-042 | 5 | 0 | PASS |
| SAFE-043 | 5 | 0 | PASS |
| SAFE-044 | 5 | 0 | PASS |
| SAFE-045 | 5 | 0 | PASS |
| SAFE-046 | 5 | 0 | PASS |
| SAFE-047 | 5 | 0 | PASS |
| SAFE-048 | 5 | 0 | PASS |
| SAFE-049 | 5 | 0 | PASS |
| SAFE-050 | 5 | 0 | PASS |
| SAFE-051 | 5 | 0 | PASS |
| SAFE-052 | 5 | 0 | PASS |
| SAFE-053 | 5 | 0 | PASS |
| SAFE-054 | 5 | 0 | PASS |
| SAFE-055 | 5 | 0 | PASS |
| SAFE-056 | 5 | 0 | PASS |
| SAFE-057 | 5 | 0 | PASS |
| SAFE-058 | 5 | 0 | PASS |
| SAFE-059 | 5 | 0 | PASS |
| SAFE-060 | 5 | 0 | PASS |
| SAFE-061 | 5 | 0 | PASS |
| SAFE-062 | 5 | 0 | PASS |
| SAFE-063 | 5 | 0 | PASS |
| SAFE-064 | 5 | 0 | PASS |
| SAFE-065 | 5 | 0 | PASS |
| SAFE-066 | 5 | 0 | PASS |
| SAFE-067 | 5 | 0 | PASS |
| SAFE-068 | 5 | 0 | PASS |
| SAFE-069 | 5 | 0 | PASS |
| SAFE-070 | 5 | 0 | PASS |
| SAFE-071 | 5 | 0 | PASS |
| SAFE-072 | 5 | 0 | PASS |
| SAFE-073 | 5 | 0 | PASS |
| SAFE-074 | 5 | 0 | PASS |
| SAFE-075 | 5 | 0 | PASS |
| SAFE-076 | 5 | 0 | PASS |
| SAFE-077 | 5 | 0 | PASS |
| SAFE-078 | 5 | 0 | PASS |
| SAFE-079 | 5 | 0 | PASS |
| SAFE-080 | 5 | 0 | PASS |
| SAFE-081 | 5 | 0 | PASS |
| SAFE-082 | 5 | 0 | PASS |
| SAFE-083 | 5 | 0 | PASS |
| SAFE-084 | 5 | 0 | PASS |
| SAFE-085 | 5 | 0 | PASS |
| SAFE-086 | 5 | 0 | PASS |
| SAFE-087 | 5 | 0 | PASS |
| SAFE-088 | 5 | 0 | PASS |
| SAFE-089 | 5 | 0 | PASS |
| SAFE-090 | 5 | 0 | PASS |
| SAFE-091 | 5 | 0 | PASS |
| SAFE-092 | 5 | 0 | PASS |
| SAFE-093 | 5 | 0 | PASS |
| SAFE-094 | 5 | 0 | PASS |
| SAFE-095 | 5 | 0 | PASS |
| SAFE-096 | 5 | 0 | PASS |
| SAFE-097 | 5 | 0 | PASS |
| SAFE-098 | 5 | 0 | PASS |
| SAFE-099 | 5 | 0 | PASS |
| SAFE-100 | 5 | 0 | PASS |
| SAFE-101 | 5 | 0 | PASS |
| SAFE-102 | 5 | 0 | PASS |
| SAFE-103 | 5 | 0 | PASS |
| SAFE-104 | 5 | 0 | PASS |
| SAFE-105 | 5 | 0 | PASS |
| SAFE-106 | 5 | 0 | PASS |
| SAFE-107 | 5 | 0 | PASS |
| SAFE-108 | 5 | 0 | PASS |
| SAFE-109 | 5 | 0 | PASS |
| SAFE-110 | 5 | 0 | PASS |
| SAFE-111 | 5 | 0 | PASS |
| SAFE-112 | 5 | 0 | PASS |
| SAFE-113 | 5 | 0 | PASS |
| SAFE-114 | 5 | 0 | PASS |
| SAFE-115 | 5 | 0 | PASS |
| SAFE-116 | 5 | 0 | PASS |
| SAFE-117 | 5 | 0 | PASS |
| SAFE-118 | 5 | 0 | PASS |
| SAFE-119 | 5 | 0 | PASS |
| SAFE-120 | 5 | 0 | PASS |
| SAFE-121 | 5 | 0 | PASS |
| SAFE-122 | 5 | 0 | PASS |
| SAFE-123 | 5 | 0 | PASS |
| SAFE-124 | 5 | 0 | PASS |
| SAFE-125 | 5 | 0 | PASS |
| SAFE-126 | 5 | 0 | PASS |
| SAFE-127 | 5 | 0 | PASS |
| SAFE-128 | 5 | 0 | PASS |
| SAFE-129 | 5 | 0 | PASS |
| SAFE-130 | 5 | 0 | PASS |
| SAFE-131 | 5 | 0 | PASS |
| SAFE-132 | 5 | 0 | PASS |
| SAFE-133 | 5 | 0 | PASS |
| SAFE-134 | 5 | 0 | PASS |
| SAFE-135 | 5 | 0 | PASS |
| SAFE-136 | 5 | 0 | PASS |
| SAFE-137 | 5 | 0 | PASS |
| SAFE-138 | 5 | 0 | PASS |
| SAFE-139 | 5 | 0 | PASS |
| SAFE-140 | 5 | 0 | PASS |
| SAFE-141 | 5 | 0 | PASS |
| SAFE-142 | 5 | 0 | PASS |
| SAFE-143 | 5 | 0 | PASS |
| SAFE-144 | 5 | 0 | PASS |
| SAFE-145 | 5 | 0 | PASS |
| SAFE-146 | 5 | 0 | PASS |
| SAFE-147 | 5 | 0 | PASS |
| SAFE-148 | 5 | 0 | PASS |
| SAFE-149 | 5 | 0 | PASS |
| SAFE-150 | 5 | 0 | PASS |
| SAFE-151 | 5 | 0 | PASS |
| SAFE-152 | 5 | 0 | PASS |
| SAFE-153 | 5 | 0 | PASS |
| SAFE-154 | 5 | 0 | PASS |
| SAFE-155 | 5 | 0 | PASS |
| SAFE-156 | 5 | 0 | PASS |
| SAFE-157 | 5 | 0 | PASS |
| SAFE-158 | 5 | 0 | PASS |
| SAFE-159 | 5 | 0 | PASS |
| SAFE-160 | 5 | 0 | PASS |
| SAFE-161 | 5 | 0 | PASS |
| SAFE-162 | 5 | 0 | PASS |
| SAFE-163 | 5 | 0 | PASS |
| SAFE-164 | 5 | 0 | PASS |
| SAFE-165 | 5 | 0 | PASS |
| SAFE-166 | 5 | 0 | PASS |
| SAFE-167 | 5 | 0 | PASS |
| SAFE-168 | 5 | 0 | PASS |
| SAFE-169 | 5 | 0 | PASS |
| SAFE-170 | 5 | 0 | PASS |
| SAFE-171 | 5 | 0 | PASS |
| SAFE-172 | 5 | 0 | PASS |
| SAFE-173 | 5 | 0 | PASS |
| SAFE-174 | 5 | 0 | PASS |
| SAFE-175 | 5 | 0 | PASS |
| SAFE-176 | 5 | 0 | PASS |
| SAFE-177 | 5 | 0 | PASS |
| SAFE-178 | 5 | 0 | PASS |
| SAFE-179 | 5 | 0 | PASS |
| SAFE-180 | 5 | 0 | PASS |
| SAFE-181 | 5 | 0 | PASS |
| SAFE-182 | 5 | 0 | PASS |
| SAFE-183 | 5 | 0 | PASS |
| SAFE-184 | 5 | 0 | PASS |
| SAFE-185 | 5 | 0 | PASS |
| SAFE-186 | 5 | 0 | PASS |
| SAFE-187 | 5 | 0 | PASS |
| SAFE-188 | 5 | 0 | PASS |
| SAFE-189 | 5 | 0 | PASS |
| SAFE-190 | 5 | 0 | PASS |
| SAFE-191 | 5 | 0 | PASS |
| SAFE-192 | 5 | 0 | PASS |
| SAFE-193 | 5 | 0 | PASS |
| SAFE-194 | 5 | 0 | PASS |
| SAFE-195 | 5 | 0 | PASS |
| SAFE-196 | 5 | 0 | PASS |
| SAFE-197 | 5 | 0 | PASS |
| SAFE-198 | 5 | 0 | PASS |
| SAFE-199 | 5 | 0 | PASS |
| SAFE-200 | 5 | 0 | PASS |
| SAFE-201 | 5 | 0 | PASS |
| SAFE-202 | 5 | 0 | PASS |
| SAFE-203 | 5 | 0 | PASS |
| SAFE-204 | 5 | 0 | PASS |
| SAFE-205 | 5 | 0 | PASS |
| SAFE-206 | 5 | 0 | PASS |
| SAFE-207 | 5 | 0 | PASS |
| SAFE-208 | 5 | 0 | PASS |
| SAFE-209 | 5 | 0 | PASS |
| SAFE-210 | 5 | 0 | PASS |
| SAFE-211 | 5 | 0 | PASS |
| SAFE-212 | 5 | 0 | PASS |
| SAFE-213 | 5 | 0 | PASS |
| SAFE-214 | 5 | 0 | PASS |
| SAFE-215 | 5 | 0 | PASS |
| SAFE-216 | 5 | 0 | PASS |
| SAFE-217 | 5 | 0 | PASS |
| OPS-035 | 5 | 0 | PASS |
| OPS-036 | 5 | 0 | PASS |
| OPS-037 | 5 | 0 | PASS |
| OPS-038 | 5 | 0 | PASS |
| OPS-039 | 5 | 0 | PASS |
| OPS-040 | 5 | 0 | PASS |
| OPS-041 | 5 | 0 | PASS |
| OPS-042 | 5 | 0 | PASS |
| OPS-043 | 5 | 0 | PASS |
| OPS-044 | 5 | 0 | PASS |
| OPS-045 | 5 | 0 | PASS |
| OPS-046 | 5 | 0 | PASS |
| OPS-047 | 5 | 0 | PASS |
| OPS-048 | 5 | 0 | PASS |
| OPS-049 | 5 | 0 | PASS |
| OPS-050 | 5 | 0 | PASS |
| OPS-051 | 5 | 0 | PASS |
| OPS-052 | 5 | 0 | PASS |
| OPS-053 | 5 | 0 | PASS |
| OPS-054 | 5 | 0 | PASS |
| OPS-055 | 5 | 0 | PASS |
| OPS-056 | 5 | 0 | PASS |
| OPS-057 | 5 | 0 | PASS |
| OPS-058 | 5 | 0 | PASS |
| OPS-059 | 5 | 0 | PASS |
| OPS-060 | 5 | 0 | PASS |
| OPS-061 | 5 | 0 | PASS |
| OPS-062 | 5 | 0 | PASS |
| OPS-063 | 5 | 0 | PASS |
| OPS-064 | 5 | 0 | PASS |
| OPS-065 | 5 | 0 | PASS |
| OPS-066 | 5 | 0 | PASS |
| OPS-067 | 5 | 0 | PASS |
| OPS-068 | 5 | 0 | PASS |
| OPS-069 | 5 | 0 | PASS |
| OPS-070 | 5 | 0 | PASS |
| OPS-071 | 5 | 0 | PASS |
| OPS-072 | 5 | 0 | PASS |
| OPS-073 | 5 | 0 | PASS |
| OPS-074 | 5 | 0 | PASS |
| OPS-075 | 5 | 0 | PASS |
| OPS-076 | 5 | 0 | PASS |
| OPS-077 | 5 | 0 | PASS |
| OPS-078 | 5 | 0 | PASS |
| OPS-079 | 5 | 0 | PASS |
| OPS-080 | 5 | 0 | PASS |
| OPS-081 | 5 | 0 | PASS |
| OPS-082 | 5 | 0 | PASS |
| OPS-083 | 5 | 0 | PASS |
| OPS-084 | 5 | 0 | PASS |
| OPS-085 | 5 | 0 | PASS |
| OPS-086 | 5 | 0 | PASS |
| OPS-087 | 5 | 0 | PASS |
| OPS-088 | 5 | 0 | PASS |
| OPS-089 | 5 | 0 | PASS |
| OPS-090 | 5 | 0 | PASS |
| OPS-091 | 5 | 0 | PASS |
| OPS-092 | 5 | 0 | PASS |
| OPS-093 | 5 | 0 | PASS |
| OPS-094 | 5 | 0 | PASS |
| OPS-095 | 5 | 0 | PASS |
| OPS-096 | 5 | 0 | PASS |
| OPS-097 | 5 | 0 | PASS |
| OPS-098 | 5 | 0 | PASS |
| OPS-099 | 5 | 0 | PASS |
| OPS-100 | 5 | 0 | PASS |
| OPS-101 | 5 | 0 | PASS |
| OPS-102 | 5 | 0 | PASS |
| OPS-103 | 5 | 0 | PASS |
| OPS-104 | 5 | 0 | PASS |
| OPS-105 | 5 | 0 | PASS |
| OPS-106 | 5 | 0 | PASS |
| OPS-107 | 5 | 0 | PASS |
| OPS-108 | 5 | 0 | PASS |
| OPS-109 | 5 | 0 | PASS |
| OPS-110 | 5 | 0 | PASS |
| OPS-111 | 5 | 0 | PASS |
| OPS-112 | 5 | 0 | PASS |
| OPS-113 | 5 | 0 | PASS |
| OPS-114 | 5 | 0 | PASS |
| OPS-115 | 5 | 0 | PASS |
| OPS-116 | 5 | 0 | PASS |
| OPS-117 | 5 | 0 | PASS |
| OPS-118 | 5 | 0 | PASS |
| OPS-119 | 5 | 0 | PASS |
| OPS-120 | 5 | 0 | PASS |
| OPS-121 | 5 | 0 | PASS |
| OPS-122 | 5 | 0 | PASS |
| OPS-123 | 5 | 0 | PASS |
| OPS-124 | 5 | 0 | PASS |
| OPS-125 | 5 | 0 | PASS |
| OPS-126 | 5 | 0 | PASS |
| OPS-127 | 5 | 0 | PASS |
| OPS-128 | 5 | 0 | PASS |
| OPS-129 | 5 | 0 | PASS |
| OPS-130 | 5 | 0 | PASS |
| OPS-131 | 5 | 0 | PASS |
| OPS-132 | 5 | 0 | PASS |
| OPS-133 | 5 | 0 | PASS |
| OPS-134 | 5 | 0 | PASS |
| OPS-135 | 5 | 0 | PASS |
| OPS-136 | 5 | 0 | PASS |
| OPS-137 | 5 | 0 | PASS |
| OPS-138 | 5 | 0 | PASS |
| OPS-139 | 5 | 0 | PASS |
| OPS-140 | 5 | 0 | PASS |
| OPS-141 | 5 | 0 | PASS |
| OPS-142 | 5 | 0 | PASS |
| OPS-143 | 5 | 0 | PASS |
| OPS-144 | 5 | 0 | PASS |
| OPS-145 | 5 | 0 | PASS |
| OPS-146 | 5 | 0 | PASS |
| OPS-147 | 5 | 0 | PASS |
| OPS-148 | 5 | 0 | PASS |
| OPS-149 | 5 | 0 | PASS |
| OPS-150 | 5 | 0 | PASS |
| OPS-151 | 5 | 0 | PASS |
| OPS-152 | 5 | 0 | PASS |
| OPS-153 | 5 | 0 | PASS |
| OPS-154 | 5 | 0 | PASS |
| OPS-155 | 5 | 0 | PASS |
| OPS-156 | 5 | 0 | PASS |
| OPS-157 | 5 | 0 | PASS |
| OPS-158 | 5 | 0 | PASS |
| OPS-159 | 5 | 0 | PASS |
| OPS-160 | 5 | 0 | PASS |
| OPS-161 | 5 | 0 | PASS |
| OPS-162 | 5 | 0 | PASS |
| OPS-163 | 5 | 0 | PASS |
| OPS-164 | 5 | 0 | PASS |
| OPS-165 | 5 | 0 | PASS |
| OPS-166 | 5 | 0 | PASS |
| OPS-167 | 5 | 0 | PASS |
| OPS-168 | 5 | 0 | PASS |
| OPS-169 | 5 | 0 | PASS |
| OPS-170 | 5 | 0 | PASS |
| OPS-171 | 5 | 0 | PASS |
| OPS-172 | 5 | 0 | PASS |
| OPS-173 | 5 | 0 | PASS |
| OPS-174 | 5 | 0 | PASS |
| OPS-175 | 5 | 0 | PASS |
| OPS-176 | 5 | 0 | PASS |
| OPS-177 | 5 | 0 | PASS |
| OPS-178 | 5 | 0 | PASS |
| OPS-179 | 5 | 0 | PASS |
| OPS-180 | 5 | 0 | PASS |
| OPS-181 | 5 | 0 | PASS |
| OPS-182 | 5 | 0 | PASS |
| OPS-183 | 5 | 0 | PASS |
| OPS-184 | 5 | 0 | PASS |

### 중앙 인벤토리 나머지 검사

| 번호 | 검사 | 결과 |
| --- | --- | --- |
| 1 | S05 개별 동작 등록 exact 연결 (실행 증거 아님) | PASS |
| 2 | public docs index excludes internal feature inventory | PASS |
| 3 | feature inventory pins current release scope | PASS |
| 4 | required sections exist | PASS |
| 5 | historical V280 source-of-truth keeps the 2.x runway boundary explicit | PASS |
| 6 | historical V290 source-of-truth keeps source, published, and roadmap distinct | PASS |
| 7 | inventory summary count 전체 기능 항목 986 | PASS |
| 8 | inventory summary count UI 직접 필요 400 | PASS |
| 9 | inventory summary count UI 간접 필요 36 | PASS |
| 10 | inventory summary count UI 비대상 550 | PASS |
| 11 | inventory summary count 테스트 필요 986 | PASS |
| 12 | inventory summary count 안정화 대상 976 | PASS |
| 13 | inventory summary count UI 풀테스트 대상 424 | PASS |
| 14 | inventory summary count 30분 soak 대상 50 | PASS |
| 15 | inventory summary count 120분 대상 7 | PASS |
| 16 | summary counts match current feature IDs | PASS |
| 17 | implementation evidence manifest matches all feature rows | PASS |
| 18 | feature rows have required matrix columns | PASS |
| 19 | inventory rejects separate test-area labels | PASS |
| 20 | coverage wording separates mapping from execution | PASS |
| 21 | current feature expansion rows exist | PASS |
| 22 | manual UI docs reference inventory | PASS |
| 23 | manual checklist references seed fixture | PASS |
| 24 | manual result template references seed fixture | PASS |
| 25 | VA seed inventory commands select the latest published baseline explicitly | PASS |
| 26 | AGENTS requires individual future feature test rows | PASS |
| 27 | manual UI seed account role admin | PASS |
| 28 | manual UI seed account role operator | PASS |
| 29 | manual UI seed account role viewer | PASS |
| 30 | manual UI seed account role integrator | PASS |
| 31 | manual UI seed profile 9101 numeric id | PASS |
| 32 | manual UI seed profile 9101 tracking classes present | PASS |
| 33 | manual UI seed profile 9102 numeric id | PASS |
| 34 | manual UI seed profile 9102 tracking classes present | PASS |
| 35 | manual UI seed profile 9103 numeric id | PASS |
| 36 | manual UI seed profile 9103 tracking classes present | PASS |
| 37 | manual UI seed profile 9104 numeric id | PASS |
| 38 | manual UI seed profile 9104 tracking classes present | PASS |
| 39 | manual UI seed profile 9105 numeric id | PASS |
| 40 | manual UI seed profile 9105 tracking classes present | PASS |
| 41 | manual UI seed profile 9106 numeric id | PASS |
| 42 | manual UI seed profile 9106 tracking classes present | PASS |
| 43 | manual UI seed profile 9107 numeric id | PASS |
| 44 | manual UI seed profile 9107 tracking classes present | PASS |
| 45 | manual UI seed event type presence | PASS |
| 46 | manual UI seed event type enter | PASS |
| 47 | manual UI seed event type exit | PASS |
| 48 | manual UI seed event type line-crossing | PASS |
| 49 | manual UI seed event type intrusion-dwell | PASS |
| 50 | manual UI seed event type re-entry | PASS |
| 51 | manual UI seed event type wrong-direction | PASS |
| 52 | manual UI seed event type intrusion-after-line-crossing | PASS |
| 53 | manual UI seed event type loitering | PASS |
| 54 | manual UI seed event type zone-occupancy | PASS |
| 55 | manual UI seed event template 9201 numeric id | PASS |
| 56 | manual UI seed event template 9201 event type presence | PASS |
| 57 | manual UI seed event template 9201 profile reference | PASS |
| 58 | manual UI seed event template 9202 numeric id | PASS |
| 59 | manual UI seed event template 9202 event type enter | PASS |
| 60 | manual UI seed event template 9202 profile reference | PASS |
| 61 | manual UI seed event template 9203 numeric id | PASS |
| 62 | manual UI seed event template 9203 event type exit | PASS |
| 63 | manual UI seed event template 9203 profile reference | PASS |
| 64 | manual UI seed event template 9204 numeric id | PASS |
| 65 | manual UI seed event template 9204 event type line-crossing | PASS |
| 66 | manual UI seed event template 9204 profile reference | PASS |
| 67 | manual UI seed event template 9205 numeric id | PASS |
| 68 | manual UI seed event template 9205 event type line-crossing | PASS |
| 69 | manual UI seed event template 9205 profile reference | PASS |
| 70 | manual UI seed event template 9206 numeric id | PASS |
| 71 | manual UI seed event template 9206 event type line-crossing | PASS |
| 72 | manual UI seed event template 9206 profile reference | PASS |
| 73 | manual UI seed event template 9207 numeric id | PASS |
| 74 | manual UI seed event template 9207 event type intrusion-dwell | PASS |
| 75 | manual UI seed event template 9207 profile reference | PASS |
| 76 | manual UI seed event template 9208 numeric id | PASS |
| 77 | manual UI seed event template 9208 event type re-entry | PASS |
| 78 | manual UI seed event template 9208 profile reference | PASS |
| 79 | manual UI seed event template 9209 numeric id | PASS |
| 80 | manual UI seed event template 9209 event type wrong-direction | PASS |
| 81 | manual UI seed event template 9209 profile reference | PASS |
| 82 | manual UI seed event template 9210 numeric id | PASS |
| 83 | manual UI seed event template 9210 event type intrusion-after-line-crossing | PASS |
| 84 | manual UI seed event template 9210 profile reference | PASS |
| 85 | manual UI seed event template 9211 numeric id | PASS |
| 86 | manual UI seed event template 9211 event type loitering | PASS |
| 87 | manual UI seed event template 9211 profile reference | PASS |
| 88 | manual UI seed event template 9212 numeric id | PASS |
| 89 | manual UI seed event template 9212 event type zone-occupancy | PASS |
| 90 | manual UI seed event template 9212 profile reference | PASS |
| 91 | manual UI seed line direction any | PASS |
| 92 | manual UI seed line direction forward | PASS |
| 93 | manual UI seed line direction reverse | PASS |
| 94 | manual UI seed scenario preset default | PASS |
| 95 | manual UI seed scenario preset road | PASS |
| 96 | manual UI seed scenario preset retail | PASS |
| 97 | manual UI seed scenario preset park | PASS |
| 98 | manual UI seed scenario preset indoor | PASS |
| 99 | manual UI seed scenario preset lobby | PASS |
| 100 | manual UI seed scenario preset platform | PASS |
| 101 | manual UI seed scenario preset entrance | PASS |
| 102 | manual UI seed scenario preset doorway | PASS |
| 103 | manual UI seed scenario preset parking | PASS |
| 104 | manual UI seed scenario preset elevator | PASS |
| 105 | manual UI seed scenario preset custom | PASS |
| 106 | manual UI seed vaRule 9301 numeric id | PASS |
| 107 | manual UI seed vaRule 9301 profile reference | PASS |
| 108 | manual UI seed vaRule 9301 event template reference | PASS |
| 109 | manual UI seed vaRule 9302 numeric id | PASS |
| 110 | manual UI seed vaRule 9302 profile reference | PASS |
| 111 | manual UI seed vaRule 9302 event template reference | PASS |
| 112 | manual UI seed vaRule 9303 numeric id | PASS |
| 113 | manual UI seed vaRule 9303 profile reference | PASS |
| 114 | manual UI seed vaRule 9303 event template reference | PASS |
| 115 | manual UI seed vaRule 9304 numeric id | PASS |
| 116 | manual UI seed vaRule 9304 profile reference | PASS |
| 117 | manual UI seed vaRule 9304 event template reference | PASS |
| 118 | manual UI seed vaRule 9305 numeric id | PASS |
| 119 | manual UI seed vaRule 9305 profile reference | PASS |
| 120 | manual UI seed vaRule 9305 event template reference | PASS |
| 121 | manual UI seed vaRule 9306 numeric id | PASS |
| 122 | manual UI seed vaRule 9306 profile reference | PASS |
| 123 | manual UI seed vaRule 9306 event template reference | PASS |
| 124 | manual UI seed vaRule 9307 numeric id | PASS |
| 125 | manual UI seed vaRule 9307 profile reference | PASS |
| 126 | manual UI seed vaRule 9307 event template reference | PASS |
| 127 | manual UI seed vaRule 9308 numeric id | PASS |
| 128 | manual UI seed vaRule 9308 profile reference | PASS |
| 129 | manual UI seed vaRule 9308 event template reference | PASS |
| 130 | manual UI seed vaRule 9309 numeric id | PASS |
| 131 | manual UI seed vaRule 9309 profile reference | PASS |
| 132 | manual UI seed vaRule 9309 event template reference | PASS |
| 133 | manual UI seed vaRule 9310 numeric id | PASS |
| 134 | manual UI seed vaRule 9310 profile reference | PASS |
| 135 | manual UI seed vaRule 9310 event template reference | PASS |
| 136 | manual UI seed vaRule 9311 numeric id | PASS |
| 137 | manual UI seed vaRule 9311 profile reference | PASS |
| 138 | manual UI seed vaRule 9311 event template reference | PASS |
| 139 | manual UI seed vaRule 9312 numeric id | PASS |
| 140 | manual UI seed vaRule 9312 profile reference | PASS |
| 141 | manual UI seed vaRule 9312 event template reference | PASS |
| 142 | manual UI seed tracker Re-ID pair none/off | PASS |
| 143 | manual UI seed tracker Re-ID pair lite/off | PASS |
| 144 | manual UI seed tracker Re-ID pair kalman-lite/off | PASS |
| 145 | manual UI seed tracker Re-ID pair bytetrack/off | PASS |
| 146 | manual UI seed tracker Re-ID pair lite/assist | PASS |
| 147 | manual UI seed tracker Re-ID pair kalman-lite/assist | PASS |
| 148 | manual UI seed tracker Re-ID pair bytetrack/assist | PASS |
| 149 | manual UI seed invalid policy tracker none Re-ID assist | PASS |
| 150 | manual UI seed final state minimum vaRules | PASS |
| 151 | manual UI VA seed matrix covers required current release cases | PASS |
