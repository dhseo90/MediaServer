# B-02 수용 조건·분할 동등성 결과

독자: 녹화 저장 구현·검증 담당자. 수명: 이번 B-02 변경의 과거 증거.
정책은 AGENTS.md, 현재 단계 상태는 중앙 테스트 기록을 따른다. 이 기록은 공개 B Open·SQLite·쓰기나 B 전체 완료 증거가 아니다.

## 결론과 범위

기존 관리 형식의 실제 기록을 새 Journal/Catalog로 재개방한 뒤 동일 원문 이력을 서로 다른 cut으로 분할했다.
초기에는 snapshot에 들어갈 때만 추가된 관계 제약으로 거부됐으며, 원문 digest·ID·domain 검증은 유지하면서 그 차이를 보완했다.
기존 writer·공개 API·시간·ID·보존 정책은 변경하지 않았다. V1 domain과 관리 저장 형식 v1은 별개다.
공개 RequestDeletion의 삭제 완료 뒤 거부와 직접 Journal 기록의 수용은 구분했다.
메인이 제품·검사 diff와 실제 원출력을 직접 검토했다.

## 명령별 실행 결과

| 제목 | 수행내용 | 결과(pass/fail) | 비고 |
| --- | --- | --- | --- |
| 최종 scratch | `./server.sh verify-v410-recording-catalog-generation-scratch`, exit0, 59개 | pass | Y01 4/Y02 8/Y03 3/Y04 2/Z01 13/Z02 11/Z03 18; crypto/backend 3조합 |
| 최종 projection | `./server.sh verify-v410-recording-generation-projection`, exit0, 30개 | pass | 신규 path 부재 음성 포함; 원문 손상·ID·예약·domain 거부 유지 |
| 기존 Catalog | `./server.sh verify-v410-recording-catalog`, exit0, 249개 | pass | SQLite·crypto/fallback 기존 회귀 |
| B Journal | `./server.sh verify-v410-recording-journal-generation-readonly`, exit0, 78개 | pass | identity·예약·원문 link·권위 및 기존 v1 회귀 |
| 제품 빌드 | `./server.sh build`, exit0 | pass | media_server 빌드 완료 |

Scratch 최종 실행 뒤 projection smoke의 main에 독립 음성 1개를 추가했다. Scratch는 그 main을 호출하지 않고 재사용 fixture 함수는 바뀌지 않아 59개 증거는 유지한다.
실제 앱·누적·30분·UI·120분은 이번 단위 미실행이며 위 결과로 대체하지 않는다.
환경은 Darwin 27.0.0 arm64/Apple clang 21.0.0이며 runner 로그에 시각·소스 hash가 있다.
최종 scratch elapsed 30초, projection 11초, Journal 18초(각 start/end 차이). token start/end/consumed는 계측 source가 없어 미집계다.

## 최초 실패 이력

| 원로그 | exit | 구분·처리 |
| --- | --- | --- |
| b02-cut-acceptance-first.log | 2 | 관리 SQLite fixture 경로 오류; 예상 RED 아님. 경로 수정 |
| b02-cut-acceptance-path-fixed.log | 1 | 같은 tombstone 이력의 예상 RED 1 |
| b02-cut-acceptance-candidates.log | 1 | 테스트 문자열 인자 컴파일 오류; 예상 RED 아님. 타입 수정 |
| b02-cut-acceptance-candidates-fixed.log | 1 | 실제 수용 후보 확인, 예상 RED 1 유지 |
| b02-cut-acceptance-named-red.log | 1 | early fixture V2 opt-in 누락; 완전한 분할 비교 증거에서 제외 |
| b02-cut-acceptance-named-red-v2.log | 1 | 정확한 같은 이력의 예상 RED 5, 당시 PASS 33 |
| b02-cut-acceptance-green.log | 0 | 첫 보완 40 PASS |
| b02-cut-source-protection.log | 1 | 진행 작업 원본의 V1 tombstone 분할 차이 RED 1 |
| b02-cut-terminal-red.log | 1 | 삭제·확정 출력의 분할 차이 RED 3 |
| b02-cut-direct-request-red.log | 1 | 직접 원장 삭제 재요청 포함 RED 4 |
| b02-cut-projection-regression.log | 1 | dispatch 이름 오타; 도움말의 PASS 문자열은 검사 결과 아님 |
| b02-cut-projection-regression-command-fixed.log | 0 | 당시 projection 29 PASS |
| b02-cut-final-projection.log | 0 | 독립 path 음성 추가 전 29 PASS |

## 원출력 보존

원출력 전체를 내용 변경 없이 gzip 보존했다. 테스트 이름의 영어 문자열은 원출력 assertion 식별자이며 현재 작업 정책이 아니다.

| 파일 | 압축 전 바이트 | 원문 SHA-256 |
| --- | --- | --- |
| [b02-cut-acceptance-candidates-fixed.log](b02-cut-acceptance-candidates-fixed.log.gz) | 7124 | `1dbb830bb0ac82519d8a84eab387d642c2bc4ab069063281e5b96813d108d309` |
| [b02-cut-acceptance-candidates.log](b02-cut-acceptance-candidates.log.gz) | 5096 | `3852891b8e888d8356b1477045ab1f7aa6c3222721861a07268982259288a5a1` |
| [b02-cut-acceptance-first.log](b02-cut-acceptance-first.log.gz) | 5527 | `d4f8ce17b2087200b88fd9bfd5b29de2892380cc36d56af7b6c67a2ae35fe150` |
| [b02-cut-acceptance-green.log](b02-cut-acceptance-green.log.gz) | 8397 | `fbd58a8c4815a56bb80c6c33120fb6fabf3a7c5aae05328a8bcba9e6f044c4e1` |
| [b02-cut-acceptance-named-red-v2.log](b02-cut-acceptance-named-red-v2.log.gz) | 8917 | `b123857ef906ed14e29ac5a6dc6bfd5e1844408b76e55aea8bca24fdb15589ed` |
| [b02-cut-acceptance-named-red.log](b02-cut-acceptance-named-red.log.gz) | 9037 | `2c038a80a9f884afe7abad1c80a3c17dab0c902d033a1a85694a11a46e4cae45` |
| [b02-cut-acceptance-path-fixed.log](b02-cut-acceptance-path-fixed.log.gz) | 6339 | `29da5348b2514247d69ac43bf932ec82c51610f0fafdbfe598acd651ba5c1185` |
| [b02-cut-direct-request-red.log](b02-cut-direct-request-red.log.gz) | 10848 | `c928ca458a45386a152278e3a49769fe3ddb3c0ba4be66c8d5f0061597f91479` |
| [b02-cut-final-green.log](b02-cut-final-green.log.gz) | 10569 | `36133e29696187d3168e2af39b7dd323a774c43152af37ddebdd3c52eaf5f615` |
| [b02-cut-final-projection-negative.log](b02-cut-final-projection-negative.log.gz) | 4110 | `7bf2d08bf9ab2b6e6e495706c21d84e010f1f3f11181d919578e3698271f2060` |
| [b02-cut-final-projection.log](b02-cut-final-projection.log.gz) | 4037 | `7a455a5b76a525ad744d849d1bd26f2b00c840a77798826b4b390de69967871d` |
| [b02-cut-projection-regression-command-fixed.log](b02-cut-projection-regression-command-fixed.log.gz) | 4037 | `963eb22a089f6fd9bb81dfcba067466a8a08292acc9a809e7773a36a0ec52597` |
| [b02-cut-projection-regression.log](b02-cut-projection-regression.log.gz) | 106008 | `615a6fb7d0b707510d543095aaa3fb0f7ec40877371aff35e7aa709cd6f4fc68` |
| [b02-cut-source-protection.log](b02-cut-source-protection.log.gz) | 9008 | `df767e4fcf969c157220d49af80f68a30059fd76412988bdee7f69e6fe776065` |
| [b02-cut-terminal-red.log](b02-cut-terminal-red.log.gz) | 10309 | `b315077194afe3aecc4fc9d26f37710e65f72d38b070edfc5d61d058769cf7e5` |
| [build.log](build.log.gz) | 613 | `d3c04fc771f8ab6ec412b3487e44a94602c37875cb0b4264e411ca8abf712b3d` |
| [catalog.log](catalog.log.gz) | 14660 | `74efb59c6491c5d62087f1775868784970aaaaaab6c0c847e91e37800291613f` |
| [journal.log](journal.log.gz) | 6243 | `56d934b2a477aa3769bed3330e27f60d05a8e9ed0843846f848c1984b447e116` |

## 실행 개별 결과 전수

정상/오류 반례의 기대 결과를 충족했을 때 pass다. 아래는 각 최종 명령 원출력의 모든 PASS 행을 순서대로 보존한 것이며, 최초 실패는 앞 표·원로그에 남겼다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| b02-cut-final-green.log #1 | 원출력 assertion: `B02-Y01 PASS snapshot plus active corruption and same-ID retry` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #2 | 원출력 assertion: `B02-Y02 PASS live SQLite and original remain unpublished` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #3 | 원출력 assertion: `B02-Y02 PASS successful recovery is one-shot without ending link lease` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #4 | 원출력 assertion: `B02-Y02 PASS public Open write and replay remain closed` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #5 | 원출력 assertion: `B02-Y02 PASS active second domain failure preserves candidate live bytes SQLite and poisons owner` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #6 | 원출력 assertion: `B02-Y02 PASS new Journal strict reopen succeeds but unchanged domain-invalid candidate still fails` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #7 | 원출력 assertion: `B02-Y02 PASS identity conflict rejected before restore` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #8 | 원출력 assertion: `B02-Y03 PASS active job source retains resident bound to verified identity` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #9 | 원출력 assertion: `B02-Y03 PASS inactive source archive is not read during scratch` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #10 | 원출력 assertion: `B02-Y03 PASS cold missing archive fails at actual detail use` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #11 | 원출력 assertion: `B02-Y04 PASS pending source hold rederived without SQLite` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #12 | 원출력 assertion: `B02-Y04 PASS active terminal completion clears snapshot hold` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #13 | 원출력 assertion: `B02-Y01 PASS active reservation gap then finalization accepted` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #14 | 원출력 assertion: `B02-Y01 PASS later reservation rejected by Journal before scratch` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #15 | 원출력 assertion: `B02-Y01 PASS all sixteen snapshot row kinds imported` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #16 | 원출력 assertion: `B02-Z01 PASS managed actual history and strict reopen: v1-tomb-on-v2` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #17 | 원출력 assertion: `B02-Z03 PASS candidate cuts leave live and original unchanged` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #18 | 원출력 assertion: `B02-Z03 PASS candidate cuts leave live and original unchanged` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #19 | 원출력 assertion: `B02-Z02 PASS EXPECTED RED actual history cut equivalence: v1-tomb-on-v2` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #20 | 원출력 assertion: `B02-Z01 PASS managed actual history and strict reopen: job-v1-output` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #21 | 원출력 assertion: `B02-Z03 PASS candidate cuts leave live and original unchanged` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #22 | 원출력 assertion: `B02-Z03 PASS candidate cuts leave live and original unchanged` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #23 | 원출력 assertion: `B02-Z02 PASS EXPECTED RED actual history cut equivalence: job-v1-output` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #24 | 원출력 assertion: `B02-Z01 PASS managed actual history and strict reopen: job-tomb-output` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #25 | 원출력 assertion: `B02-Z03 PASS candidate cuts leave live and original unchanged` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #26 | 원출력 assertion: `B02-Z03 PASS candidate cuts leave live and original unchanged` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #27 | 원출력 assertion: `B02-Z02 PASS EXPECTED RED actual history cut equivalence: job-tomb-output` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #28 | 원출력 assertion: `B02-Z01 PASS managed actual history and strict reopen: source-wrapper` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #29 | 원출력 assertion: `B02-Z03 PASS candidate cuts leave live and original unchanged` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #30 | 원출력 assertion: `B02-Z03 PASS candidate cuts leave live and original unchanged` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #31 | 원출력 assertion: `B02-Z02 PASS EXPECTED RED actual history cut equivalence: source-wrapper` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #32 | 원출력 assertion: `B02-Z01 PASS managed actual history and strict reopen: job-source-tomb` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #33 | 원출력 assertion: `B02-Z03 PASS candidate cuts leave live and original unchanged` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #34 | 원출력 assertion: `B02-Z03 PASS candidate cuts leave live and original unchanged` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #35 | 원출력 assertion: `B02-Z02 PASS EXPECTED RED actual history cut equivalence: job-source-tomb` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #36 | 원출력 assertion: `B02-Z01 PASS managed actual history and strict reopen: v2-deleted-tomb` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #37 | 원출력 assertion: `B02-Z03 PASS candidate cuts leave live and original unchanged` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #38 | 원출력 assertion: `B02-Z03 PASS candidate cuts leave live and original unchanged` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #39 | 원출력 assertion: `B02-Z02 PASS EXPECTED RED actual history cut equivalence: v2-deleted-tomb` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #40 | 원출력 assertion: `B02-Z01 PASS managed actual history and strict reopen: committed-tomb` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #41 | 원출력 assertion: `B02-Z03 PASS candidate cuts leave live and original unchanged` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #42 | 원출력 assertion: `B02-Z03 PASS candidate cuts leave live and original unchanged` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #43 | 원출력 assertion: `B02-Z02 PASS EXPECTED RED actual history cut equivalence: committed-tomb` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #44 | 원출력 assertion: `B02-Z01 PASS unmanaged S10-O10-equivalent explicit V2-opt-in reopen` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #45 | 원출력 assertion: `B02-Z01 PASS managed reservation then V1 finalize and reopen` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #46 | 원출력 assertion: `B02-Z02 PASS reserved then V1 finalization early cut` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #47 | 원출력 assertion: `B02-Z02 PASS reserved then V1 finalization late cut` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #48 | 원출력 assertion: `B02-Z01 PASS managed public V1 tombstone different identity accepted with independent deleted state` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #49 | 원출력 assertion: `B02-Z01 PASS public RequestDeletion after deleted is rejected without new bytes` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #50 | 원출력 assertion: `B02-Z01 PASS managed strict reopen preserves mismatched V1 tombstone state` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #51 | 원출력 assertion: `B02-Z03 PASS cut comparison never publishes live SQLite or changes bytes` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #52 | 원출력 assertion: `B02-Z03 PASS cut comparison never publishes live SQLite or changes bytes` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #53 | 원출력 assertion: `B02-Z02 PASS EXPECTED RED same actual managed history must restore same deleted identity on both cuts` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #54 | 원출력 assertion: `B02-Z01 PASS direct Journal DeletionRequested after deleted survives strict reopen unlike public request` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #55 | 원출력 assertion: `B02-Z03 PASS direct request cuts preserve live and original` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #56 | 원출력 assertion: `B02-Z03 PASS direct request cuts preserve live and original` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #57 | 원출력 assertion: `B02-Z02 PASS EXPECTED RED direct accepted request after deleted cut equivalence` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #58 | 원출력 assertion: `B02-Y02 PASS unsupported scratch remains closed` | pass | 해당 명령 exit0 |
| b02-cut-final-green.log #59 | 원출력 assertion: `B02-Y02 PASS unsupported scratch remains closed` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #1 | 원출력 assertion: `B02-X01 PASS active typed maps and reservation/ordinary ID separation` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #2 | 원출력 assertion: `B02-X02 PASS snapshot digest mismatch unchanged` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #3 | 원출력 assertion: `B02-X02 PASS chain store mismatch unchanged` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #4 | 원출력 assertion: `B02-X02 PASS exclusive cut unchanged` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #5 | 원출력 assertion: `B02-X02 PASS reservation tuple mismatch` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #6 | 원출력 assertion: `B02-X02 PASS domain internal key mismatch` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #7 | 원출력 assertion: `B02-X02 PASS thin latest type/entity mismatch` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #8 | 원출력 assertion: `B02-X02 PASS orphan media path` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #9 | 원출력 assertion: `B02-X02 PASS V2 missing media path without V1 tombstone remains rejected` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #10 | 원출력 assertion: `B02-X02 PASS Intent independently finalized output stays valid/protected` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #11 | 원출력 assertion: `B02-X03 PASS active cold admission` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #12 | 원출력 assertion: `B02-X03 PASS active archive corruption unchanged` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #13 | 원출력 assertion: `B02-X03 PASS inactive archive detail is delayed, not validated` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #14 | 원출력 assertion: `B02-X03 PASS candidate never rewrites archive` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #15 | 원출력 assertion: `B02-X01 PASS historical source/channel and V2 missing locator FK accepted` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #16 | 원출력 assertion: `B02-X01 PASS all sixteen typed domain row kinds and standalone tombstone` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #17 | 원출력 assertion: `B02-X02 PASS pending terminal source/output hold reconstructed` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #18 | 원출력 assertion: `B02-X02 PASS tombstone requires matching deletion transition` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #19 | 원출력 assertion: `B02-X02 PASS pending hold rejects nonfinal source` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #20 | 원출력 assertion: `B02-X02 PASS event overlap channel mismatch` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #21 | 원출력 assertion: `B02-X02 PASS complete historical derived may later be deleted` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #22 | 원출력 assertion: `B02-X01 PASS Ready full canonical cold detail` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #23 | 원출력 assertion: `B02-X02 PASS Ready independently finalized output accepted` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #24 | 원출력 assertion: `B02-X01 PASS Committed ready output and path closure` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #25 | 원출력 assertion: `B02-X02 PASS Committed output path mismatch` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #26 | 원출력 assertion: `B02-X03 PASS identity head generation mismatch` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #27 | 원출력 assertion: `B02-X03 PASS accepted state omission` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #28 | 원출력 assertion: `B02-X03 PASS structural object is not domain segment` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #29 | 원출력 assertion: `B02-X03 PASS cold raw row corruption preserves original` | pass | 해당 명령 exit0 |
| b02-cut-final-projection-negative.log #30 | 원출력 assertion: `B02-X04 PASS crypto-off fail closed unchanged` | pass | 해당 명령 exit0 |
| catalog.log #1 | 원출력 assertion: `[pass] journal open: ` | pass | 해당 명령 exit0 |
| catalog.log #2 | 원출력 assertion: `[pass] fallback catalog open: ` | pass | 해당 명령 exit0 |
| catalog.log #3 | 원출력 assertion: `[pass] SQLite off mode 표시` | pass | 해당 명령 exit0 |
| catalog.log #4 | 원출력 assertion: `[pass] segment finalize journal+projection: ` | pass | 해당 명령 exit0 |
| catalog.log #5 | 원출력 assertion: `[pass] fallback range query` | pass | 해당 명령 exit0 |
| catalog.log #6 | 원출력 assertion: `[pass] event link FK 위반 거부` | pass | 해당 명령 exit0 |
| catalog.log #7 | 원출력 assertion: `[pass] FK 위반 transaction/journal 전체 rollback` | pass | 해당 명령 exit0 |
| catalog.log #8 | 원출력 assertion: `[pass] 최초 durable mutation 1개` | pass | 해당 명령 exit0 |
| catalog.log #9 | 원출력 assertion: `[pass] 동일 mutation 중복 append` | pass | 해당 명령 exit0 |
| catalog.log #10 | 원출력 assertion: `[pass] 손상 사이 정상 durable mutation 보존` | pass | 해당 명령 exit0 |
| catalog.log #11 | 원출력 assertion: `[pass] 중간 corrupt line count` | pass | 해당 명령 exit0 |
| catalog.log #12 | 원출력 assertion: `[pass] 마지막 truncated line skip` | pass | 해당 명령 exit0 |
| catalog.log #13 | 원출력 assertion: `[pass] fallback replay open` | pass | 해당 명령 exit0 |
| catalog.log #14 | 원출력 assertion: `[pass] 같은 mutation idempotent replay` | pass | 해당 명령 exit0 |
| catalog.log #15 | 원출력 assertion: `[pass] 재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존` | pass | 해당 명령 exit0 |
| catalog.log #16 | 원출력 assertion: `[pass] 중복 replay row/합계 불증가` | pass | 해당 명령 exit0 |
| catalog.log #17 | 원출력 assertion: `[pass] 추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구: ` | pass | 해당 명령 exit0 |
| catalog.log #18 | 원출력 assertion: `[pass] writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed` | pass | 해당 명령 exit0 |
| catalog.log #19 | 원출력 assertion: `[pass] v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed` | pass | 해당 명령 exit0 |
| catalog.log #20 | 원출력 assertion: `[pass] SQLite catalog open/rebuild: ` | pass | 해당 명령 exit0 |
| catalog.log #21 | 원출력 assertion: `[pass] SQLite primary mode 표시` | pass | 해당 명령 exit0 |
| catalog.log #22 | 원출력 assertion: `[pass] SQLite on/off range query ID·순서 parity` | pass | 해당 명령 exit0 |
| catalog.log #23 | 원출력 assertion: `[pass] journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분` | pass | 해당 명령 exit0 |
| catalog.log #24 | 원출력 assertion: `[pass] journal 없는 손상 media orphan 구분` | pass | 해당 명령 exit0 |
| catalog.log #25 | 원출력 assertion: `[pass] projection failover journal open: ` | pass | 해당 명령 exit0 |
| catalog.log #26 | 원출력 assertion: `[pass] projection failover catalog open: ` | pass | 해당 명령 exit0 |
| catalog.log #27 | 원출력 assertion: `[pass] 실제 SQLite INSERT 실패 trigger 설치` | pass | 해당 명령 exit0 |
| catalog.log #28 | 원출력 assertion: `[pass] SQLite 투영 실패 뒤 journal+memory finalize 유지: ` | pass | 해당 명령 exit0 |
| catalog.log #29 | 원출력 assertion: `[pass] SQLite 투영 실패 즉시 JSONL fallback 전환` | pass | 해당 명령 exit0 |
| catalog.log #30 | 원출력 assertion: `[pass] 재시작 rebuild 전 실패 trigger 제거` | pass | 해당 명령 exit0 |
| catalog.log #31 | 원출력 assertion: `[pass] 투영 실패 직후 in-memory query 정합성 유지` | pass | 해당 명령 exit0 |
| catalog.log #32 | 원출력 assertion: `[pass] projection failover 재시작 journal rebuild: ` | pass | 해당 명령 exit0 |
| catalog.log #33 | 원출력 assertion: `[pass] 재시작 후 journal에서 누락 SQLite projection 복구` | pass | 해당 명령 exit0 |
| catalog.log #34 | 원출력 assertion: `[pass] 재시작 후 SQLite primary 복귀` | pass | 해당 명령 exit0 |
| catalog.log #35 | 원출력 assertion: `[pass] 재시작 journal rebuild가 실제 SQLite row 복원` | pass | 해당 명령 exit0 |
| catalog.log #36 | 원출력 assertion: `[pass] tombstone journal open: ` | pass | 해당 명령 exit0 |
| catalog.log #37 | 원출력 assertion: `[pass] tombstone catalog open: ` | pass | 해당 명령 exit0 |
| catalog.log #38 | 원출력 assertion: `[pass] tombstone 대상 segment finalize: ` | pass | 해당 명령 exit0 |
| catalog.log #39 | 원출력 assertion: `[pass] tombstone 대상 deletion request: ` | pass | 해당 명령 exit0 |
| catalog.log #40 | 원출력 assertion: `[pass] tombstone 완료 기록: ` | pass | 해당 명령 exit0 |
| catalog.log #41 | 원출력 assertion: `[pass] catalog finalize가 tombstone segment ID 재사용을 거부해야 함` | pass | 해당 명령 exit0 |
| catalog.log #42 | 원출력 assertion: `[pass] 손상 SQLite 격리 후 journal rebuild: ` | pass | 해당 명령 exit0 |
| catalog.log #43 | 원출력 assertion: `[pass] 손상 SQLite 원본 격리` | pass | 해당 명령 exit0 |
| catalog.log #44 | 원출력 assertion: `[pass] 격리 SQLite 파일 보존` | pass | 해당 명령 exit0 |
| catalog.log #45 | 원출력 assertion: `[pass] 격리 후 journal rebuild 결과` | pass | 해당 명령 exit0 |
| catalog.log #46 | 원출력 assertion: `[pass] S10-3A future-schema journal read open` | pass | 해당 명령 exit0 |
| catalog.log #47 | 원출력 assertion: `[pass] S10-3A future-schema unsupported classification` | pass | 해당 명령 exit0 |
| catalog.log #48 | 원출력 assertion: `[pass] S10-3A future-schema catalog open denied` | pass | 해당 명령 exit0 |
| catalog.log #49 | 원출력 assertion: `[pass] S10-3A future-schema catalog retry denied` | pass | 해당 명령 exit0 |
| catalog.log #50 | 원출력 assertion: `[pass] S10-3A future-schema journal bytes preserved` | pass | 해당 명령 exit0 |
| catalog.log #51 | 원출력 assertion: `[pass] S10-3A future-schema SQLite bytes preserved` | pass | 해당 명령 exit0 |
| catalog.log #52 | 원출력 assertion: `[pass] S10-3A future-schema writer cleanup untouched` | pass | 해당 명령 exit0 |
| catalog.log #53 | 원출력 assertion: `[pass] S10-3A arbitrary-schema journal read open` | pass | 해당 명령 exit0 |
| catalog.log #54 | 원출력 assertion: `[pass] S10-3A arbitrary-schema unsupported classification` | pass | 해당 명령 exit0 |
| catalog.log #55 | 원출력 assertion: `[pass] S10-3A arbitrary-schema catalog open denied` | pass | 해당 명령 exit0 |
| catalog.log #56 | 원출력 assertion: `[pass] S10-3A arbitrary-schema catalog retry denied` | pass | 해당 명령 exit0 |
| catalog.log #57 | 원출력 assertion: `[pass] S10-3A arbitrary-schema journal bytes preserved` | pass | 해당 명령 exit0 |
| catalog.log #58 | 원출력 assertion: `[pass] S10-3A arbitrary-schema SQLite bytes preserved` | pass | 해당 명령 exit0 |
| catalog.log #59 | 원출력 assertion: `[pass] S10-3A arbitrary-schema writer cleanup untouched` | pass | 해당 명령 exit0 |
| catalog.log #60 | 원출력 assertion: `[pass] S10-3A empty-schema journal read open` | pass | 해당 명령 exit0 |
| catalog.log #61 | 원출력 assertion: `[pass] S10-3A empty-schema unsupported classification` | pass | 해당 명령 exit0 |
| catalog.log #62 | 원출력 assertion: `[pass] S10-3A empty-schema catalog open denied` | pass | 해당 명령 exit0 |
| catalog.log #63 | 원출력 assertion: `[pass] S10-3A empty-schema catalog retry denied` | pass | 해당 명령 exit0 |
| catalog.log #64 | 원출력 assertion: `[pass] S10-3A empty-schema journal bytes preserved` | pass | 해당 명령 exit0 |
| catalog.log #65 | 원출력 assertion: `[pass] S10-3A empty-schema SQLite bytes preserved` | pass | 해당 명령 exit0 |
| catalog.log #66 | 원출력 assertion: `[pass] S10-3A empty-schema writer cleanup untouched` | pass | 해당 명령 exit0 |
| catalog.log #67 | 원출력 assertion: `[pass] S10-3A future-type journal read open` | pass | 해당 명령 exit0 |
| catalog.log #68 | 원출력 assertion: `[pass] S10-3A future-type unsupported classification` | pass | 해당 명령 exit0 |
| catalog.log #69 | 원출력 assertion: `[pass] S10-3A future-type catalog open denied` | pass | 해당 명령 exit0 |
| catalog.log #70 | 원출력 assertion: `[pass] S10-3A future-type catalog retry denied` | pass | 해당 명령 exit0 |
| catalog.log #71 | 원출력 assertion: `[pass] S10-3A future-type journal bytes preserved` | pass | 해당 명령 exit0 |
| catalog.log #72 | 원출력 assertion: `[pass] S10-3A future-type SQLite bytes preserved` | pass | 해당 명령 exit0 |
| catalog.log #73 | 원출력 assertion: `[pass] S10-3A future-type writer cleanup untouched` | pass | 해당 명령 exit0 |
| catalog.log #74 | 원출력 assertion: `[pass] S10-3A malformed journal open` | pass | 해당 명령 exit0 |
| catalog.log #75 | 원출력 assertion: `[pass] S10-3A malformed JSON missing fields and wrong types remain corrupt` | pass | 해당 명령 exit0 |
| catalog.log #76 | 원출력 assertion: `[pass] S10-O01 reservation journal open` | pass | 해당 명령 exit0 |
| catalog.log #77 | 원출력 assertion: `[pass] S10-O01 first reservation returns four IDs and sequence one` | pass | 해당 명령 exit0 |
| catalog.log #78 | 원출력 assertion: `[pass] S10-O01 versioned reservation payload replays` | pass | 해당 명령 exit0 |
| catalog.log #79 | 원출력 assertion: `[pass] S10-O01 new reservation records actual occurred time` | pass | 해당 명령 exit0 |
| catalog.log #80 | 원출력 assertion: `[pass] S10-O02 identical retry preserves sequence and bytes` | pass | 해당 명령 exit0 |
| catalog.log #81 | 원출력 assertion: `[pass] S10-O03 reopened instance allocates next sequence` | pass | 해당 명령 exit0 |
| catalog.log #82 | 원출력 assertion: `[pass] S10-O03 new process resumes durable sequence` | pass | 해당 명령 exit0 |
| catalog.log #83 | 원출력 assertion: `[pass] S10-O04 different store rejected` | pass | 해당 명령 exit0 |
| catalog.log #84 | 원출력 assertion: `[pass] S10-O04 reused request with different segment rejected` | pass | 해당 명령 exit0 |
| catalog.log #85 | 원출력 assertion: `[pass] S10-O04 reused request with different channel rejected` | pass | 해당 명령 exit0 |
| catalog.log #86 | 원출력 assertion: `[pass] S10-O04 reused segment with different request rejected` | pass | 해당 명령 exit0 |
| catalog.log #87 | 원출력 assertion: `[pass] S10-O04 conflicts preserve original bytes` | pass | 해당 명령 exit0 |
| catalog.log #88 | 원출력 assertion: `[pass] S10-O05/O06 reject and preserve corrupt` | pass | 해당 명령 exit0 |
| catalog.log #89 | 원출력 assertion: `[pass] S10-O05/O06 reject and preserve unsupported-schema` | pass | 해당 명령 exit0 |
| catalog.log #90 | 원출력 assertion: `[pass] S10-O05/O06 reject and preserve unsupported-type` | pass | 해당 명령 exit0 |
| catalog.log #91 | 원출력 assertion: `[pass] S10-O05/O06 reject and preserve tail` | pass | 해당 명령 exit0 |
| catalog.log #92 | 원출력 assertion: `[pass] S10-O05/O06 reject and preserve payload-zero` | pass | 해당 명령 exit0 |
| catalog.log #93 | 원출력 assertion: `[pass] S10-O05/O06 reject and preserve payload-negative` | pass | 해당 명령 exit0 |
| catalog.log #94 | 원출력 assertion: `[pass] S10-O05/O06 reject and preserve payload-fraction` | pass | 해당 명령 exit0 |
| catalog.log #95 | 원출력 assertion: `[pass] S10-O05/O06 reject and preserve payload-overflow` | pass | 해당 명령 exit0 |
| catalog.log #96 | 원출력 assertion: `[pass] S10-O05/O06 reject and preserve duplicate-sequence` | pass | 해당 명령 exit0 |
| catalog.log #97 | 원출력 assertion: `[pass] S10-O05/O06 reject and preserve decreasing-sequence` | pass | 해당 명령 exit0 |
| catalog.log #98 | 원출력 assertion: `[pass] S10-O05/O06 reject and preserve duplicate-request` | pass | 해당 명령 exit0 |
| catalog.log #99 | 원출력 assertion: `[pass] S10-O05/O06 reject and preserve duplicate-segment` | pass | 해당 명령 exit0 |
| catalog.log #100 | 원출력 assertion: `[pass] S10-O05/O06 reject and preserve store-conflict` | pass | 해당 명령 exit0 |
| catalog.log #101 | 원출력 assertion: `[pass] S10-O05/O06 reject and preserve ordinary-before` | pass | 해당 명령 exit0 |
| catalog.log #102 | 원출력 assertion: `[pass] S10-O05/O06 reject and preserve ordinary-after` | pass | 해당 명령 exit0 |
| catalog.log #103 | 원출력 assertion: `[pass] S10-O05/O06 reject and preserve line-cap` | pass | 해당 명령 exit0 |
| catalog.log #104 | 원출력 assertion: `[pass] S10-O05 reservation entity envelope binding rejects mismatch` | pass | 해당 명령 exit0 |
| catalog.log #105 | 원출력 assertion: `[pass] S10-O05 reservation request envelope binding rejects mismatch` | pass | 해당 명령 exit0 |
| catalog.log #106 | 원출력 assertion: `[pass] S10-O01 strict reservation parser accepts versioned literal` | pass | 해당 명령 exit0 |
| catalog.log #107 | 원출력 assertion: `[pass] S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys` | pass | 해당 명령 exit0 |
| catalog.log #108 | 원출력 assertion: `[pass] S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys` | pass | 해당 명령 exit0 |
| catalog.log #109 | 원출력 assertion: `[pass] S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys` | pass | 해당 명령 exit0 |
| catalog.log #110 | 원출력 assertion: `[pass] S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys` | pass | 해당 명령 exit0 |
| catalog.log #111 | 원출력 assertion: `[pass] S10-O06 INT64_MAX identical retry remains valid` | pass | 해당 명령 exit0 |
| catalog.log #112 | 원출력 assertion: `[pass] S10-O06 sequence overflow rejected without write` | pass | 해당 명령 exit0 |
| catalog.log #113 | 원출력 assertion: `[pass] S10-O02 identical durable reservation duplicates remain idempotent` | pass | 해당 명령 exit0 |
| catalog.log #114 | 원출력 assertion: `[pass] S10-O06 sequence gaps remain valid and allocate above maximum` | pass | 해당 명령 exit0 |
| catalog.log #115 | 원출력 assertion: `[pass] S10-O07 four simultaneous processes finish reservations` | pass | 해당 명령 exit0 |
| catalog.log #116 | 원출력 assertion: `[pass] S10-O07 concurrent sequences are unique and complete` | pass | 해당 명령 exit0 |
| catalog.log #117 | 원출력 assertion: `[pass] S10-O07 next sequence follows concurrent reservations` | pass | 해당 명령 exit0 |
| catalog.log #118 | 원출력 assertion: `[pass] S10-O08 ordinary Append cannot reserve orders` | pass | 해당 명령 exit0 |
| catalog.log #119 | 원출력 assertion: `[pass] S10-O08 unopened journal rejected` | pass | 해당 명령 exit0 |
| catalog.log #120 | 원출력 assertion: `[pass] S10-O08 null result rejected` | pass | 해당 명령 exit0 |
| catalog.log #121 | 원출력 assertion: `[pass] S10-O08 invalid opaque ID rejected` | pass | 해당 명령 exit0 |
| catalog.log #122 | 원출력 assertion: `[pass] S10-O08 failed reservation does not expose tentative result` | pass | 해당 명령 exit0 |
| catalog.log #123 | 원출력 assertion: `[pass] S10-O09 unsafe file binding rejected and original preserved inode` | pass | 해당 명령 exit0 |
| catalog.log #124 | 원출력 assertion: `[pass] S10-O09 unsafe file binding rejected and original preserved parent` | pass | 해당 명령 exit0 |
| catalog.log #125 | 원출력 assertion: `[pass] S10-O09 unsafe file binding rejected and original preserved symlink` | pass | 해당 명령 exit0 |
| catalog.log #126 | 원출력 assertion: `[pass] S10-O09 unsafe file binding rejected and original preserved hardlink` | pass | 해당 명령 exit0 |
| catalog.log #127 | 원출력 assertion: `[pass] S10-O10 reservation and normal segment coexist in catalog` | pass | 해당 명령 exit0 |
| catalog.log #128 | 원출력 assertion: `[pass] S10-O04 reserve then finalize permits identical retry` | pass | 해당 명령 exit0 |
| catalog.log #129 | 원출력 assertion: `[pass] S10-O10 reservation survives catalog rebuild without changing segment query` | pass | 해당 명령 exit0 |
| catalog.log #130 | 원출력 assertion: `[pass] S10-O04 legacy segment cannot acquire retroactive reservation` | pass | 해당 명령 exit0 |
| catalog.log #131 | 원출력 assertion: `[pass] S10-M06 opened catalog accepts fresh exact reservation V2 finalize` | pass | 해당 명령 exit0 |
| catalog.log #132 | 원출력 assertion: `[pass] S10-M07 V2 find preserves complete metadata` | pass | 해당 명령 exit0 |
| catalog.log #133 | 원출력 assertion: `[pass] S10-M07 identical V2 recovery is idempotent` | pass | 해당 명령 exit0 |
| catalog.log #134 | 원출력 assertion: `[pass] S10-M07 V2 is absent from V1 range query` | pass | 해당 명령 exit0 |
| catalog.log #135 | 원출력 assertion: `[pass] S10-M07 V2 registered path is not orphan` | pass | 해당 명령 exit0 |
| catalog.log #136 | 원출력 assertion: `[pass] S10-M07 SQLite exact V2 JSON and path match` | pass | 해당 명령 exit0 |
| catalog.log #137 | 원출력 assertion: `[pass] S10-M07 JSONL restart preserves V2 exact payload` | pass | 해당 명령 exit0 |
| catalog.log #138 | 원출력 assertion: `[pass] S10-M06 wrong reservation tuple rejected store` | pass | 해당 명령 exit0 |
| catalog.log #139 | 원출력 assertion: `[pass] S10-M06 wrong reservation tuple rejected request` | pass | 해당 명령 exit0 |
| catalog.log #140 | 원출력 assertion: `[pass] S10-M06 wrong reservation tuple rejected segment` | pass | 해당 명령 exit0 |
| catalog.log #141 | 원출력 assertion: `[pass] S10-M06 wrong reservation tuple rejected channel` | pass | 해당 명령 exit0 |
| catalog.log #142 | 원출력 assertion: `[pass] S10-M06 wrong reservation tuple rejected sequence` | pass | 해당 명령 exit0 |
| catalog.log #143 | 원출력 assertion: `[pass] S10-M09 immutable V2 mapping mismatch rejected` | pass | 해당 명령 exit0 |
| catalog.log #144 | 원출력 assertion: `[pass] S10-M09 bad V2 startup retry preserves original state bad-payload` | pass | 해당 명령 exit0 |
| catalog.log #145 | 원출력 assertion: `[pass] S10-M09 bad V2 startup retry preserves original state missing-order` | pass | 해당 명령 exit0 |
| catalog.log #146 | 원출력 assertion: `[pass] S10-M09 bad V2 startup retry preserves original state bad-order` | pass | 해당 명령 exit0 |
| catalog.log #147 | 원출력 assertion: `[pass] S10-M09 bad V2 startup retry preserves original state conflicting-order` | pass | 해당 명령 exit0 |
| catalog.log #148 | 원출력 assertion: `[pass] S10-M09 bad V2 startup retry preserves original state tail` | pass | 해당 명령 exit0 |
| catalog.log #149 | 원출력 assertion: `[pass] S10-M09 bad V2 startup retry preserves original state corrupt` | pass | 해당 명령 exit0 |
| catalog.log #150 | 원출력 assertion: `[pass] S10-M09 bad V2 startup retry preserves original state unsafe-path` | pass | 해당 명령 exit0 |
| catalog.log #151 | 원출력 assertion: `[pass] S10-M09 default off rejects V2 before SQLite changes` | pass | 해당 명령 exit0 |
| catalog.log #152 | 원출력 assertion: `[pass] S10-M09 V2 replay namespace and deletion duplicate` | pass | 해당 명령 exit0 |
| catalog.log #153 | 원출력 assertion: `[pass] S10-M09 V2 replay namespace and deletion deleted` | pass | 해당 명령 exit0 |
| catalog.log #154 | 원출력 assertion: `[pass] S10-M09 V2 replay namespace and deletion v1-before` | pass | 해당 명령 exit0 |
| catalog.log #155 | 원출력 assertion: `[pass] S10-M09 V2 replay namespace and deletion v1-after` | pass | 해당 명령 exit0 |
| catalog.log #156 | 원출력 assertion: `[pass] S10-M09 V2 replay namespace and deletion deleted-before` | pass | 해당 명령 exit0 |
| catalog.log #157 | 원출력 assertion: `[pass] S10-M09 V2 replay namespace and deletion resurrection` | pass | 해당 명령 exit0 |
| catalog.log #158 | 원출력 assertion: `[pass] S10-M09 V2 replay namespace and deletion mutation-collision` | pass | 해당 명령 exit0 |
| catalog.log #159 | 원출력 assertion: `[pass] S10-M09 V2 finalize rejects missing media` | pass | 해당 명령 exit0 |
| catalog.log #160 | 원출력 assertion: `[pass] S10-M09 V2 finalize rejects directory media` | pass | 해당 명령 exit0 |
| catalog.log #161 | 원출력 assertion: `[pass] S10-M09 fresh candidate rejects mapping` | pass | 해당 명령 exit0 |
| catalog.log #162 | 원출력 assertion: `[pass] S10-M09 fresh candidate rejects path` | pass | 해당 명령 exit0 |
| catalog.log #163 | 원출력 assertion: `[pass] S10-M09 fresh candidate rejects tombstone` | pass | 해당 명령 exit0 |
| catalog.log #164 | 원출력 assertion: `[pass] S10-SW01 managed empty root opens with lifetime lease` | pass | 해당 명령 exit0 |
| catalog.log #165 | 원출력 assertion: `[pass] S10-SW02 same process second managed owner denied` | pass | 해당 명령 exit0 |
| catalog.log #166 | 원출력 assertion: `[pass] S10-SW03 different process owner and inherited use denied` | pass | 해당 명령 exit0 |
| catalog.log #167 | 원출력 assertion: `[pass] S10-SW12 managed duplicate descriptors are close-on-exec` | pass | 해당 명령 exit0 |
| catalog.log #168 | 원출력 assertion: `[pass] S10-SW05 managed reserve append replay use owned descriptor` | pass | 해당 명령 exit0 |
| catalog.log #169 | 원출력 assertion: `[pass] S10-SW06 raw managed access and legacy default path denied` | pass | 해당 명령 exit0 |
| catalog.log #170 | 원출력 assertion: `[pass] S10-SW01 managed Reserve rejects different store identity` | pass | 해당 명령 exit0 |
| catalog.log #171 | 원출력 assertion: `[pass] S10-SW10 catalog connection can inspect managed lease` | pass | 해당 명령 exit0 |
| catalog.log #172 | 원출력 assertion: `[pass] S10-SW04 owner destruction releases lease` | pass | 해당 명령 exit0 |
| catalog.log #173 | 원출력 assertion: `[pass] S10-SW01 managed reopen rejects different store identity` | pass | 해당 명령 exit0 |
| catalog.log #174 | 원출력 assertion: `[pass] S10-SW11 managed incomplete tail rejects append without changing bytes` | pass | 해당 명령 exit0 |
| catalog.log #175 | 원출력 assertion: `[pass] S10-SW07 legacy nonempty root preserved without conversion` | pass | 해당 명령 exit0 |
| catalog.log #176 | 원출력 assertion: `[pass] S10-SW08 partial initialization retry validates exact state lease` | pass | 해당 명령 exit0 |
| catalog.log #177 | 원출력 assertion: `[pass] S10-SW08 partial initialization retry validates exact state init` | pass | 해당 명령 exit0 |
| catalog.log #178 | 원출력 assertion: `[pass] S10-SW08 partial initialization retry validates exact state barrier` | pass | 해당 명령 exit0 |
| catalog.log #179 | 원출력 assertion: `[pass] S10-SW08 partial initialization retry validates exact state journal` | pass | 해당 명령 exit0 |
| catalog.log #180 | 원출력 assertion: `[pass] S10-SW08 partial initialization retry validates exact state incomplete` | pass | 해당 명령 exit0 |
| catalog.log #181 | 원출력 assertion: `[pass] S10-SW08 partial initialization retry validates exact state unknown` | pass | 해당 명령 exit0 |
| catalog.log #182 | 원출력 assertion: `[pass] S10-SW09 symlink inode and malformed marker rejected journal` | pass | 해당 명령 exit0 |
| catalog.log #183 | 원출력 assertion: `[pass] S10-SW09 symlink inode and malformed marker rejected marker` | pass | 해당 명령 exit0 |
| catalog.log #184 | 원출력 assertion: `[pass] S10-SW09 symlink inode and malformed marker rejected barrier` | pass | 해당 명령 exit0 |
| catalog.log #185 | 원출력 assertion: `[pass] S10-SW09 symlink inode and malformed marker rejected root-symlink` | pass | 해당 명령 exit0 |
| catalog.log #186 | 원출력 assertion: `[pass] B02-G01 manifest presence or exact v2 marker rejects v1 fallback and preserves bytes; normal v1 reopen retained` | pass | 해당 명령 exit0 |
| catalog.log #187 | 원출력 assertion: `[pass] B02-G02 live v1 read/write/binding reject manifest appearance or exact v2 marker replacement without byte changes` | pass | 해당 명령 exit0 |
| catalog.log #188 | 원출력 assertion: `[pass] B02-P02 current Catalog export and independent rejection; not cutover/import/raw locator validation` | pass | 해당 명령 exit0 |
| catalog.log #189 | 원출력 assertion: `[pass] S10-SB01 second managed catalog is denied` | pass | 해당 명령 exit0 |
| catalog.log #190 | 원출력 assertion: `[pass] S10-SB02 failed catalog cannot mutate journal or holds` | pass | 해당 명령 exit0 |
| catalog.log #191 | 원출력 assertion: `[pass] S10-SB03 attached catalog blocks unowned append but permits reservation` | pass | 해당 명령 exit0 |
| catalog.log #192 | 원출력 assertion: `[pass] S10-SB04 catalog destruction releases attachment` | pass | 해당 명령 exit0 |
| catalog.log #193 | 원출력 assertion: `[pass] S10-SB05 managed catalog rejects unsafe options outside` | pass | 해당 명령 exit0 |
| catalog.log #194 | 원출력 assertion: `[pass] S10-SB05 managed catalog rejects unsafe options dotdot` | pass | 해당 명령 exit0 |
| catalog.log #195 | 원출력 assertion: `[pass] S10-SB05 managed catalog rejects unsafe options media-symlink` | pass | 해당 명령 exit0 |
| catalog.log #196 | 원출력 assertion: `[pass] S10-SB05 managed catalog rejects unsafe options sqlite-symlink` | pass | 해당 명령 exit0 |
| catalog.log #197 | 원출력 assertion: `[pass] S10-SB05 managed catalog rejects unsafe options sqlite-hardlink` | pass | 해당 명령 exit0 |
| catalog.log #198 | 원출력 assertion: `[pass] S10-SB05 managed catalog rejects unsafe options disabled` | pass | 해당 명령 exit0 |
| catalog.log #199 | 원출력 assertion: `[pass] S10-SB06 failed open releases catalog attachment` | pass | 해당 명령 exit0 |
| catalog.log #200 | 원출력 assertion: `[pass] S10-SB07 managed SQLite sidecar rejected -wal symlink` | pass | 해당 명령 exit0 |
| catalog.log #201 | 원출력 assertion: `[pass] S10-SB07 managed SQLite sidecar rejected -wal hardlink` | pass | 해당 명령 exit0 |
| catalog.log #202 | 원출력 assertion: `[pass] S10-SB07 managed SQLite sidecar rejected -shm symlink` | pass | 해당 명령 exit0 |
| catalog.log #203 | 원출력 assertion: `[pass] S10-SB07 managed SQLite sidecar rejected -shm hardlink` | pass | 해당 명령 exit0 |
| catalog.log #204 | 원출력 assertion: `[pass] S10-SB07 managed SQLite sidecar rejected -journal symlink` | pass | 해당 명령 exit0 |
| catalog.log #205 | 원출력 assertion: `[pass] S10-SB07 managed SQLite sidecar rejected -journal hardlink` | pass | 해당 명령 exit0 |
| catalog.log #206 | 원출력 assertion: `[pass] S10-SC01 managed repeated event fixture is valid` | pass | 해당 명령 exit0 |
| catalog.log #207 | 원출력 assertion: `[pass] S10-SC02 managed reservations avoid history reads` | pass | 해당 명령 exit0 |
| catalog.log #208 | 원출력 assertion: `[pass] S10-SC03 managed V2 finalize avoids full replay` | pass | 해당 명령 exit0 |
| catalog.log #209 | 원출력 assertion: `[pass] S10-SC04 checkpoint reduces superseded event payload bytes` | pass | 해당 명령 exit0 |
| catalog.log #210 | 원출력 assertion: `[pass] S10-SC05 checkpoint preserves latest event and all record identities` | pass | 해당 명령 exit0 |
| catalog.log #211 | 원출력 assertion: `[pass] S10-SC06 checkpoint is idempotent and preserves V2` | pass | 해당 명령 exit0 |
| catalog.log #212 | 원출력 assertion: `[pass] S10-SC08 receipt preserves retry identity and rejects direct append` | pass | 해당 명령 exit0 |
| catalog.log #213 | 원출력 assertion: `[pass] S10-SC09 checkpoint restart preserves SQLite and JSONL state sqlite` | pass | 해당 명령 exit0 |
| catalog.log #214 | 원출력 assertion: `[pass] S10-SC09 managed checkpoint SQL V2 payload and path` | pass | 해당 명령 exit0 |
| catalog.log #215 | 원출력 assertion: `[pass] S10-SC09 checkpoint restart preserves SQLite and JSONL state jsonl` | pass | 해당 명령 exit0 |
| catalog.log #216 | 원출력 assertion: `[pass] S10-SC10 checkpoint prefix recovers before writes` | pass | 해당 명령 exit0 |
| catalog.log #217 | 원출력 assertion: `[pass] S10-SC11 checkpoint mismatch preserves bytes and poisons owner` | pass | 해당 명령 exit0 |
| catalog.log #218 | 원출력 assertion: `[pass] S10-SC12 first accepted mutation controls latest event` | pass | 해당 명령 exit0 |
| catalog.log #219 | 원출력 assertion: `[pass] S10-SC16 automatic checkpoint uses accumulated growth` | pass | 해당 명령 exit0 |
| catalog.log #220 | 원출력 assertion: `[pass] S10-SC07 raw checkpoint is rejected` | pass | 해당 명령 exit0 |
| catalog.log #221 | 원출력 assertion: `[pass] S10-SC18 checkpoint syscall failure poisons and reopens write` | pass | 해당 명령 exit0 |
| catalog.log #222 | 원출력 assertion: `[pass] S10-SC21 poison rejects hold mutation write` | pass | 해당 명령 exit0 |
| catalog.log #223 | 원출력 assertion: `[pass] S10-SC18 checkpoint syscall failure poisons and reopens file-fsync` | pass | 해당 명령 exit0 |
| catalog.log #224 | 원출력 assertion: `[pass] S10-SC21 poison rejects hold mutation file-fsync` | pass | 해당 명령 exit0 |
| catalog.log #225 | 원출력 assertion: `[pass] S10-SC18 checkpoint syscall failure poisons and reopens rename` | pass | 해당 명령 exit0 |
| catalog.log #226 | 원출력 assertion: `[pass] S10-SC21 poison rejects hold mutation rename` | pass | 해당 명령 exit0 |
| catalog.log #227 | 원출력 assertion: `[pass] S10-SC18 checkpoint syscall failure poisons and reopens dir-fsync` | pass | 해당 명령 exit0 |
| catalog.log #228 | 원출력 assertion: `[pass] S10-SC21 poison rejects hold mutation dir-fsync` | pass | 해당 명령 exit0 |
| catalog.log #229 | 원출력 assertion: `[pass] S10-SC17 checkpoint preserves holds observations and deletion` | pass | 해당 명령 exit0 |
| catalog.log #230 | 원출력 assertion: `[pass] S10-SC17 checkpoint SQL hold observation tombstone` | pass | 해당 명령 exit0 |
| catalog.log #231 | 원출력 assertion: `[pass] S10-SC17 checkpoint preserves holds observations and deletion restart sqlite` | pass | 해당 명령 exit0 |
| catalog.log #232 | 원출력 assertion: `[pass] S10-SC17 checkpoint SQL restart observation tombstone` | pass | 해당 명령 exit0 |
| catalog.log #233 | 원출력 assertion: `[pass] S10-SC17 checkpoint preserves holds observations and deletion restart jsonl` | pass | 해당 명령 exit0 |
| catalog.log #234 | 원출력 assertion: `[pass] S10-SC19 invalid managed history remains unchanged malformed` | pass | 해당 명령 exit0 |
| catalog.log #235 | 원출력 assertion: `[pass] S10-SC19 invalid managed history remains unchanged unsupported` | pass | 해당 명령 exit0 |
| catalog.log #236 | 원출력 assertion: `[pass] S10-SC19 invalid managed history remains unchanged conflict` | pass | 해당 명령 exit0 |
| catalog.log #237 | 원출력 assertion: `[pass] S10-SC20 raw catalog rejects receipt before side effects` | pass | 해당 명령 exit0 |
| catalog.log #238 | 원출력 assertion: `[pass] S10-SC13 crypto off raw remains usable` | pass | 해당 명령 exit0 |
| catalog.log #239 | 원출력 assertion: `[pass] S10-SC14 crypto off checkpoint is rejected` | pass | 해당 명령 exit0 |
| catalog.log #240 | 원출력 assertion: `[pass] S10-SC15 crypto off receipt reopen is rejected` | pass | 해당 명령 exit0 |
| catalog.log #241 | 원출력 assertion: `[pass] source 저장 callback reconcile 연결` | pass | 해당 명령 exit0 |
| catalog.log #242 | 원출력 assertion: `[pass] policy revision idempotency` | pass | 해당 명령 exit0 |
| catalog.log #243 | 원출력 assertion: `[pass] 5초 safety reconcile` | pass | 해당 명령 exit0 |
| catalog.log #244 | 원출력 assertion: `[pass] composition root 관리 저장소 선행 open` | pass | 해당 명령 exit0 |
| catalog.log #245 | 원출력 assertion: `[pass] composition helper journal 다음 catalog rebuild/open` | pass | 해당 명령 exit0 |
| catalog.log #246 | 원출력 assertion: `[pass] 서버 전 supervisor 시작` | pass | 해당 명령 exit0 |
| catalog.log #247 | 원출력 assertion: `[pass] ingress 전 event bridge 등록` | pass | 해당 명령 exit0 |
| catalog.log #248 | 원출력 assertion: `[pass] ingress 종료 뒤 recorder finalize` | pass | 해당 명령 exit0 |
| catalog.log #249 | 원출력 assertion: `[pass] composition root 시작/종료 순서` | pass | 해당 명령 exit0 |
| journal.log #1 | 원출력 assertion: `B02-J04 PASS nonempty B read-only open` | pass | 해당 명령 exit0 |
| journal.log #2 | 원출력 assertion: `B02-J04 PASS B path identifies active journal rather than preserved legacy file` | pass | 해당 명령 exit0 |
| journal.log #3 | 원출력 assertion: `B02-J04 PASS active lease FD CLOEXEC` | pass | 해당 명령 exit0 |
| journal.log #4 | 원출력 assertion: `B02-J04 PASS exclusive lease rejects second owner` | pass | 해당 명령 exit0 |
| journal.log #5 | 원출력 assertion: `B02-J05 PASS writes attachment and misleading replay denied` | pass | 해당 명령 exit0 |
| journal.log #6 | 원출력 assertion: `B02-J05 PASS fork authority rejected` | pass | 해당 명령 exit0 |
| journal.log #7 | 원출력 assertion: `B02-J04 PASS read-only original bytes preserved` | pass | 해당 명령 exit0 |
| journal.log #8 | 원출력 assertion: `B02-J04 PASS destructor closes active and lease` | pass | 해당 명령 exit0 |
| journal.log #9 | 원출력 assertion: `B02-J04 PASS lease released and B reopen` | pass | 해당 명령 exit0 |
| journal.log #10 | 원출력 assertion: `B02-J04 PASS fixed current/active accepts growing unopened historical descriptor` | pass | 해당 명령 exit0 |
| journal.log #11 | 원출력 assertion: `B02-J04 PASS fixed current/active accepts growing unopened historical descriptor` | pass | 해당 명령 exit0 |
| journal.log #12 | 원출력 assertion: `B02-J05 PASS marker` | pass | 해당 명령 exit0 |
| journal.log #13 | 원출력 assertion: `B02-J05 PASS manifest` | pass | 해당 명령 exit0 |
| journal.log #14 | 원출력 assertion: `B02-J05 PASS snapshot` | pass | 해당 명령 exit0 |
| journal.log #15 | 원출력 assertion: `B02-J05 PASS identity` | pass | 해당 명령 exit0 |
| journal.log #16 | 원출력 assertion: `B02-J05 PASS active` | pass | 해당 명령 exit0 |
| journal.log #17 | 원출력 assertion: `B02-J05 PASS store` | pass | 해당 명령 exit0 |
| journal.log #18 | 원출력 assertion: `B02-J05 PASS admission` | pass | 해당 명령 exit0 |
| journal.log #19 | 원출력 assertion: `B02-J05 PASS symlink` | pass | 해당 명령 exit0 |
| journal.log #20 | 원출력 assertion: `B02-J05 PASS hardlink` | pass | 해당 명령 exit0 |
| journal.log #21 | 원출력 assertion: `B02-J06 PASS missing-marker` | pass | 해당 명령 exit0 |
| journal.log #22 | 원출력 assertion: `B02-J06 PASS missing-manifest` | pass | 해당 명령 exit0 |
| journal.log #23 | 원출력 assertion: `B02-J06 PASS ordinal` | pass | 해당 명령 exit0 |
| journal.log #24 | 원출력 assertion: `B02-J05 PASS zero B admission refused without changing v1 defaults` | pass | 해당 명령 exit0 |
| journal.log #25 | 원출력 assertion: `B02-J05 PASS opened component replacement rejected` | pass | 해당 명령 exit0 |
| journal.log #26 | 원출력 assertion: `B02-J05 PASS restoring replaced component does not clear poison` | pass | 해당 명령 exit0 |
| journal.log #27 | 원출력 assertion: `B02-J05 PASS opened component replacement rejected` | pass | 해당 명령 exit0 |
| journal.log #28 | 원출력 assertion: `B02-J05 PASS restoring replaced component does not clear poison` | pass | 해당 명령 exit0 |
| journal.log #29 | 원출력 assertion: `B02-J05 PASS opened component replacement rejected` | pass | 해당 명령 exit0 |
| journal.log #30 | 원출력 assertion: `B02-J05 PASS restoring replaced component does not clear poison` | pass | 해당 명령 exit0 |
| journal.log #31 | 원출력 assertion: `B02-J06 PASS backend-enabled v1 open append replay` | pass | 해당 명령 exit0 |
| journal.log #32 | 원출력 assertion: `B02-J06 PASS v1 checkpoint remains available` | pass | 해당 명령 exit0 |
| journal.log #33 | 원출력 assertion: `B02-J06 PASS v1 reopen unchanged` | pass | 해당 명령 exit0 |
| journal.log #34 | 원출력 assertion: `B02-J08 PASS historical-identical-retry` | pass | 해당 명령 exit0 |
| journal.log #35 | 원출력 assertion: `B02-J08 PASS active-identical-retry` | pass | 해당 명령 exit0 |
| journal.log #36 | 원출력 assertion: `B02-J08 PASS reservation-same-retry-and-gap` | pass | 해당 명령 exit0 |
| journal.log #37 | 원출력 assertion: `B02-J09 PASS historical-payload-conflict` | pass | 해당 명령 exit0 |
| journal.log #38 | 원출력 assertion: `B02-J09 PASS historical-time-conflict` | pass | 해당 명령 exit0 |
| journal.log #39 | 원출력 assertion: `B02-J09 PASS active-payload-conflict` | pass | 해당 명령 exit0 |
| journal.log #40 | 원출력 assertion: `B02-J09 PASS active-type-conflict` | pass | 해당 명령 exit0 |
| journal.log #41 | 원출력 assertion: `B02-J09 PASS reservation-timestamp-conflict` | pass | 해당 명령 exit0 |
| journal.log #42 | 원출력 assertion: `B02-J09 PASS reservation-tuple-conflict` | pass | 해당 명령 exit0 |
| journal.log #43 | 원출력 assertion: `B02-J09 PASS reservation-retrograde` | pass | 해당 명령 exit0 |
| journal.log #44 | 원출력 assertion: `B02-J09 PASS reservation-segment-reuse` | pass | 해당 명령 exit0 |
| journal.log #45 | 원출력 assertion: `B02-J09 PASS reservation-ordinary-id-collision` | pass | 해당 명령 exit0 |
| journal.log #46 | 원출력 assertion: `B02-J09 PASS reservation-legacy-segment-collision` | pass | 해당 명령 exit0 |
| journal.log #47 | 원출력 assertion: `B02-J09 PASS reservation-store-conflict` | pass | 해당 명령 exit0 |
| journal.log #48 | 원출력 assertion: `B02-J09 PASS first-reservation-store-conflict` | pass | 해당 명령 exit0 |
| journal.log #49 | 원출력 assertion: `B02-J09 PASS ordinary-reservation-id-collision` | pass | 해당 명령 exit0 |
| journal.log #50 | 원출력 assertion: `B02-J08 PASS event-receipt-compatible` | pass | 해당 명령 exit0 |
| journal.log #51 | 원출력 assertion: `B02-J08 PASS historical event accepts compatible receipt` | pass | 해당 명령 exit0 |
| journal.log #52 | 원출력 assertion: `B02-J08 PASS historical receipt accepts original event retry` | pass | 해당 명령 exit0 |
| journal.log #53 | 원출력 assertion: `B02-J09 PASS receipt-original-digest-conflict` | pass | 해당 명령 exit0 |
| journal.log #54 | 원출력 assertion: `B02-J08 PASS last uint64 ordinal accepted read-only` | pass | 해당 명령 exit0 |
| journal.log #55 | 원출력 assertion: `B02-J09 PASS ordinal overflow rejected` | pass | 해당 명령 exit0 |
| journal.log #56 | 원출력 assertion: `B02-J10 PASS active opaque link reacquires physical row` | pass | 해당 명령 exit0 |
| journal.log #57 | 원출력 assertion: `B02-J11 PASS ended link rejected with output and lease preserved` | pass | 해당 명령 exit0 |
| journal.log #58 | 원출력 assertion: `B02-J10 PASS new session does not revive ended link` | pass | 해당 명령 exit0 |
| journal.log #59 | 원출력 assertion: `B02-J11 PASS old epoch remains invalid` | pass | 해당 명령 exit0 |
| journal.log #60 | 원출력 assertion: `B02-J11 PASS fork link rejected` | pass | 해당 명령 exit0 |
| journal.log #61 | 원출력 assertion: `B02-J11 PASS missing ID preserves output link` | pass | 해당 명령 exit0 |
| journal.log #62 | 원출력 assertion: `B02-J11 PASS same-size active tamper poisons without replacing output` | pass | 해당 명령 exit0 |
| journal.log #63 | 원출력 assertion: `B02-J10 PASS reservation` | pass | 해당 명령 exit0 |
| journal.log #64 | 원출력 assertion: `B02-J10 PASS receipt` | pass | 해당 명령 exit0 |
| journal.log #65 | 원출력 assertion: `B02-J10 PASS uint64` | pass | 해당 명령 exit0 |
| journal.log #66 | 원출력 assertion: `B02-J11 PASS recording-generation.json` | pass | 해당 명령 exit0 |
| journal.log #67 | 원출력 assertion: `B02-J11 PASS .recording-store-format` | pass | 해당 명령 exit0 |
| journal.log #68 | 원출력 assertion: `B02-J10 PASS historical ordinal seven cold acquisition preserves original` | pass | 해당 명령 exit0 |
| journal.log #69 | 원출력 assertion: `B02-J11 PASS foreign instance rejected without poisoning owner` | pass | 해당 명령 exit0 |
| journal.log #70 | 원출력 assertion: `B02-J11 PASS historical archive corruption preserves output` | pass | 해당 명령 exit0 |
| journal.log #71 | 원출력 assertion: `B02-J11 PASS destroyed owner link rejected after reopen` | pass | 해당 명령 exit0 |
| journal.log #72 | 원출력 assertion: `B02-J06 PASS disabled backend or crypto refuses B` | pass | 해당 명령 exit0 |
| journal.log #73 | 원출력 assertion: `B02-J06 PASS backend-enabled v1 open append replay` | pass | 해당 명령 exit0 |
| journal.log #74 | 원출력 assertion: `B02-J06 PASS v1 reopen unchanged` | pass | 해당 명령 exit0 |
| journal.log #75 | 원출력 assertion: `B02-J06 PASS disabled backend or crypto refuses B` | pass | 해당 명령 exit0 |
| journal.log #76 | 원출력 assertion: `B02-J06 PASS backend-enabled v1 open append replay` | pass | 해당 명령 exit0 |
| journal.log #77 | 원출력 assertion: `B02-J06 PASS v1 checkpoint remains available` | pass | 해당 명령 exit0 |
| journal.log #78 | 원출력 assertion: `B02-J06 PASS v1 reopen unchanged` | pass | 해당 명령 exit0 |

## 실행 소유 임시 경로 정리

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-generation-scratch.urzSQo` | 격리 검사 fixture/실행 파일 | 7521178 | runner 정리 | removed=true | b02-cut-acceptance-candidates-fixed.log |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-generation-scratch.B0Y6qK` | 격리 검사 fixture/실행 파일 | 0 | runner 정리 | removed=true | b02-cut-acceptance-candidates.log |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-generation-scratch.MCfHAq` | 격리 검사 fixture/실행 파일 | 7487616 | runner 정리 | removed=true | b02-cut-acceptance-first.log |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-generation-scratch.O1WUWj` | 격리 검사 fixture/실행 파일 | 20481528 | runner 정리 | removed=true | b02-cut-acceptance-green.log |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-generation-scratch.21pKmD` | 격리 검사 fixture/실행 파일 | 7608984 | runner 정리 | removed=true | b02-cut-acceptance-named-red-v2.log |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-generation-scratch.rLHM4I` | 격리 검사 fixture/실행 파일 | 7608984 | runner 정리 | removed=true | b02-cut-acceptance-named-red.log |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-generation-scratch.DxbeKy` | 격리 검사 fixture/실행 파일 | 7497877 | runner 정리 | removed=true | b02-cut-acceptance-path-fixed.log |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-generation-scratch.FBfxrF` | 격리 검사 fixture/실행 파일 | 7763907 | runner 정리 | removed=true | b02-cut-direct-request-red.log |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-generation-scratch.qAO3Y7` | 격리 검사 fixture/실행 파일 | 20643263 | runner 정리 | removed=true | b02-cut-final-green.log |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-generation-projection.I3X2c6` | 격리 검사 fixture/실행 파일 | 7399322 | runner 정리 | removed=true | b02-cut-final-projection-negative.log |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-generation-projection.6pA8eC` | 격리 검사 fixture/실행 파일 | 7398970 | runner 정리 | removed=true | b02-cut-final-projection.log |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-generation-projection.0BEpfX` | 격리 검사 fixture/실행 파일 | 7399146 | runner 정리 | removed=true | b02-cut-projection-regression-command-fixed.log |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-generation-scratch.laW2oD` | 격리 검사 fixture/실행 파일 | 7635226 | runner 정리 | removed=true | b02-cut-source-protection.log |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-generation-scratch.OmONn8` | 격리 검사 fixture/실행 파일 | 7753839 | runner 정리 | removed=true | b02-cut-terminal-red.log |
| `/tmp/media_server_v410_recording_catalog-88700` | 격리 검사 fixture/실행 파일 | 28680274 | runner 정리 | removed=true | catalog.log |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-journal-generation-readonly.HPkvb4` | 격리 검사 fixture/실행 파일 | 11632140 | runner 정리 | removed=true | journal.log |

| `/private/tmp/b02-cut-acceptance-candidates-fixed.log` | 원출력 로그 | 7124 | SHA·원문 일치 확인 뒤 제거 | 저장소 gzip 보존·원위치 부재 | `1dbb830bb0ac82519d8a84eab387d642c2bc4ab069063281e5b96813d108d309` |
| `/private/tmp/b02-cut-acceptance-candidates.log` | 원출력 로그 | 5096 | SHA·원문 일치 확인 뒤 제거 | 저장소 gzip 보존·원위치 부재 | `3852891b8e888d8356b1477045ab1f7aa6c3222721861a07268982259288a5a1` |
| `/private/tmp/b02-cut-acceptance-first.log` | 원출력 로그 | 5527 | SHA·원문 일치 확인 뒤 제거 | 저장소 gzip 보존·원위치 부재 | `d4f8ce17b2087200b88fd9bfd5b29de2892380cc36d56af7b6c67a2ae35fe150` |
| `/private/tmp/b02-cut-acceptance-green.log` | 원출력 로그 | 8397 | SHA·원문 일치 확인 뒤 제거 | 저장소 gzip 보존·원위치 부재 | `fbd58a8c4815a56bb80c6c33120fb6fabf3a7c5aae05328a8bcba9e6f044c4e1` |
| `/private/tmp/b02-cut-acceptance-named-red-v2.log` | 원출력 로그 | 8917 | SHA·원문 일치 확인 뒤 제거 | 저장소 gzip 보존·원위치 부재 | `b123857ef906ed14e29ac5a6dc6bfd5e1844408b76e55aea8bca24fdb15589ed` |
| `/private/tmp/b02-cut-acceptance-named-red.log` | 원출력 로그 | 9037 | SHA·원문 일치 확인 뒤 제거 | 저장소 gzip 보존·원위치 부재 | `2c038a80a9f884afe7abad1c80a3c17dab0c902d033a1a85694a11a46e4cae45` |
| `/private/tmp/b02-cut-acceptance-path-fixed.log` | 원출력 로그 | 6339 | SHA·원문 일치 확인 뒤 제거 | 저장소 gzip 보존·원위치 부재 | `29da5348b2514247d69ac43bf932ec82c51610f0fafdbfe598acd651ba5c1185` |
| `/private/tmp/b02-cut-direct-request-red.log` | 원출력 로그 | 10848 | SHA·원문 일치 확인 뒤 제거 | 저장소 gzip 보존·원위치 부재 | `c928ca458a45386a152278e3a49769fe3ddb3c0ba4be66c8d5f0061597f91479` |
| `/private/tmp/b02-cut-final-green.log` | 원출력 로그 | 10569 | SHA·원문 일치 확인 뒤 제거 | 저장소 gzip 보존·원위치 부재 | `36133e29696187d3168e2af39b7dd323a774c43152af37ddebdd3c52eaf5f615` |
| `/private/tmp/b02-cut-final-projection-negative.log` | 원출력 로그 | 4110 | SHA·원문 일치 확인 뒤 제거 | 저장소 gzip 보존·원위치 부재 | `7bf2d08bf9ab2b6e6e495706c21d84e010f1f3f11181d919578e3698271f2060` |
| `/private/tmp/b02-cut-final-projection.log` | 원출력 로그 | 4037 | SHA·원문 일치 확인 뒤 제거 | 저장소 gzip 보존·원위치 부재 | `7a455a5b76a525ad744d849d1bd26f2b00c840a77798826b4b390de69967871d` |
| `/private/tmp/b02-cut-projection-regression-command-fixed.log` | 원출력 로그 | 4037 | SHA·원문 일치 확인 뒤 제거 | 저장소 gzip 보존·원위치 부재 | `963eb22a089f6fd9bb81dfcba067466a8a08292acc9a809e7773a36a0ec52597` |
| `/private/tmp/b02-cut-projection-regression.log` | 원출력 로그 | 106008 | SHA·원문 일치 확인 뒤 제거 | 저장소 gzip 보존·원위치 부재 | `615a6fb7d0b707510d543095aaa3fb0f7ec40877371aff35e7aa709cd6f4fc68` |
| `/private/tmp/b02-cut-source-protection.log` | 원출력 로그 | 9008 | SHA·원문 일치 확인 뒤 제거 | 저장소 gzip 보존·원위치 부재 | `df767e4fcf969c157220d49af80f68a30059fd76412988bdee7f69e6fe776065` |
| `/private/tmp/b02-cut-terminal-red.log` | 원출력 로그 | 10309 | SHA·원문 일치 확인 뒤 제거 | 저장소 gzip 보존·원위치 부재 | `b315077194afe3aecc4fc9d26f37710e65f72d38b070edfc5d61d058769cf7e5` |

빌드는 저장소의 기존 build-gst-onnx 출력이며 임시 fixture가 아니다. dispatch 오타는 runner 임시 경로를 만들지 않았다.
문서 마감은 `verify-docs-links` exit0(330문서·12,853링크·오류0), `verify-docs-ui-assets` exit0(10/10), `git diff --check` exit0이다. 원출력은 이 디렉터리의 docs-links.txt/docs-assets.txt에 보존했다.
보존 자료는 합성 fixture·진단 출력이며 비밀번호·운영 데이터·외부 source URL을 포함하지 않는다.
