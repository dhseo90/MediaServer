# v4.1.0~v4.9.0 녹화·검색 로드맵

이 문서는 버전별 목표·범위·의존 관계·완료 기준을 관리한다.
현재 남은 작업과 별도 결정 후보는 [개발 backlog](development-backlog.md)에 둔다.
실행 일지·개별 PASS/FAIL은 로드맵에 누적하지 않는다.

## 문서 상태

- **구현된 기반:** v4.1.0 녹화·분석 관측·조회/재생. 소스 `VERSION`은 `4.3.0`이며,
  기록된 공개 버전·관측 시각은 [릴리즈 metadata](release-policy.md#소스와-기록된-공개-상태)를 따른다.
- **현재 소스:** v4.3.0은 기존 구조화 검색 위에 로컬 영상 유사도 검색과 자원 수명 개선을 구현했다.
  개발 검증 범위·릴리즈 검증 전 상태는 [릴리즈 노트](release-notes-v4.3.0.md)를 따른다.
- **후속 계획:** v4.4.0~v4.9.0은 아직 구현 완료로 판정하지 않은 제품 확장 순서다.
  기존 이벤트 검색·VLM 실험이 아래 녹화 검색·검토 제품의 완료를 뜻하지 않는다.
- 제품 지원 범위는 [릴리즈 노트](release-notes-v4.1.0.md), 사용 방법은
  [설정](config-reference.md#recording-env)과 [녹화 조회·재생](ui-guide.md#녹화-조회와-재생-v410-s06)을 따른다.

최종 목표는 “3시에 자동차 근처에 서성인 사람을 찾아줘” 같은 자연어 질문으로
해당 카메라·시간·근거를 찾고 녹화 위치를 재생하는 것이다. 같은 검색 서비스를
JSON 질의응답 API와 제품 UI가 함께 사용한다. 모호한 시각·행동·관계는 추정 사실과 구분한다.

## 최상위 원칙

1. 녹화는 검색의 근간이다. 후속 검색을 이유로 기존 녹화 시간·ID·저장/복구 의미를 바꾸지 않는다.
2. 상시녹화는 기본 비활성이고 채널별 명시 설정으로 켠다. 세그먼트는 keyframe/GOP 경계를 존중한다.
3. 용량 초과 시 영속 녹화 순서를 기준으로 오래된 상시녹화부터 정리하며 녹화를 이어 간다.
   보호 자료·디스크 여유 등으로 쓰기가 불가능한 상태를 정상 녹화로 숨기지 않는다.
4. 상시/이벤트의 용량·기간 정책을 분리하고 pin·hold·재생 보호·삭제 증거를 유지한다.
5. 이벤트 구간은 확정 원본과 연결하고 가능한 구간에서 파생 영상을 생성한다.
   근거가 부족한 partial·fallback을 complete로 자동 승격하지 않는다.
6. 같은 원본 범위의 기본 표출·재생은 `event > continuous`다.
   UTC만 같은 서로 다른 영상 후보를 합치거나 숨기지 않는다.
7. 영상·영속 메타데이터·검색 인덱스의 책임을 분리한다.
   검색·임베딩·상관관계 인덱스는 재생성 가능한 파생 데이터다.
8. 공개된 ID·필드 의미는 유지한다. 추가 요구는 additive schema 또는 명시적 새 계약으로 처리한다.
9. 외부 LLM 없이도 기본 시간·객체·행동·관계 검색을 로컬에서 수행하는 방향을 유지한다.
   로컬/외부 LLM은 선택형 질의 해석 adapter이며 아직 구현 완료인 기능이 아니다.
10. Apache-2.0과 출처·개인정보 경계를 유지한다. 호환되지 않거나 권리가 불명확한 자료를 반입하지 않는다.
11. 의도된 공개 영문 문서를 제외한 설명·판정은 한글로 작성한다.

## 브랜치 운용 모델

장기 로드맵은 `main`의 공통 기준이며 각 버전 브랜치가 상속한다.
브랜치는 해당 버전의 승인 범위만 개발하고 다음 버전 절은 설계 문맥으로 소비한다.
후속 기능을 미리 구현할 권한으로 해석하지 않는다.

- 버전 종료 시 실제 구현·미구현·검증 한계를 정리하되 미래 계획을 완료로 바꾸지 않는다.
- 다음 버전은 이전 계약·로드맵이 반영된 최신 `main`에서 별도 승인 후 시작한다.
- 방향이나 호환 계약 변경은 먼저 조율한다. 브랜치 생성·삭제·병합·공개 승인은 별개다.

## 참고 자료와 독립 구현 경계

다음은 사용자가 제시한 참고 대상이다. 원본 저장소를 수정·vendor·submodule로 편입하거나
runtime dependency·동기화 대상으로 관리하지 않는다. MediaServer 안에서 독립 구현한다.

- [MyLocalLLM VATester-Vector-Search-cpp](https://github.com/dhseo90/MyLocalLLM/tree/VATester-Vector-Search-cpp):
  후속 임베딩 계약·벡터 검색 정렬·평가 검토 대상. v4.1.0 구현에는 반입하지 않았다.
- [VARuleLens](https://github.com/dhseo90/VARuleLens):
  evidence package·sequence review라는 제품 요구의 참고 대상. 기존 조사에서 라이선스가
  확인되지 않아 구현 참고에서 제외했다. 재확인 전 코드·prompt·schema·구현 상세를 사용하지 않는다.
- [공유 GPT 대화](https://chatgpt.com/share/6a982ed2-2dd4-83ee-b78b-07f9f4b34861):
  녹화 → 검색 → 증거 → 상관관계 → 조사라는 제품 방향. 기술·법률 근거나 실행 증거가 아니다.

확인한 revision·권리 상태·채택/제외 범위는
[저장 표준·오픈소스 검토](research/v410-recording-storage-open-source-review.md)를 따른다.
위 링크의 현재 상태를 이번 문서 편집에서 다시 조사했다고 주장하지 않는다.

## 표준·오픈소스·지식재산 조사 게이트

각 버전에서 새 저장·검색 계약을 확정하기 전에 공개 표준·호환 오픈소스·권리 상태를 확인한다.
기존 녹화의 조사 범위는 ONVIF Profile G/M·Analytics, GStreamer `splitmuxsink`,
SQLite와 세그먼트·보존·복구 패턴이다. 특정 프로필 준수나 인증 완료를 뜻하지 않는다.

특허 조사는 구현 아이디어 획득이 아니라 위험 접근 배제를 위한 필터다.
활성 특허와 실질적으로 겹칠 가능성이 있으면 상세 구현을 설계 입력으로 사용하지 않고
접근을 제외하거나 보류한다. 안전한 공개 자료와 독립 설계만 근거로 남긴다.
[IP 위험 차단 게이트](research/v410-recording-ip-risk-gate.md)를 따르며 법률 의견·FTO 보장은 아니다.

## 버전 경계

| 버전 | 상태·목표 | 이전 버전에서 소비하는 기반 | 명시적 비범위 |
| --- | --- | --- | --- |
| v4.1.0 | 구현 기반: Recording Foundation | 기존 EventRecord·프레임 참조·이벤트 클립 | 녹화 전체 구조화 검색·임베딩·자연어 질의 |
| v4.1.1 | 공개: 문서 정리·내부 경계 개선 | 기존 제품·계약·회귀 정의 | 제품 기능 추가·v4.2 구현 |
| v4.2.0 | 공개: Structured Search, 지원·검증 범위는 릴리즈 노트 참조 | 녹화 카탈로그·분석 관측 | 벡터 유사도·VLM 판단 |
| v4.3.0 | 개발 구현: 녹화·검색 자원 수명 보완과 Visual Vector Search, 릴리즈 검증 전 | 기존 Catalog·프레임 위치·v4.2 결과 계약 | 증거 판단·Entity 확정·무제한 규모 보장 |
| v4.4.0 | 계획: Evidence Package | 녹화·프레임·트랙·이벤트 ID | VLM 결론·교차 카메라 동일성 |
| v4.5.0 | 계획: VA Review | 불변 증거 패키지 | 교차 카메라 Entity 확정 |
| v4.6.0 | 계획: Correlation | track/event/evidence·검토 결과 | 자연어 조사 UI |
| v4.7.0 | 계획: Natural Language Query API | 구조화·벡터·증거·상관관계 서비스 | 대화형 제품 UI |
| v4.8.0 | 계획: Conversational Search & Playback | QueryPlan·JSON 응답 | 공개 API 호환성 종료 선언 |
| v4.9.0 | 계획: Stabilization & Public API | v4.1~v4.8 계약 | 호환성을 깨는 major 변경 |

v5.0.0은 자동 조사 agent·분산 검색·호환성을 깨는 데이터 모델 변경 등 실제 major 요구가
확인될 때 별도로 설계한다. 현재 목표 때문에 v4.7~v4.9를 건너뛰지 않는다.

## v4.1.0 — Recording Foundation

상시·이벤트 연동 녹화, 등급별 순환 보존, 이벤트 우선 조회·재생과 검색용 분석 관측을
제공하는 기반이다. 초기 S09 검증 단계의 실패를 성공으로 덮어쓰지 않고,
S10 시간·식별·저장 보강과 S11 최종 검증으로 마감했다.
단계별 수치·승인·재검증 일지는 현재 계획에서 제외한다.

후속 버전이 유지할 계약과 설계 이유:

- **식별·순서·시간 분리:** 물리 세그먼트, 미디어 연속 구간, UTC 매핑, 영속 녹화 순서는
  서로 다른 개념이다. UTC를 강제로 증가시키거나 ID만 추가해서 시간 대응을 해결하지 않는다.
- **관측의 정확성:** 촬영·서버 수신 관측·추정·unknown을 구분하고 원본 PTS/DTS·time base와
  매핑 근거를 보존한다. PTS 감소만으로 재시작을 단정하지 않으며 알 수 없는 시각을 0으로 만들지 않는다.
- **파일과 이벤트 대응:** 요청 범위, 입증된 미디어 구간, UTC 품질을 구분한다.
  분석 namespace와 동일 샘플의 원본 연결을 유지하고 최신 프레임으로 사후 보충하지 않는다.
- **확정·보존·복구:** 파일·매핑·순서를 함께 복구할 수 있을 때만 정상 녹화로 공개한다.
  삭제 순서에 UTC나 finalize 순서를 대신 쓰지 않는다. pin·hold·재생 보호·tombstone·disk reserve를 유지한다.
- **누적 비용과 수명:** 검증된 현재 상태·증분 원장·과거 증거를 분리한다.
  비활성 상세 자료를 RAM에서 내리는 것과 영구 삭제를 구분한다. 최소 ID·삭제 증거와 참조 의무,
  손상 거부·SQLite 재투영/독립 복구를 비용 개선 때문에 생략하지 않는다.
- **관측 상한:** event/track 시작·종료·요약과 주기/대표 프레임을 저장한다.
  모든 분석 프레임을 무제한 영속화하지 않으며 모호하거나 삭제된 locator는 이유와 함께 표현한다.
- **호환 경계:** 구형 개발 데이터의 억지 변환·영구 이중 구현은 목표가 아니다.
  필요한 회귀 fixture와 형식 식별자를 보존하고 모르는 과거 순서·촬영 시각을 생성하지 않는다.

세부 설계 기준은 [시간·식별 계약](superpowers/specs/2026-09-02-v410-recording-search-foundation-design.md#s10-시간식별-계약)과
[현재 상태·증분 원장·과거 증거 계약](superpowers/specs/2026-09-19-recording-catalog-cost-contract.md#b안-구현-계약)에 있다.
이 문서들에는 과거 진행 설명도 남아 있으므로, 그 당시 미완료 문구를 현재 구현 상태로 해석하지 않는다.
현재 검사가 소비하는 계약·snapshot·출처는 유지하며, 종료 자료의 보존 위치는
[이력 안내](history/README.md)에서 확인한다.

자동 후속 세그먼트 재생, 모든 카메라의 촬영 시각 동기화, 완성형 VMS/NVR,
무제한 보관·누수 부재 보장, 외부 서비스·실기기 검증은 구현/검증 범위에 포함하지 않는다.

## v4.1.1 — 문서 정리

현재 사용법·계약·테스트 정의·미래 계획을 종료 실행 이력과 분리하고,
녹화 값·ticket·read service·supervisor의 내부 경계를 제한적으로 정리했다.
공개 API/schema·미디어·인증·녹화 저장 계약은 유지한다. 누적 변경과 검증 범위는
[v4.1.1 릴리즈 노트](release-notes-v4.1.1.md), 별도 승인 릴리즈의 잔여는
[backlog](development-backlog.md#별도-승인-릴리즈)에서 확인한다.
문서·후보 준비 마감은 실제 UI·장시간 검증이나 릴리즈 승인을 대신하지 않는다.

## v4.2.0 — Structured Search

승인된 개발의 세부 계약·순서는 [v4.2.0 개발 설계](superpowers/specs/2026-10-03-v420-structured-search-design.md),
기능별 기대값은 [테스트 정의](project-feature-test-inventory.md#v420-구조화-검색)를 따른다.
개발 진행을 제품 완료나 릴리즈 검증 완료로 해석하지 않는다.

1. v4.1.0 카탈로그를 소비하는 별도 read model을 만든다.
2. 카메라, 시간, 객체, track, event, zone, rule, behaviour filter를 제공한다.
3. 안정 정렬과 query checksum에 묶인 cursor pagination을 고정한다.
4. 검색 결과에서 원본 녹화의 정확한 시간으로 이동한다.
5. 같은 시간의 이벤트 녹화를 상시녹화보다 우선 반환한다.
6. v4.1.0 fixture를 수정하지 않고 migration·query compatibility를 검증한다.

완료 기준: 권한·시간/필터 조합·안정 페이지·이벤트 우선·정확한 재생 위치를 독립 기대값과 대조하고 기존 녹화 호환성을 유지한다.

## v4.3.0 — Visual Vector Search

개발 범위와 순서는 [v4.3.0 개발 계약](superpowers/specs/2026-10-04-v430-visual-vector-search-design.md)에 둔다.
아래 선행 과제와 벡터 검색을 유한한 개발 profile에서 구현·직접 검증했다.
[개발 기록](history/README.md#v430-개발과-로컬-검증)의 단기 결과는 릴리즈 검증 완료를 뜻하지 않는다.

벡터 색인으로 자원 사용을 늘리기 전에 [녹화 누적 이력의 메모리 운영 한계](development-backlog.md#녹화-누적-이력의-메모리-운영-한계)를
이 버전의 선행 개발 과제로 다뤘다. v4.2.0의 과거 검증은 원래 source·환경의 기록으로 유지하며,
새 worker·미디어 검증·UI가 포함된 현재 릴리즈의 안정화·장시간·실제 UI 전수 검사는 별도 수행한다.

### 선행 과제: 누적 이력 RAM과 검색 동시 부하

1. **지원 범위와 예산 확정:** 대상 환경, 채널·누적 이력 규모, 검색/녹화 동시 부하와
   녹화 진행·검색 지연·메모리의 완료 기준을 구현 전에 정한다. 미디어 보관 quota,
   Catalog/검색 모델의 논리 보유량, 프로세스 RSS, 검증 작업 공간 예산을 구분한다.
   기존 2채널·120분 관측값을 지원 상한이나 새 합격선으로 사용하지 않는다.
2. **직접 원인과 소유 수명 확인:** 기존 관측을 출발점으로 보관 중인 미디어 양과 누적 삭제 이력을
   분리해 비교한다. Catalog/Journal의 필수 identity·receipt, 상주 조회 구조·캐시,
   검색 요청·snapshot의 보유 수명과 allocator 잔류를 구분하고 개선 대상을 확정한다.
   RSS 증가 전부를 누수 또는 특정 소유자의 비용으로 가정하지 않는다.
3. **비용 통제 구현:** 확인된 원인에 맞춰 비활성 상세의 비상주화, 조회 구조·캐시의 수명 제한,
   요청 내 중복 준비 감소 등 필요한 개선을 선택한다. 최소 ID·삭제 증거·참조 의무를 임의 폐기하지 않고
   ID 재사용 방지·순서·시간·원자 확정·재구축/복구·pin/hold·재생 보호를 유지한다.
   검색의 권한·결과·안정 정렬·snapshot 멤버십도 유지한다. 저장 계약 변경이 필요하면 별도 설계를 승인받는다.
4. **같은 조건의 전후 검증:** 활성 자료량을 고정하고 누적 이력을 늘리는 경우와 검색/녹화 동시 부하를
   구분해 비용·진행·응답을 비교한다. warmup 이후, 반복 삭제, 녹화 off, 재시작·재구축에서
   상주량과 RSS를 함께 관측하고 정상·오류·경계 회귀로 위 계약을 확인한다.
   장시간 검사는 확정한 완료 기준과 변경 영향에 따라 별도 승인 후 실행한다.

선행 과제 완료 기준: 합의한 지원 규모·환경에서 자원 예산과 진행·응답 기준을 충족하고,
필수 이력과 검색·삭제·복구 의미가 유지됨을 입증한다. 미충족·미확정 범위를 숨기거나
검토 완료만으로 안정성 PASS를 선언하지 않는다. 지원 범위와 남은 제한을 문서화한 뒤 벡터 색인 부하를 추가한다.

### 벡터 검색 확장

1. image/text/cross-modal embedding contract와 contract ID를 versioning한다.
2. 이벤트 snapshot과 대표 frame부터 색인한다.
3. exact top-k를 기준 구현으로 먼저 두고 안정 정렬과 threshold를 고정한다.
4. 텍스트에서 영상 대표 frame을 찾는 cross-modal 검색을 추가한다.
5. 상시녹화의 설정 주기 대표 frame 색인을 후반 단계로 확장한다.
6. Hit@K, MRR, 지연시간, memory/disk 사용량 fixture를 유지한다.

임베딩은 파생 데이터이며 embedding contract가 바뀌면 새 공간으로 재색인한다. 오래된
벡터를 의미가 다른 새 contract로 자동 승격하지 않는다.

완료 기준: 선행 자원 수명 과제를 충족하고, exact top-k와 품질/자원 fixture를 기준으로
재현 가능한 검색·재색인·이전 계약 분리를 확인한다. 벡터 색인·검색이 추가된 동시 부하에서도
합의한 자원 예산과 기존 녹화·구조화 검색 계약을 유지한다.

## v4.4.0 — Evidence Package

1. 검색 결과를 녹화, clip, 대표 frame, track, event, observation과 묶는 EvidencePackageV1을 고정한다.
2. `FrameLocatorV1`로 같은 frame을 결정적으로 다시 추출한다.
3. package manifest에 시간 범위, provenance, checksum, 누락·삭제 상태를 포함한다.
4. 원본 녹화가 순환 삭제돼도 보존 등급이 높은 파생 evidence의 독립성을 검증한다.

완료 기준: 동일 프레임 재추출, checksum/provenance, 누락·삭제 표현과 파생 증거의 독립 보존을 검증한다.

## v4.5.0 — VA Review

1. 사용자와 합의한 sequence review 요구를 MediaServer 내부에서 독립 구현한다. VARuleLens의 구현 참고는 위 라이선스 확인 경계를 먼저 충족해야 한다.
2. 단일 이미지뿐 아니라 시간 순서가 있는 frame sequence를 입력으로 사용한다.
3. supports, questions, contradictions, unclear와 confidence를 구조화해 저장한다.
4. 외부 LLM/VLM 실패가 녹화, event, search 결과를 막지 않게 한다.
5. local-first와 provider opt-in 정책을 유지한다.

완료 기준: 검토 결과와 근거·불확실성을 재현하고 provider 실패가 녹화·이벤트·검색을 막지 않음을 확인한다.

## v4.6.0 — Correlation

1. track과 event 위에 별도의 versioned EntityLink를 추가한다.
2. 같은 카메라의 시간 연속 관계부터 시작하고 교차 카메라 후보로 확장한다.
3. 자동 동일성 확정과 후보 관계를 구분하고 근거·불확실성을 보존한다.
4. 기존 track/event ID를 변경하거나 재사용하지 않는다.

완료 기준: 후보 관계와 확정 관계를 구분하고 근거·불확실성·ID 불변과 단일/교차 카메라 반례를 확인한다.

## v4.7.0 — Natural Language Query API

1. 자연어를 `QueryPlanV1`으로 변환한다.
2. 시간대, 카메라 범위, 객체, 행동, 공간 관계, 결과 제한을 명시적으로 표현한다.
3. 구조화·벡터·증거·상관관계 검색을 하나의 application service에서 조합한다.
4. UI와 외부 client가 함께 사용하는 JSON response를 고정한다.
5. 결과마다 camera/time/track/event/evidence/recording/playback locator와 선정 이유를 반환한다.
6. 모호한 시간이나 조건은 임의 확정하지 않고 interpretation과 uncertainty를 반환한다.

완료 기준: 자연어→명시적 QueryPlan→JSON 결과의 시간대·권한·모호성·playback locator를 검증한다. UI 없이도 같은 서비스 계약으로 질의할 수 있어야 한다.

## v4.8.0 — Conversational Search & Playback

1. GPT 형태의 자연어 입력 UI를 제공한다.
2. 결과 card에 카메라, 시간, 대표 image, 근거와 confidence를 표시한다.
3. 선택한 결과를 정확한 녹화 위치에서 재생한다.
4. 이벤트 clip이 있으면 이를 우선하고 없으면 원본 segment range를 재생한다.
5. 후속 질문은 기존 `QueryPlanV1`을 명시적으로 좁히는 방식으로 처리한다.
6. UI 전용 검색 로직을 만들지 않고 v4.7.0 application service만 소비한다.

완료 기준: 실제 UI에서 질문·결과 선택·정확한 재생·후속 조건 축소를 확인하고 API와 다른 검색 판정을 만들지 않는다.

## v4.9.0 — Stabilization & Public API

1. 자연어 표현과 camera/time/object/relation별 품질 fixture를 고정한다.
2. 다중 camera와 장시간 녹화에서 latency와 resource budget을 검증한다.
3. role/scope/camera 접근 권한, redaction, query·playback audit를 완성한다.
4. long-running query의 async state, cancel, timeout, pagination을 안정화한다.
5. v4.1.0부터의 schema migration과 이전 fixture compatibility를 검증한다.
6. 공개 API 문서와 semantic versioning 경계를 확정한다.

완료 기준: 품질·자원·권한·감사·비동기 수명·이전 계약 호환성과 공개 API의 지원/제외 범위를 검증하고 문서화한다.

## 버전 간 재작업 방지 규칙

- ID는 파일 경로·SQLite rowid·화면 순서와 독립이며 삭제 뒤 재사용하지 않는다.
- UTC wall clock과 media PTS/time base를 보존하고 시간 품질·불연속·미확정을 숨기지 않는다.
- finalize된 세그먼트는 불변이며 교체가 필요하면 새 ID를 발급한다.
- 필드의 기존 의미를 바꾸지 않고 optional field 또는 명시적 새 계약을 추가한다.
- catalog 변경은 영속 원장에서의 rebuild·SQLite projection·중단 복구와 함께 검증한다.
- 각 릴리즈의 golden fixture를 다음 기능에 맞추려고 덮어쓰지 않는다.
- 검색·embedding·review·correlation은 원본을 대체하지 않는 재구축 가능한 projection이다.
- 다음 버전은 이전 application contract를 소비하며 내부 저장 파일을 각자 해석하지 않는다.
- 호환성을 깨는 변경은 minor에 숨기지 않고 별도 major 설계 승인을 받는다.

## 기존 v4.1.0 후보 재분류

Incident OS·Evidence default-on·Action Execution·credential store·tracker·VLM 제품화의
미배정 후보는 [backlog](development-backlog.md#알려진-제한과-별도-결정-후보)에서 관리한다.
이 로드맵에 일정이나 구현 승인이 자동 추가되지 않는다.

## 완료 판정 경계

위 후속 절의 완료 기준은 계획이며 실행 증거가 아니다. 세부 수치·fixture·오류/경계 기대값은
각 버전 착수 때 확정하고 [검증 정책](stream-verification.md#검증-정책)과
[기능별 테스트 정의](project-feature-test-inventory.md)에 연결한다.
현재/이전 릴리즈의 유효 증거는 영향 범위로 판단하며 계획 문구나 과거 PASS를 새 실행으로 쓰지 않는다.

안정화·30분·실제 UI·120분의 차이와 필수/조건부 기준은 [AGENTS](../AGENTS.md#5-검증과-완료)를 따른다.
장시간·실제 UI 실행과 커밋·push·PR·병합·태그·Release는 각각 승인 범위에서만 수행한다.
