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
