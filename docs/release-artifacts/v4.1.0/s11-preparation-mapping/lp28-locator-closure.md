# LP28 — 검토 위치 일관성 및 고정 소스 재결속

독자: v4.1.0 검증기·독립 검토 담당자. 수명: 현재 검증기 보완부터 S11 단기 마감까지.
작업 정책은 AGENTS.md, 실행 기록 source-of-truth는 중앙 release-test-records다.
LP27은 실제 미디어/PREP 실행 이력이고 이 문서는 승인된 위치 판정 수정·변경분 검토의 증거다.

## 승인 범위와 불변 조건

사용자 승인: 1 위치 처리 → 2 실제 변경/검사 공백 → 3 CLOSE·고정 → 4 독립 재결속/PREP →
5 S11 단기, 순차 개발·분할 커밋·최종 조건부 푸시. 외부 서비스/실기기는 명시 제외(PASS 아님).
30분·실제 UI/브라우저·120분·PR/병합/tag/Release는 이번 실행 범위 밖이다.
시작 HEAD76af0602d, 이전 PREP의 미커밋 소스·증거는 보존하고 해당 단계에서 마감한다.
제품 시간·ID·저장·보존·인증/schema/media·timeout은 변경하지 않는다.

메인은 계약·실제 diff·최종 판정, 기존 단일 Astra/medium 담당자는1번 구현을 맡는다.
하위 생성 금지. 승인 proof/approval/digest는 원본 불변이며 현재 위치 view를 별도로 만든다.
anchor와 context가 유일하게 일치해야 위치를 해석한다. 실제 함수 내용/검증기 변경과 모호성은 거부한다.
원본 edge 결속 검사는 원본에서 유지하고 실제 소스 읽기는 일관된 현재 위치/범위에서 한다.
원장 재결속은1번 PASS가 아니며4번 독립 판단 뒤 수행한다.

## 실행 전 정의

영역: 아래 R4L 전체는 안정화 도구 자체검사다. 30분/120분/UI는 비대상(UI가 없어야 정상).
RED 명령: `node --test --test-name-pattern='R4L02' scripts/internal/verify_review4_locator_resolution.test.mjs`.
GREEN 명령: `node --test scripts/internal/verify_review4_locator_resolution.test.mjs`.
예상 RED는 R4L02에서37행 삽입 후 `validateSemanticItem()`의 기대 오류 배열 `[]`와
낡은 위치로 발생하는 실제 오류의 불일치다. 미구현 위치 view에 해당하는 assertion만 RED로
인정하며 환경·빌드 오류는 별도 실패다. 나머지 이동/거부/cache 반례도 GREEN에서 개별 확인한다.
R4L01 baseline 자체가 불완전하면 fixture 준비 오류를 먼저 바로잡고 뒤 단계로 가지 않는다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| R4L01 | 원위치 baseline | 합성 source·승인 proof의 기존 hard trust/semantic 판정 | v4.1.0 |
| R4L02 | 앞 삽입 이동 | 동일 anchor/context/body가 이동해도 현재 위치로 판정 | v4.1.0 |
| R4L03 | 앞 삭제 이동 | 위 조건에서 음의 offset 이동도 동일 처리 | v4.1.0 |
| R4L04 | 중복 위치 | 기존 위치에 그대로 남은 경우도 동일 anchor/context 두 개면 거부 | v4.1.0 |
| R4L05 | 문맥 변경 | anchor만 같고 context가 변하면 거부 | v4.1.0 |
| R4L06 | 함수 내용 변경 | anchor/context 밖 enclosing body 변경은 hard trust 실패 | v4.1.0 |
| R4L07 | assertion 삭제 | 원 assertion이 없어지면 다른 코드로 보충하지 않음 | v4.1.0 |
| R4L08 | 검증기 변경 | verifier 본문/dispatch 변경을 기존 승인으로 수락하지 않음 | v4.1.0 |
| R4L09 | 동일 프로세스 이동 | 이미 읽은 파일 수정 후 옛 cache로 판정하지 않음 | v4.1.0 |
| R4L10 | 동일 프로세스 변경 | context/body 수정 시 재읽어 거부 | v4.1.0 |
| R4L11 | 승인 불변 | 입력 proof/digest deep equality로 mutation 부재 확인 | v4.1.0 |
| R4L12 | 낡은 범위 decoy | 옛 위치의 무관 assertion으로 현재 실패를 가리지 않음 | v4.1.0 |
| R4L13 | 정리 | 실행 소유 fixture root의 종류·크기·삭제·부재 확인 | v4.1.0 |
| R4L14 | 현재 source token corpus | 동일 프로세스에서 파일 추가/수정/삭제 후 obligation의 현재 source token 결속 갱신; 파일 목록·stat fingerprint 사용 | v4.1.0 |
| R4L-M | 기존 migration 회귀 | `./server.sh verify-v390-review4-semantic-migration-contract`, 원자 교체·trust·snapshot 기존 반례 유지 | v4.1.0 |
| R4L-A | 기존 approval 자체검사 | `./server.sh verify-v390-review4-feature-semantic-source-approval-selftest`, 자동 승인/원장 쓰기 금지 | v4.1.0 |

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 위치/승인 focused | 진행 대상 | 사용자1번 및 위치 소비 불일치 | R4L01~14/M/A | 승인·실행 대기 |
| 전체 inventory/재결속 | 진행 대상 | 사용자2/4번 | 기존986개 proof·1067오류 | 선수 후·1번 PASS 대체 아님 |
| CLOSE·S11 단기 | 진행 대상 | 사용자3/5번 | LP27 FINAL manifest | 선수 후 |
| 30분/UI/120분 | 진행 대상 | AGENTS7·S11·media/lifecycle 변경 | LP27 FINAL-30/UI/120 | 이번 미실행 |
| 외부 서비스·실기기 | 미진행 | 사용자 명시 제외 | 외부 TURN/WHEP/cloud/ONVIF/장치 | 제외·PASS 아님 |

## 실행 상태

1번 focused·영향 회귀 통과. 메인이 실제 diff·13개 반례와 원출력을 대조했다.
`feature_semantic_evidence_lib.mjs`는 원본 proof/digest/edge 검사를 유지하고 유일한 현재 위치와
현재 함수 범위만 별도 view로 소비한다. 기존 hard trust와 현재 bindings 비교는 그대로 남는다.
`feature_semantic_review4_trust_lib.mjs`의 source token corpus는 파일 목록/stat(ns) 변경을 감지한다.
신규 `verify_review4_locator_resolution.test.mjs`는 합성 proof만 사용하며 승인 원장을 만들지 않는다.

최초 R4L02는 fixture expectedBehaviorSha의 공백 정규화 준비 오류가 예상 오류와 함께 발생했다.
전체를 예상 RED로 간주하지 않고 fixture 수정 후 동일 R4L02에서 위치 오류만 재현했다.
첫 GREEN의 R4L06은 body-only 변조가 인접 context도 바꾼 fixture 오류였다. 독립행 변조로
분리한 뒤12PASS, 동일 프로세스 body/decoy/corpus와 정리 증거 보완 뒤 최종13PASS다.
실패 이력: [첫 RED](lp28-locator-red.log), [분리 RED](lp28-locator-red-02.log),
[첫 GREEN 시도](lp28-locator-green-01.log), [중간 GREEN](lp28-locator-green-02.log).
최종 [focused 원출력](lp28-locator-green-final.log), [migration](lp28-locator-migration.log),
[approval 자체검사](lp28-locator-approval.log). RED exit1, GREEN/영향 회귀 exit0.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| R4L02 최초 준비 | expectedBehaviorSha 정규화 준비 오류 포함·exit1 | FAIL |
| R4L02 분리 RED | 현재 위치 미반영으로 기대[]와 readback 오류3개 불일치·exit1 | FAIL |
| R4L06 첫 GREEN | context와 body 변조를 분리하지 못한 fixture·11PASS/1FAIL | FAIL |
| R4L01 원위치 | 최종 node --test·baseline exact | PASS |
| R4L02 삽입 이동 | 동일 본문37행 이동, 최초 실패 후 보완 | PASS |
| R4L03 삭제 이동 | 앞30행 삭제 후 동일 판정 | PASS |
| R4L04 모호성 | 원위치 포함 중복 문맥 거부 | PASS |
| R4L05 문맥 | anchor 동일/context 변경 거부 | PASS |
| R4L06 본문 | context 불변/body 변경 거부, fixture 수정 후 | PASS |
| R4L07 삭제 | assertion 제거 거부 | PASS |
| R4L08 verifier | 검증기 변경 hard trust 거부 | PASS |
| R4L09 재읽기 | 같은 프로세스 이동 재판정 | PASS |
| R4L10 재읽기 거부 | context 변경과 body-only 변경을 각각 거부 | PASS |
| R4L11 승인 불변 | 원 입력/proof/digest deep equality | PASS |
| R4L12 decoy | context 유효·현재 failure 분기 제거, 옛 decoy로 보충 불가 | PASS |
| R4L13 정리 |13개 소유 fixture 삭제/부재·개별 bytes 원출력 보존 | PASS |
| R4L14 corpus | 같은 프로세스 source token 추가/수정/삭제 반영 | PASS |
| R4L-M binding | 기존 positive/negative9, no-write migration 명령 | PASS |
| R4L-M trust | 기존 trust-only6 | PASS |
| R4L-M transaction | 기존 원자교체2 | PASS |
| R4L-M input | 기존 입력경로5 | PASS |
| R4L-M entry | 기존 producer negative1 | PASS |
| R4L-M date | 기존 reviewedOn1 | PASS |
| R4L-M snapshot | 기존 snapshot/trust6, 총30/0 | PASS |
| R4L-A | 기존 approval negative11/0, gateStatus:not-run | PASS |
| 문서 링크 | verify-docs-links exit0·289문서/9558링크/22이미지/160anchor | PASS |
| 스크립트 dispatch parser | verify-script-inventory exit0·bash/node 해석 | PASS |
| 스크립트 dispatch target | 실제 파일/실행 가능 | PASS |
| 문서 명령 | 문서 명령과 dispatch 일치 | PASS |
| 스크립트 참조 | 추적 파일 분류/참조 | PASS |
| inventory 역할 분리 | script inventory 위임 | PASS |
| inventory verifier family | dispatch 중복 없이 family 연결 | PASS |
| CMake registry | 별도 미추적 CTest registry 없음 | PASS |
| test entry | test_all에서 도달 | PASS |
| auth 비밀번호 | 고정 기본 비밀번호 없음 | PASS |
| EventRecord dispatch | 초기 실패와 매 poll 전달 | PASS |
| 결과 표현 | 핵심 verifier grouped PASS 표현 없음 | PASS |
| CLI option | 사용자 노출 JS unknown option 거부 | PASS |
| 자산 README | verify-docs-ui-assets exit0·대표 이미지 | PASS |
| 자산 English README | 영문 이미지 | PASS |
| 자산 UI guide | 공유 자산 | PASS |
| 자산 capture policy | 촬영 규칙 | PASS |
| 자산 manifest | managed 목록 | PASS |
| 자산 ownership | capture 소유 | PASS |
| 자산 capture coverage | 현재 이미지 연결 | PASS |
| 자산 stale reference | 오래된 시각 baseline 링크 없음 | PASS |
| 자산 files | managed PNG 존재 | PASS |
| 자산 VA frame | full frame 문서 기준 | PASS |
| 공백 | git diff --check exit0 | PASS |
| 신규 로그 stage 공백 최초 | git diff --cached --check exit2, Node assertion 출력의 빈 줄 끝 공백6곳 | FAIL |
| 신규 로그 stage 공백 보완 | 끝 공백만 정리 후 동일 git diff --cached --check exit0 | PASS |
| 임시 잔여 확인 | TMPDIR의 실행 prefix read-only 조회, locator/migration/transaction/input/date 잔여0 | PASS |

최종 focused13/0·76.921ms, migration30/0·0.183초, approval11/0·0.064초.
스크립트 등록12/0·자산10/0·문서/공백 통과. 링크/자산 검사는 실제 이미지 시각 검수 PASS가 아니다.
최초/중간 fixture와 기존 migration runner는 finally 정리하며 byte 계측은 없어 미집계다.
최종13 fixture 합계18,503B와 부재, 별도 prefix 잔여0은 직접 확인했다.
신규 로그까지 stage한 공백 검사에서 Node assertion 출력의 빈 줄 끝 공백6곳을 발견했다.
red/red-02/green-01 로그는 이 공백만 제거해 보존하며 원출력 byte 동일성을 주장하지 않는다.
명령·오류·결과·수치·이력은 그대로다. 제품/검사 로직 수정이나 테스트 재실행 사유가 아니다.
정리 전 SHA256: green-01 `06b5c9433eab4a9e86d9ab29dc5b088cc82cc5244c52ec33514ab27aa7429433`,
red-02 `5527186bbcd4222bbdab849e1b38f3f265403109b53e682df6cf1fbec475178e`,
red `db5b24962da946b293984286d611e171d85adb94dd2402393a2e9bbf8384d4ed`.
이 자체검사는 제품 runtime·전체 inventory·승인 원장 재결속·PREP/S11 완료가 아니다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| 실행별 TMPDIR/review4-locator-* 13개 |0700 합성 source fixture |943~1875B/개, 개별값 최종 로그 | 해당 실행 소유 root만 삭제 |13개 부재 확인 | R4L13 각 행 |
| lp28-locator-*.log | 비민감 테스트 결과 | 소형 text7개 | 저장소 보존 | 실패/수정/GREEN·관련 회귀 | 위 링크 |

제품 실행·port·운영 데이터는1번에서 사용하지 않는다. 필요한 임시 fixture만 작업 소유 root에 생성·정리한다.
token start/end/consumed는 전용 집계 부재로 미집계. elapsed와source는 실제 결과로 기록한다.

## 2번 실행 전 정의 — 실제 변경과 검사 공백

1번 `f8ed4546` 커밋 완료. 아래는 전체 inventory PASS를 시도하는 반복 실행이 아니라
기존 FAIL의 원인별 진단이다. 원장 쓰기/자동 승인 없이 현재 오류와 candidate 상태를 한 번씩 수집한다.
기존 inventory SHA/함수 변경 결속은 남는 것이 예상 상태이며 실제 검사 실패와 분리한다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| LP28-D01 | 현행 결속 진단 | parseFeatureRows/loadImplementationManifest/validateImplementationManifest 1회,986행·전체 errors·elapsed JSON. exit0은 수집 성공일 뿐 ok:false는 FAIL 유지 | v4.1.0 |
| LP28-D02 | 현재 source 후보 | source-audit --emit-candidate, 승인 없는 candidate986행의 unresolved·역할/edge 대조 | v4.1.0 |
| LP28-D03 | 변경 원인 대조 | S07 기준부터 소스10파일 diff·공통 함수 영향·새 위치 해석을 오류 ID와 연결. unresolved를 검사 부재로 단정하지 않음 | v4.1.0 |

영역은 안정화 진단만이며30분/120분/UI 비대상이다. 전체 manifest/PREP gate PASS는4번에서 별도로 판정한다.

### 현재 source 대조로 발견한 판정 보완

D01은986행/705오류·35,452.814ms: inventory1/trust540/locator158/semantic6, 영향372ID다.
수집 exit0은 PASS가 아니다. 이전1067과 분류 조건이 달라 단순 감소율을 품질 수치로 쓰지 않는다.
D02의 승인 없는 candidate986행 중33개 unresolved. 이 후보로 approval을 생성하지 않았다.
1번의13개 합성 반례에는 선택 role와 타 함수의 같은 문장이 없었다. 실제 대조에서 다음을 발견했다.

- 고정6개 resolvedRoles만 구성해 기존 route/control/controlReadback이 누락: UI039/043/044와RULE001~003의 route 근거 오류.
- 서로 다른 승인 함수의 동일 anchor/context를 전체 파일 수준으로 모두 모호하다고 거부.
  기존 enclosing body scope/symbol/hash까지 결합해 단1개이면 위치가 결정되며, 동일 body 안/복제 body의 복수 후보는 계속 거부해야 한다.

메인이 새 근거를 직접 확인하고 같은 단계에서 보완한다. 제품·원장·합격 의미는 바꾸지 않는다.
1번 focused PASS를 실제986행 정합 PASS로 확대하지 않는다. 아래 실행 전 정의는1번 보완의 영향 반례다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| R4L15 | 선택 role 보존 | route/control/controlReadback의 현재 위치·obligation,37행 이동PASS·context/body변경거부·원proof불변 | v4.1.0 |
| R4L16 | 타 함수 동일문장 | 승인 scope/symbol/body hash에 맞는 단1후보만 해석 | v4.1.0 |
| R4L17 | 실제 모호성 | 동일 함수 안 두 후보·동일 함수 통째 복제는 거부, R4L04 유지 | v4.1.0 |
| R4L18 | 불일치 fallback 금지 | 모든 후보body가 다르면 기존line이 일치해도 거부·approval불변 | v4.1.0 |

RED: `node --test --test-name-pattern='R4L15|R4L16' scripts/internal/verify_review4_locator_resolution.test.mjs`.
예상은 선택 role route 근거 누락 및 타 함수 문맥 모호성 오류다. GREEN은 동일 파일 전체와 기존M/A 영향 회귀다.

### 선택 role·승인 함수 구분 보완 결과

메인 실제 diff/원출력 대조: 필수6개와 선택 role 전체를 현재 view에 포함한다.
복수 문맥 후보는 기존 승인 file/symbol/scope/body SHA로 단1개가 입증되는 경우만 해석한다.
새 hash를 승인 자료에 넣지 않으며 최종 hard trust 비교도 유지한다. 동일 함수 내 중복·함수 복제는 거부한다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| R4L15 보완 RED | 선택3role 및 route obligation 누락, 기대[] 불일치·exit1 | FAIL |
| R4L16 보완 RED | 다른 함수의 동일 문맥을 모호성으로 거부·exit1 | FAIL |
| R4L01 보완 회귀 | baseline exact | PASS |
| R4L02 보완 회귀 | 삽입 이동 | PASS |
| R4L03 보완 회귀 | 삭제 이동 | PASS |
| R4L04 보완 회귀 | 원위치 포함 중복 거부 | PASS |
| R4L05 보완 회귀 | 문맥 변경 거부 | PASS |
| R4L06 보완 회귀 | 본문 변경 거부 | PASS |
| R4L07 보완 회귀 | assertion 삭제 거부 | PASS |
| R4L08 보완 회귀 | verifier 변경 거부 | PASS |
| R4L09 보완 회귀 | 동일 프로세스 이동 | PASS |
| R4L10 보완 회귀 | 동일 프로세스 문맥/본문 변경 | PASS |
| R4L11 보완 회귀 | 승인 원본 불변 | PASS |
| R4L12 보완 회귀 | 옛 범위 decoy 거부 | PASS |
| R4L14 보완 회귀 | 현재 source token 변경 반영 | PASS |
| R4L15 선택 role | 기존 위치/37행 이동 허용·context/body변경 거부·원proof불변 | PASS |
| R4L16 함수 구분 | 기존 승인 본문으로 단1후보 식별 | PASS |
| R4L17 실제 모호성 | 같은 함수 안2후보와 동일 함수 통째 복제 각각 거부 | PASS |
| R4L18 fallback 금지 | 승인 body에 맞는 후보가 없으면 옛line으로 돌아가지 않음 | PASS |
| R4L13 보완 정리 |18개 fixture·26,881B 제거/부재 개별 확인 | PASS |
| R4L-M 보완 회귀 | 기존30계약·0FAIL, exit0·0.179초 | PASS |
| R4L-A 보완 회귀 | 기존11반례·0FAIL, exit0·0.051초·gate not-run | PASS |

[RED](lp28-locator-followup-red.log) 2FAIL·52.494ms,
[GREEN](lp28-locator-followup-green.log)17PASS·90.318ms,
[migration](lp28-locator-followup-migration.log), [approval](lp28-locator-followup-approval.log).
RED 로그의 Node 빈 줄 끝 공백만 보존 형식에 맞춰 제거하며 오류/수치/판정을 변경하지 않는다.
운영 데이터·제품 실행·port 없음. 새 source 후보/원장 자동 갱신 없음.

현재 소스 진단은 보완 전 [705오류](lp28-current-diagnostic.json), 보완 후
[604오류](lp28-current-diagnostic-02.json)를 따로 보존한다. 후자는39,177.203ms,
inventory1/trust575/locator28/semantic0이다. 진단 수집 exit0은 완료 PASS가 아니다.
나머지 위치 오류는 변경된 실제 context 또는 같은 큰 함수 안 중복이며2번에서 검토할 대상이다.
추적된 기존 승인 원장은 그대로 두었다. source 후보의33개 미해석도 아직 닫지 않았다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| 보완 실행별 TMPDIR/review4-locator-* | 격리 합성 소스18개 |26,881B | 실행 finally 제거 |18개 부재 | 보완GREEN R4L13 |
| lp28-locator-followup-*.log | 비민감 자체검사4개 | 소형text | 저장소 보존 | 최초실패/수정/회귀 | 위 링크 |
| lp28-current-diagnostic*.json | 실제 전체 오류2개 | source·고정오류만 | 저장소 보존 | 미완료 원인 분류 | 원장/제품PASS 아님 |

진단 중 프로세스 상태 조회 `ps`는 sandbox에서 exit1이었다. 승인된 읽기 전용 승격 조회 exit0,
명령 인자/환경은 읽지 않았다. 실제 진단 명령은 별도 정상 exit0으로 종료했다.

### 2번 후보 대조 실행 정의

33개 미해석 후보는 기존 승인 checkpoint `ea9f11e46`의 실제 행과 현재 diff를 먼저 대조했다.
변경 없는 문장의 이동과 실제 문맥 변경을 구분했다. UI005/018·AUTH029/041은 Start 계측으로 문맥/캡처가 바뀌었다.
MEDIA001은 ffprobe 실패 조건 자체는 같지만 진단 분기가 들어가 고정5행 창에서 원래 실패 의미를
읽지 못한다. 기존 코덱 판정은 바꾸지 않으며 실제 shell 조건문 범위로 source 증거를 읽어야 한다.
후보는 승인 자료가 아니다. 단순 이동은 실제 old/new 문장과 git hunk를 확인해 좌표를 보정하고,
같은 큰 함수의 중복 문장은 실제 해당 route/동작의 더 정확한 anchor 또는 실제 지역 함수 범위로
분리한다. 없는 assertion이나 제품 문자열을 검사를 위해 추가하지 않는다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| LP28-P01 | 후보 위치 대조 |33ID 원본 checkpoint anchor와 현재 hunk·동작·edge 연결, 승인 없는 후보 재생성 | v4.1.0 |
| LP28-P02 | 후보 전체 strict 대조 |986개 후보의 exact anchor·typed proof·trust·shared flow, 원장 불변 확인 | v4.1.0 |
| R4L19 | shell 중첩 실패 분기 | ffprobe 실제 조건의 중첩 진단/else/return까지 읽어 원래 실패 oracle 확인 | v4.1.0 |
| R4L20 | shell 바깥 decoy | fi 이후의 token/assertion으로 실패 의미를 보충하지 않음 | v4.1.0 |
| R4L21 | shell 분기 손상 | 종료fi 누락·성공 분기의 무관문자열로 유효한 실패 oracle 생성 금지 | v4.1.0 |
| R4L22 | 생성/소비 일치 | 후보 생성기와 적용 validator가 같은 bounded assertion 추출 사용 | v4.1.0 |
| R4L23 | heredoc Python 구분 | shell 파일 안 Python if 콜론 문장을 shell if로 오분류하지 않음. 기존 Python branch 읽기 유지 및 실제 LAB014 후보 재대조 | v4.1.0 |

R4L19 예상 RED는 유효한 중첩 실패 branch가5행을 넘어 token을 읽지 못하는 것이다.
새/기존 source·approval 전체 검증 경계는 유지한다. 합성 focused→M/A→실제 후보 대조 순이며
제품/media 실행·UI·장시간을 이 진단에 끼워 넣지 않는다.

### 실제 변경·검사 공백 대조

다음은 새 실행 PASS가 아니라 소스/assertion과 기존 결과의 직접 연결이다. 현재 코드 고정 후
S11 최종 단기와 별도 실제UI·장시간 필요성은 그대로다. 모든435ID가 별도 제품 결함이라는
이전 해석은 하지 않는다. 기존 assertion을 삭제하거나 성공 기준을 완화한 변경은 확인되지 않았다.

| 변경 | 실제 검사·assertion | 보존 증거 | 미해소/한계 |
| --- | --- | --- | --- |
| Start 안전 계측 | site_operations_request_diagnostic_smoke.cpp SD01~05; verify_site_operations_request_diagnostic.mjs SD06~08 | 중앙 SD unit6·실제loopback18 | 실제끊긴socket SendAll 실패는 미실행, false주입과 구분 |
| 사건 녹화 증거 전달 | recording_application_evidence_smoke.cpp EV01~06; projection/storage bridge spy | integration-preparation EV focused15/read4/rule4/storage7/consumer22; 후속 LP25 통합156 | spy 단독으로 실제bridge 전체PASS 아님; 당시 timeline 실패 보존 |
| unknown 시간 UI | recording_playback_status.test.mjs D3C02/08/15/17 | lp26-ui-playback.log29 PASS·actualBrowser:false | DOM/CSS wrapping/clipping 실제 시각 검증은 잔여 |
| decoder 선택 | recording_hw_impact_probe.cpp MP/MH/MI/RP/CC/UC | LP27 self99/native81/codec67/ICE8 | 과거 실패 원인미확정 보존; 단기 CPU 결과는 장시간/용량PASS 아님 |
| 종료 수명 | stream_shutdown_lifecycle_smoke.cpp LC01~06 | S09 closeout 전용6PASS·원래 SIGSEGV/RED 이력 | 현행 장시간은 별도 |
| auth 임시값·격리 | AUTH-P01~09 및 실제3mode workflow | auth-preparation 준비17/summary19·72·146·출력239 | double과 실제 구분, visual=0·UI 대체 아님 |
| codec 진단 | codec_probe_diagnostics_test.py CPD01~24; codec shell 실제 exact codec 비교 | LP27 CPD24/HTTP8/codec67/ICE8 | 첫RTP/제품준비 단계 인과는 미관측 |

현재 proof 후보만 보정한33ID는 `LP28-P01` 대상이다. 기존 승인 checkpoint의 각 anchor를
실제 source와 먼저 대조하고 git hunk로 현재 행을 연결했다. edge 좌표도 같은 현재 role에서 계산한다.
첫 patch 생성은 JSON 항목 말미 쉼표를 누락해 적용 거부됐고 변경0이었다. 쉼표를 포함해
동일33항목만 apply_patch로 보정했다. 승인 audit/approval/implementation manifest는 수정하지 않았다.

| 대상 | 실제 대응 보완 | 보존 조건 |
| --- | --- | --- |
| UI005/018, AUTH029/041 | 현재 thread capture/HandlerBegin 인접 문맥 | 원래 logout/권한/요청 흐름 유지, 실제 변화로 독립검토 |
| SRC001 dispatch | sources POST의 RegistryHttpResponse 호출행 | 바로 다음 CreateSource 결과 전달·POST/권한 guard 그대로 |
| EVT016 action | 상태응답을 생성하는 실제 QueryEventRecordsForApplication 호출 | 오류500·성공 ops-events 결과의 실제 대응 |
| CLIENT002 dispatch | client_session_limit_reached 초기화 후 잠금/삽입 분기 | 제한 재확인·삽입 상태/readback 동일 |
| MEDIA003 action | WHEP route_path 입력 요청 구성 | 이후 SetRemoteOffer/CreateAnswer·실패정리 그대로 |
| MEDIA019 dispatch | 실제 create_webrtc_session_response 지역 lambda 범위 | 동일 AttachWebRtcAnalysisOverlay 호출·metadata readback |
| LAB026/027 state | snapshot/overlay의 서로 다른 실제 응답 블록 | 같은 body.assign 문장을 구분; JPEG/비어있지않음 검사 유지 |
| MEDIA001 readback | 동일 ffprobe 실패조건의 현재 문맥 | 원래 timeout/exit/codec oracle 불변; 중첩 branch 읽기 보완 |
| 그 외 이동 항목 | 동일 anchor의 현재 행/3행 문맥·edge | 역할·토큰·검사/assertion 불변 |

### 2번 판정

후보 생성 첫 대조에서 LAB014의 heredoc Python 조건을 shell로 오분류한1개 오류를 확인했다.
제품 실패가 아니며 뒤 단계는 실행하지 않았다. 메인이 명확한 `if ...; then` 구문만 shell
분기 읽기에 보내도록 보완했다. Python/JS의 기존 처리 경계를 바꾸지 않았다.
이후 승인 없는 후보986개 전수에서 unresolved0, exact anchor/위치 모호성/trust/typed proof/
shared flow 오류0을 확인했다([전수 결과](lp28-candidate-check.json),12,355.053ms, exit0).
후보 digest `5cb513e6298bb0469a24144b71312e1c42d147a7afd1323b19c1e75c2cef7f9e`.
정식 migration 비교는679개 strict 동등·307개 독립 검토 필요, exit0이었다.
이는4번 독립 검토/승인이나 현재 전체 inventory PASS가 아니다. 승인 원장은 아직 원본이다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| R4L19 최초 RED |5행 창으로 중첩 실패 분기의 token을 못 읽음·exit1·44.164ms | FAIL |
| shell 첫 GREEN | JS if를 shell로 오분류,14PASS/7FAIL·101.050ms | FAIL |
| shell 중간 GREEN | JS 경계 분리 후21PASS·127.985ms | PASS |
| shell 상한 반례 추가 |21PASS·111.918ms, 26root67,921B 정리 | PASS |
| P01 첫 후보 |986개 중 LAB014 Python 조건 오분류1개·별도 전수 명령exit1 | FAIL |
| R4L23 RED | Python 분기 읽기 빈 문자열·exit1·41.704ms | FAIL |
| R4L01 최종 | baseline exact | PASS |
| R4L02 최종 | 삽입 이동 | PASS |
| R4L03 최종 | 삭제 이동 | PASS |
| R4L04 최종 | 동일 문맥 모호성 거부 | PASS |
| R4L05 최종 | context 변경 거부 | PASS |
| R4L06 최종 | body 변경 거부 | PASS |
| R4L07 최종 | assertion 삭제 거부 | PASS |
| R4L08 최종 | verifier 변경 거부 | PASS |
| R4L09 최종 | 프로세스 내 위치 변경 | PASS |
| R4L10 최종 | 프로세스 내 문맥/본문 변경 | PASS |
| R4L11 최종 | 승인 원본 불변 | PASS |
| R4L12 최종 | 옛 범위 decoy 거부 | PASS |
| R4L14 최종 | source token 추가/수정/삭제 | PASS |
| R4L15 최종 | 선택role 이동/변경/보존 | PASS |
| R4L16 최종 | 승인 함수 단1후보 | PASS |
| R4L17 최종 | 같은 함수/복제 모호성 거부 | PASS |
| R4L18 최종 | 불일치 old-line fallback 금지 | PASS |
| R4L19 최종 | 실제 닫힌 중첩 shell 실패 분기 | PASS |
| R4L20 최종 | fi 밖 token/return decoy 거부 | PASS |
| R4L21 최종 | 미완성·128행/32KiB/깊이16 상한·성공branch 거부 | PASS |
| R4L22 최종 | 생성기/소비자 공통 추출 실행 대조 | PASS |
| R4L23 최종 | heredoc Python 기존 읽기 유지 | PASS |
| R4L13 최종 |27root69,348B·모두 부재 | PASS |
| R4L-M 최종 | 기존 migration30계약0FAIL·exit0 | PASS |
| R4L-A 최종 | 기존 approval11반례0FAIL·exit0·gate not-run | PASS |
| P01 수정 후 |986 후보 unresolved0·digest 일치 | PASS |
| P02 strict |986행 및 전체 shared flow 오류0·exit0 | PASS |
| P02 delta |679 strict동등/307 독립검토 필요·986순서/총계·exit0 | PASS |

원출력: [shell RED](lp28-shell-branch-red.log), [최초 GREEN 실패](lp28-shell-branch-green.log),
[중간 GREEN](lp28-shell-branch-green-02.log), [상한 보완](lp28-shell-branch-green-final.log),
[Python RED](lp28-python-branch-red.log), [최종22PASS](lp28-python-branch-green.log),
[최종 migration](lp28-shell-final-migration.log), [최종 approval](lp28-shell-final-approval.log).
최종 focused165.848ms. 새 증거는 소형 비민감 로그/고정 오류/ID만 보존한다.
Node assertion 출력의 끝 공백만 정리하며 최초 FAIL은 그대로다.
각 focused fixture는 finally에서 삭제·부재를 확인했다. 후보/이관 입력은 소유 임시 root에
4번 인계를 위해 보관 중이며 최종 증거가 아니다. 생성·검증은 원장 쓰기 없이 수행했다.

1번 `f8ed4546`·보완 `4a213d5b` 커밋 완료.2번 구현/관련 focused/후보 대조 완료,
독립 승인과 PREP 전체gate는4번에서만 판정한다. 제품·공개 API·저장·시간·timeout 변경0.
추가 실제 제품 검사 누락으로 확정한 항목은 없다. 실제 socket 실패는 기존 진단의 한계이며
새 필수 제품 요구로 자동 추가하지 않는다. 실제UI/장시간의 기존 필수 검증은 잔여다.

마감 문서 링크289개/9573링크/22이미지/160anchor·exit0, tracked/cached 공백exit0.
선택 stage는 최초 잘못된 patch 입력(exit128)·zero-context 옵션 누락(exit1)을 거쳐
정확한 기존 한 줄과 `--unidiff-zero`로 성공했다. 실패 두 명령은 파일/index를 변경하지 않았다.
